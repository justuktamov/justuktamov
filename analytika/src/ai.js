// AI tahlil moduli — Claude API orqali o'sish, konversiya va loyihalarni taqqoslash bo'yicha xulosa
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from './db.js';
import { summary } from './metrics.js';
import { SYSTEM, compact, userPrompt } from './ai-prompt.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function analyze({ from, to, projectId = null, question = '', userId = null, kind = 'manual' }) {
  if (!aiAvailable()) {
    const err = new Error("AI ulanmagan: serverda ANTHROPIC_API_KEY o'rnatilmagan.");
    err.status = 400;
    throw err;
  }
  const s = summary({ from, to, projectId });
  const data = compact(s);
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: userPrompt(data, question),
    }],
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === 'refusal') {
    const err = new Error('AI bu so\'rovga javob bermadi. Savolni boshqacha yozib ko\'ring.');
    err.status = 422;
    throw err;
  }
  const content = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  const info = getDb()
    .prepare('INSERT INTO ai_reports (user_id, kind, date_from, date_to, question, content) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, kind, from, to, question || null, content);
  return { id: Number(info.lastInsertRowid), content, from, to, question, created_at: new Date().toISOString() };
}
