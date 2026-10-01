// Namuna ma'lumotlar: `npm run demo` — 45 kunlik 4 ta loyiha va 5 ta xodim
import { randomBytes } from 'node:crypto';
import { getDb, today, FIELDS, NOTE_FIELDS } from './db.js';
import { createUser } from './auth.js';
import { generateDemo, DEMO_USERS } from './demo-data.js';

const db = getDb();
if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n > 0) {
  console.log("Bazada allaqachon loyihalar bor — namuna ma'lumot qo'shilmadi.");
  process.exit(0);
}

for (const [name, login, role] of DEMO_USERS) {
  if (!db.prepare('SELECT 1 FROM users WHERE login = ?').get(login)) createUser({ name, login, password: 'demo1234', role });
}

const { projects, daily, reasons, campaigns, plans, reports, expenses, tasks } = generateDemo(today());
const cols = ['project_id', 'date', ...Object.keys(FIELDS), ...Object.keys(NOTE_FIELDS)];
const insertDaily = db.prepare(`INSERT INTO daily (${cols.join(', ')}, updated_at) VALUES (${cols.map(() => '?').join(', ')}, datetime('now'))`);
const insertReason = db.prepare('INSERT INTO loss_reasons (project_id, date, reason, count) VALUES (?, ?, ?, ?)');
const ids = new Map();

db.exec('BEGIN');
for (const p of projects) {
  const info = db.prepare('INSERT INTO projects (name, slug, kind, color, track_key, avg_check) VALUES (?, ?, ?, ?, ?, ?)')
    .run(p.name, p.slug, p.kind, p.color, randomBytes(12).toString('hex'), p.avg_check);
  ids.set(p.id, Number(info.lastInsertRowid));
}
for (const r of daily) insertDaily.run(...cols.map((c) => (c === 'project_id' ? ids.get(r.project_id) : r[c] ?? null)));
for (const r of reasons) insertReason.run(ids.get(r.project_id), r.date, r.reason, r.count);
const insertCampaign = db.prepare(`INSERT INTO campaigns (project_id, date, name, platform, tag, spend, impressions, clicks, starts, leads, sales, note, creative_type, creative_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const c of campaigns) insertCampaign.run(ids.get(c.project_id), c.date, c.name, c.platform, c.tag, c.spend, c.impressions, c.clicks, c.starts, c.leads, c.sales, c.note, c.creative_type, c.creative_url);
const uid = (login) => db.prepare('SELECT id FROM users WHERE login = ?').get(login)?.id ?? null;
const insertReport = db.prepare(`INSERT INTO daily_reports (date, author_id, status, summary, tomorrow, project_notes, submitted_at, reviewed_by, reviewed_at, director_comment, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
for (const r of reports) {
  const notes = Object.fromEntries(Object.entries(r.project_notes).map(([pid, v]) => [ids.get(Number(pid)), v]));
  insertReport.run(r.date, uid(r.author_login), r.status, r.summary, r.tomorrow, JSON.stringify(notes), `${r.date} 19:30:00`,
    r.status === 'reviewed' ? uid('admin') : null, r.status === 'reviewed' ? `${r.date} 21:05:00` : null, r.director_comment);
}
const insertPlan = db.prepare('INSERT INTO plans (project_id, month, budget, leads, sales, revenue) VALUES (?, ?, ?, ?, ?, ?)');
for (const p of plans) insertPlan.run(ids.get(p.project_id), p.month, p.budget, p.leads, p.sales, p.revenue);
const insExp = db.prepare('INSERT INTO expenses (project_id, month, category, amount, note) VALUES (?, ?, ?, ?, ?)');
for (const e of expenses) insExp.run(e.project_id ? ids.get(e.project_id) : null, e.month, e.category, e.amount, e.note);
const insTask = db.prepare("INSERT INTO tasks (title, project_id, assignee_id, created_by, status, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
for (const t of tasks) insTask.run(t.title, ids.get(t.project_id), uid(t.assignee_login), uid(t.author_login), t.status, t.due);
db.exec('COMMIT');
console.log("Namuna ma'lumotlar qo'shildi. Kirish: admin (direktor) / pm / target / madina (ROP) / fotima / anvar / kreativ — parol: demo1234");
