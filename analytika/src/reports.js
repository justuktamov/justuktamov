// Proekt menejerning direktorga kunlik hisoboti: qoralama → yuborildi → ko'rib chiqildi
import { getDb } from './db.js';
import { summary, weekStatus, addDays, dailyAdvice, PROJECT_STATUS, ADVICE_WHO } from './metrics.js';

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

// Hisobot sahifasi uchun hamma narsa bitta javobda: kun raqamlari, tahlil, 7 kunlik holat
export function reportBundle(date) {
  const day = summary({ from: date, to: date });
  const week = weekStatus({ from: addDays(date, -6), to: date });
  // Direktorning oxirgi javobi (kechagi yoki undan oldingi hisobotga) — PM bugun shuni bajaradi
  const prev = getDb().prepare('SELECT date, director_comment FROM daily_reports WHERE date < ? AND director_comment IS NOT NULL ORDER BY date DESC LIMIT 1').get(date);
  return {
    date,
    report: getReport(date),
    advice: dailyAdvice(date, day, week),
    adviceWho: ADVICE_WHO,
    prevReply: prev && prev.date >= addDays(date, -3) ? { date: prev.date, text: prev.director_comment } : null,
    day: { totals: day.totals, byProject: day.byProject },
    week,
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

// Direktor Telegramda hisobotga javob (reply) yozsa — yechim sifatida saqlanadi va PM ga ko'rinadi
export function addDirectorReply(date, text, userId = null) {
  const cur = getReport(date);
  const msg = String(text ?? '').trim().slice(0, 2000);
  if (!cur || cur.status === 'draft' || !msg) return null;
  const comment = [cur.director_comment, msg].filter(Boolean).join('\n').slice(0, 4000);
  getDb().prepare("UPDATE daily_reports SET status = 'reviewed', reviewed_by = ?, reviewed_at = ?, director_comment = ? WHERE date = ?")
    .run(userId, nowIso(), comment, date);
  return getReport(date);
}

export function latestSentDate() {
  return getDb().prepare("SELECT date FROM daily_reports WHERE status != 'draft' ORDER BY date DESC LIMIT 1").get()?.date || null;
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

const usd = (x) => (x == null ? '—' : `$${x.toFixed(2)}`);
const sum = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(1).replace('.0', '')} mln` : n(x));
export const REPORT_HEAD = 'PM hisoboti —';

export function reportText(date) {
  const b = reportBundle(date);
  const r = b.report || {};
  const t = b.day.totals;
  const lines = [
    `<b>📋 ${REPORT_HEAD} ${date}</b>${r.author_name ? `\nTayyorladi: ${esc(r.author_name)}` : ''}`,
    '',
    `💸 Target: <b>$${t.spend.toFixed(0)}</b> · klik <b>${n(t.clicks)}</b> · lid <b>${n(t.leads)}</b> · 1 lid <b>${usd(t.cpl)}</b>`,
    `💰 Sotuv <b>${n(t.sales)}</b> · <b>${sum(t.total_revenue)} so'm</b> · lid→sotuv <b>${p(t.lead_to_sale)}</b>`,
  ];
  for (const pr of b.day.byProject) {
    const wk = b.week.projects.find((x) => x.id === pr.id);
    const note = r.project_notes?.[pr.id] || {};
    const adv = b.advice[pr.id] || { problems: [], proposals: [] };
    const status = note.status || adv.status || wk?.status || 'nodata';
    const q = [['sifatli', pr.qualified, 'qualified'], ['potensial', pr.potential, 'potential'], ['sifatsiz', pr.unqualified, 'unqualified']]
      .filter(([, , f]) => pr.reported[f]).map(([l, v]) => `${l} ${n(v)}`);
    lines.push('', `${ICON[status]} <b>${esc(pr.name)}</b> — ${esc(PROJECT_STATUS[status])}`);
    lines.push(`   $${pr.spend.toFixed(0)} · ${n(pr.clicks)} klik · 1 lid ${usd(pr.cpl)}`);
    lines.push(`   ${n(pr.leads)} lid${q.length ? ` (${q.join(' · ')})` : ''} · ${n(pr.sales)} sotuv · ${sum(pr.total_revenue)} so'm`);
    if (adv.best) lines.push(`   ⭐ Yaxshi kreativ: ${esc(adv.best)}`);
    if (adv.worst) lines.push(`   👎 Ishlamayotgan: ${esc(adv.worst)}`);
    for (const pb of adv.problems) lines.push(`   ⚠️ ${esc(pb.text)}`);
    const proposal = note.comment || adv.proposals.join('\n');
    for (const l of proposal.split('\n').map((x) => x.replace(/^[•\-\s]+/, '').trim()).filter(Boolean)) lines.push(`   💡 ${esc(l)}`);
  }
  if (r.summary) lines.push('', `<b>Xulosa:</b> ${esc(r.summary)}`);
  if (r.tomorrow) lines.push(`<b>Ertaga:</b> ${esc(r.tomorrow)}`);
  const up = b.week.allocation.filter((a) => a.change > 0.02).map((a) => esc(a.name));
  const down = b.week.allocation.filter((a) => a.change < -0.02).map((a) => esc(a.name));
  if (up.length || down.length) lines.push('', `<b>Byudjet (7 kun asosida):</b>${up.length ? ` ↑ ${up.join(', ')}` : ''}${down.length ? ` · ↓ ${down.join(', ')}` : ''}`);
  lines.push('', '↩️ <i>Yechimingizni shu xabarga javob (reply) qilib yozing — PM ga yetkaziladi.</i>');
  return lines.join('\n');
}
