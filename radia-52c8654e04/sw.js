/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw1k042f';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/ambient-9Who5Dc2.js","assets/app-CF_2Qqx9.js","assets/art-C-SHpW-x.js","assets/bouquet-BU3bCQ-D.js","assets/braceletReveal-Di_VHf0_.js","assets/career-C0iLweAc.js","assets/career-vO6MXP3m.css","assets/careerGame-_PU3rZ1B.js","assets/casino-DxT_vpBT.js","assets/castle-4yepxF62.css","assets/castle-Cg3QqM2e.js","assets/cat-B4wtHW3f.js","assets/cat-DaPNr-Ui.css","assets/cat-ktry3T1i.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-FreswhTj.js","assets/chocolateBox-DUFalF_s.js","assets/chocolaterie-CGQVZ2zA.js","assets/chocolaterie-CuqfjcNM.css","assets/cinemaQuiz-CEg-2Y95.js","assets/common-BlASH8C_.js","assets/creativeUi-2ME0WCzv.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/decor-By2uHCZx.js","assets/decorTable-Dn_aLlFt.js","assets/drawing-yAYkmmQd.js","assets/dressVerdict-CH7wB_Zz.js","assets/dressing-Cfej9Dd_.js","assets/dressing-DGWRhRO0.css","assets/family-BxoqJWAT.css","assets/family-GoSWY1RT.js","assets/fans-BXo_QXE3.css","assets/fans-DYCpsLsS.js","assets/fashionThemes-CybpKUur.js","assets/finale-BRYhDGug.js","assets/fireworksPhoto-BvhFXpaY.js","assets/frame-Dja0a41k.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/gallery-CaNoJdwj.js","assets/garden-CuzS6qXw.js","assets/garden-DazHrlMv.css","assets/garden-DllP27P8.js","assets/garden-DpFHQxcN.js","assets/garden-Tg11dXFH.js","assets/guessMenu-DzU7_5Yd.js","assets/harness-Cg3gEeq9.js","assets/hub-Cgau96xP.css","assets/hub-UyZqgEt2.js","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-2TE5EB6O.css","assets/index-BBLFsMyN.js","assets/index-BZO6k9PG.js","assets/index-CB5-N1_i.js","assets/index-CVs5SL-j.js","assets/index-D1T99FBt.css","assets/index-DIPuofSp.js","assets/index-DIjLmt2F.css","assets/index-D_Bfde9M.css","assets/index-DbJk-iXj.css","assets/index-GzlQ415c.js","assets/memoryChallenge-fAwKA9ba.js","assets/memoryView-DDIoBb7T.js","assets/menuPick-D6LlIYnl.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-D_ArZBj3.js","assets/order-DcJ2bBxN.js","assets/p/bust-auguste.bin","assets/p/bust-radia-nc.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia-nc.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-xzaHPVWZ.js","assets/photoBooth-CwPGFZXw.js","assets/photoShoot-CC-hyG1c.js","assets/plumbing-CuSyZXtg.js","assets/promiseCard-VBQimT2O.js","assets/render-Coi3xmTi.js","assets/reveal-CgZGnLqd.js","assets/rhythmDance-CoblHsg_.js","assets/rng-BI3EnQTz.js","assets/scene-DspkQHD1.js","assets/shopTry-iv_P1Jz5.js","assets/singer-js9sVHQK.js","assets/spaRelax-BNugUHSm.js","assets/styles-DDT62FZD.js","assets/tidy-REV7Xkzb.js","assets/ui-BNoIlwvB.js","assets/ui-CqCKo-rz.js","assets/ui-D1ZjVUEi.js","assets/ui-DVDW61NP.js","assets/ui-DsHg_TTE.js","assets/wardrobe-OIwebGuN.js","assets/wires-dB9qtlnh.js","index.html","manifest.webmanifest"];

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
