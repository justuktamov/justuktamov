// Bosh sahifa — doska: har bir loyiha alohida ustun (CRM dagi kabi). Ustun bosilsa — loyihaning to'liq sahifasi.
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, fmtN, fmtUsd, fmtSom, fmtP,
  spinnerBlock, downloadCsv, toast, ICONS, isStale, monthLabel,
} from './core.js';
import { signed, statusOf } from './blocks.js';

export async function renderBoard() {
  shell(`<div class="toolbar">${filtersHtml({ project: false })}<div class="totals" id="totals"></div>
      <button class="btn small" id="csvBtn" title="Excel uchun">${ICONS.dl} CSV</button></div>
    <div id="board">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  bindFilters(renderBoard);
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to });
  $('#csvBtn').onclick = () => downloadCsv(q).catch((e) => toast(e.message, true));
  let s;
  try { s = await api(`/api/summary?${q}`); } catch (e) { const el = $('#board'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#board');
  if (!box || isStale(rid)) return;
  if (!s.byProject.length) {
    box.innerHTML = `<div class="card empty">Hali loyiha yo'q. <a href="#/kiritish">Bugungi hisobot</a> bo'limida loyihalarni qo'shing.</div>`;
    return;
  }
  const t = s.totals;
  $('#totals').innerHTML = `
    <span><small>Reklama</small><b>${fmtUsd(t.spend, 0)}</b></span>
    <span><small>Tushum</small><b>${fmtSom(t.revenue)}</b></span>
    <span><small>Sof foyda</small><b class="${t.net_profit < 0 ? 'neg' : 'pos'}">${signed(t.net_profit)}</b></span>
    <span><small>Marja</small><b>${fmtP(t.net_margin, 0)}</b></span>`;
  // Shu oy uchun rejasi yo'q loyihalar — eslatma
  const missing = s.byProject.filter((p) => !s.plan.items.some((i) => i.project_id === p.id));
  const banner = missing.length && s.plan.month === state.me.today.slice(0, 7)
    ? `<div class="plan-banner"><span>📅</span><div><b>${monthName(s.plan.month)} uchun reja kiritilmagan:</b> ${missing.map((p) => esc(p.name)).join(', ')}.
        <span class="muted">Reja bo'lsa, dastur orqada qolishni va uning sababini oldindan aytadi.</span></div><a class="btn small primary" href="#/sozlamalar?tab=plans">Reja kiritish</a></div>` : '';
  box.innerHTML = `${banner}<div class="board" style="--n:${s.byProject.length}">${s.byProject.map((p) => column(p, s.plan)).join('')}</div>`;
  box.querySelector('.board').addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // ichidagi havola (Reja kiritish) o'zi ishlasin
    const col = e.target.closest('[data-open]');
    if (col) location.hash = `#/loyiha/${col.dataset.open}`;
  });
  box.querySelector('.board').addEventListener('keydown', (e) => {
    const col = e.target.closest('[data-open]');
    if (col && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = `#/loyiha/${col.dataset.open}`; }
  });
}

const monthName = (m) => { const n = monthLabel(m).split(' ')[0]; return n[0].toUpperCase() + n.slice(1); };
const PLAN_ROWS = [['revenue', 'Tushum'], ['sales', 'Sotuv'], ['leads', 'Lid']];

function planTile(p, plan) {
  const pi = plan.items.find((i) => i.project_id === p.id);
  if (!pi) return `<div class="tile"><small>Oylik reja</small><p class="why">Kiritilmagan</p><a class="btn small" href="#/sozlamalar?tab=plans">Reja kiritish</a></div>`;
  const rows = PLAN_ROWS.filter(([k]) => pi.metrics[k]?.plan).map(([k, l]) => {
    const m = pi.metrics[k];
    const st = m.status === 'behind' ? 'crit' : m.status === 'risk' ? 'warn' : 'good';
    return `<div class="pm-row"><span>${l}</span><i class="pm-track"><i class="pm-fill ${st}" style="width:${Math.min(m.pct * 100, 100)}%"></i><i class="pm-mark" style="left:${Math.min(m.expected_pct * 100, 100)}%"></i></i><b>${fmtP(m.pct, 0)}</b></div>`;
  }).join('');
  const a = pi.alerts[0];
  return `<div class="tile"><small>Oylik reja · ${plan.elapsed}/${plan.days} kun</small>${rows}
    ${a ? `<p class="plan-warn ${a.level}">${esc(a.text)}</p>` : plan.elapsed >= 5 ? '<p class="plan-ok">✓ Reja bo\'yicha</p>' : '<p class="why">Oy boshi — xulosa 5-kundan</p>'}</div>`;
}

function column(p, plan) {
  const [cls, label] = statusOf(p);
  const auto = p.kind === 'auto';
  const issue = p.insights.find((i) => i.level === 'critical') || p.insights.find((i) => i.level === 'warning');
  const funnel = auto
    ? [['Klik', p.clicks, ''], ...(p.reported.starts ? [['Bot start', p.starts, `1 start ${fmtUsd(p.cost_per_start)}`]] : []), ['Xarid', p.sales, fmtP(p.conv)]]
    : [['Klik', p.clicks, ''], ['Lid', p.leads, `1 lid ${fmtUsd(p.cpl)}`], ['Sotuv', p.sales, fmtP(p.conv)]];
  const q = [['q-good', p.qualified], ['q-mid', p.potential], ['q-bad', p.unqualified]];
  const badTop = p.reasons.bad[0];
  return `<section class="col" style="--pc:${esc(p.color || '#4c86ff')}" data-open="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} — batafsil">
    <header class="col-head"><span class="col-dot"></span><div><h2>${esc(p.name)}</h2><small>${auto ? 'avtovoronka' : "sotuv bo'limi"}</small></div><span class="pill ${cls}">${label}</span></header>
    <div class="tile money">
      <small>Sof foyda</small>
      <b class="big ${p.net_profit < 0 ? 'neg' : 'pos'}">${signed(p.net_profit)}</b>
      <div class="kv"><span>Tushum</span><b>${fmtSom(p.revenue)}</b></div>
      <div class="kv"><span>Reklama</span><b>${fmtUsd(p.spend, 0)}</b></div>
      <div class="kv"><span>Marja</span><b>${fmtP(p.net_margin, 0)}</b></div>
    </div>
    <div class="tile">
      <small>${auto ? 'Avtovoronka' : 'Voronka'}</small>
      ${funnel.map(([l, v, extra]) => `<div class="kv"><span>${l}</span><b>${fmtN(v)}</b>${extra ? `<em>${extra}</em>` : '<em></em>'}</div>`).join('')}
    </div>
    ${auto ? '' : `<div class="tile">
      <small>Lid sifati</small>
      ${p.leads && p.reported.qualified ? `<div class="qbar sm">${q.filter((x) => x[1]).map(([c, v]) => `<i class="${c}" style="flex:${v}"></i>`).join('')}</div>
        <div class="kv"><span>Sifatli</span><b>${fmtP(p.qualified_share, 0)}</b></div>
        <div class="kv"><span>Sifatsiz</span><b>${fmtP(p.unqualified_share, 0)}</b></div>
        ${badTop ? `<p class="why">Nega: «${esc(badTop.label)}» — ${fmtP(badTop.share, 0)}</p>` : ''}` : '<p class="why">Kiritilmagan</p>'}
    </div>`}
    ${planTile(p, plan)}
    ${issue ? `<div class="tile issue ${issue.level}"><small>${issue.level === 'critical' ? 'Muhim' : 'Diqqat'}</small><p>${esc(issue.text)}</p></div>` : ''}
    ${p.price ? `<div class="tile price-tile"><small>Narx</small><p><b>${{ up: '↑', down: '↓', keep: '=', cost: '!' }[p.price.verdict]}</b> ${esc(p.price.title)}</p></div>` : ''}
    <div class="col-foot">Batafsil →</div>
  </section>`;
}
