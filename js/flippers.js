/* =========================================================================
   Flippers : flipper de la forêt, solo.
   Physique maison (cercle contre segments, pas fixe de 1/300 s), rendu canvas.
   Table de 480 × 840 unités, bille de rayon 14 ; couloir du ressort à droite.
   Mécaniques : 2 flippers, 2 lance-pierres, 3 champignons (pop bumpers), orbite
   gauche avec spinner, rampe à droite (trajet scripté), banque de 4 cibles
   rabattables, 5 cibles GLAND, 3 passages du haut, voies de flippers
   (rotation avec les flippers) + kickback et sauvetage des outlanes, terrier
   à verrou (3 billes = multibille), multiplicateur, bonus de fin de bille.
   Réglages en haut : G, VMAX, FLIPPER, BUMPERS, TARGETS, SAUCER, RAMP…
   ?debug dans l'URL expose window.FLIPPERS_DEBUG pour les tests.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.querySelector("[data-fl]");
  if (!root) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var canvas = $("[data-fl-canvas]"), ctx = canvas.getContext("2d");

  /* ---------- réglages ---------- */
  var W = 480, H = 840;
  var R = 14;                    // rayon de la bille
  var G = 900;                   // gravité (unités / s²)
  var DT = 1 / 300;              // pas de physique
  var VMAX = 1700;               // vitesse max de la bille
  var LIVES = 3;
  var SAVE_TIME = 10;            // une bille perdue pendant ce délai est rendue (une fois)
  var LANE_X0 = 420, LANE_X1 = 456, LANE_C = 438;
  var PLUNGER_Y = 800, PLUNGER_TRAVEL = 26;
  var MULT_MAX = 5, BONUSX_MAX = 5;
  var EXTRA_BALL_AT = 75000;
  var BEST_KEY = "flippers-best-v1", SND_KEY = "flippers-sound-v1", CBEST_KEY = "flippers-climb-best-v1", CTIME_KEY = "flippers-climb-time-v1", MODE_KEY = "flippers-mode-v1";

  var FLIPPER = { L: 92, rest: 0.5, up: -0.48, wUp: 15, wDown: 9, e: 0.45, r0: 11, r1: 6 };
  var BUMPERS = [{ x: 180, y: 200, r: 24 }, { x: 264, y: 200, r: 24 }, { x: 222, y: 272, r: 24 }];
  var LETTERS = ["G", "L", "A", "N", "D"];
  var TARGETS = [{ x: 130, y: 408 }, { x: 178, y: 396 }, { x: 226, y: 390 }, { x: 274, y: 396 }, { x: 322, y: 408 }];
  var TARGET_R = 12;
  var DROPS = [171, 205, 239, 273].map(function (x) { return { x: x, y: 470, hw: 15, down: false, flash: 0 }; });
  var SAUCER = { x: 96, y: 252, r: 18 };
  var SPINNER = { x: 48, y: 410, hw: 22 };
  var LANES = [{ x0: 110, x1: 200 }, { x0: 200, x1: 280 }, { x0: 280, x1: 370 }];
  var LANE_LAMPS = [42, 80, 364, 402];            // outlane G, inlane G, inlane D, outlane D
  var RAMP = {
    mouth: { x: 372, y: 350, r: 24 },
    pts: [[372, 350], [384, 270], [352, 180], [280, 122], [180, 112], [128, 150]],
    speed: 560,
  };

  /* ---------- géométrie fixe ---------- */
  var segs = [];
  function addSeg(x1, y1, x2, y2, o) {
    o = o || {};
    segs.push({
      x1: x1, y1: y1, x2: x2, y2: y2,
      e: o.e != null ? o.e : 0.35, r: o.r != null ? o.r : 2.5,
      oneWay: !!o.oneWay, sling: o.sling != null ? o.sling : null, kind: o.kind || "wall",
    });
  }
  var AC = { x: 240, y: 240, r: 216 }, ARC_N = 60;
  for (var i = 0; i < ARC_N; i++) {
    var a1 = Math.PI + Math.PI * i / ARC_N, a2 = Math.PI + Math.PI * (i + 1) / ARC_N;
    addSeg(AC.x + Math.cos(a1) * AC.r, AC.y + Math.sin(a1) * AC.r, AC.x + Math.cos(a2) * AC.r, AC.y + Math.sin(a2) * AC.r, { kind: "arc" });
  }
  addSeg(24, 240, 24, 800);                                    // mur gauche (jusqu'à l'outlane)
  addSeg(LANE_X1, 240, LANE_X1, 830);                          // mur droit
  addSeg(LANE_X0, 830, LANE_X1, 830);                          // fond du couloir
  addSeg(LANE_X0, 258, LANE_X0, 830);                          // paroi du couloir
  addSeg(LANE_X0, 100, LANE_X0, 258, { oneWay: true });        // clapet : la bille entre dans le jeu, ne redescend pas
  addSeg(72, 330, 72, 490);                                    // guide de l'orbite gauche
  addSeg(60, 590, 60, 670);                                    // séparateurs voie / outlane
  addSeg(384, 590, 384, 670);
  addSeg(60, 670, 116, 740, { e: 0.2, kind: "slope" });        // guides vers les flippers
  addSeg(384, 670, 328, 740, { e: 0.2, kind: "slope" });
  addSeg(200, 50, 200, 105, { r: 3 });                         // séparateurs des passages du haut
  addSeg(280, 50, 280, 105, { r: 3 });
  var SLINGS = [
    { pts: [[100, 520], [100, 630], [150, 630]], nx: 0.91, ny: -0.414, flash: 0 },
    { pts: [[344, 520], [344, 630], [294, 630]], nx: -0.91, ny: -0.414, flash: 0 },
  ];
  SLINGS.forEach(function (s, idx) {
    addSeg(s.pts[0][0], s.pts[0][1], s.pts[1][0], s.pts[1][1], { e: 0.2, kind: "sling-side" });
    addSeg(s.pts[1][0], s.pts[1][1], s.pts[2][0], s.pts[2][1], { e: 0.2, kind: "sling-side" });
    addSeg(s.pts[0][0], s.pts[0][1], s.pts[2][0], s.pts[2][1], { e: 0.45, sling: idx, kind: "sling" });
  });
  var plungerSeg = { r: 2 };

  var flippers = [
    { px: 116, py: 740, s: 1, a: FLIPPER.rest, w: 0, key: "left" },
    { px: 328, py: 740, s: -1, a: FLIPPER.rest, w: 0, key: "right" },
  ];

  // trajet de la rampe : longueurs cumulées
  function prepRamp(r) {
    r.len = [0];
    for (var i = 1; i < r.pts.length; i++) {
      var dx = r.pts[i][0] - r.pts[i - 1][0], dy = r.pts[i][1] - r.pts[i - 1][1];
      r.len.push(r.len[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    r.total = r.len[r.len.length - 1];
    return r;
  }
  function rampPoint(r, d) {
    d = Math.max(0, Math.min(r.total, d));
    for (var k = 1; k < r.len.length; k++) {
      if (d <= r.len[k]) {
        var t = (d - r.len[k - 1]) / (r.len[k] - r.len[k - 1]), a = r.pts[k - 1], b = r.pts[k];
        return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
      }
    }
    var l = r.pts[r.pts.length - 1];
    return { x: l[0], y: l[1] };
  }
  prepRamp(RAMP);
  var RAMPS = [RAMP];
  var WORLD_H = H, LANE_MINY = 360;
  var M = { climb: false };
  var CLASSIC = { segs: segs, flippers: flippers, BUMPERS: BUMPERS, TARGETS: TARGETS, DROPS: DROPS, SLINGS: SLINGS };

  /* ---------- état ---------- */
  var S = {
    mode: "menu",            // menu | play | paused | over
    score: 0, best: parseInt(store(BEST_KEY), 10) || 0,
    lives: LIVES, ballNo: 1, mult: 1, bonusHits: 0, bonusExtra: 0, bonusX: 1, extraGiven: false,
    letters: [false, false, false, false, false], lanes: [false, false, false], lamps: [false, false, false, false],
    balls: [], charge: 0, plungerY: PLUNGER_Y,
    hold: { left: {}, right: {}, plunger: {} },
    saver: 0, saverArm: true, nudge: 0, tilt: false,
    kickback: true, rightSave: false, lockLit: false, locked: 0, multi: false, rampCombo: 0,
    spin: { a: 0, w: 0, n: 0 }, dropReset: 0,
    draining: false, drainTimer: 0, saucerCool: 0, t: 0, shake: 0,
    msg: "", msgT: 0, newBest: false, nextId: 1,
    stageK: 0, prevK: -1, fall: null, drama: 0, timeScale: 1, starT: 0, featherT: 0, net: false, tcool: 0, banner: "", banner2: "", bannerT: 0, bannerCol: "#ffffff",
    zoneK: 0, cp: { x: 0, y: 0 }, camX: 0, respawn: 0, deathT: 0,
    pref: store(MODE_KEY) === "climb" ? "climb" : "classic", room: 0, topY: 0, climbTime: 0, camY: 0, won: false, bestTime: parseFloat(store(CTIME_KEY)) || 0, newBestTime: false,
  };
  var particles = [], popups = [];
  var bumpFlash = BUMPERS.map(function () { return 0; });
  var targetFlash = TARGETS.map(function () { return 0; });

  function serve(auto) {
    if (M.climb) { S.balls.push({ id: S.nextId++, x: S.cp.x, y: S.cp.y, vx: 0, vy: 0, mode: "live", auto: 0, still: 0, trail: [], fs: S.cp.y }); return; }
    S.balls.push({ id: S.nextId++, x: LANE_C, y: PLUNGER_Y - R - 1, vx: 0, vy: 0, mode: "lane", auto: auto || 0, still: 0, trail: [] });
  }
  function newBall() {
    S.balls = []; S.charge = 0; S.tilt = false; S.nudge = 0; S.saver = 0; S.saverArm = true;
    S.bonusHits = 0; S.bonusExtra = 0; S.bonusX = 1; S.kickback = true; S.rightSave = false; S.multi = false; S.rampCombo = 0;
    S.lamps = [false, false, false, false]; S.lanes = [false, false, false];
    DROPS.forEach(function (d) { d.down = false; });
    S.dropReset = 0; S.saucerCool = 0;
    S.prevK = -1; S.fall = null; S.drama = 0; S.timeScale = 1; S.tcool = 0; S.stageK = 0;
    serve(0);
  }

  /* ---------- sons ---------- */
  var actx = null, soundOn = store(SND_KEY) !== "0";
  function audio() {
    if (!soundOn) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  var lastWallSnd = 0, lastSpinSnd = 0;
  var SND = {
    bumper: function () { tone(420, 760, 0.12, "square", 0.07); },
    sling: function () { tone(300, 520, 0.08, "sawtooth", 0.05); },
    target: function () { tone(880, 1320, 0.1, "triangle", 0.09); },
    drop: function () { tone(300, 140, 0.12, "square", 0.07); },
    flip: function () { tone(140, 70, 0.05, "square", 0.05); },
    wall: function () { tone(220, 160, 0.04, "triangle", 0.035); },
    launch: function () { tone(160, 620, 0.35, "sawtooth", 0.05); },
    lane: function () { tone(660, 990, 0.08, "triangle", 0.07); },
    saucer: function () { tone(500, 120, 0.3, "triangle", 0.09); },
    eject: function () { tone(200, 900, 0.18, "square", 0.06); },
    ramp: function () { tone(300, 1100, 0.5, "triangle", 0.07); },
    spin: function () { tone(1000, 1000, 0.02, "square", 0.03); },
    kick: function () { tone(120, 900, 0.25, "sawtooth", 0.08); },
    drain: function () { tone(330, 70, 0.7, "sawtooth", 0.07); },
    jackpot: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.16, "square", 0.06, i * 0.07); }); },
    tilt: function () { tone(110, 80, 0.5, "sawtooth", 0.09); },
    bonus: function () { tone(740, 740, 0.05, "square", 0.05); },
    fall: function () { tone(520, 90, 1.2, "sine", 0.07); tone(390, 70, 1.4, "triangle", 0.05, 0.15); },
    crash: function () { tone(160, 40, 0.6, "sawtooth", 0.1); tone(80, 35, 0.7, "square", 0.07); tone(300, 60, 0.4, "triangle", 0.05, 0.1); },
  };

  /* ---------- score et messages ---------- */
  var hud = {
    score: $("[data-fl-score]"), best: $("[data-fl-best]"), balls: $("[data-fl-balls]"),
    mult: $("[data-fl-mult]"), bonus: $("[data-fl-bonus]"), lock: $("[data-fl-lock]"), msg: $("[data-fl-msg]"),
  };
  hud.bonusLabel = hud.bonus && hud.bonus.previousElementSibling; hud.lockLabel = hud.lock && hud.lock.previousElementSibling;
  var hudCache = {};
  function setHud(k, v) { if (hudCache[k] !== v && hud[k]) { hudCache[k] = v; hud[k].textContent = v; } }
  function fmtTime(t) { t = Math.floor(t); return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function updateHud() {
    setHud("score", fmt(S.score));
    setHud("best", fmt(Math.max(S.best, S.score)));
    setHud("balls", S.mode === "menu" ? String(LIVES) : String(Math.max(0, S.lives)));
    setHud("mult", "×" + S.mult);
    if (M.climb) {
      setHud("bonus", Math.max(0, Math.round(((CW ? CW.spawn.y : 0) - S.topY) / 20)) + " m");
      setHud("lock", (S.zoneK + 1) + "/" + (CW ? CW.n : 9) + " · " + fmtTime(S.climbTime));
    } else {
      setHud("bonus", "×" + S.bonusX);
      setHud("lock", S.multi ? "MULTI" : S.locked + "/3" + (S.lockLit ? " ★" : ""));
    }
    if (hud.bonusLabel && hudCache.mode !== M.climb) {
      hudCache.mode = M.climb; hud.bonusLabel.textContent = M.climb ? "Hauteur" : "Bonus"; hud.lockLabel.textContent = M.climb ? "Zone · temps" : "Verrous";
      if (hud.balls && hud.balls.previousElementSibling) hud.balls.previousElementSibling.textContent = M.climb ? "Cœurs" : "Billes";
    }
    setHud("msg", S.msg);
  }
  function say(text, secs) { S.msg = text; S.msgT = secs || 2.5; }
  function popup(x, y, text, col) { popups.push({ x: x, y: y, text: text, life: 1, col: col || "#fff3c4" }); }
  function addScore(n, x, y, noMult) {
    var v = (noMult ? n : n * S.mult) * (S.starT > 0 ? 2 : 1);
    S.score += v;
    if (x != null) popup(x, y, "+" + fmt(v));
    if (!S.extraGiven && S.score >= EXTRA_BALL_AT) {
      S.extraGiven = true; S.lives++; say("Bille bonus !", 3); SND.jackpot();
    }
  }
  function burst(x, y, col, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = (0.3 + Math.random()) * (sp || 160);
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, max: 0.4 + Math.random() * 0.4, col: col, size: 2 + Math.random() * 2.5 });
    }
  }

  /* ---------- collisions ---------- */
  var hit = { nx: 0, ny: 0, t: 0, cx: 0, cy: 0 };
  // Cercle (la bille) contre capsule [a, b] de rayon rad. Renvoie true et remplit `hit` si contact (la bille est repoussée).
  function circleSeg(b, x1, y1, x2, y2, rad) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((b.x - x1) * dx + (b.y - y1) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return circleSegT(b, x1, y1, x2, y2, t, rad);
  }
  function circleSegT(b, x1, y1, x2, y2, t, rad) {
    var cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
    var nx = b.x - cx, ny = b.y - cy, rr = R + rad, d2 = nx * nx + ny * ny;
    if (d2 >= rr * rr) return false;
    var d = Math.sqrt(d2);
    if (d < 1e-6) {
      var sx = y2 - y1, sy = x1 - x2, sl = Math.sqrt(sx * sx + sy * sy) || 1;
      nx = sx / sl; ny = sy / sl; d = 0;
    } else { nx /= d; ny /= d; }
    var push = rr - d;
    b.x += nx * push; b.y += ny * push;
    hit.nx = nx; hit.ny = ny; hit.t = t; hit.cx = cx; hit.cy = cy;
    return true;
  }
  // Rebond : renvoie la vitesse d'impact (positive) le long de la normale.
  function bounce(b, nx, ny, e, svx, svy) {
    var rvx = b.vx - svx, rvy = b.vy - svy;
    var vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    var ee = -vn < 45 ? 0 : e;
    rvx -= (1 + ee) * vn * nx; rvy -= (1 + ee) * vn * ny;
    b.vx = rvx + svx; b.vy = rvy + svy;
    return -vn;
  }

  function collideStatics(b) {
    var i, s;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      if (s.maxx !== undefined && (b.x + R + 4 < s.minx || b.x - R - 4 > s.maxx || b.y + R + 4 < s.miny || b.y - R - 4 > s.maxy)) continue;
      if (s.plat && (b.vy < 0 || b.y > s.y1)) continue;   // plateforme traversable par le dessous
      if (s.oneWay && b.x >= s.x1) continue;      // le clapet ne gêne pas la bille qui vient du couloir
      if (!circleSeg(b, s.x1, s.y1, s.x2, s.y2, s.r)) continue;
      var vn = bounce(b, hit.nx, hit.ny, s.e, 0, 0);
      if (s.sling != null) {
        var sl = SLINGS[s.sling];
        if (hit.nx * sl.nx + hit.ny * sl.ny > 0.5 && vn > 80 && sl.flash <= 0.05) {
          b.vx += sl.nx * 450; b.vy += sl.ny * 450;
          sl.flash = 1; addScore(50, hit.cx, hit.cy); SND.sling();
          burst(hit.cx, hit.cy, "#ffb347", 6, 140);
        }
      } else if (vn > 300 && S.t - lastWallSnd > 0.07) { lastWallSnd = S.t; SND.wall(); }
    }
    // plateau du ressort
    if (circleSeg(b, LANE_X0 + 1, S.plungerY, LANE_X1 - 1, S.plungerY, plungerSeg.r)) bounce(b, hit.nx, hit.ny, 0, 0, 0);
    // flippers
    for (i = 0; i < flippers.length; i++) {
      var f = flippers[i];
      var tx = f.px + f.s * FLIPPER.L * Math.cos(f.a), ty = f.py + FLIPPER.L * Math.sin(f.a);
      var dx = tx - f.px, dy = ty - f.py, l2 = dx * dx + dy * dy;
      var t = ((b.x - f.px) * dx + (b.y - f.py) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      var rad = FLIPPER.r0 + (FLIPPER.r1 - FLIPPER.r0) * t;
      if (!circleSegT(b, f.px, f.py, tx, ty, t, rad)) continue;
      var d = t * FLIPPER.L;
      var svx = -f.s * Math.sin(f.a) * d * f.w, svy = Math.cos(f.a) * d * f.w;
      var v = bounce(b, hit.nx, hit.ny, FLIPPER.e, svx, svy);
      if (v > 240 && Math.abs(f.w) > 3) { SND.flip(); S.shake = Math.max(S.shake, 1.4); }
    }
    // champignons
    for (i = 0; i < BUMPERS.length; i++) {
      var p = BUMPERS[i];
      var nx = b.x - p.x, ny = b.y - p.y, rr = R + p.r, d2 = nx * nx + ny * ny;
      if (d2 >= rr * rr) continue;
      var dd = Math.sqrt(d2) || 0.001; nx /= dd; ny /= dd;
      b.x = p.x + nx * rr; b.y = p.y + ny * rr;
      if (p.kind === "pad" && ny < -0.3 && b.vy > 0) { b.vy = -1180; b.vx *= 0.5; }
      else { var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy); var out = p.kind === "peg" ? Math.max(480, sp * 0.85) : Math.max(670, sp * 0.9); b.vx = nx * out; b.vy = ny * out; }
      bumpFlash[i] = 1; p.flash = 1; S.bonusHits++;
      addScore(p.kind === "pad" ? 50 : 100, p.x, p.y - p.r); SND.bumper(); S.shake = Math.max(S.shake, 2);
      burst(p.x + nx * p.r, p.y + ny * p.r, "#ffd257", 8, 220);
      if (S.bonusHits % 10 === 0) say("Bonus de bille : " + fmt(S.bonusHits * 100 + S.bonusExtra) + " ×" + S.bonusX, 1.8);
    }
    // cibles GLAND
    for (i = 0; i < TARGETS.length; i++) {
      var q = TARGETS[i];
      var tx2 = b.x - q.x, ty2 = b.y - q.y, r2 = R + TARGET_R, dq = tx2 * tx2 + ty2 * ty2;
      if (dq >= r2 * r2) continue;
      var dl = Math.sqrt(dq) || 0.001; tx2 /= dl; ty2 /= dl;
      b.x = q.x + tx2 * r2; b.y = q.y + ty2 * r2;
      var vn2 = bounce(b, tx2, ty2, 0.55, 0, 0);
      if (vn2 > 35) {
        targetFlash[i] = 1; SND.target();
        if (!S.letters[i]) {
          S.letters[i] = true; addScore(500, q.x, q.y - 18); burst(q.x, q.y, "#ffe08a", 10, 170);
          if (S.letters.every(Boolean)) completeLetters();
        } else addScore(50, q.x, q.y - 18);
      }
    }
    // cibles rabattables
    for (i = 0; i < DROPS.length; i++) {
      var dt = DROPS[i];
      if (dt.down) continue;
      if (!circleSeg(b, dt.x - dt.hw, dt.y, dt.x + dt.hw, dt.y, 4)) continue;
      var vn3 = bounce(b, hit.nx, hit.ny, 0.3, 0, 0);
      if (vn3 > 110) {
        dt.down = true; dt.flash = 1; SND.drop(); S.bonusExtra += 200;
        addScore(300, dt.x, dt.y - 22); burst(dt.x, dt.y, "#ffb347", 8, 150);
        if (DROPS.every(function (x) { return x.down; })) completeDrops();
      }
    }
    if (M.climb) climbCollide(b);
  }

  function completeLetters() {
    addScore(5000, 240, 360, true);
    S.bonusExtra += 1000;
    raiseMult("GLAND complet !");
    SND.jackpot();
    setTimeout(function () { S.letters = [false, false, false, false, false]; }, 700);
  }
  function completeDrops() {
    addScore(3000, 222, 440);
    S.bonusExtra += 2000; S.dropReset = 1.4;
    S.rightSave = true;
    if (!S.lockLit && !S.multi) { S.lockLit = true; say("Verrou allumé : envoie la bille dans le terrier !", 3.5); }
    else say("Cibles rabattues ! Outlane droite sauvée", 3);
    SND.jackpot();
  }
  function raiseMult(why) {
    if (S.mult < MULT_MAX) { S.mult++; say(why + " Multiplicateur ×" + S.mult, 3); }
    else { addScore(10000, 240, 330, true); say(why + " +10 000 !", 3); }
  }
  function rotateLamps(dir) {
    var a = S.lamps, n = a.length, out = [];
    for (var i = 0; i < n; i++) out[i] = a[(i + dir + n) % n];
    S.lamps = out;
  }
  function lampsCheck() {
    if (S.lamps.every(Boolean)) {
      S.lamps = [false, false, false, false];
      if (S.bonusX < BONUSX_MAX) { S.bonusX++; say("Voies complètes ! Bonus ×" + S.bonusX, 2.5); }
      else { addScore(5000, 240, 600, true); say("Voies complètes ! +5 000", 2.5); }
      SND.jackpot();
    }
  }

  /* ---------- filet de sécurité ---------- */
  var SLOPE_IN = [
    { x1: 60, y1: 670, x2: 116, y2: 740, nx: 0.78, ny: -0.62 },
    { x1: 384, y1: 670, x2: 328, y2: 740, nx: -0.78, ny: -0.62 },
  ];
  function contain(b) {
    if (M.climb) { if (b.x < R) { b.x = R; if (b.vx < 0) b.vx = 0; } if (b.x > CW.width - R) { b.x = CW.width - R; if (b.vx > 0) b.vx = 0; } if (b.y < R) { b.y = R; if (b.vy < 0) b.vy = 0; } return; }
    if (b.x > LANE_X0 - 2) {                              // couloir du ressort
      if (b.x > LANE_X1 - R) { b.x = LANE_X1 - R; if (b.vx > 0) b.vx = 0; }
      if (b.y < AC.y && b.x > LANE_X0) {
        var dxl = b.x - AC.x, dyl = b.y - AC.y, dl = Math.sqrt(dxl * dxl + dyl * dyl), lim = AC.r - R - 2;
        if (dl > lim && dl > 0) { b.x = AC.x + dxl / dl * lim; b.y = AC.y + dyl / dl * lim; }
      }
      return;
    }
    if (b.x < 24 + R) { b.x = 24 + R; if (b.vx < 0) b.vx = 0; }
    if (b.y < AC.y) {
      var dx = b.x - AC.x, dy = b.y - AC.y, d = Math.sqrt(dx * dx + dy * dy), lim2 = AC.r - R - 2;
      if (d > lim2 && d > 0) { b.x = AC.x + dx / d * lim2; b.y = AC.y + dy / d * lim2; var vn = (b.vx * dx + b.vy * dy) / d; if (vn > 0) { b.vx -= vn * dx / d; b.vy -= vn * dy / d; } }
    }
    for (var i = 0; i < SLOPE_IN.length; i++) {
      var sl = SLOPE_IN[i];
      var lo = Math.min(sl.x1, sl.x2) + 6, hi = Math.max(sl.x1, sl.x2);
      if (b.x < lo || b.x > hi) continue;
      var ex = sl.x2 - sl.x1, ey = sl.y2 - sl.y1, el = Math.sqrt(ex * ex + ey * ey);
      var sign = (sl.nx * -ey + sl.ny * ex) < 0 ? -1 : 1;
      var nxn = sign * -ey / el, nyn = sign * ex / el;
      var sd = (b.x - sl.x1) * nxn + (b.y - sl.y1) * nyn;
      if (sd < 5) {
        b.x += nxn * (5 - sd); b.y += nyn * (5 - sd);
        var vn2 = b.vx * nxn + b.vy * nyn;
        if (vn2 < 0) { b.vx -= vn2 * nxn; b.vy -= vn2 * nyn; }
      }
    }
  }

  /* ---------- pas de simulation ---------- */
  function anyHold(o) { for (var k in o) if (o[k]) return true; return false; }

  function stepFlippers(dt) {
    for (var i = 0; i < flippers.length; i++) {
      var f = flippers[i];
      var on = !S.tilt && S.mode === "play" && anyHold(S.hold[f.key]);
      var target = on ? FLIPPER.up : FLIPPER.rest;
      var old = f.a;
      if (f.a > target) f.a = Math.max(target, f.a - (on ? FLIPPER.wUp : FLIPPER.wDown) * dt);
      else if (f.a < target) f.a = Math.min(target, f.a + (on ? FLIPPER.wUp : FLIPPER.wDown) * dt);
      f.w = (f.a - old) / dt;
      if (on && !f.was) { if (!M.climb || (S.balls[0] && Math.abs(f.py - S.balls[0].y) < 420)) SND.flip(); rotateLamps(f.s > 0 ? -1 : 1); }
      f.was = on;
    }
  }

  function launchBall(b, c) {
    b.vy = -(780 + 700 * c); b.vx = 0; b.auto = 0;
    S.plungerY = PLUNGER_Y; b.y = Math.min(b.y, PLUNGER_Y - R - 1);
    SND.launch();
  }

  function startRamp(b, r) {
    b.mode = "ramp"; b.pt = 0; b.vx = b.vy = 0; b.x = r.mouth.x; b.y = r.mouth.y; b.ramp = r;
    if (M.climb) {
      addScore(r.top ? 0 : 500, r.mouth.x, r.mouth.y - 30); SND.ramp();
      say(r.top ? "Le sommet !" : "La rampe t'emporte vers l'étage " + (r.room + 2), 2.5);
      return;
    }
    var pts = S.multi ? 10000 : 1500 + 500 * Math.min(S.rampCombo, 6);
    S.rampCombo++; S.bonusExtra += 1000;
    addScore(pts, 340, 300);
    say(S.multi ? "JACKPOT ! " + fmt(pts * S.mult) : "Rampe ! " + fmt(pts * S.mult), 2);
    SND.ramp();
  }
  function endRamp(b) {
    var r = b.ramp, p = r.pts[r.pts.length - 1];
    if (r.top) { S.balls.splice(S.balls.indexOf(b), 1); climbWin(); return; }
    b.mode = "live"; b.x = p[0]; b.y = p[1]; b.vx = -60; b.vy = 200; b.trail = [];
    burst(b.x, b.y, "#c9d3d1", 8, 140);
  }
  function saucerEnd(b) {
    var act = b.act;
    if (act === "lock") {
      S.balls.splice(S.balls.indexOf(b), 1);
      serve(0.9);
      SND.eject();
      return;
    }
    b.mode = "live"; b.vx = 300 + Math.random() * 140; b.vy = -(300 + Math.random() * 160);
    S.saucerCool = 1.2; SND.eject(); burst(SAUCER.x, SAUCER.y, "#c9a6ff", 10, 200);
    if (act === "multi") {
      S.multi = true; S.locked = 0; S.lockLit = false; S.saver = 12;
      serve(0.9); serve(2.1);
      say("MULTIBILLE ! Les rampes valent 10 000", 4); SND.jackpot();
    }
  }

  function stepBall(b, dt) {
    if (b.mode === "saucer") { b.timer -= dt; if (b.timer <= 0) saucerEnd(b); return; }
    if (b.mode === "cannon") {
      b.timer -= dt;
      if (b.timer <= 0) { b.mode = "live"; b.vx = b.cannon.vx * (1 + (Math.random() - 0.5) * 0.12); b.vy = b.cannon.vy * (1 + (Math.random() - 0.5) * 0.05); b.trail = []; SND.kick(); S.shake = 6; burst(b.x, b.y, "#f6c445", 16, 300); }
      return;
    }
    if (b.mode === "warp") {
      b.timer -= dt;
      if (b.timer <= 0) { b.mode = "live"; b.x = b.exit.x; b.y = b.exit.y; b.vx = 0; b.vy = 80; b.trail = []; SND.eject(); burst(b.x, b.y, "#ff9ec7", 16, 220); }
      return;
    }
    if (b.mode === "tube") {
      b.pt += b.tube.speed * dt;
      var tp = window.FlippersClimb.tubePoint(b.tube, b.pt); b.x = tp.x; b.y = tp.y;
      if (b.pt >= b.tube.total) { b.mode = "live"; b.vy = -420; b.vx = b.x < 480 ? 150 : -150; b.trail = []; b.fs = b.y; burst(b.x, b.y, "#cdd2dc", 12, 200); SND.eject(); S.shake = 3; }
      return;
    }
    if (b.mode === "ramp") {
      b.pt += b.ramp.speed * dt;
      var rp2 = rampPoint(b.ramp, b.pt); b.x = rp2.x; b.y = rp2.y;
      if (b.pt >= b.ramp.total) endRamp(b);
      return;
    }
    if (b.mode === "lane" && b.auto > 0) {
      b.auto -= dt;
      if (b.auto <= 0 && b.y > PLUNGER_Y - R - 8 && Math.abs(b.vy) < 80) launchBall(b, 0.85);
    }
    b.vy += G * dt * (S.featherT > 0 ? 0.62 : 1);
    b.x += b.vx * dt; b.y += b.vy * dt;
    for (var k = 0; k < 2; k++) collideStatics(b);
    contain(b);
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; sp = VMAX; }

    var inLane = b.x > LANE_X0 && b.y > LANE_MINY;
    if (b.mode === "lane") {
      if (!inLane || b.y < PLUNGER_Y - 80) {
        b.mode = "live";
        if (S.saverArm) { S.saver = SAVE_TIME; S.saverArm = false; }
      }
    } else if (b.mode === "live" && inLane && b.y > PLUNGER_Y - 180 && sp < 70) { b.mode = "lane"; }
    if (b.mode !== "live") return;
    if (M.climb) { climbBall(b, dt, sp); return; }

    // terrier
    var sx = b.x - SAUCER.x, sy = b.y - SAUCER.y;
    if (S.saucerCool <= 0 && sx * sx + sy * sy < 14 * 14) {
      b.mode = "saucer"; b.x = SAUCER.x; b.y = SAUCER.y; b.vx = b.vy = 0; b.timer = 0.9;
      addScore(1500, SAUCER.x + 26, SAUCER.y - 22); SND.saucer(); S.shake = 2.5;
      b.act = "none";
      if (S.lockLit && !S.multi) {
        if (S.locked >= 2) { b.act = "multi"; say("Troisième verrou : MULTIBILLE !", 2.5); }
        else { S.locked++; b.act = "lock"; say("Bille verrouillée " + S.locked + "/3", 2.5); }
      } else say("Le terrier ! 1 500", 2);
    }
    // rampe
    var mdx = b.x - RAMP.mouth.x, mdy = b.y - RAMP.mouth.y;
    if (b.vy < -260 && mdx * mdx + mdy * mdy < RAMP.mouth.r * RAMP.mouth.r) { startRamp(b, RAMP); return; }
    // spinner
    if (Math.abs(b.x - SPINNER.x) < SPINNER.hw && Math.abs(b.y - SPINNER.y) < 16 && sp > 150) {
      S.spin.w = Math.max(S.spin.w, Math.min(34, sp * 0.03 + 6));
      b.vx *= 0.9993; b.vy *= 0.9993;
    }
    // passages du haut
    if (b.y > 62 && b.y < 115) {
      for (var li = 0; li < LANES.length; li++) {
        if (!S.lanes[li] && b.x > LANES[li].x0 && b.x < LANES[li].x1) {
          S.lanes[li] = true; addScore(300, b.x, b.y + 26); SND.lane();
          if (S.lanes.every(Boolean)) {
            addScore(2000, 240, 150, true); raiseMult("Passages complets !"); SND.jackpot();
            setTimeout(function () { S.lanes = [false, false, false]; }, 600);
          }
        }
      }
    }
    // voies de flippers (inlanes / outlanes)
    if (b.y > 620 && b.y < 670 && b.vy > 0) {
      for (var ln = 0; ln < LANE_LAMPS.length; ln++) {
        if (!S.lamps[ln] && Math.abs(b.x - LANE_LAMPS[ln]) < 18) {
          S.lamps[ln] = true; addScore(250, LANE_LAMPS[ln], b.y - 20); SND.lane(); lampsCheck();
        }
      }
    }
    // kickback (outlane gauche) et sauvetage (outlane droite)
    if (b.y > 730) {
      if (b.x > 24 && b.x < 60 && S.kickback) {
        S.kickback = false; b.x = 42; b.vx = 0; b.vy = -1350; SND.kick(); say("Kickback !", 2);
        burst(42, 740, "#ffb347", 12, 220); S.shake = 4;
      } else if (b.x > 384 && b.x < LANE_X0 && S.rightSave) {
        S.rightSave = false; b.lost = "saved"; say("Outlane sauvée !", 2.5); SND.eject();
      }
    }
    // bille immobile : petit coup de pouce
    if (sp < 30 && b.y < 780 && !(b.x > LANE_X0)) {
      b.still += dt;
      if (b.still > 3) { b.still = 0; b.vx += (Math.random() - 0.5) * 240; b.vy -= 200; }
    } else b.still = 0;
    if (b.y > WORLD_H + 16) b.lost = "drain";
  }

  /* ---------- mode Ascension : aventure en zones (monde et rendu : js/flippers-climb.js) ---------- */
  var CW = null, ACT = { zones: [], mobs: [], bosses: [], bonuses: [], launchers: [], winds: [], hazards: [], flags: [] }, WIN_K = -1;
  function zoneOf(y) { return Math.max(0, Math.min(CW.n - 1, Math.floor((CW.worldH - y) / CW.zh))); }
  function setWindow(k) {
    if (WIN_K === k) return;
    WIN_K = k;
    var lo = Math.max(0, k - 1), hi = Math.min(CW.n - 1, k + 1), i;
    segs = []; flippers = []; BUMPERS = []; ACT = { zones: [], mobs: [], bosses: [], bonuses: [], launchers: [], winds: [], hazards: [], flags: [] };
    for (i = lo; i <= hi; i++) {
      var z = CW.zones[i];
      segs = segs.concat(z.segs.filter(function (sg) { return !sg.gate || !sg.gate.open; }));
      flippers = flippers.concat(z.flippers); BUMPERS = BUMPERS.concat(z.bumpers);
      ACT.zones.push(z); ACT.mobs = ACT.mobs.concat(z.mobs); ACT.bosses = ACT.bosses.concat(z.bosses); ACT.bonuses = ACT.bonuses.concat(z.bonuses);
      ACT.launchers = ACT.launchers.concat(z.launchers); ACT.winds = ACT.winds.concat(z.winds.map(function (w) { return { x0: w.c0 * 32, x1: (w.c1 + 1) * 32, y0: z.y0 + w.r0 * 32, y1: z.y0 + (w.r1 + 1) * 32, exit: w.r1 === 23 && w.r0 >= 17 }; }));
      ACT.hazards = ACT.hazards.concat(z.hazards.map(function (h) { return { x0: h.c0 * 32, x1: (h.c1 + 1) * 32, y0: z.y0 + h.r * 32 + 6, y1: z.y0 + (h.r + 1) * 32 }; })); ACT.flags = ACT.flags.concat(z.flags);
    }
    bumpFlash = BUMPERS.map(function () { return 0; });
  }
  function resetWorld() {
    CW.zones.forEach(function (z) {
      z.bonuses.forEach(function (b) { b.got = false; }); z.mobs.forEach(function (m) { m.alive = true; m.dead = 0; m.flash = 0; });
      z.bosses.forEach(function (b) { b.hp = b.max; b.dead = false; b.flash = 0; b.hitCool = 0; }); z.gates.forEach(function (g) { g.open = false; });
      z.flags.forEach(function (f) { f.hit = false; }); z.bumpers.forEach(function (b) { b.flash = 0; }); z.flippers.forEach(function (f) { f.a = FLIPPER.rest; f.w = 0; });
    });
    WIN_K = -1;
  }
  function setMode(climb) {
    M.climb = !!climb;
    if (!climb) {
      segs = CLASSIC.segs; flippers = CLASSIC.flippers; BUMPERS = CLASSIC.BUMPERS; TARGETS = CLASSIC.TARGETS; DROPS = CLASSIC.DROPS; SLINGS = CLASSIC.SLINGS;
      RAMPS = [RAMP]; PLUNGER_Y = 800; WORLD_H = H; LANE_MINY = 360;
      bumpFlash = BUMPERS.map(function () { return 0; }); targetFlash = TARGETS.map(function () { return 0; });
    } else {
      if (!CW) CW = window.FlippersClimb.build({});
      resetWorld(); TARGETS = []; DROPS = []; SLINGS = []; RAMPS = [];
      PLUNGER_Y = 1e9; WORLD_H = CW.worldH; LANE_MINY = 1e9; setWindow(CW.n - 1); setWindow(0);
    }
    S.plungerY = PLUNGER_Y; S.best = parseInt(store(climb ? CBEST_KEY : BEST_KEY), 10) || 0; bg = null;
    stage.classList.toggle("fl-pixel", !!climb); resize();
  }
  function zoneBanner(z) { S.banner = z.i === CW.n - 1 ? "LE SOMMET" : "ZONE " + (z.i + 1); S.banner2 = z.name; S.bannerT = 3.2; S.bannerCol = "#ffffff"; }
  function startFall() {
    S.fall = { t: 0 };
    S.banner = "ÇA TOMBE…"; S.banner2 = "accroche-toi !"; S.bannerT = 2; S.bannerCol = "#ef6a52"; SND.fall();
  }
  function endFall(b) {
    var f = S.fall; if (!f) return; S.fall = null; S.drama = 0; S.timeScale = 1;
    S.shake = 9; S.banner = "AÏE !"; S.banner2 = "belle chute"; S.bannerT = 2; S.bannerCol = "#ef6a52"; SND.crash(); burst(b.x, b.y, "#cdd2dc", 16, 260);
  }
  function collectBonus(bo) {
    bo.got = true; SND.target();
    if (bo.type === "acorn") { addScore(300, bo.x, bo.y - 20); }
    else if (bo.type === "star") { S.starT = 20; say("Étoile ! Points ×2 pendant 20 s", 3); popup(bo.x, bo.y - 20, "×2", "#f6c445"); }
    else if (bo.type === "net") { S.net = true; say("Filet de sécurité : il te sauve du prochain gouffre", 3.5); }
    else if (bo.type === "feather") { S.featherT = 14; say("Plume ! Gravité réduite 14 s", 3); }
    else if (bo.type === "heart") { S.lives = Math.min(5, S.lives + 1); say("Un cœur de plus !", 2.5); SND.jackpot(); }
    burst(bo.x, bo.y, "#f6c445", 10, 180);
  }
  function openGate(g) {
    g.open = true; WIN_K = -1; setWindow(zoneOf(S.balls[0] ? S.balls[0].y : CW.worldH));
    S.shake = 8; SND.jackpot();
  }
  function climbCollide(b) {
    var i, t = S.t, FC = window.FlippersClimb;
    for (i = 0; i < ACT.mobs.length; i++) {
      var m = ACT.mobs[i]; if (!m.alive) continue;
      var p = FC.mobPos(m, t); if (!p.up) continue;
      var dx = b.x - p.x, dy = b.y - p.y, rr = R + m.r, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      var d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d;
      b.x = p.x + nx * rr; b.y = p.y + ny * rr;
      if (b.vy > 300 && ny < -0.3) {
        m.alive = false; m.dead = 9; b.vy = -860; b.vx *= 0.6; addScore(500, p.x, p.y - 24); SND.jackpot(); burst(p.x, p.y, "#f6c445", 14, 240); S.shake = Math.max(S.shake, 3);
        say("Mob écrasé ! +500", 1.8);
      } else {
        b.vx = nx * 640; b.vy = ny * 640; m.flash = 1; addScore(100, p.x, p.y - 24); SND.bumper(); S.shake = Math.max(S.shake, 2); burst(p.x, p.y, "#ef6a52", 6, 160);
      }
    }
    for (i = 0; i < ACT.bosses.length; i++) {
      var bo = ACT.bosses[i]; if (bo.dead) continue;
      var bp = FC.bossPos(bo, t), ex = b.x - bp.x, ey = b.y - bp.y, rb = R + bo.r;
      if (ex * ex + ey * ey >= rb * rb) continue;
      var dd = Math.sqrt(ex * ex + ey * ey) || 0.001, nnx = ex / dd, nny = ey / dd, sp2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      b.x = bp.x + nnx * rb; b.y = bp.y + nny * rb;
      if (sp2 > 320 && bo.hitCool <= 0) {
        bo.hp--; bo.hitCool = 0.6; bo.flash = 1; addScore(1000, bp.x, bp.y - 60); SND.jackpot(); S.shake = 8; burst(bp.x, bp.y, "#ef6a52", 20, 320);
        if (bo.hp <= 0) {
          bo.dead = true; addScore(5000, bp.x, bp.y - 70); S.lives = Math.min(5, S.lives + 1);
          S.banner = bo.name; S.banner2 = "VAINCU !"; S.bannerT = 3.5; S.bannerCol = "#f6c445"; burst(bp.x, bp.y, "#f6c445", 40, 420);
          if (bo.gate) openGate(bo.gate);
        } else say(bo.name + " : encore " + bo.hp + " coups", 1.6);
      } else SND.bumper();
      var kn = Math.max(760, sp2 * 0.8); b.vx = nnx * kn; b.vy = nny * kn;
    }
  }
  function climbDeath(b) {
    S.lives--; SND.crash(); S.shake = 12; burst(b.x, b.y, "#ef6a52", 24, 360);
    S.timeScale = 0.3; S.drama = 1; S.deathT = 1.7;
    if (S.lives <= 0) { S.banner = "À BOUT DE FORCES…"; S.banner2 = "retour au dernier camp (+60 s)"; S.climbTime += 60; S.lives = 3; S.score = Math.floor(S.score * 0.85); S.bannerCol = "#ef6a52"; }
    else { S.banner = "AÏE !"; S.banner2 = S.lives + " cœur" + (S.lives > 1 ? "s" : "") + " restant" + (S.lives > 1 ? "s" : ""); S.bannerCol = "#ef6a52"; }
    S.bannerT = 2.2; S.respawn = 1.9; S.fall = null;
  }
  function respawnBall() {
    S.balls = [{ id: S.nextId++, x: S.cp.x, y: S.cp.y, vx: 0, vy: 0, mode: "live", auto: 0, still: 0, trail: [], fs: S.cp.y }];
    burst(S.cp.x, S.cp.y, "#ffffff", 14, 220); SND.eject(); S.timeScale = 1; S.drama = 0; S.prevK = -1;
  }
  function climbBall(b, dt, sp) {
    var k = zoneOf(b.y), z = CW.zones[k], i;
    if (k !== S.zoneK) { S.zoneK = k; if (k > S.room) { S.room = k; addScore(1000 * k, null, null, true); zoneBanner(z); SND.jackpot(); } }
    if (b.y < S.topY) S.topY = b.y;
    for (i = 0; i < ACT.launchers.length; i++) {
      var l = ACT.launchers[i], dx = b.x - l.x, dy = b.y - l.y;
      if (l.gate && !l.gate.open) continue;
      if (S.tcool <= 0 && dx * dx + dy * dy < l.r * l.r) { b.mode = "cannon"; b.cannon = l; b.timer = 0.55; b.x = l.x; b.y = l.y; b.vx = b.vy = 0; S.tcool = 0.9; SND.saucer(); S.shake = 3; addScore(300, l.x, l.y - 30); return; }
    }
    for (i = 0; i < ACT.winds.length; i++) {
      var w = ACT.winds[i];
      if (b.x > w.x0 && b.x < w.x1 && b.y > w.y0 && b.y < w.y1) { b.vy -= 3300 * dt; if (b.vy < -700) b.vy = -700; b.vx += ((w.x0 + w.x1) / 2 - b.x) * 10 * dt; b.vx *= 0.99; if (w.exit && b.y < w.y0 + 70) b.vx += (b.x < CW.width / 2 ? 1 : -1) * 2600 * dt; if (Math.random() < 0.2) particles.push({ x: b.x, y: b.y + 10, vx: 0, vy: 120, life: 1, max: 0.4, col: "#ffffff", size: 3 }); }
    }
    for (i = 0; i < ACT.hazards.length; i++) {
      var h = ACT.hazards[i];
      if (b.x > h.x0 && b.x < h.x1 && b.y > h.y0 && b.y < h.y1) {
        if (S.net) { S.net = false; b.vy = -1250; b.vx *= 0.3; S.banner = "FILET !"; S.banner2 = "il t'a rattrapé"; S.bannerT = 2; S.bannerCol = "#9ad8ff"; SND.eject(); burst(b.x, b.y, "#ffffff", 20, 260); S.shake = 4; return; }
        b.lost = "hazard"; return;
      }
    }
    for (i = 0; i < ACT.flags.length; i++) {
      var f = ACT.flags[i];
      if (!f.hit && Math.abs(b.x - f.x) < 60 && Math.abs(b.y - f.y) < 90) {
        f.hit = true; S.cp = { x: f.x + 20, y: f.y - 110 }; S.lives = Math.min(5, S.lives + 1); S.banner = "CAMP"; S.banner2 = "point de reprise · +1 cœur"; S.bannerT = 2.4; S.bannerCol = "#f6c445"; SND.jackpot();
      }
    }
    for (i = 0; i < ACT.bonuses.length; i++) {
      var bo = ACT.bonuses[i]; if (bo.got) continue;
      var ddx = b.x - bo.x, ddy = b.y - bo.y;
      if (ddx * ddx + ddy * ddy < (R + 14) * (R + 14)) collectBonus(bo);
    }
    if (z.i === CW.n - 1 && z.goalCell) { var gx = b.x - z.goalCell.x, gy = b.y - z.goalCell.y; if (gx * gx + gy * gy < 46 * 46) { b.mode = "dead"; S.balls.splice(S.balls.indexOf(b), 1); climbWin(); return; } }
    // chutes spectaculaires : on tombe de très haut
    if (b.vy <= 0) b.fs = b.y;
    else if (!S.fall && b.fs != null && b.y - b.fs > 520 && b.vy > 650) startFall();
    if (sp < 30) {
      b.still += dt;
      if (b.still > 3) { b.still = 0; b.vx += (Math.random() - 0.5) * 240; b.vy -= 200; }
    } else b.still = 0;
  }

  function ballPairs() {
    var a = S.balls;
    for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) {
      var A = a[i], B = a[j];
      if (A.mode !== "live" || B.mode !== "live") continue;
      var dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R || d2 === 0) continue;
      var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
      A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
      var vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if (vn < 0) {
        var j2 = -(1.9) * vn / 2;
        B.vx += j2 * nx; B.vy += j2 * ny; A.vx -= j2 * nx; A.vy -= j2 * ny;
        if (-vn > 200) SND.wall();
      }
    }
  }

  function step(dt) {
    S.t += dt;
    if (M.climb && S.balls[0]) setWindow(zoneOf(S.balls[0].y));
    stepFlippers(dt);
    // spinner
    var sp = S.spin;
    if (sp.w > 0.3) {
      sp.a += sp.w * dt; sp.w -= sp.w * 1.2 * dt;
      while (sp.a >= Math.PI) {
        sp.a -= Math.PI; sp.n++; addScore(100);
        if (S.t - lastSpinSnd > 0.05) { lastSpinSnd = S.t; SND.spin(); }
      }
    } else sp.w = 0;
    var arr = S.balls.slice();
    for (var i = 0; i < arr.length; i++) stepBall(arr[i], dt);
    ballPairs();
    for (var j = 0; j < arr.length; j++) {
      var b = arr[j];
      if (b.lost && S.balls.indexOf(b) >= 0) ballLost(b);
    }
    if (S.saucerCool > 0) S.saucerCool -= dt;
    for (var k = 0; k < S.balls.length; k++) {
      var tb = S.balls[k];
      if (tb.mode === "live" || tb.mode === "lane") { tb.trail.push({ x: tb.x, y: tb.y }); if (tb.trail.length > 10) tb.trail.shift(); }
    }
  }

  function ballLost(b) {
    if (M.climb) { S.balls.splice(S.balls.indexOf(b), 1); climbDeath(b); return; }
    var reason = b.lost;
    S.balls.splice(S.balls.indexOf(b), 1);
    if (reason === "saved") { serve(S.multi ? 0.8 : 0); return; }
    if (S.saver > 0 && !S.tilt) {
      S.saver = 0; say("Bille rendue !", 2.5); SND.eject(); serve(S.multi ? 0.8 : 0); return;
    }
    if (S.balls.length > 0) {
      SND.drain();
      if (S.multi && S.balls.length === 1) { S.multi = false; say("Fin du multibille", 2.5); }
      return;
    }
    endBall();
  }

  function endBall() {
    SND.drain();
    var pts = S.tilt ? 0 : (S.bonusHits * 100 + S.bonusExtra) * S.bonusX;
    if (pts > 0) { S.score += pts; say("Bonus de fin de bille : " + fmt(pts) + " (×" + S.bonusX + ")", 2.4); SND.bonus(); }
    else say(S.tilt ? "TILT : pas de bonus" : "Bille perdue", 2.4);
    S.lives--;
    S.draining = true; S.drainTimer = 2.4;
    if (M.climb) { S.banner = S.lives > 0 ? "BILLE PERDUE" : "FIN DE PARTIE"; S.banner2 = "la tour t'a eu…"; S.bannerT = 2.4; S.bannerCol = "#ef6a52"; S.shake = 8; }
  }
  function afterDrain() {
    if (S.lives <= 0) { gameOver(); return; }
    S.ballNo++;
    newBall();
    say("Bille " + Math.min(S.ballNo, 9) + " : maintiens Espace pour armer", 4);
  }

  /* ---------- ressort ---------- */
  function launch() {
    S.balls.forEach(function (b) {
      if (b.mode === "lane" && b.auto === 0 && b.y > S.plungerY - R - 14) {
        launchBall(b, Math.max(S.charge, 0.06));
        say("", 0);
      }
    });
    S.charge = 0;
  }

  /* ---------- faute (tilt) ---------- */
  function nudge() {
    if (S.mode !== "play" || S.tilt) return;
    var live = S.balls.filter(function (b) { return b.mode === "live"; });
    if (!live.length) return;
    S.nudge += 1;
    live.forEach(function (b) { b.vx += (Math.random() - 0.5) * 310; b.vy -= 170 + Math.random() * 70; });
    S.shake = 5;
    if (S.nudge > 3) { S.tilt = true; say("TILT ! Les flippers sont coupés", 4); SND.tilt(); }
  }

  /* ---------- flux de partie ---------- */
  function startGame() {
    setMode(S.pref === "climb");
    S.score = 0; S.room = 0; S.topY = 0; S.starT = 0; S.featherT = 0; S.net = false; S.bannerT = 0; S.climbTime = 0; S.won = false; S.lives = LIVES; S.ballNo = 1; S.mult = 1; S.extraGiven = false; S.newBest = false;
    S.letters = [false, false, false, false, false];
    S.locked = 0; S.lockLit = false; S.draining = false;
    S.hold = { left: {}, right: {}, plunger: {} };
    S.plungerY = PLUNGER_Y; S.spin = { a: 0, w: 0, n: 0 };
    flippers.forEach(function (f) { f.a = FLIPPER.rest; f.w = 0; });
    particles.length = 0; popups.length = 0;
    if (M.climb) { S.lives = 5; S.cp = { x: CW.spawn.x, y: CW.spawn.y }; S.respawn = 0; S.zoneK = 0; }
    newBall();
    if (M.climb) { S.topY = S.cp.y; S.camY = Math.max(0, WORLD_H - H); S.camX = 0; S.balls[0].fs = S.cp.y; }
    S.mode = "play";
    setOverlay(null);
    if (M.climb) { zoneBanner(CW.zones[0]); S.zoneK = 0; }
    say(M.climb ? "Flippers : ← et → · ↑ pour secouer. Monte sur les corniches, vise le puits de vent en haut de la zone" : "Maintiens Espace (ou « Lancer ») pour armer, relâche pour tirer", 6);
    updateHud();
    audio();
  }
  function gameOver() {
    S.mode = "over";
    if (S.score > S.best) { S.best = S.score; S.newBest = true; store(M.climb ? CBEST_KEY : BEST_KEY, String(S.best)); }
    setOverlay("over");
  }
  function climbWin() {
    S.won = true;
    addScore(20000 + Math.max(0, 600 - Math.floor(S.climbTime)) * 20, null, null, true);
    SND.jackpot();
    if (!S.bestTime || S.climbTime < S.bestTime) { S.bestTime = S.climbTime; S.newBestTime = true; store(CTIME_KEY, String(S.bestTime)); } else S.newBestTime = false;
    gameOver();
  }
  function pause(on) {
    if (on && S.mode === "play") { S.mode = "paused"; S.hold = { left: {}, right: {}, plunger: {} }; S.charge = 0; setOverlay("pause"); }
    else if (!on && S.mode === "paused") { S.mode = "play"; setOverlay(null); }
  }

  /* ---------- fenêtre (menu, pause, fin) ---------- */
  var overlay = $("[data-fl-overlay]"), card = $("[data-fl-card]");
  function setOverlay(kind) {
    if (!kind) { overlay.hidden = true; return; }
    overlay.hidden = false;
    var h = "";
    if (kind === "menu") {
      h = '<h2>Flippers</h2><p><strong>Classique</strong> : rampe, spinner, cibles rabattables, terrier à verrou et multibille.<br><strong>Ascension</strong> : une table de 5 étages, monte jusqu\'au sommet !</p>' +
        '<p><kbd>Espace</kbd> ressort · <kbd>←</kbd> <kbd>→</kbd> flippers · <kbd>↑</kbd> secouer</p>' +
        '<p class="fl-best">Records : classique <strong>' + fmt(parseInt(store(BEST_KEY), 10) || 0) + '</strong> · ascension <strong>' + fmt(parseInt(store(CBEST_KEY), 10) || 0) + '</strong>' + (S.bestTime ? ' (' + fmtTime(S.bestTime) + ')' : '') + '</p>' +
        '<button class="btn" type="button" data-fl-act="start" data-fl-mode="classic">▶ Classique</button>' +
        '<button class="btn" type="button" data-fl-act="start" data-fl-mode="climb">⛰ Ascension</button>';
    } else if (kind === "pause") {
      h = '<h2>Pause</h2><button class="btn" type="button" data-fl-act="resume">▶ Reprendre</button>' +
        '<button class="btn btn-ghost" type="button" data-fl-act="start">↺ Recommencer</button>';
    } else if (kind === "over") {
      h = (S.won ? '<h2>🏆 Sommet atteint !</h2><p>Temps : <strong>' + fmtTime(S.climbTime) + '</strong>' + (S.newBestTime ? ' · nouveau meilleur temps !' : '') + '</p>' : '<h2>Partie terminée</h2>') + '<p class="fl-big">' + fmt(S.score) + '</p>' +
        (S.newBest ? '<p><strong>Nouveau record !</strong> 🏆</p>' : '<p>Record : <strong>' + fmt(S.best) + '</strong></p>') +
        '<button class="btn" type="button" data-fl-act="start">↺ Rejouer</button>' +
        '<button class="btn btn-ghost" type="button" data-fl-act="menu">☰ Changer de mode</button>';
    }
    card.innerHTML = h;
    var btn = card.querySelector("button");
    if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
  }
  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-fl-act]");
    if (!b) return;
    if (b.dataset.flAct === "start") { if (b.dataset.flMode) { S.pref = b.dataset.flMode; store(MODE_KEY, S.pref); } startGame(); }
    else if (b.dataset.flAct === "menu") { S.mode = "menu"; setOverlay("menu"); }
    else if (b.dataset.flAct === "resume") pause(false);
  });

  /* ---------- commandes ---------- */
  function setHold(group, src, on) {
    var g = S.hold[group];
    if (on) {
      if (group === "plunger" && !anyHold(g)) S.charge = 0;
      g[src] = true;
    } else {
      var was = anyHold(g);
      delete g[src];
      if (group === "plunger" && was && !anyHold(g) && S.mode === "play") launch();
    }
  }
  var KEYS_LEFT = { ArrowLeft: 1, q: 1, Q: 1, a: 1, A: 1 };
  var KEYS_RIGHT = { ArrowRight: 1, m: 1, M: 1, p: 1, P: 1 };
  var KEYS_PLUNGER = { " ": 1, ArrowDown: 1, s: 1, S: 1 };
  var KEYS_NUDGE = { ArrowUp: 1, n: 1, N: 1 };
  function keyGroup(e) {
    if (e.code === "ShiftLeft") return "left";
    if (e.code === "ShiftRight") return "right";
    if (KEYS_LEFT[e.key]) return "left";
    if (KEYS_RIGHT[e.key]) return "right";
    if (KEYS_PLUNGER[e.key]) return "plunger";
    return null;
  }
  function typing(e) {
    var t = e.target && e.target.tagName;
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || (e.target && e.target.isContentEditable);
  }
  window.addEventListener("keydown", function (e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); return; }
    var focusBtn = e.target && e.target.closest && e.target.closest("button, a");
    if (S.mode === "menu" || S.mode === "over") {
      if ((e.key === "Enter" || e.key === " ") && !focusBtn) { e.preventDefault(); startGame(); }
      return;
    }
    if (S.mode === "paused") {
      if ((e.key === "Enter" || e.key === " ") && !focusBtn) { e.preventDefault(); pause(false); }
      return;
    }
    var g = keyGroup(e);
    if (KEYS_NUDGE[e.key]) { e.preventDefault(); if (!e.repeat) nudge(); return; }
    if (!g) return;
    e.preventDefault();
    if (!e.repeat) setHold(g, "k:" + (e.code || e.key), true);
  });
  window.addEventListener("keyup", function (e) {
    var g = keyGroup(e);
    if (!g) return;
    if (S.mode === "play") e.preventDefault();
    setHold(g, "k:" + (e.code || e.key), false);
  });
  window.addEventListener("blur", function () { if (S.mode === "play") pause(true); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && S.mode === "play") pause(true); });

  // tactile / souris sur la table
  var ptrs = {};
  function logical(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function ptrGroup(p) { return p.x > LANE_X0 - 8 && p.y > 520 ? "plunger" : p.x < W * 0.46 ? "left" : "right"; }
  canvas.addEventListener("pointerdown", function (e) {
    if (S.mode !== "play") return;
    e.preventDefault();
    var g = ptrGroup(logical(e));
    ptrs[e.pointerId] = g;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    setHold(g, "p:" + e.pointerId, true);
    audio();
  });
  function ptrUp(e) {
    var g = ptrs[e.pointerId];
    if (!g) return;
    delete ptrs[e.pointerId];
    setHold(g, "p:" + e.pointerId, false);
  }
  canvas.addEventListener("pointerup", ptrUp);
  canvas.addEventListener("pointercancel", ptrUp);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  // boutons sous la table
  Array.prototype.forEach.call(document.querySelectorAll("[data-fl-btn]"), function (btn) {
    var g = btn.dataset.flBtn;
    btn.addEventListener("pointerdown", function (e) {
      if (S.mode !== "play") return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      setHold(g, "b:" + e.pointerId, true);
      audio();
    });
    function up(e) { setHold(g, "b:" + e.pointerId, false); }
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  });
  var nudgeBtn = $("[data-fl-nudge]");
  if (nudgeBtn) nudgeBtn.addEventListener("pointerdown", function (e) { e.preventDefault(); nudge(); });
  // pause / son
  var pauseBtn = $("[data-fl-pause]"), soundBtn = $("[data-fl-sound]");
  pauseBtn.addEventListener("click", function () { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); });
  function soundLabel() {
    soundBtn.textContent = soundOn ? "🔊 Son" : "🔇 Muet";
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
  }
  soundBtn.addEventListener("click", function () { soundOn = !soundOn; store(SND_KEY, soundOn ? "1" : "0"); soundLabel(); if (soundOn) audio(); });
  soundLabel();

  /* ---------- rendu ---------- */
  var stage = $(".fl-stage");
  var scale = 1, bg = null, dpr = 1;
  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var cw = Math.max(240, Math.round(r.width * dpr)), ch = Math.round(cw * H / W);
    if (M.climb) { cw = 240; ch = 420; }
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    scale = canvas.width / W;
    bg = null;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();

  function woodLine(c, pts, close) {
    c.beginPath();
    pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    if (close) c.closePath();
  }
  function buildBackground() {
    var cv = document.createElement("canvas");
    cv.width = canvas.width; cv.height = canvas.height;
    var c = cv.getContext("2d");
    c.setTransform(scale, 0, 0, scale, 0, 0);
    var g = c.createRadialGradient(222, 360, 50, 222, 430, 560);
    g.addColorStop(0, "#2c6a43"); g.addColorStop(0.55, "#1c4a31"); g.addColorStop(1, "#0d2619");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    c.strokeStyle = "rgba(160, 220, 120, .10)"; c.lineWidth = 1;
    for (var i = 0; i < 480; i++) {
      var x = 28 + rnd() * 392, y = 30 + rnd() * 780, h = 5 + rnd() * 7, l = (rnd() - 0.5) * 5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - h); c.stroke();
    }
    // anneaux et inscription
    c.strokeStyle = "rgba(242, 212, 138, .09)"; c.lineWidth = 3;
    c.beginPath(); c.arc(222, 240, 78, 0, 7); c.stroke();
    c.beginPath(); c.arc(222, 240, 108, 0, 7); c.stroke();
    c.fillStyle = "rgba(242, 212, 138, .16)";
    c.font = "900 30px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("FLIPPERS", 222, 345);
    c.fillStyle = "rgba(242, 212, 138, .14)";
    [[222, 150], [222, 535]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1] - 11); c.lineTo(p[0] + 10, p[1] + 7); c.lineTo(p[0] - 10, p[1] + 7); c.closePath(); c.fill(); });
    // couloir du ressort et zone de drain
    c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(LANE_X0, 100, LANE_X1 - LANE_X0, 730);
    var dg = c.createLinearGradient(0, 760, 0, H); dg.addColorStop(0, "rgba(5,12,8,0)"); dg.addColorStop(1, "rgba(5,12,8,.95)");
    c.fillStyle = dg; c.fillRect(24, 760, LANE_X0 - 24, H - 760);
    // orbite gauche : sol plus clair
    c.fillStyle = "rgba(242, 212, 138, .06)"; c.fillRect(24, 330, 48, 160);
    // trou du terrier
    c.fillStyle = "#4a2f1e"; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 6, 0, 7); c.fill();
    c.fillStyle = "#120a05"; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r, 0, 7); c.fill();
    c.strokeStyle = "#8a5a2b"; c.lineWidth = 2; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 6, 0, 7); c.stroke();
    // bouche de la rampe
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.arc(RAMP.mouth.x, RAMP.mouth.y + 2, RAMP.mouth.r + 6, Math.PI, 0); c.lineTo(RAMP.mouth.x + RAMP.mouth.r + 6, RAMP.mouth.y + 34); c.lineTo(RAMP.mouth.x - RAMP.mouth.r - 6, RAMP.mouth.y + 34); c.closePath(); c.fill();
    // rails en bois
    c.lineCap = "round"; c.lineJoin = "round";
    function rail(list) {
      c.strokeStyle = "#2a170b"; c.lineWidth = 10; list(); c.stroke();
      c.strokeStyle = "#8a5a2b"; c.lineWidth = 6; list(); c.stroke();
    }
    function line(pts) { return function () { woodLine(c, pts); }; }
    var arc = function () { c.beginPath(); c.arc(AC.x, AC.y, AC.r + 0.5, Math.PI, 2 * Math.PI); };
    rail(arc);
    rail(line([[24, 240], [24, 800]]));
    rail(line([[LANE_X1, 240], [LANE_X1, 830]]));
    rail(line([[LANE_X0, 100], [LANE_X0, 830]]));
    rail(line([[LANE_X0, 830], [LANE_X1, 830]]));
    rail(line([[72, 330], [72, 490]]));
    rail(line([[60, 590], [60, 670], [116, 740]]));
    rail(line([[384, 590], [384, 670], [328, 740]]));
    rail(line([[200, 50], [200, 105]]));
    rail(line([[280, 50], [280, 105]]));
    c.strokeStyle = "#c8873a"; c.lineWidth = 1.3; arc(); c.stroke();
    SLINGS.forEach(function (s) {
      woodLine(c, s.pts, true);
      c.fillStyle = "#5a3a1f"; c.fill();
      c.strokeStyle = "#2a170b"; c.lineWidth = 3; c.stroke();
    });
    var sh = c.createLinearGradient(0, 0, 0, 140);
    sh.addColorStop(0, "rgba(0,0,0,.35)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh; c.fillRect(0, 0, W, 140);
    return cv;
  }

  function drawFlipper(c, f) {
    var tx = f.px + f.s * FLIPPER.L * Math.cos(f.a), ty = f.py + FLIPPER.L * Math.sin(f.a);
    var dx = tx - f.px, dy = ty - f.py, l = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / l, ny = dx / l, r0 = FLIPPER.r0, r1 = FLIPPER.r1;
    c.beginPath();
    c.moveTo(f.px + nx * r0, f.py + ny * r0);
    c.lineTo(tx + nx * r1, ty + ny * r1);
    c.arc(tx, ty, r1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), f.s > 0);
    c.lineTo(f.px - nx * r0, f.py - ny * r0);
    c.arc(f.px, f.py, r0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), f.s > 0);
    c.closePath();
    var g = c.createLinearGradient(f.px + nx * r0, f.py + ny * r0, f.px - nx * r0, f.py - ny * r0);
    g.addColorStop(0, "#c8873a"); g.addColorStop(0.5, "#9a622b"); g.addColorStop(1, "#5a3a1f");
    c.fillStyle = g; c.fill();
    c.strokeStyle = "#2a170b"; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = "rgba(255, 230, 170, .55)"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(f.px + nx * 4 + dx * 0.15, f.py + ny * 4 + dy * 0.15); c.lineTo(tx + nx * 1.8 - dx * 0.1, ty + ny * 1.8 - dy * 0.1); c.stroke();
    c.fillStyle = "#e8c27a"; c.beginPath(); c.arc(f.px, f.py, 3.8, 0, 7); c.fill();
    c.strokeStyle = "#2a170b"; c.lineWidth = 1; c.stroke();
  }

  function drawBumper(c, p, fl) {
    var k = 1 + fl * 0.12;
    c.save(); c.translate(p.x, p.y); c.scale(k, k);
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(2, 5, p.r + 3, p.r + 1, 0, 0, 7); c.fill();
    c.fillStyle = "#f3e6cc"; c.beginPath(); c.arc(0, 0, p.r + 3, 0, 7); c.fill();
    var g = c.createRadialGradient(-7, -9, 2, 0, 0, p.r);
    if (fl > 0.1) { g.addColorStop(0, "#fff7d6"); g.addColorStop(1, "#ffb347"); }
    else { g.addColorStop(0, "#ff7a5a"); g.addColorStop(1, "#b32d2d"); }
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.92)";
    [[-10, -8, 4.6], [9, -10, 3.8], [11, 7, 4.8], [-9, 10, 3.5], [0, 1, 3.2]].forEach(function (s) { c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fill(); });
    c.strokeStyle = "#2a170b"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, p.r, 0, 7); c.stroke();
    c.restore();
  }

  function lamp(c, x, y, r, on, col, blink) {
    var lit = on && (!blink || Math.sin(S.t * 10) > -0.2);
    c.fillStyle = lit ? col : "rgba(255, 224, 138, .15)";
    if (lit) { c.shadowColor = col; c.shadowBlur = 12; }
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  function drawBall(c, b, big) {
    var k = big ? 1.12 : 1;
    c.fillStyle = "rgba(0,0,0,.35)";
    c.beginPath(); c.ellipse(b.x + (big ? 6 : 3), b.y + (big ? 9 : 5), R * k, R * 0.8 * k, 0, 0, 7); c.fill();
    var g = c.createRadialGradient(b.x - 4.5, b.y - 5, 1.5, b.x, b.y, R * k);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, "#c9d3d1"); g.addColorStop(1, "#5d6b69");
    c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, R * k, 0, 7); c.fill();
    c.strokeStyle = "rgba(20,30,28,.7)"; c.lineWidth = 1.2; c.stroke();
  }

  function offsetPath(pts, off) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      out.push([pts[i][0] - dy / l * off, pts[i][1] + dx / l * off]);
    }
    return out;
  }
  function drawRamp(c, r) {
    var P = r.pts;
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = 24;
    woodLine(c, P.map(function (p) { return [p[0] + 7, p[1] + 10]; })); c.stroke();
    c.strokeStyle = "rgba(205, 220, 218, .14)"; c.lineWidth = 22; woodLine(c, P); c.stroke();
    [-11, 11].forEach(function (o) {
      var op = offsetPath(P, o);
      c.strokeStyle = "#e3eceb"; c.lineWidth = 2.6; woodLine(c, op); c.stroke();
      c.strokeStyle = "rgba(60,80,76,.8)"; c.lineWidth = 0.8; woodLine(c, op); c.stroke();
    });
    for (var d = 20; d < r.total; d += 46) {
      var p1 = rampPoint(r, d), p2 = rampPoint(r, d + 2), dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      c.strokeStyle = "rgba(227,236,235,.5)"; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(p1.x + dy / l * 11, p1.y - dx / l * 11); c.lineTo(p1.x - dy / l * 11, p1.y + dx / l * 11); c.stroke();
    }
    var last = P[P.length - 1];
    c.fillStyle = "#c9d3d1"; c.beginPath(); c.arc(last[0], last[1], 6, 0, 7); c.fill();
  }

  function drawClimb() {
    var view = {
      world: CW, H: H, pxW: canvas.width, pxH: canvas.height, camX: S.camX, camY: S.camY, t: S.t, balls: S.balls, particles: particles, popups: popups,
      drama: S.drama, banner: S.banner, banner2: S.banner2, bannerT: S.bannerT, bannerCol: S.bannerCol, hearts: S.lives,
      progress: (CW.worldH - S.topY) / (CW.worldH - (CW.goal ? CW.goal.y : 0)),
    };
    window.FlippersClimb.render(ctx, view);
  }
  function drawFrame() {
    if (M.climb) { drawClimb(); return; }
    var c = ctx;
    if (!bg) bg = buildBackground();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bg, 0, 0);
    var sx = 0, sy = 0;
    if (S.shake > 0.05) { sx = (Math.random() - 0.5) * S.shake; sy = (Math.random() - 0.5) * S.shake; }
    c.setTransform(scale, 0, 0, scale, sx * scale, sy * scale);
    var t = S.t, i;

    // lumignons des passages du haut
    for (i = 0; i < LANES.length; i++) {
      var lx = (LANES[i].x0 + LANES[i].x1) / 2;
      lamp(c, lx, 84, 9, S.lanes[i], "#ffe08a");
    }
    // voies de flippers
    for (i = 0; i < LANE_LAMPS.length; i++) lamp(c, LANE_LAMPS[i], 636, 7, S.lamps[i], "#ffe08a");
    lamp(c, 42, 610, 7, S.kickback, "#ff9a5a", true);          // kickback prêt
    lamp(c, 402, 610, 7, S.rightSave, "#7fd1ff", true);        // sauvetage prêt
    c.fillStyle = "rgba(242, 212, 138, .4)"; c.font = "800 9px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic";
    c.fillText("KICK", 42, 595); c.fillText("SAUVE", 402, 595);
    // multiplicateur et bonus
    for (var m = 1; m <= MULT_MAX; m++) lamp(c, 172 + (m - 1) * 25, 578, 6, S.mult >= m, "#ffb347");
    c.fillStyle = "rgba(242, 212, 138, .4)"; c.fillText("MULTIPLICATEUR", 222, 598);
    for (var bx = 1; bx <= BONUSX_MAX; bx++) lamp(c, 172 + (bx - 1) * 25, 612, 4.5, S.bonusX >= bx, "#9cf0b0");
    c.fillStyle = "rgba(242, 212, 138, .4)"; c.fillText("BONUS", 222, 632);
    // verrous du terrier
    for (i = 0; i < 3; i++) lamp(c, SAUCER.x - 22 + i * 22, SAUCER.y - 34, 6, S.locked > i || (S.lockLit && i === S.locked && !S.multi) || S.multi, S.multi ? "#ff7a5a" : "#c9a6ff", S.lockLit && S.locked === i);
    if (S.balls.some(function (b) { return b.mode === "saucer"; })) {
      c.fillStyle = "rgba(201, 166, 255, " + (0.4 + 0.3 * Math.sin(t * 20)) + ")";
      c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 10, 0, 7); c.fill();
    }
    // bouche de la rampe : lampe
    lamp(c, RAMP.mouth.x, RAMP.mouth.y + 26, 7, S.multi || S.rampCombo > 0, S.multi ? "#ff7a5a" : "#7fd1ff", S.multi);
    // lance-pierres allumés
    SLINGS.forEach(function (s) {
      if (s.flash > 0) { woodLine(c, s.pts, true); c.fillStyle = "rgba(255, 179, 71, " + s.flash * 0.9 + ")"; c.fill(); }
    });
    // spinner
    var spn = S.spin, thick = 2 + 8 * Math.abs(Math.sin(spn.a));
    c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(SPINNER.x - 17, SPINNER.y - thick / 2 + 3, 34, thick);
    c.fillStyle = spn.w > 0.5 ? "#ffd257" : "#cfd6d4"; c.fillRect(SPINNER.x - 17, SPINNER.y - thick / 2, 34, thick);
    c.fillStyle = "#6b7270"; c.fillRect(SPINNER.x - 21, SPINNER.y - 2, 4, 4); c.fillRect(SPINNER.x + 17, SPINNER.y - 2, 4, 4);
    // cibles rabattables
    DROPS.forEach(function (d) {
      if (d.down) { c.fillStyle = "rgba(20,10,0,.55)"; c.fillRect(d.x - d.hw, d.y - 1.5, d.hw * 2, 3); return; }
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(d.x - d.hw + 2, d.y - 4 + 4, d.hw * 2, 9);
      var gg = c.createLinearGradient(0, d.y - 5, 0, d.y + 5);
      gg.addColorStop(0, d.flash > 0.1 ? "#fff3c4" : "#ffb347"); gg.addColorStop(1, "#b85e2a");
      c.fillStyle = gg; c.fillRect(d.x - d.hw, d.y - 5, d.hw * 2, 10);
      c.strokeStyle = "#2a170b"; c.lineWidth = 2; c.strokeRect(d.x - d.hw, d.y - 5, d.hw * 2, 10);
    });
    // cibles GLAND
    for (i = 0; i < TARGETS.length; i++) {
      var q = TARGETS[i], lit2 = S.letters[i], f2 = targetFlash[i];
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.arc(q.x + 2, q.y + 4, TARGET_R + 1, 0, 7); c.fill();
      var gg2 = c.createRadialGradient(q.x - 4, q.y - 5, 1, q.x, q.y, TARGET_R);
      if (lit2) { gg2.addColorStop(0, "#fff3c4"); gg2.addColorStop(1, "#e8873a"); c.shadowColor = "#ffb347"; c.shadowBlur = 10 + f2 * 10; }
      else { gg2.addColorStop(0, "#8a5a2b"); gg2.addColorStop(1, "#4a2f1e"); }
      c.fillStyle = gg2; c.beginPath(); c.arc(q.x, q.y, TARGET_R + f2 * 1.5, 0, 7); c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = "#2a170b"; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, TARGET_R + f2 * 1.5, 0, 7); c.stroke();
      c.fillStyle = lit2 ? "#4a2f1e" : "#e8c27a"; c.font = "900 15px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(LETTERS[i], q.x, q.y + 1);
    }
    for (i = 0; i < BUMPERS.length; i++) drawBumper(c, BUMPERS[i], bumpFlash[i]);

    // ressort
    var py = S.plungerY;
    c.strokeStyle = "#cfd6d4"; c.lineWidth = 2; c.beginPath();
    var zig = 9, y0 = py + 3, y1 = 826, n = 9;
    c.moveTo(LANE_C, y0);
    for (var z = 1; z <= n; z++) c.lineTo(LANE_C + (z % 2 ? zig : -zig), y0 + (y1 - y0) * z / n);
    c.stroke();
    c.fillStyle = "#b5bbb8"; c.fillRect(LANE_X0 + 4, py - 1, LANE_X1 - LANE_X0 - 8, 6);
    c.fillStyle = "#e8873a"; c.fillRect(LANE_X0 + 4, py - 1, LANE_X1 - LANE_X0 - 8, 2);

    flippers.forEach(function (f) { drawFlipper(c, f); });

    // billes sur la table (traînée puis bille), puis rampe par-dessus
    S.balls.forEach(function (b) {
      if (b.mode === "ramp" || b.mode === "saucer") return;
      for (var ti = 0; ti < b.trail.length - 1; ti++) {
        c.fillStyle = "rgba(220, 235, 230, " + (ti / b.trail.length * 0.22) + ")";
        c.beginPath(); c.arc(b.trail[ti].x, b.trail[ti].y, R * (0.4 + ti / b.trail.length * 0.5), 0, 7); c.fill();
      }
      drawBall(c, b, false);
    });
    S.balls.forEach(function (b) { if (b.mode === "saucer") { c.save(); c.globalAlpha = 0.9; drawBall(c, { x: b.x, y: b.y }, false); c.restore(); } });
    drawRamp(c, RAMP);
    S.balls.forEach(function (b) { if (b.mode === "ramp") drawBall(c, b, true); });

    particles.forEach(function (p) {
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    c.globalAlpha = 1;
    c.font = "900 15px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    popups.forEach(function (p) {
      c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      c.lineWidth = 3.5; c.strokeStyle = "rgba(20,10,0,.8)"; c.strokeText(p.text, p.x, p.y);
      c.fillStyle = p.col; c.fillText(p.text, p.x, p.y);
    });
    c.globalAlpha = 1;

    if (S.saver > 0 && S.mode === "play" && !S.saverArm) lamp(c, 222, 812, 9, true, "#ffd257", true);
    if (S.tilt) {
      c.fillStyle = "rgba(220, 40, 40, " + (0.5 + 0.4 * Math.sin(t * 14)) + ")";
      c.font = "900 40px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("TILT", 222, 180);
    }
    var waiting = S.mode === "play" && S.balls.some(function (b) { return b.mode === "lane" && b.auto === 0 && b.y > PLUNGER_Y - 40; });
    if (waiting && S.charge === 0) {
      c.fillStyle = "rgba(255, 243, 196, " + (0.55 + 0.35 * Math.sin(t * 6)) + ")";
      c.font = "800 11px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.fillText("ESPACE", LANE_C, 745); c.fillText("▼", LANE_C, 761);
    }
    if (S.charge > 0) {
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(LANE_X0 + 4, 660, 6, 84);
      c.fillStyle = S.charge > 0.8 ? "#ff7a5a" : "#ffd257";
      c.fillRect(LANE_X0 + 4, 744 - 84 * S.charge, 6, 84 * S.charge);
    }
  }

  /* ---------- boucle ---------- */
  var acc = 0, last = 0;
  function updateCamera(dt) {
    var b = S.balls[0] || { x: S.cp.x, y: S.cp.y, vx: 0, vy: 0 }, maxY = Math.max(0, WORLD_H - H), maxX = Math.max(0, CW.width - W);
    var lead = b ? Math.max(-260, Math.min(S.fall ? 420 : 260, b.vy * (S.fall ? 0.28 : 0.12))) : 0;
    var ty = b ? b.y - 520 + lead : maxY, tx = b ? b.x - W / 2 + Math.max(-90, Math.min(90, b.vx * 0.1)) : 0;
    ty = Math.max(0, Math.min(maxY, ty)); tx = Math.max(0, Math.min(maxX, tx));
    S.camY += (ty - S.camY) * Math.min(1, dt * (S.fall ? 3 : 6)); S.camX += (tx - S.camX) * Math.min(1, dt * 5);
  }
  function update(dt) {
    var i;
    for (i = 0; i < bumpFlash.length; i++) bumpFlash[i] = Math.max(0, bumpFlash[i] - dt * 5);
    for (i = 0; i < targetFlash.length; i++) targetFlash[i] = Math.max(0, targetFlash[i] - dt * 4);
    DROPS.forEach(function (d) { d.flash = Math.max(0, d.flash - dt * 4); });
    SLINGS.forEach(function (s) { s.flash = Math.max(0, s.flash - dt * 6); });
    S.shake = Math.max(0, S.shake - dt * 14);
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt / p.max;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (i = popups.length - 1; i >= 0; i--) {
      popups[i].y -= 30 * dt; popups[i].life -= dt * 0.8;
      if (popups[i].life <= 0) popups.splice(i, 1);
    }
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.msg = ""; }

    if (S.bannerT > 0) S.bannerT -= dt;
    if (S.mode !== "play") return;
    if (M.climb) {
      S.climbTime += dt; updateCamera(dt);
      if (S.starT > 0) S.starT -= dt; if (S.featherT > 0) S.featherT -= dt; if (S.tcool > 0) S.tcool -= dt;
      ACT.zones.forEach(function (st) {
        st.bumpers.forEach(function (bm) { if (bm.flash > 0) bm.flash = Math.max(0, bm.flash - dt * 5); });
        st.mobs.forEach(function (mb) { if (mb.flash > 0) mb.flash -= dt * 4; if (!mb.alive) { mb.dead -= dt; if (mb.dead <= 0) mb.alive = true; } });
        st.bosses.forEach(function (bb) { if (bb.flash > 0) bb.flash -= dt * 3; if (bb.hitCool > 0) bb.hitCool -= dt; });
      });
      if (S.respawn > 0) { S.respawn -= dt; S.timeScale = Math.min(1, S.timeScale + dt * 0.5); if (S.respawn <= 0) respawnBall(); }
      else if (S.fall) {
        var fb = S.balls[0]; S.fall.t += dt;
        S.timeScale = S.fall.t < 1.5 ? 0.36 : Math.min(1, 0.36 + (S.fall.t - 1.5) * 0.8); S.drama = S.fall.t < 1.8 ? 0.9 : 0.4;
        if (!fb || fb.mode !== "live" || fb.vy < -60 || (S.fall.t > 0.8 && Math.abs(fb.vx) + Math.abs(fb.vy) < 140) || S.fall.t > 3.4) endFall(fb || { x: 222, y: 0 });
      } else { S.timeScale = 1; S.drama = Math.max(0, S.drama - dt); }
      if (S.respawn > 0) S.drama = Math.max(S.drama, 0.7);
      dt *= S.timeScale;
    }
    var pl = anyHold(S.hold.plunger);
    var waiting = S.balls.some(function (b) { return b.mode === "lane" && b.auto === 0; });
    if (pl && waiting) S.charge = Math.min(1, S.charge + dt * 1.2);
    else if (!pl) S.charge = 0;
    S.plungerY = PLUNGER_Y + PLUNGER_TRAVEL * S.charge;
    S.nudge = Math.max(0, S.nudge - dt * 0.6);
    if (S.saver > 0 && !S.saverArm) S.saver = Math.max(0, S.saver - dt);
    if (S.dropReset > 0) {
      S.dropReset -= dt;
      if (S.dropReset <= 0) DROPS.forEach(function (d) { d.down = false; d.flash = 1; });
    }

    acc += dt;
    var n = 0;
    while (acc >= DT && n < 20) { step(DT); acc -= DT; n++; }
    if (acc > DT) acc = 0;

    if (S.draining) {
      S.drainTimer -= dt;
      if (S.drainTimer <= 0) { S.draining = false; afterDrain(); }
    }
  }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    drawFrame();
    updateHud();
    requestAnimationFrame(frame);
  }

  /* ---------- démarrage ---------- */
  newBall();
  setOverlay("menu");
  updateHud();
  requestAnimationFrame(function (t) { last = t; requestAnimationFrame(frame); });

  if (/[?&]debug\b/.test(location.search)) {
    window.FLIPPERS_DEBUG = {
      S: S, step: function (n) { for (var i = 0; i < n; i++) step(DT); }, startGame: startGame,
      hold: setHold, launch: launch, flippers: function () { return flippers; }, nudge: nudge, tick: update, M: M, setPref: function (m) { S.pref = m; }, climb: function () { return CW; }, zoneOf: function (y) { return zoneOf(y); },
    };
  }
})();
