// Bitta loyihaning to'liq sahifasi: pul, voronka, lid sifati, sabablar, narx, xulosa, reja, kunma-kun
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, kpi, fmtUsd, fmtUzs, fmtP, spinnerBlock, isStale,
} from './core.js';
import {
  moneyBlock, funnelBlock, qualityBlock, lostBlock, priceBlock, insightsBlock, dailyTable, drawFlow, planCard, signed, statusOf,
} from './blocks.js';

const change = (cur, prev) => (cur == null || prev == null || prev === 0 ? null : (cur - prev) / Math.abs(prev));

export async function renderProject(id) {
  const proj = state.projects.find((x) => String(x.id) === String(id));
  if (!proj) { location.hash = '#/'; return; }
  const others = state.projects.filter((x) => x.active);
  shell(`<div class="page-head"><div>
      <a class="back" href="#/">← Loyihalar</a>
      <h1 class="ptitle-big"><span class="col-dot" style="--pc:${esc(proj.color || '#4c86ff')}"></span>${esc(proj.name)}</h1>
      <div class="sub" id="pSub">&nbsp;</div></div>
      ${filtersHtml({ project: false })}</div>
    <nav class="pswitch" aria-label="Loyihalar">${others.map((x) => `<a href="#/loyiha/${x.id}" class="${x.id === proj.id ? 'on' : ''}" style="--pc:${esc(x.color || '#4c86ff')}"><span class="col-dot"></span>${esc(x.name)}</a>`).join('')}</nav>
    <div id="pd">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  bindFilters(() => renderProject(id));
  const { from, to } = computePeriod();
  let s;
  try { s = await api(`/api/summary?${new URLSearchParams({ from, to, project: id })}`); } catch (e) { const el = $('#pd'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#pd');
  const p = s.byProject[0];
  if (!box || isStale(rid) || !p) return;
  const [cls, label] = statusOf(p);
  $('#pSub').innerHTML = `${p.kind === 'auto' ? 'Avtovoronka (bot)' : "Sotuv bo'limi orqali"} · ${from === to ? from : `${from} — ${to}`} <span class="pill ${cls}">${label}</span>`;

  const auto = p.kind === 'auto';
  const lost = lostBlock(p);
  // 12 ustunli to'r: har qator to'la bo'lsin
  const blocks = auto
    ? [[moneyBlock(p), 6], [chartBlock(), 6], [funnelBlock(p), 6], [priceBlock(p), 6], [insightsBlock(p, s.notes), 6], [planCard(s.plan, 'sub-card'), 6]]
    : [[moneyBlock(p), 6], [chartBlock(), 6],
      ...(lost ? [[funnelBlock(p), 4], [qualityBlock(p), 4], [lost, 4]] : [[funnelBlock(p), 6], [qualityBlock(p), 6]]),
      [priceBlock(p), 6], [insightsBlock(p, s.notes), 6], [planCard(s.plan, 'sub-card'), 12]];
  box.innerHTML = `
    <div class="kpis">
      ${kpi({ label: 'Reklamaga sarflandi', value: fmtUsd(p.spend, 0), sub: `${fmtUzs(p.spend_uzs)} so'm`, d: change(p.spend, p.prev.spend), invert: true })}
      ${kpi({ label: 'Tushum', value: fmtUzs(p.revenue), unit: "so'm", sub: `${p.sales} ta ${auto ? 'xarid' : 'sotuv'}`, d: change(p.revenue, p.prev.revenue) })}
      ${kpi({ label: 'Sof foyda', value: `<span class="${p.net_profit < 0 ? 'neg' : 'pos'}">${signed(p.net_profit, false)}</span>`, unit: "so'm", sub: 'barcha xarajatdan keyin', d: change(p.net_profit, p.prev.net_profit) })}
      ${kpi({ label: 'Marja', value: fmtP(p.net_margin, 0), sub: `${p.conv_label}: ${fmtP(p.conv)}` })}
    </div>
    <div class="pgrid">${blocks.map(([html, span]) => `<div class="span-${span}">${html}</div>`).join('')}
      <div class="span-12"><div class="sub-card"><h3>Kunma-kun</h3>${dailyTable(p)}</div></div>
    </div>`;
  drawFlow(box.querySelector('canvas'), p.series, p.id);
}

const chartBlock = () => `<div class="sub-card"><div class="card-head"><h3>Har kungi pul</h3><span class="muted small">tushum va barcha xarajat</span></div><div class="chart-box short"><canvas aria-label="Tushum va xarajat"></canvas></div></div>`;
