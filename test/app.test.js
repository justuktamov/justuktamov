import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session() {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'PM', password: 'secret123' }) });
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test('kirish: noto\'g\'ri parol va kirmagan foydalanuvchi rad etiladi', async () => {
  let r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password: 'x' }) });
  assert.equal(r.status, 401);
  r = await fetch(`${base}/api/me`);
  assert.equal(r.status, 401);
  // CSRF: JSON bo'lmagan o'zgartiruvchi so'rov
  const pm = await session();
  r = await pm('/api/projects', { method: 'POST' });
  assert.equal(r.status, 415);
});

test('profil: ism, Telegram ID, parol', async () => {
  const pm = await session();
  let r = await pm('/api/me', { method: 'PUT', body: { telegram_id: 'abc' } });
  assert.equal(r.status, 400);
  const u = await pm.json('/api/me', { method: 'PUT', body: { name: 'Dilshod A.', telegram_id: '123456789' } });
  assert.equal(u.telegram_id, '123456789');
  assert.equal((await pm.json('/api/me')).user.name, 'Dilshod A.');
  r = await pm('/api/me/password', { method: 'PUT', body: { old: 'xato', new: 'yangi123' } });
  assert.equal(r.status, 400);
});

test('loyiha, kunlik raqamlar, statistika, reja va CSV', async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'STARPAY', color: '#2a78d6' } });
  let r = await pm('/api/projects', { method: 'POST', body: { name: 'starpay' } });
  assert.equal(r.status, 409, 'bir xil nom');

  const d = today();
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '-5' } } });
  assert.equal(r.status, 400);
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { bot_starts: 5 } } });
  assert.equal(r.status, 400, "noma'lum maydon");
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(d, 5), values: { spend: 5 } } });
  assert.equal(r.status, 400, 'kelajak');
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(d, -1), values: { spend: 20, clicks: 200, leads: 40, sales: 10, revenue: 1000000 } } });
  const w = await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '30,5', clicks: 300, leads: 50, qualified: 20, sales: 15, revenue: '1 500 000', creative_best: 'Stories' } } });
  assert.equal(w.changed, 7);

  const day = await pm.json(`/api/daily?date=${d}`);
  assert.equal(day.projects[0].row.spend, 30.5);
  assert.equal(day.projects[0].prev.leads, 40);

  const s = await pm.json(`/api/summary?from=${addDays(d, -1)}&to=${d}`);
  assert.equal(s.totals.leads, 90);
  assert.equal(s.totals.sales, 25);
  assert.equal(s.totals.cpl, 50.5 / 90);
  assert.equal(s.series.length, 2);
  assert.equal(s.notes[0].creative_best, 'Stories');

  await pm.json('/api/plans', { method: 'PUT', body: { month: d.slice(0, 7), project_id: p.id, values: { leads: 1000, sales: 100 } } });
  assert.equal((await pm.json(`/api/plans?month=${d.slice(0, 7)}`)).rows[0].leads, 1000);

  const csv = await (await pm(`/api/export.csv?from=${d}&to=${d}`)).text();
  assert.match(csv, /date,project,spend/);
  assert.match(csv, /STARPAY,30\.5/);

  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
  assert.equal((await pm.json(`/api/daily?date=${d}`)).projects.length, 0, 'arxivdagi loyiha kunlik ro\'yxatda yo\'q');
});

test('sozlamalar: vaqt va kurs tekshiriladi', async () => {
  const pm = await session();
  let r = await pm('/api/settings', { method: 'PUT', body: { report_time: '25' } });
  assert.equal(r.status, 400);
  r = await pm('/api/settings', { method: 'PUT', body: { usd_rate: '0' } });
  assert.equal(r.status, 400);
  await pm.json('/api/settings', { method: 'PUT', body: { report_chat_id: '-100123', reminder_time: '18:30', usd_rate: '12900' } });
  const st = await pm.json('/api/settings');
  assert.equal(st.reminder_time, '18:30');
  assert.equal((await pm.json('/api/me')).telegram.reportChat, true);
});
