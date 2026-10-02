// Telegram: hisobotni direktorga yuborish, PM ga eslatma va direktorning javobi (reply)
import { getDb, getSetting } from './db.js';
import { addDirectorReply, latestSentDate, REPORT_HEAD } from './reports.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
let running = false;
let botInfo = null;

export function telegramStatus() {
  return { enabled: Boolean(TOKEN), running, bot: botInfo?.username || null };
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

const escHtml = (x) => String(x ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const headRe = new RegExp(`${REPORT_HEAD} (\\d{4}-\\d{2}-\\d{2})`);

async function handleUpdate(u) {
  const m = u.message;
  if (!m?.text) return;
  // Direktor PM hisobotiga javob (reply) yozdi — bu yechim: saqlanadi va PM ga yuboriladi
  if (m.reply_to_message?.from?.is_bot && !m.text.startsWith('/')) return handleDirectorReply(m);
  if (m.text.startsWith('/start') || m.text.startsWith('/id')) {
    return sendMessage(m.chat.id, `Sizning Telegram ID: <code>${m.chat.id}</code>\nUni ilovada Sozlamalar → Telegram bo'limiga yozing.`);
  }
}

async function handleDirectorReply(m) {
  // Faqat hisobot boradigan chatdan (direktor yoki guruh) kelgan javob qabul qilinadi
  if (String(m.chat.id) !== String(getSetting('report_chat_id') || '')) return;
  const date = (m.reply_to_message.text || '').match(headRe)?.[1] || latestSentDate();
  const who = m.chat.type === 'private' ? '' : `${m.from.first_name || 'Direktor'}: `;
  const r = date && addDirectorReply(date, who + m.text);
  if (!r) return sendMessage(m.chat.id, 'Javob saqlanmadi: yuborilgan hisobot topilmadi.');
  await call('sendMessage', { chat_id: m.chat.id, text: '✅ Saqlandi va PM ga yetkazildi', reply_to_message_id: m.message_id }).catch(() => {});
  const pm = r.author_id && getDb().prepare('SELECT telegram_id FROM users WHERE id = ?').get(r.author_id)?.telegram_id;
  if (pm && String(pm) !== String(m.chat.id)) await sendMessage(pm, `💬 <b>Direktor javobi</b> (${date} hisobot):\n${escHtml(m.text)}`);
}

export async function startPolling() {
  if (!TOKEN || running) return;
  running = true;
  try {
    botInfo = await call('getMe');
    console.log(`Telegram bot ulandi: @${botInfo.username}`);
    await call('setMyCommands', { commands: [{ command: 'id', description: 'Telegram ID ni bilish' }] });
  } catch (e) {
    console.error('Telegram:', e.message);
  }
  let offset = 0;
  while (running) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
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
