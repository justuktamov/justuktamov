// «Nazorat» — rahbar (va hamma) uchun bitta sahifa: umumiy xulosa, pul qayerga ketyapti, 1 mijoz necha pulga tushyapti,
// kim (targetolog, ROP, marketing, PM) qayerda xato qilyapti, intizom, «agar … tiksak» prognozi va takliflar (AI bilan)
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtSom, fmtP, toast, ICONS, spinnerBlock, isStale, shortDate, selectHtml, inVal, parseNum,
} from './core.js';
import { forecast, bestBudget } from './forecast.js';

const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#8b7cf6')}"></span>`;
export const mln = (x) => (x == null || !Number.isFinite(x) ? '—' : Math.abs(x) >= 1e6 ? `${fmtN(x / 1e6, 1)} mln` : fmtN(Math.round(x)));
const LEVEL = { crit: ['crit', 'Jiddiy'], warn: ['warn', 'Diqqat'], info: ['info', "Ma'lumot"], good: ['good', 'Yaxshi'], ok: ['good', "Me'yorida"] };
const OWNER_IC = { target: ICONS.target, rop: ICONS.phone, marketing: ICONS.mega, finance: ICONS.wallet, pm: ICONS.send };
const OWNER_SHORT = { target: 'Targetolog', rop: "Sotuv bo'limi", marketing: 'Marketing', finance: 'Moliya', pm: 'PM' };

// Birinchi navbatda: qaysi muammo eng ko'p pul yo'qotyapti (tuzatilsa oyiga taxminan qancha qo'shiladi). owner — faqat o'ziniki
export function priorityBlock(c, owner = null, title = "Birinchi navbatda — eng ko'p pul shu yerda") {
  const list = (c.priorities || []).filter((x) => !owner || x.owner === owner);
  if (!list.length) return '';
  const max = Math.max(...list.map((x) => x.impact));
  return `<section class="card mb prio"><div class="card-head"><h2>${esc(title)}</h2><span class="muted small" title="Tuzatilsa oyiga taxminan qancha sof foyda qo'shiladi">oyiga, taxminiy</span></div>
    <ol class="prio-list">${list.map((x) => `<li><span class="pr-who pill">${esc(OWNER_SHORT[x.owner] || '')}</span>
      <span class="pr-text">${x.project ? `<b>${esc(x.project)}:</b> ` : ''}${esc(x.text)}</span>
      <span class="pr-bar"><i style="width:${Math.max(6, (x.impact / max) * 100)}%"></i></span><b class="pr-imp">+${mln(x.impact)}</b></li>`).join('')}</ol></section>`;
}

// Pul taqsimoti (oyiga): tushumning qanchasi reklamaga, qanchasi marketingga — hozir va tavsiya. mode: all | target | marketing
export function allocationBlock(c, mode = 'all') {
  const a = c.allocation;
  if (!a || !a.revenue) return '';
  const pct = (x) => fmtP(x, 0);
  const arrow = (now, rec) => (rec > now * 1.05 ? '<span class="al-up">▲</span>' : rec < now * 0.95 ? '<span class="al-down">▼</span>' : '<span class="muted">=</span>');
  const line = (label, now, rec, nowS, recS, note = '') => `<div class="al-row"><span class="al-l">${label}</span>
    <span class="al-now">${mln(now)} <small>${pct(nowS)}</small></span>${arrow(now, rec)}<span class="al-rec">${mln(rec)} <small>${pct(recS)}</small></span>${note ? `<span class="al-note">${esc(note)}</span>` : ''}</div>`;
  const projects = a.projects.filter((x) => x.now_usd > 0 || x.rec_usd > 0);
  return `<section class="card mb alloc"><div class="card-head"><h2>Pul taqsimoti — oyiga</h2><span class="muted small">30 kunga: tushum ${mln(a.revenue)} so'm · hozir → tavsiya</span></div>
    ${mode !== 'target' ? `<div class="al-rows">
      ${mode === 'all' ? line('Reklama (target)', a.ad.now, a.ad.rec, a.ad.now_share, a.ad.rec_share) : ''}
      ${line('Marketing', a.marketing.now, a.marketing.rec, a.marketing.now_share, a.marketing.rec_share, a.marketing.note)}
      ${mode === 'all' ? `<div class="al-row al-profit"><span class="al-l">Sof foyda</span><span class="al-now ${a.profit.now < 0 ? 'neg' : 'pos'}">${mln(a.profit.now)}</span>${arrow(a.profit.now, a.profit.rec)}<span class="al-rec ${a.profit.rec < 0 ? 'neg' : 'pos'}">${mln(a.profit.rec)}</span></div>` : ''}
    </div>` : ''}
    ${mode !== 'marketing' && projects.length ? `<div class="table-wrap"><table class="al-proj"><thead><tr><th>Reklama byudjeti</th><th class="n">Hozir</th><th></th><th class="n">Tavsiya</th><th class="n">Foyda</th></tr></thead>
      <tbody>${projects.map((x) => `<tr><td>${dot(x.color)}${esc(x.name)}</td><td class="n">${fmtUsd(x.now_usd, 0)}</td><td class="c">${arrow(x.now_usd, x.rec_usd)}</td><td class="n"><b>${fmtUsd(x.rec_usd, 0)}</b></td>
        <td class="n">${x.gain ? `<b class="pos">+${mln(x.gain)}</b>` : x.enough ? '<span class="muted">—</span>' : '<span class="muted small">raqam kam</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>`;
}
const AI_WHO = { targetolog: 'Targetolog', sotuv: "Sotuv bo'limi", marketing: 'Marketing', pm: 'Proekt menejer', rahbar: 'Rahbar', yoq: '—' };

// Davr: bu oy (kechagacha), o'tgan oy, oxirgi 30 kun, oxirgi 7 kun
const PERIODS = [['month', 'Bu oy'], ['prev', "O'tgan oy"], ['d30', '30 kun'], ['d7', '7 kun']];
const ctl = { period: 'month', fcProject: null, fcBudget: null };
function range(kind) {
  const y = state.me.reportDay;
  if (kind === 'd7') return { from: addDays(y, -6), to: y };
  if (kind === 'd30') return { from: addDays(y, -29), to: y };
  const firstThis = `${y.slice(0, 7)}-01`;
  if (kind === 'prev') { const to = addDays(firstThis, -1); return { from: `${to.slice(0, 7)}-01`, to }; }
  return { from: firstThis, to: y };
}

export async function renderControl() {
  state.leaveGuard = null;
  state.isDirty = null;
  const r = range(ctl.period);
  shell(`<div class="page-head"><div><h1>Nazorat</h1><div class="sub">Kim qayerda xato qilyapti va pul qayerga ketyapti</div></div>
      <div class="filters"><div class="seg" id="ctlPer">${PERIODS.map(([k, l]) => `<button type="button" data-p="${k}" class="${ctl.period === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="muted small">${shortDate(r.from)} – ${shortDate(r.to)}</span></div></div>
    <div id="ctl">${spinnerBlock()}</div>`);
  $('#ctlPer').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && b.dataset.p !== ctl.period) { ctl.period = b.dataset.p; renderControl(); } };
  const rid = state.renderId;
  let c;
  try { c = await api(`/api/control?from=${r.from}&to=${r.to}`); } catch (e) { const el = $('#ctl'); if (el) el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
  const box = $('#ctl');
  if (!box || isStale(rid)) return;
  box.innerHTML = [verdictBlock(c), kpiBlock(c), priorityBlock(c), ownersBlock(c), allocationBlock(c), econBlock(c), forecastBlock(c), disciplineBlock(c), adviceBlock(c)].join('');
  bindOwners(box);
  bindForecast(box, c);
  bindAi(box, r, c);
}

// ---------- 1. Bir gapda xulosa ----------
function verdictBlock(c) {
  const v = c.verdict;
  const cls = v.level === 'good' ? 'good' : v.level === 'crit' ? 'crit' : 'warn';
  const top = c.owners.filter((o) => o.status !== 'good').sort((a, b) => a.score - b.score);
  return `<section class="verdict ${cls}">
    <span class="v-ic">${v.level === 'good' ? ICONS.check : ICONS.shield}</span>
    <div><span class="eyebrow">Xulosa · ${c.days} kun</span><b>${esc(v.text)}</b>
      ${top.length ? `<span class="v-who">${top.map((o) => `<span class="pill ${LEVEL[o.status][0]}">${esc(o.label)} — ${o.score}/100</span>`).join('')}</span>` : ''}</div>
  </section>`;
}

// ---------- 2. Asosiy raqamlar ----------
function kpiBlock(c) {
  const t = c.totals;
  const ch = (cur, prev, invert = false) => {
    if (cur == null || !prev) return '';
    const d = (cur - prev) / Math.abs(prev);
    if (!Number.isFinite(d) || Math.abs(d) < 0.005) return '<span class="delta flat">—</span>';
    const good = invert ? d < 0 : d > 0;
    return `<span class="delta ${good ? 'up' : 'down'}" title="Oldingi shuncha kunga nisbatan">${d > 0 ? '▲' : '▼'} ${fmtP(Math.abs(d), 0)}</span>`;
  };
  return `<div class="kpis ctl-kpis">
    <div class="kpi"><div class="top"><span class="label">Tushum</span>${ch(t.revenue, t.prev.revenue)}</div><div class="value">${mln(t.revenue)}<small>so'm</small></div><div class="sub">${fmtN(t.sales)} ta sotuv · ${fmtN(t.leads)} ta lid</div></div>
    <div class="kpi"><div class="top"><span class="label">Jami xarajat</span></div><div class="value">${mln(t.costs)}<small>so'm</small></div><div class="sub">reklama ${mln(t.spend_uzs)} · marketing ${mln(t.marketing_uzs)}</div></div>
    <div class="kpi"><div class="top"><span class="label">Sof foyda</span>${ch(t.net, t.prev.net)}</div><div class="value"><span class="${t.net < 0 ? 'neg' : 'pos'}">${t.net < 0 ? '−' : '+'}${mln(Math.abs(t.net))}</span><small>so'm</small></div><div class="sub">marja ${fmtP(t.margin, 1)}</div></div>
    <div class="kpi"><div class="top"><span class="label">1 mijoz narxi</span>${ch(t.cac_full_uzs, t.prev.cac_full_uzs, true)}</div><div class="value">${mln(t.cac_full_uzs)}<small>so'm</small></div><div class="sub">reklama + marketing</div></div>
    <div class="kpi"><div class="top"><span class="label">ROMI</span></div><div class="value">${fmtP(t.romi, 0)}</div><div class="sub">1 so'm → ${t.romi != null ? fmtN(1 + t.romi, 2) : '—'} so'm</div></div>
  </div>`;
}

// ---------- 3. Kim qayerda xato qilyapti ----------
function ownersBlock(c) {
  const issue = (i) => `<li class="iss ${i.level}"><span class="iss-dot"></span><span>${i.project ? `<b>${esc(i.project)}:</b> ` : ''}${esc(i.text)}</span></li>`;
  return `<section class="card mb"><div class="card-head"><h2>Kim qayerda kamchilik qilyapti</h2><span class="muted small" title="100 dan: jiddiy −20, diqqat −8, ma'lumot −3">ball — 100 dan</span></div>
    <div class="owner-grid">${c.owners.map((o) => `<article class="owner ${o.status}">
      <header><span class="o-ic">${OWNER_IC[o.key]}</span><div><b>${esc(o.label)}</b><small>${o.people.length ? esc(o.people.join(', ')) : 'xodim biriktirilmagan'}</small></div>
        <span class="o-score" style="--s:${o.score}"><b>${o.score}</b></span></header>
      <p class="o-duty">${esc(o.duty)}</p>
      ${o.issues.length ? `<ul class="iss-list">${o.issues.slice(0, 4).map(issue).join('')}</ul>${o.issues.length > 4 ? `<details class="iss-more"><summary>Yana ${o.issues.length - 4} ta</summary><ul class="iss-list">${o.issues.slice(4).map(issue).join('')}</ul></details>` : ''}`
        : `<p class="o-ok">${ICONS.check} Kamchilik topilmadi</p>`}
    </article>`).join('')}</div></section>`;
}
function bindOwners() { /* details — brauzerning o'zi ochadi */ }

// ---------- 4. Pul: 1 mijoz narxi va chegarasi ----------
function econBlock(c) {
  const verdictPill = (v) => (v ? `<span class="pill ${LEVEL[v.level]?.[0] || 'info'}" title="${esc(v.text)}">${{ nosale: "Sotuv yo'q", over: "Ko'p sarflanyapti", volume: 'Hajm kam', under: 'Oshirsa bo\'ladi', ok: "Me'yorida" }[v.key] || ''}</span>` : '<span class="muted small">ma\'lumot kam</span>');
  return `<section class="card mb"><div class="card-head"><h2>1 mijoz necha pulga tushyapti</h2><span class="muted small" title="1 sotuvdan tannarxdan keyin qoladigan pul. 1 sotuvning reklamasi undan qimmat bo'lsa — har sotuv zarar">chegara — 1 sotuvdan qoladigan pul</span></div>
    <div class="table-wrap"><table class="econ"><thead><tr><th>Loyiha</th><th class="n">Tushum</th><th class="n">Reklama</th><th class="n">Marketing</th><th class="n">Lid / sotuv</th><th class="n">1 lid</th><th class="n">1 mijoz</th><th class="n">Chegara</th><th class="n">Sof foyda</th><th>Xulosa</th></tr></thead>
    <tbody>${c.projects.map((p) => {
      const pct = p.contribution > 0 && p.cac_full_uzs ? Math.min(1.5, p.cac_full_uzs / p.contribution) : null;
      return `<tr><td>${dot(p.color)}<b>${esc(p.name)}</b></td><td class="n">${mln(p.revenue)}</td><td class="n">${mln(p.spend_uzs)}<br><span class="muted small">${fmtUsd(p.spend, 0)}</span></td><td class="n">${mln(p.marketing_uzs)}</td>
        <td class="n">${p.kind === 'auto' ? '—' : fmtN(p.leads)} / ${fmtN(p.sales)}</td><td class="n">${p.kind === 'auto' ? '—' : fmtUsd(p.cpl)}</td>
        <td class="n"><b>${mln(p.cac_full_uzs)}</b>${pct != null ? `<span class="cac-bar ${pct > 1 ? 'over' : pct < 0.5 ? 'low' : ''}"><i style="width:${Math.min(100, (pct / 1.5) * 100)}%"></i><em style="left:${100 / 1.5}%"></em></span>` : ''}</td>
        <td class="n">${mln(p.contribution)}${p.breakeven != null ? `<br><span class="muted small" title="Doimiy xarajat va marketing ulushi bilan">to'liq: ${mln(p.breakeven)}</span>` : ''}</td><td class="n"><b class="${p.net_profit < 0 ? 'neg' : 'pos'}">${p.net_profit < 0 ? '−' : '+'}${mln(Math.abs(p.net_profit))}</b></td>
        <td>${verdictPill(p.verdict)}${p.plan_budget ? `<br><span class="muted small">byudjet: ${fmtUsd(p.plan_budget.fact, 0)} / ${fmtUsd(p.plan_budget.plan, 0)}</span>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div></section>`;
}

// ---------- 5. Agar … tiksak ----------
function forecastBlock(c) {
  const list = c.projects.filter((p) => p.model?.unit_cost && p.model?.rate);
  if (!list.length) return '';
  if (!list.some((p) => p.id === ctl.fcProject)) { ctl.fcProject = list[0].id; ctl.fcBudget = null; }
  return `<section class="card mb fc"><div class="card-head"><h2>Agar … tiksak — qancha keladi?</h2><span class="muted small">oyiga, taxminiy</span></div>
    <div class="fc-in">
      <div class="field">Loyiha${selectHtml(list.map((p) => [String(p.id), p.name]), String(ctl.fcProject), 'id="fcProj"', 'Loyiha')}</div>
      <label class="field">Reklama byudjeti, oyiga ($)<input id="fcBudget" inputmode="decimal"></label>
      <input type="range" id="fcRange" min="0" max="100" step="1" aria-label="Byudjet">
    </div>
    <div id="fcOut"></div></section>`;
}
function bindForecast(box, c) {
  const pIn = $('#fcProj', box);
  if (!pIn) return;
  const bIn = $('#fcBudget', box);
  const rg = $('#fcRange', box);
  const proj = () => c.projects.find((p) => String(p.id) === pIn.value);
  const scaleMax = (m) => Math.max(200, Math.round(((m.spend_month || 300) * 4) / 50) * 50);
  const setBudget = (v, from) => {
    const p = proj();
    const max = scaleMax(p.model);
    ctl.fcBudget = Math.max(0, v);
    if (from !== 'input') { bIn.value = String(Math.round(ctl.fcBudget)); bIn.dispatchEvent(new Event('input', { bubbles: true })); }
    if (from !== 'range') rg.value = String(Math.round((Math.min(ctl.fcBudget, max) / max) * 100));
    draw();
  };
  const draw = () => {
    const p = proj();
    const m = p.model;
    const now = forecast(m, m.spend_month);
    const f = forecast(m, ctl.fcBudget);
    const best = bestBudget(m);
    const out = $('#fcOut', box);
    if (!f || !now) { out.innerHTML = '<p class="muted">Bu loyihada hisob uchun raqam yetarli emas</p>'; return; }
    const cell = (label, a, b, fmt, inv = false) => {
      const d = b - a;
      const cls = Math.abs(d) < 1e-9 ? '' : (inv ? d < 0 : d > 0) ? 'pos' : 'neg';
      return `<div class="fc-cell"><small>${label}</small><b>${fmt(b)}</b><span class="${cls}">hozirgi sur'at: ${fmt(a)}</span></div>`;
    };
    out.innerHTML = `${m.enough ? '' : '<div class="insight warning"><span class="ic">Diqqat</span><span>Raqam kam — «30 kun»ni tanlang</span></div>'}
      <div class="fc-grid">
        ${m.kind === 'auto' ? '' : cell('Lid', now.leads, f.leads, (x) => fmtN(x))}
        ${cell('Sotuv', now.sales, f.sales, (x) => fmtN(x, x < 10 ? 1 : 0))}
        ${cell('Tushum', now.revenue, f.revenue, (x) => `${mln(x)} so'm`)}
        ${cell(m.kind === 'auto' ? '1 xarid narxi' : '1 lid narxi', now.unit, f.unit, (x) => fmtUsd(x), true)}
        ${cell('1 mijoz (reklama + marketing)', now.cac, f.cac, (x) => (x == null ? '—' : `${mln(x)} so'm`), true)}
        ${cell('Sof foyda', now.profit, f.profit, (x) => `${x < 0 ? '−' : '+'}${mln(Math.abs(x))} so'm`)}
      </div>
      ${best ? `<div class="fc-best">${ICONS.bulb}<span>Eng foydali byudjet — <b>${fmtUsd(best.budget, 0)}/oy</b> (hozir ${fmtUsd(m.spend_month, 0)}): ${best.budget > m.spend_month * 1.15 ? '<b>kam sarflayapmiz</b>' : best.budget < m.spend_month * 0.85 ? '<b>ko\'p sarflayapmiz</b>' : '<b>me\'yorida</b>'}.
        ${best.profit < 0 ? ` Unda ham zarar — muammo reklamada emas: tannarx (${fmtP(m.var_pct, 0)}) yoki doimiy xarajat.` : ''}</span>
        <button type="button" class="btn small" data-best="${Math.round(best.budget)}">Ko'rish</button></div>` : ''}
      <p class="muted small" style="margin:8px 0 0" title="Byudjet 2 barobar oshsa, 1 lid ~19% qimmatlashadi deb olinadi; konversiya, chek, marketing va doimiy xarajat — shu davrdagidek">Taxmin — shu davr raqamlari asosida</p>`;
    const bb = $('[data-best]', out);
    if (bb) bb.onclick = () => setBudget(Number(bb.dataset.best));
  };
  pIn.onchange = () => { ctl.fcProject = Number(pIn.value); setBudget(Math.round(proj().model.spend_month)); };
  bIn.oninput = () => { const v = parseNum(inVal(bIn)); if (v != null && Number.isFinite(v)) setBudget(v, 'input'); };
  rg.oninput = () => { setBudget((Number(rg.value) / 100) * scaleMax(proj().model), 'range'); };
  setBudget(ctl.fcBudget ?? Math.round(proj().model.spend_month));
}

// ---------- 6. Intizom ----------
function disciplineBlock(c) {
  const d = c.discipline;
  if (!d.rows.length) return '';
  const pill = (lv) => `<span class="pill ${LEVEL[lv][0]}">${{ good: 'Vaqtida', warn: 'Diqqat', crit: 'Yomon' }[lv]}</span>`;
  return `<section class="card mb"><div class="card-head"><h2>Intizom — hisobot vaqtida kiritilyaptimi</h2><span class="muted small">muddat: xodim ${esc(d.staff_deadline)}, PM ${esc(d.report_deadline)}</span></div>
    <div class="table-wrap"><table class="disc"><thead><tr><th>Xodim</th><th>Nima kiritadi</th><th class="n">Vaqtida</th><th class="n">Kechikib</th><th class="n">Kiritilmagan</th><th>Vaqti</th><th></th></tr></thead>
    <tbody>${d.rows.map((r) => {
      if (r.entries != null) {
        return `<tr><td><b>${esc(r.name)}</b><br><span class="muted small">${esc(c.roles[r.role] || '')}</span></td><td>${esc(r.what)}</td><td class="n" colspan="3">${fmtN(r.entries)} ta yozuv shu davrda</td>
          <td class="small">${r.last ? `oxirgisi ${shortDate(r.last)}${r.ago != null ? ` (${r.ago ? `${r.ago} kun oldin` : 'bugun'})` : ''}` : 'hali yo\'q'}</td><td>${pill(r.level)}</td></tr>`;
      }
      const times = r.times.slice().sort();
      const med = times.length ? times[Math.floor(times.length / 2)] : null;
      const total = r.on_time + r.late + r.missed;
      return `<tr><td><b>${esc(r.name)}</b><br><span class="muted small">${esc(c.roles[r.role] || '')}</span></td><td>${esc(r.what)}</td>
        <td class="n">${fmtN(r.on_time)}</td><td class="n ${r.late ? 'warn-t' : ''}">${fmtN(r.late)}</td><td class="n ${r.missed ? 'neg' : ''}">${fmtN(r.missed)}</td>
        <td><span class="disc-bar">${total ? `<i class="ok" style="flex:${r.on_time}"></i><i class="late" style="flex:${r.late}"></i><i class="miss" style="flex:${r.missed}"></i>` : ''}</span><span class="muted small">${med ? `odatda ${med}` : ''}${r.pending ? ' · kecha — kutilmoqda' : ''}</span></td>
        <td>${pill(r.level)}</td></tr>`;
    }).join('')}</tbody></table></div></section>`;
}

// ---------- 7. Takliflar va AI ----------
function adviceBlock(c) {
  const who = { target: 'Targetolog', rop: "Sotuv bo'limi", marketing: 'Marketing', pm: 'PM' };
  return `<section class="card mb advice"><div class="card-head"><h2>Nima qilish kerak</h2>
      <button type="button" class="btn small ${c.ai?.enabled ? 'primary' : ''}" id="aiBtn" ${c.ai?.enabled ? '' : `title="${esc(c.ai?.reason || 'AI ulanmagan')}"`}>${ICONS.bulb} AI tahlil</button></div>
    <div id="aiOut"></div>
    ${c.advice.length ? `<ol class="adv-list">${c.advice.map((a) => `<li class="${a.level}"><span class="pill ${LEVEL[a.level]?.[0] || 'info'}">${esc(who[a.owner] || 'Rahbar')}</span><span>${esc(a.text)}</span></li>`).join('')}</ol>`
      : `<p class="o-ok">${ICONS.check} Jiddiy taklif yo'q — hammasi me'yorida.</p>`}
  </section>`;
}
function bindAi(box, r, c) {
  const btn = $('#aiBtn', box);
  if (!btn) return;
  btn.onclick = async () => {
    if (!c.ai?.enabled) { toast(c.ai?.reason || 'AI ulanmagan', true); return; }
    const out = $('#aiOut', box);
    btn.disabled = true;
    out.innerHTML = spinnerBlock('AI raqamlarni tahlil qilyapti… (1–2 daqiqa)');
    try {
      const a = await api('/api/control/ai', { method: 'POST', body: { from: r.from, to: r.to } });
      out.innerHTML = `<div class="ai-box"><p><b>AI xulosasi:</b> ${esc(a.xulosa)}</p>
        ${a.asosiy_muammo?.kim && a.asosiy_muammo.kim !== 'yoq' ? `<p><span class="pill crit">Asosiy muammo — ${esc(AI_WHO[a.asosiy_muammo.kim])}</span> ${esc(a.asosiy_muammo.sabab)}</p>` : ''}
        ${a.takliflar?.length ? `<ol class="adv-list">${a.takliflar.map((t) => `<li><span class="pill info">${esc(AI_WHO[t.kimga] || t.kimga)}</span><span>${esc(t.nima)}${t.natija ? ` <span class="muted">→ ${esc(t.natija)}</span>` : ''}</span></li>`).join('')}</ol>` : ''}</div>`;
    } catch (e) { out.innerHTML = `<div class="insight warning"><span class="ic">AI</span><span>${esc(e.message)}</span></div>`; }
    btn.disabled = false;
  };
}
