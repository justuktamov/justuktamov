// Brauzer demosi: /api/* so'rovlarini server o'rniga shu yerda bajaradi.
// Hisob-kitoblar serverdagi kod bilan bir xil (metrics.js, reports.js).
// Kiritilgan ma'lumotlar shu brauzerning localStorage xotirasida saqlanadi.
import { store } from './fake-sqlite.js';
import { today, normalizeIds, FIELDS, TEXT_FIELDS, PLAN_FIELDS, PROJECT_KINDS, REASONS, REASON_KINDS, CHANNELS, CHANNEL_FIELDS } from '../src/db.js';
import { reportBundle, saveDraft, submitReport, listReports, reportText } from '../src/reports.js';
import { summary, loadRows, loadReasons, loadChannels, addDays, toCsv, monthBounds, sumRows, monthly, estimateLag, parseRate } from '../src/metrics.js';
import { generateDemo, DEMO_USER } from '../src/demo-data.js';

const TODAY = today();
const SAVE_KEY = 'analitika-demo-v17';
let me = null;

function seed() {
  const demo = generateDemo(addDays(TODAY, -1)); // PM kechagi kunni kiritadi
  store.projects = demo.projects.map((p) => ({ ...p, active: 1 }));
  store.daily = demo.daily;
  store.plans = demo.plans;
  store.reasons = demo.reasons;
  store.channels = demo.channels;
  store.reports = demo.reports.map((r) => ({
    date: r.date, author_id: 1, status: r.status, summary: r.summary, tomorrow: r.tomorrow,
    project_notes: JSON.stringify(r.project_notes), submitted_at: `${r.date} 19:30:00`,
    reviewed_at: `${r.date} 21:05:00`, director_comment: r.director_comment, updated_at: `${r.date} 19:30:00`,
  }));
  store.settings = { usd_rate: '12800', report_time: '13:00', reminder_time: '11:00', report_chat_id: '123456789' };
  store.user = { id: 1, name: DEMO_USER.name, login: DEMO_USER.login, password: DEMO_USER.password, telegram_id: null };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    // Boshqa kunda saqlangan bo'lsa — namuna ma'lumot bugungi sanaga qayta yaratiladi
    if (saved?.today === TODAY) { Object.assign(store, saved.store); return; }
  } catch { /* xotira yo'q yoki buzilgan */ }
  seed();
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ today: TODAY, store })); } catch { /* xotira yo'q */ }
}
load();

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
const publicUser = ({ password, ...u }) => u;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isMonth = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
function num(v) {
  if (v === '' || v == null) return null;
  const x = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(x) || x < 0) throw new HttpError(400, `Noto'g'ri son: ${v}`);
  return x;
}
// Serverdagi checkColor bilan bir xil: faqat #rrggbb
function checkColor(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new HttpError(400, "Rang noto'g'ri (#rrggbb)");
  return v.toLowerCase();
}
const DEMO_AI = { enabled: false, provider: null, label: null, model: null, reason: "Demoda AI tahlil yo'q — haqiqiy serverda OpenRouter kaliti bilan ishlaydi" };
const needUser = () => { if (!me) throw new HttpError(401, 'Tizimga kiring'); return me; };
function period(q) {
  const to = isDate(q.get('to')) ? q.get('to') : TODAY;
  const from = isDate(q.get('from')) ? q.get('from') : addDays(to, -6);
  return { from, to };
}
const projectParam = (q) => (q.get('project') ? Number(q.get('project')) : null);
const wrap = (fn) => { try { return fn(); } catch (e) { throw new HttpError(e.status || 400, e.message); } };
function checkName(name, exceptId = null) {
  const n = String(name || '').trim().slice(0, 60);
  if (!n) throw new HttpError(400, 'Loyiha nomini kiriting');
  if (store.projects.some((p) => p.name.toLowerCase() === n.toLowerCase() && p.id !== Number(exceptId))) throw new HttpError(409, `«${n}» loyihasi allaqachon bor`);
  return n;
}

function projectMoney(b, p = {}) {
  const kind = b.kind === undefined ? (p.kind || 'leads') : b.kind;
  if (!PROJECT_KINDS[kind]) throw new HttpError(400, "Loyiha turi noto'g'ri");
  const var_cost_pct = b.var_cost_pct === undefined ? p.var_cost_pct ?? null : num(b.var_cost_pct);
  if (var_cost_pct != null && var_cost_pct > 100) throw new HttpError(400, 'Tannarx 100% dan oshmaydi');
  const fixed_monthly = b.fixed_monthly === undefined ? p.fixed_monthly ?? null : num(b.fixed_monthly);
  let channels = p.channels ?? null;
  if (b.channels !== undefined) {
    if (!Array.isArray(b.channels) || b.channels.some((c) => !CHANNELS[c])) throw new HttpError(400, "Kanal noto'g'ri");
    channels = JSON.stringify([...new Set(b.channels)]);
  }
  const sale_lag = b.sale_lag === undefined ? p.sale_lag ?? null : num(b.sale_lag);
  if (sale_lag != null && sale_lag > 60) throw new HttpError(400, 'Kechikish 60 kundan oshmaydi');
  return { kind, var_cost_pct, fixed_monthly, channels, sale_lag };
}
// Serverdagi projectOut bilan bir xil: kanallar ro'yxat, lag_hint — ma'lumotdan taxmin
function projectOut(p) {
  let channels = [];
  try { channels = JSON.parse(p.channels || '[]'); } catch { channels = []; }
  return { ...p, channels, lag_hint: p.active && p.kind !== 'auto' ? estimateLag(p.id, TODAY) : null };
}

const routes = {
  'POST /api/login': (b) => {
    const u = store.user;
    if (String(b.login || '').trim().toLowerCase() !== u.login || b.password !== u.password) throw new HttpError(401, "Login yoki parol noto'g'ri");
    me = u;
    return { user: publicUser(u) };
  },
  'POST /api/logout': () => { me = null; return { ok: true }; },
  'GET /api/me': () => ({
    user: publicUser(needUser()), today: TODAY, reportDay: addDays(TODAY, -1), planFields: PLAN_FIELDS, kinds: PROJECT_KINDS, reasons: REASONS, reasonKinds: REASON_KINDS, channels: CHANNELS, channelFields: CHANNEL_FIELDS,
    reportStatus: store.reports.find((r) => r.date === addDays(TODAY, -1))?.status || null,
    telegram: { enabled: true, bot: 'demo_bot', reportChat: Boolean(store.settings.report_chat_id) },
  }),
  'PUT /api/me': (b) => {
    const u = needUser();
    if (b.name !== undefined) { if (!String(b.name).trim()) throw new HttpError(400, 'Ismni kiriting'); u.name = String(b.name).trim().slice(0, 60); }
    if (b.telegram_id !== undefined) u.telegram_id = wrap(() => normalizeIds(b.telegram_id));
    return publicUser(u);
  },
  'PUT /api/me/password': (b) => {
    const u = needUser();
    if (String(b.new || '').length < 6) throw new HttpError(400, "Yangi parol kamida 6 belgi bo'lsin");
    if (b.old !== u.password) throw new HttpError(400, "Joriy parol noto'g'ri");
    u.password = b.new;
    return { ok: true };
  },
  'GET /api/projects': () => { needUser(); return [...store.projects].sort((a, b) => b.active - a.active || a.id - b.id).map(projectOut); },
  'POST /api/projects': (b) => {
    needUser();
    const p = { id: nextId(store.projects), name: checkName(b.name), color: checkColor(b.color), ...projectMoney(b), active: 1 };
    store.projects.push(p);
    return projectOut(p);
  },
  'PUT /api/projects/:id': (b, { id }) => {
    needUser();
    const p = store.projects.find((x) => x.id === Number(id));
    if (!p) throw new HttpError(404, 'Loyiha topilmadi');
    if (b.name !== undefined) p.name = checkName(b.name, id);
    if (b.color != null) p.color = checkColor(b.color);
    Object.assign(p, projectMoney(b, p));
    if (b.active !== undefined) p.active = b.active ? 1 : 0;
    return projectOut(p);
  },
  'GET /api/daily': (_b, _p, q) => {
    needUser();
    const date = isDate(q.get('date')) ? q.get('date') : TODAY;
    const { projects, rows } = loadRows(date, date);
    const { rows: prevRows } = loadRows(addDays(date, -1), addDays(date, -1));
    const reasons = loadReasons(date, date);
    const ch = loadChannels(date, date);
    return {
      date,
      projects: projects.map((p) => ({
        id: p.id, name: p.name, color: p.color, kind: p.kind || 'leads',
        channels: projectOut(p).channels,
        channelRows: Object.fromEntries(ch.filter((r) => r.project_id === p.id).map((r) => [r.channel, r])),
        row: rows.find((r) => r.project_id === p.id) || {},
        prev: prevRows.find((r) => r.project_id === p.id) || {},
        reasons: reasons[p.id] || { bad: {}, lost: {} },
      })),
    };
  },
  'PUT /api/daily': (b) => {
    needUser();
    if (!isDate(b.date)) throw new HttpError(400, "Sana noto'g'ri");
    if (b.date > TODAY) throw new HttpError(400, "Kelajak sanasiga kiritib bo'lmaydi");
    const project = store.projects.find((p) => p.id === Number(b.project_id) && p.active);
    if (!project) throw new HttpError(404, 'Loyiha topilmadi');
    let row = store.daily.find((r) => r.project_id === project.id && r.date === b.date);
    const changes = [];
    for (const [field, raw] of Object.entries(b.values || {})) {
      if (!FIELDS[field] && !TEXT_FIELDS[field]) throw new HttpError(400, `Noma'lum maydon: ${field}`);
      const v = FIELDS[field] ? num(raw) : (String(raw ?? '').trim().slice(0, 500) || null);
      if ((row?.[field] ?? null) !== v) changes.push([field, v]);
    }
    const rs = [];
    for (const [kind, map] of Object.entries(b.reasons || {})) {
      if (!REASONS[kind]) throw new HttpError(400, `Noma'lum sabab turi: ${kind}`);
      for (const [reason, raw] of Object.entries(map || {})) {
        if (!REASONS[kind][reason]) throw new HttpError(400, `Noma'lum sabab: ${reason}`);
        rs.push([kind, reason, num(raw)]);
      }
    }
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
    store.channels ||= [];
    for (const [channel, v] of chans) {
      const cur = store.channels.find((r) => r.project_id === project.id && r.date === b.date && r.channel === channel);
      const next = Object.fromEntries(Object.keys(CHANNEL_FIELDS).map((f) => [f, f in v ? v[f] : cur?.[f] ?? null]));
      store.channels = store.channels.filter((r) => r !== cur);
      if (Object.values(next).some((x) => x != null)) store.channels.push({ project_id: project.id, date: b.date, channel, ...next });
    }
    if (!row) { row = { project_id: project.id, date: b.date }; store.daily.push(row); }
    for (const [field, v] of changes) row[field] = v;
    for (const [kind, reason, c] of rs) {
      store.reasons = store.reasons.filter((r) => !(r.project_id === project.id && r.date === b.date && r.kind === kind && r.reason === reason));
      if (c) store.reasons.push({ project_id: project.id, date: b.date, kind, reason, count: Math.round(c) });
    }
    return { ok: true, changed: changes.length + chans.length };
  },
  'GET /api/summary': (_b, _p, q) => { needUser(); return summary({ ...period(q), projectId: projectParam(q) }); },
  'GET /api/monthly': (_b, _p, q) => {
    needUser();
    const unit = ['day', 'week', 'month'].includes(q.get('unit')) ? q.get('unit') : 'month';
    const months = Math.min(Math.max(Number(q.get('months')) || 6, 2), unit === 'day' ? 62 : 24);
    return monthly({ months, projectId: projectParam(q), asOf: addDays(TODAY, -1), unit });
  },
  'GET /api/export.csv': (_b, _p, q) => {
    needUser();
    const { from, to } = period(q);
    const { projects, rows } = loadRows(from, to, projectParam(q));
    return new Response(toCsv(projects, rows), { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' } });
  },
  'GET /api/plans': (_b, _p, q) => {
    needUser();
    const month = isMonth(q.get('month')) ? q.get('month') : TODAY.slice(0, 7);
    const prev = addDays(`${month}-01`, -1).slice(0, 7);
    const { from, to } = monthBounds(prev);
    const { projects, rows } = loadRows(from, to);
    return {
      month, rows: store.plans.filter((p) => p.month === month),
      prev: Object.fromEntries(projects.map((p) => { const t = sumRows(rows.filter((r) => r.project_id === p.id)); return [p.id, { month: prev, budget: t.spend, leads: t.leads, sales: t.sales, revenue: t.revenue, has: t.days > 0 }]; })),
    };
  },
  'PUT /api/plans': (b) => {
    needUser();
    if (!isMonth(b.month)) throw new HttpError(400, "Oy noto'g'ri (YYYY-MM)");
    const pid = Number(b.project_id);
    if (!store.projects.some((p) => p.id === pid)) throw new HttpError(404, 'Loyiha topilmadi');
    const v = Object.fromEntries(Object.keys(PLAN_FIELDS).map((k) => [k, num(b.values?.[k])]));
    store.plans = store.plans.filter((p) => !(p.project_id === pid && p.month === b.month));
    if (Object.values(v).some((x) => x != null)) store.plans.push({ project_id: pid, month: b.month, ...v });
    return { ok: true };
  },
  'GET /api/report': (_b, _p, q) => { needUser(); return { ...reportBundle(isDate(q.get('date')) ? q.get('date') : TODAY), aiStatus: DEMO_AI }; },
  // Demoda AI xizmati yo'q (kalit faqat serverda bo'ladi)
  'POST /api/report/ai': () => { needUser(); throw new HttpError(503, DEMO_AI.reason); },
  'GET /api/report/preview': (_b, _p, q) => { needUser(); return { text: reportText(isDate(q.get('date')) ? q.get('date') : TODAY) }; },
  'PUT /api/report': (b) => {
    const u = needUser();
    if (!isDate(b.date) || b.date > TODAY) throw new HttpError(400, "Sana noto'g'ri");
    return wrap(() => saveDraft(b.date, u.id, b));
  },
  'POST /api/report/submit': (b) => {
    const u = needUser();
    if (!isDate(b.date) || b.date > TODAY) throw new HttpError(400, "Sana noto'g'ri");
    return wrap(() => {
      if (b.summary !== undefined || b.project_notes !== undefined) saveDraft(b.date, u.id, b);
      return { ...submitReport(b.date, u.id), notified: false };
    });
  },
  'GET /api/reports': () => { needUser(); return listReports(90); },
  'GET /api/settings': () => { needUser(); return { ...store.settings, telegram: { enabled: false, running: false, bot: null }, ai: DEMO_AI }; },
  'PUT /api/settings': (b) => {
    needUser();
    if (b.usd_rate !== undefined && b.usd_rate !== '' && b.usd_rate !== null) {
      const rate = parseRate(b.usd_rate);
      if (rate == null) throw new HttpError(400, "Dollar kursi noto'g'ri (masalan: 12800)");
      b.usd_rate = String(rate);
    }
    for (const k of ['report_time', 'reminder_time']) if (b[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b[k]))) throw new HttpError(400, "Vaqt noto'g'ri (SS:DD)");
    if (b.report_chat_id !== undefined) b.report_chat_id = wrap(() => normalizeIds(b.report_chat_id)) ?? '';
    for (const k of ['usd_rate', 'report_chat_id', 'report_time', 'reminder_time']) if (k in b) store.settings[k] = b[k] === '' || b[k] == null ? null : String(b[k]).trim();
    return { ok: true };
  },
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
  location.hash = '#/';
  location.reload();
};

window.DEMO = true;
me = store.user;
