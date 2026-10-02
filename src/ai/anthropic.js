// Anthropic (Claude) — rasmiy SDK orqali. AI_PROVIDER=anthropic bo'lsa ishlatiladi.
import Anthropic from '@anthropic-ai/sdk';
import { AiError } from './errors.js';
import { RESULT_SCHEMA } from './prompt.js';

export async function complete({ apiKey, model, effort, system, user, timeoutMs }) {
  // Kalit berilmasa SDK o'zi ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN dan oladi
  const client = new Anthropic({ ...(apiKey ? { apiKey } : {}), timeout: timeoutMs, maxRetries: 1 });
  let response;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Xavfsizlik filtri rad etsa — so'rov server tomonida boshqa modelda qayta bajariladi
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: effort || 'high', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
      system,
      messages: [{ role: 'user', content: user }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError(`AI kaliti noto'g'ri yoki ruxsat yo'q (${e.status})`);
    if (e instanceof Anthropic.RateLimitError) throw new AiError("AI so'rovlar chegarasiga yetildi — birozdan keyin qayta urinib ko'ring (429)");
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AiError('AI xizmati vaqtida javob bermadi');
    if (e instanceof Anthropic.APIConnectionError) throw new AiError(`AI xizmatiga ulanib bo'lmadi: ${e.message}`, { retry: true });
    if (e instanceof Anthropic.APIError) throw new AiError(`AI xizmati xatosi (${e.status}): ${e.message}`, { retry: (e.status || 0) >= 500 });
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new AiError('AI bu tahlilni bajarishdan bosh tortdi');
  if (response.stop_reason === 'max_tokens') throw new AiError('AI javobi uzilib qoldi (juda uzun)', { retry: true });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!text.trim()) throw new AiError("AI bo'sh javob qaytardi", { retry: true });
  return text;
}
