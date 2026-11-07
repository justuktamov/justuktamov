// Doska → «Hammasi»: kiritish boshlangan birinchi kundan kechagacha — hech qanday filtrsiz
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today, setSetting } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  setSetting('usd_rate', 10000);
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session() {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password: 'secret123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test("«Hammasi»: /api/me birinchi kiritilgan kunni beradi; shu kundan kechagacha hammasi jamlanadi", async () => {
  const pm = await session();
  // Hali raqam yo'q — birinchi kun yo'q (doska kechagi kunni ko'rsatadi)
  assert.equal((await pm.json('/api/me')).firstDay, null);

  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'KURS' } });
  const yday = addDays(today(), -1);
  const old = addDays(yday, -400);
  for (const [date, v] of [[old, { spend: 10, leads: 5, sales: 1, revenue: 1000000 }], [addDays(yday, -40), { spend: 20, leads: 7, sales: 2, revenue: 2000000 }], [yday, { spend: 30, leads: 9, sales: 3, revenue: 3000000 }]]) {
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date, values: v } });
  }
  const me = await pm.json('/api/me');
  assert.equal(me.firstDay, old, 'eng birinchi kiritilgan kun');

  const s = await pm.json(`/api/summary?from=${me.firstDay}&to=${me.reportDay}`);
  assert.equal(s.totals.spend, 60);
  assert.equal(s.totals.leads, 21);
  assert.equal(s.totals.sales, 6);
  assert.equal(s.totals.revenue, 6000000);
});
