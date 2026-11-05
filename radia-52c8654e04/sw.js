/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw382k6f-9589874';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-D-gxwZ4K.js","assets/app-BMJw69CQ.js","assets/art-B_j1wF4d.js","assets/art-D8dFg37C.js","assets/badge-DwQoBTTZ.js","assets/bouquet-BxQnTMgT.js","assets/braceletReveal-Dhxkquda.js","assets/career-BCvfmWaa.js","assets/career-DWCaFiTH.css","assets/careerGame-Bw28QzSi.js","assets/casino-CIWERTq1.js","assets/castle-BMvovhX-.css","assets/castle-CGuBsJEV.js","assets/cat-BGhouIX0.js","assets/cat-DY619tzD.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-DvB6Tywv.js","assets/chocolateBox-0LTpLnUT.js","assets/chocolaterie-CqwkXUdy.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-BA2g0OTM.js","assets/common-KYtLW529.js","assets/creativeUi-BASCwNs3.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-Cz8e1CNm.js","assets/decorTable-CuGkO-dq.js","assets/demo-DFhvYdh9.js","assets/drawing-HoofYZPM.js","assets/dressVerdict-pjbqkGMy.js","assets/dressing-D-SxndPC.js","assets/dressing-DRvvLtmc.css","assets/family-Co3KOeZx.js","assets/family-gy-OT53v.css","assets/fans-BPVWbELp.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-pPfTpjbO.js","assets/finale-BqvjQxe9.js","assets/fireworksPhoto-CIlmxNeH.js","assets/frame-CN_1Qzth.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-B44oE-hG.js","assets/gallery-C616-646.js","assets/garden-B7MkNKF-.js","assets/garden-BOPObuwc.js","assets/garden-CAXJXAwd.js","assets/garden-CO-NkI4x.js","assets/garden-DazHrlMv.css","assets/giftArt-B_ktotsV.js","assets/guessMenu-CDBNj4TO.js","assets/harness-oIEz89iy.js","assets/host-CZonRXTG.js","assets/hub-C4LbLexs.css","assets/hub-DlFQqbfq.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BkFaFirg.js","assets/index-CLGad4UF.css","assets/index-CTVVvA_P.js","assets/index-Cpv34cLo.js","assets/index-CvpGWKsV.js","assets/index-DJq2d6dv.js","assets/index-DNlVaGFs.css","assets/index-DVQat9fN.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DrxDBTmL.js","assets/index-ig1dOV33.css","assets/kit-D7d8zXC4.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-Bs-tARML.js","assets/memoryView-ChIdYc26.js","assets/menuPick-BTkHxr-x.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DM7S1xtX.js","assets/order-ChU2dCRA.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BPZgvO58.js","assets/photoBooth-BKM5lhJ4.js","assets/photoShoot-w22sis2D.js","assets/plumbing-DCa9Xzmm.js","assets/promiseCard-B5D4c70T.js","assets/render-Sxkpnc8R.js","assets/render-fDQqYEFO.js","assets/reveal-AvkwsG-m.js","assets/rhythmDance-VZogWfCQ.js","assets/rng-LLIeWRGS.js","assets/runtime-bCumYZWf.js","assets/scene-C7nCHeHi.css","assets/scene-Di-WDY03.js","assets/scene-cD0lP2jv.js","assets/scenes-B8wXu4Wa.js","assets/session-DIh19IUJ.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-Cs-1oYJr.js","assets/spaRelax-BWIHy9_4.js","assets/store-FgvDSpn8.js","assets/styles-DDT62FZD.js","assets/tidy-KWqZodGH.js","assets/touchDiag-CR5hLKFC.js","assets/ui-B-8X5rjm.css","assets/ui-B3L7yS-Q.js","assets/ui-BFs2z5yg.js","assets/ui-BKFKJKsy.js","assets/ui-BurU-WAR.css","assets/ui-C7-zRThg.js","assets/ui-CSbSBxWB.js","assets/ui-D8RwOUqf.js","assets/ui-DnZ72Hp_.js","assets/ui-Xu0aPrJs.js","assets/wardrobe-m4_B_KQn.js","assets/wires-Cgq9YOql.js","index.html","manifest.webmanifest"];

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
