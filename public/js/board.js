// Bosh sahifa — doska: har bir loyiha alohida ustun (CRM dagi kabi). Ustun bosilsa — loyihaning to'liq sahifasi.
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, fmtN, fmtUsd, fmtUzs, fmtSom, fmtP,
  spinnerBlock, downloadCsv, toast, ICONS, isStale, monthLabel,
} from './core.js';
import { signed, statusOf, M_IC } from './blocks.js';

export async function renderBoard() {
  shell(`<div class="toolbar">${filtersHtml({ project: false })}<div class="totals" id="totals"></div>
      <div class="arch-wrap" id="archSlot"></div>
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
  archFolder();
  // Arxivdagi loyiha shu davrda raqami bo'lsa jamida hisoblanadi, lekin ustuni ko'rsatilmaydi
  const cols = s.byProject.filter((p) => !p.archived);
  const archived = s.byProject.filter((p) => p.archived);
  if (!cols.length && !archived.length) {
    box.innerHTML = state.projects.some((p) => !p.active)
      ? `<div class="card empty">Hamma loyihalar arxivda — tepadagi «Arxiv» papkasidan qaytaring.</div>`
      : `<div class="card empty">Hali loyiha yo'q. <a href="#/kiritish">Kechagi hisobot</a> bo'limida loyihalarni qo'shing.</div>`;
    return;
  }
  const t = s.totals;
  $('#totals').innerHTML = `
    <span><small>Tushum</small><b>${fmtSom(t.revenue)}</b></span>
    <span><small>Sof foyda</small><b class="${t.net_profit < 0 ? 'neg' : 'pos'}">${signed(t.net_profit)}</b></span>
    <span><small>Reklama</small><b>${fmtUsd(t.spend, 0)}</b></span>
    <span><small>Marja</small><b>${fmtP(t.net_margin, 0)}</b></span>
    ${archived.length ? `<span class="arch-note" title="Arxivdagi loyihalarning shu davrdagi raqamlari ham jamida"><small>Jamida arxivdan</small><b>${archived.map((p) => esc(p.name)).join(', ')}</b></span>` : ''}`;
  if (!cols.length) {
    box.innerHTML = `<div class="card empty">Hamma loyihalar arxivda — tepadagi «Arxiv» papkasidan qaytaring.</div>`;
    return;
  }
  // Shu oy uchun rejasi yo'q loyihalar — eslatma
  const missing = cols.filter((p) => !s.plan.items.some((i) => i.project_id === p.id));
  const banner = missing.length && s.plan.month === state.me.reportDay.slice(0, 7)
    ? `<div class="plan-banner"><span>📅</span><div><b>${monthName(s.plan.month)} uchun reja kiritilmagan:</b> ${missing.map((p) => esc(p.name)).join(', ')}.
        <span class="muted">Reja bo'lsa, dastur orqada qolishni va uning sababini oldindan aytadi.</span></div><a class="btn small primary" href="#/sozlamalar?tab=plans">Reja kiritish</a></div>` : '';
  const closed = getCollapsed();
  const layout = () => {
    const n = cols.length;
    return `--cols:repeat(${n}, minmax(260px, 1fr));--cols-m:repeat(${n}, 84vw)`;
  };
  box.innerHTML = `${banner}<div class="board" style="${layout()}">${cols.map((p) => column(p, s.plan, closed.has(p.id))).join('')}</div>`;
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
  // Ustunlarni sudrab almashtirish (sichqoncha va barmoq); tartib serverda saqlanadi — hamma ro'yxatlarda shu tartib
  const saveOrder = async () => {
    const ids = [...board.children].map((c) => Number(c.dataset.open));
    state.projects.sort((a, b) => (ids.indexOf(a.id) + 1 || 999) - (ids.indexOf(b.id) + 1 || 999));
    try { await api('/api/projects/order', { method: 'PUT', body: { ids } }); toast('Tartib saqlandi'); } catch (err) { toast(err.message, true); }
  };
  let drag = null;
  board.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('[data-grip]');
    if (!g || e.button > 0) return;
    e.preventDefault();
    drag = { col: g.closest('.col'), moved: false };
    drag.col.classList.add('dragging');
    g.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.col');
    if (!over || over === drag.col || over.parentElement !== board) return;
    const r = over.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    if (after ? over.nextElementSibling !== drag.col : over.previousElementSibling !== drag.col) {
      board.insertBefore(drag.col, after ? over.nextElementSibling : over);
      drag.moved = true;
    }
  });
  const endDrag = () => {
    if (!drag) return;
    drag.col.classList.remove('dragging');
    if (drag.moved) saveOrder();
    drag = null;
  };
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', endDrag);
  board.addEventListener('click', (e) => {
    if (e.target.closest('[data-grip]')) return;
    const hide = e.target.closest('[data-hide]');
    if (hide) {
      const col = hide.closest('.col');
      const name = col.querySelector('h2').textContent;
      setActive(col.dataset.open, false, name);
      return;
    }
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
    const g = e.target.closest('[data-grip]');
    if (g) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const col = g.closest('.col');
      const sib = e.key === 'ArrowLeft' ? col.previousElementSibling : col.nextElementSibling;
      if (!sib) return;
      board.insertBefore(col, e.key === 'ArrowLeft' ? sib : sib.nextElementSibling);
      g.focus();
      saveOrder();
      return;
    }
    const exp = e.target.closest('[data-exp]');
    if (exp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); exp.click(); return; }
    const col = e.target.closest('[data-open]');
    if (col?.classList.contains('collapsed') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(col); return; }
    if (col && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = `#/loyiha/${col.dataset.open}`; }
  });
}

const GRIP = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const FOLDER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10h18"/></svg>';
// Arxivlash / qaytarish: tasdiq oynasisiz (ba'zi brauzer ko'rinishlarida confirm ishlamaydi) — «Arxiv» papkasidan bir bosishda qaytariladi
async function setActive(id, active, name = '') {
  try {
    await api(`/api/projects/${id}`, { method: 'PUT', body: { active } });
    state.projects = await api('/api/projects');
    toast(active ? `${name || 'Loyiha'} doskaga qaytdi` : `${name || 'Loyiha'} arxivga o'tdi — tepadagi «Arxiv» papkasida`);
    renderBoard();
  } catch (err) { toast(err.message, true); }
}
// Tepadagi «Arxiv» papkasi: arxivdagi loyihalar ro'yxati, har birini qaytarish
function archFolder() {
  const slot = $('#archSlot');
  if (!slot) return;
  const list = state.projects.filter((p) => !p.active);
  slot.innerHTML = `<button type="button" class="btn small arch-btn ${list.length ? '' : 'empty'}" aria-expanded="false" title="${list.length ? 'Arxivdagi loyihalar' : "Arxiv bo'sh"}">${FOLDER} Arxiv${list.length ? ` <span class="arch-count">${list.length}</span>` : ''}</button>
    <div class="arch-pop" hidden>${list.length ? list.map((p) => `<div class="arch-item"><span class="col-dot" style="--pc:${esc(p.color || '#4c86ff')}"></span><b>${esc(p.name)}</b>
      <button type="button" class="btn small" data-show="${p.id}" data-name="${esc(p.name)}">${EYE} Qaytarish</button></div>`).join('')
      : '<p class="muted small" style="margin:0">Arxiv bo\'sh. Loyiha sarlavhasidagi ko\'z belgisini bossangiz, shu yerga o\'tadi.</p>'}</div>`;
  const btn = slot.querySelector('.arch-btn'), pop = slot.querySelector('.arch-pop');
  const close = (e) => { if (!slot.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', close); } };
  btn.onclick = () => {
    pop.hidden = !pop.hidden;
    btn.setAttribute('aria-expanded', String(!pop.hidden));
    if (!pop.hidden) setTimeout(() => document.addEventListener('click', close));
  };
  pop.onclick = (e) => { const b = e.target.closest('[data-show]'); if (b) setActive(b.dataset.show, true, b.dataset.name); };
}
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
// Lichkadan kelgan lidlar bir qatorda: «Lichkadan: IG direkt 12 · TG 8»
function srcLine(p) {
  const parts = [['IG direkt', p.src_ig], ['TG lichka', p.src_tg]].filter(([, v]) => v > 0);
  return parts.length ? `<p class="src-line">Lichkadan: ${parts.map(([l, v]) => `${l} <b>${fmtN(v)}</b>`).join(' · ')}</p>` : '';
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
  // Narx hisobi ko'rinib tursin: «1 lid = $30 ÷ 36 = $0.83» (target puli); bloger/kanal ham bo'lsa — umumiy narx alohida
  const unitCost = (label, n) => {
    if (!n || !(p.spend > 0)) return null;
    const t = p.target_spend || 0;
    const main = t > 0 ? `${label} = ${fmtUsd(t, 0)} ÷ ${fmtN(n)} = <b>${fmtUsd(t / n)}</b>` : '';
    const all = p.spend > t + 0.5 ? `umumiy ${fmtUsd(p.spend, 0)} ÷ ${fmtN(n)} = <b>${fmtUsd(p.spend / n)}</b>` : '';
    return [main, all].filter(Boolean).join('<br>');
  };
  const steps = [
    p.reported.impressions ? ["Ko'rishlar", p.impressions, null] : null,
    ['Klik', p.clicks, p.reported.impressions ? ['CTR', p.ctr, fc.ctr] : null, p.cpc != null ? `1 klik ${fmtUsd(p.cpc)} · target ${fmtUsd(p.target_spend, 0)}` : null],
    auto ? (p.reported.starts ? ['Bot start', p.starts, ['', p.click_to_start, fc.click_to_start], unitCost('1 start', p.starts)] : null)
      : ['Lid', p.leads, ['', p.click_to_lead, fc.click_to_lead], [p.reported.target_leads ? `targetolog: ${fmtN(p.target_leads)} · sotuv bo'limi: ${fmtN(p.leads)}` : null, unitCost('1 lid', p.leads)].filter(Boolean).join('<br>') || null],
    [auto ? 'Xarid' : 'Sotuv', p.sales, ['', p.conv, fc.conv], unitCost('1 mijoz', p.sales)],
  ].filter(Boolean);
  const worst = p.funnel_check?.worst;
  const q = [['q-good', p.qualified], ['q-mid', p.potential], ['q-bad', p.unqualified]];
  const badTop = p.reasons.bad[0];
  return `<section class="col ${collapsed ? 'collapsed' : ''}" style="--pc:${esc(p.color || '#4c86ff')}" data-open="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} — batafsil">
    <header class="col-head"><button type="button" class="col-grip" data-grip title="Sudrab joyini almashtiring (← → tugmalari ham ishlaydi)" aria-label="${esc(p.name)} — joyini almashtirish">${GRIP}</button><button type="button" class="col-toggle" data-collapse aria-expanded="${!collapsed}" title="${collapsed ? 'Ochish' : "Yig'ish"}" aria-label="${esc(p.name)} — yig'ish yoki ochish">${COLLAPSE_IC}</button>
      <span class="col-dot"></span><div class="col-name"><h2>${esc(p.name)}</h2><small>${auto ? 'avtovoronka' : "sotuv bo'limi"}</small></div><span class="pill ${cls}">${label}</span><button type="button" class="col-hide" data-hide title="Arxivlash — doskadan yashirish" aria-label="${esc(p.name)} — arxivlash">${EYE_OFF}</button></header>
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
        ${badTop ? `<p class="why">Nega: «${esc(badTop.label)}» — ${fmtP(badTop.share, 0)}</p>` : ''}
        ${srcLine(p)}
        ${[["Ko'tarmadi", 'st_nopickup'], ['Qayta aloqa', 'st_callback'], ["O'ylab ko'radi", 'st_thinking'], ['Video', 'st_video'], ['Bekor', 'st_cancelled']].some(([, k]) => p[k] > 0) ? `<p class="src-line">${[["Ko'tarmadi", 'st_nopickup'], ['Qayta aloqa', 'st_callback'], ["O'ylab ko'radi", 'st_thinking'], ['Video', 'st_video'], ['Bekor', 'st_cancelled']].filter(([, k]) => p[k] > 0).map(([l, k]) => `${l} <b>${fmtN(p[k])}</b>`).join(' · ')}</p>` : ''}` : '<p class="why">Kiritilmagan</p>'}
    </div>`}
    ${planTile(p, plan)}
    ${issue ? `<div class="tile issue ${issue.level}"><small>${issue.level === 'critical' ? 'Muhim' : 'Diqqat'}</small><p>${esc(issue.text)}</p></div>` : ''}
    ${p.price ? `<div class="tile price-tile"><small>Narx</small><p><b>${{ up: '↑', down: '↓', keep: '=', cost: '!' }[p.price.verdict]}</b> ${esc(p.price.title)}</p></div>` : ''}
    <div class="col-foot">Batafsil →</div>
  </section>`;
}
