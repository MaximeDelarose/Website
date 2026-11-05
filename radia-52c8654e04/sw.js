/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3sktv4-2fa9e59';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DbDlm0jR.js","assets/app-DQ-EOz4j.js","assets/art-B2yvz_LY.js","assets/art-DxVeCVMq.js","assets/art-hBVHze12.js","assets/badge-Do5bYs4M.js","assets/board-BLTRhUXS.js","assets/board-XtzwRxRo.css","assets/bouquet-CGXmoIVl.js","assets/braceletReveal-CrvpRoq3.js","assets/career-D33-l8T8.js","assets/career-D4Kjo_a9.css","assets/careerGame-BRK4l6A1.js","assets/casino-BRtJkGX3.js","assets/castle-BGceTWq6.js","assets/castle-BMvovhX-.css","assets/cat-B17wDB8g.js","assets/cat-DaPNr-Ui.css","assets/cat-U2vvD5FN.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CaqJwl5J.js","assets/chocolateBox-Cx4apFEG.js","assets/chocolaterie-C6nxKVGP.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-D46-21Bb.js","assets/common-DWKLiV0L.js","assets/creativeUi-DiHFS0Xy.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DYYUiHfJ.js","assets/decorTable-DB5x4Z8J.js","assets/demo-DFhvYdh9.js","assets/drawing-HRRKkjsC.js","assets/dressVerdict-DlEn0h7w.js","assets/dressing-CYldOaa-.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-BnMj8hwv.js","assets/faceStudio-e8Y12Wa-.css","assets/family-ChDn37lz.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-CU5w6Kz6.js","assets/fashionThemes-D6iAnMFb.js","assets/finale-DjnwKV3a.js","assets/fireworksPhoto-QUdr6Q0R.js","assets/frame-DthLUvxs.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DX93SYTI.js","assets/gallery-BZK7ng9p.js","assets/garden-B5e7Lxtj.js","assets/garden-CPNm6-6f.js","assets/garden-DX-bAQTf.js","assets/garden-DazHrlMv.css","assets/garden-jAAJx2VZ.js","assets/giftArt-CIkh8rxt.js","assets/guessMenu-Bpvk3Der.js","assets/harness-Fhw2_pdg.js","assets/host-DUbWmuTd.js","assets/hub-C4LbLexs.css","assets/hub-Dm1yTFMI.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-1TMwuGOg.js","assets/index-B5CPO5fC.js","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-DA23qi55.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DrpomYn7.js","assets/index-DuvjLSE4.js","assets/index-EimyChhh.js","assets/index-fqTIq09P.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-D01VrFXQ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-Y5IJiyLZ.js","assets/memoryView-7ePNe2C2.js","assets/menuPick-CYx7omSB.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CkbgbGY4.js","assets/order-BAVwngP2.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-tJmJOuZw.js","assets/photoBooth-CPbPFqtp.js","assets/photoShoot-5AcRbu0S.js","assets/plumbing-Dtz3wIpX.js","assets/promiseCard-CoxlYFMD.js","assets/push-DXfjJvKM.js","assets/render-B9hptY9O.js","assets/render-BzhJEIkk.js","assets/reveal-CJ2AwwsO.js","assets/rhythmDance-ClYrNzN5.js","assets/rng-LLIeWRGS.js","assets/runtime-Dsn_QiYr.js","assets/scene-C7nCHeHi.css","assets/scene-CGGzrQBU.js","assets/scene-Dn5tI8eD.js","assets/scenes-CfGxVmzN.js","assets/session-DaLVlJSH.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-xkgeOQL3.js","assets/spaRelax-cgA2yh2D.js","assets/store-Bks8XbA_.js","assets/styles-DDT62FZD.js","assets/thoughts-Y51JkFOL.js","assets/tidy-BIAklKz9.js","assets/touchDiag-B2t4OhJB.js","assets/ui-4jBA8iAs.js","assets/ui-B-8X5rjm.css","assets/ui-BSHQtotK.js","assets/ui-BurU-WAR.css","assets/ui-CJ2rU4UA.js","assets/ui-CLweNJ_x.js","assets/ui-CN8uI8ZL.js","assets/ui-CqvaB8Lj.js","assets/ui-DQB1gKZN.js","assets/ui-HH3vDp6g.js","assets/view-C5c_xCp7.css","assets/view-DXdYoeUp.js","assets/wardrobe-BKfG6kD6.js","assets/wires-BvLCdLfh.js","index.html","manifest.webmanifest"];

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
