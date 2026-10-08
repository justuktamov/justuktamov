// Kiritilgan raqamlar to'g'ri saqlanishi: sonlar, alohida lidlar, kunlik dollar kursi, arxivdagi loyiha
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { mkdtempSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { DatabaseSync } = await import('node:sqlite');
const { getDb, today, setSetting, FIELDS } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays, parseNum } = await import('../src/metrics.js');
const { makeBackup, backupStatus } = await import('../src/backup.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
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

test("sonlar: nuqta yoki vergul bilan yozilgan minglik «450.000» 450 bo'lib qolmaydi", async () => {
  const cases = [['4050000', 4050000], ['4 050 000', 4050000], ['450.000', 450000], ['450,000', 450000], ['1,500', 1500],
    ['4.050.000', 4050000], ['4,050,000', 4050000], ['4.050.000,50', 4050000.5], ['4,050,000.50', 4050000.5],
    ['58.58', 58.58], ['12,5', 12.5], ['0.500', 0.5], ['1 234,5', 1234.5], ['', null]];
  for (const [s, want] of cases) assert.equal(parseNum(s), want, s);
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.ok(Number.isNaN(parseNum('12.5.1')), 'yaroqsiz');

  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'SONLAR' } });
  const d = addDays(today(), -1);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { revenue: '450.000', spend: '58.58', sales: '3' } } });
  const row = (await pm.json(`/api/daily?date=${d}`)).projects.find((x) => x.id === p.id).row;
  assert.equal(row.revenue, 450000);
  assert.equal(row.spend, 58.58);
  const r = await pm('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { revenue: '12.5.1' } } });
  assert.equal(r.status, 400);
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test("lidlar: targetolog (1-qadam) va sotuv bo'limi (2-qadam) lidlari alohida saqlanadi va alohida ko'rsatiladi", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'LIDLAR' } });
  const d = addDays(today(), -2);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { target_leads: '120', spend: '60' } } });
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { leads: '104', sales: '5', revenue: '5000000' } } });
  const row = (await pm.json(`/api/daily?date=${d}`)).projects.find((x) => x.id === p.id).row;
  assert.equal(row.target_leads, 120, "sotuv bo'limi lidlari targetolognikini o'zgartirmaydi");
  assert.equal(row.leads, 104);
  const s = await pm.json(`/api/summary?from=${d}&to=${d}`);
  const sp = s.byProject.find((x) => x.id === p.id);
  assert.equal(sp.target_leads, 120);
  assert.equal(sp.leads, 104);
  assert.equal(sp.cpl, 60 / 104, "lid narxi — sotuv bo'limi lidlaridan");
  const text = (await pm.json(`/api/report/preview?date=${d}`)).text;
  assert.match(text, /target lid 120 · sotuv bo'limi lid 104/);
  assert.match(text, /lid: target <b>120<\/b>, sotuv bo'limi <b>104<\/b>/);
  // Avtovoronka: targetolog lidi alohida ko'rsatiladi, lekin jami lid solishtiruviga qo'shilmaydi (unda sotuv bo'limi lidi yo'q)
  const a = await pm.json('/api/projects', { method: 'POST', body: { name: 'BOT', kind: 'auto' } });
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: a.id, date: d, values: { target_leads: '500', starts: '450', spend: '30' } } });
  const t2 = (await pm.json(`/api/report/preview?date=${d}`)).text;
  assert.match(t2, /target lid 500 · 450 bot start/);
  assert.match(t2, /lid: target <b>120<\/b>, sotuv bo'limi <b>104<\/b>/);
  await pm.json(`/api/projects/${a.id}`, { method: 'PUT', body: { active: false } });
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test("dollar kursi har kun uchun alohida: bir kunning kursi boshqa kunlarni o'zgartirmaydi", async () => {
  setSetting('usd_rate', '10000'); // eski umumiy kurs — kunlik kurs kiritilishidan oldingi kunlar uchun
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'KURS' } });
  const [d1, d2, d3] = [addDays(today(), -30), addDays(today(), -29), addDays(today(), -28)];
  for (const d of [d1, d2, d3]) await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '100', revenue: '2000000' } } });
  const uzs = async (d) => (await pm.json(`/api/summary?from=${d}&to=${d}`)).byProject.find((x) => x.id === p.id).spend_uzs;

  await pm.json('/api/rate', { method: 'PUT', body: { date: d2, usd_rate: '12 000' } });
  assert.equal(await uzs(d1), 1_000_000, 'kurs kiritilishidan oldingi kun — eski kurs');
  assert.equal(await uzs(d2), 1_200_000);
  assert.equal(await uzs(d3), 1_200_000, 'kursi kiritilmagan kun — oldingi kiritilgan kurs');

  await pm.json('/api/rate', { method: 'PUT', body: { date: d3, usd_rate: '13000' } });
  assert.equal(await uzs(d2), 1_200_000, "keyingi kunning kursi oldingi kunni o'zgartirmaydi");
  assert.equal(await uzs(d3), 1_300_000);
  await pm.json('/api/rate', { method: 'PUT', body: { date: d1, usd_rate: '11000' } });
  assert.equal(await uzs(d2), 1_200_000, "oldingi kunning kursi keyingi kunni o'zgartirmaydi");

  const all = (await pm.json(`/api/summary?from=${d1}&to=${d3}`)).byProject.find((x) => x.id === p.id);
  assert.equal(all.spend_uzs, 1_100_000 + 1_200_000 + 1_300_000, 'davr jami — har kun o\'z kursi bilan');
  const day = await pm.json(`/api/daily?date=${d3}`);
  assert.deepEqual(day.rate, { value: 13000, prev: 12000 });
  assert.match((await pm.json(`/api/report/preview?date=${d3}`)).text, /kurs 13\s000\)/);
  const csv = await (await pm(`/api/export.csv?from=${d2}&to=${d2}`)).text();
  assert.match(csv, /,usd_rate,/);
  assert.match(csv, /,12000,/);
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test("har bir kiritish tarixda saqlanadi: kim, qachon, nima, eski va yangi qiymat", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'TARIX' } });
  const d = addDays(today(), -12);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '60', target_leads: '100' }, reasons: { bad: { duplicate: '3' } } } });
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '70', target_leads: '100' } } });
  await pm.json('/api/rate', { method: 'PUT', body: { date: d, usd_rate: '12 600' } });
  await pm.json('/api/report', { method: 'PUT', body: { date: d, summary: 'Birinchi xulosa' } });
  await pm.json('/api/report/submit', { method: 'POST', body: { date: d, summary: 'Tuzatilgan xulosa' } });
  const h = await pm.json(`/api/history?date=${d}`);
  const find = (label, nv) => h.find((x) => x.label === label && x.new === nv);
  const spend = h.filter((x) => x.label === FIELDS.spend);
  assert.deepEqual(spend.map((x) => [x.old, x.new]), [['60', '70'], [null, '60']], 'eng yangisi birinchi; bir xil qiymat qayta yozilmaydi');
  assert.equal(spend[0].user, 'Dilshod');
  assert.equal(spend[0].project, 'TARIX');
  assert.match(spend[0].at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(h.filter((x) => x.field === 'target_leads').length, 1);
  assert.ok(find("Nega sifatsiz: Dublikat", '3'));
  assert.ok(find('Dollar kursi', '12600'));
  assert.equal(find('Kun xulosasi', 'Tuzatilgan xulosa').old, 'Birinchi xulosa');
  assert.ok(find('Hisobot', 'yuborildi'));
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
});

test("zaxira nusxa: ilova o'zi oladi, sozlamalarda oxirgisi ko'rinadi", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'analytika-auto-'));
  try {
    const r = makeBackup(dir);
    assert.ok(r.size > 0);
    const st = backupStatus(dir);
    assert.equal(st.count, 1);
    assert.equal(st.last, today());
    const copy = new DatabaseSync(r.file);
    assert.ok(copy.prepare("SELECT name FROM sqlite_master WHERE name = 'entry_log'").get(), 'tarix ham nusxada');
    copy.close();
    makeBackup(dir); // shu kuni qayta — o'sha fayl yangilanadi
    assert.equal(backupStatus(dir).count, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const pm = await session();
  assert.ok('backup' in (await pm.json('/api/settings')));
});

test("arxivlangan loyihaning o'tgan kunlardagi raqamlari jamidan chiqib ketmaydi", async () => {
  const pm = await session();
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'ARXIV' } });
  const d = addDays(today(), -5);
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: { spend: '40', leads: '20', sales: '2', revenue: '3000000' } } });
  const before = (await pm.json(`/api/summary?from=${d}&to=${d}`)).totals;
  await pm.json(`/api/projects/${p.id}`, { method: 'PUT', body: { active: false } });
  const s = await pm.json(`/api/summary?from=${d}&to=${d}`);
  assert.equal(s.totals.revenue, before.revenue, "jami o'zgarmaydi");
  assert.equal(s.totals.spend, before.spend);
  assert.equal(s.byProject.find((x) => x.id === p.id).archived, true, 'arxivda deb belgilangan');
  const m = await pm.json(`/api/monthly?unit=day&months=1&to=${d}`);
  assert.equal(m[0].totals.revenue, before.revenue, 'dinamikada ham');
  assert.match((await pm.json(`/api/report/preview?date=${d}`)).text, /ARXIV/, 'o\'sha kun hisobotida ham');
  assert.equal((await pm.json(`/api/daily?date=${d}`)).projects.some((x) => x.id === p.id), false, 'kiritish ro\'yxatida yo\'q');
  // Raqami yo'q kunda arxivdagi loyiha ko'rinmaydi
  const empty = await pm.json(`/api/summary?from=${addDays(d, 1)}&to=${addDays(d, 1)}`);
  assert.equal(empty.byProject.some((x) => x.id === p.id), false);
});
