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

const { projects, daily, reasons } = generateDemo(today());
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
db.exec('COMMIT');
console.log("Namuna ma'lumotlar qo'shildi. Kirish: admin / target / fotima / madina / anvar — parol: demo1234");
