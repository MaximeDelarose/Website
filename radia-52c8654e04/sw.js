/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw21n3jk';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/ambient-B2Q21zi3.js","assets/app-DkHKa_ud.js","assets/art-DVy3BCKl.js","assets/bouquet-Dc0akpe6.js","assets/braceletReveal-CM5Ygapt.js","assets/career-ChemJsv_.js","assets/career-vO6MXP3m.css","assets/careerGame-B09i8JuZ.js","assets/casino-MzI--LiE.js","assets/castle-4yepxF62.css","assets/castle-GKr2NPJy.js","assets/cat-BsMMY5PI.js","assets/cat-CM4QpuJC.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CDzMEwSD.js","assets/chocolateBox-B1hFqDJl.js","assets/chocolaterie-B4bEQGqw.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CPVL6ThC.js","assets/common-kYXu7BHc.js","assets/creativeUi-zWfPhl8_.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-BHEk_TRG.js","assets/decorTable-BlzOk6Aa.js","assets/drawing-DN4-TDVG.js","assets/dressVerdict-BLrqtXyV.js","assets/dressing-DGWRhRO0.css","assets/dressing-DjEanmQT.js","assets/family-BxoqJWAT.css","assets/family-CNVuBGi4.js","assets/fans-5rtLOsaR.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-QiC_XlHa.js","assets/finale-B-ngkPzD.js","assets/fireworksPhoto-C_hOfes8.js","assets/frame-DuiieU5h.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-B5PXTDu-.js","assets/garden-BSHox0y7.js","assets/garden-CGkRU4ib.js","assets/garden-CPM15nEQ.js","assets/garden-DI4ZjBue.js","assets/garden-DazHrlMv.css","assets/guessMenu-7sOoUlW4.js","assets/harness-jmLT-Pao.js","assets/hub-Cgau96xP.css","assets/hub-WCSFlxYY.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-2TE5EB6O.css","assets/index-2xkTccXf.css","assets/index-B-zpEOtT.js","assets/index-BMFCInSk.js","assets/index-BWChCby9.js","assets/index-Cc3uuTkl.js","assets/index-D17eFNe8.js","assets/index-DIjLmt2F.css","assets/index-D_Bfde9M.css","assets/index-DaiyoGRi.js","assets/index-DbJk-iXj.css","assets/memoryChallenge-BRM7qm3V.js","assets/memoryView-CeZxp5IP.js","assets/menuPick-BW7HI6D5.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-i1WkZei6.js","assets/order-g4l-DgMV.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-BA-GIxaY.js","assets/photoBooth-B4pMAvwJ.js","assets/photoShoot-3K4Gp37V.js","assets/plumbing-wkpXnd8k.js","assets/promiseCard-Dl8Qr3iN.js","assets/render-uq79swqe.js","assets/reveal-BA26n_8c.js","assets/rhythmDance-8gIlAyJE.js","assets/rng-vvLkKqUO.js","assets/scene-vCrVxXPf.js","assets/shopTry-CYyq6Wdi.js","assets/singer-CkGN0Wa0.js","assets/spaRelax-Dr7VgHZm.js","assets/styles-DDT62FZD.js","assets/tidy-C64osnjL.js","assets/ui-B341nEpz.js","assets/ui-C0u95MSn.js","assets/ui-Cx_zMgBU.js","assets/ui-DWyGzeXd.js","assets/ui-Di832HkT.js","assets/wardrobe-Tzb80etz.js","assets/wires-DwIdTmsx.js","index.html","manifest.webmanifest"];

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
