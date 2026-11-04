/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2jpz8c';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DgqIu9RU.js","assets/app-DS18C1v9.js","assets/art-CslO5Y99.js","assets/badge-C6XfrzfH.js","assets/bouquet-B_RKcjPD.js","assets/braceletReveal-blHftc4j.js","assets/career-BkqMMCON.js","assets/career-CPhsEd9K.css","assets/careerGame-DV8YDVxf.js","assets/casino-1uuqXhm_.js","assets/castle-BMvovhX-.css","assets/castle-DCAn2hug.js","assets/cat-8zpLTJNy.js","assets/cat-DBiaxWmO.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-D5e8WauC.js","assets/chocolateBox-Dd_juD-w.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-ieYde23P.js","assets/cinemaQuiz-CJJB1AjO.js","assets/common-BPunzueR.js","assets/creativeUi-DU3oUhYK.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-DrSpCt_M.js","assets/decorTable-QXgwQ02L.js","assets/demo-DFhvYdh9.js","assets/drawing-AQOSdF8H.js","assets/dressVerdict-C9m86RG4.js","assets/dressing-CQCVwWy-.js","assets/dressing-DRvvLtmc.css","assets/family-1t5oZOel.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-d0_lIkNG.js","assets/fashionThemes-D38E2qI-.js","assets/finale-DDAai5kd.js","assets/fireworksPhoto-BEyMny-P.js","assets/frame-BDczOE8P.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CJumyAth.js","assets/gallery-DwWRs2KY.js","assets/garden-BZUKDPr-.js","assets/garden-CiUBTx_m.js","assets/garden-D0Eap8Cx.js","assets/garden-DazHrlMv.css","assets/garden-DgKLeLAg.js","assets/giftArt-DTOCKDp7.js","assets/guessMenu-C71kKGe-.js","assets/harness-DMzxBndW.js","assets/host-Dx1VuK7i.js","assets/hub-Cgau96xP.css","assets/hub-eUSjxfFD.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-Bik6s43N.css","assets/index-Bp7WcHGl.js","assets/index-CLGad4UF.css","assets/index-CT4_AO72.css","assets/index-CpJ8cl6t.js","assets/index-CxDyBYhW.js","assets/index-Cy22yw1H.js","assets/index-D3PKcA_J.js","assets/index-DZV28E8t.css","assets/index-DZw4VsxI.js","assets/index-D_Bfde9M.css","assets/index-lOSM_BpB.js","assets/kit-DOzxEsJ8.css","assets/kit-DqK99_u5.js","assets/memoryChallenge-EOK_1fb8.js","assets/memoryView-BHcU6sh3.js","assets/menuPick-CRjQYolY.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-Cp8Yjhc-.js","assets/order-ClRC5WAu.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BwImAWv2.js","assets/photoBooth-CWu_Cgg9.js","assets/photoShoot-DEBpyPtI.js","assets/plumbing-ENWogu_i.js","assets/promiseCard-CvLnOq_w.js","assets/render-BDJm6mu5.js","assets/render-BXFXnVyn.js","assets/reveal-GfT6A4k6.js","assets/rhythmDance-DI3OW6zl.js","assets/rng-LLIeWRGS.js","assets/runtime-BQCXP0QK.js","assets/scene-By61MC0H.js","assets/scene-C7nCHeHi.css","assets/scene-ChdZMKeQ.js","assets/scenes-CpobSorG.js","assets/session-lB0MNMpw.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-uVfwOfgz.js","assets/spaRelax-CbaODjOB.js","assets/store-xwlG4Em9.js","assets/styles-DDT62FZD.js","assets/tidy-D-7f80k6.js","assets/ui-B-8X5rjm.css","assets/ui-BTmM7MhA.css","assets/ui-DACTZ9mr.js","assets/ui-DIzFKWXp.js","assets/ui-Dsbfz8XB.js","assets/ui-DstobUiF.js","assets/ui-WW2yXZcw.js","assets/ui-_gr2wkZo.js","assets/ui-mscdY2qu.js","assets/ui-rebKFq_2.js","assets/wardrobe-DHFkREUn.js","assets/wires-BE5aEtr4.js","index.html","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', ...PRECACHE])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // La page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
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
