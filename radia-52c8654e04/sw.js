/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw31o8w5-4080c72';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BjPMdR6c.js","assets/app-BJ0W6Wz8.js","assets/art-OXLMP0LW.js","assets/art-y9HRVJpK.js","assets/badge-DpiLckKD.js","assets/bouquet-Dluu8_Up.js","assets/braceletReveal-DZhrhP-e.js","assets/career-CPhsEd9K.css","assets/career-VhFumWXp.js","assets/careerGame-DGmLqccf.js","assets/casino-CzNNwMth.js","assets/castle-BMvovhX-.css","assets/castle-CdCFzZIO.js","assets/cat-CmDps-xE.js","assets/cat-DaPNr-Ui.css","assets/cat-tXUyEwMa.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CkEXMarT.js","assets/chocolateBox-D_6mDncu.js","assets/chocolaterie-BsnkUeAP.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-Bh8f26lA.js","assets/common-BMh5mQrK.js","assets/creativeUi-SaOk-HXC.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DxupVpR1.js","assets/decorTable-ChAhgctC.js","assets/demo-DFhvYdh9.js","assets/drawing-BoEWPpN3.js","assets/dressVerdict-fOGpIzpN.js","assets/dressing-DRvvLtmc.css","assets/dressing-I35tY3vh.js","assets/family-BzSaMRsE.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-ZnxSdnKB.js","assets/fashionThemes-RFPqpTG4.js","assets/finale-BFdMNgrO.js","assets/fireworksPhoto-BzyogN0Z.js","assets/frame-DlLfYnVb.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DJrLCL9P.js","assets/gallery-F28lMe5a.js","assets/garden-BQCH0ir2.js","assets/garden-ChhQoz-e.js","assets/garden-DazHrlMv.css","assets/garden-DjjmJPEB.js","assets/garden-soxAJ6u1.js","assets/giftArt-D7UO870k.js","assets/guessMenu-DC_BHswW.js","assets/harness-CrmXxyfo.js","assets/host-CQNQkhHy.js","assets/hub-CLyx-i18.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BDiNI-5M.js","assets/index-BRWvVPWG.css","assets/index-BqJ8pfWQ.js","assets/index-C4VYFFS9.js","assets/index-C6g0Rrj2.css","assets/index-CAQYNIps.js","assets/index-CLGad4UF.css","assets/index-Cik1yZCn.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-dwg8CGjU.js","assets/index-zFlGqADn.js","assets/kit-BY17e8Pk.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CYlRcwya.js","assets/memoryView-xSAtzLv0.js","assets/menuPick-CjiPo49x.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BK4H52wf.js","assets/order-P11xshfW.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-7_HgRDOB.js","assets/photoBooth-BBGTJZs2.js","assets/photoShoot-PVJqISHm.js","assets/plumbing-DZ0IDAoQ.js","assets/promiseCard-CJ0IiaHZ.js","assets/render-CyYYzfRv.js","assets/render-DvWd61kG.js","assets/reveal-Bl7W-a8a.js","assets/rhythmDance-Hk8N45Rm.js","assets/rng-LLIeWRGS.js","assets/runtime-Tqg6IJwQ.js","assets/scene-B7aW4DFA.js","assets/scene-C7nCHeHi.css","assets/scene-DnDaQOs5.js","assets/scenes-3ypitgfp.js","assets/session-DtumLJEI.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-2zq8HtTW.js","assets/spaRelax-BNZ3DR9z.js","assets/store-BeepBIfe.js","assets/styles-DDT62FZD.js","assets/tidy-DZXBqCLB.js","assets/ui-B-8X5rjm.css","assets/ui-Ba_gWK9p.js","assets/ui-BfZk0swo.js","assets/ui-BurU-WAR.css","assets/ui-ByiJy3Ye.js","assets/ui-CGc5Cj_V.js","assets/ui-CbADIpbe.js","assets/ui-CzPW5tc5.js","assets/ui-D-BwlVqu.js","assets/ui-DvHY6ba8.js","assets/wardrobe-CDiP8xgw.js","assets/wires-BOfgXbCy.js","index.html","manifest.webmanifest"];

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
