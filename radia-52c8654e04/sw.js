/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3dnzyr-03256ce';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-D5GQiIVC.js","assets/app-BYTRy0P_.js","assets/art-CMqjo-vd.js","assets/art-CwPuBoD2.js","assets/badge-D_onetSW.js","assets/bouquet-D7RFV21x.js","assets/braceletReveal-BbFa-pRH.js","assets/career-D4Kjo_a9.css","assets/career-UkCMwf0q.js","assets/careerGame-BSTkZ4ZG.js","assets/casino-ge9AJs33.js","assets/castle-BMvovhX-.css","assets/castle-Q3h4akOh.js","assets/cat-D9-RHVgG.js","assets/cat-DaPNr-Ui.css","assets/cat-ZjM88lJ9.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BVVxYOvJ.js","assets/chocolateBox-DKX0Z0FI.js","assets/chocolaterie-BX22SiI6.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-GR084PS3.js","assets/common-Le7fI1ZV.js","assets/creativeUi-DHCgK0hP.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DBlFw1cQ.js","assets/decorTable-CkOdITMf.js","assets/demo-DFhvYdh9.js","assets/drawing-DmL7gOJN.js","assets/dressVerdict-BO097nGa.js","assets/dressing-BZh1_16i.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-CxJcZXpI.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BP7rCUpm.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-CdasxhG6.js","assets/fashionThemes-D_BTVECC.js","assets/finale-Bi7MPRbr.js","assets/fireworksPhoto-Bsytvm6u.js","assets/frame-DUKqBaRp.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CkuSeAsF.js","assets/gallery-DPu1it7a.js","assets/garden-BZh329eP.js","assets/garden-BkDB8FnZ.js","assets/garden-CJmRl4QR.js","assets/garden-DazHrlMv.css","assets/garden-DdoM0TcK.js","assets/giftArt-Ctv0oYvy.js","assets/guessMenu-C9rs54XW.js","assets/harness-DX1jSSEf.js","assets/host-BCkciYfu.js","assets/hub-BnOdme-p.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-4kXlN1WM.js","assets/index-B6f6Dhf-.js","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-CWFj5xRt.js","assets/index-Cdu-MsjN.js","assets/index-CuOwuj3b.js","assets/index-CwBK7iDW.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-aLJFCkly.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-BjHxOt9C.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-Co5vZOYE.js","assets/memoryView-BiA97oVD.js","assets/menuPick-DI1LTktM.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CIWc-H3m.js","assets/order-lFsxrqSz.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-yz4ychb_.js","assets/photoBooth-BG_75oPI.js","assets/photoShoot-B6Tbk7Bo.js","assets/plumbing-DQJa8S1M.js","assets/promiseCard-DHnjVqyO.js","assets/push-Dwv0dFfS.js","assets/render-DgPkiMD5.js","assets/render-Ds05VgQD.js","assets/reveal-oK0apTiP.js","assets/rhythmDance-8wUe1mTi.js","assets/rng-LLIeWRGS.js","assets/runtime-kQt8uCPn.js","assets/scene-BYd-IPlF.js","assets/scene-BnWvPOwS.js","assets/scene-C7nCHeHi.css","assets/scenes-BAIJXuQd.js","assets/session-McSuzvIz.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-n5CJPQmZ.js","assets/spaRelax-Dtyrh6Ch.js","assets/store-CJo27Kbn.js","assets/styles-DDT62FZD.js","assets/thoughts-C0JXP-lE.js","assets/tidy-BEUsKrjP.js","assets/touchDiag-CP94X45x.js","assets/ui-B-8X5rjm.css","assets/ui-BQPOr0HJ.js","assets/ui-BqSTmLLH.js","assets/ui-BurU-WAR.css","assets/ui-C-NwiZqW.js","assets/ui-C1hNFtih.js","assets/ui-CKAeT6U0.js","assets/ui-DpHwaGOr.js","assets/ui-SvD5OjDz.js","assets/ui-snVcohOQ.js","assets/view-Bckyah_2.js","assets/view-C5c_xCp7.css","assets/wardrobe-Dddp9k7D.js","assets/wires-Cadmjwx6.js","index.html","manifest.webmanifest"];

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
