// Marketing va Moliya bo'limlari.
//   Marketing — marketing rahbari kiritadi: kontent, SMM, tadbir, offline reklama… qaysi loyihaga qancha ketdi va u nima berdi
//   Moliya — kompaniyaning foyda va zarari (tushumdan barcha xarajatlargacha); moliyachi operatsion xarajatlarni kiritadi
// Hamma ko'radi; kiritish, tuzatish va o'chirish — faqat PM ruxsat bergan xodim
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtSom, fmtP, toast, ICONS, spinnerBlock, isStale, monthLabel, shortDate,
  selectHtml, dateButton, openCalendar, prettyDate, inVal, parseNum, canEditSection, viewNote, openDrawer, oneOf, chipsHtml, dayLabel,
} from './core.js';

const dot = (c) => `<span class="dot" style="--dc:${esc(c || '#8b7cf6')}"></span>`;
const mln = (x) => (x == null ? '—' : Math.abs(x) >= 1e6 ? `${fmtN(x / 1e6, 1)} mln` : fmtN(x));

// Oy tanlash: 0 — joriy oy (bugungacha), 1 — o'tgan oy…
const view = { marketing: 0, finance: 0 };
function monthRange(offset) {
  let m = state.me.today.slice(0, 7);
  for (let i = 0; i < offset; i++) m = addDays(`${m}-01`, -1).slice(0, 7);
  const [y, mm] = m.split('-').map(Number);
  const last = `${m}-${String(new Date(Date.UTC(y, mm, 0)).getUTCDate()).padStart(2, '0')}`;
  return { month: m, from: `${m}-01`, to: last < state.me.today ? last : state.me.today };
}
const monthBar = (key, r) => `<span class="month-nav"><button type="button" class="btn small icon" data-mm="1" aria-label="Oldingi oy">‹</button><b>${esc(monthLabel(r.month))}</b><button type="button" class="btn small icon" data-mm="-1" aria-label="Keyingi oy" ${view[key] ? '' : 'disabled'}>›</button></span>`;

// Gorizontal ulush chizig'i (moddalar bo'yicha)
function bars(list, total, cls = '') {
  if (!list.length) return '<p class="muted small" style="margin:0">Hali xarajat kiritilmagan</p>';
  const max = Math.max(...list.map((x) => x.uzs));
  return `<div class="cat-bars ${cls}">${list.map((x) => `<div class="cat-bar"><span>${esc(x.label)}</span><i><i style="width:${Math.max(2, (x.uzs / max) * 100)}%"></i></i><b>${mln(x.uzs)}</b><em>${fmtP(total ? x.uzs / total : null, 0)}</em></div>`).join('')}</div>`;
}

// ---------- Kiritish paneli va ro'yxat (ikkala bo'lim uchun) ----------
// Qo'shish va tuzatish — o'ngdan chiqadigan panelda (sahifada joy egallamaydi)
function expenseDrawer(kind, cats, it, rerender) {
  const projects = state.projects.filter((p) => p.active || p.id === it?.project_id);
  const projOpts = [['', kind === 'marketing' ? 'Umumiy (hamma loyiha)' : 'Kompaniya umumiy'], ...projects.map((p) => [String(p.id), p.name])];
  const catList = Object.entries(cats).map(([k, l]) => [k, esc(l)]);
  let date = it?.date || state.me.today;
  let cur = it?.currency || 'uzs';
  let cat = it?.category || catList[0][0];
  openDrawer({
    title: it ? 'Xarajatni tuzatish' : kind === 'marketing' ? 'Marketing xarajati' : 'Operatsion xarajat',
    sub: it ? `${prettyDate(it.date)} · ${it.label}` : kind === 'marketing' ? 'Bloger va TG kanal — target hisobotida' : 'Ish haqi, ijara, soliq…',
    submit: it ? `${ICONS.check} Saqlash` : `${ICONS.plus} Qo'shish`,
    body: `<div class="field">Nimaga${chipsHtml(catList, cat, 'd-cats')}</div>
      <label class="field">Summa<span class="in-big"><input name="amount" inputmode="decimal" placeholder="0" value="${it ? esc(it.amount) : ''}"><em data-suf>${cur === 'usd' ? '$' : "so'm"}</em></span></label>
      ${chipsHtml([['uzs', "So'mda"], ['usd', 'Dollarda · shu kun kursi']], cur, 'd-cur')}
      <div class="field">Loyiha${selectHtml(projOpts, it?.project_id ?? '', 'name="project_id"', 'Loyiha')}</div>
      <div class="field">Sana${dateButton('expDate', date, 'Sana')}</div>
      <label class="field"><span class="f-l">Izoh <span class="hint">ixtiyoriy</span></span><input name="note" maxlength="300" value="${esc(it?.note || '')}" placeholder="${kind === 'marketing' ? 'Masalan: reels uchun video' : 'Masalan: noyabr oyligi'}"></label>`,
    onOpen(form) {
      oneOf($('.d-cats', form), (v) => { cat = v; });
      oneOf($('.d-cur', form), (v) => { cur = v; $('[data-suf]', form).textContent = v === 'usd' ? '$' : "so'm"; });
      const dateBtn = $('#expDate', form);
      dateBtn.onclick = () => openCalendar(dateBtn, {
        value: date, max: state.me.today,
        onPick: (d) => { date = d; dateBtn.querySelector('span').textContent = prettyDate(d); },
      });
    },
    async onSubmit(form) {
      const amount = parseNum(inVal($('input[name="amount"]', form)));
      if (!amount) { toast('Summani kiriting', true); $('input[name="amount"]', form).focus(); return false; }
      const pid = $('input[name="project_id"]', form).value;
      const body = { kind, date, amount, category: cat, currency: cur, project_id: pid ? Number(pid) : null, note: $('input[name="note"]', form).value };
      await api(it ? `/api/expenses/${it.id}` : '/api/expenses', { method: it ? 'PUT' : 'POST', body });
      toast(it ? 'Tuzatildi ✓' : "Qo'shildi ✓");
    },
    onSaved: rerender,
  });
}
const addBtn = () => `<button type="button" class="btn primary" data-add>${ICONS.plus} Xarajat qo'shish</button>`;

// Moddalar belgisi va rangi (lentada)
const CAT_IC = {
  content: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  smm: '<path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3-5 3 1.4-6.2L4 9l5.8-.7z"/>',
  events: '<path d="M4 20V5h11l-1.5 4L15 13H6"/>',
  offline: '<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M8 20h8M12 16v4"/>',
  tools: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  agency: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.5a3 3 0 0 1 0 6M21 20c0-2.6-1.5-4.5-3.8-5.2"/>',
  gifts: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M12 9v11M3 13h18M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 .2 6-1.5S14 5 12 9"/>',
  salary: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  bonus: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  rent: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  utilities: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  software: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M9 9l-2 2 2 2M15 9l2 2-2 2"/>',
  tax: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  teachers: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  refund: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  other: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
};
const CAT_TONE = { content: 'coral', smm: 'violet', events: 'amber', offline: 'sky', tools: 'teal', agency: 'rose', gifts: 'lime', salary: 'violet', bonus: 'amber', rent: 'sky', utilities: 'teal', software: 'coral', tax: 'rose', teachers: 'lime', refund: 'rose', other: 'grey' };
const catIcon = (k) => `<span class="feed-ic t-${CAT_TONE[k] || 'grey'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${CAT_IC[k] || CAT_IC.other}</svg></span>`;

// Yozuvlar — kunlar bo'yicha lenta: har kun sarlavhasida shu kunning jami
function listCard(items, editable, title) {
  const days = [];
  for (const e of [...items].sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : y.id - x.id))) {
    const last = days.at(-1);
    if (last && last[0] === e.date) last[1].push(e); else days.push([e.date, [e]]);
  }
  const total = items.reduce((a, e) => a + e.uzs, 0);
  const color = (id) => state.projects.find((p) => p.id === id)?.color;
  return `<div class="card feed-card"><div class="card-head"><h3>${title}</h3><span class="muted small">${items.length} ta yozuv · ${mln(total)} so'm</span></div>
    ${items.length ? `<div class="feed">${days.map(([d, list]) => `<div class="feed-day">
      <div class="feed-date"><b>${esc(dayLabel(d))}</b><span>${fmtSom(list.reduce((a, e) => a + e.uzs, 0))}</span><i></i></div>
      ${list.map((e) => `<div class="feed-it" data-eid="${e.id}">${catIcon(e.category)}
        <div class="feed-main"><b>${esc(e.label)}</b><span>${e.note ? esc(e.note) : '<span class="muted">izohsiz</span>'}</span></div>
        <span class="feed-proj">${e.project ? `${dot(color(e.project_id))}${esc(e.project)}` : '<span class="feed-gen">Umumiy</span>'}</span>
        <span class="feed-by" title="Kiritdi">${esc(e.by || '—')}</span>
        <span class="feed-sum"><b>${fmtSom(e.uzs)}</b>${e.currency === 'usd' ? `<small>${fmtUsd(e.amount)}</small>` : ''}</span>
        ${editable ? `<span class="feed-act"><button type="button" class="btn small ghost icon" data-edit title="Tuzatish" aria-label="Tuzatish">${ICONS.edit}</button><button type="button" class="btn small ghost icon" data-del title="O'chirish" aria-label="O'chirish">${ICONS.trash}</button></span>` : ''}
      </div>`).join('')}</div>`).join('')}</div>`
      : '<div class="empty">Bu oyda hali yozuv yo\'q</div>'}</div>`;
}

// Ro'yxat: tuzatish — panelda, o'chirish — ikki bosqichli tasdiq (brauzer oynasisiz)
function bindEntry(root, kind, cats, items, rerender) {
  $$('[data-add]').forEach((b) => { b.onclick = () => expenseDrawer(kind, cats, null, rerender); });
  // Kabinetdan «Qo'shish» bosilgan bo'lsa — panel darhol ochiladi
  if (/[?&]add=1/.test(location.hash) && $('[data-add]')) {
    history.replaceState(null, '', location.hash.replace(/[?&]add=1/, ''));
    expenseDrawer(kind, cats, null, rerender);
  }
  root.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-eid]');
    if (!row) return;
    const it = items.find((x) => String(x.id) === row.dataset.eid);
    if (e.target.closest('[data-edit]')) { expenseDrawer(kind, cats, it, rerender); return; }
    const del = e.target.closest('[data-del]');
    if (!del) return;
    if (!del.classList.contains('confirm')) {
      del.classList.add('confirm');
      del.innerHTML = "O'chirilsinmi?";
      setTimeout(() => { if (del.isConnected) { del.classList.remove('confirm'); del.innerHTML = ICONS.trash; } }, 3500);
      return;
    }
    try { await api(`/api/expenses/${it.id}`, { method: 'DELETE', body: {} }); toast("O'chirildi"); rerender(); } catch (err) { toast(err.message, true); }
  });
}

// ---------- Marketing ----------
export async function renderMarketing() {
  state.leaveGuard = null;
  state.isDirty = null;
  const r = monthRange(view.marketing);
  const editable = canEditSection('marketing');
  shell(`<div class="page-head"><div><h1>Marketing</h1><div class="sub">Qaysi loyihaga, nimaga qancha ketdi</div></div>
      <div class="filters">${monthBar('marketing', r)}${editable ? addBtn() : ''}</div></div>
    ${viewNote('marketing')}<div id="mk">${spinnerBlock()}</div>`);
  bindMonth('marketing', renderMarketing);
  const rid = state.renderId;
  const [c, ex] = await Promise.all([api(`/api/control?from=${r.from}&to=${r.to}`), api(`/api/expenses?from=${r.from}&to=${r.to}&kind=marketing`)]);
  const box = $('#mk');
  if (!box || isStale(rid)) return;
  const t = c.totals;
  const entered = ex.items.reduce((a, e) => a + e.uzs, 0);
  const enteredProj = ex.items.filter((e) => e.project_id).reduce((a, e) => a + e.uzs, 0);
  const cats = state.me.expenseCats?.marketing || ex.cats.marketing;
  const byCat = c.costs_by_category.filter((x) => x.kind === 'marketing');
  const proj = c.projects.filter((p) => p.marketing_uzs || p.revenue);
  box.innerHTML = `<div class="kpis">
      <div class="kpi"><div class="top"><span class="label">Marketing — kiritilgan</span></div><div class="value">${mln(entered)}<small>so'm</small></div><div class="sub">loyihalarga ${mln(enteredProj)} · umumiy ${mln(entered - enteredProj)}</div></div>
      <div class="kpi"><div class="top"><span class="label">Tushumga nisbatan</span></div><div class="value">${fmtP(t.revenue ? t.marketing_uzs / t.revenue : null, 1)}</div><div class="sub">${r.to < `${r.month}-28` ? `oyning ${Number(r.to.slice(8))} kunlik qismi: ${mln(t.marketing_uzs)}` : `tushum ${mln(t.revenue)} so'm`}</div></div>
      <div class="kpi"><div class="top"><span class="label">1 sotuvga marketing</span></div><div class="value">${mln(t.sales ? t.marketing_uzs / t.sales : null)}<small>so'm</small></div><div class="sub">${fmtN(t.sales)} ta sotuv</div></div>
      <div class="kpi"><div class="top"><span class="label">1 mijoz — reklama + marketing</span></div><div class="value">${mln(t.cac_full_uzs)}<small>so'm</small></div><div class="sub">faqat reklama: ${mln(t.cac_uzs)} so'm</div></div>
    </div>
    <div class="grid g2 mb">
      <div class="card"><div class="card-head"><h3>Moddalar bo'yicha</h3><span class="muted small">${esc(monthLabel(r.month))} — kiritilgani</span></div>${bars(byCat, byCat.reduce((a, x) => a + x.uzs, 0))}</div>
      <div class="card"><div class="card-head"><h3>Loyihalar bo'yicha</h3></div>
        <div class="table-wrap"><table class="econ-mini"><thead><tr><th>Loyiha</th><th class="n">Marketing</th><th class="n">Reklama</th><th class="n">Sotuv</th><th class="n">1 mijoz (jami)</th></tr></thead>
        <tbody>${proj.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td><td class="n">${mln(p.marketing_uzs)}</td><td class="n">${mln(p.spend_uzs)}</td><td class="n">${fmtN(p.sales)}</td><td class="n"><b>${mln(p.cac_full_uzs)}</b></td></tr>`).join('')}
        ${t.general_marketing_uzs ? `<tr class="muted"><td>Umumiy (loyihasiz)</td><td class="n">${mln(t.general_marketing_uzs)}</td><td colspan="3"></td></tr>` : ''}</tbody></table></div></div>
    </div>
    ${listCard(ex.items, editable, `Yozuvlar — ${esc(monthLabel(r.month))}`)}`;
  bindEntry(box, 'marketing', cats, ex.items, renderMarketing);
}

// ---------- Moliya ----------
export async function renderFinance() {
  state.leaveGuard = null;
  state.isDirty = null;
  const r = monthRange(view.finance);
  const editable = canEditSection('finance');
  shell(`<div class="page-head"><div><h1>Moliya</h1><div class="sub">Tushumdan sof foydagacha</div></div>
      <div class="filters">${monthBar('finance', r)}${editable ? addBtn() : ''}</div></div>
    ${viewNote('finance')}<div id="fin">${spinnerBlock()}</div>`);
  bindMonth('finance', renderFinance);
  const rid = state.renderId;
  const [c, ex] = await Promise.all([api(`/api/control?from=${r.from}&to=${r.to}`), api(`/api/expenses?from=${r.from}&to=${r.to}&kind=opex`)]);
  const box = $('#fin');
  if (!box || isStale(rid)) return;
  const t = c.totals;
  const estimated = c.projects.some((p) => p.fixed_estimated && !p.fixed_actual);
  const opexAll = t.fixed_cost + t.general_opex_uzs;
  const rows = [
    ['Tushum', t.revenue, 'in', `${fmtN(t.sales)} ta sotuv`],
    ['Reklama', -t.spend_uzs, 'ad', fmtUsd(t.spend, 0)],
    ['Marketing', -t.marketing_uzs, 'mk', ''],
    ['Tannarx', -t.var_cost, 'var', ''],
    ['Operatsion', -opexAll, 'opex', estimated ? '<span class="pill warn">taxmin</span>' : ''],
  ];
  const costs = [['ad', t.spend_uzs, 'Reklama'], ['mk', t.marketing_uzs, 'Marketing'], ['var', t.var_cost, 'Tannarx'], ['opex', opexAll, 'Operatsion']];
  const totalCost = costs.reduce((a, x) => a + x[1], 0);
  const cats = state.me.expenseCats?.opex || ex.cats.opex;
  const byCat = c.costs_by_category.filter((x) => x.kind === 'opex');
  box.innerHTML = `<div class="grid g-wide mb">
      <div class="card pl-card"><div class="card-head"><h3>Foyda va zarar</h3><span class="muted small">${esc(monthLabel(r.month))}${r.to < `${r.month}-28` ? ` · ${shortDate(r.to)} gacha` : ''}</span></div>
        <div class="pl">${rows.map(([l, v, k, sub]) => `<div class="pl-row pl-${k}"><span><i></i>${l}<small>${sub}</small></span><b>${v < 0 ? '−' : ''}${mln(Math.abs(v))} <em>so'm</em></b></div>`).join('')}
          <div class="pl-row pl-total ${t.net < 0 ? 'neg' : 'pos'}"><span>Sof foyda<small>marja ${fmtP(t.margin, 1)}</small></span><b>${t.net < 0 ? '−' : '+'}${mln(Math.abs(t.net))} <em>so'm</em></b></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Pul qayerga ketyapti</h3><span class="muted small">jami xarajat ${mln(totalCost)} so'm</span></div>
        <div class="cost-stack">${costs.map(([k, v, l]) => (v > 0 ? `<i class="cs-${k}" style="flex:${v}" title="${l}: ${fmtSom(v)}"></i>` : '')).join('')}</div>
        <div class="cost-legend">${costs.map(([k, v, l]) => `<span><i class="cs-${k}"></i>${l} <b>${fmtP(totalCost ? v / totalCost : null, 0)}</b></span>`).join('')}</div>
        <h4 class="mt">Operatsion xarajatlar — moddalar</h4>${bars(byCat, byCat.reduce((a, x) => a + x.uzs, 0), 'opex')}
      </div>
    </div>
    <div class="card mb"><div class="card-head"><h3>Loyihalar bo'yicha</h3></div>
      <div class="table-wrap"><table class="econ-mini"><thead><tr><th>Loyiha</th><th class="n">Tushum</th><th class="n">Reklama</th><th class="n">Marketing</th><th class="n">Tannarx</th><th class="n">Operatsion</th><th class="n">Sof foyda</th><th class="n">Marja</th></tr></thead>
      <tbody>${c.projects.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td><td class="n">${mln(p.revenue)}</td><td class="n">${mln(p.spend_uzs)}</td><td class="n">${mln(p.marketing_uzs)}</td><td class="n">${mln(p.var_cost)}</td>
        <td class="n">${mln(p.fixed_cost)}${p.fixed_estimated && !p.fixed_actual ? ' <span class="muted small" title="Fakt kiritilmagan — sozlamadagi taxmin">≈</span>' : ''}</td>
        <td class="n"><b class="${p.net_profit < 0 ? 'neg' : 'pos'}">${p.net_profit < 0 ? '−' : '+'}${mln(Math.abs(p.net_profit))}</b></td><td class="n">${fmtP(p.net_margin, 0)}</td></tr>`).join('')}
        ${t.general_opex_uzs || t.general_marketing_uzs ? `<tr class="muted"><td>Kompaniya umumiy</td><td></td><td></td><td class="n">${mln(t.general_marketing_uzs)}</td><td></td><td class="n">${mln(t.general_opex_uzs)}</td><td class="n"><b class="neg">−${mln(t.general_opex_uzs + t.general_marketing_uzs)}</b></td><td></td></tr>` : ''}</tbody></table></div>
      <p class="muted small" style="margin:10px 0 0" title="Marketing va operatsion xarajatlar oy kunlariga teng bo'linadi">${estimated ? '≈ — fakt kiritilmagan, taxmin olindi' : ''}</p>
    </div>
    ${listCard(ex.items, editable, `Operatsion xarajatlar — ${esc(monthLabel(r.month))}`)}`;
  bindEntry(box, 'opex', cats, ex.items, renderFinance);
}

function bindMonth(key, rerender) {
  $$('[data-mm]').forEach((b) => { b.onclick = () => { view[key] = Math.max(0, view[key] + Number(b.dataset.mm)); rerender(); }; });
}
