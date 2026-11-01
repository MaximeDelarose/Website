/* =========================================================================
   Écureuil Survivor — survivors-like en pixel art, dessiné en code.
   Déplacement : ZQSD / WASD / flèches, clic maintenu (souris) ou
   joystick tactile (mobile). Les attaques sont automatiques.
   Classement en ligne : jeu « ecureuil-survivor » (voir leaderboard/).
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-game]");
  if (!stage) return;
  var canvas = stage.querySelector(".game-canvas");
  var ctx = canvas.getContext("2d");
  var $ = function (s) { return stage.querySelector(s); };
  var GAME_ID = "ecureuil-survivor";

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }

  /* ---------- sprites (pixel art en texte) ---------- */
  var OUT = "#2b1709";
  function sprite(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (r) { w = Math.max(w, r.length); });
    var W = w + 2, H = h + 2;
    var filled = new Uint8Array(W * H);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * W + x + 1] = 1; }
    }
    g.fillStyle = OUT;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      if ((x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) ||
          (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x])) g.fillRect(x, y, 1, 1);
    }
    function variant(src, flip, white) {
      var v = document.createElement("canvas"); v.width = W; v.height = H;
      var vg = v.getContext("2d");
      if (flip) { vg.translate(W, 0); vg.scale(-1, 1); }
      vg.drawImage(src, 0, 0);
      if (white) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = "#fff"; vg.fillRect(0, 0, W, H); }
      return v;
    }
    return { c: c, f: variant(c, true), wc: variant(c, false, true), wf: variant(c, true, true), w: W, h: H };
  }

  var P_SQ = { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" };
  var SQ_TOP = [
    "....tt..........",
    "..ttttt.........",
    ".tttdtttt..d..d.",
    ".ttd...tt.ooooo.",
    ".ttd....t.ookooo",
    ".ttd......ooooon",
    "..ttd....ooccc..",
    "...ttd..ooocc...",
    "....tddoooocc...",
    ".....doooooc....",
    ".....ddooooo....",
  ];
  var SPR = {
    squirrel: [sprite(SQ_TOP.concat(["......dd..dd...."]), P_SQ), sprite(SQ_TOP.concat([".....dd....dd..."]), P_SQ)],
    slug: [
      sprite([".k...k......", ".h...h......", "..h.h.......", ".gggg.......", "gegggg......", "gggggggggg..", ".ggggggggggg", "..hhhhhhhhh."], { g: "#d9cf63", h: "#a39a3c", k: "#1f3a2b", e: "#1f3a2b" }),
      sprite(["..k...k.....", "..h...h.....", "...h.h......", ".gggg.......", "gegggg......", "ggggggggg...", ".gggggggggg.", "..hhhhhhhh.."], { g: "#d9cf63", h: "#a39a3c", k: "#1f3a2b", e: "#1f3a2b" }),
    ],
    beetle: [
      sprite(["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", ".bBbbbbBb.", "kbbbbbbbbk", ".bbBbbBbb.", "kbbbbbbbbk", "..bbbbbb..", "...b..b..."], { b: "#6a4c93", B: "#a88ad8", k: "#1b1226" }),
      sprite(["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", "kbBbbbbBbk", ".bbbbbbbb.", "kbbBbbBbbk", ".bbbbbbbb.", "..bbbbbb..", "..b....b.."], { b: "#6a4c93", B: "#a88ad8", k: "#1b1226" }),
    ],
    wasp: [
      sprite(["..ww.ww...", "..ww.ww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."], { y: "#f2c230", k: "#2b1709", w: "#e6f6fa", s: "#2b1709" }),
      sprite([".........", ".wwwwww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."], { y: "#f2c230", k: "#2b1709", w: "#e6f6fa", s: "#2b1709" }),
    ],
    crow: [
      sprite(["......kkk...", ".....kkekk..", "kk..kkkkkoo.", "kkkkkgggkk..", ".kkgggggkk..", "..kkkkkkk...", "....o..o...."], { k: "#24243a", g: "#4a4a6a", o: "#e8873a", e: "#fdf3de" }),
      sprite(["kk....kkk...", ".kk..kkekk..", "..kkkkkkkoo.", "...kgggkkk..", "...kgggkk...", "..kkkkkkk...", "....o..o...."], { k: "#24243a", g: "#4a4a6a", o: "#e8873a", e: "#fdf3de" }),
    ],
    toad: [
      sprite(["...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGGGGGGGGGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", ".GyyyyyyyyyyG.", "GG.GG....GG.GG"], { G: "#6f8a34", g: "#9cae4f", y: "#e9d68a", k: "#1f2a14", e: "#f2c230" }),
      sprite(["..............", "...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", "GGyyyyyyyyyyGG", ".GG.GG..GG.GG."], { G: "#6f8a34", g: "#9cae4f", y: "#e9d68a", k: "#1f2a14", e: "#f2c230" }),
    ],
    boar: [
      sprite(["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "..bb.bb....bb.bb....", "..kk.kk....kk.kk...."], { b: "#6b4430", B: "#8f6243", k: "#2b1709", w: "#fdf3de", p: "#c8553d", e: "#f2c230" }),
      sprite(["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "...bb.bb..bb.bb.....", "...kk.kk..kk.kk....."], { b: "#6b4430", B: "#8f6243", k: "#2b1709", w: "#fdf3de", p: "#c8553d", e: "#f2c230" }),
    ],
    nut: sprite([".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."], { c: "#6b4430", n: "#a06a3e", N: "#c98d4a" }),
    gold: sprite([".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."], { c: "#a8741a", n: "#e0a82a", N: "#ffe27a" }),
    berry: sprite(["..g..", ".rgr.", "rRrrr", "rrrrr", ".rrr."], { r: "#c8553d", R: "#f29a85", g: "#5b8a4a" }),
    chest: sprite(["..bbbbbb..", ".bBBBBBBb.", "bBBBBBBBBb", "kkkkyykkkk", "bBBByyBBBb", "bBBBBBBBBb", "bbbbbbbbbb"], { b: "#6b4430", B: "#a06a3e", k: "#3a2618", y: "#f2c230" }),
    acorn: sprite([".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."], { n: "#6b4430", N: "#8a5a3b", c: "#d39a52" }),
    pinecone: sprite(["..p..", ".pPp.", "pPpPp", ".pPp.", "pPpPp", ".pPp."], { p: "#6b4430", P: "#b07a4f" }),
    mushroom: sprite(["..rrrr..", ".rrwrrr.", "rrrrrwrr", "rwrrrrrr", "..ssss..", "..ssss.."], { r: "#c8553d", w: "#fdf3de", s: "#f3e1c0" }),
    leaf: [sprite(["...lL", ".llL.", "lLll.", "Lll..", "L...."], { l: "#9cc56b", L: "#3f6b3a" }), sprite(["L....", "Lll..", "lLll.", ".llL.", "...lL"], { l: "#9cc56b", L: "#3f6b3a" })],
    spore: sprite([".p.", "pPp", ".p."], { p: "#9a7fd1", P: "#e2d6ff" }),
  };

  /* ---------- chiffres pixel 3x5 ---------- */
  var DIG = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111" };
  function drawNum(str, x, y, color) {
    str = String(str);
    var w = str.length * 4 - 1;
    x = Math.round(x - w / 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? color : OUT;
      for (var i = 0; i < str.length; i++) {
        var b = DIG[str[i]]; if (!b) continue;
        for (var j = 0; j < 15; j++) if (b[j] === "1") {
          var px = x + i * 4 + (j % 3), py = y + ((j / 3) | 0);
          if (pass) ctx.fillRect(px, py, 1, 1);
          else ctx.fillRect(px - 1, py - 1, 3, 3);
        }
      }
    }
  }

  /* ---------- son (WebAudio, minuscule) ---------- */
  var muted = store("es-muted") === "1";
  var actx = null, lastBlip = 0;
  function sfx(freq, dur, type, vol, slide) {
    if (muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime((vol || 0.05), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SND = {
    pick: function () { var n = performance.now(); if (n - lastBlip < 45) return; lastBlip = n; sfx(880 + Math.random() * 200, 0.06, "square", 0.025, 1.5); },
    hurt: function () { sfx(200, 0.18, "sawtooth", 0.06, 0.4); },
    boom: function () { sfx(120, 0.25, "triangle", 0.08, 0.3); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { sfx(f, 0.12, "square", 0.04); }, i * 70); }); },
    whip: function () { sfx(500, 0.08, "triangle", 0.03, 0.5); },
    over: function () { [392, 330, 262, 196].forEach(function (f, i) { setTimeout(function () { sfx(f, 0.22, "triangle", 0.06); }, i * 160); }); },
  };

  /* ---------- armes & bonus ---------- */
  var WEAPONS = {
    gland: {
      name: "Glands", img: SPR.acorn,
      desc: ["Lance un gland sur l'ennemi le plus proche.", "+1 gland à chaque tir.", "+50 % de dégâts.", "+1 gland, transperce un ennemi de plus.", "Tire bien plus vite."],
      count: [1, 2, 2, 3, 3], dmg: [10, 10, 15, 15, 18], pierce: [1, 1, 1, 2, 2], cd: [0.95, 0.95, 0.95, 0.85, 0.6],
    },
    queue: {
      name: "Coup de queue", img: SPR.squirrel[0],
      desc: ["Un grand coup de queue devant toi qui repousse tout.", "+40 % de dégâts.", "Frappe des deux côtés.", "Coup plus large.", "Plus fréquent et plus fort."],
      dmg: [14, 20, 20, 24, 30], r: [24, 24, 24, 31, 33], both: [0, 0, 1, 1, 1], cd: [1.5, 1.5, 1.4, 1.3, 1.0],
    },
    champi: {
      name: "Champignons gardiens", img: SPR.mushroom,
      desc: ["2 champignons tournent autour de toi.", "+1 champignon.", "Cercle plus grand, +dégâts.", "+1 champignon.", "+1 champignon, tournent plus vite."],
      n: [2, 3, 3, 4, 5], R: [24, 24, 30, 30, 32], dmg: [7, 7, 10, 10, 12], spd: [2.6, 2.6, 2.8, 2.8, 3.5],
    },
    pomme: {
      name: "Pommes de pin", img: SPR.pinecone,
      desc: ["Lance une pomme de pin qui explose.", "Explosion plus large.", "+1 pomme de pin.", "+50 % de dégâts.", "+1 pomme de pin, plus fréquentes."],
      n: [1, 1, 2, 2, 3], dmg: [22, 22, 22, 33, 34], rad: [18, 24, 24, 24, 26], cd: [2.6, 2.6, 2.6, 2.6, 2.0],
    },
    spores: {
      name: "Nuage de spores", img: SPR.spore,
      desc: ["Un nuage autour de toi qui blesse et ralentit.", "+dégâts.", "Nuage plus grand.", "Ralentit beaucoup plus.", "Nuage énorme et plus toxique."],
      dmg: [3, 5, 5, 6, 9], R: [22, 22, 30, 30, 40], slow: [0.3, 0.3, 0.3, 0.55, 0.55],
    },
    feuilles: {
      name: "Tourbillon de feuilles", img: SPR.leaf[0],
      desc: ["Des feuilles tranchantes partent tout autour.", "+1 feuille.", "+dégâts, transpercent plus.", "+1 feuille.", "+2 feuilles, plus fréquent."],
      n: [4, 5, 5, 6, 8], dmg: [8, 8, 12, 12, 13], pierce: [2, 2, 3, 3, 3], cd: [2.2, 2.2, 2.2, 2.0, 1.6],
    },
  };
  var PASSIVES = {
    pattes: { name: "Pattes agiles", icon: "🐾", desc: "+10 % de vitesse de course." },
    appetit: { name: "Gros appétit", icon: "🍄", desc: "+20 PV max (et soigne 20 PV)." },
    joues: { name: "Grosses joues", icon: "🌰", desc: "+40 % de distance de ramassage." },
    griffes: { name: "Griffes aiguisées", icon: "🗡️", desc: "+10 % de dégâts." },
    vivacite: { name: "Vivacité", icon: "⚡", desc: "-8 % de temps de recharge." },
    ecorce: { name: "Armure d'écorce", icon: "🪵", desc: "-1 dégât reçu par coup." },
    seve: { name: "Sève", icon: "💧", desc: "Régénère 0,4 PV par seconde." },
  };
  var MAX_LVL = 5, MAX_WEAPONS = 4, MAX_PASSIVES = 4;

  /* ---------- ennemis ---------- */
  var ENEMIES = {
    slug:   { spr: SPR.slug,   hp: 9,  spd: 18, dmg: 6,  r: 5, xp: 1, from: 0,   w: 4 },
    beetle: { spr: SPR.beetle, hp: 24, spd: 26, dmg: 8,  r: 5, xp: 2, from: 40,  w: 4 },
    wasp:   { spr: SPR.wasp,   hp: 9,  spd: 48, dmg: 5,  r: 4, xp: 1, from: 75,  w: 3 },
    crow:   { spr: SPR.crow,   hp: 32, spd: 38, dmg: 10, r: 6, xp: 3, from: 140, w: 3 },
    toad:   { spr: SPR.toad,   hp: 95, spd: 15, dmg: 14, r: 8, xp: 6, from: 210, w: 2 },
    boar:   { spr: SPR.boar,   hp: 900, spd: 22, dmg: 25, r: 12, xp: 40, boss: true },
  };

  /* ---------- état ---------- */
  var W = 320, H = 200;
  var state = "start";
  var p, enemies, projs, lobs, gems, fx, texts, grid, time, kills, level, xp, xpNext, pending;
  var spawnAcc, nextSwarm, nextBoss, bossCount, shake, leafRot, orbAngle, sporeTick, uid;

  function reset() {
    p = { x: 0, y: 0, hp: 100, maxHp: 100, face: 1, moving: false, anim: 0, inv: 0,
          weapons: { gland: 1 }, passives: {}, timers: {} };
    enemies = []; projs = []; lobs = []; gems = []; fx = []; texts = [];
    time = 0; kills = 0; level = 1; xp = 0; xpNext = 4; pending = 0;
    spawnAcc = 0; nextSwarm = 60; nextBoss = 180; bossCount = 0; shake = 0; leafRot = 0; orbAngle = 0; sporeTick = 0; uid = 0;
  }

  function stat(k) { return p.passives[k] || 0; }
  function might() { return 1 + 0.1 * stat("griffes"); }
  function haste() { return 1 - 0.08 * stat("vivacite"); }
  function magnet() { return 22 * (1 + 0.4 * stat("joues")); }
  function wl(id) { return (p.weapons[id] || 1) - 1; }

  /* ---------- entrées ---------- */
  var keys = {};
  var mouse = { down: false, x: 0, y: 0 };
  var joy = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0 };
  var JOY_R = 26;

  function toInternal(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
  }
  var KEYMAP = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  window.addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (state === "play" && KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (state === "play" && e.code === "Space") e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") {
      if (state === "play") { pause(); e.preventDefault(); }
      else if (state === "pause") { resume(); e.preventDefault(); }
    }
    if (state === "levelup") {
      var n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (n !== undefined) { var b = stage.querySelectorAll("[data-choices] button")[n]; if (b) b.click(); }
    }
  });
  window.addEventListener("keyup", function (e) { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  window.addEventListener("blur", function () { keys = {}; mouse.down = false; joy.active = false; joy.id = null; if (state === "play") pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "play") pause(); });

  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play") return;
    var q = toInternal(e.clientX, e.clientY);
    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      mouse.down = true; mouse.x = q.x; mouse.y = q.y;
    } else if (joy.id === null) {
      joy.id = e.pointerId; joy.active = true; joy.ox = joy.x = q.x; joy.oy = joy.y = q.y;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", function (e) {
    var q = toInternal(e.clientX, e.clientY);
    if (e.pointerType === "mouse") { mouse.x = q.x; mouse.y = q.y; }
    else if (e.pointerId === joy.id) { joy.x = q.x; joy.y = q.y; }
  });
  function release(e) {
    if (e.pointerType === "mouse") mouse.down = false;
    else if (e.pointerId === joy.id) { joy.id = null; joy.active = false; }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function inputVector() {
    var x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if (x || y) { var l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (joy.active) {
      var dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d > JOY_R) { joy.ox = joy.x - dx / d * JOY_R; joy.oy = joy.y - dy / d * JOY_R; d = JOY_R; dx = joy.x - joy.ox; dy = joy.y - joy.oy; }
      if (d < 3) return { x: 0, y: 0 };
      return { x: dx / JOY_R, y: dy / JOY_R };
    }
    if (mouse.down) {
      var mx = mouse.x - W / 2, my = mouse.y - H / 2, md = Math.hypot(mx, my);
      if (md < 3) return { x: 0, y: 0 };
      var k = Math.min(1, md / 16);
      return { x: mx / md * k, y: my / md * k };
    }
    return { x: 0, y: 0 };
  }

  /* ---------- grille spatiale ---------- */
  var CELL = 24;
  function buildGrid() {
    grid = new Map();
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var k = (Math.floor(e.x / CELL) + 32768) * 65536 + (Math.floor(e.y / CELL) + 32768);
      var a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e);
    }
  }
  function near(x, y, r, fn) {
    var x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    var y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) {
      var a = grid.get((cx + 32768) * 65536 + (cy + 32768));
      if (a) for (var i = 0; i < a.length; i++) if (!a[i].dead && fn(a[i]) === false) return;
    }
  }

  /* ---------- apparition ---------- */
  function hpMul() { return 1 + time / 100 + Math.pow(time / 300, 2); }
  function spawn(type, ang, dist) {
    var d = ENEMIES[type];
    if (ang === undefined) ang = Math.random() * Math.PI * 2;
    if (dist === undefined) dist = Math.hypot(W, H) / 2 + 12 + Math.random() * 20;
    var hp = d.hp * (d.boss ? (1 + bossCount * 0.9) * (1 + time / 200) : hpMul());
    var e = { id: ++uid, type: type, d: d, x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist,
              hp: hp, maxHp: hp, kx: 0, ky: 0, flash: 0, slowT: 0, slow: 0, orb: 0, anim: Math.random() * 2,
              phase: Math.random() * 6, face: 1, charge: 0, windup: 0, cd: 3 };
    enemies.push(e);
    return e;
  }
  function pickType() {
    var pool = [], total = 0;
    Object.keys(ENEMIES).forEach(function (k) {
      var d = ENEMIES[k];
      if (d.boss || time < d.from) return;
      var w = d.w * (1 + Math.min(1.5, (time - d.from) / 120));
      pool.push([k, w]); total += w;
    });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) return pool[i][0]; }
    return "slug";
  }
  function banner(text) {
    var b = $("[data-banner]");
    if (!b) return;
    b.textContent = text; b.hidden = false;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }
  function director(dt) {
    var rate = Math.min(14, 1.4 + time / 32);
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < 280) spawn(pickType()); }
    if (time >= nextSwarm) {
      nextSwarm += 60;
      var n = 18 + Math.floor(time / 60) * 6, type = time < 150 ? "slug" : (time < 300 ? "wasp" : "beetle");
      var R = Math.hypot(W, H) / 2 + 8;
      for (var i = 0; i < n; i++) spawn(type, i / n * Math.PI * 2, R);
      banner("Une nuée approche !");
    }
    if (time >= nextBoss) {
      nextBoss += 180;
      spawn("boar");
      bossCount++;
      banner("Le Grand Sanglier charge !");
      SND.boom();
    }
  }

  /* ---------- dégâts ---------- */
  function hurt(e, dmg, kx, ky) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg * might() * (0.9 + Math.random() * 0.2)));
    e.hp -= dmg; e.flash = 0.1;
    var kb = e.d.boss ? 0.15 : 1;
    e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    if (texts.length < 60) texts.push({ x: e.x + (Math.random() * 6 - 3), y: e.y - e.d.r - 6, n: dmg, life: 0.6 });
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true; kills++;
    var colors = { slug: "#d9cf63", beetle: "#a88ad8", wasp: "#f2c230", crow: "#4a4a6a", toad: "#9cae4f", boar: "#8f6243" };
    burst(e.x, e.y, colors[e.type], e.d.boss ? 30 : 6);
    if (e.d.boss) {
      gems.push({ x: e.x, y: e.y, kind: "chest" });
      for (var i = 0; i < 12; i++) gems.push({ x: e.x + Math.random() * 30 - 15, y: e.y + Math.random() * 30 - 15, kind: "xp", v: 4 });
      $("[data-boss]").hidden = true;
      return;
    }
    if (Math.random() < 0.012) gems.push({ x: e.x, y: e.y, kind: "berry" });
    if (gems.length > 450) { var g = gems[(Math.random() * gems.length) | 0]; if (g.kind === "xp") { g.v += e.d.xp; return; } }
    gems.push({ x: e.x, y: e.y, kind: "xp", v: e.d.xp });
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50;
      fx.push({ kind: "dot", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color: color });
    }
  }

  /* ---------- armes ---------- */
  function nearest(n, range) {
    var best = [];
    var r2 = range * range;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead) continue;
      var d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
      if (d > r2) continue;
      if (best.length < n) { best.push([d, e]); best.sort(function (a, b) { return a[0] - b[0]; }); }
      else if (d < best[n - 1][0]) { best[n - 1] = [d, e]; best.sort(function (a, b) { return a[0] - b[0]; }); }
    }
    return best.map(function (b) { return b[1]; });
  }
  function shoot(x, y, ang, spd, dmg, pierce, kind, life) {
    projs.push({ x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg: dmg, pierce: pierce, kind: kind, life: life || 1.4, hit: [], r: 4 });
  }
  function timer(id, cd, dt) {
    p.timers[id] = (p.timers[id] === undefined ? 0.3 : p.timers[id]) - dt;
    if (p.timers[id] <= 0) { p.timers[id] = cd * haste(); return true; }
    return false;
  }

  function weapons(dt) {
    var w, L;
    if (p.weapons.gland) {
      w = WEAPONS.gland; L = wl("gland");
      if (timer("gland", w.cd[L], dt)) {
        var t = nearest(w.count[L], 160);
        for (var i = 0; i < w.count[L]; i++) {
          var tg = t[i % Math.max(1, t.length)];
          var a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : (p.face > 0 ? 0 : Math.PI);
          if (!tg || i >= t.length) a += (i - (w.count[L] - 1) / 2) * 0.25;
          shoot(p.x, p.y - 2, a, 150, w.dmg[L], w.pierce[L], "acorn", 1.2);
        }
      }
    }
    if (p.weapons.queue) {
      w = WEAPONS.queue; L = wl("queue");
      if (timer("queue", w.cd[L], dt)) {
        var dirs = w.both[L] ? [1, -1] : [p.face];
        var R = w.r[L];
        dirs.forEach(function (dir) {
          fx.push({ kind: "swipe", dir: dir, r: R, life: 0.18, max: 0.18 });
          near(p.x + dir * R / 2, p.y, R + 10, function (e) {
            var dx = e.x - p.x, dy = e.y - p.y;
            if (dx * dir < -4 || Math.hypot(dx, dy) > R + e.d.r || Math.abs(dy) > R * 0.8 + e.d.r) return;
            hurt(e, w.dmg[L], dir * 90, dy * 1.5);
          });
        });
        SND.whip();
      }
    }
    if (p.weapons.champi) {
      w = WEAPONS.champi; L = wl("champi");
      orbAngle += w.spd[L] * dt;
      for (var j = 0; j < w.n[L]; j++) {
        var oa = orbAngle + j / w.n[L] * Math.PI * 2;
        var ox = p.x + Math.cos(oa) * w.R[L], oy = p.y + Math.sin(oa) * w.R[L] * 0.8;
        near(ox, oy, 14, function (e) {
          if (e.orb > time || Math.hypot(e.x - ox, e.y - oy) > 5 + e.d.r) return;
          e.orb = time + 0.45;
          hurt(e, w.dmg[L], (e.x - p.x) * 1.2, (e.y - p.y) * 1.2);
        });
      }
    }
    if (p.weapons.pomme) {
      w = WEAPONS.pomme; L = wl("pomme");
      if (timer("pomme", w.cd[L], dt)) {
        var cand = nearest(12, 130);
        for (var k = 0; k < w.n[L]; k++) {
          var tgt = cand.length ? cand[(Math.random() * cand.length) | 0] : null;
          var tx = tgt ? tgt.x : p.x + (Math.random() * 120 - 60), ty = tgt ? tgt.y : p.y + (Math.random() * 80 - 40);
          lobs.push({ sx: p.x, sy: p.y, tx: tx, ty: ty, t: 0, dur: 0.55 + k * 0.08, dmg: w.dmg[L], rad: w.rad[L] });
        }
      }
    }
    if (p.weapons.spores) {
      w = WEAPONS.spores; L = wl("spores");
      sporeTick -= dt;
      var tick = sporeTick <= 0;
      if (tick) sporeTick = 0.5;
      var SR = w.R[L];
      near(p.x, p.y, SR + 12, function (e) {
        if (Math.hypot(e.x - p.x, (e.y - p.y) * 1.25) > SR + e.d.r) return;
        e.slowT = 0.3; e.slow = w.slow[L];
        if (tick) hurt(e, w.dmg[L], 0, 0);
      });
    }
    if (p.weapons.feuilles) {
      w = WEAPONS.feuilles; L = wl("feuilles");
      if (timer("feuilles", w.cd[L], dt)) {
        leafRot += 0.45;
        for (var m = 0; m < w.n[L]; m++) shoot(p.x, p.y, leafRot + m / w.n[L] * Math.PI * 2, 105, w.dmg[L], w.pierce[L], "leaf", 1.1);
      }
    }
  }

  /* ---------- montée de niveau ---------- */
  function choices() {
    var pool = [];
    var nW = Object.keys(p.weapons).length, nP = Object.keys(p.passives).length;
    Object.keys(WEAPONS).forEach(function (k) {
      var l = p.weapons[k] || 0;
      if (l >= MAX_LVL || (!l && nW >= MAX_WEAPONS)) return;
      pool.push({ type: "w", id: k, lvl: l + 1, weight: l ? 3 : 2 });
    });
    Object.keys(PASSIVES).forEach(function (k) {
      var l = p.passives[k] || 0;
      if (l >= MAX_LVL || (!l && nP >= MAX_PASSIVES)) return;
      pool.push({ type: "p", id: k, lvl: l + 1, weight: l ? 2 : 1.5 });
    });
    var out = [];
    while (out.length < 3 && pool.length) {
      var total = pool.reduce(function (s, c) { return s + c.weight; }, 0), r = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0 || i === pool.length - 1) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (!out.length) out = [{ type: "heal" }, { type: "gold" }];
    return out;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var iconCache = {};
  function iconUrl(id) {
    if (!iconCache[id]) iconCache[id] = WEAPONS[id].img.c.toDataURL();
    return iconCache[id];
  }
  function openLevelUp() {
    state = "levelup";
    keys = {}; mouse.down = false; joy.active = false; joy.id = null;
    var list = choices();
    var box = $("[data-choices]");
    box.innerHTML = "";
    list.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice";
      var icon, name, lvl, desc;
      if (c.type === "w") {
        icon = '<img src="' + iconUrl(c.id) + '" alt="">'; name = WEAPONS[c.id].name;
        lvl = c.lvl === 1 ? "Nouveau !" : "Niv. " + c.lvl; desc = WEAPONS[c.id].desc[c.lvl - 1];
      } else if (c.type === "p") {
        icon = '<span class="emoji">' + PASSIVES[c.id].icon + "</span>"; name = PASSIVES[c.id].name;
        lvl = c.lvl === 1 ? "Nouveau !" : "Niv. " + c.lvl; desc = PASSIVES[c.id].desc;
      } else if (c.type === "heal") {
        icon = '<span class="emoji">🍓</span>'; name = "Panier de baies"; lvl = ""; desc = "Soigne 40 PV.";
      } else {
        icon = '<span class="emoji">✨</span>'; name = "Noisette dorée"; lvl = ""; desc = "+250 points de score.";
      }
      b.innerHTML = '<span class="choice-key">' + (i + 1) + "</span>" + '<span class="choice-icon">' + icon + "</span>" +
        '<span class="choice-text"><strong>' + esc(name) + "</strong>" + (lvl ? ' <em>' + lvl + "</em>" : "") + "<span>" + esc(desc) + "</span></span>";
      b.addEventListener("click", function () { apply(c); });
      box.appendChild(b);
    });
    show("levelup");
    SND.level();
    setTimeout(function () { var f = box.querySelector("button"); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  var bonusScore = 0;
  function apply(c) {
    if (state !== "levelup") return;
    if (c.type === "w") p.weapons[c.id] = c.lvl;
    else if (c.type === "p") {
      p.passives[c.id] = c.lvl;
      if (c.id === "appetit") { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); }
    } else if (c.type === "heal") p.hp = Math.min(p.maxHp, p.hp + 40);
    else bonusScore += 250;
    pending--;
    renderBuild();
    if (pending > 0) openLevelUp();
    else { state = "play"; show(null); last = performance.now(); }
  }
  function renderBuild() {
    var el = $("[data-build]");
    if (!el) return;
    var html = "";
    Object.keys(p.weapons).forEach(function (k) { html += '<span title="' + esc(WEAPONS[k].name) + '"><img src="' + iconUrl(k) + '" alt="">' + p.weapons[k] + "</span>"; });
    Object.keys(p.passives).forEach(function (k) { html += '<span title="' + esc(PASSIVES[k].name) + '"><i>' + PASSIVES[k].icon + "</i>" + p.passives[k] + "</span>"; });
    el.innerHTML = html;
  }

  /* ---------- boucle ---------- */
  function update(dt) {
    time += dt;
    var v = inputVector();
    var spd = 62 * (1 + 0.1 * stat("pattes"));
    p.x += v.x * spd * dt; p.y += v.y * spd * dt;
    p.moving = Math.abs(v.x) + Math.abs(v.y) > 0.05;
    if (v.x > 0.1) p.face = 1; else if (v.x < -0.1) p.face = -1;
    if (p.moving) p.anim += dt * 8;
    p.inv -= dt;
    if (stat("seve")) p.hp = Math.min(p.maxHp, p.hp + 0.4 * stat("seve") * dt);

    director(dt);
    buildGrid();
    weapons(dt);

    // ennemis
    var i, e, armor = stat("ecorce");
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      var dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      var sp = e.d.spd * (e.slowT > 0 ? 1 - e.slow : 1);
      e.slowT -= dt; e.flash -= dt; e.anim += dt * (e.type === "wasp" ? 14 : 5);
      var mx = dx / d, my = dy / d;
      if (e.type === "wasp") { var s = Math.sin(time * 6 + e.phase) * 0.6; var ox = -my * s, oy = mx * s; mx += ox; my += oy; }
      if (e.d.boss) {
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 135; }
        else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.9; e.cx = dx / d; e.cy = dy / d; SND.boom(); } }
        else { e.cd -= dt; if (e.cd <= 0 && d < 170) { e.windup = 0.6; e.cd = 3.5; } }
        var bar = $("[data-boss] i"); if (bar) bar.style.width = Math.max(0, e.hp / e.maxHp * 100) + "%";
        $("[data-boss]").hidden = false;
      }
      e.x += mx * sp * dt + e.kx * dt; e.y += my * sp * dt + e.ky * dt;
      var damp = Math.pow(0.0005, dt); e.kx *= damp; e.ky *= damp;
      if (Math.abs(mx) > 0.1) e.face = mx > 0 ? 1 : -1;
      // contact
      if (p.inv <= 0 && Math.abs(dx) < e.d.r + 5 && Math.abs(dy) < e.d.r + 5) {
        p.hp -= Math.max(1, e.d.dmg - armor); p.inv = 0.6; shake = 0.25; SND.hurt();
        burst(p.x, p.y, "#c8553d", 5);
      }
      // trop loin : on le replace devant le joueur
      if (d > 420 && !e.d.boss) { var a = Math.atan2(dy, dx) + (Math.random() - 0.5); var R = Math.hypot(W, H) / 2 + 10; e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R; }
    }
    // séparation légère
    grid.forEach(function (cell) {
      for (var a = 0; a < cell.length; a++) for (var b = a + 1; b < cell.length; b++) {
        var A = cell[a], B = cell[b], sx = B.x - A.x, sy = B.y - A.y, dd = Math.hypot(sx, sy), min = A.d.r + B.d.r - 2;
        if (dd > 0 && dd < min) {
          var push = (min - dd) / dd * 0.5;
          var wa = A.d.boss ? 0 : (B.d.boss ? 1 : 0.5), wb = 1 - wa;
          if (A.d.boss && B.d.boss) { wa = wb = 0.5; }
          A.x -= sx * push * wa * 2; A.y -= sy * push * wa * 2; B.x += sx * push * wb * 2; B.y += sy * push * wb * 2;
        }
      }
    });
    if (p.hp <= 0) return gameOver();

    // projectiles
    for (i = projs.length - 1; i >= 0; i--) {
      var q = projs[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      near(q.x, q.y, 16, function (en) {
        if (q.pierce <= 0 || q.hit.indexOf(en.id) >= 0) return;
        if (Math.abs(en.x - q.x) > en.d.r + q.r || Math.abs(en.y - q.y) > en.d.r + q.r) return;
        q.hit.push(en.id); q.pierce--;
        hurt(en, q.dmg, q.vx * 0.5, q.vy * 0.5);
        if (q.pierce <= 0) return false;
      });
      if (q.life <= 0 || q.pierce <= 0) projs.splice(i, 1);
    }
    // pommes de pin
    for (i = lobs.length - 1; i >= 0; i--) {
      var l = lobs[i]; l.t += dt;
      if (l.t >= l.dur) {
        fx.push({ kind: "ring", x: l.tx, y: l.ty, r: l.rad, life: 0.25, max: 0.25 });
        burst(l.tx, l.ty, "#e8873a", 8);
        near(l.tx, l.ty, l.rad + 12, function (en) {
          var ddx = en.x - l.tx, ddy = en.y - l.ty;
          if (Math.hypot(ddx, ddy) <= l.rad + en.d.r) hurt(en, l.dmg, ddx * 3, ddy * 3);
        });
        SND.boom();
        lobs.splice(i, 1);
      }
    }
    enemies = enemies.filter(function (en) { return !en.dead; });

    // ramassage
    var mag = magnet();
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], gx = p.x - g.x, gy = p.y - g.y, gd = Math.hypot(gx, gy);
      if (g.pull || gd < mag) {
        g.pull = (g.pull || 60) + 260 * dt;
        g.x += gx / gd * g.pull * dt; g.y += gy / gd * g.pull * dt;
      }
      if (gd < 7) {
        if (g.kind === "xp") { xp += g.v; SND.pick(); }
        else if (g.kind === "berry") { p.hp = Math.min(p.maxHp, p.hp + 25); SND.level(); }
        else if (g.kind === "chest") { pending++; burst(p.x, p.y, "#f2c230", 16); }
        gems.splice(i, 1);
      } else if (gd > 600) gems.splice(i, 1);
    }
    while (xp >= xpNext) { xp -= xpNext; level++; pending++; xpNext = Math.floor(5 + level * 4.5 + Math.max(0, level - 20) * 6); }

    // effets
    for (i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.life -= dt;
      if (f.kind === "dot") { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (f.life <= 0) fx.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 18 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    shake = Math.max(0, shake - dt);

    if (pending > 0) openLevelUp();
  }

  /* ---------- dessin ---------- */
  function hash(x, y) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  var GROUND = {
    day: { base: "#7fa95a", patch: "#76a052", tuft: "#5b8a4a", hi: "#a6cf74", flowers: ["#fdf3de", "#f2b05e", "#c8553d", "#f6d36b"], pebble: "#b9ae96", pebbleDk: "#8a806c" },
    night: { base: "#264634", patch: "#22402f", tuft: "#1b3326", hi: "#3f6b3a", flowers: ["#7fd1c7", "#c9b3ff", "#f2d48a", "#7fd1c7"], pebble: "#4b5a52", pebbleDk: "#33403a" },
  };
  function drawGround(cx, cy, night) {
    var G = night ? GROUND.night : GROUND.day;
    ctx.fillStyle = G.base; ctx.fillRect(0, 0, W, H);
    var T = 16;
    var tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(W / T) + 2, ty1 = ty0 + Math.ceil(H / T) + 2;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var sx = Math.round(tx * T - cx), sy = Math.round(ty * T - cy);
      if (hash(tx >> 2, ty >> 2) % 3 === 0) { ctx.fillStyle = G.patch; ctx.fillRect(sx, sy, T, T); }
      var h = hash(tx, ty), k = h % 23, ox = (h >>> 8) % 12, oy = (h >>> 12) % 12;
      if (k < 5) { // touffe d'herbe
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox, sy + oy, 1, 2); ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 3); ctx.fillRect(sx + ox + 4, sy + oy, 1, 2);
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 1);
      } else if (k < 7) { // fleur
        ctx.fillStyle = G.flowers[(h >>> 16) % 4];
        ctx.fillRect(sx + ox + 1, sy + oy, 1, 1); ctx.fillRect(sx + ox, sy + oy + 1, 3, 1); ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 1);
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox + 1, sy + oy + 3, 1, 2);
      } else if (k === 7) { // caillou
        ctx.fillStyle = G.pebbleDk; ctx.fillRect(sx + ox, sy + oy + 1, 5, 2);
        ctx.fillStyle = G.pebble; ctx.fillRect(sx + ox + 1, sy + oy, 3, 2);
      } else if (k === 8 && (h >>> 20) % 3 === 0) { // petit champignon
        ctx.fillStyle = night ? "#7fd1c7" : "#c8553d"; ctx.fillRect(sx + ox, sy + oy, 3, 1); ctx.fillRect(sx + ox - 1, sy + oy + 1, 5, 1);
        ctx.fillStyle = "#f3e1c0"; ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 2);
      } else if (k < 12) {
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox, sy + oy, 1, 1);
      }
    }
  }
  function blit(s, x, y, flip, white) {
    var img = white ? (flip ? s.wf : s.wc) : (flip ? s.f : s.c);
    ctx.drawImage(img, Math.round(x - s.w / 2), Math.round(y - s.h / 2));
  }
  function shadow(x, y, w) {
    ctx.fillStyle = "rgba(20,30,15,.25)";
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
    ctx.fillRect(Math.round(x - w / 2 + 1), Math.round(y - 1), Math.round(w - 2), 4);
  }

  function draw() {
    var night = document.documentElement.dataset.theme === "dark";
    var sx = shake > 0 ? (Math.random() * 4 - 2) : 0, sy = shake > 0 ? (Math.random() * 4 - 2) : 0;
    var cx = Math.round(p.x - W / 2 + sx), cy = Math.round(p.y - H / 2 + sy);
    drawGround(cx, cy, night);
    ctx.save();
    ctx.translate(-cx, -cy);

    // ramassables
    var bob = Math.sin(time * 4);
    gems.forEach(function (g) {
      var s = g.kind === "xp" ? (g.v >= 3 ? SPR.gold : SPR.nut) : (g.kind === "berry" ? SPR.berry : SPR.chest);
      blit(s, g.x, g.y + (g.kind === "chest" ? bob * 1.5 : 0));
    });

    // spores
    if (p.weapons.spores) {
      var SR = WEAPONS.spores.R[wl("spores")];
      ctx.fillStyle = night ? "rgba(201,179,255,.12)" : "rgba(122,90,190,.12)";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, SR, SR * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      for (var s = 0; s < 10; s++) {
        var a = time * 0.8 + s / 10 * Math.PI * 2, rr = SR * (0.55 + 0.4 * Math.sin(time * 2 + s));
        blit(SPR.spore, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.8);
      }
    }

    // ennemis + joueur triés par profondeur
    enemies.sort(function (a, b) { return a.y - b.y; });
    var drewPlayer = false;
    function drawPlayer() {
      drewPlayer = true;
      var frame = p.moving ? ((p.anim | 0) % 2) : 0;
      shadow(p.x, p.y + 6, 10);
      if (p.inv > 0 && ((p.inv * 20) | 0) % 2) return;
      blit(SPR.squirrel[frame], p.x, p.y - (p.moving ? (frame ? 1 : 0) : 0), p.face < 0);
    }
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!drewPlayer && e.y > p.y) drawPlayer();
      if (e.x < cx - 30 || e.x > cx + W + 30 || e.y < cy - 30 || e.y > cy + H + 30) continue;
      var spr = e.d.spr[(e.anim | 0) % 2];
      if (e.type !== "wasp" && e.type !== "crow") shadow(e.x, e.y + spr.h / 2 - 2, spr.w * 0.7);
      else shadow(e.x, e.y + spr.h / 2 + 3, spr.w * 0.5);
      blit(spr, e.x, e.y, e.face < 0, e.flash > 0);
      if (e.slowT > 0 && !e.d.boss) { ctx.fillStyle = "rgba(160,130,230,.6)"; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - spr.h / 2 - 2), 2, 2); }
    }
    if (!drewPlayer) drawPlayer();

    // barre de vie
    var hb = 16;
    ctx.fillStyle = OUT; ctx.fillRect(Math.round(p.x - hb / 2 - 1), Math.round(p.y + 9), hb + 2, 4);
    ctx.fillStyle = "#4a2e1c"; ctx.fillRect(Math.round(p.x - hb / 2), Math.round(p.y + 10), hb, 2);
    ctx.fillStyle = p.hp / p.maxHp > 0.3 ? "#9cc56b" : "#c8553d";
    ctx.fillRect(Math.round(p.x - hb / 2), Math.round(p.y + 10), Math.max(0, Math.round(hb * p.hp / p.maxHp)), 2);

    // champignons gardiens
    if (p.weapons.champi) {
      var w = WEAPONS.champi, L = wl("champi");
      for (var j = 0; j < w.n[L]; j++) {
        var oa = orbAngle + j / w.n[L] * Math.PI * 2;
        blit(SPR.mushroom, p.x + Math.cos(oa) * w.R[L], p.y + Math.sin(oa) * w.R[L] * 0.8);
      }
    }
    // projectiles
    projs.forEach(function (q) {
      if (q.kind === "leaf") blit(SPR.leaf[((time * 12) | 0) % 2], q.x, q.y);
      else blit(SPR.acorn, q.x, q.y, q.vx < 0);
    });
    lobs.forEach(function (l) {
      var k = l.t / l.dur, x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k - Math.sin(k * Math.PI) * 30;
      shadow(l.sx + (l.tx - l.sx) * k, l.sy + (l.ty - l.sy) * k + 3, 5);
      blit(SPR.pinecone, x, y);
    });
    // effets
    fx.forEach(function (f) {
      if (f.kind === "dot") { ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
      else if (f.kind === "ring") {
        var k = 1 - f.life / f.max;
        ctx.strokeStyle = "rgba(242,176,94," + (1 - k) + ")"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6) * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,226,122," + (0.35 * (1 - k)) + ")"; ctx.fill();
      } else if (f.kind === "swipe") {
        var t = 1 - f.life / f.max, start = f.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        ctx.strokeStyle = "rgba(242,176,94," + (1 - t) + ")"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, f.r * 0.85, f.r * 0.7, 0, start, start + Math.PI * f.dir * Math.min(1, t * 2.5), f.dir < 0); ctx.stroke();
        ctx.strokeStyle = "rgba(253,243,222," + (1 - t) + ")"; ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    texts.forEach(function (t) { ctx.globalAlpha = Math.min(1, t.life * 3); drawNum(t.n, t.x, t.y, "#fdf3de"); });
    ctx.globalAlpha = 1;
    ctx.restore();

    // assombrissement progressif (le soir tombe sur la forêt)
    var dusk = Math.min(0.28, time / 1500);
    if (dusk > 0.01) { ctx.fillStyle = "rgba(20,15,50," + dusk + ")"; ctx.fillRect(0, 0, W, H); }

    // joystick
    if (joy.active) {
      ctx.fillStyle = "rgba(253,243,222,.18)"; ctx.strokeStyle = "rgba(253,243,222,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(232,135,58,.85)";
      ctx.beginPath(); ctx.arc(joy.x, joy.y, 9, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- HUD ---------- */
  var hud = { time: $("[data-time]"), kills: $("[data-kills]"), lvl: $("[data-lvl]"), xp: $("[data-xp]") };
  var lastHud = "";
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function updateHud() {
    var key = Math.floor(time) + "|" + kills + "|" + level + "|" + Math.round(xp / xpNext * 100);
    if (key === lastHud) return;
    lastHud = key;
    hud.time.textContent = fmtTime(time);
    hud.kills.textContent = kills;
    hud.lvl.textContent = "Niv. " + level;
    hud.xp.style.width = Math.min(100, xp / xpNext * 100) + "%";
  }
  function score() { return Math.floor(time) * 10 + kills + bonusScore; }

  /* ---------- écrans ---------- */
  function show(name) {
    stage.querySelectorAll("[data-screen]").forEach(function (el) { el.hidden = el.dataset.screen !== name; });
    $("[data-hud]").hidden = !(state === "play" || state === "levelup" || state === "pause");
  }
  var last = 0, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === "play") { update(dt); updateHud(); }
    if (p) draw(); else drawIdle(now);
  }
  function drawIdle(now) {
    var t = now / 1000;
    drawGround(Math.round(t * 12), 0, document.documentElement.dataset.theme === "dark");
    blit(SPR.squirrel[((t * 6) | 0) % 2], W / 2, H / 2 + 20 - (((t * 6) | 0) % 2));
  }
  function start() {
    reset(); bonusScore = 0; lastHud = "";
    state = "play"; show(null); renderBuild();
    $("[data-boss]").hidden = true;
    last = performance.now();
    canvas.focus({ preventScroll: true });
    var r = stage.getBoundingClientRect(), head = document.querySelector(".site-header");
    var top = head ? head.getBoundingClientRect().bottom : 0;
    if (!document.fullscreenElement && !stage.classList.contains("is-max") && (r.top < top || r.bottom > window.innerHeight))
      window.scrollTo({ top: window.scrollY + r.top - top - 8, behavior: "smooth" });
    sfx(660, 0.1, "square", 0.04);
  }
  function pause() { if (state !== "play") return; state = "pause"; keys = {}; mouse.down = false; joy.active = false; joy.id = null; show("pause"); }
  function resume() { if (state !== "pause") return; state = "play"; show(null); last = performance.now(); }
  function gameOver() {
    state = "over"; show("over"); SND.over();
    $("[data-boss]").hidden = true;
    var sc = score();
    var best = Number(store("es-best") || 0);
    var isBest = sc > best;
    if (isBest) store("es-best", String(sc));
    $("[data-over-stats]").innerHTML =
      "<li><span>Survie</span><strong>" + fmtTime(time) + "</strong></li>" +
      "<li><span>Ennemis</span><strong>" + kills + "</strong></li>" +
      "<li><span>Niveau</span><strong>" + level + "</strong></li>" +
      "<li class=\"total\"><span>Score</span><strong>" + sc.toLocaleString("fr-FR") + "</strong></li>";
    $("[data-over-best]").textContent = isBest ? "🏆 Nouveau record perso !" : "Ton record : " + Math.max(best, sc).toLocaleString("fr-FR");
    var form = $("[data-submit]"), msg = $("[data-submit-msg]");
    msg.textContent = "";
    var lbOk = window.Leaderboard && Leaderboard.configured();
    form.hidden = !lbOk;
    if (lbOk) {
      form.querySelector("input").value = store("es-name") || "";
      form.querySelector("button").disabled = false;
    }
  }

  $("[data-start]").addEventListener("click", start);
  stage.querySelectorAll("[data-restart]").forEach(function (b) { b.addEventListener("click", start); });
  $("[data-resume]").addEventListener("click", resume);
  $("[data-pause]").addEventListener("click", function () { if (state === "play") pause(); else resume(); });
  var muteBtn = $("[data-mute]");
  function muteLabel() { muteBtn.textContent = muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-label", muted ? "Activer le son" : "Couper le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { muted = !muted; store("es-muted", muted ? "1" : "0"); muteLabel(); });

  $("[data-submit]").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = this.querySelector("input"), btn = this.querySelector("button"), msg = $("[data-submit-msg]");
    var name = input.value.trim();
    if (name.length < 2) { msg.textContent = "Choisis un pseudo d'au moins 2 caractères."; return; }
    store("es-name", name);
    btn.disabled = true; msg.textContent = "Envoi…";
    Leaderboard.submit(GAME_ID, name, score(), { time: Math.floor(time), kills: kills, level: level }).then(function (r) {
      msg.textContent = r && r.rank ? "Envoyé ! Tu es " + r.rank + (r.rank === 1 ? "er" : "e") + " au classement." : "Envoyé !";
      document.querySelectorAll('[data-leaderboard="' + GAME_ID + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
    }).catch(function (err) {
      msg.textContent = Leaderboard.message(err); btn.disabled = false;
    });
  });

  // plein écran (avec repli CSS pour iOS)
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () {
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      try { var r = req.call(stage); if (r && r.catch) r.catch(function () { stage.classList.add("is-max"); }); } catch (e) { stage.classList.add("is-max"); }
    } else stage.classList.toggle("is-max");
    if (state === "start") start();
  });
  var exitMax = $("[data-exit-max]");
  if (exitMax) exitMax.addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen(); stage.classList.remove("is-max");
  });

  /* ---------- taille ---------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cw = stage.clientWidth, ch = stage.clientHeight;
    var scale = Math.max(2, Math.round(Math.sqrt(cw * ch) * dpr / 250));
    W = Math.ceil(cw * dpr / scale); H = Math.ceil(ch * dpr / scale);
    canvas.width = W; canvas.height = H;
    canvas.style.width = (W * scale / dpr) + "px";
    canvas.style.height = (H * scale / dpr) + "px";
    ctx.imageSmoothingEnabled = false;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  show("start");
  var best = Number(store("es-best") || 0);
  var bestEl = $("[data-start-best]");
  if (bestEl && best) bestEl.textContent = "Ton record : " + best.toLocaleString("fr-FR");
  last = performance.now();
  raf = requestAnimationFrame(loop);
})();
