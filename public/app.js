// Loyihalar analitikasi — proekt menejer uchun (framework'siz, hash-router)
import { state, setRouter, boot, toast, applyTheme, syncDay } from './js/core.js';
import { renderPart } from './js/part.js';
import { renderSellers } from './js/sellers.js';
import { renderToday, renderArchive } from './js/pm.js';
import { renderBoard } from './js/board.js';
import { renderProject } from './js/project.js';
import { renderSettings } from './js/settings.js';
import { renderDynamics } from './js/dynamics.js';
import { renderMarketing, renderFinance } from './js/expenses.js';
import { renderControl } from './js/nazorat.js';
import { renderKabinet } from './js/kabinet.js';

// Kunlik qism sahifalari: manzil → qism
const PART_OF = { '#/target': 'target', '#/sotuv': 'rop' };

async function router() {
  if (!state.me) return;
  try {
    // Hisobot sahifasida kiritilgan, lekin saqlanmagan raqamlar — boshqa sahifaga o'tishdan oldin saqlanadi.
    // Saqlanmasa va PM qolishni tanlasa — manzil ortga qaytariladi (hashchange chaqirmasdan)
    if (state.leaveGuard && !(await state.leaveGuard())) {
      if (state.shownHash != null) history.replaceState(null, '', state.shownHash || location.pathname);
      return;
    }
    state.leaveGuard = null;
    await syncDay();
    if (!state.me) return;
    const route = location.hash.split('?')[0] || '#/';
    // Kun almashdi (ilova ochiq turgan) — faqat hisobot sahifasida bo'lsa ahamiyatli
    const rolled = state.dayRolled;
    state.dayRolled = null;
    const wasReport = String(state.shownHash || '').startsWith('#/kiritish');
    const wasPart = PART_OF[route] && String(state.shownHash || '').startsWith(route);
    state.shownHash = location.hash;
    let m;
    // Hamma hamma sahifani ko'radi; kiritish — faqat ruxsat berilgan bo'limda (sahifa o'zi ko'rish rejimiga o'tadi)
    if (PART_OF[route]) { await renderPart({ part: PART_OF[route], rolled: wasPart ? rolled : null }); return; }
    if ((m = route.match(/^#\/loyiha\/(\d+)$/))) await renderProject(m[1]);
    else if (route === '#/kabinet') await renderKabinet();
    else if (route === '#/nazorat') await renderControl();
    else if (route === '#/marketing') await renderMarketing();
    else if (route === '#/moliya') await renderFinance();
    else if (route === '#/kiritish') await renderToday({ rolled: wasReport ? rolled : null });
    else if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/dinamika') await renderDynamics();
    else if (route === '#/sotuvchilar') await renderSellers();
    else if (route === '#/sozlamalar') await renderSettings();
    else await renderBoard();
  } catch (e) {
    if (state.me) toast(e.message, true);
  }
}

setRouter(router);
applyTheme();
window.addEventListener('hashchange', () => { router(); window.scrollTo(0, 0); });
// Telefonda ilova qaytib ochilganda: kun almashgan bo'lsa — sahifa yangi sana bilan qayta chiziladi
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && await syncDay(60e3)) router();
});
// Ochiq turgan sahifa ham har 5 daqiqada tekshiradi: kun almashdimi, yangi versiya chiqdimi (chiqsa — o'zi yangilanadi)
setInterval(async () => {
  if (document.visibilityState === 'visible' && await syncDay(4 * 60e3)) router();
}, 5 * 60e3);
// Sahifa yopilsa yoki yangilansa — saqlanmagan raqamlar bo'lsa brauzer ogohlantiradi
window.addEventListener('beforeunload', (e) => {
  if (state.isDirty?.()) { e.preventDefault(); e.returnValue = ''; }
});
boot();

// Telefonga o'rnatish (PWA) — faqat haqiqiy serverda, demoda emas
if ('serviceWorker' in navigator && !window.DEMO && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
