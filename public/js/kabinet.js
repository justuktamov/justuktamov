// Kabinet — har kimning o'z sahifasi (kirganda shu ochiladi): bugun nima qilish kerak, o'z ko'rsatkichlari,
// o'z kamchiliklari (tuzatilsa qancha pul), intizomi. PM va direktor — butun jamoa, birinchi navbatdagi ishlar va pul taqsimoti
import { $, esc, api, state, shell, fmtN, fmtUsd, fmtP, spinnerBlock, isStale, ICONS, dayLabel, shortDate, isAdminUser } from './core.js';
import { priorityBlock, allocationBlock, mln } from './nazorat.js';

const OWNER_OF = { target: 'target', rop: 'rop', marketing: 'marketing', finance: 'finance', pm: 'pm' };
const LEVEL = { crit: 'crit', warn: 'warn', info: 'info', good: 'good' };
const hello = () => { const h = new Date().getHours(); return h < 11 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech'; };

export async function renderKabinet() {
  state.leaveGuard = null;
  state.isDirty = null;
  const u = state.me.user;
  const first = String(u.name || '').split(' ')[0];
  const y = state.me.reportDay;
  const from = `${y.slice(0, 7)}-01`;
  shell(`<div class="page-head"><div><h1>${hello()}, ${esc(first)}</h1><div class="sub">${esc(state.me.roles?.[u.role] || '')} · bugun ${esc(dayLabel(state.me.today))}</div></div></div>
    <div id="kab">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  let c, daily = null;
  try {
    [c, daily] = await Promise.all([api(`/api/control?from=${from}&to=${y}`), isAdminUser() ? api(`/api/daily?date=${y}`) : Promise.resolve(null)]);
  } catch (e) { const el = $('#kab'); if (el) el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
  const box = $('#kab');
  if (!box || isStale(rid)) return;
  const admin = isAdminUser();
  const ownerKey = OWNER_OF[u.role] || null;
  const owner = c.owners.find((o) => o.key === ownerKey);
  const myDisc = c.discipline.rows.find((r) => r.id === u.id);
  box.innerHTML = [
    tasks(c, daily),
    kpis(c),
    admin ? team(c) : mine(owner),
    admin ? priorityBlock(c) : '',
    admin || ['finance', 'marketing', 'target'].includes(u.role) ? allocationBlock(c, admin || u.role === 'finance' ? 'all' : u.role) : '',
    admin ? teamDiscipline(c) : discipline(myDisc, c),
  ].join('');
}

// ---------- Bugun nima qilish kerak ----------
function card(icon, title, status, line, href, btn, level = '') {
  return `<a class="task ${level}" href="${href}"><span class="t-ic">${icon}</span><div><b>${esc(title)}</b>${status ? `<span class="pill ${level || 'info'}">${status}</span>` : ''}<small>${line}</small></div><span class="t-go">${btn} →</span></a>`;
}
function tasks(c, daily) {
  const me = state.me;
  const role = me.user.role;
  const y = me.reportDay;
  const out = [];
  const partCard = (part) => {
    const sent = me.partSent;
    const [href, title, icon] = part === 'target' ? ['#/target', 'Target hisoboti', ICONS.target] : ['#/sotuv', 'Sotuv hisoboti', ICONS.phone];
    out.push(card(icon, title, sent ? `${String(sent).slice(11, 16)} da yuborildi` : 'kutilmoqda', sent ? `Kecha · ${esc(shortDate(y))}` : `Kecha · ${esc(shortDate(y))} · ${esc(c.discipline.staff_deadline)} gacha`, href, sent ? "Ko'rish" : 'Kiritish', sent ? 'good' : 'warn'));
  };
  if (role === 'pm' || role === 'director') {
    const staff = daily?.staff || [];
    for (const part of ['target', 'rop']) {
      const list = staff.filter((x) => x.role === part);
      if (!list.length) continue;
      const sent = list.filter((x) => x.submitted_at).length;
      const ok = daily.approvals?.[part];
      out.push(card(part === 'target' ? ICONS.target : ICONS.phone, part === 'target' ? 'Target' : 'Sotuv', ok ? 'tasdiqlandi' : sent ? 'tekshiring' : 'kutilmoqda',
        list.map((x) => `${esc(x.name)} ${x.submitted_at ? `✓ ${String(x.submitted_at).slice(11, 16)}` : '—'}`).join(' · '), `${part === 'target' ? '#/target' : '#/sotuv'}`, ok ? "Ko'rish" : 'Tekshirish', ok ? 'good' : sent ? 'info' : 'warn'));
    }
    const done = ['submitted', 'reviewed'].includes(me.reportStatus);
    out.push(card(ICONS.send, 'Kunlik hisobot', done ? 'yuborildi' : 'yuborilmagan', `Direktorga · ${esc(c.discipline.report_deadline)} gacha`, '#/kiritish', done ? "Ko'rish" : 'Tayyorlash', done ? 'good' : 'warn'));
    if (role === 'director') out.push(card(ICONS.team, 'Xodimlar va ruxsatlar', '', 'Kim nimani kiritadi', '#/sozlamalar?tab=staff', 'Ochish'));
  } else {
    for (const part of me.parts || []) partCard(part);
    if ((me.access || []).includes('sellers')) out.push(card(ICONS.team, 'Sotuv xodimlari', '', 'Har sotuvchining kechagi natijasi', '#/sotuvchilar?tab=entry', 'Kiritish'));
    const disc = c.discipline.rows.find((r) => r.id === me.user.id);
    if ((me.access || []).includes('marketing')) {
      out.push(card(ICONS.mega, 'Marketing xarajati', disc?.ago == null ? 'kiritilmagan' : disc.ago > 7 ? `${disc.ago} kun oldin` : '', `Bu oy: ${fmtN(disc?.entries || 0)} ta yozuv`, '#/marketing', "Qo'shish", disc?.ago == null || disc.ago > 7 ? 'warn' : ''));
    }
    if ((me.access || []).includes('finance')) {
      const est = c.projects.filter((p) => p.fixed_estimated && !p.fixed_actual).map((p) => p.name);
      out.push(card(ICONS.wallet, 'Operatsion xarajat', est.length ? 'kiritilmagan' : 'kiritilgan', est.length ? `Yo'q: ${esc(est.join(', '))}` : 'Bu oy hammasi bor', '#/moliya', est.length ? 'Kiritish' : "Ko'rish", est.length ? 'warn' : 'good'));
    }
    if (!out.length) out.push(card(ICONS.eye, "Kiritish bo'limi yo'q", '', "Ruxsatni PM yoki direktor beradi", '#/nazorat', 'Nazorat'));
  }
  return `<section class="mb"><h2 class="kab-h">Bugun</h2><div class="tasks">${out.join('')}</div></section>`;
}

// ---------- Mening ko'rsatkichlarim — bu oy ----------
function kpis(c) {
  const t = c.totals;
  const role = state.me.user.role;
  const leadP = c.projects.filter((p) => p.kind !== 'auto');
  const lSales = leadP.reduce((a, p) => a + (p.sales || 0), 0);
  const lLeads = leadP.reduce((a, p) => a + (p.leads || 0), 0);
  const plan = c.projects.filter((p) => p.plan_budget);
  const k = (label, value, sub = '', unit = '') => `<div class="kpi"><div class="top"><span class="label">${label}</span></div><div class="value">${value}${unit ? `<small>${unit}</small>` : ''}</div><div class="sub">${sub}</div></div>`;
  let list;
  if (role === 'target') {
    const tl = t.target_leads || t.leads;
    list = [k('Lidlar', fmtN(tl), 'reklama kabinetidan'), k('Reklama', fmtUsd(t.spend, 0), `${mln(t.spend_uzs)} so'm`), k('1 lid narxi', fmtUsd(tl ? t.spend / tl : null), 'reklama ÷ lid'),
      k('Byudjet', plan.length ? fmtP(plan.reduce((a, p) => a + p.plan_budget.fact, 0) / plan.reduce((a, p) => a + p.plan_budget.plan, 0), 0) : '—', plan.length ? "oylik rejadan" : 'reja yo\'q')];
  } else if (role === 'rop') {
    list = [k('Lidlar', fmtN(lLeads)), k('Sotuv', fmtN(lSales)), k('Konversiya', fmtP(lLeads ? lSales / lLeads : null, 1), 'lid → sotuv'), k('Tushum', mln(leadP.reduce((a, p) => a + (p.revenue || 0), 0)), "sotuv bo'limi orqali", "so'm")];
  } else if (role === 'marketing') {
    list = [k('Marketing', mln(t.marketing_uzs), 'oy kunlariga bo\'lingan', "so'm"), k('Tushumga nisbatan', fmtP(t.revenue ? t.marketing_uzs / t.revenue : null, 1)), k('1 sotuvga', mln(t.sales ? t.marketing_uzs / t.sales : null), 'marketing', "so'm"), k('1 mijoz', mln(t.cac_full_uzs), 'reklama + marketing', "so'm")];
  } else if (role === 'finance') {
    list = [k('Tushum', mln(t.revenue), '', "so'm"), k('Jami xarajat', mln(t.costs), '', "so'm"), k('Sof foyda', `<span class="${t.net < 0 ? 'neg' : 'pos'}">${t.net < 0 ? '−' : '+'}${mln(Math.abs(t.net))}</span>`, '', "so'm"), k('Marja', fmtP(t.margin, 1))];
  } else {
    list = [k('Tushum', mln(t.revenue), `${fmtN(t.sales)} sotuv`, "so'm"), k('1 mijoz', mln(t.cac_full_uzs), 'reklama + marketing', "so'm"), k('Sof foyda', `<span class="${t.net < 0 ? 'neg' : 'pos'}">${t.net < 0 ? '−' : '+'}${mln(Math.abs(t.net))}</span>`, `marja ${fmtP(t.margin, 1)}`, "so'm"), k('ROMI', fmtP(t.romi, 0))];
  }
  return `<section class="mb"><h2 class="kab-h">Bu oy <span class="muted small">${shortDate(c.from)} – ${shortDate(c.to)}</span></h2><div class="kpis kab-kpis">${list.join('')}</div></section>`;
}

// ---------- Xodim: mening kamchiliklarim ----------
function mine(owner) {
  if (!owner) return '';
  const issue = (i) => `<li class="iss ${i.level}"><span class="iss-dot"></span><span>${i.project ? `<b>${esc(i.project)}:</b> ` : ''}${esc(i.text)}</span>${i.impact ? `<em class="imp">+${mln(i.impact)}/oy</em>` : ''}</li>`;
  return `<section class="card mb kab-mine ${owner.status}"><div class="card-head"><h2>Mening kamchiliklarim</h2><span class="o-score" style="--s:${owner.score}" title="100 dan"><b>${owner.score}</b></span></div>
    ${owner.issues.length ? `<ul class="iss-list">${owner.issues.map(issue).join('')}</ul>` : `<p class="o-ok">${ICONS.check} Kamchilik yo'q</p>`}</section>`;
}

// ---------- PM / direktor: jamoa ----------
function team(c) {
  const v = c.verdict;
  return `<section class="card mb"><div class="card-head"><h2>Jamoa</h2><a class="btn small" href="#/nazorat">Batafsil →</a></div>
    <p class="kab-verdict ${v.level === 'good' ? 'good' : v.level === 'crit' ? 'crit' : 'warn'}">${esc(v.text)}</p>
    <div class="team-row">${c.owners.map((o) => `<div class="tm ${o.status}"><span class="o-score" style="--s:${o.score}"><b>${o.score}</b></span><div><b>${esc(o.label)}</b><small>${o.people.length ? esc(o.people.join(', ')) : '—'}</small>
      <span>${o.issues[0] ? esc(o.issues[0].text) : "Kamchilik yo'q"}</span></div></div>`).join('')}</div></section>`;
}

// ---------- Intizom ----------
function discipline(r, c) {
  if (!r) return '';
  const body = r.entries != null
    ? `<p class="disc-me">${fmtN(r.entries)} ta yozuv bu oy · ${r.last ? `oxirgisi ${shortDate(r.last)}` : 'hali yo\'q'}</p>`
    : `<div class="disc-me"><span><b class="pos">${fmtN(r.on_time)}</b> vaqtida</span><span><b class="warn-t">${fmtN(r.late)}</b> kechikkan</span><span><b class="neg">${fmtN(r.missed)}</b> kiritilmagan</span><span class="muted">muddat ${esc(r.deadline)}</span></div>`;
  return `<section class="card mb"><div class="card-head"><h2>Intizomim</h2><span class="pill ${LEVEL[r.level] || 'info'}">${{ good: 'Vaqtida', warn: 'Diqqat', crit: 'Yomon' }[r.level]}</span></div>${body}</section>`;
}
function teamDiscipline(c) {
  const rows = c.discipline.rows;
  if (!rows.length) return '';
  return `<section class="card mb"><div class="card-head"><h2>Intizom</h2><span class="muted small">bu oy</span></div>
    <div class="table-wrap"><table class="disc"><thead><tr><th>Xodim</th><th class="n">Vaqtida</th><th class="n">Kechikkan</th><th class="n">Kiritilmagan</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><b>${esc(r.name)}</b> <span class="muted small">${esc(c.roles[r.role] || '')}</span></td>${r.entries != null ? `<td class="n" colspan="3">${fmtN(r.entries)} ta yozuv</td>` : `<td class="n">${fmtN(r.on_time)}</td><td class="n ${r.late ? 'warn-t' : ''}">${fmtN(r.late)}</td><td class="n ${r.missed ? 'neg' : ''}">${fmtN(r.missed)}</td>`}
      <td><span class="pill ${LEVEL[r.level] || 'info'}">${{ good: 'Vaqtida', warn: 'Diqqat', crit: 'Yomon' }[r.level]}</span></td></tr>`).join('')}</tbody></table></div></section>`;
}
