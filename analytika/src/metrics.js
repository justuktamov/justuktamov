// Hisob-kitoblar: xarajat → klik → lid (sifatli / potensial / sifatsiz) → sotuv → tushum
import { getDb, getSetting, today, FIELDS, TEXT_FIELDS } from './db.js';

const SUM_FIELDS = Object.keys(FIELDS);
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const fmt = (x) => Math.round(x).toLocaleString('ru-RU').replace(/,/g, ' ');
const div = (a, b) => (b > 0 && a != null ? a / b : null);

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
    total_revenue: t.revenue,
    spend_uzs: spendUzs,
    ctr: div(t.clicks, t.impressions),
    cpc: div(t.spend, t.clicks),
    cpl: div(t.spend, t.leads),
    cac: div(t.spend, t.sales),
    lead_to_sale: div(t.sales, t.leads),
    qualified_share: div(t.qualified, t.leads),
    potential_share: div(t.potential, t.leads),
    unqualified_share: div(t.unqualified, t.leads),
    avg_check: div(t.revenue, t.sales),
    roas: div(t.revenue, spendUzs),
  };
}

function pctChange(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

// Har bir loyiha o'z me'yori bilan solishtiriladi: loyihalar har xil biznes
// (masalan, STARPAY do'kon — konversiyasi kurslarnikidan ancha yuqori).
// Konversiya me'yori: oylik reja (sotuv/lid), bo'lmasa — o'zining oldingi 4 haftasi.
// Lid narxi va CTR me'yori: o'zining oldingi 4 haftasi.
function benchmarks(from, byProject, plan, projectId) {
  const baseTo = addDays(from, -1);
  const { rows } = loadRows(addDays(baseTo, -27), baseTo, projectId);
  const out = {};
  for (const p of byProject) {
    const b = sumRows(rows.filter((r) => r.project_id === p.id));
    const m = plan.items.find((i) => i.project_id === p.id)?.metrics;
    const planConv = m?.leads?.plan && m?.sales?.plan ? m.sales.plan / m.leads.plan : null;
    const ownConv = b.leads >= 30 ? b.lead_to_sale : null;
    out[p.id] = {
      conv: planConv ?? ownConv,
      conv_src: planConv != null ? 'reja' : ownConv != null ? 'odatda' : null,
      cpl: b.leads >= 10 ? b.cpl : null,
      ctr: b.impressions >= 1000 ? b.ctr : null,
    };
  }
  return out;
}

export function summary({ from, to, projectId = null }) {
  const len = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  const { projects, rows } = loadRows(from, to, projectId);
  const { rows: prevRows } = loadRows(prevFrom, prevTo, projectId);

  const totals = sumRows(rows);
  const prev = sumRows(prevRows);
  const delta = {};
  for (const k of Object.keys(totals)) if (typeof totals[k] === 'number') delta[k] = pctChange(totals[k], prev[k]);

  const byProject = projects.map((p) => {
    const cur = sumRows(rows.filter((r) => r.project_id === p.id));
    const old = sumRows(prevRows.filter((r) => r.project_id === p.id));
    return { id: p.id, name: p.name, color: p.color, ...cur, growth: { leads: pctChange(cur.leads, old.leads), sales: pctChange(cur.sales, old.sales) } };
  });

  const series = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = sumRows(rows.filter((r) => r.date === d));
    series.push({ date: d, spend: day.spend, clicks: day.clicks, leads: day.leads, qualified: day.qualified, sales: day.sales, revenue: day.revenue, cpl: day.cpl });
  }

  // Targetolog va ROP izohlari, kreativlar — kunlar bo'yicha
  const notes = rows
    .filter((r) => Object.keys(TEXT_FIELDS).some((f) => r[f]))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 40)
    .map((r) => ({ date: r.date, project: projects.find((p) => p.id === r.project_id)?.name, ...Object.fromEntries(Object.keys(TEXT_FIELDS).map((f) => [f, r[f] || null])) }));

  const plan = planProgress(to.slice(0, 7), projectId, to);
  const bench = benchmarks(from, byProject, plan, projectId);
  for (const p of byProject) p.bench = bench[p.id];
  return { from, to, prevFrom, prevTo, days: len, totals, prev, delta, byProject, series, notes, plan };
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
    if (p.spend === 0 && p.leads === 0) return { id: p.id, name: p.name, roas: null, status: 'nodata' };
    const flags = new Set();
    const salesIn = p.reported.sales > 0;
    const b = p.bench || {};
    if (salesIn && p.spend > 0 && p.roas != null && p.roas < 1) flags.add('unprofitable');
    if (salesIn && p.leads >= 15 && b.conv && p.lead_to_sale != null && p.lead_to_sale < b.conv * 0.6) flags.add('sales_issue');
    if ((p.cpl != null && b.cpl && p.cpl > b.cpl * 1.4) || (p.ctr != null && b.ctr && p.ctr < b.ctr * 0.7)) flags.add('creative');
    const pl = plan.items.find((i) => i.project_id === p.id)?.metrics.leads;
    if ((pl?.plan && plan.elapsed >= 5 && ['behind', 'risk'].includes(pl.status)) || (p.growth.leads != null && p.growth.leads < -0.15)) flags.add('needs_leads');
    if (!flags.has('unprofitable') && !flags.has('creative') && salesIn && avg.roas && p.roas >= avg.roas * 1.3 && (!b.conv || (p.lead_to_sale ?? 0) >= b.conv * 0.9)) flags.add('scale');
    return { id: p.id, name: p.name, roas: p.roas, status: STATUS_ORDER.find((k) => flags.has(k)) || 'good' };
  });
  return { from, to, projects, allocation: allocation(s.byProject, avg) };
}

// Byudjetni qayta taqsimlash: hozirgi ulush × samaradorlik (ROAS nisbati, 0.5–1.6 oralig'ida).
// ROAS — loyihalar o'rtasida solishtirsa bo'ladigan yagona ko'rsatkich (pul qaytishi)
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
    if (!p.reported.spend && !p.reported.leads) { out[p.id] = { ...base, status: r.status || 'nodata', problems: [], proposals: [] }; continue; }
    const items = [];
    const add = (who, problem, fix, kind) => items.push({ who, problem, fix, kind });

    // Targetolog: lid narxi, CTR, lid sifati, lid rejasi
    if (p.cpl != null && b.cpl && p.leads >= 3 && p.cpl > b.cpl * 1.3) {
      add('target', `Lid narxi ko'tarildi: $${p.cpl.toFixed(2)} (odatda $${b.cpl.toFixed(2)}, +${Math.round((p.cpl / b.cpl - 1) * 100)}%)`,
        `Kreativlarni yangilash kerak${row.creative_worst ? ` — «${row.creative_worst}» ni to'xtatish` : ''}${noNew ? '; 7 kundan beri yangi kreativ chiqmagan' : ''}`, 'creative');
    } else if (p.ctr != null && b.ctr && p.impressions >= 1000 && p.ctr < b.ctr * 0.7) {
      add('target', `Reklamani kam bosishyapti: CTR ${pct(p.ctr)} (odatda ${pct(b.ctr)})`, 'Kreativ va sarlavhani almashtirish kerak', 'creative');
    }
    if (p.unqualified_share != null && p.leads >= 5 && p.unqualified_share >= 0.4) {
      add('target', `Lidlarning ${Math.round(p.unqualified_share * 100)}% sifatsiz (${fmt(p.unqualified)} ta)`,
        "Targetolog bilan auditoriyani qayta sozlash kerak — reklama noto'g'ri odamlarga ketyapti", 'creative');
    }
    const pl = plan.items.find((i) => i.project_id === p.id)?.metrics.leads;
    if (pl?.plan && plan.elapsed >= 5 && remaining > 0 && ['behind', 'risk'].includes(pl.status) && p.reported.leads) {
      const need = Math.ceil((pl.plan - pl.fact) / remaining);
      if (p.leads < need) add('target', `Lid rejadan orqada: kuniga ${fmt(need)} ta kerak, bugun ${fmt(p.leads)} ta`, "Byudjetni oshirish yoki yangi reklama kanalini qo'shish kerak", 'needs_leads');
    }

    // Sotuv bo'limi: konversiya, potensial lidlar
    const salesIn = p.reported.sales > 0;
    if (salesIn && p.leads >= 10 && p.sales === 0) {
      add('sales', `${fmt(p.leads)} ta lid, birorta ham sotuv yo'q`, "Sotuv bo'limi rahbari bilan gaplashish kerak: lidlarga qachon va qanday qo'ng'iroq qilinyapti", 'sales_issue');
    } else if (salesIn && p.leads >= 8 && b.conv && p.lead_to_sale != null && p.lead_to_sale < b.conv * 0.6) {
      add('sales', `Lid ko'p, sotuv kam: ${pct(p.lead_to_sale)} (${b.conv_src} ${pct(b.conv)})`,
        "Sotuv bo'limi rahbari bilan gaplashish kerak: qo'ng'iroq tezligi va sotuv skriptini tekshirish", 'sales_issue');
    }
    if (p.potential >= 5 || (p.potential >= 3 && p.potential_share >= 0.3)) {
      add('sales', `${fmt(p.potential)} ta potensial lid javob kutyapti`, "ROP ularga ertaga qayta qo'ng'iroq qilsin (follow-up)");
    }

    // Direktor qarori: 7 kunlik zarar yoki o'stirish imkoni
    if (r.status === 'unprofitable') {
      add('director', `7 kunda reklama o'zini oqlamayapti (ROAS ${r.roas?.toFixed(2) ?? '—'})`, "Byudjetni qisqartirish yoki taklif/narxni o'zgartirish kerak");
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
