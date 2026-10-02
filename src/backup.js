// Bazaning kunlik zaxira nusxasi: npm run backup  (yoki node src/backup.js [papka])
// Coolify da: Scheduled Tasks → buyruq «node --disable-warning=ExperimentalWarning src/backup.js», har kuni.
// Nusxa ishlab turgan bazadan xavfsiz olinadi (VACUUM INTO); BACKUP_KEEP_DAYS (standart 30) kundan eskilari o'chiriladi.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getDb, today } from './db.js';

const dir = process.argv[2] || process.env.BACKUP_DIR || join(dirname(process.env.DB_PATH || './data/analytika.db'), 'backups');
const keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 30;
const day = today();
const file = join(dir, `analytika-${day}.db`);

mkdirSync(dir, { recursive: true });
rmSync(file, { force: true }); // shu kunning nusxasi qayta olinadi
getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);

const cutoff = new Date(Date.parse(`${day}T00:00:00Z`) - keepDays * 864e5).toISOString().slice(0, 10);
for (const f of readdirSync(dir)) {
  const m = f.match(/^analytika-(\d{4}-\d{2}-\d{2})\.db$/);
  if (m && m[1] < cutoff) rmSync(join(dir, f));
}
console.log(`Zaxira nusxa: ${file}`);
