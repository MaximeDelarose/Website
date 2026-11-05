/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw39uino-1ea484c';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-SaL_2_gn.js","assets/app-Hf4HsZ7A.js","assets/art-C_0KfMNt.js","assets/art-V5xS0jdF.js","assets/badge-DHbhaV5E.js","assets/bouquet-CdSlSdFy.js","assets/braceletReveal-DFSBHIa7.js","assets/career-B1w3mUnx.js","assets/career-D4Kjo_a9.css","assets/careerGame-DpahbLHz.js","assets/casino-DZ5F6cvC.js","assets/castle-BMvovhX-.css","assets/castle-C8SE98a0.js","assets/cat-DaPNr-Ui.css","assets/cat-DttbaYi9.js","assets/cat-rcEYc53_.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BWbt1QQl.js","assets/chocolateBox-CIb3k9t3.js","assets/chocolaterie-C7dDb8ww.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-WaTcKi3P.js","assets/common-DMLHYuGR.js","assets/creativeUi-DG_gHHYn.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CzZT2dE5.js","assets/decorTable-CfVzl-L0.js","assets/demo-DFhvYdh9.js","assets/drawing-CT_7_h3P.js","assets/dressVerdict-CTii2mbL.js","assets/dressing-DRvvLtmc.css","assets/dressing-R1d1rpbb.js","assets/family-BDuR4qx0.js","assets/family-gy-OT53v.css","assets/fans-B6RF0vkY.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-X8yT0URf.js","assets/finale-V-0bqurH.js","assets/fireworksPhoto-Qez4SE-S.js","assets/frame-DYKiTU1a.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx--osOUANM.js","assets/gallery-BK2Voxx_.js","assets/garden-Bf_-OEq2.js","assets/garden-Bicnio13.js","assets/garden-BsqbyJFv.js","assets/garden-DazHrlMv.css","assets/garden-YiA0OatV.js","assets/giftArt-DSDcREef.js","assets/guessMenu-C6k5g-1z.js","assets/harness-DnUBU6Io.js","assets/host-BBon1EHI.js","assets/hub-C4LbLexs.css","assets/hub-DJtaB7e5.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index--2sOZlM9.js","assets/index-BRWvVPWG.css","assets/index-By7FjPYD.js","assets/index-CLGad4UF.css","assets/index-Co-gZS6v.js","assets/index-D5_ecY5U.js","assets/index-DNlVaGFs.css","assets/index-DOoYxudb.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DjEdmUIM.js","assets/index-NjDk4VGg.js","assets/index-ig1dOV33.css","assets/kit-Bsl2HGs5.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-BS4FY4kd.js","assets/memoryView-DGUdMQUx.js","assets/menuPick-cO3hqjXL.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-C3mT5mw7.js","assets/order-CCmIOavt.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Bczavdc_.js","assets/photoBooth-By_5ZgmD.js","assets/photoShoot-TEGmJnia.js","assets/plumbing-IpC7nCcW.js","assets/promiseCard-BWJ3dsbZ.js","assets/render-B5gB_3YR.js","assets/render-DonGV7xi.js","assets/reveal-BVp0GnaP.js","assets/rhythmDance-CVNHRinA.js","assets/rng-LLIeWRGS.js","assets/runtime-CDjTqkbr.js","assets/scene-C7nCHeHi.css","assets/scene-DDt7jVW1.js","assets/scene-Dn8wz55g.js","assets/scenes-BjX54KFU.js","assets/session-BwPLSpm4.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-Cx3yOWBm.js","assets/spaRelax-DnIiJoP0.js","assets/store-RoRNnEhC.js","assets/styles-DDT62FZD.js","assets/tidy-DYWa46Mj.js","assets/touchDiag-C72yHbmW.js","assets/ui-Ay2IsIqq.js","assets/ui-B-8X5rjm.css","assets/ui-B4R7DALf.js","assets/ui-BGY4hdLU.js","assets/ui-BurU-WAR.css","assets/ui-CleIWiXP.js","assets/ui-DcZgR4-P.js","assets/ui-Dr4wS-bE.js","assets/ui-Qt0fnv93.js","assets/ui-qC2I9vpW.js","assets/view-C5c_xCp7.css","assets/view-CQ1Fd-9G.js","assets/wardrobe-CobY0Ful.js","assets/wires-BLiIk3BA.js","index.html","manifest.webmanifest"];

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
