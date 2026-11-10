/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mwacsua8-bec0c20';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BCKUUyeM.js","assets/app-CPqp--gp.js","assets/arrangeCare-BpB0W6yz.js","assets/art-BM8YnseV.css","assets/art-C5tRNCVH.js","assets/art-CRzS4mnP.js","assets/art-k_6qrGXn.js","assets/badge-DSq9tBrd.js","assets/board-XtzwRxRo.css","assets/board-zWHHbk7j.js","assets/bouquet-DceXg4Qx.js","assets/braceletReveal-CobKz3Uz.js","assets/career-D4Kjo_a9.css","assets/career-hiNqonti.js","assets/careerGame-DLh2NLUf.js","assets/casino-FLUiSFuP.js","assets/castle-BMvovhX-.css","assets/castle-JImPJ2mW.js","assets/cat-BbRD7Pis.js","assets/cat-DaPNr-Ui.css","assets/cat-DiIjCaR3.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-D54Bf5Gc.js","assets/chocolateBox-1Biz0PPh.js","assets/chocolaterie-Btetj6d0.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CMvkIzVB.js","assets/common-BX-BoE-y.js","assets/creativeUi-CZRtdRng.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-DgExB6gu.js","assets/decor-D06pO3yv.js","assets/decorTable-B6I8gQ_k.js","assets/demo-DFhvYdh9.js","assets/drawing-kOap7Ojr.js","assets/dressVerdict-DrH5OWdQ.js","assets/dressing-D7TOnz6w.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-Dugg3XZd.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BLhWyihN.js","assets/family-gy-OT53v.css","assets/familyPick-BDksMcdK.js","assets/fans-BXo_QXE3.css","assets/fans-GK2fZ5xU.js","assets/fashionThemes-BAcoaoEA.js","assets/finale-Rj4D2EUu.js","assets/fireworksPhoto-BVhdMQTd.js","assets/frame-2IP68vf_.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DASJU063.js","assets/gallery-B8nIm1c2.js","assets/garden-ByZIykof.js","assets/garden-CeUgxYl0.js","assets/garden-DDKP9iXw.js","assets/garden-DazHrlMv.css","assets/garden-LGq8myVQ.js","assets/giftArt-pdeFeEPq.js","assets/guessMenu-FAPwei1p.js","assets/harness-B9DC2pqm.js","assets/host-C61zqmRw.js","assets/hub-C4LbLexs.css","assets/hub-DnFzJlw0.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bk-tvodp.js","assets/index-BmkbgxyI.js","assets/index-C8UAVZAR.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-CmdPmYzh.css","assets/index-CpT91Mwa.js","assets/index-CrYO23yk.js","assets/index-Cy6LB3TM.js","assets/index-DIPqqtKi.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/kit-CyX29Wxo.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-BTKJLQTU.js","assets/memoryView-DLJAvqhJ.js","assets/menuPick-NipIJ0I8.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Mc1ILo1t.js","assets/order-60GVUg3e.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DrmtkY4T.js","assets/photoBooth-2EVhLQ5T.js","assets/photoShoot-Dae45REk.js","assets/plumbing-C-ZKiOFT.js","assets/progressConsent-DSIIdDKX.js","assets/progressSync-CY0RZHJA.js","assets/promiseCard-DwBBqPjq.js","assets/push-7PhRVKoE.js","assets/render-Cx9T35m3.js","assets/render-DYYcTGJh.js","assets/reveal-D4qnVK8J.js","assets/rhythmDance-BXwvr3hf.js","assets/rng-LLIeWRGS.js","assets/runtime-GAd0btH-.js","assets/scene-Bp1s5_ou.js","assets/scene-C28U2wSL.css","assets/scene-DzeDOmPw.js","assets/scenes-C50PuEgf.js","assets/session-Co52BE0m.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-neH8mI8l.js","assets/spaRelax-ZmSYcVRh.js","assets/stats-GOcabcC9.js","assets/statsConsent-_HsHvSj8.js","assets/store-8SON4g86.js","assets/store-D2TUnbF2.js","assets/styles-DDT62FZD.js","assets/thoughts-DmvMuqoy.js","assets/thoughts-lw9uL1wa.css","assets/tidy-BuGIzjCW.js","assets/touchDiag-CfAz6bHL.js","assets/ui-A9Crpc2c.js","assets/ui-BE9cRoqj.js","assets/ui-BLjYqTza.js","assets/ui-BVHeXlqC.js","assets/ui-BXfsvJ4i.css","assets/ui-BurU-WAR.css","assets/ui-D0Unp8S_.js","assets/ui-D2m4UnVS.js","assets/ui-D5vf_Ow5.js","assets/ui-pivbLI9j.js","assets/view-BBbPK08z.js","assets/view-C5c_xCp7.css","assets/wardrobe-JemwxkVZ.js","assets/wires-DvXoXWHb.js","index.html","manifest.webmanifest"];

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
  if (d.kind === 'news') {
    // annonce unique « nouveauté » : notification discrète, JAMAIS rangée dans « Petites pensées ♡ » ; le toucher ouvre l'invitation à partager la progression
    e.waitUntil(self.registration.showNotification(String(d.title || 'RADIA ♡').slice(0, 60), {
      body, icon: new URL('assets/icons/icon-192.png', self.registration.scope).href, badge: new URL('assets/icons/icon-192.png', self.registration.scope).href,
      tag: 'radia-news', data: { url: d.url || './?partage=1', kind: 'news', at },
    }));
    return;
  }
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
  const news = !!(e.notification.data && e.notification.data.kind === 'news');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: news ? 'radia-open-share' : 'radia-thought' }); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});

// L'abonnement peut être renouvelé par le système : on prévient l'application (elle se réabonne à sa prochaine ouverture).
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((list) => list.forEach((c) => c.postMessage({ type: 'radia-push-changed' }))));
});
