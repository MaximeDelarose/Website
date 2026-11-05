/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3vg8rm-9f51ca4';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Bjs5YvI-.js","assets/app-DsoRdTMV.js","assets/arrangeCare-Dcc1yfkq.js","assets/art-BHfGd4-_.js","assets/art-BdwptG_V.js","assets/art-DqpuTKvn.js","assets/badge-BOPAHu-0.js","assets/board-BAC7dKdI.js","assets/board-XtzwRxRo.css","assets/bouquet-BXAElqZ0.js","assets/braceletReveal--z-WwdoW.js","assets/career-D4Kjo_a9.css","assets/career-gXuw_er4.js","assets/careerGame-ZrttRqNy.js","assets/casino-C0CiFXyt.js","assets/castle-BMvovhX-.css","assets/castle-Dc_t9jgB.js","assets/cat-BNAhA6_G.js","assets/cat-DaPNr-Ui.css","assets/cat-Dn7D8Tf8.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-9S88-QS2.js","assets/chocolateBox-CdvMCRzA.js","assets/chocolaterie-CmDBclOt.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-BChyWOyc.js","assets/common-DZ6CGyGC.js","assets/creativeUi-B7N3VHxI.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DtLUb4Jf.js","assets/decorTable-PpSAiyfh.js","assets/demo-DFhvYdh9.js","assets/drawing-CsA385o9.js","assets/dressVerdict-8VxiRoae.js","assets/dressing-CMNfD0WO.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-C6pDqbBs.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BtpgLmzc.js","assets/family-gy-OT53v.css","assets/familyPick-DhmwFG3x.js","assets/fans-BXo_QXE3.css","assets/fans-DTCyqdzb.js","assets/fashionThemes-CBpAX7_2.js","assets/finale-NnhckMOW.js","assets/fireworksPhoto-CkLkPyze.js","assets/frame-ec3z9IWa.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Csyy8h5E.js","assets/gallery-CtNLq19i.js","assets/garden-BHBBaNwG.js","assets/garden-CZufouEh.js","assets/garden-CimytTG9.js","assets/garden-D58zC34e.js","assets/garden-DazHrlMv.css","assets/giftArt-DQj9whaX.js","assets/guessMenu-CwOCAjAD.js","assets/harness-BcZY64wp.js","assets/host-BgwZ6Rqb.js","assets/hub-C4LbLexs.css","assets/hub-fbJ9rWI8.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BCr6w6iZ.js","assets/index-BRWvVPWG.css","assets/index-B_DWsgQ0.js","assets/index-BiQ-H6VD.js","assets/index-C4lyxz9G.js","assets/index-CCsr0Q_G.js","assets/index-CLGad4UF.css","assets/index-D0pFRWHI.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-hilM1m_q.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-v0zBCDi_.js","assets/memoryChallenge-DDW0X7zY.js","assets/memoryView-qRUpZXgy.js","assets/menuPick-Dvrw5dsX.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CHwgPlgM.js","assets/order-_rsf7xqy.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Dr6Z4jcu.js","assets/photoBooth-CBQyY8x3.js","assets/photoShoot-DO7WvXRx.js","assets/plumbing-BR9wtAPy.js","assets/promiseCard-BEI09gjp.js","assets/push-DSS6kFz7.js","assets/render-CC3plQ1P.js","assets/render-Dlwkfh4c.js","assets/reveal-C4Li8M50.js","assets/rhythmDance-BCvE42fZ.js","assets/rng-LLIeWRGS.js","assets/runtime-BgkTjhk2.js","assets/scene-Bs0LZ-V0.js","assets/scene-C7nCHeHi.css","assets/scene-CXHeoj7Z.js","assets/scenes-DkNUjXqQ.js","assets/session-B4IDH9zO.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DFWTyxHk.js","assets/spaRelax-yZbh_HDj.js","assets/store-SWEtoeFW.js","assets/styles-DDT62FZD.js","assets/thoughts-eIh8lTL-.js","assets/tidy-ssfhPA9J.js","assets/touchDiag-BIJvAd80.js","assets/ui-B-8X5rjm.css","assets/ui-B5cZWXZe.js","assets/ui-B7rpcPFC.js","assets/ui-B8t6-roY.js","assets/ui-BVzwLdYC.js","assets/ui-BdfJtjkA.js","assets/ui-BurU-WAR.css","assets/ui-C1oNZKmT.js","assets/ui-DFWdtJ2v.js","assets/ui-uU7jppww.js","assets/view-C5c_xCp7.css","assets/view-CdPc3PJk.js","assets/wardrobe-Dg5kEpAO.js","assets/wires-DMeOG8DY.js","index.html","manifest.webmanifest"];

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
