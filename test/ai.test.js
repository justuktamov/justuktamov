import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'AI_EFFORT', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'APP_URL']) delete process.env[k];

// AI provayderlari o'rniga: so'rovlar yoziladi, javob testdan beriladi
const realFetch = globalThis.fetch;
const calls = [];
let reply = null; // (call) => Response
globalThis.fetch = async (url, init = {}) => {
  const u = typeof url === 'string' ? url : url.url;
  if (u.startsWith('https://openrouter.ai/') || u.startsWith('https://api.deepseek.com/') || u.startsWith('https://api.anthropic.com/') || u.startsWith('https://ai.example.com/')) {
    const call = { url: u, headers: new Headers(init.headers), body: JSON.parse(init.body) };
    calls.push(call);
    return reply(call);
  }
  return realFetch(url, init);
};
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const chatOk = (content) => () => json(200, { id: 'x', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] });

const { today } = await import('../src/db.js');
const { createUser } = await import('../src/auth.js');
const { addDays } = await import('../src/metrics.js');
const { aiConfig } = await import('../src/ai/index.js');
const { buildAiInput } = await import('../src/ai/prompt.js');
const { createApp } = await import('../src/server.js');

let server, base, pm, viz, star;
const d = addDays(today(), -1);
before(async () => {
  createUser({ name: 'Dilshod', login: 'pm', password: 'secret123' });
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: 'pm', password: 'secret123' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  pm = (path, opts = {}) => fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers: { cookie, ...(opts.body ? { 'content-type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  pm.json = async (path, opts) => (await pm(path, opts)).json();
  viz = await pm.json('/api/projects', { method: 'POST', body: { name: 'VIZART' } });
  star = await pm.json('/api/projects', { method: 'POST', body: { name: 'STARPAY', kind: 'auto' } });
  // Faqat VIZART raqamlari kiritilgan; STARPAY — bo'sh (AI ga yuborilmaydi)
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: viz.id, date: d, values: { spend: 50, clicks: 400, leads: 20, qualified: 8, unqualified: 12, sales: 2, revenue: 3000000, note_sales: 'Javob bermayapti' } } });
});
after(() => server.close());
beforeEach(() => {
  calls.length = 0;
  for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'AI_EFFORT', 'APP_URL']) delete process.env[k];
});

const vizResult = () => JSON.stringify({
  projects: [
    { id: viz.id, tahlil: 'Lid narxi odatdagidan  qimmat,\n sifatsiz lid ko\'p.', takliflar: ['Targetolog: auditoriyani toraytirsin', '- Sotuv bo\'limi: javob bermaganlarga qayta qo\'ng\'iroq'] },
    { id: 9999, tahlil: "Mavjud bo'lmagan loyiha", takliflar: [] },
  ],
  xulosa: "Kun o'rtacha: VIZART da lid sifati past.",
  ertaga: 'Yangi auditoriya bilan test.',
});

test("AI ulanmagan: tugma o'chiq, so'rov 503", async () => {
  const b = await pm.json(`/api/report?date=${d}`);
  assert.equal(b.aiStatus.enabled, false);
  assert.match(b.aiStatus.reason, /AI_API_KEY/);
  const r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 503);
  assert.equal(calls.length, 0);
});

test('provayder sozlamasi .env dan: standart OpenRouter (DeepSeek), model va manzil almashtiriladi', () => {
  assert.deepEqual(
    (({ enabled, provider, model, baseUrl }) => ({ enabled, provider, model, baseUrl }))(aiConfig({ AI_API_KEY: 'k' })),
    { enabled: true, provider: 'openrouter', model: 'deepseek/deepseek-v4-pro', baseUrl: 'https://openrouter.ai/api/v1' },
  );
  assert.equal(aiConfig({ AI_API_KEY: 'k', AI_MODEL: 'deepseek/deepseek-v4-flash' }).model, 'deepseek/deepseek-v4-flash');
  assert.deepEqual(
    (({ provider, model, baseUrl }) => ({ provider, model, baseUrl }))(aiConfig({ AI_PROVIDER: 'deepseek', AI_API_KEY: 'k' })),
    { provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
  );
  assert.equal(aiConfig({ AI_PROVIDER: 'Anthropic', AI_API_KEY: 'k' }).model, 'claude-opus-5-5');
  assert.equal(aiConfig({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }).enabled, true, 'SDK kaliti ham bo\'ladi');
  assert.equal(aiConfig({ AI_PROVIDER: 'openai', AI_API_KEY: 'k' }).enabled, false, 'openai — model majburiy');
  assert.equal(aiConfig({ AI_PROVIDER: 'openai', AI_API_KEY: 'k', AI_MODEL: 'm', AI_BASE_URL: 'https://ai.example.com/v1' }).baseUrl, 'https://ai.example.com/v1');
  assert.match(aiConfig({ AI_PROVIDER: 'gemini', AI_API_KEY: 'k' }).reason, /Noma'lum AI_PROVIDER/);
});

test("OpenRouter (standart): tahlil saqlanadi, PM tuzatib saqlaydi, xabarda chiqadi; raqam o'zgarsa — eskirgan", async () => {
  process.env.AI_API_KEY = 'test-key';
  process.env.APP_URL = 'https://crm.example.uz';
  reply = chatOk(vizResult());
  const ai = await pm.json('/api/report/ai', { method: 'POST', body: { date: d } });

  // So'rov: OpenRouter manzili, kalit, DeepSeek modeli, JSON rejimi; faqat JSON ni qo'llaydigan provayder; faqat raqami bor loyiha
  assert.equal(calls.length, 1);
  const c = calls[0];
  assert.equal(c.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(c.headers.get('authorization'), 'Bearer test-key');
  assert.equal(c.headers.get('x-openrouter-title'), 'Loyihalar analitikasi');
  assert.equal(c.headers.get('http-referer'), 'https://crm.example.uz');
  assert.equal(c.body.model, 'deepseek/deepseek-v4-pro');
  assert.deepEqual(c.body.response_format, { type: 'json_object' });
  assert.deepEqual(c.body.provider, { require_parameters: true });
  assert.deepEqual(c.body.reasoning, { exclude: true });
  assert.equal(c.body.reasoning_effort, undefined);
  assert.match(c.body.messages[0].content, /JSON/);
  assert.match(c.body.messages[0].content, /o'zbek tilida/);
  const input = JSON.parse(c.body.messages[1].content.replace(/^[^\n]*\n/, ''));
  assert.deepEqual(input.projects.map((p) => p.nomi), ['VIZART']);
  assert.equal(input.projects[0].kecha.lid, 20);
  assert.equal(input.projects[0].kecha.potensial_lid, undefined, 'kiritilmagan maydon yuborilmaydi');
  assert.ok(input.projects[0].tizim_topgan_muammolar.some((t) => /sifatsiz/.test(t)), 'tizim topgan muammolar beriladi');

  // Natija: faqat mavjud loyiha, matn tozalangan
  assert.equal(ai.provider, 'openrouter');
  assert.equal(ai.model, 'deepseek/deepseek-v4-pro');
  assert.equal(ai.stale, false);
  assert.deepEqual(Object.keys(ai.texts), [String(viz.id)]);
  assert.equal(ai.texts[viz.id], "🔎 Lid narxi odatdagidan qimmat, sifatsiz lid ko'p.\n• Targetolog: auditoriyani toraytirsin\n• Sotuv bo'limi: javob bermaganlarga qayta qo'ng'iroq");
  assert.equal(ai.xulosa, "Kun o'rtacha: VIZART da lid sifati past.");

  let b = await pm.json(`/api/report?date=${d}`);
  assert.equal(b.aiStatus.label, 'OpenRouter');
  assert.equal(b.ai.texts[viz.id], ai.texts[viz.id]);
  assert.equal(b.report.author_id, null, "AI natijasi — PM saqlamaguncha qabul qilinmagan");
  // Saqlanmagan AI matni direktor xabarida yo'q
  assert.doesNotMatch((await pm.json(`/api/report/preview?date=${d}`)).text, /🔎/);

  // PM o'qib, tuzatib saqlaydi → xabarda: 🔎 tahlil, 💡 takliflar
  const edited = ai.texts[viz.id].replace('toraytirsin', 'toraytirsin (yosh 20–35)');
  await pm.json('/api/report', { method: 'PUT', body: { date: d, project_notes: { [viz.id]: { comment: edited } } } });
  const text = (await pm.json(`/api/report/preview?date=${d}`)).text;
  assert.match(text, /\n {3}🔎 Lid narxi odatdagidan qimmat/);
  assert.match(text, /💡 Targetolog: auditoriyani toraytirsin \(yosh 20–35\)/);
  assert.doesNotMatch(text, /💡 🔎/);

  // Raqam tuzatildi → AI tahlil eskirgan
  await pm.json('/api/daily', { method: 'PUT', body: { project_id: viz.id, date: d, values: { sales: 3 } } });
  b = await pm.json(`/api/report?date=${d}`);
  assert.equal(b.ai.stale, true);
});

test("bo'sh yoki buzilgan javob — bir marta qayta so'raladi; kalit xato — qayta so'ralmaydi", async () => {
  process.env.AI_API_KEY = 'test-key';
  const before = (await pm.json(`/api/report?date=${d}`)).ai;
  // 1) bo'sh javob → qayta → muvaffaqiyat
  let n = 0;
  reply = () => (n++ === 0 ? chatOk('')() : chatOk(vizResult())());
  let r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2);
  // 2) ikki marta JSON emas → 502, saqlangan natija o'zgarmaydi
  calls.length = 0;
  const saved = (await pm.json(`/api/report?date=${d}`)).ai;
  reply = chatOk('Kechirasiz, tahlil qila olmayman');
  r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /JSON emas/);
  assert.equal(calls.length, 2);
  assert.deepEqual((await pm.json(`/api/report?date=${d}`)).ai, saved);
  // 3) noto'g'ri kalit → bir marta, aniq xabar
  calls.length = 0;
  reply = () => json(401, { error: { message: 'Authentication Fails', type: 'authentication_error' } });
  r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /kaliti noto'g'ri/);
  assert.equal(calls.length, 1);
  assert.ok(before === null || typeof before === 'object');
});

test("DeepSeek ning o'z API si va fikrlash darajasi: har provayderga o'z formatida", async () => {
  process.env.AI_PROVIDER = 'deepseek';
  process.env.AI_API_KEY = 'ds-key';
  process.env.AI_EFFORT = 'high';
  reply = chatOk(vizResult());
  let r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 200);
  let c = calls.at(-1);
  assert.equal(c.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(c.body.model, 'deepseek-v4-pro');
  assert.equal(c.body.reasoning_effort, 'high');
  assert.equal(c.body.provider, undefined, 'OpenRouter maydonlari DeepSeek ga yuborilmaydi');
  assert.equal(c.headers.get('x-openrouter-title'), null);
  // OpenRouter da xuddi shu daraja — reasoning.effort orqali
  process.env.AI_PROVIDER = 'openrouter';
  r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 200);
  c = calls.at(-1);
  assert.deepEqual(c.body.reasoning, { exclude: true, effort: 'high' });
  assert.equal(c.body.reasoning_effort, undefined);
});

test("OpenRouter xatolari: 200 ichidagi xato — qayta so'raladi; mablag' tugasa — aniq xabar", async () => {
  process.env.AI_API_KEY = 'test-key';
  reply = () => json(200, { id: 'x', error: { code: 502, message: 'Upstream provider error' }, choices: [] });
  let r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /Upstream provider error/);
  assert.equal(calls.length, 2, 'bir marta qayta urinildi');
  calls.length = 0;
  reply = () => json(402, { error: { code: 402, message: 'Insufficient credits' } });
  r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /mablag' tugagan/);
  assert.equal(calls.length, 1);
});

test('Claude (anthropic): rasmiy SDK so\'rovi — model, JSON sxema, zaxira model; rad etsa — xato', async () => {
  process.env.AI_PROVIDER = 'anthropic';
  process.env.AI_API_KEY = 'sk-ant-test';
  const msg = (stop_reason, text) => json(200, {
    id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason, stop_sequence: null,
    content: text ? [{ type: 'text', text }] : [], usage: { input_tokens: 100, output_tokens: 50 },
  });
  reply = () => msg('end_turn', vizResult());
  const ai = await pm.json('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(ai.provider, 'anthropic');
  assert.equal(ai.model, 'claude-opus-5-5');
  const c = calls[0];
  assert.match(c.url, /^https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.equal(c.headers.get('x-api-key'), 'sk-ant-test');
  assert.match(c.headers.get('anthropic-beta'), /server-side-fallback-2026-07-01/);
  assert.equal(c.body.model, 'claude-opus-5-5');
  assert.equal(c.body.fallbacks, 'default');
  assert.equal(c.body.output_config.format.type, 'json_schema');
  assert.equal(c.body.output_config.effort, 'high');
  assert.match(c.body.system, /JSON/);
  assert.match(c.body.messages[0].content, /VIZART/);

  reply = () => msg('refusal', '');
  const r = await pm('/api/report/ai', { method: 'POST', body: { date: d } });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /bosh tortdi/);
});

test("cheklovlar: kelajak sana, raqamsiz kun", async () => {
  process.env.AI_API_KEY = 'test-key';
  reply = chatOk(vizResult());
  let r = await pm('/api/report/ai', { method: 'POST', body: { date: addDays(today(), 1) } });
  assert.equal(r.status, 400);
  r = await pm('/api/report/ai', { method: 'POST', body: { date: addDays(d, -30) } });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /raqamlarni kiriting/);
  assert.equal(calls.length, 0, 'pullik so\'rov yuborilmadi');
  // Bo'sh loyiha (STARPAY) kiritilgunicha AI ga bormaydi
  const input = buildAiInput((await pm.json(`/api/report?date=${d}`)));
  assert.ok(!input.projects.some((p) => p.id === star.id));
});
