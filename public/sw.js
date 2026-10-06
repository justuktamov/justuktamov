// Ilova qobig'ini keshlaydi: internet yomon bo'lsa ham tez ochiladi. API so'rovlari doim tarmoqdan.
const CACHE = 'analytika-v38';
const SHELL = ['/', '/app.css', '/app.js', '/vendor/chart.js', '/manifest.webmanifest', '/icons/icon-192.png',
  '/js/core.js', '/js/pm.js', '/js/board.js', '/js/project.js', '/js/blocks.js', '/js/settings.js', '/js/dynamics.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Avval tarmoq (yangi versiya), bo'lmasa kesh
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
