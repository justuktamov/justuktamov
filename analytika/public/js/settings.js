// Sozlamalar (rahbar) va profil (har bir xodim)
import {
  $, $$, esc, api, state, shell, toast, modal, ICONS, botLink, copyText, monthLabel, fmtN, refreshMe,
  getTheme, setTheme, spinnerBlock, initials,
} from './core.js';

let settingsTab = 'projects';
let planMonth = null;
const TABS = [['projects', 'Loyihalar'], ['plans', 'Oylik rejalar'], ['users', 'Xodimlar'], ['telegram', 'Telegram va hisobot'], ['audit', "O'zgarishlar tarixi"]];

export async function renderSettings() {
  if (state.me.user.role !== 'admin') { location.hash = '#/profil'; return; }
  const qTab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab');
  if (qTab && TABS.some(([k]) => k === qTab)) settingsTab = qTab;
  shell(`<div class="page-head"><div><h1><span class="grad">Sozlamalar</span></h1><div class="sub">Loyihalar, rejalar, xodimlar va Telegram</div></div></div>
    <div class="tabs" id="sTabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-k="${k}" class="${settingsTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="sBody">${spinnerBlock()}</div>`);
  $('#sTabs').onclick = (e) => {
    const k = e.target.dataset.k;
    if (k) { settingsTab = k; history.replaceState(null, '', '#/sozlamalar'); renderSettings(); }
  };
  const body = $('#sBody');
  try {
    await ({ projects: tabProjects, plans: tabPlans, users: tabUsers, telegram: tabTelegram, audit: tabAudit })[settingsTab](body);
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
        <label class="field">Identifikator (lotin)<span class="hint">bot havolasida: ?start=ielts</span><input name="slug" id="npSlug" placeholder="ielts"></label>
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
    </tbody></table></div>
    <p class="muted small" style="margin:12px 0 0">Bot havolasini reklama postlariga qo'ying — kim qaysi loyihadan /start bosgani avtomatik sanaladi. Har bir post uchun alohida havola «Reklama postlari» bo'limida beriladi.
    Kanal a'zolarini sanash uchun botni kanalga admin qiling va Kanal ID ni kiriting. Tracking kaliti — loyihaning o'z boti hodisalarni <span class="code">POST /api/track</span> orqali yuborishi uchun.</p></div>`;
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
    <p class="muted small" style="margin:-4px 0 12px">Har bir loyiha uchun oylik maqsad. Bosh panel va Telegram hisobotida bajarilish foizi va oy oxirigacha prognoz ko'rinadi. Bo'sh qoldirilgan ko'rsatkich hisoblanmaydi.</p>
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
        <label class="field">Parol<span class="hint">kamida 6 belgi</span><input name="password" id="nuPass" required minlength="6" type="text" autocomplete="new-password"></label>
        <label class="field">Rol<select name="role" id="nuRole">${roleOpts('lead')}</select></label>
        <label class="field">Telegram ID<span class="hint">xodim botga /id yozsa bilib oladi</span><input name="telegram_id" id="nuTg" placeholder="123456789"></label>
      </div><div><button class="btn primary">${ICONS.plus} Qo'shish</button></div></form>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Xodim</th><th>Rol</th><th>Telegram ID</th><th>Yangi parol</th><th>Holat</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr data-id="${u.id}"><td><div class="row" style="flex-wrap:nowrap"><span class="avatar" style="width:30px;height:30px;font-size:12px">${esc(initials(u.name))}</span><div><input data-f="name" value="${esc(u.name)}" style="width:150px" aria-label="Ism"><div class="tiny muted">${esc(u.login)}</div></div></div></td>
      <td><select data-f="role" aria-label="Rol">${roleOpts(u.role)}</select></td>
      <td><input data-f="telegram_id" value="${esc(u.telegram_id || '')}" style="width:130px" aria-label="Telegram ID"></td>
      <td><input data-f="password" placeholder="o'zgartirmaslik" style="width:140px" autocomplete="new-password" aria-label="Yangi parol"></td>
      <td>${u.active ? '<span class="pill good">Faol</span>' : '<span class="pill">O\'chirilgan</span>'}</td>
      <td><button class="btn small" data-a="save">Saqlash</button> <button class="btn small ghost" data-a="toggle">${u.active ? "O'chirish" : 'Yoqish'}</button></td></tr>`).join('')}
    </tbody></table></div>
    <p class="muted small" style="margin:12px 0 0">Har bir rol nimani kiritishi va nimani olishi — <a href="#/jamoa">Jamoa</a> sahifasida.</p></div>`;
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
          <label class="field">Dollar kursi (so'm)<span class="hint">ROAS va foyda shu kurs bilan hisoblanadi</span><input name="usd_rate" id="sRate" inputmode="decimal" value="${esc(settings.usd_rate ?? state.me.usdRate)}"></label>
          <label class="field">Kunlik hisobot yuboriladigan chat ID<span class="hint">guruh ID (-100…) yoki shaxsiy ID — botga /id yozing</span><input name="report_chat_id" id="sChat" value="${esc(settings.report_chat_id ?? '')}"></label>
          <div class="fields">
            <label class="field">Hisobot vaqti<input name="report_time" id="sTime" type="time" value="${esc(settings.report_time ?? '21:00')}"></label>
            <label class="field">Eslatma vaqti<span class="hint">kiritmaganlarga</span><input name="reminder_time" id="sRem" type="time" value="${esc(settings.reminder_time ?? '19:00')}"></label>
          </div>
          <label class="row small" style="color:var(--text-2)"><input type="checkbox" name="ai_daily" id="sAi" value="1" ${settings.ai_daily === '1' ? 'checked' : ''}> Har kuni AI tahlilni ham yuborish (so'nggi 7 kun)</label>
          <label class="field">/start javobi (ixtiyoriy)<span class="hint">{loyiha} — loyiha nomi bilan almashtiriladi</span><textarea name="start_reply" id="sReply" rows="2">${esc(settings.start_reply ?? '')}</textarea></label>
          <div class="row"><button class="btn primary">Saqlash</button><button type="button" class="btn" id="testReport" ${tg.enabled ? '' : 'disabled'}>${ICONS.tg} Hozir yuborish</button></div>
        </form>
        <div class="card stack"><h2>Hisobot ko'rinishi</h2><p class="muted small" style="margin:0">Telegramga har kuni shunday xabar boradi (bugungi ma'lumot bilan):</p><pre class="tg">${preview.text}</pre></div>
      </div>
      <div class="card stack"><h2>Telegram bot</h2>
        ${tg.enabled ? `<div class="insight good"><span class="ic">Ulangan</span><span>@${esc(botName)} ishlayapti.</span></div>` : `<div class="insight warning"><span class="ic">O'chiq</span><span>${window.DEMO ? 'Demoda bot ulanmagan — haqiqiy serverda ishlaydi.' : 'Serverda <span class="code">TELEGRAM_BOT_TOKEN</span> o\'rnatilmagan.'}</span></div>`}
        <ol class="small" style="margin:0;padding-left:18px;color:var(--text-2);display:grid;gap:6px">
          <li>@BotFather dan bot yarating va tokenni serverga qo'ying.</li>
          <li>Botni har bir loyiha kanaliga <b>admin</b> qilib qo'shing — kanal pastda paydo bo'ladi, ID sini «Loyihalar» bo'limida kiriting.</li>
          <li>Reklama postlarida loyiha yoki post havolasidan foydalaning: <span class="code">t.me/${esc(botName)}?start=slug__post</span></li>
          <li>Xodimlar botga <span class="code">/id</span> yozib, ID ni profiliga qo'shtiradi — eslatma va hisobotlar keladi.</li>
          <li><b>Mini App:</b> serverda <span class="code">APP_URL</span> (https) berilsa, bot menyusida «Hisobot» tugmasi paydo bo'ladi — menejerlar raqamlarni Telegram ichida kiritadi.</li>
        </ol>
        <h3>Bot admin bo'lgan chatlar</h3>
        ${tg.chats.length ? `<table><tbody>${tg.chats.map((c) => `<tr><td>${esc(c.title)}<div class="muted tiny">${esc(c.type)} · ${esc(c.status)}</div></td><td class="n"><button class="btn small ghost" data-copy="${esc(c.id)}">${ICONS.copy} ${esc(c.id)}</button></td></tr>`).join('')}</tbody></table>` : '<div class="muted small">Hali yo\'q.</div>'}
        <h3>Tashqi bot yoki sayt uchun API</h3>
        <pre class="code" style="white-space:pre-wrap;margin:0;padding:10px">POST ${esc(location.origin)}/api/track
{"key":"&lt;tracking kaliti&gt;","event":"start","tg_user_id":123456,"source":"post12"}</pre>
        <p class="small muted" style="margin:0">event: start · lead · sale · join · leave. <span class="code">source</span> post tegiga teng bo'lsa, natija shu postga yoziladi.</p>
      </div>
    </div>`;
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    f.ai_daily = f.ai_daily ? '1' : '0';
    try { await api('/api/settings', { method: 'PUT', body: f }); await refreshMe(); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  };
  $('#testReport').onclick = async () => { try { await api('/api/telegram/test-report', { method: 'POST', body: {} }); toast('Yuborildi'); } catch (err) { toast(err.message, true); } };
  body.addEventListener('click', (e) => { const c = e.target.closest('[data-copy]'); if (c) copyText(c.dataset.copy); });
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
  shell(`<div class="page-head"><div><h1><span class="grad">Profil</span></h1><div class="sub">Shaxsiy sozlamalar</div></div></div>
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
        <label class="field">Yangi parol<span class="hint">kamida 6 belgi</span><input type="password" name="new" id="pwNew" autocomplete="new-password" minlength="6" required></label>
        <div><button class="btn primary">Saqlash</button></div></form>
    </div>`);
  $('#themeSeg').onclick = (e) => { const t = e.target.dataset.t; if (t) setTheme(t); };
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api('/api/me/password', { method: 'PUT', body: f }); toast("Parol o'zgartirildi"); e.target.reset(); } catch (err) { toast(err.message, true); }
  };
}
