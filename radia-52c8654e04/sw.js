/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2vpv5x-262051a';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-y-p1XXer.js","assets/app-ChZh0UN6.js","assets/art-Ben4seE7.js","assets/art-CDiYZE0R.js","assets/badge-Dt1V1hEo.js","assets/bouquet-BSXbn_O9.js","assets/braceletReveal-B5QHdoMZ.js","assets/career-CPhsEd9K.css","assets/career-DksUrXxr.js","assets/careerGame-BMyvlvs1.js","assets/casino-kbHQWlfl.js","assets/castle-BMvovhX-.css","assets/castle-Devy_GLS.js","assets/cat-DWWTaH3A.js","assets/cat-DaPNr-Ui.css","assets/cat-MJvjTeoA.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-B1lZ_X63.js","assets/chocolateBox-BJygNrsr.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-GCYISw8g.js","assets/cinemaQuiz-Cg0dNxKO.js","assets/common-Vyr9_G5Z.js","assets/creativeUi-N3oNleqW.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-Dy2xh9H2.js","assets/decorTable-DhI_Q15z.js","assets/demo-DFhvYdh9.js","assets/drawing-BVJKcfQ-.js","assets/dressVerdict-BJCF-cx5.js","assets/dressing-DRvvLtmc.css","assets/dressing-DgOYivJy.js","assets/family-CEUseSPu.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-Bk17T2A8.js","assets/fashionThemes-BE4zDWGs.js","assets/finale-DwbgtO87.js","assets/fireworksPhoto-DRcJZS-m.js","assets/frame-CiDRnHGt.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BU4Dx8ZX.js","assets/gallery-CEOU3AU8.js","assets/garden-2m5uDsUc.js","assets/garden-BJRRRf0Y.js","assets/garden-DazHrlMv.css","assets/garden-DyFhOybN.js","assets/garden-nKRTQM_B.js","assets/giftArt-Bw2x_1V6.js","assets/guessMenu-DjzceAQ4.js","assets/harness-BnWM0Tul.js","assets/host-8ZskGYzy.js","assets/hub-C5F_8lwE.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BShVNF-T.js","assets/index-Bq8T_-F9.js","assets/index-C6g0Rrj2.css","assets/index-CLGad4UF.css","assets/index-CSgxfTEq.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_13cnT5.js","assets/index-D_Bfde9M.css","assets/index-DbB_WPlw.js","assets/index-Dsb14wkA.js","assets/index-UEodvsA-.js","assets/kit-BY77yYXU.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-GVAH0fyt.js","assets/memoryView-D5QmjckX.js","assets/menuPick-7qyUn5ep.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-qxcfCjSg.js","assets/order-CIdUUcnh.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DAKLhWmW.js","assets/photoBooth-DO8r--kj.js","assets/photoShoot-DyLDpqz3.js","assets/plumbing-BaodwEI-.js","assets/promiseCard-Duo_9xOb.js","assets/render-D4gFS0kF.js","assets/render-DtCE8-Wm.js","assets/reveal-BBcvZImV.js","assets/rhythmDance-wUnZF6UI.js","assets/rng-LLIeWRGS.js","assets/runtime-CsUD02df.js","assets/scene-C7nCHeHi.css","assets/scene-CZpnBeCb.js","assets/scene-DJavOe89.js","assets/scenes-0Rn7Ig0-.js","assets/session-BnPvUxTJ.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-CJWjYGJD.js","assets/spaRelax-DdRKeIyA.js","assets/store-B9Vw5KCz.js","assets/styles-DDT62FZD.js","assets/tidy-CIWmbx2M.js","assets/ui-72yEGRO1.js","assets/ui-B-8X5rjm.css","assets/ui-B-cf1ccn.js","assets/ui-BG_bX4X4.js","assets/ui-BQmXEDJK.js","assets/ui-BmXuP5IT.js","assets/ui-BurU-WAR.css","assets/ui-C7Sn11x-.js","assets/ui-D3YKgOS9.js","assets/ui-DClc5Awt.js","assets/wardrobe-DchDfTi4.js","assets/wires-ChRGyIq7.js","index.html","manifest.webmanifest"];

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
