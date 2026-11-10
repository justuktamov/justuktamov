// Marketing va Moliya bo'limlari.
//   Marketing — marketing rahbari kiritadi: kontent, SMM, tadbir, offline reklama… qaysi loyihaga qancha ketdi va u nima berdi
//   Moliya — kompaniyaning foyda va zarari (tushumdan barcha xarajatlargacha); moliyachi operatsion xarajatlarni kiritadi
// Hamma ko'radi; kiritish, tuzatish va o'chirish — faqat PM ruxsat bergan xodim
import {
  $, $$, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtSom, fmtP, toast, ICONS, spinnerBlock, isStale, monthLabel, shortDate,
  selectHtml, dateButton, openCalendar, prettyDate, inVal, parseNum, canEditSection, viewNote,
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

// ---------- Kiritish formasi va ro'yxat (ikkala bo'lim uchun) ----------
function entryForm(kind, cats) {
  const projects = state.projects.filter((p) => p.active);
  const projOpts = [['', kind === 'marketing' ? 'Umumiy (hamma loyiha)' : 'Kompaniya umumiy'], ...projects.map((p) => [String(p.id), p.name])];
  return `<form class="card exp-form" id="expForm" autocomplete="off">
      <div class="card-head"><h3 data-form-title>${kind === 'marketing' ? "Marketing xarajati qo'shish" : "Operatsion xarajat qo'shish"}</h3><span class="muted small">${kind === 'marketing' ? "Bloger va Telegram kanallarga reklama — targetolog hisobotida (bu yerda takrorlamang)" : "Shu oy uchun bir marta (masalan, oylik ish haqi) — oy kunlariga teng bo'linadi"}</span></div>
      <div class="exp-grid">
        <div class="field">Sana${dateButton('expDate', state.me.today, 'Sana')}</div>
        <div class="field">Loyiha${selectHtml(projOpts, '', 'name="project_id"', 'Loyiha')}</div>
        <div class="field">Modda${selectHtml(Object.entries(cats), Object.keys(cats)[0], 'name="category"', 'Modda')}</div>
        <label class="field">Summa<input name="amount" inputmode="decimal" placeholder="masalan, 2 500 000" required></label>
        <div class="field">Valyuta${selectHtml([['uzs', "so'm"], ['usd', '$ (shu kun kursi bilan)']], 'uzs', 'name="currency"', 'Valyuta')}</div>
        <label class="field exp-note">Izoh <span class="hint">nima uchun</span><input name="note" maxlength="300" placeholder="${kind === 'marketing' ? 'masalan, reels uchun video suratga olish' : 'masalan, noyabr oylik — 4 kishi'}"></label>
      </div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-cancel hidden>Bekor qilish</button><button class="btn primary" data-submit>${ICONS.plus} Qo'shish</button></div>
    </form>`;
}

function listCard(items, editable, title) {
  return `<div class="card"><div class="card-head"><h3>${title}</h3><span class="muted small">${items.length} ta yozuv</span></div>
    ${items.length ? `<div class="table-wrap"><table class="exp-table"><thead><tr><th>Sana</th><th>Loyiha</th><th>Modda</th><th class="n">Summa</th><th>Izoh</th><th>Kiritdi</th>${editable ? '<th></th>' : ''}</tr></thead>
      <tbody>${items.map((e) => `<tr data-eid="${e.id}"><td>${shortDate(e.date)}</td><td>${e.project ? esc(e.project) : '<span class="muted">Umumiy</span>'}</td><td>${esc(e.label)}</td>
        <td class="n"><b>${fmtSom(e.uzs)}</b>${e.currency === 'usd' ? `<br><span class="muted small">${fmtUsd(e.amount)}</span>` : ''}</td>
        <td class="wrap">${esc(e.note || '')}</td><td class="muted small">${esc(e.by || '—')}</td>
        ${editable ? `<td class="exp-act"><button type="button" class="btn small ghost" data-edit title="Tuzatish">${ICONS.edit}</button><button type="button" class="btn small ghost" data-del title="O'chirish">${ICONS.trash}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Bu oyda hali yozuv yo\'q</div>'}</div>`;
}

// Forma va ro'yxatni ishga tushiradi: qo'shish, tuzatish, o'chirish (ikki bosqichli tasdiq — brauzer oynasisiz)
function bindEntry(root, kind, items, rerender) {
  const form = $('#expForm', root);
  if (!form) return;
  let editId = null;
  let date = state.me.today;
  const dateBtn = $('#expDate', form);
  const setDate = (d) => { date = d; dateBtn.querySelector('span').textContent = prettyDate(d); };
  dateBtn.onclick = () => openCalendar(dateBtn, { value: date, max: state.me.today, onPick: setDate });
  const setSel = (name, value) => {
    const input = $(`input[name="${name}"]`, form);
    const wrap = input.closest('.sel');
    const opts = JSON.parse(wrap.dataset.options);
    input.value = value;
    wrap.querySelector('.sel-btn span').textContent = (opts.find(([v]) => String(v) === String(value)) || opts[0])[1];
  };
  const reset = () => {
    editId = null;
    form.reset();
    setDate(state.me.today);
    setSel('project_id', '');
    setSel('category', JSON.parse($('input[name="category"]', form).closest('.sel').dataset.options)[0][0]);
    setSel('currency', 'uzs');
    $('[data-cancel]', form).hidden = true;
    $('[data-submit]', form).innerHTML = `${ICONS.plus} Qo'shish`;
    $('[data-form-title]', form).textContent = kind === 'marketing' ? "Marketing xarajati qo'shish" : "Operatsion xarajat qo'shish";
  };
  $('[data-cancel]', form).onclick = reset;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('[data-submit]', form);
    const amount = parseNum(inVal($('input[name="amount"]', form)));
    if (!amount) { toast('Summani kiriting', true); return; }
    const body = {
      kind, date, amount, category: $('input[name="category"]', form).value, currency: $('input[name="currency"]', form).value,
      project_id: $('input[name="project_id"]', form).value ? Number($('input[name="project_id"]', form).value) : null,
      note: $('input[name="note"]', form).value,
    };
    btn.disabled = true;
    try {
      await api(editId ? `/api/expenses/${editId}` : '/api/expenses', { method: editId ? 'PUT' : 'POST', body });
      toast(editId ? 'Tuzatildi ✓' : "Qo'shildi ✓");
      rerender();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  root.addEventListener('click', async (e) => {
    const row = e.target.closest('tr[data-eid]');
    if (!row) return;
    const it = items.find((x) => String(x.id) === row.dataset.eid);
    if (e.target.closest('[data-edit]')) {
      editId = it.id;
      setDate(it.date);
      setSel('project_id', it.project_id ?? '');
      setSel('category', it.category);
      setSel('currency', it.currency);
      $('input[name="amount"]', form).value = String(it.amount);
      $('input[name="amount"]', form).dispatchEvent(new Event('input', { bubbles: true }));
      $('input[name="note"]', form).value = it.note || '';
      $('[data-cancel]', form).hidden = false;
      $('[data-submit]', form).innerHTML = `${ICONS.check} Saqlash`;
      $('[data-form-title]', form).textContent = `Tuzatish: ${shortDate(it.date)} — ${it.label}`;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
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
  shell(`<div class="page-head"><div><h1>Marketing</h1><div class="sub">Marketing xarajatlari: qaysi loyihaga, nimaga qancha ketdi — va u qancha sotuv berdi</div></div>
      <div class="filters">${monthBar('marketing', r)}</div></div>
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
      <div class="card"><div class="card-head"><h3>Loyihalar bo'yicha</h3><span class="muted small">marketing nima berdi</span></div>
        <div class="table-wrap"><table class="econ-mini"><thead><tr><th>Loyiha</th><th class="n">Marketing</th><th class="n">Reklama</th><th class="n">Sotuv</th><th class="n">1 mijoz (jami)</th></tr></thead>
        <tbody>${proj.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td><td class="n">${mln(p.marketing_uzs)}</td><td class="n">${mln(p.spend_uzs)}</td><td class="n">${fmtN(p.sales)}</td><td class="n"><b>${mln(p.cac_full_uzs)}</b></td></tr>`).join('')}
        ${t.general_marketing_uzs ? `<tr class="muted"><td>Umumiy (loyihasiz)</td><td class="n">${mln(t.general_marketing_uzs)}</td><td colspan="3" class="small">loyihaga belgilansa, aniqroq hisoblanadi</td></tr>` : ''}</tbody></table></div></div>
    </div>
    ${editable ? entryForm('marketing', cats) : ''}
    ${listCard(ex.items, editable, `Yozuvlar — ${esc(monthLabel(r.month))}`)}`;
  bindEntry(box, 'marketing', ex.items, renderMarketing);
}

// ---------- Moliya ----------
export async function renderFinance() {
  state.leaveGuard = null;
  state.isDirty = null;
  const r = monthRange(view.finance);
  const editable = canEditSection('finance');
  shell(`<div class="page-head"><div><h1>Moliya</h1><div class="sub">Kompaniyaning foyda va zarari: tushumdan barcha xarajatlargacha — loyihalar bo'yicha</div></div>
      <div class="filters">${monthBar('finance', r)}</div></div>
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
    ['Target reklama', -t.spend_uzs, 'ad', `${fmtUsd(t.spend, 0)} — Ads, bloger, kanallar`],
    ['Marketing', -t.marketing_uzs, 'mk', 'kontent, SMM, tadbir…'],
    ['Tannarx', -t.var_cost, 'var', "tushumdan % (sozlamada)"],
    ['Operatsion xarajatlar', -opexAll, 'opex', estimated ? '<span class="pill warn">qisman taxmin</span>' : '<span class="pill good">fakt</span>'],
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
    <div class="card mb"><div class="card-head"><h3>Loyihalar bo'yicha</h3><span class="muted small">har loyiha o'z xarajatini qoplayaptimi</span></div>
      <div class="table-wrap"><table class="econ-mini"><thead><tr><th>Loyiha</th><th class="n">Tushum</th><th class="n">Reklama</th><th class="n">Marketing</th><th class="n">Tannarx</th><th class="n">Operatsion</th><th class="n">Sof foyda</th><th class="n">Marja</th></tr></thead>
      <tbody>${c.projects.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td><td class="n">${mln(p.revenue)}</td><td class="n">${mln(p.spend_uzs)}</td><td class="n">${mln(p.marketing_uzs)}</td><td class="n">${mln(p.var_cost)}</td>
        <td class="n">${mln(p.fixed_cost)}${p.fixed_estimated && !p.fixed_actual ? ' <span class="muted small" title="Fakt kiritilmagan — sozlamadagi taxmin">≈</span>' : ''}</td>
        <td class="n"><b class="${p.net_profit < 0 ? 'neg' : 'pos'}">${p.net_profit < 0 ? '−' : '+'}${mln(Math.abs(p.net_profit))}</b></td><td class="n">${fmtP(p.net_margin, 0)}</td></tr>`).join('')}
        ${t.general_opex_uzs || t.general_marketing_uzs ? `<tr class="muted"><td>Kompaniya umumiy</td><td></td><td></td><td class="n">${mln(t.general_marketing_uzs)}</td><td></td><td class="n">${mln(t.general_opex_uzs)}</td><td class="n"><b class="neg">−${mln(t.general_opex_uzs + t.general_marketing_uzs)}</b></td><td></td></tr>` : ''}</tbody></table></div>
      <p class="muted small" style="margin:10px 0 0">Marketing va operatsion xarajatlar oy kunlariga teng bo'linadi: oy o'rtasida — o'tgan kunlar ulushi, oy oxirida — hammasi.${estimated ? " ≈ — shu oy uchun operatsion xarajat fakti kiritilmagan, Sozlamalardagi «doimiy xarajat, oyiga» olindi; moliyachi kiritsa — aniq hisoblanadi." : ''}</p>
    </div>
    ${editable ? entryForm('opex', cats) : ''}
    ${listCard(ex.items, editable, `Operatsion xarajatlar — ${esc(monthLabel(r.month))}`)}`;
  bindEntry(box, 'opex', ex.items, renderFinance);
}

function bindMonth(key, rerender) {
  $$('[data-mm]').forEach((b) => { b.onclick = () => { view[key] = Math.max(0, view[key] + Number(b.dataset.mm)); rerender(); }; });
}
