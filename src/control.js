// «Nazorat» — rahbar uchun bitta joyda: pul qayerga ketyapti, 1 mijoz necha pulga tushyapti, ko'p yoki kam sarflayapmizmi,
// kim (targetolog, ROP, marketing, PM) qayerda xato qilyapti va intizom (hisobot vaqtida kiritilyaptimi).
// Server ham, brauzer demosi ham shu fayldan foydalanadi: ma'lumotlar bazasidan tashqari narsalar (xodimlar, yuborishlar) ctx orqali keladi.
import { summary, expenseBook, addDays, daysBetween } from './metrics.js';
import { EXPENSE_CATS } from './db.js';
import { ROLES, userParts, userAccess } from './roles.js';
import { sellerStats } from './sellers-calc.js';
import { forecast, bestBudget } from '../public/js/forecast.js';

const div = (a, b) => (b ? a / b : null);
const pctTxt = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
const usd = (x) => `$${x >= 100 ? Math.round(x) : x.toFixed(2)}`;
const som = (x) => `${Math.round(x).toLocaleString('ru-RU').replace(/\s|,/g, ' ')} so'm`;
const mln = (x) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1).replace('.0', '')} mln so'm` : som(x));

// Javobgarlik egalari (kim nima uchun javob beradi)
export const OWNERS = {
  target: { label: 'Targetolog', duty: 'Lid narxi, CTR, byudjet, lid sifati' },
  rop: { label: "Sotuv bo'limi", duty: "Qo'ng'iroq, konversiya, sotuvchilar" },
  marketing: { label: 'Marketing', duty: 'Marketing xarajati va natijasi' },
  finance: { label: 'Moliya', duty: 'Operatsion xarajatlar, foyda' },
  pm: { label: 'Proekt menejer', duty: 'Reja, hisobot vaqti, jarayon' },
};

// Bitta muammo: kim, qanchalik jiddiy (crit | warn | info), qaysi loyiha, matn, dalil va
// impact — tuzatilsa oyiga taxminan qancha so'm qo'shiladi (hisoblab bo'lmasa — null)
const issue = (owner, level, text, project = null, fact = null, impact = null) => ({ owner, level, text, project, fact, impact: impact > 0 ? Math.round(impact) : null });

// Loyiha iqtisodi va «ko'p yoki kam sarflayapmizmi» xulosasi.
//   contribution — 1 sotuvdan tannarxdan keyin qoladigan pul: 1 mijozni olib kelish (reklama) shundan qimmat bo'lsa — har yangi sotuv zarar,
//   reklamani kamaytirish kerak. Arzon bo'lsa — har sotuv foyda qo'shadi; sof foyda baribir manfiy bo'lsa — hajm (sotuvlar soni) doimiy
//   xarajat va marketingni qoplashga yetmayapti. breakeven — doimiy xarajat ulushi bilan (o'rtacha hisob)
function economics(p, days, planItem) {
  const auto = p.kind === 'auto';
  const varPct = (Number(p.var_cost_pct) || 0) / 100;
  const contribution = p.avg_check != null ? p.avg_check * (1 - varPct) : null;
  const fixedPerSale = p.sales ? p.fixed_cost / p.sales : null;
  const breakeven = contribution != null && fixedPerSale != null ? contribution - fixedPerSale - (p.sales ? (p.marketing_uzs || 0) / p.sales : 0) : null;
  const spendAll = p.spend_uzs + (p.marketing_uzs || 0);
  let verdict = null;
  if (spendAll > 0 && !p.sales && (p.leads >= 10 || p.clicks >= 300 || p.spend >= 50)) verdict = { level: 'crit', key: 'nosale', text: "Pul sarflandi, sotuv yo'q" };
  else if (p.cac_uzs != null && contribution != null) {
    if (p.cac_uzs > contribution) verdict = { level: 'crit', key: 'over', text: `Ko'p sarflanyapti: 1 sotuv reklamasi ${mln(p.cac_uzs)}, qoladigani ${mln(contribution)}` };
    else if (p.net_profit < 0) verdict = { level: 'warn', key: 'volume', text: 'Sotuv doimiy xarajatni qoplamayapti' };
    else if (p.cac_full_uzs < contribution * 0.5) verdict = { level: 'good', key: 'under', text: `Byudjetni oshirsa bo'ladi: 1 mijoz ${mln(p.cac_full_uzs)}, qoladigani ${mln(contribution)}` };
    else verdict = { level: 'ok', key: 'ok', text: `Me'yorida: 1 mijoz ${mln(p.cac_full_uzs)}` };
  }
  const per30 = days ? 30 / days : 1;
  const rate = p.spend ? p.spend_uzs / p.spend : null;
  const budget = planItem?.metrics?.budget;
  return {
    contribution, fixed_per_sale: fixedPerSale, breakeven, verdict,
    plan_budget: budget?.plan ? { plan: budget.plan, fact: budget.fact, expected: budget.expected, forecast: budget.forecast, status: budget.status } : null,
    // Prognoz kalkulyatori (brauzerda): oylik asosda
    model: {
      kind: auto ? 'auto' : 'leads',
      spend_month: p.spend * per30,
      unit_cost: auto ? div(p.spend, p.sales) : p.cpl, // $: 1 lid (yoki avtovoronkada 1 xarid)
      conv: auto ? 1 : (p.sales && p.leads ? p.sales / p.leads : p.conv),
      qualified_share: p.qualified_share,
      avg_check: p.avg_check,
      var_pct: varPct,
      rate,
      fixed_month: p.fixed_cost * per30,
      marketing_month: (p.marketing_uzs || 0) * per30,
      enough: auto ? p.sales >= 5 : p.leads >= 20 && p.sales >= 2,
    },
  };
}

// Qoidalar: har bir loyiha bo'yicha kim qayerda me'yordan chiqdi (oldingi davr / reja / o'z me'yori bilan solishtiriladi)
function projectIssues(p, plan, sellerByProject, days) {
  const out = [];
  const b = p.bench || {};
  const auto = p.kind === 'auto';
  const name = p.name;
  // Pul ta'siri uchun: oyiga (30 kun), 1 sotuvdan qoladigan pul, dollar kursi
  const per30 = days ? 30 / days : 1;
  const contribution = p.avg_check != null ? p.avg_check * (1 - (Number(p.var_cost_pct) || 0) / 100) : 0;
  const rate = p.spend ? p.spend_uzs / p.spend : 0;
  const sale = (n) => n * contribution * per30; // n ta qo'shimcha sotuv — oyiga so'm
  // Targetolog
  if (p.unit_cost != null && b.unit_cost) {
    const r = p.unit_cost / b.unit_cost;
    if (r >= 1.25) out.push(issue('target', r >= 1.5 ? 'crit' : 'warn', `${p.unit_label} ${usd(p.unit_cost)}, odatda ${usd(b.unit_cost)} (+${pctTxt(r - 1)})`, name, { now: p.unit_cost, norm: b.unit_cost }, p.spend * (1 - 1 / r) * rate * per30));
  }
  if (p.ctr != null && b.ctr && p.impressions >= 1000 && p.ctr < b.ctr * 0.75) out.push(issue('target', 'warn', `CTR ${pctTxt(p.ctr)}, odatda ${pctTxt(b.ctr)} — kreativni yangilang`, name));
  const pb = plan?.metrics?.budget;
  if (pb?.plan && plan.elapsed >= 5) {
    if (pb.status === 'over') out.push(issue('target', 'warn', `Byudjet tez ketyapti: ${usd(pb.fact)} / ${usd(pb.expected)}`, name));
    else if (pb.fact < pb.expected * 0.7) out.push(issue('target', 'warn', `Byudjet kam ishlatilyapti: ${usd(pb.fact)} / ${usd(pb.expected)}`, name));
  }
  if (!auto && p.leads >= 20 && p.unqualified_share != null && p.unqualified_share > 0.45) {
    const top = p.reasons?.bad?.[0];
    out.push(issue('target', p.unqualified_share > 0.6 ? 'crit' : 'warn', `Sifatsiz lid ${pctTxt(p.unqualified_share)}${top ? ` — ko'pi «${top.label}»` : ''}`, name, null, p.spend * (p.unqualified_share - 0.3) * rate * per30));
  }
  // Jarayon (PM): targetolog aytgan lid sotuv bo'limiga yetib bormayapti
  if (!auto && p.reported?.target_leads && p.reported?.leads && p.target_leads - p.leads >= 10 && p.target_leads > p.leads * 1.2) {
    out.push(issue('pm', 'warn', `${p.target_leads - p.leads} ta lid yo'qolgan: target ${p.target_leads}, sotuv ${p.leads}`, name, null, sale((p.target_leads - p.leads) * (p.conv || 0))));
  }
  // Sotuv bo'limi (ROP)
  if (!auto) {
    if (p.leads >= 20 && !p.sales) out.push(issue('rop', 'crit', `${p.leads} ta lid — sotuv yo'q`, name, null, b.conv ? sale(p.leads * b.conv) : null));
    else if (p.conv != null && b.conv && p.leads >= 15) {
      const r = p.conv / b.conv;
      if (r < 0.75) out.push(issue('rop', r < 0.5 ? 'crit' : 'warn', `Konversiya ${pctTxt(p.conv)}, ${b.conv_src === 'reja' ? 'rejada' : 'odatda'} ${pctTxt(b.conv)}`, name, null, sale(p.leads * (b.conv - p.conv))));
    }
    if (p.reported?.calls && p.leads >= 10 && p.calls < p.leads * 0.9) out.push(issue('rop', 'warn', `Qo'ng'iroq ${p.calls} / lid ${p.leads}`, name, null, sale((p.leads - p.calls) * 0.5 * (p.conv || 0))));
    if (p.st_nopickup && p.leads >= 10 && p.st_nopickup / p.leads > 0.25) out.push(issue('rop', 'warn', `Ko'tarmagan ${pctTxt(p.st_nopickup / p.leads)}`, name, null, sale(p.st_nopickup * 0.3 * (p.conv || 0))));
    const lost = p.reasons?.lost?.[0];
    if (lost && lost.count >= 5 && lost.share >= 0.35) {
      out.push(issue('rop', 'info', `Rad etishning ${pctTxt(lost.share)} — «${lost.label}»`, name, null, sale(lost.count * 0.15)));
    }
    const sp = sellerByProject.get(p.id);
    if (sp && sp.total.conv != null) {
      for (const x of sp.rows) {
        if (x.leads >= 15 && x.conv != null && x.conv < sp.total.conv * 0.5) out.push(issue('rop', 'warn', `${x.name}: konversiya ${pctTxt(x.conv)}, bo'lim ${pctTxt(sp.total.conv)}`, name, null, sale(x.leads * (sp.total.conv - x.conv) * 0.5)));
      }
    }
  } else if (p.conv != null && b.conv && (p.starts >= 50 || p.clicks >= 300)) {
    const r = p.conv / b.conv;
    if (r < 0.75) out.push(issue('pm', r < 0.5 ? 'crit' : 'warn', `Bot: ${p.conv_label} ${pctTxt(p.conv)}, odatda ${pctTxt(b.conv)}`, name, null, sale((p.starts || p.clicks) * (b.conv - p.conv))));
  }
  // Marketing: xarajat oshdi, natija yo'q; tushumga nisbatan katta
  const mk = p.marketing_uzs || 0;
  const mkPrev = p.prev?.marketing_uzs || 0;
  if (mk > 0 && mkPrev > 0 && mk > mkPrev * 1.3 && (p.leads || p.sales) <= (p.prev?.leads || p.prev?.sales || 0)) {
    out.push(issue('marketing', 'warn', `Marketing +${pctTxt(mk / mkPrev - 1)}, natija o'smadi`, name, null, (mk - mkPrev) * per30));
  }
  if (mk > 0 && p.revenue > 0 && mk / p.revenue > 0.2) out.push(issue('marketing', mk / p.revenue > 0.35 ? 'crit' : 'warn', `Marketing — tushumning ${pctTxt(mk / p.revenue)}`, name, null, (mk - p.revenue * 0.1) * per30));
  return out;
}

// Pul taqsimoti (oyiga): tushumning qanchasi reklamaga, qanchasi marketingga — va shunda foyda qancha bo'ladi.
// Reklama — har loyihada «Agar tiksak» modelidagi eng foydali byudjet (bir oyda ±50% dan ko'p o'zgartirilmaydi: bosqichma-bosqich).
// Marketing — tushumning 5–10% oralig'i mo'ljal: ko'p bo'lsa — 10% gacha qisqartirish, kam bo'lsa va foyda bor — 5% gacha oshirish
function allocation(projects, totals, days) {
  const per30 = days ? 30 / days : 1;
  const revenue = totals.revenue * per30;
  const rows = projects.map((p) => {
    const m = p.model;
    const ok = m?.unit_cost && m?.rate && m?.avg_check;
    const nowUsd = m?.spend_month || 0;
    if (!ok) return { id: p.id, name: p.name, color: p.color, now_usd: nowUsd, rec_usd: nowUsd, change: 'keep', gain: 0, enough: false, rate: m?.rate || 0 };
    const now = forecast(m, nowUsd);
    const best = m.enough ? bestBudget(m) : null;
    let rec = best ? best.budget : nowUsd;
    if (nowUsd > 0) rec = Math.min(Math.max(rec, nowUsd * 0.5), nowUsd * 1.5);
    rec = Math.round(rec / 10) * 10;
    const f = forecast(m, rec);
    const change = rec > nowUsd * 1.05 ? 'up' : rec < nowUsd * 0.95 ? 'down' : 'keep';
    return { id: p.id, name: p.name, color: p.color, now_usd: nowUsd, rec_usd: change === 'keep' ? nowUsd : rec, change, gain: change === 'keep' ? 0 : Math.max(0, f.profit - now.profit), enough: m.enough, rate: m.rate };
  });
  const adNow = rows.reduce((a, r) => a + r.now_usd * r.rate, 0);
  const adRec = rows.reduce((a, r) => a + r.rec_usd * r.rate, 0);
  const mkNow = (totals.marketing_uzs || 0) * per30;
  const share = revenue ? mkNow / revenue : null;
  let mkRec = mkNow, mkNote = "Me'yorida";
  if (share != null && share > 0.12) { mkRec = revenue * 0.1; mkNote = "Ko'p — tushumning 10% igacha qisqartirish"; }
  else if (share != null && share < 0.03 && totals.net > 0) { mkRec = revenue * 0.05; mkNote = 'Kam — foyda bor, 5% gacha oshirsa bo\'ladi'; }
  const netNow = totals.net * per30;
  const gain = rows.reduce((a, r) => a + r.gain, 0) + Math.max(0, mkNow - mkRec);
  return {
    revenue,
    ad: { now: adNow, rec: adRec, now_share: div(adNow, revenue), rec_share: div(adRec, revenue) },
    marketing: { now: mkNow, rec: mkRec, now_share: share, rec_share: div(mkRec, revenue), note: mkNote },
    profit: { now: netNow, rec: netNow + gain },
    projects: rows.map(({ rate, ...r }) => ({ ...r, gain: Math.round(r.gain) })),
  };
}

// Intizom: har kungi hisobot belgilangan vaqtgacha kiritildimi. Kun d ning hisoboti — ertasi kuni soat deadline gacha
function discipline({ from, to, today, ctx, book }) {
  const last = addDays(today, -1) < to ? addDays(today, -1) : to;
  const days = [];
  for (let d = from; d <= last; d = addDays(d, 1)) days.push(d);
  const due = (d, hhmm) => `${addDays(d, 1)} ${hhmm}:00`;
  const rows = [];
  const staffDeadline = ctx.settings?.staff_deadline || '12:00';
  const reportDeadline = ctx.settings?.report_time || '13:00';
  const score = (r) => {
    const counted = r.on_time + r.late + r.missed;
    r.rate = counted ? r.on_time / counted : null;
    r.level = r.missed >= 3 || (r.rate != null && r.rate < 0.5) ? 'crit' : r.missed >= 1 || r.late >= 3 ? 'warn' : 'good';
    return r;
  };
  for (const u of ctx.users.filter((x) => x.active !== 0)) {
    const since = String(u.created_at || '').slice(0, 10);
    const mine = days.filter((d) => !since || d >= since);
    if (u.role === 'pm') {
      const r = { id: u.id, name: u.name, role: u.role, what: 'Kunlik hisobot (direktorga)', deadline: reportDeadline, on_time: 0, late: 0, missed: 0, pending: 0, times: [] };
      for (const d of mine) {
        const rep = ctx.reports.find((x) => x.date === d && ['submitted', 'reviewed'].includes(x.status));
        if (!rep?.submitted_at) { if (d === addDays(today, -1)) r.pending += 1; else r.missed += 1; continue; }
        if (rep.submitted_at <= due(d, reportDeadline)) r.on_time += 1; else r.late += 1;
        r.times.push(rep.submitted_at.slice(11, 16));
      }
      rows.push(score(r));
      continue;
    }
    const parts = userParts(u);
    if (parts.length) {
      const r = { id: u.id, name: u.name, role: u.role, what: parts.map((x) => (x === 'target' ? 'Target hisoboti' : 'Sotuv hisoboti')).join(', '), deadline: staffDeadline, on_time: 0, late: 0, missed: 0, pending: 0, times: [] };
      for (const d of mine) {
        const sent = ctx.staffReports.find((x) => x.date === d && x.user_id === u.id);
        if (!sent) { if (d === addDays(today, -1)) r.pending += 1; else r.missed += 1; continue; }
        if (sent.submitted_at <= due(d, staffDeadline)) r.on_time += 1; else r.late += 1;
        r.times.push(sent.submitted_at.slice(11, 16));
      }
      rows.push(score(r));
      continue;
    }
    // Marketing va moliya: kunlik hisobot yo'q — oxirgi kiritish qachon bo'lgani
    const kinds = userAccess(u).map((s) => ({ marketing: 'marketing', finance: 'opex' }[s])).filter(Boolean);
    if (kinds.length) {
      const list = book.list.filter((e) => kinds.includes(e.kind));
      const own = list.filter((e) => e.user_id === u.id);
      const lastEntry = (own.length ? own : list).map((e) => String(e.created_at || e.date).slice(0, 10)).sort().pop() || null;
      const inPeriod = list.filter((e) => e.date >= from && e.date <= to).length;
      const ago = lastEntry ? daysBetween(lastEntry, today) - 1 : null;
      rows.push({ id: u.id, name: u.name, role: u.role, what: kinds.includes('marketing') ? 'Marketing xarajatlari' : 'Operatsion xarajatlar', entries: inPeriod, last: lastEntry, ago,
        level: ago == null || ago > 14 ? 'crit' : ago > 7 ? 'warn' : 'good' });
    }
  }
  return { days: days.length, staff_deadline: staffDeadline, report_deadline: reportDeadline, rows };
}

export function control({ from, to, today }, ctx) {
  const s = summary({ from, to });
  const book = expenseBook();
  const days = s.days;
  const live = s.byProject.filter((p) => !p.archived || p.revenue || p.spend);
  const sellerByProject = new Map(sellerStats(ctx.sellerRows || [], ctx.sellers || [], live.filter((p) => p.kind !== 'auto')).map((x) => [x.id, x]));
  const planOf = (id) => {
    const it = s.plan.items.find((i) => i.project_id === id);
    return it ? { ...it, elapsed: s.plan.elapsed } : null;
  };

  const projects = live.map((p) => ({
    id: p.id, name: p.name, color: p.color, kind: p.kind, archived: p.archived,
    revenue: p.revenue, sales: p.sales, leads: p.leads, qualified: p.qualified, spend: p.spend, spend_uzs: p.spend_uzs,
    marketing_uzs: p.marketing_uzs || 0, var_cost: p.var_cost, fixed_cost: p.fixed_cost, fixed_actual: p.fixed_actual, fixed_estimated: p.fixed_estimated,
    net_profit: p.net_profit, net_margin: p.net_margin, cpl: p.cpl, unit_cost: p.unit_cost, unit_label: p.unit_label, conv: p.conv, conv_label: p.conv_label,
    cost_per_qualified: p.cost_per_qualified, cac_uzs: p.cac_uzs, cac_full_uzs: p.cac_full_uzs, avg_check: p.avg_check, roas: p.roas,
    prev: { net_profit: p.prev?.net_profit, cac_full_uzs: p.prev?.cac_full_uzs, cpl: p.prev?.cpl, conv: p.prev?.conv },
    ...economics(p, days, planOf(p.id)),
  }));

  // Muammolar — loyihalar bo'yicha + umumiy (marketing va moliya kiritilmagani, reja yo'qligi, intizom)
  const issues = live.flatMap((p) => projectIssues(p, planOf(p.id), sellerByProject, days));
  const t = s.totals;
  const general = t.general || { marketing: 0, opex: 0 };
  const mkAll = (t.marketing_uzs || 0) + general.marketing;
  const hasMarketingUser = ctx.users.some((u) => u.active !== 0 && u.role !== 'pm' && userAccess(u).includes('marketing'));
  const mkEntries = book.list.filter((e) => e.kind === 'marketing' && e.date >= from && e.date <= to).length;
  if (hasMarketingUser && !mkEntries) issues.push(issue('marketing', 'warn', 'Marketing xarajatlari kiritilmagan'));
  if (mkAll > 0 && t.revenue > 0 && general.marketing / t.revenue > 0.15) issues.push(issue('marketing', 'warn', `Loyihasiz marketing — tushumning ${pctTxt(general.marketing / t.revenue)}`));
  if (!s.plan.hasPlans) issues.push(issue('pm', 'warn', 'Oylik reja kiritilmagan'));
  const estimated = live.filter((p) => p.fixed_estimated && !p.fixed_actual).map((p) => p.name);
  if (estimated.length) issues.push(issue('finance', 'info', `Operatsion xarajat kiritilmagan: ${estimated.join(', ')}`));
  if (t.revenue > 0 && (t.company_net ?? t.net_profit) < 0) issues.push(issue('finance', 'warn', `Kompaniya zararda: ${mln(t.company_net ?? t.net_profit)}`));

  const disc = discipline({ from, to, today, ctx, book });
  for (const r of disc.rows) {
    const owner = OWNERS[r.role] ? r.role : null;
    if (!owner || r.level === 'good') continue;
    if (r.entries != null) issues.push(issue(owner, r.level === 'crit' ? 'warn' : 'info', `${r.name}: ${r.ago == null ? 'hali kiritmagan' : `oxirgi kiritish ${r.ago} kun oldin`}`));
    else issues.push(issue(owner, r.level, `${r.name}: ${[r.missed ? `${r.missed} kun kiritmagan` : '', r.late ? `${r.late} kun kechikkan` : ''].filter(Boolean).join(', ')}`));
  }

  // Har bir javobgar: ball (100 dan jiddiy −20, diqqat −8, ma'lumot −3) va holat
  const rank = { crit: 0, warn: 1, info: 2 };
  issues.sort((a, b) => rank[a.level] - rank[b.level]);
  const owners = Object.entries(OWNERS).map(([key, o]) => {
    const list = issues.filter((i) => i.owner === key);
    const score = Math.max(0, 100 - list.reduce((a, i) => a + (i.level === 'crit' ? 20 : i.level === 'warn' ? 8 : 3), 0));
    const person = ctx.users.filter((u) => u.active !== 0 && u.role === key).map((u) => u.name);
    return { key, label: o.label, duty: o.duty, people: person, score, status: score >= 80 ? 'good' : score >= 50 ? 'warn' : 'crit', issues: list };
  });
  const worst = [...owners].sort((a, b) => a.score - b.score)[0];
  const verdict = worst && worst.score < 80
    ? { owner: worst.key, level: worst.status, text: `Asosiy kamchilik — ${worst.label}: ${worst.issues[0]?.project ? `${worst.issues[0].project}, ` : ''}${worst.issues[0]?.text || ''}` }
    : { owner: null, level: 'good', text: "Hammasi me'yorida" };

  // Kompaniya bo'yicha jami
  const net = (t.company_net ?? t.net_profit);
  const totals = {
    revenue: t.revenue, sales: t.sales, leads: t.leads, target_leads: t.target_leads, qualified: t.qualified, spend: t.spend, spend_uzs: t.spend_uzs,
    marketing_uzs: mkAll, marketing_projects_uzs: t.marketing_uzs || 0, general_marketing_uzs: general.marketing, general_opex_uzs: general.opex,
    var_cost: t.var_cost, fixed_cost: t.fixed_cost, net, margin: div(net, t.revenue),
    costs: t.spend_uzs + mkAll + t.var_cost + t.fixed_cost + general.opex,
    cpl: t.cpl, cac_uzs: div(t.spend_uzs, t.sales), cac_full_uzs: div(t.spend_uzs + mkAll, t.sales),
    romi: div(t.revenue - t.var_cost - t.spend_uzs - mkAll, t.spend_uzs + mkAll),
    prev: { revenue: s.prev.revenue, net: s.prev.net_profit, cac_full_uzs: s.prev.cac_full_uzs, spend_uzs: s.prev.spend_uzs, sales: s.prev.sales },
  };

  // Takliflar (qoida bo'yicha): eng muhimlari — avval pulga ta'sir qiladiganlar
  const advice = [];
  for (const p of projects) {
    if (p.verdict?.key === 'nosale') advice.push({ owner: p.kind === 'auto' ? 'pm' : 'rop', level: 'crit', project: p.name, text: `${p.name}: sotuv yo'q — reklamani to'xtatib, voronkani tekshiring` });
    else if (p.verdict?.key === 'over') advice.push({ owner: 'target', level: 'crit', project: p.name, text: `${p.name}: eng qimmat kanal va kreativni o'chiring${p.contribution && p.cac_uzs ? ` — 1 sotuv reklamasi ${pctTxt(1 - p.contribution / p.cac_uzs)} arzonlashishi kerak` : ''}` });
    else if (p.verdict?.key === 'volume') advice.push({ owner: 'pm', level: 'warn', project: p.name, text: `${p.name}: sotuvni ko'paytiring yoki doimiy xarajatni qisqartiring` });
    else if (p.verdict?.key === 'under') advice.push({ owner: 'target', level: 'good', project: p.name, text: `${p.name}: byudjetni oshirsa foyda o'sadi — «Agar tiksak»da sinab ko'ring` });
  }
  for (const i of issues.filter((x) => x.level === 'crit').slice(0, 4)) advice.push({ owner: i.owner, level: 'warn', project: i.project, text: `${i.project ? `${i.project}: ` : ''}${i.text}` });
  if (totals.marketing_uzs && totals.revenue && totals.marketing_uzs / totals.revenue > 0.25) advice.push({ owner: 'marketing', level: 'warn', text: `Marketing — tushumning ${pctTxt(totals.marketing_uzs / totals.revenue)}: natija bermayotganini qisqartiring` });

  // Pul taqsimoti va birinchi navbatdagi ishlar — oyiga qancha pul qo'shiladi (eng kattasi birinchi)
  const alloc = allocation(projects, totals, days);
  const priorities = [
    ...issues.filter((i) => i.impact > 0).map((i) => ({ owner: i.owner, project: i.project, text: i.text, impact: i.impact, level: i.level })),
    ...alloc.projects.filter((x) => x.gain > 0).map((x) => ({ owner: 'target', project: x.name, text: `Reklama byudjetini ${x.change === 'up' ? 'oshirish' : 'kamaytirish'}: $${Math.round(x.now_usd)} → $${Math.round(x.rec_usd)} oyiga`, impact: x.gain, level: 'info' })),
  ].sort((a, b) => b.impact - a.impact).slice(0, 8);

  // Xarajatlar tarkibi (kategoriyalar bo'yicha) — shu davr
  const byCat = {};
  for (const e of book.list.filter((x) => x.date >= from && x.date <= to)) {
    const k = `${e.kind}:${e.category}`;
    byCat[k] = byCat[k] || { kind: e.kind, category: e.category, label: EXPENSE_CATS[e.kind]?.[e.category] || e.category, uzs: 0 };
    byCat[k].uzs += e.uzs;
  }

  return {
    from, to, days, totals, projects, owners, verdict, issues, discipline: disc, advice, allocation: alloc, priorities,
    costs_by_category: Object.values(byCat).sort((a, b) => b.uzs - a.uzs),
    roles: ROLES,
  };
}

// AI ga yuboriladigan ixcham ma'lumot (raqamlar so'mda / dollarda)
export function controlAiInput(c) {
  const r = (x) => (x == null || !Number.isFinite(x) ? undefined : Math.round(x));
  const p2 = (x) => (x == null || !Number.isFinite(x) ? undefined : `${(x * 100).toFixed(1)}%`);
  return {
    davr: `${c.from} — ${c.to} (${c.days} kun)`,
    jami: { tushum: r(c.totals.revenue), reklama_som: r(c.totals.spend_uzs), marketing_som: r(c.totals.marketing_uzs), tannarx: r(c.totals.var_cost), doimiy_xarajat: r(c.totals.fixed_cost + c.totals.general_opex_uzs), sof_foyda: r(c.totals.net), marja: p2(c.totals.margin), sotuv: c.totals.sales, lid: c.totals.leads, bir_mijoz_narxi: r(c.totals.cac_full_uzs), romi: p2(c.totals.romi) },
    loyihalar: c.projects.map((p) => ({ nomi: p.name, turi: p.kind === 'auto' ? 'avtovoronka' : "sotuv bo'limi", tushum: r(p.revenue), reklama_usd: r(p.spend), marketing_som: r(p.marketing_uzs), sof_foyda: r(p.net_profit), lid: p.leads, sotuv: p.sales, lid_narxi_usd: p.cpl != null ? Math.round(p.cpl * 100) / 100 : undefined, konversiya: p2(p.conv), bir_mijoz_som: r(p.cac_full_uzs), chegaraviy_narx_som: r(p.breakeven), xulosa: p.verdict?.text })),
    muammolar: c.issues.slice(0, 25).map((i) => ({ kim: OWNERS[i.owner]?.label, daraja: i.level, loyiha: i.project || undefined, matn: i.text })),
    intizom: c.discipline.rows.map((x) => ({ xodim: x.name, rol: ROLES[x.role], vaqtida: x.on_time, kechikib: x.late, kiritilmagan: x.missed, oxirgi_kiritish: x.last })),
    pul_taqsimoti_oyiga: { tushum: r(c.allocation.revenue), reklama_hozir: r(c.allocation.ad.now), reklama_tavsiya: r(c.allocation.ad.rec), marketing_hozir: r(c.allocation.marketing.now), marketing_tavsiya: r(c.allocation.marketing.rec) },
    birinchi_navbatda: c.priorities.map((x) => ({ kim: OWNERS[x.owner]?.label, loyiha: x.project || undefined, matn: x.text, oyiga_som: x.impact })),
  };
}
