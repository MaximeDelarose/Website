/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3757w4-9d3d09f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DaoHkcKE.js","assets/app-BvYelANV.js","assets/art-BTKbV73n.js","assets/art-DqYniIEZ.js","assets/badge-C3MOxtG4.js","assets/bouquet-Bj92jh0c.js","assets/braceletReveal-C1saTCxl.js","assets/career-CPhsEd9K.css","assets/career-w66ptcsw.js","assets/careerGame-CAITBqcp.js","assets/casino-CJCQuOE2.js","assets/castle-8zZDA_V5.js","assets/castle-BMvovhX-.css","assets/cat-BcB2CpgZ.js","assets/cat-DaPNr-Ui.css","assets/cat-PRlqnWeE.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-8Pu9OF_A.js","assets/chocolateBox-QnhYw4LN.js","assets/chocolaterie-CKwz1gtr.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-MEkRIuc0.js","assets/common-DC8oZpO2.js","assets/creativeUi-Cq7DFCyz.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CCpwtPpD.js","assets/decorTable-D1Df9i9k.js","assets/demo-DFhvYdh9.js","assets/drawing-CsBhSCBR.js","assets/dressVerdict-ByE79hcs.js","assets/dressing-C0py0Txt.js","assets/dressing-DRvvLtmc.css","assets/family-C6otw4Bh.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-lnCahiyr.js","assets/fashionThemes-DYi5iuz7.js","assets/finale-PyqScELx.js","assets/fireworksPhoto-ZdvPDrmK.js","assets/frame-VSJb287D.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DW7q_xf1.js","assets/gallery-Bj11Ahih.js","assets/garden-B-JLnmGZ.js","assets/garden-C5A15XkE.js","assets/garden-C_fdR-Ps.js","assets/garden-DazHrlMv.css","assets/garden-Di0V06Jp.js","assets/giftArt-ooudjJfS.js","assets/guessMenu-D0teMZuU.js","assets/harness-CuSphlyn.js","assets/host-BuNaceUy.js","assets/hub-Cgau96xP.css","assets/hub-nYgs8b_C.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B6XRxrC-.js","assets/index-BAZlFq_O.js","assets/index-BInHbTai.js","assets/index-BRWvVPWG.css","assets/index-Bq6oFnlQ.js","assets/index-C7ErIX5J.js","assets/index-CLGad4UF.css","assets/index-DHxYIkJ_.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-ig1dOV33.css","assets/index-kHUJMhQa.js","assets/kit-DOzxEsJ8.css","assets/kit-DtXHKGNM.js","assets/memoryChallenge-DIoTrQQ5.js","assets/memoryView-AtAaoEbv.js","assets/menuPick-Y_9LUv-Y.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CaitA-o7.js","assets/order--gPIFA7u.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-FPWOQ5sV.js","assets/photoBooth-CIGlCiCv.js","assets/photoShoot-CqDB4KH1.js","assets/plumbing-DA7slPQ0.js","assets/promiseCard-C33u14-w.js","assets/render-NVXi8sBS.js","assets/render-fmC9p8Ym.js","assets/reveal-tbLEsfMK.js","assets/rhythmDance-BaD8qR5-.js","assets/rng-LLIeWRGS.js","assets/runtime-BCEQrjOK.js","assets/scene-C7nCHeHi.css","assets/scene-DCDv9WN9.js","assets/scene-NOGPGpRP.js","assets/scenes-DQVESxWl.js","assets/session-kRnfWqlB.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-D9b_aX_g.js","assets/spaRelax-D4r5bcXQ.js","assets/store-BLNoyTOZ.js","assets/styles-DDT62FZD.js","assets/tidy-Bizxl94d.js","assets/touchDiag-cLkn1mS3.js","assets/ui-B-8X5rjm.css","assets/ui-BD_qiZp_.js","assets/ui-BurU-WAR.css","assets/ui-CFB67HQx.js","assets/ui-CxwQQuoC.js","assets/ui-DkXlCBoV.js","assets/ui-DzaofzHV.js","assets/ui-JSmXH4yo.js","assets/ui-cPIVrJ0e.js","assets/ui-hMnSeN1U.js","assets/wardrobe-BuWr5ZY5.js","assets/wires-CKfZzady.js","index.html","manifest.webmanifest"];

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
