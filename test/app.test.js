import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.USD_RATE = '12500';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { derive, summary, addDays } = await import('../src/metrics.js');
const { recordEvent } = await import('../src/telegram.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Rahbar', login: 'admin', password: 'secret123', role: 'admin' });
  createUser({ name: 'Target', login: 'target', password: 'secret123', role: 'target' });
  createUser({ name: 'Fotima', login: 'fotima', password: 'secret123', role: 'lead' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password: 'secret123' }) });
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  return (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

test('derive: PDF dagi misol — 1000 klik, 2500 start → 1500 organik, 1% konversiya', () => {
  const zero = { impressions: 0, qualified: 0, revenue: 0, payments: 0, repeat_sales: 0, repeat_revenue: 0, joins: 0 };
  const t = derive({ ...zero, spend: 30, clicks: 1000, starts: 2500, leads: 500, sales: 25 }, 12500);
  assert.equal(t.organic, 1500);
  assert.equal(t.organic_share, 0.6);
  assert.equal(t.start_to_sale, 0.01);
  assert.equal(t.lead_to_sale, 0.05);
  assert.equal(t.cpc, 0.03);
  assert.equal(t.spend_uzs, 375000);
});

test("rol bo'yicha kiritish huquqi va voronka", async () => {
  const admin = await session('admin');
  const target = await session('target');
  const fotima = await session('fotima');
  const p = await (await admin('/api/projects', { method: 'POST', body: { name: "SMM Pro", slug: 'smm' } })).json();
  assert.equal(p.slug, 'smm');
  const d = today();

  let r = await target('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '40', clicks: '1 000' } } });
  assert.equal(r.status, 200);
  r = await target('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { leads: 5 } } });
  assert.equal(r.status, 403, 'targetolog lid kirita olmaydi');
  r = await fotima('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { leads: 300, bot_starts: 1800 }, reasons: { expensive: 40, not_target: 90 } } });
  assert.equal(r.status, 200);
  r = await fotima('/api/projects', { method: 'POST', body: { name: 'X' } });
  assert.equal(r.status, 403);

  // Bot avtomatik sanagan startlar qo'lda kiritilganidan ustun
  recordEvent(p.id, 'start', 1);
  recordEvent(p.id, 'start', 1); // takror /start bir marta sanaladi
  recordEvent(p.id, 'start', 2);

  const s = await (await admin(`/api/summary?from=${addDays(d, -6)}&to=${d}`)).json();
  assert.equal(s.totals.clicks, 1000);
  assert.equal(s.totals.leads, 300);
  assert.equal(s.totals.starts, 2);
  assert.equal(s.reasons[0].reason, 'not_target');
  assert.ok(!s.insights.some((i) => i.text.includes('birorta ham sotuv')), 'sotuv kiritilmagan — ogohlantirish yo\'q');
  const madina = await (await admin('/api/users', { method: 'POST', body: { name: 'Madina', login: 'madina', password: 'secret123', role: 'sales' } })).json();
  assert.equal(madina.role, 'sales');
  const sales = await session('madina');
  r = await sales('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { sales: 0, revenue: 0 } } });
  assert.equal(r.status, 200);
  const s2 = await (await admin(`/api/summary?from=${d}&to=${d}`)).json();
  assert.ok(s2.insights.some((i) => i.text.includes('birorta ham sotuv')), JSON.stringify([s2.byProject[0].reported, s2.insights]));

  const daily = await (await fotima(`/api/daily?date=${d}`)).json();
  assert.equal(daily.projects[0].row.auto_start, 2);
  assert.ok(daily.missing.some((m) => m.role === 'finance' && !m.filled));

  const audit = await (await admin('/api/audit')).json();
  assert.ok(audit.some((a) => a.field === 'spend' && a.new_value === '40'));
});

test('tracking API kalit bilan ishlaydi', async () => {
  const admin = await session('admin');
  const p = await (await admin('/api/projects', { method: 'POST', body: { name: 'Python' } })).json();
  let r = await fetch(`${base}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'wrong', event: 'start' }) });
  assert.equal(r.status, 401);
  r = await fetch(`${base}/api/track`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: p.track_key, event: 'lead', tg_user_id: 7 }) });
  assert.equal(r.status, 200);
  const s = summary({ from: today(), to: today(), projectId: p.id });
  assert.equal(s.totals.leads, 1);
});

test("kirmagan foydalanuvchi ma'lumot ko'ra olmaydi", async () => {
  const r = await fetch(`${base}/api/summary`);
  assert.equal(r.status, 401);
});
