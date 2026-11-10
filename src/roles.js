// Rollar va ruxsatlar. Server ham, brauzer demosi ham shu qoidalardan foydalanadi.
//   pm        — proekt menejer: hammasini ko'radi va tuzatadi, tekshiradi, direktorga yuboradi; xodim qo'shadi va RUXSAT beradi
//   director  — direktor: PM kabi — hammasini ko'radi va tuzatadi (boshqaruvchi)
//   target    — targetolog: target raqamlari (xarajat, ko'rish, klik, lidlar va manbasi)
//   rop       — sotuv bo'limi rahbari: lidlar sifati, holati, sabablar, sotuv va tushum; sotuv xodimlari
//   marketing — marketing rahbari: marketing xarajatlari (kontent, SMM, tadbir, offline reklama…)
//   finance   — moliyachi: operatsion xarajatlar (ish haqi, ijara, soliq…)
// Hamma hamma bo'limni KO'RADI (statistika ochiq). Bo'limga KIRITISH — faqat o'z bo'limiga (ruxsatni PM yoki direktor beradi).
// Har kimning o'z kabineti bor: kirganda o'z ishi ochiladi
export const ROLES = {
  pm: 'Proekt menejer',
  director: 'Direktor',
  target: 'Targetolog',
  rop: "Sotuv bo'limi rahbari (ROP)",
  marketing: 'Marketing rahbari',
  finance: 'Moliyachi',
};

// Kiritish bo'limlari — PM har xodimga qaysi biriga ruxsat berishini belgilaydi
export const SECTIONS = {
  target: 'Target hisoboti',
  rop: 'Sotuv hisoboti (ROP)',
  sellers: 'Sotuv xodimlari',
  marketing: 'Marketing xarajatlari',
  finance: 'Moliya (operatsion xarajatlar)',
};
// Yangi xodimga rolga qarab beriladigan ruxsat (PM keyin o'zgartiradi)
export const ROLE_ACCESS = {
  pm: Object.keys(SECTIONS),
  director: Object.keys(SECTIONS),
  target: ['target'],
  rop: ['rop', 'sellers'],
  marketing: ['marketing'],
  finance: ['finance'],
};

// Har rol kiritadigan maydonlar (daily jadvali). Avtovoronkada (bot) bot start, xarid va tushum — ROP qismida
export const PARTS = {
  target: {
    title: 'Target hisoboti',
    fields: ['spend', 'spend_blogger', 'spend_posts', 'impressions', 'clicks', 'target_leads', 'tl_web', 'tl_bot', 'new_creatives'],
    texts: ['creative_best', 'creative_worst', 'note_target'],
    // Yuborishdan oldin har loyihada to'ldirilishi shart
    required: ['spend', 'clicks'],
    rate: true,
    reasons: false,
  },
  rop: {
    title: 'Sotuv hisoboti',
    fields: ['leads', 'calls', 'qualified', 'unqualified', 'potential', 'st_nopickup', 'st_callback', 'st_thinking', 'st_video', 'st_later', 'src_ig', 'src_tg', 'sales', 'revenue', 'starts'],
    texts: ['note_sales'],
    required: ['leads', 'sales', 'revenue'],
    autoRequired: ['sales', 'revenue'],
    rate: false,
    reasons: true,
  },
};

// Boshqaruvchilar — PM va direktor: hammasini ko'radi, tuzatadi va ruxsat beradi; qolganlar — xodim (faqat o'z bo'limiga)
export const ADMIN_ROLES = ['pm', 'director'];
export const isAdmin = (u) => Boolean(u) && ADMIN_ROLES.includes(u.role || 'pm');
export const isPm = isAdmin;
export const isStaff = (u) => Boolean(u) && !isAdmin(u);

// Saqlangan ruxsat: «target,sellers»; null — rolga qarab (ROLE_ACCESS); '' — hech qaysi
export function parseAccess(v) {
  return String(v ?? '').split(',').map((x) => x.trim()).filter((x) => SECTIONS[x]);
}
export function userAccess(u) {
  if (!u) return [];
  if (isPm(u)) return Object.keys(SECTIONS);
  if (u.access == null) return [...(ROLE_ACCESS[u.role] || [])];
  return parseAccess(u.access);
}
export const canEdit = (u, section) => userAccess(u).includes(section);
// Kunlik hisobot qismlari (target / rop) — shu xodim qaysilarini yuboradi
export const userParts = (u) => (isPm(u) ? [] : userAccess(u).filter((s) => PARTS[s]));
// Saqlash uchun: ro'yxat → «target,rop» ('' — hech qaysi)
export function normalizeAccess(v) {
  const list = Array.isArray(v) ? v : String(v ?? '').split(',');
  const bad = list.map((x) => String(x).trim()).filter(Boolean).find((x) => !SECTIONS[x]);
  if (bad) { const e = new Error(`Noma'lum bo'lim: ${bad}`); e.status = 400; throw e; }
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))].join(',');
}

// Foydalanuvchiga biriktirilgan loyihalar: bo'sh — hammasi
export function userProjects(u) {
  return String(u?.projects ?? '').split(',').map((x) => Number(x.trim())).filter((x) => Number.isSafeInteger(x) && x > 0);
}
export function canSeeProject(u, projectId) {
  if (!isStaff(u)) return true;
  const list = userProjects(u);
  return !list.length || list.includes(Number(projectId));
}

// Xodim shu maydonni yoza oladimi: ruxsat berilgan qism(lar)ning maydoni bo'lsa (PM — hammasini)
export function canWriteField(u, field) {
  if (isPm(u)) return true;
  return userParts(u).some((part) => PARTS[part].fields.includes(field) || PARTS[part].texts.includes(field));
}

// Yuborishdan oldin: qaysi loyihada qaysi majburiy raqam yo'q — [{ project, fields: [...] }]
export function missingFor(role, projects, rowOf) {
  const p = PARTS[role];
  const out = [];
  for (const pr of projects) {
    const req = pr.kind === 'auto' && p.autoRequired ? p.autoRequired : p.required;
    const row = rowOf(pr.id) || {};
    const miss = req.filter((f) => row[f] == null);
    if (miss.length) out.push({ project: pr.name, fields: miss });
  }
  return out;
}

// Xodimning loyihalar ro'yxati — saqlash uchun: «1,3» yoki null (hammasi)
export function normalizeProjectIds(v, known) {
  if (v == null || v === '') return null;
  const list = (Array.isArray(v) ? v : String(v).split(',')).map((x) => Number(String(x).trim())).filter((x) => x > 0);
  const bad = list.find((x) => !known.has(x));
  if (bad) { const e = new Error(`Loyiha topilmadi: ${bad}`); e.status = 400; throw e; }
  const uniq = [...new Set(list)];
  return uniq.length ? uniq.join(',') : null;
}
