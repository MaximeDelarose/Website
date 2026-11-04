/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2og657-76aa7e6';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DL4hSy6w.js","assets/app-B62jTw5L.js","assets/art-nYBH53S_.js","assets/badge-yM4Rzevl.js","assets/bouquet-B3ELeNj3.js","assets/braceletReveal-nkLibmsm.js","assets/career-CPhsEd9K.css","assets/career-HeYjmgU0.js","assets/careerGame-sGQPySE9.js","assets/casino-qwhjByrR.js","assets/castle-8HcLLFbw.js","assets/castle-BMvovhX-.css","assets/cat-CSSuAWZn.js","assets/cat-DaPNr-Ui.css","assets/cat-DzNYnH9Y.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BSK6GLQQ.js","assets/chocolateBox-Ca1Xe1Ho.js","assets/chocolaterie-CRSjZ4Ma.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-DHxmIgpR.js","assets/common-DQsMNutF.js","assets/creativeUi-BUJ-Jq7W.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-CM290y4Y.js","assets/decorTable-7-i43Azi.js","assets/demo-DFhvYdh9.js","assets/drawing-xLYQNaXC.js","assets/dressVerdict-BwHYSelY.js","assets/dressing-DM74ALfJ.js","assets/dressing-DRvvLtmc.css","assets/family-D0g-ha5M.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-BpB0hRZy.js","assets/fashionThemes-CUBUMjAq.js","assets/finale-CzTD7-YM.js","assets/fireworksPhoto-p6wCwLhY.js","assets/frame-D9cU3LEb.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-AD-GkcFT.js","assets/gallery-MozfHo01.js","assets/garden-0OjeUGo1.js","assets/garden-0d6MYCKx.js","assets/garden-D82ML79Z.js","assets/garden-DazHrlMv.css","assets/garden-DiEo9yZv.js","assets/giftArt-TTBIu7JZ.js","assets/guessMenu-BdE5DoEX.js","assets/harness-VZ56Hj97.js","assets/host-rwNIbKTY.js","assets/hub-Cgau96xP.css","assets/hub-uJT3v_2f.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BoZjKcNM.js","assets/index-CLGad4UF.css","assets/index-Cee-8bJ8.js","assets/index-D7QJk6J-.js","assets/index-D8RruaGU.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DgzbXzM2.css","assets/index-RQFOMru5.js","assets/index-YlqkLd8n.js","assets/index-m0KFlS34.js","assets/index-uS5xyx-V.css","assets/kit-Ceumw3bg.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-C67lGLg7.js","assets/memoryView-BNgtHveI.js","assets/menuPick-Xiia2u5s.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Dvory8lA.js","assets/order-BAqxzePT.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BiYtGxn5.js","assets/photoBooth-Blu6-9Wd.js","assets/photoShoot-BRycXVkB.js","assets/plumbing-B9ehk94X.js","assets/promiseCard-rNhRPqx1.js","assets/render-CxseSSlV.js","assets/render-DR5aq8d1.js","assets/reveal-DURw0a2w.js","assets/rhythmDance-DVU3yBS-.js","assets/rng-LLIeWRGS.js","assets/runtime-BIycPE5Y.js","assets/scene-0tRBa5hV.js","assets/scene-C7nCHeHi.css","assets/scene-DVzRqWS9.js","assets/scenes-BnaPHaY5.js","assets/session-CSkTJHc5.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BkBj9npV.js","assets/spaRelax-qc5aW7TD.js","assets/store-DXvykgbB.js","assets/styles-DDT62FZD.js","assets/tidy-CWaPyIie.js","assets/ui-3vsunoF9.js","assets/ui-B-8X5rjm.css","assets/ui-BTmM7MhA.css","assets/ui-BtoJDUca.js","assets/ui-BupZaH9x.js","assets/ui-Cj-V_vrp.js","assets/ui-CsMSJQuC.js","assets/ui-Dto0Vzy9.js","assets/ui-NwnD4zh4.js","assets/ui-t0iHer5W.js","assets/wardrobe-BZ8x4BFx.js","assets/wires-D51MpSn6.js","index.html","manifest.webmanifest"];

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
