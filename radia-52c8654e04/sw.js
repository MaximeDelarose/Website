/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3ec155-24587f0';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DEX8-z8-.js","assets/app-DmhONElj.js","assets/art-CAB-PiJx.js","assets/art-CMSNa4Vr.js","assets/badge-CpCjzvaV.js","assets/bouquet-Cy5dlLn7.js","assets/braceletReveal-Be1jzPvr.js","assets/career-BFgYwVXn.js","assets/career-D4Kjo_a9.css","assets/careerGame-BrapkpoD.js","assets/casino-Cn7eFt39.js","assets/castle-BMvovhX-.css","assets/castle-C2hfpbSo.js","assets/cat-D1TVRaZw.js","assets/cat-DaPNr-Ui.css","assets/cat-Di8R7I1q.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-C9fvnXmx.js","assets/chocolateBox-CvKDTAJP.js","assets/chocolaterie-BkbY2eU2.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CtQRkZSK.js","assets/common-PvDpKcw5.js","assets/creativeUi-dQZflxJD.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-_smTgZlT.js","assets/decorTable-DPJduJSu.js","assets/demo-DFhvYdh9.js","assets/drawing-C1PLB_j6.js","assets/dressVerdict-CHIVETzl.js","assets/dressing-DK0rDIsu.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-D5Xn-VtU.js","assets/faceStudio-e8Y12Wa-.css","assets/family-CEckQ2xh.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-JewunCm3.js","assets/fashionThemes-C2TpsEjJ.js","assets/finale-Fi6pdDUB.js","assets/fireworksPhoto-DkfJxycL.js","assets/frame-CroYYlKj.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-kKHk-Lov.js","assets/gallery-DdtSa1M9.js","assets/garden-BIi7hMxh.js","assets/garden-BQ7GNn4m.js","assets/garden-BomD2O2J.js","assets/garden-CZZMK86g.js","assets/garden-DazHrlMv.css","assets/giftArt-YN_gkNvd.js","assets/guessMenu-BMDNI70g.js","assets/harness-DEU-fNQv.js","assets/host-CAvaCMCQ.js","assets/hub-C4LbLexs.css","assets/hub-CLDu1YEH.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-CIDpZBiD.js","assets/index-CLGad4UF.css","assets/index-CTK_SHxz.js","assets/index-CZmWpp8A.js","assets/index-CbCUVEsF.js","assets/index-DGCR6Qsb.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-J1HE7Xiw.js","assets/index-T19_NXmO.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-BGVhlT3j.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-jS3bvkgF.js","assets/memoryView-BPboXmUE.js","assets/menuPick-4g3x5xX1.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BO_DrKkp.js","assets/order-CGmz3xsH.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DZZHCFml.js","assets/photoBooth-BbtW2txb.js","assets/photoShoot-CCJymL1_.js","assets/plumbing-Bdlbcm7j.js","assets/promiseCard-Bty_bcbt.js","assets/push-Y2--vyYs.js","assets/render-CvQRpXCK.js","assets/render-F5SdDIA8.js","assets/reveal-Cg22m4i3.js","assets/rhythmDance-CdDmT0HS.js","assets/rng-LLIeWRGS.js","assets/runtime-x3UfyyYC.js","assets/scene-C7nCHeHi.css","assets/scene-CCkX14FV.js","assets/scene-Cn77KvFW.js","assets/scenes-DmcoO6q2.js","assets/session-Dc2Dq8Cc.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-D-3yT_ue.js","assets/spaRelax-DkJVPH1f.js","assets/store-DlF8-PRo.js","assets/styles-DDT62FZD.js","assets/thoughts-tnfxBZPS.js","assets/tidy-BUJPxnso.js","assets/touchDiag-Cz7Sc8Wq.js","assets/ui-B-8X5rjm.css","assets/ui-BIo70U-8.js","assets/ui-BZANhcBN.js","assets/ui-BcN_rhtv.js","assets/ui-BurU-WAR.css","assets/ui-DDTvSUjT.js","assets/ui-DEcat-Yd.js","assets/ui-Dm5lxpUW.js","assets/ui-OyO2tlSe.js","assets/ui-Yuh202dK.js","assets/view-C5c_xCp7.css","assets/view-Cx-DmiNW.js","assets/wardrobe-BcGGSlBl.js","assets/wires-ChDoVVCn.js","index.html","manifest.webmanifest"];

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
