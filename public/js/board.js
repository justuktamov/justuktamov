// Bosh sahifa — doska: har bir loyiha alohida ustun (CRM dagi kabi). Ustun bosilsa — loyihaning to'liq sahifasi.
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, fmtN, fmtUsd, fmtUzs, fmtSom, fmtP,
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
    box.innerHTML = `<div class="card empty">Hali loyiha yo'q. <a href="#/kiritish">Kechagi hisobot</a> bo'limida loyihalarni qo'shing.</div>`;
    return;
  }
  const t = s.totals;
  $('#totals').innerHTML = `
    <span><small>Tushum</small><b>${fmtSom(t.revenue)}</b></span>
    <span><small>Sof foyda</small><b class="${t.net_profit < 0 ? 'neg' : 'pos'}">${signed(t.net_profit)}</b></span>
    <span><small>Reklama</small><b>${fmtUsd(t.spend, 0)}</b></span>
    <span><small>Marja</small><b>${fmtP(t.net_margin, 0)}</b></span>`;
  // Shu oy uchun rejasi yo'q loyihalar — eslatma
  const missing = s.byProject.filter((p) => !s.plan.items.some((i) => i.project_id === p.id));
  const banner = missing.length && s.plan.month === state.me.reportDay.slice(0, 7)
    ? `<div class="plan-banner"><span>📅</span><div><b>${monthName(s.plan.month)} uchun reja kiritilmagan:</b> ${missing.map((p) => esc(p.name)).join(', ')}.
        <span class="muted">Reja bo'lsa, dastur orqada qolishni va uning sababini oldindan aytadi.</span></div><a class="btn small primary" href="#/sozlamalar?tab=plans">Reja kiritish</a></div>` : '';
  const closed = getCollapsed();
  const layout = () => {
    const n = s.byProject.length;
    return `--cols:repeat(${n}, minmax(260px, 1fr));--cols-m:repeat(${n}, 84vw)`;
  };
  box.innerHTML = `${banner}<div class="board" style="${layout()}">${s.byProject.map((p) => column(p, s.plan, closed.has(p.id))).join('')}</div>`;
  const board = box.querySelector('.board');
  // Yig'ish / ochish — faqat nomi qoladi; tanlov shu brauzerda eslab qolinadi
  const toggle = (col) => {
    const id = Number(col.dataset.open);
    if (closed.has(id)) closed.delete(id); else closed.add(id);
    setCollapsed(closed);
    col.classList.toggle('collapsed', closed.has(id));
    col.querySelector('[data-collapse]').setAttribute('aria-expanded', String(!closed.has(id)));
    col.querySelector('[data-collapse]').title = closed.has(id) ? 'Ochish' : "Yig'ish";
    board.setAttribute('style', layout());
  };
  board.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // ichidagi havola (Reja kiritish) o'zi ishlasin
    const exp = e.target.closest('[data-exp]');
    if (exp) { exp.classList.toggle('open'); exp.setAttribute('aria-expanded', String(exp.classList.contains('open'))); return; }
    const btn = e.target.closest('[data-collapse]');
    const yig = e.target.closest('.col.collapsed');
    if (btn || yig) { toggle((btn || yig).closest('.col')); return; }
    const col = e.target.closest('[data-open]');
    if (col) location.hash = `#/loyiha/${col.dataset.open}`;
  });
  board.addEventListener('keydown', (e) => {
    if (e.target.closest('[data-collapse]')) return;
    const exp = e.target.closest('[data-exp]');
    if (exp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); exp.click(); return; }
    const col = e.target.closest('[data-open]');
    if (col?.classList.contains('collapsed') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(col); return; }
    if (col && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = `#/loyiha/${col.dataset.open}`; }
  });
}

const ic = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const M_IC = {
  ad: ic('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M18.5 5.5 21 3M18.5 5.5V3M18.5 5.5H21"/>'),
  rev: ic('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
  up: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  down: ic('<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>'),
};
const COLLAPSE_KEY = 'board-collapsed';
function getCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]').map(Number)); } catch { return new Set(); }
}
function setCollapsed(set) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set])); } catch { /* xotira yo'q */ }
}
const COLLAPSE_IC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
// Umumiy reklama xarajati ichida: target, blogerlar, Telegram kanallar — summasi va ulushi; 1 lid va 1 mijoz narxi umumiy xarajatdan
function adRows(p) {
  const parts = [['Target', p.target_spend], ['Blogerlar', p.spend_blogger], ['Telegram kanallar', p.spend_posts]];
  const total = p.spend || 0;
  return `${parts.map(([l, v]) => `<div class="ab-row ${v ? '' : 'zero'}"><span>${l}</span><i><i style="width:${total ? Math.round((v / total) * 100) : 0}%"></i></i><b>${fmtUsd(v, 0)}</b><em>${total ? fmtP(v / total, 0) : '—'}</em></div>`).join('')}
    <div class="ab-unit">${p.kind === 'auto' ? `1 xarid ${fmtUsd(p.cac, 2)}` : `1 lid ${fmtUsd(p.cpl)} · 1 mijoz ${fmtUsd(p.cac, 0)}`} <span>umumiy xarajatdan</span></div>`;
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

function column(p, plan, collapsed = false) {
  const [cls, label] = statusOf(p);
  const auto = p.kind === 'auto';
  const issue = p.insights.find((i) => i.level === 'critical') || p.insights.find((i) => i.level === 'warning');
  // Workflow: ko'rish → klik → lid (bot start) → sotuv (xarid); bosqichlar orasida o'tish foizi
  const fc = Object.fromEntries((p.funnel_check?.steps || []).map((x) => [x.key, x]));
  const steps = [
    p.reported.impressions ? ["Ko'rishlar", p.impressions, null] : null,
    ['Klik', p.clicks, p.reported.impressions ? ['CTR', p.ctr, fc.ctr] : null, p.cpc != null ? `1 klik ${fmtUsd(p.cpc)} · target ${fmtUsd(p.target_spend, 0)}` : null],
    auto ? (p.reported.starts ? ['Bot start', p.starts, ['', p.click_to_start, fc.click_to_start]] : null)
      : ['Lid', p.leads, ['', p.click_to_lead, fc.click_to_lead]],
    [auto ? 'Xarid' : 'Sotuv', p.sales, ['', p.conv, fc.conv]],
  ].filter(Boolean);
  const worst = p.funnel_check?.worst;
  const q = [['q-good', p.qualified], ['q-mid', p.potential], ['q-bad', p.unqualified]];
  const badTop = p.reasons.bad[0];
  return `<section class="col ${collapsed ? 'collapsed' : ''}" style="--pc:${esc(p.color || '#4c86ff')}" data-open="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} — batafsil">
    <header class="col-head"><button type="button" class="col-toggle" data-collapse aria-expanded="${!collapsed}" title="${collapsed ? 'Ochish' : "Yig'ish"}" aria-label="${esc(p.name)} — yig'ish yoki ochish">${COLLAPSE_IC}</button>
      <span class="col-dot"></span><div class="col-name"><h2>${esc(p.name)}</h2><small>${auto ? 'avtovoronka' : "sotuv bo'limi"}</small></div><span class="pill ${cls}">${label}</span></header>
    <div class="tile money">
      <div class="m-hero ad" data-exp role="button" tabindex="0" aria-expanded="false" title="Bosing — qayerga qancha ketgani"><span class="m-ic">${M_IC.ad}</span><div><small>Reklama · umumiy</small><b>${fmtUsd(p.spend, 0)}</b><span class="m-sub">${fmtUzs(p.spend_uzs)} so'm</span></div><span class="m-chev">${CHEV}</span>
        <div class="ad-break">${adRows(p)}</div></div>
      <div class="m-hero rev"><span class="m-ic">${M_IC.rev}</span><div><small>Tushum</small><b>${fmtUzs(p.revenue)}<i>so'm</i></b><span class="m-sub">${fmtN(p.sales)} ta ${auto ? 'xarid' : 'sotuv'}</span></div></div>
      <div class="m-hero ${p.net_profit < 0 ? 'loss' : 'profit'}"><span class="m-ic">${p.net_profit < 0 ? M_IC.down : M_IC.up}</span><div><small>${p.net_profit < 0 ? 'Zarar' : 'Sof foyda'}</small><b>${signed(p.net_profit, false)}<i>so'm</i></b><span class="m-sub">barcha xarajatdan keyin</span></div></div>
    </div>
    <div class="tile">
      <small>${auto ? 'Avtovoronka' : 'Voronka'} · target</small>
      <ol class="fv">${steps.map(([l, v, rate, note], i) => `${i && rate ? `<li class="fv-link ${rate[2]?.status || ''}"><span title="${rate[2]?.norm ? `Odatda ${fmtP(rate[2].norm)}` : ''}">${rate[0] ? `${rate[0]} ` : ''}${fmtP(rate[1])}${rate[2]?.status === 'low' ? ' ↓' : rate[2]?.status === 'high' ? ' ↑' : ''}</span></li>` : i ? '<li class="fv-link"></li>' : ''}
        <li class="fv-node ${i === steps.length - 1 ? 'last' : ''}"><span class="fv-l">${l}</span><b>${fmtN(v)}</b>${note ? `<em>${note}</em>` : ''}</li>`).join('')}</ol>
      ${worst ? `<p class="fv-diag"><b>${esc(worst.from)} → ${esc(worst.to)}:</b> ${esc(worst.problem)}</p>` : ''}
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
