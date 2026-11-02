/* =========================================================================
   Écureuil Dice — interface : rendu, commandes, menus, sauvegarde, en ligne
   Données : js/dice-data.js · moteur : js/dice-core.js
   Sprites des ennemis : js/game-data.js (Écureuil Survivor)
   ========================================================================= */
(function () {
  "use strict";
  var VERSION = "0.5.0";
  var DEBUG = /[?&]debug\b/.test(location.search); // dice.html?debug : outils de test
  var GAME_ID = "ecureuil-dice";
  var stage = document.querySelector("[data-dice]");
  if (!stage || !window.RD_DATA || !window.RD_CORE || !window.ES_DATA) return;
  var D = window.RD_DATA, K = window.RD_CORE, ES = window.ES_DATA, T = D.TYPES, CFG = D.CFG;
  var $ = function (s) { return stage.querySelector(s); };
  var canvas = $("canvas"), ctx = canvas.getContext("2d");
  var overlay = $("[data-overlay]"), card = $("[data-card]"), hud = $("[data-hud]");

  /* =====================================================================
     Sauvegarde (localStorage, dans le navigateur du joueur)
     ===================================================================== */
  var SAVE_KEY = "rd-save-v1";
  function defaults() {
    return { gold: 0, deck: D.START_DECK.slice(), cls: {}, owned: {}, have: null, cards: {}, keys: 0, chests: 0, sel: "noisette",
             best: { solo: 0, coop: 0 }, wins: 0, games: 0, ach: {}, name: "", mute: false, botLvl: 1 };
  }
  var S = defaults();
  try {
    var raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && typeof raw === "object") Object.keys(raw).forEach(function (k) { if (k in S) S[k] = raw[k]; });
  } catch (e) {}
  // S = état affiché. Invité : S est la sauvegarde du navigateur (LOCAL).
  // Connecté : la progression vient du serveur, seules les préférences restent dans le navigateur.
  var LOCAL = S;
  var Cloud = { on: false, loading: false, busy: false, msg: "", err: "" };
  function save() {
    if (Cloud.on) { LOCAL.mute = S.mute; LOCAL.botLvl = S.botLvl; LOCAL.sel = S.sel; LOCAL.name = S.name; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(LOCAL)); } catch (e) {}
  }
  // ancienne sauvegarde : on garde tout ce qui était débloqué ou déjà joué
  if (!S.have) {
    S.have = {};
    (S.deck || []).concat(Object.keys(S.owned || {}), Object.keys(S.cls || {})).forEach(function (k) { if (T[k]) S.have[k] = true; });
  }
  if (!S.cards || typeof S.cards !== "object") S.cards = {};
  function owned(k) { return T[k].rarity === "commun" || !!S.have[k]; }
  function clsLv(k) { return S.cls[k] || 1; }
  function copiesNeed(k) { var lv = clsLv(k); return lv >= CFG.classMax ? Infinity : Math.ceil(D.COPIES[lv - 1] * D.RARITY[T[k].rarity].copies); }
  function lvCost(k) { return CFG.classCosts[clsLv(k)] || 0; }
  function canLevel(k) { return owned(k) && clsLv(k) < CFG.classMax && (S.cards[k] || 0) >= copiesNeed(k) && S.gold >= lvCost(k); }
  S.deck = (S.deck || []).filter(function (k, i, a) { return T[k] && owned(k) && a.indexOf(k) === i; }).slice(0, 5);
  if (!S.deck.length) S.deck = D.START_DECK.slice();
  if (!T[S.sel]) S.sel = "noisette";

  /* ---------- compte du site (js/auth.js) : progression sur le serveur ---------- */
  var PROG = ["gold", "keys", "chests", "have", "cards", "cls", "deck", "best", "wins", "games", "ach"];
  function applyServer(p) {
    if (!p) return;
    PROG.forEach(function (k) { if (p[k] !== undefined && p[k] !== null) S[k] = p[k]; });
    if (!Array.isArray(S.deck)) S.deck = [];
    S.best = S.best || { solo: 0, coop: 0 };
  }
  function refreshScreen() {
    if (state === "menu" && ["menu", "deck", "chests", "succes", "online"].indexOf(screen) >= 0) show(screen, true);
  }
  function cloudStart(st) {
    if (!st || !st.user) { if (Cloud.on) { Cloud.on = false; S = LOCAL; refreshScreen(); } return; }
    if (Cloud.on || Cloud.loading) return;
    Cloud.loading = true; Cloud.err = ""; refreshScreen();
    window.SiteAuth.rpc("rd_load").then(function (p) {
      if (p.imported) return p;
      // première connexion : on reprend une seule fois la progression du navigateur (le serveur la plafonne)
      var hasLocal = (LOCAL.games || 0) > 0 || (LOCAL.gold || 0) > 0 || (LOCAL.chests || 0) > 0;
      return window.SiteAuth.rpc("rd_import", { p: hasLocal ? { gold: LOCAL.gold, have: LOCAL.have, cls: LOCAL.cls, cards: LOCAL.cards, best: LOCAL.best } : {} })
        .then(function (q) { if (hasLocal) Cloud.msg = "Ta progression de ce navigateur a été reprise sur ton compte (avec des plafonds anti-triche)."; return q; });
    }).then(function (p) {
      S = Object.assign({}, LOCAL);
      applyServer(p);
      if (st.profile && st.profile.pseudo) S.name = st.profile.pseudo;
      Cloud.on = true; Cloud.loading = false; refreshScreen();
    }).catch(function (err) { Cloud.loading = false; Cloud.err = window.SiteAuth.message(err); refreshScreen(); });
  }
  function pushDeck() {
    if (!Cloud.on) return;
    clearTimeout(pushDeck.t);
    pushDeck.t = setTimeout(function () {
      window.SiteAuth.rpc("rd_set_deck", { p_deck: S.deck.slice() }).then(function (p) {
        if (p && p.deck && p.deck.join() !== S.deck.join()) { S.deck = p.deck; refreshScreen(); }
      }).catch(function () {});
    }, 400);
  }
  // refus du serveur : on recharge la vraie progression (l'affichage local a pu être modifié)
  function resync() { if (Cloud.on) window.SiteAuth.rpc("rd_load").then(function (p) { applyServer(p); refreshScreen(); }).catch(function () {}); }
  var RUN_MODE = { solo: "solo", bot: "bot", "local-coop": "local-coop", "local-vs": "local-vs", "net-coop": "coop", "net-vs": "versus" };
  function myCls() { var o = {}; D.ORDER.forEach(function (k) { o[k] = clsLv(k); }); return o; }

  /* =====================================================================
     Sprites (même format que le Survivor : contour sombre automatique)
     ===================================================================== */
  var OUT = "#2b1709";
  function sprite(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (row) { w = Math.max(w, row.length); });
    var W = w + 2, H = h + 2, filled = new Uint8Array(W * H);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * W + x + 1] = 1; }
    }
    g.fillStyle = OUT;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      if ((x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) ||
          (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x])) g.fillRect(x, y, 1, 1);
    }
    function variant(flip, white) {
      var v = document.createElement("canvas"); v.width = W; v.height = H;
      var vg = v.getContext("2d");
      if (flip) { vg.translate(W, 0); vg.scale(-1, 1); }
      vg.drawImage(c, 0, 0);
      if (white) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = "#fff"; vg.fillRect(0, 0, W, H); }
      return v;
    }
    return { c: c, f: variant(true), wc: variant(false, true), w: W, h: H };
  }
  var SPR = {};
  Object.keys(ES.SPRITES).forEach(function (k) { var d = ES.SPRITES[k]; SPR[k] = d.frames.map(function (f) { return sprite(f, d.pal); }); });
  var SQ = {}, ICON = {};
  var sqRows = ES.SPRITES.sq_noisette.frames;
  D.ORDER.forEach(function (k) {
    SQ[k] = sqRows.map(function (f) { return sprite(f, T[k].fur); });
    ICON[k] = sprite(T[k].icon.rows, T[k].icon.pal);
  });
  var urlCache = {};
  function sqUrl(k) { return urlCache[k] || (urlCache[k] = SQ[k][0].c.toDataURL()); }
  function iconUrl(k) { return urlCache["i" + k] || (urlCache["i" + k] = ICON[k].c.toDataURL()); }
  function goldUrl() { return urlCache.gold || (urlCache.gold = SPR.gold[0].c.toDataURL()); }
  function goldIc() { return '<img class="gold-ic" src="' + goldUrl() + '" alt="glands d\'or">'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) {
    n = Math.max(0, Math.round(n));
    if (n < 1000) return String(n);
    if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(".0", "") + "k";
    return (n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace(".0", "") + "M";
  }

  /* =====================================================================
     Sons (synthèse, aucun fichier)
     ===================================================================== */
  var actx = null, sndLast = {};
  function sfx(freq, dur, type, vol, slide) {
    if (S.mute) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function arp(notes, step, type, vol) { notes.forEach(function (f, i) { setTimeout(function () { sfx(f, 0.12, type || "square", vol || 0.04); }, i * step); }); }
  function thr(key, ms, fn) { var n = performance.now(); if (n - (sndLast[key] || 0) < ms) return; sndLast[key] = n; fn(); }
  var SND = {
    summon: function () { sfx(520, 0.08, "square", 0.035, 1.6); },
    merge: function (p) { arp([392 + p * 40, 523 + p * 50, 659 + p * 60], 50, "triangle", 0.05); },
    pu: function () { arp([523, 784, 1047], 60, "square", 0.035); },
    kill: function () { thr("kill", 60, function () { sfx(300 + Math.random() * 200, 0.06, "square", 0.02, 0.5); }); },
    boom: function () { thr("boom", 90, function () { sfx(110, 0.22, "triangle", 0.07, 0.4); }); },
    zap: function () { thr("zap", 80, function () { sfx(1300, 0.06, "sawtooth", 0.02, 0.4); }); },
    leak: function () { sfx(160, 0.3, "sawtooth", 0.07, 0.5); },
    wave: function () { arp([440, 554, 659], 80, "triangle", 0.04); },
    boss: function () { arp([220, 196, 175, 147], 140, "sawtooth", 0.05); },
    win: function () { arp([523, 659, 784, 1047, 1319], 90, "triangle", 0.06); },
    over: function () { arp([392, 330, 262, 196], 160, "triangle", 0.06); },
    click: function () { sfx(660, 0.05, "square", 0.03); },
    no: function () { sfx(180, 0.08, "square", 0.03); },
  };

  /* =====================================================================
     État de la partie
     ===================================================================== */
  var state = "menu", screen = "menu", paused = false, speed = 1;
  // G.worlds : mondes simulés ici (sim) ou reçus (view) ; G.panels : ce qu'on dessine
  var G = null;
  var view = { scale: 1, ox: 0, oy: 0, W: 0, H: 0 };

  function newGame(cfg) {
    // cfg : { mode, kind: "solo"|"bot"|"local-coop"|"local-vs"|"net-coop"|"net-vs", worlds:[...], panels:[...] }
    G = cfg; G.t = 0; G.vfx = []; G.ended = false; G.drag = {}; G.sel = null; G.netAcc = 0; G.outEv = [];
    G.panels.forEach(function (p) { p.deco = deco(p.world.lay, p.seed || 3); });
    state = "play"; paused = false; speed = 1;
    hideOverlay(); hud.hidden = false; syncHud();
    layoutScene();
    if (Cloud.on) G.runP = window.SiteAuth.rpc("rd_start_run", { p_mode: RUN_MODE[G.kind] || "solo" }).catch(function () { return null; });
    else { S.games++; save(); }
  }
  function soloGame() {
    var w = K.createWorld({ mode: "solo", seed: (Math.random() * 1e9) | 0, boards: [{ name: S.name || "Toi", deck: S.deck, cls: myCls() }] });
    newGame({ mode: "solo", kind: "solo", sims: [w], panels: [{ world: w, mine: [0] }] });
  }
  function botGame() {
    var seed = (Math.random() * 1e9) | 0, lvl = S.botLvl || 1;
    var botDeck = shuffle(D.ORDER.slice()).slice(0, 5), botCls = {};
    D.ORDER.forEach(function (k) { botCls[k] = lvl === 2 ? 4 : 1; });
    var me = K.createWorld({ mode: "versus", seed: seed, boards: [{ name: S.name || "Toi", deck: S.deck, cls: myCls() }] });
    var bot = K.createWorld({ mode: "versus", seed: seed, boards: [{ name: lvl === 2 ? "IA coriace" : "IA", deck: botDeck, cls: botCls, bot: true }] });
    newGame({ mode: "versus", kind: "bot", bot: true, botLvl: lvl, sims: [me, bot], panels: [{ world: me, mine: [0] }, { world: bot, mine: [], opp: true, seed: 9 }] });
  }
  function localCoop() {
    var w = K.createWorld({ mode: "coop", seed: (Math.random() * 1e9) | 0,
      boards: [{ name: "Joueur 2", deck: S.deck, cls: myCls() }, { name: "Joueur 1", deck: S.deck, cls: myCls() }] });
    // même écran : le joueur 2 est en face (plateau du haut, écureuils et commandes à l'envers)
    newGame({ mode: "coop", kind: "local-coop", sims: [w], panels: [{ world: w, mine: [0, 1], flipB: [0] }] });
  }
  function localVs() {
    var seed = (Math.random() * 1e9) | 0;
    var a = K.createWorld({ mode: "versus", seed: seed, boards: [{ name: "Joueur 1", deck: S.deck, cls: myCls() }] });
    var b = K.createWorld({ mode: "versus", seed: seed, boards: [{ name: "Joueur 2", deck: S.deck, cls: myCls() }] });
    newGame({ mode: "versus", kind: "local-vs", sims: [a, b], panels: [{ world: a, mine: [0] }, { world: b, mine: [0], seed: 9, flip: true }] });
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- disposition à l'écran ---------- */
  var HUD_H = 34;
  function layoutScene() {
    if (!G) return;
    var cw = stage.clientWidth, ch = stage.clientHeight, P = G.panels;
    var pad = 4, gap = 10;
    if (P.length === 1) {
      P[0].ox = 0; P[0].oy = 0; view.W = P[0].world.lay.w; view.H = P[0].world.lay.h;
    } else {
      var a = P[0].world.lay, b = P[1].world.lay;
      var sH = Math.min(cw / (a.w + b.w + gap + pad * 2), (ch - HUD_H) / (Math.max(a.h, b.h) + pad * 2));
      var sV = Math.min(cw / (Math.max(a.w, b.w) + pad * 2), (ch - HUD_H) / (a.h + b.h + gap + pad * 2));
      if (G.kind === "local-vs") sH = -1; // même écran : toujours face à face, le joueur 2 en haut à l'envers
      if (sH >= sV) { P[0].ox = 0; P[0].oy = 0; P[1].ox = a.w + gap; P[1].oy = 0; view.W = a.w + b.w + gap; view.H = Math.max(a.h, b.h); }
      else {
        // en hauteur : l'adversaire en haut, toi en bas (plus près du pouce)
        var top = P[0].opp || P[0].flip ? 0 : 1, bot = 1 - top;
        P[top].ox = 0; P[top].oy = 0; P[bot].ox = 0; P[bot].oy = P[top].world.lay.h + gap;
        view.W = Math.max(a.w, b.w); view.H = a.h + b.h + gap;
      }
    }
    var hudTop = HUD_H;   // place pour les boutons pause / son / vitesse
    view.scale = Math.min(cw / (view.W + pad * 2), (ch - hudTop) / (view.H + pad * 2));
    view.ox = (cw - view.W * view.scale) / 2; view.oy = hudTop + (ch - hudTop - view.H * view.scale) / 2;
  }
  function resize() {
    var dpr = window.devicePixelRatio || 1, cw = stage.clientWidth, ch = stage.clientHeight;
    canvas.width = Math.max(1, Math.round(cw * dpr)); canvas.height = Math.max(1, Math.round(ch * dpr));
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    layoutScene();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);

  /* =====================================================================
     Décor
     ===================================================================== */
  function deco(lay, seed) {
    var r = seed * 9301 + 49297, out = [];
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    var cols = ["#4f7d44", "#5b8a4a", "#36592f", "#6e9d5a"];
    for (var i = 0; i < lay.w * lay.h / 90; i++) out.push([rnd() * lay.w, rnd() * lay.h, cols[(rnd() * cols.length) | 0], rnd() < 0.06 ? ((rnd() * 3) | 0) + 1 : 0]);
    return out;
  }

  /* =====================================================================
     Rendu
     ===================================================================== */
  // commandes d'un plateau : à partir de b.cy (sous le plateau, ou au-dessus en coop pour celui du haut)
  function puRect(b, i) { return { x: b.x + i * 26.5, y: b.cy + 24, w: 24, h: 30 }; }
  function sumRect(b) { return { x: b.x, y: b.cy, w: 84, h: 20 }; }
  function font(sz, w) { ctx.font = (w || 900) + " " + sz + "px Nunito, system-ui, sans-serif"; }
  function text(str, x, y, color, align, sz, outline) {
    font(sz || 6); ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    if (outline !== false) { ctx.lineWidth = Math.max(1.4, (sz || 6) / 3.2); ctx.strokeStyle = OUT; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color || "#fdf3de"; ctx.fillText(str, x, y);
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function box(x, y, w, h, fill, edge, depth) {
    rect(x, y + 1, w, h - 1, depth || OUT);
    rect(x, y, w, h - 1.5, edge || OUT);
    rect(x + 1, y + 1, w - 2, h - 3.5, fill);
  }
  function heart(x, y, on) {
    var c = on ? "#c8553d" : "#4a3a2a", hi = on ? "#f29a85" : "#5a4a3a";
    var m = [".xx.xx.", "xhxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."];
    m.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] !== ".") rect(x + i, y + j, 1, 1, row[i] === "h" ? hi : c); });
  }
  function drawSpr(s, x, y, flip, white) { ctx.drawImage(white ? s.wc : (flip ? s.f : s.c), Math.round(x), Math.round(y)); }

  function render() {
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!G) { drawMenuBg(dpr); return; }
    var s = view.scale * dpr;
    G.panels.forEach(function (p) {
      ctx.setTransform(s, 0, 0, s, (view.ox + p.ox * view.scale) * dpr, (view.oy + p.oy * view.scale) * dpr);
      if (p.flip) { ctx.translate(p.world.lay.w, p.world.lay.h); ctx.rotate(Math.PI); }
      drawPanel(p);
    });
    // écureuil tenu au doigt / à la souris
    ctx.setTransform(s, 0, 0, s, view.ox * dpr, view.oy * dpr);
    Object.keys(G.drag).forEach(function (id) {
      var d = G.drag[id]; if (!d.moved) return;
      var sq = d.panel.world.boards[d.bi].slots[d.slot]; if (!sq) return;
      ctx.globalAlpha = 0.9;
      if (d.panel.flip || flipped(d.panel, d.bi)) drawTileR(sq, d.x - 12, d.y - 10, 0); else drawTile(sq, d.x - 12, d.y - 14, 0);
      ctx.globalAlpha = 1;
    });
  }
  var menuT = 0;
  function drawMenuBg(dpr) {
    menuT += 1 / 60;
    var cw = canvas.width, ch = canvas.height, sc = Math.max(2, Math.round(Math.min(cw, ch) / 180));
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    var W = cw / sc, H = ch / sc;
    rect(0, 0, W, H, "#3f6b3a");
    for (var i = 0; i < 40; i++) rect((i * 47) % W, (i * 89) % H, 2, 1, "#4f7d44");
    rect(0, H * 0.62, W, 12, "#6b4430"); rect(0, H * 0.62 + 2, W, 8, "#b07a4f");
    var list = ["slug", "beetle", "wasp", "bunny", "fox", "spider", "moth", "toad"];
    list.forEach(function (k, j) {
      var x = ((menuT * 18 + j * 34) % (W + 40)) - 20, fr = SPR[k][Math.floor(menuT * 5 + j) % SPR[k].length];
      drawSpr(fr, x, H * 0.62 + 6 - fr.h);
    });
    D.ORDER.slice(0, 7).forEach(function (k, j) {
      var x = 10 + j * 26, y = H * 0.62 + 18;
      if (x + 24 > W) return;
      drawTile({ t: k, p: 1 + (j % 6), bob: 0, stun: 0 }, x, y + Math.round(Math.sin(menuT * 3 + j) * 1), menuT);
    });
  }

  function drawPanel(p) {
    var w = p.world, lay = w.lay;
    // herbe
    rect(0, 0, lay.w, lay.h, "#3f6b3a");
    p.deco.forEach(function (d) {
      if (d[3]) { rect(d[0], d[1], 1, 1, ["", "#f2d48a", "#f29a85", "#e6f6fa"][d[3]]); return; }
      rect(d[0], d[1], 2, 1, d[2]); rect(d[0] + 0.5, d[1] - 1, 1, 1, d[2]);
    });
    // chemin
    ctx.lineCap = "square"; ctx.lineJoin = "miter";
    function trace() { ctx.beginPath(); lay.paths.forEach(function (pth) { pth.pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); }); }
    trace(); ctx.strokeStyle = "#6b4430"; ctx.lineWidth = 17; ctx.stroke();
    trace(); ctx.strokeStyle = "#b07a4f"; ctx.lineWidth = 13; ctx.stroke();
    trace(); ctx.strokeStyle = "#c99a6a"; ctx.lineWidth = 3; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
    // terriers de départ et réserve de noisettes au bout
    lay.paths.forEach(function (pth) { var s0 = pth.pts[0]; rect(s0[0] - 7, s0[1] - 4, 14, 8, "#2b1709"); rect(s0[0] - 5, s0[1] - 2, 10, 6, "#120a04"); });
    var s1 = lay.paths[0].pts[lay.paths[0].pts.length - 1];
    drawSpr(SPR.stump[0], s1[0] - 6, s1[1] - 4);
    for (var hI = 0; hI < CFG.lives; hI++) if (hI < w.lives) drawSpr(SPR.nut[0], s1[0] - 9 + hI * 6, s1[1] - 9);
    // plateaux
    w.boards.forEach(function (b, bi) { drawBoard(p, b, bi); });
    drawRange(p);
    // pièges
    w.mines.forEach(function (m) {
      var q = K.posAt(lay, m.dist, m.lane), x = q.x, y = q.y;
      if (m.t < m.fly && m.x0 !== undefined) { var f = m.t / m.fly; x = m.x0 + (q.x - m.x0) * f; y = m.y0 + (q.y - m.y0) * f - Math.sin(f * Math.PI) * 14; }
      drawSpr(SPR.pinecone[0], x - 3.5, y - 4);
    });
    // ennemis (du plus loin au plus proche pour le chevauchement)
    var list = w.enemies.slice().sort(function (a, b2) { return a.dist - b2.dist; });
    list.forEach(function (e) { drawEnemy(w, e); });
    // projectiles
    w.projs.forEach(function (pr) {
      if (pr.delay > 0) return;
      var c = T[pr.t].color;
      rect(pr.x - 2, pr.y - 2, 4, 4, OUT); rect(pr.x - 1.5, pr.y - 1.5, 3, 3, c); rect(pr.x - 1, pr.y - 1.5, 1, 1, "#fff8");
    });
    drawVfx(p);
    drawHud(p);
  }

  function drawBoard(p, b, bi) {
    var o = p.world.lay.boards[bi], mine = p.mine.indexOf(bi) >= 0;
    rect(o.x - 3, o.y - 3, K.BW + 6, K.BH + 6, "#2b1709");
    rect(o.x - 2, o.y - 2, K.BW + 4, K.BH + 4, "#36592f");
    var drag = dragOn(p, bi), sel = G.sel && G.sel.panel === p && G.sel.bi === bi ? G.sel.slot : -1;
    var from = drag ? drag.slot : sel, fl = flipped(p, bi);
    for (var i = 0; i < K.NSLOT; i++) {
      var x = o.x + (i % K.COLS) * K.CELL, y = o.y + Math.floor(i / K.COLS) * K.CELL;
      rect(x + 1, y + 1, 24, 24, "#2f4f2a"); rect(x + 2, y + 2, 22, 22, "#335a2e");
      var sq = b.slots[i];
      if (!sq) continue;
      var lifted = drag && drag.moved && drag.slot === i;
      var tile = fl ? drawTileR : drawTile;
      if (lifted) { ctx.globalAlpha = 0.35; tile(sq, x + 1, y + 1, G.t); ctx.globalAlpha = 1; continue; }
      var bob = sq.bob > 0 ? -1 : 0, pop = sq.born > 0 ? sq.born * 3 : 0;
      tile(sq, x + 1, y + 1 + (fl ? -bob + pop : bob - pop), G.t);
      if (from >= 0 && from !== i && K.canMerge(b, from, i)) {
        var a = 0.5 + 0.5 * Math.sin(G.t * 10);
        ctx.strokeStyle = "rgba(246,211,107," + (0.5 + a * 0.5) + ")"; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, 24, 24);
      }
      if (from === i) { ctx.strokeStyle = "#fdf3de"; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, 25, 25); }
    }
    // pas de commandes pour les plateaux qu'on ne contrôle pas (coéquipier en ligne, adversaire, IA)
    if (!mine) {
      if (p.world.boards.length > 1) { var cc0 = ctrlCenter(o); text(b.name.slice(0, 16), cc0.x, cc0.y, "#c9b8a0", "center", 7); }
      return;
    }
    // commandes (à l'envers pour le joueur d'en face)
    if (fl) { var cc = ctrlCenter(o); ctx.save(); ctx.translate(cc.x, cc.y); ctx.rotate(Math.PI); ctx.translate(-cc.x, -cc.y); }
    var sr = sumRect(o), cost = K.summonCost(b), full = !K.freeSlots(b).length, can = !full && b.sp >= cost && mine && !p.world.over;
    box(sr.x, sr.y, sr.w, sr.h, can ? "#e8873a" : "#8a7660", OUT, can ? "#a8541a" : "#5a4a3a");
    text(full ? "PLATEAU PLEIN" : "INVOQUER", sr.x + sr.w / 2, sr.y + 6.5, "#fdf3de", "center", 6);
    if (!full) { drawSpr(SPR.nut[0], sr.x + sr.w / 2 - 12, sr.y + 10.5); text(fmt(cost), sr.x + sr.w / 2 - 4, sr.y + 13.5, can ? "#fdf3de" : "#e0d0b0", "left", 6); }
    // noisettes
    var nx = sr.x + sr.w + 3;
    box(nx, sr.y, K.BW - sr.w - 3, sr.h, "#3a2618", OUT, OUT);
    drawSpr(SPR.nut[0], nx + 3, sr.y + 6.5);
    text(fmt(b.sp), nx + 11, sr.y + 9.5, "#f6d36b", "left", 7.5);
    if (!mine) text(b.name.slice(0, 12), nx + (K.BW - sr.w - 3) / 2, sr.y + 17, "#c9b8a0", "center", 4);
    // améliorations
    b.deck.forEach(function (k, i) {
      var r = puRect(o, i), c = K.puCost(b, i), ok = mine && isFinite(c) && b.sp >= c && !p.world.over;
      box(r.x, r.y, r.w, r.h, ok ? T[k].color : "#5a4a3a", OUT, ok ? T[k].dark : "#3a2a1a");
      ctx.drawImage(ICON[k].c, r.x + (r.w - ICON[k].w * 1.4) / 2, r.y + 2, ICON[k].w * 1.4, ICON[k].h * 1.4);
      text("NV" + (b.pu[i] + 1), r.x + r.w / 2, r.y + 17.5, "#fdf3de", "center", 5);
      text(isFinite(c) ? fmt(c) : "MAX", r.x + r.w / 2, r.y + 24.5, ok ? "#f6d36b" : "#c9b8a0", "center", 5);
    });
    if (fl) ctx.restore();
  }
  function flipped(p, bi) { return !!(p.flipB && p.flipB.indexOf(bi) >= 0); }
  function ctrlCenter(o) { return { x: o.x + K.BW / 2, y: o.cy + 27 }; }
  function drawTileR(sq, x, y, t) {
    ctx.save(); ctx.translate(x + 12, y + 12); ctx.rotate(Math.PI); drawTile(sq, -12, -12, t); ctx.restore();
  }

  // cercle de portée de l'écureuil tenu, sélectionné ou survolé
  function drawRange(p) {
    var it = null;
    Object.keys(G.drag).forEach(function (id) { var d = G.drag[id]; if (d.panel === p) it = d; });
    if (!it && G.sel && G.sel.panel === p) it = G.sel;
    if (!it && G.hover && G.hover.panel === p) it = G.hover;
    if (!it) return;
    var sq = p.world.boards[it.bi] && p.world.boards[it.bi].slots[it.slot]; if (!sq) return;
    var c = K.slotCenter(p.world.lay, it.bi, it.slot), Tp = T[sq.t];
    if (Tp.target === "none" && sq.t !== "mine") {
      // soutien : on montre les cases voisines concernées
      if (!Tp.haste) return;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
        var cx = it.slot % K.COLS + d[0], cyy = Math.floor(it.slot / K.COLS) + d[1];
        if (cx < 0 || cx >= K.COLS || cyy < 0 || cyy >= K.ROWS) return;
        var o = p.world.lay.boards[it.bi];
        ctx.strokeStyle = "rgba(156,208,106,.9)"; ctx.lineWidth = 1.5; ctx.strokeRect(o.x + cx * K.CELL + 1, o.y + cyy * K.CELL + 1, 24, 24);
      });
      return;
    }
    var r = K.rangeOf(sq.t);
    if (!isFinite(r)) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 15, p.world.lay.w, p.world.lay.h - 15); ctx.clip();
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(253,243,222,.08)"; ctx.fill();
    ctx.strokeStyle = Tp.color; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTile(sq, x, y, t) {
    var Tp = T[sq.t];
    rect(x, y, 24, 24, OUT);
    rect(x + 1, y + 1, 22, 22, Tp.dark);
    rect(x + 1, y + 1, 22, 20, Tp.color);
    rect(x + 2, y + 2, 20, 1, "rgba(255,255,255,.25)");
    var fr = SQ[sq.t][Math.floor(((t || 0) * 2 + x * 0.05)) % 2];
    ctx.drawImage(fr.c, Math.round(x + 4), Math.round(y + 1));
    ctx.drawImage(ICON[sq.t].c, Math.round(x + 1), Math.round(y + 1));
    // points (le « dé ») : en bas, sur une ou deux lignes
    var n = sq.p, row1 = Math.min(n, 4), row2 = n - row1;
    function dots(cnt, yy) {
      var w = cnt * 4 - 1, sx = x + 12 - w / 2;
      for (var i = 0; i < cnt; i++) { rect(sx + i * 4 - 0.5, yy - 0.5, 4, 4, OUT); rect(sx + i * 4, yy, 3, 3, n >= 7 ? "#f6d36b" : "#fdf3de"); }
    }
    if (row2) { dots(row2, y + 13); dots(row1, y + 18); } else dots(row1, y + 18);
    if (sq.stun > 0) {
      ctx.fillStyle = "rgba(30,25,40,.55)"; ctx.fillRect(x + 1, y + 1, 22, 22);
      text("ZZ", x + 12, y + 7 + Math.sin((t || 0) * 6), "#c9b3ff", "center", 6);
    }
    if (sq.grow !== undefined && sq.grow > 0) {
      var f = Math.max(0, 1 - sq.grow / (Tp.grow || 16));
      rect(x + 2, y + 21.5, 20, 1.5, "#2b1709"); rect(x + 2, y + 21.5, 20 * f, 1.5, "#9cd06a");
    }
  }

  function drawEnemy(w, e) {
    var q = K.epos(w, e), fr = SPR[e.type][Math.floor(e.t * 5) % SPR[e.type].length];
    var big = e.d.boss ? 1 : 0, x = q.x - fr.w / 2, y = q.y - fr.h + 4;
    if (e.d.hop) y -= Math.max(0, Math.sin(e.t * 7)) * 3;
    if (e.d.fly) y -= 3 + Math.sin(e.t * 4) * 1.5;
    if (e.under) {
      rect(q.x - 5, q.y - 1, 10, 4, "#6b4430"); rect(q.x - 3, q.y - 2, 6, 2, "#8a5a3b");
      return;
    }
    if (e.d.boss) {
      ctx.save(); ctx.translate(q.x, q.y + 4); ctx.scale(1.3, 1.3); ctx.translate(-fr.w / 2, -fr.h);
      drawSpr(fr, 0, 0, q.dx < 0, e.flash > 0); ctx.restore();
      y = q.y + 4 - fr.h * 1.3;
    } else drawSpr(fr, x, y, q.dx < 0, e.flash > 0);
    if (e.slowT > 0) { rect(q.x - 1, y - 1, 2, 2, "#9fd8ff"); }
    if (e.frozenT > 0) { ctx.globalAlpha = 0.45; rect(q.x - fr.w / 2, y, fr.w, fr.h, "#bfe8ff"); ctx.globalAlpha = 1; }
    if (e.poisonT > 0) { rect(q.x + 3, y + Math.sin(e.t * 5) * 1, 2, 2, "#9cd06a"); }
    if (e.chargeT > 0) { rect(q.x - 8, q.y + 2, 3, 1, "#fdf3de"); rect(q.x - 12, q.y, 3, 1, "#fdf3de"); }
    // PV
    var hpTxt = fmt(e.hp), sz = big ? 6 : 4.5;
    text(hpTxt, q.x, y - (big ? 3 : 2), big ? "#f6d36b" : "#fdf3de", "center", sz);
    if (big || e.d.big) {
      var bw = big ? 26 : 14, f = Math.max(0, e.hp / e.max);
      rect(q.x - bw / 2, q.y + 5, bw, 2, OUT); rect(q.x - bw / 2, q.y + 5, bw * f, 2, "#c8553d");
    }
  }

  function drawHud(p) {
    var w = p.world, lay = w.lay;
    rect(0, 0, lay.w, 15, "rgba(31,58,43,.85)");
    var boss = K.isBossWave(w.wave);
    text(w.wave ? "VAGUE " + w.wave : "PRÉPARE-TOI", 5, 7.5, boss ? "#f29a85" : "#fdf3de", "left", 7);
    // barre de temps de la vague
    var bx = 58, bw = lay.w - bx - 34;
    rect(bx, 5, bw, 5, OUT);
    var f;
    if (!w.wave) f = Math.min(1, w.waveT / 3);
    else if (boss) f = 1 - Math.min(1, w.waveT / CFG.bossTimeout);
    else f = Math.min(1, w.waveT / CFG.waveLen);
    rect(bx + 1, 6, (bw - 2) * f, 3, boss ? "#c8553d" : "#f6d36b");
    if (boss) { var be = w.enemies.filter(function (e) { return e.d.boss; })[0]; text(be ? be.d.name.toUpperCase() : "BOSS", bx + bw / 2, 7.5, "#fdf3de", "center", 4.5); }
    for (var i = 0; i < CFG.lives; i++) heart(lay.w - 29 + i * 9, 4.5, i < w.lives);
    if (G.panels.length > 1) {
      var name = w.boards[0].name, lab = (p.opp ? "⚔ " : "") + name;
      text(lab.slice(0, 18), lay.w / 2, lay.h - 6, p.opp ? "#f29a85" : "#f6d36b", "center", 5.5);
    }
    if (w.over && G.panels.length > 1) {
      ctx.fillStyle = "rgba(20,12,6,.55)"; ctx.fillRect(0, 0, lay.w, lay.h);
      text("ÉLIMINÉ", lay.w / 2, lay.h / 2, "#f29a85", "center", 16);
    }
  }

  /* ---------- effets visuels ---------- */
  function pushVfx(p, v) { if (G.vfx.length < 400) { v.p = p; v.t = 0; G.vfx.push(v); } }
  function drawVfx(p) {
    G.vfx.forEach(function (v) {
      if (v.p !== p) return;
      var f = v.t / v.d;
      if (v.k === "part") { rect(v.x + v.vx * v.t, v.y + v.vy * v.t + 30 * v.t * v.t, 2, 2, v.c); }
      else if (v.k === "ring") { ctx.strokeStyle = v.c; ctx.globalAlpha = 1 - f; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.x, v.y, v.r * (0.4 + f * 0.6), 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (v.k === "bolt") {
        ctx.strokeStyle = "#f6d36b"; ctx.globalAlpha = 1 - f; ctx.lineWidth = 1.5; ctx.beginPath();
        v.pts.forEach(function (q, i) { var jx = i ? (Math.random() - 0.5) * 3 : 0; if (i) ctx.lineTo(q[0] + jx, q[1] - 3); else ctx.moveTo(q[0], q[1] - 3); });
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      else if (v.k === "txt") { ctx.globalAlpha = 1 - f * f; text(v.s, v.x, v.y - f * 10, v.c, "center", v.sz || 6); ctx.globalAlpha = 1; }
      else if (v.k === "flash") { ctx.globalAlpha = (1 - f) * 0.6; rect(v.x, v.y, v.w, v.h, v.c); ctx.globalAlpha = 1; }
    });
  }
  function updVfx(dt) {
    for (var i = G.vfx.length - 1; i >= 0; i--) { var v = G.vfx[i]; v.t += dt; if (v.t >= v.d) G.vfx.splice(i, 1); }
  }
  var ECOL = {};
  K.EKEYS.forEach(function (k) { var pal = ES.SPRITES[k].pal; ECOL[k] = Object.keys(pal).map(function (c) { return pal[c]; }); });
  function slotXY(w, bi, s) { var o = w.lay.boards[bi]; return { x: o.x + (s % K.COLS) * K.CELL, y: o.y + Math.floor(s / K.COLS) * K.CELL }; }
  function handleEvents(p, evs, loud) {
    var w = p.world;
    // en versus en ligne, quelques effets partent chez l'adversaire avec l'instantané
    if (G && G.kind === "net-vs" && p === G.panels[0]) {
      G.vsEv = G.vsEv || [];
      evs.forEach(function (e) { if (G.vsEv.length < 30 && (e.k === "kill" || e.k === "boom" || e.k === "bolt")) G.vsEv.push(e); });
    }
    evs.forEach(function (e) {
      if (e.k === "kill") {
        var cols = ECOL[e.type] || ["#fdf3de"];
        for (var i = 0; i < (e.boss ? 24 : 6); i++) pushVfx(p, { k: "part", x: e.x, y: e.y - 3, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 50, c: cols[i % cols.length], d: 0.5 });
        if (loud) SND.kill();
      } else if (e.k === "boom") { pushVfx(p, { k: "ring", x: e.x, y: e.y, r: e.r, c: e.c, d: 0.3 }); if (loud) SND.boom(); }
      else if (e.k === "bolt") { pushVfx(p, { k: "bolt", pts: e.pts, d: 0.18 }); if (loud) SND.zap(); }
      else if (e.k === "crit") pushVfx(p, { k: "txt", s: fmt(e.v) + "!", x: e.x, y: e.y - 12, c: "#f6d36b", d: 0.6, sz: 6 });
      else if (e.k === "miss") pushVfx(p, { k: "txt", s: "RATÉ", x: e.x, y: e.y - 10, c: "#c9b3ff", d: 0.5, sz: 4.5 });
      else if (e.k === "heal") pushVfx(p, { k: "ring", x: e.x, y: e.y, r: 30, c: "#9cd06a", d: 0.4 });
      else if (e.k === "merge" || e.k === "grow" || e.k === "copy" || e.k === "xf" || e.k === "summon") {
        var q = slotXY(w, e.b, e.s);
        pushVfx(p, { k: "flash", x: q.x + 1, y: q.y + 1, w: 24, h: 24, c: e.k === "xf" ? "#c9b3ff" : "#fdf3de", d: 0.3 });
        if (e.k === "merge" && loud) SND.merge(e.p || 2);
        if (e.k === "summon" && loud) SND.summon();
      } else if (e.k === "stun") { var q2 = slotXY(w, e.b, e.s); pushVfx(p, { k: "txt", s: "BAM", x: q2.x + 13, y: q2.y + 6, c: "#f29a85", d: 0.7 }); }
      else if (e.k === "exec") pushVfx(p, { k: "txt", s: "CROC !", x: e.x, y: e.y - 12, c: "#fdf3de", d: 0.6, sz: 5 });
      else if (e.k === "steal") pushVfx(p, { k: "txt", s: "+" + e.v, x: e.x, y: e.y - 16, c: "#5fa3c9", d: 0.7, sz: 5 });
      else if (e.k === "storm") { pushVfx(p, { k: "flash", x: 0, y: 0, w: w.lay.w, h: w.lay.h, c: "#f6d36b", d: 0.18 }); if (loud) SND.zap(); }
      else if (e.k === "income") { var o = w.lay.boards[e.b]; pushVfx(p, { k: "txt", s: "+" + e.v, x: o.x + K.BW - 20, y: o.cy + 4, c: "#f6d36b", d: 1 }); }
      else if (e.k === "pu" && loud) SND.pu();
      else if (e.k === "leak") { pushVfx(p, { k: "flash", x: 0, y: 0, w: w.lay.w, h: w.lay.h, c: "#c8553d", d: 0.35 }); if (loud) SND.leak(); }
      else if (e.k === "wave" && loud) {
        if (e.boss) { banner("Vague " + e.n + " · Boss !"); SND.boss(); }
        else { if (e.n > 1 && e.n % 5 === 1) banner("Vague " + e.n); SND.wave(); }
      }
      else if (e.k === "charge" && loud) banner("Le Grand Sanglier charge !", 1200);
      else if (e.k === "hoot" && loud) banner("Le Hibou Ancien hulule…", 1200);
    });
  }
  var bannerEl = $("[data-banner]");
  function banner(s, ms) {
    bannerEl.textContent = s; bannerEl.hidden = false;
    bannerEl.classList.remove("show"); void bannerEl.offsetWidth; bannerEl.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { bannerEl.hidden = true; }, ms || 2600);
  }

  /* =====================================================================
     Boucle
     ===================================================================== */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    try {
      if (G && state === "play" && !paused) tick(dt);
      else if (G && state === "over") { updVfx(dt); G.panels.forEach(function (p) { if (p.view) K.stepView(p.world, dt); }); }
      render();
    } catch (err) { showError(err); }
    requestAnimationFrame(frame);
  }
  function tick(dt) {
    G.t += dt;
    var sd = dt * speed, n = Math.ceil(sd / 0.02), h = sd / n;
    (G.sims || []).forEach(function (w) {
      if (w.over) return;
      for (var i = 0; i < n; i++) {
        w.boards.forEach(function (b, bi) { if (b.bot) K.botStep(w, bi, h, G.botLvl); });
        K.step(w, h);
        if (w.over) break;
      }
    });
    G.panels.forEach(function (p) {
      if (p.view) { K.stepView(p.world, dt); return; }
      var evs = p.world.ev; p.world.ev = [];
      handleEvents(p, evs, !p.opp);
      if (Net.on && G.kind === "net-coop" && Net.role === "host") evs.forEach(function (e) { if (G.outEv.length < 60 && e.k !== "summon" && e.k !== "pu") G.outEv.push(e); });
    });
    updVfx(dt);
    if (Net.on) netTick(dt);
    checkEnd();
  }

  /* ---------- fin de partie ---------- */
  function checkEnd() {
    if (G.ended) return;
    var k = G.kind;
    if (k === "solo" || k === "local-coop" || k === "net-coop") {
      var w = G.panels[0].world;
      if (w.over) {
        if (k === "net-coop" && Net.role === "host") netSend("end", { r: resultOf(w) });
        finish({ mode: G.mode, wave: w.wave, kills: w.kills, bosses: w.bosses, maxPip: maxPip(w) });
      }
      return;
    }
    if (k === "bot" || k === "local-vs") {
      var a = G.sims[0], b = G.sims[1];
      if (a.over || b.over) {
        var res = { mode: "versus", wave: a.wave, kills: a.kills, bosses: a.bosses, maxPip: maxPip(a), bot: k === "bot" };
        if (k === "bot") res.win = !a.over; else res.local = a.over ? "Joueur 2" : "Joueur 1";
        finish(res);
      }
      return;
    }
    if (k === "net-vs") {
      var me = G.sims[0];
      if (me.over && !G.sentDead) { G.sentDead = true; netSend("dead", { w: me.wave }); finish({ mode: "versus", wave: me.wave, kills: me.kills, bosses: me.bosses, maxPip: maxPip(me), win: false, online: true }); }
    }
  }
  // connecté : c'est le serveur qui vérifie le résultat et calcule les gains
  function finishCloud(res) {
    res.newAch = []; res.pending = true; res.gold = 0;
    var before = res.mode === "coop" ? S.best.coop || 0 : S.best.solo || 0, runP = G.runP || Promise.resolve(null);
    showOver(res);
    runP.then(function (id) {
      if (!id) throw new Error("no_run");
      return window.SiteAuth.rpc("rd_end_run", { p_run: id, p_wave: res.wave, p_kills: res.kills, p_bosses: res.bosses, p_maxpip: res.maxPip || 1, p_win: !!res.win });
    }).then(function (r) {
      applyServer(r.profile);
      res.pending = false; res.gold = r.gold + (r.achGold || 0); res.key = r.key; res.saved = true;
      res.newAch = (r.newAch || []).map(achById).filter(Boolean);
      if ((res.mode === "solo" || res.mode === "coop") && !res.local && r.wave > before) res.record = true;
      if (state === "over" && screen === "over") showOver(res);
    }).catch(function (err) {
      res.pending = false;
      res.cloudErr = err && err.message === "no_run" ? "Gains non enregistrés : la partie n'a pas pu être ouverte sur le serveur." : "Gains non enregistrés : " + window.SiteAuth.message(err);
      if (state === "over" && screen === "over") showOver(res);
    });
  }
  function achById(id) { return D.ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0]; }
  function maxPip(w) { var m = 0; w.boards.forEach(function (b) { m = Math.max(m, b.maxPip || 1); }); return m; }
  function resultOf(w) { return { wave: w.wave, kills: w.kills, bosses: w.bosses }; }

  function finish(res) {
    if (G.ended) return;
    G.ended = true; state = "over"; hud.hidden = true;
    var win = res.win;
    if (res.local) SND.win(); else if (win) SND.win(); else SND.over();
    if (Cloud.on) { finishCloud(res); return; }
    // récompenses (glands d'or) : on ne gagne qu'en jouant, rien ne s'achète
    var gold = Math.round(res.wave * 4 + res.kills / 12 + res.bosses * 10);
    if (res.mode === "versus" && !res.local) gold = Math.round(gold * 0.6 + (win ? (res.bot ? 25 : 50) : 5));
    if (res.local) gold = Math.round(gold * 0.5);
    S.gold += gold;
    if (res.mode === "solo" && res.wave > (S.best.solo || 0)) { S.best.solo = res.wave; res.record = true; }
    if (res.mode === "coop" && res.wave > (S.best.coop || 0)) { S.best.coop = res.wave; res.record = true; }
    if (win) S.wins++;
    res.newAch = [];
    if (!res.local) D.ACHIEVEMENTS.forEach(function (a) { if (!S.ach[a.id] && a.check(res)) { S.ach[a.id] = 1; S.gold += a.gold; res.newAch.push(a); } });
    res.gold = gold;
    if (!res.local) { S.keys = (S.keys || 0) + 1; res.key = true; }
    save();
    showOver(res);
  }

  /* =====================================================================
     Commandes : souris / doigt (plusieurs doigts en même temps en local)
     ===================================================================== */
  function toLogical(e) {
    var rc = canvas.getBoundingClientRect();
    return { x: (e.clientX - rc.left - view.ox) / view.scale, y: (e.clientY - rc.top - view.oy) / view.scale };
  }
  function inR(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
  function hitAt(lx, ly) {
    if (!G) return null;
    for (var pi = 0; pi < G.panels.length; pi++) {
      var p = G.panels[pi], x = lx - p.ox, y = ly - p.oy;
      if (p.flip) { x = p.world.lay.w - x; y = p.world.lay.h - y; }
      for (var j = 0; j < p.mine.length; j++) {
        var bi = p.mine[j], o = p.world.lay.boards[bi];
        if (x >= o.x && x < o.x + K.BW && y >= o.y && y < o.y + K.BH) return { p: p, bi: bi, slot: Math.floor((x - o.x) / K.CELL) + Math.floor((y - o.y) / K.CELL) * K.COLS };
        var cx = x, cy = y;
        if (flipped(p, bi)) { var cc = ctrlCenter(o); cx = 2 * cc.x - x; cy = 2 * cc.y - y; }
        if (inR(cx, cy, sumRect(o))) return { p: p, bi: bi, btn: "sum" };
        for (var i = 0; i < 5; i++) if (inR(cx, cy, puRect(o, i))) return { p: p, bi: bi, btn: "pu", i: i };
      }
    }
    return null;
  }
  function dragOn(p, bi) {
    var ids = Object.keys(G.drag);
    for (var i = 0; i < ids.length; i++) { var d = G.drag[ids[i]]; if (d.panel === p && d.bi === bi) return d; }
    return null;
  }
  function doAct(p, bi, cmd) {
    if (state !== "play" || paused) return false;
    if (G.kind === "net-coop" && Net.role === "guest") {
      netSend("cmd", { a: cmd.a, f: cmd.f, t: cmd.t, i: cmd.i });
      if (cmd.a === "mg") { var b = p.world.boards[bi]; if (K.canMerge(b, cmd.f, cmd.t)) { b.slots[cmd.t].bob = 0.12; } }
      SND.click();
      return true;
    }
    var ok = K.act(p.world, bi, cmd);
    if (!ok) SND.no();
    return ok;
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play" || paused) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    var L = toLogical(e), h = hitAt(L.x, L.y);
    if (!h) { G.sel = null; return; }
    if (h.btn === "sum") { doAct(h.p, h.bi, { a: "sum" }); G.sel = null; return; }
    if (h.btn === "pu") { doAct(h.p, h.bi, { a: "pu", i: h.i }); return; }
    var b = h.p.world.boards[h.bi];
    if (G.sel && G.sel.panel === h.p && G.sel.bi === h.bi && G.sel.slot !== h.slot && K.canMerge(b, G.sel.slot, h.slot)) {
      doAct(h.p, h.bi, { a: "mg", f: G.sel.slot, t: h.slot }); G.sel = null; return;
    }
    if (b.slots[h.slot]) G.drag[e.pointerId] = { panel: h.p, bi: h.bi, slot: h.slot, x: L.x, y: L.y, sx: L.x, sy: L.y, moved: false };
    else G.sel = null;
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!G) return;
    if (e.pointerType === "mouse" && !G.drag[e.pointerId]) {
      var hL = toLogical(e), hh = hitAt(hL.x, hL.y);
      G.hover = hh && hh.slot !== undefined ? { panel: hh.p, bi: hh.bi, slot: hh.slot } : null;
    }
    var d = G.drag[e.pointerId]; if (!d) return;
    var L = toLogical(e); d.x = L.x; d.y = L.y;
    if (Math.hypot(d.x - d.sx, d.y - d.sy) > 4) d.moved = true;
  });
  function release(e) {
    if (!G) return;
    var d = G.drag[e.pointerId]; if (!d) return;
    delete G.drag[e.pointerId];
    if (e.type === "pointercancel") return;
    if (!d.moved) {
      // simple toucher : on sélectionne (puis on touche la cible)
      G.sel = G.sel && G.sel.panel === d.panel && G.sel.bi === d.bi && G.sel.slot === d.slot ? null : { panel: d.panel, bi: d.bi, slot: d.slot };
      return;
    }
    var L = toLogical(e), h = hitAt(L.x, L.y);
    if (h && h.p === d.panel && h.bi === d.bi && h.slot !== undefined && h.slot !== d.slot) {
      if (K.canMerge(d.panel.world.boards[d.bi], d.slot, h.slot)) doAct(d.panel, d.bi, { a: "mg", f: d.slot, t: h.slot });
      else SND.no();
    }
    G.sel = null;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  window.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (state !== "play" || !G) return;
    var p = G.panels[0];
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); togglePause(); return; }
    if (paused || !p.mine.length) return;
    var bi = (G.kind === "net-coop" && Net.role === "guest") || G.kind === "local-coop" ? 1 : p.mine[0];
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); doAct(p, bi, { a: "sum" }); }
    var m = /^Digit([1-5])$/.exec(e.code);
    if (m) doAct(p, bi, { a: "pu", i: +m[1] - 1 });
  });

  /* =====================================================================
     HUD HTML (pause, son, vitesse)
     ===================================================================== */
  var btnPause = $("[data-pause]"), btnMute = $("[data-mute]"), btnSpeed = $("[data-speed]");
  function canPause() { return G && !Net.on; }
  function syncHud() {
    btnMute.textContent = S.mute ? "🔇" : "🔊";
    btnPause.hidden = !canPause();
    btnSpeed.hidden = !canPause();
    btnSpeed.textContent = "×" + speed;
  }
  btnMute.addEventListener("click", function () { S.mute = !S.mute; save(); syncHud(); });
  btnPause.addEventListener("click", function () { togglePause(); });
  btnSpeed.addEventListener("click", function () { speed = speed === 1 ? 2 : 1; syncHud(); });
  function togglePause() {
    if (!canPause() || state !== "play") return;
    paused = !paused;
    if (paused) show("pause"); else hideOverlay();
  }
  window.addEventListener("blur", function () { if (state === "play" && canPause() && !paused) togglePause(); });

  /* =====================================================================
     Menus (HTML par-dessus le canvas)
     ===================================================================== */
  function hideOverlay() { overlay.hidden = true; }
  function show(name, keepScroll) {
    var y = overlay.scrollTop;
    screen = name; overlay.hidden = false;
    card.className = "panel game-card rd-card rd-" + name;
    card.innerHTML = SCREENS[name]();
    overlay.scrollTop = keepScroll ? y : 0;
    if (keepScroll) return;
    var first = card.querySelector("[data-focus]") || card.querySelector(".btn");
    if (first && matchMedia("(hover: hover)").matches) try { first.focus({ preventScroll: true }); } catch (e) {}
  }
  function deckStrip(deck) {
    return '<div class="rd-strip">' + deck.map(function (k) {
      return '<span class="rd-die" style="--c:' + T[k].color + ';--d:' + T[k].dark + '" title="' + esc(T[k].name) + '"><img src="' + sqUrl(k) + '" alt=""><img class="rd-ic" src="' + iconUrl(k) + '" alt=""></span>';
    }).join("") + "</div>";
  }
  var swapK = null, openedHtml = "";
  function sprUrl(name) { return urlCache["s" + name] || (urlCache["s" + name] = SPR[name][0].c.toDataURL()); }
  function dieHtml(k) {
    return '<span class="rd-die" style="--c:' + T[k].color + ";--d:" + T[k].dark + '"><img src="' + sqUrl(k) + '" alt=""><img class="rd-ic" src="' + iconUrl(k) + '" alt=""></span>';
  }
  var TARGET = { front: "le plus avancé", strong: "le plus solide", random: "au hasard", all: "toutes les bestioles", none: "aucune (soutien)" };
  function detailHtml(k) {
    var t = T[k], have = owned(k), R = D.RARITY[t.rarity], lv = clsLv(k), need = copiesNeed(k), c = S.cards[k] || 0, inDeck = S.deck.indexOf(k) >= 0;
    var mul = 1 + CFG.classBonus * (lv - 1);
    var html = '<div class="rd-detail" style="--rc:' + R.color + '">' +
      '<div class="rd-detail-head">' + dieHtml(k) + "<div><strong>" + esc(t.name) + '</strong><span class="rd-rar">' + R.name + "</span>" +
      "<small>" + esc(t.role) + (have ? " · niveau " + lv : " · pas encore trouvé") + "</small></div></div>" +
      '<p class="rd-desc">' + esc(t.desc) + "</p>";
    var stats = [];
    if (t.dmg) stats.push(["Dégâts par tir", Math.round(t.dmg * mul) + (t.pu ? " (+" + Math.round(t.pu * mul) + " par amélioration)" : "")]);
    if (t.target !== "none") stats.push(["Cadence", "1 salve / " + String(t.every).replace(".", ",") + " s"]);
    stats.push(["Cible", TARGET[t.target] || t.target]);
    if (t.target !== "none" || k === "mine") stats.push(["Portée", isFinite(K.rangeOf(k)) ? (K.rangeOf(k) / K.CELL).toFixed(1).replace(".", ",") + " cases" : "tout le chemin"]);
    else if (t.haste) stats.push(["Portée", "les 4 cases voisines"]);
    stats.push(["Bonus de niveau", "+" + Math.round((mul - 1) * 100) + " % de dégâts"]);
    html += '<dl class="rd-stats">' + stats.map(function (st) { return "<dt>" + st[0] + "</dt><dd>" + st[1] + "</dd>"; }).join("") + "</dl>";
    if (!have) return html + '<p class="game-small">Trouve-le dans un <button class="rd-link" type="button" data-action="go" data-arg="chests">coffre</button>.</p></div>';
    html += '<div class="rd-copies"><span>Exemplaires</span><span class="rd-bar' + (canLevel(k) ? " is-ready" : "") + '"><b style="width:' + (isFinite(need) ? Math.min(100, c / need * 100) : 100) + '%"></b><em>' + (isFinite(need) ? c + " / " + need : "Niveau max") + "</em></span></div>";
    html += '<div class="rd-type-btns">';
    if (inDeck) html += '<button class="btn btn-small btn-ghost" type="button" data-action="deck" data-arg="' + k + '">Retirer du deck</button>';
    else if (S.deck.length < 5) html += '<button class="btn btn-small btn-alt" type="button" data-action="deck" data-arg="' + k + '">Ajouter au deck</button>';
    else html += '<button class="btn btn-small btn-alt" type="button" data-action="swap" data-arg="' + k + '">Remplacer un dé du deck</button>';
    if (isFinite(need)) html += '<button class="btn btn-small" type="button" data-action="lvup" data-arg="' + k + '"' + (canLevel(k) ? "" : " disabled") + ">⬆ Niveau " + (lv + 1) + " · " + goldIc() + " " + lvCost(k) + "</button>";
    html += "</div>";
    if (isFinite(need) && c < need) html += '<p class="game-small">Encore ' + (need - c) + " exemplaire" + (need - c > 1 ? "s" : "") + " pour l'améliorer.</p>";
    return html + "</div>";
  }
  function rollRarity(luck) {
    var tot = 0, keys = Object.keys(D.RARITY), w = keys.map(function (r) { var v = D.RARITY[r].weight * (r === "commun" ? 1 : luck || 1); tot += v; return v; });
    var x = Math.random() * tot;
    for (var i = 0; i < keys.length; i++) { x -= w[i]; if (x <= 0) return keys[i]; }
    return "commun";
  }
  var RORD = ["commun", "rare", "epique", "legendaire"];
  // prix d'un lot : 10 coffres = prix de 9
  function chestPrice(c, n) { return c.price * (n === 10 ? 9 : 1); }
  function chestFree(c, n) { return n === 1 && c.id === "bois" && S.keys >= D.KEYS_FOR_FREE; }
  function canOpen(c, n) { return !Cloud.busy && (chestFree(c, n) || S.gold >= chestPrice(c, n)); }
  function openChest(c, n) {
    var got = {}, order = [];
    n = n || 1;
    for (var i = 0; i < c.cards * n; i++) {
      var r = rollRarity(c.luck);
      if (i % c.cards === 0 && c.minRarity && RORD.indexOf(r) < RORD.indexOf(c.minRarity)) r = c.minRarity; // garantie : 1 par coffre
      var pool = D.ORDER.filter(function (k) { return T[k].rarity === r; }), k = pool[(Math.random() * pool.length) | 0];
      if (!got[k]) { got[k] = { n: 0, isNew: !owned(k) }; order.push(k); }
      got[k].n++;
    }
    order.forEach(function (k) {
      var g = got[k];
      if (g.isNew) { S.have[k] = true; S.cards[k] = (S.cards[k] || 0) + g.n - 1; }
      else S.cards[k] = (S.cards[k] || 0) + g.n;
    });
    order.sort(function (a, b) { return RORD.indexOf(T[a].rarity) - RORD.indexOf(T[b].rarity); });
    S.chests = (S.chests || 0) + n;
    save();
    return { got: got, order: order };
  }
  /* =====================================================================
     Ouverture de coffre : chute, coups pour ouvrir, explosion, cartes une par une
     ===================================================================== */
  var CHEST_PAL = {
    bois: { b: "#6b4430", B: "#a06a3e", k: "#3a2618", y: "#f2c230", g: "#fff3b0" },
    fer: { b: "#55524e", B: "#8d8a86", k: "#2b2926", y: "#c8d8e8", g: "#ffffff" },
    or: { b: "#a8741a", B: "#e0a82a", k: "#5a3a08", y: "#fff3b0", g: "#ffffff" },
  };
  var chestArt = {};
  function chestImgs(id) {
    if (chestArt[id]) return chestArt[id];
    var pal = CHEST_PAL[id] || CHEST_PAL.bois;
    var lid = sprite(["...bbbbbb...", "..bBBBBBBb..", ".bBBBBBBBBb.", "bBBBBBBBBBBb", "kkkkkyykkkkk"], pal);
    var base = sprite(["kggggggggggk", "bBBBByyBBBBb", "bBBBBBBBBBBb", "bBBBBBBBBBBb", "bbbbbbbbbbbb"], pal);
    return (chestArt[id] = { lid: lid.c.toDataURL(), base: base.c.toDataURL() });
  }
  var RCOL = { commun: "#d8d4cc", rare: "#5fa3c9", epique: "#b07ae8", legendaire: "#f2c230" };
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function shakeStage(cls) {
    if (REDUCED) return;
    stage.classList.remove("rd-shake-s", "rd-shake-l"); void stage.offsetWidth; stage.classList.add(cls);
    setTimeout(function () { stage.classList.remove(cls); }, 450);
  }
  // resP : Promise<{ got, order }> (tirage local ou serveur) ; la séquence démarre sans attendre le serveur
  function chestFx(c, resP, n) {
    n = n || 1;
    var art = chestImgs(c.id), res = null, failed = null, step = 0, idx = -1, taps = 0, done = false, timer = 0;
    var layer = document.createElement("div");
    layer.className = "rd-cfx"; layer.setAttribute("role", "dialog"); layer.setAttribute("aria-label", "Ouverture du " + c.name);
    layer.innerHTML =
      '<div class="rd-cfx-rays"></div>' +
      '<div class="rd-cfx-title">' + esc(c.name) + (n > 1 ? ' <span class="rd-cfx-x">×' + n + "</span>" : "") + "</div>" +
      '<div class="rd-cfx-chest"><div class="rd-cfx-glow"></div><img class="rd-cfx-base" src="' + art.base + '" alt=""><img class="rd-cfx-lid" src="' + art.lid + '" alt=""></div>' +
      '<div class="rd-cfx-card" hidden></div>' +
      '<div class="rd-cfx-hint">Touche le coffre pour l\'ouvrir</div>' +
      '<div class="rd-cfx-count" hidden></div>' +
      '<button class="btn btn-ghost btn-small rd-cfx-skip" type="button" hidden>Tout révéler ⏭</button>';
    stage.appendChild(layer);
    var $c = function (q) { return layer.querySelector(q); };
    var chestEl = $c(".rd-cfx-chest"), cardEl = $c(".rd-cfx-card"), hint = $c(".rd-cfx-hint"), count = $c(".rd-cfx-count"), skip = $c(".rd-cfx-skip");
    hideOverlay();
    resP.then(function (r) {
      res = r;
      var best = r.order[r.order.length - 1];
      layer.style.setProperty("--glow", RCOL[T[best].rarity]);       // la lueur trahit la meilleure rareté
      layer.dataset.best = T[best].rarity;
    }).catch(function (err) { failed = err; if (step < 2) abort(); });
    // 1. chute
    chestEl.classList.add("is-drop");
    sfx(140, 0.25, "triangle", 0.06, 0.5);
    setTimeout(function () { puff(chestEl, 10, "#c9b8a0"); buzz(20); shakeStage("rd-shake-s"); SND.boom(); }, 380);
    setTimeout(function () { step = 1; chestEl.classList.remove("is-drop"); }, 700);

    function puff(el, n, col, big) {
      var r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
      var cx = r.left - lr.left + r.width / 2, cy = r.top - lr.top + r.height * (big ? 0.45 : 0.9);
      for (var i = 0; i < n; i++) {
        var pdom = document.createElement("i"), a = Math.random() * Math.PI * 2, d = (big ? 90 : 40) + Math.random() * (big ? 160 : 50);
        pdom.className = "rd-cfx-p" + (big && i % 3 === 0 ? " star" : "");
        pdom.style.left = cx + "px"; pdom.style.top = cy + "px";
        pdom.style.setProperty("--dx", Math.cos(a) * d + "px"); pdom.style.setProperty("--dy", (Math.sin(a) * d * (big ? 1 : 0.4) - (big ? 30 : 10)) + "px");
        pdom.style.background = Array.isArray(col) ? col[i % col.length] : col;
        pdom.style.animationDuration = (0.5 + Math.random() * 0.5) + "s";
        layer.appendChild(pdom);
        setTimeout(function (x) { return function () { x.remove(); }; }(pdom), 1100);
      }
    }
    // 2. coups pour ouvrir (3), de plus en plus forts
    function tapChest() {
      if (step !== 1) return;
      taps++;
      chestEl.classList.remove("hit1", "hit2", "hit3"); void chestEl.offsetWidth; chestEl.classList.add("hit" + Math.min(3, taps));
      layer.style.setProperty("--charge", Math.min(1, taps / 3));
      sfx(180 + taps * 110, 0.1, "square", 0.05, 1.6); buzz(15 * taps);
      shakeStage("rd-shake-s");
      puff(chestEl, 4 + taps * 2, ["#f6d36b", "#fdf3de"]);
      if (taps >= 3) { step = 1.5; hint.textContent = "…"; waitOpen(); }
      else hint.textContent = taps === 1 ? "Encore !" : "Plus fort !";
    }
    function waitOpen() {
      if (failed) { abort(); return; }
      if (!res) { chestEl.classList.add("is-wait"); setTimeout(waitOpen, 120); return; }
      chestEl.classList.remove("is-wait");
      explode();
    }
    // 3. explosion
    function explode() {
      step = 2;
      var best = layer.dataset.best;
      layer.classList.add("is-open", "b-" + best);
      hint.hidden = true;
      sfx(90, 0.5, "sawtooth", 0.08, 0.3); setTimeout(function () { SND.boom(); }, 40);
      arp(best === "legendaire" ? [523, 659, 784, 1047, 1319, 1568] : best === "epique" ? [523, 659, 784, 1047] : [523, 784, 1047], 55, "triangle", 0.05);
      shakeStage("rd-shake-l"); buzz(best === "legendaire" ? [60, 40, 120] : 50);
      puff(chestEl, best === "legendaire" ? 46 : best === "epique" ? 34 : 24, [RCOL[best], "#fdf3de", "#f6d36b"], true);
      skip.hidden = false; count.hidden = false;
      timer = setTimeout(next, 650);
    }
    // 4. cartes une par une
    function next() {
      clearTimeout(timer);
      if (!res || done) return;
      idx++;
      if (idx >= res.order.length) { finish(); return; }
      step = 3;
      var k = res.order[idx], g = res.got[k], R = T[k].rarity, big = R === "legendaire" || R === "epique";
      count.textContent = (idx + 1) + " / " + res.order.length;
      cardEl.hidden = false;
      cardEl.className = "rd-cfx-card r-" + R + " is-back" + (big ? " is-tease" : "");
      cardEl.innerHTML = '<div class="rd-cfx-face">' + dieHtml(k) + "<b>" + esc(T[k].name) + '</b><span class="rd-cfx-rar">' + D.RARITY[R].name + "</span><small>×" + g.n + "</small>" +
        (g.isNew ? '<em class="rd-cfx-new">NOUVEAU !</em>' : "") + '</div><div class="rd-cfx-back">?</div>';
      sfx(500, 0.06, "square", 0.03, 1.8);
      var tease = R === "legendaire" ? 900 : R === "epique" ? 450 : 0;
      if (tease) { sfx(220, tease / 1000, "sawtooth", 0.035, 3); buzz(tease / 3); }
      setTimeout(function () {
        if (done || res.order[idx] !== k) return;
        cardEl.classList.remove("is-back", "is-tease"); cardEl.classList.add("is-flip");
        puff(cardEl, big ? 26 : R === "rare" ? 14 : 8, [RCOL[R], "#fdf3de"], true);
        if (R === "legendaire") { SND.win(); shakeStage("rd-shake-l"); buzz([80, 40, 160]); }
        else if (R === "epique") { arp([659, 784, 988, 1319], 60, "triangle", 0.05); shakeStage("rd-shake-s"); buzz(40); }
        else if (R === "rare") arp([784, 1047], 60, "square", 0.035);
        else sfx(880, 0.08, "square", 0.03, 1.3);
        if (g.isNew) setTimeout(function () { sfx(330, 0.12, "square", 0.05, 0.6); }, 260);
        timer = setTimeout(next, R === "legendaire" ? 2600 : R === "epique" ? 1700 : 1100);
      }, 160 + tease);
    }
    function finish() {
      if (done) return;
      done = true; clearTimeout(timer);
      layer.classList.add("is-out");
      setTimeout(function () { layer.remove(); }, 250);
      openedScreen(c, res, true, n);
    }
    function abort() {
      done = true; clearTimeout(timer); layer.remove();
      Cloud.err = failed ? window.SiteAuth.message(failed) : ""; show("chests", true); Cloud.err = "";
    }
    layer.addEventListener("click", function (e) {
      if (e.target === skip) { if (step >= 2) finish(); return; }
      if (step === 1) tapChest();
      else if (step === 3) next();
    });
  }

  function openedScreen(c, res, fast, n) {
    n = n || 1;
    var ci = D.CHESTS.indexOf(c), againFree = chestFree(c, n);
    var best = res.order[res.order.length - 1], bestR = T[best].rarity;
    openedHtml = '<h2>' + esc(c.name) + (n > 1 ? " ×" + n : "") + "</h2>" +
      (fast ? "" : '<div class="rd-open-chest" style="--cc:' + c.color + '"><img src="' + sprUrl("chest") + '" alt=""></div>') +
      '<div class="rd-reveal">' + res.order.map(function (k, i) {
        var g = res.got[k];
        return '<div class="rd-card-got r-' + T[k].rarity + '" style="animation-delay:' + (fast ? i * 0.04 : 0.6 + i * 0.18).toFixed(2) + 's">' + dieHtml(k) +
          '<b>' + esc(T[k].name) + "</b><small>×" + g.n + "</small>" + (g.isNew ? '<em class="rd-new">NOUVEAU</em>' : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="btn-row center rd-again"><button class="btn btn-alt" type="button" data-action="open" data-arg="' + ci + ":" + n + '"' + (canOpen(c, n) ? "" : " disabled") + ">↻ Rouvrir" + (n > 1 ? " ×" + n : "") + " · " + (againFree ? "Gratuit 🗝" : goldIc() + " " + chestPrice(c, n)) + "</button>" +
      (n === 1 && canOpen(c, 10) ? '<button class="btn btn-small" type="button" data-action="open" data-arg="' + ci + ':10">×10 · ' + goldIc() + " " + chestPrice(c, 10) + "</button>" : "") + "</div>" +
      '<p class="game-small rd-gold-left">' + goldIc() + " " + S.gold + " glands d'or restants</p>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="go" data-arg="deck">🃏 Voir le deck</button><button class="btn btn-ghost" type="button" data-action="go" data-arg="chests">🎁 Coffres</button></div>';
    show("opened");
    if (!fast) setTimeout(function () { if (bestR === "legendaire") SND.win(); else if (bestR === "epique") SND.merge(5); else SND.pu(); }, 600);
  }

  function adminCall(fn, args, ok) {
    if (!Cloud.on || Cloud.busy) return;
    Cloud.busy = true;
    window.SiteAuth.rpc(fn, args).then(function (p) { applyServer(p); Cloud.msg = ok; SND.pu(); })
      .catch(function (err) { Cloud.err = window.SiteAuth.message(err); })
      .then(function () { Cloud.busy = false; show("menu", true); Cloud.err = ""; });
  }
  function acctHtml() {
    var h;
    if (!window.SiteAuth) return "";
    if (Cloud.on) h = '<p class="game-small rd-acct">☁ Connecté' + (S.name ? " : <b>" + esc(S.name) + "</b>" : "") + ' · progression sauvegardée sur <a href="compte.html">ton compte</a>.</p>';
    else if (Cloud.loading) h = '<p class="game-small rd-acct">☁ Chargement de ton compte…</p>';
    else h = '<p class="game-small rd-acct">Invité : ta progression reste dans ce navigateur. <button class="rd-link" type="button" data-action="login">Connexion / inscription avec Google</button> pour la protéger, la retrouver partout et jouer en ligne.</p>';
    if (Cloud.on && window.SiteAuth.profile && window.SiteAuth.profile.admin) h += '<div class="rd-admin"><b>🛠 Admin</b>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="admgold" data-arg="5000">+5 000 glands</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="admgold" data-arg="50000">+50 000</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="admunlock">Tout débloquer (+20 exemplaires)</button></div>';
    if (Cloud.msg) { h += '<p class="game-small">' + esc(Cloud.msg) + "</p>"; Cloud.msg = ""; }
    if (Cloud.err) h += '<p class="net-err">' + esc(Cloud.err) + "</p>";
    return h;
  }

  // en-tête d'écran : bouton Retour compact (comme le Survivor)
  function head(title, back, label, right) {
    return '<div class="screen-head rd-head"><button class="btn btn-ghost btn-small btn-back" type="button" data-action="' + (back === "leave" ? "leave" : "go") + '" data-arg="' + (back || "menu") + '" aria-label="Retour">←<span class="bk-tx"> ' + (label || "Retour") + "</span></button><h2>" + title + "</h2>" + (right || "<span></span>") + "</div>";
  }
  function acctMsgs() {
    var h = "";
    if (Cloud.msg) { h += '<p class="game-small rd-center">' + esc(Cloud.msg) + "</p>"; Cloud.msg = ""; }
    if (Cloud.err) h += '<p class="net-err rd-center">' + esc(Cloud.err) + "</p>";
    return h;
  }
  var SCREENS = {
    menu: function () {
      var deckOk = S.deck.length === 5, dis = deckOk ? "" : " disabled";
      var nAch = Object.keys(S.ach || {}).length, up = D.ORDER.some(canLevel), freeChest = S.keys >= D.KEYS_FOR_FREE;
      function tile(act, arg, ic, label, sub, badge, hot, off) {
        return '<button type="button" class="mm-tile' + (hot ? " is-hot" : "") + '" data-action="' + act + '"' + (arg ? ' data-arg="' + arg + '"' : "") + (off ? " disabled" : "") + ">" +
          '<span class="mm-ic">' + ic + '</span><span class="mm-lb"><b>' + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>" +
          (badge ? '<span class="pill">' + badge + "</span>" : "") + "</button>";
      }
      var acct = !window.SiteAuth ? "" : Cloud.on ? tile("go", "account", "☁", esc(S.name || "Mon compte"), "Connecté") :
        Cloud.loading ? tile("go", "account", "☁", "Compte", "Chargement…") : tile("login", "", "👤", "Connexion", "Sauvegarde en ligne", "", true);
      return '<div class="mm">' +
        '<header class="mm-head"><img src="' + sqUrl("noisette") + '" alt=""><div><span class="kicker">Défense de dés</span><h2>Écureuil Dice</h2></div></header>' +
        '<div class="mm-stats rd-stats-row"><span class="mm-gold">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></span>" +
        '<span class="rd-keys" title="Clés : ' + D.KEYS_FOR_FREE + ' = un coffre gratuit">🗝 <b>' + Math.min(S.keys || 0, D.KEYS_FOR_FREE) + "</b>/" + D.KEYS_FOR_FREE + "</span>" +
        '<span class="rd-best">Record <b>vague ' + (S.best.solo || 0) + "</b></span></div>" +
        '<button type="button" class="rd-deckbar" data-action="go" data-arg="deck" aria-label="Modifier le deck">' +
        '<span class="rd-deckbar-dice">' + [0, 1, 2, 3, 4].map(function (i) { var k = S.deck[i]; return k ? dieHtml(k) : '<span class="rd-die rd-die-empty">+</span>'; }).join("") + "</span>" +
        '<span class="rd-deckbar-tx">' + (deckOk ? "Deck" : "Deck incomplet") + "<small>Modifier</small></span></button>" +
        '<div class="mm-main">' +
        '<button class="btn mm-play" type="button" data-action="solo"' + dis + "><span>▶ Jouer</span><small>Solo · record vague " + (S.best.solo || 0) + "</small></button>" +
        '<button class="btn btn-ghost mm-coop" type="button" data-action="go" data-arg="bot"' + dis + "><span>🤖 Vs l'IA</span><small>" + (S.botLvl === 2 ? "coriace" : "normale") + " · " + S.wins + " victoire" + (S.wins > 1 ? "s" : "") + "</small></button></div>" +
        '<div class="mm-grid">' +
        tile("online", "", "🌐", "En ligne", "Coop · versus", "", false, !deckOk) +
        tile("lcoop", "", "👥", "Coop à 2", "Même écran", "", false, !deckOk) +
        tile("lvs", "", "⚔️", "Versus à 2", "Même écran", "", false, !deckOk) +
        tile("go", "deck", "🃏", "Deck", up ? "Amélioration prête" : D.ORDER.filter(owned).length + " / " + D.ORDER.length + " écureuils", up ? "⬆" : "", up || !deckOk) +
        tile("go", "chests", "🎁", "Coffres", freeChest ? "Un coffre gratuit !" : "Bois · fer · doré", freeChest ? "!" : "", freeChest) +
        tile("go", "succes", "🏆", "Succès", nAch + " / " + D.ACHIEVEMENTS.length) +
        tile("go", "help", "❓", "Règles", "Comment jouer") +
        acct +
        "</div>" +
        (deckOk ? "" : '<p class="net-err rd-center">Ton deck doit contenir 5 écureuils pour jouer.</p>') +
        acctMsgs() +
        '<footer class="mm-foot"><span>Aucun achat : tout se gagne en jouant.</span><span><button class="mm-link" type="button" data-action="fs">' + (isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran") + "</button> · v" + VERSION + "</span></footer>" +
        (DEBUG && !Cloud.on ? '<p class="game-small rd-center">🧪 Mode test : <button class="btn btn-ghost btn-small" type="button" data-action="testgold">+5 000 glands d\'or</button></p>' : "") +
        "</div>";
    },
    bot: function () {
      function opt(lvl, ic, name, desc) {
        return '<button type="button" class="rd-opt' + ((S.botLvl || 1) === lvl ? " is-on" : "") + '" data-action="botgo" data-arg="' + lvl + '">' +
          '<span class="rd-opt-ic">' + ic + "</span><span><b>" + name + "</b><small>" + desc + "</small></span><span class=\"rd-opt-go\">▶</span></button>";
      }
      return head("Contre l'IA") +
        '<p class="game-small">Mêmes vagues pour toi et l\'IA : le dernier debout gagne.</p>' +
        '<div class="rd-opts">' + opt(1, "🐿️", "IA normale", "Pour s'entraîner. Victoire : +25 glands d'or.") +
        opt(2, "🦊", "IA coriace", "Écureuils niveau 4, décide deux fois plus vite.") + "</div>";
    },
    account: function () {
      return head("Compte") + acctHtml() + '<p class="game-small"><a href="compte.html">Gérer mon compte (pseudo, données) →</a></p>';
    },
    deck: function () {
      var html = head("Deck", "menu", "Retour", '<button class="btn btn-alt btn-small" type="button" data-action="go" data-arg="chests">🎁<span class="bk-tx"> Coffres</span>' + (S.keys >= D.KEYS_FOR_FREE ? " ✨" : "") + "</button>") +
        '<p class="gold-badge rd-mini-gold">' + goldIc() + " " + S.gold.toLocaleString("fr-FR") + "</p>";
      // les 5 places du deck
      html += '<div class="rd-slots' + (swapK ? " is-swap" : "") + '">';
      for (var i = 0; i < 5; i++) {
        var dk = S.deck[i];
        html += dk ? '<button class="rd-slot" type="button" data-action="dslot" data-arg="' + i + '" aria-label="Enlever ' + esc(T[dk].name) + ' du deck">' + dieHtml(dk) + "</button>"
                   : '<button class="rd-slot is-empty" type="button" data-action="dslot" data-arg="' + i + '" aria-label="Place libre"><span>+</span></button>';
      }
      html += "</div>";
      html += '<p class="game-small rd-hint">' + (swapK ? "Touche le dé du deck à remplacer par <b>" + esc(T[swapK].name) + '</b>. <button class="rd-link" type="button" data-action="noswap">Annuler</button>'
        : S.deck.length < 5 ? "Touche un écureuil pour l'ajouter au deck (" + S.deck.length + "/5)." : "Touche un dé du deck pour l'enlever, ou un écureuil pour voir sa fiche.") + "</p>";
      // la grille des écureuils
      html += '<div class="rd-pick">';
      D.ORDER.forEach(function (k) {
        var have = owned(k), lv = clsLv(k), need = copiesNeed(k), c = S.cards[k] || 0;
        html += '<button class="rd-tile r-' + T[k].rarity + (S.sel === k ? " is-sel" : "") + (S.deck.indexOf(k) >= 0 ? " in-deck" : "") + (have ? "" : " is-locked") + '" type="button" data-action="pick" data-arg="' + k + '" aria-label="' + esc(have ? T[k].name : "Écureuil inconnu") + '">' +
          dieHtml(k) + (have ? '<i class="rd-lv">' + lv + "</i>" : '<i class="rd-q">?</i>') +
          (have ? '<span class="rd-bar' + (canLevel(k) ? " is-ready" : "") + '"><b style="width:' + (isFinite(need) ? Math.min(100, c / need * 100) : 100) + '%"></b><em>' + (isFinite(need) ? c + "/" + need : "MAX") + "</em></span>" : '<span class="rd-bar is-void"></span>') +
          "</button>";
      });
      html += "</div>";
      html += detailHtml(S.sel);
      return html;
    },
    chests: function () {
      var free = S.keys >= D.KEYS_FOR_FREE;
      var html = head("Coffres", "deck", "Deck") +
        '<p class="gold-badge">' + goldIc() + " " + S.gold + " · 🗝 " + Math.min(S.keys, D.KEYS_FOR_FREE) + "/" + D.KEYS_FOR_FREE + "</p>" +
        '<p class="game-small">Chaque partie terminée donne une clé ; ' + D.KEYS_FOR_FREE + " clés ouvrent un coffre en bois gratuit. Les coffres se paient seulement en glands d'or gagnés en jouant.</p>" +
        '<div class="rd-chest-list">';
      D.CHESTS.forEach(function (c, i) {
        var isFree = chestFree(c, 1);
        html += '<div class="rd-chest" style="--cc:' + c.color + '"><img src="' + sprUrl("chest") + '" alt=""><strong>' + esc(c.name) + "</strong>" +
          "<span>" + c.cards + " écureuils" + (c.minRarity ? " · au moins 1 " + D.RARITY[c.minRarity].name.toLowerCase() : "") + "</span>" +
          '<button class="btn btn-small' + (isFree ? " btn-alt" : "") + '" type="button" data-action="open" data-arg="' + i + ':1"' + (canOpen(c, 1) ? "" : " disabled") + ">" + (isFree ? "Gratuit 🗝" : "Ouvrir " + goldIc() + " " + c.price) + "</button>" +
          '<button class="btn btn-small btn-alt rd-x10" type="button" data-action="open" data-arg="' + i + ':10"' + (canOpen(c, 10) ? "" : " disabled") + "><span>×10 · " + goldIc() + " " + chestPrice(c, 10) + '</span><small>1 coffre offert</small></button></div>';
      });
      if (Cloud.busy) html += '</div><p class="game-small">☁ Ouverture du coffre par le serveur…</p><div>';
      if (Cloud.err) html += '</div><p class="net-err">' + esc(Cloud.err) + "</p><div>";
      html += '</div><p class="game-small">Chances par écureuil : ' + Object.keys(D.RARITY).map(function (r) { return '<b style="color:' + D.RARITY[r].color + '">' + D.RARITY[r].name + "</b> " + D.RARITY[r].weight + " %"; }).join(" · ") + " (coffres en fer et doré : rares et mieux plus fréquents).</p>";
      return html;
    },
    opened: function () { return openedHtml; },
    succes: function () {
      var html = head("Succès") + '<ul class="rd-ach">';
      D.ACHIEVEMENTS.forEach(function (a) {
        html += '<li class="' + (S.ach[a.id] ? "is-done" : "") + '"><strong>' + (S.ach[a.id] ? "✔ " : "") + esc(a.name) + "</strong><span>" + esc(a.desc) + "</span><em>" + goldIc() + " " + a.gold + "</em></li>";
      });
      return html + "</ul>";
    },
    help: function () {
      return head("Règles") +
        '<ul class="rd-rules">' +
        "<li><b>Invoquer</b> pose un écureuil au hasard de ton deck (1 point) sur une case libre. Chaque invocation coûte 10 noisettes de plus.</li>" +
        "<li><b>Fusionner</b> : glisse un écureuil sur un autre <b>du même type et avec le même nombre de points</b> (ou touche l'un puis l'autre). Tu obtiens un écureuil au hasard de ton deck avec 1 point de plus (7 max).</li>" +
        "<li>Chaque point = un tir par salve, et chaque point au-delà du premier ajoute +" + Math.round(CFG.pipBonus * 100) + " % de dégâts par tir.</li>" +
        "<li>Chaque écureuil a une <b>portée</b> : touche-le (ou survole-le) pour voir son cercle. Fusionner sur une case bien placée, près du chemin, change tout.</li>" +
        "<li><b>Améliorer</b> (les 5 boutons du bas) renforce tous les écureuils de ce type pour la partie.</li>" +
        "<li>Les bestioles suivent le chemin. Si l'une d'elles atteint ta réserve de noisettes, tu perds une vie (deux pour les gros, toutes pour un boss). 3 vies.</li>" +
        "<li>Une vague sur 5 : un <b>boss</b>. Le Grand Sanglier assomme tes écureuils, le Hibou Ancien les transforme.</li>" +
        "<li><b>Coop</b> : deux plateaux l'un au-dessus de l'autre ; les bestioles descendent et montent par la gauche, se rejoignent au centre puis filent à droite entre les deux plateaux. Vies partagées, chaque bestiole vaincue rapporte des noisettes aux deux.</li>" +
        "<li><b>Versus</b> : mêmes vagues pour les deux joueurs, chacun sur son chemin. Le dernier debout gagne.</li>" +
        "<li>Clavier : <kbd>Espace</kbd> invoque, <kbd>1</kbd>…<kbd>5</kbd> améliorent, <kbd>Échap</kbd> pause.</li>" +
        "<li>Les <b>glands d'or</b> gagnés en jouant ouvrent des <b>coffres</b> : chaque coffre donne des écureuils (commun, rare, épique ou légendaire). Avec assez d'exemplaires du même écureuil, tu montes son niveau. Aucun achat avec de l'argent réel.</li>" +
        "</ul>";
    },
    pause: function () {
      return "<h2>Pause</h2><div class=\"menu-buttons\"><button class=\"btn\" type=\"button\" data-action=\"resume\">▶ Reprendre</button>" +
        '<button class="btn btn-ghost" type="button" data-action="quit">Abandonner</button></div>';
    },
    online: function () {
      if (!Cloud.on) return head("En ligne") +
        '<p>Le jeu en ligne demande un compte : chacun y joue avec la progression enregistrée sur le serveur, pas avec une sauvegarde modifiable.</p>' +
        (Cloud.loading ? '<p class="game-small">☁ Chargement de ton compte…</p>' : '<div class="menu-buttons"><button class="btn" type="button" data-action="login">Se connecter avec Google</button></div>') +
        '<p class="game-small">Le compte ne garde que ton identifiant, ton email (pour la connexion) et ta progression. <a href="confidentialite.html">Confidentialité</a>.</p>';
      return head("En ligne") +
        '<p class="game-small">Joue à 2 avec un ami : crée un salon et donne-lui le code.</p>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        '<label class="rd-field">Ton pseudo<input data-name data-focus type="text" maxlength="16" autocomplete="nickname" value="' + esc(S.name || "") + '"></label>' +
        '<div class="menu-buttons"><button class="btn" type="button" data-action="host">Créer un salon</button></div>' +
        '<div class="coop-join"><input data-code type="text" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="CODE" value="' + esc(Net.pendingCode || "") + '">' +
        '<button class="btn btn-alt" type="button" data-action="join">Rejoindre</button></div>';
    },
    lobby: function () {
      if (!Net.on) return SCREENS.online();
      var host = Net.role === "host", ok = Net.status === "SUBSCRIBED", hp = Net.roster.filter(function (x) { return x.host; })[0];
      var mode = host ? Net.mode : (hp && hp.mode) || "coop";
      var html = head("Salon", "leave", "Quitter") +
        '<div class="room-code"><span>Code du salon</span><b>' + esc(Net.code) + '</b><button class="btn btn-alt btn-small" type="button" data-action="invite">📨 Inviter</button></div>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        (!ok ? '<p class="game-small">Connexion au salon… (' + esc(Net.status || "") + ")</p>" : "") +
        '<ul class="room-players">';
      Net.roster.slice(0, 2).forEach(function (x) {
        html += "<li>" + deckStrip(x.deck || []) + "<b>" + esc(x.name || "Écureuil") + "</b>" + (x.host ? " 👑" : "") + (x.id === Net.id ? " <small>(toi)</small>" : "") + "</li>";
      });
      if (Net.roster.length < 2) html += "<li><small>En attente d'un deuxième joueur…</small></li>";
      html += "</ul>";
      html += '<p class="game-small">Mode :</p><div class="menu-row">' +
        ["coop", "versus"].map(function (m) {
          return '<button class="btn btn-small ' + (mode === m ? "" : "btn-ghost") + '" type="button" data-action="lmode" data-arg="' + m + '"' + (host ? "" : " disabled") + ">" + (m === "coop" ? "👥 Coop" : "⚔ Versus") + "</button>";
        }).join("") + "</div>";
      if (host) html += '<div class="menu-buttons"><button class="btn" type="button" data-action="start"' + (ok && Net.roster.length >= 2 ? "" : " disabled") + ">▶ Lancer la partie</button></div>";
      else html += '<p class="game-small">L\'hôte lance la partie.</p>';
      return html;
    },
    over: function () { return overHtml; },
  };
  var overHtml = "";
  function showOver(res) {
    var title;
    if (res.local) title = res.local + " gagne !";
    else if (res.mode === "versus") title = res.win ? "Victoire !" : "Défaite…";
    else title = "Fin de la partie";
    var lbOk = window.Leaderboard && Leaderboard.configured() && res.mode === "solo";
    var score = res.wave * 100 + Math.min(99, Math.floor(res.kills / 10));
    overHtml = "<h2>" + esc(title) + "</h2>" +
      (res.why ? '<p class="game-small">' + esc(res.why) + "</p>" : "") +
      '<ul class="over-stats"><li><span>Vague</span><strong>' + res.wave + (res.record ? " 🏅" : "") + "</strong></li><li><span>Bestioles</span><strong>" + res.kills + "</strong></li><li><span>Boss</span><strong>" + res.bosses + "</strong></li>" +
      '<li class="total"><span>Glands d\'or gagnés</span><strong>' + goldIc() + (res.pending ? " …" : " +" + res.gold) + "</strong></li></ul>" +
      (res.pending ? '<p class="game-small">☁ Vérification du résultat par le serveur…</p>' : "") +
      (res.saved ? '<p class="game-small">☁ Gains enregistrés sur ton compte.</p>' : "") +
      (res.cloudErr ? '<p class="net-err">' + esc(res.cloudErr) + "</p>" : "") +
      (res.key ? '<p class="game-small">🗝 +1 clé (' + Math.min(S.keys, D.KEYS_FOR_FREE) + "/" + D.KEYS_FOR_FREE + " pour un coffre gratuit)</p>" : "") +
      (res.newAch.length ? '<p class="game-small">🏆 ' + res.newAch.map(function (a) { return esc(a.name) + " (+" + a.gold + ")"; }).join(", ") + "</p>" : "") +
      (lbOk ? '<form class="submit-score" data-submit><label for="rd-name">Ton pseudo pour le classement (score ' + score + ')</label><div class="submit-row">' +
        '<input id="rd-name" name="player" type="text" maxlength="20" required value="' + esc(S.name || "") + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      '<div class="btn-row center">' + (Net.on ? '<button class="btn" type="button" data-action="tolobby">↩ Retour au salon</button>' : '<button class="btn" type="button" data-action="again">↻ Rejouer</button>') +
      '<button class="btn btn-ghost" type="button" data-action="tomenu">Menu</button></div>';
    G.lastKind = G.kind;
    lastKind = G.kind;
    show("over");
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var name = input.value.trim();
      S.name = name.slice(0, 16); save();
      btn.disabled = true; msg.textContent = "Envoi…";
      Leaderboard.submit(GAME_ID, name, score, { wave: res.wave, kills: res.kills, deck: S.deck.join(",") }).then(function (r) {
        msg.textContent = "Envoyé ! Tu es " + (r && r.rank ? r.rank + "ᵉ" : "dans le classement") + ".";
        document.querySelectorAll('[data-leaderboard="' + GAME_ID + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
      }).catch(function (err) { msg.textContent = Leaderboard.message(err); btn.disabled = false; });
    });
  }
  var lastKind = "solo";
  function toMenu() { state = "menu"; G = null; hud.hidden = true; paused = false; show("menu"); }
  var ACTIONS = {
    go: function (a) { SND.click(); show(a); },
    solo: function () { SND.click(); soloGame(); },
    bot: function () { SND.click(); botGame(); },
    botlvl: function (a) { S.botLvl = +a; save(); SND.click(); show("menu"); },
    botgo: function (a) { S.botLvl = +a === 2 ? 2 : 1; save(); SND.click(); botGame(); },
    fs: function () { if (isFull()) exitFull(); else enterFull(); setTimeout(function () { if (state === "menu" && screen === "menu") show("menu", true); }, 300); },
    lcoop: function () { SND.click(); localCoop(); },
    lvs: function () { SND.click(); localVs(); },
    online: function () { SND.click(); Net.err = ""; show(Net.on ? "lobby" : "online"); },
    deck: function (k) {
      if (!owned(k)) return;
      var i = S.deck.indexOf(k);
      if (i >= 0) S.deck.splice(i, 1); else if (S.deck.length < 5) S.deck.push(k);
      swapK = null; save(); pushDeck(); SND.click(); show("deck", true);
    },
    pick: function (k) {
      S.sel = k;
      if (swapK) swapK = null;
      if (owned(k) && S.deck.indexOf(k) < 0 && S.deck.length < 5) { S.deck.push(k); SND.summon(); pushDeck(); } else SND.click();
      save(); show("deck", true);
    },
    dslot: function (a) {
      var i = +a, k = S.deck[i];
      if (swapK) { if (k) S.deck[i] = swapK; else if (S.deck.indexOf(swapK) < 0) S.deck.push(swapK); swapK = null; save(); pushDeck(); SND.summon(); show("deck", true); return; }
      if (k) { S.deck.splice(i, 1); S.sel = k; save(); pushDeck(); SND.click(); show("deck", true); }
    },
    swap: function (k) { swapK = k; SND.click(); show("deck", true); },
    noswap: function () { swapK = null; show("deck", true); },
    lvup: function (k) {
      if (!canLevel(k) || Cloud.busy) return;
      if (Cloud.on) {
        Cloud.busy = true;
        window.SiteAuth.rpc("rd_level_up", { p_type: k }).then(function (p) { applyServer(p); SND.merge(4); })
          .catch(function (err) { Cloud.err = window.SiteAuth.message(err); resync(); })
          .then(function () { Cloud.busy = false; show("deck", true); Cloud.err = ""; });
        return;
      }
      S.gold -= lvCost(k); S.cards[k] -= copiesNeed(k); S.cls[k] = clsLv(k) + 1;
      save(); SND.merge(4); show("deck", true);
    },
    open: function (a) {
      var parts = String(a).split(":"), c = D.CHESTS[+parts[0]], n = +parts[1] === 10 ? 10 : 1;
      if (!c || !canOpen(c, n)) return;
      if (Cloud.on) {
        Cloud.busy = true;
        // la séquence commence tout de suite, pendant que le serveur fait le tirage
        chestFx(c, window.SiteAuth.rpc("rd_open_chests", { p_chest: c.id, p_n: n }).then(function (r) {
          applyServer(r.profile); Cloud.busy = false;
          var order = (r.order || []).slice().sort(function (x, y) { return RORD.indexOf(T[x].rarity) - RORD.indexOf(T[y].rarity); });
          return { got: r.got, order: order };
        }, function (err) { Cloud.busy = false; resync(); throw err; }), n);
        return;
      }
      if (chestFree(c, n)) S.keys -= D.KEYS_FOR_FREE;
      else S.gold -= chestPrice(c, n);
      chestFx(c, Promise.resolve(openChest(c, n)), n);
    },
    resume: function () { togglePause(); },
    admgold: function (a) { adminCall("rd_admin_gold", { p_amount: +a }, "+" + a + " glands d'or ajoutés."); },
    admunlock: function () { adminCall("rd_admin_unlock", { p_copies: 20 }, "Tous les écureuils débloqués, +20 exemplaires chacun."); },
    login: function () { if (window.SiteAuth) window.SiteAuth.signIn().catch(function (err) { Cloud.err = window.SiteAuth.message(err); refreshScreen(); }); },
    testgold: function () { if (!DEBUG || Cloud.on) return; S.gold += 5000; save(); SND.pu(); show("menu"); },
    quit: function () {
      paused = false;
      if (G) { var w = G.panels[0].world; finish({ mode: G.mode, wave: w.wave, kills: w.kills, bosses: w.bosses, maxPip: maxPip(w), win: false, why: "Partie abandonnée.", local: G.kind === "local-vs" ? "Personne ne" : null, bot: G.kind === "bot" }); }
    },
    again: function () { SND.click(); ({ solo: soloGame, bot: botGame, "local-coop": localCoop, "local-vs": localVs }[lastKind] || soloGame)(); },
    tomenu: function () { SND.click(); if (Net.on) netLeave(); toMenu(); },
    tolobby: function () { SND.click(); state = "menu"; G = null; hud.hidden = true; Net.started = false; trackMe(); show("lobby"); },
    host: function () { if (!readName()) return; var code = ""; for (var i = 0; i < 4; i++) code += CODE_CH[(Math.random() * CODE_CH.length) | 0]; netJoin(code, true); show("lobby"); },
    join: function () {
      if (!readName()) return;
      var inp = card.querySelector("[data-code]"), code = (inp ? inp.value : "").toUpperCase().replace(/[^A-Z]/g, "");
      if (code.length !== 4) { Net.err = "Le code fait 4 lettres."; show("online"); return; }
      netJoin(code, false); show("lobby");
    },
    leave: function () { netLeave(); Net.err = ""; show("menu"); },
    lmode: function (m) { if (Net.role !== "host") return; Net.mode = m; trackMe(); SND.click(); show("lobby"); },
    start: function () { hostStart(); },
    invite: function () {
      var url = location.origin + location.pathname + "#salon=" + Net.code, txt = "Rejoins-moi sur Écureuil Dice ! Code : " + Net.code;
      if (navigator.share) navigator.share({ title: "Écureuil Dice", text: txt, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(txt + " " + url).then(function () { Net.err = "Lien copié !"; show("lobby"); });
    },
  };
  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    var fn = ACTIONS[b.dataset.action];
    if (fn) fn(b.dataset.arg);
  });
  function readName() {
    var inp = card.querySelector("[data-name]"), name = (inp ? inp.value : S.name || "").trim();
    if (name.length < 2) { Net.err = "Choisis un pseudo d'au moins 2 caractères."; show("online"); return false; }
    S.name = name.slice(0, 16); save();
    if (Cloud.on && window.SiteAuth.profile && window.SiteAuth.profile.pseudo !== S.name) window.SiteAuth.setPseudo(S.name).catch(function () {});
    return true;
  }

  /* =====================================================================
     En ligne : Supabase Realtime (diffusion + présence, aucune table)
     Coop : l'hôte simule tout, l'invité envoie ses actions.
     Versus : chacun simule son monde et envoie un instantané ~4×/s.
     ===================================================================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var Net = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, status: "", roster: [], mode: "coop", err: "", started: false };
  function netSend(ev, payload) { if (Net.ch) { try { Net.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (Net.client) return Net.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    Net.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 30 } } });
    return Net.client;
  }
  function netJoin(code, asHost) {
    var cl = sbClient();
    if (!cl) { Net.err = "Le jeu en ligne est indisponible (Supabase non chargé)."; show("online"); return; }
    netLeave();
    Net.on = true; Net.role = asHost ? "host" : "guest"; Net.code = code; Net.status = "connexion"; Net.err = ""; Net.started = false; Net.roster = []; Net.ts = Date.now();
    var ch = cl.channel("rd-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: Net.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["start", "s", "cmd", "end", "vs", "dead"].forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { showError(err); } }); });
    ch.subscribe(function (status) {
      Net.status = status;
      if (status === "SUBSCRIBED") trackMe();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") Net.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      if (state === "menu" && screen === "lobby") show("lobby");
    });
    Net.ch = ch;
  }
  function netLeave() {
    if (Net.ch) { try { Net.ch.untrack(); } catch (e) {} try { Net.client.removeChannel(Net.ch); } catch (e) {} }
    Net.ch = null; Net.on = false; Net.role = null; Net.started = false; Net.roster = [];
  }
  function trackMe() {
    if (!Net.ch) return;
    Net.ch.track({ id: Net.id, name: (S.name || "Écureuil").slice(0, 16), host: Net.role === "host", mode: Net.mode, deck: S.deck, cls: myCls(), ingame: Net.started, ts: Net.ts });
  }
  function onPresence() {
    if (!Net.ch) return;
    var st = Net.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    Net.roster = list;
    var host = list.filter(function (x) { return x.host; })[0];
    if (Net.role === "guest" && !Net.started) {
      var idx = list.map(function (x) { return x.id; }).indexOf(Net.id);
      if (idx >= 2) { Net.err = "Salon plein (2 joueurs max)."; netLeave(); show("online"); return; }
      if (host && host.ingame) Net.err = "Une partie est déjà en cours dans ce salon.";
    }
    if (Net.started && G && state === "play") {
      var other = G.otherId, still = list.some(function (x) { return x.id === other; });
      if (!still) {
        if (G.kind === "net-vs") { var me = G.sims[0]; finish({ mode: "versus", wave: me.wave, kills: me.kills, bosses: me.bosses, maxPip: maxPip(me), win: true, online: true, why: "Ton adversaire a quitté la partie." }); }
        else if (Net.role === "guest") { var w = G.panels[0].world; finish({ mode: "coop", wave: w.wave, kills: w.kills, bosses: w.bosses, maxPip: maxPip(w), why: "L'hôte a quitté la partie." }); }
        else banner("Ton coéquipier est parti");
      }
    }
    if (state === "menu" && screen === "lobby") show("lobby");
  }
  function hostStart() {
    if (Net.role !== "host" || Net.roster.length < 2) return;
    var roster = Net.roster.slice(0, 2).map(function (x) { return { id: x.id, name: x.name, deck: x.deck, cls: x.cls }; });
    var info = { mode: Net.mode, seed: (Math.random() * 1e9) | 0, roster: roster };
    netSend("start", info);
    startOnline(info);
  }
  function startOnline(info) {
    Net.started = true; Net.acc = 0;
    var meI = info.roster.map(function (x) { return x.id; }).indexOf(Net.id);
    if (meI < 0) return;
    var other = info.roster[1 - meI];
    var boards = info.roster.map(function (x) { return { id: x.id, name: x.name, deck: x.deck, cls: x.cls }; });
    if (info.mode === "coop") {
      var w = K.createWorld({ mode: "coop", seed: info.seed, boards: boards, view: Net.role !== "host" });
      var cfg = { mode: "coop", kind: "net-coop", panels: [{ world: w, mine: [meI], view: Net.role !== "host" }], sims: Net.role === "host" ? [w] : [] };
      newGame(cfg);
    } else {
      var mine = K.createWorld({ mode: "versus", seed: info.seed, boards: [boards[meI]] });
      var opp = K.createWorld({ mode: "versus", seed: info.seed, boards: [boards[1 - meI]], view: true });
      newGame({ mode: "versus", kind: "net-vs", sims: [mine], panels: [{ world: mine, mine: [0] }, { world: opp, mine: [], view: true, opp: true, seed: 9 }] });
    }
    G.otherId = other.id;
    trackMe();
  }
  function netTick(dt) {
    if (!Net.started || !G) return;
    Net.acc += dt;
    if (G.kind === "net-coop" && Net.role === "host") {
      if (Net.acc < 1 / 8) return;
      Net.acc = 0;
      netSend("s", K.snapshot(G.sims[0], G.outEv.splice(0, 60)));
    } else if (G.kind === "net-vs") {
      if (Net.acc < 1 / 4) return;
      Net.acc = 0;
      var evs = G.vsEv || []; G.vsEv = [];
      netSend("vs", K.snapshot(G.sims[0], evs));
    }
  }
  function onNet(ev, d) {
    if (!d) return;
    if (ev === "start" && Net.role === "guest") { if (G && state === "play") return; startOnline(d); return; }
    if (!G || !Net.started) return;
    if (ev === "cmd" && Net.role === "host" && G.kind === "net-coop") { K.act(G.sims[0], 1, d); return; }
    if (ev === "s" && Net.role === "guest" && G.kind === "net-coop") {
      var p = G.panels[0];
      K.applySnap(p.world, d);
      handleEvents(p, d.v || [], true);
      return;
    }
    if (ev === "end" && Net.role === "guest" && state === "play") {
      var w = G.panels[0].world, r = d.r || {};
      finish({ mode: "coop", wave: r.wave || w.wave, kills: r.kills || w.kills, bosses: r.bosses || w.bosses, maxPip: maxPip(w) });
      return;
    }
    if (ev === "vs" && G.kind === "net-vs") {
      var op = G.panels[1];
      K.applySnap(op.world, d);
      handleEvents(op, (d.v || []).filter(function (e) { return e.k === "kill" || e.k === "boom" || e.k === "bolt"; }), false);
      return;
    }
    if (ev === "dead" && G.kind === "net-vs" && state === "play") {
      var me = G.sims[0];
      G.panels[1].world.over = true;
      finish({ mode: "versus", wave: me.wave, kills: me.kills, bosses: me.bosses, maxPip: maxPip(me), win: true, online: true, why: "Ton adversaire est tombé à la vague " + d.w + "." });
    }
  }

  /* =====================================================================
     Plein écran
     ===================================================================== */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { var b = document.querySelector("[data-game-fullscreen]"); if (b) b.textContent = isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran"; resize(); }
  function enterFull() {
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (e) { fallback(); } } else fallback();
  }
  function exitFull() {
    stage.classList.remove("is-max");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    syncFull();
  }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () { if (isFull()) exitFull(); else enterFull(); });
  $("[data-exit-max]").addEventListener("click", exitFull);
  $("[data-fs-exit]").addEventListener("click", exitFull);

  function showError(err) {
    if (showError.done) return; showError.done = true;
    if (window.console) console.error(err);
    overlay.hidden = false;
    card.innerHTML = "<h2>Oups</h2><p>Le jeu a rencontré une erreur. Recharge la page.</p><p class=\"game-small\">" + esc(err && err.message || err) + "</p>";
  }

  // outil de test : dice.html?debug expose l'état dans la console
  if (/[?&]debug\b/.test(location.search)) window.RD_DEBUG = { get G() { return G; }, view: view, get S() { return S; }, get Cloud() { return Cloud; }, setSpeed: function (v) { speed = v; } };

  /* ---------- démarrage ---------- */
  if (window.SiteAuth) { window.SiteAuth.ready.then(cloudStart); window.SiteAuth.on(cloudStart); }
  var m = /salon=([A-Za-z]{4})/.exec(location.hash);
  if (m) { Net.pendingCode = m[1].toUpperCase(); show("online"); } else show("menu");
  hud.hidden = true;
  resize(); syncHud();
  requestAnimationFrame(frame);
})();
