/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3ukfjh-0bce311';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DAbxuNW_.js","assets/app-CEk9gUmG.js","assets/arrangeCare-CRfgGKi6.js","assets/art-BrIgm_M7.js","assets/art-e-6PwV3c.js","assets/art-krq_KEUW.js","assets/badge-iJduWZrI.js","assets/board-CGvW8nNo.js","assets/board-XtzwRxRo.css","assets/bouquet-2Zvw_xoG.js","assets/braceletReveal-CWcWFxSy.js","assets/career-D4Kjo_a9.css","assets/career-Jssp89K8.js","assets/careerGame-CgCUdx8n.js","assets/casino-K2DxqroF.js","assets/castle-BMvovhX-.css","assets/castle-O2-qs0bF.js","assets/cat-DCoyMUVc.js","assets/cat-DaPNr-Ui.css","assets/cat-Lg5Oqb3U.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-B1WQrQJC.js","assets/chocolateBox-DzzxylVr.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-yT72-xzA.js","assets/cinemaQuiz-BuKFMlJw.js","assets/common-CsKOhczX.js","assets/creativeUi-DyiuUkTj.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-ClCY-Yg7.js","assets/decorTable-Dij_CA6E.js","assets/demo-DFhvYdh9.js","assets/drawing-DptYErDL.js","assets/dressVerdict-OXsQhODD.js","assets/dressing-BwuqwLms.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-Cs2GLgXv.js","assets/faceStudio-e8Y12Wa-.css","assets/family-gy-OT53v.css","assets/family-vXiztdvv.js","assets/familyPick-BhPJhp4u.js","assets/fans-BXo_QXE3.css","assets/fans-CWGVKV7s.js","assets/fashionThemes-D1VHXiVr.js","assets/finale-DrEztwVg.js","assets/fireworksPhoto-DvwRQ2dS.js","assets/frame-2ExS-Ge-.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CCkMwtKE.js","assets/gallery-C8Q_anyC.js","assets/garden-Bxl8kD3C.js","assets/garden-DUJi2i8w.js","assets/garden-DazHrlMv.css","assets/garden-FbBWYEJJ.js","assets/garden-IXtoTNBq.js","assets/giftArt-CWCnEc_b.js","assets/guessMenu-XzgatiIe.js","assets/harness-D7c4cNOs.js","assets/host-B31Vlh29.js","assets/hub-C4LbLexs.css","assets/hub-CdV4JY9g.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bf90GqRh.js","assets/index-BzZA-CdJ.js","assets/index-CB3bQo0O.js","assets/index-CLGad4UF.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dpd82nJc.js","assets/index-Dptariwt.js","assets/index-EEkpP4JA.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/index-mu90j5iR.js","assets/kit-CBaQvahA.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-D7TdKHnt.js","assets/memoryView-CaRUqaD4.js","assets/menuPick-r1sHBmHY.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CqwCqmgN.js","assets/order-CZg2n6-g.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Cp_Q9iLj.js","assets/photoBooth-HGVz7TeJ.js","assets/photoShoot-DJLSdBXK.js","assets/plumbing-BQquTq03.js","assets/promiseCard-CZjtw37u.js","assets/push-DyeD7I5v.js","assets/render-CJRr686g.js","assets/render-DHDoJxw6.js","assets/reveal-DyaKymA9.js","assets/rhythmDance-hxTro3lT.js","assets/rng-LLIeWRGS.js","assets/runtime-CjC2ff55.js","assets/scene-C7nCHeHi.css","assets/scene-DbNqdkUS.js","assets/scene-VA9g1jzk.js","assets/scenes-BqyhLN45.js","assets/session-Cqd3U-3h.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CP46K4F2.js","assets/spaRelax-DM-paYdh.js","assets/store-DP8-nfUM.js","assets/styles-DDT62FZD.js","assets/thoughts-DP743db-.js","assets/tidy-CHcAHpVo.js","assets/touchDiag-8bBLg9Ap.js","assets/ui-B-8X5rjm.css","assets/ui-BcClLEb3.js","assets/ui-BurU-WAR.css","assets/ui-C1PccEfF.js","assets/ui-C9RgSsnT.js","assets/ui-C9SCMD_G.js","assets/ui-CKyrVJFH.js","assets/ui-CPmEnySQ.js","assets/ui-Cl9xQTvF.js","assets/ui-DRnTbRLy.js","assets/view-C5c_xCp7.css","assets/view-Cqzug_NJ.js","assets/wardrobe-BQqkmDa_.js","assets/wires-BLVAPUD_.js","index.html","manifest.webmanifest"];

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
