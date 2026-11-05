/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3uwxgs-014bc07';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-0aV0jwMr.js","assets/app-Clnjwgsw.js","assets/arrangeCare-DGzFArpr.js","assets/art-BirunE9J.js","assets/art-BoMuYQra.js","assets/art-TmTCPhPw.js","assets/badge-vgtv3_sF.js","assets/board-C35Zzpgf.js","assets/board-XtzwRxRo.css","assets/bouquet-H6mZIlgb.js","assets/braceletReveal-0weN_N3k.js","assets/career-BjZN4m4o.js","assets/career-D4Kjo_a9.css","assets/careerGame-BMweYfCp.js","assets/casino-Cw9yVTSR.js","assets/castle-BMvovhX-.css","assets/castle-DVoWwmVJ.js","assets/cat-CWqpN9bN.js","assets/cat-D19glbUx.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Dih44bxz.js","assets/chocolateBox-CRTfRVxB.js","assets/chocolaterie-CIkalBUU.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CSjF2MR_.js","assets/common-DOgk_6bk.js","assets/creativeUi-DwgCR_Ig.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DkHLa4ht.js","assets/decorTable-DtN_cxee.js","assets/demo-DFhvYdh9.js","assets/drawing-BEgS60n7.js","assets/dressVerdict-C9Mb9P7C.js","assets/dressing-DF4SOQUJ.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-DVivaUeN.js","assets/faceStudio-e8Y12Wa-.css","assets/family-DG5qwO6v.js","assets/family-gy-OT53v.css","assets/familyPick-BrhNbgvz.js","assets/fans-BXo_QXE3.css","assets/fans-CqZh9vCo.js","assets/fashionThemes-CWkoMpqu.js","assets/finale-DxMLvtqM.js","assets/fireworksPhoto-D18_KMut.js","assets/frame-BL-KA_N7.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CXR_paa8.js","assets/gallery-XrYqKhaP.js","assets/garden-BAQkypMK.js","assets/garden-C64Z_vDX.js","assets/garden-DRkLE2CR.js","assets/garden-DazHrlMv.css","assets/garden-Dl5WPqRE.js","assets/giftArt-BeTnX9bx.js","assets/guessMenu-Dmg3tpa6.js","assets/harness-6WdmjZyc.js","assets/host-BZ-aTSWy.js","assets/hub-C4LbLexs.css","assets/hub-DDbJ8IRH.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-18gPUGSn.js","assets/index-B9fz01eG.js","assets/index-BRWvVPWG.css","assets/index-CIXOeEP6.js","assets/index-CLGad4UF.css","assets/index-Cgw_xPrP.js","assets/index-D5S3EX7o.js","assets/index-DWpu2cpL.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DjG8X9au.js","assets/index-ig1dOV33.css","assets/index-jolZgkUr.css","assets/kit-D4QkXifi.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CRVvi3de.js","assets/memoryView-BUy_riEk.js","assets/menuPick-C8hcXuBw.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DP4Zd7cu.js","assets/order-CL8c5rd_.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Dg7w285F.js","assets/photoBooth-DRkjn4Ed.js","assets/photoShoot-D1dl3zyF.js","assets/plumbing-2NjtIBJA.js","assets/promiseCard-B9_n2fwe.js","assets/push-7gfW5vzG.js","assets/render-CXLhq_3v.js","assets/render-Tsk33r5R.js","assets/reveal-G76ZBCCo.js","assets/rhythmDance-C5rmgh1I.js","assets/rng-LLIeWRGS.js","assets/runtime-Ctk-IPJH.js","assets/scene-Bwb9K--h.js","assets/scene-C7nCHeHi.css","assets/scene-Dt1iGH_F.js","assets/scenes-BY_9DXB4.js","assets/session-BvaZusSZ.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-Doa2BT35.js","assets/spaRelax-DWW3TQpH.js","assets/store-RNJ86PT-.js","assets/styles-DDT62FZD.js","assets/thoughts-B2smGTwS.js","assets/tidy-fYbzloZQ.js","assets/touchDiag-BuHqloG0.js","assets/ui-B-8X5rjm.css","assets/ui-B6OLulsj.js","assets/ui-BDrrPLVW.js","assets/ui-BurU-WAR.css","assets/ui-CAUT_Fif.js","assets/ui-CMZFUotC.js","assets/ui-CNZ24vBg.js","assets/ui-DHb67TpU.js","assets/ui-Drh37S7U.js","assets/ui-qucBE0id.js","assets/view-Bbk0ctQe.js","assets/view-C5c_xCp7.css","assets/wardrobe-Czi-mQFa.js","assets/wires-Dc7pb_hC.js","index.html","manifest.webmanifest"];

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
