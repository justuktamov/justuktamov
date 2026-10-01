// Voronka hisob-kitoblari: xarajat → klik → bot start (reklama + organik) → lid → sotuv → tushum → LTV
import { getDb, getSetting, FIELDS, LOSS_REASONS, ROLES } from './db.js';

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

  return {
    from, to, prevFrom, prevTo, days: len,
    totals, prev, delta, byProject, series, reasons, notes,
    insights: insights(totals, prev, byProject, reasons),
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
