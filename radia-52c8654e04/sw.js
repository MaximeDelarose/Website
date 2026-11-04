/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw1evshl';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-B5MMFmd0.js","assets/bouquet-EkXV6hof.js","assets/braceletReveal-CTw4n6tj.js","assets/career-Dq3hAVtE.js","assets/career-vO6MXP3m.css","assets/careerGame-D30Cw0M3.js","assets/careers-C_CEOu6G.js","assets/castle-4yepxF62.css","assets/castle-C31hD2O6.js","assets/cat-DUf_GopJ.js","assets/cat-DaPNr-Ui.css","assets/cat-ftMtZT8y.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-B8GEXOC-.js","assets/chocolateBox-BVJC6yCB.js","assets/chocolaterie-B24_yN0y.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-LMve5A3T.js","assets/common-g467iDRg.js","assets/creativeUi-Bu1vPKdU.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-BJYYZoHa.js","assets/decorTable-CKQ8VyPp.js","assets/drawing-DLigkoTn.js","assets/dressVerdict-CXwyviEN.js","assets/dressing-CE84E1rO.js","assets/dressing-DGWRhRO0.css","assets/family-BxoqJWAT.css","assets/family-wPZ-jgxI.js","assets/fans-BXo_QXE3.css","assets/fans-C5mtDrBY.js","assets/fashionThemes-B4WSR3Q3.js","assets/finale-DpLiAgFW.js","assets/fireworksPhoto-BxHfDbfv.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-Cx5TbLPp.js","assets/garden-CUziv0kr.js","assets/garden-DazHrlMv.css","assets/garden-cPsXVLLG.js","assets/guessMenu-BhD2dTVU.js","assets/harness-BOsrFxJS.js","assets/hub-Bo2beOBR.css","assets/hub-ZrFiQXps.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-2TE5EB6O.css","assets/index-Byb-jKVW.js","assets/index-CdDDmbOW.js","assets/index-CftlWO25.js","assets/index-DIDdC-Ut.js","assets/index-DYV5T_5q.css","assets/index-D_Bfde9M.css","assets/memoryChallenge-4TjzaL67.js","assets/menuPick-DLqupnII.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B7EGnuSo.js","assets/photoBooth-BpCa7FEm.js","assets/photoShoot-C3cOAwYl.js","assets/promiseCard-Bllrx0fg.js","assets/render-DrXvobSS.js","assets/rhythmDance-2reoVeMg.js","assets/shopTry-DiR01D6n.js","assets/singer-CX49LGi_.js","assets/spaRelax-B8-W9p_2.js","assets/styles-DDT62FZD.js","assets/ui-BvwMTK9w.js","assets/wardrobe-D-w5mbdZ.js","index.html","manifest.webmanifest"];

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
