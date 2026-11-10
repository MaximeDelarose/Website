/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mwa0za0g-28c4e8e';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Br4v9XIP.js","assets/app-Ct8T6wqh.js","assets/arrangeCare-BNcOAoVa.js","assets/art-CbimQIOI.js","assets/art-DAKEsswk.js","assets/art-JsSsRl2p.js","assets/badge-BYygliPg.js","assets/board-XtzwRxRo.css","assets/board-btyJm12c.js","assets/bouquet-C6cCT29i.js","assets/braceletReveal-vVD6HjY4.js","assets/career-Bb0VKakD.js","assets/career-D4Kjo_a9.css","assets/careerGame-BEWsA4yu.js","assets/casino-DgGY1Azi.js","assets/castle-BMvovhX-.css","assets/castle-DWSasw7w.js","assets/cat-B-b4Ezc8.js","assets/cat-DQq_320Z.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Bs1RYsfz.js","assets/chocolateBox-nHp3zuSZ.js","assets/chocolaterie-B3SKbvmC.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-XkMk2of8.js","assets/common-CbROo-89.js","assets/creativeUi-CVFj4XDv.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-D_0Xs4Bi.js","assets/decor-BxdN4WAW.js","assets/decorTable-BXfEezyp.js","assets/demo-DFhvYdh9.js","assets/drawing-CK_z1-kV.js","assets/dressVerdict-BX6LEUw0.js","assets/dressing-BqrBa__E.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-B6uivVGy.js","assets/faceStudio-e8Y12Wa-.css","assets/family-ByROXRAy.js","assets/family-gy-OT53v.css","assets/familyPick-Ut6KS8J6.js","assets/fans-B0GvW2Ew.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-_1pY6kFX.js","assets/finale-4E5uaylo.js","assets/fireworksPhoto-BsyxQJv4.js","assets/frame-2AOsiwT5.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-vytJ53TU.js","assets/gallery-Bm5L9CVs.js","assets/garden-1QZ74n1P.js","assets/garden-BwAkbi-r.js","assets/garden-CEcTVQtC.js","assets/garden-DazHrlMv.css","assets/garden-kc7T9av6.js","assets/giftArt-Bm-rsWAM.js","assets/guessMenu-DFodbyHF.js","assets/harness-CLMlg1Nt.js","assets/host-BZJLn_7O.js","assets/hub-B5et_tCh.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-8Vcly7Dj.js","assets/index-BRWvVPWG.css","assets/index-BaUg7Yg9.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-Ce1eoqMo.js","assets/index-DJ4GpaVK.js","assets/index-DSqGAXQH.css","assets/index-DU6MEHOb.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DnLpuFl4.js","assets/index-Ds6L_MgH.js","assets/kit-32Zh0cEX.js","assets/kit-DOzxEsJ8.css","assets/memory-mGMFPaD9.js","assets/memoryChallenge-Bc5oCePi.js","assets/memoryView-CI2IX-Eq.js","assets/menuPick-D-FmXEEg.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DGZiChgX.js","assets/order-uVxzvIFi.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DCzT7OcT.js","assets/photoBooth-DkkPZvIs.js","assets/photoShoot-Dqv4Vezk.js","assets/plumbing-CXnU2xnI.js","assets/progressConsent-iOgSSn4c.js","assets/progressSync-Bcli8juF.js","assets/promiseCard-CvKcSuLY.js","assets/push-hW5i4BmB.js","assets/render-DDmyZOQz.js","assets/render-cyk0f4_n.js","assets/reveal-CFFsSHql.js","assets/rhythmDance-BMskeYFw.js","assets/rng-LLIeWRGS.js","assets/runtime-ansmh2tM.js","assets/scene-C28U2wSL.css","assets/scene-CPPfWjtR.js","assets/scene-nAe6cZkR.js","assets/scenes-Dio3_-_u.js","assets/session-DWlP_UYX.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DBb8oXG9.js","assets/spaRelax-lApglf4Z.js","assets/stats-B7ClfOI5.js","assets/statsConsent-DEyXdP8d.js","assets/store-CfnkwoMp.js","assets/store-S3HqWQ55.js","assets/styles-DDT62FZD.js","assets/thoughts-lnaEolbL.js","assets/thoughts-lw9uL1wa.css","assets/tidy-DESkEn0T.js","assets/touchDiag-CzasfQGr.js","assets/ui-5jhBuf4J.js","assets/ui-B-8X5rjm.css","assets/ui-B5X7l671.js","assets/ui-BW50bhAk.js","assets/ui-BlYXM1pp.js","assets/ui-BurU-WAR.css","assets/ui-D4ZWyny7.js","assets/ui-D9he7gYN.js","assets/ui-Dw8CRoEb.js","assets/ui-M4n0PFsA.js","assets/view-BCQEfWYH.js","assets/view-C5c_xCp7.css","assets/wardrobe-OlS6nRZN.js","assets/wires-CBUqM8JU.js","index.html","manifest.webmanifest"];

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
