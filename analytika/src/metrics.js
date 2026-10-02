// Hisob-kitoblar: reklama → klik → lid / bot start → sotuv → tushum → foyda va sof foyda
import { getDb, getSetting, today, FIELDS, TEXT_FIELDS, REASONS } from './db.js';

const SUM_FIELDS = Object.keys(FIELDS);
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const pct0 = (x) => `${Math.round(x * 100)}%`;
const fmt = (x) => Math.round(x).toLocaleString('ru-RU').replace(/,/g, ' ');
const mln = (x) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1).replace('.0', '')} mln` : fmt(x));
const div = (a, b) => (b > 0 && a != null ? a / b : null);
const DAY_SHARE = 12 / 365; // oylik doimiy xarajatning bir kunlik ulushi

export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 864e5) + 1;
}

export function usdRate() {
  return Number(getSetting('usd_rate', process.env.USD_RATE || 12800)) || 12800;
}

export function loadRows(from, to, projectId = null) {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects WHERE active = 1 ORDER BY id').all()
    .filter((p) => !projectId || p.id === Number(projectId));
  const ids = projects.map((p) => p.id);
  if (!ids.length) return { projects, rows: [] };
  const rows = db.prepare(`SELECT * FROM daily WHERE date BETWEEN ? AND ? AND project_id IN (${ids.map(() => '?').join(',')})`).all(from, to, ...ids);
  return { projects, rows };
}

// Sabablar: { [project_id]: { bad: {reason: n}, lost: {reason: n} } }
export function loadReasons(from, to) {
  const out = {};
  for (const r of getDb().prepare('SELECT * FROM reasons WHERE date BETWEEN ? AND ?').all(from, to)) {
    const p = (out[r.project_id] ||= { bad: {}, lost: {} });
    if (p[r.kind]) p[r.kind][r.reason] = (p[r.kind][r.reason] || 0) + r.count;
  }
  return out;
}

// Sabablar ro'yxati: eng ko'pi birinchi, ulushi bilan
export function reasonList(kind, counts = {}) {
  const total = Object.values(counts).reduce((a, n) => a + n, 0);
  return Object.entries(counts).filter(([, n]) => n > 0)
    .map(([reason, n]) => ({ reason, label: REASONS[kind][reason] || reason, count: n, share: n / total }))
    .sort((a, b) => b.count - a.count);
}

export function sumRows(rows) {
  // reported — nechta kunda maydon kiritilgan (0 va «kiritilmagan» farqlanadi)
  const t = { days: new Set(), reported: {} };
  for (const f of SUM_FIELDS) { t[f] = 0; t.reported[f] = 0; }
  for (const r of rows) {
    t.days.add(r.date);
    for (const f of SUM_FIELDS) {
      t[f] += Number(r[f]) || 0;
      if (r[f] != null) t.reported[f] += 1;
    }
  }
  t.days = t.days.size;
  return derive(t);
}

export function derive(t, rate = usdRate()) {
  const spendUzs = t.spend * rate;
  return {
    ...t,
    spend_uzs: spendUzs,
    ctr: div(t.clicks, t.impressions),
    cpc: div(t.spend, t.clicks),
    cpl: div(t.spend, t.leads),
    cost_per_start: div(t.spend, t.starts),
    cost_per_qualified: div(t.spend, t.qualified),
    cac: div(t.spend, t.sales),
    lead_to_sale: div(t.sales, t.leads),
    start_to_sale: div(t.sales, t.starts),
    click_to_start: div(t.starts, t.clicks),
    click_to_lead: div(t.leads, t.clicks),
    qualified_share: div(t.qualified, t.leads),
    potential_share: div(t.potential, t.leads),
    unqualified_share: div(t.unqualified, t.leads),
    avg_check: div(t.revenue, t.sales),
    roas: div(t.revenue, spendUzs),
  };
}

// Pul: tushum − reklama = foyda; − tannarx (tushumdan %) − doimiy xarajat = sof foyda
function finance(t, project, days) {
  const varCost = t.revenue * ((Number(project?.var_cost_pct) || 0) / 100);
  const fixedCost = (Number(project?.fixed_monthly) || 0) * DAY_SHARE * days;
  const gross = t.revenue - t.spend_uzs;
  const net = gross - varCost - fixedCost;
  return {
    var_cost: varCost, fixed_cost: fixedCost, costs: t.spend_uzs + varCost + fixedCost,
    gross_profit: gross, net_profit: net,
    gross_margin: div(gross, t.revenue), net_margin: div(net, t.revenue),
  };
}

// Konversiya loyiha turiga qarab: sotuv bo'limi — lid → sotuv; avtovoronka — bot start → xarid (start yo'q bo'lsa klik → xarid)
function conversion(t, kind) {
  if (kind === 'auto') {
    if (t.reported.starts) return { conv: t.start_to_sale, conv_label: 'start → xarid', unit_cost: t.cost_per_start, unit_label: '1 start narxi' };
    return { conv: div(t.sales, t.clicks), conv_label: 'klik → xarid', unit_cost: t.cpc, unit_label: '1 klik narxi' };
  }
  return { conv: t.lead_to_sale, conv_label: 'lid → sotuv', unit_cost: t.cpl, unit_label: '1 lid narxi' };
}

function pctChange(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

// Har bir loyiha o'z me'yori bilan solishtiriladi: loyihalar har xil biznes
// (STARPAY do'kon — konversiyasi kurslarnikidan ancha yuqori).
// Konversiya me'yori: oylik reja (sotuv/lid), bo'lmasa — o'zining oldingi 4 haftasi; narx va CTR — oldingi 4 hafta
function benchmarks(from, projects, plan, projectId) {
  const baseTo = addDays(from, -1);
  const { rows } = loadRows(addDays(baseTo, -27), baseTo, projectId);
  const out = {};
  for (const p of projects) {
    const b = sumRows(rows.filter((r) => r.project_id === p.id));
    const c = conversion(b, p.kind);
    const m = plan.items.find((i) => i.project_id === p.id)?.metrics;
    const planConv = p.kind !== 'auto' && m?.leads?.plan && m?.sales?.plan ? m.sales.plan / m.leads.plan : null;
    const base = p.kind === 'auto' ? (b.reported.starts ? b.starts : b.clicks) : b.leads;
    const ownConv = base >= 30 ? c.conv : null;
    out[p.id] = {
      conv: planConv ?? ownConv,
      conv_src: planConv != null ? 'reja' : ownConv != null ? 'odatda' : null,
      unit_cost: (p.kind === 'auto' ? base >= 10 : b.leads >= 10) ? c.unit_cost : null,
      ctr: b.impressions >= 1000 ? b.ctr : null,
    };
  }
  return out;
}

function projectStats(p, rows, days) {
  const t = sumRows(rows);
  return { ...t, ...finance(t, p, days), ...conversion(t, p.kind) };
}

export function summary({ from, to, projectId = null }) {
  const len = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  const { projects, rows } = loadRows(from, to, projectId);
  const { rows: prevRows } = loadRows(prevFrom, prevTo, projectId);
  const reasons = loadReasons(from, to);

  const byProject = projects.map((p) => {
    const cur = projectStats(p, rows.filter((r) => r.project_id === p.id), len);
    const old = projectStats(p, prevRows.filter((r) => r.project_id === p.id), len);
    const rs = reasons[p.id] || { bad: {}, lost: {} };
    return {
      id: p.id, name: p.name, color: p.color, kind: p.kind || 'leads', var_cost_pct: p.var_cost_pct, fixed_monthly: p.fixed_monthly,
      ...cur,
      prev: { unit_cost: old.unit_cost, conv: old.conv, qualified_share: old.qualified_share, net_profit: old.net_profit, revenue: old.revenue, spend: old.spend },
      growth: { leads: pctChange(cur.leads, old.leads), sales: pctChange(cur.sales, old.sales), revenue: pctChange(cur.revenue, old.revenue) },
      reasons: { bad: reasonList('bad', rs.bad), lost: reasonList('lost', rs.lost) },
    };
  });

  // Jami: raqamlar yig'indisi + har bir loyihaning xarajatlari
  const totalsOf = (list, rowsAll) => {
    const t = sumRows(rowsAll);
    const f = { var_cost: 0, fixed_cost: 0 };
    for (const p of list) { f.var_cost += p.var_cost; f.fixed_cost += p.fixed_cost; }
    const gross = t.revenue - t.spend_uzs;
    const net = gross - f.var_cost - f.fixed_cost;
    return { ...t, ...f, costs: t.spend_uzs + f.var_cost + f.fixed_cost, gross_profit: gross, net_profit: net, gross_margin: div(gross, t.revenue), net_margin: div(net, t.revenue) };
  };
  const totals = totalsOf(byProject, rows);
  const prevList = projects.map((p) => projectStats(p, prevRows.filter((r) => r.project_id === p.id), len));
  const prev = totalsOf(prevList, prevRows);
  const delta = {};
  for (const k of Object.keys(totals)) if (typeof totals[k] === 'number') delta[k] = pctChange(totals[k], prev[k]);

  // Kunma-kun: pul oqimi (tushum, barcha xarajat, sof foyda) — jami va loyihalar bo'yicha
  const dayStats = (d, list) => {
    let revenue = 0, costs = 0;
    const out = { date: d, spend: 0, clicks: 0, starts: 0, leads: 0, qualified: 0, sales: 0 };
    for (const p of list) {
      const r = rows.find((x) => x.project_id === p.id && x.date === d);
      const s = projectStats(p, r ? [r] : [], 1);
      revenue += s.revenue; costs += s.costs;
      for (const k of ['spend', 'clicks', 'starts', 'leads', 'qualified', 'sales']) out[k] += s[k];
    }
    return { ...out, revenue, costs, net: revenue - costs, cpl: div(out.spend, out.leads) };
  };
  const series = [];
  for (let d = from; d <= to; d = addDays(d, 1)) series.push(dayStats(d, projects));
  for (const p of byProject) {
    const proj = projects.find((x) => x.id === p.id);
    p.series = [];
    for (let d = from; d <= to; d = addDays(d, 1)) p.series.push(dayStats(d, [proj]));
  }

  // Targetolog va ROP izohlari, kreativlar — kunlar bo'yicha
  const notes = rows
    .filter((r) => Object.keys(TEXT_FIELDS).some((f) => r[f]))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 40)
    .map((r) => ({ date: r.date, project_id: r.project_id, project: projects.find((p) => p.id === r.project_id)?.name, ...Object.fromEntries(Object.keys(TEXT_FIELDS).map((f) => [f, r[f] || null])) }));

  const plan = planProgress(to.slice(0, 7), projectId, to);
  const bench = benchmarks(from, projects, plan, projectId);
  for (const p of byProject) {
    p.bench = bench[p.id];
    p.insights = projectInsights(p, len);
    p.price = priceAdvice(p);
  }
  return { from, to, prevFrom, prevTo, days: len, totals, prev, delta, byProject, series, notes, plan };
}

// ---------- Majlis uchun: loyiha bo'yicha xulosalar («nega?» raqamlarda) ----------
function projectInsights(p) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  const b = p.bench || {};
  if (p.revenue > 0 || p.spend > 0) {
    if (p.net_profit < 0) {
      const [name, v] = [['reklama', p.spend_uzs], ['tannarx', p.var_cost], ['doimiy xarajat', p.fixed_cost]].sort((a, b) => b[1] - a[1])[0];
      add('critical', `Zararda: ${mln(p.net_profit)} so'm${p.revenue ? ` (marja ${pct0(p.net_margin)})` : ''}. Eng katta xarajat — ${name}: ${mln(v)} so'm${p.revenue ? ` (tushumning ${pct0(v / p.revenue)})` : ''}.`);
    }
    else if (p.gross_profit < 0) add('critical', `Tushum reklamani ham qoplamayapti: ${mln(p.revenue)} so'm tushum, ${mln(p.spend_uzs)} so'm reklama.`);
  }
  if (p.kind !== 'auto' && p.leads >= 10 && p.reported.unqualified) {
    const top = p.reasons.bad[0];
    const wasted = p.cpl != null ? p.unqualified * p.cpl : null;
    if (p.unqualified_share >= 0.35) {
      add('warning', `Lidlarning ${pct0(p.unqualified_share)} sifatsiz${top ? `. Asosiy sabab — «${top.label}» (${pct0(top.share)})` : ''}${wasted ? `. Sifatsiz lidlarga ketgan pul: $${fmt(wasted)}` : ''}.`);
    }
    if (p.prev.qualified_share != null && p.qualified_share != null && p.qualified_share < p.prev.qualified_share - 0.08) {
      add('warning', `Sifatli lid ulushi tushdi: ${pct0(p.qualified_share)} (oldin ${pct0(p.prev.qualified_share)})`);
    }
  }
  if (p.reported.sales && p.conv != null && b.conv && p.conv < b.conv * 0.6) {
    const top = p.reasons.lost[0];
    add('warning', `Konversiya past: ${pct(p.conv)} ${p.conv_label} (${b.conv_src} ${pct(b.conv)})${top ? `. Sotib olmaganlarning ${pct0(top.share)} — «${top.label}»` : ''}.`);
  }
  const uc = pctChange(p.unit_cost, p.prev.unit_cost);
  if (uc != null && uc > 0.25 && p.spend > 0) add('warning', `${p.unit_label} oshdi: $${p.unit_cost.toFixed(2)} (oldingi davrda $${p.prev.unit_cost.toFixed(2)}, +${pct0(uc)})`);
  if (p.kind !== 'auto' && p.potential >= 10) add('info', `${fmt(p.potential)} ta potensial lid — sotuv bo'limi qayta qo'ng'iroq qilsa, qo'shimcha sotuv`);
  if (!out.length && p.net_profit > 0) add('good', `Foydada: sof foyda ${mln(p.net_profit)} so'm (marja ${pct0(p.net_margin)})`);
  return out;
}

// Narx bo'yicha tavsiya: birlik iqtisodiyoti (1 sotuvdan foyda), konversiya va «qimmat» deganlar ulushi
export function priceAdvice(p) {
  if (!p.reported.sales || p.sales < 3 || !p.avg_check) return null;
  const varPct = (Number(p.var_cost_pct) || 0) / 100;
  const perSaleCost = (p.spend_uzs + p.fixed_cost) / p.sales; // 1 mijozni olib kelish + doimiy xarajat ulushi
  const profitPerSale = p.avg_check * (1 - varPct) - perSaleCost;
  const breakeven = varPct < 1 ? perSaleCost / (1 - varPct) : null;
  const lostTotal = p.reasons.lost.reduce((a, r) => a + r.count, 0);
  const exp = p.reasons.lost.find((r) => r.reason === 'expensive');
  const expShare = lostTotal >= 10 ? (exp?.count || 0) / lostTotal : null;
  const b = p.bench || {};
  const convOk = !b.conv || (p.conv ?? 0) >= b.conv * 0.9;
  const base = { avg_check: p.avg_check, profit_per_sale: profitPerSale, breakeven, expensive_share: expShare };
  if (profitPerSale < 0) {
    const tooExpensive = expShare != null && expShare >= 0.35;
    return { ...base, verdict: tooExpensive ? 'cost' : 'up', title: tooExpensive ? "Zarar, lekin narxni ko'tarib bo'lmaydi" : "Narxni ko'tarish kerak",
      text: `Har bir sotuvdan ${mln(-profitPerSale)} so'm zarar. Zararsizlik narxi — kamida ${mln(breakeven)} so'm (hozir o'rtacha ${mln(p.avg_check)}).${tooExpensive
        ? ` Sotib olmaganlarning ${pct0(expShare)} «qimmat» deyapti — avval 1 mijoz narxini ($${(p.cac || 0).toFixed(0)}) va doimiy xarajatni kamaytiring.`
        : ` 1 sotuvga reklama ${mln(p.spend_uzs / p.sales)}, doimiy xarajat ${mln(p.fixed_cost / p.sales)} so'm to'g'ri keladi — narxni ko'tarish yoki ${p.fixed_cost > p.spend_uzs ? 'doimiy xarajatni kamaytirish (yoki sotuvni ko\'paytirish)' : '1 mijoz narxini tushirish'} kerak.`}` };
  }
  if (expShare != null && expShare >= 0.35 && !convOk) {
    return { ...base, verdict: 'down', title: "Mijozlar «qimmat» deyapti",
      text: `Sotib olmaganlarning ${pct0(expShare)} «qimmat» deydi, konversiya me'yordan past. 1 sotuvdan ${mln(profitPerSale)} so'm foyda bor — chegirma, bo'lib to'lash yoki arzonroq tarif sinab ko'rsa bo'ladi.` };
  }
  if (convOk && (expShare == null || expShare < 0.2) && p.net_margin != null && p.net_margin < 0.15) {
    const plus = p.revenue * 0.1 * (1 - varPct);
    return { ...base, verdict: 'up', title: "Narxni 5–10% ko'tarib ko'rish mumkin",
      text: `Talab yaxshi (konversiya me'yorda${expShare != null ? `, «qimmat» deganlar ${pct0(expShare)}` : ''}), lekin sof marja atigi ${pct0(p.net_margin)}. Narx 10% oshsa va sotuv kamaymasa, shu davrda +${mln(plus)} so'm qo'shimcha sof foyda.` };
  }
  return { ...base, verdict: 'keep', title: "Narx me'yorida",
    text: `1 sotuvdan ${mln(profitPerSale)} so'm foyda${expShare != null ? `, «qimmat» deganlar ${pct0(expShare)}` : ''}. Hozircha o'zgartirish shart emas.` };
}

// ---------- Oylik reja ----------
export function monthBounds(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, days: last };
}

// Reja ↔ fakt: oy boshidan asOf gacha. Kutilgan = reja × o'tgan kunlar / oy kunlari; prognoz — joriy sur'at bo'yicha
export function planProgress(month, projectId = null, asOf = today()) {
  const { from, to: monthEnd, days } = monthBounds(month);
  const to = asOf < monthEnd ? asOf : monthEnd;
  const elapsed = to < from ? 0 : daysBetween(from, to);
  const plans = getDb().prepare('SELECT * FROM plans WHERE month = ?').all(month)
    .filter((p) => !projectId || p.project_id === Number(projectId));
  const { rows } = elapsed ? loadRows(from, to, projectId) : { rows: [] };
  const allProjects = getDb().prepare('SELECT * FROM projects WHERE active = 1 ORDER BY id').all();
  const factKey = { budget: 'spend', leads: 'leads', sales: 'sales', revenue: 'revenue' };

  const metric = (fact, plan, key) => {
    if (!plan) return { fact, plan: null };
    const expected = (plan * elapsed) / days;
    const forecast = elapsed ? (fact / elapsed) * days : 0;
    let status = fact >= expected * 0.95 ? 'ahead' : fact >= expected * 0.8 ? 'risk' : 'behind';
    if (key === 'budget') status = fact > expected * 1.1 ? 'over' : 'ok';
    if (elapsed < 5) status = 'early'; // oy boshida bir-ikki kunlik tebranish xulosa uchun yetarli emas
    return { fact, plan, pct: fact / plan, expected, expected_pct: elapsed / days, forecast, forecast_pct: forecast / plan, status };
  };

  const items = plans.map((pl) => {
    const proj = allProjects.find((p) => p.id === pl.project_id);
    if (!proj) return null;
    const fact = sumRows(rows.filter((r) => r.project_id === pl.project_id));
    return {
      project_id: pl.project_id, name: proj.name, color: proj.color,
      metrics: Object.fromEntries(Object.entries(factKey).map(([k, f]) => [k, metric(fact[f], pl[k], k)])),
    };
  }).filter(Boolean);

  const total = {};
  for (const [k] of Object.entries(factKey)) {
    const withPlan = items.filter((i) => i.metrics[k].plan);
    if (!withPlan.length) continue;
    total[k] = metric(withPlan.reduce((a, i) => a + i.metrics[k].fact, 0), withPlan.reduce((a, i) => a + i.metrics[k].plan, 0), k);
  }
  return { month, from, to, days, elapsed, items, total, hasPlans: items.length > 0 };
}

// ---------- Loyiha holati (7 kun) va byudjet taqsimoti ----------
export const PROJECT_STATUS = {
  unprofitable: 'Zarar',
  sales_issue: 'Sotuvda muammo',
  creative: 'Kreativ ishlamayapti',
  needs_leads: 'Lid kerak',
  scale: "O'stirish mumkin",
  good: 'Yaxshi',
  nodata: "Ma'lumot kam",
};
const STATUS_ORDER = ['unprofitable', 'sales_issue', 'creative', 'needs_leads', 'scale', 'good', 'nodata'];

export function weekStatus({ from, to }) {
  const s = summary({ from, to });
  const avg = s.totals;
  const plan = s.plan;
  const projects = s.byProject.map((p) => {
    if (p.spend === 0 && p.revenue === 0 && p.leads === 0) return { id: p.id, name: p.name, roas: null, status: 'nodata' };
    const flags = new Set();
    const salesIn = p.reported.sales > 0;
    const b = p.bench || {};
    if (salesIn && p.net_profit < 0) flags.add('unprofitable');
    if (salesIn && b.conv && p.conv != null && p.conv < b.conv * 0.6) flags.add('sales_issue');
    if ((p.unit_cost != null && b.unit_cost && p.unit_cost > b.unit_cost * 1.4) || (p.ctr != null && b.ctr && p.ctr < b.ctr * 0.7)) flags.add('creative');
    const pl = plan.items.find((i) => i.project_id === p.id)?.metrics.leads;
    if (p.kind !== 'auto' && ((pl?.plan && plan.elapsed >= 5 && ['behind', 'risk'].includes(pl.status)) || (p.growth.leads != null && p.growth.leads < -0.15))) flags.add('needs_leads');
    if (!flags.size && salesIn && avg.roas && p.roas >= avg.roas * 1.3 && p.net_profit > 0) flags.add('scale');
    return { id: p.id, name: p.name, roas: p.roas, status: STATUS_ORDER.find((k) => flags.has(k)) || 'good' };
  });
  return { from, to, projects, allocation: allocation(s.byProject, avg) };
}

// Byudjetni qayta taqsimlash: hozirgi ulush × samaradorlik (ROAS nisbati, 0.5–1.6 oralig'ida)
export function allocation(byProject, avg) {
  const withSpend = byProject.filter((p) => p.spend > 0);
  const total = withSpend.reduce((a, p) => a + p.spend, 0);
  if (!total) return [];
  const weight = (p) => (p.roas == null || !avg.roas ? p.spend * 0.8 : p.spend * Math.min(Math.max(p.roas / avg.roas, 0.5), 1.6));
  const wsum = withSpend.reduce((a, p) => a + weight(p), 0);
  return withSpend.map((p) => ({ id: p.id, name: p.name, change: weight(p) / wsum - p.spend / total }));
}

// ---------- PM uchun kunlik tahlil ----------
// Har bir loyiha bo'yicha: bugungi muammolar (fakt) va tayyor takliflar (PM tahrirlab direktorga yuboradi).
// who: kim bilan hal qilinadi — targetolog, sotuv bo'limi yoki direktor qarori
export const ADVICE_WHO = { target: 'Targetolog', sales: "Sotuv bo'limi", director: 'Direktor qarori' };

export function dailyAdvice(date, day, week) {
  const { rows } = loadRows(addDays(date, -6), date);
  const plan = day.plan;
  const remaining = plan.days - plan.elapsed;
  const rank = (k) => STATUS_ORDER.indexOf(k);
  const out = {};
  for (const p of day.byProject) {
    const b = p.bench || {};
    const r = week.projects.find((x) => x.id === p.id) || {};
    const row = rows.find((x) => x.project_id === p.id && x.date === date) || {};
    const lastWeek = rows.filter((x) => x.project_id === p.id);
    const newReported = lastWeek.some((x) => x.new_creatives != null);
    const noNew = newReported && !lastWeek.reduce((a, x) => a + (Number(x.new_creatives) || 0), 0);
    const base = { best: row.creative_best || null, worst: row.creative_worst || null };
    if (!p.reported.spend && !p.reported.leads && !p.reported.sales) { out[p.id] = { ...base, status: r.status || 'nodata', problems: [], proposals: [] }; continue; }
    const items = [];
    const add = (who, problem, fix, kind) => items.push({ who, problem, fix, kind });
    const auto = p.kind === 'auto';

    // Targetolog: lid (yoki start) narxi, CTR, lid sifati, lid rejasi
    const enough = auto ? (p.starts || p.clicks) >= 10 : p.leads >= 3;
    if (p.unit_cost != null && b.unit_cost && enough && p.unit_cost > b.unit_cost * 1.3) {
      add('target', `${p.unit_label} ko'tarildi: $${p.unit_cost.toFixed(2)} (odatda $${b.unit_cost.toFixed(2)}, +${Math.round((p.unit_cost / b.unit_cost - 1) * 100)}%)`,
        `Kreativlarni yangilash kerak${row.creative_worst ? ` — «${row.creative_worst}» ni to'xtatish` : ''}${noNew ? '; 7 kundan beri yangi kreativ chiqmagan' : ''}`, 'creative');
    } else if (p.ctr != null && b.ctr && p.impressions >= 1000 && p.ctr < b.ctr * 0.7) {
      add('target', `Reklamani kam bosishyapti: CTR ${pct(p.ctr)} (odatda ${pct(b.ctr)})`, 'Kreativ va sarlavhani almashtirish kerak', 'creative');
    }
    const badTop = p.reasons.bad[0];
    if (!auto && p.unqualified_share != null && p.leads >= 5 && p.unqualified_share >= 0.4) {
      add('target', `Lidlarning ${pct0(p.unqualified_share)} sifatsiz (${fmt(p.unqualified)} ta)${badTop ? ` · asosiy sabab — «${badTop.label}»` : ''}`,
        "Targetolog bilan auditoriyani qayta sozlash kerak — reklama noto'g'ri odamlarga ketyapti", 'creative');
    }
    const pl = plan.items.find((i) => i.project_id === p.id)?.metrics.leads;
    if (!auto && pl?.plan && plan.elapsed >= 5 && remaining > 0 && ['behind', 'risk'].includes(pl.status) && p.reported.leads) {
      const need = Math.ceil((pl.plan - pl.fact) / remaining);
      if (p.leads < need) add('target', `Lid rejadan orqada: kuniga ${fmt(need)} ta kerak, bugun ${fmt(p.leads)} ta`, "Byudjetni oshirish yoki yangi reklama kanalini qo'shish kerak", 'needs_leads');
    }

    // Sotuv: konversiya, potensial lidlar
    const salesIn = p.reported.sales > 0;
    const lostTop = p.reasons.lost[0];
    if (!auto && salesIn && p.leads >= 10 && p.sales === 0) {
      add('sales', `${fmt(p.leads)} ta lid, birorta ham sotuv yo'q`, "Sotuv bo'limi rahbari bilan gaplashish kerak: lidlarga qachon va qanday qo'ng'iroq qilinyapti", 'sales_issue');
    } else if (salesIn && p.conv != null && b.conv && (auto || p.leads >= 8) && p.conv < b.conv * 0.6) {
      add(auto ? 'director' : 'sales', `Konversiya past: ${pct(p.conv)} ${p.conv_label} (${b.conv_src} ${pct(b.conv)})${lostTop ? ` · ko'pchilik «${lostTop.label}»` : ''}`,
        auto ? "Bot ssenariysi va to'lov sahifasini tekshirish kerak" : "Sotuv bo'limi rahbari bilan gaplashish kerak: qo'ng'iroq tezligi va sotuv skriptini tekshirish", 'sales_issue');
    }
    if (!auto && (p.potential >= 5 || (p.potential >= 3 && p.potential_share >= 0.3))) {
      add('sales', `${fmt(p.potential)} ta potensial lid javob kutyapti`, "ROP ularga ertaga qayta qo'ng'iroq qilsin (follow-up)");
    }

    // Direktor qarori: 7 kunlik zarar yoki o'stirish imkoni
    if (r.status === 'unprofitable') {
      add('director', '7 kunda zararda ishlayapti', "Byudjetni qisqartirish yoki narx/taklifni o'zgartirish kerak");
    } else if (r.status === 'scale' && !items.length) {
      add('director', `7 kunda eng yaxshi natija (ROAS ${r.roas?.toFixed(2) ?? '—'})`, `Byudjetni +20% oshirishni taklif qilaman${row.creative_best ? ` — «${row.creative_best}» kreativiga` : ''}`);
    }

    const problems = items.map((i) => ({ who: i.who, text: i.problem }));
    if (row.note_target) problems.push({ who: 'target', text: `Targetolog: ${row.note_target}` });
    if (row.note_sales) problems.push({ who: 'sales', text: `ROP: ${row.note_sales}` });
    const proposals = items.map((i) => i.fix);
    if (!proposals.length) proposals.push('Hammasi joyida, shu tarzda davom etamiz');
    // Holat: 7 kunlik holat va bugungi muammolardan eng jiddiysi
    const status = [r.status || 'good', ...items.map((i) => i.kind).filter(Boolean)].sort((x, y) => rank(x) - rank(y))[0];
    out[p.id] = { ...base, status, problems, proposals };
  }
  return out;
}

// Excel to'g'ri ochishi uchun BOM bilan CSV
export function toCsv(projects, rows) {
  const cols = ['date', 'project', ...SUM_FIELDS, ...Object.keys(TEXT_FIELDS)];
  const esc = (v) => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [cols.join(',')];
  for (const r of [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.project_id - b.project_id))) {
    const pr = projects.find((p) => p.id === r.project_id);
    lines.push(cols.map((c) => esc(c === 'project' ? pr?.name : r[c])).join(','));
  }
  return `﻿${lines.join('\n')}\n`;
}
