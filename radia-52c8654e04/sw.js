/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2rf6d8-ddee22f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-B2QUt0lE.js","assets/app-BE-Ip8E7.js","assets/art-wpSrU_ZR.js","assets/badge-CLpUkjAn.js","assets/bouquet-DUV2Su2n.js","assets/braceletReveal-mx0woGlB.js","assets/career-CPhsEd9K.css","assets/career-DL5OUUcQ.js","assets/careerGame-_57nnJa9.js","assets/casino-CsSzw-Z6.js","assets/castle-BMvovhX-.css","assets/castle-CurHC8Jc.js","assets/cat-Bwxiy5OS.js","assets/cat-CRyrygzp.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-BR7ITTgE.js","assets/chocolateBox-D5EOgH6l.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DIklomhF.js","assets/cinemaQuiz-C1osv2nx.js","assets/common-C1xW6ACd.js","assets/creativeUi-CLy1bb0i.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-BU-ftuKM.js","assets/decorTable-B39soz9p.js","assets/demo-DFhvYdh9.js","assets/drawing-BzJzIwhr.js","assets/dressVerdict-DC4VJFIk.js","assets/dressing-BaA7VTQ8.js","assets/dressing-DRvvLtmc.css","assets/family-DCOWjiEO.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-BnoQ29dS.js","assets/fashionThemes-CroiW71I.js","assets/finale-S3b-Gfww.js","assets/fireworksPhoto-DP3Zf578.js","assets/frame-CCxPGfHZ.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-GYRF3VWS.js","assets/gallery-BSJ3w3bl.js","assets/garden-B4374HB7.js","assets/garden-Bm7uuC7T.js","assets/garden-C7jUXqiG.js","assets/garden-C9Se1iJ-.js","assets/garden-DazHrlMv.css","assets/giftArt-CKAYPbq3.js","assets/guessMenu-506iLJP6.js","assets/harness-BlJ0JgUM.js","assets/host-CfQM8ARD.js","assets/hub-Cgau96xP.css","assets/hub-DL1Vt5xj.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BBY6YQOa.js","assets/index-BRWvVPWG.css","assets/index-CCBl5_zk.css","assets/index-CLGad4UF.css","assets/index-CcjKGd1O.js","assets/index-D-abAD4i.js","assets/index-DQIWpqFt.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dmr5FMzE.js","assets/index-UD_cMUN3.js","assets/index-nUE4rpMd.js","assets/index-uS5xyx-V.css","assets/kit-Ck69eTnA.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-C-h91eCN.js","assets/memoryView-BXox4-OY.js","assets/menuPick-BTc2nDGK.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BK4FDjNx.js","assets/order-C2KXqlp-.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BFo8XFEh.js","assets/photoBooth-BCGQvHin.js","assets/photoShoot-Cs7uTyOx.js","assets/plumbing-ChUuMuJT.js","assets/promiseCard-JWPPDRYA.js","assets/render-BJYHMhq9.js","assets/render-C40Has98.js","assets/reveal-DqTEFwd9.js","assets/rhythmDance-CZC6QWOJ.js","assets/rng-LLIeWRGS.js","assets/runtime-CrWYdKam.js","assets/scene-BecIxpwR.js","assets/scene-C7nCHeHi.css","assets/scene-Kk-8QySc.js","assets/scenes-BxNjWMx9.js","assets/session-BwDm94O1.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-M0TnH0Gf.js","assets/spaRelax-CM3dNPDf.js","assets/store-DIbi1xjs.js","assets/styles-DDT62FZD.js","assets/tidy-EDLwFVgV.js","assets/ui-8LYqfx-F.js","assets/ui-B-8X5rjm.css","assets/ui-B80hbb1x.js","assets/ui-BTmM7MhA.css","assets/ui-BrfrdGUR.js","assets/ui-DFqhKpoj.js","assets/ui-DFyGVLlv.js","assets/ui-SYARxrV4.js","assets/ui-eTb0F5R4.js","assets/ui-mo1f9yt3.js","assets/wardrobe-DEqVUHm8.js","assets/wires-BBlFaMSP.js","index.html","manifest.webmanifest"];

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
