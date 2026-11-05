/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3kjpjb-289067e';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CMVHAkOb.js","assets/app-DXjirfod.js","assets/art-C702HbKc.js","assets/art-DOJaDtGe.js","assets/badge-jbNo5jrF.js","assets/bouquet-CjQOdt8q.js","assets/braceletReveal-C--TNC30.js","assets/career-B4aaKVEO.js","assets/career-D4Kjo_a9.css","assets/careerGame-B4UDt2k2.js","assets/casino-CHJcslDH.js","assets/castle-BMvovhX-.css","assets/castle-CsY3Cdz1.js","assets/cat-6mnce17P.js","assets/cat-DaPNr-Ui.css","assets/cat-Dd8LpiOy.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DsZXfZaA.js","assets/chocolateBox-XvDvKU0Q.js","assets/chocolaterie-ATNp6rSO.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-C0dVFpe-.js","assets/common-DP1TIZ3Z.js","assets/creativeUi-BteGex-m.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CcpDK8FJ.js","assets/decorTable-o-qHEWgj.js","assets/demo-DFhvYdh9.js","assets/drawing-DJZvJ1M3.js","assets/dressVerdict-D3vIuhcj.js","assets/dressing-DRvvLtmc.css","assets/dressing-DtIjKnmp.js","assets/faceStudio-DcfsG40S.js","assets/faceStudio-e8Y12Wa-.css","assets/family-Bii9WOpe.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-m4ZlWjk7.js","assets/fashionThemes-ZaQ4JXYN.js","assets/finale-a0JiCevJ.js","assets/fireworksPhoto-1L5Hu43w.js","assets/frame-CkY0hTWc.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-NuUzQt5x.js","assets/gallery-1a27yInu.js","assets/garden-8OCsnulM.js","assets/garden-BEiH2nmb.js","assets/garden-C4ncogIe.js","assets/garden-DazHrlMv.css","assets/garden-xy7VQ7Vo.js","assets/giftArt-94HLzNxK.js","assets/guessMenu-DbS6XsDx.js","assets/harness-DDL27FIZ.js","assets/host-jXeHDxZq.js","assets/hub-C-wVy3Q3.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-B_5c1BnG.js","assets/index-BrPb1Gx1.js","assets/index-CLGad4UF.css","assets/index-CruKLNiD.js","assets/index-DFVpU_MI.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DeLtDPsS.js","assets/index-Dzgt6t2H.js","assets/index-dC3TsRg5.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-OsS_PhuF.js","assets/memoryChallenge-BWLTBxSK.js","assets/memoryView-CGq3sPIu.js","assets/menuPick-BK9-dffF.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DmeqCpA1.js","assets/order-DJtNXIru.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BcTEeFCp.js","assets/photoBooth-BaYun5F7.js","assets/photoShoot-nptPBBvE.js","assets/plumbing-D2bnD7vj.js","assets/promiseCard-5igQNe-E.js","assets/push-DDhXF2oW.js","assets/render-BPNQLxQw.js","assets/render-sznJSW7v.js","assets/reveal-JYrQNJqb.js","assets/rhythmDance-BqYSNsuV.js","assets/rng-LLIeWRGS.js","assets/runtime-Caqplggj.js","assets/scene-C7nCHeHi.css","assets/scene-D2sTjGRZ.js","assets/scene-o1cMCAwY.js","assets/scenes-CqOWZCRl.js","assets/session-B8PHf0Zz.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-c17tTHNg.js","assets/spaRelax-vnUYPoua.js","assets/store--7FgS0Vk.js","assets/styles-DDT62FZD.js","assets/thoughts-BlL8nlb2.js","assets/tidy-DTGhNvvE.js","assets/touchDiag-BUy12gYy.js","assets/ui-4AYSgOZP.js","assets/ui-B-8X5rjm.css","assets/ui-BB2KCy1c.js","assets/ui-BOsDs7sg.js","assets/ui-BfEScNd6.js","assets/ui-BurU-WAR.css","assets/ui-DLtttE9H.js","assets/ui-DZ3-CSGI.js","assets/ui-FKBCbZcP.js","assets/ui-U_4DvJ6c.js","assets/view-C5c_xCp7.css","assets/view-DzdBxEsC.js","assets/wardrobe-BzvflvQz.js","assets/wires-CvHbi-Vd.js","index.html","manifest.webmanifest"];

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
