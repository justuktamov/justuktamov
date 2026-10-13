import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');
const { parseDuration, fmtDuration } = await import('../src/sellers-calc.js');

let server, base;
const D = addDays(today(), -1);
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  createUser({ name: 'Malika', login: 'malika', password: 'rop12345', role: 'rop' });
  createUser({ name: 'Aziz', login: 'aziz', password: 'target123', role: 'target' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login, password) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, { method: opts.method || 'GET', headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test("qo'ng'iroq vaqti: kiritish va ko'rsatish", () => {
  assert.equal(parseDuration('26:47:47'), 96467);
  assert.equal(parseDuration('45:10'), 2710);
  assert.equal(parseDuration('90'), 5400, 'faqat son — daqiqa');
  assert.equal(parseDuration(''), null);
  assert.throws(() => parseDuration('1:99'));
  assert.equal(fmtDuration(96467), '26:47:47');
});

test('ROP sotuv xodimlarini qo\'shadi, kunlik raqamlarini kiritadi; oylik jadval va konversiya', async () => {
  const pm = await session('pm', 'secret123');
  const viz = await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART' } });
  const diz = await pm.json('/api/projects', { method: 'POST', body: { name: 'DIZIPRO' } });
  await pm.json('/api/projects', { method: 'POST', body: { name: 'STARPAY', kind: 'auto' } });
  const rop = await session('malika', 'rop12345');
  const barno = await rop.json('/api/sellers', { method: 'POST', body: { name: 'Barno' } });
  const zebo = await rop.json('/api/sellers', { method: 'POST', body: { name: 'Zebo', projects: [viz.id] } });
  assert.deepEqual(zebo.projects, [viz.id]);
  assert.equal((await rop('/api/sellers', { method: 'POST', body: { name: 'barno' } })).status, 409);
  const day = await rop.json(`/api/sellers/daily?date=${D}`);
  assert.deepEqual(day.projects.map((p) => p.name), ['VIZART', 'DIZIPRO'], 'avtovoronka yo\'q');
  let r = await rop('/api/sellers/daily', { method: 'PUT', body: { date: D, rows: [
    { seller_id: barno.id, project_id: viz.id, values: { leads: 20, qualified: 10, sales: 2, cancelled: 8, unqualified: 6, call_sec: '1:30:00' } },
    { seller_id: zebo.id, project_id: viz.id, values: { leads: 10, qualified: 4, sales: 1, call_sec: '45:00' } },
    { seller_id: barno.id, project_id: diz.id, values: { leads: 5, sales: 0 } },
  ] } });
  assert.equal(r.status, 200);
  r = await rop('/api/sellers/daily', { method: 'PUT', body: { date: D, rows: [{ seller_id: barno.id, project_id: viz.id, values: { call_sec: 'abc' } }] } });
  assert.equal(r.status, 400);
  // Ikkinchi kun
  await rop.json('/api/sellers/daily', { method: 'PUT', body: { date: addDays(D, -1), rows: [{ seller_id: barno.id, project_id: viz.id, values: { leads: 30, qualified: 10, sales: 2, call_sec: '2:00:00' } }] } });
  const st = await pm.json(`/api/sellers/stats?from=${addDays(D, -1)}&to=${D}`);
  const v = st.projects.find((p) => p.name === 'VIZART');
  const b = v.rows.find((x) => x.name === 'Barno');
  assert.equal(b.leads, 50);
  assert.equal(b.sales, 4);
  assert.equal(b.call_sec, 3.5 * 3600);
  assert.equal(b.conv, 4 / 50);
  assert.equal(b.conv_q, 4 / 20);
  assert.equal(v.total.leads, 60);
  // Targetolog — yo'q
  const t = await session('aziz', 'target123');
  assert.equal((await t('/api/sellers')).status, 403);
  // Xodimni arxivlash — kunlik ro'yxatda yo'q, hisobotda bor
  await rop.json(`/api/sellers/${zebo.id}`, { method: 'PUT', body: { active: false } });
  assert.ok(!(await rop.json(`/api/sellers/daily?date=${D}`)).sellers.some((s) => s.id === zebo.id));
  assert.ok((await rop.json(`/api/sellers/stats?from=${D}&to=${D}`)).projects[0].rows.some((x) => x.name === 'Zebo'));
});
