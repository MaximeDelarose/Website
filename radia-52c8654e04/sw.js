/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw8yz18h-2cab65c';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BLh5fc8s.js","assets/app-DeF7wd8C.js","assets/arrangeCare-BHChUW5F.js","assets/art-CMhkF6dT.js","assets/art-CwnkAQPL.js","assets/art-DuTQ14Kn.js","assets/badge-CWyuTb6U.js","assets/board-59Z14pRR.js","assets/board-XtzwRxRo.css","assets/bouquet-DjktEVIR.js","assets/braceletReveal-O393df7g.js","assets/career-BZcx3xW6.js","assets/career-D4Kjo_a9.css","assets/careerGame-CJPblgwf.js","assets/casino-CFMrHox_.js","assets/castle-BMvovhX-.css","assets/castle-yoMZCPh8.js","assets/cat-D9osMlvH.js","assets/cat-DaPNr-Ui.css","assets/cat-Dl0nlAJg.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DHmym4MI.js","assets/chocolateBox-GFNPOkvI.js","assets/chocolaterie-B6TpButQ.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-BMGbNYgy.js","assets/common-D673C2Pi.js","assets/creativeUi-BD8mj9Uz.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-D3qKlh3b.js","assets/decorTable-Czs-GXXY.js","assets/demo-DFhvYdh9.js","assets/drawing-CirdlRWu.js","assets/dressVerdict-PLCovfhH.js","assets/dressing-D7SgV8DT.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-BDwLtCfh.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BbRpkmKL.js","assets/family-gy-OT53v.css","assets/familyPick-QDNs4mBS.js","assets/fans-BXo_QXE3.css","assets/fans-bpqUK3_I.js","assets/fashionThemes-DLUVVBdN.js","assets/finale-BcMkkrJr.js","assets/fireworksPhoto-CKwrsPlv.js","assets/frame-C1_XZZez.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-X3Qly7Uq.js","assets/gallery--DR5cXno.js","assets/garden-BoiqBDKi.js","assets/garden-DazHrlMv.css","assets/garden-_ss_YX-H.js","assets/garden-b1uTgm64.js","assets/garden-lAfES-UD.js","assets/giftArt-hPHH3bds.js","assets/guessMenu-CkXQ7-Xs.js","assets/harness-DlIlyNAl.js","assets/host-BU_3Gw3v.js","assets/hub-C4LbLexs.css","assets/hub-DlzTqF-i.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-63n3lAUn.js","assets/index-BRWvVPWG.css","assets/index-BSaRPLnZ.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-D0TXwmbN.js","assets/index-D0Z_MMGQ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dm6hle-k.js","assets/index-DvmRhGwh.js","assets/index-MeVfkcHG.js","assets/index-jolZgkUr.css","assets/kit-B4ZKaJoJ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DRbMq36r.js","assets/memoryView-DJOUc363.js","assets/menuPick-PJXh57A8.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DMWMXGRk.js","assets/order-BhQxcXXI.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DGUJWsDA.js","assets/photoBooth-DoN1qbqL.js","assets/photoShoot-4TotanS-.js","assets/plumbing-DI8EGcTs.js","assets/progressConsent-DCRZnaZR.js","assets/progressSync-DLSTeHC0.js","assets/promiseCard-BGBOR-0q.js","assets/push-QspJf5r5.js","assets/render-0l-NjO8e.js","assets/render-CGL4ibOZ.js","assets/reveal-CDV8QrrN.js","assets/rhythmDance-CIJh9mzh.js","assets/rng-LLIeWRGS.js","assets/runtime-UNG93W8x.js","assets/scene-C-Pc5q-F.js","assets/scene-C28U2wSL.css","assets/scene-CBHZ0S0j.js","assets/scenes-BV_yNkdt.js","assets/session-DtN6aJht.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-B3g-YMKr.js","assets/spaRelax-0PO9Y-gf.js","assets/stats-CVLKYvEP.js","assets/statsConsent-CQKPsyq5.js","assets/store-D28i9hPk.js","assets/styles-DDT62FZD.js","assets/thoughts-DeTCxMoV.js","assets/thoughts-lw9uL1wa.css","assets/tidy-C23x79tB.js","assets/touchDiag-CIHpPbm2.js","assets/ui-B-8X5rjm.css","assets/ui-BABusi-K.js","assets/ui-BWSuw50A.js","assets/ui-BcE1FI39.js","assets/ui-BtXsJU26.js","assets/ui-BurU-WAR.css","assets/ui-CKOMBT0T.js","assets/ui-Ck3_CY7H.js","assets/ui-DLuI1lI1.js","assets/ui-SxF8kw3E.js","assets/view-Buxauiia.js","assets/view-C5c_xCp7.css","assets/wardrobe-CwLT6p7D.js","assets/wires-BZL37G0C.js","index.html","manifest.webmanifest"];

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
