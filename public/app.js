// Loyihalar analitikasi — mijoz ilovasi (framework'siz, hash-router)
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const state = { me: null, projects: [], period: '7', from: null, to: null, project: '', charts: [] };

// ---------- Yordamchilar ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = (x, d = 0) => (x == null || Number.isNaN(x) ? '—' : Number(x).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/,/g, '.'));
const fmtUsd = (x, d = 2) => (x == null ? '—' : `$${fmtN(x, d)}`);
const fmtUzs = (x) => {
  if (x == null) return '—';
  if (Math.abs(x) >= 1e9) return `${fmtN(x / 1e9, 2)} mlrd`;
  if (Math.abs(x) >= 1e6) return `${fmtN(x / 1e6, 1)} mln`;
  return fmtN(x);
};
const fmtP = (x, d = 1) => (x == null ? '—' : `${fmtN(x * 100, d)}%`);
const addDays = (date, n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'content-type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (res.status === 401 && path !== '/api/login') { state.me = null; renderLogin(); throw new Error(data.error); }
  if (!res.ok) throw new Error(data.error || 'Xatolik');
  return data;
}

let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `show${err ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 3200);
}

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function destroyCharts() { state.charts.forEach((c) => c.destroy()); state.charts = []; }

const ICONS = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  entry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8Z"/></svg>',
  set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M5 19v-6M10 19V6M15 19v-5M20 19V9"/></svg>',
};

// ---------- Kirish ----------
function renderLogin() {
  destroyCharts();
  app.innerHTML = `
    <div class="login"><form class="card" id="loginForm">
      <div class="logo" style="padding:0"><span class="logo-mark">${ICONS.logo}</span> Loyihalar analitikasi</div>
      <p class="muted small" style="margin:0">Kunlik hisobot va voronka tahlili. Tizimga kiring.</p>
      <label class="field">Login<input name="login" autocomplete="username" required autofocus></label>
      <label class="field">Parol<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="error" id="loginErr"></div>
      <button class="btn primary" style="justify-content:center">Kirish</button>
    </form></div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/login', { method: 'POST', body: { login: f.get('login'), password: f.get('password') } });
      await boot();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
}

// ---------- Karkas ----------
function navItems() {
  const items = [
    ['#/', 'Bosh panel', ICONS.dash],
    ['#/kiritish', 'Kunlik hisobot', ICONS.entry],
    ['#/ai', 'AI tahlil', ICONS.ai],
  ];
  if (state.me.user.role === 'admin') items.push(['#/sozlamalar', 'Sozlamalar', ICONS.set]);
  return items;
}

function shell(content) {
  destroyCharts();
  const route = location.hash.split('?')[0] || '#/';
  const items = navItems();
  const link = ([href, label, icon]) => `<a href="${href}" class="${route === href ? 'active' : ''}">${icon}<span>${label}</span></a>`;
  const u = state.me.user;
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><span class="logo-mark">${ICONS.logo}</span> Analitika</div>
        <nav class="nav">${items.map(link).join('')}</nav>
        <div class="me"><b>${esc(u.name)}</b><span class="muted">${esc(state.me.roles[u.role])}</span>
          <div style="margin-top:8px"><button class="btn small ghost" id="logout" style="padding-left:0">Chiqish</button></div></div>
      </aside>
      <main class="main" id="main">${content}</main>
    </div>
    <nav class="mobile-nav" style="--n:${items.length}">${items.map(link).join('')}</nav>`;
  $('#logout').onclick = async () => { await api('/api/logout', { method: 'POST', body: {} }); renderLogin(); };
}

// ---------- Davr tanlash ----------
function computePeriod() {
  const t = state.me.today;
  if (state.period === 'custom' && state.from && state.to) return { from: state.from, to: state.to };
  if (state.period === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
  if (state.period === '1') return { from: t, to: t };
  if (state.period === 'y') { const y = addDays(t, -1); return { from: y, to: y }; }
  const n = Number(state.period) || 7;
  return { from: addDays(t, -(n - 1)), to: t };
}

function filtersHtml() {
  const opts = [['1', 'Bugun'], ['y', 'Kecha'], ['7', '7 kun'], ['30', '30 kun'], ['month', 'Shu oy'], ['custom', 'Oraliq']];
  const { from, to } = computePeriod();
  return `<div class="filters">
    <div class="seg" id="periodSeg">${opts.map(([v, l]) => `<button data-v="${v}" class="${state.period === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${state.period === 'custom' ? `<input type="date" id="fFrom" value="${from}"><input type="date" id="fTo" value="${to}">` : ''}
    <select id="fProject"><option value="">Barcha loyihalar</option>${state.projects.filter((p) => p.active).map((p) => `<option value="${p.id}" ${String(state.project) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
  </div>`;
}

function bindFilters(rerender) {
  $('#periodSeg').onclick = (e) => {
    const v = e.target.dataset.v;
    if (!v) return;
    if (v === 'custom' && !state.from) Object.assign(state, computePeriod());
    state.period = v;
    rerender();
  };
  $('#fProject').onchange = (e) => { state.project = e.target.value; rerender(); };
  const f = $('#fFrom'), t = $('#fTo');
  if (f) f.onchange = t.onchange = () => { state.from = f.value; state.to = t.value; rerender(); };
}

// ---------- Bosh panel ----------
function delta(v, invert = false) {
  if (v == null) return '<span class="delta flat">— oldingi davr</span>';
  const good = invert ? v < 0 : v > 0;
  const cls = Math.abs(v) < 0.005 ? 'flat' : good ? 'up' : 'down';
  return `<span class="delta ${cls}">${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${fmtP(Math.abs(v))}</span>`;
}

function kpi(label, value, sub, d, invert) {
  return `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${d !== undefined ? delta(d, invert) : ''}</div>`;
}

function funnelHtml(t) {
  const max = Math.max(t.starts, t.clicks, 1);
  const w = (x) => `${Math.max((x / max) * 100, x > 0 ? 1 : 0)}%`;
  const row = (label, value, bar, conv, convLabel) => `
    <div class="f-row"><div class="f-label">${label}${value !== '' ? `<b class="num">${fmtN(value)}</b>` : ''}</div><div class="f-track">${bar}</div>
    <div class="f-conv">${conv ?? ''}${convLabel ? `<small>${convLabel}</small>` : ''}</div></div>`;
  const simple = (x, color = 'var(--series-1)') => `<div class="f-bar" style="width:${w(x)};background:${color}"></div>`;
  const ads = Math.min(t.clicks, t.starts);
  const startsBar = t.organic != null
    ? `<div class="f-split" style="width:${w(t.starts)}"><div class="f-bar" style="width:${(ads / t.starts) * 100}%" title="Reklama: ${fmtN(ads)}"></div><div class="f-bar organic" style="width:${(t.organic / t.starts) * 100}%" title="Organik: ${fmtN(t.organic)}"></div></div>`
    : simple(t.starts);
  return `<div class="funnel">
    ${row('Xarajat', '', `<div class="f-bar" style="width:100%;background:var(--surface-2);color:var(--text)">${fmtUsd(t.spend)} · ${fmtN(t.spend_uzs / 1e6, 1)} mln so'm</div>`, '', '')}
    ${row('Kliklar', t.clicks, simple(t.clicks), fmtUsd(t.cpc, 3), 'klik narxi')}
    ${row('Bot start', t.starts, startsBar, fmtP(t.click_to_start, 0), t.organic != null ? `organik ${fmtN(t.organic)}` : 'klik → start')}
    ${row('Lidlar', t.leads, simple(t.leads), fmtP(t.start_to_lead), 'start → lid')}
    ${row('Sotuvlar', t.sales, simple(t.sales, 'var(--series-4)'), fmtP(t.lead_to_sale), 'lid → sotuv')}
  </div>
  <div class="legend"><span><i style="background:var(--series-1)"></i>Reklama orqali</span><span><i style="background:var(--series-3)"></i>Organik (start − klik)</span><span><i style="background:var(--series-4)"></i>Sotuv</span></div>`;
}

const PROJECT_COLS = [
  ['name', 'Loyiha', (p) => `<span class="dot" style="background:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}`],
  ['spend', 'Xarajat', (p) => fmtUsd(p.spend, 0), 1],
  ['clicks', 'Klik', (p) => fmtN(p.clicks), 1],
  ['starts', 'Start', (p) => fmtN(p.starts), 1],
  ['organic', 'Organik', (p) => (p.organic == null ? '—' : `${fmtN(p.organic)} <span class="muted small">${fmtP(p.organic_share, 0)}</span>`), 1],
  ['leads', 'Lid', (p) => fmtN(p.leads), 1],
  ['cpl', 'Lid narxi', (p) => fmtUsd(p.cpl), 1],
  ['sales', 'Sotuv', (p) => fmtN(p.sales), 1],
  ['lead_to_sale', 'Lid→sotuv', (p) => convPill(p.lead_to_sale), 1],
  ['start_to_sale', 'Start→sotuv', (p) => fmtP(p.start_to_sale), 1],
  ['total_revenue', "Tushum, so'm", (p) => fmtUzs(p.total_revenue), 1],
  ['roas', 'ROAS', (p) => (p.roas == null ? '—' : `<span class="pill ${p.roas >= 3 ? 'good' : p.roas >= 1 ? 'warn' : 'crit'}">${fmtN(p.roas, 2)}</span>`), 1],
  ['ltv', 'LTV', (p) => fmtUzs(p.ltv), 1],
  ['growth', "Lid o'sishi", (p) => delta(p.growth.leads).replace('delta', 'delta" style="margin:0'), 1],
];
let sortKey = 'total_revenue', sortDir = -1;

function convPill(x) {
  if (x == null) return '—';
  const avg = state.lastSummary?.totals.lead_to_sale;
  const cls = avg ? (x < avg * 0.6 ? 'crit' : x < avg * 0.9 ? 'warn' : 'good') : '';
  return `<span class="pill ${cls}">${fmtP(x)}</span>`;
}

function projectTable(list) {
  const val = (p) => (sortKey === 'growth' ? p.growth.leads ?? -Infinity : sortKey === 'name' ? p.name : p[sortKey] ?? -Infinity);
  const rows = [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sortDir);
  return `<div class="table-wrap"><table id="projTable"><thead><tr>${PROJECT_COLS.map(([k, l, , n]) => `<th class="${n ? 'n' : ''}" data-k="${k}">${l}${sortKey === k ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((p) => `<tr data-id="${p.id}" style="cursor:pointer">${PROJECT_COLS.map(([, , f, n]) => `<td class="${n ? 'n' : ''}">${f(p)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${PROJECT_COLS.length}" class="empty">Loyihalar yo'q</td></tr>`}</tbody></table></div>`;
}

async function renderDashboard() {
  shell(`<div class="page-head"><h1>Bosh panel</h1>${filtersHtml()}</div><div id="dash"><div class="empty"><div class="spinner" style="margin:auto"></div></div></div>`);
  bindFilters(renderDashboard);
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to, ...(state.project ? { project: state.project } : {}) });
  let s;
  try { s = await api(`/api/summary?${q}`); } catch (e) { $('#dash').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  state.lastSummary = s;
  const t = s.totals, d = s.delta;
  const box = $('#dash');
  if (!box) return;
  const ins = { critical: 'Muhim', warning: 'Diqqat', good: 'Yaxshi', info: 'Ma\'lumot' };
  box.innerHTML = `
    <p class="muted small" style="margin:-8px 0 14px">${from === to ? from : `${from} — ${to}`} · oldingi davr bilan solishtirilgan (${s.prevFrom} — ${s.prevTo})</p>
    <div class="kpis">
      ${kpi('Reklama xarajati', fmtUsd(t.spend, 0), `${fmtUzs(t.spend_uzs)} so'm`, d.spend, true)}
      ${kpi('Kliklar', fmtN(t.clicks), `CPC ${fmtUsd(t.cpc, 3)}`, d.clicks)}
      ${kpi('Bot start', fmtN(t.starts), t.organic != null ? `organik ${fmtN(t.organic)} (${fmtP(t.organic_share, 0)})` : '', d.starts)}
      ${kpi('Lidlar', fmtN(t.leads), `lid narxi ${fmtUsd(t.cpl)}`, d.leads)}
      ${kpi('Sotuvlar', fmtN(t.sales), `lid→sotuv ${fmtP(t.lead_to_sale)}`, d.sales)}
      ${kpi('Tushum', `${fmtUzs(t.total_revenue)}`, `so'm · o'rtacha chek ${fmtUzs(t.avg_check)}`, d.total_revenue)}
      ${kpi('ROAS', t.roas == null ? '—' : fmtN(t.roas, 2), t.roi == null ? '' : `ROI ${fmtP(t.roi, 0)}`, d.roas)}
      ${kpi('LTV (1 mijoz)', fmtUzs(t.ltv), `CAC ${fmtUsd(t.cac)}`, d.ltv)}
    </div>
    <div class="grid g2">
      <div class="card"><div class="card-head"><h2>Voronka</h2><span class="muted small">${s.days} kun</span></div>${funnelHtml(t)}</div>
      <div class="card"><div class="card-head"><h2>Xulosalar</h2><a href="#/ai" class="small">AI tahlil →</a></div>
        <div class="insights">${s.insights.map((i) => `<div class="insight ${i.level}"><span class="ic">${ins[i.level]}</span><span>${esc(i.text)}</span></div>`).join('') || '<div class="muted">Hozircha ogohlantirish yo\'q.</div>'}</div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h2>Loyihalar taqqoslash</h2>
      <a class="btn small" href="/api/export.csv?${q}">CSV yuklab olish</a></div>${projectTable(s.byProject)}</div>
    <div class="grid g3" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>Kliklar va organik startlar</h2></div><div class="chart-box"><canvas id="chTraffic" aria-label="Kunlik reklama kliklari va organik startlar"></canvas></div></div>
      <div class="card"><div class="card-head"><h2>Lidlar</h2><span class="muted small">kunlik</span></div><div class="chart-box"><canvas id="chLeads" aria-label="Kunlik lidlar"></canvas></div></div>
      <div class="card"><div class="card-head"><h2>Sotuvlar</h2><span class="muted small">kunlik</span></div><div class="chart-box"><canvas id="chSales" aria-label="Kunlik sotuvlar"></canvas></div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>Lid → sotuv konversiyasi</h2><span class="muted small">loyihalar bo'yicha</span></div><div class="chart-box"><canvas id="chConv" aria-label="Loyihalar bo'yicha konversiya"></canvas></div></div>
      <div class="card"><div class="card-head"><h2>Nega sotib olmadi?</h2><span class="muted small">menejerlar kiritgan sabablar</span></div>${reasonsHtml(s.reasons)}</div>
    </div>
    ${s.notes.length ? `<div class="card" style="margin-top:14px"><div class="card-head"><h2>Menejerlar izohlari</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Sana</th><th>Loyiha</th><th>Izoh</th></tr></thead><tbody>
      ${s.notes.map((n) => `<tr><td>${n.date}</td><td>${esc(n.project)}</td><td style="white-space:normal">${[['Target', n.target], ['Lid', n.lead], ['Sotuv', n.sales], ['Moliya', n.finance]].filter((x) => x[1]).map(([r, x]) => `<b>${r}:</b> ${esc(x)}`).join('<br>')}</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}`;

  renderDashboardTableHandlers(s);
  drawCharts(s);
}

function renderDashboardTableHandlers(s) {
  $('#projTable tbody').onclick = (e) => {
    const id = e.target.closest('tr')?.dataset.id;
    if (id) { state.project = id; renderDashboard(); window.scrollTo(0, 0); }
  };
  $('#projTable thead').onclick = (e) => {
    const k = e.target.closest('th')?.dataset.k;
    if (!k) return;
    sortDir = sortKey === k ? -sortDir : -1;
    sortKey = k;
    $('#projTable').outerHTML = projectTable(s.byProject);
    renderDashboardTableHandlers(s);
  };
}

function reasonsHtml(reasons) {
  if (!reasons.length) return '<div class="muted">Sabablar hali kiritilmagan. Lid va sotuv menejerlari «Kunlik hisobot» sahifasida kiritadi.</div>';
  const total = reasons.reduce((a, r) => a + r.count, 0);
  const max = reasons[0].count;
  return `<div class="hbars">${reasons.map((r) => `<div class="hbar"><span>${esc(r.label)}</span><div class="t"><div class="b" style="width:${(r.count / max) * 100}%"></div></div><span class="num muted" title="${fmtN(r.count)} ta">${fmtP(r.count / total, 0)}</span></div>`).join('')}</div>`;
}

function drawCharts(s) {
  if (!window.Chart) return;
  const text2 = cssVar('--text-2'), grid = cssVar('--border'), surface = cssVar('--surface');
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = text2;
  const labels = s.series.map((d) => d.date.slice(5).split('-').reverse().join('.'));
  const base = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
      tooltip: { backgroundColor: cssVar('--text'), titleColor: surface, bodyColor: surface, padding: 10, boxPadding: 4 } },
    scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }, y: { beginAtZero: true, grid: { color: grid }, border: { display: false } } },
  };
  const line = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: s.series.length > 20 ? 0 : 3, pointHoverRadius: 5, tension: 0.25 });
  const c1 = $('#chLeads'), c2 = $('#chTraffic'), c3 = $('#chConv'), c4 = $('#chSales');
  const single = { ...base, plugins: { ...base.plugins, legend: { display: false } } };
  if (c1) state.charts.push(new Chart(c1, { type: 'line', data: { labels, datasets: [line('Lidlar', s.series.map((d) => d.leads), cssVar('--series-1'))] }, options: single }));
  if (c4) state.charts.push(new Chart(c4, { type: 'line', data: { labels, datasets: [line('Sotuvlar', s.series.map((d) => d.sales), cssVar('--series-4'))] }, options: single }));
  if (c2) state.charts.push(new Chart(c2, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Reklama kliklari', data: s.series.map((d) => d.clicks), backgroundColor: cssVar('--series-1'), borderRadius: 4, borderSkipped: 'bottom', stack: 's' },
      { label: 'Organik startlar', data: s.series.map((d) => d.organic), backgroundColor: cssVar('--series-3'), borderRadius: 4, borderSkipped: 'bottom', stack: 's' },
    ] },
    options: { ...base, scales: { ...base.scales, x: { ...base.scales.x, stacked: true }, y: { ...base.scales.y, stacked: true } } },
  }));
  if (c3) {
    const ps = s.byProject.filter((p) => p.lead_to_sale != null);
    state.charts.push(new Chart(c3, {
      type: 'bar',
      data: { labels: ps.map((p) => p.name), datasets: [{ label: 'Lid → sotuv', data: ps.map((p) => +(p.lead_to_sale * 100).toFixed(2)), backgroundColor: ps.map((p, i) => p.color || cssVar(`--series-${(i % 4) + 1}`)), borderRadius: 4, maxBarThickness: 36 }] },
      options: { ...base, indexAxis: 'y', plugins: { ...base.plugins, legend: { display: false }, tooltip: { ...base.plugins.tooltip, callbacks: { label: (c) => ` ${c.raw}%` } } },
        scales: { x: { beginAtZero: true, grid: { color: grid }, ticks: { callback: (v) => `${v}%` } }, y: { grid: { display: false } } } },
    }));
  }
}

// ---------- Kunlik hisobot kiritish ----------
let entryDate = null;
async function renderEntry() {
  entryDate ||= state.me.today;
  const role = state.me.user.role;
  shell(`<div class="page-head"><h1>Kunlik hisobot</h1>
    <div class="filters"><button class="btn small" id="prevDay">←</button><input type="date" id="eDate" value="${entryDate}" max="${state.me.today}"><button class="btn small" id="nextDay">→</button></div></div>
    <div id="entry"><div class="empty"><div class="spinner" style="margin:auto"></div></div></div>`);
  $('#eDate').onchange = (e) => { entryDate = e.target.value; renderEntry(); };
  $('#prevDay').onclick = () => { entryDate = addDays(entryDate, -1); renderEntry(); };
  $('#nextDay').onclick = () => { if (entryDate < state.me.today) { entryDate = addDays(entryDate, 1); renderEntry(); } };
  const data = await api(`/api/daily?date=${entryDate}`);
  const { fields, noteFields, reasons, roles } = state.me;
  const myRoles = role === 'admin' ? ['target', 'lead', 'sales', 'finance'] : [role];
  const mine = data.missing.filter((m) => myRoles.includes(m.role));
  const pending = mine.filter((m) => !m.filled);

  const fieldInput = (p, f) => {
    const def = fields[f];
    const auto = f === 'bot_starts' && p.row.auto_start > 0;
    const who = p.updatedBy[f];
    return `<label class="field">${esc(def.label)}${auto ? ` <span class="auto">· bot: ${fmtN(p.row.auto_start)}</span>` : ''}
      <input inputmode="decimal" name="${f}" value="${p.row[f] ?? ''}" placeholder="0">
      ${who ? `<span class="who">${esc(who.name)} · ${who.at.slice(11, 16)}</span>` : ''}</label>`;
  };
  const roleBlock = (p, r) => {
    const fs = Object.keys(fields).filter((f) => fields[f].role === r);
    const note = Object.keys(noteFields).find((k) => noteFields[k] === r);
    return `<div class="role-block"><h3>${esc(roles[r])}</h3><div class="fields">${fs.map((f) => fieldInput(p, f)).join('')}</div>
      <label class="field" style="margin-top:10px">Izoh${r === 'sales' || r === 'lead' ? ' (nega sotuv past/yuqori?)' : ''}<textarea name="${note}" rows="2" placeholder="Ixtiyoriy">${esc(p.row[note] ?? '')}</textarea></label></div>`;
  };
  const reasonsBlock = (p) => (['admin', 'lead', 'sales'].includes(role) ? `
    <details ${Object.keys(p.reasons).length ? 'open' : ''}><summary>Sotib olmaslik sabablari (${Object.values(p.reasons).reduce((a, b) => a + b, 0) || 0})</summary>
      <div class="fields" style="margin-top:10px">${Object.entries(reasons).map(([k, l]) => `<label class="field">${esc(l)}<input inputmode="numeric" data-reason="${k}" value="${p.reasons[k] ?? ''}" placeholder="0"></label>`).join('')}</div>
    </details>` : '');

  $('#entry').innerHTML = `
    <div class="card" style="margin-bottom:14px"><div class="card-head"><h2>${pending.length ? `Kiritilmagan: ${pending.length}` : 'Hammasi kiritilgan ✓'}</h2><span class="muted small">${entryDate}</span></div>
      <div class="checklist">${mine.map((m) => `<span class="pill ${m.filled ? 'good' : 'warn'}">${m.filled ? '✓' : '⏳'} ${esc(m.project)}${role === 'admin' ? ` · ${esc(m.role_label)}` : ''}</span>`).join('') || '<span class="muted">Loyihalar yo\'q</span>'}</div></div>
    <div class="stack">${data.projects.map((p) => `
      <form class="card entry-card" data-id="${p.id}">
        <div class="head"><h2><span class="dot" style="background:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}</h2>
          <span class="muted small">Bot havolasi: <span class="code">?start=${esc(p.slug)}</span></span></div>
        ${myRoles.map((r) => roleBlock(p, r)).join('')}
        ${reasonsBlock(p)}
        <div><button class="btn primary">Saqlash</button></div>
      </form>`).join('') || '<div class="card empty">Hali loyiha qo\'shilmagan. Rahbar «Sozlamalar» bo\'limida loyiha qo\'shadi.</div>'}</div>`;

  $('#entry').querySelectorAll('form.entry-card').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const values = {};
      form.querySelectorAll('input[name], textarea[name]').forEach((el) => { values[el.name] = el.value; });
      const rs = {};
      form.querySelectorAll('input[data-reason]').forEach((el) => { rs[el.dataset.reason] = el.value; });
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await api('/api/daily', { method: 'PUT', body: { project_id: Number(form.dataset.id), date: entryDate, values, reasons: rs } });
        toast('Saqlandi ✓');
        renderEntry();
      } catch (err) { toast(err.message, true); btn.disabled = false; }
    };
  });
}

// ---------- AI tahlil ----------
function md(src) {
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
    else if (!l.trim()) { flushList(); }
    else { flushList(); html += `<p>${inline(l)}</p>`; }
  }
  flushList(); flushTable();
  return html;
}

async function renderAI() {
  shell(`<div class="page-head"><h1>AI tahlil</h1>${filtersHtml()}</div>
    <div class="grid g3">
      <div class="span2 stack">
        <div class="card stack">
          ${state.me.ai ? '' : '<div class="insight warning"><span class="ic">Diqqat</span><span>AI ulanmagan. Serverda <span class="code">ANTHROPIC_API_KEY</span> o\'rnatilishi kerak (README ga qarang). Qoidaga asoslangan xulosalar Bosh panelda ishlayveradi.</span></div>'}
          <label class="field">Savol (ixtiyoriy)<textarea id="aiQ" rows="3" placeholder="Masalan: Nega SMM kursida lid ko'p, sotuv past? Qaysi kursga byudjetni oshirish kerak?"></textarea></label>
          <div class="filters"><button class="btn primary" id="aiRun" ${state.me.ai ? '' : 'disabled'}>${ICONS.ai.replace('<svg', '<svg width="16" height="16"')} Tahlil qilish</button>
            <span class="muted small">Tanlangan davr va loyiha bo'yicha voronka, o'sish, sabablar va izohlar tahlil qilinadi.</span></div>
        </div>
        <div class="card" id="aiOut"><div class="muted">Natija shu yerda chiqadi.</div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Tarix</h2></div><div id="aiHist"><div class="muted">Yuklanmoqda…</div></div></div>
    </div>`);
  bindFilters(renderAI);
  const hist = await api('/api/ai/reports').catch(() => []);
  const showReport = (r) => { $('#aiOut').innerHTML = `<div class="muted small" style="margin-bottom:8px">${r.date_from} — ${r.date_to}${r.question ? ` · «${esc(r.question)}»` : ''}</div><div class="md">${md(r.content)}</div>`; };
  $('#aiHist').innerHTML = hist.length ? hist.map((r, i) => `<div class="history-item" data-i="${i}"><b class="small">${r.date_from} — ${r.date_to}</b><div class="muted small">${esc(r.question || (r.kind === 'daily' ? 'Kunlik avto-tahlil' : 'Umumiy tahlil'))}</div><div class="muted small">${esc(r.user_name || 'Tizim')} · ${r.created_at.slice(0, 16)}</div></div>`).join('') : '<div class="muted small">Hali tahlil qilinmagan.</div>';
  $('#aiHist').onclick = (e) => { const i = e.target.closest('.history-item')?.dataset.i; if (i != null) showReport(hist[i]); };
  $('#aiRun').onclick = async () => {
    const { from, to } = computePeriod();
    const btn = $('#aiRun');
    btn.disabled = true;
    $('#aiOut').innerHTML = '<div class="filters"><div class="spinner"></div><span class="muted">AI ma\'lumotlarni tahlil qilmoqda… (30–90 soniya)</span></div>';
    try {
      const r = await api('/api/ai/analyze', { method: 'POST', body: { from, to, project: state.project || null, question: $('#aiQ').value } });
      showReport({ ...r, date_from: r.from, date_to: r.to });
    } catch (e) { $('#aiOut').innerHTML = `<div class="insight critical"><span class="ic">Xato</span><span>${esc(e.message)}</span></div>`; }
    btn.disabled = false;
  };
}

// ---------- Sozlamalar (admin) ----------
let settingsTab = 'projects';
async function renderSettings() {
  if (state.me.user.role !== 'admin') { location.hash = '#/'; return; }
  const tabs = [['projects', 'Loyihalar'], ['users', 'Xodimlar'], ['telegram', 'Telegram va hisobot'], ['audit', "O'zgarishlar tarixi"]];
  shell(`<div class="page-head"><h1>Sozlamalar</h1></div>
    <div class="tabs" id="sTabs">${tabs.map(([k, l]) => `<button data-k="${k}" class="${settingsTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="sBody"><div class="spinner"></div></div>`);
  $('#sTabs').onclick = (e) => { if (e.target.dataset.k) { settingsTab = e.target.dataset.k; renderSettings(); } };
  const body = $('#sBody');
  const settings = await api('/api/settings');
  const bot = settings.telegram.bot;

  if (settingsTab === 'projects') {
    state.projects = await api('/api/projects');
    body.innerHTML = `
      <form class="card stack" id="newProject" style="margin-bottom:14px"><h2>Yangi loyiha / kurs</h2>
        <div class="fields">
          <label class="field">Nomi<input name="name" required placeholder="IELTS Intensiv"></label>
          <label class="field">Identifikator (lotin)<input name="slug" placeholder="ielts"></label>
          <label class="field">Turi<select name="kind"><option value="kurs">Kurs</option><option value="loyiha">Loyiha</option><option value="kanal">Kanal</option></select></label>
          <label class="field">Rang<input name="color" type="color" value="#2a78d6"></label>
        </div><div><button class="btn primary">Qo'shish</button></div></form>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Loyiha</th><th>Bot havolasi</th><th>Kanal ID</th><th>Tracking kaliti</th><th>Holat</th><th></th></tr></thead><tbody>
      ${state.projects.map((p) => `<tr data-id="${p.id}">
        <td><span class="dot" style="background:${esc(p.color || '#2a78d6')}"></span><b>${esc(p.name)}</b><div class="muted small">${esc(p.kind)}</div></td>
        <td><span class="code">${bot ? `t.me/${esc(bot)}?start=${esc(p.slug)}` : `?start=${esc(p.slug)}`}</span></td>
        <td><input data-f="channel_id" value="${esc(p.channel_id || '')}" placeholder="-100…" style="width:150px"></td>
        <td><span class="code">${esc(p.track_key)}</span></td>
        <td>${p.active ? '<span class="pill good">Faol</span>' : '<span class="pill">Arxiv</span>'}</td>
        <td><button class="btn small" data-a="save">Saqlash</button> <button class="btn small ghost" data-a="toggle">${p.active ? 'Arxivlash' : 'Tiklash'}</button></td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted small">Bot havolasini reklama postlariga qo'ying — kim qaysi loyihadan /start bosgani avtomatik sanaladi. Manbani ajratish uchun: <span class="code">?start=slug__post12</span>.
      Kanal a'zolarini sanash uchun botni kanalga admin qilib qo'shing va Kanal ID ni kiriting (Telegram va hisobot bo'limida ko'rinadi).</p></div>`;
    $('#newProject').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/projects', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast("Loyiha qo'shildi"); renderSettings(); } catch (err) { toast(err.message, true); }
    };
    body.querySelector('tbody').onclick = async (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      const tr = e.target.closest('tr');
      const p = state.projects.find((x) => String(x.id) === tr.dataset.id);
      const b = a === 'toggle' ? { active: !p.active } : { channel_id: tr.querySelector('[data-f=channel_id]').value };
      try { await api(`/api/projects/${p.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
    };
  }

  if (settingsTab === 'users') {
    const users = await api('/api/users');
    const roleOpts = (sel) => Object.entries(state.me.roles).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
    body.innerHTML = `
      <form class="card stack" id="newUser" style="margin-bottom:14px"><h2>Yangi xodim</h2>
        <div class="fields">
          <label class="field">Ism<input name="name" required placeholder="Fotima"></label>
          <label class="field">Login<input name="login" required placeholder="fotima"></label>
          <label class="field">Parol<input name="password" required minlength="6" type="text"></label>
          <label class="field">Rol<select name="role">${roleOpts('lead')}</select></label>
          <label class="field">Telegram ID<input name="telegram_id" placeholder="botga /id yozing"></label>
        </div><div><button class="btn primary">Qo'shish</button></div></form>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Ism</th><th>Login</th><th>Rol</th><th>Telegram ID</th><th>Yangi parol</th><th>Holat</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr data-id="${u.id}"><td><input data-f="name" value="${esc(u.name)}" style="width:140px"></td><td>${esc(u.login)}</td>
        <td><select data-f="role">${roleOpts(u.role)}</select></td>
        <td><input data-f="telegram_id" value="${esc(u.telegram_id || '')}" style="width:130px"></td>
        <td><input data-f="password" placeholder="o'zgartirmaslik" style="width:140px"></td>
        <td>${u.active ? '<span class="pill good">Faol</span>' : '<span class="pill">O\'chirilgan</span>'}</td>
        <td><button class="btn small" data-a="save">Saqlash</button> <button class="btn small ghost" data-a="toggle">${u.active ? "O'chirish" : 'Yoqish'}</button></td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted small">Rollar: Targetolog — xarajat va kliklar; Lid menejeri — lidlar va sabablar; Sotuv menejeri — sotuv va tushum; Moliya — kassaga tushum va qayta sotuvlar (LTV).</p></div>`;
    $('#newUser').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/users', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast("Xodim qo'shildi"); renderSettings(); } catch (err) { toast(err.message, true); }
    };
    body.querySelector('tbody').onclick = async (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      const tr = e.target.closest('tr');
      const u = users.find((x) => String(x.id) === tr.dataset.id);
      const b = a === 'toggle' ? { active: !u.active } : Object.fromEntries([...tr.querySelectorAll('[data-f]')].map((el) => [el.dataset.f, el.value]).filter(([k, v]) => k !== 'password' || v));
      try { await api(`/api/users/${u.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
    };
  }

  if (settingsTab === 'telegram') {
    const tg = settings.telegram;
    body.innerHTML = `
      <div class="grid g2">
        <form class="card stack" id="setForm"><h2>Hisobot sozlamalari</h2>
          <label class="field">Dollar kursi (so'm)<input name="usd_rate" inputmode="decimal" value="${esc(settings.usd_rate ?? state.me.usdRate)}"></label>
          <label class="field">Kunlik hisobot yuboriladigan chat ID (guruh yoki shaxsiy)<input name="report_chat_id" value="${esc(settings.report_chat_id ?? '')}" placeholder="-100… yoki botga /id"></label>
          <div class="fields">
            <label class="field">Hisobot vaqti<input name="report_time" type="time" value="${esc(settings.report_time ?? '21:00')}"></label>
            <label class="field">Eslatma vaqti<input name="reminder_time" type="time" value="${esc(settings.reminder_time ?? '19:00')}"></label>
          </div>
          <label class="field"><span><input type="checkbox" name="ai_daily" value="1" ${settings.ai_daily === '1' ? 'checked' : ''} style="width:auto"> Har kuni AI tahlilni ham yuborish (7 kunlik)</span></label>
          <label class="field">/start javobi (ixtiyoriy, {loyiha} — loyiha nomi)<textarea name="start_reply" rows="2">${esc(settings.start_reply ?? '')}</textarea></label>
          <div class="filters"><button class="btn primary">Saqlash</button><button type="button" class="btn" id="testReport" ${tg.enabled ? '' : 'disabled'}>Hisobotni hozir yuborish</button></div>
        </form>
        <div class="card stack"><h2>Telegram bot</h2>
          ${tg.enabled ? `<div class="insight good"><span class="ic">Ulangan</span><span>${tg.bot ? `@${esc(tg.bot)}` : 'Bot'} ishlayapti.</span></div>` : '<div class="insight warning"><span class="ic">O\'chiq</span><span>Serverda <span class="code">TELEGRAM_BOT_TOKEN</span> o\'rnatilmagan.</span></div>'}
          <ol class="small" style="margin:0;padding-left:18px;color:var(--text-2)">
            <li>@BotFather dan bot yarating, tokenni serverga qo'ying.</li>
            <li>Botni har bir loyiha kanaliga <b>admin</b> qilib qo'shing — u quyida paydo bo'ladi.</li>
            <li>Kanal ID ni «Loyihalar» bo'limida tegishli loyihaga kiriting.</li>
            <li>Reklama postlarida <span class="code">t.me/${esc(tg.bot || 'bot')}?start=slug</span> havolasidan foydalaning.</li>
            <li>Xodimlar botga <span class="code">/id</span> yozib, ID ni profiliga qo'shtiradi — eslatmalar keladi. <span class="code">/hisobot</span> — bugungi hisobot.</li>
          </ol>
          <h3>Bot admin bo'lgan chatlar</h3>
          ${tg.chats.length ? `<table><tbody>${tg.chats.map((c) => `<tr><td>${esc(c.title)}<div class="muted small">${esc(c.type)} · ${esc(c.status)}</div></td><td class="n"><span class="code">${esc(c.id)}</span></td></tr>`).join('')}</tbody></table>` : '<div class="muted small">Hali yo\'q.</div>'}
          <h3>Tashqi bot / sayt uchun API</h3>
          <p class="small muted" style="margin:0">Agar loyihaning o'z boti bo'lsa, u har bir hodisada so'rov yuborsin:</p>
          <pre class="code" style="white-space:pre-wrap;margin:0">POST ${esc(location.origin)}/api/track
{"key":"&lt;tracking kaliti&gt;","event":"start","tg_user_id":123456}</pre>
          <p class="small muted" style="margin:0">event: start · lead · sale · join · leave</p>
        </div>
      </div>`;
    $('#setForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      f.ai_daily = f.ai_daily ? '1' : '0';
      try { await api('/api/settings', { method: 'PUT', body: f }); state.me = await api('/api/me'); toast('Saqlandi'); } catch (err) { toast(err.message, true); }
    };
    $('#testReport').onclick = async () => { try { await api('/api/telegram/test-report', { method: 'POST', body: {} }); toast('Yuborildi'); } catch (err) { toast(err.message, true); } };
  }

  if (settingsTab === 'audit') {
    const rows = await api('/api/audit?limit=200');
    const label = (f) => state.me.fields[f]?.label || ({ note_target: 'Izoh (target)', note_lead: 'Izoh (lid)', note_sales: 'Izoh (sotuv)', note_finance: 'Izoh (moliya)' })[f] || f;
    body.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Vaqt</th><th>Xodim</th><th>Loyiha</th><th>Sana</th><th>Maydon</th><th class="n">Eski</th><th class="n">Yangi</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.created_at.slice(0, 16))}</td><td>${esc(r.user_name)}</td><td>${esc(r.project_name)}</td><td>${r.date}</td><td>${esc(label(r.field))}</td><td class="n muted">${esc((r.old_value ?? '—').slice(0, 40))}</td><td class="n">${esc((r.new_value ?? '—').slice(0, 40))}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Hali o\'zgarish yo\'q</td></tr>'}
      </tbody></table></div></div>`;
  }
}

// ---------- Router ----------
async function router() {
  if (!state.me) return;
  const route = location.hash.split('?')[0] || '#/';
  try {
    if (route === '#/kiritish') await renderEntry();
    else if (route === '#/ai') await renderAI();
    else if (route === '#/sozlamalar') await renderSettings();
    else await renderDashboard();
  } catch (e) { if (state.me) toast(e.message, true); }
}

async function boot() {
  try {
    state.me = await api('/api/me');
  } catch { return; }
  state.projects = await api('/api/projects');
  // Menejerlar odatda darhol kiritish sahifasiga tushadi
  if (!location.hash && state.me.user.role !== 'admin') location.hash = '#/kiritish';
  router();
}

window.addEventListener('hashchange', router);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', router);
fetch('/api/me').then((r) => (r.ok ? boot() : renderLogin())).catch(renderLogin);
