// Oylar bo'yicha dinamika: tushum, xarajat, foyda, lid narxi, konversiya — oyma-oy qanday o'zgaryapti
import {
  $, esc, api, state, shell, fmtN, fmtUsd, fmtUzs, fmtP, spinnerBlock, isStale, monthLabel, chartBase, cssVar,
} from './core.js';
import { dot, signed } from './blocks.js';

// [kalit, nom, format, yaxshi tomoni: 1 — o'sish yaxshi, -1 — kamayish yaxshi, 0 — neytral, kunlik sur'atda solishtiriladimi]
const ROWS = [
  ['revenue', 'Tushum', (x) => `${fmtUzs(x)} so'm`, 1, true],
  ['spend', 'Reklama', (x) => fmtUsd(x, 0), 0, true],
  ['net_profit', 'Sof foyda', (x) => signed(x), 1, true],
  ['net_margin', 'Marja', (x) => fmtP(x, 0), 1, false],
  ['leads', 'Lidlar', fmtN, 1, true],
  ['qualified_share', 'Sifatli lid ulushi', (x) => fmtP(x, 0), 1, false],
  ['cpl', '1 lid narxi', (x) => fmtUsd(x), -1, false],
  ['sales', 'Sotuvlar', fmtN, 1, true],
  ['conv', 'Konversiya', (x) => fmtP(x), 1, false],
  ['cac', '1 mijoz narxi', (x) => fmtUsd(x, x < 10 ? 2 : 0), -1, false],
  ['avg_check', "O'rtacha chek", (x) => `${fmtUzs(x)} so'm`, 0, false],
  ['roas', 'ROAS', (x) => (x == null ? '—' : `${fmtN(x, 1)}×`), 1, false],
  ['repeat_share', 'Qayta sotuv ulushi', (x) => fmtP(x, 0), 1, false],
];

// Turli uzunlikdagi oylar (va tugamagan joriy oy) kunlik sur'at bo'yicha solishtiriladi
function change(key, perDay, cur, prev) {
  const a = cur.totals[key], b = prev?.totals[key];
  if (a == null || b == null || !prev.has) return null;
  const x = perDay ? a / cur.days : a, y = perDay ? b / prev.days : b;
  if (key === 'net_profit' || key === 'net_margin') return y === 0 ? null : (x - y) / Math.abs(y);
  return y === 0 ? null : (x - y) / y;
}

export async function renderDynamics() {
  state.dyn ||= { project: '', months: 6 };
  const f = state.dyn;
  const projects = state.projects.filter((x) => x.active);
  shell(`<div class="page-head"><div><h1>Dinamika</h1><div class="sub">Oyma-oy: o'syapmizmi yoki pasayyapmizmi</div></div>
      <div class="filters"><div class="seg" id="dynMonths">${[6, 12].map((m) => `<button data-m="${m}" class="${f.months === m ? 'on' : ''}">${m} oy</button>`).join('')}</div></div></div>
    <div class="chips" id="dynProj"><button class="chip ${!f.project ? 'on' : ''}" data-p="">Hammasi</button>${projects.map((p) => `<button class="chip ${String(f.project) === String(p.id) ? 'on' : ''}" data-p="${p.id}">${dot(p.color)}${esc(p.name)}</button>`).join('')}</div>
    <div id="dyn">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  $('#dynMonths').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { f.months = Number(b.dataset.m); renderDynamics(); } };
  $('#dynProj').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { f.project = b.dataset.p; renderDynamics(); } };
  let data;
  try { data = await api(`/api/monthly?${new URLSearchParams({ months: f.months, ...(f.project ? { project: f.project } : {}) })}`); } catch (e) { const el = $('#dyn'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#dyn');
  if (!box || isStale(rid)) return;
  const months = data.filter((m, i) => m.has || data.slice(0, i).some((x) => x.has));
  if (!months.length) { box.innerHTML = '<div class="card empty">Hali ma\'lumot yo\'q — kunlik raqamlar kiritilgach oylar shu yerda solishtiriladi.</div>'; return; }

  const auto = f.project && projects.find((p) => String(p.id) === String(f.project))?.kind === 'auto';
  // «Hammasi»da mijoz narxi va o'rtacha chek arzon avtovoronka bilan aralashib ma'nosini yo'qotadi — faqat loyiha tanlanganda
  const rows = ROWS.filter(([k]) => !(auto && ['leads', 'qualified_share', 'cpl'].includes(k)) && !(!f.project && ['cac', 'avg_check'].includes(k)))
    .map((r) => (r[0] === 'conv' && !f.project ? [r[0], 'Konversiya (lid → sotuv)', ...r.slice(2)] : r));
  const head = months.map((m) => `<th class="n">${esc(monthLabel(m.month))}${m.partial ? `<br><span class="muted small">${m.days} kun</span>` : ''}</th>`).join('');
  const cell = ([k, , fmt, good, perDay], m, i) => {
    const d = change(k, perDay, m, months[i - 1]);
    const cls = d == null || !good || Math.abs(d) < 0.03 ? '' : (d > 0) === (good > 0) ? 'pos' : 'neg';
    const v = m.totals[k];
    return `<td class="n">${m.has && v != null ? fmt(v) : '—'}${d != null && Math.abs(d) >= 0.005 ? `<br><span class="small ${cls}">${d > 0 ? '▲' : '▼'} ${fmtN(Math.abs(d) * 100, 0)}%</span>` : ''}</td>`;
  };
  // Hammasi: har loyihaning sof foydasi oyma-oy — qaysi biri tortyapti, qaysi biri yeyapti
  const byProject = !f.project ? `<div class="card mt"><div class="card-head"><h2>Loyihalar sof foydasi</h2><span class="muted small">oyma-oy</span></div>
    <div class="table-wrap"><table><thead><tr><th>Loyiha</th>${head}</tr></thead><tbody>
    ${projects.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td>${months.map((m) => {
      const x = m.byProject.find((y) => y.id === p.id);
      return `<td class="n ${x?.net_profit < 0 ? 'neg' : 'pos'}">${x && (x.revenue || x.spend) ? signed(x.net_profit) : '—'}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div></div>` : '';

  box.innerHTML = `<div class="card"><div class="card-head"><h2>Tushum va barcha xarajat</h2><span class="muted small">reklama + tannarx + doimiy xarajat, so'm</span></div>
      <div class="chart-box"><canvas aria-label="Oylar bo'yicha tushum va xarajat"></canvas></div></div>
    <div class="card mt"><div class="card-head"><h2>Ko'rsatkichlar</h2><span class="muted small">▲▼ — o'tgan oyga nisbatan; summalar kunlik sur'atda solishtiriladi</span></div>
      <div class="table-wrap"><table class="dyn-table"><thead><tr><th>Ko'rsatkich</th>${head}</tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r[1]}</td>${months.map((m, i) => cell(r, m, i)).join('')}</tr>`).join('')}</tbody></table></div>
      ${months.at(-1).partial ? `<p class="muted small">${esc(monthLabel(months.at(-1).month))} hali tugamagan — ${months.at(-1).days} kunlik ma'lumot.</p>` : ''}</div>
    ${byProject}`;

  if (!window.Chart) return;
  const base = chartBase();
  const costs = months.map((m) => (m.totals.revenue ?? 0) - (m.totals.net_profit ?? 0));
  state.charts.push(new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: { labels: months.map((m) => monthLabel(m.month) + (m.partial ? '*' : '')), datasets: [
      { label: 'Tushum', data: months.map((m) => m.totals.revenue ?? 0), backgroundColor: cssVar('--series-1'), borderRadius: 4, maxBarThickness: 36 },
      { label: 'Xarajat', data: costs, backgroundColor: cssVar('--series-2'), borderRadius: 4, maxBarThickness: 36 },
    ] },
    options: { ...base,
      plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: {
        label: (c) => ` ${c.dataset.label}: ${fmtUzs(c.raw)} so'm`,
        footer: (items) => `Sof foyda: ${signed(months[items[0].dataIndex].totals.net_profit)}`,
      } } },
      scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, callback: (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(0)} mln so'm` : `${v} so'm`) } } } },
  }));
}
