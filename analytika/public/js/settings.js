// Sozlamalar: loyihalar, oylik reja, Telegram (hisobot qayerga boradi), profil
import {
  $, $$, esc, api, state, shell, toast, ICONS, monthLabel, refreshMe, spinnerBlock, selectHtml, colorHtml, TIMES,
} from './core.js';

let settingsTab = 'projects';
let planMonth = null;
const TABS = [['projects', 'Loyihalar'], ['plans', 'Oylik reja'], ['telegram', 'Telegram'], ['profil', 'Profil']];

export async function renderSettings() {
  const qTab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab');
  if (qTab && TABS.some(([k]) => k === qTab)) settingsTab = qTab;
  shell(`<div class="page-head"><h1><span class="grad">Sozlamalar</span></h1></div>
    <div class="tabs" id="sTabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-k="${k}" class="${settingsTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="sBody">${spinnerBlock()}</div>`);
  $('#sTabs').onclick = (e) => {
    const k = e.target.dataset.k;
    if (k) { settingsTab = k; history.replaceState(null, '', '#/sozlamalar'); renderSettings(); }
  };
  const body = $('#sBody');
  try {
    await ({ projects: tabProjects, plans: tabPlans, telegram: tabTelegram, profil: tabProfile })[settingsTab](body);
  } catch (e) { body.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function reloadProjects() { state.projects = await api('/api/projects'); }

// ---------- Loyihalar ----------
const timeOpts = (cur) => [...new Set([...TIMES, cur])].sort().map((t) => [t, t]);
const kindSelect = (v, attrs = '') => selectHtml(Object.entries(state.me.kinds), v, attrs, 'Loyiha turi');

async function tabProjects(body) {
  await reloadProjects();
  body.innerHTML = `<div class="card">
    <div class="card-head"><h2>Loyihalar</h2></div>
    <p class="small muted" style="margin:0 0 12px;max-width:80ch"><b>Tannarx</b> — tushumdan foizda ketadigan xarajat (Stars/Premium xaridi, ROP bonusi, to'lov komissiyasi).
      <b>Doimiy xarajat</b> — oyiga so'mda (ish haqi, ijara, mentorlar). Shu ikkisidan <b>sof foyda</b> hisoblanadi.
      <b>Avtovoronka</b> — odam botga kirib o'zi sotib oladi: lid kuzatilmaydi, faqat klik, bot start va xarid.</p>
    <div class="table-wrap"><table><thead><tr><th>Loyiha</th><th>Rang</th><th>Turi</th><th>Tannarx, %</th><th>Doimiy xarajat, so'm/oy</th><th>Holat</th><th></th></tr></thead><tbody>
    ${state.projects.map((p) => `<tr data-id="${p.id}">
      <td><input data-f="name" value="${esc(p.name)}" style="min-width:130px" aria-label="Nomi"></td>
      <td>${colorHtml(p.color || '#2a78d6', 'data-f="color"')}</td>
      <td>${kindSelect(p.kind, 'data-f="kind" aria-label="Turi"')}</td>
      <td><input data-f="var_cost_pct" inputmode="decimal" value="${p.var_cost_pct ?? ''}" placeholder="0" style="width:80px" aria-label="Tannarx foizi"></td>
      <td><input data-f="fixed_monthly" inputmode="decimal" value="${p.fixed_monthly ?? ''}" placeholder="0" style="width:140px" aria-label="Doimiy xarajat"></td>
      <td>${p.active ? '<span class="pill good">Faol</span>' : '<span class="pill">Arxivda</span>'}</td>
      <td class="row" style="flex-wrap:nowrap"><button class="btn small" data-a="save">Saqlash</button><button class="btn small ghost" data-a="toggle">${p.active ? 'Arxivlash' : 'Tiklash'}</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Loyiha yo\'q</td></tr>'}
    </tbody></table></div>
    <p class="small muted" style="margin:10px 0 0">Arxivdagi loyiha kunlik hisobotda chiqmaydi, eski raqamlari saqlanadi.</p></div>
    <form class="card stack mt" id="newProject"><h2>Yangi loyiha</h2>
      <div class="fields">
        <label class="field">Nomi<input name="name" id="npName" required placeholder="Masalan: VIZART"></label>
        <div class="field">Turi${kindSelect('leads', 'name="kind" id="npKind"')}</div>
        <label class="field">Tannarx, %<input name="var_cost_pct" inputmode="decimal" placeholder="0"></label>
        <label class="field">Doimiy xarajat, so'm/oy<input name="fixed_monthly" inputmode="decimal" placeholder="0"></label>
        <div class="field">Rang${colorHtml('#7048e8', 'name="color" id="npColor"')}</div>
      </div><div><button class="btn primary">${ICONS.plus} Qo'shish</button></div></form>`;
  $('#newProject').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/projects', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast("Loyiha qo'shildi"); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  body.querySelector('tbody').onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const tr = e.target.closest('tr');
    const p = state.projects.find((x) => String(x.id) === tr.dataset.id);
    const b = a === 'toggle' ? { active: !p.active } : Object.fromEntries($$('[data-f]', tr).map((el) => [el.dataset.f, el.value]));
    try { await api(`/api/projects/${p.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
}

// ---------- Oylik reja ----------
async function tabPlans(body) {
  planMonth ||= state.me.today.slice(0, 7);
  const [plans] = await Promise.all([api(`/api/plans?month=${planMonth}`), reloadProjects()]);
  const { planFields } = state.me;
  const projects = state.projects.filter((p) => p.active);
  const val = (pid, k) => plans.rows.find((r) => r.project_id === pid)?.[k] ?? '';
  body.innerHTML = `<div class="card">
    <div class="card-head"><h2>Oylik reja</h2>
      <div class="filters"><span class="month-nav"><button type="button" class="btn small icon" data-mshift="-1" aria-label="Oldingi oy">‹</button><b>${monthLabel(planMonth)}</b><button type="button" class="btn small icon" data-mshift="1" aria-label="Keyingi oy">›</button></span><button class="btn small" id="copyPrev">O'tgan oydan nusxa</button></div></div>
    <p class="small muted" style="margin:0 0 12px">Lid va sotuv rejasidan «lid ko'p, sotuv kam» signali hisoblanadi (reja konversiyasi = sotuv ÷ lid).</p>
    <div class="table-wrap"><table><thead><tr><th>Loyiha</th>${Object.values(planFields).map((l) => `<th>${esc(l)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${projects.map((p) => `<tr data-id="${p.id}"><td><span class="dot" style="--dc:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}</td>
        ${Object.keys(planFields).map((k) => `<td><input data-k="${k}" inputmode="decimal" value="${val(p.id, k)}" placeholder="—" style="width:130px" aria-label="${esc(planFields[k])}"></td>`).join('')}
        <td><button class="btn small primary" data-a="save">Saqlash</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Avval loyiha qo\'shing</td></tr>'}
    </tbody></table></div></div>`;
  body.querySelectorAll('[data-mshift]').forEach((b) => { b.onclick = () => {
    const [y, m] = planMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + Number(b.dataset.mshift), 1));
    planMonth = d.toISOString().slice(0, 7);
    renderSettings();
  }; });
  const save = (tr) => api('/api/plans', { method: 'PUT', body: { month: planMonth, project_id: Number(tr.dataset.id), values: Object.fromEntries($$('[data-k]', tr).map((el) => [el.dataset.k, el.value])) } });
  body.querySelector('tbody').onclick = async (e) => {
    if (e.target.closest('[data-a]')?.dataset.a !== 'save') return;
    try { await save(e.target.closest('tr')); toast('Reja saqlandi'); } catch (err) { toast(err.message, true); }
  };
  $('#copyPrev').onclick = async () => {
    const [y, m] = planMonth.split('-').map(Number);
    const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
    const old = await api(`/api/plans?month=${prev}`);
    if (!old.rows.length) return toast(`${monthLabel(prev)} uchun reja yo'q`, true);
    for (const r of old.rows) {
      await api('/api/plans', { method: 'PUT', body: { month: planMonth, project_id: r.project_id, values: { budget: r.budget, leads: r.leads, sales: r.sales, revenue: r.revenue } } });
    }
    toast(`${monthLabel(prev)} rejasi ko'chirildi`);
    renderSettings();
  };
}

// ---------- Telegram ----------
async function tabTelegram(body) {
  const settings = await api('/api/settings');
  const tg = settings.telegram;
  const me = state.me.user;
  body.innerHTML = `
    <div class="grid g2">
      <form class="card stack" id="setForm"><h2>Hisobot qayerga boradi</h2>
        <label class="field">Direktorning Telegram ID si yoki guruh ID<span class="hint">direktor botga /id yozsa, raqam chiqadi</span><input name="report_chat_id" id="sChat" value="${esc(settings.report_chat_id ?? '')}" placeholder="123456789"></label>
        <label class="field">Sizning Telegram ID ingiz<span class="hint">eslatma va direktor javobi sizga kelishi uchun</span><input id="sMyTg" value="${esc(me.telegram_id || '')}" placeholder="123456789"></label>
        <div class="fields">
          <label class="field">Eslatma<span class="hint">hisobot yuborilmagan bo'lsa</span>${selectHtml(timeOpts(settings.reminder_time ?? '19:00'), settings.reminder_time ?? '19:00', 'name="reminder_time" id="sRem"', 'Eslatma vaqti')}</label>
          <label class="field">Avto-hisobot<span class="hint">siz yubormasangiz</span>${selectHtml(timeOpts(settings.report_time ?? '21:00'), settings.report_time ?? '21:00', 'name="report_time" id="sTime"', 'Avto-hisobot vaqti')}</label>
        </div>
        <label class="field">Dollar kursi (so'm)<span class="hint">ROAS hisobi uchun: tushum so'mda, reklama dollarda</span><input name="usd_rate" id="sRate" inputmode="decimal" value="${esc(settings.usd_rate ?? '12800')}"></label>
        <div><button class="btn primary">Saqlash</button></div>
      </form>
      <div class="card stack"><h2>Telegram bot</h2>
        ${tg.enabled ? `<div class="insight good"><span class="ic">Ulangan</span><span>${tg.bot ? `@${esc(tg.bot)}` : 'Bot'} ishlayapti</span></div>` : `<div class="insight warning"><span class="ic">O'chiq</span><span>${window.DEMO ? "Demoda bot yo'q — haqiqiy serverda ishlaydi" : 'Bot hali ulanmagan'}</span></div>`}
        <ol class="small" style="margin:0;padding-left:18px;color:var(--text-2);display:grid;gap:6px">
          <li>@BotFather da bot oching va tokenni serverni o'rnatgan odamga bering.</li>
          <li>Direktor botga <span class="code">/id</span> yozadi — chiqqan raqamni birinchi maydonga yozing.</li>
          <li>O'zingiz ham <span class="code">/id</span> yozing va ikkinchi maydonga kiriting.</li>
          <li>Direktor hisobotga <b>javob (reply)</b> qilib yechim yozadi — javob sizga keladi.</li>
        </ol>
      </div>
    </div>`;
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      const myTg = $('#sMyTg').value.trim();
      if (myTg !== (me.telegram_id || '')) await api('/api/me', { method: 'PUT', body: { telegram_id: myTg } });
      await refreshMe();
      toast('Saqlandi');
      renderSettings();
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Profil ----------
async function tabProfile(body) {
  const u = state.me.user;
  body.innerHTML = `<div class="grid g2">
    <form class="card stack" id="nameForm"><h2>Profil</h2>
      <label class="field">Ismingiz<input name="name" id="pName" value="${esc(u.name)}" required maxlength="60"></label>
      <div class="muted small">Login: <b>${esc(u.login)}</b></div>
      <div><button class="btn primary">Saqlash</button></div></form>
    <form class="card stack" id="pwForm"><h2>Parolni almashtirish</h2>
      <label class="field">Joriy parol<input type="password" name="old" id="pwOld" autocomplete="current-password" required></label>
      <label class="field">Yangi parol<input type="password" name="new" id="pwNew" autocomplete="new-password" minlength="6" required></label>
      <div><button class="btn primary">Saqlash</button></div></form>
  </div>`;
  $('#nameForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/me', { method: 'PUT', body: { name: $('#pName').value } }); await refreshMe(); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api('/api/me/password', { method: 'PUT', body: f }); toast("Parol o'zgartirildi"); e.target.reset(); } catch (err) { toast(err.message, true); }
  };
}
