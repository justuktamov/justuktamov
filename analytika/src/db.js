// SQLite ma'lumotlar bazasi (Node 22+ ichidagi node:sqlite, qo'shimcha paket kerak emas)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/analytika.db';

export const ROLES = {
  admin: 'Direktor',
  pm: 'Proekt menejer',
  target: 'Targetolog',
  sales: 'ROP — sotuv bo\'limi',
  lead: 'Lid operatori',
  finance: 'Moliya',
  creative: 'Kreativchi (mobilograf)',
};

// Kim tizimda nima uchun javob beradi — «Jamoa» sahifasida ko'rsatiladi
export const ROLE_DUTIES = {
  admin: { gives: "Oylik reja, byudjet qarorlari, hisobotga izoh", gets: "PM ning kunlik hisoboti, tavsiyalar, byudjet taqsimoti" },
  pm: { gives: "Kunlik hisobotni yig'adi, har bir loyihaga holat va izoh yozadi, direktorga yuboradi", gets: "Targetolog va ROP raqamlari, kim kiritmagani, avtomatik tavsiyalar" },
  target: { gives: "Har bir loyiha bo'yicha xarajat ($), ko'rishlar, kliklar; har bir post/kreativ natijasi", gets: "Qaysi kreativ ishlamayapti, qaysi loyihaga byudjet oshirish kerak" },
  sales: { gives: "Lidlar soni, sifatli lidlar, sotuvlar, tushum, nega sotib olmaganlar", gets: "Qaysi loyihada lid→sotuv past, lid sifati" },
  lead: { gives: "Bot startlar va lidlar (ROP o'rniga kiritishi mumkin)", gets: "Kunlik vazifalar ro'yxati" },
  finance: { gives: "Kassaga tushgan pul, qayta sotuvlar (LTV)", gets: "Tushum va to'lovlar farqi" },
  creative: { gives: "Kreativlar (video/rasm) — targetolog bilan birga", gets: "Har bir kreativning CTR va lid narxi, qaysisi ishlamayapti" },
};

// Har bir rol qaysi maydonlarni kiritadi (PDF dagi mas'ullar jadvaliga mos)
export const FIELDS = {
  spend:          { label: 'Reklama xarajati ($)', role: 'target' },
  impressions:    { label: "Ko'rishlar (impressions)", role: 'target' },
  clicks:         { label: 'Kliklar', role: 'target' },
  bot_starts:     { label: 'Bot /start (qo\'lda)', role: 'lead' },
  leads:          { label: 'Lidlar', role: 'lead' },
  qualified:      { label: 'Sifatli lidlar', role: 'lead' },
  sales:          { label: 'Sotuvlar soni', role: 'sales' },
  revenue:        { label: "Tushum (so'm)", role: 'sales' },
  payments:       { label: "Kassaga tushgan pul (so'm)", role: 'finance' },
  repeat_sales:   { label: 'Qayta sotuvlar', role: 'finance' },
  repeat_revenue: { label: "Qayta sotuv tushumi (so'm)", role: 'finance' },
};

export const NOTE_FIELDS = {
  note_target: 'target',
  note_lead: 'lead',
  note_sales: 'sales',
  note_finance: 'finance',
};

// ROP lid operatori maydonlarini ham kirita oladi; direktor va PM — hammasini
const EXTRA_EDIT = { sales: ['lead'] };

export const CREATIVE_TYPES = { video: 'Video', image: 'Rasm / banner', stories: 'Stories / Reels', text: 'Matnli post' };

// "Nimaga lid ko'p, sotuv past?" — sotib olmaslik sabablari
export const LOSS_REASONS = {
  expensive: 'Narx qimmat',
  no_answer: "Javob bermadi / ko'tarmadi",
  later: 'Keyinroq oladi',
  thinking: "O'ylab ko'radi",
  no_trust: "Ishonch yo'q",
  competitor: 'Raqobatchidan oldi',
  not_target: 'Maqsadli emas (spam, adashgan)',
  no_money: "Hozir puli yo'q",
  other: 'Boshqa',
};

export const PLATFORMS = {
  telegram_ads: 'Telegram Ads',
  channel_post: 'Kanal posti (reklama)',
  instagram: 'Instagram / Facebook',
  blogger: 'Bloger',
  youtube: 'YouTube',
  google: 'Google',
  other: 'Boshqa',
};

export const PLAN_FIELDS = {
  budget: 'Byudjet ($)',
  leads: 'Lidlar',
  sales: 'Sotuvlar',
  revenue: "Tushum (so'm)",
};

export function canEdit(role, field) {
  if (role === 'admin' || role === 'pm') return true;
  const owner = FIELDS[field]?.role || NOTE_FIELDS[field];
  if (!owner) return false;
  return owner === role || (EXTRA_EDIT[role] || []).includes(owner);
}

// Rolning kiritish sahifasida ko'rinadigan bo'limlari
export function entryRoles(role) {
  if (role === 'admin' || role === 'pm') return ['target', 'lead', 'sales', 'finance'];
  const mine = [role, ...(EXTRA_EDIT[role] || [])];
  return ['target', 'lead', 'sales', 'finance'].filter((r) => mine.includes(r)); // voronka tartibida
}

let db;

export function getDb() {
  if (db) return db;
  if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(db) {
  const metricCols = Object.keys(FIELDS).map((f) => `${f} REAL`).join(',\n      ');
  const noteCols = Object.keys(NOTE_FIELDS).map((f) => `${f} TEXT`).join(',\n      ');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
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
      slug TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'kurs',
      color TEXT,
      channel_id TEXT,
      track_key TEXT NOT NULL,
      avg_check REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      ${metricCols},
      ${noteCols},
      updated_at TEXT,
      PRIMARY KEY (project_id, date)
    );
    CREATE TABLE IF NOT EXISTS loss_reasons (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      reason TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (project_id, date, reason)
    );
    -- Avtomatik hodisalar: bot /start, kanalga a'zo bo'lish/chiqish, tashqi API
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      tg_user_id TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS events_by_day ON events(project_id, date, type);
    CREATE UNIQUE INDEX IF NOT EXISTS events_unique_user
      ON events(project_id, date, type, tg_user_id) WHERE tg_user_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      project_id INTEGER,
      date TEXT,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_reports (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      kind TEXT NOT NULL,
      date_from TEXT,
      date_to TEXT,
      question TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Oylik reja (KPI): loyiha × oy
    CREATE TABLE IF NOT EXISTS plans (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      budget REAL,
      leads REAL,
      sales REAL,
      revenue REAL,
      PRIMARY KEY (project_id, month)
    );
    -- Reklama postlari / kampaniyalar: har biri o'z deep link tegiga ega (?start=slug__teg)
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'telegram_ads',
      tag TEXT NOT NULL,
      spend REAL,
      clicks REAL,
      starts REAL,
      leads REAL,
      sales REAL,
      note TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (project_id, tag)
    );
    -- PM ning direktorga kunlik hisoboti (kuniga bitta)
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
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  // Eski bazalarga yangi ustunlar
  const cols = db.prepare('PRAGMA table_info(campaigns)').all().map((c) => c.name);
  for (const [c, t] of [['impressions', 'REAL'], ['creative_type', 'TEXT'], ['creative_url', 'TEXT']]) {
    if (cols.length && !cols.includes(c)) db.exec(`ALTER TABLE campaigns ADD COLUMN ${c} ${t}`);
  }
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
