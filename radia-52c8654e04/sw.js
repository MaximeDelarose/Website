/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mwabyxkg-441db22';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-Ba6HNRlV.js","assets/app-BOby-p-H.js","assets/arrangeCare-QmoY4l2c.js","assets/art-BM8YnseV.css","assets/art-BO3XrOBO.js","assets/art-CfDmdS0D.js","assets/art-Czs9ZwOU.js","assets/badge-C66FeW-M.js","assets/board-DIndz-6b.js","assets/board-XtzwRxRo.css","assets/bouquet-BfUTnyqy.js","assets/braceletReveal-VmOxgdky.js","assets/career-D4Kjo_a9.css","assets/career-GqoGncNX.js","assets/careerGame-B1Px60Oc.js","assets/casino-CHno-C7c.js","assets/castle-BMvovhX-.css","assets/castle-CA5k3jTb.js","assets/cat-DLssmeL9.js","assets/cat-DaPNr-Ui.css","assets/cat-lLxS1X30.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-DIh1A_ze.js","assets/chocolateBox-BZpG9-ir.js","assets/chocolaterie-BEUh7YGZ.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-DIwl3Fcj.js","assets/common-B5xwIXqD.js","assets/creativeUi-BOdDU6Da.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-nExHBSde.js","assets/decor-DIZdPNBC.js","assets/decorTable-CTdi9lHG.js","assets/demo-DFhvYdh9.js","assets/drawing-BePDdkkf.js","assets/dressVerdict-C47A8ux0.js","assets/dressing-B9BgN6dB.js","assets/dressing-DRvvLtmc.css","assets/faceStudio-CtgPU9v9.js","assets/faceStudio-e8Y12Wa-.css","assets/family-DMLVJw8D.js","assets/family-gy-OT53v.css","assets/familyPick-DJ9tYKfk.js","assets/fans-BJpoF4nS.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-Dnd1ZEB9.js","assets/finale-CXdLWmWD.js","assets/fireworksPhoto-D-nWHgR2.js","assets/frame-Cs4vibvD.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DXWgXgWI.js","assets/gallery-DJlcfkCL.js","assets/garden-BVWV8X14.js","assets/garden-D259BVCe.js","assets/garden-D4wIyEWZ.js","assets/garden-DazHrlMv.css","assets/garden-DlhojQLi.js","assets/giftArt-DW7n04rv.js","assets/guessMenu-D3NixjWk.js","assets/harness-bbCqdSJB.js","assets/host-C1OL6sb2.js","assets/hub-BttOA-x5.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BGi0VXrc.js","assets/index-BRWvVPWG.css","assets/index-CBpjQeP4.js","assets/index-CDvJsq4F.css","assets/index-COJ4GiVe.css","assets/index-Ch5nCYKX.js","assets/index-CkrNuZv2.js","assets/index-CmdPmYzh.css","assets/index-D-IYKru_.js","assets/index-D0Yr6hIZ.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DwobJLDJ.js","assets/kit-BzfMt747.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DORWw7He.js","assets/memoryView-BslPcfPD.js","assets/menuPick-CbfBRTfk.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CBzaH6HE.js","assets/order-DkHA9LtH.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/crownp-gold.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/facep-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/headp-radia-nc.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B2Vk-KC4.js","assets/photoBooth-B2-lkZH3.js","assets/photoShoot-C9cOlqNe.js","assets/plumbing-B7TVCXVY.js","assets/progressConsent-BwI2-_zO.js","assets/progressSync-CcStJMJa.js","assets/promiseCard-DnSDU4wT.js","assets/push-CjeYjp-7.js","assets/render-B3sJ9Ya6.js","assets/render-CGwzmfih.js","assets/reveal-B3DC6FHV.js","assets/rhythmDance-CFW-80o1.js","assets/rng-LLIeWRGS.js","assets/runtime-C_XSZAWO.js","assets/scene-C28U2wSL.css","assets/scene-D4RR5mr4.js","assets/scene-DzdOYQlC.js","assets/scenes-Cu-W-Lod.js","assets/session-DDUFFL1K.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-ChJBVLbq.js","assets/spaRelax-Dx1Hodgp.js","assets/stats-Cf2aUybU.js","assets/statsConsent-CAPYBb-e.js","assets/store-CRWMrVln.js","assets/store-GW3vp1Qf.js","assets/styles-DDT62FZD.js","assets/thoughts-CYY7RP5T.js","assets/thoughts-lw9uL1wa.css","assets/tidy-6YRhlQXM.js","assets/touchDiag-C5n7xLl7.js","assets/ui-BNXNzPFd.js","assets/ui-BXfsvJ4i.css","assets/ui-BurU-WAR.css","assets/ui-C4Hdx8Yh.js","assets/ui-CJHzzJVw.js","assets/ui-CJbQ6Ztm.js","assets/ui-Cxjrar60.js","assets/ui-CybmOluY.js","assets/ui-CyhpotfY.js","assets/ui-DwEoVFFz.js","assets/view-C5c_xCp7.css","assets/view-CbOdv7eN.js","assets/wardrobe-DqwfwHjq.js","assets/wires-B3ZTKt3m.js","index.html","manifest.webmanifest"];

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
