// Loyihalar analitikasi — proekt menejer uchun (framework'siz, hash-router)
import { state, setRouter, boot, toast, applyTheme } from './js/core.js';
import { renderToday, renderArchive } from './js/pm.js';
import { renderOverview } from './js/overview.js';
import { renderSettings } from './js/settings.js';

async function router() {
  if (!state.me) return;
  const route = location.hash.split('?')[0] || '#/';
  try {
    if (route === '#/kiritish') await renderToday();
    else if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/sozlamalar') await renderSettings();
    else await renderOverview();
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
