// Zaxira nusxa Telegram orqali: Sozlamalarda tanlangan ID larga, kirish sessiyalarisiz, gzip
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const dir = mkdtempSync(join(tmpdir(), 'analytika-tg-backup-'));
process.env.DB_PATH = ':memory:';
process.env.BACKUP_DIR = dir;
process.env.TELEGRAM_BOT_TOKEN = 'test-token';

// Telegram API o'rniga: yuborilgan fayllar shu ro'yxatga; failIds — bu ID larga yetmaydi (botga /start yozmagan)
const realFetch = globalThis.fetch;
const docs = [];
const failIds = new Set();
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('/sendDocument')) {
    const f = opts.body;
    const id = f.get('chat_id');
    if (failIds.has(id)) return new Response(JSON.stringify({ ok: false, description: 'Bad Request: chat not found' }));
    docs.push({ id, name: f.get('document').name, data: Buffer.from(await f.get('document').arrayBuffer()), caption: f.get('caption'), silent: f.get('disable_notification') });
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  return realFetch(url, opts);
};

const { getDb, today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { createApp } = await import('../src/server.js');

let server, base;
before(async () => {
  getDb();
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  getDb().prepare("INSERT INTO projects (name) VALUES ('VIZART')").run();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

async function session() {
  const r = await realFetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password: 'secret123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = (path, opts = {}) => realFetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  call.json = async (path, opts) => (await call(path, opts)).json();
  return call;
}

test("zaxira nusxa Telegramda: tanlangan ID larga, sessiyalarsiz; yetmagan ID ko'rsatiladi", async () => {
  const pm = await session();
  let r = await pm('/api/backup/send', { method: 'POST', body: {} });
  assert.equal(r.status, 400, 'ID kiritilmagan');
  r = await pm('/api/settings', { method: 'PUT', body: { backup_chat_id: 'abc' } });
  assert.equal(r.status, 400, "ID faqat raqam");
  await pm.json('/api/settings', { method: 'PUT', body: { backup_chat_id: '123456789, -1005550001' } });
  assert.equal((await pm.json('/api/settings')).backup_chat_id, '123456789,-1005550001');

  const sent = await pm.json('/api/backup/send', { method: 'POST', body: {} });
  assert.deepEqual(sent, { sent: 2, total: 2, failed: [] });
  assert.deepEqual(docs.map((d) => d.id), ['123456789', '-1005550001']);
  assert.equal(docs[0].name, `analytika-${today()}.db.gz`);
  assert.equal(docs[0].silent, 'true', 'ovozsiz');
  assert.match(docs[0].caption, /Zaxira nusxa/);
  // Fayl ochiladi: ma'lumotlar bor, kirish sessiyalari yo'q
  const file = join(dir, 'restored.db');
  writeFileSync(file, gunzipSync(docs[0].data));
  const copy = new DatabaseSync(file);
  assert.equal(copy.prepare('SELECT name FROM projects').get().name, 'VIZART');
  assert.equal(copy.prepare('SELECT count(*) n FROM users').get().n, 1);
  assert.equal(copy.prepare('SELECT count(*) n FROM sessions').get().n, 0, 'sessiya tokenlari faylga tushmaydi');
  copy.close();
  assert.ok(getDb().prepare('SELECT count(*) n FROM sessions').get().n > 0, 'asosiy bazadagi sessiyalar joyida');

  // Bitta odamga yetmasa — qolganlarga yuboriladi, yetmagani aytiladi; hech kimga yetmasa — xato
  failIds.add('-1005550001');
  const part = await pm.json('/api/backup/send', { method: 'POST', body: {} });
  assert.equal(part.sent, 1);
  assert.equal(part.failed[0].id, '-1005550001');
  failIds.add('123456789');
  r = await pm('/api/backup/send', { method: 'POST', body: {} });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /chat not found/);
});
