/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3mgnve-b8c324e';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DkS122-4.js","assets/app-De3GiRiT.js","assets/art-3kPufQjJ.js","assets/art-yPTNdYvq.js","assets/badge-CUg3FGIW.js","assets/bouquet-arPTd4aW.js","assets/braceletReveal-KWEqpNDA.js","assets/career-D4Kjo_a9.css","assets/career-lTxtEqRv.js","assets/careerGame-teOWujiO.js","assets/casino-BUigr1Bm.js","assets/castle-BMvovhX-.css","assets/castle-CDh9a1jW.js","assets/cat-B5AKjWwc.js","assets/cat-DMn7xnXo.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CJjPx0OJ.js","assets/chocolateBox-uf5EbPRH.js","assets/chocolaterie-BFNVhZiJ.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-D6LmQVck.js","assets/common-aifoyNie.js","assets/creativeUi-CnaH_S8B.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-712TCDUS.js","assets/decorTable-DrsC4m5P.js","assets/demo-DFhvYdh9.js","assets/drawing-BkhnwFDb.js","assets/dressVerdict-D4SlKekO.js","assets/dressing-BkngETuy.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-COTyE00U.js","assets/faceStudio-e8Y12Wa-.css","assets/family-CpaqJwmW.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-CfxbAb68.js","assets/fashionThemes-48rNyFMo.js","assets/finale-C4WVIFgo.js","assets/fireworksPhoto-BkgrIQCN.js","assets/frame-CSZup2O9.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-ZLhhZGgi.js","assets/gallery-Bwsk3D4R.js","assets/garden-A0jnLvKt.js","assets/garden-BLPy9-Zh.js","assets/garden-DazHrlMv.css","assets/garden-tnl6hTaY.js","assets/garden-vWmtIqRd.js","assets/giftArt-DLBwCVQS.js","assets/guessMenu-DCaCd9XU.js","assets/harness-DrmszObd.js","assets/host-CNArLFrG.js","assets/hub-C4LbLexs.css","assets/hub-CXxqE5_e.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-CpCyEfUd.js","assets/index-DE92-2A3.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-G3ImOOf6.js","assets/index-NlSchS4U.js","assets/index-XdQoo-Lp.js","assets/index-iECWPkjR.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/index-ojXzb89y.js","assets/kit-DOzxEsJ8.css","assets/kit-D_8wRDmA.js","assets/memoryChallenge-Bd3975-7.js","assets/memoryView-DuYko9i1.js","assets/menuPick-BvY0wJ7f.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-N4QDtVlo.js","assets/order-C8gvNBLP.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DwlNSWLy.js","assets/photoBooth-BGqtO6Vn.js","assets/photoShoot-8SWRmJ1b.js","assets/plumbing-CuE9vs4g.js","assets/promiseCard-CCJYGGq2.js","assets/push-uqyz8qkk.js","assets/render-DZwz-d3t.js","assets/render-fnCV0zK-.js","assets/reveal-DarkszeO.js","assets/rhythmDance-CVkfbqMl.js","assets/rng-LLIeWRGS.js","assets/runtime-BAZnqGqY.js","assets/scene-C77W04Ny.js","assets/scene-C7nCHeHi.css","assets/scene-DFtnw4Mo.js","assets/scenes-E3h31dBd.js","assets/session-C0Twuu1P.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-eMlmy6Qh.js","assets/spaRelax-CVNdULWs.js","assets/store-DbQZ_qYK.js","assets/styles-DDT62FZD.js","assets/thoughts-CJqUqmP0.js","assets/tidy-BXkBJHTn.js","assets/touchDiag-Wkj4FOyu.js","assets/ui-B-8X5rjm.css","assets/ui-B5R4YIK0.js","assets/ui-B6o0kG8P.js","assets/ui-BPSL9K9X.js","assets/ui-BurU-WAR.css","assets/ui-CU7Zex4d.js","assets/ui-CY00Fayk.js","assets/ui-CZSviocR.js","assets/ui-Dw7tZV4L.js","assets/ui-kdcbORW_.js","assets/view-C5c_xCp7.css","assets/view-vsALfpvc.js","assets/wardrobe-C-IuCb1B.js","assets/wires-DY3Cd3QG.js","index.html","manifest.webmanifest"];

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
