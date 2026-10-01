// Umumiy yordamchilar: API, formatlash, karkas (yon panel), davr filtri, kirish, mavzu, Telegram Mini App
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const app = () => $('#app');
export const state = { me: null, projects: [], period: '7', from: null, to: null, project: '', charts: [] };

// ---------- Formatlash ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = (x, d = 0) => (x == null || Number.isNaN(x) ? '—' : Number(x).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/,/g, '.'));
export const fmtUsd = (x, d = 2) => (x == null ? '—' : `$${fmtN(x, d)}`);
export const fmtUzs = (x) => {
  if (x == null) return '—';
  if (Math.abs(x) >= 1e9) return `${fmtN(x / 1e9, 2)} mlrd`;
  if (Math.abs(x) >= 1e6) return `${fmtN(x / 1e6, 1)} mln`;
  return fmtN(x);
};
export const fmtP = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : `${fmtN(x * 100, d)}%`);
export const addDays = (date, n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const shortDate = (d) => d.slice(5).split('-').reverse().join('.');
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const monthLabel = (m) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
export const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ---------- API ----------
// Mini App ichida cookie ishonchsiz — Bearer token sessiya xotirasida saqlanadi
let token = null;
try { token = sessionStorage.getItem('tg_token'); } catch { /* xotira yo'q */ }

export async function api(path, opts = {}) {
  const headers = {};
  if (opts.body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (res.status === 401 && !['/api/login', '/api/tg-login'].includes(path)) {
    state.me = null;
    renderLogin();
    throw new Error(data.error || 'Tizimga kiring');
  }
  if (!res.ok) throw new Error(data.error || 'Xatolik');
  return data;
}

let toastTimer;
export function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `show${err ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 3400);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Nusxa olindi'); } catch { toast(text); }
}

// Fayl yuklab berish: demoda platformaning downloads imkoniyati, serverda oddiy blob havola
export async function downloadFile(filename, text, type = 'text/csv') {
  if (window.__demoDownload) return window.__demoDownload(filename, text, type);
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadCsv(params) {
  const text = await api(`/api/export.csv?${params}`);
  await downloadFile(`hisobot_${params.get('from')}_${params.get('to')}.csv`, text);
}

export function modal(inner) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  back.querySelector('input, select, textarea')?.focus();
  return { el: back.querySelector('.modal'), close };
}

export const botLink = (slug, tag) => {
  const bot = state.me?.telegram?.bot;
  const payload = tag ? `${slug}__${tag}` : slug;
  return bot ? `https://t.me/${bot}?start=${payload}` : `t.me/<bot>?start=${payload}`;
};

// ---------- Ikonkalar ----------
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  dash: svg('<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>'),
  entry: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  ads: svg('<path d="m3 11 18-8v18L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  ai: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8Z"/>'),
  set: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M5 19v-6M10 19V6M15 19v-5M20 19V9"/></svg>',
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  dl: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  tg: svg('<path d="m22 3-20 8 7 2 2 7 4-5 5 4z"/><path d="m9 13 13-10"/>'),
  tasks: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  alert: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  home: svg('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
  report: svg('<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  team: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
  archive: svg('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v11h14V9M10 13h4"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
  play: svg('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
};

// ---------- Mavzu (tizim / yorug' / tungi) ----------
// Qorong'i rejim — standart (dizayn shunga qurilgan); yorug' rejim — profilda tanlanadi
export function getTheme() { try { return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } }
export function applyTheme(t = getTheme()) {
  // data-ui — ilovaning o'z belgisi; claude.ai ning data-theme si dizaynni yorug'ga o'tkazib yubormaydi
  const root = document.documentElement;
  if (t === 'light') root.dataset.ui = 'light';
  else delete root.dataset.ui;
}
export function setTheme(t) {
  try { localStorage.setItem('theme', t); } catch { /* xotira yo'q */ }
  applyTheme(t);
  rerender();
}
export const isDark = () => document.documentElement.dataset.ui !== 'light';

// ---------- Grafiklar ----------
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export function destroyCharts() { state.charts.forEach((c) => c.destroy()); state.charts = []; }
export function chartBase() {
  const text2 = cssVar('--text-2'), grid = cssVar('--border'), surface = cssVar('--surface');
  if (window.Chart) {
    Chart.defaults.font.family = cssVar('--font') || 'system-ui';
    Chart.defaults.color = text2;
  }
  return {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 350 },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
      tooltip: { backgroundColor: cssVar('--text'), titleColor: surface, bodyColor: surface, padding: 10, boxPadding: 4, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
      y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { maxTicksLimit: 6, precision: 0 } },
    },
  };
}
// 35 kundan uzun davrda kunlik nuqtalar haftalarga jamlanadi (dushanbadan boshlab)
export function groupSeries(series, keys) {
  if (series.length <= 35) return { labels: series.map((d) => shortDate(d.date)), rows: series, weekly: false };
  const weeks = new Map();
  for (const d of series) {
    const dt = new Date(`${d.date}T00:00:00Z`);
    const monday = addDays(d.date, -((dt.getUTCDay() + 6) % 7));
    if (!weeks.has(monday)) weeks.set(monday, Object.fromEntries(keys.map((k) => [k, 0])));
    const w = weeks.get(monday);
    for (const k of keys) w[k] += Number(d[k]) || 0;
  }
  return { labels: [...weeks.keys()].map((d) => shortDate(d)), rows: [...weeks.values()], weekly: true };
}
export function sparkline(values, color = 'var(--series-1)') {
  const v = values.map((x) => Number(x) || 0);
  if (v.length < 2 || v.every((x) => x === 0)) return '';
  const max = Math.max(...v), min = Math.min(...v);
  const W = 100, H = 30, span = max - min || 1;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * W, H - 3 - ((x - min) / span) * (H - 6)]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const [lx, ly] = pts.at(-1);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="0,${H} ${line} ${W},${H}" fill="${color}" opacity=".12"></polygon>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></polyline>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4" fill="${color}" vector-effect="non-scaling-stroke"></circle></svg>`;
}

// ---------- Kichik komponentlar ----------
export function delta(v, invert = false) {
  if (v == null) return '<span class="delta flat" title="Oldingi davrda ma\'lumot yo\'q">—</span>';
  const good = invert ? v < 0 : v > 0;
  const cls = Math.abs(v) < 0.005 ? 'flat' : good ? 'up' : 'down';
  return `<span class="delta ${cls}" title="Oldingi davrga nisbatan">${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${fmtP(Math.abs(v), 0)}</span>`;
}
export function kpi({ label, value, unit = '', sub = '', d, invert = false, spark = null, color }) {
  return `<div class="kpi"><div class="top"><span class="label">${label}</span>${d !== undefined ? delta(d, invert) : ''}</div>
    <div class="value">${value}${unit ? `<small>${unit}</small>` : ''}</div>${sub ? `<div class="sub">${sub}</div>` : ''}
    ${spark ? `<div class="spark">${sparkline(spark, color)}</div>` : ''}</div>`;
}
export const INSIGHT_LABEL = { critical: 'Muhim', warning: 'Diqqat', good: 'Yaxshi', info: "Ma'lumot" };
export function insightsHtml(list) {
  return list.length
    ? `<div class="insights">${list.map((i) => `<div class="insight ${i.level}"><span class="ic">${INSIGHT_LABEL[i.level]}</span><span>${esc(i.text)}</span></div>`).join('')}</div>`
    : '<div class="muted small">Hozircha ogohlantirish yo\'q — ko\'rsatkichlar me\'yorida.</div>';
}
export function spinnerBlock(text = 'Yuklanmoqda…') {
  return `<div class="empty"><div class="row" style="justify-content:center"><div class="spinner"></div><span>${text}</span></div></div>`;
}

// Markdown (AI javobi uchun) — avval escape, keyin oddiy belgilash
export function md(src) {
  const lines = esc(src).split('\n');
  let html = '', list = null, table = [];
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|\s)\*(\S.*?)\*/g, '$1<i>$2</i>');
  const flushList = () => { if (list) { html += `</${list}>`; list = null; } };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
    html += `<div class="table-wrap"><table><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    table = [];
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*\|/.test(l)) { flushList(); table.push(l.trim()); continue; }
    flushTable();
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flushList(); const h = Math.min(m[1].length + 1, 3); html += `<h${h}>${inline(m[2])}</h${h}>`; }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { flushList(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { flushList(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else if (!l.trim()) flushList();
    else { flushList(); html += `<p>${inline(l)}</p>`; }
  }
  flushList(); flushTable();
  return html;
}

// ---------- Davr filtri ----------
export function computePeriod() {
  const t = state.me.today;
  if (state.period === 'custom' && state.from && state.to) return { from: state.from, to: state.to };
  if (state.period === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
  if (state.period === '1') return { from: t, to: t };
  if (state.period === 'y') { const y = addDays(t, -1); return { from: y, to: y }; }
  const n = Number(state.period) || 7;
  return { from: addDays(t, -(n - 1)), to: t };
}
export function filtersHtml({ project = true } = {}) {
  const opts = [['1', 'Bugun'], ['y', 'Kecha'], ['7', '7 kun'], ['30', '30 kun'], ['month', 'Shu oy'], ['90', '90 kun'], ['custom', 'Oraliq']];
  const { from, to } = computePeriod();
  return `<div class="filters">
    <div class="seg" id="periodSeg" role="group" aria-label="Davr">${opts.map(([v, l]) => `<button data-v="${v}" class="${state.period === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${state.period === 'custom' ? `<input type="date" id="fFrom" value="${from}" aria-label="Boshlanish"><input type="date" id="fTo" value="${to}" aria-label="Tugash">` : ''}
    ${project ? `<select id="fProject" aria-label="Loyiha"><option value="">Barcha loyihalar</option>${state.projects.filter((p) => p.active).map((p) => `<option value="${p.id}" ${String(state.project) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
  </div>`;
}
export function bindFilters(rerenderPage) {
  $('#periodSeg').onclick = (e) => {
    const v = e.target.dataset.v;
    if (!v) return;
    if (v === 'custom' && !state.from) Object.assign(state, computePeriod());
    state.period = v;
    rerenderPage();
  };
  const fp = $('#fProject');
  if (fp) fp.onchange = (e) => { state.project = e.target.value; rerenderPage(); };
  const f = $('#fFrom'), t = $('#fTo');
  if (f) f.onchange = t.onchange = () => { if (f.value && t.value && f.value <= t.value) { state.from = f.value; state.to = t.value; rerenderPage(); } };
}

// ---------- Karkas ----------
let routerFn = () => {};
export function setRouter(fn) { routerFn = fn; }
export function rerender() { if (state.me) routerFn(); }

const DEMO_LOGINS = [['admin', 'Direktor', 'Direktor'], ['pm', 'Dilshod', 'Proekt menejer'], ['target', 'Jasur', 'Targetolog'], ['madina', 'Madina', 'ROP'], ['fotima', 'Fotima', 'Lid operatori'], ['anvar', 'Anvar', 'Moliya'], ['kreativ', 'Sardor', 'Kreativchi']];
const CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
function demoMenu() {
  const cur = DEMO_LOGINS.find(([l]) => l === state.me.user.login) || DEMO_LOGINS[0];
  return `<details class="menu" id="demoMenu"><summary class="menu-btn" aria-label="Kim sifatida ko'rish"><span class="tag-demo">Demo</span><span class="avatar xs">${esc(initials(cur[1]))}</span>${esc(cur[2])}${CHEV}</summary>
    <div class="menu-list" role="menu">${DEMO_LOGINS.map(([l, n, r]) => `<button role="menuitem" data-login="${l}" class="${l === cur[0] ? 'on' : ''}"><span class="avatar xs">${esc(initials(n))}</span><span>${esc(n)}<small>${esc(r)}</small></span></button>`).join('')}
      <hr><button data-reset>↺ Boshlang'ich ma'lumot</button></div></details>`;
}

// Har bir rolning bosh sahifasi
export function homeRoute(role) {
  return { admin: '#/', pm: '#/hisobot', creative: '#/reklama' }[role] || '#/kiritish';
}

function navItems() {
  const role = state.me.user.role;
  const pending = state.me.pendingToday;
  const reportBadge = role === 'admin' && state.me.reportStatus === 'submitted' ? '1' : null;
  const all = {
    today: ['#/', 'Bugun', ICONS.home, reportBadge],
    report: ['#/hisobot', 'Hisobot', ICONS.report, role === 'pm' && state.me.reportStatus !== 'submitted' && state.me.reportStatus !== 'reviewed' ? '!' : null],
    entry: ['#/kiritish', 'Kiritish', ICONS.entry, pending],
    ads: ['#/reklama', 'Kreativlar', ICONS.ads],
    analytics: ['#/analitika', 'Analitika', ICONS.chart],
    tasks: ['#/vazifalar', 'Vazifalar', ICONS.tasks, state.me.openTasks || null],
    profit: ['#/foyda', 'Foyda', ICONS.money],
    ai: ['#/ai', 'AI tahlil', ICONS.ai],
    archive: ['#/hisobotlar', 'Arxiv', ICONS.archive],
    team: ['#/jamoa', 'Jamoa', ICONS.team],
    settings: ['#/sozlamalar', 'Sozlamalar', ICONS.set],
    profile: ['#/profil', 'Profil', ICONS.user],
  };
  const byRole = {
    admin: [['today', 'tasks', 'analytics', 'ads', 'profit', 'ai', 'archive'], ['team', 'settings', 'profile']],
    pm: [['report', 'entry', 'tasks', 'today', 'analytics', 'ads', 'profit', 'ai', 'archive'], ['team', 'profile']],
    target: [['entry', 'tasks', 'ads', 'analytics'], ['team', 'profile']],
    finance: [['entry', 'profit', 'tasks', 'analytics'], ['team', 'profile']],
    creative: [['ads', 'tasks', 'analytics'], ['team', 'profile']],
  };
  const [main, bottom] = byRole[role] || [['entry', 'tasks', 'analytics'], ['team', 'profile']];
  return { items: main.map((k) => all[k]), bottom: bottom.map((k) => all[k]) };
}

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const dayLabel = (d) => `${Number(d.slice(8, 10))}-${MONTHS[Number(d.slice(5, 7)) - 1]}, ${WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]}`;

// Har bir sahifa chizilishi raqamlanadi: kechikkan (eskirgan) so'rov natijasi yangi sahifaga yozilmaydi
export const isStale = (rid) => rid !== state.renderId;

export function shell(content) {
  state.renderId = (state.renderId || 0) + 1;
  destroyCharts();
  document.querySelectorAll('.modal-back').forEach((m) => m.remove()); // sahifa almashganda ochiq oyna qolmasin
  const route = location.hash.split('?')[0] || '#/';
  const { items, bottom } = navItems();
  const active = (href) => route === href || (href !== '#/' && route.startsWith(href));
  const link = ([href, label, icon, badge]) => `<a href="${href}" class="${active(href) ? 'active' : ''}"><span class="ic">${icon}</span><span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
  const u = state.me.user;
  const projects = state.projects.filter((p) => p.active);
  const dark = isDark();
  const mobileItems = [...items.slice(0, 4), bottom[bottom.length - 1]];
  const bell = u.role === 'admin' ? state.me.reportStatus === 'submitted' : state.me.pendingToday > 0;
  app().innerHTML = `
    <div class="mobile-top"><span class="logo"><span class="logo-mark">${ICONS.logo}</span>Analitika</span>
      <button id="themeBtnM" aria-label="Mavzuni almashtirish">${dark ? ICONS.sun.replace('<svg', '<svg width="18" height="18"') : ICONS.moon.replace('<svg', '<svg width="18" height="18"')}</button></div>
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><span class="logo-mark">${ICONS.logo}</span><span>Analitika<small>loyihalar boshqaruvi</small></span></div>
        <nav class="nav" aria-label="Asosiy">${items.map(link).join('')}</nav>
        ${projects.length ? `<div class="nav-label">Loyihalar</div><nav class="nav" aria-label="Loyihalar">${projects.map((p) => `<a href="#/loyiha/${p.id}" class="${route === `#/loyiha/${p.id}` ? 'active' : ''}"><span class="dotic"><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')};margin:0"></span></span><span>${esc(p.name)}</span></a>`).join('')}</nav>` : ''}
        <div class="side-foot">
          <nav class="nav">${bottom.map(link).join('')}</nav>
          <div class="side-user"><span class="avatar">${esc(initials(u.name))}</span><span>${esc(u.name)}<small>${esc(state.me.roles[u.role])}</small></span></div>
          <div class="side-actions"><button id="themeBtn">${dark ? 'Yorug\' rejim' : 'Tungi rejim'}</button><button id="logout">Chiqish</button></div>
        </div>
      </aside>
      <main class="main" id="main">
        <div class="topbar">
          <div class="crumbs"><span class="pill">${ICONS.cal.replace('<svg', '<svg width="13" height="13"')} ${dayLabel(state.me.today)}</span>${window.DEMO ? demoMenu() : ''}</div>
          <div class="top-actions">
            <a class="circle-btn" href="${u.role === 'admin' ? '#/' : homeRoute(u.role)}" title="${u.role === 'admin' ? 'Yangi PM hisoboti' : 'Bugun kiritilmaganlar'}">${ICONS.bell}${bell ? '<span class="ping"></span>' : ''}</a>
            <button class="circle-btn" id="themeBtnTop" aria-label="Mavzuni almashtirish">${dark ? ICONS.sun : ICONS.moon}</button>
            <a class="avatar" href="#/profil" style="width:42px;height:42px;text-decoration:none" title="Profil">${esc(initials(u.name))}</a>
          </div>
        </div>
        ${window.DEMO ? `<div class="demo-mobile">${demoMenu()}</div>` : ''}${content}
      </main>
    </div>
    <nav class="mobile-nav" style="--n:${mobileItems.length}">${mobileItems.map(link).join('')}</nav>`;
  const toggle = () => setTheme(isDark() ? 'light' : 'dark');
  $('#themeBtn').onclick = toggle;
  $('#themeBtnM').onclick = toggle;
  $('#themeBtnTop').onclick = toggle;
  $('#logout').onclick = async () => {
    await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
    token = null;
    try { sessionStorage.removeItem('tg_token'); } catch { /* */ }
    state.me = null;
    renderLogin();
  };
  document.querySelectorAll('.menu').forEach((menu) => {
    menu.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      menu.open = false;
      if (b.dataset.reset !== undefined) return window.__demoReset?.();
      await api('/api/login', { method: 'POST', body: { login: b.dataset.login, password: 'demo1234' } });
      location.hash = '';
      await boot();
    });
  });

}

// Ochiq menyu tashqarisiga bosilsa yoki Esc bosilsa yopiladi
document.addEventListener('click', (e) => { document.querySelectorAll('.menu[open]').forEach((m) => { if (!m.contains(e.target)) m.open = false; }); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.menu[open]').forEach((m) => { m.open = false; }); });

// ---------- Kirish ----------
export function renderLogin(message = '') {
  destroyCharts();
  app().innerHTML = `
    <div class="login">
      <div class="login-art">
        <div class="logo" style="padding:0"><span class="logo-mark">${ICONS.logo}</span><span>Analitika<small>loyihalar voronkasi</small></span></div>
        <div style="display:grid;gap:22px">
          <h2>Har bir so'm qayerga ketyapti va qancha sotuv olib kelyapti</h2>
          <div class="flow-demo">
            <div><span>Xarajat</span><i style="width:100%"></i><span class="num">$30</span></div>
            <div><span>Kliklar</span><i style="width:80%"></i><span class="num">1000</span></div>
            <div><span>Bot start</span><i style="width:100%"></i><span class="num">2500</span></div>
            <div><span>Lidlar</span><i style="width:30%"></i><span class="num">375</span></div>
            <div><span>Sotuvlar</span><i style="width:6%"></i><span class="num">25</span></div>
          </div>
        </div>
        <p class="small" style="margin:0;color:#c9d4f5">Targetolog · ROP · PM → Direktor</p>
      </div>
      <div class="login-form"><form id="loginForm">
        <h1>Kirish</h1>
        <label class="field">Login<input name="login" id="loginName" autocomplete="username" required autofocus></label>
        <label class="field">Parol<input name="password" id="loginPass" type="password" autocomplete="current-password" required></label>
        ${window.DEMO ? '<p class="small muted" style="margin:0">Demo: <b>admin</b> / <b>pm</b> / <b>target</b> / <b>madina</b> · parol <b>demo1234</b></p>' : ''}
        <div class="error" id="loginErr">${esc(message)}</div>
        <button class="btn primary" style="justify-content:center">Kirish</button>
      </form></div>
    </div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/login', { method: 'POST', body: { login: f.get('login'), password: f.get('password') } });
      await boot();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
}

// Telegram Mini App: initData orqali avtomatik kirish
async function telegramLogin() {
  const wa = window.Telegram?.WebApp;
  if (!wa?.initData) return null;
  wa.ready();
  wa.expand();
  try { if (!localStorage.getItem('theme') && wa.colorScheme) applyTheme(wa.colorScheme); } catch { /* */ }
  try {
    const r = await api('/api/tg-login', { method: 'POST', body: { initData: wa.initData } });
    token = r.token;
    try { sessionStorage.setItem('tg_token', token); } catch { /* */ }
    return r;
  } catch (e) {
    return { error: e.message };
  }
}

export async function boot() {
  applyTheme();
  let me = await fetchMe();
  if (!me) {
    const tg = await telegramLogin();
    if (tg?.error) return renderLogin(tg.error);
    me = tg ? await fetchMe() : null;
  }
  if (!me) return renderLogin();
  state.me = me;
  state.projects = await api('/api/projects');
  // Hash o'zgarsa — hashchange o'zi chizadi; ikki marta chizilmasin
  if (!location.hash || location.hash === '#') location.hash = homeRoute(me.user.role);
  else rerender();
}

async function fetchMe() {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const r = await fetch('/api/me', { headers }).catch(() => null);
  return r?.ok ? r.json() : null;
}

export async function refreshMe() {
  state.me = await api('/api/me');
}
