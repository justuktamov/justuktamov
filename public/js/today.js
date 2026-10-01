// Direktor paneli: PM hisoboti, loyihalar holati, tavsiyalar, byudjet taqsimoti, kreativlar
import {
  $, esc, api, state, shell, addDays, fmtN, fmtUsd, fmtUzs, fmtP, kpi, toast, ICONS, spinnerBlock, dayLabel, refreshMe,
} from './core.js';

export const STATUS_PILL = { unprofitable: 'crit', sales_issue: 'crit', creative: 'warn', needs_leads: 'info', scale: 'lime', good: 'good', nodata: '' };
export const OWNER = { admin: 'Direktor', target: 'Target', sales: 'ROP', pm: 'PM', creative: 'Kreativ' };

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
    <div class="pstat"><span>1 lid</span><b>${fmtUsd(p.cpl)}</b></div>
    <div class="pstat"><span>Sotuv</span><b>${fmtN(p.sales)}</b></div>
  </div>`;
}

// Tavsiya: egasi + qisqa matn + tegishli nomlar (chip); to'liq tafsilot — sichqoncha ustida
export function actionsHtml(actions) {
  if (!actions.length) return '';
  return `<div class="actions">${actions.map((a) => `<div class="action" title="${esc(a.detail || '')}"><span class="who-chip">${OWNER[a.owner] || a.owner}</span>
    <span>${esc(a.text)}${(a.items || []).map((i) => ` <span class="mini">${esc(i)}</span>`).join('')}</span></div>`).join('')}</div>`;
}

function allocationHtml(list) {
  if (!list.length) return '<div class="muted small">Xarajat kiritilmagan</div>';
  return `<div class="alloc">${list.map((a) => {
    const arrow = a.change > 0.02 ? `<span class="pill lime">↑ ${fmtN(a.change * 100, 0)}%</span>` : a.change < -0.02 ? `<span class="pill crit">↓ ${fmtN(-a.change * 100, 0)}%</span>` : '<span class="pill">≈</span>';
    return `<div class="alloc-row" title="Hozir ${fmtP(a.share, 0)}, tavsiya ${fmtP(a.suggested, 0)} · ROAS ${a.roas == null ? '—' : fmtN(a.roas, 2)}">
      <div class="alloc-top"><span><span class="dot" style="background:${esc(a.color || '#4c86ff')};color:${esc(a.color || '#4c86ff')}"></span>${esc(a.name)}</span>${arrow}</div>
      <div class="alloc-bars"><div class="alloc-bar now"><i style="width:${a.share * 100}%"></i></div><div class="alloc-bar sug"><i style="width:${a.suggested * 100}%"></i></div></div>
      <div class="alloc-foot"><span>${fmtUsd(a.daily_now, 0)}/kun</span><span>→ <b style="color:var(--text)">${fmtUsd(a.daily_suggested, 0)}/kun</b></span></div></div>`;
  }).join('')}</div>`;
}

export function creativeList(list, empty) {
  if (!list.length) return `<div class="muted small">${empty}</div>`;
  return `<div class="clist">${list.map((c) => `<div class="citem" title="${esc(c.verdict_reason)}">
    <span class="dot" style="background:${esc(c.project_color || '#4c86ff')};color:${esc(c.project_color || '#4c86ff')}"></span>
    <span class="cname"><b>${esc(c.name)}</b><small>${esc(c.project_name)} · ${fmtUsd(c.spend, 0)}</small></span>
    <span class="pill ${c.verdict === 'bad' ? 'crit' : 'good'}">${esc(c.verdict_short)}</span>
    ${c.creative_url ? `<a class="circle-btn sm" href="${esc(c.creative_url)}" target="_blank" rel="noopener" aria-label="Kreativni ochish">${ICONS.play}</a>` : ''}</div>`).join('')}</div>`;
}

function banner(b) {
  const r = b.report;
  const missing = b.missing.filter((m) => !m.filled).length;
  const admin = state.me.user.role === 'admin';
  if (!r || r.status === 'draft') {
    return `<div class="card glow report-banner"><div class="state"><span class="orb wait">${ICONS.clock}</span>
      <div><h2>PM hisoboti hali yo'q</h2><div class="small muted">${missing ? `${missing} ta bo'lim kiritilmagan` : 'Raqamlar to\'liq'}</div></div></div>
      ${state.me.user.role === 'pm' ? '<a class="btn primary" href="#/hisobot">Tayyorlash</a>' : ''}</div>`;
  }
  const time = (x) => String(x || '').slice(11, 16);
  const reviewed = r.status === 'reviewed';
  return `<div class="card glow stack">
    <div class="report-banner"><div class="state"><span class="orb ${reviewed ? 'ok' : 'new'}">${reviewed ? ICONS.check : ICONS.report}</span>
      <div><h2>${esc(r.author_name)} · ${time(r.submitted_at)}</h2><div class="small muted">${reviewed ? `Ko'rib chiqildi ${time(r.reviewed_at)}` : 'Ko\'rib chiqish kutilmoqda'}</div></div></div>
      <span class="pill ${reviewed ? 'good' : 'info'}">${reviewed ? "Ko'rildi" : 'Yangi'}</span></div>
    ${r.summary ? `<div class="quote">${esc(r.summary)}</div>` : ''}
    ${r.tomorrow ? `<div class="quote"><b>Ertaga:</b> ${esc(r.tomorrow)}</div>` : ''}
    ${r.director_comment ? `<div class="quote accent"><b>Siz:</b> ${esc(r.director_comment)}</div>` : ''}
    ${r.status === 'submitted' && admin ? `<form id="reviewForm" class="row" style="align-items:stretch">
      <input id="reviewComment" placeholder="Izoh yoki topshiriq…" style="flex:1 1 260px" aria-label="Izoh">
      <button class="btn primary">${ICONS.check} Ko'rib chiqildi</button></form>` : ''}
  </div>`;
}

export async function renderToday() {
  state.reportDate ||= state.me.today;
  const date = state.reportDate;
  const go = (d) => { state.reportDate = d; renderToday(); };
  shell(`<div class="page-head"><h1><span class="grad">${date === state.me.today ? 'Bugun' : dayLabel(date)}</span></h1>${dateNav(date, go)}</div>
    <div id="today">${spinnerBlock()}</div>`);
  let b;
  try { b = await api(`/api/report?date=${date}`); } catch (e) { const el = $('#today'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#today');
  if (!box) return;
  const t = b.day.totals, d = b.day.delta;
  const notes = b.report?.project_notes || {};
  const recById = Object.fromEntries(b.rec.projects.map((p) => [p.id, p]));
  const missingByProject = {};
  for (const m of b.missing) if (!m.filled) (missingByProject[m.project_id] ||= []).push(m.role_label.split(' ')[0]);
  const planLeads = Object.fromEntries((b.plan.items || []).map((i) => [i.project_id, i.metrics.leads]));

  box.innerHTML = `
    <div class="grid g-wide">
      ${banner(b)}
      <div class="kpis two">
        ${kpi({ label: 'Target', value: fmtUsd(t.spend, 0), d: d.spend, invert: true })}
        ${kpi({ label: 'Lidlar', value: fmtN(t.leads), sub: `${fmtN(t.clicks)} klik`, d: d.leads })}
        ${kpi({ label: '1 lid', value: fmtUsd(t.cpl), d: d.cpl, invert: true })}
        ${kpi({ label: 'Sotuv', value: fmtN(t.sales), sub: fmtUzs(t.total_revenue) + " so'm", d: d.sales })}
      </div>
    </div>
    <div class="grid g-wide mt">
      <div class="pcards">${b.day.byProject.map((p) => {
        const rec = recById[p.id] || { status: 'nodata', status_label: "Ma'lumot kam", actions: [] };
        const note = notes[p.id] || {};
        const pmStatus = note.status && note.status !== rec.status ? note.status : null;
        const pl = planLeads[p.id];
        return `<article class="pcard ${rec.status === 'scale' ? 'hot' : ''}">
          <div class="pcard-top"><a class="ptitle" href="#/loyiha/${p.id}"><span class="dot" style="background:${esc(p.color || '#4c86ff')};color:${esc(p.color || '#4c86ff')}"></span>${esc(p.name)}</a>
            <div class="row"><span class="pill ${STATUS_PILL[rec.status]}">${esc(rec.status_label)}</span>${pmStatus ? `<span class="pill" title="PM bahosi">PM: ${esc(b.statuses[pmStatus])}</span>` : ''}</div></div>
          ${pstats(p)}
          ${note.comment ? `<div class="quote"><b>PM:</b> ${esc(note.comment)}</div>` : ''}
          ${actionsHtml(rec.actions)}
          <div class="pfoot">
            ${pl?.plan ? `<span class="mini-plan" title="Oylik lid rejasi ${fmtN(pl.fact)} / ${fmtN(pl.plan)}">Reja <span class="ptrack sm"><span class="pfill ${['behind', 'risk'].includes(pl.status) ? pl.status : ''}" style="width:${Math.min(pl.pct * 100, 100)}%"></span></span> ${fmtP(pl.pct, 0)}</span>` : '<span></span>'}
            ${missingByProject[p.id] ? `<span>⏳ ${esc(missingByProject[p.id].join(', '))}</span>` : `<span>${p.reported?.sales ? `ROAS ${p.roas == null ? '—' : fmtN(p.roas, 1)}` : ''}</span>`}
          </div>
        </article>`;
      }).join('') || '<div class="card empty">Loyiha yo\'q — Sozlamalarda qo\'shing</div>'}</div>
      <div class="stack">
        <div class="card"><div class="card-head"><h2>Byudjet taqsimoti</h2><span class="muted" title="7 kunlik ROAS asosida taklif">7 kun</span></div>${allocationHtml(b.rec.allocation)}</div>
        <div class="card"><div class="card-head"><h2>Yomon kreativlar</h2><a class="small" href="#/reklama">Hammasi →</a></div>${creativeList(b.rec.worstCreatives.slice(0, 4), "Yo'q 👍")}</div>
        <div class="card"><div class="card-head"><h2>Eng yaxshilari</h2></div>${creativeList(b.rec.bestCreatives.slice(0, 3), 'Hali aniqlanmadi')}</div>
      </div>
    </div>`;

  const f = $('#reviewForm');
  if (f) {
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/report/review', { method: 'POST', body: { date, comment: $('#reviewComment').value } });
        toast("Ko'rib chiqildi ✓");
        await refreshMe();
        renderToday();
      } catch (err) { toast(err.message, true); }
    };
  }
}
