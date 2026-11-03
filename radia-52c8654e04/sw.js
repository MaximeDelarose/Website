/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw100my4';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/career-BDXKLq-2.js","assets/career-vO6MXP3m.css","assets/careers-RKXWJAXX.js","assets/castle-4yepxF62.css","assets/castle-ChvL741E.js","assets/cat-8mfJR3yu.js","assets/cat-CwxMVj-4.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-NLa6xqau.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-KYhTGwi7.js","assets/dressing-C7gIiTPH.js","assets/dressing-tjvMXh7N.css","assets/family-BOtnxNTj.js","assets/family-BxoqJWAT.css","assets/fans-BXo_QXE3.css","assets/fans-CVdqP2b4.js","assets/finale-BeNsYIEI.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/garden-BGb3gTKk.js","assets/garden-DazHrlMv.css","assets/hub-B_jjie7B.js","assets/hub-Bo2beOBR.css","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-BZ4zC28P.js","assets/index-DPHlKINZ.js","assets/index-DTMmjL2T.css","assets/index-D_Bfde9M.css","assets/index-c3128t1d.js","assets/index-yQhkBcPI.css","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/phaser-0YPJO2g1.js","index.html","manifest.webmanifest"];

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
