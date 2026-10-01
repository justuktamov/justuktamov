import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { addDirectorReply, latestSentDate } = await import('../src/reports.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123', role: 'pm' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function session(login) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login, password: 'secret123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test("PM tahlili: lid narxi oshgani, sifatsiz lidlar va past sotuv aniqlanadi; direktor javobi saqlanadi", async () => {
  const pm = await session('pm');
  const p = await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART' } });
  const d = today();
  // O'tgan 2 hafta: lid $2, konversiya 10%
  for (let i = 14; i >= 1; i--) {
    await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: addDays(d, -i), values: { spend: 40, impressions: 5000, clicks: 200, leads: 20, sales: 2, revenue: 4000000 } } });
  }
  // Bugun: lid $5, yarmidan ko'pi sifatsiz, sotuv yo'q
  const r = await pm.json('/api/daily', { method: 'PUT', body: { project_id: p.id, date: d, values: {
    spend: 60, impressions: 6000, clicks: 220, new_creatives: 0, creative_worst: 'Banner #3',
    leads: 12, qualified: 2, potential: 4, unqualified: 6, sales: 0, revenue: 0, note_sales: "Javob bermayapti",
  } } });
  assert.equal(r.changed, 12);
  const b = await pm.json(`/api/report?date=${d}`);
  const adv = b.advice[p.id];
  const text = adv.problems.map((x) => x.text).join(' | ');
  assert.match(text, /Lid narxi ko'tarildi: \$5\.00 \(odatda \$2\.00/);
  assert.match(text, /50% sifatsiz/);
  assert.match(text, /12 ta lid, birorta ham sotuv yo'q/);
  assert.match(text, /ROP: Javob bermayapti/);
  assert.ok(adv.proposals.some((x) => /Kreativlarni yangilash kerak — «Banner #3»/.test(x)));
  assert.ok(adv.proposals.some((x) => /Sotuv bo'limi rahbari bilan gaplashish/.test(x)));
  assert.equal(adv.status, 'sales_issue');

  const preview = (await pm.json(`/api/report/preview?date=${d}`)).text;
  assert.match(preview, /sifatli 2 · potensial 4 · sifatsiz 6/);
  assert.match(preview, /👎 Ishlamayotgan: Banner #3/);
  assert.match(preview, /💡 Kreativlarni yangilash/);

  // Javob faqat yuborilgan hisobotga yoziladi
  assert.equal(addDirectorReply(d, 'Yangi video qiling'), null);
  await pm.json('/api/report/submit', { method: 'POST', body: { date: d, project_notes: { [p.id]: { status: 'creative', comment: 'Kreativni almashtiramiz' } } } });
  assert.match((await pm.json(`/api/report/preview?date=${d}`)).text, /💡 Kreativni almashtiramiz/);
  assert.equal(latestSentDate(), d);
  addDirectorReply(d, 'Yangi video qiling');
  const rep = addDirectorReply(d, 'ROP bilan ertaga uchrashamiz');
  assert.equal(rep.status, 'reviewed');
  assert.equal(rep.director_comment, 'Yangi video qiling\nROP bilan ertaga uchrashamiz');
  const next = await pm.json(`/api/report?date=${addDays(d, 1)}`);
  assert.equal(next.prevReply.text, rep.director_comment);
});
