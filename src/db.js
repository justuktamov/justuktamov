// SQLite ma'lumotlar bazasi (Node 22+ ichidagi node:sqlite, qo'shimcha paket kerak emas)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/analytika.db';

// Loyiha turi: sotuv bo'limi lidlar bilan ishlaydi; avtovoronkada odam botga kirib o'zi sotib oladi (lid kuzatilmaydi)
export const PROJECT_KINDS = {
  leads: "Sotuv bo'limi orqali",
  auto: 'Avtovoronka (bot)',
};

// PM har kuni kiritadigan raqamlar: targetologdan, sotuv bo'limi rahbaridan (ROP) yoki botdan
export const FIELDS = {
  spend: 'Target xarajati ($)',
  spend_blogger: 'Blogerlarga ($)',
  spend_posts: 'Telegram kanallarga ($)',
  impressions: "Ko'rishlar",
  clicks: 'Kliklar',
  new_creatives: 'Yangi kreativlar',
  starts: 'Bot start',
  leads: 'Lidlar',
  src_ig: 'Instagram direktdan lid',
  src_tg: 'Telegram admin lichkasidan lid',
  qualified: 'Sifatli lidlar',
  potential: 'Potensial lidlar',
  unqualified: 'Sifatsiz lidlar',
  sales: 'Sotuvlar',
  revenue: "Tushum (so'm)",
  repeat_sales: 'Qayta sotuvlar',
  repeat_revenue: "Shundan qayta sotuvdan (so'm)",
};

// Reklama kanallari: har kanal bo'yicha xarajat, lid, sifat va sotuv alohida kiritiladi (ixtiyoriy)
export const CHANNELS = {
  telegram_ads: 'Telegram Ads',
  instagram: 'Instagram / Facebook',
  channel_post: 'Kanal posti',
  blogger: 'Bloger',
  youtube: 'YouTube',
  google: 'Google',
  organic: 'Organik',
  other: 'Boshqa',
};
export const CHANNEL_FIELDS = {
  spend: 'Xarajat ($)',
  clicks: 'Klik',
  leads: 'Lid',
  qualified: 'Sifatli',
  sales: 'Sotuv',
  revenue: "Tushum (so'm)",
};

export const TEXT_FIELDS = {
  creative_best: 'Yaxshi kreativ',
  creative_worst: 'Ishlamayotgan kreativ',
  note_target: 'Targetolog izohi',
  note_sales: 'ROP izohi',
};

// «Nega?» raqamlarda: ROP har kuni sanab beradi
export const REASONS = {
  bad: {
    not_target: 'Maqsadli auditoriya emas',
    no_money: "Puli yo'q",
    no_answer: 'Javob bermadi / raqam xato',
    age: "Yoshi to'g'ri kelmaydi",
    curious: 'Shunchaki qiziqdi',
    spam: 'Spam / adashib yozgan',
  },
  lost: {
    expensive: 'Qimmat',
    thinking: "O'ylab ko'radi",
    later: 'Keyinroq oladi',
    competitor: 'Raqobatchini tanladi',
    no_trust: "Ishonch yo'q",
    other: 'Boshqa',
  },
};
export const REASON_KINDS = { bad: 'Nega sifatsiz', lost: 'Nega sotib olmadi' };

export const PLAN_FIELDS = {
  budget: 'Byudjet ($)',
  leads: 'Lidlar',
  sales: 'Sotuvlar',
  revenue: "Tushum (so'm)",
};

let db;

export function getDb() {
  if (db) return db;
  if (DB_PATH !== ':memory:') {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    // Serverda har yangi versiyada bo'sh baza chiqsa — doimiy disk (volume) ulanmagan: logda darhol ko'rinsin
    if (!existsSync(DB_PATH)) console.log(`Yangi ma'lumotlar bazasi yaratildi: ${DB_PATH}`);
  }
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db) {
  const numCols = Object.keys(FIELDS).map((f) => `${f} REAL`).join(',\n      ');
  const textCols = Object.keys(TEXT_FIELDS).map((f) => `${f} TEXT`).join(',\n      ');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pm',
      telegram_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      kind TEXT NOT NULL DEFAULT 'leads',
      var_cost_pct REAL,
      fixed_monthly REAL,
      channels TEXT,
      sale_lag REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sort_order INTEGER
    );
    CREATE TABLE IF NOT EXISTS daily (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      ${numCols},
      ${textCols},
      updated_at TEXT,
      PRIMARY KEY (project_id, date)
    );
    -- Kanal bo'yicha kunlik raqamlar
    CREATE TABLE IF NOT EXISTS channel_daily (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      spend REAL, clicks REAL, leads REAL, qualified REAL, sales REAL, revenue REAL,
      PRIMARY KEY (project_id, date, channel)
    );
    -- Sabablar soni: kind = bad (nega sifatsiz) | lost (nega sotib olmadi)
    CREATE TABLE IF NOT EXISTS reasons (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      reason TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (project_id, date, kind, reason)
    );
    -- Oylik reja: loyiha × oy
    CREATE TABLE IF NOT EXISTS plans (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      budget REAL,
      leads REAL,
      sales REAL,
      revenue REAL,
      PRIMARY KEY (project_id, month)
    );
    -- PM ning direktorga kunlik hisoboti (kuniga bitta); director_comment — direktorning Telegramdagi javobi
    CREATE TABLE IF NOT EXISTS daily_reports (
      date TEXT PRIMARY KEY,
      author_id INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      summary TEXT,
      tomorrow TEXT,
      project_notes TEXT,
      submitted_at TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      director_comment TEXT,
      ai_analysis TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  // Eski bazaga yangi ustunlar
  const cols = db.prepare('PRAGMA table_info(daily)').all().map((c) => c.name);
  for (const f of Object.keys(FIELDS)) if (cols.length && !cols.includes(f)) db.exec(`ALTER TABLE daily ADD COLUMN ${f} REAL`);
  for (const f of Object.keys(TEXT_FIELDS)) if (cols.length && !cols.includes(f)) db.exec(`ALTER TABLE daily ADD COLUMN ${f} TEXT`);
  const pcols = db.prepare('PRAGMA table_info(projects)').all().map((c) => c.name);
  for (const [c, t] of [['kind', "TEXT NOT NULL DEFAULT 'leads'"], ['var_cost_pct', 'REAL'], ['fixed_monthly', 'REAL'], ['channels', 'TEXT'], ['sale_lag', 'REAL'], ['sort_order', 'INTEGER']]) {
    if (pcols.length && !pcols.includes(c)) db.exec(`ALTER TABLE projects ADD COLUMN ${c} ${t}`);
  }
  // AI tahlil natijasi (JSON): hisobot kuni bo'yicha
  const rcols = db.prepare('PRAGMA table_info(daily_reports)').all().map((c) => c.name);
  if (rcols.length && !rcols.includes('ai_analysis')) db.exec('ALTER TABLE daily_reports ADD COLUMN ai_analysis TEXT');
}

export function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value == null ? null : String(value));
}

// Toshkent vaqti bo'yicha bugungi sana (YYYY-MM-DD)
export function today(tz = process.env.TZ_NAME || 'Asia/Tashkent') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

// Toshkent vaqti bo'yicha hozirgi vaqt (YYYY-MM-DD HH:MM:SS) — hisobot yuborilgan / ko'rilgan vaqt shu ko'rinishda saqlanadi
export function nowLocal(tz = process.env.TZ_NAME || 'Asia/Tashkent') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// Telegram ID lar ro'yxati: bitta maydonda vergul bilan saqlanadi («123, -100456»)
export function splitIds(v) {
  return [...new Set(String(v ?? '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];
}
// Kiritilgan ID lar (matn yoki ro'yxat) tekshiriladi va saqlash uchun bitta qatorga yig'iladi; bo'sh — null
export function normalizeIds(v) {
  const ids = splitIds(Array.isArray(v) ? v.join(',') : v);
  const bad = ids.find((x) => !/^-?\d{4,20}$/.test(x));
  if (bad) { const e = new Error(`Telegram ID faqat raqam bo'ladi: ${bad}`); e.status = 400; throw e; }
  return ids.length ? ids.join(',') : null;
}

