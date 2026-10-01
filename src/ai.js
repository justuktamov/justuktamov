// AI tahlil moduli — Claude API orqali o'sish, konversiya va loyihalarni taqqoslash bo'yicha xulosa
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from './db.js';
import { summary } from './metrics.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

const SYSTEM = `Siz ta'lim va marketing loyihalari uchun bosh analitiksiz. Sizga kurslar/loyihalar bo'yicha voronka ma'lumotlari JSON ko'rinishida beriladi:
reklama xarajati ($) → kliklar → bot /start (reklama + organik) → lidlar → sotuvlar → tushum (so'm) → qayta sotuvlar (LTV).

Tahlil qoidalari:
- Faqat berilgan raqamlarga tayaning, raqam o'ylab topmang. Ma'lumot yetishmasa, buni ochiq ayting va qaysi xodim nimani kiritishi kerakligini yozing.
- Organik oqim = bot startlar − reklama kliklari.
- Joriy davrni oldingi davr bilan solishtiring (o'sish tezligi, %).
- Loyihalarni bir-biri bilan solishtiring: qaysi kurs tez o'syapti, qaysi biri pulni yeyapti.
- "Lid ko'p, sotuv past" holatlarini alohida ko'rsating va sabablarini (loss_reasons, menejer izohlari) asosida tushuntiring.
- Har bir muammo uchun aniq, bajariladigan tavsiya bering va kim (targetolog, lid menejeri, sotuv menejeri, moliya) bajarishini yozing.

Javobni o'zbek tilida (lotin yozuvida), Markdown formatida yozing. Tuzilma:
## Qisqa xulosa (3–5 ta band)
## Loyihalar bo'yicha
## Muammolar va sabablar
## Tavsiyalar (kim, nima, qachongacha)
Raqamlarni o'qishga qulay yozing (12 500 000 so'm, $1.25, 3.4%).`;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// Modelga yuboriladigan ixcham ma'lumot
function compact(s) {
  const pick = (t) => {
    const o = {};
    for (const k of ['spend', 'impressions', 'clicks', 'starts', 'organic', 'joins', 'leads', 'qualified', 'sales', 'revenue',
      'repeat_sales', 'repeat_revenue', 'payments', 'cpc', 'cpl', 'cac', 'click_to_start', 'start_to_lead', 'lead_to_sale',
      'start_to_sale', 'avg_check', 'ltv', 'roas', 'roi', 'profit']) {
      const v = t[k];
      if (v != null && v !== 0) o[k] = typeof v === 'number' ? Number(v.toFixed(4)) : v;
    }
    return o;
  };
  return {
    period: { from: s.from, to: s.to, days: s.days, previous: { from: s.prevFrom, to: s.prevTo } },
    usd_rate_uzs: s.totals.rate,
    totals: pick(s.totals),
    previous_totals: pick(s.prev),
    projects: s.byProject.map((p) => ({ name: p.name, kind: p.kind, ...pick(p), growth_vs_previous: p.growth })),
    daily: s.series.filter((d) => d.leads || d.spend || d.sales).map((d) => ({ date: d.date, spend: d.spend, clicks: d.clicks, starts: d.starts, leads: d.leads, sales: d.sales, revenue: d.revenue })),
    loss_reasons: s.reasons.map((r) => ({ reason: r.label, count: r.count })),
    manager_notes: s.notes,
    rule_based_alerts: s.insights.map((i) => i.text),
  };
}

export async function analyze({ from, to, projectId = null, question = '', userId = null, kind = 'manual' }) {
  if (!aiAvailable()) {
    const err = new Error("AI ulanmagan: serverda ANTHROPIC_API_KEY o'rnatilmagan.");
    err.status = 400;
    throw err;
  }
  const s = summary({ from, to, projectId });
  const data = compact(s);
  const ask = question?.trim()
    ? `Rahbarning savoli: ${question.trim()}\n\nShu savolga javob bering, keyin qisqa umumiy xulosa qo'shing.`
    : 'Shu davr bo\'yicha to\'liq tahlil qiling.';

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
      content: `<data>\n${JSON.stringify(data)}\n</data>\n\n${ask}`,
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
