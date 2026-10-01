// Bosh panel va loyiha sahifasi ishlatadigan bloklar
import {
  $, esc, fmtN, fmtUsd, fmtUzs, fmtP, state, cssVar, chartBase, groupSeries, monthLabel, shortDate, delta,
} from './core.js';

export function funnelHtml(t) {
  const max = Math.max(t.starts, t.clicks, 1);
  const w = (x) => `${Math.max((x / max) * 100, x > 0 ? 1 : 0)}%`;
  const row = (label, value, bar, conv, convLabel) => `
    <div class="f-row"><div class="f-label">${label}${value !== '' ? `<b>${fmtN(value)}</b>` : ''}</div><div class="f-track">${bar}</div>
    <div class="f-conv">${conv ?? ''}${convLabel ? `<small>${convLabel}</small>` : ''}</div></div>`;
  const simple = (x, color = 'var(--series-1)') => `<div class="f-bar" style="width:${w(x)};background:${color}"></div>`;
  const ads = Math.min(t.clicks, t.starts);
  const startsBar = t.organic != null
    ? `<div class="f-split" style="width:${w(t.starts)}"><div class="f-bar" style="width:${(ads / t.starts) * 100}%" title="Reklama: ${fmtN(ads)}"></div><div class="f-bar organic" style="width:${(t.organic / t.starts) * 100}%" title="Organik: ${fmtN(t.organic)}"></div></div>`
    : simple(t.starts);
  return `<div class="funnel">
    ${row('Xarajat', '', `<div class="f-spend">${fmtUsd(t.spend)} · ${fmtUzs(t.spend_uzs)} so'm</div>`, fmtUsd(t.cost_per_start, 3), '1 start narxi')}
    ${row('Kliklar', t.clicks, simple(t.clicks), fmtUsd(t.cpc, 3), 'klik narxi')}
    ${row('Bot start', t.starts, startsBar, fmtP(t.click_to_start, 0), t.organic != null ? `organik ${fmtN(t.organic)}` : 'klik → start')}
    ${row('Lidlar', t.leads, simple(t.leads), fmtP(t.start_to_lead), 'start → lid')}
    ${row('Sotuvlar', t.sales, simple(t.sales, 'var(--series-4)'), fmtP(t.lead_to_sale), 'lid → sotuv')}
  </div>
  <div class="legend"><span><i style="background:var(--series-1)"></i>Reklama orqali</span><span><i style="background:var(--series-3)"></i>Organik (start − klik)</span><span><i style="background:var(--series-4)"></i>Sotuv</span></div>`;
}

const PLAN_LABEL = { revenue: 'Tushum', sales: 'Sotuvlar', leads: 'Lidlar', budget: 'Byudjet' };
const STATUS = { early: ['info', 'Oy boshi'], ahead: ['good', 'Reja bo\'yicha'], risk: ['warn', 'Xavf ostida'], behind: ['crit', 'Orqada'], ok: ['good', 'Me\'yorida'], over: ['warn', 'Tez sarflanyapti'] };
const planVal = (k, x) => (k === 'revenue' ? fmtUzs(x) : k === 'budget' ? fmtUsd(x, 0) : fmtN(x));

export function planBar(k, m) {
  const [cls, label] = STATUS[m.status] || ['', ''];
  const fill = ['ahead', 'ok', 'early'].includes(m.status) ? '' : m.status;
  return `<div class="pbar">
    <div class="pbar-top"><b>${PLAN_LABEL[k]}</b><span class="pbar-nums">${planVal(k, m.fact)} / ${planVal(k, m.plan)} · <b>${fmtP(m.pct, 0)}</b></span></div>
    <div class="ptrack" role="img" aria-label="${PLAN_LABEL[k]}: ${fmtP(m.pct, 0)} bajarildi, kutilgan ${fmtP(m.expected_pct, 0)}">
      <div class="pfill ${fill}" style="width:${Math.min(m.pct * 100, 100)}%"></div>
      <div class="pmark" style="left:calc(${Math.min(m.expected_pct * 100, 100)}% - 1px)" title="Bugungacha kutilgan: ${fmtP(m.expected_pct, 0)}"></div>
    </div>
    <div class="pfoot"><span class="pill ${cls}">${label}</span><span>Prognoz: ${planVal(k, m.forecast)} (${fmtP(m.forecast_pct, 0)})</span></div>
  </div>`;
}

export function planCard(plan, { title = 'Oylik reja', single = false } = {}) {
  const head = `<div class="card-head"><h2>${title}</h2><span class="muted">${monthLabel(plan.month)} · ${plan.elapsed}/${plan.days} kun</span></div>`;
  if (!plan.hasPlans) {
    const admin = state.me.user.role === 'admin';
    return `<div class="card">${head}<div class="plan-empty"><span>Bu oy uchun reja kiritilmagan. Reja bo'lsa, platforma oy oxirigacha prognoz qiladi va orqada qolayotgan loyihani ko'rsatadi.</span>
      ${admin ? '<a class="btn small" href="#/sozlamalar?tab=plans">Reja kiritish</a>' : '<span class="muted small">Rejani rahbar kiritadi.</span>'}</div></div>`;
  }
  const src = single ? plan.items[0]?.metrics || {} : plan.total;
  const keys = ['revenue', 'sales', 'leads', 'budget'].filter((k) => src[k]?.plan);
  const perProject = !single && plan.items.length > 1
    ? `<div class="table-wrap mt"><table><thead><tr><th>Loyiha</th>${keys.map((k) => `<th class="n">${PLAN_LABEL[k]}</th>`).join('')}</tr></thead><tbody>
      ${plan.items.map((i) => `<tr class="click" data-href="#/loyiha/${i.project_id}"><td><span class="dot" style="background:${esc(i.color || 'var(--series-1)')}"></span>${esc(i.name)}</td>
        ${keys.map((k) => { const m = i.metrics[k]; if (!m?.plan) return '<td class="n muted">—</td>'; const [c] = STATUS[m.status]; return `<td class="n"><span class="pill ${c}">${fmtP(m.pct, 0)}</span></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>` : '';
  return `<div class="card">${head}<div class="plans">${keys.map((k) => planBar(k, src[k])).join('')}</div>${perProject}
    <p class="tiny muted" style="margin:12px 0 0">Chiziqdagi belgi — bugungacha bajarilishi kerak bo'lgan ulush (${fmtP(plan.elapsed / plan.days, 0)}).</p></div>`;
}

export function reasonsHtml(reasons) {
  if (!reasons.length) return '<div class="muted small">Sabablar hali kiritilmagan. Lid va sotuv menejerlari «Kunlik hisobot» sahifasida kiritadi.</div>';
  const total = reasons.reduce((a, r) => a + r.count, 0);
  const max = reasons[0].count;
  return `<div class="hbars">${reasons.map((r) => `<div class="hbar"><span>${esc(r.label)}</span><div class="t"><div class="b" style="width:${(r.count / max) * 100}%"></div></div><span class="num muted" title="${fmtN(r.count)} ta">${fmtP(r.count / total, 0)}</span></div>`).join('')}</div>`;
}

export function disciplineHtml(list) {
  return `<div class="disc">${list.map((r) => {
    const pctCls = r.pct == null ? '' : r.pct >= 0.95 ? 'good' : r.pct >= 0.8 ? 'warn' : 'crit';
    return `<div class="disc-row"><div class="who">${esc(r.label)}<small>${esc(r.users.join(', ') || 'xodim biriktirilmagan')}</small></div>
      <div class="cells">${r.days.map((d, i) => {
        const cls = d.total === 0 ? '' : d.filled === d.total ? 'full' : d.filled > 0 ? 'part' : 'none';
        return `<div class="cell ${cls} ${i === r.days.length - 1 ? 'today' : ''}" title="${shortDate(d.date)}: ${d.filled}/${d.total} loyiha"></div>`;
      }).join('')}</div>
      <span class="pill ${pctCls}">${fmtP(r.pct, 0)}</span></div>`;
  }).join('')}</div>
  <div class="legend"><span><i style="background:var(--brand)"></i>Hammasi kiritilgan</span><span><i style="background:color-mix(in srgb, var(--brand) 45%, var(--surface-3))"></i>Qisman</span><span><i style="background:var(--crit-bg)"></i>Kiritilmagan</span><span>Chap → o'ng: eski → bugun</span></div>`;
}

export function notesHtml(notes) {
  return `<div class="table-wrap"><table><thead><tr><th>Sana</th><th>Loyiha</th><th>Izoh</th></tr></thead><tbody>
    ${notes.map((n) => `<tr><td>${shortDate(n.date)}</td><td>${esc(n.project)}</td><td class="wrap">${[['Target', n.target], ['Lid', n.lead], ['Sotuv', n.sales], ['Moliya', n.finance]].filter((x) => x[1]).map(([r, x]) => `<b>${r}:</b> ${esc(x)}`).join('<br>')}</td></tr>`).join('')}
  </tbody></table></div>`;
}

// ---------- Grafiklar ----------
export function chartCards() {
  return `<div class="grid g3 mt">
    <div class="card"><div class="card-head"><h2>Kliklar va organik</h2><span class="muted" id="gLabel"></span></div><div class="chart-box"><canvas id="chTraffic" aria-label="Reklama kliklari va organik startlar"></canvas></div></div>
    <div class="card"><div class="card-head"><h2>Lidlar</h2></div><div class="chart-box"><canvas id="chLeads" aria-label="Lidlar dinamikasi"></canvas></div></div>
    <div class="card span-all"><div class="card-head"><h2>Sotuvlar</h2></div><div class="chart-box"><canvas id="chSales" aria-label="Sotuvlar dinamikasi"></canvas></div></div>
  </div>`;
}

export function drawSeriesCharts(series) {
  if (!window.Chart) return;
  const base = chartBase();
  const { labels, rows, weekly } = groupSeries(series, ['clicks', 'organic', 'leads', 'sales']);
  const gl = $('#gLabel');
  if (gl) gl.textContent = weekly ? 'haftalik' : 'kunlik';
  const single = { ...base, plugins: { ...base.plugins, legend: { display: false } } };
  const line = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: rows.length > 20 ? 0 : 3, pointHoverRadius: 5, tension: 0.25 });
  const add = (id, cfg) => { const el = $(id); if (el) state.charts.push(new Chart(el, cfg)); };
  add('#chTraffic', {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Reklama kliklari', data: rows.map((d) => d.clicks), backgroundColor: cssVar('--series-1'), borderRadius: 4, borderSkipped: 'bottom', stack: 's' },
      { label: 'Organik startlar', data: rows.map((d) => d.organic), backgroundColor: cssVar('--series-3'), borderRadius: 4, borderSkipped: 'bottom', stack: 's' },
    ] },
    options: { ...base, scales: { ...base.scales, x: { ...base.scales.x, stacked: true }, y: { ...base.scales.y, stacked: true } } },
  });
  add('#chLeads', { type: 'line', data: { labels, datasets: [line('Lidlar', rows.map((d) => d.leads), cssVar('--series-1'))] }, options: single });
  add('#chSales', { type: 'line', data: { labels, datasets: [line('Sotuvlar', rows.map((d) => d.sales), cssVar('--series-4'))] }, options: single });
}

export function drawConversionChart(byProject) {
  const el = $('#chConv');
  if (!el || !window.Chart) return;
  const base = chartBase();
  const ps = byProject.filter((p) => p.lead_to_sale != null);
  state.charts.push(new Chart(el, {
    type: 'bar',
    data: { labels: ps.map((p) => p.name), datasets: [{ label: 'Lid → sotuv', data: ps.map((p) => +(p.lead_to_sale * 100).toFixed(2)), backgroundColor: ps.map((p, i) => p.color || cssVar(`--series-${(i % 4) + 1}`)), borderRadius: 4, maxBarThickness: 30 }] },
    options: { ...base, indexAxis: 'y', plugins: { ...base.plugins, legend: { display: false }, tooltip: { ...base.plugins.tooltip, callbacks: { label: (c) => ` ${c.raw}%` } } },
      scales: { x: { beginAtZero: true, grid: { color: cssVar('--border') }, ticks: { callback: (v) => `${v}%` } }, y: { grid: { display: false } } } },
  }));
}

// ---------- Loyihalar jadvali ----------
const PROJECT_COLS = [
  ['name', 'Loyiha', (p) => `<span class="dot" style="background:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}`],
  ['spend', 'Xarajat', (p) => fmtUsd(p.spend, 0), 1],
  ['clicks', 'Klik', (p) => fmtN(p.clicks), 1],
  ['starts', 'Start', (p) => fmtN(p.starts), 1],
  ['organic', 'Organik', (p) => (p.organic == null ? '—' : `${fmtN(p.organic)} <span class="muted tiny">${fmtP(p.organic_share, 0)}</span>`), 1],
  ['leads', 'Lid', (p) => fmtN(p.leads), 1],
  ['cpl', 'Lid narxi', (p) => fmtUsd(p.cpl), 1],
  ['sales', 'Sotuv', (p) => fmtN(p.sales), 1],
  ['lead_to_sale', 'Lid→sotuv', (p, avg) => convPill(p.lead_to_sale, avg), 1],
  ['cac', 'Mijoz narxi', (p) => fmtUsd(p.cac), 1],
  ['total_revenue', "Tushum, so'm", (p) => fmtUzs(p.total_revenue), 1],
  ['roas', 'ROAS', (p) => (p.roas == null ? '—' : `<span class="pill ${p.roas >= 3 ? 'good' : p.roas >= 1 ? 'warn' : 'crit'}">${fmtN(p.roas, 2)}</span>`), 1],
  ['growth', "Lid o'sishi", (p) => delta(p.growth.leads), 1],
];
let sortKey = 'total_revenue', sortDir = -1;

export function convPill(x, avg) {
  if (x == null) return '—';
  const cls = avg ? (x < avg * 0.6 ? 'crit' : x < avg * 0.9 ? 'warn' : 'good') : '';
  return `<span class="pill ${cls}">${fmtP(x)}</span>`;
}

export function projectTable(list, avg) {
  const val = (p) => (sortKey === 'growth' ? p.growth.leads ?? -Infinity : sortKey === 'name' ? p.name : p[sortKey] ?? -Infinity);
  const rows = [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sortDir);
  return `<div class="table-wrap" id="projTableWrap"><table><thead><tr>${PROJECT_COLS.map(([k, l, , n]) => `<th class="sortable ${n ? 'n' : ''}" data-k="${k}">${l}${sortKey === k ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((p) => `<tr class="click" data-href="#/loyiha/${p.id}">${PROJECT_COLS.map(([, , f, n]) => `<td class="${n ? 'n' : ''}">${f(p, avg)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${PROJECT_COLS.length}" class="empty">Loyihalar yo'q</td></tr>`}</tbody></table></div>`;
}

export function bindProjectTable(list, avg) {
  const wrap = $('#projTableWrap');
  if (!wrap) return;
  wrap.onclick = (e) => {
    const th = e.target.closest('th[data-k]');
    if (th) {
      const k = th.dataset.k;
      sortDir = sortKey === k ? -sortDir : -1;
      sortKey = k;
      wrap.outerHTML = projectTable(list, avg);
      bindProjectTable(list, avg);
    }
  };
}

// data-href li qatorlarni bosish — sahifaga o'tish
export function bindRowLinks(root = document) {
  root.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button, input, select')) location.hash = tr.dataset.href;
  });
}
