// Brauzer demosi uchun node:sqlite o'rnini bosuvchi: metrics.js, db.js va telegram.js ishlatadigan
// so'rovlarni xotiradagi massivlar ustida bajaradi.
export const store = { projects: [], daily: [], reasons: [], events: [], campaigns: [], plans: [], users: [], reports: [], tasks: [], expenses: [], settings: {} };
const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;

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
  [/^PRAGMA table_info/, { all: () => [] }],
  [/^SELECT \* FROM daily_reports WHERE date = \?$/, { get: (d) => { const r = store.reports.find((x) => x.date === d); return r && { ...r }; } }],
  [/^SELECT status FROM daily_reports WHERE date = \?$/, { get: (d) => store.reports.find((x) => x.date === d) }],
  [/^SELECT date FROM daily_reports ORDER BY date DESC LIMIT \?$/, { all: (n) => [...store.reports].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n).map((r) => ({ date: r.date })) }],
  [/^INSERT INTO daily_reports \(date, author_id, status, summary, tomorrow, project_notes, updated_at\)/, {
    run: (date, author_id, summary, tomorrow, project_notes, updated_at) => {
      const r = store.reports.find((x) => x.date === date);
      if (r) Object.assign(r, { author_id, summary, tomorrow, project_notes, updated_at });
      else store.reports.push({ date, author_id, status: 'draft', summary, tomorrow, project_notes, updated_at });
      return {};
    },
  }],
  [/^UPDATE daily_reports SET status = 'submitted'/, { run: (at, uid, date) => { Object.assign(store.reports.find((x) => x.date === date), { status: 'submitted', submitted_at: at, author_id: uid }); return {}; } }],
  [/^UPDATE daily_reports SET status = 'reviewed'/, { run: (uid, at, comment, date) => { Object.assign(store.reports.find((x) => x.date === date), { status: 'reviewed', reviewed_by: uid, reviewed_at: at, director_comment: comment }); return {}; } }],
  [/^SELECT id, name FROM users$/, { all: () => store.users.map(({ id, name }) => ({ id, name })) }],
  [/^SELECT name, role FROM users WHERE active = 1 ORDER BY id$/, { all: () => store.users.filter((u) => u.active).map(({ name, role }) => ({ name, role })) }],
  // Vazifalar
  [/^SELECT id, name, role FROM users$/, { all: () => store.users.map(({ id, name, role }) => ({ id, name, role })) }],
  [/^SELECT id, name, color FROM projects$/, { all: () => store.projects.map(({ id, name, color }) => ({ id, name, color })) }],
  [/^SELECT \* FROM tasks ORDER BY id DESC$/, { all: () => [...store.tasks].sort((a, b) => b.id - a.id).map((t) => ({ ...t })) }],
  [/^SELECT \* FROM tasks WHERE id = \?$/, { get: (id) => store.tasks.find((t) => t.id === Number(id)) }],
  [/^SELECT id FROM users WHERE role = \? AND active = 1 ORDER BY id$/, { get: (r) => store.users.find((u) => u.role === r && u.active) }],
  [/^SELECT id FROM users WHERE id = \? AND active = 1$/, { get: (id) => store.users.find((u) => u.id === Number(id) && u.active) }],
  [/^SELECT telegram_id FROM users WHERE id = \?$/, { get: () => undefined }],
  [/^INSERT INTO tasks /, { run: (title, detail, project_id, assignee_id, created_by, status, due_date, source, created_at) => {
    const id = nextId(store.tasks);
    store.tasks.push({ id, title, detail, project_id, assignee_id, created_by, status, due_date, source, created_at, done_at: null });
    return { lastInsertRowid: id };
  } }],
  [/^UPDATE tasks SET status = \?, done_at = \? WHERE id = \?$/, { run: (st, at, id) => { Object.assign(store.tasks.find((t) => t.id === Number(id)), { status: st, done_at: at }); return {}; } }],
  [/^UPDATE tasks SET (title|assignee_id|due_date) = \? WHERE id = \?$/, { run: function () { return {}; } }],
  [/^DELETE FROM tasks WHERE id = \?$/, { run: (id) => { store.tasks = store.tasks.filter((t) => t.id !== Number(id)); return {}; } }],
  // Xarajatlar
  [/^SELECT \* FROM expenses WHERE month = \? ORDER BY id DESC$/, { all: (m) => store.expenses.filter((e) => e.month === m).sort((a, b) => b.id - a.id).map((e) => ({ ...e })) }],
  [/^SELECT id FROM projects WHERE id = \?$/, { get: (id) => store.projects.find((p) => p.id === Number(id)) }],
  [/^INSERT INTO expenses /, { run: (project_id, month, category, amount, note, created_by, created_at) => {
    const id = nextId(store.expenses);
    store.expenses.push({ id, project_id, month, category, amount, note, created_by, created_at });
    return { lastInsertRowid: id };
  } }],
  [/^DELETE FROM expenses WHERE id = \?$/, { run: (id) => { store.expenses = store.expenses.filter((e) => e.id !== Number(id)); return {}; } }],
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
    const field = s.match(/^UPDATE tasks SET (title|assignee_id|due_date) = \?/)?.[1];
    if (field) return { run: (v, id) => { store.tasks.find((t) => t.id === Number(id))[field] = v; return {}; } };
    return { all: (...a) => hit[1].all(...a), get: (...a) => hit[1].get?.(...a), run: (...a) => (hit[1].run ? hit[1].run(...a) : {}) };
  }
}
