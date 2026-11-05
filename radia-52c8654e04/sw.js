/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3n3gol-97c9cc2';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CWsiViJk.js","assets/app-DbzPNofD.js","assets/art-B3OqB8yF.js","assets/art-Cszzxhyq.js","assets/badge-B2C008B_.js","assets/bouquet-jpJNdeGk.js","assets/braceletReveal-Clk1oiMX.js","assets/career-B0OYg1MJ.js","assets/career-D4Kjo_a9.css","assets/careerGame-xivIPcG9.js","assets/casino-DXwhYbRD.js","assets/castle-BMvovhX-.css","assets/castle-Cspk490I.js","assets/cat-B0bXUdN8.js","assets/cat-BFCOmzvN.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-BAD0baTY.js","assets/chocolateBox-CuShgtqu.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DZ4IIxCk.js","assets/cinemaQuiz-y-Lvph5E.js","assets/common-DtNg5Uhr.js","assets/creativeUi-DvWVApb3.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-UlJLwIR3.js","assets/decorTable-CBVSgdNp.js","assets/demo-DFhvYdh9.js","assets/drawing-npESStvx.js","assets/dressVerdict-oO-PfbRj.js","assets/dressing-DRvvLtmc.css","assets/dressing-pm6WOVEU.js","assets/faceStudio-BbmP8E29.js","assets/faceStudio-e8Y12Wa-.css","assets/family-CRzzoppM.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-CEpiIdQ0.js","assets/fashionThemes-Bi9rvDHh.js","assets/finale-Wid5JqB_.js","assets/fireworksPhoto-DseTfN6l.js","assets/frame-Dv3DasVX.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BYrTcTGu.js","assets/gallery-CmQepRWs.js","assets/garden-BXtViBfX.js","assets/garden-DazHrlMv.css","assets/garden-DmAKDgkW.js","assets/garden-jsqCSES1.js","assets/garden-zRPfUMY0.js","assets/giftArt-gNs_aF3s.js","assets/guessMenu-CA0o_Mwb.js","assets/harness-CCS3Ri4I.js","assets/host-Deexz2zC.js","assets/hub-Aodxp502.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-C_UmU60z.js","assets/index-Ce13_kk2.js","assets/index-CeREpJKV.js","assets/index-DBMBBNFZ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dq8XFWW1.js","assets/index-DsHXeHPR.js","assets/index-NJjKzR3q.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-BrcZcPQf.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-BdTBlPqG.js","assets/memoryView-CsNyLGoh.js","assets/menuPick-Bx1nulIc.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Cq-bIFjd.js","assets/order-ihFq_Qpn.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/headp-radia.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-kjF57y8u.js","assets/photoBooth-DMQhjAzP.js","assets/photoShoot-Bn81WXyS.js","assets/plumbing-DrCcwSdW.js","assets/promiseCard-9NMIMLp7.js","assets/push-DNB-FqUc.js","assets/render-DAUrTAXS.js","assets/render-DXFWNhy5.js","assets/reveal-CC8JhSjm.js","assets/rhythmDance-Cc6jsVdj.js","assets/rng-LLIeWRGS.js","assets/runtime-BCr4OI00.js","assets/scene-C7nCHeHi.css","assets/scene-SxrI4hrh.js","assets/scene-crPAH1Bv.js","assets/scenes-CfWbJTk3.js","assets/session-BS7iEebG.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BD4Ygej5.js","assets/spaRelax-DD8yrM7Q.js","assets/store-ByZOBJCk.js","assets/styles-DDT62FZD.js","assets/thoughts-Gfi-kvfq.js","assets/tidy-C_T-Hx4C.js","assets/touchDiag-BiVc5ark.js","assets/ui-B-8X5rjm.css","assets/ui-BurU-WAR.css","assets/ui-Cxsh5fX-.js","assets/ui-D1AkWC38.js","assets/ui-DLSIC9kZ.js","assets/ui-DcDAabP6.js","assets/ui-JPIX9kqI.js","assets/ui-eBFVvmTo.js","assets/ui-gTrD2FoC.js","assets/ui-sovhs5KJ.js","assets/view-C5c_xCp7.css","assets/view-CZQCIOCG.js","assets/wardrobe-BYcE0gPv.js","assets/wires-Bs-H3t-C.js","index.html","manifest.webmanifest"];

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
