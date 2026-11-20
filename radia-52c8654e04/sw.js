/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mwo8195z-78d6556';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-Bhvl9Tsy.js","assets/ambient-BsKXnKAy.js","assets/app-BlApTRHh.js","assets/arrangeCare-CBQ5tUm0.js","assets/art-BH0Ynqta.js","assets/art-BM8YnseV.css","assets/art-BSQlQc_E.js","assets/art-CELaJrBm.js","assets/badge-D8syeeFJ.js","assets/board-DSJ-zdwY.js","assets/board-XtzwRxRo.css","assets/bouquet-CxTw_GPL.js","assets/braceletReveal-ZCo8VSAp.js","assets/career-BKIGeyBP.css","assets/career-DWiNXJCU.js","assets/careerGame-9laILZUl.js","assets/casino-C827x5eA.js","assets/castle-BMvovhX-.css","assets/castle-BdXdL23h.js","assets/cat-BqtaAqki.js","assets/cat-DaPNr-Ui.css","assets/cat-L_LcnvFC.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-XCXZFMSy.js","assets/chocolateBox-B1UJz-6o.js","assets/chocolaterie-C8JS3HHr.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-l4sMCUl7.js","assets/common-sJN9V_OR.js","assets/creativeUi-BnVS8dxh.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-DgExB6gu.js","assets/decor-DqjKr9Qj.js","assets/decorTable-DOeWdpfo.js","assets/demo-CCnAs1On.js","assets/drawing-CAM2d38D.js","assets/dressVerdict-Czfka_4A.js","assets/dressing-D4HiFU47.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-BOljraw8.js","assets/faceStudio-e8Y12Wa-.css","assets/family-BGsXiAJx.js","assets/family-gy-OT53v.css","assets/familyPick-p9Ag-sII.js","assets/fans-BXo_QXE3.css","assets/fans-DPxcnD90.js","assets/fashionThemes-CK9TmUWN.js","assets/finale-CAWr2oh7.js","assets/fireworksPhoto-DsxXTW_P.js","assets/frame-BR2HFtcP.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-C8DwaVCU.js","assets/gallery-A4oyXzkp.js","assets/garden-BE4RuN7w.js","assets/garden-DRMenyAe.js","assets/garden-DazHrlMv.css","assets/garden-Dba3lv3K.js","assets/garden-DkSZcVe3.js","assets/giftArt-CtM9Z0x8.js","assets/guessMenu-DVPDwmVp.js","assets/harness-C1jSHNLD.js","assets/host-BjE3KSqo.js","assets/hub-CHFsGK2y.js","assets/hub-DlYdDyqK.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BR-v7xEP.js","assets/index-BRWvVPWG.css","assets/index-CBxO2BfG.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-CZCgMJ_N.js","assets/index-CmdPmYzh.css","assets/index-CvDjI1Q0.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DbLLZCK7.js","assets/index-DmxlQQ7Z.js","assets/index-nnAETeOR.js","assets/kit-D7_2mzt2.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CNcE3Tqq.js","assets/memoryView-Dbc2k--f.js","assets/menuPick-eNVNh628.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DY33HTlV.js","assets/order-BxXEL-ZS.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DR5k0X5l.js","assets/photoBooth-C6ELN08S.js","assets/photoShoot-CoqCsaWz.js","assets/plumbing-BZROPlLZ.js","assets/progressConsent-BRJ9ANYN.js","assets/progressSync-Dk-I40Vq.js","assets/promiseCard-BvWxncdq.js","assets/push-DeLwY8Eo.js","assets/render-BQKSDCJk.js","assets/render-CmIHD_u5.js","assets/reveal-DFeK8meu.js","assets/rhythmDance-Ch4pI_6r.js","assets/rng-LLIeWRGS.js","assets/runtime-BQqiSf36.js","assets/scene-BMyAV8Mx.js","assets/scene-C28U2wSL.css","assets/scene-YBd8s_6e.js","assets/scenes-D-If2cOB.js","assets/session-kYxd1B98.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CnUJZ3oh.js","assets/spaRelax-CVaE1u0H.js","assets/stats-DQGYJmcE.js","assets/statsConsent-BK62Jr2F.js","assets/store-ANYy8psP.js","assets/store-DArdb-9j.js","assets/styles-DDT62FZD.js","assets/thoughts-Cu8WAzT3.js","assets/thoughts-lw9uL1wa.css","assets/tidy-CM4lyclo.js","assets/touchDiag-CIBZP9Pq.js","assets/ui-28i9FEcl.js","assets/ui-9zFMC0d4.js","assets/ui-B25mr10A.js","assets/ui-BQZuH8hz.js","assets/ui-BXfsvJ4i.css","assets/ui-BurU-WAR.css","assets/ui-CdDLsn9C.js","assets/ui-DxZD4SR5.js","assets/ui-MOZKVir6.js","assets/ui-UDEwhm5e.js","assets/view-C5c_xCp7.css","assets/view-DIXwSgZy.js","assets/wardrobe-DmLf42wT.js","assets/wires-Dxu-6oOt.js","index.html","manifest.webmanifest"];

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
