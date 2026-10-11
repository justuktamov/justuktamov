// Brauzer demosi: /api/* so'rovlarini server o'rniga shu yerda bajaradi.
// Hisob-kitoblar serverdagi kod bilan bir xil (metrics.js, reports.js).
// Kiritilgan ma'lumotlar shu brauzerning localStorage xotirasida saqlanadi.
import { store } from './fake-sqlite.js';
import { today, nowLocal, normalizeIds, projectReasons, normalizeReasonKeys, DIZIPRO_REASONS, FIELDS, TEXT_FIELDS, PLAN_FIELDS, PROJECT_KINDS, REASONS, REASON_KINDS, CHANNELS, CHANNEL_FIELDS } from '../src/db.js';
import { reportBundle, saveDraft, submitReport, listReports, reportText } from '../src/reports.js';
import { summary, loadRows, loadReasons, loadChannels, addDays, toCsv, monthBounds, sumRows, monthly, estimateLag, parseRate, parseNum, dayRates } from '../src/metrics.js';
import { generateDemo, DEMO_USER } from '../src/demo-data.js';
import { ROLES, PARTS, isStaff, userProjects, canSeeProject, canWriteField, missingFor, normalizeProjectIds } from '../src/roles.js';

const TODAY = today();
const SAVE_KEY = 'analitika-demo-v24';
let me = null;

function seed() {
  const demo = generateDemo(addDays(TODAY, -1)); // PM kechagi kunni kiritadi
  store.projects = demo.projects.map((p) => ({ ...p, active: 1 }));
  store.daily = demo.daily;
  store.plans = demo.plans;
  store.reasons = demo.reasons;
  store.channels = demo.channels;
  store.rates = demo.rates;
  store.reports = demo.reports.map((r) => ({
    date: r.date, author_id: 1, status: r.status, summary: r.summary, tomorrow: r.tomorrow,
    project_notes: JSON.stringify(r.project_notes), submitted_at: `${r.date} 19:30:00`,
    reviewed_at: `${r.date} 21:05:00`, director_comment: r.director_comment, updated_at: `${r.date} 19:30:00`,
  }));
  store.settings = { usd_rate: '12800', report_time: '13:00', reminder_time: '11:00', report_chat_id: '123456789' };
  // Xodimlar: PM, targetolog va ROP (hamma loyihalar). Oldingi kunlar yuborilgan, kechagi — hali yo'q (demoda kiritib, yuborib ko'rish uchun)
  store.users = [
    { id: 1, name: DEMO_USER.name, login: DEMO_USER.login, password: DEMO_USER.password, telegram_id: null, role: 'pm', projects: null, active: 1 },
    { id: 2, name: 'Aziz', login: 'aziz', password: 'demo1234', telegram_id: '111222333', role: 'target', projects: null, active: 1 },
    { id: 3, name: 'Malika', login: 'malika', password: 'demo1234', telegram_id: '444555666', role: 'rop', projects: null, active: 1 },
  ];
  store.meId = 1;
  const y = addDays(TODAY, -1);
  store.staffReports = [];
  for (let i = 1; i <= 14; i += 1) {
    const d = addDays(y, -i);
    store.staffReports.push({ date: d, user_id: 2, part: 'target', submitted_at: `${addDays(d, 1)} 09:${String(10 + (i * 7) % 40).padStart(2, '0')}:00` });
    store.staffReports.push({ date: d, user_id: 3, part: 'rop', submitted_at: `${addDays(d, 1)} 10:${String(5 + (i * 11) % 50).padStart(2, '0')}:00` });
  }
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
// Eski saqlangan demoda xodimlar bo'lmasa — qo'shiladi
if (!store.users?.length) { const keep = store.user; seed(); if (keep) Object.assign(store.users[0], keep, { role: 'pm' }); }

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
// Kiritishlar tarixi (serverdagi entry_log ning soddalashtirilgani)
function logDemo(date, project, label, oldValue, newValue) {
  const s = (v) => (v == null || v === '' ? null : String(v));
  if (s(oldValue) === s(newValue)) return;
  (store.log ||= []).push({ at: nowLocal(), user: me?.name || null, date, project, label, old: s(oldValue), new: s(newValue), project_id: store.projects.find((p) => p.name === project)?.id ?? null });
}
const publicUser = ({ password, ...u }) => u;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isMonth = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
// Serverdagi num bilan bir xil: «450.000» — 450000 (parseNum)
function num(v) {
  const x = parseNum(v);
  if (x === null) return null;
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
// Targetolog va ROP chaqira oladigan yo'llar (qolganlari — faqat PM), serverdagi STAFF bilan bir xil
const STAFF_ROUTES = new Set(['POST /api/login', 'POST /api/logout', 'GET /api/me', 'PUT /api/me', 'PUT /api/me/password', 'GET /api/projects', 'GET /api/daily', 'PUT /api/daily', 'PUT /api/rate', 'GET /api/history', 'POST /api/part/submit']);
const sentAt = (date, uid) => (store.staffReports || []).find((r) => r.date === date && r.user_id === uid)?.submitted_at || null;
const staffList = (date) => store.users.filter((u) => u.active && isStaff(u)).sort((a, b) => (a.role < b.role ? 1 : -1)).map((u) => ({
  id: u.id, name: u.name, role: u.role, projects: userProjects(u), telegram: Boolean(u.telegram_id), submitted_at: sentAt(date, u.id),
}));
const userOut = (u) => ({ ...publicUser(u), projects: userProjects(u) });
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
  const reason_keys = b.reason_keys === undefined ? p.reason_keys ?? null : wrap(() => normalizeReasonKeys(b.reason_keys));
  return { kind, var_cost_pct, fixed_monthly, channels, sale_lag, reason_keys };
}
// Serverdagi projectOut bilan bir xil: kanallar ro'yxat, lag_hint — ma'lumotdan taxmin
function projectOut(p) {
  let channels = [];
  try { channels = JSON.parse(p.channels || '[]'); } catch { channels = []; }
  return { ...p, channels, reasonKeys: projectReasons(p), lag_hint: p.active && p.kind !== 'auto' ? estimateLag(p.id, TODAY) : null };
}

const routes = {
  'POST /api/login': (b) => {
    const u = store.users.find((x) => x.active && x.login === String(b.login || '').trim().toLowerCase());
    if (!u || b.password !== u.password) throw new HttpError(401, "Login yoki parol noto'g'ri");
    me = u;
    store.meId = u.id;
    return { user: publicUser(u) };
  },
  'POST /api/logout': () => { me = null; return { ok: true }; },
  'GET /api/me': () => ({
    user: publicUser(needUser()), today: TODAY, reportDay: addDays(TODAY, -1), planFields: PLAN_FIELDS, kinds: PROJECT_KINDS, reasons: REASONS, reasonKinds: REASON_KINDS, channels: CHANNELS, channelFields: CHANNEL_FIELDS,
    reportStatus: store.reports.find((r) => r.date === addDays(TODAY, -1))?.status || null,
    roles: ROLES,
    partSent: isStaff(me) ? sentAt(addDays(TODAY, -1), me.id) : null,
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
  'GET /api/projects': () => { needUser(); return [...store.projects].filter((p) => canSeeProject(me, p.id)).sort((a, b) => b.active - a.active || (a.sort_order ?? a.id) - (b.sort_order ?? b.id) || a.id - b.id).map(projectOut); },
  'PUT /api/projects/order': (b) => {
    needUser();
    const ids = (b.ids || []).map(Number);
    if (!ids.length || ids.some((id) => !store.projects.some((p) => p.id === id))) throw new HttpError(400, "Tartib noto'g'ri");
    ids.forEach((id, i) => { store.projects.find((p) => p.id === id).sort_order = i + 1; });
    return { ok: true };
  },
  'POST /api/projects': (b) => {
    needUser();
    const p = { id: nextId(store.projects), name: checkName(b.name), color: checkColor(b.color), ...projectMoney(b), active: 1 };
    if (!p.reason_keys && p.name.toUpperCase() === 'DIZIPRO') p.reason_keys = DIZIPRO_REASONS;
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
    const all = loadRows(date, date, null, { activeOnly: true });
    const projects = all.projects.filter((p) => canSeeProject(me, p.id));
    const { rows } = all;
    const { rows: prevRows } = loadRows(addDays(date, -1), addDays(date, -1), null, { activeOnly: true });
    const reasons = loadReasons(date, date);
    const ch = loadChannels(date, date);
    const rateOf = dayRates();
    return {
      date,
      mine: isStaff(me) ? { part: me.role, submitted_at: sentAt(date, me.id) } : null,
      staff: isStaff(me) ? null : staffList(date),
      rate: { value: rateOf.entered(date), prev: rateOf(addDays(date, -1)) },
      projects: projects.map((p) => ({
        id: p.id, name: p.name, color: p.color, kind: p.kind || 'leads',
        channels: projectOut(p).channels,
        reasonKeys: projectReasons(p),
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
    if (!project || !canSeeProject(me, project.id)) throw new HttpError(404, 'Loyiha topilmadi');
    if (isStaff(me)) {
      const bad = Object.keys(b.values || {}).find((f) => (FIELDS[f] || TEXT_FIELDS[f]) && !canWriteField(me, f));
      if (bad) throw new HttpError(403, `«${FIELDS[bad] || TEXT_FIELDS[bad]}» — ${ROLES[me.role].toLowerCase()} kiritmaydi`);
      if (b.reasons && Object.keys(b.reasons).length && !PARTS[me.role].reasons) throw new HttpError(403, 'Sabablarni ROP kiritadi');
      if (b.channels && Object.keys(b.channels).length) throw new HttpError(403, "Kanallar bo'yicha raqamlarni PM kiritadi");
    }
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
    for (const [field, v] of changes) { logDemo(b.date, project.name, FIELDS[field] || TEXT_FIELDS[field], row[field], v); row[field] = v; }
    for (const [kind, reason, c] of rs) {
      store.reasons = store.reasons.filter((r) => !(r.project_id === project.id && r.date === b.date && r.kind === kind && r.reason === reason));
      if (c) store.reasons.push({ project_id: project.id, date: b.date, kind, reason, count: Math.round(c) });
    }
    return { ok: true, changed: changes.length + chans.length };
  },
  'PUT /api/rate': (b) => {
    needUser();
    if (isStaff(me) && !PARTS[me.role].rate) throw new HttpError(403, 'Dollar kursini targetolog yoki PM kiritadi');
    if (!isDate(b.date) || b.date > TODAY) throw new HttpError(400, "Sana noto'g'ri");
    const was = (store.rates || []).find((r) => r.date === b.date)?.usd_rate;
    const rate = b.usd_rate === '' || b.usd_rate == null ? null : parseRate(b.usd_rate);
    if (b.usd_rate !== '' && b.usd_rate != null && rate == null) throw new HttpError(400, "Dollar kursi noto'g'ri (masalan: 12650)");
    store.rates = (store.rates || []).filter((r) => r.date !== b.date);
    logDemo(b.date, null, 'Dollar kursi', was, rate);
    if (rate == null) return { date: b.date, usd_rate: null };
    store.rates.push({ date: b.date, usd_rate: rate });
    return { date: b.date, usd_rate: rate };
  },
  'GET /api/summary': (_b, _p, q) => { needUser(); return summary({ ...period(q), projectId: projectParam(q) }); },
  'GET /api/monthly': (_b, _p, q) => {
    needUser();
    const unit = ['day', 'week', 'month'].includes(q.get('unit')) ? q.get('unit') : 'month';
    const months = Math.min(Math.max(Number(q.get('months')) || 6, 1), unit === 'day' ? 62 : 24);
    const y = addDays(TODAY, -1);
    return monthly({ months, projectId: projectParam(q), asOf: isDate(q.get('to')) && q.get('to') < y ? q.get('to') : y, unit });
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
    if (dayRates().entered(b.date) == null) throw new HttpError(400, "Shu kun uchun dollar kursini kiriting (1-qadam, «Target»)");
    return wrap(() => {
      if (b.summary !== undefined || b.project_notes !== undefined) saveDraft(b.date, u.id, b);
      return { ...submitReport(b.date, u.id), notified: false };
    });
  },
  'GET /api/reports': () => { needUser(); return listReports(90); },
  'GET /api/history': (_b, _p, q) => { needUser(); return (store.log || []).filter((r) => r.date === q.get('date') && (r.project_id == null || canSeeProject(me, r.project_id))).reverse(); },
  'POST /api/part/submit': (b) => {
    needUser();
    if (!isStaff(me)) throw new HttpError(403, 'Bu tugma targetolog va ROP uchun');
    if (!isDate(b.date) || b.date > TODAY) throw new HttpError(400, "Sana noto'g'ri");
    const { projects: all, rows } = loadRows(b.date, b.date, null, { activeOnly: true });
    const projects = all.filter((p) => canSeeProject(me, p.id));
    if (PARTS[me.role].rate && dayRates().entered(b.date) == null) throw new HttpError(400, 'Shu kun uchun dollar kursini kiriting');
    const miss = missingFor(me.role, projects, (id) => rows.find((r) => r.project_id === id));
    if (miss.length) throw new HttpError(400, `To'ldirilmagan: ${miss.map((m) => `${m.project} — ${m.fields.map((f) => FIELDS[f]).join(', ')}`).join('; ')}`);
    const resend = Boolean(sentAt(b.date, me.id));
    const at = nowLocal();
    store.staffReports = store.staffReports.filter((r) => !(r.date === b.date && r.user_id === me.id));
    store.staffReports.push({ date: b.date, user_id: me.id, part: me.role, submitted_at: at });
    logDemo(b.date, null, PARTS[me.role].title, null, resend ? 'qayta yuborildi' : 'yuborildi');
    return { submitted_at: at, resend };
  },
  'POST /api/part/remind': (b) => {
    needUser();
    const u = store.users.find((x) => x.id === Number(b.user_id));
    throw new HttpError(503, `Demoda Telegram yo'q — haqiqiy serverda ${u?.name || 'xodim'} ga eslatma boradi`);
  },
  'GET /api/users': () => { needUser(); return [...store.users].sort((a, b) => b.active - a.active || a.role.localeCompare(b.role)).map(userOut); },
  'POST /api/users': (b) => {
    needUser();
    const f = userFields({ role: 'target', ...b });
    if (String(b.password || '').length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
    const u = { id: nextId(store.users), name: f.name, login: f.login, password: String(b.password), telegram_id: f.tg, role: f.role, projects: f.projects, active: 1 };
    store.users.push(u);
    return userOut(u);
  },
  'PUT /api/users/:id': (b, { id }) => {
    needUser();
    const u = store.users.find((x) => x.id === Number(id));
    if (!u) throw new HttpError(404, 'Xodim topilmadi');
    const f = userFields(b, u);
    const active = b.active === undefined ? u.active : (b.active ? 1 : 0);
    if (u.id === me.id && (!active || f.role !== 'pm')) throw new HttpError(400, "O'zingizni o'chirib yoki rolingizni o'zgartirib bo'lmaydi");
    if (b.password && String(b.password).length < 6) throw new HttpError(400, "Parol kamida 6 belgi bo'lsin");
    Object.assign(u, { name: f.name, login: f.login, role: f.role, telegram_id: f.tg, projects: f.projects, active }, b.password ? { password: String(b.password) } : {});
    return userOut(u);
  },
  // usd_rate — eski umumiy kurs (kunlik kursdan oldingi kunlar hisobi uchun), sozlamalarda ko'rsatilmaydi
  'GET /api/settings': () => { needUser(); const { usd_rate: _legacy, ...rest } = store.settings; return { ...rest, telegram: { enabled: false, running: false, bot: null }, ai: DEMO_AI }; },
  'PUT /api/settings': (b) => {
    needUser();
    for (const k of ['report_time', 'reminder_time']) if (b[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b[k]))) throw new HttpError(400, "Vaqt noto'g'ri (SS:DD)");
    if (b.report_chat_id !== undefined) b.report_chat_id = wrap(() => normalizeIds(b.report_chat_id)) ?? '';
    for (const k of ['report_chat_id', 'report_time', 'reminder_time']) if (k in b) store.settings[k] = b[k] === '' || b[k] == null ? null : String(b[k]).trim();
    return { ok: true };
  },
};

// Serverdagi userFields bilan bir xil tekshiruv
function userFields(b, cur = {}) {
  const name = b.name === undefined ? cur.name : String(b.name).trim().slice(0, 60);
  if (!name) throw new HttpError(400, 'Ismni kiriting');
  const role = b.role === undefined ? cur.role : b.role;
  if (!ROLES[role]) throw new HttpError(400, "Rol noto'g'ri");
  const login = b.login === undefined ? cur.login : String(b.login).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(login || '')) throw new HttpError(400, 'Login: 3–32 belgi, lotin harflari, raqam, . _ -');
  if (store.users.some((x) => x.login === login && x.id !== cur.id)) throw new HttpError(409, `«${login}» logini band`);
  const tg = b.telegram_id === undefined ? cur.telegram_id ?? null : wrap(() => normalizeIds(b.telegram_id));
  const projects = b.projects === undefined ? cur.projects ?? null : wrap(() => normalizeProjectIds(b.projects, new Set(store.projects.map((p) => p.id))));
  return { name, role, login, tg, projects: role === 'pm' ? null : projects };
}

const compiled = Object.entries(routes).map(([k, fn]) => {
  const [method, path] = k.split(' ');
  return { method, key: k, re: new RegExp(`^${path.replace(/\./g, '\\.').replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn };
});

const realFetch = window.fetch.bind(window);
window.fetch = async (input, opts = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (!url.pathname.startsWith('/api/')) return realFetch(input, opts);
  const method = (opts.method || 'GET').toUpperCase();
  try {
    const r = compiled.find((x) => x.method === method && x.re.test(url.pathname));
    if (!r) throw new HttpError(404, 'Topilmadi');
    if (isStaff(me) && !STAFF_ROUTES.has(r.key)) throw new HttpError(403, "Bu bo'lim faqat proekt menejer uchun");
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

// Demoda rolni almashtirib ko'rish: PM, targetolog yoki ROP sifatida
window.__demoAs = (role) => {
  const u = store.users.find((x) => x.active && x.role === role);
  if (!u) return;
  store.meId = u.id;
  save();
  location.hash = role === 'pm' ? '#/' : '#/kiritish';
  location.reload();
};

window.DEMO = true;
me = store.users.find((u) => u.id === store.meId) || store.users[0];
