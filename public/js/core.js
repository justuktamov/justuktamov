// Umumiy yordamchilar: API, formatlash, karkas (yon panel), davr filtri, kirish, mavzu
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
export async function api(path, opts = {}) {
  const headers = {};
  if (opts.body) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (res.status === 401 && path !== '/api/login') {
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

// ---------- Ikonkalar ----------
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  set: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M5 19v-6M10 19V6M15 19v-5M20 19V9"/></svg>',
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  dl: svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  home: svg('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  archive: svg('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v11h14V9M10 13h4"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
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
// ---------- Kichik komponentlar ----------
export function delta(v, invert = false) {
  if (v == null) return '<span class="delta flat" title="Oldingi davrda ma\'lumot yo\'q">—</span>';
  const good = invert ? v < 0 : v > 0;
  const cls = Math.abs(v) < 0.005 ? 'flat' : good ? 'up' : 'down';
  return `<span class="delta ${cls}" title="Oldingi davrga nisbatan">${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${fmtP(Math.abs(v), 0)}</span>`;
}
export function kpi({ label, value, unit = '', sub = '', d, invert = false }) {
  return `<div class="kpi"><div class="top"><span class="label">${label}</span>${d !== undefined ? delta(d, invert) : ''}</div>
    <div class="value">${value}${unit ? `<small>${unit}</small>` : ''}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
export function spinnerBlock(text = 'Yuklanmoqda…') {
  return `<div class="empty"><div class="row" style="justify-content:center"><div class="spinner"></div><span>${text}</span></div></div>`;
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

function demoMenu() {
  return `<span class="menu-btn" style="cursor:default"><span class="tag-demo">Demo</span>namuna ma'lumot</span>
    <button class="btn small ghost" data-demo-reset title="Namuna ma'lumotni qaytarish">↺</button>`;
}

function navItems() {
  const sent = ['submitted', 'reviewed'].includes(state.me.reportStatus);
  const items = [
    ['#/', 'Bugun', ICONS.home, sent ? null : '!'],
    ['#/hisobotlar', 'Hisobotlar', ICONS.archive],
    ['#/loyihalar', 'Statistika', ICONS.chart],
  ];
  return { items, bottom: [['#/sozlamalar', 'Sozlamalar', ICONS.set]] };
}

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const dayLabel = (d) => `${Number(d.slice(8, 10))}-${MONTHS[Number(d.slice(5, 7)) - 1]}, ${WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]}`;

// Har bir sahifa chizilishi raqamlanadi: kechikkan (eskirgan) so'rov natijasi yangi sahifaga yozilmaydi
export const isStale = (rid) => rid !== state.renderId;

export function shell(content) {
  state.renderId = (state.renderId || 0) + 1;
  destroyCharts();
  const route = location.hash.split('?')[0] || '#/';
  const { items, bottom } = navItems();
  const active = (href) => route === href || (href !== '#/' && route.startsWith(href));
  const link = ([href, label, icon, badge]) => `<a href="${href}" class="${active(href) ? 'active' : ''}"><span class="ic">${icon}</span><span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
  const u = state.me.user;
  const dark = isDark();
  const mobileItems = [...items, ...bottom];
  app().innerHTML = `
    <div class="mobile-top"><span class="logo"><span class="logo-mark">${ICONS.logo}</span>Analitika</span>
      <button id="themeBtnM" aria-label="Mavzuni almashtirish">${dark ? ICONS.sun.replace('<svg', '<svg width="18" height="18"') : ICONS.moon.replace('<svg', '<svg width="18" height="18"')}</button></div>
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><span class="logo-mark">${ICONS.logo}</span><span>Analitika<small>kunlik hisobot</small></span></div>
        <nav class="nav" aria-label="Asosiy">${items.map(link).join('')}</nav>
        <div class="side-foot">
          <nav class="nav">${bottom.map(link).join('')}</nav>
          <a class="side-user" href="#/sozlamalar?tab=profil" style="text-decoration:none"><span class="avatar">${esc(initials(u.name))}</span><span>${esc(u.name)}<small>Proekt menejer</small></span></a>
          <div class="side-actions"><button id="themeBtn">${dark ? 'Yorug\' rejim' : 'Tungi rejim'}</button><button id="logout">Chiqish</button></div>
        </div>
      </aside>
      <main class="main" id="main">
        <div class="topbar">
          <div class="crumbs"><span class="pill">${ICONS.cal.replace('<svg', '<svg width="13" height="13"')} ${dayLabel(state.me.today)}</span>${window.DEMO ? demoMenu() : ''}</div>
          <div class="top-actions">
            <button class="circle-btn" id="themeBtnTop" aria-label="Mavzuni almashtirish">${dark ? ICONS.sun : ICONS.moon}</button>
            <a class="avatar" href="#/sozlamalar?tab=profil" style="width:42px;height:42px;text-decoration:none" title="Profil">${esc(initials(u.name))}</a>
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
    state.me = null;
    renderLogin();
  };
  document.querySelectorAll('[data-demo-reset]').forEach((b) => { b.onclick = () => window.__demoReset?.(); });
}

// ---------- Kirish ----------
export function renderLogin(message = '') {
  destroyCharts();
  app().innerHTML = `
    <div class="login">
      <div class="login-art">
        <div class="logo" style="padding:0"><span class="logo-mark">${ICONS.logo}</span><span>Analitika<small>loyihalar voronkasi</small></span></div>
        <div style="display:grid;gap:22px">
          <h2>Har kuni: targetolog va ROP dan raqamlar → tahlil → direktorga hisobot</h2>
          <div class="flow-demo">
            <div><span>Xarajat</span><i style="width:100%"></i><span class="num">$30</span></div>
            <div><span>Kliklar</span><i style="width:80%"></i><span class="num">1000</span></div>
            <div><span>Lidlar</span><i style="width:30%"></i><span class="num">300</span></div>
            <div><span>Sifatli</span><i style="width:15%"></i><span class="num">140</span></div>
            <div><span>Sotuvlar</span><i style="width:6%"></i><span class="num">25</span></div>
          </div>
        </div>
        <p class="small" style="margin:0;color:#c9d4f5">4 qadam: target → sotuv → tahlil → yuborish</p>
      </div>
      <div class="login-form"><form id="loginForm">
        <h1>Kirish</h1>
        <label class="field">Login<input name="login" id="loginName" autocomplete="username" required autofocus></label>
        <label class="field">Parol<input name="password" id="loginPass" type="password" autocomplete="current-password" required></label>
        ${window.DEMO ? '<p class="small muted" style="margin:0">Demo: login <b>pm</b> · parol <b>demo1234</b></p>' : ''}
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

export async function boot() {
  applyTheme();
  const me = await fetchMe();
  if (!me) return renderLogin();
  state.me = me;
  state.projects = await api('/api/projects');
  // Hash o'zgarsa — hashchange o'zi chizadi; ikki marta chizilmasin
  if (!location.hash || location.hash === '#') location.hash = '#/';
  else rerender();
}

async function fetchMe() {
  const r = await fetch('/api/me').catch(() => null);
  return r?.ok ? r.json() : null;
}

export async function refreshMe() {
  state.me = await api('/api/me');
}
