// «Nazorat» — rahbar (va hamma) uchun bitta sahifa: umumiy xulosa, pul qayerga ketyapti, 1 mijoz necha pulga tushyapti,
// kim (targetolog, ROP, marketing, PM) qayerda xato qilyapti, intizom, «agar … tiksak» prognozi va takliflar (AI bilan)
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtSom, fmtP, toast, ICONS, spinnerBlock, isStale, shortDate, selectHtml, inVal, parseNum,
} from './core.js';
import { forecast, bestBudget } from './forecast.js';

const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#8b7cf6')}"></span>`;
const mln = (x) => (x == null || !Number.isFinite(x) ? '—' : Math.abs(x) >= 1e6 ? `${fmtN(x / 1e6, 1)} mln` : fmtN(Math.round(x)));
const LEVEL = { crit: ['crit', 'Jiddiy'], warn: ['warn', 'Diqqat'], info: ['info', "Ma'lumot"], good: ['good', 'Yaxshi'], ok: ['good', "Me'yorida"] };
const OWNER_IC = { target: ICONS.target, rop: ICONS.phone, marketing: ICONS.mega, pm: ICONS.send };
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
  shell(`<div class="page-head"><div><h1>Nazorat</h1><div class="sub">Pul qayerga ketyapti, 1 mijoz necha pulga tushyapti va kim qayerda xato qilyapti — hamma bo'limlar bitta joyda</div></div>
      <div class="filters"><div class="seg" id="ctlPer">${PERIODS.map(([k, l]) => `<button type="button" data-p="${k}" class="${ctl.period === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="muted small">${shortDate(r.from)} – ${shortDate(r.to)}</span></div></div>
    <div id="ctl">${spinnerBlock()}</div>`);
  $('#ctlPer').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && b.dataset.p !== ctl.period) { ctl.period = b.dataset.p; renderControl(); } };
  const rid = state.renderId;
  let c;
  try { c = await api(`/api/control?from=${r.from}&to=${r.to}`); } catch (e) { const el = $('#ctl'); if (el) el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
  const box = $('#ctl');
  if (!box || isStale(rid)) return;
  box.innerHTML = [verdictBlock(c), kpiBlock(c), ownersBlock(c), econBlock(c), forecastBlock(c), disciplineBlock(c), adviceBlock(c)].join('');
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
    <div class="kpi"><div class="top"><span class="label">1 mijoz narxi</span>${ch(t.cac_full_uzs, t.prev.cac_full_uzs, true)}</div><div class="value">${mln(t.cac_full_uzs)}<small>so'm</small></div><div class="sub">reklama + marketing ÷ sotuv</div></div>
    <div class="kpi"><div class="top"><span class="label">ROMI</span></div><div class="value">${fmtP(t.romi, 0)}</div><div class="sub">reklama va marketingga 1 so'm → ${t.romi != null ? fmtN(1 + t.romi, 2) : '—'} so'm</div></div>
  </div>`;
}

// ---------- 3. Kim qayerda xato qilyapti ----------
function ownersBlock(c) {
  const issue = (i) => `<li class="iss ${i.level}"><span class="iss-dot"></span><span>${i.project ? `<b>${esc(i.project)}:</b> ` : ''}${esc(i.text)}</span></li>`;
  return `<section class="card mb"><div class="card-head"><h2>Javobgarlik — kim qayerda kamchilik qilyapti</h2><span class="muted small">ball: 100 dan har jiddiy muammo −20, diqqat −8, ma'lumot −3</span></div>
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
  const verdictPill = (v) => (v ? `<span class="pill ${LEVEL[v.level]?.[0] || 'info'}" title="${esc(v.text)}">${{ nosale: "Sotuv yo'q", over: "Ko'p sarflanyapti", volume: 'Hajm yetmayapti', under: 'Oshirsa bo\'ladi', ok: "Me'yorida" }[v.key] || ''}</span>` : '<span class="muted small">ma\'lumot kam</span>');
  return `<section class="card mb"><div class="card-head"><h2>Pul — 1 mijoz necha pulga tushyapti</h2><span class="muted small">chegara — 1 sotuvdan tannarxdan keyin qoladigan pul: 1 sotuvning reklamasi undan qimmat bo'lsa — har sotuv zarar</span></div>
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
  return `<section class="card mb fc"><div class="card-head"><h2>Agar … tiksak — qancha keladi?</h2><span class="muted small">shu davrdagi lid narxi, konversiya va o'rtacha chek asosida, oyiga</span></div>
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
    out.innerHTML = `${m.enough ? '' : '<div class="insight warning"><span class="ic">Diqqat</span><span>Shu davrda lid/sotuv kam — prognoz taxminiy. Uzoqroq davrni tanlang (30 kun).</span></div>'}
      <div class="fc-grid">
        ${m.kind === 'auto' ? '' : cell('Lid', now.leads, f.leads, (x) => fmtN(x))}
        ${cell('Sotuv', now.sales, f.sales, (x) => fmtN(x, x < 10 ? 1 : 0))}
        ${cell('Tushum', now.revenue, f.revenue, (x) => `${mln(x)} so'm`)}
        ${cell(m.kind === 'auto' ? '1 xarid narxi' : '1 lid narxi', now.unit, f.unit, (x) => fmtUsd(x), true)}
        ${cell('1 mijoz (reklama + marketing)', now.cac, f.cac, (x) => (x == null ? '—' : `${mln(x)} so'm`), true)}
        ${cell('Sof foyda', now.profit, f.profit, (x) => `${x < 0 ? '−' : '+'}${mln(Math.abs(x))} so'm`)}
      </div>
      ${best ? `<div class="fc-best">${ICONS.bulb}<span>Eng ko'p foyda — taxminan <b>${fmtUsd(best.budget, 0)}/oy</b> byudjetda: sof foyda ${best.profit < 0 ? '−' : '+'}${mln(Math.abs(best.profit))} so'm.
        ${best.budget > m.spend_month * 1.15 ? `Hozir ${fmtUsd(m.spend_month, 0)} — <b>kam sarflayapmiz</b>, byudjetni bosqichma-bosqich oshirib, lid narxini kuzating.` : best.budget < m.spend_month * 0.85 ? `Hozir ${fmtUsd(m.spend_month, 0)} — <b>ko'p sarflayapmiz</b>: qimmat kanal va kreativlarni qisqartiring.` : `Hozir ${fmtUsd(m.spend_month, 0)} — <b>me'yorida</b>.`}
        ${best.profit < 0 ? ` <b>Eng yaxshi byudjetda ham zarar</b> — muammo reklamada emas: tannarx (${fmtP(m.var_pct, 0)}), doimiy xarajat yoki marketingni qayta ko'rish kerak.` : ''}</span>
        <button type="button" class="btn small" data-best="${Math.round(best.budget)}">Shu byudjetni ko'rish</button></div>` : ''}
      <p class="muted small" style="margin:8px 0 0">Taxmin: byudjet 2 barobar oshsa, auditoriya kengayib 1 lid ~19% qimmatlashadi deb olinadi. Konversiya, chek, marketing va doimiy xarajat — shu davrdagidek. Haqiqiy natija kreativ va sotuv bo'limiga bog'liq.</p>`;
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
  return `<section class="card mb"><div class="card-head"><h2>Intizom — hisobotlar vaqtida kiritilyaptimi</h2><span class="muted small">kunlik hisobot ertasiga: xodimlar ${esc(d.staff_deadline)} gacha, PM ${esc(d.report_deadline)} gacha · ${d.days} kun</span></div>
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
  return `<section class="card mb advice"><div class="card-head"><h2>Takliflar — nima qilish kerak</h2>
      <button type="button" class="btn small ${c.ai?.enabled ? 'primary' : ''}" id="aiBtn" ${c.ai?.enabled ? '' : `title="${esc(c.ai?.reason || 'AI ulanmagan')}"`}>${ICONS.bulb} AI tahlil</button></div>
    <div id="aiOut">${c.ai?.enabled ? '' : `<div class="insight info"><span class="ic">AI</span><span>${esc(c.ai?.reason || 'AI ulanmagan')}. Quyidagi takliflar — tizim qoidalari bo'yicha.</span></div>`}</div>
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
