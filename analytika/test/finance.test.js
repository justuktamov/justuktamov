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

test("moliya: foyda, sof foyda va marja; avtovoronka konversiyasi", async () => {
  const pm = await session();
  let r = await pm('/api/projects', { method: 'POST', body: { name: 'X', kind: 'bad' } });
  assert.equal(r.status, 400);
  r = await pm('/api/projects', { method: 'POST', body: { name: 'X', var_cost_pct: 120 } });
  assert.equal(r.status, 400);
  // Avtovoronka: tannarx 80%, doimiy xarajat oyiga 3 650 000 so'm (kuniga 120 000)
  const sp = await pm.json('/api/projects', { method: 'POST', body: { name: 'STARPAY', kind: 'auto', var_cost_pct: 80, fixed_monthly: 3650000 } });
  assert.equal(sp.kind, 'auto');
  const d = today();
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: sp.id, date: d, values: { spend: 50, clicks: 1000, starts: 400, sales: 100, revenue: 10000000 } } });
  const s = await pm.json(`/api/summary?from=${d}&to=${d}`);
  const p = s.byProject[0];
  assert.equal(p.spend_uzs, 500000);
  assert.equal(p.gross_profit, 9500000);
  assert.equal(p.var_cost, 8000000);
  assert.equal(Math.round(p.fixed_cost), 120000);
  assert.equal(Math.round(p.net_profit), 1380000);
  assert.equal(p.net_margin.toFixed(3), '0.138');
  assert.equal(p.conv, 0.25, 'start → xarid');
  assert.equal(p.conv_label, 'start → xarid');
  assert.equal(p.unit_label, '1 start narxi');
  assert.equal(Math.round(s.totals.net_profit), 1380000);
  assert.equal(s.series.length, 1);
  assert.equal(Math.round(s.series[0].net), 1380000);
  // Marja yupqa, «qimmat» deganlar yo'q → narxni ko'tarib ko'rish taklif qilinadi
  assert.equal(p.price.verdict, 'up');
  assert.match(p.price.text, /sof marja atigi 14%/);
});

test("sabablar: nega sifatsiz, nega sotib olmadi; zararda bo'lsa narx tavsiyasi", async () => {
  const pm = await session();
  const v = await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART', var_cost_pct: 10, fixed_monthly: 0 } });
  const d = today();
  let r = await pm('/api/daily', { method: 'PUT', body: { project_id: v.id, date: d, values: {}, reasons: { bad: { wrong: 1 } } } });
  assert.equal(r.status, 400);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: v.id, date: d,
    values: { spend: 400, clicks: 800, leads: 40, qualified: 10, potential: 6, unqualified: 24, sales: 4, revenue: 3000000 },
    reasons: { bad: { not_target: 15, curious: 9 }, lost: { expensive: 20, thinking: 10 } } } });
  const day = await pm.json(`/api/daily?date=${d}`);
  assert.deepEqual(day.projects.find((x) => x.id === v.id).reasons.lost, { expensive: 20, thinking: 10 });
  // Sababni o'chirish
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: v.id, date: d, values: {}, reasons: { lost: { thinking: '' } } } });
  const s = await pm.json(`/api/summary?from=${d}&to=${d}&project=${v.id}`);
  const p = s.byProject[0];
  assert.equal(p.reasons.bad[0].label, 'Maqsadli auditoriya emas');
  assert.equal(p.reasons.lost.length, 1);
  const text = p.insights.map((i) => i.text).join(' | ');
  assert.match(text, /Lidlarning 60% sifatsiz\. Asosiy sabab — «Maqsadli auditoriya emas» \(63%\)\. Sifatsiz lidlarga ketgan pul: \$240/);
  assert.match(text, /Zararda/);
  // 1 sotuvdan zarar, ko'pchilik «qimmat» → narxni ko'tarib bo'lmaydi, xarajatni kamaytirish kerak
  assert.equal(p.price.verdict, 'cost');
  assert.ok(p.price.breakeven > p.avg_check);
  const preview = (await pm.json(`/api/report/preview?date=${d}`)).text;
  assert.match(preview, /Sof foyda/);
  assert.match(preview, /zarar/);
  assert.match(preview, /start · 100 xarid|100 xarid/);
});

test("oylik reja: orqada qolsa sababi aytiladi va Telegram xabari bir marta", async () => {
  const { planAlerts } = await import('../src/metrics.js');
  // Lid orqada, byudjet to'liq sarflanmagan → sabab: byudjet sarflanmayapti
  let r = planAlerts({ kind: 'leads', metrics: {
    budget: { plan: 3000, fact: 600, expected: 1000, status: 'ok' },
    leads: { plan: 3000, fact: 500, expected: 1000, status: 'behind' },
    sales: { plan: 90, fact: 28, expected: 30, status: 'ahead' },
    revenue: { plan: 90e6, fact: 28e6, expected: 30e6, status: 'ahead' },
  } }, 10, 30);
  assert.equal(r.alerts.length, 1);
  assert.match(r.alerts[0].text, /byudjet to'liq sarflanmayapti/);
  assert.equal(r.need.leads, 125);
  // Lid yetarli, sotuv orqada → sabab sotuvda (konversiya)
  r = planAlerts({ kind: 'leads', metrics: {
    budget: { plan: 3000, fact: 1000, expected: 1000, status: 'ok' },
    leads: { plan: 3000, fact: 1000, expected: 1000, status: 'ahead' },
    sales: { plan: 90, fact: 15, expected: 30, status: 'behind' },
    revenue: { plan: 90e6, fact: 15e6, expected: 30e6, status: 'behind' },
  } }, 10, 30);
  assert.equal(r.alerts[0].who, 'sales');
  assert.match(r.alerts[0].text, /konversiya rejada 3\.0%, hozir 1\.5%/);
  // Oy boshida (5 kundan kam) xulosa yo'q
  assert.equal(planAlerts({ kind: 'leads', metrics: { leads: { plan: 100, fact: 0, expected: 10, status: 'early' } } }, 3, 30).alerts.length, 0);
  // Sotuv soni rejada, chek kichik
  r = planAlerts({ kind: 'auto', metrics: {
    budget: { plan: 1000, fact: 330, expected: 333, status: 'ok' },
    leads: { plan: null, fact: 0 },
    sales: { plan: 300, fact: 100, expected: 100, status: 'ahead' },
    revenue: { plan: 30e6, fact: 6e6, expected: 10e6, status: 'behind' },
  } }, 10, 30);
  assert.match(r.alerts[0].text, /o'rtacha chek kichik/);

  // Server: reja + fakt → ogohlantirish, ikkinchi marta yuborilmaydi
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'REJA' } });
  const d = today();
  const month = d.slice(0, 7);
  await pm.json('/api/plans', { method: 'PUT', body: { month, project_id: p.id, values: { budget: 100000, leads: 100000, sales: 1000 } } });
  const plans = await pm.json(`/api/plans?month=${month}`);
  assert.ok(plans.prev, "o'tgan oy fakti qaytadi");
  const { sendPlanAlerts } = await import('../src/server.js');
  const day = Number(d.slice(8));
  if (day >= 5) {
    const first = await sendPlanAlerts(d);
    assert.ok(first.some((x) => x.item.name === 'REJA'));
    assert.equal((await sendPlanAlerts(d)).length, 0);
  }
});
