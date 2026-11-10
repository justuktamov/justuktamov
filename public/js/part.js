// Kunlik qism sahifasi (Target / Sotuv): ruxsati bor xodim kiritadi va «Yuborish» bilan PM ga topshiradi.
// Ruxsati yo'qlar (direktor, boshqa bo'lim xodimlari) — shu sahifani ko'rish rejimida ko'radi; PM — tuzatadi, tasdiqlash «Kunlik hisobot»da
import {
  $, $$, esc, api, state, shell, fmtN, PART_ROUTE, inVal, toast, ICONS, spinnerBlock, dayLabel, refreshMe, isStale, parseNum,
  canEditSection, isAdminUser, viewNote,
} from './core.js';
import { STEPS, dateNav, historyBlock, reasonsHtml, entryCards, bindCards, readOnlyCards, SRC_FIELDS } from './pm.js';

const ROLE = {
  target: {
    step: STEPS[0],
    head: 'Target hisoboti',
    hint: "Reklama kabinetidan kechagi raqamlar. Lid bo'sh qolsa — sayt + bot qo'shiladi.",
    textsTitle: 'Kreativlar va muammolar',
  },
  rop: {
    step: STEPS[1],
    head: 'Sotuv hisoboti',
    hint: "Kechagi lidlar, holati, sotuv va tushum. Jami lid bo'sh qolsa — qismlari qo'shiladi.",
    textsTitle: 'Izoh',
  },
};
const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#4c86ff')}"></span>`;
// Sahifa manzili: #/target yoki #/sotuv (kechadan boshqa kun — ?date=…)
let curPart = 'target';
const partHash = (d) => `${PART_ROUTE[curPart][0]}${d === state.me.reportDay ? '' : `?date=${d}`}`;


export async function renderPart({ part = curPart, rolled = null } = {}) {
  state.leaveGuard = null;
  state.isDirty = null;
  curPart = part;
  const role = part;
  const R = ROLE[role];
  const editable = canEditSection(part);
  const pm = isAdminUser();
  // Xodimning o'z qismi (yuboradi); PM — faqat tuzatadi; qolganlar — ko'radi
  const own = editable && !pm;
  const s = R.step;
  const qd = new URLSearchParams(location.hash.split('?')[1] || '').get('date');
  let date = /^\d{4}-\d{2}-\d{2}$/.test(qd || '') && qd <= state.me.reportDay ? qd : state.me.reportDay;
  if (own && !qd && rolled && rolled < state.me.reportDay && state.partOpen?.date === rolled && !state.partOpen.sent) {
    date = rolled;
    history.replaceState(null, '', partHash(rolled));
    state.shownHash = location.hash;
    toast(`Kun almashdi. ${dayLabel(rolled)} hisoboti hali yuborilmagan — shu yerda davom eting`);
  }
  const go = async (d) => {
    if (state.leaveGuard && !(await state.leaveGuard())) return;
    if (location.hash !== partHash(d)) location.hash = partHash(d); else renderPart({ part });
  };
  const isY = date === state.me.reportDay;
  shell(`<div class="page-head"><div><h1>${R.head}</h1>
      <div class="sub">${isY ? 'Kecha · ' : ''}${dayLabel(date)}</div></div>${dateNav(date, go)}</div>
    ${viewNote(part)}<div id="part">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  let daily;
  try { daily = await api(`/api/daily?date=${date}`); } catch (e) { const el = $('#part'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#part');
  if (!box || isStale(rid)) return;
  // Kiritish — faqat o'ziga biriktirilgan loyihalar (ko'rish rejimida — hammasi)
  if (own && daily.editable) daily.projects = daily.projects.filter((p) => daily.editable.includes(p.id));
  if (!daily.projects.length) {
    box.innerHTML = '<div class="card empty">Sizga hali loyiha biriktirilmagan — proekt menejerga ayting.</div>';
    return;
  }
  const sentAt = own ? daily.mine?.submitted_at || null : null;
  if (own) state.partOpen = { date, sent: Boolean(sentAt) };
  // Kim kiritadi va yubordimi — ko'ruvchilar va PM uchun
  const who = (daily.staff || []).filter((x) => x.role === part);
  const whoLine = !own ? `<div class="who-line">${who.length ? who.map((x) => `<span class="pill ${x.submitted_at ? 'good' : 'warn'}">${esc(x.name)}: ${x.submitted_at ? `${String(x.submitted_at).slice(11, 16)} da yubordi` : 'hali yubormagan'}</span>`).join('') : `<span class="pill">Bu bo'limga hali hech kimga ruxsat berilmagan</span>`}${daily.approvals?.[part] ? `<span class="pill lime">PM tasdiqladi ✓</span>` : ''}</div>` : '';

  const leadsP = role === 'rop' ? daily.projects.filter((p) => p.kind !== 'auto') : daily.projects;
  const autoP = role === 'rop' ? daily.projects.filter((p) => p.kind === 'auto') : [];
  const back = !sentAt ? daily.mine?.returned : null;
  box.innerHTML = `${back ? `<div class="part-back"><b>↩ Proekt menejer qaytardi</b> <span class="muted small">${esc(String(back.at).slice(0, 16))}</span>
      <p>${back.note ? esc(back.note) : "Raqamlarni qayta tekshiring."}</p><span class="muted small">Tuzating va «Yuborish» ni bosing.</span></div>` : ''}${sentAt ? `<div class="part-sent"><span class="done-dot">${ICONS.check}</span><div><b>${String(sentAt).slice(11, 16)} da yuborildi</b>
      <span class="muted small">PM ga yetkazildi. Raqamni tuzatsangiz — saqlab, «Qayta yuborish» ni bosing.</span></div></div>` : ''}
    <section class="card step ${editable ? '' : 'ro-mode'}">
      <div class="step-head">${editable ? `<p>${R.hint}</p>` : ''}${whoLine}</div>
      ${s.key === 'target' ? rateBlock() : ''}
      ${leadsP.length ? `${autoP.length ? "<h3 class=\"tbl-title\">Sotuv bo'limi orqali</h3>" : ''}${entryCards(leadsP, role === 'rop' ? [...s.fields, ...SRC_FIELDS] : s.fields, { kind: role === 'rop' ? 'sales' : 'target', required: s.required })}` : ''}
      ${autoP.length ? `<h3 class="tbl-title">Avtovoronka</h3>${entryCards(autoP, s.autoFields, { kind: 'auto', required: s.autoRequired, fallback: 'Avtovoronka' })}` : ''}
      ${textsBlock(role === 'rop' ? leadsP : daily.projects)}
      ${role === 'rop' && leadsP.length ? reasonsBlock(leadsP) : ''}
      ${!editable ? ''
        : `<div class="step-foot"><span class="muted small">Kulrang raqam — oldingi kun</span><span class="spacer"></span>
        ${pm ? `<a class="btn ghost" href="#/kiritish">Tasdiqlash →</a>` : ''}
        <button class="btn ${pm ? 'primary' : ''}" data-save>Saqlash</button>
        ${own ? `<button class="btn primary" data-send>${ICONS.send} ${sentAt ? 'Qayta yuborish' : 'Yuborish'}</button>` : ''}</div>`}
    </section>`;
  box.append(historyBlock(date));
  if (!editable) {
    box.querySelectorAll('input, textarea').forEach((el) => { el.readOnly = true; el.tabIndex = -1; });
    readOnlyCards(box);
    box.querySelectorAll('details.extra').forEach((d) => { d.open = true; });
    return;
  }
  bind();
  state.leaveGuard = leaveOk;
  state.isDirty = isDirty;

  function rateBlock() {
    const r = daily.rate || {};
    return `<div class="rate-in ${r.value == null ? 'need' : ''}" title="Shu kun reklamasi so'mga shu kurs bilan o'tadi">
      <label for="dRate"><b>Dollar kursi</b></label>
      <input id="dRate" class="cell-in" inputmode="decimal" value="${r.value ?? ''}" placeholder="${fmtN(r.prev || 12650)}" aria-label="Dollar kursi, so'm"><span class="muted">so'm</span>
      ${r.value == null ? '<span class="need-tag">kiritilmagan</span>' : ''}
    </div>`;
  }

  function textsBlock(projects) {
    if (!projects.length) return '';
    return `<details class="extra" ${projects.some((p) => s.texts.some(([f]) => p.row[f])) ? 'open' : ''}><summary>${R.textsTitle} <span class="muted">(ixtiyoriy)</span></summary>
      <div class="table-wrap"><table class="grid-entry text-entry" style="--cols:1"><thead><tr><th>Loyiha</th>${s.texts.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${s.texts.map(([f, l, ph]) => `<td class="n" data-label="${l}"><input class="cell-in txt" name="${f}" maxlength="300" value="${esc(p.row[f] ?? '')}" placeholder="${esc(ph)}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </details>`;
  }

  function reasonsBlock(projects) {
    return reasonsHtml(projects);
  }

  function bind() {
    box.querySelectorAll('tbody').forEach((tb) => tb.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input')) return;
      e.preventDefault();
      const td = e.target.closest('td');
      const next = td.parentElement.nextElementSibling?.children[td.cellIndex]?.querySelector('input');
      (next || box.querySelector('[data-send]') || box.querySelector('[data-save]')).focus();
    }));
    // Kartalar: jonli hisob (1 lid narxi, konversiya), qismlari jamidan ko'p bo'lsa — belgi; Enter — keyingi katak
    bindCards(box, daily.projects, () => box.querySelector('[data-send]') || box.querySelector('[data-save]'));
    $('[data-save]', box).onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try { await save(true); } catch (err) { toast(err.message, true); }
      b.disabled = false;
    };
    if ($('[data-send]', box)) $('[data-send]', box).onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        await save(false);
        const r = await api('/api/part/submit', { method: 'POST', body: { date, part } });
        toast(r.resend ? 'Tuzatilgan hisobot PM ga yuborildi ✓' : 'Yuborildi ✓ PM ga yetkazildi');
        await refreshMe();
        renderPart({ part });
      } catch (err) { toast(err.message, true); b.disabled = false; }
    };
  }

  function isDirty() {
    return box.isConnected && $$('input', box).some((el) => el.value !== el.defaultValue);
  }
  async function leaveOk() {
    if (!isDirty()) return true;
    try { await save(true); return true; } catch (err) {
      if (window.confirm(`Kiritilganlar saqlanmadi: ${err.message}\n\nSaqlamasdan chiqilsinmi?`)) { state.leaveGuard = null; state.isDirty = null; return true; }
      return false;
    }
  }

  // O'zgargan kataklar saqlanadi; jami bo'sh qolsa — qismlari qo'shiladi
  async function save(loud) {
    const byProject = {};
    for (const el of box.querySelectorAll('[data-id] input[name]')) {
      const p = daily.projects.find((x) => String(x.id) === el.closest('[data-id]').dataset.id);
      if (inVal(el) !== String(p.row[el.name] ?? '')) (byProject[p.id] ||= {})[el.name] = inVal(el);
    }
    const sumInto = (p, total, parts) => {
      const card = box.querySelector(`[data-card][data-id="${p.id}"]`);
      if (!card || !$(`input[name="${total}"]`, card)) return;
      const val = (f) => { const el = card.querySelector(`input[name="${f}"]`); return el ? inVal(el) : ''; };
      const got = parts.map(val).filter(Boolean);
      if (!val(total) && got.length) (byProject[p.id] ||= {})[total] = String(got.reduce((a, x) => a + (parseNum(x) || 0), 0));
    };
    for (const p of daily.projects) {
      if (role === 'target') sumInto(p, 'target_leads', ['tl_web', 'tl_bot']);
      else if (p.kind !== 'auto') sumInto(p, 'leads', ['qualified', 'potential', 'unqualified']);
    }
    const reasonsBy = {};
    for (const el of box.querySelectorAll('[data-rid] input[data-reason]')) {
      const p = daily.projects.find((x) => String(x.id) === el.closest('[data-rid]').dataset.rid);
      if (inVal(el) !== String(p.reasons?.[el.dataset.kind]?.[el.dataset.reason] ?? '')) ((reasonsBy[p.id] ||= {})[el.dataset.kind] ||= {})[el.dataset.reason] = inVal(el);
    }
    let changed = 0;
    const rateEl = box.querySelector('#dRate');
    if (rateEl && inVal(rateEl) !== String(daily.rate?.value ?? '')) {
      const r = await api('/api/rate', { method: 'PUT', body: { date, usd_rate: inVal(rateEl) } });
      daily.rate = { ...daily.rate, value: r.usd_rate };
      changed += 1;
    }
    for (const id of new Set([...Object.keys(byProject), ...Object.keys(reasonsBy)])) {
      changed += (await api('/api/daily', { method: 'PUT', body: { project_id: Number(id), date, values: byProject[id] || {}, reasons: reasonsBy[id] } })).changed;
      const p = daily.projects.find((x) => String(x.id) === id);
      Object.assign(p.row, byProject[id] || {});
      for (const [kind, m] of Object.entries(reasonsBy[id] || {})) Object.assign((p.reasons[kind] ||= {}), m);
      if (reasonsBy[id]) changed += 1;
    }
    $$('input', box).forEach((el) => { el.defaultValue = el.value; });
    if (loud) toast(changed ? 'Saqlandi ✓' : "O'zgarish yo'q");
  }
}
