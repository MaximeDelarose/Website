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
  }
  function pressSwitch(color, x, y) {
    var key = lvIdx + ":" + color;
    if (S.sw[key]) return;
    S.sw[key] = 1; applyLevelState(lvIdx); sfx("switch"); persist();
    fx.push({ k: "puff", x: x, y: y, t: 0 });
    setMsg("Un mécanisme s'active ! Une porte s'ouvre quelque part…", 3000);
  }
  function openTile(tx, ty, why) {
    var i = ty * L.W + tx; grid[i] = L.dark ? TY.CFLOOR : TY.GRASS; S.opened[lvIdx + ":" + i] = 1; persist();
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
    var i = ty * L.W + tx; grid[i] = TY.GRASS; S.bushes[lvIdx + ":" + i] = 1; sfx("bush");
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
    S.cups[key] = 1; S.clubs++;
    if (tn === TY.HOLY) {
      var idx = -1; L.feat.holy.forEach(function (h) { if (h[0] === tx && h[1] === ty) idx = h[2]; });
      if (idx >= 0) S.pieces[idx] = 1;
      var n = S.pieces.reduce(function (a, b2) { return a + b2; }, 0);
      setMsg("Morceau de Tee " + n + "/4 ! (+3 coups max)", 3000);
      if (n === 4) { LV[0].feat.gates.forEach(function (f) { LV[0].grid[f[1] * LV[0].W + f[0]] = TY.GRASS; }); setTimeout(function () { setMsg("Le temple s'ouvre, au nord !", 3200); }, 3100); }
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
     RENDU PIXEL ART
     ===================================================================== */
  var C = {
    fair: "#a8e63a", fair2: "#96d632", stripe: "#c6f55c", side: "#139a56", side2: "#0e7f49",
    rough: "#7cbf2a", rough2: "#5da31f", tree: "#0b5a33", tree2: "#0f7a44", treeHi: "#34aa5c", forest: "#1f8f4e",
    sand: "#f3eea0", sandDot: "#7a7440", water: "#27a9f1", waterHi: "#8dd8ff",
    white: "#ffffff", black: "#14141e", gray: "#cdd2dc", yellow: "#f6c445", brown: "#7a4b00",
    red: "#d8322b", red2: "#ef6a52", cream: "#fdf3de", orange: "#e8872a", wood: "#b9763a", wood2: "#7c4a1e", purple: "#b06cf0",
    cfloor: "#6f82a8", cfloor2: "#62749a", cwall: "#2a2440", cwall2: "#443a66", cwallHi: "#5a4d82", stone: "#8a8f9c",
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
  function caveBase(g, v) {
    fr(g, 0, 0, 16, 16, C.cfloor);
    for (var i = 0; i < 12; i++) fr(g, Math.floor(hash(i, v, 51) * 16), Math.floor(hash(i, v, 52) * 16), 1, 1, C.cfloor2);
    if (v === 1) { fr(g, 5, 9, 2, 1, C.cfloor2); fr(g, 6, 10, 1, 1, C.cfloor2); }
  }
  function blob(g, cx0, cy0, r, col) { for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - y * y)); fr(g, cx0 - w, cy0 + y, 2 * w + 1, 1, col); } }
  function chev(g, dir, col) {
    var pts = [];
    for (var k = 0; k < 3; k++) for (var j = -3; j <= 3; j++) {
      var a = 3 - Math.abs(j), base = 3 + k * 5;
      if (dir === 8) pts.push([8 + j, base + a]); else if (dir === 7) pts.push([8 + j, base + 3 - a + 1]);
      else if (dir === 10) pts.push([base + a, 8 + j]); else pts.push([base + 3 - a + 1, 8 + j]);
    }
    pts.forEach(function (p) { fr(g, p[0], p[1], 1, 1, col); fr(g, p[0], p[1] + 1, 1, 1, col); });
  }
  function drawTile(t, v, f, lv) {
    return mk(function (g) {
      var base = lv ? caveBase : grassBase;
      if (t === TY.GRASS || t === TY.FLAG || t === TY.CUP || t === TY.HOLY || t === TY.TEMPLE) base(g, v);
      if (t === TY.CFLOOR) caveBase(g, v);
      if (t === TY.ROUGH) { fr(g, 0, 0, 16, 16, C.rough); for (var i = 0; i < 10; i++) { var x = Math.floor(hash(i, v, 21) * 14) + 1, y = Math.floor(hash(i, v, 22) * 12) + 2; fr(g, x, y, 1, 3, C.rough2); fr(g, x + 1, y + 1, 1, 2, C.rough2); } }
      else if (t === TY.SAND) { fr(g, 0, 0, 16, 16, C.sand); for (var j = 0; j < 9; j++) fr(g, Math.floor(hash(j, v, 31) * 16), Math.floor(hash(j, v, 32) * 16), 1, 1, C.sandDot); }
      else if (t === TY.WATER) { fr(g, 0, 0, 16, 16, C.water); var o = f ? 4 : 0; fr(g, 2 + o, 3, 4, 1, C.waterHi); fr(g, 9 - o, 10, 4, 1, C.waterHi); fr(g, 5 + o, 14, 3, 1, C.waterHi); }
      else if (t === TY.TREE) {
        fr(g, 0, 0, 16, 16, C.forest);
        blob(g, 8, 9, 7, C.black); blob(g, 8, 8, 6, C.tree); blob(g, 6, 6, 3, C.tree2); fr(g, 5, 5, 2, 1, C.treeHi); fr(g, 4, 6, 1, 1, C.treeHi);
        for (var q = 0; q < 6; q++) fr(g, 3 + Math.floor(hash(q, v, 41) * 10), 4 + Math.floor(hash(q, v, 42) * 9), 1, 1, C.tree2);
      }
      else if (t === TY.RAIL) { fr(g, 0, 0, 16, 16, C.black); for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 3; xx++) fr(g, 1 + xx * 5, 1 + yy * 5, 4, 4, (xx + yy) & 1 ? C.gray : C.white); }
      else if (t === TY.GATE) { fr(g, 0, 0, 16, 16, C.black); for (var y2 = 0; y2 < 3; y2++) for (var x2 = 0; x2 < 3; x2++) fr(g, 1 + x2 * 5, 1 + y2 * 5, 4, 4, (x2 + y2) & 1 ? "#c98a1a" : C.yellow); }
      else if (t === TY.BUSH) { base(g, v); blob(g, 8, 9, 6, C.black); blob(g, 8, 8, 5, "#2f9a3a"); blob(g, 6, 6, 2, "#5cc464"); fr(g, 10, 9, 2, 2, C.red); fr(g, 5, 11, 2, 2, C.red); fr(g, 9, 5, 2, 2, C.red2); }
      else if (t >= TY.UP && t <= TY.RIGHT) {
        fr(g, 0, 0, 16, 16, lv ? C.cfloor2 : C.fair2);
        for (var s = 0; s < 16; s += 4) { if (t === TY.UP || t === TY.DOWN) fr(g, 0, s, 16, 2, lv ? C.cfloor : C.fair); else fr(g, s, 0, 2, 16, lv ? C.cfloor : C.fair); }
        chev(g, t, lv ? "#3c4a70" : C.side);
      }
      else if (t === TY.PLATEAU) { fr(g, 0, 0, 16, 16, C.fair); for (var d = -16; d < 16; d += 6) for (var e = 0; e < 16; e++) { var px = d + e; if (px >= 0 && px < 16) fr(g, px, e, 2, 1, C.stripe); } }
      else if (t === TY.BRIDGE) { fr(g, 0, 0, 16, 16, C.wood2); for (var p = 0; p < 16; p += 4) { fr(g, p, 1, 3, 14, C.wood); fr(g, p, 1, 3, 1, "#d99a58"); } fr(g, 0, 0, 16, 1, C.black); fr(g, 0, 15, 16, 1, C.black); }
      else if (t >= TY.SW0 && t <= TY.SW2) {
        base(g, v); var sc = SW_COL[t - TY.SW0]; blob(g, 8, 8, 7, C.black);
        if (f) { blob(g, 8, 8, 6, "#3a3a4a"); blob(g, 8, 8, 3, sc); } else { blob(g, 8, 8, 6, sc); blob(g, 8, 8, 4, C.white); blob(g, 8, 8, 3, sc); fr(g, 5, 5, 2, 1, C.white); }
      }
      else if (t >= TY.DR0 && t <= TY.DR2) {
        var dc = [["#d8322b", "#8a1d18"], ["#3a74e0", "#244a96"], ["#3fd05a", "#23903a"]][t - TY.DR0];
        fr(g, 0, 0, 16, 16, C.black); for (var d2 = 0; d2 < 3; d2++) for (var e2 = 0; e2 < 3; e2++) fr(g, 1 + e2 * 5, 1 + d2 * 5, 4, 4, (d2 + e2) & 1 ? dc[1] : dc[0]);
        fr(g, 6, 6, 4, 4, C.black); fr(g, 7, 7, 2, 2, C.white);
      }
      else if (t === TY.KDOOR) { fr(g, 0, 0, 16, 16, C.black); fr(g, 1, 1, 14, 14, "#c98a1a"); fr(g, 2, 2, 12, 12, C.yellow); blob(g, 8, 7, 2, C.black); fr(g, 7, 8, 2, 4, C.black); }
      else if (t === TY.CRACK) {
        fr(g, 0, 0, 16, 16, C.black); fr(g, 1, 1, 14, 14, "#8a6a4a"); fr(g, 1, 1, 14, 2, "#b08c62"); fr(g, 3, 9, 4, 3, "#775a3c"); fr(g, 10, 4, 3, 3, "#775a3c");
        fr(g, 7, 1, 1, 4, C.black); fr(g, 6, 5, 1, 3, C.black); fr(g, 7, 8, 1, 3, C.black); fr(g, 8, 11, 1, 4, C.black); fr(g, 9, 6, 2, 1, C.black);
      }
      else if (t === TY.ICE) {
        fr(g, 0, 0, 16, 16, "#bfe9ff"); for (var i3 = 0; i3 < 5; i3++) fr(g, Math.floor(hash(i3, v, 61) * 14), Math.floor(hash(i3, v, 62) * 14), 2, 1, "#8ccdf0");
        for (var k3 = 0; k3 < 3; k3++) { fr(g, 2 + k3 * 5 + (v & 1), 3 + k3 * 3, 3, 1, "#f2fbff"); fr(g, 3 + k3 * 5 + (v & 1), 4 + k3 * 3, 2, 1, "#f2fbff"); }
      }
      else if (t === TY.BUMP) { base(g, v); blob(g, 8, 9, 7, "rgba(0,0,0,.25)"); blob(g, 8, 8, 7, C.black); blob(g, 8, 8, 6, "#ff6a3a"); blob(g, 7, 7, 4, "#ffa070"); fr(g, 7, 4, 2, 8, C.white); fr(g, 4, 7, 8, 2, C.white); fr(g, 5, 5, 1, 1, C.white); }
      else if (t === TY.CWALL) {
        fr(g, 0, 0, 16, 16, C.cwall);
        for (var r = 0; r < 4; r++) { var off = (r & 1) * 4; for (var c = -1; c < 3; c++) { var bx = c * 8 + off, x0 = Math.max(0, bx), x1 = Math.min(16, bx + 7); if (x1 > x0) { fr(g, x0, r * 4, x1 - x0, 3, C.cwall2); fr(g, x0, r * 4, x1 - x0, 1, C.cwallHi); } } }
      }
      else if (t === TY.PORTAL) {
        if (!lv) { base(g, v); fr(g, 1, 2, 14, 14, C.black); fr(g, 2, 3, 12, 13, C.stone); fr(g, 3, 4, 10, 12, C.black); fr(g, 4, 8, 8, 1, "#2a2a3a"); fr(g, 4, 11, 8, 1, "#3a3a4e"); fr(g, 4, 14, 8, 1, "#4a4a62"); fr(g, 1, 2, 14, 1, C.stone); }
        else { caveBase(g, v); fr(g, 3, 1, 10, 14, C.black); fr(g, 4, 2, 8, 12, "#1a1a2a"); fr(g, 5, 2, 2, 12, C.wood); fr(g, 9, 2, 2, 12, C.wood); for (var rg = 0; rg < 4; rg++) fr(g, 5, 4 + rg * 3, 6, 1, "#d99a58"); fr(g, 7, 0, 2, 1, C.yellow); fr(g, 6, 1, 4, 1, C.yellow); }
      }
      if (t === TY.FLAG) { fr(g, 7, 6, 2, 9, C.black); fr(g, 7, 5, 1, 10, C.white); fr(g, 5, 14, 6, 2, C.black); }
      if (t === TY.CUP) { blob(g, 8, 8, 7, C.side2); blob(g, 8, 8, 6, C.black); }
      if (t === TY.HOLY) { blob(g, 8, 8, 8, C.black); blob(g, 8, 8, 7, C.yellow); blob(g, 8, 8, 6, C.black); fr(g, 3, 8, 1, 1, C.white); }
      if (t === TY.TEMPLE) { blob(g, 8, 8, 8, C.black); blob(g, 8, 8, 7, C.purple); blob(g, 8, 8, 6, C.black); }
    });
  }
  function tileImg(t, tx, ty) {
    var v = t === TY.TREE || t === TY.WATER ? (hash(tx, ty, 5) < 0.5 ? 0 : 1) : Math.floor(hash(tx, ty, 6) * 4);
    var f = t === TY.WATER ? ((now() / 600 | 0) + tx + ty) & 1 : (t >= TY.SW0 && t <= TY.SW2 ? (S.sw[lvIdx + ":" + (t - TY.SW0)] ? 1 : 0) : 0), lv = lvIdx;
    var key = t + "_" + v + "_" + f + "_" + lv;
    return atlas[key] || (atlas[key] = drawTile(t, v, f, lv));
  }
  function cupDoneImg(holy) {
    var k = "d" + (holy ? "h" : "c") + lvIdx;
    return atlas[k] || (atlas[k] = mk(function (g) { (lvIdx ? caveBase : grassBase)(g, 0); blob(g, 8, 8, holy ? 8 : 7, "#3a5a3a"); blob(g, 8, 8, 6, "#243a24"); fr(g, 7, 5, 2, 6, C.cream); fr(g, 5, 7, 6, 2, C.cream); }));
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
  function drawSlime(s, sx, sy) {
    var sq = Math.round(Math.sin(s.bob) * 1);
    disc(sx, sy + 4, 4, "rgba(0,0,0,.25)");
    rc(sx - 5, sy - 3 - sq, 10, 8 + sq, C.black); rc(sx - 4, sy - 2 - sq, 8, 7 + sq, "#3fd05a"); rc(sx - 4, sy - 2 - sq, 8, 2, "#8cf08a");
    rc(sx - 3, sy - sq, 2, 2, C.black); rc(sx + 1, sy - sq, 2, 2, C.black); rc(sx - 3, sy - sq, 1, 1, C.white); rc(sx + 1, sy - sq, 1, 1, C.white);
  }
  function drawBat(o, sx, sy) {
    var w = Math.floor(o.ph) % 2;
    rc(sx - 7, sy - 2 + (w ? -2 : 1), 5, 3, C.black); rc(sx + 2, sy - 2 + (w ? -2 : 1), 5, 3, C.black);
    rc(sx - 6, sy - 1 + (w ? -2 : 1), 4, 1, "#7a4ab0"); rc(sx + 2, sy - 1 + (w ? -2 : 1), 4, 1, "#7a4ab0");
    rc(sx - 3, sy - 3, 6, 6, C.black); rc(sx - 2, sy - 2, 4, 4, "#5a3a8a"); rc(sx - 2, sy - 4, 1, 2, C.black); rc(sx + 1, sy - 4, 1, 2, C.black); rc(sx - 2, sy - 1, 1, 1, C.red2); rc(sx + 1, sy - 1, 1, 1, C.red2);
  }
  function drawBird(sx, sy, big) {
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
  function drawBoss(o, sx, sy) {
    var sq = Math.round(Math.sin(o.bob) * 1.5), fl = o.flash > 0 && ((now() / 70 | 0) % 2);
    disc(sx, sy + 9, 11, "rgba(0,0,0,.25)");
    rc(sx - 12, sy - 8 - sq, 24, 18 + sq, C.black); rc(sx - 11, sy - 7 - sq, 22, 16 + sq, fl ? C.white : "#3fd05a"); rc(sx - 11, sy - 7 - sq, 22, 4, fl ? C.white : "#8cf08a");
    rc(sx - 7, sy - 2 - sq, 4, 5, C.black); rc(sx + 3, sy - 2 - sq, 4, 5, C.black); rc(sx - 7, sy - 2 - sq, 2, 2, C.white); rc(sx + 3, sy - 2 - sq, 2, 2, C.white);
    rc(sx - 5, sy + 5 - sq, 10, 2, C.black);
    rc(sx - 8, sy - 13 - sq, 16, 6, C.black); rc(sx - 7, sy - 12 - sq, 14, 4, C.yellow); rc(sx - 7, sy - 15 - sq, 3, 3, C.yellow); rc(sx - 1, sy - 16 - sq, 3, 4, C.yellow); rc(sx + 4, sy - 15 - sq, 3, 3, C.yellow);
    for (var i = 0; i < 3; i++) rc(sx - 9 + i * 7, sy + 12, 5, 2, i < o.hp ? C.red : "#3a3a4a");
  }
  function drawNpc(n, sx, sy) {
    var cols = ["#6a4bd0", "#d0842a", "#2a8a6a", "#c0407a"], c = cols[n.d % 4];
    disc(sx, sy + 7, 4, "rgba(0,0,0,.25)");
    rc(sx - 4, sy - 2, 8, 9, C.black); rc(sx - 3, sy - 1, 6, 7, c); rc(sx - 3, sy + 3, 6, 1, "rgba(0,0,0,.25)");
    rc(sx - 3, sy - 9, 6, 7, C.black); rc(sx - 2, sy - 8, 4, 5, "#f2c79a"); rc(sx - 4, sy - 10, 8, 3, C.black); rc(sx - 3, sy - 10, 6, 2, c); rc(sx - 2, sy - 6, 1, 1, C.black); rc(sx + 1, sy - 6, 1, 1, C.black);
    if (Math.sin(now() / 400 + n.x) > 0.7) { rc(sx + 4, sy - 12, 1, 3, C.white); rc(sx + 4, sy - 8, 1, 1, C.white); }
  }
  function drawItem(it, sx, sy) {
    var bob = Math.round(Math.sin(now() / 250 + it.x) * 1.5);
    disc(sx, sy + 5, 3, "rgba(0,0,0,.25)");
    if (it.kind === "brake") { disc(sx, sy - 2 + bob, 5, C.black); disc(sx, sy - 2 + bob, 4, C.red); rc(sx - 3, sy - 3 + bob, 6, 2, C.white); }
    else if (it.kind === "key") { disc(sx, sy - 3 + bob, 3, C.black); disc(sx, sy - 3 + bob, 2, C.yellow); rc(sx - 1, sy - 1 + bob, 2, 6, C.black); rc(sx, sy - 1 + bob, 1, 5, C.yellow); rc(sx, sy + 3 + bob, 3, 1, C.yellow); rc(sx, sy + 1 + bob, 2, 1, C.yellow); }
    else if (it.kind === "float") { disc(sx, sy - 2 + bob, 6, C.black); disc(sx, sy - 2 + bob, 5, C.red); disc(sx, sy - 2 + bob, 2, C.black); rc(sx - 5, sy - 2 + bob, 2, 1, C.white); rc(sx + 3, sy - 2 + bob, 2, 1, C.white); rc(sx - 1, sy - 7 + bob, 2, 1, C.white); }
    else { disc(sx, sy - 2 + bob, 5, C.black); disc(sx, sy - 2 + bob, 4, C.yellow); rc(sx - 1, sy - 5 + bob, 2, 6, C.brown); rc(sx - 3, sy - 3 + bob, 6, 2, C.brown); }
  }
  // la balle-héros : une petite bouille qui regarde où elle va
  function drawHero() {
    var sx = Math.round(B.x - cam.x), sy = Math.round(B.y - cam.y), flash = B.hurt > 0 && ((now() / 80 | 0) % 2);
    if (flash) return;
    disc(sx + 1, sy + 2, BALL_R, "rgba(0,0,0,.35)");
    disc(sx, sy, BALL_R + 1, C.black); disc(sx, sy, BALL_R, "#d8fff4");
    disc(sx, sy, BALL_R - 1, "#bff5e6");
    rc(sx - 3, sy - 3, 2, 1, C.white); rc(sx - 3, sy - 3, 1, 2, C.white);
    var ex = Math.round(B.fx), ey = Math.round(B.fy);
    rc(sx - 3 + ex, sy - 1 + ey, 2, 3, C.black); rc(sx + 1 + ex, sy - 1 + ey, 2, 3, C.black);
    rc(sx - 3 + ex, sy - 1 + ey, 1, 1, C.white); rc(sx + 1 + ex, sy - 1 + ey, 1, 1, C.white);
    if (!B.rolling) { rc(sx - 4, sy + 1, 1, 1, "#ff9aa8"); rc(sx + 3, sy + 1, 1, 1, "#ff9aa8"); }
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
    cx.fillStyle = L && L.dark ? C.black : C.forest; cx.fillRect(0, 0, view.aw, view.ah);
    if (!grid) return;
    var camx = Math.round(cam.x), camy = Math.round(cam.y), tx0 = Math.floor(camx / TILE), ty0 = Math.floor(camy / TILE), tx1 = Math.floor((camx + view.aw) / TILE), ty1 = Math.floor((camy + view.ah) / TILE), x, y;
    for (y = ty0; y <= ty1; y++) for (x = tx0; x <= tx1; x++) {
      var tt = get(x, y), img;
      if ((tt === TY.CUP || tt === TY.HOLY) && S.cups[cupKey(x, y)]) img = cupDoneImg(tt === TY.HOLY); else img = tileImg(tt, x, y);
      cx.drawImage(img, x * TILE - camx, y * TILE - camy);
    }
    if (L.dark) { cx.fillStyle = "rgba(8,14,40,.26)"; cx.fillRect(0, 0, view.aw, view.ah); }
    // drapeaux (étoffe animée)
    L.feat.flags.forEach(function (f, idx) {
      var c = center(f), sx = Math.round(c.x - camx), sy = Math.round(c.y - camy), w = (t / 220 | 0) % 2, on = S.cp.l === lvIdx && S.cp.i === idx;
      if (sx < -20 || sx > view.aw + 20 || sy < -20 || sy > view.ah + 20) return;
      rc(sx, sy - 11, 1, 2, C.white); rc(sx + 1, sy - 11, 7 + w, 6, C.black); rc(sx + 1, sy - 10, 5 + w, 4, on ? C.yellow : C.red); rc(sx + 1, sy - 10, 5 + w, 1, on ? "#fff09a" : C.red2);
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
    enter: function (i) { enterLevel(i); }, place: placeBall, setS: function (o) { S = JSON.parse(JSON.stringify(o)); }, boss: function () { return boss; }, rebuild: function () { LV = [buildOverworld(), buildCave(), buildDungeon()]; LV.forEach(function (l, i) { applyLevelState(i); }); enterLevel(lvIdx); }, kill: function () { slimes = []; bats = []; birds = []; eagles = []; }, slimes: function () { return slimes; }, bats: function () { return bats; }, cam: cam,
  };
})();
