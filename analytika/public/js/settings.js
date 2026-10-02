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
  const CH = state.me.channels;
  body.innerHTML = `<div class="card plan-intro">
      <div class="card-head"><h2>Loyihalar</h2></div>
      <p class="small" style="margin:0;color:var(--text-2);max-width:95ch"><b>Tannarx</b> — tushumdan foizda ketadigan xarajat (Stars/Premium xaridi, ROP bonusi, to'lov komissiyasi).
        <b>Doimiy xarajat</b> — oyiga so'mda (ish haqi, ijara, mentorlar). Shu ikkisidan <b>sof foyda</b> hisoblanadi.
        <b>Kanallar</b> — shu loyiha reklama qiladigan joylar; har kun ular bo'yicha raqam kiritiladi.
        <b>Kechikish</b> — odam lid bo'lgandan keyin o'rtacha necha kunda sotib oladi; konversiya shunga qarab to'g'ri hisoblanadi.</p>
    </div>
    <div class="plan-cards">${state.projects.map((p) => `<section class="card proj-card" data-id="${p.id}">
      <div class="card-head"><h3><span class="dot" style="--dc:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)}</h3>${p.active ? '<span class="pill good">Faol</span>' : '<span class="pill">Arxivda</span>'}</div>
      <div class="plan-inputs">
        <label class="field">Nomi<input data-f="name" value="${esc(p.name)}"></label>
        <div class="field">Turi${kindSelect(p.kind, 'data-f="kind"')}</div>
        <div class="field">Rang${colorHtml(p.color || '#2a78d6', 'data-f="color"')}</div>
      </div>
      <div class="plan-inputs">
        <label class="field">Tannarx, % tushumdan<input data-f="var_cost_pct" inputmode="decimal" value="${p.var_cost_pct ?? ''}" placeholder="0"></label>
        <label class="field">Doimiy xarajat, so'm/oy<input data-f="fixed_monthly" inputmode="decimal" value="${p.fixed_monthly ?? ''}" placeholder="0"></label>
        ${p.kind === 'auto' ? '' : `<label class="field">Lid → sotuv kechikishi, kun<input data-f="sale_lag" inputmode="numeric" value="${p.sale_lag ?? ''}" placeholder="0">
          <span class="hint">${p.lag_hint != null ? `Ma'lumotga ko'ra: ~${p.lag_hint} kun ${Number(p.sale_lag) === p.lag_hint ? '✓' : `<button type="button" class="link-btn" data-lag="${p.lag_hint}">qo'yish</button>`}` : "Ma'lumot to'plangach taxmin chiqadi"}</span></label>`}
      </div>
      <div class="field">Reklama kanallari
        <div class="chips" data-channels>${Object.entries(CH).map(([k, l]) => `<button type="button" class="chip ${p.channels.includes(k) ? 'on' : ''}" data-ch="${k}" aria-pressed="${p.channels.includes(k)}">${esc(l)}</button>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-a="toggle">${p.active ? 'Arxivlash' : 'Tiklash'}</button><button class="btn small primary" data-a="save">Saqlash</button></div>
    </section>`).join('') || '<div class="card empty">Loyiha yo\'q</div>'}</div>
    <p class="small muted" style="margin:10px 0 0">Arxivdagi loyiha kunlik hisobotda chiqmaydi, eski raqamlari saqlanadi.</p>
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
  body.querySelector('.plan-cards').addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-ch]');
    if (chip) { chip.classList.toggle('on'); chip.setAttribute('aria-pressed', chip.classList.contains('on')); return; }
    const lagBtn = e.target.closest('[data-lag]');
    if (lagBtn) { lagBtn.closest('label').querySelector('input').value = lagBtn.dataset.lag; return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const card = e.target.closest('.proj-card');
    const p = state.projects.find((x) => String(x.id) === card.dataset.id);
    const b = a === 'toggle' ? { active: !p.active }
      : { ...Object.fromEntries($$('[data-f]', card).map((el) => [el.dataset.f, el.value])), channels: $$('[data-ch].on', card).map((x) => x.dataset.ch) };
    try { await api(`/api/projects/${p.id}`, { method: 'PUT', body: b }); toast('Saqlandi'); renderSettings(); } catch (err) { toast(err.message, true); }
  });
}

// ---------- Oylik reja ----------
// Har bir loyiha — alohida karta: 4 ta maqsad, o'tgan oy fakti mo'ljal sifatida, rejadan chiqadigan ko'rsatkichlar jonli
const PLAN_INPUTS = [['budget', "Reklama byudjeti, $"], ['leads', 'Lidlar soni'], ['sales', 'Sotuvlar soni'], ['revenue', "Tushum, so'm"]];
const num = (v) => { const x = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return v === '' || v == null || !Number.isFinite(x) ? null : x; };
const usd2 = (x) => (x == null || !Number.isFinite(x) ? '—' : `$${x.toFixed(2)}`);
const pctS = (x) => (x == null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(1)}%`);
const som = (x) => (x == null || !Number.isFinite(x) ? '—' : `${x >= 1e6 ? `${(x / 1e6).toFixed(1)} mln` : Math.round(x).toLocaleString('ru-RU')} so'm`);

// Rejadan chiqadigan ko'rsatkichlar: [nom, qanday hisoblanadi, qiymat, format, yaxshi tomoni (-1 — kami yaxshi, 1 — ko'pi, 0 — neytral)]
function planDerived(v, auto) {
  const d = (a, b) => (a > 0 && b > 0 ? a / b : null);
  return [
    !auto && ['1 lid narxi', 'byudjet ÷ lid', d(v.budget, v.leads), usd2, -1],
    !auto && ['Konversiya', 'sotuv ÷ lid', d(v.sales, v.leads), pctS, 1],
    [auto ? '1 xarid narxi' : '1 mijoz narxi', `byudjet ÷ ${auto ? 'xarid' : 'sotuv'}`, d(v.budget, v.sales), usd2, -1],
    ["O'rtacha chek", 'tushum ÷ sotuv', d(v.revenue, v.sales), som, 0],
  ].filter(Boolean);
}
// Reja o'tgan oy faktiga qanchalik yaqin: ±25% — real, undan yaxshi — optimistik
function planVerdict(plan, prev, good) {
  if (plan == null || prev == null) return ['', '—'];
  const r = plan / prev - 1;
  const pct = `${Math.round(Math.abs(r) * 100)}%`;
  if (Math.abs(r) <= 0.25) return ['good', 'Real'];
  if (!good) return ['info', `${pct} ${r > 0 ? 'katta' : 'kichik'}`];
  const better = good > 0 ? r > 0 : r < 0;
  const word = good > 0 ? (r > 0 ? 'yuqori' : 'past') : (r > 0 ? 'qimmat' : 'arzon');
  return better ? ['warn', `${pct} ${word} — qiyin`] : ['info', `${pct} ${word}`];
}

async function tabPlans(body) {
  planMonth ||= state.me.today.slice(0, 7);
  const [plans] = await Promise.all([api(`/api/plans?month=${planMonth}`), reloadProjects()]);
  const projects = state.projects.filter((p) => p.active);
  const val = (pid, k) => plans.rows.find((r) => r.project_id === pid)?.[k] ?? '';
  const prevName = plans.prev && Object.values(plans.prev)[0] ? monthLabel(Object.values(plans.prev)[0].month) : "o'tgan oy";
  body.innerHTML = `<div class="card plan-intro">
      <div class="card-head"><h2>Oylik reja</h2>
        <div class="filters"><span class="month-nav"><button type="button" class="btn small icon" data-mshift="-1" aria-label="Oldingi oy">‹</button><b>${monthLabel(planMonth)}</b><button type="button" class="btn small icon" data-mshift="1" aria-label="Keyingi oy">›</button></span>
          <button class="btn small" id="copyPrev">O'tgan oy rejasidan nusxa</button><button class="btn small primary" id="saveAll">Hammasini saqlash</button></div></div>
      <p class="small" style="margin:0;color:var(--text-2);max-width:90ch">Oy boshida har bir loyihaga maqsad qo'ying: reklamaga qancha sarflanadi, nechta lid va sotuv kerak, qancha pul tushishi kerak.
        Oy davomida dastur har kuni solishtiradi va <b>orqada qolsangiz — nimada kamchilik ekanini</b> aytadi: byudjet sarflanmayaptimi, lid qimmatmi, sotuv bo'limida muammomi yoki chek kichikmi. Jiddiy orqada qolsa — Telegramga xabar boradi.</p>
    </div>
    <div class="plan-cards">${projects.map((p) => {
      const auto = p.kind === 'auto';
      const pv = plans.prev?.[p.id];
      return `<section class="card plan-card" data-id="${p.id}">
        <div class="card-head"><h3><span class="dot" style="--dc:${esc(p.color || 'var(--series-1)')}"></span>${esc(p.name)} <span class="muted small">${auto ? 'avtovoronka' : "sotuv bo'limi"}</span></h3>
          ${pv?.has ? `<button type="button" class="btn small ghost" data-fill="${p.id}" title="${esc(prevName)} faktini rejaga yozib qo'yadi">↺ ${esc(prevName)} faktini qo'yish</button>` : ''}</div>
        <div class="plan-inputs">${PLAN_INPUTS.filter(([k]) => !(auto && k === 'leads')).map(([k, l]) => `<label class="field">${l}
          <input data-k="${k}" inputmode="decimal" value="${val(p.id, k)}" placeholder="—">
          <span class="hint">${pv?.has ? `${esc(prevName)}: ${k === 'budget' ? `$${Math.round(pv[k])}` : k === 'revenue' ? som(pv[k]) : Math.round(pv[k])}` : '&nbsp;'}</span></label>`).join('')}</div>
        <div class="plan-derived" data-derived></div>
      </section>`;
    }).join('') || '<div class="card empty">Avval loyiha qo\'shing</div>'}</div>
    ${projects.length ? '<div class="row mt" style="justify-content:flex-end"><button class="btn primary" data-save-all>Hammasini saqlash</button></div>' : ''}`;

  // Rejadan chiqadigan ko'rsatkichlar — reja realmi, bir qarashda
  const derive = (card) => {
    const p = projects.find((x) => String(x.id) === card.dataset.id);
    const v = Object.fromEntries(PLAN_INPUTS.map(([k]) => [k, num($(`[data-k="${k}"]`, card)?.value)]));
    const pv = plans.prev?.[p.id];
    const was = pv?.has ? planDerived(pv, p.kind === 'auto') : [];
    const now = planDerived(v, p.kind === 'auto');
    $('[data-derived]', card).innerHTML = now.some((x) => x[2] != null)
      ? `<div class="pd-head"><b>Bu reja realmi?</b><span class="muted small">Reja raqamlaridan hisoblandi${was.length ? ` va ${esc(prevName)} fakti bilan solishtirildi` : ''}</span></div>
        <table class="pd-table"><thead><tr><th></th><th class="n">Rejada</th>${was.length ? `<th class="n">${esc(prevName)}</th><th class="pd-v"></th>` : ''}</tr></thead><tbody>
        ${now.map(([l, how, x, fmt, good], i) => {
          const [cls, txt] = was.length ? planVerdict(x, was[i][2], good) : [];
          return `<tr><td><b>${l}</b><small>${how}</small>${txt && txt !== '—' ? `<span class="pill ${cls} pd-m">${txt}</span>` : ''}</td><td class="n"><b>${x == null ? '—' : fmt(x)}</b></td>
            ${was.length ? `<td class="n muted">${was[i][2] == null ? '—' : was[i][3](was[i][2])}</td><td class="n pd-v">${txt && txt !== '—' ? `<span class="pill ${cls}">${txt}</span>` : ''}</td>` : ''}</tr>`;
        }).join('')}</tbody></table>
        ${was.length ? '<p class="muted small pd-note">«Qiyin» — reja o\'tgan oydan ancha yaxshi natija kutyapti: targetolog yoki ROP bunga qanday erishishini so\'rang.</p>' : ''}`
      : '<span class="muted small">Raqamlarni yozing — rejadan 1 lid narxi, konversiya va o\'rtacha chek hisoblanadi va o\'tgan oy bilan solishtiriladi.</span>';
  };
  $$('.plan-card', body).forEach((c) => { derive(c); c.addEventListener('input', () => derive(c)); });

  body.querySelectorAll('[data-mshift]').forEach((b) => { b.onclick = () => {
    const [y, m] = planMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + Number(b.dataset.mshift), 1));
    planMonth = d.toISOString().slice(0, 7);
    renderSettings();
  }; });
  body.querySelectorAll('[data-fill]').forEach((b) => { b.onclick = () => {
    const card = b.closest('.plan-card');
    const pv = plans.prev[b.dataset.fill];
    for (const [k] of PLAN_INPUTS) { const el = $(`[data-k="${k}"]`, card); if (el) el.value = Math.round(pv[k]); }
    derive(card);
  }; });
  const saveAll = async () => {
    try {
      for (const card of $$('.plan-card', body)) {
        await api('/api/plans', { method: 'PUT', body: { month: planMonth, project_id: Number(card.dataset.id), values: Object.fromEntries($$('[data-k]', card).map((el) => [el.dataset.k, el.value])) } });
      }
      toast('Reja saqlandi');
    } catch (err) { toast(err.message, true); }
  };
  $('#saveAll').onclick = saveAll;
  body.querySelectorAll('[data-save-all]').forEach((b) => { b.onclick = saveAll; });
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
          <label class="field">Eslatma<span class="hint">hisobot yuborilmagan bo'lsa</span>${selectHtml(timeOpts(settings.reminder_time ?? '11:00'), settings.reminder_time ?? '11:00', 'name="reminder_time" id="sRem"', 'Eslatma vaqti')}</label>
          <label class="field">Avto-hisobot<span class="hint">siz yubormasangiz</span>${selectHtml(timeOpts(settings.report_time ?? '13:00'), settings.report_time ?? '13:00', 'name="report_time" id="sTime"', 'Avto-hisobot vaqti')}</label>
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
