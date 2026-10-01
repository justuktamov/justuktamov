// Telegram integratsiyasi:
//  1) Bot /start <loyiha-slug> — deep link orqali kim qaysi loyihadan kelganini sanaydi
//  2) Bot kanallarga admin qilib qo'shiladi — a'zo bo'lish/chiqishni real vaqtda sanaydi
//  3) Kunlik hisobot va eslatmalarni Telegramga yuboradi
import { getDb, getSetting, setSetting, today, ROLES } from './db.js';
import { summary, missingReport, addDays } from './metrics.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
let running = false;
let botInfo = null;

export function telegramStatus() {
  return { enabled: Boolean(TOKEN), running, bot: botInfo?.username || null, chats: knownChats() };
}

async function call(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

export async function sendMessage(chatId, text) {
  if (!TOKEN || !chatId) return;
  // Telegram xabari 4096 belgidan oshmasligi kerak
  for (let i = 0; i < text.length; i += 4000) {
    await call('sendMessage', { chat_id: chatId, text: text.slice(i, i + 4000), parse_mode: 'HTML', disable_web_page_preview: true });
  }
}

export function knownChats() {
  try { return JSON.parse(getSetting('tg_chats', '[]')); } catch { return []; }
}

function rememberChat(chat, status) {
  const chats = knownChats().filter((c) => String(c.id) !== String(chat.id));
  chats.push({ id: String(chat.id), title: chat.title || chat.username || String(chat.id), type: chat.type, status });
  setSetting('tg_chats', JSON.stringify(chats));
}

export function recordEvent(projectId, type, tgUserId = null, source = null, date = today()) {
  getDb()
    .prepare('INSERT OR IGNORE INTO events (project_id, date, type, tg_user_id, source) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, date, type, tgUserId == null ? null : String(tgUserId), source);
}

function projectBySlug(slug) {
  return getDb().prepare('SELECT * FROM projects WHERE slug = ? AND active = 1').get(String(slug || '').toLowerCase());
}

function projectByChannel(chatId) {
  return getDb().prepare('SELECT * FROM projects WHERE channel_id = ? AND active = 1').get(String(chatId));
}

function userByTelegram(tgId) {
  return getDb().prepare('SELECT * FROM users WHERE telegram_id = ? AND active = 1').get(String(tgId));
}

async function handleUpdate(u) {
  if (u.message?.text) {
    const m = u.message;
    const [cmd, payload] = m.text.trim().split(/\s+/, 2);
    if (cmd === '/start') {
      // Deep link: https://t.me/<bot>?start=<slug> yoki <slug>__<manba>
      const [slug, src] = String(payload || '').split('__');
      const project = projectBySlug(slug);
      if (project) {
        recordEvent(project.id, 'start', m.from.id, src || 'deeplink');
        const reply = getSetting('start_reply');
        if (reply) await sendMessage(m.chat.id, reply.replace('{loyiha}', project.name));
      } else if (!payload) {
        await sendMessage(m.chat.id, `Sizning Telegram ID: <code>${m.from.id}</code>\nUni admin panelda profilingizga qo'shing — kunlik hisobot va eslatmalar shu yerga keladi.`);
      }
      return;
    }
    if (cmd === '/id') return sendMessage(m.chat.id, `Chat ID: <code>${m.chat.id}</code>\nFoydalanuvchi ID: <code>${m.from.id}</code>`);
    if (cmd === '/hisobot' || cmd === '/report') {
      if (!userByTelegram(m.from.id)) return sendMessage(m.chat.id, "Siz tizimda ro'yxatdan o'tmagansiz. Admin profilingizga Telegram ID qo'shishi kerak (/id).");
      return sendMessage(m.chat.id, dailyReportText(today()));
    }
    if (cmd === '/kecha') {
      if (!userByTelegram(m.from.id)) return;
      return sendMessage(m.chat.id, dailyReportText(addDays(today(), -1)));
    }
  }
  // Bot kanal/guruhga qo'shildi yoki admin qilindi
  if (u.my_chat_member) {
    rememberChat(u.my_chat_member.chat, u.my_chat_member.new_chat_member.status);
  }
  // Kanal a'zolari (bot admin bo'lishi kerak; allowed_updates da chat_member so'raladi)
  if (u.chat_member) {
    const { chat, old_chat_member: oldM, new_chat_member: newM } = u.chat_member;
    const project = projectByChannel(chat.id);
    if (!project) return;
    const wasIn = ['member', 'administrator', 'creator', 'restricted'].includes(oldM.status);
    const isIn = ['member', 'administrator', 'creator', 'restricted'].includes(newM.status);
    const via = u.chat_member.invite_link?.name || u.chat_member.invite_link?.invite_link || null;
    if (!wasIn && isIn) recordEvent(project.id, 'join', newM.user.id, via);
    if (wasIn && !isIn) recordEvent(project.id, 'leave', newM.user.id, via);
  }
}

export async function startPolling() {
  if (!TOKEN || running) return;
  running = true;
  try {
    botInfo = await call('getMe');
    console.log(`Telegram bot ulandi: @${botInfo.username}`);
  } catch (e) {
    console.error('Telegram:', e.message);
  }
  let offset = 0;
  while (running) {
    try {
      const updates = await call('getUpdates', {
        offset, timeout: 50, allowed_updates: ['message', 'chat_member', 'my_chat_member'],
      });
      for (const u of updates) {
        offset = u.update_id + 1;
        try { await handleUpdate(u); } catch (e) { console.error('Telegram update:', e.message); }
      }
    } catch (e) {
      console.error('Telegram polling:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

const n = (x) => Math.round(x || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
const p = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function dailyReportText(date) {
  const s = summary({ from: date, to: date });
  const t = s.totals;
  const lines = [
    `<b>📊 Kunlik hisobot — ${date}</b>`,
    '',
    `💸 Xarajat: <b>$${t.spend.toFixed(2)}</b>  ·  Klik: <b>${n(t.clicks)}</b>`,
    `🤖 Bot start: <b>${n(t.starts)}</b>${t.organic != null ? ` (organik ${n(t.organic)})` : ''}`,
    `🎯 Lid: <b>${n(t.leads)}</b>  ·  Sotuv: <b>${n(t.sales)}</b>  ·  Konv.: <b>${p(t.lead_to_sale)}</b>`,
    `💰 Tushum: <b>${n(t.total_revenue)} so'm</b>  ·  ROAS: <b>${t.roas != null ? t.roas.toFixed(2) : '—'}</b>`,
    '',
    '<b>Loyihalar:</b>',
  ];
  for (const pr of s.byProject) {
    lines.push(`• ${esc(pr.name)}: $${pr.spend.toFixed(0)} → ${n(pr.clicks)} klik → ${n(pr.starts)} start → ${n(pr.leads)} lid → ${n(pr.sales)} sotuv (${p(pr.lead_to_sale)})`);
  }
  if (s.insights.length) {
    lines.push('', '<b>Diqqat:</b>');
    for (const i of s.insights.slice(0, 6)) lines.push(`${{ critical: '🔴', warning: '🟠', good: '🟢', info: '🔵' }[i.level]} ${esc(i.text)}`);
  }
  const missing = missingReport(date).filter((m) => !m.filled);
  if (missing.length) {
    lines.push('', '<b>Kiritilmagan:</b>');
    const byRole = {};
    for (const m of missing) (byRole[m.role_label] ||= []).push(m.project);
    for (const [role, list] of Object.entries(byRole)) lines.push(`⏳ ${role}: ${esc(list.join(', '))}`);
  }
  return lines.join('\n');
}

// Eslatma: hisobot kiritmagan menejerlarga shaxsiy xabar
export async function remindMissing(date = today()) {
  const missing = missingReport(date).filter((m) => !m.filled);
  const users = getDb().prepare("SELECT * FROM users WHERE active = 1 AND telegram_id IS NOT NULL AND role != 'admin'").all();
  for (const u of users) {
    const mine = missing.filter((m) => m.role === u.role).map((m) => m.project);
    if (mine.length) {
      await sendMessage(u.telegram_id, `⏰ ${esc(u.name)}, bugungi (${date}) hisobot hali kiritilmagan:\n${mine.map((x) => `• ${esc(x)}`).join('\n')}\n\nRol: ${ROLES[u.role]}`);
    }
  }
}
