/* Service worker du Monde Magique de Célia.
   Périmètre = le dossier où il se trouve (/celia/) : il ne touche jamais RADIA, À DEUX ni le reste du site.
   Cache dédié « celia-* ». Stratégie : on sert le cache tout de suite (hors ligne possible) et on le met à jour en arrière-plan. */
const VERSION = 'celia-v1-2026-11';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'css/activities.css', 'css/cook.css', 'css/dress.css', 'css/pets.css', 'css/play.css',
  'custom/custom.js',
  'js/core.js', 'js/art-base.js', 'js/art-girl.js', 'js/art-pets.js', 'js/art-food.js', 'js/art-color.js', 'js/art-room.js',
  'js/gallery.js', 'js/home.js', 'js/draw.js', 'js/cook.js', 'js/dress.js', 'js/makeup.js', 'js/pets.js', 'js/stories.js', 'js/learn.js', 'js/room.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('celia-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  e.respondWith(caches.open(VERSION).then((cache) => cache.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net.then((r) => r || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
  })));
});
