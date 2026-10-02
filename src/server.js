// HTTP server: API + statik fayllar + rejalashtiruvchi (eslatma, avto-hisobot)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, getSetting, setSetting, today, FIELDS, TEXT_FIELDS, PLAN_FIELDS } from './db.js';
import { reportBundle, saveDraft, submitReport, listReports, reportText } from './reports.js';
import { login, logout, userFromToken, changePassword, ensureUser, publicUser } from './auth.js';
import { summary, loadRows, addDays, toCsv } from './metrics.js';
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
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, "Noto'g'ri JSON"); }
}

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
    user, today: today(), planFields: PLAN_FIELDS,
    reportStatus: getDb().prepare('SELECT status FROM daily_reports WHERE date = ?').get(today())?.status || null,
    telegram: { enabled: tg.enabled, bot: tg.bot, reportChat: Boolean(getSetting('report_chat_id')) },
  });
});
route('PUT', '/api/me', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  const name = b.name === undefined ? user.name : String(b.name).trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'Ismni kiriting');
  const tgId = b.telegram_id === undefined ? user.telegram_id : (String(b.telegram_id).trim() || null);
  if (tgId && !/^-?\d{4,20}$/.test(tgId)) throw new HttpError(400, "Telegram ID faqat raqam bo'ladi");
  getDb().prepare('UPDATE users SET name = ?, telegram_id = ? WHERE id = ?').run(name, tgId, user.id);
  send(res, 200, publicUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(user.id)));
});
route('PUT', '/api/me/password', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  if (String(b.new || '').length < 6) throw new HttpError(400, "Yangi parol kamida 6 belgi bo'lsin");
  if (!changePassword(user.id, b.old, b.new)) throw new HttpError(400, "Joriy parol noto'g'ri");
  send(res, 200, { ok: true });
});

// ---- Loyihalar ----
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
  send(res, 200, getDb().prepare('SELECT * FROM projects ORDER BY active DESC, id').all());
});
route('POST', '/api/projects', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  const info = getDb().prepare('INSERT INTO projects (name, color) VALUES (?, ?)').run(checkName(b.name), b.color || null);
  send(res, 201, getProject(info.lastInsertRowid));
});
route('PUT', '/api/projects/:id', async (req, res, { id }) => {
  requireUser(req);
  const b = await readBody(req);
  const p = getProject(id);
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  getDb().prepare('UPDATE projects SET name = ?, color = ?, active = ? WHERE id = ?')
    .run(b.name === undefined ? p.name : checkName(b.name, id), b.color ?? p.color, b.active === undefined ? p.active : (b.active ? 1 : 0), id);
  send(res, 200, getProject(id));
});

// ---- Kunlik raqamlar ----
route('GET', '/api/daily', async (req, res, _p, q) => {
  requireUser(req);
  const date = isDate(q.get('date')) ? q.get('date') : today();
  const { projects, rows } = loadRows(date, date);
  const { rows: prevRows } = loadRows(addDays(date, -1), addDays(date, -1));
  send(res, 200, {
    date,
    projects: projects.map((p) => ({
      id: p.id, name: p.name, color: p.color,
      row: rows.find((r) => r.project_id === p.id) || {},
      prev: prevRows.find((r) => r.project_id === p.id) || {},
    })),
  });
});
route('PUT', '/api/daily', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!isDate(b.date)) throw new HttpError(400, "Sana noto'g'ri");
  if (b.date > addDays(today(), 1)) throw new HttpError(400, "Kelajak sanasiga kiritib bo'lmaydi");
  const p = getDb().prepare('SELECT * FROM projects WHERE id = ? AND active = 1').get(b.project_id);
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  const db = getDb();
  const old = db.prepare('SELECT * FROM daily WHERE project_id = ? AND date = ?').get(p.id, b.date) || {};
  const changes = [];
  for (const [field, raw] of Object.entries(b.values || {})) {
    if (!FIELDS[field] && !TEXT_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
    const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim().slice(0, 500) || null);
    if ((old[field] ?? null) !== v) changes.push([field, v]);
  }
  db.prepare('INSERT OR IGNORE INTO daily (project_id, date) VALUES (?, ?)').run(p.id, b.date);
  for (const [field, v] of changes) {
    db.prepare(`UPDATE daily SET ${field} = ?, updated_at = datetime('now') WHERE project_id = ? AND date = ?`).run(v, p.id, b.date);
  }
  send(res, 200, { ok: true, changed: changes.length });
});

// ---- Statistika ----
route('GET', '/api/summary', async (req, res, _p, q) => {
  requireUser(req);
  send(res, 200, summary({ ...period(q), projectId: q.get('project') ? Number(q.get('project')) : null }));
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
  send(res, 200, { month, rows: getDb().prepare('SELECT * FROM plans WHERE month = ?').all(month) });
});
route('PUT', '/api/plans', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (!isMonth(b.month)) throw new HttpError(400, "Oy noto'g'ri (YYYY-MM)");
  const p = getProject(b.project_id);
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
  send(res, 200, reportBundle(isDate(q.get('date')) ? q.get('date') : today()));
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
  const chat = getSetting('report_chat_id');
  if (chat) sendMessage(chat, reportText(b.date)).catch((e) => console.error('Telegram:', e.message));
  send(res, 200, { ...r, notified: Boolean(chat && telegramStatus().enabled) });
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
  send(res, 200, { ...Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k)])), telegram: telegramStatus() });
});
route('PUT', '/api/settings', async (req, res) => {
  requireUser(req);
  const b = await readBody(req);
  if (b.usd_rate !== undefined && b.usd_rate !== '' && !(num(b.usd_rate) > 0)) throw new HttpError(400, "Dollar kursi noto'g'ri");
  for (const k of ['report_time', 'reminder_time']) if (b[k] && !/^\d{2}:\d{2}$/.test(b[k])) throw new HttpError(400, "Vaqt noto'g'ri (SS:DD)");
  for (const k of SETTING_KEYS) if (k in b) setSetting(k, b[k] === '' ? null : String(b[k]).trim());
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
        if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) {
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

// Rejalashtiruvchi (Toshkent vaqti): PM ga eslatma; PM yubormasa — direktorga avtomatik hisobot
function startScheduler() {
  const tz = process.env.TZ_NAME || 'Asia/Tashkent';
  setInterval(async () => {
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const d = today();
    const sent = () => ['submitted', 'reviewed'].includes(getDb().prepare('SELECT status FROM daily_reports WHERE date = ?').get(d)?.status);
    try {
      if (hm === getSetting('reminder_time', '19:00') && getSetting('last_reminder') !== d) {
        setSetting('last_reminder', d);
        if (!sent()) {
          const pms = getDb().prepare('SELECT telegram_id FROM users WHERE active = 1 AND telegram_id IS NOT NULL').all();
          for (const x of pms) await sendMessage(x.telegram_id, "⏰ Bugungi hisobot hali yuborilmagan. Ilovada «Bugun» bo'limini oching — 4 qadam.");
        }
      }
      if (hm === getSetting('report_time', '21:00') && getSetting('last_report') !== d) {
        setSetting('last_report', d);
        const chat = getSetting('report_chat_id');
        if (chat && !sent()) await sendMessage(chat, `⚠️ <i>PM hisobotni yubormadi — avtomatik hisobot</i>\n\n${reportText(d)}`);
      }
    } catch (e) {
      console.error('Scheduler:', e.message);
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
