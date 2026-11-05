/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw418zyi-70919d8';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BwUqjpOM.js","assets/app-XqbHJnTt.js","assets/arrangeCare-BYg5t68J.js","assets/art-BBW_8CI7.js","assets/art-D2CYOy0j.js","assets/art-DXVSLFMm.js","assets/badge-CWs0J0Bp.js","assets/board-RwW0byUZ.js","assets/board-XtzwRxRo.css","assets/bouquet-Da6_t_lu.js","assets/braceletReveal-Dw0TMQlM.js","assets/career-D4Kjo_a9.css","assets/career-Dp9XH9yM.js","assets/careerGame-Dsjbh6zk.js","assets/casino-BbkC-tOa.js","assets/castle-BMvovhX-.css","assets/castle-CP6LP1vA.js","assets/cat-CnPwFpyI.js","assets/cat-DaPNr-Ui.css","assets/cat-XugnX108.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-So8btg7y.js","assets/chocolateBox-DyVMOE43.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DdxWl6Xi.js","assets/cinemaQuiz-DP0mLDzE.js","assets/common-33DL3qVU.js","assets/creativeUi-D6hgiWYH.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-1qBQYkrc.js","assets/decorTable-DxyLVVdR.js","assets/demo-DFhvYdh9.js","assets/drawing-tkdmtkrQ.js","assets/dressVerdict-D6NhPpLe.js","assets/dressing-ByRi5POh.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-CDgXBFCZ.js","assets/faceStudio-e8Y12Wa-.css","assets/family-CMTE_lkW.js","assets/family-gy-OT53v.css","assets/familyPick-0zrgWlcQ.js","assets/fans-BXo_QXE3.css","assets/fans-BvqKQFd-.js","assets/fashionThemes-Cn_V_uYl.js","assets/finale-sXJtUNC1.js","assets/fireworksPhoto-E1rJWRUK.js","assets/frame-C7WHcvAq.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Cu_6wiPl.js","assets/gallery-BX6aP4Yj.js","assets/garden-BbHvF0S7.js","assets/garden-BqpF5qhE.js","assets/garden-DazHrlMv.css","assets/garden-DhkguQSU.js","assets/garden-F7kkHr1y.js","assets/giftArt-CZs1Mei4.js","assets/guessMenu-Cc0MAr5e.js","assets/harness-Di4HFO1E.js","assets/host-qVavztIi.js","assets/hub-C4LbLexs.css","assets/hub-hk7H_EQJ.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-Bj0_lBKM.js","assets/index-BxH4z_Kw.js","assets/index-CLGad4UF.css","assets/index-CYWZJxLA.js","assets/index-CdkyDbuB.js","assets/index-DVBD-WNl.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Di2IP6PL.js","assets/index-Duo97Ixu.js","assets/index-jolZgkUr.css","assets/kit-BpY13J8d.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DMcdd9LZ.js","assets/memoryView-B3Foagoi.js","assets/menuPick-BCf852D4.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DlIkYLAh.js","assets/order-DObrwyFB.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-bmdnY4j9.js","assets/photoBooth-Zb68Ht4X.js","assets/photoShoot-CIrT8I6_.js","assets/plumbing-qWtZI18e.js","assets/promiseCard-DJznttYK.js","assets/push-cBnTpILU.js","assets/render-BMgcrKUC.js","assets/render-EPkldpjd.js","assets/reveal-LHNaX0yj.js","assets/rhythmDance-CHUetWdK.js","assets/rng-LLIeWRGS.js","assets/runtime-DT8UJ_LB.js","assets/scene-C7nCHeHi.css","assets/scene-Cf6WS-J-.js","assets/scene-CxyRx5j2.js","assets/scenes-Cz2ZgO7N.js","assets/session-BMPcJcsj.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DT6QCTyj.js","assets/spaRelax-DgdfvfsX.js","assets/store-WAIBhWbR.js","assets/styles-DDT62FZD.js","assets/thoughts-CMwyL2gR.js","assets/thoughts-lw9uL1wa.css","assets/tidy-B0DvgBSM.js","assets/touchDiag-DrPG7PVV.js","assets/ui-9V9NrfQI.js","assets/ui-B-8X5rjm.css","assets/ui-BmsVAJpi.js","assets/ui-BurU-WAR.css","assets/ui-CcXpQ0rv.js","assets/ui-D7rTILpt.js","assets/ui-DCQfaLXL.js","assets/ui-DZIyG4vF.js","assets/ui-Dh00YCAy.js","assets/ui-lYcYRYX_.js","assets/view-BQmGuCSK.js","assets/view-C5c_xCp7.css","assets/wardrobe-DuqoK2MB.js","assets/wires-Bu83N5_Q.js","index.html","manifest.webmanifest"];

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
