/* =========================================================================
   Écureuil Survivor — moteur, menus et progression.
   Les données (personnages, armes, boutique, succès, sprites) sont dans
   js/game-data.js. Sauvegarde locale : localStorage « es-save-v1 ».
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-game]");
  var D = window.ES_DATA;
  if (!stage || !D) return;
  var canvas = stage.querySelector(".game-canvas");
  var ctx = canvas.getContext("2d");
  var $ = function (s) { return stage.querySelector(s); };
  var card = $("[data-card]"), overlay = $("[data-overlay]");
  var GAME_ID = "ecureuil-survivor";
  var VERSION = "v3";
  var TAU = Math.PI * 2;

  /* =====================================================================
     Sauvegarde
     ===================================================================== */
  var SAVE_KEY = "es-save-v1";
  function defaults() {
    return { gold: 0, shop: {}, ach: {}, owned: { noisette: true }, char: "noisette", diff: "normal", name: "",
             opts: { sound: true, shake: true, numbers: true },
             stats: { kills: 0, goldEarned: 0, runs: 0, bestTime: 0, bestScore: 0, bosses: 0, played: {}, bought: 0 } };
  }
  function load() {
    var s = defaults(), raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) {}
    if (raw && typeof raw === "object") {
      Object.keys(s).forEach(function (k) {
        if (raw[k] === undefined || raw[k] === null) return;
        if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) s[k] = Object.assign(s[k], raw[k]);
        else s[k] = raw[k];
      });
      s.stats.played = s.stats.played || {};
    } else {
      // reprise de l'ancienne version
      try {
        if (localStorage.getItem("es-muted") === "1") s.opts.sound = false;
        s.stats.bestScore = Number(localStorage.getItem("es-best") || 0) || 0;
        s.name = localStorage.getItem("es-name") || "";
      } catch (e) {}
    }
    if (!D.CHARACTERS.some(function (c) { return c.id === s.char; })) s.char = "noisette";
    if (!D.DIFFICULTIES[s.diff]) s.diff = "normal";
    return s;
  }
  var S = load();
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  function has(ach) { return !ach || !!S.ach[ach]; }
  function charById(id) { return D.CHARACTERS.filter(function (c) { return c.id === id; })[0] || D.CHARACTERS[0]; }
  function charAvailable(c) { return !!S.owned[c.id] || !c.unlock || has(c.unlock); }
  function achById(id) { return D.ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0]; }
  if (!charAvailable(charById(S.char))) S.char = "noisette";
  if (!has(D.DIFFICULTIES[S.diff].unlock)) S.diff = "normal";

  /* =====================================================================
     Sprites
     ===================================================================== */
  var OUT = "#2b1709";
  function sprite(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (row) { w = Math.max(w, row.length); });
    var W = w + 2, H = h + 2, filled = new Uint8Array(W * H);
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
    function variant(flip, white) {
      var v = document.createElement("canvas"); v.width = W; v.height = H;
      var vg = v.getContext("2d");
      if (flip) { vg.translate(W, 0); vg.scale(-1, 1); }
      vg.drawImage(c, 0, 0);
      if (white) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = "#fff"; vg.fillRect(0, 0, W, H); }
      return v;
    }
    return { c: c, f: variant(true), wc: variant(false, true), wf: variant(true, true), w: W, h: H };
  }
  var SPR = {};
  Object.keys(D.SPRITES).forEach(function (k) {
    var d = D.SPRITES[k];
    SPR[k] = d.frames.map(function (f) { return sprite(f, d.pal); });
    SPR[k].flying = !!d.flying;
  });
  var urlCache = {};
  function spriteUrl(name) { return urlCache[name] || (urlCache[name] = SPR[name][0].c.toDataURL()); }
  function goldIc() { return '<img class="gold-ic" src="' + spriteUrl("gold") + '" alt="glands d\'or">'; }

  /* ---------- police pixel 3x5 ---------- */
  var FONT = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
    N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
    ":": "000010000010000", "/": "001001010100100", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "%": "101001010100101", "'": "010010000000000", " ": "000000000000000" };
  function textWidth(str, sc) { return (String(str).length * 4 - 1) * (sc || 1); }
  // align : "c" (centre), "l" (gauche), "r" (droite)
  function drawText(str, x, y, color, align, sc) {
    str = String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    sc = sc || 1;
    var w = textWidth(str, sc);
    x = Math.round(align === "l" ? x : align === "r" ? x - w : x - w / 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? color : OUT;
      for (var i = 0; i < str.length; i++) {
        var b = FONT[str[i]]; if (!b) continue;
        for (var j = 0; j < 15; j++) if (b[j] === "1") {
          var px = x + (i * 4 + (j % 3)) * sc, py = y + ((j / 3) | 0) * sc;
          if (pass) ctx.fillRect(px, py, sc, sc); else ctx.fillRect(px - 1, py - 1, sc + 2, sc + 2);
        }
      }
    }
  }
  function drawNum(str, x, y, color) { drawText(str, x, y, color, "c", 1); }

  /* =====================================================================
     Son
     ===================================================================== */
  var actx = null, lastBlip = 0;
  function sfx(freq, dur, type, vol, slide) {
    if (!S.opts.sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function arp(notes, step, type, vol) { notes.forEach(function (f, i) { setTimeout(function () { sfx(f, 0.12, type || "square", vol || 0.04); }, i * step); }); }
  var SND = {
    pick: function () { var n = performance.now(); if (n - lastBlip < 45) return; lastBlip = n; sfx(880 + Math.random() * 200, 0.06, "square", 0.022, 1.5); },
    gold: function () { sfx(1320, 0.08, "square", 0.03, 1.3); },
    hurt: function () { sfx(200, 0.18, "sawtooth", 0.06, 0.4); },
    boom: function () { sfx(120, 0.25, "triangle", 0.08, 0.3); },
    zap: function () { sfx(1400, 0.07, "sawtooth", 0.025, 0.4); },
    level: function () { arp([523, 659, 784, 1047], 70); },
    ach: function () { arp([784, 988, 1175, 1568], 90, "triangle", 0.05); },
    whip: function () { sfx(500, 0.08, "triangle", 0.03, 0.5); },
    click: function () { sfx(660, 0.05, "square", 0.03); },
    over: function () { arp([392, 330, 262, 196], 160, "triangle", 0.06); },
  };

  /* =====================================================================
     État de partie
     ===================================================================== */
  var W = 320, H = 200;
  var state = "menu";     // menu | play | levelup | pause | over | error
  var curBoss = null;
  var p = null, r = null, CH, DIFF, enemies, projs, hostile, lobs, gems, fx, texts, grid;
  var spawnAcc, nextSwarm, nextBoss, bossCount, shake, leafRot, orbAngle, sporeTick, uid, achTick, pending, xp, xpNext;

  function need(L) { return 5 + (L - 1) * 3 + Math.max(0, L - 15) * 4 + Math.max(0, L - 30) * 8; }

  function calc() {
    var m = CH.mods || {}, sh = S.shop, ps = p.passives;
    var oldMax = p.maxHp || 0;
    p.maxHp = Math.max(20, 100 + (m.hp || 0) + 10 * (sh.vigueur || 0) + 20 * (ps.appetit || 0));
    p.speed = 62 * (1 + (m.speed || 0) + 0.05 * (sh.celerite || 0) + 0.1 * (ps.pattes || 0));
    p.might = 1 + (m.might || 0) + 0.05 * (sh.force || 0) + 0.1 * (ps.griffes || 0);
    p.armor = (m.armor || 0) + (sh.ecorce || 0) + (ps.ecorce || 0);
    p.magnet = 30 * (1 + (m.magnet || 0) + 0.15 * (sh.aimant || 0) + 0.4 * (ps.joues || 0));
    p.cdMul = Math.max(0.4, 1 - (m.cd || 0) - 0.03 * (sh.vivacite || 0) - 0.08 * (ps.vivacite || 0));
    p.xpMul = 1 + (m.xp || 0) + 0.08 * (sh.sagesse || 0) + 0.12 * (ps.savoir || 0);
    p.regen = 0.2 * (sh.recup || 0) + 0.4 * (ps.seve || 0);
    p.luck = 1 + 0.15 * (sh.chance || 0);
    p.goldMul = (1 + 0.1 * (sh.avarice || 0)) * DIFF.gold;
    if (oldMax && p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
  }

  function reset() {
    CH = charById(S.char); DIFF = D.DIFFICULTIES[S.diff] || D.DIFFICULTIES.normal;
    p = { x: 0, y: 0, hp: 0, face: 1, moving: false, anim: 0, inv: 0, weapons: {}, passives: {}, timers: {} };
    p.weapons[CH.weapon] = 1;
    calc(); p.hp = p.maxHp;
    r = { time: 0, kills: 0, level: 1, bosses: 0, berries: 0, gold: 0, lastHit: 0, maxedWeapon: false, nWeapons: 1, nPassives: 0,
          hard: S.diff !== "normal", ended: false, committed: false, newAch: [], bonus: 0,
          revives: S.shop.renaissance || 0, rerolls: S.shop.relance || 0, char: CH.id };
    enemies = []; projs = []; hostile = []; lobs = []; gems = []; fx = []; texts = [];
    xp = 0; xpNext = need(1); pending = 0;
    spawnAcc = 5; nextSwarm = 60; nextBoss = 180; bossCount = 0; shake = 0; leafRot = 0; orbAngle = 0; sporeTick = 0; uid = 0; achTick = 1;
    grid = new Map();
  }

  /* =====================================================================
     Entrées
     ===================================================================== */
  var keys = {};
  var mouse = { down: false, x: 0, y: 0 };
  var joy = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0 };
  var JOY_R = 26;
  var screen = "menu";
  function clearInput() { keys = {}; mouse.down = false; joy.active = false; joy.id = null; }
  function toInternal(cx, cy) {
    var rc = canvas.getBoundingClientRect();
    return { x: (cx - rc.left) / rc.width * W, y: (cy - rc.top) / rc.height * H };
  }
  var KEYMAP = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  window.addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (state === "play" && KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (state === "play" && e.code === "Space") e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") {
      if (state === "play") { pause(); e.preventDefault(); }
      else if (state === "pause") { resume(); e.preventDefault(); }
      else if (state === "menu" && screen !== "menu" && e.code === "Escape") { go("menu"); e.preventDefault(); }
    }
    if (state === "levelup") {
      var n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
      if (n !== undefined) { var b = card.querySelectorAll("[data-choice]")[n]; if (b) b.click(); }
    }
  });
  window.addEventListener("keyup", function (e) { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  window.addEventListener("blur", function () { clearInput(); if (state === "play") pause(); });
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
      if (d > JOY_R) { joy.ox = joy.x - dx / d * JOY_R; joy.oy = joy.y - dy / d * JOY_R; dx = joy.x - joy.ox; dy = joy.y - joy.oy; d = JOY_R; }
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

  /* =====================================================================
     Grille spatiale
     ===================================================================== */
  var CELL = 24;
  function cellKey(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  function buildGrid() {
    grid = new Map();
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      var a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e);
    }
  }
  function near(x, y, rad, fn) {
    var x0 = Math.floor((x - rad) / CELL), x1 = Math.floor((x + rad) / CELL);
    var y0 = Math.floor((y - rad) / CELL), y1 = Math.floor((y + rad) / CELL);
    for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) {
      var a = grid.get(cellKey(cx, cy));
      if (a) for (var i = 0; i < a.length; i++) if (!a[i].dead && fn(a[i]) === false) return;
    }
  }

  /* =====================================================================
     Apparitions
     ===================================================================== */
  function hpMul() { return (1 + r.time / 100 + Math.pow(r.time / 300, 2)) * DIFF.hp; }
  function spawn(type, ang, dist) {
    var d = D.ENEMIES[type];
    if (ang === undefined) ang = Math.random() * TAU;
    if (dist === undefined) dist = Math.hypot(W, H) / 2 + 6 + Math.random() * 14;
    var hp = d.hp * (d.boss ? (1 + bossCount * 0.9) * (1 + r.time / 200) * DIFF.hp : hpMul());
    var e = { id: ++uid, type: type, d: d, spr: SPR[d.sprite], x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist,
              hp: hp, maxHp: hp, kx: 0, ky: 0, flash: 0, slowT: 0, slow: 0, orb: 0, anim: Math.random() * 2,
              phase: Math.random() * 6, face: 1, charge: 0, windup: 0, cd: 3, spd: d.spd * DIFF.spd };
    enemies.push(e);
    return e;
  }
  function pickType() {
    var pool = [], total = 0;
    Object.keys(D.ENEMIES).forEach(function (k) {
      var d = D.ENEMIES[k];
      if (d.boss || r.time < d.from) return;
      var w = d.w * (1 + Math.min(1.5, (r.time - d.from) / 120));
      pool.push([k, w]); total += w;
    });
    var x = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) return pool[i][0]; }
    return "slug";
  }
  function banner(text) {
    var b = $("[data-banner]");
    b.textContent = text; b.hidden = false;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }
  function director(dt) {
    var rate = Math.min(14, 1.7 + r.time / 30) * DIFF.spawn;
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < 280) spawn(pickType()); }
    if (r.time >= nextSwarm) {
      nextSwarm += 60;
      var n = 18 + Math.floor(r.time / 60) * 6;
      var type = r.time < 150 ? "slug" : (r.time < 300 ? "wasp" : (r.time < 480 ? "spider" : "beetle"));
      var R = Math.hypot(W, H) / 2 + 8;
      for (var i = 0; i < n; i++) spawn(type, i / n * TAU, R);
      banner("Une nuée approche !");
    }
    if (r.time >= nextBoss) {
      nextBoss += 180;
      var bt = bossCount % 2 === 0 ? "boar" : "owl";
      spawn(bt);
      bossCount++;
      banner(bt === "boar" ? "Le Grand Sanglier charge !" : "Le Hibou Ancien s'éveille !");
      SND.boom();
    }
  }

  /* =====================================================================
     Dégâts, morts, butin
     ===================================================================== */
  function hurt(e, dmg, kx, ky) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg * p.might * (0.9 + Math.random() * 0.2)));
    e.hp -= dmg; e.flash = 0.1;
    var kb = e.d.boss ? 0.12 : 1;
    e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    if (S.opts.numbers && texts.length < 60) texts.push({ x: e.x + (Math.random() * 6 - 3), y: e.y - e.d.r - 6, n: dmg, life: 0.6 });
    if (e.hp <= 0) kill(e);
  }
  function drop(kind, x, y, v) { gems.push({ x: x, y: y, kind: kind, v: v || 0 }); }
  function kill(e) {
    e.dead = true; r.kills++;
    burst(e.x, e.y, e.d.color, e.d.boss ? 30 : 6);
    if (e.d.boss) {
      r.bosses++; S.stats.bosses++;
      drop("chest", e.x, e.y);
      for (var i = 0; i < 6; i++) drop("gold", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 2);
      for (i = 0; i < 10; i++) drop("xp", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 5);
      return;
    }
    var L = p.luck;
    if (Math.random() < 0.012 * L) drop("berry", e.x, e.y);
    else if (Math.random() < 0.025 * L) drop("gold", e.x, e.y, 1);
    else if (Math.random() < 0.0025 * L) drop("magnet", e.x, e.y);
    if (gems.length > 450) { var g = gems[(Math.random() * gems.length) | 0]; if (g.kind === "xp") { g.v += e.d.xp; return; } }
    drop("xp", e.x, e.y, e.d.xp);
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 20 + Math.random() * 50;
      fx.push({ kind: "dot", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color: color });
    }
  }
  function damagePlayer(dmg) {
    if (p.inv > 0) return;
    p.hp -= Math.max(1, dmg - p.armor); p.inv = 0.6; r.lastHit = r.time;
    if (S.opts.shake) shake = 0.25;
    SND.hurt(); burst(p.x, p.y, "#c8553d", 5);
  }

  /* =====================================================================
     Armes
     ===================================================================== */
  function nearest(n, range) {
    var best = [], r2 = range * range;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead) continue;
      var d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
      if (d > r2) continue;
      if (best.length < n) { best.push([d, e]); best.sort(function (a, b) { return a[0] - b[0]; }); }
      else if (d < best[n - 1][0]) { best[n - 1] = [d, e]; best.sort(function (a, b) { return a[0] - b[0]; }); }
    }
    return best.map(function (b) { return b[1]; });
  }
  function shoot(o) { o.hit = []; o.r = o.r || 4; o.life = o.life || 1.4; projs.push(o); }
  function timer(id, cd, dt) {
    p.timers[id] = (p.timers[id] === undefined ? 0.3 : p.timers[id]) - dt;
    if (p.timers[id] <= 0) { p.timers[id] = cd * p.cdMul; return true; }
    return false;
  }
  function wl(id) { return (p.weapons[id] || 1) - 1; }
  var WP = D.WEAPONS;

  function weapons(dt) {
    var w, L, i;
    if (p.weapons.gland) {
      w = WP.gland; L = wl("gland");
      if (timer("gland", w.cd[L], dt)) {
        var t = nearest(w.count[L], 135);
        for (i = 0; i < w.count[L]; i++) {
          var tg = t[i % Math.max(1, t.length)];
          var a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : (p.face > 0 ? 0 : Math.PI);
          if (!tg || i >= t.length) a += (i - (w.count[L] - 1) / 2) * 0.25;
          shoot({ x: p.x, y: p.y - 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: w.dmg[L], pierce: w.pierce[L], kind: "acorn", life: 1.2 });
        }
      }
    }
    if (p.weapons.queue) {
      w = WP.queue; L = wl("queue");
      if (timer("queue", w.cd[L], dt)) {
        var dirs = w.both[L] ? [1, -1] : [p.face], R = w.r[L], qd = w.dmg[L];
        dirs.forEach(function (dir) {
          fx.push({ kind: "swipe", dir: dir, r: R, life: 0.18, max: 0.18 });
          near(p.x + dir * R / 2, p.y, R + 10, function (e) {
            var dx = e.x - p.x, dy = e.y - p.y;
            if (dx * dir < -4 || Math.hypot(dx, dy) > R + e.d.r || Math.abs(dy) > R * 0.8 + e.d.r) return;
            hurt(e, qd, dir * 90, dy * 1.5);
          });
        });
        SND.whip();
      }
    }
    if (p.weapons.champi) {
      w = WP.champi; L = wl("champi");
      orbAngle += w.spd[L] * dt;
      var cdmg = w.dmg[L];
      for (var j = 0; j < w.n[L]; j++) {
        var oa = orbAngle + j / w.n[L] * TAU;
        var ox = p.x + Math.cos(oa) * w.R[L], oy = p.y + Math.sin(oa) * w.R[L] * 0.8;
        near(ox, oy, 14, function (e) {
          if (e.orb > r.time || Math.hypot(e.x - ox, e.y - oy) > 5 + e.d.r) return;
          e.orb = r.time + 0.45;
          hurt(e, cdmg, (e.x - p.x) * 1.2, (e.y - p.y) * 1.2);
        });
      }
    }
    if (p.weapons.feuilles) {
      w = WP.feuilles; L = wl("feuilles");
      if (timer("feuilles", w.cd[L], dt)) {
        leafRot += 0.45;
        for (var m = 0; m < w.n[L]; m++) {
          var la = leafRot + m / w.n[L] * TAU;
          shoot({ x: p.x, y: p.y, vx: Math.cos(la) * 105, vy: Math.sin(la) * 105, dmg: w.dmg[L], pierce: w.pierce[L], kind: "leaf", life: 1.1 });
        }
      }
    }
    if (p.weapons.pomme) {
      w = WP.pomme; L = wl("pomme");
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
      w = WP.spores; L = wl("spores");
      sporeTick -= dt;
      var tick = sporeTick <= 0;
      if (tick) sporeTick = 0.5;
      var SR = w.R[L], sdmg = w.dmg[L], slow = w.slow[L];
      near(p.x, p.y, SR + 12, function (e) {
        if (Math.hypot(e.x - p.x, (e.y - p.y) * 1.25) > SR + e.d.r) return;
        e.slowT = 0.3; e.slow = e.d.boss ? slow / 3 : slow;
        if (tick) hurt(e, sdmg, 0, 0);
      });
    }
    if (p.weapons.plume) {
      w = WP.plume; L = wl("plume");
      if (timer("plume", w.cd[L], dt)) {
        var ft = nearest(w.n[L], 180);
        for (i = 0; i < w.n[L]; i++) {
          var fe = ft[i];
          var fa = fe ? Math.atan2(fe.y - p.y, fe.x - p.x) : (p.face > 0 ? 0 : Math.PI) + (i - (w.n[L] - 1) / 2) * 0.6;
          shoot({ x: p.x, y: p.y, vx: Math.cos(fa), vy: Math.sin(fa), dmg: w.dmg[L], pierce: 999, kind: "plume",
                  life: 4, range: w.range[L], dist: 0, back: false, rehit: {} });
        }
      }
    }
    if (p.weapons.lucioles) {
      w = WP.lucioles; L = wl("lucioles");
      if (timer("lucioles", w.cd[L], dt)) {
        var starts = nearest(10, 150);
        for (var bI = 0; bI < w.bolts[L] && starts.length; bI++) {
          var cur = starts.splice((Math.random() * starts.length) | 0, 1)[0];
          var pts = [[p.x, p.y - 4]], hitIds = [];
          for (var c = 0; c < w.chain[L] && cur; c++) {
            pts.push([cur.x, cur.y]); hitIds.push(cur.id);
            hurt(cur, w.dmg[L], 0, 0);
            cur = chainNext(cur, hitIds);
          }
          fx.push({ kind: "bolt", pts: pts, life: 0.16, max: 0.16 });
        }
        SND.zap();
      }
    }
  }
  function chainNext(from, hitIds) {
    var nx = null, nd = 55 * 55;
    near(from.x, from.y, 55, function (e) {
      if (hitIds.indexOf(e.id) >= 0) return;
      var dd = (e.x - from.x) * (e.x - from.x) + (e.y - from.y) * (e.y - from.y);
      if (dd < nd) { nd = dd; nx = e; }
    });
    return nx;
  }

  /* =====================================================================
     Montée de niveau
     ===================================================================== */
  function weaponAvailable(id) { return !D.WEAPONS[id].unlock || has(D.WEAPONS[id].unlock) || p.weapons[id]; }
  function choices(n) {
    var pool = [];
    var nW = Object.keys(p.weapons).length, nP = Object.keys(p.passives).length;
    Object.keys(D.WEAPONS).forEach(function (k) {
      var l = p.weapons[k] || 0;
      if (l >= 5 || (!l && nW >= 4) || !weaponAvailable(k)) return;
      pool.push({ type: "w", id: k, lvl: l + 1, weight: l ? 3 : 2 });
    });
    Object.keys(D.PASSIVES).forEach(function (k) {
      var l = p.passives[k] || 0;
      if (l >= 5 || (!l && nP >= 4)) return;
      pool.push({ type: "p", id: k, lvl: l + 1, weight: l ? 2 : 1.5 });
    });
    var out = [];
    while (out.length < n && pool.length) {
      var total = pool.reduce(function (s, c) { return s + c.weight; }, 0), x = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { x -= pool[i].weight; if (x <= 0 || i === pool.length - 1) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (!out.length) out = [{ type: "heal" }, { type: "gold" }];
    return out;
  }
  var currentChoices = [];
  function openLevelUp() {
    state = "levelup";
    clearInput();
    currentChoices = choices(3 + (p.luck > 1.3 && Math.random() < 0.3 ? 1 : 0));
    var html = '<span class="kicker">Niveau ' + r.level + " !</span><h2>Choisis un pouvoir</h2><div class=\"choices\">";
    currentChoices.forEach(function (c, i) {
      var icon, name, lvl = "", desc;
      if (c.type === "w") {
        icon = '<img src="' + spriteUrl(D.WEAPONS[c.id].icon) + '" alt="">'; name = D.WEAPONS[c.id].name;
        lvl = c.lvl === 1 ? "Nouvelle arme" : "Niv. " + c.lvl; desc = D.WEAPONS[c.id].desc[c.lvl - 1];
      } else if (c.type === "p") {
        icon = '<img src="' + spriteUrl(D.PASSIVES[c.id].sprite) + '" alt="">'; name = D.PASSIVES[c.id].name;
        lvl = c.lvl === 1 ? "Nouveau bonus" : "Niv. " + c.lvl; desc = D.PASSIVES[c.id].desc;
      } else if (c.type === "heal") {
        icon = '<span class="emoji">🍓</span>'; name = "Panier de baies"; desc = "Soigne 40 PV.";
      } else {
        icon = '<img src="' + spriteUrl("gold") + '" alt="">'; name = "Bourse de glands"; desc = "+15 glands d'or.";
      }
      html += '<button type="button" class="choice" data-choice="' + i + '"><span class="choice-key">' + (i + 1) + "</span>" +
        '<span class="choice-icon">' + icon + "</span>" +
        '<span class="choice-text"><strong>' + esc(name) + "</strong>" + (lvl ? "<em>" + lvl + "</em>" : "") + "<span>" + esc(desc) + "</span></span></button>";
    });
    html += '</div><div class="btn-row center">';
    if (r.rerolls > 0) html += '<button class="btn btn-alt btn-small" type="button" data-action="reroll">🎲 Relancer (' + r.rerolls + ")</button>";
    html += '<button class="btn btn-ghost btn-small" type="button" data-action="skip">Passer (+3 ' + goldIc() + ")</button></div>";
    showCard(html, "levelup");
    SND.level();
  }
  function apply(c) {
    if (state !== "levelup" || !c) return;
    if (c.type === "w") p.weapons[c.id] = c.lvl;
    else if (c.type === "p") { p.passives[c.id] = c.lvl; if (c.id === "appetit") p.hp += 20; }
    else if (c.type === "heal") p.hp += 40;
    else addGold(15);
    calc();
    r.nWeapons = Object.keys(p.weapons).length; r.nPassives = Object.keys(p.passives).length;
    r.maxedWeapon = r.maxedWeapon || Object.keys(p.weapons).some(function (k) { return p.weapons[k] >= 5; });
    afterChoice();
  }
  function afterChoice() {
    pending = Math.max(0, pending - 1);
    renderBuild();
    if (pending > 0) openLevelUp();
    else { state = "play"; hideCard(); last = performance.now(); }
  }
  function addGold(n) { r.gold += n * p.goldMul; }
  function renderBuild() {}

  /* =====================================================================
     Succès
     ===================================================================== */
  var EMPTY_RUN = { time: 0, kills: 0, level: 0, bosses: 0, berries: 0, lastHit: 0 };
  function totals(run) {
    var s = S.stats;
    return { kills: s.kills + (run && !run.committed ? run.kills : 0), goldEarned: s.goldEarned, played: s.played, bought: s.bought };
  }
  function checkAchievements(run) {
    var t = totals(run), got = [];
    D.ACHIEVEMENTS.forEach(function (a) {
      if (S.ach[a.id]) return;
      var ok = false;
      try { ok = a.check(run || EMPTY_RUN, t); } catch (e) {}
      if (!ok) return;
      S.ach[a.id] = Date.now();
      S.gold += a.gold; S.stats.goldEarned += a.gold;
      got.push(a);
      if (run) run.newAch.push(a);
      toast(a);
    });
    if (got.length) { save(); SND.ach(); }
    return got;
  }
  function unlocksOf(id) {
    var out = [];
    D.CHARACTERS.forEach(function (c) { if (c.unlock === id) out.push(c.name + " (" + c.animal.toLowerCase() + ")"); });
    Object.keys(D.WEAPONS).forEach(function (k) { if (D.WEAPONS[k].unlock === id) out.push("l'arme " + D.WEAPONS[k].name); });
    D.SHOP.forEach(function (s) { if (s.unlock === id) out.push("l'amélioration " + s.name); });
    Object.keys(D.DIFFICULTIES).forEach(function (k) { if (D.DIFFICULTIES[k].unlock === id) out.push("le mode " + D.DIFFICULTIES[k].name); });
    return out;
  }
  function toast(a) {
    var box = $("[data-toasts]");
    var el = document.createElement("div");
    el.className = "game-toast";
    var un = unlocksOf(a.id);
    el.innerHTML = "<strong>🏆 " + esc(a.name) + "</strong><span>+" + a.gold + " " + goldIc() + (un.length ? " · Débloque " + esc(un.join(", ")) : "") + "</span>";
    box.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 3600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4200);
  }

  /* =====================================================================
     Mise à jour
     ===================================================================== */
  function update(dt) {
    r.time += dt;
    var v = inputVector();
    p.x += v.x * p.speed * dt; p.y += v.y * p.speed * dt;
    p.moving = Math.abs(v.x) + Math.abs(v.y) > 0.05;
    if (v.x > 0.1) p.face = 1; else if (v.x < -0.1) p.face = -1;
    p.anim += dt * (p.moving || SPR[CH.sprite].flying ? 8 : 0);
    p.inv -= dt;
    if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    director(dt);
    buildGrid();
    weapons(dt);

    var i, e, boss = null;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      var dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      var sp = e.spd * (e.slowT > 0 ? 1 - e.slow : 1);
      e.slowT -= dt; e.flash -= dt; e.anim += dt * (e.type === "wasp" ? 14 : 5);
      var mx = dx / d, my = dy / d;
      if (e.type === "wasp" || e.type === "spider") { var s = Math.sin(r.time * (e.type === "wasp" ? 6 : 3) + e.phase) * 0.7; var px = -my * s, py = mx * s; mx += px; my += py; }
      if (e.type === "boar") {
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 135; }
        else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.9; e.cx = dx / d; e.cy = dy / d; SND.boom(); } }
        else { e.cd -= dt; if (e.cd <= 0 && d < 170) { e.windup = 0.6; e.cd = 3.5; } }
      } else if (e.type === "owl") {
        if (d < 70) { var tx = -mx * 0.6 - my * 0.8, ty = -my * 0.6 + mx * 0.8; mx = tx; my = ty; }
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 3.2;
          var n = 10 + bossCount * 2, off = Math.random();
          for (var k = 0; k < n; k++) { var a = off + k / n * TAU; hostile.push({ x: e.x, y: e.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, life: 4, dmg: 12 }); }
          SND.whip();
        }
      }
      if (e.d.boss && !boss) boss = e;
      e.x += mx * sp * dt + e.kx * dt; e.y += my * sp * dt + e.ky * dt;
      var damp = Math.pow(0.0005, dt); e.kx *= damp; e.ky *= damp;
      if (Math.abs(mx) > 0.1) e.face = mx > 0 ? 1 : -1;
      if (Math.abs(dx) < e.d.r + 5 && Math.abs(dy) < e.d.r + 5) damagePlayer(e.d.dmg);
      if (d > 420 && !e.d.boss) { var ra = Math.atan2(dy, dx) + (Math.random() - 0.5), R = Math.hypot(W, H) / 2 + 10; e.x = p.x + Math.cos(ra) * R; e.y = p.y + Math.sin(ra) * R; }
    }
    // séparation légère
    grid.forEach(function (cell) {
      for (var a = 0; a < cell.length; a++) for (var b = a + 1; b < cell.length; b++) {
        var A = cell[a], B = cell[b], sx = B.x - A.x, sy = B.y - A.y, dd = Math.hypot(sx, sy), min = A.d.r + B.d.r - 2;
        if (dd > 0 && dd < min) {
          var push = (min - dd) / dd;
          var wa = A.d.boss === B.d.boss ? 0.5 : (A.d.boss ? 0 : 1), wb = 1 - wa;
          A.x -= sx * push * wa; A.y -= sy * push * wa; B.x += sx * push * wb; B.y += sy * push * wb;
        }
      }
    });
    // projectiles ennemis
    for (i = hostile.length - 1; i >= 0; i--) {
      var hq = hostile[i];
      hq.x += hq.vx * dt; hq.y += hq.vy * dt; hq.life -= dt;
      if (Math.abs(hq.x - p.x) < 5 && Math.abs(hq.y - p.y) < 6) { damagePlayer(hq.dmg); hq.life = 0; }
      if (hq.life <= 0) hostile.splice(i, 1);
    }
    if (p.hp <= 0) {
      if (r.revives > 0) {
        r.revives--; p.hp = p.maxHp * 0.5; p.inv = 2;
        near(p.x, p.y, 70, function (en) { var ax = en.x - p.x, ay = en.y - p.y, ad = Math.hypot(ax, ay) || 1; en.kx += ax / ad * 260; en.ky += ay / ad * 260; });
        hostile = [];
        burst(p.x, p.y, "#f29a85", 24); banner("Renaissance !"); SND.level();
      } else { gameOver(); return; }
    }

    // projectiles
    for (i = projs.length - 1; i >= 0; i--) {
      var q = projs[i];
      if (q.kind === "plume") updatePlume(q, dt);
      else {
        q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
        near(q.x, q.y, 16, function (en) {
          if (q.pierce <= 0 || q.hit.indexOf(en.id) >= 0) return;
          if (Math.abs(en.x - q.x) > en.d.r + q.r || Math.abs(en.y - q.y) > en.d.r + q.r) return;
          q.hit.push(en.id); q.pierce--;
          hurt(en, q.dmg, q.vx * 0.5, q.vy * 0.5);
          if (q.pierce <= 0) return false;
        });
      }
      if (q.life <= 0 || q.pierce <= 0) projs.splice(i, 1);
    }
    // pommes de pin
    for (i = lobs.length - 1; i >= 0; i--) {
      var l = lobs[i]; l.t += dt;
      if (l.t >= l.dur) { explode(l); lobs.splice(i, 1); }
    }
    enemies = enemies.filter(function (en) { return !en.dead; });
    curBoss = boss && !boss.dead ? boss : null;

    // ramassage
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], gx = p.x - g.x, gy = p.y - g.y, gd = Math.hypot(gx, gy);
      if (gd > 0.5 && (g.pull || gd < p.magnet)) {
        g.pull = (g.pull || 60) + 260 * dt;
        var stp = Math.min(gd, g.pull * dt);
        g.x += gx / gd * stp; g.y += gy / gd * stp;
      }
      if (gd < 7) {
        if (g.kind === "xp") { xp += g.v * p.xpMul; SND.pick(); }
        else if (g.kind === "gold") { addGold(g.v); SND.gold(); }
        else if (g.kind === "berry") { p.hp = Math.min(p.maxHp, p.hp + 25); r.berries++; SND.level(); }
        else if (g.kind === "magnet") { gems.forEach(function (o) { if (o.kind === "xp" || o.kind === "gold") o.pull = 120; }); SND.level(); }
        else if (g.kind === "chest") { pending++; addGold(15); burst(p.x, p.y, "#f2c230", 16); }
        gems.splice(i, 1);
      } else if (gd > 600 && g.kind !== "chest") gems.splice(i, 1);
    }
    while (xp >= xpNext) { xp -= xpNext; r.level++; pending++; xpNext = need(r.level); }

    for (i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.life -= dt;
      if (f.kind === "dot") { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (f.life <= 0) fx.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 18 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    shake = Math.max(0, shake - dt);

    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(r); }

    if (pending > 0) openLevelUp();
  }
  function updatePlume(q, dt) {
    var spd;
    if (!q.back) {
      spd = Math.max(40, 170 * (1 - q.dist / q.range));
      q.x += q.vx * spd * dt; q.y += q.vy * spd * dt; q.dist += spd * dt;
      if (q.dist >= q.range * 0.95) { q.back = true; q.dist = 0; }
    } else {
      spd = Math.min(220, 60 + q.dist * 1.5);
      var bx = p.x - q.x, by = p.y - q.y, bd = Math.hypot(bx, by) || 1;
      q.x += bx / bd * spd * dt; q.y += by / bd * spd * dt; q.dist += spd * dt;
      if (bd < 6) q.life = 0;
    }
    q.life -= dt;
    near(q.x, q.y, 16, function (en) {
      if ((q.rehit[en.id] || 0) > r.time) return;
      if (Math.abs(en.x - q.x) > en.d.r + 4 || Math.abs(en.y - q.y) > en.d.r + 4) return;
      q.rehit[en.id] = r.time + 0.35;
      hurt(en, q.dmg, q.vx * 40, q.vy * 40);
    });
  }
  function explode(l) {
    fx.push({ kind: "ring", x: l.tx, y: l.ty, r: l.rad, life: 0.25, max: 0.25 });
    burst(l.tx, l.ty, "#e8873a", 8);
    near(l.tx, l.ty, l.rad + 12, function (en) {
      var ddx = en.x - l.tx, ddy = en.y - l.ty;
      if (Math.hypot(ddx, ddy) <= l.rad + en.d.r) hurt(en, l.dmg, ddx * 3, ddy * 3);
    });
    SND.boom();
  }

  /* =====================================================================
     Dessin
     ===================================================================== */
  function hash(x, y) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  var GROUND = {
    day: { base: "#7fa95a", patch: "#76a052", tuft: "#5b8a4a", hi: "#a6cf74", flowers: ["#fdf3de", "#f2b05e", "#c8553d", "#f6d36b"], pebble: "#b9ae96", pebbleDk: "#8a806c", shroom: "#c8553d" },
    night: { base: "#264634", patch: "#22402f", tuft: "#1b3326", hi: "#3f6b3a", flowers: ["#7fd1c7", "#c9b3ff", "#f2d48a", "#7fd1c7"], pebble: "#4b5a52", pebbleDk: "#33403a", shroom: "#7fd1c7" },
  };
  function drawGround(cx, cy, night) {
    var G = night ? GROUND.night : GROUND.day, T = 16;
    ctx.fillStyle = G.base; ctx.fillRect(0, 0, W, H);
    var tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(W / T) + 2, ty1 = ty0 + Math.ceil(H / T) + 2;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var sx = Math.round(tx * T - cx), sy = Math.round(ty * T - cy);
      if (hash(tx >> 2, ty >> 2) % 3 === 0) { ctx.fillStyle = G.patch; ctx.fillRect(sx, sy, T, T); }
      var h = hash(tx, ty), k = h % 23, ox = (h >>> 8) % 12, oy = (h >>> 12) % 12;
      if (k < 5) {
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox, sy + oy, 1, 2); ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 3); ctx.fillRect(sx + ox + 4, sy + oy, 1, 2);
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 1);
      } else if (k < 7) {
        ctx.fillStyle = G.flowers[(h >>> 16) % 4];
        ctx.fillRect(sx + ox + 1, sy + oy, 1, 1); ctx.fillRect(sx + ox, sy + oy + 1, 3, 1); ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 1);
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox + 1, sy + oy + 3, 1, 2);
      } else if (k === 7) {
        ctx.fillStyle = G.pebbleDk; ctx.fillRect(sx + ox, sy + oy + 1, 5, 2);
        ctx.fillStyle = G.pebble; ctx.fillRect(sx + ox + 1, sy + oy, 3, 2);
      } else if (k === 8 && (h >>> 20) % 3 === 0) {
        ctx.fillStyle = G.shroom; ctx.fillRect(sx + ox, sy + oy, 3, 1); ctx.fillRect(sx + ox - 1, sy + oy + 1, 5, 1);
        ctx.fillStyle = "#f3e1c0"; ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 2);
      } else if (k < 12) {
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox, sy + oy, 1, 1);
      }
    }
  }
  function blit(s, x, y, flip, white) {
    ctx.drawImage(white ? (flip ? s.wf : s.wc) : (flip ? s.f : s.c), Math.round(x - s.w / 2), Math.round(y - s.h / 2));
  }
  function shadow(x, y, w) {
    ctx.fillStyle = "rgba(20,30,15,.25)";
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
    ctx.fillRect(Math.round(x - w / 2 + 1), Math.round(y - 1), Math.max(1, Math.round(w - 2)), 4);
  }
  function drawHero(sprName, x, y, face, moving, anim, inv) {
    var frames = SPR[sprName], fly = frames.flying;
    var frame = (moving || fly) ? ((anim | 0) % frames.length) : 0, s = frames[frame];
    var lift = fly ? 6 + Math.sin(anim * 0.8) * 1.5 : 0;
    shadow(x, y + 6, fly ? 8 : 10);
    if (inv > 0 && ((inv * 20) | 0) % 2) return;
    blit(s, x, y - lift - (moving && !fly && frame ? 1 : 0), face < 0);
  }

  function draw() {
    var night = document.documentElement.dataset.theme === "dark";
    var sx = shake > 0 ? (Math.random() * 4 - 2) : 0, sy = shake > 0 ? (Math.random() * 4 - 2) : 0;
    var cx = Math.round(p.x - W / 2 + sx), cy = Math.round(p.y - H / 2 + sy);
    drawGround(cx, cy, night);
    ctx.save();
    ctx.translate(-cx, -cy);

    var bob = Math.sin(r.time * 4);
    gems.forEach(function (g) {
      var s = g.kind === "xp" ? (g.v >= 3 ? SPR.bignut[0] : SPR.nut[0]) : SPR[g.kind][0];
      blit(s, g.x, g.y + (g.kind === "chest" || g.kind === "magnet" ? bob * 1.5 : 0));
    });

    if (p.weapons.spores) {
      var SR = WP.spores.R[wl("spores")];
      ctx.fillStyle = night ? "rgba(201,179,255,.12)" : "rgba(122,90,190,.12)";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, SR, SR * 0.8, 0, 0, TAU); ctx.fill();
      for (var s = 0; s < 10; s++) {
        var a = r.time * 0.8 + s / 10 * TAU, rr = SR * (0.55 + 0.4 * Math.sin(r.time * 2 + s));
        blit(SPR.spore[0], p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.8);
      }
    }

    enemies.sort(function (a, b) { return a.y - b.y; });
    var drewPlayer = false;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!drewPlayer && e.y > p.y) { drawHero(CH.sprite, p.x, p.y, p.face, p.moving, p.anim, p.inv); drewPlayer = true; }
      if (e.x < cx - 30 || e.x > cx + W + 30 || e.y < cy - 30 || e.y > cy + H + 30) continue;
      var spr = e.spr[(e.anim | 0) % e.spr.length];
      if (!e.spr.flying) shadow(e.x, e.y + spr.h / 2 - 2, spr.w * 0.7);
      else shadow(e.x, e.y + spr.h / 2 + 3, spr.w * 0.5);
      blit(spr, e.x, e.y, e.face < 0, e.flash > 0);
      if (e.slowT > 0 && !e.d.boss) { ctx.fillStyle = "rgba(160,130,230,.7)"; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - spr.h / 2 - 2), 2, 2); }
    }
    if (!drewPlayer) drawHero(CH.sprite, p.x, p.y, p.face, p.moving, p.anim, p.inv);

    var hb = 16;
    ctx.fillStyle = OUT; ctx.fillRect(Math.round(p.x - hb / 2 - 1), Math.round(p.y + 9), hb + 2, 4);
    ctx.fillStyle = "#4a2e1c"; ctx.fillRect(Math.round(p.x - hb / 2), Math.round(p.y + 10), hb, 2);
    ctx.fillStyle = p.hp / p.maxHp > 0.3 ? "#9cc56b" : "#c8553d";
    ctx.fillRect(Math.round(p.x - hb / 2), Math.round(p.y + 10), Math.max(0, Math.round(hb * p.hp / p.maxHp)), 2);

    if (p.weapons.champi) {
      var w = WP.champi, L = wl("champi");
      for (var j = 0; j < w.n[L]; j++) {
        var oa = orbAngle + j / w.n[L] * TAU;
        blit(SPR.mushroom[0], p.x + Math.cos(oa) * w.R[L], p.y + Math.sin(oa) * w.R[L] * 0.8);
      }
    }
    var flick = ((r.time * 12) | 0) % 2;
    projs.forEach(function (q) {
      if (q.kind === "leaf") blit(SPR.leaf[flick], q.x, q.y);
      else if (q.kind === "plume") blit(SPR.feather[flick], q.x, q.y);
      else blit(SPR.acorn[0], q.x, q.y, q.vx < 0);
    });
    hostile.forEach(function (q) { blit(SPR.feather[flick], q.x, q.y); });
    lobs.forEach(function (l) {
      var k = l.t / l.dur, x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k - Math.sin(k * Math.PI) * 30;
      shadow(l.sx + (l.tx - l.sx) * k, l.sy + (l.ty - l.sy) * k + 3, 5);
      blit(SPR.pinecone[0], x, y);
    });
    fx.forEach(drawFx);
    texts.forEach(function (t) { ctx.globalAlpha = Math.min(1, t.life * 3); drawNum(t.n, t.x, t.y, "#fdf3de"); });
    ctx.globalAlpha = 1;
    ctx.restore();

    var dusk = Math.min(0.28, r.time / 1500);
    if (dusk > 0.01) { ctx.fillStyle = "rgba(20,15,50," + dusk + ")"; ctx.fillRect(0, 0, W, H); }
    drawHud();

    if (joy.active) {
      ctx.fillStyle = "rgba(253,243,222,.18)"; ctx.strokeStyle = "rgba(253,243,222,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(232,135,58,.85)";
      ctx.beginPath(); ctx.arc(joy.x, joy.y, 9, 0, TAU); ctx.fill();
    }
  }
  function drawFx(f) {
    if (f.kind === "dot") { ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
    else if (f.kind === "ring") {
      var k = 1 - f.life / f.max;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - k) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6) * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(255,226,122," + (0.35 * (1 - k)) + ")"; ctx.fill();
    } else if (f.kind === "swipe") {
      var t = 1 - f.life / f.max, st = f.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - t) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, f.r * 0.85, f.r * 0.7, 0, st, st + Math.PI * f.dir * Math.min(1, t * 2.5), f.dir < 0); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - t) + ")"; ctx.lineWidth = 1; ctx.stroke();
    } else if (f.kind === "bolt") {
      var al = Math.max(0, f.life / f.max);
      [["rgba(246,239,122," + al + ")", 3], ["rgba(255,255,240," + al + ")", 1]].forEach(function (st2) {
        ctx.strokeStyle = st2[0]; ctx.lineWidth = st2[1]; ctx.beginPath();
        f.pts.forEach(function (pt, idx) {
          if (!idx) { ctx.moveTo(pt[0], pt[1]); return; }
          var pr = f.pts[idx - 1];
          ctx.lineTo((pr[0] + pt[0]) / 2 + (hash(idx, pt[0] | 0) % 9 - 4), (pr[1] + pt[1]) / 2 + (hash(pt[1] | 0, idx) % 9 - 4));
          ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
      });
    }
  }

  /* ---------- HUD dessiné dans le jeu ---------- */
  function box(x, y, w, h, fill, line) {
    ctx.fillStyle = line || OUT; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  function icon(name, cx, cy) { if (SPR[name]) blit(SPR[name][0], cx, cy); }
  function drawSlots(x, y, list, max, sprOf) {
    var S2 = 12;
    for (var i = 0; i < max; i++) {
      var bx = x + i * (S2 + 1);
      var it = list[i];
      box(bx, y, S2, S2, it ? "#1f3a2b" : "rgba(31,58,43,.45)", it ? OUT : "rgba(43,23,9,.6)");
      if (it) {
        icon(sprOf(it[0]), bx + S2 / 2, y + S2 / 2);
        if (it[1] >= 5) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(bx + 1, y + S2 - 2, S2 - 2, 1); }
        drawText(String(it[1]), bx + S2 - 1, y + S2 - 4, it[1] >= 5 ? "#f6d36b" : "#fdf3de", "c");
      } else {
        ctx.fillStyle = "rgba(253,243,222,.35)"; ctx.fillRect(bx + 5, y + 5, 2, 2);
      }
    }
  }
  function drawHud() {
    // barre d'expérience + niveau
    var bw = W - 4, ratio = Math.max(0, Math.min(1, xp / xpNext));
    box(2, 2, bw, 9, "#3a2618");
    ctx.fillStyle = "#e0a82a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 7);
    ctx.fillStyle = "#ffe27a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 2);
    drawText("NIV " + r.level, W / 2, 4, "#fdf3de", "c");
    // chrono
    drawText(fmtTime(r.time), W / 2, 15, "#fdf3de", "c", 2);
    // ennemis tués et or
    var k = String(r.kills), g = String(Math.floor(r.gold));
    var line = 7 + textWidth(k) + 8 + 7 + textWidth(g), lx = Math.round(W / 2 - line / 2), ly = 30;
    icon("skull", lx + 3, ly + 2); drawText(k, lx + 7, ly, "#fdf3de", "l");
    var gx = lx + 7 + textWidth(k) + 8;
    icon("gold", gx + 3, ly + 2); drawText(g, gx + 7, ly, "#ffe27a", "l");
    // cases d'armes et de bonus (libres / prises)
    var wl2 = Object.keys(p.weapons).map(function (id) { return [id, p.weapons[id]]; });
    var pl2 = Object.keys(p.passives).map(function (id) { return [id, p.passives[id]]; });
    drawSlots(2, 14, wl2, 4, function (id) { return D.WEAPONS[id].icon; });
    drawSlots(2, 27, pl2, 4, function (id) { return D.PASSIVES[id].sprite; });
    // PV (coin gauche, sous les cases)
    var hpw = 51, hpr = Math.max(0, p.hp / p.maxHp);
    box(2, 40, hpw, 6, "#3a2618");
    ctx.fillStyle = hpr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(3, 41, Math.round((hpw - 2) * hpr), 4);
    // boss
    if (curBoss) {
      var bb = Math.min(140, W - 24), bx = Math.round(W / 2 - bb / 2), by = H - 12;
      drawText(curBoss.d.name, W / 2, by - 8, "#f6d36b", "c");
      box(bx, by, bb, 7, "#3a2618");
      ctx.fillStyle = "#c8553d"; ctx.fillRect(bx + 1, by + 1, Math.round((bb - 2) * Math.max(0, curBoss.hp / curBoss.maxHp)), 5);
    }
  }

  // fond des menus : le perso choisi court, des bestioles passent
  var parade = [];
  function drawIdle(now) {
    var t = now / 1000, night = document.documentElement.dataset.theme === "dark";
    drawGround(Math.round(t * 18), Math.round(Math.sin(t * 0.2) * 20), night);
    if (parade.length < 6 && Math.random() < 0.01) {
      var types = ["slug", "beetle", "wasp", "spider", "crow"];
      parade.push({ spr: SPR[types[(Math.random() * types.length) | 0]], x: W + 20, y: H * (0.15 + Math.random() * 0.75), v: 8 + Math.random() * 12, a: Math.random() * 2 });
    }
    parade.forEach(function (q) { q.x -= q.v / 60; q.a += 0.08; blit(q.spr[(q.a | 0) % q.spr.length], q.x, q.y, true); });
    parade = parade.filter(function (q) { return q.x > -30; });
    drawHero(charById(S.char).sprite, W / 2, H * 0.8, 1, true, t * 8, 0);
    ctx.fillStyle = night ? "rgba(10,20,15,.35)" : "rgba(30,40,20,.18)";
    ctx.fillRect(0, 0, W, H);
  }

  /* =====================================================================
     HUD
     ===================================================================== */
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function updateHud() {}
  function score() { return Math.round((Math.floor(r.time) * 10 + r.kills + r.bonus) * DIFF.score); }
  function runGold() { return Math.floor((r.kills * 0.1 + r.time / 6 + r.bosses * 30 + r.level) * p.goldMul + r.gold); }

  /* =====================================================================
     Écrans (menus)
     ===================================================================== */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function showCard(html, name) {
    screen = name;
    card.innerHTML = html;
    card.className = "panel game-card game-card-" + name;
    overlay.hidden = false;
    overlay.scrollTop = 0;
    $("[data-hud]").hidden = !(state === "play" || state === "levelup" || state === "pause");
    if (state !== "play" && state !== "levelup") $("[data-toasts]").innerHTML = "";
    setTimeout(function () {
      var f = card.querySelector("[data-autofocus]") || card.querySelector("button:not([disabled])");
      if (f && window.matchMedia("(hover: hover)").matches) f.focus({ preventScroll: true });
    }, 30);
  }
  function hideCard() { overlay.hidden = true; $("[data-hud]").hidden = false; }
  function goldBadge() { return '<p class="gold-badge">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></p>"; }
  function back() { return '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="menu">← Retour</button>'; }
  function shopCost(it, lvl) { return Math.round(it.cost * (1 + lvl) * (1 + lvl * 0.25)); }

  var SCREENS = {
    menu: function () {
      var nAch = Object.keys(S.ach).length;
      return '<div class="menu-title"><img src="' + spriteUrl(charById(S.char).sprite) + '" alt=""><div><span class="kicker">La forêt contre-attaque</span><h2>Écureuil Survivor</h2></div></div>' +
        goldBadge() +
        '<div class="menu-buttons">' +
        '<button class="btn" type="button" data-action="go" data-arg="chars" data-autofocus>▶ Jouer</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="shop">🛒 Améliorations</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="succes">🏆 Succès <small>' + nAch + "/" + D.ACHIEVEMENTS.length + "</small></button>" +
        '<div class="menu-row"><button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="help">❓ Comment jouer</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="options">⚙️ Options</button></div></div>' +
        (S.stats.runs ? '<p class="game-small">Record : ' + S.stats.bestScore.toLocaleString("fr-FR") + " pts · " + fmtTime(S.stats.bestTime) + " de survie · " + S.stats.runs + " partie" + (S.stats.runs > 1 ? "s" : "") + "</p>" : "") +
        '<p class="game-version">' + VERSION + "</p>";
    },
    chars: function () {
      var html = '<div class="screen-head">' + back() + "<h2>Personnage</h2>" + goldBadge() + '</div><div class="char-grid">';
      D.CHARACTERS.forEach(function (c) {
        var ok = charAvailable(c), sel = S.char === c.id;
        var m = c.mods || {}, tags = [];
        if (m.hp) tags.push((m.hp > 0 ? "+" : "") + m.hp + " PV");
        if (m.speed) tags.push((m.speed > 0 ? "+" : "") + Math.round(m.speed * 100) + " % vitesse");
        if (m.might) tags.push("+" + Math.round(m.might * 100) + " % dégâts");
        if (m.armor) tags.push("+" + m.armor + " armure");
        if (m.magnet) tags.push("+" + Math.round(m.magnet * 100) + " % ramassage");
        if (m.cd) tags.push("-" + Math.round(m.cd * 100) + " % recharge");
        if (m.xp) tags.push("+" + Math.round(m.xp * 100) + " % expérience");
        html += '<div class="char-card' + (sel ? " is-selected" : "") + (ok ? "" : " is-locked") + '">' +
          '<button type="button" class="char-pick" ' + (ok ? 'data-action="pick" data-arg="' + c.id + '"' : "disabled") + ' aria-pressed="' + sel + '">' +
          '<span class="char-portrait"><img src="' + spriteUrl(c.sprite) + '" alt="">' + (ok ? "" : "<i>🔒</i>") + "</span>" +
          '<span class="char-name"><strong>' + esc(c.name) + "</strong><small>" + esc(c.animal) + "</small></span></button>" +
          '<p class="char-desc">' + esc(c.desc) + "</p>" +
          '<p class="char-weapon"><img src="' + spriteUrl(D.WEAPONS[c.weapon].icon) + '" alt=""> ' + esc(D.WEAPONS[c.weapon].name) + "</p>" +
          '<p class="char-tags">' + esc(tags.length ? tags.join(" · ") : "Aucun bonus ni malus") + "</p>";
        if (!ok) {
          var a = achById(c.unlock);
          html += '<p class="char-lock">🔒 Succès « ' + esc(a ? a.name : "?") + " » : " + esc(a ? a.desc : "") + "</p>" +
            '<button class="btn btn-small" type="button" data-action="buychar" data-arg="' + c.id + '"' + (S.gold < c.price ? " disabled" : "") + ">ou acheter " + c.price + " " + goldIc() + "</button>";
        }
        html += "</div>";
      });
      html += '</div><div class="diff-row"><span>Difficulté :</span>';
      Object.keys(D.DIFFICULTIES).forEach(function (k) {
        var df = D.DIFFICULTIES[k], ok = has(df.unlock);
        html += '<button type="button" class="chip' + (S.diff === k ? " is-on" : "") + '" ' + (ok ? 'data-action="diff" data-arg="' + k + '"' : 'disabled title="Succès « ' + esc((achById(df.unlock) || {}).name || "") + ' »"') + ">" +
          (ok ? "" : "🔒 ") + esc(df.name) + (df.gold > 1 ? " · or ×" + String(df.gold).replace(".", ",") : "") + "</button>";
      });
      html += '</div><div class="btn-row center"><button class="btn" type="button" data-action="start" data-autofocus>▶ C\'est parti avec ' + esc(charById(S.char).name) + "</button></div>";
      return html;
    },
    shop: function () {
      var html = '<div class="screen-head">' + back() + "<h2>Améliorations</h2>" + goldBadge() + '</div><p class="game-small">Bonus permanents, valables pour toutes tes parties.</p><div class="shop-list">';
      D.SHOP.forEach(function (it) {
        var lvl = S.shop[it.id] || 0, max = lvl >= it.max, ok = has(it.unlock), cost = shopCost(it, lvl);
        var pips = "";
        for (var i = 0; i < it.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
        html += '<div class="shop-item' + (ok ? "" : " is-locked") + '"><span class="shop-ic">' + (ok ? it.icon : "🔒") + "</span>" +
          '<div class="shop-text"><strong>' + esc(it.name) + "</strong><span>" + esc(ok ? it.desc : "Succès « " + ((achById(it.unlock) || {}).name || "?") + " »") + '</span><span class="pips">' + pips + "</span></div>" +
          (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="buy" data-arg="' + it.id + '"' + (!ok || S.gold < cost ? " disabled" : "") + ">" + cost + " " + goldIc() + "</button>") +
          "</div>";
      });
      html += '</div><p class="game-small"><button class="link-btn" type="button" data-action="refund">Rembourser toutes les améliorations</button></p>';
      return html;
    },
    succes: function () {
      var n = Object.keys(S.ach).length;
      var html = '<div class="screen-head">' + back() + '<h2>Succès</h2><p class="gold-badge">🏆 <b>' + n + " / " + D.ACHIEVEMENTS.length + '</b></p></div><div class="ach-list">';
      D.ACHIEVEMENTS.forEach(function (a) {
        var ok = !!S.ach[a.id], un = unlocksOf(a.id);
        html += '<div class="ach' + (ok ? " is-done" : "") + '"><span class="ach-ic">' + (ok ? "🏆" : "🔒") + "</span>" +
          "<div><strong>" + esc(a.name) + "</strong><span>" + esc(a.desc) + "</span>" +
          (un.length ? '<span class="ach-unlock">Débloque ' + esc(un.join(", ")) + "</span>" : "") + "</div>" +
          '<span class="ach-gold">+' + a.gold + " " + goldIc() + "</span></div>";
      });
      return html + "</div>";
    },
    options: function () {
      function tog(k, label) {
        return '<button type="button" class="toggle' + (S.opts[k] ? " is-on" : "") + '" data-action="opt" data-arg="' + k + '" aria-pressed="' + !!S.opts[k] + '"><span>' + label + "</span><b>" + (S.opts[k] ? "Oui" : "Non") + "</b></button>";
      }
      return '<div class="screen-head">' + back() + "<h2>Options</h2></div>" +
        '<div class="opt-list">' + tog("sound", "🔊 Son") + tog("shake", "📳 Tremblement de l'écran") + tog("numbers", "🔢 Chiffres de dégâts") + "</div>" +
        '<p class="game-small"><button class="link-btn danger" type="button" data-action="wipe">Effacer toute ma progression</button></p>';
    },
    help: function () {
      return '<div class="screen-head">' + back() + "<h2>Comment jouer</h2></div><ul class=\"help-list\">" +
        '<li class="ctrl-desk"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd>, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches pour courir. Ou clic maintenu : ton perso suit la souris.</li>' +
        "<li>📱 Sur mobile, pose le doigt n'importe où sur le jeu : un joystick apparaît.</li>" +
        "<li>Tes <strong>armes tirent toutes seules</strong>. Toi, tu esquives.</li>" +
        "<li>Ramasse les <strong>noisettes</strong> pour monter de niveau et choisir une arme ou un bonus (4 armes et 4 bonus max, niveau 5 max).</li>" +
        "<li>Les <strong>baies</strong> soignent, l'<strong>aimant</strong> attire toutes les noisettes, les <strong>glands d'or</strong> se dépensent dans les améliorations.</li>" +
        "<li>Chaque minute, une <strong>nuée</strong> t'encercle. Toutes les 3 minutes, un <strong>boss</strong> arrive et lâche un coffre.</li>" +
        "<li>Les <strong>succès</strong> rapportent de l'or et débloquent des personnages, des armes et le mode Difficile.</li>" +
        "<li><kbd>Échap</kbd> ou <kbd>P</kbd> : pause.</li></ul>";
    },
  };
  function go(name) { state = "menu"; showCard(SCREENS[name](), name); }

  var ACTIONS = {
    go: function (a) { SND.click(); go(a); },
    pick: function (id) { S.char = id; save(); SND.click(); go("chars"); },
    diff: function (k) { S.diff = k; save(); SND.click(); go("chars"); },
    buychar: function (id) {
      var c = charById(id);
      if (S.gold < c.price || charAvailable(c)) return;
      S.gold -= c.price; S.owned[id] = true; S.char = id; save(); SND.ach(); go("chars");
    },
    buy: function (id) {
      var it = D.SHOP.filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      var lvl = S.shop[id] || 0, cost = shopCost(it, lvl);
      if (lvl >= it.max || S.gold < cost || !has(it.unlock)) return;
      S.gold -= cost; S.shop[id] = lvl + 1; S.stats.bought++; save(); SND.gold();
      checkAchievements(null);
      go("shop");
    },
    refund: function () {
      var total = 0;
      D.SHOP.forEach(function (it) { for (var l = 0; l < (S.shop[it.id] || 0); l++) total += shopCost(it, l); });
      if (!total || !window.confirm("Rembourser " + total + " glands d'or et remettre toutes les améliorations à zéro ?")) return;
      S.gold += total; S.shop = {}; save(); go("shop");
    },
    opt: function (k) { S.opts[k] = !S.opts[k]; save(); muteLabel(); SND.click(); go("options"); },
    wipe: function () {
      if (!window.confirm("Effacer toute ta progression (or, améliorations, personnages, succès) ?")) return;
      var keepName = S.name; S = defaults(); S.name = keepName; save(); go("menu");
    },
    start: function () { start(); },
    reroll: function () { if (state !== "levelup" || r.rerolls <= 0) return; r.rerolls--; openLevelUp(); },
    skip: function () { if (state !== "levelup") return; addGold(3); afterChoice(); },
    resume: function () { resume(); },
    restart: function () { start(); },
    quit: function () { if (state === "pause" && window.confirm("Abandonner la partie ? Tu gardes l'or gagné.")) gameOver(true); },
    "opt-pause": function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); state = "play"; pause(); },
    menu: function () { go("menu"); },
  };
  card.addEventListener("click", function (e) {
    var ch = e.target.closest("[data-choice]");
    if (ch) { if (state === "levelup") apply(currentChoices[Number(ch.dataset.choice)]); return; }
    var b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    var fn = ACTIONS[b.dataset.action];
    try { if (fn) fn(b.dataset.arg); } catch (err) { showError(err); }
  });

  /* =====================================================================
     Déroulement d'une partie
     ===================================================================== */
  var last = 0;
  function start() {
    reset();
    S.stats.played[CH.id] = true; save();
    state = "play"; hideCard(); renderBuild();
    curBoss = null;
    $("[data-toasts]").innerHTML = "";
    last = performance.now();
    canvas.focus({ preventScroll: true });
    var rc = stage.getBoundingClientRect(), head = document.querySelector(".site-header");
    var top = head ? head.getBoundingClientRect().bottom : 0;
    if (!document.fullscreenElement && !stage.classList.contains("is-max") && (rc.top < top || rc.bottom > window.innerHeight))
      window.scrollTo({ top: window.scrollY + rc.top - top - 8, behavior: "smooth" });
    sfx(660, 0.1, "square", 0.04);
  }
  function pause() {
    if (state !== "play") return;
    state = "pause"; clearInput();
    var html = '<h2>Pause</h2><div class="pause-grid"><div><h3>Équipement</h3><ul class="build-list">';
    Object.keys(p.weapons).forEach(function (k) { html += '<li><img src="' + spriteUrl(D.WEAPONS[k].icon) + '" alt="">' + esc(D.WEAPONS[k].name) + " <b>niv. " + p.weapons[k] + "</b></li>"; });
    Object.keys(p.passives).forEach(function (k) { html += '<li><img src="' + spriteUrl(D.PASSIVES[k].sprite) + '" alt="">' + esc(D.PASSIVES[k].name) + " <b>niv. " + p.passives[k] + "</b></li>"; });
    html += '</ul></div><div><h3>Statistiques</h3><ul class="stat-list">' +
      "<li>PV <b>" + Math.ceil(p.hp) + " / " + p.maxHp + "</b></li>" +
      "<li>Dégâts <b>" + Math.round(p.might * 100) + " %</b></li>" +
      "<li>Vitesse <b>" + Math.round(p.speed / 62 * 100) + " %</b></li>" +
      "<li>Recharge <b>" + Math.round(p.cdMul * 100) + " %</b></li>" +
      "<li>Armure <b>" + p.armor + "</b></li>" +
      "<li>Renaissances <b>" + r.revives + "</b></li></ul></div></div>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="resume" data-autofocus>▶ Reprendre</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="opt-pause">' + (S.opts.sound ? "🔊 Son : oui" : "🔇 Son : non") + "</button>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="restart">↻ Recommencer</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="quit">🏳️ Abandonner</button></div>';
    showCard(html, "pause");
  }
  function resume() { if (state !== "pause") return; state = "play"; hideCard(); last = performance.now(); }

  function gameOver(quit) {
    state = "over"; SND.over();
    curBoss = null;
    r.ended = true;
    var sc = score(), gold = runGold();
    S.stats.kills += r.kills; r.committed = true;
    S.stats.runs++;
    S.gold += gold; S.stats.goldEarned += gold;
    var isBest = sc > S.stats.bestScore;
    S.stats.bestScore = Math.max(S.stats.bestScore, sc);
    S.stats.bestTime = Math.max(S.stats.bestTime, Math.floor(r.time));
    save();
    checkAchievements(r);
    var achHtml = r.newAch.length ? '<div class="over-ach"><h3>Succès débloqués</h3><ul>' + r.newAch.map(function (a) {
      var un = unlocksOf(a.id);
      return "<li>🏆 <strong>" + esc(a.name) + "</strong> +" + a.gold + " " + goldIc() + (un.length ? "<span>Débloque " + esc(un.join(", ")) + "</span>" : "") + "</li>";
    }).join("") + "</ul></div>" : "";
    var lbOk = window.Leaderboard && Leaderboard.configured();
    var html = '<span class="kicker">' + (quit ? "Partie abandonnée" : "Les bestioles ont gagné…") + "</span><h2>Fin de partie</h2>" +
      '<ul class="over-stats"><li><span>Survie</span><strong>' + fmtTime(r.time) + "</strong></li><li><span>Ennemis</span><strong>" + r.kills + "</strong></li><li><span>Niveau</span><strong>" + r.level + "</strong></li>" +
      '<li class="total"><span>Score' + (DIFF.score > 1 ? " (×" + String(DIFF.score).replace(".", ",") + ")" : "") + "</span><strong>" + sc.toLocaleString("fr-FR") + "</strong></li>" +
      '<li class="gold"><span>Glands d\'or gagnés</span><strong>+' + gold + " " + goldIc() + "</strong></li></ul>" +
      '<p class="game-small">' + (isBest ? "🏆 Nouveau record perso !" : "Ton record : " + S.stats.bestScore.toLocaleString("fr-FR")) + "</p>" + achHtml +
      (lbOk ? '<form class="submit-score" data-submit><label for="es-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="es-name" type="text" maxlength="20" autocomplete="nickname" placeholder="Pseudo" value="' + esc(S.name || "") + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      '<div class="btn-row center"><button class="btn" type="button" data-action="restart" data-autofocus>↻ Rejouer</button>' +
      '<button class="btn btn-ghost" type="button" data-action="menu">Menu</button></div>';
    showCard(html, "over");
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var name = input.value.trim();
      if (name.length < 2) { msg.textContent = "Choisis un pseudo d'au moins 2 caractères."; return; }
      S.name = name; save();
      btn.disabled = true; msg.textContent = "Envoi…";
      Leaderboard.submit(GAME_ID, name, sc, { time: Math.floor(r.time), kills: r.kills, level: r.level, char: r.char, diff: S.diff }).then(function (res) {
        msg.textContent = res && res.rank ? "Envoyé ! Tu es " + res.rank + (res.rank === 1 ? "er" : "e") + " au classement." : "Envoyé !";
        document.querySelectorAll('[data-leaderboard="' + GAME_ID + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
      }).catch(function (err) { msg.textContent = Leaderboard.message(err); btn.disabled = false; });
    });
  }

  function showError(err) {
    state = "error";
    try { console.error(err); } catch (e) {}
    var msg = (err && (err.message || String(err))) || "inconnue";
    var where = err && err.stack ? String(err.stack).split("\n").slice(0, 3).join(" | ") : "";
    showCard("<h2>Oups, le jeu a planté 🐿️</h2><p>Désolé ! Si tu peux, envoie-moi ce message via la page Contact :</p>" +
      '<pre class="err">' + esc(msg + (where ? "\n" + where : "")) + "</pre>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="menu">Retour au menu</button></div>', "error");
  }

  /* =====================================================================
     Boucle
     ===================================================================== */
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (state === "error") return;
    try {
      if (state === "play") { update(dt); if (state === "play" || state === "levelup") updateHud(); }
      if (state === "menu" || !p) drawIdle(now); else draw();
    } catch (err) { showError(err); }
  }

  /* =====================================================================
     Boutons du HUD, plein écran, taille
     ===================================================================== */
  $("[data-pause]").addEventListener("click", function () { if (state === "play") pause(); else if (state === "pause") resume(); });
  var muteBtn = $("[data-mute]");
  function muteLabel() { muteBtn.textContent = S.opts.sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", S.opts.sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); });

  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () {
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req && !document.fullscreenElement) {
      try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(function () { stage.classList.add("is-max"); }); } catch (e) { stage.classList.add("is-max"); }
    } else stage.classList.toggle("is-max");
  });
  $("[data-exit-max]").addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen(); stage.classList.remove("is-max");
  });

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    var scale = Math.max(2, Math.round(Math.sqrt(cw * ch) * dpr / 250));
    W = Math.max(80, Math.ceil(cw * dpr / scale)); H = Math.max(80, Math.ceil(ch * dpr / scale));
    canvas.width = W; canvas.height = H;
    canvas.style.width = (W * scale / dpr) + "px";
    canvas.style.height = (H * scale / dpr) + "px";
    stage.style.setProperty("--px-game", (scale / dpr) + "px");
    ctx.imageSmoothingEnabled = false;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  // hook de test (console) : ES_DEBUG.gold(500), ES_DEBUG.time(170)
  window.ES_DEBUG = {
    gold: function (n) { S.gold += n || 500; save(); if (state === "menu") go(screen); },
    time: function (t) { if (r) { r.time = t; nextSwarm = Math.ceil(t / 60) * 60; nextBoss = Math.max(180, Math.ceil(t / 180) * 180); } },
    state: function () { return { state: state, screen: screen, enemies: enemies && enemies.length, level: r && r.level, hp: p && p.hp, xp: xp, xpNext: xpNext, gems: gems && gems.length, kills: r && r.kills, magnet: p && p.magnet, xpMul: p && p.xpMul, px: p && p.x, g0: gems && gems[0] }; },
  };

  // si le navigateur a gardé un vieux style.css, on le recharge
  (function () {
    try {
      if (getComputedStyle(overlay).position !== "absolute") {
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.href = "css/style.css?fresh=" + Date.now();
        document.head.appendChild(l);
      }
    } catch (e) {}
  })();
  window.addEventListener("error", function (e) { if (state !== "error" && state !== "menu") showError(e.error || e.message); });
  window.addEventListener("unhandledrejection", function () {});

  checkAchievements(null);
  go("menu");
  last = performance.now();
  requestAnimationFrame(loop);
})();
