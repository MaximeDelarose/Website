/* =========================================================================
   Ronceclair — action-RPG 2D vu de dessus, version écureuils.
   Jeu indépendant d'Arcane Tactics (aucune dépendance au moteur isométrique).

   Moteur du jeu. Données de classes / sorts / équipements : js/ronceclair-data.js.
   Pixel-art : js/ronceclair-art.js. Interface (menus, HUD, fenêtres) : js/ronceclair-ui.js,
   qui parle au moteur par l'objet window.RC défini en bas de ce fichier.
   Sections : données (ZONES, MOBS, QUESTS) · utilitaires · son · profil et stats · carte ·
   entités · combat et sorts · mise à jour · dessin · pont avec l'interface · entrées · en ligne · boucle.
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-ronceclair]");
  var ART = window.RC_ART, DATA = window.RC_DATA;
  if (!stage || !ART || !DATA) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");

  var VERSION = "0.3.0";
  var BAG_MAX = 40;
  var T = 48;                       // taille d'une case en pixels
  var TAU = Math.PI * 2;

  /* ====================== DONNÉES ====================== */

  var CLASSES = DATA.CLASSES, xpFor = DATA.xpFor, MAX_LVL = DATA.MAX_LVL;

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

  /* ====================== PROFIL ET STATS ====================== */
  var profile = null, slots = DATA.loadSlots(), S = null, statsRev = 0;

  function saveProfile() {
    if (!profile) return;
    for (var i = 0; i < slots.length; i++) if (slots[i].id === profile.id) { slots[i] = profile; break; }
    DATA.saveSlots(slots);
  }
  function dirtyStats() { statsRev++; }
  function stats() { if (!S || S.rev !== statsRev || S.p !== profile) { S = DATA.computeStats(profile); S.rev = statsRev; S.p = profile; } return S; }
  function maxHp() { return stats().maxHp; }
  function atkPower() { var v = stats().atk, b = P && P.buffs && P.buffs.atk; return b && b.t > 0 ? v * (1 + b.v) : v; }
  function moveSpeed() { return stats().spd; }
  function critChance() { return stats().crit; }
  function lookSpec(p) { var e = p.eq || {}; return { fur: p.fur, tete: e.tete && e.tete.look, dos: e.dos && e.dos.look, main: e.main && e.main.look }; }

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

  /* pré-rendu du décor statique de la zone (pixel-art, voir js/ronceclair-art.js) */
  function prerender(m) { return ART.terrain(m); }

  /* ====================== ÉTAT DU JEU ====================== */
  var P = null;                     // le joueur
  var mobs = [], shots = [], parts = [], texts = [], drops = [], npcs = [], zones = [];
  var cam = { x: 0, y: 0, z: 1, shake: 0 };
  var W = 800, H = 600, dpr = 1;
  var mode = "title";               // title | play | dialog
  var tPlay = 0, saveTimer = 0, respawnTimer = 0, flash = 0;
  var keys = {}, mouse = { x: 0, y: 0, down: false, has: false };
  var joy = { id: null, x: 0, y: 0, ax: 0, ay: 0, on: false };
  var touchAtk = false, touchMode = false;

  function makePlayer() {
    var C = CLASSES[profile.cls];
    return { x: 0, y: 0, vx: 0, vy: 0, r: 13, face: 0, cd: 0, dashT: 0, dashCd: 0, dashV: 520, skCd: [0, 0, 0], skMax: [1, 1, 1], inv: 0, hurt: 0, anim: 0, moving: false, swing: 0, dead: false, spin: 0, C: C,
      buffs: { shield: { v: 0, t: 0 }, atk: { v: 0, t: 0 }, regen: { v: 0, t: 0 } }, charge: null };
  }

  function enterZone(zi, from, fromHost) {
    profile.zone = zi;
    world = genZone(zi);
    mobs = []; shots = []; parts = []; texts = []; drops = []; npcs = []; zones = [];
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
    // monstres (en coop, seul l'hôte fait vivre le monde ; l'invité reçoit ses monstres par instantanés)
    if (NET.role !== "guest") for (var type in Z.mobs) for (var i = 0; i < Z.mobs[type]; i++) spawnMob(type, true);
    if (Z.boss && !profile.bossDead && NET.role !== "guest") {
      var b = makeMob("roi", Z.lvl + 2);
      b.x = (world.w - 9) * T; b.y = world.exit.y * T + T / 2; b.home = { x: b.x, y: b.y };
      mobs.push(b);
    }
    cam.x = P.x; cam.y = P.y;
    showBanner(Z.name, "Niveau conseillé " + Z.lvl);
    if (NET.role === "host" && NET.on && NET.started) netSend("zone", { zi: zi, back: from === "back" });
    saveProfile();
  }

  var mobSeq = 1;
  function makeMob(type, lvl) {
    var D = MOBS[type], mul = (1 + (lvl - 1) * 0.22) * (NET.role === "host" && R ? 1.7 : 1);
    return { id: mobSeq++, type: type, D: D, x: 0, y: 0, r: D.r, hp: Math.round(D.hp * mul), max: Math.round(D.hp * mul), dmg: Math.round(D.dmg * (1 + (lvl - 1) * 0.12)), lvl: lvl,
      spd: D.spd, bspd: D.spd, slow: 0, slowV: 0, fly: !!D.fly, kx: 0, ky: 0, hurt: 0, cd: rnd(0.4, 1.5), state: "idle", t: rnd(0, 2), dir: rnd(0, TAU), anim: rnd(0, 6), home: null, dashT: 0, dx: 0, dy: 0, phase: 0 };
  }
  function spawnMob(type, initial) {
    var Z = world.Z, m = makeMob(type, Z.lvl + (Math.random() < 0.25 ? 1 : 0)), tries = 0, x, y;
    do {
      x = ri(2, world.w - 3); y = ri(2, world.h - 3); tries++;
    } while (tries < 80 && (world.t[y][x] !== 0 && world.t[y][x] !== 1 || dist(x * T, y * T, P.x, P.y) < (initial ? 300 : 520) || (R && R.x != null && dist(x * T, y * T, R.x, R.y) < 300) || dist(x, y, world.entry.x, world.entry.y) < 8));
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

  function damageMob(m, dmg, kx, ky, crit, slow) {
    if (NET.role === "guest") {                       // l'hôte tranche : on envoie le coup et on montre l'effet tout de suite
      netSend("hit", { id: m.id, d: Math.round(dmg * 10) / 10, kx: Math.round(kx), ky: Math.round(ky), c: crit ? 1 : 0, sl: slow || 0 });
      m.hp = Math.max(1, m.hp - dmg); m.hurt = 0.15;
      addText(m.x, m.y - m.r - 8, Math.round(dmg) + (crit ? "!" : ""), crit ? "#ffd257" : "#fff", crit);
      addParts(m.x, m.y, crit ? 10 : 5, ["#fff", m.D.col], { max: 110 }); SFX.hit();
      return;
    }
    m.hp -= dmg; m.hurt = 0.15; m.kx += kx; m.ky += ky;
    if (slow) { m.slow = slow[1]; m.slowV = slow[0]; }
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
    applyKill(m.type, m.x, m.y, m.lvl, m.elite);
    if (NET.on && NET.started) netSend("kill", { id: m.id, t: m.type, x: Math.round(m.x), y: Math.round(m.y), l: m.lvl, e: m.elite ? 1 : 0 });
  }
  // récompense de mort d'un monstre : jouée chez chaque joueur avec son propre profil
  function applyKill(type, x, y, lvl, elite) {
    var D = MOBS[type];
    addParts(x, y, D.boss ? 40 : 14, [D.col, "#fff", "#ffd257"], { max: 190, size: 6 });
    var g = ri(D.gold[0], D.gold[1]) * (elite ? 2 : 1);
    for (var k = 0; k < Math.min(g, 6); k++) drops.push({ x: x + rnd(-14, 14), y: y + rnd(-14, 14), v: Math.ceil(g / Math.min(g, 6)), kind: "gold", t: rnd(0, 6), vx: rnd(-60, 60), vy: rnd(-60, 60) });
    if (Math.random() < 0.12) drops.push({ x: x, y: y, v: 1, kind: "potion", t: 0, vx: 0, vy: 0 });
    if (Math.random() < (D.boss ? 1 : 0.07 + (elite ? 0.3 : 0))) {              // équipement : visible sur ton écureuil une fois équipé
      var it = DATA.randomItem(Math.max(1, world.Z.lvl + (elite ? 1 : 0)), Math.random, D.boss ? 2 : elite ? 1 : 0);
      drops.push({ x: x, y: y, kind: "item", item: it, t: 0, vx: rnd(-40, 40), vy: rnd(-40, 40) });
    }
    gainXp(Math.round(D.xp * (1 + (lvl - 1) * 0.15) * (elite ? 1.8 : 1)), x, y);
    profile.kills++;
    var q = QUESTS[profile.quest];
    if (q && q.kill === type) {
      profile.qn++;
      if (profile.qn >= q.n) questDone();
      updateHud();
    }
    if (type === "roi") { profile.bossDead = true; shake(14); flash = 0.6; showBanner("Roi-corbeau vaincu !", "Le Marais est libéré"); }
    saveProfile();
  }

  function gainXp(n, x, y) {
    if (profile.lvl >= MAX_LVL) return;
    profile.xp += n;
    addText(x, y - 20, "+" + n + " XP", "#9ad7ff");
    while (profile.lvl < MAX_LVL && profile.xp >= xpFor(profile.lvl)) {
      profile.xp -= xpFor(profile.lvl); profile.lvl++; profile.pts += 2;
      dirtyStats(); profile.hp = maxHp();
      SFX.level(); flash = 0.35;
      addParts(P.x, P.y, 30, ["#ffd257", "#fff", "#9fe870"], { max: 200, leaf: true });
      var si = DATA.SKILL_LEVELS.indexOf(profile.lvl);
      showBanner("Niveau " + profile.lvl + " !", si > 0 ? "Nouveau sort : " + DATA.SKILLS[profile.cls][si].name + " · +2 points (touche C)" : "+2 points de caractéristique (touche C)");
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
    dmg = Math.max(1, dmg * (1 - stats().dr) * (P.buffs.shield.t > 0 ? 1 - P.buffs.shield.v : 1));
    profile.hp -= dmg; P.inv = 0.7; P.hurt = 0.25; P.vx += kx; P.vy += ky;
    addText(P.x, P.y - 24, "-" + Math.round(dmg), "#ff6b6b", true);
    addParts(P.x, P.y, 8, ["#ff6b6b", "#fff"], { max: 120 });
    SFX.hurt(); shake(5); flash = 0.12;
    if (profile.hp <= 0) { profile.hp = 0; die(); }
    updateHud();
  }
  function die() {
    P.dead = true; mode = "dialog";
    var lost = Math.floor(profile.gold * 0.1), coop = NET.on && NET.started;
    profile.gold -= lost;
    ui("death", { lost: lost, coop: coop, revive: function () {
      P.dead = false;
      if (coop) {                                      // coop : on se relève sur place (près du coéquipier) avec la moitié des PV
        profile.hp = Math.ceil(maxHp() / 2); P.inv = 1.5;
        if (R && R.x != null) { P.x = R.x + 24; P.y = R.y; } else { P.x = (world.entry.x + 1.5) * T; P.y = world.entry.y * T + T / 2; }
      } else { profile.hp = maxHp(); profile.zone = 0; enterZone(0); }
      mode = "play"; updateHud();
    } });
  }

  function useAttack() {
    if (P.cd > 0 || P.dead || P.dashT > 0 || mode !== "play") return;
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
      addSlash(P.x, P.y, a, 52, "#fff7d6"); fx({ k: "slash", x: P.x, y: P.y, a: a, r: 52, col: "#fff7d6" });
    } else if (C.kind === "shoot") {
      SFX.shoot();
      pshot({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 0.8, r: 6, pierce: 0, kind: "gland", mine: true, mult: 1 });
    } else if (C.kind === "vine") {
      SFX.shoot();
      pshot({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, life: 0.7, r: 7, pierce: 0, kind: "epine", mine: true, mult: 1, slow: [0.35, 1.5] });
    } else {
      SFX.shoot();
      pshot({ x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, life: 1.0, r: 9, pierce: 3, kind: "orbe", mine: true, mult: 1.15, hit: [] });
    }
  }
  function fx(o) { if (NET.on && NET.started && R) netSend("fx", o); }
  function pshot(o) { shots.push(o); fx({ k: "shot", x: Math.round(o.x), y: Math.round(o.y), vx: Math.round(o.vx), vy: Math.round(o.vy), kind: o.kind, life: o.life }); }
  function pring(r, col, life) { parts.push({ ring: true, x: P.x, y: P.y, r: r, col: col, life: life, t: 0 }); fx({ k: "ring", x: P.x, y: P.y, r: r, col: col, life: life }); }
  function addSlash(x, y, a, r, col) { parts.push({ slash: true, x: x, y: y, a: a, r: r, col: col, life: 0.18, t: 0 }); }

  // point visé (zones) : la souris, ou l'ennemi le plus proche au tactile
  function aimPoint(range) {
    var tx, ty, a = aimAngle();
    if (!touchMode && mouse.has) { tx = (mouse.x - W / 2) / cam.z + cam.x; ty = (mouse.y - H / 2) / cam.z + cam.y; }
    else { var m = nearestMob(P.x, P.y, range); if (m) { tx = m.x; ty = m.y; } else { tx = P.x + Math.cos(a) * range * 0.6; ty = P.y + Math.sin(a) * range * 0.6; } }
    var d = dist(P.x, P.y, tx, ty);
    if (d > range) { tx = P.x + (tx - P.x) / d * range; ty = P.y + (ty - P.y) / d * range; }
    return { x: tx, y: ty };
  }
  function skillOf(i) { return DATA.SKILLS[profile.cls][i]; }
  function skillUnlocked(i) { return profile.lvl >= DATA.SKILL_LEVELS[i]; }
  function healSelf(pct) {
    var amt = Math.round(maxHp() * pct);
    profile.hp = Math.min(maxHp(), profile.hp + amt);
    addText(P.x, P.y - 24, "+" + amt, "#7df0a0", true); addParts(P.x, P.y, 16, ["#7df0a0", "#fff"], { max: 100, leaf: true }); SFX.coin(); updateHud();
  }
  function applyBuff(b) {
    if (!P || P.dead) return;
    if (b.sh) P.buffs.shield = { v: b.sh, t: b.t };
    if (b.atk) P.buffs.atk = { v: b.atk, t: b.t };
    if (b.rg) P.buffs.regen = { v: b.rg, t: b.t };
    addParts(P.x, P.y, 14, ["#ffffff", b.sh ? "#9ad7ff" : "#ff9fd0"], { max: 90 }); SFX.level();
  }

  function useSkill(i) {
    if (!P || P.dead || mode !== "play" || !profile) return;
    var sk = skillOf(i); if (!sk || !skillUnlocked(i) || P.skCd[i] > 0) return;
    var a = aimAngle(), j, m, dmg, an, n, off;
    P.skCd[i] = P.skMax[i] = sk.cd; P.face = a;
    switch (sk.type) {
      case "nova":
        SFX.nova(); shake(4); if (profile.cls === "gardien") P.spin = 0.4;
        pring(sk.r, sk.col, 0.45);
        for (j = mobs.length - 1; j >= 0; j--) { m = mobs[j]; if (dist(P.x, P.y, m.x, m.y) < sk.r + m.r) { dmg = rollDamage(sk.mult); an = Math.atan2(m.y - P.y, m.x - P.x); damageMob(m, dmg.d, Math.cos(an) * sk.knock, Math.sin(an) * sk.knock, dmg.crit); } }
        break;
      case "volley":
        SFX.shoot(); n = sk.n;
        for (j = 0; j < n; j++) {
          off = (j - (n - 1) / 2) * sk.spread;
          pshot({ x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a + off) * sk.speed, vy: Math.sin(a + off) * sk.speed, life: sk.big ? 1.2 : sk.kind === "orbe" ? 1.0 : 0.8,
            r: sk.big ? 12 : sk.kind === "orbe" ? 9 : 6, pierce: (sk.pierce || 0) + (profile.cls === "mystique" && sk.kind === "orbe" ? 1 : 0), kind: sk.kind, mine: true, mult: sk.mult, hit: [], big: !!sk.big });
        }
        break;
      case "zone":
        SFX.nova(); var pt = aimPoint(sk.range);
        zones.push({ x: pt.x, y: pt.y, r: sk.r, dur: sk.dur, t: 0, tick: sk.tick, tt: 0, mult: sk.mult, slow: sk.slow ? [sk.slow, 1.2] : null, col: sk.col, mine: true });
        fx({ k: "zone", x: Math.round(pt.x), y: Math.round(pt.y), r: sk.r, dur: sk.dur, col: sk.col });
        break;
      case "dashstrike":
        SFX.dash(); shake(3); P.dashA = a; P.dashT = 0.22; P.dashV = sk.dist / 0.22; P.inv = Math.max(P.inv, 0.35); P.charge = { mult: sk.mult, knock: sk.knock, hit: [] };
        break;
      case "heal":
        healSelf(sk.pct * (profile.cls === "sylvain" ? 1.25 : 1)); pring(sk.r * 0.6, sk.col, 0.5);
        if (R && R.x != null && !R.dead && dist(P.x, P.y, R.x, R.y) < sk.r) netSend("heal", { pct: sk.pct * (profile.cls === "sylvain" ? 1.25 : 1) });
        break;
      case "buff":
        var b = { t: sk.dur, sh: sk.shield || 0, atk: sk.atk || 0, rg: sk.regen || 0 };
        applyBuff(b); pring(sk.r * 0.5, sk.col, 0.5);
        if (R && R.x != null && !R.dead && dist(P.x, P.y, R.x, R.y) < sk.r) netSend("buff", b);
        break;
    }
    updateHud();
  }
  function useDash() {
    if (P.dashCd > 0 || P.dead || mode !== "play") return;
    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.ax, dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.ay;
    var a = (dx || dy) ? Math.atan2(dy, dx) : P.face;
    P.dashA = a; P.dashT = 0.16; P.dashV = 520; P.charge = null; P.dashCd = 0.9; P.inv = Math.max(P.inv, 0.3); SFX.dash();
    addParts(P.x, P.y, 6, ["#ffffff", "#e8e0c8"], { max: 60 });
  }
  function usePotion() {
    if (profile.potions <= 0 || profile.hp >= maxHp() || P.dead || mode !== "play") return;
    var amt = Math.max(30, Math.round(maxHp() * 0.35));
    profile.potions--; profile.hp = Math.min(maxHp(), profile.hp + amt);
    addText(P.x, P.y - 24, "+" + amt, "#7df0a0", true); addParts(P.x, P.y, 12, ["#7df0a0", "#fff"], { max: 90, leaf: true }); SFX.coin();
    updateHud();
  }

  /* ====================== ÉQUIPEMENT, BOUTIQUE ====================== */
  function findBag(id) { for (var i = 0; i < profile.bag.length; i++) if (profile.bag[i].id === id) return i; return -1; }
  function equipItem(id) {
    var i = findBag(id); if (i < 0) return false;
    var it = profile.bag[i], old = profile.eq[it.slot];
    profile.bag.splice(i, 1); if (old) profile.bag.push(old);
    profile.eq[it.slot] = it; dirtyStats(); profile.hp = Math.min(profile.hp, maxHp()); SFX.level(); saveProfile(); updateHud(); return true;
  }
  function unequipItem(slot) {
    var it = profile.eq[slot]; if (!it || profile.bag.length >= BAG_MAX) return false;
    profile.eq[slot] = null; profile.bag.push(it); dirtyStats(); profile.hp = Math.min(profile.hp, maxHp()); saveProfile(); updateHud(); return true;
  }
  function sellItem(id) {
    var i = findBag(id); if (i < 0) return 0;
    var g = DATA.sellValue(profile.bag[i]); profile.bag.splice(i, 1); profile.gold += g; SFX.coin(); saveProfile(); updateHud(); return g;
  }
  function spendPoint(k) {
    if (profile.pts <= 0 || !DATA.STATS[k]) return false;
    profile.stats[k]++; profile.pts--; dirtyStats(); if (k === "vit") profile.hp += 10; SFX.coin(); saveProfile(); updateHud(); return true;
  }
  function addToBag(it) {
    if (profile.bag.length >= BAG_MAX) { var g = DATA.sellValue(it); profile.gold += g; return { sold: g }; }
    profile.bag.push(it); return { ok: true };
  }
  var shopData = { t: -1e9, stock: [] };
  function shopStock() {
    if (!shopData.stock.length || tPlay - shopData.t > 600) {
      shopData.t = tPlay; shopData.stock = [];
      for (var i = 0; i < 4; i++) shopData.stock.push(DATA.randomItem(Math.max(1, profile.lvl), Math.random, 0, ["tete", "dos", "main", "amulette"][i]));
    }
    return shopData.stock;
  }
  function buyItem(i) {
    var it = shopStock()[i]; if (!it) return false;
    var c = DATA.buyValue(it); if (profile.gold < c || profile.bag.length >= BAG_MAX) return false;
    profile.gold -= c; profile.bag.push(it); shopData.stock.splice(i, 1, null); shopData.stock = shopData.stock.filter(Boolean); SFX.coin(); saveProfile(); updateHud(); return true;
  }
  function buyPotion() { if (profile.gold < 6) return false; profile.gold -= 6; profile.potions++; SFX.coin(); saveProfile(); updateHud(); return true; }

  /* ====================== MISE À JOUR ====================== */
  function update(dt, frozen) {
    var C = P.C, i, m, guest = NET.role === "guest";
    tPlay += dt; profile.time += dt;
    P.cd -= dt; P.dashCd -= dt; P.inv -= dt; P.hurt -= dt; P.swing -= dt; P.spin -= dt;
    for (i = 0; i < 3; i++) P.skCd[i] -= dt;
    P.buffs.shield.t -= dt; P.buffs.atk.t -= dt; P.buffs.regen.t -= dt;

    // déplacement
    var ix = frozen || P.dead ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joy.ax, iy = frozen || P.dead ? 0 : (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joy.ay;
    var il = Math.sqrt(ix * ix + iy * iy);
    if (il > 1) { ix /= il; iy /= il; }
    P.moving = il > 0.12;
    if (P.dashT > 0) {
      P.dashT -= dt;
      moveEnt(P, Math.cos(P.dashA) * P.dashV * dt, Math.sin(P.dashA) * P.dashV * dt);
      if (P.charge) {                                  // Charge du Chêne : frappe une fois chaque ennemi bousculé
        mobs.forEach(function (mm) {
          if (P.charge.hit.indexOf(mm) < 0 && dist(P.x, P.y, mm.x, mm.y) < 44 + mm.r) {
            P.charge.hit.push(mm); var cd2 = rollDamage(P.charge.mult);
            damageMob(mm, cd2.d, Math.cos(P.dashA) * P.charge.knock, Math.sin(P.dashA) * P.charge.knock, cd2.crit);
          }
        });
        if (P.dashT <= 0) P.charge = null;
      }
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

    if (!frozen && (mouse.down || touchAtk || keys.attack)) useAttack();

    // zones au sol (Pluie de glands, Ronces, Tempête…)
    for (i = zones.length - 1; i >= 0; i--) {
      var z = zones[i]; z.t += dt; z.tt += dt;
      if (z.mine && z.tt >= z.tick) {
        z.tt -= z.tick;
        for (var zj = mobs.length - 1; zj >= 0; zj--) { var zm = mobs[zj]; if (dist(z.x, z.y, zm.x, zm.y) < z.r + zm.r) { var zd = rollDamage(z.mult); damageMob(zm, zd.d, 0, 0, zd.crit, z.slow); } }
      }
      if (z.t >= z.dur) zones.splice(i, 1);
    }

    // monstres
    if (guest) {
      for (i = 0; i < mobs.length; i++) { m = mobs[i]; m.anim += dt * 6; m.hurt -= dt; if (m.tx != null) { m.x += (m.tx - m.x) * Math.min(1, dt * 14); m.y += (m.ty - m.y) * Math.min(1, dt * 14); } }
    } else for (i = mobs.length - 1; i >= 0; i--) { m = mobs[i]; mobAI(m, dt); }
    // réapparition douce (hôte et solo seulement)
    respawnTimer += dt;
    if (respawnTimer > 7 && !guest) {
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
            damageMob(mm, dmg.d, Math.cos(an) * 120, Math.sin(an) * 120, dmg.crit, s.slow);
            if (s.hit) s.hit.push(mm);
            if (s.pierce > 0) s.pierce--; else gone = true;
          }
        }
      } else if (!s.ghost && !guest) {
        if (!P.dead && dist(s.x, s.y, P.x, P.y) < s.r + P.r) { hurtPlayer(s.dmg, s.vx * 0.25, s.vy * 0.25); gone = true; }
        else if (R && R.x != null && !R.dead && dist(s.x, s.y, R.x, R.y) < s.r + 13) { netSend("hurt", { d: s.dmg, kx: Math.round(s.vx * 0.25), ky: Math.round(s.vy * 0.25) }); gone = true; }
      }
      if (gone) {
        if (s.mine) addParts(s.x, s.y, 4, [s.kind === "orbe" ? "#c9a6ff" : s.kind === "epine" ? "#7df0a0" : "#d9a35a"], { max: 70 });
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
        else if (d.kind === "item") {
          var rr = addToBag(d.item), RAR = DATA.RARITIES[d.item.rar];
          addText(P.x, P.y - 22, rr.sold ? d.item.name + " (sac plein : vendu " + rr.sold + ")" : d.item.name, RAR.col, true); SFX.level();
          if (d.item.rar >= 2 && !rr.sold) showBanner(d.item.name, RAR.name + " · ouvre ton sac (I) pour l'équiper");
          saveProfile();
        } else { profile.potions++; addText(P.x, P.y - 22, "+1 baie", "#ff8aa8"); SFX.coin(); }
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

    // coéquipier : lissage, envois réseau
    if (R && R.x != null) { R.x += (R.tx - R.x) * Math.min(1, dt * 14); R.y += (R.ty - R.y) * Math.min(1, dt * 14); if (R.m) R.anim += dt * 11; }
    if (NET.on && NET.started) netTick(dt);
    // portails (l'hôte décide pour tout le monde)
    if (!guest) checkPortals();

    // caméra
    cam.x += (P.x - cam.x) * Math.min(1, dt * 7);
    cam.y += (P.y - cam.y) * Math.min(1, dt * 7);
    cam.shake = Math.max(0, cam.shake - dt * 30);
    flash = Math.max(0, flash - dt);

    saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; saveProfile(); }
    profile.hp = Math.min(profile.hp, maxHp());
    // régénération : continue (classe, équipement, Floraison) + lente hors combat
    var rg = stats().regen + (P.buffs.regen.t > 0 ? P.buffs.regen.v : 0);
    if (rg > 0 && !P.dead && profile.hp < maxHp()) profile.hp = Math.min(maxHp(), profile.hp + rg * dt);
    if (profile.hp < maxHp() && !P.dead && !nearestMob(P.x, P.y, 260)) { regen += dt; if (regen > 1) { regen = 0; profile.hp = Math.min(maxHp(), profile.hp + 1 + Math.floor(profile.lvl / 4)); updateHud(); } }
  }
  var regen = 0;

  function mobAI(m, dt) {
    var tg = pickTarget(m), D = m.D, dp = dist(m.x, m.y, tg.x, tg.y), a = Math.atan2(tg.y - m.y, tg.x - m.x);
    m.face = a;
    if (m.slow > 0) m.slow -= dt;
    m.spd = m.bspd * (m.slow > 0 ? 1 - m.slowV : 1);
    m.hurt -= dt; m.anim += dt * 6; m.cd -= dt; m.t -= dt;
    // recul
    if (Math.abs(m.kx) > 1 || Math.abs(m.ky) > 1) { moveEnt(m, m.kx * dt, m.ky * dt); m.kx *= 0.86; m.ky *= 0.86; }

    if (m.type === "roi") return bossAI(m, dt, dp, a, tg);
    var vision = m.type === "corbeau" ? 260 : 200;
    if (m.state === "idle" && dp < vision && !tg.dead) m.state = "chase";
    if (m.state === "chase" && (dp > vision * 2 || tg.dead)) { m.state = "idle"; }

    if (m.state === "idle") {
      if (m.t <= 0) { m.t = rnd(1, 3); m.dir = rnd(0, TAU); m.walk = Math.random() < 0.6; }
      if (m.walk && m.spd > 0) { var w = m.spd * 0.4 * dt; moveEnt(m, Math.cos(m.dir) * w, Math.sin(m.dir) * w); }
      return;
    }
    switch (m.type) {
      case "limace":
        moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
        if (dp < m.r + tg.r + 4 && m.cd <= 0) { m.cd = 1.1; hurtT(tg, m.dmg, Math.cos(a) * 140, Math.sin(a) * 140); }
        break;
      case "corbeau":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + tg.r && !m.dHit) { m.dHit = true; hurtT(tg, m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else {
          // tourne autour du joueur puis pique
          var oa = a + Math.PI + Math.sin(m.anim * 0.3) * 1.2, tx = tg.x + Math.cos(oa) * 120, ty = tg.y + Math.sin(oa) * 120;
          var ta = Math.atan2(ty - m.y, tx - m.x);
          moveEnt(m, Math.cos(ta) * m.spd * dt, Math.sin(ta) * m.spd * dt);
          if (m.cd <= 0 && dp < 230) { m.dashT = 0.35; m.dHit = false; m.dx = Math.cos(a) * 300; m.dy = Math.sin(a) * 300; m.cd = 2.2; }
        }
        break;
      case "renard":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + tg.r && !m.dHit) { m.dHit = true; hurtT(tg, m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else if (m.phase === 1) { m.phase = 0; m.dashT = 0.4; m.dHit = false; m.dx = Math.cos(m.aim) * 380; m.dy = Math.sin(m.aim) * 380; }
        else if (m.phase === 2) { m.windup -= dt; m.aim = a; if (m.windup <= 0) m.phase = 1; }
        else {
          moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
          if (dp < 170 && m.cd <= 0) { m.phase = 2; m.windup = 0.55; m.cd = 2.6; }
        }
        break;
      case "grenouille":
        if (m.dashT > 0) { m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt); if (dp < m.r + tg.r + 4 && !m.dHit) { m.dHit = true; hurtT(tg, m.dmg, m.dx * 0.5, m.dy * 0.5); } }
        else if (m.cd <= 0) { m.dashT = 0.35; m.dHit = false; m.dx = Math.cos(a) * 230; m.dy = Math.sin(a) * 230; m.cd = rnd(1.2, 1.8); }
        break;
    }
  }

  function pickTarget(m) {
    var best = null, bd = 1e9;
    if (!P.dead) { best = { x: P.x, y: P.y, r: P.r, dead: false }; bd = dist(m.x, m.y, P.x, P.y); }
    if (R && R.x != null && !R.dead && NET.role === "host") { var d2 = dist(m.x, m.y, R.x, R.y); if (d2 < bd) best = { x: R.x, y: R.y, r: 13, dead: false, remote: true }; }
    return best || { x: P.x, y: P.y, r: P.r, dead: true };
  }
  function hurtT(tg, dmg, kx, ky) { if (tg.remote) netSend("hurt", { d: dmg, kx: Math.round(kx), ky: Math.round(ky) }); else hurtPlayer(dmg, kx, ky); }

  function bossAI(m, dt, dp, a, tg) {
    var hpR = m.hp / m.max;
    m.state = "chase";
    if (m.dashT > 0) {
      m.dashT -= dt; moveEnt(m, m.dx * dt, m.dy * dt);
      if (dp < m.r + tg.r && m.cd2 <= 0) { m.cd2 = 0.6; hurtT(tg, m.dmg, m.dx * 0.5, m.dy * 0.5); }
      return;
    }
    m.cd2 = (m.cd2 || 0) - dt;
    if (m.phase === 2) { m.windup -= dt; m.aim = a; if (m.windup <= 0) { m.phase = 0; m.dashT = 0.5; m.dx = Math.cos(m.aim) * 440; m.dy = Math.sin(m.aim) * 440; } return; }
    moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt);
    if (dp < m.r + tg.r + 6 && m.cd2 <= 0) { m.cd2 = 1; hurtT(tg, m.dmg, Math.cos(a) * 180, Math.sin(a) * 180); }
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

  /* ====================== DESSIN (pixel-art) ====================== */
  // 1 pixel d'art = 3 unités du monde ; la caméra est calée sur un zoom entier pour des pixels nets.
  var PXU = 3;
  function snap(v) { return Math.round(v / PXU) * PXU; }

  function shadow(g, x, y, w) {                    // ombre au sol : centre plein, bords en damier (comme le dithering des sprites)
    var hw = [w * 0.3, w * 0.5, w * 0.3], row, i;
    g.fillStyle = "rgba(0,0,0,.32)";
    for (row = -1; row <= 1; row++) {
      var half = hw[row + 1], n = Math.round(half / PXU);
      for (i = -n; i < n; i++) { if (Math.abs(i) >= n - 1 && ((i + row) & 1)) continue; g.fillRect(snap(x) + i * PXU, snap(y) + row * PXU, PXU, PXU); }
    }
  }
  // (x, y) = point au sol sous le sprite ; le sprite regarde à droite, flip le retourne
  function drawSpr(g, spr, x, y, flip, o) {
    o = o || {};
    var sc = o.scale || 1, sw = spr.w * PXU * sc, sh = spr.h * PXU * sc, ax = spr.ax * PXU * sc, ay = spr.ay * PXU * sc;
    g.save(); g.translate(snap(x), snap(y) - ay);
    if (flip) g.scale(-1, 1);
    if (o.glow) { var gs = ART.silhouette(spr.c, o.glow); [[-PXU, 0], [PXU, 0], [0, -PXU], [0, PXU]].forEach(function (d) { g.drawImage(gs, -ax + d[0], d[1], sw, sh); }); }
    g.drawImage(spr.c, -ax, 0, sw, sh);
    if (o.flash) g.drawImage(ART.silhouette(spr.c, o.flash), -ax, 0, sw, sh);
    g.restore();
  }
  function faceFlip(o, face) { var c = Math.cos(face); if (c < -0.15) o.flip = true; else if (c > 0.15) o.flip = false; return !!o.flip; }

  function drawHero(g, o) {               // o : { x, y, face, spec, moving, anim, who, flash }
    var fr = o.moving ? Math.floor(o.anim / 2.2) % 2 : Math.floor(tPlay * 1.6) % 2;
    var bob = o.moving && Math.floor(o.anim / 1.1) % 2 ? -PXU : 0;
    shadow(g, o.x, o.y + 12, 42);
    drawSpr(g, ART.hero(o.spec, fr), o.x, o.y + 14 + bob, faceFlip(o.who, o.face), { flash: o.flash });
  }

  function drawMob(g, m) {
    var D = m.D, face = m.face != null ? m.face : Math.atan2(P.y - m.y, P.x - m.x), fr = 0, ground = m.y + m.r * 0.6, y = ground;
    if (m.type === "corbeau") { fr = Math.floor(m.anim * 1.5) % 2; y = ground - 22 + Math.sin(m.anim * 0.5) * 3; }
    else if (m.type === "roi") { fr = Math.floor(m.anim * 1.2) % 2; y = ground - 6 + Math.sin(m.anim * 0.4) * 4; }
    else if (m.type === "renard") fr = m.dashT > 0 || m.state === "chase" ? Math.floor(m.anim * 1.5) % 2 : 0;
    else if (m.type === "grenouille") fr = m.dashT > 0 ? 1 : 0;
    else fr = Math.floor(m.anim * 0.7) % 2;
    var spr = ART.mob(m.type, fr);
    if (m.type === "renard" && m.phase === 2) {      // charge télégraphiée
      g.save(); g.translate(m.x, m.y); g.rotate(m.aim || face); g.fillStyle = "rgba(255,70,50,.3)"; g.fillRect(0, -13, 170, 26); g.fillStyle = "rgba(255,70,50,.55)"; g.fillRect(166, -13, 4, 26); g.restore();
    }
    if (m.type === "roi" && m.phase === 2) { g.save(); g.translate(m.x, m.y); g.rotate(m.aim || face); g.fillStyle = "rgba(255,70,50,.28)"; g.fillRect(0, -26, 260, 52); g.restore(); }
    shadow(g, m.x, ground + 4, m.type === "roi" ? 96 : m.type === "corbeau" ? 36 : 45);
    drawSpr(g, spr, m.x, y + 6, faceFlip(m, face), { flash: m.hurt > 0 ? "#ffffff" : null, glow: m.elite ? "#ffd257" : m.slow > 0 ? "#9be8a8" : null });
    // barre de vie
    if (m.hp < m.max || m.D.boss) {
      var bw = m.D.boss ? 72 : 36, bx = snap(m.x - bw / 2), by = snap(y - spr.ay * PXU - 6);
      g.fillStyle = "#2a1810"; g.fillRect(bx - 3, by - 3, bw + 6, 12);
      g.fillStyle = "#5b2a22"; g.fillRect(bx, by, bw, 6);
      g.fillStyle = m.elite ? "#ffd257" : "#e8584a"; g.fillRect(bx, by, snap(bw * Math.max(0, m.hp / m.max)), 6);
    }
    if (m.elite) { g.fillStyle = "#ffd257"; g.font = "900 14px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "#2a1810"; g.strokeText("★", m.x, y - spr.ay * PXU - 12); g.fillText("★", m.x, y - spr.ay * PXU - 12); }
  }

  function label(g, txt, x, y, col) {
    g.font = "800 13px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.fillStyle = col || "#fff";
    g.strokeText(txt, x, y); g.fillText(txt, x, y);
  }
  function drawNpc(g, n) {
    var near = dist(n.x, n.y, P.x, P.y) < 64, fr = Math.floor(tPlay * 1.4) % 2;
    n.flip = P.x < n.x;
    shadow(g, n.x, n.y + 12, 42);
    drawSpr(g, ART.squirrel(n.kind === "elder" ? "elder" : "glandine", fr), n.x, n.y + 14, n.flip);
    if (n.kind === "shop") drawSpr(g, ART.stall(), n.x, n.y + 38, false);
    label(g, n.name, n.x, n.y - 62);
    var q = QUESTS[profile.quest];
    if (n.kind === "elder" && q) { var by = n.y - 80 + Math.sin(tPlay * 4) * 3; g.fillStyle = "#ffd257"; g.font = "900 24px Nunito, sans-serif"; g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.strokeText("!", n.x, by); g.fillText("!", n.x, by); }
    if (near) label(g, "F · parler", n.x, n.y + 62);
  }

  function drawChest(g, c) {
    var open = profile.chests[world.zi + ":" + c.i], x = c.x * T + T / 2, y = c.y * T + T / 2, near = dist(x, y, P.x, P.y) < 56;
    shadow(g, x, y + 14, 48);
    drawSpr(g, ART.chest(!!open), x, y + 18, false);
    if (!open && near) label(g, "F · ouvrir", x, y + 40);
  }

  function pixArc(g, x, y, r, a0, a1, size, col) {          // arc fait de carrés (pas de trait lisse)
    g.fillStyle = col;
    var n = Math.max(6, Math.round(Math.abs(a1 - a0) * r / (size * 0.9)));
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; g.fillRect(snap(x + Math.cos(a) * r) - size / 2, snap(y + Math.sin(a) * r) - size / 2, size, size); }
  }

  function drawPortal(g, tx, ty, col) {
    if (!col) return;
    var x = tx * T, y = ty * T, p = Math.sin(tPlay * 3) * 3, i;
    g.fillStyle = col; g.globalAlpha = 0.22; g.fillRect(snap(x - 24), snap(y - 54), 48, 108); g.fillRect(snap(x - 33), snap(y - 39), 66, 78); g.globalAlpha = 1;
    pixArc(g, x, y, 1, 0, 0, 0, col);
    for (i = 0; i < 28; i++) { var a = i / 28 * TAU; g.fillStyle = i % 4 === 0 ? "#ffffff" : col; g.fillRect(snap(x + Math.cos(a) * (24 + p)) - 3, snap(y + Math.sin(a) * (54 + p)) - 3, 6, 6); }
    for (i = 0; i < 5; i++) { var b = tPlay * 2 + i * 1.26; g.fillStyle = "#ffffff"; g.fillRect(snap(x + Math.cos(b) * 14), snap(y + Math.sin(b) * 40), 3, 3); }
  }

  function drawMate(g) {
    drawHero(g, { x: R.x, y: R.y, face: R.face || 0, spec: R.lk || { fur: "roux" }, moving: !!R.m, anim: R.anim || 0, who: R, flash: null });
    label(g, (R.name || "Ami") + " · " + (R.lvl || 1), R.x, R.y - 64, "#9ad7ff");
    var bw = 39, bx = snap(R.x - bw / 2), by = R.y - 58;
    g.fillStyle = "#2a1810"; g.fillRect(bx - 3, by - 3, bw + 6, 12); g.fillStyle = "#1c4a2a"; g.fillRect(bx, by, bw, 6); g.fillStyle = "#7df0a0"; g.fillRect(bx, by, snap(bw * clamp((R.hp || 0) / (R.mh || 1), 0, 1)), 6);
  }

  function drawPlayer() {
    var g = ctx;
    if (P.inv > 0 && P.dashT <= 0 && Math.floor(tPlay * 20) % 2 === 0 && P.hurt <= 0) g.globalAlpha = 0.6;
    if (P.dashT > 0) g.globalAlpha = 0.55;
    drawHero(g, { x: P.x, y: P.y, face: P.face, spec: lookSpec(profile), moving: P.moving, anim: P.anim, who: P, flash: P.hurt > 0 ? "#ffffff" : null });
    g.globalAlpha = 1;
    // auras des buffs actifs
    if (P.buffs.shield.t > 0) pixArc(g, P.x, P.y + 4, 30, 0, TAU, 3, "rgba(154,215,255,.9)");
    if (P.buffs.atk.t > 0) pixArc(g, P.x, P.y + 4, 36, tPlay * 2, tPlay * 2 + 4, 3, "rgba(255,159,208,.9)");
    if (P.buffs.regen.t > 0 && Math.floor(tPlay * 6) % 2) { g.fillStyle = "#7df0a0"; g.fillRect(snap(P.x) + 18, snap(P.y) - 18 - ((tPlay * 30) % 24 | 0), 3, 3); }
  }

  function render() {
    var g = ctx, z = cam.z * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#1f3a2b"; g.fillRect(0, 0, canvas.width, canvas.height);
    var sx = cam.shake ? Math.round(rnd(-cam.shake, cam.shake)) : 0, sy = cam.shake ? Math.round(rnd(-cam.shake, cam.shake)) : 0;
    var cx = clamp(cam.x, W / 2 / cam.z, world.w * T - W / 2 / cam.z), cy = clamp(cam.y, H / 2 / cam.z, world.h * T - H / 2 / cam.z);
    if (world.w * T < W / cam.z) cx = world.w * T / 2;
    if (world.h * T < H / cam.z) cy = world.h * T / 2;
    cx = snap(cx); cy = snap(cy);
    g.setTransform(z, 0, 0, z, Math.round((W / 2 - cx * cam.z) * dpr) + sx, Math.round((H / 2 - cy * cam.z) * dpr) + sy);
    g.drawImage(world.pre, 0, 0, world.w * T, world.h * T);

    // reflets d'eau animés (traits de pixels qui glissent)
    var x0 = Math.max(0, Math.floor((cx - W / 2 / cam.z) / T)), x1 = Math.min(world.w - 1, Math.ceil((cx + W / 2 / cam.z) / T));
    var y0 = Math.max(0, Math.floor((cy - H / 2 / cam.z) / T)), y1 = Math.min(world.h - 1, Math.ceil((cy + H / 2 / cam.z) / T));
    g.fillStyle = "rgba(255,255,255,.38)";
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (world.t[ty][tx] === 2) {
      var ph = tPlay * 1.2 + hash2(tx, ty) * 6, ox = Math.round(Math.sin(ph) * 2) * PXU;
      g.fillRect(tx * T + 9 + ox, ty * T + 15, 9, 3); g.fillRect(tx * T + 27 - ox, ty * T + 33, 6, 3);
    }
    drawPortal(g, world.exit.x + 1.2, world.exit.y + 0.5, world.zi < ZONES.length - 1 ? "#ffd257" : null);
    if (world.zi > 0) drawPortal(g, world.entry.x - 1.2, world.entry.y + 0.5, "#9ad7ff");

    // zones au sol : pastilles en damier qui pulsent
    zones.forEach(function (z) {
      var k = 1 - z.t / z.dur, steps = Math.round(z.r / PXU);
      g.fillStyle = z.col; g.globalAlpha = 0.18 + 0.12 * Math.sin(tPlay * 6);
      for (var zy = -steps; zy <= steps; zy++) for (var zx = -steps; zx <= steps; zx++) if (zx * zx + zy * zy <= steps * steps && ((zx + zy) & 1) === 0) g.fillRect(snap(z.x) + zx * PXU, snap(z.y) + zy * PXU, PXU, PXU);
      g.globalAlpha = 0.9; pixArc(g, z.x, z.y, z.r, 0, TAU, 3, z.col); g.globalAlpha = 1;
    });
    // entités triées par y
    var ents = [];
    world.chests.forEach(function (c) { ents.push({ y: c.y * T + T / 2, f: function () { drawChest(g, c); } }); });
    npcs.forEach(function (n) { ents.push({ y: n.y, f: function () { drawNpc(g, n); } }); });
    mobs.forEach(function (m) { ents.push({ y: m.y + (m.fly ? 40 : 0), f: function () { drawMob(g, m); } }); });
    if (!P.dead) ents.push({ y: P.y, f: drawPlayer });
    if (R && R.x != null && !R.dead) ents.push({ y: R.y, f: function () { drawMate(g); } });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.f(); });

    // butin
    drops.forEach(function (d) {
      var by = d.y + 8 + Math.round(Math.sin(d.t * 6) * 1.5) * PXU;
      if (d.kind === "item") { var rc = DATA.RARITIES[d.item.rar].col; if (Math.floor(tPlay * 4) % 2) { g.fillStyle = rc; g.fillRect(snap(d.x) - 12, snap(by) - 24, 3, 3); g.fillRect(snap(d.x) + 9, snap(by) - 18, 3, 3); } drawSpr(g, ART.item("loot" + d.item.rar), d.x, by, false, { glow: d.item.rar >= 2 ? rc : null }); }
      else drawSpr(g, ART.item(d.kind === "gold" ? "gold" : "potion"), d.x, by, false);
    });
    // projectiles
    shots.forEach(function (s) {
      var sp = ART.shot(s.kind === "gland" ? "gland" : s.kind === "orbe" ? "orbe" : s.kind === "epine" ? "epine" : "plume");
      drawSpr(g, sp, s.x, s.y + 6, s.vx < 0, { scale: s.big ? 1.7 : 1 });
    });
    // particules (carrés calés sur la grille de pixels)
    parts.forEach(function (p) {
      var k = 1 - p.t / p.life;
      if (p.slash) { g.globalAlpha = Math.max(0, k); pixArc(g, p.x, p.y, p.r, p.a - 1.1, p.a + 1.1, k > 0.5 ? 9 : 6, p.col); g.globalAlpha = 1; }
      else if (p.ring) { g.globalAlpha = Math.max(0, k); pixArc(g, p.x, p.y, p.r * (1 - k * 0.7), 0, TAU, k > 0.5 ? 9 : 6, p.col); g.globalAlpha = 1; }
      else { g.globalAlpha = Math.max(0, k); g.fillStyle = p.col; var ps = p.s > 4 ? 6 : 3; g.fillRect(snap(p.x), snap(p.y), ps, ps); g.globalAlpha = 1; }
    });
    // textes flottants
    texts.forEach(function (t) {
      g.globalAlpha = Math.max(0, 1 - t.t / 0.9); g.font = "900 " + (t.big ? 20 : 15) + "px Nunito, sans-serif"; g.textAlign = "center";
      g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.fillStyle = t.col; g.strokeText(t.s, t.x, t.y); g.fillText(t.s, t.x, t.y); g.globalAlpha = 1;
    });

    // éclair de dégâts et vignette de danger
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (flash > 0) { g.fillStyle = "rgba(255,255,255," + Math.min(0.4, flash) + ")"; g.fillRect(0, 0, canvas.width, canvas.height); }
    if (P && profile.hp < maxHp() * 0.3 && !P.dead) { var v = 0.18 + Math.sin(tPlay * 6) * 0.06; var gr = g.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height * 0.8); gr.addColorStop(0, "rgba(200,0,0,0)"); gr.addColorStop(1, "rgba(200,0,0," + v + ")"); g.fillStyle = gr; g.fillRect(0, 0, canvas.width, canvas.height); }
  }

  /* ====================== PONT AVEC L'INTERFACE ====================== */
  // js/ronceclair-ui.js fournit RC.ui (title, hud, banner, death, dialog, panel, …) ; le moteur l'appelle via ui().
  var RC = window.RC = { D: DATA, ART: ART, version: VERSION, ui: null };
  function ui(name, a, b) { var u = RC.ui; if (u && u[name]) { try { return u[name](a, b); } catch (e) { if (window.console) console.error(e); } } }
  function updateHud() { ui("hud"); }
  function showBanner(t, sub) { ui("banner", t, sub); }

  function startGame(zi) {
    P = makePlayer(); mode = "play"; tPlay = 0; zones = []; shopData.stock = [];
    dirtyStats();
    if (NET.role === "guest") NET.savedZone = profile.zone;      // l'invité suit l'hôte, sa propre zone sera restaurée en partant
    if (!(profile.hp >= 1)) profile.hp = maxHp();
    profile.hp = Math.min(profile.hp, maxHp());
    enterZone(zi != null ? zi : (profile.zone || 0));
    ui("gameStarted");
    updateHud();
    if (profile.lvl === 1 && profile.kills === 0) showBanner("Bienvenue à Ronceclair", "Parle à Maître Noisetier (F)");
  }

  function interact() {
    if (mode !== "play" || P.dead) return;
    var i;
    for (i = 0; i < npcs.length; i++) if (dist(npcs[i].x, npcs[i].y, P.x, P.y) < 64) { mode = "dialog"; ui("dialog", npcs[i].kind); return; }
    for (i = 0; i < world.chests.length; i++) {
      var c = world.chests[i], key = world.zi + ":" + c.i;
      if (!profile.chests[key] && dist(c.x * T + T / 2, c.y * T + T / 2, P.x, P.y) < 56) {
        profile.chests[key] = 1;
        var g = ri(8, 14) * world.Z.lvl;
        profile.gold += g; SFX.coin();
        addText(P.x, P.y - 28, "+" + g + " noisettes", "#ffd257", true);
        addParts(c.x * T + T / 2, c.y * T + T / 2, 14, ["#ffd257", "#fff"], { max: 130 });
        var it = DATA.randomItem(world.Z.lvl + 1, Math.random, 1), rr = addToBag(it);              // un coffre contient toujours un équipement
        addText(P.x, P.y - 50, rr.sold ? it.name + " (vendu)" : it.name, DATA.RARITIES[it.rar].col, true);
        if (Math.random() < 0.5) { profile.potions++; addText(P.x, P.y - 72, "+1 baie", "#ff8aa8"); }
        saveProfile(); updateHud(); return;
      }
    }
  }

  /* ====================== ENTRÉES ====================== */
  var KEYMAP = { ArrowUp: "up", KeyW: "up", KeyZ: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", KeyQ: "left", ArrowRight: "right", KeyD: "right", Space: "attack" };
  var SKILL_KEYS = { Digit1: 0, Numpad1: 0, KeyE: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2 };
  window.addEventListener("keydown", function (e) {
    if (!profile || !stage.isConnected || mode === "title") return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    var k = KEYMAP[e.code];
    if (mode === "play") {
      if (k) { keys[k] = true; e.preventDefault(); return; }
      if (e.code in SKILL_KEYS) useSkill(SKILL_KEYS[e.code]);
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") { useDash(); e.preventDefault(); }
      else if (e.code === "KeyF" || e.code === "Enter") interact();
      else if (e.code === "KeyR" || e.code === "KeyH") usePotion();
      else if (e.code === "KeyI") { mode = "dialog"; ui("panel", "inventaire"); }
      else if (e.code === "KeyC") { mode = "dialog"; ui("panel", "stats"); }
      else if (e.code === "KeyK") { mode = "dialog"; ui("panel", "sorts"); }
      else if (e.code === "KeyJ") { mode = "dialog"; ui("panel", "quetes"); }
      else if (e.code === "Escape") { mode = "dialog"; ui("panel", "menu"); }
    } else if (mode === "dialog" && e.code === "Escape" && !P.dead) { ui("closeAll"); }
  });
  window.addEventListener("keyup", function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  document.addEventListener("pointerdown", function () { audio(); }, { once: true });
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

  /* ====================== EN LIGNE (coop à 2) ====================== */
  // Modèle : l'hôte fait vivre le monde (monstres, projectiles ennemis). Chaque joueur reste maître de son
  // déplacement et de ses attaques ; l'invité envoie ses coups à l'hôte, qui tranche et renvoie les dégâts subis.
  //   hello / welcome / full : entrée dans le salon      p : état d'un joueur (≈12 / s)
  //   s : instantané des monstres (hôte → invité, 10 / s)  hit : coup de l'invité   hurt : dégâts subis par l'invité
  //   kill : mort d'un monstre (chacun touche XP et butin)  zone : changement de zone (décidé par l'hôte)
  //   fx : effets visuels (coups, tirs)                     bye : départ
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NET = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, guestId: null, started: false,
    err: "", pAcc: 0, sAcc: 0, lastRx: 0, savedZone: null, ts: 0, helloTimer: null, joinTimer: null };
  var R = null;                                       // le coéquipier

  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return NET.client;
  }
  function newCode() { var c = ""; for (var i = 0; i < 4; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; return c; }
  function myName() { return (profile && profile.name) || "Écureuil"; }
  function inviteLink() { return location.origin + location.pathname + "#rc=" + NET.code; }
  function trackMe() { if (NET.ch) NET.ch.track({ id: NET.id, name: myName(), host: NET.role === "host", ts: NET.ts, v: VERSION }); }
  function sayHello() { netSend("hello", { id: NET.id, name: myName(), cls: profile.cls, lvl: profile.lvl, v: VERSION }); }

  function netOpen(code, role) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; return false; }
    netClose();
    NET.on = true; NET.role = role; NET.code = code; NET.err = ""; NET.started = role === "host"; NET.guestId = null; NET.ts = Date.now(); NET.lastRx = Date.now(); R = null;
    var ch = cl.channel("rc-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["hello", "welcome", "full", "p", "s", "hit", "hurt", "kill", "zone", "fx", "heal", "buff", "bye"].forEach(function (ev) {
      ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { if (window.console) console.error(err); } });
    });
    if (window.Party && window.Party.emoteChannel) { try { window.Party.emoteChannel(ch, myName); } catch (e) {} }      // émotes du site (bouton 😀)
    ch.subscribe(function (status) {
      if (status === "SUBSCRIBED") {
        trackMe();
        if (role === "guest") {
          sayHello();
          NET.helloTimer = setInterval(function () { if (NET.started || !NET.ch) { clearInterval(NET.helloTimer); return; } sayHello(); }, 1500);
          NET.joinTimer = setTimeout(function () { if (!NET.started && NET.role === "guest") { netClose(); NET.err = "Salon introuvable ou fermé. Vérifie le code."; ui("netFail", NET.err); } }, 9000);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (role === "guest" && !NET.started) { netClose(); NET.err = "Connexion impossible au salon. Vérifie ta connexion."; ui("netFail", NET.err); }
      }
    });
    NET.ch = ch;
    try { history.replaceState(null, "", "#rc=" + code); } catch (e) {}
    return true;
  }
  function netClose() {
    if (NET.helloTimer) { clearInterval(NET.helloTimer); NET.helloTimer = null; }
    if (NET.joinTimer) { clearTimeout(NET.joinTimer); NET.joinTimer = null; }
    if (NET.ch) {
      try { netSend("bye", { id: NET.id }); NET.ch.untrack(); } catch (e) {}
      try { if (window.Party && window.Party.emoteChannelOff) window.Party.emoteChannelOff(NET.ch); } catch (e) {}
      try { NET.client.removeChannel(NET.ch); } catch (e) {}
    }
    NET.ch = null; NET.on = false; NET.role = null; NET.started = false; NET.guestId = null; NET.code = null; R = null;
    try { if (location.hash) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), ids = [], hostHere = false;
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) { ids.push(st[k][0].id); if (st[k][0].host) hostHere = true; } });
    if (NET.role === "host" && NET.guestId && ids.indexOf(NET.guestId) < 0) partnerLeft();
    else if (NET.role === "guest" && NET.started && !hostHere) partnerLeft();
  }
  function partnerLeft(msg) {
    if (!NET.on) return;
    if (NET.role === "host") {
      var nm = (R && R.name) || "Ton coéquipier";
      R = null; NET.guestId = null;
      showBanner(nm + " a quitté la partie", msg || "Tu continues seul, le salon reste ouvert");
      updateHud();
    } else quitToMenu(msg || "L'hôte a quitté la partie. Ta progression est sauvegardée.");
  }
  function quitToMenu(msg) {
    var sz = NET.savedZone; NET.savedZone = null;
    netClose();
    if (profile) { if (sz != null) profile.zone = sz; saveProfile(); }
    mode = "title"; ui("title", msg || "");
  }

  function onNet(ev, d) {
    if (!d) return;
    if (ev === "hello" && NET.role === "host") {
      if (d.v !== VERSION) { netSend("full", { to: d.id, why: "Versions différentes (" + d.v + " / " + VERSION + ") : rechargez la page tous les deux." }); return; }
      if (NET.guestId && NET.guestId !== d.id) { netSend("full", { to: d.id, why: "Salon plein (2 joueurs max)." }); return; }
      if (!R || R.id !== d.id) {
        NET.guestId = d.id; R = { id: d.id, name: d.name, cls: d.cls, lvl: d.lvl, x: null }; NET.lastRx = Date.now();
        showBanner((d.name || "Un ami") + " a rejoint la partie", "Coop à 2 : les monstres sont plus costauds"); updateHud(); SFX.quest();
      }
      netSend("welcome", { to: d.id, id: NET.id, zi: world.zi, name: myName(), cls: profile.cls, lvl: profile.lvl, v: VERSION });
    } else if (ev === "welcome" && NET.role === "guest") {
      if (d.to !== NET.id || NET.started) return;
      if (NET.helloTimer) { clearInterval(NET.helloTimer); NET.helloTimer = null; }
      if (NET.joinTimer) { clearTimeout(NET.joinTimer); NET.joinTimer = null; }
      R = { id: d.id, name: d.name, cls: d.cls, lvl: d.lvl, x: null }; NET.started = true; NET.lastRx = Date.now();
      startGame(d.zi);
    } else if (ev === "full") {
      if (d.to === NET.id && NET.role === "guest" && !NET.started) { netClose(); NET.err = d.why || "Salon plein."; ui("netFail", NET.err); }
    } else if (ev === "p") {
      if (!R || d.id !== R.id) return;
      R.tx = d.x; R.ty = d.y; if (R.x == null) { R.x = d.x; R.y = d.y; }
      R.face = d.f; R.m = !!d.m; R.hp = d.hp; R.mh = d.mh; R.dead = !!d.dd; R.dh = !!d.dh; R.cls = d.c; R.lvl = d.l; R.name = d.n; NET.lastRx = Date.now();
      if (d.lk) { var lk = d.lk.split("|"); R.lk = { fur: lk[0], tete: lk[1] || null, dos: lk[2] || null, main: lk[3] || null }; }
    } else if (ev === "s") {
      if (NET.role === "guest" && NET.started && world) applySnap(d);
    } else if (ev === "hit") {
      if (NET.role !== "host") return;
      for (var i = 0; i < mobs.length; i++) if (mobs[i].id === d.id) { damageMob(mobs[i], d.d, d.kx, d.ky, !!d.c, d.sl || null); break; }
    } else if (ev === "hurt") {
      if (NET.role === "guest" && P && !P.dead && mode !== "title") hurtPlayer(d.d, d.kx, d.ky);
    } else if (ev === "kill") {
      if (NET.role !== "guest" || !world) return;
      mobs = mobs.filter(function (m) { return m.id !== d.id; });
      applyKill(d.t, d.x, d.y, d.l, !!d.e);
    } else if (ev === "zone") {
      if (NET.role === "guest" && NET.started && P) enterZone(d.zi, d.back ? "back" : undefined, true);
    } else if (ev === "fx") {
      if (d.k === "slash") addSlash(d.x, d.y, d.a, d.r, d.col);
      else if (d.k === "ring") parts.push({ ring: true, x: d.x, y: d.y, r: d.r, col: d.col, life: d.life, t: 0 });
      else if (d.k === "zone") zones.push({ x: d.x, y: d.y, r: d.r, dur: d.dur, t: 0, tick: 1e9, tt: 0, col: d.col, mine: false });
      else if (d.k === "shot") shots.push({ x: d.x, y: d.y, vx: d.vx, vy: d.vy, life: d.life, r: 6, kind: d.kind, mine: false, ghost: true, dmg: 0 });
    } else if (ev === "heal") {
      if (P && !P.dead && mode !== "title") healSelf(d.pct);
    } else if (ev === "buff") {
      applyBuff(d);
    } else if (ev === "bye") {
      if (R && d.id === R.id) partnerLeft();
    }
  }

  function sendP() {
    netSend("p", { id: NET.id, x: Math.round(P.x), y: Math.round(P.y), f: Math.round(P.face * 100) / 100, m: P.moving ? 1 : 0, hp: Math.ceil(profile.hp), mh: maxHp(),
      dd: P.dead ? 1 : 0, dh: P.dashT > 0 ? 1 : 0, c: profile.cls, l: profile.lvl, n: myName(), lk: (function () { var l = lookSpec(profile); return [l.fur, l.tete || "", l.dos || "", l.main || ""].join("|"); })() });
  }
  function sendS() {
    netSend("s", {
      z: world.zi,
      m: mobs.map(function (m) { return [m.id, m.type, Math.round(m.x), Math.round(m.y), Math.round(m.hp), m.max, m.elite ? 1 : 0, m.phase || 0, m.dashT > 0 ? 1 : 0, m.hurt > 0 ? 1 : 0, Math.round((m.face || 0) * 100) / 100, m.lvl, m.windup > 0 ? 1 : 0, Math.round(m.aim * 100) / 100 || 0]; }),
      sh: shots.filter(function (s) { return !s.mine && !s.ghost; }).map(function (s) { return [Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.kind, Math.round(s.life * 10) / 10]; })
    });
  }
  function applySnap(d) {
    if (d.z !== world.zi) return;
    var byId = {}, out = [];
    mobs.forEach(function (m) { byId[m.id] = m; });
    d.m.forEach(function (a) {
      var m = byId[a[0]];
      if (!m) { m = makeMob(a[1], a[11]); m.id = a[0]; m.x = a[2]; m.y = a[3]; }
      m.tx = a[2]; m.ty = a[3]; m.hp = a[4]; m.max = a[5]; m.elite = !!a[6]; m.phase = a[7] ? (a[12] ? 2 : a[7]) : 0; m.dashT = a[8] ? 0.1 : 0;
      if (a[9]) m.hurt = 0.1;
      m.face = a[10]; m.lvl = a[11]; m.aim = a[13];
      out.push(m);
    });
    mobs = out;
    shots = shots.filter(function (s) { return s.mine || s.ghost; }).concat(d.sh.map(function (a) { return { x: a[0], y: a[1], vx: a[2], vy: a[3], kind: a[4], life: a[5], r: 7, mine: false, dmg: 0 }; }));
  }
  function netTick(dt) {
    if (!R) return;
    NET.pAcc += dt; if (NET.pAcc > 0.085) { NET.pAcc = 0; sendP(); }
    if (NET.role === "host") { NET.sAcc += dt; if (NET.sAcc > 0.1) { NET.sAcc = 0; sendS(); } }
    if (Date.now() - NET.lastRx > 9000) partnerLeft("Connexion perdue avec ton coéquipier.");
  }

  /* ====================== BOUCLE ====================== */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, stage.clientWidth); H = Math.max(200, stage.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    var want = Math.min(W, H) / (T * 9.5), S = Math.max(2, Math.round(want * 3 * dpr));   // pixels écran par pixel d'art : entier, pour des pixels nets
    cam.z = S / (3 * dpr);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", function () { setTimeout(resize, 50); });
  window.addEventListener("beforeunload", saveProfile);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveProfile(); });

  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (profile && P && world && mode !== "title") {
      if (mode === "play") update(dt);
      else if (mode === "dialog" && NET.on && NET.started) update(dt, true);
      else { tPlay += dt; for (var i = parts.length - 1; i >= 0; i--) { parts[i].t += dt; if (parts[i].t >= parts[i].life) parts.splice(i, 1); } }
      render();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }

  // accès console pour tester : RC_DEBUG.start("lanceur"), .level(5), .gold(100), .zone(2), .spawn('renard', 2), .item(3)
  window.RC_DEBUG = {
    start: function (cls, name, fur) { var p = RC.createProfile(cls, name || "Test", fur || "roux"); RC.start(p); },
    level: function (n) { while (profile.lvl < n) gainXp(xpFor(profile.lvl), P.x, P.y); },
    gold: function (n) { profile.gold += n; updateHud(); },
    zone: function (z) { profile.quest = Math.max(profile.quest, 1); enterZone(z); updateHud(); },
    spawn: function (type, n) { for (var i = 0; i < (n || 1); i++) { var m = makeMob(type, world.Z.lvl); m.x = P.x + 90 + i * 30; m.y = P.y; m.home = { x: m.x, y: m.y }; m.state = "chase"; mobs.push(m); } },
    mobs: function () { return mobs.map(function (m) { return { t: m.type, hp: m.hp, x: Math.round(m.x), y: Math.round(m.y), st: m.state, ph: m.phase, cd: Math.round(m.cd * 10) / 10, sp: Math.round(m.spd) }; }); },
    item: function (rar, slot) { var it = DATA.genItem(slot || DATA.SLOT_ORDER[Math.floor(Math.random() * 4)], profile.lvl, rar == null ? 2 : rar); profile.bag.push(it); updateHud(); return it; },
    tpNpc: function (kind) { for (var i = 0; i < npcs.length; i++) if (npcs[i].kind === kind) { P.x = npcs[i].x - 34; P.y = npcs[i].y; return true; } return false; },
    state: function () { return { profile: profile, mobs: mobs.length, mode: mode, player: P && { x: P.x, y: P.y } }; }
  };

  /* API pour l'interface (js/ronceclair-ui.js) */
  RC.profile = function () { return profile; };
  RC.slots = function () { return slots; };
  RC.createProfile = function (cls, name, fur) {
    if (slots.length >= DATA.MAX_SLOTS) return null;
    var p = DATA.newProfile(cls, name, fur); slots.push(p); DATA.saveSlots(slots); return p;
  };
  RC.deleteSlot = function (i) { slots.splice(i, 1); DATA.saveSlots(slots); };
  RC.select = function (p) { profile = p; dirtyStats(); };
  RC.start = function (p, zi) { profile = p; startGame(zi); };
  RC.mode = function () { return mode; };
  RC.setMode = function (m) { mode = m; if (m === "play") { keys = {}; mouse.down = false; } };
  RC.stats = stats; RC.maxHp = maxHp; RC.lookSpec = lookSpec; RC.save = saveProfile;
  RC.cooldowns = function () { return P ? { atk: P.cd, atkMax: P.C.cd, sk: P.skCd.slice(), skMax: P.skMax.slice(), dash: P.dashCd, dashMax: 0.9 } : null; };
  RC.buffs = function () { return P ? P.buffs : null; };
  RC.useSkill = useSkill; RC.useAttack = useAttack; RC.useDash = useDash; RC.usePotion = usePotion; RC.interact = interact;
  RC.skillUnlocked = skillUnlocked; RC.skillOf = skillOf;
  RC.equip = equipItem; RC.unequip = unequipItem; RC.sell = sellItem; RC.spend = spendPoint; RC.BAG_MAX = BAG_MAX;
  RC.shop = { stock: shopStock, buyItem: buyItem, buyPotion: buyPotion };
  RC.quests = function () { return { list: QUESTS, cur: profile.quest, n: profile.qn, bossDead: profile.bossDead, mobs: MOBS }; };
  RC.zoneName = function () { return world ? world.Z.name : ""; };
  RC.dead = function () { return !!(P && P.dead); };
  RC.mate = function () { return R; };
  RC.net = NET;
  RC.coop = function () { return NET.on && NET.started; };
  RC.host = function () { var c = newCode(); return netOpen(c, "host") ? c : null; };
  RC.join = function (code) { return netOpen(code, "guest"); };
  RC.leave = function () { if (NET.role === "guest" && profile) quitToMenu(); else netClose(); };
  RC.inviteLink = inviteLink;
  RC.touch = {
    move: function (ax, ay) { joy.ax = ax; joy.ay = ay; if (ax || ay) touchMode = true; },
    attack: function (down) { touchAtk = down; touchMode = true; if (down) useAttack(); }
  };
  RC.quitToTitle = function () { saveProfile(); if (NET.on) { var sz = NET.savedZone; NET.savedZone = null; netClose(); if (sz != null) profile.zone = sz; saveProfile(); } mode = "title"; ui("title", ""); };
  RC.sfx = SFX;

  window.addEventListener("beforeunload", function () { if (NET.ch) netSend("bye", { id: NET.id }); });
  resize();
  requestAnimationFrame(frame);
  RC.ready = true;
  if (RC.ui && RC.ui.boot) RC.ui.boot();
})();
