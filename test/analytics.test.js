import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today, setSetting } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays, estimateLag } = await import('../src/metrics.js');
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

test('kanallar: kiritish, sifat va mijoz narxi bo\'yicha solishtirish', async () => {
  const pm = await session();
  let r = await pm('/api/projects', { method: 'POST', body: { name: 'K', channels: ['tiktok'] } });
  assert.equal(r.status, 400);
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'KANAL', channels: ['instagram', 'telegram_ads', 'instagram'] } });
  assert.deepEqual(p.channels, ['instagram', 'telegram_ads']);
  const d = today();
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, channels: { youtube2: { spend: 1 } } } });
  assert.equal(r.status, 400);
  const put = await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: 200, leads: 100, sales: 6, revenue: 6000000 }, channels: {
    instagram: { spend: 120, clicks: 900, leads: 70, qualified: 14, sales: 2, revenue: 2000000 },
    telegram_ads: { spend: 80, clicks: 400, leads: 30, qualified: 18, sales: 4, revenue: 4000000 },
  } } });
  assert.equal(put.changed, 6);
  const daily = await pm.json(`/api/daily?date=${d}`);
  const row = daily.projects.find((x) => x.id === p.id);
  assert.equal(row.channelRows.instagram.leads, 70);
  // Bo'sh qiymatlar — qator o'chadi
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(d, -1), channels: { instagram: { spend: 5 } } } });
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(d, -1), channels: { instagram: { spend: '' } } } });
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM channel_daily WHERE date = ?').get(addDays(d, -1)).n, 0);

  const s = await pm.json(`/api/summary?from=${d}&to=${d}&project=${p.id}`);
  const ch = s.byProject[0].channels;
  assert.equal(ch[0].channel, 'instagram', 'byudjet bo\'yicha tartiblangan');
  assert.equal(ch[0].qualified_share, 0.2);
  assert.equal(ch[1].cac, 20);
  const texts = s.byProject[0].insights.map((x) => x.text).join('\n');
  assert.match(texts, /Lid sifati kanalga bog'liq/);
  assert.match(texts, /1 mijoz narxi: Telegram Ads \$20, Instagram \/ Facebook \$60/);
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test('lid → sotuv kechikishi: konversiya oldingi lidlarga bo\'linadi va kechikish taxmin qilinadi', async () => {
  const pm = await session();
  const r = await pm('/api/projects', { method: 'POST', body: { name: 'L', sale_lag: 90 } });
  assert.equal(r.status, 400);
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'LAG', var_cost_pct: 10 } });
  const d = today();
  // Lidlar tebranadi, sotuvlar aynan 5 kun keyin lidlarning 10% i
  const leads = Array.from({ length: 60 }, (_, i) => 100 + ((i * 37) % 11) * 20);
  for (let i = 0; i < 60; i++) {
    const date = addDays(d, -59 + i);
    const sales = i >= 5 ? leads[i - 5] / 10 : 10;
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date, values: { spend: 50, leads: leads[i], sales, revenue: sales * 1000000 } } });
  }
  assert.equal(estimateLag(p.id, d), 5);
  const list = await pm.json('/api/projects');
  assert.equal(list.find((x) => x.id === p.id).lag_hint, 5);

  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { sale_lag: 5 } });
  const from = addDays(d, -6);
  const s = await pm.json(`/api/summary?from=${from}&to=${d}&project=${p.id}`);
  const x = s.byProject[0];
  assert.equal(x.sale_lag, 5);
  assert.ok(Math.abs(x.conv - 0.1) < 1e-9, `konversiya ${x.conv}`);
  assert.match(x.conv_note, /5 kun oldingi/);
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test('LTV: qayta sotuvlar bilan 1 mijoz qiymati, LTV/CAC; oylik dinamika', async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'LTV', var_cost_pct: 20 } });
  // Raqamlar kechagi kun uchun kiritiladi; oylik dinamika ham kechagacha hisoblanadi
  const d = addDays(today(), -1);
  // 10 sotuv, shundan 2 tasi qayta: 8 yangi mijoz; 12 mln tushum, 2 mln qayta sotuvdan; reklama $400 = 4 mln
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: 400, leads: 100, sales: 10, revenue: 12000000, repeat_sales: 2, repeat_revenue: 2000000 } } });
  const s = await pm.json(`/api/summary?from=${d}&to=${d}&project=${p.id}`);
  const x = s.byProject[0];
  assert.equal(x.avg_check, 1250000, 'yangi mijoz o\'rtacha cheki');
  assert.equal(x.ltv.new_sales, 8);
  assert.equal(x.ltv.ltv, 1500000);
  assert.equal(x.ltv.cac_uzs, 500000);
  assert.equal(x.ltv.ltv_cac.toFixed(2), '2.40');
  assert.equal(x.ltv.repeat_share.toFixed(3), '0.167');

  const m = await pm.json(`/api/monthly?months=3&project=${p.id}`);
  assert.equal(m.length, 3);
  assert.equal(m.at(-1).month, d.slice(0, 7));
  assert.equal(m.at(-1).totals.revenue, 12000000);
  assert.equal(m.at(-1).totals.sales, 10);
  assert.equal(m[0].has, false);
  assert.ok(m[0].month < m[1].month, 'eski oy birinchi');
});

test("ko'p reklama = ko'p foydami: kunlar reytingi", async () => {
  const { spendDays } = await import('../src/metrics.js');
  const mk = (i, spend, net) => ({ date: `2026-09-${String(i).padStart(2, '0')}`, has: true, spend, spend_uzs: spend * 10000, revenue: net + spend * 10000, net, romi: net / (spend * 10000) });
  assert.equal(spendDays([mk(1, 10, 1)]), null, 'kam kun — xulosa yo\'q');
  const s = spendDays([mk(1, 100, 300000), mk(2, 50, 900000), mk(3, 40, 800000), mk(4, 30, 500000), mk(5, 20, 400000), mk(6, 10, 200000), { ...mk(7, 0, 0), has: false }]);
  assert.equal(s.n, 6);
  assert.equal(s.max.date, '2026-09-01');
  assert.equal(s.max.place.net, 5);
  assert.equal(s.max.place.romi, 6);
  assert.equal(s.topNet[0].date, '2026-09-02');
  assert.equal(s.compare.k, 3);
  assert.equal(s.compare.hi_net, (300000 + 900000 + 800000) / 3);
});

test("voronka tashxisi: qaysi bosqichda yo'qotyapmiz", async () => {
  const { funnelCheck } = await import('../src/metrics.js');
  const base = { kind: 'leads', impressions: 50000, clicks: 1000, leads: 40, sales: 4, reported: { leads: 1, starts: 0 }, starts: 0 };
  // Klik → lid odatdagidan ancha past, qolganlari me'yorida
  const p = { ...base, ctr: 0.02, click_to_lead: 0.04, conv: 0.1, bench: { ctr: 0.021, click_to_lead: 0.1, conv: 0.09 } };
  const f = funnelCheck(p);
  assert.deepEqual(f.steps.map((s) => s.status), ['ok', 'low', 'ok']);
  assert.equal(f.worst.key, 'click_to_lead');
  assert.match(f.worst.problem, /sayt\/forma/);
  // Lid ko'p, sotuv kam — sotuv bo'limi
  const g = funnelCheck({ ...p, click_to_lead: 0.1, conv: 0.03 });
  assert.equal(g.worst.key, 'conv');
  assert.equal(g.worst.who, 'sales');
  // Me'yor yo'q — xulosa ham yo'q
  assert.equal(funnelCheck({ ...p, bench: {} }).worst, null);
});

test('dinamika: kunlar va haftalar bo\'yicha', async () => {
  const { monthly } = await import('../src/metrics.js');
  const asOf = '2026-10-01'; // payshanba
  const d = monthly({ unit: 'day', months: 5, asOf });
  assert.deepEqual(d.map((x) => x.from), ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
  assert.ok(d.every((x) => x.days === 1 && !x.partial));
  const w = monthly({ unit: 'week', months: 2, asOf });
  assert.deepEqual(w.map((x) => [x.from, x.to, x.partial]), [['2026-09-21', '2026-09-27', false], ['2026-09-28', '2026-10-01', true]]);
});

test('reklama xarajati: target + blogerlar + Telegram kanallar', async () => {
  const { sumRows } = await import('../src/metrics.js');
  const t = sumRows([{ date: '2026-09-01', spend: 100, spend_blogger: 50, spend_posts: 30, clicks: 400, leads: 60, sales: 6 }]);
  assert.equal(t.target_spend, 100);
  assert.equal(t.spend, 180, 'umumiy');
  assert.equal(t.cpc, 0.25, '1 klik — faqat targetdan');
  assert.equal(t.cpl, 3, '1 lid — umumiy xarajatdan');
  assert.equal(t.reported.spend, 1);
  const only = sumRows([{ date: '2026-09-02', spend_blogger: 40 }]);
  assert.equal(only.spend, 40);
  assert.equal(only.reported.spend, 1, 'faqat blogerga pul ketgan kun ham hisobga olinadi');
});
