/* =========================================================================
   Écureuil Survivor — moteur, menus et progression.
   Le contenu (écureuils, armes, fusions, objets, cartes, boutique, succès,
   sprites) est dans js/game-data.js. Sauvegarde : localStorage « es-save-v1 ».
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
  var VERSION = "v4";
  var TAU = Math.PI * 2;
  var MAX_W = 6, MAX_P = 6, MAX_LVL = 5;

  // armes de base + fusions dans un seul catalogue
  var ALLW = {};
  Object.keys(D.WEAPONS).forEach(function (k) { ALLW[k] = D.WEAPONS[k]; });
  Object.keys(D.FUSIONS).forEach(function (k) { ALLW[k] = D.FUSIONS[k]; ALLW[k].fusion = true; });

  /* =====================================================================
     Sauvegarde
     ===================================================================== */
  var SAVE_KEY = "es-save-v1";
  function defaults() {
    return { gold: 0, shop: {}, ach: {}, owned: { noisette: true }, char: "noisette", map: "clairiere", diff: "normal", name: "",
             opts: { sound: true, shake: true, numbers: true },
             stats: { kills: 0, goldEarned: 0, runs: 0, bestTime: 0, bestScore: 0, bosses: 0, played: {}, maps: {}, bought: 0 } };
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
      s.stats.played = s.stats.played || {}; s.stats.maps = s.stats.maps || {};
    }
    return s;
  }
  var S = load();
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  function has(ach) { return !ach || !!S.ach[ach]; }
  function charById(id) { return D.CHARACTERS.filter(function (c) { return c.id === id; })[0] || D.CHARACTERS[0]; }
  function mapById(id) { return D.MAPS.filter(function (m) { return m.id === id; })[0] || D.MAPS[0]; }
  function charAvailable(c) { return !!S.owned[c.id] || !c.unlock || has(c.unlock); }
  function achById(id) { return D.ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0]; }
  function sanitize() {
    if (!D.CHARACTERS.some(function (c) { return c.id === S.char; }) || !charAvailable(charById(S.char))) S.char = "noisette";
    if (!D.MAPS.some(function (m) { return m.id === S.map; }) || !has(mapById(S.map).unlock)) S.map = "clairiere";
    if (!D.DIFFICULTIES[S.diff] || !has(D.DIFFICULTIES[S.diff].unlock)) S.diff = "normal";
  }
  sanitize();

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
  function spriteUrl(name) { return urlCache[name] || (urlCache[name] = (SPR[name] || SPR.nut)[0].c.toDataURL()); }
  function goldIc() { return '<img class="gold-ic" src="' + spriteUrl("gold") + '" alt="glands d\'or">'; }

  /* ---------- police pixel 3x5 ---------- */
  var FONT = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
    N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
    ":": "000010000010000", "/": "001001010100100", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "%": "101001010100101", "'": "010010000000000", " ": "000000000000000" };
  function textWidth(str, sc) { return (String(str).length * 4 - 1) * (sc || 1); }
  function drawText(str, x, y, color, align, sc) {
    str = String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
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
  var sndLast = {};
  function throttled(key, ms, fn) { var n = performance.now(); if (n - (sndLast[key] || 0) < ms) return; sndLast[key] = n; fn(); }
  var SND = {
    pick: function () { var n = performance.now(); if (n - lastBlip < 45) return; lastBlip = n; sfx(880 + Math.random() * 200, 0.06, "square", 0.022, 1.5); },
    gold: function () { sfx(1320, 0.08, "square", 0.03, 1.3); },
    hurt: function () { sfx(200, 0.18, "sawtooth", 0.06, 0.4); },
    boom: function () { throttled("boom", 80, function () { sfx(120, 0.25, "triangle", 0.08, 0.3); }); },
    zap: function () { throttled("zap", 60, function () { sfx(1400, 0.07, "sawtooth", 0.025, 0.4); }); },
    shot: function () { throttled("shot", 70, function () { sfx(900, 0.03, "square", 0.012, 0.6); }); },
    level: function () { arp([523, 659, 784, 1047], 70); },
    fusion: function () { arp([392, 523, 659, 784, 1047, 1319], 70, "triangle", 0.06); },
    ach: function () { arp([784, 988, 1175, 1568], 90, "triangle", 0.05); },
    whip: function () { throttled("whip", 80, function () { sfx(500, 0.08, "triangle", 0.03, 0.5); }); },
    crack: function () { sfx(300, 0.1, "square", 0.04, 0.5); },
    click: function () { sfx(660, 0.05, "square", 0.03); },
    over: function () { arp([392, 330, 262, 196], 160, "triangle", 0.06); },
  };

  /* =====================================================================
     État de partie
     ===================================================================== */
  var W = 320, H = 200;
  var state = "menu";     // menu | play | levelup | pause | over | error
  var curBoss = null;
  var p = null, r = null, CH, DIFF, MAP, enemies, projs, hostile, lobs, gems, fx, texts, grid;
  var spawnAcc, nextSwarm, nextBoss, bossCount, shake, uid, achTick, pending, xp, xpNext, propTimer;

  function need(L) { return 5 + (L - 1) * 3 + Math.max(0, L - 15) * 4 + Math.max(0, L - 30) * 8; }
  function V(w, k, l) { var v = w[k]; return Array.isArray(v) ? v[Math.min(l, v.length - 1)] : v; }

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
    p.luck = 1 + 0.15 * (sh.chance || 0) + 0.2 * (ps.trefle || 0);
    p.area = 1 + (m.area || 0) + 0.05 * (sh.zone || 0) + 0.1 * (ps.loupe || 0);
    p.amount = (m.amount || 0) + Math.ceil((ps.poches || 0) / 2);
    p.shieldCd = ps.mousse ? 16 - 2 * ps.mousse : 0;
    p.goldMul = (1 + 0.1 * (sh.avarice || 0)) * DIFF.gold * (MAP.gold || 1);
    if (oldMax && p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
  }

  function reset() {
    CH = charById(S.char); DIFF = D.DIFFICULTIES[S.diff] || D.DIFFICULTIES.normal; MAP = mapById(S.map);
    p = { x: 0, y: 0, hp: 0, face: 1, moving: false, anim: 0, inv: 0, weapons: {}, passives: {}, timers: {}, st: {}, shield: false, shieldT: 0 };
    p.weapons[CH.weapon] = 1;
    calc(); p.hp = p.maxHp;
    r = { time: 0, kills: 0, level: 1, bosses: 0, berries: 0, gold: 0, lastHit: 0, maxedWeapon: false, nWeapons: 1, nPassives: 0,
          fusions: 0, props: 0, freeze: 0, flash: 0, hard: S.diff !== "normal", ended: false, committed: false, newAch: [], bonus: 0,
          revives: S.shop.renaissance || 0, rerolls: S.shop.relance || 0, char: CH.id, map: MAP.id };
    enemies = []; projs = []; hostile = []; lobs = []; gems = []; fx = []; texts = [];
    xp = 0; xpNext = need(1); pending = 0;
    spawnAcc = 5; nextSwarm = 60; nextBoss = 180; bossCount = 0; shake = 0; uid = 0; achTick = 1; propTimer = 0;
    grid = new Map();
    for (var i = 0; i < 4; i++) spawnProp(90 + Math.random() * 120);
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
     Apparitions : ennemis et objets destructibles
     ===================================================================== */
  function hpMul() { return (1 + r.time / 100 + Math.pow(r.time / 300, 2)) * DIFF.hp * (MAP.hp || 1); }
  function makeEnemy(type, d, x, y, hp) {
    var e = { id: ++uid, type: type, d: d, spr: SPR[d.sprite], x: x, y: y, hp: hp, maxHp: hp, kx: 0, ky: 0, flash: 0, slowT: 0, slow: 0,
              anim: Math.random() * 2, phase: Math.random() * 6, face: 1, charge: 0, windup: 0, cd: 3, spd: (d.spd || 0) * DIFF.spd, cool: null };
    enemies.push(e);
    return e;
  }
  function spawn(type, ang, dist) {
    var d = D.ENEMIES[type];
    if (ang === undefined) ang = Math.random() * TAU;
    if (dist === undefined) dist = Math.hypot(W, H) / 2 + 6 + Math.random() * 14;
    var hp = d.hp * (d.boss ? (1 + bossCount * 0.9) * (1 + r.time / 200) * DIFF.hp * (MAP.hp || 1) : hpMul());
    return makeEnemy(type, d, p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist, hp);
  }
  var PROP_D = { prop: true, r: 6, spd: 0, dmg: 0, xp: 0, color: "#a06a3e" };
  function spawnProp(dist) {
    var a = Math.random() * TAU;
    var d = Object.assign({}, PROP_D, { sprite: MAP.prop });
    var e = makeEnemy("prop", d, p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, 14 * (1 + r.time / 200));
    e.anim = 0;
    return e;
  }
  function pickType() {
    var pool = [], total = 0;
    MAP.enemies.forEach(function (it) {
      if (r.time < it[1]) return;
      var w = it[2] * (1 + Math.min(1.5, (r.time - it[1]) / 120));
      pool.push([it[0], w]); total += w;
    });
    var x = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) return pool[i][0]; }
    return MAP.enemies[0][0];
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
    while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < 290) spawn(pickType()); }
    if (r.time >= nextSwarm) {
      nextSwarm += 60;
      var n = 18 + Math.floor(r.time / 60) * 6;
      var idx = r.time < 150 ? 0 : (r.time < 300 ? 1 : (r.time < 480 ? 2 : 3));
      var type = MAP.swarm[Math.min(idx, MAP.swarm.length - 1)];
      var R = Math.hypot(W, H) / 2 + 8;
      for (var i = 0; i < n; i++) spawn(type, i / n * TAU, R);
      banner("Une nuée approche !");
    }
    if (r.time >= nextBoss) {
      nextBoss += 180;
      var bt = MAP.bosses[bossCount % MAP.bosses.length];
      spawn(bt);
      bossCount++;
      banner(D.ENEMIES[bt].name + " arrive !");
      SND.boom();
    }
    propTimer -= dt;
    if (propTimer <= 0) {
      propTimer = 4.5;
      var nProps = 0;
      for (var j = 0; j < enemies.length; j++) if (enemies[j].d.prop) nProps++;
      if (nProps < 7) spawnProp(Math.hypot(W, H) / 2 + 10 + Math.random() * 60);
    }
  }

  /* =====================================================================
     Dégâts, morts, butin
     ===================================================================== */
  function hurt(e, dmg, kx, ky) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg * p.might * (0.9 + Math.random() * 0.2)));
    e.hp -= dmg; e.flash = 0.1;
    if (!e.d.prop) {
      var kb = e.d.boss ? 0.12 : 1;
      e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    }
    if (S.opts.numbers && texts.length < 60) texts.push({ x: e.x + (Math.random() * 6 - 3), y: e.y - e.d.r - 6, n: dmg, life: 0.6 });
    if (e.hp <= 0) kill(e);
  }
  function drop(kind, x, y, v) { gems.push({ x: x, y: y, kind: kind, v: v || 0 }); }
  function kill(e) {
    e.dead = true;
    burst(e.x, e.y, e.d.color, e.d.boss ? 30 : 6);
    if (e.d.prop) {
      r.props++; SND.crack();
      drop(rollLoot(), e.x, e.y);
      return;
    }
    r.kills++;
    if (e.d.boss) {
      r.bosses++; S.stats.bosses++;
      drop("chest", e.x, e.y);
      for (var i = 0; i < 6; i++) drop("gold", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 2);
      for (i = 0; i < 10; i++) drop("xp", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 5);
      return;
    }
    var L = p.luck;
    if (Math.random() < 0.01 * L) drop("berry", e.x, e.y);
    else if (Math.random() < 0.025 * L) drop("gold", e.x, e.y, 1);
    if (gems.length > 450) { var g = gems[(Math.random() * gems.length) | 0]; if (g.kind === "xp") { g.v += e.d.xp; return; } }
    drop("xp", e.x, e.y, e.d.xp);
  }
  function rollLoot() {
    var total = 0, list = D.LOOT.map(function (l) { var w = l.weight * (l.id === "chest" || l.id === "bomb" ? p.luck : 1); total += w; return [l.id, w]; });
    var x = Math.random() * total;
    for (var i = 0; i < list.length; i++) { x -= list[i][1]; if (x <= 0) return list[i][0]; }
    return "goldbag";
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 20 + Math.random() * 50;
      fx.push({ kind: "dot", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color: color });
    }
  }
  function damagePlayer(dmg) {
    if (p.inv > 0) return;
    if (p.shield) {
      p.shield = false; p.shieldT = p.shieldCd; p.inv = 0.5;
      burst(p.x, p.y, "#9cc56b", 10); SND.crack();
      return;
    }
    p.hp -= Math.max(1, dmg - p.armor); p.inv = 0.6; r.lastHit = r.time;
    if (S.opts.shake) shake = 0.25;
    SND.hurt(); burst(p.x, p.y, "#c8553d", 5);
  }
  function inView(e, m) { return Math.abs(e.x - p.x) < W / 2 + (m || 0) && Math.abs(e.y - p.y) < H / 2 + (m || 0); }
  function nuke() {
    r.flash = 0.35; if (S.opts.shake) shake = 0.4; SND.boom();
    enemies.forEach(function (e) {
      if (e.dead || e.d.prop || !inView(e, 20)) return;
      if (e.d.boss) { e.hp -= e.maxHp * 0.08; e.flash = 0.2; if (e.hp <= 0) kill(e); }
      else kill(e);
    });
  }

  /* =====================================================================
     Armes
     ===================================================================== */
  function nearest(n, range, from) {
    var best = [], r2 = range * range, ox = from ? from.x : p.x, oy = from ? from.y : p.y;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead || e.d.prop) continue;
      var d = (e.x - ox) * (e.x - ox) + (e.y - oy) * (e.y - oy);
      if (d > r2) continue;
      if (best.length < n) { best.push([d, e]); best.sort(function (a, b) { return a[0] - b[0]; }); }
      else if (d < best[n - 1][0]) { best[n - 1] = [d, e]; best.sort(function (a, b) { return a[0] - b[0]; }); }
    }
    return best.map(function (b) { return b[1]; });
  }
  function timer(id, cd, dt) {
    p.timers[id] = (p.timers[id] === undefined ? 0.3 : p.timers[id]) - dt;
    if (p.timers[id] <= 0) { p.timers[id] = cd * p.cdMul; return true; }
    return false;
  }
  function cooled(e, key, delay) {
    e.cool = e.cool || {};
    if ((e.cool[key] || 0) > r.time) return false;
    e.cool[key] = r.time + delay; return true;
  }
  function explode(x, y, rad, dmg, frag) {
    fx.push({ kind: "ring", x: x, y: y, r: rad, life: 0.25, max: 0.25 });
    burst(x, y, "#e8873a", 6);
    near(x, y, rad + 12, function (en) {
      var ddx = en.x - x, ddy = en.y - y;
      if (Math.hypot(ddx, ddy) <= rad + en.d.r) hurt(en, dmg, ddx * 3, ddy * 3);
    });
    for (var i = 0; i < (frag || 0); i++) {
      var a = i / frag * TAU + Math.random() * 0.5, dd = rad * (0.9 + Math.random() * 0.5);
      lobs.push({ sx: x, sy: y, tx: x + Math.cos(a) * dd, ty: y + Math.sin(a) * dd * 0.8, t: 0, dur: 0.22, dmg: dmg * 0.35, rad: rad * 0.45, frag: 0, small: true });
    }
    SND.boom();
  }
  function zapChain(start, count, dmg, origin) {
    var pts = [[origin ? origin.x : p.x, origin ? origin.y : p.y - 4]], hit = [], cur = start;
    for (var c = 0; c < count && cur; c++) {
      pts.push([cur.x, cur.y]); hit.push(cur.id);
      hurt(cur, dmg, 0, 0);
      cur = chainNext(cur, hit);
    }
    fx.push({ kind: "bolt", pts: pts, life: 0.16, max: 0.16 });
  }
  function chainNext(from, hitIds) {
    var nx = null, nd = 55 * 55;
    near(from.x, from.y, 55, function (e) {
      if (e.d.prop || hitIds.indexOf(e.id) >= 0) return;
      var dd = (e.x - from.x) * (e.x - from.x) + (e.y - from.y) * (e.y - from.y);
      if (dd < nd) { nd = dd; nx = e; }
    });
    return nx;
  }

  var BEHAVIOR = {
    shooter: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var count = V(w, "count", l) + p.amount, range = w.range || 140, spd = w.spd || 150;
      var t = nearest(count, range);
      for (var i = 0; i < count; i++) {
        var tg = t[i % Math.max(1, t.length)];
        var a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : (p.face > 0 ? 0 : Math.PI);
        if (!tg || i >= t.length) a += (i - (count - 1) / 2) * 0.25;
        a += (Math.random() - 0.5) * (w.spread || 0);
        projs.push({ kind: "bullet", x: p.x, y: p.y - 2, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, life: range / spd * 1.4, hit: [], r: 4 });
      }
      if (w.spread) SND.shot();
    },
    whip: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var dirs = V(w, "both", l) ? [1, -1] : [p.face], R = V(w, "r", l) * p.area, dmg = V(w, "dmg", l);
      dirs.forEach(function (dir) {
        fx.push({ kind: "swipe", dir: dir, r: R, life: 0.18, max: 0.18 });
        near(p.x + dir * R / 2, p.y, R + 10, function (e) {
          var dx = e.x - p.x, dy = e.y - p.y;
          if (dx * dir < -4 || Math.hypot(dx, dy) > R + e.d.r || Math.abs(dy) > R * 0.8 + e.d.r) return;
          hurt(e, dmg, dir * 90, dy * 1.5);
        });
      });
      SND.whip();
    },
    spin: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var R = V(w, "r", l) * p.area, dmg = V(w, "dmg", l);
      fx.push({ kind: "spin", r: R, life: 0.25, max: 0.25 });
      near(p.x, p.y, R + 10, function (e) {
        var dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d > R + e.d.r) return;
        hurt(e, dmg, dx / d * 110, dy / d * 110);
      });
      SND.whip();
    },
    orbit: function (id, w, l, dt) {
      var n = V(w, "n", l) + p.amount, R = V(w, "R", l) * p.area, dmg = V(w, "dmg", l);
      p.st[id] = (p.st[id] || 0) + V(w, "spd", l) * dt;
      for (var j = 0; j < n; j++) {
        var oa = p.st[id] + j / n * TAU;
        var ox = p.x + Math.cos(oa) * R, oy = p.y + Math.sin(oa) * R * 0.8;
        near(ox, oy, 14, function (e) {
          if (Math.hypot(e.x - ox, e.y - oy) > 5 + e.d.r || !cooled(e, id, 0.45)) return;
          hurt(e, dmg, (e.x - p.x) * 1.2, (e.y - p.y) * 1.2);
          if (w.heal && !e.d.prop) p.hp = Math.min(p.maxHp, p.hp + w.heal);
        });
      }
    },
    radial: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, spd = w.spd || 105;
      p.st[id] = (p.st[id] || 0) + 0.45;
      for (var m = 0; m < n; m++) {
        var la = p.st[id] + m / n * TAU;
        projs.push({ kind: "bullet", x: p.x, y: p.y, vx: Math.cos(la) * spd, vy: Math.sin(la) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, anim: true, homing: !!w.homing, life: w.homing ? 2 : 1.1, hit: [], r: 4 });
      }
    },
    lob: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var cand = nearest(12, 130), n = V(w, "n", l) + p.amount;
      for (var k = 0; k < n; k++) {
        var tgt = cand.length ? cand[(Math.random() * cand.length) | 0] : null;
        var tx = tgt ? tgt.x : p.x + (Math.random() * 120 - 60), ty = tgt ? tgt.y : p.y + (Math.random() * 80 - 40);
        lobs.push({ sx: p.x, sy: p.y, tx: tx, ty: ty, t: 0, dur: 0.55 + k * 0.08, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area,
                    frag: V(w, "frag", l) || 0, sprite: w.frag ? "pinebomb" : "pinecone" });
      }
    },
    aura: function (id, w, l, dt) {
      var R = V(w, "R", l) * p.area, slow = V(w, "slow", l) || 0, push = V(w, "push", l) || 0, dmg = V(w, "dmg", l);
      p.st[id] = (p.st[id] || 0) - dt;
      var tick = p.st[id] <= 0;
      if (tick) p.st[id] = w.tick || 0.5;
      near(p.x, p.y, R + 12, function (e) {
        var dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy * 1.25) || 1;
        if (d > R + e.d.r) return;
        if (!e.d.prop) {
          if (slow) { e.slowT = 0.3; e.slow = e.d.boss ? slow / 3 : slow; }
          if (push) { var k = (e.d.boss ? 0.15 : 1) * push * dt; e.x += dx / d * k; e.y += dy / d * k; }
        }
        if (tick) hurt(e, dmg, 0, 0);
      });
    },
    boomerang: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, ft = nearest(n, 180);
      for (var i = 0; i < n; i++) {
        var fe = ft[i];
        var fa = fe ? Math.atan2(fe.y - p.y, fe.x - p.x) : (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.6;
        projs.push({ kind: "boomerang", x: p.x, y: p.y, vx: Math.cos(fa), vy: Math.sin(fa), dmg: V(w, "dmg", l), pierce: 999, sprite: w.sprite,
                     life: 4, range: V(w, "range", l) * p.area, dist: 0, back: false, chain: V(w, "chain", l) || 0, zapT: 0 });
      }
    },
    chain: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var starts = nearest(12, 150), bolts = V(w, "bolts", l) + p.amount;
      for (var b = 0; b < bolts && starts.length; b++) zapChain(starts.splice((Math.random() * starts.length) | 0, 1)[0], V(w, "chain", l), V(w, "dmg", l));
      SND.zap();
    },
    rocket: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, t = nearest(n, 200);
      for (var i = 0; i < n; i++) {
        var a = (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.5 - Math.PI / 2 * 0.6;
        projs.push({ kind: "rocket", x: p.x, y: p.y - 3, ang: a, spd: 40, max: w.spd || 120, target: t[i % Math.max(1, t.length)] || null,
                     dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area, life: 3, pierce: 1 });
      }
      SND.shot();
    },
  };
  function weapons(dt) {
    Object.keys(p.weapons).forEach(function (id) {
      var w = ALLW[id]; if (!w) return;
      var fn = BEHAVIOR[w.type]; if (fn) fn(id, w, p.weapons[id] - 1, dt);
    });
  }

  /* =====================================================================
     Montée de niveau, fusions
     ===================================================================== */
  function weaponAvailable(id) { var w = D.WEAPONS[id]; return w && (!w.unlock || has(w.unlock) || p.weapons[id]); }
  function readyFusions() {
    var out = [];
    Object.keys(D.FUSIONS).forEach(function (id) {
      var f = D.FUSIONS[id], a = f.from[0], b = f.from[1];
      if (p.weapons[id] || (p.weapons[a] || 0) < MAX_LVL) return;
      var bOk = D.WEAPONS[b] ? (p.weapons[b] || 0) >= MAX_LVL : (p.passives[b] || 0) >= MAX_LVL;
      if (bOk) out.push(id);
    });
    return out;
  }
  function ingredientName(k) { return (ALLW[k] || D.PASSIVES[k] || {}).name || k; }
  function choices(n) {
    var out = readyFusions().slice(0, 2).map(function (id) { return { type: "f", id: id }; });
    var pool = [];
    var nW = Object.keys(p.weapons).length, nP = Object.keys(p.passives).length;
    Object.keys(p.weapons).forEach(function (k) { if (p.weapons[k] < MAX_LVL) pool.push({ type: "w", id: k, lvl: p.weapons[k] + 1, weight: 3 }); });
    if (nW < MAX_W) Object.keys(D.WEAPONS).forEach(function (k) {
      if (p.weapons[k] || !weaponAvailable(k)) return;
      if (Object.keys(D.FUSIONS).some(function (f) { return p.weapons[f] && D.FUSIONS[f].from.indexOf(k) >= 0; })) return;
      pool.push({ type: "w", id: k, lvl: 1, weight: 2 });
    });
    Object.keys(D.PASSIVES).forEach(function (k) {
      var l = p.passives[k] || 0;
      if (l >= MAX_LVL || (!l && nP >= MAX_P)) return;
      pool.push({ type: "p", id: k, lvl: l + 1, weight: l ? 2 : 1.5 });
    });
    while (out.length < n && pool.length) {
      var total = pool.reduce(function (s, c) { return s + c.weight; }, 0), x = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { x -= pool[i].weight; if (x <= 0 || i === pool.length - 1) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (!out.length) out = [{ type: "heal" }, { type: "gold" }];
    return out;
  }
  function applyFusion(id) {
    var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], neww = {};
    Object.keys(p.weapons).forEach(function (k) {
      if (k === a) neww[id] = 1;
      else if (k === b && D.WEAPONS[b]) return;
      else neww[k] = p.weapons[k];
    });
    p.weapons = neww;
    delete p.timers[a]; delete p.timers[b];
    r.fusions++;
    burst(p.x, p.y, "#f6d36b", 24);
    banner("Fusion : " + f.name + " !");
    SND.fusion();
  }
  var currentChoices = [];
  function openLevelUp() {
    state = "levelup";
    clearInput();
    currentChoices = choices(3 + (p.luck > 1.3 && Math.random() < 0.3 ? 1 : 0));
    var html = '<span class="kicker">Niveau ' + r.level + " !</span><h2>Choisis un pouvoir</h2><div class=\"choices\">";
    currentChoices.forEach(function (c, i) {
      var icon, name, lvl = "", desc, cls = "choice";
      if (c.type === "f") {
        var f = D.FUSIONS[c.id];
        icon = '<img src="' + spriteUrl(f.icon) + '" alt="">'; name = f.name; lvl = "Fusion !"; cls += " is-fusion";
        desc = ingredientName(f.from[0]) + " + " + ingredientName(f.from[1]) + " : " + f.desc[0];
      } else if (c.type === "w") {
        var w = ALLW[c.id];
        icon = '<img src="' + spriteUrl(w.icon) + '" alt="">'; name = w.name;
        lvl = c.lvl === 1 ? "Nouvelle arme" : "Niv. " + c.lvl; desc = w.desc[c.lvl - 1];
        if (w.fusion) cls += " is-fusion";
      } else if (c.type === "p") {
        icon = '<img src="' + spriteUrl(D.PASSIVES[c.id].sprite) + '" alt="">'; name = D.PASSIVES[c.id].name;
        lvl = c.lvl === 1 ? "Nouvel objet" : "Niv. " + c.lvl; desc = D.PASSIVES[c.id].desc;
      } else if (c.type === "heal") {
        icon = '<img src="' + spriteUrl("berry") + '" alt="">'; name = "Panier de baies"; desc = "Soigne 40 PV.";
      } else {
        icon = '<img src="' + spriteUrl("goldbag") + '" alt="">'; name = "Bourse de glands"; desc = "+15 glands d'or.";
      }
      html += '<button type="button" class="' + cls + '" data-choice="' + i + '"><span class="choice-key">' + (i + 1) + "</span>" +
        '<span class="choice-icon">' + icon + "</span>" +
        '<span class="choice-text"><strong>' + esc(name) + "</strong>" + (lvl ? "<em>" + lvl + "</em>" : "") + "<span>" + esc(desc) + "</span></span></button>";
    });
    html += '</div><div class="btn-row center">';
    if (r.rerolls > 0) html += '<button class="btn btn-alt btn-small" type="button" data-action="reroll">🎲 Relancer (' + r.rerolls + ")</button>";
    html += '<button class="btn btn-ghost btn-small" type="button" data-action="skip">Passer (+3 ' + goldIc() + ")</button></div>";
    showCard(html, "levelup");
    SND.level();
  }
  function refreshCounts() {
    r.nWeapons = Object.keys(p.weapons).length; r.nPassives = Object.keys(p.passives).length;
    r.maxedWeapon = r.maxedWeapon || Object.keys(p.weapons).some(function (k) { return p.weapons[k] >= MAX_LVL; });
  }
  function apply(c) {
    if (state !== "levelup" || !c) return;
    if (c.type === "f") applyFusion(c.id);
    else if (c.type === "w") p.weapons[c.id] = c.lvl;
    else if (c.type === "p") { p.passives[c.id] = c.lvl; if (c.id === "appetit") p.hp += 20; if (c.id === "mousse" && c.lvl === 1) p.shield = true; }
    else if (c.type === "heal") p.hp += 40;
    else addGold(15);
    calc(); refreshCounts();
    afterChoice();
  }
  function afterChoice() {
    pending = Math.max(0, pending - 1);
    if (pending > 0) openLevelUp();
    else { state = "play"; hideCard(); last = performance.now(); }
  }
  function addGold(n) { r.gold += n * p.goldMul; }

  /* =====================================================================
     Succès
     ===================================================================== */
  var EMPTY_RUN = { time: 0, kills: 0, level: 0, bosses: 0, berries: 0, lastHit: 0, fusions: 0, props: 0 };
  function totals(run) {
    var s = S.stats;
    return { kills: s.kills + (run && !run.committed ? run.kills : 0), goldEarned: s.goldEarned, played: s.played, maps: s.maps, bought: s.bought };
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
    D.CHARACTERS.forEach(function (c) { if (c.unlock === id) out.push(c.name + " (" + c.title.toLowerCase() + ")"); });
    D.MAPS.forEach(function (m) { if (m.unlock === id) out.push("la carte " + m.name); });
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
    if (p.shieldCd && !p.shield) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = true; }
    r.freeze = Math.max(0, r.freeze - dt); r.flash = Math.max(0, r.flash - dt);

    director(dt);
    buildGrid();
    weapons(dt);

    var i, e, boss = null;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      var dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.flash -= dt;
      if (e.d.prop) { if (d > 480) e.dead = true; continue; }
      var sp = e.spd * (e.slowT > 0 ? 1 - e.slow : 1);
      if (r.freeze > 0) sp *= e.d.boss ? 0.5 : 0;
      e.slowT -= dt; e.anim += dt * (e.type === "wasp" || e.type === "moth" ? 14 : 5) * (r.freeze > 0 && !e.d.boss ? 0 : 1);
      var mx = dx / d, my = dy / d;
      if (e.d.move === "wobble") { var s = Math.sin(r.time * (e.type === "wasp" ? 6 : 3) + e.phase) * 0.7; var px = -my * s, py = mx * s; mx += px; my += py; }
      else if (e.d.move === "hop") sp *= 0.25 + 1.6 * Math.max(0, Math.sin(r.time * 6 + e.phase));
      if (e.type === "boar") {
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 135 * (r.freeze > 0 ? 0.5 : 1); }
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
    // séparation légère (les objets et les boss ne bougent pas)
    grid.forEach(function (cell) {
      for (var a = 0; a < cell.length; a++) for (var b = a + 1; b < cell.length; b++) {
        var A = cell[a], B = cell[b], sx = B.x - A.x, sy = B.y - A.y, dd = Math.hypot(sx, sy), min = A.d.r + B.d.r - 2;
        if (dd > 0 && dd < min) {
          var ha = A.d.boss || A.d.prop, hb = B.d.boss || B.d.prop;
          if (ha && hb) continue;
          var push = (min - dd) / dd, wa = ha ? 0 : (hb ? 1 : 0.5), wb = 1 - wa;
          A.x -= sx * push * wa; A.y -= sy * push * wa; B.x += sx * push * wb; B.y += sy * push * wb;
        }
      }
    });
    for (i = hostile.length - 1; i >= 0; i--) {
      var hq = hostile[i];
      hq.x += hq.vx * dt; hq.y += hq.vy * dt; hq.life -= dt;
      if (Math.abs(hq.x - p.x) < 5 && Math.abs(hq.y - p.y) < 6) { damagePlayer(hq.dmg); hq.life = 0; }
      if (hq.life <= 0) hostile.splice(i, 1);
    }
    if (p.hp <= 0) {
      if (r.revives > 0) {
        r.revives--; p.hp = p.maxHp * 0.5; p.inv = 2;
        near(p.x, p.y, 70, function (en) { if (en.d.prop) return; var ax = en.x - p.x, ay = en.y - p.y, ad = Math.hypot(ax, ay) || 1; en.kx += ax / ad * 260; en.ky += ay / ad * 260; });
        hostile = [];
        burst(p.x, p.y, "#f29a85", 24); banner("Renaissance !"); SND.level();
      } else { gameOver(); return; }
    }

    for (i = projs.length - 1; i >= 0; i--) {
      var q = projs[i];
      if (q.kind === "boomerang") updateBoomerang(q, dt);
      else if (q.kind === "rocket") updateRocket(q, dt);
      else updateBullet(q, dt);
      if (q.life <= 0 || q.pierce <= 0) projs.splice(i, 1);
    }
    for (i = lobs.length - 1; i >= 0; i--) {
      var l = lobs[i]; l.t += dt;
      if (l.t >= l.dur) { lobs.splice(i, 1); explode(l.tx, l.ty, l.rad, l.dmg, l.frag); }
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
      if (gd < 7) { gems.splice(i, 1); collect(g); }
      else if (gd > 600 && (g.kind === "xp" || g.kind === "gold")) gems.splice(i, 1);
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
  function collect(g) {
    switch (g.kind) {
      case "xp": xp += g.v * p.xpMul; SND.pick(); break;
      case "gold": addGold(g.v); SND.gold(); break;
      case "berry": p.hp = Math.min(p.maxHp, p.hp + 25); r.berries++; SND.level(); break;
      case "magnet": gems.forEach(function (o) { if (o.kind === "xp" || o.kind === "gold") o.pull = 120; }); banner("Aspirateur à noisettes !"); SND.level(); break;
      case "xpjar": xp += xpNext * 0.75; banner("Pot d'expérience !"); SND.level(); break;
      case "goldbag": addGold(8 + Math.floor(r.time / 30)); SND.gold(); break;
      case "freeze": r.freeze = 5; banner("Givre !"); SND.zap(); break;
      case "bomb": nuke(); banner("Gland explosif !"); break;
      case "chest":
        addGold(15); burst(p.x, p.y, "#f2c230", 16);
        var ready = readyFusions();
        if (ready.length) { applyFusion(ready[0]); calc(); refreshCounts(); }
        else pending++;
        break;
    }
  }
  function updateBullet(q, dt) {
    if (q.homing) {
      q.retarget = (q.retarget || 0) - dt;
      if (q.retarget <= 0) { q.retarget = 0.25; q.target = nearest(1, 90, q)[0] || null; }
      if (q.target && !q.target.dead) {
        var spd = Math.hypot(q.vx, q.vy), a = Math.atan2(q.vy, q.vx), want = Math.atan2(q.target.y - q.y, q.target.x - q.x);
        var diff = Math.atan2(Math.sin(want - a), Math.cos(want - a));
        a += Math.max(-5 * dt, Math.min(5 * dt, diff));
        q.vx = Math.cos(a) * spd; q.vy = Math.sin(a) * spd;
      }
    }
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    near(q.x, q.y, 16, function (en) {
      if (q.pierce <= 0 || q.hit.indexOf(en.id) >= 0) return;
      if (Math.abs(en.x - q.x) > en.d.r + q.r || Math.abs(en.y - q.y) > en.d.r + q.r) return;
      q.hit.push(en.id); q.pierce--;
      hurt(en, q.dmg, q.vx * 0.5, q.vy * 0.5);
      if (q.pierce <= 0) return false;
    });
  }
  function updateBoomerang(q, dt) {
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
    q.life -= dt; q.zapT -= dt;
    near(q.x, q.y, 16, function (en) {
      if (Math.abs(en.x - q.x) > en.d.r + 4 || Math.abs(en.y - q.y) > en.d.r + 4) return;
      if (!cooled(en, "b" + q.sprite, 0.35)) return;
      hurt(en, q.dmg, q.vx * 40, q.vy * 40);
      if (q.chain && q.zapT <= 0 && !en.d.prop) { q.zapT = 0.25; zapChain(chainNext(en, [en.id]), q.chain, q.dmg * 0.5, en); SND.zap(); }
    });
  }
  function updateRocket(q, dt) {
    if (!q.target || q.target.dead) { q.retarget = (q.retarget || 0) - dt; if (q.retarget <= 0) { q.retarget = 0.2; q.target = nearest(1, 220, q)[0] || null; } }
    if (q.target && !q.target.dead) {
      var want = Math.atan2(q.target.y - q.y, q.target.x - q.x), diff = Math.atan2(Math.sin(want - q.ang), Math.cos(want - q.ang));
      q.ang += Math.max(-6 * dt, Math.min(6 * dt, diff));
    }
    q.spd = Math.min(q.max, q.spd + 220 * dt);
    q.x += Math.cos(q.ang) * q.spd * dt; q.y += Math.sin(q.ang) * q.spd * dt;
    q.life -= dt;
    if (Math.random() < 0.6) fx.push({ kind: "dot", x: q.x - Math.cos(q.ang) * 4, y: q.y - Math.sin(q.ang) * 4, vx: 0, vy: -6, life: 0.3, color: "rgba(220,220,220,.7)" });
    var boom = q.life <= 0;
    if (!boom) near(q.x, q.y, 14, function (en) {
      if (Math.abs(en.x - q.x) > en.d.r + 3 || Math.abs(en.y - q.y) > en.d.r + 3) return;
      boom = true; return false;
    });
    if (boom) { q.life = 0; explode(q.x, q.y, q.rad, q.dmg, 0); }
  }

  /* =====================================================================
     Dessin
     ===================================================================== */
  function hash(x, y) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function drawGround(cx, cy, G) {
    var T = 16;
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
      } else if (G.water && (k === 12 || k === 13)) {
        ctx.fillStyle = G.water; ctx.fillRect(sx + ox - 2, sy + oy + 1, 10, 4); ctx.fillRect(sx + ox, sy + oy, 6, 6);
        ctx.fillStyle = G.waterHi; ctx.fillRect(sx + ox + 1, sy + oy + 1, 3, 1);
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
  var AURA = {
    spore: { fill: "rgba(122,90,190,.13)", dot: "spore" },
    force: { fill: "rgba(127,209,199,.12)", ring: "rgba(127,209,199,.75)" },
    mist: { fill: "rgba(150,120,210,.16)", ring: "rgba(127,209,199,.5)", dot: "spore" },
  };
  function drawAuras() {
    Object.keys(p.weapons).forEach(function (id) {
      var w = ALLW[id]; if (!w || w.type !== "aura") return;
      var st = AURA[w.color] || AURA.spore, R = V(w, "R", p.weapons[id] - 1) * p.area;
      ctx.fillStyle = st.fill;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * 0.8, 0, 0, TAU); ctx.fill();
      if (st.ring) {
        ctx.strokeStyle = st.ring; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]); ctx.lineDashOffset = -r.time * 20;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * 0.8, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (st.dot) for (var s = 0; s < 10; s++) {
        var a = r.time * 0.8 + s / 10 * TAU, rr = R * (0.55 + 0.4 * Math.sin(r.time * 2 + s));
        blit(SPR[st.dot][0], p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.8);
      }
    });
  }
  function drawOrbits() {
    Object.keys(p.weapons).forEach(function (id) {
      var w = ALLW[id]; if (!w || w.type !== "orbit") return;
      var l = p.weapons[id] - 1, n = V(w, "n", l) + p.amount, R = V(w, "R", l) * p.area;
      for (var j = 0; j < n; j++) {
        var oa = (p.st[id] || 0) + j / n * TAU;
        blit(SPR[w.sprite || "mushroom"][0], p.x + Math.cos(oa) * R, p.y + Math.sin(oa) * R * 0.8);
      }
    });
  }

  function draw() {
    var sx = shake > 0 ? (Math.random() * 4 - 2) : 0, sy = shake > 0 ? (Math.random() * 4 - 2) : 0;
    var cx = Math.round(p.x - W / 2 + sx), cy = Math.round(p.y - H / 2 + sy);
    drawGround(cx, cy, MAP.ground);
    ctx.save();
    ctx.translate(-cx, -cy);

    var bob = Math.sin(r.time * 4);
    gems.forEach(function (g) {
      var s = g.kind === "xp" ? (g.v >= 3 ? SPR.bignut[0] : SPR.nut[0]) : (SPR[g.kind] || SPR.nut)[0];
      var big = g.kind !== "xp" && g.kind !== "gold";
      if (big) { ctx.fillStyle = "rgba(255,240,180,.25)"; ctx.fillRect(Math.round(g.x - 5), Math.round(g.y - 5 + bob), 10, 10); }
      blit(s, g.x, g.y + (big ? bob * 1.5 : 0));
    });
    drawAuras();

    enemies.sort(function (a, b) { return a.y - b.y; });
    var drewPlayer = false;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!drewPlayer && e.y > p.y) { drawHero(CH.sprite, p.x, p.y, p.face, p.moving, p.anim, p.inv); drewPlayer = true; }
      if (e.x < cx - 30 || e.x > cx + W + 30 || e.y < cy - 30 || e.y > cy + H + 30) continue;
      var spr = e.spr[(e.anim | 0) % e.spr.length];
      if (!e.spr.flying) shadow(e.x, e.y + spr.h / 2 - 2, spr.w * 0.7);
      else shadow(e.x, e.y + spr.h / 2 + 3, spr.w * 0.5);
      blit(spr, e.x, e.y, !e.d.prop && e.face < 0, e.flash > 0);
      if (e.slowT > 0 && !e.d.boss && !e.d.prop) { ctx.fillStyle = "rgba(160,130,230,.7)"; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - spr.h / 2 - 2), 2, 2); }
    }
    if (!drewPlayer) drawHero(CH.sprite, p.x, p.y, p.face, p.moving, p.anim, p.inv);
    if (p.shield) {
      ctx.strokeStyle = "rgba(156,197,107,.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 9, 0, 0, TAU); ctx.stroke();
    }

    drawOrbits();
    var flick = ((r.time * 12) | 0) % 2;
    projs.forEach(function (q) {
      if (q.kind === "rocket") {
        var rs = SPR.rocket[0];
        ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y)); ctx.rotate(q.ang);
        ctx.drawImage(rs.c, -rs.w / 2, -rs.h / 2); ctx.restore();
        return;
      }
      var s = SPR[q.sprite] || SPR.acorn;
      blit(s[(q.anim || q.kind === "boomerang") ? flick % s.length : 0], q.x, q.y, q.vx < 0);
    });
    hostile.forEach(function (q) { blit(SPR.feather[flick], q.x, q.y); });
    lobs.forEach(function (l) {
      var k = l.t / l.dur, x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k - Math.sin(k * Math.PI) * (l.small ? 8 : 30);
      if (l.small) { ctx.fillStyle = "#f6b468"; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); return; }
      shadow(l.sx + (l.tx - l.sx) * k, l.sy + (l.ty - l.sy) * k + 3, 5);
      blit(SPR[l.sprite || "pinecone"][0], x, y);
    });
    fx.forEach(drawFx);
    texts.forEach(function (t) { ctx.globalAlpha = Math.min(1, t.life * 3); drawText(t.n, t.x, t.y, "#fdf3de", "c"); });
    ctx.globalAlpha = 1;
    ctx.restore();

    var dusk = Math.min(MAP.night ? 0.2 : 0.28, r.time / 1500) + (MAP.night ? 0.12 : 0);
    if (dusk > 0.01) { ctx.fillStyle = "rgba(20,15,50," + dusk + ")"; ctx.fillRect(0, 0, W, H); }
    if (MAP.night) drawFireflies(r.time);
    if (r.freeze > 0) { ctx.fillStyle = "rgba(160,215,255," + Math.min(0.22, r.freeze * 0.1) + ")"; ctx.fillRect(0, 0, W, H); }
    if (r.flash > 0) { ctx.fillStyle = "rgba(255,250,230," + r.flash * 2 + ")"; ctx.fillRect(0, 0, W, H); }
    drawHud();

    if (joy.active) {
      ctx.fillStyle = "rgba(253,243,222,.18)"; ctx.strokeStyle = "rgba(253,243,222,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(232,135,58,.85)";
      ctx.beginPath(); ctx.arc(joy.x, joy.y, 9, 0, TAU); ctx.fill();
    }
  }
  function drawFireflies(t) {
    for (var i = 0; i < 14; i++) {
      var hx = hash(i, 7), x = ((hx % 1000) / 1000 * W + t * (6 + i % 5) + Math.sin(t + i) * 10) % W, y = ((hash(i, 3) % 1000) / 1000 * H + Math.cos(t * 0.7 + i) * 12 + H) % H;
      var on = Math.sin(t * 3 + i) > -0.2;
      if (!on) continue;
      ctx.fillStyle = "rgba(246,239,122,.25)"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = "#fffbd0"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
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
      // arc tracé du haut vers le bas en passant par le côté frappé (droite ou gauche)
      var t = 1 - f.life / f.max, st = -Math.PI / 2, sweep = Math.PI * Math.min(1, t * 2.5);
      var ccw = f.dir < 0;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - t) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, f.r * 0.85, f.r * 0.7, 0, st, ccw ? st - sweep : st + sweep, ccw); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - t) + ")"; ctx.lineWidth = 1; ctx.stroke();
    } else if (f.kind === "spin") {
      var ts = 1 - f.life / f.max;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - ts) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, f.r * 0.85, f.r * 0.7, 0, ts * TAU, ts * TAU + TAU * 0.8); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - ts) + ")"; ctx.lineWidth = 1; ctx.stroke();
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
  function drawSlots(x, y, list, max, sprOf, isFusion) {
    var S2 = 12;
    for (var i = 0; i < max; i++) {
      var bx = x + i * (S2 + 1), it = list[i];
      var gold = it && isFusion && isFusion(it[0]);
      box(bx, y, S2, S2, it ? (gold ? "#4a3a10" : "#1f3a2b") : "rgba(31,58,43,.45)", it ? (gold ? "#f6d36b" : OUT) : "rgba(43,23,9,.6)");
      if (it) {
        icon(sprOf(it[0]), bx + S2 / 2, y + S2 / 2);
        if (it[1] >= MAX_LVL) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(bx + 1, y + S2 - 2, S2 - 2, 1); }
        drawText(String(it[1]), bx + S2 - 1, y + S2 - 4, it[1] >= MAX_LVL ? "#f6d36b" : "#fdf3de", "c");
      } else {
        ctx.fillStyle = "rgba(253,243,222,.35)"; ctx.fillRect(bx + 5, y + 5, 2, 2);
      }
    }
  }
  function drawHud() {
    var bw = W - 4, ratio = Math.max(0, Math.min(1, xp / xpNext));
    box(2, 2, bw, 9, "#3a2618");
    ctx.fillStyle = "#e0a82a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 7);
    ctx.fillStyle = "#ffe27a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 2);
    drawText("NIV " + r.level, W / 2, 4, "#fdf3de", "c");
    // cases d'armes (haut) et d'objets (bas), 6 chacune
    var wl2 = Object.keys(p.weapons).map(function (id) { return [id, p.weapons[id]]; });
    var pl2 = Object.keys(p.passives).map(function (id) { return [id, p.passives[id]]; });
    drawSlots(2, 14, wl2, MAX_W, function (id) { return ALLW[id].icon; }, function (id) { return ALLW[id].fusion; });
    drawSlots(2, 27, pl2, MAX_P, function (id) { return D.PASSIVES[id].sprite; });
    // PV
    var hpw = MAX_W * 13 - 1, hpr = Math.max(0, p.hp / p.maxHp);
    box(2, 40, hpw, 6, "#3a2618");
    ctx.fillStyle = hpr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(3, 41, Math.round((hpw - 2) * hpr), 4);
    // chrono, ennemis, or (à droite)
    drawText(fmtTime(r.time), W - 4, 15, "#fdf3de", "r", 2);
    var k = String(r.kills), g = String(Math.floor(r.gold));
    drawText(k, W - 4, 29, "#fdf3de", "r"); icon("skull", W - 4 - textWidth(k) - 5, 31);
    drawText(g, W - 4, 37, "#ffe27a", "r"); icon("gold", W - 4 - textWidth(g) - 5, 39);
    // boss
    if (curBoss) {
      var bb = Math.min(160, W - 16), bx = Math.round(W / 2 - bb / 2), by = 56;
      drawText(curBoss.d.name, W / 2, by - 7, "#f6d36b", "c");
      box(bx, by, bb, 7, "#3a2618");
      ctx.fillStyle = "#c8553d"; ctx.fillRect(bx + 1, by + 1, Math.round((bb - 2) * Math.max(0, curBoss.hp / curBoss.maxHp)), 5);
    }
  }

  // fond des menus
  var parade = [];
  function drawIdle(now) {
    var t = now / 1000, m = mapById(S.map);
    drawGround(Math.round(t * 18), Math.round(Math.sin(t * 0.2) * 20), m.ground);
    if (parade.length < 6 && Math.random() < 0.01) {
      var types = m.enemies.map(function (e) { return e[0]; });
      var ty = D.ENEMIES[types[(Math.random() * types.length) | 0]];
      parade.push({ spr: SPR[ty.sprite], x: W + 20, y: H * (0.15 + Math.random() * 0.75), v: 8 + Math.random() * 12, a: Math.random() * 2 });
    }
    parade.forEach(function (q) { q.x -= q.v / 60; q.a += 0.08; blit(q.spr[(q.a | 0) % q.spr.length], q.x, q.y, true); });
    parade = parade.filter(function (q) { return q.x > -30; });
    drawHero(charById(S.char).sprite, W / 2, H * 0.8, 1, true, t * 8, 0);
    ctx.fillStyle = m.night ? "rgba(10,20,15,.4)" : "rgba(30,40,20,.2)";
    ctx.fillRect(0, 0, W, H);
  }

  /* =====================================================================
     Écrans (menus)
     ===================================================================== */
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function score() { return Math.round((Math.floor(r.time) * 10 + r.kills + r.bonus) * DIFF.score); }
  function runGold() { return Math.floor((r.kills * 0.1 + r.time / 6 + r.bosses * 30 + r.level) * p.goldMul + r.gold); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fr(n) { return String(n).replace(".", ","); }
  function showCard(html, name) {
    var same = screen === name && !overlay.hidden;
    var keep = overlay.scrollTop;
    screen = name;
    card.innerHTML = html;
    card.className = "panel game-card game-card-" + name;
    overlay.hidden = false;
    overlay.scrollTop = same ? keep : 0;
    $("[data-hud]").hidden = !(state === "play" || state === "levelup" || state === "pause");
    if (state !== "play" && state !== "levelup") $("[data-toasts]").innerHTML = "";
    if (!same) setTimeout(function () {
      var f = card.querySelector("[data-autofocus]") || card.querySelector("button:not([disabled])");
      if (f && window.matchMedia("(hover: hover)").matches) f.focus({ preventScroll: true });
    }, 30);
  }
  function hideCard() { overlay.hidden = true; $("[data-hud]").hidden = false; }
  function goldBadge() { return '<p class="gold-badge">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></p>"; }
  function back() { return '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="menu">← Retour</button>'; }
  function shopCost(it, lvl) { return Math.round(it.cost * (1 + lvl) * (1 + lvl * 0.25)); }
  function lockText(ach) { var a = achById(ach); return a ? "Succès « " + a.name + " » : " + a.desc : "Verrouillé"; }

  var inspect = { char: null, map: null };
  function charInfo(c) {
    var ok = charAvailable(c), m = c.mods || {}, tags = [];
    if (m.hp) tags.push((m.hp > 0 ? "+" : "") + m.hp + " PV");
    if (m.speed) tags.push((m.speed > 0 ? "+" : "") + Math.round(m.speed * 100) + " % vitesse");
    if (m.might) tags.push("+" + Math.round(m.might * 100) + " % dégâts");
    if (m.armor) tags.push("+" + m.armor + " armure");
    if (m.magnet) tags.push("+" + Math.round(m.magnet * 100) + " % ramassage");
    if (m.cd) tags.push("-" + Math.round(m.cd * 100) + " % recharge");
    if (m.xp) tags.push("+" + Math.round(m.xp * 100) + " % expérience");
    if (m.area) tags.push("+" + Math.round(m.area * 100) + " % zone");
    if (m.amount) tags.push("+" + m.amount + " projectile");
    var w = D.WEAPONS[c.weapon];
    return '<div class="pick-info"><img class="pick-big" src="' + spriteUrl(c.sprite) + '" alt=""><div>' +
      "<strong>" + esc(c.name) + "</strong> <small>" + esc(c.title) + "</small>" +
      "<p>" + esc(c.desc) + "</p>" +
      '<p class="pick-weapon"><img src="' + spriteUrl(w.icon) + '" alt=""> ' + esc(w.name) + "</p>" +
      '<p class="pick-tags">' + esc(tags.length ? tags.join(" · ") : "Aucun bonus ni malus") + "</p>" +
      (ok ? "" : '<p class="pick-lock">🔒 ' + esc(lockText(c.unlock)) + "</p>" +
        '<button class="btn btn-small" type="button" data-action="buychar" data-arg="' + c.id + '"' + (S.gold < c.price ? " disabled" : "") + ">Acheter " + c.price + " " + goldIc() + "</button>") +
      "</div></div>";
  }
  function mapInfo(m) {
    var ok = has(m.unlock);
    return '<div class="pick-info"><span class="map-swatch big" style="background:' + m.ground.base + '"><img src="' + spriteUrl(m.prop) + '" alt=""></span><div>' +
      "<strong>" + esc(m.name) + "</strong><p>" + esc(m.desc) + "</p>" +
      '<p class="pick-tags">Ennemis ×' + fr(m.hp) + " PV · glands d'or ×" + fr(m.gold) + "</p>" +
      (ok ? "" : '<p class="pick-lock">🔒 ' + esc(lockText(m.unlock)) + "</p>") + "</div></div>";
  }

  var SCREENS = {
    menu: function () {
      var nAch = Object.keys(S.ach).length;
      return '<div class="menu-title"><img src="' + spriteUrl(charById(S.char).sprite) + '" alt=""><div><span class="kicker">La forêt contre-attaque</span><h2>Écureuil Survivor</h2></div></div>' +
        goldBadge() +
        '<div class="menu-buttons">' +
        '<button class="btn" type="button" data-action="go" data-arg="play" data-autofocus>▶ Jouer</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="shop">🛒 Améliorations</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="succes">🏆 Succès <small>' + nAch + "/" + D.ACHIEVEMENTS.length + "</small></button>" +
        '<div class="menu-row"><button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="codex">📜 Fusions</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="help">❓ Aide</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="options">⚙️ Options</button></div></div>' +
        (S.stats.runs ? '<p class="game-small">Record : ' + S.stats.bestScore.toLocaleString("fr-FR") + " pts · " + fmtTime(S.stats.bestTime) + " de survie · " + S.stats.runs + " partie" + (S.stats.runs > 1 ? "s" : "") + "</p>" : "") +
        '<p class="game-version">' + VERSION + "</p>";
    },
    play: function () {
      var ic = charById(inspect.char || S.char), im = mapById(inspect.map || S.map);
      var html = '<div class="screen-head">' + back() + "<h2>Nouvelle partie</h2>" + goldBadge() + "</div>";
      html += '<h3 class="pick-title">Écureuil</h3><div class="tile-row">';
      D.CHARACTERS.forEach(function (c) {
        var ok = charAvailable(c);
        html += '<button type="button" class="tile' + (S.char === c.id ? " is-selected" : "") + (ok ? "" : " is-locked") + (ic.id === c.id ? " is-inspected" : "") +
          '" data-action="tchar" data-arg="' + c.id + '" aria-label="' + esc(c.name) + '"><img src="' + spriteUrl(c.sprite) + '" alt="">' + (ok ? "" : "<i>🔒</i>") + "</button>";
      });
      html += "</div>" + charInfo(ic);
      html += '<h3 class="pick-title">Carte</h3><div class="tile-row">';
      D.MAPS.forEach(function (m) {
        var ok = has(m.unlock);
        html += '<button type="button" class="tile tile-map' + (S.map === m.id ? " is-selected" : "") + (ok ? "" : " is-locked") + (im.id === m.id ? " is-inspected" : "") +
          '" data-action="tmap" data-arg="' + m.id + '" aria-label="' + esc(m.name) + '"><span class="map-swatch" style="background:' + m.ground.base + '"><img src="' + spriteUrl(m.prop) + '" alt=""></span><small>' + esc(m.name) + "</small>" + (ok ? "" : "<i>🔒</i>") + "</button>";
      });
      html += "</div>" + mapInfo(im);
      html += '<div class="diff-row"><span>Difficulté :</span>';
      Object.keys(D.DIFFICULTIES).forEach(function (k) {
        var df = D.DIFFICULTIES[k], ok = has(df.unlock);
        html += '<button type="button" class="chip' + (S.diff === k ? " is-on" : "") + '" ' + (ok ? 'data-action="diff" data-arg="' + k + '"' : 'disabled title="' + esc(lockText(df.unlock)) + '"') + ">" +
          (ok ? "" : "🔒 ") + esc(df.name) + (df.gold > 1 ? " · or ×" + fr(df.gold) : "") + "</button>";
      });
      html += '</div><div class="play-bar"><button class="btn" type="button" data-action="start" data-autofocus>▶ Lancer : ' + esc(charById(S.char).name) + " · " + esc(mapById(S.map).name) + "</button></div>";
      return html;
    },
    shop: function () {
      var html = '<div class="screen-head">' + back() + "<h2>Améliorations</h2>" + goldBadge() + '</div><p class="game-small">Bonus permanents, valables pour toutes tes parties.</p><div class="shop-list">';
      D.SHOP.forEach(function (it) {
        var lvl = S.shop[it.id] || 0, max = lvl >= it.max, ok = has(it.unlock), cost = shopCost(it, lvl);
        var pips = "";
        for (var i = 0; i < it.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
        html += '<div class="shop-item' + (ok ? "" : " is-locked") + '"><span class="shop-ic">' + (ok ? it.icon : "🔒") + "</span>" +
          '<div class="shop-text"><strong>' + esc(it.name) + "</strong><span>" + esc(ok ? it.desc : lockText(it.unlock)) + '</span><span class="pips">' + pips + "</span></div>" +
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
    codex: function () {
      var html = '<div class="screen-head">' + back() + '<h2>Fusions</h2></div><p class="game-small">Monte les deux ingrédients au niveau 5 : la fusion apparaît alors dans tes choix (ou sort d\'un coffre). Deux armes fusionnées libèrent une case.</p><div class="shop-list">';
      Object.keys(D.FUSIONS).forEach(function (id) {
        var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], ib = D.WEAPONS[b] ? D.WEAPONS[b].icon : D.PASSIVES[b].sprite;
        html += '<div class="shop-item fusion-row"><span class="shop-ic"><img src="' + spriteUrl(f.icon) + '" alt=""></span>' +
          '<div class="shop-text"><strong>' + esc(f.name) + "</strong><span>" + esc(f.desc[0]) + "</span>" +
          '<span class="fusion-recipe"><img src="' + spriteUrl(ALLW[a].icon) + '" alt=""> ' + esc(ingredientName(a)) + ' + <img src="' + spriteUrl(ib) + '" alt=""> ' + esc(ingredientName(b)) + "</span></div></div>";
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
        '<li class="ctrl-desk"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd>, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches pour courir. Ou clic maintenu : ton écureuil suit la souris.</li>' +
        "<li>📱 Sur mobile, pose le doigt n'importe où sur le jeu : un joystick apparaît.</li>" +
        "<li>Tes <strong>armes tirent toutes seules</strong>. Toi, tu esquives.</li>" +
        "<li>Ramasse les <strong>noisettes</strong> pour monter de niveau : jusqu'à <strong>6 armes et 6 objets</strong>, niveau 5 max.</li>" +
        "<li>Deux ingrédients au niveau 5 = une <strong>fusion</strong> (voir le menu Fusions).</li>" +
        "<li>Casse les <strong>souches, paniers, tas de feuilles</strong>… : aspirateur, pot d'XP, gland explosif, givre, or, baies.</li>" +
        "<li>Chaque minute, une <strong>nuée</strong>. Toutes les 3 minutes, un <strong>boss</strong> qui lâche un coffre.</li>" +
        "<li>Les <strong>succès</strong> débloquent écureuils, cartes, armes et le mode Difficile.</li>" +
        "<li><kbd>Échap</kbd> ou <kbd>P</kbd> : pause.</li></ul>";
    },
  };
  function go(name) { state = "menu"; showCard(SCREENS[name](), name); }

  var ACTIONS = {
    go: function (a) { SND.click(); if (a === "play") { inspect.char = S.char; inspect.map = S.map; } go(a); },
    tchar: function (id) { inspect.char = id; if (charAvailable(charById(id))) S.char = id; save(); SND.click(); go("play"); },
    tmap: function (id) { inspect.map = id; if (has(mapById(id).unlock)) S.map = id; save(); SND.click(); go("play"); },
    diff: function (k) { S.diff = k; save(); SND.click(); go("play"); },
    buychar: function (id) {
      var c = charById(id);
      if (S.gold < c.price || charAvailable(c)) return;
      S.gold -= c.price; S.owned[id] = true; S.char = id; save(); SND.ach(); go("play");
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
      if (!window.confirm("Effacer toute ta progression (or, améliorations, écureuils, succès) ?")) return;
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
    if (ch) { if (state === "levelup") { try { apply(currentChoices[Number(ch.dataset.choice)]); } catch (err) { showError(err); } } return; }
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
    sanitize();
    reset();
    S.stats.played[CH.id] = true; S.stats.maps[MAP.id] = true; save();
    state = "play"; hideCard();
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
    var html = '<h2>Pause</h2><div class="pause-grid"><div><h3>Armes (' + Object.keys(p.weapons).length + "/" + MAX_W + ')</h3><ul class="build-list">';
    Object.keys(p.weapons).forEach(function (k) { html += '<li class="' + (ALLW[k].fusion ? "is-fusion" : "") + '"><img src="' + spriteUrl(ALLW[k].icon) + '" alt="">' + esc(ALLW[k].name) + " <b>niv. " + p.weapons[k] + "</b></li>"; });
    html += '</ul><h3>Objets (' + Object.keys(p.passives).length + "/" + MAX_P + ')</h3><ul class="build-list">';
    Object.keys(p.passives).forEach(function (k) { html += '<li><img src="' + spriteUrl(D.PASSIVES[k].sprite) + '" alt="">' + esc(D.PASSIVES[k].name) + " <b>niv. " + p.passives[k] + "</b></li>"; });
    html += '</ul></div><div><h3>Statistiques</h3><ul class="stat-list">' +
      "<li>PV <b>" + Math.ceil(p.hp) + " / " + p.maxHp + "</b></li>" +
      "<li>Dégâts <b>" + Math.round(p.might * 100) + " %</b></li>" +
      "<li>Vitesse <b>" + Math.round(p.speed / 62 * 100) + " %</b></li>" +
      "<li>Recharge <b>" + Math.round(p.cdMul * 100) + " %</b></li>" +
      "<li>Zone <b>" + Math.round(p.area * 100) + " %</b></li>" +
      "<li>Projectiles <b>+" + p.amount + "</b></li>" +
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
      '<li class="total"><span>Score' + (DIFF.score > 1 ? " (×" + fr(DIFF.score) + ")" : "") + "</span><strong>" + sc.toLocaleString("fr-FR") + "</strong></li>" +
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
      Leaderboard.submit(GAME_ID, name, sc, { time: Math.floor(r.time), kills: r.kills, level: r.level, char: r.char, map: r.map, diff: S.diff }).then(function (res) {
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
    showCard("<h2>Oups, le jeu a planté 🐿️</h2><p>Désolé ! Envoie-moi ce message (" + VERSION + ") :</p>" +
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
      if (state === "play") update(dt);
      if (state === "menu" || !p) drawIdle(now); else draw();
    } catch (err) { showError(err); }
  }

  /* =====================================================================
     Boutons, plein écran, taille
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

  // si le navigateur a gardé un vieux style.css, on le recharge
  try {
    if (getComputedStyle(overlay).position !== "absolute") {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "css/style.css?fresh=" + Date.now();
      document.head.appendChild(l);
    }
  } catch (e) {}
  window.addEventListener("error", function (e) { if (state !== "error" && state !== "menu") showError(e.error || e.message); });

  // outils de test (console) : ES_DEBUG.gold(500), ES_DEBUG.time(170), ES_DEBUG.give("gland", 5)
  window.ES_DEBUG = {
    gold: function (n) { S.gold += n || 500; save(); if (state === "menu") go(screen); },
    time: function (t) { if (r) { r.time = t; nextSwarm = Math.ceil(t / 60) * 60; nextBoss = Math.max(180, Math.ceil(t / 180) * 180); } },
    give: function (id, lvl) { if (!p) return; if (ALLW[id]) p.weapons[id] = lvl || 5; else if (D.PASSIVES[id]) p.passives[id] = lvl || 5; calc(); refreshCounts(); },
    drop: function (kind) { if (p) drop(kind, p.x + 20, p.y); },
    level: function () { if (p) { pending++; } },
    state: function () { return { state: state, screen: screen, level: r && r.level, hp: p && p.hp, kills: r && r.kills, weapons: p && p.weapons, passives: p && p.passives, enemies: enemies && enemies.length }; },
  };

  checkAchievements(null);
  go("menu");
  last = performance.now();
  requestAnimationFrame(loop);
})();
