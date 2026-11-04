/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2n7zzn-5c52dfc';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-C6dJGNZe.js","assets/app-BeU83TEJ.js","assets/art-BapYiYVp.js","assets/badge-DEpRw8hz.js","assets/bouquet-CC3SrvLm.js","assets/braceletReveal-BKmbmKan.js","assets/career-CPhsEd9K.css","assets/career-hS9w0kKm.js","assets/careerGame-BqWQA6qQ.js","assets/casino-BJQr_kn4.js","assets/castle-BMvovhX-.css","assets/castle-DH1ov8_n.js","assets/cat-B-JKNUbz.js","assets/cat-CaTQ0haw.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-cBSS0P7f.js","assets/chocolateBox-CAkeTYQC.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-j5ZDzZb-.js","assets/cinemaQuiz-DzK_3xjW.js","assets/common-CVHd0nD4.js","assets/creativeUi-Dl7biIkp.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-CgwdhhAi.js","assets/decorTable-BmwWRcGl.js","assets/demo-DFhvYdh9.js","assets/drawing-DAnJyY4O.js","assets/dressVerdict-C1jLPQTZ.js","assets/dressing-DBiOJZQ9.js","assets/dressing-DRvvLtmc.css","assets/family-gy-OT53v.css","assets/family-hVDopDBN.js","assets/fans-BXo_QXE3.css","assets/fans-Cld3BUtC.js","assets/fashionThemes-DTtf4z1U.js","assets/finale-PZKoImJq.js","assets/fireworksPhoto-DlxTKs0w.js","assets/frame-B0kMrqhY.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-DUeV3L4I.js","assets/gallery-GrefZv_U.js","assets/garden-BrMZa8Op.js","assets/garden-DYvCjbBC.js","assets/garden-DazHrlMv.css","assets/garden-DstxxKW7.js","assets/garden-VB8EQFtS.js","assets/giftArt-7BPfB2PV.js","assets/guessMenu-ChEBj88n.js","assets/harness-x9s87i5y.js","assets/host-Q_uXtneM.js","assets/hub-Cgau96xP.css","assets/hub-eoA35otG.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BFonMx8f.js","assets/index-BRWvVPWG.css","assets/index-CLGad4UF.css","assets/index-CiOURXaE.js","assets/index-D0quUyF5.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DersYZSU.js","assets/index-DgzbXzM2.css","assets/index-G9vxTpGK.js","assets/index-ctZEwTvT.js","assets/index-j9qSlLkA.js","assets/index-uS5xyx-V.css","assets/kit-DJDen2An.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-UyPssdI9.js","assets/memoryView-Djo2JnCS.js","assets/menuPick-Dmz_RCJN.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-DlL-f9A5.js","assets/order-Bzzp6bjN.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B6BO3nYL.js","assets/photoBooth-XI3vCdYA.js","assets/photoShoot-DSX1DXd9.js","assets/plumbing-D_-LdXc-.js","assets/promiseCard-CZwg0WC9.js","assets/render-CmRUFkVg.js","assets/render-VbIxM_6G.js","assets/reveal-BcAw-WPf.js","assets/rhythmDance-AS__VXXY.js","assets/rng-LLIeWRGS.js","assets/runtime-kmVEurTF.js","assets/scene-BbeJ97Y5.js","assets/scene-C7nCHeHi.css","assets/scene-DaW_POv0.js","assets/scenes-Dd0IhuPo.js","assets/session-Bu7bGBGE.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BrXpj1Ds.js","assets/spaRelax-BzMiRpwZ.js","assets/store-TiSEyxCd.js","assets/styles-DDT62FZD.js","assets/tidy-ByIop23T.js","assets/ui-B-8X5rjm.css","assets/ui-BTmM7MhA.css","assets/ui-BUnbICzg.js","assets/ui-BtyT2mXq.js","assets/ui-C0llKa4T.js","assets/ui-CEgYoP27.js","assets/ui-D5ITQe9G.js","assets/ui-DFP_OZ1O.js","assets/ui-fJIBfiX1.js","assets/ui-uxHdsvAB.js","assets/wardrobe-yxfiYaT7.js","assets/wires-Cp9CD-_l.js","index.html","manifest.webmanifest"];

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
