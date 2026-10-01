// Sozlamalar (rahbar) va profil (har bir xodim)
import {
  $, $$, esc, api, state, shell, toast, modal, ICONS, botLink, copyText, monthLabel, fmtN, refreshMe,
  getTheme, setTheme, spinnerBlock, initials,
} from './core.js';

let settingsTab = 'projects';
let planMonth = null;
const TABS = [['projects', 'Loyihalar'], ['telegram', 'Telegram'], ['plans', 'Oylik reja'], ['data', "Ma'lumotlar"]];

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
    await ({ projects: tabProjects, plans: tabPlans, telegram: tabTelegram, data: tabData })[settingsTab](body);
  } catch (e) { body.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function reloadProjects() { state.projects = await api('/api/projects'); }

// ---------- Loyihalar ----------
async function tabProjects(body) {
  await reloadProjects();
  body.innerHTML = `
    <form class="card stack" id="newProject" style="margin-bottom:14px"><h2>Yangi loyiha / kurs</h2>
      <div class="fields">
        <label class="field">Nomi<input name="name" id="npName" required placeholder="VIZART"></label>
        <label class="field">Identifikator (lotin)<input name="slug" id="npSlug" placeholder="vizart"></label>
        <label class="field">Turi<select name="kind" id="npKind"><option value="kurs">Kurs</option><option value="loyiha">Loyiha</option><option value="kanal">Kanal</option></select></label>
        <label class="field">Rang<input name="color" id="npColor" type="color" value="#2a78d6"></label>
      </div><div><button class="btn primary">${ICONS.plus} Qo'shish</button></div></form>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Loyiha</th><th>Rang</th><th>Bot havolasi</th><th>Kanal ID</th><th>Tracking kaliti</th><th>Holat</th><th></th></tr></thead><tbody>
    ${state.projects.map((p) => `<tr data-id="${p.id}">
      <td><input data-f="name" value="${esc(p.name)}" style="min-width:170px" aria-label="Nomi"><div class="tiny muted" style="margin-top:3px">${esc(p.slug)} · ${esc(p.kind)}</div></td>
      <td><input data-f="color" type="color" value="${esc(p.color || '#2a78d6')}" style="width:48px" aria-label="Rang"></td>
      <td><button class="btn small ghost" data-a="link">${ICONS.copy} ?start=${esc(p.slug)}</button></td>
      <td><input data-f="channel_id" value="${esc(p.channel_id || '')}" placeholder="-100…" style="width:150px" aria-label="Kanal ID"></td>
      <td><button class="btn small ghost" data-a="key" title="Nusxa olish">${ICONS.copy} <span class="code">${esc(String(p.track_key).slice(0, 8))}…</span></button></td>
      <td>${p.active ? '<span class="pill good">Faol</span>' : '<span class="pill">Arxiv</span>'}</td>
      <td><button class="btn small" data-a="save">Saqlash</button> <button class="btn small ghost" data-a="toggle">${p.active ? 'Arxivlash' : 'Tiklash'}</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('#newProject').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/projects', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast("Loyiha qo'shildi"); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  body.querySelector('tbody').onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const tr = e.target.closest('tr');
    const p = state.projects.find((x) => String(x.id) === tr.dataset.id);
    if (a === 'link') return copyText(botLink(p.slug));
    if (a === 'key') return copyText(p.track_key);
    const b = a === 'toggle' ? { active: !p.active } : Object.fromEntries($$('[data-f]', tr).map((el) => [el.dataset.f, el.value]));
    try { await api(`/api/projects/${p.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
}

// ---------- Oylik rejalar ----------
async function tabPlans(body) {
  planMonth ||= state.me.today.slice(0, 7);
  const [plans] = await Promise.all([api(`/api/plans?month=${planMonth}`), reloadProjects()]);
  const { planFields } = state.me;
  const projects = state.projects.filter((p) => p.active);
  const val = (pid, k) => plans.rows.find((r) => r.project_id === pid)?.[k] ?? '';
  body.innerHTML = `<div class="card">
    <div class="card-head"><h2>Reja: ${monthLabel(planMonth)}</h2>
      <div class="filters"><input type="month" id="planMonth" value="${planMonth}" aria-label="Oy"><button class="btn small" id="copyPrev">O'tgan oydan nusxa</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Loyiha</th>${Object.values(planFields).map((l) => `<th>${esc(l)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${projects.map((p) => `<tr data-id="${p.id}"><td><span class="dot" style="background:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}</td>
        ${Object.keys(planFields).map((k) => `<td><input data-k="${k}" inputmode="decimal" value="${val(p.id, k)}" placeholder="—" style="width:130px" aria-label="${esc(planFields[k])}"></td>`).join('')}
        <td><button class="btn small primary" data-a="save">Saqlash</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Avval loyiha qo\'shing</td></tr>'}
    </tbody></table></div></div>`;
  $('#planMonth').onchange = (e) => { if (e.target.value) { planMonth = e.target.value; renderSettings(); } };
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
        <label class="field">Sizning Telegram ID ingiz<span class="hint">eslatmalar sizga kelishi uchun</span><input id="sMyTg" value="${esc(me.telegram_id || '')}" placeholder="123456789"></label>
        <div class="fields">
          <label class="field">Eslatma<span class="hint">hisobot yuborilmagan bo'lsa</span><input name="reminder_time" id="sRem" type="time" value="${esc(settings.reminder_time ?? '19:00')}"></label>
          <label class="field">Avto-hisobot<span class="hint">siz yubormasangiz</span><input name="report_time" id="sTime" type="time" value="${esc(settings.report_time ?? '21:00')}"></label>
        </div>
        <label class="row small" style="color:var(--text-2)"><input type="checkbox" name="weekly_report" id="sWeekly" value="1" ${settings.weekly_report !== '0' ? 'checked' : ''}> Har dushanba haftalik hisobot</label>
        <label class="field">Dollar kursi (so'm)<input name="usd_rate" id="sRate" inputmode="decimal" value="${esc(settings.usd_rate ?? state.me.usdRate)}"></label>
        <div><button class="btn primary">Saqlash</button></div>
      </form>
      <div class="card stack"><h2>Telegram bot</h2>
        ${tg.enabled ? `<div class="insight good"><span class="ic">Ulangan</span><span>${tg.bot ? `@${esc(tg.bot)}` : 'Bot'} ishlayapti</span></div>` : `<div class="insight warning"><span class="ic">O'chiq</span><span>${window.DEMO ? 'Demoda bot yo\'q — haqiqiy serverda ishlaydi' : 'Bot hali ulanmagan'}</span></div>`}
        <ol class="small" style="margin:0;padding-left:18px;color:var(--text-2);display:grid;gap:6px">
          <li>@BotFather da bot oching va tokenni serverni o'rnatgan odamga bering.</li>
          <li>Direktor botga <span class="code">/id</span> yozadi — chiqqan raqamni chapdagi birinchi maydonga yozing.</li>
          <li>O'zingiz ham <span class="code">/id</span> yozing va ikkinchi maydonga kiriting.</li>
        </ol>
      </div>
    </div>`;
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    f.weekly_report = f.weekly_report ? '1' : '0';
    try {
      await api('/api/settings', { method: 'PUT', body: f });
      const myTg = $('#sMyTg').value.trim();
      if (myTg !== (me.telegram_id || '')) await api(`/api/users/${me.id}`, { method: 'PUT', body: { telegram_id: myTg } });
      await refreshMe();
      toast('Saqlandi');
      renderSettings();
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Ma'lumotlar: import, zaxira, haftalik hisobot ko'rinishi ----------
async function tabData(body) {
  const weekly = await api('/api/weekly-preview').catch(() => ({ text: '' }));
  body.innerHTML = `<div class="grid g2">
    <div class="stack">
      <div class="card stack"><h2>Excel / CSV dan yuklash</h2>
        <div class="small muted">Ustunlar: <span class="code">date, project, spend, clicks, leads, sales, revenue…</span> — eksport bilan bir xil. Bor qiymatlar yangilanadi.</div>
        <input type="file" id="csvFile" accept=".csv,.txt,text/csv" aria-label="CSV fayl">
        <textarea id="csvText" rows="5" placeholder="yoki shu yerga joylang (Excel'dan nusxa ham bo'ladi)" aria-label="CSV matn"></textarea>
        <div class="row"><button class="btn primary" id="csvGo">Yuklash</button><span class="small muted" id="csvRes"></span></div></div>
      <div class="card stack"><h2>Zaxira nusxa</h2>
        <div class="small muted">Butun baza bitta faylda — xavfsiz joyda saqlang.</div>
        <div class="row"><button class="btn" id="bkGo">${ICONS.dl} Yuklab olish</button><a class="btn ghost" href="#/loyihalar">CSV eksport — Loyihalarda</a></div></div>
    </div>
    <div class="card stack"><h2>Haftalik hisobot</h2><pre class="tg">${weekly.text}</pre></div>
  </div>`;
  $('#csvFile').onchange = async (e) => { const f = e.target.files[0]; if (f) $('#csvText').value = await f.text(); };
  $('#csvGo').onclick = async () => {
    const csv = $('#csvText').value.trim();
    if (!csv) return toast('Fayl tanlang yoki matn joylang', true);
    try {
      const r = await api('/api/import', { method: 'POST', body: { csv } });
      $('#csvRes').textContent = `${r.imported} qator yuklandi${r.errorCount ? ` · ${r.errorCount} xato: ${r.errors.slice(0, 3).join('; ')}` : ''}`;
      toast(`${r.imported} qator yuklandi`);
    } catch (err) { toast(err.message, true); }
  };
  $('#bkGo').onclick = async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error((await res.json()).error || 'Xato');
      if (window.__demoDownload) return window.__demoDownload(`analytika-${state.me.today}.json`, await res.text(), 'application/json');
      const blob = await res.blob();
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `analytika-${state.me.today}.db` });
      document.body.append(a); a.click(); a.remove();
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Profil ----------
export function renderProfile() {
  const u = state.me.user;
  const theme = getTheme();
  shell(`<div class="page-head"><h1><span class="grad">Profil</span></h1></div>
    <div class="grid g2">
      <div class="card stack">
        <div class="row"><span class="avatar" style="width:48px;height:48px;font-size:16px;background:var(--brand-soft);color:var(--brand)">${esc(initials(u.name))}</span>
          <div><h2>${esc(u.name)}</h2><div class="muted small">${esc(state.me.roles[u.role])} · login: ${esc(u.login)}</div></div></div>
        <div><span class="eyebrow">Mavzu</span>
          <div class="seg" id="themeSeg" style="margin-top:6px">${[['dark', 'Tungi (standart)'], ['light', "Yorug'"]].map(([k, l]) => `<button data-t="${k}" class="${theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div><span class="eyebrow">Telegram</span>
          <p class="small" style="margin:6px 0 0;color:var(--text-2)">${u.telegram_id ? `Bog'langan: <span class="code">${esc(u.telegram_id)}</span>. Eslatmalar va hisobotlar Telegramga keladi.` : 'Telegram bog\'lanmagan. Botga <span class="code">/id</span> yozing va chiqqan raqamni rahbarga yuboring — eslatmalar va Mini App shundan keyin ishlaydi.'}</p></div>
      </div>
      <form class="card stack" id="pwForm"><h2>Parolni almashtirish</h2>
        <label class="field">Joriy parol<input type="password" name="old" id="pwOld" autocomplete="current-password" required></label>
        <label class="field">Yangi parol<input type="password" name="new" id="pwNew" autocomplete="new-password" minlength="6" required></label>
        <div><button class="btn primary">Saqlash</button></div></form>
    </div>`);
  $('#themeSeg').onclick = (e) => { const t = e.target.dataset.t; if (t) setTheme(t); };
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api('/api/me/password', { method: 'PUT', body: f }); toast("Parol o'zgartirildi"); e.target.reset(); } catch (err) { toast(err.message, true); }
  };
}
