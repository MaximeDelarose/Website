/* =========================================================================
   Ronceclair — action-RPG 2D vu de dessus, version écureuils.
   Jeu indépendant d'Arcane Tactics (aucune dépendance au moteur isométrique).

   Sections : données (CLASSES, ZONES, MOBS, QUESTS, SHOP) · utilitaires · son ·
   sauvegarde · génération de carte · entités · combat · dessin · interface ·
   écrans · entrées · boucle.
   Tout le contenu modifiable à la main est en haut du fichier.
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-ronceclair]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var hudEl = stage.querySelector("[data-hud]");

  var VERSION = "0.1.0";
  var SAVE_KEY = "rc-save-v1";
  var T = 48;                       // taille d'une case en pixels
  var TAU = Math.PI * 2;

  /* ====================== DONNÉES ====================== */

  var CLASSES = {
    gardien:  { name: "Gardien",  fur: "#c98a3a", tail: "#e0a24c", hp: 64, atk: 7, spd: 150, cd: 0.40, kind: "melee",
                special: "Tourbillon", desc: "Griffes et casque de noix. Corps à corps, encaisse beaucoup." },
    lanceur:  { name: "Lanceur",  fur: "#b8662b", tail: "#d98240", hp: 44, atk: 6, spd: 168, cd: 0.42, kind: "shoot",
                special: "Salve de glands", desc: "Lance des glands à distance. Rapide, mais fragile." },
    mystique: { name: "Mystique", fur: "#8f78c8", tail: "#b49be6", hp: 38, atk: 8, spd: 158, cd: 0.62, kind: "magic",
                special: "Nova arcane", desc: "Éclats arcanes qui traversent les ennemis." }
  };

  var ZONES = [
    { id: "clairiere", name: "Clairière de Ronceclair", w: 46, h: 32, seed: 11, lvl: 1, req: 1, village: true,
      col: { g1: "#92d06c", g2: "#86c561", path: "#dcc592", tree: "#2f7a45", tree2: "#3d9556", water: "#62b8dc" },
      mobs: { limace: 6, corbeau: 3 }, trees: 0.2, ponds: 2 },
    { id: "sousbois", name: "Sous-bois moussu", w: 52, h: 36, seed: 23, lvl: 3, req: 3,
      col: { g1: "#6fb15a", g2: "#64a653", path: "#b99f6f", tree: "#1f5e3a", tree2: "#2c7a4b", water: "#4f9fc0" },
      mobs: { limace: 5, corbeau: 4, renard: 4 }, trees: 0.3, ponds: 2 },
    { id: "marais", name: "Marais aux nénuphars", w: 54, h: 38, seed: 37, lvl: 6, req: 5, boss: true,
      col: { g1: "#7fae62", g2: "#74a15b", path: "#a99a68", tree: "#2c5a3c", tree2: "#3b7350", water: "#4d9a8f" },
      mobs: { grenouille: 6, corbeau: 4, renard: 3 }, trees: 0.2, ponds: 7 }
  ];

  var MOBS = {
    limace:     { name: "Limace goulue",   hp: 16, dmg: 5,  spd: 34,  xp: 7,  gold: [1, 2], r: 14, col: "#a0b05a" },
    corbeau:    { name: "Corbeau",         hp: 11, dmg: 4,  spd: 92,  xp: 9,  gold: [1, 3], r: 12, col: "#2d2b3c", fly: true },
    renard:     { name: "Renard rôdeur",   hp: 32, dmg: 8,  spd: 78,  xp: 18, gold: [3, 6], r: 15, col: "#e0763a" },
    grenouille: { name: "Grenouille bondissante", hp: 26, dmg: 7, spd: 0, xp: 15, gold: [2, 5], r: 14, col: "#58b36a" },
    roi:        { name: "Roi-corbeau",     hp: 260, dmg: 11, spd: 70, xp: 150, gold: [40, 60], r: 30, col: "#1f1c2e", boss: true }
  };

  var QUESTS = [
    { id: "q1", name: "Limaces gloutonnes", text: "Chasse 5 limaces qui ravagent la clairière.", kill: "limace", n: 5, xp: 40, gold: 20 },
    { id: "q2", name: "Ciel menaçant",      text: "Chasse 4 corbeaux qui volent nos noisettes.", kill: "corbeau", n: 4, xp: 70, gold: 30 },
    { id: "q3", name: "Rôdeurs du Sous-bois", text: "Écarte 4 renards dans le Sous-bois moussu.", kill: "renard", n: 4, xp: 130, gold: 60 },
    { id: "q4", name: "Le Roi-corbeau",     text: "Vaincs le Roi-corbeau au fond du Marais.", kill: "roi", n: 1, xp: 400, gold: 200 }
  ];

  var SHOP = [
    { id: "potion", name: "Baie de soin", desc: "Rend 45 PV.", cost: function () { return 6; }, consumable: true },
    { id: "queue",  name: "Queue de combat", desc: "+2 attaque par niveau d'amélioration.", cost: function (n) { return 25 + n * 30; }, max: 8 },
    { id: "cape",   name: "Cape de feuilles", desc: "+12 PV max par niveau d'amélioration.", cost: function (n) { return 20 + n * 25; }, max: 8 },
    { id: "bottes", name: "Bottes de mousse", desc: "+8 vitesse par niveau d'amélioration.", cost: function (n) { return 30 + n * 35; }, max: 5 }
  ];

  var STATS = {
    vit: { name: "Vitalité", desc: "+10 PV max" },
    frc: { name: "Force", desc: "+2 attaque" },
    agi: { name: "Agilité", desc: "+8 vitesse, +1 % critique" }
  };

  function xpFor(lvl) { return Math.round(30 * Math.pow(lvl, 1.55)); }
  var MAX_LVL = 30;

  /* ====================== UTILITAIRES ====================== */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function seeded(seed) {           // mulberry32
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash2(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function angDiff(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

  /* ====================== SON ====================== */
  var actx = null;
  function audio() {
    if (actx) return actx;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    return actx;
  }
  function blip(freq, dur, type, vol, slide) {
    var c = audio(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SFX = {
    swing: function () { blip(300, 0.09, "triangle", 0.07, 200); },
    shoot: function () { blip(520, 0.08, "square", 0.05, -240); },
    hit: function () { blip(180, 0.1, "sawtooth", 0.07, -90); },
    hurt: function () { blip(130, 0.2, "sawtooth", 0.1, -70); },
    coin: function () { blip(880, 0.07, "square", 0.05); setTimeout(function () { blip(1320, 0.08, "square", 0.05); }, 60); },
    dash: function () { blip(220, 0.14, "triangle", 0.06, 300); },
    nova: function () { blip(120, 0.35, "sawtooth", 0.1, 400); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, 0.14, "square", 0.06); }, i * 90); }); },
    quest: function () { [660, 880].forEach(function (f, i) { setTimeout(function () { blip(f, 0.16, "triangle", 0.07); }, i * 120); }); },
    portal: function () { blip(300, 0.4, "sine", 0.08, 500); }
  };

  /* ====================== SAUVEGARDE ====================== */
  var profile = null;

  function newProfile(cls) {
    var C = CLASSES[cls];
    return { v: 1, cls: cls, lvl: 1, xp: 0, pts: 0, gold: 10, potions: 1, hp: C.hp,
      stats: { vit: 0, frc: 0, agi: 0 }, gear: { queue: 0, cape: 0, bottes: 0 },
      quest: 0, qn: 0, zone: 0, bossDead: false, chests: {}, kills: 0, time: 0 };
  }
  function loadProfile() {
    try {
      var p = JSON.parse(load(SAVE_KEY, "null"));
      if (p && p.cls && CLASSES[p.cls] && p.v === 1) return p;
    } catch (e) {}
    return null;
  }
  function saveProfile() { if (profile) store(SAVE_KEY, JSON.stringify(profile)); }

  function maxHp() { var C = CLASSES[profile.cls]; return C.hp + (profile.lvl - 1) * 8 + profile.stats.vit * 10 + profile.gear.cape * 12; }
  function atkPower() { var C = CLASSES[profile.cls]; return C.atk + (profile.lvl - 1) * 1.4 + profile.stats.frc * 2 + profile.gear.queue * 2; }
  function moveSpeed() { return CLASSES[profile.cls].spd + profile.stats.agi * 8 + profile.gear.bottes * 8; }
  function critChance() { return 0.08 + profile.stats.agi * 0.01; }

  /* ====================== CARTE ====================== */
  // types de case : 0 herbe, 1 chemin, 2 eau, 3 arbre, 4 rocher
  var BLOCK = { 2: true, 3: true, 4: true };
  var world = null;                 // zone courante

  function genZone(zi) {
    var Z = ZONES[zi], R = seeded(Z.seed), w = Z.w, h = Z.h, x, y, t = [];
    for (y = 0; y < h; y++) { t.push([]); for (x = 0; x < w; x++) t[y].push(0); }

    // arbres : bruit aléatoire lissé
    var A = [];
    for (y = 0; y < h; y++) { A.push([]); for (x = 0; x < w; x++) A[y].push(R() < Z.trees ? 1 : 0); }
    for (var it = 0; it < 2; it++) {
      var B = [];
      for (y = 0; y < h; y++) { B.push([]); for (x = 0; x < w; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || A[yy][xx]) n++; }
        B[y].push(n >= 5 ? 1 : 0);
      } }
      A = B;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (A[y][x]) t[y][x] = 3;

    // mares
    for (var p = 0; p < Z.ponds; p++) {
      var cx = ri2(R, 8, w - 9), cy = ri2(R, 6, h - 7), rx = 2 + R() * 3, ry = 2 + R() * 2.2;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var ex = (x - cx) / rx, ey = (y - cy) / ry; if (ex * ex + ey * ey < 1) t[y][x] = 2; }
    }
    // rochers
    for (var r = 0; r < Math.round(w * h / 90); r++) { x = ri2(R, 2, w - 3); y = ri2(R, 2, h - 3); if (t[y][x] === 0) t[y][x] = 4; }

    // chemin sinueux du point d'entrée au point de sortie, large de 3 cases
    var sy = Math.floor(h / 2), ey2 = Math.floor(h / 2);
    var phase = R() * TAU, amp = h * 0.18;
    for (x = 1; x < w - 1; x++) {
      var cyy = Math.round(sy + Math.sin(x / w * TAU * 1.4 + phase) * amp);
      for (var k = -1; k <= 1; k++) { var py = cyy + k; if (py > 0 && py < h - 1) t[py][x] = 1; }
    }
    // zones dégagées : entrée, sortie, village
    function clear(cx2, cy2, rad, kind) { for (var yy = cy2 - rad; yy <= cy2 + rad; yy++) for (var xx = cx2 - rad; xx <= cx2 + rad; xx++) if (xx > 0 && yy > 0 && xx < w - 1 && yy < h - 1 && dist(xx, yy, cx2, cy2) <= rad + 0.3) t[yy][xx] = kind; }
    var entry = { x: 3, y: Math.round(sy + Math.sin(3 / w * TAU * 1.4 + phase) * amp) };
    var exit = { x: w - 4, y: Math.round(sy + Math.sin((w - 4) / w * TAU * 1.4 + phase) * amp) };
    clear(entry.x, entry.y, 3, 0); clear(exit.x, exit.y, 3, 0);
    if (Z.village) clear(entry.x + 7, entry.y, 4, 0);
    if (Z.boss) clear(w - 10, exit.y, 6, 0);
    // bordure d'arbres
    for (x = 0; x < w; x++) { t[0][x] = 3; t[h - 1][x] = 3; }
    for (y = 0; y < h; y++) { t[y][0] = 3; t[y][w - 1] = 3; }
    // la bordure s'ouvre devant les portails
    for (var o = -1; o <= 1; o++) { t[entry.y + o][0] = Z.village ? 3 : 0; t[exit.y + o][w - 1] = 0; }
    if (zi > 0) for (o = -1; o <= 1; o++) t[entry.y + o][0] = 0;
    if (zi === ZONES.length - 1) for (o = -1; o <= 1; o++) t[exit.y + o][w - 1] = 3;

    // coffres (positions stables grâce à la graine)
    var chests = [], tries = 0;
    while (chests.length < 3 && tries++ < 400) {
      x = ri2(R, 6, w - 7); y = ri2(R, 4, h - 5);
      if (t[y][x] === 0 && dist(x, y, entry.x, entry.y) > 6) chests.push({ x: x, y: y, i: chests.length });
    }
    // décors (fleurs / champignons / nénuphars), purement visuels
    var deco = [];
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      var hv = hash2(x + Z.seed * 7, y);
      if (t[y][x] === 0 && hv < 0.07) deco.push({ x: x * T + hash2(y, x) * T, y: y * T + hash2(x * 3, y) * T, k: hv < 0.025 ? "fleur" : hv < 0.045 ? "touffe" : (zi === 2 ? "champi" : "fleur"), c: Math.floor(hash2(x, y * 5) * 4) });
      if (t[y][x] === 2 && zi === 2 && hv < 0.12) deco.push({ x: x * T + 24, y: y * T + 24, k: "nenuphar", c: 0 });
    }
    var m = { zi: zi, Z: Z, w: w, h: h, t: t, entry: entry, exit: exit, chests: chests, deco: deco, pre: null };
    m.pre = prerender(m);
    return m;
  }
  function ri2(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }

  function solidAt(m, px, py, fly) {
    var tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    var k = m.t[ty][tx];
    if (fly) return k === 3;
    return !!BLOCK[k];
  }
  function blockedCircle(m, x, y, r, fly) {
    return solidAt(m, x - r, y - r, fly) || solidAt(m, x + r, y - r, fly) || solidAt(m, x - r, y + r, fly) || solidAt(m, x + r, y + r, fly);
  }
  function moveEnt(e, dx, dy) {
    var fly = e.fly;
    if (!blockedCircle(world, e.x + dx, e.y, e.r * 0.7, fly)) e.x += dx;
    if (!blockedCircle(world, e.x, e.y + dy, e.r * 0.7, fly)) e.y += dy;
  }

  /* pré-rendu du décor statique de la zone */
  function prerender(m) {
    var c = document.createElement("canvas"); c.width = m.w * T; c.height = m.h * T;
    var g = c.getContext("2d"), C = m.Z.col, x, y;
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) {
      var k = m.t[y][x], v = hash2(x, y);
      g.fillStyle = k === 1 ? C.path : (x + y) % 2 ? C.g1 : C.g2;
      if (k === 2) g.fillStyle = C.water;
      g.fillRect(x * T, y * T, T, T);
      if (k === 1) { // cailloux sur le chemin
        g.fillStyle = "rgba(0,0,0,.08)";
        for (var s = 0; s < 3; s++) g.fillRect(x * T + hash2(x + s, y) * 40, y * T + hash2(y + s, x) * 40, 4, 3);
      }
      if (k === 0 && v < 0.35) { g.strokeStyle = "rgba(30,80,30,.22)"; g.lineWidth = 2; g.beginPath(); var tx = x * T + v * 120 % 40 + 4, ty = y * T + (v * 977 % 1) * 36 + 6; g.moveTo(tx, ty); g.lineTo(tx - 3, ty - 7); g.moveTo(tx + 4, ty); g.lineTo(tx + 5, ty - 8); g.stroke(); }
    }
    // bords de l'eau (liseré clair)
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3;
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) if (m.t[y][x] === 2) {
      if (y > 0 && m.t[y - 1][x] !== 2) { g.beginPath(); g.moveTo(x * T, y * T + 2); g.lineTo(x * T + T, y * T + 2); g.stroke(); }
      if (y < m.h - 1 && m.t[y + 1][x] !== 2) { g.beginPath(); g.moveTo(x * T, y * T + T - 2); g.lineTo(x * T + T, y * T + T - 2); g.stroke(); }
      if (x > 0 && m.t[y][x - 1] !== 2) { g.beginPath(); g.moveTo(x * T + 2, y * T); g.lineTo(x * T + 2, y * T + T); g.stroke(); }
      if (x < m.w - 1 && m.t[y][x + 1] !== 2) { g.beginPath(); g.moveTo(x * T + T - 2, y * T); g.lineTo(x * T + T - 2, y * T + T); g.stroke(); }
    }
    // décors
    m.deco.forEach(function (d) { drawDeco(g, d); });
    // rochers
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) if (m.t[y][x] === 4) drawRock(g, x * T + T / 2, y * T + T / 2, hash2(x, y));
    // canopées : plusieurs cercles qui se chevauchent
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) if (m.t[y][x] === 3) {
      var cx = x * T + T / 2 + (hash2(x, y) - 0.5) * 8, cy = y * T + T / 2 + (hash2(y, x) - 0.5) * 8, rr = 27 + hash2(x + 3, y) * 5;
      g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(cx + 3, cy + 5, rr, 0, TAU); g.fill();
      outlineCircle(g, cx, cy, rr, C.tree);
      g.fillStyle = C.tree2; g.beginPath(); g.arc(cx - 5, cy - 6, rr * 0.62, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(cx - 9, cy - 11, rr * 0.28, 0, TAU); g.fill();
    }
    return c;
  }
  function outlineCircle(g, x, y, r, fill) { g.fillStyle = fill; g.strokeStyle = "#1d1810"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
  function drawRock(g, x, y, v) {
    g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.ellipse(x + 3, y + 8, 20, 11, 0, 0, TAU); g.fill();
    g.fillStyle = "#9aa1a8"; g.strokeStyle = "#1d1810"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - 20, y + 4); g.lineTo(x - 12, y - 14 - v * 4); g.lineTo(x + 8, y - 17); g.lineTo(x + 21, y - 2); g.lineTo(x + 14, y + 13); g.lineTo(x - 12, y + 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.3)"; g.beginPath(); g.moveTo(x - 10, y - 8); g.lineTo(x + 2, y - 12); g.lineTo(x - 2, y - 2); g.closePath(); g.fill();
  }
  var FLOWER = ["#fff6d8", "#ff9fb8", "#ffd257", "#c9a6ff"];
  function drawDeco(g, d) {
    if (d.k === "fleur") {
      g.fillStyle = FLOWER[d.c % 4];
      for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(d.x + Math.cos(i * 1.256) * 4, d.y + Math.sin(i * 1.256) * 4, 2.6, 0, TAU); g.fill(); }
      g.fillStyle = "#ffb43a"; g.beginPath(); g.arc(d.x, d.y, 2.2, 0, TAU); g.fill();
    } else if (d.k === "touffe") {
      g.strokeStyle = "#3a8a3e"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(d.x - 5, d.y + 4); g.lineTo(d.x - 7, d.y - 6); g.moveTo(d.x, d.y + 4); g.lineTo(d.x, d.y - 9); g.moveTo(d.x + 5, d.y + 4); g.lineTo(d.x + 8, d.y - 5); g.stroke();
    } else if (d.k === "champi") {
      g.fillStyle = "#fff3e0"; g.fillRect(d.x - 2, d.y, 4, 7);
      g.fillStyle = d.c % 2 ? "#e8584a" : "#c9a6ff"; g.strokeStyle = "#1d1810"; g.lineWidth = 2; g.beginPath(); g.ellipse(d.x, d.y, 8, 6, 0, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.fillRect(d.x - 3, d.y - 4, 2, 2); g.fillRect(d.x + 2, d.y - 3, 2, 2);
    } else if (d.k === "nenuphar") {
      g.fillStyle = "#4fae5f"; g.strokeStyle = "#1d1810"; g.lineWidth = 2; g.beginPath(); g.arc(d.x, d.y, 12, 0.35, TAU - 0.35); g.lineTo(d.x, d.y); g.closePath(); g.fill(); g.stroke();
    }
  }

  /* ====================== ÉTAT DU JEU ====================== */
  var P = null;                     // le joueur
  var mobs = [], shots = [], parts = [], texts = [], drops = [], npcs = [];
  var cam = { x: 0, y: 0, z: 1, shake: 0 };
  var W = 800, H = 600, dpr = 1;
  var mode = "menu";                // menu | play | dialog
  var tPlay = 0, saveTimer = 0, respawnTimer = 0, flash = 0;
  var banner = null;
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };
  var joy = { id: null, x: 0, y: 0, ax: 0, ay: 0, on: false };
  var touchAtk = false, touchMode = false;

  function makePlayer() {
    var C = CLASSES[profile.cls];
    return { x: 0, y: 0, vx: 0, vy: 0, r: 13, face: 0, cd: 0, dashT: 0, dashCd: 0, spCd: 0, inv: 0, hurt: 0, anim: 0, moving: false, swing: 0, dead: false, spin: 0, C: C };
  }

  function enterZone(zi, from) {
    profile.zone = zi;
    world = genZone(zi);
    mobs = []; shots = []; parts = []; texts = []; drops = []; npcs = [];
    var Z = ZONES[zi];
    // placement : à l'entrée (arrivée par la gauche) ou à la sortie (retour par la droite)
    var spot = from === "back" ? world.exit : world.entry;
    P.x = (spot.x + (from === "back" ? -1.5 : 1.5)) * T; P.y = spot.y * T + T / 2;
    P.vx = P.vy = 0; P.inv = 1;
    // PNJ
    if (Z.village) {
      npcs.push({ id: "elder", name: "Maître Noisetier", x: (world.entry.x + 6) * T, y: (world.entry.y - 1) * T, kind: "elder" });
      npcs.push({ id: "shop", name: "Dame Glandine", x: (world.entry.x + 9) * T, y: (world.entry.y + 1) * T, kind: "shop" });
    }
    // monstres
    for (var type in Z.mobs) for (var i = 0; i < Z.mobs[type]; i++) spawnMob(type, true);
    if (Z.boss && !profile.bossDead) {
      var b = makeMob("roi", Z.lvl + 2);
      b.x = (world.w - 9) * T; b.y = world.exit.y * T + T / 2; b.home = { x: b.x, y: b.y };
      mobs.push(b);
    }
    cam.x = P.x; cam.y = P.y;
    showBanner(Z.name, "Niveau conseillé " + Z.lvl);
    saveProfile();
  }

  function makeMob(type, lvl) {
    var D = MOBS[type], mul = 1 + (lvl - 1) * 0.22;
    return { type: type, D: D, x: 0, y: 0, r: D.r, hp: Math.round(D.hp * mul), max: Math.round(D.hp * mul), dmg: Math.round(D.dmg * (1 + (lvl - 1) * 0.12)), lvl: lvl,
      spd: D.spd, fly: !!D.fly, kx: 0, ky: 0, hurt: 0, cd: rnd(0.4, 1.5), state: "idle", t: rnd(0, 2), dir: rnd(0, TAU), anim: rnd(0, 6), home: null, dashT: 0, dx: 0, dy: 0, phase: 0 };
  }
  function spawnMob(type, initial) {
    var Z = world.Z, m = makeMob(type, Z.lvl + (Math.random() < 0.25 ? 1 : 0)), tries = 0, x, y;
    do {
      x = ri(2, world.w - 3); y = ri(2, world.h - 3); tries++;
    } while (tries < 80 && (world.t[y][x] !== 0 && world.t[y][x] !== 1 || dist(x * T, y * T, P.x, P.y) < (initial ? 300 : 520) || dist(x, y, world.entry.x, world.entry.y) < 8));
    if (tries >= 80) return;
    if (type === "grenouille") { var wt = false; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) if (world.t[y + dy] && world.t[y + dy][x + dx] === 2) wt = true; if (!wt && tries < 60) return spawnMob(type, initial); }
    m.x = x * T + T / 2; m.y = y * T + T / 2; m.home = { x: m.x, y: m.y };
    if (m.lvl > Z.lvl && Math.random() < 0.5) { m.elite = true; m.hp = m.max = Math.round(m.max * 1.8); m.dmg = Math.round(m.dmg * 1.3); }
    mobs.push(m);
  }

  /* ====================== COMBAT ====================== */
  function addText(x, y, s, col, big) { texts.push({ x: x, y: y, s: s, col: col || "#fff", t: 0, big: !!big }); }
  function addParts(x, y, n, cols, o) {
    o = o || {};
    for (var i = 0; i < n; i++) { var a = rnd(0, TAU), sp = rnd(o.min || 30, o.max || 140); parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.3, 0.7), t: 0, col: cols[i % cols.length], s: rnd(2, o.size || 5), leaf: !!o.leaf }); }
  }
  function shake(n) { cam.shake = Math.max(cam.shake, n); }

  function aimAngle() {
    if (touchMode) {
      var t = nearestMob(P.x, P.y, 280);
      if (t) return Math.atan2(t.y - P.y, t.x - P.x);
      return P.moving ? Math.atan2(P.vy, P.vx) : P.face;
    }
    if (mouse.has) return Math.atan2((mouse.y - H / 2) / cam.z + cam.y - P.y, (mouse.x - W / 2) / cam.z + cam.x - P.x);
    return P.face;
  }
  function nearestMob(x, y, maxD) {
    var best = null, bd = maxD;
    for (var i = 0; i < mobs.length; i++) { var d = dist(x, y, mobs[i].x, mobs[i].y); if (d < bd) { bd = d; best = mobs[i]; } }
    return best;
  }

  function damageMob(m, dmg, kx, ky, crit) {
    m.hp -= dmg; m.hurt = 0.15; m.kx += kx; m.ky += ky;
    if (m.state === "idle") m.state = "chase";
    addText(m.x, m.y - m.r - 8, Math.round(dmg) + (crit ? "!" : ""), crit ? "#ffd257" : "#fff", crit);
    addParts(m.x, m.y, crit ? 10 : 5, ["#fff", m.D.col], { max: 110 });
    SFX.hit();
    if (m.hp <= 0) killMob(m);
  }
  function rollDamage(mult) {
    var crit = Math.random() < critChance(), d = atkPower() * (mult || 1) * rnd(0.9, 1.1);
    return { d: crit ? d * 1.8 : d, crit: crit };
  }

  function killMob(m) {
    var i = mobs.indexOf(m); if (i < 0) return;
    mobs.splice(i, 1);
    addParts(m.x, m.y, m.D.boss ? 40 : 14, [m.D.col, "#fff", "#ffd257"], { max: 190, size: 6 });
    var g = ri(m.D.gold[0], m.D.gold[1]) * (m.elite ? 2 : 1);
    for (var k = 0; k < Math.min(g, 6); k++) drops.push({ x: m.x + rnd(-14, 14), y: m.y + rnd(-14, 14), v: Math.ceil(g / Math.min(g, 6)), kind: "gold", t: rnd(0, 6), vx: rnd(-60, 60), vy: rnd(-60, 60) });
    if (Math.random() < 0.12) drops.push({ x: m.x, y: m.y, v: 1, kind: "potion", t: 0, vx: 0, vy: 0 });
    gainXp(Math.round(m.D.xp * (1 + (m.lvl - 1) * 0.15) * (m.elite ? 1.8 : 1)), m.x, m.y);
    profile.kills++;
    var q = QUESTS[profile.quest];
    if (q && q.kill === m.type) {
      profile.qn++;
      if (profile.qn >= q.n) questDone();
      updateHud();
    }
    if (m.type === "roi") { profile.bossDead = true; shake(14); flash = 0.6; showBanner("Roi-corbeau vaincu !", "Le Marais est libéré"); }
    saveProfile();
  }

  function gainXp(n, x, y) {
    if (profile.lvl >= MAX_LVL) return;
    profile.xp += n;
    addText(x, y - 20, "+" + n + " XP", "#9ad7ff");
    while (profile.lvl < MAX_LVL && profile.xp >= xpFor(profile.lvl)) {
      profile.xp -= xpFor(profile.lvl); profile.lvl++; profile.pts += 2;
      profile.hp = maxHp();
      SFX.level(); flash = 0.35;
      addParts(P.x, P.y, 30, ["#ffd257", "#fff", "#9fe870"], { max: 200, leaf: true });
      showBanner("Niveau " + profile.lvl + " !", "+2 points de caractéristique (touche C)");
    }
    updateHud();
  }
  function questDone() {
    var q = QUESTS[profile.quest];
    SFX.quest();
    profile.gold += q.gold; gainXp(q.xp, P.x, P.y);
    showBanner("Quête accomplie", q.name + " · +" + q.gold + " noisettes");
    profile.quest++; profile.qn = 0;
  }

  function hurtPlayer(dmg, kx, ky) {
    if (P.inv > 0 || P.dead) return;
    profile.hp -= dmg; P.inv = 0.7; P.hurt = 0.25; P.vx += kx; P.vy += ky;
    addText(P.x, P.y - 24, "-" + Math.round(dmg), "#ff6b6b", true);
    addParts(P.x, P.y, 8, ["#ff6b6b", "#fff"], { max: 120 });
    SFX.hurt(); shake(5); flash = 0.12;
    if (profile.hp <= 0) { profile.hp = 0; die(); }
    updateHud();
  }
  function die() {
    P.dead = true; mode = "dialog";
    var lost = Math.floor(profile.gold * 0.1);
    profile.gold -= lost;
    showCard('<h2>Tu t\'évanouis…</h2><p>Les écureuils du village te ramènent à la clairière. Tu perds ' + lost + ' noisette' + (lost > 1 ? "s" : "") + '.</p><button class="btn" data-act="revive" type="button">Se réveiller</button>', function () {
      hideCard();
      P.dead = false; profile.hp = maxHp(); profile.zone = 0;
      enterZone(0); mode = "play"; updateHud();
    });
  }

  function useAttack() {
    if (P.cd > 0 || P.dead || P.dashT > 0) return;
    var C = P.C, a = aimAngle(), dmg;
    P.face = a; P.cd = C.cd; P.swing = 0.18;
    if (C.kind === "melee") {
      SFX.swing();
      var reach = 58;
      for (var i = mobs.length - 1; i >= 0; i--) {
        var m = mobs[i], d = dist(P.x, P.y, m.x, m.y);
        if (d < reach + m.r && Math.abs(angDiff(Math.atan2(m.y - P.y, m.x - P.x), a)) < 1.2) {
          dmg = rollDamage(1.1); damageMob(m, dmg.d, Math.cos(a) * 160, Math.sin(a) * 160, dmg.crit);
        }
      }
      addSlash(P.x, P.y, a, 52, "#fff7d6");
    } else if (C.kind === "shoot") {
      SFX.shoot();
      shots.push({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 0.8, r: 6, pierce: 0, kind: "gland", mine: true, mult: 1 });
    } else {
      SFX.shoot();
      shots.push({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, life: 1.0, r: 9, pierce: 2, kind: "orbe", mine: true, mult: 1.15, hit: [] });
    }
  }
  function addSlash(x, y, a, r, col) { parts.push({ slash: true, x: x, y: y, a: a, r: r, col: col, life: 0.18, t: 0 }); }

  function useSpecial() {
    if (P.spCd > 0 || P.dead) return;
    var C = P.C, i, dmg;
    P.spCd = 6; SFX.nova();
    if (C.kind === "melee") {
      P.spin = 0.5; shake(4);
      parts.push({ ring: true, x: P.x, y: P.y, r: 100, col: "#ffe6a8", life: 0.4, t: 0 });
      for (i = mobs.length - 1; i >= 0; i--) { var m = mobs[i]; if (dist(P.x, P.y, m.x, m.y) < 100 + m.r) { dmg = rollDamage(2); var an = Math.atan2(m.y - P.y, m.x - P.x); damageMob(m, dmg.d, Math.cos(an) * 260, Math.sin(an) * 260, dmg.crit); } }
    } else if (C.kind === "shoot") {
      var a = aimAngle();
      for (i = -2; i <= 2; i++) shots.push({ x: P.x, y: P.y, vx: Math.cos(a + i * 0.22) * 420, vy: Math.sin(a + i * 0.22) * 420, life: 0.8, r: 6, pierce: 0, kind: "gland", mine: true, mult: 1.2 });
    } else {
      shake(5);
      parts.push({ ring: true, x: P.x, y: P.y, r: 140, col: "#c9a6ff", life: 0.5, t: 0 });
      for (i = mobs.length - 1; i >= 0; i--) { var m2 = mobs[i]; if (dist(P.x, P.y, m2.x, m2.y) < 140 + m2.r) { dmg = rollDamage(2.2); var an2 = Math.atan2(m2.y - P.y, m2.x - P.x); damageMob(m2, dmg.d, Math.cos(an2) * 200, Math.sin(an2) * 200, dmg.crit); } }
    }
  }
  function useDash() {
    if (P.dashCd > 0 || P.dead) return;
    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.ax, dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.ay;
    var a = (dx || dy) ? Math.atan2(dy, dx) : P.face;
    P.dashA = a; P.dashT = 0.16; P.dashCd = 0.9; P.inv = Math.max(P.inv, 0.3); SFX.dash();
    addParts(P.x, P.y, 6, ["#ffffff", "#e8e0c8"], { max: 60 });
  }
  function usePotion() {
    if (profile.potions <= 0 || profile.hp >= maxHp() || P.dead) return;
    profile.potions--; profile.hp = Math.min(maxHp(), profile.hp + 45);
    addText(P.x, P.y - 24, "+45", "#7df0a0", true); addParts(P.x, P.y, 12, ["#7df0a0", "#fff"], { max: 90, leaf: true }); SFX.coin();
    updateHud();
  }

  /* ====================== MISE À JOUR ====================== */
  function update(dt) {
    var C = P.C, i, m;
    tPlay += dt; profile.time += dt;
    P.cd -= dt; P.dashCd -= dt; P.spCd -= dt; P.inv -= dt; P.hurt -= dt; P.swing -= dt; P.spin -= dt;

    // déplacement
    var ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.ax, iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.ay;
    var il = Math.sqrt(ix * ix + iy * iy);
    if (il > 1) { ix /= il; iy /= il; }
    P.moving = il > 0.12;
    if (P.dashT > 0) {
      P.dashT -= dt;
      moveEnt(P, Math.cos(P.dashA) * 520 * dt, Math.sin(P.dashA) * 520 * dt);
    } else {
      var sp = moveSpeed();
      P.vx += (ix * sp - P.vx) * Math.min(1, dt * 14);
      P.vy += (iy * sp - P.vy) * Math.min(1, dt * 14);
      moveEnt(P, P.vx * dt, P.vy * dt);
    }
    if (P.moving) P.anim += dt * 11;
    if (!mouse.has && !touchMode && P.moving) P.face = Math.atan2(iy, ix);
    else if (touchMode || mouse.has) P.face = P.cd > C.cd - 0.25 ? P.face : (touchMode ? (P.moving ? Math.atan2(P.vy, P.vx) : P.face) : aimAngle());
    if (P.spin > 0) P.face += dt * 22;

    if (mouse.down || touchAtk || keys.attack) useAttack();

    // monstres
    for (i = mobs.length - 1; i >= 0; i--) { m = mobs[i]; if (mobAI(m, dt)) { /* tué par son propre effet */ } }
    // réapparition douce
    respawnTimer += dt;
    if (respawnTimer > 7) {
      respawnTimer = 0;
      var cur = {}; mobs.forEach(function (mm) { cur[mm.type] = (cur[mm.type] || 0) + 1; });
      for (var type in world.Z.mobs) if ((cur[type] || 0) < world.Z.mobs[type]) { spawnMob(type, false); break; }
    }

    // projectiles
    for (i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var gone = s.life <= 0 || solidAt(world, s.x, s.y, true);
      if (s.mine) {
        for (var j = mobs.length - 1; j >= 0 && !gone; j--) {
          var mm = mobs[j];
          if (s.hit && s.hit.indexOf(mm) >= 0) continue;
          if (dist(s.x, s.y, mm.x, mm.y) < s.r + mm.r) {
            var dmg = rollDamage(s.mult), an = Math.atan2(s.vy, s.vx);
            damageMob(mm, dmg.d, Math.cos(an) * 120, Math.sin(an) * 120, dmg.crit);
            if (s.hit) s.hit.push(mm);
            if (s.pierce > 0) s.pierce--; else gone = true;
          }
        }
      } else if (!P.dead && dist(s.x, s.y, P.x, P.y) < s.r + P.r) {
        hurtPlayer(s.dmg, s.vx * 0.25, s.vy * 0.25); gone = true;
      }
      if (gone) {
        if (s.mine) addParts(s.x, s.y, 4, [s.kind === "orbe" ? "#c9a6ff" : "#d9a35a"], { max: 70 });
        shots.splice(i, 1);
      }
    }

    // butin
    for (i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.9; d.vy *= 0.9;
      var dd = dist(d.x, d.y, P.x, P.y);
      if (dd < 110 && d.t > 0.25) { d.x += (P.x - d.x) * Math.min(1, dt * 8); d.y += (P.y - d.y) * Math.min(1, dt * 8); }
      if (dd < 20 && d.t > 0.2) {
        if (d.kind === "gold") { profile.gold += d.v; addText(P.x, P.y - 22, "+" + d.v, "#ffd257"); SFX.coin(); }
        else { profile.potions++; addText(P.x, P.y - 22, "+1 baie", "#ff8aa8"); SFX.coin(); }
        drops.splice(i, 1); updateHud();
      }
    }

    // particules et textes
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (!p.slash && !p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; if (p.leaf) p.vy += 40 * dt; }
      if (p.t >= p.life) parts.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; texts[i].y -= 26 * dt; if (texts[i].t > 0.9) texts.splice(i, 1); }

    // portails
    checkPortals();

    // caméra
    cam.x += (P.x - cam.x) * Math.min(1, dt * 7);
    cam.y += (P.y - cam.y) * Math.min(1, dt * 7);
    cam.shake = Math.max(0, cam.shake - dt * 30);
    flash = Math.max(0, flash - dt);
    if (banner) { banner.t += dt; if (banner.t > 2.6) { banner = null; bannerEl.hidden = true; } }

    saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; saveProfile(); }
    profile.hp = Math.min(profile.hp, maxHp());
    // régénération lente hors combat
    if (profile.hp < maxHp() && !nearestMob(P.x, P.y, 260)) { regen += dt; if (regen > 1) { regen = 0; profile.hp = Math.min(maxHp(), profile.hp + 1 + Math.floor(profile.lvl / 4)); updateHud(); } }
    updateCooldowns();
  }
  var regen = 0;

  function mobAI(m, dt) {
    var D = m.D, dp = dist(m.x, m.y, P.x, P.y), a = Math.atan2(P.y - m.y, P.x - m.x);
    m.hurt -= dt; m.anim += dt * 6; m.cd -= dt; m.t -= dt;
    // recul
    if (Math.abs(m.kx) > 1 || Math.abs(m.ky) > 1) { moveEnt(m, m.kx * dt, m.ky * dt); m.kx *= 0.86; m.ky *= 0.86; }

    if (m.type === "roi") return bossAI(m, dt, dp, a);
    var vision = m.type === "corbeau" ? 260 : 200;
    if (m.state === "idle" && dp < vision && !P.dead) m.state = "chase";
    if (m.state === "chase" && (dp > vision * 2 || P.dead)) { m.state = "idle"; }

    if (m.state === "idle") {
      if (m.t <= 0) { m.t = rnd(1, 3); m.dir = rnd(0, TAU); m.walk = Math.random() < 0.6; }
      if (m.walk && m.spd > 0) { var w = m.spd * 0.4 * dt; moveEnt(m, Math.cos(m.dir) * w, Math.sin(m.dir) * w); }
      return;
    }
    switch (m.type) {
      case "limace":
        moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
        if (dp < m.r + P.r + 4 && m.cd <= 0) { m.cd = 1.1; hurtPlayer(m.dmg, Math.cos(a) * 140, Math.sin(a) * 140); }
        break;
      case "corbeau":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + P.r && m.cd <= 0) { m.cd = 1; hurtPlayer(m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else {
          // tourne autour du joueur puis pique
          var oa = a + Math.PI + Math.sin(m.anim * 0.3) * 1.2, tx = P.x + Math.cos(oa) * 120, ty = P.y + Math.sin(oa) * 120;
          var ta = Math.atan2(ty - m.y, tx - m.x);
          moveEnt(m, Math.cos(ta) * m.spd * dt, Math.sin(ta) * m.spd * dt);
          if (m.cd <= 0 && dp < 230) { m.dashT = 0.35; m.dx = Math.cos(a) * 300; m.dy = Math.sin(a) * 300; m.cd = 2.2; }
        }
        break;
      case "renard":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + P.r && m.cd <= 0) { m.cd = 0.9; hurtPlayer(m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else if (m.phase === 1) { m.phase = 0; m.dashT = 0.4; m.dx = Math.cos(m.aim) * 380; m.dy = Math.sin(m.aim) * 380; }
        else if (m.phase === 2) { m.windup -= dt; m.aim = a; if (m.windup <= 0) m.phase = 1; }
        else {
          moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
          if (dp < 170 && m.cd <= 0) { m.phase = 2; m.windup = 0.55; m.cd = 2.6; }
        }
        break;
      case "grenouille":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + P.r + 4 && m.cd <= 0) { m.cd = 0.8; hurtPlayer(m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else if (m.cd <= 0) { m.dashT = 0.35; m.dx = Math.cos(a) * 230; m.dy = Math.sin(a) * 230; m.cd = rnd(1.2, 1.8); }
        break;
    }
  }

  function bossAI(m, dt, dp, a) {
    var hpR = m.hp / m.max;
    m.state = "chase";
    if (m.dashT > 0) {
      m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt);
      if (dp < m.r + P.r && m.cd2 <= 0) { m.cd2 = 0.6; hurtPlayer(m.dmg, m.dx * 0.5, m.dy * 0.5); }
      return;
    }
    m.cd2 = (m.cd2 || 0) - dt;
    if (m.phase === 2) { m.windup -= dt; m.aim = a; if (m.windup <= 0) { m.phase = 0; m.dashT = 0.5; m.dx = Math.cos(m.aim) * 440; m.dy = Math.sin(m.aim) * 440; } return; }
    moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
    if (dp < m.r + P.r + 6 && m.cd2 <= 0) { m.cd2 = 1; hurtPlayer(m.dmg, Math.cos(a) * 180, Math.sin(a) * 180); }
    if (m.cd <= 0) {
      m.atk = ((m.atk || 0) + 1) % 3;
      if (m.atk === 0) { m.phase = 2; m.windup = 0.7; m.cd = 2.4; }                      // charge télégraphiée
      else if (m.atk === 1) {                                                              // volée de plumes
        var n = hpR < 0.5 ? 14 : 9;
        for (var i = 0; i < n; i++) { var an = i / n * TAU + m.anim; shots.push({ x: m.x, y: m.y, vx: Math.cos(an) * 190, vy: Math.sin(an) * 190, life: 2.2, r: 7, mine: false, kind: "plume", dmg: Math.round(m.dmg * 0.6) }); }
        m.cd = 2.2; shake(3);
      } else {                                                                             // appel des corbeaux
        for (var k = 0; k < 2 && mobs.length < 14; k++) { var c = makeMob("corbeau", 5); c.x = m.x + rnd(-40, 40); c.y = m.y + rnd(-40, 40); c.state = "chase"; c.home = { x: c.x, y: c.y }; mobs.push(c); }
        m.cd = 2.6;
      }
    }
  }

  function checkPortals() {
    var tx = P.x / T, ty = P.y / T;
    // sortie à droite
    if (tx > world.w - 1.6 && Math.abs(ty - world.exit.y) < 2.5 && world.zi < ZONES.length - 1) {
      var nz = ZONES[world.zi + 1];
      if (profile.lvl >= nz.req && (world.zi > 0 || profile.quest >= 1)) { SFX.portal(); enterZone(world.zi + 1); }
      else if (!portalMsg || tPlay - portalMsg > 2.5) {
        portalMsg = tPlay;
        showBanner("Passage fermé", profile.lvl < nz.req ? "Il faut le niveau " + nz.req : "Termine d'abord la quête de Maître Noisetier");
        P.vx = -120; P.x -= 6;
      }
    }
    if (world.zi > 0 && tx < 1.4 && Math.abs(ty - world.entry.y) < 2.5) { SFX.portal(); enterZone(world.zi - 1, "back"); }
  }
  var portalMsg = 0;

  /* ====================== DESSIN ====================== */
  function line(g, w, col) { g.lineWidth = w; g.strokeStyle = col || "#2a1a10"; }

  function drawSquirrel(g, x, y, face, C, o) {
    o = o || {};
    var an = o.anim || 0, bob = o.moving ? Math.sin(an) * 1.8 : Math.sin(tPlay * 2) * 0.6, s = o.scale || 1;
    g.save(); g.translate(x, y + bob); g.scale(s, s);
    g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.ellipse(0, 8 - bob, 14, 7, 0, 0, TAU); g.fill();
    var fx = Math.cos(face), fy = Math.sin(face), bx = -fx, by = -fy;
    // queue en spirale derrière le corps
    var sway = Math.sin(tPlay * 3 + an * 0.2) * 0.25;
    var ta = Math.atan2(by, bx) + sway;
    var tx = Math.cos(ta) * 15, ty = Math.sin(ta) * 15;
    g.fillStyle = C.tail; line(g, 3);
    g.beginPath(); g.ellipse(tx, ty - 3, 13, 17, ta + Math.PI / 2, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = C.fur; g.lineWidth = 3; g.beginPath(); g.arc(tx, ty - 3, 6, 0.4, 4.6); g.stroke();
    // corps
    g.fillStyle = C.fur; line(g, 3);
    g.beginPath(); g.ellipse(0, 1, 12, 13, face, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = o.belly || "#f6e6c4"; g.beginPath(); g.ellipse(fx * 3, fy * 3 + 1, 6, 7, face, 0, TAU); g.fill();
    // pattes avant
    g.fillStyle = C.fur; line(g, 2.5);
    var lp = o.moving ? Math.sin(an) * 4 : 0;
    g.beginPath(); g.arc(fx * 8 - fy * (8 + lp), fy * 8 + fx * (8 + lp), 4, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(fx * 8 + fy * (8 - lp), fy * 8 - fx * (8 - lp), 4, 0, TAU); g.fill(); g.stroke();
    // tête
    var hx = fx * 9, hy = fy * 9 - 2;
    g.fillStyle = C.fur; line(g, 3); g.beginPath(); g.arc(hx, hy, 9, 0, TAU); g.fill(); g.stroke();
    // oreilles
    var ea = face + Math.PI / 2;
    [-1, 1].forEach(function (sg) { g.fillStyle = C.fur; line(g, 2.5); g.beginPath(); g.arc(hx + Math.cos(ea) * 7 * sg - fx * 2, hy + Math.sin(ea) * 7 * sg - fy * 2, 3.8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#f0a8a0"; g.beginPath(); g.arc(hx + Math.cos(ea) * 7 * sg - fx * 2, hy + Math.sin(ea) * 7 * sg - fy * 2, 1.5, 0, TAU); g.fill(); });
    // museau + yeux
    g.fillStyle = "#f6e6c4"; g.beginPath(); g.arc(hx + fx * 5, hy + fy * 5, 3.6, 0, TAU); g.fill();
    g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(hx + fx * 8, hy + fy * 8, 1.6, 0, TAU); g.fill();
    [-1, 1].forEach(function (sg) { g.beginPath(); g.arc(hx + fx * 3 + Math.cos(ea) * 3.6 * sg, hy + fy * 3 + Math.sin(ea) * 3.6 * sg, 1.7, 0, TAU); g.fill(); });
    // accessoire de classe
    var cl = o.cls;
    if (cl === "gardien") {
      g.fillStyle = "#8a5a2b"; line(g, 2.5); g.beginPath(); g.arc(hx - fx * 1, hy - fy * 1 - 2, 8, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#6e6e86"; line(g, 2.5); var sx = Math.cos(ea) * 15 - fx * 1, sy = Math.sin(ea) * 15 - fy * 1;
      g.beginPath(); g.arc(sx, sy, 6.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#ffd257"; g.beginPath(); g.arc(sx, sy, 2.2, 0, TAU); g.fill();
    } else if (cl === "lanceur") {
      g.fillStyle = "#d9a35a"; line(g, 2.2); var ax = fx * 17 - Math.cos(ea) * 6, ay = fy * 17 - Math.sin(ea) * 6;
      g.beginPath(); g.ellipse(ax, ay, 4, 5, face, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#6a4426"; g.beginPath(); g.arc(ax - fx * 2, ay - fy * 2, 3.2, 0, TAU); g.fill();
      g.fillStyle = "#d94f4f"; line(g, 2); g.beginPath(); g.rect(hx - 9, hy - 3, 18, 3); g.fill();
    } else if (cl === "mystique") {
      g.fillStyle = "#5a3d99"; line(g, 2.5); g.beginPath(); g.moveTo(hx - fx * 3 - fy * 8, hy - fy * 3 + fx * 8); g.lineTo(hx - fx * 10, hy - fy * 10 - 6); g.lineTo(hx - fx * 3 + fy * 8, hy - fy * 3 - fx * 8); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#ffd257"; g.beginPath(); g.arc(hx - fx * 9, hy - fy * 9 - 6, 2.4, 0, TAU); g.fill();
      var gl = 0.5 + Math.sin(tPlay * 5) * 0.2; g.fillStyle = "rgba(201,166,255," + gl + ")"; g.beginPath(); g.arc(fx * 18, fy * 18, 5, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawMob(g, m) {
    var D = m.D, x = m.x, y = m.y, flashW = m.hurt > 0, face = Math.atan2(P.y - m.y, P.x - m.x), sc = m.elite ? 1.2 : 1;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.ellipse(0, m.fly ? 18 : 8, m.r, m.r * 0.5, 0, 0, TAU); g.fill();
    var col = flashW ? "#ffffff" : D.col;
    line(g, 3);
    if (m.type === "limace") {
      g.rotate(face); var w = Math.sin(m.anim) * 2;
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 17 + w, 11 - w * 0.4, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = flashW ? "#fff" : "#7e8a3e"; g.beginPath(); g.ellipse(-4, 0, 8, 7, 0, 0, TAU); g.fill();
      line(g, 2.5); g.beginPath(); g.moveTo(13, -3); g.lineTo(20, -8); g.moveTo(13, 3); g.lineTo(20, 8); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(20, -8, 2.2, 0, TAU); g.arc(20, 8, 2.2, 0, TAU); g.fill();
    } else if (m.type === "corbeau" || m.type === "roi") {
      var big = m.type === "roi", wf = Math.sin(m.anim * 2.2) * 0.6, r = m.r;
      g.rotate(face);
      g.translate(0, m.fly ? -10 : 0);
      g.fillStyle = flashW ? "#fff" : (big ? "#2c2850" : "#3a3850");
      [-1, 1].forEach(function (sg) { g.beginPath(); g.moveTo(0, sg * r * 0.4); g.quadraticCurveTo(-r * 0.4, sg * r * (1.4 + wf), -r * 1.1, sg * r * (1.2 + wf)); g.quadraticCurveTo(-r * 0.6, sg * r * 0.5, 0, sg * r * 0.2); g.fill(); g.stroke(); });
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 0.65, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#f2a73a"; g.beginPath(); g.moveTo(r * 0.8, -r * 0.18); g.lineTo(r * 1.35, 0); g.lineTo(r * 0.8, r * 0.18); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(r * 0.45, -r * 0.28, r * 0.12, 0, TAU); g.arc(r * 0.45, r * 0.28, r * 0.12, 0, TAU); g.fill();
      if (big) { g.fillStyle = "#ffd257"; g.beginPath(); g.moveTo(-r * 0.1, -r * 0.3); g.lineTo(0, -r * 0.55); g.lineTo(r * 0.1, -r * 0.3); g.lineTo(r * 0.2, -r * 0.55); g.lineTo(r * 0.3, -r * 0.3); g.closePath(); g.fill(); g.stroke(); }
    } else if (m.type === "renard") {
      g.rotate(face);
      if (m.phase === 2) { g.fillStyle = "rgba(255,80,60,.35)"; g.beginPath(); g.rect(0, -12, 170, 24); g.fill(); }
      g.fillStyle = flashW ? "#fff" : "#f08a48"; g.beginPath(); g.ellipse(-18, 0, 14, 8, Math.sin(m.anim) * 0.2, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = flashW ? "#fff" : "#fff3dd"; g.beginPath(); g.arc(-28, 0, 4.5, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(12, 0, 8.5, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(9, -6); g.lineTo(11, -14); g.lineTo(15, -7); g.moveTo(9, 6); g.lineTo(11, 14); g.lineTo(15, 7); g.fill(); g.stroke();
      g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(20, 0, 2, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(14, -3.5, 1.5, 0, TAU); g.arc(14, 3.5, 1.5, 0, TAU); g.fill();
    } else if (m.type === "grenouille") {
      var jump = m.dashT > 0 ? -10 : 0;
      g.translate(0, jump);
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 14, 12, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = flashW ? "#fff" : "#8be09a"; g.beginPath(); g.ellipse(0, 3, 8, 6, 0, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(-7, -10, 5, 0, TAU); g.arc(7, -10, 5, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-7, -10, 2.8, 0, TAU); g.arc(7, -10, 2.8, 0, TAU); g.fill();
      g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(-7, -10, 1.3, 0, TAU); g.arc(7, -10, 1.3, 0, TAU); g.fill();
    }
    g.restore();
    // barre de vie
    if (m.hp < m.max || m.D.boss) {
      var bw = m.D.boss ? 70 : 32, by = y - m.r * sc - (m.fly ? 24 : 12);
      g.fillStyle = "#2a1a10"; g.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 7);
      g.fillStyle = m.elite ? "#ffd257" : "#e8584a"; g.fillRect(x - bw / 2, by, bw * Math.max(0, m.hp / m.max), 5);
    }
    if (m.elite) { g.fillStyle = "#ffd257"; g.font = "bold 12px Nunito, sans-serif"; g.textAlign = "center"; g.fillText("★", x, y - m.r * sc - 16 - (m.fly ? 12 : 0)); }
  }

  function drawNpc(g, n) {
    var near = dist(n.x, n.y, P.x, P.y) < 64;
    var C = n.kind === "elder" ? { fur: "#9a9a9a", tail: "#c8c8c8" } : { fur: "#d98a9a", tail: "#f0b0bf" };
    drawSquirrel(g, n.x, n.y, Math.PI / 2 + Math.sin(tPlay) * 0.2, C, { cls: null, belly: "#fff3dd" });
    if (n.kind === "elder") { g.fillStyle = "#e8e8e8"; line(g, 2); g.beginPath(); g.arc(n.x, n.y + 4, 5, 0.1, Math.PI - 0.1); g.fill(); g.stroke(); g.fillStyle = "#8a5a2b"; g.fillRect(n.x + 14, n.y - 14, 3, 28); }
    else { g.fillStyle = "#c9a06a"; line(g, 2.5); g.beginPath(); g.rect(n.x - 26, n.y + 14, 52, 14); g.fill(); g.stroke(); g.fillStyle = "#d94f4f"; g.beginPath(); g.arc(n.x - 12, n.y + 12, 4, 0, TAU); g.arc(n.x, n.y + 12, 4, 0, TAU); g.fill(); g.fillStyle = "#d9a35a"; g.beginPath(); g.arc(n.x + 12, n.y + 12, 4, 0, TAU); g.fill(); }
    g.font = "800 13px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#2a1a10"; g.fillStyle = "#fff";
    g.strokeText(n.name, n.x, n.y - 34); g.fillText(n.name, n.x, n.y - 34);
    var q = QUESTS[profile.quest];
    if (n.kind === "elder" && (q && q.id && !n.done)) { g.fillStyle = "#ffd257"; g.font = "900 22px Nunito, sans-serif"; g.strokeText("!", n.x, n.y - 66 + Math.sin(tPlay * 4) * 3); g.fillText("!", n.x, n.y - 66 + Math.sin(tPlay * 4) * 3); }
    if (near) { g.fillStyle = "#fff"; g.font = "800 12px Nunito, sans-serif"; g.strokeText("F · parler", n.x, n.y + 48); g.fillText("F · parler", n.x, n.y + 48); }
  }

  function drawChest(g, c) {
    var open = profile.chests[world.zi + ":" + c.i], x = c.x * T + T / 2, y = c.y * T + T / 2, near = dist(x, y, P.x, P.y) < 56;
    g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.ellipse(x, y + 12, 18, 8, 0, 0, TAU); g.fill();
    g.fillStyle = open ? "#8a6a42" : "#b9773a"; line(g, 3); g.beginPath(); g.rect(x - 16, y - 10, 32, 22); g.fill(); g.stroke();
    g.fillStyle = open ? "#5a4228" : "#d9944e"; g.beginPath(); g.rect(x - 16, y - (open ? 16 : 10), 32, open ? 6 : 8); g.fill(); g.stroke();
    if (!open) { g.fillStyle = "#ffd257"; g.fillRect(x - 3, y - 4, 6, 7); g.strokeRect(x - 3, y - 4, 6, 7); }
    if (!open && near) { g.font = "800 12px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#2a1a10"; g.fillStyle = "#fff"; g.strokeText("F · ouvrir", x, y + 32); g.fillText("F · ouvrir", x, y + 32); }
  }

  function render() {
    var g = ctx, z = cam.z * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#1f3a2b"; g.fillRect(0, 0, canvas.width, canvas.height);
    var sx = cam.shake ? rnd(-cam.shake, cam.shake) : 0, sy = cam.shake ? rnd(-cam.shake, cam.shake) : 0;
    var cx = clamp(cam.x, W / 2 / cam.z, world.w * T - W / 2 / cam.z), cy = clamp(cam.y, H / 2 / cam.z, world.h * T - H / 2 / cam.z);
    if (world.w * T < W / cam.z) cx = world.w * T / 2;
    if (world.h * T < H / cam.z) cy = world.h * T / 2;
    g.setTransform(z, 0, 0, z, (W / 2 - cx * cam.z + sx) * dpr, (H / 2 - cy * cam.z + sy) * dpr);
    g.drawImage(world.pre, 0, 0);

    // reflets d'eau animés
    var x0 = Math.max(0, Math.floor((cx - W / 2 / cam.z) / T)), x1 = Math.min(world.w - 1, Math.ceil((cx + W / 2 / cam.z) / T));
    var y0 = Math.max(0, Math.floor((cy - H / 2 / cam.z) / T)), y1 = Math.min(world.h - 1, Math.ceil((cy + H / 2 / cam.z) / T));
    g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 2;
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (world.t[ty][tx] === 2) {
      var ph = tPlay * 1.5 + hash2(tx, ty) * 6, ox = Math.sin(ph) * 6;
      g.beginPath(); g.moveTo(tx * T + 10 + ox, ty * T + 16); g.lineTo(tx * T + 24 + ox, ty * T + 16); g.moveTo(tx * T + 22 - ox, ty * T + 34); g.lineTo(tx * T + 36 - ox, ty * T + 34); g.stroke();
    }
    // portails
    drawPortal(g, world.exit.x + 1.2, world.exit.y + 0.5, world.zi < ZONES.length - 1 ? "#ffd257" : null);
    if (world.zi > 0) drawPortal(g, world.entry.x - 1.2, world.entry.y + 0.5, "#9ad7ff");

    // entités triées par y
    var ents = [];
    world.chests.forEach(function (c) { ents.push({ y: c.y * T + T / 2, f: function () { drawChest(g, c); } }); });
    npcs.forEach(function (n) { ents.push({ y: n.y, f: function () { drawNpc(g, n); } }); });
    mobs.forEach(function (m) { ents.push({ y: m.y + (m.fly ? 40 : 0), f: function () { drawMob(g, m); } }); });
    if (!P.dead) ents.push({ y: P.y, f: drawPlayer });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.f(); });

    // butin
    drops.forEach(function (d) {
      var by = Math.sin(d.t * 6) * 2;
      if (d.kind === "gold") { g.fillStyle = "#e8a838"; line(g, 2); g.beginPath(); g.ellipse(d.x, d.y + by, 6, 7, 0.4, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#6a4426"; g.beginPath(); g.arc(d.x - 1, d.y + by - 6, 3, Math.PI, 0); g.fill(); }
      else { g.fillStyle = "#d94f6f"; line(g, 2); g.beginPath(); g.arc(d.x, d.y + by, 7, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#4fae5f"; g.fillRect(d.x - 1, d.y + by - 10, 3, 4); }
    });
    // projectiles
    shots.forEach(function (s) {
      if (s.kind === "gland") { g.fillStyle = "#d9a35a"; line(g, 2); g.beginPath(); g.ellipse(s.x, s.y, 7, 5, Math.atan2(s.vy, s.vx), 0, TAU); g.fill(); g.stroke(); }
      else if (s.kind === "orbe") { g.fillStyle = "rgba(201,166,255,.35)"; g.beginPath(); g.arc(s.x, s.y, 14, 0, TAU); g.fill(); g.fillStyle = "#c9a6ff"; line(g, 2); g.beginPath(); g.arc(s.x, s.y, 8, 0, TAU); g.fill(); g.stroke(); }
      else { g.fillStyle = "#3a3850"; line(g, 2); g.beginPath(); g.ellipse(s.x, s.y, 9, 4, Math.atan2(s.vy, s.vx), 0, TAU); g.fill(); g.stroke(); }
    });
    // particules
    parts.forEach(function (p) {
      var k = 1 - p.t / p.life;
      if (p.slash) { g.strokeStyle = p.col; g.globalAlpha = k; g.lineWidth = 8 * k + 2; g.beginPath(); g.arc(p.x, p.y, p.r, p.a - 1.1, p.a + 1.1); g.stroke(); g.globalAlpha = 1; }
      else if (p.ring) { g.strokeStyle = p.col; g.globalAlpha = k; g.lineWidth = 8 * k + 2; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.7), 0, TAU); g.stroke(); g.globalAlpha = 1; }
      else { g.globalAlpha = Math.max(0, k); g.fillStyle = p.col; if (p.leaf) { g.beginPath(); g.ellipse(p.x, p.y, p.s * 1.4, p.s * 0.7, p.t * 6, 0, TAU); g.fill(); } else g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); g.globalAlpha = 1; }
    });
    // textes flottants
    texts.forEach(function (t) {
      g.globalAlpha = Math.max(0, 1 - t.t / 0.9); g.font = "900 " + (t.big ? 20 : 15) + "px Nunito, sans-serif"; g.textAlign = "center";
      g.lineWidth = 4; g.strokeStyle = "#2a1a10"; g.fillStyle = t.col; g.strokeText(t.s, t.x, t.y); g.fillText(t.s, t.x, t.y); g.globalAlpha = 1;
    });

    // éclairage : léger voile selon la zone + éclair de dégâts
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (flash > 0) { g.fillStyle = "rgba(255,255,255," + Math.min(0.4, flash) + ")"; g.fillRect(0, 0, canvas.width, canvas.height); }
    if (P && profile.hp < maxHp() * 0.3 && !P.dead) { var v = 0.18 + Math.sin(tPlay * 6) * 0.06; var gr = g.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height * 0.8); gr.addColorStop(0, "rgba(200,0,0,0)"); gr.addColorStop(1, "rgba(200,0,0," + v + ")"); g.fillStyle = gr; g.fillRect(0, 0, canvas.width, canvas.height); }
  }

  function drawPortal(g, tx, ty, col) {
    if (!col) return;
    var x = tx * T, y = ty * T, p = 1 + Math.sin(tPlay * 3) * 0.08;
    g.fillStyle = col; g.globalAlpha = 0.25; g.beginPath(); g.ellipse(x, y, 30 * p, 62 * p, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, 22 * p, 52 * p, 0, 0, TAU); g.stroke();
    for (var i = 0; i < 5; i++) { var a = tPlay * 2 + i * 1.26; g.fillStyle = "#fff"; g.fillRect(x + Math.cos(a) * 18 - 2, y + Math.sin(a) * 46 - 2, 4, 4); }
  }

  function drawPlayer() {
    var g = ctx;
    if (P.inv > 0 && P.dashT <= 0 && Math.floor(tPlay * 20) % 2 === 0 && P.hurt <= 0) g.globalAlpha = 0.6;
    if (P.dashT > 0) g.globalAlpha = 0.55;
    var C = CLASSES[profile.cls];
    drawSquirrel(g, P.x, P.y, P.face, C, { cls: profile.cls, moving: P.moving, anim: P.anim });
    g.globalAlpha = 1;
    if (P.hurt > 0) { g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(P.x, P.y, 15, 0, TAU); g.fill(); }
  }

  /* ====================== INTERFACE ====================== */
  var bannerEl = stage.querySelector("[data-banner]");
  var els = {};
  function $(s) { return stage.querySelector(s); }
  function initHud() {
    ["hp", "hptxt", "xp", "lvl", "gold", "potions", "zone", "quest", "sp", "dash", "pts"].forEach(function (k) { els[k] = $('[data-h="' + k + '"]'); });
  }
  function updateHud() {
    if (!profile || !els.hp) return;
    var mh = maxHp();
    els.hp.style.width = (clamp(profile.hp / mh, 0, 1) * 100) + "%";
    els.hptxt.textContent = Math.ceil(profile.hp) + " / " + mh;
    els.xp.style.width = (profile.lvl >= MAX_LVL ? 100 : clamp(profile.xp / xpFor(profile.lvl), 0, 1) * 100) + "%";
    els.lvl.textContent = "Niv. " + profile.lvl;
    els.gold.textContent = profile.gold;
    els.potions.textContent = profile.potions;
    els.zone.textContent = world ? world.Z.name : "";
    els.pts.hidden = profile.pts <= 0; els.pts.textContent = "+" + profile.pts;
    var q = QUESTS[profile.quest];
    els.quest.innerHTML = q ? "<b>" + esc(q.name) + "</b><br>" + (q.kill === "roi" ? (profile.bossDead ? "Fait" : "Vaincre le Roi-corbeau") : esc(MOBS[q.kill].name) + " " + profile.qn + "/" + q.n) : "<b>Toutes les quêtes sont accomplies</b><br>Bravo, héros de Ronceclair !";
  }
  function updateCooldowns() {
    if (!els.sp) return;
    els.sp.style.setProperty("--cd", clamp(P.spCd / 6, 0, 1));
    els.dash.style.setProperty("--cd", clamp(P.dashCd / 0.9, 0, 1));
  }
  function showBanner(t, sub) {
    banner = { t: 0 };
    bannerEl.innerHTML = "<strong>" + esc(t) + "</strong><span>" + esc(sub || "") + "</span>";
    bannerEl.hidden = false;
    bannerEl.classList.remove("rc-pop"); void bannerEl.offsetWidth; bannerEl.classList.add("rc-pop");
  }

  /* ====================== ÉCRANS (cartes) ====================== */
  var cardHandlers = null;
  function showCard(html, onAct, wide) {
    card.className = "panel game-card rc-card" + (wide ? " rc-wide" : "");
    card.innerHTML = html;
    overlay.hidden = false;
    cardHandlers = onAct;
  }
  function hideCard() { overlay.hidden = true; cardHandlers = null; card.innerHTML = ""; }
  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b || !cardHandlers) return;
    cardHandlers(b.getAttribute("data-act"), b);
  });

  function screenMenu() {
    mode = "menu";
    hudEl.hidden = true;
    var saved = loadProfile(), h = "";
    h += '<h2>Ronceclair</h2><p class="rc-sub">La guilde des écureuils a besoin d\'un héros.</p>';
    if (saved) h += '<button class="btn" data-act="continue" type="button">Continuer · ' + esc(CLASSES[saved.cls].name) + ' niv. ' + saved.lvl + '</button>';
    h += '<p class="rc-pick-title">' + (saved ? "Ou commencer une nouvelle aventure :" : "Choisis ta classe :") + '</p><div class="rc-classes">';
    Object.keys(CLASSES).forEach(function (k) {
      var C = CLASSES[k];
      h += '<button class="rc-class" data-act="new:' + k + '" type="button"><canvas width="96" height="96" data-cls="' + k + '"></canvas><b>' + C.name + '</b><span>' + esc(C.desc) + '</span><em>Spécial : ' + esc(C.special) + '</em></button>';
    });
    h += '</div>';
    showCard(h, function (act) {
      if (act === "continue") { profile = saved; startGame(); }
      else if (act.indexOf("new:") === 0) {
        if (saved && !window.confirm("Effacer ta sauvegarde actuelle ?")) return;
        profile = newProfile(act.slice(4)); saveProfile(); startGame();
      }
    }, true);
    Array.prototype.forEach.call(card.querySelectorAll("canvas[data-cls]"), function (c) {
      var g = c.getContext("2d"), cl = c.getAttribute("data-cls");
      g.translate(48, 62); g.scale(1.75, 1.75);
      drawSquirrel(g, 0, 0, Math.PI / 2 + 0.4, CLASSES[cl], { cls: cl });
    });
  }

  function startGame() {
    hideCard();
    P = makePlayer();
    mode = "play"; hudEl.hidden = false; tPlay = 0;
    enterZone(profile.zone || 0);
    updateHud();
    if (profile.lvl === 1 && profile.kills === 0) showBanner("Bienvenue à Ronceclair", "Parle à Maître Noisetier (F)");
  }

  function screenElder() {
    mode = "dialog";
    var q = QUESTS[profile.quest], h;
    if (!q) h = "<h2>Maître Noisetier</h2><p>Tu as tout accompli, jeune écureuil. Ronceclair est en paix… pour l'instant. De nouvelles zones et classes arriveront bientôt !</p>";
    else h = "<h2>Maître Noisetier</h2><p><b>" + esc(q.name) + "</b></p><p>" + esc(q.text) + "</p><p class=\"rc-sub\">Progression : " + (q.kill === "roi" ? (profile.bossDead ? "1/1" : "0/1") : profile.qn + "/" + q.n) + " · Récompense : " + q.gold + " noisettes, " + q.xp + " XP</p>";
    h += '<button class="btn" data-act="close" type="button">D\'accord</button>';
    showCard(h, function () { hideCard(); mode = "play"; });
  }

  function screenShop() {
    mode = "dialog";
    var h = '<h2>Dame Glandine</h2><p class="rc-sub">Tu as <b>' + profile.gold + '</b> noisettes.</p><div class="rc-list">';
    SHOP.forEach(function (it) {
      var n = it.consumable ? profile.potions : profile.gear[it.id], cost = it.cost(n || 0), maxed = it.max && n >= it.max;
      h += '<div class="rc-row"><div><b>' + esc(it.name) + (it.consumable ? " (×" + profile.potions + ")" : " · niv. " + n + "/" + it.max) + '</b><span>' + esc(it.desc) + '</span></div><button class="btn btn-small" data-act="buy:' + it.id + '" type="button"' + (maxed || profile.gold < cost ? " disabled" : "") + '>' + (maxed ? "Max" : cost + " 🌰") + '</button></div>';
    });
    h += '</div><button class="btn btn-ghost" data-act="close" type="button">Fermer</button>';
    showCard(h, function (act) {
      if (act === "close") { hideCard(); mode = "play"; return; }
      if (act.indexOf("buy:") === 0) {
        var it = SHOP.filter(function (s) { return s.id === act.slice(4); })[0], n = it.consumable ? profile.potions : profile.gear[it.id], cost = it.cost(n || 0);
        if (profile.gold < cost || (it.max && n >= it.max)) return;
        profile.gold -= cost;
        if (it.consumable) profile.potions++; else { profile.gear[it.id]++; if (it.id === "cape") profile.hp += 12; }
        SFX.coin(); saveProfile(); updateHud(); screenShop();
      }
    });
  }

  function screenStats() {
    mode = "dialog";
    var C = CLASSES[profile.cls];
    var h = '<h2>' + esc(C.name) + ' · niveau ' + profile.lvl + '</h2><p class="rc-sub">Points à répartir : <b>' + profile.pts + '</b></p><div class="rc-list">';
    Object.keys(STATS).forEach(function (k) {
      h += '<div class="rc-row"><div><b>' + STATS[k].name + ' : ' + profile.stats[k] + '</b><span>' + STATS[k].desc + '</span></div><button class="btn btn-small" data-act="stat:' + k + '" type="button"' + (profile.pts <= 0 ? " disabled" : "") + '>+1</button></div>';
    });
    h += '</div><p class="rc-sub">PV max <b>' + maxHp() + '</b> · Attaque <b>' + Math.round(atkPower()) + '</b> · Vitesse <b>' + Math.round(moveSpeed()) + '</b> · Critique <b>' + Math.round(critChance() * 100) + ' %</b><br>XP ' + (profile.lvl >= MAX_LVL ? "max" : profile.xp + " / " + xpFor(profile.lvl)) + ' · ' + profile.kills + ' monstres vaincus</p>';
    h += '<button class="btn" data-act="close" type="button">Fermer</button> <button class="btn btn-ghost btn-small" data-act="menu" type="button">Menu principal</button>';
    showCard(h, function (act) {
      if (act === "close") { hideCard(); mode = "play"; return; }
      if (act === "menu") { saveProfile(); hideCard(); screenMenu(); return; }
      if (act.indexOf("stat:") === 0 && profile.pts > 0) {
        profile.stats[act.slice(5)]++; profile.pts--;
        if (act === "stat:vit") profile.hp += 10;
        SFX.coin(); saveProfile(); updateHud(); screenStats();
      }
    });
  }

  function interact() {
    if (mode !== "play" || P.dead) return;
    var i;
    for (i = 0; i < npcs.length; i++) if (dist(npcs[i].x, npcs[i].y, P.x, P.y) < 64) { npcs[i].kind === "elder" ? screenElder() : screenShop(); return; }
    for (i = 0; i < world.chests.length; i++) {
      var c = world.chests[i], key = world.zi + ":" + c.i;
      if (!profile.chests[key] && dist(c.x * T + T / 2, c.y * T + T / 2, P.x, P.y) < 56) {
        profile.chests[key] = 1;
        var g = ri(8, 14) * world.Z.lvl;
        profile.gold += g; SFX.coin();
        addText(P.x, P.y - 28, "+" + g + " noisettes", "#ffd257", true);
        addParts(c.x * T + T / 2, c.y * T + T / 2, 14, ["#ffd257", "#fff"], { max: 130 });
        if (Math.random() < 0.5) { profile.potions++; addText(P.x, P.y - 48, "+1 baie", "#ff8aa8"); }
        saveProfile(); updateHud(); return;
      }
    }
  }

  /* ====================== ENTRÉES ====================== */
  var KEYMAP = { ArrowUp: "up", KeyW: "up", KeyZ: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", KeyQ: "left", ArrowRight: "right", KeyD: "right", Space: "attack" };
  window.addEventListener("keydown", function (e) {
    if (!profile || !stage.isConnected) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    var k = KEYMAP[e.code];
    if (mode === "play") {
      if (k) { keys[k] = true; e.preventDefault(); return; }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") { useDash(); e.preventDefault(); }
      else if (e.code === "KeyE") useSpecial();
      else if (e.code === "KeyF" || e.code === "Enter") interact();
      else if (e.code === "KeyR" || e.code === "KeyH") usePotion();
      else if (e.code === "KeyC" || e.code === "KeyI") screenStats();
    } else if (mode === "dialog" && (e.code === "Escape" || e.code === "KeyC") && !P.dead) { hideCard(); mode = "play"; }
  });
  window.addEventListener("keyup", function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener("blur", function () { keys = {}; mouse.down = false; touchAtk = false; });

  canvas.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.has = true; touchMode = false;
  });
  canvas.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") return;
    var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.has = true; touchMode = false;
    if (e.button === 2) { useDash(); return; }
    mouse.down = true;
    audio();
  });
  window.addEventListener("pointerup", function (e) { if (e.pointerType !== "touch") mouse.down = false; });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  /* commandes tactiles : joystick à gauche, boutons à droite */
  var joyEl = $("[data-joy]"), joyKnob = $("[data-joy-knob]");
  function joyMove(e) {
    var r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy, m = r.width / 2, l = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, l / m);
    joy.ax = dx / l * k; joy.ay = dy / l * k;
    joyKnob.style.transform = "translate(" + (joy.ax * m * 0.6) + "px," + (joy.ay * m * 0.6) + "px)";
  }
  joyEl.addEventListener("pointerdown", function (e) { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); touchMode = true; audio(); joyMove(e); });
  joyEl.addEventListener("pointermove", function (e) { if (joy.id === e.pointerId) joyMove(e); });
  function joyEnd(e) { if (joy.id === e.pointerId) { joy.id = null; joy.ax = joy.ay = 0; joyKnob.style.transform = ""; } }
  joyEl.addEventListener("pointerup", joyEnd); joyEl.addEventListener("pointercancel", joyEnd);

  function holdBtn(sel, down, up) {
    var b = $(sel); if (!b) return;
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); touchMode = e.pointerType === "touch" ? true : touchMode; audio(); b.setPointerCapture(e.pointerId); down(); });
    ["pointerup", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, function () { if (up) up(); }); });
  }
  holdBtn("[data-b=atk]", function () { touchAtk = true; if (mode === "play") useAttack(); }, function () { touchAtk = false; });
  holdBtn("[data-b=dash]", function () { if (mode === "play") useDash(); });
  holdBtn("[data-b=sp]", function () { if (mode === "play") useSpecial(); });
  holdBtn("[data-b=pot]", function () { if (mode === "play") usePotion(); });
  holdBtn("[data-b=act]", function () { interact(); });
  holdBtn("[data-b=menu]", function () { if (mode === "play") screenStats(); });

  /* ====================== BOUCLE ====================== */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, stage.clientWidth); H = Math.max(200, stage.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    cam.z = clamp(Math.min(W, H) / (T * 9.5), 0.7, 1.5);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", function () { setTimeout(resize, 50); });
  window.addEventListener("beforeunload", saveProfile);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveProfile(); });

  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (profile && P && world) {
      if (mode === "play") update(dt);
      else { tPlay += dt; for (var i = parts.length - 1; i >= 0; i--) { parts[i].t += dt; if (parts[i].t >= parts[i].life) parts.splice(i, 1); } }
      render();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#2f6b3e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }

  // accès console pour tester : RC_DEBUG.level(5), RC_DEBUG.gold(100), RC_DEBUG.zone(2)
  window.RC_DEBUG = {
    level: function (n) { while (profile.lvl < n) gainXp(xpFor(profile.lvl), P.x, P.y); },
    gold: function (n) { profile.gold += n; updateHud(); },
    zone: function (z) { profile.quest = Math.max(profile.quest, 1); enterZone(z); updateHud(); },
    spawn: function (type, n) { for (var i = 0; i < (n || 1); i++) { var m = makeMob(type, world.Z.lvl); m.x = P.x + 90 + i * 30; m.y = P.y; m.home = { x: m.x, y: m.y }; m.state = "chase"; mobs.push(m); } },
    mobs: function () { return mobs.map(function (m) { return { t: m.type, hp: m.hp }; }); },
    state: function () { return { profile: profile, mobs: mobs.length, mode: mode, player: P && { x: P.x, y: P.y } }; }
  };

  initHud();
  resize();
  screenMenu();
  requestAnimationFrame(frame);
})();
