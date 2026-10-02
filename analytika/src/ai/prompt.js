// AI tahlil uchun: modelga yuboriladigan ma'lumot, ko'rsatma va javobni tekshirish.
// Provayderga bog'liq emas (DeepSeek, Claude va boshqalar uchun bir xil). Node ga xos import yo'q — demo ham shu fayldan foydalanadi.

const r2 = (x) => (x == null || !Number.isFinite(x) ? undefined : Math.round(x * 100) / 100);
const som = (x) => (x == null || !Number.isFinite(x) ? undefined : Math.round(x));
const pct = (x) => (x == null || !Number.isFinite(x) ? undefined : `${(x * 100).toFixed(1)}%`);

// Bo'sh qiymatlarni olib tashlaydi: model «0» ni «kiritilmagan» bilan adashtirmasin
function compact(o) {
  if (Array.isArray(o)) {
    const a = o.map(compact).filter((x) => x !== undefined);
    return a.length ? a : undefined;
  }
  if (o && typeof o === 'object') {
    const e = Object.entries(o).map(([k, v]) => [k, compact(v)]).filter(([, v]) => v !== undefined);
    return e.length ? Object.fromEntries(e) : undefined;
  }
  return o === null || o === '' ? undefined : o;
}

const isEmpty = (p) => !p.reported.spend && !p.reported.leads && !p.reported.sales;

// Hisobot sahifasidagi ma'lumotdan (reportBundle) — modelga boradigan ixcham JSON.
// Faqat raqami kiritilgan loyihalar; tizim topgan muammolar ham beriladi (ular tekshirilgan faktlar)
export function buildAiInput(bundle) {
  const projects = [];
  for (const p of bundle.day.byProject) {
    if (isEmpty(p)) continue;
    const has = (f) => p.reported?.[f] > 0;
    const adv = bundle.advice?.[p.id] || {};
    const b = p.bench || {};
    const week = bundle.week?.projects?.find((x) => x.id === p.id);
    projects.push(compact({
      id: p.id,
      nomi: p.name,
      turi: p.kind === 'auto' ? "avtovoronka: odam botga kirib o'zi sotib oladi" : "sotuv bo'limi orqali: lid → qo'ng'iroq → sotuv",
      kecha: {
        reklama_usd: has('spend') ? r2(p.spend) : undefined,
        korishlar: has('impressions') ? p.impressions : undefined,
        klik: has('clicks') ? p.clicks : undefined,
        ctr: has('impressions') && has('clicks') ? pct(p.ctr) : undefined,
        bot_start: has('starts') ? p.starts : undefined,
        lid: has('leads') ? p.leads : undefined,
        sifatli_lid: has('qualified') ? p.qualified : undefined,
        potensial_lid: has('potential') ? p.potential : undefined,
        sifatsiz_lid: has('unqualified') ? p.unqualified : undefined,
        sotuv: has('sales') ? p.sales : undefined,
        tushum_som: has('revenue') ? som(p.revenue) : undefined,
        qayta_sotuv: has('repeat_sales') ? p.repeat_sales : undefined,
        birlik_narxi: p.unit_cost != null ? `${p.unit_label}: $${r2(p.unit_cost)}` : undefined,
        konversiya: has('sales') && p.conv != null ? `${pct(p.conv)} (${p.conv_label})` : undefined,
        mijoz_narxi_usd: has('sales') ? r2(p.cac) : undefined,
        ortacha_chek_som: has('revenue') ? som(p.avg_check) : undefined,
        sof_foyda_som: has('revenue') ? som(p.net_profit) : undefined,
        sof_marja: has('revenue') ? pct(p.net_margin) : undefined,
      },
      odatdagi_norma: {
        konversiya: b.conv != null ? `${pct(b.conv)} (${b.conv_src === 'reja' ? 'oylik rejadan' : "o'tgan 4 hafta"})` : undefined,
        birlik_narxi_usd: r2(b.unit_cost),
        ctr: pct(b.ctr),
      },
      hafta_holati: week?.status && week.status !== 'nodata' ? bundle.statuses?.[week.status] : undefined,
      sabablar: {
        nega_sifatsiz: p.reasons?.bad?.slice(0, 4).map((r) => `${r.label} — ${pct(r.share)}`),
        nega_sotib_olmadi: p.reasons?.lost?.slice(0, 4).map((r) => `${r.label} — ${pct(r.share)}`),
      },
      kanallar: (p.channels || []).slice(0, 6).map((c) => ({
        kanal: c.label, xarajat_usd: r2(c.spend), lid: c.reported?.leads ? c.leads : undefined,
        sifatli_ulush: pct(c.qualified_share), sotuv: c.reported?.sales ? c.sales : undefined, mijoz_narxi_usd: r2(c.cac),
      })),
      kreativlar: { yaxshi: adv.best, ishlamayotgan: adv.worst },
      tizim_topgan_muammolar: [...new Set([...(adv.problems || []).map((x) => x.text), ...(p.insights || []).filter((i) => i.level !== 'good').map((i) => i.text)])],
      narx: p.price ? `${p.price.title}. ${p.price.text}` : undefined,
    }));
  }
  const t = bundle.day.totals || {};
  // projects — doim ro'yxat (bo'sh bo'lsa ham)
  return {
    ...compact({
      sana: bundle.date,
      valyuta: "reklama — AQSh dollari ($); tushum, foyda va o'rtacha chek — so'm",
      jami: { reklama_usd: r2(t.spend), tushum_som: som(t.revenue), sof_foyda_som: som(t.net_profit), lid: t.leads, sotuv: t.sales },
      direktorning_oxirgi_yechimi: bundle.prevReply?.text,
    }),
    projects,
  };
}

// Kiritilgan ma'lumot o'zgarganini bilish uchun: AI tahlil qaysi raqamlar asosida yozilgani (FNV-1a)
export function hashInput(input) {
  const s = JSON.stringify(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const SYSTEM_PROMPT = `Sen onlayn biznes (onlayn kurslar va Telegram orqali savdo) uchun marketing va sotuv tahlilchisisan.
Proekt menejer (PM) har kuni direktorga kechagi kun bo'yicha hisobot tayyorlaydi. Senga kechagi raqamlar JSON ko'rinishida beriladi — har bir loyihani tahlil qil.

Qoidalar:
- Faqat o'zbek tilida, lotin yozuvida yoz. Sodda, qisqa va aniq.
- Faqat berilgan raqamlarga tayan. Raqam, sabab yoki fakt o'ylab topma. Ma'lumot yetarli bo'lmasa — buni ochiq ayt.
- Har bir loyiha o'zining odatdagi normasi bilan solishtiriladi (odatdagi_norma): loyihalar har xil biznes, ularni bir-biri bilan solishtirma.
- Reklama dollarda ($), tushum va foyda so'mda — birliklarni adashtirma.
- tizim_topgan_muammolar — tekshirilgan faktlar. Ularni inkor qilma; nima uchun bo'lganini va nima qilish kerakligini tushuntir.
- Takliflar amaliy bo'lsin: kim (targetolog, sotuv bo'limi yoki direktor) aniq nima qiladi.
- direktorning_oxirgi_yechimi berilgan bo'lsa — uning bajarilishini raqamlarda ko'rsa, eslatib o't.

Javobni faqat JSON ko'rinishida qaytar, boshqa matnsiz. Tuzilma:
{
  "projects": [
    { "id": 12, "tahlil": "1–3 gap: kecha nima bo'ldi va nega", "takliflar": ["Targetolog: ...", "Sotuv bo'limi: ..."] }
  ],
  "xulosa": "kun bo'yicha umumiy xulosa, 1–2 gap",
  "ertaga": "ertaga nima qilinadi, 1–2 gap"
}
Har bir berilgan loyiha uchun bitta element (id — berilgan id). takliflar — 1 tadan 4 tagacha.`;

export const userPrompt = (input) => `Kechagi raqamlar (JSON):\n${JSON.stringify(input)}`;

// Claude va boshqa sxemani qo'llaydigan provayderlar uchun javob sxemasi
export const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['projects', 'xulosa', 'ertaga'],
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'tahlil', 'takliflar'],
        properties: { id: { type: 'integer' }, tahlil: { type: 'string' }, takliflar: { type: 'array', items: { type: 'string' } } },
      },
    },
    xulosa: { type: 'string' },
    ertaga: { type: 'string' },
  },
};

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Model javobini tekshiradi: faqat berilgan loyihalar, matn uzunligi chegaralangan. Yaroqsiz bo'lsa — xato
export function parseAiResult(text, input) {
  let data;
  try {
    data = JSON.parse(String(text).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  } catch {
    throw new Error("AI javobi JSON emas");
  }
  const ids = new Set(input.projects.map((p) => p.id));
  const projects = {};
  for (const x of Array.isArray(data?.projects) ? data.projects : []) {
    const id = Number(x?.id);
    if (!ids.has(id) || projects[id]) continue;
    const tahlil = clean(x.tahlil, 700);
    const takliflar = (Array.isArray(x.takliflar) ? x.takliflar : []).map((t) => clean(t, 300).replace(/^[•\-–*\s]+/, '')).filter(Boolean).slice(0, 4);
    if (tahlil || takliflar.length) projects[id] = { tahlil, takliflar };
  }
  if (!Object.keys(projects).length) throw new Error("AI javobida loyihalar tahlili yo'q");
  return { projects, xulosa: clean(data.xulosa, 1000), ertaga: clean(data.ertaga, 600) };
}

// 3-qadamdagi «Direktorga taklif» maydoniga yoziladigan matn: 🔎 tahlil + • takliflar
export const aiText = (x) => [x.tahlil && `🔎 ${x.tahlil}`, ...(x.takliflar || []).map((t) => `• ${t}`)].filter(Boolean).join('\n');
