// Loyihalar analitikasi — proekt menejer uchun (framework'siz, hash-router)
import { state, setRouter, boot, toast, applyTheme } from './js/core.js';
import { renderToday, renderArchive } from './js/pm.js';
import { renderStats } from './js/stats.js';
import { renderSettings } from './js/settings.js';

async function router() {
  if (!state.me) return;
  const route = location.hash.split('?')[0] || '#/';
  try {
    if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/loyihalar') await renderStats();
    else if (route === '#/sozlamalar') await renderSettings();
    else await renderToday();
  } catch (e) {
    if (state.me) toast(e.message, true);
  }
}

setRouter(router);
applyTheme();
window.addEventListener('hashchange', () => { router(); window.scrollTo(0, 0); });
boot();

// Telefonga o'rnatish (PWA) — faqat haqiqiy serverda, demoda emas
if ('serviceWorker' in navigator && !window.DEMO && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
