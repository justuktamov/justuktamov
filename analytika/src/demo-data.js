// Namuna ma'lumotlar generatori — `npm run demo` va brauzerdagi demo ikkalasi ishlatadi
import { addDays } from './metrics.js';

export const DEMO_USERS = [
  ['Rahbar', 'admin', 'admin'],
  ['Targetolog', 'target', 'target'],
  ['Fotima', 'fotima', 'lead'],
  ['Madina', 'madina', 'sales'],
  ['Anvar', 'anvar', 'finance'],
];

// [nom, slug, CPC $, organik koef., start→lid, lid→sotuv, o'rtacha chek so'm, kunlik byudjet $]
const PROJECTS = [
  ['IELTS Intensiv', 'ielts', 0.25, 1.4, 0.12, 0.075, 1_490_000, 80],
  ['Python dasturlash', 'python', 0.3, 1.2, 0.1, 0.06, 2_200_000, 70],
  ['SMM Pro', 'smm', 0.18, 1.1, 0.22, 0.015, 990_000, 70], // lid ko'p, sotuv past
  ['Bolalar ingliz tili', 'kids', 0.35, 2.0, 0.1, 0.09, 790_000, 35],
];
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const REASONS_MIX = {
  smm: { expensive: 0.15, no_answer: 0.2, thinking: 0.15, not_target: 0.35, no_money: 0.15 },
  default: { expensive: 0.3, no_answer: 0.25, later: 0.2, thinking: 0.15, competitor: 0.1 },
};

// end — oxirgi kun (bugun); oxirgi kunda ba'zi rollar hali kiritmagan bo'lib ko'rinadi
const CHANNELS = ['@ielts_uz', '@til_markazi', '@it_yangiliklar', '@biznes_kanal', '@ota_onalar', '@talabalar_uz'];
const PLATFORM_CYCLE = ['channel_post', 'telegram_ads', 'instagram', 'channel_post', 'blogger'];
// Oylik reja koeffitsienti: joriy sur'atga nisbatan (>1 — reja qiyinroq)
const PLAN_K = { ielts: 1.0, python: 1.05, smm: 1.6, kids: 1.25 };

export function generateDemo(end, days = 45) {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const jitter = (x, k = 0.25) => x * (1 - k + rand() * 2 * k);
  const projects = [], daily = [], reasons = [], campaigns = [], plans = [];

  PROJECTS.forEach(([name, slug, cpc, organicK, s2l, l2s, check, budget], i) => {
    const id = i + 1;
    projects.push({ id, name, slug, kind: 'kurs', color: COLORS[i], avg_check: check });
    for (let k = days - 1; k >= 0; k--) {
      const date = addDays(end, -k);
      const growth = 1 + (days - 1 - k) * (slug === 'python' ? 0.012 : slug === 'kids' ? -0.004 : 0.006);
      const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? 0.8 : 1;
      const spend = Math.round(jitter(budget * growth * weekend) * 100) / 100;
      const clicks = Math.round(spend / jitter(cpc, 0.15));
      const starts = Math.round(clicks * jitter(organicK, 0.15));
      const leads = Math.round(starts * jitter(s2l, 0.2));
      const sales = Math.round(leads * jitter(l2s, 0.35));
      const revenue = Math.round(sales * jitter(check, 0.1) / 1000) * 1000;
      const repeat = rand() < 0.25 ? Math.max(1, Math.round(sales * 0.15)) : 0;
      const today0 = k === 0;
      const noLeads = today0 && slug === 'kids';
      const noSales = today0 && i % 2 === 1;
      daily.push({
        project_id: id, date, spend, impressions: Math.round(clicks * jitter(55)), clicks, bot_starts: starts,
        leads: noLeads ? null : leads, qualified: noLeads ? null : Math.round(leads * jitter(slug === 'smm' ? 0.25 : 0.55)),
        sales: noSales ? null : sales, revenue: noSales ? null : revenue,
        payments: today0 ? null : Math.round(revenue * 0.85), repeat_sales: repeat || null,
        repeat_revenue: repeat ? repeat * Math.round(check * 0.6) : null,
        note_target: k === 3 && slug === 'smm' ? 'Yangi kreativ ishga tushdi, klik arzonlashdi' : null,
        note_lead: k === 2 && slug === 'smm' ? "Lidlarning ko'pi tasodifiy, kurs nima ekanini bilmaydi" : null,
        note_sales: k === 1 && slug === 'smm' ? "Qo'ng'iroqlarga javob bermayapti, narxni eshitib o'ylab ko'raman deyishyapti" : null,
        note_finance: null,
      });
      const lost = Math.max(leads - sales, 0);
      if (!today0 && lost > 0) {
        for (const [reason, share] of Object.entries(REASONS_MIX[slug] || REASONS_MIX.default)) {
          const c = Math.round(lost * share * jitter(1, 0.3));
          if (c > 0) reasons.push({ project_id: id, date, reason, count: c });
        }
      }
    }

    // Reklama postlari: har 3 kunda bitta, kunlik xarajatning bir qismi
    const mine = daily.filter((r) => r.project_id === id);
    let n = 1;
    for (let k = mine.length - 1; k >= 0; k -= 3) {
      const r = mine[k];
      const platform = PLATFORM_CYCLE[(n + i) % PLATFORM_CYCLE.length];
      const share = jitter(0.55, 0.3);
      const pk = { channel_post: 1.0, telegram_ads: 0.8, instagram: 0.55, blogger: 1.3 }[platform];
      const spend = Math.round(r.spend * share * 3 * 100) / 100;
      const clicks = Math.round(r.clicks * share * 3 * pk);
      const starts = Math.round(clicks * jitter(organicK, 0.2));
      const leads = Math.round(starts * jitter(s2l, 0.25));
      campaigns.push({
        project_id: id, date: r.date, platform, spend, clicks, starts, leads, sales: Math.round(leads * jitter(l2s, 0.4)),
        name: platform === 'blogger' ? `Bloger integratsiyasi #${n}` : platform === 'channel_post' ? `${CHANNELS[(n + i) % CHANNELS.length]} posti` : `${slug.toUpperCase()} kreativ #${n}`,
        tag: `${platform === 'channel_post' ? 'kanal' : platform === 'telegram_ads' ? 'tgads' : platform === 'instagram' ? 'insta' : 'bloger'}_${n}`,
        note: null,
      });
      n++;
    }

    // Oylik reja: oxirgi 14 kun sur'ati bo'yicha × koeffitsient
    const recent = mine.slice(-15, -1);
    const perDay = (f) => recent.reduce((a, r) => a + (r[f] || 0), 0) / recent.length;
    const month = end.slice(0, 7);
    const dim = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const k = PLAN_K[slug] || 1;
    const round = (x, step) => Math.round(x / step) * step;
    plans.push({
      project_id: id, month,
      budget: round(perDay('spend') * dim * 0.95, 50),
      leads: round(perDay('leads') * dim * k, 10),
      sales: round(perDay('sales') * dim * k, 5),
      revenue: round(perDay('revenue') * dim * k, 1_000_000),
    });
  });
  return { projects, daily, reasons, campaigns, plans };
}
