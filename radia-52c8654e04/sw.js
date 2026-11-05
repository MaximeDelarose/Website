/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw44ggta-e206201';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-PBDuWSiN.js","assets/app-Cb3E_IVN.js","assets/arrangeCare-BFp4ZIjJ.js","assets/art-Bhic037O.js","assets/art-DlAUZI2K.js","assets/art-DpqEFmjU.js","assets/badge-_8kpA5Vc.js","assets/board-BBYD8ddp.js","assets/board-XtzwRxRo.css","assets/bouquet-Ow_5ZnM2.js","assets/braceletReveal-fGlWF5q3.js","assets/career-CJoJkKOV.js","assets/career-D4Kjo_a9.css","assets/careerGame-C9DZlaDs.js","assets/casino-D1vpFzUP.js","assets/castle-18SRVo9R.js","assets/castle-BMvovhX-.css","assets/cat-BczsSlhK.js","assets/cat-DaPNr-Ui.css","assets/cat-fp7JlmiY.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CO-t8CZB.js","assets/chocolateBox-Ba4JskAy.js","assets/chocolaterie-C8j1ZOwV.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-B3D1p4v_.js","assets/common-8fYbKGV7.js","assets/creativeUi-B8ttd9un.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-2hnYAuxa.js","assets/decorTable-B-vTZbKr.js","assets/demo-DFhvYdh9.js","assets/drawing-BkMIp00h.js","assets/dressVerdict-Dv3BNlkz.js","assets/dressing-D2Uu8ZER.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-e8Y12Wa-.css","assets/faceStudio-sykQXHPd.js","assets/family-C7RrX-VF.js","assets/family-gy-OT53v.css","assets/familyPick-i0MErRVD.js","assets/fans-BXo_QXE3.css","assets/fans-g-rDGRLn.js","assets/fashionThemes-BpEAU7fq.js","assets/finale-BKlZWopy.js","assets/fireworksPhoto-B1ntCeas.js","assets/frame-CeyoYT52.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-D0EYW1Zw.js","assets/gallery-CXXmO81I.js","assets/garden-DEI2nYwK.js","assets/garden-DVA4j1fC.js","assets/garden-DazHrlMv.css","assets/garden-Dl-tnxJj.js","assets/garden-Zdz2Yoid.js","assets/giftArt-7kVNvIzI.js","assets/guessMenu-DjGkpAku.js","assets/harness-MkamnBKI.js","assets/host-CFQ08xTI.js","assets/hub-C4LbLexs.css","assets/hub-DGRZITXG.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BMYbbxJW.js","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-C5hV-Ixc.js","assets/index-CLGad4UF.css","assets/index-CQ-X_701.js","assets/index-CeFhdp1I.js","assets/index-Ctszk9rD.js","assets/index-DNtGqZbM.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DzkPPSj3.js","assets/index-jolZgkUr.css","assets/kit-BAb0Crq6.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DoS4lCZL.js","assets/memoryView-DLO8YzJA.js","assets/menuPick-BVy8osB8.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-w3DmpFiJ.js","assets/order-xRixTUUD.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-TxPZbOVN.js","assets/photoBooth-C91NxsnA.js","assets/photoShoot-PZK0Chdo.js","assets/plumbing-DA-aWPez.js","assets/promiseCard-Pfx8gSl1.js","assets/push-BD1aKarb.js","assets/render-DlUkIrQz.js","assets/render-qvfsFZdm.js","assets/reveal-CzPbitV8.js","assets/rhythmDance-D8Ojubj9.js","assets/rng-LLIeWRGS.js","assets/runtime-2tIN_giL.js","assets/scene-BbGBH-Yg.js","assets/scene-C28U2wSL.css","assets/scene-DzuN0DJG.js","assets/scenes-CH4FISru.js","assets/session-nQfESzoZ.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CscnOaA4.js","assets/spaRelax-CgyFDQtC.js","assets/store-CeLqxjq6.js","assets/styles-DDT62FZD.js","assets/thoughts-D28JuwUW.js","assets/thoughts-lw9uL1wa.css","assets/tidy-DPmlWXbr.js","assets/touchDiag-l3T-Bgeq.js","assets/ui-43ve0yHJ.js","assets/ui-B-8X5rjm.css","assets/ui-BurU-WAR.css","assets/ui-DBrcy2kT.js","assets/ui-DtksZPeH.js","assets/ui-LU-_j2aF.js","assets/ui-PQYDjnt0.js","assets/ui-g0thzq3H.js","assets/ui-knHUY9Eg.js","assets/ui-lPhGSGZp.js","assets/view-C5c_xCp7.css","assets/view-D7PpHVLX.js","assets/wardrobe-BSXFPyr0.js","assets/wires-jOQi1JHu.js","index.html","manifest.webmanifest"];

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
