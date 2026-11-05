/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3aewfg-82e4bd9';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-_AKOFFB6.js","assets/app-D-yxCVhj.js","assets/art-CBXQ1Ax_.js","assets/art-CGsgvPp0.js","assets/badge-C1vgfBir.js","assets/bouquet-CjaT1Ffj.js","assets/braceletReveal-BBCeiG5k.js","assets/career-BJUn4BWR.js","assets/career-D4Kjo_a9.css","assets/careerGame-QhlZz0F_.js","assets/casino-RZam3pyV.js","assets/castle-BMvovhX-.css","assets/castle-CM0d4w3y.js","assets/cat-CQnHLp5T.js","assets/cat-DaPNr-Ui.css","assets/cat-DbSoMlmc.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-C3m5ONpe.js","assets/chocolateBox-BALW6YS1.js","assets/chocolaterie-Bw97jpUO.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-D1bnmqP5.js","assets/common-LKszF65L.js","assets/creativeUi-BuLFUl42.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CxS49MXD.js","assets/decorTable-iTmp4Jlt.js","assets/demo-DFhvYdh9.js","assets/drawing-CqyucLOb.js","assets/dressVerdict-BX-2wS0t.js","assets/dressing-CClmmcUT.js","assets/dressing-DRvvLtmc.css","assets/family-BaphC6Ku.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-CFj1L1BW.js","assets/fashionThemes-DNKDrA2J.js","assets/finale-BzJKY5ZS.js","assets/fireworksPhoto-CIWMGJld.js","assets/frame-Cpzfu5s_.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BpY21iO3.js","assets/gallery--DrP66G6.js","assets/garden-BEhutZ4k.js","assets/garden-D5dRLoaU.js","assets/garden-DazHrlMv.css","assets/garden-X4dy1ei-.js","assets/garden-iay17-Ba.js","assets/giftArt-DmWt5OVS.js","assets/guessMenu-BsZksEAK.js","assets/harness-BRei7mX9.js","assets/host-Q7ArDajV.js","assets/hub-C4LbLexs.css","assets/hub-CEcT-r7W.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-CPnwgizL.js","assets/index-CpHcQ20V.js","assets/index-CuhE9dDf.js","assets/index-D2iqKg2L.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dq4JjIUH.js","assets/index-YOA14a5P.js","assets/index-ig1dOV33.css","assets/index-vt9AcEY_.js","assets/kit-DOzxEsJ8.css","assets/kit-DPbEgFMC.js","assets/memoryChallenge-lM_ShGHd.js","assets/memoryView-BZ8xyw6X.js","assets/menuPick-DLqcMqXH.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-D0cXvy6g.js","assets/order-D6RxW615.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DrYm555a.js","assets/photoBooth-eTi8DWwz.js","assets/photoShoot-r5aTi3oq.js","assets/plumbing-DEL114Ym.js","assets/promiseCard-BUGQeWeU.js","assets/render-BjsSghoY.js","assets/render-DwEWpmbY.js","assets/reveal-DenYD3Q1.js","assets/rhythmDance-e_wcItF0.js","assets/rng-LLIeWRGS.js","assets/runtime-FnJzRZ8I.js","assets/scene-C7nCHeHi.css","assets/scene-CO3TBky_.js","assets/scene-ChOySuYf.js","assets/scenes-CEawq0cP.js","assets/session-Dqnt8wAY.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DQqbCuC3.js","assets/spaRelax-CvIRtAbS.js","assets/store-BKEl5sh1.js","assets/styles-DDT62FZD.js","assets/tidy-DvzVLM9C.js","assets/touchDiag-Bx_6BaWs.js","assets/ui-B-8X5rjm.css","assets/ui-BXP_yney.js","assets/ui-BsO-vOff.js","assets/ui-BurU-WAR.css","assets/ui-C2d3Opsu.js","assets/ui-CI6bhw8M.js","assets/ui-CKtDsjta.js","assets/ui-DqFQJGzw.js","assets/ui-m3ptdYwB.js","assets/ui-rMo2S12Z.js","assets/view-C5c_xCp7.css","assets/view-p-0_1xUe.js","assets/wardrobe-BbSRkY76.js","assets/wires-DUfQ4gTo.js","index.html","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    // { cache: 'reload' } : on ignore le cache HTTP du navigateur, sinon une page d'accueil périmée (jusqu'à 10 min) pourrait être
    // rangée avec les fichiers de la nouvelle version.
    caches.open(CACHE).then((c) => c.addAll(['./', ...PRECACHE].map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La page peut demander l'activation immédiate d'une version en attente (bouton « Mettre à jour »).
self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Informations de version : toujours le réseau, jamais de cache.
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })));
    return;
  }
  // La page : réseau d'abord SANS cache HTTP (pour recevoir les mises à jour tout de suite), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(url.href, { cache: 'no-store', credentials: 'same-origin' })
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
