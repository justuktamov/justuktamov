// Sotuv xodimlari (operatorlar): ROP har kuni har xodimning natijasini kiritadi; oylik jadval — kim qanday ishlayapti
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtP, toast, spinnerBlock, isStale, monthLabel, shortDate, dayLabel, parseNum,
  canEditSection, isAdminUser, viewNote, openDrawer, ICONS,
} from './core.js';
import { dateNav } from './pm.js';

const FIELDS = [
  ['leads', 'Lidlar'], ['qualified', 'Sifatli'], ['sales', 'Sotuv'],
  ['cancelled', 'Bekor'], ['unqualified', 'Sifatsiz'], ['call_sec', "Qo'ng'iroq vaqti"],
];
// Hisobot jadvalidagi son ustunlari (call duration — alohida, oxirida)
const NUM = FIELDS.filter(([k]) => k !== 'call_sec');
const ALL_TABS = [['report', 'Hisobot'], ['entry', 'Kunlik kiritish'], ['list', "Xodimlar ro'yxati"]];
const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#4c86ff')}"></span>`;

// Soniya ↔ «2:15:30» (soat 24 dan oshishi mumkin)
export function fmtDuration(sec) {
  if (sec == null) return '';
  const t = Math.round(sec);
  return `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
const conv = (a, b) => (b > 0 ? a / b : null);

export async function renderSellers() {
  state.leaveGuard = null;
  state.isDirty = null;
  const edit = canEditSection('sellers');
  const f = (state.sellers ||= { tab: edit && !isAdminUser() ? 'entry' : 'report', period: 'month', month: 0, date: null });
  // Kiritish va ro'yxat — «Sotuv xodimlari» ruxsati borlar (ROP) va PM; qolganlar faqat hisobotni ko'radi
  const TABS = edit ? ALL_TABS : ALL_TABS.slice(0, 1);
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  if (TABS.some(([k]) => k === q.get('tab'))) f.tab = q.get('tab');
  if (!TABS.some(([k]) => k === f.tab)) f.tab = 'report';
  shell(`<div class="page-head"><div><h1><span class="grad">Sotuv xodimlari</span></h1>
      <div class="sub">Har sotuvchi: lid, sotuv, konversiya</div></div></div>
    ${viewNote('sellers')}<div class="tabs" id="slTabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-k="${k}" class="${f.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="sl">${spinnerBlock()}</div>`);
  $('#slTabs').onclick = async (e) => {
    const k = e.target.dataset.k;
    if (!k || k === f.tab) return;
    if (state.leaveGuard && !(await state.leaveGuard())) return;
    f.tab = k;
    history.replaceState(null, '', '#/sotuvchilar');
    renderSellers();
  };
  const rid = state.renderId;
  const box = $('#sl');
  try {
    if (f.tab === 'report') await tabReport(box, f, rid);
    else if (f.tab === 'entry') await tabEntry(box, f, rid);
    else await tabList(box, rid);
  } catch (e) { if (!isStale(rid)) box.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
}

// ---------- Hisobot: davr bo'yicha har loyihada har xodim ----------
async function tabReport(box, f, rid) {
  const yday = state.me.reportDay;
  const mFirst = (() => { const [y, m] = yday.split('-').map(Number); return new Date(Date.UTC(y, m - 1 - f.month, 1)).toISOString().slice(0, 10); })();
  const mLast = (() => { const d = new Date(`${mFirst}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1, 0); const x = d.toISOString().slice(0, 10); return x < yday ? x : yday; })();
  const range = { day: [yday, yday], week: [addDays(yday, -6), yday], month: [mFirst, mLast] }[f.period];
  const label = f.period === 'day' ? `${dayLabel(yday)} (kecha)` : f.period === 'week' ? `${shortDate(range[0])} – ${shortDate(range[1])}` : monthLabel(mFirst.slice(0, 7));
  const data = await api(`/api/sellers/stats?from=${range[0]}&to=${range[1]}`);
  if (isStale(rid)) return;
  const bar = `<div class="sl-bar"><div class="seg" id="slPer">${[['day', 'Kecha'], ['week', '7 kun'], ['month', 'Oy']].map(([k, l]) => `<button data-p="${k}" class="${f.period === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${f.period === 'month' ? `<span class="month-nav wk-nav"><button type="button" class="btn small icon" data-mm="1" aria-label="Oldingi oy">‹</button><b>${esc(monthLabel(mFirst.slice(0, 7)))}</b><button type="button" class="btn small icon" data-mm="-1" aria-label="Keyingi oy" ${f.month ? '' : 'disabled'}>›</button></span>` : `<b class="sl-when">${esc(label)}</b>`}</div>`;
  const table = (p) => {
    const best = Math.max(...p.rows.map((r) => r.conv ?? -1));
    const bestQ = Math.max(...p.rows.map((r) => r.conv_q ?? -1));
    const cells = (r, tot) => `${NUM.map(([k]) => `<td class="n">${fmtN(r[k])}</td>`).join('')}
      <td class="n ${!tot && r.conv === best && best > 0 ? 'sl-best' : ''}">${r.conv == null ? '—' : fmtP(r.conv, 1)}</td>
      <td class="n ${!tot && r.conv_q === bestQ && bestQ > 0 ? 'sl-best' : ''}">${r.conv_q == null ? '—' : fmtP(r.conv_q, 1)}</td>
      <td class="n mono">${fmtDuration(r.call_sec)}</td>`;
    return `<section class="card sl-card" style="--pc:${esc(p.color || '#4c86ff')}">
      <div class="sl-head"><b>${dot(p.color)}${esc(p.name)}</b><span class="muted small">${fmtN(p.total.leads)} lid · ${fmtN(p.total.sales)} sotuv · ${p.total.conv == null ? '—' : fmtP(p.total.conv, 1)}</span></div>
      <div class="table-wrap"><table class="sl-table"><thead><tr><th>Sotuvchi</th>${NUM.map(([, l]) => `<th class="n">${l}</th>`).join('')}<th class="n" title="Sotuv ÷ lidlar">Konversiya</th><th class="n" title="Sotuv ÷ sifatli lidlar">Sifatlidan</th><th class="n">Qo'ng'iroq vaqti</th></tr></thead>
      <tbody>${p.rows.map((r) => `<tr class="${r.active ? '' : 'off'}"><td><b>${esc(r.name)}</b>${r.active ? '' : ' <span class="muted small">(arxiv)</span>'}</td>${cells(r)}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Jami</td>${cells(p.total, true)}</tr></tfoot></table></div></section>`;
  };
  box.innerHTML = bar + (data.projects.length ? data.projects.map(table).join('')
    : `<div class="card empty">Bu davr uchun sotuv xodimlari raqamlari kiritilmagan. ${edit ? '«Kunlik kiritish» bo\'limida kiriting.' : ''}</div>`)
    + '<p class="muted small">Yashil — eng yuqori konversiya</p>';
  $('#slPer').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { f.period = b.dataset.p; renderSellers(); } };
  $$('[data-mm]', box).forEach((b) => { b.onclick = () => { f.month = Math.max(0, f.month + Number(b.dataset.mm)); renderSellers(); }; });
}

// ---------- Kunlik kiritish ----------
async function tabEntry(box, f, rid) {
  const date = f.date && f.date <= state.me.reportDay ? f.date : state.me.reportDay;
  const d = await api(`/api/sellers/daily?date=${date}`);
  if (isStale(rid)) return;
  const nav = dateNav(date, async (x) => { if (state.leaveGuard && !(await state.leaveGuard())) return; f.date = x; renderSellers(); });
  if (!d.sellers.length) {
    box.innerHTML = `<div class="sl-bar">${nav}</div><div class="card empty">Hali sotuv xodimi qo'shilmagan. <button type="button" class="link-btn" data-go-list>«Xodimlar ro'yxati»</button> bo'limida qo'shing (Barno, Zuxra…).</div>`;
    $('[data-go-list]', box).onclick = () => { f.tab = 'list'; renderSellers(); };
    return;
  }
  const rowOf = (sid, pid) => d.rows.find((r) => r.seller_id === sid && r.project_id === pid) || {};
  const val = (r, k) => (k === 'call_sec' ? fmtDuration(r[k]) : r[k] ?? '');
  const inProject = (s, pid) => !s.projects.length || s.projects.includes(pid) || d.rows.some((r) => r.seller_id === s.id && r.project_id === pid);
  box.innerHTML = `<div class="sl-bar">${nav}<span class="muted small">Qo'ng'iroq vaqti: 2:15:30 yoki daqiqa</span></div>
    ${d.projects.map((p) => {
      const sellers = d.sellers.filter((s) => inProject(s, p.id));
      const rop = d.rop[p.id];
      return `<section class="card sl-card" style="--pc:${esc(p.color || '#4c86ff')}" data-pid="${p.id}">
        <div class="sl-head"><b>${dot(p.color)}${esc(p.name)}</b>${rop && (rop.leads != null || rop.sales != null) ? `<span class="muted small">ROP hisobotida: ${[rop.leads != null ? `${fmtN(rop.leads)} lid` : '', rop.sales != null ? `${fmtN(rop.sales)} sotuv` : ''].filter(Boolean).join(', ')}</span>` : ''}</div>
        ${sellers.length ? `<div class="table-wrap"><table class="grid-entry sl-entry xwide"><thead><tr><th>Xodim</th>${FIELDS.map(([, l]) => `<th class="n">${l}</th>`).join('')}<th class="n">Konv.</th><th class="n">Konv. sifatli</th></tr></thead>
          <tbody>${sellers.map((s) => { const r = rowOf(s.id, p.id); return `<tr data-sid="${s.id}"><td><b>${esc(s.name)}</b></td>
            ${FIELDS.map(([k, l]) => `<td class="n" data-label="${l}"><input class="cell-in" ${k === 'call_sec' ? 'placeholder="0:00:00"' : 'inputmode="numeric"'} name="${k}" value="${esc(val(r, k))}" aria-label="${esc(s.name)} — ${esc(p.name)} — ${l}"></td>`).join('')}
            <td class="n calc" data-c="conv">${r.leads ? fmtP(conv(r.sales || 0, r.leads), 1) : '—'}</td><td class="n calc" data-c="conv_q">${r.qualified ? fmtP(conv(r.sales || 0, r.qualified), 1) : '—'}</td></tr>`; }).join('')}</tbody>
          <tfoot><tr data-total><td>Jami</td>${FIELDS.map(([k]) => `<td class="n" data-t="${k}"></td>`).join('')}<td></td><td></td></tr></tfoot></table></div>`
          : '<p class="muted small">Bu loyihaga xodim biriktirilmagan.</p>'}
      </section>`;
    }).join('')}
    <div class="step-foot"><span class="muted small"></span><span class="spacer"></span><button class="btn primary" data-save>Saqlash</button></div>`;

  const num = (el) => (el.value.trim() === '' ? null : parseNum(el.value));
  const dur = (s) => { const m = String(s).trim().match(/^(\d+)(?::([0-5]?\d))?(?::([0-5]?\d))?$/); if (!m) return 0; return m[3] != null ? m[1] * 3600 + m[2] * 60 + Number(m[3]) : m[2] != null ? m[1] * 60 + Number(m[2]) : m[1] * 60; };
  const totals = (card) => {
    for (const [k] of FIELDS) {
      const vals = $$(`tbody input[name="${k}"]`, card).map((el) => (k === 'call_sec' ? (el.value.trim() ? dur(el.value) : null) : num(el)));
      const sum = vals.reduce((a, x) => a + (x || 0), 0);
      const cell = $(`[data-t="${k}"]`, card);
      if (cell) cell.textContent = vals.some((x) => x != null) ? (k === 'call_sec' ? fmtDuration(sum) : fmtN(sum)) : '';
    }
  };
  $$('.sl-card', box).forEach(totals);
  box.addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr) return;
    const g = (k) => num($(`input[name="${k}"]`, tr)) || 0;
    $('[data-c="conv"]', tr).textContent = g('leads') ? fmtP(g('sales') / g('leads'), 1) : '—';
    $('[data-c="conv_q"]', tr).textContent = g('qualified') ? fmtP(g('sales') / g('qualified'), 1) : '—';
    totals(tr.closest('.sl-card'));
  });
  box.querySelectorAll('tbody').forEach((tb) => tb.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const td = e.target.closest('td');
    (td.parentElement.nextElementSibling?.children[td.cellIndex]?.querySelector('input') || $('[data-save]', box)).focus();
  }));
  const isDirty = () => box.isConnected && $$('input', box).some((el) => el.value !== el.defaultValue);
  const save = async () => {
    const rows = [];
    for (const tr of $$('tr[data-sid]', box)) {
      const values = {};
      for (const el of $$('input[name]', tr)) if (el.value !== el.defaultValue) values[el.name] = el.value.trim();
      if (Object.keys(values).length) rows.push({ seller_id: Number(tr.dataset.sid), project_id: Number(tr.closest('[data-pid]').dataset.pid), values });
    }
    if (!rows.length) return 0;
    const r = await api('/api/sellers/daily', { method: 'PUT', body: { date, rows } });
    $$('input', box).forEach((el) => { el.defaultValue = el.value; });
    return r.changed;
  };
  $('[data-save]', box).onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try { toast((await save()) ? 'Saqlandi ✓' : "O'zgarish yo'q"); } catch (err) { toast(err.message, true); }
    b.disabled = false;
  };
  state.isDirty = isDirty;
  state.leaveGuard = async () => {
    if (!isDirty()) return true;
    try { await save(); return true; } catch (err) {
      if (window.confirm(`Kiritilganlar saqlanmadi: ${err.message}\n\nSaqlamasdan chiqilsinmi?`)) { state.leaveGuard = null; state.isDirty = null; return true; }
      return false;
    }
  };
}

// ---------- Xodimlar ro'yxati: ixcham jadval; qo'shish va tuzatish — o'ng panelda ----------
async function tabList(box, rid) {
  const [list, projects] = await Promise.all([api('/api/sellers'), api('/api/projects')]);
  if (isStale(rid)) return;
  const sp = projects.filter((p) => p.active && p.kind !== 'auto');
  const name = (id) => projects.find((p) => p.id === id);
  box.innerHTML = `<div class="card"><div class="card-head"><h3>Sotuvchilar</h3><button type="button" class="btn primary" data-new>${ICONS.plus} Yangi sotuvchi</button></div>
    <p class="muted small" style="margin:0 0 12px">Sotuvchilar tizimga kirmaydi — raqamlarini ROP kiritadi.</p>
    ${list.length ? `<div class="table-wrap"><table class="click-list"><thead><tr><th>Ism</th><th>Loyihalari</th><th></th></tr></thead>
      <tbody>${list.map((s) => `<tr data-id="${s.id}" class="${s.active ? '' : 'off'}" tabindex="0"><td><b>${esc(s.name)}</b>${s.active ? '' : ' <span class="pill">Arxivda</span>'}</td>
        <td class="wrap">${(s.projects || []).length ? s.projects.map((id) => name(id)).filter(Boolean).map((p) => `<span class="sl-proj">${dot(p.color)}${esc(p.name)}</span>`).join('') : '<span class="muted small">Hamma sotuv loyihalari</span>'}</td>
        <td class="exp-act"><button type="button" class="btn small ghost" data-edit title="Tuzatish">${ICONS.edit}</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Hali sotuvchi yo\'q</div>'}</div>`;
  const drawer = (sl) => {
    const isNew = !sl;
    const sel = sl?.projects || [];
    openDrawer({
      title: isNew ? 'Yangi sotuvchi' : sl.name,
      sub: isNew ? '' : sl.active ? '' : 'Arxivda',
      submit: isNew ? `${ICONS.plus} Qo'shish` : `${ICONS.check} Saqlash`,
      actions: isNew ? '' : `<button type="button" class="btn ghost" data-toggle>${sl.active ? 'Arxivlash' : 'Qaytarish'}</button>`,
      body: `<label class="field">Ism<input data-f="name" value="${esc(sl?.name || '')}" maxlength="60" placeholder="Masalan: Barno"></label>
        <div class="field"><span class="f-l">Loyihalari <span class="hint">tanlanmasa — hamma sotuv loyihalari</span></span>
          <div class="chips">${sp.map((p) => `<button type="button" class="chip ${sel.includes(p.id) ? 'on' : ''}" data-pid="${p.id}" aria-pressed="${sel.includes(p.id)}">${dot(p.color)}${esc(p.name)}</button>`).join('')}</div></div>`,
      onOpen(form, close) {
        form.addEventListener('click', (e) => {
          const chip = e.target.closest('[data-pid]');
          if (chip) { chip.classList.toggle('on'); chip.setAttribute('aria-pressed', chip.classList.contains('on')); return; }
          if (e.target.closest('[data-toggle]')) {
            api(`/api/sellers/${sl.id}`, { method: 'PUT', body: { active: !sl.active } })
              .then(() => { toast(sl.active ? `${sl.name} arxivlandi` : `${sl.name} qaytarildi`); close(); renderSellers(); })
              .catch((err) => toast(err.message, true));
          }
        });
      },
      async onSubmit(form) {
        const body = { name: $('[data-f="name"]', form).value.trim(), projects: $$('[data-pid].on', form).map((x) => Number(x.dataset.pid)) };
        if (!body.name) { toast('Ismini yozing', true); return false; }
        await api(isNew ? '/api/sellers' : `/api/sellers/${sl.id}`, { method: isNew ? 'POST' : 'PUT', body });
        toast(isNew ? "Qo'shildi" : 'Saqlandi');
      },
      onSaved: () => renderSellers(),
    });
  };
  $('[data-new]', box).onclick = () => drawer(null);
  const open = (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) drawer(list.find((x) => String(x.id) === tr.dataset.id));
  };
  $('tbody', box)?.addEventListener('click', open);
  $('tbody', box)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e); });
}
