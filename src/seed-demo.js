// Namuna ma'lumotlar: `npm run demo` — 45 kunlik 4 ta loyiha va 5 ta xodim
import { getDb, today } from './db.js';
import { createUser } from './auth.js';
import { addDays } from './metrics.js';
import { randomBytes } from 'node:crypto';

const db = getDb();
if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n > 0) {
  console.log("Bazada allaqachon loyihalar bor — namuna ma'lumot qo'shilmadi.");
  process.exit(0);
}

const users = [
  ['Rahbar', 'admin', 'admin'],
  ['Targetolog', 'target', 'target'],
  ['Fotima', 'fotima', 'lead'],
  ['Madina', 'madina', 'sales'],
  ['Anvar', 'anvar', 'finance'],
];
for (const [name, login, role] of users) {
  if (!db.prepare('SELECT 1 FROM users WHERE login = ?').get(login)) createUser({ name, login, password: 'demo1234', role });
}

// [nom, slug, CPC $, organik koef., start→lid, lid→sotuv, o'rtacha chek so'm, kunlik byudjet $]
const projects = [
  ['IELTS Intensiv', 'ielts', 0.25, 1.4, 0.12, 0.075, 1_490_000, 80],
  ['Python dasturlash', 'python', 0.3, 1.2, 0.1, 0.06, 2_200_000, 70],
  ['SMM Pro', 'smm', 0.18, 1.1, 0.22, 0.015, 990_000, 70], // lid ko'p, sotuv past
  ['Bolalar ingliz tili', 'kids', 0.35, 2.0, 0.1, 0.09, 790_000, 35],
];

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jitter = (x, k = 0.25) => x * (1 - k + rand() * 2 * k);

const end = today();
const insertDaily = db.prepare(`INSERT INTO daily (project_id, date, spend, impressions, clicks, bot_starts, leads, qualified, sales, revenue, payments, repeat_sales, repeat_revenue, note_target, note_lead, note_sales, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
const insertReason = db.prepare('INSERT INTO loss_reasons (project_id, date, reason, count) VALUES (?, ?, ?, ?)');
const reasonsMix = {
  smm: { expensive: 0.15, no_answer: 0.2, thinking: 0.15, not_target: 0.35, no_money: 0.15 },
  default: { expensive: 0.3, no_answer: 0.25, later: 0.2, thinking: 0.15, competitor: 0.1 },
};

db.exec('BEGIN');
projects.forEach(([name, slug, cpc, organicK, s2l, l2s, check, budget], i) => {
  const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
  const id = Number(db.prepare('INSERT INTO projects (name, slug, kind, color, track_key, avg_check) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, slug, 'kurs', colors[i], randomBytes(12).toString('hex'), check).lastInsertRowid);
  for (let k = 44; k >= 0; k--) {
    const date = addDays(end, -k);
    const growth = 1 + (44 - k) * (slug === 'python' ? 0.012 : slug === 'kids' ? -0.004 : 0.006);
    const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 0.8 : 1;
    const spend = Math.round(jitter(budget * growth * weekend) * 100) / 100;
    const clicks = Math.round(spend / jitter(cpc, 0.15));
    const starts = Math.round(clicks * jitter(organicK, 0.15));
    const leads = Math.round(starts * jitter(s2l, 0.2));
    const sales = Math.round(leads * jitter(l2s, 0.35));
    const revenue = Math.round(sales * jitter(check, 0.1) / 1000) * 1000;
    const repeat = rand() < 0.25 ? Math.max(1, Math.round(sales * 0.15)) : 0;
    const today0 = k === 0;
    insertDaily.run(
      id, date, spend, Math.round(clicks * jitter(55)), clicks, starts,
      today0 && slug === 'kids' ? null : leads, today0 && slug === 'kids' ? null : Math.round(leads * jitter(slug === 'smm' ? 0.25 : 0.55)),
      today0 && i % 2 ? null : sales, today0 && i % 2 ? null : revenue,
      today0 ? null : Math.round(revenue * 0.85), repeat || null, repeat ? repeat * Math.round(check * 0.6) : null,
      k === 3 && slug === 'smm' ? 'Yangi kreativ ishga tushdi, klik arzonlashdi' : null,
      k === 2 && slug === 'smm' ? "Lidlarning ko'pi tasodifiy, kurs nima ekanini bilmaydi" : null,
      k === 1 && slug === 'smm' ? "Qo'ng'iroqlarga javob bermayapti, narxni eshitib o'ylab ko'raman deyishyapti" : null,
    );
    const lost = Math.max(leads - sales, 0);
    if (!today0 && lost > 0) {
      for (const [reason, share] of Object.entries(reasonsMix[slug] || reasonsMix.default)) {
        const c = Math.round(lost * share * jitter(1, 0.3));
        if (c > 0) insertReason.run(id, date, reason, c);
      }
    }
  }
});
db.exec('COMMIT');
console.log("Namuna ma'lumotlar qo'shildi. Kirish: admin / target / fotima / madina / anvar — parol: demo1234");
