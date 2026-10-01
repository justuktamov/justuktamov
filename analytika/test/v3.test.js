import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today, canEdit, entryRoles } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { creativeVerdict, allocation } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Direktor', login: 'dir', password: 'secret123', role: 'admin' });
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123', role: 'pm' });
  createUser({ name: 'Jasur', login: 'tg', password: 'secret123', role: 'target' });
  createUser({ name: 'Madina', login: 'rop', password: 'secret123', role: 'sales' });
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

test('rollar: ROP lid maydonlarini ham kiritadi, PM hammasini', () => {
  assert.ok(canEdit('sales', 'leads'));
  assert.ok(canEdit('sales', 'revenue'));
  assert.ok(!canEdit('sales', 'spend'));
  assert.ok(canEdit('pm', 'spend') && canEdit('pm', 'payments'));
  assert.ok(!canEdit('creative', 'spend'));
  assert.deepEqual(entryRoles('sales'), ['lead', 'sales']);
  assert.deepEqual(entryRoles('creative'), []);
});

test('kreativ bahosi', () => {
  const avg = { ctr: 0.02, cpl: 2, cost_per_start: 0.2 };
  assert.equal(creativeVerdict({ spend: 5 }, avg).verdict, 'new');
  assert.equal(creativeVerdict({ spend: 50, ctr: 0.008, cpl: 2.1 }, avg).verdict, 'bad');
  assert.equal(creativeVerdict({ spend: 50, ctr: 0.02, cpl: 1.2 }, avg).verdict, 'good');
  assert.equal(creativeVerdict({ spend: 50, ctr: 0.02, cpl: 2 }, avg).verdict, 'ok');
});

test('byudjet taqsimoti samaraliga ko\'proq beradi, jami 100%', () => {
  const a = allocation([
    { id: 1, name: 'A', spend: 100, roas: 6 },
    { id: 2, name: 'B', spend: 100, roas: 1 },
  ], { roas: 3 }, 7);
  const sum = a.reduce((x, r) => x + r.suggested, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(a[0].name, 'A');
  assert.ok(a[0].change > 0 && a[1].change < 0);
});

test('PM hisoboti: qoralama → yuborish → direktor ko\'rib chiqadi', async () => {
  const dir = await session('dir');
  const pm = await session('pm');
  const rop = await session('rop');
  const p = await dir.json('/api/projects', { method: 'POST', body: { name: 'IELTS' } });
  const d = today();
  const tg = await session('tg');
  await tg('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: 50, clicks: 400 } } });
  let r = await rop('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { leads: 40, sales: 3, revenue: 4500000 } } });
  assert.equal(r.status, 200, 'ROP lid va sotuvni kiritadi');

  r = await rop('/api/report', { method: 'PUT', body: { date: d, summary: 'x' } });
  assert.equal(r.status, 403);
  r = await dir('/api/report/review', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 409, 'yuborilmagan hisobotni ko\'rib bo\'lmaydi');

  let rep = await pm.json('/api/report', { method: 'PUT', body: { date: d, summary: 'Yaxshi kun', project_notes: { [p.id]: { status: 'scale', comment: 'Oshiramiz' }, x: { status: 'bad' } } } });
  assert.equal(rep.status, 'draft');
  assert.deepEqual(Object.keys(rep.project_notes), [String(p.id)]);

  rep = await pm.json('/api/report/submit', { method: 'POST', body: { date: d } });
  assert.equal(rep.status, 'submitted');
  assert.equal(rep.author_name, 'Dilshod');

  const bundle = await dir.json(`/api/report?date=${d}`);
  assert.equal(bundle.report.summary, 'Yaxshi kun');
  assert.equal(bundle.day.totals.leads, 40);
  assert.equal(bundle.rec.projects[0].id, p.id);
  assert.ok(bundle.rec.projects[0].status_label);

  rep = await dir.json('/api/report/review', { method: 'POST', body: { date: d, comment: 'Qabul' } });
  assert.equal(rep.status, 'reviewed');
  assert.equal(rep.reviewer_name, 'Direktor');
  r = await pm('/api/report', { method: 'PUT', body: { date: d, summary: 'o\'zgartirish' } });
  assert.equal(r.status, 409);

  const list = await dir.json('/api/reports');
  assert.equal(list[0].status, 'reviewed');
  const me = await pm.json('/api/me');
  assert.equal(me.reportStatus, 'reviewed');
  assert.ok(me.duties.pm.gives);
});

test('kreativ maydonlari va havola tekshiruvi', async () => {
  const tg = await session('tg');
  const projects = await tg.json('/api/projects');
  let r = await tg('/api/campaigns', { method: 'POST', body: { project_id: projects[0].id, date: today(), name: 'Video 1', platform: 'instagram', spend: 40, impressions: 20000, clicks: 300, creative_type: 'video', creative_url: 'javascript:alert(1)' } });
  assert.equal(r.status, 400);
  r = await tg('/api/campaigns', { method: 'POST', body: { project_id: projects[0].id, date: today(), name: 'Video 1', platform: 'instagram', spend: 40, impressions: 20000, clicks: 300, creative_type: 'video', creative_url: 'https://t.me/c/1/2' } });
  assert.equal(r.status, 201);
  const list = await tg.json('/api/campaigns');
  const c = list.rows.find((x) => x.name === 'Video 1');
  assert.equal(c.ctr, 0.015);
  assert.equal(c.creative_label, 'Video');
  assert.ok(c.verdict);
});
