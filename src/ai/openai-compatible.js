// OpenAI-mos «chat completions» API: OpenRouter (standart), DeepSeek, OpenAI va shu formatdagi boshqa xizmatlar.
// Manzil (baseUrl), kalit, model va provayderga xos qo'shimcha sarlavha/maydonlar (headers, body) bilan farqlanadi.
import { AiError } from './errors.js';

export async function complete({ baseUrl, apiKey, model, system, user, timeoutMs, headers = {}, body: extra = {} }) {
  let res;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, ...headers },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        max_tokens: 16000,
        stream: false,
        ...extra,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new AiError(e.name === 'TimeoutError' ? 'AI xizmati vaqtida javob bermadi' : `AI xizmatiga ulanib bo'lmadi: ${e.message}`, { retry: e.name !== 'TimeoutError' });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message || res.statusText;
    if (res.status === 401) throw new AiError(`AI kaliti noto'g'ri yoki o'chirilgan (401)`);
    if (res.status === 402) throw new AiError("AI hisobida mablag' tugagan — balansni to'ldiring (402)");
    if (res.status === 403) throw new AiError(`AI so'rovni rad etdi (403): ${msg}`);
    if (res.status === 429) throw new AiError("AI so'rovlar chegarasiga yetildi — birozdan keyin qayta urinib ko'ring (429)");
    if (res.status === 503) throw new AiError(`Bu model uchun mos AI provayder hozir yo'q (503): ${msg}`, { retry: true });
    throw new AiError(`AI xizmati xatosi (${res.status}): ${msg}`, { retry: res.status >= 500 || res.status === 408 });
  }
  // OpenRouter: model xatosi 200 javob ichida ham kelishi mumkin
  if (body?.error) throw new AiError(`AI xizmati xatosi: ${body.error.message || 'nomaʼlum'}`, { retry: true });
  const choice = body?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new AiError('AI javobi uzilib qoldi (juda uzun)', { retry: true });
  const content = choice?.message?.content;
  // JSON rejimida ba'zan bo'sh javob keladi — qayta urinish kerak
  if (!content || !String(content).trim()) throw new AiError("AI bo'sh javob qaytardi", { retry: true });
  return String(content);
}
