/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3rv7cv-48ca189';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BCZR8MnG.js","assets/app-BbNYtCHT.js","assets/art-BpVr3wtU.js","assets/art-CapZZDg8.js","assets/art-DQ001Wmj.js","assets/badge-D8PrLbt9.js","assets/board-B_A41tcU.js","assets/board-DP_N6EFV.css","assets/bouquet-BoqQBUko.js","assets/braceletReveal-C31wkMty.js","assets/career-BoM5xr5q.js","assets/career-D4Kjo_a9.css","assets/careerGame-CjqS5-Q0.js","assets/casino-D_-Z77np.js","assets/castle-BMvovhX-.css","assets/castle-tSCeWGLs.js","assets/cat-8dcM3s5W.js","assets/cat-BIPGCa8x.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CiJmBdiL.js","assets/chocolateBox-efK28_gj.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DeUT2Ww5.js","assets/cinemaQuiz-_n4MLwm6.js","assets/common-CIK_JT0R.js","assets/creativeUi-C13NZE-d.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BkJmlwHw.js","assets/decorTable-CKuKtNTS.js","assets/demo-DFhvYdh9.js","assets/drawing-B_8Mmsho.js","assets/dressVerdict-BkQuJm2c.js","assets/dressing-CH3SBmrv.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-Ch32xpFx.js","assets/faceStudio-e8Y12Wa-.css","assets/family-D0Bt5f-s.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-X3KcnbRo.js","assets/fashionThemes-BmUDkcb6.js","assets/finale-C779RdwW.js","assets/fireworksPhoto-TgYFqFbG.js","assets/frame-wpNqOOYp.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-nk86fF5k.js","assets/gallery-BCSEhGH3.js","assets/garden-B76Cvoui.js","assets/garden-BNXRFvSe.js","assets/garden-CJQAEduZ.js","assets/garden-DIyEwqV2.js","assets/garden-DazHrlMv.css","assets/giftArt-CaKE2rZd.js","assets/guessMenu-C-CdAG5T.js","assets/harness-Cxj_8PYD.js","assets/host-Cc2t8bxN.js","assets/hub-C4LbLexs.css","assets/hub-D3zsAjvr.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-0LdHebUA.js","assets/index-B6lsgN67.js","assets/index-BRWvVPWG.css","assets/index-BkW1YnZd.js","assets/index-CK8M2ybo.js","assets/index-CLGad4UF.css","assets/index-CMlLXfQY.js","assets/index-CW5zxHkl.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-fKR8svdm.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-pDv0RLwX.js","assets/memoryChallenge-DFP2KNLj.js","assets/memoryView-Dt9acTUp.js","assets/menuPick-DtJ3ROrH.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-D33lpdeJ.js","assets/order-B_3NdMkh.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BcuDbNny.js","assets/photoBooth-B38fskXN.js","assets/photoShoot-CtOYDeYE.js","assets/plumbing-DFa56ecc.js","assets/promiseCard-CJMsSIYy.js","assets/push-Ceii_ZDD.js","assets/render-CVoFOWc7.js","assets/render-cR0FYFmr.js","assets/reveal-DqxrvaQa.js","assets/rhythmDance-DpkmycZQ.js","assets/rng-LLIeWRGS.js","assets/runtime-CI6pHWUf.js","assets/scene-BKJyEaRy.js","assets/scene-C7nCHeHi.css","assets/scene-iaTS8oIy.js","assets/scenes-KEpGp0Eq.js","assets/session-BRhbNJYU.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CFIDZxpx.js","assets/spaRelax-BFKSsYgJ.js","assets/store-CEc4L_Nv.js","assets/styles-DDT62FZD.js","assets/thoughts-3GpVsd3e.js","assets/tidy-DrOJmDvi.js","assets/touchDiag-LRHMYDBd.js","assets/ui-B-8X5rjm.css","assets/ui-BjL2XfgT.js","assets/ui-BurU-WAR.css","assets/ui-CAsYpYGr.js","assets/ui-CXaiVm3s.js","assets/ui-CqpwoG6v.js","assets/ui-D55nrNQG.js","assets/ui-D65b3fXo.js","assets/ui-DTlCtY8U.js","assets/ui-DetQ2iXc.js","assets/view-B5lgw6cV.js","assets/view-C5c_xCp7.css","assets/wardrobe-BawIX6ue.js","assets/wires-CJDZ0uzE.js","index.html","manifest.webmanifest"];

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
