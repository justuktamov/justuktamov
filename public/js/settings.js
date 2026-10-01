// Sozlamalar (rahbar) va profil (har bir xodim)
import {
  $, $$, esc, api, state, shell, toast, modal, ICONS, botLink, copyText, monthLabel, fmtN, refreshMe,
  getTheme, setTheme, spinnerBlock, initials,
} from './core.js';

let settingsTab = 'projects';
let planMonth = null;
const TABS = [['projects', 'Loyihalar'], ['plans', 'Rejalar'], ['users', 'Xodimlar'], ['telegram', 'Telegram'], ['data', "Ma'lumotlar"], ['audit', 'Tarix']];

export async function renderSettings() {
  if (state.me.user.role !== 'admin') { location.hash = '#/profil'; return; }
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
    await ({ projects: tabProjects, plans: tabPlans, users: tabUsers, telegram: tabTelegram, data: tabData, audit: tabAudit })[settingsTab](body);
  } catch (e) { body.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function reloadProjects() { state.projects = await api('/api/projects'); }

// ---------- Loyihalar ----------
async function tabProjects(body) {
  await reloadProjects();
  body.innerHTML = `
    <form class="card stack" id="newProject" style="margin-bottom:14px"><h2>Yangi loyiha / kurs</h2>
      <div class="fields">
        <label class="field">Nomi<input name="name" id="npName" required placeholder="IELTS Intensiv"></label>
        <label class="field">Identifikator (lotin)<input name="slug" id="npSlug" placeholder="ielts"></label>
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

// ---------- Xodimlar ----------
async function tabUsers(body) {
  const users = await api('/api/users');
  const roleOpts = (sel) => Object.entries(state.me.roles).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  body.innerHTML = `
    <form class="card stack" id="newUser" style="margin-bottom:14px"><h2>Yangi xodim</h2>
      <div class="fields">
        <label class="field">Ism<input name="name" id="nuName" required placeholder="Fotima"></label>
        <label class="field">Login<input name="login" id="nuLogin" required placeholder="fotima" autocomplete="off"></label>
        <label class="field">Parol<input name="password" id="nuPass" required minlength="6" type="text" autocomplete="new-password"></label>
        <label class="field">Rol<select name="role" id="nuRole">${roleOpts('lead')}</select></label>
        <label class="field">Telegram ID<input name="telegram_id" id="nuTg" placeholder="123456789"></label>
      </div><div><button class="btn primary">${ICONS.plus} Qo'shish</button></div></form>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Xodim</th><th>Rol</th><th title="Belgilanmasa — hamma loyihalar">Loyihalari</th><th>Telegram ID</th><th>Yangi parol</th><th>Holat</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr data-id="${u.id}"><td><div class="row" style="flex-wrap:nowrap"><span class="avatar" style="width:30px;height:30px;font-size:12px">${esc(initials(u.name))}</span><div><input data-f="name" value="${esc(u.name)}" style="width:150px" aria-label="Ism"><div class="tiny muted">${esc(u.login)}</div></div></div></td>
      <td><select data-f="role" aria-label="Rol">${roleOpts(u.role)}</select></td>
      <td><div class="pchips">${state.projects.filter((p) => p.active).map((p) => `<button type="button" class="${u.project_ids?.includes(p.id) ? 'on' : ''}" data-pid="${p.id}" title="${esc(p.name)}"><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')};margin:0"></span>${esc(p.name.split(' ')[0])}</button>`).join('')}</div></td>
      <td><input data-f="telegram_id" value="${esc(u.telegram_id || '')}" style="width:130px" aria-label="Telegram ID"></td>
      <td><input data-f="password" placeholder="o'zgartirmaslik" style="width:140px" autocomplete="new-password" aria-label="Yangi parol"></td>
      <td>${u.active ? '<span class="pill good">Faol</span>' : '<span class="pill">O\'chirilgan</span>'}</td>
      <td><button class="btn small" data-a="save">Saqlash</button> <button class="btn small ghost" data-a="toggle">${u.active ? "O'chirish" : 'Yoqish'}</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  body.querySelector('tbody').addEventListener('click', (e) => { const c = e.target.closest('.pchips button'); if (c) c.classList.toggle('on'); });
  $('#newUser').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/users', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast("Xodim qo'shildi"); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  body.querySelector('tbody').onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const tr = e.target.closest('tr');
    const u = users.find((x) => String(x.id) === tr.dataset.id);
    const b = a === 'toggle' ? { active: !u.active } : Object.fromEntries($$('[data-f]', tr).map((el) => [el.dataset.f, el.value]).filter(([k, v]) => k !== 'password' || v));
    if (a === 'save') b.project_ids = $$('.pchips .on', tr).map((x) => Number(x.dataset.pid));
    try { await api(`/api/users/${u.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
}

// ---------- Telegram ----------
async function tabTelegram(body) {
  const [settings, preview] = await Promise.all([api('/api/settings'), api('/api/report-preview')]);
  const tg = settings.telegram;
  const botName = tg.bot || state.me.telegram?.bot || 'bot';
  body.innerHTML = `
    <div class="grid g2">
      <div class="stack">
        <form class="card stack" id="setForm"><h2>Hisobot sozlamalari</h2>
          <label class="field">Dollar kursi (so'm)<input name="usd_rate" id="sRate" inputmode="decimal" value="${esc(settings.usd_rate ?? state.me.usdRate)}"></label>
          <label class="field">Hisobot chati (ID)<input name="report_chat_id" id="sChat" value="${esc(settings.report_chat_id ?? '')}"></label>
          <div class="fields">
            <label class="field">Hisobot vaqti<input name="report_time" id="sTime" type="time" value="${esc(settings.report_time ?? '21:00')}"></label>
            <label class="field">Eslatma vaqti<input name="reminder_time" id="sRem" type="time" value="${esc(settings.reminder_time ?? '19:00')}"></label>
          </div>
          <label class="row small" style="color:var(--text-2)"><input type="checkbox" name="ai_daily" id="sAi" value="1" ${settings.ai_daily === '1' ? 'checked' : ''}> AI tahlilni ham yuborish</label>
          <label class="row small" style="color:var(--text-2)"><input type="checkbox" name="weekly_report" id="sWeekly" value="1" ${settings.weekly_report !== '0' ? 'checked' : ''}> Har dushanba haftalik hisobot</label>
          <label class="field">/start javobi<textarea name="start_reply" id="sReply" rows="2">${esc(settings.start_reply ?? '')}</textarea></label>
          <div class="row"><button class="btn primary">Saqlash</button><button type="button" class="btn" id="testReport" ${tg.enabled ? '' : 'disabled'}>${ICONS.tg} Hozir yuborish</button></div>
        </form>
        <div class="card stack"><h2>Hisobot ko'rinishi</h2><pre class="tg">${preview.text}</pre></div>
      </div>
      <div class="card stack"><h2>Telegram bot</h2>
        ${tg.enabled ? `<div class="insight good"><span class="ic">Ulangan</span><span>@${esc(botName)} ishlayapti.</span></div>` : `<div class="insight warning"><span class="ic">O'chiq</span><span>${window.DEMO ? 'Demoda bot ulanmagan — haqiqiy serverda ishlaydi.' : 'Serverda <span class="code">TELEGRAM_BOT_TOKEN</span> o\'rnatilmagan.'}</span></div>`}
        <ol class="small" style="margin:0;padding-left:18px;color:var(--text-2);display:grid;gap:4px">
          <li>@BotFather → token serverga</li>
          <li>Botni kanallarga admin qiling</li>
          <li>Xodimlar botga <span class="code">/id</span> yozadi</li>
          <li><span class="code">APP_URL</span> → bot menyusida Mini App</li>
        </ol>
        <h3>Bot admin bo'lgan chatlar</h3>
        ${tg.chats.length ? `<table><tbody>${tg.chats.map((c) => `<tr><td>${esc(c.title)}<div class="muted tiny">${esc(c.type)} · ${esc(c.status)}</div></td><td class="n"><button class="btn small ghost" data-copy="${esc(c.id)}">${ICONS.copy} ${esc(c.id)}</button></td></tr>`).join('')}</tbody></table>` : '<div class="muted small">Hali yo\'q.</div>'}
        <h3>Tracking API</h3>
        <pre class="code" style="white-space:pre-wrap;margin:0;padding:10px">POST ${esc(location.origin)}/api/track
{"key":"&lt;tracking kaliti&gt;","event":"start","tg_user_id":123456,"source":"post12"}</pre>
      </div>
    </div>`;
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    f.ai_daily = f.ai_daily ? '1' : '0';
    f.weekly_report = f.weekly_report ? '1' : '0';
    try { await api('/api/settings', { method: 'PUT', body: f }); await refreshMe(); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  $('#testReport').onclick = async () => { try { await api('/api/telegram/test-report', { method: 'POST', body: {} }); toast('Yuborildi'); } catch (err) { toast(err.message, true); } };
  body.addEventListener('click', (e) => { const c = e.target.closest('[data-copy]'); if (c) copyText(c.dataset.copy); });
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
        <div class="row"><button class="btn" id="bkGo">${ICONS.dl} Yuklab olish</button><a class="btn ghost" href="#/analitika">CSV eksport — Analitikada</a></div></div>
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

// ---------- Tarix ----------
async function tabAudit(body) {
  const rows = await api('/api/audit?limit=200');
  const label = (f) => state.me.fields[f]?.label || ({ note_target: 'Izoh (target)', note_lead: 'Izoh (lid)', note_sales: 'Izoh (sotuv)', note_finance: 'Izoh (moliya)' })[f] || f;
  body.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Vaqt</th><th>Xodim</th><th>Loyiha</th><th>Sana</th><th>Maydon</th><th class="n">Eski</th><th class="n">Yangi</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(String(r.created_at).slice(0, 16))}</td><td>${esc(r.user_name)}</td><td>${esc(r.project_name)}</td><td>${r.date}</td><td>${esc(label(r.field))}</td><td class="n muted">${esc(String(r.old_value ?? '—').slice(0, 40))}</td><td class="n">${esc(String(r.new_value ?? '—').slice(0, 40))}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Hali o\'zgarish yo\'q</td></tr>'}
    </tbody></table></div></div>`;
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
