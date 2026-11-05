/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2uyxdv-847b2fe';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BJZ8tZ01.js","assets/app-DbxXWLY4.js","assets/art-DBleSc4O.js","assets/badge-6UcPXvi5.js","assets/bouquet-C1BMtt3Z.js","assets/braceletReveal-CVEbi6ux.js","assets/career-ADOsXFpN.js","assets/career-CPhsEd9K.css","assets/careerGame-CyMiXFN4.js","assets/casino-Crv14pUD.js","assets/castle-BMvovhX-.css","assets/castle-D5kfoM4B.js","assets/cat-DMd8tenR.js","assets/cat-DaPNr-Ui.css","assets/cat-b9eNxGu-.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BIDb9yHx.js","assets/chocolateBox-DDVdHyle.js","assets/chocolaterie-CuZNJ6H9.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CIuHl8uS.js","assets/common-BDVaro75.js","assets/creativeUi-DjD9LH2f.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-BkPchSt9.js","assets/decorTable-p3tHyCpH.js","assets/demo-DFhvYdh9.js","assets/drawing-C6_ROEtd.js","assets/dressVerdict-CQEpPP5x.js","assets/dressing-D5mOWjzC.js","assets/dressing-DRvvLtmc.css","assets/family-RgCae6-r.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-C-4JMHMC.js","assets/fashionThemes-Cteyqwy_.js","assets/finale-BuTBk7Pq.js","assets/fireworksPhoto-D7OyE7PI.js","assets/frame-BJqavAiH.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CsNxZTph.js","assets/gallery-BjnxZaAY.js","assets/garden-CVVq7oNY.js","assets/garden-CjepkH3P.js","assets/garden-DazHrlMv.css","assets/garden-HRRxpfX4.js","assets/garden-uUfcQ3c2.js","assets/giftArt-GTazcAS5.js","assets/guessMenu-Czc9Rhxp.js","assets/harness-CKDhp6uO.js","assets/host-DBSpzMKD.js","assets/hub-Cgau96xP.css","assets/hub-hdGAu2Ip.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BJLbB_eZ.js","assets/index-BRWvVPWG.css","assets/index-BYqvCUv-.js","assets/index-C214P4om.js","assets/index-C6g0Rrj2.css","assets/index-CLGad4UF.css","assets/index-CyngwF2e.js","assets/index-DXQLIPo4.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DrbNxHIT.js","assets/index-ZL_hA9DB.js","assets/index-uS5xyx-V.css","assets/kit-DOzxEsJ8.css","assets/kit-KnvF0GWL.js","assets/memoryChallenge-tH0JCF9K.js","assets/memoryView-B3mV7OPV.js","assets/menuPick-hONFbkyw.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BixMqGl9.js","assets/order-BQp3VQrO.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BK-RgVOD.js","assets/photoBooth-rG5gmSRh.js","assets/photoShoot-BUNRiivY.js","assets/plumbing-CapQQlSP.js","assets/promiseCard-DjVyumLI.js","assets/render-DrwwXa20.js","assets/render-DzgZn-Pv.js","assets/reveal-CTpG5-Ix.js","assets/rhythmDance-DL5QDpcO.js","assets/rng-LLIeWRGS.js","assets/runtime-C1AdtOsH.js","assets/scene-BAj37k5V.js","assets/scene-BDvtxX6M.js","assets/scene-C7nCHeHi.css","assets/scenes-BDutO8Hi.js","assets/session-ChMgGfrJ.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-Dxj7oBvZ.js","assets/spaRelax-DQGai9t1.js","assets/store-BzgbDD2P.js","assets/styles-DDT62FZD.js","assets/tidy-qrOHMAQs.js","assets/ui-B-8X5rjm.css","assets/ui-B3OgIkIa.js","assets/ui-BSZ6ph8K.js","assets/ui-BTmKplwB.js","assets/ui-BurU-WAR.css","assets/ui-Ca_GoiA5.js","assets/ui-CeTIP14P.js","assets/ui-CidR0fby.js","assets/ui-D90Qc1tO.js","assets/ui-DZ2jXGYi.js","assets/wardrobe-DPM1FhPi.js","assets/wires-BkB7ce87.js","index.html","manifest.webmanifest"];

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
