// Loyihalar analitikasi — proekt menejer uchun (framework'siz, hash-router)
import { state, setRouter, boot, toast, applyTheme } from './js/core.js';
import { renderToday, renderArchive } from './js/pm.js';
import { renderDashboard } from './js/dashboard.js';
import { renderProject } from './js/project.js';
import { renderCampaigns } from './js/campaigns.js';
import { renderAI } from './js/ai.js';
import { renderSettings, renderProfile } from './js/settings.js';

async function router() {
  if (!state.me) return;
  const route = location.hash.split('?')[0] || '#/';
  try {
    let m;
    if ((m = route.match(/^#\/loyiha\/(\d+)$/))) await renderProject(m[1]);
    else if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/loyihalar') await renderDashboard();
    else if (route === '#/reklama') await renderCampaigns();
    else if (route === '#/ai') await renderAI();
    else if (route === '#/sozlamalar') await renderSettings();
    else if (route === '#/profil') renderProfile();
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
