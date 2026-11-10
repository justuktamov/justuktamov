// Rollar: kim qaysi raqamlarni kiritadi. Server ham, brauzer demosi ham shu qoidalardan foydalanadi.
//   pm      — proekt menejer: hammasini ko'radi, tekshiradi, tuzatadi va direktorga yuboradi; xodimlarni qo'shadi
//   target  — targetolog: o'z loyihalari bo'yicha target raqamlari (xarajat, ko'rish, klik, lidlar va manbasi)
//   rop     — sotuv bo'limi rahbari: lidlar sifati, holati, sabablar, sotuv va tushum
export const ROLES = {
  pm: 'Proekt menejer',
  target: 'Targetolog',
  rop: "Sotuv bo'limi rahbari (ROP)",
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

export const isStaff = (u) => Boolean(u && PARTS[u.role]);

// Foydalanuvchiga biriktirilgan loyihalar: bo'sh — hammasi
export function userProjects(u) {
  return String(u?.projects ?? '').split(',').map((x) => Number(x.trim())).filter((x) => Number.isSafeInteger(x) && x > 0);
}
export function canSeeProject(u, projectId) {
  if (!isStaff(u)) return true;
  const list = userProjects(u);
  return !list.length || list.includes(Number(projectId));
}

// Xodim shu maydonni yoza oladimi (PM — hammasini)
export function canWriteField(u, field) {
  if (!isStaff(u)) return true;
  const p = PARTS[u.role];
  return p.fields.includes(field) || p.texts.includes(field);
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
