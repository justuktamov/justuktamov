// Oylar bo'yicha dinamika: tushum, xarajat, foyda, lid narxi, konversiya — oyma-oy qanday o'zgaryapti
import {
  $, esc, api, state, shell, fmtN, fmtUsd, fmtUzs, fmtP, spinnerBlock, isStale, monthLabel, shortDate, addDays, chartBase, cssVar,
} from './core.js';
import { dot, signed, M_IC } from './blocks.js';

// [kalit, nom, format, yaxshi tomoni: 1 — o'sish yaxshi, -1 — kamayish yaxshi, 0 — neytral, kunlik sur'atda solishtiriladimi]
// Tartib — voronka bo'yicha: reklama → lid → sotuv → pul → natija
const ROWS = [
  ['§', 'Reklama'],
  ['spend', 'Reklama xarajati', (x) => fmtUsd(x, 0), 0, true],
  ['impressions', "Ko'rishlar", fmtN, 1, true],
  ['clicks', 'Klik', fmtN, 1, true],
  ['ctr', 'CTR (ko\'rish → klik)', (x) => fmtP(x), 1, false],
  ['§', 'Lidlar'],
  ['leads', 'Lidlar', fmtN, 1, true, 'leads'],
  ['starts', 'Bot start', fmtN, 1, true, 'auto'],
  ['qualified_share', 'Sifatli lid ulushi', (x) => fmtP(x, 0), 1, false, 'leads'],
  ['cpl', '1 lid narxi', (x) => fmtUsd(x), -1, false, 'leads'],
  ['§', 'Sotuv'],
  ['sales', 'Sotuvlar', fmtN, 1, true],
  ['conv', 'Konversiya', (x) => fmtP(x), 1, false],
  ['cac', '1 mijoz narxi', (x) => fmtUsd(x, x < 10 ? 2 : 0), -1, false],
  ['avg_check', "O'rtacha chek, so'm", fmtUzs, 0, false],
  ['repeat_share', 'Qayta sotuv ulushi', (x) => fmtP(x, 0), 1, false],
  ['§', 'Natija'],
  ['revenue', "Tushum, so'm", fmtUzs, 1, true],
  ['roas', 'ROAS', (x) => (x == null ? '—' : `${fmtN(x, 1)}×`), 1, false],
  ['net_profit', "Sof foyda, so'm", (x) => signed(x, false), 1, true],
  ['net_margin', 'Marja', (x) => fmtP(x, 0), 1, false],
];

// [kalit, tugma, birlik, nechta, sarlavha]
const VIEWS = [['wk', 'Hafta (7 kun)', 'day', 7, 'Bir hafta kunma-kun'], ['d14', 'Kunlar', 'day', 14, 'Kunma-kun'], ['w8', 'Haftalar', 'week', 8, 'Haftama-hafta'], ['m6', '6 oy', 'month', 6, 'Oyma-oy'], ['m12', '12 oy', 'month', 12, 'Oyma-oy']];
const WD = ['yak', 'dush', 'sesh', 'chor', 'pay', 'jum', 'shan'];
function periodLabel(m) {
  if (m.unit === 'day') return `${shortDate(m.from)}, ${WD[new Date(`${m.from}T00:00:00Z`).getUTCDay()]}`;
  if (m.unit === 'week') return `${shortDate(m.from)}–${shortDate(m.to)}`;
  return monthLabel(m.month);
}

// Turli uzunlikdagi oylar (va tugamagan joriy oy) kunlik sur'at bo'yicha solishtiriladi
function change(key, perDay, cur, prev) {
  const a = cur.totals[key], b = prev?.totals[key];
  if (a == null || b == null || !cur.has || !prev.has) return null;
  const x = perDay ? a / cur.days : a, y = perDay ? b / prev.days : b;
  if (key === 'net_profit' || key === 'net_margin') return y === 0 ? null : (x - y) / Math.abs(y);
  return y === 0 ? null : (x - y) / y;
}

// Sahifaga kirilganda doim «Hafta (7 kun)», joriy hafta; sahifa ichidagi almashtirishlar saqlanadi
export async function renderDynamics(inside = false) {
  state.dyn ||= { project: '', view: 'wk' };
  if (!inside) Object.assign(state.dyn, { view: 'wk', week: 0 });
  const f = state.dyn;
  const V = VIEWS.find((v) => v[0] === f.view) || VIEWS[0];
  // «Hafta (7 kun)»: dushanbadan yakshanbagacha; ‹ › bilan oldingi haftalar
  f.week ||= 0;
  const yday = state.me.reportDay;
  const monday = addDays(yday, -((new Date(`${yday}T00:00:00Z`).getUTCDay() + 6) % 7) - 7 * f.week);
  const sunday = addDays(monday, 6);
  const wkTo = sunday < yday ? sunday : yday;
  const isWk = V[0] === 'wk';
  const projects = state.projects.filter((x) => x.active);
  shell(`<div class="page-head"><div><h1>Dinamika</h1><div class="sub">${V[4]}: o'syapmizmi yoki pasayyapmizmi</div></div>
      <div class="filters">${isWk ? `<span class="month-nav wk-nav"><button type="button" class="btn small icon" data-wk="1" aria-label="Oldingi hafta">‹</button><b>${shortDate(monday)} – ${shortDate(sunday)}</b><button type="button" class="btn small icon" data-wk="-1" aria-label="Keyingi hafta" ${f.week ? '' : 'disabled'}>›</button></span>` : ''}<div class="seg" id="dynMonths">${VIEWS.map((v) => `<button data-m="${v[0]}" class="${V[0] === v[0] ? 'on' : ''}">${v[1]}</button>`).join('')}</div></div></div>
    <div class="chips" id="dynProj"><button class="chip ${!f.project ? 'on' : ''}" data-p="">Hammasi</button>${projects.map((p) => `<button class="chip ${String(f.project) === String(p.id) ? 'on' : ''}" data-p="${p.id}">${dot(p.color)}${esc(p.name)}</button>`).join('')}</div>
    <div id="dyn">${spinnerBlock()}</div>`);
  const rid = state.renderId;
  $('#dynMonths').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { f.view = b.dataset.m; renderDynamics(true); } };
  document.querySelectorAll('[data-wk]').forEach((b) => { b.onclick = () => { f.week = Math.max(0, f.week + Number(b.dataset.wk)); renderDynamics(true); }; });
  $('#dynProj').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { f.project = b.dataset.p; renderDynamics(true); } };
  let data;
  try { data = await api(`/api/monthly?${new URLSearchParams({ unit: V[2], months: isWk ? Math.round((Date.parse(wkTo) - Date.parse(monday)) / 864e5) + 1 : V[3], ...(isWk ? { to: wkTo } : {}), ...(f.project ? { project: f.project } : {}) })}`); } catch (e) { const el = $('#dyn'); if (el) el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const box = $('#dyn');
  if (!box || isStale(rid)) return;
  const months = data.filter((m, i) => m.has || data.slice(0, i).some((x) => x.has));
  if (!months.length) { box.innerHTML = '<div class="card empty">Hali ma\'lumot yo\'q — kunlik raqamlar kiritilgach davrlar shu yerda solishtiriladi.</div>'; return; }

  const auto = f.project && projects.find((p) => String(p.id) === String(f.project))?.kind === 'auto';
  // «Hammasi»da mijoz narxi va o'rtacha chek arzon avtovoronka bilan aralashib ma'nosini yo'qotadi — faqat loyiha tanlanganda
  const has = (k) => months.some((m) => m.has && m.totals[k] != null && m.totals[k] !== 0);
  const rows = ROWS.filter((r) => {
    if (r[0] === '§') return true;
    if (r[5] === 'leads' && auto) return false;
    if (r[5] === 'auto' && (!auto || !has('starts'))) return false;
    if (!f.project && ['cac', 'avg_check'].includes(r[0])) return false;
    return !['impressions', 'ctr', 'repeat_share'].includes(r[0]) || has(r[0]);
  }).filter((r, i, list) => r[0] !== '§' || (list[i + 1] && list[i + 1][0] !== '§'))
    .map((r) => (r[0] === 'conv' ? [r[0], !f.project ? 'Konversiya (lid → sotuv)' : auto ? 'Konversiya (start → xarid)' : 'Konversiya (lid → sotuv)', ...r.slice(2)] : r));
  const head = months.map((m) => `<th class="n">${esc(periodLabel(m))}${m.partial && m.unit !== 'day' ? ` <span class="muted small">· ${m.days} kun</span>` : ''}</th>`).join('');
  const cell = ([k, , fmt, good, perDay], m, i) => {
    const d = change(k, perDay, m, months[i - 1]);
    const cls = d == null || !good || Math.abs(d) < 0.03 ? '' : (d > 0) === (good > 0) ? 'pos' : 'neg';
    const v = m.totals[k];
    const dd = d != null && Math.abs(d) >= 0.005 ? `${d > 0 ? '▲' : '▼'} ${Math.abs(d) >= 10 ? '>999' : fmtN(Math.abs(d) * 100, 0)}%` : '';
    return `<td class="n"><span class="dv">${m.has && v != null ? fmt(v) : '—'}</span><span class="dd ${cls}">${dd}</span></td>`;
  };
  // Har loyiha: reklama, tushum, sof foyda — oxirgi kun/hafta/oy, oldingisiga nisbatan va kichik ustunli grafik
  function projCards() {
    const last = months.at(-1), prev = months.at(-2);
    const unitWord = V[2] === 'day' ? 'oldingi kunga' : V[2] === 'week' ? 'oldingi haftaga' : "o'tgan oyga";
    // Turli uzunlikdagi davrlar (tugamagan hafta/oy) kunlik sur'atda solishtiriladi
    const rate = (period, x) => (x == null ? null : V[2] === 'day' ? x : x / period.days);
    const chg = (m0, m1, k) => {
      const a = rate(last, m1?.[k]), b0 = prev ? rate(prev, m0?.[k]) : null;
      return a == null || b0 == null || b0 === 0 ? null : (a - b0) / Math.abs(b0);
    };
    const spark = (vals, cls) => {
      const max = Math.max(...vals.map((v) => Math.abs(v || 0)), 1);
      return `<span class="dp-spark ${cls}">${vals.map((v, i) => `<i class="${v < 0 ? 'neg' : ''} ${i === vals.length - 1 ? 'last' : ''}" style="height:${Math.max((Math.abs(v || 0) / max) * 100, v ? 6 : 2)}%" title="${esc(periodLabel(months[i]))}"></i>`).join('')}</span>`;
    };
    const ids = (f.project ? projects.filter((p) => String(p.id) === String(f.project)) : projects).map((p) => p.id);
    const cards = ids.map((id) => {
      const p = projects.find((x) => x.id === id);
      const row = (m) => m?.byProject.find((x) => x.id === id) || null;
      const L = row(last), P = row(prev);
      if (!L) return '';
      const hero = (cls, icon, label, k, fmt, good, sub) => {
        const d = chg(P, L, k);
        const dcls = d == null || !good || Math.abs(d) < 0.03 ? '' : (d > 0) === (good > 0) ? 'up' : 'down';
        return `<div class="m-hero ${cls} dp-hero"><span class="m-ic">${icon}</span><div><small>${label}</small><b>${fmt(L[k])}</b>
          <span class="m-sub">${d == null ? sub : `<span class="dp-d ${dcls}">${d > 0 ? '▲' : '▼'} ${Math.abs(d) >= 10 ? '>999' : fmtN(Math.abs(d) * 100, 0)}%</span> ${unitWord}`}</span></div>
          ${spark(months.map((m) => row(m)?.[k] ?? 0), cls)}</div>`;
      };
      const loss = (L.net_profit || 0) < 0;
      if (isWk) return weekDays(p, row);
      return `<section class="card dp-card" style="--pc:${esc(p.color || '#4c86ff')}"><div class="dp-head">${dot(p.color)}<b>${esc(p.name)}</b><span class="muted small">${isWk ? `${shortDate(monday)} – ${shortDate(sunday)}` : esc(periodLabel(last))}</span></div>
        ${`
        ${hero('ad', M_IC.ad, 'Reklama', 'spend', (x) => fmtUsd(x, 0), 0, `${fmtUzs(L.spend_uzs)} so'm`)}
        ${hero('rev', M_IC.rev, 'Tushum', 'revenue', (x) => `${fmtUzs(x)}<i>so'm</i>`, 1, `${fmtN(L.sales)} ta sotuv`)}
        ${hero(loss ? 'loss' : 'profit', loss ? M_IC.down : M_IC.up, loss ? 'Zarar' : 'Sof foyda', 'net_profit', (x) => `${signed(x, false)}<i>so'm</i>`, 1, 'barcha xarajatdan keyin')}`}
      </section>`;
    }).join('');
    return cards ? `<div class="dp-grid">${cards}</div>` : '';
  }

  // Hafta: dushanbadan yakshanbagacha 7 qator — reklama, tushum, sof foyda; pastda jami
  // Hafta: har loyiha uchun 7 ta kun kartasi (Dushanba … Yakshanba) + hafta jami; har kartada reklama, tushum, sof foyda
  function weekDays(p, row) {
    const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
    const days = DAYS.map((name, i) => {
      const d = addDays(monday, i);
      const m = months.find((x) => x.from === d);
      return { name, d, r: m?.has ? row(m) : null, future: d > yday };
    });
    const tot = { spend: 0, spend_uzs: 0, revenue: 0, net_profit: 0, sales: 0 };
    for (const x of days) if (x.r) for (const k of Object.keys(tot)) tot[k] += x.r[k] || 0;
    const delta = (cur, prevR, k, good) => {
      const a = cur?.[k], b0 = prevR?.[k];
      if (a == null || b0 == null || b0 === 0) return '';
      const d = (a - b0) / Math.abs(b0);
      const cls = !good || Math.abs(d) < 0.03 ? '' : (d > 0) === (good > 0) ? 'up' : 'down';
      return `<span class="wd-delta dp-d ${cls}">${d > 0 ? '▲' : '▼'} ${Math.abs(d) >= 10 ? '>999' : fmtN(Math.abs(d) * 100, 0)}%</span>`;
    };
    const heroes = (r, prevR) => {
      const loss = (r.net_profit || 0) < 0;
      const h = (cls, icon, label, value, sub) => `<div class="m-hero ${cls} wd-hero"><span class="m-ic">${icon}</span><div><small>${label}</small><b>${value}</b><span class="m-sub">${sub}</span></div></div>`; // ▲▼ — o'ng yuqori burchakda
      return h('ad', M_IC.ad, 'Reklama', fmtUsd(r.spend, 0), `${fmtUzs(r.spend_uzs)} so'm${delta(r, prevR, 'spend', 0)}`)
        + h('rev', M_IC.rev, 'Tushum', `${fmtUzs(r.revenue)}<i>so'm</i>`, `${fmtN(r.sales)} ta sotuv${delta(r, prevR, 'revenue', 1)}`)
        + h(loss ? 'loss' : 'profit', loss ? M_IC.down : M_IC.up, loss ? 'Zarar' : 'Sof foyda', `${signed(r.net_profit, false)}<i>so'm</i>`, `xarajatdan keyin${delta(r, prevR, 'net_profit', 1)}`);
    };
    const cards = days.map((x, i) => `<div class="wd-card ${x.r ? '' : 'empty'}"><div class="wd-head"><b>${shortDate(x.d)}</b><span>${x.name}</span></div>
      ${x.r ? heroes(x.r, days[i - 1]?.r) : `<div class="wd-none">${x.future ? 'hali kelmagan kun' : "ma'lumot kiritilmagan"}</div>`}</div>`).join('');
    return `<section class="card wd-proj" style="--pc:${esc(p.color || '#4c86ff')}"><div class="dp-head">${dot(p.color)}<b>${esc(p.name)}</b><span class="muted small">${shortDate(monday)} – ${shortDate(sunday)} · ▲▼ oldingi kunga</span></div>
      <div class="wd-grid">${cards}<div class="wd-card total"><div class="wd-head"><b>Hafta jami</b><span>${days.filter((x) => x.r).length} kun</span></div>${heroes(tot)}</div></div></section>`;
  }

  // Hammasi: har loyihaning sof foydasi oyma-oy — qaysi biri tortyapti, qaysi biri yeyapti
  const byProject = !f.project ? `<div class="card mt"><div class="card-head"><h2>Loyihalar sof foydasi, so'm</h2><span class="muted small">${V[4].toLowerCase()}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Loyiha</th>${head}</tr></thead><tbody>
    ${projects.map((p) => `<tr><td>${dot(p.color)}${esc(p.name)}</td>${months.map((m) => {
      const x = m.byProject.find((y) => y.id === p.id);
      return `<td class="n ${x?.net_profit < 0 ? 'neg' : 'pos'}">${x && (x.revenue || x.spend) ? signed(x.net_profit, false) : '—'}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div></div>` : '';

  box.innerHTML = `${projCards()}<div class="card"><div class="card-head"><h2>Tushum va barcha xarajat</h2><span class="muted small">reklama + tannarx + doimiy xarajat, so'm</span></div>
      <div class="chart-box"><canvas aria-label="Oylar bo'yicha tushum va xarajat"></canvas></div></div>
    <div class="card mt"><div class="card-head"><h2>Ko'rsatkichlar</h2><span class="muted small">▲▼ — ${V[2] === 'day' ? 'oldingi kunga' : V[2] === 'week' ? 'oldingi haftaga' : 'o\'tgan oyga'} nisbatan${V[2] === 'day' ? '' : '; summalar kunlik sur\'atda solishtiriladi'}</span></div>
      <div class="table-wrap"><table class="dyn-table"><thead><tr><th>Ko'rsatkich</th>${head}</tr></thead>
      <tbody>${rows.map((r) => (r[0] === '§' ? `<tr class="dyn-sec"><td colspan="${months.length + 1}">${r[1]}</td></tr>` : `<tr><td>${r[1]}</td>${months.map((m, i) => cell(r, m, i)).join('')}</tr>`)).join('')}</tbody></table></div>
      ${months.at(-1).partial && V[2] !== 'day' ? `<p class="muted small">${esc(periodLabel(months.at(-1)))} hali tugamagan — ${months.at(-1).days} kunlik ma'lumot.</p>` : ''}</div>
    ${byProject}`;

  if (!window.Chart) return;
  const base = chartBase();
  const costs = months.map((m) => (m.totals.revenue ?? 0) - (m.totals.net_profit ?? 0));
  state.charts.push(new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: { labels: months.map((m) => periodLabel(m) + (m.partial && m.unit !== 'day' ? '*' : '')), datasets: [
      { label: 'Tushum', data: months.map((m) => m.totals.revenue ?? 0), backgroundColor: cssVar('--series-1'), borderRadius: 4, maxBarThickness: 36 },
      { label: 'Xarajat', data: costs, backgroundColor: cssVar('--series-2'), borderRadius: 4, maxBarThickness: 36 },
    ] },
    options: { ...base,
      plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: {
        label: (c) => ` ${c.dataset.label}: ${fmtUzs(c.raw)} so'm`,
        footer: (items) => `Sof foyda: ${signed(months[items[0].dataIndex].totals.net_profit)}`,
      } } },
      scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, callback: (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(0)} mln so'm` : `${v} so'm`) } } } },
  }));
}
