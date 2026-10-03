// Namuna ma'lumotlar generatori — `npm run demo` va brauzerdagi demo ikkalasi ishlatadi
import { addDays } from './metrics.js';

export const DEMO_USER = { name: 'Dilshod', login: 'pm', password: 'demo1234' };

// [nom, CPC $, klik→lid (avtovoronkada klik→start), lid→sotuv (start→xarid), o'rtacha chek so'm, kunlik byudjet $]
const PROJECTS = [
  ['STARPAY', 0.12, 0.55, 0.3, 95_000, 60], // Telegram Premium va Stars: avtovoronka, arzon chek
  ['VIZART', 0.3, 0.12, 0.06, 2_400_000, 70], // interyer/exteryer
  ['DIZIPRO', 0.2, 0.24, 0.015, 2_900_000, 70], // 3D modeling: lid ko'p, sotuv past
  ['SELFENG', 0.25, 0.24, 0.08, 890_000, 35], // general English: doimiy xarajat katta — zararda
];
// Turi va xarajatlar: tannarx — tushumdan %, doimiy — oyiga so'm
const MONEY = [
  { kind: 'auto', var_cost_pct: 85, fixed_monthly: 15_000_000 },
  { kind: 'leads', var_cost_pct: 15, fixed_monthly: 30_000_000 },
  { kind: 'leads', var_cost_pct: 15, fixed_monthly: 25_000_000 },
  { kind: 'leads', var_cost_pct: 15, fixed_monthly: 40_000_000 },
];
// «Nega?» — sabablar ulushi (ROP aytadi)
const BAD_MIX = [null,
  { not_target: 0.3, no_money: 0.3, no_answer: 0.2, curious: 0.2 },
  { not_target: 0.45, curious: 0.3, age: 0.1, no_answer: 0.15 },
  { no_answer: 0.35, not_target: 0.25, age: 0.2, curious: 0.2 }];
const LOST_MIX = [null,
  { expensive: 0.45, thinking: 0.2, later: 0.15, competitor: 0.1, no_trust: 0.05, other: 0.05 },
  { thinking: 0.3, expensive: 0.2, later: 0.25, no_trust: 0.15, other: 0.1 },
  { thinking: 0.35, later: 0.3, competitor: 0.2, expensive: 0.15 }];
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
// Targetolog aytgan eng yaxshi / ishlamayotgan kreativ
const CREATIVES = [
  ['Stars −20% chegirma stories', 'Premium banner (oq fon)'],
  ['Oshxona interyeri: oldin/keyin video', 'Instagram banner #3'],
  ['3ds Max dars parchasi (reels)', 'Kurs narxi yozilgan rasm'],
  ["O'quvchi natijasi — video", 'Grammatika test posti'],
];
// Oylik reja: joriy sur'atga nisbatan (>1 — reja qiyinroq). DIZIPRO da sotuv rejasi alohida — «lid ko'p, sotuv past»
const PLAN_K = [1.0, 1.05, 1.6, 1.25];
// Lid → sotuv kechikishi (kun): kursni odam 1-2 haftada o'ylab oladi
const LAG = [0, 7, 10, 3];
// Kanallar: [kanal, byudjet ulushi, lid berish kuchi, sifat koeffitsienti, sotuv koeffitsienti]
// VIZART: Instagram lidi ko'p, lekin sifatsiz; DIZIPRO: blogerga pul ketyapti, sotuv yo'q
const CH = [
  [['telegram_ads', 0.7, 1, 1, 1.1], ['channel_post', 0.3, 1, 1, 0.8]],
  [['instagram', 0.6, 1.3, 0.55, 0.5], ['telegram_ads', 0.4, 0.8, 1.5, 1.6]],
  [['instagram', 0.5, 1, 0.9, 1.1], ['telegram_ads', 0.3, 0.9, 1.3, 1.3], ['blogger', 0.2, 0.7, 0.6, 0]],
  [['telegram_ads', 0.65, 1, 1.1, 1.1], ['youtube', 0.35, 0.8, 0.8, 0.8]],
];
// Qayta sotuv ehtimoli (kunlik sotuvlar ichida) va qayta chek ulushi
const REPEAT = [[0.35, 0.8], [0.04, 0.5], [0.03, 0.4], [0.18, 0.9]];

// Butun sonni og'irliklar bo'yicha bo'lish; qoldiq kasr qismiga qarab tasodifiy taqsimlanadi
function split(total, weights, rand) {
  const sum = weights.reduce((a, w) => a + w, 0) || 1;
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  for (let left = total - out.reduce((a, x) => a + x, 0); left > 0; left--) {
    const fr = exact.map((x, j) => Math.max(x - out[j], 0) + 1e-9);
    let r = rand() * fr.reduce((a, x) => a + x, 0), j = 0;
    while (r > fr[j] && j < fr.length - 1) r -= fr[j++];
    out[j] += 1;
  }
  return out;
}
const PLAN_SALES_K = [null, null, 3.8, null];

// end — PM hisobot qilayotgan kun (kecha): SELFENG raqamlari hali kiritilmagan, VIZART va SELFENG sotuvi kutilmoqda
export function generateDemo(end, days = 150) {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const jitter = (x, k = 0.25) => x * (1 - k + rand() * 2 * k);
  const projects = [], daily = [], plans = [], reasons = [], channels = [];

  PROJECTS.forEach(([name, cpc, c2l, l2s, check, budget], i) => {
    const id = i + 1;
    projects.push({ id, name, color: COLORS[i], ...MONEY[i], sale_lag: LAG[i] || null, channels: JSON.stringify(CH[i].map(([c]) => c)) });
    const auto = MONEY[i].kind === 'auto';
    const leadHist = [];
    for (let k = days - 1; k >= 0; k--) {
      const date = addDays(end, -k);
      const today0 = k === 0;
      // Oxirgi 45 kunda trend; undan oldin — oyma-oy biroz tebranadigan tekis daraja
      const growth = (1 + (44 - Math.min(k, 44)) * (i === 1 ? 0.012 : i === 3 ? -0.004 : 0.006)) * (k > 44 ? 0.9 + 0.12 * Math.sin(k / 23 + i) : 1);
      const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 0.8 : 1;
      const spend = Math.round(jitter(budget * growth * weekend) * 100) / 100;
      const clicks = Math.round(spend / jitter(cpc, 0.15));
      // Bugun VIZART da lid narxi keskin oshgan (kreativ charchagan) — PM tahlilida chiqadi
      // VIZART: oxirgi haftada sayt formasi buzilgan — klik bor, lid kam («klik ko'p, lid kam»)
      const leads = Math.round(clicks * jitter(c2l, 0.2) * (today0 && i === 1 ? 0.5 : 1) * (i === 1 && k < 7 ? 0.55 : 1));
      const qualified = Math.round(leads * jitter(i === 2 ? 0.22 : 0.5, 0.15));
      const potential = Math.min(Math.round(leads * jitter(0.22, 0.2)), leads - qualified);
      // Sotuv — LAG kun oldingi lidlardan
      leadHist.push(leads);
      const src = leadHist[leadHist.length - 1 - LAG[i]] ?? leads;
      const sales = Math.round(src * jitter(l2s, 0.35));
      const revenue = Math.round(sales * jitter(check, 0.1) / 1000) * 1000;
      const noData = today0 && i === 3;
      const noSales = today0 && i % 2 === 1;
      const unqualified = leads - qualified - potential;
      const [rp, rk] = REPEAT[i];
      const repeatSales = Math.min(sales, Math.round(sales * jitter(rp, 0.5)));
      const repeatRevenue = Math.round(repeatSales * check * rk * jitter(1, 0.1) / 1000) * 1000;
      // SELFENG: oxirgi haftada reklama kam bosilyapti (ko'rish ko'p, klik kam)
      daily.push({
        project_id: id, date,
        spend: noData ? null : spend, impressions: noData ? null : Math.round(clicks * jitter(55) * (i === 3 && k < 7 ? 1.9 : 1)), clicks: noData ? null : clicks,
        new_creatives: noData ? null : i === 1 && k < 9 ? 0 : (k + i) % 3 === 0 ? 1 : 0,
        starts: auto ? leads : null,
        leads: auto || noData ? null : leads, qualified: auto || noData ? null : qualified, potential: auto || noData ? null : potential, unqualified: auto || noData ? null : unqualified,
        sales: noSales ? null : sales, revenue: noSales ? null : revenue,
        repeat_sales: noSales || k > 40 ? null : repeatSales, repeat_revenue: noSales || k > 40 ? null : Math.min(repeatRevenue, revenue),
        creative_best: k > 2 || noData ? null : CREATIVES[i][0], creative_worst: k > 2 || noData ? null : CREATIVES[i][1],
        note_target: today0 && i === 1 ? "Instagramda 1 ta reklama moderatsiyadan o'tmadi" : null,
        note_sales: k === 1 && i === 2 ? "Qo'ng'iroqlarga javob bermayapti, narxni eshitib o'ylab ko'raman deyishyapti" : null,
      });
      // Kanallar bo'yicha bo'linish (oxirgi 30 kun — PM shundan beri kiritadi)
      if (!noData && k < 30) {
        const cfg = CH[i];
        const sp = split(Math.round(spend * 100), cfg.map((c) => c[1]), rand).map((x) => x / 100);
        const cl = split(clicks, cfg.map((c) => c[1]), rand);
        const ld = split(leads, cfg.map((c) => c[1] * c[2]), rand);
        const ql = split(qualified, cfg.map((c, j) => ld[j] * c[3]), rand);
        const sl = noSales ? null : split(sales, cfg.map((c, j) => ld[j] * c[4]), rand);
        const rv = noSales ? null : split(Math.round(revenue / 1000), sl.map((x) => x || 0), rand);
        cfg.forEach(([channel], j) => channels.push({
          project_id: id, date, channel, spend: sp[j], clicks: cl[j], leads: auto ? null : ld[j], qualified: auto ? null : Math.min(ql[j], ld[j]),
          sales: sl ? sl[j] : null, revenue: rv ? (sl[j] ? rv[j] * 1000 : 0) : null,
        }));
      }
      if (!auto && !noData) {
        const spread = (kind, mix, total) => {
          for (const [reason, share] of Object.entries(mix)) {
            const c = Math.round(total * share * jitter(1, 0.3));
            if (c > 0) reasons.push({ project_id: id, date, kind, reason, count: c });
          }
        };
        spread('bad', BAD_MIX[i], unqualified);
        if (!noSales) spread('lost', LOST_MIX[i], Math.round(Math.max(leads - unqualified - sales, 0) * 0.6));
      }
    }

    // Oylik reja: oxirgi 14 kun sur'ati bo'yicha × koeffitsient
    const recent = daily.filter((r) => r.project_id === id).slice(-15, -1);
    const perDay = (f) => recent.reduce((a, r) => a + (r[f] || 0), 0) / recent.length;
    const month = end.slice(0, 7);
    const dim = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const round = (x, step) => Math.round(x / step) * step;
    const sk = PLAN_SALES_K[i] || PLAN_K[i];
    // Joriy va o'tgan oy rejasi (o'tgan oyda «nega orqada» ogohlantirishlari ko'rinadi)
    const prevMonth = addDays(`${month}-01`, -1).slice(0, 7);
    for (const [mo, d] of [[month, dim], [prevMonth, new Date(Date.UTC(Number(prevMonth.slice(0, 4)), Number(prevMonth.slice(5, 7)), 0)).getUTCDate()]]) {
      plans.push({
        project_id: id, month: mo,
        budget: round(perDay('spend') * d * 0.95, 50),
        leads: auto ? null : round(perDay('leads') * d * PLAN_K[i], 10),
        sales: round(perDay('sales') * d * sk, 5),
        revenue: round(perDay('revenue') * d * sk, 1_000_000),
      });
    }
  });

  // O'tgan 3 kunlik hisobotlar — direktor javob bergan; bugungisini PM o'zi tayyorlaydi
  const reports = [];
  for (let k = 3; k >= 1; k--) {
    reports.push({
      date: addDays(end, -k), status: 'reviewed',
      summary: "Kun rejadagidek o'tdi, asosiy muammo — DIZIPRO konversiyasi.",
      tomorrow: null,
      project_notes: {
        1: { status: 'scale', comment: null },
        2: { status: 'creative', comment: 'Instagram kreativi qimmat lid beryapti — yangi interyer video tayyorlanyapti' },
        3: { status: 'sales_issue', comment: "Lid ko'p, lekin sotuv past. ROP bilan skriptni qayta ko'rib chiqdik" },
        4: { status: 'good', comment: null },
      },
      director_comment: k === 1 ? "STARPAY byudjetini 20% oshiringlar. DIZIPRO bo'yicha ertaga ROP bilan uchrashamiz." : 'Qabul qilindi.',
    });
  }
  return { projects, daily, plans, reports, reasons, channels };
}
