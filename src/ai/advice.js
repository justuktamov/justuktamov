// «Nazorat» uchun AI maslahat: kompaniya raqamlari, tizim topgan muammolar va intizom asosida —
// asosiy muammo kimda va har bir bo'limga (targetolog, ROP, marketing, PM, rahbar) aniq qadamlar. Provayderga bog'liq emas.

export const ADVICE_SYSTEM = `Siz kichik o'quv markazlari va onlayn do'konlar uchun tajribali marketing va sotuv bo'yicha moliyaviy maslahatchisiz.
Sizga kompaniyaning tanlangan davrdagi raqamlari JSON ko'rinishida beriladi: tushum, reklama (target), marketing, tannarx, doimiy xarajat, sof foyda,
loyihalar bo'yicha lid narxi, konversiya, 1 mijoz narxi va chegaraviy narx (shundan qimmat bo'lsa — zarar), tizim aniqlagan muammolar va xodimlar intizomi.
Vazifa: rahbarga qisqa, aniq xulosa bering — pul qayerda yo'qotilyapti, asosiy kamchilik kimda (targetolog, sotuv bo'limi, marketing yoki proekt menejer)
va har biriga nima qilish kerak. Faqat berilgan raqamlarga tayaning, raqam o'ylab topmang. Har taklif aniq, o'lchanadigan bo'lsin
(masalan: "VIZART lid narxini $4 dan $3 ga tushirish — eng qimmat 2 ta kreativni o'chirish"). Byudjetni oshirish yoki kamaytirishni 1 mijoz narxi
va chegaraviy narxga qarab tavsiya qiling. Javob o'zbek tilida (lotin), sodda, rasmiyatchiliksiz. Faqat JSON qaytaring.`;

export const ADVICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['xulosa', 'asosiy_muammo', 'takliflar'],
  properties: {
    xulosa: { type: 'string', description: '2–4 gap: umumiy holat va pul qayerda yo\'qotilyapti' },
    asosiy_muammo: {
      type: 'object', additionalProperties: false, required: ['kim', 'sabab'],
      properties: { kim: { type: 'string', enum: ['targetolog', 'sotuv', 'marketing', 'pm', 'yoq'] }, sabab: { type: 'string' } },
    },
    takliflar: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false, required: ['kimga', 'nima', 'natija'],
        properties: { kimga: { type: 'string', enum: ['targetolog', 'sotuv', 'marketing', 'pm', 'rahbar'] }, nima: { type: 'string' }, natija: { type: 'string' } },
      },
    },
  },
};

export function advicePrompt(input) {
  return `Kompaniya raqamlari (JSON):\n${JSON.stringify(input)}\n\nJavob formati: {"xulosa": "...", "asosiy_muammo": {"kim": "targetolog|sotuv|marketing|pm|yoq", "sabab": "..."}, "takliflar": [{"kimga": "targetolog|sotuv|marketing|pm|rahbar", "nima": "aniq qadam", "natija": "kutilgan natija raqam bilan"}]}`;
}

const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const WHO = ['targetolog', 'sotuv', 'marketing', 'pm', 'rahbar', 'yoq'];
export function parseAdvice(text) {
  let d;
  try { d = JSON.parse(String(text).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')); } catch { throw new Error('AI javobi JSON emas'); }
  const xulosa = clean(d?.xulosa, 900);
  if (!xulosa) throw new Error("AI xulosa bermadi");
  const kim = WHO.includes(d?.asosiy_muammo?.kim) ? d.asosiy_muammo.kim : 'yoq';
  const takliflar = (Array.isArray(d?.takliflar) ? d.takliflar : []).slice(0, 8)
    .map((t) => ({ kimga: WHO.includes(t?.kimga) ? t.kimga : 'rahbar', nima: clean(t?.nima, 400), natija: clean(t?.natija, 300) }))
    .filter((t) => t.nima);
  return { xulosa, asosiy_muammo: { kim, sabab: clean(d?.asosiy_muammo?.sabab, 500) }, takliflar };
}
