// Loyiha ma'lumoti bloklari: pul, voronka, lid sifati, sabablar, narx, xulosa, jadval, grafik, reja
import {
  esc, state, fmtN, fmtUsd, fmtUzs, fmtSom, fmtP, cssVar, chartBase, groupSeries, monthLabel, shortDate,
} from './core.js';

export const dot = (c) => `<span class="dot" style="--dc:${esc(c || 'var(--series-1)')}"></span>`;
// unit=false — so'm yonida alohida yozilganda (masalan, KPI kartasida)
export const signed = (x, unit = true) => (x == null ? '—' : `${x > 0 ? '+' : ''}${fmtUzs(x)}${unit ? " so'm" : ''}`);
const LEVEL = { critical: ['crit', 'Muhim'], warning: ['warn', 'Diqqat'], info: ['info', "Ma'lumot"], good: ['good', 'Yaxshi'] };

// Loyiha holati bitta so'z bilan: eng jiddiy xulosa bo'yicha
export function statusOf(p) {
  const worst = ['critical', 'warning'].find((l) => p.insights.some((i) => i.level === l));
  if (worst === 'critical') return ['crit', p.net_profit < 0 ? 'Zararda' : 'Muammo'];
  if (worst === 'warning') return ['warn', 'Diqqat'];
  return p.revenue || p.spend ? ['good', 'Yaxshi'] : ['', "Ma'lumot yo'q"];
}

// Reklama xarajati turlari: target, blogerlar, Telegram kanallar
export const adParts = (p) => [['Target', p.target_spend], ['Blogerlar', p.spend_blogger], ['Telegram kanallar', p.spend_posts]].filter(([, v]) => v > 0);

export function moneyBlock(p) {
  const base = Math.max(p.revenue, p.costs, 1);
  const row = (label, v, cls = '', bar = true) => `<div class="wf ${cls}"><span>${label}</span>
    ${bar ? `<i style="width:${Math.min(Math.abs(v) / base * 100, 100)}%"></i>` : '<i class="none"></i>'}<b>${fmtSom(v)}</b><em>${p.revenue ? fmtP(v / p.revenue, 0) : ''}</em></div>`;
  const noCosts = p.var_cost_pct == null && p.fixed_monthly == null;
  return `<div class="sub-card"><h3>Pul</h3>
    ${row('Tushum', p.revenue, 'in')}
    ${row('− Reklama', -p.spend_uzs)}
    ${adParts(p).length > 1 ? `<div class="ad-split">${adParts(p).map(([l, v]) => `<span>${l} <b>${fmtUsd(v, 0)}</b></span>`).join('')}</div>` : ''}
    ${row('= Foyda', p.gross_profit, p.gross_profit < 0 ? 'neg' : 'pos', false)}
    ${row(`− Tannarx${p.var_cost_pct != null ? ` (${fmtN(p.var_cost_pct)}%)` : ''}`, -p.var_cost)}
    ${row('− Doimiy xarajat', -p.fixed_cost)}
    ${row('= Sof foyda', p.net_profit, `total ${p.net_profit < 0 ? 'neg' : 'pos'}`, false)}
    ${noCosts ? '<p class="small muted">Tannarx va doimiy xarajat kiritilmagan — <a href="#/sozlamalar?tab=projects">Sozlamalarda</a> kiriting, shunda sof foyda to\'g\'ri chiqadi.</p>' : ''}
  </div>`;
}

export function funnelBlock(p) {
  const steps = p.kind === 'auto'
    ? [['Klik', p.clicks], ...(p.reported.starts ? [['Bot start', p.starts]] : []), ['Xarid', p.sales]]
    : [['Klik', p.clicks], ['Lid', p.leads], ...(p.reported.qualified ? [['Sifatli lid', p.qualified]] : []), ['Sotuv', p.sales]];
  const max = Math.max(...steps.map((x) => x[1]), 1);
  return `<div class="sub-card"><h3>Voronka</h3>
    <div class="fn">${steps.map(([l, v], i) => `<div class="fn-row"><span>${l}</span><i style="width:${Math.max(v / max * 100, v ? 1.5 : 0)}%"></i><b>${fmtN(v)}</b>
      <em>${i ? fmtP(steps[i - 1][1] ? v / steps[i - 1][1] : null) : ''}</em></div>`).join('')}</div>
    <div class="unit">
      <span><small>${p.unit_label}</small><b>${fmtUsd(p.unit_cost)}</b></span>
      ${p.kind === 'auto' ? '' : `<span><small>1 sifatli lid</small><b>${fmtUsd(p.cost_per_qualified)}</b></span>`}
      <span><small>1 mijoz narxi</small><b>${fmtUsd(p.cac)}</b></span>
      <span><small>O'rtacha chek</small><b>${fmtSom(p.avg_check)}</b></span>
    </div>
    ${funnelDiag(p)}
    ${p.kind !== 'auto' ? `<p class="small muted conv-note">Konversiya (${p.conv_label}): <b>${fmtP(p.conv)}</b>${p.conv_note ? ` — ${esc(p.conv_note)}` : ''}${p.sale_lag ? '' : '. <a href="#/sozlamalar?tab=projects">Kechikishni sozlash</a>'}</p>` : ''}
  </div>`;
}

// Voronka tashxisi: har o'tish o'z me'yori bilan — qaysi bosqichda yo'qotyapmiz va kim tuzatadi
const WHO_NAME = { target: 'Targetolog', sales: "Sotuv bo'limi" };
function funnelDiag(p) {
  const steps = (p.funnel_check?.steps || []).filter((s) => s.rate != null);
  if (!steps.length) return '';
  const st = { low: ['crit', 'Past'], ok: ['good', "Me'yorida"], high: ['good', 'Yaxshi'] };
  const w = p.funnel_check.worst;
  return `<div class="fdiag"><h4>Qayerda yo'qotyapmiz?</h4>
    ${steps.map((s) => `<div class="fd-row ${s.status || ''}"><span>${esc(s.from)} → ${esc(s.to)}</span><b>${fmtP(s.rate)}</b>
      <em>${s.norm ? `odatda ${fmtP(s.norm)}${s.norm_src === 'reja' ? ' (reja)' : ''}` : 'me\'yor hali yo\'q'}</em>${s.status ? `<span class="pill ${st[s.status][0]}">${st[s.status][1]}</span>` : '<span></span>'}</div>`).join('')}
    ${w ? `<div class="fd-verdict"><b>${esc(w.problem)}</b><span>${WHO_NAME[w.who] || ''}: ${esc(w.fix)}</span></div>`
      : steps.some((s) => s.status) ? '<p class="ok-line small">✓ Voronkaning hamma bosqichi me\'yorida</p>' : ''}
  </div>`;
}

// Kanallar: qaysi biri sifatli lid beradi, qayerda mijoz arzon
export function channelsBlock(p) {
  if (!p.channels?.length) {
    return `<div class="sub-card"><h3>Reklama kanallari</h3><p class="small muted">Kanallar bo'yicha raqam kiritilmagan. «Kechagi hisobot» → 2-qadam → «Kanallar bo'yicha» bo'limida har kanal raqamini yozing — shunda qaysi kanal sifatli lid berishi ko'rinadi.</p></div>`;
  }
  const auto = p.kind === 'auto';
  const best = (k, dir) => { const xs = p.channels.filter((c) => c[k] != null && (auto || c.leads >= 10 || k === 'roas')); if (xs.length < 2) return null; return xs.reduce((a, c) => ((dir > 0 ? c[k] > a[k] : c[k] < a[k]) ? c : a)).channel; };
  const bestQ = best('qualified_share', 1), bestCac = best('cac', -1), worstCac = best('cac', 1);
  const mark = (c, k, good, bad) => (c.channel === good ? ' class="best"' : c.channel === bad ? ' class="worst"' : '');
  return `<div class="sub-card"><h3>Reklama kanallari</h3>
    <div class="table-wrap"><table class="ch-table"><thead><tr><th>Kanal</th><th class="n">Xarajat</th><th class="n">Ulush</th>${auto ? '' : '<th class="n">Lid</th><th class="n">1 lid</th><th class="n">Sifatli</th>'}<th class="n">${auto ? 'Xarid' : 'Sotuv'}</th><th class="n">1 mijoz</th><th class="n">Tushum</th><th class="n">ROAS</th></tr></thead>
    <tbody>${p.channels.map((c) => `<tr><td><b>${esc(c.label)}</b></td><td class="n">${fmtUsd(c.spend, 0)}</td><td class="n">${fmtP(c.spend_share, 0)}</td>
      ${auto ? '' : `<td class="n">${fmtN(c.leads)}</td><td class="n">${fmtUsd(c.cpl)}</td><td class="n"><span${mark(c, 'q', bestQ)}>${fmtP(c.qualified_share, 0)}</span></td>`}
      <td class="n">${fmtN(c.sales)}</td><td class="n"><span${mark(c, 'cac', bestCac, worstCac)}>${fmtUsd(c.cac, 0)}</span></td><td class="n">${fmtSom(c.revenue)}</td><td class="n">${c.roas == null ? '—' : fmtN(c.roas, 1)}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin:8px 0 0"><span class="best">yashil</span> — eng yaxshi, <span class="worst">qizil</span> — eng qimmat kanal. Xulosa «Xulosa» blokida.</p></div>`;
}

// Ko'p pul tikilgan kun — eng foydali kunmi? ROMI = sof foyda ÷ reklama (so'mda)
export function spendDaysBlock(p) {
  const s = p.spend_days;
  const head = `<div class="card-head"><h3>Ko'p reklama = ko'p foydami?</h3><span class="muted small">oxirgi 30 kun, kunlar reytingi</span></div>`;
  if (!s) return `<div class="sub-card">${head}<p class="small muted">Oxirgi 30 kunda kamida 6 kunlik reklama va tushum kerak.</p></div>`;
  const m = s.max;
  const yes = m.place.net <= 3;
  const romi = (x) => (x == null ? '—' : fmtP(x, 0));
  const rank = (label, n) => `<div class="sd-rank ${n <= 3 ? 'good' : n > s.n / 2 ? 'bad' : 'mid'}"><small>${label}</small><b>${n}-o'rin</b></div>`;
  const inBoth = new Set(s.n >= 15 ? s.topNet.map((d) => d.date).filter((d) => s.topSpend.some((x) => x.date === d)) : []);
  const row = (d, i, withRank) => `<tr class="${d.date === m.date ? 'sd-max' : ''}">${withRank ? `<td>${i + 1}</td>` : ''}<td><b>${shortDate(d.date)}</b>${inBoth.has(d.date) ? ' <span class="sd-both" title="Ikkala ro\'yxatda ham bor">★</span>' : ''}</td>
    <td class="n">${fmtUsd(d.spend, 0)}</td>${withRank ? `<td class="n sd-rev">${fmtUzs(d.revenue)}</td>` : ''}<td class="n ${d.net < 0 ? 'neg' : 'pos'}">${signed(d.net, false)}</td><td class="n">${romi(d.romi)}</td></tr>`;
  const c = s.compare;
  const times = c.lo_spend > 0 ? c.hi_spend / c.lo_spend : null;
  const diff = c.lo_net !== 0 ? (c.hi_net - c.lo_net) / Math.abs(c.lo_net) : null;
  const verdict = diff == null || times == null ? ''
    : diff < 0 ? `${fmtN(times, 1)} barobar ko'p sarflab, sof foyda ${fmtP(-diff, 0)} <b class="neg">kam</b>.`
    : diff < times - 1 ? `${fmtN(times, 1)} barobar ko'p sarflab, sof foyda atigi ${fmtP(diff, 0)} ko'p — qo'shimcha reklama o'zini to'liq oqlamayapti.`
    : `${fmtN(times, 1)} barobar ko'p sarflab, sof foyda ${fmtP(diff, 0)} ko'p — reklamani oshirish o'zini oqlayapti.`;
  return `<div class="sub-card sd">${head}
    <p class="sd-answer"><b>${yes ? 'Ha' : "Yo'q"}.</b> Eng ko'p reklama ketgan kun — <b>${shortDate(m.date)}</b> (${fmtUsd(m.spend, 0)} = ${fmtSom(m.spend_uzs)}). ${s.n} kundan u:</p>
    <div class="sd-ranks">${rank('Tushum bo\'yicha', m.place.revenue)}${rank('Sof foyda bo\'yicha', m.place.net)}${rank('ROMI bo\'yicha', m.place.romi)}</div>
    <div class="sd-grid">
      <div><h4>Eng ko'p sof foyda bergan ${s.topNet.length} kun</h4><div class="table-wrap"><table class="sd-table"><thead><tr><th>#</th><th>Kun</th><th class="n">Reklama</th><th class="n sd-rev">Tushum</th><th class="n">Sof foyda</th><th class="n">ROMI</th></tr></thead>
        <tbody>${s.topNet.map((d, i) => row(d, i, true)).join('')}</tbody></table></div></div>
      <div><h4>Eng ko'p reklama ketgan ${s.topSpend.length} kun</h4><div class="table-wrap"><table class="sd-table"><thead><tr><th>Kun</th><th class="n">Reklama</th><th class="n">Sof foyda</th><th class="n">ROMI</th></tr></thead>
        <tbody>${s.topSpend.map((d, i) => row(d, i, false)).join('')}</tbody></table></div></div>
    </div>
    <div class="sd-sum">
      <p>Eng ko'p reklama ketgan ${c.k} kunning o'rtacha sof foydasi <b>${signed(c.hi_net)}</b>, eng kam ketgan ${c.k} kunniki (o'rtacha ${fmtUsd(c.lo_spend, 0)}) — <b>${signed(c.lo_net)}</b>. ${verdict}</p>
      <p>Eng foydali kunlarda reklama o'rtacha <b>${fmtUsd(s.best_spend, 0)}</b> bo'lgan${!yes ? ' — kunlik byudjet uchun shu mo\'ljal' : ''}.</p>
      ${p.sale_lag ? `<p class="muted small">Sotuv lid tushgandan o'rtacha ${p.sale_lag} kun keyin bo'ladi — kunlik solishtirish taxminiy.</p>` : ''}
    </div>
    <p class="muted small" style="margin:6px 0 0">ROMI = sof foyda ÷ reklama.${inBoth.size ? " ★ — ikkala ro'yxatda ham bor." : ''}</p>
  </div>`;
}

// Mijoz qiymati: 1 yangi mijoz 90 kunda qancha pul olib keladi (qayta sotuvlar bilan) va uni olib kelish narxi
export function ltvBlock(p) {
  const l = p.ltv;
  if (!l || !l.sales) return `<div class="sub-card"><h3>Mijoz qiymati (LTV)</h3><p class="small muted">90 kunda sotuv yo'q — hisoblab bo'lmaydi.</p></div>`;
  const ratio = l.ltv_cac;
  const cls = ratio == null ? '' : ratio >= 3 ? 'good' : ratio >= 1.5 ? 'warn' : 'crit';
  const word = ratio == null ? '' : ratio >= 3 ? 'yaxshi' : ratio >= 1.5 ? "o'rtacha" : 'past';
  return `<div class="sub-card"><h3>Mijoz qiymati (LTV) <span class="muted small">· 90 kun</span></h3>
    <div class="unit" style="margin:0;padding:0;border:0">
      <span><small>1 mijozdan jami pul</small><b>${fmtSom(l.ltv)}</b></span>
      <span><small>tannarxdan keyin</small><b>${fmtSom(l.ltv_profit)}</b></span>
      <span><small>1 mijozni olib kelish</small><b>${fmtSom(l.cac_uzs)}</b></span>
      <span><small>Qayta sotuv ulushi</small><b>${fmtP(l.repeat_share, 0)}</b></span>
    </div>
    ${ratio != null ? `<p class="ltv-ratio"><span class="pill ${cls}">LTV/CAC ${fmtN(ratio, 1)} — ${word}</span> 1 mijozga sarflangan reklama puli ${fmtN(ratio, 1)} barobar qaytadi (3 dan yuqori — yaxshi).</p>` : ''}
    ${l.reported ? '' : '<p class="small muted" style="margin:6px 0 0">Qayta sotuvlar kiritilmagan — LTV faqat birinchi xariddan hisoblangan.</p>'}
  </div>`;
}

// Lichkadan kelgan lidlar: Instagram direkt va Telegram admin lichkasi — soni va jami liddagi ulushi
export function sourcesBlock(p) {
  if (p.kind === 'auto') return '';
  const parts = [['Instagram direkt', p.src_ig || 0, '#d6336c'], ['Telegram lichka', p.src_tg || 0, '#1c9bd6']];
  const head = '<div class="card-head"><h3>Lichkadan kelgan lidlar</h3><span class="muted small">jami lid ichida</span></div>';
  if (!p.reported.src_ig && !p.reported.src_tg) return `<div class="sub-card">${head}<p class="small muted">Kiritilmagan. «Kechagi hisobot» → 2-qadam → «Lichkadan kelgan lidlar» jadvaliga Instagram direkt va Telegram lichkadan nechta lid kelganini yozing.</p></div>`;
  return `<div class="sub-card">${head}
    <div class="src-list">${parts.map(([l, v, c]) => `<div class="src-row"><span><i style="background:${c}"></i>${l}</span><b>${fmtN(v)}</b><em>${p.leads ? fmtP(v / p.leads, 0) : ''}</em></div>`).join('')}</div>
  </div>`;
}

export function qualityBlock(p) {
  if (!p.leads) return '';
  const parts = [['Sifatli', p.qualified, 'q-good'], ['Potensial', p.potential, 'q-mid'], ['Sifatsiz', p.unqualified, 'q-bad']];
  const known = parts.reduce((a, x) => a + x[1], 0);
  const wasted = p.cpl != null ? p.unqualified * p.cpl : null;
  return `<div class="sub-card"><h3>Lid sifati</h3>
    ${known ? `<div class="qbar" role="img" aria-label="${parts.map(([l, v]) => `${l} ${v}`).join(', ')}">${parts.filter((x) => x[1]).map(([l, v, c]) => `<i class="${c}" style="flex:${v}" title="${l}: ${fmtN(v)}"></i>`).join('')}</div>
      <div class="qlegend">${parts.map(([l, v, c]) => `<span><i class="${c}"></i>${l} <b>${fmtN(v)}</b> · ${fmtP(v / p.leads, 0)}</span>`).join('')}</div>
      ${wasted ? `<p class="small" style="margin:8px 0 0">Sifatsiz lidlarga ketgan pul: <b>${fmtUsd(wasted, 0)}</b></p>` : ''}`
      : '<p class="small muted">Sifatli / sifatsiz bo\'linmasi kiritilmagan.</p>'}
    ${reasonBars('Nega sifatsiz', p.reasons.bad)}
  </div>`;
}

export function lostBlock(p) {
  if (!p.reasons.lost.length) return '';
  return `<div class="sub-card"><h3>Nega sotib olmadi</h3>${reasonBars('', p.reasons.lost)}</div>`;
}

export function reasonBars(title, list) {
  if (!list.length) return title ? `<p class="small muted" style="margin:10px 0 0">${title}: ROP sabablarni hali aytmagan.</p>` : '';
  const max = list[0].count;
  return `${title ? `<h4>${title}</h4>` : ''}<div class="rb">${list.slice(0, 6).map((r) => `<div class="rb-row"><span>${esc(r.label)}</span><i style="width:${r.count / max * 100}%"></i><b>${fmtP(r.share, 0)}</b></div>`).join('')}</div>`;
}

const PRICE_ICON = { up: '↑', down: '↓', keep: '=', cost: '!' };
export function priceBlock(p) {
  const a = p.price;
  if (!a) return `<div class="sub-card"><h3>Narx</h3><p class="small muted">Tavsiya uchun kamida 3 ta sotuv kerak.</p></div>`;
  const cls = { up: 'good', down: 'warn', keep: 'info', cost: 'crit' }[a.verdict];
  return `<div class="sub-card"><h3>Narx</h3>
    <div class="price ${cls}"><span class="pi">${PRICE_ICON[a.verdict]}</span><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div></div>
    <div class="unit">
      <span><small>O'rtacha chek</small><b>${fmtSom(a.avg_check)}</b></span>
      <span><small>1 sotuvdan sof foyda</small><b class="${a.profit_per_sale < 0 ? 'neg' : 'pos'}">${signed(a.profit_per_sale)}</b></span>
      <span><small>Zararsizlik narxi</small><b>${fmtSom(a.breakeven)}</b></span>
    </div></div>`;
}

export function insightsBlock(p, notes = []) {
  return `<div class="sub-card"><h3>Xulosa</h3>
    ${p.insights.length ? `<div class="insights">${p.insights.map((i) => `<div class="insight ${i.level}"><span class="ic">${LEVEL[i.level][1]}</span><span>${esc(i.text)}</span></div>`).join('')}</div>` : '<p class="small muted">Muammo topilmadi.</p>'}
    ${notesFor(p, notes)}</div>`;
}

function notesFor(p, all) {
  const notes = all.filter((n) => n.project_id === p.id).slice(0, 6);
  if (!notes.length) return '';
  return `<h4>Kreativlar va izohlar</h4><div class="notes">${notes.map((n) => `<div><span class="muted">${shortDate(n.date)}</span>
    ${[['⭐', n.creative_best], ['👎', n.creative_worst], ['Targetolog:', n.note_target], ['ROP:', n.note_sales]].filter((x) => x[1]).map(([l, x]) => `<span><b>${l}</b> ${esc(x)}</span>`).join('')}</div>`).join('')}</div>`;
}

export function dailyTable(p) {
  const rows = [...p.series].reverse();
  const auto = p.kind === 'auto';
  return `<div class="table-wrap"><table><thead><tr><th>Sana</th><th class="n">Reklama</th><th class="n">Klik</th>${auto ? '<th class="n">Start</th>' : '<th class="n">Lid</th><th class="n">Sifatli</th>'}<th class="n">Sotuv</th><th class="n">Tushum</th><th class="n">Xarajat</th><th class="n">Sof foyda</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${shortDate(r.date)}</td><td class="n">${fmtUsd(r.spend, 0)}</td><td class="n">${fmtN(r.clicks)}</td>
      ${auto ? `<td class="n">${fmtN(r.starts)}</td>` : `<td class="n">${fmtN(r.leads)}</td><td class="n">${fmtN(r.qualified)}</td>`}
      <td class="n">${fmtN(r.sales)}</td><td class="n">${fmtSom(r.revenue)}</td><td class="n">${fmtSom(r.costs)}</td><td class="n ${r.net < 0 ? 'neg' : 'pos'}">${signed(r.net)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Grafik: har kungi tushum va barcha xarajat (bir o'q — ikkalasi ham so'mda) ----------
export function drawFlow(el, series, key) {
  if (!el || !window.Chart) return;
  const base = chartBase();
  const { labels, rows } = groupSeries(series, ['revenue', 'costs', 'net']);
  const mlnTick = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(0)} mln so'm` : `${v} so'm`);
  const chart = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Tushum', data: rows.map((r) => r.revenue), backgroundColor: cssVar('--series-1'), borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 18 },
      { label: 'Xarajat', data: rows.map((r) => r.costs), backgroundColor: cssVar('--series-2'), borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 18 },
    ] },
    options: { ...base,
      plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: {
        label: (c) => ` ${c.dataset.label}: ${fmtUzs(c.raw)} so'm`,
        footer: (items) => { const r = rows[items[0].dataIndex]; return `Sof foyda: ${signed(r.revenue - r.costs)}`; },
      } } },
      scales: { ...base.scales, y: { ...base.scales.y, ticks: { ...base.scales.y.ticks, callback: mlnTick } } } },
  });
  chart.$key = key;
  state.charts.push(chart);
}

// ---------- Oylik reja ----------
const PLAN_LABEL = { revenue: 'Tushum', sales: 'Sotuvlar', leads: 'Lidlar', budget: 'Reklama byudjeti' };
const PLAN_STATUS = { early: ['info', 'Oy boshi'], ahead: ['good', "Reja bo'yicha"], risk: ['warn', 'Xavf ostida'], behind: ['crit', 'Orqada'], ok: ['good', "Me'yorida"], over: ['warn', 'Tez sarflanyapti'] };
const planVal = (k, x) => (k === 'revenue' ? fmtSom(x) : k === 'budget' ? fmtUsd(x, 0) : fmtN(x));

export function planCard(plan, cls = 'card mt') {
  const head = `<div class="card-head"><h2>Oylik reja</h2><span class="muted">${monthLabel(plan.month)} · ${plan.elapsed}/${plan.days} kun</span></div>`;
  if (!plan.hasPlans) return `<div class="${cls}">${head}<div class="plan-empty"><span>Bu oyga reja kiritilmagan. Reja bo'lsa, dastur orqada qolganingizni va sababini aytib turadi.</span><a class="btn small primary" href="#/sozlamalar?tab=plans">Reja kiritish</a></div></div>`;
  const one = plan.items.length === 1 ? plan.items[0] : null;
  const src = one ? one.metrics : plan.total;
  const alerts = one ? one.alerts : [];
  const need = one ? one.need : null;
  const needLine = need && one.remaining > 0 && plan.elapsed >= 1
    ? [['leads', (x) => `${fmtN(Math.ceil(x))} lid`], ['sales', (x) => `${fmtN(Math.ceil(x))} ${one.kind === 'auto' ? 'xarid' : 'sotuv'}`], ['revenue', (x) => fmtSom(x)], ['budget', (x) => `${fmtUsd(x, 0)} reklama`]]
      .filter(([k]) => need[k] != null).map(([k, f]) => f(need[k])) : [];
  return `<div class="${cls}">${head}<div class="plans">${['revenue', 'sales', 'leads', 'budget'].filter((k) => src[k]?.plan).map((k) => {
    const m = src[k];
    const [pcls, label] = PLAN_STATUS[m.status] || ['', ''];
    const fill = ['ahead', 'ok', 'early'].includes(m.status) ? '' : m.status;
    return `<div class="pbar">
      <div class="pbar-top"><b>${PLAN_LABEL[k]}</b><span class="pbar-nums">${planVal(k, m.fact)} / ${planVal(k, m.plan)} · <b>${fmtP(m.pct, 0)}</b></span></div>
      <div class="ptrack"><div class="pfill ${fill}" style="width:${Math.min(m.pct * 100, 100)}%"></div>
        <div class="pmark" style="left:calc(${Math.min(m.expected_pct * 100, 100)}% - 1px)" title="Bugungacha kutilgan: ${fmtP(m.expected_pct, 0)}"></div></div>
      <div class="pfoot"><span class="pill ${pcls}">${label}</span><span>Prognoz: ${planVal(k, m.forecast)} (${fmtP(m.forecast_pct, 0)})</span></div>
    </div>`;
  }).join('')}</div>
  ${needLine.length ? `<p class="need-line">Rejaga yetish uchun qolgan ${one.remaining} kunda <b>kuniga</b>: ${needLine.join(' · ')}</p>` : ''}
  ${alerts.length ? `<h4>Nega orqada</h4><div class="plan-alerts">${alerts.map((a) => `<div class="insight ${a.level}"><span class="ic">${a.level === 'critical' ? 'Orqada' : 'Xavf'}</span><span>${esc(a.text)}<br><b>Nima qilish kerak:</b> ${esc(a.fix)}</span></div>`).join('')}</div>`
    : one && plan.elapsed >= 5 ? '<p class="ok-line" style="margin-top:10px">✓ Reja bo\'yicha ketyapti</p>' : ''}
</div>`;
}

