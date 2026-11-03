/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw16dhvv';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/art-DgOevsZF.js","assets/bouquet-C1075qXj.js","assets/braceletReveal-BU1eUeNC.js","assets/career-DKnK_UzE.js","assets/career-vO6MXP3m.css","assets/careerGame-D0PBxyIk.js","assets/careers-Da5GIwMD.js","assets/castle-4yepxF62.css","assets/castle-DL57DhWk.js","assets/cat-45hkDk8z.js","assets/cat-DJneyhdO.js","assets/cat-DaPNr-Ui.css","assets/chess-core-DDhsYLKr.js","assets/chocolate-Ckvqj3tF.js","assets/chocolateBox-BDs1sH9w.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-Nsp-sjAD.js","assets/cinemaQuiz-CkIKoMNQ.js","assets/common-5C04EzvO.js","assets/creativeUi-CNo5LV9O.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-B6y_xKgB.js","assets/decorTable-N8Bke9F5.js","assets/dressVerdict-B26-XEir.js","assets/dressing-D28yNteH.css","assets/dressing-D6yHX4ev.js","assets/family-BxoqJWAT.css","assets/family-DR2TvZtL.js","assets/fans-BXo_QXE3.css","assets/fans-DESPgsaO.js","assets/fashionThemes-IDc6JQn6.js","assets/finale-C5VguD0t.js","assets/fireworksPhoto-C2QwdrV7.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-CavvJc5-.js","assets/garden-CePSVq_e.js","assets/garden-CmnZKc0F.js","assets/garden-DazHrlMv.css","assets/guessMenu-Dtq3R5iW.js","assets/harness-CYF-0ieg.js","assets/hub-Bo2beOBR.css","assets/hub-DZ3FX6bS.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/index-6bbM1sUT.js","assets/index-BpqGFebd.js","assets/index-CaFhpALA.js","assets/index-DAZuIFbo.js","assets/index-D_Bfde9M.css","assets/index-skP-4rMN.css","assets/index-yQhkBcPI.css","assets/memoryChallenge-CsD0rmUN.js","assets/menuPick-0u52WG8B.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-DnOG_30B.js","assets/photoBooth-D7r7NKO7.js","assets/photoShoot-OA9A43yP.js","assets/promiseCard-DWmU0v-J.js","assets/render-BvEjEvcT.js","assets/rhythmDance-In3ouIK9.js","assets/shopTry-Ddh2NmqU.js","assets/singer-iRMdXn7b.js","assets/spaRelax-BpEWfJ8Y.js","assets/styles-DDT62FZD.js","assets/ui-BKlOM6_E.js","assets/wardrobe-qP1GTRFI.js","index.html","manifest.webmanifest"];

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
