/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw17gz75';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-B3x3KP3I.js","assets/bouquet-DSYbLDeZ.js","assets/braceletReveal-CaoKhjnf.js","assets/career-CcZTzptk.js","assets/career-vO6MXP3m.css","assets/careerGame-Dt1jfGxt.js","assets/careers-ckLT8Gnr.js","assets/castle-4yepxF62.css","assets/castle-DaO3KHiE.js","assets/cat-BxoY6M27.js","assets/cat-CxZe0VUE.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-DKa5l3zy.js","assets/chocolateBox-Bucqqfeh.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-D1NabUn-.js","assets/cinemaQuiz-C-ksVzkt.js","assets/common-DD4GPwgc.js","assets/creativeUi-GN6PlLuc.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-BKjDjSQN.js","assets/decorTable-CHOFMU-0.js","assets/dressVerdict-1rO5p7iO.js","assets/dressing-DGWRhRO0.css","assets/dressing-XgpCWrJS.js","assets/family-BxoqJWAT.css","assets/family-DrutB4A0.js","assets/fans-BXo_QXE3.css","assets/fans-DSmwgUBZ.js","assets/fashionThemes-BO5Z0Y0h.js","assets/finale-BBRco10-.js","assets/fireworksPhoto-D5vax7Xq.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-DrStyiA1.js","assets/garden-Cf8d7nNd.js","assets/garden-DXKd6z47.js","assets/garden-DazHrlMv.css","assets/guessMenu-D44ucOfF.js","assets/harness-oLe9xifr.js","assets/hub-BfdBcYzT.js","assets/hub-Bo2beOBR.css","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-BbYmcKBg.js","assets/index-CEflDscw.js","assets/index-D4z29Y3C.js","assets/index-D_Bfde9M.css","assets/index-skP-4rMN.css","assets/index-sqxf5r5R.js","assets/index-yQhkBcPI.css","assets/memoryChallenge-69RUycOZ.js","assets/menuPick-uynKWBuO.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BrZiPkxD.js","assets/photoBooth-BBxurRzF.js","assets/photoShoot-DpKwjte2.js","assets/promiseCard-C-E5v8rD.js","assets/render-Bs_bOsYU.js","assets/rhythmDance-BdTSLXzK.js","assets/shopTry-Bn3ex6Vp.js","assets/singer-Dk8GUVfE.js","assets/spaRelax-DmRXs_Ym.js","assets/styles-DDT62FZD.js","assets/ui-B2ATCmHG.js","assets/wardrobe-D6pCNBxG.js","index.html","manifest.webmanifest"];

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
