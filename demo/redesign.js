// Perfo — yangi dizayn (faqat demo): har sahifa chizilgach yuqoriga salomlashuv,
// chap panelga «Kechagi hisobot» holati kartasini qo'shadi. Ilova kodiga tegmaydi — faqat DOM'ga qo'shimcha.
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  chev: svg('<path d="m9 6 6 6-6 6"/>'),
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function hello() {
  const h = new Date().getHours();
  return h < 11 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech';
}

function decorate() {
  const root = document.getElementById('app');
  const top = root.querySelector('.topbar');
  if (!top || top.querySelector('.greet')) return;
  const user = root.querySelector('.side-user');
  const name = (user?.childNodes[1]?.firstChild?.textContent || '').trim().split(/\s+/)[0] || '';
  const day = (top.querySelector('.crumbs > .pill')?.textContent || '').trim();
  // Bosh sahifada — salomlashuv; boshqa sahifalarda (o'z sarlavhasi bor) — qayerdaligi va bugungi sana
  const route = location.hash.split('?')[0] || '#/';
  const title = `${hello()}${name ? `, ${esc(name)}` : ''} 👋`;
  if (route === '#/') {
    const sub = day ? `Bugun ${esc(day)}` : '';
    top.insertAdjacentHTML('afterbegin', `<div class="greet"><h2>${title}</h2><p>${sub}</p></div>`);
    root.querySelector('.demo-mobile')?.insertAdjacentHTML('beforebegin', `<div class="greet-m"><h2>${title}</h2><p>${esc(day)}</p></div>`);
  } else {
    const here = (root.querySelector('.sidebar .nav a.active')?.textContent || '').replace(/!$/, '').trim();
    top.insertAdjacentHTML('afterbegin', `<div class="greet crumb"><p class="gc-path"><a href="#/">Perfo</a>${here ? `${IC.chev}<b>${esc(here)}</b>` : ''}</p><p>${day ? `Bugun ${esc(day)}` : ''}</p></div>`);
  }

  // Chap panel: o'z bo'limi holati (PM — «Kunlik hisobot», xodim — o'z bo'limi). O'z bo'limi yo'q (direktor) — «Nazorat»
  const foot = root.querySelector('.sidebar .side-foot');
  const own = root.querySelector('.sidebar .nav a.own');
  if (!foot) return;
  if (!own) {
    foot.insertAdjacentHTML('afterbegin', `<div class="side-card done"><span class="sc-ic">${IC.shield}</span><b>Nazorat</b><p>Kim qayerda kamchilik qilyapti.</p><a href="#/nazorat">Ko'rish ${IC.arrow}</a></div>`);
    return;
  }
  const label = own.textContent.replace(/!$/, '').trim();
  const daily = own.getAttribute('href') === '#/kiritish' || own.getAttribute('href') === '#/target' || own.getAttribute('href') === '#/sotuv';
  const waiting = !!own.querySelector('.badge');
  foot.insertAdjacentHTML('afterbegin', !daily
    ? `<div class="side-card"><span class="sc-ic">${IC.edit}</span><b>${esc(label)} — sizning bo'limingiz</b><p>Xarajat bo'lgan kuni kiriting.</p><a href="${own.getAttribute('href')}">Kiritish ${IC.arrow}</a></div>`
    : waiting
      ? `<div class="side-card"><span class="sc-ic">${IC.edit}</span><b>${esc(label)} kutilmoqda</b><p>Kechagi raqamlarni kiriting.</p><a href="${own.getAttribute('href')}">Kiritish ${IC.arrow}</a></div>`
      : `<div class="side-card done"><span class="sc-ic">${IC.check}</span><b>${esc(label)} yuborildi</b><a href="${own.getAttribute('href')}">Ko'rish ${IC.arrow}</a></div>`);
}

const app = document.getElementById('app');
if (app) new MutationObserver(decorate).observe(app, { childList: true });
