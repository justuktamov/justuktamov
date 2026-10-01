// Voronka hisob-kitoblari: xarajat → klik → bot start (reklama + organik) → lid → sotuv → tushum → LTV
import { getDb, getSetting, today, FIELDS, LOSS_REASONS, ROLES, PLATFORMS } from './db.js';

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

function reasonsFor(from, to, projectId) {
  const db = getDb();
  const rows = projectId
    ? db.prepare('SELECT reason, SUM(count) AS n FROM loss_reasons WHERE date BETWEEN ? AND ? AND project_id = ? GROUP BY reason').all(from, to, projectId)
    : db.prepare(`SELECT l.reason, SUM(l.count) AS n FROM loss_reasons l JOIN projects p ON p.id = l.project_id
                  WHERE p.active = 1 AND l.date BETWEEN ? AND ? GROUP BY l.reason`).all(from, to);
  return rows
    .map((r) => ({ reason: r.reason, label: LOSS_REASONS[r.reason] || r.reason, count: r.n }))
    .sort((a, b) => b.count - a.count);
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
  const avgConv = t.lead_to_sale;
  for (const p of byProject) {
    // Sotuv hali kiritilmagan bo'lsa (masalan, kun yarmida) — sotuvga oid xulosa chiqarilmaydi
    const salesIn = p.reported.sales > 0;
    if (salesIn && p.leads >= 20 && avgConv && p.lead_to_sale != null && p.sales > 0 && p.lead_to_sale < avgConv * 0.6) {
      push('critical', `${p.name}: lid ko'p (${fmt(p.leads)}), lekin lid→sotuv konversiyasi ${pct(p.lead_to_sale)} — umumiy o'rtachadan (${pct(avgConv)}) ancha past. Sotuv skripti va lid sifatini tekshiring.`);
    }
    if (salesIn && p.leads >= 20 && p.sales === 0) {
      push('critical', `${p.name}: ${fmt(p.leads)} ta lid bor, lekin birorta ham sotuv bo'lmagan.`);
    }
    if (salesIn && p.spend > 0 && p.roas != null && p.roas < 1) {
      push('warning', `${p.name}: reklama o'zini oqlamayapti — ROAS ${p.roas.toFixed(2)} (reklamaga sarflangan har 1 so'mga ${p.roas.toFixed(2)} so'm tushum).`);
    }
    if (p.qualified_share != null && p.leads >= 20 && p.qualified_share < 0.3) {
      push('warning', `${p.name}: sifatli lidlar ulushi ${pct(p.qualified_share)} — targeting auditoriyasini qayta ko'rib chiqing.`);
    }
    if (salesIn && p.growth.leads != null && p.growth.leads > 0.3 && (p.growth.sales ?? 0) <= 0) {
      push('warning', `${p.name}: lidlar ${pct(p.growth.leads)} o'sdi, sotuvlar esa o'smadi — sotuv bo'limi yuklamani ko'tara olyaptimi?`);
    }
  }

  if (prev.cpl && t.cpl && t.cpl > prev.cpl * 1.25) {
    push('warning', `Lid narxi (CPL) o'tgan davrga nisbatan ${pct(t.cpl / prev.cpl - 1)} oshdi: $${prev.cpl.toFixed(2)} → $${t.cpl.toFixed(2)}.`);
  }
  if (t.organic_share != null && t.organic_share > 0.5) {
    push('good', `Bot startlarining ${pct(t.organic_share)} qismi organik (${fmt(t.organic)} ta) — kontent va tavsiyalar yaxshi ishlayapti.`);
  }
  if (reasons.length) {
    const total = reasons.reduce((s, r) => s + r.count, 0);
    const top = reasons[0];
    push('info', `Sotib olmaslikning asosiy sababi: «${top.label}» — ${pct(top.count / total)} (${fmt(top.count)} ta holat).`);
  }
  const best = [...byProject].filter((p) => p.roas != null && p.spend > 0).sort((a, b) => b.roas - a.roas)[0];
  if (best && byProject.length > 1) {
    push('good', `Eng samarali loyiha: ${best.name} — ROAS ${best.roas.toFixed(2)}, lid→sotuv ${best.lead_to_sale != null ? pct(best.lead_to_sale) : '—'}.`);
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
      out.push({ level: 'warning', text: `${i.name}: oylik sotuv rejasi ${pct(s.pct)} bajarildi (shu kungacha ${pct(s.expected_pct)} kutilgan). Prognoz: ${fmt(s.forecast)} / ${fmt(s.plan)}.` });
    }
    const b = i.metrics.budget;
    if (b.plan && b.status === 'over') {
      out.push({ level: 'warning', text: `${i.name}: reklama byudjeti rejadan tez sarflanyapti — $${fmt(b.fact)} / $${fmt(b.plan)} (${pct(b.pct)}), oy oxirigacha $${fmt(b.forecast)} ketadi.` });
    }
  }
  const t = plan.total.revenue;
  if (t?.plan && t.status === 'ahead') out.push({ level: 'good', text: `Tushum rejasi bo'yicha oldindamiz: ${pct(t.pct)} bajarildi, prognoz ${pct(t.forecast_pct)}.` });
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
      ...c, platform_label: PLATFORMS[c.platform] || c.platform,
      starts, leads, sales, organic, auto: a,
      cpc: div(c.spend, c.clicks), cost_per_start: div(c.spend, starts), cpl: div(c.spend, leads), cac: div(c.spend, sales),
      start_to_sale: div(sales, starts),
    };
  });
  const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const total = { count: rows.length, spend: sum('spend'), clicks: sum('clicks'), starts: sum('starts'), leads: sum('leads'), sales: sum('sales') };
  Object.assign(total, { cpc: div(total.spend, total.clicks), cost_per_start: div(total.spend, total.starts), cpl: div(total.spend, total.leads), cac: div(total.spend, total.sales) });
  const byPlatform = Object.entries(PLATFORMS).map(([k, label]) => {
    const rs = rows.filter((r) => r.platform === k);
    const spend = rs.reduce((a, r) => a + (r.spend || 0), 0);
    const starts = rs.reduce((a, r) => a + (r.starts || 0), 0);
    const leads = rs.reduce((a, r) => a + (r.leads || 0), 0);
    return { platform: k, label, count: rs.length, spend, starts, leads, cost_per_start: div(spend, starts), cpl: div(spend, leads) };
  }).filter((p) => p.count);
  return { rows, total, byPlatform };
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
