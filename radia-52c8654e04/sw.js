/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw8r6pfr-e912f7e';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BS32egKb.js","assets/app-BCBKm8Br.js","assets/arrangeCare-DZ5IhQub.js","assets/art-BJD5u3ca.js","assets/art-CgXLWb7S.js","assets/art-sR_U098H.js","assets/badge-DDEXj99W.js","assets/board-BiORHAIu.js","assets/board-XtzwRxRo.css","assets/bouquet-DXgmARte.js","assets/braceletReveal-BYw5dtaa.js","assets/career-D4Kjo_a9.css","assets/career-DaQgm34V.js","assets/careerGame-BVl2WoZ_.js","assets/casino-DKiWpggz.js","assets/castle-B6lZF12Z.js","assets/castle-BMvovhX-.css","assets/cat-CdaZOE3j.js","assets/cat-DaPNr-Ui.css","assets/cat-Dfaz23M1.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CeAQ6rst.js","assets/chocolateBox-WmddrIhO.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DjCJXDoC.js","assets/cinemaQuiz-DPodtdtJ.js","assets/common-BY-S6tUv.js","assets/creativeUi-BdN2mR8n.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-DQqxgFc4.js","assets/decorTable-B_kCOtF8.js","assets/demo-DFhvYdh9.js","assets/drawing-B-5MhK49.js","assets/dressVerdict-DtiL-hGq.js","assets/dressing-B-B87HXK.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-e8Y12Wa-.css","assets/faceStudio-sOheNvBn.js","assets/family-Cg79HDhK.js","assets/family-gy-OT53v.css","assets/familyPick-DkQvhS3P.js","assets/fans-BXo_QXE3.css","assets/fans-CowJFysT.js","assets/fashionThemes-DNPNXwKr.js","assets/finale-BZDJTlc_.js","assets/fireworksPhoto-MT1KKVl6.js","assets/frame-Buop--kb.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-RAead-JP.js","assets/gallery-B_8QJocB.js","assets/garden-BiPy2KMk.js","assets/garden-C91RFhbL.js","assets/garden-CdnSSvcy.js","assets/garden-Ck2ZRpXV.js","assets/garden-DazHrlMv.css","assets/giftArt-D1HHkXSL.js","assets/guessMenu-BzhT-bHM.js","assets/harness-C7vO67cO.js","assets/host-BRSRyIi7.js","assets/hub-BNcOYW8Q.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BmHTJvDA.js","assets/index-Bo8_MOcn.js","assets/index-CG96KwP0.css","assets/index-CLGad4UF.css","assets/index-CnySC5Qd.js","assets/index-DKj3zZIK.js","assets/index-DXjDzUJn.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-M5gBfDKO.js","assets/index-XfPDgSbU.js","assets/index-jolZgkUr.css","assets/kit-DOzxEsJ8.css","assets/kit-Dko91RcQ.js","assets/memoryChallenge-UhOo2xmq.js","assets/memoryView-C7MCv20N.js","assets/menuPick-COYLrqUM.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-IVBb25M8.js","assets/order-BjHy_oJv.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DUI6zJV9.js","assets/photoBooth-DdMaMhKe.js","assets/photoShoot-DTlXEIHc.js","assets/plumbing-B1JqdaBC.js","assets/promiseCard-BfsrkkAd.js","assets/push-CMxOuAF0.js","assets/render-BIO5rhBq.js","assets/render-CEYP2afR.js","assets/reveal-Dc7dHf72.js","assets/rhythmDance-CMslR3d7.js","assets/rng-LLIeWRGS.js","assets/runtime-BzdYUZXz.js","assets/scene-C28U2wSL.css","assets/scene-C645T8nl.js","assets/scene-CFvju9TK.js","assets/scenes-MPc_Tp5J.js","assets/session-DwE_R6Xj.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-DIjlAgTn.js","assets/spaRelax-BOiXKQxW.js","assets/stats-B45Gah_l.js","assets/statsConsent-Chuej1o7.js","assets/store-D4W8WqYt.js","assets/styles-DDT62FZD.js","assets/thoughts-CdbX_u8a.js","assets/thoughts-lw9uL1wa.css","assets/tidy-xL_h11Ti.js","assets/touchDiag-lDIqIHp2.js","assets/ui-B-8X5rjm.css","assets/ui-B3yvruMy.js","assets/ui-BlimhQ2w.js","assets/ui-BrPlOGUO.js","assets/ui-BurU-WAR.css","assets/ui-Cqm6jhZN.js","assets/ui-Dd0_wEeM.js","assets/ui-F0m46jax.js","assets/ui-PMSfLxLF.js","assets/ui-qaATn0qv.js","assets/view-C5c_xCp7.css","assets/view-DheJRwjO.js","assets/wardrobe-DpiL9pfP.js","assets/wires-MbA5G6R9.js","index.html","manifest.webmanifest"];

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
