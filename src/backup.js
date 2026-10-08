// Bazaning kunlik zaxira nusxasi. Ilova o'zi har kuni qiladi (server.js rejalashtiruvchisi, Toshkent vaqti 03:00);
// qo'lda ham bo'ladi: npm run backup  (yoki node src/backup.js [papka]).
// Nusxa ishlab turgan bazadan xavfsiz olinadi (VACUUM INTO); BACKUP_KEEP_DAYS (standart 30) kundan eskilari o'chiriladi.
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, today } from './db.js';

const NAME = /^analytika-(\d{4}-\d{2}-\d{2})\.db$/;

export const backupDir = () => process.env.BACKUP_DIR || join(dirname(process.env.DB_PATH || './data/analytika.db'), 'backups');

export function makeBackup(dir = backupDir(), keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 30) {
  const day = today();
  const file = join(dir, `analytika-${day}.db`);
  mkdirSync(dir, { recursive: true });
  // Avval vaqtinchalik faylga, keyin almashtiriladi: ikki jarayon (ilova va qo'lda ishga tushirilgan) bir-biriga xalaqit bermaydi
  const tmp = `${file}.${process.pid}.tmp`;
  rmSync(tmp, { force: true });
  getDb().exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  renameSync(tmp, file);

  const cutoff = new Date(Date.parse(`${day}T00:00:00Z`) - keepDays * 864e5).toISOString().slice(0, 10);
  for (const f of readdirSync(dir)) {
    const m = f.match(NAME);
    if (m && m[1] < cutoff) rmSync(join(dir, f));
  }
  return { file, size: statSync(file).size };
}

// Sozlamalarda ko'rsatish uchun: oxirgi nusxa sanasi, hajmi va nechta nusxa saqlanyapti
export function backupStatus(dir = backupDir()) {
  let files = [];
  try { files = readdirSync(dir).filter((f) => NAME.test(f)).sort(); } catch { return { count: 0, last: null }; }
  if (!files.length) return { count: 0, last: null };
  const lastFile = files.at(-1);
  const st = statSync(join(dir, lastFile));
  return { count: files.length, last: lastFile.match(NAME)[1], at: st.mtime.toISOString(), size: st.size, oldest: files[0].match(NAME)[1] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  console.log(`Zaxira nusxa: ${makeBackup(process.argv[2] || undefined).file}`);
}
