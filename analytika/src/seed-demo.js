// Namuna ma'lumotlar: `npm run demo` — 4 ta loyiha, 45 kun
import { getDb, today, FIELDS, TEXT_FIELDS } from './db.js';
import { createUser } from './auth.js';
import { generateDemo, DEMO_USER } from './demo-data.js';

const db = getDb();
if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n > 0) {
  console.log("Bazada allaqachon loyihalar bor — namuna ma'lumot qo'shilmadi.");
  process.exit(0);
}

const uid = db.prepare('SELECT id FROM users WHERE login = ?').get(DEMO_USER.login)?.id ?? createUser(DEMO_USER);
const { projects, daily, plans, reports, reasons } = generateDemo(today());
const cols = ['project_id', 'date', ...Object.keys(FIELDS), ...Object.keys(TEXT_FIELDS)];
const insertDaily = db.prepare(`INSERT INTO daily (${cols.join(', ')}, updated_at) VALUES (${cols.map(() => '?').join(', ')}, datetime('now'))`);
const ids = new Map();

db.exec('BEGIN');
for (const p of projects) {
  ids.set(p.id, Number(db.prepare('INSERT INTO projects (name, color, kind, var_cost_pct, fixed_monthly) VALUES (?, ?, ?, ?, ?)').run(p.name, p.color, p.kind, p.var_cost_pct, p.fixed_monthly).lastInsertRowid));
}
const insertReason = db.prepare('INSERT INTO reasons (project_id, date, kind, reason, count) VALUES (?, ?, ?, ?, ?)');
for (const r of reasons) insertReason.run(ids.get(r.project_id), r.date, r.kind, r.reason, r.count);
for (const r of daily) insertDaily.run(...cols.map((c) => (c === 'project_id' ? ids.get(r.project_id) : r[c] ?? null)));
const insertPlan = db.prepare('INSERT INTO plans (project_id, month, budget, leads, sales, revenue) VALUES (?, ?, ?, ?, ?, ?)');
for (const p of plans) insertPlan.run(ids.get(p.project_id), p.month, p.budget, p.leads, p.sales, p.revenue);
const insertReport = db.prepare(`INSERT INTO daily_reports (date, author_id, status, summary, tomorrow, project_notes, submitted_at, reviewed_at, director_comment, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
for (const r of reports) {
  const notes = Object.fromEntries(Object.entries(r.project_notes).map(([pid, v]) => [ids.get(Number(pid)), v]));
  insertReport.run(r.date, uid, r.status, r.summary, r.tomorrow, JSON.stringify(notes), `${r.date} 19:30:00`, `${r.date} 21:05:00`, r.director_comment);
}
db.exec('COMMIT');
console.log(`Namuna ma'lumotlar qo'shildi. Kirish: login ${DEMO_USER.login}, parol ${DEMO_USER.password}`);
