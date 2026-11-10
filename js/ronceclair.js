/* =========================================================================
   Ronceclair — RPG tactique au tour par tour, façon Dofus, vu de dessus, version écureuils.
   Moteur du jeu : exploration au clic sur la carte, groupes de monstres, combats sur cellules
   (placement, PA / PM, sorts élémentaires Terre / Feu / Eau / Air), récompenses, coop à 2 en ligne.
   Règles de combat : js/ronceclair-tactics.js · données : js/ronceclair-data.js ·
   pixel-art : js/ronceclair-art.js · interface : js/ronceclair-ui.js (parle au moteur par window.RC).
   Sections : données (ZONES, QUESTS) · utilitaires · son · profil · carte · exploration · équipement ·
   combat · dessin · pont avec l'interface · entrées · en ligne · boucle.
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-ronceclair]");
  var ART = window.RC_ART, DATA = window.RC_DATA, TACT = window.RC_TACT;
  if (!stage || !ART || !DATA || !TACT) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");

  var VERSION = "0.4.0";
  var BAG_MAX = 40;
  var T = 48;                       // taille d'une case en unités du monde (16 pixels d'art × 3)
  var TAU = Math.PI * 2;

  /* ====================== DONNÉES ====================== */
  // pool = monstres qui peuplent la zone, groups = nombre de groupes sur la carte, size = [min, max] monstres par groupe
  var ZONES = [
    { id: "clairiere", name: "Clairière de Ronceclair", w: 46, h: 32, seed: 11, lvl: 1, req: 1, village: true,
      col: { g1: "#92d06c", g2: "#86c561", path: "#dcc592", tree: "#2f7a45", tree2: "#3d9556", water: "#62b8dc" },
      pool: ["limace", "limace", "corbeau"], groups: 6, size: [1, 2], trees: 0.14, ponds: 2 },
    { id: "sousbois", name: "Sous-bois moussu", w: 52, h: 36, seed: 23, lvl: 3, req: 3,
      col: { g1: "#6fb15a", g2: "#64a653", path: "#b99f6f", tree: "#1f5e3a", tree2: "#2c7a4b", water: "#4f9fc0" },
      pool: ["limace", "corbeau", "renard", "renard"], groups: 7, size: [2, 3], trees: 0.2, ponds: 2 },
    { id: "marais", name: "Marais aux nénuphars", w: 54, h: 38, seed: 37, lvl: 6, req: 5, boss: true,
      col: { g1: "#7fae62", g2: "#74a15b", path: "#a99a68", tree: "#2c5a3c", tree2: "#3b7350", water: "#4d9a8f" },
      pool: ["grenouille", "grenouille", "corbeau", "renard"], groups: 7, size: [2, 3], trees: 0.14, ponds: 7 }
  ];
  var QUESTS = [
    { id: "q1", name: "Limaces gloutonnes", text: "Vaincs 5 limaces qui ravagent la clairière.", kill: "limace", n: 5, xp: 60, gold: 20 },
    { id: "q2", name: "Ciel menaçant",      text: "Vaincs 4 corbeaux qui volent nos noisettes.", kill: "corbeau", n: 4, xp: 110, gold: 30 },
    { id: "q3", name: "Rôdeurs du Sous-bois", text: "Écarte 4 renards dans le Sous-bois moussu.", kill: "renard", n: 4, xp: 220, gold: 60 },
    { id: "q4", name: "Le Roi-corbeau",     text: "Vaincs le Roi-corbeau au fond du Marais.", kill: "roi", n: 1, xp: 700, gold: 200 }
  ];
  var MOBS = DATA.MOBS, xpFor = DATA.xpFor, MAX_LVL = DATA.MAX_LVL;

  /* ====================== UTILITAIRES ====================== */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function seeded(seed) {           // mulberry32
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash2(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

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
    step: function () { blip(160, 0.05, "triangle", 0.03); },
    hit: function () { blip(180, 0.1, "sawtooth", 0.07, -90); },
    crit: function () { blip(300, 0.16, "sawtooth", 0.09, -150); },
    heal: function () { blip(660, 0.12, "sine", 0.07, 240); },
    terre: function () { blip(120, 0.18, "sawtooth", 0.08, -50); },
    feu: function () { blip(240, 0.2, "sawtooth", 0.07, 260); },
    eau: function () { blip(520, 0.16, "sine", 0.07, -200); },
    air: function () { blip(700, 0.12, "triangle", 0.06, -400); },
    coin: function () { blip(880, 0.07, "square", 0.05); setTimeout(function () { blip(1320, 0.08, "square", 0.05); }, 60); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, 0.14, "square", 0.06); }, i * 90); }); },
    quest: function () { [660, 880].forEach(function (f, i) { setTimeout(function () { blip(f, 0.16, "triangle", 0.07); }, i * 120); }); },
    turn: function () { blip(440, 0.08, "triangle", 0.05); blip(660, 0.1, "triangle", 0.05); },
    start: function () { [330, 440, 660].forEach(function (f, i) { setTimeout(function () { blip(f, 0.12, "square", 0.06); }, i * 90); }); },
    portal: function () { blip(300, 0.4, "sine", 0.08, 500); },
    die: function () { blip(200, 0.3, "sawtooth", 0.08, -150); }
  };

  /* ====================== PROFIL ET STATS ====================== */
  var profile = null, slots = DATA.loadSlots(), S = null, statsRev = 0, packDirty = true;
  function saveProfile() {
    if (!profile) return;
    for (var i = 0; i < slots.length; i++) if (slots[i].id === profile.id) { slots[i] = profile; break; }
    DATA.saveSlots(slots);
  }
  function dirtyStats() { statsRev++; packDirty = true; }
  function stats() { if (!S || S.rev !== statsRev || S.p !== profile) { S = DATA.computeStats(profile); S.rev = statsRev; S.p = profile; } return S; }
  function maxHp() { return stats().maxHp; }
  function lookSpec(p) { var e = p.eq || {}; return { fur: p.fur, tete: e.tete && e.tete.look, dos: e.dos && e.dos.look, main: e.main && e.main.look }; }

  /* ====================== CARTE ====================== */
  // types de case : 0 herbe, 1 chemin, 2 eau, 3 arbre, 4 rocher
  var BLOCK = { 2: true, 3: true, 4: true };
  var world = null;                 // zone courante

  function genZone(zi) {
    var Z = ZONES[zi], R0 = seeded(Z.seed), w = Z.w, h = Z.h, x, y, t = [];
    for (y = 0; y < h; y++) { t.push([]); for (x = 0; x < w; x++) t[y].push(0); }
    var A = [];
    for (y = 0; y < h; y++) { A.push([]); for (x = 0; x < w; x++) A[y].push(R0() < Z.trees ? 1 : 0); }
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
    for (var p = 0; p < Z.ponds; p++) {
      var cx = ri2(R0, 8, w - 9), cy = ri2(R0, 6, h - 7), rx = 2 + R0() * 3, ry = 2 + R0() * 2.2;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var ex = (x - cx) / rx, ey = (y - cy) / ry; if (ex * ex + ey * ey < 1) t[y][x] = 2; }
    }
    for (var r = 0; r < Math.round(w * h / 110); r++) { x = ri2(R0, 2, w - 3); y = ri2(R0, 2, h - 3); if (t[y][x] === 0) t[y][x] = 4; }
    var sy = Math.floor(h / 2), phase = R0() * TAU, amp = h * 0.18;
    for (x = 1; x < w - 1; x++) {
      var cyy = Math.round(sy + Math.sin(x / w * TAU * 1.4 + phase) * amp);
      for (var k = -1; k <= 1; k++) { var py = cyy + k; if (py > 0 && py < h - 1) t[py][x] = 1; }
    }
    function clear(cx2, cy2, rad, kind) { for (var yy = cy2 - rad; yy <= cy2 + rad; yy++) for (var xx = cx2 - rad; xx <= cx2 + rad; xx++) if (xx > 0 && yy > 0 && xx < w - 1 && yy < h - 1 && dist(xx, yy, cx2, cy2) <= rad + 0.3) t[yy][xx] = kind; }
    var entry = { x: 3, y: Math.round(sy + Math.sin(3 / w * TAU * 1.4 + phase) * amp) };
    var exit = { x: w - 4, y: Math.round(sy + Math.sin((w - 4) / w * TAU * 1.4 + phase) * amp) };
    clear(entry.x, entry.y, 3, 0); clear(exit.x, exit.y, 3, 0);
    if (Z.village) clear(entry.x + 7, entry.y, 4, 0);
    if (Z.boss) clear(w - 10, exit.y, 6, 0);
    for (x = 0; x < w; x++) { t[0][x] = 3; t[h - 1][x] = 3; }
    for (y = 0; y < h; y++) { t[y][0] = 3; t[y][w - 1] = 3; }
    for (var o = -1; o <= 1; o++) { t[entry.y + o][0] = Z.village ? 3 : 0; t[exit.y + o][w - 1] = 0; }
    if (zi > 0) for (o = -1; o <= 1; o++) t[entry.y + o][0] = 0;
    if (zi === ZONES.length - 1) for (o = -1; o <= 1; o++) t[exit.y + o][w - 1] = 3;
    var chests = [], tries = 0;
    while (chests.length < 3 && tries++ < 400) {
      x = ri2(R0, 6, w - 7); y = ri2(R0, 4, h - 5);
      if (t[y][x] === 0 && dist(x, y, entry.x, entry.y) > 6) chests.push({ x: x, y: y, i: chests.length });
    }
    var deco = [];
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      var hv = hash2(x + Z.seed * 7, y);
      if (t[y][x] === 0 && hv < 0.07) deco.push({ x: x * T + hash2(y, x) * T, y: y * T + hash2(x * 3, y) * T, k: hv < 0.025 ? "fleur" : hv < 0.045 ? "touffe" : (zi === 2 ? "champi" : "fleur"), c: Math.floor(hash2(x, y * 5) * 4) });
      if (t[y][x] === 2 && zi === 2 && hv < 0.12) deco.push({ x: x * T + 24, y: y * T + 24, k: "nenuphar", c: 0 });
    }
    var m = { zi: zi, Z: Z, w: w, h: h, t: t, entry: entry, exit: exit, chests: chests, deco: deco, pre: null };
    m.pre = ART.terrain(m);
    return m;
  }
  function ri2(R0, a, b) { return a + Math.floor(R0() * (b - a + 1)); }
  function tileAt(tx, ty) { return tx < 0 || ty < 0 || tx >= world.w || ty >= world.h ? 3 : world.t[ty][tx]; }
  function walkTile(tx, ty) { return !BLOCK[tileAt(tx, ty)]; }
  function solidAt(px, py) { return !!BLOCK[tileAt(Math.floor(px / T), Math.floor(py / T))]; }
  function blockedCircle(x, y, r) { return solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r); }

  /* ====================== ÉTAT DU JEU ====================== */
  var mode = "title";                // title | explore | fight
  var P = null;                      // le joueur sur la carte
  var groups = [], npcs = [], parts = [], texts = [], groupSeq = 1;
  var cam = { x: 0, y: 0, z: 1, shake: 0, used: null };
  var W = 800, H = 600, dpr = 1;
  var tPlay = 0, saveTimer = 0, respawnT = 0, uiBlock = false;
  var keys = {}, mouse = { x: 0, y: 0, has: false, hoverGroup: null };
  var F = null, V = null;            // le combat (état de règles) et son état d'affichage
  var shopData = { t: -1e9, stock: [] };

  function makePlayer() { return { x: 0, y: 0, r: 13, face: 0, path: [], goal: null, moving: false, anim: 0, flip: false }; }

  /* ====================== EXPLORATION ====================== */
  function enterZone(zi, from) {
    profile.zone = zi;
    world = genZone(zi);
    parts = []; texts = []; groups = []; npcs = [];
    var Z = ZONES[zi], spot = from === "back" ? world.exit : world.entry;
    P.x = (spot.x + (from === "back" ? -1.5 : 1.5)) * T; P.y = spot.y * T + T / 2; P.path = []; P.goal = null;
    if (Z.village) {
      npcs.push({ id: "elder", name: "Maître Noisetier", x: (world.entry.x + 6) * T, y: (world.entry.y - 1) * T, kind: "elder" });
      npcs.push({ id: "shop", name: "Dame Glandine", x: (world.entry.x + 9) * T, y: (world.entry.y + 1) * T, kind: "shop" });
    }
    if (NET.role !== "guest") {
      for (var i = 0; i < Z.groups; i++) spawnGroup(true);
      if (Z.boss && !profile.bossDead) groups.push({ id: groupSeq++, boss: true, tx: world.w - 9, ty: world.exit.y, mobs: [{ type: "roi", lvl: Z.lvl + 2 }, { type: "corbeau", lvl: Z.lvl + 1 }, { type: "corbeau", lvl: Z.lvl + 1 }] });
    }
    groups.forEach(placeGroup);
    cam.x = P.x; cam.y = P.y;
    ui("banner", Z.name, "Niveau conseillé " + Z.lvl);
    if (NET.role === "host" && NET.on && NET.started) { netSend("zone", { zi: zi, back: from === "back" }); sendGroups(); }
    saveProfile();
  }
  function placeGroup(g) { g.x = g.tx * T + T / 2; g.y = g.ty * T + T / 2; g.ph = Math.random() * 6; }
  function nearNpc(tx, ty) { return npcs.some(function (n) { return dist(tx * T, ty * T, n.x, n.y) < 3 * T; }); }
  function spawnGroup(initial) {
    var Z = ZONES[world.zi], tries = 0, tx, ty;
    do { tx = ri(2, world.w - 3); ty = ri(2, world.h - 3); tries++; }
    while (tries < 100 && (!walkTile(tx, ty) || tileAt(tx, ty) === 2 || dist(tx, ty, world.entry.x, world.entry.y) < (initial ? 9 : 6) || (P && dist(tx * T, ty * T, P.x, P.y) < 7 * T) || groups.some(function (g) { return dist(tx, ty, g.tx, g.ty) < 5; }) || nearNpc(tx, ty)));
    if (tries >= 100) return;
    var r0 = Math.random(), n = Z.size[0] === 1 ? (r0 < 0.4 ? 1 : 2) : (r0 < 0.65 ? 2 : 3), mobs = []; n = clamp(n, Z.size[0], Z.size[1]);
    for (var i = 0; i < n; i++) mobs.push({ type: pick(Z.pool), lvl: Z.lvl + (Math.random() < 0.3 ? 1 : 0) });
    var g = { id: groupSeq++, tx: tx, ty: ty, mobs: mobs }; placeGroup(g); groups.push(g);
  }

  // chemin en cases (4 directions) ; renvoie une liste de centres de cases
  function findPath(sx, sy, tx, ty) {
    if (!walkTile(tx, ty)) return null;
    var key = function (x, y) { return y * world.w + x; }, prev = {}, q = [[sx, sy]], seen = {}, i;
    seen[key(sx, sy)] = 1;
    for (i = 0; i < q.length; i++) {
      var c = q[i];
      if (c[0] === tx && c[1] === ty) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], k = key(nx, ny);
        if (seen[k] || !walkTile(nx, ny)) return;
        seen[k] = 1; prev[k] = c; q.push([nx, ny]);
      });
    }
    if (!seen[key(tx, ty)]) return null;
    var out = [], cur = [tx, ty];
    while (cur && !(cur[0] === sx && cur[1] === sy)) { out.unshift({ x: cur[0] * T + T / 2, y: cur[1] * T + T / 2 }); cur = prev[key(cur[0], cur[1])]; }
    return out;
  }
  function walkTo(wx, wy, goal) {
    var tx = Math.floor(wx / T), ty = Math.floor(wy / T), sx = Math.floor(P.x / T), sy = Math.floor(P.y / T);
    if (!walkTile(tx, ty)) {                                     // case bloquée : la plus proche case libre
      var best = null, bd = 99;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) if (walkTile(tx + dx, ty + dy) && Math.abs(dx) + Math.abs(dy) < bd) { bd = Math.abs(dx) + Math.abs(dy); best = [tx + dx, ty + dy]; }
      if (!best) return false; tx = best[0]; ty = best[1];
    }
    var path = findPath(sx, sy, tx, ty); if (!path) return false;
    P.path = path; P.goal = goal || null; return true;
  }
  function updateExplore(dt) {
    tPlay += dt; profile.time += dt;
    var ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0), sp = 200, i;
    if ((ix || iy) && !uiBlock) {                                // déplacement libre au clavier
      P.path = []; P.goal = null;
      var l = Math.sqrt(ix * ix + iy * iy); ix /= l; iy /= l;
      if (!blockedCircle(P.x + ix * sp * dt, P.y, 10)) P.x += ix * sp * dt;
      if (!blockedCircle(P.x, P.y + iy * sp * dt, 10)) P.y += iy * sp * dt;
      P.moving = true; P.face = Math.atan2(iy, ix);
    } else if (P.path.length) {                                  // marche le long du chemin cliqué
      var wp = P.path[0], d = dist(P.x, P.y, wp.x, wp.y), st = sp * dt;
      P.face = Math.atan2(wp.y - P.y, wp.x - P.x);
      if (d <= st) { P.x = wp.x; P.y = wp.y; P.path.shift(); } else { P.x += (wp.x - P.x) / d * st; P.y += (wp.y - P.y) / d * st; }
      P.moving = true;
    } else P.moving = false;
    if (P.moving) P.anim += dt * 11;
    // objectif atteint : parler, ouvrir, engager
    var g = P.goal;
    if (g && !P.path.length) {
      P.goal = null;
      if (g.kind === "npc" && dist(P.x, P.y, g.ref.x, g.ref.y) < 90) openNpc(g.ref);
      else if (g.kind === "chest") openChest(g.ref);
      else if (g.kind === "group" && groups.indexOf(g.ref) >= 0 && dist(P.x, P.y, g.ref.x, g.ref.y) < 110) engage(g.ref);
    }
    if (mode !== "explore") return;                              // un combat vient de commencer
    if (P.moving && !uiBlock) for (i = 0; i < groups.length; i++) if (dist(P.x, P.y, groups[i].x, groups[i].y) < 46) { engage(groups[i]); break; }
    // régénération hors combat : 2 % des PV par seconde
    var mh = maxHp(); if (profile.hp < mh) profile.hp = Math.min(mh, profile.hp + mh * 0.02 * dt);
    if (NET.role !== "guest") checkPortals();                    // l'hôte décide de la zone pour tout le monde
    if (NET.role !== "guest") { respawnT += dt; if (respawnT > 20 && groups.length < ZONES[world.zi].groups + (ZONES[world.zi].boss && !profile.bossDead ? 1 : 0)) { respawnT = 0; spawnGroup(false); if (NET.role === "host") sendGroups(); } }
    if (R && R.x != null) { R.x += (R.tx - R.x) * Math.min(1, dt * 12); R.y += (R.ty - R.y) * Math.min(1, dt * 12); if (R.m) R.anim += dt * 11; }
    stepFx(dt);
    cam.x += (P.x - cam.x) * Math.min(1, dt * 8); cam.y += (P.y - cam.y) * Math.min(1, dt * 8);
    saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; saveProfile(); }
    if (NET.on && NET.started) netTick(dt);
  }
  var portalMsg = 0;
  function checkPortals() {
    var tx = P.x / T, ty = P.y / T;
    if (tx > world.w - 1.6 && Math.abs(ty - world.exit.y) < 2.5 && world.zi < ZONES.length - 1) {
      var nz = ZONES[world.zi + 1];
      if (profile.lvl >= nz.req && (world.zi > 0 || profile.quest >= 1)) { SFX.portal(); enterZone(world.zi + 1); }
      else if (!portalMsg || tPlay - portalMsg > 2.5) {
        portalMsg = tPlay; ui("banner", "Passage fermé", profile.lvl < nz.req ? "Il faut le niveau " + nz.req : "Termine d'abord la quête de Maître Noisetier");
        P.path = []; P.x -= 10;
      }
    }
    if (world.zi > 0 && tx < 1.4 && Math.abs(ty - world.entry.y) < 2.5) { SFX.portal(); enterZone(world.zi - 1, "back"); }
  }
  function openNpc(n) { P.path = []; ui("dialog", n.kind); }
  function openChest(c) {
    var key = world.zi + ":" + c.i;
    if (profile.chests[key]) return;
    profile.chests[key] = 1;
    var g = ri(8, 14) * world.Z.lvl; profile.gold += g; SFX.coin();
    addText(P.x, P.y - 28, "+" + g + " noisettes", "#ffd257", true);
    var it = DATA.randomItem(world.Z.lvl + 1, Math.random, 1, null, DATA.ELEMENTS[DATA.CLASSES[profile.cls].el[0]].stat), rr = addToBag(it);
    addText(P.x, P.y - 50, rr.sold ? it.name + " (vendu)" : it.name, DATA.RARITIES[it.rar].col, true);
    if (Math.random() < 0.5) { profile.potions++; addText(P.x, P.y - 72, "+1 baie", "#ff8aa8"); }
    saveProfile(); ui("hud");
  }
  function interact() {
    if (mode !== "explore" || uiBlock) return;
    var i;
    for (i = 0; i < npcs.length; i++) if (dist(npcs[i].x, npcs[i].y, P.x, P.y) < 90) { openNpc(npcs[i]); return; }
    for (i = 0; i < world.chests.length; i++) { var c = world.chests[i]; if (!profile.chests[world.zi + ":" + c.i] && dist(c.x * T + T / 2, c.y * T + T / 2, P.x, P.y) < 80) { openChest(c); return; } }
    for (i = 0; i < groups.length; i++) if (dist(groups[i].x, groups[i].y, P.x, P.y) < 120) { engage(groups[i]); return; }
  }
  function usePotion() {
    if (!profile || profile.potions <= 0 || mode !== "explore" || profile.hp >= maxHp()) return;
    var amt = Math.max(30, Math.round(maxHp() * 0.4));
    profile.potions--; profile.hp = Math.min(maxHp(), profile.hp + amt);
    addText(P.x, P.y - 24, "+" + amt, "#7df0a0", true); SFX.heal(); ui("hud");
  }
  function addText(x, y, s, col, big) { texts.push({ x: x, y: y, s: s, col: col || "#fff", t: 0, big: !!big }); }
  function stepFx(dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; if (p.t >= p.life) parts.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; texts[i].y -= 30 * dt; if (texts[i].t > 1.0) texts.splice(i, 1); }
    cam.shake = Math.max(0, cam.shake - dt * 30);
  }

  /* ====================== ÉQUIPEMENT, BOUTIQUE ====================== */
  function findBag(id) { for (var i = 0; i < profile.bag.length; i++) if (profile.bag[i].id === id) return i; return -1; }
  function equipItem(id) {
    var i = findBag(id); if (i < 0) return false;
    var it = profile.bag[i], old = profile.eq[it.slot];
    profile.bag.splice(i, 1); if (old) profile.bag.push(old);
    profile.eq[it.slot] = it; dirtyStats(); profile.hp = Math.min(profile.hp, maxHp()); SFX.level(); saveProfile(); ui("hud"); return true;
  }
  function unequipItem(slot) {
    var it = profile.eq[slot]; if (!it || profile.bag.length >= BAG_MAX) return false;
    profile.eq[slot] = null; profile.bag.push(it); dirtyStats(); profile.hp = Math.min(profile.hp, maxHp()); saveProfile(); ui("hud"); return true;
  }
  function sellItem(id) {
    var i = findBag(id); if (i < 0) return 0;
    var g = DATA.sellValue(profile.bag[i]); profile.bag.splice(i, 1); profile.gold += g; SFX.coin(); saveProfile(); ui("hud"); return g;
  }
  function spendPoint(k, n) {
    n = Math.min(n || 1, profile.pts);
    if (n <= 0 || !DATA.CHARS[k]) return false;
    profile.chars[k] += n; profile.pts -= n; dirtyStats(); if (k === "vit") profile.hp += n * 2; SFX.coin(); saveProfile(); ui("hud"); return true;
  }
  function addToBag(it) {
    if (profile.bag.length >= BAG_MAX) { var g = DATA.sellValue(it); profile.gold += g; return { sold: g }; }
    profile.bag.push(it); return { ok: true };
  }
  function shopStock() {
    if (!shopData.stock.length || tPlay - shopData.t > 600) {
      shopData.t = tPlay; shopData.stock = [];
      var elStat = DATA.ELEMENTS[DATA.CLASSES[profile.cls].el[0]].stat;
      for (var i = 0; i < 4; i++) shopData.stock.push(DATA.randomItem(Math.max(1, profile.lvl), Math.random, 0, ["tete", "dos", "main", "amulette"][i], elStat));
    }
    return shopData.stock;
  }
  function buyItem(i) {
    var it = shopStock()[i]; if (!it) return false;
    var c = DATA.buyValue(it); if (profile.gold < c || profile.bag.length >= BAG_MAX) return false;
    profile.gold -= c; profile.bag.push(it); shopData.stock.splice(i, 1); SFX.coin(); saveProfile(); ui("hud"); return true;
  }
  function buyPotion() { if (profile.gold < 6) return false; profile.gold -= 6; profile.potions++; SFX.coin(); saveProfile(); ui("hud"); return true; }

  /* ====================== COMBAT : MISE EN PLACE ====================== */
  var CELL_CH = { 0: "0", 1: "0", 2: "1", 3: "2", 4: "2" };
  function localOwner() { return NET.role === "guest" ? 1 : 0; }
  function myUnit() { if (!F) return null; var o = localOwner(); for (var i = 0; i < F.units.length; i++) if (F.units[i].kind === "hero" && F.units[i].owner === o) return F.units[i]; return null; }
  function guestInFight() { return !!(F && F.units.some(function (u) { return u.id === "h1"; })); }
  // taille des cases (en pixels écran) et dimensions de l'arène selon la place disponible
  function uiReserve() { return W < 860 ? 255 : 190; }          // hauteur prise par la frise des tours (haut) et la barre de sorts (bas)
  function fitArena() {
    var cands = [64, 48, 32], i;
    for (i = 0; i < cands.length; i++) {
      var c = cands[i], cols = Math.floor((W - 16) / c), rows = Math.floor((H - uiReserve()) / c);
      if (cols >= 9 && rows >= 7) return { c: c, cols: Math.min(cols, 15), rows: Math.min(rows, 11) };
    }
    return { c: 32, cols: Math.max(7, Math.min(11, Math.floor((W - 8) / 32))), rows: Math.max(6, Math.min(9, Math.floor((H - uiReserve()) / 32))) };
  }
  function cellFor(cols, rows) { var cands = [64, 48, 32]; for (var i = 0; i < cands.length; i++) if (cols * cands[i] <= W - 8 && rows * cands[i] <= H - uiReserve()) return cands[i]; return 32; }
  function engage(group) {
    if (mode !== "explore" || F) return;
    if (NET.role === "guest") { netSend("engage", { gid: group.id }); P.path = []; P.goal = null; return; }
    startFight(group);
  }
  function startFight(group) {
    var dims = fitArena(), cols = dims.cols, rows = dims.rows, gtx = group.tx, gty = group.ty;
    var ax = clamp(gtx - Math.floor(cols / 2), 0, Math.max(0, world.w - cols)), ay = clamp(gty - Math.floor(rows / 2), 0, Math.max(0, world.h - rows));
    var g = TACT.buildGrid(cols, rows, function (x, y) { return CELL_CH[tileAt(ax + x, ay + y)]; });
    // monstres : les cases libres les plus proches de l'endroit du groupe
    var free = [], x, y; for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) if (g.charAt(y * cols + x) === "0") free.push({ x: x, y: y });
    var gx = gtx - ax, gy = gty - ay;
    free.sort(function (a, b) { return Math.abs(a.x - gx) + Math.abs(a.y - gy) - Math.abs(b.x - gx) - Math.abs(b.y - gy); });
    var mobs = [], used = [];
    group.mobs.forEach(function (m, i) {
      var c = null;
      for (var k = 0; k < free.length; k++) { var cc = free[k]; if (used.some(function (u) { return u.x === cc.x && u.y === cc.y; })) continue; c = cc; break; }
      used.push(c); mobs.push({ unit: TACT.mobUnit(m.type, m.lvl, "m" + i), x: c.x, y: c.y });
    });
    // héros : cases proches de leur position actuelle, à au moins 4 cases des monstres
    var px = clamp(Math.floor(P.x / T) - ax, 0, cols - 1), py = clamp(Math.floor(P.y / T) - ay, 0, rows - 1);
    var isUsed = function (c) { return used.some(function (u) { return u.x === c.x && u.y === c.y; }); };
    var zone = free.filter(function (c) { return !isUsed(c) && used.every(function (u) { return Math.abs(u.x - c.x) + Math.abs(u.y - c.y) >= 4; }); });
    zone.sort(function (a, b) { return Math.abs(a.x - px) + Math.abs(a.y - py) - Math.abs(b.x - px) - Math.abs(b.y - py); });
    zone = zone.slice(0, 12);
    if (zone.length < 3) zone = free.filter(function (c) { return !isUsed(c); }).slice(-6);
    var heroes = [TACT.heroUnit(profile, "h0", 0)];
    if (NET.role === "host" && R && guestPack) heroes.push(TACT.heroUnit(guestPack, "h1", 1));
    F = TACT.create({ w: cols, h: rows, g: g, zone: zone, heroes: heroes, mobs: mobs });
    F.ax = ax; F.ay = ay; F.gid = group.id; F.c = dims.c;
    heroes.forEach(function (h, i) { var z = zone[i % zone.length]; h.x = z.x; h.y = z.y; });
    beginFightView();
    if (NET.role === "host" && NET.started && guestInFight()) sendFight(true);
  }
  function beginFightView() {
    mode = "fight"; P.path = []; P.goal = null; keys = {};
    V = { u: {}, floats: [], proj: [], cellfx: [], sel: null, hover: null, pending: null, reachKey: "", reach: null, aiT: 0.9, turnT: 0, endShown: false, c: F.c || 48, dying: {}, lastTurn: null };
    F.units.forEach(function (u) { V.u[u.id] = { cx: u.x, cy: u.y, path: [], flash: 0, hpv: u.hp, fl: u.side === 1 }; });
    ui("closeAll"); ui("fightStart");
    SFX.start(); ui("banner", "Place-toi !", "Choisis ta case de départ (zone verte) puis clique sur Prêt");
    handleEvents(F.ev); F.ev = [];
  }

  /* ====================== COMBAT : COMMANDES ET ÉVÉNEMENTS ====================== */
  // l'hôte (ou le solo) applique la commande tout de suite ; l'invité l'envoie à l'hôte
  function doCmd(c) {
    if (!F) return false;
    var me = myUnit(); if (!me) return false;
    if (NET.role === "guest") { netSend("fc", { c: c }); return true; }
    var r = TACT.cmd(F, me.id, c);
    if (r.err) return false;
    afterCmd();
    return true;
  }
  function afterCmd() {
    var ev = F.ev; F.ev = [];
    handleEvents(ev);
    if (NET.role === "host" && NET.started && guestInFight()) sendFight(false, ev);
    if (F.phase === "end") onFightEnd();
    V.reachKey = ""; V.turnT = 0;
    var me = myUnit(); if (V.sel && me && TACT.canCast(F, me, V.sel)) V.sel = null;
  }
  function handleEvents(evs) {
    evs.forEach(function (e) {
      var u = e.id && TACT.unit(F, e.id), vu = e.id && V.u[e.id];
      switch (e.t) {
        case "move": if (vu) { vu.path = e.path.slice(1); } break;
        case "tp": if (vu) { vu.path = []; burstCell(vu.cx, vu.cy, "#c9a6ff"); vu.cx = e.x; vu.cy = e.y; burstCell(e.x, e.y, "#c9a6ff"); } SFX.air(); break;
        case "push": if (vu) { vu.path = [{ x: e.x, y: e.y }]; } break;
        case "dmg":
          if (vu && u) { vu.flash = 0.25; floatAt(u, e.abs && !e.n ? "bouclier" : String(e.n), (DATA.ELEMENTS[e.el] || { col: "#fff" }).col, e.crit); if (e.abs && e.n) floatAt(u, "(" + e.abs + " absorbés)", "#9ad7ff", false, 18); }
          if (e.crit) SFX.crit(); else SFX.hit();
          cam.shake = Math.max(cam.shake, e.crit ? 5 : 2); break;
        case "heal": if (u) { floatAt(u, "+" + e.n, "#7df0a0", false); burstCell(u.x, u.y, "#7df0a0"); } SFX.heal(); break;
        case "shield": if (u) floatAt(u, "+" + e.n + " bouclier", "#9ad7ff", false); break;
        case "buff": if (u) floatAt(u, (e.v > 0 ? "+" : "") + e.v + " " + e.st.toUpperCase(), e.v > 0 ? "#ffd257" : "#ff8a7a", false); break;
        case "die": if (vu) V.dying[e.id] = 0.7; SFX.die(); break;
        case "cast": {
          var cu = TACT.unit(F, e.id), sp = TACT.spell(e.sid), col = (DATA.ELEMENTS[sp.el] || { col: "#fff" }).col;
          if (cu && V.u[cu.id]) {
            var cv = V.u[cu.id], far = TACT.dist(cv.cx, cv.cy, e.x, e.y);
            if (far > 1.5) V.proj.push({ x0: cv.cx, y0: cv.cy, x1: e.x, y1: e.y, t: 0, dur: 0.16 + 0.03 * far, col: col });
            else if (far > 0) V.proj.push({ x0: cv.cx, y0: cv.cy, x1: e.x, y1: e.y, t: 0, dur: 0.14, col: col, slash: true });
            if (e.x !== cv.cx) cv.fl = e.x < cv.cx;
          }
          e.cells.forEach(function (c) { burstCell(c.x, c.y, col, 0.12 + 0.03 * (cu ? TACT.dist(cu.x, cu.y, e.x, e.y) : 0)); });
          (SFX[sp.el] || SFX.hit)(); break;
        }
        case "turn": {
          V.lastTurn = e.id; V.turnT = 0;
          var me = myUnit();
          if (u && me && u.id === me.id) { ui("banner", "À toi de jouer !", "Round " + e.round); SFX.turn(); }
          break;
        }
        case "start": ui("banner", "Le combat commence !", ""); SFX.start(); break;
      }
    });
  }
  function floatAt(u, s, col, big, dy) { V.floats.push({ cx: u.x, cy: u.y, s: s, col: col, t: 0, big: !!big, dy: dy || 0 }); }
  function burstCell(cx, cy, col, delay) { V.cellfx.push({ x: cx, y: cy, t: -(delay || 0), col: col }); }

  // clic sur une case de l'arène
  function fightClick(cx, cy, touch) {
    if (!F || uiBlock) return;
    var me = myUnit(); if (!me || !me.alive) return;
    if (F.phase === "placement") { if (!F.ready[me.id]) doCmd({ t: "place", x: cx, y: cy }); return; }
    var cur = TACT.current(F); if (!cur || cur.id !== me.id || F.phase !== "fight" || animBusy()) return;
    if (touch && !(V.pending && V.pending.x === cx && V.pending.y === cy)) { V.pending = { x: cx, y: cy }; V.hover = { x: cx, y: cy }; return; }   // tactile : 1er appui = aperçu, 2e = confirmation
    V.pending = null;
    if (V.sel) {
      var ok = TACT.castCells(F, me, V.sel).some(function (c) { return c.x === cx && c.y === cy; });
      if (ok) doCmd({ t: "cast", sid: V.sel, x: cx, y: cy }); else V.sel = null;
      return;
    }
    var map = TACT.reach(F, me), k = cx + "," + cy;
    if (map[k] && map[k].c > 0) doCmd({ t: "move", x: cx, y: cy });
  }
  function selectSpell(sid) {
    if (!F || F.phase !== "fight") return;
    var me = myUnit(), cur = TACT.current(F); if (!me || !cur || cur.id !== me.id) return;
    if (!sid || V.sel === sid) { V.sel = null; return; }
    var err = me.spells.indexOf(sid) < 0 ? "x" : TACT.canCast(F, me, sid);
    if (err) { ui("banner", "Sort indisponible", err === "pa" ? "Pas assez de PA" : err === "cd" ? "Sort en recharge" : "Limite de lancers atteinte"); return; }
    V.sel = sid; V.pending = null;
  }
  function endTurn() { if (!F || F.phase !== "fight") return; var me = myUnit(), cur = TACT.current(F); if (!me || !cur || cur.id !== me.id) return; V.sel = null; doCmd({ t: "end" }); }
  function usePotionFight() { if (!F || F.phase !== "fight") return; var me = myUnit(), cur = TACT.current(F); if (!me || !cur || cur.id !== me.id) return; doCmd({ t: "potion" }); }
  function readyUp() { if (!F || F.phase !== "placement") return; var me = myUnit(); if (me && !F.ready[me.id]) doCmd({ t: "ready" }); }
  function animBusy() { for (var id in V.u) if (V.u[id].path.length) return true; return V.proj.length > 0; }

  /* ---------- fin de combat et récompenses ---------- */
  function onFightEnd() {
    if (V.endShown) return; V.endShown = true;
    var me = myUnit(), res = F.result, out = { win: res.win, xp: 0, gold: 0, items: [], levels: 0, lost: 0 };
    if (me) { profile.hp = Math.max(1, me.hp); profile.potions = Math.max(0, me.potions); }
    if (res.win) {
      var xp = Math.round(res.xp * (1 + stats().xpPct / 100)); out.xp = xp; out.gold = res.gold;
      profile.gold += res.gold; profile.xp += xp;
      res.kills.forEach(function (type) {
        profile.kills++;
        var q = QUESTS[profile.quest];
        if (q && q.kill === type) { profile.qn++; if (profile.qn >= q.n) { out.quest = q.name; profile.gold += q.gold; profile.xp += q.xp; out.xp += q.xp; out.gold += q.gold; profile.quest++; profile.qn = 0; SFX.quest(); } }
        if (type === "roi") profile.bossDead = true;
        if (Math.random() < (type === "roi" ? 1 : 0.16) * stats().pros / 100) {
          var it = DATA.randomItem(Math.max(1, world.Z.lvl + (type === "roi" ? 1 : 0)), Math.random, type === "roi" ? 2 : 0, null, DATA.ELEMENTS[DATA.CLASSES[profile.cls].el[0]].stat);
          var rr = addToBag(it); out.items.push({ name: it.name, rar: it.rar, slot: it.slot, look: it.look, sold: rr.sold || 0 });
        }
      });
      while (profile.lvl < MAX_LVL && profile.xp >= xpFor(profile.lvl)) { profile.xp -= xpFor(profile.lvl); profile.lvl++; profile.pts += DATA.PTS_PER_LEVEL; out.levels++; dirtyStats(); profile.hp = maxHp(); }
      if (out.levels) SFX.level(); else SFX.coin();
    } else { out.lost = Math.floor(profile.gold * 0.1); profile.gold -= out.lost; }
    saveProfile();
    ui("fightEnd", out);
  }
  // l'interface appelle closeFight quand le joueur clique sur « Continuer »
  function closeFight() {
    if (!F) return;
    var win = F.result && F.result.win, gid = F.gid;
    if (NET.role !== "guest" && win) { for (var i = groups.length - 1; i >= 0; i--) if (groups[i].id === gid) groups.splice(i, 1); }
    F = null; V = null; mode = "explore";
    if (!win) {                                                  // défaite : moitié des PV, retour au village en solo
      profile.hp = Math.ceil(maxHp() / 2);
      if (!(NET.on && NET.started) && world.zi !== 0) enterZone(0);
    }
    if (NET.role === "host" && NET.on) { netSend("fend", {}); sendGroups(); }
    saveProfile(); ui("hud");
  }

  /* ---------- animations, IA et chronomètre (hôte et solo) ---------- */
  function updateFight(dt) {
    tPlay += dt; var i;
    for (var id in V.u) {
      var vu = V.u[id], u = TACT.unit(F, id); if (!u) continue;
      var tgt = vu.path.length ? vu.path[0] : { x: u.x, y: u.y }, dx = tgt.x - vu.cx, dy = tgt.y - vu.cy, d = Math.sqrt(dx * dx + dy * dy), sp = (vu.path.length ? 8 : 14) * dt;
      if (d <= sp) { vu.cx = tgt.x; vu.cy = tgt.y; if (vu.path.length) { vu.path.shift(); SFX.step(); } } else { vu.cx += dx / d * sp; vu.cy += dy / d * sp; if (Math.abs(dx) > 0.05) vu.fl = dx < 0; }
      vu.flash = Math.max(0, vu.flash - dt); vu.hpv += (u.hp - vu.hpv) * Math.min(1, dt * 7);
    }
    for (var did in V.dying) V.dying[did] -= dt;
    for (i = V.floats.length - 1; i >= 0; i--) { V.floats[i].t += dt; if (V.floats[i].t > 1.2) V.floats.splice(i, 1); }
    for (i = V.proj.length - 1; i >= 0; i--) { V.proj[i].t += dt; if (V.proj[i].t >= V.proj[i].dur) V.proj.splice(i, 1); }
    for (i = V.cellfx.length - 1; i >= 0; i--) { V.cellfx[i].t += dt; if (V.cellfx[i].t > 0.5) V.cellfx.splice(i, 1); }
    stepFx(dt);
    if (NET.role !== "guest" && F.phase === "fight") {           // l'hôte (ou le solo) joue les monstres, une commande à la fois
      var cur = TACT.current(F);
      if (cur && cur.kind === "mob") {
        V.aiT -= dt;
        if (V.aiT <= 0 && !animBusy()) {
          var a = TACT.aiStep(F), r;
          if (a.t === "end") { TACT.endTurn(F); r = { ok: true }; } else r = TACT.cmd(F, cur.id, a);
          if (r.err) TACT.endTurn(F);
          V.aiT = a.t === "cast" ? 0.85 : a.t === "move" ? 0.25 : 0.4;
          afterCmd();
        }
      } else if (cur) {                                           // chronomètre de tour, au cas où un joueur s'absente
        V.turnT += dt;
        if (V.turnT > 120) { TACT.endTurn(F); afterCmd(); }
      }
    }
    if (NET.on && NET.started) netTick(dt);
  }

  /* ====================== DESSIN ====================== */
  var PXU = 3;
  function snap(v) { return Math.round(v / PXU) * PXU; }
  function shadow(g, x, y, w) {
    var hw = [w * 0.3, w * 0.5, w * 0.3], row, i;
    g.fillStyle = "rgba(0,0,0,.32)";
    for (row = -1; row <= 1; row++) {
      var half = hw[row + 1], n = Math.round(half / PXU);
      for (i = -n; i < n; i++) { if (Math.abs(i) >= n - 1 && ((i + row) & 1)) continue; g.fillRect(snap(x) + i * PXU, snap(y) + row * PXU, PXU, PXU); }
    }
  }
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
  function label(g, txt, x, y, col, size) {
    g.font = "800 " + (size || 13) + "px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.fillStyle = col || "#fff";
    g.strokeText(txt, x, y); g.fillText(txt, x, y);
  }
  function pixArc(g, x, y, r, a0, a1, size, col) {
    g.fillStyle = col;
    var n = Math.max(6, Math.round(Math.abs(a1 - a0) * r / (size * 0.9)));
    for (var i = 0; i < n + 1; i++) { var a = a0 + (a1 - a0) * i / n; g.fillRect(snap(x + Math.cos(a) * r) - size / 2, snap(y + Math.sin(a) * r) - size / 2, size, size); }
  }
  function heroFrame(anim, moving) { return moving ? Math.floor(anim / 2.2) % 2 : Math.floor(tPlay * 1.6) % 2; }
  function drawHeroAt(g, spec, x, y, flipRef, face, moving, anim, o) {
    o = o || {};
    var fr = heroFrame(anim, moving), bob = moving && Math.floor(anim / 1.1) % 2 ? -PXU : 0;
    if (!o.noShadow) shadow(g, x, y + 12, 42);
    var flip;
    if (o.flip != null) flip = o.flip; else { var c = Math.cos(face); if (c < -0.15) flipRef.flip = true; else if (c > 0.15) flipRef.flip = false; flip = !!flipRef.flip; }
    drawSpr(g, ART.hero(spec, fr), x, y + 14 + bob, flip, { flash: o.flash, glow: o.glow });
  }
  function drawGroup(g, gr) {
    var n = gr.mobs.length, offs = n === 1 ? [[0, 0]] : n === 2 ? [[-16, 8], [16, -4]] : [[-20, 10], [2, -8], [22, 8]], hover = mouse.hoverGroup === gr;
    gr.mobs.forEach(function (m, i) {
      var fr = Math.floor(tPlay * 1.5 + gr.ph + i) % 2, spr = ART.mob(m.type, fr), ox = offs[i][0], oy = offs[i][1], y = gr.y + oy + 12;
      var bob = m.type === "corbeau" ? -22 + Math.sin(tPlay * 3 + i) * 3 : 0;
      shadow(g, gr.x + ox, y + 4, 40);
      drawSpr(g, spr, gr.x + ox, y + bob, ox > 0, { glow: hover ? "#ffffff" : null });
    });
    var lv = gr.mobs.reduce(function (a, m) { return a + m.lvl; }, 0), top = gr.y - 46;
    label(g, (gr.boss ? "★ " : "") + "Niv. " + lv, gr.x, top, gr.boss ? "#ffd257" : "#ffb09a", 13);
    if (hover) gr.mobs.forEach(function (m, i) { label(g, MOBS[m.type].name + " niv. " + m.lvl, gr.x, top - 16 - i * 15, "#fff", 12); });
  }
  function drawNpc(g, n) {
    var near = dist(n.x, n.y, P.x, P.y) < 90, fr = Math.floor(tPlay * 1.4) % 2;
    n.flip = P.x < n.x;
    shadow(g, n.x, n.y + 12, 42);
    drawSpr(g, ART.squirrel(n.kind === "elder" ? "elder" : "glandine", fr), n.x, n.y + 14, n.flip);
    if (n.kind === "shop") drawSpr(g, ART.stall(), n.x, n.y + 38, false);
    label(g, n.name, n.x, n.y - 62);
    var q = QUESTS[profile.quest];
    if (n.kind === "elder" && q) { var by = n.y - 80 + Math.sin(tPlay * 4) * 3; g.fillStyle = "#ffd257"; g.font = "900 24px Nunito, sans-serif"; g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.strokeText("!", n.x, by); g.fillText("!", n.x, by); }
    if (near) label(g, "F · parler", n.x, n.y + 62, "#fff", 12);
  }
  function drawChest(g, c) {
    var open = profile.chests[world.zi + ":" + c.i], x = c.x * T + T / 2, y = c.y * T + T / 2;
    shadow(g, x, y + 14, 48); drawSpr(g, ART.chest(!!open), x, y + 18, false);
    if (!open && dist(x, y, P.x, P.y) < 80) label(g, "F · ouvrir", x, y + 40, "#fff", 12);
  }
  function drawPortal(g, tx, ty, col) {
    if (!col) return;
    var x = tx * T, y = ty * T, p = Math.sin(tPlay * 3) * 3, i;
    g.fillStyle = col; g.globalAlpha = 0.22; g.fillRect(snap(x - 24), snap(y - 54), 48, 108); g.fillRect(snap(x - 33), snap(y - 39), 66, 78); g.globalAlpha = 1;
    for (i = 0; i < 28; i++) { var a = i / 28 * TAU; g.fillStyle = i % 4 === 0 ? "#ffffff" : col; g.fillRect(snap(x + Math.cos(a) * (24 + p)) - 3, snap(y + Math.sin(a) * (54 + p)) - 3, 6, 6); }
  }
  function drawMate(g) {
    drawHeroAt(g, R.lk || { fur: "roux" }, R.x, R.y, R, R.face || 0, !!R.m, R.anim || 0);
    label(g, (R.name || "Ami") + " · " + (R.lvl || 1), R.x, R.y - 64, "#9ad7ff");
  }

  // caméra : exploration (suit le joueur) ou combat (centrée sur l'arène, entre la frise des tours et la barre du bas)
  function setCamera(g) {
    var z, cx, cy;
    if (mode === "fight" && F) {
      z = V.c / T;
      var aw = F.w * T, ah = F.h * T, topUI = 70, botUI = uiReserve() - 70, free = H - topUI - botUI;
      cx = F.ax * T + aw / 2; cy = F.ay * T + ah / 2 - ((topUI + free / 2) - H / 2) / z;
    } else {
      z = cam.z; cx = clamp(cam.x, W / 2 / z, world.w * T - W / 2 / z); cy = clamp(cam.y, H / 2 / z, world.h * T - H / 2 / z);
      if (world.w * T < W / z) cx = world.w * T / 2;
      if (world.h * T < H / z) cy = world.h * T / 2;
    }
    cx = snap(cx); cy = snap(cy);
    var sx = cam.shake ? Math.round(rnd(-cam.shake, cam.shake)) : 0, sy = cam.shake ? Math.round(rnd(-cam.shake, cam.shake)) : 0;
    cam.used = { z: z, cx: cx, cy: cy };
    g.setTransform(z * dpr, 0, 0, z * dpr, Math.round((W / 2 - cx * z) * dpr) + sx, Math.round((H / 2 - cy * z) * dpr) + sy);
  }
  function screenToWorld(mx, my) { var c = cam.used || { z: 1, cx: 0, cy: 0 }; return { x: (mx - W / 2) / c.z + c.cx, y: (my - H / 2) / c.z + c.cy }; }

  function render() {
    var g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = "#1f3a2b"; g.fillRect(0, 0, canvas.width, canvas.height);
    if (!world || !profile) return;
    setCamera(g);
    g.drawImage(world.pre, 0, 0, world.w * T, world.h * T);
    var cu = cam.used, x0 = Math.max(0, Math.floor((cu.cx - W / 2 / cu.z) / T)), x1 = Math.min(world.w - 1, Math.ceil((cu.cx + W / 2 / cu.z) / T));
    var y0 = Math.max(0, Math.floor((cu.cy - H / 2 / cu.z) / T)), y1 = Math.min(world.h - 1, Math.ceil((cu.cy + H / 2 / cu.z) / T));
    g.fillStyle = "rgba(255,255,255,.38)";
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (world.t[ty][tx] === 2) {
      var ph = tPlay * 1.2 + hash2(tx, ty) * 6, ox = Math.round(Math.sin(ph) * 2) * PXU;
      g.fillRect(tx * T + 9 + ox, ty * T + 15, 9, 3); g.fillRect(tx * T + 27 - ox, ty * T + 33, 6, 3);
    }
    if (mode === "fight" && F) renderFight(g); else renderExplore(g);
    parts.forEach(function (p) { var k = 1 - p.t / p.life; g.globalAlpha = Math.max(0, k); g.fillStyle = p.col; var ps = p.s > 4 ? 6 : 3; g.fillRect(snap(p.x), snap(p.y), ps, ps); g.globalAlpha = 1; });
    texts.forEach(function (t) { g.globalAlpha = Math.max(0, 1 - t.t / 1.0); g.font = "900 " + (t.big ? 20 : 15) + "px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#2a1810"; g.fillStyle = t.col; g.strokeText(t.s, t.x, t.y); g.fillText(t.s, t.x, t.y); g.globalAlpha = 1; });
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function renderExplore(g) {
    drawPortal(g, world.exit.x + 1.2, world.exit.y + 0.5, world.zi < ZONES.length - 1 ? "#ffd257" : null);
    if (world.zi > 0) drawPortal(g, world.entry.x - 1.2, world.entry.y + 0.5, "#9ad7ff");
    if (P.path.length) { var last = P.path[P.path.length - 1]; g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(Math.floor(last.x / T) * T + 9, Math.floor(last.y / T) * T + 9, T - 18, T - 18); }
    var ents = [];
    world.chests.forEach(function (c) { ents.push({ y: c.y * T + T / 2, f: function () { drawChest(g, c); } }); });
    npcs.forEach(function (n) { ents.push({ y: n.y, f: function () { drawNpc(g, n); } }); });
    groups.forEach(function (gr) { ents.push({ y: gr.y, f: function () { drawGroup(g, gr); } }); });
    ents.push({ y: P.y, f: function () { drawHeroAt(g, lookSpec(profile), P.x, P.y, P, P.face, P.moving, P.anim); label(g, profile.name, P.x, P.y - 64, "#fff3a0", 12); } });
    if (R && R.x != null) ents.push({ y: R.y, f: function () { drawMate(g); } });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.f(); });
  }

  function cellRect(g, cx, cy, fill, border) {
    var x = (F.ax + cx) * T, y = (F.ay + cy) * T;
    g.fillStyle = fill; g.fillRect(x, y, T, T);
    if (border) { g.fillStyle = border; g.fillRect(x, y, T, 3); g.fillRect(x, y + T - 3, T, 3); g.fillRect(x, y, 3, T); g.fillRect(x + T - 3, y, 3, T); }
  }
  function renderFight(g) {
    var me = myUnit(), cur = TACT.current(F), myTurn = !!(me && cur && cur.id === me.id), i, j, hv = V.hover;
    g.fillStyle = "rgba(0,0,0,.16)";                              // quadrillage discret
    for (i = 0; i <= F.w; i++) g.fillRect((F.ax + i) * T - 1, F.ay * T, 3, F.h * T);
    for (j = 0; j <= F.h; j++) g.fillRect(F.ax * T, (F.ay + j) * T - 1, F.w * T, 3);
    g.fillStyle = "rgba(10,18,10,.5)";                            // hors arène : voilé
    g.fillRect(0, 0, world.w * T, F.ay * T); g.fillRect(0, (F.ay + F.h) * T, world.w * T, (world.h - F.ay - F.h) * T);
    g.fillRect(0, F.ay * T, F.ax * T, F.h * T); g.fillRect((F.ax + F.w) * T, F.ay * T, (world.w - F.ax - F.w) * T, F.h * T);
    if (F.phase === "placement") F.zone.forEach(function (z) { cellRect(g, z.x, z.y, "rgba(125,240,160,.30)", "rgba(125,240,160,.9)"); });
    if (F.phase === "fight" && myTurn && !animBusy()) {
      if (V.sel) {
        var cells = TACT.castCells(F, me, V.sel), sp = TACT.spell(V.sel);
        cells.forEach(function (c) { cellRect(g, c.x, c.y, "rgba(181,124,255,.32)", "rgba(181,124,255,.85)"); });
        if (hv && cells.some(function (c) { return c.x === hv.x && c.y === hv.y; })) TACT.area(F, me, sp, hv.x, hv.y).forEach(function (c) { cellRect(g, c.x, c.y, "rgba(255,210,87,.38)", "rgba(255,210,87,.95)"); });
      } else {
        var key = me.x + "," + me.y + "," + me.pm; if (V.reachKey !== key) { V.reachKey = key; V.reach = TACT.reach(F, me); }
        for (var k in V.reach) { var a = k.split(","); if (V.reach[k].c > 0) cellRect(g, +a[0], +a[1], "rgba(90,168,255,.26)", "rgba(90,168,255,.7)"); }
        if (hv && V.reach[hv.x + "," + hv.y] && V.reach[hv.x + "," + hv.y].c > 0) TACT.pathTo(V.reach, hv.x, hv.y).forEach(function (c, n) { if (n > 0) cellRect(g, c.x, c.y, "rgba(90,168,255,.5)", null); });
      }
    }
    if (hv) cellRect(g, hv.x, hv.y, "rgba(255,255,255,.10)", "rgba(255,255,255,.7)");
    if (cur && V.u[cur.id]) cellRect(g, Math.round(V.u[cur.id].cx), Math.round(V.u[cur.id].cy), "rgba(255,210,87,.10)", Math.floor(tPlay * 3) % 2 ? "rgba(255,210,87,.95)" : "rgba(255,210,87,.5)");
    V.cellfx.forEach(function (e) {
      if (e.t < 0) return; g.globalAlpha = Math.max(0, 1 - e.t / 0.5) * 0.75; g.fillStyle = e.col;
      var x = (F.ax + e.x) * T, y = (F.ay + e.y) * T; for (var yy = 0; yy < 16; yy++) for (var xx = 0; xx < 16; xx++) if (((xx + yy) & 1) === 0) g.fillRect(x + xx * 3, y + yy * 3, 3, 3);
      g.globalAlpha = 1;
    });
    var us = F.units.filter(function (u) { return u.alive || V.dying[u.id] > 0; }).sort(function (a, b) { return V.u[a.id].cy - V.u[b.id].cy; });
    us.forEach(function (u) { drawFightUnit(g, u, cur); });
    V.proj.forEach(function (p) {
      var k = Math.min(1, p.t / p.dur), x = (F.ax + p.x0 + (p.x1 - p.x0) * k) * T + T / 2, y = (F.ay + p.y0 + (p.y1 - p.y0) * k) * T + T / 2 - 14;
      if (p.slash) { pixArc(g, (F.ax + p.x1) * T + T / 2, (F.ay + p.y1) * T + T / 2 - 10, 14, -1, 1 + k * 3, 6, p.col); return; }
      g.fillStyle = p.col; g.fillRect(snap(x) - 6, snap(y) - 6, 12, 12); g.fillStyle = "#ffffff"; g.fillRect(snap(x) - 3, snap(y) - 3, 6, 6);
      for (var t = 1; t <= 3; t++) { var kk = Math.max(0, k - t * 0.06); g.globalAlpha = 0.5 / t; g.fillStyle = p.col; g.fillRect(snap((F.ax + p.x0 + (p.x1 - p.x0) * kk) * T + T / 2) - 3, snap((F.ay + p.y0 + (p.y1 - p.y0) * kk) * T + T / 2 - 14) - 3, 6, 6); g.globalAlpha = 1; }
    });
    // aperçu des dégâts et soins au survol d'une case visée
    if (V.sel && hv && me) {
      var sp2 = TACT.spell(V.sel);
      if (TACT.castCells(F, me, V.sel).some(function (c) { return c.x === hv.x && c.y === hv.y; })) {
        var seen = {};
        TACT.area(F, me, sp2, hv.x, hv.y).forEach(function (c) {
          var t = TACT.unitAt(F, c.x, c.y); if (!t || seen[t.id]) return; seen[t.id] = 1;
          sp2.eff.forEach(function (eff, n) {
            if ((eff.t === "dmg" && t.side !== me.side) || (eff.t === "heal" && t.side === me.side)) {
              var pr = TACT.preview(me, sp2, eff), rs = eff.t === "dmg" ? (1 - Math.min(50, t.res[sp2.el] || 0) / 100) : 1;
              label(g, (eff.t === "heal" ? "+" : "-") + Math.max(1, Math.round(pr[0] * rs)) + " à " + Math.max(1, Math.round(pr[1] * rs)), (F.ax + c.x) * T + T / 2, (F.ay + c.y) * T - 40 - n * 16, eff.t === "heal" ? "#7df0a0" : (DATA.ELEMENTS[sp2.el] || {}).col, 13);
            }
          });
        });
      }
    }
    V.floats.forEach(function (f) {
      g.globalAlpha = Math.max(0, 1 - f.t / 1.2); var x = (F.ax + f.cx) * T + T / 2, y = (F.ay + f.cy) * T - 8 - f.t * 40 - f.dy, s = f.s + (f.big && /^\d+$/.test(f.s) ? "!" : "");
      g.font = "900 " + (f.big ? 24 : 17) + "px Nunito, sans-serif"; g.textAlign = "center"; g.lineWidth = 5; g.strokeStyle = "#2a1810"; g.fillStyle = f.col; g.strokeText(s, x, y); g.fillText(s, x, y); g.globalAlpha = 1;
    });
  }
  function drawFightUnit(g, u, cur) {
    var vu = V.u[u.id], x = (F.ax + vu.cx) * T + T / 2, y = (F.ay + vu.cy) * T + T / 2 + 6, dying = V.dying[u.id], me = myUnit(), isMe = me && me.id === u.id, a;
    if (dying > 0) g.globalAlpha = Math.max(0, dying / 0.7);
    shadow(g, x, y + 8, 38);
    g.fillStyle = u.side === 0 ? "rgba(90,168,255,.8)" : "rgba(232,88,74,.8)";          // anneau d'équipe en damier
    for (a = 0; a < 16; a += 2) { var ang = a / 16 * TAU; g.fillRect(snap(x + Math.cos(ang) * 20) - 1, snap(y + 8 + Math.sin(ang) * 9) - 1, 3, 3); }
    var flash = vu.flash > 0 ? "#ffffff" : null, glow = cur && cur.id === u.id ? "#ffd257" : null;
    if (u.kind === "hero") drawHeroAt(g, u.look, x, y - 6, vu, 0, vu.path.length > 0, tPlay * 11, { flip: vu.fl, flash: flash, noShadow: true, glow: glow });
    else {
      var fr = u.type === "corbeau" || u.type === "roi" ? Math.floor(tPlay * 2.4 + u.id.length) % 2 : (vu.path.length ? Math.floor(tPlay * 8) % 2 : Math.floor(tPlay * 1.4) % 2);
      drawSpr(g, ART.mob(u.type, fr), x, y + (u.type === "corbeau" ? -14 + Math.sin(tPlay * 3) * 2 : u.type === "roi" ? -6 : 8), !vu.fl, { flash: flash, glow: glow });
    }
    g.globalAlpha = 1;
    if (dying > 0) return;
    var bw = 36, bx = snap(x - bw / 2), by = y - (u.kind === "hero" ? 66 : u.type === "roi" ? 78 : 50);
    g.fillStyle = "#2a1810"; g.fillRect(bx - 3, by - 3, bw + 6, 12);
    g.fillStyle = "#3a1a14"; g.fillRect(bx, by, bw, 6);
    g.fillStyle = u.side === 0 ? "#7df0a0" : "#e8584a"; g.fillRect(bx, by, snap(bw * Math.max(0, vu.hpv / u.max)), 6);
    if (u.shield > 0) { g.fillStyle = "#9ad7ff"; g.fillRect(bx, by - 6, snap(Math.min(bw, bw * u.shield / u.max)), 3); }
    label(g, String(Math.ceil(u.hp)), x, by - 8, "#fff", 11);
    if (u.kind === "hero" && F.units.filter(function (h) { return h.kind === "hero"; }).length > 1) label(g, u.name, x, by - 22, isMe ? "#fff3a0" : "#9ad7ff", 11);
  }

  /* ====================== PONT AVEC L'INTERFACE ====================== */
  var RC = window.RC = { D: DATA, ART: ART, T: TACT, version: VERSION, ui: null };
  function ui(name, a, b) { var u = RC.ui; if (u && u[name]) { try { return u[name](a, b); } catch (e) { if (window.console) console.error(e); } } }

  function startGame(zi) {
    P = makePlayer(); mode = "explore"; tPlay = 0; shopData.stock = []; F = null; V = null;
    dirtyStats();
    if (NET.role === "guest") NET.savedZone = profile.zone;
    if (!(profile.hp >= 1)) profile.hp = maxHp();
    profile.hp = Math.min(profile.hp, maxHp());
    enterZone(zi != null ? zi : (profile.zone || 0));
    ui("gameStarted");
    if (profile.lvl === 1 && profile.kills === 0) ui("banner", "Bienvenue à Ronceclair", "Clique pour te déplacer · clique sur un groupe de monstres pour combattre");
  }
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
  RC.setBlock = function (b) { uiBlock = !!b; if (b) { keys = {}; } };
  RC.setMode = function (m) { if (m === "title") mode = "title"; else uiBlock = (m === "dialog"); if (uiBlock) keys = {}; };
  RC.stats = stats; RC.maxHp = maxHp; RC.lookSpec = lookSpec; RC.save = saveProfile;
  RC.usePotion = usePotion; RC.interact = interact;
  RC.equip = equipItem; RC.unequip = unequipItem; RC.sell = sellItem; RC.spend = spendPoint; RC.BAG_MAX = BAG_MAX;
  RC.shop = { stock: shopStock, buyItem: buyItem, buyPotion: buyPotion };
  RC.quests = function () { return { list: QUESTS, cur: profile.quest, n: profile.qn, bossDead: profile.bossDead, mobs: MOBS }; };
  RC.zoneName = function () { return world ? world.Z.name : ""; };
  RC.mate = function () { return R; };
  Object.defineProperty(RC, "net", { get: function () { return NET; } });
  RC.coop = function () { return NET.on && NET.started; };
  RC.host = function () { var c = newCode(); return netOpen(c, "host") ? c : null; };
  RC.join = function (code) { return netOpen(code, "guest"); };
  RC.leave = function () { if (NET.role === "guest" && profile) quitToMenu(); else netClose(); };
  RC.inviteLink = inviteLink;
  RC.quitToTitle = function () { saveProfile(); if (NET.on) { var sz = NET.savedZone; NET.savedZone = null; netClose(); if (sz != null) profile.zone = sz; saveProfile(); } F = null; V = null; mode = "title"; uiBlock = false; ui("title", ""); };
  RC.sfx = SFX;
  RC.inFight = function () { return mode === "fight" && !!F; };
  RC.selectSpell = selectSpell; RC.endTurn = endTurn; RC.readyUp = readyUp; RC.usePotionFight = usePotionFight; RC.closeFight = closeFight;
  RC.fightInfo = function () {
    if (!F) return null;
    var cur = TACT.current(F), me = myUnit(), myTurn = !!(cur && me && cur.id === me.id);
    return {
      phase: F.phase, round: F.round, myTurn: myTurn, curId: cur && cur.id, busy: !!(V && animBusy()),
      order: F.order.map(function (id) { return TACT.unit(F, id); }).filter(function (u) { return u && u.alive; }).map(function (u) { return { id: u.id, name: u.name, hp: u.hp, max: u.max, side: u.side, kind: u.kind, type: u.type, lvl: u.lvl, look: u.look, cur: !!(cur && cur.id === u.id) }; }),
      units: F.units.filter(function (u) { return u.alive; }).map(function (u) { return { id: u.id, name: u.name, hp: u.hp, max: u.max, side: u.side, kind: u.kind, type: u.type, look: u.look }; }),
      me: me && { id: me.id, alive: me.alive, potions: me.potions, potOk: myTurn && me.potions > 0 && me.pa >= 3 && !me.potUsed && me.hp < me.max, pa: me.pa, pm: me.pm, bpa: me.bpa, bpm: me.bpm, hp: me.hp, max: me.max, shield: me.shield, el: me.el, res: me.res,
        spells: me.spells.map(function (sid) {
          var sp = TACT.spell(sid), err = myTurn ? TACT.canCast(F, me, sid) : "tour", r = TACT.rangeOf(me, sp);
          return { sid: sid, name: sp.name, el: sp.el, pa: sp.pa, min: r.min, max: r.max, line: !!sp.line, los: !!sp.los, area: sp.area || null, icon: sp.icon, text: sp.text, cd: Math.max(0, (me.cd[sid] || 0) - (myTurn ? 0 : 0)), cdMax: sp.cd || 0,
            uses: sp.perTurn ? Math.max(0, sp.perTurn - (me.cast[sid] || 0)) : null, ok: !err, err: err,
            eff: sp.eff.map(function (e) { return (e.t === "dmg" || e.t === "heal") ? { t: e.t, r: TACT.preview(me, sp, e) } : { t: e.t, n: e.n, a: e.a, b: e.b }; }) };
        }), sel: V && V.sel, ready: !!F.ready[me.id] },
      ready: F.ready, result: F.result
    };
  };
  RC.arena = function () { return F ? { w: F.w, h: F.h } : null; };
  // accès console pour tester : RC_DEBUG.start("lanceur"), .level(8), .gold(500), .item(3), .fight(["limace","renard"]), .zone(2)
  window.RC_DEBUG = {
    start: function (cls, name, fur) { var p = RC.createProfile(cls, name || "Test", fur || "roux"); RC.start(p); },
    level: function (n) { while (profile.lvl < n) { profile.lvl++; profile.pts += DATA.PTS_PER_LEVEL; } dirtyStats(); profile.hp = maxHp(); ui("hud"); },
    gold: function (n) { profile.gold += n; ui("hud"); },
    zone: function (z) { profile.quest = Math.max(profile.quest, 1); enterZone(z); ui("hud"); },
    item: function (rar, slot) { var it = DATA.genItem(slot || DATA.SLOT_ORDER[Math.floor(Math.random() * 4)], profile.lvl, rar == null ? 2 : rar, Math.random, DATA.ELEMENTS[DATA.CLASSES[profile.cls].el[0]].stat); profile.bag.push(it); ui("hud"); return it; },
    fight: function (types, lvl) { var g = { id: groupSeq++, tx: Math.floor(P.x / T) + 4, ty: Math.floor(P.y / T), mobs: (types || ["limace", "limace"]).map(function (t) { return { type: t, lvl: lvl || world.Z.lvl }; }) }; placeGroup(g); groups.push(g); startFight(g); },
    tpNpc: function (kind) { for (var i = 0; i < npcs.length; i++) if (npcs[i].kind === kind) { P.x = npcs[i].x - 34; P.y = npcs[i].y; P.path = []; return true; } return false; },
    state: function () { return { profile: profile, mode: mode, groups: groups.length, player: P && { x: P.x, y: P.y }, fight: F && { phase: F.phase, round: F.round, units: F.units.map(function (u) { return { id: u.id, side: u.side, x: u.x, y: u.y, hp: u.hp, pa: u.pa, pm: u.pm, alive: u.alive }; }) } }; },
    cellXY: function (cx, cy) { var c = cam.used, r = canvas.getBoundingClientRect(); return { x: r.left + (((F.ax + cx + 0.5) * T) - c.cx) * c.z + W / 2, y: r.top + (((F.ay + cy + 0.5) * T) - c.cy) * c.z + H / 2 }; },
    groupXY: function () { var g = groups[0], c = cam.used, r = canvas.getBoundingClientRect(); return g ? { x: r.left + (g.x - c.cx) * c.z + W / 2, y: r.top + (g.y - c.cy) * c.z + H / 2, n: groups.length } : null; },
    fightRaw: function () { return F; }, tact: TACT
  };

  /* ====================== ENTRÉES ====================== */
  var KEYMAP = { ArrowUp: "up", KeyW: "up", KeyZ: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", KeyQ: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", function (e) {
    if (!profile || !stage.isConnected || mode === "title") return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.code === "Escape" && uiBlock) { ui("closeAll"); return; }
    if (uiBlock) return;
    var k = KEYMAP[e.code];
    if (mode === "explore") {
      if (k) { keys[k] = true; e.preventDefault(); return; }
      if (e.code === "KeyF" || e.code === "Enter") interact();
      else if (e.code === "KeyR" || e.code === "KeyH") usePotion();
      else if (e.code === "KeyI") ui("panel", "inventaire"); else if (e.code === "KeyC") ui("panel", "stats"); else if (e.code === "KeyK") ui("panel", "sorts"); else if (e.code === "KeyJ") ui("panel", "quetes"); else if (e.code === "Escape") ui("panel", "menu");
    } else if (mode === "fight" && F) {
      var m = /^(Digit|Numpad)(\d)$/.exec(e.code);
      if (m) { var me = myUnit(); if (me) { var idx = (+m[2] || 10) - 1; if (me.spells[idx]) selectSpell(me.spells[idx]); } }
      else if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (F.phase === "placement") readyUp(); else endTurn(); }
      else if (e.code === "KeyR" || e.code === "KeyP") usePotionFight();
      else if (e.code === "Escape") { if (V.sel) V.sel = null; else ui("panel", "menu"); }
      else if (e.code === "KeyI") ui("panel", "inventaire"); else if (e.code === "KeyC") ui("panel", "stats"); else if (e.code === "KeyK") ui("panel", "sorts"); else if (e.code === "KeyJ") ui("panel", "quetes");
    }
  });
  window.addEventListener("keyup", function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener("blur", function () { keys = {}; });
  function mouseWorld(e) {
    var r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; mouse.x = mx; mouse.y = my; mouse.has = true;
    var w = screenToWorld(mx, my); return { wx: w.x, wy: w.y };
  }
  canvas.addEventListener("pointermove", function (e) {
    if (!profile || mode === "title") return;
    var m = mouseWorld(e);
    if (mode === "fight" && F) {
      var cx = Math.floor(m.wx / T) - F.ax, cy = Math.floor(m.wy / T) - F.ay;
      V.hover = (cx >= 0 && cy >= 0 && cx < F.w && cy < F.h) ? { x: cx, y: cy } : null;
    } else if (mode === "explore") {
      mouse.hoverGroup = null; for (var i = 0; i < groups.length; i++) if (dist(m.wx, m.wy, groups[i].x, groups[i].y) < 42) mouse.hoverGroup = groups[i];
      canvas.style.cursor = mouse.hoverGroup ? "pointer" : "default";
    }
  });
  canvas.addEventListener("pointerdown", function (e) {
    if (!profile || mode === "title" || uiBlock) return;
    audio();
    var m = mouseWorld(e), touch = e.pointerType === "touch";
    if (mode === "fight" && F) {
      var cx = Math.floor(m.wx / T) - F.ax, cy = Math.floor(m.wy / T) - F.ay;
      if (e.button === 2) { V.sel = null; V.pending = null; return; }
      if (cx >= 0 && cy >= 0 && cx < F.w && cy < F.h) { V.hover = { x: cx, y: cy }; fightClick(cx, cy, touch); }
      return;
    }
    if (mode !== "explore" || e.button === 2) return;
    var i, gr = null, n = null, c = null;                         // cibles : groupe de monstres, PNJ, coffre, sinon le sol
    for (i = 0; i < groups.length; i++) if (dist(m.wx, m.wy, groups[i].x, groups[i].y) < 44) gr = groups[i];
    for (i = 0; i < npcs.length; i++) if (dist(m.wx, m.wy, npcs[i].x, npcs[i].y) < 44) n = npcs[i];
    for (i = 0; i < world.chests.length; i++) { var ch = world.chests[i]; if (!profile.chests[world.zi + ":" + ch.i] && dist(m.wx, m.wy, ch.x * T + T / 2, ch.y * T + T / 2) < 40) c = ch; }
    if (gr) { if (dist(P.x, P.y, gr.x, gr.y) < 110) engage(gr); else walkTo(gr.x - Math.sign(gr.x - P.x) * T, gr.y, { kind: "group", ref: gr }); }
    else if (n) { if (dist(P.x, P.y, n.x, n.y) < 90) openNpc(n); else walkTo(n.x - 40, n.y + 10, { kind: "npc", ref: n }); }
    else if (c) { var cx2 = c.x * T + T / 2, cy2 = c.y * T + T / 2; if (dist(P.x, P.y, cx2, cy2) < 80) openChest(c); else walkTo(cx2, cy2 + T, { kind: "chest", ref: c }); }
    else walkTo(m.wx, m.wy, null);
  });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  /* ====================== EN LIGNE (coop à 2) ====================== */
  // Modèle : l'hôte fait tourner le monde (groupes de monstres) et le combat (règles + IA) ; l'invité envoie ses commandes.
  //   hello / welcome / full / bye : entrée dans le salon     p : position d'un joueur sur la carte (12 / s)
  //   pk : fiche du héros de l'invité (invité → hôte)         s : groupes de monstres de la zone (hôte → invité)
  //   engage : l'invité demande un combat                      fs : état du combat + événements (hôte → invité)
  //   fc : commande de l'invité (déplacer, lancer un sort…)    fend : fin du combat    zone : changement de zone
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NET = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, guestId: null, started: false,
    err: "", pAcc: 0, gAcc: 0, lastRx: 0, savedZone: null, ts: 0, helloTimer: null, joinTimer: null };
  var R = null, guestPack = null;
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
  function sendPack() { if (NET.role === "guest" && NET.started) { netSend("pk", { p: profile }); packDirty = false; } }

  function netOpen(code, role) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; return false; }
    netClose();
    NET.on = true; NET.role = role; NET.code = code; NET.err = ""; NET.started = role === "host"; NET.guestId = null; NET.ts = Date.now(); NET.lastRx = Date.now(); R = null; guestPack = null;
    var ch = cl.channel("rc-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["hello", "welcome", "full", "p", "pk", "s", "engage", "fs", "fc", "fend", "zone", "bye"].forEach(function (ev) {
      ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { if (window.console) console.error(err); } });
    });
    if (window.Party && window.Party.emoteChannel) { try { window.Party.emoteChannel(ch, myName); } catch (e) {} }
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
    NET.ch = null; NET.on = false; NET.role = null; NET.started = false; NET.guestId = null; NET.code = null; R = null; guestPack = null;
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
      if (F && F.phase !== "end" && guestInFight()) { TACT.removeUnit(F, "h1"); afterCmd(); }
      R = null; NET.guestId = null; guestPack = null;
      ui("banner", nm + " a quitté la partie", msg || "Tu continues seul, le salon reste ouvert"); ui("hud");
    } else quitToMenu(msg || "L'hôte a quitté la partie. Ta progression est sauvegardée.");
  }
  function quitToMenu(msg) {
    var sz = NET.savedZone; NET.savedZone = null;
    netClose();
    if (profile) { if (sz != null) profile.zone = sz; saveProfile(); }
    F = null; V = null; mode = "title"; uiBlock = false; ui("title", msg || "");
  }
  function sendGroups() {
    if (NET.role !== "host" || !R || !world) return;
    netSend("s", { z: world.zi, g: groups.map(function (g) { return [g.id, g.tx, g.ty, g.mobs.map(function (m) { return m.type + ":" + m.lvl; }), g.boss ? 1 : 0]; }) });
  }
  function sendFight(full, ev) { netSend("fs", { f: TACT.snap(F), ev: ev || [], ax: F.ax, ay: F.ay, gid: F.gid, c: F.c, full: !!full }); }

  function onNet(ev, d) {
    if (!d) return;
    if (ev === "hello" && NET.role === "host") {
      if (d.v !== VERSION) { netSend("full", { to: d.id, why: "Versions différentes (" + d.v + " / " + VERSION + ") : rechargez la page tous les deux." }); return; }
      if (NET.guestId && NET.guestId !== d.id) { netSend("full", { to: d.id, why: "Salon plein (2 joueurs max)." }); return; }
      if (!R || R.id !== d.id) {
        NET.guestId = d.id; R = { id: d.id, name: d.name, cls: d.cls, lvl: d.lvl, x: null }; NET.lastRx = Date.now();
        ui("banner", (d.name || "Un ami") + " a rejoint la partie", "Coop à 2 : vous combattez ensemble"); SFX.quest(); ui("hud");
      }
      netSend("welcome", { to: d.id, id: NET.id, zi: world.zi, name: myName(), cls: profile.cls, lvl: profile.lvl, v: VERSION });
      sendGroups();
    } else if (ev === "welcome" && NET.role === "guest") {
      if (d.to !== NET.id || NET.started) return;
      if (NET.helloTimer) { clearInterval(NET.helloTimer); NET.helloTimer = null; }
      if (NET.joinTimer) { clearTimeout(NET.joinTimer); NET.joinTimer = null; }
      R = { id: d.id, name: d.name, cls: d.cls, lvl: d.lvl, x: null }; NET.started = true; NET.lastRx = Date.now();
      startGame(d.zi); sendPack();
    } else if (ev === "full") {
      if (d.to === NET.id && NET.role === "guest" && !NET.started) { netClose(); NET.err = d.why || "Salon plein."; ui("netFail", NET.err); }
    } else if (ev === "p") {
      if (!R || d.id !== R.id) return;
      R.tx = d.x; R.ty = d.y; if (R.x == null) { R.x = d.x; R.y = d.y; }
      R.face = d.f; R.m = !!d.m; R.lvl = d.l; R.name = d.n; NET.lastRx = Date.now();
      if (d.lk) { var lk = d.lk.split("|"); R.lk = { fur: lk[0], tete: lk[1] || null, dos: lk[2] || null, main: lk[3] || null }; }
    } else if (ev === "pk") {
      if (NET.role === "host" && R) guestPack = DATA.fixProfile(d.p);
    } else if (ev === "s") {
      if (NET.role !== "guest" || !world || d.z !== world.zi || mode === "fight") return;
      groups = d.g.map(function (a) { var g = { id: a[0], tx: a[1], ty: a[2], boss: !!a[4], mobs: a[3].map(function (s) { var q = s.split(":"); return { type: q[0], lvl: +q[1] }; }) }; placeGroup(g); return g; });
    } else if (ev === "engage") {
      if (NET.role === "host" && mode === "explore" && !F) { for (var i = 0; i < groups.length; i++) if (groups[i].id === d.gid) { startFight(groups[i]); break; } }
    } else if (ev === "fs") {
      if (NET.role !== "guest" || !world) return;
      var first = !F;
      F = d.f; F.ev = []; F.ax = d.ax; F.ay = d.ay; F.gid = d.gid; F.c = V ? V.c : cellFor(F.w, F.h);
      if (first || d.full) beginFightView();
      else {
        F.units.forEach(function (u) { if (!V.u[u.id]) V.u[u.id] = { cx: u.x, cy: u.y, path: [], flash: 0, hpv: u.hp, fl: false }; });
        handleEvents(d.ev || []); V.reachKey = "";
        var mu = myUnit(); if (V.sel && mu && TACT.canCast(F, mu, V.sel)) V.sel = null;
        if (F.phase === "end") onFightEnd();
      }
    } else if (ev === "fc") {
      if (NET.role !== "host" || !F || !guestInFight()) return;
      var r = TACT.cmd(F, "h1", d.c); if (!r.err) afterCmd();
    } else if (ev === "zone") {
      if (NET.role === "guest" && NET.started && P && mode === "explore") enterZone(d.zi, d.back ? "back" : undefined);
    } else if (ev === "bye") {
      if (R && d.id === R.id) partnerLeft();
    }
  }
  function netTick(dt) {
    if (!R) return;
    NET.pAcc += dt;
    if (NET.pAcc > 0.085 && mode === "explore") {
      NET.pAcc = 0; var l = lookSpec(profile);
      netSend("p", { id: NET.id, x: Math.round(P.x), y: Math.round(P.y), f: Math.round(P.face * 100) / 100, m: P.moving ? 1 : 0, l: profile.lvl, n: myName(), lk: [l.fur, l.tete || "", l.dos || "", l.main || ""].join("|") });
    }
    NET.gAcc += dt;
    if (NET.gAcc > 2.5 && NET.role === "host" && mode === "explore") { NET.gAcc = 0; sendGroups(); }
    if (NET.role === "guest" && packDirty && mode === "explore") sendPack();
    if (mode === "fight") NET.lastRx = Date.now();
    else if (Date.now() - NET.lastRx > 15000) partnerLeft("Connexion perdue avec ton coéquipier.");
  }

  /* ====================== BOUCLE ====================== */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, stage.clientWidth); H = Math.max(200, stage.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    var want = Math.min(W, H) / (T * 9.5), Sx = Math.max(2, Math.round(want * 3 * dpr));   // pixels écran par pixel d'art : entier, pour des pixels nets
    cam.z = Sx / (3 * dpr);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", function () { setTimeout(resize, 50); });
  window.addEventListener("beforeunload", saveProfile);
  window.addEventListener("beforeunload", function () { if (NET.ch) netSend("bye", { id: NET.id }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveProfile(); });

  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (profile && P && world && mode !== "title") {
      if (mode === "explore") updateExplore(dt); else if (mode === "fight" && F) updateFight(dt);
      render();
    } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
  RC.ready = true;
  if (RC.ui && RC.ui.boot) RC.ui.boot();
})();
