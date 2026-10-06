// Proekt menejerning kunlik ishi — 4 qadam: target raqamlari → sotuv raqamlari → tekshirish → direktorga yuborish
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtUzs, fmtSom, fmtP, toast, ICONS, spinnerBlock, dayLabel, refreshMe, isStale, shortDate, copyText, dateButton, openCalendar,
} from './core.js';

const STATUS_PILL = { unprofitable: 'crit', sales_issue: 'crit', creative: 'warn', needs_leads: 'info', scale: 'lime', good: 'good', nodata: '' };

const STEPS = [
  { key: 'target', title: 'Target', head: "Targetologdan so'rang",
    hint: "Har bir loyiha bo'yicha raqamlarni yozing. Ko'rish va klik — faqat target (reklama kabinet). Bloger va Telegram kanallarga to'lov bo'lmagan kun bo'sh qoldiriladi.",
    ask: ['Har bir loyihaga nechta lid tushdi (avtovoronkada — botga nechta start)?', 'Qaysi loyihaga targetga qancha pul sarflandi ($)?', 'Blogerlarga va Telegram kanallarga reklama uchun qancha to\'landi ($)?', "Nechta ko'rish va nechta klik bo'ldi?", 'Kecha nechta yangi kreativ chiqdi?',
      'Qaysi kreativ yaxshi ishladi, qaysi biri ishlamadi?', "Reklamada muammo bo'ldimi (akkaunt, moderatsiya, to'lov)?"],
    fields: [['leads', 'Lid'], ['spend', 'Target, $'], ['spend_blogger', 'Blogerga, $'], ['spend_posts', 'TG kanallarga, $'], ['impressions', "Ko'rish"], ['clicks', 'Klik'], ['new_creatives', 'Yangi kreativ']],
    required: ['spend', 'clicks'],
    texts: [['creative_best', 'Yaxshi ishlagan kreativ', 'nomi yoki havola'], ['creative_worst', 'Ishlamayotgan kreativ', 'nomi yoki havola'], ['note_target', 'Muammo', "akkaunt, moderatsiya, to'lov…"]] },
  { key: 'sales', title: 'Sotuv', head: "Sotuv va tushgan pul",
    hint: "Sifatli — sotib olishga tayyor. Potensial — qiziqdi, keyinroq olishi mumkin. Sifatsiz — maqsadli emas yoki javob bermadi. Avtovoronka raqamlari botdan / to'lov tizimidan olinadi.",
    ask: ['Har bir loyihaga nechta lid tushdi?', 'Nechtasi sifatli, nechtasi sifatsiz, nechtasi potensial?', "Nechtasi bilan qayta aloqa, nechtasi o'ylab ko'radi, nechtasi video ko'rishi kerak, nechtasi bekor qildi?", 'Instagram direktdan va Telegram admin lichkasidan nechta lid keldi?', "Nechta sotuv bo'ldi va qancha pul tushdi?",
      'Sifatsizlar nega sifatsiz, sotib olmaganlar nega olmadi (har sababdan nechta)?'],
    askAuto: ['Avtovoronka: botga nechta odam kirdi (start), nechtasi sotib oldi, qancha pul tushdi?'],
    fields: [['leads', 'Umumiy lid'], ['qualified', 'Sifatli'], ['unqualified', 'Sifatsiz'], ['potential', 'Potensial'], ['st_callback', 'Qayta aloqa'], ['st_thinking', "O'ylab ko'radi"], ['st_video', "Video ko'rishi kerak"], ['st_cancelled', 'Bekor qilindi'], ['sales', 'Sotuv'], ['revenue', "Tushgan pul, so'm"]],
    required: ['leads', 'sales', 'revenue'],
    autoFields: [['starts', 'Bot start'], ['sales', 'Xarid'], ['revenue', "Tushgan pul, so'm"]],
    autoRequired: ['sales', 'revenue'],
    texts: [['note_sales', 'ROP izohi', "nega sotib olmayapti, nima xalaqit beryapti…"]] },
  { key: 'check', title: 'Tahlil', head: 'Tahlil qiling va taklif yozing',
    hint: "Har bir loyihada tizim muammoni topdi va taklif yozdi. Kerak bo'lsa taklifni o'zgartiring." },
  { key: 'send', title: 'Yuborish', head: 'Direktorga yuboring',
    hint: 'Direktor Telegramda aynan shu xabarni oladi va javob (reply) qilib yechim yozadi — javob sizga keladi.' },
];

export function dateNav(date, onChange) {
  const isToday = date === state.me.reportDay;
  setTimeout(() => {
    $('#dPrev').onclick = () => onChange(addDays(date, -1));
    $('#dNext').onclick = () => { if (!isToday) onChange(addDays(date, 1)); };
    $('#dPick').onclick = (e) => openCalendar(e.currentTarget, { value: date, max: state.me.reportDay, onPick: onChange });
  });
  return `<div class="filters"><button class="btn small icon" id="dPrev" aria-label="Oldingi kun">←</button>
    ${dateButton('dPick', date, 'Hisobot sanasi')}
    <button class="btn small icon" id="dNext" aria-label="Keyingi kun" ${isToday ? 'disabled' : ''}>→</button></div>`;
}

const filled = (row, fields) => fields.every((f) => row[f] != null);
const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#4c86ff')}"></span>`;

function stepDone(key, daily, report) {
  if (key === 'target') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, STEPS[0].required));
  if (key === 'sales') return daily.projects.length > 0 && daily.projects.every((p) => filled(p.row, p.kind === 'auto' ? STEPS[1].autoRequired : STEPS[1].required));
  // PM tahlil qadamini saqlagan bo'lsa hisobotda muallif bor (direktor javobidan yaratilgan qatorda — yo'q)
  if (key === 'check') return Boolean(report?.author_id);
  return Boolean(report && report.status !== 'draft');
}

// Targetolog/ROP ga Telegramda yuborish uchun tayyor savollar
function askText(s, projects) {
  return `Salom! Kechagi hisobot uchun har bir loyiha (${projects.map((p) => p.name).join(', ')}) bo'yicha yozib bering:\n${askList(s, projects).map((q, i) => `${i + 1}) ${q}`).join('\n')}`;
}
const askList = (s, projects) => [...s.ask, ...(projects.some((p) => p.kind === 'auto') ? s.askAuto || [] : [])];

// Sana manzilda: #/kiritish?date=YYYY-MM-DD (arxivdan yoki ←/→ bilan); sanasiz — doim kechagi kun
export const reportHash = (d) => (d === state.me.reportDay ? '#/kiritish' : `#/kiritish?date=${d}`);

export async function renderToday() {
  const qd = new URLSearchParams(location.hash.split('?')[1] || '').get('date');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(qd || '') && qd <= state.me.reportDay ? qd : state.me.reportDay;
  const go = (d) => { state.pmStep = null; if (location.hash !== reportHash(d)) location.hash = reportHash(d); else renderToday(); };
  const first = String(state.me.user.name || '').split(' ')[0];
  shell(`<div class="page-head"><div><h1>${date === state.me.reportDay ? `Salom, <span class="grad">${esc(first)}</span>` : `<span class="grad">${dayLabel(date)}</span>`}</h1>
      <div class="sub">${date === state.me.reportDay ? `Kechagi (${dayLabel(date)}) hisobotni 4 qadamda tayyorlaymiz` : 'Shu kun hisoboti'}</div></div>${dateNav(date, go)}</div>
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
  // Tanlangan qadam faqat shu sana uchun eslab qolinadi
  let step = (state.pmStep?.date === date && state.pmStep.step) || (sent ? 'done' : STEPS.find((s) => !done[s.key])?.key || 'send');

  const stepper = `<nav class="stepper" aria-label="Qadamlar">${STEPS.map((s, i) => `<button data-step="${s.key}" class="${step === s.key ? 'on' : ''} ${done[s.key] ? 'ok' : ''}">
      <span class="num">${done[s.key] ? ICONS.check : i + 1}</span><span>${s.title}</span></button>${i < STEPS.length - 1 ? '<i></i>' : ''}`).join('')}</nav>`;
  // Direktorning oxirgi yechimi — PM bugun shuni bajarishi kerak.
  // Shu kun hisobotini PM yubormagan, direktor esa avtomatik hisobotga javob yozgan bo'lsa — o'sha javob
  const sameDay = report?.director_comment && !sent ? { date, text: report.director_comment, auto: true } : null;
  const shownReply = step !== 'done' ? sameDay || bundle.prevReply : null;
  const reply = shownReply
    ? `<div class="reply-banner"><span class="eyebrow">Direktor yechimi · ${shortDate(shownReply.date)}${shownReply.auto ? ' · avtomatik hisobotga' : ''}</span><p>${esc(shownReply.text).replace(/\n/g, '<br>')}</p></div>` : '';

  const toStep = (k) => { state.pmStep = { date, step: k }; renderToday(); };
  const body = { target: () => entryStep(0), sales: () => entryStep(1), check: checkStep, send: sendStep, done: doneStep }[step]();
  box.innerHTML = stepper + reply + body;
  box.querySelector('.stepper').onclick = (e) => { const b = e.target.closest('[data-step]'); if (b) toStep(b.dataset.step); };
  bindStep();

  // ---------- 1-2: targetolog va ROP raqamlari ----------
  function entryStep(i) {
    const s = STEPS[i];
    const sales = s.key === 'sales';
    const leadsP = daily.projects.filter((p) => !sales || p.kind !== 'auto');
    const autoP = sales ? daily.projects.filter((p) => p.kind === 'auto') : [];
    const textP = sales ? leadsP : daily.projects;
    return `<section class="card step">
      <div class="step-top">
        <div class="step-head"><span class="eyebrow">${i + 1}-qadam</span><h2>${s.head}</h2><p>${s.hint}</p></div>
        <div class="ask"><b>So'raladigan savollar</b><ol>${askList(s, daily.projects).map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
          <button class="btn small" data-copy-ask>${ICONS.copy} Nusxalash — Telegramda yuborish uchun</button></div>
      </div>
      ${leadsP.length ? `${sales && autoP.length ? "<h3 class=\"tbl-title\">Sotuv bo'limi orqali</h3>" : ''}${numTable(leadsP, s.fields, s.required, sales ? 'cpl' : null)}` : ''}
      ${autoP.length ? `<h3 class="tbl-title">Avtovoronka <span class="muted small">— botdan va to'lov tizimidan</span></h3>${numTable(autoP, s.autoFields, s.autoRequired, 'cps')}` : ''}
      ${sales && leadsP.length ? sourcesBlock(leadsP) : ''}
      ${textP.length ? `<details class="extra" ${textP.some((p) => s.texts.some(([f]) => p.row[f])) ? 'open' : ''}><summary>${sales ? 'ROP izohlari' : 'Kreativlar va muammolar'} <span class="muted">(ixtiyoriy)</span></summary>
        <div class="table-wrap"><table class="grid-entry text-entry" style="--cols:1"><thead><tr><th>Loyiha</th>${s.texts.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
        <tbody>${textP.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
          ${s.texts.map(([f, l, ph]) => `<td class="n" data-label="${l}"><input class="cell-in txt" name="${f}" maxlength="300" value="${esc(p.row[f] ?? '')}" placeholder="${esc(ph)}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </details>` : ''}
      ${sales && leadsP.length ? reasonsBlock(leadsP) : ''}
      ${sales ? channelsEntry(daily.projects) : ''}
      <div class="step-foot"><span class="muted small">${sales ? "Jami lid bo'sh qolsa — uch turi qo'shiladi." : 'Kulrang raqam — kechagi qiymat. Enter — keyingi qator.'}</span><span class="spacer"></span>
        <button class="btn ghost" data-skip>O'tkazib yuborish</button><button class="btn primary" data-save>Saqlash va davom etish →</button></div>
    </section>`;
  }

  // calc: jonli hisob — 1 lid narxi (cpl) yoki 1 start narxi (cps)
  function numTable(projects, fields, required, calc) {
    return `<div class="table-wrap"><table class="grid-entry ${fields.length > 4 ? 'wide' : ''} ${fields.length > 7 ? 'xwide' : ''}" style="--cols:${fields.length % 3 ? 2 : 3}" ${calc ? `data-calc="${calc}"` : ''}><thead><tr><th>Loyiha</th>${fields.map(([, l]) => `<th class="n">${l}</th>`).join('')}${calc ? `<th class="n">${calc === 'cpl' ? '1 lid' : '1 start'}</th>` : ''}<th></th></tr></thead>
      <tbody>${projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${fields.map(([f0, l]) => { const f = f0 === 'leads' && p.kind === 'auto' && fields[0][0] === 'leads' ? 'starts' : f0; return `<td class="n" data-label="${f === 'starts' && f0 === 'leads' ? 'Bot start' : l}"><input class="cell-in" inputmode="decimal" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${f === 'starts' && f0 === 'leads' ? 'Bot start' : l}" ${f === 'starts' && f0 === 'leads' ? 'title="Avtovoronka: botga start"' : ''}></td>`; }).join('')}
        ${calc ? `<td class="n calc" data-label="${calc === 'cpl' ? '1 lid narxi' : '1 start narxi'}" data-cpl>${cplText(p.row.spend, calc === 'cpl' ? p.row.leads : p.row.starts)}</td>` : ''}
        <td data-state>${filled(p.row, required) ? '<span class="pill good">✓</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // «Nega?» — ROP har sababdan nechta ekanini aytadi
  function reasonsBlock(projects) {
    const { reasons, reasonKinds } = state.me;
    const has = projects.some((p) => Object.values(p.reasons || {}).some((m) => Object.keys(m).length));
    return `<details class="extra" ${has ? 'open' : ''}><summary>Sabablar raqamda: nega sifatsiz, nega sotib olmadi <span class="muted">(ROP sanab beradi)</span></summary>
      <div class="reasons-in">${projects.map((p) => `<div class="rin" data-rid="${p.id}"><b>${dot(p.color)}${esc(p.name)}</b>
        ${Object.entries(reasonKinds).map(([kind, title]) => `<div class="rin-kind"><span class="muted small">${title}</span><div class="rin-grid">
          ${[...new Set([...(p.reasonKeys?.[kind] || Object.keys(reasons[kind])), ...Object.keys(p.reasons?.[kind] || {})])].filter((r) => reasons[kind][r]).map((r) => [r, reasons[kind][r]]).map(([r, l]) => `<label><span>${esc(l)}</span><input class="cell-in" inputmode="numeric" data-kind="${kind}" data-reason="${r}" value="${p.reasons?.[kind]?.[r] ?? ''}" aria-label="${esc(p.name)} — ${esc(l)}"></label>`).join('')}
        </div></div>`).join('')}</div>`).join('')}</div>
    </details>`;
  }

  // Lichkadan kelgan lidlar: Instagram direkt va Telegram admin lichkasi — faqat soni (jami lid ichida)
  function sourcesBlock(projects) {
    const SRC = [['src_ig', 'Instagram direktdan'], ['src_tg', 'Telegram lichkadan']];
    return `<h3 class="tbl-title">Lichkadan kelgan lidlar <span class="muted small">— Instagram direkt va Telegram admin lichkasi, nechta (jami lid ichida)</span></h3>
      <div class="table-wrap"><table class="grid-entry grid-mini" style="--cols:2"><thead><tr><th>Loyiha</th>${SRC.map(([, l]) => `<th class="n">${l}</th>`).join('')}</tr></thead>
      <tbody>${projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${SRC.map(([f, l]) => `<td class="n" data-label="${l}"><input class="cell-in" inputmode="numeric" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  // Kanallar bo'yicha: Telegram Ads, Instagram, bloger… — qaysi kanal sifatli lid va arzon mijoz beradi
  function channelsEntry(projects) {
    const { channels: names, channelFields } = state.me;
    const withCh = projects.filter((p) => (p.channels || []).length);
    if (!withCh.length) return `<details class="extra"><summary>Kanallar bo'yicha <span class="muted">(ixtiyoriy)</span></summary>
      <p class="muted small">Loyihaga kanallar belgilanmagan. <a href="#/sozlamalar">Sozlamalar → Loyihalar</a> da Telegram Ads, Instagram, bloger… ni tanlang.</p></details>`;
    const has = withCh.some((p) => Object.keys(p.channelRows || {}).length);
    return `<details class="extra" ${has ? 'open' : ''}><summary>Kanallar bo'yicha <span class="muted">(ixtiyoriy — targetolog va ROP birga aytadi)</span></summary>
      ${withCh.map((p) => {
        const fields = Object.entries(channelFields).filter(([f]) => p.kind !== 'auto' || !['leads', 'qualified'].includes(f));
        return `<h3 class="tbl-title">${dot(p.color)}${esc(p.name)}</h3>
        <div class="table-wrap"><table class="grid-entry ${fields.length > 4 ? 'wide' : ''}" style="--cols:${fields.length % 3 ? 2 : 3}" data-chp="${p.id}"><thead><tr><th>Kanal</th>${fields.map(([f, l]) => `<th class="n">${esc(p.kind === 'auto' && f === 'clicks' ? 'Bot start' : l)}</th>`).join('')}</tr></thead>
        <tbody>${p.channels.map((c) => `<tr data-ch="${c}"><td>${esc(names[c] || c)}</td>
          ${fields.map(([f, l]) => `<td class="n" data-label="${esc(l)}"><input class="cell-in" inputmode="decimal" data-f="${f}" value="${p.channelRows?.[c]?.[f] ?? ''}" aria-label="${esc(p.name)} — ${esc(names[c] || c)} — ${esc(l)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }).join('')}
    </details>`;
  }

  // ---------- 3: tahlil va takliflar ----------
  function checkStep() {
    const notes = report?.project_notes || {};
    const statuses = Object.entries(bundle.statuses).filter(([k]) => k !== 'nodata');
    const WHO = bundle.adviceWho || {};
    // AI matni: hozirgina tahlil qilingan bo'lsa — barcha maydonlarga; aks holda PM saqlamagan joyga.
    // Raqamlar AI dan keyin o'zgargan bo'lsa (stale) — eski AI matni qo'yilmaydi
    const ai = bundle.ai && !bundle.ai.stale ? bundle.ai : null;
    const fresh = state.aiFill === date;
    state.aiFill = null;
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">3-qadam</span><h2>${STEPS[2].head}</h2><p>${STEPS[2].hint}</p></div>
      ${aiBar()}
      <div class="checks">${bundle.day.byProject.map((p) => {
        const adv = bundle.advice?.[p.id] || { status: 'nodata', problems: [], proposals: [] };
        const auto = adv.status || 'nodata';
        const cur = notes[p.id]?.status || (auto === 'nodata' ? null : auto);
        const aiFor = ai?.texts?.[p.id] || null;
        const proposal = (fresh && aiFor) || notes[p.id]?.comment || aiFor || autoProposal(adv);
        const fromAi = Boolean(aiFor) && proposal === aiFor;
        const empty = !p.reported.spend && !p.reported.leads && !p.reported.sales;
        const revIn = p.reported.revenue > 0;
        // Targetolog/ROP izohlari — alohida; muammolar ro'yxatida faqat raqamdan chiqqan xulosalar
        const isNote = (x) => /^(Targetolog|ROP): /.test(x.text);
        const issues = adv.problems.filter((x) => !isNote(x));
        const notesList = adv.problems.filter(isNote);
        const WHO_SHORT = { target: 'Target', sales: 'Sotuv', director: 'Direktor' };
        const extra = adv.best || adv.worst || notesList.length;
        return `<article class="check ${empty ? 'is-empty' : ''}" data-pid="${p.id}">
          <div class="check-top"><b>${dot(p.color)}${esc(p.name)}</b>
            <span class="pill ${empty ? '' : STATUS_PILL[cur || auto]}" data-pill>${empty ? 'Kiritilmagan' : esc(bundle.statuses[cur || auto])}</span></div>
          ${empty ? `<div class="nodata">Raqamlar hali kiritilmagan. <button type="button" class="btn small" data-step-go="target">Kiritish</button></div>` : `
          <div class="mini">
            <div><small>Reklama</small><b>${fmtUsd(p.spend, 0)}</b></div>
            <div><small>Tushum</small><b>${revIn ? fmtSom(p.revenue) : '—'}</b></div>
            ${revIn ? `<div><small>${p.net_profit < 0 ? 'Zarar' : 'Sof foyda'}</small><b class="${p.net_profit < 0 ? 'neg' : 'pos'}">${fmtSom(p.net_profit)}</b></div>` : '<div><small>Sof foyda</small><b class="muted" title="Tushum kiritilmagan">—</b></div>'}
            <div title="${esc(p.conv_label)}"><small>Konversiya</small><b>${p.reported.sales ? fmtP(p.conv) : '—'}</b></div>
          </div>
          ${issues.length ? `<ul class="problems">${issues.slice(0, 3).map((x) => `<li><span class="who ${x.who}">${WHO_SHORT[x.who] || ''}</span><span>${esc(x.text)}</span></li>`).join('')}</ul>`
            : '<p class="ok-line">✓ Muammo topilmadi</p>'}`}
          <label class="field"><span>${empty ? 'Izoh (ixtiyoriy)' : 'Direktorga taklif'}${fromAi ? '<span class="ai-tag">🤖 AI yozdi — tekshiring</span>' : ''}</span><textarea data-comment rows="2" class="${fromAi ? 'ai-filled' : ''}" placeholder="${empty ? 'Masalan: targetolog raqam bermadi' : ''}" aria-label="${esc(p.name)} — taklif">${esc(empty && !notes[p.id]?.comment ? '' : proposal)}</textarea></label>
          <details><summary>${extra ? 'Kreativlar, izohlar va holat' : "Holatni o'zgartirish"}</summary>
            ${adv.best || adv.worst ? `<div class="nums">${adv.best ? `<span>⭐ ${esc(adv.best)}</span>` : ''}${adv.worst ? `<span>👎 ${esc(adv.worst)}</span>` : ''}</div>` : ''}
            ${notesList.map((x) => `<p class="note-line">${esc(x.text)}</p>`).join('')}
            <div class="status-chips">${statuses.map(([k, l]) => `<button type="button" data-st="${k}" class="${cur === k ? 'on' : ''} ${auto === k ? 'auto' : ''}">${esc(l)}</button>`).join('')}</div>
          </details>
        </article>`;
      }).join('')}</div>
      <div class="step-foot"><span class="spacer"></span><button class="btn primary" data-save>Saqlash va davom etish →</button></div>
    </section>`;
  }

  // AI tahlil paneli: holat, tugma, eskirgan bo'lsa — ogohlantirish
  function aiBar() {
    const st = bundle.aiStatus || {};
    if (!st.enabled) {
      return `<div class="ai-bar off"><span class="ai-ic">🤖</span><div><b>AI tahlil</b>
        <span class="muted small">${esc(st.reason || 'AI ulanmagan')}. Tahlil tizim qoidalari bo'yicha yozildi — <a href="#/sozlamalar?tab=telegram">holatini ko'rish</a>.</span></div></div>`;
    }
    const a = bundle.ai;
    const hasData = bundle.day.byProject.some((p) => p.reported.spend || p.reported.leads || p.reported.sales);
    const who = a ? `${a.provider === st.provider ? st.label : a.provider} · ${a.model}` : `${st.label} · ${st.model}`;
    const line = !a ? `${esc(who)} — raqamlarni o'qib, har loyiha bo'yicha tahlil va taklif yozadi. Siz o'qib, tuzatib, saqlaysiz.`
      : a.stale ? `<span class="ai-warn">Raqamlar AI tahlildan keyin o'zgardi — qayta tahlil qiling</span>`
        : `${esc(who)} · ${esc(String(a.at || '').slice(11, 16))} da. AI matni pastdagi maydonlarda — o'qing, xatosini tuzating va saqlang: direktorga siz saqlagan matn boradi.`;
    return `<div class="ai-bar ${a?.stale ? 'stale' : ''}"><span class="ai-ic">🤖</span><div><b>AI tahlil</b><span class="small">${line}</span></div>
      <button type="button" class="btn ${a && !a.stale ? '' : 'primary'}" data-ai ${hasData ? '' : 'disabled title="Avval raqamlarni kiriting"'}>${a ? '↻ Qayta tahlil' : 'AI bilan tahlil qilish'}</button></div>`;
  }

  // ---------- 4: yuborish ----------
  function sendStep() {
    const tg = state.me.telegram || {};
    // AI yozgan xulosa — PM o'zi yozmagan bo'lsa taklif sifatida (yuborishdan oldin o'zgartirsa bo'ladi)
    const ai = bundle.ai && !bundle.ai.stale && (!report || report.status === 'draft') ? bundle.ai : null;
    const sum = report?.summary || ai?.xulosa || '';
    const tom = report?.tomorrow || ai?.ertaga || '';
    const aiTag = (fromAi) => (fromAi ? '<span class="ai-tag">🤖 AI yozdi — tekshiring</span>' : '');
    return `<section class="card step">
      <div class="step-head"><span class="eyebrow">4-qadam</span><h2>${STEPS[3].head}</h2><p>${STEPS[3].hint}</p></div>
      <div class="grid g2">
        <div class="stack">
          <label class="field"><span>Kun xulosasi (ixtiyoriy)${aiTag(!report?.summary && sum)}</span><textarea id="rSummary" rows="3" class="${!report?.summary && sum ? 'ai-filled' : ''}" ${!report?.summary && sum ? 'data-ai-filled' : ''} placeholder="Masalan: DIZIPRO da lid ko'p, sotuv kam — ROP bilan gaplashdim">${esc(sum)}</textarea></label>
          <label class="field"><span>Ertaga nima qilamiz (ixtiyoriy)${aiTag(!report?.tomorrow && tom)}</span><textarea id="rTomorrow" rows="3" class="${!report?.tomorrow && tom ? 'ai-filled' : ''}" ${!report?.tomorrow && tom ? 'data-ai-filled' : ''} placeholder="Masalan: VIZART uchun 2 ta yangi video qo'yamiz">${esc(tom)}</textarea></label>
          ${bundle.ai?.stale ? `<div class="insight warning"><span class="ic">AI</span><span>Raqamlar AI tahlildan keyin o'zgardi. <button type="button" class="link-btn" data-step-go="check">3-qadamda qayta tahlil qiling</button>.</span></div>` : ''}
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
      <h2>${date === state.me.reportDay ? 'Kechagi hisobot yuborildi' : 'Hisobot yuborilgan'}</h2>
      <p class="muted">${String(report.submitted_at || '').slice(11, 16)} da yuborildi${report.status === 'reviewed' ? ' · direktor javob berdi' : ' · direktor javobini kutyapmiz'}</p>
      ${report.director_comment ? `<div class="reply-banner" style="text-align:left"><span class="eyebrow">Direktor yechimi</span><p>${esc(report.director_comment).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div class="nums big-nums"><span><b>${fmtUsd(t.spend, 0)}</b>xarajat</span><span><b>${fmtSom(t.net_profit)}</b>sof foyda</span><span><b>${fmtN(t.leads)}</b>lid</span><span><b>${fmtN(t.sales)}</b>sotuv</span><span><b>${fmtUzs(t.revenue)}</b>tushum</span></div>
      <div class="row" style="justify-content:center"><button class="btn" data-step-go="send">Xabarni ko'rish</button><button class="btn ghost" data-step-go="target">Raqamlarni o'zgartirish</button></div>
      <p class="small muted">Ertaga shu yerda bugungi kun hisobotini tayyorlaysiz.</p>
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
    box.querySelectorAll('table[data-calc]').forEach((tbl) => tbl.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const p = daily.projects.find((x) => String(x.id) === tr.dataset.id);
      const v = (f) => { const el = $(`input[name="${f}"]`, tr); return !el || el.value === '' ? null : Number(String(el.value).replace(/\s/g, '').replace(',', '.')); };
      if (tbl.dataset.calc === 'cps') { $('[data-cpl]', tr).textContent = cplText(p.row.spend, v('starts')); return; }
      {
        const parts = ['qualified', 'potential', 'unqualified'].map(v);
        const total = v('leads') ?? (parts.some((x) => x != null) ? parts.reduce((a, x) => a + (x || 0), 0) : null);
        $('[data-cpl]', tr).textContent = cplText(p.row.spend, total);
        const sumParts = parts.reduce((a, x) => a + (x || 0), 0);
        $('[data-state]', tr).innerHTML = v('leads') != null && parts.some((x) => x != null) && sumParts !== v('leads')
          ? `<span class="pill warn" title="Sifatli + potensial + sifatsiz = ${sumParts}">≠ ${sumParts}</span>` : '';
      }
    }));
    box.querySelectorAll('[data-step-go]').forEach((b) => { b.onclick = () => toStep(b.dataset.stepGo); });
    // AI tahlil: natija maydonlarga qo'yiladi, PM o'qib, tuzatib, «Saqlash» bosadi
    const aiBtn = box.querySelector('[data-ai]');
    if (aiBtn) aiBtn.onclick = async () => {
      const edited = $$('.check textarea', box).some((t) => t.value !== t.defaultValue);
      if (edited && !window.confirm("Siz yozgan (saqlanmagan) matn AI matni bilan almashtiriladi. Davom etilsinmi?")) return;
      const label = aiBtn.innerHTML;
      aiBtn.disabled = true;
      aiBtn.innerHTML = '<span class="spinner"></span> Tahlil qilinmoqda… (1 daqiqagacha)';
      try {
        await api('/api/report/ai', { method: 'POST', body: { date } });
        state.aiFill = date;
        toast("AI tahlil tayyor — o'qing, tuzating va saqlang");
        renderToday();
      } catch (err) {
        toast(err.message, true);
        aiBtn.disabled = false;
        aiBtn.innerHTML = label;
      }
    };
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
            for (const p of daily.projects.filter((x) => x.kind !== 'auto')) {
              const tr = box.querySelector(`tr[data-id="${p.id}"]`);
              const val = (f) => $(`input[name="${f}"]`, tr).value.trim();
              const parts = ['qualified', 'potential', 'unqualified'].map(val).filter(Boolean);
              if (!val('leads') && parts.length) (byProject[p.id] ||= {}).leads = String(parts.reduce((a, x) => a + Number(x.replace(/\s/g, '').replace(',', '.')), 0));
            }
          }
          // Sabablar: o'zgargan qiymatlar
          const reasonsBy = {};
          for (const el of box.querySelectorAll('[data-rid] input[data-reason]')) {
            const p = daily.projects.find((x) => String(x.id) === el.closest('[data-rid]').dataset.rid);
            const old = String(p.reasons?.[el.dataset.kind]?.[el.dataset.reason] ?? '');
            if (el.value.trim() !== old) ((reasonsBy[p.id] ||= {})[el.dataset.kind] ||= {})[el.dataset.reason] = el.value.trim();
          }
          // Kanallar: o'zgargan kataklar
          const chBy = {};
          for (const el of box.querySelectorAll('[data-chp] input[data-f]')) {
            const pid = el.closest('[data-chp]').dataset.chp;
            const ch = el.closest('[data-ch]').dataset.ch;
            const p = daily.projects.find((x) => String(x.id) === pid);
            if (el.value.trim() !== String(p.channelRows?.[ch]?.[el.dataset.f] ?? '')) ((chBy[pid] ||= {})[ch] ||= {})[el.dataset.f] = el.value.trim();
          }
          let changed = 0;
          for (const id of new Set([...Object.keys(byProject), ...Object.keys(reasonsBy), ...Object.keys(chBy)])) {
            changed += (await api('/api/daily', { method: 'PUT', body: { project_id: Number(id), date, values: byProject[id] || {}, reasons: reasonsBy[id], channels: chBy[id] } })).changed;
            if (reasonsBy[id]) changed += 1;
          }
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
      // AI yozgan xulosa qo'yilgan bo'lsa — saqlanadi, shunda o'ngdagi xabarda ham ko'rinadi
      if (box.querySelector('[data-ai-filled]')) persist(); else refresh();
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

  // Holat va takliflar + xulosa — bir joydan.
  // Faqat PM o'zgartirgani saqlanadi: tizim taklifi va holati tegilmagan bo'lsa — saqlanmaydi,
  // shunda raqamlar keyin tuzatilsa, direktorga boradigan xabarda tahlil qayta hisoblanadi
  function collectDraft() {
    const project_notes = { ...(report?.project_notes || {}) };
    $$('.check[data-pid]', box).forEach((c) => {
      const adv = bundle.advice?.[c.dataset.pid] || { proposals: [] };
      const st = $('[data-st].on', c)?.dataset.st || null;
      const text = $('[data-comment]', c).value;
      project_notes[c.dataset.pid] = {
        status: st && st !== adv.status ? st : null,
        comment: sameText(text, autoProposal(adv)) ? null : text,
      };
    });
    return {
      project_notes,
      summary: $('#rSummary')?.value ?? report?.summary ?? '',
      tomorrow: $('#rTomorrow')?.value ?? report?.tomorrow ?? '',
    };
  }
}

// Tizim taklifi matni (3-qadamdagi maydon shu bilan to'ldiriladi)
const autoProposal = (adv) => (adv?.proposals || []).map((x) => `• ${x}`).join('\n');
const sameText = (a, b) => String(a ?? '').replace(/\s+/g, ' ').trim() === String(b ?? '').replace(/\s+/g, ' ').trim();

function cplText(spend, leads) {
  return spend != null && leads > 0 ? fmtUsd(spend / leads) : '—';
}

// Kompaniya loyihalari — birinchi kirishda bir bosishda qo'shiladi
const OUR_PROJECTS = [
  { name: 'STARPAY', color: '#2a78d6', kind: 'auto', about: 'Telegram Premium va Stars savdosi · avtovoronka' },
  { name: 'VIZART', color: '#eb6834', about: "interyer va exteryer online o'quv markazi" },
  { name: 'DIZIPRO', color: '#1baf7a', about: "3D modeling online o'quv markazi" },
  { name: 'SELFENG', color: '#eda100', about: 'online general ingliz tili' },
];

function renderOnboarding(box) {
  const have = new Set(state.projects.map((p) => p.name.toUpperCase()));
  box.innerHTML = `<section class="card step">
    <div class="step-head"><span class="eyebrow">Boshlash</span><h2>Loyihalaringizni qo'shing</h2><p>Bir bosishda to'rttala loyiha qo'shiladi. Keyin har kuni shular bo'yicha hisobot to'ldirasiz.</p></div>
    <ul class="onb-list">${OUR_PROJECTS.map((p) => `<li><span class="dot" style="--dc:${p.color}"></span><b>${p.name}</b><span class="muted">${p.about}</span></li>`).join('')}</ul>
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
    : '<div class="card empty">Hali hisobot yo\'q. «Kechagi hisobot» bo\'limida birinchisini tayyorlang.</div>';
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-date]');
    if (!b) return;
    state.pmStep = null;
    location.hash = reportHash(b.dataset.date);
  });
}

