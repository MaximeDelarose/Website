/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw43n55j-7fa9b94';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Bc5Zsxeu.js","assets/app-CMZ4zjy-.js","assets/arrangeCare-DXHwy8uc.js","assets/art-BXmvbvy1.js","assets/art-C5Fkv7PE.js","assets/art-rHb3sr6R.js","assets/badge-obMVTpZ6.js","assets/board-CBNOSi6d.js","assets/board-XtzwRxRo.css","assets/bouquet-DThl3o8H.js","assets/braceletReveal-b5wUjrl9.js","assets/career-1gP8HB8E.js","assets/career-D4Kjo_a9.css","assets/careerGame-DXHjDvGF.js","assets/casino-C478WYA6.js","assets/castle-BMvovhX-.css","assets/castle-CR8NPpoI.js","assets/cat-B4Wo-9uy.js","assets/cat-CSUn2wp2.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-BTZTZD9J.js","assets/chocolateBox-CDTtu1fL.js","assets/chocolaterie-CVoPg8Fv.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-BLyPFSJX.js","assets/common-CyjAcQLr.js","assets/creativeUi-D5HDieq-.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BwH1wtk2.js","assets/decorTable-CystPNbO.js","assets/demo-DFhvYdh9.js","assets/drawing-B4gfQlAQ.js","assets/dressVerdict-B5c5hN56.js","assets/dressing-CwIdCxbT.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-C-W3s9Il.js","assets/faceStudio-e8Y12Wa-.css","assets/family-D5ithEVd.js","assets/family-gy-OT53v.css","assets/familyPick-8szLMDub.js","assets/fans-BXo_QXE3.css","assets/fans-adPG-3_q.js","assets/fashionThemes-Dh-qe3XV.js","assets/finale-BiY9WDq-.js","assets/fireworksPhoto-X4RXwchH.js","assets/frame-Bh8Dd5B0.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CKsWYxaY.js","assets/gallery-BqgPsHov.js","assets/garden-CASqPQZP.js","assets/garden-DazHrlMv.css","assets/garden-Dqdvq1Iu.js","assets/garden-Dxt5y88z.js","assets/garden-ONUoXIZb.js","assets/giftArt-Bj9HlKzg.js","assets/guessMenu-K4BMO-qv.js","assets/harness-CmsFIkz0.js","assets/host-CGlTICaH.js","assets/hub-C4LbLexs.css","assets/hub-CG3QvQcl.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BXcCf7SG.js","assets/index-Bgp_CR3j.css","assets/index-ByKHR13X.js","assets/index-CLGad4UF.css","assets/index-CnDCsEcL.js","assets/index-DWLu5Dpd.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-D_lzlcqw.js","assets/index-DbANVnwc.js","assets/index-SCyrzivv.js","assets/index-jolZgkUr.css","assets/kit-D1w1WMM6.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-BKiz7v4B.js","assets/memoryView-BnxPT-Wh.js","assets/menuPick-BNoGkkh-.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CBzAvbDy.js","assets/order-DxqDtO4R.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-XTJQpxpW.js","assets/photoBooth-Z0wTsueB.js","assets/photoShoot-CdvHprsN.js","assets/plumbing-CVr86qvU.js","assets/promiseCard-BjdOzKV_.js","assets/push-qUzNyNfT.js","assets/render-Dep5D1ts.js","assets/render-nNIqXS3W.js","assets/reveal-BWW5zJTP.js","assets/rhythmDance-C1Z94Slk.js","assets/rng-LLIeWRGS.js","assets/runtime-2QvRmFgt.js","assets/scene-BWNjAyhe.js","assets/scene-C28U2wSL.css","assets/scene-Dc_zCmqO.js","assets/scenes-CN0TZfUF.js","assets/session-Cu8BZlcY.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CwhATa4k.js","assets/spaRelax-h3owzA0w.js","assets/store-0Mb9HLik.js","assets/styles-DDT62FZD.js","assets/thoughts-BxWoeHmR.js","assets/thoughts-lw9uL1wa.css","assets/tidy-DUPsPXzn.js","assets/touchDiag-34UbPS3u.js","assets/ui-B-8X5rjm.css","assets/ui-BK1YEYBE.js","assets/ui-BfTEiI9P.js","assets/ui-BurU-WAR.css","assets/ui-BzSj1k_o.js","assets/ui-CDG7gI93.js","assets/ui-DMAamiHf.js","assets/ui-LxiSPioZ.js","assets/ui-hVGdvhEx.js","assets/ui-ue1_TzrP.js","assets/view-B9lZJEXi.js","assets/view-C5c_xCp7.css","assets/wardrobe-DIjNwssO.js","assets/wires-CAGpf85w.js","index.html","manifest.webmanifest"];

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
