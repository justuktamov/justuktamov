// AI tahlil: tanlangan davr bo'yicha Claude xulosasi, tayyor savollar va tarix
import { $, esc, api, state, shell, filtersHtml, bindFilters, computePeriod, md, ICONS, copyText } from './core.js';

const SUGGESTED = [
  "Qaysi kursda lid ko'p, sotuv past va nima uchun?",
  'Byudjetni qaysi loyihaga oshirish, qaysisidan olish kerak?',
  "Organik oqim qaysi loyihada o'syapti?",
  'Oylik rejani bajarish uchun har bir xodim nima qilishi kerak?',
  "O'tgan davrga nisbatan nima yomonlashdi?",
];

export async function renderAI() {
  const ai = state.me.ai;
  shell(`<div class="page-head"><h1><span class="grad">AI</span> tahlil</h1>${filtersHtml()}</div>
    <div class="grid g-wide">
      <div class="stack">
        <div class="card stack">
          ${ai ? '' : window.DEMO
            ? '<div class="insight warning"><span class="ic">Diqqat</span><span>AI faqat claude.ai ichida ishlaydi</span></div>'
            : '<div class="insight warning"><span class="ic">Diqqat</span><span>AI ulanmagan: serverda <span class="code">ANTHROPIC_API_KEY</span> yo\'q</span></div>'}
          <textarea id="aiQ" rows="2" placeholder="Savol (ixtiyoriy)…" aria-label="Savol"></textarea>
          <div class="chips" id="aiChips">${SUGGESTED.map((q) => `<button type="button" class="chip">${esc(q)}</button>`).join('')}</div>
          <div class="row"><button class="btn primary" id="aiRun" ${ai ? '' : 'disabled'}>${ICONS.ai} Tahlil qilish</button>
            <span class="muted small">~1 daqiqa</span></div>
        </div>
        <div class="card" id="aiOut"><div class="muted">Savol bering yoki «Tahlil qilish»ni bosing</div></div>
      </div>
      <div class="card"><div class="card-head"><h2>Tarix</h2></div><div id="aiHist"><div class="muted">Yuklanmoqda…</div></div></div>
    </div>`);
  bindFilters(renderAI);
  $('#aiChips').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { $('#aiQ').value = c.textContent; $('#aiQ').focus(); } };
  const hist = await api('/api/ai/reports').catch(() => []);
  const showReport = (r) => {
    $('#aiOut').innerHTML = `<div class="card-head"><span class="muted small">${r.date_from} — ${r.date_to}${r.question ? ` · «${esc(r.question)}»` : ''}</span>
      <button class="btn small" id="aiCopy">${ICONS.copy} Nusxa</button></div><div class="md">${md(r.content)}</div>`;
    $('#aiCopy').onclick = () => copyText(r.content);
  };
  const hb = $('#aiHist');
  if (!hb) return;
  hb.innerHTML = hist.length ? hist.map((r, i) => `<div class="history-item" data-i="${i}" tabindex="0"><b class="small">${r.date_from} — ${r.date_to}</b>
    <div class="small" style="color:var(--text-2)">${esc(r.question || (r.kind === 'daily' ? 'Kunlik avto-tahlil' : "To'liq tahlil"))}</div>
    <div class="muted tiny">${esc(r.user_name || 'Tizim')} · ${String(r.created_at).slice(0, 16)}</div></div>`).join('') : '<div class="muted small">Hali tahlil qilinmagan.</div>';
  hb.onclick = (e) => { const i = e.target.closest('.history-item')?.dataset.i; if (i != null) showReport(hist[i]); };
  $('#aiRun').onclick = async () => {
    const { from, to } = computePeriod();
    const btn = $('#aiRun');
    btn.disabled = true;
    $('#aiOut').innerHTML = '<div class="row"><div class="spinner"></div><span class="muted">AI ma\'lumotlarni tahlil qilmoqda…</span></div>';
    try {
      const r = await api('/api/ai/analyze', { method: 'POST', body: { from, to, project: state.project || null, question: $('#aiQ').value } });
      showReport({ ...r, date_from: r.from, date_to: r.to });
    } catch (e) { $('#aiOut').innerHTML = `<div class="insight critical"><span class="ic">Xato</span><span>${esc(e.message)}</span></div>`; }
    btn.disabled = false;
  };
}
