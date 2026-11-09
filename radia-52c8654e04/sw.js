/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw8u8b9t-f9b2b0f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Da9S2NPS.js","assets/app-DzqnN8OB.js","assets/arrangeCare-DpVWHLjD.js","assets/art-B62lLJdf.js","assets/art-ChnyMX3X.js","assets/art-N01MP3Jm.js","assets/badge-BzrArwNY.js","assets/board-CDqkXQm8.js","assets/board-XtzwRxRo.css","assets/bouquet-CPEmL7hU.js","assets/braceletReveal-DaXytl6k.js","assets/career-D4Kjo_a9.css","assets/career-uvVhXA2X.js","assets/careerGame-ClVK2Gut.js","assets/casino-CChr-y-X.js","assets/castle-BMvovhX-.css","assets/castle-DfZAPDqr.js","assets/cat-CJcE8pVt.js","assets/cat-CLwVu2ox.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-DAijHW33.js","assets/chocolateBox-D6HvtNwh.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DeH14ebo.js","assets/cinemaQuiz-KyYlAwNy.js","assets/common-WbuFh5Fe.js","assets/creativeUi-B-ZYMZDO.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DUPhcwA8.js","assets/decorTable-CAbNHCHG.js","assets/demo-DFhvYdh9.js","assets/drawing-BUwWYCVo.js","assets/dressVerdict-DEjGRa1v.js","assets/dressing-4KDv_qtW.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-DbEOUr6w.js","assets/faceStudio-e8Y12Wa-.css","assets/family-gy-OT53v.css","assets/family-uOJCGhrA.js","assets/familyPick-CiodZaf5.js","assets/fans-96REFrxH.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-DoRTuc93.js","assets/finale-m2GlJQ8H.js","assets/fireworksPhoto-BDTVDuEN.js","assets/frame-Tn4KpZAm.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BSXiKZsr.js","assets/gallery-CfLLzIKg.js","assets/garden-BtgFYG7v.js","assets/garden-CWv1g6R2.js","assets/garden-DWGS63Yl.js","assets/garden-DazHrlMv.css","assets/garden-DbkCUmoi.js","assets/giftArt-JteolEq5.js","assets/guessMenu-C1MGcMzo.js","assets/harness-1orapa-Z.js","assets/host-BCAwz2_S.js","assets/hub-Biy19Bfw.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BJwnpjgv.js","assets/index-BRWvVPWG.css","assets/index-CEd-0xnY.js","assets/index-CLGad4UF.css","assets/index-CUUPWCtD.js","assets/index-DYvLVnyJ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-GtYwwMne.css","assets/index-WK2ifQJE.js","assets/index-dBKetCRr.js","assets/index-jolZgkUr.css","assets/index-lG-YW1Yt.js","assets/kit-CYUsLOSX.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DEff-NIl.js","assets/memoryView-BSUVQF3T.js","assets/menuPick-MDhjp6CG.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BoesnUB_.js","assets/order-CmlF8Vr_.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-l_OJY406.js","assets/photoBooth-oqXBfLYn.js","assets/photoShoot-DTaKNJAW.js","assets/plumbing-DuALIYik.js","assets/promiseCard-YDAz0Rs5.js","assets/push-BSHroQMO.js","assets/render-CEU9BrxO.js","assets/render-CXnm3AEk.js","assets/reveal-fAwdSSWY.js","assets/rhythmDance-is0NeJfA.js","assets/rng-LLIeWRGS.js","assets/runtime-D6QsE5yJ.js","assets/scene-C28U2wSL.css","assets/scene-Durrlw46.js","assets/scene-wqxy-GCH.js","assets/scenes-CZ0dEdVb.js","assets/session-lJMPqTkn.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BvtDbTFh.js","assets/spaRelax-BVpAGHJK.js","assets/stats-DsDhsFul.js","assets/statsConsent-BreV4Lbx.js","assets/store-BhwLWCOY.js","assets/styles-DDT62FZD.js","assets/thoughts-BCMKwH3q.js","assets/thoughts-lw9uL1wa.css","assets/tidy-BIuH2Fpf.js","assets/touchDiag-CK9frMwn.js","assets/ui-B-8X5rjm.css","assets/ui-B03eJhH9.js","assets/ui-BJw0tEiP.js","assets/ui-BQxJ_gQi.js","assets/ui-BTxOz3qh.js","assets/ui-BurU-WAR.css","assets/ui-BvWNy5zZ.js","assets/ui-Cmuz-KDD.js","assets/ui-CpE_jO4n.js","assets/ui-CsSR38NW.js","assets/view-C5c_xCp7.css","assets/view-CnQS8OIN.js","assets/wardrobe-i4xH3k83.js","assets/wires-B8NJTLep.js","index.html","manifest.webmanifest"];

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
