/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3tmba4-d8e0dff';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-ChrmICuA.js","assets/app-wThrSWv3.js","assets/art-CJR0SYwp.js","assets/art-CeptNlOu.js","assets/art-n0r_KHP1.js","assets/badge-C4yogXcA.js","assets/board-CIuFOzEQ.js","assets/board-XtzwRxRo.css","assets/bouquet-yMMDEtQU.js","assets/braceletReveal-DHmv0Uv4.js","assets/career-CSebXkyN.js","assets/career-D4Kjo_a9.css","assets/careerGame-BKhbAvhC.js","assets/casino-DDz1aEQT.js","assets/castle-BMvovhX-.css","assets/castle-C94oJYCZ.js","assets/cat-DaPNr-Ui.css","assets/cat-DulCWiyH.js","assets/cat-haRQNqhg.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CFYjX0fO.js","assets/chocolateBox-kIsygXx-.js","assets/chocolaterie-CDwvWykP.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CG7NfFeN.js","assets/common-DS01-C_t.js","assets/creativeUi-D9JFq7YK.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-hN0XF62X.js","assets/decorTable-DdZk3OeW.js","assets/demo-DFhvYdh9.js","assets/drawing-C1PfAOfu.js","assets/dressVerdict-BkKLv8wU.js","assets/dressing-DPHlPJXj.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-Doa56SpW.js","assets/faceStudio-e8Y12Wa-.css","assets/family-D4QxvGpo.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DSFcxJXA.js","assets/fashionThemes-CUkGfLq4.js","assets/finale-Bywa2w41.js","assets/fireworksPhoto-CQA20Hge.js","assets/frame-bo9dGS3W.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-SxivTyKs.js","assets/gallery-DAtmsOED.js","assets/garden-BiU4LkZX.js","assets/garden-Caa61u2q.js","assets/garden-DXpKfDhq.js","assets/garden-DazHrlMv.css","assets/garden-s77IlgkY.js","assets/giftArt-DkDoUgVI.js","assets/guessMenu-Dje2B3SQ.js","assets/harness-BxICli_O.js","assets/host-D5uLpqNI.js","assets/hub-C4LbLexs.css","assets/hub-DKJE7jtz.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BbRU1NhI.js","assets/index-C2Mlmj-Y.js","assets/index-C3HMeAWT.js","assets/index-CLGad4UF.css","assets/index-CTfCqhCi.js","assets/index-D2dVs9pX.js","assets/index-DQyAOEPd.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-ZDm2Kruy.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-BYKViFNr.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DSTa9pl4.js","assets/memoryView-CF1OCIHX.js","assets/menuPick-DwHphZQc.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-D21mDvfK.js","assets/order-D-bxuLgp.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CuBpB0JT.js","assets/photoBooth-aq-6HPiq.js","assets/photoShoot-CaeIKWnN.js","assets/plumbing-BfHk__-x.js","assets/promiseCard-C_QYv7tX.js","assets/push-B_YRh8Hk.js","assets/render-1ayFDV9V.js","assets/render-Dunqrqe7.js","assets/reveal-BsjaYHaP.js","assets/rhythmDance-8Bcwm_GP.js","assets/rng-LLIeWRGS.js","assets/runtime-Bm2H1iRS.js","assets/scene-C7nCHeHi.css","assets/scene-CNoTsV9_.js","assets/scene-M-miXDZm.js","assets/scenes-C6UC9VBE.js","assets/session-CTaTIUIH.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-Bgm_vZor.js","assets/spaRelax-Dx9ZGdO6.js","assets/store-B9xpK_a6.js","assets/styles-DDT62FZD.js","assets/thoughts-F4dIzFOe.js","assets/tidy-MFRUdmOA.js","assets/touchDiag-Co3Du5Zb.js","assets/ui-2aeND1J3.js","assets/ui-B-8X5rjm.css","assets/ui-BIl-Ts-H.js","assets/ui-BurU-WAR.css","assets/ui-Ci-HQh24.js","assets/ui-D2vX0zFT.js","assets/ui-DtRe8u9X.js","assets/ui-DuO-JhvT.js","assets/ui-DualINTQ.js","assets/ui-WET7u4vG.js","assets/view-BFjiC5iv.js","assets/view-C5c_xCp7.css","assets/wardrobe-BnOVHUge.js","assets/wires-DuQyPA8B.js","index.html","manifest.webmanifest"];

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
