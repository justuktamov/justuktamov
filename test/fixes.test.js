import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';

// Telegram API o'rniga: xabarlar shu ro'yxatga yoziladi; tgFail — tarmoq xatosi
const realFetch = globalThis.fetch;
const tgSent = [];
let tgFail = false;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.telegram.org/')) {
    if (tgFail) throw new Error('tarmoq yo\'q');
    tgSent.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  return realFetch(url, opts);
};

const { getDb, today, getSetting, setSetting, nowLocal } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays, legacyRate, monthly, toCsv } = await import('../src/metrics.js');
const { addDirectorReply, getReport, reportBundle } = await import('../src/reports.js');
const { createApp, sendPlanAlerts, runDaily } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(password = 'secret123') {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password }) });
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body !== undefined ? { 'content-type': opts.type || 'application/json' } : {}) },
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test("dollar kursi: «12 900» va «12,900» raqam sifatida saqlanadi, mantiqsiz kurs rad etiladi", async () => {
  const pm = await session();
  const d = addDays(today(), -60);
  for (const v of ['12 900', '12,900', '12.900', '12900']) {
    assert.equal((await pm.json('/api/rate', { method: 'PUT', body: { date: d, usd_rate: v } })).usd_rate, 12900, v);
  }
  assert.equal((await pm.json('/api/rate', { method: 'PUT', body: { date: d, usd_rate: '12 650,5' } })).usd_rate, 12650.5);
  for (const v of ['12,9', '0', 'abc', '-12800']) {
    const r = await pm('/api/rate', { method: 'PUT', body: { date: d, usd_rate: v } });
    assert.equal(r.status, 400, v);
  }
  await pm.json('/api/rate', { method: 'PUT', body: { date: d, usd_rate: '' } });
  // Kunlik kursdan oldingi kunlar — eski umumiy kurs; eski bazada matn ko'rinishida saqlangan bo'lsa ham to'g'ri o'qiladi
  setSetting('usd_rate', '12 800');
  assert.equal(legacyRate(), 12800);
  setSetting('usd_rate', '13,100');
  assert.equal(legacyRate(), 13100);
  const r = await pm('/api/settings', { method: 'PUT', body: { reminder_time: '24:00' } });
  assert.equal(r.status, 400, "24:00 — noto'g'ri vaqt");
});

test('direktor avtomatik hisobotga javob yozsa saqlanadi, PM keyin ham yubora oladi', async () => {
  const pm = await session();
  const d = addDays(today(), -10);
  // PM yubormagan kun: oddiy javob qabul qilinmaydi, hisobot xabariga javob — qabul qilinadi
  assert.equal(addDirectorReply(d, 'Byudjetni kamaytiring'), null);
  const r = addDirectorReply(d, 'Byudjetni kamaytiring', null, { allowUnsent: true });
  assert.equal(r.status, 'draft', "PM yubormagan — «ko'rildi» bo'lmaydi");
  assert.equal(r.director_comment, 'Byudjetni kamaytiring');
  assert.equal(reportBundle(addDays(d, 1)).prevReply.text, 'Byudjetni kamaytiring', 'ertasiga PM ko\'radi');
  // PM keyin o'z hisobotini yuboradi — direktor javobi saqlanib qoladi. Kurssiz hisobot yuborilmaydi
  const noRate = await pm('/api/report/submit', { method: 'POST', body: { date: d, summary: 'Kechikib yubordim' } });
  assert.equal(noRate.status, 400);
  assert.match((await noRate.json()).error, /dollar kursi/i);
  await pm.json('/api/rate', { method: 'PUT', body: { date: d, usd_rate: '12 700' } });
  const sent = await pm.json('/api/report/submit', { method: 'POST', body: { date: d, summary: 'Kechikib yubordim' } });
  assert.equal(sent.status, 'submitted');
  assert.equal(sent.director_comment, 'Byudjetni kamaytiring');
  // Yuborilgandan keyin javob — «ko'rildi»; tuzatib qayta yuborsa bo'ladi, direktor javobi saqlanadi
  assert.equal(addDirectorReply(d, 'OK').status, 'reviewed');
  const again = await pm('/api/report/submit', { method: 'POST', body: { date: d, summary: 'Raqamlar tuzatildi' } });
  assert.equal(again.status, 200);
  const after = getReport(d);
  assert.equal(after.status, 'submitted');
  assert.equal(after.summary, 'Raqamlar tuzatildi');
  assert.match(after.director_comment, /OK/);
});

test("hisobot vaqti Toshkent vaqtida saqlanadi", async () => {
  const tz = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  assert.match(nowLocal(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(nowLocal().slice(0, 10), today());
  assert.equal(nowLocal().slice(11, 13), tz);
});

test('oylik dinamika kechagacha hisoblanadi: bugungi bo\'sh kun joriy oyni pasaytirmaydi', async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'OYLIK' } });
  const y = addDays(today(), -1);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: y, values: { spend: 10, revenue: 5000000, sales: 2 } } });
  const m = monthly({ months: 2, projectId: p.id });
  assert.equal(m.at(-1).month, y.slice(0, 7), "oxirgi oy — kechagi kun oyi");
  assert.equal(m.at(-1).to, y);
  assert.equal(m.at(-1).totals.revenue, 5000000);
  // 1-sanada: yangi oyda hali ma'lumot yo'q — u oy ko'rsatilmaydi, o'tgan oy to'liq
  const first = monthly({ months: 2, projectId: p.id, asOf: '2026-09-30' });
  assert.equal(first.at(-1).month, '2026-09');
  assert.equal(first.at(-1).partial, false);
});

test("so'rovlar tekshiriladi: JSON turi, bo'sh tana, rang, loyiha ID, ertangi sana", async () => {
  const pm = await session();
  let r = await pm('/api/settings', { method: 'PUT', type: 'text/plain; application/json', body: { usd_rate: '13000' } });
  assert.equal(r.status, 415, 'text/plain — JSON emas');
  r = await pm('/api/me', { method: 'PUT', body: 'null' });
  assert.equal(r.status, 400);
  r = await pm('/api/me', { method: 'PUT', body: '[1]' });
  assert.equal(r.status, 400);
  r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password: { x: 1 } }) });
  assert.equal(r.status, 401);

  for (const color of ['red;background:url(//x)', { a: 1 }, '#12345', 'javascript:1']) {
    r = await pm('/api/projects', { method: 'POST', body: { name: `RANG${Math.random()}`, color } });
    assert.equal(r.status, 400, JSON.stringify(color));
  }
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'RANG', color: '#2A78D6' } });
  assert.equal(p.color, '#2a78d6');
  r = await pm(`/api/projects/${p.id}`, { method: 'PUT', body: { color: 'blue;x:y' } });
  assert.equal(r.status, 400);
  assert.equal((await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { name: 'RANG2' } })).color, '#2a78d6', "rang yuborilmasa o'zgarmaydi");

  r = await pm('/api/daily', { method: 'PUT', body: { project_id: { x: 1 }, date: today(), values: { spend: 1 } } });
  assert.equal(r.status, 404);
  r = await pm('/api/plans', { method: 'PUT', body: { project_id: 'abc', month: today().slice(0, 7), values: {} } });
  assert.equal(r.status, 404);
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(today(), 1), values: { spend: 1 } } });
  assert.equal(r.status, 400, 'ertangi sana');
  r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: today(), values: { spend: 1 } } });
  assert.equal(r.status, 200, 'bugungi sana mumkin');
});

test('parol almashsa boshqa qurilmalardagi sessiyalar yopiladi', async () => {
  const a = await session();
  const b = await session();
  assert.equal((await b('/api/me')).status, 200);
  const r = await a('/api/me/password', { method: 'PUT', body: { old: 'secret123', new: 'yangi-parol' } });
  assert.equal(r.status, 200);
  assert.equal((await a('/api/me')).status, 200, 'shu qurilma qoladi');
  assert.equal((await b('/api/me')).status, 401, 'boshqa qurilma chiqib ketadi');
  await a('/api/me/password', { method: 'PUT', body: { old: 'yangi-parol', new: 'secret123' } });
  // Muddati o'tgan sessiyalar yangi kirishda o'chadi
  getDb().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES ('eski', 1, '2000-01-01T00:00:00.000Z')").run();
  await session();
  assert.equal(getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE token = 'eski'").get().n, 0);
});

test('health check: kirishsiz /api/health — 200', async () => {
  const r = await fetch(`${base}/api/health`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("CSV: = + - @ bilan boshlangan matn formula bo'lib ishlamaydi", () => {
  const csv = toCsv([{ id: 1, name: '=1+1' }], [{ project_id: 1, date: '2026-09-01', spend: 5, creative_best: '=HYPERLINK("http://x")', note_sales: '@ROP', creative_worst: 'oddiy' }]);
  assert.match(csv, /'=1\+1/);
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/x""\)"/);
  assert.match(csv, /'@ROP/);
  assert.match(csv, /,oddiy,/);
  assert.match(csv, /,5,/, 'raqamlar o\'zgarmaydi');
});

test("kanallar yig'indisi jamidan katta bo'lsa — ogohlantirish", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'KANAL-JAMI', channels: ['instagram', 'telegram_ads'] } });
  const d = addDays(today(), -1);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: 100, leads: 40 }, channels: { instagram: { spend: 80, leads: 30 }, telegram_ads: { spend: 50, leads: 5 } } } });
  let s = await pm.json(`/api/summary?from=${d}&to=${d}&project=${p.id}`);
  const warn = s.byProject[0].insights.find((i) => /Kanallar yig'indisi/.test(i.text));
  assert.ok(warn, 'ogohlantirish bor');
  assert.match(warn.text, /xarajat kanallarda \$130, jami \$100/);
  assert.doesNotMatch(warn.text, /lid/, "lid yig'indisi (35) jamidan oshmagan");
  // Kanallar jamidan oshmasa (bir qismi kiritilgan) — ogohlantirish yo'q
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, channels: { telegram_ads: { spend: 10 } } } });
  s = await pm.json(`/api/summary?from=${d}&to=${d}&project=${p.id}`);
  assert.ok(!s.byProject[0].insights.some((i) => /Kanallar yig'indisi/.test(i.text)));
});

test("rejalashtiruvchi: ish xato bo'lsa belgilanmaydi va 10 daqiqadan keyin qayta uriniladi", async () => {
  let calls = 0;
  const fail = async () => { calls += 1; throw new Error('Telegram ishlamayapti'); };
  const t0 = 1_000_000_000_000;
  await assert.rejects(runDaily('job_x', '2026-09-01', fail, t0));
  assert.equal(getSetting('job_x'), null);
  assert.equal(await runDaily('job_x', '2026-09-01', fail, t0 + 60e3), false, '10 daqiqa o\'tmagan');
  for (let i = 1; i < 5; i++) await assert.rejects(runDaily('job_x', '2026-09-01', fail, t0 + i * 11 * 60e3));
  assert.equal(calls, 5);
  assert.equal(await runDaily('job_x', '2026-09-01', fail, t0 + 100 * 60e3), false, 'kuniga 5 martadan oshmaydi');
  // Yangi kun — urinishlar qaytadan; muvaffaqiyatli bo'lsa belgilanadi va qayta bajarilmaydi
  let ok = 0;
  assert.equal(await runDaily('job_x', '2026-09-02', async () => { ok += 1; }, t0), true);
  assert.equal(getSetting('job_x'), '2026-09-02');
  assert.equal(await runDaily('job_x', '2026-09-02', async () => { ok += 1; }, t0 + 30 * 60e3), false);
  assert.equal(ok, 1);
});

test("reja ogohlantirishi Telegram ishlamasa «yuborildi» deb belgilanmaydi", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'REJA-XATO' } });
  await pm.json('/api/plans', { method: 'PUT', body: { month: '2026-03', project_id: p.id, values: { budget: 100000, leads: 100000, sales: 1000 } } });
  setSetting('report_chat_id', '123456789');
  tgFail = true;
  await assert.rejects(sendPlanAlerts('2026-03-20'));
  assert.equal(getSetting('plan_alerts_2026-03'), null, "yetkazilmagan — qayta yuboriladi");
  tgFail = false;
  const before = tgSent.length;
  const sent = await sendPlanAlerts('2026-03-20');
  assert.ok(sent.some((x) => x.item.name === 'REJA-XATO'));
  assert.ok(tgSent.length > before);
  assert.equal((await sendPlanAlerts('2026-03-20')).length, 0, 'ikkinchi marta yuborilmaydi');
});
