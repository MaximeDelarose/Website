/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw14mt8u';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-NXbw1DFJ.js","assets/bouquet-DNbhopDV.js","assets/career-CrfVGfJk.js","assets/career-vO6MXP3m.css","assets/careerGame-DgSfiG8i.js","assets/careers-BLETBAfF.js","assets/castle-4yepxF62.css","assets/castle-BpdNWCzT.js","assets/cat-2hVUSdIJ.js","assets/cat-D9P-mnbX.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-CNUd6-px.js","assets/chocolateBox-Beich-Bb.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-DFO7Jx1r.js","assets/cinemaQuiz-DNxu6wo6.js","assets/common-B3NmdtNy.js","assets/creativeUi-Dp9q1-GO.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-DB9iezQo.js","assets/decorTable-alk9bBLo.js","assets/dressing-D28yNteH.css","assets/dressing-tl-NxF1R.js","assets/family-BxoqJWAT.css","assets/family-CEHMy7cB.js","assets/fans-BXo_QXE3.css","assets/fans-nDUUgpH1.js","assets/fashionThemes-DPqNtr31.js","assets/finale-Bj2AE1bp.js","assets/fireworksPhoto-QsyR9tVK.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-IEYduj37.js","assets/garden-0lE7lBeK.js","assets/garden-Cqib6Fhd.js","assets/garden-DazHrlMv.css","assets/guessMenu-DxW1hSje.js","assets/harness-Dqzz_LxC.js","assets/hub-Bo2beOBR.css","assets/hub-DFR9RXLq.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-CNSI0mcU.css","assets/index-D8_I-bXx.js","assets/index-DHNXbkjM.js","assets/index-DMBPFCe3.js","assets/index-D_Bfde9M.css","assets/index-L6dIgH7w.js","assets/index-yQhkBcPI.css","assets/memoryChallenge-QPGGZ_Yt.js","assets/menuPick-B-0hDF1q.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/phaser-0YPJO2g1.js","assets/phone-DrwATRbF.js","assets/photoBooth-BdPyuGzP.js","assets/render-Cud9Ujxz.js","assets/rhythmDance-CQa1vwbc.js","assets/shopTry-Dm8-N_W1.js","assets/singer-E59bwomu.js","assets/spaRelax-ClFxinc4.js","assets/styles-DDT62FZD.js","assets/ui-zBVAsqXT.js","assets/wardrobe-D3BjWLdK.js","index.html","manifest.webmanifest"];

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
