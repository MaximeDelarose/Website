/* =========================================================================
   Flippers : flipper de la forêt, solo.
   Physique maison (cercle contre segments, pas fixe de 1/300 s), rendu canvas.
   Table de 400 × 700 unités ; couloir du ressort à droite (x de 350 à 380).
   Réglages en haut : G (gravité), VMAX, FLIPPER, BUMPERS, TARGETS, SLINGS…
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
  var W = 400, H = 700;
  var R = 8;                     // rayon de la bille
  var G = 750;                   // gravité (unités / s²)
  var DT = 1 / 300;              // pas de physique
  var VMAX = 1400;               // vitesse max de la bille
  var BALLS = 3;
  var SAVE_TIME = 10;            // une bille perdue pendant ce délai est rendue
  var LANE_X0 = 350, LANE_X1 = 380;
  var PLUNGER_Y = 660, PLUNGER_TRAVEL = 22;
  var MULT_MAX = 5;
  var EXTRA_BALL_AT = 75000;
  var BEST_KEY = "flippers-best-v1", SND_KEY = "flippers-sound-v1";

  var FLIPPER = { L: 72, rest: 0.5, up: -0.48, wUp: 15, wDown: 9, e: 0.45, r0: 9, r1: 5 };
  var BUMPERS = [
    { x: 135, y: 215, r: 22 }, { x: 235, y: 215, r: 22 }, { x: 185, y: 292, r: 22 },
  ];
  var LETTERS = ["G", "L", "A", "N", "D"];
  var TARGETS = [
    { x: 93, y: 392 }, { x: 139, y: 382 }, { x: 185, y: 378 }, { x: 231, y: 382 }, { x: 277, y: 392 },
  ];
  var TARGET_R = 11;
  var SAUCER = { x: 62, y: 320, r: 14 };
  var LANES = [{ x0: 100, x1: 170 }, { x0: 170, x1: 230 }, { x0: 230, x1: 300 }];

  /* ---------- géométrie fixe ---------- */
  var segs = [];
  function addSeg(x1, y1, x2, y2, o) {
    o = o || {};
    segs.push({
      x1: x1, y1: y1, x2: x2, y2: y2,
      e: o.e != null ? o.e : 0.35, r: o.r != null ? o.r : 2.5,
      oneWay: !!o.oneWay, sling: o.sling || null, kind: o.kind || "wall",
    });
  }
  var AC = { x: 200, y: 200, r: 180 }, ARC_N = 48;
  for (var i = 0; i < ARC_N; i++) {
    var a1 = Math.PI + Math.PI * i / ARC_N, a2 = Math.PI + Math.PI * (i + 1) / ARC_N;
    addSeg(AC.x + Math.cos(a1) * AC.r, AC.y + Math.sin(a1) * AC.r, AC.x + Math.cos(a2) * AC.r, AC.y + Math.sin(a2) * AC.r, { kind: "arc" });
  }
  addSeg(20, 200, 20, 525);                                    // mur gauche
  addSeg(LANE_X1, 200, LANE_X1, 690);                          // mur droit
  addSeg(LANE_X0, 690, LANE_X1, 690);                          // fond du couloir
  addSeg(LANE_X0, 215, LANE_X0, 690);                          // paroi du couloir
  addSeg(LANE_X0, 90, LANE_X0, 215, { oneWay: true });         // clapet : la bille entre dans le jeu, ne redescend pas
  addSeg(20, 525, 106, 612, { e: 0.2, kind: "slope" });        // rampes vers les flippers
  addSeg(LANE_X0, 525, 264, 612, { e: 0.2, kind: "slope" });
  addSeg(170, 40, 170, 85, { r: 3 });                          // séparateurs des passages du haut
  addSeg(230, 40, 230, 85, { r: 3 });
  // lance-pierres (triangles de bois)
  var SLINGS = [
    { pts: [[58, 445], [58, 525], [100, 525]], nx: 0.885, ny: -0.465, flash: 0 },
    { pts: [[312, 445], [312, 525], [270, 525]], nx: -0.885, ny: -0.465, flash: 0 },
  ];
  SLINGS.forEach(function (s, idx) {
    addSeg(s.pts[0][0], s.pts[0][1], s.pts[1][0], s.pts[1][1], { e: 0.2, kind: "sling-side" });
    addSeg(s.pts[1][0], s.pts[1][1], s.pts[2][0], s.pts[2][1], { e: 0.2, kind: "sling-side" });
    addSeg(s.pts[0][0], s.pts[0][1], s.pts[2][0], s.pts[2][1], { e: 0.45, sling: idx, kind: "sling" });
  });
  var plungerSeg = { x1: LANE_X0 + 1, y1: PLUNGER_Y, x2: LANE_X1 - 1, y2: PLUNGER_Y, e: 0.0, r: 2, oneWay: false, sling: null, kind: "plunger" };

  var flippers = [
    { px: 106, py: 612, s: 1, a: FLIPPER.rest, w: 0, key: "left" },
    { px: 264, py: 612, s: -1, a: FLIPPER.rest, w: 0, key: "right" },
  ];

  /* ---------- état ---------- */
  var S = {
    mode: "menu",            // menu | play | paused | over
    score: 0, best: parseInt(store(BEST_KEY), 10) || 0,
    balls: BALLS, ballNo: 1, mult: 1, bonusHits: 0, extraGiven: false,
    letters: [false, false, false, false, false], lanes: [false, false, false],
    ball: null, charge: 0, plungerY: PLUNGER_Y,
    hold: { left: {}, right: {}, plunger: {} },
    live: 0, nudge: 0, tilt: false, still: 0,
    drainTimer: 0, saucerCool: 0, t: 0, shake: 0,
    msg: "", msgT: 0, newBest: false,
  };
  var particles = [], popups = [], trail = [];
  var bumpFlash = BUMPERS.map(function () { return 0; });
  var targetFlash = TARGETS.map(function () { return 0; });

  function newBall() {
    S.ball = { x: 365, y: PLUNGER_Y - R - 1, vx: 0, vy: 0, mode: "lane" };
    S.charge = 0; S.live = 0; S.tilt = false; S.nudge = 0; S.still = 0; S.mult = Math.max(1, S.mult);
    S.bonusHits = 0;
    trail.length = 0;
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
  var lastWallSnd = 0;
  var SND = {
    bumper: function () { tone(420, 760, 0.12, "square", 0.07); },
    sling: function () { tone(300, 520, 0.08, "sawtooth", 0.05); },
    target: function () { tone(880, 1320, 0.1, "triangle", 0.09); },
    flip: function () { tone(140, 70, 0.05, "square", 0.05); },
    wall: function () { tone(220, 160, 0.04, "triangle", 0.035); },
    launch: function () { tone(160, 620, 0.35, "sawtooth", 0.05); },
    lane: function () { tone(660, 990, 0.08, "triangle", 0.07); },
    saucer: function () { tone(500, 120, 0.3, "triangle", 0.09); },
    eject: function () { tone(200, 900, 0.18, "square", 0.06); },
    drain: function () { tone(330, 70, 0.7, "sawtooth", 0.07); },
    jackpot: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.16, "square", 0.06, i * 0.07); }); },
    tilt: function () { tone(110, 80, 0.5, "sawtooth", 0.09); },
    bonus: function () { tone(740, 740, 0.05, "square", 0.05); },
  };

  /* ---------- score et messages ---------- */
  var hud = {
    score: $("[data-fl-score]"), best: $("[data-fl-best]"), balls: $("[data-fl-balls]"),
    mult: $("[data-fl-mult]"), msg: $("[data-fl-msg]"),
  };
  var hudCache = {};
  function setHud(k, v) { if (hudCache[k] !== v && hud[k]) { hudCache[k] = v; hud[k].textContent = v; } }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function updateHud() {
    setHud("score", fmt(S.score));
    setHud("best", fmt(Math.max(S.best, S.score)));
    setHud("balls", S.mode === "menu" ? String(BALLS) : String(Math.max(0, S.balls)));
    setHud("mult", "×" + S.mult);
    setHud("msg", S.msg);
  }
  function say(text, secs) { S.msg = text; S.msgT = secs || 2.5; }
  function popup(x, y, text, col) { popups.push({ x: x, y: y, text: text, life: 1, col: col || "#fff3c4" }); }
  function addScore(n, x, y, noMult) {
    var v = noMult ? n : n * S.mult;
    S.score += v;
    if (x != null) popup(x, y, "+" + fmt(v));
    if (!S.extraGiven && S.score >= EXTRA_BALL_AT) {
      S.extraGiven = true; S.balls++; say("Bille bonus !", 3); SND.jackpot();
    }
  }
  function burst(x, y, col, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = (0.3 + Math.random()) * (sp || 160);
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, max: 0.4 + Math.random() * 0.4, col: col, size: 1.5 + Math.random() * 2 });
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
    var ee = -vn < 40 ? 0 : e;
    rvx -= (1 + ee) * vn * nx; rvy -= (1 + ee) * vn * ny;
    b.vx = rvx + svx; b.vy = rvy + svy;
    return -vn;
  }

  function collideStatics(b) {
    var i, s;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      if (s.oneWay && b.x >= s.x1) continue;      // le clapet ne gêne pas la bille qui vient du couloir
      if (!circleSeg(b, s.x1, s.y1, s.x2, s.y2, s.r)) continue;
      var vn = bounce(b, hit.nx, hit.ny, s.e, 0, 0);
      if (s.sling != null) {
        var sl = SLINGS[s.sling];
        if (hit.nx * sl.nx + hit.ny * sl.ny > 0.5 && vn > 70 && sl.flash <= 0.05) {
          b.vx += sl.nx * 380; b.vy += sl.ny * 380;
          sl.flash = 1; addScore(50, hit.cx, hit.cy); SND.sling();
          burst(hit.cx, hit.cy, "#ffb347", 6, 120);
        }
      } else if (vn > 260 && S.t - lastWallSnd > 0.07) { lastWallSnd = S.t; SND.wall(); }
    }
    // plateau du ressort
    if (circleSeg(b, plungerSeg.x1, S.plungerY, plungerSeg.x2, S.plungerY, plungerSeg.r)) bounce(b, hit.nx, hit.ny, 0, 0, 0);
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
      if (v > 200 && Math.abs(f.w) > 3) { SND.flip(); S.shake = Math.max(S.shake, 1.2); }
    }
    // bumpers
    for (i = 0; i < BUMPERS.length; i++) {
      var p = BUMPERS[i];
      var nx = b.x - p.x, ny = b.y - p.y, rr = R + p.r, d2 = nx * nx + ny * ny;
      if (d2 >= rr * rr) continue;
      var dd = Math.sqrt(d2) || 0.001; nx /= dd; ny /= dd;
      b.x = p.x + nx * rr; b.y = p.y + ny * rr;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var out = Math.max(560, sp * 0.9);
      b.vx = nx * out; b.vy = ny * out;
      bumpFlash[i] = 1; S.bonusHits++;
      addScore(100, p.x, p.y - p.r); SND.bumper(); S.shake = Math.max(S.shake, 2);
      burst(p.x + nx * p.r, p.y + ny * p.r, "#ffd257", 8, 200);
      if (S.bonusHits % 10 === 0) say("Bonus ×" + (S.bonusHits / 10 + 1), 1.8);
    }
    // cibles GLAND
    for (i = 0; i < TARGETS.length; i++) {
      var q = TARGETS[i];
      var tx2 = b.x - q.x, ty2 = b.y - q.y, r2 = R + TARGET_R, dq = tx2 * tx2 + ty2 * ty2;
      if (dq >= r2 * r2) continue;
      var dl = Math.sqrt(dq) || 0.001; tx2 /= dl; ty2 /= dl;
      b.x = q.x + tx2 * r2; b.y = q.y + ty2 * r2;
      var vn2 = bounce(b, tx2, ty2, 0.55, 0, 0);
      if (vn2 > 30) {
        targetFlash[i] = 1; SND.target();
        if (!S.letters[i]) {
          S.letters[i] = true; addScore(500, q.x, q.y - 16); burst(q.x, q.y, "#ffe08a", 10, 150);
          if (S.letters.every(Boolean)) completeLetters();
        } else addScore(50, q.x, q.y - 16);
      }
    }
  }

  function completeLetters() {
    addScore(5000, 200, 330, true);
    raiseMult("GLAND complet !");
    SND.jackpot();
    setTimeout(function () { S.letters = [false, false, false, false, false]; }, 700);
  }
  function raiseMult(why) {
    if (S.mult < MULT_MAX) { S.mult++; say(why + " Multiplicateur ×" + S.mult, 3); }
    else { addScore(10000, 200, 300, true); say(why + " +10 000 !", 3); }
  }

  /* ---------- pas de simulation ---------- */
  function stepFlippers(dt) {
    for (var i = 0; i < flippers.length; i++) {
      var f = flippers[i];
      var on = !S.tilt && S.mode === "play" && anyHold(S.hold[f.key]);
      var target = on ? FLIPPER.up : FLIPPER.rest;
      var old = f.a;
      if (f.a > target) f.a = Math.max(target, f.a - (on ? FLIPPER.wUp : FLIPPER.wDown) * dt);
      else if (f.a < target) f.a = Math.min(target, f.a + (on ? FLIPPER.wUp : FLIPPER.wDown) * dt);
      f.w = (f.a - old) / dt;
      if (on && !f.was) SND.flip();
      f.was = on;
    }
  }
  function anyHold(o) { for (var k in o) if (o[k]) return true; return false; }

  // Filet de sécurité : si la bille est écrasée entre un flipper et une paroi, elle ne doit jamais sortir de la table.
  var SLOPE_IN = [
    { x1: 20, y1: 525, x2: 106, y2: 612, nx: 0.7, ny: -0.7 },
    { x1: 350, y1: 525, x2: 264, y2: 612, nx: -0.7, ny: -0.7 },
  ];
  function contain(b) {
    if (b.x > LANE_X0 - 2) {                              // couloir du ressort
      if (b.x > LANE_X1 - R) { b.x = LANE_X1 - R; if (b.vx > 0) b.vx = 0; }
      if (b.y < AC.y && b.x > LANE_X0) {
        var dxl = b.x - AC.x, dyl = b.y - AC.y, dl = Math.sqrt(dxl * dxl + dyl * dyl), lim = AC.r - R - 2;
        if (dl > lim && dl > 0) { b.x = AC.x + dxl / dl * lim; b.y = AC.y + dyl / dl * lim; }
      }
      return;
    }
    if (b.x < 20 + R) { b.x = 20 + R; if (b.vx < 0) b.vx = 0; }
    if (b.y < AC.y) {
      var dx = b.x - AC.x, dy = b.y - AC.y, d = Math.sqrt(dx * dx + dy * dy), lim2 = AC.r - R - 2;
      if (d > lim2 && d > 0) { b.x = AC.x + dx / d * lim2; b.y = AC.y + dy / d * lim2; var vn = (b.vx * dx + b.vy * dy) / d; if (vn > 0) { b.vx -= vn * dx / d; b.vy -= vn * dy / d; } }
    }
    for (var i = 0; i < SLOPE_IN.length; i++) {
      var sl = SLOPE_IN[i];
      var lo = Math.min(sl.x1, sl.x2), hi = Math.max(sl.x1, sl.x2);
      if (b.x < lo || b.x > hi) continue;
      var ex = sl.x2 - sl.x1, ey = sl.y2 - sl.y1, el = Math.sqrt(ex * ex + ey * ey);
      var sd = ((b.x - sl.x1) * -ey + (b.y - sl.y1) * ex) / el;     // distance signée (normale « vers le jeu »)
      if (sl.nx * -ey + sl.ny * ex < 0) sd = -sd;
      if (sd < 4) {
        var push = 4 - sd, nxn = (sl.nx * -ey + sl.ny * ex < 0 ? ey : -ey) / el, nyn = (sl.nx * -ey + sl.ny * ex < 0 ? -ex : ex) / el;
        b.x += nxn * push; b.y += nyn * push;
        var vn2 = b.vx * nxn + b.vy * nyn;
        if (vn2 < 0) { b.vx -= vn2 * nxn; b.vy -= vn2 * nyn; }
      }
    }
  }

  function step(dt) {
    S.t += dt;
    stepFlippers(dt);
    var b = S.ball;
    if (!b) return;
    if (b.mode === "saucer") {
      S.saucerTimer -= dt;
      if (S.saucerTimer <= 0) {
        b.mode = "live"; b.vx = 250 + Math.random() * 120; b.vy = -(260 + Math.random() * 140);
        S.saucerCool = 1.2; SND.eject(); burst(SAUCER.x, SAUCER.y, "#c9a6ff", 10, 180);
      }
      return;
    }
    if (b.mode === "dead") return;
    b.vy += G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    for (var k = 0; k < 2; k++) collideStatics(b);
    contain(b);
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; sp = VMAX; }
    if (S.saucerCool > 0) S.saucerCool -= dt;

    var inLane = b.x > LANE_X0 && b.y > 300;
    if (b.mode === "lane") {
      if (!inLane || b.y < PLUNGER_Y - 60) { b.mode = "live"; S.live = 0; }
    } else if (inLane && b.y > 500 && sp < 60) { b.mode = "lane"; }
    if (b.mode === "live") {
      S.live += dt;
      // terrier
      var sx = b.x - SAUCER.x, sy = b.y - SAUCER.y;
      if (S.saucerCool <= 0 && sx * sx + sy * sy < 12 * 12) {
        b.mode = "saucer"; b.x = SAUCER.x; b.y = SAUCER.y; b.vx = b.vy = 0; S.saucerTimer = 0.9;
        addScore(1500, SAUCER.x + 20, SAUCER.y - 16); SND.saucer(); S.shake = 2.5;
        say("Le terrier ! 1 500", 2);
      }
      // passages du haut
      if (b.y > 44 && b.y < 90) {
        for (var li = 0; li < LANES.length; li++) {
          if (!S.lanes[li] && b.x > LANES[li].x0 && b.x < LANES[li].x1) {
            S.lanes[li] = true; addScore(300, b.x, b.y + 20); SND.lane();
            if (S.lanes.every(Boolean)) {
              addScore(2000, 200, 120, true); raiseMult("Passages complets !"); SND.jackpot();
              setTimeout(function () { S.lanes = [false, false, false]; }, 600);
            }
          }
        }
      }
      // bille immobile : petit coup de pouce
      if (sp < 25 && b.y < 640 && !(b.x > LANE_X0)) {
        S.still += dt;
        if (S.still > 3) { S.still = 0; b.vx += (Math.random() - 0.5) * 200; b.vy -= 160; }
      } else S.still = 0;
      if (b.y > H + 12) drain();
    }
    trail.push({ x: b.x, y: b.y });
    if (trail.length > 10) trail.shift();
  }

  function drain() {
    var b = S.ball;
    if (S.live < SAVE_TIME && !S.tilt && !S.saveUsed) {
      say("Bille rendue !", 2.5); newBall(); S.saveUsed = true; return;
    }
    b.mode = "dead";
    SND.drain();
    var bonus = S.bonusHits;
    var pts = Math.floor(bonus / 10) * 1000 * S.mult + (S.tilt ? 0 : 0);
    if (S.tilt) pts = 0;
    if (pts > 0) { S.score += pts; say("Bonus de fin de bille : " + fmt(pts), 2.2); SND.bonus(); }
    else say(S.tilt ? "TILT : pas de bonus" : "Bille perdue", 2.2);
    S.balls--;
    S.drainTimer = 2.2;
  }

  function afterDrain() {
    if (S.balls <= 0) { gameOver(); return; }
    S.ballNo++;
    newBall(); S.saveUsed = false;
    say("Bille " + Math.min(S.ballNo, 9) + " : maintiens Espace pour armer", 4);
  }

  /* ---------- ressort ---------- */
  function launch() {
    var b = S.ball;
    if (b && b.mode === "lane" && b.y > S.plungerY - R - 14) {
      var c = Math.max(S.charge, 0.06);
      S.plungerY = PLUNGER_Y; b.y = Math.min(b.y, PLUNGER_Y - R - 1);
      b.vy = -(650 + 550 * c); b.vx = 0;
      SND.launch();
      say("", 0);
    }
    S.charge = 0;
  }

  /* ---------- faute (tilt) ---------- */
  function nudge() {
    var b = S.ball;
    if (S.mode !== "play" || !b || b.mode !== "live" || S.tilt) return;
    S.nudge += 1;
    b.vx += (Math.random() - 0.5) * 260; b.vy -= 140 + Math.random() * 60;
    S.shake = 5;
    if (S.nudge > 3) {
      S.tilt = true; say("TILT ! Les flippers sont coupés", 4); SND.tilt();
    }
  }

  /* ---------- flux de partie ---------- */
  function startGame() {
    S.score = 0; S.balls = BALLS; S.ballNo = 1; S.mult = 1; S.extraGiven = false; S.newBest = false;
    S.letters = [false, false, false, false, false]; S.lanes = [false, false, false];
    S.hold = { left: {}, right: {}, plunger: {} };
    S.drainTimer = 0; S.saucerCool = 0; S.plungerY = PLUNGER_Y;
    flippers.forEach(function (f) { f.a = FLIPPER.rest; f.w = 0; });
    particles.length = 0; popups.length = 0;
    newBall(); S.saveUsed = false;
    S.mode = "play";
    setOverlay(null);
    say("Maintiens Espace (ou « Lancer ») pour armer, relâche pour tirer", 6);
    updateHud();
    audio();
  }
  function gameOver() {
    S.mode = "over";
    if (S.score > S.best) { S.best = S.score; S.newBest = true; store(BEST_KEY, String(S.best)); }
    setOverlay("over");
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
      h = '<h2>Flippers</h2><p>Un flipper dans la forêt : champignons, glands et un terrier mystérieux. 3 billes pour battre ton record.</p>' +
        '<p><kbd>Espace</kbd> ressort · <kbd>←</kbd> <kbd>→</kbd> flippers · <kbd>↑</kbd> secouer</p>' +
        '<p class="fl-best">Record : <strong>' + fmt(S.best) + '</strong></p>' +
        '<button class="btn" type="button" data-fl-act="start">▶ Jouer</button>';
    } else if (kind === "pause") {
      h = '<h2>Pause</h2><button class="btn" type="button" data-fl-act="resume">▶ Reprendre</button>' +
        '<button class="btn btn-ghost" type="button" data-fl-act="start">↺ Recommencer</button>';
    } else if (kind === "over") {
      h = '<h2>Partie terminée</h2><p class="fl-big">' + fmt(S.score) + '</p>' +
        (S.newBest ? '<p><strong>Nouveau record !</strong> 🏆</p>' : '<p>Record : <strong>' + fmt(S.best) + '</strong></p>') +
        '<button class="btn" type="button" data-fl-act="start">↺ Rejouer</button>';
    }
    card.innerHTML = h;
    var btn = card.querySelector("button");
    if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
  }
  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-fl-act]");
    if (!b) return;
    if (b.dataset.flAct === "start") startGame();
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
    if (e.key === "Escape" || e.key === "p" && false) { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); return; }
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
  function ptrGroup(p) { return p.x > LANE_X0 - 6 && p.y > 440 ? "plunger" : p.x < 185 ? "left" : "right"; }
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
    var cw = Math.max(200, Math.round(r.width * dpr)), ch = Math.round(cw * H / W);
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
    // tapis d'herbe
    var g = c.createRadialGradient(185, 300, 40, 185, 360, 480);
    g.addColorStop(0, "#2c6a43"); g.addColorStop(0.55, "#1c4a31"); g.addColorStop(1, "#0d2619");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // brins d'herbe (graine fixe)
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    c.strokeStyle = "rgba(160, 220, 120, .10)"; c.lineWidth = 1;
    for (var i = 0; i < 380; i++) {
      var x = 22 + rnd() * 330, y = 25 + rnd() * 650, h = 4 + rnd() * 6, l = (rnd() - 0.5) * 4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - h); c.stroke();
    }
    // anneaux décoratifs
    c.strokeStyle = "rgba(242, 212, 138, .09)"; c.lineWidth = 3;
    c.beginPath(); c.arc(185, 292, 60, 0, 7); c.stroke();
    c.beginPath(); c.arc(185, 292, 88, 0, 7); c.stroke();
    c.fillStyle = "rgba(242, 212, 138, .16)";
    c.font = "900 30px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("FLIPPERS", 185, 468);
    // flèches de guidage (rampes)
    c.fillStyle = "rgba(242, 212, 138, .14)";
    [[185, 175], [185, 440]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1] - 10); c.lineTo(p[0] + 9, p[1] + 6); c.lineTo(p[0] - 9, p[1] + 6); c.closePath(); c.fill(); });
    // couloir du ressort
    c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(LANE_X0, 90, LANE_X1 - LANE_X0, 600);
    // zone sous les flippers
    c.fillStyle = "#070f0a"; c.fillRect(0, 668, LANE_X0, 40);
    // trou du terrier
    c.fillStyle = "#4a2f1e"; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 5, 0, 7); c.fill();
    c.fillStyle = "#120a05"; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r, 0, 7); c.fill();
    c.strokeStyle = "#8a5a2b"; c.lineWidth = 2; c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 5, 0, 7); c.stroke();
    // rails en bois
    c.lineCap = "round"; c.lineJoin = "round";
    function rail(list, outer, inner) {
      c.strokeStyle = outer; c.lineWidth = 9; list(); c.stroke();
      c.strokeStyle = inner; c.lineWidth = 5; list(); c.stroke();
    }
    var arc = function () {
      c.beginPath(); c.arc(AC.x, AC.y, AC.r + 0.5, Math.PI, 2 * Math.PI);
    };
    rail(arc, "#2a170b", "#8a5a2b");
    function line(pts) { return function () { woodLine(c, pts); }; }
    rail(line([[20, 200], [20, 525], [106, 612]]), "#2a170b", "#8a5a2b");
    rail(line([[LANE_X1, 200], [LANE_X1, 690]]), "#2a170b", "#8a5a2b");
    rail(line([[LANE_X0, 90], [LANE_X0, 525], [264, 612]]), "#2a170b", "#8a5a2b");
    rail(line([[LANE_X0, 690], [LANE_X1, 690]]), "#2a170b", "#8a5a2b");
    c.strokeStyle = "#c8873a"; c.lineWidth = 1.2;
    arc(); c.stroke();
    rail(line([[170, 40], [170, 85]]), "#2a170b", "#8a5a2b");
    rail(line([[230, 40], [230, 85]]), "#2a170b", "#8a5a2b");
    // lance-pierres
    SLINGS.forEach(function (s) {
      woodLine(c, s.pts, true);
      c.fillStyle = "#5a3a1f"; c.fill();
      c.strokeStyle = "#2a170b"; c.lineWidth = 3; c.stroke();
    });
    // contour de la zone de jeu (ombre)
    var sh = c.createLinearGradient(0, 0, 0, 120);
    sh.addColorStop(0, "rgba(0,0,0,.35)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh; c.fillRect(0, 0, W, 120);
    return cv;
  }

  function drawFlipper(c, f) {
    var tx = f.px + f.s * FLIPPER.L * Math.cos(f.a), ty = f.py + FLIPPER.L * Math.sin(f.a);
    var dx = tx - f.px, dy = ty - f.py, l = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / l, ny = dx / l, r0 = FLIPPER.r0, r1 = FLIPPER.r1;
    c.beginPath();
    c.moveTo(f.px + nx * r0, f.py + ny * r0);
    c.lineTo(tx + nx * r1, ty + ny * r1);
    c.arc(tx, ty, r1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), f.s > 0 ? true : false);
    c.lineTo(f.px - nx * r0, f.py - ny * r0);
    c.arc(f.px, f.py, r0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), f.s > 0 ? true : false);
    c.closePath();
    var g = c.createLinearGradient(f.px + nx * r0, f.py + ny * r0, f.px - nx * r0, f.py - ny * r0);
    g.addColorStop(0, "#c8873a"); g.addColorStop(0.5, "#9a622b"); g.addColorStop(1, "#5a3a1f");
    c.fillStyle = g; c.fill();
    c.strokeStyle = "#2a170b"; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = "rgba(255, 230, 170, .55)"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(f.px + nx * 3.5 + dx * 0.15, f.py + ny * 3.5 + dy * 0.15); c.lineTo(tx + nx * 1.5 - dx * 0.1, ty + ny * 1.5 - dy * 0.1); c.stroke();
    c.fillStyle = "#e8c27a"; c.beginPath(); c.arc(f.px, f.py, 3.2, 0, 7); c.fill();
    c.strokeStyle = "#2a170b"; c.lineWidth = 1; c.stroke();
  }

  function drawBumper(c, p, fl) {
    var k = 1 + fl * 0.12;
    c.save(); c.translate(p.x, p.y); c.scale(k, k);
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(2, 4, p.r + 3, p.r + 1, 0, 0, 7); c.fill();
    c.fillStyle = "#f3e6cc"; c.beginPath(); c.arc(0, 0, p.r + 3, 0, 7); c.fill();
    var g = c.createRadialGradient(-6, -8, 2, 0, 0, p.r);
    if (fl > 0.1) { g.addColorStop(0, "#fff7d6"); g.addColorStop(1, "#ffb347"); }
    else { g.addColorStop(0, "#ff7a5a"); g.addColorStop(1, "#b32d2d"); }
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.92)";
    [[-9, -7, 4.2], [8, -9, 3.4], [10, 6, 4.4], [-8, 9, 3.2], [0, 1, 3]].forEach(function (s) { c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fill(); });
    c.strokeStyle = "#2a170b"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, p.r, 0, 7); c.stroke();
    c.restore();
  }

  function drawFrame() {
    var c = ctx;
    if (!bg) bg = buildBackground();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bg, 0, 0);
    var sx = 0, sy = 0;
    if (S.shake > 0.05) { sx = (Math.random() - 0.5) * S.shake; sy = (Math.random() - 0.5) * S.shake; }
    c.setTransform(scale, 0, 0, scale, sx * scale, sy * scale);
    var t = S.t;

    // lumignons des passages du haut
    for (var li = 0; li < LANES.length; li++) {
      var lx = (LANES[li].x0 + LANES[li].x1) / 2, on = S.lanes[li];
      c.fillStyle = on ? "#ffe08a" : "rgba(255, 224, 138, .16)";
      if (on) { c.shadowColor = "#ffd257"; c.shadowBlur = 12; }
      c.beginPath(); c.ellipse(lx, 66, 8, 11, 0, 0, 7); c.fill();
      c.shadowBlur = 0;
    }
    // multiplicateur (5 lumignons au centre)
    for (var m = 1; m <= MULT_MAX; m++) {
      var lit = S.mult >= m;
      c.fillStyle = lit ? "#ffb347" : "rgba(255, 179, 71, .15)";
      if (lit) { c.shadowColor = "#ffb347"; c.shadowBlur = 8; }
      c.beginPath(); c.arc(135 + (m - 1) * 25, 505, 5, 0, 7); c.fill();
      c.shadowBlur = 0;
    }
    c.fillStyle = "rgba(242, 212, 138, .35)"; c.font = "800 9px Nunito, system-ui, sans-serif"; c.textAlign = "center";
    c.fillText("MULTIPLICATEUR", 185, 521);

    // terrier : halo quand la bille y est
    if (S.ball && S.ball.mode === "saucer") {
      c.fillStyle = "rgba(201, 166, 255, " + (0.4 + 0.3 * Math.sin(t * 20)) + ")";
      c.beginPath(); c.arc(SAUCER.x, SAUCER.y, SAUCER.r + 9, 0, 7); c.fill();
    }

    // lance-pierres allumés
    SLINGS.forEach(function (s) {
      if (s.flash > 0) {
        woodLine(c, s.pts, true);
        c.fillStyle = "rgba(255, 179, 71, " + s.flash * 0.9 + ")"; c.fill();
      }
    });

    // cibles GLAND
    for (var i = 0; i < TARGETS.length; i++) {
      var q = TARGETS[i], lit2 = S.letters[i], f2 = targetFlash[i];
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.arc(q.x + 1.5, q.y + 3, TARGET_R + 1, 0, 7); c.fill();
      var gg = c.createRadialGradient(q.x - 3, q.y - 4, 1, q.x, q.y, TARGET_R);
      if (lit2) { gg.addColorStop(0, "#fff3c4"); gg.addColorStop(1, "#e8873a"); c.shadowColor = "#ffb347"; c.shadowBlur = 10 + f2 * 10; }
      else { gg.addColorStop(0, "#8a5a2b"); gg.addColorStop(1, "#4a2f1e"); }
      c.fillStyle = gg; c.beginPath(); c.arc(q.x, q.y, TARGET_R + f2 * 1.5, 0, 7); c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = "#2a170b"; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, TARGET_R + f2 * 1.5, 0, 7); c.stroke();
      c.fillStyle = lit2 ? "#4a2f1e" : "#e8c27a"; c.font = "900 13px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(LETTERS[i], q.x, q.y + 1);
    }

    // champignons
    for (var bi = 0; bi < BUMPERS.length; bi++) drawBumper(c, BUMPERS[bi], bumpFlash[bi]);

    // ressort
    var py = S.plungerY;
    c.strokeStyle = "#cfd6d4"; c.lineWidth = 2; c.beginPath();
    var zig = 8, y0 = py + 3, y1 = 688, n = 8;
    c.moveTo(365, y0);
    for (var z = 1; z <= n; z++) c.lineTo(365 + (z % 2 ? zig : -zig), y0 + (y1 - y0) * z / n);
    c.stroke();
    c.fillStyle = "#b5bbb8"; c.fillRect(LANE_X0 + 3, py - 1, LANE_X1 - LANE_X0 - 6, 5);
    c.fillStyle = "#e8873a"; c.fillRect(LANE_X0 + 3, py - 1, LANE_X1 - LANE_X0 - 6, 2);

    // flippers
    flippers.forEach(function (f) { drawFlipper(c, f); });

    // bille + traînée
    var b = S.ball;
    if (b && b.mode !== "dead") {
      for (var ti = 0; ti < trail.length - 1; ti++) {
        c.fillStyle = "rgba(220, 235, 230, " + (ti / trail.length * 0.22) + ")";
        c.beginPath(); c.arc(trail[ti].x, trail[ti].y, R * (0.4 + ti / trail.length * 0.5), 0, 7); c.fill();
      }
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(b.x + 2.5, b.y + 4, R, R * 0.8, 0, 0, 7); c.fill();
      var bg2 = c.createRadialGradient(b.x - 3, b.y - 3.5, 1, b.x, b.y, R);
      bg2.addColorStop(0, "#ffffff"); bg2.addColorStop(0.45, "#c9d3d1"); bg2.addColorStop(1, "#5d6b69");
      c.fillStyle = bg2; c.beginPath(); c.arc(b.x, b.y, R, 0, 7); c.fill();
      c.strokeStyle = "rgba(20,30,28,.7)"; c.lineWidth = 1; c.stroke();
    }

    // particules
    particles.forEach(function (p) {
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    c.globalAlpha = 1;
    // points flottants
    c.font = "900 13px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    popups.forEach(function (p) {
      c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      c.lineWidth = 3; c.strokeStyle = "rgba(20,10,0,.8)"; c.strokeText(p.text, p.x, p.y);
      c.fillStyle = p.col; c.fillText(p.text, p.x, p.y);
    });
    c.globalAlpha = 1;

    // lampes d'état sur le haut de la table
    if (S.tilt) {
      c.fillStyle = "rgba(220, 40, 40, " + (0.5 + 0.4 * Math.sin(t * 14)) + ")";
      c.font = "900 34px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("TILT", 185, 160);
    }
    if (S.mode === "play" && S.ball && S.ball.mode === "lane" && S.charge === 0 && S.ball.y > PLUNGER_Y - 30) {
      c.fillStyle = "rgba(255, 243, 196, " + (0.55 + 0.35 * Math.sin(t * 6)) + ")";
      c.font = "800 10px Nunito, system-ui, sans-serif"; c.textAlign = "center";
      c.fillText("ESPACE", 365, 640 - 26);
      c.fillText("▼", 365, 640 - 14);
    }
    // jauge de puissance
    if (S.charge > 0) {
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(LANE_X0 + 3, 560, 5, 70);
      c.fillStyle = S.charge > 0.8 ? "#ff7a5a" : "#ffd257";
      c.fillRect(LANE_X0 + 3, 630 - 70 * S.charge, 5, 70 * S.charge);
    }
  }

  /* ---------- boucle ---------- */
  var acc = 0, last = 0;
  function update(dt) {
    // décroissances visuelles
    for (var i = 0; i < bumpFlash.length; i++) bumpFlash[i] = Math.max(0, bumpFlash[i] - dt * 5);
    for (var j = 0; j < targetFlash.length; j++) targetFlash[j] = Math.max(0, targetFlash[j] - dt * 4);
    SLINGS.forEach(function (s) { s.flash = Math.max(0, s.flash - dt * 6); });
    S.shake = Math.max(0, S.shake - dt * 14);
    for (var k = particles.length - 1; k >= 0; k--) {
      var p = particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt / p.max;
      if (p.life <= 0) particles.splice(k, 1);
    }
    for (var m = popups.length - 1; m >= 0; m--) {
      popups[m].y -= 26 * dt; popups[m].life -= dt * 0.8;
      if (popups[m].life <= 0) popups.splice(m, 1);
    }
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.msg = ""; }

    if (S.mode !== "play") return;
    // ressort
    var pl = anyHold(S.hold.plunger);
    if (pl && S.ball && S.ball.mode === "lane") S.charge = Math.min(1, S.charge + dt * 1.2);
    else if (!pl) S.charge = 0;
    S.plungerY = PLUNGER_Y + PLUNGER_TRAVEL * S.charge;
    S.nudge = Math.max(0, S.nudge - dt * 0.6);

    acc += dt;
    var n = 0;
    while (acc >= DT && n < 20) { step(DT); acc -= DT; n++; }
    if (acc > DT) acc = 0;

    if (S.ball && S.ball.mode === "dead") {
      S.drainTimer -= dt;
      if (S.drainTimer <= 0) afterDrain();
    }
    if (S.score > S.best && S.mode === "play") { /* le record est enregistré à la fin de la partie */ }
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
      hold: setHold, launch: launch, flippers: flippers, nudge: nudge, tick: update,
    };
  }
})();
