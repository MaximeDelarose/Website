/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw42jwfp-6396f80';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-KRj3CF8m.js","assets/app-BI4TNE91.js","assets/arrangeCare-BK_od8YO.js","assets/art-Brl1oHDH.js","assets/art-CQ2A0lWF.js","assets/art-CqTZP5it.js","assets/badge-DxOEKRWT.js","assets/board-DIY7vC-A.js","assets/board-XtzwRxRo.css","assets/bouquet-xb5Ax6rg.js","assets/braceletReveal-DaC7JCM8.js","assets/career-D4Kjo_a9.css","assets/career-lbjgZtAD.js","assets/careerGame-CO2M_vvF.js","assets/casino-BR7tgf7V.js","assets/castle-BMvovhX-.css","assets/castle-CvycT7Dg.js","assets/cat-BQ0TMzYq.js","assets/cat-DaPNr-Ui.css","assets/cat-DjGM5Of-.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-FW9zZTFl.js","assets/chocolateBox-CCRPEN7x.js","assets/chocolaterie-BfnUWp91.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CEJMMsFA.js","assets/common-CMtWgfI8.js","assets/creativeUi-tOpxBMLH.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-V-JO5hd4.js","assets/decorTable-GiD3Qkmv.js","assets/demo-DFhvYdh9.js","assets/drawing-dLUHcI-z.js","assets/dressVerdict-C-0dvyeU.js","assets/dressing-C57CMMJx.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-8plKkDCR.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BjTXBp4L.js","assets/family-gy-OT53v.css","assets/familyPick-DetQW2sI.js","assets/fans-BJlVVkOE.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-BASYnbSp.js","assets/finale-CPxlc5cB.js","assets/fireworksPhoto-CpX7RVQ2.js","assets/frame-DoWlPjRB.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CP8Vo_x3.js","assets/gallery-DVJpl-jy.js","assets/garden-BMFbjcRA.js","assets/garden-BiSgE6TC.js","assets/garden-CiUsf00B.js","assets/garden-DazHrlMv.css","assets/garden-vEbqKNr2.js","assets/giftArt-S2ms-iRq.js","assets/guessMenu-D80pigh8.js","assets/harness-ClMwcNXO.js","assets/host-CuqrD31O.js","assets/hub-C4LbLexs.css","assets/hub-jP2kAo3C.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bgp_CR3j.css","assets/index-CLGad4UF.css","assets/index-CXykEV_d.js","assets/index-DGN7Gj2j.js","assets/index-DLiZ_c4-.js","assets/index-DLjtKVlG.js","assets/index-DV1pXk13.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-D_Pr9Xhq.js","assets/index-jolZgkUr.css","assets/index-xIA2xk1n.js","assets/kit-CRFWQpPB.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DVH4T2uD.js","assets/memoryView-Ccw23sBc.js","assets/menuPick-CbOK__VH.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-C_6So183.js","assets/order-BLYzu-8M.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CUHM4xsQ.js","assets/photoBooth-DCS2rNTt.js","assets/photoShoot-CCER4HGy.js","assets/plumbing-YX7o6bTH.js","assets/promiseCard-CHe7AZGr.js","assets/push-C_GZy3Kn.js","assets/render-BvJh2zb_.js","assets/render-DuF7sCik.js","assets/reveal-CBBR2nW6.js","assets/rhythmDance-BcFWooly.js","assets/rng-LLIeWRGS.js","assets/runtime-CaG6RCx9.js","assets/scene-C7nCHeHi.css","assets/scene-diUTdtqf.js","assets/scene-e06Qg9UA.js","assets/scenes-CUILMLXM.js","assets/session-CQ6czBfR.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-pWDVIwyh.js","assets/spaRelax-BoM00rAT.js","assets/store-K7gQV40K.js","assets/styles-DDT62FZD.js","assets/thoughts-CsPrWnbL.js","assets/thoughts-lw9uL1wa.css","assets/tidy-YmNrBelr.js","assets/touchDiag-BYEwvDam.js","assets/ui-B-8X5rjm.css","assets/ui-B3gBMPUF.js","assets/ui-B8UAf6Ev.js","assets/ui-BDNG1zL5.js","assets/ui-BurU-WAR.css","assets/ui-CAw-9blS.js","assets/ui-CLwj8Byj.js","assets/ui-CZPFaUDA.js","assets/ui-D8rphSRq.js","assets/ui-DYkenMyd.js","assets/view-C5c_xCp7.css","assets/view-CG85fqYo.js","assets/wardrobe-D0UyyIoh.js","assets/wires-C_1cgjWH.js","index.html","manifest.webmanifest"];

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
