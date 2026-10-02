// AI tahlil: provayder tanlash (.env) va tahlilni bajarish.
// Provayderni almashtirish uchun kod o'zgarmaydi — faqat .env: AI_PROVIDER, AI_API_KEY, AI_MODEL (va kerak bo'lsa AI_BASE_URL)
import { AiError } from './errors.js';
import { SYSTEM_PROMPT, userPrompt, parseAiResult } from './prompt.js';

export { AiError };

// adapter: qaysi fayl so'rov yuboradi; model — standart model (AI_MODEL bilan almashtiriladi)
const PROVIDERS = {
  deepseek: { label: 'DeepSeek', adapter: 'openai', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' },
  anthropic: { label: 'Claude (Anthropic)', adapter: 'anthropic', model: 'claude-opus-5-5' },
  // OpenAI yoki OpenAI formatidagi boshqa xizmat: AI_MODEL majburiy, boshqa xizmat uchun — AI_BASE_URL
  openai: { label: 'OpenAI-mos API', adapter: 'openai', baseUrl: 'https://api.openai.com/v1', model: null },
};
const TIMEOUT_MS = 150_000; // nginx proxy_read_timeout — 180 s

export function aiConfig(env = process.env) {
  const provider = String(env.AI_PROVIDER || 'deepseek').trim().toLowerCase();
  const p = PROVIDERS[provider];
  if (!p) return { enabled: false, provider, reason: `Noma'lum AI_PROVIDER: «${provider}» (deepseek, anthropic yoki openai)` };
  const apiKey = String(env.AI_API_KEY || '').trim();
  const sdkKey = p.adapter === 'anthropic' && Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  const model = String(env.AI_MODEL || '').trim() || p.model;
  const cfg = { provider, label: p.label, adapter: p.adapter, model, baseUrl: String(env.AI_BASE_URL || '').trim() || p.baseUrl, apiKey, effort: String(env.AI_EFFORT || '').trim() || null };
  if (!apiKey && !sdkKey) return { ...cfg, enabled: false, reason: "Serverda AI_API_KEY o'rnatilmagan" };
  if (!model) return { ...cfg, enabled: false, reason: "AI_MODEL ko'rsatilmagan" };
  return { ...cfg, enabled: true };
}

// Ilovaga ko'rsatiladigan holat (kalitsiz)
export function aiStatus(env = process.env) {
  const c = aiConfig(env);
  return { enabled: c.enabled, provider: c.provider, label: c.label || null, model: c.model || null, reason: c.reason || null };
}

async function adapterFor(name) {
  return name === 'anthropic' ? import('./anthropic.js') : import('./openai-compatible.js');
}

// input — buildAiInput() natijasi. Bo'sh yoki yaroqsiz javob bo'lsa bir marta qayta so'raladi
export async function analyze(input, env = process.env) {
  const cfg = aiConfig(env);
  if (!cfg.enabled) throw new AiError(`AI ulanmagan: ${cfg.reason}`);
  const { complete } = await adapterFor(cfg.adapter);
  const req = { baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, effort: cfg.effort, system: SYSTEM_PROMPT, user: userPrompt(input), timeoutMs: TIMEOUT_MS };
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = parseAiResult(await complete(req), input);
      return { ...result, provider: cfg.provider, model: cfg.model };
    } catch (e) {
      lastError = e instanceof AiError ? e : new AiError(e.message, { retry: true });
      if (!lastError.retry) break;
    }
  }
  throw lastError;
}
