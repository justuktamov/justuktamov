// Proekt menejer: kunlik hisobotni yig'ish va direktorga yuborish; hisobotlar arxivi
import { $, $$, esc, api, state, shell, fmtN, toast, ICONS, spinnerBlock, dayLabel, refreshMe, homeRoute } from './core.js';
import { dateNav, pstats, actionsHtml, STATUS_PILL } from './today.js';

const STATE_PILL = { draft: ['warn', 'Qoralama'], submitted: ['info', 'Yuborildi'], reviewed: ['good', "Ko'rib chiqildi"] };

export async function renderReport() {
  const role = state.me.user.role;
  state.reportDate ||= state.me.today;
  const date = state.reportDate;
  const go = (d) => { state.reportDate = d; renderReport(); };
  shell(`<div class="page-head"><div><h1><span class="grad">Kunlik hisobot</span> direktorga</h1>
      <div class="sub">Targetolog va ROP kiritgan raqamlar shu yerda yig'iladi. Har bir loyihaga holat va izoh yozing, keyin direktorga yuboring.</div></div>
      ${dateNav(date, go)}</div>
    <div id="rep">${spinnerBlock()}</div>`);
  let b;
  try { b = await api(`/api/report?date=${date}`); } catch (e) { const el = $('#rep'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#rep');
  if (!box) return;
  const r = b.report || { status: null, project_notes: {} };
  const canWrite = ['admin', 'pm'].includes(role) && r.status !== 'reviewed';
  const notes = structuredClone(r.project_notes || {});
  const recById = Object.fromEntries(b.rec.projects.map((p) => [p.id, p]));
  const missing = b.missing.filter((m) => !m.filled);
  const byRole = {};
  for (const m of missing) (byRole[m.role_label] ||= []).push(m.project);
  const [stCls, stLabel] = STATE_PILL[r.status] || ['', 'Boshlanmagan'];

  box.innerHTML = `
    <div class="grid g3">
      <div class="card stack"><span class="eyebrow">1-qadam</span><h2>Ma'lumotlar to'liqmi?</h2>
        ${missing.length ? `<div class="actions">${Object.entries(byRole).map(([rl, list]) => `<div class="action"><span class="who-chip">${esc(rl)}</span><span>${esc(list.join(', '))}</span></div>`).join('')}</div>
          <a class="btn small" href="#/kiritish">${ICONS.entry} Yetishmaganini kiritish</a>` : '<div class="row"><span class="pill good">✓ Hamma raqamlar kiritilgan</span></div>'}</div>
      <div class="card stack"><span class="eyebrow">2-qadam</span><h2>Har bir loyihaga holat</h2>
        <div class="small muted">Tizim holatni avtomatik taklif qiladi (belgilangan). Kerak bo'lsa boshqasini tanlang va izoh yozing — direktor shuni o'qiydi.</div></div>
      <div class="card stack"><span class="eyebrow">3-qadam</span><h2>Xulosa va yuborish</h2>
        <div class="row"><span class="pill ${stCls}">${stLabel}</span>${r.submitted_at ? `<span class="tiny muted">${String(r.submitted_at).slice(11, 16)} da yuborilgan</span>` : ''}</div>
        ${r.director_comment ? `<div class="quote" style="border-color:var(--accent)"><b>Direktor:</b> ${esc(r.director_comment)}</div>` : ''}</div>
    </div>
    <div class="pcards mt">${b.day.byProject.map((p) => {
      const rec = recById[p.id] || { status: 'nodata', actions: [] };
      const cur = notes[p.id]?.status || rec.status;
      return `<article class="pcard" data-pid="${p.id}">
        <div class="pcard-top"><div><h3><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</h3>
          <div class="meta">Tizim tavsiyasi: <span class="pill ${STATUS_PILL[rec.status]}" style="padding:2px 8px">${esc(b.statuses[rec.status])}</span></div></div></div>
        ${pstats(p)}
        ${actionsHtml(rec.actions)}
        <div class="status-chips" role="radiogroup" aria-label="${esc(p.name)} holati">${Object.entries(b.statuses).filter(([k]) => k !== 'nodata' || rec.status === 'nodata').map(([k, l]) => `<button type="button" data-st="${k}" class="${cur === k ? 'on' : ''} ${rec.status === k ? 'auto' : ''}" ${canWrite ? '' : 'disabled'}>${esc(l)}</button>`).join('')}</div>
        <label class="field">Izoh direktorga<textarea data-comment rows="2" placeholder="Masalan: Instagram kreativi qimmat lid beryapti, ertaga yangi video qo'yamiz" ${canWrite ? '' : 'disabled'}>${esc(notes[p.id]?.comment || '')}</textarea></label>
      </article>`;
    }).join('')}</div>
    <div class="card stack mt">
      <div class="grid g2">
        <label class="field">Kun xulosasi<textarea id="rSummary" rows="3" placeholder="Bugun umumiy holat qanday? Asosiy muammo va yutuq" ${canWrite ? '' : 'disabled'}>${esc(r.summary || '')}</textarea></label>
        <label class="field">Ertangi reja<textarea id="rTomorrow" rows="3" placeholder="Kim nima qiladi: yangi kreativlar, byudjet o'zgarishi, ROP vazifalari" ${canWrite ? '' : 'disabled'}>${esc(r.tomorrow || '')}</textarea></label>
      </div>
      ${canWrite ? `<div class="row"><button class="btn primary" id="rSubmit">${ICONS.send} ${r.status === 'submitted' ? 'Qayta yuborish' : 'Direktorga yuborish'}</button>
        <button class="btn" id="rSave">Qoralamani saqlash</button>
        <span class="small muted">Yuborilganda direktorga Telegram xabari ham boradi.</span></div>`
        : `<div class="small muted">${r.status === 'reviewed' ? "Direktor ko'rib chiqqan — hisobot yopildi." : 'Hisobotni proekt menejer tayyorlaydi.'}</div>`}
    </div>`;

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
    try { await api('/api/report', { method: 'PUT', body: collect() }); toast('Qoralama saqlandi'); renderReport(); } catch (err) { toast(err.message, true); }
  };
  $('#rSubmit').onclick = async () => {
    const btn = $('#rSubmit');
    btn.disabled = true;
    try {
      const res = await api('/api/report/submit', { method: 'POST', body: collect() });
      toast(res.notified ? `Yuborildi ✓ Telegramga ham xabar ketdi` : 'Direktorga yuborildi ✓');
      await refreshMe();
      renderReport();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
}

export async function renderArchive() {
  shell(`<div class="page-head"><div><h1><span class="grad">Hisobotlar</span> arxivi</h1><div class="sub">Har kungi PM hisoboti, direktorning izohlari bilan.</div></div></div>
    <div id="arch">${spinnerBlock()}</div>`);
  const list = await api('/api/reports?limit=90');
  const box = $('#arch');
  if (!box) return;
  box.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Kun</th><th>Holat</th><th>Tayyorladi</th><th>Xulosa</th><th>Direktor izohi</th></tr></thead><tbody>
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
  shell(`<div class="page-head"><div><h1><span class="grad">Jamoa</span> va vazifalar</h1><div class="sub">Tizimda kimlar bor, har biri nimani kiritadi va nimani oladi.</div></div></div>
    <div id="team">${spinnerBlock()}</div>`);
  const users = await api('/api/team').catch(() => []);
  const box = $('#team');
  if (!box) return;
  const { roles, duties } = state.me;
  const names = (r) => users.filter((u) => u.role === r).map((u) => u.name).join(', ') || '— hali biriktirilmagan';
  const order = ['admin', 'pm', 'target', 'sales', 'lead', 'finance', 'creative'];
  box.innerHTML = `
    <div class="card"><div class="card-head"><h2>Ma'lumot qanday oqadi</h2><span class="muted">har kuni</span></div>
      <div class="flow">
        <div class="col">
          <div class="node">Targetolog<small>xarajat, klik, kreativlar</small></div>
          <div class="node">ROP va lid operatori<small>lid, sotuv, sabablar</small></div>
          <div class="node">Moliya<small>kassaga tushum</small></div>
        </div>
        <div class="arrow">→</div>
        <div class="col"><div class="node pm">Proekt menejer<small>yig'adi, holat va izoh yozadi, 19:00 gacha yuboradi</small></div>
          <div class="node">Tizim<small>voronka, tavsiya, byudjet taqsimoti</small></div></div>
        <div class="arrow">→</div>
        <div class="col"><div class="node dir">Direktor<small>ko'radi, qaror qiladi: byudjet, kreativ, sotuv</small></div></div>
      </div></div>
    <div class="grid g3 mt">${order.map((r) => `<div class="card role-card"><div class="row"><span class="pill ${r === 'admin' ? 'lime' : r === 'pm' ? 'info' : ''}">${esc(roles[r])}</span></div>
      <div class="small" style="color:var(--text)">${esc(names(r))}</div>
      <dl><dt>Nima beradi</dt><dd>${esc(duties[r].gives)}</dd><dt>Nima oladi</dt><dd>${esc(duties[r].gets)}</dd></dl></div>`).join('')}</div>
    <p class="small muted mt">Uyga vazifa: har bir xodim profilida Telegram ID bo'lsin — eslatma va hisobot xabarlari shunda keladi. Xodim qo'shish: Sozlamalar → Xodimlar.</p>`;
}

export { homeRoute };
