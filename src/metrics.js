// Voronka hisob-kitoblari: xarajat → klik → bot start (reklama + organik) → lid → sotuv → tushum → LTV
import { getDb, getSetting, today, FIELDS, LOSS_REASONS, ROLES, PLATFORMS, CREATIVE_TYPES } from './db.js';

const SUM_FIELDS = Object.keys(FIELDS);

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

// Kunlik qatorlar + avtomatik hodisalar (bot, kanal, tashqi API) birlashtiriladi
export function loadRows(from, to, projectId = null) {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects WHERE active = 1 ORDER BY id').all()
    .filter((p) => !projectId || p.id === Number(projectId));
  const ids = projects.map((p) => p.id);
  if (!ids.length) return { projects, rows: [] };
  const ph = ids.map(() => '?').join(',');
  const daily = db.prepare(`SELECT * FROM daily WHERE date BETWEEN ? AND ? AND project_id IN (${ph})`).all(from, to, ...ids);
  const ev = db.prepare(`SELECT project_id, date, type, COUNT(*) AS n FROM events
                         WHERE date BETWEEN ? AND ? AND project_id IN (${ph}) GROUP BY project_id, date, type`).all(from, to, ...ids);
  const map = new Map();
  const key = (p, d) => `${p}|${d}`;
  for (const r of daily) map.set(key(r.project_id, r.date), { ...r });
  for (const e of ev) {
    const k = key(e.project_id, e.date);
    if (!map.has(k)) map.set(k, { project_id: e.project_id, date: e.date });
    map.get(k)[`auto_${e.type}`] = e.n;
  }
  const rows = [...map.values()].map(effective);
  return { projects, rows };
}

// Avtomatik hisoblangan ko'rsatkich bo'lsa — o'sha ishlatiladi, aks holda qo'lda kiritilgan
export function effective(r) {
  const out = { ...r };
  out.starts = r.auto_start > 0 ? r.auto_start : (r.bot_starts ?? null);
  out.starts_source = r.auto_start > 0 ? 'bot' : (r.bot_starts != null ? 'manual' : null);
  if (out.leads == null && r.auto_lead > 0) out.leads = r.auto_lead;
  if (out.sales == null && r.auto_sale > 0) out.sales = r.auto_sale;
  out.joins = (r.auto_join || 0) - (r.auto_leave || 0);
  return out;
}

export function sumRows(rows) {
  // reported — nechta kunda maydon kiritilgan (0 va "kiritilmagan" farqlanadi)
  const t = { days: new Set(), starts: 0, joins: 0, reported: {} };
  for (const f of SUM_FIELDS) { t[f] = 0; t.reported[f] = 0; }
  for (const r of rows) {
    t.days.add(r.date);
    for (const f of SUM_FIELDS) {
      t[f] += Number(r[f]) || 0;
      if (r[f] != null) t.reported[f] += 1;
    }
    t.starts += Number(r.starts) || 0;
    t.joins += Number(r.joins) || 0;
  }
  t.days = t.days.size;
  return derive(t);
}

const div = (a, b) => (b > 0 && a != null ? a / b : null);

export function derive(t, rate = usdRate()) {
  const spendUzs = t.spend * rate;
  const organic = t.starts > 0 && t.clicks > 0 ? Math.max(t.starts - t.clicks, 0) : null;
  const totalRevenue = t.revenue + t.repeat_revenue;
  return {
    ...t,
    rate,
    spend_uzs: spendUzs,
    organic,
    organic_share: organic != null ? div(organic, t.starts) : null,
    ctr: div(t.clicks, t.impressions),
    cpc: div(t.spend, t.clicks),
    cost_per_start: div(t.spend, t.starts),
    cpl: div(t.spend, t.leads),
    cac: div(t.spend, t.sales),
    click_to_start: div(t.starts, t.clicks),
    start_to_lead: div(t.leads, t.starts),
    lead_to_sale: div(t.sales, t.leads),
    start_to_sale: div(t.sales, t.starts),
    qualified_share: div(t.qualified, t.leads),
    avg_check: div(t.revenue, t.sales),
    ltv: div(totalRevenue, t.sales),
    roas: div(totalRevenue, spendUzs),
    roi: spendUzs > 0 ? (totalRevenue - spendUzs) / spendUzs : null,
    profit: totalRevenue - spendUzs,
    total_revenue: totalRevenue,
  };
}

function pctChange(cur, prev) {
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

export function reasonsFor(from, to, projectId) {
  const db = getDb();
  const rows = projectId
    ? db.prepare('SELECT reason, SUM(count) AS n FROM loss_reasons WHERE date BETWEEN ? AND ? AND project_id = ? GROUP BY reason').all(from, to, projectId)
    : db.prepare(`SELECT l.reason, SUM(l.count) AS n FROM loss_reasons l JOIN projects p ON p.id = l.project_id
                  WHERE p.active = 1 AND l.date BETWEEN ? AND ? GROUP BY l.reason`).all(from, to);
  return rows
    .map((r) => ({ reason: r.reason, label: LOSS_REASONS[r.reason] || r.reason, count: r.n }))
    .sort((a, b) => b.count - a.count);
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
    const ownConv = b.leads >= 30 && b.sales != null ? b.lead_to_sale : null;
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
  for (const k of Object.keys(totals)) {
    if (typeof totals[k] === 'number') delta[k] = pctChange(totals[k], prev[k]);
  }

  const byProject = projects.map((p) => {
    const cur = sumRows(rows.filter((r) => r.project_id === p.id));
    const old = sumRows(prevRows.filter((r) => r.project_id === p.id));
    return {
      id: p.id, name: p.name, slug: p.slug, kind: p.kind, color: p.color,
      ...cur,
      growth: { leads: pctChange(cur.leads, old.leads), sales: pctChange(cur.sales, old.sales), revenue: pctChange(cur.total_revenue, old.total_revenue) },
    };
  });

  const series = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = sumRows(rows.filter((r) => r.date === d));
    series.push({
      date: d, spend: day.spend, clicks: day.clicks, starts: day.starts, organic: day.organic ?? 0,
      leads: day.leads, sales: day.sales, revenue: day.total_revenue, lead_to_sale: day.lead_to_sale,
    });
  }

  const reasons = reasonsFor(from, to, projectId);
  const notes = rows
    .filter((r) => r.note_target || r.note_lead || r.note_sales || r.note_finance)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30)
    .map((r) => ({
      date: r.date,
      project: projects.find((p) => p.id === r.project_id)?.name,
      target: r.note_target, lead: r.note_lead, sales: r.note_sales, finance: r.note_finance,
    }));

  const plan = planProgress(to.slice(0, 7), projectId, to);
  const bench = benchmarks(from, byProject, plan, projectId);
  for (const p of byProject) p.bench = bench[p.id];
  return {
    from, to, prevFrom, prevTo, days: len,
    totals, prev, delta, byProject, series, reasons, notes, plan,
    insights: [...insights(totals, prev, byProject, reasons), ...planInsights(plan)],
  };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const fmt = (x) => Math.round(x).toLocaleString('ru-RU').replace(/,/g, ' ');

// AI siz ham ishlaydigan qoidaga asoslangan ogohlantirishlar
export function insights(t, prev, byProject, reasons) {
  const out = [];
  const push = (level, text) => out.push({ level, text });

  // Asosiy savol: lid ko'p, sotuv past
  for (const p of byProject) {
    const conv = p.bench?.conv;
    // Sotuv hali kiritilmagan bo'lsa (masalan, kun yarmida) — sotuvga oid xulosa chiqarilmaydi
    const salesIn = p.reported.sales > 0;
    if (salesIn && p.leads >= 20 && conv && p.lead_to_sale != null && p.sales > 0 && p.lead_to_sale < conv * 0.6) {
      push('critical', `${p.name}: lid ko'p, sotuv past — ${pct(p.lead_to_sale)} (${p.bench.conv_src} ${pct(conv)})`);
    }
    if (salesIn && p.leads >= 20 && p.sales === 0) {
      push('critical', `${p.name}: ${fmt(p.leads)} lid, birorta ham sotuv yo'q`);
    }
    if (salesIn && p.spend > 0 && p.roas != null && p.roas < 1) {
      push('warning', `${p.name}: zarar — ROAS ${p.roas.toFixed(2)}`);
    }
    if (p.qualified_share != null && p.leads >= 20 && p.qualified_share < 0.3) {
      push('warning', `${p.name}: sifatli lid atigi ${pct(p.qualified_share)}`);
    }
    if (salesIn && p.growth.leads != null && p.growth.leads > 0.3 && (p.growth.sales ?? 0) <= 0) {
      push('warning', `${p.name}: lid +${pct(p.growth.leads)}, sotuv o'smadi`);
    }
  }

  if (prev.cpl && t.cpl && t.cpl > prev.cpl * 1.25) {
    push('warning', `Lid narxi oshdi: $${prev.cpl.toFixed(2)} → $${t.cpl.toFixed(2)}`);
  }
  if (t.organic_share != null && t.organic_share > 0.5) {
    push('good', `Organik oqim ${pct(t.organic_share)} (${fmt(t.organic)} start)`);
  }
  if (reasons.length) {
    const total = reasons.reduce((s, r) => s + r.count, 0);
    const top = reasons[0];
    push('info', `Asosiy rad sababi: «${top.label}» — ${pct(top.count / total)}`);
  }
  const best = [...byProject].filter((p) => p.roas != null && p.spend > 0).sort((a, b) => b.roas - a.roas)[0];
  if (best && byProject.length > 1) {
    push('good', `Eng samarali: ${best.name} — ROAS ${best.roas.toFixed(2)}`);
  }
  return out;
}

// Kim bugun hisobot kiritmagan — rol bo'yicha nazorat ro'yxati
export function missingReport(date) {
  const db = getDb();
  const projects = db.prepare('SELECT id, name FROM projects WHERE active = 1 ORDER BY id').all();
  const roleFields = {};
  for (const [f, def] of Object.entries(FIELDS)) {
    if (f === 'bot_starts') continue; // bot avtomatik sanashi mumkin
    (roleFields[def.role] ||= []).push(f);
  }
  const out = [];
  for (const p of projects) {
    const row = db.prepare('SELECT * FROM daily WHERE project_id = ? AND date = ?').get(p.id, date) || {};
    for (const [role, fields] of Object.entries(roleFields)) {
      const filled = fields.some((f) => row[f] != null);
      out.push({ project_id: p.id, project: p.name, role, role_label: ROLES[role], filled });
    }
  }
  return out;
}

// ---------- Oylik reja (KPI) ----------
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
  const { projects, rows } = elapsed ? loadRows(from, to, projectId) : { projects: [], rows: [] };
  const allProjects = getDb().prepare('SELECT * FROM projects WHERE active = 1 ORDER BY id').all();
  const factKey = { budget: 'spend', leads: 'leads', sales: 'sales', revenue: 'total_revenue' };

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
  for (const [k, f] of Object.entries(factKey)) {
    const withPlan = items.filter((i) => i.metrics[k].plan);
    if (!withPlan.length) continue;
    const fact = withPlan.reduce((a, i) => a + i.metrics[k].fact, 0);
    total[k] = metric(fact, withPlan.reduce((a, i) => a + i.metrics[k].plan, 0), k);
  }
  return { month, from, to, days, elapsed, items, total, hasPlans: items.length > 0, projectsWithoutPlan: projects.length - items.length };
}

function planInsights(plan) {
  const out = [];
  if (!plan.hasPlans || plan.elapsed < 3) return out;
  for (const i of plan.items) {
    const s = i.metrics.sales;
    if (s.plan && s.status === 'behind') {
      out.push({ level: 'warning', text: `${i.name}: sotuv rejasi ${pct(s.pct)} (kerak ${pct(s.expected_pct)})` });
    }
    const b = i.metrics.budget;
    if (b.plan && b.status === 'over') {
      out.push({ level: 'warning', text: `${i.name}: byudjet tez ketyapti — prognoz $${fmt(b.forecast)} / $${fmt(b.plan)}` });
    }
  }
  const t = plan.total.revenue;
  if (t?.plan && t.status === 'ahead') out.push({ level: 'good', text: `Tushum rejadan oldinda: ${pct(t.pct)}` });
  return out;
}

// ---------- Reklama postlari ----------
export function campaignStats({ from, to, projectId = null }) {
  const db = getDb();
  const list = db.prepare(`SELECT c.*, p.name AS project_name, p.slug AS project_slug, p.color AS project_color FROM campaigns c
                           JOIN projects p ON p.id = c.project_id WHERE c.date BETWEEN ? AND ? ORDER BY c.date DESC, c.id DESC`).all(from, to)
    .filter((c) => !projectId || c.project_id === Number(projectId));
  const ev = db.prepare(`SELECT project_id, source, type, COUNT(*) AS n FROM events WHERE source IS NOT NULL
                         GROUP BY project_id, source, type`).all();
  const auto = (c, type) => ev.find((e) => e.project_id === c.project_id && e.source === c.tag && e.type === type)?.n || 0;
  const rows = list.map((c) => {
    const a = { start: auto(c, 'start'), lead: auto(c, 'lead'), sale: auto(c, 'sale') };
    const starts = a.start > 0 ? a.start : c.starts;
    const leads = a.lead > 0 ? a.lead : c.leads;
    const sales = a.sale > 0 ? a.sale : c.sales;
    const organic = starts != null && c.clicks ? Math.max(starts - c.clicks, 0) : null;
    return {
      ...c, platform_label: PLATFORMS[c.platform] || c.platform, creative_label: CREATIVE_TYPES[c.creative_type] || null,
      starts, leads, sales, organic, auto: a,
      ctr: div(c.clicks, c.impressions), cpc: div(c.spend, c.clicks), cost_per_start: div(c.spend, starts), cpl: div(c.spend, leads), cac: div(c.spend, sales),
      start_to_sale: div(sales, starts),
    };
  });
  const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const total = { count: rows.length, spend: sum('spend'), impressions: sum('impressions'), clicks: sum('clicks'), starts: sum('starts'), leads: sum('leads'), sales: sum('sales') };
  Object.assign(total, { ctr: div(total.clicks, total.impressions), cpc: div(total.spend, total.clicks), cost_per_start: div(total.spend, total.starts), cpl: div(total.spend, total.leads), cac: div(total.spend, total.sales) });
  // Kreativ o'z loyihasining o'rtachasi bilan solishtiriladi (loyihalar narxi har xil)
  const projTotal = {};
  for (const r of rows) {
    const t = (projTotal[r.project_id] ||= { impressions: 0, clicks: 0, spend: 0, starts: 0, leads: 0 });
    for (const k of Object.keys(t)) t[k] += Number(r[k]) || 0;
  }
  for (const t of Object.values(projTotal)) Object.assign(t, { ctr: div(t.clicks, t.impressions), cost_per_start: div(t.spend, t.starts), cpl: div(t.spend, t.leads) });
  for (const r of rows) Object.assign(r, creativeVerdict(r, projTotal[r.project_id]));
  const byPlatform = Object.entries(PLATFORMS).map(([k, label]) => {
    const rs = rows.filter((r) => r.platform === k);
    const spend = rs.reduce((a, r) => a + (r.spend || 0), 0);
    const starts = rs.reduce((a, r) => a + (r.starts || 0), 0);
    const leads = rs.reduce((a, r) => a + (r.leads || 0), 0);
    return { platform: k, label, count: rs.length, spend, starts, leads, cost_per_start: div(spend, starts), cpl: div(spend, leads) };
  }).filter((p) => p.count);
  const judged = rows.filter((r) => r.verdict === 'good' || r.verdict === 'bad');
  return {
    rows, total, byPlatform,
    best: [...rows].filter((r) => r.verdict === 'good').sort((a, b) => (a.cpl ?? Infinity) - (b.cpl ?? Infinity)).slice(0, 5),
    worst: [...rows].filter((r) => r.verdict === 'bad').sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 5),
    judgedCount: judged.length,
  };
}

// Kreativ bahosi: davrdagi o'rtacha CTR / lid narxi / start narxiga nisbatan. Kam pul sarflangan bo'lsa — baho berilmaydi
export function creativeVerdict(r, avg) {
  if (!(r.spend >= 10)) return { verdict: 'new', verdict_label: 'Yangi', verdict_short: "ma'lumot kam", verdict_reason: "$10 dan kam sarflangan" };
  const bad = []; // [qisqa, to'liq]
  if (r.ctr != null && avg.ctr && r.ctr < avg.ctr * 0.65) bad.push([`CTR ${pct(r.ctr)}`, `CTR ${pct(r.ctr)} (o'rtacha ${pct(avg.ctr)})`]);
  if (r.cpl != null && avg.cpl && r.cpl > avg.cpl * 1.5) bad.push([`lid $${r.cpl.toFixed(2)}`, `lid narxi $${r.cpl.toFixed(2)} (o'rtacha $${avg.cpl.toFixed(2)})`]);
  if (r.leads === 0 && r.spend >= 20) bad.push(["lid yo'q", "birorta ham lid yo'q"]);
  if (r.cost_per_start != null && avg.cost_per_start && r.cost_per_start > avg.cost_per_start * 1.6) bad.push([`start $${r.cost_per_start.toFixed(2)}`, `1 start $${r.cost_per_start.toFixed(3)} (o'rtacha $${avg.cost_per_start.toFixed(3)})`]);
  if (bad.length) return { verdict: 'bad', verdict_label: 'Yomon', verdict_short: bad[0][0], verdict_reason: bad.map((b) => b[1]).join(', ') };
  const good = [];
  if (r.cpl != null && avg.cpl && r.cpl < avg.cpl * 0.8) good.push([`lid $${r.cpl.toFixed(2)}`, `lid narxi $${r.cpl.toFixed(2)} (o'rtacha $${avg.cpl.toFixed(2)})`]);
  if (r.ctr != null && avg.ctr && r.ctr > avg.ctr * 1.25) good.push([`CTR ${pct(r.ctr)}`, `CTR ${pct(r.ctr)} (o'rtacha ${pct(avg.ctr)})`]);
  if (good.length) return { verdict: 'good', verdict_label: 'Yaxshi', verdict_short: good[0][0], verdict_reason: good.map((g) => g[1]).join(', ') };
  return { verdict: 'ok', verdict_label: "O'rtacha", verdict_short: "o'rtacha", verdict_reason: "o'rtacha natija" };
}

// ---------- Hisobot intizomi ----------
// Har bir rol so'nggi N kunda o'z maydonlarini nechta loyiha-kun uchun kiritgan
export function discipline(days = 14, asOf = today()) {
  const from = addDays(asOf, -(days - 1));
  const { projects, rows } = loadRows(from, asOf);
  const users = getDb().prepare('SELECT id, name, role FROM users WHERE active = 1').all();
  const roleFields = {};
  for (const [f, def] of Object.entries(FIELDS)) if (f !== 'bot_starts') (roleFields[def.role] ||= []).push(f);
  return Object.entries(roleFields).map(([role, fields]) => {
    const dayList = [];
    let filled = 0, total = 0;
    for (let d = from; d <= asOf; d = addDays(d, 1)) {
      const dayRows = rows.filter((r) => r.date === d);
      const n = projects.filter((p) => dayRows.some((r) => r.project_id === p.id && fields.some((f) => r[f] != null))).length;
      dayList.push({ date: d, filled: n, total: projects.length });
      if (d < asOf) { filled += n; total += projects.length; } // bugun hali tugamagan
    }
    return { role, label: ROLES[role], users: users.filter((u) => u.role === role).map((u) => u.name), pct: total ? filled / total : null, days: dayList };
  });
}

// Excel to'g'ri ochishi uchun BOM bilan CSV
export function toCsv(projects, rows) {
  const cols = ['date', 'project', 'spend', 'impressions', 'clicks', 'starts', 'starts_source', 'joins', 'leads', 'qualified', 'sales', 'revenue', 'payments', 'repeat_sales', 'repeat_revenue', 'note_target', 'note_lead', 'note_sales', 'note_finance'];
  const esc = (v) => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [cols.join(',')];
  for (const r of [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.project_id - b.project_id))) {
    const pr = projects.find((p) => p.id === r.project_id);
    lines.push(cols.map((c) => esc(c === 'project' ? pr?.name : r[c])).join(','));
  }
  return `\ufeff${lines.join('\n')}`;
}

// ---------- Direktor uchun: loyiha holati, tavsiyalar, byudjet taqsimoti ----------
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

// Asosni barqaror qilish uchun odatda so'nggi 7 kun olinadi
export function recommendations({ from, to }) {
  const s = summary({ from, to });
  const camps = campaignStats({ from, to });
  const avg = s.totals;
  const plan = s.plan;
  const remaining = plan.days - plan.elapsed;
  const projects = s.byProject.map((p) => {
    const actions = [];
    const flags = new Set();
    const salesIn = p.reported.sales > 0;
    const badCreatives = camps.rows.filter((c) => c.project_id === p.id && c.verdict === 'bad');
    if (p.spend === 0 && p.leads === 0) {
      return { ...pick(p), status: 'nodata', status_label: PROJECT_STATUS.nodata, actions: [], badCreatives: [] };
    }
    if (salesIn && p.spend > 0 && p.roas != null && p.roas < 1) {
      flags.add('unprofitable');
      actions.push({ type: 'budget_down', owner: 'admin', text: 'Byudjetni qisqartirish', detail: `ROAS ${p.roas.toFixed(2)} — reklama o'zini oqlamayapti` });
    }
    const bench = p.bench || {};
    if (salesIn && p.leads >= 15 && bench.conv && p.lead_to_sale != null && p.lead_to_sale < bench.conv * 0.6) {
      flags.add('sales_issue');
      const top = reasonsFor(from, to, p.id)[0];
      actions.push({ type: 'sales', owner: 'sales', text: `Sotuvni ko'tarish: ${pct(p.lead_to_sale)} (${bench.conv_src} ${pct(bench.conv)})`, items: top ? [top.label] : [], detail: `Lid→sotuv past.${top ? ` Asosiy sabab — «${top.label}».` : ''} Qo'ng'iroq tezligi va skriptni tekshirish.` });
    }
    const ctr = p.ctr, cplHigh = p.cpl != null && bench.cpl && p.cpl > bench.cpl * 1.4;
    if (badCreatives.length || cplHigh || (ctr != null && bench.ctr && ctr < bench.ctr * 0.7)) {
      flags.add('creative');
      actions.push(badCreatives.length
        ? { type: 'creative', owner: 'target', text: `${badCreatives.length} ta kreativni almashtirish`, items: badCreatives.slice(0, 3).map((c) => c.name), detail: badCreatives.map((c) => `${c.name}: ${c.verdict_reason}`).join('; ') }
        : { type: 'creative', owner: 'target', text: `Yangi kreativ sinash: lid $${(p.cpl || 0).toFixed(2)}`, detail: cplHigh ? `Lid narxi odatdagidan ${pct(p.cpl / bench.cpl - 1)} qimmat` : `CTR ${pct(ctr)} (odatda ${pct(bench.ctr)})` });
    }
    const pl = plan.items.find((i) => i.project_id === p.id)?.metrics.leads;
    if (pl?.plan && plan.elapsed >= 5 && ['behind', 'risk'].includes(pl.status) && remaining > 0) {
      flags.add('needs_leads');
      const need = Math.ceil((pl.plan - pl.fact) / remaining);
      const now = Math.round(pl.fact / plan.elapsed);
      actions.push({ type: 'leads', owner: 'target', text: `Kuniga ${fmt(need)} lid kerak (hozir ${fmt(now)})`, detail: `Oylik lid rejasi ${pct(pl.pct)} bajarilgan` });
    } else if (p.growth.leads != null && p.growth.leads < -0.15) {
      flags.add('needs_leads');
      actions.push({ type: 'leads', owner: 'target', text: `Lid ${pct(-p.growth.leads)} kamaydi — trafikni tiklash`, detail: "O'tgan 7 kunga nisbatan" });
    }
    if (!flags.has('unprofitable') && !flags.has('creative') && salesIn && avg.roas && p.roas >= avg.roas * 1.3 && (!bench.conv || (p.lead_to_sale ?? 0) >= bench.conv * 0.9)) {
      flags.add('scale');
      actions.push({ type: 'budget_up', owner: 'admin', text: 'Byudjetni +20–30% oshirish', detail: `ROAS ${p.roas.toFixed(2)} (o'rtacha ${avg.roas.toFixed(2)}), lid narxi $${(p.cpl || 0).toFixed(2)}` });
    }
    const status = STATUS_ORDER.find((k) => flags.has(k)) || 'good';
    return { ...pick(p), status, status_label: PROJECT_STATUS[status], actions, badCreatives: badCreatives.map((c) => ({ id: c.id, name: c.name, reason: c.verdict_short })) };
  });
  return { from, to, totals: pick(avg), projects, allocation: allocation(s.byProject, avg, s.days), worstCreatives: camps.worst, bestCreatives: camps.best };
}

function pick(p) {
  const keys = ['id', 'name', 'color', 'spend', 'impressions', 'clicks', 'starts', 'organic', 'leads', 'qualified', 'sales', 'total_revenue', 'ctr', 'cpc', 'cost_per_start', 'cpl', 'cac', 'lead_to_sale', 'start_to_lead', 'roas', 'roi', 'growth'];
  return Object.fromEntries(keys.filter((k) => k in p).map((k) => [k, p[k]]));
}

// Byudjetni qayta taqsimlash taklifi: hozirgi ulush × samaradorlik (ROAS nisbati, 0.5–1.6 oralig'ida)
export function allocation(byProject, avg, days) {
  const withSpend = byProject.filter((p) => p.spend > 0);
  const total = withSpend.reduce((a, p) => a + p.spend, 0);
  if (!total) return [];
  const weight = (p) => {
    if (p.roas == null || !avg.roas) return p.spend * 0.8;
    return p.spend * Math.min(Math.max(p.roas / avg.roas, 0.5), 1.6);
  };
  const wsum = withSpend.reduce((a, p) => a + weight(p), 0);
  const perDay = total / Math.max(days, 1);
  return withSpend.map((p) => {
    const share = p.spend / total;
    const suggested = weight(p) / wsum;
    return {
      id: p.id, name: p.name, color: p.color, spend: p.spend, roas: p.roas, cpl: p.cpl,
      share, suggested, change: suggested - share,
      daily_now: share * perDay, daily_suggested: suggested * perDay,
    };
  }).sort((a, b) => b.change - a.change);
}
