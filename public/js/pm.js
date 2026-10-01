// Proekt menejerning kunlik ishi — 4 qadam: target raqamlari → sotuv raqamlari → tekshirish → direktorga yuborish
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtUzs, fmtP, toast, ICONS, spinnerBlock, dayLabel, refreshMe, isStale, shortDate,
} from './core.js';

export const STATUS_PILL = { unprofitable: 'crit', sales_issue: 'crit', creative: 'warn', needs_leads: 'info', scale: 'lime', good: 'good', nodata: '' };
// Holat oddiy tilda: PM direktorga nima deyishini darhol tushunsin
const MEANING = {
  good: 'Hammasi joyida',
  scale: 'Yaxshi ishlayapti — byudjetni oshirsa bo\'ladi',
  needs_leads: 'Lid kam — ko\'proq reklama kerak',
  creative: 'Reklama videosi/rasmi ishlamayapti — almashtirish kerak',
  sales_issue: 'Lid bor, lekin sotuv past — sotuv bo\'limini tekshirish kerak',
  unprofitable: 'Reklama zarar qilyapti — to\'xtatish yoki o\'zgartirish kerak',
  nodata: 'Raqamlar kiritilmagan',
};

const STEPS = [
  { key: 'target', title: 'Target', head: "Targetologdan raqamlarni oling",
    hint: "Har bir loyihaga bugun reklamaga qancha pul ketdi va nechta klik bo'ldi — targetologdan so'rang va yozing.",
    fields: [['spend', 'Xarajat, $'], ['clicks', 'Klik']] },
  { key: 'sales', title: 'Sotuv', head: "ROP dan sotuv raqamlarini oling",
    hint: "Bugun nechta lid (so'rov) keldi, nechtasi sotib oldi va qancha pul tushdi — ROP dan so'rang va yozing.",
    fields: [['leads', 'Lid'], ['sales', 'Sotuv'], ['revenue', "Tushum, so'm"]] },
  { key: 'check', title: 'Tekshirish', head: 'Natijani tekshiring',
    hint: "Tizim har bir loyihani baholadi. Rozi bo'lmasangiz — boshqa holatni tanlang. Kerak bo'lsa bir og'iz izoh yozing." },
  { key: 'send', title: 'Yuborish', head: 'Direktorga yuboring',
    hint: 'Direktor Telegramda aynan shu xabarni oladi. Tekshiring va yuboring.' },
];

export function dateNav(date, onChange) {
  const isToday = date === state.me.today;
  setTimeout(() => {
    $('#dPrev').onclick = () => onChange(addDays(date, -1));
    $('#dNext').onclick = () => { if (!isToday) onChange(addDays(date, 1)); };
    $('#dPick').onchange = (e) => { if (e.target.value && e.target.value <= state.me.today) onChange(e.target.value); };
  });
  return `<div class="filters"><button class="btn small icon" id="dPrev" aria-label="Oldingi kun">←</button>
    <input type="date" id="dPick" value="${date}" max="${state.me.today}" aria-label="Sana">
    <button class="btn small icon" id="dNext" aria-label="Keyingi kun" ${isToday ? 'disabled' : ''}>→</button></div>`;
}

export function creativeList(list, empty) {
  if (!list.length) return `<div class="muted small">${empty}</div>`;
  return `<div class="clist">${list.map((c) => `<div class="citem" title="${esc(c.verdict_reason)}">
    <span class="dot" style="background:${esc(c.project_color || '#4c86ff')};color:${esc(c.project_color || '#4c86ff')}"></span>
    <span class="cname"><b>${esc(c.name)}</b><small>${esc(c.project_name)} · ${fmtUsd(c.spend, 0)}</small></span>
    <span class="pill ${c.verdict === 'bad' ? 'crit' : 'good'}">${esc(c.verdict_short)}</span>
    ${c.creative_url ? `<a class="circle-btn sm" href="${esc(c.creative_url)}" target="_blank" rel="noopener" aria-label="Kreativni ochish">${ICONS.play}</a>` : ''}</div>`).join('')}</div>`;
}

const filled = (row, fields) => fields.every(([f]) => row[f] != null);

function stepDone(key, daily, report) {
  if (key === 'target') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, STEPS[0].fields));
  if (key === 'sales') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, STEPS[1].fields));
  if (key === 'check') return Boolean(report && Object.keys(report.project_notes || {}).length);
  return Boolean(report && report.status !== 'draft');
}

export async function renderToday() {
  state.reportDate ||= state.me.today;
  const date = state.reportDate;
  const go = (d) => { state.reportDate = d; state.pmStep = null; renderToday(); };
  const first = String(state.me.user.name || '').split(' ')[0];
  shell(`<div class="page-head"><div><h1>${date === state.me.today ? `Salom, <span class="grad">${esc(first)}</span>` : `<span class="grad">${dayLabel(date)}</span>`}</h1>
      <div class="sub">${date === state.me.today ? "Bugungi hisobotni 4 qadamda tayyorlaymiz" : 'Shu kun hisoboti'}</div></div>${dateNav(date, go)}</div>
    <div id="pm">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  let daily, bundle;
  try { [daily, bundle] = await Promise.all([api(`/api/daily?date=${date}`), api(`/api/report?date=${date}`)]); } catch (e) { const el = $('#pm'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#pm');
  if (!box || isStale(rid)) return;

  // Loyiha yo'q — avval loyihalarni qo'shish
  if (!daily.projects.length) return renderOnboarding(box);

  const report = bundle.report;
  const done = Object.fromEntries(STEPS.map((s) => [s.key, stepDone(s.key, daily, report)]));
  const sent = done.send;
  let step = state.pmStep || (sent ? 'done' : STEPS.find((s) => !done[s.key])?.key || 'send');

  const stepper = `<nav class="stepper" aria-label="Qadamlar">${STEPS.map((s, i) => `<button data-step="${s.key}" class="${step === s.key ? 'on' : ''} ${done[s.key] ? 'ok' : ''}">
      <span class="num">${done[s.key] ? ICONS.check : i + 1}</span><span>${s.title}</span></button>${i < STEPS.length - 1 ? '<i></i>' : ''}`).join('')}</nav>`;

  const toStep = (k) => { state.pmStep = k; renderToday(); };
  const body = { target: () => entryStep(0), sales: () => entryStep(1), check: checkStep, send: sendStep, done: doneStep }[step]();
  box.innerHTML = stepper + body;
  box.querySelector('.stepper').onclick = (e) => { const b = e.target.closest('[data-step]'); if (b) toStep(b.dataset.step); };
  bindStep();

  // ---------- 1-2: raqamlarni kiritish ----------
  function entryStep(i) {
    const s = STEPS[i];
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">${i + 1}-qadam</span><h2>${s.head}</h2><p>${s.hint}</p></div>
      <div class="table-wrap"><table class="grid-entry" style="--cols:${s.fields.length}"><thead><tr><th>Loyiha</th>${s.fields.map(([, l]) => `<th class="n">${l}</th>`).join('')}<th></th></tr></thead>
      <tbody>${daily.projects.map((p) => `<tr data-id="${p.id}"><td><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</td>
        ${s.fields.map(([f, l]) => `<td class="n" data-label="${l}"><input class="cell-in" inputmode="decimal" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}
        <td>${filled(p.row, s.fields) ? '<span class="pill good">✓</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="step-foot"><span class="muted small">Kulrang raqam — kechagi qiymat. Enter — keyingi qator.</span><span class="spacer"></span>
        <button class="btn ghost" data-skip>O'tkazib yuborish</button><button class="btn primary" data-save>Saqlash va davom etish →</button></div>
    </section>`;
  }

  // ---------- 3: tekshirish ----------
  function checkStep() {
    const notes = report?.project_notes || {};
    const statuses = Object.entries(bundle.statuses).filter(([k]) => k !== 'nodata');
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">3-qadam</span><h2>${STEPS[2].head}</h2><p>${STEPS[2].hint}</p></div>
      <div class="checks">${bundle.day.byProject.map((p) => {
        const rec = bundle.rec.projects.find((x) => x.id === p.id) || { status: 'nodata', actions: [] };
        const cur = notes[p.id]?.status || (rec.status === 'nodata' ? null : rec.status);
        return `<article class="check" data-pid="${p.id}">
          <div class="check-top"><b><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</b>
            <span class="pill ${STATUS_PILL[rec.status]}">${esc(rec.status_label)}</span></div>
          <p class="meaning">${esc(MEANING[rec.status])}${rec.actions[0] ? ` <span class="muted" title="${esc(rec.actions[0].detail || '')}">· ${esc(rec.actions[0].text)}</span>` : ''}</p>
          <div class="nums"><span>${fmtUsd(p.spend, 0)}</span><span>${fmtN(p.clicks)} klik</span><span>${fmtN(p.leads)} lid</span><span>${fmtN(p.sales)} sotuv</span><span>1 lid ${fmtUsd(p.cpl)}</span></div>
          <details ${notes[p.id]?.comment || (notes[p.id]?.status && notes[p.id].status !== rec.status) ? 'open' : ''}><summary>Baho yoki izohni o'zgartirish</summary>
            <div class="status-chips">${statuses.map(([k, l]) => `<button type="button" data-st="${k}" class="${cur === k ? 'on' : ''} ${rec.status === k ? 'auto' : ''}">${esc(l)}</button>`).join('')}</div>
            <input data-comment value="${esc(notes[p.id]?.comment || '')}" placeholder="Izoh direktorga (ixtiyoriy)" aria-label="${esc(p.name)} izohi">
          </details>
        </article>`;
      }).join('')}</div>
      <div class="step-foot"><span class="spacer"></span><button class="btn primary" data-save>Hammasi to'g'ri, davom etish →</button></div>
    </section>`;
  }

  // ---------- 4: yuborish ----------
  function sendStep() {
    const tg = state.me.telegram || {};
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">4-qadam</span><h2>${STEPS[3].head}</h2><p>${STEPS[3].hint}</p></div>
      <div class="grid g2">
        <div class="stack">
          <label class="field">Bugun qisqacha (ixtiyoriy)<textarea id="rSummary" rows="3" placeholder="Masalan: SMM da sotuv past, sabab — lidlar sifatsiz">${esc(report?.summary || '')}</textarea></label>
          <label class="field">Ertaga nima qilamiz (ixtiyoriy)<textarea id="rTomorrow" rows="3" placeholder="Masalan: Python uchun yangi video qo'yamiz">${esc(report?.tomorrow || '')}</textarea></label>
          ${!tg.enabled || !tg.reportChat ? `<div class="insight warning"><span class="ic">Eslatma</span><span>Telegram ${tg.enabled ? 'chat ID si' : 'bot'} sozlanmagan — hisobot faqat tizimda saqlanadi. <a href="#/sozlamalar?tab=telegram">Sozlash</a></span></div>` : ''}
        </div>
        <div class="stack"><span class="eyebrow">Direktor ko'radigan xabar</span><pre class="tg" id="preview">Yuklanmoqda…</pre></div>
      </div>
      <div class="step-foot"><button class="btn ghost" data-back>← Orqaga</button><span class="spacer"></span><button class="btn primary big" data-send>${ICONS.send} Direktorga yuborish</button></div>
    </section>`;
  }

  // ---------- Tayyor ----------
  function doneStep() {
    const t = bundle.day.totals;
    return `<section class="card step done-card">
      <div class="done-icon">${ICONS.check}</div>
      <h2>${date === state.me.today ? 'Bugungi hisobot yuborildi' : 'Hisobot yuborilgan'}</h2>
      <p class="muted">${String(report.submitted_at || '').slice(11, 16)} da yuborildi${report.status === 'reviewed' ? ' · direktor ko\'rib chiqdi' : ''}</p>
      ${report.director_comment ? `<div class="quote accent" style="text-align:left"><b>Direktor:</b> ${esc(report.director_comment)}</div>` : ''}
      <div class="nums big-nums"><span><b>${fmtUsd(t.spend, 0)}</b>xarajat</span><span><b>${fmtN(t.leads)}</b>lid</span><span><b>${fmtN(t.sales)}</b>sotuv</span><span><b>${fmtUzs(t.total_revenue)}</b>tushum</span></div>
      <div class="row" style="justify-content:center"><button class="btn" data-step-go="send">Xabarni ko'rish</button><button class="btn ghost" data-step-go="target">Raqamlarni o'zgartirish</button></div>
      <p class="small muted">Ertaga shu yerda yangi hisobot boshlanadi.</p>
    </section>`;
  }

  function bindStep() {
    // Enter — pastki qatordagi shu ustun
    box.querySelector('tbody')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input')) return;
      e.preventDefault();
      const td = e.target.closest('td');
      const next = td.parentElement.nextElementSibling?.children[td.cellIndex]?.querySelector('input');
      (next || box.querySelector('[data-save]')).focus();
    });
    box.querySelectorAll('[data-step-go]').forEach((b) => { b.onclick = () => toStep(b.dataset.stepGo); });
    box.querySelector('.checks')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-st]');
      if (b) $$('[data-st]', b.closest('.check')).forEach((x) => x.classList.toggle('on', x === b));
    });
    const idx = STEPS.findIndex((s) => s.key === step);
    const next = () => toStep(STEPS[idx + 1]?.key || 'send');
    const skip = box.querySelector('[data-skip]');
    if (skip) skip.onclick = next;
    const back = box.querySelector('[data-back]');
    if (back) back.onclick = () => toStep('check');
    const save = box.querySelector('[data-save]');
    if (save) save.onclick = async () => {
      save.disabled = true;
      try {
        if (step === 'target' || step === 'sales') {
          let changed = 0;
          for (const tr of box.querySelectorAll('tbody tr[data-id]')) {
            const p = daily.projects.find((x) => String(x.id) === tr.dataset.id);
            const values = {};
            tr.querySelectorAll('input[name]').forEach((el) => { if (el.value !== String(p.row[el.name] ?? '')) values[el.name] = el.value; });
            if (Object.keys(values).length) changed += (await api('/api/daily', { method: 'PUT', body: { project_id: p.id, date, values } })).changed;
          }
          if (changed) toast(`Saqlandi ✓`);
        } else if (step === 'check') {
          await api('/api/report', { method: 'PUT', body: { date, ...collectDraft() } });
        }
        next();
      } catch (err) { toast(err.message, true); save.disabled = false; }
    };
    if (step === 'send') {
      const refresh = () => api(`/api/report/preview?date=${date}`).then((r) => { const el = $('#preview'); if (el) el.innerHTML = r.text; }).catch(() => {});
      // Xulosa yozilgach ko'rinish yangilansin
      const persist = async () => { await api('/api/report', { method: 'PUT', body: { date, ...collectDraft() } }).catch(() => {}); refresh(); };
      refresh();
      $('#rSummary').addEventListener('change', persist);
      $('#rTomorrow').addEventListener('change', persist);
      box.querySelector('[data-send]').onclick = async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          const r = await api('/api/report/submit', { method: 'POST', body: { date, ...collectDraft() } });
          toast(r.notified ? 'Yuborildi ✓ Direktor Telegramda oldi' : window.DEMO ? 'Yuborildi ✓ (demoda Telegram xabari ketmaydi)' : 'Hisobot saqlandi ✓');
          state.pmStep = null;
          await refreshMe();
          renderToday();
        } catch (err) { toast(err.message, true); btn.disabled = false; }
      };
    }
  }

  // Hozirgi baho/izohlar + xulosa — bir joydan
  function collectDraft() {
    const project_notes = { ...(report?.project_notes || {}) };
    $$('.check[data-pid]', box).forEach((c) => {
      project_notes[c.dataset.pid] = { status: $('[data-st].on', c)?.dataset.st || null, comment: $('[data-comment]', c).value };
    });
    // Tekshirish qadamida baho tanlanmagan bo'lsa — tizim bahosi saqlanadi
    for (const p of bundle.rec.projects) if (!project_notes[p.id] && p.status !== 'nodata') project_notes[p.id] = { status: p.status, comment: null };
    return {
      project_notes,
      summary: $('#rSummary')?.value ?? report?.summary ?? '',
      tomorrow: $('#rTomorrow')?.value ?? report?.tomorrow ?? '',
    };
  }
}

function renderOnboarding(box) {
  box.innerHTML = `<section class="card step">
    <div class="step-head"><span class="eyebrow">Boshlash</span><h2>Loyihalaringizni qo'shing</h2><p>Har bir kurs yoki loyihani nomi bilan qo'shing. Keyin har kuni shular bo'yicha hisobot to'ldirasiz.</p></div>
    <form id="onbForm" class="row"><input name="name" id="onbName" required placeholder="Masalan: IELTS kursi" style="flex:1 1 240px" aria-label="Loyiha nomi"><button class="btn primary">${ICONS.plus} Qo'shish</button></form>
  </section>`;
  $('#onbForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/projects', { method: 'POST', body: { name: $('#onbName').value } });
      state.projects = await api('/api/projects');
      toast("Qo'shildi — yana qo'shing yoki hisobotni boshlang");
      renderToday();
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Hisobotlar arxivi ----------
const STATE_PILL = { draft: ['warn', 'Yuborilmagan'], submitted: ['info', 'Yuborildi'], reviewed: ['good', "Direktor ko'rdi"] };
export async function renderArchive() {
  shell(`<div class="page-head"><h1><span class="grad">Hisobotlar</span></h1></div><div id="arch">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  const list = await api('/api/reports?limit=90');
  const box = $('#arch');
  if (!box || isStale(rid)) return;
  box.innerHTML = list.length ? `<div class="clist">${list.map((r) => { const [c, l] = STATE_PILL[r.status] || ['', r.status]; return `<button class="citem arch" data-date="${r.date}">
      <span class="cname"><b>${dayLabel(r.date)}</b><small>${esc(r.summary || 'Xulosa yozilmagan')}</small></span>
      ${r.director_comment ? `<span class="small muted" title="${esc(r.director_comment)}">💬</span>` : '<span></span>'}<span class="pill ${c}">${l}</span></button>`; }).join('')}</div>`
    : '<div class="card empty">Hali hisobot yo\'q. «Bugun» bo\'limida birinchisini tayyorlang.</div>';
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-date]');
    if (!b) return;
    state.reportDate = b.dataset.date;
    state.pmStep = null;
    location.hash = '#/';
  });
}

export { shortDate };
