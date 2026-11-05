/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3ytizp-713f15a';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-hKjgQds-.js","assets/app-C0hOqTrx.js","assets/arrangeCare-C-XNRknT.js","assets/art-Be9CrNYm.js","assets/art-CCoL45X3.js","assets/art-RYO3YxgO.js","assets/badge-FQcAesGE.js","assets/board-D-QUhvrD.js","assets/board-XtzwRxRo.css","assets/bouquet-XOTwPJxb.js","assets/braceletReveal-Bsq0eujE.js","assets/career-BismBTqI.js","assets/career-D4Kjo_a9.css","assets/careerGame-DmCtlEnj.js","assets/casino-DtDZo3pG.js","assets/castle-BMvovhX-.css","assets/castle-P-i9poNs.js","assets/cat-C51-lMiV.js","assets/cat-DaPNr-Ui.css","assets/cat-nAiFTZAN.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-SGDUvXdw.js","assets/chocolateBox-C60ou4ew.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DoKY2fl2.js","assets/cinemaQuiz-BjCyMf0F.js","assets/common-DibvXZfR.js","assets/creativeUi-BFD8jmFU.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BWEo7Y_7.js","assets/decorTable-CPH5mcTb.js","assets/demo-DFhvYdh9.js","assets/drawing-yw-cnrH6.js","assets/dressVerdict-DhzwYn7H.js","assets/dressing-DRvvLtmc.css","assets/dressing-nvCBbRcQ.js","assets/faceStudio-e8Y12Wa-.css","assets/faceStudio-r1gOYQVX.js","assets/family-DIhISUAw.js","assets/family-gy-OT53v.css","assets/familyPick-BK9Wa-kI.js","assets/fans-BXo_QXE3.css","assets/fans-DCqQdHlK.js","assets/fashionThemes-CZEYZC8z.js","assets/finale-D-G4CMjz.js","assets/fireworksPhoto-ClrWXyDW.js","assets/frame-BT26W77s.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DU35ToGJ.js","assets/gallery-BfrHxTuh.js","assets/garden-BNvbfU8d.js","assets/garden-BppK7F6p.js","assets/garden-CJ6-U17y.js","assets/garden-ChJSlNHS.js","assets/garden-DazHrlMv.css","assets/giftArt-CNXxdXsu.js","assets/guessMenu-amLRH4aG.js","assets/harness-Cxc21xy7.js","assets/host-CpH5Ga73.js","assets/hub-B_O50Auz.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B5t2vXx9.js","assets/index-BPcgSUmU.js","assets/index-BRWvVPWG.css","assets/index-BRk3yv9i.js","assets/index-Bgp_CR3j.css","assets/index-BnoAV2bM.js","assets/index-C3KrVGkt.js","assets/index-CLGad4UF.css","assets/index-CaH0X4c2.js","assets/index-CdR2X3dr.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-jolZgkUr.css","assets/kit-B8CHWLzZ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CksSaJq9.js","assets/memoryView-zAOC15hL.js","assets/menuPick-vUZzoDka.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DL_2xkx2.js","assets/order-BWJUKirE.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BQWKvvRM.js","assets/photoBooth-xJ2drEco.js","assets/photoShoot-BXpmmTqd.js","assets/plumbing-CDM0H1JW.js","assets/promiseCard-D_rE9KQT.js","assets/push-CskWCAOH.js","assets/render-CdzlluoI.js","assets/render-D7CvxJST.js","assets/reveal-DRodQVNK.js","assets/rhythmDance-CO_OtE8S.js","assets/rng-LLIeWRGS.js","assets/runtime-B8Hp7ZrN.js","assets/scene-BJUAqu9W.js","assets/scene-C7nCHeHi.css","assets/scene-RzwYRBrK.js","assets/scenes-DiC5Nh1l.js","assets/session-D4yZMCaG.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CpiNeys_.js","assets/spaRelax-649de4vA.js","assets/store-DK-IdXDe.js","assets/styles-DDT62FZD.js","assets/thoughts-Dv3rAFCq.js","assets/thoughts-lw9uL1wa.css","assets/tidy-VC4Vzl7_.js","assets/touchDiag-DojdvbTn.js","assets/ui-B-8X5rjm.css","assets/ui-BKde-DUd.js","assets/ui-BXeOqCGl.js","assets/ui-BurU-WAR.css","assets/ui-CAEWtb5A.js","assets/ui-CTOANsCS.js","assets/ui-DDJsP0Uz.js","assets/ui-F17RqwMI.js","assets/ui-JBQTnbTn.js","assets/ui-RsM66GKh.js","assets/view-C5c_xCp7.css","assets/view-CQ_0q-yS.js","assets/wardrobe-ALqcVH5u.js","assets/wires-CcwOMQbj.js","index.html","manifest.webmanifest"];

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
