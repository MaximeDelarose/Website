/* Service worker de RADIA — généré à la build (voir vite.config.ts). */
const VERSION = 'mw35gvoz-d0cee67';
const CACHE = 'radia-' + VERSION;
const PRECACHE = ["assets/adapters-BfmPG8W0.js","assets/ambient-WWdVI_RR.js","assets/app-CcsbFUIb.js","assets/art-Cz_QMNqT.js","assets/art-DAj1-a3K.js","assets/badge-D6ZYBxZY.js","assets/bouquet-C3gO4pWs.js","assets/braceletReveal-Do_jdKK9.js","assets/career-CPhsEd9K.css","assets/career-CtaSgUO8.js","assets/careerGame-CviyyiZK.js","assets/casino-BuoNs6pR.js","assets/castle-BMvovhX-.css","assets/castle-BRNSe_ff.js","assets/cat-C72OqJFj.js","assets/cat-DaPNr-Ui.css","assets/cat-yaRbLsSq.js","assets/chess-core-DDhsYLKr.js","assets/chocolate-BkuNvKoD.js","assets/chocolateBox-yzJuUH8k.js","assets/chocolaterie-CuqfjcNM.css","assets/chocolaterie-tfHmMgJL.js","assets/cinemaQuiz-DXLNAyV0.js","assets/common-C8ouYMPn.js","assets/creativeUi-DFOYisqv.js","assets/dancing-script-latin-700-normal-CX8AaSVl.woff2","assets/data-CD9eKOs4.js","assets/data-CHO05yWQ.js","assets/decor-Janpib5b.js","assets/decorTable-9K5t4ZeT.js","assets/demo-DFhvYdh9.js","assets/drawing-D3KI4R6c.js","assets/dressVerdict-BQj6PYG4.js","assets/dressing-C5hySflF.js","assets/dressing-DRvvLtmc.css","assets/family-BBkZAI0L.js","assets/family-gy-OT53v.css","assets/fans-BXo_QXE3.css","assets/fans-DPzx31u6.js","assets/fashionThemes-BfsuXrWv.js","assets/finale-BbmNEKEs.js","assets/fireworksPhoto-UPWMCGJf.js","assets/frame-I_slP7m5.js","assets/fredoka-latin-400-normal-Bxuk_fn1.woff2","assets/fredoka-latin-500-normal-DjswcPAG.woff2","assets/fredoka-latin-600-normal-5ja5qWal.woff2","assets/fredoka-latin-700-normal-C3QZl44p.woff2","assets/fx-CNa7OHz3.js","assets/gallery-Kco8VEcy.js","assets/garden-B0YQMde7.js","assets/garden-B75eaKQd.js","assets/garden-CqI-sN8t.js","assets/garden-DazHrlMv.css","assets/garden-DvQ7OHek.js","assets/giftArt-CyCmWmfS.js","assets/guessMenu-9TabpKSP.js","assets/harness-G8ZHmuzC.js","assets/host-B8bc0-uN.js","assets/hub-C-UyR3xl.js","assets/hub-Cgau96xP.css","assets/icon-06WJK2X5.css","assets/icon-C_gFcWPp.js","assets/icons/apple-touch-icon.png","assets/icons/favicon-64.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/incidents-J7BMtWdS.css","assets/index-B3SiVRYJ.js","assets/index-BRWvVPWG.css","assets/index-BmCBXwT9.js","assets/index-CLGad4UF.css","assets/index-DNlVaGFs.css","assets/index-DZV28E8t.css","assets/index-D_Bfde9M.css","assets/index-DuBjxsr-.js","assets/index-FS1J4xhw.js","assets/index-PE5EOrPx.js","assets/index-S-L2XtQc.js","assets/index-ig1dOV33.css","assets/index-rfd3aFXw.js","assets/kit-DMufL6jD.js","assets/kit-DOzxEsJ8.css","assets/memoryChallenge-CWxLxc5u.js","assets/memoryView-BuY1OsWA.js","assets/menuPick-DMzkOZiB.js","assets/music/radia-lingering-notes.mp3","assets/music/radia-quiet-resolution.mp3","assets/music/radia-theme-2.mp3","assets/music/radia-theme.mp3","assets/music/radia-warm-world.mp3","assets/necklace-BgN1v2QW.css","assets/notice-CRuIiX2I.js","assets/order-vnj7k94f.js","assets/p/bust-auguste.bin","assets/p/bust-radia.bin","assets/p/char-auguste.bin","assets/p/char-radia.bin","assets/p/face-auguste.bin","assets/p/face-radia.bin","assets/p/family.bin","assets/p/head-auguste.bin","assets/p/head-new.bin","assets/p/p1.bin","assets/p/p2.bin","assets/p/p3.bin","assets/p/p4.bin","assets/p/p5.bin","assets/p/p6.bin","assets/p/voice_m4a.bin","assets/p/voice_mp3.bin","assets/phaser-0YPJO2g1.js","assets/phone-kmHl8DoC.js","assets/photoBooth-DZ-Xybr3.js","assets/photoShoot-8yoy07i6.js","assets/plumbing-DfzTwiFB.js","assets/promiseCard-kJoaTEjl.js","assets/render-8j-EOUtS.js","assets/render-Dfb6Slqg.js","assets/reveal-CoumZEc7.js","assets/rhythmDance-CsJa9Dcy.js","assets/rng-LLIeWRGS.js","assets/runtime-tCXKMHCG.js","assets/scene-C7nCHeHi.css","assets/scene-CfEJh-uE.js","assets/scene-SzdUU5Rl.js","assets/scenes-sDjDdwO8.js","assets/session-BMs1R0d_.js","assets/shopChest-SpMuD6Lk.js","assets/shopTry-BUXFaaiU.js","assets/spaRelax-S_N2hp5o.js","assets/store-BqeRA6o3.js","assets/styles-DDT62FZD.js","assets/tidy-C0Pc4aMr.js","assets/touchDiag-ByaN7N6r.js","assets/ui-4iusB9qV.js","assets/ui-B-8X5rjm.css","assets/ui-BgpmBPLq.js","assets/ui-Blvdx_Oe.js","assets/ui-BurU-WAR.css","assets/ui-CEeZZn-9.js","assets/ui-Cu-I0hTZ.js","assets/ui-DFxKxfwZ.js","assets/ui-_lg2MVtD.js","assets/ui-lVHXPTr_.js","assets/wardrobe-C9sY5y-i.js","assets/wires-BOAnwTSw.js","index.html","manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    // { cache: 'reload' } : on ignore le cache HTTP du navigateur, sinon une page d'accueil périmée (jusqu'à 10 min) pourrait être
    // rangée avec les fichiers de la nouvelle version.
    caches.open(CACHE).then((c) => c.addAll(['./', ...PRECACHE].map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La page peut demander l'activation immédiate d'une version en attente (bouton « Mettre à jour »).
self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Informations de version : toujours le réseau, jamais de cache.
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })));
    return;
  }
  // La page : réseau d'abord SANS cache HTTP (pour recevoir les mises à jour tout de suite), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(url.href, { cache: 'no-store', credentials: 'same-origin' })
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
