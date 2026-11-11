/* Service worker du Monde Magique de Célia.
   Périmètre = le dossier où il se trouve (/celia/) : il ne touche jamais RADIA, À DEUX ni le reste du site.
   Cache dédié « celia-* ». Stratégie : on sert le cache tout de suite (hors ligne possible) et on le met à jour en arrière-plan. */
const VERSION = 'celia-v5-2026-11';
const AUDIO = 'celia-audio-v1';
const MUSIC = ['audio/musique-1.mp3', 'audio/musique-2.mp3', 'audio/musique-3.mp3', 'audio/musique-4.mp3'];
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'css/activities.css', 'css/cook.css', 'css/dress.css', 'css/pets.css', 'css/play.css', 'css/ux.css',
  'custom/custom.js',
  'js/core.js', 'js/fr.js', 'js/music.js', 'js/voice.js', 'js/art-base.js', 'js/art-girl.js', 'js/art-pets.js', 'js/art-food.js', 'js/art-color.js', 'js/art-room.js',
  'js/gallery.js', 'js/home.js', 'js/draw.js', 'js/cook.js', 'js/dress.js', 'js/makeup.js', 'js/pets.js', 'js/stories.js', 'js/learn.js', 'js/room.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
  /* musique : mise en cache en arrière-plan (sans bloquer l'installation) pour jouer hors ligne */
  e.waitUntil(caches.open(AUDIO).then((c) => Promise.all(MUSIC.map((f) => c.match(f).then((h) => h || c.add(f).catch(() => { }))))).catch(() => { }));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('celia-') && k !== VERSION && k !== AUDIO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  /* audio : les balises <audio> demandent des morceaux (Range) ; on les sert depuis le fichier complet en cache */
  if (/\/(audio|voix)\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then(async (cache) => {
      let full = await cache.match(url.pathname);
      if (!full) { try { const r = await fetch(url.pathname); if (r.ok) { cache.put(url.pathname, r.clone()); full = r; } else return r; } catch (err) { return Response.error(); } }
      const range = req.headers.get('range');
      if (!range) return full;
      const buf = await full.clone().arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    }));
    return;
  }
  /* Fichiers du jeu : RÉSEAU D'ABORD (toujours la dernière version quand l'iPhone est en ligne), cache en secours (hors ligne ou réseau lent).
     C'est ce qui permet la mise à jour automatique de l'appli installée sur l'écran d'accueil, sans rien changer à la main. */
  e.respondWith(caches.open(VERSION).then((cache) => {
    const fresh = fetch(req, { cache: 'no-cache' }).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 4000));
    return Promise.race([fresh, timeout]).catch(() => cache.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? cache.match('index.html') : null) || fresh.catch(() => Response.error())));
  }));
});
