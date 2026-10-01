// Kunlik hisobot: har bir xodim faqat o'z rolidagi maydonlarni kiritadi
import { $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtP, toast, spinnerBlock, refreshMe } from './core.js';

let entryDate = null;

// Kiritish paytida jonli hisob: kartadagi qiymatlardan konversiyalar
function liveMetrics(form, row) {
  const v = (name) => {
    const el = form.querySelector(`[name="${name}"]`);
    const raw = el ? el.value : row[name];
    const x = Number(String(raw ?? '').replace(/\s/g, '').replace(',', '.'));
    return raw === '' || raw == null || !Number.isFinite(x) ? null : x;
  };
  const starts = row.auto_start > 0 ? row.auto_start : v('bot_starts');
  const spend = v('spend'), clicks = v('clicks'), leads = v('leads'), sales = v('sales'), revenue = v('revenue');
  const items = [];
  if (spend != null && clicks) items.push(['Klik narxi', fmtUsd(spend / clicks, 3)]);
  if (starts != null && clicks) items.push(['Organik', fmtN(Math.max(starts - clicks, 0))]);
  if (leads != null && starts) items.push(['Start → lid', fmtP(leads / starts)]);
  if (spend != null && leads) items.push(['Lid narxi', fmtUsd(spend / leads)]);
  if (sales != null && leads) items.push(['Lid → sotuv', fmtP(sales / leads)]);
  if (revenue != null && sales) items.push(["O'rtacha chek", fmtN(revenue / sales)]);
  return items.map(([l, x]) => `<span>${l}: <b>${x}</b></span>`).join('');
}

export async function renderEntry() {
  entryDate ||= state.me.today;
  const role = state.me.user.role;
  const isToday = entryDate === state.me.today;
  shell(`<div class="page-head"><div><h1><span class="grad">Kunlik</span> kiritish</h1><div class="sub">${isToday ? 'Bugungi' : `${entryDate} kungi`} raqamlar · faqat o'z maydonlaringizni ko'rasiz</div></div>
    <div class="filters"><button class="btn small" id="prevDay" aria-label="Oldingi kun">←</button><input type="date" id="eDate" value="${entryDate}" max="${state.me.today}" aria-label="Sana"><button class="btn small" id="nextDay" aria-label="Keyingi kun" ${isToday ? 'disabled' : ''}>→</button>
    ${isToday ? '' : '<button class="btn small" id="toToday">Bugun</button>'}</div></div>
    <div id="entry">${spinnerBlock()}</div>`);
  $('#eDate').onchange = (e) => { if (e.target.value) { entryDate = e.target.value; renderEntry(); } };
  $('#prevDay').onclick = () => { entryDate = addDays(entryDate, -1); renderEntry(); };
  $('#nextDay').onclick = () => { if (entryDate < state.me.today) { entryDate = addDays(entryDate, 1); renderEntry(); } };
  if ($('#toToday')) $('#toToday').onclick = () => { entryDate = state.me.today; renderEntry(); };

  const data = await api(`/api/daily?date=${entryDate}`);
  const { fields, noteFields, reasons, roles } = state.me;
  const myRoles = state.me.entryRoles || [];
  const mine = data.missing.filter((m) => myRoles.includes(m.role));
  const pending = mine.filter((m) => !m.filled);

  const fieldInput = (p, f) => {
    const def = fields[f];
    const auto = f === 'bot_starts' && p.row.auto_start > 0;
    const who = p.updatedBy[f];
    const prev = p.prev?.[f];
    return `<label class="field">${esc(def.label)}${auto ? ` <span class="tag-auto">bot: ${fmtN(p.row.auto_start)}</span>` : ''}
      <input inputmode="decimal" name="${f}" id="f-${p.id}-${f}" value="${p.row[f] ?? ''}" placeholder="${prev != null ? fmtN(prev) : '0'}" autocomplete="off">
      <span class="prevhint">${prev != null ? `kecha: ${fmtN(prev, f === 'spend' ? 2 : 0)}` : '&nbsp;'}${who ? ` · ${esc(who.name)} ${String(who.at).slice(11, 16)}` : ''}</span></label>`;
  };
  const roleBlock = (p, r) => {
    const fs = Object.keys(fields).filter((f) => fields[f].role === r);
    const note = Object.keys(noteFields).find((k) => noteFields[k] === r);
    const filled = data.missing.find((m) => m.project_id === p.id && m.role === r)?.filled;
    return `<div class="role-block"><div class="row"><span class="eyebrow">${esc(roles[r])}</span><span class="pill ${filled ? 'good' : 'warn'}">${filled ? 'kiritilgan' : 'kutilmoqda'}</span></div>
      <div class="fields">${fs.map((f) => fieldInput(p, f)).join('')}</div>
      <label class="field">Izoh${r === 'sales' || r === 'lead' ? ' — nega sotuv past yoki yuqori bo\'ldi?' : ''}<textarea name="${note}" id="f-${p.id}-${note}" rows="2" placeholder="Ixtiyoriy">${esc(p.row[note] ?? '')}</textarea></label></div>`;
  };
  const reasonsBlock = (p) => {
    if (!['admin', 'pm', 'lead', 'sales'].includes(role)) return '';
    const total = Object.values(p.reasons).reduce((a, b) => a + b, 0);
    const lost = p.row.leads != null && p.row.sales != null ? Math.max(p.row.leads - p.row.sales, 0) : null;
    return `<details ${total ? 'open' : ''}><summary>Sotib olmaslik sabablari · ${total} ta${lost != null ? ` <span class="muted small">(sotib olmagan lidlar: ${fmtN(lost)})</span>` : ''}</summary>
      <div class="fields" style="margin-top:10px">${Object.entries(reasons).map(([k, l]) => `<label class="field">${esc(l)}<input inputmode="numeric" data-reason="${k}" id="r-${p.id}-${k}" value="${p.reasons[k] ?? ''}" placeholder="0"></label>`).join('')}</div>
    </details>`;
  };

  const box = $('#entry');
  if (!box) return;
  box.innerHTML = `
    <div class="card" style="margin-bottom:14px"><div class="card-head"><h2>${pending.length ? `Kiritilmagan: ${pending.length}` : 'Hammasi kiritilgan ✓'}</h2><span class="muted">${entryDate}</span></div>
      <div class="checklist">${mine.map((m) => `<button type="button" class="pill ${m.filled ? 'good' : 'warn'}" data-scroll="p-${m.project_id}" style="border:0;cursor:pointer;font-family:inherit">${m.filled ? '✓' : '⏳'} ${esc(m.project)}${myRoles.length > 1 ? ` · ${esc(m.role_label)}` : ''}</button>`).join('') || '<span class="muted">Loyihalar yo\'q</span>'}</div></div>
    <div class="stack">${data.projects.map((p) => `
      <form class="card entry-card" data-id="${p.id}" id="p-${p.id}">
        <div class="head"><h2><span class="dot" style="background:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}</h2><a class="small" href="#/loyiha/${p.id}">Loyiha sahifasi →</a></div>
        ${myRoles.map((r) => roleBlock(p, r)).join('')}
        ${reasonsBlock(p)}
        <div class="row"><button class="btn primary">Saqlash</button><div class="live" data-live></div></div>
      </form>`).join('') || '<div class="card empty">Hali loyiha qo\'shilmagan. Rahbar «Sozlamalar» bo\'limida loyiha qo\'shadi.</div>'}</div>`;

  box.querySelector('.checklist').onclick = (e) => {
    const id = e.target.closest('[data-scroll]')?.dataset.scroll;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $$('form.entry-card', box).forEach((form) => {
    const p = data.projects.find((x) => String(x.id) === form.dataset.id);
    const live = form.querySelector('[data-live]');
    const update = () => { live.innerHTML = liveMetrics(form, p.row); };
    update();
    form.addEventListener('input', update);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const values = {};
      form.querySelectorAll('input[name], textarea[name]').forEach((el) => { values[el.name] = el.value; });
      const rs = {};
      form.querySelectorAll('input[data-reason]').forEach((el) => { rs[el.dataset.reason] = el.value; });
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        const r = await api('/api/daily', { method: 'PUT', body: { project_id: Number(form.dataset.id), date: entryDate, values, reasons: rs } });
        toast(r.changed ? `Saqlandi ✓ (${r.changed} ta o'zgarish)` : 'Saqlandi ✓');
        await refreshMe();
        renderEntry();
      } catch (err) { toast(err.message, true); btn.disabled = false; }
    };
  });
}
