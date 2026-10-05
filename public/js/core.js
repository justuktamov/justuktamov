// Umumiy yordamchilar: API, formatlash, karkas (yon panel), davr filtri, kirish, mavzu
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const app = () => $('#app');
export const state = { me: null, projects: [], period: 'y', from: null, to: null, project: '', charts: [] };

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
// So'mdagi summa doim «so'm» bilan, dollar — «$» bilan (adashmaslik uchun)
export const fmtSom = (x) => (x == null ? '—' : `${fmtUzs(x)} so'm`);
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
  logout: svg('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  home: svg('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
  trend: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  archive: svg('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v11h14V9M10 13h4"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
};

// Dizayn faqat yorug' rejimda; eski saqlangan tanlov tozalanadi
export function applyTheme() {
  delete document.documentElement.dataset.ui;
  try { localStorage.removeItem('theme'); } catch { /* xotira yo'q */ }
}

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

// ---------- Kalendar ----------
// Brauzerning o'z oynasi o'rniga: o'zbekcha, yorug', dushanbadan boshlanadi
const WEEK = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
export const prettyDate = (d) => `${Number(d.slice(8, 10))}-${MONTHS[Number(d.slice(5, 7)) - 1]}, ${d.slice(0, 4)}`;

export function dateButton(id, value, label = 'Sana') {
  return `<button type="button" class="date-btn" id="${id}" aria-label="${label}: ${prettyDate(value)}" aria-haspopup="dialog">${ICONS.cal}<span>${prettyDate(value)}</span></button>`;
}

let calClose = null;
export function openCalendar(anchor, { value, min = null, max = null, onPick }) {
  calClose?.();
  menuClose?.();
  let view = value.slice(0, 7);
  const pop = document.createElement('div');
  pop.className = 'cal';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Sana tanlash');
  const ok = (d) => (!min || d >= min) && (!max || d <= max);
  const today = state.me?.today;
  const draw = () => {
    const [y, m] = view.split('-').map(Number);
    const first = `${view}-01`;
    const shift = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // dushanba = 0
    const start = addDays(first, -shift);
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const lastRow = days.slice(35).every((d) => d.slice(0, 7) !== view) ? 35 : 42;
    const prevM = addDays(first, -1).slice(0, 7);
    const nextM = addDays(`${view}-28`, 7).slice(0, 7);
    pop.innerHTML = `<div class="cal-head">
        <button type="button" class="cal-nav" data-m="${prevM}" aria-label="Oldingi oy" ${min && `${prevM}-31` < min ? 'disabled' : ''}>‹</button>
        <b>${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}</b>
        <button type="button" class="cal-nav" data-m="${nextM}" aria-label="Keyingi oy" ${max && `${nextM}-01` > max ? 'disabled' : ''}>›</button></div>
      <div class="cal-grid">${WEEK.map((w) => `<span class="cal-wd">${w}</span>`).join('')}
        ${days.slice(0, lastRow).map((d) => `<button type="button" data-d="${d}" class="cal-day ${d.slice(0, 7) !== view ? 'out' : ''} ${d === value ? 'sel' : ''} ${d === today ? 'today' : ''}" ${ok(d) ? '' : 'disabled'}>${Number(d.slice(8))}</button>`).join('')}</div>
      ${today ? `<div class="cal-foot"><button type="button" data-d="${addDays(today, -1)}" ${ok(addDays(today, -1)) ? '' : 'disabled'}>Kecha</button><button type="button" data-d="${today}" ${ok(today) ? '' : 'disabled'}>Bugun</button></div>` : ''}`;
  };
  draw();
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.top = `${r.bottom + window.scrollY + 8}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - w - 8))}px`;
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = e.target.closest('[data-m]');
    if (nav && !nav.disabled) { view = nav.dataset.m; draw(); return; }
    const day = e.target.closest('[data-d]');
    if (day && !day.disabled) { close(); onPick(day.dataset.d); }
  });
  const outside = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = (e) => { if (e.key === 'Escape') { close(); anchor.focus(); } };
  function close() { pop.remove(); document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); calClose = null; }
  setTimeout(() => { document.addEventListener('mousedown', outside); document.addEventListener('keydown', esc); });
  calClose = close;
  (pop.querySelector('.cal-day.sel:not([disabled])') || pop.querySelector('.cal-day:not([disabled])'))?.focus();
}

// Oraliq: bitta kalendarda 1-bosish — boshlanish, 2-bosish — tugash; orasidagi kunlar belgilanadi
export function openRangeCalendar(anchor, { from, to, max = null, onPick }) {
  calClose?.();
  menuClose?.();
  let view = (to || from).slice(0, 7);
  let a = from, b = to, hover = null; // b === null — tugash kutilmoqda
  const pop = document.createElement('div');
  pop.className = 'cal cal-range';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Oraliq tanlash');
  const ok = (d) => !max || d <= max;
  const draw = () => {
    const [y, m] = view.split('-').map(Number);
    const first = `${view}-01`;
    const shift = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    const start = addDays(first, -shift);
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const lastRow = days.slice(35).every((d) => d.slice(0, 7) !== view) ? 35 : 42;
    const prevM = addDays(first, -1).slice(0, 7);
    const nextM = addDays(`${view}-28`, 7).slice(0, 7);
    const end = b ?? hover;
    const lo = end && end < a ? end : a, hi = end && end < a ? a : end;
    const cls = (d) => {
      if (!lo) return '';
      if (d === lo && d === hi) return 'r-one';
      if (d === lo) return 'r-start';
      if (hi && d === hi) return 'r-end';
      return hi && d > lo && d < hi ? 'r-in' : '';
    };
    const days2 = (n) => Math.round((Date.parse(hi) - Date.parse(lo)) / 864e5) + 1;
    pop.innerHTML = `<div class="cal-head">
        <button type="button" class="cal-nav" data-m="${prevM}" aria-label="Oldingi oy">‹</button>
        <b>${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}</b>
        <button type="button" class="cal-nav" data-m="${nextM}" aria-label="Keyingi oy" ${max && `${nextM}-01` > max ? 'disabled' : ''}>›</button></div>
      <p class="cal-hint">${b == null ? '<b>Tugash</b> kunini bosing' : `<b>${shortDate(lo)} – ${shortDate(hi)}</b> · ${days2()} kun · yangi oraliq uchun boshlanish kunini bosing`}</p>
      <div class="cal-grid">${WEEK.map((w) => `<span class="cal-wd">${w}</span>`).join('')}
        ${days.slice(0, lastRow).map((d) => `<button type="button" data-d="${d}" class="cal-day ${d.slice(0, 7) !== view ? 'out' : ''} ${cls(d)}" ${ok(d) ? '' : 'disabled'}>${Number(d.slice(8))}</button>`).join('')}</div>
      ${max ? `<div class="cal-foot"><button type="button" data-preset="7">7 kun</button><button type="button" data-preset="30">30 kun</button><button type="button" data-preset="month">Shu oy</button></div>` : ''}`;
  };
  draw();
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.top = `${r.bottom + window.scrollY + 8}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - w - 8))}px`;
  const done = (x, y) => { close(); onPick(x <= y ? x : y, x <= y ? y : x); };
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = e.target.closest('[data-m]');
    if (nav && !nav.disabled) { view = nav.dataset.m; draw(); return; }
    const pr = e.target.closest('[data-preset]');
    if (pr) {
      if (pr.dataset.preset === 'month') done(`${max.slice(0, 8)}01`, max);
      else done(addDays(max, -(Number(pr.dataset.preset) - 1)), max);
      return;
    }
    const day = e.target.closest('[data-d]');
    if (!day || day.disabled) return;
    if (b == null) done(a, day.dataset.d);
    else { a = day.dataset.d; b = null; hover = null; draw(); pop.querySelector(`[data-d="${a}"]`)?.focus(); }
  });
  pop.addEventListener('mouseover', (e) => {
    const day = e.target.closest('[data-d]');
    if (b == null && day && !day.disabled && day.dataset.d !== hover) { hover = day.dataset.d; draw(); }
  });
  const outside = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const esc = (e) => { if (e.key === 'Escape') { close(); anchor.focus(); } };
  function close() { pop.remove(); document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); calClose = null; }
  setTimeout(() => { document.addEventListener('mousedown', outside); document.addEventListener('keydown', esc); });
  calClose = close;
}

// ---------- Tanlash ro'yxati va rang ----------
// Brauzerning o'z <select> va rang oynasi o'rniga: yashirin input (forma uchun) + tugma + ochiladigan oyna
let menuClose = null;
function openMenu(anchor, html, onPick, cls = '') {
  menuClose?.();
  const pop = document.createElement('div');
  pop.className = `menu-pop ${cls}`;
  pop.setAttribute('role', 'listbox');
  pop.innerHTML = html;
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.minWidth = `${Math.max(r.width, 160)}px`;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const below = r.bottom + h + 8 < window.innerHeight || r.top < h + 8;
  pop.style.top = `${(below ? r.bottom + 6 : r.top - h - 6) + window.scrollY}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - w - 8))}px`;
  pop.addEventListener('click', (e) => {
    const it = e.target.closest('[data-v]');
    if (it) { close(); onPick(it.dataset.v); anchor.focus(); }
  });
  const outside = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const key = (e) => {
    const items = [...pop.querySelectorAll('[data-v]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { close(); anchor.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(i + 1, items.length - 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(i - 1, 0)]?.focus(); }
  };
  function close() { pop.remove(); document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key); menuClose = null; }
  setTimeout(() => { document.addEventListener('mousedown', outside); document.addEventListener('keydown', key); });
  menuClose = close;
  (pop.querySelector('.on') || pop.querySelector('[data-v]'))?.focus();
}

// options: [[qiymat, yozuv], ...]; attrs — yashirin inputga (name / data-f / id)
export function selectHtml(options, value, attrs = '', label = '') {
  const cur = options.find(([v]) => String(v) === String(value)) || options[0];
  return `<span class="sel" data-options='${esc(JSON.stringify(options))}'><input type="hidden" ${attrs} value="${esc(cur[0])}">
    <button type="button" class="sel-btn" aria-haspopup="listbox" aria-label="${esc(label)}"><span>${esc(cur[1])}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button></span>`;
}

export const COLORS = ['#2a78d6', '#3b5bdb', '#7048e8', '#ae3ec9', '#d6336c', '#e8642d', '#f08c00', '#eda100', '#2f9e44', '#1baf7a', '#0c8599', '#495057'];
export function colorHtml(value, attrs = '') {
  return `<span class="color-pick"><input type="hidden" ${attrs} value="${esc(value)}"><button type="button" class="swatch-btn" style="--c:${esc(value)}" aria-label="Rang tanlash"></button></span>`;
}

document.addEventListener('click', (e) => {
  const sb = e.target.closest('.sel-btn');
  if (sb) {
    const wrap = sb.closest('.sel');
    const input = wrap.querySelector('input');
    const options = JSON.parse(wrap.dataset.options);
    openMenu(sb, options.map(([v, l]) => `<button type="button" role="option" data-v="${esc(v)}" class="menu-item ${String(v) === input.value ? 'on' : ''}">${esc(l)}${String(v) === input.value ? '<span class="tick-mark">✓</span>' : ''}</button>`).join(''), (v) => {
      input.value = v;
      sb.querySelector('span').textContent = options.find(([x]) => String(x) === v)[1];
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return;
  }
  const cb = e.target.closest('.swatch-btn');
  if (cb) {
    const input = cb.parentElement.querySelector('input');
    openMenu(cb, `<div class="swatches">${COLORS.map((c) => `<button type="button" data-v="${c}" class="swatch ${c.toLowerCase() === input.value.toLowerCase() ? 'on' : ''}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>`, (v) => {
      input.value = v;
      cb.style.setProperty('--c', v);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, 'color-menu');
  }
});

export const TIMES = Array.from({ length: 36 }, (_, i) => { const m = 6 * 60 + i * 30; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}`; });

// ---------- Davr filtri ----------
// Raqamlar kechagi kun uchun kiritiladi — hamma davrlar kechadan orqaga hisoblanadi
const PERIODS = [['y', 'Kecha'], ['y2', 'Kechadan oldin'], ['y3', '3 kun oldin'], ['7', 'Hafta'], ['month', 'Oy'], ['custom', 'Oraliq']];
export function computePeriod() {
  const t = state.me.reportDay;
  if (!PERIODS.some(([v]) => v === state.period)) state.period = 'y';
  if (state.period === 'custom' && state.from && state.to) return { from: state.from, to: state.to };
  if (state.period === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
  if (state.period === 'y') return { from: t, to: t };
  if (state.period === 'y2') { const d = addDays(t, -1); return { from: d, to: d }; }
  if (state.period === 'y3') { const d = addDays(t, -2); return { from: d, to: d }; }
  return { from: addDays(t, -6), to: t };
}
export function filtersHtml() {
  const opts = PERIODS;
  const { from, to } = computePeriod();
  return `<div class="filters">
    <div class="seg" id="periodSeg" role="group" aria-label="Davr">${opts.map(([v, l]) => `<button data-v="${v}" class="${state.period === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${state.period === 'custom' ? `<button type="button" class="date-btn range-btn" id="fRange" aria-haspopup="dialog" aria-label="Oraliq: ${prettyDate(from)} — ${prettyDate(to)}">${ICONS.cal}<span>${shortDate(from)} — ${shortDate(to)}</span></button>` : ''}
  </div>`;
}
export function bindFilters(rerenderPage) {
  $('#periodSeg').onclick = (e) => {
    const v = e.target.dataset.v;
    if (!v) return;
    const first = v === 'custom' && state.period !== 'custom';
    if (v === 'custom' && !state.from) Object.assign(state, computePeriod());
    state.period = v;
    rerenderPage();
    // «Oraliq» bosilganda kalendar darhol ochiladi
    if (first) setTimeout(() => $('#fRange')?.click(), 60);
  };
  const rb = $('#fRange');
  if (rb) {
    const { from, to } = computePeriod();
    rb.onclick = () => openRangeCalendar(rb, { from, to, max: state.me.reportDay, onPick: (a, b) => { state.from = a; state.to = b; rerenderPage(); } });
  }
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
    ['#/', 'Loyihalar', ICONS.chart],
    ['#/kiritish', 'Kechagi hisobot', ICONS.edit, sent ? null : '!'],
    ['#/dinamika', 'Dinamika', ICONS.trend],
    ['#/hisobotlar', 'Hisobotlar', ICONS.archive],
  ];
  return { items, bottom: [['#/sozlamalar', 'Sozlamalar', ICONS.set]] };
}

const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const dayLabel = (d) => `${Number(d.slice(8, 10))}-${MONTHS[Number(d.slice(5, 7)) - 1]}, ${WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]}`;

// Har bir sahifa chizilishi raqamlanadi: kechikkan (eskirgan) so'rov natijasi yangi sahifaga yozilmaydi
export const isStale = (rid) => rid !== state.renderId;

export function shell(content) {
  state.renderId = (state.renderId || 0) + 1;
  calClose?.();
  menuClose?.();
  destroyCharts();
  const route = location.hash.split('?')[0] || '#/';
  const { items, bottom } = navItems();
  const active = (href) => route === href || (href !== '#/' && route.startsWith(href)) || (href === '#/' && route.startsWith('#/loyiha/'));
  const link = ([href, label, icon, badge]) => `<a href="${href}" class="${active(href) ? 'active' : ''}" title="${label}"><span class="ic">${icon}</span><span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
  const u = state.me.user;
  const mobileItems = [...items, ...bottom];
  app().innerHTML = `
    <div class="mobile-top"><span class="logo"><span class="logo-mark">${ICONS.logo}</span>Analitika</span>
      <button id="logoutM" aria-label="Chiqish" title="Chiqish">${ICONS.logout.replace('<svg', '<svg width="18" height="18"')}</button></div>
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><span class="logo-mark">${ICONS.logo}</span><span>Analitika<small>kunlik hisobot</small></span></div>
        <nav class="nav" aria-label="Asosiy">${items.map(link).join('')}</nav>
        <div class="side-foot">
          <nav class="nav">${bottom.map(link).join('')}</nav>
          <a class="side-user" href="#/sozlamalar?tab=profil" style="text-decoration:none"><span class="avatar">${esc(initials(u.name))}</span><span>${esc(u.name)}<small>Proekt menejer</small></span></a>

        </div>
      </aside>
      <main class="main" id="main">
        <div class="topbar">
          <div class="crumbs"><span class="pill">${ICONS.cal.replace('<svg', '<svg width="13" height="13"')} ${dayLabel(state.me.today)}</span>${window.DEMO ? demoMenu() : ''}</div>
          <div class="top-actions">
            <button class="btn small ghost" id="logout">Chiqish</button>
            <a class="avatar" href="#/sozlamalar?tab=profil" style="width:42px;height:42px;text-decoration:none" title="Profil">${esc(initials(u.name))}</a>
          </div>
        </div>
        ${window.DEMO ? `<div class="demo-mobile">${demoMenu()}</div>` : ''}${content}
      </main>
    </div>
    <nav class="mobile-nav" style="--n:${mobileItems.length}">${mobileItems.map(link).join('')}</nav>`;
  $('#logout').onclick = $('#logoutM').onclick = async () => {
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
  state.meAt = Date.now();
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
  state.meAt = Date.now();
}

// Ilova uzoq ochiq tursa (telefonda — kunlab) «bugun» va «kecha» eskiradi: 5 daqiqadan eski bo'lsa qayta olinadi.
// true — kun almashgan (sahifani qayta chizish kerak)
export async function syncDay(maxAge = 5 * 60e3) {
  if (!state.me || Date.now() - (state.meAt || 0) < maxAge) return false;
  const before = state.me.today;
  await refreshMe().catch(() => {});
  return Boolean(state.me) && state.me.today !== before;
}
