// Oylik hisobot Telegramda: kunlik hisobot boradigan chatga; har oyning 1-kuni o'tgan oy uchun avtomatik
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';

// Telegram API o'rniga: yuborilgan xabarlar shu ro'yxatga
const realFetch = globalThis.fetch;
const sent = [];
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('/sendMessage')) {
    sent.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  return realFetch(url, opts);
};

const { getDb, today, setSetting } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays, monthReview } = await import('../src/metrics.js');
const { monthReportMessages } = await import('../src/reports.js');
const { createApp, monthReportDue } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  setSetting('usd_rate', 10000);
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); globalThis.fetch = realFetch; });

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

const month = addDays(`${today().slice(0, 7)}-01`, -1).slice(0, 7);

test("oylik hisobot: kunlik hisobot chatiga — lidlar, konversiya, reja ↔ fakt va xulosa", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'KURS <A&B>' } });
  for (const [date, v] of [[`${month}-03`, { spend: 150, leads: 50, qualified: 20, potential: 10, unqualified: 20, sales: 4, revenue: 8000000 }],
    [`${month}-20`, { spend: 150, leads: 50, qualified: 20, potential: 10, unqualified: 20, sales: 4, revenue: 8000000 }]]) {
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date, values: v } });
  }
  await pm.json('/api/plans', { method: 'PUT', body: { project_id: p.id, month, values: { budget: 600, leads: 200, sales: 10, revenue: 20000000 } } });

  // Chat ID kiritilmagan — yuborilmaydi
  let r = await pm('/api/month-review/send', { method: 'POST', body: { month } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /Telegram/);

  await pm.json('/api/settings', { method: 'PUT', body: { report_chat_id: '-1001234567, 555555' } });
  r = await pm('/api/month-review/send', { method: 'POST', body: { month } });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { sent: 2, total: 2, failed: [] });
  assert.deepEqual([...new Set(sent.map((m) => m.chat_id))].sort(), ['-1001234567', '555555']);
  const text = sent.filter((m) => m.chat_id === '-1001234567').map((m) => m.text).join('\n');
  assert.match(text, /Oylik hisobot/);
  assert.match(text, /KURS &lt;A&amp;B&gt;/, 'loyiha nomi HTML uchun ekranlanadi');
  assert.match(text, /lid <b>100<\/b>/);
  assert.match(text, /sifatli 40 \(40%\)/);
  assert.match(text, /sifatli liddan <b>20\.0%<\/b>/);
  assert.match(text, /umumiy liddan <b>8\.0%<\/b>/);
  assert.match(text, /Lid rejasi bajarilmadi: 100 \/ 200/);
  assert.match(text, /byudjeti to'liq ishlatilmadi/);
  assert.ok(sent.every((m) => m.parse_mode === 'HTML'));

  // Noto'g'ri oy va kelajak oyi
  assert.equal((await pm('/api/month-review/send', { method: 'POST', body: { month: '2026-13' } })).status, 400);
  assert.equal((await pm('/api/month-review/send', { method: 'POST', body: { month: '2999-01' } })).status, 400);
});

test("oylik hisobot: har oyning 1–3-kuni o'tgan oy uchun; keyin — yo'q (deploy kuni tasodifan yuborilmaydi)", () => {
  assert.equal(monthReportDue('2026-12-01'), '2026-11');
  assert.equal(monthReportDue('2027-01-03'), '2026-12');
  assert.equal(monthReportDue('2026-11-04'), null);
  assert.equal(monthReportDue('2026-11-05'), null);
});

test("oylik hisobot: uzun matn 4096 belgidan oshmaydigan xabarlarga bo'linadi, teglar buzilmaydi", () => {
  const rv = monthReview(month);
  const many = { ...rv, rows: Array.from({ length: 60 }, (_, i) => ({ ...rv.rows[0], id: i, name: `Loyiha ${i}` })) };
  const msgs = monthReportMessages(many);
  assert.ok(msgs.length > 1);
  for (const m of msgs) {
    assert.ok(m.length <= 4096, `xabar ${m.length} belgi`);
    assert.equal((m.match(/<b>/g) || []).length, (m.match(/<\/b>/g) || []).length, 'ochilgan teg yopilgan');
  }
});
