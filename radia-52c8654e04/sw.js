/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw420rzs-6ca842e';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DUC6o-TP.js","assets/app-DSaG4d_l.js","assets/arrangeCare-BNaMTN-s.js","assets/art-B51hwiTP.js","assets/art-BoDJxgDv.js","assets/art-DCrPyUPC.js","assets/badge-DI_WkGu7.js","assets/board-XtzwRxRo.css","assets/board-Xv_TRLn9.js","assets/bouquet-CEYBFS9k.js","assets/braceletReveal-GOws5rG7.js","assets/career-D4Kjo_a9.css","assets/career-D5xpogcH.js","assets/careerGame-DpiF3KY6.js","assets/casino-DI_qPVvI.js","assets/castle-BMvovhX-.css","assets/castle-DNvqQZP_.js","assets/cat-DaPNr-Ui.css","assets/cat-DpeNZmbk.js","assets/cat-SUcv70rb.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-D1Aev3Pl.js","assets/chocolateBox-D5m-Da_T.js","assets/chocolaterie-BMA7zgLw.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-B5x91u8A.js","assets/common-B4_fg4Oa.js","assets/creativeUi-CdnjsPuY.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-4iWxZljR.js","assets/decorTable-Cd5yuXqj.js","assets/demo-DFhvYdh9.js","assets/drawing-DLlhgAar.js","assets/dressVerdict-BS206qSs.js","assets/dressing-C_HKqH69.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-BoDHRkZ3.js","assets/faceStudio-e8Y12Wa-.css","assets/family-DSAgdfuV.js","assets/family-gy-OT53v.css","assets/familyPick-DH_9k31H.js","assets/fans-BXo_QXE3.css","assets/fans-oO4AXKwZ.js","assets/fashionThemes-CVGB-kD-.js","assets/finale-BNoApnAh.js","assets/fireworksPhoto-N_D2DtRA.js","assets/frame-ml2DSbn8.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CFzVmltv.js","assets/gallery-9oj_x5fR.js","assets/garden-BxqbPjM8.js","assets/garden-C6t8oDr6.js","assets/garden-D2yRS0fi.js","assets/garden-DVzVB8NN.js","assets/garden-DazHrlMv.css","assets/giftArt-DOn_CBys.js","assets/guessMenu-Bv5lJ7xN.js","assets/harness-CUrRUOwd.js","assets/host-puXAGMXg.js","assets/hub-C4LbLexs.css","assets/hub-CyfCrLQa.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B8Y6LhQH.js","assets/index-BRWvVPWG.css","assets/index-BYHV24gg.js","assets/index-Bgp_CR3j.css","assets/index-BtPl1TLM.js","assets/index-CLGad4UF.css","assets/index-DUh8rkwD.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Do5uzovM.js","assets/index-MBZkLstq.js","assets/index-jolZgkUr.css","assets/index-vC3ykvHQ.js","assets/kit-CqtvXy99.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CTJHr-ef.js","assets/memoryView-B9SanUou.js","assets/menuPick-flpBAERU.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-C8Co6ZX9.js","assets/order-C47spNwz.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B3h5qd-w.js","assets/photoBooth-CuNBbkes.js","assets/photoShoot-B1uqc6TQ.js","assets/plumbing-Bv-bgOPt.js","assets/promiseCard-DRWAUBRS.js","assets/push-DZ_ZY3YD.js","assets/render-BhSqcJhq.js","assets/render-Db9B1qcx.js","assets/reveal-CmqY4IEi.js","assets/rhythmDance-DbyrRl3g.js","assets/rng-LLIeWRGS.js","assets/runtime-CJp-ZVjT.js","assets/scene-Bec8FNKC.js","assets/scene-C7nCHeHi.css","assets/scene-ClRk7Fkj.js","assets/scenes-B1DJzB71.js","assets/session-CQUrrt-H.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BxGwXu8V.js","assets/spaRelax-CmYGGf3a.js","assets/store-VrgF_wAk.js","assets/styles-DDT62FZD.js","assets/thoughts-DDsPtl75.js","assets/thoughts-lw9uL1wa.css","assets/tidy-C_vasTFM.js","assets/touchDiag-BKPsWExy.js","assets/ui-B-8X5rjm.css","assets/ui-B529E3Y2.js","assets/ui-BBziitCj.js","assets/ui-BurU-WAR.css","assets/ui-CQ36YmHl.js","assets/ui-Co-0GEhr.js","assets/ui-CvVg1gR4.js","assets/ui-D-BLjytL.js","assets/ui-He6TMtTS.js","assets/ui-ko_IITrC.js","assets/view-C5c_xCp7.css","assets/view-CbH0I7wv.js","assets/wardrobe-BYHS_hjE.js","assets/wires-CWU9zt5h.js","index.html","manifest.webmanifest"];

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

// ------------------------------------------------------------------ petites pensées quotidiennes (Web Push)
// Le message est affiché comme notification ; il est AUSSI rangé dans un cache à part (« rthoughts », jamais effacé par la mise à jour des
// versions) pour que l'application l'ajoute à « Petites pensées ♡ » à sa prochaine ouverture, même si la notification n'a pas été touchée.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const body = String(d.body || 'Une petite pensée pour toi ♡').slice(0, 200);
  const at = Number(d.at) || Date.now();
  e.waitUntil(Promise.all([
    self.registration.showNotification(String(d.title || 'RADIA ♡').slice(0, 60), {
      body,
      icon: new URL('assets/icons/icon-192.png', self.registration.scope).href,
      badge: new URL('assets/icons/icon-192.png', self.registration.scope).href,
      tag: 'radia-daily', // une seule notification quotidienne visible à la fois (pas d'empilement)
      data: { url: d.url || './?pensee=1', at },
    }),
    caches.open('rthoughts').then((c) => c.put('/__thought/' + at, new Response(JSON.stringify({ at, text: body, idx: typeof d.idx === 'number' ? d.idx : -1, test: !!d.test }), { headers: { 'content-type': 'application/json' } }))).catch(() => undefined),
  ]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './?pensee=1', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: 'radia-thought' }); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});

// L'abonnement peut être renouvelé par le système : on prévient l'application (elle se réabonne à sa prochaine ouverture).
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: 'radia-push-changed' }))));
});
