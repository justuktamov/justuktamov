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
    await syncDay();
    if (!state.me) return;
    const route = location.hash.split('?')[0] || '#/';
    let m;
    if ((m = route.match(/^#\/loyiha\/(\d+)$/))) await renderProject(m[1]);
    else if (route === '#/kiritish') await renderToday();
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
boot();

// Telefonga o'rnatish (PWA) — faqat haqiqiy serverda, demoda emas
if ('serviceWorker' in navigator && !window.DEMO && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
