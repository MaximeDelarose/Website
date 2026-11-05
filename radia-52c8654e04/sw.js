/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw324dv9-6e82f7a';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-HZ67POuC.js","assets/app-B5AE5P9f.js","assets/art-7lga5CuY.js","assets/art-DWMY2qLZ.js","assets/badge-BWbEZ1fn.js","assets/bouquet-C_sxfmZ8.js","assets/braceletReveal-BeULS4tS.js","assets/career-CPhsEd9K.css","assets/career-Dc2oi0gg.js","assets/careerGame-DxeTD21k.js","assets/casino-BP7V9YKb.js","assets/castle-BMvovhX-.css","assets/castle-BhOkxFqh.js","assets/cat-CLk0JTKu.js","assets/cat-DaPNr-Ui.css","assets/cat-DpnjhFoW.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BgsOaKYj.js","assets/chocolateBox-CIUhNnnk.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-VfHDc8zp.js","assets/cinemaQuiz-DQS4cJL1.js","assets/common-DCbKCMgo.js","assets/creativeUi-cilY118K.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DfH23WO3.js","assets/decorTable-wv--azHa.js","assets/demo-DFhvYdh9.js","assets/drawing-B9nMlpba.js","assets/dressVerdict-C5SjFjoe.js","assets/dressing-DRvvLtmc.css","assets/dressing-DZKeSGo3.js","assets/family-BuR9Tjik.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-BqHdD3Oy.js","assets/fashionThemes-bifGyNgo.js","assets/finale-DIVCCU8M.js","assets/fireworksPhoto-D_wQHlyh.js","assets/frame-BaNiOOmC.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BvFTQoWt.js","assets/gallery-VOGdbzfs.js","assets/garden-B5yy3OaO.js","assets/garden-C0B7o1rG.js","assets/garden-CWHghh1s.js","assets/garden-DJPOs37D.js","assets/garden-DazHrlMv.css","assets/giftArt-Bj0BJDws.js","assets/guessMenu-BidZGVd6.js","assets/harness-B2h0GoSm.js","assets/host-BDTi4gvt.js","assets/hub-Cgau96xP.css","assets/hub-OXy5rJDD.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bmmg0LT8.js","assets/index-C6g0Rrj2.css","assets/index-CLGad4UF.css","assets/index-C_Cx76M_.js","assets/index-DCMylLWJ.js","assets/index-DDlDaZiW.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DbeRxKS3.js","assets/index-Y0Za8lpC.js","assets/index-Y76LC5z1.js","assets/kit-CnA7gZ2x.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CYCDGrH-.js","assets/memoryView-771GMTIN.js","assets/menuPick-C1NvuG8x.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BSHfPnxr.js","assets/order-DFEcxciT.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DaOhyVRh.js","assets/photoBooth-BnV7-eyF.js","assets/photoShoot-Cls0vrsR.js","assets/plumbing-D-8wDCe_.js","assets/promiseCard-DtjXpF1p.js","assets/render-CHRVI7c4.js","assets/render-yNQ3-CVP.js","assets/reveal-G0lFEtU8.js","assets/rhythmDance-C4q8RXDS.js","assets/rng-LLIeWRGS.js","assets/runtime-DrlwOF0s.js","assets/scene-C7nCHeHi.css","assets/scene-Cua_61jC.js","assets/scene-DFlV2fHm.js","assets/scenes-CHI_qtAw.js","assets/session-5-OvDiKa.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-B5xDHlyD.js","assets/spaRelax-CNgYU2VD.js","assets/store-2hSvjije.js","assets/styles-DDT62FZD.js","assets/tidy-A9iNpvlB.js","assets/ui-B-8X5rjm.css","assets/ui-BcrRY_Bw.js","assets/ui-BurU-WAR.css","assets/ui-BwJRuc3m.js","assets/ui-CAyLLLJq.js","assets/ui-Ce5KVFhC.js","assets/ui-D4J-2h6e.js","assets/ui-DuFmh6Dm.js","assets/ui-DxxTfDAw.js","assets/ui-PyCbrm2V.js","assets/wardrobe-Bgulbmeh.js","assets/wires-BeBG6Y2c.js","index.html","manifest.webmanifest"];

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
