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
  var VERSION = "0.10.0";
  var TAU = Math.PI * 2;
  var MAX_W = 6, MAX_P = 6, MAX_LVL = 5;
  var SAFE_R = 46;   // rayon de la zone sûre autour d'un joueur qui choisit (coop)

  // armes de base + fusions dans un seul catalogue
  var ALLW = {};
  Object.keys(D.WEAPONS).forEach(function (k) { ALLW[k] = D.WEAPONS[k]; });
  Object.keys(D.FUSIONS).forEach(function (k) { ALLW[k] = D.FUSIONS[k]; ALLW[k].fusion = true; ALLW[k].legend = D.FUSIONS[k].tier === 2; });

  /* =====================================================================
     Sauvegarde
     ===================================================================== */
  var SAVE_KEY = "es-save-v1";
  function defaults() {
    return { gold: 0, shop: {}, ach: {}, owned: { noisette: true }, rank: 1, rankXp: 0, tree: {}, prestige: 0, ppts: 0, pshop: {}, char: "noisette", map: "clairiere", diff: "normal", name: "",
             opts: { sound: true, shake: true, numbers: true },
             stats: { kills: 0, goldEarned: 0, goldSince: 0, runs: 0, bestTime: 0, bestScore: 0, bosses: 0, played: {}, maps: {}, bought: 0 } };
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
      if (!raw.stats || raw.stats.goldSince === undefined) s.stats.goldSince = s.stats.goldEarned || 0;
      s.tree = s.tree || {}; s.pshop = s.pshop || {}; s.ppts = s.ppts || 0;
    }
    return s;
  }
  var S = load();
  var Net = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, status: "",
              roster: [], ev: [], dmgN: 0, acc: 0, inAcc: 0, cur: null, prev: null, lastLevel: 1, started: false, err: "" };
  function netEv(ev) { if (Net.on && Net.role === "host" && Net.started && Net.ev.length < 120) Net.ev.push(ev); }
  function netSend(ev, payload) { if (Net.ch) { try { Net.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  function earnGold(n) { S.gold += n; S.stats.goldEarned += n; S.stats.goldSince = (S.stats.goldSince || 0) + n; }
  function skillById(id) { return D.SKILLS.filter(function (k) { return k.id === id; })[0]; }
  function spentPoints() { var t = 0; Object.keys(S.tree).forEach(function (id) { var k = skillById(id); if (k) t += (S.tree[id] || 0) * k.cost; }); return t; }
  function pu(id) { return (S.pshop || {})[id] || 0; }
  function totalPoints() { return (S.rank - 1) + 2 * pu("points"); }
  function freePoints() { return totalPoints() - spentPoints(); }
  function skillOpen(k) { return (!k.prestige || S.prestige >= k.prestige) && (k.req || []).every(function (id) { return (S.tree[id] || 0) > 0; }); }
  // progression = niveaux de boutique + niveaux de l'arbre (hors compétences d'un prestige pas encore atteint)
  function progressParts() {
    var have = 0, max = 0;
    D.SHOP.forEach(function (it) { have += Math.min(it.max, S.shop[it.id] || 0); max += it.max; });
    D.SKILLS.forEach(function (k) { if (k.prestige && S.prestige < k.prestige) return; have += Math.min(k.max, S.tree[k.id] || 0); max += k.max; });
    return { have: have, max: max, frac: max ? have / max : 0 };
  }
  function prestigeReq() { var P = D.PRESTIGE; return Math.min(P.reqMax, P.reqBase + P.reqStep * S.prestige); }
  function prestigeCost() { var P = D.PRESTIGE; return Math.round(P.costBase * Math.pow(P.costGrowth, S.prestige) / 100) * 100; }
  function prestigeGain() { return Math.floor(D.PRESTIGE.fullPoints * progressParts().frac * (1 + 0.25 * pu("multi"))); }
  function prestigeReady() { return progressParts().frac >= prestigeReq() - 1e-9 && S.gold >= prestigeCost(); }
  function pupCost(it, lvl) { var c = it.costs || D.PRESTIGE.upCosts; return c[Math.min(lvl, c.length - 1)] * (lvl >= c.length ? Math.pow(2, lvl - c.length + 1) : 1); }
  function stars(n) { return n > 0 ? (n > 5 ? "★×" + n : new Array(n + 1).join("★")) : ""; }
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
  var players = [], me = null, picking = false, netMenuOpen = false;
  var p = null, r = null, CH, DIFF, MAP, enemies, projs, hostile, lobs, gems, fx, texts, grid, warns;
  var spawnAcc, nextSwarm, nextBoss, bossCount, shake, uid, achTick, pending, xp, xpNext, propTimer;

  function need(L) { return 5 + (L - 1) * 3 + Math.max(0, L - 15) * 4 + Math.max(0, L - 30) * 8; }
  function V(w, k, l) { var v = w[k]; return Array.isArray(v) ? v[Math.min(l, v.length - 1)] : v; }

  function calc(pl) {
    var p = pl || actingPlayer();
    var m = p.char.mods || {}, sh = p.shop || {}, ps = p.passives, tr = p.tree || {}, pg = p.pshop || {};
    var oldMax = p.maxHp || 0;
    p.maxHp = Math.max(20, 100 + (m.hp || 0) + 10 * (sh.vigueur || 0) + 20 * (ps.appetit || 0) + 10 * (tr.s1 || 0) + 15 * (pg.ecorce || 0));
    p.speed = 62 * (1 + (m.speed || 0) + 0.05 * (sh.celerite || 0) + 0.1 * (ps.pattes || 0));
    p.might = 1 + (m.might || 0) + 0.05 * (sh.force || 0) + 0.1 * (ps.griffes || 0) + 0.04 * (tr.a1 || 0) + 0.08 * (pg.racines || 0);
    p.armor = (m.armor || 0) + (sh.ecorce || 0) + (ps.ecorce || 0) + (tr.s3 || 0);
    p.magnet = 30 * (1 + (m.magnet || 0) + 0.15 * (sh.aimant || 0) + 0.4 * (ps.joues || 0) + 0.1 * (tr.f1 || 0));
    p.cdMul = Math.max(0.4, 1 - (m.cd || 0) - 0.03 * (sh.vivacite || 0) - 0.08 * (ps.vivacite || 0) - 0.03 * (tr.a2 || 0));
    p.xpMul = 1 + (m.xp || 0) + 0.08 * (sh.sagesse || 0) + 0.12 * (ps.savoir || 0) + 0.06 * (tr.f3 || 0) + 0.1 * (pg.seve || 0);
    p.regen = 0.2 * (sh.recup || 0) + 0.4 * (ps.seve || 0) + 0.15 * (tr.s2 || 0);
    p.luck = 1 + 0.15 * (sh.chance || 0) + 0.2 * (ps.trefle || 0);
    p.area = 1 + (m.area || 0) + 0.05 * (sh.zone || 0) + 0.1 * (ps.loupe || 0) + 0.06 * (tr.a3 || 0);
    p.amount = (m.amount || 0) + Math.ceil((ps.poches || 0) / 2) + (tr.a4 || 0);
    p.shieldCd = ps.mousse ? 16 - 2 * ps.mousse : 0;
    p.crit = 0.08 * (tr.a5 || 0); p.rage = !!tr.a6; p.dodge = 0.04 * (tr.s5 || 0); p.taken = tr.s6 ? 0.85 : 1;
    p.goldX = tr.f6 ? 2 : 1; p.extraChoice = tr.f4 ? 1 : 0;
    p.goldMul = (1 + 0.1 * (sh.avarice || 0)) * (1 + 0.08 * (tr.f2 || 0)) * (1 + 0.12 * (pg.tresor || 0)) * DIFF.gold * (MAP.gold || 1);
    if (oldMax && p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
  }

  function actingPlayer() { return p || me; }
  function myId() { return Net.on ? Net.id : "solo"; }
  function reset(roster, mapId, diffId) {
    DIFF = D.DIFFICULTIES[diffId || S.diff] || D.DIFFICULTIES.normal; MAP = mapById(mapId || S.map);
    roster = roster || [{ id: "solo", name: S.name || "Toi", char: S.char, shop: S.shop, tree: S.tree, prestige: S.prestige, pshop: S.pshop }];
    var n = roster.length;
    players = roster.map(function (it, i) {
      var c = charById(it.char);
      var pl = { id: it.id, name: it.name || "Écureuil", char: c, sprite: c.sprite, shop: it.shop || {}, tree: it.tree || {}, prestige: it.prestige || 0, pshop: it.pshop || {}, x: (i - (n - 1) / 2) * 20, y: 0,
                 hp: 0, face: 1, moving: false, anim: 0, inv: 0, weapons: {}, passives: {}, timers: {}, st: {}, consumed: {},
                 shield: false, shieldT: 0, down: false, reviveT: 0, choosing: false, remote: it.id !== myId() };
      pl.tx = pl.x; pl.ty = pl.y;
      pl.weapons[c.weapon] = 1;
      p = pl; calc(pl); pl.hp = pl.maxHp;
      pl.revives = (pl.shop.renaissance || 0) + (pl.tree.s4 || 0); pl.rerolls = pl.shop.relance || 0;
      return pl;
    });
    me = players.filter(function (pl) { return pl.id === myId(); })[0] || players[0];
    me.remote = false; p = me; CH = me.char;
    r = { time: 0, kills: 0, level: 1, bosses: 0, berries: 0, gold: 0, lastHit: 0, maxedWeapon: false, nWeapons: 1, nPassives: 0,
          fusions: 0, legend: 0, biome: -1, props: 0, freeze: 0, flash: 0, hard: (diffId || S.diff) !== "normal", ended: false, committed: false, newAch: [], bonus: 0,
          char: CH.id, map: MAP.id, coop: n > 1 };
    enemies = []; projs = []; hostile = []; lobs = []; gems = []; fx = []; texts = []; warns = [];
    biomeCache = new Map();
    xp = 0; xpNext = need(1); pending = me.tree.f5 ? 1 : 0; picking = false; netMenuOpen = false;
    spawnAcc = 5; nextSwarm = 60; nextBoss = 180; bossCount = 0; shake = 0; uid = 0; achTick = 1; propTimer = 0;
    grid = new Map();
    if (!Net.on || Net.role === "host") for (var i = 0; i < 4; i++) spawnProp(90 + Math.random() * 120);
  }
  function alive() { return players.filter(function (pl) { return !pl.down; }); }
  function randomAlive() { var a = alive(); return a.length ? a[(Math.random() * a.length) | 0] : me; }
  function targetOf(e) {
    var best = null, bd = 1e18, any = null, ad = 1e18;
    for (var i = 0; i < players.length; i++) {
      var pl = players[i]; if (pl.down) continue;
      var d2 = (pl.x - e.x) * (pl.x - e.x) + (pl.y - e.y) * (pl.y - e.y);
      if (!pl.choosing && d2 < bd) { bd = d2; best = pl; }
      if (d2 < ad) { ad = d2; any = pl; }
    }
    return best || any || me;
  }
  function playerById(id) { return players.filter(function (pl) { return pl.id === id; })[0]; }

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
    if (state === "levelup" || picking) {
      var n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
      if (n !== undefined) { var b = card.querySelectorAll("[data-choice]")[n]; if (b) b.click(); }
    }
  });
  window.addEventListener("keyup", function (e) { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  window.addEventListener("blur", function () { clearInput(); if (state === "play" && !Net.on) pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "play" && !Net.on) pause(); });

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
      if (e.under) continue;
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
     Biomes : régions de Voronoï (cellules de ~26 tuiles) avec bords irréguliers
     ===================================================================== */
  var biomeCache = new Map(), BC = 26;
  function biomeAtTile(tx, ty, m) {
    m = m || MAP;
    var key = tx * 100003 + ty;
    if (m === MAP && biomeCache.has(key)) return biomeCache.get(key);
    var jx = tx + ((hash(tx, ty * 3) % 5) - 2) * 0.45, jy = ty + ((hash(tx * 7, ty) % 5) - 2) * 0.45;
    var cx = Math.floor(jx / BC), cy = Math.floor(jy / BC), best = 1e18, bi = 0, n = m.biomes.length;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var gx = cx + dx, gy = cy + dy, h = hash(gx * 31 + 7, gy * 17 + 3);
      var px = (gx + (h % 1000) / 1000) * BC, py = (gy + ((h >>> 10) % 1000) / 1000) * BC;
      var d = (px - jx) * (px - jx) + (py - jy) * (py - jy);
      if (d < best) { best = d; bi = (gx === 0 && gy === 0) ? 0 : (h >>> 20) % n; }
    }
    if (m === MAP) { if (biomeCache.size > 40000) biomeCache.clear(); biomeCache.set(key, bi); }
    return bi;
  }
  function biomeAt(x, y) { return MAP.biomes[biomeAtTile(Math.floor(x / 16), Math.floor(y / 16))]; }

  /* =====================================================================
     Apparitions : ennemis et objets destructibles
     ===================================================================== */
  function hpMul() { return (1 + r.time / 100 + Math.pow(r.time / 300, 2)) * DIFF.hp * (MAP.hp || 1) * (1 + 0.25 * (players.length - 1)); }
  function makeEnemy(type, d, x, y, hp) {
    var e = { id: ++uid, type: type, d: d, spr: SPR[d.sprite], x: x, y: y, hp: hp, maxHp: hp, kx: 0, ky: 0, flash: 0, slowT: 0, slow: 0,
              anim: Math.random() * 2, phase: Math.random() * 6, face: 1, charge: 0, windup: 0, cd: 3, spd: (d.spd || 0) * DIFF.spd, cool: null };
    enemies.push(e);
    return e;
  }
  function spawn(type, ang, dist, around) {
    around = around || randomAlive();
    if (ang === undefined) ang = Math.random() * TAU;
    if (dist === undefined) dist = Math.hypot(W, H) / 2 + 6 + Math.random() * 14;
    var x = around.x + Math.cos(ang) * dist, y = around.y + Math.sin(ang) * dist;
    if (!type) type = pickType(biomeAt(x, y));
    var d = D.ENEMIES[type];
    var hp = d.hp * (d.boss ? (1 + bossCount * 0.9) * (1 + r.time / 200) * DIFF.hp * (MAP.hp || 1) : hpMul());
    var e = makeEnemy(type, d, x, y, hp);
    if (d.ai === "mole") { e.under = true; e.cd = 1; }
    if (d.ai === "spitter" || d.ai === "spiker") e.cd = 1.5 + Math.random() * 2;
    return e;
  }
  var PROP_D = { prop: true, r: 6, spd: 0, dmg: 0, xp: 0, color: "#a06a3e" };
  function spawnProp(dist) {
    var a = Math.random() * TAU, o = randomAlive();
    var x = o.x + Math.cos(a) * dist, y = o.y + Math.sin(a) * dist;
    var d = Object.assign({}, PROP_D, { sprite: biomeAt(x, y).prop || "stump" });
    var e = makeEnemy("prop", d, x, y, 14 * (1 + r.time / 200));
    e.anim = 0;
    return e;
  }
  function pickType(biome) {
    var pool = [], total = 0, list = (biome || MAP.biomes[0]).enemies;
    list.forEach(function (it) {
      if (r.time < it[1]) return;
      var w = it[2] * (1 + Math.min(1.5, (r.time - it[1]) / 120));
      pool.push([it[0], w]); total += w;
    });
    var x = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) return pool[i][0]; }
    return list[0][0];
  }
  function bannerAll(text) { banner(text); netEv(["bn", text]); }
  function banner(text) {
    var b = $("[data-banner]");
    b.textContent = text; b.hidden = false;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }
  function director(dt) {
    var rate = Math.min(14, 1.7 + r.time / 30) * DIFF.spawn * (1 + 0.6 * (players.length - 1));
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < 290) spawn(); }
    if (r.time >= nextSwarm) {
      nextSwarm += 60;
      var n = 18 + Math.floor(r.time / 60) * 6;
      var idx = r.time < 150 ? 0 : (r.time < 300 ? 1 : (r.time < 480 ? 2 : 3));
      var type = MAP.swarm[Math.min(idx, MAP.swarm.length - 1)];
      var R = Math.hypot(W, H) / 2 + 8, around = randomAlive();
      for (var i = 0; i < n; i++) spawn(type, i / n * TAU, R, around);
      bannerAll("Une nuée approche !");
    }
    if (r.time >= nextBoss) {
      nextBoss += 180;
      var bt = MAP.bosses[bossCount % MAP.bosses.length];
      spawn(bt);
      bossCount++;
      bannerAll(D.ENEMIES[bt].name + " arrive !");
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
    var crit = p.crit && Math.random() < p.crit;
    dmg = dmg * p.might * (0.9 + Math.random() * 0.2) * (crit ? 2 : 1) * (p.rage && p.hp < p.maxHp * 0.3 ? 1.25 : 1);
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = 0.1;
    if (!e.d.prop) {
      var kb = e.d.boss ? 0.12 : 1;
      e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    }
    if (S.opts.numbers && texts.length < 60) texts.push({ x: e.x + (Math.random() * 6 - 3), y: e.y - e.d.r - 6, n: dmg, life: 0.6 });
    if (Net.dmgN < 30) { Net.dmgN++; netEv(["d", Math.round(e.x), Math.round(e.y - e.d.r - 6), dmg]); }
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
    if (e.d.ai === "bomber") { e.byPlayer = true; explodeEnemy(e.x, e.y, e.d.blastR, 30); }
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
    if (n >= 5) netEv(["k", Math.round(x), Math.round(y), color, n]);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 20 + Math.random() * 50;
      fx.push({ kind: "dot", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color: color });
    }
  }
  function damagePlayer(dmg, pl) {
    var p = pl || me;
    if (p.inv > 0 || p.down || p.choosing) return;
    if (p.shield) {
      p.shield = false; p.shieldT = p.shieldCd; p.inv = 0.5;
      burst(p.x, p.y, "#9cc56b", 10); SND.crack();
      return;
    }
    if (p.dodge && Math.random() < p.dodge) { p.inv = 0.3; if (S.opts.numbers) texts.push({ x: p.x, y: p.y - 14, n: "ESQUIVE", life: 0.6 }); return; }
    p.hp -= Math.max(1, (dmg - p.armor) * (p.taken || 1)); p.inv = 0.6;
    if (p === me) { r.lastHit = r.time; if (S.opts.shake) shake = 0.25; SND.hurt(); }
    burst(p.x, p.y, "#c8553d", 5);
  }
  function warn(x, y, rad, dur, dmg, owner, follow) {
    warns.push({ x: x, y: y, r: rad, t: 0, dur: dur, dmg: dmg, owner: owner || null, follow: !!follow });
  }
  function hostileShot(x, y, ang, spd, dmg) {
    hostile.push({ x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 4, dmg: dmg });
  }
  function ring(x, y, rad, red) {
    fx.push({ kind: "ring", x: x, y: y, r: rad, life: 0.25, max: 0.25, red: !!red });
    netEv(["x", Math.round(x), Math.round(y), Math.round(rad), red ? 1 : 0]);
  }
  function explodeEnemy(x, y, rad, dmg) {
    ring(x, y, rad, true);
    burst(x, y, "#c8553d", 10);
    near(x, y, rad + 12, function (en) {
      if (en.d.boss || Math.hypot(en.x - x, en.y - y) > rad + en.d.r) return;
      hurt(en, dmg, (en.x - x) * 3, (en.y - y) * 3);
    });
    SND.boom();
  }
  function enemyAI(e, d, dx, dy, dt) {
    var ai = e.d.ai, ang = Math.atan2(dy, dx);
    if (ai === "bomber") {
      if (e.fuse > 0) {
        e.fuse -= dt; e.flash = Math.sin(e.fuse * 40) > 0 ? 0.05 : 0;
        if (e.fuse <= 0) { e.dead = true; e.exploded = true; burst(e.x, e.y, "#c8553d", 12); SND.boom(); }
        return 0;
      }
      if (d < 22 && r.freeze <= 0) { e.fuse = 0.8; warn(e.x, e.y, e.d.blastR, 0.8, e.d.blast, e, true); return 0; }
    } else if (ai === "spitter") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 150 && r.freeze <= 0) { e.cd = 2.4; hostileShot(e.x, e.y - 2, ang, 75, e.d.shot); SND.whip(); }
      if (d < 60) return -0.8;
      if (d < 95) return 0.15;
    } else if (ai === "spiker") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 110 && r.freeze <= 0) {
        e.cd = 4; var off = Math.random();
        for (var k = 0; k < 8; k++) hostileShot(e.x, e.y, off + k / 8 * TAU, 55, e.d.shot);
        SND.whip();
      }
    } else if (ai === "mole") {
      if (e.under) {
        e.cd -= dt;
        if (d < 26 && e.cd <= 0 && !e.digging) { e.digging = 0.9; warn(e.x, e.y, e.d.blastR, 0.9, e.d.blast, e); }
        if (e.digging) {
          e.digging -= dt;
          if (e.digging <= 0) { e.digging = 0; e.under = false; e.upT = 2.2; burst(e.x, e.y, "#8a5a3b", 10); }
          return 0;
        }
        return 1;
      }
      e.upT -= dt;
      if (e.upT <= 0) { e.under = true; e.cd = 1.5; }
      return 0;
    }
    return 1;
  }
  function updateWarns(dt) {
    for (var i = warns.length - 1; i >= 0; i--) {
      var w = warns[i];
      if (w.follow && w.owner && !w.owner.dead) { w.x = w.owner.x; w.y = w.owner.y; }
      w.t += dt;
      if (w.owner && w.owner.dead && w.owner.byPlayer) { warns.splice(i, 1); continue; }
      if (w.t >= w.dur) {
        warns.splice(i, 1);
        ring(w.x, w.y, w.r, true);
        players.forEach(function (pl) { if (Math.hypot(pl.x - w.x, (pl.y - w.y) * 1.25) <= w.r + 3) damagePlayer(w.dmg, pl); });
      }
    }
  }
  function inView(e, m) { return Math.abs(e.x - p.x) < W / 2 + (m || 0) && Math.abs(e.y - p.y) < H / 2 + (m || 0); }
  function nearAnyPlayer(e, rad) { return players.some(function (pl) { return Math.abs(e.x - pl.x) < rad && Math.abs(e.y - pl.y) < rad; }); }
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
      var e = enemies[i]; if (e.dead || e.d.prop || e.under) continue;
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
    ring(x, y, rad, false);
    burst(x, y, "#e8873a", 6);
    near(x, y, rad + 12, function (en) {
      var ddx = en.x - x, ddy = en.y - y;
      if (Math.hypot(ddx, ddy) <= rad + en.d.r) hurt(en, dmg, ddx * 3, ddy * 3);
    });
    for (var i = 0; i < (frag || 0); i++) {
      var a = i / frag * TAU + Math.random() * 0.5, dd = rad * (0.9 + Math.random() * 0.5);
      lobs.push({ sx: x, sy: y, tx: x + Math.cos(a) * dd, ty: y + Math.sin(a) * dd * 0.8, t: 0, dur: 0.22, dmg: dmg * 0.35, rad: rad * 0.45, frag: 0, small: true, owner: p });
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
    netEv(["bo", pts.map(function (q) { return [Math.round(q[0]), Math.round(q[1])]; })]);
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
        projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y - 2, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, life: range / spd * 1.4, hit: [], r: 4, explode: w.explodeR ? V(w, "explodeR", l) * p.area : 0 });
      }
      if (w.spread) SND.shot();
    },
    whip: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var dirs = V(w, "both", l) ? [1, -1] : [p.face], R = V(w, "r", l) * p.area, dmg = V(w, "dmg", l);
      dirs.forEach(function (dir) {
        fx.push({ kind: "swipe", dir: dir, r: R, life: 0.18, max: 0.18, pl: p }); netEv(["sw", p.id, dir, Math.round(R)]);
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
      fx.push({ kind: "spin", r: R, life: 0.25, max: 0.25, pl: p }); netEv(["sp", p.id, Math.round(R)]);
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
      if (w.shootCd && timer(id + "#leaf", w.shootCd, dt)) {
        for (var q = 0; q < n; q++) {
          var qa = p.st[id] + q / n * TAU, qx = p.x + Math.cos(qa) * R, qy = p.y + Math.sin(qa) * R * 0.8;
          projs.push({ owner: p, kind: "bullet", x: qx, y: qy, vx: Math.cos(qa) * 90, vy: Math.sin(qa) * 90, dmg: V(w, "leafDmg", l), pierce: 2,
                       sprite: "autumnleaf", anim: true, homing: true, life: 1.6, hit: [], r: 4 });
        }
      }
    },
    radial: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, spd = w.spd || 105;
      p.st[id] = (p.st[id] || 0) + 0.45;
      for (var m = 0; m < n; m++) {
        var la = p.st[id] + m / n * TAU;
        projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y, vx: Math.cos(la) * spd, vy: Math.sin(la) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, anim: true, homing: !!w.homing, life: w.homing ? 2 : 1.1, hit: [], r: 4 });
      }
    },
    lob: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var cand = nearest(12, 130), n = V(w, "n", l) + p.amount;
      for (var k = 0; k < n; k++) {
        var tgt = cand.length ? cand[(Math.random() * cand.length) | 0] : null;
        var tx = tgt ? tgt.x : p.x + (Math.random() * 120 - 60), ty = tgt ? tgt.y : p.y + (Math.random() * 80 - 40);
        lobs.push({ owner: p, sx: p.x, sy: p.y, tx: tx, ty: ty, t: 0, dur: 0.55 + k * 0.08, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area,
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
      if (w.spinCd && timer(id + "#spin", w.spinCd, dt)) {
        var sd = V(w, "spinDmg", l);
        fx.push({ kind: "spin", r: R, life: 0.3, max: 0.3, pl: p }); netEv(["sp", p.id, Math.round(R)]);
        near(p.x, p.y, R + 10, function (e) { if (Math.hypot(e.x - p.x, e.y - p.y) <= R + e.d.r) hurt(e, sd, 0, 0); });
        SND.whip();
      }
    },
    boomerang: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, ft = nearest(n, 180);
      for (var i = 0; i < n; i++) {
        var fe = ft[i];
        var fa = fe ? Math.atan2(fe.y - p.y, fe.x - p.x) : (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.6;
        projs.push({ owner: p, kind: "boomerang", x: p.x, y: p.y, vx: Math.cos(fa), vy: Math.sin(fa), dmg: V(w, "dmg", l), pierce: 999, sprite: w.sprite,
                     life: 4, range: V(w, "range", l) * p.area, dist: 0, back: false, chain: V(w, "chain", l) || 0, zapT: 0 });
      }
    },
    chain: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var starts = nearest(12, 150), bolts = V(w, "bolts", l) + p.amount;
      for (var b = 0; b < bolts && starts.length; b++) zapChain(starts.splice((Math.random() * starts.length) | 0, 1)[0], V(w, "chain", l), V(w, "dmg", l));
      SND.zap();
    },
    storm: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var vis = enemies.filter(function (e) { return !e.dead && !e.d.prop && !e.under && inView(e, -4); });
      var n = V(w, "strikes", l) + p.amount;
      for (var i = 0; i < n && vis.length; i++) {
        var t = vis.splice((Math.random() * vis.length) | 0, 1)[0];
        zapChain(t, V(w, "chain", l), V(w, "dmg", l), { x: t.x + (Math.random() * 20 - 10), y: t.y - 90 });
      }
      if (S.opts.shake) shake = Math.max(shake, 0.08);
      SND.zap();
    },
    meteor: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var vis = enemies.filter(function (e) { return !e.dead && !e.d.prop && !e.under && inView(e, -4); });
      var n = V(w, "n", l) + p.amount;
      for (var k = 0; k < n; k++) {
        var t = vis.length ? vis[(Math.random() * vis.length) | 0] : null;
        var tx = t ? t.x : p.x + (Math.random() - 0.5) * W * 0.8, ty = t ? t.y : p.y + (Math.random() - 0.5) * H * 0.8;
        lobs.push({ owner: p, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.6 + k * 0.07, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area, frag: w.frag || 0, sprite: "meteore", sky: true });
      }
    },
    rocket: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, t = nearest(n, 200);
      for (var i = 0; i < n; i++) {
        var a = (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.5 - Math.PI / 2 * 0.6;
        projs.push({ owner: p, kind: "rocket", x: p.x, y: p.y - 3, ang: a, spd: 40, max: w.spd || 120, target: t[i % Math.max(1, t.length)] || null,
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
      var bOk = ALLW[b] ? (p.weapons[b] || 0) >= MAX_LVL : (p.passives[b] || 0) >= MAX_LVL;
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
      if (p.weapons[k] || !weaponAvailable(k) || p.consumed[k]) return;
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
      else if (k === b && ALLW[b]) return;
      else neww[k] = p.weapons[k];
    });
    p.weapons = neww;
    p.consumed[a] = true; if (ALLW[b]) p.consumed[b] = true;
    delete p.timers[a]; delete p.timers[b];
    burst(p.x, p.y, "#f6d36b", 24);
    if (p === me) {
      r.fusions++; if (f.tier === 2) r.legend++;
      banner((f.tier === 2 ? "Légendaire : " : "Fusion : ") + f.name + " !");
      SND.fusion();
    }
  }
  function iconOf(k) { return ALLW[k] ? ALLW[k].icon : (D.PASSIVES[k] ? D.PASSIVES[k].sprite : "nut"); }
  function owns(k) { return ALLW[k] ? !!p.weapons[k] : !!p.passives[k]; }
  function lvlOf(k) { return ALLW[k] ? (p.weapons[k] || 0) : (p.passives[k] || 0); }
  function img(name, cls) { return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + spriteUrl(name) + '" alt="">'; }
  // fusions dont « k » est un ingrédient
  function synergies(k) {
    var out = [];
    Object.keys(D.FUSIONS).forEach(function (id) {
      var f = D.FUSIONS[id], i = f.from.indexOf(k);
      if (i < 0 || p.weapons[id] || p.consumed[id]) return;
      out.push({ id: id, partner: f.from[1 - i] });
    });
    return out;
  }
  function synHtml(k) {
    var list = synergies(k);
    if (!list.length) return "";
    return '<span class="syn">' + list.slice(0, 2).map(function (s) {
      var have = owns(s.partner), f = D.FUSIONS[s.id];
      return '<span class="syn-row' + (have ? " have" : "") + '">🔗 ' + img(iconOf(s.partner)) + esc(ingredientName(s.partner)) +
        (have ? " (niv. " + lvlOf(s.partner) + "/5)" : "") + " → " + img(f.icon) + "<b>" + esc(f.name) + "</b></span>";
    }).join("") + "</span>";
  }
  function recipeHtml(id) {
    var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], bw = !!ALLW[b];
    return '<span class="recipe">' + img(iconOf(a)) + " + " + img(iconOf(b)) + " → " + img(f.icon) + "</span>" +
      '<span class="replace">Remplace <b>' + esc(ingredientName(a)) + "</b>" + (bw ? " et <b>" + esc(ingredientName(b)) + "</b> (libère une case)" : " · <b>" + esc(ingredientName(b)) + "</b> reste") + "</span>";
  }
  var currentChoices = [];
  function openLevelUp() {
    p = me;
    if (players.length > 1) { picking = true; me.choosing = true; sendInput(); } else state = "levelup";
    clearInput();
    currentChoices = choices(3 + (me.extraChoice || 0) + (p.luck > 1.3 && Math.random() < 0.3 ? 1 : 0));
    var html = '<span class="kicker">Niveau ' + r.level + " !</span><h2>Choisis un pouvoir</h2><div class=\"choices\">";
    currentChoices.forEach(function (c, i) {
      var icon, name, lvl = "", desc, cls = "choice", extra = "";
      if (c.type === "f") {
        var f = D.FUSIONS[c.id];
        icon = img(f.icon); name = f.name; lvl = f.tier === 2 ? "Fusion légendaire !" : "Fusion !"; cls += f.tier === 2 ? " is-fusion is-legend" : " is-fusion";
        desc = f.desc[0]; extra = recipeHtml(c.id) + synHtml(c.id);
      } else if (c.type === "w") {
        var w = ALLW[c.id];
        icon = img(w.icon); name = w.name;
        lvl = c.lvl === 1 ? "Nouvelle arme" : "Niv. " + c.lvl; desc = w.desc[c.lvl - 1];
        if (w.fusion) cls += w.legend ? " is-fusion is-legend" : " is-fusion";
        extra = synHtml(c.id);
      } else if (c.type === "p") {
        icon = img(D.PASSIVES[c.id].sprite); name = D.PASSIVES[c.id].name;
        lvl = c.lvl === 1 ? "Nouvel objet" : "Niv. " + c.lvl; desc = D.PASSIVES[c.id].desc;
        extra = synHtml(c.id);
      } else if (c.type === "heal") {
        icon = img("berry"); name = "Panier de baies"; desc = "Soigne 40 PV.";
      } else {
        icon = img("goldbag"); name = "Bourse de glands"; desc = "+15 glands d'or.";
      }
      html += '<button type="button" class="' + cls + '" data-choice="' + i + '"><span class="choice-key">' + (i + 1) + "</span>" +
        '<span class="choice-icon">' + icon + "</span>" +
        '<span class="choice-text"><strong>' + esc(name) + "</strong>" + (lvl ? "<em>" + lvl + "</em>" : "") + "<span>" + esc(desc) + "</span>" + extra + "</span></button>";
    });
    html += '</div><div class="btn-row center">';
    if (me.rerolls > 0) html += '<button class="btn btn-alt btn-small" type="button" data-action="reroll">🎲 Relancer (' + me.rerolls + ")</button>";
    html += '<button class="btn btn-ghost btn-small" type="button" data-action="skip">Passer (+3 ' + goldIc() + ")</button></div>";
    showCard(html, "levelup");
    SND.level();
  }
  function refreshCounts() {
    r.nWeapons = Object.keys(p.weapons).length; r.nPassives = Object.keys(p.passives).length;
    r.maxedWeapon = r.maxedWeapon || Object.keys(p.weapons).some(function (k) { return p.weapons[k] >= MAX_LVL; });
  }
  // applique un choix au joueur actif « p » (moi, ou un invité côté hôte)
  function applyCore(c) {
    if (c.type === "f") applyFusion(c.id);
    else if (c.type === "w") p.weapons[c.id] = c.lvl;
    else if (c.type === "p") { p.passives[c.id] = c.lvl; if (c.id === "appetit") p.hp += 20; if (c.id === "mousse" && c.lvl === 1) p.shield = true; }
    else if (c.type === "heal") p.hp += 40;
    else if (c.type === "skip") addGold(3);
    else if (c.type === "gold") addGold(15);
    calc(p);
  }
  function apply(c) {
    if ((state !== "levelup" && !picking) || !c) return;
    p = me;
    applyCore(c);
    refreshCounts();
    if (Net.on && Net.role === "guest") netSend("pick", { id: me.id, c: { type: c.type, id: c.id, lvl: c.lvl } });
    afterChoice();
  }
  function afterChoice() {
    pending = Math.max(0, pending - 1);
    if (pending > 0) { openLevelUp(); return; }
    if (picking) { picking = false; me.choosing = false; hideCard(); sendInput(); }
    else { state = "play"; hideCard(); last = performance.now(); }
  }
  function addGold(n) { r.gold += n * p.goldMul; }

  /* =====================================================================
     Succès
     ===================================================================== */
  var EMPTY_RUN = { time: 0, kills: 0, level: 0, bosses: 0, berries: 0, lastHit: 0, fusions: 0, props: 0 };
  function totals(run) {
    var s = S.stats;
    return { kills: s.kills + (run && !run.committed ? run.kills : 0), goldEarned: s.goldEarned, played: s.played, maps: s.maps, bought: s.bought,
             rank: S.rank, prestige: S.prestige, spent: spentPoints() };
  }
  function checkAchievements(run) {
    var t = totals(run), got = [];
    D.ACHIEVEMENTS.forEach(function (a) {
      if (S.ach[a.id]) return;
      var ok = false;
      try { ok = a.check(run || EMPTY_RUN, t); } catch (e) {}
      if (!ok) return;
      S.ach[a.id] = Date.now();
      earnGold(a.gold);
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
  function moveMe(dt) {
    var v = (me.down || me.choosing || netMenuOpen) ? { x: 0, y: 0 } : inputVector();
    me.x += v.x * me.speed * dt; me.y += v.y * me.speed * dt;
    me.moving = Math.abs(v.x) + Math.abs(v.y) > 0.05;
    if (v.x > 0.1) me.face = 1; else if (v.x < -0.1) me.face = -1;
  }
  function tickPlayers(dt) {
    players.forEach(function (pl) {
      if (pl.remote) {
        var k = Math.min(1, dt * 12);
        pl.x += (pl.tx - pl.x) * k; pl.y += (pl.ty - pl.y) * k;
      }
      pl.anim += dt * (pl.moving || SPR[pl.sprite].flying ? 8 : 0);
      pl.inv -= dt;
      if (pl.down) return;
      if (pl.regen) pl.hp = Math.min(pl.maxHp, pl.hp + pl.regen * dt);
      if (pl.shieldCd && !pl.shield) { pl.shieldT -= dt; if (pl.shieldT <= 0) pl.shield = true; }
    });
  }
  function update(dt) {
    r.time += dt;
    moveMe(dt);
    tickPlayers(dt);
    r.freeze = Math.max(0, r.freeze - dt); r.flash = Math.max(0, r.flash - dt);

    var bi = biomeAtTile(Math.floor(me.x / 16), Math.floor(me.y / 16));
    if (bi !== r.biome) { if (r.biome >= 0) banner(MAP.biomes[bi].name); r.biome = bi; }

    director(dt);
    buildGrid();
    players.forEach(function (pl) { if (pl.down) return; p = pl; weapons(dt); });
    p = me;

    var zones = players.length > 1 ? players.filter(function (pl) { return pl.choosing && !pl.down; }) : [];
    var i, e, boss = null;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      var tg = targetOf(e);
      var dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.flash -= dt;
      if (e.d.prop) { if (!nearAnyPlayer(e, 480)) e.dead = true; continue; }
      var sp = e.spd * (e.slowT > 0 ? 1 - e.slow : 1);
      if (r.freeze > 0) sp *= e.d.boss ? 0.5 : 0;
      e.slowT -= dt; e.anim += dt * (e.type === "wasp" || e.type === "moth" ? 14 : 5) * (r.freeze > 0 && !e.d.boss ? 0 : 1);
      var mx = dx / d, my = dy / d;
      if (e.d.ai) { var f = enemyAI(e, d, dx, dy, dt); if (e.dead) continue; sp *= Math.abs(f); if (f < 0) { mx = -mx; my = -my; } else if (f > 0 && f < 1) { var t2 = mx; mx = -my; my = t2; } }
      if (e.d.move === "wobble") { var s = Math.sin(r.time * (e.type === "wasp" ? 6 : 3) + e.phase) * 0.7; var px = -my * s, py = mx * s; mx += px; my += py; }
      else if (e.d.move === "hop") sp *= 0.25 + 1.6 * Math.max(0, Math.sin(r.time * 6 + e.phase));
      if (e.type === "boar") {
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 135 * (r.freeze > 0 ? 0.5 : 1); if (e.charge <= 0) warn(e.x, e.y, 34, 0.5, 18, e); }
        else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.9; e.cx = dx / d; e.cy = dy / d; SND.boom(); } }
        else { e.cd -= dt; if (e.cd <= 0 && d < 170) { e.windup = 0.6; e.cd = 3.5; } }
      } else if (e.type === "owl") {
        if (d < 70) { var tx = -mx * 0.6 - my * 0.8, ty = -my * 0.6 + mx * 0.8; mx = tx; my = ty; }
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 3.2;
          var n = 10 + bossCount * 2, off = Math.random();
          for (var k = 0; k < n; k++) hostileShot(e.x, e.y, off + k / n * TAU, 55, 12);
          SND.whip();
        }
      }
      if (e.d.boss && !boss) boss = e;
      e.x += mx * sp * dt + e.kx * dt; e.y += my * sp * dt + e.ky * dt;
      var damp = Math.pow(0.0005, dt); e.kx *= damp; e.ky *= damp;
      // zone sûre : les ennemis restent au bord, sauf s'ils poursuivent un autre joueur qui s'y trouve
      for (var z = 0; z < zones.length; z++) {
        var zp = zones[z], zx = e.x - zp.x, zy = e.y - zp.y, zd = Math.hypot(zx, zy) || 0.01, lim = SAFE_R + e.d.r;
        if (zd >= lim) continue;
        var chasing = tg !== zp && !tg.choosing && Math.hypot(tg.x - zp.x, tg.y - zp.y) < SAFE_R + 4;
        if (chasing) continue;
        e.x = zp.x + zx / zd * lim; e.y = zp.y + zy / zd * lim;
        if (e.charge > 0) e.charge = 0;
      }
      if (Math.abs(mx) > 0.1) e.face = mx > 0 ? 1 : -1;
      if (!e.under) for (var j = 0; j < players.length; j++) {
        var pl = players[j];
        if (Math.abs(pl.x - e.x) < e.d.r + 5 && Math.abs(pl.y - e.y) < e.d.r + 5) damagePlayer(e.d.dmg, pl);
      }
      if (d > 420 && !e.d.boss) { var ra = Math.atan2(dy, dx) + (Math.random() - 0.5), R = Math.hypot(W, H) / 2 + 10; e.x = tg.x + Math.cos(ra) * R; e.y = tg.y + Math.sin(ra) * R; }
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
    updateWarns(dt);
    for (i = hostile.length - 1; i >= 0; i--) {
      var hq = hostile[i];
      hq.x += hq.vx * dt; hq.y += hq.vy * dt; hq.life -= dt;
      for (var h2 = 0; h2 < players.length; h2++) {
        var hp = players[h2];
        if (!hp.down && Math.abs(hq.x - hp.x) < 5 && Math.abs(hq.y - hp.y) < 6) { damagePlayer(hq.dmg, hp); hq.life = 0; break; }
      }
      if (hq.life <= 0) hostile.splice(i, 1);
    }
    // joueurs à terre, renaissance, relève par un coéquipier
    for (i = 0; i < players.length; i++) {
      var pd = players[i];
      if (pd.down) {
        var helped = players.some(function (o) { return o !== pd && !o.down && Math.hypot(o.x - pd.x, o.y - pd.y) < 22; });
        pd.reviveT = helped ? pd.reviveT + dt : Math.max(0, pd.reviveT - dt * 0.5);
        if (pd.reviveT >= 3) { pd.down = false; pd.hp = pd.maxHp * 0.4; pd.inv = 2; pd.reviveT = 0; bannerAll(pd.name + " est relevé !"); }
        continue;
      }
      if (pd.hp > 0) continue;
      if (pd.revives > 0) {
        pd.revives--; pd.hp = pd.maxHp * 0.5; pd.inv = 2;
        near(pd.x, pd.y, 70, function (en) { if (en.d.prop) return; var ax = en.x - pd.x, ay = en.y - pd.y, ad = Math.hypot(ax, ay) || 1; en.kx += ax / ad * 260; en.ky += ay / ad * 260; });
        burst(pd.x, pd.y, "#f29a85", 24); if (pd === me) { banner("Renaissance !"); SND.level(); }
      } else if (players.length === 1) { gameOver(); return; }
      else { pd.down = true; pd.hp = 0; pd.reviveT = 0; bannerAll(pd.name + " est à terre ! Va le relever"); }
    }
    if (players.length > 1 && !alive().length) { gameOver(); return; }

    for (i = projs.length - 1; i >= 0; i--) {
      var q = projs[i];
      p = q.owner || me;
      if (q.kind === "boomerang") updateBoomerang(q, dt);
      else if (q.kind === "rocket") updateRocket(q, dt);
      else updateBullet(q, dt);
      if (q.life <= 0 || q.pierce <= 0) projs.splice(i, 1);
    }
    for (i = lobs.length - 1; i >= 0; i--) {
      var l = lobs[i]; l.t += dt;
      if (l.t >= l.dur) { lobs.splice(i, 1); p = l.owner || me; explode(l.tx, l.ty, l.rad, l.dmg, l.frag); }
    }
    p = me;
    enemies = enemies.filter(function (en) { return !en.dead; });
    curBoss = boss && !boss.dead ? boss : null;

    // ramassage : chaque objet va vers le joueur debout le plus proche
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], best = null, bd = 1e9;
      for (var g2 = 0; g2 < players.length; g2++) {
        var gp = players[g2]; if (gp.down) continue;
        var dd2 = Math.hypot(gp.x - g.x, gp.y - g.y);
        if (dd2 < bd) { bd = dd2; best = gp; }
      }
      if (!best) continue;
      var gx = best.x - g.x, gy = best.y - g.y, gd = bd;
      if (gd > 0.5 && (g.pull || gd < best.magnet)) {
        g.pull = (g.pull || 60) + 260 * dt;
        var stp = Math.min(gd, g.pull * dt);
        g.x += gx / gd * stp; g.y += gy / gd * stp;
      }
      if (gd < 7) { gems.splice(i, 1); p = best; collect(g, best); p = me; }
      else if (gd > 600 && (g.kind === "xp" || g.kind === "gold")) gems.splice(i, 1);
    }
    while (xp >= xpNext) { xp -= xpNext; r.level++; pending++; xpNext = need(r.level); }

    tickFx(dt);
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(r); }
    if (pending > 0 && !picking && !me.down && state === "play") openLevelUp();
    if (Net.on) netHostTick(dt);
  }
  function tickFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.life -= dt;
      if (f.kind === "dot") { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (f.life <= 0) fx.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 18 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    shake = Math.max(0, shake - dt);
  }
  function grantChest() {
    p = me;
    var ready = readyFusions();
    if (ready.length) { applyFusion(ready[0]); calc(me); refreshCounts(); if (Net.on && Net.role === "guest") netSend("pick", { id: me.id, c: { type: "f", id: ready[0] } }); }
    else pending++;
  }
  function collect(g, pl) {
    pl = pl || me;
    switch (g.kind) {
      case "xp": xp += g.v * pl.xpMul; if (pl === me) SND.pick(); break;
      case "gold": addGold(g.v * (pl.goldX || 1)); if (pl === me) SND.gold(); break;
      case "berry": pl.hp = Math.min(pl.maxHp, pl.hp + 25); if (pl === me) { r.berries++; SND.level(); } break;
      case "magnet": gems.forEach(function (o) { if (o.kind === "xp" || o.kind === "gold") o.pull = 120; }); bannerAll("Aspirateur à noisettes !"); SND.level(); break;
      case "xpjar": xp += xpNext * 0.75; bannerAll("Pot d'expérience !"); SND.level(); break;
      case "goldbag": addGold(8 + Math.floor(r.time / 30)); SND.gold(); break;
      case "freeze": r.freeze = 5; bannerAll("Givre !"); SND.zap(); break;
      case "bomb": nuke(); bannerAll("Gland explosif !"); break;
      case "chest":
        addGold(15); burst(pl.x, pl.y, "#f2c230", 16);
        netEv(["ch"]);
        grantChest();
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
      if (q.explode) { explode(q.x, q.y, q.explode, q.dmg * 0.6, 0); q.pierce = 0; }
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
  function drawDecor(kind, G, sx, sy, ox, oy, h) {
    if (kind === "bush") {
      ctx.fillStyle = G.bush; ctx.fillRect(sx + ox - 2, sy + oy + 1, 9, 4); ctx.fillRect(sx + ox - 1, sy + oy - 1, 7, 3);
      ctx.fillStyle = G.bushHi; ctx.fillRect(sx + ox, sy + oy - 1, 3, 1); ctx.fillRect(sx + ox + 3, sy + oy + 1, 2, 1);
    } else if (kind === "bigshroom") {
      ctx.fillStyle = (h >>> 5) % 2 ? "#c8553d" : "#9a7fd1"; ctx.fillRect(sx + ox - 1, sy + oy, 7, 2); ctx.fillRect(sx + ox, sy + oy - 1, 5, 1);
      ctx.fillStyle = "#fdf3de"; ctx.fillRect(sx + ox + 1, sy + oy, 1, 1); ctx.fillRect(sx + ox + 4, sy + oy + 1, 1, 1);
      ctx.fillStyle = "#f3e1c0"; ctx.fillRect(sx + ox + 2, sy + oy + 2, 2, 3);
    } else if (kind === "water" || kind === "pond") {
      var big = kind === "pond" ? 2 : 1;
      ctx.fillStyle = G.water; ctx.fillRect(sx + ox - 2 * big, sy + oy + 1, 10 * big, 4 + big); ctx.fillRect(sx + ox, sy + oy, 6 * big, 6 + big);
      ctx.fillStyle = G.waterHi; ctx.fillRect(sx + ox + 1, sy + oy + 1, 3, 1);
    } else if (kind === "reeds") {
      ctx.fillStyle = G.reed; ctx.fillRect(sx + ox, sy + oy - 3, 1, 7); ctx.fillRect(sx + ox + 2, sy + oy - 5, 1, 9); ctx.fillRect(sx + ox + 4, sy + oy - 2, 1, 6);
      ctx.fillStyle = G.reedHi; ctx.fillRect(sx + ox + 2, sy + oy - 6, 1, 2); ctx.fillRect(sx + ox, sy + oy - 4, 1, 2);
    } else if (kind === "rock") {
      ctx.fillStyle = OUT; ctx.fillRect(sx + ox - 1, sy + oy + 3, 8, 1);
      ctx.fillStyle = G.rock; ctx.fillRect(sx + ox - 1, sy + oy, 8, 3); ctx.fillRect(sx + ox, sy + oy - 1, 6, 1);
      ctx.fillStyle = G.rockHi; ctx.fillRect(sx + ox, sy + oy - 1, 3, 1);
    }
  }
  function drawGround(cx, cy, M) {
    var T = 16;
    var tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(W / T) + 2, ty1 = ty0 + Math.ceil(H / T) + 2;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var B = M.biomes[biomeAtTile(tx, ty, M)], G = B.ground;
      var sx = Math.round(tx * T - cx), sy = Math.round(ty * T - cy);
      ctx.fillStyle = hash(tx >> 2, ty >> 2) % 3 === 0 ? G.patch : G.base; ctx.fillRect(sx, sy, T, T);
    }
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) {
      B = M.biomes[biomeAtTile(tx, ty, M)]; G = B.ground;
      sx = Math.round(tx * T - cx); sy = Math.round(ty * T - cy);
      var h = hash(tx, ty), k = h % 23, ox = (h >>> 8) % 12, oy = (h >>> 12) % 12;
      if (B.decor && (k === 12 || k === 13 || (B.decor === "pond" && k >= 9 && k <= 11))) { drawDecor(B.decor, G, sx, sy, ox, oy, h); continue; }
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
  var MATE_COL = ["#f6d36b", "#7fd1c7", "#f29ad8", "#9cc56b"];
  function mateColor(pl) { return MATE_COL[Math.max(0, players.indexOf(pl)) % MATE_COL.length]; }
  function drawPlayer(pl) {
    var multi = players.length > 1;
    if (pl.down) {
      shadow(pl.x, pl.y + 6, 10);
      ctx.globalAlpha = 0.55; blit(SPR[pl.sprite][0], pl.x, pl.y + 2, pl.face < 0, true); ctx.globalAlpha = 1;
      var k = Math.min(1, pl.reviveT / 3);
      ctx.strokeStyle = "rgba(255,90,60,.9)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 22, 18, 0, 0, TAU); ctx.stroke();
      if (k > 0) { ctx.strokeStyle = "#9cc56b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, pl.y - 14, 5, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); }
      drawText("!", pl.x, pl.y - 18 + Math.sin(r.time * 8), "#ff5a3a", "c");
    } else {
      drawHero(pl.sprite, pl.x, pl.y, pl.face, pl.moving, pl.anim, pl.inv);
      if (pl.shield) { ctx.strokeStyle = "rgba(156,197,107,.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 10, 9, 0, 0, TAU); ctx.stroke(); }
      if (pl.choosing) {
        ctx.fillStyle = "rgba(230,246,250,.18)"; ctx.strokeStyle = "rgba(230,246,250,.8)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y - 2, 13, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (multi) {
          ctx.fillStyle = "rgba(127,209,199,.10)"; ctx.strokeStyle = "rgba(127,209,199,.85)";
          ctx.setLineDash([4, 3]); ctx.lineDashOffset = -r.time * 15;
          ctx.beginPath(); ctx.arc(pl.x, pl.y, SAFE_R, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.setLineDash([]);
          drawText("ZONE SURE", pl.x, pl.y - SAFE_R - 7, "#7fd1c7", "c");
        }
      }
    }
    // barre de vie sous chaque écureuil
    var hb = 16, hr = Math.max(0, pl.hp / (pl.maxHp || 1));
    ctx.fillStyle = OUT; ctx.fillRect(Math.round(pl.x - hb / 2 - 1), Math.round(pl.y + 9), hb + 2, 4);
    ctx.fillStyle = "#4a2e1c"; ctx.fillRect(Math.round(pl.x - hb / 2), Math.round(pl.y + 10), hb, 2);
    ctx.fillStyle = hr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(Math.round(pl.x - hb / 2), Math.round(pl.y + 10), Math.round(hb * hr), 2);
    if (multi && pl !== me) drawText(String(pl.name).slice(0, 10), pl.x, pl.y - 20, mateColor(pl), "c");
  }
  // flèches vers les coéquipiers hors de l'écran
  function drawMates(cx, cy) {
    players.forEach(function (pl) {
      if (pl === me) return;
      var sx = pl.x - cx, sy = pl.y - cy;
      if (sx > 4 && sx < W - 4 && sy > 50 && sy < H - 4) return;
      var mx = W / 2, my = H / 2, ang = Math.atan2(sy - my, sx - mx);
      var ex = Math.max(8, Math.min(W - 8, mx + Math.cos(ang) * W)), ey = Math.max(56, Math.min(H - 8, my + Math.sin(ang) * H));
      ctx.fillStyle = pl.down ? "#ff5a3a" : mateColor(pl);
      ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    });
  }
  var AURA = {
    spore: { fill: "rgba(122,90,190,.13)", dot: "spore" },
    force: { fill: "rgba(127,209,199,.12)", ring: "rgba(127,209,199,.75)" },
    mist: { fill: "rgba(150,120,210,.16)", ring: "rgba(127,209,199,.5)", dot: "spore" },
    hurricane: { fill: "rgba(160,200,230,.14)", ring: "rgba(230,255,248,.7)", dot: "leaf" },
  };
  function drawAuras(p) {
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
  function drawOrbits(p) {
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
    var cam = me.down ? (alive()[0] || me) : me;
    var cx = Math.round(cam.x - W / 2 + sx), cy = Math.round(cam.y - H / 2 + sy);
    drawGround(cx, cy, MAP);
    ctx.save();
    ctx.translate(-cx, -cy);

    var bob = Math.sin(r.time * 4);
    gems.forEach(function (g) {
      var s = g.kind === "xp" ? (g.v >= 3 ? SPR.bignut[0] : SPR.nut[0]) : (SPR[g.kind] || SPR.nut)[0];
      var big = g.kind !== "xp" && g.kind !== "gold";
      if (big) { ctx.fillStyle = "rgba(255,240,180,.25)"; ctx.fillRect(Math.round(g.x - 5), Math.round(g.y - 5 + bob), 10, 10); }
      blit(s, g.x, g.y + (big ? bob * 1.5 : 0));
    });
    players.forEach(function (pl) { if (!pl.down) drawAuras(pl); });
    warns.forEach(function (w) {
      var k = Math.min(1, w.t / w.dur), blink = Math.sin(r.time * 30) > 0 ? 0.08 : 0;
      ctx.fillStyle = "rgba(208,40,26," + (0.12 + blink) + ")";
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(208,40,26,.35)";
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * k, w.r * 0.8 * k, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ff5a3a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.8, 0, 0, TAU); ctx.stroke();
    });

    enemies.sort(function (a, b) { return a.y - b.y; });
    var plist = players.slice().sort(function (a, b) { return a.y - b.y; }), pi = 0;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      while (pi < plist.length && plist[pi].y <= e.y) drawPlayer(plist[pi++]);
      if (e.x < cx - 30 || e.x > cx + W + 30 || e.y < cy - 30 || e.y > cy + H + 30) continue;
      if (e.under) { blit(SPR.mound[((r.time * 8) | 0) % 2], e.x, e.y + 2); continue; }
      var spr = e.spr[(e.anim | 0) % e.spr.length];
      if (!e.spr.flying) shadow(e.x, e.y + spr.h / 2 - 2, spr.w * 0.7);
      else shadow(e.x, e.y + spr.h / 2 + 3, spr.w * 0.5);
      blit(spr, e.x, e.y, !e.d.prop && e.face < 0, e.flash > 0);
      if (e.slowT > 0 && !e.d.boss && !e.d.prop) { ctx.fillStyle = "rgba(160,130,230,.7)"; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - spr.h / 2 - 2), 2, 2); }
    }
    while (pi < plist.length) drawPlayer(plist[pi++]);

    players.forEach(function (pl) { if (!pl.down) drawOrbits(pl); });
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
    hostile.forEach(function (q) {
      ctx.fillStyle = "rgba(255,60,30,.35)"; ctx.fillRect(Math.round(q.x) - 4, Math.round(q.y) - 4, 8, 8);
      ctx.fillStyle = "rgba(255,60,30,.25)"; ctx.fillRect(Math.round(q.x - q.vx * 0.06) - 2, Math.round(q.y - q.vy * 0.06) - 2, 4, 4);
      blit(SPR.hshot[0], q.x, q.y);
    });
    lobs.forEach(function (l) {
      var k = l.t / l.dur, x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k - (l.sky ? (1 - k) * 110 : Math.sin(k * Math.PI) * (l.small ? 8 : 30));
      if (l.sky) {
        ctx.strokeStyle = "rgba(255,120,40,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(l.tx, l.ty, l.rad * k, l.rad * 0.8 * k, 0, 0, TAU); ctx.stroke();
        fx.push({ kind: "dot", x: x + Math.random() * 4 - 2, y: y - 4, vx: 0, vy: -10, life: 0.2, color: "#f6b468" });
      }
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
    if (players.length > 1) drawMates(cx, cy);
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
      ctx.strokeStyle = f.red ? "rgba(255,70,40," + (1 - k) + ")" : "rgba(242,176,94," + (1 - k) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6) * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(255,226,122," + (0.35 * (1 - k)) + ")"; ctx.fill();
    } else if (f.kind === "swipe") {
      // arc tracé du haut vers le bas en passant par le côté frappé (droite ou gauche)
      var t = 1 - f.life / f.max, st = -Math.PI / 2, sweep = Math.PI * Math.min(1, t * 2.5);
      var ccw = f.dir < 0;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - t) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse((f.pl || me).x, (f.pl || me).y, f.r * 0.85, f.r * 0.7, 0, st, ccw ? st - sweep : st + sweep, ccw); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - t) + ")"; ctx.lineWidth = 1; ctx.stroke();
    } else if (f.kind === "spin") {
      var ts = 1 - f.life / f.max;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - ts) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse((f.pl || me).x, (f.pl || me).y, f.r * 0.85, f.r * 0.7, 0, ts * TAU, ts * TAU + TAU * 0.8); ctx.stroke();
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
  function drawSlots(x, y, list, max, sprOf, isFusion, ready) {
    var S2 = 12;
    for (var i = 0; i < max; i++) {
      var bx = x + i * (S2 + 1), it = list[i];
      var gold = it && isFusion && isFusion(it[0]);
      if (it && ready[it[0]] && Math.sin(r.time * 10) > 0) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(bx - 1, y - 1, S2 + 2, S2 + 2); }
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
    var ready = {};
    readyFusions().forEach(function (id) { D.FUSIONS[id].from.forEach(function (k) { ready[k] = true; }); });
    drawSlots(2, 14, wl2, MAX_W, function (id) { return ALLW[id].icon; }, function (id) { return ALLW[id].fusion; }, ready);
    drawSlots(2, 27, pl2, MAX_P, function (id) { return D.PASSIVES[id].sprite; }, null, ready);
    if (Object.keys(ready).length && Math.sin(r.time * 6) > -0.3) drawText("FUSION PRETE", 2 + MAX_W * 13 + 3, 30, "#f6d36b", "l");
    // PV
    var hpw = MAX_W * 13 - 1, hpr = Math.max(0, me.hp / (me.maxHp || 1));
    box(2, 40, hpw, 6, "#3a2618");
    ctx.fillStyle = hpr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(3, 41, Math.round((hpw - 2) * hpr), 4);
    // coéquipiers (sous les cases)
    if (players.length > 1) {
      var yy = 50;
      players.forEach(function (pl) {
        if (pl === me) return;
        drawText(String(pl.name).slice(0, 8), 2, yy, pl.down ? "#ff5a3a" : mateColor(pl), "l");
        box(36, yy, 30, 5, "#3a2618");
        ctx.fillStyle = pl.down ? "#ff5a3a" : "#9cc56b"; ctx.fillRect(37, yy + 1, Math.round(28 * Math.max(0, pl.hp / (pl.maxHp || 1))), 3);
        yy += 8;
      });
    }
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
    drawGround(Math.round(t * 18), Math.round(Math.sin(t * 0.2) * 20), m);
    if (parade.length < 6 && Math.random() < 0.01) {
      var types = m.biomes[(Math.random() * m.biomes.length) | 0].enemies.map(function (e) { return e[0]; });
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
  function rankBadge() {
    var need = D.rankNeed(S.rank), k = Math.min(100, Math.round(S.rankXp / need * 100));
    return '<div class="rank-badge"><span>Rang <b>' + S.rank + "</b>" + (S.prestige ? ' <span class="stars">' + stars(S.prestige) + "</span>" : "") + '</span><span class="rank-bar"><i style="width:' + k + '%"></i></span><small>' + S.rankXp + " / " + need + " XP</small></div>";
  }
  function goldBadge() { return '<p class="gold-badge">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></p>"; }
  function back() { return '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="menu">← Retour</button>'; }
  function iconOfAny(k) { return ALLW[k] ? ALLW[k].icon : (D.PASSIVES[k] ? D.PASSIVES[k].sprite : "nut"); }
  function shopCost(it, lvl) { return Math.round(it.cost * (1 + lvl) * (1 + lvl * 0.25)); }
  function lockText(ach) { var a = achById(ach); return a ? "Succès « " + a.name + " » : " + a.desc : "Verrouillé"; }

  var inspect = { char: null, map: null };
  /* ---------- arbre de compétences en tentacules (SVG) ---------- */
  var treeSel = "a1";
  function branchOf(k) { return D.SKILL_BRANCHES.filter(function (b) { return b.id === k.branch; })[0]; }
  function tPos(k) {
    var br = branchOf(k), d = k.pos[0], o = k.pos[1], rad = 44 + d * 38;
    var th = (br.angle + d * 9) * Math.PI / 180 + o * 30 / rad;
    return { x: Math.cos(th) * rad, y: Math.sin(th) * rad };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function tentaclePath(a, b, depth, seed) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var wig = (seed % 2 ? 1 : -1) * Math.min(18, len * 0.28);
    var cx = mx - dy / len * wig, cy = my + dx / len * wig;
    return { d: "M" + f1(a.x) + " " + f1(a.y) + " Q" + f1(cx) + " " + f1(cy) + " " + f1(b.x) + " " + f1(b.y), cx: cx, cy: cy };
  }
  function qpt(a, c, b, t) { var u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; }
  function nodeSvg(k, sel) {
    var pt = tPos(k), br = branchOf(k), lvl = S.tree[k.id] || 0, open = skillOpen(k), max = lvl >= k.max;
    var can = open && !max && freePoints() >= k.cost;
    var cls = "tnode" + (lvl ? " on" : "") + (max ? " max" : "") + (open ? "" : " off") + (can ? " can" : "") + (sel.id === k.id ? " sel" : "");
    var pips = "";
    for (var i = 0; i < k.max; i++) {
      var a = Math.PI / 2 + (i - (k.max - 1) / 2) * 0.42;
      pips += '<circle class="pip' + (i < lvl ? " on" : "") + '" cx="' + f1(Math.cos(a) * 19) + '" cy="' + f1(Math.sin(a) * 19) + '" r="2.4"/>';
    }
    return '<g class="' + cls + '" data-action="tsel" data-arg="' + k.id + '" transform="translate(' + f1(pt.x) + " " + f1(pt.y) + ')" style="--br:' + br.color + '" role="button" aria-label="' + esc(k.name) + '">' +
      '<circle class="hit" r="20"/><circle class="halo" r="17"/><circle class="disc" r="14"/>' + pips +
      '<text class="ic" y="5">' + (open ? k.icon : "🔒") + "</text></g>";
  }
  function tentacleSvg(sel) {
    var out = "", root = { x: 0, y: 0 }, seed = 0;
    D.SKILL_BRANCHES.forEach(function (br, bi) {
      var g = "", gc = "", gn = "";
      var list = D.SKILLS.filter(function (k) { return k.branch === br.id; });
      list.forEach(function (k) {
        var to = tPos(k), lvl = S.tree[k.id] || 0, open = skillOpen(k);
        var parents = k.req && k.req.length ? k.req.map(function (id) { return tPos(skillById(id)); }) : [root];
        parents.forEach(function (from) {
          seed++;
          var w = Math.max(2.5, 9 - k.pos[0] * 1.6), q = tentaclePath(from, to, k.pos[0], seed);
          var st = lvl ? "on" : (open ? "open" : "off");
          g += '<path class="tent ' + st + '" d="' + q.d + '" stroke-width="' + f1(w) + '"/>';
          [0.3, 0.55, 0.8].forEach(function (t) {
            var c = qpt(from, { x: q.cx, y: q.cy }, to, t);
            gc += '<circle class="cup ' + st + '" cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(Math.max(1.2, w * 0.28)) + '"/>';
          });
        });
        gn += nodeSvg(k, sel);
      });
      var la = (br.angle + 28) * Math.PI / 180, lp = { x: Math.cos(la) * 50, y: Math.sin(la) * 50 };
      out += '<g class="tentacle" style="--br:' + br.color + ";animation-duration:" + (5 + bi) + "s;animation-delay:-" + (bi * 2) + 's">' + g + gc + gn +
        '<text class="br-label" x="' + f1(lp.x) + '" y="' + f1(lp.y + 3) + '" style="fill:' + br.color + '">' + esc(br.name.toUpperCase()) + "</text></g>";
    });
    var acorn = '<image href="' + spriteUrl("goldacorn") + '" x="-11" y="-12" width="22" height="24" style="image-rendering:pixelated"/>';
    return '<svg class="tentacles" viewBox="-215 -215 430 430" xmlns="http://www.w3.org/2000/svg">' + out +
      '<g class="troot"><circle r="20"/>' + acorn + "</g></svg>";
  }
  function skillPanel(k) {
    var br = branchOf(k), lvl = S.tree[k.id] || 0, open = skillOpen(k), max = lvl >= k.max, can = open && !max && freePoints() >= k.cost;
    var pips = ""; for (var i = 0; i < k.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
    var lock = !open ? (k.prestige && S.prestige < k.prestige ? "Prestige " + k.prestige + " requis" : "Nécessite " + (k.req || []).map(function (id) { return skillById(id).name; }).join(" + ")) : "";
    return '<div class="skill-panel" style="--br:' + br.color + '"><span class="skill-ic">' + (open ? k.icon : "🔒") + "</span>" +
      '<div class="skill-text"><small style="color:' + br.color + '">' + esc(br.name) + "</small><strong>" + esc(k.name) + "</strong><span>" + esc(k.desc) + "</span>" +
      '<span class="pips">' + pips + "</span>" + (lock ? '<span class="skill-lock">' + esc(lock) + "</span>" : "") + "</div>" +
      (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="learn" data-arg="' + k.id + '"' + (can ? "" : " disabled") + ">Apprendre · " + k.cost + " pt</button>") + "</div>";
  }
  function swatch(m, cls) {
    return '<span class="map-swatch ' + (cls || "") + '">' + m.biomes.map(function (b) { return '<i style="background:' + b.ground.base + '"></i>'; }).join("") +
      '<img src="' + spriteUrl(m.biomes[0].prop) + '" alt=""></span>';
  }
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
    return '<div class="pick-info">' + swatch(m, "big") + "<div>" +
      "<strong>" + esc(m.name) + "</strong><p>" + esc(m.desc) + "</p>" +
      '<p class="pick-tags">Biomes : ' + esc(m.biomes.map(function (b) { return b.name; }).join(", ")) + "</p>" +
      '<p class="pick-tags">Ennemis ×' + fr(m.hp) + " PV · glands d'or ×" + fr(m.gold) + "</p>" +
      (ok ? "" : '<p class="pick-lock">🔒 ' + esc(lockText(m.unlock)) + "</p>") + "</div></div>";
  }

  var SCREENS = {
    menu: function () {
      var nAch = Object.keys(S.ach).length;
      return '<div class="menu-title"><img src="' + spriteUrl(charById(S.char).sprite) + '" alt=""><div><span class="kicker">La forêt contre-attaque</span><h2>Écureuil Survivor</h2></div></div>' +
        goldBadge() + rankBadge() +
        '<div class="menu-buttons">' +
        '<button class="btn" type="button" data-action="go" data-arg="play" data-autofocus>▶ Jouer</button>' +
        '<button class="btn" type="button" data-action="go" data-arg="coop">🌐 Coop en ligne</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="shop">🛒 Améliorations</button>' +
        '<button class="btn btn-alt" type="button" data-action="go" data-arg="succes">🏆 Succès <small>' + nAch + "/" + D.ACHIEVEMENTS.length + "</small></button>" +
        '<div class="menu-row"><button class="btn btn-alt btn-small" type="button" data-action="go" data-arg="tree">🌳 Compétences' + (freePoints() > 0 ? ' <span class="pill">' + freePoints() + "</span>" : "") + "</button>" +
        '<button class="btn btn-alt btn-small" type="button" data-action="go" data-arg="prestige">✨ Prestige' + (prestigeReady() ? ' <span class="pill">!</span>' : "") + "</button></div>" +
        '<div class="menu-row"><button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="codex">📜 Fusions</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="help">❓ Aide</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="options">⚙️ Options</button></div>' +
        '<button class="btn btn-ghost btn-small" type="button" data-action="fullscreen">' + (isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran") + "</button></div>" +
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
          '" data-action="tmap" data-arg="' + m.id + '" aria-label="' + esc(m.name) + '">' + swatch(m) + "<small>" + esc(m.name) + "</small>" + (ok ? "" : '<i class="lock">🔒</i>') + "</button>";
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
    coop: function () {
      return '<div class="screen-head">' + back() + "<h2>Coop en ligne</h2></div>" +
        '<p class="game-small">2 à 4 écureuils, chacun sur son téléphone ou son ordi. Niveaux partagés, chacun choisit ses pouvoirs. Un joueur à terre se relève si un coéquipier reste à côté de lui 3 secondes.</p>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        '<div class="coop-form"><label for="es-coop-name">Ton pseudo</label><input id="es-coop-name" data-coop-name type="text" maxlength="16" autocomplete="nickname" placeholder="Pseudo" value="' + esc(S.name || "") + '">' +
        '<button class="btn" type="button" data-action="coophost">➕ Créer un salon</button>' +
        '<div class="coop-join"><input data-coop-code type="text" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="CODE" value="' + esc(Net.pendingCode || "") + '">' +
        '<button class="btn btn-alt" type="button" data-action="coopjoin">Rejoindre</button></div></div>';
    },
    lobby: function () {
      if (!Net.on) return SCREENS.coop();
      var host = Net.role === "host", ok = Net.status === "SUBSCRIBED";
      var hp = Net.roster.filter(function (x) { return x.host; })[0];
      var html = '<div class="screen-head"><button class="btn btn-ghost btn-small" type="button" data-action="leave">← Quitter</button><h2>Salon</h2>' + goldBadge() + "</div>" +
        '<div class="room-code"><span>Code du salon</span><b>' + esc(Net.code) + '</b><button class="btn btn-alt btn-small" type="button" data-action="invite">📨 Inviter</button></div>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        (!ok ? '<p class="game-small">Connexion au salon… (' + esc(Net.status || "") + ")</p>" : "") +
        '<ul class="room-players">';
      Net.roster.slice(0, 4).forEach(function (x) {
        html += "<li>" + img(charById(x.char).sprite) + "<b>" + esc(x.name || "Écureuil") + "</b>" + (x.prog && x.prog.pr ? ' <span class="stars">' + stars(x.prog.pr) + "</span>" : "") + (x.host ? " 👑" : "") + (x.id === Net.id ? " <small>(toi)</small>" : "") + "</li>";
      });
      if (!Net.roster.length) html += "<li><small>En attente…</small></li>";
      html += "</ul><h3 class=\"pick-title\">Ton écureuil</h3><div class=\"tile-row\">";
      D.CHARACTERS.forEach(function (c) {
        if (!charAvailable(c)) return;
        html += '<button type="button" class="tile' + (S.char === c.id ? " is-selected" : "") + '" data-action="lchar" data-arg="' + c.id + '" aria-label="' + esc(c.name) + '">' + img(c.sprite) + "</button>";
      });
      html += "</div>" + charInfo(charById(S.char));
      if (host) {
        html += '<h3 class="pick-title">Carte</h3><div class="tile-row">';
        D.MAPS.forEach(function (m) {
          if (!has(m.unlock)) return;
          html += '<button type="button" class="tile tile-map' + (S.map === m.id ? " is-selected" : "") + '" data-action="lmap" data-arg="' + m.id + '">' + swatch(m) + "<small>" + esc(m.name) + "</small></button>";
        });
        html += '</div><div class="diff-row"><span>Difficulté :</span>';
        Object.keys(D.DIFFICULTIES).forEach(function (k) {
          var df = D.DIFFICULTIES[k]; if (!has(df.unlock)) return;
          html += '<button type="button" class="chip' + (S.diff === k ? " is-on" : "") + '" data-action="ldiff" data-arg="' + k + '">' + esc(df.name) + "</button>";
        });
        html += '</div><div class="play-bar"><button class="btn" type="button" data-action="start"' + (ok ? "" : " disabled") + ">▶ Lancer la partie (" + Math.max(1, Math.min(4, Net.roster.length)) + " joueur" + (Net.roster.length > 1 ? "s" : "") + ")</button></div>";
      } else {
        var m = hp ? mapById(hp.map) : null;
        html += '<p class="game-small">' + (m ? "Carte : <b>" + esc(m.name) + "</b> · " + esc((D.DIFFICULTIES[hp.diff] || {}).name || "") + " (choisies par l'hôte)" : "") + "</p>" +
          '<div class="play-bar"><span class="waiting">' + (hp ? "En attente du lancement par " + esc(hp.name) + "…" : "En attente de l'hôte…") + "</span></div>";
      }
      return html;
    },
    tree: function () {
      var sel = skillById(treeSel) || D.SKILLS[0];
      var html = '<div class="screen-head">' + back() + '<h2>Compétences</h2><p class="gold-badge">🌳 <b>' + freePoints() + "</b> pt" + (freePoints() > 1 ? "s" : "") + "</p></div>" + rankBadge();
      html += '<div class="tentacles-wrap">' + tentacleSvg(sel) + "</div>";
      html += skillPanel(sel);
      html += '<p class="game-small">1 point par rang gagné, +2 par niveau de « Graines de savoir » (prestige). <button class="link-btn" type="button" data-action="respec">Réinitialiser l\'arbre (gratuit)</button></p>';
      return html;
    },
    prestige: function () {
      var n = S.prestige, pp = progressParts(), req = prestigeReq(), cost = prestigeCost();
      var okProg = pp.frac >= req - 1e-9, okGold = S.gold >= cost, needLv = Math.ceil(req * pp.max - 1e-9);
      var html = '<div class="screen-head">' + back() + '<h2>Prestige</h2><p class="gold-badge">✨ <b>' + S.ppts.toLocaleString("fr-FR") + "</b></p></div>" +
        '<div class="prestige-head"><span class="stars big">' + (n ? stars(n) : "☆") + "</span><b>Prestige " + n + "</b></div>" +
        '<h3 class="pick-title">Prochain prestige</h3>' +
        '<div class="prestige-progress' + (okProg ? " is-ok" : "") + '"><span>' + (okProg ? "✅" : "⬜") + " Progression débloquée : " + Math.floor(pp.frac * 100) + " % (requis : " + Math.ceil(req * 100) + " %)</span>" +
          '<span class="rank-bar req-bar" style="--req:' + (req * 100) + '%"><i style="width:' + Math.round(pp.frac * 100) + '%"></i></span>' +
          "<small>" + pp.have + " / " + pp.max + " niveaux (boutique + arbre) · il en faut " + needLv +
          (okProg ? "" : ' · <button class="link-btn" type="button" data-action="go" data-arg="shop">boutique</button> · <button class="link-btn" type="button" data-action="go" data-arg="tree">arbre</button>') + "</small></div>" +
        '<div class="prestige-progress' + (okGold ? " is-ok" : "") + '"><span>' + (okGold ? "✅" : "⬜") + " " + cost.toLocaleString("fr-FR") + " glands d\'or (consommés)</span>" +
          '<span class="rank-bar"><i style="width:' + Math.min(100, Math.round(S.gold / cost * 100)) + '%"></i></span><small>' + S.gold.toLocaleString("fr-FR") + " / " + cost.toLocaleString("fr-FR") + "</small></div>" +
        '<p class="prestige-gain">Gain si tu fais le prestige maintenant : <b>+' + prestigeGain().toLocaleString("fr-FR") + " ✨</b>" +
          '<small>Tout débloqué = ' + D.PRESTIGE.fullPoints.toLocaleString("fr-FR") + " ✨" + (pu("multi") ? " · multiplicateur ×" + fr(1 + 0.25 * pu("multi")) : "") + "</small></p>" +
        '<div class="prestige-rules"><p><b>Tout repart à zéro :</b> glands d\'or, améliorations, rang, arbre de compétences' + (pu("memoire") ? "" : ", succès, écureuils et cartes débloqués") + ", statistiques.</p>" +
        "<p><b>Conservé :</b> niveau de prestige, points ✨ et améliorations de prestige" + (pu("memoire") ? ", succès, écureuils et cartes" : "") + ", records, pseudo et options.</p></div>" +
        '<div class="btn-row center"><button class="btn" type="button" data-action="doprestige"' + (prestigeReady() ? "" : " disabled") + ">✨ Faire un prestige (+" + prestigeGain().toLocaleString("fr-FR") + ")</button></div>" +
        '<h3 class="pick-title">Améliorations de prestige</h3><p class="game-small">Permanentes : elles ne sont jamais remises à zéro.</p><div class="shop-list">';
      D.PRESTIGE_SHOP.forEach(function (it) {
        var lvl = pu(it.id), max = lvl >= it.max, c = pupCost(it, lvl), pips = "";
        for (var i = 0; i < it.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
        html += '<div class="shop-item pshop-item"><span class="shop-ic">' + it.icon + '</span><div class="shop-text"><strong>' + esc(it.name) + "</strong><span>" + esc(it.desc) + (it.max > 1 ? " par niveau" : "") + '</span><span class="pips">' + pips + "</span></div>" +
          (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="pbuy" data-arg="' + it.id + '"' + (S.ppts < c ? " disabled" : "") + ">" + c.toLocaleString("fr-FR") + " ✨</button>") + "</div>";
      });
      return html + "</div>";
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
      var html = '<div class="screen-head">' + back() + '<h2>Fusions</h2></div><p class="game-small">Monte les deux ingrédients au niveau 5 : la fusion apparaît alors dans tes choix (ou sort d\'un coffre). Deux armes fusionnées libèrent une case. Les fusions <b>légendaires</b> se font à partir de fusions au niveau 5.</p><div class="shop-list">';
      Object.keys(D.FUSIONS).forEach(function (id) {
        var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], ib = iconOfAny(b);
        html += '<div class="shop-item fusion-row' + (f.tier === 2 ? " is-legend" : "") + '"><span class="shop-ic"><img src="' + spriteUrl(f.icon) + '" alt=""></span>' +
          '<div class="shop-text"><strong>' + esc(f.name) + (f.tier === 2 ? ' <em class="legend-tag">Légendaire</em>' : "") + "</strong><span>" + esc(f.desc[0]) + "</span>" +
          '<span class="fusion-recipe"><img src="' + spriteUrl(iconOfAny(a)) + '" alt=""> ' + esc(ingredientName(a)) + ' + <img src="' + spriteUrl(ib) + '" alt=""> ' + esc(ingredientName(b)) + "</span></div></div>";
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
  function readCoopName() {
    var inp = card.querySelector("[data-coop-name]"), name = (inp ? inp.value : S.name || "").trim();
    if (name.length < 2) { Net.err = "Choisis un pseudo d'au moins 2 caractères."; go("coop"); return false; }
    S.name = name.slice(0, 16); save(); return true;
  }

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
    tsel: function (id) { treeSel = id; SND.click(); go("tree"); },
    pbuy: function (id) {
      var it = D.PRESTIGE_SHOP.filter(function (x) { return x.id === id; })[0]; if (!it) return;
      var lvl = pu(id), c = pupCost(it, lvl);
      if (lvl >= it.max || S.ppts < c) return;
      S.ppts -= c; S.pshop[id] = lvl + 1; save(); SND.fusion(); go("prestige");
    },
    learn: function (id) {
      var k = skillById(id); if (!k) return;
      var lvl = S.tree[id] || 0;
      if (lvl >= k.max || !skillOpen(k) || freePoints() < k.cost) return;
      S.tree[id] = lvl + 1; treeSel = id; save(); SND.gold(); checkAchievements(null); go("tree");
    },
    respec: function () {
      if (!spentPoints() || !window.confirm("Rendre tous tes points de compétence ?")) return;
      S.tree = {}; save(); go("tree");
    },
    doprestige: function () {
      if (!prestigeReady()) return;
      var gain = prestigeGain();
      if (!window.confirm("Faire un prestige et gagner " + gain + " points de prestige ? Tout repart à zéro (or, améliorations, rang, compétences" + (pu("memoire") ? "" : ", succès, écureuils, cartes") + ").")) return;
      var keep = { name: S.name, opts: S.opts, prestige: S.prestige + 1, ppts: S.ppts + gain, pshop: S.pshop, runs: S.stats.runs, bestTime: S.stats.bestTime, bestScore: S.stats.bestScore,
                   ach: S.ach, owned: S.owned, memo: pu("memoire") > 0, heritage: pu("heritage") };
      S = defaults();
      S.name = keep.name; S.opts = keep.opts; S.prestige = keep.prestige; S.ppts = keep.ppts; S.pshop = keep.pshop;
      S.stats.runs = keep.runs; S.stats.bestTime = keep.bestTime; S.stats.bestScore = keep.bestScore;
      if (keep.memo) { S.ach = keep.ach; S.owned = keep.owned; }
      S.gold = 1000 * keep.heritage;
      sanitize(); save();
      SND.fusion(); checkAchievements(null); muteLabel(); go("prestige");
    },
    coophost: function () {
      if (!readCoopName()) return;
      var code = ""; for (var i = 0; i < 4; i++) code += CODE_CH[(Math.random() * CODE_CH.length) | 0];
      Net.joinTs = Date.now(); netJoin(code, true); go("lobby");
    },
    coopjoin: function () {
      if (!readCoopName()) return;
      var inp = card.querySelector("[data-coop-code]"), code = (inp ? inp.value : "").toUpperCase().replace(/[^A-Z]/g, "");
      if (code.length !== 4) { Net.err = "Le code fait 4 lettres."; go("coop"); return; }
      Net.joinTs = Date.now(); netJoin(code, false); go("lobby");
    },
    leave: function () { netLeave(); Net.err = ""; go("menu"); },
    lchar: function (id) { if (!charAvailable(charById(id))) return; S.char = id; save(); trackMe(); SND.click(); go("lobby"); },
    lmap: function (id) { if (Net.role !== "host") return; S.map = id; save(); trackMe(); SND.click(); go("lobby"); },
    ldiff: function (k) { if (Net.role !== "host") return; S.diff = k; save(); trackMe(); SND.click(); go("lobby"); },
    invite: function () {
      var url = location.origin + location.pathname + "#coop=" + Net.code;
      var text = "Rejoins ma partie d'Écureuil Survivor ! Code : " + Net.code;
      if (navigator.share) { navigator.share({ title: "Écureuil Survivor", text: text, url: url }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(url).then(function () { banner("Lien copié !"); }); } catch (e) { window.prompt("Lien d'invitation :", url); }
    },
    reroll: function () { if ((state !== "levelup" && !picking) || me.rerolls <= 0) return; me.rerolls--; openLevelUp(); },
    skip: function () { if (state !== "levelup" && !picking) return; apply({ type: "skip" }); },
    resume: function () { resume(); },
    restart: function () { start(); },
    quit: function () {
      if (netMenuOpen) { if (window.confirm("Quitter la partie en ligne ? Tu gardes l'or gagné.")) { netMenuOpen = false; gameOver(true); } return; }
      if (state === "pause" && window.confirm("Abandonner la partie ? Tu gardes l'or gagné.")) gameOver(true);
    },
    "opt-pause": function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); if (netMenuOpen) { netMenu(); return; } state = "play"; pause(); },
    menu: function () { go("menu"); },
  };
  card.addEventListener("click", function (e) {
    var ch = e.target.closest("[data-choice]");
    if (ch) { if (state === "levelup" || picking) { try { apply(currentChoices[Number(ch.dataset.choice)]); } catch (err) { showError(err); } } return; }
    var b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    var fn = ACTIONS[b.dataset.action];
    try { if (fn) fn(b.dataset.arg); } catch (err) { showError(err); }
  });

  /* =====================================================================
     Coop en ligne (Supabase Realtime : salon + diffusion)
     L'hôte simule la partie et diffuse un instantané ~8 fois/s.
     Les invités bougent leur écureuil en local et envoient leur position ~5 fois/s.
     ===================================================================== */
  var SPRN = Object.keys(D.SPRITES), SPRI = {};
  SPRN.forEach(function (k, i) { SPRI[k] = i; });
  var ETYPES = Object.keys(D.ENEMIES), ETI = {};
  ETYPES.forEach(function (k, i) { ETI[k] = i; });
  var GEMK = ["xp", "gold", "berry", "chest", "magnet", "xpjar", "goldbag", "freeze", "bomb"], GEMI = {};
  GEMK.forEach(function (k, i) { GEMI[k] = i; });
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function rates() { var n = Math.max(2, Net.roster.length); return n >= 4 ? { snap: 6, inp: 4 } : { snap: 8, inp: 5 }; }

  function sbClient() {
    if (Net.client) return Net.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    Net.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return Net.client;
  }
  function netJoin(code, asHost) {
    var cl = sbClient();
    if (!cl) { Net.err = "Coop indisponible (Supabase non chargé)."; go("coop"); return; }
    netLeave(true);
    Net.on = true; Net.role = asHost ? "host" : "guest"; Net.code = code; Net.status = "connexion"; Net.err = ""; Net.started = false; Net.roster = [];
    var ch = cl.channel("es-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: Net.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["start", "s", "in", "pick", "end"].forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { showError(err); } }); });
    ch.subscribe(function (status) {
      Net.status = status;
      if (status === "SUBSCRIBED") trackMe();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") Net.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      if (state === "menu" && screen === "lobby") go("lobby");
    });
    Net.ch = ch;
  }
  function netLeave(silent) {
    if (Net.ch) { try { Net.ch.untrack(); } catch (e) {} try { Net.client.removeChannel(Net.ch); } catch (e) {} }
    Net.ch = null; Net.on = false; Net.role = null; Net.started = false; Net.roster = []; Net.cur = Net.prev = null;
  }
  function trackMe() {
    if (!Net.ch) return;
    Net.ch.track({ id: Net.id, name: (S.name || "Écureuil").slice(0, 16), char: S.char, host: Net.role === "host", map: S.map, diff: S.diff,
                   prog: { shop: S.shop, tree: S.tree, pr: S.prestige, pu: S.pshop }, ingame: Net.started, ts: Net.joinTs || (Net.joinTs = Date.now()) });
  }
  function onPresence() {
    if (!Net.ch) return;
    var st = Net.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    Net.roster = list;
    var host = list.filter(function (x) { return x.host; })[0];
    if (Net.role === "guest") {
      if (!host && Net.started && state !== "over") { bannerAll("L'hôte a quitté la partie"); gameOver(true, "L'hôte a quitté la partie."); return; }
      if (host && host.ingame && !Net.started && state === "menu") Net.err = "Une partie est déjà en cours dans ce salon : attends la fin pour la rejoindre.";
      var idx = list.map(function (x) { return x.id; }).indexOf(Net.id);
      if (idx >= 4 && !Net.started) { Net.err = "Salon plein (4 joueurs max)."; netLeave(); go("coop"); return; }
    }
    if (Net.role === "host" && Net.started && players.length) {
      var ids = list.map(function (x) { return x.id; });
      players = players.filter(function (pl) { if (pl === me || ids.indexOf(pl.id) >= 0) return true; bannerAll(pl.name + " est parti"); return false; });
    }
    if (state === "menu" && screen === "lobby") go("lobby");
  }
  function onNet(ev, d) {
    if (!d) return;
    if (ev === "start" && Net.role === "guest") { startOnline(d); return; }
    if (ev === "in" && Net.role === "host") {
      var pl = playerById(d.id); if (!pl) return;
      pl.tx = d.x; pl.ty = d.y; pl.face = d.f; pl.moving = !!d.m; pl.choosing = !!d.c;
      return;
    }
    if (ev === "pick" && Net.role === "host") {
      var pp = playerById(d.id); if (!pp || !d.c) return;
      p = pp; applyCore(d.c); p = me;
      return;
    }
    if (ev === "s" && Net.role === "guest") { receiveSnap(d); return; }
    if (ev === "end" && Net.role === "guest" && state !== "over") {
      if (d.r) { r.time = d.r[0]; r.kills = d.r[1]; r.level = d.r[2]; r.bosses = d.r[3]; r.gold = d.r[4]; }
      gameOver(!!d.q, d.q ? "L'hôte a mis fin à la partie." : "");
    }
  }
  function hostStart() {
    if (Net.role !== "host") return;
    var info = { map: S.map, diff: S.diff, roster: Net.roster.slice(0, 4).map(function (x) { var g = x.prog || {}; return { id: x.id, name: x.name, char: x.char, shop: g.shop || {}, tree: g.tree || {}, prestige: g.pr || 0, pshop: g.pu || {} }; }) };
    if (!info.roster.some(function (x) { return x.id === Net.id; })) info.roster.unshift({ id: Net.id, name: S.name || "Hôte", char: S.char, shop: S.shop, tree: S.tree, prestige: S.prestige, pshop: S.pshop });
    netSend("start", info);
    startOnline(info);
  }
  function startOnline(info) {
    Net.started = true; Net.ev = []; Net.acc = 0; Net.inAcc = 0; Net.cur = Net.prev = null;
    reset(info.roster, info.map, info.diff);
    Net.lastLevel = 1;
    S.stats.played[me.char.id] = true; S.stats.maps[MAP.id] = true; save();
    trackMe();
    beginPlay();
  }
  // ---------- hôte : instantané ----------
  function netHostTick(dt) {
    if (Net.role !== "host") return;
    Net.acc += dt;
    var rt = rates();
    if (Net.acc < 1 / rt.snap) return;
    Net.acc = 0;
    netSend("s", buildSnap());
    Net.ev = []; Net.dmgN = 0;
  }
  function R1(v) { return Math.round(v); }
  function buildSnap() {
    var e = [], i, en;
    for (i = 0; i < enemies.length; i++) {
      en = enemies[i]; if (en.dead) continue;
      e.push(en.id, en.d.prop ? ETYPES.length + SPRI[en.d.sprite] : ETI[en.type], R1(en.x), R1(en.y),
        (en.face < 0 ? 1 : 0) | (en.flash > 0 ? 2 : 0) | (en.under ? 4 : 0) | (en.slowT > 0 ? 8 : 0));
    }
    var pr = [];
    for (i = 0; i < projs.length && pr.length < 160 * 6; i++) {
      var q = projs[i];
      if (!nearAnyPlayer(q, 260)) continue;
      if (q.kind === "rocket") pr.push(-1, R1(q.x), R1(q.y), R1(Math.cos(q.ang) * q.spd), R1(Math.sin(q.ang) * q.spd), 0);
      else pr.push(SPRI[q.sprite] || 0, R1(q.x), R1(q.y), R1(q.kind === "boomerang" ? 0 : q.vx), R1(q.kind === "boomerang" ? 0 : q.vy), (q.anim || q.kind === "boomerang") ? 1 : 0);
    }
    var lb = [];
    lobs.forEach(function (l) { lb.push(R1(l.sx), R1(l.sy), R1(l.tx), R1(l.ty), Math.round(l.t * 100), Math.round(l.dur * 100), SPRI[l.sprite || "pinecone"] || 0, (l.sky ? 1 : 0) | (l.small ? 2 : 0), R1(l.rad || 0)); });
    var g = [];
    for (i = 0; i < gems.length && g.length < 220 * 3; i++) {
      var gm = gems[i];
      if (!nearAnyPlayer(gm, 300)) continue;
      g.push(gm.kind === "xp" && gm.v >= 3 ? 9 : GEMI[gm.kind], R1(gm.x), R1(gm.y));
    }
    var h = [];
    hostile.forEach(function (q) { h.push(R1(q.x), R1(q.y), R1(q.vx), R1(q.vy)); });
    var w = [];
    warns.forEach(function (x) { w.push(R1(x.x), R1(x.y), R1(x.r), Math.round(Math.min(1, x.t / x.dur) * 100)); });
    var pl = players.map(function (o) {
      var orb = {};
      Object.keys(o.weapons).forEach(function (k) { if (ALLW[k] && ALLW[k].type === "orbit") orb[k] = Math.round((o.st[k] || 0) * 100) / 100; });
      return [o.id, R1(o.x), R1(o.y), o.face, o.moving ? 1 : 0, Math.ceil(o.hp), R1(o.maxHp), o.down ? 1 : 0, o.choosing ? 1 : 0, o.inv > 0 ? 1 : 0,
              o.name, o.sprite, o.weapons, orb, Math.round(o.area * 100), o.amount, o.shield ? 1 : 0, Math.round(o.reviveT * 10)];
    });
    return { r: [Math.round(r.time * 10), r.kills, r.level, Math.round(Math.min(1, xp / xpNext) * 1000), Math.floor(r.gold), r.bosses, Math.round(r.freeze * 10), Math.round(r.flash * 100)],
             e: e, pr: pr, lb: lb, g: g, h: h, w: w, pl: pl, b: curBoss ? [curBoss.d.name, Math.round(curBoss.hp / curBoss.maxHp * 1000)] : 0, ev: Net.ev };
  }
  // ---------- invité : réception et lissage ----------
  function receiveSnap(d) {
    if (!Net.started || !r) return;
    Net.prev = Net.cur; Net.cur = { s: d, at: performance.now() };
    var rr = d.r;
    r.time = rr[0] / 10; r.kills = rr[1]; r.gold = rr[4]; r.bosses = rr[5]; r.freeze = rr[6] / 10; r.flash = rr[7] / 100;
    xp = rr[3]; xpNext = 1000;
    if (rr[2] > r.level) { pending += rr[2] - r.level; r.level = rr[2]; }
    // joueurs
    var seen = {};
    d.pl.forEach(function (a) {
      seen[a[0]] = true;
      var o = playerById(a[0]);
      if (!o) { o = { id: a[0], char: D.CHARACTERS[0], weapons: {}, passives: {}, st: {}, timers: {}, consumed: {}, anim: 0, remote: true, x: a[1], y: a[2] }; players.push(o); }
      if (o === me) { me.hp = a[5]; me.down = !!a[7]; me.reviveT = a[17] / 10; me.shield = !!a[16]; if (a[9] && me.inv <= 0) me.inv = 0.4; return; }
      o.px = o.x; o.py = o.y; o.nx = a[1]; o.ny = a[2]; o.face = a[3]; o.moving = !!a[4]; o.hp = a[5]; o.maxHp = a[6]; o.down = !!a[7]; o.choosing = !!a[8];
      o.inv = a[9] ? 0.3 : 0; o.name = a[10]; o.sprite = a[11]; o.weapons = a[12] || {}; o.area = a[14] / 100; o.amount = a[15]; o.shield = !!a[16]; o.reviveT = a[17] / 10;
      Object.keys(a[13] || {}).forEach(function (k) { o.st[k] = a[13][k]; });
    });
    players = players.filter(function (o) { return o === me || seen[o.id]; });
    curBoss = d.b ? { d: { name: d.b[0] }, hp: d.b[1], maxHp: 1000 } : null;
    // événements
    (d.ev || []).forEach(playEvent);
  }
  function playEvent(ev) {
    var t = ev[0];
    if (t === "x") { fx.push({ kind: "ring", x: ev[1], y: ev[2], r: ev[3], life: 0.25, max: 0.25, red: !!ev[4] }); SND.boom(); }
    else if (t === "bo") { fx.push({ kind: "bolt", pts: ev[1], life: 0.16, max: 0.16 }); SND.zap(); }
    else if (t === "d") { if (S.opts.numbers && texts.length < 60) texts.push({ x: ev[1], y: ev[2], n: ev[3], life: 0.6 }); }
    else if (t === "k") { for (var i = 0; i < Math.min(ev[4], 12); i++) { var a = Math.random() * TAU, sp = 20 + Math.random() * 50; fx.push({ kind: "dot", x: ev[1], y: ev[2], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.3, color: ev[3] }); } }
    else if (t === "sw") { var o = playerById(ev[1]); if (o) { fx.push({ kind: "swipe", dir: ev[2], r: ev[3], life: 0.18, max: 0.18, pl: o }); if (o === me) SND.whip(); } }
    else if (t === "sp") { var o2 = playerById(ev[1]); if (o2) fx.push({ kind: "spin", r: ev[2], life: 0.25, max: 0.25, pl: o2 }); }
    else if (t === "bn") banner(ev[1]);
    else if (t === "ch") { if (!me.down) grantChest(); }
  }
  var PROPS_SPR = ["stump", "basket", "leafpile", "lantern"];
  function sendInput() {
    if (!Net.on || Net.role !== "guest" || !Net.started || !me) return;
    Net.inAcc = 0;
    netSend("in", { id: me.id, x: Math.round(me.x), y: Math.round(me.y), f: me.face, m: me.moving ? 1 : 0, c: (me.choosing || netMenuOpen) ? 1 : 0 });
  }
  function updateGuest(dt) {
    var now = performance.now();
    moveMe(dt);
    me.anim += dt * (me.moving || SPR[me.sprite].flying ? 8 : 0);
    me.inv -= dt;
    var bi = biomeAtTile(Math.floor(me.x / 16), Math.floor(me.y / 16));
    if (bi !== r.biome) { if (r.biome >= 0) banner(MAP.biomes[bi].name); r.biome = bi; }
    Net.inAcc += dt;
    if (Net.inAcc >= 1 / rates().inp) sendInput();
    var cur = Net.cur, prev = Net.prev;
    if (cur) {
      var period = 1000 / rates().snap, k = Math.max(0, Math.min(1, (now - cur.at) / period)), age = (now - cur.at) / 1000;
      var pm = {};
      if (prev) for (var i = 0; i < prev.s.e.length; i += 5) pm[prev.s.e[i]] = i;
      var list = [], E = cur.s.e, P = prev ? prev.s.e : null;
      for (i = 0; i < E.length; i += 5) {
        var id = E[i], ti = E[i + 1], x = E[i + 2], y = E[i + 3], fl = E[i + 4];
        if (P && pm[id] !== undefined) { var j = pm[id]; x = P[j + 2] + (x - P[j + 2]) * k; y = P[j + 3] + (y - P[j + 3]) * k; }
        var d = ti < ETYPES.length ? D.ENEMIES[ETYPES[ti]] : { prop: true, r: 6, sprite: SPRN[ti - ETYPES.length] };
        var anim = (Net.anims[id] = (Net.anims[id] || Math.random() * 2) + dt * 5);
        list.push({ id: id, x: x, y: y, d: d, spr: SPR[d.sprite] || SPR.stump, anim: anim, face: fl & 1 ? -1 : 1, flash: fl & 2 ? 1 : 0, under: !!(fl & 4), slowT: fl & 8 ? 1 : 0, type: ti < ETYPES.length ? ETYPES[ti] : "prop" });
      }
      enemies = list;
      players.forEach(function (o) {
        if (o === me || o.nx === undefined) return;
        o.x = o.px + (o.nx - o.px) * k; o.y = o.py + (o.ny - o.py) * k;
        o.anim += dt * (o.moving || (SPR[o.sprite] && SPR[o.sprite].flying) ? 8 : 0);
      });
      var pr = cur.s.pr; projs = [];
      for (i = 0; i < pr.length; i += 6) {
        var vx = pr[i + 3], vy = pr[i + 4];
        if (pr[i] < 0) projs.push({ kind: "rocket", x: pr[i + 1] + vx * age, y: pr[i + 2] + vy * age, ang: Math.atan2(vy, vx) });
        else projs.push({ kind: "bullet", sprite: SPRN[pr[i]], x: pr[i + 1] + vx * age, y: pr[i + 2] + vy * age, vx: vx, vy: vy, anim: !!pr[i + 5] });
      }
      var lb = cur.s.lb; lobs = [];
      for (i = 0; i < lb.length; i += 9) lobs.push({ sx: lb[i], sy: lb[i + 1], tx: lb[i + 2], ty: lb[i + 3], t: Math.min(lb[i + 5], lb[i + 4] + age * 100) / 100, dur: lb[i + 5] / 100, sprite: SPRN[lb[i + 6]], sky: !!(lb[i + 7] & 1), small: !!(lb[i + 7] & 2), rad: lb[i + 8] });
      var g = cur.s.g; gems = [];
      for (i = 0; i < g.length; i += 3) gems.push(g[i] === 9 ? { kind: "xp", v: 3, x: g[i + 1], y: g[i + 2] } : { kind: GEMK[g[i]], v: 1, x: g[i + 1], y: g[i + 2] });
      var h = cur.s.h; hostile = [];
      for (i = 0; i < h.length; i += 4) hostile.push({ x: h[i] + h[i + 2] * age, y: h[i + 1] + h[i + 3] * age, vx: h[i + 2], vy: h[i + 3] });
      var w = cur.s.w; warns = [];
      for (i = 0; i < w.length; i += 4) warns.push({ x: w[i], y: w[i + 1], r: w[i + 2], t: w[i + 3] / 100, dur: 1 });
      if (now - cur.at > 4000 && state === "play") { gameOver(true, "Connexion perdue avec l'hôte."); return; }
    }
    tickFx(dt);
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(r); }
    if (pending > 0 && !picking && !me.down && state === "play") openLevelUp();
  }
  Net.anims = {};

  /* =====================================================================
     Déroulement d'une partie
     ===================================================================== */
  var last = 0;
  function start() {
    if (Net.on) { if (Net.role === "host") hostStart(); return; }
    sanitize();
    reset();
    S.stats.played[CH.id] = true; S.stats.maps[MAP.id] = true; save();
    beginPlay();
  }
  function beginPlay() {
    Net.anims = {};
    if (isTouch) enterFull();
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
  function netMenu() {
    netMenuOpen = true; me.choosing = true; clearInput(); sendInput();
    showCard('<h2>Partie en ligne</h2><p>Le jeu continue pendant que ce menu est ouvert (tu es protégé par une bulle).</p>' +
      '<p class="game-small">Salon <b>' + esc(Net.code || "") + "</b> · " + players.length + " joueurs</p>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="resume" data-autofocus>▶ Reprendre</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="opt-pause">' + (S.opts.sound ? "🔊 Son : oui" : "🔇 Son : non") + "</button>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="quit">🏳️ Quitter la partie</button></div>', "netmenu");
  }
  function pause() {
    if (state !== "play" || picking) return;
    if (players.length > 1) { if (netMenuOpen) resume(); else netMenu(); return; }
    state = "pause"; clearInput();
    var html = '<h2>Pause</h2><div class="pause-grid"><div><h3>Armes (' + Object.keys(p.weapons).length + "/" + MAX_W + ')</h3><ul class="build-list">';
    Object.keys(p.weapons).forEach(function (k) { html += '<li class="' + (ALLW[k].fusion ? "is-fusion" : "") + '"><img src="' + spriteUrl(ALLW[k].icon) + '" alt="">' + esc(ALLW[k].name) + " <b>niv. " + p.weapons[k] + "</b>" + synHtml(k) + "</li>"; });
    html += '</ul><h3>Objets (' + Object.keys(p.passives).length + "/" + MAX_P + ')</h3><ul class="build-list">';
    Object.keys(p.passives).forEach(function (k) { html += '<li><img src="' + spriteUrl(D.PASSIVES[k].sprite) + '" alt="">' + esc(D.PASSIVES[k].name) + " <b>niv. " + p.passives[k] + "</b>" + synHtml(k) + "</li>"; });
    html += '</ul></div><div><h3>Statistiques</h3><ul class="stat-list">' +
      "<li>PV <b>" + Math.ceil(p.hp) + " / " + p.maxHp + "</b></li>" +
      "<li>Dégâts <b>" + Math.round(p.might * 100) + " %</b></li>" +
      "<li>Vitesse <b>" + Math.round(p.speed / 62 * 100) + " %</b></li>" +
      "<li>Recharge <b>" + Math.round(p.cdMul * 100) + " %</b></li>" +
      "<li>Zone <b>" + Math.round(p.area * 100) + " %</b></li>" +
      "<li>Projectiles <b>+" + p.amount + "</b></li>" +
      "<li>Armure <b>" + p.armor + "</b></li>" +
      "<li>Renaissances <b>" + me.revives + "</b></li></ul></div></div>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="resume" data-autofocus>▶ Reprendre</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="opt-pause">' + (S.opts.sound ? "🔊 Son : oui" : "🔇 Son : non") + "</button>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="restart">↻ Recommencer</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="quit">🏳️ Abandonner</button></div>';
    showCard(html, "pause");
  }
  function resume() {
    if (netMenuOpen) { netMenuOpen = false; me.choosing = picking; hideCard(); sendInput(); return; }
    if (state !== "pause") return; state = "play"; hideCard(); last = performance.now();
  }

  function gameOver(quit, reason) {
    if (state === "over") return;
    var online = Net.on && Net.started;
    if (online && Net.role === "host") netSend("end", { q: quit ? 1 : 0, r: [r.time, r.kills, r.level, r.bosses, r.gold] });
    if (online) { Net.started = false; if (Net.role === "guest" && quit && !reason) netLeave(); else trackMe(); }
    picking = false; netMenuOpen = false;
    state = "over"; SND.over();
    curBoss = null;
    r.ended = true;
    var sc = score(), gold = runGold();
    S.stats.kills += r.kills; r.committed = true;
    S.stats.runs++;
    earnGold(gold);
    var rankGain = Math.floor((r.time / 10 + r.kills / 20 + r.bosses * 20 + r.level * 2) * (1 + 0.2 * pu("rang"))), ranksUp = 0;
    S.rankXp += rankGain;
    while (S.rankXp >= D.rankNeed(S.rank)) { S.rankXp -= D.rankNeed(S.rank); S.rank++; ranksUp++; }
    var isBest = sc > S.stats.bestScore;
    S.stats.bestScore = Math.max(S.stats.bestScore, sc);
    S.stats.bestTime = Math.max(S.stats.bestTime, Math.floor(r.time));
    save();
    checkAchievements(r);
    var achHtml = r.newAch.length ? '<div class="over-ach"><h3>Succès débloqués</h3><ul>' + r.newAch.map(function (a) {
      var un = unlocksOf(a.id);
      return "<li>🏆 <strong>" + esc(a.name) + "</strong> +" + a.gold + " " + goldIc() + (un.length ? "<span>Débloque " + esc(un.join(", ")) + "</span>" : "") + "</li>";
    }).join("") + "</ul></div>" : "";
    var lbOk = window.Leaderboard && Leaderboard.configured() && !r.coop;
    var html = '<span class="kicker">' + esc(reason || (quit ? "Partie abandonnée" : "Les bestioles ont gagné…")) + "</span><h2>Fin de partie" + (r.coop ? " (coop)" : "") + "</h2>" +
      '<ul class="over-stats"><li><span>Survie</span><strong>' + fmtTime(r.time) + "</strong></li><li><span>Ennemis</span><strong>" + r.kills + "</strong></li><li><span>Niveau</span><strong>" + r.level + "</strong></li>" +
      '<li class="total"><span>Score' + (DIFF.score > 1 ? " (×" + fr(DIFF.score) + ")" : "") + "</span><strong>" + sc.toLocaleString("fr-FR") + "</strong></li>" +
      '<li class="gold"><span>Glands d\'or gagnés</span><strong>+' + gold + " " + goldIc() + "</strong></li></ul>" +
      '<p class="rank-line">+' + rankGain + " XP de rang · <b>Rang " + S.rank + "</b>" + (ranksUp ? ' <span class="rank-up">Rang supérieur ! +' + ranksUp + " point" + (ranksUp > 1 ? "s" : "") + " de compétence</span>" : "") + "</p>" +
      '<p class="game-small">' + (isBest ? "🏆 Nouveau record perso !" : "Ton record : " + S.stats.bestScore.toLocaleString("fr-FR")) + "</p>" + achHtml +
      (lbOk ? '<form class="submit-score" data-submit><label for="es-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="es-name" type="text" maxlength="20" autocomplete="nickname" placeholder="Pseudo" value="' + esc(S.name || "") + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      (Net.on ? '<div class="btn-row center"><button class="btn" type="button" data-action="go" data-arg="lobby" data-autofocus>↻ Retour au salon</button>' +
        '<button class="btn btn-ghost" type="button" data-action="leave">Quitter le salon</button></div>'
      : '<div class="btn-row center"><button class="btn" type="button" data-action="restart" data-autofocus>↻ Rejouer</button>' +
        '<button class="btn btn-ghost" type="button" data-action="menu">Menu</button></div>');
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
      if (state === "play") { if (Net.on && Net.role === "guest") updateGuest(dt); else update(dt); }
      if (state === "menu" || !p) drawIdle(now); else draw();
    } catch (err) { showError(err); }
  }

  /* =====================================================================
     Boutons, plein écran, taille
     ===================================================================== */
  $("[data-pause]").addEventListener("click", function () { if (state === "play") pause(); else if (state === "pause") resume(); });
  // l'hôte continue de simuler même si son onglet passe en arrière-plan
  var bgLast = 0;
  setInterval(function () {
    var now = performance.now(), el = Math.min(1.5, (now - (bgLast || now)) / 1000); bgLast = now;
    if (!document.hidden || state !== "play" || !Net.on || Net.role !== "host") return;
    try { for (var t = 0; t < el; t += 0.05) update(0.05); last = performance.now(); } catch (e) {}
  }, 100);
  var muteBtn = $("[data-mute]");
  function muteLabel() { muteBtn.textContent = S.opts.sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", S.opts.sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); });

  /* ---------- plein écran ----------
     API Fullscreen quand elle existe (Android, ordi), sinon le jeu occupe tout
     l'écran en CSS (iPhone). Sur téléphone, on y passe tout seul au lancement. */
  var isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var standalone = window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() {
    var on = isFull();
    document.documentElement.classList.toggle("es-max", on);
    stage.classList.toggle("is-full", on);
    if (state === "menu" && screen === "menu") go("menu");
  }
  function enterFull() {
    if (isFull() || standalone) return;
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) {
      try { var pr = req.call(stage, { navigationUI: "hide" }); if (pr && pr.catch) pr.catch(fallback); } catch (e) { fallback(); }
    } else fallback();
  }
  function exitFull() {
    stage.classList.remove("is-max");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    syncFull();
  }
  function toggleFull() { if (isFull()) exitFull(); else enterFull(); }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", toggleFull);
  $("[data-exit-max]").addEventListener("click", exitFull);
  $("[data-fs-exit]").addEventListener("click", exitFull);
  ACTIONS.fullscreen = function () { toggleFull(); };

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
    gold: function (n) { earnGold(n || 500); save(); if (state === "menu") go(screen); },
    rank: function (n) { S.rank += n || 1; save(); if (state === "menu") go(screen); },
    ppts: function (n) { S.ppts += n || 500; save(); if (state === "menu") go(screen); },
    time: function (t) { if (r) { r.time = t; nextSwarm = Math.ceil(t / 60) * 60; nextBoss = Math.max(180, Math.ceil(t / 180) * 180); } },
    give: function (id, lvl) { if (!p) return; if (ALLW[id]) p.weapons[id] = lvl || 5; else if (D.PASSIVES[id]) p.passives[id] = lvl || 5; calc(); refreshCounts(); },
    drop: function (kind) { if (p) drop(kind, p.x + 20, p.y); },
    level: function () { if (p) { pending++; } },
    warns: function () { return warns && warns.length; },
    choose: function (i, on) { if (players[i]) players[i].choosing = on !== false; },
    place: function (i, x, y) { if (players[i]) { players[i].x = players[i].tx = x; players[i].y = players[i].ty = y; } },
    pl: function (i) { var o = players[i]; return o ? { id: o.id, x: Math.round(o.x), y: Math.round(o.y), choosing: o.choosing, down: o.down, me: o === me } : null; },
    near: function (i, rad) { var pl = players[i]; return pl ? enemies.filter(function (e) { return !e.dead && !e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < rad; }).length : 0; },
    hurtAll: function (n) { players.forEach(function (pl) { pl.hp -= n || 1000; }); },
    hurtOne: function (i, n) { if (players[i]) players[i].hp -= n || 1000; },
    net: function () { return { on: Net.on, role: Net.role, code: Net.code, status: Net.status, roster: Net.roster.length, started: Net.started, players: players.length, snap: !!Net.cur }; },
    spawn: function (t) { if (p) spawn(t, Math.random() * TAU, 60); },
    state: function () { return { state: state, screen: screen, level: r && r.level, hp: p && p.hp, kills: r && r.kills, weapons: p && p.weapons, passives: p && p.passives, enemies: enemies && enemies.length }; },
  };

  checkAchievements(null);
  go("menu");
  function joinFromHash() {
    var m = /#coop=([A-Za-z]{4})/.exec(location.hash || "");
    if (!m || (Net.on && Net.code === m[1].toUpperCase())) return;
    if (state === "play") return;
    Net.pendingCode = m[1].toUpperCase();
    if (S.name && S.name.length >= 2) { Net.joinTs = Date.now(); netJoin(Net.pendingCode, false); go("lobby"); }
    else { Net.err = "Choisis ton pseudo puis appuie sur Rejoindre."; go("coop"); }
    var rc = stage.getBoundingClientRect();
    if (rc.top > window.innerHeight * 0.5) stage.scrollIntoView({ block: "start" });
  }
  joinFromHash();
  window.addEventListener("hashchange", joinFromHash);
  last = performance.now();
  requestAnimationFrame(loop);
})();
