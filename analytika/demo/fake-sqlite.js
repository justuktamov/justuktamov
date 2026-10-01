// Brauzer demosi uchun node:sqlite o'rnini bosuvchi: metrics.js, db.js va telegram.js ishlatadigan
// so'rovlarni xotiradagi massivlar ustida bajaradi.
export const store = { projects: [], daily: [], reasons: [], events: [], campaigns: [], plans: [], users: [], settings: {} };

const inRange = (d, from, to) => d >= from && d <= to;

const QUERIES = [
  [/^SELECT \* FROM projects WHERE active = 1 ORDER BY id$/, { all: () => store.projects.filter((p) => p.active) }],
  [/^SELECT id, name FROM projects WHERE active = 1 ORDER BY id$/, { all: () => store.projects.filter((p) => p.active).map(({ id, name }) => ({ id, name })) }],
  [/^SELECT \* FROM daily WHERE date BETWEEN \? AND \? AND project_id IN/, {
    all: (from, to, ...ids) => store.daily.filter((r) => inRange(r.date, from, to) && ids.includes(r.project_id)).map((r) => ({ ...r })),
  }],
  [/^SELECT \* FROM daily WHERE project_id = \? AND date = \?$/, { get: (id, date) => store.daily.find((r) => r.project_id === id && r.date === date) }],
  [/^SELECT project_id, date, type, COUNT\(\*\) AS n FROM events/, { all: () => [] }],
  [/^SELECT project_id, source, type, COUNT\(\*\) AS n FROM events/, { all: () => [] }],
  [/^SELECT reason, SUM\(count\) AS n FROM loss_reasons WHERE date BETWEEN \? AND \? AND project_id = \?/, { all: (from, to, id) => groupReasons(store.reasons.filter((r) => inRange(r.date, from, to) && r.project_id === id)) }],
  [/^SELECT l\.reason, SUM\(l\.count\) AS n FROM loss_reasons l JOIN projects p/, {
    all: (from, to) => groupReasons(store.reasons.filter((r) => inRange(r.date, from, to) && store.projects.find((p) => p.id === r.project_id)?.active)),
  }],
  [/^SELECT \* FROM plans WHERE month = \?$/, { all: (m) => store.plans.filter((p) => p.month === m).map((p) => ({ ...p })) }],
  [/^SELECT c\.\*, p\.name AS project_name/, {
    all: (from, to) => store.campaigns.filter((c) => inRange(c.date, from, to)).map((c) => {
      const p = store.projects.find((x) => x.id === c.project_id);
      return { ...c, project_name: p?.name, project_slug: p?.slug, project_color: p?.color };
    }).sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)),
  }],
  [/^SELECT id, name, role FROM users WHERE active = 1$/, { all: () => store.users.filter((u) => u.active).map(({ id, name, role }) => ({ id, name, role })) }],
  [/^SELECT value FROM settings WHERE key = \?$/, { get: (k) => (k in store.settings ? { value: store.settings[k] } : undefined) }],
];

function groupReasons(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.reason, (m.get(r.reason) || 0) + r.count);
  return [...m].map(([reason, n]) => ({ reason, n }));
}

export class DatabaseSync {
  exec() {}
  prepare(sql) {
    const s = sql.replace(/\s+/g, ' ').trim();
    const hit = QUERIES.find(([re]) => re.test(s));
    if (!hit) throw new Error(`Demo: qo'llab-quvvatlanmagan so'rov: ${s.slice(0, 80)}`);
    return { all: (...a) => hit[1].all(...a), get: (...a) => hit[1].get?.(...a), run: () => ({}) };
  }
}
