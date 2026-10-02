// Namuna ma'lumotlar generatori — `npm run demo` va brauzerdagi demo ikkalasi ishlatadi
import { addDays } from './metrics.js';

export const DEMO_USER = { name: 'Dilshod', login: 'pm', password: 'demo1234' };

// [nom, CPC $, klik→lid, lid→sotuv, o'rtacha chek so'm, kunlik byudjet $]
const PROJECTS = [
  ['STARPAY', 0.12, 0.48, 0.35, 95_000, 60], // Telegram Premium va Stars: arzon chek, yuqori konversiya
  ['VIZART', 0.3, 0.12, 0.06, 2_400_000, 70], // interyer/exteryer
  ['DIZIPRO', 0.2, 0.24, 0.015, 2_900_000, 70], // 3D modeling: lid ko'p, sotuv past
  ['SELFENG', 0.25, 0.24, 0.08, 890_000, 35], // general English
];
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
const PLAN_SALES_K = [null, null, 3.8, null];

// end — bugun: SELFENG raqamlari hali kiritilmagan, VIZART va SELFENG sotuvi kutilmoqda
export function generateDemo(end, days = 45) {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const jitter = (x, k = 0.25) => x * (1 - k + rand() * 2 * k);
  const projects = [], daily = [], plans = [];

  PROJECTS.forEach(([name, cpc, c2l, l2s, check, budget], i) => {
    const id = i + 1;
    projects.push({ id, name, color: COLORS[i] });
    for (let k = days - 1; k >= 0; k--) {
      const date = addDays(end, -k);
      const today0 = k === 0;
      const growth = 1 + (days - 1 - k) * (i === 1 ? 0.012 : i === 3 ? -0.004 : 0.006);
      const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 0.8 : 1;
      const spend = Math.round(jitter(budget * growth * weekend) * 100) / 100;
      const clicks = Math.round(spend / jitter(cpc, 0.15));
      // Bugun VIZART da lid narxi keskin oshgan (kreativ charchagan) — PM tahlilida chiqadi
      const leads = Math.round(clicks * jitter(c2l, 0.2) * (today0 && i === 1 ? 0.5 : 1));
      const qualified = Math.round(leads * jitter(i === 2 ? 0.22 : 0.5, 0.15));
      const potential = Math.min(Math.round(leads * jitter(0.22, 0.2)), leads - qualified);
      const sales = Math.round(leads * jitter(l2s, 0.35));
      const revenue = Math.round(sales * jitter(check, 0.1) / 1000) * 1000;
      const noData = today0 && i === 3;
      const noSales = today0 && i % 2 === 1;
      daily.push({
        project_id: id, date,
        spend: noData ? null : spend, impressions: noData ? null : Math.round(clicks * jitter(55)), clicks: noData ? null : clicks,
        new_creatives: noData ? null : i === 1 && k < 9 ? 0 : (k + i) % 3 === 0 ? 1 : 0,
        leads: noData ? null : leads, qualified: noData ? null : qualified, potential: noData ? null : potential, unqualified: noData ? null : leads - qualified - potential,
        sales: noSales ? null : sales, revenue: noSales ? null : revenue,
        creative_best: k > 2 || noData ? null : CREATIVES[i][0], creative_worst: k > 2 || noData ? null : CREATIVES[i][1],
        note_target: today0 && i === 1 ? "Instagramda 1 ta reklama moderatsiyadan o'tmadi" : null,
        note_sales: k === 1 && i === 2 ? "Qo'ng'iroqlarga javob bermayapti, narxni eshitib o'ylab ko'raman deyishyapti" : null,
      });
    }

    // Oylik reja: oxirgi 14 kun sur'ati bo'yicha × koeffitsient
    const recent = daily.filter((r) => r.project_id === id).slice(-15, -1);
    const perDay = (f) => recent.reduce((a, r) => a + (r[f] || 0), 0) / recent.length;
    const month = end.slice(0, 7);
    const dim = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const round = (x, step) => Math.round(x / step) * step;
    const sk = PLAN_SALES_K[i] || PLAN_K[i];
    plans.push({
      project_id: id, month,
      budget: round(perDay('spend') * dim * 0.95, 50),
      leads: round(perDay('leads') * dim * PLAN_K[i], 10),
      sales: round(perDay('sales') * dim * sk, 5),
      revenue: round(perDay('revenue') * dim * sk, 1_000_000),
    });
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
  return { projects, daily, plans, reports };
}
