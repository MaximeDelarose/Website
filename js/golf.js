/* =========================================================================
   Mini-golf — solo (9 trous, entraînement) et en ligne (2 à 4 joueurs)
   -------------------------------------------------------------------------
   Vue du dessus, terrain logique 800 × 500 mis à l'échelle du canevas.
   Tir « lance-pierre » : on tire en arrière depuis n'importe où (souris ou
   doigt), ou au clavier (← → angle, ↑ ↓ puissance, Espace pour tirer).
   Les trous sont des données (HOLES) : un contour (poly), un départ, un
   drapeau, et en option du sable, de l'eau, des blocs, des champignons
   rebondissants (bumpers) et un moulin dont les pales tournent.

   En ligne : Supabase Realtime, salon « golf-room-CODE » (code de 4 lettres,
   lien golf.html#salon=CODE). Chacun joue sa propre balle en même temps ;
   les balles des autres sont des fantômes (position diffusée ~12 fois par
   seconde). Le trou suivant démarre quand tout le monde a fini (ou 60 s après
   le premier arrivé) ; c'est le premier joueur présent de la liste (l'hôte)
   qui décide, et il envoie les scores définitifs du trou (« next »).
   Sauvegardes locales : golf-best-v1 (meilleur parcours), golf-name, golf-sound.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-golf]");
  if (!root) return;
  var VERSION = "2.0.0";

  function $(s, r) { return (r || document).querySelector(s); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function now() { return Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* =====================================================================
     RÉGLAGES
     ===================================================================== */
  var R = 6;                       // rayon de la balle
  var CUP_R = 11;                  // rayon du trou
  var VMAX = 1120;                 // vitesse max d'un tir (px/s), ×2 par rapport à la v1
  var DEC = 340, DEC_SAND = 1440;  // décélération herbe / sable (px/s²)
  var REST = 0.84;                 // rebond sur un mur
  var SINK_V = 420;                // vitesse max pour tomber dans le trou
  var MAX_STROKES = 8;             // au-delà, la balle est ramassée
  var STEP = 1 / 480;
  var GRAV = 1100;                 // gravité des vols (px/s²)
  var PIPE_R = 13;                 // rayon d'une bouche de tuyau
  var WALL_H = 16, WALL_T = 9;     // hauteur et épaisseur des murs (rendu)
  var COLORS = ["#ffffff", "#f6c445", "#6fd3c6", "#f28b8b"];
  var NAMES_SCORE = { "-3": "Albatros !", "-2": "Eagle !", "-1": "Birdie !", "0": "Par", "1": "Bogey", "2": "Double bogey" };

  /* =====================================================================
     TROUS
       poly    : contour du terrain (murs en bois)
       blocks  : [x1,y1,x2,y2] murs pleins
       sand / water : [x1,y1,x2,y2]
       bumpers : [x,y,rayon]  piliers rebondissants (hauts)
       mills   : [{ x, y, len, speed (rad/s), ph }]  pales qui tournent
       movers  : [{ x, y, w, h, ax, ay, sp, ph }]    blocs qui coulissent
       hills   : [x,y,rayon,force,hauteur]  bosses : la balle redescend sur les côtés
       dips    : [x,y,rayon,force,profondeur] creux : la balle est ramenée vers le centre
       pipes   : [[ax,ay,angleSortie],[bx,by,angleSortie],"g"|"b"]  tuyaux (aller-retour)
       pads    : [{ x1,y1,x2,y2, ang, spd, vz }]  tremplins : la balle vole par-dessus
     ===================================================================== */
  function rect(x1, y1, x2, y2) { return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]; }
  var HOLES = [
    { name: "Premier coup", par: 2, poly: rect(70, 190, 730, 310), tee: [130, 250], cup: [670, 250], hills: [[400, 250, 90, 320, 26]] },
    { name: "Le coude", par: 3, poly: [[90, 90], [600, 90], [600, 410], [480, 410], [480, 210], [90, 210]], tee: [150, 150], cup: [540, 360],
      bumpers: [[535, 135, 16]], dips: [[540, 360, 75, 330, 14]] },
    { name: "Les dunes", par: 3, poly: rect(70, 140, 730, 360), tee: [130, 250], cup: [670, 250],
      sand: [[300, 140, 380, 290], [430, 210, 510, 360]], hills: [[220, 200, 55, 330, 26], [600, 300, 58, 330, 28]] },
    { name: "Le lac", par: 3, poly: rect(70, 130, 730, 370), tee: [130, 250], cup: [670, 250], water: [[330, 130, 470, 300]],
      pipes: [[[200, 190, 0], [610, 320, 0], "g"]] },
    { name: "Les champignons", par: 3, poly: rect(70, 100, 730, 400), tee: [130, 250], cup: [680, 250],
      bumpers: [[330, 190, 24], [330, 310, 24], [480, 250, 24], [600, 160, 18], [600, 340, 18]],
      pipes: [[[170, 140, 0.5], [650, 370, -1.33], "b"]] },
    { name: "Zigzag", par: 4, poly: rect(70, 100, 730, 400), tee: [130, 160], cup: [650, 340],
      blocks: [[250, 100, 275, 300], [460, 200, 485, 400]], dips: [[650, 330, 80, 330, 14]], movers: [{ x: 360, y: 250, w: 18, h: 90, ax: 0, ay: 105, sp: 1.2, ph: 0 }] },
    { name: "Les moulins", par: 4, poly: rect(70, 170, 730, 330), tee: [130, 250], cup: [670, 250],
      mills: [{ x: 300, y: 250, len: 72, speed: 1.3, ph: 0 }, { x: 500, y: 250, len: 72, speed: -1.7, ph: 1 }] },
    { name: "Le grand huit", par: 4, poly: [[80, 80], [520, 80], [520, 200], [720, 200], [720, 420], [280, 420], [280, 300], [80, 300]], tee: [130, 130], cup: [670, 370],
      sand: [[330, 215, 430, 290]], hills: [[560, 330, 52, 330, 24]], pads: [{ x1: 150, y1: 225, x2: 190, y2: 275, ang: 0, spd: 650, vz: 330 }] },
    { name: "La grande finale", par: 4, poly: rect(60, 90, 740, 410), tee: [110, 250], cup: [690, 250],
      water: [[300, 90, 360, 270], [460, 230, 520, 410]], sand: [[570, 170, 630, 330]], bumpers: [[410, 160, 16], [410, 340, 16]],
      pads: [{ x1: 190, y1: 150, x2: 230, y2: 190, ang: 0, spd: 600, vz: 300 }], pipes: [[[130, 380, 0], [690, 130, 1.57], "b"]] },
  ];
  function inPoly(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function inRects(list, x, y) {
    if (!list) return false;
    for (var i = 0; i < list.length; i++) { var r = list[i]; if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return true; }
    return false;
  }
  function boxSegs(r, out) { out.push([r[0], r[1], r[2], r[1]], [r[2], r[1], r[2], r[3]], [r[2], r[3], r[0], r[3]], [r[0], r[3], r[0], r[1]]); }
  // pré-calculs : segments de collision, murs 3D, bouches de tuyaux, cadre
  HOLES.forEach(function (h) {
    var p = h.poly, i, k;
    h.polySegs = []; h.polyN = []; h.blockSegs = []; h.walls = []; h.pipeMouths = [];
    for (i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      h.polySegs.push([a[0], a[1], b[0], b[1]]);
      var ex = b[0] - a[0], ey = b[1] - a[1], len = Math.sqrt(ex * ex + ey * ey), dx = ex / len, dy = ey / len, nx = dy, ny = -dx;
      if (inPoly(p, (a[0] + b[0]) / 2 + nx * 3, (a[1] + b[1]) / 2 + ny * 3)) { nx = -nx; ny = -ny; }
      h.polyN.push([nx, ny]);
      var cnt = Math.ceil(len / 70);
      for (k = 0; k < cnt; k++) {
        var t0 = k / cnt, t1 = (k + 1) / cnt;
        var x0 = a[0] + ex * t0 - (k === 0 ? dx * WALL_T : 0), y0 = a[1] + ey * t0 - (k === 0 ? dy * WALL_T : 0);
        var x1 = a[0] + ex * t1 + (k === cnt - 1 ? dx * WALL_T : 0), y1 = a[1] + ey * t1 + (k === cnt - 1 ? dy * WALL_T : 0);
        h.walls.push({ c: [[x0, y0], [x1, y1], [x1 + nx * WALL_T, y1 + ny * WALL_T], [x0 + nx * WALL_T, y0 + ny * WALL_T]], mx: (x0 + x1) / 2, my: (y0 + y1) / 2 });
      }
    }
    (h.blocks || []).forEach(function (r) { boxSegs(r, h.blockSegs); });
    h.segs = h.polySegs.concat(h.blockSegs);
    (h.pipes || []).forEach(function (pp, pi) {
      var m0 = { x: pp[0][0], y: pp[0][1], ang: pp[0][2], col: pp[2], other: h.pipeMouths.length + 1 };
      var m1 = { x: pp[1][0], y: pp[1][1], ang: pp[1][2], col: pp[2], other: h.pipeMouths.length };
      h.pipeMouths.push(m0, m1);
    });
    var x1b = 1e9, y1b = 1e9, x2b = -1e9, y2b = -1e9;
    p.forEach(function (q) { x1b = Math.min(x1b, q[0]); x2b = Math.max(x2b, q[0]); y1b = Math.min(y1b, q[1]); y2b = Math.max(y2b, q[1]); });
    h.bb = [x1b, y1b, x2b, y2b];
  });
  var simT = 0, clockOff = 0;     // horloge du jeu (secondes) : mouvements des obstacles
  function moverBox(m, t) {
    var cxm = m.x + m.ax * Math.sin(m.sp * t + m.ph), cym = m.y + m.ay * Math.sin(m.sp * t + m.ph);
    return [cxm - m.w / 2, cym - m.h / 2, cxm + m.w / 2, cym + m.h / 2];
  }
  function millEnds(m, t, o) { var a = m.ph + t * m.speed; o.cx = Math.cos(a) * m.len; o.cy = Math.sin(a) * m.len; return o; }
  // relief : bosse z = H(1-s²)², creux = l'inverse (s = distance / rayon) ; la force suit la pente
  function reliefAt(h, x, y, o) {
    var ax = 0, ay = 0, z = 0, i, q, dx, dy, d2, s2, d, s, k;
    if (h.hills) for (i = 0; i < h.hills.length; i++) {
      q = h.hills[i]; dx = x - q[0]; dy = y - q[1]; d2 = dx * dx + dy * dy; s2 = d2 / (q[2] * q[2]);
      if (s2 < 1) {
        z += q[4] * (1 - s2) * (1 - s2);
        if (d2 > 0.01) { d = Math.sqrt(d2); s = d / q[2]; k = q[3] * 2.6 * s * (1 - s2); ax += dx / d * k; ay += dy / d * k; }
      }
    }
    if (h.dips) for (i = 0; i < h.dips.length; i++) {
      q = h.dips[i]; dx = x - q[0]; dy = y - q[1]; d2 = dx * dx + dy * dy; s2 = d2 / (q[2] * q[2]);
      if (s2 < 1) {
        z -= q[4] * (1 - s2) * (1 - s2);
        if (d2 > 0.01) { d = Math.sqrt(d2); s = d / q[2]; k = q[3] * 2.6 * s * (1 - s2); ax -= dx / d * k; ay -= dy / d * k; }
      }
    }
    o.x = ax; o.y = ay; o.z = z;
  }
  var tmpR = { x: 0, y: 0, z: 0 };
  function groundZ(h, x, y) { reliefAt(h, x, y, tmpR); return tmpR.z; }

  /* =====================================================================
     SONS (WebAudio)
     ===================================================================== */
  var soundOn = load("golf-sound", true), AC = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(t0, freq, dur, vol, type, slide) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || "triangle"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(n, k) {
    if (!soundOn) return;
    if (n === "hit") { tone(0, 220 + 260 * (k || 0.5), 0.09, 0.22, "square", 90); }
    else if (n === "wall") { tone(0, 160 + 200 * (k || 0.3), 0.05, 0.1 * clamp(k || 0.3, 0.3, 1), "triangle"); }
    else if (n === "bump") { tone(0, 420, 0.12, 0.18, "sine", 760); }
    else if (n === "sink") { tone(0, 520, 0.12, 0.2); tone(0.1, 660, 0.12, 0.2); tone(0.2, 880, 0.22, 0.2); }
    else if (n === "splash") { tone(0, 300, 0.3, 0.2, "sawtooth", 70); }
    else if (n === "pad") { tone(0, 300, 0.25, 0.18, "sine", 900); }
    else if (n === "pipe") { tone(0, 260, 0.2, 0.2, "square", 90); tone(0.05, 130, 0.2, 0.12, "triangle", 60); }
    else if (n === "notify") { tone(0, 600, 0.1, 0.12); tone(0.1, 800, 0.12, 0.12); }
  }

  /* =====================================================================
     ÉTAT
     ===================================================================== */
  var NAME = String(load("golf-name", "") || "").slice(0, 16);
  var NET = { id: sget("golf-net-id"), client: null, ch: null, code: null, role: null, roster: [], status: "", err: "", ts: 0, lastPos: 0 };
  if (!NET.id) { NET.id = Math.random().toString(36).slice(2, 10); sset("golf-net-id", NET.id); }
  var ME = NET.id;
  var G = null;           // partie en cours (voir newGame)
  var screen = "main";
  var best = load("golf-best-v1", null);   // { total, par }

  var stage = $("[data-stage]", root), canvas = $("[data-canvas]", root), cx = canvas.getContext("2d");
  var overlay = $("[data-overlay]", root), cardEl = $("[data-card]", root);
  var hudHole = $("[data-hud-hole]", root), hudStrokes = $("[data-hud-strokes]", root), hudBoard = $("[data-hud-board]", root);
  var hudPower = $("[data-power]", root), hudMsg = $("[data-msg]", root), hudBar = $("[data-hud]", root);
  var cw = 0, ch = 0, dpr = 1, sc = 1, ox = 0, oy = 0;

  function newGame(o) {
    var g = {
      mode: o.mode, gid: o.gid || "", order: o.order, hi: 0,
      players: o.players, scores: {}, doneAll: {}, others: {},
      phase: "aim", strokes: 0, ball: { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0 }, rest: { x: 0, y: 0 },
      sinkT: 0, sinkFrom: null, pipe: null, pipeCool: -1, ang: 0, pow: 0.55, kbd: false, drag: null,
      firstDoneAt: 0, nextAt: 0, over: false, msg: "", msgT: 0, fx: [], lastSend: 0,
    };
    g.players.forEach(function (p) { g.scores[p.id] = []; });
    return g;
  }
  function curHole() { return HOLES[G.order[G.hi]]; }
  function playerIndex(id) { for (var i = 0; i < G.players.length; i++) if (G.players[i].id === id) return i; return -1; }
  function loadHole() {
    var h = curHole();
    G.strokes = 0; G.phase = "aim"; G.sinkT = 0; G.drag = null; G.nextAt = 0; G.fx = [];
    G.firstDoneAt = Object.keys(G.doneAll[G.hi] || {}).length ? now() : 0;
    G.ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0, z: 0, vz: 0 }; G.pipeCool = -1;
    G.rest = { x: h.tee[0], y: h.tee[1] };
    G.ang = Math.atan2(h.cup[1] - h.tee[1], h.cup[0] - h.tee[0]);
    G.others = {};
    G.players.forEach(function (p) { if (p.id !== ME) G.others[p.id] = { x: h.tee[0], y: h.tee[1], tx: h.tee[0], ty: h.tee[1], s: 0, done: false, holed: false }; });
    setMsg(G.mode === "practice" ? "" : "Trou " + (G.hi + 1) + " · " + h.name, 2200);
    fitView();
    hudUpdate(true);
    if (G.mode === "online") netSend("pos", { gid: G.gid, h: G.hi, id: ME, x: h.tee[0], y: h.tee[1], s: 0 });
  }
  function setMsg(t, ms) { if (!G) return; G.msg = t; G.msgT = now() + (ms || 2000); }

  /* =====================================================================
     PHYSIQUE (plan x, y + hauteur z pour les vols)
     ===================================================================== */
  var tmpA = { x: 0, y: 0 }, tmpM = { cx: 0, cy: 0 };
  // obstacles mobiles de l'instant : blocs qui coulissent et pales
  function dynSegs(h) {
    if (!h.movers && !h.mills) return null;
    var out = [], i;
    if (h.movers) for (i = 0; i < h.movers.length; i++) boxSegs(moverBox(h.movers[i], simT), out);
    if (h.mills) for (i = 0; i < h.mills.length; i++) { var m = h.mills[i]; millEnds(m, simT, tmpM); out.push([m.x - tmpM.cx, m.y - tmpM.cy, m.x + tmpM.cx, m.y + tmpM.cy]); }
    return out;
  }
  function collideList(b, segs) {
    var hit = 0;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i], dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy;
      var t = clamp(((b.x - s[0]) * dx + (b.y - s[1]) * dy) / l2, 0, 1);
      var px = s[0] + t * dx, py = s[1] + t * dy, ex = b.x - px, ey = b.y - py, d2 = ex * ex + ey * ey;
      if (d2 < R * R) {
        var d = Math.sqrt(d2) || 0.0001, nx = ex / d, ny = ey / d;
        b.x = px + nx * R; b.y = py + ny * R;
        var vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= (1 + REST) * vn * nx; b.vy -= (1 + REST) * vn * ny; hit = Math.max(hit, -vn); }
      }
    }
    return hit;
  }
  function circle(b, cxx, cyy, r, e, idx) {
    var dx = b.x - cxx, dy = b.y - cyy, d = Math.sqrt(dx * dx + dy * dy), m = r + R;
    if (d >= m) return 0;
    d = d || 0.0001;
    var nx = dx / d, ny = dy / d;
    b.x = cxx + nx * m; b.y = cyy + ny * m;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (idx != null) G.fx.push({ k: "bump", i: idx, t: 0 });
      return -vn;
    }
    return 0;
  }
  function stepBall(dt) {
    var b = G.ball, h = curHole(), hit = 0, bump = 0, i;
    simT += dt;
    // ---- en l'air (tremplin) : seuls les murs du contour comptent
    if (b.z > 0 || b.vz > 0) {
      b.vz -= GRAV * dt; b.z += b.vz * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      hit = collideList(b, h.polySegs);
      if (hit > 80) sfx("wall", hit / VMAX);
      if (b.z > 0) return;
      b.z = 0; b.vz = 0; sfx("wall", 0.5); G.fx.push({ k: "puff", x: b.x, y: b.y, t: 0 });
    }
    // ---- au sol : relief, frottements
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    reliefAt(h, b.x, b.y, tmpA);
    var am = Math.sqrt(tmpA.x * tmpA.x + tmpA.y * tmpA.y);
    b.vx += tmpA.x * dt; b.vy += tmpA.y * dt;
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 0) {
      var dec = inRects(h.sand, b.x, b.y) ? DEC_SAND : DEC;
      var ns = Math.max(0, sp - dec * dt) * (1 - 0.25 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp; sp = ns;
      if (sp < 9 && am < DEC * 0.8) { b.vx = 0; b.vy = 0; sp = 0; }
    }
    // gravité douce vers le trou quand la balle roule lentement dessus
    var cdx = h.cup[0] - b.x, cdy = h.cup[1] - b.y, cd = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cd < CUP_R * 2 && sp < 320 && sp > 0) { b.vx += cdx / (cd || 1) * 1040 * dt; b.vy += cdy / (cd || 1) * 1040 * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;

    hit = collideList(b, h.segs);
    var dyn = dynSegs(h);
    if (dyn) hit = Math.max(hit, collideList(b, dyn));
    if (h.mills) for (i = 0; i < h.mills.length; i++) bump = Math.max(bump, circle(b, h.mills[i].x, h.mills[i].y, 9, 0.6));
    if (h.bumpers) for (i = 0; i < h.bumpers.length; i++) bump = Math.max(bump, circle(b, h.bumpers[i][0], h.bumpers[i][1], h.bumpers[i][2], 1.08, i));
    if (hit > 80) sfx("wall", hit / VMAX);
    if (bump > 80) sfx("bump");
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

    // tremplins
    if (h.pads && sp > 80) for (i = 0; i < h.pads.length; i++) {
      var pd = h.pads[i];
      if (b.x > pd.x1 && b.x < pd.x2 && b.y > pd.y1 && b.y < pd.y2) {
        var v = Math.max(sp, pd.spd);
        b.vx = Math.cos(pd.ang) * v; b.vy = Math.sin(pd.ang) * v; b.vz = pd.vz; b.z = 0.01;
        G.fx.push({ k: "puff", x: b.x, y: b.y, t: 0 }); sfx("pad");
        return;
      }
    }
    // tuyaux : on entre par une bouche, on ressort par l'autre
    if (h.pipeMouths.length) {
      for (i = 0; i < h.pipeMouths.length; i++) {
        var pm = h.pipeMouths[i], pdx = b.x - pm.x, pdy = b.y - pm.y, pdd = Math.sqrt(pdx * pdx + pdy * pdy);
        if (G.pipeCool === i) { if (pdd > PIPE_R + 8) G.pipeCool = -1; continue; }
        if (pdd < PIPE_R) {
          G.phase = "pipe"; G.pipe = { to: pm.other, t: 0, spd: clamp(Math.max(sp, 300), 300, 760), from: { x: b.x, y: b.y } };
          b.vx = b.vy = 0; sfx("pipe");
          return;
        }
      }
    }
    // trou
    cdx = h.cup[0] - b.x; cdy = h.cup[1] - b.y;
    if (Math.sqrt(cdx * cdx + cdy * cdy) < CUP_R && sp < SINK_V) {
      G.phase = "sink"; G.sinkT = 0; G.sinkFrom = { x: b.x, y: b.y }; b.vx = b.vy = 0;
      sfx("sink");
      return;
    }
    // eau
    if (inRects(h.water, b.x, b.y)) {
      G.fx.push({ k: "splash", x: b.x, y: b.y, t: 0 });
      sfx("splash");
      G.strokes++;
      b.x = G.rest.x; b.y = G.rest.y; b.vx = b.vy = 0;
      setMsg("Plouf ! +1 coup", 1800);
      if (G.strokes >= MAX_STROKES) { finishHole(false); return; }
      toAim();
      return;
    }
    // sécurité : balle sortie du terrain
    if (!inPoly(h.poly, b.x, b.y)) { b.x = G.rest.x; b.y = G.rest.y; b.vx = b.vy = 0; toAim(); return; }
    if (b.vx === 0 && b.vy === 0) {
      if (G.strokes >= MAX_STROKES) finishHole(false); else toAim();
    }
  }
  function exitPipe() {
    var h = curHole(), b = G.ball, m = h.pipeMouths[G.pipe.to];
    b.x = m.x; b.y = m.y; b.vx = Math.cos(m.ang) * G.pipe.spd; b.vy = Math.sin(m.ang) * G.pipe.spd;
    b.vz = 170; b.z = 0.01; G.pipeCool = G.pipe.to; G.phase = "roll";
    G.fx.push({ k: "puff", x: m.x, y: m.y, t: 0 }); sfx("pipe");
  }
  // un pas de simulation selon la phase
  function simStep() {
    if (G.phase === "roll") stepBall(STEP);
    else if (G.phase === "sink") { G.sinkT += STEP; if (G.sinkT >= 0.35) finishHole(true); }
    else if (G.phase === "pipe") { simT += STEP; G.pipe.t += STEP; if (G.pipe.t >= 0.5) exitPipe(); }
  }
  function toAim() {
    G.phase = "aim"; G.rest = { x: G.ball.x, y: G.ball.y }; G.ball.z = 0; G.ball.vz = 0;
    var h = curHole();
    if (!G.kbd) G.ang = Math.atan2(h.cup[1] - G.ball.y, h.cup[0] - G.ball.x);
    if (G.mode === "online") sendPos(true);
  }
  function shoot(ang, pow) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    pow = clamp(pow, 0.04, 1);
    G.strokes++;
    G.rest = { x: G.ball.x, y: G.ball.y };
    G.ball.vx = Math.cos(ang) * pow * VMAX; G.ball.vy = Math.sin(ang) * pow * VMAX;
    G.pipeCool = -1;
    G.phase = "roll"; G.drag = null;
    sfx("hit", pow);
    hudUpdate(true);
    if (G.mode === "online") sendPos(true);
  }
  function sendPos(force) {
    if (!G || G.mode !== "online") return;
    var t = now();
    if (!force && t - G.lastSend < 80) return;
    G.lastSend = t;
    netSend("pos", { gid: G.gid, h: G.hi, id: ME, x: Math.round(G.ball.x * 10) / 10, y: Math.round(G.ball.y * 10) / 10, s: G.strokes, f: G.phase === "sink" ? 1 : 0 });
  }

  /* =====================================================================
     FIN DE TROU / PARTIE
     ===================================================================== */
  function verdict(s, par, holed) {
    if (!holed) return "Balle ramassée";
    if (s === 1) return "Trou en un ! 🎉";
    var d = s - par;
    return NAMES_SCORE[String(d)] || ("+" + d);
  }
  function finishHole(holed) {
    if (!G || G.phase === "done") return;
    var s = holed ? G.strokes : MAX_STROKES;
    G.phase = "done";
    G.scores[ME][G.hi] = s;
    if (G.mode === "online") {
      markDone(ME, s, holed, G.hi);
      netSend("done", { gid: G.gid, h: G.hi, id: ME, s: s, c: holed ? 1 : 0 });
      setMsg(verdict(s, curHole().par, holed) + " · on attend les autres…", 60000);
      hudUpdate(true);
      return;
    }
    hudUpdate(true);
    setTimeout(function () { if (G && G.phase === "done") showHoleCard(s, holed); }, holed ? 450 : 200);
  }
  function totalOf(id, upto) {
    var a = G.scores[id] || [], t = 0;
    for (var i = 0; i < a.length && (upto == null || i < upto); i++) if (a[i] != null) t += a[i];
    return t;
  }
  function parOf(upto) { var t = 0; for (var i = 0; i < G.order.length && (upto == null || i < upto); i++) t += HOLES[G.order[i]].par; return t; }

  /* ---------- solo : enchaîner les trous ---------- */
  function soloNext() {
    if (G.mode === "practice") { startPractice(G.order[0]); return; }
    if (G.hi + 1 >= G.order.length) { showSoloEnd(); return; }
    G.hi++; loadHole(); closeCard();
  }

  /* =====================================================================
     RENDU 3D (caméra en perspective, inclinée à 45°, tournable par pas de 45°)
     Le terrain est dessiné au sol, puis les objets debout (murs, piliers,
     pales, tuyaux, balles…) sont triés du plus loin au plus proche.
     ===================================================================== */
  var cam = { yaw: Math.PI / 4, yawT: Math.PI / 4, pitch: Math.PI / 4, dist: 900, F: 1, ox: 0, oy: 0, E: [0, 0, 0], f: [0, 0, 0], r: [0, 0, 0], u: [0, 0, 0] };
  var Px = 0, Py = 0, Ps = 1;                       // résultat de proj()
  function proj(x, y, z) {
    var px = x - cam.E[0], py = y - cam.E[1], pz = z - cam.E[2];
    var cd = px * cam.f[0] + py * cam.f[1] + pz * cam.f[2];
    Px = cam.ox + cam.F * (px * cam.r[0] + py * cam.r[1]) / cd;
    Py = cam.oy - cam.F * (px * cam.u[0] + py * cam.u[1] + pz * cam.u[2]) / cd;
    Ps = cam.F / cd;
  }
  function depthOf(x, y, z) { return (x - cam.E[0]) * cam.f[0] + (y - cam.E[1]) * cam.f[1] + (z - cam.E[2]) * cam.f[2]; }
  // pixel -> point du sol (z = 0)
  function unproject(sx, sy) {
    var a = (sx - cam.ox) / cam.F, b = (cam.oy - sy) / cam.F;
    var dx = cam.f[0] + a * cam.r[0] + b * cam.u[0], dy = cam.f[1] + a * cam.r[1] + b * cam.u[1], dz = cam.f[2] + b * cam.u[2];
    var t = -cam.E[2] / dz;
    return { x: cam.E[0] + t * dx, y: cam.E[1] + t * dy };
  }
  function setCam(h) {
    var bb = h.bb, mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
    var st = Math.sin(cam.yaw), ct = Math.cos(cam.yaw), sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
    cam.f = [-st * cp, -ct * cp, -sp]; cam.r = [ct, -st, 0]; cam.u = [-st * sp, -ct * sp, cp];
    cam.E = [mx - cam.dist * cam.f[0], my - cam.dist * cam.f[1], -cam.dist * cam.f[2]];
    cam.F = 1; cam.ox = 0; cam.oy = 0;
    var x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9, p = h.poly, zs = [-26, 56];
    for (var i = 0; i < p.length; i++) for (var j = 0; j < 2; j++) {
      proj(p[i][0], p[i][1], zs[j]);
      x1 = Math.min(x1, Px); x2 = Math.max(x2, Px); y1 = Math.min(y1, Py); y2 = Math.max(y2, Py);
    }
    var F = Math.min(cw * 0.94 / (x2 - x1), ch * 0.84 / (y2 - y1));
    cam.F = F; cam.ox = cw / 2 - F * (x1 + x2) / 2; cam.oy = ch / 2 + 14 - F * (y1 + y2) / 2;
  }
  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    if (G) fitView();
  }
  // en portrait (téléphone), on choisit parmi les 4 diagonales celle qui agrandit le plus le trou
  function fitView() {
    if (!G || !(ch > cw * 1.1)) return;
    var h = curHole(), keep = cam.yaw, bestF = -1, bestY = cam.yawT;
    for (var k = 0; k < 4; k++) {
      cam.yaw = Math.PI / 4 + k * Math.PI / 2; setCam(h);
      if (cam.F > bestF + 0.001) { bestF = cam.F; bestY = cam.yaw; }
    }
    cam.yaw = keep; cam.yawT = bestY;
  }
  function toWorld(ev) { var r = canvas.getBoundingClientRect(); return unproject(ev.clientX - r.left, ev.clientY - r.top); }

  // ---------- petits outils de dessin ----------
  function sh(c, k) { return "rgb(" + Math.min(255, Math.round(c[0] * k)) + "," + Math.min(255, Math.round(c[1] * k)) + "," + Math.min(255, Math.round(c[2] * k)) + ")"; }
  var LX = -0.55, LY = -0.83;       // direction de la lumière (vers la lampe), dans le plan
  function lightK(nx, ny) { return 0.66 + 0.34 * (nx * LX + ny * LY); }
  function fillPoly(pts, fill, stroke, lw) {
    cx.beginPath();
    for (var i = 0; i < pts.length; i++) { proj(pts[i][0], pts[i][1], pts[i][2]); if (i) cx.lineTo(Px, Py); else cx.moveTo(Px, Py); }
    cx.closePath();
    if (fill) { cx.fillStyle = fill; cx.fill(); }
    if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = lw || 1; cx.stroke(); }
  }
  function circlePts(x, y, r, z, n) { var o = []; for (var i = 0; i < n; i++) { var a = i / n * 6.2832; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z]); } return o; }
  function rectPts(r, z) { return [[r[0], r[1], z], [r[2], r[1], z], [r[2], r[3], z], [r[0], r[3], z]]; }
  function rectC(r) { return [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }
  // prisme vertical : c = 4 coins (x,y) dans l'ordre, de z0 à z1
  function prism(c, z0, z1, col, topCol) {
    var mx = 0, my = 0, i;
    for (i = 0; i < 4; i++) { mx += c[i][0] / 4; my += c[i][1] / 4; }
    for (i = 0; i < 4; i++) {
      var a = c[i], b = c[(i + 1) & 3], ex = b[0] - a[0], ey = b[1] - a[1], len = Math.sqrt(ex * ex + ey * ey) || 1;
      var nx = ey / len, ny = -ex / len, qx = (a[0] + b[0]) / 2, qy = (a[1] + b[1]) / 2;
      if (nx * (qx - mx) + ny * (qy - my) < 0) { nx = -nx; ny = -ny; }
      if (nx * (cam.E[0] - qx) + ny * (cam.E[1] - qy) <= 0) continue;
      var f = sh(col, lightK(nx, ny));
      fillPoly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], f, f, 1);
    }
    fillPoly([[c[0][0], c[0][1], z1], [c[1][0], c[1][1], z1], [c[2][0], c[2][1], z1], [c[3][0], c[3][1], z1]], topCol || sh(col, 1.18), "rgba(20,10,0,.45)", 1);
  }
  function cylinder(x, y, r, z0, z1, col, topFill, n) {
    n = n || 20;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2, nx = Math.cos(am), ny = Math.sin(am);
      if (nx * (cam.E[0] - (x + nx * r)) + ny * (cam.E[1] - (y + ny * r)) <= 0) continue;
      var f = sh(col, lightK(nx, ny));
      fillPoly([[x + Math.cos(a0) * r, y + Math.sin(a0) * r, z0], [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z0], [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z1], [x + Math.cos(a0) * r, y + Math.sin(a0) * r, z1]], f, f, 1);
    }
    if (topFill) fillPoly(circlePts(x, y, r, z1, n), topFill, "rgba(20,10,0,.45)", 1.5);
  }
  var WOOD = [150, 98, 50], AMBER = [226, 170, 40], EARTH = [112, 74, 40], PIPE = { g: [64, 176, 92], b: [70, 128, 214] };

  // ---------- sol ----------
  function drawGround(h, t) {
    var i, k, p = h.poly;
    // dalle : les côtés visibles, sous le gazon
    for (i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length], n = h.polyN[i], qx = (a[0] + b[0]) / 2, qy = (a[1] + b[1]) / 2;
      if (n[0] * (cam.E[0] - qx) + n[1] * (cam.E[1] - qy) <= 0) continue;
      var f = sh(EARTH, lightK(n[0], n[1]));
      fillPoly([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], -26], [a[0], a[1], -26]], f, f, 1);
    }
    fillPoly(p.map(function (q) { return [q[0], q[1], 0]; }), "#5fae4f", null);
    cx.save();
    cx.beginPath();
    for (i = 0; i < p.length; i++) { proj(p[i][0], p[i][1], 0); if (i) cx.lineTo(Px, Py); else cx.moveTo(Px, Py); }
    cx.closePath(); cx.clip();
    var bb = h.bb;
    for (var sx = bb[0] - 40; sx < bb[2]; sx += 80) fillPoly([[sx, bb[1] - 40, 0], [sx + 40, bb[1] - 40, 0], [sx + 40, bb[3] + 40, 0], [sx, bb[3] + 40, 0]], "rgba(255,255,255,.07)", null);
    // creux et bosses : anneaux du bord vers le centre
    function relief(q, sign) {
      var N = 9;
      for (k = 0; k < N; k++) {
        var rr = q[2] * (1 - k / N), s2 = (rr / q[2]) * (rr / q[2]), z = sign * q[4] * (1 - s2) * (1 - s2), u = k / (N - 1);
        var l = sign > 0 ? 50 + u * 34 : 50 - u * 26;
        fillPoly(circlePts(q[0] - (sign > 0 ? u * q[2] * 0.12 : 0), q[1] - (sign > 0 ? u * q[2] * 0.12 : 0), rr, z, 28), "hsl(104," + (sign > 0 ? 42 : 38) + "%," + l + "%)", k === 0 ? "rgba(20,60,20,.35)" : null, 1.5);
      }
    }
    (h.dips || []).forEach(function (q) { relief(q, -1); });
    (h.hills || []).forEach(function (q) {
      fillPoly(circlePts(q[0] + 6, q[1] + 9, q[2] * 0.95, 0.1, 24), "rgba(0,0,0,.16)", null);
      relief(q, 1);
    });
    (h.sand || []).forEach(function (r) {
      fillPoly(rectPts(r, 0.2), "#e6cd8c", null);
      cx.fillStyle = "rgba(150,110,50,.4)";
      for (var x = r[0] + 6; x < r[2]; x += 14) for (var y = r[1] + 6 + ((x / 14) % 2) * 7; y < r[3]; y += 14) { proj(x, y, 0.3); cx.fillRect(Px, Py, Ps * 2.4, Ps * 1.6); }
    });
    (h.water || []).forEach(function (r) {
      fillPoly(rectPts(r, 0.2), "#3f95cf", "#2f6fa0", 2);
      cx.strokeStyle = "rgba(255,255,255,.5)"; cx.lineWidth = 2;
      for (var y = r[1] + 12; y < r[3]; y += 22) {
        cx.beginPath();
        for (var x = r[0]; x <= r[2]; x += 6) { proj(x, y + Math.sin(x * 0.12 + t / 420 + y) * 2.5, 0.4); if (x === r[0]) cx.moveTo(Px, Py); else cx.lineTo(Px, Py); }
        cx.stroke();
      }
    });
    (h.pads || []).forEach(function (pd) {
      fillPoly(rectPts([pd.x1, pd.y1, pd.x2, pd.y2], 0.5), "#f6c445", "#7a4b00", 2);
      var cxp = (pd.x1 + pd.x2) / 2, cyp = (pd.y1 + pd.y2) / 2, dx = Math.cos(pd.ang), dy = Math.sin(pd.ang);
      cx.strokeStyle = "#7a4b00"; cx.lineWidth = 3; cx.lineJoin = "round";
      [-9, 9].forEach(function (o) {
        cx.beginPath();
        proj(cxp + dx * (o - 5) - dy * 11, cyp + dy * (o - 5) + dx * 11, 0.8); cx.moveTo(Px, Py);
        proj(cxp + dx * (o + 5), cyp + dy * (o + 5), 0.8); cx.lineTo(Px, Py);
        proj(cxp + dx * (o - 5) + dy * 11, cyp + dy * (o - 5) - dx * 11, 0.8); cx.lineTo(Px, Py);
        cx.stroke();
      });
    });
    // fil des tuyaux (sous le terrain)
    for (i = 0; i < h.pipeMouths.length; i += 2) {
      var m0 = h.pipeMouths[i], m1 = h.pipeMouths[i + 1], pc = PIPE[m0.col] || PIPE.g;
      proj(m0.x, m0.y, 0.6); var ax = Px, ay = Py; proj(m1.x, m1.y, 0.6); var bx = Px, by = Py;
      cx.strokeStyle = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + ",.5)"; cx.lineWidth = 3; cx.setLineDash([6, 8]);
      cx.beginPath(); cx.moveTo(ax, ay); cx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 50 * cam.F / 600, bx, by); cx.stroke(); cx.setLineDash([]);
    }
    (h.bumpers || []).forEach(function (q) { fillPoly(circlePts(q[0] + 8, q[1] + 11, q[2] * 1.1, 0.15, 20), "rgba(0,0,0,.25)", null); });
    fillPoly(circlePts(h.tee[0], h.tee[1], 13, 0.3, 20), "rgba(0,0,0,.18)", null);
    fillPoly(circlePts(h.cup[0], h.cup[1], CUP_R, 0.4, 24), "#12100b", "#2b1709", 2);
    cx.restore();
  }

  // ---------- balle ----------
  function drawBall(h, x, y, lift, color, scale, alpha, label) {
    var gz = groundZ(h, x, y), zc = gz + lift + R * scale;
    cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha;
    fillPoly(circlePts(x + lift * 0.15, y + lift * 0.25, R * scale * (1 + lift / 140), gz + 0.4, 14), "rgba(0,0,0," + (0.32 - Math.min(0.2, lift / 260)) + ")", null);
    proj(x, y, zc);
    var rr = R * scale * Ps, bx = Px, by = Py;
    var g = cx.createRadialGradient(bx - rr * 0.35, by - rr * 0.4, rr * 0.1, bx, by, rr);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, color); g.addColorStop(1, "#7c7467");
    cx.fillStyle = g; cx.strokeStyle = "#1a1208"; cx.lineWidth = Math.max(1, rr * 0.22);
    cx.beginPath(); cx.arc(bx, by, rr, 0, 6.3); cx.fill(); cx.stroke();
    if (label) {
      cx.font = "bold 12px Nunito, sans-serif"; cx.textAlign = "center"; cx.lineWidth = 3; cx.strokeStyle = "rgba(20,12,4,.85)"; cx.fillStyle = "#fdf3de";
      cx.strokeText(label, bx, by - rr - 8); cx.fillText(label, bx, by - rr - 8);
    }
    cx.restore();
  }

  function draw(t) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = "#1f3a2b"; cx.fillRect(0, 0, cw, ch);
    var h = G ? curHole() : HOLES[3], i, k;
    setCam(h);
    drawGround(h, t);
    var list = [];
    function add(x, y, z, fn) { list.push({ d: depthOf(x, y, z), f: fn }); }
    var fxs = G ? G.fx : [];

    h.walls.forEach(function (w) { add(w.mx, w.my, WALL_H / 2, function () { prism(w.c, 0, WALL_H, WOOD, "#c9955a"); }); });
    (h.blocks || []).forEach(function (r) { add((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 9, function () { prism(rectC(r), 0, 20, WOOD, "#c9955a"); }); });
    (h.movers || []).forEach(function (m) {
      var bx = moverBox(m, simT);
      add((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2, 10, function () { prism(rectC(bx), 0, 22, AMBER, "#ffd75a"); });
    });
    (h.bumpers || []).forEach(function (q, idx) {
      var pop = 0; for (k = 0; k < fxs.length; k++) if (fxs[k].k === "bump" && fxs[k].i === idx) pop = Math.max(pop, 1 - fxs[k].t / 0.18);
      add(q[0], q[1], 13, function () {
        var r = q[2], zt = 26;
        cylinder(q[0], q[1], r, 0, zt, [214, 70, 58], sh([240, 90, 76], 1.05 + pop * 0.2));
        cylinder(q[0], q[1], r + 1.5, zt - 7, zt - 3, [253, 243, 222], null);
        [[-0.4, -0.35, 0.2], [0.35, -0.2, 0.17], [-0.05, 0.4, 0.19], [0.1, -0.05, 0.11]].forEach(function (d) { fillPoly(circlePts(q[0] + d[0] * r, q[1] + d[1] * r, d[2] * r, zt + 0.2, 10), "#fdf3de", null); });
      });
    });
    (h.mills || []).forEach(function (m) {
      add(m.x, m.y, 9, function () {
        millEnds(m, simT, tmpM);
        var L = Math.sqrt(tmpM.cx * tmpM.cx + tmpM.cy * tmpM.cy), px = -tmpM.cy / L * 3.8, py = tmpM.cx / L * 3.8;
        function seg(t0, t1, col, top) {
          var x0 = m.x + tmpM.cx * t0, y0 = m.y + tmpM.cy * t0, x1 = m.x + tmpM.cx * t1, y1 = m.y + tmpM.cy * t1;
          prism([[x0 + px, y0 + py], [x1 + px, y1 + py], [x1 - px, y1 - py], [x0 - px, y0 - py]], 0, 16, col, top);
        }
        seg(-1, 1, [250, 240, 220], "#fff");
        seg(0.62, 1, [214, 70, 58], "#f06a5a"); seg(-1, -0.62, [214, 70, 58], "#f06a5a");
        cylinder(m.x, m.y, 9, 0, 32, WOOD, "#c9955a");
      });
    });
    h.pipeMouths.forEach(function (m) {
      add(m.x, m.y, 3, function () {
        var pc = PIPE[m.col] || PIPE.g;
        cylinder(m.x, m.y, PIPE_R + 2, 0, 7, pc, sh(pc, 1.25));
        fillPoly(circlePts(m.x, m.y, PIPE_R - 4, 7.2, 20), "#0b0906", null);
      });
    });
    add(h.cup[0], h.cup[1], 20, function () {
      var cxp = h.cup[0], cyp = h.cup[1];
      proj(cxp, cyp, 0); var x0 = Px, y0 = Py;
      proj(cxp, cyp, 48); cx.strokeStyle = "#fdf3de"; cx.lineWidth = Math.max(2, Ps * 3); cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(Px, Py); cx.stroke();
      var w = Math.sin(t / 260) * 2;
      fillPoly([[cxp, cyp, 48], [cxp + cam.r[0] * 19, cyp + cam.r[1] * 19, 42 + w], [cxp, cyp, 35]], "#f6c445", "#2b1709", 1.5);
    });
    // balles
    if (G) {
      G.players.forEach(function (p, idx) {
        if (p.id === ME) return;
        var o = G.others[p.id]; if (!o || o.holed) return;
        add(o.x, o.y, 4, function () { drawBall(h, o.x, o.y, 0, COLORS[idx % COLORS.length], 1, 0.62, p.name); });
      });
      var myCol = COLORS[Math.max(0, playerIndex(ME)) % COLORS.length], b = G.ball;
      if (G.phase === "sink") {
        var u = clamp(G.sinkT / 0.35, 0, 1), sx0 = G.sinkFrom.x + (h.cup[0] - G.sinkFrom.x) * u, sy0 = G.sinkFrom.y + (h.cup[1] - G.sinkFrom.y) * u;
        add(sx0, sy0, 4, function () { drawBall(h, sx0, sy0, -u * R * 1.6, myCol, 1 - u * 0.5, 1); });
      } else if (G.phase === "aim" || G.phase === "roll") add(b.x, b.y, b.z + 4, function () { drawBall(h, b.x, b.y, b.z, myCol, 1, 1); });
    }
    list.sort(function (a, b) { return b.d - a.d; });
    for (i = 0; i < list.length; i++) list[i].f();

    // effets
    fxs.forEach(function (f) {
      if (f.k === "splash") { var u2 = f.t / 0.6; fillPoly(circlePts(f.x, f.y, 6 + u2 * 26, 0.8, 20), null, "rgba(255,255,255," + (1 - u2) + ")", 3); }
      else if (f.k === "puff") { var u3 = f.t / 0.4; fillPoly(circlePts(f.x, f.y, 4 + u3 * 16, 0.8, 16), null, "rgba(255,255,255," + (0.8 - u3 * 0.8) + ")", 2.5); }
    });
    // visée (sur le sol)
    if (G && G.phase === "aim" && overlay.hidden) {
      var ang = G.ang, pw = G.pow;
      if (G.drag) {
        var ddx = G.drag.sx - G.drag.cx, ddy = G.drag.sy - G.drag.cy, dl = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dl > 14) { ang = Math.atan2(ddy, ddx); pw = clamp((dl - 10) / 150, 0.04, 1); G.dragOK = true; } else G.dragOK = false;
      } else G.dragOK = true;
      if (G.dragOK && (G.drag || G.kbd)) {
        var ux = Math.cos(ang), uy = Math.sin(ang), len = 40 + pw * 230, col = "hsl(" + Math.round(120 - 120 * pw) + ",85%,62%)", bx0 = G.ball.x, by0 = G.ball.y, gz = groundZ(h, bx0, by0) + 1.5;
        for (var d = 20; d < len; d += 17) {
          proj(bx0 + ux * d, by0 + uy * d, gz);
          cx.fillStyle = "rgba(20,12,4,.6)"; cx.beginPath(); cx.arc(Px, Py, Ps * 4.4, 0, 6.3); cx.fill();
          cx.fillStyle = col; cx.beginPath(); cx.arc(Px, Py, Ps * 3, 0, 6.3); cx.fill();
        }
        fillPoly([[bx0 + ux * (len + 16), by0 + uy * (len + 16), gz], [bx0 + ux * len - uy * 9, by0 + uy * len + ux * 9, gz], [bx0 + ux * len + uy * 9, by0 + uy * len - ux * 9, gz]], col, "rgba(20,12,4,.7)", 2);
        hudPower.style.width = Math.round(pw * 100) + "%";
        hudPower.style.background = "hsl(" + Math.round(120 - 120 * pw) + ",75%,52%)";
      } else if (!G.drag) hudPower.style.width = Math.round(G.pow * 100) + "%";
      if (!G.drag && !G.kbd) { proj(G.ball.x, G.ball.y, 26 + Math.sin(t / 240) * 2); cx.fillStyle = "rgba(255,255,255,.9)"; cx.beginPath(); cx.arc(Px, Py, 3.5, 0, 6.3); cx.fill(); }
    }
    // message
    if (G && G.msg && now() < G.msgT) {
      cx.font = "800 " + Math.round(clamp(cw / 22, 15, 26)) + "px Nunito, sans-serif"; cx.textAlign = "center";
      cx.lineWidth = 5; cx.strokeStyle = "#2b1709"; cx.fillStyle = "#fdf3de";
      var my = ch - 66;
      cx.strokeText(G.msg, cw / 2, my); cx.fillText(G.msg, cw / 2, my);
    }
  }

  /* =====================================================================
     BOUCLE
     ===================================================================== */
  var lastT = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    simT = now() / 1000 + clockOff;
    cam.yaw += (cam.yawT - cam.yaw) * Math.min(1, dt * 9);
    if (G) {
      acc += dt;
      while (acc >= STEP) { acc -= STEP; simStep(); }
      if (G.phase === "aim") {   // un bloc mobile ne doit pas écraser la balle à l'arrêt
        var dyn = dynSegs(curHole());
        if (dyn) { collideList(G.ball, dyn); G.ball.vx = G.ball.vy = 0; }
      }
      if (G.phase === "roll" && G.mode === "online") sendPos(false);
      G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "splash" ? 0.6 : f.k === "puff" ? 0.4 : 0.18); });
      if (G.mode === "online") {
        Object.keys(G.others).forEach(function (id) { var o = G.others[id]; var k = Math.min(1, dt * 14); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; });
        leaderTick();
      }
      if (ts - (frame.hud || 0) > 200) { frame.hud = ts; hudUpdate(false); }
    }
    draw(ts);
  }
  function turnCam(dir) { cam.yawT += dir * Math.PI / 4; }
  root.addEventListener("click", function (ev) { var b = ev.target.closest("[data-cam]"); if (b) turnCam(Number(b.dataset.cam)); });
  document.addEventListener("keydown", function (ev) {
    var tg = ev.target && ev.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA") return;
    if (ev.key === "q" || ev.key === "Q" || ev.key === ",") turnCam(-1);
    else if (ev.key === "e" || ev.key === "E" || ev.key === ".") turnCam(1);
  });

  /* =====================================================================
     SAISIE
     ===================================================================== */
  canvas.addEventListener("pointerdown", function (ev) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    ac();
    var p = toWorld(ev);
    G.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, id: ev.pointerId };
    G.kbd = false;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (!G || !G.drag || G.drag.id !== ev.pointerId) return;
    var p = toWorld(ev); G.drag.cx = p.x; G.drag.cy = p.y;
  });
  function endDrag(ev, fire) {
    if (!G || !G.drag || G.drag.id !== ev.pointerId) return;
    var d = G.drag; G.drag = null;
    if (!fire) return;
    var dx = d.sx - d.cx, dy = d.sy - d.cy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 14) shoot(Math.atan2(dy, dx), clamp((l - 10) / 150, 0.04, 1));
  }
  canvas.addEventListener("pointerup", function (ev) { endDrag(ev, true); });
  canvas.addEventListener("pointercancel", function (ev) { endDrag(ev, false); });
  document.addEventListener("keydown", function (ev) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    var tg = ev.target && ev.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "BUTTON" || tg === "SELECT") return;
    var k = ev.key, used = true, fine = ev.shiftKey ? 0.2 : 1;
    if (k === "ArrowLeft") G.ang -= 0.035 * fine;
    else if (k === "ArrowRight") G.ang += 0.035 * fine;
    else if (k === "ArrowUp") G.pow = clamp(G.pow + 0.03, 0.04, 1);
    else if (k === "ArrowDown") G.pow = clamp(G.pow - 0.03, 0.04, 1);
    else if (k === " " || k === "Enter") { if (G.kbd) shoot(G.ang, G.pow); }
    else used = false;
    if (used) { G.kbd = true; ev.preventDefault(); ac(); }
  });
  window.addEventListener("resize", resize);

  /* =====================================================================
     HUD
     ===================================================================== */
  function hudUpdate(force) {
    if (!G) { hudBar.hidden = true; fitView(); return; }
    hudBar.hidden = false;
    var h = curHole();
    hudHole.textContent = G.mode === "practice" ? "Entraînement · " + h.name : "Trou " + (G.hi + 1) + "/" + G.order.length + " · " + h.name;
    hudStrokes.textContent = "Par " + h.par + " · Coups " + G.strokes;
    if (G.mode === "online") {
      var rows = G.players.map(function (p, i) {
        var tot = totalOf(p.id, G.hi), o = G.others[p.id], live = p.id === ME ? G.strokes : (o ? o.s : 0);
        var dn = (G.doneAll[G.hi] || {})[p.id];
        return '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i><b>' + esc(p.name) + (p.id === ME ? " (toi)" : "") + "</b><span>" + (dn ? "✔ " + dn.s : (live ? live + "…" : "·")) + " · " + (tot + (dn ? dn.s : 0)) + "</span></li>";
      }).join("");
      if (hudBoard.dataset.k !== rows) { hudBoard.dataset.k = rows; hudBoard.innerHTML = rows; }
      hudBoard.hidden = false;
    } else hudBoard.hidden = true;
  }

  /* =====================================================================
     ÉCRANS (overlay)
     ===================================================================== */
  function showCard(html, cls) { cardEl.className = "panel game-card golf-card" + (cls ? " " + cls : ""); cardEl.innerHTML = html; overlay.hidden = false; }
  function closeCard() { overlay.hidden = true; screen = ""; }
  function nameField() { return '<label class="golf-field">Ton pseudo <input type="text" maxlength="16" data-name value="' + esc(NAME) + '" placeholder="Écureuil" autocomplete="nickname"></label>'; }
  function readName() { var i = $("[data-name]", cardEl); if (i) { NAME = i.value.trim().slice(0, 16); save("golf-name", NAME); } }
  function myName() { return NAME || "Écureuil"; }

  function showMenu(which) {
    screen = which || "main";
    if (screen === "main") {
      showCard('<h2>⛳ Mini-golf</h2>' +
        '<p>9 trous dans la forêt : sable, eau, champignons rebondissants et un moulin qui ne perd pas le nord. Moins tu tapes, mieux c\'est.</p>' +
        (best ? '<p class="golf-best">Meilleur parcours : <strong>' + best.total + "</strong> coups (" + diffStr(best.total - best.par) + ")</p>" : "") +
        '<div class="golf-stack">' +
        '<button class="btn" type="button" data-act="solo">▶ Parcours solo · 9 trous</button>' +
        '<button class="btn btn-alt" type="button" data-act="online">🌐 Jouer en ligne (2 à 4)</button>' +
        '<button class="btn btn-ghost" type="button" data-act="practice">🎯 S\'entraîner sur un trou</button>' +
        "</div>" +
        '<p class="game-small"><label><input type="checkbox" data-sound ' + (soundOn ? "checked" : "") + "> Sons</label></p>");
    } else if (screen === "practice") {
      showCard('<h2>🎯 Entraînement</h2><p>Choisis un trou, rejoue-le autant que tu veux.</p><div class="golf-picks">' +
        HOLES.map(function (h, i) { return '<button class="btn btn-ghost btn-small" type="button" data-act="p1" data-h="' + i + '"><b>' + (i + 1) + "</b> " + esc(h.name) + " <small>Par " + h.par + "</small></button>"; }).join("") +
        '</div><button class="btn btn-small" type="button" data-act="menu">← Retour</button>');
    } else if (screen === "online") {
      showCard('<h2>🌐 En ligne</h2>' +
        '<p>Chacun joue sa balle en même temps, les autres apparaissent en fantômes. Le plus petit score gagne.</p>' + nameField() +
        (NET.err ? '<p class="golf-err">' + esc(NET.err) + "</p>" : "") +
        '<div class="golf-stack"><button class="btn" type="button" data-act="create">✨ Créer un salon</button>' +
        '<div class="golf-join"><input type="text" maxlength="4" data-code placeholder="CODE" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn btn-alt" type="button" data-act="join">Rejoindre</button></div></div>' +
        '<button class="btn btn-small btn-ghost" type="button" data-act="menu">← Retour</button>');
    } else if (screen === "lobby" || screen === "joining") {
      var host = NET.role === "host", n = NET.roster.length;
      var rows = NET.roster.map(function (x, i) { return '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + esc(x.name || "Écureuil") + (x.host ? " 👑" : "") + (x.id === NET.id ? " (toi)" : "") + (i >= 4 ? " · spectateur" : "") + "</li>"; }).join("");
      var link = location.href.split("#")[0] + "#salon=" + (NET.code || "");
      showCard('<h2>Salon <span class="golf-code">' + esc(NET.code || "") + "</span></h2>" +
        (NET.status && NET.status !== "SUBSCRIBED" ? "<p>Connexion au salon…</p>" : "") +
        (NET.err ? '<p class="golf-err">' + esc(NET.err) + "</p>" : "") +
        '<p class="game-small">Envoie le code (ou ce lien) à tes amis : <code>' + esc(link) + "</code></p>" +
        '<ul class="golf-roster">' + (rows || "<li>…</li>") + "</ul>" +
        (G && G.mode === "online" && !G.over ? '<p class="game-small">Une partie est en cours.</p>' : "") +
        (NET.busy ? '<p class="game-small">Une partie est déjà en cours, tu joueras la prochaine.</p>' : "") +
        '<div class="btn-row center">' +
        (host ? '<button class="btn" type="button" data-act="start"' + (n < 2 ? " disabled" : "") + ">▶ Lancer la partie" + (n < 2 ? " (il faut être 2)" : "") + "</button>" : '<span class="waiting">En attente de l\'hôte…</span>') +
        '<button class="btn btn-alt btn-small" type="button" data-act="copy">📋 Copier le lien</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter</button></div>', "golf-card-lobby");
    }
  }
  function diffStr(d) { return d === 0 ? "Par" : d > 0 ? "+" + d : String(d); }

  function showHoleCard(s, holed) {
    var h = curHole(), last = G.mode !== "practice" && G.hi + 1 >= G.order.length;
    var total = totalOf(ME), parSoFar = parOf(G.hi + 1);
    showCard('<h2>' + esc(verdict(s, h.par, holed)) + "</h2>" +
      "<p><strong>" + s + "</strong> coup" + (s > 1 ? "s" : "") + " au trou " + (G.mode === "practice" ? "" : (G.hi + 1) + " ") + "« " + esc(h.name) + " » · Par " + h.par + "</p>" +
      (G.mode === "practice" ? "" : "<p>Total : <strong>" + total + "</strong> (" + diffStr(total - parSoFar) + ")</p>") +
      '<div class="btn-row center">' +
      '<button class="btn" type="button" data-act="next">' + (G.mode === "practice" ? "↻ Rejouer ce trou" : last ? "🏁 Voir le score" : "Trou suivant ▶") + "</button>" +
      (G.mode === "practice" ? '<button class="btn btn-ghost btn-small" type="button" data-act="menu">Menu</button>' : "") + "</div>");
    screen = "hole";
  }
  function scoreTable(ids) {
    var head = "<tr><th></th>" + G.order.map(function (hi, i) { return "<th>" + (i + 1) + "</th>"; }).join("") + "<th>Total</th></tr>";
    var par = "<tr class='par'><th>Par</th>" + G.order.map(function (hi) { return "<td>" + HOLES[hi].par + "</td>"; }).join("") + "<td>" + parOf() + "</td></tr>";
    var rows = ids.map(function (p) {
      var i = playerIndex(p.id);
      return "<tr><th><i style='background:" + COLORS[i % COLORS.length] + "'></i>" + esc(p.name) + "</th>" + G.order.map(function (hi, j) {
        var s = G.scores[p.id][j], d = s == null ? "" : s - HOLES[hi].par;
        return "<td" + (s != null ? " class='" + (d < 0 ? "good" : d > 0 ? "bad" : "") + "'" : "") + ">" + (s == null ? "–" : s) + "</td>";
      }).join("") + "<td><b>" + totalOf(p.id) + "</b></td></tr>";
    }).join("");
    return '<div class="golf-table"><table>' + head + par + rows + "</table></div>";
  }
  function showSoloEnd() {
    var total = totalOf(ME), par = parOf(), rec = !best || total < best.total;
    if (rec) { best = { total: total, par: par }; save("golf-best-v1", best); }
    G.over = true; G.phase = "over";
    showCard("<h2>🏁 Parcours terminé !</h2><p><strong>" + total + "</strong> coups · " + diffStr(total - par) + (rec ? " · <strong>Nouveau record !</strong> 🏆" : (best ? " · record : " + best.total : "")) + "</p>" +
      scoreTable(G.players) +
      '<div class="btn-row center"><button class="btn" type="button" data-act="solo">↻ Rejouer</button><button class="btn btn-ghost btn-small" type="button" data-act="menu">Menu</button></div>', "golf-card-wide");
    screen = "end";
  }
  function showOnlineEnd() {
    var ranked = G.players.slice().sort(function (a, b) { return totalOf(a.id) - totalOf(b.id); });
    var topT = totalOf(ranked[0].id), winners = ranked.filter(function (p) { return totalOf(p.id) === topT; });
    var iWon = winners.some(function (p) { return p.id === ME; });
    var host = isLeader();
    showCard("<h2>" + (winners.length > 1 ? "Égalité !" : "🏆 " + esc(winners[0].name) + " gagne !") + "</h2>" +
      "<p>" + (iWon ? "Bravo, " + (winners.length > 1 ? "vous êtes à égalité" : "c'est toi") + " ! " : "") + "Meilleur score : <strong>" + topT + "</strong> (" + diffStr(topT - parOf()) + ")</p>" +
      scoreTable(ranked) +
      '<div class="btn-row center">' +
      (host ? '<button class="btn" type="button" data-act="rematch">↻ Revanche</button>' : '<span class="waiting">L\'hôte peut lancer une revanche…</span>') +
      '<button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter le salon</button></div>', "golf-card-wide");
    screen = "end";
    sfx("notify");
  }

  /* ---------- lancement ---------- */
  function startSolo() {
    leaveOnline(true);
    G = newGame({ mode: "solo", order: HOLES.map(function (h, i) { return i; }), players: [{ id: ME, name: "Toi" }] });
    loadHole(); closeCard();
  }
  function startPractice(i) {
    leaveOnline(true);
    G = newGame({ mode: "practice", order: [i], players: [{ id: ME, name: "Toi" }] });
    loadHole(); closeCard();
  }

  cardEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.dataset.act; ac();
    if (a === "menu") { readName(); if (G && G.mode !== "online") G = null; leaveOnline(); showMenu("main"); }
    else if (a === "solo") startSolo();
    else if (a === "practice") showMenu("practice");
    else if (a === "p1") startPractice(Number(b.dataset.h));
    else if (a === "online") showMenu("online");
    else if (a === "next") soloNext();
    else if (a === "create") { readName(); netCreate(); }
    else if (a === "join") {
      readName();
      var c = (($("[data-code]", cardEl) || {}).value || "").trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(c)) { NET.err = "Le code a 4 lettres."; showMenu("online"); return; }
      netJoin(c, false);
    }
    else if (a === "start") hostStart();
    else if (a === "rematch") hostStart();
    else if (a === "copy") copyLink(b);
    else if (a === "leave") { leaveOnline(); G = null; showMenu("main"); }
  });
  cardEl.addEventListener("change", function (ev) {
    if (ev.target.matches("[data-sound]")) { soundOn = ev.target.checked; save("golf-sound", soundOn); }
    if (ev.target.matches("[data-name]")) { readName(); if (NET.ch) trackMe(); }
  });
  cardEl.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.matches("[data-code]")) { var b = $('[data-act="join"]', cardEl); if (b) b.click(); }
  });
  function copyLink(btn) {
    if (!NET.code) return;
    var link = location.href.split("#")[0] + "#salon=" + NET.code;
    var done = function () { if (btn) btn.textContent = "✅ Lien copié"; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { prompt("Copie ce lien :", link); });
    else prompt("Copie ce lien :", link);
  }

  /* =====================================================================
     EN LIGNE (Supabase Realtime)
     ===================================================================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var EVENTS = ["start", "pos", "done", "next", "sync", "state"];
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    return NET.client;
  }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH.charAt((Math.random() * CODE_CH.length) | 0); return s; }
  function netCreate() { var code = newCode(); sset("golf-host-" + code, "1"); netJoin(code, true, false); }
  function netJoin(code, asHost, restored) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showMenu("online"); return; }
    leaveOnline(true);
    if (G && G.mode !== "online") G = null;
    NET.code = code; NET.role = asHost ? "host" : "guest"; NET.status = "connexion"; NET.err = ""; NET.roster = []; NET.ts = now(); NET.busy = false;
    var ch = cl.channel("golf-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    EVENTS.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload || {}); } catch (err) { if (window.console) console.error(err); } }); });
    ch.subscribe(function (status) {
      if (NET.ch !== ch) return;
      NET.status = status;
      if (status === "SUBSCRIBED") { trackMe(); netSend("sync", { from: NET.id }); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      refreshLobby();
    });
    NET.ch = ch;
    if (history.replaceState) history.replaceState(null, "", "#salon=" + code);
    showMenu("lobby");
  }
  function refreshLobby() { if (!overlay.hidden && (screen === "lobby" || screen === "joining")) showMenu(screen); }
  function leaveOnline(silent) {
    if (NET.ch) {
      try { NET.ch.untrack(); } catch (e) {}
      try { NET.client.removeChannel(NET.ch); } catch (e) {}
    }
    NET.ch = null; NET.code = null; NET.role = null; NET.roster = [];
    if (G && G.mode === "online") { G = null; hudUpdate(true); }
    if (!silent && location.hash.indexOf("salon=") >= 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  function trackMe() { if (NET.ch) try { NET.ch.track({ id: NET.id, name: myName(), host: NET.role === "host", ts: NET.ts, v: VERSION }); } catch (e) {} }
  function present(id) { return id === ME || NET.roster.some(function (x) { return x.id === id; }); }
  function isLeader() {
    if (!G || G.mode !== "online") return false;
    for (var i = 0; i < G.players.length; i++) if (present(G.players[i].id)) return G.players[i].id === ME;
    return false;
  }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    NET.roster = list;
    if (G && G.mode === "online") {
      list.forEach(function (x) { var i = playerIndex(x.id); if (i >= 0) G.players[i].name = x.name || G.players[i].name; });
      if (G.players.every(function (p) { return p.id === ME || !present(p.id); }) && !G.over) setMsg("Les autres joueurs sont partis.", 4000);
    }
    refreshLobby();
  }

  function hostStart() {
    if (!NET.ch || (NET.role !== "host" && !isLeader())) return;
    var players = NET.roster.slice(0, 4).map(function (x) { return { id: x.id, name: x.name || "Écureuil" }; });
    if (players.length < 2) return;
    var d = { gid: Math.random().toString(36).slice(2, 10), players: players, order: HOLES.map(function (h, i) { return i; }), ts: now() };
    adoptStart(d);
    netSend("start", d);
  }
  function adoptStart(d) {
    if (!d.players.some(function (p) { return p.id === ME; })) { NET.busy = true; G = null; showMenu("lobby"); return; }
    NET.busy = false;
    G = newGame({ mode: "online", gid: d.gid, order: d.order, players: d.players.map(function (p) { return { id: p.id, name: p.name }; }) });
    loadHole(); closeCard();
  }
  function markDone(id, s, holed, h) {
    if (!G.doneAll[h]) G.doneAll[h] = {};
    G.doneAll[h][id] = { s: s, c: holed };
    if (h !== G.hi) return;
    if (!G.firstDoneAt) G.firstDoneAt = now();
    G.scores[id][h] = s;
    if (id !== ME && G.others[id]) { G.others[id].done = true; G.others[id].holed = !!holed; G.others[id].s = s; }
  }
  function allDone() {
    var dn = G.doneAll[G.hi] || {};
    return G.players.every(function (p) { return dn[p.id] || !present(p.id); });
  }
  function leaderTick() {
    if (G.over || !G.firstDoneAt || !isLeader()) return;
    var t = now();
    if (!G.nextAt) {
      if (allDone()) G.nextAt = t + 2600;
      else if (t - G.firstDoneAt > 60000) G.nextAt = t;
    }
    if (G.nextAt && t >= G.nextAt) advance();
  }
  function advance() {
    var h = curHole(), dn = G.doneAll[G.hi] || {}, fin = {};
    G.players.forEach(function (p) {
      if (dn[p.id]) fin[p.id] = dn[p.id].s;
      else { var o = G.others[p.id]; fin[p.id] = Math.min(MAX_STROKES, Math.max(h.par + 3, (o && o.s) || 0)); }
    });
    var d = { gid: G.gid, h: G.hi + 1, fin: fin };
    netSend("next", d);
    applyNext(d);
  }
  function applyNext(d) {
    if (!G || G.mode !== "online" || d.gid !== G.gid || d.h <= G.hi) return;
    Object.keys(d.fin || {}).forEach(function (id) { if (G.scores[id]) G.scores[id][G.hi] = d.fin[id]; });
    if (G.phase !== "done" && !G.scores[ME][G.hi]) G.scores[ME][G.hi] = (d.fin || {})[ME];
    if (d.h >= G.order.length) {
      G.over = true; G.phase = "over"; G.nextAt = 0; hudUpdate(true);
      showOnlineEnd();
      return;
    }
    G.hi = d.h; loadHole();
  }
  function onNet(ev, d) {
    if (ev === "sync") {
      if (G && G.mode === "online" && isLeader()) netSend("state", { gid: G.gid, hi: G.hi, over: G.over, players: G.players, order: G.order, scores: G.scores, to: d.from });
      return;
    }
    if (ev === "start") {
      if (!d.gid || !d.players) return;
      if (!G || G.gid !== d.gid) adoptStart(d);
      return;
    }
    if (ev === "state") {
      if (d.to !== ME || !d.gid || !d.players || (G && G.gid === d.gid)) return;
      if (!d.players.some(function (p) { return p.id === ME; })) { NET.busy = true; refreshLobby(); return; }
      G = newGame({ mode: "online", gid: d.gid, order: d.order, players: d.players });
      Object.keys(d.scores || {}).forEach(function (id) { if (G.scores[id]) G.scores[id] = d.scores[id]; });
      G.hi = d.hi; G.over = !!d.over;
      if (G.over) { G.phase = "over"; showOnlineEnd(); } else { loadHole(); closeCard(); }
      return;
    }
    if (!G || G.mode !== "online" || d.gid !== G.gid) return;
    if (ev === "pos") {
      if (d.h !== G.hi || d.id === ME) return;
      var o = G.others[d.id]; if (!o) return;
      o.tx = d.x; o.ty = d.y; o.s = d.s;
      if (d.f) o.holed = true;
      if (Math.abs(o.x - d.x) + Math.abs(o.y - d.y) > 400) { o.x = d.x; o.y = d.y; }
    } else if (ev === "done") {
      if (d.id === ME || !G.scores[d.id]) return;
      markDone(d.id, d.s, !!d.c, d.h);
      if (d.h === G.hi && G.phase !== "done") setMsg(nameOf(d.id) + " a fini le trou", 2200);
    } else if (ev === "next") applyNext(d);
  }
  function nameOf(id) { var i = playerIndex(id); return i >= 0 ? G.players[i].name : "Un joueur"; }

  /* =====================================================================
     DÉMARRAGE
     ===================================================================== */
  resize();
  requestAnimationFrame(frame);
  var hm = /salon=([A-Za-z]{4})/.exec(location.hash);
  if (hm) {
    var code = hm[1].toUpperCase();
    if (!$("[data-name]", cardEl)) { /* pseudo mémorisé, on rejoint directement */ }
    netJoin(code, sget("golf-host-" + code) === "1", true);
  } else showMenu("main");
  var headMenu = $("[data-golf-menu]");
  if (headMenu) headMenu.addEventListener("click", function () {
    if (G && G.mode === "online") { screen = "lobby"; showCard('<h2>Pause</h2><p>La partie en ligne continue pour les autres.</p><div class="btn-row center"><button class="btn" type="button" data-act="resume">Reprendre</button><button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter le salon</button></div>'); }
    else { if (G) G.drag = null; showMenu("main"); }
  });
  cardEl.addEventListener("click", function (ev) { if (ev.target.closest('[data-act="resume"]')) closeCard(); });
  window.addEventListener("hashchange", function () {
    var m = /salon=([A-Za-z]{4})/.exec(location.hash);
    if (m && m[1].toUpperCase() !== NET.code) netJoin(m[1].toUpperCase(), false);
  });
  window.addEventListener("beforeunload", function () { if (NET.ch) try { NET.ch.untrack(); } catch (e) {} });
  if (/[?&]debug/.test(location.search)) window.GOLF_DEBUG = { G: function () { return G; }, NET: NET, HOLES: HOLES, shoot: shoot, load: function (i) { G.hi = i; loadHole(); closeCard(); }, inPoly: inPoly, inRects: inRects, setT: function (t) { simT = t; }, step: function (n) { for (var i = 0; i < n; i++) { simStep(); if ((i & 255) === 0) G.fx.length = 0; } }, cam: cam };
})();
