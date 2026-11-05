/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw434en6-68d5742';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-K0-M3H1F.js","assets/app-BEAZNa1s.js","assets/arrangeCare-DMsC_tdq.js","assets/art-CVHzG-tv.js","assets/art-CoxaFFLX.js","assets/art-iL-4KEjw.js","assets/badge-BnhFk7f5.js","assets/board-Cxn4P4rc.js","assets/board-XtzwRxRo.css","assets/bouquet-CGrWiOr_.js","assets/braceletReveal-MW0C7VR9.js","assets/career-CXCNC7eB.js","assets/career-D4Kjo_a9.css","assets/careerGame-CieFuNGb.js","assets/casino-CWgg2uOn.js","assets/castle-BMvovhX-.css","assets/castle-CWdPmn5f.js","assets/cat-DaPNr-Ui.css","assets/cat-DtWK8wSm.js","assets/cat-YeMWshzg.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DCB-8OFT.js","assets/chocolateBox-BcqUyPGN.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DwQpWKDf.js","assets/cinemaQuiz-BMYqZakZ.js","assets/common-D6TpQi6l.js","assets/creativeUi-C0xZRR1u.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-CsZ4oNMz.js","assets/decorTable-C6wX-qQ5.js","assets/demo-DFhvYdh9.js","assets/drawing-CL0DbrnY.js","assets/dressVerdict-BkO_ujA8.js","assets/dressing-CwT7eiVM.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-Ck2_9NL4.js","assets/faceStudio-e8Y12Wa-.css","assets/family-Cn0AjctX.js","assets/family-gy-OT53v.css","assets/familyPick-BFfU5nR7.js","assets/fans-BXo_QXE3.css","assets/fans-CUJvWiD9.js","assets/fashionThemes-DEjso655.js","assets/finale-zFRC9GB9.js","assets/fireworksPhoto-Dch0OlH9.js","assets/frame-UsVpVbSn.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-ByY1KpAf.js","assets/gallery-BaSj0Kaa.js","assets/garden-BTS0kYoh.js","assets/garden-CEMbslW5.js","assets/garden-DazHrlMv.css","assets/garden-Dl-nMsET.js","assets/garden-mQD49RMu.js","assets/giftArt-BMREG3B4.js","assets/guessMenu-Bv4Fb6Pd.js","assets/harness-lsCOz3q3.js","assets/host-eiPRGKfX.js","assets/hub-C4LbLexs.css","assets/hub-plZntwrG.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BBW9MbcD.js","assets/index-BRWvVPWG.css","assets/index-BSj3BRkk.js","assets/index-Bgp_CR3j.css","assets/index-BlrA5Xem.js","assets/index-CLGad4UF.css","assets/index-Cv8SEaJ0.js","assets/index-D4xUNPGH.js","assets/index-DSqz392D.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-UwOzzAru.js","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-DrCV1Gq_.js","assets/memoryChallenge-BTbYp17M.js","assets/memoryView-CPnY-Vui.js","assets/menuPick-DNabfuTz.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-B9PUNLav.js","assets/order-BY4_gP69.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CpNTqtoY.js","assets/photoBooth-vooS0TX-.js","assets/photoShoot-B1h0s_RO.js","assets/plumbing-C1TyBNo6.js","assets/promiseCard-BFFIqSuY.js","assets/push-QYIdWvfR.js","assets/render-ByZIyq_u.js","assets/render-Dn9IM7C1.js","assets/reveal-B_YKOL3h.js","assets/rhythmDance-51E7nqSk.js","assets/rng-LLIeWRGS.js","assets/runtime-Chjuci6O.js","assets/scene-B2AYnRdv.js","assets/scene-C7nCHeHi.css","assets/scene-zkn7REZJ.js","assets/scenes-C1QzhbPq.js","assets/session-B9qM9Awn.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BjptAJgy.js","assets/spaRelax-wk8APT4H.js","assets/store-Cq4pAVBa.js","assets/styles-DDT62FZD.js","assets/thoughts-kv1Wme-U.js","assets/thoughts-lw9uL1wa.css","assets/tidy-DwTuIi4g.js","assets/touchDiag-B5Shfpen.js","assets/ui-B-8X5rjm.css","assets/ui-BTpUaEnr.js","assets/ui-BrrOeBv2.js","assets/ui-BurU-WAR.css","assets/ui-C1vzO60o.js","assets/ui-ClFs047S.js","assets/ui-DQDXi789.js","assets/ui-DuECpBb_.js","assets/ui-Duc5rgZP.js","assets/ui-f0HxBzhQ.js","assets/view-BpJtHwOJ.js","assets/view-C5c_xCp7.css","assets/wardrobe-BAAVnwxd.js","assets/wires-B4_67--g.js","index.html","manifest.webmanifest"];

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
