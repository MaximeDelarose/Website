/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw8qhexi-e61157b';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-VZnsEU1k.js","assets/app-CundEexL.js","assets/arrangeCare-CG6Z4oXK.js","assets/art-B0I7d6BO.js","assets/art-BJ6J0Tjy.js","assets/art-D4n8beKY.js","assets/badge-qnwKD7QZ.js","assets/board-Cs9BK7ts.js","assets/board-XtzwRxRo.css","assets/bouquet-C7eZ1mXf.js","assets/braceletReveal-DamxmD_7.js","assets/career-C2CZYj0G.js","assets/career-D4Kjo_a9.css","assets/careerGame-DNjd7sWm.js","assets/casino-DwUmtES4.js","assets/castle-BLnX3XWu.js","assets/castle-BMvovhX-.css","assets/cat-BYzNlF3Y.js","assets/cat-DaPNr-Ui.css","assets/cat-zAv3tUkc.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-D4hMpx3D.js","assets/chocolateBox-DNNRz0da.js","assets/chocolaterie-CKVfhFjV.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-ByNchbb_.js","assets/common-DUdzgcKA.js","assets/creativeUi-ByF8PX-B.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-fJCpn3Tb.js","assets/decorTable-BfKHQ41r.js","assets/demo-DFhvYdh9.js","assets/drawing-D0II_NzY.js","assets/dressVerdict-LJYaPQBX.js","assets/dressing-CeXAv8Bv.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-LvorS-_Q.js","assets/faceStudio-e8Y12Wa-.css","assets/family-D36OrqMi.js","assets/family-gy-OT53v.css","assets/familyPick-Cbes2Ex-.js","assets/fans-BA6m4eDu.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-ByqHKjUZ.js","assets/finale-Bb-VLkSB.js","assets/fireworksPhoto-CAgQaNAi.js","assets/frame-BJaqTS7a.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BJ4k3Uer.js","assets/gallery-C2Z35hMJ.js","assets/garden-B3_lTPG5.js","assets/garden-BBU-wy0U.js","assets/garden-BspO0-KR.js","assets/garden-Cvmf19tf.js","assets/garden-DazHrlMv.css","assets/giftArt-BrrvUE76.js","assets/guessMenu-sxYypGxq.js","assets/harness-BIQmIt-G.js","assets/host-DW87qh8s.js","assets/hub-C4LbLexs.css","assets/hub-CSajdwSj.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-Ad_gs7Hr.js","assets/index-B876XHAY.js","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-CD4U0E7x.js","assets/index-CDqEGQ7A.js","assets/index-CKlnHaaL.js","assets/index-CLGad4UF.css","assets/index-CiKtCTIZ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-jolZgkUr.css","assets/index-tmXhIppI.js","assets/kit-DOzxEsJ8.css","assets/kit-YBHhUnoL.js","assets/memoryChallenge-BKFX1XUh.js","assets/memoryView-BzzRI9EM.js","assets/menuPick-375hAP5X.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DOEj9Uqn.js","assets/order-SijwAVwA.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BcWLHzIq.js","assets/photoBooth-Cxy0DC8F.js","assets/photoShoot-Bu4bKLVT.js","assets/plumbing-CiKq7nEY.js","assets/promiseCard-C4f5J7XZ.js","assets/push-CxPFAiEE.js","assets/render-BCp_6ZHd.js","assets/render-wltUF6aU.js","assets/reveal-Vv7P5JYY.js","assets/rhythmDance-hHS7AnZO.js","assets/rng-LLIeWRGS.js","assets/runtime-BZKAkCfG.js","assets/scene-BgEJeeuY.js","assets/scene-C28U2wSL.css","assets/scene-CUCRdKvh.js","assets/scenes-CQdV2vZZ.js","assets/session-D9IM6Xd_.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DEkJddmD.js","assets/spaRelax-_WrSBWOF.js","assets/stats-tEgnbRGi.js","assets/statsConsent-BTRKGXjA.js","assets/store-CIqnWQWx.js","assets/styles-DDT62FZD.js","assets/thoughts-BbEShrhN.js","assets/thoughts-lw9uL1wa.css","assets/tidy-BW1pQfv_.js","assets/touchDiag-CqCi9oaI.js","assets/ui-B-8X5rjm.css","assets/ui-B7uLOphJ.js","assets/ui-BOcqVQBI.js","assets/ui-BZ22ojWS.js","assets/ui-BurU-WAR.css","assets/ui-C21xZ-Rf.js","assets/ui-CXufTKpF.js","assets/ui-CvJ32s-f.js","assets/ui-Db5jT2Oy.js","assets/ui-DuMYfdev.js","assets/view-C5c_xCp7.css","assets/view-Dam1ymV_.js","assets/wardrobe-DZjpyrR5.js","assets/wires-CSShOhbt.js","index.html","manifest.webmanifest"];

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
