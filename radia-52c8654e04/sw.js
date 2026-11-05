/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw38yuhn-a471aa5';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CxjnANAt.js","assets/app-Ym8BkdiG.js","assets/art-0xtdrhC5.js","assets/art-C3hqhhsb.js","assets/badge-BMDQvrdh.js","assets/bouquet-vdmLkMtn.js","assets/braceletReveal-DyGi6OaX.js","assets/career-Bnb6gN8p.js","assets/career-D4Kjo_a9.css","assets/careerGame-Bytarp17.js","assets/casino-C7x_x9vy.js","assets/castle-BMvovhX-.css","assets/castle-CfBSGiMS.js","assets/cat-BTfquqEx.js","assets/cat-CFSgjdVK.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Cwo3WgNg.js","assets/chocolateBox-DRllYDBw.js","assets/chocolaterie-BHb-J_S0.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-C2lnHLVF.js","assets/common-DiAg92k_.js","assets/creativeUi-CjVZMYOa.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BrlKwZVc.js","assets/decorTable-Fa3_iN_5.js","assets/demo-DFhvYdh9.js","assets/drawing-ChZC4gK4.js","assets/dressVerdict-DJvtwQny.js","assets/dressing-D8TIKrIk.js","assets/dressing-DRvvLtmc.css","assets/family-gy-OT53v.css","assets/family-hcc2b8dY.js","assets/fans-BDvLX-zz.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-COZP0_tk.js","assets/finale-B8Ck8L_U.js","assets/fireworksPhoto-FQvvfLr7.js","assets/frame-Cgv0Dwhl.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-UgqzqzO7.js","assets/gallery-BDPEmtyd.js","assets/garden-BLPKRd64.js","assets/garden-DazHrlMv.css","assets/garden-DsBuBAo1.js","assets/garden-Mx6sNBPo.js","assets/garden-Y-QGNMgE.js","assets/giftArt-BvjxAhI5.js","assets/guessMenu-DbHd1WYS.js","assets/harness-CY8v37P3.js","assets/host-CkjzC7TQ.js","assets/hub-C4LbLexs.css","assets/hub-DqxwpFgH.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BPkeBA2u.js","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-CUWLhc3J.js","assets/index-CjWub36C.js","assets/index-DGO3-hpR.js","assets/index-DNlVaGFs.css","assets/index-DS5l90hb.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DlYiYXwe.js","assets/index-ig1dOV33.css","assets/index-ol3D31Hw.js","assets/kit-DOzxEsJ8.css","assets/kit-Dd6TkRJs.js","assets/memoryChallenge-C2OfxXMb.js","assets/memoryView-qAdx6urx.js","assets/menuPick-8Om0lSRb.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Cbm6MEz_.js","assets/order-BLhCDyDu.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-6HADG0Cx.js","assets/photoBooth-5oEWA3RY.js","assets/photoShoot-bO4txYxe.js","assets/plumbing-Dby4fpkt.js","assets/promiseCard-DYohLA-C.js","assets/render-Cg_KyTdo.js","assets/render-DV1sEqLa.js","assets/reveal-CjJzaFU4.js","assets/rhythmDance-BHMltsDD.js","assets/rng-LLIeWRGS.js","assets/runtime-Dy4WVrHQ.js","assets/scene-2hmICCDi.js","assets/scene-C7nCHeHi.css","assets/scene-DI3Ho6Gi.js","assets/scenes-YOxEJzZw.js","assets/session-DIiR4Tfp.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BLKnhWLH.js","assets/spaRelax-DiWt3Dcu.js","assets/store-B1Vaxzhp.js","assets/styles-DDT62FZD.js","assets/tidy-BdKXxs1k.js","assets/touchDiag-DcHgAOF_.js","assets/ui-B-8X5rjm.css","assets/ui-BOaaaxia.js","assets/ui-BurU-WAR.css","assets/ui-C3tfgLyn.js","assets/ui-C6I4hXIs.js","assets/ui-CIVr-ALM.js","assets/ui-CQ7FjfTS.js","assets/ui-QVXaXxMS.js","assets/ui-pgmcRgSA.js","assets/ui-zBPV9PyF.js","assets/wardrobe-mvIQFO5-.js","assets/wires-CIzsOixr.js","index.html","manifest.webmanifest"];

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
