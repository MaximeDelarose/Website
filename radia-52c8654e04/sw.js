/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw2fu4qg';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-B5Ejefgh.js","assets/app-B4dgYrNK.js","assets/art-B-XjVcXv.js","assets/badge-57_YIce1.js","assets/bouquet-Uf8hmSD3.js","assets/braceletReveal-DV3i0Wj3.js","assets/career-CPhsEd9K.css","assets/career-DyjEv_jE.js","assets/careerGame-B5Dhvgyj.js","assets/casino-Bg-4a-D6.js","assets/castle-BMvovhX-.css","assets/castle-Dem547D8.js","assets/cat-4uySBnqK.js","assets/cat-BHKh6HQ4.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-qnZre_N_.js","assets/chocolateBox-COf_kqog.js","assets/chocolaterie-C84NDkai.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-C0q5ocE6.js","assets/common-DFEfsCZE.js","assets/creativeUi-mBFUqwKz.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-B4fK0Htp.js","assets/decorTable-BE0iA4aX.js","assets/demo-DFhvYdh9.js","assets/drawing-2Zm4Jo3n.js","assets/dressVerdict-dGQVFrju.js","assets/dressing-CxUrWM1B.js","assets/dressing-DRvvLtmc.css","assets/family-DOfjXK8B.js","assets/family-gy-OT53v.css","assets/fans-BWTLhrRI.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-BpczdyfF.js","assets/finale-DAm2vDEv.js","assets/fireworksPhoto-MJTg0SGb.js","assets/frame-BsixscRh.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-Civcuf5q.js","assets/gallery-DDC6BFnj.js","assets/garden-C_eSVcGg.js","assets/garden-CbnxEelm.js","assets/garden-Cc8-y5gI.js","assets/garden-DazHrlMv.css","assets/garden-kKwpT-LQ.js","assets/giftArt-CblIvLk3.js","assets/guessMenu-BONBppZV.js","assets/harness-B7iuPICM.js","assets/host-3gEy8PT3.js","assets/hub-Cgau96xP.css","assets/hub-CvVd2RsI.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-BRWvVPWG.css","assets/index-BRdy1oe3.css","assets/index-BpqnaUYL.js","assets/index-C6P7Hfth.js","assets/index-CLGad4UF.css","assets/index-CT4_AO72.css","assets/index-D-G_lR_2.js","assets/index-DFYJx36f.js","assets/index-DUIByO-r.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DiRTGTKo.js","assets/index-DzZBV8qn.js","assets/kit-CkPqEIqZ.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CVGp3vfi.js","assets/memoryView-XQV-hIDp.js","assets/menuPick-CwJIVgqH.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-aF7jGqP0.js","assets/order-CaTVK2dp.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CkHZZMJZ.js","assets/photoBooth-CCqaEp9M.js","assets/photoShoot-hoqEabHQ.js","assets/plumbing-DrOPZMg8.js","assets/promiseCard-vUblF1Is.js","assets/render-DQD8EvWF.js","assets/render-gaQ087nf.js","assets/reveal-DR1sWmNl.js","assets/rhythmDance-DRiEE1Gq.js","assets/rng-LLIeWRGS.js","assets/runtime-BwSxJX8j.js","assets/scene-C7nCHeHi.css","assets/scene-CsoT9fAa.js","assets/scene-qPLOkG5o.js","assets/scenes-BW5Qnz7F.js","assets/session-DQwq0LOk.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-waKdpUow.js","assets/spaRelax-cI1xNTTV.js","assets/store-RSt6FeVr.js","assets/styles-DDT62FZD.js","assets/tidy-BMpaPEiC.js","assets/ui-B-8X5rjm.css","assets/ui-BAvcGe79.js","assets/ui-BPsXr0hA.js","assets/ui-BTmM7MhA.css","assets/ui-BnpbXJpF.js","assets/ui-C30I71yL.js","assets/ui-CFk6fNhD.js","assets/ui-CayKiQRV.js","assets/ui-DMMXm2m3.js","assets/ui-ZvZqpY2v.js","assets/wardrobe-yVvpwGoG.js","assets/wires-Cc6YQo0c.js","index.html","manifest.webmanifest"];

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
