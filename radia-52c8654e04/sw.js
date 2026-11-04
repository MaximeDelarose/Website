/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw1csigp';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-bu4zmsA7.js","assets/bouquet-c3C-ntVn.js","assets/braceletReveal-BzAzFADi.js","assets/career-B4ZjgkFY.js","assets/career-vO6MXP3m.css","assets/careerGame-Y5PeKMXd.js","assets/careers-J6UaY7a9.js","assets/castle-4yepxF62.css","assets/castle-BZFu6_2u.js","assets/cat-CCG9Zh6r.js","assets/cat-DZ6jLt3U.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-DG4hdOBr.js","assets/chocolateBox-YZ1JxQj8.js","assets/chocolaterie-Bym2rflr.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-BGCibjYL.js","assets/common-CLup7l3w.js","assets/creativeUi-CWqJ_Gu0.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-qXOEsz3Q.js","assets/decorTable-stH8rao8.js","assets/drawing-QSjFbdtm.js","assets/dressVerdict-oKjdLeem.js","assets/dressing-D7oUOJk8.js","assets/dressing-DGWRhRO0.css","assets/family-BxoqJWAT.css","assets/family-DO780U8X.js","assets/fans-BXo_QXE3.css","assets/fans-DckU85p7.js","assets/fashionThemes-Bm_WpmPv.js","assets/finale-BmN6okUl.js","assets/fireworksPhoto-NP2VKoKU.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-DbFqkAT9.js","assets/garden-DazHrlMv.css","assets/garden-DgFKTpNa.js","assets/garden-DyxE_EnC.js","assets/guessMenu-NNGBczk-.js","assets/harness-n5fYkfTS.js","assets/hub-Bo2beOBR.css","assets/hub-DTdB4Rz4.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-2TE5EB6O.css","assets/index-BJjiIpIs.js","assets/index-CTma2u5U.js","assets/index-DYV5T_5q.css","assets/index-D_Bfde9M.css","assets/index-DnULEXe6.js","assets/index-DykR-8pG.js","assets/memoryChallenge-DaIrHQAy.js","assets/menuPick-BxcpqDW9.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-vdjO-mXr.js","assets/photoBooth-DWuO3l1n.js","assets/photoShoot-BfxgRJKW.js","assets/promiseCard-BAgP_x1k.js","assets/render-D00ujSAO.js","assets/rhythmDance-DBlfAb_j.js","assets/shopTry-BTS9K7fZ.js","assets/singer-Bt8mT3yV.js","assets/spaRelax-DbsrtBo5.js","assets/styles-DDT62FZD.js","assets/ui-D4qayRdC.js","assets/wardrobe-i1Bs5cye.js","index.html","manifest.webmanifest"];

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
