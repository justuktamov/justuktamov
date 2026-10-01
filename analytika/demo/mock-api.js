// Brauzer demosi: /api/* so'rovlarini server o'rniga shu yerda bajaradi.
// Hisob-kitoblar serverdagi kod bilan bir xil (metrics.js, db.js).
import { store } from './fake-sqlite.js';
import { today, canEdit, FIELDS, NOTE_FIELDS, LOSS_REASONS, ROLES } from '../src/db.js';
import { summary, missingReport, loadRows, addDays } from '../src/metrics.js';
import { generateDemo, DEMO_USERS } from '../src/demo-data.js';
import { SYSTEM, compact, userPrompt } from '../src/ai-prompt.js';

const TODAY = today();
const demo = generateDemo(TODAY);
store.projects = demo.projects.map((p) => ({ ...p, active: 1, channel_id: null, track_key: `demo${p.id}${'0'.repeat(20)}`.slice(0, 24) }));
store.daily = demo.daily;
store.reasons = demo.reasons;
store.settings = { usd_rate: '12800', report_time: '21:00', reminder_time: '19:00' };

const users = DEMO_USERS.map(([name, login, role], i) => ({ id: i + 1, name, login, role, telegram_id: null, active: true }));
const audit = [];
const reports = [];
let me = null;
let nextProjectId = store.projects.length + 1;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const slugify = (s) => String(s).toLowerCase().replace(/[ʻʼ'`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function num(v) {
  if (v === '' || v == null) return null;
  const x = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(x) || x < 0) throw new HttpError(400, `Noto'g'ri son: ${v}`);
  return x;
}
const needUser = () => { if (!me) throw new HttpError(401, 'Tizimga kiring'); return me; };
const needAdmin = () => { if (needUser().role !== 'admin') throw new HttpError(403, 'Faqat rahbar uchun'); return me; };
function period(q) {
  const to = isDate(q.get('to')) ? q.get('to') : TODAY;
  const from = isDate(q.get('from')) ? q.get('from') : addDays(to, -6);
  return { from, to };
}

let samplePromise = null;
const getSample = () => (samplePromise ||= (window.claude?.use ? window.claude.use('sample') : Promise.resolve(null)));
const SAMPLE_ERRORS = {
  not_granted: "AI so'roviga ruxsat berilmadi. Qayta urinib ko'rsangiz, ruxsat oynasi yana chiqadi (sahifani yangilang).",
  rate_limited: "Juda ko'p so'rov yuborildi. Bir daqiqadan keyin qayta urinib ko'ring.",
  cancelled: "So'rov to'xtatildi.",
};

const routes = {
  'POST /api/login': (b) => {
    const u = users.find((x) => x.login === String(b.login || '').trim().toLowerCase() && x.active);
    if (!u || b.password !== 'demo1234') throw new HttpError(401, "Login yoki parol noto'g'ri");
    me = u;
    return { user: u };
  },
  'POST /api/logout': () => { me = null; return { ok: true }; },
  'GET /api/me': () => ({
    user: needUser(), today: TODAY, roles: ROLES, fields: FIELDS, noteFields: NOTE_FIELDS, reasons: LOSS_REASONS,
    ai: Boolean(window.claude?.use), telegram: { enabled: false, bot: null }, usdRate: Number(store.settings.usd_rate),
  }),
  'GET /api/projects': () => { needUser(); return store.projects.map((p) => (me.role === 'admin' ? p : { ...p, track_key: undefined })); },
  'POST /api/projects': (b) => {
    needAdmin();
    if (!b.name?.trim()) throw new HttpError(400, 'Loyiha nomini kiriting');
    const slug = slugify(b.slug || b.name) || `loyiha-${nextProjectId}`;
    if (store.projects.some((p) => p.slug === slug)) throw new HttpError(409, `"${slug}" identifikatori band`);
    const p = { id: nextProjectId++, name: b.name.trim(), slug, kind: b.kind || 'kurs', color: b.color || null, channel_id: null, track_key: Math.random().toString(16).slice(2, 26), active: 1 };
    store.projects.push(p);
    return p;
  },
  'PUT /api/projects/:id': (b, { id }) => {
    needAdmin();
    const p = store.projects.find((x) => x.id === Number(id));
    if (!p) throw new HttpError(404, 'Loyiha topilmadi');
    if (b.active !== undefined) p.active = b.active ? 1 : 0;
    if (b.channel_id !== undefined) p.channel_id = b.channel_id || null;
    if (b.name) p.name = b.name;
    return p;
  },
  'GET /api/users': () => { needAdmin(); return users; },
  'POST /api/users': (b) => {
    needAdmin();
    if (!b.name || !b.login || !b.password || !ROLES[b.role]) throw new HttpError(400, "Ism, login, parol va rolni to'ldiring");
    if (users.some((u) => u.login === b.login.toLowerCase())) throw new HttpError(409, 'Bu login band');
    const u = { id: users.length + 1, name: b.name, login: b.login.toLowerCase(), role: b.role, telegram_id: b.telegram_id || null, active: true };
    users.push(u);
    return u;
  },
  'PUT /api/users/:id': (b, { id }) => {
    needAdmin();
    const u = users.find((x) => x.id === Number(id));
    if (!u) throw new HttpError(404, 'Foydalanuvchi topilmadi');
    if (u.id === me.id && (b.active === false || (b.role && b.role !== 'admin'))) throw new HttpError(400, "O'zingizni o'chira yoki rolingizni o'zgartira olmaysiz");
    Object.assign(u, { name: b.name ?? u.name, role: b.role ?? u.role, telegram_id: b.telegram_id === undefined ? u.telegram_id : (b.telegram_id || null), active: b.active ?? u.active });
    return u;
  },
  'GET /api/daily': (_b, _p, q) => {
    needUser();
    const date = isDate(q.get('date')) ? q.get('date') : TODAY;
    const { projects, rows } = loadRows(date, date);
    return {
      date,
      projects: projects.map((p) => {
        const last = {};
        for (const a of audit) if (a.project_id === p.id && a.date === date && !last[a.field]) last[a.field] = { name: a.user_name, at: a.created_at };
        return {
          id: p.id, name: p.name, slug: p.slug, kind: p.kind, color: p.color,
          row: rows.find((r) => r.project_id === p.id) || {},
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
    const project = store.projects.find((p) => p.id === Number(b.project_id) && p.active);
    if (!project) throw new HttpError(404, 'Loyiha topilmadi');
    let row = store.daily.find((r) => r.project_id === project.id && r.date === b.date);
    const changes = [];
    for (const [field, raw] of Object.entries(b.values || {})) {
      if (!FIELDS[field] && !NOTE_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
      if (!canEdit(user.role, field)) throw new HttpError(403, `«${FIELDS[field]?.label || field}» maydonini sizning rolingiz kiritmaydi`);
      const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim() || null);
      if ((row?.[field] ?? null) !== v) changes.push([field, v]);
    }
    const rs = b.reasons || {};
    if (Object.values(rs).some((v) => v !== '') && !canEdit(user.role, 'leads') && !canEdit(user.role, 'sales')) throw new HttpError(403, 'Sabablarni lid yoki sotuv menejeri kiritadi');
    if (!row) { row = { project_id: project.id, date: b.date }; store.daily.push(row); }
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    for (const [field, v] of changes) {
      audit.unshift({ id: audit.length + 1, user_name: user.name, project_name: project.name, project_id: project.id, date: b.date, field, old_value: row[field] == null ? null : String(row[field]), new_value: v == null ? null : String(v), created_at: now });
      row[field] = v;
    }
    for (const [reason, raw] of Object.entries(rs)) {
      const c = num(raw);
      store.reasons = store.reasons.filter((r) => !(r.project_id === project.id && r.date === b.date && r.reason === reason));
      if (c) store.reasons.push({ project_id: project.id, date: b.date, reason, count: Math.round(c) });
    }
    return { ok: true, changed: changes.length };
  },
  'GET /api/summary': (_b, _p, q) => { needUser(); return summary({ ...period(q), projectId: q.get('project') ? Number(q.get('project')) : null }); },
  'GET /api/audit': () => { needAdmin(); return audit.slice(0, 200); },
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
    const r = { id: reports.length + 1, kind: 'manual', date_from: from, date_to: to, from, to, question: b.question || null, content: text.trim(), user_name: user.name, created_at: new Date().toISOString().replace('T', ' ') };
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
  return { method, re: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn };
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
    return json(200, await r.fn(body, url.pathname.match(r.re).groups || {}, url.searchParams));
  } catch (e) {
    return json(e.status || 500, { error: e.status ? e.message : `Xato: ${e.message}` });
  }
};

window.DEMO = true;
// Demoda darhol rahbar sifatida kiriladi; boshqa rolni ko'rish uchun chiqib, boshqa login bilan kiring
me = users[0];
