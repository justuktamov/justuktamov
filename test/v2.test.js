import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.TELEGRAM_BOT_TOKEN = '123:TEST';

const { getDb, today } = await import('../src/db.js');
const { createUser, verifyTelegramInitData } = await import('../src/auth.js');
const { addDays, monthBounds } = await import('../src/metrics.js');
const { recordEvent } = await import('../src/telegram.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Rahbar', login: 'boss', password: 'secret123', role: 'admin' });
  createUser({ name: 'Target', login: 'tg', password: 'secret123', role: 'target', telegram_id: '777' });
  createUser({ name: 'Madina', login: 'mad', password: 'secret123', role: 'sales' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login, password = 'secret123') {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password }) });
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

function signInitData(user, authDate = Math.floor(Date.now() / 1000), token = '123:TEST') {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'AAH', user: JSON.stringify(user) });
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

test('Telegram initData: to\'g\'ri imzo qabul, soxta va eskisi rad etiladi', () => {
  const ok = signInitData({ id: 777, first_name: 'T' });
  assert.equal(verifyTelegramInitData(ok, '123:TEST').id, 777);
  assert.equal(verifyTelegramInitData(ok, '123:OTHER'), null);
  assert.equal(verifyTelegramInitData(ok.replace('777', '778'), '123:TEST'), null);
  assert.equal(verifyTelegramInitData(signInitData({ id: 777 }, 1000), '123:TEST'), null);
});

test('Mini App orqali kirish va Bearer token', async () => {
  let r = await fetch(`${base}/api/tg-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: signInitData({ id: 999 }) }) });
  assert.equal(r.status, 403, "bog'lanmagan Telegram ID");
  r = await fetch(`${base}/api/tg-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: signInitData({ id: 777 }) }) });
  assert.equal(r.status, 200);
  const { token } = await r.json();
  const me = await (await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${token}` } })).json();
  assert.equal(me.user.login, 'tg');
});

test('oylik reja: fakt, kutilgan va prognoz', async () => {
  const boss = await session('boss');
  const p = await boss.json('/api/projects', { method: 'POST', body: { name: 'IELTS' } });
  const month = today().slice(0, 7);
  const { from } = monthBounds(month);
  let r = await boss('/api/plans', { method: 'PUT', body: { month, project_id: p.id, values: { leads: 300, sales: 30, budget: 1000 } } });
  assert.equal(r.status, 200);
  const target = await session('tg');
  r = await target('/api/plans', { method: 'PUT', body: { month, project_id: p.id, values: { leads: 1 } } });
  assert.equal(r.status, 403);
  await target('/api/daily', { method: 'PUT', body: { project_id: p.id, date: from, values: { spend: 100 } } });
  const mad = await session('mad');
  await mad('/api/daily', { method: 'PUT', body: { project_id: p.id, date: from, values: { sales: 3 } } });

  const prog = await boss.json(`/api/plan-progress?month=${month}`);
  assert.equal(prog.items.length, 1);
  assert.equal(prog.items[0].metrics.sales.fact, 3);
  assert.equal(prog.items[0].metrics.sales.plan, 30);
  assert.equal(prog.items[0].metrics.sales.pct, 0.1);
  assert.equal(prog.items[0].metrics.revenue.plan, null);
  assert.ok(prog.elapsed >= 1 && prog.elapsed <= prog.days);
  assert.ok(Math.abs(prog.items[0].metrics.sales.forecast - (3 / prog.elapsed) * prog.days) < 1e-9);

  const s = await boss.json(`/api/summary?from=${from}&to=${today()}`);
  assert.equal(s.plan.month, month);
});

test('reklama postlari: teg, deep link hodisalari va xarajat ko\'rsatkichlari', async () => {
  const boss = await session('boss');
  const p = await boss.json('/api/projects', { method: 'POST', body: { name: 'Python', slug: 'python' } });
  const target = await session('tg');
  const mad = await session('mad');
  const body = { project_id: p.id, date: today(), name: 'Kanal posti #12', platform: 'channel_post', spend: 30, clicks: 1000, starts: 5 };
  let r = await mad('/api/campaigns', { method: 'POST', body });
  assert.equal(r.status, 403);
  const c1 = await target.json('/api/campaigns', { method: 'POST', body });
  const c2 = await target.json('/api/campaigns', { method: 'POST', body });
  assert.equal(c1.tag, 'kanal_posti_12');
  assert.equal(c2.tag, 'kanal_posti_12_2', 'teg takrorlanmaydi');

  // Bot ?start=python__kanal_posti_12 orqali kelganlar — qo'lda kiritilgan 5 o'rniga avtomatik hisob
  for (let i = 0; i < 2500; i++) recordEvent(p.id, 'start', 10_000 + i, c1.tag);
  const list = await boss.json(`/api/campaigns?project=${p.id}`);
  const row = list.rows.find((x) => x.id === c1.id);
  assert.equal(row.starts, 2500);
  assert.equal(row.organic, 1500);
  assert.equal(row.cost_per_start, 30 / 2500);
  assert.equal(list.rows.find((x) => x.id === c2.id).starts, 5);
  assert.equal(list.byPlatform[0].platform, 'channel_post');

  r = await target(`/api/campaigns/${c2.id}`, { method: 'PUT', body: { spend: 45 } });
  assert.equal((await r.json()).spend, 45);
  r = await fetch(`${base}/api/campaigns/${c2.id}`, { method: 'DELETE' });
  assert.equal(r.status, 401);
  r = await target(`/api/campaigns/${c2.id}`, { method: 'DELETE' });
  assert.equal(r.status, 200);
});

test('hisobot intizomi va parolni almashtirish', async () => {
  const boss = await session('boss');
  const d = await boss.json('/api/discipline?days=7');
  const sales = d.find((x) => x.role === 'sales');
  assert.deepEqual(sales.users, ['Madina']);
  assert.equal(sales.days.length, 7);
  assert.equal(sales.days.at(-1).date, today());
  assert.equal(sales.days[0].date, addDays(today(), -6));

  const mad = await session('mad');
  let r = await mad('/api/me/password', { method: 'PUT', body: { old: 'wrong', new: 'newpass1' } });
  assert.equal(r.status, 400);
  r = await mad('/api/me/password', { method: 'PUT', body: { old: 'secret123', new: 'newpass1' } });
  assert.equal(r.status, 200);
  await session('mad', 'newpass1');
});

test('Telegram hisobot ko\'rinishi', async () => {
  const boss = await session('boss');
  const { text } = await boss.json('/api/report-preview');
  assert.match(text, /Kunlik hisobot/);
  assert.match(text, /Oylik reja/);
});
