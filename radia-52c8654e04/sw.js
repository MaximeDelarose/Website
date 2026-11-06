/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw4rifal-4d3ff00';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Dqoq9Crg.js","assets/app-vu_fg4QF.js","assets/arrangeCare-BuF2VQOo.js","assets/art-DI9UW__C.js","assets/art-DMIbbWcp.js","assets/art-DONZ4EJK.js","assets/badge-B0DrJcBS.js","assets/board-Dho9xJdw.js","assets/board-XtzwRxRo.css","assets/bouquet-CpTdYHWL.js","assets/braceletReveal-BGI-EqxP.js","assets/career-D3yxoSQW.js","assets/career-D4Kjo_a9.css","assets/careerGame-ChQZU4Fc.js","assets/casino-D_eUiXvo.js","assets/castle-BMvovhX-.css","assets/castle-C2dum9u_.js","assets/cat-BOBQE5I8.js","assets/cat-DaPNr-Ui.css","assets/cat-_yhnYyei.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DcxzwT3X.js","assets/chocolateBox-1bSAUwgo.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-Dbs7BB_g.js","assets/cinemaQuiz-6Krnvhbu.js","assets/common-DR-iceEm.js","assets/creativeUi-d5fmlU-M.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-C947q4Ta.js","assets/decorTable--wS4rTch.js","assets/demo-DFhvYdh9.js","assets/drawing-DwdqCXIv.js","assets/dressVerdict-gbYSB00V.js","assets/dressing-DRvvLtmc.css","assets/dressing-KLaQVcxb.js","assets/faceStudio-B9Xa0Wdh.js","assets/faceStudio-e8Y12Wa-.css","assets/family-DvLgI1iM.js","assets/family-gy-OT53v.css","assets/familyPick-CrV3Cdpb.js","assets/fans-BXo_QXE3.css","assets/fans-CzuKDcJl.js","assets/fashionThemes-C3GdhAwH.js","assets/finale-yUh4xqt8.js","assets/fireworksPhoto-CM_ZqovI.js","assets/frame-Bn_qijpR.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CfIrXbtY.js","assets/gallery-CWR9t7nZ.js","assets/garden-CBX2A-V7.js","assets/garden-CFNCrB9d.js","assets/garden-CQEyWxvd.js","assets/garden-DazHrlMv.css","assets/garden-Qed6bBLI.js","assets/giftArt-Bg62mLDQ.js","assets/guessMenu-Cw_jPsKy.js","assets/harness-DxO7bbWP.js","assets/host-BkhTNkLq.js","assets/hub-BulDjVp1.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BZMLzQao.js","assets/index-Bgp_CR3j.css","assets/index-BmTxzCds.js","assets/index-CLGad4UF.css","assets/index-CcpWjKqu.js","assets/index-CrreLyWH.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-D_YT4wGu.js","assets/index-Dirp4Yfw.js","assets/index-KVyPXEil.js","assets/index-jolZgkUr.css","assets/kit-C4iO5K7W.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-B4bG0Rmr.js","assets/memoryView-Y3Ypwc0R.js","assets/menuPick-BMx2tWe-.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Bd4_j7V8.js","assets/order-DYQElqBT.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BjsxmbE9.js","assets/photoBooth-PxmFAc4o.js","assets/photoShoot-ClwhfcmL.js","assets/plumbing-Dv9sx6lM.js","assets/promiseCard-By_Ud2dk.js","assets/push-QvlZnG2I.js","assets/render-ClcS7zyX.js","assets/render-DH4gbEQr.js","assets/reveal-HhEEH6KI.js","assets/rhythmDance-SFJxDntv.js","assets/rng-LLIeWRGS.js","assets/runtime-DTYCij_K.js","assets/scene-C28U2wSL.css","assets/scene-lxKNyjUv.js","assets/scene-nhYald9W.js","assets/scenes-uCAuGsfk.js","assets/session-DqckT2DI.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-JOLxe3sY.js","assets/spaRelax-C1BEHcqE.js","assets/stats-D37pe0Xz.js","assets/statsConsent-BWIie8VB.js","assets/store-Bcg2GbXK.js","assets/styles-DDT62FZD.js","assets/thoughts-Ms3t-3g_.js","assets/thoughts-lw9uL1wa.css","assets/tidy-CnkgqPaX.js","assets/touchDiag-tRIvIxbF.js","assets/ui-B-8X5rjm.css","assets/ui-B73EuAPD.js","assets/ui-BurU-WAR.css","assets/ui-C7BolKaF.js","assets/ui-CvNGzKgk.js","assets/ui-DeBIApP1.js","assets/ui-GQAc3pVw.js","assets/ui-KfvbRl5D.js","assets/ui-kI2SMgp7.js","assets/ui-wRMXhdhv.js","assets/view-B93D5VK6.js","assets/view-C5c_xCp7.css","assets/wardrobe-6uIZxJnH.js","assets/wires-DYqvn9j6.js","index.html","manifest.webmanifest"];

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
// Aperçu de la notification : les pensées personnelles sont longues ; sur l'écran verrouillé on montre le début (coupé à un mot, « … »),
// le texte INTÉGRAL est rangé dans « Petites pensées ♡ » (ouvert en touchant la notification).
//#preview-start
function previewOf(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s.length <= 130) return s;
  const cut = s.slice(0, 118), sp = cut.lastIndexOf(' ');
  return (sp > 60 ? cut.slice(0, sp) : cut).replace(/[\s,;:.!?-]+$/, '') + ' …';
}
//#preview-end
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const full = String(d.body || 'Une petite pensée pour toi ♡').slice(0, 700);
  const body = previewOf(full);
  const at = Number(d.at) || Date.now();
  e.waitUntil(Promise.all([
    self.registration.showNotification(String(d.title || 'RADIA ♡').slice(0, 60), {
      body,
      icon: new URL('assets/icons/icon-192.png', self.registration.scope).href,
      badge: new URL('assets/icons/icon-192.png', self.registration.scope).href,
      tag: 'radia-daily', // une seule notification quotidienne visible à la fois (pas d'empilement)
      data: { url: d.url || './?pensee=1', at },
    }),
    caches.open('rthoughts').then((c) => c.put('/__thought/' + at, new Response(JSON.stringify({ at, text: full, idx: typeof d.idx === 'number' ? d.idx : -1, test: !!d.test }), { headers: { 'content-type': 'application/json' } }))).catch(() => undefined),
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
