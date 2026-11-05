/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2unv65-7e1b68b';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BlSJ3Vz9.js","assets/app-C3wRMCpV.js","assets/art-tqTbNnhe.js","assets/badge-Bh9sR_1J.js","assets/bouquet-D4CEWaea.js","assets/braceletReveal-BG7LHVgZ.js","assets/career-CPhsEd9K.css","assets/career-QI9UeW4_.js","assets/careerGame-CnCGAoYJ.js","assets/casino-DZoviDRj.js","assets/castle-BArYmEc9.js","assets/castle-BMvovhX-.css","assets/cat-Cflh5Rs4.js","assets/cat-DaPNr-Ui.css","assets/cat-ZRUwO9ey.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CPUn2-n4.js","assets/chocolateBox-1gcqnyJ5.js","assets/chocolaterie-CJXHc4fn.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-D_qAA9V2.js","assets/common-DqG_-IX3.js","assets/creativeUi-DbunlQgx.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-BvctOX9m.js","assets/decorTable-C7UVPrwT.js","assets/demo-DFhvYdh9.js","assets/drawing--nRpKNhV.js","assets/dressVerdict-DEp7oRtl.js","assets/dressing-DRvvLtmc.css","assets/dressing-DckCW8Ah.js","assets/family-CGP_rN-b.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DAmWiSQq.js","assets/fashionThemes-2fE8WMjQ.js","assets/finale-LSsngDtj.js","assets/fireworksPhoto-C25A52e1.js","assets/frame-BxmSJA8m.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-B7NeK0BU.js","assets/gallery-BndO5dqj.js","assets/garden-BsydcCal.js","assets/garden-CPKPI4_R.js","assets/garden-D-keIcLF.js","assets/garden-DazHrlMv.css","assets/garden-SOYaX9sA.js","assets/giftArt-CFkhHOaD.js","assets/guessMenu-vi-bq7s9.js","assets/harness-hkWEr6Q-.js","assets/host-CbTlKQRW.js","assets/hub-BBSQaehq.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-C5J2lFjE.js","assets/index-C6g0Rrj2.css","assets/index-C8aEiJI_.js","assets/index-CLGad4UF.css","assets/index-D98MKzZE.js","assets/index-DEOiECfr.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DtrK3K78.js","assets/index-OqH-VdKb.js","assets/index-sAYvXvsp.js","assets/index-uS5xyx-V.css","assets/kit-D-XQ6CbJ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-C9w6GR0f.js","assets/memoryView-BTvYheeD.js","assets/menuPick-DpbrTQ6T.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CBgCqq4i.js","assets/order-CAOT69z9.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-yMRv8peJ.js","assets/photoBooth-BZ5_sVDL.js","assets/photoShoot-2_nQKnPq.js","assets/plumbing-DJqGj9fB.js","assets/promiseCard-DQKOa_4F.js","assets/render-B0rBcRfY.js","assets/render-CcQzV5Ft.js","assets/reveal-Mudlu_LL.js","assets/rhythmDance-CzkAp3lh.js","assets/rng-LLIeWRGS.js","assets/runtime-C4dHVS65.js","assets/scene-C7nCHeHi.css","assets/scene-Ct1Wmr50.js","assets/scene-OeZbguU5.js","assets/scenes-CuP_m5p7.js","assets/session-DHtVNLaI.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-C9wA2WB7.js","assets/spaRelax-DIMop68m.js","assets/store-DWf2hYjf.js","assets/styles-DDT62FZD.js","assets/tidy-BgZkCGqo.js","assets/ui-B-8X5rjm.css","assets/ui-BARwVXvD.js","assets/ui-BTmM7MhA.css","assets/ui-BWPWYX8U.js","assets/ui-C4O9B9OZ.js","assets/ui-CCIxHWqS.js","assets/ui-CnMt619E.js","assets/ui-DMuvBgCu.js","assets/ui-DwutzGce.js","assets/ui-PhB8ZUev.js","assets/wardrobe-Bn6fW_4a.js","assets/wires-Bf0ftT4V.js","index.html","manifest.webmanifest"];

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
