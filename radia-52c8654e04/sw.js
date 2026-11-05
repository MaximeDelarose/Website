/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw34tgzt-339c0c0';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-vGJoBBZb.js","assets/app-C-c5FP2U.js","assets/art-DZLTsgh0.js","assets/art-DtG3uNae.js","assets/badge-BNm89TvJ.js","assets/bouquet-Dm9-6IYQ.js","assets/braceletReveal-NP3z0SOj.js","assets/career-CPhsEd9K.css","assets/career-DWJFdv9D.js","assets/careerGame-BQQ98XF6.js","assets/casino-CXBOEYPu.js","assets/castle-BMvovhX-.css","assets/castle-Mi3ef86p.js","assets/cat-C_YDoVUq.js","assets/cat-DaPNr-Ui.css","assets/cat-H6sbgbiS.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-3v4VtCqY.js","assets/chocolateBox-CBTz-KcM.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DXfsrrug.js","assets/cinemaQuiz-D4_BBVOD.js","assets/common-B4xNxEy5.js","assets/creativeUi-BENnE4bd.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-jHtyBfNc.js","assets/decorTable-DSXlBxD7.js","assets/demo-DFhvYdh9.js","assets/drawing-Bzs56OzV.js","assets/dressVerdict-Clz_ndiV.js","assets/dressing-BQy12BFm.js","assets/dressing-DRvvLtmc.css","assets/family-BxUXwi1J.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-YuIrkGg6.js","assets/fashionThemes-BGYIX2KP.js","assets/finale-CFl7OVfm.js","assets/fireworksPhoto-CWqpMI3C.js","assets/frame-BWouACoT.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-IYwtSUb3.js","assets/gallery-ytUvKoxt.js","assets/garden-BW1Z57of.js","assets/garden-Bg1FOPMa.js","assets/garden-DazHrlMv.css","assets/garden-DjpCQ0KQ.js","assets/garden-_OmhkqSb.js","assets/giftArt-J3lVB8VD.js","assets/guessMenu-DyrBQ44u.js","assets/harness-DLYKcm1s.js","assets/host-D4Mr9rRG.js","assets/hub-38W3MdrV.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-8ENJej0e.js","assets/index-B9EFslun.js","assets/index-BRWvVPWG.css","assets/index-Bba7i67M.js","assets/index-CEYNbWMR.js","assets/index-CLGad4UF.css","assets/index-CRZ9eKYI.js","assets/index-CwAsyo4P.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DjCcrr4K.css","assets/index-Du5lN8NX.js","assets/kit-DOzxEsJ8.css","assets/kit-Db5pnWwN.js","assets/memoryChallenge-BX46YSBa.js","assets/memoryView-D7_N_i8U.js","assets/menuPick-BWgESeEy.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DdkpDRVE.js","assets/order-hkZc9_ja.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B22VCbBm.js","assets/photoBooth-D0Bhj7UW.js","assets/photoShoot-Jri19Scv.js","assets/plumbing-DOBID5tw.js","assets/promiseCard-Dlt5VHcm.js","assets/render-DN8oUXTi.js","assets/render-DcNuF2cu.js","assets/reveal-sV6XI-Xw.js","assets/rhythmDance-C4OnKn6S.js","assets/rng-LLIeWRGS.js","assets/runtime-WYtj9y_4.js","assets/scene-BL4wdnh3.js","assets/scene-C7nCHeHi.css","assets/scene-DnyKnUuP.js","assets/scenes-DrZrEo2k.js","assets/session-D2Phu4uY.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-KpH8Gprc.js","assets/spaRelax-CKPsUnhV.js","assets/store-K_hr6tR8.js","assets/styles-DDT62FZD.js","assets/tidy-BPOO4Lbw.js","assets/touchDiag-CX73b0aq.js","assets/ui-B-8X5rjm.css","assets/ui-BurU-WAR.css","assets/ui-CK-7hbEL.js","assets/ui-CvYXL71u.js","assets/ui-Cykfeeoq.js","assets/ui-DKWIRdT3.js","assets/ui-DKbeplRm.js","assets/ui-DNm3cNy6.js","assets/ui-DQItgjM6.js","assets/ui-DeJXxKdJ.js","assets/wardrobe-DGT5pXZE.js","assets/wires-BiKJAMpm.js","index.html","manifest.webmanifest"];

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
