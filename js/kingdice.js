/* =========================================================================
   King Dice — rendu, commandes, écrans et jeu en ligne
   (règles : js/kingdice-core.js · dessin : js/kingdice-art.js · sons : js/kingdice-audio.js · réseau : js/kingdice-net.js)

   Quatre façons de jouer, un seul moteur :
   - Coop local     : deux joueurs sur le même écran protègent un roi commun.
   - Versus local   : chacun son roi ; les ennemis de chacun sont séparés, on s'envoie des renforts.
   - En ligne       : même chose à distance. L'hôte simule, l'invité reçoit des instantanés
                      + les événements (pour les effets) et envoie ses commandes.

   Mise en page : le plateau est dessiné dans un « monde » (unités de 72 par case) mis à l'échelle ;
   la barre du haut et les panneaux des joueurs sont dessinés en pixels écran (texte net, lisible
   sur téléphone), en bas de l'écran en portrait, sur les côtés en paysage.
   Les animations ne touchent jamais aux règles : elles lisent le monde.
   ========================================================================= */
(function () {
  "use strict";

  var K = window.KD_CORE, ART = window.KD_ART, AU = window.KD_AUDIO, NETM = window.KD_NET;
  var stage = document.querySelector("[data-kingdice]");
  if (!K || !ART || !AU || !stage) return;

  var VERSION = "2.0.0";
  var SFX = AU.SFX;
  var CFG = K.CFG;
  var TAU = ART.TAU, PCOL = ART.PCOL, INK = ART.INK, ENEMY_COL = ART.ENEMY_COL;
  var mix = ART.mix, rrect = ART.rrect, grad = ART.grad, star = ART.star, heart = ART.heart, hexA = ART.hexA, lerp = ART.lerp, clamp = ART.clamp;
  var drawPiece = ART.drawPiece, drawEnemy = ART.drawEnemy, drawKing = ART.drawKing, drawGem = ART.drawGem, drawPowerIcon = ART.drawPowerIcon, drawCrownTop = ART.drawCrownTop;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var hud = stage.querySelector("[data-hud]");
  var launchBtn = stage.querySelector("[data-kd-launch]");
  var tipEl = stage.querySelector("[data-kd-tip]");
  // polices système d'abord : nettes et sans dépendance au chargement d'une police web (le canvas ne la recharge pas)
  var FF = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  /* ====================== MONDE (unités : 72 par case) ====================== */
  var CELL = 72, BX = 298, BY = 152;            // plateau 7 × 7
  var BW = CELL * 7, BH = CELL * 7;
  var KING_X = BX + BW / 2, KING_Y = BY + BH + 138;
  var KINGS = [{ x: BX + 70 }, { x: BX + BW - 70 }];   // versus : un roi sous chaque zone
  var PORTAL_Y = BY - 44;
  var WX0 = BX - 34, WX1 = BX + BW + 34, WY0 = BY - 100, WY1 = KING_Y + 14;   // ce qui doit tenir à l'écran

  var TYPE_NAME = { rook: "Tour", bishop: "Fou", knight: "Cavalier", pawn: "Pion", queen: "Dame" };
  var TYPE_PL = { rook: "Tours", bishop: "Fous", knight: "Cavaliers", pawn: "Pions", queen: "Dames" };
  var POWER_NAME = { meteor: "Météore", freeze: "Gel", lightning: "Foudre", heal: "Soin", frenzy: "Furie", rainbow: "Arc-en-ciel" };
  var POWER_DESC = {
    meteor: "Écrase 3 lignes du couloir et repousse les ennemis.",
    freeze: "Ralentit les ennemis et les fragilise (+30 % de dégâts).",
    lightning: "Frappe les 6 ennemis les plus avancés.",
    heal: "Rend 2 ♥ au roi.",
    frenzy: "Les pièces tirent 2× plus vite quelques secondes.",
    rainbow: "Fusionne 2 pièces de même niveau, même de types différents.",
  };
  var SEND_TYPES = ["normal", "fast", "armored"];

  /* ====================== RÉGLAGES / SAUVEGARDE ====================== */
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var SET = { sfx: 0.8, music: 0.35, mute: false, fx: "full", ranges: true };
  try { var s0 = JSON.parse(load("kd-settings", "{}")); for (var k0 in s0) if (k0 in SET) SET[k0] = s0[k0]; } catch (e) {}
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches && load("kd-settings", null) == null) SET.fx = "reduced";
  function saveSet() { store("kd-settings", JSON.stringify(SET)); }
  var BEST = { score: 0, wave: 0, wins: 0 };
  try { var b0 = JSON.parse(load("kd-best", "{}")); BEST.score = Number(b0.score) || 0; BEST.wave = Number(b0.wave) || 0; BEST.wins = Number(b0.wins) || 0; } catch (e) {}
  function fxOn() { return SET.fx === "full"; }
  function fxN(n) { return fxOn() ? n : Math.max(1, Math.round(n * 0.35)); }
  AU.init(SET, function () { return !!(w && w.state === "wave"); });
  var audio = AU.audio, applyVolumes = AU.applyVolumes, startMusic = AU.startMusic, stopMusic = AU.stopMusic;

  /* ====================== ÉTAT ====================== */
  var mode = "menu";        // menu | play | pause | over
  var G = { kind: "coop", me: -1 }; // type de partie en cours : "coop" | "versus"
  var w = null;             // monde du moteur
  var ui = null;            // état d'interface par joueur
  var clock = 0;            // temps de jeu (s'arrête en pause)
  var slowmo = 0, hitstop = 0, trauma = 0, flash = 0, flashCol = "#fff";
  var parts = [], rings = [], texts = [], beams = [], circles = [], fusions = [], vshots = [], deaths = [], leakers = [], falls = [], bolts = [], rays = [];
  var pvis = {}, evis = {};
  var banner = null, killWin = { n: 0, t: 0 }, lastBigCoop = -9, kingFx = [{ hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 }, { hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 }];
  var shownScore = [0, 0], scoreBump = 0, overToken = 0;
  var hoverBtn = null, mouse = { x: -1, y: -1, in: false };
  var tuto = { on: false, step: 0 };
  var stats2 = null;
  var acc = 0, STEP = 1 / 120;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function cellX(c) { return BX + c * CELL + CELL / 2; }
  function cellY(r) { return BY + r * CELL + CELL / 2; }
  function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
  function isVs() { return G.kind === "versus"; }
  function kingPos(p) { return isVs() ? { x: KINGS[p].x, y: KING_Y } : { x: KING_X, y: KING_Y }; }

  function mkUI(i) {
    var z = CFG.zones[i];
    return { i: i, cur: { c: i === 0 ? z[1] : z[0], r: 3 }, cx: 0, cy: 0, sel: null, deny: 0, denyMsg: "", denyT: 0,
      mana: CFG.startMana, manaBump: 0, aim: false, upgFlash: [0, 0, 0, 0, 0], powerPop: 0, lastMove: -9, drag: null, readyPop: 0 };
  }

  function resetVisuals() {
    parts = []; rings = []; texts = []; beams = []; circles = []; fusions = []; vshots = []; deaths = []; leakers = []; falls = []; bolts = []; rays = [];
    pvis = {}; evis = {};
    slowmo = 0; hitstop = 0; trauma = 0; flash = 0; banner = null; killWin = { n: 0, t: 0 }; lastBigCoop = -9;
    kingFx = [{ hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 }, { hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 }];
    shownScore = [0, 0]; scoreBump = 0; acc = 0; hoverBtn = null;
  }
  function newGame(kind) {
    overToken++;
    G.kind = kind === "versus" ? "versus" : "coop";
    w = K.createWorld({ mode: G.kind });
    ui = [mkUI(0), mkUI(1)];
    ui.forEach(function (u) { u.cx = cellX(u.cur.c); u.cy = cellY(u.cur.r); u.mana = w.players[u.i].mana; });
    resetVisuals();
    stats2 = { bigCoop: 0, maxChain: 0, multi: 0 };
    // les pièces de départ apparaissent avec leur petit rebond
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var pc = w.grid[c][r]; if (pc) pv(pc).born = clock + 0.25 + c * 0.03; }
    layout();
  }

  function pv(pc) {
    var v = pvis[pc.id];
    if (!v) v = pvis[pc.id] = { born: -9, hideUntil: -9, recoil: 0, rdir: 1, cast: 0, jump: 0, sq: 0, sqv: 0, blink: rnd(1, 4), seed: Math.random() * 10, glint: 0 };
    return v;
  }
  function ev(e) {
    var v = evis[e.id];
    if (!v) {
      var jit = ((e.id * 37) % 13 - 6) * 0.9;
      var side = isVs() && e.target >= 0 ? (e.target === 0 ? -17 : 17) : 0;   // versus : chacun son côté de la case
      v = evis[e.id] = { id: e.id, type: e.type, x: cellX(e.c) + (side ? side + jit * 0.25 : jit), jit: jit, fromR: -1, toR: 0, hop: 0, hopDur: 0.42, flash: 0, sq: 0, sqv: 0, knock: 0,
        blink: rnd(1, 3), seed: Math.random() * 10, y: PORTAL_Y, born: clock, hp: e.hp, maxHp: e.maxHp, hpShown: 1, c: e.c, target: e.target, sentBy: e.sentBy };
    }
    return v;
  }

  /* ====================== MISE EN PAGE ====================== */
  var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0, TALL = false, TH = 56;
  var LP = [null, null];     // rectangles des panneaux
  var PARTS = [null, null];  // zones cliquables de chaque panneau
  var bgCanvas = document.createElement("canvas"), boardCanvas = document.createElement("canvas");

  function layout() {
    if (!W) return;
    var vs = isVs(), areaX, areaY, areaW, areaH;
    TALL = W / H < 0.95;
    if (TALL) {
      TH = 66;
      var Ph = Math.round(clamp(vs ? 214 : 172, 150, H * 0.38));
      areaX = 0; areaY = TH; areaW = W; areaH = H - TH - Ph;
      LP[0] = { x: 4, y: H - Ph + 2, w: W / 2 - 6, h: Ph - 6 };
      LP[1] = { x: W / 2 + 2, y: H - Ph + 2, w: W / 2 - 6, h: Ph - 6 };
    } else {
      TH = 56;
      var Pw = clamp((W - 470) / 2, 168, 300);
      areaX = Pw; areaY = TH; areaW = W - 2 * Pw; areaH = H - TH;
      LP[0] = { x: 6, y: TH + 2, w: Pw - 10, h: H - TH - 8 };
      LP[1] = { x: W - Pw + 4, y: TH + 2, w: Pw - 10, h: H - TH - 8 };
    }
    var ww = WX1 - WX0, wh = WY1 - WY0;
    S = Math.max(0.2, Math.min(areaW / ww, areaH / wh));
    OX = areaX + (areaW - ww * S) / 2 - WX0 * S;
    OY = areaY + (areaH - wh * S) / 2 - WY0 * S;
    PARTS[0] = panelParts(0); PARTS[1] = panelParts(1);
    stage.style.setProperty("--kd-s", clamp(S, 0.7, 1.1).toFixed(3));
    stage.style.setProperty("--kd-th", TH + "px");
    stage.classList.toggle("kd-tall", TALL);
    paintBoard();
    updateLaunch();
  }
  function scr2w(x, y) { return { x: (x - OX) / S, y: (y - OY) / S }; }
  function w2scr(x, y) { return { x: OX + x * S, y: OY + y * S }; }

  // zones d'un panneau joueur (pixels écran), utilisées pour dessiner ET pour toucher
  function panelParts(p) {
    var R = LP[p], vs = isVs(), o = { R: R }, x, y, ww, i, n = 5, gap;
    var narrow = TALL || R.w < 250;
    if (narrow) {
      x = R.x + 4; ww = R.w - 8;
      o.head = { x: R.x + 3, y: R.y + 3, w: R.w - 6, h: 26 };
      y = R.y + 33;
      o.mana = { x: x, y: y, w: ww, h: 34 }; y += 38;
      gap = 3; var bw = (ww - gap * 4) / 5;
      o.upg = []; for (i = 0; i < n; i++) o.upg.push({ x: x + i * (bw + gap), y: y, w: bw, h: 46 });
      y += 50;
      if (vs) { gap = 4; var sw = (ww - gap * 2) / 3; o.send = []; for (i = 0; i < 3; i++) o.send.push({ x: x + i * (sw + gap), y: y, w: sw, h: 38 }); y += 42; }
      o.pow = { x: x, y: y, w: ww, h: Math.min(TALL ? 999 : 120, Math.max(36, R.y + R.h - 4 - y)) };
    } else {
      var tight = R.h < 440;
      x = R.x + 8; ww = R.w - 16;
      o.head = { x: R.x + 6, y: R.y + 6, w: R.w - 12, h: tight ? 30 : 34 };
      y = R.y + (tight ? 40 : 46);
      o.mana = { x: x, y: y, w: ww, h: tight ? 44 : 52 }; y += tight ? 48 : 58;
      if (R.h >= 560) { o.info = { x: x, y: y, w: ww, h: 50 }; y += 56; }
      o.upgLabel = y + 11; y += 18;
      gap = 5; var bw2 = (ww - gap * 4) / 5, bh = tight ? 48 : 60;
      o.upg = []; for (i = 0; i < n; i++) o.upg.push({ x: x + i * (bw2 + gap), y: y, w: bw2, h: bh });
      y += bh + 8;
      if (vs) { o.sendLabel = y + 11; y += 18; gap = 6; var sw2 = (ww - gap * 2) / 3, sh = tight ? 42 : 52; o.send = []; for (i = 0; i < 3; i++) o.send.push({ x: x + i * (sw2 + gap), y: y, w: sw2, h: sh }); y += sh + 8; }
      o.pow = { x: x, y: y, w: ww, h: clamp(R.y + R.h - 8 - y, 56, 132) };
    }
    o.ready = { x: o.head.x + o.head.w - 66, y: o.head.y + 3, w: 62, h: o.head.h - 6 };
    return o;
  }
  function inRect(x, y, r) { return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  // ce qu'il y a sous un point écran (boutons des panneaux)
  function hitAt(x, y) {
    for (var p = 0; p < 2; p++) {
      var o = PARTS[p]; if (!o) continue;
      if (isVs() && inRect(x, y, o.ready)) return { k: "ready", p: p };
      for (var i = 0; i < o.upg.length; i++) if (inRect(x, y, o.upg[i])) return { k: "upg", p: p, i: i };
      if (o.send) for (i = 0; i < 3; i++) if (inRect(x, y, o.send[i])) return { k: "send", p: p, i: i };
      if (inRect(x, y, o.pow)) return { k: "pow", p: p };
      if (inRect(x, y, LP[p])) return { k: "panel", p: p };
    }
    return null;
  }
  function manaPos(p) { var m = PARTS[p] && PARTS[p].mana; return m ? scr2w(m.x + 20, m.y + m.h / 2) : { x: 0, y: 0 }; }
  function powerBox(p) { var b = PARTS[p] && PARTS[p].pow; return b ? { x: b.x, y: b.y, w: b.w, h: b.h } : { x: 0, y: 0, w: 0, h: 0 }; }

  var MAX_PARTS = 700;
  function part(o) { if (parts.length < MAX_PARTS) parts.push(o); }
  function burst(x, y, n, o) {
    n = fxN(n); o = o || {};
    for (var i = 0; i < n; i++) {
      var a = o.ang != null ? o.ang + rnd(-o.spread || -0.6, o.spread || 0.6) : rnd(0, TAU), sp = rnd(o.min || 60, o.max || 220);
      var cols = o.colors || ["#fff"];
      part({ x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: 0, max: rnd(o.life || 0.5, (o.life || 0.5) * 1.6),
        size: rnd(o.size || 4, (o.size || 4) * 1.6), color: cols[Math.floor(Math.random() * cols.length)], kind: o.kind || "dot", g: o.g == null ? 300 : o.g, drag: o.drag || 2.2, rot: rnd(0, TAU), vr: rnd(-8, 8) });
    }
  }
  function ring(x, y, r0, r1, life, color, width) { rings.push({ x: x, y: y, r0: r0, r1: r1, life: 0, max: life, color: color, width: width || 4 }); }
  function text(x, y, txt, o) {
    o = o || {};
    texts.push({ x: x, y: y, txt: txt, color: o.color || "#fff", size: o.size || 20, life: 0, max: o.life || 0.9, vy: o.vy == null ? -50 : o.vy, outline: o.outline || INK, pop: o.pop == null ? 1 : o.pop, big: o.big });
  }
  function shake(a) { if (fxOn()) trauma = Math.min(1, trauma + a); }
  function doFlash(a, col) { if (fxOn()) { flash = Math.max(flash, a); flashCol = col || "#fff"; } }
  function slow(t) { if (fxOn()) slowmo = Math.max(slowmo, t); }
  function updateFx(dt) {
    var i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      if (p.kind === "gem") {   // file vers la réserve de mana d'un joueur
        var k = clamp(p.life / p.max, 0, 1), e = easeInOut(k);
        p.x = lerp(p.x0, p.tx, e) + Math.sin(k * Math.PI) * p.cx; p.y = lerp(p.y0, p.ty, e) - Math.sin(k * Math.PI) * 60;
        if (p.life + dt >= p.max && ui) { var u = ui[p.p]; u.manaBump = 1; SFX.mana(); }
        continue;
      }
      var dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life += dt; if (rings[i].life >= rings[i].max) rings.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { var t = texts[i]; t.life += dt; t.y += t.vy * dt; t.vy *= Math.exp(-2.5 * dt); if (t.life >= t.max) texts.splice(i, 1); }
    for (i = beams.length - 1; i >= 0; i--) { beams[i].life += dt; if (beams[i].life >= beams[i].max) beams.splice(i, 1); }
    for (i = circles.length - 1; i >= 0; i--) { circles[i].life += dt; if (circles[i].life >= circles[i].max) circles.splice(i, 1); }
    for (i = rays.length - 1; i >= 0; i--) { rays[i].life += dt; if (rays[i].life >= rays[i].max) rays.splice(i, 1); }
    for (i = deaths.length - 1; i >= 0; i--) { deaths[i].t += dt; if (deaths[i].t >= 0.16) deaths.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    trauma = Math.max(0, trauma - dt * 1.8);
    flash = Math.max(0, flash - dt * 3);
  }
  function spring(o, dt, k, c) { // ressort amorti : o.sq revient à 0 en rebondissant
    var a = -k * o.sq - c * o.sqv; o.sqv += a * dt; o.sq += o.sqv * dt;
  }


  /* ====================== ÉVÉNEMENTS DU MOTEUR → EFFETS ====================== */
  function pieceMuzzle(pc) {
    var x = cellX(pc.c), y = cellY(pc.r) + CELL * 0.32, d = pc.owner === 0 ? 1 : -1;
    if (pc.type === "rook") return { x: x + d * CELL * 0.22, y: y - CELL * 0.42 };
    if (pc.type === "bishop") return { x: x, y: y - CELL * 0.8 };
    if (pc.type === "pawn") return { x: x + d * CELL * 0.28, y: y - CELL * 0.34 };
    if (pc.type === "queen") return { x: x, y: y - CELL * 1.0 };
    return { x: x + d * CELL * 0.22, y: y - CELL * 0.5 };
  }
  function enemyPos(v) { return { x: v.x, y: v.y - CELL * 0.22 * (v.type === "boss" ? 1.4 : 1) }; }

  function handleEvents() {
    var evs = w.events; w.events = [];
    var host = NET.started && NET.role === "host";
    for (var i = 0; i < evs.length; i++) {
      if (host) NET.out.push(JSON.parse(JSON.stringify(evs[i])));   // l'invité rejoue les mêmes effets
      onEvent(evs[i]);
    }
  }
  function sideCol(p) { return PCOL[p === 1 ? 1 : 0]; }
  function gemsTo(p, x, y, n) {
    var tg = manaPos(p);
    for (var i = 0; i < n; i++) part({ kind: "gem", p: p, x0: x, y0: y, x: x, y: y, tx: tg.x, ty: tg.y, cx: rnd(-30, 30), life: 0, max: rnd(0.55, 0.8), size: 7, color: PCOL[p].main });
  }

  function onEvent(e) {
    var v, x, y, u, col, i;
    switch (e.k) {
      case "summon": {
        var pc = e.piece; v = pv(pc); v.born = clock; v.sq = 0; v.sqv = 0;
        x = cellX(pc.c); y = cellY(pc.r) + CELL * 0.32;
        col = PCOL[pc.owner];
        circles.push({ x: x, y: y - 6, life: 0, max: 0.7, color: col.main, light: col.light });
        burst(x, y - 20, 14, { colors: [col.light, "#fff", "#ffe68a"], kind: "star", min: 40, max: 160, up: 120, g: -40, life: 0.6, size: 4 });
        SFX.summon();
        tutoEvent("summon");
        break;
      }
      case "fuse": {
        var into = e.into, from = e.from;
        fusions.push({ t: 0, p: e.p, from: { x: cellX(from.c), y: cellY(from.r) + CELL * 0.32, type: from.type, lvl: from.lvl },
          into: { x: cellX(into.c), y: cellY(into.r) + CELL * 0.32, type: into.type, lvl: into.lvl }, piece: e.piece, done: false, rainbow: e.rainbow });
        var fv = pv(e.piece); fv.hideUntil = clock + 0.34; fv.born = clock + 0.34; fv.fuse = true; fv.landedOnce = true;
        SFX.fuseStart();
        tutoEvent("fuse");
        break;
      }
      case "fire": {
        var p2 = e.piece; v = pv(p2);
        var ev2 = evis[e.enemy.id], m = pieceMuzzle(p2);
        var tgt = ev2 ? enemyPos(ev2) : { x: cellX(e.enemy.c), y: cellY(e.enemy.r) };
        vshots.push({ id: e.shot.id, type: p2.type, owner: p2.owner, lvl: p2.lvl, x0: m.x, y0: m.y, tx: tgt.x, ty: tgt.y, target: e.enemy.id, t: 0, dur: e.shot.dur, trailT: 0 });
        col = PCOL[p2.owner];
        if (p2.type === "rook" || p2.type === "pawn") {
          v.recoil = p2.type === "pawn" ? 0.55 : 1; v.rdir = tgt.x > cellX(p2.c) ? -1 : 1;
          burst(m.x, m.y, p2.type === "pawn" ? 2 : 3, { colors: ["#fff", col.light], min: 40, max: 120, life: 0.15, size: 3, g: 0 });
          if (p2.type === "rook") SFX.rook(); else SFX.pawn();
        } else if (p2.type === "bishop" || p2.type === "queen") {
          v.cast = 1;
          ring(m.x, m.y, 2, p2.type === "queen" ? 22 : 16, 0.25, col.light, 3);
          if (p2.type === "queen") { burst(m.x, m.y, 4, { colors: ["#ffe68a", "#fff"], kind: "star", min: 30, max: 110, life: 0.3, size: 3, g: 0 }); SFX.queen(); } else SFX.bishop();
        } else { v.jump = 1; v.sq = -0.25; v.sqv = 0; SFX.knight(); }
        break;
      }
      case "hit": {
        v = evis[e.enemy.id]; if (!v) break;
        v.flash = 1; v.hp = e.enemy.hp;
        var ep = enemyPos(v);
        col = e.p === 0 || e.p === 1 ? PCOL[e.p] : PCOL[0];
        if (e.src === "rook") { v.sq = 0.18; v.sqv = 0; v.knock = -4; burst(ep.x, ep.y, 4, { colors: ["#fff", col.light], min: 50, max: 150, life: 0.25, size: 3 }); if (!e.kill) SFX.hitRook(); }
        else if (e.src === "pawn") { v.sq = 0.1; v.sqv = 0; v.knock = -2; burst(ep.x, ep.y, 2, { colors: ["#fff", col.light], min: 30, max: 90, life: 0.2, size: 2.5 }); if (!e.kill) SFX.hitPawn(); }
        else if (e.src === "bishop") { v.sq = 0.22; v.sqv = 0; ring(ep.x, ep.y, 6, 30, 0.35, col.main, 3); burst(ep.x, ep.y, 6, { colors: [col.light, "#fffbe0"], kind: "star", min: 30, max: 120, life: 0.4, size: 3, g: 0 }); if (!e.kill) SFX.hitBishop(); }
        else if (e.src === "queen") { v.sq = 0.3; v.sqv = 0; v.knock = -5; ring(ep.x, ep.y, 6, 36, 0.35, "#ffd257", 4); burst(ep.x, ep.y, 7, { colors: ["#ffe68a", col.light, "#fff"], kind: "star", min: 40, max: 160, life: 0.4, size: 3.5, g: 0 }); if (!e.kill) SFX.hitQueen(); }
        else if (e.src === "knight") {
          v.sq = 0.5; v.sqv = 0; v.knock = -10;
          ring(ep.x, ep.y, 8, 38, 0.3, "#fff", 5);
          burst(ep.x, ep.y, 9, { colors: ["#fff", col.main, "#ffe68a"], kind: "star", min: 90, max: 260, life: 0.4, size: 4 });
          text(ep.x + rnd(-8, 8), ep.y - 26, fmt(e.dmg), { color: "#fff7c2", size: 17, life: 0.6, vy: -70 });
          shake(0.08); if (!e.kill) SFX.hitKnight();
        } else { v.sq = 0.45; v.sqv = 0; if (e.src === "lightning" && !e.kill) SFX.zapHit(); }
        break;
      }
      case "kill": {
        v = evis[e.enemy.id];
        if (v) {
          var p0 = enemyPos(v);
          deaths.push({ x: v.x, y: v.y, type: v.type, t: 0 });
          var C = ENEMY_COL[v.type];
          if (clock - killWin.t < 0.45) killWin.n++; else killWin.n = 1;
          killWin.t = clock;
          var big = killWin.n >= 2;
          burst(p0.x, p0.y, big ? 20 : 13, { colors: [C.main, C.light, "#fff"], min: 80, max: big ? 320 : 240, life: 0.5, size: big ? 6 : 5 });
          burst(p0.x, p0.y, 5, { colors: ["#fff"], kind: "star", min: 40, max: 120, life: 0.4, size: 5, g: 0 });
          ring(p0.x, p0.y, 6, big ? 52 : 36, 0.3, C.light, big ? 6 : 4);
          var owner = e.owner != null ? e.owner : -1;
          text(p0.x, p0.y - 14, "+" + e.score, { color: owner >= 0 ? PCOL[owner].light : "#fff3a6", size: v.type === "boss" ? 30 : 18, life: 0.9 });
          if (!isVs()) {
            if (killWin.n >= 3 && killWin.n <= 6) { text(p0.x, p0.y - 44, ["", "", "", "TRIPLE !", "QUADRUPLE !", "QUINTUPLE !", "MÉGA !"][killWin.n], { color: "#ffd257", size: 24, life: 1, big: true }); SFX.multi(killWin.n); stats2.multi++; shake(0.12); }
            else if (killWin.n === 2) { text(p0.x, p0.y - 44, "DOUBLE !", { color: "#ffe9a0", size: 20, life: 0.9, big: true }); SFX.multi(2); }
          }
          if (v.type === "boss") { shake(0.5); doFlash(0.5, "#fff3c0"); slow(0.4); burst(p0.x, p0.y, 40, { colors: ["#ffd257", C.light, "#fff"], kind: "star", min: 120, max: 420, life: 0.9, size: 7 }); }
          SFX.pop(killWin.n);
          // le mana file vers le(s) joueur(s) concerné(s)
          var who = isVs() ? [owner] : [0, 1];
          if (fxOn() || Math.random() < 0.4) who.forEach(function (pi) { if (pi >= 0) gemsTo(pi, p0.x, p0.y, 1); });
          else who.forEach(function (pi) { if (pi >= 0) ui[pi].manaBump = 1; });
          delete evis[e.enemy.id];
        }
        break;
      }
      case "combo": {
        v = { x: cellX(e.enemy.c), y: cellY(e.enemy.r) };
        stats2.maxChain = Math.max(stats2.maxChain, e.chain);
        var bigOne = clock - lastBigCoop > 1.4 || e.chain % 5 === 0;
        if (bigOne) {
          lastBigCoop = clock; stats2.bigCoop++;
          slow(0.32); doFlash(0.28, "#fff6dc"); shake(0.12);
          for (var pi = 0; pi < 2; pi++) { var mp = manaPos(pi); beams.push({ x0: mp.x, y0: mp.y, x1: v.x, y1: v.y - 14, life: 0, max: 0.45, color: PCOL[pi].main }); }
          for (var k = 0; k < fxN(26); k++) { var a = k / 26 * TAU * 2, sp = 90 + k * 7; part({ x: v.x, y: v.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8, size: 5, color: PCOL[k % 2].main, kind: "star", g: 0, drag: 2.5, rot: a, vr: 6 }); }
          ring(v.x, v.y - 14, 10, 90, 0.5, PCOL[0].main, 6); ring(v.x, v.y - 14, 4, 70, 0.55, PCOL[1].main, 6);
          text(KING_X, BY + BH * 0.42, "COMBO COOP !", { color: "#ffffff", size: 44, life: 1.3, vy: -18, big: true, outline: INK });
          text(KING_X, BY + BH * 0.42 + 40, (e.chain > 1 ? "×" + e.chain + "  ·  " : "") + "+" + e.mana + " mana chacun · +" + e.score, { color: "#ffe9a0", size: 20, life: 1.3, vy: -18 });
          SFX.coop(e.chain);
        } else {
          text(v.x, v.y - 50, "COOP ×" + e.chain, { color: "#ffffff", size: 18, life: 0.8, big: true });
          burst(v.x, v.y - 14, 8, { colors: [PCOL[0].main, PCOL[1].main], kind: "star", min: 60, max: 180, life: 0.45, size: 4, g: 0 });
          SFX.coopSmall();
        }
        break;
      }
      case "spawn": {
        v = ev(e.enemy); v.fromR = -1; v.toR = 0; v.hop = 0; v.hopDur = 0.5; SFX.spawn();
        burst(v.x, PORTAL_Y, 6, { colors: e.enemy.sentBy >= 0 ? [PCOL[e.enemy.sentBy].main, "#fff"] : ["#c9b6ff", "#fff"], kind: "star", min: 20, max: 90, life: 0.5, g: 0, size: 3 });
        break;
      }
      case "step": { v = evis[e.enemy.id]; if (v) { v.fromR = e.enemy.r - 1; v.toR = e.enemy.r; v.hop = 0; v.hopDur = Math.min(0.42, e.enemy.stepDur * 0.4); v.landed = false; } SFX.step(); break; }
      case "push": { v = evis[e.enemy.id]; if (v) { v.fromR = e.enemy.r + 1; v.toR = e.enemy.r; v.hop = 0; v.hopDur = 0.3; v.landed = false; v.sq = 0.4; v.sqv = 0; } break; }
      case "leak": {
        v = evis[e.enemy.id];
        var tp = e.p >= 0 ? e.p : 0;
        if (v) { leakers.push({ v: v, t: 0, dmg: e.dmg, x0: v.x, y0: v.y, p: tp }); delete evis[e.enemy.id]; }
        else kingHit(e.dmg, tp);
        break;
      }
      case "waveStart": SFX.waveStart(); showBanner("VAGUE " + e.n, e.n % 10 === 0 ? "Un Gros Pionnet arrive !" : e.total + " ennemis"); tutoEvent("wave"); break;
      case "waveEnd": {
        showBanner(e.perfect && !isVs() ? "DÉFENSE PARFAITE !" : "VAGUE " + e.n + " RÉUSSIE !", "+" + e.mana + " mana chacun" + (e.score ? " · +" + fmt(e.score) + " points" : ""));
        SFX.waveEnd(e.n % 10 === 0 || e.perfect);
        for (var q = 0; q < fxN(30); q++) part({ x: rnd(BX, BX + BW), y: BY - 10, vx: rnd(-60, 60), vy: rnd(-80, 40), life: 0, max: rnd(1.4, 2.2), size: rnd(4, 7), color: ["#ffd257", PCOL[0].main, PCOL[1].main, "#ff8fb0", "#fff"][q % 5], kind: "confetti", g: 120, drag: 1.2, rot: rnd(0, TAU), vr: rnd(-10, 10) });
        ui.forEach(function (uu) { uu.manaBump = 1; });
        break;
      }
      case "ready": { if (ui) ui[e.p].readyPop = 1; SFX.ready(); break; }
      case "over": {
        var win = e.winner >= 0;
        if (win) { SFX.win(); doFlash(0.5, "#fff3c0"); } else { SFX.over(); doFlash(0.6, "#ff9a9a"); }
        shake(0.6);
        if (isVs()) kingFx[1 - e.winner].fall = 0.001; else kingFx[0].fall = 0.001;
        vshots = []; falls = []; ui.forEach(function (uu) { uu.sel = null; uu.drag = null; uu.aim = false; });
        stopMusic();
        var tok = overToken;
        setTimeout(function () { if (tok === overToken && mode === "over") gameOverCard(); }, 1700);
        mode = "over"; hud.hidden = true; updateLaunch(); if (tipEl) tipEl.hidden = true;
        recordBest(e.winner);
        if (party && !party.ended) { party.ended = true; var me0 = isVs() ? Math.max(0, myIdx()) : -1; window.Party.over({ score: partyScore(), dead: !(isVs() && e.winner === me0) }); }
        break;
      }
      case "upgrade": {
        u = ui[e.p]; var ti = K.TYPES.indexOf(e.type); u.upgFlash[ti] = 1;
        for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) {
          var pp = w.grid[c][r];
          if (pp && pp.owner === e.p && pp.type === e.type) { pv(pp).sq = 0.3; pv(pp).sqv = 0; burst(cellX(c), cellY(r), 5, { colors: ["#ffe68a", "#fff"], kind: "star", min: 30, max: 100, up: 80, g: -60, life: 0.5, size: 3 }); }
        }
        SFX.upgrade();
        break;
      }
      case "powerGet": {
        u = ui[e.p]; u.powerPop = 1;
        var pb = powerBox(e.p), wp = scr2w(pb.x + pb.w / 2, pb.y + pb.h / 2);
        burst(wp.x, wp.y, 18, { colors: ["#ffd257", "#fff", PCOL[e.p].main], kind: "star", min: 60, max: 200, life: 0.6, g: 0, size: 5 });
        text(wp.x, wp.y - 30, "Nouveau pouvoir !", { color: "#ffe9a0", size: 20, life: 1.3, vy: -30 });
        SFX.power();
        break;
      }
      case "meteorCall": { falls.push({ x: cellX(3), r: e.r, t: 0, dur: 0.42, p: e.p }); SFX.meteorFall(); break; }
      case "meteor": {
        x = cellX(3); y = cellY(e.r);
        shake(0.5); doFlash(0.35, "#fff1c9");
        ring(x, y, 10, CELL * 2.2, 0.45, "#ffd257", 10); ring(x, y, 4, CELL * 1.6, 0.35, "#ffffff", 6);
        burst(x, y, 40, { colors: ["#ffd257", "#ff9147", "#fff3c4", "#ff6b5a"], min: 120, max: 520, life: 0.6, size: 7, jx: CELL, jy: CELL * 0.8 });
        burst(x, y, 14, { colors: ["#6b6283", "#9c95b5"], min: 60, max: 200, life: 1.1, size: 9, g: -30, drag: 1.5 });
        text(x, y - 40, "BOUM !", { color: "#ffe066", size: 40, life: 1, big: true });
        SFX.boom();
        break;
      }
      case "lightning": {
        doFlash(0.3, "#f0eaff"); shake(0.2); SFX.lightning();
        e.ids.forEach(function (id) {
          var ev3 = evis[id]; if (!ev3) return;
          var pt = enemyPos(ev3);
          bolts.push({ x0: pt.x + rnd(-40, 40), y0: BY - 70, x1: pt.x, y1: pt.y, life: 0, max: 0.35, seed: Math.random() * 100 });
          burst(pt.x, pt.y, 8, { colors: ["#fff", "#ffe45e", "#a99bff"], kind: "star", min: 60, max: 220, life: 0.4, size: 4, g: 0 });
          ring(pt.x, pt.y, 4, 34, 0.3, "#ffe45e", 4);
        });
        text(KING_X, BY + BH * 0.3, "FOUDRE !", { color: "#ffe45e", size: 40, life: 1, big: true, outline: "#3a2f8f" });
        break;
      }
      case "heal": {
        var kp = kingPos(e.p);
        burst(kp.x, kp.y - 70, 22, { colors: ["#ff6b81", "#ffb3c0", "#fff"], kind: "heart", min: 40, max: 200, up: 120, g: -80, life: 1, size: 7 });
        ring(kp.x, kp.y - 60, 8, 90, 0.6, "#ff8fa3", 6);
        text(kp.x, kp.y - 150, "+" + Math.max(1, CFG.powers.heal.hp) + " ♥", { color: "#ff9bb0", size: 32, life: 1.2, big: true });
        kingFx[isVs() ? e.p : 0].sq = -0.25; kingFx[isVs() ? e.p : 0].sqv = 0;
        SFX.heal();
        break;
      }
      case "frenzy": {
        doFlash(0.2, "#ffd9a8"); SFX.frenzy();
        var zones = isVs() ? [e.p] : [0, 1];
        zones.forEach(function (zp) {
          for (var c2 = 0; c2 < CFG.cols; c2++) for (var r2 = 0; r2 < CFG.rows; r2++) {
            var pp2 = w.grid[c2][r2];
            if (pp2 && pp2.owner === zp) { pv(pp2).sq = 0.35; pv(pp2).sqv = 0; burst(cellX(c2), cellY(r2) - 10, 4, { colors: ["#ff9147", "#ffd257", "#fff"], kind: "star", min: 30, max: 120, up: 100, g: -80, life: 0.5, size: 3.5 }); }
          }
        });
        text(isVs() ? cellX(CFG.zones[e.p][0]) + CELL / 2 : KING_X, BY + BH * 0.3, "FURIE !", { color: "#ffb347", size: 40, life: 1, big: true, outline: "#8a2a12" });
        break;
      }
      case "freeze": {
        doFlash(0.4, "#d8f2ff"); SFX.freeze();
        for (var f = 0; f < fxN(40); f++) part({ x: rnd(cellX(2) - CELL / 2, cellX(4) + CELL / 2), y: rnd(BY - 40, BY + BH), vx: rnd(-20, 20), vy: rnd(20, 60), life: 0, max: rnd(1.5, 3), size: rnd(3, 6), color: "#ffffff", kind: "snow", g: 10, drag: 0.5, rot: 0, vr: rnd(-2, 2) });
        text(KING_X, BY + BH * 0.35, "GEL !", { color: "#e6f6ff", size: 40, life: 1.1, big: true, outline: "#2b6aa8" });
        break;
      }
      case "rainbow": {
        SFX.rainbow();
        u = ui[e.p]; u.sel = null;
        var rb = scr2w(PARTS[e.p].pow.x + PARTS[e.p].pow.w / 2, PARTS[e.p].pow.y);
        text(rb.x, rb.y - 10, "Choisis 2 pièces de même niveau", { color: "#fff", size: 16, life: 2.2, vy: -10 });
        break;
      }
      case "send": {
        v = evis[e.enemy.id];
        SFX.send(); if (G.me === 1 - e.p || G.me < 0) SFX.incoming();
        text(cellX(2) + CELL * 1.5, BY + 28, "Renfort ! →", { color: PCOL[e.p].light, size: 18, life: 1, vy: -20 });
        break;
      }
      case "refund": { var rp = manaPos(e.p); gemsTo(e.p, KING_X, KING_Y - 40, 2); text(KING_X, KING_Y - 100, "+" + e.mana + " mana", { color: PCOL[e.p].light, size: 18, life: 1 }); break; }
    }
  }
  function kingHit(dmg, p) {
    var kp = kingPos(p), kf = kingFx[isVs() ? p : 0];
    kf.hurt = 1; kf.sq = 0.35; kf.sqv = 0;
    shake(0.3 + dmg * 0.1); doFlash(0.22, "#ff8a8a");
    SFX.leak();
    burst(kp.x, kp.y - 60, 16, { colors: ["#ff6b81", "#ffb3c0", "#fff"], kind: "heart", min: 60, max: 220, up: 120, life: 0.8, size: 7 });
    text(kp.x, kp.y - 140, "-" + dmg + " ♥", { color: "#ff8a9c", size: 28, life: 1, big: true });
  }
  function showBanner(t1, t2) { banner = { t1: t1, t2: t2, t: 0, dur: 2.2 }; }

  /* ====================== MISE À JOUR ====================== */
  function update(rdt) {
    var gdt = rdt;
    if (hitstop > 0) { hitstop -= rdt; gdt = 0; }
    else if (slowmo > 0) { slowmo -= rdt; gdt = rdt * 0.32; }
    clock += gdt; ART.setClock(clock);
    if (mode === "play" && w.state !== "over") {
      if (isGuest()) guestTick(gdt);
      else {
        acc += gdt;
        var n = 0;
        while (acc >= STEP && n < 12) { K.step(w, STEP); acc -= STEP; n++; handleEvents(); if (w.state === "over") break; }
      }
    } else acc = 0;
    updateVis(gdt, rdt);
    updateFx(gdt);
  }
  // l'invité ne simule rien : il fait seulement tourner les minuteries d'affichage entre deux instantanés
  function guestTick(dt) {
    w.t += dt;
    if (w.state === "prep" && w.mode === "versus") w.prepT = Math.max(0, w.prepT - dt);
    for (var i = 0; i < 2; i++) {
      w.freeze[i] = Math.max(0, w.freeze[i] - dt); w.frenzy[i] = Math.max(0, w.frenzy[i] - dt);
      w.players[i].sendCd = Math.max(0, w.players[i].sendCd - dt);
    }
    for (var id in evis) { /* les ennemis sont animés par leurs événements */ }
  }

  function updateVis(dt, rdt) {
    var id, v, i;
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) {
      var pc = w.grid[c][r]; if (!pc) continue;
      v = pv(pc);
      v.recoil = Math.max(0, v.recoil - dt * 7);
      v.cast = Math.max(0, v.cast - dt * 3.5);
      v.jump = Math.max(0, v.jump - dt * 3.2);
      spring(v, dt, 260, 13);
      v.blink -= dt; if (v.blink < -0.12) v.blink = rnd(2, 5);
    }
    for (id in evis) {
      v = evis[id];
      v.hop = Math.min(1, v.hop + dt / v.hopDur);
      var k = easeOut(v.hop);
      var y0 = v.fromR < 0 ? PORTAL_Y + 14 : cellY(v.fromR) + CELL * 0.3, y1 = cellY(v.toR) + CELL * 0.3;
      var landed = v.hop >= 1 && !v.landed;
      v.y = lerp(y0, y1, k) - Math.sin(v.hop * Math.PI) * 12;
      if (v.hop < 1) v.landed = false;
      if (landed) { v.landed = true; v.sq = 0.25; v.sqv = 0; }
      v.flash = Math.max(0, v.flash - dt * 6);
      v.knock *= Math.exp(-dt * 12);
      spring(v, dt, 300, 12);
      v.blink -= dt; if (v.blink < -0.12) v.blink = rnd(1.5, 4);
      v.hpShown = lerp(v.hpShown, v.hp / v.maxHp, 1 - Math.exp(-dt * 10));
    }
    // tirs visibles (suivent la cible)
    for (i = vshots.length - 1; i >= 0; i--) {
      var s = vshots[i]; s.t += dt;
      var tv = evis[s.target];
      if (tv) { var tp = enemyPos(tv); s.tx = tp.x; s.ty = tp.y; }
      if (s.t >= s.dur) { if (!tv) burst(s.tx, s.ty, 3, { colors: ["#fff"], min: 20, max: 60, life: 0.2, size: 3 }); vshots.splice(i, 1); continue; }
      if ((s.type === "bishop" || s.type === "queen") && fxOn()) { s.trailT -= dt; if (s.trailT <= 0) { s.trailT = 0.02; var sp2 = shotPos(s); part({ x: sp2.x, y: sp2.y, vx: rnd(-15, 15), vy: rnd(-15, 15), life: 0, max: 0.3, size: 3.5, color: s.type === "queen" ? "#ffe68a" : PCOL[s.owner].light, kind: "dot", g: 0, drag: 3, rot: 0, vr: 0 }); } }
    }
    // fusions
    for (i = fusions.length - 1; i >= 0; i--) {
      var f = fusions[i]; f.t += dt;
      if (!f.done && f.t >= 0.34) {
        f.done = true;
        var lvl = f.piece.lvl, col = PCOL[f.p], hi = lvl >= 3;
        doFlash(hi ? 0.3 : 0.12, "#fffbe6");
        ring(f.into.x, f.into.y - 28, 6, hi ? 80 : 54, 0.4, col.light, hi ? 7 : 5);
        ring(f.into.x, f.into.y - 28, 2, hi ? 56 : 36, 0.3, "#fff", 4);
        burst(f.into.x, f.into.y - 28, hi ? 30 : 18, { colors: [col.main, col.light, "#ffe68a", "#fff"], kind: "star", min: 80, max: hi ? 340 : 240, life: 0.6, size: hi ? 6 : 5, g: 120 });
        if (f.rainbow) burst(f.into.x, f.into.y - 28, 24, { colors: ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"], kind: "star", min: 80, max: 280, life: 0.8, size: 5, g: 0 });
        if (hi) { rays.push({ x: f.into.x, y: f.into.y - 28, life: 0, max: lvl >= 4 ? 1.1 : 0.7, gold: lvl >= 4 }); hitstop = fxOn() ? 0.06 : 0; shake(lvl >= 4 ? 0.3 : 0.15); }
        var isQ = f.piece.type === "queen";
        if (isQ) { burst(f.into.x, f.into.y - 40, 24, { colors: ["#ffd257", "#fff", col.light], kind: "star", min: 100, max: 300, life: 0.9, size: 6, g: 0 }); text(f.into.x, f.into.y - CELL * 1.25, "UNE DAME !", { color: "#ffd257", size: 22, life: 1.2, big: true }); }
        text(f.into.x, f.into.y - CELL * 0.95, lvl >= 4 ? "NIVEAU MAX !" : "Niveau " + lvl + " !", { color: lvl >= 4 ? "#ffd257" : "#fff", size: lvl >= 4 ? 24 : 19, life: 1, big: true });
        var nv = pv(f.piece); nv.sq = 0.55; nv.sqv = 0;
        SFX.fuse(lvl);
      }
      if (f.t >= 0.6) fusions.splice(i, 1);
    }
    // météores en chute
    for (i = falls.length - 1; i >= 0; i--) { falls[i].t += dt; if (falls[i].t >= falls[i].dur) falls.splice(i, 1); }
    for (i = bolts.length - 1; i >= 0; i--) { bolts[i].life += dt; if (bolts[i].life >= bolts[i].max) bolts.splice(i, 1); }
    // ennemis qui atteignent le roi
    for (i = leakers.length - 1; i >= 0; i--) {
      var L = leakers[i]; L.t += dt;
      if (L.t >= 0.45) { leakers.splice(i, 1); kingHit(L.dmg, L.p); var kp = kingPos(L.p); burst(kp.x, kp.y - 50, 10, { colors: [ENEMY_COL[L.v.type].main, "#fff"], min: 60, max: 200, life: 0.4 }); }
    }
    // rois
    for (i = 0; i < 2; i++) {
      var kf = kingFx[i];
      kf.hurt = Math.max(0, kf.hurt - dt * 2.5);
      spring(kf, dt, 200, 10);
      if (kf.fall > 0) kf.fall = Math.min(1, kf.fall + dt * 1.6);
      var near = null, bp = -1;
      w.enemies.forEach(function (e) { if (isVs() && e.target !== i) return; var p = K.progress(e); if (p > bp) { bp = p; near = e; } });
      var kx = isVs() ? KINGS[i].x : KING_X;
      kf.look = lerp(kf.look, near ? clamp((cellX(near.c) - kx) / CELL, -1, 1) : 0, 1 - Math.exp(-dt * 4));
    }
    // interface des joueurs (le temps réel, même au ralenti)
    ui.forEach(function (u, pi) {
      var tx = cellX(u.cur.c), ty = cellY(u.cur.r), kk = 1 - Math.exp(-rdt * 22);
      u.cx = lerp(u.cx, tx, kk); u.cy = lerp(u.cy, ty, kk);
      u.deny = Math.max(0, u.deny - rdt * 3); u.denyT = Math.max(0, u.denyT - rdt);
      u.manaBump = Math.max(0, u.manaBump - rdt * 4);
      u.powerPop = Math.max(0, u.powerPop - rdt * 2);
      u.readyPop = Math.max(0, u.readyPop - rdt * 3);
      for (var j = 0; j < 5; j++) u.upgFlash[j] = Math.max(0, u.upgFlash[j] - rdt * 3);
      u.mana = lerp(u.mana, w.players[pi].mana, 1 - Math.exp(-rdt * 14));
      if (Math.abs(u.mana - w.players[pi].mana) < 0.05) u.mana = w.players[pi].mana;
      if (u.sel) { var sp = w.grid[u.sel.c][u.sel.r]; if (!sp || sp.id !== u.sel.id) u.sel = null; }
      if (u.aim && w.players[pi].power !== "meteor") u.aim = false;
    });
    var goal = isVs() ? [w.players[0].score, w.players[1].score] : [w.score, 0];
    for (i = 0; i < 2; i++) if (shownScore[i] < goal[i]) { var dS = goal[i] - shownScore[i]; shownScore[i] = Math.min(goal[i], shownScore[i] + Math.max(1, dS * (1 - Math.exp(-rdt * 8)))); scoreBump = 1; }
    scoreBump = Math.max(0, scoreBump - rdt * 3);
  }
  function shotPos(s) {
    var k = clamp(s.t / s.dur, 0, 1);
    var x = lerp(s.x0, s.tx, k), y = lerp(s.y0, s.ty, k);
    if (s.type === "bishop" || s.type === "queen") { var nx = -(s.ty - s.y0), ny = s.tx - s.x0, L = Math.hypot(nx, ny) || 1; var off = Math.sin(k * Math.PI) * (s.type === "queen" ? 8 : 14) * (s.owner ? -1 : 1); x += nx / L * off; y += ny / L * off; }
    if (s.type === "knight") y -= Math.sin(k * Math.PI) * (40 + Math.abs(s.tx - s.x0) * 0.25);
    return { x: x, y: y, k: k };
  }

  function paintBackground() {
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    var g = bgCanvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#3a3266"); sky.addColorStop(0.6, "#5a4a83"); sky.addColorStop(1, "#7a5d8f");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // damier très léger en fond
    var sq = 46 * Math.max(0.6, S);
    g.fillStyle = "rgba(255,255,255,.025)";
    for (var y = 0; y < H; y += sq) for (var x = ((y / sq) % 2) * sq; x < W; x += sq * 2) g.fillRect(x, y, sq, sq);
    // lumières douces
    var seed = 11; function r01() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 22; i++) {
      var bx = r01() * W, by = r01() * H, rad = (14 + r01() * 50) * Math.max(0.6, S);
      var gr = g.createRadialGradient(bx, by, 0, bx, by, rad);
      gr.addColorStop(0, "rgba(255,226,200," + (0.04 + r01() * 0.07) + ")"); gr.addColorStop(1, "rgba(255,226,200,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, rad, 0, TAU); g.fill();
    }
  }
  function paintBoard() {
    boardCanvas.width = canvas.width; boardCanvas.height = canvas.height;
    var g = boardCanvas.getContext("2d");
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY);
    // tapis vers le roi
    var cx0 = BX + CELL * 2, cw0 = CELL * 3;
    rrect(g, cx0 + 14, BY + BH - 10, cw0 - 28, 96, 18); g.fillStyle = "#b04a5e"; g.fill();
    rrect(g, cx0 + 24, BY + BH - 10, cw0 - 48, 92, 14); g.fillStyle = "#d8667a"; g.fill();
    g.setLineDash([8, 8]); g.strokeStyle = "rgba(255,230,160,.6)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx0 + 32, BY + BH); g.lineTo(cx0 + 32, BY + BH + 80); g.moveTo(cx0 + cw0 - 32, BY + BH); g.lineTo(cx0 + cw0 - 32, BY + BH + 80); g.stroke(); g.setLineDash([]);
    // murailles du château de chaque côté du roi
    [[BX + 6, PCOL[0]], [BX + BW - CELL * 2 + 10, PCOL[1]]].forEach(function (a) {
      var x = a[0], y = BY + BH + 30, ww = CELL * 2 - 16, col = a[1];
      for (var m = 0; m < 4; m++) { rrect(g, x + 4 + m * (ww - 8) / 4, y - 12, (ww - 8) / 4 - 6, 18, 4); g.fillStyle = "#e1d2ea"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
      rrect(g, x, y, ww, 50, 8); g.fillStyle = grad(g, y, y + 50, "#d9c8e4", "#b49ec6"); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      // briques
      g.save(); rrect(g, x, y, ww, 50, 8); g.clip(); g.strokeStyle = "rgba(58,44,76,.25)"; g.lineWidth = 2;
      for (var by = 0; by < 3; by++) { g.beginPath(); g.moveTo(x, y + 14 + by * 14); g.lineTo(x + ww, y + 14 + by * 14); g.stroke(); for (var bx = (by % 2) * 14; bx < ww; bx += 28) { g.beginPath(); g.moveTo(x + bx, y + by * 14); g.lineTo(x + bx, y + 14 + by * 14); g.stroke(); } }
      g.restore();
      // porte
      g.beginPath(); g.moveTo(x + ww / 2 - 12, y + 50); g.lineTo(x + ww / 2 - 12, y + 30); g.arc(x + ww / 2, y + 30, 12, Math.PI, 0); g.lineTo(x + ww / 2 + 12, y + 50); g.closePath(); g.fillStyle = "#5a4470"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(x + ww / 2, y - 12); g.lineTo(x + ww / 2, y - 44); g.lineWidth = 3; g.stroke();
      g.beginPath(); g.moveTo(x + ww / 2, y - 44); g.lineTo(x + ww / 2 + 22, y - 37); g.lineTo(x + ww / 2, y - 30); g.closePath(); g.fillStyle = col.main; g.fill(); g.stroke();
    });
    // cadre du plateau
    rrect(g, BX - 14, BY - 14, BW + 28, BH + 28, 22); g.fillStyle = "#2a2142"; g.fill();
    rrect(g, BX - 9, BY - 9, BW + 18, BH + 18, 18); g.fillStyle = "#8d77a8"; g.fill();
    rrect(g, BX - 4, BY - 4, BW + 8, BH + 8, 14); g.fillStyle = "#3a2c4c"; g.fill();
    g.save(); rrect(g, BX, BY, BW, BH, 10); g.clip();
    for (var c = 0; c < 7; c++) for (var r = 0; r < 7; r++) {
      var odd = (c + r) % 2, zone = K.ownerOfCol(c), col;
      if (zone === 0) col = odd ? "#c3d9fb" : "#d8e7ff";
      else if (zone === 1) col = odd ? "#fbd5b4" : "#ffe5cf";
      else col = odd ? "#eadfcb" : "#f5ecdc";
      g.fillStyle = col; g.fillRect(BX + c * CELL, BY + r * CELL, CELL, CELL);
      // petit relief
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(BX + c * CELL, BY + r * CELL, CELL, 3);
      g.fillStyle = "rgba(60,40,80,.08)"; g.fillRect(BX + c * CELL, BY + r * CELL + CELL - 3, CELL, 3);
    }
    // ombre intérieure du couloir + séparations
    var lg = g.createLinearGradient(0, BY, 0, BY + 60); lg.addColorStop(0, "rgba(70,40,100,.25)"); lg.addColorStop(1, "rgba(70,40,100,0)");
    g.fillStyle = lg; g.fillRect(cx0, BY, cw0, 60);
    g.fillStyle = "rgba(58,44,76,.35)"; g.fillRect(cx0 - 2, BY, 4, BH); g.fillRect(cx0 + cw0 - 2, BY, 4, BH);
    g.restore();
    // portail au-dessus du couloir
    var px = cx0 + cw0 / 2, py = BY - 6;
    g.beginPath(); g.moveTo(cx0 + 6, py); g.lineTo(cx0 + 6, py - 34); g.quadraticCurveTo(px, py - 92, cx0 + cw0 - 6, py - 34); g.lineTo(cx0 + cw0 - 6, py); g.closePath();
    g.fillStyle = "#2a2142"; g.fill();
    g.beginPath(); g.moveTo(cx0 + 18, py); g.lineTo(cx0 + 18, py - 30); g.quadraticCurveTo(px, py - 78, cx0 + cw0 - 18, py - 30); g.lineTo(cx0 + cw0 - 18, py); g.closePath();
    var pg = g.createRadialGradient(px, py - 20, 4, px, py - 20, 90); pg.addColorStop(0, "#9b7fe0"); pg.addColorStop(1, "#40306a");
    g.fillStyle = pg; g.fill();
    // pierres du portail
    g.fillStyle = "#8d77a8";
    [[cx0 - 4, py - 40, 22, 40], [cx0 + cw0 - 18, py - 40, 22, 40]].forEach(function (b) { rrect(g, b[0], b[1], b[2], b[3], 6); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); });
  }


  function fz(n) { return Math.max(n, 10.5 / S); }   // taille de texte du monde : jamais minuscule à l'écran


  /* ====================== RENDU ====================== */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.max(280, stage.clientWidth), ch = Math.max(300, stage.clientHeight);
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    layout();
    paintBackground();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    var sx = 0, sy = 0;
    if (trauma > 0 && fxOn()) { var tr = trauma * trauma * 7; sx = rnd(-tr, tr); sy = rnd(-tr, tr); }
    ctx.setTransform(1, 0, 0, 1, sx * dpr, sy * dpr);
    ctx.drawImage(boardCanvas, 0, 0);
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (OX + sx), dpr * (OY + sy));
    if (!w) return;
    drawPortalSwirl();
    drawFreezeTint();
    drawRanges();
    drawCursors(false);
    drawCircles();
    drawUnits();
    drawShots();
    drawFusions();
    drawFalls();
    drawKingArea();
    drawRays();
    drawBolts();
    drawParticles();
    drawRings();
    drawBeams();
    drawCursors(true);
    drawDrag();
    // interface en pixels écran (texte net)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTopBar();
    drawPanel(0); drawPanel(1);
    // par-dessus tout : textes flottants et bandeau (monde)
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (OX + sx), dpr * (OY + sy));
    drawTexts();
    drawBanner();
    if (flash > 0.01 && fxOn()) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = flash * 0.5; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  }

  function drawPortalSwirl() {
    var px = BX + CELL * 3.5, py = BY - 26;
    ctx.save();
    ctx.globalAlpha = w.state === "wave" ? 0.8 : 0.35;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(px, py, 30 + i * 12, 12 + i * 4, 0, clock * (1.2 + i * 0.4), clock * (1.2 + i * 0.4) + Math.PI * 1.2);
      ctx.strokeStyle = i % 2 ? "#e6dcff" : "#b9a2ff"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
    var bx = BX + CELL * 2 + 30, bw = CELL * 3 - 60, by = BY - 66;
    if (w.state === "wave") {
      var left = w.queue.length + w.enemies.length;
      var done = w.waveTotal - left, k = clamp(done / Math.max(1, w.waveTotal), 0, 1);
      rrect(ctx, bx, by, bw, 16, 8); ctx.fillStyle = "rgba(30,20,50,.7)"; ctx.fill();
      rrect(ctx, bx + 3, by + 3, Math.max(10, (bw - 6) * k), 10, 5); ctx.fillStyle = "#ffd257"; ctx.fill();
      ctx.font = "800 " + Math.max(13, 12 / S) + "px " + FF; ctx.fillStyle = "#fff";
      ctx.fillText(left + " ennemis restants", bx + bw / 2, by - 6);
    } else if (isVs() && w.state === "prep") {
      var sec = Math.ceil(w.prepT);
      ctx.font = "900 " + Math.max(15, 13 / S) + "px " + FF;
      var label = "Vague " + w.wave + " dans " + sec + " s";
      var tw = ctx.measureText(label).width + 28;
      rrect(ctx, px - tw / 2, by - 8, tw, 28, 14); ctx.fillStyle = "rgba(36,26,58,.9)"; ctx.fill();
      ctx.fillStyle = sec <= 5 ? "#ffb3a6" : "#ffd257"; ctx.fillText(label, px, by + 11);
    }
  }
  function drawFreezeTint() {
    var fz = Math.max(w.freeze[0], w.freeze[1]);
    if (!fz) return;
    var k = Math.min(1, fz / 0.6);
    ctx.save(); ctx.globalAlpha = 0.28 * k;
    ctx.fillStyle = "#9fdcff"; ctx.fillRect(BX + CELL * 2, BY, CELL * 3, BH);
    ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = "#e9f8ff"; ctx.lineWidth = 3;
    ctx.strokeRect(BX + CELL * 2 + 2, BY + 2, CELL * 3 - 4, BH - 4);
    ctx.restore();
  }

  function selPiece(u) { return u.sel ? w.grid[u.sel.c][u.sel.r] : null; }
  function drawRanges() {
    ui.forEach(function (u, pi) {
      var sp = selPiece(u), hov = !sp ? K.pieceAt(w, u.cur.c, u.cur.r) : null;
      var hk = clamp(2.2 - (clock - u.lastMove) / 1.2, 0, 1);   // l'aperçu au survol s'efface quand le curseur reste immobile
      var pc = sp || (SET.ranges && mode === "play" && hk > 0 ? hov : null);
      if (pc) {
        var strong = !!sp, col = PCOL[pi];
        var cells = K.shapeCells(pc.type, pc.c, pc.r, K.dirOf(pc.owner));
        cells.forEach(function (c) {
          var x = BX + c.c * CELL, y = BY + c.r * CELL;
          var ga = strong ? 1 : hk;
          if (c.lane) {
            ctx.globalAlpha = ga * ((strong ? 0.42 : 0.22) + (strong ? 0.08 * Math.sin(clock * 5 + c.r) : 0));
            rrect(ctx, x + 4, y + 4, CELL - 8, CELL - 8, 10); ctx.fillStyle = col.main; ctx.fill();
            ctx.globalAlpha = ga * (strong ? 0.9 : 0.5); ctx.lineWidth = 2.5; ctx.strokeStyle = col.dark; ctx.stroke();
            ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 7, 0, TAU); ctx.moveTo(x + CELL / 2 + 13, y + CELL / 2); ctx.arc(x + CELL / 2, y + CELL / 2, 13, 0, TAU);
            ctx.lineWidth = 2; ctx.stroke();
          } else {
            ctx.globalAlpha = (strong ? 0.4 : 0.18) * ga;
            ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 5, 0, TAU); ctx.fillStyle = col.dark; ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
      }
      // météore : prévisualisation des 3 lignes visées
      if (w.players[pi].power === "meteor" && mode === "play") {
        var r0 = u.cur.r;
        ctx.save(); ctx.globalAlpha = u.aim ? 0.35 + 0.1 * Math.sin(clock * 8) : 0.1;
        ctx.fillStyle = "#ff9147";
        ctx.fillRect(BX + CELL * 2, BY + Math.max(0, r0 - 1) * CELL, CELL * 3, (Math.min(6, r0 + 1) - Math.max(0, r0 - 1) + 1) * CELL);
        ctx.restore();
      }
    });
  }

  function drawFalls() {
    falls.forEach(function (f) {
      var k = clamp(f.t / f.dur, 0, 1), y = lerp(BY - 340, cellY(f.r), k * k), x = f.x + (1 - k) * 60;
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * 2);
      drawPowerIcon(ctx, "meteor", 0, 0, 30 + k * 10); ctx.restore();
      if (fxOn()) part({ x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-20, 20), vy: rnd(-40, 0), life: 0, max: 0.4, size: rnd(4, 8), color: ["#ffd257", "#ff9147", "#ff6b5a"][Math.floor(Math.random() * 3)], kind: "dot", g: -20, drag: 2, rot: 0, vr: 0 });
      // zone visée
      ctx.save(); ctx.globalAlpha = 0.25 + 0.4 * k; ctx.strokeStyle = "#ff6b5a"; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.strokeRect(BX + CELL * 2 + 4, BY + Math.max(0, f.r - 1) * CELL + 4, CELL * 3 - 8, (Math.min(6, f.r + 1) - Math.max(0, f.r - 1) + 1) * CELL - 8);
      ctx.restore();
    });
  }
  function drawBolts() {
    bolts.forEach(function (b) {
      var k = b.life / b.max, a = 1 - k, seg = 9, pts = [], i;
      for (i = 0; i <= seg; i++) {
        var t = i / seg, jx = (i === 0 || i === seg) ? 0 : Math.sin(b.seed + i * 7.3 + Math.floor(b.life * 40)) * 22;
        pts.push([lerp(b.x0, b.x1, t) + jx, lerp(b.y0, b.y1, t)]);
      }
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.globalAlpha = a;
      [[14, "rgba(120,100,255,.45)"], [7, "rgba(255,240,120,.9)"], [3, "#fff"]].forEach(function (L) {
        ctx.beginPath(); pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.lineWidth = L[0]; ctx.strokeStyle = L[1]; ctx.stroke();
      });
      ctx.restore();
    });
  }

  function drawKingArea() {
    if (isVs()) {
      for (var p = 0; p < 2; p++) {
        var hp = w.kings[p], kf = kingFx[p], x = KINGS[p].x;
        for (var i = 0; i < CFG.kingHp; i++) {
          var hx = x - (CFG.kingHp - 1) * 7 + i * 14, hy = KING_Y - 100, full = i < hp;
          var beat = full && hp <= 3 ? 1 + 0.12 * Math.max(0, Math.sin(clock * 8)) : 1;
          ctx.save(); ctx.translate(hx, hy); ctx.scale(beat, beat); heart(ctx, 0, 0, 17);
          ctx.fillStyle = full ? "#ff6b81" : "rgba(40,25,60,.55)"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
        }
        var br2 = Math.sin(clock * 1.8 + p) * 0.02;
        drawKing(ctx, x, KING_Y + 4, 72, { sx: (1 + kf.sq * 0.4) * (1 - br2), sy: (1 - kf.sq * 0.4) * (1 + br2), hurt: kf.hurt, look: kf.look, blink: Math.sin(clock * 0.9 + p) > 0.985, sweat: hp <= 3 && hp > 0, dead: w.state === "over" && hp <= 0, rot: kf.fall > 0 ? easeOut(kf.fall) * 1.35 * (p ? -1 : 1) : 0 });
        // petite pastille de couleur du joueur
        ctx.beginPath(); ctx.arc(x - 34, KING_Y - 30, 9, 0, TAU); ctx.fillStyle = PCOL[p].main; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      }
      return;
    }
    var hp0 = w.kingHp, max = CFG.kingHp;
    for (var i2 = 0; i2 < max; i2++) {
      var left = i2 < 5, j = left ? 4 - i2 : i2 - 5;
      var hx2 = left ? KING_X - 78 - j * 30 : KING_X + 78 + j * 30, hy2 = KING_Y - 24, full2 = i2 < hp0;
      var beat2 = full2 && hp0 <= 3 ? 1 + 0.12 * Math.max(0, Math.sin(clock * 8)) : 1;
      ctx.save(); ctx.translate(hx2, hy2); ctx.scale(beat2, beat2);
      heart(ctx, 0, 0, 24);
      ctx.fillStyle = full2 ? "#ff6b81" : "rgba(40,25,60,.5)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      if (full2) { ctx.beginPath(); ctx.ellipse(-5, -5, 3.5, 2.2, -0.6, 0, TAU); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill(); }
      ctx.restore();
    }
    var kf0 = kingFx[0], br = Math.sin(clock * 1.8) * 0.02;
    drawKing(ctx, KING_X, KING_Y + 4, 92, { sx: (1 + kf0.sq * 0.4) * (1 - br), sy: (1 - kf0.sq * 0.4) * (1 + br), hurt: kf0.hurt, look: kf0.look, blink: Math.sin(clock * 0.9) > 0.985, sweat: hp0 <= 3 && hp0 > 0, dead: w.state === "over", rot: kf0.fall > 0 ? easeOut(kf0.fall) * 1.35 : 0 });
    ctx.font = "900 " + Math.max(14, 13 / S) + "px " + FF; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var hx3 = KING_X - 78 - 4 * 30 - 62, hy3 = KING_Y - 24;
    rrect(ctx, hx3 - 44, hy3 - 12, 88, 24, 12); ctx.fillStyle = hp0 <= 3 ? "#e04860" : "rgba(36,26,58,.85)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText("ROI  " + hp0 + "/" + max, hx3, hy3 + 1);
  }

  function drawTexts() {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    texts.forEach(function (t) {
      var k = t.life / t.max, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      var pop = t.pop && k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : k < 0.25 ? 1.15 - (k - 0.15) * 1.5 : 1;
      var sz = Math.max(t.size, 13 / S);
      ctx.save(); ctx.translate(t.x, t.y); ctx.scale(pop, pop);
      ctx.globalAlpha = a;
      ctx.font = "900 " + sz + "px " + FF;
      ctx.lineJoin = "round"; ctx.lineWidth = Math.max(4, sz * 0.22); ctx.strokeStyle = t.outline; ctx.strokeText(t.txt, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.txt, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- interface en pixels écran ---------- */
  function T(s, x, y, size, weight, color, align) {
    ctx.font = (weight || 800) + " " + size + "px " + FF; ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  }
  function box(r, fill, rad, stroke) {
    rrect(ctx, r.x, r.y, r.w, r.h, rad == null ? 12 : rad); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function myIdx() { return NET.started ? (NET.role === "host" ? 0 : 1) : -1; }
  function canCtl(p) { return !NET.started || myIdx() === p; }
  function enemyChip(type, x, y, size, n) {
    drawEnemy(ctx, type, x, y, size, {});
    T("×" + n, x + size * 0.34, y - size * 0.3, 12, 900, "#fff");
  }

  function drawTopBar() {
    var vs = isVs(), hudW = 120, x0 = 6, i;
    var def = K.waveDef(w.wave, w.mode), counts = {};
    def.list.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    var state = w.state === "wave" ? "En cours" : w.state === "over" ? "Terminé" : "Préparation";
    var chips = ["normal", "fast", "armored", "boss"].filter(function (t) { return counts[t]; });
    var rowA, rowB;
    if (TALL) { rowA = { x: x0, y: 5, w: W - 12, h: 34 }; rowB = { x: x0, y: 42, w: W - 12, h: 22 }; }
    else { rowA = { x: x0, y: 6, w: W - 12, h: 44 }; rowB = null; }
    box(rowA, "rgba(36,26,58,.88)", 14, "rgba(25,15,40,.6)");
    if (rowB) box(rowB, "rgba(36,26,58,.88)", 11, "rgba(25,15,40,.6)");
    var cy = rowA.y + rowA.h / 2;
    // vague
    T("Vague " + w.wave, rowA.x + 14, TALL ? cy : cy - 8, TALL ? 18 : 20, 900, "#ffd257");
    if (!TALL) T(state + (vs && w.state === "prep" ? " · " + Math.ceil(w.prepT) + " s" : ""), rowA.x + 14, cy + 11, 12, 800, "#d9cdf0");
    // score
    var sxr = W - 6 - hudW;
    if (vs) {
      T(fmt(shownScore[0]), sxr - 108, cy, TALL ? 17 : 20, 900, PCOL[0].light, "right");
      T(":", sxr - 99, cy, 18, 900, "#d9cdf0", "center");
      T(fmt(shownScore[1]), sxr - 90, cy, TALL ? 17 : 20, 900, PCOL[1].light, "left");
    } else {
      var sb = 1 + scoreBump * 0.08;
      ctx.save(); ctx.translate(sxr - 8, cy); ctx.scale(sb, sb);
      T(fmt(shownScore[0]), 0, 0, TALL ? 18 : 22, 900, "#fff", "right"); ctx.restore();
      if (!TALL) T("SCORE", sxr - 8, rowA.y + 8, 10, 800, "#bfb2d8", "right");
    }
    // aperçu de la vague + jauge
    var px = TALL ? rowB.x + 10 : rowA.x + 150;
    var py = TALL ? rowB.y + rowB.h / 2 : cy;
    if (TALL || sxr - 150 - px > 170) {
      T(w.state === "wave" ? "Vague" : "Suivante", px, py - (TALL ? 0 : 12), 11, 800, "#bfb2d8");
      var cx = px + (TALL ? 62 : 8);
      chips.forEach(function (t) { enemyChip(t, cx + 12, py + (TALL ? 9 : 14), TALL ? 24 : 32, counts[t]); cx += TALL ? 46 : 58; });
    }
    if (!vs) {
      var gk = w.coop / CFG.coopGauge, gw = TALL ? 120 : 150, gx = TALL ? rowB.x + rowB.w - gw - 10 : sxr - gw - 60, gy = TALL ? rowB.y + rowB.h / 2 : cy;
      if (TALL || gx > px + 220) {
        T("Pouvoirs", gx - 8, gy, 11, 800, "#bfb2d8", "right");
        rrect(ctx, gx, gy - 8, gw, 16, 8); ctx.fillStyle = "rgba(15,8,30,.75)"; ctx.fill();
        ctx.save(); rrect(ctx, gx + 2, gy - 6, gw - 4, 12, 6); ctx.clip();
        var gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, PCOL[0].main); gg.addColorStop(1, PCOL[1].main);
        ctx.fillStyle = gg; ctx.fillRect(gx + 2, gy - 6, (gw - 4) * gk, 12); ctx.restore();
        T(w.coop + "/" + CFG.coopGauge, gx + gw / 2, gy + 1, 10, 900, "#fff", "center");
      }
    }
  }

  function bar(r, k, c0, c1) {
    rrect(ctx, r.x, r.y, r.w, r.h, r.h / 2); ctx.fillStyle = "rgba(15,8,30,.75)"; ctx.fill();
    if (k > 0) { ctx.save(); rrect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, (r.h - 4) / 2); ctx.clip(); var gg = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); gg.addColorStop(0, c0); gg.addColorStop(1, c1 || c0); ctx.fillStyle = gg; ctx.fillRect(r.x + 2, r.y + 2, (r.w - 4) * clamp(k, 0, 1), r.h - 4); ctx.restore(); }
  }
  function wrapText(txt, x, y, maxW, lh, size, color, maxLines) {
    ctx.font = "700 " + size + "px " + FF; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    var words = txt.split(" "), line = "", yy = y, n = 0;
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = words[i]; yy += lh; if (++n >= (maxLines || 9)) return; } else line = t;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPanel(pi) {
    var o = PARTS[pi]; if (!o) return;
    var nar = TALL || o.R.w < 250;
    var R = o.R, u = ui[pi], pl = w.players[pi], col = PCOL[pi], vs = isVs(), live = mode === "play" && canCtl(pi);
    var remote = NET.started && myIdx() !== pi, i;
    ctx.save();
    if (remote) ctx.globalAlpha = 0.82;
    box(R, "rgba(36,26,58,.9)", nar ? 14 : 18, "rgba(25,15,40,.65)");
    // en-tête
    box(o.head, col.main, 10); box({ x: o.head.x, y: o.head.y, w: o.head.w, h: 10 }, "rgba(255,255,255,.28)", 8);
    var nm = NET.started ? (remote ? (vs ? "ADVERSAIRE" : "COÉQUIPIER") : "TOI") : col.name.toUpperCase();
    T(nar ? (NET.started ? nm : "J" + (pi + 1)) : nm, o.head.x + 10, o.head.y + o.head.h / 2 + 1, nar ? 15 : 16, 900, col.deep);
    if (!vs && !nar) T(NET.started ? "" : (pi === 0 ? "ZQSD · Espace" : "Flèches · Entrée"), o.head.x + o.head.w - 8, o.head.y + o.head.h / 2 + 1, 11, 800, col.deep, "right");
    if (vs && w.state === "prep") {
      var rd = o.ready, isReady = w.ready[pi], canReady = w.state === "prep" && !isReady && live;
      var rp = 1 + u.readyPop * 0.12;
      ctx.save(); ctx.translate(rd.x + rd.w / 2, rd.y + rd.h / 2); ctx.scale(rp, rp); ctx.translate(-rd.x - rd.w / 2, -rd.y - rd.h / 2);
      box(rd, isReady ? "#7be07f" : w.state === "prep" ? (hoverBtn === "rdy" + pi && canReady ? "#fff3b0" : "#ffe680") : "rgba(255,255,255,.25)", rd.h / 2);
      T(isReady ? "✓ Prêt" : "Prêt", rd.x + rd.w / 2, rd.y + rd.h / 2 + 1, 12, 900, isReady ? "#1f4a22" : "#5a3c00", "center");
      ctx.restore();
    }
    // mana
    var m = o.mana, mb = 1 + u.manaBump * 0.15, can = pl.mana >= CFG.summonCost;
    ctx.save(); ctx.translate(m.x + 18, m.y + m.h / 2); ctx.scale(mb, mb); drawGem(ctx, 0, 0, nar ? 13 : 18, col, 0.6 + 0.4 * Math.sin(clock * 3)); ctx.restore();
    ctx.save(); ctx.translate(m.x + (nar ? 36 : 46), m.y + m.h / 2 + 1); ctx.scale(mb, mb);
    T(String(Math.round(u.mana)), 0, 0, nar ? 22 : 30, 900, "#fff"); ctx.restore();
    var n = K.countPieces(w, pi), mx = K.zoneSize(pi);
    if (nar) {
      T(n + "/" + mx, m.x + m.w - 4, m.y + 9, 11, 800, n >= mx ? "#ffd257" : "#bfb2d8", "right");
      T("invoc. " + CFG.summonCost, m.x + m.w - 4, m.y + 25, 11, 900, can ? "#7be07f" : "#8f84a3", "right");
    } else {
      T("MANA", m.x + 46, m.y + 7, 10, 800, "#bfb2d8");
      var pr = { x: m.x + m.w - 100, y: m.y + 4, w: 100, h: 24 };
      box(pr, can ? "#7be07f" : "rgba(255,255,255,.12)", 12);
      T("Invoquer · " + CFG.summonCost, pr.x + pr.w / 2, pr.y + 13, 12, 900, can ? "#1f4a22" : "#a99cbc", "center");
      T("Pièces " + n + "/" + mx, m.x + m.w - 50, m.y + m.h - 8, 12, 800, n >= mx ? "#ffd257" : "#bfb2d8", "center");
    }
    // infos sur la case visée (grands panneaux)
    if (o.info) {
      var pc = selPiece(u) || K.pieceAt(w, u.cur.c, u.cur.r), inf = o.info;
      box(inf, "rgba(255,255,255,.07)", 10);
      if (pc) {
        drawPiece(ctx, pc.type, pc.owner, pc.lvl, inf.x + 30, inf.y + inf.h - 4, 40, { noStars: true, noAura: true, dir: pi === 0 ? 1 : -1 });
        T(TYPE_NAME[pc.type] + " · niveau " + pc.lvl + (pc.lvl >= CFG.maxLevel ? " (max)" : ""), inf.x + 58, inf.y + 16, 14, 900, "#fff");
        T(Math.round(K.pieceDmg(w, pc)) + " dégâts · " + (1 / K.pieceCd(pc)).toFixed(1) + " tirs/s", inf.x + 58, inf.y + 35, 12, 700, "#d9cdf0");
      } else {
        T(u.sel ? "Choisis une pièce identique" : "Case vide : invoque une pièce", inf.x + 12, inf.y + 17, 13, 800, "#d9cdf0");
        T(u.sel ? "(même type, même niveau)" : "Tour, Fou, Cavalier ou Pion au hasard", inf.x + 12, inf.y + 36, 11.5, 700, "#bfb2d8");
      }
    }
    // renforcer un type
    if (o.upgLabel) T("RENFORCER MES…", o.upg[0].x, o.upgLabel, 11, 800, "#bfb2d8");
    K.TYPES.forEach(function (t, ti) {
      var r = o.upg[ti], cost = K.upgradeCost(w, pi, t), ok = pl.mana >= cost && live, lvl = pl.upg[t] || 0;
      var hov = hoverBtn === "upg" + pi + ti, fl = u.upgFlash[ti];
      ctx.save();
      if (hov && ok) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2); }
      box(r, fl > 0 ? mix("#4a3a6a", "#ffe066", fl * 0.7) : hov && ok ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)", 10);
      var ps = Math.min(r.w * 1.05, r.h - 18);
      drawPiece(ctx, t, pi, 1, r.x + r.w / 2, r.y + r.h - 14, ps, { noStars: true, noAura: true });
      var pill = { x: r.x + 2, y: r.y + r.h - 15, w: r.w - 4, h: 13 };
      box(pill, ok ? "#ffd257" : "rgba(255,255,255,.12)", 6.5);
      T(String(cost), pill.x + pill.w / 2, pill.y + 7, 11, 900, ok ? "#5a3c00" : "#8f84a3", "center");
      if (lvl > 0) { ctx.beginPath(); ctx.arc(r.x + r.w - 7, r.y + 8, 8, 0, TAU); ctx.fillStyle = "#ffe066"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); T(String(lvl), r.x + r.w - 7, r.y + 8.5, 10, 900, INK, "center"); }
      ctx.restore();
    });
    // envoyer des ennemis (versus)
    if (o.send) {
      if (o.sendLabel) T("ENVOYER À L'ADVERSAIRE", o.send[0].x, o.sendLabel, 11, 800, "#bfb2d8");
      SEND_TYPES.forEach(function (t, si) {
        var r = o.send[si], cost = CFG.versus.send[t], ok = pl.mana >= cost && w.state === "wave" && pl.sendCd <= 0 && live;
        var hov = hoverBtn === "snd" + pi + si;
        ctx.save();
        if (hov && ok) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-r.x - r.w / 2, -r.y - r.h / 2); }
        box(r, hov && ok ? "rgba(255,170,150,.28)" : "rgba(255,255,255,.08)", 10, ok ? "rgba(255,150,130,.7)" : null);
        var es = Math.min(r.h - 14, r.w * 0.8);
        ctx.globalAlpha *= ok ? 1 : 0.55;
        drawEnemy(ctx, t, r.x + (nar ? r.w / 2 : r.w * 0.3), r.y + r.h - (nar ? 14 : 8), es * (t === "fast" ? 1.1 : 1), {});
        ctx.globalAlpha = remote ? 0.82 : 1;
        if (nar) T(String(cost), r.x + r.w / 2, r.y + r.h - 6, 11, 900, ok ? "#ffd257" : "#8f84a3", "center");
        else { T("→ " + cost, r.x + r.w * 0.66, r.y + r.h / 2 - 5, 13, 900, ok ? "#ffd257" : "#8f84a3", "center"); T(t === "normal" ? "Pionnet" : t === "fast" ? "Filou" : "Cabosse", r.x + r.w * 0.66, r.y + r.h / 2 + 11, 10, 700, "#bfb2d8", "center"); }
        if (pl.sendCd > 0 && w.state === "wave") { ctx.save(); rrect(ctx, r.x, r.y, r.w, r.h, 10); ctx.clip(); ctx.fillStyle = "rgba(15,8,30,.5)"; ctx.fillRect(r.x, r.y, r.w, r.h * clamp(pl.sendCd / CFG.versus.sendCd, 0, 1)); ctx.restore(); }
        ctx.restore();
      });
    }
    // pouvoir
    var B = o.pow, pw = pl.power, hovP = hoverBtn === "pow" + pi, bounce = 1 + u.powerPop * 0.2 * Math.sin(u.powerPop * 12);
    var gk = vs ? pl.gauge / CFG.versus.gauge : w.coop / CFG.coopGauge;
    box(B, pw ? (hovP ? "rgba(255,230,140,.25)" : "rgba(255,230,140,.14)") : "rgba(255,255,255,.05)", 12);
    if (pw) { rrect(ctx, B.x, B.y, B.w, B.h, 12); ctx.lineWidth = 2.5; ctx.strokeStyle = hexA("#ffd257", 0.5 + 0.4 * Math.sin(clock * 4)); ctx.stroke(); }
    var ir = Math.min(22, B.h * 0.34);
    if (pw || pl.rainbow) {
      var kind = pw || "rainbow";
      ctx.save(); ctx.translate(B.x + ir + 10, B.y + B.h / 2); ctx.scale(bounce, bounce); ctx.rotate(Math.sin(clock * 3) * 0.08); drawPowerIcon(ctx, kind, 0, 0, ir); ctx.restore();
      var tx = B.x + ir * 2 + 20;
      T(POWER_NAME[kind] + (pw ? "" : " actif"), tx, B.y + (B.h < 84 ? B.h / 2 - 5 : 17), nar ? 14 : 16, 900, "#fff");
      var hint = pw ? (pw === "meteor" ? (u.aim ? "Touche une ligne !" : "Touche pour viser") : pw === "rainbow" || pw === "heal" ? "Touche pour l'utiliser" : w.state !== "wave" ? "Pendant la vague" : "Touche pour lancer") : "Fusionne 2 pièces";
      T(hint, tx, B.y + (B.h >= 84 ? B.h - 14 : B.h / 2 + 10), 11, 800, u.aim ? "#ffe066" : "#ffd9a8");
      if (B.h >= 84) wrapText(POWER_DESC[kind], tx, B.y + 38, B.w - (tx - B.x) - 8, 14, 11.5, "#d9cdf0", 4);
    } else {
      T(nar ? "Pouvoir" : "POUVOIR", B.x + 10, B.y + (nar ? B.h / 2 - 8 : 17), nar ? 12 : 12, 800, "#bfb2d8");
      var gbar = { x: B.x + 10, y: B.y + B.h / 2 + (nar ? 6 : 6), w: B.w - 20, h: 14 };
      bar(gbar, gk, col.main, "#ffd257");
      T(vs ? Math.min(pl.gauge, CFG.versus.gauge) + "/" + CFG.versus.gauge + " éliminations" : w.coop + "/" + CFG.coopGauge + " (combos coop)", gbar.x + gbar.w / 2, gbar.y + 7.5, 10, 900, "#fff", "center");
    }
    if (!nar && (pw || pl.rainbow)) T(pi === 0 ? "touche E" : "Maj droite", B.x + B.w - 8, B.y + 17, 10.5, 800, "#bfb2d8", "right");
    ctx.restore();
  }

  function drawBanner() {
    if (!banner) return;
    ctx.textBaseline = "alphabetic";
    var t = banner.t, k = t < 0.25 ? easeOut(t / 0.25) : 1, a = t > banner.dur - 0.4 ? (banner.dur - t) / 0.4 : 1;
    var y = BY + BH * 0.3;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(KING_X, y); ctx.scale(0.6 + 0.4 * k + (t < 0.4 ? Math.sin(t / 0.4 * Math.PI) * 0.08 : 0), 0.6 + 0.4 * k);
    var bw = 470, bh = 92;
    rrect(ctx, -bw / 2, -bh / 2, bw, bh, 24); ctx.fillStyle = "rgba(36,26,58,.9)"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#ffd257"; ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "900 34px " + FF; ctx.fillStyle = "#ffd257"; ctx.fillText(banner.t1, 0, 2);
    ctx.font = "800 17px " + FF; ctx.fillStyle = "#fff"; ctx.fillText(banner.t2 || "", 0, 30);
    ctx.restore();
  }

  function drawCircles() {
    circles.forEach(function (c) {
      var k = c.life / c.max, a = 1 - k;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, 0.4);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(0, 0, 20 + k * 22, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = c.color; ctx.stroke();
      ctx.rotate(clock * 3);
      for (var i = 0; i < 6; i++) { ctx.rotate(TAU / 6); star(ctx, 30 + k * 10, 0, 5, 4, 0.4); ctx.fillStyle = "#fff"; ctx.fill(); }
      var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, hexA(c.light, 0.8 * a)); gr.addColorStop(1, hexA(c.light, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  function drawUnits() {
    // ordre de dessin : de haut en bas (ce qui est devant passe devant)
    var list = [];
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var pc = w.grid[c][r]; if (pc) list.push({ y: cellY(r) + CELL * 0.32, pc: pc }); }
    for (var id in evis) list.push({ y: evis[id].y, ev: evis[id] });
    leakers.forEach(function (L) { list.push({ y: 9999, lk: L }); });
    deaths.forEach(function (d) { list.push({ y: d.y, dead: d }); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) {
      if (it.pc) drawBoardPiece(it.pc);
      else if (it.ev) drawBoardEnemy(it.ev);
      else if (it.lk) {
        var L = it.lk, k = clamp(L.t / 0.45, 0, 1), x = lerp(L.x0, kingPos(L.p).x + (L.x0 - kingPos(L.p).x) * 0.3, k), y = lerp(L.y0, KING_Y - 30, easeInOut(k)) - Math.sin(k * Math.PI) * 30;
        drawEnemy(ctx, L.v.type, x, y, CELL, { sx: 1 - k * 0.2, sy: 1 + k * 0.2 });
      } else {
        var d = it.dead, kk = d.t / 0.16;
        drawEnemy(ctx, d.type, d.x, d.y, CELL, { sx: 1 + kk * 0.5, sy: 1 - kk * 0.55, flash: 1, alpha: 1 - kk * 0.6 });
      }
    });
  }
  function drawBoardPiece(pc) {
    var v = pv(pc);
    if (clock < v.hideUntil) return;
    var x = cellX(pc.c), y = cellY(pc.r) + CELL * 0.32;
    var o = { seed: v.seed, blink: v.blink < 0, dir: pc.owner === 0 ? 1 : -1 };
    var sx = 1, sy = 1, oy = 0, ox = 0;
    // apparition : chute + squash & stretch
    var age = clock - v.born;
    if (age < 0) return;
    if (v.fuse && age < 0.55) {
      // la pièce fusionnée émerge du flash avec un gros rebond élastique
      var kf = age / 0.55, sc = easeOut(Math.min(1, kf * 1.6)) + Math.sin(kf * Math.PI * 2.6) * (1 - kf) * 0.32;
      sx = sc * (1 + 0.15 * Math.sin(kf * Math.PI * 3) * (1 - kf)); sy = sc * (1 - 0.12 * Math.sin(kf * Math.PI * 3) * (1 - kf));
      oy = -10 * Math.sin(kf * Math.PI) ;
    } else if (age < 0.5 && !v.fuse) {
      var k = age / 0.5;
      if (k < 0.3) { var kk = k / 0.3; oy = -36 * (1 - kk * kk); sx = 0.6 + kk * 0.3; sy = 1.35 - kk * 0.25; }
      else { var k2 = (k - 0.3) / 0.7, wob = Math.sin(k2 * Math.PI * 3) * (1 - k2); sx = 1 + 0.3 * wob; sy = 1 - 0.3 * wob; }
      if (k >= 0.3 && !v.landedOnce) { v.landedOnce = true; SFX.land(); burst(x, y - 4, 6, { colors: ["#fff", PCOL[pc.owner].light], min: 30, max: 100, life: 0.3, size: 3, g: 100 }); }
    }
    // respiration
    var br = Math.sin(clock * 2.2 + v.seed) * 0.025;
    sx *= 1 - br; sy *= 1 + br;
    if (pc.type === "bishop") oy += Math.sin(clock * 2 + v.seed) * 1.5;
    // ressort (tirs, fusion, amélioration)
    sx *= 1 + v.sq * 0.5; sy *= 1 - v.sq * 0.5;
    if (pc.type === "rook") ox = v.rdir * v.recoil * 6;
    if (pc.type === "knight") { var j = v.jump; if (j > 0) oy -= Math.sin((1 - j) * Math.PI) * 14; }
    // anticipation : la pièce se prépare juste avant de tirer
    if (w.state === "wave" && pc.cd < 0.16 && pc.cd > 0) {
      if (pc.type === "knight") { sx *= 1.08; sy *= 0.9; }
      if (pc.type === "bishop") o.cast = Math.max(o.cast || 0, 0.5 * (1 - pc.cd / 0.16));
    }
    o.cast = Math.max(o.cast || 0, v.cast);
    var u = ui[pc.owner], sel = u.sel && u.sel.id === pc.id;
    var sp = selPiece(u), compat = sp && !sel && K.canFuse(w, pc.owner, sp, pc, w.players[pc.owner].rainbow);
    if (sel) { oy -= 6 + Math.sin(clock * 8) * 2; o.happy = true; }
    if (w.players[pc.owner].rainbow && (!sp || compat || sel) && pc.lvl < CFG.maxLevel) drawRainbowRing(x, y);
    if (sel || compat) {
      ctx.save();
      var pr = 0.6 + 0.4 * Math.sin(clock * 7);
      ctx.translate(x, y - 6); ctx.scale(1, 0.42);
      ctx.beginPath(); ctx.arc(0, 0, CELL * 0.4, 0, TAU);
      ctx.lineWidth = sel ? 7 : 5; ctx.strokeStyle = sel ? "#fff" : hexA("#ffe066", 0.5 + 0.5 * pr); ctx.stroke();
      ctx.restore();
    }
    o.sx = sx; o.sy = sy; o.ox = ox; o.oy = oy;
    drawPiece(ctx, pc.type, pc.owner, pc.lvl, x, y, CELL, o);
    if (compat) {
      // flèche de fusion qui sautille
      var ay = y - CELL * 0.95 + Math.sin(clock * 8) * 3;
      ctx.beginPath(); ctx.moveTo(x, ay - 8); ctx.lineTo(x + 8, ay + 2); ctx.lineTo(x + 3, ay + 2); ctx.lineTo(x + 3, ay + 9); ctx.lineTo(x - 3, ay + 9); ctx.lineTo(x - 3, ay + 2); ctx.lineTo(x - 8, ay + 2); ctx.closePath();
      ctx.fillStyle = "#ffe066"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  function drawRainbowRing(x, y) {
    ctx.save(); ctx.translate(x, y - 6); ctx.scale(1, 0.42);
    var cols = ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"];
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(0, 0, CELL * 0.42, clock * 2 + i * TAU / 6, clock * 2 + (i + 1) * TAU / 6); ctx.lineWidth = 4; ctx.strokeStyle = cols[i]; ctx.stroke(); }
    ctx.restore();
  }
  function drawBoardEnemy(v) {
    var e = null;
    for (var i = 0; i < w.enemies.length; i++) if (w.enemies[i].id === v.id) { e = w.enemies[i]; break; }
    var sx = 1 + v.sq * 0.6, sy = 1 - v.sq * 0.6;
    var hopping = v.hop < 1;
    if (hopping) { var hk = Math.sin(v.hop * Math.PI); sx *= 1 - hk * 0.12; sy *= 1 + hk * 0.15; }
    var alpha = clamp((clock - v.born) / 0.25, 0, 1);
    var bob = Math.sin(clock * 3 + v.seed) * 0.03;
    sx *= 1 + bob; sy *= 1 - bob;
    var frozen = w.freeze[v.target > 0 ? v.target : 0] > 0;
    if (isVs() && v.target >= 0) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(v.x, v.y + 2, 24, 8, 0, 0, TAU); ctx.strokeStyle = PCOL[v.target].main; ctx.lineWidth = 4; ctx.globalAlpha = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(v.x - 7, v.y - 66); ctx.lineTo(v.x + 7, v.y - 66); ctx.lineTo(v.x, v.y - 55); ctx.closePath(); ctx.fillStyle = PCOL[v.target].main; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      if (v.sentBy >= 0) { star(ctx, v.x, v.y - 74, 6, 4, 0.4); ctx.fillStyle = PCOL[v.sentBy].light; ctx.fill(); }
      ctx.restore();
    }
    drawEnemy(ctx, v.type, v.x, v.y + v.knock, CELL, { sx: sx, sy: sy, flash: v.flash, blink: v.blink < 0, walk: hopping ? v.hop * 2 : 0, alpha: alpha, frozen: frozen });
    // barre de vie
    if (e && v.hpShown < 0.999) {
      var bw = v.type === "boss" ? 70 : 42, bx = v.x - bw / 2, by = v.y + 4;
      rrect(ctx, bx - 2, by - 2, bw + 4, 9, 4.5); ctx.fillStyle = "rgba(40,25,60,.8)"; ctx.fill();
      rrect(ctx, bx, by, Math.max(3, bw * clamp(v.hpShown, 0, 1)), 5, 2.5); ctx.fillStyle = v.hpShown > 0.5 ? "#7be07f" : v.hpShown > 0.25 ? "#ffd257" : "#ff6b6b"; ctx.fill();
    }
    if (e && e.armor && v.type === "armored") { /* l'armure se voit déjà au casque */ }
  }
  function drawShots() {
    vshots.forEach(function (s) {
      var p = shotPos(s), col = PCOL[s.owner], lvl = s.lvl;
      var sz = 1 + (lvl - 1) * 0.18;
      if (s.type === "pawn") {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.8 * sz, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.dark; ctx.stroke();
      } else if (s.type === "queen") {
        var qg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16 * sz);
        qg.addColorStop(0, "rgba(255,250,210,1)"); qg.addColorStop(0.4, "rgba(255,210,90,.85)"); qg.addColorStop(1, "rgba(255,210,90,0)");
        ctx.fillStyle = qg; ctx.beginPath(); ctx.arc(p.x, p.y, 16 * sz, 0, TAU); ctx.fill();
        star(ctx, p.x, p.y, 7 * sz, 5, 0.45); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.dark; ctx.stroke();
      } else if (s.type === "rook") {
        var dx = s.tx - s.x0, dy = s.ty - s.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        ctx.beginPath(); ctx.moveTo(p.x - ux * 18 * sz, p.y - uy * 18 * sz); ctx.lineTo(p.x, p.y);
        ctx.lineCap = "round"; ctx.lineWidth = 7 * sz; ctx.strokeStyle = hexA(col.main, 0.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 5 * sz, 0, TAU); ctx.fillStyle = lvl >= 4 ? "#ffd257" : "#fff"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col.dark; ctx.stroke();
      } else if (s.type === "bishop") {
        var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14 * sz);
        gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.4, hexA(col.main, 0.8)); gr.addColorStop(1, hexA(col.main, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 14 * sz, 0, TAU); ctx.fill();
        star(ctx, p.x, p.y, 5 * sz, 4, 0.4); ctx.fillStyle = "#fff"; ctx.fill();
      } else {
        // fer à cheval qui tourne en sautant
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.k * TAU * 1.5 * (s.owner ? -1 : 1)); ctx.scale(sz, sz);
        ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI * 0.15, Math.PI * 1.85, false);
        ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = 3.5; ctx.strokeStyle = lvl >= 3 ? "#ffd257" : "#e8eaf2"; ctx.stroke();
        ctx.restore();
      }
    });
  }
  function drawFusions() {
    fusions.forEach(function (f) {
      var t = f.t, p = f.p;
      if (t < 0.34) {
        var shakeA = t < 0.12 ? Math.sin(t * 120) * 2.5 : 0;
        var k = t < 0.12 ? 0 : easeInOut((t - 0.12) / 0.22);
        // pièce d'arrivée : se compresse
        var cs = t < 0.12 ? 1 : 1 - k * 0.35;
        drawPiece(ctx, f.into.type, p, f.into.lvl, f.into.x + shakeA, f.into.y, CELL, { sx: cs * (1 + k * 0.2), sy: cs, noStars: k > 0.5, flash: k * 0.8, noAura: true });
        // pièce qui rejoint : attirée, étirée
        var x = lerp(f.from.x, f.into.x, k) - shakeA, y = lerp(f.from.y, f.into.y, k) - Math.sin(k * Math.PI) * 26;
        drawPiece(ctx, f.from.type, p, f.from.lvl, x, y, CELL, { sx: (1 - k * 0.45) * (1 - k * 0.2), sy: (1 - k * 0.45) * (1 + k * 0.35), alpha: 1 - k * 0.3, noStars: k > 0.3, flash: k, noAura: true });
        if (k > 0 && fxOn() && Math.random() < 0.6) part({ x: x + rnd(-8, 8), y: y - 20 + rnd(-8, 8), vx: 0, vy: -20, life: 0, max: 0.3, size: 3, color: PCOL[p].light, kind: "dot", g: 0, drag: 1, rot: 0, vr: 0 });
      }
      // lueur au moment du flash
      if (t > 0.28 && t < 0.6) {
        var a = 1 - (t - 0.28) / 0.32;
        var gr = ctx.createRadialGradient(f.into.x, f.into.y - 28, 0, f.into.x, f.into.y - 28, 70);
        gr.addColorStop(0, "rgba(255,255,235," + (0.9 * a) + ")"); gr.addColorStop(1, "rgba(255,255,235,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.into.x, f.into.y - 28, 70, 0, TAU); ctx.fill();
      }
    });
  }
  function drawRays() {
    rays.forEach(function (r) {
      var k = r.life / r.max, a = Math.sin(k * Math.PI);
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(clock * 1.5);
      ctx.globalAlpha = a * 0.55;
      for (var i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(120, -10); ctx.lineTo(120, 10); ctx.closePath();
        ctx.fillStyle = r.gold ? "#ffd257" : "#fff6d0"; ctx.fill();
      }
      ctx.restore();
    });
  }
  function drawParticles() {
    parts.forEach(function (p) {
      var k = p.life / p.max, a = p.kind === "gem" ? 1 : 1 - k * k;
      ctx.globalAlpha = a;
      var s = p.size * (p.kind === "confetti" || p.kind === "snow" ? 1 : 1 - k * 0.5);
      if (p.kind === "star") { star(ctx, p.x, p.y, s * 1.4, 5, 0.45); ctx.fillStyle = p.color; ctx.fill(); }
      else if (p.kind === "heart") { heart(ctx, p.x, p.y, s * 2.2); ctx.fillStyle = p.color; ctx.fill(); }
      else if (p.kind === "gem") { drawGem(ctx, p.x, p.y, 6, PCOL[p.p], 0); }
      else if (p.kind === "confetti") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9); ctx.restore(); }
      else if (p.kind === "snow") { star(ctx, p.x, p.y, s, 6, 0.35); ctx.fillStyle = "#fff"; ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fillStyle = p.color; ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }
  function drawRings() {
    rings.forEach(function (r) {
      var k = r.life / r.max, e = easeOut(k);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, e), 0, TAU);
      ctx.lineWidth = r.width * (1 - k * 0.7); ctx.strokeStyle = r.color; ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  function drawBeams() {
    beams.forEach(function (b) {
      var k = b.life / b.max, head = easeOut(Math.min(1, k * 2)), tail = easeOut(Math.max(0, k * 2 - 1));
      var x0 = lerp(b.x0, b.x1, tail), y0 = lerp(b.y0, b.y1, tail), x1 = lerp(b.x0, b.x1, head), y1 = lerp(b.y0, b.y1, head);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineCap = "round";
      ctx.lineWidth = 12; ctx.strokeStyle = hexA(b.color, 0.35); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
    });
  }
  function drawDrag() {
    ui.forEach(function (u) {
      if (!u.drag || !u.drag.moved) return;
      var pc = selPiece(u); if (!pc) return;
      drawPiece(ctx, pc.type, pc.owner, pc.lvl, mouse.x, mouse.y + 26, CELL, { alpha: 0.75, sx: 1.05, sy: 1.05, noAura: true });
    });
  }
  function drawCursors(top) {
    if (mode !== "play" && mode !== "pause") return;
    ui.forEach(function (u, pi) {
      var col = PCOL[pi], x = u.cx + (u.deny > 0 ? Math.sin(u.deny * 40) * 6 * u.deny : 0), y = u.cy;
      var h = CELL / 2 - 2, pulse = 1 + 0.04 * Math.sin(clock * 6 + pi);
      if (!top) {
        ctx.globalAlpha = 0.25; rrect(ctx, x - h, y - h, h * 2, h * 2, 12); ctx.fillStyle = u.deny > 0 ? "#ff7a7a" : col.main; ctx.fill(); ctx.globalAlpha = 1;
        return;
      }
      // coins animés
      ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
      ctx.strokeStyle = u.deny > 0 ? "#e04848" : col.dark; ctx.lineWidth = 5; ctx.lineCap = "round";
      var L = 14;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(d[0] * h, d[1] * (h - L)); ctx.lineTo(d[0] * h, d[1] * h); ctx.lineTo(d[0] * (h - L), d[1] * h); ctx.stroke();
      });
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(d[0] * h, d[1] * (h - L)); ctx.lineTo(d[0] * h, d[1] * h); ctx.lineTo(d[0] * (h - L), d[1] * h); ctx.stroke();
      });
      ctx.restore();
      // étiquette J1 / J2
      var tx = x + (pi === 0 ? -h + 4 : h - 4), ty = y - h - 2;
      ctx.font = "900 " + fz(12) + "px " + FF; ctx.textAlign = "center";
      rrect(ctx, tx - 13, ty - 10, 26, 16, 8); ctx.fillStyle = col.dark; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(col.short, tx, ty + 2);
      // aperçu de l'action
      var pc = K.pieceAt(w, u.cur.c, u.cur.r), sp = selPiece(u);
      if (!pc && !sp && mode === "play") {
        var ok = w.players[pi].mana >= CFG.summonCost;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(clock * 4);
        ctx.font = "900 " + fz(22) + "px " + FF; ctx.fillStyle = ok ? col.dark : "#9a8aa6"; ctx.fillText("+", x, y + 2);
        ctx.font = "800 " + fz(11) + "px " + FF; ctx.fillText(CFG.summonCost + " mana", x, y + 18);
        ctx.globalAlpha = 1;
      }
      if (u.denyT > 0) {
        ctx.globalAlpha = Math.min(1, u.denyT * 3);
        ctx.font = "800 " + fz(13) + "px " + FF;
        var tw = ctx.measureText(u.denyMsg).width + 16;
        rrect(ctx, x - tw / 2, y - h - 34, tw, 22, 11); ctx.fillStyle = "#e04848"; ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillText(u.denyMsg, x, y - h - 19);
        ctx.globalAlpha = 1;
      }
    });
  }


  /* ====================== JEU EN LIGNE ====================== */
  var NET = { started: false, on: false, role: null, kind: "coop", code: "", id: Math.random().toString(36).slice(2, 10), roster: [], status: "", err: "",
    api: null, out: [], acc: 0, curAcc: 0, otherId: null, sentCur: "", ts: 0 };
  function isHost() { return NET.started && NET.role === "host"; }
  function isGuest() { return NET.started && NET.role === "guest"; }
  function netSend(ev, payload) { if (NET.api) NET.api.send(ev, payload); }
  function netMeta() { return { id: NET.id, host: NET.role === "host", ingame: NET.started, ts: NET.ts, v: VERSION, kind: NET.kind }; }
  function netTrack() { if (NET.api) NET.api.track(netMeta()); }
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; return s; }

  function netJoin(code, asHost, kind) {
    netLeave();
    NET.role = asHost ? "host" : "guest"; NET.code = code; NET.status = "connexion"; NET.err = ""; NET.started = false; NET.roster = []; NET.ts = Date.now();
    if (asHost && kind) NET.kind = kind;
    var api = NETM && NETM.open({
      code: code, id: NET.id, meta: netMeta, events: ["start", "s", "cmd", "cur", "emo"],
      onEvent: function (evn, payload) { try { onNet(evn, payload); } catch (err) { if (window.console) console.error(err); } },
      onRoster: onRoster,
      onStatus: function (st) {
        NET.status = st;
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
        if (mode === "menu") showOnline();
      },
    });
    if (!api) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; NET.role = null; showOnline(); return; }
    NET.api = api; NET.on = true;
    // émotes (bouton 😀 / touche T), sauf pendant une manche de party (elle s'en charge)
    if (window.Party && window.Party.emoteBridge) window.Party.emoteBridge({ send: function (i, n, c) { api.send("emo", { n: n, i: i, c: c }); } });
    if (history.replaceState && !party) history.replaceState(null, "", "#kd=" + code);
    showOnline();
  }
  function netLeave() {
    if (NET.api && window.Party && window.Party.emoteBridgeOff) window.Party.emoteBridgeOff();
    if (NET.api) { try { NET.api.close(); } catch (e) {} }
    NET.api = null; NET.on = false; NET.role = null; NET.started = false; NET.roster = []; NET.code = ""; NET.otherId = null; NET.out = [];
  }
  function onRoster(list) {
    NET.roster = list;
    if (NET.role === "guest" && !NET.started) {
      var idx = list.map(function (x) { return x.id; }).indexOf(NET.id);
      if (idx >= 2) { NET.err = "Salon plein (2 joueurs max)."; netLeave(); showOnline(); return; }
      var host = list.filter(function (x) { return x.host; })[0];
      if (host && host.kind) NET.kind = host.kind;
    }
    // l'autre joueur absent : on attend 4 s avant de conclure (la présence clignote parfois quand quelqu'un met à jour son état)
    if (NET.started && NET.otherId && !list.some(function (x) { return x.id === NET.otherId; })) {
      if (!NET.goneT) NET.goneT = setTimeout(function () {
        NET.goneT = 0;
        if (!NET.started || !NET.otherId || NET.roster.some(function (x) { return x.id === NET.otherId; })) return;
        leaveOnline(NET.role === "host" ? "L'autre joueur a quitté la partie." : "L'hôte a quitté la partie.");
      }, 4000);
    }
    if (mode === "menu") showOnline();
  }
  function leaveOnline(msg) {
    if (party && !party.ended) { party.ended = true; window.Party.over({ score: partyScore(), alive: true }); }
    overToken++;
    netLeave(); stopMusic(); hide();
    newGame("coop"); menu();
    if (msg) { card.insertAdjacentHTML("afterbegin", '<p class="kd-note">' + esc(msg) + "</p>"); }
  }
  function hostStart() {
    if (NET.role !== "host" || NET.roster.length < 2) return;
    var other = NET.roster.filter(function (x) { return x.id !== NET.id; })[0];
    if (!other) return;
    var info = { kind: NET.kind, ids: [NET.id, other.id], v: VERSION };
    netSend("start", info);
    startOnline(info);
  }
  function startOnline(info) {
    NET.started = true; NET.out = []; NET.acc = 0; NET.kind = info.kind;
    NET.otherId = info.ids[NET.role === "host" ? 1 : 0];
    netTrack();
    G.me = myIdx();
    startPlay(info.kind);
  }
  function onNet(evn, d) {
    if (evn === "start") { if (NET.role === "guest") startOnline(d); }
    else if (evn === "s") { if (isGuest() && w) { applyRemote(d); } }
    else if (evn === "cmd") { if (isHost() && mode === "play") applyCmd(1, d); }
    else if (evn === "emo") { if (window.Party && d) window.Party.emoteFrom(d.n, d.i, d.c); }
    else if (evn === "cur") { if (NET.started && ui && d && d.p === 1 - myIdx() && K.inZone(d.p, d.c, d.r)) ui[d.p].cur = { c: d.c, r: d.r }; }
  }
  // l'invité : rejoue les effets, puis copie l'état exact de l'hôte
  function applyRemote(d) {
    (d.e || []).forEach(function (e) { onEvent(e); });
    K.applySnapshot(w, d.s);
    var alive = {};
    w.enemies.forEach(function (e) {
      alive[e.id] = 1;
      var v = evis[e.id];
      if (!v) { v = ev(e); v.fromR = e.r - 1; v.toR = e.r; v.hop = 1; v.landed = true; v.y = cellY(e.r) + CELL * 0.3; v.born = clock - 1; }
      v.hp = e.hp; v.maxHp = e.maxHp;
    });
    for (var id in evis) if (!alive[id]) delete evis[id];
    updateLaunch();
  }
  function netTick(dt) {
    if (!NET.started || !w) return;
    NET.acc += dt; NET.curAcc += dt;
    if (NET.role === "host") {
      var per = w.state === "wave" ? 0.1 : 0.25;
      if (NET.acc >= per || NET.out.length > 30) { NET.acc = 0; netSend("s", { s: K.snapshot(w), e: NET.out }); NET.out = []; }
    }
    if (NET.curAcc > 0.1 && ui) {
      NET.curAcc = 0;
      var me = myIdx(), cur = ui[me].cur, key = cur.c + "," + cur.r;
      if (key !== NET.sentCur) { NET.sentCur = key; netSend("cur", { p: me, c: cur.c, r: cur.r }); }
    }
  }

  /* ====================== ACTIONS DES JOUEURS ====================== */
  function deny(p, msg) { var u = ui[p]; u.deny = 1; u.denyMsg = msg; u.denyT = 1.1; SFX.deny(); }
  function moveCursor(p, dc, dr) {
    var u = ui[p], z = CFG.zones[p];
    var c = clamp(u.cur.c + dc, z[0], z[z.length - 1]), r = clamp(u.cur.r + dr, 0, CFG.rows - 1);
    u.lastMove = clock;
    if (c !== u.cur.c || r !== u.cur.r) { u.cur = { c: c, r: r }; SFX.move(); }
  }
  function pieceById(id) {
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var pc = w.grid[c][r]; if (pc && pc.id === id) return pc; }
    return null;
  }
  // exécute une commande sur le monde (hôte / même écran) ou l'envoie à l'hôte (invité)
  function exec(p, cmd) {
    if (isGuest()) { netSend("cmd", cmd); return "sent"; }
    return applyCmd(p, cmd);
  }
  function applyCmd(p, cmd) {
    if (!cmd || !w || w.state === "over") return "over";
    var res = "none";
    switch (cmd.k) {
      case "summon": res = K.summon(w, p, cmd.c | 0, cmd.r | 0); if (res === "mana") deny(p, "Pas assez de mana"); else if (res !== "ok") deny(p, "Impossible ici"); break;
      case "fuse": res = K.fuse(w, p, pieceById(cmd.a), pieceById(cmd.b), !!cmd.rb) ? "ok" : "bad"; break;
      case "upg": res = K.upgrade(w, p, cmd.t); if (res === "mana") deny(p, "Pas assez de mana"); break;
      case "pow": res = K.usePower(w, p, cmd.row); ui[p].aim = false; break;
      case "send": res = K.send(w, p, cmd.t); break;
      case "launch": res = K.launch(w, p) ? "ok" : "bad"; if (res === "ok") updateLaunch(); break;
    }
    handleEvents();
    return res;
  }

  // le bouton d'action : invoquer / sélectionner / fusionner / annuler
  function act(p, c, r) {
    if (mode !== "play" || w.state === "over" || !canCtl(p)) return;
    var u = ui[p];
    if (!K.inZone(p, c, r)) return;
    u.cur = { c: c, r: r }; u.lastMove = clock;
    var pc = K.pieceAt(w, c, r), sp = selPiece(u), rb = w.players[p].rainbow;
    if (sp) {
      if (pc === sp) { u.sel = null; SFX.deselect(); return; }
      if (pc && K.canFuse(w, p, sp, pc, rb)) { u.sel = null; exec(p, { k: "fuse", a: sp.id, b: pc.id, rb: rb ? 1 : 0 }); return; }
      if (pc) {
        u.sel = { c: c, r: r, id: pc.id }; SFX.select(); tutoEvent("select");
        if (pc.lvl === sp.lvl && pc.type !== sp.type && !rb) { u.denyMsg = "Pas le même type"; u.denyT = 0.8; }
        else if (pc.type === sp.type && pc.lvl !== sp.lvl) { u.denyMsg = "Pas le même niveau"; u.denyT = 0.8; }
        return;
      }
      u.sel = null; SFX.deselect(); return;
    }
    if (pc) { u.sel = { c: c, r: r, id: pc.id }; SFX.select(); pv(pc).sq = 0.2; pv(pc).sqv = 0; tutoEvent("select"); return; }
    if (w.players[p].mana < CFG.summonCost) { deny(p, "Pas assez de mana"); return; }
    exec(p, { k: "summon", c: c, r: r });
  }
  function tryUpgrade(p, i) {
    if (mode !== "play" || !canCtl(p) || !K.TYPES[i]) return;
    if (w.players[p].mana < K.upgradeCost(w, p, K.TYPES[i])) { deny(p, "Pas assez de mana"); return; }
    exec(p, { k: "upg", t: K.TYPES[i] });
  }
  function trySend(p, i) {
    if (mode !== "play" || !canCtl(p) || !isVs()) return;
    var t = SEND_TYPES[i], pl = w.players[p];
    if (w.state !== "wave") { deny(p, "Pendant la vague"); return; }
    if (pl.sendCd > 0) return;
    if (pl.mana < CFG.versus.send[t]) { deny(p, "Pas assez de mana"); return; }
    exec(p, { k: "send", t: t });
  }
  function tryPower(p, row) {
    if (mode !== "play" || !canCtl(p)) return;
    var pl = w.players[p], u = ui[p], kind = pl.power;
    if (!kind) { deny(p, pl.rainbow ? "Choisis 2 pièces" : "Pas de pouvoir"); return; }
    if (kind !== "rainbow" && kind !== "heal" && w.state !== "wave") { deny(p, "Attends la vague"); return; }
    if (kind === "heal" && K.kingOf(w, p) >= CFG.kingHp) { deny(p, "Roi en pleine forme"); return; }
    if (kind === "meteor" && row == null) { u.aim = !u.aim; u.lastMove = clock; SFX.select(); return; }
    u.aim = false;
    exec(p, { k: "pow", row: row });
  }
  function doLaunch(p) {
    if (mode !== "play" || !w || w.state !== "prep") return;
    if (isVs() && (!canCtl(p) || w.ready[p])) return;
    exec(isVs() ? p : (NET.started ? myIdx() : 0), { k: "launch" });
  }
  function updateLaunch() {
    if (!launchBtn) return;
    var show = mode === "play" && w && w.state === "prep" && !isVs() && W > 0;
    launchBtn.hidden = !show;
    if (show) {
      var sp = w2scr(KING_X, BY - 52);
      launchBtn.style.left = sp.x + "px"; launchBtn.style.top = sp.y + "px";
      var b = launchBtn.querySelector("b"); if (b) b.textContent = String(w.wave);
    }
  }

  /* ====================== COMMANDES : CLAVIER ====================== */
  // codes physiques : ZQSD en AZERTY = WASD en QWERTY, mêmes touches
  var KEYS = {
    KeyW: [0, "up"], KeyS: [0, "down"], KeyA: [0, "left"], KeyD: [0, "right"], Space: [0, "act"], KeyE: [0, "power"], KeyV: [0, "ready"],
    Digit1: [0, "u0"], Digit2: [0, "u1"], Digit3: [0, "u2"], Digit4: [0, "u3"], Digit5: [0, "u4"], KeyR: [0, "s0"], KeyT: [0, "s1"], KeyY: [0, "s2"],
    ArrowUp: [1, "up"], ArrowDown: [1, "down"], ArrowLeft: [1, "left"], ArrowRight: [1, "right"], Enter: [1, "act"], NumpadEnter: [1, "act"],
    ShiftRight: [1, "power"], Numpad0: [1, "power"], Backspace: [1, "ready"], KeyB: [1, "ready"],
    Digit6: [1, "u0"], Digit7: [1, "u1"], Digit8: [1, "u2"], Digit9: [1, "u3"], Digit0: [1, "u4"],
    Numpad1: [1, "u0"], Numpad2: [1, "u1"], Numpad3: [1, "u2"], Numpad4: [1, "u3"], Numpad5: [1, "u4"],
    Comma: [1, "s0"], Period: [1, "s1"], Slash: [1, "s2"],
  };
  function visible() { return !stage.hidden; }
  document.addEventListener("keydown", function (e) {
    if (!visible() || (e.target && /input|textarea|select/i.test(e.target.tagName))) return;
    audio();
    if (mode === "menu" || mode === "over") {
      if (e.target && e.target.closest && e.target.closest("button, summary, a")) return;
      if ((e.code === "Enter" || e.code === "Space") && mode === "over" && overlay.hidden === false && !isGuest()) { e.preventDefault(); if (NET.started) hostRematch(); else start(G.kind); }
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); if (mode === "pause" || pauseOpen) resume(); else pause(); return; }
    if (mode !== "play" || pauseOpen) return;
    var m = KEYS[e.code]; if (!m) return;
    e.preventDefault();
    var p = NET.started ? myIdx() : m[0], a = m[1];
    if (a === "up") moveCursor(p, 0, -1);
    else if (a === "down") moveCursor(p, 0, 1);
    else if (a === "left") moveCursor(p, -1, 0);
    else if (a === "right") moveCursor(p, 1, 0);
    else if (e.repeat) return;
    else if (a === "act") act(p, ui[p].cur.c, ui[p].cur.r);
    else if (a === "power") tryPower(p, ui[p].cur.r);
    else if (a === "ready") doLaunch(p);
    else if (a[0] === "u") tryUpgrade(p, Number(a[1]));
    else if (a[0] === "s") trySend(p, Number(a[1]));
  });
  // V / B lancent aussi la vague en coop (peu importe le joueur)

  /* ====================== COMMANDES : SOURIS / DOIGT ====================== */
  function toScr(e) { var rc = canvas.getBoundingClientRect(); return { x: e.clientX - rc.left, y: e.clientY - rc.top }; }
  function cellAt(x, y) { var c = Math.floor((x - BX) / CELL), r = Math.floor((y - BY) / CELL); return c >= 0 && c < 7 && r >= 0 && r < 7 ? { c: c, r: r } : null; }
  function hoverKey(h) { return !h ? null : h.k === "upg" ? "upg" + h.p + h.i : h.k === "send" ? "snd" + h.p + h.i : h.k === "pow" ? "pow" + h.p : h.k === "ready" ? "rdy" + h.p : null; }
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointermove", function (e) {
    var s = toScr(e), f = scr2w(s.x, s.y); mouse.x = f.x; mouse.y = f.y; mouse.in = true;
    if (mode !== "play" || !ui) return;
    if (e.pointerType === "mouse") {
      var h = hitAt(s.x, s.y), hk = hoverKey(h);
      if (hk !== hoverBtn) { hoverBtn = hk; if (hk) SFX.hover(); }
      var cl = cellAt(f.x, f.y);
      canvas.style.cursor = hk ? "pointer" : cl && (K.ownerOfCol(cl.c) >= 0 || ui.some(function (u) { return u.aim; })) ? "pointer" : "default";
      if (cl && !h) { var p = K.ownerOfCol(cl.c); if (p >= 0 && canCtl(p)) { if (ui[p].cur.c !== cl.c || ui[p].cur.r !== cl.r) ui[p].cur = cl; ui[p].lastMove = clock; } }
    }
    ui.forEach(function (u) { if (u.drag && Math.hypot(f.x - u.drag.x, f.y - u.drag.y) > 10) u.drag.moved = true; });
  });
  canvas.addEventListener("pointerleave", function () { mouse.in = false; hoverBtn = null; });
  canvas.addEventListener("pointerdown", function (e) {
    audio();
    if (mode !== "play" || !ui || pauseOpen) return;
    var s = toScr(e), f = scr2w(s.x, s.y);
    if (e.button === 2) { ui.forEach(function (u) { if (u.sel || u.aim) SFX.deselect(); u.sel = null; u.aim = false; }); return; }
    var h = hitAt(s.x, s.y);
    if (h) {
      if (h.k === "upg") tryUpgrade(h.p, h.i);
      else if (h.k === "send") trySend(h.p, h.i);
      else if (h.k === "ready") doLaunch(h.p);
      else if (h.k === "pow") { if (canCtl(h.p)) tryPower(h.p, null); }
      return;
    }
    var cl = cellAt(f.x, f.y);
    if (!cl) return;
    // un météore en attente de cible : n'importe quelle case du plateau
    for (var q = 0; q < 2; q++) if (ui[q].aim && canCtl(q)) { tryPower(q, cl.r); return; }
    var owner = K.ownerOfCol(cl.c);
    if (owner < 0 || !canCtl(owner)) return;
    var before = ui[owner].sel;
    act(owner, cl.c, cl.r);
    var u = ui[owner];
    if (u.sel && (!before || before.id !== u.sel.id)) { u.drag = { x: f.x, y: f.y, moved: false, id: u.sel.id, from: cl }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} }
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!ui) return;
    var s = toScr(e), f = scr2w(s.x, s.y);
    ui.forEach(function (u, p) {
      if (!u.drag) return;
      var d = u.drag; u.drag = null;
      if (!d.moved || mode !== "play") return;
      var cl = cellAt(f.x, f.y);
      if (!cl || (cl.c === d.from.c && cl.r === d.from.r)) return;
      var sp = selPiece(u), pc = K.pieceAt(w, cl.c, cl.r);
      if (sp && pc && K.canFuse(w, p, sp, pc, w.players[p].rainbow)) act(p, cl.c, cl.r);
    });
  });
  canvas.addEventListener("pointercancel", function () { if (ui) ui.forEach(function (u) { u.drag = null; }); });
  if (launchBtn) launchBtn.addEventListener("click", function () { audio(); SFX.ui(); doLaunch(0); canvas.focus({ preventScroll: true }); });

  /* ====================== TUTORIEL ====================== */
  var TUTO = [
    { t: "Invoque une pièce sur une case vide.", d: "Touche une case vide de ton côté (ou place ton curseur et appuie sur ton bouton d'action). Ça coûte 3 mana.", until: "summon" },
    { t: "Chaque pièce attaque selon sa forme aux échecs.", d: "Sélectionne une pièce pour voir sa zone : la Tour tire sur sa ligne, le Fou en diagonale, le Cavalier en L, le Pion juste devant lui.", until: "select" },
    { t: "Fusionne deux pièces identiques pour les améliorer.", d: "Même type + même niveau : sélectionne l'une puis l'autre (ou glisse-la dessus). Tu obtiens une pièce au hasard, un niveau au-dessus. Parfois… une Dame !", until: "fuse" },
    { t: "Défendez votre roi ensemble !", d: "Quand vous êtes prêts, lancez la vague. Un ennemi touché par vos deux camps puis éliminé = COMBO COOP !", until: "wave" },
  ];
  function tutoShow() {
    if (!tipEl) return;
    if (!tuto.on || mode !== "play") { tipEl.hidden = true; return; }
    var s = TUTO[tuto.step];
    tipEl.innerHTML = '<span class="kd-tip-n">' + (tuto.step + 1) + " / " + TUTO.length + '</span><strong>' + s.t + "</strong><p>" + s.d + "</p>" +
      '<div class="kd-tip-btns"><button type="button" class="btn btn-small" data-tip="next">' + (tuto.step < TUTO.length - 1 ? "Suivant ›" : "C'est parti !") + '</button> <button type="button" class="btn btn-ghost btn-small" data-tip="skip">Passer le tutoriel</button></div>';
    tipEl.style.bottom = (TALL && LP[0] ? LP[0].h + 12 : 8) + "px";
    tipEl.hidden = false;
    tipEl.classList.remove("kd-in"); void tipEl.offsetWidth; tipEl.classList.add("kd-in");
  }
  function tutoNext() { tuto.step++; if (tuto.step >= TUTO.length) tutoEnd(); else { tutoShow(); SFX.ui(); } }
  function tutoEnd() { tuto.on = false; store("kd-tuto", "1"); tutoShow(); }
  function tutoEvent(k) { if (tuto.on && TUTO[tuto.step].until === k) tutoNext(); }
  if (tipEl) tipEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tip]"); if (!b) return;
    audio(); SFX.ui();
    if (b.getAttribute("data-tip") === "skip") tutoEnd(); else tutoNext();
    canvas.focus({ preventScroll: true });
  });


  /* ====================== ÉCRANS ====================== */
  var pauseOpen = false;   // en ligne, le menu pause n'arrête pas la partie
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function show(html, cls) { card.className = "panel game-card kd-card " + (cls || ""); card.innerHTML = html; overlay.hidden = false; card.classList.remove("kd-in"); void card.offsetWidth; card.classList.add("kd-in"); overlay.scrollTop = 0; }
  function hide() { overlay.hidden = true; }
  function kbd(t) { return "<kbd>" + t + "</kbd>"; }
  var iconCache = {};
  function pieceImg(type, owner, lvl, size) {
    var key = type + owner + lvl + size;
    if (iconCache[key]) return iconCache[key];
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawPiece(g, type, owner, lvl, size / 2, size * 0.95, size * 0.95, { noAura: lvl < 3, noStars: lvl === 1 });
    return (iconCache[key] = '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">');
  }
  function enemyImg(type, size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawEnemy(g, type, size / 2, size * 0.92, size * (type === "boss" ? 0.6 : 0.85), {});
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function kingImg(size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawKing(g, size / 2, size * 0.98, size * 0.72, {});
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function powerImg(kind, size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawPowerIcon(g, kind, size / 2, size / 2, size * 0.36);
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function patternImg(type, size) {
    // mini plateau 5 × 5 qui montre la zone d'attaque (le pion regarde vers la droite)
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    var n = 5, cs = size / n, mid = 2, cells = {};
    K.shapeCells(type, mid, mid, 1).forEach(function (q) { cells[q.c + "," + q.r] = 1; });
    for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) {
      g.fillStyle = (x + y) % 2 ? "#eadfcb" : "#f5ecdc"; g.fillRect(x * cs, y * cs, cs, cs);
      if (cells[x + "," + y]) { g.fillStyle = "rgba(120,174,247,.75)"; g.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4); }
    }
    g.fillStyle = "#2f5ea8"; g.beginPath(); g.arc(mid * cs + cs / 2, mid * cs + cs / 2, cs * 0.3, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
    return '<img class="kd-pat" src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function settingsHtml() {
    return '<div class="kd-settings">' +
      '<label>🔔 Sons <input type="range" min="0" max="1" step="0.05" value="' + SET.sfx + '" data-set="sfx"></label>' +
      '<label>🎵 Musique <input type="range" min="0" max="1" step="0.05" value="' + SET.music + '" data-set="music"></label>' +
      '<label class="kd-check"><input type="checkbox" data-set="mute"' + (SET.mute ? " checked" : "") + "> 🔇 Couper tout le son</label>" +
      '<label class="kd-check"><input type="checkbox" data-set="fx"' + (SET.fx !== "full" ? " checked" : "") + "> 🧘 Réduire les mouvements et effets (pas de secousses, de flash ni de ralenti)</label>" +
      '<label class="kd-check"><input type="checkbox" data-set="ranges"' + (SET.ranges ? " checked" : "") + "> 🎯 Montrer la zone de la pièce sous le curseur</label>" +
      '<p class="kd-set-row"><button type="button" class="btn btn-ghost btn-small" data-act="retuto">Revoir le tutoriel à la prochaine partie</button></p>' +
      "</div>";
  }
  function bestLine() { return BEST.wave ? 'Record coop : <strong>vague ' + BEST.wave + "</strong> · <strong>" + fmt(BEST.score) + "</strong> points" + (BEST.wins ? " · " + BEST.wins + " victoire" + (BEST.wins > 1 ? "s" : "") + " en ligne" : "") : "Pas encore de record : à vous de jouer !"; }

  function menu() {
    mode = "menu"; hud.hidden = true; tutoShow(); updateLaunch(); stopMusic(); pauseOpen = false;
    if (!w) newGame("coop");
    var cast = [["rook", 0, 1], ["bishop", 0, 2], ["queen", 0, 3], ["knight", 1, 3], ["pawn", 1, 2], ["rook", 1, 4]].map(function (a) { return '<span class="kd-who">' + pieceImg(a[0], a[1], a[2], 56) + "</span>"; }).join("");
    show('<div class="kd-logo">' + kingImg(88) + '<h2 class="kd-title"><span class="kd-k">KING</span> <span class="kd-d">DICE</span></h2></div>' +
      '<p class="kd-sub">Invoquez des pièces d\'échecs au hasard, fusionnez-les et protégez votre roi. Ensemble… ou l\'un contre l\'autre.</p>' +
      '<div class="kd-cast">' + cast + "</div>" +
      '<div class="kd-modes">' +
      '<button class="kd-mode kd-m-coop" type="button" data-act="start-coop"><b>👥 Coop</b><span>2 joueurs · même écran</span></button>' +
      '<button class="kd-mode kd-m-vs" type="button" data-act="start-vs"><b>⚔️ Versus</b><span>1 contre 1 · même écran</span></button>' +
      '<button class="kd-mode kd-m-on" type="button" data-act="online-coop"><b>🌐 Coop en ligne</b><span>avec un ami</span></button>' +
      '<button class="kd-mode kd-m-on" type="button" data-act="online-vs"><b>🌐 Versus en ligne</b><span>défie un ami</span></button>' +
      "</div>" +
      '<p class="kd-actions"><button class="btn btn-ghost" type="button" data-act="help">❓ Comment jouer</button> <button class="btn btn-ghost" type="button" data-act="settings">⚙ Paramètres</button></p>' +
      '<p class="game-small">' + bestLine() + ' · <span class="game-version">v' + VERSION + "</span></p>", "kd-menu");
  }

  function showOnline() {
    if (mode !== "menu") return;
    var vsSel = NET.kind === "versus";
    var kindBtns = function (can) {
      return '<div class="kd-kind" role="group" aria-label="Mode">' +
        '<button type="button" class="kd-k-btn' + (!vsSel ? " is-on" : "") + '" data-act="okind-coop"' + (can ? "" : " disabled") + ">👥 Coop</button>" +
        '<button type="button" class="kd-k-btn' + (vsSel ? " is-on" : "") + '" data-act="okind-vs"' + (can ? "" : " disabled") + ">⚔️ Versus</button></div>";
    };
    var err = NET.err ? '<p class="kd-note">' + esc(NET.err) + "</p>" : "";
    var html = '<h2 class="kd-h">Jouer en ligne</h2>';
    if (!NET.on) {
      html += '<p class="kd-sub">Crée un salon et envoie le code (ou le lien) à ton ami, ou rejoins le sien. Pas de compte nécessaire.</p>' + err + kindBtns(true) +
        '<p class="kd-actions"><button class="btn kd-go" type="button" data-act="create">Créer un salon</button></p>' +
        '<div class="kd-join"><input data-code maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Code du salon"> <button class="btn" type="button" data-act="join">Rejoindre</button></div>' +
        '<p class="kd-actions"><button class="btn btn-ghost" type="button" data-act="menu">‹ Retour</button></p>';
    } else {
      var host = NET.role === "host", n = NET.roster.length, ready = n >= 2;
      var roster = NET.roster.map(function (r) { return '<li class="' + (r.id === NET.id ? "kd-me" : "") + '">' + (r.host ? "👑 Hôte" : "🙂 Invité") + (r.id === NET.id ? " (toi)" : "") + "</li>"; }).join("");
      html += '<p class="kd-sub">Code du salon</p><p class="kd-code">' + esc(NET.code) + "</p>" +
        '<p class="kd-actions"><button class="btn btn-ghost btn-small" type="button" data-act="copy">🔗 Copier le lien</button></p>' + err +
        '<ul class="kd-roster">' + roster + (n < 2 ? '<li class="kd-wait">En attente d\'un joueur…</li>' : "") + "</ul>" +
        (host ? kindBtns(true) : '<p class="kd-sub">Mode : <strong>' + (vsSel ? "⚔️ Versus" : "👥 Coop") + "</strong></p>") +
        '<p class="kd-actions">' + (host ? '<button class="btn kd-go" type="button" data-act="launch-online"' + (ready ? "" : " disabled") + ">▶ Lancer la partie</button>" : '<span class="kd-wait">' + (NET.status === "SUBSCRIBED" ? "En attente de l'hôte…" : "Connexion…") + "</span>") +
        ' <button class="btn btn-ghost" type="button" data-act="leave">Quitter</button></p>';
    }
    show(html, "kd-online");
    var inp = card.querySelector("[data-code]"); if (inp && !NET.on) inp.value = NET.joinText || "";
  }

  function helpCard(back) {
    show('<h2 class="kd-h">Comment jouer</h2>' +
      '<ol class="kd-steps"><li><b>Invoquer</b> : case vide de ton côté → une pièce au hasard (3 mana).</li>' +
      "<li><b>Défendre</b> : les pièces tirent toutes seules sur les ennemis dans leur zone.</li>" +
      "<li><b>Fusionner</b> : deux pièces <em>du même type et du même niveau</em> → une pièce au hasard, un niveau au-dessus (gratuit, jusqu'au niveau 4). La <b>Dame</b> n'apparaît que par fusion.</li>" +
      "<li><b>Renforcer</b> : dépense du mana pour améliorer toutes tes pièces d'un type.</li></ol>" +
      '<div class="kd-pieces">' +
      '<div>' + pieceImg("rook", 0, 1, 50) + patternImg("rook", 56) + "<b>Tour</b><span>Toute sa ligne. Tirs rapides.</span></div>" +
      '<div>' + pieceImg("bishop", 0, 1, 50) + patternImg("bishop", 56) + "<b>Fou</b><span>Ses diagonales : couvre plusieurs lignes.</span></div>" +
      '<div>' + pieceImg("knight", 0, 1, 50) + patternImg("knight", 56) + "<b>Cavalier</b><span>Cases en L : gros coups qui freinent.</span></div>" +
      '<div>' + pieceImg("pawn", 0, 1, 50) + patternImg("pawn", 56) + "<b>Pion</b><span>Juste devant lui, tirs très rapides. Mieux près du couloir.</span></div>" +
      '<div>' + pieceImg("queen", 0, 2, 50) + patternImg("queen", 56) + "<b>Dame</b><span>Ligne + diagonales. Rare : seulement par fusion !</span></div></div>" +
      '<h3 class="kd-h3">Pouvoirs</h3><p class="game-small">Ils arrivent avec la jauge (combos coop, vagues terminées ; en versus, tes éliminations).</p>' +
      '<div class="kd-powers">' + ["meteor", "freeze", "lightning", "heal", "frenzy", "rainbow"].map(function (k) { return "<div>" + powerImg(k, 40) + "<b>" + POWER_NAME[k] + "</b><span>" + POWER_DESC[k] + "</span></div>"; }).join("") + "</div>" +
      '<div class="kd-enemies"><span>' + enemyImg("normal", 40) + "Pionnet</span><span>" + enemyImg("fast", 40) + "Filou (rapide)</span><span>" + enemyImg("armored", 40) + "Cabosse (blindé)</span><span>" + enemyImg("boss", 40) + "Gros Pionnet (boss, 3 ♥)</span></div>" +
      '<h3 class="kd-h3">Versus</h3><p class="game-small" style="text-align:left">Chacun son roi (10 ♥). À chaque vague, vous recevez les mêmes ennemis, mais vos pièces ne tirent que sur <b>les tiens</b>. Dépense du mana pour <b>envoyer des renforts</b> chez l\'adversaire : s\'ils arrivent au roi, tu récupères du mana. Le dernier roi debout gagne.</p>' +
      '<div class="kd-players">' +
      '<div class="kd-p kd-p1"><span><strong>Joueur 1</strong> · à gauche</span><span>' + kbd("Z") + kbd("Q") + kbd("S") + kbd("D") + " curseur · " + kbd("Espace") + " action</span><span>" + kbd("E") + " pouvoir · " + kbd("1") + "…" + kbd("5") + " renforcer</span><span>" + kbd("V") + " prêt · " + kbd("R") + kbd("T") + kbd("Y") + " envoyer</span><small>(QWERTY : W A S D)</small></div>" +
      '<div class="kd-p kd-p2"><span><strong>Joueur 2</strong> · à droite</span><span>' + kbd("↑") + kbd("←") + kbd("↓") + kbd("→") + " curseur · " + kbd("Entrée") + " action</span><span>" + kbd("Maj droite") + " pouvoir · " + kbd("6") + "…" + kbd("0") + " renforcer</span><span>" + kbd("Retour") + " prêt · " + kbd(",") + kbd(".") + kbd("/") + " envoyer</span></div></div>" +
      '<p class="game-small">Tactile ou souris : touche une case pour agir, touche une pièce puis une autre pour fusionner (ou glisse-la), les boutons des panneaux pour renforcer, envoyer ou lancer un pouvoir. ' + kbd("V") + " lance la vague, " + kbd("Échap") + " met en pause.</p>" +
      '<p class="kd-actions"><button class="btn" type="button" data-act="' + (back || "menu") + '">‹ Retour</button></p>', "kd-help");
  }
  function settingsCard(back) {
    show('<h2 class="kd-h">Paramètres</h2>' + settingsHtml() + '<p class="kd-actions"><button class="btn" type="button" data-act="' + (back || "menu") + '">‹ Retour</button></p>', "kd-set");
  }

  function startPlay(kind) {
    newGame(kind);
    mode = "play"; pauseOpen = false; hide(); hud.hidden = false;
    audio(); applyVolumes(); startMusic();
    tuto.on = !NET.started && G.kind === "coop" && load("kd-tuto", "") !== "1"; tuto.step = 0; tutoShow();
    updateLaunch();
    showBanner("PRÉPARATION", isVs() ? "Invoquez, renforcez… puis soyez prêts !" : "Invoquez, fusionnez… puis lancez la vague !");
    autoFull();
    canvas.focus({ preventScroll: true });
  }
  function start(kind) { if (NET.on) { netLeave(); if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); } G.me = -1; startPlay(kind || G.kind); }
  function hostRematch() {
    if (!isHost() || !NET.otherId) return;
    var info = { kind: NET.kind, ids: [NET.id, NET.otherId], v: VERSION };
    netSend("start", info); startOnline(info);
  }
  function goMenu() {
    overToken++;
    if (NET.on) { netLeave(); if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); }
    G.me = -1; newGame("coop"); menu();
  }
  function pause() {
    if (mode !== "play" || (party && !NET.started)) return;
    SFX.pause();
    ui.forEach(function (u) { u.drag = null; });
    if (tipEl) tipEl.hidden = true;
    if (NET.started) { pauseOpen = true; pauseCard(); return; }   // en ligne la partie continue
    mode = "pause"; updateLaunch();
    pauseCard();
  }
  function pauseCard() {
    var online = NET.started;
    show('<h2 class="kd-h">' + (online ? "Menu" : "Pause") + "</h2>" +
      (isVs() ? "<p>Vague <strong>" + w.wave + "</strong> · Rois ♥ <strong>" + w.kings[0] + "</strong> – <strong>" + w.kings[1] + "</strong></p>" : "<p>Vague <strong>" + w.wave + "</strong> · Score d'équipe <strong>" + fmt(w.score) + "</strong> · Roi ♥ <strong>" + w.kingHp + "</strong></p>") +
      (online ? '<p class="game-small">La partie continue en ligne pendant que ce menu est ouvert.</p>' : "") + settingsHtml() +
      '<p class="kd-actions"><button class="btn kd-go" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="helpP">❓ Comment jouer</button> ' +
      (online ? "" : '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button> ') +
      '<button class="btn btn-ghost" type="button" data-act="menu">' + (online ? "Quitter" : "Menu") + "</button></p>", "kd-pause");
  }
  function resume() {
    if (pauseOpen) { pauseOpen = false; hide(); tutoShow(); canvas.focus({ preventScroll: true }); return; }
    if (mode !== "pause") return;
    mode = "play"; hide(); updateLaunch(); tutoShow(); canvas.focus({ preventScroll: true });
  }
  function recordBest(winner) {
    var rec = false;
    if (!isVs()) {
      if (w.wave > BEST.wave || (w.wave === BEST.wave && w.score > BEST.score)) rec = true;
      if (w.score > BEST.score) BEST.score = w.score;
      if (w.wave > BEST.wave) BEST.wave = w.wave;
    } else if (NET.started && winner === myIdx()) BEST.wins++;
    store("kd-best", JSON.stringify(BEST));
    w.isRecord = rec;
  }
  function gameOverCard() {
    var st = w.stats, again;
    if (NET.started) again = isHost() ? '<button class="btn kd-go" type="button" data-act="rematch">↻ Rejouer <small>(Entrée)</small></button> ' : '<span class="kd-wait">En attente de l\'hôte…</span> ';
    else again = '<button class="btn kd-go" type="button" data-act="start">↻ Rejouer <small>(Entrée)</small></button> ';
    var menuBtn = '<button class="btn btn-ghost" type="button" data-act="menu">' + (NET.started ? "Quitter" : "Menu") + "</button>";
    if (isVs()) {
      var win = w.winner, me = NET.started ? myIdx() : -1;
      var title = win < 0 ? "Égalité !" : me >= 0 ? (win === me ? "Victoire !" : "Défaite…") : "Le Joueur " + (win + 1) + " l'emporte !";
      show('<h2 class="kd-h">' + title + "</h2>" +
        '<p class="kd-big">Vague <b>' + w.wave + "</b></p>" +
        '<div class="kd-vs-res">' + [0, 1].map(function (p) {
          var pl = w.players[p];
          return '<div class="kd-vs-p' + (win === p ? " is-win" : "") + '" style="--c:' + PCOL[p].main + '"><strong>' + (win === p ? "👑 " : "") + (me >= 0 ? (p === me ? "Toi" : "Adversaire") : "Joueur " + (p + 1)) + "</strong><b>" + fmt(pl.score) + "</b><span>points</span><span>" + pl.kills + " éliminations</span><span>♥ " + w.kings[p] + "/" + CFG.kingHp + "</span></div>";
        }).join("") + "</div>" +
        '<p class="kd-actions">' + again + menuBtn + "</p>", "kd-over");
    } else {
      show('<h2 class="kd-h">' + (w.isRecord ? "Nouveau record d'équipe !" : "Le roi est tombé…") + "</h2>" +
        '<p class="kd-big">Vague <b>' + w.wave + "</b></p>" +
        '<p class="kd-score">' + fmt(w.score) + " <small>points</small></p>" +
        '<ul class="kd-stats">' +
        "<li><b>" + st.kills + "</b><span>ennemis éliminés</span></li>" +
        "<li><b>" + st.fusions + "</b><span>fusions</span></li>" +
        "<li><b>" + st.coop + "</b><span>combos coop</span></li>" +
        "<li><b>" + st.powers + "</b><span>pouvoirs utilisés</span></li></ul>" +
        '<p class="kd-split"><span class="kd-tag kd-t1">J1 : ' + w.players[0].kills + " éliminations</span> <span class=\"kd-tag kd-t2\">J2 : " + w.players[1].kills + " éliminations</span></p>" +
        '<p class="kd-actions">' + again + menuBtn + "</p>" +
        '<p class="game-small">' + bestLine() + "</p>", "kd-over");
    }
    var go = card.querySelector(".kd-go"); if (go) go.focus({ preventScroll: true });
  }

  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    audio(); SFX.ui();
    var a = b.getAttribute("data-act");
    if (a === "start-coop") start("coop");
    else if (a === "start-vs") start("versus");
    else if (a === "online-coop") { NET.kind = "coop"; NET.err = ""; showOnline(); }
    else if (a === "online-vs") { NET.kind = "versus"; NET.err = ""; showOnline(); }
    else if (a === "okind-coop" || a === "okind-vs") { NET.kind = a === "okind-vs" ? "versus" : "coop"; if (NET.on) netTrack(); showOnline(); }
    else if (a === "create") netJoin(newCode(), true, NET.kind);
    else if (a === "join") {
      var inp = card.querySelector("[data-code]"), code = String((inp && inp.value) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 4) { NET.err = "Le code a 4 caractères."; showOnline(); return; }
      NET.joinText = code; netJoin(code, false);
    }
    else if (a === "launch-online") hostStart();
    else if (a === "rematch") hostRematch();
    else if (a === "copy") {
      var link = location.origin + location.pathname + "#kd=" + NET.code;
      try { navigator.clipboard.writeText(link); b.textContent = "✓ Lien copié"; } catch (er) { b.textContent = link; }
    }
    else if (a === "leave") { goMenu(); }
    else if (a === "start") start(G.kind);
    else if (a === "resume") resume();
    else if (a === "menu") goMenu();
    else if (a === "help") helpCard("menu");
    else if (a === "helpP") helpCard("pauseBack");
    else if (a === "pauseBack") pauseCard();
    else if (a === "settings") settingsCard("menu");
    else if (a === "retuto") { store("kd-tuto", ""); b.textContent = "✓ Le tutoriel reviendra"; }
  });
  card.addEventListener("input", function (e) {
    var t = e.target, k = t.getAttribute("data-set");
    if (t.hasAttribute("data-code")) { t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); NET.joinText = t.value; return; }
    if (!k) return;
    if (k === "fx") SET.fx = t.checked ? "reduced" : "full";
    else if (k === "mute" || k === "ranges") SET[k] = t.checked;
    else SET[k] = Number(t.value);
    audio(); applyVolumes(); saveSet(); muteLabel();
    if (k === "music") { if (SET.music > 0 && mode !== "menu") startMusic(); else if (SET.music <= 0) stopMusic(); }
    if (k === "sfx") SFX.select();
  });
  card.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.hasAttribute && e.target.hasAttribute("data-code")) { e.preventDefault(); var j = card.querySelector('[data-act="join"]'); if (j) j.click(); } });
  function hudBtn(sel, fn) { var el = stage.querySelector(sel); if (el) el.addEventListener("click", function () { audio(); SFX.ui(); fn(el); }); }
  hudBtn("[data-kd-pause]", function () { if (mode === "pause" || pauseOpen) resume(); else pause(); });
  hudBtn("[data-kd-mute]", function () { SET.mute = !SET.mute; saveSet(); applyVolumes(); muteLabel(); });
  hudBtn("[data-kd-exit]", function () { leaveFull(); });
  function muteLabel() { var el = stage.querySelector("[data-kd-mute]"); if (el) { el.textContent = SET.mute ? "🔇" : "🔊"; el.setAttribute("aria-label", SET.mute ? "Activer le son" : "Couper le son"); } }
  muteLabel();
  document.addEventListener("visibilitychange", function () { if (document.hidden) { if (mode === "play" && !NET.started) pause(); stopMusic(); } else if (mode === "play" || mode === "over") startMusic(); });
  window.addEventListener("blur", function () { if (ui) ui.forEach(function (u) { u.drag = null; }); });

  /* ====================== PLEIN ÉCRAN ====================== */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { stage.classList.toggle("is-full", isFull()); setTimeout(resize, 50); }
  function goFull() {
    if (isFull()) return;
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (er) { fallback(); } } else fallback();
  }
  function leaveFull() { stage.classList.remove("is-max"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); syncFull(); }
  // sur téléphone : on joue toujours en plein écran (le plateau doit être assez grand pour les doigts)
  function autoFull() {
    if (isFull()) return;
    var small = window.matchMedia && (window.matchMedia("(max-width: 880px)").matches || window.matchMedia("(pointer: coarse)").matches);
    if (small) { stage.classList.add("is-max"); syncFull(); }
  }
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () { if (isFull()) leaveFull(); else goFull(); });
  document.addEventListener("fullscreenchange", syncFull);
  var fsExit = stage.querySelector("[data-fs-exit]");
  if (fsExit) fsExit.addEventListener("click", leaveFull);
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
  else window.addEventListener("resize", resize);

  /* ====================== BOUCLE ====================== */
  var last = performance.now();
  function loop(now) {
    var rdt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (w) {
      if (mode === "play" || mode === "over") update(rdt);
      else if (mode === "menu") { clock += rdt; ART.setClock(clock); updateVis(rdt, rdt); updateFx(rdt); }
      netTick(rdt);
      render();
    }
    requestAnimationFrame(loop);
  }

  // outils de test dans la console : KD_DEBUG.state(), .mana(99), .wave(10), .give(0, "meteor")
  window.KD_DEBUG = {
    version: VERSION, NET: NET, G: G,
    world: function () { return w; },
    ui: function () { return ui; },
    layout: function () { return { W: W, H: H, S: S, TALL: TALL, OX: OX, OY: OY, panels: LP, parts: PARTS }; },
    state: function () { return { mode: mode, kind: G.kind, wave: w.wave, state: w.state, king: w.kingHp, kings: w.kings, score: w.score, mana: w.players.map(function (p) { return p.mana; }), enemies: w.enemies.length, shots: w.shots.length, vshots: vshots.length, parts: parts.length, pieces: [K.countPieces(w, 0), K.countPieces(w, 1)], sel: ui.map(function (u) { return u.sel; }), cur: ui.map(function (u) { return u.cur; }), winner: w.winner, powers: w.players.map(function (p) { return p.power; }) }; },
    mana: function (n) { w.players.forEach(function (p) { p.mana = n; }); },
    wave: function (n) { w.wave = n; },
    give: function (p, kind) { w.players[p].power = kind; },
    king: function (n, p) { if (isVs()) w.kings[p == null ? 0 : p] = n; else w.kingHp = n; },
    act: function (p, c, r) { act(p, c, r); },
    launch: function (p) { doLaunch(p || 0); }, start: start, pause: pause, resume: resume,
    grid: function () { var o = []; for (var r = 0; r < 7; r++) { var row = []; for (var c = 0; c < 7; c++) { var pc = w.grid[c][r]; row.push(pc ? pc.type[0].toUpperCase() + pc.lvl + (pc.owner ? "b" : "a") : ".."); } o.push(row.join(" ")); } return o.join("\n"); },
    place: function (p, c, r, type, lvl) { var pc = { id: w.nextId++, type: type, lvl: lvl || 1, owner: p, c: c, r: r, cd: 0, shots: 0 }; w.grid[c][r] = pc; return pc; },
    clearBoard: function () { for (var c = 0; c < 7; c++) for (var r = 0; r < 7; r++) w.grid[c][r] = null; },
  };

  /* ====================== PARTY (versus multi-jeux, js/party.js) ======================
     opts.kind : "solo" (seul à la souris sur les deux côtés, vagues automatiques),
                 "net-vs" (versus en ligne, salon créé / rejoint tout seul),
                 "net-coop" (une coop en ligne par équipe). */
  var party = null;
  function partyScore() { if (!w) return 0; if (isVs()) { var pl = w.players[Math.max(0, myIdx())]; return pl ? pl.score : 0; } return w.score; }
  var PT = window.Party && window.Party.pending && window.Party.pending();
  if (PT && PT.mode.game !== "kingdice") PT = null;
  if (PT) {
    window.Party.register("kingdice", {
      start: function (ctx) {
        party = { ctx: ctx, ended: false, prep: 0 };
        store("kd-tuto", "1");
        var kind = ctx.opts.kind || "solo";
        if (kind === "solo") { start("coop"); tuto.on = false; tutoShow(); return; }
        netJoin(ctx.room, ctx.roomHost, kind === "net-vs" ? "versus" : "coop");
        if (ctx.roomHost) {
          var t0 = Date.now(), iv = setInterval(function () {
            if (!party || NET.started || party.ended) { clearInterval(iv); return; }
            if (NET.roster.length >= 2) { clearInterval(iv); hostStart(); }
            else if (Date.now() - t0 > 30000) { clearInterval(iv); party.ended = true; window.Party.over({ score: 0 }); }
          }, 500);
        }
      },
      stop: function () {
        if (party && !party.ended && w) {
          party.ended = true;
          if (mode === "play" || mode === "pause") {
            w.state = "over"; mode = "over"; pauseOpen = false; hud.hidden = true; updateLaunch(); stopMusic();
            show('<h2 class="kd-h">Temps écoulé !</h2><p>Vague <strong>' + w.wave + "</strong> · Score <strong>" + fmt(partyScore()) + "</strong></p>", "kd-over");
          }
        }
        return { score: partyScore() };
      },
    });
    setInterval(function () {
      if (!party || party.ended || !w || mode !== "play") return;
      window.Party.score(partyScore());
      var auto = party.ctx.opts.autoWave;
      if (auto && !isVs() && (!NET.started || isHost()) && w.state === "prep") { party.prep += 0.25; if (party.prep >= auto) { party.prep = 0; doLaunch(0); } }
      else party.prep = 0;
    }, 250);
  }

  var hashM = PT ? null : /#kd=([A-Za-z0-9]{4})/.exec(location.hash);
  newGame("coop");
  resize();
  if (PT) show('<h2 class="kd-h">Manche de party</h2><p>' + esc(PT.mode.name) + " : la partie démarre toute seule dans un instant.</p>", "kd-help");
  else menu();
  if (hashM && NETM) { NET.kind = "coop"; netJoin(hashM[1].toUpperCase(), false); }
  requestAnimationFrame(loop);
})();
