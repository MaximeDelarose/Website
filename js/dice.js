/* =========================================================================
   Écureuil Dice — interface : rendu, commandes, menus, sauvegarde, en ligne
   Données : js/dice-data.js · moteur : js/dice-core.js
   Sprites des ennemis : js/game-data.js (Écureuil Survivor)
   ========================================================================= */
(function () {
  "use strict";
  var VERSION = "0.12.1";
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
    return { map: "clairiere", coopMap: "carrefour2", gold: 0, deck: D.START_DECK.slice(), cls: {}, owned: {}, have: null, cards: {}, keys: 0, chests: 0, sel: "noisette",
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
    if (Cloud.on) { LOCAL.mute = S.mute; LOCAL.botLvl = S.botLvl; LOCAL.sel = S.sel; LOCAL.name = S.name; LOCAL.map = S.map; LOCAL.coopMap = S.coopMap; }
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
  if (!D.MAPS.some(function (m) { return m.id === S.map; })) S.map = D.MAPS[0].id;
  if (!D.COOP_MAPS.some(function (m) { return m.id === S.coopMap; })) S.coopMap = D.COOP_MAPS[0].id;

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
    if (Net.on) trackMe(); // salon en ligne : l'autre joueur voit le nouveau deck
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
  var SQ = {}, ICON = {}, EMB = {};
  var sqRows = ES.SPRITES.sq_noisette.frames;
  D.ORDER.forEach(function (k) {
    SQ[k] = sqRows.map(function (f) { return sprite(f, T[k].fur); });
    EMB[k] = sprite(T[k].emblem.rows, T[k].emblem.pal);
    ICON[k] = T[k].icon ? sprite(T[k].icon.rows, T[k].icon.pal) : EMB[k];
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
    var w = K.createWorld({ mode: "solo", map: S.map, seed: (Math.random() * 1e9) | 0, boards: [{ name: S.name || "Toi", deck: S.deck, cls: myCls() }] });
    newGame({ mode: "solo", kind: "solo", sims: [w], panels: [{ world: w, mine: [0] }] });
  }
  function botGame() {
    var seed = (Math.random() * 1e9) | 0, lvl = S.botLvl || 1;
    var botDeck = shuffle(D.ORDER.slice()).slice(0, 5), botCls = {};
    D.ORDER.forEach(function (k) { botCls[k] = lvl === 2 ? 4 : 1; });
    var me = K.createWorld({ mode: "versus", map: S.map, seed: seed, boards: [{ name: S.name || "Toi", deck: S.deck, cls: myCls() }] });
    var bot = K.createWorld({ mode: "versus", map: S.map, seed: seed, boards: [{ name: lvl === 2 ? "IA coriace" : "IA", deck: botDeck, cls: botCls, bot: true }] });
    newGame({ mode: "versus", kind: "bot", bot: true, botLvl: lvl, sims: [me, bot], panels: [{ world: me, mine: [0] }, { world: bot, mine: [], opp: true, seed: 9 }] });
  }
  function localCoop() {
    var w = K.createWorld({ mode: "coop", map: S.coopMap, seed: (Math.random() * 1e9) | 0,
      boards: [{ name: "Joueur 2", deck: S.deck, cls: myCls() }, { name: "Joueur 1", deck: S.deck, cls: myCls() }] });
    // même écran : le joueur 2 est en face (plateau du haut, écureuils et commandes à l'envers)
    newGame({ mode: "coop", kind: "local-coop", sims: [w], panels: [{ world: w, mine: [0, 1], flipB: [0] }] });
  }
  function localVs() {
    var seed = (Math.random() * 1e9) | 0;
    var a = K.createWorld({ mode: "versus", map: S.map, seed: seed, boards: [{ name: "Joueur 1", deck: S.deck, cls: myCls() }] });
    var b = K.createWorld({ mode: "versus", map: S.map, seed: seed, boards: [{ name: "Joueur 2", deck: S.deck, cls: myCls() }] });
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

  var renderErr = 0;
  function render() {
    var dpr = window.devicePixelRatio || 1;
    // état du dessin remis à zéro à chaque image : une erreur ne peut pas laisser un découpage ou une transparence bloqués
    if (ctx.reset) ctx.reset(); else if (renderErr) { canvas.width = canvas.width; renderErr = 0; }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!G) { drawMenuBg(dpr); return; }
    var s = view.scale * dpr;
    G.panels.forEach(function (p) {
      ctx.setTransform(s, 0, 0, s, (view.ox + p.ox * view.scale) * dpr, (view.oy + p.oy * view.scale) * dpr);
      if (p.flip) { ctx.translate(p.world.lay.w, p.world.lay.h); ctx.rotate(Math.PI); }
      if (G.shake > 0.3 && !p.opp && !REDUCED) ctx.translate(Math.round((Math.random() - 0.5) * 2 * G.shake), Math.round((Math.random() - 0.5) * 2 * G.shake));
      ctx.save();
      try { drawPanel(p); } catch (err) { renderErr++; if (renderErr < 3 && window.console) console.error(err); }
      ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
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
    // décor fixe pré-rendu (sol, chemin, emplacements, arbres…) puis éléments animés
    ctx.drawImage(bakeMap(p), 0, 0, lay.w, lay.h);
    drawAmbient(p);
    (lay.deco || []).forEach(function (d) { if (d.k === "O") drawPortal(d.x, d.y, G.t); });
    drawBumpers(p);
    lay.paths.forEach(function (pth, i) {
      if (i && pth.pts[pth.pts.length - 1].join() === lay.paths[0].pts[lay.paths[0].pts.length - 1].join()) return;
      var s1 = pth.pts[pth.pts.length - 1];
      for (var hI = 0; hI < CFG.lives; hI++) if (hI < w.lives) drawSpr(SPR.nut[0], s1[0] - 9 + hI * 6, s1[1] - 12);
    });
    // plateaux
    w.boards.forEach(function (b, bi) { drawBoard(p, b, bi); });
    drawRange(p);
    // pièges
    w.mines.forEach(function (m) {
      var q = K.posAt(lay, m.dist, m.lane), x = q.x, y = q.y;
      if (m.t < m.fly && m.x0 !== undefined) { var f = m.t / m.fly; x = m.x0 + (q.x - m.x0) * f; y = m.y0 + (q.y - m.y0) * f - Math.sin(f * Math.PI) * 14; }
      drawSpr(SPR.pinecone[0], x - 3.5, y - 4);
    });
    drawClouds(p); drawHoles(p);
    // ennemis (du plus loin au plus proche pour le chevauchement)
    var list = w.enemies.slice().sort(function (a, b2) { return a.dist - b2.dist; });
    list.forEach(function (e) {
      var q = K.epos(w, e);
      if (e._lx !== undefined && Math.hypot(q.x - e._lx, q.y - e._ly) > 30 && !e.under) {
        // passage d'un portail : tourbillon au départ et à l'arrivée
        [[e._lx, e._ly], [q.x, q.y]].forEach(function (pt) {
          pushVfx(p, { k: "ring", x: pt[0], y: pt[1] - 3, r: 14, c: "#c9a0ff", d: 0.35 });
          pushVfx(p, { k: "pop", x: pt[0], y: pt[1] - 3, r: 14, c: "#b080ff", d: 0.3 });
          sparks(p, pt[0], pt[1] - 3, 6, ["#c9a0ff", "#ffffff"], 50, 0.4, 1.3);
        });
        if (!p.opp) thr("tp", 120, function () { sfx(300, 0.15, "sine", 0.04, 3); });
      }
      e._lx = q.x; e._ly = q.y;
      drawEnemy(w, e);
    });
    // projectiles (traînée + lueur propres à chaque type)
    w.projs.forEach(function (pr) { if (pr.delay <= 0) drawProj(p, pr); });
    drawOrbs(p);
    if (w.chrono > 0) drawChrono(p);
    drawVfx(p);
    drawSelLabel(p);
    drawHud(p);
  }

  function tracePaths(lay) {
    ctx.beginPath();
    lay.paths.forEach(function (pth) {
      ctx.moveTo(pth.pts[0][0], pth.pts[0][1]);
      pth.segs.forEach(function (sg) { if (sg.tp) ctx.moveTo(sg.b[0], sg.b[1]); else ctx.lineTo(sg.b[0], sg.b[1]); });
    });
  }
  function drawPortal(x, y, t) {
    var cx = x + 13, cy = y + 13;
    glow(cx, cy, 16, "#9a60ff", 0.5 + Math.sin(t * 4) * 0.15);
    for (var i = 0; i < 3; i++) {
      ctx.strokeStyle = ["#5a2a8a", "#9a60ff", "#e0c8ff"][i]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, 10 - i * 3, 8 - i * 2.5, 0, t * (2 + i) + i, t * (2 + i) + i + 4.2); ctx.stroke();
    }
    rect(cx - 1, cy - 1, 2, 2, "#ffffff");
  }
  function drawBumpers(p) {
    var lay = p.world.lay;
    (lay.bumps || []).forEach(function (bm, bk) {
      var hitT = (G.bumpT && G.bumpT[p.world.map + bk]) || 0;
      if (hitT > 0) G.bumpT[p.world.map + bk] = Math.max(0, hitT - FDT * 5);
      var sq = Math.sin(hitT * Math.PI) * hitT, x = bm.x, y = bm.y + 4;
      ctx.fillStyle = "rgba(20,12,6,.35)"; ctx.beginPath(); ctx.ellipse(x, y + 3, 10, 3, 0, 0, 6.3); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.scale(1 + 0.35 * sq, 1 - 0.3 * sq);
      rect(-3, -5, 6, 7, "#f3e1c0"); rect(-3, -5, 1, 7, "#d8c4a0");
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -6, 11, 7.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#c8553d"; ctx.beginPath(); ctx.ellipse(0, -6, 10, 6.5, 0, Math.PI, 0); ctx.fill();
      [[-5, -8, 2], [2, -10, 1.6], [5, -7, 1.3]].forEach(function (d) { ctx.fillStyle = "#fdf3de"; ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, 6.3); ctx.fill(); });
      ctx.restore();
      if (hitT > 0) glow(x, y - 6, 18, "#ff9a7a", hitT * 0.7);
    });
  }
  /* =====================================================================
     Décor des cartes : pré-rendu une fois en haute définition (bakeMap),
     puis une couche d'ambiance animée (drawAmbient)
     ===================================================================== */
  var THEMES = {
    dirt:   { border: "#5a3a22", body: "#a87850", mid: "#bd8f62", speck: ["#8a5e3a", "#c9a070", "#7a5232", "#d8b080"] },
    water:  { border: "#24485a", body: "#3a7896", mid: "#4f93b3", speck: ["#6ab0cc", "#2f6680", "#9fd6e8"], foam: "#cfeef6" },
    mud:    { border: "#2a1c10", body: "#56402a", mid: "#664c32", speck: ["#3e2c1a", "#7a5a3a", "#4a3420"] },
    burrow: { border: "#1e140a", body: "#4a3020", mid: "#5a3a26", speck: ["#3a2616", "#6b4a30", "#8a8070"] },
    stone:  { border: "#3a3a42", body: "#8a8478", mid: "#9a9488", speck: ["#6a665e", "#b0aa9e", "#5a564e"], cobble: true },
  };
  var MAP_STYLE = {
    clairiere: { path: "dirt", amb: "pollen" }, riviere: { path: "water", amb: "water" }, sousbois: { path: "dirt", amb: "leaves", dark: 0.12 },
    terrier: { path: "burrow", amb: "dust", dark: 0.08 }, marais: { path: "mud", amb: "bubbles" }, carrefour: { path: "dirt", amb: "pollen" },
    carrefour2: { path: "dirt", amb: "pollen" }, chasse: { path: "dirt", amb: "leaves" }, portails: { path: "stone", amb: "sparkle" },
    flipper: { path: "dirt", amb: "pollen" }, damier: { path: "dirt", amb: "pollen" }, rondpoint: { path: "stone", amb: "pollen" },
  };
  function mstyle(id) { return MAP_STYLE[id] || { path: "dirt", amb: "pollen" }; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var m = function (v) { return Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); };
    return "#" + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
  }
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  function pathDist(lay, x, y) {
    var best = 1e9;
    lay.paths.forEach(function (pth) { pth.segs.forEach(function (sg) {
      if (sg.tp) return;
      var ax = sg.a[0], ay = sg.a[1], bx = sg.b[0], by = sg.b[1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      var t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d < best) best = d;
    }); });
    (lay.roads || []).forEach(function (r) { if (x > r.x - 2 && x < r.x + r.w + 2 && y > r.y - 2 && y < r.y + r.h + 2) best = 0; });
    return best;
  }
  function onCell(lay, x, y, pad) {
    pad = pad || 0;
    return lay.boards.some(function (b) { return b.cells.some(function (c) { return x > c.x - pad && x < c.x + 26 + pad && y > c.y - pad && y < c.y + 26 + pad; }); }) ||
      (lay.deco || []).some(function (d) { return x > d.x - pad && x < d.x + 26 + pad && y > d.y - pad && y < d.y + 26 + pad; });
  }
  var BAKES = {}, BK = 3;
  function bakeMap(p) {
    var w = p.world, lay = w.lay, key = lay.map + "|" + w.boards.length + "|" + lay.w + "x" + lay.h;
    if (BAKES[key]) return BAKES[key];
    var c = document.createElement("canvas"); c.width = Math.ceil(lay.w * BK); c.height = Math.ceil(lay.h * BK);
    var keep = ctx; ctx = c.getContext("2d"); ctx.scale(BK, BK); ctx.imageSmoothingEnabled = false;
    try { paintMap(lay, w.boards.length); } finally { ctx = keep; }
    return (BAKES[key] = c);
  }
  function paintMap(lay, nb) {
    var st = mstyle(lay.map), th = THEMES[st.path], rnd = seeded(lay.map), G0 = lay.ground || "#3f6b3a", W = lay.w, H = lay.h, i, x, y;
    // --- sol : dalles de teintes, mouchetis, touffes, fleurs, cailloux
    rect(0, 0, W, H, G0);
    for (y = 0; y < H; y += 13) for (x = 0; x < W; x += 13) { var v = rnd(); if (v < 0.3) rect(x, y, 13, 13, "rgba(0,0,0,.05)"); else if (v > 0.75) rect(x, y, 13, 13, "rgba(255,255,220,.035)"); }
    var gd = shade(G0, -0.18), gl = shade(G0, 0.16), gl2 = shade(G0, 0.3);
    for (i = 0; i < W * H / 14; i++) { x = Math.floor(rnd() * W); y = Math.floor(rnd() * H); rect(x, y, 1, 1, rnd() < 0.5 ? gd : gl); }
    for (i = 0; i < W * H / 70; i++) {
      x = Math.floor(rnd() * W); y = Math.floor(rnd() * H);
      if (pathDist(lay, x, y) < 10 || onCell(lay, x, y, 1)) continue;
      var tc = rnd() < 0.5 ? gl : gl2; rect(x, y, 1, 3, tc); rect(x - 1, y + 1, 1, 2, tc); rect(x + 1, y + 1, 1, 2, tc); rect(x - 1, y + 3, 3, 1, gd);
    }
    for (i = 0; i < W * H / 500; i++) {
      x = Math.floor(rnd() * W); y = Math.floor(rnd() * H);
      if (pathDist(lay, x, y) < 10 || onCell(lay, x, y, 2)) continue;
      var fc = ["#fdf3de", "#f6d36b", "#f29a85", "#c9b3ff"][Math.floor(rnd() * 4)];
      rect(x - 1, y, 3, 1, fc); rect(x, y - 1, 1, 3, fc); rect(x, y, 1, 1, "#e8873a");
    }
    // buissons et rochers dans les coins libres
    for (i = 0; i < 40; i++) {
      x = 6 + rnd() * (W - 12); y = (lay.gridY || 18) + rnd() * (lay.gridH || H - 30);
      if (pathDist(lay, x, y) < 14 || onCell(lay, x, y, 6)) continue;
      if (rnd() < 0.55) {
        ctx.fillStyle = "rgba(10,20,10,.3)"; ctx.beginPath(); ctx.ellipse(x, y + 3, 6, 2.2, 0, 0, 6.3); ctx.fill();
        [[0, 0, 4.5, shade(G0, -0.3)], [-3, 1, 3.2, shade(G0, -0.25)], [3, 1, 3.2, shade(G0, -0.25)], [-1, -1.5, 2.6, shade(G0, -0.05)], [1.5, -0.5, 1.4, gl2]].forEach(function (q) { ctx.fillStyle = q[3]; ctx.beginPath(); ctx.arc(x + q[0], y + q[1], q[2], 0, 6.3); ctx.fill(); });
      } else {
        ctx.fillStyle = "rgba(10,20,10,.3)"; ctx.beginPath(); ctx.ellipse(x, y + 2.5, 4.5, 1.8, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#6a665e"; ctx.beginPath(); ctx.ellipse(x, y, 4, 3, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#8a8478"; ctx.beginPath(); ctx.ellipse(x - 0.8, y - 0.8, 2.8, 1.8, 0, 0, 6.3); ctx.fill();
        rect(x - 2, y - 2, 1, 1, "#b0aa9e");
      }
    }
    // --- chemin : ombre, bord, corps, ornière, mouchetis, herbe qui déborde
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.save(); ctx.translate(0, 1.5); tracePaths(lay); ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 19; ctx.stroke(); ctx.restore();
    tracePaths(lay); ctx.strokeStyle = th.border; ctx.lineWidth = 18; ctx.stroke();
    tracePaths(lay); ctx.strokeStyle = th.body; ctx.lineWidth = 15; ctx.stroke();
    tracePaths(lay); ctx.strokeStyle = th.mid; ctx.globalAlpha = 0.7; ctx.lineWidth = 7; ctx.stroke(); ctx.globalAlpha = 1;
    lay.paths.forEach(function (pth) { pth.segs.forEach(function (sg) {
      if (sg.tp) return;
      var dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      for (var d = 0; d < L; d += 1.6) {
        var px = sg.a[0] + dx * d / L, py = sg.a[1] + dy * d / L;
        if (rnd() < 0.55) { var o = (rnd() - 0.5) * 13; rect(Math.round(px + nx * o), Math.round(py + ny * o), 1, 1, th.speck[Math.floor(rnd() * th.speck.length)]); }
        if (th.cobble && rnd() < 0.12) { var o2 = (rnd() - 0.5) * 10; ctx.strokeStyle = th.border; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.6; ctx.strokeRect(Math.round(px + nx * o2) - 1.5, Math.round(py + ny * o2) - 1.5, 3, 3); ctx.globalAlpha = 1; }
        if (th.foam && rnd() < 0.3) { [-6.5, 6.5].forEach(function (e) { rect(Math.round(px + nx * e), Math.round(py + ny * e), 1, 1, th.foam); }); }
        if (!th.foam && rnd() < 0.22) {
          // l'herbe déborde sur les bords du chemin
          [-8.5, 8.5].forEach(function (e) { if (rnd() < 0.5) { var gx = Math.round(px + nx * e), gy = Math.round(py + ny * e); rect(gx, gy - 1, 1, 2, gl); rect(gx + 1, gy, 1, 1, G0); } });
        }
      }
    }); });
    drawRoads(lay);
    // --- terriers de départ et réserves de glands aux sorties
    var seen = {};
    lay.paths.forEach(function (pth) {
      var s0 = pth.pts[0], k0 = s0.join(",");
      if (!seen[k0]) {
        seen[k0] = 1;
        ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(s0[0], s0[1] + 2, 12, 6, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#6b4430"; ctx.beginPath(); ctx.ellipse(s0[0], s0[1], 11, 7, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#8a5a3b"; ctx.beginPath(); ctx.ellipse(s0[0] - 1, s0[1] - 1.5, 9, 5, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#120a04"; ctx.beginPath(); ctx.ellipse(s0[0], s0[1] + 0.5, 6, 3.6, 0, 0, 6.3); ctx.fill();
        rect(s0[0] - 7, s0[1] - 6, 2, 1, "#a87850"); rect(s0[0] + 4, s0[1] - 5, 2, 1, "#a87850");
      }
      var e1 = pth.pts[pth.pts.length - 1], k1 = "e" + e1.join(",");
      if (!seen[k1]) {
        seen[k1] = 1;
        ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(e1[0], e1[1] + 4, 11, 4, 0, 0, 6.3); ctx.fill();
        drawSpr(SPR.stump[0], e1[0] - 6, e1[1] - 4);
        [[-6, 4], [5, 3], [-2, 6]].forEach(function (q) { drawSpr(SPR.acorn[0], e1[0] + q[0] - 3, e1[1] + q[1] - 3); });
      }
    });
    // --- décor des cases (arbres, flaques ou nénuphars)
    (lay.deco || []).forEach(function (d) { if (d.k === "T") drawTree(d.x, d.y); else if (d.k === "~") { drawPuddle(d.x, d.y); if (st.path === "mud") drawLily(d.x, d.y); } });
    // --- emplacements : dalles de pierre en relief (teinte du joueur en coop)
    lay.boards.forEach(function (b, bi) {
      var pc = nb > 1 ? PCOL[bi] : null;
      b.cells.forEach(function (q) {
        if (q.shared && bi > 0) return;
        var col = q.shared ? SHARED_COL : pc, base = col ? col.bg : "#8a8070", hi = col ? col.hi : "#aea490", dk = col ? col.dk : "#4e463c";
        rect(q.x + 1, q.y + 2, 26, 26, "rgba(0,0,0,.32)");
        rect(q.x, q.y, 26, 26, "#2b1709");
        rect(q.x + 1, q.y + 1, 24, 24, base);
        rect(q.x + 1, q.y + 1, 24, 2, hi); rect(q.x + 1, q.y + 1, 2, 24, hi);
        rect(q.x + 1, q.y + 23, 24, 2, dk); rect(q.x + 23, q.y + 1, 2, 24, dk);
        rect(q.x + 4, q.y + 4, 18, 18, shade(base, -0.12)); rect(q.x + 4, q.y + 4, 18, 1, shade(base, -0.25));
        for (var k = 0; k < 6; k++) rect(q.x + 5 + Math.floor(rnd() * 16), q.y + 5 + Math.floor(rnd() * 16), 1, 1, shade(base, rnd() < 0.5 ? -0.2 : 0.12));
        if (q.shared) { rect(q.x + 11, q.y + 9, 4, 8, "rgba(255,240,180,.35)"); rect(q.x + 9, q.y + 11, 8, 4, "rgba(255,240,180,.35)"); }
      });
    });
    // --- assombrissement (sous-bois, terrier) et vignettage doux
    if (st.dark) { ctx.fillStyle = "rgba(10,20,10," + st.dark + ")"; ctx.fillRect(0, 0, W, H); }
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,15,8,.42)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function drawLily(x, y) {
    ctx.fillStyle = "#5b9a4a"; ctx.beginPath(); ctx.arc(x + 16, y + 15, 3.2, 0.4, 6.0); ctx.lineTo(x + 16, y + 15); ctx.fill();
    rect(x + 8, y + 12, 2, 2, "#f29a85");
  }
  // ambiance animée propre à chaque carte
  function drawAmbient(p) {
    var lay = p.world.lay, st = mstyle(lay.map), t = G.t, W = lay.w, H = lay.h;
    var A = p.amb || (p.amb = { list: [] }), L = A.list, i;
    if (st.amb === "water") {
      // reflets qui suivent le courant
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = "#bfe6f2"; ctx.lineWidth = 1; ctx.lineCap = "round";
      lay.paths.forEach(function (pth) { pth.segs.forEach(function (sg) {
        if (sg.tp) return;
        var dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], Lg = Math.hypot(dx, dy) || 1, ux = dx / Lg, uy = dy / Lg, nx = -uy, ny = ux;
        for (var d = (t * 18) % 16; d < Lg; d += 16) {
          [-3.5, 3].forEach(function (o, j) { var dd = d + j * 7; if (dd > Lg - 3) return; var px = sg.a[0] + ux * dd + nx * o, py = sg.a[1] + uy * dd + ny * o; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ux * 4, py + uy * 4); ctx.stroke(); });
        }
      }); });
      ctx.restore();
      return;
    }
    // particules d'ambiance (pollen, feuilles, poussière, bulles, étincelles)
    var max = st.amb === "bubbles" ? 6 : st.amb === "leaves" ? 9 : 14;
    while (L.length < max) L.push(newAmb(st.amb, W, H, true));
    for (i = 0; i < L.length; i++) {
      var a = L[i]; a.t += FDT;
      if (a.t > a.d) { L[i] = newAmb(st.amb, W, H, false); continue; }
      var f = a.t / a.d, x = a.x + a.vx * a.t + Math.sin(a.t * a.w + a.ph) * a.sw, y = a.y + a.vy * a.t;
      if (st.amb === "leaves") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a.t * 2 + a.ph); rect(-1.5, -1, 3, 2, a.c); rect(-0.5, -1, 1, 1, shade(a.c, 0.3)); ctx.restore();
      } else if (st.amb === "bubbles") {
        var r = 0.5 + f * 2.2; ctx.strokeStyle = "rgba(200,180,140," + (1 - f) * 0.8 + ")"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 6.3); ctx.stroke();
      } else {
        var al = Math.sin(f * Math.PI);
        glow(x, y, st.amb === "sparkle" ? 4 : 3, a.c, al * (st.amb === "dust" ? 0.25 : 0.45));
        rect(x - 0.5, y - 0.5, 1, 1, a.c);
      }
    }
  }
  function newAmb(kind, W, H, init) {
    var r = Math.random;
    if (kind === "leaves") return { x: r() * W, y: init ? r() * H : -4, vx: 4 + r() * 6, vy: 9 + r() * 7, w: 2 + r() * 2, ph: r() * 6, sw: 4, t: 0, d: 6 + r() * 6, c: ["#c8553d", "#e8873a", "#d8a040", "#8a5a3b"][Math.floor(r() * 4)] };
    if (kind === "bubbles") {
      // sur le chemin de boue
      return { x: 3 * 26 + 13 + (r() - 0.5) * 10, y: 18 + r() * 140, vx: 0, vy: 0, w: 0, ph: 0, sw: 0, t: init ? r() : 0, d: 0.6 + r() * 0.8 };
    }
    var col = kind === "dust" ? "#d8c0a0" : kind === "sparkle" ? "#d0b0ff" : "#fff3b0";
    return { x: r() * W, y: 16 + r() * (H - 20), vx: (r() - 0.5) * 4, vy: (kind === "dust" ? -1 : -2) - r() * 2, w: 1 + r(), ph: r() * 6, sw: 2, t: init ? r() * 4 : 0, d: 4 + r() * 4, c: col };
  }

  // couleurs des joueurs en coop : en haut bleu, en bas orange ; cases partagées dorées
  var PCOL = [{ dk: "#1f3a5a", bg: "#3a6a8a", hi: "#5a8aaa", name: "bleu" }, { dk: "#6a3a1a", bg: "#a8642a", hi: "#c88a4a", name: "orange" }];
  var SHARED_COL = { dk: "#6a5010", bg: "#b08a2a", hi: "#e0b84a" };
  function playerCol(w, bi) { return w.boards.length > 1 ? PCOL[bi] : null; }
  function drawRoads(lay) {
    (lay.roads || []).forEach(function (r) {
      rect(r.x, r.y - 2, r.w, r.h + 4, "#4a3524");
      rect(r.x, r.y, r.w, r.h, "#8a6a4a");
      rect(r.x, r.y + 2, r.w, r.h - 4, "#a07c56");
      for (var x = r.x + 4; x < r.x + r.w; x += 14) rect(x, r.y + r.h / 2 - 1, 7, 2, "#e8d8b0");
      rect(r.x, r.y, r.w, 1, "#c99a6a"); rect(r.x, r.y + r.h - 1, r.w, 1, "#5a4030");
    });
  }
  function drawTree(x, y) {
    ctx.fillStyle = "rgba(20,12,6,.3)"; ctx.beginPath(); ctx.ellipse(x + 13, y + 22, 10, 3.5, 0, 0, 6.3); ctx.fill();
    rect(x + 11, y + 15, 4, 8, "#5a3a22"); rect(x + 12, y + 15, 1, 8, "#7a5232");
    [[13, 6, 9, "#2f5a2a"], [8, 11, 7, "#2f5a2a"], [18, 11, 7, "#2f5a2a"], [13, 9, 8, "#3f7a36"], [10, 7, 4, "#5b9a4a"]].forEach(function (q) {
      ctx.fillStyle = q[3]; ctx.beginPath(); ctx.arc(x + q[0], y + q[1], q[2], 0, 6.3); ctx.fill();
    });
  }
  function drawPuddle(x, y) {
    ctx.fillStyle = "#2a4a52"; ctx.beginPath(); ctx.ellipse(x + 13, y + 14, 10, 6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#4a7a82"; ctx.beginPath(); ctx.ellipse(x + 12, y + 13, 8, 4.5, 0, 0, 6.3); ctx.fill();
    rect(x + 8, y + 11, 4, 1, "#9fd0d8"); rect(x + 16, y + 15, 2, 1, "#9fd0d8");
  }
  function drawBoard(p, b, bi) {
    var o = p.world.lay.boards[bi], mine = p.mine.indexOf(bi) >= 0;
    var drag = dragOn(p, bi), sel = G.sel && G.sel.panel === p && G.sel.bi === bi ? G.sel.slot : -1;
    var from = drag ? drag.slot : sel, fl = flipped(p, bi);
    // emplacements : petites plates-formes (en coop : couleur du joueur, dorées si partagées)
    var pc = playerCol(p.world, bi); // (les plates-formes sont dans le décor pré-rendu : bakeMap)
    var nSun = 0; b.slots.forEach(function (q) { if (q && T[q.t].sun) nSun++; });
    if (nSun % 2) b.slots.forEach(function (q, i) { if (q && T[q.t].sun) { var cs = o.cells[i]; glow(cs.x + 13, cs.y + 13, 22 + Math.sin(G.t * 6) * 3, "#ffb03a", 0.55); } });
    if (b.cheerV && Math.random() < Math.abs(b.cheerV) * 0.5 && !LOWFX) {
      var cr = o.cells[(Math.random() * o.cells.length) | 0];
      pushVfx(p, { k: "txt", s: b.cheerV > 0 ? "♪" : "✕", x: cr.x + 6 + Math.random() * 14, y: cr.y + 8, c: b.cheerV > 0 ? "#f6d36b" : "#a0a0a0", d: 0.8, sz: 5 });
    }
    for (var i = 0; i < o.cells.length; i++) {
      var x = o.cells[i].x, y = o.cells[i].y;
      var sq = b.slots[i];
      if (!sq) continue;
      var lifted = drag && drag.moved && drag.slot === i;
      var tile = fl ? drawTileR : drawTile;
      if (lifted) { ctx.globalAlpha = 0.35; tile(sq, x + 1, y + 1, G.t); ctx.globalAlpha = 1; continue; }
      var drop = sq.born > 0 ? sq.born * sq.born * 160 : 0, fx = sq.fx > 0 ? sq.fx : 0;
      if (fx) sq.fx = Math.max(0, fx - FDT * 6);
      if (fx || drop) {
        // recul opposé à la cible + écrasement, puis retour
        var cx = x + 13, cy = y + 13, rk = fx * fx * 2, ang = sq.ang || 0;
        ctx.save(); ctx.translate(cx - Math.cos(ang) * rk, cy - Math.sin(ang) * rk - (fl ? -drop : drop));
        ctx.scale(1 + 0.16 * fx, 1 - 0.1 * fx); ctx.translate(-cx, -cy);
        tile(sq, x + 1, y + 1, G.t);
        ctx.restore();
        if (fx) {
          ctx.globalAlpha = fx * 0.55; rect(x + 2, y + 2, 22, 20, "#ffffff"); ctx.globalAlpha = 1;
          glow(cx + Math.cos(ang) * 11, cy + Math.sin(ang) * 11, 9 * fx + 3, PFX(sq.t).col, 0.9 * fx);
          glow(cx, cy, 16, T[sq.t].color, 0.35 * fx);
        }
      } else tile(sq, x + 1, y + 1, G.t);
      // coop : liseré de la couleur du propriétaire (damier, cases partagées)
      if (pc) { ctx.strokeStyle = pc.hi; ctx.lineWidth = 2; ctx.strokeRect(x + 0.5, y + 0.5, 25, 25); rect(x + 1, y + 23, 24, 2, pc.bg); }
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
    // cadre de la couleur du joueur autour de ses commandes (coop)
    if (pc) { var cc1 = ctrlCenter(o); rect(cc1.x - K.BW / 2 - 4, cc1.y - 31, K.BW + 8, 62, pc.dk); rect(cc1.x - K.BW / 2 - 2, cc1.y - 29, K.BW + 4, 58, pc.bg); }
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
    var pul = (G.spPulse && G.spPulse[bi]) || 0;
    if (pul > 0) { G.spPulse[bi] = Math.max(0, pul - FDT * 4); glow(nx + 14, sr.y + 10, 16, "#f6d36b", pul * 0.5); }
    text(fmt(b.sp), nx + 11, sr.y + 9.5, pul > 0.5 ? "#ffffff" : "#f6d36b", "left", 7.5 + pul * 1.6);
    if (!mine) text(b.name.slice(0, 12), nx + (K.BW - sr.w - 3) / 2, sr.y + 17, "#c9b8a0", "center", 4);
    // améliorations
    b.deck.forEach(function (k, i) {
      var r = puRect(o, i), c = K.puCost(b, i), ok = mine && isFinite(c) && b.sp >= c && !p.world.over;
      box(r.x, r.y, r.w, r.h, ok ? T[k].color : "#5a4a3a", OUT, ok ? T[k].dark : "#3a2a1a");
      ctx.drawImage(EMB[k].c, Math.round(r.x + (r.w - EMB[k].w) / 2), r.y + 2);
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

  // nuages toxiques (Spore)
  function drawClouds(p) {
    p.world.clouds.forEach(function (c, i) {
      var a = Math.min(1, c.t / 0.6, (4 - c.t) / 0.3 + 0.2) * 0.32, r = (c.r || 16) * 0.75;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      for (var k = 0; k < 4; k++) {
        var an = G.t * 0.8 + k * 1.57 + i, ox = Math.cos(an) * r * 0.35, oy = Math.sin(an) * r * 0.25;
        ctx.fillStyle = k % 2 ? "#7fae4a" : "#9cd06a"; ctx.beginPath(); ctx.arc(c.x + ox, c.y - 2 + oy, r * 0.62, 0, 6.3); ctx.fill();
      }
      ctx.restore();
      glow(c.x, c.y - 2, r, "#7fbe3a", Math.max(0, a) * 0.35);
      if (Math.random() < 0.08 && !LOWFX) pushVfx(p, { k: "spark", x: c.x + (Math.random() - 0.5) * r, y: c.y - 2, vx: 0, vy: -12, g: 0, c: "#c8e88a", d: 0.6, sz: 1.3, add: true });
    });
  }
  // trous noirs : disque sombre, anneau violet qui tourne, particules aspirées
  function drawHoles(p) {
    p.world.holes.forEach(function (h) {
      var a = Math.min(1, h.t / 0.4, (3 - h.t) / 0.25 + 0.1), r = 9 * Math.max(0.2, a);
      glow(h.x, h.y - 3, 26 * a, "#6a3aff", 0.55 * a);
      ctx.save(); ctx.translate(h.x, h.y - 3);
      ctx.fillStyle = "#05050a"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1.5;
      for (var k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? "#c9a0ff" : "#9a60ff"; ctx.globalAlpha = 0.8 * a;
        ctx.beginPath(); ctx.arc(0, 0, r + 2 + k * 3, G.t * (5 - k) + k * 2, G.t * (5 - k) + k * 2 + 2.4); ctx.stroke();
      }
      ctx.restore();
      if (!LOWFX && Math.random() < 0.5) {
        var an = Math.random() * 6.3, d = 24;
        pushVfx(p, { k: "spark", x: h.x + Math.cos(an) * d, y: h.y - 3 + Math.sin(an) * d, vx: -Math.cos(an) * d * 3, vy: -Math.sin(an) * d * 3, g: 0, c: "#c9a0ff", d: 0.3, sz: 1.2, add: true });
      }
    });
  }
  // orbes du Satellite
  function drawOrbs(p) {
    var w = p.world;
    w.boards.forEach(function (b, bi) {
      b.slots.forEach(function (sq, si) {
        if (!sq || !T[sq.t].orbit) return;
        var c = K.slotCenter(w.lay, bi, si);
        ctx.save(); ctx.strokeStyle = "rgba(191,208,255,.18)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(c.x, c.y, 26, 0, 6.3); ctx.stroke(); ctx.restore();
        var sp = 2.2 + 0.55 * (sq.p - 1);
        for (var k = 0; k < sq.p; k++) {
          for (var j = 3; j >= 1; j--) {
            var tq = K.orbPos(c, { oa: (sq.oa || 0) - j * 0.06 * sp, p: sq.p }, k);
            ctx.globalAlpha = 0.25 / j; ctx.fillStyle = "#bfd0ff"; ctx.beginPath(); ctx.arc(tq.x, tq.y, 2.5, 0, 6.3); ctx.fill();
          }
          ctx.globalAlpha = 1;
          var o = K.orbPos(c, sq, k);
          glow(o.x, o.y, 9, "#ffe46b", 0.7);
          ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(o.x, o.y, 3.6, 0, 6.3); ctx.fill();
          ctx.fillStyle = "#ffe46b"; ctx.beginPath(); ctx.arc(o.x, o.y, 2.8, 0, 6.3); ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(o.x - 0.8, o.y - 0.8, 1.1, 0, 6.3); ctx.fill();
        }
      });
    });
  }
  // Chronos : voile bleuté et aiguilles qui tournent lentement
  function drawChrono(p) {
    var lw = p.world.lay, a = Math.min(0.14, p.world.chrono * 0.4);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#4a7a9a"; ctx.fillRect(0, 15, lw.w, lw.h - 15);
    ctx.globalAlpha = a * 1.6; ctx.strokeStyle = "#c8d8e8"; ctx.lineWidth = 2; var cx = lw.w / 2, cy = lw.h / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(G.t * 0.5) * 30, cy + Math.sin(G.t * 0.5) * 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(G.t * 0.06) * 20, cy + Math.sin(G.t * 0.06) * 20); ctx.stroke();
    ctx.restore();
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
    if (Tp.target === "none" && sq.t !== "mine" && !Tp.cloud && !Tp.hole) {
      // soutien : on montre les cases voisines concernées
      if (!Tp.haste && !Tp.boost) return;
      var ob = p.world.lay.boards[it.bi];
      ob.nb[it.slot].forEach(function (j) {
        var c = ob.cells[j];
        ctx.strokeStyle = Tp.boost ? "rgba(242,154,133,.95)" : "rgba(156,208,106,.9)"; ctx.lineWidth = 1.5; ctx.strokeRect(c.x + 1, c.y + 1, 24, 24);
      });
      return;
    }
    var r = K.rangeOf(sq.t, p.world);
    if (!isFinite(r)) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 15, p.world.lay.w, p.world.lay.h - 15); ctx.clip();
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(253,243,222,.08)"; ctx.fill();
    ctx.strokeStyle = Tp.color; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();
  }

  // un dé-écureuil : oreilles, frimousse, gros emblème du rôle au centre, points en bas
  function drawTile(sq, x, y, t, noPips) {
    var Tp = T[sq.t], fur = Tp.fur, em = EMB[sq.t];
    // oreilles (dépassent en haut)
    [x + 2, x + 17].forEach(function (ex) { rect(ex, y - 2, 5, 4, OUT); rect(ex + 1, y - 1, 3, 3, fur.d); rect(ex + 2, y, 1, 2, fur.t); });
    // corps du dé
    rect(x, y, 24, 24, OUT);
    rect(x + 1, y + 1, 22, 22, Tp.dark);
    rect(x + 1, y + 1, 22, 20, Tp.color);
    rect(x + 2, y + 2, 20, 1, "rgba(255,255,255,.3)");
    // frimousse : deux yeux aux coins
    rect(x + 3, y + 4, 2, 2, OUT); rect(x + 19, y + 4, 2, 2, OUT);
    rect(x + 3, y + 4, 1, 1, "#fdf3de"); rect(x + 19, y + 4, 1, 1, "#fdf3de");
    // emblème du rôle, sur un médaillon sombre pour le contraste
    var cy = noPips ? y + 12 : y + 10;
    ctx.fillStyle = "rgba(20,12,6,.28)"; ctx.beginPath(); ctx.arc(x + 12, cy, 7.2, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(em.c, Math.round(x + 12 - em.w / 2), Math.round(cy - em.h / 2));
    // écureuil du Farceur : petit chapeau à grelots ; Sangsue : gouttes de sa croissance
    if (Tp.sun) { var lit = sq.sunOn !== false; glow(x + 12, y + 10, 14, lit ? "#ffd34a" : "#806040", lit ? 0.35 : 0); }
    if (sq.jk) { rect(x + 8, y - 4, 8, 3, OUT); rect(x + 9, y - 3, 3, 2, "#c86ad8"); rect(x + 12, y - 3, 3, 2, "#f6d36b"); rect(x + 7, y - 5, 2, 2, "#f6d36b"); rect(x + 15, y - 5, 2, 2, "#c86ad8"); }
    if (sq.stk) { var nd = Math.min(5, Math.ceil(sq.stk / 10)); for (var di = 0; di < nd; di++) rect(x + 21, y + 20 - di * 3, 2, 2, "#ff5a6a"); }
    // points (le « dé »), sur une ligne en bas
    if (!noPips && sq.p) {
      var n = sq.p, w = n * 3 + 1, sx = Math.round(x + 12 - w / 2);
      rect(sx, y + 17, w, 5, OUT);
      for (var i = 0; i < n; i++) rect(sx + 1 + i * 3, y + 18, 2, 3, n >= 7 ? "#f6d36b" : "#fdf3de");
    }
    if (sq.stun > 0) {
      ctx.fillStyle = "rgba(30,25,40,.55)"; ctx.fillRect(x + 1, y + 1, 22, 22);
      text("ZZ", x + 12, y + 7 + Math.sin((t || 0) * 6), "#c9b3ff", "center", 6);
    }
    if (sq.grow !== undefined && sq.grow > 0) {
      var f = Math.max(0, 1 - sq.grow / (Tp.grow || 16));
      rect(x + 2, y + 22.5, 20, 1, "#2b1709"); rect(x + 2, y + 22.5, 20 * f, 1, "#9cd06a");
    }
  }
  // vignette d'une carte : sol, décor, chemin, emplacements
  var thumbCache = {};
  function mapThumb(id) {
    if (thumbCache[id]) return thumbCache[id];
    var coop = isCoopMap(id), lay = K.layout(coop ? 2 : 1, id);
    var full = bakeMap({ world: { lay: lay, boards: lay.boards.map(function () { return {}; }) } });
    var y0 = Math.max(0, (lay.gridY - 2) * BK), h = (lay.gridH + 4) * BK, c = document.createElement("canvas");
    c.width = full.width; c.height = h; c.getContext("2d").drawImage(full, 0, y0, full.width, h, 0, 0, full.width, h);
    return (thumbCache[id] = c.toDataURL());
  }
  function curMap() { return K.mapById(S.map); }
  function isCoopMap(id) { return D.COOP_MAPS.some(function (m) { return m.id === id; }); }
  function mapCells(id) {
    var c = isCoopMap(id), l = K.layout(c ? 2 : 1, id);
    if (!c) return l.boards[0].cells.length;
    var sh = (l.twins || []).length;
    return "2 × " + (l.boards[0].cells.length - sh) + (sh ? " + " + sh + " partagées" : "");
  }
  // la même image en HTML (menus, deck, coffres)
  var faceCache = {};
  function faceUrl(k) {
    if (faceCache[k]) return faceCache[k];
    var c = document.createElement("canvas"); c.width = 24; c.height = 26;
    var keep = ctx; ctx = c.getContext("2d");
    try { drawTile({ t: k, p: 0, stun: 0 }, 0, 2, 0, true); } finally { ctx = keep; }
    return (faceCache[k] = c.toDataURL());
  }
  // étiquette « nom · rôle » au-dessus de l'écureuil sélectionné
  function drawSelLabel(p) {
    if (!G.sel || G.sel.panel !== p || Object.keys(G.drag).length) return;
    var sq = p.world.boards[G.sel.bi] && p.world.boards[G.sel.bi].slots[G.sel.slot]; if (!sq) return;
    var Tp = T[sq.t], c = K.slotCenter(p.world.lay, G.sel.bi, G.sel.slot), label = Tp.name + " · " + Tp.role;
    font(5.5); var w = ctx.measureText(label).width + 8, h = 10;
    var bx = Math.max(2, Math.min(p.world.lay.w - w - 2, c.x - w / 2)), by = c.y - 13 - h - 2;
    if (by < 16) by = c.y + 15;
    if (flipped(p, G.sel.bi)) { ctx.save(); ctx.translate(bx + w / 2, by + h / 2); ctx.rotate(Math.PI); ctx.translate(-(bx + w / 2), -(by + h / 2)); }
    rect(bx, by, w, h, OUT); rect(bx + 1, by + 1, w - 2, h - 2, Tp.color);
    text(label, bx + w / 2, by + h / 2 + 0.5, "#fdf3de", "center", 5.5);
    if (flipped(p, G.sel.bi)) ctx.restore();
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
    var sqz = e.flash > 0 ? Math.min(1, e.flash / 0.08) : 0;
    if (e.d.boss) {
      ctx.save(); ctx.translate(q.x, q.y + 4); ctx.scale(1.3 * (1 + 0.12 * sqz), 1.3 * (1 - 0.1 * sqz)); ctx.translate(-fr.w / 2, -fr.h);
      drawSpr(fr, 0, 0, q.dx < 0, e.flash > 0); ctx.restore();
      y = q.y + 4 - fr.h * 1.3;
    } else if (sqz) {
      ctx.save(); ctx.translate(q.x, q.y + 4); ctx.scale(1 + 0.25 * sqz, 1 - 0.18 * sqz); ctx.translate(-q.x, -(q.y + 4));
      drawSpr(fr, x, y, q.dx < 0, true); ctx.restore();
    } else drawSpr(fr, x, y, q.dx < 0, false);
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

  /* ---------- effets visuels : lueurs additives (bloom), étincelles, éclairs, explosions ---------- */
  // qualité adaptative : si l'appareil peine (images lentes), on coupe les lueurs des petites étincelles
  var FDT = 1 / 60, GLOWC = {}, AVGDT = 1 / 60, LOWFX = false;
  function glowTex(col) {
    if (GLOWC[col]) return GLOWC[col];
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.25, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (GLOWC[col] = c);
  }
  function glow(x, y, r, col, a) {
    if (a <= 0.01 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(glowTex(col), x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // apparence des projectiles et impacts par type
  var PFXT = {
    noisette: { col: "#f2b05e", core: "#fff3d0", sz: 2.5, trail: 4 },
    braise: { col: "#ff7a2a", core: "#fff3b0", sz: 3, trail: 7, ember: "#ffb04a" },
    givre: { col: "#9fd8ff", core: "#ffffff", sz: 2.5, trail: 6, shard: true },
    vent: { col: "#bff5ea", core: "#ffffff", sz: 1.5, trail: 8, streak: true },
    pepite: { col: "#ffd34a", core: "#fff8d0", sz: 2.5, trail: 4 },
    ronce: { col: "#9cd06a", core: "#e6ffd0", sz: 2, trail: 5, shard: true },
    venin: { col: "#8be04a", core: "#e6ffb0", sz: 3, trail: 5, ember: "#7fbe3a" },
    eclair: { col: "#ffe46b", core: "#ffffff", sz: 2.5, trail: 3, spark: true },
    mine: { col: "#e8873a", core: "#fff3b0", sz: 2, trail: 3 },
    croc: { col: "#fdf3de", core: "#ffffff", sz: 2, trail: 5, shard: true },
    echo: { col: "#a8d8f0", core: "#ffffff", sz: 2, trail: 6 },
    pie: { col: "#5fd0ff", core: "#ffffff", sz: 2.5, trail: 5, shard: true },
    bucheron: { col: "#e8e0d0", core: "#ffffff", sz: 3, trail: 4 },
    lune: { col: "#f6d36b", core: "#ffffff", sz: 2.5, trail: 6 },
    graine: { col: "#9cd06a", core: "#ffffff", sz: 2, trail: 3 },
    blizzard: { col: "#bfe8ff", core: "#ffffff", sz: 3, trail: 7, shard: true },
    cameleon: { col: "#f29a85", core: "#ffffff", sz: 2.5, trail: 5 },
    orage: { col: "#d0c0ff", core: "#ffffff", sz: 2.5, trail: 3 },
    comete: { col: "#ff8a2a", core: "#fff3b0", sz: 5, trail: 12, ember: "#ffd34a" },
    mitraille: { col: "#e8e0d0", core: "#ffffff", sz: 1.5, trail: 4 },
    herisson: { col: "#e8c8a0", core: "#ffffff", sz: 2, trail: 3, shard: true },
    glandlourd: { col: "#d39a52", core: "#fff3d0", sz: 3.5, trail: 5 },
    lancepierre: { col: "#c8c0b0", core: "#ffffff", sz: 2.5, trail: 9, streak: true },
    resine: { col: "#f2a83a", core: "#ffe0a0", sz: 3, trail: 5, ember: "#c88a2a" },
    spore: { col: "#9cd06a", core: "#e6ffb0", sz: 2, trail: 3 },
    tornade: { col: "#e0f0f8", core: "#ffffff", sz: 2.5, trail: 10, streak: true },
    banquier: { col: "#f2c230", core: "#fff8d0", sz: 2.5, trail: 4 },
    picvert: { col: "#ff6a5a", core: "#ffffff", sz: 2, trail: 14, streak: true },
    stalactite: { col: "#bfe8ff", core: "#ffffff", sz: 3, trail: 6, shard: true },
    damocles: { col: "#e8e8f0", core: "#ffffff", sz: 2.5, trail: 7, shard: true },
    farceur: { col: "#e08ae8", core: "#fff3b0", sz: 2.5, trail: 5, ember: "#f6d36b" },
    sangsue: { col: "#ff5a6a", core: "#ffd0d0", sz: 2.5, trail: 6 },
    jumeau: { col: "#8ae8b8", core: "#ffffff", sz: 2.5, trail: 5 },
    boomerang: { col: "#f2d48a", core: "#ffffff", sz: 3, trail: 6, spin: true },
    satellite: { col: "#ffe46b", core: "#ffffff", sz: 3, trail: 3 },
    phenix: { col: "#ff6a2a", core: "#fff3b0", sz: 3.5, trail: 10, ember: "#ffd34a" },
    trounoir: { col: "#9a60ff", core: "#ffffff", sz: 3, trail: 6 },
    chronos: { col: "#a8d8f0", core: "#ffffff", sz: 2.5, trail: 6 },
    midas: { col: "#ffd34a", core: "#fffbe0", sz: 3, trail: 6, ember: "#f2c230" },
  };
  function PFX(t) { return PFXT[t] || { col: T[t] ? T[t].color : "#fff", core: "#fff", sz: 2, trail: 4 }; }
  function drawProj(p, pr) {
    var f = PFX(pr.t), tr = pr.tr || (pr.tr = []);
    tr.push(pr.x, pr.y); if (tr.length > f.trail * 2) tr.splice(0, 2);
    // traînée
    if (tr.length >= 4) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (var i = 2; i < tr.length; i += 2) {
        var a = i / tr.length;
        ctx.strokeStyle = f.col; ctx.globalAlpha = a * (f.streak ? 0.9 : 0.6); ctx.lineWidth = f.sz * (f.streak ? 0.8 : 1.4) * a + 0.4;
        ctx.beginPath(); ctx.moveTo(tr[i - 2], tr[i - 1]); ctx.lineTo(tr[i], tr[i + 1]); ctx.stroke();
      }
      ctx.restore();
    }
    if (f.ember && Math.random() < 0.35) pushVfx(p, { k: "spark", x: pr.x, y: pr.y, vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 15, c: f.ember, d: 0.35, sz: 1.2, add: true });
    // tête
    glow(pr.x, pr.y, f.sz * 3.2, f.col, 0.75);
    if (f.spark) {
      // boule électrique qui crépite
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = f.col; ctx.lineWidth = 0.8;
      for (var j = 0; j < 3; j++) { var an = Math.random() * 6.3, l = 3 + Math.random() * 3; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + Math.cos(an) * l * 0.5 + (Math.random() - 0.5) * 2, pr.y + Math.sin(an) * l * 0.5); ctx.lineTo(pr.x + Math.cos(an) * l, pr.y + Math.sin(an) * l); ctx.stroke(); }
      ctx.restore();
    }
    if (pr.t === "noisette") drawSpr(SPR.miniacorn[0], pr.x - 2.5, pr.y - 2.5);
    else if (f.spin) {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(G.t * 22 * (pr.ret ? -1 : 1));
      ctx.fillStyle = OUT; ctx.fillRect(-4, -1.5, 8, 3); ctx.fillRect(-1.5, -4, 3, 8);
      ctx.fillStyle = f.col; ctx.fillRect(-3.5, -1, 7, 2); ctx.fillRect(-1, -3.5, 2, 7); ctx.restore();
    }
    else if (f.shard && tr.length >= 4) {
      var dx = pr.x - tr[tr.length - 4], dy = pr.y - tr[tr.length - 3], an2 = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(an2); ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.moveTo(f.sz + 2, 0); ctx.lineTo(-f.sz - 1, f.sz * 0.7 + 0.6); ctx.lineTo(-f.sz - 1, -f.sz * 0.7 - 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = f.core; ctx.beginPath(); ctx.moveTo(f.sz + 1, 0); ctx.lineTo(-f.sz, f.sz * 0.6); ctx.lineTo(-f.sz, -f.sz * 0.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y, f.sz + 0.7, 0, 6.3); ctx.fill();
      ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(pr.x, pr.y, f.sz, 0, 6.3); ctx.fill();
      ctx.fillStyle = f.core; ctx.beginPath(); ctx.arc(pr.x - f.sz * 0.25, pr.y - f.sz * 0.25, f.sz * 0.45, 0, 6.3); ctx.fill();
    }
  }
  // éclair en zigzag (recalculé à chaque image pour crépiter), avec ramifications
  function jag(pts, amp) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, n = Math.max(3, Math.round(L / 6)), nx = -dy / L, ny = dx / L;
      for (var k = 0; k < n; k++) { var t = k / n, o = k ? (Math.random() - 0.5) * 2 * amp : 0; out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]); }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function strokePath(pts) { ctx.beginPath(); pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }
  function lightning(pts, col, w, a, amp) {
    var path = jag(pts, amp || 3);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = a * 0.35; ctx.strokeStyle = col; ctx.lineWidth = w * 4; strokePath(path);
    ctx.globalAlpha = a; ctx.lineWidth = w * 1.4; strokePath(path);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(0.6, w * 0.6); strokePath(path);
    // ramifications
    ctx.strokeStyle = col; ctx.lineWidth = w * 0.7; ctx.globalAlpha = a * 0.8;
    for (var i = 2; i < path.length - 1; i += 3) if (Math.random() < 0.45) {
      var q = path[i], an = Math.random() * 6.3, l = 4 + Math.random() * 7;
      strokePath(jag([q, [q[0] + Math.cos(an) * l, q[1] + Math.sin(an) * l]], 1.5));
    }
    ctx.restore();
  }
  function pushVfx(p, v) { if (G.vfx.length < 520) { v.p = p; v.t = 0; G.vfx.push(v); } }
  // tremblement de l'écran : doux et plafonné (seulement le terrain, jamais au-delà de 2,5 px)
  function shake(a) { if (!REDUCED && G) G.shake = Math.max(G.shake || 0, Math.min(2.5, a * 0.5)); }
  function sparks(p, x, y, n, cols, spd, life, sz) {
    for (var i = 0; i < n; i++) {
      var an = Math.random() * 6.3, v = (spd || 60) * (0.4 + Math.random() * 0.8);
      pushVfx(p, { k: "spark", x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 10, c: Array.isArray(cols) ? cols[i % cols.length] : cols, d: (life || 0.4) * (0.6 + Math.random() * 0.6), sz: sz || 1.5, add: true, drag: 3 });
    }
  }
  function numCount(p) { var n = 0; for (var i = 0; i < G.vfx.length; i++) if (G.vfx[i].k === "num" && G.vfx[i].p === p) n++; return n; }
  function drawVfx(p) {
    G.vfx.forEach(function (v) {
      if (v.p !== p || v.t < (v.wait || 0)) return;
      var t = v.t - (v.wait || 0), d = v.d, f = Math.min(1, t / d);
      if (v.k === "spark" || v.k === "part") {
        var dr = v.drag ? Math.exp(-v.drag * t) : 1, px = v.x + v.vx * t * dr, py = v.y + v.vy * t * dr + (v.g === undefined ? 40 : v.g) * t * t, sz = (v.sz || 2) * (1 - f * 0.6);
        if (v.add && !LOWFX) glow(px, py, sz * 2.6, v.c, (1 - f) * 0.9);
        rect(px - sz / 2, py - sz / 2, sz, sz, v.c);
      } else if (v.k === "ring") {
        var rr = v.r * (0.25 + 0.75 * (1 - Math.pow(1 - f, 3)));
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = v.c; ctx.globalAlpha = (1 - f) * 0.9; ctx.lineWidth = 2.5 * (1 - f) + 0.5;
        ctx.beginPath(); ctx.arc(v.x, v.y, rr, 0, 6.3); ctx.stroke(); ctx.restore();
      } else if (v.k === "pop") glow(v.x, v.y, v.r * (0.6 + f * 0.6), v.c, (1 - f) * (v.a || 1));
      else if (v.k === "smoke") {
        ctx.globalAlpha = (1 - f) * 0.45; ctx.fillStyle = v.c || "#6b5a4a";
        ctx.beginPath(); ctx.arc(v.x + v.vx * t, v.y - 8 * t, v.r * (0.6 + f), 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      } else if (v.k === "bolt") { if (Math.random() < 0.85) lightning(v.pts, v.c || "#ffe46b", 1.3, 1 - f * f, 3.2); }
      else if (v.k === "zap") {
        var e = p.world.emap[v.id], q = e ? K.epos(p.world, e) : v.last;
        if (q) { v.last = q; lightning([[v.x0, v.y0], [q.x, q.y - 3]], "#ffe46b", 1, 1 - f, 2.5); }
      } else if (v.k === "sword") {
        // épée de Damoclès : tombe du ciel puis se plante
        var fall = Math.min(1, t / 0.16), sy = 16 + (v.y - 26 - 16) * fall * fall, al = f > 0.6 ? (1 - f) / 0.4 : 1;
        ctx.save(); ctx.globalAlpha = al; ctx.translate(Math.round(v.x), Math.round(sy));
        rect(-2, -22, 5, 22, OUT); rect(-1, -21, 3, 21, "#e8e8f0"); rect(0, -21, 1, 21, "#ffffff");
        rect(-5, -1, 11, 3, OUT); rect(-4, 0, 9, 1, "#c8a040"); rect(-1, 2, 3, 5, OUT); rect(0, 2, 1, 4, "#8a5a3b"); rect(-1, 7, 3, 2, "#c8a040");
        ctx.restore();
        if (fall < 1) glow(v.x, sy - 10, 12, "#ffffff", 0.5 * al);
      } else if (v.k === "nova") {
        var nr = v.r * (0.3 + 0.7 * (1 - Math.pow(1 - f, 2)));
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = v.c; ctx.globalAlpha = (1 - f) * 0.8; ctx.lineWidth = 1.2;
        for (var sp2 = 0; sp2 < 16; sp2++) { var a2 = sp2 / 16 * 6.283 + v.rot; ctx.beginPath(); ctx.moveTo(v.x + Math.cos(a2) * nr * 0.55, v.y + Math.sin(a2) * nr * 0.55); ctx.lineTo(v.x + Math.cos(a2) * nr, v.y + Math.sin(a2) * nr); ctx.stroke(); }
        ctx.restore();
      } else if (v.k === "sky") lightning([[v.x + v.ox, 16], [v.x + v.ox * 0.4, 16 + (v.y - 16) * 0.5], [v.x, v.y - 3]], "#d0c0ff", 1.5, 1 - f * f, 3.5);
      else if (v.k === "num") {
        var pop = t < 0.08 ? 1 + (0.08 - t) * 8 : 1, yy = v.y - 10 * Math.sqrt(f) - (v.crit ? 4 : 0);
        ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
        text(v.s, v.x, yy, v.c, "center", (v.sz || 4.5) * pop);
        ctx.globalAlpha = 1;
      } else if (v.k === "txt") { ctx.globalAlpha = 1 - f * f; text(v.s, v.x, v.y - f * 10, v.c, "center", v.sz || 6); ctx.globalAlpha = 1; }
      else if (v.k === "coin") {
        var e2 = 1 - Math.pow(1 - f, 2), cx = v.x + (v.tx - v.x) * e2, cy = v.y + (v.ty - v.y) * e2 - Math.sin(f * Math.PI) * 18;
        glow(cx, cy, 5, "#f6d36b", 0.6); drawSpr(SPR.nut[0], cx - 3, cy - 3);
        if (f >= 1 && !v.done) { v.done = 1; G.spPulse = G.spPulse || {}; G.spPulse[v.bi] = 1; }
      } else if (v.k === "flash") { ctx.globalAlpha = (1 - f) * (v.a || 0.6); rect(v.x, v.y, v.w, v.h, v.c); ctx.globalAlpha = 1; }
      else if (v.k === "vignette") {
        var lw = p.world.lay; ctx.save(); ctx.globalAlpha = (1 - f) * 0.75;
        var g = ctx.createRadialGradient(lw.w / 2, lw.h / 2, Math.min(lw.w, lw.h) * 0.3, lw.w / 2, lw.h / 2, Math.max(lw.w, lw.h) * 0.75);
        g.addColorStop(0, "rgba(200,40,30,0)"); g.addColorStop(1, v.c || "rgba(200,40,30,1)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, lw.w, lw.h); ctx.restore();
      }
    });
  }
  function updVfx(dt) {
    for (var i = G.vfx.length - 1; i >= 0; i--) { var v = G.vfx[i]; v.t += dt; if (v.t >= v.d + (v.wait || 0)) G.vfx.splice(i, 1); }
    if (G.shake) G.shake = G.shake * Math.exp(-dt * 10) - dt * 0.5; if (G.shake < 0) G.shake = 0;
  }
  var ECOL = {};
  K.EKEYS.forEach(function (k) { var pal = ES.SPRITES[k].pal; ECOL[k] = Object.keys(pal).map(function (c) { return pal[c]; }); });
  function slotXY(w, bi, s) { var c = w.lay.boards[bi].cells[s] || { x: 0, y: 0 }; return { x: c.x, y: c.y }; }
  function spBox(p) {
    var bi = p.mine.length ? p.mine[p.mine.length - 1] : -1; if (bi < 0) return null;
    var o = p.world.lay.boards[bi], sr = sumRect(o), nx = sr.x + sr.w + 3;
    return { x: nx + 6, y: sr.y + 10, bi: bi };
  }
  function handleEvents(p, evs, loud) {
    var w = p.world;
    // en versus en ligne, quelques effets partent chez l'adversaire avec l'instantané
    if (G && G.kind === "net-vs" && p === G.panels[0]) {
      G.vsEv = G.vsEv || [];
      evs.forEach(function (e) { if (G.vsEv.length < 30 && (e.k === "kill" || e.k === "boom" || e.k === "bolt" || e.k === "storm")) G.vsEv.push(e); });
    }
    var hits = 0;
    evs.forEach(function (e) {
      if (e.k === "hit") {
        var f = PFX(e.t);
        if (hits++ < 14) {
          pushVfx(p, { k: "pop", x: e.x, y: e.y, r: e.crit ? 14 : 7, c: f.col, d: e.crit ? 0.22 : 0.12, a: e.crit ? 1 : 0.8 });
          sparks(p, e.x, e.y, e.crit ? 9 : 3, [f.col, f.core], e.crit ? 90 : 55, 0.3, e.crit ? 1.8 : 1.3);
          if (e.t === "givre" || e.t === "blizzard") sparks(p, e.x, e.y, 3, "#ffffff", 30, 0.5, 1);
        }
        if (e.v) addNum(p, e.x, e.y - 6, e.v, e.crit);
        if (e.crit) { shake(1); if (loud) thrCrit(); }
      } else if (e.k === "kill") {
        var cols = ECOL[e.type] || ["#fdf3de"];
        sparks(p, e.x, e.y - 3, e.boss ? 40 : 10, cols, e.boss ? 120 : 70, 0.55, 2);
        pushVfx(p, { k: "ring", x: e.x, y: e.y - 3, r: e.boss ? 40 : 12, c: "#fdf3de", d: 0.3 });
        pushVfx(p, { k: "pop", x: e.x, y: e.y - 3, r: e.boss ? 40 : 12, c: "#fff3d0", d: 0.18 });
        var box = loud && spBox(p);
        if (box && countKind(p, "coin") < 24) pushVfx(p, { k: "coin", x: e.x, y: e.y - 4, tx: box.x, ty: box.y, bi: box.bi, d: 0.55 + Math.random() * 0.15 });
        if (e.boss) { shake(6); if (loud) SND.win(); }
        if (loud) SND.kill();
      } else if (e.k === "boom") {
        var big = e.r >= 20;
        pushVfx(p, { k: "pop", x: e.x, y: e.y, r: e.r * 1.7, c: e.c, d: 0.25 });
        pushVfx(p, { k: "pop", x: e.x, y: e.y, r: e.r * 0.8, c: "#fff3d0", d: 0.12 });
        pushVfx(p, { k: "ring", x: e.x, y: e.y, r: e.r * 1.3, c: e.c, d: 0.35 });
        sparks(p, e.x, e.y, big ? 18 : 9, [e.c, "#fff3b0", "#ffb04a"], big ? 110 : 75, 0.45, 1.8);
        for (var sm = 0; sm < (big ? 5 : 3); sm++) pushVfx(p, { k: "smoke", x: e.x + (Math.random() - 0.5) * e.r, y: e.y, vx: (Math.random() - 0.5) * 10, r: 3 + Math.random() * 3, d: 0.7 + Math.random() * 0.4, wait: 0.05 });
        shake(big ? 3 : 1.5);
        if (loud) SND.boom();
      } else if (e.k === "bolt") {
        pushVfx(p, { k: "bolt", pts: e.pts.map(function (q) { return [q[0], q[1] - 3]; }), d: 0.3 });
        e.pts.forEach(function (q) { pushVfx(p, { k: "pop", x: q[0], y: q[1] - 3, r: 10, c: "#ffe46b", d: 0.18 }); sparks(p, q[0], q[1] - 3, 4, ["#ffe46b", "#ffffff"], 70, 0.3, 1.2); });
        if (loud) SND.zap();
      } else if (e.k === "zap") pushVfx(p, { k: "zap", x0: e.x0, y0: e.y0, id: e.id, d: 0.14 });
      else if (e.k === "storm" && e.t && e.t !== "orage") {
        var hc = K.slotCenter(w.lay, e.b, e.s), hr = K.rangeOf(e.t, w);
        pushVfx(p, { k: "nova", x: hc.x, y: hc.y, r: hr, c: "#e8c8a0", d: 0.3, rot: Math.random() });
        (e.pts || []).forEach(function (q) { pushVfx(p, { k: "pop", x: q[0], y: q[1] - 3, r: 7, c: "#e8c8a0", d: 0.15 }); });
        shake(0.8);
      }
      else if (e.k === "storm") {
        (e.pts || []).forEach(function (q, i) {
          pushVfx(p, { k: "sky", x: q[0], y: q[1], ox: (Math.random() - 0.5) * 30, d: 0.32, wait: i * 0.02 });
          pushVfx(p, { k: "pop", x: q[0], y: q[1] - 3, r: 11, c: "#b8a0ff", d: 0.22, wait: i * 0.02, a: 0.7 });
          sparks(p, q[0], q[1] - 3, 5, ["#d0c0ff", "#ffffff"], 80, 0.35, 1.4);
        });
        pushVfx(p, { k: "flash", x: 0, y: 15, w: w.lay.w, h: w.lay.h - 15, c: "#e9dcff", d: 0.16, a: 0.16 });
        shake(3); if (loud) { SND.zap(); SND.boom(); }
      }
      else if (e.k === "damocles") {
        pushVfx(p, { k: "sword", x: e.x, y: e.y, d: 0.7 });
        pushVfx(p, { k: "pop", x: e.x, y: e.y - 3, r: 26, c: "#ffffff", d: 0.25, wait: 0.15 });
        pushVfx(p, { k: "ring", x: e.x, y: e.y - 3, r: 26, c: "#e8e8f0", d: 0.4, wait: 0.15 });
        sparks(p, e.x, e.y - 3, 14, ["#ffffff", "#c8a040", "#e8e8f0"], 120, 0.45, 1.8);
        pushVfx(p, { k: "txt", s: "×10 !", x: e.x, y: e.y - 18, c: "#ffffff", d: 0.9, sz: 8, wait: 0.12 });
        shake(4); if (loud) SND.boom();
      } else if (e.k === "knock") {
        pushVfx(p, { k: "ring", x: e.x, y: e.y - 3, r: e.t === "tornade" ? 16 : 10, c: e.t === "tornade" ? "#e0f0f8" : "#f2c890", d: 0.3 });
        for (var kp = 0; kp < 2; kp++) pushVfx(p, { k: "smoke", x: e.x + (Math.random() - 0.5) * 6, y: e.y, vx: (Math.random() - 0.5) * 16, r: 2 + Math.random() * 2, d: 0.5, c: "#c9b8a0" });
      } else if (e.k === "pellets") {
        e.pts.forEach(function (q, i) { if (i) { pushVfx(p, { k: "pop", x: q[0], y: q[1] - 3, r: 6, c: "#e8e0d0", d: 0.12 }); sparks(p, q[0], q[1] - 3, 3, ["#e8e0d0", "#ffffff"], 50, 0.2, 1); } });
      } else if (e.k === "cloud") { var cq = K.slotCenter(w.lay, e.b, e.s); sparks(p, cq.x, cq.y - 4, 5, ["#9cd06a", "#c8e88a"], 40, 0.5, 1.4); }
      else if (e.k === "hole") { pushVfx(p, { k: "ring", x: e.x, y: e.y - 3, r: 26, c: "#9a60ff", d: 0.4 }); pushVfx(p, { k: "pop", x: e.x, y: e.y - 3, r: 20, c: "#6a3aff", d: 0.3 }); shake(2); if (loud) thr("hole", 200, function () { sfx(90, 0.4, "sine", 0.06, 0.4); }); }
      else if (e.k === "holeend") { pushVfx(p, { k: "pop", x: e.x, y: e.y - 3, r: 18, c: "#c9a0ff", d: 0.2 }); sparks(p, e.x, e.y - 3, 10, ["#9a60ff", "#ffffff"], 90, 0.35, 1.4); }
      else if (e.k === "twin") {
        var tq = slotXY(w, e.b, e.s), fq = slotXY(w, e.b, e.from);
        pushVfx(p, { k: "flash", x: tq.x + 1, y: tq.y + 1, w: 24, h: 24, c: "#bfe8d0", d: 0.4, a: 0.9 });
        sparks(p, tq.x + 13, tq.y + 13, 10, ["#8ae8b8", "#ffffff"], 70, 0.5, 1.5);
        pushVfx(p, { k: "bolt", pts: [[fq.x + 13, fq.y + 13], [tq.x + 13, tq.y + 13]], d: 0.2 });
        pushVfx(p, { k: "txt", s: "+1 !", x: tq.x + 13, y: tq.y + 2, c: "#bfe8d0", d: 0.8, sz: 6 });
      }
      else if (e.k === "teamfx" || e.k === "teamout") {
        var tc = { gift: "#ff8a7a", mail: "#f6d36b", cheer: "#ffb06a", reinf: "#5fd0ff" }[e.kind] || "#ffffff", src = K.slotCenter(w.lay, e.b, e.s);
        pushVfx(p, { k: "pop", x: src.x, y: src.y, r: 18, c: tc, d: 0.3 });
        sparks(p, src.x, src.y, 8, [tc, "#ffffff"], 70, 0.45, 1.4);
        if (e.k === "teamout") pushVfx(p, { k: "txt", s: "→ ADVERSAIRE", x: src.x, y: src.y - 14, c: tc, d: 0.9, sz: 4.5 });
        else if (e.to !== e.b) { var ob2 = w.lay.boards[e.to], dst = ctrlCenter(ob2); pushVfx(p, { k: "bolt", pts: [[src.x, src.y], [dst.x, dst.y - 40]], d: 0.3, c: tc }); }
      }
      else if (e.k === "gift") {
        var gq = slotXY(w, e.b, e.s), up = e.v > 0;
        pushVfx(p, { k: "flash", x: gq.x + 1, y: gq.y + 1, w: 24, h: 24, c: up ? "#ffd34a" : "#c8453d", d: 0.45, a: 0.85 });
        sparks(p, gq.x + 13, gq.y + 13, 10, up ? ["#ffd34a", "#ffffff"] : ["#c8453d", "#2b1709"], 70, 0.5, 1.5);
        pushVfx(p, { k: "txt", s: up ? "+1 ★" : "−1 ★", x: gq.x + 13, y: gq.y + 2, c: up ? "#ffd34a" : "#ff7a6a", d: 0.9, sz: 6.5 });
        if (!up) shake(2);
      }
      else if (e.k === "mail") { var mo = w.lay.boards[e.b]; if (mo) { pushVfx(p, { k: "txt", s: (e.v >= 0 ? "+" : "") + e.v + " 📦", x: mo.x + K.BW - 20, y: mo.cy - 2, c: e.v >= 0 ? "#f6d36b" : "#ff7a6a", d: 1.1, sz: 6 }); G.spPulse = G.spPulse || {}; G.spPulse[e.b] = 1; } }
      else if (e.k === "reinf") { var rq = slotXY(w, e.b, e.s); pushVfx(p, { k: "flash", x: rq.x + 1, y: rq.y + 1, w: 24, h: 24, c: "#5fd0ff", d: 0.45, a: 0.8 }); sparks(p, rq.x + 13, rq.y + 13, 10, ["#5fd0ff", "#ffffff"], 70, 0.5, 1.5); pushVfx(p, { k: "txt", s: "RENFORT !", x: rq.x + 13, y: rq.y + 2, c: "#5fd0ff", d: 0.9, sz: 5 }); }
      else if (e.k === "foesent") { if (loud) banner("L'adversaire t'envoie un renard !", 1100); shake(2); }
      else if (e.k === "miss") pushVfx(p, { k: "txt", s: "RATÉ", x: e.x, y: e.y - 10, c: "#c9b3ff", d: 0.5, sz: 4.5 });
      else if (e.k === "heal") { pushVfx(p, { k: "ring", x: e.x, y: e.y, r: 30, c: "#9cd06a", d: 0.45 }); sparks(p, e.x, e.y - 3, 6, "#9cd06a", 30, 0.6, 1.3); }
      else if (e.k === "merge" || e.k === "grow" || e.k === "copy") {
        var q = slotXY(w, e.b, e.s), mx = q.x + 13, my = q.y + 13, col = w.boards[e.b] && w.boards[e.b].slots[e.s] ? T[w.boards[e.b].slots[e.s].t].color : "#fdf3de";
        pushVfx(p, { k: "flash", x: q.x + 1, y: q.y + 1, w: 24, h: 24, c: "#ffffff", d: 0.3, a: 0.9 });
        pushVfx(p, { k: "ring", x: mx, y: my, r: 26, c: "#f6d36b", d: 0.4 });
        pushVfx(p, { k: "pop", x: mx, y: my, r: 26, c: col, d: 0.3 });
        sparks(p, mx, my, 14, ["#f6d36b", "#ffffff", col], 90, 0.5, 1.6);
        if (e.k === "merge") { pushVfx(p, { k: "txt", s: e.p + " ★", x: mx, y: q.y + 2, c: "#ffd34a", d: 0.8, sz: 6.5 }); shake(1.2); if (loud) SND.merge(e.p || 2); }
      } else if (e.k === "xf") { var qx = slotXY(w, e.b, e.s); pushVfx(p, { k: "flash", x: qx.x + 1, y: qx.y + 1, w: 24, h: 24, c: "#c9b3ff", d: 0.35, a: 0.8 }); sparks(p, qx.x + 13, qx.y + 13, 8, "#c9b3ff", 60, 0.5, 1.4); if (e.farce) pushVfx(p, { k: "txt", s: "?!", x: qx.x + 13, y: qx.y + 2, c: "#f6d36b", d: 0.6, sz: 6 }); }
      else if (e.k === "summon") {
        var qs = slotXY(w, e.b, e.s);
        for (var dI = 0; dI < 6; dI++) pushVfx(p, { k: "smoke", x: qs.x + 4 + dI * 4, y: qs.y + 24, vx: (dI - 2.5) * 6, r: 2 + Math.random() * 2, c: "#c9b8a0", d: 0.45, wait: 0.2 });
        pushVfx(p, { k: "ring", x: qs.x + 13, y: qs.y + 22, r: 16, c: "#fdf3de", d: 0.3, wait: 0.2 });
        if (loud) SND.summon();
      } else if (e.k === "stun") {
        var q2 = slotXY(w, e.b, e.s), sc = e.tag === "roots" ? "#9cd06a" : e.tag === "spore" ? "#e08ae8" : "#f29a85";
        pushVfx(p, { k: "txt", s: e.tag === "roots" ? "RACINES" : e.tag === "spore" ? "Zzz" : "BAM", x: q2.x + 13, y: q2.y + 6, c: sc, d: 0.8 });
        sparks(p, q2.x + 13, q2.y + 10, 6, sc, 60, 0.4, 1.5); shake(2);
        if (e.tag === "roots") pushVfx(p, { k: "flash", x: q2.x + 1, y: q2.y + 1, w: 24, h: 24, c: "#5b8a2a", d: 0.6, a: 0.7 });
      }
      else if (e.k === "swarm") { pushVfx(p, { k: "ring", x: e.x, y: e.y - 6, r: 22, c: "#f2c230", d: 0.4 }); sparks(p, e.x, e.y - 6, 8, ["#f2c230", "#2b1709"], 70, 0.4, 1.4); if (loud) banner("La Reine des guêpes appelle l'essaim !", 1100); }
      else if (e.k === "spores") { pushVfx(p, { k: "ring", x: e.x, y: e.y - 6, r: 44, c: "#e08ae8", d: 0.6 }); pushVfx(p, { k: "pop", x: e.x, y: e.y - 6, r: 30, c: "#c86ad8", d: 0.4 }); sparks(p, e.x, e.y - 6, 14, ["#e08ae8", "#9cd06a", "#ffffff"], 60, 0.7, 1.5); if (loud) banner("Le Roi Champignon répand ses spores…", 1100); }
      else if (e.k === "roots") { shake(4); pushVfx(p, { k: "ring", x: e.x, y: e.y - 6, r: 40, c: "#9cd06a", d: 0.5 }); if (loud) banner("Les racines du Golem t'agrippent !", 1100); }
      else if (e.k === "exec") { pushVfx(p, { k: "txt", s: "CROC !", x: e.x, y: e.y - 12, c: "#fdf3de", d: 0.6, sz: 5.5 }); pushVfx(p, { k: "ring", x: e.x, y: e.y - 3, r: 14, c: "#fdf3de", d: 0.25 }); }
      else if (e.k === "steal") { pushVfx(p, { k: "txt", s: "+" + e.v, x: e.x, y: e.y - 16, c: e.gold ? "#ffd34a" : "#5fd0ff", d: 0.7, sz: 5.5 }); if (e.gold) sparks(p, e.x, e.y - 4, 6, ["#ffd34a", "#fffbe0"], 60, 0.4, 1.4); }
      else if (e.k === "income") { var o = w.lay.boards[e.b]; pushVfx(p, { k: "txt", s: "+" + e.v, x: o.x + K.BW - 20, y: o.cy + 4, c: "#f6d36b", d: 1 }); G.spPulse = G.spPulse || {}; G.spPulse[e.b] = 1; }
      else if (e.k === "pu" && loud) { SND.pu(); var ob = w.lay.boards[e.b]; if (ob) { var rr = puRect(ob, e.i); sparks(p, rr.x + rr.w / 2, rr.y + 8, 10, ["#f6d36b", "#ffffff"], 60, 0.4, 1.4); pushVfx(p, { k: "pop", x: rr.x + rr.w / 2, y: rr.y + 10, r: 16, c: "#f6d36b", d: 0.25 }); } }
      else if (e.k === "leak") { pushVfx(p, { k: "vignette", d: 0.6 }); shake(5); if (loud) SND.leak(); }
      else if (e.k === "boss") { shake(4); var bd = D.ENEMIES[e.type]; if (loud && bd) setTimeout(function () { banner(bd.name + " · " + bd.powerDesc, 1600); }, 900); }
      else if (e.k === "bump") {
        G.bumpT = G.bumpT || {}; G.bumpT[w.map + e.bk] = 1;
        pushVfx(p, { k: "ring", x: e.x, y: e.y - 2, r: 18, c: "#ff9a7a", d: 0.3 });
        sparks(p, e.x, e.y - 6, 6, ["#ff9a7a", "#fdf3de"], 70, 0.35, 1.4);
        pushVfx(p, { k: "txt", s: "BOING", x: e.x, y: e.y - 14, c: "#ffd0c0", d: 0.5, sz: 4.5 });
        if (loud) thr("bump", 70, function () { sfx(220, 0.14, "square", 0.04, 2.6); });
      }
      else if (e.k === "wave" && loud) {
        if (e.boss) { banner("Vague " + e.n + " · Boss !"); SND.boss(); shake(3); }
        else { if (e.n > 1 && e.n % 5 === 1) banner("Vague " + e.n); SND.wave(); }
      }
      else if (e.k === "charge") { shake(4); if (loud) banner("Le Grand Sanglier charge !", 1200); }
      else if (e.k === "hoot" && loud) banner("Le Hibou Ancien hulule…", 1200);
    });
  }
  // chiffres de dégâts : les petits coups rapprochés sur une même bestiole s'additionnent
  function addNum(p, x, y, v, crit) {
    if (!crit) for (var i = G.vfx.length - 1; i >= 0; i--) {
      var o = G.vfx[i];
      if (o.k === "num" && o.p === p && !o.crit && o.t < 0.25 && Math.abs(o.x - x) < 9 && Math.abs(o.y - y) < 9) {
        o.v += v; o.s = fmt(o.v); o.t = 0; o.sz = Math.min(6.5, 4.2 + Math.log10(1 + o.hits++) * 2); return;
      }
    }
    if (numCount(p) >= 22) return;
    pushVfx(p, { k: "num", v: v, hits: 1, s: fmt(v) + (crit ? "!" : ""), x: x + (Math.random() - 0.5) * 6, y: y, c: crit ? "#ffd34a" : "#fdf3de", sz: crit ? 7 : 4.2, crit: crit, d: crit ? 0.8 : 0.55 });
  }
  function countKind(p, k) { var n = 0; for (var i = 0; i < G.vfx.length; i++) if (G.vfx[i].k === k && G.vfx[i].p === p) n++; return n; }
  var critT = 0;
  function thrCrit() { var n = performance.now(); if (n - critT < 90) return; critT = n; sfx(1500, 0.06, "square", 0.025, 0.7); }
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
    var dt = Math.min(0.05, (now - last) / 1000); last = now; FDT = dt;
    AVGDT += (dt - AVGDT) * 0.05; LOWFX = AVGDT > 1 / 38 ? true : AVGDT < 1 / 52 ? false : LOWFX;
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
    // dés d'équipe en versus : leurs effets partent chez l'adversaire
    (G.sims || []).forEach(function (w, wi) {
      if (!w.out || !w.out.length) return;
      var effs = w.out.splice(0);
      if (G.kind === "net-vs") effs.forEach(function (eff) { netSend("fx", eff); });
      else if (G.kind === "bot" || G.kind === "local-vs") { var o = G.sims[1 - wi]; if (o) effs.forEach(function (eff) { K.applyTeam(o, 0, eff); }); }
    });
    G.panels.forEach(function (p) {
      if (p.view) { K.stepView(p.world, dt); var ve = p.world.ev; p.world.ev = []; handleEvents(p, ve.filter(function (e) { return e.k === "hit"; }), false); return; }
      var evs = p.world.ev; p.world.ev = [];
      handleEvents(p, evs, !p.opp);
      if (Net.on && G.kind === "net-coop" && Net.role === "host") evs.forEach(function (e) { if (G.outEv.length < 60 && e.k !== "summon" && e.k !== "pu" && e.k !== "hit") G.outEv.push(e); });
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
        for (var ci = 0; ci < o.cells.length; ci++) {
          var cc0 = o.cells[ci];
          if (x >= cc0.x && x < cc0.x + K.CELL && y >= cc0.y && y < cc0.y + K.CELL) {
            // case partagée occupée par l'autre joueur : c'est son écureuil qu'on touche (s'il est à nous aussi)
            var tw = p.world.boards[bi].twins && p.world.boards[bi].twins[ci];
            if (tw && !p.world.boards[bi].slots[ci] && tw[0].slots[tw[1]]) { var obi = p.world.boards.indexOf(tw[0]); if (p.mine.indexOf(obi) >= 0) return { p: p, bi: obi, slot: tw[1] }; }
            return { p: p, bi: bi, slot: ci };
          }
        }
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
      return dieHtml(k);
    }).join("") + "</div>";
  }
  var swapK = null, openedHtml = "", lastTap = { id: "", t: 0 }, hintMsg = "";
  // double toucher maison : l'écran est redessiné à chaque toucher, le « dblclick » du navigateur ne suffit pas
  function doubleTap(id) {
    var now = performance.now(), dbl = lastTap.id === id && now - lastTap.t < 380;
    lastTap = dbl ? { id: "", t: 0 } : { id: id, t: now };
    return dbl;
  }
  function flashHint(msg) { hintMsg = msg; }
  function sprUrl(name) { return urlCache["s" + name] || (urlCache["s" + name] = SPR[name][0].c.toDataURL()); }
  function dieHtml(k) {
    return '<span class="rd-die rd-face" title="' + esc(T[k].name + " · " + T[k].role) + '"><img src="' + faceUrl(k) + '" alt=""></span>';
  }
  var TARGET = { front: "le plus avancé", strong: "le plus solide", random: "au hasard", all: "toutes les bestioles", none: "aucune (soutien)", orbit: "tout ce que ses orbes touchent" };
  function detailHtml(k) {
    var t = T[k], have = owned(k), R = D.RARITY[t.rarity], lv = clsLv(k), need = copiesNeed(k), c = S.cards[k] || 0, inDeck = S.deck.indexOf(k) >= 0;
    var mul = 1 + CFG.classBonus * (lv - 1);
    var html = '<div class="rd-detail" style="--rc:' + R.color + '">' +
      '<div class="rd-detail-head">' + dieHtml(k) + "<div><strong>" + esc(t.name) + '</strong><span class="rd-rar">' + R.name + "</span>" +
      "<small>" + esc(t.role) + (have ? " · niveau " + lv : " · pas encore trouvé") + "</small></div></div>" +
      '<p class="rd-desc">' + esc(t.desc) + "</p>";
    var stats = [];
    var dl = t.orbit ? "Dégâts par contact" : t.cloud ? "Dégâts / s du nuage" : t.hole ? "Dégâts / s (× points)" : "Dégâts par tir";
    if (t.dmg) stats.push([dl, Math.round(t.dmg * mul) + (t.pu ? " (+" + Math.round(t.pu * mul) + " par amélioration)" : "")]);
    if (t.orbit) stats.push(["Orbes", "1 par point, plus rapides à chaque point"]);
    else if (t.target !== "none" || t.cloud || t.hole) stats.push(["Cadence", (t.cloud ? "nuages" : t.hole ? "1 trou noir" : "1 salve") + " / " + String(t.every).replace(".", ",") + " s"]);
    if (!t.cloud && !t.hole) stats.push(["Cible", TARGET[t.target] || t.target]);
    if (t.target !== "none" || k === "mine" || t.cloud || t.hole) stats.push(["Portée", isFinite(K.rangeOf(k)) ? (K.rangeOf(k) / K.CELL).toFixed(1).replace(".", ",") + " cases" : "tout le chemin"]);
    else if (t.haste || t.boost) stats.push(["Portée", "les 4 cases voisines"]);
    if (t.team) stats.push(["Effet d'équipe", { gift: "à chaque fusion", mail: "colis toutes les " + t.teamEvery + " s", cheer: "en continu", reinf: "toutes les " + t.teamEvery + " s" }[t.team] + " · coop : aide l'allié · versus : gêne l'adversaire"]);
    if (t.sun) stats.push(["Impair / pair", "impair : 1 salve / " + String(t.every).replace(".", ",") + " s + explosions · pair : 1 salve / " + String(t.everyEven).replace(".", ",") + " s, " + Math.round(t.evenMul * 100) + " % des dégâts"]);
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
        '<button type="button" class="rd-mapbar" data-action="go" data-arg="maps" aria-label="Changer de carte"><img src="' + mapThumb(curMap().id) + '" alt="">' +
        '<span class="rd-mapbar-tx"><b>' + curMap().icon + " " + esc(curMap().name) + "</b><small>" + mapCells(curMap().id) + " emplacements · " + esc(curMap().spec.split(/[.:]/)[0]) + "</small></span>" +
        '<span class="rd-mapbar-go">Carte ›</span></button>' +
        '<div class="mm-main">' +
        '<button class="btn mm-play" type="button" data-action="solo"' + dis + "><span>▶ Jouer</span><small>" + esc(curMap().name) + " · record vague " + (S.best.solo || 0) + "</small></button>" +
        '<button class="btn btn-ghost mm-coop" type="button" data-action="go" data-arg="bot"' + dis + "><span>🤖 Vs l'IA</span><small>" + (S.botLvl === 2 ? "coriace" : "normale") + " · " + S.wins + " victoire" + (S.wins > 1 ? "s" : "") + "</small></button></div>" +
        '<div class="mm-grid">' +
        tile("online", "", "🌐", "En ligne", "Coop · versus", "", false, !deckOk) +
        tile("lcoop", "", "👥", "Coop à 2", esc(K.coopMapById(S.coopMap).name), "", false, !deckOk) +
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
    maps: function () {
      function card(m, on) {
          return '<button type="button" class="rd-map' + (on ? " is-on" : "") + '" data-action="mapsel" data-arg="' + m.id + '">' +
            '<img src="' + mapThumb(m.id) + '" alt="">' +
            '<span class="rd-map-tx"><b>' + m.icon + " " + esc(m.name) + "</b><small class=\"rd-map-n\">" + mapCells(m.id) + " emplacements" + (m.paths.length > 1 ? " · " + m.paths.length + " terriers" : "") + "</small>" +
            "<small>" + esc(m.spec) + "</small></span></button>";
      }
      return head("Cartes") +
        '<h3 class="rd-sec">Solo · contre l\'IA · versus</h3><div class="rd-map-list">' + D.MAPS.map(function (m) { return card(m, S.map === m.id); }).join("") + "</div>" +
        '<h3 class="rd-sec">Coop à 2 <small>(même écran ou en ligne)</small></h3><div class="rd-map-list">' + D.COOP_MAPS.map(function (m) { return card(m, S.coopMap === m.id); }).join("") + "</div>";
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
      var html = head("Deck", Net.on ? "lobby" : "menu", Net.on ? "Salon" : "Retour", '<button class="btn btn-alt btn-small" type="button" data-action="go" data-arg="chests">🎁<span class="bk-tx"> Coffres</span>' + (S.keys >= D.KEYS_FOR_FREE ? " ✨" : "") + "</button>") +
        '<p class="gold-badge rd-mini-gold">' + goldIc() + " " + S.gold.toLocaleString("fr-FR") + "</p>";
      // les 5 places du deck
      html += '<div class="rd-slots' + (swapK ? " is-swap" : "") + '">';
      for (var i = 0; i < 5; i++) {
        var dk = S.deck[i];
        html += dk ? '<button class="rd-slot' + (S.sel === dk ? " is-sel" : "") + '" type="button" data-action="dslot" data-arg="' + i + '" aria-label="' + esc(T[dk].name) + ' (double toucher pour l\'enlever du deck)">' + dieHtml(dk) + "</button>"
                   : '<button class="rd-slot is-empty" type="button" data-action="dslot" data-arg="' + i + '" aria-label="Place libre"><span>+</span></button>';
      }
      html += "</div>";
      html += '<p class="game-small rd-hint">' + (swapK ? "Touche le dé du deck à remplacer par <b>" + esc(T[swapK].name) + '</b>. <button class="rd-link" type="button" data-action="noswap">Annuler</button>'
        : hintMsg ? '<b class="rd-warn">' + esc(hintMsg) + "</b>"
        : "Touche un dé pour voir sa fiche. <b>Double-touche</b> un écureuil pour le mettre dans le deck (" + S.deck.length + "/5), ou un dé du deck pour l'enlever.") + "</p>";
      hintMsg = "";
      // la grille des écureuils
      html += '<div class="rd-pick">';
      D.ORDER.forEach(function (k) {
        var have = owned(k), lv = clsLv(k), need = copiesNeed(k), c = S.cards[k] || 0;
        html += '<button class="rd-tile r-' + T[k].rarity + (S.sel === k ? " is-sel" : "") + (S.deck.indexOf(k) >= 0 ? " in-deck" : "") + (have ? "" : " is-locked") + '" type="button" data-action="pick" data-arg="' + k + '" aria-label="' + esc(have ? T[k].name : "Écureuil inconnu") + '">' +
          dieHtml(k) + (have ? '<i class="rd-lv">' + lv + "</i>" : '<i class="rd-q">?</i>') + '<span class="rd-role">' + esc(T[k].role) + "</span>" +
          (have ? '<span class="rd-bar' + (canLevel(k) ? " is-ready" : "") + '"><b style="width:' + (isFinite(need) ? Math.min(100, c / need * 100) : 100) + '%"></b><em>' + (isFinite(need) ? c + "/" + need : "MAX") + "</em></span>" : '<span class="rd-bar is-void"></span>') +
          "</button>";
      });
      html += "</div>";
      html += detailHtml(S.sel && T[S.sel] ? S.sel : S.deck[0] || D.ORDER[0]);
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
        "<li>Une vague sur 5 : un <b>boss</b>. 5 boss à tour de rôle : le Grand Sanglier assomme tes écureuils, la Reine des guêpes appelle l'essaim, le Hibou Ancien transforme, le Roi Champignon soigne et endort, le Golem de racines (blindé) bloque 3 écureuils.</li>" +
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
        html += "<li>" + deckStrip(x.deck || []) + "<b>" + esc(x.name || "Écureuil") + "</b>" + (x.host ? " 👑" : "") + (x.id === Net.id ? " <small>(toi)</small>" : "") +
          (x.v && x.v !== VERSION ? ' <small class="rd-warn">⚠ version ' + esc(String(x.v)) + "</small>" : "") + "</li>";
      });
      var badV = Net.roster.some(function (x) { return x.v && x.v !== VERSION; });
      if (Net.roster.length < 2) html += "<li><small>En attente d'un deuxième joueur…</small></li>";
      html += "</ul>";
      if (badV) html += '<p class="net-err">Vous n\'avez pas la même version du jeu : rechargez tous les deux la page avant de jouer.</p>';
      html += '<div class="menu-row"><button class="btn btn-alt btn-small" type="button" data-action="go" data-arg="deck">🃏 Modifier mon deck</button></div>';
      html += '<p class="game-small">Mode :</p><div class="menu-row">' +
        ["coop", "versus"].map(function (m) {
          return '<button class="btn btn-small ' + (mode === m ? "" : "btn-ghost") + '" type="button" data-action="lmode" data-arg="' + m + '"' + (host ? "" : " disabled") + ">" + (m === "coop" ? "👥 Coop" : "⚔ Versus") + "</button>";
        }).join("") + "</div>";
      { var hm = mode === "versus" ? K.mapById(host ? S.map : (hp && hp.map)) : K.coopMapById(host ? S.coopMap : (hp && hp.coopMap)); html += '<p class="game-small">Carte : <b>' + hm.icon + " " + esc(hm.name) + "</b>" + (host ? ' · <button class="rd-link" type="button" data-action="go" data-arg="maps">changer</button>' : " (choisie par l'hôte)") + "</p>"; }
      if (host) html += '<div class="menu-buttons"><button class="btn" type="button" data-action="start"' + (ok && Net.roster.length >= 2 && !badV ? "" : " disabled") + ">▶ Lancer la partie</button></div>";
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
    mapsel: function (id) {
      if (isCoopMap(id)) S.coopMap = id; else if (D.MAPS.some(function (m) { return m.id === id; })) S.map = id; else return;
      save(); SND.click(); if (Net.on) { trackMe(); show("lobby"); } else show("menu"); },
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
    // grille : 1 toucher = fiche ; 2 touchers rapides = mettre dans le deck (ou l'en retirer)
    pick: function (k) {
      var dbl = doubleTap("g" + k);
      S.sel = k;
      if (swapK) swapK = null;
      if (dbl && owned(k)) {
        var i = S.deck.indexOf(k);
        if (i >= 0) { S.deck.splice(i, 1); SND.click(); pushDeck(); }
        else if (S.deck.length < 5) { S.deck.push(k); SND.summon(); pushDeck(); }
        else { SND.no(); flashHint("Deck plein : enlève d'abord un dé (2 touchers dessus), ou utilise « Remplacer »."); }
      } else SND.click();
      save(); show("deck", true);
    },
    // deck : 1 toucher = fiche ; 2 touchers rapides = l'enlever
    dslot: function (a) {
      var i = +a, k = S.deck[i];
      if (swapK) { if (k) S.deck[i] = swapK; else if (S.deck.indexOf(swapK) < 0) S.deck.push(swapK); swapK = null; save(); pushDeck(); SND.summon(); show("deck", true); return; }
      if (!k) return;
      if (doubleTap("d" + k)) { S.deck.splice(i, 1); pushDeck(); SND.click(); }
      else SND.click();
      S.sel = k; save(); show("deck", true);
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
    Net.ch.track({ id: Net.id, name: (S.name || "Écureuil").slice(0, 16), host: Net.role === "host", mode: Net.mode, map: S.map, coopMap: S.coopMap, deck: S.deck, cls: myCls(), ingame: Net.started, ts: Net.ts, v: VERSION });
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
    var info = { mode: Net.mode, map: S.map, coopMap: S.coopMap, seed: (Math.random() * 1e9) | 0, roster: roster };
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
      var w = K.createWorld({ mode: "coop", map: info.coopMap, seed: info.seed, boards: boards, view: Net.role !== "host" });
      var cfg = { mode: "coop", kind: "net-coop", panels: [{ world: w, mine: [meI], view: Net.role !== "host" }], sims: Net.role === "host" ? [w] : [] };
      newGame(cfg);
    } else {
      var mine = K.createWorld({ mode: "versus", map: info.map, seed: info.seed, boards: [boards[meI]] });
      var opp = K.createWorld({ mode: "versus", map: info.map, seed: info.seed, boards: [boards[1 - meI]], view: true });
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
    if (ev === "fx" && G.kind === "net-vs" && G.sims[0] && typeof d.k === "string") { K.applyTeam(G.sims[0], 0, { k: d.k, v: Math.min(Number(d.v) || 0, 400), neg: true }); return; }
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
