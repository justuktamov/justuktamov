// Ichki qulayliklar: vazifalar, xarajatlar va sof foyda, signallar, haftalik hisobot, CSV import
import { getDb, FIELDS, NOTE_FIELDS, EXPENSE_CATEGORIES, TASK_STATUS, today } from './db.js';
import { summary, monthBounds, addDays, loadRows, sumRows, recommendations } from './metrics.js';

const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const fail = (status, message) => Object.assign(new Error(message), { status });

// ---------- Vazifalar ----------
export function listTasks({ userId = null, status = null } = {}) {
  const db = getDb();
  const users = db.prepare('SELECT id, name, role FROM users').all();
  const projects = db.prepare('SELECT id, name, color FROM projects').all();
  return db.prepare('SELECT * FROM tasks ORDER BY id DESC').all()
    .filter((t) => (!userId || t.assignee_id === userId) && (!status || (status === 'active' ? t.status !== 'done' : t.status === status)))
    .map((t) => {
      const a = users.find((u) => u.id === t.assignee_id);
      const p = projects.find((x) => x.id === t.project_id);
      return {
        ...t, status_label: TASK_STATUS[t.status], assignee_name: a?.name || null, assignee_role: a?.role || null,
        author_name: users.find((u) => u.id === t.created_by)?.name || null,
        project_name: p?.name || null, project_color: p?.color || null,
        overdue: t.status !== 'done' && t.due_date && t.due_date < today(),
      };
    });
}

export function createTask(b, userId) {
  const title = String(b.title || '').trim().slice(0, 200);
  if (!title) throw fail(400, 'Vazifa matnini kiriting');
  const db = getDb();
  let assignee = Number(b.assignee_id) || null;
  // Rol berilsa (tavsiyadan) — shu roldagi birinchi faol xodim
  if (!assignee && b.role) assignee = db.prepare('SELECT id FROM users WHERE role = ? AND active = 1 ORDER BY id').get(b.role)?.id || null;
  if (assignee && !db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(assignee)) throw fail(400, 'Xodim topilmadi');
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due_date || '')) ? b.due_date : null;
  const info = db.prepare('INSERT INTO tasks (title, detail, project_id, assignee_id, created_by, status, due_date, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(title, String(b.detail || '').trim().slice(0, 1000) || null, Number(b.project_id) || null, assignee, userId, 'open', due, b.source || null, nowIso());
  return listTasks().find((t) => t.id === Number(info.lastInsertRowid));
}

export function updateTask(id, b, user) {
  const db = getDb();
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!t) throw fail(404, 'Vazifa topilmadi');
  const manager = user.role === 'admin' || user.role === 'pm';
  if (!manager && t.assignee_id !== user.id) throw fail(403, 'Bu vazifa sizga tegishli emas');
  if (b.status !== undefined) {
    if (!TASK_STATUS[b.status]) throw fail(400, "Holat noto'g'ri");
    db.prepare('UPDATE tasks SET status = ?, done_at = ? WHERE id = ?').run(b.status, b.status === 'done' ? nowIso() : null, id);
  }
  if (manager) {
    if (b.title !== undefined && String(b.title).trim()) db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(String(b.title).trim().slice(0, 200), id);
    if (b.assignee_id !== undefined) db.prepare('UPDATE tasks SET assignee_id = ? WHERE id = ?').run(Number(b.assignee_id) || null, id);
    if (b.due_date !== undefined) db.prepare('UPDATE tasks SET due_date = ? WHERE id = ?').run(/^\d{4}-\d{2}-\d{2}$/.test(String(b.due_date || '')) ? b.due_date : null, id);
  }
  return listTasks().find((x) => x.id === Number(id));
}

export function deleteTask(id, user) {
  if (user.role !== 'admin' && user.role !== 'pm') throw fail(403, "Vazifani direktor yoki PM o'chiradi");
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

// ---------- Xarajatlar va sof foyda ----------
export function listExpenses(month) {
  const projects = getDb().prepare('SELECT id, name, color FROM projects').all();
  return getDb().prepare('SELECT * FROM expenses WHERE month = ? ORDER BY id DESC').all(month).map((e) => ({
    ...e, category_label: EXPENSE_CATEGORIES[e.category] || e.category,
    project_name: projects.find((p) => p.id === e.project_id)?.name || null,
  }));
}

export function addExpense(b, userId) {
  if (!/^\d{4}-\d{2}$/.test(String(b.month || ''))) throw fail(400, "Oy noto'g'ri");
  if (!EXPENSE_CATEGORIES[b.category]) throw fail(400, "Turkum noto'g'ri");
  const amount = Number(String(b.amount ?? '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) throw fail(400, "Summa noto'g'ri");
  const pid = Number(b.project_id) || null;
  if (pid && !getDb().prepare('SELECT id FROM projects WHERE id = ?').get(pid)) throw fail(404, 'Loyiha topilmadi');
  const info = getDb().prepare('INSERT INTO expenses (project_id, month, category, amount, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(pid, b.month, b.category, amount, String(b.note || '').trim().slice(0, 300) || null, userId, nowIso());
  return listExpenses(b.month).find((e) => e.id === Number(info.lastInsertRowid));
}

export function deleteExpense(id) {
  getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

// Oy uchun foyda: tushum − reklama (so'mda) − loyiha xarajatlari − umumiy xarajatdan ulush (tushumga mutanosib)
export function profitAndLoss(month) {
  const { from, to, days } = monthBounds(month);
  const end = to < today() ? to : today();
  const s = summary({ from, to: end });
  // Joriy oy: oylik xarajat o'tgan kunlarga mutanosib (2 kunlik tushumdan butun oy xarajati ayrilmasin)
  const factor = end < from ? 0 : Math.min(1, (Number(end.slice(8, 10)) - Number(from.slice(8, 10)) + 1) / days);
  const exps = listExpenses(month);
  const common = exps.filter((e) => !e.project_id).reduce((a, e) => a + e.amount, 0) * factor;
  const totalRevenue = s.byProject.reduce((a, p) => a + p.total_revenue, 0);
  const rows = s.byProject.map((p) => {
    const own = exps.filter((e) => e.project_id === p.id);
    const ownSum = own.reduce((a, e) => a + e.amount, 0) * factor;
    const share = totalRevenue ? p.total_revenue / totalRevenue : 1 / Math.max(s.byProject.length, 1);
    const commonShare = common * share;
    const profit = p.total_revenue - p.spend_uzs - ownSum - commonShare;
    const byCat = {};
    for (const e of own) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    return {
      id: p.id, name: p.name, color: p.color, revenue: p.total_revenue, ads: p.spend_uzs, expenses: ownSum, common: commonShare,
      profit, margin: p.total_revenue ? profit / p.total_revenue : null, byCat,
    };
  });
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const total = { revenue: sum('revenue'), ads: sum('ads'), expenses: sum('expenses'), common, profit: sum('profit') };
  total.margin = total.revenue ? total.profit / total.revenue : null;
  return { month, rows, total, expenses: exps, rate: s.totals.rate, factor, through: end };
}

// ---------- Signallar: bugun vs so'nggi 7 kun o'rtachasi ----------
export function anomalies(date = today()) {
  const { projects, rows } = loadRows(addDays(date, -7), date);
  const out = [];
  for (const p of projects) {
    const day = sumRows(rows.filter((r) => r.project_id === p.id && r.date === date));
    const past = rows.filter((r) => r.project_id === p.id && r.date < date);
    const days = new Set(past.map((r) => r.date)).size;
    if (!days) continue;
    const base = sumRows(past);
    const avg = (k) => base[k] / days;
    if (day.cpl != null && base.cpl && day.leads >= 5 && day.cpl > base.cpl * 1.8) {
      out.push({ project_id: p.id, project: p.name, level: 'critical', text: `${p.name}: lid narxi $${day.cpl.toFixed(2)} (odatda $${base.cpl.toFixed(2)})` });
    }
    if (day.spend > 0 && avg('leads') >= 10 && day.leads < avg('leads') * 0.5 && day.reported.leads) {
      out.push({ project_id: p.id, project: p.name, level: 'warning', text: `${p.name}: lid ${Math.round(day.leads)} (odatda ~${Math.round(avg('leads'))})` });
    }
    if (avg('spend') > 0 && day.spend > avg('spend') * 1.6) {
      out.push({ project_id: p.id, project: p.name, level: 'warning', text: `${p.name}: xarajat $${Math.round(day.spend)} (odatda ~$${Math.round(avg('spend'))})` });
    }
  }
  return out;
}

const n = (x) => Math.round(x || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
const pc = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function weeklyReportText(to = addDays(today(), -1)) {
  const from = addDays(to, -6);
  const s = summary({ from, to });
  const rec = recommendations({ from, to });
  const t = s.totals, d = s.delta;
  const ch = (x) => (x == null ? '' : ` (${x > 0 ? '+' : ''}${(x * 100).toFixed(0)}%)`);
  const lines = [
    `<b>🗓 Haftalik hisobot: ${from} — ${to}</b>`, '',
    `💸 Target: <b>$${n(t.spend)}</b>${ch(d.spend)} · lid <b>${n(t.leads)}</b>${ch(d.leads)} · 1 lid <b>$${t.cpl == null ? '—' : t.cpl.toFixed(2)}</b>`,
    `💰 Sotuv <b>${n(t.sales)}</b>${ch(d.sales)} · tushum <b>${n(t.total_revenue)} so'm</b>${ch(d.total_revenue)} · ROAS <b>${t.roas == null ? '—' : t.roas.toFixed(2)}</b>`, '',
  ];
  for (const p of rec.projects) lines.push(`• <b>${esc(p.name)}</b> — ${esc(p.status_label)} · $${n(p.spend)} · ${n(p.leads)} lid · ${n(p.sales)} sotuv`);
  const up = rec.allocation.filter((a) => a.change > 0.02).map((a) => esc(a.name));
  const down = rec.allocation.filter((a) => a.change < -0.02).map((a) => esc(a.name));
  if (up.length || down.length) lines.push('', `<b>Byudjet:</b>${up.length ? ` ↑ ${up.join(', ')}` : ''}${down.length ? ` ↓ ${down.join(', ')}` : ''}`);
  const open = listTasks({ status: 'active' });
  if (open.length) lines.push(`<b>Ochiq vazifalar:</b> ${open.length} (${open.filter((x) => x.overdue).length} muddati o'tgan)`);
  return lines.join('\n');
}

// ---------- CSV import (eksport formatida) ----------
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function importCsv(text, userId) {
  const db = getDb();
  const rows = parseCsv(text);
  if (rows.length < 2) throw fail(400, "Fayl bo'sh yoki sarlavha yo'q");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const di = head.indexOf('date'), pi = head.indexOf('project');
  if (di < 0 || pi < 0) throw fail(400, 'Kerakli ustunlar: date, project');
  const projects = db.prepare('SELECT id, name, slug FROM projects').all();
  const find = (v) => projects.find((p) => p.name.toLowerCase() === v.trim().toLowerCase() || p.slug === v.trim().toLowerCase());
  const cols = head.map((h, i) => [h, i]).filter(([h]) => FIELDS[h] || NOTE_FIELDS[h] || h === 'starts');
  let ok = 0;
  const errors = [];
  db.exec('BEGIN');
  try {
    rows.slice(1).forEach((r, idx) => {
      const date = r[di]?.trim();
      const p = find(r[pi] || '');
      const dt = new Date(`${date}T00:00:00Z`);
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === date;
      if (!valid) { errors.push(`${idx + 2}-qator: sana`); return; }
      if (!p) { errors.push(`${idx + 2}-qator: «${r[pi]}» loyiha topilmadi`); return; }
      db.prepare('INSERT OR IGNORE INTO daily (project_id, date) VALUES (?, ?)').run(p.id, date);
      for (const [h, i] of cols) {
        const raw = (r[i] ?? '').trim();
        if (raw === '') continue;
        const field = h === 'starts' ? 'bot_starts' : h;
        const v = FIELDS[field] ? Number(raw.replace(/\s/g, '').replace(',', '.')) : raw.slice(0, 2000);
        if (FIELDS[field] && (!Number.isFinite(v) || v < 0)) continue;
        db.prepare(`UPDATE daily SET ${field} = ?, updated_at = ? WHERE project_id = ? AND date = ?`).run(v, nowIso(), p.id, date);
      }
      ok++;
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  db.prepare('INSERT INTO audit (user_id, project_id, date, field, old_value, new_value) VALUES (?, NULL, ?, ?, NULL, ?)').run(userId, today(), 'import', `${ok} qator`);
  return { imported: ok, errors: errors.slice(0, 20), errorCount: errors.length };
}
