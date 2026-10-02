// Proekt menejerning kunlik ishi — 4 qadam: target raqamlari → sotuv raqamlari → tekshirish → direktorga yuborish
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtUzs, fmtP, toast, ICONS, spinnerBlock, dayLabel, refreshMe, isStale, shortDate, copyText,
} from './core.js';

const STATUS_PILL = { unprofitable: 'crit', sales_issue: 'crit', creative: 'warn', needs_leads: 'info', scale: 'lime', good: 'good', nodata: '' };
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
  { key: 'target', title: 'Target', head: "Targetologdan so'rang",
    hint: "Har bir loyiha bo'yicha raqamlarni yozing. Lid narxini tizim o'zi hisoblaydi (xarajat ÷ lid).",
    ask: ['Qaysi loyihaga qancha pul sarflandi ($)?', "Nechta ko'rish va nechta klik bo'ldi?", 'Bugun nechta yangi kreativ chiqdi?',
      'Qaysi kreativ yaxshi ishladi, qaysi biri ishlamadi?', "Reklamada muammo bo'ldimi (akkaunt, moderatsiya, to'lov)?"],
    fields: [['spend', 'Xarajat, $'], ['impressions', "Ko'rish"], ['clicks', 'Klik'], ['new_creatives', 'Yangi kreativ']],
    required: ['spend', 'clicks'],
    texts: [['creative_best', 'Yaxshi ishlagan kreativ', 'nomi yoki havola'], ['creative_worst', 'Ishlamayotgan kreativ', 'nomi yoki havola'], ['note_target', 'Muammo', "akkaunt, moderatsiya, to'lov…"]] },
  { key: 'sales', title: 'Sotuv', head: "Sotuv bo'limi rahbaridan (ROP) so'rang",
    hint: "Sifatli — sotib olishga tayyor. Potensial — qiziqdi, keyinroq olishi mumkin. Sifatsiz — maqsadli emas yoki javob bermadi.",
    ask: ['Har bir loyihaga nechta lid tushdi?', 'Nechtasi sifatli, nechtasi potensial, nechtasi sifatsiz?', "Nechta sotuv bo'ldi va summa qancha?", 'Sotib olmaganlar nega olmadi (asosiy sabab)?'],
    fields: [['leads', 'Jami lid'], ['qualified', 'Sifatli'], ['potential', 'Potensial'], ['unqualified', 'Sifatsiz'], ['sales', 'Sotuv'], ['revenue', "Summa, so'm"]],
    required: ['leads', 'sales', 'revenue'],
    texts: [['note_sales', 'ROP izohi', "nega sotib olmayapti, nima xalaqit beryapti…"]] },
  { key: 'check', title: 'Tahlil', head: 'Tahlil qiling va taklif yozing',
    hint: "Tizim har bir loyihada muammoni topdi va taklif yozib qo'ydi. O'zingizcha tahrirlang — direktor shu takliflarni o'qib, yechim beradi." },
  { key: 'send', title: 'Yuborish', head: 'Direktorga yuboring',
    hint: 'Direktor Telegramda aynan shu xabarni oladi va javob (reply) qilib yechim yozadi — javob sizga keladi.' },
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

const filled = (row, fields) => fields.every((f) => row[f] != null);
const dot = (c) => `<span class="dot" style="background:${esc(c || '#4c86ff')};color:${esc(c || '#4c86ff')}"></span>`;

function stepDone(key, daily, report) {
  if (key === 'target') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, STEPS[0].required));
  if (key === 'sales') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, STEPS[1].required));
  if (key === 'check') return Boolean(report && Object.keys(report.project_notes || {}).length);
  return Boolean(report && report.status !== 'draft');
}

// Targetolog/ROP ga Telegramda yuborish uchun tayyor savollar
function askText(s, projects) {
  return `Salom! Bugungi hisobot uchun har bir loyiha (${projects.map((p) => p.name).join(', ')}) bo'yicha yozib bering:\n${s.ask.map((q, i) => `${i + 1}) ${q}`).join('\n')}`;
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
  // Direktorning oxirgi yechimi — PM bugun shuni bajarishi kerak
  const reply = bundle.prevReply && step !== 'done'
    ? `<div class="reply-banner"><span class="eyebrow">Direktor yechimi · ${shortDate(bundle.prevReply.date)}</span><p>${esc(bundle.prevReply.text).replace(/\n/g, '<br>')}</p></div>` : '';

  const toStep = (k) => { state.pmStep = k; renderToday(); };
  const body = { target: () => entryStep(0), sales: () => entryStep(1), check: checkStep, send: sendStep, done: doneStep }[step]();
  box.innerHTML = stepper + reply + body;
  box.querySelector('.stepper').onclick = (e) => { const b = e.target.closest('[data-step]'); if (b) toStep(b.dataset.step); };
  bindStep();

  // ---------- 1-2: targetolog va ROP raqamlari ----------
  function entryStep(i) {
    const s = STEPS[i];
    const calc = s.key === 'sales'; // jonli hisob: lid narxi va lid turlari yig'indisi
    return `<section class="card step">
      <div class="step-top">
        <div class="step-head"><span class="eyebrow">${i + 1}-qadam</span><h2>${s.head}</h2><p>${s.hint}</p></div>
        <div class="ask"><b>So'raladigan savollar</b><ol>${s.ask.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
          <button class="btn small" data-copy-ask>${ICONS.copy} Nusxalash — Telegramda yuborish uchun</button></div>
      </div>
      <div class="table-wrap"><table class="grid-entry ${s.fields.length > 4 ? 'wide' : ''}" style="--cols:${s.fields.length % 3 ? 2 : 3}"><thead><tr><th>Loyiha</th>${s.fields.map(([, l]) => `<th class="n">${l}</th>`).join('')}${calc ? '<th class="n">1 lid</th>' : ''}<th></th></tr></thead>
      <tbody>${daily.projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${s.fields.map(([f, l]) => `<td class="n" data-label="${l}"><input class="cell-in" inputmode="decimal" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}
        ${calc ? `<td class="n calc" data-label="1 lid narxi" data-cpl>${cplText(p.row.spend, p.row.leads)}</td>` : ''}
        <td data-state>${filled(p.row, s.required) ? '<span class="pill good">✓</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <details class="extra" ${daily.projects.some((p) => s.texts.some(([f]) => p.row[f])) ? 'open' : ''}><summary>${s.key === 'target' ? 'Kreativlar va muammolar' : 'ROP izohlari'} <span class="muted">(ixtiyoriy)</span></summary>
        <div class="table-wrap"><table class="grid-entry text-entry" style="--cols:1"><thead><tr><th>Loyiha</th>${s.texts.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
        <tbody>${daily.projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
          ${s.texts.map(([f, l, ph]) => `<td class="n" data-label="${l}"><input class="cell-in txt" name="${f}" maxlength="300" value="${esc(p.row[f] ?? '')}" placeholder="${esc(ph)}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </details>
      <div class="step-foot"><span class="muted small">${calc ? "Jami lid bo'sh qolsa — uch turi qo'shiladi." : 'Kulrang raqam — kechagi qiymat. Enter — keyingi qator.'}</span><span class="spacer"></span>
        <button class="btn ghost" data-skip>O'tkazib yuborish</button><button class="btn primary" data-save>Saqlash va davom etish →</button></div>
    </section>`;
  }

  // ---------- 3: tahlil va takliflar ----------
  function checkStep() {
    const notes = report?.project_notes || {};
    const statuses = Object.entries(bundle.statuses).filter(([k]) => k !== 'nodata');
    const WHO = bundle.adviceWho || {};
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">3-qadam</span><h2>${STEPS[2].head}</h2><p>${STEPS[2].hint}</p></div>
      <div class="checks">${bundle.day.byProject.map((p) => {
        const adv = bundle.advice?.[p.id] || { status: 'nodata', problems: [], proposals: [] };
        const auto = adv.status || 'nodata';
        const cur = notes[p.id]?.status || (auto === 'nodata' ? null : auto);
        const proposal = notes[p.id]?.comment ?? adv.proposals.map((x) => `• ${x}`).join('\n');
        const q = [['sifatli', 'qualified'], ['potensial', 'potential'], ['sifatsiz', 'unqualified']].filter(([, f]) => p.reported[f]).map(([l, f]) => `${l} ${fmtN(p[f])}`);
        return `<article class="check" data-pid="${p.id}">
          <div class="check-top"><b>${dot(p.color)}${esc(p.name)}</b>
            <span class="pill ${STATUS_PILL[cur || auto]}" data-pill>${esc(bundle.statuses[cur || auto])}</span></div>
          <div class="nums"><span>${fmtUsd(p.spend, 0)}</span><span>${fmtN(p.clicks)} klik</span><span><b>1 lid ${fmtUsd(p.cpl)}</b></span>
            <span>${fmtN(p.leads)} lid${q.length ? ` (${q.join(', ')})` : ''}</span><span>${fmtN(p.sales)} sotuv</span><span>${fmtUzs(p.total_revenue)} so'm</span></div>
          ${adv.best || adv.worst ? `<div class="nums">${adv.best ? `<span>⭐ ${esc(adv.best)}</span>` : ''}${adv.worst ? `<span>👎 ${esc(adv.worst)}</span>` : ''}</div>` : ''}
          ${adv.problems.length ? `<ul class="problems">${adv.problems.map((x) => `<li><span class="who ${x.who}">${esc(WHO[x.who] || '')}</span>${esc(x.text)}</li>`).join('')}</ul>`
            : `<p class="meaning">${esc(MEANING[auto])}</p>`}
          <label class="field">Taklifim direktorga<textarea data-comment rows="${Math.max(2, proposal.split('\n').length)}" aria-label="${esc(p.name)} — taklif">${esc(proposal)}</textarea></label>
          <details><summary>Holatni o'zgartirish</summary>
            <div class="status-chips">${statuses.map(([k, l]) => `<button type="button" data-st="${k}" class="${cur === k ? 'on' : ''} ${auto === k ? 'auto' : ''}">${esc(l)}</button>`).join('')}</div>
          </details>
        </article>`;
      }).join('')}</div>
      <div class="step-foot"><span class="spacer"></span><button class="btn primary" data-save>Saqlash va davom etish →</button></div>
    </section>`;
  }

  // ---------- 4: yuborish ----------
  function sendStep() {
    const tg = state.me.telegram || {};
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">4-qadam</span><h2>${STEPS[3].head}</h2><p>${STEPS[3].hint}</p></div>
      <div class="grid g2">
        <div class="stack">
          <label class="field">Kun xulosasi (ixtiyoriy)<textarea id="rSummary" rows="3" placeholder="Masalan: DIZIPRO da lid ko'p, sotuv kam — ROP bilan gaplashdim">${esc(report?.summary || '')}</textarea></label>
          <label class="field">Ertaga nima qilamiz (ixtiyoriy)<textarea id="rTomorrow" rows="3" placeholder="Masalan: VIZART uchun 2 ta yangi video qo'yamiz">${esc(report?.tomorrow || '')}</textarea></label>
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
      <p class="muted">${String(report.submitted_at || '').slice(11, 16)} da yuborildi${report.status === 'reviewed' ? ' · direktor javob berdi' : ' · direktor javobini kutyapmiz'}</p>
      ${report.director_comment ? `<div class="reply-banner" style="text-align:left"><span class="eyebrow">Direktor yechimi</span><p>${esc(report.director_comment).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div class="nums big-nums"><span><b>${fmtUsd(t.spend, 0)}</b>xarajat</span><span><b>${fmtUsd(t.cpl)}</b>1 lid</span><span><b>${fmtN(t.leads)}</b>lid</span><span><b>${fmtN(t.sales)}</b>sotuv</span><span><b>${fmtUzs(t.total_revenue)}</b>tushum</span></div>
      <div class="row" style="justify-content:center"><button class="btn" data-step-go="send">Xabarni ko'rish</button><button class="btn ghost" data-step-go="target">Raqamlarni o'zgartirish</button></div>
      <p class="small muted">Ertaga shu yerda yangi hisobot boshlanadi.</p>
    </section>`;
  }

  function bindStep() {
    // Enter — pastki qatordagi shu ustun
    box.querySelectorAll('tbody').forEach((tb) => tb.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input')) return;
      e.preventDefault();
      const td = e.target.closest('td');
      const next = td.parentElement.nextElementSibling?.children[td.cellIndex]?.querySelector('input');
      (next || box.querySelector('[data-save]')).focus();
    }));
    const cur = STEPS.find((s) => s.key === step);
    // Taklif maydoni matnga qarab cho'ziladi
    const fit = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
    box.querySelectorAll('.check textarea').forEach((t) => { fit(t); t.addEventListener('input', () => fit(t)); });
    const copyAsk = box.querySelector('[data-copy-ask]');
    if (copyAsk) copyAsk.onclick = () => copyText(askText(cur, daily.projects));
    // Sotuv qadami: lid narxi va lid turlari yig'indisi yozish paytida
    if (step === 'sales') {
      box.querySelector('.grid-entry tbody').addEventListener('input', (e) => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        const p = daily.projects.find((x) => String(x.id) === tr.dataset.id);
        const v = (f) => { const el = $(`input[name="${f}"]`, tr); return el.value === '' ? null : Number(String(el.value).replace(/\s/g, '').replace(',', '.')); };
        const parts = ['qualified', 'potential', 'unqualified'].map(v);
        const total = v('leads') ?? (parts.some((x) => x != null) ? parts.reduce((a, x) => a + (x || 0), 0) : null);
        $('[data-cpl]', tr).textContent = cplText(p.row.spend, total);
        const sumParts = parts.reduce((a, x) => a + (x || 0), 0);
        $('[data-state]', tr).innerHTML = v('leads') != null && parts.some((x) => x != null) && sumParts !== v('leads')
          ? `<span class="pill warn" title="Sifatli + potensial + sifatsiz = ${sumParts}">≠ ${sumParts}</span>` : '';
      });
    }
    box.querySelectorAll('[data-step-go]').forEach((b) => { b.onclick = () => toStep(b.dataset.stepGo); });
    box.querySelector('.checks')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-st]');
      if (!b) return;
      const card = b.closest('.check');
      $$('[data-st]', card).forEach((x) => x.classList.toggle('on', x === b));
      const pill = $('[data-pill]', card);
      pill.className = `pill ${STATUS_PILL[b.dataset.st]}`;
      pill.textContent = bundle.statuses[b.dataset.st];
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
          // Bir loyihaning raqam va izoh maydonlari — bitta so'rovda
          const byProject = {};
          for (const el of box.querySelectorAll('tr[data-id] input[name]')) {
            const p = daily.projects.find((x) => String(x.id) === el.closest('tr').dataset.id);
            if (el.value.trim() !== String(p.row[el.name] ?? '')) (byProject[p.id] ||= {})[el.name] = el.value.trim();
          }
          if (step === 'sales') {
            for (const p of daily.projects) {
              const tr = box.querySelector(`tr[data-id="${p.id}"]`);
              const val = (f) => $(`input[name="${f}"]`, tr).value.trim();
              const parts = ['qualified', 'potential', 'unqualified'].map(val).filter(Boolean);
              if (!val('leads') && parts.length) (byProject[p.id] ||= {}).leads = String(parts.reduce((a, x) => a + Number(x.replace(/\s/g, '').replace(',', '.')), 0));
            }
          }
          let changed = 0;
          for (const [id, values] of Object.entries(byProject)) changed += (await api('/api/daily', { method: 'PUT', body: { project_id: Number(id), date, values } })).changed;
          if (changed) toast('Saqlandi ✓');
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

  // Holat va takliflar + xulosa — bir joydan
  function collectDraft() {
    const project_notes = { ...(report?.project_notes || {}) };
    $$('.check[data-pid]', box).forEach((c) => {
      project_notes[c.dataset.pid] = { status: $('[data-st].on', c)?.dataset.st || null, comment: $('[data-comment]', c).value };
    });
    // Tahlil qadami o'tkazib yuborilsa — tizim holati saqlanadi, taklif xabarda avtomatik chiqadi
    for (const [id, a] of Object.entries(bundle.advice || {})) if (!project_notes[id] && a.status !== 'nodata') project_notes[id] = { status: a.status, comment: null };
    return {
      project_notes,
      summary: $('#rSummary')?.value ?? report?.summary ?? '',
      tomorrow: $('#rTomorrow')?.value ?? report?.tomorrow ?? '',
    };
  }
}

function cplText(spend, leads) {
  return spend != null && leads > 0 ? fmtUsd(spend / leads) : '—';
}

// Kompaniya loyihalari — birinchi kirishda bir bosishda qo'shiladi
const OUR_PROJECTS = [
  { name: 'STARPAY', color: '#2a78d6', about: 'Telegram Premium va Stars savdosi' },
  { name: 'VIZART', color: '#eb6834', about: "interyer va exteryer online o'quv markazi" },
  { name: 'DIZIPRO', color: '#1baf7a', about: "3D modeling online o'quv markazi" },
  { name: 'SELFENG', color: '#eda100', about: 'online general ingliz tili' },
];

function renderOnboarding(box) {
  const have = new Set(state.projects.map((p) => p.name.toUpperCase()));
  box.innerHTML = `<section class="card step">
    <div class="step-head"><span class="eyebrow">Boshlash</span><h2>Loyihalaringizni qo'shing</h2><p>Bir bosishda to'rttala loyiha qo'shiladi. Keyin har kuni shular bo'yicha hisobot to'ldirasiz.</p></div>
    <ul class="onb-list">${OUR_PROJECTS.map((p) => `<li><span class="dot" style="background:${p.color}"></span><b>${p.name}</b><span class="muted">${p.about}</span></li>`).join('')}</ul>
    <button class="btn primary" id="onbAll">${ICONS.plus} To'rttasini qo'shish</button>
    <form id="onbForm" class="row mt"><input name="name" id="onbName" required placeholder="Yoki boshqa loyiha nomi" style="flex:1 1 240px" aria-label="Loyiha nomi"><button class="btn">${ICONS.plus} Qo'shish</button></form>
  </section>`;
  const allBtn = $('#onbAll');
  allBtn.onclick = async () => {
    allBtn.disabled = true;
    try {
      for (const { about, ...p } of OUR_PROJECTS) if (!have.has(p.name)) await api('/api/projects', { method: 'POST', body: p });
      state.projects = await api('/api/projects');
      toast("Loyihalar qo'shildi — hisobotni boshlang");
      renderToday();
    } catch (err) { toast(err.message, true); allBtn.disabled = false; }
  };
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

