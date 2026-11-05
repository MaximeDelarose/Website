/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw31amcn-e35f2de';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-qlXVLBqP.js","assets/app-B0qsCDmp.js","assets/art-Bq-jaxAB.js","assets/art-EBA5l6_k.js","assets/badge-iTD3nDWl.js","assets/bouquet-eJc9rxj5.js","assets/braceletReveal-OWAEAnnr.js","assets/career-B7Q3vVl7.js","assets/career-CPhsEd9K.css","assets/careerGame-Dx-Bc-_w.js","assets/casino-Bs92_h1T.js","assets/castle-BMvovhX-.css","assets/castle-CUFeV4iS.js","assets/cat-CCy3PNfa.js","assets/cat-DaPNr-Ui.css","assets/cat-QFm3GnLa.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DOQd9H7d.js","assets/chocolateBox-hAk7hy1Z.js","assets/chocolaterie--3bv1x7X.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CCmMRGp4.js","assets/common-KTMfNr-F.js","assets/creativeUi-DeE3p1LG.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-B_G-Va2t.js","assets/decorTable-BZouWDIY.js","assets/demo-DFhvYdh9.js","assets/drawing-hrgaVWox.js","assets/dressVerdict-Do7VE4yB.js","assets/dressing-DANqTC5X.js","assets/dressing-DRvvLtmc.css","assets/family-D1OBFKDe.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-oT-3sP9A.js","assets/fashionThemes-CJq2vXK7.js","assets/finale-D2Gkhc0g.js","assets/fireworksPhoto-BJzgVzFO.js","assets/frame-DOIxadZ2.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BJFuPGkK.js","assets/gallery-BsMK9CWP.js","assets/garden-4FE8q_gv.js","assets/garden-B7u8o48G.js","assets/garden-C1oOvbVh.js","assets/garden-DazHrlMv.css","assets/garden-DmN3ynq9.js","assets/giftArt-Dj2j5MhL.js","assets/guessMenu-ct9bgbvG.js","assets/harness-DbWRvpu-.js","assets/host-udB5_vuC.js","assets/hub-Cgau96xP.css","assets/hub-DeP9CS1i.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-7_5ti_Qy.js","assets/index-BRWvVPWG.css","assets/index-BS5UQbUn.js","assets/index-C0RKoL7o.js","assets/index-C2-H6uMf.js","assets/index-C3q0bNDi.js","assets/index-C6g0Rrj2.css","assets/index-CLGad4UF.css","assets/index-DL469BTf.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dxs5n4hh.js","assets/kit-CnXnSziK.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-km_qejgk.js","assets/memoryView-BJnX6bwB.js","assets/menuPick-D5qrxMtL.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BybOSdUN.js","assets/order-Cf9_KF6k.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-jmX7RWFc.js","assets/photoBooth-C2KMxCn1.js","assets/photoShoot-CCSXtiid.js","assets/plumbing-CNamdjH5.js","assets/promiseCard-DX0fs5xR.js","assets/render-DLYWrKZg.js","assets/render-wXs_h_9Y.js","assets/reveal-QZqEhD9S.js","assets/rhythmDance-HkUdvno7.js","assets/rng-LLIeWRGS.js","assets/runtime-CdRTSLzt.js","assets/scene-BQw8akWO.js","assets/scene-C7nCHeHi.css","assets/scene-dPPe3Z-L.js","assets/scenes-BxWX-rGq.js","assets/session-D9TFYeu3.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-_FiO-R2Z.js","assets/spaRelax-D7dkBzw_.js","assets/store-DaVZlpzE.js","assets/styles-DDT62FZD.js","assets/tidy-DRetsva2.js","assets/ui-B-8X5rjm.css","assets/ui-BKuQKGvw.js","assets/ui-BurU-WAR.css","assets/ui-CiidZgcP.js","assets/ui-CyCqixJT.js","assets/ui-DC-XCRhW.js","assets/ui-DHnaBA8V.js","assets/ui-Mv_iG8AM.js","assets/ui-XEpgAo7O.js","assets/ui-ziNACNzS.js","assets/wardrobe-DLEhh75A.js","assets/wires-De5D_68p.js","index.html","manifest.webmanifest"];

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
