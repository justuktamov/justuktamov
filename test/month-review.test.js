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

test("oy yakuni: lidlar tarkibi, sifatli va umumiy liddan konversiya, reja ↔ fakt va sababi", async () => {
  const pm = await session();
  const kurs = await pm.json('/api/projects', { method: 'POST', body: { name: 'KURS' } });
  const bot = await pm.json('/api/projects', { method: 'POST', body: { name: 'BOT', kind: 'auto' } });
  // O'tgan (tugagan) oy: 3 kun raqamlari
  const month = addDays(`${today().slice(0, 7)}-01`, -1).slice(0, 7);
  const days = [`${month}-03`, `${month}-10`, `${month}-20`];
  const vals = [
    { spend: 100, leads: 30, qualified: 12, potential: 6, unqualified: 12, sales: 2, revenue: 4000000 },
    { spend: 100, leads: 40, qualified: 16, potential: 8, unqualified: 16, sales: 3, revenue: 6000000 },
    { spend: 100, leads: 30, qualified: 12, potential: 6, unqualified: 12, sales: 3, revenue: 6000000 },
  ];
  for (const [i, date] of days.entries()) {
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: kurs.id, date, values: vals[i] } });
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: bot.id, date, values: { spend: 10, starts: 50, sales: 5, revenue: 500000 } } });
  }
  await pm.json('/api/plans', { method: 'PUT', body: { project_id: kurs.id, month, values: { budget: 600, leads: 200, sales: 10, revenue: 20000000 } } });

  const r = await pm.json(`/api/month-review?month=${month}`);
  assert.equal(r.month, month);
  assert.equal(r.finished, true, "o'tgan oy — tugagan");

  // Lidlar va konversiya: faqat sotuv bo'limi orqali ishlaydigan loyihalar (avtovoronkada lid yo'q)
  assert.deepEqual(r.rows.map((x) => x.name), ['KURS']);
  const k = r.rows[0];
  assert.equal(k.leads, 100);
  assert.equal(k.qualified, 40);
  assert.equal(k.potential, 20);
  assert.equal(k.unqualified, 40);
  assert.equal(k.sales, 8);
  assert.equal(k.conv_total, 0.08, 'umumiy liddan: 8 / 100');
  assert.equal(k.conv_qualified, 0.2, 'sifatli liddan: 8 / 40');

  // Reja ↔ fakt
  const pl = r.plans.find((x) => x.project_id === kurs.id);
  assert.equal(pl.metrics.leads.plan, 200);
  assert.equal(pl.metrics.leads.fact, 100);
  assert.equal(pl.metrics.leads.pct, 0.5);
  assert.equal(pl.metrics.leads.diff, -100);
  assert.equal(pl.metrics.sales.pct, 0.8);
  assert.equal(pl.metrics.conv.plan, 0.05, 'reja konversiyasi: 10 / 200');
  assert.equal(pl.metrics.conv.fact, 0.08);
  assert.equal(pl.metrics.cpl.plan, 3, 'reja: $600 / 200 lid');
  assert.equal(pl.metrics.cpl.fact, 3);
  assert.equal(pl.metrics.avg_check.plan, 2000000);
  assert.equal(pl.metrics.avg_check.fact, 2000000);
  // Xulosa: lid rejasi bajarilmadi, sababi — byudjet yarmi ishlatilmadi; sotuv kam — lid kam, konversiya esa rejadan yuqori
  const text = pl.verdict.map((v) => v.text).join('\n');
  assert.match(text, /Lid.*100.*200.*50%/);
  assert.match(text, /byudjet/i);
  assert.match(text, /\$300.*\$600/);
  assert.match(text, /konversiya.*5\.0%.*8\.0%/i);
  assert.ok(pl.verdict.some((v) => v.level === 'critical'));
  assert.ok(!r.plans.some((x) => x.project_id === bot.id), 'BOT ga reja kiritilmagan');
  assert.equal(r.planTotal, null, 'bitta loyihada jami kerak emas');

  // Avtovoronka ham rejada: jamida lid → sotuv nisbatlari va o'rtacha chek ko'rsatilmaydi (aralash ma'nosiz)
  await pm.json('/api/plans', { method: 'PUT', body: { project_id: bot.id, month, values: { budget: 30, sales: 10, revenue: 1000000 } } });
  const both = await pm.json(`/api/month-review?month=${month}`);
  assert.equal(both.planTotal.sales.plan, 20);
  assert.equal(both.planTotal.conv, undefined);
  assert.equal(both.planTotal.avg_check, undefined);
  const botPlan = both.plans.find((x) => x.project_id === bot.id);
  assert.equal(botPlan.metrics.leads, undefined, 'avtovoronkada lid rejasi yo\'q');
  assert.equal(botPlan.metrics.avg_check.fact, 100000);

  // Tugamagan joriy oy — prognoz bilan
  const cur = await pm.json(`/api/month-review?month=${today().slice(0, 7)}`);
  assert.equal(cur.finished, false);
  // Noto'g'ri oy
  assert.equal((await pm('/api/month-review?month=2026-13')).status, 400);
});
