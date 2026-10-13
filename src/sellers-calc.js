// Sotuv xodimlari (operatorlar): maydonlar, qo'ng'iroq vaqti va jamlash — server ham, brauzer demosi ham shundan foydalanadi
export const SELLER_FIELDS = {
  leads: 'Umumiy lidlar soni',
  qualified: 'Sifatli lid soni',
  sales: 'Sotuv',
  cancelled: "Bekor bo'ldi",
  unqualified: 'Sifatsiz lidlar',
  call_sec: 'Call duration',
};
export const SELLER_KEYS = Object.keys(SELLER_FIELDS);

// «26:47:47», «47:05» (daqiqa:soniya) yoki «95» (daqiqa) → soniya; bo'sh — null
export function parseDuration(v) {
  if (v == null || String(v).trim() === '') return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 60);
  const m = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!m) { const e = new Error(`Vaqt noto'g'ri: ${s} (masalan, 2:15:30 yoki 45:10)`); e.status = 400; throw e; }
  return m[3] != null ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
}
// Soniya → «26:47:47» (soat 24 dan oshishi mumkin)
export function fmtDuration(sec) {
  if (sec == null) return '';
  const t = Math.round(sec);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const div = (a, b) => (b > 0 ? a / b : null);
// Xodim (yoki jami) qatoriga konversiyalar
export function withConv(r) {
  return { ...r, conv: div(r.sales, r.leads), conv_q: div(r.sales, r.qualified) };
}

// Davr bo'yicha jamlash: loyiha → xodimlar qatorlari (+ jami). rows — seller_daily yozuvlari
export function sellerStats(rows, sellers, projects) {
  return projects.map((p) => {
    const by = new Map();
    for (const r of rows.filter((x) => x.project_id === p.id)) {
      const cur = by.get(r.seller_id) || { seller_id: r.seller_id, days: 0, ...Object.fromEntries(SELLER_KEYS.map((k) => [k, 0])) };
      cur.days += 1;
      for (const k of SELLER_KEYS) cur[k] += Number(r[k]) || 0;
      by.set(r.seller_id, cur);
    }
    const list = sellers.filter((s) => by.has(s.id)).map((s) => withConv({ ...by.get(s.id), name: s.name, active: s.active }));
    const total = withConv(Object.fromEntries(SELLER_KEYS.map((k) => [k, list.reduce((a, x) => a + x[k], 0)])));
    return { id: p.id, name: p.name, color: p.color, rows: list, total };
  }).filter((p) => p.rows.length);
}

// Xodim shu loyihada ishlaydimi (bo'sh — hamma sotuv loyihalari)
export function sellerInProject(s, projectId) {
  const list = String(s.projects ?? '').split(',').map(Number).filter(Boolean);
  return !list.length || list.includes(Number(projectId));
}
