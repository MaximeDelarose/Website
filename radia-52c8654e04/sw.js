/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw0z03dg';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/career-BVMij59e.js","assets/career-CDNyqT6k.css","assets/careers-CpAT2yI3.js","assets/castle-4yepxF62.css","assets/castle-BsOB9kYR.js","assets/cat-A8MwzZAN.js","assets/cat-DD54diBT.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolaterie-BLbd459v.js","assets/chocolaterie-CuqfjcNM.css","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-BXgTBKYV.js","assets/dressing-BuBjha_D.js","assets/dressing-tjvMXh7N.css","assets/family-BxoqJWAT.css","assets/family-C0KMoYjm.js","assets/fans-BXo_QXE3.css","assets/fans-Dy9W207L.js","assets/finale-pO-C89fd.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/garden-BtMObZVV.js","assets/garden-DazHrlMv.css","assets/hub-Bo2beOBR.css","assets/hub-DL3d3cQU.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-CBMxuKU9.js","assets/index-CpYqRDOu.js","assets/index-DTMmjL2T.css","assets/index-D_Bfde9M.css","assets/index-DzAudaWZ.js","assets/index-yQhkBcPI.css","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/phaser-0YPJO2g1.js","assets/wardrobe-CCbS3AZy.js","index.html","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', ...PRECACHE])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // La page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./')))
    );
    return;
  }
  // Le reste (fichiers avec empreinte, musique) : cache d'abord.
  // Les requêtes partielles (Range) de l'audio passent directement au réseau
  // si le fichier n'est pas en cache.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit && !req.headers.has('range')) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.status === 200 && !req.headers.has('range')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || Response.error());
    })
  );
});
