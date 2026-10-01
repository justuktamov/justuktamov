import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import {
  getDb, getSetting, setSetting, today, canEdit, FIELDS, NOTE_FIELDS, LOSS_REASONS, ROLES,
} from './db.js';
import { login, logout, userFromToken, createUser, hashPassword, ensureAdmin, publicUser } from './auth.js';
import { summary, loadRows, missingReport, addDays } from './metrics.js';
import { analyze, aiAvailable } from './ai.js';
import {
  startPolling, telegramStatus, recordEvent, sendMessage, dailyReportText, remindMissing,
} from './telegram.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const STATIC = { '/vendor/chart.js': join(ROOT, 'node_modules/chart.js/dist/chart.umd.min.js') };

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const slugify = (s) => String(s).toLowerCase().replace(/[ʻʼ'`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

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

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]));
}

function requireUser(req) {
  if (!req.user) throw new HttpError(401, 'Tizimga kiring');
  return req.user;
}
function requireAdmin(req) {
  const u = requireUser(req);
  if (u.role !== 'admin') throw new HttpError(403, 'Faqat rahbar uchun');
  return u;
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

// ---- Auth ----
route('POST', '/api/login', async (req, res) => {
  const { login: l, password } = await readBody(req);
  const r = login(l, password);
  if (!r) throw new HttpError(401, "Login yoki parol noto'g'ri");
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  send(res, 200, { user: r.user }, { 'set-cookie': `sid=${r.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` });
});
route('POST', '/api/logout', async (req, res) => {
  logout(cookies(req).sid);
  send(res, 200, { ok: true }, { 'set-cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' });
});
route('GET', '/api/me', async (req, res) => {
  const user = requireUser(req);
  send(res, 200, {
    user, today: today(), roles: ROLES, fields: FIELDS, noteFields: NOTE_FIELDS, reasons: LOSS_REASONS,
    ai: aiAvailable(), telegram: { enabled: telegramStatus().enabled, bot: telegramStatus().bot },
    usdRate: Number(getSetting('usd_rate', process.env.USD_RATE || 12800)),
  });
});

// ---- Projects ----
route('GET', '/api/projects', async (req, res) => {
  const u = requireUser(req);
  const rows = getDb().prepare('SELECT * FROM projects ORDER BY active DESC, id').all();
  send(res, 200, rows.map((p) => (u.role === 'admin' ? p : { ...p, track_key: undefined })));
});
route('POST', '/api/projects', async (req, res) => {
  requireAdmin(req);
  const b = await readBody(req);
  if (!b.name?.trim()) throw new HttpError(400, 'Loyiha nomini kiriting');
  const slug = slugify(b.slug || b.name) || `loyiha-${Date.now()}`;
  try {
    const info = getDb().prepare('INSERT INTO projects (name, slug, kind, color, channel_id, track_key, avg_check) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(b.name.trim(), slug, b.kind || 'kurs', b.color || null, b.channel_id || null, randomBytes(12).toString('hex'), num(b.avg_check));
    send(res, 201, getDb().prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, `"${slug}" identifikatori band`);
    throw e;
  }
});
route('PUT', '/api/projects/:id', async (req, res, { id }) => {
  requireAdmin(req);
  const b = await readBody(req);
  const p = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!p) throw new HttpError(404, 'Loyiha topilmadi');
  getDb().prepare('UPDATE projects SET name = ?, slug = ?, kind = ?, color = ?, channel_id = ?, avg_check = ?, active = ? WHERE id = ?')
    .run(b.name ?? p.name, b.slug ? slugify(b.slug) : p.slug, b.kind ?? p.kind, b.color ?? p.color,
      b.channel_id === undefined ? p.channel_id : (b.channel_id || null), b.avg_check === undefined ? p.avg_check : num(b.avg_check),
      b.active === undefined ? p.active : (b.active ? 1 : 0), id);
  if (b.regenerate_key) getDb().prepare('UPDATE projects SET track_key = ? WHERE id = ?').run(randomBytes(12).toString('hex'), id);
  send(res, 200, getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

// ---- Users ----
route('GET', '/api/users', async (req, res) => {
  requireAdmin(req);
  send(res, 200, getDb().prepare('SELECT * FROM users ORDER BY id').all().map(publicUser));
});
route('POST', '/api/users', async (req, res) => {
  requireAdmin(req);
  const b = await readBody(req);
  if (!b.name || !b.login || !b.password || !ROLES[b.role]) throw new HttpError(400, "Ism, login, parol va rolni to'ldiring");
  if (String(b.password).length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
  try {
    const id = createUser(b);
    send(res, 201, publicUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Bu login band');
    throw e;
  }
});
route('PUT', '/api/users/:id', async (req, res, { id }) => {
  const me = requireAdmin(req);
  const b = await readBody(req);
  const u = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) throw new HttpError(404, 'Foydalanuvchi topilmadi');
  if (Number(id) === me.id && (b.active === false || (b.role && b.role !== 'admin'))) throw new HttpError(400, "O'zingizni o'chira yoki rolingizni o'zgartira olmaysiz");
  if (b.role && !ROLES[b.role]) throw new HttpError(400, "Noto'g'ri rol");
  getDb().prepare('UPDATE users SET name = ?, role = ?, telegram_id = ?, active = ? WHERE id = ?')
    .run(b.name ?? u.name, b.role ?? u.role, b.telegram_id === undefined ? u.telegram_id : (b.telegram_id || null), b.active === undefined ? u.active : (b.active ? 1 : 0), id);
  if (b.password) {
    if (String(b.password).length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
    getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(b.password), id);
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }
  if (b.active === false) getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  send(res, 200, publicUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

// ---- Kunlik hisobot kiritish ----
route('GET', '/api/daily', async (req, res, _p, q) => {
  requireUser(req);
  const date = isDate(q.get('date')) ? q.get('date') : today();
  const { projects, rows } = loadRows(date, date);
  const reasons = getDb().prepare('SELECT project_id, reason, count FROM loss_reasons WHERE date = ?').all(date);
  const updatedBy = getDb().prepare(`SELECT a.project_id, a.field, u.name, MAX(a.created_at) AS at FROM audit a LEFT JOIN users u ON u.id = a.user_id
                                     WHERE a.date = ? GROUP BY a.project_id, a.field`).all(date);
  send(res, 200, {
    date,
    projects: projects.map((p) => ({
      id: p.id, name: p.name, slug: p.slug, kind: p.kind, color: p.color,
      row: rows.find((r) => r.project_id === p.id) || {},
      reasons: Object.fromEntries(reasons.filter((r) => r.project_id === p.id).map((r) => [r.reason, r.count])),
      updatedBy: Object.fromEntries(updatedBy.filter((r) => r.project_id === p.id).map((r) => [r.field, { name: r.name, at: r.at }])),
    })),
    missing: missingReport(date),
  });
});
route('PUT', '/api/daily', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  const date = b.date;
  if (!isDate(date)) throw new HttpError(400, "Sana noto'g'ri");
  if (date > addDays(today(), 1)) throw new HttpError(400, 'Kelajak sanasiga kiritib bo\'lmaydi');
  const project = getDb().prepare('SELECT * FROM projects WHERE id = ? AND active = 1').get(b.project_id);
  if (!project) throw new HttpError(404, 'Loyiha topilmadi');
  const db = getDb();
  const values = b.values || {};
  const old = db.prepare('SELECT * FROM daily WHERE project_id = ? AND date = ?').get(project.id, date) || {};
  const changes = [];
  for (const [field, raw] of Object.entries(values)) {
    if (!FIELDS[field] && !NOTE_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
    if (!canEdit(user.role, field)) throw new HttpError(403, `«${FIELDS[field]?.label || field}» maydonini sizning rolingiz kiritmaydi`);
    const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim().slice(0, 2000) || null);
    if ((old[field] ?? null) !== v) changes.push([field, v]);
  }
  const reasons = b.reasons || {};
  if (Object.keys(reasons).length && !canEdit(user.role, 'leads') && !canEdit(user.role, 'sales')) {
    throw new HttpError(403, 'Sabablarni lid yoki sotuv menejeri kiritadi');
  }
  db.exec('BEGIN');
  try {
    db.prepare('INSERT OR IGNORE INTO daily (project_id, date) VALUES (?, ?)').run(project.id, date);
    const audit = db.prepare('INSERT INTO audit (user_id, project_id, date, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
    for (const [field, v] of changes) {
      db.prepare(`UPDATE daily SET ${field} = ?, updated_at = datetime('now') WHERE project_id = ? AND date = ?`).run(v, project.id, date);
      audit.run(user.id, project.id, date, field, old[field] == null ? null : String(old[field]), v == null ? null : String(v));
    }
    for (const [reason, raw] of Object.entries(reasons)) {
      if (!LOSS_REASONS[reason]) throw new HttpError(400, `Noma'lum sabab: ${reason}`);
      const c = num(raw);
      if (!c) db.prepare('DELETE FROM loss_reasons WHERE project_id = ? AND date = ? AND reason = ?').run(project.id, date, reason);
      else db.prepare('INSERT INTO loss_reasons (project_id, date, reason, count) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET count = excluded.count').run(project.id, date, reason, Math.round(c));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  send(res, 200, { ok: true, changed: changes.length });
});

// ---- Analitika ----
route('GET', '/api/summary', async (req, res, _p, q) => {
  requireUser(req);
  const { from, to } = period(q);
  send(res, 200, summary({ from, to, projectId: q.get('project') ? Number(q.get('project')) : null }));
});
route('GET', '/api/export.csv', async (req, res, _p, q) => {
  requireUser(req);
  const { from, to } = period(q);
  const { projects, rows } = loadRows(from, to, q.get('project') ? Number(q.get('project')) : null);
  const cols = ['date', 'project', 'spend', 'impressions', 'clicks', 'starts', 'starts_source', 'joins', 'leads', 'qualified', 'sales', 'revenue', 'payments', 'repeat_sales', 'repeat_revenue', 'note_target', 'note_lead', 'note_sales', 'note_finance'];
  const esc = (v) => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [cols.join(',')];
  for (const r of rows.sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const pr = projects.find((p) => p.id === r.project_id);
    lines.push(cols.map((c) => esc(c === 'project' ? pr?.name : r[c])).join(','));
  }
  res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="hisobot_${from}_${to}.csv"` });
  res.end(`﻿${lines.join('\n')}`);
});
route('GET', '/api/audit', async (req, res, _p, q) => {
  requireAdmin(req);
  const limit = Math.min(Number(q.get('limit')) || 100, 500);
  send(res, 200, getDb().prepare(`SELECT a.*, u.name AS user_name, p.name AS project_name FROM audit a
    LEFT JOIN users u ON u.id = a.user_id LEFT JOIN projects p ON p.id = a.project_id ORDER BY a.id DESC LIMIT ?`).all(limit));
});

// ---- AI ----
route('POST', '/api/ai/analyze', async (req, res) => {
  const user = requireUser(req);
  const b = await readBody(req);
  const to = isDate(b.to) ? b.to : today();
  const from = isDate(b.from) ? b.from : addDays(to, -6);
  send(res, 200, await analyze({ from, to, projectId: b.project ? Number(b.project) : null, question: String(b.question || '').slice(0, 2000), userId: user.id }));
});
route('GET', '/api/ai/reports', async (req, res) => {
  requireUser(req);
  send(res, 200, getDb().prepare(`SELECT r.*, u.name AS user_name FROM ai_reports r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.id DESC LIMIT 30`).all());
});

// ---- Sozlamalar ----
const SETTING_KEYS = ['usd_rate', 'start_reply', 'report_chat_id', 'report_time', 'reminder_time', 'ai_daily'];
route('GET', '/api/settings', async (req, res) => {
  requireAdmin(req);
  send(res, 200, { ...Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k)])), telegram: telegramStatus() });
});
route('PUT', '/api/settings', async (req, res) => {
  requireAdmin(req);
  const b = await readBody(req);
  for (const k of SETTING_KEYS) if (k in b) setSetting(k, b[k] === '' ? null : b[k]);
  send(res, 200, { ok: true });
});
route('POST', '/api/telegram/test-report', async (req, res) => {
  requireAdmin(req);
  const chat = getSetting('report_chat_id');
  if (!telegramStatus().enabled) throw new HttpError(400, 'TELEGRAM_BOT_TOKEN o\'rnatilmagan');
  if (!chat) throw new HttpError(400, 'Hisobot yuboriladigan chat ID kiritilmagan');
  await sendMessage(chat, dailyReportText(today()));
  send(res, 200, { ok: true });
});

// ---- Tashqi bot/sayt uchun tracking API (loyiha kaliti bilan) ----
route('POST', '/api/track', async (req, res) => {
  const b = await readBody(req);
  const p = getDb().prepare('SELECT * FROM projects WHERE track_key = ? AND active = 1').get(String(b.key || ''));
  if (!p) throw new HttpError(401, "Kalit noto'g'ri");
  if (!['start', 'lead', 'sale', 'join', 'leave'].includes(b.event)) throw new HttpError(400, 'event: start | lead | sale | join | leave');
  recordEvent(p.id, b.event, b.tg_user_id ?? b.user_id ?? null, b.source || 'api', isDate(b.date) ? b.date : today());
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
        req.user = userFromToken(cookies(req).sid);
        // CSRF himoyasi: o'zgartiruvchi so'rovlar faqat JSON bilan
        if (req.method !== 'GET' && url.pathname !== '/api/track' && !String(req.headers['content-type'] || '').includes('application/json')) {
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

// Rejalashtiruvchi: kunlik hisobot va eslatmalar (Toshkent vaqti)
function startScheduler() {
  const tz = process.env.TZ_NAME || 'Asia/Tashkent';
  setInterval(async () => {
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const d = today();
    try {
      const reportTime = getSetting('report_time', '21:00');
      if (hm === reportTime && getSetting('last_report') !== d) {
        setSetting('last_report', d);
        const chat = getSetting('report_chat_id');
        if (chat) {
          await sendMessage(chat, dailyReportText(d));
          if (getSetting('ai_daily') === '1' && aiAvailable()) {
            const r = await analyze({ from: addDays(d, -6), to: d, kind: 'daily' });
            await sendMessage(chat, `🤖 <b>AI tahlil (7 kun)</b>\n\n${r.content.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}`);
          }
        }
      }
      const reminderTime = getSetting('reminder_time', '19:00');
      if (hm === reminderTime && getSetting('last_reminder') !== d) {
        setSetting('last_reminder', d);
        await remindMissing(d);
      }
    } catch (e) {
      console.error('Scheduler:', e.message);
    }
  }, 30_000).unref();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  getDb();
  const pw = ensureAdmin();
  if (pw) console.log(`\nBirinchi ishga tushirish. Admin: login "admin", parol "${pw}" — kirgach parolni o'zgartiring.\n`);
  createApp().listen(PORT, () => console.log(`Analitika platformasi: http://localhost:${PORT}`));
  startPolling();
  startScheduler();
}
