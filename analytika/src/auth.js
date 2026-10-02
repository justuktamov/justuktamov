// Kirish: login + parol (scrypt), sessiya tokeni cookie da
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

export function createUser({ name, login, password, telegram_id = null }) {
  const info = getDb()
    .prepare("INSERT INTO users (name, login, password_hash, role, telegram_id) VALUES (?, ?, ?, 'pm', ?)")
    .run(name, login.trim().toLowerCase(), hashPassword(password), telegram_id);
  return Number(info.lastInsertRowid);
}

export function login(loginName, password) {
  const user = getDb()
    .prepare('SELECT * FROM users WHERE login = ? AND active = 1')
    .get(String(loginName || '').trim().toLowerCase());
  if (!user || !verifyPassword(password || '', user.password_hash)) return null;
  return { token: createSession(user.id), user: publicUser(user) };
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export function changePassword(userId, oldPassword, newPassword) {
  const u = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u || !verifyPassword(oldPassword || '', u.password_hash)) return false;
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
  return true;
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
  return { id: u.id, name: u.name, login: u.login, telegram_id: u.telegram_id };
}

// Birinchi ishga tushirish: proekt menejer uchun login yaratiladi
export function ensureUser() {
  if (getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return null;
  const login = process.env.ADMIN_LOGIN || 'pm';
  const password = process.env.ADMIN_PASSWORD || randomBytes(6).toString('base64url');
  createUser({ name: 'Proekt menejer', login, password });
  return { login, password };
}
