// Bosh panel — barcha loyihalar bo'yicha voronka, reja, xulosalar va taqqoslash
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, kpi, fmtN, fmtUsd, fmtUzs, fmtP,
  insightsHtml, spinnerBlock, downloadCsv, toast, ICONS, cssVar,
} from './core.js';
import {
  funnelHtml, planCard, reasonsHtml, disciplineHtml, notesHtml, chartCards, drawSeriesCharts, drawConversionChart,
  projectTable, bindProjectTable, bindRowLinks,
} from './widgets.js';

export function kpiRow(s) {
  const t = s.totals, d = s.delta, sp = (k) => s.series.map((x) => x[k]);
  return `<div class="kpis">
    ${kpi({ label: 'Reklama xarajati', value: fmtUsd(t.spend, 0), sub: `${fmtUzs(t.spend_uzs)} so'm · 1 lid ${fmtUsd(t.cpl)}`, d: d.spend, invert: true, spark: sp('spend'), color: cssVar('--series-2') })}
    ${kpi({ label: 'Bot start', value: fmtN(t.starts), sub: t.organic != null ? `organik ${fmtN(t.organic)} (${fmtP(t.organic_share, 0)}) · klik ${fmtN(t.clicks)}` : `klik ${fmtN(t.clicks)}`, d: d.starts, spark: sp('starts'), color: cssVar('--series-1') })}
    ${kpi({ label: 'Lidlar', value: fmtN(t.leads), sub: `start → lid ${fmtP(t.start_to_lead)}`, d: d.leads, spark: sp('leads'), color: cssVar('--series-1') })}
    ${kpi({ label: 'Sotuvlar', value: fmtN(t.sales), sub: `lid → sotuv ${fmtP(t.lead_to_sale)} · mijoz ${fmtUsd(t.cac)}`, d: d.sales, spark: sp('sales'), color: cssVar('--series-4') })}
    ${kpi({ label: 'Tushum', value: fmtUzs(t.total_revenue), unit: "so'm", sub: `o'rtacha chek ${fmtUzs(t.avg_check)}`, d: d.total_revenue, spark: sp('revenue'), color: cssVar('--series-3') })}
    ${kpi({ label: 'ROAS', value: t.roas == null ? '—' : fmtN(t.roas, 2), unit: t.roas == null ? '' : 'x', sub: t.roi == null ? 'reklama qaytimi' : `ROI ${fmtP(t.roi, 0)} · foyda ${fmtUzs(t.profit)}`, d: d.roas })}
    ${kpi({ label: 'LTV (1 mijoz)', value: fmtUzs(t.ltv), unit: "so'm", sub: `qayta sotuv ${fmtN(t.repeat_sales)} ta`, d: d.ltv })}
    ${kpi({ label: 'Kassaga tushgan', value: fmtUzs(t.payments), unit: "so'm", sub: t.total_revenue ? `tushumning ${fmtP(t.payments / t.total_revenue, 0)} qismi` : 'moliya kiritadi', d: d.payments })}
  </div>`;
}

export async function renderDashboard() {
  const admin = state.me.user.role === 'admin';
  shell(`<div class="page-head"><div><h1><span class="grad">Analitika</span></h1><div class="sub" id="periodSub">&nbsp;</div></div>${filtersHtml()}</div><div id="dash">${spinnerBlock()}</div>`);
  bindFilters(renderDashboard);
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to, ...(state.project ? { project: state.project } : {}) });
  let s, disc;
  try {
    [s, disc] = await Promise.all([api(`/api/summary?${q}`), admin ? api('/api/discipline?days=14') : null]);
  } catch (e) { const el = $('#dash'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#dash');
  if (!box) return;
  $('#periodSub').textContent = `${from === to ? from : `${from} — ${to}`} · oldingi davrga nisbatan`;
  const avg = s.totals.lead_to_sale;
  box.innerHTML = `
    ${kpiRow(s)}
    <div class="grid g-wide">
      <div class="card"><div class="card-head"><h2>Voronka</h2><span class="muted">${s.days} kun</span></div>${funnelHtml(s.totals)}</div>
      ${planCard(s.plan)}
    </div>
    <div class="card mt"><div class="card-head"><h2>Loyihalar taqqoslash</h2><span class="row">
      <button class="btn small" id="csvBtn">${ICONS.dl} CSV</button></span></div>${projectTable(s.byProject, avg)}</div>
    <div class="grid g2 mt">
      <div class="card"><div class="card-head"><h2>Xulosalar</h2><a href="#/ai" class="small">AI bilan chuqurroq →</a></div>${insightsHtml(s.insights)}</div>
      <div class="card"><div class="card-head"><h2>Nega sotib olmadi?</h2></div>${reasonsHtml(s.reasons)}</div>
    </div>
    ${chartCards()}
    <div class="grid ${disc ? 'g2' : ''} mt">
      <div class="card"><div class="card-head"><h2>Lid → sotuv konversiyasi</h2><span class="muted">loyihalar bo'yicha</span></div><div class="chart-box"><canvas id="chConv" aria-label="Loyihalar bo'yicha lid→sotuv konversiyasi"></canvas></div></div>
      ${disc ? `<div class="card"><div class="card-head"><h2>Hisobot intizomi</h2><span class="muted">so'nggi 14 kun</span></div>${disciplineHtml(disc)}</div>` : ''}
    </div>
    ${s.notes.length ? `<div class="card mt"><div class="card-head"><h2>Menejerlar izohlari</h2></div>${notesHtml(s.notes)}</div>` : ''}`;
  bindProjectTable(s.byProject, avg);
  bindRowLinks($('#main'));
  $('#csvBtn').onclick = () => downloadCsv(q).catch((e) => toast(e.message, true));
  drawSeriesCharts(s.series);
  drawConversionChart(s.byProject);
}
