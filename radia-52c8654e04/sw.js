/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3fvsvl-294561f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-r19HO3Hm.js","assets/app-D9Rg2KVH.js","assets/art-BfVnd2qf.js","assets/art-BorzATqR.js","assets/badge-Cq8uoCe5.js","assets/bouquet-Q9uhQBL9.js","assets/braceletReveal-Ckn_Ui3p.js","assets/career-C7GgxATr.js","assets/career-D4Kjo_a9.css","assets/careerGame-DdQVf9rF.js","assets/casino-1I-bT-r6.js","assets/castle-BMvovhX-.css","assets/castle-oR99eIvn.js","assets/cat-2JHnmyBT.js","assets/cat-B1zJQu-0.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-BGLAGNcV.js","assets/chocolateBox-DFhAD33K.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DA_mA-3b.js","assets/cinemaQuiz-B3CTzYer.js","assets/common-BbUilieV.js","assets/creativeUi-Biv8WiBu.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BY2ZDf6z.js","assets/decorTable-eqBiMNgJ.js","assets/demo-DFhvYdh9.js","assets/drawing-BaYLt9WA.js","assets/dressVerdict-f8STYc8h.js","assets/dressing-Ca5FdUO_.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-ZaY_v1mp.js","assets/faceStudio-e8Y12Wa-.css","assets/family-DUha5HR-.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-Ca8eBSsG.js","assets/fashionThemes-CTzfmHam.js","assets/finale-DMvKNp2V.js","assets/fireworksPhoto-BZCr6Cgu.js","assets/frame-BL3HfhJB.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-9epwvxhE.js","assets/gallery-BrPMUOPp.js","assets/garden-CEkZYx9u.js","assets/garden-DazHrlMv.css","assets/garden-Dc-6jCJ-.js","assets/garden-pT2ffBCV.js","assets/garden-qVAwZ_74.js","assets/giftArt-D8fj4tI3.js","assets/guessMenu-BmUVgBye.js","assets/harness-wZMP38Db.js","assets/host-B4TC5w0o.js","assets/hub-BYHz8jvW.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-AH41ImMI.js","assets/index-BRWvVPWG.css","assets/index-Ba6obvuA.js","assets/index-CLGad4UF.css","assets/index-DP5KdUn_.js","assets/index-DZV28E8t.css","assets/index-DZzZKoSd.js","assets/index-D_Bfde9M.css","assets/index-D_IYAA1E.js","assets/index-DdQRoeWP.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/index-wPPPZ28T.js","assets/kit-BU1s4XXe.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge--3fHJBal.js","assets/memoryView-5IERs21F.js","assets/menuPick-CaTurRDD.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-dStAM1Nb.js","assets/order-Ba4sHp9G.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Dgw40QA3.js","assets/photoBooth-CfHQLOob.js","assets/photoShoot-CsZfDQ84.js","assets/plumbing-C8qfOffh.js","assets/promiseCard-B2gP3Qt9.js","assets/push-Boa2NV3N.js","assets/render-CuwFzZqP.js","assets/render-kg8v8UDm.js","assets/reveal-DjcTOQgz.js","assets/rhythmDance-2lC5y8LT.js","assets/rng-LLIeWRGS.js","assets/runtime-BI_wBb3F.js","assets/scene-C7nCHeHi.css","assets/scene-COjzamU5.js","assets/scene-k6qOm-2n.js","assets/scenes-C8j6nIsT.js","assets/session-PZ9w2Ij6.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BDcQMwwM.js","assets/spaRelax-xaEtel5p.js","assets/store-ChhD0x6Q.js","assets/styles-DDT62FZD.js","assets/thoughts-BfYCfau7.js","assets/tidy-DEZUyth8.js","assets/touchDiag-B7wzk1ja.js","assets/ui-0-oinMis.js","assets/ui-4gBytSaO.js","assets/ui-B-8X5rjm.css","assets/ui-B4JL0vrQ.js","assets/ui-BSUBqFhx.js","assets/ui-BurU-WAR.css","assets/ui-C9fOUB6D.js","assets/ui-CMc8jHzn.js","assets/ui-D8XUY1ig.js","assets/ui-sSfJRF_a.js","assets/view-C5c_xCp7.css","assets/view-q_gH31cu.js","assets/wardrobe-CRIJDrQ9.js","assets/wires-BX4lSKG2.js","index.html","manifest.webmanifest"];

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
