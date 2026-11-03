/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw18p00j';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-B7lbPDim.js","assets/bouquet-DxPEhwy1.js","assets/braceletReveal-Bf4ZWYvk.js","assets/career-BQUQ3-XJ.js","assets/career-vO6MXP3m.css","assets/careerGame-wERBgymZ.js","assets/careers-BFTL-WMg.js","assets/castle-4yepxF62.css","assets/castle-DpO5L8hK.js","assets/cat-Bc4XI2lB.js","assets/cat-DaPNr-Ui.css","assets/cat-DhjV0Yq7.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-CjlHSYFu.js","assets/chocolateBox-DDEO-TtE.js","assets/chocolaterie-BcPEuZfV.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-yfiTSVys.js","assets/common-Bk_APtbs.js","assets/creativeUi-DkBnGgYR.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-BetfsOer.js","assets/decorTable-BO0upSBi.js","assets/drawing-DFXfxliy.js","assets/dressVerdict-Dxi-VqIa.js","assets/dressing-DGWRhRO0.css","assets/dressing-MsyNY_Gy.js","assets/family-BxoqJWAT.css","assets/family-D9SNOJYW.js","assets/fans--NGWKUDQ.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-CioLVJ2B.js","assets/finale-CB7T23zK.js","assets/fireworksPhoto-BvJ-d1IO.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-DKVyAlOV.js","assets/garden-ChsxUpkU.js","assets/garden-DazHrlMv.css","assets/garden-VFTH7VH9.js","assets/guessMenu-DqV4iPf0.js","assets/harness-CqcQuQMN.js","assets/hub-B05w1sT4.js","assets/hub-Bo2beOBR.css","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-2RMch0HE.js","assets/index-2TE5EB6O.css","assets/index-Bd3Uhzyp.js","assets/index-CHktoc4e.js","assets/index-CZwi_lxM.js","assets/index-DYV5T_5q.css","assets/index-D_Bfde9M.css","assets/memoryChallenge-DpLPLnUF.js","assets/menuPick-2jVkRRNp.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DD7O6edo.js","assets/photoBooth-DONpH4o8.js","assets/photoShoot-qkvPWs2T.js","assets/promiseCard-CpuQxJHm.js","assets/render-CopICy75.js","assets/rhythmDance-20JKMhq1.js","assets/shopTry-CGJGPPA2.js","assets/singer-DWLY5CrY.js","assets/spaRelax-B5Zz9KVp.js","assets/styles-DDT62FZD.js","assets/ui-CH7rWVxa.js","assets/wardrobe-h1knXd2g.js","index.html","manifest.webmanifest"];

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
