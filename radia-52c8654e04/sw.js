/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw1xo23p';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/ambient-jb_i7nk4.js","assets/app-682zhBsw.js","assets/art-DxWyEQDb.js","assets/bouquet-DalD3Lgw.js","assets/braceletReveal-DJ5i5BW8.js","assets/career-B6zC0DZ7.js","assets/career-vO6MXP3m.css","assets/careerGame-BKzECtS8.js","assets/casino-Du7WC_WX.js","assets/castle-4yepxF62.css","assets/castle-DeHTF0Xc.js","assets/cat-BjGWRjSX.js","assets/cat-BnayV4R6.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-DTuQ1sme.js","assets/chocolateBox-C0tHezMJ.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-D62Sz_Rq.js","assets/cinemaQuiz-D82srJul.js","assets/common-BCtUV-Ut.js","assets/creativeUi-CcawNY_G.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-DtM4gbnx.js","assets/decorTable-DO2Z4Pkh.js","assets/drawing-DdxQg-bp.js","assets/dressVerdict-g97IVvKq.js","assets/dressing-DGWRhRO0.css","assets/dressing-DRTrc2zd.js","assets/family-BrnyPLg_.js","assets/family-BxoqJWAT.css","assets/fans-BXo_QXE3.css","assets/fans-DN6MnbtI.js","assets/fashionThemes-DL4qe2RR.js","assets/finale-CBcSjfXJ.js","assets/fireworksPhoto-4aHYgLDE.js","assets/frame-CF2dJrlX.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-D58bvhi2.js","assets/garden-Bm_mtbcO.js","assets/garden-CWj32w6M.js","assets/garden-DazHrlMv.css","assets/garden-iOh2Iz4e.js","assets/garden-lUZz-Mtx.js","assets/guessMenu-wZEbTCyY.js","assets/harness-NxPfortO.js","assets/hub-C0S7e9Ja.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-2TE5EB6O.css","assets/index-ByYEi50L.js","assets/index-CTpH3CBV.js","assets/index-CvmvK3P5.js","assets/index-DIjLmt2F.css","assets/index-DLHPKy0q.css","assets/index-DRGCJ-N7.js","assets/index-D_Bfde9M.css","assets/index-DbJk-iXj.css","assets/index-De8jzh_G.js","assets/index-t2X6SUyn.js","assets/memoryChallenge-DFw4_T_O.js","assets/memoryView-D65vvwSy.js","assets/menuPick-CnaX1lOC.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CVXTFr4U.js","assets/order-BldL19jG.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-ECLE0fV2.js","assets/photoBooth-CoURbjxM.js","assets/photoShoot-hrUOhhBI.js","assets/plumbing-JVhTLdxa.js","assets/promiseCard-bWPiAB5Z.js","assets/render-DMGcwgZS.js","assets/reveal-DwurHj6K.js","assets/rhythmDance-J0aM7-5-.js","assets/rng-K8SKxVUL.js","assets/scene-9LpuHOth.js","assets/shopTry-DFYjM8os.js","assets/singer-BYXA8l8b.js","assets/spaRelax-fKgnATMv.js","assets/styles-DDT62FZD.js","assets/tidy-BkZIYWtj.js","assets/ui-B2Kevz5-.js","assets/ui-B4fWrrYm.js","assets/ui-COmuh4j2.js","assets/ui-CsdqBj06.js","assets/ui-DAm9jK8s.js","assets/wardrobe-BB6SgCJf.js","assets/wires-BJJwqh6m.js","index.html","manifest.webmanifest"];

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
