/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw4560tq-da880f4';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-peyyQ5p2.js","assets/app-DfJ5b_BT.js","assets/arrangeCare-Cf9K3RJx.js","assets/art-1JOQ-3tW.js","assets/art-CVeXWKrc.js","assets/art-DBQfGF0X.js","assets/badge-BCdWbZsn.js","assets/board-BMMUrmy8.js","assets/board-XtzwRxRo.css","assets/bouquet-Dpfu7rQi.js","assets/braceletReveal-DUdYyZ4A.js","assets/career-D4Kjo_a9.css","assets/career-D8dPz9Mr.js","assets/careerGame-CcM0qXzN.js","assets/casino-DjykZ6jH.js","assets/castle-BMvovhX-.css","assets/castle-ChgDA7m9.js","assets/cat-4q1haRcP.js","assets/cat-DMo_5MqE.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CLKgbc_r.js","assets/chocolateBox-xQ88awEP.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-gOaibukU.js","assets/cinemaQuiz-DpVHUGib.js","assets/common-CaUOT72L.js","assets/creativeUi-17RARRXm.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CIb8buFT.js","assets/decorTable-3yEcGRGV.js","assets/demo-DFhvYdh9.js","assets/drawing-CtAAtw2B.js","assets/dressVerdict-DPrW6vLz.js","assets/dressing-DRvvLtmc.css","assets/dressing-DfamK2TB.js","assets/faceStudio-BFiSuUoW.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BB79Rk4F.js","assets/family-gy-OT53v.css","assets/familyPick-CAZOep9v.js","assets/fans-BXo_QXE3.css","assets/fans-D_EKUJhh.js","assets/fashionThemes-NlicmZER.js","assets/finale-C9Jiruzq.js","assets/fireworksPhoto-NdQtYxZk.js","assets/frame-BuymTKQU.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DhI216ow.js","assets/gallery-BorcqGiH.js","assets/garden-0H1yziT8.js","assets/garden-BiBoJoMj.js","assets/garden-DZoGOUUO.js","assets/garden-DazHrlMv.css","assets/garden-XXFMjBlC.js","assets/giftArt-DLmgeM0Y.js","assets/guessMenu-DkqrZQnO.js","assets/harness-bFBrMX-I.js","assets/host-C5m8lM2e.js","assets/hub-C4LbLexs.css","assets/hub-CfEW3cjn.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-0XBmS8YC.js","assets/index-5PNLPH8A.js","assets/index-BBR8Bc6O.js","assets/index-BKraL2uU.js","assets/index-BOj76S8y.js","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-CLGad4UF.css","assets/index-CWPrufYO.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-jolZgkUr.css","assets/index-qXZ-NwO8.js","assets/kit-BOtYMKJB.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CpgeWruM.js","assets/memoryView-BCFOAPLo.js","assets/menuPick-ydUOL5PY.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Q_6kMLAe.js","assets/order-DjOZJoFa.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-A70zZ-bl.js","assets/photoBooth-DV405PJe.js","assets/photoShoot-C2tmSHRa.js","assets/plumbing-CwR2BF-O.js","assets/promiseCard-BscYO7bY.js","assets/push-BIzBrRFe.js","assets/render-BThaZVOw.js","assets/render-BiNhiMD1.js","assets/reveal-C64-aRjl.js","assets/rhythmDance-D2Ss0Wm2.js","assets/rng-LLIeWRGS.js","assets/runtime-alNzBO9D.js","assets/scene-BfS2YsNC.js","assets/scene-C28U2wSL.css","assets/scene-rEbvC-eK.js","assets/scenes-C820Qvf1.js","assets/session-BCjKi3V_.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-D9MhoDzE.js","assets/spaRelax-T_H7tqCp.js","assets/stats-Bz1M4Jer.js","assets/statsConsent-kZrSI816.js","assets/store-9bznQctp.js","assets/styles-DDT62FZD.js","assets/thoughts-Nk2RSDSl.js","assets/thoughts-lw9uL1wa.css","assets/tidy-yUdg_QDH.js","assets/touchDiag-BEUpcG_e.js","assets/ui-B-8X5rjm.css","assets/ui-BurU-WAR.css","assets/ui-CNlA95ev.js","assets/ui-CUpoOr7y.js","assets/ui-CYinfEIv.js","assets/ui-Dbr6KIP0.js","assets/ui-Dm8TstEc.js","assets/ui-DmLBD7ha.js","assets/ui-YvKEKWrW.js","assets/ui-jBBBYsO-.js","assets/view-C5c_xCp7.css","assets/view-CEzCXMH9.js","assets/wardrobe-BKIEzTKj.js","assets/wires-Becacliy.js","index.html","manifest.webmanifest"];

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
