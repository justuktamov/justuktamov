import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.js';

const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createUser({ name, login, password, role, telegram_id = null }) {
  const info = getDb()
    .prepare('INSERT INTO users (name, login, password_hash, role, telegram_id) VALUES (?, ?, ?, ?, ?)')
    .run(name, login.trim().toLowerCase(), hashPassword(password), role, telegram_id);
  return Number(info.lastInsertRowid);
}

export function login(loginName, password) {
  const user = getDb()
    .prepare('SELECT * FROM users WHERE login = ? AND active = 1')
    .get(String(loginName || '').trim().toLowerCase());
  if (!user || !verifyPassword(password || '', user.password_hash)) return null;
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expires);
  return { token, user: publicUser(user) };
}

export function logout(token) {
  if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function userFromToken(token) {
  if (!token) return null;
  const row = getDb()
    .prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`)
    .get(token, new Date().toISOString());
  return row ? publicUser(row) : null;
}

export function publicUser(u) {
  return { id: u.id, name: u.name, login: u.login, role: u.role, telegram_id: u.telegram_id, active: !!u.active };
}

export function ensureAdmin() {
  const count = getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return null;
  const password = process.env.ADMIN_PASSWORD || randomBytes(6).toString('base64url');
  createUser({ name: 'Rahbar', login: 'admin', password, role: 'admin' });
  return password;
}
