// HTTP server: API + statik fayllar + rejalashtiruvchi (eslatma, avto-hisobot)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, getSetting, setSetting, today, splitIds, normalizeIds, FIELDS, TEXT_FIELDS, PLAN_FIELDS, PROJECT_KINDS, REASONS, REASON_KINDS, CHANNELS, CHANNEL_FIELDS } from './db.js';
import { reportBundle, saveDraft, submitReport, listReports, reportText, getReport, saveAiAnalysis } from './reports.js';
import { aiStatus, analyze, AiError } from './ai/index.js';
import { buildAiInput, hashInput } from './ai/prompt.js';
import { login, logout, userFromToken, changePassword, ensureUser, publicUser } from './auth.js';
import { summary, loadRows, loadReasons, loadChannels, addDays, toCsv, monthBounds, sumRows, planProgress, monthly, estimateLag, parseRate } from './metrics.js';
import { startPolling, telegramStatus, sendMessage } from './telegram.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);

const MIME = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const STATIC = { '/vendor/chart.js': join(ROOT, 'node_modules/chart.js/dist/chart.umd.min.js') };

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isMonth = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'content-type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', ...headers });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1e6) throw new HttpError(413, "So'rov juda katta");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, "Noto'g'ri JSON"); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, "Noto'g'ri JSON");
  return body;
}

// So'rovdagi loyiha ID si — musbat butun son (aks holda SQLite 500 beradi)
function idOf(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError(404, 'Loyiha topilmadi');
  return n;
}

// Rang — faqat #rrggbb (style atributiga tushadi, boshqa CSS kiritib bo'lmasin)
function checkColor(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new HttpError(400, "Rang noto'g'ri (#rrggbb)");
  return v.toLowerCase();
}

// Content-Type ning asosiy qismi: «text/plain; application/json» — JSON emas
const isJson = (req) => String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() === 'application/json';

function sid(req) {
  const c = (req.headers.cookie || '').split(';').map((x) => x.trim()).find((x) => x.startsWith('sid='));
  return c ? c.slice(4) : null;
}

function requireUser(req) {
  if (!req.user) throw new HttpError(401, 'Tizimga kiring');
  return req.user;
}

function period(q) {
  const to = isDate(q.get('to')) ? q.get('to') : today();
  const from = isDate(q.get('from')) ? q.get('from') : addDays(to, -6);
  if (from > to) throw new HttpError(400, "Sana oralig'i noto'g'ri");
  return { from, to };
}

function num(v) {
  if (v === '' || v == null) return null;
  const x = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(x) || x < 0) throw new HttpError(400, `Noto'g'ri son: ${v}`);
  return x;
}

const routes = [];
const route = (method, path, fn) => routes.push({ method, re: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

// ---- Holat (Coolify / Docker health check): kirishsiz, bazani tekshiradi ----
route('GET', '/api/health', async (req, res) => {
  getDb().prepare('SELECT 1').get();
  send(res, 200, { ok: true });
});

// ---- Kirish va profil ----
route('POST', '/api/login', async (req, res) => {
  const { login: l, password } = await readBody(req);
  const r = login(l, password);
  if (!r) throw new HttpError(401, "Login yoki parol noto'g'ri");
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  send(res, 200, { user: r.user }, { 'set-cookie': `sid=${r.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` });
});
route('POST', '/api/logout', async (req, res) => {
  logout(sid(req));
  send(res, 200, { ok: true }, { 'set-cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' });
});
route('GET', '/api/me', async (req, res) => {
  const user = requireUser(req);
  const tg = telegramStatus();
  send(res, 200, {
    user, today: today(), reportDay: addDays(today(), -1), planFields: PLAN_FIELDS, kinds: PROJECT_KINDS, reasons: REASONS, reasonKinds: REASON_KINDS, channels: CHANNELS, channelFields: CHANNEL_FIELDS,
    reportStatus: getDb().prepare('SELECT status FROM daily_reports WHERE date = ?').get(addDays(today(), -1))?.status || null,
    telegram: { enabled: tg.enabled, bot: tg.bot, reportChat: Boolean(getSetting('report_chat_id')) },
  });
});
route('PUT', '/api/me', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  const name = b.name === undefined ? user.name : String(b.name).trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'Ismni kiriting');
  let tgId = user.telegram_id;
  try { if (b.telegram_id !== undefined) tgId = normalizeIds(b.telegram_id); } catch (e) { throw new HttpError(400, e.message); }
  getDb().prepare('UPDATE users SET name = ?, telegram_id = ? WHERE id = ?').run(name, tgId, user.id);
  send(res, 200, publicUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(user.id)));
});
route('PUT', '/api/me/password', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  const next = String(b.new ?? '');
  if (next.length < 6) throw new HttpError(400, "Yangi parol kamida 6 belgi bo'lsin");
  if (!changePassword(user.id, String(b.old ?? ''), next, sid(req))) throw new HttpError(400, "Joriy parol noto'g'ri");
  send(res, 200, { ok: true });
});

// ---- Loyihalar ----
// Loyihalar tartibi (doskada sudrab almashtiriladi) — hamma ro'yxatlarda shu tartib
route('PUT', '/api/projects/order', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!Array.isArray(b.ids) || !b.ids.length) throw new HttpError(400, "Tartib noto'g'ri");
  const db = getDb();
  const ids = b.ids.map(Number);
  const known = new Set(db.prepare('SELECT id FROM projects').all().map((x) => x.id));
  if (ids.some((x) => !known.has(x)) || new Set(ids).size !== ids.length) throw new HttpError(400, "Tartib noto'g'ri");
  db.exec('BEGIN');
  try {
    ids.forEach((id, i) => db.prepare('UPDATE projects SET sort_order = ? WHERE id = ?').run(i + 1, id));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  send(res, 200, { ok: true });
});
const getProject = (id) => getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
function checkName(name, exceptId = null) {
  const n = String(name || '').trim().slice(0, 60);
  if (!n) throw new HttpError(400, 'Loyiha nomini kiriting');
  const dup = getDb().prepare('SELECT id FROM projects WHERE lower(name) = lower(?)').get(n);
  if (dup && dup.id !== Number(exceptId)) throw new HttpError(409, `«${n}» loyihasi allaqachon bor`);
  return n;
}
route('GET', '/api/projects', async (req, res) => {
  requireUser(req);
  // channels — JSON ro'yxat; lag_hint — ma'lumotdan taxmin qilingan lid → sotuv kechikishi (kun)
  send(res, 200, getDb().prepare('SELECT * FROM projects ORDER BY active DESC, COALESCE(sort_order, id), id').all().map(projectOut));
});
const projectOut = (p) => {
  let channels = [];
  try { channels = JSON.parse(p.channels || '[]'); } catch { channels = []; }
  return { ...p, channels, lag_hint: p.active && p.kind !== 'auto' ? estimateLag(p.id) : null };
};
// Moliya sozlamalari: tannarx — tushumdan % (Stars xaridi, ROP bonusi, to'lov komissiyasi), doimiy — oyiga so'm (ish haqi, ijara)
function projectMoney(b, p = {}) {
  const kind = b.kind === undefined ? (p.kind || 'leads') : b.kind;
  if (!PROJECT_KINDS[kind]) throw new HttpError(400, "Loyiha turi noto'g'ri");
  const varPct = b.var_cost_pct === undefined ? p.var_cost_pct ?? null : num(b.var_cost_pct);
  if (varPct != null && varPct > 100) throw new HttpError(400, "Tannarx 100% dan oshmaydi");
  const fixed = b.fixed_monthly === undefined ? p.fixed_monthly ?? null : num(b.fixed_monthly);
  let channels = p.channels ?? null;
  if (b.channels !== undefined) {
    if (!Array.isArray(b.channels) || b.channels.some((c) => !CHANNELS[c])) throw new HttpError(400, "Kanal noto'g'ri");
    channels = JSON.stringify([...new Set(b.channels)]);
  }
  const lag = b.sale_lag === undefined ? p.sale_lag ?? null : num(b.sale_lag);
  if (lag != null && lag > 60) throw new HttpError(400, "Kechikish 60 kundan oshmaydi");
  return { kind, varPct, fixed, channels, lag };
}
route('POST', '/api/projects', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  const m = projectMoney(b);
  const info = getDb().prepare('INSERT INTO projects (name, color, kind, var_cost_pct, fixed_monthly, channels, sale_lag) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(checkName(b.name), checkColor(b.color), m.kind, m.varPct, m.fixed, m.channels, m.lag);
  send(res, 201, projectOut(getProject(info.lastInsertRowid)));
});
route('PUT', '/api/projects/:id', async (req, res, { id }) => {
  requireUser(req);
  const b = await readBody(req);
  const p = getProject(idOf(id));
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  const m = projectMoney(b, p);
  getDb().prepare('UPDATE projects SET name = ?, color = ?, kind = ?, var_cost_pct = ?, fixed_monthly = ?, channels = ?, sale_lag = ?, active = ? WHERE id = ?')
    .run(b.name === undefined ? p.name : checkName(b.name, p.id), b.color == null ? p.color : checkColor(b.color), m.kind, m.varPct, m.fixed, m.channels, m.lag, b.active === undefined ? p.active : (b.active ? 1 : 0), p.id);
  send(res, 200, projectOut(getProject(p.id)));
});

// ---- Kunlik raqamlar ----
route('GET', '/api/daily', async (req, res, _p, q) => {
  requireUser(req);
  const date = isDate(q.get('date')) ? q.get('date') : today();
  const { projects, rows } = loadRows(date, date);
  const { rows: prevRows } = loadRows(addDays(date, -1), addDays(date, -1));
  const reasons = loadReasons(date, date);
  const ch = loadChannels(date, date);
  send(res, 200, {
    date,
    projects: projects.map((p) => ({
      id: p.id, name: p.name, color: p.color, kind: p.kind || 'leads',
      channels: projectOut(p).channels,
      channelRows: Object.fromEntries(ch.filter((r) => r.project_id === p.id).map((r) => [r.channel, r])),
      row: rows.find((r) => r.project_id === p.id) || {},
      prev: prevRows.find((r) => r.project_id === p.id) || {},
      reasons: reasons[p.id] || { bad: {}, lost: {} },
    })),
  });
});
route('PUT', '/api/daily', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!isDate(b.date)) throw new HttpError(400, "Sana noto'g'ri");
  if (b.date > today()) throw new HttpError(400, "Kelajak sanasiga kiritib bo'lmaydi");
  const p = getDb().prepare('SELECT * FROM projects WHERE id = ? AND active = 1').get(idOf(b.project_id));
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  const db = getDb();
  const old = db.prepare('SELECT * FROM daily WHERE project_id = ? AND date = ?').get(p.id, b.date) || {};
  const changes = [];
  for (const [field, raw] of Object.entries(b.values || {})) {
    if (!FIELDS[field] && !TEXT_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
    const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim().slice(0, 500) || null);
    if ((old[field] ?? null) !== v) changes.push([field, v]);
  }
  // Sabablar: { bad: {no_pickup: 5}, lost: {expensive: 3} } — bo'sh qiymat o'chiradi
  const reasons = [];
  for (const [kind, map] of Object.entries(b.reasons || {})) {
    if (!REASONS[kind]) throw new HttpError(400, `Noma'lum sabab turi: ${kind}`);
    for (const [reason, raw] of Object.entries(map || {})) {
      if (!REASONS[kind][reason]) throw new HttpError(400, `Noma'lum sabab: ${reason}`);
      reasons.push([kind, reason, num(raw)]);
    }
  }
  // Kanallar: { instagram: {spend: 20, leads: 30}, ... }
  const chans = [];
  for (const [channel, map] of Object.entries(b.channels || {})) {
    if (!CHANNELS[channel]) throw new HttpError(400, `Noma'lum kanal: ${channel}`);
    const v = {};
    for (const [f, raw] of Object.entries(map || {})) {
      if (!CHANNEL_FIELDS[f]) throw new HttpError(400, `Noma'lum kanal maydoni: ${f}`);
      v[f] = num(raw);
    }
    chans.push([channel, v]);
  }
  db.exec('BEGIN');
  try {
    for (const [channel, v] of chans) {
      const cur = db.prepare('SELECT * FROM channel_daily WHERE project_id = ? AND date = ? AND channel = ?').get(p.id, b.date, channel) || {};
      const row = Object.fromEntries(Object.keys(CHANNEL_FIELDS).map((f) => [f, f in v ? v[f] : cur[f] ?? null]));
      if (Object.values(row).every((x) => x == null)) db.prepare('DELETE FROM channel_daily WHERE project_id = ? AND date = ? AND channel = ?').run(p.id, b.date, channel);
      else db.prepare(`INSERT INTO channel_daily (project_id, date, channel, spend, clicks, leads, qualified, sales, revenue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET spend = excluded.spend, clicks = excluded.clicks, leads = excluded.leads, qualified = excluded.qualified, sales = excluded.sales, revenue = excluded.revenue`)
        .run(p.id, b.date, channel, row.spend, row.clicks, row.leads, row.qualified, row.sales, row.revenue);
    }
    db.prepare('INSERT OR IGNORE INTO daily (project_id, date) VALUES (?, ?)').run(p.id, b.date);
    for (const [field, v] of changes) {
      db.prepare(`UPDATE daily SET ${field} = ?, updated_at = datetime('now') WHERE project_id = ? AND date = ?`).run(v, p.id, b.date);
    }
    for (const [kind, reason, c] of reasons) {
      if (!c) db.prepare('DELETE FROM reasons WHERE project_id = ? AND date = ? AND kind = ? AND reason = ?').run(p.id, b.date, kind, reason);
      else db.prepare('INSERT INTO reasons (project_id, date, kind, reason, count) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO UPDATE SET count = excluded.count').run(p.id, b.date, kind, reason, Math.round(c));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  send(res, 200, { ok: true, changed: changes.length + chans.length });
});

// ---- Statistika ----
route('GET', '/api/summary', async (req, res, _p, q) => {
  requireUser(req);
  send(res, 200, summary({ ...period(q), projectId: q.get('project') ? Number(q.get('project')) : null }));
});
// Oylar bo'yicha dinamika: oxirgi N oy (joriy oy — kechagacha, ya'ni oxirgi hisobot kunigacha)
route('GET', '/api/monthly', async (req, res, _p, q) => {
  requireUser(req);
  const unit = ['day', 'week', 'month'].includes(q.get('unit')) ? q.get('unit') : 'month';
  const months = Math.min(Math.max(Number(q.get('months')) || 6, unit === 'day' ? 1 : 2), unit === 'day' ? 62 : 24);
  // to — davr oxiri (bitta haftani ko'rish uchun); kechadan keyin bo'lmaydi
  const yesterday = addDays(today(), -1);
  const asOf = isDate(q.get('to')) && q.get('to') < yesterday ? q.get('to') : yesterday;
  send(res, 200, monthly({ months, projectId: q.get('project') ? Number(q.get('project')) : null, unit, asOf }));
});
route('GET', '/api/export.csv', async (req, res, _p, q) => {
  requireUser(req);
  const { from, to } = period(q);
  const { projects, rows } = loadRows(from, to, q.get('project') ? Number(q.get('project')) : null);
  res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="hisobot_${from}_${to}.csv"` });
  res.end(toCsv(projects, rows));
});

// ---- Oylik reja ----
route('GET', '/api/plans', async (req, res, _p, q) => {
  requireUser(req);
  const month = isMonth(q.get('month')) ? q.get('month') : today().slice(0, 7);
  send(res, 200, { month, rows: getDb().prepare('SELECT * FROM plans WHERE month = ?').all(month), prev: prevMonthFacts(month) });
});
// O'tgan oy fakti — reja kiritishda mo'ljal uchun
function prevMonthFacts(month) {
  const prev = addDays(`${month}-01`, -1).slice(0, 7);
  const { from, to } = monthBounds(prev);
  const { projects, rows } = loadRows(from, to);
  return Object.fromEntries(projects.map((p) => {
    const t = sumRows(rows.filter((r) => r.project_id === p.id));
    return [p.id, { month: prev, budget: t.spend, leads: t.leads, sales: t.sales, revenue: t.revenue, has: t.days > 0 }];
  }));
}
route('PUT', '/api/plans', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!isMonth(b.month)) throw new HttpError(400, "Oy noto'g'ri (YYYY-MM)");
  const p = getProject(idOf(b.project_id));
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  const v = Object.fromEntries(Object.keys(PLAN_FIELDS).map((k) => [k, num(b.values?.[k])]));
  if (Object.values(v).every((x) => x == null)) {
    getDb().prepare('DELETE FROM plans WHERE project_id = ? AND month = ?').run(p.id, b.month);
  } else {
    getDb().prepare(`INSERT INTO plans (project_id, month, budget, leads, sales, revenue) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, month) DO UPDATE SET budget = excluded.budget, leads = excluded.leads, sales = excluded.sales, revenue = excluded.revenue`)
      .run(p.id, b.month, v.budget, v.leads, v.sales, v.revenue);
  }
  send(res, 200, { ok: true });
});

// ---- PM hisoboti ----
route('GET', '/api/report', async (req, res, _p, q) => {
  requireUser(req);
  send(res, 200, { ...reportBundle(isDate(q.get('date')) ? q.get('date') : today()), aiStatus: aiStatus() });
});
// AI tahlil (3-qadam): natija saqlanadi va PM ga ko'rsatiladi; PM o'qib, tuzatib, o'zi saqlaydi.
// Bir kun uchun bir vaqtda bitta so'rov (har chaqiruv pullik)
const aiBusy = new Set();
route('POST', '/api/report/ai', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!isDate(b.date) || b.date > today()) throw new HttpError(400, "Sana noto'g'ri");
  const st = aiStatus();
  if (!st.enabled) throw new HttpError(503, `AI ulanmagan: ${st.reason}`);
  if (getReport(b.date)?.status === 'reviewed') throw new HttpError(409, "Direktor ko'rib chiqqan hisobotni o'zgartirib bo'lmaydi");
  if (aiBusy.has(b.date)) throw new HttpError(429, 'AI tahlil allaqachon ketyapti — kuting');
  const input = buildAiInput(reportBundle(b.date));
  if (!input.projects.length) throw new HttpError(400, 'Avval raqamlarni kiriting — tahlil qiladigan loyiha yo\'q');
  aiBusy.add(b.date);
  try {
    const result = await analyze(input);
    send(res, 200, saveAiAnalysis(b.date, result, hashInput(input)));
  } catch (e) {
    if (e instanceof AiError) {
      console.error('AI:', e.message);
      throw new HttpError(502, e.message);
    }
    throw e;
  } finally {
    aiBusy.delete(b.date);
  }
});
route('PUT', '/api/report', async (req, res) => {
  const u = requireUser(req);
  const b = await readBody(req);
  if (!isDate(b.date) || b.date > today()) throw new HttpError(400, "Sana noto'g'ri");
  send(res, 200, saveDraft(b.date, u.id, b));
});
route('POST', '/api/report/submit', async (req, res) => {
  const u = requireUser(req);
  const b = await readBody(req);
  if (!isDate(b.date) || b.date > today()) throw new HttpError(400, "Sana noto'g'ri");
  if (b.summary !== undefined || b.project_notes !== undefined) saveDraft(b.date, u.id, b);
  const r = submitReport(b.date, u.id);
  const chats = splitIds(getSetting('report_chat_id'));
  const text = reportText(b.date);
  for (const c of chats) sendMessage(c, text).catch((e) => console.error('Telegram:', e.message));
  send(res, 200, { ...r, notified: Boolean(chats.length && telegramStatus().enabled) });
});
// Direktor Telegramda nimani ko'rishi — yuborishdan oldin
route('GET', '/api/report/preview', async (req, res, _p, q) => {
  requireUser(req);
  send(res, 200, { text: reportText(isDate(q.get('date')) ? q.get('date') : today()) });
});
route('GET', '/api/reports', async (req, res, _p, q) => {
  requireUser(req);
  send(res, 200, listReports(Math.min(Number(q.get('limit')) || 30, 120)));
});

// ---- Sozlamalar ----
const SETTING_KEYS = ['usd_rate', 'report_chat_id', 'report_time', 'reminder_time'];
route('GET', '/api/settings', async (req, res) => {
  requireUser(req);
  send(res, 200, { ...Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k)])), telegram: telegramStatus(), ai: aiStatus() });
});
route('PUT', '/api/settings', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  // Kurs raqam sifatida saqlanadi: «12 800» yoki «12,800» yozilsa ham hisobda aynan shu kurs ishlatiladi
  if (b.usd_rate !== undefined && b.usd_rate !== '' && b.usd_rate !== null) {
    const rate = parseRate(b.usd_rate);
    if (rate == null) throw new HttpError(400, "Dollar kursi noto'g'ri (masalan: 12800)");
    b.usd_rate = String(rate);
  }
  if (b.report_chat_id !== undefined) {
    try { b.report_chat_id = normalizeIds(b.report_chat_id) ?? ''; } catch (e) { throw new HttpError(400, e.message); }
  }
  for (const k of ['report_time', 'reminder_time']) if (b[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b[k]))) throw new HttpError(400, "Vaqt noto'g'ri (SS:DD)");
  for (const k of SETTING_KEYS) if (k in b) setSetting(k, b[k] === '' || b[k] == null ? null : String(b[k]).trim());
  send(res, 200, { ok: true });
});

async function serveStatic(req, res, pathname) {
  let file = STATIC[pathname];
  if (!file) {
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    file = join(PUBLIC, safe === '/' ? 'index.html' : safe);
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch {
    // SPA: noma'lum yo'llar index.html ga
    const data = await readFile(join(PUBLIC, 'index.html'));
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(data);
  }
}

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) {
        req.user = userFromToken(sid(req));
        // CSRF himoyasi: o'zgartiruvchi so'rovlar faqat JSON bilan
        if (req.method !== 'GET' && !isJson(req)) {
          throw new HttpError(415, 'Content-Type: application/json kerak');
        }
        for (const r of routes) {
          const m = r.method === req.method && url.pathname.match(r.re);
          if (m) return await r.fn(req, res, m.groups || {}, url.searchParams);
        }
        throw new HttpError(404, 'Topilmadi');
      }
      if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
      return await serveStatic(req, res, url.pathname);
    } catch (e) {
      if (!e.status) console.error(e);
      const status = e.status || 500;
      send(res, status, { error: status === 500 ? 'Server xatosi' : e.message });
    }
  });
}

export async function sendPlanAlerts(d = today()) {
  const month = d.slice(0, 7);
  const key = `plan_alerts_${month}`;
  let sent = [];
  try { sent = JSON.parse(getSetting(key, '[]')); } catch { sent = []; }
  const fresh = [];
  for (const item of planProgress(month, null, d).items) {
    for (const a of item.alerts.filter((x) => x.level === 'critical')) {
      const id = `${item.project_id}:${a.metric}`;
      if (!sent.includes(id)) fresh.push({ id, item, a });
    }
  }
  if (!fresh.length) return [];
  const esc = (x) => String(x).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const text = ['<b>📅 Oylik reja — ogohlantirish</b>', ...fresh.map(({ item, a }) => `\n<b>${esc(item.name)}</b>\n⚠️ ${esc(a.text)}\n💡 ${esc(a.fix)}`)].join('\n');
  const chats = new Set([...splitIds(getSetting('report_chat_id')), ...getDb().prepare('SELECT telegram_id FROM users WHERE active = 1 AND telegram_id IS NOT NULL').all().flatMap((x) => splitIds(x.telegram_id))].filter(Boolean));
  // Avval yuboriladi, keyin «yuborildi» deb belgilanadi: hech kimga yetmasa — keyingi urinishda qayta yuboriladi
  let delivered = 0;
  let lastError = null;
  for (const c of chats) {
    try { await sendMessage(c, text); delivered += 1; } catch (e) { lastError = e; }
  }
  if (chats.size && !delivered) throw lastError;
  setSetting(key, JSON.stringify([...sent, ...fresh.map((x) => x.id)]));
  return fresh.map(({ item, a }) => ({ item, a }));
}

// Kuniga bir marta bajariladigan ish. Belgilangan vaqtdan keyingi birinchi tekshiruvda ishga tushadi
// (server aynan o'sha daqiqada o'chiq bo'lsa ham o'tkazib yuborilmaydi). Muvaffaqiyatli bo'lsagina «bajarildi»;
// xato bo'lsa — 10 daqiqadan keyin qayta, kuniga ko'pi bilan 5 marta.
const busy = new Set();
export async function runDaily(key, d, fn, now = Date.now()) {
  if (busy.has(key) || getSetting(key) === d) return false;
  let t = {};
  try { t = JSON.parse(getSetting(`${key}_try`, '{}')); } catch { t = {}; }
  if (t.d !== d) t = { d, n: 0, at: 0 };
  if (t.n >= 5 || now - t.at < 10 * 60e3) return false;
  busy.add(key);
  try {
    await fn();
    setSetting(key, d);
    return true;
  } catch (e) {
    setSetting(`${key}_try`, JSON.stringify({ d, n: t.n + 1, at: now }));
    throw e;
  } finally {
    busy.delete(key);
  }
}

// Rejalashtiruvchi (Toshkent vaqti): PM ga eslatma; PM yubormasa — direktorga avtomatik hisobot
function startScheduler() {
  const tz = process.env.TZ_NAME || 'Asia/Tashkent';
  setInterval(async () => {
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    const d = addDays(today(), -1); // hisobot kechagi kun uchun
    const sent = () => ['submitted', 'reviewed'].includes(getDb().prepare('SELECT status FROM daily_reports WHERE date = ?').get(d)?.status);
    const jobs = [
      ['last_reminder', getSetting('reminder_time', '11:00'), async () => {
        if (sent()) return;
        const pms = getDb().prepare('SELECT telegram_id FROM users WHERE active = 1 AND telegram_id IS NOT NULL').all();
        for (const id of new Set(pms.flatMap((x) => splitIds(x.telegram_id)))) await sendMessage(id, "⏰ Kechagi hisobot hali yuborilmagan. Ilovada «Kechagi hisobot» bo'limini oching — 4 qadam.");
      }],
      // Oylik reja: loyiha rejadan jiddiy orqada qolsa — bir marta xabar (har ko'rsatkich uchun oyiga bir marta)
      ['last_plan_check', getSetting('reminder_time', '11:00'), () => sendPlanAlerts(d)],
      ['last_report', getSetting('report_time', '13:00'), async () => {
        if (sent()) return;
        for (const chat of splitIds(getSetting('report_chat_id'))) await sendMessage(chat, `⚠️ <i>PM hisobotni yubormadi — avtomatik hisobot</i>\n\n${reportText(d)}`);
      }],
    ];
    for (const [key, at, fn] of jobs) {
      if (!at || hm < at) continue; // vaqt bo'sh — o'chirilgan
      try { await runDaily(key, d, fn); } catch (e) { console.error(`Scheduler (${key}):`, e.message); }
    }
  }, 30_000).unref();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  getDb();
  const first = ensureUser();
  if (first) console.log(`\nBirinchi ishga tushirish. Login "${first.login}", parol "${first.password}" — kirgach parolni o'zgartiring.\n`);
  createApp().listen(PORT, () => console.log(`Analitika: http://localhost:${PORT}`));
  startPolling();
  startScheduler();
}
