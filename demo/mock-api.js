// Brauzer demosi: /api/* so'rovlarini server o'rniga shu yerda bajaradi.
// Hisob-kitoblar serverdagi kod bilan bir xil (metrics.js, db.js, telegram.js hisobot matni).
// Kiritilgan ma'lumotlar shu brauzerning localStorage xotirasida saqlanadi.
import { store } from './fake-sqlite.js';
import { today, canEdit, FIELDS, NOTE_FIELDS, LOSS_REASONS, ROLES, PLATFORMS, PLAN_FIELDS } from '../src/db.js';
import {
  summary, missingReport, loadRows, addDays, planProgress, campaignStats, discipline, toCsv,
} from '../src/metrics.js';
import { dailyReportText } from '../src/telegram.js';
import { generateDemo, DEMO_USERS } from '../src/demo-data.js';
import { SYSTEM, compact, userPrompt } from '../src/ai-prompt.js';

const TODAY = today();
const SAVE_KEY = 'analitika-demo-v2';
let audit = [];
let reports = [];
let me = null;

function seed() {
  const demo = generateDemo(TODAY);
  store.projects = demo.projects.map((p) => ({ ...p, active: 1, channel_id: null, track_key: `demo${p.id}${'0'.repeat(20)}`.slice(0, 24) }));
  store.daily = demo.daily;
  store.reasons = demo.reasons;
  store.campaigns = demo.campaigns.map((c, i) => ({ ...c, id: i + 1 }));
  store.plans = demo.plans;
  store.users = DEMO_USERS.map(([name, login, role], i) => ({ id: i + 1, name, login, role, telegram_id: null, active: true, password: 'demo1234' }));
  store.settings = { usd_rate: '12800', report_time: '21:00', reminder_time: '19:00' };
  audit = [];
  reports = [];
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    // Boshqa kunda saqlangan bo'lsa — namuna ma'lumot bugungi sanaga qayta yaratiladi
    if (saved?.today === TODAY) {
      Object.assign(store, saved.store);
      audit = saved.audit || [];
      reports = saved.reports || [];
      return;
    }
  } catch { /* xotira yo'q yoki buzilgan */ }
  seed();
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ today: TODAY, store, audit, reports })); } catch { /* xotira yo'q */ }
}
load();

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
const nowStr = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const publicUser = ({ password, ...u }) => u;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isMonth = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
const slugify = (s) => String(s).toLowerCase().replace(/[ʻʼ'`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function num(v) {
  if (v === '' || v == null) return null;
  const x = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(x) || x < 0) throw new HttpError(400, `Noto'g'ri son: ${v}`);
  return x;
}
const needUser = () => { if (!me) throw new HttpError(401, 'Tizimga kiring'); return me; };
const needAdmin = () => { if (needUser().role !== 'admin') throw new HttpError(403, 'Faqat rahbar uchun'); return me; };
const needTarget = () => { if (!['admin', 'target'].includes(needUser().role)) throw new HttpError(403, "Postlarni targetolog yoki rahbar boshqaradi"); return me; };
function period(q, back = 6) {
  const to = isDate(q.get('to')) ? q.get('to') : TODAY;
  const from = isDate(q.get('from')) ? q.get('from') : addDays(to, -back);
  return { from, to };
}
const projectParam = (q) => (q.get('project') ? Number(q.get('project')) : null);

let samplePromise = null;
const getSample = () => (samplePromise ||= (window.claude?.use ? window.claude.use('sample') : Promise.resolve(null)));
const SAMPLE_ERRORS = {
  not_granted: "AI so'roviga ruxsat berilmadi. Sahifani yangilab, ruxsat oynasida «Ruxsat»ni bosing.",
  rate_limited: "Juda ko'p so'rov yuborildi. Bir daqiqadan keyin qayta urinib ko'ring.",
  cancelled: "So'rov to'xtatildi.",
};

function campaignBody(b, partial = false) {
  const out = {};
  if (!partial || 'name' in b) { if (!String(b.name || '').trim()) throw new HttpError(400, 'Post nomini kiriting'); out.name = String(b.name).trim().slice(0, 120); }
  if (!partial || 'date' in b) { if (!isDate(b.date)) throw new HttpError(400, "Sana noto'g'ri"); out.date = b.date; }
  if (!partial || 'platform' in b) { if (!PLATFORMS[b.platform]) throw new HttpError(400, "Platforma noto'g'ri"); out.platform = b.platform; }
  for (const k of ['spend', 'clicks', 'starts', 'leads', 'sales']) if (!partial || k in b) out[k] = num(b[k]);
  if (!partial || 'note' in b) out.note = String(b.note || '').trim().slice(0, 500) || null;
  return out;
}

const routes = {
  'POST /api/login': (b) => {
    const u = store.users.find((x) => x.login === String(b.login || '').trim().toLowerCase() && x.active);
    if (!u || b.password !== u.password) throw new HttpError(401, "Login yoki parol noto'g'ri");
    me = u;
    return { user: publicUser(u) };
  },
  'POST /api/logout': () => { me = null; return { ok: true }; },
  'PUT /api/me/password': (b) => {
    const u = needUser();
    if (String(b.new || '').length < 6) throw new HttpError(400, "Yangi parol kamida 6 belgi bo'lsin");
    if (b.old !== u.password) throw new HttpError(400, "Joriy parol noto'g'ri");
    u.password = b.new;
    return { ok: true };
  },
  'GET /api/me': () => {
    const u = needUser();
    return {
      user: publicUser(u), today: TODAY, roles: ROLES, fields: FIELDS, noteFields: NOTE_FIELDS, reasons: LOSS_REASONS,
      platforms: PLATFORMS, planFields: PLAN_FIELDS,
      pendingToday: missingReport(TODAY).filter((m) => !m.filled && (u.role === 'admin' || m.role === u.role)).length,
      ai: Boolean(window.claude?.use), telegram: { enabled: false, bot: null, miniApp: false }, usdRate: Number(store.settings.usd_rate),
    };
  },
  'GET /api/projects': () => { needUser(); return store.projects.map((p) => (me.role === 'admin' ? p : { ...p, track_key: undefined })); },
  'POST /api/projects': (b) => {
    needAdmin();
    if (!b.name?.trim()) throw new HttpError(400, 'Loyiha nomini kiriting');
    const slug = slugify(b.slug || b.name) || `loyiha-${nextId(store.projects)}`;
    if (store.projects.some((p) => p.slug === slug)) throw new HttpError(409, `"${slug}" identifikatori band`);
    const p = { id: nextId(store.projects), name: b.name.trim(), slug, kind: b.kind || 'kurs', color: b.color || null, channel_id: null, track_key: Math.random().toString(16).slice(2, 26).padEnd(24, '0'), active: 1 };
    store.projects.push(p);
    return p;
  },
  'PUT /api/projects/:id': (b, { id }) => {
    needAdmin();
    const p = store.projects.find((x) => x.id === Number(id));
    if (!p) throw new HttpError(404, 'Loyiha topilmadi');
    if (b.active !== undefined) p.active = b.active ? 1 : 0;
    if (b.channel_id !== undefined) p.channel_id = b.channel_id || null;
    if (b.name) p.name = String(b.name).trim();
    if (b.color) p.color = b.color;
    if (b.kind) p.kind = b.kind;
    return p;
  },
  'GET /api/users': () => { needAdmin(); return store.users.map(publicUser); },
  'POST /api/users': (b) => {
    needAdmin();
    if (!b.name || !b.login || !b.password || !ROLES[b.role]) throw new HttpError(400, "Ism, login, parol va rolni to'ldiring");
    if (String(b.password).length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
    if (store.users.some((u) => u.login === b.login.toLowerCase())) throw new HttpError(409, 'Bu login band');
    const u = { id: nextId(store.users), name: b.name, login: b.login.toLowerCase(), role: b.role, telegram_id: b.telegram_id || null, active: true, password: b.password };
    store.users.push(u);
    return publicUser(u);
  },
  'PUT /api/users/:id': (b, { id }) => {
    needAdmin();
    const u = store.users.find((x) => x.id === Number(id));
    if (!u) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    if (u.id === me.id && (b.active === false || (b.role && b.role !== 'admin'))) throw new HttpError(400, "O'zingizni o'chira yoki rolingizni o'zgartira olmaysiz");
    if (b.password && String(b.password).length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
    Object.assign(u, { name: b.name ?? u.name, role: b.role ?? u.role, telegram_id: b.telegram_id === undefined ? u.telegram_id : (b.telegram_id || null), active: b.active ?? u.active });
    if (b.password) u.password = b.password;
    return publicUser(u);
  },
  'GET /api/daily': (_b, _p, q) => {
    needUser();
    const date = isDate(q.get('date')) ? q.get('date') : TODAY;
    const { projects, rows } = loadRows(date, date);
    const { rows: prevRows } = loadRows(addDays(date, -1), addDays(date, -1));
    return {
      date,
      projects: projects.map((p) => {
        const last = {};
        for (const a of audit) if (a.project_id === p.id && a.date === date && !last[a.field]) last[a.field] = { name: a.user_name, at: a.created_at };
        return {
          id: p.id, name: p.name, slug: p.slug, kind: p.kind, color: p.color,
          row: rows.find((r) => r.project_id === p.id) || {},
          prev: prevRows.find((r) => r.project_id === p.id) || {},
          reasons: Object.fromEntries(store.reasons.filter((r) => r.project_id === p.id && r.date === date).map((r) => [r.reason, r.count])),
          updatedBy: last,
        };
      }),
      missing: missingReport(date),
    };
  },
  'PUT /api/daily': (b) => {
    const user = needUser();
    if (!isDate(b.date)) throw new HttpError(400, "Sana noto'g'ri");
    if (b.date > TODAY) throw new HttpError(400, "Kelajak sanasiga kiritib bo'lmaydi");
    const project = store.projects.find((p) => p.id === Number(b.project_id) && p.active);
    if (!project) throw new HttpError(404, 'Loyiha topilmadi');
    let row = store.daily.find((r) => r.project_id === project.id && r.date === b.date);
    const changes = [];
    for (const [field, raw] of Object.entries(b.values || {})) {
      if (!FIELDS[field] && !NOTE_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
      if (!canEdit(user.role, field)) throw new HttpError(403, `«${FIELDS[field]?.label || field}» maydonini sizning rolingiz kiritmaydi`);
      const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim().slice(0, 2000) || null);
      if ((row?.[field] ?? null) !== v) changes.push([field, v]);
    }
    const rs = b.reasons || {};
    if (Object.values(rs).some((v) => v !== '') && !canEdit(user.role, 'leads') && !canEdit(user.role, 'sales')) throw new HttpError(403, 'Sabablarni lid yoki sotuv menejeri kiritadi');
    if (!row) { row = { project_id: project.id, date: b.date }; store.daily.push(row); }
    for (const [field, v] of changes) {
      audit.unshift({ id: audit.length + 1, user_name: user.name, project_name: project.name, project_id: project.id, date: b.date, field, old_value: row[field] == null ? null : String(row[field]), new_value: v == null ? null : String(v), created_at: nowStr() });
      row[field] = v;
    }
    for (const [reason, raw] of Object.entries(rs)) {
      if (!LOSS_REASONS[reason]) throw new HttpError(400, `Noma'lum sabab: ${reason}`);
      const c = num(raw);
      store.reasons = store.reasons.filter((r) => !(r.project_id === project.id && r.date === b.date && r.reason === reason));
      if (c) store.reasons.push({ project_id: project.id, date: b.date, reason, count: Math.round(c) });
    }
    return { ok: true, changed: changes.length };
  },
  'GET /api/summary': (_b, _p, q) => { needUser(); return summary({ ...period(q), projectId: projectParam(q) }); },
  'GET /api/rows': (_b, _p, q) => {
    needUser();
    const { from, to } = period(q);
    const pid = projectParam(q);
    const { rows } = loadRows(from, to, pid);
    return {
      rows: rows.sort((a, b) => (a.date < b.date ? 1 : -1)),
      reasons: store.reasons.filter((r) => r.date >= from && r.date <= to && (!pid || r.project_id === pid)),
    };
  },
  'GET /api/export.csv': (_b, _p, q) => {
    needUser();
    const { from, to } = period(q);
    const { projects, rows } = loadRows(from, to, projectParam(q));
    return new Response(toCsv(projects, rows), { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' } });
  },
  'GET /api/discipline': (_b, _p, q) => { needUser(); return discipline(Math.min(Number(q.get('days')) || 14, 60), TODAY); },
  'GET /api/plans': (_b, _p, q) => {
    needUser();
    const month = isMonth(q.get('month')) ? q.get('month') : TODAY.slice(0, 7);
    return { month, rows: store.plans.filter((p) => p.month === month) };
  },
  'PUT /api/plans': (b) => {
    needAdmin();
    if (!isMonth(b.month)) throw new HttpError(400, "Oy noto'g'ri (YYYY-MM)");
    const pid = Number(b.project_id);
    if (!store.projects.some((p) => p.id === pid)) throw new HttpError(404, 'Loyiha topilmadi');
    const v = Object.fromEntries(Object.keys(PLAN_FIELDS).map((k) => [k, num(b.values?.[k])]));
    store.plans = store.plans.filter((p) => !(p.project_id === pid && p.month === b.month));
    if (Object.values(v).some((x) => x != null)) store.plans.push({ project_id: pid, month: b.month, ...v });
    return { ok: true };
  },
  'GET /api/plan-progress': (_b, _p, q) => { needUser(); return planProgress(isMonth(q.get('month')) ? q.get('month') : TODAY.slice(0, 7), projectParam(q), TODAY); },
  'GET /api/campaigns': (_b, _p, q) => {
    needUser();
    const { from, to } = period(q, 29);
    return { from, to, ...campaignStats({ from, to, projectId: projectParam(q) }) };
  },
  'POST /api/campaigns': (b) => {
    const u = needTarget();
    const project = store.projects.find((p) => p.id === Number(b.project_id) && p.active);
    if (!project) throw new HttpError(404, 'Loyiha topilmadi');
    const c = campaignBody(b);
    let tag = slugify(b.tag || c.name).replace(/-/g, '_').slice(0, 20) || `p${Date.now() % 1e6}`;
    const taken = (t) => store.campaigns.some((x) => x.project_id === project.id && x.tag === t);
    for (let i = 2; taken(tag); i++) tag = `${tag.slice(0, 17)}_${i}`;
    const row = { id: nextId(store.campaigns), project_id: project.id, tag, created_by: u.id, created_at: nowStr(), ...c };
    store.campaigns.push(row);
    return row;
  },
  'PUT /api/campaigns/:id': (b, { id }) => {
    needTarget();
    const cur = store.campaigns.find((x) => x.id === Number(id));
    if (!cur) throw new HttpError(404, 'Post topilmadi');
    Object.assign(cur, campaignBody(b, true));
    return cur;
  },
  'DELETE /api/campaigns/:id': (_b, { id }) => {
    needTarget();
    store.campaigns = store.campaigns.filter((x) => x.id !== Number(id));
    return { ok: true };
  },
  'GET /api/audit': () => { needAdmin(); return audit.slice(0, 200); },
  'GET /api/report-preview': (_b, _p, q) => { needUser(); return { text: dailyReportText(isDate(q.get('date')) ? q.get('date') : TODAY) }; },
  'POST /api/ai/analyze': async (b) => {
    const user = needUser();
    const to = isDate(b.to) ? b.to : TODAY;
    const from = isDate(b.from) ? b.from : addDays(to, -6);
    const sample = await getSample();
    if (!sample) throw new HttpError(400, "AI bu ko'rinishda ishlamaydi: sahifani claude.ai ichida oching.");
    const data = compact(summary({ from, to, projectId: b.project ? Number(b.project) : null }));
    let text;
    try {
      ({ text } = await sample(`${SYSTEM}\n\n${userPrompt(data, b.question)}`, { modelTier: 'default' }));
    } catch (e) {
      throw new HttpError(400, SAMPLE_ERRORS[e?.code] || `AI xatosi: ${e?.message || e?.code || "noma'lum"}`);
    }
    const r = { id: reports.length + 1, kind: 'manual', date_from: from, date_to: to, from, to, question: b.question || null, content: text.trim(), user_name: user.name, created_at: nowStr() };
    reports.unshift(r);
    return r;
  },
  'GET /api/ai/reports': () => { needUser(); return reports; },
  'GET /api/settings': () => { needAdmin(); return { ...store.settings, telegram: { enabled: false, running: false, bot: null, chats: [] } }; },
  'PUT /api/settings': (b) => { needAdmin(); Object.assign(store.settings, b); return { ok: true }; },
  'POST /api/telegram/test-report': () => { throw new HttpError(400, "Demoda Telegram bot ulanmagan — haqiqiy serverda TELEGRAM_BOT_TOKEN bilan ishlaydi."); },
};

const compiled = Object.entries(routes).map(([k, fn]) => {
  const [method, path] = k.split(' ');
  return { method, re: new RegExp(`^${path.replace(/\./g, '\\.').replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn };
});

const realFetch = window.fetch.bind(window);
window.fetch = async (input, opts = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (!url.pathname.startsWith('/api/')) return realFetch(input, opts);
  const method = (opts.method || 'GET').toUpperCase();
  try {
    const r = compiled.find((x) => x.method === method && x.re.test(url.pathname));
    if (!r) throw new HttpError(404, 'Topilmadi');
    const body = opts.body ? JSON.parse(opts.body) : {};
    const out = await r.fn(body, url.pathname.match(r.re).groups || {}, url.searchParams);
    if (method !== 'GET') save();
    return out instanceof Response ? out : json(200, out);
  } catch (e) {
    return json(e.status || 500, { error: e.status ? e.message : `Xato: ${e.message}` });
  }
};

// Fayl yuklab olish: platformaning downloads imkoniyati orqali (foydalanuvchi tasdiqlaydi)
window.__demoDownload = async (filename, text) => {
  const show = (msg, err) => document.querySelector('#toast') && Object.assign(document.querySelector('#toast'), { textContent: msg, className: `show${err ? ' err' : ''}` });
  const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
  if (!downloads) return show("Yuklab olish bu ko'rinishda ishlamaydi — demoni claude.ai ichida oching.", true);
  try {
    await downloads.save({ filename, data: text });
    show('Fayl saqlandi');
  } catch (e) {
    if (e?.code !== 'declined') show(`Saqlanmadi: ${e?.message || e?.code}`, true);
  }
};
window.__demoReset = () => {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
  seed();
  location.hash = '#/';
  location.reload();
};

window.DEMO = true;
me = store.users.find((u) => u.login === 'admin');
