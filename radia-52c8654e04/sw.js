/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mwo6ztjz-1e08dab';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-Bhvl9Tsy.js","assets/ambient-Cb3z4Q9r.js","assets/app-DNLQfIk0.js","assets/arrangeCare-Bz6GS-Yx.js","assets/art-3VENFdEY.js","assets/art-BM8YnseV.css","assets/art-BY7jr5_s.js","assets/art-wUto5VAa.js","assets/badge-CLcGXiFH.js","assets/board-DpitmVdL.js","assets/board-XtzwRxRo.css","assets/bouquet-T6IYgwfV.js","assets/braceletReveal-BAwDDRs-.js","assets/career-BKIGeyBP.css","assets/career-CZkLLXFP.js","assets/careerGame-CRO7GdKr.js","assets/casino-DUUMcs8e.js","assets/castle-BDhpVJM5.js","assets/castle-BMvovhX-.css","assets/cat-DOkD8mDw.js","assets/cat-DaPNr-Ui.css","assets/cat-DiKSsEhx.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-jplndTiT.js","assets/chocolateBox-_ptst9hs.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DZ-Sz1bj.js","assets/cinemaQuiz-D-JUql1z.js","assets/common-Bz1ncpnX.js","assets/creativeUi-CiJaXNrI.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-DgExB6gu.js","assets/decor-BZBTbkBZ.js","assets/decorTable-CBtNGoaz.js","assets/demo-DA5d0Kqi.js","assets/drawing-DX_KX26u.js","assets/dressVerdict-4sPUhvOR.js","assets/dressing-Boo3qm1Q.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-DhEl_JB0.js","assets/faceStudio-e8Y12Wa-.css","assets/family-gy-OT53v.css","assets/family-mHAQJdzG.js","assets/familyPick-Ct8QQkY1.js","assets/fans-BXo_QXE3.css","assets/fans-D0VM-fKt.js","assets/fashionThemes-DV8V6IRK.js","assets/finale-C82S46N7.js","assets/fireworksPhoto-DX9D3dV2.js","assets/frame-Dz5hlUNx.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CuV_VAd-.js","assets/gallery-CabeOuMn.js","assets/garden-BXJsX6VF.js","assets/garden-D4tcmn49.js","assets/garden-DGB_ECIQ.js","assets/garden-DazHrlMv.css","assets/garden-u_RO8fiT.js","assets/giftArt-BWvy8glz.js","assets/guessMenu-eowYT75_.js","assets/harness-C3HODbq0.js","assets/host-BFMULWBs.js","assets/hub-DFxr42_r.js","assets/hub-DlYdDyqK.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-4k24Ice3.js","assets/index-BRWvVPWG.css","assets/index-BSItFIeA.js","assets/index-BTFDySID.js","assets/index-CB59SkSy.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-CmdPmYzh.css","assets/index-CoUHl_75.js","assets/index-DEaUEiEi.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DqFRNWBH.js","assets/kit-DOzxEsJ8.css","assets/kit-tSBs5TyC.js","assets/memoryChallenge-hH98oQsU.js","assets/memoryView-BViEg1UC.js","assets/menuPick-gmK1Gqsn.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DI6mIXsP.js","assets/order-CGw5Txff.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BbQPhtFK.js","assets/photoBooth-BEWJxl2I.js","assets/photoShoot-2xSd5643.js","assets/plumbing-N17JL53a.js","assets/progressConsent-Dervzpji.js","assets/progressSync-C1NT5Oml.js","assets/promiseCard-HxyyZRuK.js","assets/push-D1cN1sCa.js","assets/render-B5svhpkM.js","assets/render-CpLHFT1N.js","assets/reveal-Cm3sU6xH.js","assets/rhythmDance-CLYDhkv0.js","assets/rng-LLIeWRGS.js","assets/runtime-Ao98O293.js","assets/scene-C28U2wSL.css","assets/scene-CTat9WU2.js","assets/scene-DDNJV_lZ.js","assets/scenes-YMAbs0Um.js","assets/session-DaGqcqll.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DcnJ9B30.js","assets/spaRelax-DhXot3Zl.js","assets/stats-CG4W1z0V.js","assets/statsConsent-IBEm5zl7.js","assets/store-BIIiRuLD.js","assets/store-DiOlrRzJ.js","assets/styles-DDT62FZD.js","assets/thoughts-CP3SR3xU.js","assets/thoughts-lw9uL1wa.css","assets/tidy-Dwef5Dhm.js","assets/touchDiag-GolwNcFy.js","assets/ui-BXfsvJ4i.css","assets/ui-BurU-WAR.css","assets/ui-BvaZx2gy.js","assets/ui-C14zkUGY.js","assets/ui-CFGz0ga_.js","assets/ui-CRiwChVU.js","assets/ui-CoAi8upq.js","assets/ui-DJ0H5lQl.js","assets/ui-DQhr9gmb.js","assets/ui-kLIPdnro.js","assets/view-C5c_xCp7.css","assets/view-D3gNXbme.js","assets/wardrobe-Bpo6WUMr.js","assets/wires-CfPS09Xk.js","index.html","manifest.webmanifest"];

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
