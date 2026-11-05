/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3ivwz0-e48d2a0';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CO4Og9WM.js","assets/app-DS3gGUQF.js","assets/art-8u-F7xLE.js","assets/art-DZB-3UNm.js","assets/badge-fxtAKozi.js","assets/bouquet-CTGcsreq.js","assets/braceletReveal-DxeG4G8f.js","assets/career-D4Kjo_a9.css","assets/career-MZHQtr6Q.js","assets/careerGame-DbTPloBM.js","assets/casino-D49y03QS.js","assets/castle-BMvovhX-.css","assets/castle-C6962nR6.js","assets/cat-D2AsSZJX.js","assets/cat-DB01akhg.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Ds2amXyQ.js","assets/chocolateBox-mRDnhoVs.js","assets/chocolaterie-BGsWKVa4.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-qHwVRdOB.js","assets/common-BkL2Voc0.js","assets/creativeUi-DyyXNSUq.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-axUEhpop.js","assets/decorTable-CTcDTI4F.js","assets/demo-DFhvYdh9.js","assets/drawing-B9AQ9xYJ.js","assets/dressVerdict-CvAPNkLa.js","assets/dressing-DOKFoNHU.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-CUgoNOKN.js","assets/faceStudio-e8Y12Wa-.css","assets/family-C0Yw-ga2.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-EeEUenuQ.js","assets/fashionThemes-DMzzHVd9.js","assets/finale-Dl6ZN0gr.js","assets/fireworksPhoto-BhZUhTkO.js","assets/frame-BV_A38Aa.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CtWRLIrQ.js","assets/gallery-D2a_gYWp.js","assets/garden-Bfghh9r4.js","assets/garden-CzVBN3dl.js","assets/garden-DazHrlMv.css","assets/garden-ELv86z3L.js","assets/garden-wKpgYQtY.js","assets/giftArt-Dertk9R0.js","assets/guessMenu-wW8HCgeJ.js","assets/harness-D9XjC4oU.js","assets/host-CDAH0AHA.js","assets/hub-6kkgwLyr.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BlZJJc5G.js","assets/index-C5P-iTS-.js","assets/index-CAPNuMen.js","assets/index-CLGad4UF.css","assets/index-D-zoGRFc.js","assets/index-D7ay6zAb.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dmik26Cw.js","assets/index-DzzcYu3t.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-CvwAySrJ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-m01H8VzA.js","assets/memoryView-C81mIUpy.js","assets/menuPick-fTnBqGNU.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-C6ABLawP.js","assets/order-Dyeeyoio.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-D570Jslc.js","assets/photoBooth-83Kg7SUU.js","assets/photoShoot-DPBFLpc3.js","assets/plumbing-Dglljbtj.js","assets/promiseCard-CrQVa686.js","assets/push-DTx5Xtpo.js","assets/render-CfWl44rJ.js","assets/render-cc2w6YNI.js","assets/reveal-Cq8cDV5x.js","assets/rhythmDance-gvuxGUb8.js","assets/rng-LLIeWRGS.js","assets/runtime-B5bwWZof.js","assets/scene-C7nCHeHi.css","assets/scene-CXRspznf.js","assets/scene-Cd-WCPQA.js","assets/scenes-DjdFwkIV.js","assets/session-CTIpq9cU.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-VnLUu9Ae.js","assets/spaRelax-GvpcGNic.js","assets/store-iwDMhYGs.js","assets/styles-DDT62FZD.js","assets/thoughts-QWCCHND9.js","assets/tidy-Cdu04Rwl.js","assets/touchDiag-CLuPgECT.js","assets/ui-B-8X5rjm.css","assets/ui-BacjDjxu.js","assets/ui-BurU-WAR.css","assets/ui-CiVPI1UQ.js","assets/ui-DQFpftZM.js","assets/ui-DZlGE2J6.js","assets/ui-DwVTc8tK.js","assets/ui-DwdVLrx8.js","assets/ui-u22z_So7.js","assets/ui-yZLEvfAD.js","assets/view-C5c_xCp7.css","assets/view-D5ZdC1DU.js","assets/wardrobe-B6MY9Eub.js","assets/wires-nSBnqI9_.js","index.html","manifest.webmanifest"];

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
