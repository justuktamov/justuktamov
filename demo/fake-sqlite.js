// Brauzer demosi uchun node:sqlite o'rnini bosuvchi: metrics.js va reports.js ishlatadigan
// so'rovlarni xotiradagi massivlar ustida bajaradi.
export const store = { projects: [], daily: [], plans: [], reports: [], reasons: [], settings: {} };

const inRange = (d, from, to) => d >= from && d <= to;
const byDateDesc = (a, b) => (a.date < b.date ? 1 : -1);

const QUERIES = [
  [/^SELECT \* FROM projects WHERE active = 1 ORDER BY id$/, { all: () => store.projects.filter((p) => p.active) }],
  [/^SELECT \* FROM daily WHERE date BETWEEN \? AND \? AND project_id IN/, {
    all: (from, to, ...ids) => store.daily.filter((r) => inRange(r.date, from, to) && ids.includes(r.project_id)).map((r) => ({ ...r })),
  }],
  [/^SELECT \* FROM reasons WHERE date BETWEEN \? AND \?$/, { all: (from, to) => store.reasons.filter((r) => inRange(r.date, from, to)).map((r) => ({ ...r })) }],
  [/^SELECT \* FROM plans WHERE month = \?$/, { all: (m) => store.plans.filter((p) => p.month === m).map((p) => ({ ...p })) }],
  [/^PRAGMA table_info/, { all: () => [] }],
  [/^SELECT \* FROM daily_reports WHERE date = \?$/, { get: (d) => { const r = store.reports.find((x) => x.date === d); return r && { ...r }; } }],
  [/^SELECT date, director_comment FROM daily_reports WHERE date < \? AND director_comment IS NOT NULL/, { get: (d) => [...store.reports].filter((x) => x.date < d && x.director_comment).sort(byDateDesc)[0] }],
  [/^SELECT date FROM daily_reports ORDER BY date DESC LIMIT \?$/, { all: (n) => [...store.reports].sort(byDateDesc).slice(0, n).map((r) => ({ date: r.date })) }],
  [/^INSERT INTO daily_reports \(date, author_id, status, summary, tomorrow, project_notes, updated_at\)/, {
    run: (date, author_id, summary, tomorrow, project_notes, updated_at) => {
      const r = store.reports.find((x) => x.date === date);
      if (r) Object.assign(r, { author_id, summary, tomorrow, project_notes, updated_at });
      else store.reports.push({ date, author_id, status: 'draft', summary, tomorrow, project_notes, updated_at });
      return {};
    },
  }],
  [/^UPDATE daily_reports SET status = 'submitted'/, { run: (at, uid, date) => { Object.assign(store.reports.find((x) => x.date === date), { status: 'submitted', submitted_at: at, author_id: uid }); return {}; } }],
  [/^SELECT id, name FROM users$/, { all: () => [{ id: 1, name: 'Dilshod' }] }],
  [/^SELECT value FROM settings WHERE key = \?$/, { get: (k) => (k in store.settings ? { value: store.settings[k] } : undefined) }],
];

export class DatabaseSync {
  exec() {}
  prepare(sql) {
    const s = sql.replace(/\s+/g, ' ').trim();
    const hit = QUERIES.find(([re]) => re.test(s));
    if (!hit) throw new Error(`Demo: qo'llab-quvvatlanmagan so'rov: ${s.slice(0, 80)}`);
    return { all: (...a) => hit[1].all(...a), get: (...a) => hit[1].get?.(...a), run: (...a) => (hit[1].run ? hit[1].run(...a) : {}) };
  }
}
