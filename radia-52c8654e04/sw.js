/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw921qaz-240e075';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BHdIpfmq.js","assets/app-DiQixfRT.js","assets/arrangeCare-ChMVAZJV.js","assets/art-Bw1DuZZV.js","assets/art-C3j0eaZy.js","assets/art-CEzXygEx.js","assets/badge-HKElHORe.js","assets/board-CYHePGyD.js","assets/board-XtzwRxRo.css","assets/bouquet-DvNzEpzP.js","assets/braceletReveal-D1nNsQXg.js","assets/career-D4Kjo_a9.css","assets/career-DyFNHDLS.js","assets/careerGame-BYehiBoJ.js","assets/casino-D2nW_LLK.js","assets/castle-BMvovhX-.css","assets/castle-Dze-lrCw.js","assets/cat-DaPNr-Ui.css","assets/cat-Dk-bijhW.js","assets/cat-jseO91Ju.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DLMOlLEu.js","assets/chocolateBox-BptEgYKo.js","assets/chocolaterie-CrDP98NB.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CFR0TPRN.js","assets/common-hsNnhn3r.js","assets/creativeUi-UWQ4fcMh.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BreBNPZU.js","assets/decorTable-DEiz9Rra.js","assets/demo-DFhvYdh9.js","assets/drawing-D8nBQJnn.js","assets/dressVerdict-Jf76eI7o.js","assets/dressing-CZfMXeHq.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-CDJ_DZGz.js","assets/faceStudio-e8Y12Wa-.css","assets/family-C6hR7lGK.js","assets/family-gy-OT53v.css","assets/familyPick-B5FDcmRX.js","assets/fans-BXo_QXE3.css","assets/fans-D-RKsVEA.js","assets/fashionThemes-BNVqpDQ5.js","assets/finale-DF4XNw7m.js","assets/fireworksPhoto-Bd0_htDw.js","assets/frame-sweXFMqH.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-8tIdRR6R.js","assets/gallery-D02J5Y-1.js","assets/garden-3tDmsu9O.js","assets/garden-B-zHjCqM.js","assets/garden-C64DXjAk.js","assets/garden-DazHrlMv.css","assets/garden-DsxxndsU.js","assets/giftArt-CBXTFIsu.js","assets/guessMenu-Dkb6Z2Cm.js","assets/harness-CBZAepL5.js","assets/host-BO6N8i8o.js","assets/hub-C4LbLexs.css","assets/hub-CuZC4AWl.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BQSbUnmS.js","assets/index-BRWvVPWG.css","assets/index-CDvJsq4F.css","assets/index-CNnMDsT2.js","assets/index-COJ4GiVe.css","assets/index-CbomrD44.js","assets/index-Cvl15xqZ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Ddqe3vtK.js","assets/index-jolZgkUr.css","assets/index-oK0NcI-Q.js","assets/index-x47FR9mG.js","assets/kit-DFACwrUv.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CwhgDQnJ.js","assets/memoryView-Baqz6IA_.js","assets/menuPick-C7_XMyP7.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BVaXx3wi.js","assets/order-CdIYk871.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BHN1VTfg.js","assets/photoBooth-PKZny6Ye.js","assets/photoShoot-Cw9D5Man.js","assets/plumbing-tKb-amhh.js","assets/progressConsent-C-6w4ZAE.js","assets/progressSync-BJ11hbu6.js","assets/promiseCard-CoSHT0Y0.js","assets/push-BMW8mCGy.js","assets/render-D-NmtjFK.js","assets/render-Db5I3EBG.js","assets/reveal-DE2_g9BQ.js","assets/rhythmDance-iC-b34c-.js","assets/rng-LLIeWRGS.js","assets/runtime-DoDAKyFS.js","assets/scene-BIT2p3Mv.js","assets/scene-BqkTaN7V.js","assets/scene-C28U2wSL.css","assets/scenes-8YBgg-PS.js","assets/session-D1qIF_HG.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-D9N9wmIF.js","assets/spaRelax-DaMFEgN4.js","assets/stats-vu1ShtQk.js","assets/statsConsent-DQOCQgkz.js","assets/store-BzOQEnjK.js","assets/styles-DDT62FZD.js","assets/thoughts-DtgeEAvA.js","assets/thoughts-lw9uL1wa.css","assets/tidy-BZjtFOY9.js","assets/touchDiag-Dwu2AGCi.js","assets/ui--vv2ruIc.js","assets/ui-B-8X5rjm.css","assets/ui-B6ReHEWb.js","assets/ui-BurU-WAR.css","assets/ui-CfHfpmLz.js","assets/ui-CpyYlprS.js","assets/ui-DNiqAM2B.js","assets/ui-DWAm0la1.js","assets/ui-Dsa7kZjT.js","assets/ui-U3Xz7MWq.js","assets/view-C5c_xCp7.css","assets/view-DmYU_IY9.js","assets/wardrobe-BVorni3m.js","assets/wires-DyuptVJW.js","index.html","manifest.webmanifest"];

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
