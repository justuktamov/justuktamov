// Statistika: davr bo'yicha raqamlar, oylik reja, loyihalar taqqoslash, grafiklar
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, kpi, fmtN, fmtUsd, fmtUzs, fmtP,
  spinnerBlock, downloadCsv, toast, ICONS, cssVar, chartBase, groupSeries, monthLabel, shortDate, isStale,
} from './core.js';

const dot = (c) => `<span class="dot" style="background:${esc(c || 'var(--series-1)')}"></span>`;

export async function renderStats() {
  shell(`<div class="page-head"><div><h1><span class="grad">Statistika</span></h1><div class="sub" id="periodSub">&nbsp;</div></div>${filtersHtml()}</div><div id="stats">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  bindFilters(renderStats);
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to, ...(state.project ? { project: state.project } : {}) });
  let s;
  try { s = await api(`/api/summary?${q}`); } catch (e) { const el = $('#stats'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#stats');
  if (!box || isStale(rid)) return;
  $('#periodSub').textContent = `${from === to ? from : `${from} — ${to}`} · oldingi davrga nisbatan`;
  const t = s.totals, d = s.delta;
  const single = Boolean(state.project);
  box.innerHTML = `
    <div class="kpis">
      ${kpi({ label: 'Reklama xarajati', value: fmtUsd(t.spend, 0), sub: `${fmtUzs(t.spend_uzs)} so'm · klik ${fmtN(t.clicks)}`, d: d.spend, invert: true })}
      ${kpi({ label: '1 lid narxi', value: fmtUsd(t.cpl), sub: `klik narxi ${fmtUsd(t.cpc, 3)}`, d: d.cpl, invert: true })}
      ${kpi({ label: 'Lidlar', value: fmtN(t.leads), sub: t.reported.qualified ? `sifatli ${fmtP(t.qualified_share, 0)} · sifatsiz ${fmtP(t.unqualified_share, 0)}` : '', d: d.leads })}
      ${kpi({ label: 'Sotuvlar', value: fmtN(t.sales), sub: `${fmtUzs(t.revenue)} so'm · lid→sotuv ${fmtP(t.lead_to_sale)} · ROAS ${t.roas == null ? '—' : fmtN(t.roas, 1)}`, d: d.sales })}
    </div>
    <div class="grid ${single ? 'g2' : 'g-wide'} mt">
      ${single ? '' : `<div class="card"><div class="card-head"><h2>Loyihalar</h2><button class="btn small" id="csvBtn">${ICONS.dl} CSV</button></div>${projectTable(s.byProject)}</div>`}
      ${planCard(s.plan)}
      ${single ? `<div class="card"><div class="card-head"><h2>Lidlar va sotuvlar</h2></div><div class="chart-box"><canvas id="chLeads"></canvas></div></div>` : ''}
    </div>
    ${single ? '' : `<div class="grid g2 mt">
      <div class="card"><div class="card-head"><h2>Lidlar va sotuvlar</h2><span class="muted" id="gLabel"></span></div><div class="chart-box"><canvas id="chLeads" aria-label="Lidlar va sotuvlar"></canvas></div></div>
      <div class="card"><div class="card-head"><h2>1 lid narxi</h2></div><div class="chart-box"><canvas id="chCpl" aria-label="Lid narxi"></canvas></div></div>
    </div>`}
    ${single ? dailyTable(s) : ''}
    ${s.notes.length ? `<div class="card mt"><div class="card-head"><h2>Kreativlar va izohlar</h2></div>${notesHtml(s.notes, single)}</div>` : ''}`;
  $('#csvBtn').onclick = () => downloadCsv(q).catch((e) => toast(e.message, true));
  box.querySelector('#projTable')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) { state.project = tr.dataset.id; renderStats(); }
  });
  drawCharts(s.series);
}

function projectTable(list) {
  const roas = (x) => (x == null ? '—' : `<span class="pill ${x >= 3 ? 'good' : x >= 1 ? 'warn' : 'crit'}">${fmtN(x, 2)}</span>`);
  return `<div class="table-wrap"><table id="projTable"><thead><tr><th>Loyiha</th><th class="n">Xarajat</th><th class="n">1 lid</th><th class="n">Lid</th><th class="n">Sifatli</th><th class="n">Sotuv</th><th class="n">Lid→sotuv</th><th class="n">Tushum</th><th class="n">ROAS</th></tr></thead>
    <tbody>${list.map((p) => `<tr class="click" data-id="${p.id}" title="Loyiha bo'yicha batafsil"><td>${dot(p.color)}${esc(p.name)}</td><td class="n">${fmtUsd(p.spend, 0)}</td><td class="n">${fmtUsd(p.cpl)}</td>
      <td class="n">${fmtN(p.leads)}</td><td class="n">${p.reported.qualified ? fmtP(p.qualified_share, 0) : '—'}</td><td class="n">${fmtN(p.sales)}</td><td class="n">${fmtP(p.lead_to_sale)}</td>
      <td class="n">${fmtUzs(p.revenue)}</td><td class="n">${roas(p.roas)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Loyihalar yo\'q</td></tr>'}</tbody></table></div>`;
}

function dailyTable(s) {
  const rows = [...s.series].reverse();
  const cell = (v, f = fmtN) => (v ? f(v) : '<span class="muted">—</span>');
  return `<div class="card mt"><div class="card-head"><h2>Kunma-kun</h2><button class="btn small" id="csvBtn">${ICONS.dl} CSV</button></div>
    <div class="table-wrap"><table><thead><tr><th>Sana</th><th class="n">Xarajat</th><th class="n">Klik</th><th class="n">Lid</th><th class="n">Sifatli</th><th class="n">1 lid</th><th class="n">Sotuv</th><th class="n">Tushum</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${shortDate(r.date)}</td><td class="n">${cell(r.spend, (x) => fmtUsd(x, 0))}</td><td class="n">${cell(r.clicks)}</td><td class="n">${cell(r.leads)}</td>
      <td class="n">${cell(r.qualified)}</td><td class="n">${r.cpl == null ? '—' : fmtUsd(r.cpl)}</td><td class="n">${cell(r.sales)}</td><td class="n">${cell(r.revenue, fmtUzs)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function notesHtml(notes, single) {
  const parts = (n) => [['⭐', n.creative_best], ['👎', n.creative_worst], ['Targetolog:', n.note_target], ['ROP:', n.note_sales]]
    .filter((x) => x[1]).map(([l, x]) => `<span><b>${l}</b> ${esc(x)}</span>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Sana</th>${single ? '' : '<th>Loyiha</th>'}<th>Izoh</th></tr></thead><tbody>
    ${notes.map((n) => `<tr><td>${shortDate(n.date)}</td>${single ? '' : `<td>${esc(n.project)}</td>`}<td class="wrap"><div class="note-parts">${parts(n)}</div></td></tr>`).join('')}
  </tbody></table></div>`;
}

const PLAN_LABEL = { revenue: 'Tushum', sales: 'Sotuvlar', leads: 'Lidlar', budget: 'Byudjet' };
const PLAN_STATUS = { early: ['info', 'Oy boshi'], ahead: ['good', "Reja bo'yicha"], risk: ['warn', 'Xavf ostida'], behind: ['crit', 'Orqada'], ok: ['good', "Me'yorida"], over: ['warn', 'Tez sarflanyapti'] };
const planVal = (k, x) => (k === 'revenue' ? fmtUzs(x) : k === 'budget' ? fmtUsd(x, 0) : fmtN(x));

function planCard(plan) {
  const head = `<div class="card-head"><h2>Oylik reja</h2><span class="muted">${monthLabel(plan.month)} · ${plan.elapsed}/${plan.days} kun</span></div>`;
  if (!plan.hasPlans) return `<div class="card">${head}<div class="plan-empty"><span>Bu oyga reja yo'q</span><a class="btn small" href="#/sozlamalar?tab=plans">Reja kiritish</a></div></div>`;
  const src = plan.items.length === 1 ? plan.items[0].metrics : plan.total;
  return `<div class="card">${head}<div class="plans">${['revenue', 'sales', 'leads', 'budget'].filter((k) => src[k]?.plan).map((k) => {
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

function drawCharts(series) {
  if (!window.Chart) return;
  const base = chartBase();
  const { labels, rows, weekly } = groupSeries(series, ['leads', 'sales', 'spend']);
  const gl = $('#gLabel');
  if (gl) gl.textContent = weekly ? 'haftalik' : 'kunlik';
  const add = (id, cfg) => { const el = $(id); if (el) state.charts.push(new Chart(el, cfg)); };
  add('#chLeads', {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Lidlar', data: rows.map((r) => r.leads), backgroundColor: cssVar('--series-1'), borderRadius: 4 },
      { label: 'Sotuvlar', data: rows.map((r) => r.sales), backgroundColor: cssVar('--series-4'), borderRadius: 4 },
    ] },
    options: base,
  });
  add('#chCpl', {
    type: 'line',
    data: { labels, datasets: [{ label: '1 lid narxi, $', data: rows.map((r) => (r.leads ? +(r.spend / r.leads).toFixed(2) : null)), borderColor: cssVar('--series-2'), backgroundColor: cssVar('--series-2'), borderWidth: 2, pointRadius: rows.length > 20 ? 0 : 3, tension: 0.25, spanGaps: true }] },
    options: { ...base, plugins: { ...base.plugins, legend: { display: false } }, scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, precision: undefined } } } },
  });
}
