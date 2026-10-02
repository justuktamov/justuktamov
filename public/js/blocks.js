// Loyiha ma'lumoti bloklari: pul, voronka, lid sifati, sabablar, narx, xulosa, jadval, grafik, reja
import {
  esc, state, fmtN, fmtUsd, fmtUzs, fmtP, cssVar, chartBase, groupSeries, monthLabel, shortDate,
} from './core.js';

export const dot = (c) => `<span class="dot" style="--dc:${esc(c || 'var(--series-1)')}"></span>`;
export const signed = (x) => (x > 0 ? `+${fmtUzs(x)}` : fmtUzs(x));
const LEVEL = { critical: ['crit', 'Muhim'], warning: ['warn', 'Diqqat'], info: ['info', "Ma'lumot"], good: ['good', 'Yaxshi'] };

// Loyiha holati bitta so'z bilan: eng jiddiy xulosa bo'yicha
export function statusOf(p) {
  const worst = ['critical', 'warning'].find((l) => p.insights.some((i) => i.level === l));
  if (worst === 'critical') return ['crit', p.net_profit < 0 ? 'Zararda' : 'Muammo'];
  if (worst === 'warning') return ['warn', 'Diqqat'];
  return p.revenue || p.spend ? ['good', 'Yaxshi'] : ['', "Ma'lumot yo'q"];
}

export function moneyBlock(p) {
  const base = Math.max(p.revenue, p.costs, 1);
  const row = (label, v, cls = '', bar = true) => `<div class="wf ${cls}"><span>${label}</span>
    ${bar ? `<i style="width:${Math.min(Math.abs(v) / base * 100, 100)}%"></i>` : '<i class="none"></i>'}<b>${fmtUzs(v)}</b><em>${p.revenue ? fmtP(v / p.revenue, 0) : ''}</em></div>`;
  const noCosts = p.var_cost_pct == null && p.fixed_monthly == null;
  return `<div class="sub-card"><h3>Pul</h3>
    ${row('Tushum', p.revenue, 'in')}
    ${row('− Reklama', -p.spend_uzs)}
    ${row('= Foyda', p.gross_profit, p.gross_profit < 0 ? 'neg' : 'pos', false)}
    ${row(`− Tannarx${p.var_cost_pct != null ? ` (${fmtN(p.var_cost_pct)}%)` : ''}`, -p.var_cost)}
    ${row('− Doimiy xarajat', -p.fixed_cost)}
    ${row('= Sof foyda', p.net_profit, `total ${p.net_profit < 0 ? 'neg' : 'pos'}`, false)}
    ${noCosts ? '<p class="small muted">Tannarx va doimiy xarajat kiritilmagan — <a href="#/sozlamalar?tab=projects">Sozlamalarda</a> kiriting, shunda sof foyda to\'g\'ri chiqadi.</p>' : ''}
  </div>`;
}

export function funnelBlock(p) {
  const steps = p.kind === 'auto'
    ? [['Klik', p.clicks], ...(p.reported.starts ? [['Bot start', p.starts]] : []), ['Xarid', p.sales]]
    : [['Klik', p.clicks], ['Lid', p.leads], ...(p.reported.qualified ? [['Sifatli lid', p.qualified]] : []), ['Sotuv', p.sales]];
  const max = Math.max(...steps.map((x) => x[1]), 1);
  return `<div class="sub-card"><h3>Voronka</h3>
    <div class="fn">${steps.map(([l, v], i) => `<div class="fn-row"><span>${l}</span><i style="width:${Math.max(v / max * 100, v ? 1.5 : 0)}%"></i><b>${fmtN(v)}</b>
      <em>${i ? fmtP(steps[i - 1][1] ? v / steps[i - 1][1] : null) : ''}</em></div>`).join('')}</div>
    <div class="unit">
      <span><small>${p.unit_label}</small><b>${fmtUsd(p.unit_cost)}</b></span>
      ${p.kind === 'auto' ? '' : `<span><small>1 sifatli lid</small><b>${fmtUsd(p.cost_per_qualified)}</b></span>`}
      <span><small>1 mijoz narxi</small><b>${fmtUsd(p.cac)}</b></span>
      <span><small>O'rtacha chek</small><b>${fmtUzs(p.avg_check)}</b></span>
    </div></div>`;
}

export function qualityBlock(p) {
  if (!p.leads) return '';
  const parts = [['Sifatli', p.qualified, 'q-good'], ['Potensial', p.potential, 'q-mid'], ['Sifatsiz', p.unqualified, 'q-bad']];
  const known = parts.reduce((a, x) => a + x[1], 0);
  const wasted = p.cpl != null ? p.unqualified * p.cpl : null;
  return `<div class="sub-card"><h3>Lid sifati</h3>
    ${known ? `<div class="qbar" role="img" aria-label="${parts.map(([l, v]) => `${l} ${v}`).join(', ')}">${parts.filter((x) => x[1]).map(([l, v, c]) => `<i class="${c}" style="flex:${v}" title="${l}: ${fmtN(v)}"></i>`).join('')}</div>
      <div class="qlegend">${parts.map(([l, v, c]) => `<span><i class="${c}"></i>${l} <b>${fmtN(v)}</b> · ${fmtP(v / p.leads, 0)}</span>`).join('')}</div>
      ${wasted ? `<p class="small" style="margin:8px 0 0">Sifatsiz lidlarga ketgan pul: <b>${fmtUsd(wasted, 0)}</b></p>` : ''}`
      : '<p class="small muted">Sifatli / sifatsiz bo\'linmasi kiritilmagan.</p>'}
    ${reasonBars('Nega sifatsiz', p.reasons.bad)}
  </div>`;
}

export function lostBlock(p) {
  if (!p.reasons.lost.length) return '';
  return `<div class="sub-card"><h3>Nega sotib olmadi</h3>${reasonBars('', p.reasons.lost)}</div>`;
}

export function reasonBars(title, list) {
  if (!list.length) return title ? `<p class="small muted" style="margin:10px 0 0">${title}: ROP sabablarni hali aytmagan.</p>` : '';
  const max = list[0].count;
  return `${title ? `<h4>${title}</h4>` : ''}<div class="rb">${list.slice(0, 6).map((r) => `<div class="rb-row"><span>${esc(r.label)}</span><i style="width:${r.count / max * 100}%"></i><b>${fmtP(r.share, 0)}</b></div>`).join('')}</div>`;
}

const PRICE_ICON = { up: '↑', down: '↓', keep: '=', cost: '!' };
export function priceBlock(p) {
  const a = p.price;
  if (!a) return `<div class="sub-card"><h3>Narx</h3><p class="small muted">Tavsiya uchun kamida 3 ta sotuv kerak.</p></div>`;
  const cls = { up: 'good', down: 'warn', keep: 'info', cost: 'crit' }[a.verdict];
  return `<div class="sub-card"><h3>Narx</h3>
    <div class="price ${cls}"><span class="pi">${PRICE_ICON[a.verdict]}</span><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div></div>
    <div class="unit">
      <span><small>O'rtacha chek</small><b>${fmtUzs(a.avg_check)}</b></span>
      <span><small>1 sotuvdan sof foyda</small><b class="${a.profit_per_sale < 0 ? 'neg' : 'pos'}">${signed(a.profit_per_sale)}</b></span>
      <span><small>Zararsizlik narxi</small><b>${fmtUzs(a.breakeven)}</b></span>
    </div></div>`;
}

export function insightsBlock(p, notes = []) {
  return `<div class="sub-card"><h3>Xulosa</h3>
    ${p.insights.length ? `<div class="insights">${p.insights.map((i) => `<div class="insight ${i.level}"><span class="ic">${LEVEL[i.level][1]}</span><span>${esc(i.text)}</span></div>`).join('')}</div>` : '<p class="small muted">Muammo topilmadi.</p>'}
    ${notesFor(p, notes)}</div>`;
}

function notesFor(p, all) {
  const notes = all.filter((n) => n.project_id === p.id).slice(0, 6);
  if (!notes.length) return '';
  return `<h4>Kreativlar va izohlar</h4><div class="notes">${notes.map((n) => `<div><span class="muted">${shortDate(n.date)}</span>
    ${[['⭐', n.creative_best], ['👎', n.creative_worst], ['Targetolog:', n.note_target], ['ROP:', n.note_sales]].filter((x) => x[1]).map(([l, x]) => `<span><b>${l}</b> ${esc(x)}</span>`).join('')}</div>`).join('')}</div>`;
}

export function dailyTable(p) {
  const rows = [...p.series].reverse();
  const auto = p.kind === 'auto';
  return `<div class="table-wrap"><table><thead><tr><th>Sana</th><th class="n">Reklama</th><th class="n">Klik</th>${auto ? '<th class="n">Start</th>' : '<th class="n">Lid</th><th class="n">Sifatli</th>'}<th class="n">Sotuv</th><th class="n">Tushum</th><th class="n">Xarajat</th><th class="n">Sof foyda</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${shortDate(r.date)}</td><td class="n">${fmtUsd(r.spend, 0)}</td><td class="n">${fmtN(r.clicks)}</td>
      ${auto ? `<td class="n">${fmtN(r.starts)}</td>` : `<td class="n">${fmtN(r.leads)}</td><td class="n">${fmtN(r.qualified)}</td>`}
      <td class="n">${fmtN(r.sales)}</td><td class="n">${fmtUzs(r.revenue)}</td><td class="n">${fmtUzs(r.costs)}</td><td class="n ${r.net < 0 ? 'neg' : 'pos'}">${signed(r.net)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Grafik: har kungi tushum va barcha xarajat (bir o'q — ikkalasi ham so'mda) ----------
export function drawFlow(el, series, key) {
  if (!el || !window.Chart) return;
  const base = chartBase();
  const { labels, rows } = groupSeries(series, ['revenue', 'costs', 'net']);
  const mlnTick = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(0)} mln` : v);
  const chart = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Tushum', data: rows.map((r) => r.revenue), backgroundColor: cssVar('--series-1'), borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 18 },
      { label: 'Xarajat', data: rows.map((r) => r.costs), backgroundColor: cssVar('--series-2'), borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 18 },
    ] },
    options: { ...base,
      plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: {
        label: (c) => ` ${c.dataset.label}: ${fmtUzs(c.raw)} so'm`,
        footer: (items) => { const r = rows[items[0].dataIndex]; return `Sof foyda: ${signed(r.revenue - r.costs)} so'm`; },
      } } },
      scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, callback: mlnTick } } } },
  });
  chart.$key = key;
  state.charts.push(chart);
}

// ---------- Oylik reja ----------
const PLAN_LABEL = { revenue: 'Tushum', sales: 'Sotuvlar', leads: 'Lidlar', budget: 'Reklama byudjeti' };
const PLAN_STATUS = { early: ['info', 'Oy boshi'], ahead: ['good', "Reja bo'yicha"], risk: ['warn', 'Xavf ostida'], behind: ['crit', 'Orqada'], ok: ['good', "Me'yorida"], over: ['warn', 'Tez sarflanyapti'] };
const planVal = (k, x) => (k === 'revenue' ? fmtUzs(x) : k === 'budget' ? fmtUsd(x, 0) : fmtN(x));

export function planCard(plan, cls = 'card mt') {
  const head = `<div class="card-head"><h2>Oylik reja</h2><span class="muted">${monthLabel(plan.month)} · ${plan.elapsed}/${plan.days} kun</span></div>`;
  if (!plan.hasPlans) return `<div class="${cls}">${head}<div class="plan-empty"><span>Bu oyga reja yo'q</span><a class="btn small" href="#/sozlamalar?tab=plans">Reja kiritish</a></div></div>`;
  const src = plan.items.length === 1 ? plan.items[0].metrics : plan.total;
  return `<div class="${cls}">${head}<div class="plans">${['revenue', 'sales', 'leads', 'budget'].filter((k) => src[k]?.plan).map((k) => {
    const m = src[k];
    const [cls, label] = PLAN_STATUS[m.status] || ['', ''];
    const fill = ['ahead', 'ok', 'early'].includes(m.status) ? '' : m.status;
    return `<div class="pbar">
      <div class="pbar-top"><b>${PLAN_LABEL[k]}</b><span class="pbar-nums">${planVal(k, m.fact)} / ${planVal(k, m.plan)} · <b>${fmtP(m.pct, 0)}</b></span></div>
      <div class="ptrack"><div class="pfill ${fill}" style="width:${Math.min(m.pct * 100, 100)}%"></div>
        <div class="pmark" style="left:calc(${Math.min(m.expected_pct * 100, 100)}% - 1px)" title="Bugungacha kutilgan: ${fmtP(m.expected_pct, 0)}"></div></div>
      <div class="pfoot"><span class="pill ${cls}">${label}</span><span>Prognoz: ${planVal(k, m.forecast)} (${fmtP(m.forecast_pct, 0)})</span></div>
    </div>`;
  }).join('')}</div></div>`;
}

