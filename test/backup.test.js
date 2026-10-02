import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test("zaxira nusxa: ishlab turgan bazadan to'liq nusxa, 30 kundan eskilari o'chadi", () => {
  const dir = mkdtempSync(join(tmpdir(), 'analytika-backup-'));
  try {
    const dbPath = join(dir, 'analytika.db');
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL; CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO projects (name) VALUES ('VIZART')");
    const backups = join(dir, 'backups');
    execFileSync('node', ['--disable-warning=ExperimentalWarning', 'src/backup.js'], { env: { ...process.env, DB_PATH: dbPath } });
    // Eski nusxa (40 kun oldin) va boshqa fayl — eskisi o'chadi, boshqa fayl qoladi
    writeFileSync(join(backups, 'analytika-2000-01-01.db'), '');
    writeFileSync(join(backups, 'notes.txt'), '');
    execFileSync('node', ['--disable-warning=ExperimentalWarning', 'src/backup.js'], { env: { ...process.env, DB_PATH: dbPath } });
    db.close();
    const files = readdirSync(backups).sort();
    assert.equal(files.length, 2, files.join(', '));
    assert.match(files[0], /^analytika-\d{4}-\d{2}-\d{2}\.db$/);
    assert.equal(files[1], 'notes.txt');
    const copy = new DatabaseSync(join(backups, files[0]));
    assert.equal(copy.prepare('SELECT name FROM projects').get().name, 'VIZART');
    copy.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
