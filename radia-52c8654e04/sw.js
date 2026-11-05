/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3z8o4p-eeb4c94';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-6mEAGm9z.js","assets/app-CjVZsupZ.js","assets/arrangeCare-DREKxQu5.js","assets/art-7DWfCqhK.js","assets/art-Dk5JfZy9.js","assets/art-RM6IIJtW.js","assets/badge-B-_J9ybT.js","assets/board-DNdBOzP6.js","assets/board-XtzwRxRo.css","assets/bouquet-Co52cNdu.js","assets/braceletReveal-l_fY-UV1.js","assets/career-Cf2Ediz6.js","assets/career-D4Kjo_a9.css","assets/careerGame-B3kGAQM_.js","assets/casino-hnawawFY.js","assets/castle-BMvovhX-.css","assets/castle-C_0gatSF.js","assets/cat-BRX318jU.js","assets/cat-Clt_R93U.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CcHfcyn6.js","assets/chocolateBox-BNyAajh1.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-D-Ug8FGz.js","assets/cinemaQuiz-D0mCcQ8R.js","assets/common-CG5kLxEN.js","assets/creativeUi-YYViUbVE.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-wsaoXpHr.js","assets/decorTable-DRxITecR.js","assets/demo-DFhvYdh9.js","assets/drawing-_DHedHzX.js","assets/dressVerdict-KfE_aVBu.js","assets/dressing-DRvvLtmc.css","assets/dressing-P480ZVdp.js","assets/faceStudio--WP-d9s4.js","assets/faceStudio-e8Y12Wa-.css","assets/family-ExbqcE62.js","assets/family-gy-OT53v.css","assets/familyPick-Cvn77zIz.js","assets/fans-BXo_QXE3.css","assets/fans-Da4zQH_n.js","assets/fashionThemes-DpDiBfsH.js","assets/finale-CpKhoPvw.js","assets/fireworksPhoto-DnNeg96F.js","assets/frame-V3Lj8odj.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Bkm_fL58.js","assets/gallery-BP76CFGT.js","assets/garden-BpwbHTEm.js","assets/garden-CObuoyto.js","assets/garden-CuzFg6VU.js","assets/garden-DazHrlMv.css","assets/garden-DpVzWtSm.js","assets/giftArt-CcKIxh4B.js","assets/guessMenu-DxFHi5wb.js","assets/harness-BNxCFeRM.js","assets/host-Gye_Dktn.js","assets/hub-C4LbLexs.css","assets/hub-CjYoGkA4.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B4axbYtT.js","assets/index-BHm3cVck.js","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-CLGad4UF.css","assets/index-CWEGkjot.js","assets/index-Cfx_srsk.js","assets/index-DFLR5wF_.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Kcn6bIX2.js","assets/index-P8QDQxmU.js","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-VVqahPWn.js","assets/memoryChallenge-Dp6xH-fk.js","assets/memoryView-BvJhxFbk.js","assets/menuPick-DfimlhaJ.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DlSYVfHF.js","assets/order-BelYlNYz.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Bsi3HYGF.js","assets/photoBooth-6QSdIhaZ.js","assets/photoShoot-BktSz0iW.js","assets/plumbing-DpDhUlvQ.js","assets/promiseCard-DW_PpEqM.js","assets/push-BGYJewOg.js","assets/render-JxCF3U9l.js","assets/render-XZq3I3Ic.js","assets/reveal-EtLtN2e-.js","assets/rhythmDance-DNtU-wtP.js","assets/rng-LLIeWRGS.js","assets/runtime-C3yUgUvU.js","assets/scene-C7nCHeHi.css","assets/scene-X2C2MWEn.js","assets/scene-YtloUIi5.js","assets/scenes-CuBWtBdu.js","assets/session-B2ND9dDk.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DTC0sB6j.js","assets/spaRelax-CpVOvOis.js","assets/store-D8eihhmp.js","assets/styles-DDT62FZD.js","assets/thoughts-CMVL09p3.js","assets/thoughts-lw9uL1wa.css","assets/tidy-D5ZjXhzL.js","assets/touchDiag-BZUp_p60.js","assets/ui-2EEvZnYP.js","assets/ui-B-8X5rjm.css","assets/ui-B3paTMZm.js","assets/ui-BFfbbRAc.js","assets/ui-BGaZynUo.js","assets/ui-BurU-WAR.css","assets/ui-DzSaB9xU.js","assets/ui-FSR-_iJ1.js","assets/ui-fwUqBKX5.js","assets/ui-qLUbQsnG.js","assets/view-C5c_xCp7.css","assets/view-DMYAkHw3.js","assets/wardrobe-DTNAWsnA.js","assets/wires-9fyenz-K.js","index.html","manifest.webmanifest"];

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
