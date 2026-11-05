/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw33t730-0feed1c';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-BHu489Cp.js","assets/app-CgJOKG5m.js","assets/art-BtZgKhGf.js","assets/art-C5NxW2OI.js","assets/badge-BmiqDx25.js","assets/bouquet-Dt7s9hOg.js","assets/braceletReveal-CiB1xL30.js","assets/career-12oKKNmR.js","assets/career-CPhsEd9K.css","assets/careerGame-C-mVTcPM.js","assets/casino-BNT2AsHV.js","assets/castle-BMvovhX-.css","assets/castle-CarqUE8c.js","assets/cat-8X2sthzr.js","assets/cat-DKglbrxz.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Dm7hR2Nl.js","assets/chocolateBox-Czcr1R5a.js","assets/chocolaterie-CdrtGUQk.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-pEmPS74r.js","assets/common-vnm68HDu.js","assets/creativeUi-BIqjdhyA.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-BRjpEmYp.js","assets/decorTable-OQxZANLh.js","assets/demo-DFhvYdh9.js","assets/drawing-CMLCYnxJ.js","assets/dressVerdict-DbxWJBXJ.js","assets/dressing-CEqbQ6Ab.js","assets/dressing-DRvvLtmc.css","assets/family-CDQvv38_.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DnPltGvF.js","assets/fashionThemes-CooJoWPg.js","assets/finale-BSVzV4lW.js","assets/fireworksPhoto-BnRMPesW.js","assets/frame-DuPojFio.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-BvIDi6Yd.js","assets/gallery-DOuga6bQ.js","assets/garden-BJzLFACC.js","assets/garden-Cc_7usqi.js","assets/garden-D3jNXQ9N.js","assets/garden-DazHrlMv.css","assets/garden-Dx8RocVZ.js","assets/giftArt-flfxD3DK.js","assets/guessMenu-CHFfrpx3.js","assets/harness-ig5vV2eQ.js","assets/host-uF3EErqR.js","assets/hub-Cgau96xP.css","assets/hub-DMMv7A6q.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index---i5BZnS.js","assets/index-BRWvVPWG.css","assets/index-Bf8DGTl7.js","assets/index-Bqjh-8X1.js","assets/index-C6g0Rrj2.css","assets/index-CLGad4UF.css","assets/index-C_Hk9ugy.js","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-IewoS_XP.js","assets/index-JMjOSkEW.js","assets/index-UqQqM8sa.js","assets/kit--rPNje1c.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DlGpSpih.js","assets/memoryView-msnEHS5y.js","assets/menuPick-DHedCRxG.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CUrg6lEf.js","assets/order-q1oJSKt1.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-Cgu-GoBH.js","assets/photoBooth-Cw1ehg6n.js","assets/photoShoot-C4-MrfUf.js","assets/plumbing-DnXgR2tc.js","assets/promiseCard-tkMHpPFC.js","assets/render-BdQUzEVm.js","assets/render-DcVyOPeZ.js","assets/reveal-ig3nEdQe.js","assets/rhythmDance-DRXZEkiS.js","assets/rng-LLIeWRGS.js","assets/runtime-BFeXdFxx.js","assets/scene-C7nCHeHi.css","assets/scene-CowTyuGp.js","assets/scene-MlLRSDGa.js","assets/scenes-C3GrK0M6.js","assets/session-CPeBGdok.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BuBe3v8V.js","assets/spaRelax-UTKnWbeQ.js","assets/store-Bz2VehJi.js","assets/styles-DDT62FZD.js","assets/tidy-CUpQHV8D.js","assets/touchDiag-S7mCS9lO.js","assets/ui-5y_62cJK.js","assets/ui-B-8X5rjm.css","assets/ui-BT4nSohs.js","assets/ui-BuDmn5Rj.js","assets/ui-BurU-WAR.css","assets/ui-C8OAy9K8.js","assets/ui-CAQP4eLt.js","assets/ui-CBoMGySG.js","assets/ui-DFEHrEz9.js","assets/ui-rUIRCspn.js","assets/wardrobe-CQe0AIIE.js","assets/wires-B6HWczmN.js","index.html","manifest.webmanifest"];

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
