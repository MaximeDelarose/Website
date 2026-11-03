/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw184ss4';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-wgUncjOl.js","assets/bouquet-C9JY7NJp.js","assets/braceletReveal-a7b_6ZbI.js","assets/career-DJz2SY_X.js","assets/career-vO6MXP3m.css","assets/careerGame-QxPNPHjq.js","assets/careers-CGqiZxLs.js","assets/castle-4yepxF62.css","assets/castle-DLh7KakZ.js","assets/cat-C6l1F-zd.js","assets/cat-DaPNr-Ui.css","assets/cat-DupDjbmq.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-O5SnUhH7.js","assets/chocolateBox-C8R0QfQx.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-_YGWdS2H.js","assets/cinemaQuiz-CLVb4QKh.js","assets/common-CDAbuBNY.js","assets/creativeUi-JNTCSTx7.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-gVxscN3q.js","assets/decorTable-BUmmzQfk.js","assets/drawing-NmU4sB3g.js","assets/dressVerdict-CQPzTJFu.js","assets/dressing-CBWFDfHN.js","assets/dressing-DGWRhRO0.css","assets/family-BxoqJWAT.css","assets/family-cNOct1I0.js","assets/fans-BXo_QXE3.css","assets/fans-eFXHN8Wf.js","assets/fashionThemes-uETt0My2.js","assets/finale-BINv21AJ.js","assets/fireworksPhoto-dyGpCPYB.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-DZJszdRy.js","assets/garden-BhxquKQ8.js","assets/garden-DazHrlMv.css","assets/garden-DymDDhVm.js","assets/guessMenu-tLE82xrc.js","assets/harness-CZu2x36w.js","assets/hub-Bo2beOBR.css","assets/hub-BoQloNT5.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-3izM1WQS.js","assets/index-DYV5T_5q.css","assets/index-D_0WlfRC.js","assets/index-D_Bfde9M.css","assets/index-Dravm_Fi.js","assets/index-jE1aeu5I.js","assets/index-yQhkBcPI.css","assets/memoryChallenge-0GRc-isu.js","assets/menuPick-DR_0LND1.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-CLHT_02_.js","assets/photoBooth-NQi_inBO.js","assets/photoShoot-DIu5YpUl.js","assets/promiseCard-C9UTun3M.js","assets/render-DO7X80i7.js","assets/rhythmDance-ii7EaMtO.js","assets/shopTry-CrtUHFsW.js","assets/singer-CWvNGYYn.js","assets/spaRelax-Bb4Hka6o.js","assets/styles-DDT62FZD.js","assets/ui-sVxfdJOm.js","assets/wardrobe-BxPTH5HH.js","index.html","manifest.webmanifest"];

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
