// Loyihalar analitikasi — mijoz ilovasi (framework'siz, hash-router)
import { state, setRouter, boot, toast, rerender, applyTheme, homeRoute } from './js/core.js';
import { renderDashboard } from './js/dashboard.js';
import { renderProject } from './js/project.js';
import { renderEntry } from './js/entry.js';
import { renderCampaigns } from './js/campaigns.js';
import { renderAI } from './js/ai.js';
import { renderSettings, renderProfile } from './js/settings.js';
import { renderToday } from './js/today.js';
import { renderReport, renderArchive, renderTeam } from './js/report.js';
import { renderTasks } from './js/tasks.js';
import { renderProfit } from './js/profit.js';

async function router() {
  if (!state.me) return;
  const route = location.hash.split('?')[0] || '#/';
  try {
    let m;
    if ((m = route.match(/^#\/loyiha\/(\d+)$/))) await renderProject(m[1]);
    else if (route === '#/kiritish') await renderEntry();
    else if (route === '#/reklama') await renderCampaigns();
    else if (route === '#/ai') await renderAI();
    else if (route === '#/sozlamalar') await renderSettings();
    else if (route === '#/profil') renderProfile();
    else if (route === '#/analitika') await renderDashboard();
    else if (route === '#/hisobot') await renderReport();
    else if (route === '#/hisobotlar') await renderArchive();
    else if (route === '#/jamoa') await renderTeam();
    else if (route === '#/vazifalar') await renderTasks();
    else if (route === '#/foyda') await renderProfit();
    else if (state.me.user.role === 'admin' || state.me.user.role === 'pm') await renderToday();
    else location.hash = homeRoute(state.me.user.role);
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
