/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw28xsto';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-DXwUSQO5.js","assets/app-tQJ6PA-W.js","assets/art-Bqcm2lUt.js","assets/badge-40sKek9A.js","assets/bouquet-5sU6I9UH.js","assets/braceletReveal-Dx6AuaGv.js","assets/career-CPhsEd9K.css","assets/career-CkRj3_Iv.js","assets/careerGame-XTWa5LJ1.js","assets/casino-Ba9HF-yg.js","assets/castle-BriEQzm4.css","assets/castle-CqlIckT-.js","assets/cat-B1vWOXtd.js","assets/cat-DaPNr-Ui.css","assets/cat-e9nYjbyO.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-B31eoNqW.js","assets/chocolateBox-B0q_wFO3.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-D29yBjvz.js","assets/cinemaQuiz-302Vy4vo.js","assets/common-6veL-XHW.js","assets/creativeUi-KLjaPtTs.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/decor-zPNiBdNj.js","assets/decorTable-COcapjST.js","assets/demo-DFhvYdh9.js","assets/drawing-BEJf4Do8.js","assets/dressVerdict-BmsOc62N.js","assets/dressing-CwqXlb-r.js","assets/dressing-DRvvLtmc.css","assets/family-C3-e6WIb.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-YuQ26Uha.js","assets/fashionThemes-DmciIEU4.js","assets/finale-D-y7ZEXI.js","assets/fireworksPhoto-DblefR33.js","assets/frame-CCqANqXu.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-WaHDIwwl.js","assets/gallery-DW9H6wYn.js","assets/garden-B__oynWF.js","assets/garden-C5XLp6ok.js","assets/garden-CW4dzVK-.js","assets/garden-DazHrlMv.css","assets/garden-yiR6LVbS.js","assets/giftArt-CkB_bWGQ.js","assets/guessMenu-B5pK9Z3H.js","assets/harness-BSrZybOO.js","assets/host-DnllxYof.js","assets/hub-Cgau96xP.css","assets/hub-D9E3xQcL.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-1RE9lFJ6.js","assets/index-BRWvVPWG.css","assets/index-BRdy1oe3.css","assets/index-BzYPGFbm.js","assets/index-C8E28xrZ.js","assets/index-CLGad4UF.css","assets/index-CRslPnPb.js","assets/index-CT4_AO72.css","assets/index-Cj3Qc7dZ.js","assets/index-DCKuiMYp.js","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-JRmaBBkB.js","assets/kit-CzCoIgtb.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-DrLohMXS.js","assets/memoryView-CbxzCD2S.js","assets/menuPick-BoLT4HlT.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BJfjbPx1.js","assets/order-BFDvYI0r.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-B-oxp32x.js","assets/photoBooth-D2z584-T.js","assets/photoShoot-DYASy67i.js","assets/plumbing-BJPNQSsm.js","assets/promiseCard-WAeTheoT.js","assets/render-C0MyrObr.js","assets/render-Sct4UqlA.js","assets/reveal-CFfxfhX0.js","assets/rhythmDance-CnNRFPND.js","assets/rng-LLIeWRGS.js","assets/runtime-CIs1b9HB.js","assets/scene-BVl5HgcX.js","assets/scene-C7nCHeHi.css","assets/scene-DE-rXRJZ.js","assets/scenes-DgTW9rZC.js","assets/session-D_jxeSMy.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-C_N8HyPD.js","assets/spaRelax-BhbRIJ3K.js","assets/store-CBuUZsqK.js","assets/styles-DDT62FZD.js","assets/tidy-CAmx15nw.js","assets/ui-B-8X5rjm.css","assets/ui-BTmM7MhA.css","assets/ui-BWIWX6vM.js","assets/ui-C9E_nPds.js","assets/ui-Ck01rWMX.js","assets/ui-Co3i3pZJ.js","assets/ui-DjjOuXRP.js","assets/ui-DkP4L1JJ.js","assets/ui-UbjRQ-U0.js","assets/ui-X7ExuL3e.js","assets/wardrobe-Cj7_IXR2.js","assets/wires-CezOuIOd.js","index.html","manifest.webmanifest"];

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
