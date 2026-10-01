// Reklama postlari: har bir post/kampaniya — xarajat, klik, start (deep link orqali avtomatik), lid, sotuv
import {
  $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, kpi, fmtN, fmtUsd, fmtP, shortDate,
  toast, modal, ICONS, botLink, copyText, spinnerBlock, chartBase, cssVar,
} from './core.js';

const canEdit = () => ['admin', 'target'].includes(state.me.user.role);

function formHtml(c) {
  c ||= {};
  const { platforms } = state.me;
  const projects = state.projects.filter((p) => p.active);
  const v = (k) => (c[k] == null ? '' : esc(c[k]));
  return `<form id="campForm" class="stack">
    <div class="modal-head"><h2>${c.id ? 'Postni tahrirlash' : 'Yangi reklama posti'}</h2><button type="button" class="btn icon ghost" data-close aria-label="Yopish">${ICONS.x}</button></div>
    <div class="fields">
      <label class="field">Loyiha<select name="project_id" id="cProject" ${c.id ? 'disabled' : ''}>${projects.map((p) => `<option value="${p.id}" ${String(c.project_id ?? state.project) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="field">Sana<input type="date" name="date" id="cDate" value="${v('date') || state.me.today}" max="${state.me.today}" required></label>
      <label class="field">Platforma<select name="platform" id="cPlatform">${Object.entries(platforms).map(([k, l]) => `<option value="${k}" ${c.platform === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    </div>
    <label class="field">Post nomi<input name="name" id="cName" required maxlength="120" value="${v('name')}" placeholder="Masalan: @kanal posti, chegirma kreativi"></label>
    <div class="fields">
      <label class="field">Xarajat ($)<input name="spend" id="cSpend" inputmode="decimal" value="${v('spend')}" placeholder="30"></label>
      <label class="field">Kliklar<input name="clicks" id="cClicks" inputmode="numeric" value="${v('clicks')}" placeholder="1000"></label>
      <label class="field">Bot start<span class="hint">havola orqali avtomatik; bo'lmasa qo'lda</span><input name="starts" id="cStarts" inputmode="numeric" value="${v('starts')}"></label>
      <label class="field">Lidlar<input name="leads" id="cLeads" inputmode="numeric" value="${v('leads')}"></label>
      <label class="field">Sotuvlar<input name="sales" id="cSales" inputmode="numeric" value="${v('sales')}"></label>
    </div>
    <label class="field">Izoh<textarea name="note" id="cNote" rows="2">${v('note')}</textarea></label>
    <div class="row"><button class="btn primary">${c.id ? 'Saqlash' : "Qo'shish va havola olish"}</button><button type="button" class="btn ghost" data-close>Bekor qilish</button></div>
  </form>`;
}

function openForm(c, onSaved) {
  const m = modal(formHtml(c));
  $('#campForm', m.el).onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const saved = c?.id
        ? await api(`/api/campaigns/${c.id}`, { method: 'PUT', body })
        : await api('/api/campaigns', { method: 'POST', body });
      m.close();
      onSaved(saved, !c?.id);
    } catch (err) { toast(err.message, true); }
  };
}

function showLink(c) {
  const p = state.projects.find((x) => x.id === c.project_id);
  const link = botLink(p?.slug || 'loyiha', c.tag);
  const m = modal(`<div class="modal-head"><h2>Post qo'shildi</h2><button type="button" class="btn icon ghost" data-close aria-label="Yopish">${ICONS.x}</button></div>
    <p style="margin:0">Shu havolani postga qo'ying. Kim shu havola orqali botga /start bossa, <b>${esc(c.name)}</b> postiga yoziladi:</p>
    <div class="linkbox"><span class="code" style="max-width:none;font-size:14px;padding:8px 10px">${esc(link)}</span><button class="btn small" id="cpy">${ICONS.copy} Nusxa</button></div>
    ${state.me.telegram?.bot ? '' : '<p class="small muted" style="margin:0">Bot ulanmaganda havolada &lt;bot&gt; o\'rniga botingiz nomi yoziladi.</p>'}
    <div><button class="btn primary" data-close>Tayyor</button></div>`);
  $('#cpy', m.el).onclick = () => copyText(link);
}

export async function renderCampaigns() {
  shell(`<div class="page-head"><div><h1>Reklama postlari</h1><div class="sub">Har bir post uchun alohida havola — qaysi post qancha odam va sotuv olib kelganini ko'rasiz</div></div>
    <div class="row">${filtersHtml()}${canEdit() ? `<button class="btn primary" id="addCamp">${ICONS.plus} Post qo'shish</button>` : ''}</div></div>
    <div id="camps">${spinnerBlock()}</div>`);
  bindFilters(renderCampaigns);
  if ($('#addCamp')) $('#addCamp').onclick = () => openForm(null, (c) => { renderCampaigns(); showLink(c); });
  const { from, to } = computePeriod();
  const q = new URLSearchParams({ from, to, ...(state.project ? { project: state.project } : {}) });
  let data;
  try { data = await api(`/api/campaigns?${q}`); } catch (e) { const el = $('#camps'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#camps');
  if (!box) return;
  const t = data.total;
  box.innerHTML = `
    <div class="kpis">
      ${kpi({ label: 'Postlar', value: fmtN(t.count), sub: `${from} — ${to}` })}
      ${kpi({ label: 'Xarajat', value: fmtUsd(t.spend, 0), sub: `klik narxi ${fmtUsd(t.cpc, 3)}` })}
      ${kpi({ label: 'Bot start', value: fmtN(t.starts), sub: `1 start ${fmtUsd(t.cost_per_start, 3)}` })}
      ${kpi({ label: 'Lid / sotuv', value: `${fmtN(t.leads)} / ${fmtN(t.sales)}`, sub: `1 lid ${fmtUsd(t.cpl)} · 1 sotuv ${fmtUsd(t.cac)}` })}
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Sana</th><th>Post</th><th>Loyiha</th><th>Platforma</th><th>Havola</th>
      <th class="n">Xarajat</th><th class="n">Klik</th><th class="n">Start</th><th class="n">Organik</th><th class="n">1 start</th><th class="n">Lid</th><th class="n">1 lid</th><th class="n">Sotuv</th><th class="n">Start→sotuv</th>${canEdit() ? '<th></th>' : ''}</tr></thead>
      <tbody>${data.rows.map((c) => `<tr data-id="${c.id}">
        <td>${shortDate(c.date)}</td><td><b>${esc(c.name)}</b>${c.note ? `<div class="tiny muted" style="white-space:normal;max-width:260px">${esc(c.note)}</div>` : ''}</td>
        <td><span class="dot" style="background:${esc(c.project_color || 'var(--series-1)')}"></span>${esc(c.project_name)}</td>
        <td><span class="pill">${esc(c.platform_label)}</span></td>
        <td><button class="btn small ghost" data-a="copy" title="${esc(botLink(c.project_slug, c.tag))}">${ICONS.copy} ${esc(c.tag)}</button></td>
        <td class="n">${fmtUsd(c.spend, 0)}</td><td class="n">${fmtN(c.clicks)}</td>
        <td class="n">${fmtN(c.starts)}${c.auto.start ? '<span class="tag-auto">bot</span>' : ''}</td><td class="n">${fmtN(c.organic)}</td>
        <td class="n">${fmtUsd(c.cost_per_start, 3)}</td><td class="n">${fmtN(c.leads)}</td><td class="n">${fmtUsd(c.cpl)}</td><td class="n">${fmtN(c.sales)}</td><td class="n">${fmtP(c.start_to_sale)}</td>
        ${canEdit() ? `<td><button class="btn small ghost" data-a="edit" aria-label="Tahrirlash">${ICONS.edit}</button><button class="btn small ghost danger" data-a="del" aria-label="O'chirish">${ICONS.trash}</button></td>` : ''}
      </tr>`).join('') || `<tr><td colspan="15" class="empty">Bu davrda post yo'q.${canEdit() ? ' «Post qo\'shish» tugmasini bosing — har bir post uchun alohida bot havolasi beriladi.' : ''}</td></tr>`}</tbody>
    </table></div></div>
    ${data.byPlatform.length ? `<div class="grid g2 mt">
      <div class="card"><div class="card-head"><h2>1 start narxi platformalar bo'yicha</h2><span class="muted">past — yaxshi</span></div><div class="chart-box"><canvas id="chPlat" aria-label="Platformalar bo'yicha bitta start narxi"></canvas></div></div>
      <div class="card"><div class="card-head"><h2>Platformalar</h2></div><div class="table-wrap"><table><thead><tr><th>Platforma</th><th class="n">Post</th><th class="n">Xarajat</th><th class="n">Start</th><th class="n">1 start</th><th class="n">1 lid</th></tr></thead><tbody>
        ${data.byPlatform.map((p) => `<tr><td>${esc(p.label)}</td><td class="n">${p.count}</td><td class="n">${fmtUsd(p.spend, 0)}</td><td class="n">${fmtN(p.starts)}</td><td class="n">${fmtUsd(p.cost_per_start, 3)}</td><td class="n">${fmtUsd(p.cpl)}</td></tr>`).join('')}
      </tbody></table></div></div></div>` : ''}`;

  box.querySelector('tbody').onclick = async (e) => {
    const btn = e.target.closest('button[data-a]');
    if (!btn) return;
    const c = data.rows.find((x) => String(x.id) === btn.closest('tr').dataset.id);
    if (btn.dataset.a === 'copy') copyText(botLink(c.project_slug, c.tag));
    if (btn.dataset.a === 'edit') openForm(c, () => { toast('Saqlandi'); renderCampaigns(); });
    if (btn.dataset.a === 'del') {
      const m = modal(`<div class="modal-head"><h2>Postni o'chirish</h2></div><p style="margin:0">«${esc(c.name)}» o'chirilsinmi? Havola orqali kelgan startlar statistikada qoladi, lekin post qatori yo'qoladi.</p>
        <div class="row"><button class="btn primary" id="yes" style="background:var(--crit);border-color:var(--crit);color:#fff">O'chirish</button><button class="btn ghost" data-close>Bekor qilish</button></div>`);
      $('#yes', m.el).onclick = async () => {
        try { await api(`/api/campaigns/${c.id}`, { method: 'DELETE' }); m.close(); toast("O'chirildi"); renderCampaigns(); } catch (err) { toast(err.message, true); }
      };
    }
  };

  const el = $('#chPlat');
  if (el && window.Chart) {
    const base = chartBase();
    const ps = data.byPlatform.filter((p) => p.cost_per_start != null);
    state.charts.push(new Chart(el, {
      type: 'bar',
      data: { labels: ps.map((p) => p.label), datasets: [{ label: '1 start narxi', data: ps.map((p) => +p.cost_per_start.toFixed(4)), backgroundColor: cssVar('--series-1'), borderRadius: 4, maxBarThickness: 28 }] },
      options: { ...base, indexAxis: 'y', plugins: { ...base.plugins, legend: { display: false }, tooltip: { ...base.plugins.tooltip, callbacks: { label: (c) => ` $${c.raw}` } } },
        scales: { x: { beginAtZero: true, grid: { color: cssVar('--border') }, ticks: { callback: (v) => `$${v}` } }, y: { grid: { display: false } } } },
    }));
  }
}
