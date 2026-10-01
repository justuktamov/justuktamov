// Sof foyda: tushum − reklama − loyiha xarajatlari − umumiy xarajatdan ulush
import { $, esc, api, state, shell, toast, ICONS, spinnerBlock, fmtUzs, fmtP, fmtN, monthLabel, kpi, isStale } from './core.js';

let month = null;

export async function renderProfit() {
  month ||= state.me.today.slice(0, 7);
  shell(`<div class="page-head"><h1><span class="grad">Foyda</span></h1>
    <div class="filters"><input type="month" id="pMonth" value="${month}" aria-label="Oy"></div></div>
    <div id="pnl">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  $('#pMonth').onchange = (e) => { if (e.target.value) { month = e.target.value; renderProfit(); } };
  let d;
  try { d = await api(`/api/pnl?month=${month}`); } catch (e) { const el = $('#pnl'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#pnl');
  if (!box || isStale(rid)) return;
  const t = d.total;
  const cats = state.me.expenseCategories;
  const projects = state.projects.filter((p) => p.active);
  const cls = (x) => (x == null ? '' : x >= 0 ? 'good' : 'crit');
  box.innerHTML = `
    <div class="kpis">
      ${kpi({ label: 'Tushum', value: fmtUzs(t.revenue), unit: "so'm" })}
      ${kpi({ label: 'Reklama', value: fmtUzs(t.ads), unit: "so'm", sub: t.revenue ? `${fmtP(t.ads / t.revenue, 0)} tushumdan` : '' })}
      ${kpi({ label: 'Boshqa xarajat', value: fmtUzs(t.expenses + t.common), unit: "so'm" })}
      ${kpi({ label: 'Sof foyda', value: fmtUzs(t.profit), unit: "so'm", sub: `marja ${fmtP(t.margin, 0)}` })}
    </div>
    <div class="grid g-wide">
      <div class="card"><div class="card-head"><h2>Loyihalar · ${monthLabel(month)}</h2></div>
        <div class="table-wrap"><table><thead><tr><th>Loyiha</th><th class="n">Tushum</th><th class="n">Reklama</th><th class="n" title="Loyiha xarajati + umumiy xarajatdan ulush">Xarajat</th><th class="n">Sof foyda</th><th class="n">Marja</th></tr></thead>
        <tbody>${d.rows.map((r) => `<tr class="click" data-href="#/loyiha/${r.id}"><td><span class="dot" style="background:${esc(r.color || '#4c86ff')};color:${esc(r.color || '#4c86ff')}"></span>${esc(r.name)}</td>
          <td class="n">${fmtUzs(r.revenue)}</td><td class="n">${fmtUzs(r.ads)}</td><td class="n" title="o'zi ${fmtUzs(r.expenses)} + umumiy ${fmtUzs(r.common)}">${fmtUzs(r.expenses + r.common)}</td>
          <td class="n"><b>${fmtUzs(r.profit)}</b></td><td class="n"><span class="pill ${cls(r.margin)}">${fmtP(r.margin, 0)}</span></td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Jami</td><td class="n">${fmtUzs(t.revenue)}</td><td class="n">${fmtUzs(t.ads)}</td><td class="n">${fmtUzs(t.expenses + t.common)}</td><td class="n">${fmtUzs(t.profit)}</td><td class="n">${fmtP(t.margin, 0)}</td></tr></tfoot></table></div>
        <p class="tiny muted" style="margin:10px 0 0">$1 = ${fmtN(d.rate)} so'm${d.factor < 1 ? ` · oy davom etyapti: xarajatning ${fmtP(d.factor, 0)} qismi hisoblandi (${d.through} gacha)` : ''}</p></div>
      <div class="stack">
        <form class="card stack" id="expForm"><h2>Xarajat qo'shish</h2>
          <div class="fields">
            <select name="category" id="eCat" aria-label="Turkum">${Object.entries(cats).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
            <select name="project_id" id="eProj" aria-label="Loyiha"><option value="">Umumiy</option>${projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
          </div>
          <div class="row" style="flex-wrap:nowrap"><input name="amount" id="eAmount" inputmode="numeric" required placeholder="Summa, so'm" aria-label="Summa"><input name="note" id="eNote" placeholder="Izoh" aria-label="Izoh"></div>
          <div><button class="btn primary small">${ICONS.plus} Qo'shish</button></div></form>
        <div class="card"><div class="card-head"><h2>Xarajatlar</h2><span class="muted">${d.expenses.length}</span></div>
          ${d.expenses.length ? `<div class="clist">${d.expenses.map((e) => `<div class="citem" data-id="${e.id}" style="grid-template-columns:minmax(0,1fr) auto auto">
            <span class="cname"><b>${esc(e.category_label)}</b><small>${esc(e.project_name || 'Umumiy')}${e.note ? ` · ${esc(e.note)}` : ''}</small></span>
            <b class="num">${fmtUzs(e.amount)}</b><button class="btn small ghost icon danger" data-del="${e.id}" aria-label="O'chirish">${ICONS.trash}</button></div>`).join('')}</div>` : '<div class="muted small">Bu oyda xarajat kiritilmagan</div>'}</div>
      </div>
    </div>`;
  box.querySelector('tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href; });
  $('#expForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/expenses', { method: 'POST', body: { ...Object.fromEntries(new FormData(e.target)), month } }); toast("Qo'shildi"); renderProfit(); } catch (err) { toast(err.message, true); }
  };
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    try { await api(`/api/expenses/${b.dataset.del}`, { method: 'DELETE' }); toast("O'chirildi"); renderProfit(); } catch (err) { toast(err.message, true); }
  });
}
