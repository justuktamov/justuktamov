// OpenAI-mos «chat completions» API: DeepSeek (standart), OpenAI va shu formatdagi boshqa xizmatlar.
// Faqat manzil (baseUrl), kalit va model nomi bilan farqlanadi.
import { AiError } from './errors.js';

export async function complete({ baseUrl, apiKey, model, effort, system, user, timeoutMs }) {
  let res;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        max_tokens: 16000,
        ...(effort ? { reasoning_effort: effort } : {}),
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new AiError(e.name === 'TimeoutError' ? 'AI xizmati vaqtida javob bermadi' : `AI xizmatiga ulanib bo'lmadi: ${e.message}`, { retry: e.name !== 'TimeoutError' });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message || res.statusText;
    if (res.status === 401 || res.status === 403) throw new AiError(`AI kaliti noto'g'ri yoki ruxsat yo'q (${res.status})`);
    if (res.status === 402) throw new AiError("AI hisobida mablag' tugagan (402)");
    if (res.status === 429) throw new AiError("AI so'rovlar chegarasiga yetildi — birozdan keyin qayta urinib ko'ring (429)");
    throw new AiError(`AI xizmati xatosi (${res.status}): ${msg}`, { retry: res.status >= 500 });
  }
  const choice = body?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new AiError('AI javobi uzilib qoldi (juda uzun)', { retry: true });
  const content = choice?.message?.content;
  // DeepSeek JSON rejimida ba'zan bo'sh javob qaytaradi — qayta urinish kerak
  if (!content || !String(content).trim()) throw new AiError("AI bo'sh javob qaytardi", { retry: true });
  return String(content);
}
