// Targetolog va ROP ning kunlik ishi: o'z qismini kiritadi va «Yuborish» bilan PM ga topshiradi.
// PM keyin tekshiradi, tahlil yozadi va direktorga umumiy hisobotni yuboradi
import {
  $, $$, esc, api, state, shell, fmtN, toast, ICONS, spinnerBlock, dayLabel, refreshMe, isStale, parseNum,
} from './core.js';
import { STEPS, LEAD_ST, dateNav, historyBlock, reportHash, reasonsHtml } from './pm.js';

const ROLE = {
  target: {
    step: STEPS[0],
    head: 'Target hisoboti',
    hint: "Reklama kabinetidan kechagi raqamlarni har bir loyiha bo'yicha yozing: xarajat, ko'rishlar, kliklar va lidlar. Lidlardan nechtasi saytdan (web), nechtasi Telegram botdan tushganini alohida yozing — «Lid» bo'sh qolsa, ikkalasi qo'shiladi. Bloger va Telegram kanallarga to'lov bo'lmagan kun bo'sh qoladi.",
    textsTitle: 'Kreativlar va muammolar',
  },
  rop: {
    step: STEPS[1],
    head: 'Sotuv hisoboti',
    hint: "Sotuv bo'limiga tushgan lidlar: nechta qo'ng'iroq qilindi, nechtasi sifatli, potensial, sifatsiz, hozir qaysi holatda; nechta sotuv bo'ldi va qancha pul tushdi. Pastda — nega sifatsiz va nega sotib olmagani (har sababdan nechta). «Umumiy lid» bo'sh qolsa — uch turi qo'shiladi.",
    textsTitle: 'Izoh',
  },
};
const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#4c86ff')}"></span>`;
// Lid holatlari — ROP sahifasida alohida jadvalda (asosiy jadval torayadi)
const STATUS = LEAD_ST;
const LABEL = { target_leads: 'Lid (jami)', tl_web: 'Lid: saytdan', tl_bot: 'Lid: botdan' };

export async function renderPart({ rolled = null } = {}) {
  state.leaveGuard = null;
  state.isDirty = null;
  const role = state.me.user.role;
  const R = ROLE[role];
  const s = R.step;
  const qd = new URLSearchParams(location.hash.split('?')[1] || '').get('date');
  let date = /^\d{4}-\d{2}-\d{2}$/.test(qd || '') && qd <= state.me.reportDay ? qd : state.me.reportDay;
  if (!qd && rolled && rolled < state.me.reportDay && state.partOpen?.date === rolled && !state.partOpen.sent) {
    date = rolled;
    history.replaceState(null, '', reportHash(rolled));
    state.shownHash = location.hash;
    toast(`Kun almashdi. ${dayLabel(rolled)} hisoboti hali yuborilmagan — shu yerda davom eting`);
  }
  const go = async (d) => {
    if (state.leaveGuard && !(await state.leaveGuard())) return;
    if (location.hash !== reportHash(d)) location.hash = reportHash(d); else renderPart();
  };
  const first = String(state.me.user.name || '').split(' ')[0];
  const isY = date === state.me.reportDay;
  shell(`<div class="page-head"><div><h1>${isY ? `Salom, <span class="grad">${esc(first)}</span>` : `<span class="grad">${dayLabel(date)}</span>`}</h1>
      <div class="sub">${isY ? `Kechagi (${dayLabel(date)}) ${R.head.toLowerCase()}` : R.head}</div></div>${dateNav(date, go)}</div>
    <div id="part">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  let daily;
  try { daily = await api(`/api/daily?date=${date}`); } catch (e) { const el = $('#part'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#part');
  if (!box || isStale(rid)) return;
  if (!daily.projects.length) {
    box.innerHTML = '<div class="card empty">Sizga hali loyiha biriktirilmagan — proekt menejerga ayting.</div>';
    return;
  }
  const sentAt = daily.mine?.submitted_at || null;
  state.partOpen = { date, sent: Boolean(sentAt) };

  const leadsP = role === 'rop' ? daily.projects.filter((p) => p.kind !== 'auto') : daily.projects;
  const autoP = role === 'rop' ? daily.projects.filter((p) => p.kind === 'auto') : [];
  const back = !sentAt ? daily.mine?.returned : null;
  box.innerHTML = `${back ? `<div class="part-back"><b>↩ Proekt menejer qaytardi</b> <span class="muted small">${esc(String(back.at).slice(0, 16))}</span>
      <p>${back.note ? esc(back.note) : "Raqamlarni qayta tekshiring."}</p><span class="muted small">Tuzating va «Yuborish» ni bosing.</span></div>` : ''}${sentAt ? `<div class="part-sent"><span class="done-dot">${ICONS.check}</span><div><b>${String(sentAt).slice(11, 16)} da yuborildi</b>
      <span class="muted small">PM ga yetkazildi. Raqamni tuzatsangiz — saqlab, «Qayta yuborish» ni bosing.</span></div></div>` : ''}
    <section class="card step">
      <div class="step-head"><span class="eyebrow">${esc(state.me.roles?.[role] || '')}</span><h2>${R.head}</h2><p>${R.hint}</p></div>
      ${s.key === 'target' ? rateBlock() : ''}
      ${leadsP.length ? `${autoP.length ? "<h3 class=\"tbl-title\">Sotuv bo'limi orqali</h3>" : ''}${numTable(leadsP, role === 'rop' ? s.fields.filter(([f]) => !STATUS.includes(f)) : s.fields, s.required)}` : ''}
      ${role === 'rop' && leadsP.length ? `<h3 class="tbl-title">Lidlar holati <span class="muted small">— sotuv bo'limi orqali, nechta</span></h3>${numTable(leadsP, STATUS.map((f) => s.fields.find(([x]) => x === f)), [], false)}` : ''}
      ${autoP.length ? `<h3 class="tbl-title">Avtovoronka <span class="muted small">— botdan va to'lov tizimidan</span></h3>${numTable(autoP, s.autoFields, s.autoRequired)}` : ''}
      ${role === 'rop' && leadsP.length ? sourcesBlock(leadsP) : ''}
      ${textsBlock(role === 'rop' ? leadsP : daily.projects)}
      ${role === 'rop' && leadsP.length ? reasonsBlock(leadsP) : ''}
      <div class="step-foot"><span class="muted small">Kulrang raqam — oldingi kunniki. Enter — keyingi qator.</span><span class="spacer"></span>
        <button class="btn" data-save>Saqlash</button>
        <button class="btn primary" data-send>${ICONS.send} ${sentAt ? 'Qayta yuborish' : 'Yuborish'}</button></div>
    </section>`;
  box.append(historyBlock(date));
  bind();
  state.leaveGuard = leaveOk;
  state.isDirty = isDirty;

  function rateBlock() {
    const r = daily.rate || {};
    return `<div class="rate-in ${r.value == null ? 'need' : ''}">
      <label for="dRate"><b>Dollar kursi</b><span class="muted small">${esc(dayLabel(date))} uchun, so'm</span></label>
      <input id="dRate" class="cell-in" inputmode="decimal" value="${r.value ?? ''}" placeholder="masalan, ${fmtN(r.prev || 12650)}" aria-label="Dollar kursi, so'm">
      <span class="muted small">${r.value == null ? '<b class="need-tag">Kiritilmagan</b> — kurssiz yuborilmaydi. ' : ''}Reklama hisobidan to'langan kurs; shu kun xarajati so'mga shu kurs bilan o'tadi.</span>
    </div>`;
  }

  function numTable(projects, fields, required, main = true) {
    return `<div class="table-wrap"><table class="grid-entry ${fields.length > 4 ? 'wide' : ''} ${fields.length > 7 ? 'xwide' : ''}" style="--cols:${fields.length % 3 ? 2 : 3}" ${main ? 'data-part' : ''}><thead><tr><th>Loyiha</th>${fields.map(([f, l]) => `<th class="n">${esc(LABEL[f] || l)}</th>`).join('')}<th></th></tr></thead>
      <tbody>${projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${fields.map(([f, l]) => `<td class="n" data-label="${esc(LABEL[f] || l)}"><input class="cell-in" inputmode="decimal" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${esc(LABEL[f] || l)}"></td>`).join('')}
        <td data-state>${required.length && required.every((f) => p.row[f] != null) ? '<span class="pill good">✓</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function sourcesBlock(projects) {
    const SRC = [['src_ig', 'Instagram direktdan'], ['src_tg', 'Telegram lichkadan']];
    return `<h3 class="tbl-title">Lichkadan kelgan lidlar <span class="muted small">— Instagram direkt va Telegram admin lichkasi, nechta (jami lid ichida)</span></h3>
      <div class="table-wrap"><table class="grid-entry grid-mini" style="--cols:2"><thead><tr><th>Loyiha</th>${SRC.map(([, l]) => `<th class="n">${l}</th>`).join('')}</tr></thead>
      <tbody>${projects.map((p) => `<tr data-id="${p.id}"><td>${dot(p.color)}${esc(p.name)}</td>
        ${SRC.map(([f, l]) => `<td class="n" data-label="${l}"><input class="cell-in" inputmode="numeric" name="${f}" value="${p.row[f] ?? ''}" placeholder="${p.prev?.[f] != null ? fmtN(p.prev[f]) : ''}" aria-label="${esc(p.name)} — ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
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
      (next || box.querySelector('[data-send]')).focus();
    }));
    // Jami va qismlari mos kelmasa — belgi (lid = web + bot; lid = sifatli + potensial + sifatsiz)
    box.addEventListener('input', (e) => {
      const row = e.target.closest('tr[data-id]');
      const tr = row && box.querySelector(`table[data-part] tr[data-id="${row.dataset.id}"]`);
      if (!tr) return;
      const v = (f) => { const el = box.querySelector(`tr[data-id="${tr.dataset.id}"] input[name="${f}"]`); return !el || el.value.trim() === '' ? null : parseNum(el.value); };
      const [total, parts] = role === 'target' ? [v('target_leads'), ['tl_web', 'tl_bot'].map(v)] : [v('leads'), ['qualified', 'potential', 'unqualified'].map(v)];
      const sum = parts.reduce((a, x) => a + (x || 0), 0);
      $('[data-state]', tr).innerHTML = total != null && parts.some((x) => x != null) && sum > total
        ? `<span class="pill warn" title="Qismlari jamidan ko'p: ${sum}">≠ ${sum}</span>` : '';
    });
    $('[data-save]', box).onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try { await save(true); } catch (err) { toast(err.message, true); }
      b.disabled = false;
    };
    $('[data-send]', box).onclick = async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        await save(false);
        const r = await api('/api/part/submit', { method: 'POST', body: { date } });
        toast(r.resend ? 'Tuzatilgan hisobot PM ga yuborildi ✓' : 'Yuborildi ✓ PM ga yetkazildi');
        await refreshMe();
        renderPart();
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
    for (const el of box.querySelectorAll('tr[data-id] input[name]')) {
      const p = daily.projects.find((x) => String(x.id) === el.closest('tr').dataset.id);
      if (el.value.trim() !== String(p.row[el.name] ?? '')) (byProject[p.id] ||= {})[el.name] = el.value.trim();
    }
    const sumInto = (p, total, parts) => {
      const tr = box.querySelector(`table[data-part] tr[data-id="${p.id}"]`);
      if (!tr || !$(`input[name="${total}"]`, tr)) return;
      const val = (f) => box.querySelector(`tr[data-id="${p.id}"] input[name="${f}"]`)?.value.trim() || '';
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
      if (el.value.trim() !== String(p.reasons?.[el.dataset.kind]?.[el.dataset.reason] ?? '')) ((reasonsBy[p.id] ||= {})[el.dataset.kind] ||= {})[el.dataset.reason] = el.value.trim();
    }
    let changed = 0;
    const rateEl = box.querySelector('#dRate');
    if (rateEl && rateEl.value.trim() !== String(daily.rate?.value ?? '')) {
      const r = await api('/api/rate', { method: 'PUT', body: { date, usd_rate: rateEl.value.trim() } });
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
