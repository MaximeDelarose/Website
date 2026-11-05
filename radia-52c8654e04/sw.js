/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw3cb1u7-3f22981';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-CaczB1Wq.js","assets/app-CiW1-8la.js","assets/art-CgLZVhex.js","assets/art-CgqjQSiW.js","assets/badge-CbX8_-v8.js","assets/bouquet-L6kfNDGz.js","assets/braceletReveal-DZ1IH3oM.js","assets/career-CO2CqbjS.js","assets/career-D4Kjo_a9.css","assets/careerGame-zg-Ihf-q.js","assets/casino-Dpy-O21c.js","assets/castle-BMvovhX-.css","assets/castle-epefOOBE.js","assets/cat-DaPNr-Ui.css","assets/cat-MS-NnATz.js","assets/cat-_NBc5bGv.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-uOupGNnt.js","assets/chocolateBox-B4lMPO94.js","assets/chocolaterie-CFl9bRbx.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-LQJuqFIL.js","assets/common-CVGJZVdA.js","assets/creativeUi-Db1L-pLS.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-8MMB_tZL.js","assets/decorTable-Dl13c8gD.js","assets/demo-DFhvYdh9.js","assets/drawing-4wJyw9tO.js","assets/dressVerdict-bEn_uBVA.js","assets/dressing-CwIRUvA5.js","assets/dressing-DRvvLtmc.css","assets/family-CsG1jy0z.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DdyvbJGL.js","assets/fashionThemes-DIHLRMpY.js","assets/finale-Bjr4ZQkc.js","assets/fireworksPhoto-DhadYB6t.js","assets/frame-DalgPW1T.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-fcVxOvT5.js","assets/gallery-Bm9koVm_.js","assets/garden-BOxBd5Kj.js","assets/garden-CE4lGUp2.js","assets/garden-D2rx7UlP.js","assets/garden-DWDVDBcx.js","assets/garden-DazHrlMv.css","assets/giftArt-GUMvd99v.js","assets/guessMenu-jSFvBQJ6.js","assets/harness-6xJvX19w.js","assets/host-xDn8GGow.js","assets/hub-BenZCpx_.js","assets/hub-C4LbLexs.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bx9vSagA.js","assets/index-CLGad4UF.css","assets/index-CkaoDskU.js","assets/index-Cv3fKkm6.js","assets/index-Cy3wlX2t.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-Dci6DD0C.js","assets/index-avjF4NC5.js","assets/index-ig1dOV33.css","assets/index-wbp8I2Od.js","assets/kit-DOzxEsJ8.css","assets/kit-I-Ef1shV.js","assets/memoryChallenge-BFdjWMX8.js","assets/memoryView-BGmeE6Ac.js","assets/menuPick-f8yZEUVq.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Ue7BY5JJ.js","assets/order-CsSD_vLd.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BQIkJddq.js","assets/photoBooth-CnKMudsb.js","assets/photoShoot-CkSH8YTH.js","assets/plumbing-CJF5Dkpa.js","assets/promiseCard-DGgt2tpb.js","assets/render-CtKcwixy.js","assets/render-Cw01vZ0B.js","assets/reveal-C3KEytiQ.js","assets/rhythmDance-BPGoeUQ3.js","assets/rng-LLIeWRGS.js","assets/runtime-DkItBgFJ.js","assets/scene-BaBjQeOW.js","assets/scene-C7nCHeHi.css","assets/scene-CdaVf6iV.js","assets/scenes-FpGHaU-r.js","assets/session-C3VwiXBU.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-C90oi0h1.js","assets/spaRelax-i9sQQCjW.js","assets/store-BGG-h7B2.js","assets/styles-DDT62FZD.js","assets/tidy-CpLIsaEC.js","assets/touchDiag-Y895IQt5.js","assets/ui-3ykwpVRx.js","assets/ui-9-8eNSRZ.js","assets/ui-B-8X5rjm.css","assets/ui-BIn1H9F1.js","assets/ui-BVJ3prhW.js","assets/ui-BurU-WAR.css","assets/ui-CIq47mES.js","assets/ui-CMTcHEWh.js","assets/ui-CPXo0zLi.js","assets/ui-DFuyEFHN.js","assets/view-C5c_xCp7.css","assets/view-CTZ-wnUn.js","assets/wardrobe-BoMGmNqe.js","assets/wires-BI1mkKoG.js","index.html","manifest.webmanifest"];

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
