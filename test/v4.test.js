import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { anomalies } = await import('../src/extras.js');
const { createApp } = await import('../src/server.js');

let server, base, projectId;
before(async () => {
  getDb();
  createUser({ name: 'Direktor', login: 'dir', password: 'secret123', role: 'admin' });
  createUser({ name: 'Jasur', login: 'tg', password: 'secret123', role: 'target' });
  createUser({ name: 'Anvar', login: 'fin', password: 'secret123', role: 'finance' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password: 'secret123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test('vazifa: rol bo\'yicha biriktiriladi, ijrochi bajaradi', async () => {
  const dir = await session('dir');
  const tg = await session('tg');
  const p = await dir.json('/api/projects', { method: 'POST', body: { name: 'IELTS' } });
  projectId = p.id;
  let r = await tg('/api/tasks', { method: 'POST', body: { title: 'x' } });
  assert.equal(r.status, 403);
  const t = await dir.json('/api/tasks', { method: 'POST', body: { title: '2 ta kreativni almashtirish', role: 'target', project_id: p.id, due_date: addDays(today(), -1) } });
  assert.equal(t.assignee_name, 'Jasur');
  assert.equal(t.overdue, true);
  const mine = await tg.json('/api/tasks');
  assert.equal(mine.length, 1);
  const me = await tg.json('/api/me');
  assert.equal(me.openTasks, 1);
  const done = await tg.json(`/api/tasks/${t.id}`, { method: 'PUT', body: { status: 'done', title: 'o\'zgartirish' } });
  assert.equal(done.status, 'done');
  assert.equal(done.title, '2 ta kreativni almashtirish', 'ijrochi matnni o\'zgartira olmaydi');
  assert.equal((await tg.json('/api/me')).openTasks, 0);
  r = await tg(`/api/tasks/${t.id}`, { method: 'DELETE' });
  assert.equal(r.status, 403);
});

test('sof foyda: tushum − reklama − xarajat − umumiy ulush', async () => {
  const dir = await session('dir');
  const fin = await session('fin');
  const tg = await session('tg');
  const month = today().slice(0, 7);
  const d = today();
  await dir('/api/settings', { method: 'PUT', body: { usd_rate: '10000' } });
  await dir('/api/daily', { method: 'PUT', body: { project_id: projectId, date: d, values: { spend: 100, revenue: 5000000 } } });
  let r = await tg('/api/expenses', { method: 'POST', body: { month, category: 'salary', amount: 1 } });
  assert.equal(r.status, 403);
  await fin('/api/expenses', { method: 'POST', body: { month, category: 'salary', amount: '1 000 000', project_id: projectId } });
  await fin('/api/expenses', { method: 'POST', body: { month, category: 'rent', amount: 500000 } });
  const pnl = await fin.json(`/api/pnl?month=${month}`);
  const row = pnl.rows.find((x) => x.id === projectId);
  // Joriy oy: xarajat o'tgan kunlarga mutanosib (factor = o'tgan kun / oy kunlari)
  const f = pnl.factor;
  assert.ok(f > 0 && f <= 1);
  assert.equal(row.ads, 1000000);
  assert.ok(Math.abs(row.expenses - 1000000 * f) < 1e-6);
  assert.ok(Math.abs(row.common - 500000 * f) < 1e-6);
  assert.ok(Math.abs(row.profit - (5000000 - 1000000 - 1500000 * f)) < 1e-6);
  assert.equal((await tg(`/api/pnl?month=${month}`)).status, 403);
});

test('CSV import va signal', async () => {
  const dir = await session('dir');
  const rows = ['date,project,spend,clicks,leads,sales,revenue'];
  for (let i = 7; i >= 1; i--) rows.push(`${addDays(today(), -i)},ielts,50,400,40,3,4500000`);
  rows.push(`${today()},IELTS,50,400,10,1,1500000`);
  rows.push('2026-13-01,ielts,1,1,1,1,1');
  rows.push(`${today()},nomalum,1,1,1,1,1`);
  const r = await dir.json('/api/import', { method: 'POST', body: { csv: rows.join('\n') } });
  assert.equal(r.imported, 8);
  assert.equal(r.errorCount, 2);
  const al = anomalies(today());
  assert.ok(al.some((a) => a.text.includes('lid narxi')), JSON.stringify(al));
  assert.ok(al.some((a) => a.text.includes('lid 10')));
  const tg = await session('tg');
  assert.equal((await tg('/api/import', { method: 'POST', body: { csv: 'x' } })).status, 403);
});

test('xodimga loyiha biriktirish', async () => {
  const dir = await session('dir');
  const users = await dir.json('/api/users');
  const jasur = users.find((u) => u.login === 'tg');
  const u = await dir.json(`/api/users/${jasur.id}`, { method: 'PUT', body: { project_ids: [projectId] } });
  assert.deepEqual(u.project_ids, [projectId]);
  const u2 = await dir.json(`/api/users/${jasur.id}`, { method: 'PUT', body: { project_ids: [] } });
  assert.equal(u2.project_ids, null);
});

test('zaxira nusxa faqat direktorga', async () => {
  const dir = await session('dir');
  const r = await dir('/api/backup');
  assert.equal(r.status, 200);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(buf.subarray(0, 15).toString(), 'SQLite format 3');
});
