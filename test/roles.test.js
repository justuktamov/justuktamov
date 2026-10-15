import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { createApp } = await import('../src/server.js');
const { reportText } = await import('../src/reports.js');

let server, base;
const D = addDays(today(), -1);
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

let pm, ids = {};
test('PM targetolog va ROP uchun login yaratadi, loyihalarni biriktiradi', async () => {
  pm = await session('pm', 'secret123');
  const a = await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART' } });
  const b = await pm.json('/api/projects', { method: 'POST', body: { name: 'STARPAY', kind: 'auto' } });
  const c = await pm.json('/api/projects', { method: 'POST', body: { name: 'SELFENG' } });
  ids = { vizart: a.id, starpay: b.id, selfeng: c.id };
  let r = await pm('/api/users', { method: 'POST', body: { name: 'Aziz', login: 'aziz', password: '123', role: 'target' } });
  assert.equal(r.status, 400, 'qisqa parol');
  r = await pm('/api/users', { method: 'POST', body: { name: 'Aziz', login: 'aziz', password: 'target123', role: 'target', projects: [a.id, b.id], telegram_id: '5551234' } });
  assert.equal(r.status, 201);
  const t = await r.json();
  assert.equal(t.role, 'target');
  assert.deepEqual(t.projects, [a.id, b.id]);
  r = await pm('/api/users', { method: 'POST', body: { name: 'Malika', login: 'malika', password: 'rop12345', role: 'rop' } });
  assert.equal(r.status, 201);
  r = await pm('/api/users', { method: 'POST', body: { name: 'X', login: 'aziz', password: 'xxxxxx1', role: 'rop' } });
  assert.equal(r.status, 409, 'band login');
  const list = await pm.json('/api/users');
  assert.equal(list.length, 3);
});

test('targetolog: faqat o\'z loyihalari, faqat target maydonlari, PM bo\'limlari yopiq', async () => {
  const t = await session('aziz', 'target123');
  const me = await t.json('/api/me');
  assert.equal(me.user.role, 'target');
  const daily = await t.json(`/api/daily?date=${D}`);
  // Hamma loyihalar ko'rinadi (tahlil uchun), kiritish — faqat biriktirilganlariga
  assert.equal(daily.projects.length, 3);
  assert.deepEqual(daily.editable.sort(), [ids.vizart, ids.starpay].sort());
  assert.equal(daily.mine.submitted_at, null);
  assert.ok(Array.isArray(daily.staff), 'umumiy hisobot sahifasi hammaga bir xil');
  // PM bo'limlari
  // Ko'rish sahifalari — hammaga; boshqaruv (xodimlar, sozlamalar, tasdiqlash, direktorga yuborish) — faqat PM
  for (const path of ['/api/summary', `/api/report?date=${D}`, '/api/monthly', '/api/reports', `/api/sellers/stats?from=${D}&to=${D}`]) {
    assert.equal((await t(path)).status, 200, path);
  }
  for (const path of ['/api/users', '/api/settings']) assert.equal((await t(path)).status, 403, path);
  for (const [path, body] of [['/api/report/submit', { date: D }], ['/api/report', { date: D }], ['/api/part/approve', { date: D, part: 'target' }], ['/api/projects/order', { ids: [1] }]]) {
    assert.equal((await t(path, { method: path === '/api/report' || path === '/api/projects/order' ? 'PUT' : 'POST', body })).status, 403, path);
  }
  // Sotuv maydoni — yo'q
  let r = await t('/api/daily', { method: 'PUT', body: { project_id: ids.vizart, date: D, values: { revenue: 100 } } });
  assert.equal(r.status, 403);
  // Boshqa loyiha — yo'q
  r = await t('/api/daily', { method: 'PUT', body: { project_id: ids.selfeng, date: D, values: { spend: 10 } } });
  assert.equal(r.status, 404);
  // Yuborish: kurs va majburiy raqamlarsiz — yo'q
  r = await t('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal(r.status, 400);
  assert.equal((await t('/api/rate', { method: 'PUT', body: { date: D, usd_rate: '12700' } })).status, 200);
  r = await t('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /VIZART/);
  for (const id of [ids.vizart, ids.starpay]) {
    r = await t('/api/daily', { method: 'PUT', body: { project_id: id, date: D, values: { spend: 50, impressions: 20000, clicks: 400, target_leads: 30, tl_web: 12, tl_bot: 18, creative_best: 'video 3' } } });
    assert.equal(r.status, 200);
  }
  r = await t('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal(r.status, 200);
  const s = await r.json();
  assert.ok(s.submitted_at);
  assert.equal(s.resend, false);
  assert.equal((await t.json('/api/me')).partSent, s.submitted_at);
});

test('ROP: sotuv maydonlari va sabablar; target maydoni va kurs — yo\'q', async () => {
  const rop = await session('malika', 'rop12345');
  const daily = await rop.json(`/api/daily?date=${D}`);
  assert.equal(daily.editable.length, 3, 'biriktirilmagan — hamma loyihalarga kiritadi');
  let r = await rop('/api/daily', { method: 'PUT', body: { project_id: ids.vizart, date: D, values: { spend: 5 } } });
  assert.equal(r.status, 403);
  r = await rop('/api/rate', { method: 'PUT', body: { date: D, usd_rate: '12000' } });
  assert.equal(r.status, 403);
  r = await rop('/api/daily', { method: 'PUT', body: { project_id: ids.vizart, date: D, values: { leads: 25, calls: 60, qualified: 10, unqualified: 10, potential: 5, sales: 3, revenue: 4050000 }, reasons: { lost: { expensive: 2 } } } });
  assert.equal(r.status, 200);
  r = await rop('/api/daily', { method: 'PUT', body: { project_id: ids.vizart, date: D, channels: { instagram: { spend: 1 } } } });
  assert.equal(r.status, 403, 'kanallar — PM');
  r = await rop('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal(r.status, 400, 'STARPAY va SELFENG to\'ldirilmagan');
  await rop('/api/daily', { method: 'PUT', body: { project_id: ids.starpay, date: D, values: { starts: 300, sales: 90, revenue: 8000000 } } });
  await rop('/api/daily', { method: 'PUT', body: { project_id: ids.selfeng, date: D, values: { leads: 0, sales: 0, revenue: 0 } } });
  r = await rop('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal(r.status, 200);
  // Qayta yuborish — tuzatilgan
  r = await rop('/api/part/submit', { method: 'POST', body: { date: D } });
  assert.equal((await r.json()).resend, true);
});

test('PM xodimlar holatini ko\'radi; hisobotda kim kiritgani va lid manbasi', async () => {
  const daily = await pm.json(`/api/daily?date=${D}`);
  assert.equal(daily.staff.length, 2);
  assert.ok(daily.staff.every((s) => s.submitted_at));
  const text = reportText(D);
  assert.match(text, /Kiritdi: 🎯 Aziz/);
  assert.match(text, /📞 Malika/);
  assert.match(text, /target lid 30 \(web 12, bot 18\)/);
  assert.match(text, /qo'ng'iroq 60/);
  assert.match(text, /4\s050\s000 so'm/);
});

test('PM xodimni o\'chiradi — kira olmaydi; o\'zini o\'chira olmaydi', async () => {
  const users = await pm.json('/api/users');
  const rop = users.find((u) => u.login === 'malika');
  const self = users.find((u) => u.login === 'pm');
  let r = await pm(`/api/users/${self.id}`, { method: 'PUT', body: { role: 'rop' } });
  assert.equal(r.status, 400);
  r = await pm(`/api/users/${rop.id}`, { method: 'PUT', body: { active: false } });
  assert.equal(r.status, 200);
  r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'malika', password: 'rop12345' }) });
  assert.equal(r.status, 401);
  // Parolni PM yangilaydi
  const t = users.find((u) => u.login === 'aziz');
  r = await pm(`/api/users/${t.id}`, { method: 'PUT', body: { password: 'yangi1234' } });
  assert.equal(r.status, 200);
  await session('aziz', 'yangi1234');
});

test('sabablar yangi bo\'linishi: eski yozuvlar yangi guruhga ko\'chadi', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const file = join(mkdtempSync(join(tmpdir(), 'rsn-')), 'old.db');
  // Eski baza: info_only — «sifatsiz», no_laptop — «sotib olmadi» guruhida
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT, kind TEXT NOT NULL DEFAULT 'leads', active INTEGER NOT NULL DEFAULT 1, created_at TEXT, reason_keys TEXT);
    CREATE TABLE reasons (project_id INTEGER NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, reason TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (project_id, date, kind, reason));
    INSERT INTO projects (id, name, reason_keys) VALUES (1, 'DIZIPRO', '{"bad":["info_only"],"lost":["no_laptop"]}');
    INSERT INTO reasons VALUES (1, '2026-10-01', 'bad', 'info_only', 5), (1, '2026-10-01', 'lost', 'no_laptop', 2), (1, '2026-10-01', 'lost', 'info_only', 1);`);
  old.close();
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, ['--no-warnings', '-e', `
    process.env.DB_PATH = ${JSON.stringify(file)};
    const { getDb } = await import(${JSON.stringify(new URL('../src/db.js', import.meta.url).href)});
    const db = getDb();
    console.log(JSON.stringify({ r: db.prepare('SELECT kind, reason, count FROM reasons ORDER BY kind, reason').all(), k: db.prepare('SELECT reason_keys FROM projects').get().reason_keys }));
  `], { encoding: 'utf8', input: '' });
  const { r, k } = JSON.parse(out.trim().split('\n').at(-1));
  assert.deepEqual(r.map((x) => ({ ...x })), [{ kind: 'bad', reason: 'no_laptop', count: 2 }, { kind: 'lost', reason: 'info_only', count: 6 }]);
  assert.equal(k, null, 'loyiha tanlovi — yangi umumiy tartib');
});

test('PM tekshiradi: tasdiqlaydi yoki izoh bilan qaytaradi; xodim qayta yuborsa — tasdiq yangilanadi', async () => {
  const D2 = addDays(D, -1);
  const t = await session('aziz', 'yangi1234');
  await t('/api/rate', { method: 'PUT', body: { date: D2, usd_rate: '12700' } });
  for (const id of [ids.vizart, ids.starpay]) await t('/api/daily', { method: 'PUT', body: { project_id: id, date: D2, values: { spend: 40, clicks: 300 } } });
  assert.equal((await t('/api/part/submit', { method: 'POST', body: { date: D2 } })).status, 200);
  let r = await pm('/api/part/approve', { method: 'POST', body: { date: D2, part: 'target' } });
  assert.ok((await r.json()).approvals.target.approved_at);
  assert.equal((await t('/api/part/approve', { method: 'POST', body: { date: D2, part: 'target' } })).status, 403, 'xodim tasdiqlay olmaydi');
  // Qaytarish
  const aziz = (await pm.json('/api/users')).find((u) => u.login === 'aziz');
  r = await pm('/api/part/return', { method: 'POST', body: { date: D2, user_id: aziz.id, note: 'VIZART klik soni xato' } });
  assert.equal(r.status, 200);
  let mine = (await t.json(`/api/daily?date=${D2}`)).mine;
  assert.equal(mine.submitted_at, null);
  assert.equal(mine.returned.note, 'VIZART klik soni xato');
  let d = await pm.json(`/api/daily?date=${D2}`);
  assert.equal(d.approvals.target, undefined, 'qaytarilganda tasdiq bekor');
  assert.equal(d.staff.find((s) => s.id === aziz.id).returned.note, 'VIZART klik soni xato');
  // Tuzatib qayta yuboradi
  await t('/api/daily', { method: 'PUT', body: { project_id: ids.vizart, date: D2, values: { clicks: 320 } } });
  await t('/api/part/submit', { method: 'POST', body: { date: D2 } });
  mine = (await t.json(`/api/daily?date=${D2}`)).mine;
  assert.ok(mine.submitted_at);
  assert.equal(mine.returned, null);
  await pm('/api/part/approve', { method: 'POST', body: { date: D2, part: 'target' } });
  await t('/api/part/submit', { method: 'POST', body: { date: D2 } });
  d = await pm.json(`/api/daily?date=${D2}`);
  assert.equal(d.approvals.target, undefined, 'qayta yuborilsa — PM qayta tasdiqlaydi');
});
