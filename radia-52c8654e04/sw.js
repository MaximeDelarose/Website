/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3xn0ua-407ddf8';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CG1khMqW.js","assets/app-Dg_06My-.js","assets/arrangeCare-BwPh9Tnr.js","assets/art-COOdiJx-.js","assets/art-DFABHGgR.js","assets/art-DdG8yZpx.js","assets/badge-DkCslf1p.js","assets/board-XtzwRxRo.css","assets/board-rgC_zath.js","assets/bouquet-DNngiQRi.js","assets/braceletReveal-xiQELlvR.js","assets/career-B0R2Su0Z.js","assets/career-D4Kjo_a9.css","assets/careerGame-CFsntk5E.js","assets/casino-BSvt2nZB.js","assets/castle-BMvovhX-.css","assets/castle-CKeulfvj.js","assets/cat-DIUDqTDY.js","assets/cat-DaPNr-Ui.css","assets/cat-tEGy8mZv.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BCFbNDKS.js","assets/chocolateBox-B47z8asQ.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DVRwgF66.js","assets/cinemaQuiz-BGSlKvPk.js","assets/common-Pi0zxleL.js","assets/creativeUi-CHIE_yQ9.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BLUulr6f.js","assets/decorTable-_mN5xIz8.js","assets/demo-DFhvYdh9.js","assets/drawing-C-jvSb15.js","assets/dressVerdict-Bcj7fNk2.js","assets/dressing-DRvvLtmc.css","assets/dressing-PDYog5I1.js","assets/faceStudio-Cf0q0X-e.js","assets/faceStudio-e8Y12Wa-.css","assets/family-gy-OT53v.css","assets/family-vVmVLErk.js","assets/familyPick-BuSZwLjH.js","assets/fans-BXo_QXE3.css","assets/fans-rd55F6Zk.js","assets/fashionThemes-CPenB072.js","assets/finale-DLtASaIO.js","assets/fireworksPhoto-9SFJl7M7.js","assets/frame-DnSoxrAG.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-C75G0yRu.js","assets/gallery-Ci-hfeIJ.js","assets/garden-B6J3S_97.js","assets/garden-BOusrV0A.js","assets/garden-DazHrlMv.css","assets/garden-hDR2Zf4d.js","assets/garden-wc-fYMWZ.js","assets/giftArt-DNz24E3i.js","assets/guessMenu-Cj4KWtj8.js","assets/harness-DUP_71_S.js","assets/host-DcvezPk8.js","assets/hub-BWlYCEUr.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B9iytjGs.js","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-CLGad4UF.css","assets/index-D0zCiKys.js","assets/index-D4rP9QFL.js","assets/index-DSipKKgH.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DjcONwds.js","assets/index-Dvt7dVdf.js","assets/index-R4t8rpYx.js","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-DXjMXOLM.js","assets/memoryChallenge-BEF4A8Cj.js","assets/memoryView-C2dLLSIk.js","assets/menuPick-vjP5qNdK.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CUA71KGP.js","assets/order-g9LvpehH.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DNU7q4PC.js","assets/photoBooth-DBvCCJ1C.js","assets/photoShoot-iXIPkFnm.js","assets/plumbing-BHCEkZbV.js","assets/promiseCard-FfczOkEu.js","assets/push-Dv1H64kV.js","assets/render-DGHhww9I.js","assets/render-DIUHurE1.js","assets/reveal-DPpWoMK1.js","assets/rhythmDance-DfaaXeON.js","assets/rng-LLIeWRGS.js","assets/runtime-BDJF6hVY.js","assets/scene-C7nCHeHi.css","assets/scene-CO6qWm-m.js","assets/scene-ou9D_SV-.js","assets/scenes-BQqz1Un6.js","assets/session-DOGjn1eu.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CrAlRH_7.js","assets/spaRelax-SFGtf_we.js","assets/store-BpEY3iag.js","assets/styles-DDT62FZD.js","assets/thoughts-Bg8e1CBG.js","assets/tidy-bGCSvomj.js","assets/touchDiag-gbe8IuqZ.js","assets/ui-B-8X5rjm.css","assets/ui-BFgaaGqH.js","assets/ui-BslbrP--.js","assets/ui-BurU-WAR.css","assets/ui-CFqJ21dv.js","assets/ui-CKTaXVZb.js","assets/ui-CsLlGjee.js","assets/ui-UWk-2G_-.js","assets/ui-YN2YRlWi.js","assets/ui-ugz-utN1.js","assets/view-BVuiH1ee.js","assets/view-C5c_xCp7.css","assets/wardrobe-B_eN-Vcq.js","assets/wires-BHRx0wLa.js","index.html","manifest.webmanifest"];

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
