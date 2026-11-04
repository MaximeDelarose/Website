/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw24vhrl';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/ambient-C1TEQOgi.js","assets/app-CMNAj2d9.js","assets/art-CeuzexJp.js","assets/bouquet-CbeRbRMi.js","assets/braceletReveal-C8E4WWuG.js","assets/career-B1ZyU-qh.js","assets/career-vO6MXP3m.css","assets/careerGame-BgUrNYLg.js","assets/casino-CXSGvufm.js","assets/castle-4yepxF62.css","assets/castle-fWgndkTA.js","assets/cat-CTiWtxW0.js","assets/cat-DaPNr-Ui.css","assets/cat-DbWP82eD.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-pYD0KzNF.js","assets/chocolateBox-B1fOIybp.js","assets/chocolaterie-CKLl3tVp.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CeQtVrxW.js","assets/common-Mm89eVox.js","assets/creativeUi-BI93s-1D.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-CBwkJlAl.js","assets/decorTable-DtNs6Q6O.js","assets/drawing-C362e9wj.js","assets/dressVerdict-CjX5p_ei.js","assets/dressing-CQN8EHa7.js","assets/dressing-DGWRhRO0.css","assets/family-BxoqJWAT.css","assets/family-CABngEEv.js","assets/fans-9sGMZuHv.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-LuXZqE7p.js","assets/finale-lNE_NH9C.js","assets/fireworksPhoto-BSrcc1b_.js","assets/frame-yxy6NLeU.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-i5HhtjWH.js","assets/garden-CL0nURmq.js","assets/garden-CVRXr4Pb.js","assets/garden-CeU7QPMw.js","assets/garden-CtZBUs0M.js","assets/garden-DazHrlMv.css","assets/guessMenu-wL7WQQgO.js","assets/harness-r6cJ6UYt.js","assets/hub-Cgau96xP.css","assets/hub-DHH6y-7L.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-2TE5EB6O.css","assets/index-2xkTccXf.css","assets/index-CCIIofI-.js","assets/index-Ch-Kp8I_.js","assets/index-Cio_Ajf_.js","assets/index-DAXg5XTy.js","assets/index-DIjLmt2F.css","assets/index-D_Bfde9M.css","assets/index-DbJk-iXj.css","assets/index-Dl2oxPU9.js","assets/index-SuDUygyi.js","assets/memoryChallenge-Csh4psTI.js","assets/memoryView-DgBau1Gd.js","assets/menuPick-DA883oxM.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-BFNfzzCH.js","assets/order-CN5Ty0du.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-I_Q-jyFj.js","assets/photoBooth-Bellh47d.js","assets/photoShoot-BkSjQ0vq.js","assets/plumbing-DbFnpcy8.js","assets/promiseCard-DqdOsvcA.js","assets/render-MC29zAad.js","assets/reveal-MukWMH-P.js","assets/rhythmDance-DTq3XU10.js","assets/rng-Dfmu4qr5.js","assets/scene-dQ1Co3lz.js","assets/shopTry-ROpxTosO.js","assets/singer-SidvG0bF.js","assets/spaRelax-oeL51lFr.js","assets/styles-DDT62FZD.js","assets/tidy-DarSE3aP.js","assets/ui-C0IhGunD.js","assets/ui-Dy3UZ69r.js","assets/ui-PtruMV2q.js","assets/ui-a_xSbRkX.js","assets/ui-kVlLBZIG.js","assets/wardrobe-CLVc8mug.js","assets/wires-f6ZTk0D2.js","index.html","manifest.webmanifest"];

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
