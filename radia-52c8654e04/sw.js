/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw91b0vo-8ef6a0f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Dictrsq5.js","assets/app-D5U9s4Uz.js","assets/arrangeCare-DFhJswB9.js","assets/art-5GMsfB-a.js","assets/art-CD0L0yvb.js","assets/art-CYtLlngN.js","assets/badge-DnKOo9j4.js","assets/board-C18ZsqoN.js","assets/board-XtzwRxRo.css","assets/bouquet-C0Q2K_lZ.js","assets/braceletReveal-DpHRu_-G.js","assets/career-D1nrQDlw.js","assets/career-D4Kjo_a9.css","assets/careerGame-D7l2PMK9.js","assets/casino-Cs73i2b3.js","assets/castle-BMvovhX-.css","assets/castle-CY0F8jZ1.js","assets/cat-BSMIRDaG.js","assets/cat-DaPNr-Ui.css","assets/cat-z1QudniO.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CXcrY5DF.js","assets/chocolateBox-CoIbbXJq.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DKVOZv2Q.js","assets/cinemaQuiz-0dPrwHRo.js","assets/common-ypkYc0LB.js","assets/creativeUi-CYMK44K2.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BOJgzSNh.js","assets/decorTable-BdD7iLQL.js","assets/demo-DFhvYdh9.js","assets/drawing-VimXO5kq.js","assets/dressVerdict-06ucKNQJ.js","assets/dressing-DRvvLtmc.css","assets/dressing-kspCsDY1.js","assets/faceStudio-KPgdSdkY.js","assets/faceStudio-e8Y12Wa-.css","assets/family-C07ER6b4.js","assets/family-gy-OT53v.css","assets/familyPick-DIlTFMSi.js","assets/fans-BXo_QXE3.css","assets/fans-B_oWmebs.js","assets/fashionThemes-pDWMQAD1.js","assets/finale-C_ovCIKU.js","assets/fireworksPhoto-DK_irEIp.js","assets/frame-cJ_OANqC.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CA_BaF7U.js","assets/gallery-x9y_2uJ-.js","assets/garden--PrBMynQ.js","assets/garden-CRxZLjM4.js","assets/garden-DQM8uCeO.js","assets/garden-DazHrlMv.css","assets/garden-DbScVPgS.js","assets/giftArt-D7CS0JTe.js","assets/guessMenu-BUFaakIY.js","assets/harness-DjPyXUAs.js","assets/host-y-kqZpbo.js","assets/hub-C4LbLexs.css","assets/hub-cnUF14dl.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BBIhOKEL.js","assets/index-BIes7EWI.js","assets/index-BQmai7oK.js","assets/index-BRWvVPWG.css","assets/index-BySJYgJg.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-CuWxge8q.js","assets/index-CyH8FCnS.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-deUZwWJc.js","assets/index-jolZgkUr.css","assets/kit-BKxXU6-U.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-Cms5Gn74.js","assets/memoryView-Dq3nQfxs.js","assets/menuPick-BwYEQwIy.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-llyPQCd_.js","assets/order-BwR6_5li.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BuhBrt6N.js","assets/photoBooth-CcfJ-EIR.js","assets/photoShoot-DW83uBor.js","assets/plumbing-BB7dXYXk.js","assets/progressConsent-DUK4E6Ql.js","assets/progressSync-D3s9RXfy.js","assets/promiseCard-jgyLS4OR.js","assets/push-CEjYUwoC.js","assets/render-ahJa5NmP.js","assets/render-uVPw6JXJ.js","assets/reveal-B3x647RZ.js","assets/rhythmDance-CuSPYNRZ.js","assets/rng-LLIeWRGS.js","assets/runtime-Bvqa3KxE.js","assets/scene-C28U2wSL.css","assets/scene-C4VhXNZ0.js","assets/scene-Do2tKO7u.js","assets/scenes-Ci8FyqwJ.js","assets/session-CnkJQ_Hj.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BnXOVw1w.js","assets/spaRelax-CC0KR6su.js","assets/stats-BtNbO_QH.js","assets/statsConsent-D4eja-17.js","assets/store-CMjyta48.js","assets/styles-DDT62FZD.js","assets/thoughts-DSZgV5_H.js","assets/thoughts-lw9uL1wa.css","assets/tidy-f2j2kMKg.js","assets/touchDiag-C0Rw_bxn.js","assets/ui-7KuBoFMz.js","assets/ui-B-8X5rjm.css","assets/ui-BurU-WAR.css","assets/ui-BzUAjbB_.js","assets/ui-CIz1OYDd.js","assets/ui-CYiy657F.js","assets/ui-D-aQ_RF_.js","assets/ui-DEs5icNu.js","assets/ui-Dlyp7pWS.js","assets/ui-c62Aga1X.js","assets/view-C5c_xCp7.css","assets/view-Ds8CKlAd.js","assets/wardrobe-308Sh7uZ.js","assets/wires-wzG5YOPS.js","index.html","manifest.webmanifest"];

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
