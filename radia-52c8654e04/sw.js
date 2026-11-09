/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw8v2vfh-fc68c45';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-9CGwxwBA.js","assets/app-rXE4VELx.js","assets/arrangeCare-DPaSCc0S.js","assets/art-BBuzupzJ.js","assets/art-Bbc-qZAA.js","assets/art-tlr5P34q.js","assets/badge-iNASRyjw.js","assets/board-Tm8RU_kP.js","assets/board-XtzwRxRo.css","assets/bouquet-Bjqt5N0v.js","assets/braceletReveal-D47979dQ.js","assets/career-D4Kjo_a9.css","assets/career-Dz8sF_J4.js","assets/careerGame-sIXDlYwy.js","assets/casino-9ThnEUJy.js","assets/castle-BMvovhX-.css","assets/castle-D0RxqTuE.js","assets/cat-Bd1vQhhr.js","assets/cat-C1tCbBEu.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-0DGlQxVw.js","assets/chocolateBox-DS5yvpzd.js","assets/chocolaterie-2zvGU8Bu.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-D_NiHIJM.js","assets/common-IbFUZ6ZM.js","assets/creativeUi-DkLXQC4K.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-Dlih9ZlA.js","assets/decorTable-BbVRW-0x.js","assets/demo-DFhvYdh9.js","assets/drawing-BC4HQhNJ.js","assets/dressVerdict-BzFGW41u.js","assets/dressing-DRvvLtmc.css","assets/dressing-Dw9eFV9s.js","assets/faceStudio-DBA1EZsq.js","assets/faceStudio-e8Y12Wa-.css","assets/family-OPyxwfQS.js","assets/family-gy-OT53v.css","assets/familyPick-D09jLZ90.js","assets/fans-BXo_QXE3.css","assets/fans-DjSDeKmP.js","assets/fashionThemes-B2R7PpzG.js","assets/finale-rD_lIK5r.js","assets/fireworksPhoto-DJ1JtwA_.js","assets/frame-DO2X_lrT.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Bmhp5G04.js","assets/gallery-DJBjvj5m.js","assets/garden-D3t70aR9.js","assets/garden-DRwHX4se.js","assets/garden-DazHrlMv.css","assets/garden-IemPLTEi.js","assets/garden-XM2XFTJ3.js","assets/giftArt-OFfU8iz1.js","assets/guessMenu-BaPluMGN.js","assets/harness-Cvckfc7o.js","assets/host-BHrxU4eT.js","assets/hub-BJrxGGvX.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B1ta4Ph1.js","assets/index-BE6wboor.js","assets/index-BOBkAWHa.js","assets/index-BRWvVPWG.css","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-CkYG-dIx.js","assets/index-DApe_bx9.js","assets/index-DOi9O0IB.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-dk9v7lkF.js","assets/index-jolZgkUr.css","assets/kit-DDw3YdmN.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CgZNjxAE.js","assets/memoryView-CFszt8a0.js","assets/menuPick-BFHXCiLA.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BBcLAl1o.js","assets/order-CnXPXW3U.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CeY_UDSb.js","assets/photoBooth-DQK5DkXO.js","assets/photoShoot-Djhm2qGh.js","assets/plumbing-BKPXdhGr.js","assets/promiseCard-CuzXz1Dc.js","assets/push-DhpEvdDC.js","assets/render-BYOKxyvt.js","assets/render-CjRHc1r4.js","assets/reveal-Chst8Qx-.js","assets/rhythmDance-CqVkO2ZL.js","assets/rng-LLIeWRGS.js","assets/runtime-C4KqvbOt.js","assets/scene-3zSXrngZ.js","assets/scene-BkU_KInx.js","assets/scene-C28U2wSL.css","assets/scenes-CZaqrWsL.js","assets/session-CCvDIA7z.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-fAK2ps6l.js","assets/spaRelax-DFs1YfI8.js","assets/stats-BTSCWDC8.js","assets/statsConsent-Du06e0nl.js","assets/store-DWpn_0Th.js","assets/styles-DDT62FZD.js","assets/thoughts-1Me3nUnD.js","assets/thoughts-lw9uL1wa.css","assets/tidy-D6MxxpoB.js","assets/touchDiag-CjLng1b_.js","assets/ui-2CWsfvXF.js","assets/ui-B-8X5rjm.css","assets/ui-BBpzV1f6.js","assets/ui-Bk53eNU3.js","assets/ui-BurU-WAR.css","assets/ui-C2lGcX9T.js","assets/ui-CHIiKcTk.js","assets/ui-CSKaejGv.js","assets/ui-D8TgrRCs.js","assets/ui-Dq8jXz4B.js","assets/view-BC0QgYGc.js","assets/view-C5c_xCp7.css","assets/wardrobe-BZjn8zWp.js","assets/wires-C-dMSyIw.js","index.html","manifest.webmanifest"];

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
