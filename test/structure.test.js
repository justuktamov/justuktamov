// Yangi tuzilma: rollar (direktor, marketing, moliya), PM beradigan kiritish ruxsati,
// marketing va operatsion xarajatlar (sof foydaga ta'siri) va «Nazorat» (javobgarlik, intizom, iqtisod)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');

let server, base;
const D = addDays(today(), -1);
const D2 = addDays(today(), -2);
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login, password) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password }) });
  assert.equal(r.status, 200, `${login} kira olmadi`);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

let pm, pid, users = {};
test('PM xodimlar yaratadi: rolga qarab odatiy ruxsat, keyin o\'zgartiradi', async () => {
  pm = await session('pm', 'secret123');
  pid = (await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART', var_cost_pct: 10, fixed_monthly: 3_000_000 } })).id;
  for (const [login, role] of [['aziz', 'target'], ['malika', 'rop'], ['jasur', 'marketing'], ['nodira', 'finance'], ['rustam', 'director']]) {
    const r = await pm('/api/users', { method: 'POST', body: { name: login, login, password: 'parol1234', role } });
    assert.equal(r.status, 201, login);
    users[login] = await r.json();
  }
  assert.deepEqual(users.aziz.access, ['target']);
  assert.deepEqual(users.malika.access, ['rop', 'sellers']);
  assert.deepEqual(users.jasur.access, ['marketing']);
  assert.deepEqual(users.rustam.access, ['target', 'rop', 'sellers', 'marketing', 'finance'], 'direktor — hammasi');
  // PM ruxsatni o'zgartiradi: ROP dan «sotuv xodimlari» olinadi; noma'lum bo'lim — xato
  let r = await pm(`/api/users/${users.malika.id}`, { method: 'PUT', body: { access: ['rop'] } });
  assert.deepEqual((await r.json()).access, ['rop']);
  r = await pm(`/api/users/${users.malika.id}`, { method: 'PUT', body: { access: ['rop', 'xyz'] } });
  assert.equal(r.status, 400);
});

test('direktor — PM kabi hammasini ko\'radi va tuzatadi; xodim — faqat o\'z bo\'limini', async () => {
  const dir = await session('rustam', 'parol1234');
  const me = await dir.json('/api/me');
  assert.equal(me.user.role, 'director');
  assert.equal(me.access.length, 5);
  assert.equal((await dir('/api/summary')).status, 200);
  assert.equal((await dir('/api/control')).status, 200);
  assert.equal((await dir('/api/users')).status, 200, 'direktor xodimlarni boshqaradi');
  const daily = await dir.json(`/api/daily?date=${D}`);
  assert.equal(daily.editable, null, 'direktor — hamma loyiha');
  let r = await dir('/api/expenses', { method: 'POST', body: { kind: 'marketing', date: D, category: 'content', amount: 100000 } });
  assert.equal(r.status, 201);
  await dir(`/api/expenses/${(await r.json()).id}`, { method: 'DELETE', body: {} });
  // O'zini boshqaruvdan chiqara olmaydi
  r = await dir(`/api/users/${users.rustam.id}`, { method: 'PUT', body: { role: 'target' } });
  assert.equal(r.status, 400);
  // Targetolog — sotuv raqamini emas; ROP sotuv xodimlarini ham endi kiritmaydi (ruxsat olindi)
  const t = await session('aziz', 'parol1234');
  r = await t('/api/daily', { method: 'PUT', body: { project_id: pid, date: D, values: { sales: 3 } } });
  assert.equal(r.status, 403);
  r = await t('/api/daily', { method: 'PUT', body: { project_id: pid, date: D, values: { spend: 40, clicks: 400, impressions: 20000, target_leads: 40 } } });
  assert.equal(r.status, 200);
  const rop = await session('malika', 'parol1234');
  r = await rop('/api/sellers', { method: 'POST', body: { name: 'Barno' } });
  assert.equal(r.status, 403);
  r = await rop('/api/daily', { method: 'PUT', body: { project_id: pid, date: D, values: { leads: 30, calls: 20, qualified: 15, sales: 2, revenue: 4_000_000 } } });
  assert.equal(r.status, 200);
  // Marketing rahbari faqat marketing xarajatini, moliyachi — operatsionni
  const mk = await session('jasur', 'parol1234');
  r = await mk('/api/expenses', { method: 'POST', body: { kind: 'opex', date: D, category: 'salary', amount: 1 } });
  assert.equal(r.status, 403);
  // Targetolog va marketing PM bo'limlarini (sozlamalar, xodimlar) ocha olmaydi
  assert.equal((await mk('/api/users')).status, 403);
});

test('marketing va operatsion xarajat sof foydaga kiradi; umumiy xarajat — alohida', async () => {
  const mk = await session('jasur', 'parol1234');
  let r = await mk('/api/expenses', { method: 'POST', body: { kind: 'marketing', date: D, project_id: pid, category: 'content', amount: '500 000', note: 'Video' } });
  assert.equal(r.status, 201);
  const e = await r.json();
  r = await mk('/api/expenses', { method: 'POST', body: { kind: 'marketing', date: D, category: 'smm', amount: 20, currency: 'usd' } });
  assert.equal(r.status, 201);
  r = await mk('/api/expenses', { method: 'POST', body: { kind: 'marketing', date: D, category: 'nope', amount: 1 } });
  assert.equal(r.status, 400);
  const monthDays = new Date(Date.UTC(Number(D.slice(0, 4)), Number(D.slice(5, 7)), 0)).getUTCDate();
  const before = await pm.json(`/api/summary?from=${D}&to=${D}`);
  const p = before.byProject.find((x) => x.id === pid);
  // Marketing ham oy kunlariga bo'linadi: bir kunga — oyning 1/N qismi
  assert.ok(Math.abs(p.marketing_uzs - 500000 / monthDays) < 1);
  assert.ok(Math.abs(p.net_profit - (p.revenue - p.spend_uzs - p.marketing_uzs - p.var_cost - p.fixed_cost)) < 1);
  assert.equal(p.fixed_actual, false, "fakt yo'q — taxmin");
  // Moliyachi shu oy uchun ish haqi kiritadi — doimiy xarajat endi fakt (oy kunlariga bo'linadi)
  const fin = await session('nodira', 'parol1234');
  r = await fin('/api/expenses', { method: 'POST', body: { kind: 'opex', date: D, project_id: pid, category: 'salary', amount: 6_200_000 } });
  assert.equal(r.status, 201);
  const after = await pm.json(`/api/summary?from=${D}&to=${D}`);
  const q = after.byProject.find((x) => x.id === pid);
  assert.equal(q.fixed_actual, true);
  assert.ok(Math.abs(q.fixed_cost - 6_200_000 / monthDays) < 1);
  assert.ok(after.totals.general.marketing > 0, 'loyihasiz marketing — umumiy');
  assert.ok(after.totals.company_net < after.totals.net_profit);
  // Faqat o'z turini o'zgartiradi/o'chiradi
  assert.equal((await fin(`/api/expenses/${e.id}`, { method: 'DELETE', body: {} })).status, 403);
  assert.equal((await mk(`/api/expenses/${e.id}`, { method: 'PUT', body: { amount: 600000 } })).status, 200);
  const list = await pm.json(`/api/expenses?from=${D}&to=${D}&kind=marketing`);
  assert.equal(list.items.length, 2);
  assert.ok(list.items.some((x) => x.amount === 600000 && x.project === 'VIZART' && x.by === 'jasur'));
});

test('Nazorat: 1 mijoz narxi, chegaraviy narx, javobgarlar va intizom', async () => {
  // Xodimlar avvaldan ishlaydi (bugun qo'shilgan xodim o'tgan kunlar uchun javob bermaydi)
  getDb().prepare('UPDATE users SET created_at = ?').run(`${addDays(today(), -10)} 08:00:00`);
  // Kecha targetolog yubordi, ROP yubormadi; o'tgan kun hech kim
  const t = await session('aziz', 'parol1234');
  await t('/api/rate', { method: 'PUT', body: { date: D, usd_rate: 12700 } });
  assert.equal((await t('/api/part/submit', { method: 'POST', body: { date: D } })).status, 200);
  const c = await pm.json(`/api/control?from=${D2}&to=${D}`);
  const p = c.projects.find((x) => x.id === pid);
  assert.equal(p.sales, 2);
  assert.ok(p.cac_full_uzs > p.cac_uzs, "marketing bilan 1 mijoz qimmatroq");
  assert.ok(p.contribution > 0 && p.breakeven != null);
  assert.ok(['crit', 'warn', 'good', 'ok'].includes(p.verdict.level));
  assert.deepEqual(c.owners.map((o) => o.key), ['target', 'rop', 'marketing', 'finance', 'pm']);
  // Pul taqsimoti va birinchi navbatdagi ishlar (pul bilan)
  assert.ok(c.allocation && c.allocation.marketing && Array.isArray(c.allocation.projects));
  assert.ok(Array.isArray(c.priorities));
  assert.ok(c.priorities.every((x) => x.impact > 0));
  assert.ok(c.verdict.text.length > 10);
  // Qo'ng'iroq lidlardan kam — ROP ga
  assert.ok(c.issues.some((i) => i.owner === 'rop' && /Qo'ng'iroq/.test(i.text)));
  // Reja yo'q — PM ga
  assert.ok(c.issues.some((i) => i.owner === 'pm' && /reja/.test(i.text)));
  const rop = c.discipline.rows.find((x) => x.name === 'malika');
  assert.equal(rop.missed, 1, "o'tgan kun kiritilmagan");
  assert.equal(rop.pending, 1, 'kecha — hali kutilmoqda');
  const mk = c.discipline.rows.find((x) => x.name === 'jasur');
  assert.equal(mk.entries, 2);
  assert.ok(c.costs_by_category.some((x) => x.kind === 'opex' && x.category === 'salary'));
  // AI ulanmagan — tushunarli xato
  const r = await pm('/api/control/ai', { method: 'POST', body: { from: D2, to: D } });
  assert.equal(r.status, 503);
});
