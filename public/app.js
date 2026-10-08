// Loyihalar analitikasi — proekt menejer uchun (framework'siz, hash-router)
import { state, setRouter, boot, toast, applyTheme, syncDay } from './js/core.js';
import { renderToday, renderArchive } from './js/pm.js';
import { renderBoard } from './js/board.js';
import { renderProject } from './js/project.js';
import { renderSettings } from './js/settings.js';
import { renderDynamics } from './js/dynamics.js';

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
    state.shownHash = location.hash;
    let m;
    if ((m = route.match(/^#\/loyiha\/(\d+)$/))) await renderProject(m[1]);
    else if (route === '#/kiritish') await renderToday({ rolled: wasReport ? rolled : null });
    else if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/dinamika') await renderDynamics();
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
// Sahifa yopilsa yoki yangilansa — saqlanmagan raqamlar bo'lsa brauzer ogohlantiradi
window.addEventListener('beforeunload', (e) => {
  if (state.isDirty?.()) { e.preventDefault(); e.returnValue = ''; }
});
boot();

// Telefonga o'rnatish (PWA) — faqat haqiqiy serverda, demoda emas
if ('serviceWorker' in navigator && !window.DEMO && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
