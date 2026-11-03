/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw16wo1d';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-BI-_D0n_.js","assets/bouquet-lmpSMOT2.js","assets/braceletReveal-CP1Qr62o.js","assets/career-CciyyE4B.js","assets/career-vO6MXP3m.css","assets/careerGame-B1Hd_exA.js","assets/careers-B9UYYz_S.js","assets/castle-4yepxF62.css","assets/castle-DW3bfNeX.js","assets/cat-BRkxUGWk.js","assets/cat-BcWJw94B.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-7XHxqtAW.js","assets/chocolateBox-DVnXtDgf.js","assets/chocolaterie-BAZglqk8.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-B_Jt2dcd.js","assets/common-U2KU0XqJ.js","assets/creativeUi-Du0C7H9-.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-DevyvR3U.js","assets/decorTable-JkcYsMDx.js","assets/dressVerdict-CoPjG2V4.js","assets/dressing-B5Opgimb.js","assets/dressing-D28yNteH.css","assets/family-BxoqJWAT.css","assets/family-CRGFvSbi.js","assets/fans-BXo_QXE3.css","assets/fans-L8sSU7FJ.js","assets/fashionThemes-BH_RfH2h.js","assets/finale-B-TTb4qH.js","assets/fireworksPhoto-DpSBpVVO.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-CdcR2R5I.js","assets/garden-BV5HYzFb.js","assets/garden-DMGFP4vI.js","assets/garden-DazHrlMv.css","assets/guessMenu-rFmmzcWg.js","assets/harness-CsiplN_C.js","assets/hub-Bo2beOBR.css","assets/hub-CI1GwfqZ.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-Av0kM93S.js","assets/index-BCkYH_dp.js","assets/index-CdLLqb7L.js","assets/index-CwUyy9Lw.js","assets/index-D_Bfde9M.css","assets/index-skP-4rMN.css","assets/index-yQhkBcPI.css","assets/memoryChallenge-DYB-FiS2.js","assets/menuPick-cqiwEFpQ.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-_3W1-Nn2.js","assets/photoBooth-BZV16J2n.js","assets/photoShoot-D9EifY0v.js","assets/promiseCard-CaCoX8QM.js","assets/render-Bim9VwAV.js","assets/rhythmDance-HyOsGs8q.js","assets/shopTry-DmcKS8-E.js","assets/singer-jV3HV75K.js","assets/spaRelax-BpYs3j9O.js","assets/styles-DDT62FZD.js","assets/ui-62pn9nHQ.js","assets/wardrobe-DSmG4kge.js","index.html","manifest.webmanifest"];

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
