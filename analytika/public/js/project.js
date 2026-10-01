// Bitta loyiha sahifasi: voronka, reja, kunlik jadval, reklama postlari, sabablar
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, fmtN, fmtUsd, fmtUzs, fmtP, shortDate,
  insightsHtml, spinnerBlock, downloadCsv, toast, ICONS, botLink, copyText, isStale,
} from './core.js';
import { funnelHtml, planCard, reasonsHtml, notesHtml, chartCards, drawSeriesCharts } from './widgets.js';
import { kpiRow } from './dashboard.js';

export async function renderProject(id) {
  const p = state.projects.find((x) => String(x.id) === String(id));
  if (!p) { location.hash = '#/'; return; }
  shell(`<a class="back" href="#/">← Bosh panel</a>
    <div class="page-head"><div><h1><span class="dot" style="background:${esc(p.color || 'var(--series-1)')};width:12px;height:12px"></span>${esc(p.name)}</h1>
      <div class="sub"><span class="code">${esc(botLink(p.slug))}</span> <button class="btn small ghost" id="copyLink" aria-label="Havoladan nusxa">${ICONS.copy}</button></div></div>
      ${filtersHtml({ project: false })}</div>
    <div id="proj">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  bindFilters(() => renderProject(id));
  $('#copyLink').onclick = () => copyText(botLink(p.slug));
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to, project: id });
  let s, rows, camps;
  try {
    [s, rows, camps] = await Promise.all([api(`/api/summary?${q}`), api(`/api/rows?${q}`), api(`/api/campaigns?${q}`)]);
  } catch (e) { const el = $('#proj'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#proj');
  if (!box || isStale(rid)) return;
  const reasonsByDay = {};
  for (const r of rows.reasons) reasonsByDay[r.date] = (reasonsByDay[r.date] || 0) + r.count;
  box.innerHTML = `
    ${kpiRow(s)}
    <div class="grid g-wide">
      <div class="card"><div class="card-head"><h2>Voronka</h2><span class="muted">${from === to ? from : `${from} — ${to}`}</span></div>${funnelHtml(s.totals)}</div>
      ${planCard(s.plan, { title: 'Oylik reja', single: true })}
    </div>
    <div class="grid g2 mt">
      <div class="card"><div class="card-head"><h2>Xulosalar</h2></div>${insightsHtml(s.insights)}</div>
      <div class="card"><div class="card-head"><h2>Nega sotib olmadi?</h2></div>${reasonsHtml(s.reasons)}</div>
    </div>
    ${chartCards()}
    <div class="card mt"><div class="card-head"><h2>Kunma-kun</h2><span class="row"><a class="btn small" href="#/">${ICONS.edit} Kiritish</a><button class="btn small" id="csvBtn">${ICONS.dl} CSV</button></span></div>
      <div class="table-wrap"><table><thead><tr><th>Sana</th><th class="n">Xarajat</th><th class="n">Klik</th><th class="n">Start</th><th class="n">Lid</th><th class="n">Sotuv</th><th class="n">Lid→sotuv</th><th class="n">Tushum</th><th class="n">Rad sabablari</th><th>Izoh</th></tr></thead>
      <tbody>${rows.rows.map((r) => {
        const conv = r.leads ? r.sales / r.leads : null;
        const note = [r.note_target, r.note_lead, r.note_sales, r.note_finance].filter(Boolean).join(' · ');
        const cell = (v, f = fmtN) => (v == null ? '<span class="muted">—</span>' : f(v));
        return `<tr><td>${shortDate(r.date)}</td><td class="n">${cell(r.spend, (x) => fmtUsd(x, 0))}</td><td class="n">${cell(r.clicks)}</td>
          <td class="n">${cell(r.starts)}${r.starts_source === 'bot' ? '<span class="tag-auto">bot</span>' : ''}</td><td class="n">${cell(r.leads)}</td><td class="n">${cell(r.sales)}</td>
          <td class="n">${conv == null || r.sales == null ? '—' : fmtP(conv)}</td><td class="n">${cell(r.revenue == null ? null : (r.revenue || 0) + (r.repeat_revenue || 0), fmtUzs)}</td>
          <td class="n">${reasonsByDay[r.date] ? fmtN(reasonsByDay[r.date]) : '—'}</td><td class="wrap small">${esc(note)}</td></tr>`;
      }).join('') || '<tr><td colspan="10" class="empty">Bu davrda ma\'lumot yo\'q</td></tr>'}</tbody></table></div></div>
    <div class="card mt"><div class="card-head"><h2>Reklama postlari</h2><a class="small" href="#/reklama">Hammasi →</a></div>
      ${camps.rows.length ? `<div class="table-wrap"><table><thead><tr><th>Sana</th><th>Post</th><th>Platforma</th><th class="n">Xarajat</th><th class="n">Start</th><th class="n">1 start</th><th class="n">Lid</th><th class="n">Sotuv</th></tr></thead><tbody>
        ${camps.rows.slice(0, 8).map((c) => `<tr><td>${shortDate(c.date)}</td><td>${esc(c.name)}</td><td>${esc(c.platform_label)}</td><td class="n">${fmtUsd(c.spend, 0)}</td>
          <td class="n">${fmtN(c.starts)}${c.auto.start ? '<span class="tag-auto">bot</span>' : ''}</td><td class="n">${fmtUsd(c.cost_per_start, 3)}</td><td class="n">${fmtN(c.leads)}</td><td class="n">${fmtN(c.sales)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="muted small">Bu davrda post kiritilmagan.</div>'}</div>
    ${s.notes.length ? `<div class="card mt"><div class="card-head"><h2>Izohlar</h2></div>${notesHtml(s.notes)}</div>` : ''}`;
  $('#csvBtn').onclick = () => downloadCsv(q).catch((e) => toast(e.message, true));
  drawSeriesCharts(s.series);
}
