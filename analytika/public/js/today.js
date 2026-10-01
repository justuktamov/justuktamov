// Direktor paneli: PM hisoboti holati, loyihalar holati, tavsiyalar, byudjet taqsimoti, kreativlar
import {
  $, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtUzs, fmtP, kpi, toast, ICONS, spinnerBlock, dayLabel, refreshMe,
} from './core.js';

export const STATUS_PILL = { unprofitable: 'crit', sales_issue: 'crit', creative: 'warn', needs_leads: 'info', scale: 'lime', good: 'good', nodata: '' };
export const OWNER = { admin: 'Direktor', target: 'Targetolog', sales: 'ROP', pm: 'PM', creative: 'Kreativchi' };

export function dateNav(date, onChange) {
  const isToday = date === state.me.today;
  setTimeout(() => {
    $('#dPrev').onclick = () => onChange(addDays(date, -1));
    $('#dNext').onclick = () => { if (!isToday) onChange(addDays(date, 1)); };
    $('#dPick').onchange = (e) => { if (e.target.value && e.target.value <= state.me.today) onChange(e.target.value); };
  });
  return `<div class="filters"><button class="btn small icon" id="dPrev" aria-label="Oldingi kun">←</button>
    <input type="date" id="dPick" value="${date}" max="${state.me.today}" aria-label="Sana">
    <button class="btn small icon" id="dNext" aria-label="Keyingi kun" ${isToday ? 'disabled' : ''}>→</button></div>`;
}

export function pstats(p) {
  return `<div class="pstats">
    <div class="pstat"><span>Target</span><b>${fmtUsd(p.spend, 0)}</b></div>
    <div class="pstat"><span>Klik</span><b>${fmtN(p.clicks)}</b></div>
    <div class="pstat"><span>Lid</span><b>${fmtN(p.leads)}</b></div>
    <div class="pstat"><span>Lid narxi</span><b>${fmtUsd(p.cpl)}</b></div>
    <div class="pstat"><span>Sotuv</span><b>${fmtN(p.sales)}</b></div>
  </div>`;
}

export function actionsHtml(actions) {
  if (!actions.length) return '<div class="muted small">Ko\'rsatkichlar me\'yorida — hozircha harakat talab qilinmaydi.</div>';
  return `<div class="actions">${actions.map((a) => `<div class="action"><span class="who-chip">${OWNER[a.owner] || a.owner}</span><span>${esc(a.text)}</span></div>`).join('')}</div>`;
}

function allocationHtml(list) {
  if (!list.length) return '<div class="muted small">Reklama xarajati kiritilmagan.</div>';
  return `<div class="alloc">${list.map((a) => {
    const arrow = a.change > 0.02 ? `<span class="pill lime">↑ +${fmtN(a.change * 100, 0)} p.p.</span>` : a.change < -0.02 ? `<span class="pill crit">↓ ${fmtN(a.change * 100, 0)} p.p.</span>` : '<span class="pill">≈ shu holicha</span>';
    return `<div class="alloc-row"><div class="alloc-top"><span><span class="dot" style="background:${esc(a.color || '#4c86ff')};color:${esc(a.color || '#4c86ff')}"></span>${esc(a.name)}</span>${arrow}</div>
      <div class="alloc-bars"><div class="alloc-bar now" title="Hozirgi ulush ${fmtP(a.share, 0)}"><i style="width:${a.share * 100}%"></i></div>
      <div class="alloc-bar sug" title="Tavsiya ${fmtP(a.suggested, 0)}"><i style="width:${a.suggested * 100}%"></i></div></div>
      <div class="alloc-foot"><span>hozir ${fmtP(a.share, 0)} · ${fmtUsd(a.daily_now, 0)}/kun</span><span>tavsiya ${fmtP(a.suggested, 0)} · <b style="color:var(--text)">${fmtUsd(a.daily_suggested, 0)}/kun</b></span></div></div>`;
  }).join('')}</div>
  <div class="legend"><span><i style="background:var(--text-3)"></i>Hozirgi ulush</span><span><i style="background:var(--accent)"></i>Tavsiya (ROAS bo'yicha)</span></div>`;
}

export function creativeList(list, empty) {
  if (!list.length) return `<div class="muted small">${empty}</div>`;
  return `<div class="actions">${list.map((c) => `<div class="action"><span class="dot" style="background:${esc(c.project_color || '#4c86ff')};color:${esc(c.project_color || '#4c86ff')};margin-top:6px"></span>
    <span><b style="color:var(--text)">${esc(c.name)}</b> · ${esc(c.project_name)}${c.creative_label ? ` · ${esc(c.creative_label)}` : ''}<br><span class="tiny">${esc(c.verdict_reason)} · ${fmtUsd(c.spend, 0)} sarflangan</span>
    ${c.creative_url ? ` <a class="tiny" href="${esc(c.creative_url)}" target="_blank" rel="noopener">ko'rish ↗</a>` : ''}</span></div>`).join('')}</div>`;
}

function banner(b) {
  const r = b.report;
  const missing = b.missing.filter((m) => !m.filled).length;
  const admin = state.me.user.role === 'admin';
  if (!r || r.status === 'draft') {
    return `<div class="card glow report-banner"><div class="state"><span class="orb wait">${ICONS.clock}</span>
      <div><h2>PM hisoboti hali yuborilmagan</h2><div class="small muted">${r ? `Qoralama: ${esc(r.author_name || '')}` : 'Proekt menejer kun oxirida yuboradi'} · kiritilmagan bo'limlar: ${missing}. Quyidagi raqamlar xodimlar kiritganidan avtomatik yig'ilgan.</div></div></div>
      ${state.me.user.role === 'pm' ? '<a class="btn primary" href="#/hisobot">Hisobotni tayyorlash</a>' : ''}</div>`;
  }
  const head = r.status === 'reviewed'
    ? `<span class="orb ok">${ICONS.check}</span><div><h2>Ko'rib chiqildi</h2><div class="small muted">${esc(r.author_name)} ${String(r.submitted_at).slice(11, 16)} da yubordi · ${esc(r.reviewer_name || '')} ${String(r.reviewed_at).slice(11, 16)} da ko'rdi</div></div>`
    : `<span class="orb new">${ICONS.report}</span><div><h2>${esc(r.author_name)} hisobot yubordi</h2><div class="small muted">${String(r.submitted_at).slice(11, 16)} · direktor ko'rib chiqishi kutilmoqda</div></div>`;
  return `<div class="card glow stack">
    <div class="report-banner"><div class="state">${head}</div>${r.status === 'submitted' && admin ? '' : ''}</div>
    ${r.summary ? `<div class="quote"><b>Xulosa:</b> ${esc(r.summary)}</div>` : ''}
    ${r.tomorrow ? `<div class="quote"><b>Ertaga:</b> ${esc(r.tomorrow)}</div>` : ''}
    ${r.director_comment ? `<div class="quote" style="border-color:var(--accent)"><b>Direktor:</b> ${esc(r.director_comment)}</div>` : ''}
    ${r.status === 'submitted' && admin ? `<form id="reviewForm" class="row" style="align-items:stretch">
      <input id="reviewComment" placeholder="Izoh yoki topshiriq (ixtiyoriy): masalan, IELTS byudjetini 20% oshiringlar" style="flex:1 1 320px">
      <button class="btn primary">${ICONS.check} Ko'rib chiqildi</button></form>` : ''}
  </div>`;
}

export async function renderToday() {
  state.reportDate ||= state.me.today;
  const date = state.reportDate;
  const go = (d) => { state.reportDate = d; renderToday(); };
  shell(`<div class="page-head"><div><h1><span class="grad">${date === state.me.today ? 'Bugun' : dayLabel(date)}</span> loyihalarda nima bo'ldi?</h1>
      <div class="sub">Proekt menejer hisoboti, har bir loyihaning holati va qayerga ko'proq pul tikish kerakligi — bir sahifada.</div></div>
      ${dateNav(date, go)}</div>
    <div id="today">${spinnerBlock()}</div>`);
  let b;
  try { b = await api(`/api/report?date=${date}`); } catch (e) { const el = $('#today'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#today');
  if (!box) return;
  const t = b.day.totals, d = b.day.delta;
  const notes = b.report?.project_notes || {};
  const recById = Object.fromEntries(b.rec.projects.map((p) => [p.id, p]));
  const missingByProject = {};
  for (const m of b.missing) if (!m.filled) (missingByProject[m.project_id] ||= []).push(m.role_label);
  const planLeads = Object.fromEntries((b.plan.items || []).map((i) => [i.project_id, i.metrics.leads]));

  box.innerHTML = `
    ${banner(b)}
    <div class="kpis six mt">
      ${kpi({ label: 'Target xarajati', value: fmtUsd(t.spend, 0), sub: `${fmtUzs(t.spend_uzs)} so'm`, d: d.spend, invert: true })}
      ${kpi({ label: 'Kliklar', value: fmtN(t.clicks), sub: `klik ${fmtUsd(t.cpc, 3)}`, d: d.clicks })}
      ${kpi({ label: 'Lidlar', value: fmtN(t.leads), sub: `start → lid ${fmtP(t.start_to_lead)}`, d: d.leads })}
      ${kpi({ label: 'Lid narxi', value: fmtUsd(t.cpl), sub: 'kechagiga nisbatan', d: d.cpl, invert: true })}
      ${kpi({ label: 'Sotuvlar', value: fmtN(t.sales), sub: `lid → sotuv ${fmtP(t.lead_to_sale)}`, d: d.sales })}
      ${kpi({ label: 'Tushum', value: fmtUzs(t.total_revenue), unit: "so'm", sub: t.roas == null ? '' : `ROAS ${fmtN(t.roas, 2)}`, d: d.total_revenue })}
    </div>
    <div class="grid g-wide">
      <div class="stack">
        <div class="card-head" style="margin:4px 0 -4px"><h2>Loyihalar holati</h2><span class="muted">raqamlar — ${date === state.me.today ? 'bugun' : date}; tavsiyalar — so'nggi 7 kun asosida</span></div>
        <div class="pcards">${b.day.byProject.map((p) => {
          const rec = recById[p.id] || { status: 'nodata', status_label: "Ma'lumot kam", actions: [] };
          const note = notes[p.id] || {};
          const pmStatus = note.status && note.status !== rec.status ? note.status : null;
          const pl = planLeads[p.id];
          return `<article class="pcard ${rec.status === 'scale' ? 'hot' : ''}">
            <div class="pcard-top"><div><h3><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</h3>
              <div class="meta">${p.reported?.sales ? `ROAS ${p.roas == null ? '—' : fmtN(p.roas, 2)} · lid → sotuv ${fmtP(p.lead_to_sale)}` : 'sotuv hali kiritilmagan'} · CTR ${fmtP(p.ctr, 2)}</div></div>
              <div class="row"><span class="pill ${STATUS_PILL[rec.status]}">${esc(rec.status_label)}</span>${pmStatus ? `<span class="pill" title="PM bahosi">PM: ${esc(b.statuses[pmStatus])}</span>` : ''}
              <a class="btn small ghost" href="#/loyiha/${p.id}">Batafsil →</a></div></div>
            ${pstats(p)}
            ${note.comment ? `<div class="quote"><b>PM:</b> ${esc(note.comment)}</div>` : ''}
            ${actionsHtml(rec.actions)}
            ${pl?.plan ? `<div class="pbar"><div class="pbar-top"><span class="small">Oylik lid rejasi</span><span class="pbar-nums">${fmtN(pl.fact)} / ${fmtN(pl.plan)} · <b>${fmtP(pl.pct, 0)}</b></span></div>
              <div class="ptrack"><div class="pfill ${['behind', 'risk'].includes(pl.status) ? pl.status : ''}" style="width:${Math.min(pl.pct * 100, 100)}%"></div><div class="pmark" style="left:calc(${Math.min(pl.expected_pct * 100, 100)}% - 1px)"></div></div></div>` : ''}
            ${missingByProject[p.id] ? `<div class="tiny muted">⏳ Kiritilmagan: ${esc(missingByProject[p.id].join(', '))}</div>` : ''}
          </article>`;
        }).join('') || '<div class="card empty">Loyihalar yo\'q. Sozlamalarda loyiha qo\'shing.</div>'}</div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><h2>Byudjetni qayta taqsimlash</h2><span class="muted">7 kun, ROAS bo'yicha</span></div>${allocationHtml(b.rec.allocation)}
          <p class="tiny muted" style="margin:12px 0 0">Samarali loyiha (ROAS yuqori) ulushi oshadi, zarar qilayotganiniki kamayadi. Bu taklif — yakuniy qaror direktorniki.</p></div>
        <div class="card"><div class="card-head"><h2>Ishlamayotgan kreativlar</h2><a class="small" href="#/reklama">Hammasi →</a></div>${creativeList(b.rec.worstCreatives, "Yomon natijali kreativ yo'q.")}</div>
        <div class="card"><div class="card-head"><h2>Eng yaxshi kreativlar</h2></div>${creativeList(b.rec.bestCreatives, 'Hali aniqlanmadi.')}</div>
      </div>
    </div>`;

  const f = $('#reviewForm');
  if (f) {
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/report/review', { method: 'POST', body: { date, comment: $('#reviewComment').value } });
        toast("Hisobot ko'rib chiqildi");
        await refreshMe();
        renderToday();
      } catch (err) { toast(err.message, true); }
    };
  }
}
