/* =========================================================================
   Golfaventure — aventure de golf en vue du dessus (hommage, solo)
   -------------------------------------------------------------------------
   On marche, on tire la balle comme au lance-pierre, et les COUPS sont une
   ressource : on démarre avec 20 coups, chaque tir en coûte un, les drapeaux
   sont des points de sauvegarde qui rendent tous les coups, chaque trou
   gagné (club) ajoute 3 coups au maximum, les slimes (+4), les oiseaux (+5)
   et les aigles (+10) en rendent quand la balle les touche. Quatre trous
   dorés cachent les Morceaux de Tee à rapporter au temple.
   Monde de 96 × 64 tuiles de 16 px (construit dans buildWorld), image en
   pixel art (1 pixel d'image = 1 unité du monde), agrandie sans lissage.
   Sauvegarde : localStorage « golfaventure-v1 ».
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-ga]");
  if (!root) return;
  var VERSION = "1.0.0";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return Date.now(); }
  function hash(x, y, s) { var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

  /* =====================================================================
     RÉGLAGES
     ===================================================================== */
  var TILE = 16, W = 96, HH = 64;
  var BALL_R = 3, CUP_R = 5.5;
  var BASE_STROKES = 20, CLUB_BONUS = 3;
  var VMAX = 330, DEC = 150, SLOPE = 120, STEP = 1 / 240;
  var PLAYER_R = 4, WALK = 58;
  var TY = { GRASS: 0, ROUGH: 1, SAND: 2, WATER: 3, TREE: 4, RAIL: 5, BUSH: 6, UP: 7, DOWN: 8, LEFT: 9, RIGHT: 10, PLATEAU: 11, BRIDGE: 12, FLAG: 13, CUP: 14, HOLY: 15, TEMPLE: 16, GATE: 17 };
  var BALL_SOLID = {}; BALL_SOLID[TY.TREE] = 1; BALL_SOLID[TY.RAIL] = 1; BALL_SOLID[TY.BUSH] = 1; BALL_SOLID[TY.GATE] = 1;
  var BOUNCE = {}; BOUNCE[TY.TREE] = 0.5; BOUNCE[TY.RAIL] = 0.85; BOUNCE[TY.BUSH] = 0.5; BOUNCE[TY.GATE] = 0.85;
  var DIALOGS = [
    "Bienvenue, golfeur ! Approche-toi de ta balle, puis tire-la comme un lance-pierre. Chaque tir coûte 1 coup.",
    "Touche un drapeau avec ta balle : il sauvegarde ta position et te rend tous tes coups.",
    "Quatre Morceaux de Tee dorment dans des trous dorés. Rapporte-les au temple, tout au nord.",
    "Les slimes et les oiseaux te rendent des coups si ta balle les touche. Les buissons cachent des oiseaux !",
  ];

  /* =====================================================================
     MONDE
     ===================================================================== */
  var FEAT = {
    flags: [[8, 52], [18, 30], [48, 50], [68, 44], [60, 20], [47, 21]],
    cups: [[24, 46], [40, 57], [28, 14], [72, 30], [64, 9]],
    holy: [[12, 8], [48, 30], [86, 54], [86, 8]],
    temple: [47, 8],
    gates: [[46, 18], [47, 18], [48, 18]],
    npcs: [[11, 52, 0], [19, 31, 1], [50, 49, 2], [67, 45, 3]],
    items: [[36, 50, "brake"], [60, 14, "power"]],
    slimes: [[14, 46], [22, 42], [26, 54], [10, 36], [18, 26], [26, 22], [40, 48], [56, 56], [52, 44], [70, 40], [78, 34], [74, 50], [64, 15], [88, 21], [20, 12], [30, 38]],
    eagles: [{ y: 27, x1: 36, x2: 60, sp: 34 }, { y: 38, x1: 66, x2: 90, sp: 40 }, { y: 5, x1: 58, x2: 90, sp: 36 }],
  };
  function buildWorld() {
    var g = new Uint8Array(W * HH);
    function set(x, y, t) { if (x >= 0 && y >= 0 && x < W && y < HH) g[y * W + x] = t; }
    function get(x, y) { return (x < 0 || y < 0 || x >= W || y >= HH) ? TY.TREE : g[y * W + x]; }
    function rect(x1, y1, x2, y2, t) { for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) set(x, y, t); }
    function frame(x1, y1, x2, y2, t) { rect(x1, y1, x2, y1, t); rect(x1, y2, x2, y2, t); rect(x1, y1, x1, y2, t); rect(x2, y1, x2, y2, t); }
    function ellipse(cx, cy, rx, ry, t, only) {
      for (var y = cy - ry; y <= cy + ry; y++) for (var x = cx - rx; x <= cx + rx; x++)
        if ((x - cx) * (x - cx) / (rx * rx) + (y - cy) * (y - cy) / (ry * ry) <= 1 && (only == null || get(x, y) === only)) set(x, y, t);
    }
    function scatter(x1, y1, x2, y2, t, p, seed, only) {
      only = only == null ? TY.GRASS : only;
      for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) if (get(x, y) === only && hash(x, y, seed) < p) set(x, y, t);
    }
    rect(0, 0, W - 1, HH - 1, TY.GRASS);
    // forêt (nord-ouest)
    scatter(2, 2, 32, 36, TY.TREE, 0.5, 1);
    scatter(2, 2, 32, 36, TY.BUSH, 0.05, 2);
    rect(10, 5, 14, 11, TY.GRASS); rect(14, 8, 28, 10, TY.GRASS); rect(26, 12, 30, 16, TY.GRASS); rect(28, 10, 29, 20, TY.GRASS);
    rect(7, 20, 9, 40, TY.GRASS); rect(8, 29, 20, 30, TY.GRASS); rect(16, 27, 20, 33, TY.GRASS);
    // désert (est)
    rect(64, 24, 92, 60, TY.SAND);
    scatter(64, 24, 92, 60, TY.ROUGH, 0.07, 3, TY.SAND);
    scatter(64, 24, 92, 60, TY.TREE, 0.025, 4, TY.SAND);
    rect(66, 42, 70, 46, TY.GRASS); rect(70, 28, 74, 32, TY.GRASS);
    frame(79, 49, 91, 59, TY.RAIL); rect(80, 50, 90, 58, TY.SAND); set(79, 53, TY.SAND); set(79, 54, TY.SAND);
    // montagne (nord-est)
    scatter(56, 4, 92, 22, TY.TREE, 0.05, 5);
    rect(62, 7, 90, 9, TY.GRASS);
    rect(66, 12, 70, 18, TY.RIGHT); rect(72, 12, 76, 18, TY.LEFT); rect(78, 12, 82, 18, TY.DOWN); rect(84, 12, 90, 18, TY.PLATEAU);
    rect(66, 19, 82, 19, TY.RAIL); rect(65, 11, 65, 19, TY.RAIL); rect(83, 11, 83, 11, TY.RAIL);
    // bande centrale (est-ouest)
    rect(2, 20, 92, 22, TY.GRASS);
    // lac
    ellipse(48, 32, 14, 9, TY.WATER);
    ellipse(48, 32, 3, 3, TY.GRASS);
    for (var bx = 33; bx <= 63; bx++) for (var by = 32; by <= 33; by++) if (get(bx, by) === TY.WATER) set(bx, by, TY.BRIDGE);
    // temple
    frame(38, 4, 56, 18, TY.RAIL); rect(39, 5, 55, 17, TY.PLATEAU); rect(44, 19, 50, 22, TY.GRASS);
    frame(43, 6, 51, 12, TY.RAIL); rect(44, 7, 50, 11, TY.GRASS); set(47, 12, TY.GRASS); set(46, 12, TY.GRASS); set(48, 12, TY.GRASS);
    // pré de départ et rive sud : quelques obstacles
    scatter(3, 40, 31, 61, TY.TREE, 0.02, 6); scatter(3, 40, 31, 61, TY.BUSH, 0.025, 7);
    scatter(33, 42, 63, 60, TY.TREE, 0.02, 8); scatter(33, 42, 63, 60, TY.BUSH, 0.025, 9);
    ellipse(18, 56, 4, 2, TY.ROUGH); ellipse(26, 50, 3, 2, TY.ROUGH); ellipse(56, 52, 3, 2, TY.SAND); ellipse(36, 52, 3, 2, TY.SAND); ellipse(44, 45, 3, 1, TY.ROUGH);
    // bordure de forêt
    rect(0, 0, W - 1, 1, TY.TREE); rect(0, HH - 2, W - 1, HH - 1, TY.TREE); rect(0, 0, 1, HH - 1, TY.TREE); rect(W - 2, 0, W - 1, HH - 1, TY.TREE);
    // éléments à placer (avec un peu de place autour)
    function clear(x, y, r) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) { var t = get(xx, yy); if (t === TY.TREE || t === TY.BUSH || t === TY.ROUGH) set(xx, yy, TY.GRASS); } }
    FEAT.flags.forEach(function (f) { clear(f[0], f[1], 2); set(f[0], f[1], TY.FLAG); });
    FEAT.cups.forEach(function (f) { clear(f[0], f[1], 2); set(f[0], f[1], TY.CUP); });
    FEAT.holy.forEach(function (f) { clear(f[0], f[1], 2); set(f[0], f[1], TY.HOLY); });
    set(FEAT.temple[0], FEAT.temple[1], TY.TEMPLE);
    FEAT.gates.forEach(function (f) { set(f[0], f[1], TY.GATE); });
    FEAT.npcs.forEach(function (f) { clear(f[0], f[1], 1); });
    FEAT.items.forEach(function (f) { clear(f[0], f[1], 1); });
    FEAT.slimes.forEach(function (f) { clear(f[0], f[1], 1); });
    return g;
  }

  /* =====================================================================
     ÉTAT ET SAUVEGARDE
     ===================================================================== */
  var SAVE_KEY = "golfaventure-v1";
  var S = null;           // progression (sauvegardée)
  function newSave() { return { clubs: 0, pieces: [0, 0, 0, 0], cups: {}, cp: 0, items: { brake: 0, power: 0 }, bushes: {}, taken: {}, deaths: 0, shots: 0, ms: 0, won: false, told: {} }; }
  function loadSave() { var s = load(SAVE_KEY, null); if (!s || !s.pieces) return null; var d = newSave(); for (var k in d) if (s[k] == null) s[k] = d[k]; return s; }
  function persist() { if (S) save(SAVE_KEY, S); }
  function maxStrokes() { return BASE_STROKES + CLUB_BONUS * S.clubs; }

  var grid = null;        // tuiles (copie modifiable : buissons cassés, portes ouvertes)
  var P = { x: 0, y: 0, vx: 0, vy: 0, face: 1, step: 0, hurt: 0 };
  var B = { x: 0, y: 0, vx: 0, vy: 0, rolling: false, rest: { x: 0, y: 0 }, brake: 0 };
  var strokes = 20, mode = "menu";   // menu | play | dead | won
  var slimes = [], birds = [], eagles = [], npcs = [], items = [], fx = [], floaters = [];
  var cam = { x: 0, y: 0 };
  var aim = { on: false, ang: 0, pow: 0.55, drag: null };
  var keys = {}, joy = { on: false, id: -1, sx: 0, sy: 0, dx: 0, dy: 0 };
  var outTimer = 0, msgText = "", msgT = 0, dlgT = 0, lastNpc = -1;

  var stage = $("[data-stage]", root), canvas = $("[data-canvas]", root), cx = canvas.getContext("2d");
  var overlay = $("[data-overlay]", root), cardEl = $("[data-card]", root);
  var hudBar = $("[data-hud]", root), hudStrokes = $("[data-strokes]", root), hudMax = $("[data-max]", root), hudMsg = $("[data-msg]", root), hudDlg = $("[data-dialog]", root);
  var brakeBtn = $("[data-brake]", root), joyEl = $("[data-joy]", root);
  var cw = 0, ch = 0;
  var view = { aw: 0, ah: 0, S: 3, lm: 0, tm: 0 };

  function get(tx, ty) { return (tx < 0 || ty < 0 || tx >= W || ty >= HH) ? TY.TREE : grid[ty * W + tx]; }
  function tileAt(x, y) { return get(Math.floor(x / TILE), Math.floor(y / TILE)); }
  function center(f) { return { x: f[0] * TILE + 8, y: f[1] * TILE + 8 }; }

  function setMsg(t, ms) { msgText = t; msgT = now() + (ms || 2200); }
  function floatText(x, y, text, col) { floaters.push({ x: x, y: y, t: 0, text: text, col: col || "#ffffff" }); }
  function addStrokes(n) { strokes = Math.min(maxStrokes(), strokes + n); hudUpdate(); }

  function startGame(fresh) {
    S = fresh ? newSave() : (loadSave() || newSave());
    grid = buildWorld();
    Object.keys(S.bushes).forEach(function (k) { grid[+k] = TY.GRASS; });
    if (S.pieces[0] && S.pieces[1] && S.pieces[2] && S.pieces[3]) FEAT.gates.forEach(function (f) { grid[f[1] * W + f[0]] = TY.GRASS; });
    strokes = maxStrokes();
    var f = center(FEAT.flags[S.cp]);
    P.x = f.x; P.y = f.y + 12; P.vx = P.vy = 0; B.x = f.x + 9; B.y = f.y + 11; B.vx = B.vy = 0; B.rolling = false; B.rest = { x: B.x, y: B.y };
    slimes = FEAT.slimes.map(function (s) { var c = center(s); return { x: c.x, y: c.y, hx: c.x, hy: c.y, dx: 0, dy: 0, t: Math.random() * 2, alive: true, cd: 0, bob: Math.random() * 6 }; });
    eagles = FEAT.eagles.map(function (e, i) { return { x: e.x1 * TILE + (i * 90) % ((e.x2 - e.x1) * TILE), y: e.y * TILE + 8, dir: 1, x1: e.x1 * TILE, x2: e.x2 * TILE, sp: e.sp, alive: true, back: 0 }; });
    npcs = FEAT.npcs.map(function (n) { var c = center(n); return { x: c.x, y: c.y, d: n[2] }; });
    items = FEAT.items.filter(function (it) { return !S.taken[it[2]]; }).map(function (it) { var c = center(it); return { x: c.x, y: c.y, kind: it[2] }; });
    birds = []; fx = []; floaters = []; aim.on = false; aim.drag = null; outTimer = 0; lastNpc = -1;
    mode = "play";
    cam.x = P.x - view.aw / 2; cam.y = P.y - view.ah / 2;
    closeCard(); hudUpdate(); hudBar.hidden = false;
    setMsg(fresh ? "Aventure : trouve les 4 Morceaux de Tee !" : "Bon retour, golfeur !", 2600);
    persist();
  }

  /* =====================================================================
     SONS
     ===================================================================== */
  var soundOn = load("golfaventure-sound", true), AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === "suspended") AC.resume(); return AC; }
  function tone(t0, freq, dur, vol, type, slide) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(n, k) {
    if (!soundOn) return;
    if (n === "hit") tone(0, 200 + 240 * (k || 0.5), 0.08, 0.16, "square", 80);
    else if (n === "wall") tone(0, 150 + 160 * (k || 0.3), 0.05, 0.08, "triangle");
    else if (n === "sink") { tone(0, 520, 0.1, 0.16); tone(0.1, 660, 0.1, 0.16); tone(0.2, 880, 0.2, 0.16); }
    else if (n === "splash") tone(0, 300, 0.28, 0.16, "sawtooth", 70);
    else if (n === "kill") { tone(0, 480, 0.08, 0.16); tone(0.07, 720, 0.12, 0.16); }
    else if (n === "get") { tone(0, 660, 0.08, 0.14, "triangle"); tone(0.08, 990, 0.14, 0.14, "triangle"); }
    else if (n === "flag") { tone(0, 392, 0.1, 0.14, "triangle"); tone(0.1, 523, 0.1, 0.14, "triangle"); tone(0.2, 784, 0.2, 0.14, "triangle"); }
    else if (n === "hurt") tone(0, 180, 0.2, 0.18, "sawtooth", 60);
    else if (n === "bush") tone(0, 260, 0.1, 0.1, "triangle", 120);
  }

  /* =====================================================================
     PHYSIQUE DE LA BALLE
     ===================================================================== */
  function speedOf(b) { return Math.sqrt(b.vx * b.vx + b.vy * b.vy); }
  function breakBush(tx, ty) {
    var i = ty * W + tx; grid[i] = TY.GRASS; S.bushes[i] = 1; sfx("bush");
    fx.push({ k: "puff", x: tx * TILE + 8, y: ty * TILE + 8, t: 0 });
    if (hash(tx, ty, 77) < 0.5) birds.push({ x: tx * TILE + 8, y: ty * TILE + 8, t: 0, life: 7, vx: 0, vy: 0, tt: 0 });
    persist();
  }
  function collideTiles(b) {
    var tx0 = Math.floor((b.x - BALL_R) / TILE), tx1 = Math.floor((b.x + BALL_R) / TILE), ty0 = Math.floor((b.y - BALL_R) / TILE), ty1 = Math.floor((b.y + BALL_R) / TILE), hit = 0;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var t = get(tx, ty);
      if (!BALL_SOLID[t]) continue;
      var rx = tx * TILE, ry = ty * TILE, px = clamp(b.x, rx, rx + TILE), py = clamp(b.y, ry, ry + TILE), dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
      if (d2 >= BALL_R * BALL_R) continue;
      if (t === TY.BUSH && speedOf(b) > 25) { breakBush(tx, ty); b.vx *= 0.6; b.vy *= 0.6; continue; }
      var nx, ny;
      if (d2 === 0) {   // centre dans la tuile : on sort par le bord le plus proche
        var l = b.x - rx, r = rx + TILE - b.x, u = b.y - ry, d = ry + TILE - b.y, m = Math.min(l, r, u, d);
        if (m === l) { nx = -1; ny = 0; b.x = rx - BALL_R; } else if (m === r) { nx = 1; ny = 0; b.x = rx + TILE + BALL_R; } else if (m === u) { nx = 0; ny = -1; b.y = ry - BALL_R; } else { nx = 0; ny = 1; b.y = ry + TILE + BALL_R; }
      } else { var dd = Math.sqrt(d2); nx = dx / dd; ny = dy / dd; b.x = px + nx * BALL_R; b.y = py + ny * BALL_R; }
      var vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { var e = BOUNCE[t] || 0.6; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; hit = Math.max(hit, -vn); }
    }
    return hit;
  }
  function stepBall(dt) {
    var b = B, t = tileAt(b.x, b.y), ax = 0, ay = 0, am = 0;
    if (t === TY.UP) { ay = -SLOPE; am = SLOPE; } else if (t === TY.DOWN) { ay = SLOPE; am = SLOPE; } else if (t === TY.LEFT) { ax = -SLOPE; am = SLOPE; } else if (t === TY.RIGHT) { ax = SLOPE; am = SLOPE; }
    b.vx += ax * dt; b.vy += ay * dt;
    var sp = speedOf(b);
    if (sp > 0) {
      var dec = t === TY.ROUGH ? DEC * 2.3 : t === TY.SAND ? DEC * 6 : DEC;
      if (b.brake > 0) { dec *= 9; b.brake -= dt; }
      var ns = Math.max(0, sp - dec * dt) * (1 - 0.2 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp; sp = ns;
      if (sp < 6 && am < DEC * 0.8) { b.vx = 0; b.vy = 0; sp = 0; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    var hit = collideTiles(b);
    if (hit > 40) sfx("wall", hit / VMAX);
    var tn = tileAt(b.x, b.y);
    if (tn === TY.WATER) {
      fx.push({ k: "splash", x: b.x, y: b.y, t: 0 }); sfx("splash");
      b.x = b.rest.x; b.y = b.rest.y; b.vx = b.vy = 0; b.rolling = false;
      strokes = Math.max(0, strokes - 1); setMsg("Plouf ! −1 coup", 1800); hudUpdate();
      return;
    }
    // trous
    if (tn === TY.CUP || tn === TY.HOLY || tn === TY.TEMPLE) {
      var cxp = Math.floor(b.x / TILE) * TILE + 8, cyp = Math.floor(b.y / TILE) * TILE + 8, dd = Math.sqrt((b.x - cxp) * (b.x - cxp) + (b.y - cyp) * (b.y - cyp));
      if (dd < CUP_R && sp < 150 && !(tn !== TY.TEMPLE && S.cups[cupKey(Math.floor(b.x / TILE), Math.floor(b.y / TILE))])) { sinkBall(Math.floor(b.x / TILE), Math.floor(b.y / TILE), tn); return; }
      if (dd < CUP_R * 2 && sp < 90 && sp > 0 && !(tn !== TY.TEMPLE && S.cups[cupKey(Math.floor(b.x / TILE), Math.floor(b.y / TILE))])) { b.vx += (cxp - b.x) / (dd || 1) * 500 * dt; b.vy += (cyp - b.y) / (dd || 1) * 500 * dt; }
    }
    if (b.vx === 0 && b.vy === 0) { b.rolling = false; b.rest = { x: b.x, y: b.y }; }
  }
  function cupKey(tx, ty) { return tx + "," + ty; }
  function sinkBall(tx, ty, tn) {
    var key = cupKey(tx, ty), c = { x: tx * TILE + 8, y: ty * TILE + 8 };
    B.vx = B.vy = 0; B.rolling = false; B.x = c.x; B.y = c.y + 10; B.rest = { x: B.x, y: B.y };
    sfx("sink"); fx.push({ k: "puff", x: c.x, y: c.y, t: 0 });
    if (tn === TY.TEMPLE) {
      if (S.pieces[0] && S.pieces[1] && S.pieces[2] && S.pieces[3]) { S.won = true; persist(); mode = "won"; setTimeout(showWin, 600); }
      else { setMsg("Il manque des Morceaux de Tee…", 2600); B.x = c.x; B.y = c.y + 12; B.rest = { x: B.x, y: B.y }; }
      return;
    }
    S.cups[key] = 1; S.clubs++;
    if (tn === TY.HOLY) {
      var idx = -1; FEAT.holy.forEach(function (h, i) { if (h[0] === tx && h[1] === ty) idx = i; });
      if (idx >= 0) S.pieces[idx] = 1;
      var n = S.pieces.reduce(function (a, b) { return a + b; }, 0);
      setMsg("Morceau de Tee " + n + "/4 ! (+3 coups max)", 3000);
      if (n === 4) { FEAT.gates.forEach(function (f) { grid[f[1] * W + f[0]] = TY.GRASS; }); setTimeout(function () { setMsg("Le temple s'ouvre, au nord !", 3200); }, 3100); }
    } else setMsg("Club trouvé ! +3 coups max", 2600);
    strokes = maxStrokes(); floatText(c.x, c.y - 8, "+3", "#f6c445"); hudUpdate(); persist();
  }
  function shoot(ang, pow) {
    if (mode !== "play" || B.rolling) return false;
    if (strokes <= 0) { setMsg("Plus de coups !", 1500); return false; }
    var v = clamp(pow, 0.05, 1) * VMAX * (S.items.power ? 1.3 : 1);
    strokes--; S.shots++; B.rest = { x: B.x, y: B.y }; B.vx = Math.cos(ang) * v; B.vy = Math.sin(ang) * v; B.rolling = true; B.brake = 0;
    sfx("hit", pow); aim.on = false; aim.drag = null; hudUpdate();
    return true;
  }

  /* =====================================================================
     JOUEUR, ENNEMIS, OBJETS
     ===================================================================== */
  function walkSolid(t) { return t === TY.TREE || t === TY.RAIL || t === TY.BUSH || t === TY.WATER || t === TY.GATE; }
  function blockedAt(x, y, r) {
    var tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE), ty0 = Math.floor((y - r) / TILE), ty1 = Math.floor((y + r) / TILE);
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (walkSolid(get(tx, ty))) {
      var px = clamp(x, tx * TILE, tx * TILE + TILE), py = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - px) * (x - px) + (y - py) * (y - py) < r * r) return true;
    }
    return false;
  }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }
  function nearBall() { return !B.rolling && dist(P.x, P.y, B.x, B.y) < 20; }

  function updateAll(dt) {
    var i, mx = 0, my = 0;
    S.ms += dt * 1000;
    // marche
    if (!aim.on && mode === "play") {
      if (keys.ArrowLeft || keys.a || keys.q) mx -= 1; if (keys.ArrowRight || keys.d) mx += 1;
      if (keys.ArrowUp || keys.w || keys.z) my -= 1; if (keys.ArrowDown || keys.s) my += 1;
      if (joy.on) { mx += joy.dx; my += joy.dy; }
      var l = Math.sqrt(mx * mx + my * my);
      if (l > 1) { mx /= l; my /= l; }
      var nx = P.x + mx * WALK * dt, ny = P.y + my * WALK * dt;
      if (!blockedAt(nx, P.y, PLAYER_R)) P.x = nx;
      if (!blockedAt(P.x, ny, PLAYER_R)) P.y = ny;
      if (mx) P.face = mx > 0 ? 1 : -1;
      P.step = (mx || my) ? P.step + dt * 9 : 0;
    }
    P.hurt = Math.max(0, P.hurt - dt);
    // slimes
    slimes.forEach(function (s) {
      if (!s.alive) return;
      s.t -= dt; s.bob += dt * 6; s.cd = Math.max(0, s.cd - dt);
      if (s.t <= 0) { s.t = 1 + Math.random() * 2; var a = Math.random() * 6.283, tow = dist(s.x, s.y, P.x, P.y) < 70 ? 1 : 0; if (tow) a = Math.atan2(P.y - s.y, P.x - s.x); s.dx = Math.cos(a) * 14; s.dy = Math.sin(a) * 14; if (!tow && Math.random() < 0.4) { s.dx = s.dy = 0; } }
      var sx = s.x + s.dx * dt, sy = s.y + s.dy * dt;
      if (!blockedAt(sx, s.y, 4)) s.x = sx; else s.dx = -s.dx;
      if (!blockedAt(s.x, sy, 4)) s.y = sy; else s.dy = -s.dy;
      if (dist(s.x, s.y, B.x, B.y) < 8 && speedOf(B) > 20) {   // touché par la balle
        s.alive = false; addStrokes(4); sfx("kill"); floatText(s.x, s.y - 6, "+4", "#a8e63a"); fx.push({ k: "puff", x: s.x, y: s.y, t: 0 }); B.vx *= 0.6; B.vy *= 0.6;
      } else if (s.cd <= 0 && dist(s.x, s.y, P.x, P.y) < 8) {   // touche le joueur
        s.cd = 1.2; P.hurt = 0.6; sfx("hurt"); strokes = Math.max(1, strokes - 1); floatText(P.x, P.y - 10, "-1", "#ef6a52"); hudUpdate();
        var ka = Math.atan2(P.y - s.y, P.x - s.x), kx = P.x + Math.cos(ka) * 14, ky = P.y + Math.sin(ka) * 14;
        if (!blockedAt(kx, ky, PLAYER_R)) { P.x = kx; P.y = ky; }
      }
    });
    // oiseaux sortis des buissons (+5)
    birds = birds.filter(function (o) {
      o.t += dt; o.tt -= dt; if (o.tt <= 0) { o.tt = 0.4 + Math.random() * 0.6; var a = Math.random() * 6.283; o.vx = Math.cos(a) * 26; o.vy = Math.sin(a) * 26; }
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (dist(o.x, o.y, B.x, B.y) < 8 && speedOf(B) > 20) { addStrokes(5); sfx("kill"); floatText(o.x, o.y - 6, "+5", "#f6c445"); fx.push({ k: "puff", x: o.x, y: o.y, t: 0 }); return false; }
      return o.t < o.life;
    });
    // aigles (+10)
    eagles.forEach(function (e) {
      if (!e.alive) { e.back -= dt; if (e.back <= 0) e.alive = true; return; }
      e.x += e.dir * e.sp * dt; if (e.x > e.x2) e.dir = -1; if (e.x < e.x1) e.dir = 1;
      if (dist(e.x, e.y, B.x, B.y) < 10 && speedOf(B) > 20) { e.alive = false; e.back = 40; addStrokes(10); sfx("kill"); floatText(e.x, e.y - 8, "+10", "#f6c445"); fx.push({ k: "puff", x: e.x, y: e.y, t: 0 }); }
    });
    // objets, drapeaux, PNJ
    items = items.filter(function (it) {
      if (dist(it.x, it.y, P.x, P.y) > 9) return true;
      S.items[it.kind] = 1; S.taken[it.kind] = 1; sfx("get"); persist(); hudUpdate();
      setMsg(it.kind === "brake" ? "FREIN ! Touche le bouton pendant que la balle roule." : "Club puissant ! Tes tirs partent 30 % plus fort.", 3600);
      return false;
    });
    FEAT.flags.forEach(function (f, idx) {
      var c = center(f);
      if ((dist(c.x, c.y, B.x, B.y) < 10 || dist(c.x, c.y, P.x, P.y) < 9) && (S.cp !== idx || strokes < maxStrokes())) {
        if (S.cp !== idx) { S.cp = idx; setMsg("Drapeau ! Position sauvegardée, coups restaurés.", 2400); sfx("flag"); persist(); }
        else if (strokes < maxStrokes()) { sfx("flag"); setMsg("Coups restaurés.", 1400); }
        strokes = maxStrokes(); hudUpdate();
      }
    });
    var nearN = -1;
    npcs.forEach(function (n, i2) { if (dist(n.x, n.y, P.x, P.y) < 16) nearN = i2; });
    if (nearN >= 0 && nearN !== lastNpc) { showDialog(DIALOGS[npcs[nearN].d]); }
    if (nearN < 0 && lastNpc >= 0) { var far = true; npcs.forEach(function (n) { if (dist(n.x, n.y, P.x, P.y) < 40) far = false; }); if (far) lastNpc = -1; } else if (nearN >= 0) lastNpc = nearN;
    if (dlgT && now() > dlgT) { hudDlg.hidden = true; dlgT = 0; }
    // plus de coups : retour au dernier drapeau
    if (mode === "play" && strokes <= 0 && !B.rolling) {
      outTimer += dt;
      if (outTimer > 1.1) respawn();
    } else outTimer = 0;
    // effets
    fx = fx.filter(function (f) { f.t += dt; return f.t < (f.k === "splash" ? 0.6 : 0.4); });
    floaters = floaters.filter(function (f) { f.t += dt; f.y -= dt * 10; return f.t < 1.2; });
    brakeBtn.hidden = !(S.items.brake && B.rolling);
  }
  function respawn() {
    S.deaths++; var f = center(FEAT.flags[S.cp]);
    setMsg("Plus de coups ! Retour au drapeau.", 2600); sfx("hurt");
    P.x = f.x; P.y = f.y + 12; B.x = f.x + 9; B.y = f.y + 11; B.vx = B.vy = 0; B.rolling = false; B.rest = { x: B.x, y: B.y };
    strokes = maxStrokes(); hudUpdate(); persist(); outTimer = 0; aim.on = false;
  }
  function showDialog(text) { hudDlg.textContent = text; hudDlg.hidden = false; dlgT = now() + 6000; }

  /* =====================================================================
     RENDU PIXEL ART
     ===================================================================== */
  var C = {
    fair: "#a8e63a", fair2: "#96d632", stripe: "#c6f55c", side: "#139a56", side2: "#0e7f49",
    rough: "#7cbf2a", rough2: "#5da31f", tree: "#0b5a33", tree2: "#0f7a44", treeHi: "#34aa5c", forest: "#1f8f4e",
    sand: "#f3eea0", sandDot: "#7a7440", water: "#27a9f1", waterHi: "#8dd8ff", waterEdge: "#126aa6",
    white: "#ffffff", black: "#14141e", gray: "#cdd2dc", yellow: "#f6c445", brown: "#7a4b00",
    red: "#d8322b", red2: "#ef6a52", cream: "#fdf3de", orange: "#e8872a", wood: "#b9763a", wood2: "#7c4a1e", purple: "#b06cf0",
  };
  var atlas = {};
  function mk(fn) { var c = document.createElement("canvas"); c.width = TILE; c.height = TILE; var g = c.getContext("2d"); fn(g); return c; }
  function fr(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function grassBase(g, v) {
    fr(g, 0, 0, 16, 16, C.fair);
    for (var i = 0; i < 14; i++) fr(g, Math.floor(hash(i, v, 11) * 16), Math.floor(hash(i, v, 12) * 16), 1, 1, C.fair2);
    if (v === 2) { fr(g, 4, 5, 1, 1, C.red2); fr(g, 11, 11, 1, 1, C.white); }
    if (v === 3) { fr(g, 9, 4, 1, 3, C.side); fr(g, 10, 5, 1, 2, C.side); fr(g, 8, 5, 1, 2, C.side); }
  }
  function blob(g, cx0, cy0, r, col) { for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - y * y)); fr(g, cx0 - w, cy0 + y, 2 * w + 1, 1, col); } }
  function chev(g, dir, col) {
    // chevrons qui pointent dans le sens de la pente
    var pts = [];
    for (var k = 0; k < 3; k++) for (var j = -3; j <= 3; j++) {
      var a = 3 - Math.abs(j), base = 3 + k * 5;
      if (dir === 8) pts.push([8 + j, base + a]); else if (dir === 7) pts.push([8 + j, base + 3 - a + 1]);
      else if (dir === 10) pts.push([base + a, 8 + j]); else pts.push([base + 3 - a + 1, 8 + j]);
    }
    pts.forEach(function (p) { fr(g, p[0], p[1], 1, 1, col); fr(g, p[0] + (dir === 7 || dir === 8 ? 0 : 0), p[1] + 1, 1, 1, col); });
  }
  function drawTile(t, v, f) {
    return mk(function (g) {
      if (t === TY.GRASS || t === TY.FLAG || t === TY.CUP || t === TY.HOLY || t === TY.TEMPLE) grassBase(g, v);
      if (t === TY.ROUGH) { fr(g, 0, 0, 16, 16, C.rough); for (var i = 0; i < 10; i++) { var x = Math.floor(hash(i, v, 21) * 14) + 1, y = Math.floor(hash(i, v, 22) * 12) + 2; fr(g, x, y, 1, 3, C.rough2); fr(g, x + 1, y + 1, 1, 2, C.rough2); } }
      else if (t === TY.SAND) { fr(g, 0, 0, 16, 16, C.sand); for (var j = 0; j < 9; j++) fr(g, Math.floor(hash(j, v, 31) * 16), Math.floor(hash(j, v, 32) * 16), 1, 1, C.sandDot); }
      else if (t === TY.WATER) {
        fr(g, 0, 0, 16, 16, C.water);
        var o = f ? 4 : 0; fr(g, 2 + o, 3, 4, 1, C.waterHi); fr(g, 9 - o, 10, 4, 1, C.waterHi); fr(g, 5 + o, 14, 3, 1, C.waterHi);
      }
      else if (t === TY.TREE) {
        fr(g, 0, 0, 16, 16, C.forest); fr(g, 0, 0, 16, 16, C.forest);
        blob(g, 8, 9, 7, C.black); blob(g, 8, 8, 6, C.tree); blob(g, 6, 6, 3, C.tree2); fr(g, 5, 5, 2, 1, C.treeHi); fr(g, 4, 6, 1, 1, C.treeHi);
        for (var q = 0; q < 6; q++) fr(g, 3 + Math.floor(hash(q, v, 41) * 10), 4 + Math.floor(hash(q, v, 42) * 9), 1, 1, C.tree2);
      }
      else if (t === TY.RAIL) {
        fr(g, 0, 0, 16, 16, C.black);
        for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 3; xx++) fr(g, 1 + xx * 5, 1 + yy * 5, 4, 4, (xx + yy) & 1 ? C.gray : C.white);
      }
      else if (t === TY.GATE) {
        fr(g, 0, 0, 16, 16, C.black);
        for (var y2 = 0; y2 < 3; y2++) for (var x2 = 0; x2 < 3; x2++) fr(g, 1 + x2 * 5, 1 + y2 * 5, 4, 4, (x2 + y2) & 1 ? "#c98a1a" : C.yellow);
      }
      else if (t === TY.BUSH) {
        grassBase(g, v); blob(g, 8, 9, 6, C.black); blob(g, 8, 8, 5, "#2f9a3a"); blob(g, 6, 6, 2, "#5cc464");
        fr(g, 10, 9, 2, 2, C.red); fr(g, 5, 11, 2, 2, C.red); fr(g, 9, 5, 2, 2, C.red2);
      }
      else if (t >= TY.UP && t <= TY.RIGHT) {
        fr(g, 0, 0, 16, 16, C.fair2);
        for (var s = 0; s < 16; s += 4) { if (t === TY.UP || t === TY.DOWN) fr(g, 0, s, 16, 2, C.fair); else fr(g, s, 0, 2, 16, C.fair); }
        chev(g, t, C.side);
      }
      else if (t === TY.PLATEAU) { fr(g, 0, 0, 16, 16, C.fair); for (var d = -16; d < 16; d += 6) for (var e = 0; e < 16; e++) { var px = d + e; if (px >= 0 && px < 16) fr(g, px, e, 2, 1, C.stripe); } }
      else if (t === TY.BRIDGE) {
        fr(g, 0, 0, 16, 16, C.wood2);
        for (var p = 0; p < 16; p += 4) { fr(g, p, 1, 3, 14, C.wood); fr(g, p, 1, 3, 1, "#d99a58"); }
        fr(g, 0, 0, 16, 1, C.black); fr(g, 0, 15, 16, 1, C.black);
      }
      if (t === TY.FLAG) { fr(g, 7, 6, 2, 9, C.black); fr(g, 7, 5, 1, 10, C.white); fr(g, 5, 14, 6, 2, C.black); }
      if (t === TY.CUP) { blob(g, 8, 8, 6, C.side2); blob(g, 8, 8, 5, C.black); }
      if (t === TY.HOLY) { blob(g, 8, 8, 7, C.black); blob(g, 8, 8, 6, C.yellow); blob(g, 8, 8, 5, C.black); fr(g, 3, 8, 1, 1, C.white); }
      if (t === TY.TEMPLE) { blob(g, 8, 8, 7, C.black); blob(g, 8, 8, 6, C.purple); blob(g, 8, 8, 5, C.black); }
    });
  }
  function tileImg(t, tx, ty) {
    var v = t === TY.TREE || t === TY.WATER ? (hash(tx, ty, 5) < 0.5 ? 0 : 1) : Math.floor(hash(tx, ty, 6) * 4);
    var f = t === TY.WATER ? ((now() / 600 | 0) + tx + ty) & 1 : 0;
    var key = t + "_" + v + "_" + f;
    return atlas[key] || (atlas[key] = drawTile(t, v, f));
  }
  var doneCup = null;
  function cupDoneImg(holy) {
    var k = holy ? "dh" : "dc";
    return atlas[k] || (atlas[k] = mk(function (g) { grassBase(g, 0); blob(g, 8, 8, holy ? 7 : 6, "#3a5a3a"); blob(g, 8, 8, 5, "#243a24"); fr(g, 7, 5, 2, 6, C.cream); fr(g, 5, 7, 6, 2, C.cream); }));
  }
  function disc(x, y, r, col) { x = Math.round(x); y = Math.round(y); cx.fillStyle = col; for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - dy * dy)); cx.fillRect(x - w, y + dy, 2 * w + 1, 1); } }
  function rc(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(Math.round(x), Math.round(y), w, h); }
  var GLYPH = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111", "+": "000010111010000", "-": "000000111000000" };
  function pxText(x, y, text, col) {
    x = Math.round(x - text.length * 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) for (var i = 0; i < text.length; i++) {
      var gl = GLYPH[text[i]]; if (!gl) continue;
      for (var k = 0; k < 15; k++) if (gl[k] === "1") { var px = x + i * 4 + (k % 3), py = y + Math.floor(k / 3); if (pass === 0) rc(px - 1, py - 1, 3, 3, C.black); else rc(px, py, 1, 1, col); }
    }
  }
  // lutins
  function drawPlayer(sx, sy) {
    var f = P.face, w = Math.floor(P.step) % 2, flash = P.hurt > 0 && ((now() / 80 | 0) % 2);
    if (flash) return;
    disc(sx, sy + 7, 4, "rgba(0,0,0,.25)");
    rc(sx - 3, sy + 3, 2, 4 + (w ? 0 : 1), "#2a3a8a"); rc(sx + 1, sy + 3, 2, 4 + (w ? 1 : 0), "#2a3a8a");       // jambes
    rc(sx - 4, sy - 3, 8, 7, C.black); rc(sx - 3, sy - 2, 6, 5, C.white); rc(sx - 3, sy + 1, 6, 1, "#9bd13a");   // buste
    rc(sx - 3, sy - 9, 6, 6, C.black); rc(sx - 2, sy - 8, 4, 4, "#f2c79a");                                       // tête
    rc(sx - 3, sy - 10, 6, 3, C.black); rc(sx - 2, sy - 10, 4, 2, C.red); rc(sx + (f > 0 ? 1 : -4), sy - 8, 3, 1, C.red);  // casquette
    rc(sx + (f > 0 ? 0 : -1), sy - 6, 1, 1, C.black);
    if (aim.on || aim.drag) { var cxl = sx + f * 6; rc(cxl, sy - 4, 1, 10, "#cdd2dc"); rc(cxl + (f > 0 ? 0 : -2), sy + 6, 3, 1, C.black); }
  }
  function drawSlime(s, sx, sy) {
    var sq = Math.round(Math.sin(s.bob) * 1);
    disc(sx, sy + 4, 4, "rgba(0,0,0,.25)");
    rc(sx - 5, sy - 3 - sq, 10, 8 + sq, C.black); rc(sx - 4, sy - 2 - sq, 8, 7 + sq, "#3fd05a"); rc(sx - 4, sy - 2 - sq, 8, 2, "#8cf08a");
    rc(sx - 3, sy - 0 - sq, 2, 2, C.black); rc(sx + 1, sy - 0 - sq, 2, 2, C.black); rc(sx - 3, sy - 0 - sq, 1, 1, C.white); rc(sx + 1, sy - 0 - sq, 1, 1, C.white);
  }
  function drawBird(o, sx, sy, big) {
    var w = ((now() / 120 | 0) % 2);
    if (big) {
      rc(sx - 8, sy - 2 + (w ? -2 : 1), 6, 3, C.black); rc(sx + 2, sy - 2 + (w ? -2 : 1), 6, 3, C.black);
      rc(sx - 7, sy - 1 + (w ? -2 : 1), 5, 1, "#8a5a2b"); rc(sx + 2, sy - 1 + (w ? -2 : 1), 5, 1, "#8a5a2b");
      rc(sx - 3, sy - 3, 6, 7, C.black); rc(sx - 2, sy - 2, 4, 5, "#a86a30"); rc(sx - 2, sy - 3, 4, 2, C.white); rc(sx - 1, sy - 1, 1, 1, C.black); rc(sx, sy + 3, 1, 2, C.yellow);
      rc(sx - 4, sy + 7, 8, 2, "rgba(0,0,0,.18)");
    } else {
      disc(sx, sy + 4, 2, "rgba(0,0,0,.25)");
      rc(sx - 3, sy - 3, 6, 6, C.black); rc(sx - 2, sy - 2, 4, 4, C.yellow); rc(sx - 4, sy - 2 + (w ? -1 : 1), 2, 2, C.yellow); rc(sx + 2, sy - 2 + (w ? -1 : 1), 2, 2, C.yellow); rc(sx + 1, sy - 1, 1, 1, C.black); rc(sx + 3, sy, 2, 1, C.orange);
    }
  }
  function drawNpc(n, sx, sy) {
    var cols = ["#6a4bd0", "#d0842a", "#2a8a6a", "#c0407a"], c = cols[n.d % 4];
    disc(sx, sy + 7, 4, "rgba(0,0,0,.25)");
    rc(sx - 4, sy - 2, 8, 9, C.black); rc(sx - 3, sy - 1, 6, 7, c); rc(sx - 3, sy + 3, 6, 1, "rgba(0,0,0,.25)");
    rc(sx - 3, sy - 9, 6, 7, C.black); rc(sx - 2, sy - 8, 4, 5, "#f2c79a"); rc(sx - 4, sy - 10, 8, 3, C.black); rc(sx - 3, sy - 10, 6, 2, c); rc(sx - 2, sy - 6, 1, 1, C.black); rc(sx + 1, sy - 6, 1, 1, C.black);
    if (Math.sin(now() / 400 + n.x) > 0.7) rc(sx + 4, sy - 12, 1, 3, C.white), rc(sx + 4, sy - 8, 1, 1, C.white);
  }
  function drawItem(it, sx, sy) {
    var bob = Math.round(Math.sin(now() / 250 + it.x) * 1.5);
    disc(sx, sy + 5, 3, "rgba(0,0,0,.25)");
    if (it.kind === "brake") { disc(sx, sy - 2 + bob, 5, C.black); disc(sx, sy - 2 + bob, 4, C.red); rc(sx - 3, sy - 3 + bob, 6, 2, C.white); }
    else { disc(sx, sy - 2 + bob, 5, C.black); disc(sx, sy - 2 + bob, 4, C.yellow); rc(sx - 1, sy - 5 + bob, 2, 6, C.brown); rc(sx - 3, sy - 3 + bob, 6, 2, C.brown); }
  }
  function drawBallAt(x, y, lift) {
    var bx = Math.round(x - cam.x), by = Math.round(y - cam.y);
    disc(bx + 1, by + 1, BALL_R, "rgba(0,0,0,.35)");
    disc(bx, by - (lift || 0), BALL_R + 1, C.black); disc(bx, by - (lift || 0), BALL_R, "#d8fff4");
    rc(bx - 1, by - 2 - (lift || 0), 1, 1, C.white); rc(bx + 1, by + 1 - (lift || 0), 1, 1, "#7cc8b8");
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    var portrait = ch > cw * 1.05;
    view.S = Math.max(2, Math.round(cw / 240));
    view.aw = Math.floor(cw / view.S); view.ah = Math.floor(ch / view.S);
    canvas.width = view.aw; canvas.height = view.ah;
    canvas.style.width = view.aw * view.S + "px"; canvas.style.height = view.ah * view.S + "px";
    canvas.style.left = Math.floor((cw - view.aw * view.S) / 2) + "px"; canvas.style.top = Math.floor((ch - view.ah * view.S) / 2) + "px";
    cx.imageSmoothingEnabled = false;
    view.lm = portrait ? 0 : Math.ceil(80 / view.S); view.tm = portrait ? Math.ceil(60 / view.S) : 0;
  }
  function draw(t) {
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = C.forest; cx.fillRect(0, 0, view.aw, view.ah);
    if (!grid) return;
    var camx = Math.round(cam.x), camy = Math.round(cam.y), tx0 = Math.floor(camx / TILE), ty0 = Math.floor(camy / TILE), tx1 = Math.floor((camx + view.aw) / TILE), ty1 = Math.floor((camy + view.ah) / TILE), x, y;
    for (y = ty0; y <= ty1; y++) for (x = tx0; x <= tx1; x++) {
      var tt = get(x, y);
      if (x < 0 || y < 0 || x >= W || y >= HH) tt = TY.TREE;
      var img;
      if ((tt === TY.CUP || tt === TY.HOLY) && S.cups[cupKey(x, y)]) img = cupDoneImg(tt === TY.HOLY); else img = tileImg(tt, x, y);
      cx.drawImage(img, x * TILE - camx, y * TILE - camy);
    }
    // drapeaux (étoffe animée)
    FEAT.flags.forEach(function (f, idx) {
      var c = center(f), sx = Math.round(c.x - camx), sy = Math.round(c.y - camy), w = (t / 220 | 0) % 2, on = S.cp === idx;
      if (sx < -20 || sx > view.aw + 20 || sy < -20 || sy > view.ah + 20) return;
      rc(sx, sy - 11, 1, 2, C.white); rc(sx + 1, sy - 11, 7 + w, 6, C.black); rc(sx + 1, sy - 10, 5 + w, 4, on ? C.yellow : C.red); rc(sx + 1, sy - 10, 5 + w, 1, on ? "#fff09a" : C.red2);
    });
    // lueur du temple quand tout est prêt
    if (S.pieces.every(function (p) { return p; })) { var tc = center(FEAT.temple), pul = 8 + Math.round(Math.sin(t / 200) * 2); cx.globalAlpha = 0.5; disc(tc.x - camx, tc.y - camy, pul, C.purple); cx.globalAlpha = 1; }
    // objets triés par profondeur
    var list = [];
    slimes.forEach(function (s) { if (s.alive) list.push({ y: s.y, f: function () { drawSlime(s, Math.round(s.x - camx), Math.round(s.y - camy)); } }); });
    npcs.forEach(function (n) { list.push({ y: n.y, f: function () { drawNpc(n, Math.round(n.x - camx), Math.round(n.y - camy)); } }); });
    items.forEach(function (it) { list.push({ y: it.y, f: function () { drawItem(it, Math.round(it.x - camx), Math.round(it.y - camy)); } }); });
    list.push({ y: P.y, f: function () { drawPlayer(Math.round(P.x - camx), Math.round(P.y - camy)); } });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) { o.f(); });
    drawBallAt(B.x, B.y, 0);
    birds.forEach(function (o) { drawBird(o, Math.round(o.x - camx), Math.round(o.y - camy - 6), false); });
    eagles.forEach(function (e) { if (e.alive) drawBird(e, Math.round(e.x - camx), Math.round(e.y - camy - 10), true); });
    // effets
    fx.forEach(function (f) {
      var sx = f.x - camx, sy = f.y - camy;
      if (f.k === "splash") { var u = f.t / 0.6; ring(sx, sy, 4 + u * 12, C.white, 1 - u); ring(sx, sy, 2 + u * 7, C.waterHi, 1 - u); }
      else { var u2 = f.t / 0.4; ring(sx, sy, 3 + u2 * 8, C.white, 1 - u2); }
    });
    floaters.forEach(function (f) { pxText(f.x - camx, f.y - camy, f.text, f.col); });
    // visée
    if (mode === "play" && nearBall()) {
      var ang = aim.ang, pw = aim.pow, show = false;
      if (aim.drag) { var ddx = aim.drag.sx - aim.drag.cx, ddy = aim.drag.sy - aim.drag.cy, dl = Math.sqrt(ddx * ddx + ddy * ddy); if (dl > 5) { ang = Math.atan2(ddy, ddx); pw = clamp((dl - 5) / 50, 0.05, 1); show = true; aim.ang = ang; aim.pow = pw; } }
      else if (aim.on) show = true;
      if (show) {
        var n = Math.max(2, Math.floor((10 + pw * 90) / 5)), col = "hsl(" + Math.round(120 - 120 * pw) + ",90%,55%)";
        for (var i = 1; i <= n; i++) { var dd = 6 + i * 5, px = B.x + Math.cos(ang) * dd - camx, py = B.y + Math.sin(ang) * dd - camy; disc(px, py, i === n ? 2 : 1, C.black); disc(px, py, i === n ? 1 : 0, i === n ? col : C.white); rc(px, py, 1, 1, i === n ? col : C.white); }
        hudPowerSet(pw, col);
      } else {
        var bob = Math.round(Math.sin(t / 240)), bx = Math.round(B.x - camx), by = Math.round(B.y - camy);
        rc(bx - 2, by - 11 + bob, 5, 3, C.black); rc(bx - 1, by - 10 + bob, 3, 1, C.white); rc(bx, by - 9 + bob, 1, 1, C.white);
      }
    }
    // message
    var m = msgText && now() < msgT ? msgText : "";
    if (m !== draw.shown) { draw.shown = m; hudMsg.textContent = m; hudMsg.hidden = !m; }
  }
  function ring(x, y, r, col, a) { cx.globalAlpha = Math.max(0, a); cx.fillStyle = col; var n = Math.max(12, Math.round(r * 5)); for (var i = 0; i < n; i++) { var an = i / n * 6.2832; cx.fillRect(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), 1, 1); } cx.globalAlpha = 1; }
  var powEl = $("[data-power]", root);
  function hudPowerSet(p, col) { if (powEl) { powEl.parentNode.style.setProperty("--p", Math.round(p * 100)); powEl.style.background = col || ""; } }

  /* =====================================================================
     BOUCLE
     ===================================================================== */
  var lastT = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    if (S && (mode === "play" || mode === "won")) {
      if (overlay.hidden || mode === "won") {
        acc += dt;
        while (acc >= STEP) { acc -= STEP; if (B.rolling) stepBall(STEP); }
        updateAll(dt);
      }
      var tgt = B.rolling ? B : P, tx = tgt.x - (view.lm + (view.aw - view.lm) / 2), ty = tgt.y - (view.tm + (view.ah - view.tm) / 2);
      tx = clamp(tx, 0, W * TILE - view.aw); ty = clamp(ty, 0, HH * TILE - view.ah);
      var k = Math.min(1, dt * (B.rolling ? 7 : 5));
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    } else if (S && grid) { /* menu : on laisse la dernière image */ }
    draw(ts);
  }

  /* =====================================================================
     SAISIE
     ===================================================================== */
  function artPos(ev) { var r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) / view.S, y: (ev.clientY - r.top) / view.S }; }
  canvas.addEventListener("pointerdown", function (ev) {
    if (mode !== "play" || !overlay.hidden) return;
    ac();
    var p = artPos(ev), touch = ev.pointerType !== "mouse";
    if (touch && p.x < view.aw * 0.5 && !joy.on) {
      joy.on = true; joy.id = ev.pointerId; joy.sx = ev.clientX; joy.sy = ev.clientY; joy.dx = joy.dy = 0;
      var r = stage.getBoundingClientRect(); joyEl.hidden = false; joyEl.style.left = (ev.clientX - r.left) + "px"; joyEl.style.top = (ev.clientY - r.top) + "px"; joyEl.firstElementChild.style.transform = "translate(0,0)";
    } else {
      if (!nearBall()) { setMsg(B.rolling ? "La balle roule…" : "Approche-toi de ta balle pour tirer.", 1400); return; }
      aim.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, id: ev.pointerId }; aim.on = false;
    }
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (joy.on && joy.id === ev.pointerId) {
      var dx = ev.clientX - joy.sx, dy = ev.clientY - joy.sy, l = Math.sqrt(dx * dx + dy * dy), m = 44;
      if (l > m) { dx = dx / l * m; dy = dy / l * m; l = m; }
      joy.dx = Math.abs(dx) < 6 && Math.abs(dy) < 6 ? 0 : dx / m; joy.dy = Math.abs(dx) < 6 && Math.abs(dy) < 6 ? 0 : dy / m;
      joyEl.firstElementChild.style.transform = "translate(" + dx + "px," + dy + "px)";
    } else if (aim.drag && aim.drag.id === ev.pointerId) { var p = artPos(ev); aim.drag.cx = p.x; aim.drag.cy = p.y; }
  });
  function endPtr(ev, fire) {
    if (joy.on && joy.id === ev.pointerId) { joy.on = false; joy.dx = joy.dy = 0; joyEl.hidden = true; return; }
    if (!aim.drag || aim.drag.id !== ev.pointerId) return;
    var d = aim.drag; aim.drag = null;
    if (!fire) return;
    var dx = d.sx - d.cx, dy = d.sy - d.cy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 5 && nearBall()) shoot(Math.atan2(dy, dx), clamp((l - 5) / 50, 0.05, 1));
  }
  canvas.addEventListener("pointerup", function (ev) { endPtr(ev, true); });
  canvas.addEventListener("pointercancel", function (ev) { endPtr(ev, false); });
  document.addEventListener("keydown", function (ev) {
    var tg = ev.target && ev.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "BUTTON") return;
    if (mode !== "play" || !overlay.hidden) return;
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].indexOf(k) >= 0) ev.preventDefault();
    ac();
    if (k === " " || k === "Enter") {
      if (B.rolling) { if (S.items.brake) B.brake = 0.7; return; }
      if (!aim.on) { if (nearBall()) { aim.on = true; aim.ang = Math.atan2(B.y - P.y, B.x - P.x); aim.pow = 0.55; } else setMsg("Approche-toi de ta balle (flèches / ZQSD), puis Espace.", 1800); }
      else shoot(aim.ang, aim.pow);
      return;
    }
    if (k === "b") { if (B.rolling && S.items.brake) B.brake = 0.7; return; }
    if (k === "Escape") { aim.on = false; return; }
    if (aim.on) {
      var fine = ev.shiftKey ? 0.2 : 1;
      if (k === "ArrowLeft" || k === "a" || k === "q") aim.ang -= 0.05 * fine; else if (k === "ArrowRight" || k === "d") aim.ang += 0.05 * fine;
      else if (k === "ArrowUp" || k === "w" || k === "z") aim.pow = clamp(aim.pow + 0.04, 0.05, 1); else if (k === "ArrowDown" || k === "s") aim.pow = clamp(aim.pow - 0.04, 0.05, 1);
      return;
    }
    keys[k] = true;
  });
  document.addEventListener("keyup", function (ev) { var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; keys[k] = false; });
  window.addEventListener("blur", function () { keys = {}; });
  brakeBtn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); if (B.rolling && S && S.items.brake) B.brake = 0.7; ev.preventDefault(); });
  hudDlg.addEventListener("pointerdown", function () { hudDlg.hidden = true; dlgT = 0; });
  window.addEventListener("resize", resize);

  /* =====================================================================
     HUD ET ÉCRANS
     ===================================================================== */
  function hudUpdate() {
    if (!S) return;
    hudStrokes.textContent = strokes; hudMax.textContent = "/" + maxStrokes();
    hudStrokes.parentNode.classList.toggle("low", strokes <= 5);
    $$("[data-item]", root).forEach(function (el) { el.classList.toggle("on", !!S.items[el.dataset.item]); });
    $$("[data-piece]", root).forEach(function (el, i) { el.classList.toggle("on", !!S.pieces[i]); });
  }
  function showCard(html, cls) { cardEl.className = "panel game-card ga-card" + (cls ? " " + cls : ""); cardEl.innerHTML = html; overlay.hidden = false; }
  function closeCard() { overlay.hidden = true; }
  function fmtTime(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return m + " min " + ("0" + (s % 60)).slice(-2) + " s"; }
  function showMenu() {
    var sv = loadSave();
    var info = sv ? "<p class=\"ga-best\">Partie en cours : <strong>" + (sv.pieces.reduce(function (a, b) { return a + b; }, 0)) + "/4</strong> Morceaux de Tee · " + (BASE_STROKES + CLUB_BONUS * sv.clubs) + " coups max · " + fmtTime(sv.ms) + "</p>" : "";
    showCard("<h2>⛳ Golfaventure</h2><p>Une aventure de golf : tes <strong>coups</strong> sont ta vie. Explore le monde, frappe les drapeaux pour sauvegarder, évite l'eau et le sable, et rapporte les <strong>4 Morceaux de Tee</strong> au temple.</p>" + info +
      '<div class="ga-stack">' + (sv ? '<button class="btn" type="button" data-act="continue">▶ Continuer</button>' : "") +
      '<button class="btn ' + (sv ? "btn-ghost" : "") + '" type="button" data-act="new">' + (sv ? "Nouvelle partie" : "▶ Nouvelle partie") + "</button></div>" +
      '<p class="game-small"><label><input type="checkbox" data-sound ' + (soundOn ? "checked" : "") + "> Sons</label></p>");
  }
  function showWin() {
    showCard("<h2>🏆 Le Tee est reconstitué !</h2><p>Tu as rapporté les quatre Morceaux de Tee au temple.</p><p><strong>" + fmtTime(S.ms) + "</strong> · " + S.shots + " coups joués · " + S.deaths + " retour(s) au drapeau · " + (BASE_STROKES + CLUB_BONUS * S.clubs) + " coups max</p>" +
      '<div class="btn-row center"><button class="btn" type="button" data-act="new">↻ Nouvelle partie</button><button class="btn btn-ghost btn-small" type="button" data-act="keep">Continuer à explorer</button></div>');
  }
  cardEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]"); if (!b) return; ac();
    var a = b.dataset.act;
    if (a === "new") startGame(true); else if (a === "continue") startGame(false);
    else if (a === "keep") { mode = "play"; closeCard(); }
  });
  cardEl.addEventListener("change", function (ev) { if (ev.target.matches("[data-sound]")) { soundOn = ev.target.checked; save("golfaventure-sound", soundOn); } });
  var headMenu = $("[data-ga-menu]");
  if (headMenu) headMenu.addEventListener("click", function () { if (!S) return; showMenu(); });

  /* =====================================================================
     DÉMARRAGE
     ===================================================================== */
  resize();
  grid = buildWorld(); S = loadSave() || newSave();   // décor du menu
  cam.x = FEAT.flags[0][0] * TILE - view.aw / 2; cam.y = FEAT.flags[0][1] * TILE - view.ah / 2;
  requestAnimationFrame(frame);
  showMenu();
  if (/[?&]debug/.test(location.search)) window.GA_DEBUG = {
    S: function () { return S; }, P: P, B: B, grid: function () { return grid; }, W: W, H: HH, FEAT: FEAT, TY: TY, start: startGame, shoot: shoot, strokes: function () { return strokes; },
    step: function (n) { for (var i = 0; i < n; i++) if (B.rolling) stepBall(STEP); }, setStrokes: function (n) { strokes = n; hudUpdate(); }, update: updateAll, mode: function () { return mode; }, walkSolid: walkSolid, blockedAt: blockedAt, slimes: function () { return slimes; },
  };
})();
