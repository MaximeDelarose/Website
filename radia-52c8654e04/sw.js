/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3o7b25-1ac5d01';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BoO7L1Km.js","assets/app-Dcp9_Vq0.js","assets/art-CUJ6dkJe.js","assets/art-Cgofv8Ve.js","assets/badge-BQ_oYBaG.js","assets/bouquet-BzO4MrJr.js","assets/braceletReveal-4sj14J36.js","assets/career-CayC8Du9.js","assets/career-D4Kjo_a9.css","assets/careerGame-DZ52YHf7.js","assets/casino-D6Mm7diI.js","assets/castle-BMvovhX-.css","assets/castle-DzzNUw-N.js","assets/cat-D0SOo2LW.js","assets/cat-DaPNr-Ui.css","assets/cat-kteuTptG.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-ByekpdZx.js","assets/chocolateBox-B34WdXKM.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-cnS76v56.js","assets/cinemaQuiz-Bfn2d063.js","assets/common-LKbYhrT8.js","assets/creativeUi-Dj2SkMpe.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-GeLGoie5.js","assets/decorTable-DVRfD3un.js","assets/demo-DFhvYdh9.js","assets/drawing-MVSYQJ4z.js","assets/dressVerdict-C3dk-ZHw.js","assets/dressing-DRvvLtmc.css","assets/dressing-DnkJ0P6y.js","assets/faceStudio-e8Y12Wa-.css","assets/faceStudio-iZeXoXNF.js","assets/family-CBjuFiV8.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DojeW-IV.js","assets/fashionThemes-jYwg-xJl.js","assets/finale-CIWhWmEO.js","assets/fireworksPhoto-yP33n6j9.js","assets/frame-BlCNllPW.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Cc7y5XLY.js","assets/gallery-H8Vbb6Tx.js","assets/garden-B-aOPqrb.js","assets/garden-Cl5D8q70.js","assets/garden-D4BJI0xh.js","assets/garden-DazHrlMv.css","assets/garden-ftKuCpJ1.js","assets/giftArt-wlhcRuat.js","assets/guessMenu-D-l73c6U.js","assets/harness-fxdYTXeB.js","assets/host-C0N4uaKv.js","assets/hub-C4LbLexs.css","assets/hub-zFaMjqiU.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-C4ZEvpKS.js","assets/index-CGvigThu.js","assets/index-CLGad4UF.css","assets/index-CTWw-A3H.js","assets/index-DJWsabqE.js","assets/index-DZKsou-S.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DvdBH2Ed.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/index-vnQo-Rrm.js","assets/kit-CTQxHusg.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CHBd9H-v.js","assets/memoryView-B7teH1Nb.js","assets/menuPick-De0zmhgs.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-MYEqQzHa.js","assets/order-rsRRD-HU.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-I3s9ePms.js","assets/photoBooth-Dz1D-3S2.js","assets/photoShoot-aCQaYwGP.js","assets/plumbing-BaLl4h6m.js","assets/promiseCard-C-JatpYp.js","assets/push-gkjhL-6W.js","assets/render-DvN6pzRl.js","assets/render-q21gjRl_.js","assets/reveal-Bnw_EreB.js","assets/rhythmDance-BpYjokbb.js","assets/rng-LLIeWRGS.js","assets/runtime-BMGwCGKu.js","assets/scene-Bc159Uy8.js","assets/scene-C7nCHeHi.css","assets/scene-Cp8kSdMm.js","assets/scenes-DA7mdBou.js","assets/session-DZwHBMOD.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CIxKGlYI.js","assets/spaRelax-B7uoGHS4.js","assets/store-DnDpaDiG.js","assets/styles-DDT62FZD.js","assets/thoughts-DhU6Yh_Q.js","assets/tidy-XsytQu8c.js","assets/touchDiag-BLZhYh9i.js","assets/ui-B-8X5rjm.css","assets/ui-BNMUouSt.js","assets/ui-BbvVvg41.js","assets/ui-BurU-WAR.css","assets/ui-BvQgY9xd.js","assets/ui-Byyt57z_.js","assets/ui-CI2V8ECt.js","assets/ui-Cdw4EU06.js","assets/ui-DZ3k0wyR.js","assets/ui-Df_iL2RP.js","assets/view-C5c_xCp7.css","assets/view-CyI1gBKT.js","assets/wardrobe-BRMzDnSw.js","assets/wires-BNEc-BLG.js","index.html","manifest.webmanifest"];

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
