// Loyihalar analitikasi — mijoz ilovasi (framework'siz, hash-router)
import { state, setRouter, boot, toast, rerender, applyTheme } from './js/core.js';
import { renderDashboard } from './js/dashboard.js';
import { renderProject } from './js/project.js';
import { renderEntry } from './js/entry.js';
import { renderCampaigns } from './js/campaigns.js';
import { renderAI } from './js/ai.js';
import { renderSettings, renderProfile } from './js/settings.js';

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
    else await renderDashboard();
  } catch (e) {
    if (state.me) toast(e.message, true);
  }
}

setRouter(router);
applyTheme();
window.addEventListener('hashchange', () => { router(); window.scrollTo(0, 0); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);
boot();
