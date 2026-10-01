// Proekt menejerning direktorga kunlik hisoboti: qoralama → yuborildi → ko'rib chiqildi
import { getDb } from './db.js';
import { summary, recommendations, missingReport, addDays, PROJECT_STATUS } from './metrics.js';

const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export function getReport(date) {
  const r = getDb().prepare('SELECT * FROM daily_reports WHERE date = ?').get(date);
  if (!r) return null;
  const users = getDb().prepare('SELECT id, name FROM users').all();
  const name = (id) => users.find((u) => u.id === id)?.name || null;
  let notes = {};
  try { notes = JSON.parse(r.project_notes || '{}'); } catch { /* buzilgan JSON — bo'sh */ }
  return { ...r, project_notes: notes, author_name: name(r.author_id), reviewer_name: name(r.reviewed_by) };
}

// Hisobot sahifasi uchun hamma narsa bitta javobda: kun raqamlari, 7 kunlik tavsiyalar, kim kiritmagani
export function reportBundle(date) {
  const day = summary({ from: date, to: date });
  const rec = recommendations({ from: addDays(date, -6), to: date });
  return {
    date,
    report: getReport(date),
    day: { totals: day.totals, byProject: day.byProject, delta: day.delta, prevFrom: day.prevFrom },
    rec,
    plan: day.plan,
    missing: missingReport(date),
    statuses: PROJECT_STATUS,
  };
}

function cleanNotes(notes) {
  const out = {};
  for (const [pid, n] of Object.entries(notes || {})) {
    if (!/^\d+$/.test(pid)) continue;
    const status = PROJECT_STATUS[n?.status] ? n.status : null;
    const comment = String(n?.comment ?? '').trim().slice(0, 1000) || null;
    if (status || comment) out[pid] = { status, comment };
  }
  return out;
}

export function saveDraft(date, userId, { summary: text, tomorrow, project_notes }) {
  const cur = getReport(date);
  if (cur?.status === 'reviewed') {
    const err = new Error("Direktor ko'rib chiqqan hisobotni o'zgartirib bo'lmaydi");
    err.status = 409;
    throw err;
  }
  getDb().prepare(`INSERT INTO daily_reports (date, author_id, status, summary, tomorrow, project_notes, updated_at)
    VALUES (?, ?, 'draft', ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET author_id = excluded.author_id, summary = excluded.summary, tomorrow = excluded.tomorrow,
      project_notes = excluded.project_notes, updated_at = excluded.updated_at`)
    .run(date, userId, String(text ?? '').trim().slice(0, 4000) || null, String(tomorrow ?? '').trim().slice(0, 2000) || null,
      JSON.stringify(cleanNotes(project_notes)), nowIso());
  return getReport(date);
}

export function submitReport(date, userId) {
  if (!getReport(date)) saveDraft(date, userId, {});
  getDb().prepare("UPDATE daily_reports SET status = 'submitted', submitted_at = ?, author_id = ? WHERE date = ?").run(nowIso(), userId, date);
  return getReport(date);
}

export function reviewReport(date, userId, comment) {
  const cur = getReport(date);
  if (!cur || cur.status === 'draft') {
    const err = new Error('Hisobot hali yuborilmagan');
    err.status = 409;
    throw err;
  }
  getDb().prepare("UPDATE daily_reports SET status = 'reviewed', reviewed_by = ?, reviewed_at = ?, director_comment = ? WHERE date = ?")
    .run(userId, nowIso(), String(comment ?? '').trim().slice(0, 2000) || null, date);
  return getReport(date);
}

export function listReports(limit = 30) {
  const rows = getDb().prepare('SELECT date FROM daily_reports ORDER BY date DESC LIMIT ?').all(limit);
  return rows.map((r) => {
    const full = getReport(r.date);
    return { date: full.date, status: full.status, author_name: full.author_name, reviewer_name: full.reviewer_name, submitted_at: full.submitted_at, reviewed_at: full.reviewed_at, summary: full.summary, director_comment: full.director_comment };
  });
}

// Telegram uchun (HTML parse_mode)
const n = (x) => Math.round(x || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
const p = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const ICON = { unprofitable: '🔴', sales_issue: '🟠', creative: '🟠', needs_leads: '🟡', scale: '🟢', good: '🟢', nodata: '⚪' };

export function reportText(date) {
  const b = reportBundle(date);
  const r = b.report || {};
  const t = b.day.totals;
  const lines = [
    `<b>📋 PM hisoboti — ${date}</b>${r.author_name ? `\nTayyorladi: ${esc(r.author_name)}` : ''}`,
    '',
    `💸 Target: <b>$${t.spend.toFixed(0)}</b> · klik <b>${n(t.clicks)}</b> · lid <b>${n(t.leads)}</b> · lid narxi <b>${t.cpl == null ? '—' : `$${t.cpl.toFixed(2)}`}</b>`,
    `💰 Sotuv <b>${n(t.sales)}</b> · tushum <b>${n(t.total_revenue)} so'm</b> · lid→sotuv <b>${p(t.lead_to_sale)}</b>`,
    '',
  ];
  for (const pr of b.day.byProject) {
    const rec = b.rec.projects.find((x) => x.id === pr.id);
    const note = r.project_notes?.[pr.id] || {};
    const status = note.status || rec?.status || 'nodata';
    lines.push(`${ICON[status]} <b>${esc(pr.name)}</b> — ${esc(PROJECT_STATUS[status])}`);
    lines.push(`   $${pr.spend.toFixed(0)} · ${n(pr.clicks)} klik · ${n(pr.leads)} lid · ${n(pr.sales)} sotuv${pr.cpl != null ? ` · lid $${pr.cpl.toFixed(2)}` : ''}`);
    if (note.comment) lines.push(`   💬 ${esc(note.comment)}`);
  }
  if (r.summary) lines.push('', `<b>Xulosa:</b> ${esc(r.summary)}`);
  if (r.tomorrow) lines.push(`<b>Ertaga:</b> ${esc(r.tomorrow)}`);
  const up = b.rec.allocation.filter((a) => a.change > 0.02).map((a) => esc(a.name));
  const down = b.rec.allocation.filter((a) => a.change < -0.02).map((a) => esc(a.name));
  if (up.length || down.length) lines.push('', `<b>Byudjet (7 kun asosida):</b>${up.length ? ` ↑ ${up.join(', ')}` : ''}${down.length ? ` · ↓ ${down.join(', ')}` : ''}`);
  if (b.rec.worstCreatives.length) lines.push(`<b>Ishlamayotgan kreativlar:</b> ${b.rec.worstCreatives.slice(0, 3).map((c) => `«${esc(c.name)}»`).join(', ')}`);
  return lines.join('\n');
}
