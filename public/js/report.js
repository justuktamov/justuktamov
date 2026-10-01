// Proekt menejer: kunlik hisobotni yig'ish va direktorga yuborish; hisobotlar arxivi
import { $, $$, esc, api, state, shell, fmtN, toast, ICONS, spinnerBlock, dayLabel, refreshMe, homeRoute, isStale } from './core.js';
import { dateNav, pstats, actionsHtml, bindAssign } from './today.js';

const STATE_PILL = { draft: ['warn', 'Qoralama'], submitted: ['info', 'Yuborildi'], reviewed: ['good', "Ko'rib chiqildi"] };

export async function renderReport() {
  const role = state.me.user.role;
  state.reportDate ||= state.me.today;
  const date = state.reportDate;
  const go = (d) => { state.reportDate = d; renderReport(); };
  shell(`<div class="page-head"><h1><span class="grad">Hisobot</span></h1>${dateNav(date, go)}</div>
    <div id="rep">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  let b;
  try { b = await api(`/api/report?date=${date}`); } catch (e) { const el = $('#rep'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#rep');
  if (!box || isStale(rid)) return;
  const r = b.report || { status: null, project_notes: {} };
  const canWrite = ['admin', 'pm'].includes(role) && r.status !== 'reviewed';
  const notes = structuredClone(r.project_notes || {});
  const recById = Object.fromEntries(b.rec.projects.map((p) => [p.id, p]));
  const missing = b.missing.filter((m) => !m.filled);
  const byRole = {};
  for (const m of missing) (byRole[m.role_label.split(' ')[0]] ||= []).push(m.project);
  const [stCls, stLabel] = STATE_PILL[r.status] || ['', 'Yangi'];
  const statuses = Object.entries(b.statuses).filter(([k]) => k !== 'nodata');

  box.innerHTML = `
    <div class="card toolbar">
      <span class="pill ${stCls}">${stLabel}${r.submitted_at ? ` · ${String(r.submitted_at).slice(11, 16)}` : ''}</span>
      ${missing.length
        ? `<span class="row small">⏳ ${Object.entries(byRole).map(([rl, list]) => `<span class="mini" title="${esc(list.join(', '))}">${esc(rl)}: ${list.length}</span>`).join('')}
           <a class="small" href="#/kiritish">To'ldirish →</a></span>`
        : '<span class="small" style="color:var(--good)">✓ Raqamlar to\'liq</span>'}
      <span class="spacer"></span>
      ${canWrite ? `<button class="btn small" id="rSave">Saqlash</button><button class="btn primary small" id="rSubmit">${ICONS.send} ${r.status === 'submitted' ? 'Qayta yuborish' : 'Direktorga yuborish'}</button>` : ''}
    </div>
    ${r.director_comment ? `<div class="quote accent mt"><b>Direktor:</b> ${esc(r.director_comment)}</div>` : ''}
    <div class="pcards cols mt">${b.day.byProject.map((p) => {
      const rec = recById[p.id] || { status: 'nodata', actions: [] };
      const cur = notes[p.id]?.status || (rec.status === 'nodata' ? null : rec.status);
      return `<article class="pcard" data-pid="${p.id}">
        <div class="pcard-top"><span class="ptitle"><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</span></div>
        ${pstats(p)}
        ${actionsHtml(rec.actions, p.id)}
        <div class="status-chips" role="radiogroup" aria-label="${esc(p.name)} holati">${statuses.map(([k, l]) => `<button type="button" data-st="${k}" class="${cur === k ? 'on' : ''} ${rec.status === k ? 'auto' : ''}" title="${rec.status === k ? 'Tizim tavsiyasi' : ''}" ${canWrite ? '' : 'disabled'}>${esc(l)}</button>`).join('')}</div>
        <input data-comment placeholder="Izoh direktorga…" value="${esc(notes[p.id]?.comment || '')}" aria-label="${esc(p.name)} izohi" ${canWrite ? '' : 'disabled'}>
      </article>`;
    }).join('')}</div>
    <div class="grid g2 mt">
      <textarea id="rSummary" rows="2" placeholder="Kun xulosasi…" aria-label="Kun xulosasi" ${canWrite ? '' : 'disabled'}>${esc(r.summary || '')}</textarea>
      <textarea id="rTomorrow" rows="2" placeholder="Ertaga kim nima qiladi…" aria-label="Ertangi reja" ${canWrite ? '' : 'disabled'}>${esc(r.tomorrow || '')}</textarea>
    </div>`;

  bindAssign(box, recById);
  if (!canWrite) return;
  box.querySelector('.pcards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-st]');
    if (!btn) return;
    const card = btn.closest('[data-pid]');
    $$('[data-st]', card).forEach((x) => x.classList.toggle('on', x === btn));
  });
  const collect = () => {
    const project_notes = {};
    $$('[data-pid]', box).forEach((card) => {
      project_notes[card.dataset.pid] = { status: $('[data-st].on', card)?.dataset.st || null, comment: $('[data-comment]', card).value };
    });
    return { date, summary: $('#rSummary').value, tomorrow: $('#rTomorrow').value, project_notes };
  };
  $('#rSave').onclick = async () => {
    try { await api('/api/report', { method: 'PUT', body: collect() }); toast('Saqlandi'); renderReport(); } catch (err) { toast(err.message, true); }
  };
  $('#rSubmit').onclick = async () => {
    const btn = $('#rSubmit');
    btn.disabled = true;
    try {
      await api('/api/report/submit', { method: 'POST', body: collect() });
      toast('Direktorga yuborildi ✓');
      await refreshMe();
      renderReport();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
}

export async function renderArchive() {
  shell(`<div class="page-head"><h1><span class="grad">Arxiv</span></h1></div>
    <div id="arch">${spinnerBlock()}</div>`);
  const list = await api('/api/reports?limit=90');
  const box = $('#arch');
  if (!box) return;
  box.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Kun</th><th>Holat</th><th>PM</th><th>Xulosa</th><th>Direktor</th></tr></thead><tbody>
    ${list.map((r) => { const [c, l] = STATE_PILL[r.status] || ['', r.status]; return `<tr class="click" data-date="${r.date}"><td><b>${dayLabel(r.date)}</b></td><td><span class="pill ${c}">${l}</span></td><td>${esc(r.author_name || '—')}</td>
      <td class="wrap small">${esc(r.summary || '—')}</td><td class="wrap small">${esc(r.director_comment || '—')}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Hali hisobot yo\'q</td></tr>'}
  </tbody></table></div></div>`;
  box.querySelector('tbody').onclick = (e) => {
    const tr = e.target.closest('tr[data-date]');
    if (!tr) return;
    state.reportDate = tr.dataset.date;
    location.hash = state.me.user.role === 'pm' ? '#/hisobot' : '#/';
  };
}

// ---------- Jamoa: kim nima beradi ----------
export async function renderTeam() {
  shell(`<div class="page-head"><h1><span class="grad">Jamoa</span></h1></div><div id="team">${spinnerBlock()}</div>`);
  const users = await api('/api/team').catch(() => []);
  const box = $('#team');
  if (!box) return;
  const { roles, duties } = state.me;
  const names = (r) => users.filter((u) => u.role === r).map((u) => u.name).join(', ') || '—';
  const order = ['admin', 'pm', 'target', 'sales', 'lead', 'finance', 'creative'];
  box.innerHTML = `
    <div class="card"><div class="flow">
      <div class="col"><div class="node">Targetolog<small>xarajat, klik</small></div><div class="node">ROP<small>lid, sotuv</small></div><div class="node">Moliya<small>tushum</small></div></div>
      <div class="arrow">→</div>
      <div class="col"><div class="node pm">Proekt menejer<small>19:00 gacha yuboradi</small></div></div>
      <div class="arrow">→</div>
      <div class="col"><div class="node dir">Direktor<small>qaror qiladi</small></div></div>
    </div></div>
    <div class="grid g3 mt">${order.map((r) => `<div class="card role-card"><div class="row" style="justify-content:space-between"><span class="pill ${r === 'admin' ? 'lime' : r === 'pm' ? 'info' : ''}">${esc(roles[r])}</span><span class="small">${esc(names(r))}</span></div>
      <dl><dt>Beradi</dt><dd>${esc(duties[r].gives)}</dd><dt>Oladi</dt><dd>${esc(duties[r].gets)}</dd></dl></div>`).join('')}</div>`;
}

export { homeRoute };
