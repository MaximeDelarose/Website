/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw1ehqn7';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-6dfU2BMP.js","assets/bouquet-CXmrHayW.js","assets/braceletReveal-DeFMrbq3.js","assets/career-DlkxnRop.js","assets/career-vO6MXP3m.css","assets/careerGame-DVGGV7RJ.js","assets/careers-CASZHVHu.js","assets/castle-4yepxF62.css","assets/castle-B4d26pmk.js","assets/cat-D_7wrsb3.js","assets/cat-DaPNr-Ui.css","assets/cat-aiZSj5jM.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BInIQe7A.js","assets/chocolateBox-DqV8d8Sh.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DndqXCJK.js","assets/cinemaQuiz-CEM52JQo.js","assets/common-DnEME-2V.js","assets/creativeUi-Byxq14mU.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-CxtOCHOp.js","assets/decorTable-BiPIPzbZ.js","assets/drawing-dOD8uZZB.js","assets/dressVerdict-TGj_NeyC.js","assets/dressing-BgCmx2kB.js","assets/dressing-DGWRhRO0.css","assets/family-3fIiwHQi.js","assets/family-BxoqJWAT.css","assets/fans-4vf1HQ2c.js","assets/fans-BXo_QXE3.css","assets/fashionThemes-DfBSFg-B.js","assets/finale-zFWGCOXU.js","assets/fireworksPhoto-CeVAkPyT.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-BBi8E7w2.js","assets/garden-C5e6ks7I.js","assets/garden-DazHrlMv.css","assets/garden-JO4gY7Bb.js","assets/guessMenu-Ozj0r3iq.js","assets/harness-DBMKnd72.js","assets/hub-Bo2beOBR.css","assets/hub-DjejFJWX.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-2TE5EB6O.css","assets/index-B--Zjxgf.js","assets/index-DPn97apC.js","assets/index-DYV5T_5q.css","assets/index-D_Bfde9M.css","assets/index-mZ6rmqVS.js","assets/index-yoPfvBee.js","assets/memoryChallenge-Ug2C_pNQ.js","assets/menuPick-C7wbmFdy.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DMtQ7qL8.js","assets/photoBooth-DKGJiaaf.js","assets/photoShoot-BS03PcAD.js","assets/promiseCard-DafFdl6d.js","assets/render-Bibkoe3l.js","assets/rhythmDance-DorH9dIy.js","assets/shopTry-D5WfGLfv.js","assets/singer-9Ps56VZW.js","assets/spaRelax-CHAPx4Ac.js","assets/styles-DDT62FZD.js","assets/ui-fZLa2MTY.js","assets/wardrobe-DqUffFDO.js","index.html","manifest.webmanifest"];

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
