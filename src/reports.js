// Proekt menejerning direktorga kunlik hisoboti: qoralama → yuborildi → ko'rib chiqildi
import { getDb, nowLocal } from './db.js';
import { summary, weekStatus, addDays, dailyAdvice, PROJECT_STATUS, ADVICE_WHO } from './metrics.js';
import { buildAiInput, hashInput, aiText } from './ai/prompt.js';

const nowIso = () => nowLocal();

export function getReport(date) {
  const r = getDb().prepare('SELECT * FROM daily_reports WHERE date = ?').get(date);
  if (!r) return null;
  const users = getDb().prepare('SELECT id, name FROM users').all();
  const name = (id) => users.find((u) => u.id === id)?.name || null;
  let notes = {};
  try { notes = JSON.parse(r.project_notes || '{}'); } catch { /* buzilgan JSON — bo'sh */ }
  let ai = null;
  try { ai = r.ai_analysis ? JSON.parse(r.ai_analysis) : null; } catch { /* buzilgan JSON — yo'q deb hisoblanadi */ }
  const { ai_analysis: _raw, ...rest } = r;
  return { ...rest, project_notes: notes, ai, author_name: name(r.author_id), reviewer_name: name(r.reviewed_by) };
}

// Hisobot sahifasi uchun hamma narsa bitta javobda: kun raqamlari, tahlil, 7 kunlik holat
export function reportBundle(date) {
  const day = summary({ from: date, to: date });
  const week = weekStatus({ from: addDays(date, -6), to: date });
  // Direktorning oxirgi javobi (kechagi yoki undan oldingi hisobotga) — PM bugun shuni bajaradi
  const prev = getDb().prepare('SELECT date, director_comment FROM daily_reports WHERE date < ? AND director_comment IS NOT NULL ORDER BY date DESC LIMIT 1').get(date);
  const bundle = {
    date,
    report: getReport(date),
    advice: dailyAdvice(date, day, week),
    adviceWho: ADVICE_WHO,
    prevReply: prev && prev.date >= addDays(date, -3) ? { date: prev.date, text: prev.director_comment } : null,
    day: { totals: day.totals, byProject: day.byProject },
    week,
    statuses: PROJECT_STATUS,
  };
  bundle.ai = aiView(bundle);
  return bundle;
}

// Saqlangan AI tahlil: har loyiha uchun tayyor matn; stale — raqamlar tahlildan keyin o'zgargan
function aiView(bundle) {
  const a = bundle.report?.ai;
  if (!a?.projects) return null;
  return {
    at: a.at, provider: a.provider, model: a.model, xulosa: a.xulosa || '', ertaga: a.ertaga || '',
    texts: Object.fromEntries(Object.entries(a.projects).map(([id, x]) => [id, aiText(x)])),
    stale: a.input_hash !== hashInput(buildAiInput(bundle)),
  };
}

// AI natijasini saqlaydi. Hisobot qatori bo'lmasa — muallifsiz qoralama yaratiladi (PM hali tahlil qadamini saqlamagan)
export function saveAiAnalysis(date, result, inputHash) {
  getDb().prepare("INSERT INTO daily_reports (date, status, updated_at) VALUES (?, 'draft', ?) ON CONFLICT(date) DO NOTHING").run(date, nowIso());
  const data = { at: nowIso(), provider: result.provider, model: result.model, input_hash: inputHash, projects: result.projects, xulosa: result.xulosa, ertaga: result.ertaga };
  getDb().prepare('UPDATE daily_reports SET ai_analysis = ? WHERE date = ?').run(JSON.stringify(data), date);
  return reportBundle(date).ai;
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
  getDb().prepare(`INSERT INTO daily_reports (date, author_id, status, summary, tomorrow, project_notes, updated_at)
    VALUES (?, ?, 'draft', ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET author_id = excluded.author_id, summary = excluded.summary, tomorrow = excluded.tomorrow,
      project_notes = excluded.project_notes, updated_at = excluded.updated_at`)
    .run(date, userId, String(text ?? '').trim().slice(0, 4000) || null, String(tomorrow ?? '').trim().slice(0, 2000) || null,
      JSON.stringify(cleanNotes(project_notes)), nowIso());
  return getReport(date);
}

export function submitReport(date, userId) {
  // Hisobotni istalgan payt tuzatib qayta yuborish mumkin (direktor javob bergan bo'lsa ham) — javobi saqlanib qoladi
  const cur = getReport(date);
  if (!cur) saveDraft(date, userId, {});
  getDb().prepare("UPDATE daily_reports SET status = 'submitted', submitted_at = ?, author_id = ? WHERE date = ?").run(nowIso(), userId, date);
  return getReport(date);
}

// Direktor Telegramda hisobotga javob (reply) yozsa — yechim sifatida saqlanadi va PM ga ko'rinadi.
// allowUnsent — javob avtomatik hisobotga (PM yubormagan kun): yechim saqlanadi, lekin hisobot «ko'rildi» bo'lmaydi —
// PM keyin ham o'z hisobotini to'ldirib yuborishi mumkin
export function addDirectorReply(date, text, userId = null, { allowUnsent = false } = {}) {
  const cur = getReport(date);
  const msg = String(text ?? '').trim().slice(0, 2000);
  if (!msg) return null;
  const sent = cur && cur.status !== 'draft';
  if (!sent && !allowUnsent) return null;
  if (!cur) getDb().prepare("INSERT INTO daily_reports (date, status, updated_at) VALUES (?, 'draft', ?)").run(date, nowIso());
  const comment = [cur?.director_comment, msg].filter(Boolean).join('\n').slice(0, 4000);
  getDb().prepare('UPDATE daily_reports SET status = ?, reviewed_by = ?, reviewed_at = ?, director_comment = ? WHERE date = ?')
    .run(sent ? 'reviewed' : 'draft', userId, nowIso(), comment, date);
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
const sum = (x) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1).replace('.0', '')} mln` : n(x));
export const REPORT_HEAD = 'PM hisoboti —';

export function reportText(date) {
  const b = reportBundle(date);
  const r = b.report || {};
  const t = b.day.totals;
  const lines = [
    `<b>📋 ${REPORT_HEAD} ${date}</b>${r.author_name ? `\nTayyorladi: ${esc(r.author_name)}` : ''}`,
    '',
    `💸 Reklama: <b>$${t.spend.toFixed(0)}</b> (${sum(t.spend_uzs)} so'm)${t.spend_blogger || t.spend_posts ? ` — target $${t.target_spend.toFixed(0)}${t.spend_blogger ? `, bloger $${t.spend_blogger.toFixed(0)}` : ''}${t.spend_posts ? `, TG kanallar $${t.spend_posts.toFixed(0)}` : ''}` : ''} · klik <b>${n(t.clicks)}</b> · lid <b>${n(t.leads)}</b>`,
    `💰 Tushum: <b>${sum(t.revenue)} so'm</b> · sotuv <b>${n(t.sales)}</b>`,
    `${t.net_profit >= 0 ? '📈' : '📉'} Sof foyda: <b>${sum(t.net_profit)} so'm</b>${t.revenue ? ` (${p(t.net_margin)})` : ''} · reklamadan keyingi foyda ${sum(t.gross_profit)} so'm`,
  ];
  for (const pr of b.day.byProject) {
    const wk = b.week.projects.find((x) => x.id === pr.id);
    const note = r.project_notes?.[pr.id] || {};
    const adv = b.advice[pr.id] || { problems: [], proposals: [] };
    const status = note.status || adv.status || wk?.status || 'nodata';
    const q = [['sifatli', pr.qualified, 'qualified'], ['potensial', pr.potential, 'potential'], ['sifatsiz', pr.unqualified, 'unqualified']]
      .filter(([, , f]) => pr.reported[f]).map(([l, v]) => `${l} ${n(v)}`);
    lines.push('', `${ICON[status]} <b>${esc(pr.name)}</b> — ${esc(PROJECT_STATUS[status])}`);
    lines.push(`   $${pr.spend.toFixed(0)} · ${n(pr.clicks)} klik · ${pr.unit_label} ${usd(pr.unit_cost)}`);
    if (pr.kind === 'auto') lines.push(`   ${pr.reported.starts ? `${n(pr.starts)} bot start · ` : ''}${n(pr.sales)} xarid (${p(pr.conv)} ${pr.conv_label})`);
    else {
      lines.push(`   ${n(pr.leads)} lid${q.length ? ` (${q.join(' · ')})` : ''} · ${n(pr.sales)} sotuv`);
      const st = [["ko'tarmadi", 'st_nopickup'], ['qayta aloqa', 'st_callback'], ["o'ylab ko'radi", 'st_thinking'], ["video ko'rishi kerak", 'st_video'], ['bekor qilindi', 'st_cancelled']].filter(([, f]) => pr.reported[f]);
      if (st.length) lines.push(`   📋 ${st.map(([l, f]) => `${l} ${n(pr[f])}`).join(' · ')}`);
      const src = [['Instagram direkt', pr.src_ig], ['Telegram lichka', pr.src_tg]].filter(([, v]) => v > 0);
      if (src.length) lines.push(`   📥 Lichkadan: ${src.map(([l, v]) => `${l} ${n(v)}`).join(' · ')}`);
    }
    lines.push(`   💰 ${sum(pr.revenue)} so'm · ${pr.net_profit >= 0 ? 'sof foyda' : 'zarar'} ${sum(Math.abs(pr.net_profit))} so'm${pr.revenue ? ` (${p(pr.net_margin)})` : ''}`);
    if (adv.best) lines.push(`   ⭐ Yaxshi kreativ: ${esc(adv.best)}`);
    if (adv.worst) lines.push(`   👎 Ishlamayotgan: ${esc(adv.worst)}`);
    for (const pb of adv.problems) lines.push(`   ⚠️ ${esc(pb.text)}`);
    const proposal = note.comment || adv.proposals.join('\n');
    // 🔎 — tahlil (AI yoki PM yozgan), qolgan qatorlar — takliflar
    for (const l of proposal.split('\n').map((x) => x.replace(/^[•\-\s]+/, '').trim()).filter(Boolean)) lines.push(l.startsWith('🔎') ? `   ${esc(l)}` : `   💡 ${esc(l)}`);
  }
  if (r.summary) lines.push('', `<b>Xulosa:</b> ${esc(r.summary)}`);
  if (r.tomorrow) lines.push(`<b>Ertaga:</b> ${esc(r.tomorrow)}`);
  const up = b.week.allocation.filter((a) => a.change > 0.02).map((a) => esc(a.name));
  const down = b.week.allocation.filter((a) => a.change < -0.02).map((a) => esc(a.name));
  if (up.length || down.length) lines.push('', `<b>Byudjet (7 kun asosida):</b>${up.length ? ` ↑ ${up.join(', ')}` : ''}${down.length ? ` · ↓ ${down.join(', ')}` : ''}`);
  lines.push('', '↩️ <i>Yechimingizni shu xabarga javob (reply) qilib yozing — PM ga yetkaziladi.</i>');
  return lines.join('\n');
}
