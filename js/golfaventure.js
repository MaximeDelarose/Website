/* =========================================================================
   Golfaventure — aventure de golf en vue du dessus (hommage, solo)
   -------------------------------------------------------------------------
   Tu ES la balle : on la lance comme au lance-pierre, et les COUPS sont une
   ressource : on démarre avec 20 coups, chaque tir en coûte un, les drapeaux
   sont des points de sauvegarde qui rendent tous les coups, chaque trou
   gagné (club) ajoute 3 coups au maximum, les slimes (+4), les oiseaux (+5),
   les chauves-souris (+6) et les aigles (+10) en rendent quand tu les
   percutes en roulant (à l'arrêt, ils te font perdre un coup). Quatre trous
   dorés cachent les Morceaux de Tee à rapporter au temple.
   Deux niveaux : le monde (96 × 64 tuiles de 16 px, buildOverworld) et un
   souterrain (56 × 36, buildCave), reliés par des passages (PORTAL). Image en
   pixel art (1 pixel = 1 unité du monde), agrandie sans lissage.
   Sauvegarde : localStorage « golfaventure-v3 ».
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-ga]");
  if (!root) return;
  var VERSION = "2.0.0";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return Date.now(); }
  function hash(x, y, s) { var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }

  /* =====================================================================
     RÉGLAGES
     ===================================================================== */
  var TILE = 16;
  var BALL_R = 4, CUP_R = 6;
  var BASE_STROKES = 20, CLUB_BONUS = 3;
  var VMAX = 330, DEC = 150, SLOPE = 120, STEP = 1 / 240;
  var TY = { GRASS: 0, ROUGH: 1, SAND: 2, WATER: 3, TREE: 4, RAIL: 5, BUSH: 6, UP: 7, DOWN: 8, LEFT: 9, RIGHT: 10, PLATEAU: 11, BRIDGE: 12, FLAG: 13, CUP: 14, HOLY: 15, TEMPLE: 16, GATE: 17, CFLOOR: 18, CWALL: 19, PORTAL: 20, SW0: 21, SW1: 22, SW2: 23, DR0: 24, DR1: 25, DR2: 26, KDOOR: 27, CRACK: 28, ICE: 29, BUMP: 30 };
  var BALL_SOLID = {}; BALL_SOLID[TY.TREE] = 1; BALL_SOLID[TY.RAIL] = 1; BALL_SOLID[TY.BUSH] = 1; BALL_SOLID[TY.GATE] = 1; BALL_SOLID[TY.CWALL] = 1;
  var BOUNCE = {}; BOUNCE[TY.TREE] = 0.5; BOUNCE[TY.RAIL] = 0.85; BOUNCE[TY.BUSH] = 0.5; BOUNCE[TY.GATE] = 0.85; BOUNCE[TY.CWALL] = 0.7;
  [TY.DR0, TY.DR1, TY.DR2, TY.KDOOR, TY.CRACK].forEach(function (t) { BALL_SOLID[t] = 1; BOUNCE[t] = 0.8; });
  var SW_COL = ["#d8322b", "#3a74e0", "#3fd05a"];
  var DIALOGS = [
    "Bienvenue, boule ! Tire en arrière comme un lance-pierre, puis lâche. Chaque tir coûte 1 coup.",
    "Touche un drapeau en roulant : il sauvegarde ta position et te rend tous tes coups.",
    "Quatre Morceaux de Tee dorment dans des trous dorés. Rapporte-les au temple, tout au nord.",
    "Les slimes et les oiseaux te rendent des coups si tu les percutes en roulant. Les buissons cachent des oiseaux !",
    "Le souterrain cache des trous, des chauves-souris et une bouée. Roule doucement dans le passage sombre pour descendre.",
    "Une roche fissurée ne cède qu'à un tir puissant… et il faut le bon club pour ça. Cherche-le dans le donjon de la forêt.",
    "Frappe l'interrupteur coloré avec ta balle : toutes les portes de la même couleur s'ouvrent. Les clés ouvrent les portes à serrure.",
    "Deux courants contraires se rejoignent au milieu du champ de flèches… laisse-toi porter.",
  ];

  /* =====================================================================
     NIVEAUX
     ===================================================================== */
  function Builder(Wd, Hd, base) {
    var g = new Uint8Array(Wd * Hd); g.fill(base);
    var o = { W: Wd, H: Hd, g: g, out: base === TY.CWALL ? TY.CWALL : TY.TREE };
    o.set = function (x, y, t) { if (x >= 0 && y >= 0 && x < Wd && y < Hd) g[y * Wd + x] = t; };
    o.get = function (x, y) { return (x < 0 || y < 0 || x >= Wd || y >= Hd) ? o.out : g[y * Wd + x]; };
    o.rect = function (x1, y1, x2, y2, t) { for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) o.set(x, y, t); };
    o.frame = function (x1, y1, x2, y2, t) { o.rect(x1, y1, x2, y1, t); o.rect(x1, y2, x2, y2, t); o.rect(x1, y1, x1, y2, t); o.rect(x2, y1, x2, y2, t); };
    o.ellipse = function (cx, cy, rx, ry, t, only) {
      for (var y = cy - ry; y <= cy + ry; y++) for (var x = cx - rx; x <= cx + rx; x++)
        if ((x - cx) * (x - cx) / (rx * rx) + (y - cy) * (y - cy) / (ry * ry) <= 1 && (only == null || o.get(x, y) === only)) o.set(x, y, t);
    };
    o.scatter = function (x1, y1, x2, y2, t, p, seed, only) {
      for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) if (o.get(x, y) === only && hash(x, y, seed) < p) o.set(x, y, t);
    };
    return o;
  }

  function buildOverworld() {
    var b = Builder(96, 64, TY.GRASS), W = 96, HH = 64;
    var feat = {
      flags: [[8, 52], [18, 30], [48, 50], [68, 44], [60, 20], [47, 21]],
      cups: [[24, 46], [40, 57], [28, 14], [72, 30], [64, 9], [12, 8]],
      holy: [[48, 30, 1], [86, 54, 2], [86, 8, 3]],
      temple: [47, 8],
      gates: [[46, 18], [47, 18], [48, 18]],
      npcs: [[11, 52, 0], [19, 31, 1], [50, 49, 2], [67, 45, 5], [29, 41, 4], [62, 10, 7], [41, 16, 6]],
      items: [[36, 50, "brake"]],
      slimes: [[14, 46], [22, 42], [26, 54], [10, 36], [18, 26], [26, 22], [40, 48], [56, 56], [52, 44], [70, 40], [78, 34], [74, 50], [64, 15], [88, 21], [20, 12], [30, 38]],
      eagles: [{ y: 27, x1: 36, x2: 60, sp: 34 }, { y: 38, x1: 66, x2: 90, sp: 40 }, { y: 5, x1: 58, x2: 90, sp: 36 }],
      bats: [],
      portals: [{ x: 30, y: 44, to: 1, tx: 4, ty: 19 }, { x: 63, y: 52, to: 1, tx: 51, ty: 19 }, { x: 22, y: 9, to: 2, tx: 4, ty: 19 }],
      puz: [[71, 15, "SW2"], [41, 14, "SW0"]],
    };
    // forêt (nord-ouest)
    b.scatter(2, 2, 32, 36, TY.TREE, 0.5, 1, TY.GRASS);
    b.scatter(2, 2, 32, 36, TY.BUSH, 0.05, 2, TY.GRASS);
    b.rect(10, 5, 14, 11, TY.GRASS); b.rect(14, 8, 28, 10, TY.GRASS); b.rect(26, 12, 30, 16, TY.GRASS); b.rect(28, 10, 29, 20, TY.GRASS);
    b.rect(7, 20, 9, 40, TY.GRASS); b.rect(8, 29, 20, 30, TY.GRASS); b.rect(16, 27, 20, 33, TY.GRASS);
    // désert (est)
    b.rect(64, 24, 92, 60, TY.SAND);
    b.scatter(64, 24, 92, 60, TY.ROUGH, 0.07, 3, TY.SAND);
    b.scatter(64, 24, 92, 60, TY.TREE, 0.025, 4, TY.SAND);
    b.rect(66, 42, 70, 46, TY.GRASS); b.rect(70, 28, 74, 32, TY.GRASS);
    b.frame(79, 49, 91, 59, TY.RAIL); b.rect(80, 50, 90, 58, TY.SAND);
    // montagne (nord-est) : le champ de courants et la salle du trou doré
    b.scatter(56, 4, 92, 22, TY.TREE, 0.05, 5, TY.GRASS);
    b.rect(62, 7, 90, 9, TY.GRASS);
    b.frame(80, 4, 90, 10, TY.RAIL); b.rect(81, 5, 89, 9, TY.GRASS);
    b.rect(66, 12, 70, 18, TY.RIGHT); b.rect(72, 12, 76, 18, TY.LEFT); b.rect(71, 12, 71, 18, TY.GRASS);
    b.frame(65, 11, 77, 19, TY.RAIL); b.set(66, 19, TY.GRASS); b.set(67, 19, TY.GRASS);
    b.rect(84, 12, 90, 18, TY.PLATEAU);
    // bande centrale (est-ouest)
    b.rect(2, 20, 92, 22, TY.GRASS);
    // lac, île et pont
    b.ellipse(48, 32, 14, 9, TY.WATER);
    b.ellipse(48, 32, 3, 3, TY.GRASS);
    for (var bx = 33; bx <= 63; bx++) for (var by = 32; by <= 33; by++) if (b.get(bx, by) === TY.WATER) b.set(bx, by, TY.BRIDGE);
    // temple
    b.frame(38, 4, 56, 18, TY.RAIL); b.rect(39, 5, 55, 17, TY.PLATEAU); b.rect(44, 19, 50, 22, TY.GRASS);
    b.frame(43, 6, 51, 12, TY.RAIL); b.rect(44, 7, 50, 11, TY.GRASS);
    // pré de départ et rive sud
    b.scatter(3, 40, 31, 61, TY.TREE, 0.02, 6, TY.GRASS); b.scatter(3, 40, 31, 61, TY.BUSH, 0.025, 7, TY.GRASS);
    b.scatter(33, 42, 63, 60, TY.TREE, 0.02, 8, TY.GRASS); b.scatter(33, 42, 63, 60, TY.BUSH, 0.025, 9, TY.GRASS);
    b.ellipse(18, 56, 4, 2, TY.ROUGH); b.ellipse(26, 50, 3, 2, TY.ROUGH); b.ellipse(56, 52, 3, 2, TY.SAND); b.ellipse(36, 52, 3, 2, TY.SAND); b.ellipse(44, 45, 3, 1, TY.ROUGH);
    // bordure de forêt
    b.rect(0, 0, W - 1, 1, TY.TREE); b.rect(0, HH - 2, W - 1, HH - 1, TY.TREE); b.rect(0, 0, 1, HH - 1, TY.TREE); b.rect(W - 2, 0, W - 1, HH - 1, TY.TREE);
    function clear(x, y, r) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) { var t = b.get(xx, yy); if (t === TY.TREE || t === TY.BUSH || t === TY.ROUGH) b.set(xx, yy, TY.GRASS); } }
    feat.flags.forEach(function (f) { clear(f[0], f[1], 2); b.set(f[0], f[1], TY.FLAG); });
    feat.cups.forEach(function (f) { clear(f[0], f[1], 2); b.set(f[0], f[1], TY.CUP); });
    feat.holy.forEach(function (f) { clear(f[0], f[1], 2); b.set(f[0], f[1], TY.HOLY); });
    feat.portals.forEach(function (f) { clear(f.x, f.y, 2); b.set(f.x, f.y, TY.PORTAL); });
    b.set(feat.temple[0], feat.temple[1], TY.TEMPLE);
    feat.gates.forEach(function (f) { b.set(f[0], f[1], TY.GATE); });
    [feat.npcs, feat.items, feat.slimes].forEach(function (l) { l.forEach(function (f) { clear(f[0], f[1], 1); }); });
    // puzzles : fissures du désert, porte verte de la montagne, porte rouge du temple, bumpers
    b.set(79, 53, TY.CRACK); b.set(79, 54, TY.CRACK);
    b.set(80, 7, TY.DR2); b.set(80, 8, TY.DR2);
    b.set(46, 12, TY.DR0); b.set(47, 12, TY.DR0); b.set(48, 12, TY.DR0);
    feat.puz.forEach(function (p) { b.set(p[0], p[1], TY[p[2]]); });
    [[68, 14], [74, 17], [45, 15], [49, 15], [68, 17]].forEach(function (p) { b.set(p[0], p[1], TY.BUMP); });
    return { W: W, H: HH, grid: b.g, feat: feat, out: TY.TREE, dark: false };
  }

  function buildCave() {
    var b = Builder(56, 36, TY.CWALL);
    var feat = {
      flags: [[8, 19], [46, 19]],
      cups: [[23, 10], [20, 32], [50, 14]],
      holy: [], temple: null, gates: [],
      npcs: [[10, 22, 2]],
      items: [[26, 28, "float"]],
      slimes: [[6, 16], [24, 28], [28, 31], [44, 22], [48, 16]],
      eagles: [],
      bats: [[22, 5], [30, 9], [26, 30], [48, 24], [14, 12], [15, 26]],
      portals: [{ x: 4, y: 19, to: 0, tx: 30, ty: 44 }, { x: 51, y: 19, to: 0, tx: 63, ty: 52 }],
    };
    // salles et couloirs
    b.rect(2, 14, 12, 24, TY.CFLOOR); b.rect(18, 2, 34, 12, TY.CFLOOR); b.rect(18, 26, 34, 34, TY.CFLOOR); b.rect(40, 12, 53, 26, TY.CFLOOR);
    b.rect(12, 18, 14, 19, TY.CFLOOR); b.rect(14, 7, 16, 30, TY.CFLOOR); b.rect(16, 6, 18, 7, TY.CFLOOR); b.rect(16, 29, 18, 30, TY.CFLOOR);
    b.rect(34, 8, 38, 9, TY.CFLOOR); b.rect(38, 8, 39, 21, TY.CFLOOR); b.rect(38, 20, 40, 21, TY.CFLOOR);
    b.rect(34, 30, 44, 31, TY.CFLOOR); b.rect(44, 26, 45, 31, TY.CFLOOR);
    // piliers de roche
    [[2, 14, 12, 24], [18, 2, 34, 12], [18, 26, 34, 34], [40, 12, 53, 26]].forEach(function (r, i) { b.scatter(r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 1, TY.CWALL, 0.05, 20 + i, TY.CFLOOR); });
    // salle de l'eau
    b.ellipse(26, 7, 5, 3, TY.WATER);
    for (var x = 20; x <= 32; x++) for (var y = 7; y <= 8; y++) if (b.get(x, y) === TY.WATER) b.set(x, y, TY.BRIDGE);
    // salle du sable
    b.ellipse(26, 31, 6, 2, TY.SAND);
    b.rect(21, 27, 23, 29, TY.RIGHT); b.rect(29, 27, 31, 29, TY.LEFT);
    // grande salle de l'est
    b.rect(48, 21, 52, 25, TY.UP); b.frame(42, 14, 47, 17, TY.RAIL); b.set(44, 17, TY.CFLOOR); b.set(45, 17, TY.CFLOOR);
    function clear(x, y, r) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) { var t = b.get(xx, yy); if (t === TY.CWALL || t === TY.RAIL) b.set(xx, yy, TY.CFLOOR); } }
    feat.flags.forEach(function (f) { clear(f[0], f[1], 1); b.set(f[0], f[1], TY.FLAG); });
    feat.cups.forEach(function (f) { clear(f[0], f[1], 1); b.set(f[0], f[1], TY.CUP); });
    feat.portals.forEach(function (f) { clear(f.x, f.y, 2); b.set(f.x, f.y, TY.PORTAL); });
    [feat.npcs, feat.items, feat.slimes, feat.bats].forEach(function (l) { l.forEach(function (f) { clear(f[0], f[1], 1); }); });
    return { W: 56, H: 36, grid: b.g, feat: feat, out: TY.CWALL, dark: true };
  }

  // Donjon des Racines : interrupteur rouge, salle de glace (bleu), clé, Roi Slime (vert)
  function buildDungeon() {
    var b = Builder(48, 40, TY.CWALL);
    var feat = {
      flags: [[8, 19], [36, 22], [44, 4]],
      cups: [[4, 22], [29, 22], [42, 16]],
      holy: [[24, 4, 0]], temple: null, gates: [],
      npcs: [[6, 22, 6]],
      items: [[39, 19, "key"], [25, 6, "power"]],
      slimes: [[6, 16], [35, 23]],
      eagles: [],
      bats: [[36, 16], [42, 22]],
      boss: { x: 38, y: 4 },
      portals: [{ x: 4, y: 19, to: 0, tx: 22, ty: 10 }],
      puz: [[10, 9, "SW0"], [22, 12, "SW1"]],
    };
    var F = TY.CFLOOR;
    b.rect(2, 14, 12, 24, F);                                   // entrée
    b.rect(8, 8, 12, 12, F); b.rect(10, 13, 10, 13, F);         // alcôve de l'interrupteur rouge
    b.rect(13, 18, 14, 19, F);                                  // couloir (porte rouge)
    b.rect(15, 14, 30, 24, TY.ICE); b.rect(22, 12, 22, 13, F);  // salle de glace + alcôve bleue
    b.rect(31, 18, 32, 19, F);                                  // couloir (porte bleue)
    b.rect(33, 14, 45, 24, F);                                  // salle des clés
    b.rect(39, 8, 39, 13, F);                                   // couloir à serrure
    b.rect(30, 2, 46, 7, F);                                    // salle du boss
    b.rect(28, 4, 29, 5, F); b.rect(22, 3, 27, 6, F);           // trésor (porte verte)
    // roches de la glace : elles servent d'arrêts et de rebonds
    [[19, 17], [19, 21], [24, 16], [24, 22], [27, 19], [17, 15]].forEach(function (p) { b.set(p[0], p[1], TY.CWALL); });
    function clear(x, y, r) { for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) { var t = b.get(xx, yy); if (t === TY.CWALL) b.set(xx, yy, F); } }
    feat.flags.forEach(function (f) { clear(f[0], f[1], 1); b.set(f[0], f[1], TY.FLAG); });
    feat.cups.forEach(function (f) { clear(f[0], f[1], 1); b.set(f[0], f[1], TY.CUP); });
    feat.holy.forEach(function (f) { b.set(f[0], f[1], TY.HOLY); });
    feat.portals.forEach(function (f) { b.set(f.x, f.y, TY.PORTAL); });
    feat.puz.forEach(function (p) { b.set(p[0], p[1], TY[p[2]]); });
    b.set(13, 18, TY.DR0); b.set(13, 19, TY.DR0);               // porte rouge
    b.set(31, 18, TY.DR1); b.set(31, 19, TY.DR1);               // porte bleue
    b.set(39, 11, TY.KDOOR);                                    // serrure
    b.set(29, 4, TY.DR2); b.set(29, 5, TY.DR2);                 // porte verte (ouverte par le boss)
    b.set(10, 17, TY.BUMP); b.set(39, 16, TY.BUMP); b.set(35, 20, TY.BUMP);
    return { W: 48, H: 40, grid: b.g, feat: feat, out: TY.CWALL, dark: true };
  }

  /* =====================================================================
     ÉTAT ET SAUVEGARDE
     ===================================================================== */
  var SAVE_KEY = "golfaventure-v3";
  var S = null;           // progression (sauvegardée)
  function newSave() { return { clubs: 0, pieces: [0, 0, 0, 0], cups: {}, cp: { l: 0, i: 0 }, items: { brake: 0, power: 0, float: 0 }, bushes: {}, taken: {}, sw: {}, opened: {}, boss: {}, keys: 0, deaths: 0, shots: 0, ms: 0, won: false }; }
  function loadSave() { var s = load(SAVE_KEY, null); if (!s || !s.pieces || !s.cp || typeof s.cp !== "object") return null; var d = newSave(); for (var k in d) if (s[k] == null) s[k] = d[k]; return s; }
  function persist() { if (S) save(SAVE_KEY, S); }
  function maxStrokes() { return BASE_STROKES + CLUB_BONUS * S.clubs; }

  var LV = [], L = null, lvIdx = 0, grid = null, boss = null;
  var B = { x: 0, y: 0, vx: 0, vy: 0, rolling: false, rest: { x: 0, y: 0 }, brake: 0, pcool: 0, hurt: 0, fx: 1, fy: 0 };
  var strokes = 20, mode = "menu";   // menu | play | won
  var slimes = [], bats = [], birds = [], eagles = [], npcs = [], items = [], fx = [], floaters = [];
  var cam = { x: 0, y: 0 };
  var aim = { on: false, ang: 0, pow: 0.55, drag: null };
  var keyMsgT = 0, outTimer = 0, msgText = "", msgT = 0, dlgT = 0, lastNpc = -1;

  var stage = $("[data-stage]", root), canvas = $("[data-canvas]", root), cx = canvas.getContext("2d");
  var overlay = $("[data-overlay]", root), cardEl = $("[data-card]", root);
  var hudBar = $("[data-hud]", root), hudStrokes = $("[data-strokes]", root), hudMax = $("[data-max]", root), hudMsg = $("[data-msg]", root), hudDlg = $("[data-dialog]", root);
  var brakeBtn = $("[data-brake]", root), powEl = $("[data-power]", root);
  var cw = 0, ch = 0;
  var view = { aw: 0, ah: 0, S: 3, lm: 0, tm: 0 };

  function get(tx, ty) { return (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) ? L.out : grid[ty * L.W + tx]; }
  function tileAt(x, y) { return get(Math.floor(x / TILE), Math.floor(y / TILE)); }
  function center(f) { return { x: f[0] * TILE + 8, y: f[1] * TILE + 8 }; }
  function cupKey(tx, ty) { return lvIdx + ":" + tx + "," + ty; }

  function setMsg(t, ms) { msgText = t; msgT = now() + (ms || 2200); }
  function floatText(x, y, text, col) { floaters.push({ x: x, y: y, t: 0, text: text, col: col || "#ffffff" }); }
  function addStrokes(n) { strokes = Math.min(maxStrokes(), strokes + n); hudUpdate(); }
  function allPieces() { return S.pieces[0] && S.pieces[1] && S.pieces[2] && S.pieces[3]; }

  // applique la progression (interrupteurs pressés, serrures et fissures ouvertes) au décor
  function applyLevelState(i) {
    var l = LV[i], fl = l.dark ? TY.CFLOOR : TY.GRASS;
    for (var k = 0; k < l.grid.length; k++) {
      var t = l.grid[k];
      if (t >= TY.DR0 && t <= TY.DR2 && S.sw[i + ":" + (t - TY.DR0)]) l.grid[k] = fl;
      else if ((t === TY.KDOOR || t === TY.CRACK) && S.opened[i + ":" + k]) l.grid[k] = fl;
    }
    dirty();
  }
  function pressSwitch(color, x, y) {
    var key = lvIdx + ":" + color;
    if (S.sw[key]) return;
    S.sw[key] = 1; applyLevelState(lvIdx); sfx("switch"); persist();
    fx.push({ k: "puff", x: x, y: y, t: 0 });
    setMsg("Un mécanisme s'active ! Une porte s'ouvre quelque part…", 3000);
  }
  function openTile(tx, ty, why) {
    var i = ty * L.W + tx; grid[i] = L.dark ? TY.CFLOOR : TY.GRASS; S.opened[lvIdx + ":" + i] = 1; persist(); dirty();
    fx.push({ k: "puff", x: tx * TILE + 8, y: ty * TILE + 8, t: 0 });
    sfx(why === "key" ? "key" : "crack");
  }
  // entre dans un niveau : décor, ennemis, objets
  function enterLevel(i) {
    lvIdx = i; L = LV[i]; grid = L.grid;
    var f = L.feat;
    slimes = f.slimes.map(function (s) { var c = center(s); return { x: c.x, y: c.y, dx: 0, dy: 0, t: Math.random() * 2, alive: true, cd: 0, bob: Math.random() * 6 }; });
    bats = f.bats.map(function (s, k) { var c = center(s); return { x: c.x, y: c.y, vx: 0, vy: 0, t: 0, alive: true, cd: 0, ph: k * 1.7, back: 0 }; });
    eagles = f.eagles.map(function (e, k) { return { x: e.x1 * TILE + (k * 90) % ((e.x2 - e.x1) * TILE), y: e.y * TILE + 8, dir: 1, x1: e.x1 * TILE, x2: e.x2 * TILE, sp: e.sp, alive: true, back: 0 }; });
    npcs = f.npcs.map(function (n) { var c = center(n); return { x: c.x, y: c.y, d: n[2] }; });
    items = f.items.filter(function (it) { return !S.taken[takeKey(it)]; }).map(function (it) { var c = center(it); return { x: c.x, y: c.y, kind: it[2], tk: takeKey(it) }; });
    boss = f.boss && !S.boss[i] ? { x: f.boss.x * TILE + 8, y: f.boss.y * TILE + 8, hp: 3, flash: 0, cd: 0, t: 0, dx: 0, dy: 0, bob: 0 } : null;
    birds = []; fx = []; floaters = []; lastNpc = -1; aim.on = false; aim.drag = null;
  }
  function takeKey(it) { return it[2] === "key" ? lvIdx + ":" + it[0] + "," + it[1] : it[2]; }
  function placeBall(x, y) { B.x = x; B.y = y; B.vx = B.vy = 0; B.rolling = false; B.brake = 0; B.rest = { x: x, y: y }; faceTarget(); }
  function startGame(fresh) {
    S = fresh ? newSave() : (loadSave() || newSave());
    LV = [buildOverworld(), buildCave(), buildDungeon()];
    Object.keys(S.bushes).forEach(function (k) { var p = k.split(":"); if (LV[+p[0]]) LV[+p[0]].grid[+p[1]] = TY.GRASS; });
    if (allPieces()) LV[0].feat.gates.forEach(function (f) { LV[0].grid[f[1] * LV[0].W + f[0]] = TY.GRASS; });
    LV.forEach(function (l, i) { applyLevelState(i); });
    enterLevel(S.cp.l);
    var f = center(L.feat.flags[S.cp.i]);
    strokes = maxStrokes(); outTimer = 0; B.pcool = 0; B.hurt = 0;
    placeBall(f.x + 9, f.y + 11);
    mode = "play";
    cam.x = B.x - view.aw / 2; cam.y = B.y - view.ah / 2;
    closeCard(); hudUpdate(); hudBar.hidden = false;
    setMsg(fresh ? "Aventure : trouve les 4 Morceaux de Tee !" : "Bon retour, boule !", 2600);
    persist();
  }
  // oriente le tir vers le trou (ou le drapeau) non fini le plus proche
  function faceTarget() {
    var best = null, bd = 1e9, f = L.feat;
    f.cups.concat(f.holy).forEach(function (c) { if (S.cups[cupKey(c[0], c[1])]) return; var d = dist(c[0] * TILE + 8, c[1] * TILE + 8, B.x, B.y); if (d < bd) { bd = d; best = c; } });
    if (!best) best = f.flags[0];
    aim.ang = Math.atan2(best[1] * TILE + 8 - B.y, best[0] * TILE + 8 - B.x); aim.pow = 0.55; aim.on = false;
    B.fx = Math.cos(aim.ang); B.fy = Math.sin(aim.ang);
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
    else if (n === "switch") { tone(0, 330, 0.1, 0.16, "square"); tone(0.1, 440, 0.1, 0.16, "square"); tone(0.2, 660, 0.25, 0.16, "square"); }
    else if (n === "key") { tone(0, 880, 0.08, 0.14, "triangle"); tone(0.08, 1320, 0.2, 0.14, "triangle"); }
    else if (n === "crack") { tone(0, 120, 0.25, 0.2, "sawtooth", 40); tone(0.02, 300, 0.1, 0.12, "square", 80); }
    else if (n === "bump") tone(0, 420, 0.1, 0.14, "sine", 760);
    else if (n === "boss") { tone(0, 160, 0.3, 0.2, "sawtooth", 50); tone(0.15, 240, 0.2, 0.16, "square", 90); }
    else if (n === "portal") { tone(0, 500, 0.3, 0.14, "triangle", 120); tone(0.12, 300, 0.3, 0.1, "triangle", 90); }
  }

  /* =====================================================================
     PHYSIQUE DE LA BALLE
     ===================================================================== */
  function speedOf(b) { return Math.sqrt(b.vx * b.vx + b.vy * b.vy); }
  function breakBush(tx, ty) {
    var i = ty * L.W + tx; grid[i] = TY.GRASS; S.bushes[lvIdx + ":" + i] = 1; sfx("bush"); dirty();
    fx.push({ k: "puff", x: tx * TILE + 8, y: ty * TILE + 8, t: 0 });
    if (hash(tx, ty, 77) < 0.5) birds.push({ x: tx * TILE + 8, y: ty * TILE + 8, t: 0, life: 7, vx: 0, vy: 0, tt: 0 });
    persist();
  }
  function collideTiles(b) {
    var tx0 = Math.floor((b.x - BALL_R) / TILE), tx1 = Math.floor((b.x + BALL_R) / TILE), ty0 = Math.floor((b.y - BALL_R) / TILE), ty1 = Math.floor((b.y + BALL_R) / TILE), hit = 0;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var t = get(tx, ty);
      if (t === TY.BUMP) {   // bumper rond : renvoie la balle avec un coup de pouce
        var bcx = tx * TILE + 8, bcy = ty * TILE + 8, bdx = b.x - bcx, bdy = b.y - bcy, bd = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bd < 7 + BALL_R) {
          bd = bd || 0.01; var bnx = bdx / bd, bny = bdy / bd; b.x = bcx + bnx * (7 + BALL_R);
          b.y = bcy + bny * (7 + BALL_R); var bvn = b.vx * bnx + b.vy * bny;
          if (bvn < 0) { b.vx -= 2.2 * bvn * bnx; b.vy -= 2.2 * bvn * bny; } var bsp = speedOf(b); if (bsp < 90) { b.vx = bnx * 90; b.vy = bny * 90; }
          sfx("bump"); fx.push({ k: "puff", x: bcx, y: bcy, t: 0 }); hit = Math.max(hit, 60);
        }
        continue;
      }
      if (!BALL_SOLID[t]) continue;
      var rx = tx * TILE, ry = ty * TILE, px = clamp(b.x, rx, rx + TILE), py = clamp(b.y, ry, ry + TILE), dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
      if (d2 >= BALL_R * BALL_R) continue;
      if (t === TY.BUSH && speedOf(b) > 25) { breakBush(tx, ty); b.vx *= 0.6; b.vy *= 0.6; continue; }
      if (t === TY.KDOOR && S.keys > 0) { S.keys--; openTile(tx, ty, "key"); setMsg("Clé utilisée : la porte s'ouvre !", 2400); hudUpdate(); continue; }
      if (t === TY.KDOOR && now() > keyMsgT) { keyMsgT = now() + 2500; setMsg("Verrouillé : il faut une clé.", 2000); }
      if (t === TY.CRACK) {
        if (S.items.power && speedOf(b) > 160) { openTile(tx, ty, "crack"); setMsg("La roche vole en éclats !", 2200); b.vx *= 0.8; b.vy *= 0.8; continue; }
        if (now() > keyMsgT) { keyMsgT = now() + 2500; setMsg(S.items.power ? "Plus fort ! Il faut tirer à pleine puissance." : "Une roche fissurée… il faut un club puissant.", 2400); }
      }
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
      var dec = t === TY.ROUGH ? DEC * 2.3 : t === TY.SAND ? DEC * 6 : (t === TY.WATER ? DEC * 3.5 : (t === TY.ICE ? DEC * 0.05 : DEC));
      if (b.brake > 0) { dec *= 9; b.brake -= dt; }
      var ns = Math.max(0, sp - dec * dt) * (1 - 0.2 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp; sp = ns;
      if (sp < 6 && am < DEC * 0.8) { b.vx = 0; b.vy = 0; sp = 0; }
      else if (sp > 12) { b.fx = b.vx / sp; b.fy = b.vy / sp; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    var hit = collideTiles(b);
    if (hit > 40) sfx("wall", hit / VMAX);
    var tn = tileAt(b.x, b.y);
    if (tn >= TY.SW0 && tn <= TY.SW2) { var sx0 = Math.floor(b.x / TILE) * TILE + 8, sy0 = Math.floor(b.y / TILE) * TILE + 8; if (dist(b.x, b.y, sx0, sy0) < 7) pressSwitch(tn - TY.SW0, sx0, sy0); }
    if (tn === TY.WATER && !S.items.float) {
      fx.push({ k: "splash", x: b.x, y: b.y, t: 0 }); sfx("splash");
      b.x = b.rest.x; b.y = b.rest.y; b.vx = b.vy = 0; b.rolling = false;
      strokes = Math.max(0, strokes - 1); setMsg("Plouf ! −1 coup", 1800); hudUpdate(); faceTarget();
      return;
    }
    // passages entre les niveaux
    if (tn === TY.PORTAL && sp < 240 && b.pcool <= 0) {
      var ptx = Math.floor(b.x / TILE), pty = Math.floor(b.y / TILE), po = null;
      L.feat.portals.forEach(function (p) { if (p.x === ptx && p.y === pty) po = p; });
      if (po && dist(b.x, b.y, ptx * TILE + 8, pty * TILE + 8) < 9) { takePortal(po); return; }
    }
    // trous
    if (tn === TY.CUP || tn === TY.HOLY || tn === TY.TEMPLE) {
      var gx = Math.floor(b.x / TILE), gy = Math.floor(b.y / TILE), cxp = gx * TILE + 8, cyp = gy * TILE + 8, dd2 = dist(b.x, b.y, cxp, cyp);
      var done = tn !== TY.TEMPLE && S.cups[cupKey(gx, gy)];
      if (!done) {
        if (dd2 < CUP_R && sp < 150) { sinkBall(gx, gy, tn); return; }
        if (dd2 < CUP_R * 2 && sp < 90 && sp > 0) { b.vx += (cxp - b.x) / (dd2 || 1) * 500 * dt; b.vy += (cyp - b.y) / (dd2 || 1) * 500 * dt; }
      }
    }
    if (b.vx === 0 && b.vy === 0) { b.rolling = false; b.rest = { x: b.x, y: b.y }; faceTarget(); }
  }
  function takePortal(po) {
    sfx("portal"); fx.push({ k: "puff", x: B.x, y: B.y, t: 0 });
    var wasDark = L.dark;
    enterLevel(po.to);
    placeBall(po.tx * TILE + 8, po.ty * TILE + 8 + 15);
    B.pcool = 0.8; cam.x = B.x - view.aw / 2; cam.y = B.y - view.ah / 2;
    setMsg(wasDark ? "Retour à la surface" : "Le souterrain…", 2000);
    persist();
  }
  function sinkBall(tx, ty, tn) {
    var key = cupKey(tx, ty), c = { x: tx * TILE + 8, y: ty * TILE + 8 };
    B.vx = B.vy = 0; B.rolling = false; B.x = c.x; B.y = c.y + 12; B.rest = { x: B.x, y: B.y };
    sfx("sink"); fx.push({ k: "puff", x: c.x, y: c.y, t: 0 });
    if (tn === TY.TEMPLE) {
      if (allPieces()) { S.won = true; persist(); mode = "won"; setTimeout(showWin, 600); }
      else setMsg("Il manque des Morceaux de Tee…", 2600);
      faceTarget(); return;
    }
    S.cups[key] = 1; S.clubs++; dirty();
    if (tn === TY.HOLY) {
      var idx = -1; L.feat.holy.forEach(function (h) { if (h[0] === tx && h[1] === ty) idx = h[2]; });
      if (idx >= 0) S.pieces[idx] = 1;
      var n = S.pieces.reduce(function (a, b2) { return a + b2; }, 0);
      setMsg("Morceau de Tee " + n + "/4 ! (+3 coups max)", 3000);
      if (n === 4) { LV[0].feat.gates.forEach(function (f) { LV[0].grid[f[1] * LV[0].W + f[0]] = TY.GRASS; }); dirty(); setTimeout(function () { setMsg("Le temple s'ouvre, au nord !", 3200); }, 3100); }
    } else setMsg("Club trouvé ! +3 coups max", 2600);
    strokes = maxStrokes(); floatText(c.x, c.y - 8, "+3", "#f6c445"); hudUpdate(); persist(); faceTarget();
  }
  function shoot(ang, pow) {
    if (mode !== "play" || B.rolling) return false;
    if (strokes <= 0) { setMsg("Plus de coups !", 1500); return false; }
    var v = clamp(pow, 0.05, 1) * VMAX * (S.items.power ? 1.3 : 1);
    strokes--; S.shots++; B.rest = { x: B.x, y: B.y }; B.vx = Math.cos(ang) * v; B.vy = Math.sin(ang) * v; B.rolling = true; B.brake = 0; B.fx = Math.cos(ang); B.fy = Math.sin(ang);
    sfx("hit", pow); aim.on = false; aim.drag = null; hudUpdate();
    return true;
  }
  function hurtBall(fx0, fy0) {
    if (B.hurt > 0) return;
    B.hurt = 0.9; sfx("hurt"); strokes = Math.max(1, strokes - 1); floatText(B.x, B.y - 10, "-1", "#ef6a52"); hudUpdate();
    var a = Math.atan2(B.y - fy0, B.x - fx0); B.vx = Math.cos(a) * 110; B.vy = Math.sin(a) * 110; B.rolling = true; B.brake = 0;
  }

  /* =====================================================================
     ENNEMIS, OBJETS, DRAPEAUX
     ===================================================================== */
  function monsterSolid(t) { return t === TY.TREE || t === TY.RAIL || t === TY.BUSH || t === TY.WATER || t === TY.GATE || t === TY.CWALL || t === TY.BUMP || BALL_SOLID[t] === 1 && t >= TY.DR0; }
  function blockedAt(x, y, r) {
    var tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE), ty0 = Math.floor((y - r) / TILE), ty1 = Math.floor((y + r) / TILE);
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (monsterSolid(get(tx, ty))) {
      var px = clamp(x, tx * TILE, tx * TILE + TILE), py = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - px) * (x - px) + (y - py) * (y - py) < r * r) return true;
    }
    return false;
  }
  function updateAll(dt) {
    var sp = speedOf(B);
    S.ms += dt * 1000; B.hurt = Math.max(0, B.hurt - dt); B.pcool = Math.max(0, B.pcool - dt);
    // slimes (+4)
    slimes.forEach(function (s) {
      if (!s.alive) return;
      s.t -= dt; s.bob += dt * 6; s.cd = Math.max(0, s.cd - dt);
      if (s.t <= 0) { s.t = 1 + Math.random() * 2; var a = Math.random() * 6.283, tow = dist(s.x, s.y, B.x, B.y) < 70; if (tow) a = Math.atan2(B.y - s.y, B.x - s.x); s.dx = Math.cos(a) * 14; s.dy = Math.sin(a) * 14; if (!tow && Math.random() < 0.4) s.dx = s.dy = 0; }
      var sx = s.x + s.dx * dt, sy = s.y + s.dy * dt;
      if (!blockedAt(sx, s.y, 4)) s.x = sx; else s.dx = -s.dx;
      if (!blockedAt(s.x, sy, 4)) s.y = sy; else s.dy = -s.dy;
      if (dist(s.x, s.y, B.x, B.y) < 9) {
        if (sp > 25) { s.alive = false; addStrokes(4); sfx("kill"); floatText(s.x, s.y - 6, "+4", "#a8e63a"); fx.push({ k: "puff", x: s.x, y: s.y, t: 0 }); B.vx *= 0.6; B.vy *= 0.6; }
        else if (s.cd <= 0) { s.cd = 1.2; hurtBall(s.x, s.y); }
      }
    });
    // chauves-souris du souterrain (+6)
    bats.forEach(function (o) {
      if (!o.alive) { o.back -= dt; if (o.back <= 0) o.alive = true; return; }
      o.t -= dt; o.ph += dt * 5; o.cd = Math.max(0, o.cd - dt);
      if (o.t <= 0) { o.t = 0.5 + Math.random() * 0.9; var a = Math.random() * 6.283, tow = dist(o.x, o.y, B.x, B.y) < 90; if (tow) a = Math.atan2(B.y - o.y, B.x - o.x) + (Math.random() - 0.5); o.vx = Math.cos(a) * 30; o.vy = Math.sin(a) * 30; }
      var nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
      if (!blockedAt(nx, o.y, 3)) o.x = nx; else o.vx = -o.vx;
      if (!blockedAt(o.x, ny, 3)) o.y = ny; else o.vy = -o.vy;
      if (dist(o.x, o.y, B.x, B.y) < 9) {
        if (sp > 25) { o.alive = false; o.back = 25; addStrokes(6); sfx("kill"); floatText(o.x, o.y - 6, "+6", "#f6c445"); fx.push({ k: "puff", x: o.x, y: o.y, t: 0 }); }
        else if (o.cd <= 0) { o.cd = 1.2; hurtBall(o.x, o.y); }
      }
    });
    // Roi Slime : 3 coups bien sentis pour le vaincre
    if (boss) {
      boss.t -= dt; boss.bob += dt * 4; boss.flash = Math.max(0, boss.flash - dt); boss.cd = Math.max(0, boss.cd - dt);
      if (boss.t <= 0) { boss.t = 0.6 + Math.random() * 0.8; var ba = Math.atan2(B.y - boss.y, B.x - boss.x) + (Math.random() - 0.5) * 0.8, bs = dist(boss.x, boss.y, B.x, B.y) < 150 ? 22 : 0; boss.dx = Math.cos(ba) * bs; boss.dy = Math.sin(ba) * bs; }
      var bnx = boss.x + boss.dx * dt, bny = boss.y + boss.dy * dt;
      if (!blockedAt(bnx, boss.y, 9)) boss.x = bnx; else boss.dx = -boss.dx;
      if (!blockedAt(boss.x, bny, 9)) boss.y = bny; else boss.dy = -boss.dy;
      if (dist(boss.x, boss.y, B.x, B.y) < 15) {
        var kx = Math.atan2(B.y - boss.y, B.x - boss.x);
        if (sp > 60 && boss.flash <= 0) {
          boss.hp--; boss.flash = 1; sfx("boss"); fx.push({ k: "puff", x: boss.x, y: boss.y, t: 0 });
          B.vx = Math.cos(kx) * 150; B.vy = Math.sin(kx) * 150; B.rolling = true; B.brake = 0;
          if (boss.hp <= 0) killBoss(); else { boss.x -= Math.cos(kx) * 6; boss.y -= Math.sin(kx) * 6; setMsg("Touché ! Encore " + boss.hp + " coup" + (boss.hp > 1 ? "s" : "") + "…", 1400); }
        } else if (sp <= 60 && boss.cd <= 0 && boss.flash <= 0) { boss.cd = 1.4; hurtBall(boss.x, boss.y); strokes = Math.max(1, strokes - 1); hudUpdate(); }
      }
    }
    // oiseaux sortis des buissons (+5)
    birds = birds.filter(function (o) {
      o.t += dt; o.tt -= dt; if (o.tt <= 0) { o.tt = 0.4 + Math.random() * 0.6; var a = Math.random() * 6.283; o.vx = Math.cos(a) * 26; o.vy = Math.sin(a) * 26; }
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (dist(o.x, o.y, B.x, B.y) < 9 && sp > 20) { addStrokes(5); sfx("kill"); floatText(o.x, o.y - 6, "+5", "#f6c445"); fx.push({ k: "puff", x: o.x, y: o.y, t: 0 }); return false; }
      return o.t < o.life;
    });
    // aigles (+10)
    eagles.forEach(function (e) {
      if (!e.alive) { e.back -= dt; if (e.back <= 0) e.alive = true; return; }
      e.x += e.dir * e.sp * dt; if (e.x > e.x2) e.dir = -1; if (e.x < e.x1) e.dir = 1;
      if (dist(e.x, e.y, B.x, B.y) < 11 && sp > 20) { e.alive = false; e.back = 40; addStrokes(10); sfx("kill"); floatText(e.x, e.y - 8, "+10", "#f6c445"); fx.push({ k: "puff", x: e.x, y: e.y, t: 0 }); }
    });
    // objets
    items = items.filter(function (it) {
      if (dist(it.x, it.y, B.x, B.y) > 10) return true;
      S.taken[it.tk] = 1; sfx("get");
      if (it.kind === "key") { S.keys++; setMsg("Une clé ! Elle ouvre une porte à serrure.", 3000); }
      else {
        S.items[it.kind] = 1;
        setMsg(it.kind === "brake" ? "FREIN ! Touche l'écran (ou B) pendant que tu roules." : it.kind === "power" ? "Club puissant ! +30 % de puissance, et tu peux briser les roches fissurées." : "Bouée ! Tu flottes sur l'eau (mais lentement).", 3800);
      }
      persist(); hudUpdate();
      return false;
    });
    // drapeaux
    L.feat.flags.forEach(function (f, idx) {
      var c = center(f), here = S.cp.l === lvIdx && S.cp.i === idx;
      if (dist(c.x, c.y, B.x, B.y) < 11 && (!here || strokes < maxStrokes())) {
        if (!here) { S.cp = { l: lvIdx, i: idx }; setMsg("Drapeau ! Position sauvegardée, coups restaurés.", 2400); sfx("flag"); persist(); }
        else { sfx("flag"); setMsg("Coups restaurés.", 1400); }
        strokes = maxStrokes(); hudUpdate();
      }
    });
    // PNJ : ils parlent quand tu passes près
    var nearN = -1;
    npcs.forEach(function (n, i2) { if (dist(n.x, n.y, B.x, B.y) < 20) nearN = i2; });
    if (nearN >= 0 && nearN !== lastNpc) showDialog(DIALOGS[npcs[nearN].d]);
    if (nearN >= 0) lastNpc = nearN;
    else if (lastNpc >= 0) { var far = true; npcs.forEach(function (n) { if (dist(n.x, n.y, B.x, B.y) < 44) far = false; }); if (far) lastNpc = -1; }
    if (dlgT && now() > dlgT) { hudDlg.hidden = true; dlgT = 0; }
    // plus de coups : retour au dernier drapeau
    if (mode === "play" && strokes <= 0 && !B.rolling) { outTimer += dt; if (outTimer > 1.1) respawn(); } else outTimer = 0;
    fx = fx.filter(function (f) { f.t += dt; return f.t < (f.k === "splash" ? 0.6 : 0.4); });
    floaters = floaters.filter(function (f) { f.t += dt; f.y -= dt * 10; return f.t < 1.2; });
    brakeBtn.hidden = !(S.items.brake && B.rolling);
  }
  function killBoss() {
    S.boss[lvIdx] = 1; var bx = boss.x, by = boss.y; boss = null;
    addStrokes(10); floatText(bx, by - 10, "+10", "#f6c445"); sfx("boss");
    for (var i = 0; i < 6; i++) fx.push({ k: "puff", x: bx + (i - 3) * 4, y: by + (i % 2) * 5, t: -i * 0.05 });
    S.sw[lvIdx + ":2"] = 1; applyLevelState(lvIdx); persist();
    setMsg("Le Roi Slime est vaincu ! Une porte s'ouvre.", 3600);
  }
  function respawn() {
    S.deaths++; setMsg("Plus de coups ! Retour au drapeau.", 2600); sfx("hurt");
    if (S.cp.l !== lvIdx) enterLevel(S.cp.l);
    var f = center(L.feat.flags[S.cp.i]);
    placeBall(f.x + 9, f.y + 11); strokes = maxStrokes(); hudUpdate(); persist(); outTimer = 0;
    cam.x = B.x - view.aw / 2; cam.y = B.y - view.ah / 2;
  }
  function showDialog(text) { hudDlg.textContent = text; hudDlg.hidden = false; dlgT = now() + 6000; }

  /* =====================================================================
     RENDU PIXEL ART — palette unique (3 tons par matière), tuiles raccordées
     entre elles (rives, falaises, forêts, rails continus), lutins dessinés à
     la main avec un contour commun. Les tuiles sont mises en cache par niveau
     (L.tc) et recalculées quand le décor change (dirty()).
     ===================================================================== */
  var P = {
    out: "#13171f",
    g0: "#c9f06a", g1: "#9bd847", g2: "#86c43e", g3: "#5ea236", g4: "#3f7f34", g5: "#2a5f38", g6: "#1b4a34",
    s0: "#fbf0b8", s1: "#efdc94", s2: "#d2bb6e", s3: "#a99250",
    w0: "#d4f3ff", w1: "#6dd0f5", w2: "#33a4e6", w3: "#2276c8", w4: "#174f94",
    e0: "#e8b878", e1: "#b9763a", e2: "#8a5226", e3: "#5a3418",
    st0: "#f1f3f8", st1: "#c9cfdb", st2: "#8b94a8", st3: "#555e74", st4: "#2e3548",
    r0: "#ff8a70", r1: "#e04a3a", r2: "#a82a26", y0: "#fff2a8", y1: "#ffd23f", y2: "#d99a1a",
    p0: "#c89cff", p1: "#8e5ad8", p2: "#5a3a9a",
    c0: "#7f93bd", c1: "#6a7ea8", c2: "#586b94", c3: "#46577e", c4: "#34446a", c5: "#222c4a", c6: "#161d33",
    ice0: "#f2fbff", ice1: "#cfeeff", ice2: "#a8d8f2", ice3: "#80bde0",
  };
  // anciens noms (utilisés par la partie dessin des effets)
  var C = { black: P.out, white: "#ffffff", gray: P.st1, yellow: P.y1, red: P.r1, red2: P.r0, purple: P.p1, waterHi: P.w0, cream: "#fdf3de", orange: "#f08a2a", brown: P.e2, forest: P.g5 };
  function disc(x, y, r, col) { x = Math.round(x); y = Math.round(y); cx.fillStyle = col; for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - dy * dy)); cx.fillRect(x - w, y + dy, 2 * w + 1, 1); } }
  function rc(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(Math.round(x), Math.round(y), w, h); }
  var GLYPH = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111", "+": "000010111010000", "-": "000000111000000" };
  function pxText(x, y, text, col) {
    x = Math.round(x - text.length * 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) for (var i = 0; i < text.length; i++) {
      var gl = GLYPH[text[i]]; if (!gl) continue;
      for (var k = 0; k < 15; k++) if (gl[k] === "1") { var px = x + i * 4 + (k % 3), py = y + Math.floor(k / 3); if (pass === 0) rc(px - 1, py - 1, 3, 3, P.out); else rc(px, py, 1, 1, col); }
    }
  }

  /* ---------- tuiles ---------- */
  function dirty() { LV.forEach(function (l) { l.tc = {}; }); }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function fr(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function blob(g, cx0, cy0, r, col) { for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - y * y)); fr(g, cx0 - w, cy0 + y, 2 * w + 1, 1, col); } }
  // classe de terrain d'un type de tuile (pour raccorder les bords)
  function cls(t) {
    switch (t) {
      case TY.WATER: return "W"; case TY.SAND: return "S"; case TY.ROUGH: return "R"; case TY.PLATEAU: return "P"; case TY.ICE: return "I";
      case TY.TREE: return "T"; case TY.RAIL: return "L"; case TY.CWALL: return "C"; case TY.BRIDGE: return "B";
    }
    return lvIdx ? "F" : "G";
  }
  function cAt(tx, ty) { return cls(get(tx, ty)); }
  // sol sous un objet : celui des voisins directs (sinon herbe / sol de grotte)
  function underClass(tx, ty) {
    var a = [cAt(tx, ty - 1), cAt(tx + 1, ty), cAt(tx, ty + 1), cAt(tx - 1, ty)];
    for (var i = 0; i < 4; i++) if ("SRPIG F".indexOf(a[i]) >= 0 && a[i] !== " ") return a[i];
    return lvIdx ? "F" : "G";
  }
  function hh(tx, ty, k) { return hash(tx, ty, k); }
  function strip(g, k, th, col) { if (k === 0) fr(g, 0, 0, 16, th, col); else if (k === 1) fr(g, 16 - th, 0, th, 16, col); else if (k === 2) fr(g, 0, 16 - th, 16, th, col); else fr(g, 0, 0, th, 16, col); }
  function dither(g, k, rows, col, seed) {
    for (var r = 0; r < rows; r++) for (var i = 0; i < 16; i++) {
      var on = r === 0 ? ((i & 1) === 0) : r === 1 ? (i % 4 === 1) : (i % 8 === 3);
      if (!on) continue;
      if (k === 0) fr(g, i, r, 1, 1, col); else if (k === 1) fr(g, 15 - r, i, 1, 1, col); else if (k === 2) fr(g, i, 15 - r, 1, 1, col); else fr(g, r, i, 1, 1, col);
    }
  }
  function drawGround(g, c, tx, ty) {
    var v = Math.floor(hh(tx, ty, 6) * 4), i;
    if (c === "G") {
      fr(g, 0, 0, 16, 16, P.g1);
      for (i = 0; i < 3; i++) { var px = Math.floor(hh(tx * 3 + i, ty, 11) * 12), py = Math.floor(hh(tx, ty * 3 + i, 12) * 13); fr(g, px, py, 3, 1, P.g2); fr(g, px + 1, py + 1, 2, 1, P.g2); }
      if (v < 2) { var tx2 = 3 + Math.floor(hh(tx, ty, 13) * 9), ty2 = 4 + Math.floor(hh(tx, ty, 14) * 8); fr(g, tx2, ty2, 1, 3, P.g3); fr(g, tx2 - 1, ty2 + 1, 1, 2, P.g3); fr(g, tx2 + 1, ty2 + 1, 1, 2, P.g3); }
    } else if (c === "F") {
      fr(g, 0, 0, 16, 16, P.c2);
      for (i = 0; i < 4; i++) { var qx = Math.floor(hh(tx * 4 + i, ty, 21) * 13), qy = Math.floor(hh(tx, ty * 4 + i, 22) * 14); fr(g, qx, qy, 3, 1, P.c1); fr(g, qx + 1, qy + 1, 2, 1, P.c1); }
      if (v === 0) { fr(g, 5, 9, 2, 1, P.c3); fr(g, 6, 10, 1, 1, P.c3); }
    } else if (c === "R") {
      fr(g, 0, 0, 16, 16, P.g3);
      for (i = 0; i < 7; i++) { var rx = Math.floor(hh(tx * 7 + i, ty, 31) * 14) + 1, ry = Math.floor(hh(tx, ty * 7 + i, 32) * 11) + 2; fr(g, rx, ry, 1, 3, P.g4); fr(g, rx + 1, ry + 1, 1, 2, P.g2); }
    } else if (c === "S") {
      fr(g, 0, 0, 16, 16, P.s1);
      for (i = 0; i < 5; i++) fr(g, Math.floor(hh(tx * 5 + i, ty, 41) * 15), Math.floor(hh(tx, ty * 5 + i, 42) * 15), 1, 1, P.s2);
      for (i = 0; i < 2; i++) fr(g, Math.floor(hh(tx * 2 + i, ty, 43) * 14), Math.floor(hh(tx, ty * 2 + i, 44) * 14), 2, 1, P.s0);
    } else if (c === "W" || c === "B") {
      var deep = true; for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var q = cAt(tx + dx, ty + dy); if (q !== "W" && q !== "B") deep = false; }
      fr(g, 0, 0, 16, 16, deep ? P.w3 : P.w2);
      if (deep) for (i = 0; i < 3; i++) fr(g, Math.floor(hh(tx * 3 + i, ty, 51) * 12), 2 + i * 5, 4, 1, P.w2);
    } else if (c === "P") {
      fr(g, 0, 0, 16, 16, P.g1);
      for (var d = -16; d < 16; d += 8) for (var e = 0; e < 16; e++) { var sx = d + e + ((tx + ty) & 1) * 2; if (sx >= 0 && sx < 16) fr(g, sx, e, 3, 1, P.g0); }
    } else if (c === "I") {
      fr(g, 0, 0, 16, 16, P.ice1);
      for (i = 0; i < 4; i++) fr(g, Math.floor(hh(tx * 4 + i, ty, 61) * 13), Math.floor(hh(tx, ty * 4 + i, 62) * 14), 3, 1, P.ice2);
      var sh = (tx + ty) & 1; fr(g, 2 + sh * 4, 3, 4, 1, P.ice0); fr(g, 3 + sh * 4, 4, 2, 1, P.ice0); fr(g, 9 - sh * 3, 11, 3, 1, P.ice0);
    } else fr(g, 0, 0, 16, 16, P.g5);
    blendEdges(g, c, tx, ty);
  }
  // raccords entre terrains
  function blendEdges(g, c, tx, ty) {
    var n = [cAt(tx, ty - 1), cAt(tx + 1, ty), cAt(tx, ty + 1), cAt(tx - 1, ty)], k;
    for (k = 0; k < 4; k++) {
      var m = n[k];
      if (c === "W") {
        if (m !== "W" && m !== "B") { strip(g, k, 2, P.w1); for (var i = 0; i < 16; i += 2) { if (k === 0) fr(g, i, 0, 1, 1, P.w0); else if (k === 2) fr(g, i, 15, 1, 1, P.w0); else if (k === 1) fr(g, 15, i, 1, 1, P.w0); else fr(g, 0, i, 1, 1, P.w0); } }
      } else if (c === "S") {
        if (m === "W") { strip(g, k, 2, P.s2); strip(g, k, 1, P.s3); }
      } else if (c === "G") {
        if (m === "W") { strip(g, k, 2, P.g3); strip(g, k, 1, P.s1); }
        else if (m === "S") dither(g, k, 3, P.s1);
        else if (m === "R") dither(g, k, 2, P.g3);
      } else if (c === "F") {
        if (m === "W") { strip(g, k, 2, P.c3); strip(g, k, 1, P.c4); }
        else if (m === "C") { g.fillStyle = "rgba(10,14,30,.30)"; if (k === 0) g.fillRect(0, 0, 16, 4); else if (k === 1) g.fillRect(14, 0, 2, 16); else if (k === 2) g.fillRect(0, 14, 16, 2); else g.fillRect(0, 0, 2, 16); }
      } else if (c === "R") {
        if (m === "W") { strip(g, k, 2, P.g4); strip(g, k, 1, P.s1); }
      } else if (c === "I") {
        if (m !== "I") { strip(g, k, 1, P.ice0); }
      } else if (c === "P") {
        if (k === 0 && m !== "P") fr(g, 0, 0, 16, 1, P.g0);
        if (k === 3 && m !== "P") fr(g, 0, 0, 1, 16, P.g0);
      }
    }
    if (c === "P") {   // falaises : faces sud et est
      if (n[2] !== "P") { fr(g, 0, 11, 16, 5, P.g5); fr(g, 0, 11, 16, 1, P.g4); for (var j = 0; j < 16; j += 2) { fr(g, j, 12, 1, 1, P.g4); fr(g, j + 1, 13, 1, 1, P.g6); } fr(g, 0, 15, 16, 1, P.g6); }
      if (n[1] !== "P") { fr(g, 13, 0, 3, n[2] !== "P" ? 11 : 16, P.g4); for (var j2 = 0; j2 < 16; j2 += 2) fr(g, 14, j2, 1, 1, P.g5); }
    }
  }
  function isT(tx, ty) { return get(tx, ty) === TY.TREE; }
  function drawTree(g, tx, ty) {
    var nb = [isT(tx, ty - 1), isT(tx + 1, ty), isT(tx, ty + 1), isT(tx - 1, ty)], cnt = nb[0] + nb[1] + nb[2] + nb[3];
    drawGround(g, underClassTree(tx, ty), tx, ty);
    if (cnt === 0) {   // arbre isolé : couronne ronde
      g.fillStyle = "rgba(0,0,0,.22)"; for (var r = 0; r < 3; r++) g.fillRect(4 - r + 2, 12 + r, 10 + 2 * r - 4, 1);
      blob(g, 8, 7, 7, P.out); blob(g, 8, 7, 6, P.g6); blob(g, 7, 6, 5, P.g5); blob(g, 6, 5, 3, P.g4);
      fr(g, 4, 4, 2, 1, P.g3); fr(g, 4, 5, 1, 1, P.g3); fr(g, 10, 8, 2, 1, P.g4); fr(g, 9, 10, 2, 1, P.g6);
      return;
    }
    var l = nb[3] ? 0 : 1, r2 = nb[1] ? 15 : 14, t2 = nb[0] ? 0 : 1, b2 = nb[2] ? 15 : 14;
    fr(g, l, t2, r2 - l + 1, b2 - t2 + 1, P.g5);
    for (var i = 0; i < 4; i++) {
      var lx = l + 2 + Math.floor(hh(tx * 4 + i, ty, 71) * (r2 - l - 4)), ly = t2 + 2 + Math.floor(hh(tx, ty * 4 + i, 72) * (b2 - t2 - 4));
      blob(g, lx + 1, ly + 1, 2, P.g6); blob(g, lx, ly, 3, P.g4); fr(g, lx - 1, ly - 2, 2, 1, P.g3);
    }
    // contour sur les côtés exposés
    if (!nb[0]) { fr(g, l, 0, r2 - l + 1, 1, P.out); fr(g, l, 1, r2 - l + 1, 1, P.g4); }
    if (!nb[2]) fr(g, l, 15, r2 - l + 1, 1, P.out);
    if (!nb[3]) fr(g, 0, t2, 1, b2 - t2 + 1, P.out);
    if (!nb[1]) fr(g, 15, t2, 1, b2 - t2 + 1, P.out);
    if (!nb[0] && !nb[3]) fr(g, 0, 0, 2, 2, "rgba(0,0,0,0)");
  }
  function underClassTree(tx, ty) { var a = [cAt(tx, ty - 1), cAt(tx + 1, ty), cAt(tx, ty + 1), cAt(tx - 1, ty)]; for (var i = 0; i < 4; i++) if (a[i] === "S" || a[i] === "R" || a[i] === "P") return a[i]; return lvIdx ? "F" : "G"; }
  function isRail(tx, ty) { return get(tx, ty) === TY.RAIL; }
  function drawRail(g, tx, ty) {
    drawGround(g, underClass(tx, ty), tx, ty);
    var N = isRail(tx, ty - 1), E = isRail(tx + 1, ty), Sx = isRail(tx, ty + 1), Wx = isRail(tx - 1, ty);
    function boxes(f) { f(3, 3, 10, 10); if (N) f(3, 0, 10, 4); if (E) f(12, 3, 4, 10); if (Sx) f(3, 12, 10, 4); if (Wx) f(0, 3, 4, 10); }
    g.fillStyle = "rgba(0,0,0,.22)"; boxes(function (x, y, w, h) { g.fillRect(x + 1, y + 2, w, h); });
    boxes(function (x, y, w, h) { fr(g, Math.max(0, x - 1), Math.max(0, y - 1), Math.min(16, x + w + 1) - Math.max(0, x - 1), Math.min(16, y + h + 1) - Math.max(0, y - 1), P.out); });
    boxes(function (x, y, w, h) {
      for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) { var wx = tx * 16 + xx, wy = ty * 16 + yy; fr(g, xx, yy, 1, 1, ((wx >> 2) + (wy >> 2)) & 1 ? P.st1 : P.st0); }
    });
    // arêtes : lumière en haut, ombre en bas
    boxes(function (x, y, w, h) { fr(g, x, y, w, 1, "#ffffff"); fr(g, x, y + h - 1, w, 1, P.st2); });
  }
  function drawWall(g, tx, ty) {
    var below = get(tx, ty + 1) === TY.CWALL;
    fr(g, 0, 0, 16, 16, P.c5);
    for (var i = 0; i < 5; i++) fr(g, Math.floor(hh(tx * 5 + i, ty, 81) * 14), Math.floor(hh(tx, ty * 5 + i, 82) * 14), 2, 1, P.c4);
    if (!below) {   // face de la paroi : briques éclairées
      fr(g, 0, 5, 16, 11, P.st3); fr(g, 0, 5, 16, 1, P.st1); fr(g, 0, 6, 16, 1, P.st2);
      for (var r = 0; r < 3; r++) { var off = (r & 1) * 4; fr(g, 0, 8 + r * 3, 16, 1, P.st4); for (var c = off; c < 16; c += 8) fr(g, c, 8 + r * 3 - 3 + (r === 0 ? 0 : 0), 1, 3, P.st4); }
      fr(g, 0, 15, 16, 1, P.st4);
    }
  }
  // bouton / porte / bumper / etc.
  var SWC = [[P.r1, P.r0, P.r2], [P.w2, P.w1, P.w4], ["#3fd05a", "#8cf08a", "#23903a"]];
  function drawObject(g, t, tx, ty, f) {
    var ground = underClass(tx, ty), v = Math.floor(hh(tx, ty, 6) * 4);
    if (t === TY.TREE) { drawTree(g, tx, ty); return; }
    if (t === TY.RAIL) { drawRail(g, tx, ty); return; }
    if (t === TY.CWALL) { drawWall(g, tx, ty); return; }
    if (t === TY.BRIDGE) {
      drawGround(g, "W", tx, ty);
      fr(g, 0, 2, 16, 12, P.e2); for (var p = 0; p < 16; p += 4) { fr(g, p, 3, 3, 10, P.e1); fr(g, p, 3, 3, 1, P.e0); fr(g, p + 3, 3, 1, 10, P.e3); }
      fr(g, 0, 1, 16, 2, P.e3); fr(g, 0, 13, 16, 2, P.e3); fr(g, 0, 1, 16, 1, P.e1); fr(g, 0, 15, 16, 1, "rgba(0,0,0,.25)");
      return;
    }
    drawGround(g, ground === "W" || ground === "B" ? (lvIdx ? "F" : "G") : ground, tx, ty);
    var lv = lvIdx;
    if (t === TY.BUSH) {
      g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(3, 12, 11, 2);
      blob(g, 8, 8, 7, P.out); blob(g, 8, 8, 6, P.g5); blob(g, 7, 7, 5, P.g4); blob(g, 6, 5, 3, P.g3);
      fr(g, 10, 9, 2, 2, P.r1); fr(g, 5, 10, 2, 2, P.r1); fr(g, 9, 5, 2, 2, P.r0); fr(g, 10, 9, 1, 1, P.r0);
    } else if (t >= TY.UP && t <= TY.RIGHT) {
      fr(g, 0, 0, 16, 16, lv ? P.c1 : P.g2);
      for (var s = 0; s < 16; s += 4) { if (t === TY.UP || t === TY.DOWN) fr(g, 0, s, 16, 2, lv ? P.c0 : P.g1); else fr(g, s, 0, 2, 16, lv ? P.c0 : P.g1); }
      var pts = [];
      for (var k = 0; k < 3; k++) for (var j = -3; j <= 3; j++) {
        var a = 3 - Math.abs(j), b = 3 + k * 5;
        if (t === TY.DOWN) pts.push([8 + j, b + a]); else if (t === TY.UP) pts.push([8 + j, b + 3 - a + 1]); else if (t === TY.RIGHT) pts.push([b + a, 8 + j]); else pts.push([b + 3 - a + 1, 8 + j]);
      }
      pts.forEach(function (q) { fr(g, q[0], q[1], 1, 2, lv ? P.c4 : P.g4); });
    } else if (t >= TY.SW0 && t <= TY.SW2) {
      var sc = SWC[t - TY.SW0];
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(3, 12, 11, 2);
      blob(g, 8, 8, 7, P.out); blob(g, 8, 8, 6, f ? P.st3 : sc[2]);
      if (f) blob(g, 8, 8, 3, sc[0]); else { blob(g, 8, 7, 5, sc[0]); blob(g, 7, 6, 3, sc[1]); fr(g, 5, 4, 2, 1, "#ffffff"); }
    } else if (t >= TY.DR0 && t <= TY.DR2) {
      var dc = SWC[t - TY.DR0];
      fr(g, 0, 0, 16, 16, P.out); fr(g, 1, 1, 14, 14, dc[2]); fr(g, 2, 2, 12, 12, dc[0]);
      for (var d1 = 0; d1 < 12; d1 += 4) { fr(g, 2 + d1, 2, 1, 12, dc[2]); }
      fr(g, 2, 2, 12, 1, dc[1]); fr(g, 5, 5, 6, 6, P.out); fr(g, 6, 6, 4, 4, dc[1]); fr(g, 7, 7, 2, 2, P.out);
    } else if (t === TY.GATE) {
      fr(g, 0, 0, 16, 16, P.out); fr(g, 1, 1, 14, 14, P.y2); fr(g, 2, 2, 12, 12, P.y1); fr(g, 2, 2, 12, 1, P.y0);
      for (var d2 = 0; d2 < 12; d2 += 4) fr(g, 2 + d2, 2, 1, 12, P.y2);
      blob(g, 8, 8, 3, P.out); blob(g, 8, 8, 2, P.p1);
    } else if (t === TY.KDOOR) {
      fr(g, 0, 0, 16, 16, P.out); fr(g, 1, 1, 14, 14, P.y2); fr(g, 2, 2, 12, 12, P.y1); fr(g, 2, 2, 12, 1, P.y0);
      blob(g, 8, 7, 2, P.out); fr(g, 7, 8, 2, 4, P.out);
    } else if (t === TY.CRACK) {
      fr(g, 0, 0, 16, 16, P.out); fr(g, 1, 1, 14, 14, "#8a6a4a"); fr(g, 1, 1, 14, 2, "#b08c62"); fr(g, 1, 13, 14, 2, "#6a4e34");
      fr(g, 3, 9, 4, 3, "#775a3c"); fr(g, 10, 4, 3, 3, "#775a3c");
      fr(g, 7, 1, 1, 4, P.out); fr(g, 6, 5, 1, 3, P.out); fr(g, 7, 8, 1, 3, P.out); fr(g, 8, 11, 1, 4, P.out); fr(g, 9, 6, 2, 1, P.out);
    } else if (t === TY.BUMP) {
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(3, 12, 11, 3);
      blob(g, 8, 8, 8, P.out); blob(g, 8, 8, 7, P.r2); blob(g, 8, 7, 6, P.r1); blob(g, 7, 6, 4, P.r0);
      fr(g, 7, 3, 2, 9, "#ffffff"); fr(g, 4, 6, 8, 2, "#ffffff"); fr(g, 5, 4, 1, 1, "#ffffff");
    } else if (t === TY.PORTAL) {
      if (!lv) {
        fr(g, 0, 1, 16, 15, P.out); fr(g, 1, 2, 14, 14, P.st2); fr(g, 1, 2, 14, 1, P.st1); fr(g, 2, 3, 12, 13, P.st4); fr(g, 3, 4, 10, 12, P.out);
        fr(g, 4, 8, 8, 1, P.st4); fr(g, 4, 11, 8, 1, P.st3); fr(g, 4, 14, 8, 1, P.st2); fr(g, 3, 3, 1, 1, P.st1); fr(g, 12, 3, 1, 1, P.st1);
      } else {
        fr(g, 3, 1, 10, 14, P.out); fr(g, 4, 2, 8, 12, P.c6); fr(g, 5, 2, 2, 12, P.e1); fr(g, 9, 2, 2, 12, P.e1);
        for (var rg = 0; rg < 4; rg++) fr(g, 5, 4 + rg * 3, 6, 1, P.e0); fr(g, 6, 0, 4, 1, P.y1); fr(g, 7, 1, 2, 1, P.y1);
      }
    } else if (t === TY.FLAG) {
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(4, 12, 9, 2);
      blob(g, 8, 12, 3, P.out); blob(g, 8, 12, 2, P.st2); fr(g, 7, 11, 1, 1, P.st0);
    } else if (t === TY.CUP || t === TY.HOLY || t === TY.TEMPLE) {
      var done = (t !== TY.TEMPLE && S.cups[cupKey(tx, ty)]);
      var ring = t === TY.HOLY ? [P.y2, P.y1] : t === TY.TEMPLE ? [P.p2, P.p1] : [P.g5, P.g4];
      blob(g, 8, 9, 7, "rgba(0,0,0,.2)"); blob(g, 8, 8, 8, P.out); blob(g, 8, 8, 7, ring[0]); blob(g, 8, 8, 6, ring[1]);
      if (done) { blob(g, 8, 8, 5, P.st4); fr(g, 7, 5, 2, 6, P.st0); fr(g, 5, 7, 6, 2, P.st0); }
      else { blob(g, 8, 8, 5, P.out); blob(g, 8, 9, 4, "#05070b"); fr(g, 4, 6, 3, 1, "rgba(255,255,255,.25)"); }
    }
  }
  var OBJ_TILES = { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 30: 1 };
  function makeTile(t, tx, ty, f) {
    var c = cv(TILE, TILE), g = c.getContext("2d");
    if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) { if (t === TY.CWALL) drawWall(g, tx, ty); else drawTree(g, tx, ty); return c; }
    if (OBJ_TILES[t]) drawObject(g, t, tx, ty, f); else drawGround(g, t === TY.CFLOOR ? "F" : cls(t), tx, ty);
    return c;
  }
  function tileImage(tx, ty) {
    var t = get(tx, ty), f = (t >= TY.SW0 && t <= TY.SW2 && S.sw[lvIdx + ":" + (t - TY.SW0)]) ? 1 : 0;
    if (!L.tc) L.tc = {};
    var key = (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) ? "o" + tx + "," + ty : (ty * L.W + tx) * 2 + f;
    return L.tc[key] || (L.tc[key] = makeTile(t, tx, ty, f));
  }
  // éclats de l'eau (animés, dessinés par-dessus les tuiles d'eau)
  function waterGlints(camx, camy, tx0, ty0, tx1, ty1, t) {
    for (var y = ty0; y <= ty1; y++) for (var x = tx0; x <= tx1; x++) {
      if (get(x, y) !== TY.WATER) continue;
      for (var i = 0; i < 2; i++) {
        var ph = (t / 700 + hash(x, y, 90 + i) * 6) % 3; if (ph > 1.4) continue;
        var gx = x * TILE + 2 + Math.floor(hash(x, y, 93 + i) * 9), gy = y * TILE + 2 + Math.floor(hash(x, y, 95 + i) * 11);
        rc(gx - camx, gy - camy, ph < 0.7 ? 3 : 2, 1, P.w0);
      }
    }
  }

  /* ---------- lutins ---------- */
  var SPR = {};
  function spr(name, rows, pal) {
    var key = name; if (SPR[key]) return SPR[key];
    var w = rows[0].length, h = rows.length, c = cv(w, h), g = c.getContext("2d");
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var ch2 = rows[y][x]; if (ch2 !== "." && pal[ch2]) { g.fillStyle = pal[ch2]; g.fillRect(x, y, 1, 1); } }
    return SPR[key] = c;
  }
  function put(c, sx, sy, ax, ay) { cx.drawImage(c, Math.round(sx - (ax == null ? c.width / 2 : ax)), Math.round(sy - (ay == null ? c.height / 2 : ay))); }
  var BALL_ROWS = ["..OOOOO..", ".OWWWWWO.", "OWWWWWWsO", "OWWDWWWsO", "OWWWWWsSO", "OWDWWsSSO", "OWWWsSSSO", ".OsSSSSO.", "..OOOOO.."];
  var BALL_PAL = { O: P.out, W: "#ffffff", D: "#d9e4ef", s: "#e8eff6", S: "#b4c6da" };
  function drawHero() {
    var sx = Math.round(B.x - cam.x), sy = Math.round(B.y - cam.y), flash = B.hurt > 0 && ((now() / 80 | 0) % 2);
    if (flash) return;
    cx.fillStyle = "rgba(10,20,10,.32)"; cx.fillRect(sx - 3, sy + 4, 8, 2); cx.fillRect(sx - 2, sy + 3, 6, 1);
    put(spr("ball", BALL_ROWS, BALL_PAL), sx, sy);
  }
  var SLIME_ROWS = ["....OOOO....", "..OOGGGGOO..", ".OGHHGGGGGO.", ".OGHGGGGGGO.", "OGGGGGGGGGGO", "OGOOGGGGOOGO", "OGOWGGGGOWGO", "OSGGGGGGGGSO", ".OOOOOOOOOO."];
  var SLIME_PAL = { O: P.out, G: "#5ee27a", H: "#b6ffbf", S: "#2fa84e", W: "#ffffff" };
  function drawSlime(s, sx, sy) {
    var sq = Math.round(Math.sin(s.bob) * 1);
    cx.fillStyle = "rgba(10,20,10,.28)"; cx.fillRect(sx - 5, sy + 4, 10, 2);
    put(spr("slime", SLIME_ROWS, SLIME_PAL), sx, sy - sq, null, 5);
  }
  var BAT0 = ["O...........O", "OO..O...O..OO", "OPO.OPPPO.OPO", "OPPOPPPPPOPPO", "OPPPPRPRPPPPO", ".OPPPPPPPPPO.", "..OOPPPPPOO..", "....OOOOO...."];
  var BAT1 = [".............", "....O...O....", "...OPO.OPO...", "..OPPPOPPPO..", "OOPPPRPRPPPOO", "OPPPPPPPPPPPO", ".OOPPPPPPPOO.", "...OOOOOOO..."];
  var BAT_PAL = { O: P.out, P: "#7a4ab8", R: "#ff6a6a" };
  function drawBat(o, sx, sy) {
    var w = Math.floor(o.ph) % 2;
    cx.fillStyle = "rgba(10,10,30,.25)"; cx.fillRect(sx - 4, sy + 9, 8, 1);
    put(spr(w ? "bat1" : "bat0", w ? BAT1 : BAT0, BAT_PAL), sx, sy);
  }
  var BIRD0 = ["..OOO...", ".OYYYO.O", "OYYWYYOO", "OYYYYYYO", ".OYYYYO.", "..OOOO.."];
  var BIRD_PAL = { O: P.out, Y: P.y1, W: "#ffffff", B: P.y2 };
  function drawBird(sx, sy, big) {
    var w = ((now() / 120 | 0) % 2);
    if (big) {   // aigle
      var wy = w ? -3 : 1;
      cx.fillStyle = "rgba(10,20,10,.2)"; cx.fillRect(sx - 6, sy + 12, 12, 2);
      rc(sx - 10, sy - 2 + wy, 8, 4, P.out); rc(sx + 2, sy - 2 + wy, 8, 4, P.out); rc(sx - 9, sy - 1 + wy, 7, 2, "#8a5226"); rc(sx + 2, sy - 1 + wy, 7, 2, "#8a5226"); rc(sx - 9, sy - 1 + wy, 3, 1, "#b9763a"); rc(sx + 6, sy - 1 + wy, 3, 1, "#b9763a");
      rc(sx - 4, sy - 4, 8, 10, P.out); rc(sx - 3, sy - 3, 6, 8, "#a86a30"); rc(sx - 3, sy - 4, 6, 3, "#ffffff"); rc(sx - 1, sy - 2, 1, 1, P.out); rc(sx + 1, sy - 2, 1, 1, P.out); rc(sx - 1, sy, 2, 2, P.y1); rc(sx - 2, sy + 4, 4, 2, "#e8e8f0");
    } else {
      cx.fillStyle = "rgba(10,20,10,.25)"; cx.fillRect(sx - 3, sy + 5, 6, 1);
      put(spr("bird", BIRD0, BIRD_PAL), sx, sy);
      rc(sx - 5, sy - 2 + (w ? -2 : 1), 3, 2, P.out); rc(sx + 2, sy - 2 + (w ? -2 : 1), 3, 2, P.out); rc(sx - 4, sy - 1 + (w ? -2 : 1), 2, 1, P.y1); rc(sx + 2, sy - 1 + (w ? -2 : 1), 2, 1, P.y1);
    }
  }
  var NPC_ROWS = ["...OOOO...", "..OHHHHO..", ".OHHHHHHO.", ".OOOOOOOO.", ".OSSSSSSO.", ".OSOSSOSO.", ".OSSSSSSO.", "..OSSSSO..", ".OOCCCCOO.", "OCCCCCCCCO", "OCCCCCCCCO", "OCCDCCDCCO", ".OCCCCCCO.", ".OOOOOOOO.", "..OO..OO.."];
  var NPC_COL = [["#8a5ad8", "#6a3fb0", "#b08cf0"], ["#e0842a", "#b0601a", "#f4ac60"], ["#2a9a78", "#1c7058", "#60c8a4"], ["#d0407a", "#a02c5c", "#ec7aa4"]];
  function drawNpc(n, sx, sy) {
    var c = NPC_COL[n.d % 4];
    cx.fillStyle = "rgba(10,20,10,.28)"; cx.fillRect(sx - 4, sy + 7, 9, 2);
    put(spr("npc" + (n.d % 4), NPC_ROWS, { O: P.out, H: c[2], C: c[0], D: c[1], S: "#f6c9a0" }), sx, sy, null, 8);
    if (Math.sin(now() / 400 + n.x) > 0.7) { rc(sx + 5, sy - 14, 1, 3, "#ffffff"); rc(sx + 5, sy - 10, 1, 1, "#ffffff"); }
  }
  var KEY_ROWS = ["..OOO..", ".OYYYO.", ".OYOYO.", ".OYYYO.", "..OYO..", "..OYYO.", "..OYO..", "..OYYO.", "..OYO..", "...O..."];
  function drawItem(it, sx, sy) {
    var bob = Math.round(Math.sin(now() / 250 + it.x) * 1.5);
    cx.fillStyle = "rgba(10,20,10,.28)"; cx.fillRect(sx - 4, sy + 6, 8, 2);
    sy -= 2 - bob + 0;
    if (it.kind === "key") put(spr("key", KEY_ROWS, { O: P.out, Y: P.y1 }), sx, sy, null, 5);
    else if (it.kind === "brake") { disc(sx, sy, 6, P.out); disc(sx, sy, 5, P.r2); disc(sx, sy - 1, 4, P.r1); rc(sx - 4, sy - 2, 8, 3, "#ffffff"); rc(sx - 4, sy - 2, 8, 1, P.st1); }
    else if (it.kind === "float") { disc(sx, sy, 7, P.out); disc(sx, sy, 6, P.r1); disc(sx, sy, 2, P.out); disc(sx, sy, 1, P.w2); rc(sx - 6, sy - 1, 3, 2, "#ffffff"); rc(sx + 3, sy - 1, 3, 2, "#ffffff"); rc(sx - 1, sy - 6, 2, 3, "#ffffff"); rc(sx - 1, sy + 3, 2, 3, "#ffffff"); }
    else { disc(sx, sy, 6, P.out); disc(sx, sy, 5, P.y2); disc(sx, sy - 1, 4, P.y1); rc(sx - 1, sy - 4, 2, 8, P.e3); rc(sx - 4, sy - 1, 8, 2, P.e3); rc(sx - 3, sy - 3, 2, 1, P.y0); }
  }
  function drawBoss(o, sx, sy) {
    var sq = Math.round(Math.sin(o.bob) * 1.5), fl = o.flash > 0 && ((now() / 70 | 0) % 2), body = fl ? "#ffffff" : "#5ee27a", hi = fl ? "#ffffff" : "#b6ffbf", lo = fl ? "#dddddd" : "#2fa84e";
    cx.fillStyle = "rgba(10,20,10,.28)"; cx.fillRect(sx - 12, sy + 10, 24, 3);
    rc(sx - 13, sy - 7 - sq, 26, 19 + sq, P.out); rc(sx - 12, sy - 6 - sq, 24, 17 + sq, body); rc(sx - 12, sy + 7, 24, 4, lo); rc(sx - 10, sy - 5 - sq, 8, 2, hi); rc(sx - 11, sy - 3 - sq, 2, 4, hi);
    rc(sx - 8, sy - 1 - sq, 5, 6, P.out); rc(sx + 3, sy - 1 - sq, 5, 6, P.out); rc(sx - 7, sy - sq, 3, 3, "#ffffff"); rc(sx + 4, sy - sq, 3, 3, "#ffffff"); rc(sx - 6, sy + 1 - sq, 2, 2, P.out); rc(sx + 5, sy + 1 - sq, 2, 2, P.out);
    rc(sx - 5, sy + 6 - sq, 10, 2, P.out);
    rc(sx - 9, sy - 12 - sq, 18, 6, P.out); rc(sx - 8, sy - 11 - sq, 16, 4, P.y1); rc(sx - 8, sy - 11 - sq, 16, 1, P.y0); rc(sx - 8, sy - 15 - sq, 4, 4, P.out); rc(sx - 7, sy - 14 - sq, 2, 3, P.y1); rc(sx - 2, sy - 17 - sq, 4, 5, P.out); rc(sx - 1, sy - 16 - sq, 2, 4, P.y1); rc(sx + 4, sy - 15 - sq, 4, 4, P.out); rc(sx + 5, sy - 14 - sq, 2, 3, P.y1);
    rc(sx - 1, sy - 10 - sq, 2, 2, P.r1);
    for (var i = 0; i < 3; i++) { rc(sx - 10 + i * 7, sy + 13, 6, 3, P.out); rc(sx - 9 + i * 7, sy + 14, 4, 1, i < o.hp ? P.r1 : P.st3); }
  }
  // drapeau d'un seul tenant : mât, étoffe qui ondule, socle
  function drawFlag(sx, sy, t, on) {
    var w = Math.floor(t / 200) % 4, wave = [0, 1, 1, 0][w];
    cx.fillStyle = "rgba(10,20,10,.25)"; cx.fillRect(sx - 3, sy + 4, 8, 2);
    rc(sx - 3, sy + 2, 7, 3, P.out); rc(sx - 2, sy + 2, 5, 2, P.st2); rc(sx - 2, sy + 2, 5, 1, P.st1);
    rc(sx - 1, sy - 14, 3, 17, P.out); rc(sx, sy - 13, 1, 15, P.st0);
    var c0 = on ? P.y1 : P.r1, c1 = on ? P.y0 : P.r0, c2 = on ? P.y2 : P.r2;
    rc(sx + 1, sy - 15, 11 + wave, 9, P.out);
    rc(sx + 2, sy - 14, 9 + wave, 7, c0); rc(sx + 2, sy - 14, 9 + wave, 2, c1); rc(sx + 2, sy - 9, 9 + wave, 2, c2);
    rc(sx, sy - 15, 3, 3, P.out); rc(sx, sy - 14, 2, 2, P.y1);
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    view.S = Math.max(2, Math.round(cw / 240));
    view.aw = Math.floor(cw / view.S); view.ah = Math.floor(ch / view.S);
    canvas.width = view.aw; canvas.height = view.ah;
    canvas.style.width = view.aw * view.S + "px"; canvas.style.height = view.ah * view.S + "px";
    canvas.style.left = Math.floor((cw - view.aw * view.S) / 2) + "px"; canvas.style.top = Math.floor((ch - view.ah * view.S) / 2) + "px";
    cx.imageSmoothingEnabled = false;
    var portrait = ch > cw * 1.05;
    view.lm = portrait ? 0 : Math.ceil(80 / view.S); view.tm = portrait ? Math.ceil(60 / view.S) : 0;
  }
  function draw(t) {
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = L && L.dark ? P.c6 : P.g6; cx.fillRect(0, 0, view.aw, view.ah);
    if (!grid) return;
    var camx = Math.round(cam.x), camy = Math.round(cam.y), tx0 = Math.floor(camx / TILE), ty0 = Math.floor(camy / TILE), tx1 = Math.floor((camx + view.aw) / TILE), ty1 = Math.floor((camy + view.ah) / TILE), x, y;
    for (y = ty0; y <= ty1; y++) for (x = tx0; x <= tx1; x++) cx.drawImage(tileImage(x, y), x * TILE - camx, y * TILE - camy);
    waterGlints(camx, camy, tx0, ty0, tx1, ty1, t);
    L.feat.flags.forEach(function (f, idx) {
      var c = center(f), sx = Math.round(c.x - camx), sy = Math.round(c.y - camy) + 4;
      if (sx < -20 || sx > view.aw + 20 || sy < -20 || sy > view.ah + 24) return;
      drawFlag(sx, sy, t, S.cp.l === lvIdx && S.cp.i === idx);
    });
    if (L.feat.temple && allPieces()) { var tc = center(L.feat.temple), pul = 8 + Math.round(Math.sin(t / 200) * 2); cx.globalAlpha = 0.5; disc(tc.x - camx, tc.y - camy, pul, C.purple); cx.globalAlpha = 1; }
    // lutins triés par profondeur
    var list = [];
    slimes.forEach(function (s) { if (s.alive) list.push({ y: s.y, f: function () { drawSlime(s, Math.round(s.x - camx), Math.round(s.y - camy)); } }); });
    npcs.forEach(function (n) { list.push({ y: n.y, f: function () { drawNpc(n, Math.round(n.x - camx), Math.round(n.y - camy)); } }); });
    items.forEach(function (it) { list.push({ y: it.y, f: function () { drawItem(it, Math.round(it.x - camx), Math.round(it.y - camy)); } }); });
    if (boss) list.push({ y: boss.y, f: function () { drawBoss(boss, Math.round(boss.x - camx), Math.round(boss.y - camy)); } });
    if (mode !== "menu") list.push({ y: B.y, f: drawHero });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) { o.f(); });
    birds.forEach(function (o) { drawBird(Math.round(o.x - camx), Math.round(o.y - camy - 6), false); });
    bats.forEach(function (o) { if (o.alive) drawBat(o, Math.round(o.x - camx), Math.round(o.y - camy - 6)); });
    eagles.forEach(function (e) { if (e.alive) drawBird(Math.round(e.x - camx), Math.round(e.y - camy - 10), true); });
    fx.forEach(function (f) {
      var sx = f.x - camx, sy = f.y - camy;
      if (f.k === "splash") { var u = f.t / 0.6; ring(sx, sy, 4 + u * 12, C.white, 1 - u); ring(sx, sy, 2 + u * 7, C.waterHi, 1 - u); }
      else if (f.k === "puff") { var u2 = f.t / 0.4; ring(sx, sy, 3 + u2 * 8, C.white, 1 - u2); }
    });
    floaters.forEach(function (f) { pxText(f.x - camx, f.y - camy, f.text, f.col); });
    // visée : traînée de points noirs et blancs
    if (mode === "play" && !B.rolling && overlay.hidden) {
      var ang = aim.ang, pw = aim.pow, show = false;
      if (aim.drag) { var ddx = aim.drag.sx - aim.drag.cx, ddy = aim.drag.sy - aim.drag.cy, dl = Math.sqrt(ddx * ddx + ddy * ddy); if (dl > 5) { ang = Math.atan2(ddy, ddx); pw = clamp((dl - 5) / 50, 0.05, 1); show = true; aim.ang = ang; aim.pow = pw; B.fx = Math.cos(ang); B.fy = Math.sin(ang); } }
      else if (aim.on) show = true;
      if (show) {
        var n = Math.max(2, Math.floor((10 + pw * 90) / 5)), col = "hsl(" + Math.round(120 - 120 * pw) + ",90%,55%)";
        for (var i = 1; i <= n; i++) { var dd = 8 + i * 5, px = B.x + Math.cos(ang) * dd - camx, py = B.y + Math.sin(ang) * dd - camy; disc(px, py, i === n ? 2 : 1, C.black); disc(px, py, i === n ? 1 : 0, i === n ? col : C.white); rc(px, py, 1, 1, i === n ? col : C.white); }
        hudPowerSet(pw, col);
      } else {
        var bob = Math.round(Math.sin(t / 240)), bx = Math.round(B.x - camx), by = Math.round(B.y - camy);
        rc(bx - 2, by - 12 + bob, 5, 3, C.black); rc(bx - 1, by - 11 + bob, 3, 1, C.white); rc(bx, by - 10 + bob, 1, 1, C.white);
      }
    }
    var m = msgText && now() < msgT ? msgText : "";
    if (m !== draw.shown) { draw.shown = m; hudMsg.textContent = m; hudMsg.hidden = !m; }
  }
  function ring(x, y, r, col, a) { cx.globalAlpha = Math.max(0, a); cx.fillStyle = col; var n = Math.max(12, Math.round(r * 5)); for (var i = 0; i < n; i++) { var an = i / n * 6.2832; cx.fillRect(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), 1, 1); } cx.globalAlpha = 1; }
  function hudPowerSet(p, col) { if (powEl) { powEl.parentNode.style.setProperty("--p", Math.round(p * 100)); powEl.style.background = col || ""; } }

  /* =====================================================================
     BOUCLE
     ===================================================================== */
  var lastT = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (root.hidden) { lastT = ts; return; }   // l'autre jeu de la page est affiché : on ne calcule rien
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    if (S && L && (mode === "play" || mode === "won")) {
      if (overlay.hidden || mode === "won") {
        acc += dt;
        while (acc >= STEP) { acc -= STEP; if (B.rolling) stepBall(STEP); }
        updateAll(dt);
      }
      var tx = B.x - (view.lm + (view.aw - view.lm) / 2), ty = B.y - (view.tm + (view.ah - view.tm) / 2);
      tx = clamp(tx, Math.min(0, L.W * TILE - view.aw), Math.max(0, L.W * TILE - view.aw)); ty = clamp(ty, Math.min(0, L.H * TILE - view.ah), Math.max(0, L.H * TILE - view.ah));
      var k = Math.min(1, dt * (B.rolling ? 7 : 5));
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    }
    draw(ts);
  }

  /* =====================================================================
     SAISIE
     ===================================================================== */
  function artPos(ev) { var r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) / view.S, y: (ev.clientY - r.top) / view.S }; }
  function brake() { if (B.rolling && S && S.items.brake) B.brake = 0.7; }
  canvas.addEventListener("pointerdown", function (ev) {
    if (mode !== "play" || !overlay.hidden) return;
    ac();
    if (B.rolling) { brake(); return; }
    var p = artPos(ev);
    aim.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, id: ev.pointerId }; aim.on = false;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", function (ev) { if (aim.drag && aim.drag.id === ev.pointerId) { var p = artPos(ev); aim.drag.cx = p.x; aim.drag.cy = p.y; } });
  function endPtr(ev, fire) {
    if (!aim.drag || aim.drag.id !== ev.pointerId) return;
    var d = aim.drag; aim.drag = null;
    if (!fire) return;
    var dx = d.sx - d.cx, dy = d.sy - d.cy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 5) shoot(Math.atan2(dy, dx), clamp((l - 5) / 50, 0.05, 1));
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
    if (k === "b") { brake(); return; }
    if (B.rolling) { if (k === " " || k === "Enter") brake(); return; }
    if (k === " " || k === "Enter") { if (!aim.on) aim.on = true; else shoot(aim.ang, aim.pow); return; }
    if (k === "Escape") { aim.on = false; return; }
    var fine = ev.shiftKey ? 0.2 : 1, used = true;
    if (k === "ArrowLeft" || k === "a" || k === "q") aim.ang -= 0.05 * fine; else if (k === "ArrowRight" || k === "d") aim.ang += 0.05 * fine;
    else if (k === "ArrowUp" || k === "w" || k === "z") aim.pow = clamp(aim.pow + 0.04, 0.05, 1); else if (k === "ArrowDown" || k === "s") aim.pow = clamp(aim.pow - 0.04, 0.05, 1);
    else used = false;
    if (used) { aim.on = true; B.fx = Math.cos(aim.ang); B.fy = Math.sin(aim.ang); }
  });
  brakeBtn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); brake(); ev.preventDefault(); });
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
    var kEl = $("[data-keys]", root); if (kEl) { kEl.textContent = "Clés " + S.keys; kEl.hidden = !S.keys; }
  }
  function showCard(html, cls) { cardEl.className = "panel game-card ga-card" + (cls ? " " + cls : ""); cardEl.innerHTML = html; overlay.hidden = false; }
  function closeCard() { overlay.hidden = true; }
  function fmtTime(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return m + " min " + ("0" + (s % 60)).slice(-2) + " s"; }
  function showMenu() {
    var sv = loadSave();
    var info = sv ? "<p class=\"ga-best\">Partie en cours : <strong>" + (sv.pieces.reduce(function (a, b) { return a + b; }, 0)) + "/4</strong> Morceaux de Tee · " + (BASE_STROKES + CLUB_BONUS * sv.clubs) + " coups max · " + fmtTime(sv.ms) + "</p>" : "";
    showCard("<h2>⛳ Golfaventure</h2><p>Tu es une petite balle, et tes <strong>coups</strong> sont ta vie. Explore le monde et son souterrain, frappe les drapeaux pour sauvegarder, évite l'eau et le sable, et rapporte les <strong>4 Morceaux de Tee</strong> au temple.</p>" + info +
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
  S = loadSave() || newSave(); LV = [buildOverworld(), buildCave(), buildDungeon()]; LV.forEach(function (l, i) { applyLevelState(i); }); enterLevel(0);   // décor du menu
  B.x = LV[0].feat.flags[0][0] * TILE; B.y = LV[0].feat.flags[0][1] * TILE;
  cam.x = B.x - view.aw / 2; cam.y = B.y - view.ah / 2;
  requestAnimationFrame(frame);
  showMenu();
  if (/[?&]debug/.test(location.search)) window.GA_DEBUG = {
    S: function () { return S; }, B: B, levels: function () { return LV; }, level: function () { return lvIdx; }, TY: TY, start: startGame, shoot: shoot, strokes: function () { return strokes; },
    step: function (n) { for (var i = 0; i < n; i++) if (B.rolling) stepBall(STEP); }, setStrokes: function (n) { strokes = n; hudUpdate(); }, update: updateAll, mode: function () { return mode; },
    enter: function (i) { enterLevel(i); }, place: placeBall, setS: function (o) { S = JSON.parse(JSON.stringify(o)); }, boss: function () { return boss; }, rebuild: function () { LV = [buildOverworld(), buildCave(), buildDungeon()]; if (allPieces()) LV[0].feat.gates.forEach(function (f) { LV[0].grid[f[1] * LV[0].W + f[0]] = TY.GRASS; }); LV.forEach(function (l, i) { applyLevelState(i); }); enterLevel(lvIdx); }, kill: function () { slimes = []; bats = []; birds = []; eagles = []; }, slimes: function () { return slimes; }, bats: function () { return bats; }, cam: cam,
  };
})();
