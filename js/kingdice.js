/* =========================================================================
   King Dice — rendu, son, commandes et écrans
   (les règles sont dans js/kingdice-core.js, sans DOM)

   Deux joueurs sur le même ordinateur protègent ensemble leur roi :
   on invoque des pièces d'échecs au hasard, on les fusionne, et elles
   tirent toutes seules selon leur forme (Tour, Fou, Cavalier).

   Sections : réglages · état · son · dessin des personnages · effets ·
   événements du moteur → effets · rendu · commandes · écrans · boucle.
   Les animations ne touchent jamais aux règles : elles lisent le monde.
   ========================================================================= */
(function () {
  "use strict";

  var K = window.KD_CORE;
  var stage = document.querySelector("[data-kingdice]");
  if (!K || !stage) return;

  var VERSION = "1.0.0";
  var CFG = K.CFG;
  var TAU = Math.PI * 2;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var hud = stage.querySelector("[data-hud]");
  var launchBtn = stage.querySelector("[data-kd-launch]");
  var tipEl = stage.querySelector("[data-kd-tip]");

  /* ====================== MISE EN PAGE (unités du monde) ====================== */
  var VW = 1100, VH = 800;
  var CELL = 72, BX = 298, BY = 152;            // plateau 7 × 7
  var BW = CELL * 7, BH = CELL * 7;
  var KING_X = BX + BW / 2, KING_Y = BY + BH + 134;
  var PANEL = [{ x: 18, y: BY, w: 264, h: BH }, { x: 818, y: BY, w: 264, h: BH }];
  var PORTAL_Y = BY - 44;

  var PCOL = [
    { main: "#78aef7", light: "#d4e6ff", mid: "#a9cbfb", dark: "#2f5ea8", deep: "#1f3f78", name: "Joueur 1", short: "J1" },
    { main: "#ffa257", light: "#ffe3c9", mid: "#ffc596", dark: "#b8561a", deep: "#7c370c", name: "Joueur 2", short: "J2" },
  ];
  var INK = "#3a2c4c";
  var ENEMY_COL = {
    normal: { main: "#a58be0", light: "#d8c9fb", dark: "#5e4398" },
    fast: { main: "#5fd0ac", light: "#c3f5e2", dark: "#227a62" },
    armored: { main: "#9aa3b8", light: "#dfe4ee", dark: "#4b5266" },
    boss: { main: "#8a4d9e", light: "#d6a8e4", dark: "#4a1f5a" },
  };
  var TYPE_NAME = { rook: "Tour", bishop: "Fou", knight: "Cavalier" };
  var POWER_NAME = { grenade: "Grenade", freeze: "Gel", rainbow: "Arc-en-ciel" };
  var POWER_DESC = { grenade: "Explose sur 3 lignes du couloir (vise avec ton curseur).", freeze: "Ralentit tous les ennemis quelques secondes.", rainbow: "Fusionne 2 pièces de même niveau, même de types différents." };

  /* ====================== RÉGLAGES / SAUVEGARDE ====================== */
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var SET = { sfx: 0.8, music: 0.35, mute: false, fx: "full", ranges: true };
  try { var s0 = JSON.parse(load("kd-settings", "{}")); for (var k0 in s0) if (k0 in SET) SET[k0] = s0[k0]; } catch (e) {}
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches && load("kd-settings", null) == null) SET.fx = "reduced";
  function saveSet() { store("kd-settings", JSON.stringify(SET)); }
  var BEST = { score: 0, wave: 0 };
  try { var b0 = JSON.parse(load("kd-best", "{}")); BEST.score = Number(b0.score) || 0; BEST.wave = Number(b0.wave) || 0; } catch (e) {}
  function fxOn() { return SET.fx === "full"; }
  function fxN(n) { return fxOn() ? n : Math.max(1, Math.round(n * 0.35)); }

  /* ====================== ÉTAT ====================== */
  var mode = "menu";        // menu | play | pause | over
  var w = null;             // monde du moteur
  var ui = null;            // état d'interface par joueur
  var clock = 0;            // temps de jeu (s'arrête en pause)
  var slowmo = 0, hitstop = 0, trauma = 0, flash = 0, flashCol = "#fff";
  var parts = [], rings = [], texts = [], beams = [], circles = [], fusions = [], vshots = [], deaths = [], leakers = [], throws = [], rays = [];
  var pvis = {}, evis = {};
  var banner = null, killWin = { n: 0, t: 0 }, lastBigCoop = -9, kingFx = { hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 };
  var shownScore = 0, scoreBump = 0, overToken = 0;
  var hoverBtn = null, mouse = { x: -1, y: -1, in: false };
  var tuto = { on: false, step: 0 };
  var stats2 = null;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function cellX(c) { return BX + c * CELL + CELL / 2; }
  function cellY(r) { return BY + r * CELL + CELL / 2; }
  function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }

  function mkUI(i) {
    var z = CFG.zones[i];
    return { i: i, cur: { c: i === 0 ? z[1] : z[0], r: 3 }, cx: 0, cy: 0, sel: null, deny: 0, denyMsg: "", denyT: 0,
      mana: CFG.startMana, manaBump: 0, aimGrenade: false, upgFlash: [0, 0, 0], powerPop: 0, lastMove: 0, drag: null };
  }

  function newGame() {
    overToken++;
    w = K.createWorld();
    ui = [mkUI(0), mkUI(1)];
    ui.forEach(function (u) { u.cx = cellX(u.cur.c); u.cy = cellY(u.cur.r); u.mana = w.players[u.i].mana; });
    parts = []; rings = []; texts = []; beams = []; circles = []; fusions = []; vshots = []; deaths = []; leakers = []; throws = []; rays = [];
    pvis = {}; evis = {};
    slowmo = 0; hitstop = 0; trauma = 0; flash = 0; banner = null; killWin = { n: 0, t: 0 }; lastBigCoop = -9;
    kingFx = { hurt: 0, sq: 0, sqv: 0, look: 0, fall: 0 };
    shownScore = 0; scoreBump = 0;
    stats2 = { bigCoop: 0, maxChain: 0, multi: 0 };
    // les pièces de départ apparaissent avec leur petit rebond
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var pc = w.grid[c][r]; if (pc) pv(pc).born = clock + 0.25 + c * 0.03; }
  }

  function pv(pc) {
    var v = pvis[pc.id];
    if (!v) v = pvis[pc.id] = { born: -9, hideUntil: -9, recoil: 0, rdir: 1, cast: 0, jump: 0, sq: 0, sqv: 0, blink: rnd(1, 4), seed: Math.random() * 10, glint: 0 };
    return v;
  }
  function ev(e) {
    var v = evis[e.id];
    if (!v) {
      var jit = ((e.id * 37) % 13 - 6) * 0.9;
      v = evis[e.id] = { id: e.id, type: e.type, x: cellX(e.c) + jit, jit: jit, fromR: -1, toR: 0, hop: 0, hopDur: 0.42, flash: 0, sq: 0, sqv: 0, knock: 0,
        blink: rnd(1, 3), seed: Math.random() * 10, y: PORTAL_Y, born: clock, hp: e.hp, maxHp: e.maxHp, hpShown: 1, c: e.c };
    }
    return v;
  }

  /* ====================== SON (Web Audio, aucun fichier) ====================== */
  var AC = null, master, sfxBus, musicBus, noiseBuf, delayNode, lastSnd = {};
  function audio() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return AC; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination);
      var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
      sfxBus = AC.createGain(); sfxBus.connect(comp);
      musicBus = AC.createGain(); musicBus.connect(comp);
      delayNode = AC.createDelay(1); delayNode.delayTime.value = 0.36;
      var fb = AC.createGain(); fb.gain.value = 0.28; var dl = AC.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 2000;
      delayNode.connect(dl); dl.connect(fb); fb.connect(delayNode); dl.connect(sfxBus);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
    } catch (e) { AC = null; }
    return AC;
  }
  function applyVolumes() {
    if (!AC) return;
    master.gain.value = SET.mute ? 0 : 1;
    sfxBus.gain.value = SET.sfx * 0.85;
    musicBus.gain.value = SET.music * 0.5;
  }
  function gate(name, gap) { if (!AC) return false; var t = AC.currentTime; if (lastSnd[name] && t - lastSnd[name] < gap) return false; lastSnd[name] = t; return true; }
  function tone(f, d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    var v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g);
    var out = o.bus || sfxBus;
    if (o.filter) { var fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.filter; g.connect(fl); fl.connect(out); }
    else g.connect(out);
    if (o.echo && delayNode) g.connect(delayNode);
    osc.start(t); osc.stop(t + d + 0.05);
  }
  function noise(d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), src = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter();
    src.buffer = noiseBuf; fl.type = o.type || "lowpass"; fl.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + d);
    fl.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  function note(i, base) { return (base || 392) * Math.pow(2, PENTA[clamp(i, 0, PENTA.length - 1)] / 12); }
  function det() { return 1 + (Math.random() - 0.5) * 0.06; }

  var SFX = {
    summon: function () { var b = 523 * det(); [0, 2, 4, 6].forEach(function (k, i) { tone(note(k, b), 0.22, { type: "triangle", vol: 0.07, delay: i * 0.045 }); }); tone(b * 2, 0.35, { type: "sine", vol: 0.05, delay: 0.16, echo: true }); noise(0.18, { type: "highpass", f: 5000, vol: 0.03 }); },
    land: function () { tone(180 * det(), 0.09, { to: 110, vol: 0.12 }); },
    select: function () { tone(740 * det(), 0.07, { to: 980, type: "sine", vol: 0.08 }); },
    deselect: function () { tone(820, 0.07, { to: 560, type: "sine", vol: 0.06 }); },
    move: function () { if (gate("move", 0.04)) tone(1250 * det(), 0.025, { type: "sine", vol: 0.025 }); },
    deny: function () { tone(240, 0.1, { to: 190, type: "triangle", vol: 0.09 }); tone(200, 0.12, { to: 160, type: "triangle", vol: 0.07, delay: 0.07 }); },
    fuseStart: function () { tone(300, 0.3, { to: 900, type: "sine", vol: 0.06, glide: 0.28 }); noise(0.3, { f: 600, fTo: 4000, vol: 0.04, type: "bandpass", q: 2 }); },
    fuse: function (lvl) {
      var b = 392 * Math.pow(2, (lvl - 2) * 3 / 12);
      tone(b / 2, 0.25, { to: b, vol: 0.14 });
      [0, 2, 4, 5].forEach(function (k, i) { tone(note(k + lvl, b), 0.4, { type: "triangle", vol: 0.08, delay: 0.02 + i * 0.05, echo: true }); });
      noise(0.08, { type: "highpass", f: 3000, vol: 0.06 });
      if (lvl >= 3) [7, 9, 11].forEach(function (k, i) { tone(note(k, b), 0.5, { type: "sine", vol: 0.06, delay: 0.25 + i * 0.07, echo: true }); });
    },
    rook: function () { if (!gate("rook", 0.05)) return; tone(620 * det(), 0.05, { to: 300, type: "square", vol: 0.025, filter: 2200 }); noise(0.04, { f: 2600, vol: 0.04 }); },
    bishop: function () { if (!gate("bishop", 0.07)) return; var f = 990 * det(); tone(f, 0.18, { to: f * 1.5, type: "sine", vol: 0.045 }); tone(f * 2, 0.12, { type: "sine", vol: 0.02, delay: 0.02 }); },
    knight: function () { if (!gate("knight", 0.08)) return; tone(330 * det(), 0.12, { to: 520, type: "triangle", vol: 0.06 }); },
    hitRook: function () { if (gate("hitR", 0.045)) noise(0.05, { f: 1800 * det(), vol: 0.06 }); },
    hitBishop: function () { if (!gate("hitB", 0.06)) return; tone(1320 * det(), 0.16, { type: "sine", vol: 0.04, echo: true }); noise(0.06, { type: "highpass", f: 4000, vol: 0.025 }); },
    hitKnight: function () { if (!gate("hitK", 0.06)) return; tone(160 * det(), 0.16, { to: 70, vol: 0.2 }); noise(0.09, { f: 900, vol: 0.09 }); },
    pop: function (n) { if (!gate("pop", 0.03)) return; var f = 520 * det() * Math.pow(2, Math.min(5, n - 1) * 2 / 12); tone(f, 0.12, { to: f * 2.1, vol: 0.16, glide: 0.06 }); noise(0.07, { type: "highpass", f: 2600, vol: 0.06 }); },
    multi: function (n) { [0, 2, 4, 7, 9].slice(0, Math.min(5, n + 1)).forEach(function (k, i) { tone(note(k + 3, 523), 0.2, { type: "triangle", vol: 0.07, delay: i * 0.05 }); }); },
    coop: function (chain) {
      var b = 523 * Math.pow(2, Math.min(6, chain - 1) / 12);
      tone(b, 0.5, { type: "triangle", vol: 0.09, echo: true }); tone(b * 1.25, 0.5, { type: "triangle", vol: 0.08, delay: 0.06, echo: true });
      tone(b * 1.5, 0.6, { type: "triangle", vol: 0.08, delay: 0.12, echo: true }); tone(b * 2, 0.7, { type: "sine", vol: 0.07, delay: 0.2, echo: true });
      noise(0.4, { type: "highpass", f: 6000, vol: 0.03, delay: 0.1 });
    },
    coopSmall: function () { if (gate("coopS", 0.1)) { tone(880 * det(), 0.15, { type: "triangle", vol: 0.05 }); tone(1320 * det(), 0.18, { type: "triangle", vol: 0.04, delay: 0.05 }); } },
    mana: function () { if (gate("mana", 0.06)) tone(1760 * det(), 0.06, { type: "sine", vol: 0.025 }); },
    spawn: function () { if (gate("spawn", 0.15)) tone(220 * det(), 0.14, { to: 160, type: "triangle", vol: 0.035 }); },
    step: function () { if (gate("step", 0.09)) tone(130 * det(), 0.05, { to: 90, vol: 0.04 }); },
    leak: function () { tone(150, 0.35, { to: 60, vol: 0.25 }); noise(0.25, { f: 500, vol: 0.12 }); tone(330, 0.18, { to: 220, type: "triangle", vol: 0.08, delay: 0.05 }); },
    waveStart: function () { [0, 4, 7].forEach(function (k, i) { tone(392 * Math.pow(2, k / 12), 0.3, { type: "sawtooth", vol: 0.03, filter: 1400, delay: i * 0.09 }); }); tone(784, 0.5, { type: "triangle", vol: 0.06, delay: 0.27, echo: true }); },
    waveEnd: function (big) { [0, 2, 4, 7, 9, 12].forEach(function (k, i) { tone(note(k > 9 ? 5 : k / 2 + 2 | 0, 523), 0.35, { type: "triangle", vol: 0.075, delay: i * 0.08, echo: true }); }); tone(1046, 0.8, { type: "sine", vol: 0.06, delay: 0.5, echo: true }); if (big) [0, 4, 7, 12].forEach(function (k, i) { tone(523 * Math.pow(2, k / 12), 0.9, { type: "triangle", vol: 0.06, delay: 0.75 + i * 0.03 }); }); },
    over: function () { [7, 5, 4, 2, 0].forEach(function (k, i) { tone(note(k, 330), 0.6, { type: "triangle", vol: 0.1, delay: i * 0.2, echo: true }); }); tone(110, 1.2, { to: 55, vol: 0.12, delay: 0.9 }); },
    upgrade: function () { [0, 3, 5].forEach(function (k, i) { tone(note(k + 2, 523), 0.18, { type: "square", vol: 0.03, filter: 2500, delay: i * 0.05 }); }); tone(1568, 0.3, { type: "sine", vol: 0.05, delay: 0.16, echo: true }); },
    power: function () { [0, 4, 7, 11].forEach(function (k, i) { tone(note(k, 659), 0.25, { type: "triangle", vol: 0.06, delay: i * 0.06, echo: true }); }); },
    boom: function () { noise(0.7, { f: 1200, fTo: 70, vol: 0.4 }); tone(120, 0.6, { to: 40, vol: 0.3 }); tone(240, 0.15, { to: 80, type: "triangle", vol: 0.1 }); },
    whoosh: function () { noise(0.35, { type: "bandpass", f: 500, fTo: 2500, vol: 0.08, q: 1.5 }); },
    freeze: function () { for (var k = 0; k < 7; k++) tone(note(12 - k, 1046), 0.3, { type: "sine", vol: 0.04, delay: k * 0.035, echo: true }); noise(0.6, { type: "highpass", f: 6000, fTo: 3000, vol: 0.06 }); },
    rainbow: function () { for (var k = 0; k < 9; k++) tone(note(k + 2, 523), 0.25, { type: "triangle", vol: 0.05, delay: k * 0.04, echo: true }); },
    ui: function () { tone(880, 0.05, { type: "sine", vol: 0.05 }); },
    hover: function () { if (gate("hover", 0.05)) tone(1400, 0.03, { type: "sine", vol: 0.02 }); },
    pause: function () { tone(660, 0.1, { to: 440, vol: 0.06 }); },
  };

  // musique douce générée en direct (accords lents + notes pentatoniques éparses)
  var music = { on: false, timer: null, next: 0, beat: 0 };
  var CHORDS = [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 55, 57], [43, 50, 55, 59]];   // Cmaj7 Am7 Fmaj9 G
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startMusic() {
    if (SET.music <= 0 || !audio() || music.on) return;
    music.on = true; music.next = AC.currentTime + 0.1; music.beat = 0;
    music.timer = setInterval(scheduleMusic, 120);
  }
  function stopMusic() { music.on = false; if (music.timer) clearInterval(music.timer); music.timer = null; }
  function scheduleMusic() {
    if (!AC || !music.on) return;
    var spb = 60 / 76 / 2;
    while (music.next < AC.currentTime + 0.4) {
      var b = music.beat, bar = Math.floor(b / 8), chord = CHORDS[Math.floor(bar / 2) % 4], t = music.next - AC.currentTime;
      var intense = w && w.state === "wave";
      if (b % 16 === 0) chord.forEach(function (m) { tone(midi(m), spb * 16, { type: "triangle", vol: 0.03, att: 0.8, filter: 800, bus: musicBus, delay: t }); });
      if (b % 8 === 0) tone(midi(chord[0] - 12), spb * 7, { type: "sine", vol: 0.07, att: 0.04, bus: musicBus, delay: t });
      if (intense && b % 4 === 2) tone(midi(chord[0]), spb * 1.5, { type: "sine", vol: 0.03, bus: musicBus, delay: t });
      if (b % 2 === 0 && Math.random() < (intense ? 0.5 : 0.32)) {
        var m = chord[Math.floor(Math.random() * 4)] + 12 + (Math.random() < 0.3 ? 12 : 0);
        tone(midi(m), 0.8, { type: "sine", vol: 0.04, att: 0.01, bus: musicBus, delay: t });
      }
      music.next += spb; music.beat++;
    }
  }

  /* ====================== DESSIN : OUTILS ====================== */
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  var mixCache = {};
  function mix(a, b, t) {
    if (t <= 0) return a; if (t >= 1) return b;
    var key = a + b + Math.round(t * 20);
    if (mixCache[key]) return mixCache[key];
    var A = hex2rgb(a), B = hex2rgb(b), r = [0, 1, 2].map(function (i) { return Math.round(lerp(A[i], B[i], Math.round(t * 20) / 20)); });
    return (mixCache[key] = "#" + ((1 << 24) + (r[0] << 16) + (r[1] << 8) + r[2]).toString(16).slice(1));
  }
  function rrect(g, x, y, ww, hh, r) {
    r = Math.min(r, ww / 2, hh / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r);
    g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath();
  }
  function grad(g, y0, y1, c0, c1) { var gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
  function fillStroke(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
  function star(g, x, y, r, n, inner) {
    n = n || 5; inner = inner || 0.45;
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.25);
    g.bezierCurveTo(x - s * 0.45, y - s * 0.55, x - s * 0.05, y - s * 0.55, x, y - s * 0.25);
    g.bezierCurveTo(x + s * 0.05, y - s * 0.55, x + s * 0.45, y - s * 0.55, x + s * 0.5, y - s * 0.25);
    g.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
    g.closePath();
  }
  function eye(g, x, y, r, o) {
    o = o || {};
    if (o.closed) { g.beginPath(); g.arc(x, y + r * 0.2, r * 0.8, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = r * 0.45; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); return; }
    if (o.happy) { g.beginPath(); g.arc(x, y + r * 0.4, r * 0.85, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = r * 0.5; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); return; }
    var sy = o.blink ? 0.12 : 1;
    g.save(); g.translate(x, y); g.scale(1, sy);
    g.beginPath(); g.ellipse(0, 0, r * 0.85, r, 0, 0, TAU); g.fillStyle = INK; g.fill();
    g.beginPath(); g.arc(-r * 0.25 + (o.lx || 0) * r * 0.2, -r * 0.35 + (o.ly || 0) * r * 0.2, r * 0.32, 0, TAU); g.fillStyle = "#fff"; g.fill();
    g.restore();
  }
  function blush(g, x, y, r) { g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fillStyle = "rgba(255,120,140,.45)"; g.fill(); }

  /* ====================== DESSIN : PIÈCES ====================== */
  // (0,0) = bas de la pièce ; s = taille d'une case
  function drawBase(g, s, col, lvl) {
    g.beginPath(); g.ellipse(0, -s * 0.07, s * 0.29, s * 0.1, 0, 0, TAU); g.fillStyle = lvl >= 4 ? "#c58a1c" : col.dark; g.fill();
    g.lineWidth = s * 0.03; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.ellipse(0, -s * 0.1, s * 0.27, s * 0.08, 0, 0, TAU); g.fillStyle = lvl >= 4 ? "#f4c64e" : col.main; g.fill();
  }
  function drawRook(g, s, col, lvl, o) {
    var lw = s * 0.032, body = grad(g, -s * 0.7, -s * 0.1, col.light, col.main);
    // jupe
    rrect(g, -s * 0.25, -s * 0.22, s * 0.5, s * 0.13, s * 0.05); fillStroke(g, col.mid, lw);
    // corps
    rrect(g, -s * 0.19, -s * 0.52, s * 0.38, s * 0.34, s * 0.06); fillStroke(g, body, lw);
    // créneaux
    rrect(g, -s * 0.25, -s * 0.6, s * 0.5, s * 0.12, s * 0.04); fillStroke(g, col.light, lw);
    [-0.25, -0.06, 0.13].forEach(function (x) { rrect(g, x * s, -s * 0.7, s * 0.12, s * 0.12, s * 0.03); fillStroke(g, col.light, lw); });
    // porte
    g.beginPath(); g.moveTo(-s * 0.055, -s * 0.18); g.lineTo(-s * 0.055, -s * 0.24); g.arc(0, -s * 0.24, s * 0.055, Math.PI, 0); g.lineTo(s * 0.055, -s * 0.18); g.closePath();
    g.fillStyle = col.dark; g.fill();
    // visage
    var ey = -s * 0.38;
    eye(g, -s * 0.075, ey, s * 0.034, { blink: o.blink, happy: o.happy, ly: 0.2, lx: o.dir * 0.6 });
    eye(g, s * 0.075, ey, s * 0.034, { blink: o.blink, happy: o.happy, ly: 0.2, lx: o.dir * 0.6 });
    blush(g, -s * 0.12, -s * 0.32, s * 0.03); blush(g, s * 0.12, -s * 0.32, s * 0.03);
    g.beginPath(); g.arc(0, -s * 0.33, s * 0.025, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = s * 0.018; g.strokeStyle = INK; g.stroke();
    if (lvl >= 2) { // petit drapeau
      g.beginPath(); g.moveTo(s * 0.19, -s * 0.7); g.lineTo(s * 0.19, -s * 0.9); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
      var wv = Math.sin(clock * 6 + o.seed) * s * 0.015;
      g.beginPath(); g.moveTo(s * 0.19, -s * 0.9); g.quadraticCurveTo(s * 0.26, -s * 0.88 + wv, s * 0.32, -s * 0.86); g.lineTo(s * 0.19, -s * 0.8); g.closePath();
      g.fillStyle = lvl >= 3 ? "#ffd75e" : col.dark; g.fill(); g.lineWidth = s * 0.015; g.stroke();
    }
  }
  function drawBishop(g, s, col, lvl, o) {
    var lw = s * 0.032;
    rrect(g, -s * 0.2, -s * 0.2, s * 0.4, s * 0.11, s * 0.05); fillStroke(g, col.mid, lw);
    // robe en goutte
    g.beginPath(); g.moveTo(-s * 0.19, -s * 0.16);
    g.bezierCurveTo(-s * 0.31, -s * 0.42, -s * 0.13, -s * 0.62, 0, -s * 0.77);
    g.bezierCurveTo(s * 0.13, -s * 0.62, s * 0.31, -s * 0.42, s * 0.19, -s * 0.16); g.closePath();
    fillStroke(g, grad(g, -s * 0.77, -s * 0.16, col.light, col.main), lw);
    // chapeau (mitre) : le haut de la goutte, plus foncé, avec sa fente
    g.save(); g.clip();
    g.beginPath(); g.rect(-s * 0.4, -s * 0.9, s * 0.8, s * 0.43); g.fillStyle = col.dark; g.fill();
    g.beginPath(); g.moveTo(-s * 0.01, -s * 0.73); g.lineTo(s * 0.13, -s * 0.52); g.lineWidth = s * 0.035; g.strokeStyle = col.light; g.stroke();
    g.restore();
    g.beginPath(); g.moveTo(-s * 0.19, -s * 0.16);
    g.bezierCurveTo(-s * 0.31, -s * 0.42, -s * 0.13, -s * 0.62, 0, -s * 0.77);
    g.bezierCurveTo(s * 0.13, -s * 0.62, s * 0.31, -s * 0.42, s * 0.19, -s * 0.16); g.closePath();
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    // col
    g.beginPath(); g.ellipse(0, -s * 0.47, s * 0.21, s * 0.045, 0, 0, TAU); fillStroke(g, col.light, lw * 0.8);
    // pompon + étoile de mage
    g.beginPath(); g.arc(0, -s * 0.8, s * 0.045, 0, TAU); fillStroke(g, lvl >= 3 ? "#ffd75e" : col.light, lw * 0.8);
    star(g, -s * 0.06, -s * 0.6, s * 0.035, 5, 0.45); g.fillStyle = "#ffe68a"; g.fill();
    // visage
    var ey = -s * 0.34;
    eye(g, -s * 0.07, ey, s * 0.03, { blink: o.blink, happy: o.happy || o.cast > 0.3, ly: 0.3, lx: o.dir * 0.5 });
    eye(g, s * 0.07, ey, s * 0.03, { blink: o.blink, happy: o.happy || o.cast > 0.3, ly: 0.3, lx: o.dir * 0.5 });
    blush(g, -s * 0.11, -s * 0.28, s * 0.028); blush(g, s * 0.11, -s * 0.28, s * 0.028);
    g.beginPath(); g.ellipse(0, -s * 0.275, s * 0.018, o.cast > 0.3 ? s * 0.022 : s * 0.01, 0, 0, TAU); g.fillStyle = INK; g.fill();
    if (o.cast > 0) { // lueur magique au bout du chapeau
      var gr = g.createRadialGradient(0, -s * 0.8, 0, 0, -s * 0.8, s * 0.22);
      gr.addColorStop(0, "rgba(255,250,210," + (0.9 * o.cast) + ")"); gr.addColorStop(1, "rgba(255,250,210,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, -s * 0.8, s * 0.22, 0, TAU); g.fill();
    }
  }
  function knightPath(g, s, d) {
    g.beginPath();
    g.moveTo(-s * 0.17 * d, -s * 0.18);
    g.bezierCurveTo(-s * 0.24 * d, -s * 0.34, -s * 0.22 * d, -s * 0.5, -s * 0.14 * d, -s * 0.64);
    g.lineTo(-s * 0.1 * d, -s * 0.8);                               // oreille
    g.lineTo(-s * 0.01 * d, -s * 0.68);
    g.quadraticCurveTo(s * 0.16 * d, -s * 0.68, s * 0.25 * d, -s * 0.5);   // front → museau
    g.quadraticCurveTo(s * 0.31 * d, -s * 0.4, s * 0.22 * d, -s * 0.36);
    g.quadraticCurveTo(s * 0.1 * d, -s * 0.37, s * 0.05 * d, -s * 0.33);   // mâchoire
    g.quadraticCurveTo(s * 0.18 * d, -s * 0.25, s * 0.17 * d, -s * 0.18);  // poitrail
    g.closePath();
  }
  function drawKnight(g, s, col, lvl, o) {
    var lw = s * 0.032, d = o.dir;
    rrect(g, -s * 0.24, -s * 0.22, s * 0.48, s * 0.13, s * 0.05); fillStroke(g, col.mid, lw);
    knightPath(g, s, d); fillStroke(g, grad(g, -s * 0.8, -s * 0.18, col.light, col.main), lw);
    // crinière
    g.beginPath();
    for (var i = 0; i < 4; i++) {
      var t = i / 3, x = lerp(-s * 0.2, -s * 0.11, t) * d, y = lerp(-s * 0.3, -s * 0.66, t);
      g.moveTo(x, y); g.arc(x - s * 0.035 * d, y, s * 0.05, 0, TAU);
    }
    g.fillStyle = lvl >= 3 ? "#ffd75e" : col.dark; g.fill();
    // œil, naseau, joue
    eye(g, s * 0.07 * d, -s * 0.55, s * 0.033, { blink: o.blink, happy: o.happy, lx: d * 0.8, ly: 0.3 });
    g.beginPath(); g.ellipse(s * 0.23 * d, -s * 0.42, s * 0.017, s * 0.012, 0, 0, TAU); g.fillStyle = INK; g.fill();
    blush(g, s * 0.12 * d, -s * 0.46, s * 0.03);
    // bride
    g.beginPath(); g.moveTo(s * 0.04 * d, -s * 0.36); g.lineTo(s * 0.14 * d, -s * 0.61); g.lineWidth = s * 0.02; g.strokeStyle = lvl >= 2 ? "#ffd75e" : col.dark; g.stroke();
  }
  function drawCrownTop(g, s, y) {
    g.beginPath(); g.moveTo(-s * 0.13, y); g.lineTo(-s * 0.15, y - s * 0.11); g.lineTo(-s * 0.07, y - s * 0.05); g.lineTo(0, y - s * 0.14); g.lineTo(s * 0.07, y - s * 0.05); g.lineTo(s * 0.15, y - s * 0.11); g.lineTo(s * 0.13, y); g.closePath();
    g.fillStyle = "#ffd257"; g.fill(); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(0, y - s * 0.035, s * 0.022, 0, TAU); g.fillStyle = "#ff6d8a"; g.fill();
  }
  var TOP_Y = { rook: -0.7, bishop: -0.85, knight: -0.8 };
  // dessin complet d'une pièce (avec aura, étoiles de niveau, couronne)
  function drawPiece(g, type, owner, lvl, x, y, s, o) {
    o = o || {};
    var col = o.flash ? whiteCol(owner, o.flash) : PCOL[owner];
    if (o.dir == null) o.dir = owner === 0 ? 1 : -1;
    if (o.seed == null) o.seed = 0;
    var sc = (1 + (lvl - 1) * 0.045) * (o.scale || 1);
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    // ombre
    g.beginPath(); g.ellipse(0, -s * 0.04, s * 0.32 * sc, s * 0.09, 0, 0, TAU); g.fillStyle = "rgba(40,20,60,.22)"; g.fill();
    // aura des hauts niveaux
    if (lvl >= 3 && !o.noAura) {
      var pulse = 0.75 + 0.25 * Math.sin(clock * 3 + o.seed);
      var ar = s * (lvl >= 4 ? 0.62 : 0.5) * pulse;
      var ag = g.createRadialGradient(0, -s * 0.38, 0, 0, -s * 0.38, ar);
      ag.addColorStop(0, lvl >= 4 ? "rgba(255,214,90,.55)" : hexA(col.main, 0.45)); ag.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = ag; g.beginPath(); g.arc(0, -s * 0.38, ar, 0, TAU); g.fill();
    }
    g.translate(o.ox || 0, o.oy || 0);
    g.scale(sc * (o.sx || 1), sc * (o.sy || 1));
    if (o.rot) g.rotate(o.rot);
    drawBase(g, s, col, lvl);
    if (type === "rook") drawRook(g, s, col, lvl, o);
    else if (type === "bishop") drawBishop(g, s, col, lvl, o);
    else drawKnight(g, s, col, lvl, o);
    if (lvl >= 4) drawCrownTop(g, s, TOP_Y[type] * s + s * 0.02);
    g.restore();
    // étoiles de niveau (toujours droites et lisibles)
    // étoiles de niveau, posées sur le socle : toujours droites, jamais cachées par la pièce du dessus
    if (!o.noStars) drawLevel(g, x + (o.ox || 0), y - s * 0.05, s, lvl, o.alpha);
  }
  var whiteCache = {};
  function whiteCol(owner, f) {
    var k = Math.round(clamp(f, 0, 1) * 10), key = owner + "_" + k;
    if (whiteCache[key]) return whiteCache[key];
    var c = PCOL[owner], o = {};
    for (var n in c) o[n] = c[n][0] === "#" ? mix(c[n], "#ffffff", k / 10 * 0.85) : c[n];
    return (whiteCache[key] = o);
  }
  function drawLevel(g, x, y, s, lvl, alpha) {
    var r = s * 0.062, gap = r * 2.1, x0 = x - (lvl - 1) * gap / 2;
    g.save(); if (alpha != null) g.globalAlpha *= alpha;
    for (var i = 0; i < lvl; i++) {
      var bob = lvl >= 3 ? Math.sin(clock * 4 + i * 0.8) * s * 0.008 : 0;
      star(g, x0 + i * gap, y + bob, r, 5, 0.48);
      g.fillStyle = lvl >= 4 ? "#ffd257" : lvl >= 3 ? "#fff0a0" : "#fff7d6"; g.fill();
      g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
    }
    g.restore();
  }
  function hexA(h, a) { var c = hex2rgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  /* ====================== DESSIN : ENNEMIS ====================== */
  function drawEnemy(g, type, x, y, s, o) {
    o = o || {};
    var C = ENEMY_COL[type], boss = type === "boss";
    var sz = boss ? 1.45 : type === "fast" ? 0.82 : type === "armored" ? 1.08 : 1;
    var ww = s * 0.56 * sz, hh = s * 0.5 * sz;
    var main = mix(C.main, "#ffffff", o.flash || 0), light = mix(C.light, "#ffffff", o.flash || 0);
    if (o.frozen) { main = mix(main, "#a6dcff", 0.5); light = mix(light, "#e6f6ff", 0.5); }
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.beginPath(); g.ellipse(0, -s * 0.02, ww * 0.52, s * 0.08 * sz, 0, 0, TAU); g.fillStyle = "rgba(40,20,60,.25)"; g.fill();
    g.scale(o.sx || 1, o.sy || 1);
    var lw = s * 0.032;
    // pieds
    var step = Math.sin((o.walk || 0) * Math.PI) * s * 0.04;
    [-1, 1].forEach(function (k) { g.beginPath(); g.ellipse(k * ww * 0.25, -s * 0.03 - (k > 0 ? step : 0), ww * 0.14, s * 0.05, 0, 0, TAU); g.fillStyle = C.dark; g.fill(); });
    // corps (blob)
    g.beginPath();
    g.moveTo(-ww / 2, -s * 0.07);
    g.bezierCurveTo(-ww * 0.56, -hh * 0.75, -ww * 0.3, -hh * 1.12, 0, -hh * 1.12);
    g.bezierCurveTo(ww * 0.3, -hh * 1.12, ww * 0.56, -hh * 0.75, ww / 2, -s * 0.07);
    g.quadraticCurveTo(0, -s * 0.01, -ww / 2, -s * 0.07);
    g.closePath();
    fillStroke(g, grad(g, -hh * 1.12, 0, light, main), lw);
    // reflet
    g.beginPath(); g.ellipse(-ww * 0.2, -hh * 0.85, ww * 0.1, hh * 0.08, -0.5, 0, TAU); g.fillStyle = "rgba(255,255,255,.55)"; g.fill();
    var ey = -hh * 0.6, er = s * 0.055 * Math.min(1.25, sz), ex = ww * 0.17;
    if (type === "armored") {
      // casque
      g.beginPath(); g.moveTo(-ww * 0.52, -hh * 0.5);
      g.bezierCurveTo(-ww * 0.56, -hh * 1.2, ww * 0.56, -hh * 1.2, ww * 0.52, -hh * 0.5);
      g.closePath(); fillStroke(g, grad(g, -hh * 1.2, -hh * 0.5, mix("#e7ecf4", "#ffffff", o.flash || 0), mix("#7d869c", "#ffffff", o.flash || 0)), lw);
      g.beginPath(); g.moveTo(0, -hh * 1.12); g.lineTo(0, -hh * 0.52); g.lineWidth = s * 0.02; g.strokeStyle = "#5a627a"; g.stroke();
      [-0.36, 0.36].forEach(function (k) { g.beginPath(); g.arc(k * ww, -hh * 0.62, s * 0.015, 0, TAU); g.fillStyle = "#5a627a"; g.fill(); });
      ey = -hh * 0.4; er *= 0.8;
    }
    if (type === "fast") {
      // antenne + petite plume
      g.beginPath(); g.moveTo(ww * 0.05, -hh * 1.1); g.quadraticCurveTo(ww * 0.2, -hh * 1.45, ww * 0.38, -hh * 1.4); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(ww * 0.38, -hh * 1.4, s * 0.035, 0, TAU); fillStroke(g, "#fff27a", s * 0.018);
    }
    if (boss) {
      g.save(); g.translate(0, -hh * 1.05); g.scale(1.3, 1.3); drawCrownTop(g, s, 0); g.restore();
      g.beginPath(); g.moveTo(-ww * 0.28, -hh * 0.82); g.lineTo(-ww * 0.18, -hh * 0.62); g.lineWidth = s * 0.02; g.strokeStyle = C.dark; g.stroke();
    }
    // yeux (regardent vers le roi, en bas)
    var hurt = (o.flash || 0) > 0.4;
    if (hurt) {
      // yeux plissés > <
      [-1, 1].forEach(function (k) { var cx = k * ex, d = -k * er * 0.6; g.beginPath(); g.moveTo(cx - d, ey - er * 0.55); g.lineTo(cx + d, ey); g.lineTo(cx - d, ey + er * 0.55); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); });
    } else {
      [-1, 1].forEach(function (k) {
        g.beginPath(); g.ellipse(k * ex, ey, er, er * 1.1, 0, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.lineWidth = s * 0.016; g.strokeStyle = INK; g.stroke();
        if (!o.blink) { g.beginPath(); g.arc(k * ex + k * er * 0.1, ey + er * 0.35, er * 0.5, 0, TAU); g.fillStyle = INK; g.fill(); }
        else { g.beginPath(); g.moveTo(k * ex - er, ey); g.lineTo(k * ex + er, ey); g.lineWidth = s * 0.02; g.stroke(); }
      });
      // sourcils ronchons
      [-1, 1].forEach(function (k) { g.beginPath(); g.moveTo(k * (ex + er * 0.9), ey - er * 1.5); g.lineTo(k * (ex - er * 0.6), ey - er * 1.1); g.lineWidth = s * 0.024; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); });
    }
    // bouche
    g.beginPath(); g.arc(0, -hh * 0.28 + (hurt ? 0 : s * 0.02), s * 0.03 * sz, hurt ? 0 : Math.PI * 1.15, hurt ? TAU : Math.PI * 1.85); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
    if (o.frozen) {
      g.globalAlpha *= 0.7;
      [[-0.3, -0.9], [0.32, -0.55], [-0.05, -1.05]].forEach(function (p) { star(g, p[0] * ww, p[1] * hh, s * 0.04, 6, 0.35); g.fillStyle = "#ffffff"; g.fill(); });
    }
    g.restore();
  }

  /* ====================== DESSIN : ROI ====================== */
  function drawKing(g, x, y, s, o) {
    o = o || {};
    g.save(); g.translate(x, y);
    g.beginPath(); g.ellipse(0, -s * 0.03, s * 0.42, s * 0.1, 0, 0, TAU); g.fillStyle = "rgba(30,15,45,.3)"; g.fill();
    if (o.rot) g.rotate(o.rot);
    g.scale(o.sx || 1, o.sy || 1);
    var lw = s * 0.03;
    var flashK = o.hurt || 0;
    // socle
    rrect(g, -s * 0.36, -s * 0.16, s * 0.72, s * 0.14, s * 0.06); fillStroke(g, "#d9b06a", lw);
    // robe : moitié bleue, moitié orange (le roi des deux joueurs)
    g.save();
    g.beginPath(); g.moveTo(-s * 0.32, -s * 0.15); g.quadraticCurveTo(-s * 0.3, -s * 0.5, -s * 0.16, -s * 0.62); g.lineTo(s * 0.16, -s * 0.62); g.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.32, -s * 0.15); g.closePath();
    g.save(); g.clip();
    g.fillStyle = mix(PCOL[0].main, "#ff6060", flashK); g.fillRect(-s * 0.4, -s * 0.7, s * 0.4, s * 0.6);
    g.fillStyle = mix(PCOL[1].main, "#ff6060", flashK); g.fillRect(0, -s * 0.7, s * 0.4, s * 0.6);
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(-s * 0.4, -s * 0.7, s * 0.8, s * 0.12);
    g.restore();
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.restore();
    // ceinture + boucle
    rrect(g, -s * 0.27, -s * 0.33, s * 0.54, s * 0.06, s * 0.03); fillStroke(g, "#ffd257", lw * 0.7);
    // tête
    g.beginPath(); g.arc(0, -s * 0.78, s * 0.2, 0, TAU); fillStroke(g, mix("#ffe2c6", "#ff9a9a", flashK), lw);
    // barbe moustache
    g.beginPath(); g.moveTo(-s * 0.12, -s * 0.7); g.quadraticCurveTo(0, -s * 0.6, s * 0.12, -s * 0.7); g.quadraticCurveTo(0, -s * 0.66, -s * 0.12, -s * 0.7); g.fillStyle = "#fffaf0"; g.fill(); g.lineWidth = lw * 0.6; g.stroke();
    // yeux
    var lk = clamp(o.look || 0, -1, 1);
    if (o.dead) { [-1, 1].forEach(function (k) { var ex = k * s * 0.075, ey = -s * 0.8; g.beginPath(); g.moveTo(ex - s * 0.03, ey - s * 0.03); g.lineTo(ex + s * 0.03, ey + s * 0.03); g.moveTo(ex + s * 0.03, ey - s * 0.03); g.lineTo(ex - s * 0.03, ey + s * 0.03); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke(); }); }
    else if (flashK > 0.3) { [-1, 1].forEach(function (k) { var ex = k * s * 0.075, ey = -s * 0.8; g.beginPath(); g.moveTo(ex - k * s * 0.035, ey - s * 0.03); g.lineTo(ex + k * s * 0.025, ey); g.lineTo(ex - k * s * 0.035, ey + s * 0.03); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); }); }
    else { eye(g, -s * 0.075, -s * 0.81, s * 0.032, { blink: o.blink, lx: lk, ly: 0.5 }); eye(g, s * 0.075, -s * 0.81, s * 0.032, { blink: o.blink, lx: lk, ly: 0.5 }); }
    blush(g, -s * 0.13, -s * 0.74, s * 0.035); blush(g, s * 0.13, -s * 0.74, s * 0.035);
    if (o.sweat) { g.beginPath(); g.moveTo(s * 0.19, -s * 0.92); g.quadraticCurveTo(s * 0.23, -s * 0.85, s * 0.2, -s * 0.82); g.quadraticCurveTo(s * 0.16, -s * 0.85, s * 0.19, -s * 0.92); g.fillStyle = "#8fd3ff"; g.fill(); }
    // couronne + croix
    g.save(); g.translate(0, -s * 0.94); g.scale(1.6, 1.6); drawCrownTop(g, s, 0); g.restore();
    g.beginPath(); g.rect(-s * 0.018, -s * 1.27, s * 0.036, s * 0.12); g.rect(-s * 0.05, -s * 1.23, s * 0.1, s * 0.034); g.fillStyle = "#ffd257"; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = INK; g.stroke();
    g.restore();
  }

  /* ====================== DESSIN : ICÔNES ====================== */
  function drawGem(g, x, y, r, col, shine) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, -r * 0.25); g.lineTo(0, r); g.lineTo(-r * 0.8, -r * 0.25); g.closePath();
    fillStroke(g, grad(g, -r, r, col.light, col.main), r * 0.12);
    g.beginPath(); g.moveTo(-r * 0.8, -r * 0.25); g.lineTo(r * 0.8, -r * 0.25); g.moveTo(0, -r); g.lineTo(-r * 0.3, -r * 0.25); g.lineTo(0, r); g.lineTo(r * 0.3, -r * 0.25); g.closePath();
    g.lineWidth = r * 0.06; g.strokeStyle = "rgba(58,44,76,.45)"; g.stroke();
    if (shine) { g.globalAlpha = shine; star(g, -r * 0.35, -r * 0.45, r * 0.35, 4, 0.25); g.fillStyle = "#fff"; g.fill(); }
    g.restore();
  }
  function drawPowerIcon(g, kind, x, y, r) {
    g.save(); g.translate(x, y);
    if (kind === "grenade") {
      g.beginPath(); g.arc(0, r * 0.1, r * 0.72, 0, TAU); fillStroke(g, grad(g, -r * 0.6, r * 0.8, "#6a6283", "#2e2840"), r * 0.1);
      rrect(g, -r * 0.22, -r * 0.78, r * 0.44, r * 0.26, r * 0.06); fillStroke(g, "#c9a45c", r * 0.08);
      g.beginPath(); g.moveTo(0, -r * 0.78); g.quadraticCurveTo(r * 0.2, -r * 1.05, r * 0.42, -r * 0.95); g.lineWidth = r * 0.08; g.strokeStyle = "#8a6a3a"; g.stroke();
      star(g, r * 0.48, -r * 0.98, r * 0.22, 6, 0.4); g.fillStyle = "#ffd257"; g.fill();
      g.beginPath(); g.ellipse(-r * 0.28, -r * 0.15, r * 0.14, r * 0.09, -0.6, 0, TAU); g.fillStyle = "rgba(255,255,255,.4)"; g.fill();
      eye(g, -r * 0.22, r * 0.12, r * 0.1, { ly: 0 }); eye(g, r * 0.22, r * 0.12, r * 0.1, { ly: 0 });
    } else if (kind === "freeze") {
      rrect(g, -r * 0.75, -r * 0.75, r * 1.5, r * 1.5, r * 0.3); fillStroke(g, grad(g, -r, r, "#eaf8ff", "#8fd0ff"), r * 0.1);
      g.strokeStyle = "#3b82c4"; g.lineWidth = r * 0.12; g.lineCap = "round";
      for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); g.lineTo(-Math.cos(a) * r * 0.5, -Math.sin(a) * r * 0.5); g.stroke(); }
      g.beginPath(); g.ellipse(-r * 0.4, -r * 0.45, r * 0.15, r * 0.08, -0.6, 0, TAU); g.fillStyle = "#fff"; g.fill();
    } else {
      var cols = ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"];
      for (var k = 0; k < cols.length; k++) { g.beginPath(); g.arc(0, r * 0.35, r * (0.95 - k * 0.11), Math.PI, TAU); g.lineWidth = r * 0.12; g.strokeStyle = cols[k]; g.stroke(); }
      g.beginPath(); g.arc(-r * 0.62, r * 0.4, r * 0.22, 0, TAU); g.arc(-r * 0.4, r * 0.42, r * 0.2, 0, TAU); g.fillStyle = "#fff"; g.fill();
      g.beginPath(); g.arc(r * 0.62, r * 0.4, r * 0.22, 0, TAU); g.arc(r * 0.4, r * 0.42, r * 0.2, 0, TAU); g.fill();
    }
    g.restore();
  }

  /* ====================== EFFETS ====================== */
  var MAX_PARTS = 700;
  function part(o) { if (parts.length < MAX_PARTS) parts.push(o); }
  function burst(x, y, n, o) {
    n = fxN(n); o = o || {};
    for (var i = 0; i < n; i++) {
      var a = o.ang != null ? o.ang + rnd(-o.spread || -0.6, o.spread || 0.6) : rnd(0, TAU), sp = rnd(o.min || 60, o.max || 220);
      var cols = o.colors || ["#fff"];
      part({ x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: 0, max: rnd(o.life || 0.5, (o.life || 0.5) * 1.6),
        size: rnd(o.size || 4, (o.size || 4) * 1.6), color: cols[Math.floor(Math.random() * cols.length)], kind: o.kind || "dot", g: o.g == null ? 300 : o.g, drag: o.drag || 2.2, rot: rnd(0, TAU), vr: rnd(-8, 8) });
    }
  }
  function ring(x, y, r0, r1, life, color, width) { rings.push({ x: x, y: y, r0: r0, r1: r1, life: 0, max: life, color: color, width: width || 4 }); }
  function text(x, y, txt, o) {
    o = o || {};
    texts.push({ x: x, y: y, txt: txt, color: o.color || "#fff", size: o.size || 20, life: 0, max: o.life || 0.9, vy: o.vy == null ? -50 : o.vy, outline: o.outline || INK, pop: o.pop == null ? 1 : o.pop, big: o.big });
  }
  function shake(a) { if (fxOn()) trauma = Math.min(1, trauma + a); }
  function doFlash(a, col) { if (fxOn()) { flash = Math.max(flash, a); flashCol = col || "#fff"; } }
  function slow(t) { if (fxOn()) slowmo = Math.max(slowmo, t); }

  function updateFx(dt) {
    var i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      if (p.kind === "gem") {   // file vers la réserve de mana d'un joueur
        var k = clamp(p.life / p.max, 0, 1), e = easeInOut(k);
        p.x = lerp(p.x0, p.tx, e) + Math.sin(k * Math.PI) * p.cx; p.y = lerp(p.y0, p.ty, e) - Math.sin(k * Math.PI) * 60;
        if (p.life + dt >= p.max && ui) { var u = ui[p.p]; u.manaBump = 1; SFX.mana(); }
        continue;
      }
      var dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life += dt; if (rings[i].life >= rings[i].max) rings.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { var t = texts[i]; t.life += dt; t.y += t.vy * dt; t.vy *= Math.exp(-2.5 * dt); if (t.life >= t.max) texts.splice(i, 1); }
    for (i = beams.length - 1; i >= 0; i--) { beams[i].life += dt; if (beams[i].life >= beams[i].max) beams.splice(i, 1); }
    for (i = circles.length - 1; i >= 0; i--) { circles[i].life += dt; if (circles[i].life >= circles[i].max) circles.splice(i, 1); }
    for (i = rays.length - 1; i >= 0; i--) { rays[i].life += dt; if (rays[i].life >= rays[i].max) rays.splice(i, 1); }
    for (i = deaths.length - 1; i >= 0; i--) { deaths[i].t += dt; if (deaths[i].t >= 0.16) deaths.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    trauma = Math.max(0, trauma - dt * 1.8);
    flash = Math.max(0, flash - dt * 3);
  }
  function spring(o, dt, k, c) { // ressort amorti : o.sq revient à 0 en rebondissant
    var a = -k * o.sq - c * o.sqv; o.sqv += a * dt; o.sq += o.sqv * dt;
  }

  /* ====================== ÉVÉNEMENTS DU MOTEUR → EFFETS ====================== */
  function pieceMuzzle(pc) {
    var x = cellX(pc.c), y = cellY(pc.r) + CELL * 0.32, d = pc.owner === 0 ? 1 : -1;
    if (pc.type === "rook") return { x: x + d * CELL * 0.22, y: y - CELL * 0.42 };
    if (pc.type === "bishop") return { x: x, y: y - CELL * 0.8 };
    return { x: x + d * CELL * 0.22, y: y - CELL * 0.5 };
  }
  function enemyPos(v) { return { x: v.x, y: v.y - CELL * 0.22 * (v.type === "boss" ? 1.4 : 1) }; }

  function handleEvents() {
    var evs = w.events; w.events = [];
    for (var i = 0; i < evs.length; i++) onEvent(evs[i]);
  }
  function onEvent(e) {
    var v, x, y, u, col;
    switch (e.k) {
      case "summon": {
        var pc = e.piece; v = pv(pc); v.born = clock; v.sq = 0; v.sqv = 0;
        x = cellX(pc.c); y = cellY(pc.r) + CELL * 0.32;
        col = PCOL[pc.owner];
        circles.push({ x: x, y: y - 6, life: 0, max: 0.7, color: col.main, light: col.light });
        burst(x, y - 20, 14, { colors: [col.light, "#fff", "#ffe68a"], kind: "star", min: 40, max: 160, up: 120, g: -40, life: 0.6, size: 4 });
        SFX.summon();
        tutoEvent("summon");
        break;
      }
      case "fuse": {
        var into = e.into, from = e.from;
        fusions.push({ t: 0, p: e.p, from: { x: cellX(from.c), y: cellY(from.r) + CELL * 0.32, type: from.type, lvl: from.lvl },
          into: { x: cellX(into.c), y: cellY(into.r) + CELL * 0.32, type: into.type, lvl: into.lvl }, piece: e.piece, done: false, rainbow: e.rainbow });
        var fv = pv(e.piece); fv.hideUntil = clock + 0.34; fv.born = clock + 0.34; fv.fuse = true; fv.landedOnce = true;
        SFX.fuseStart();
        tutoEvent("fuse");
        break;
      }
      case "fire": {
        var p2 = e.piece; v = pv(p2);
        var ev2 = evis[e.enemy.id], m = pieceMuzzle(p2);
        var tgt = ev2 ? enemyPos(ev2) : { x: cellX(e.enemy.c), y: cellY(e.enemy.r) };
        vshots.push({ id: e.shot.id, type: p2.type, owner: p2.owner, lvl: p2.lvl, x0: m.x, y0: m.y, tx: tgt.x, ty: tgt.y, target: e.enemy.id, t: 0, dur: e.shot.dur, trailT: 0 });
        col = PCOL[p2.owner];
        if (p2.type === "rook") {
          v.recoil = 1; v.rdir = tgt.x > cellX(p2.c) ? -1 : 1;
          burst(m.x, m.y, 3, { colors: ["#fff", col.light], min: 40, max: 120, life: 0.15, size: 3, g: 0 });
          SFX.rook();
        } else if (p2.type === "bishop") {
          v.cast = 1;
          ring(m.x, m.y, 2, 16, 0.25, col.light, 3);
          SFX.bishop();
        } else { v.jump = 1; v.sq = -0.25; v.sqv = 0; SFX.knight(); }
        break;
      }
      case "hit": {
        v = evis[e.enemy.id]; if (!v) break;
        v.flash = 1; v.hp = e.enemy.hp;
        var ep = enemyPos(v);
        col = e.p === 0 || e.p === 1 ? PCOL[e.p] : PCOL[0];
        if (e.src === "rook") { v.sq = 0.18; v.sqv = 0; v.knock = -4; burst(ep.x, ep.y, 4, { colors: ["#fff", col.light], min: 50, max: 150, life: 0.25, size: 3 }); if (!e.kill) SFX.hitRook(); }
        else if (e.src === "bishop") { v.sq = 0.22; v.sqv = 0; ring(ep.x, ep.y, 6, 30, 0.35, col.main, 3); burst(ep.x, ep.y, 6, { colors: [col.light, "#fffbe0"], kind: "star", min: 30, max: 120, life: 0.4, size: 3, g: 0 }); if (!e.kill) SFX.hitBishop(); }
        else if (e.src === "knight") {
          v.sq = 0.5; v.sqv = 0; v.knock = -10;
          ring(ep.x, ep.y, 8, 38, 0.3, "#fff", 5);
          burst(ep.x, ep.y, 9, { colors: ["#fff", col.main, "#ffe68a"], kind: "star", min: 90, max: 260, life: 0.4, size: 4 });
          text(ep.x + rnd(-8, 8), ep.y - 26, fmt(e.dmg), { color: "#fff7c2", size: 17, life: 0.6, vy: -70 });
          shake(0.08); if (!e.kill) SFX.hitKnight();
        } else { v.sq = 0.4; v.sqv = 0; }
        break;
      }
      case "kill": {
        v = evis[e.enemy.id];
        if (v) {
          var p0 = enemyPos(v);
          deaths.push({ x: v.x, y: v.y, type: v.type, t: 0 });
          var C = ENEMY_COL[v.type];
          var nowK = clock;
          if (nowK - killWin.t < 0.45) killWin.n++; else killWin.n = 1;
          killWin.t = nowK;
          var big = killWin.n >= 2;
          burst(p0.x, p0.y, big ? 20 : 13, { colors: [C.main, C.light, "#fff"], min: 80, max: big ? 320 : 240, life: 0.5, size: big ? 6 : 5 });
          burst(p0.x, p0.y, 5, { colors: ["#fff"], kind: "star", min: 40, max: 120, life: 0.4, size: 5, g: 0 });
          ring(p0.x, p0.y, 6, big ? 52 : 36, 0.3, C.light, big ? 6 : 4);
          text(p0.x, p0.y - 14, "+" + e.score, { color: "#fff3a6", size: v.type === "boss" ? 30 : 18, life: 0.9 });
          if (killWin.n >= 3 && killWin.n <= 6) { text(p0.x, p0.y - 44, ["", "", "", "TRIPLE !", "QUADRUPLE !", "QUINTUPLE !", "MÉGA !"][killWin.n], { color: "#ffd257", size: 24, life: 1, big: true }); SFX.multi(killWin.n); stats2.multi++; shake(0.12); }
          else if (killWin.n === 2) { text(p0.x, p0.y - 44, "DOUBLE !", { color: "#ffe9a0", size: 20, life: 0.9, big: true }); SFX.multi(2); }
          if (v.type === "boss") { shake(0.5); doFlash(0.5, "#fff3c0"); slow(0.4); burst(p0.x, p0.y, 40, { colors: ["#ffd257", C.light, "#fff"], kind: "star", min: 120, max: 420, life: 0.9, size: 7 }); }
          SFX.pop(killWin.n);
          // le mana file vers les deux joueurs
          if (fxOn() || Math.random() < 0.4) [0, 1].forEach(function (pi) { var tgt2 = manaPos(pi); part({ kind: "gem", p: pi, x0: p0.x, y0: p0.y, x: p0.x, y: p0.y, tx: tgt2.x, ty: tgt2.y, cx: rnd(-30, 30), life: 0, max: rnd(0.55, 0.8), size: 7, color: PCOL[pi].main }); });
          else ui.forEach(function (uu) { uu.manaBump = 1; });
          delete evis[e.enemy.id];
        }
        break;
      }
      case "combo": {
        v = { x: cellX(e.enemy.c), y: cellY(e.enemy.r) };
        stats2.maxChain = Math.max(stats2.maxChain, e.chain);
        var bigOne = clock - lastBigCoop > 1.4 || e.chain % 5 === 0;
        if (bigOne) {
          lastBigCoop = clock; stats2.bigCoop++;
          slow(0.32); doFlash(0.28, "#fff6dc"); shake(0.12);
          for (var pi = 0; pi < 2; pi++) {
            var mp = manaPos(pi);
            beams.push({ x0: mp.x, y0: mp.y, x1: v.x, y1: v.y - 14, life: 0, max: 0.45, color: PCOL[pi].main });
          }
          // spirale bicolore
          for (var k = 0; k < fxN(26); k++) { var a = k / 26 * TAU * 2, sp = 90 + k * 7; part({ x: v.x, y: v.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8, size: 5, color: PCOL[k % 2].main, kind: "star", g: 0, drag: 2.5, rot: a, vr: 6 }); }
          ring(v.x, v.y - 14, 10, 90, 0.5, PCOL[0].main, 6); ring(v.x, v.y - 14, 4, 70, 0.55, PCOL[1].main, 6);
          text(KING_X, BY + BH * 0.42, "COMBO COOP !", { color: "#ffffff", size: 44, life: 1.3, vy: -18, big: true, outline: INK });
          text(KING_X, BY + BH * 0.42 + 40, (e.chain > 1 ? "×" + e.chain + "  ·  " : "") + "+" + e.mana + " mana chacun · +" + e.score, { color: "#ffe9a0", size: 20, life: 1.3, vy: -18 });
          SFX.coop(e.chain);
        } else {
          text(v.x, v.y - 50, "COOP ×" + e.chain, { color: "#ffffff", size: 18, life: 0.8, big: true });
          burst(v.x, v.y - 14, 8, { colors: [PCOL[0].main, PCOL[1].main], kind: "star", min: 60, max: 180, life: 0.45, size: 4, g: 0 });
          SFX.coopSmall();
        }
        break;
      }
      case "spawn": { v = ev(e.enemy); v.fromR = -1; v.toR = 0; v.hop = 0; v.hopDur = 0.5; SFX.spawn(); burst(v.x, PORTAL_Y, 6, { colors: ["#c9b6ff", "#fff"], kind: "star", min: 20, max: 90, life: 0.5, g: 0, size: 3 }); break; }
      case "step": { v = evis[e.enemy.id]; if (v) { v.fromR = e.enemy.r - 1; v.toR = e.enemy.r; v.hop = 0; v.hopDur = Math.min(0.42, e.enemy.stepDur * 0.4); } SFX.step(); break; }
      case "leak": {
        v = evis[e.enemy.id];
        if (v) { leakers.push({ v: v, t: 0, dmg: e.dmg, x0: v.x, y0: v.y }); delete evis[e.enemy.id]; }
        else kingHit(e.dmg);
        break;
      }
      case "waveStart": SFX.waveStart(); showBanner("VAGUE " + e.n, e.n % 10 === 0 ? "Un Gros Pionnet arrive !" : e.total + " ennemis"); tutoEvent("wave"); break;
      case "waveEnd": {
        var bigW = e.n % 10 === 0;
        showBanner(e.perfect ? "DÉFENSE PARFAITE !" : "VAGUE " + e.n + " RÉUSSIE !", "+" + e.mana + " mana chacun · +" + fmt(e.score) + " points");
        SFX.waveEnd(bigW || e.perfect);
        for (var q = 0; q < fxN(30); q++) part({ x: rnd(BX, BX + BW), y: BY - 10, vx: rnd(-60, 60), vy: rnd(-80, 40), life: 0, max: rnd(1.4, 2.2), size: rnd(4, 7), color: ["#ffd257", PCOL[0].main, PCOL[1].main, "#ff8fb0", "#fff"][q % 5], kind: "confetti", g: 120, drag: 1.2, rot: rnd(0, TAU), vr: rnd(-10, 10) });
        ui.forEach(function (uu) { uu.manaBump = 1; });
        break;
      }
      case "over": {
        SFX.over(); shake(0.6); doFlash(0.6, "#ff9a9a"); kingFx.fall = 0.001;
        vshots = []; throws = []; ui.forEach(function (uu) { uu.sel = null; uu.drag = null; uu.aimGrenade = false; });
        stopMusic();
        var tok = overToken;
        setTimeout(function () { if (tok === overToken && mode === "over") gameOverCard(); }, 1700);
        mode = "over"; hud.hidden = true; updateLaunch();
        recordBest();
        if (party && !party.ended) { party.ended = true; window.Party.over({ score: w.score, dead: true }); }
        break;
      }
      case "upgrade": {
        u = ui[e.p]; u.upgFlash[K.TYPES.indexOf(e.type)] = 1;
        for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) {
          var pp = w.grid[c][r];
          if (pp && pp.owner === e.p && pp.type === e.type) { pv(pp).sq = 0.3; pv(pp).sqv = 0; burst(cellX(c), cellY(r), 5, { colors: ["#ffe68a", "#fff"], kind: "star", min: 30, max: 100, up: 80, g: -60, life: 0.5, size: 3 }); }
        }
        SFX.upgrade();
        break;
      }
      case "powerGet": {
        u = ui[e.p]; u.powerPop = 1;
        var pb = powerBox(e.p);
        burst(pb.x + pb.w / 2, pb.y + 66, 16, { colors: ["#ffd257", "#fff", PCOL[e.p].main], kind: "star", min: 60, max: 200, life: 0.6, g: 0, size: 5 });
        text(pb.x + pb.w / 2, pb.y + 20, "Nouveau pouvoir !", { color: "#ffe9a0", size: 18, life: 1.2, vy: -30 });
        SFX.power();
        break;
      }
      case "grenade": {
        x = cellX(3); y = cellY(e.r);
        shake(0.45); doFlash(0.35, "#fff1c9");
        ring(x, y, 10, CELL * 2.2, 0.45, "#ffd257", 10); ring(x, y, 4, CELL * 1.6, 0.35, "#ffffff", 6);
        burst(x, y, 40, { colors: ["#ffd257", "#ff9147", "#fff3c4", "#ff6b5a"], min: 120, max: 520, life: 0.6, size: 7, jx: CELL, jy: CELL * 0.8 });
        burst(x, y, 14, { colors: ["#6b6283", "#9c95b5"], min: 60, max: 200, life: 1.1, size: 9, g: -30, drag: 1.5 });
        text(x, y - 40, "BOUM !", { color: "#ffe066", size: 40, life: 1, big: true });
        SFX.boom();
        break;
      }
      case "freeze": {
        doFlash(0.4, "#d8f2ff"); SFX.freeze();
        for (var f = 0; f < fxN(40); f++) part({ x: rnd(cellX(2) - CELL / 2, cellX(4) + CELL / 2), y: rnd(BY - 40, BY + BH), vx: rnd(-20, 20), vy: rnd(20, 60), life: 0, max: rnd(1.5, 3), size: rnd(3, 6), color: "#ffffff", kind: "snow", g: 10, drag: 0.5, rot: 0, vr: rnd(-2, 2) });
        text(KING_X, BY + BH * 0.35, "GEL !", { color: "#e6f6ff", size: 40, life: 1.1, big: true, outline: "#2b6aa8" });
        break;
      }
      case "rainbow": {
        SFX.rainbow();
        u = ui[e.p]; u.sel = null;
        text(PANEL[e.p].x + PANEL[e.p].w / 2, PANEL[e.p].y + 470, "Choisis 2 pièces de même niveau", { color: "#fff", size: 15, life: 2.2, vy: -10 });
        break;
      }
    }
  }
  function kingHit(dmg) {
    kingFx.hurt = 1; kingFx.sq = 0.35; kingFx.sqv = 0;
    shake(0.35 + dmg * 0.1); doFlash(0.25, "#ff8a8a");
    SFX.leak();
    burst(KING_X, KING_Y - 60, 16, { colors: ["#ff6b81", "#ffb3c0", "#fff"], kind: "heart", min: 60, max: 220, up: 120, life: 0.8, size: 7 });
    text(KING_X, KING_Y - 140, "-" + dmg + " ♥", { color: "#ff8a9c", size: 28, life: 1, big: true });
  }
  function manaPos(p) { var P = PANEL[p]; return { x: P.x + 42, y: P.y + 98 }; }
  function powerBox(p) { var P = PANEL[p]; return { x: P.x + 10, y: P.y + 372, w: P.w - 20, h: 122 }; }
  function upgRect(p, i) { var P = PANEL[p]; return { x: P.x + 10, y: P.y + 214 + i * 50, w: P.w - 20, h: 44 }; }
  function showBanner(t1, t2) { banner = { t1: t1, t2: t2, t: 0, dur: 2.2 }; }

  /* ====================== MISE À JOUR ====================== */
  var acc = 0, STEP = 1 / 120;
  function update(rdt) {
    var gdt = rdt;
    if (hitstop > 0) { hitstop -= rdt; gdt = 0; }
    else if (slowmo > 0) { slowmo -= rdt; gdt = rdt * 0.32; }
    clock += gdt;
    if (mode === "play" && w.state !== "over") {
      acc += gdt;
      var n = 0;
      while (acc >= STEP && n < 12) { K.step(w, STEP); acc -= STEP; n++; handleEvents(); if (w.state === "over") break; }
      throws.forEach(function (t) { t.t += gdt; });
      for (var i = throws.length - 1; i >= 0; i--) if (throws[i].t >= throws[i].dur) { var th = throws.splice(i, 1)[0]; land(th); }
    } else acc = 0;
    updateVis(gdt, rdt);
    updateFx(gdt);
  }
  function land(th) {
    if (!w || w.state === "over") return;
    if (th.kind !== "grenade") return;
    var pl = w.players[th.p], keep = pl.power;   // un pouvoir reçu pendant le vol n'est pas perdu
    pl.power = "grenade";
    if (K.usePower(w, th.p, th.r) === "ok") pl.power = keep;
    else if (keep) pl.power = keep;
    handleEvents();
  }
  function updateVis(dt, rdt) {
    var id, v;
    // pièces
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) {
      var pc = w.grid[c][r]; if (!pc) continue;
      v = pv(pc);
      v.recoil = Math.max(0, v.recoil - dt * 7);
      v.cast = Math.max(0, v.cast - dt * 3.5);
      v.jump = Math.max(0, v.jump - dt * 3.2);
      spring(v, dt, 260, 13);
      v.blink -= dt; if (v.blink < -0.12) v.blink = rnd(2, 5);
    }
    // ennemis
    for (id in evis) {
      v = evis[id];
      v.hop = Math.min(1, v.hop + dt / v.hopDur);
      var k = easeOut(v.hop);
      var y0 = v.fromR < 0 ? PORTAL_Y + 14 : cellY(v.fromR) + CELL * 0.3, y1 = cellY(v.toR) + CELL * 0.3;
      var landed = v.hop >= 1 && !v.landed;
      v.y = lerp(y0, y1, k) - Math.sin(v.hop * Math.PI) * 12;
      if (v.hop < 1) v.landed = false;
      if (landed) { v.landed = true; v.sq = 0.25; v.sqv = 0; }
      v.flash = Math.max(0, v.flash - dt * 6);
      v.knock *= Math.exp(-dt * 12);
      spring(v, dt, 300, 12);
      v.blink -= dt; if (v.blink < -0.12) v.blink = rnd(1.5, 4);
      v.hpShown = lerp(v.hpShown, v.hp / v.maxHp, 1 - Math.exp(-dt * 10));
    }
    // tirs visibles (suivent la cible)
    for (var i = vshots.length - 1; i >= 0; i--) {
      var s = vshots[i]; s.t += dt;
      var tv = evis[s.target];
      if (tv) { var tp = enemyPos(tv); s.tx = tp.x; s.ty = tp.y; }
      if (s.t >= s.dur) { if (!tv) burst(s.tx, s.ty, 3, { colors: ["#fff"], min: 20, max: 60, life: 0.2, size: 3 }); vshots.splice(i, 1); continue; }
      if (s.type === "bishop" && fxOn()) { s.trailT -= dt; if (s.trailT <= 0) { s.trailT = 0.02; var sp2 = shotPos(s); part({ x: sp2.x, y: sp2.y, vx: rnd(-15, 15), vy: rnd(-15, 15), life: 0, max: 0.3, size: 3.5, color: PCOL[s.owner].light, kind: "dot", g: 0, drag: 3, rot: 0, vr: 0 }); } }
    }
    // fusions
    for (i = fusions.length - 1; i >= 0; i--) {
      var f = fusions[i]; f.t += dt;
      if (!f.done && f.t >= 0.34) {
        f.done = true;
        var lvl = f.piece.lvl, col = PCOL[f.p], hi = lvl >= 3;
        doFlash(hi ? 0.3 : 0.12, "#fffbe6");
        ring(f.into.x, f.into.y - 28, 6, hi ? 80 : 54, 0.4, col.light, hi ? 7 : 5);
        ring(f.into.x, f.into.y - 28, 2, hi ? 56 : 36, 0.3, "#fff", 4);
        burst(f.into.x, f.into.y - 28, hi ? 30 : 18, { colors: [col.main, col.light, "#ffe68a", "#fff"], kind: "star", min: 80, max: hi ? 340 : 240, life: 0.6, size: hi ? 6 : 5, g: 120 });
        if (f.rainbow) burst(f.into.x, f.into.y - 28, 24, { colors: ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"], kind: "star", min: 80, max: 280, life: 0.8, size: 5, g: 0 });
        if (hi) { rays.push({ x: f.into.x, y: f.into.y - 28, life: 0, max: lvl >= 4 ? 1.1 : 0.7, gold: lvl >= 4 }); hitstop = fxOn() ? 0.06 : 0; shake(lvl >= 4 ? 0.3 : 0.15); }
        text(f.into.x, f.into.y - CELL * 0.95, lvl >= 4 ? "NIVEAU MAX !" : "Niveau " + lvl + " !", { color: lvl >= 4 ? "#ffd257" : "#fff", size: lvl >= 4 ? 24 : 19, life: 1, big: true });
        var nv = pv(f.piece); nv.sq = 0.55; nv.sqv = 0;
        SFX.fuse(lvl);
      }
      if (f.t >= 0.6) fusions.splice(i, 1);
    }
    // ennemis qui atteignent le roi
    for (i = leakers.length - 1; i >= 0; i--) {
      var L = leakers[i]; L.t += dt;
      if (L.t >= 0.45) { leakers.splice(i, 1); kingHit(L.dmg); burst(KING_X, KING_Y - 50, 10, { colors: [ENEMY_COL[L.v.type].main, "#fff"], min: 60, max: 200, life: 0.4 }); }
    }
    // roi
    kingFx.hurt = Math.max(0, kingFx.hurt - dt * 2.5);
    spring(kingFx, dt, 200, 10);
    if (kingFx.fall > 0) kingFx.fall = Math.min(1, kingFx.fall + dt * 1.6);
    var near = null, bp = -1;
    w.enemies.forEach(function (e) { var p = K.progress(e); if (p > bp) { bp = p; near = e; } });
    kingFx.look = lerp(kingFx.look, near ? clamp((cellX(near.c) - KING_X) / CELL, -1, 1) : 0, 1 - Math.exp(-dt * 4));
    // interface des joueurs (le temps réel, même au ralenti)
    ui.forEach(function (u, pi) {
      var tx = cellX(u.cur.c), ty = cellY(u.cur.r), kk = 1 - Math.exp(-rdt * 22);
      u.cx = lerp(u.cx, tx, kk); u.cy = lerp(u.cy, ty, kk);
      u.deny = Math.max(0, u.deny - rdt * 3); u.denyT = Math.max(0, u.denyT - rdt);
      u.manaBump = Math.max(0, u.manaBump - rdt * 4);
      u.powerPop = Math.max(0, u.powerPop - rdt * 2);
      for (var j = 0; j < 3; j++) u.upgFlash[j] = Math.max(0, u.upgFlash[j] - rdt * 3);
      u.mana = lerp(u.mana, w.players[pi].mana, 1 - Math.exp(-rdt * 14));
      if (Math.abs(u.mana - w.players[pi].mana) < 0.05) u.mana = w.players[pi].mana;
      if (u.sel) { var sp = w.grid[u.sel.c][u.sel.r]; if (!sp || sp.id !== u.sel.id) u.sel = null; }
      if (u.aimGrenade && w.players[pi].power !== "grenade") u.aimGrenade = false;
    });
    if (shownScore < w.score) { var dS = w.score - shownScore; shownScore = Math.min(w.score, shownScore + Math.max(1, dS * (1 - Math.exp(-rdt * 8)))); scoreBump = 1; }
    scoreBump = Math.max(0, scoreBump - rdt * 3);
  }
  function shotPos(s) {
    var k = clamp(s.t / s.dur, 0, 1);
    var x = lerp(s.x0, s.tx, k), y = lerp(s.y0, s.ty, k);
    if (s.type === "bishop") { var nx = -(s.ty - s.y0), ny = s.tx - s.x0, L = Math.hypot(nx, ny) || 1; var off = Math.sin(k * Math.PI) * 14 * (s.owner ? -1 : 1); x += nx / L * off; y += ny / L * off; }
    if (s.type === "knight") y -= Math.sin(k * Math.PI) * (40 + Math.abs(s.tx - s.x0) * 0.25);
    return { x: x, y: y, k: k };
  }

  /* ====================== RENDU ====================== */
  var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;
  var bgCanvas = document.createElement("canvas"), boardCanvas = document.createElement("canvas");

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    S = Math.min(cw / VW, ch / VH);
    OX = (cw - VW * S) / 2; OY = (ch - VH * S) / 2;
    paintBackground(); paintBoard();
    stage.style.setProperty("--kd-s", S.toFixed(3));
    updateLaunch();
  }

  function paintBackground() {
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    var g = bgCanvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#3a3266"); sky.addColorStop(0.6, "#5a4a83"); sky.addColorStop(1, "#7a5d8f");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // damier très léger en fond
    var sq = 46 * Math.max(0.6, S);
    g.fillStyle = "rgba(255,255,255,.025)";
    for (var y = 0; y < H; y += sq) for (var x = ((y / sq) % 2) * sq; x < W; x += sq * 2) g.fillRect(x, y, sq, sq);
    // lumières douces
    var seed = 11; function r01() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 22; i++) {
      var bx = r01() * W, by = r01() * H, rad = (14 + r01() * 50) * Math.max(0.6, S);
      var gr = g.createRadialGradient(bx, by, 0, bx, by, rad);
      gr.addColorStop(0, "rgba(255,226,200," + (0.04 + r01() * 0.07) + ")"); gr.addColorStop(1, "rgba(255,226,200,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, rad, 0, TAU); g.fill();
    }
  }

  function paintBoard() {
    boardCanvas.width = canvas.width; boardCanvas.height = canvas.height;
    var g = boardCanvas.getContext("2d");
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY);
    // tapis vers le roi
    var cx0 = BX + CELL * 2, cw0 = CELL * 3;
    rrect(g, cx0 + 14, BY + BH - 10, cw0 - 28, 96, 18); g.fillStyle = "#b04a5e"; g.fill();
    rrect(g, cx0 + 24, BY + BH - 10, cw0 - 48, 92, 14); g.fillStyle = "#d8667a"; g.fill();
    g.setLineDash([8, 8]); g.strokeStyle = "rgba(255,230,160,.6)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx0 + 32, BY + BH); g.lineTo(cx0 + 32, BY + BH + 80); g.moveTo(cx0 + cw0 - 32, BY + BH); g.lineTo(cx0 + cw0 - 32, BY + BH + 80); g.stroke(); g.setLineDash([]);
    // murailles du château de chaque côté du roi
    [[BX + 6, PCOL[0]], [BX + BW - CELL * 2 + 10, PCOL[1]]].forEach(function (a) {
      var x = a[0], y = BY + BH + 30, ww = CELL * 2 - 16, col = a[1];
      for (var m = 0; m < 4; m++) { rrect(g, x + 4 + m * (ww - 8) / 4, y - 12, (ww - 8) / 4 - 6, 18, 4); g.fillStyle = "#e1d2ea"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
      rrect(g, x, y, ww, 50, 8); g.fillStyle = grad(g, y, y + 50, "#d9c8e4", "#b49ec6"); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      // briques
      g.save(); rrect(g, x, y, ww, 50, 8); g.clip(); g.strokeStyle = "rgba(58,44,76,.25)"; g.lineWidth = 2;
      for (var by = 0; by < 3; by++) { g.beginPath(); g.moveTo(x, y + 14 + by * 14); g.lineTo(x + ww, y + 14 + by * 14); g.stroke(); for (var bx = (by % 2) * 14; bx < ww; bx += 28) { g.beginPath(); g.moveTo(x + bx, y + by * 14); g.lineTo(x + bx, y + 14 + by * 14); g.stroke(); } }
      g.restore();
      // porte
      g.beginPath(); g.moveTo(x + ww / 2 - 12, y + 50); g.lineTo(x + ww / 2 - 12, y + 30); g.arc(x + ww / 2, y + 30, 12, Math.PI, 0); g.lineTo(x + ww / 2 + 12, y + 50); g.closePath(); g.fillStyle = "#5a4470"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(x + ww / 2, y - 12); g.lineTo(x + ww / 2, y - 44); g.lineWidth = 3; g.stroke();
      g.beginPath(); g.moveTo(x + ww / 2, y - 44); g.lineTo(x + ww / 2 + 22, y - 37); g.lineTo(x + ww / 2, y - 30); g.closePath(); g.fillStyle = col.main; g.fill(); g.stroke();
    });
    // cadre du plateau
    rrect(g, BX - 14, BY - 14, BW + 28, BH + 28, 22); g.fillStyle = "#2a2142"; g.fill();
    rrect(g, BX - 9, BY - 9, BW + 18, BH + 18, 18); g.fillStyle = "#8d77a8"; g.fill();
    rrect(g, BX - 4, BY - 4, BW + 8, BH + 8, 14); g.fillStyle = "#3a2c4c"; g.fill();
    g.save(); rrect(g, BX, BY, BW, BH, 10); g.clip();
    for (var c = 0; c < 7; c++) for (var r = 0; r < 7; r++) {
      var odd = (c + r) % 2, zone = K.ownerOfCol(c), col;
      if (zone === 0) col = odd ? "#c3d9fb" : "#d8e7ff";
      else if (zone === 1) col = odd ? "#fbd5b4" : "#ffe5cf";
      else col = odd ? "#eadfcb" : "#f5ecdc";
      g.fillStyle = col; g.fillRect(BX + c * CELL, BY + r * CELL, CELL, CELL);
      // petit relief
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(BX + c * CELL, BY + r * CELL, CELL, 3);
      g.fillStyle = "rgba(60,40,80,.08)"; g.fillRect(BX + c * CELL, BY + r * CELL + CELL - 3, CELL, 3);
    }
    // ombre intérieure du couloir + séparations
    var lg = g.createLinearGradient(0, BY, 0, BY + 60); lg.addColorStop(0, "rgba(70,40,100,.25)"); lg.addColorStop(1, "rgba(70,40,100,0)");
    g.fillStyle = lg; g.fillRect(cx0, BY, cw0, 60);
    g.fillStyle = "rgba(58,44,76,.35)"; g.fillRect(cx0 - 2, BY, 4, BH); g.fillRect(cx0 + cw0 - 2, BY, 4, BH);
    g.restore();
    // portail au-dessus du couloir
    var px = cx0 + cw0 / 2, py = BY - 6;
    g.beginPath(); g.moveTo(cx0 + 6, py); g.lineTo(cx0 + 6, py - 34); g.quadraticCurveTo(px, py - 92, cx0 + cw0 - 6, py - 34); g.lineTo(cx0 + cw0 - 6, py); g.closePath();
    g.fillStyle = "#2a2142"; g.fill();
    g.beginPath(); g.moveTo(cx0 + 18, py); g.lineTo(cx0 + 18, py - 30); g.quadraticCurveTo(px, py - 78, cx0 + cw0 - 18, py - 30); g.lineTo(cx0 + cw0 - 18, py); g.closePath();
    var pg = g.createRadialGradient(px, py - 20, 4, px, py - 20, 90); pg.addColorStop(0, "#9b7fe0"); pg.addColorStop(1, "#40306a");
    g.fillStyle = pg; g.fill();
    // pierres du portail
    g.fillStyle = "#8d77a8";
    [[cx0 - 4, py - 40, 22, 40], [cx0 + cw0 - 18, py - 40, 22, 40]].forEach(function (b) { rrect(g, b[0], b[1], b[2], b[3], 6); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); });
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    var sx = 0, sy = 0;
    if (trauma > 0 && fxOn()) { var tr = trauma * trauma * 7; sx = rnd(-tr, tr); sy = rnd(-tr, tr); }
    ctx.setTransform(1, 0, 0, 1, sx * dpr, sy * dpr);
    ctx.drawImage(boardCanvas, 0, 0);
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (OX + sx), dpr * (OY + sy));
    if (!w) return;
    drawPortalSwirl();
    drawFreezeTint();
    drawRanges();
    drawCursors(false);
    drawCircles();
    drawUnits();
    drawShots();
    drawFusions();
    drawThrows();
    drawKingArea();
    drawRays();
    drawParticles();
    drawRings();
    drawBeams();
    drawCursors(true);
    drawDrag();
    drawTexts();
    drawTopBar();
    drawPanel(0); drawPanel(1);
    drawBottomHints();
    drawBanner();
    if (flash > 0.01 && fxOn()) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = flash * 0.5; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  }

  function drawPortalSwirl() {
    var px = BX + CELL * 3.5, py = BY - 26;
    ctx.save();
    ctx.globalAlpha = w.state === "wave" ? 0.8 : 0.35;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(px, py, 30 + i * 12, 12 + i * 4, 0, clock * (1.2 + i * 0.4), clock * (1.2 + i * 0.4) + Math.PI * 1.2);
      ctx.strokeStyle = i % 2 ? "#e6dcff" : "#b9a2ff"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    if (w.state === "wave") {
      // progression de la vague
      var done = w.waveTotal - w.queue.length - w.enemies.length, k = clamp(done / Math.max(1, w.waveTotal), 0, 1);
      var bx = BX + CELL * 2 + 30, bw = CELL * 3 - 60, by = BY - 66;
      rrect(ctx, bx, by, bw, 16, 8); ctx.fillStyle = "rgba(30,20,50,.7)"; ctx.fill();
      rrect(ctx, bx + 3, by + 3, Math.max(10, (bw - 6) * k), 10, 5); ctx.fillStyle = "#ffd257"; ctx.fill();
      ctx.font = "800 13px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.fillText((w.queue.length + w.enemies.length) + " ennemis restants", bx + bw / 2, by - 6);
    }
  }
  function drawFreezeTint() {
    if (!w.freeze) return;
    var k = Math.min(1, w.freeze / 0.6);
    ctx.save(); ctx.globalAlpha = 0.28 * k;
    ctx.fillStyle = "#9fdcff"; ctx.fillRect(BX + CELL * 2, BY, CELL * 3, BH);
    ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = "#e9f8ff"; ctx.lineWidth = 3;
    ctx.strokeRect(BX + CELL * 2 + 2, BY + 2, CELL * 3 - 4, BH - 4);
    ctx.restore();
  }

  function selPiece(u) { return u.sel ? w.grid[u.sel.c][u.sel.r] : null; }
  function drawRanges() {
    ui.forEach(function (u, pi) {
      var sp = selPiece(u), hov = !sp ? K.pieceAt(w, u.cur.c, u.cur.r) : null;
      var hk = clamp(2.2 - (clock - u.lastMove) / 1.2, 0, 1);   // l'aperçu au survol s'efface quand le curseur reste immobile
      var pc = sp || (SET.ranges && mode === "play" && hk > 0 ? hov : null);
      if (pc) {
        var strong = !!sp, col = PCOL[pi];
        ctx.save(); if (!strong) ctx.globalAlpha = hk;
        var cells = K.shapeCells(pc.type, pc.c, pc.r);
        cells.forEach(function (c) {
          var x = BX + c.c * CELL, y = BY + c.r * CELL;
          if (c.lane) {
            var ga = strong ? 1 : hk;
            ctx.globalAlpha = ga * ((strong ? 0.42 : 0.22) + (strong ? 0.08 * Math.sin(clock * 5 + c.r) : 0));
            rrect(ctx, x + 4, y + 4, CELL - 8, CELL - 8, 10); ctx.fillStyle = col.main; ctx.fill();
            ctx.globalAlpha = ga * (strong ? 0.9 : 0.5); ctx.lineWidth = 2.5; ctx.strokeStyle = col.dark; ctx.stroke();
            // petite cible
            ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 7, 0, TAU); ctx.moveTo(x + CELL / 2 + 13, y + CELL / 2); ctx.arc(x + CELL / 2, y + CELL / 2, 13, 0, TAU);
            ctx.lineWidth = 2; ctx.stroke();
          } else {
            ctx.globalAlpha = strong ? 0.4 : 0.18 * hk;
            ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 5, 0, TAU); ctx.fillStyle = col.dark; ctx.fill();
          }
          ctx.globalAlpha = strong ? 1 : hk;
        });
        ctx.restore(); ctx.globalAlpha = 1;
      }
      // grenade : prévisualisation des 3 lignes visées
      if (w.players[pi].power === "grenade" && mode === "play") {
        var r0 = u.cur.r;
        ctx.save(); ctx.globalAlpha = u.aimGrenade ? 0.35 + 0.1 * Math.sin(clock * 8) : 0.1;
        ctx.fillStyle = "#ff9147";
        ctx.fillRect(BX + CELL * 2, BY + Math.max(0, r0 - 1) * CELL, CELL * 3, (Math.min(6, r0 + 1) - Math.max(0, r0 - 1) + 1) * CELL);
        ctx.restore();
      }
    });
  }

  function drawCursors(top) {
    if (mode !== "play" && mode !== "pause") return;
    ui.forEach(function (u, pi) {
      var col = PCOL[pi], x = u.cx + (u.deny > 0 ? Math.sin(u.deny * 40) * 6 * u.deny : 0), y = u.cy;
      var h = CELL / 2 - 2, pulse = 1 + 0.04 * Math.sin(clock * 6 + pi);
      if (!top) {
        ctx.globalAlpha = 0.25; rrect(ctx, x - h, y - h, h * 2, h * 2, 12); ctx.fillStyle = u.deny > 0 ? "#ff7a7a" : col.main; ctx.fill(); ctx.globalAlpha = 1;
        return;
      }
      // coins animés
      ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
      ctx.strokeStyle = u.deny > 0 ? "#e04848" : col.dark; ctx.lineWidth = 5; ctx.lineCap = "round";
      var L = 14;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(d[0] * h, d[1] * (h - L)); ctx.lineTo(d[0] * h, d[1] * h); ctx.lineTo(d[0] * (h - L), d[1] * h); ctx.stroke();
      });
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(d[0] * h, d[1] * (h - L)); ctx.lineTo(d[0] * h, d[1] * h); ctx.lineTo(d[0] * (h - L), d[1] * h); ctx.stroke();
      });
      ctx.restore();
      // étiquette J1 / J2
      var tx = x + (pi === 0 ? -h + 4 : h - 4), ty = y - h - 2;
      ctx.font = "900 12px Nunito, sans-serif"; ctx.textAlign = "center";
      rrect(ctx, tx - 13, ty - 10, 26, 16, 8); ctx.fillStyle = col.dark; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(col.short, tx, ty + 2);
      // aperçu de l'action
      var pc = K.pieceAt(w, u.cur.c, u.cur.r), sp = selPiece(u);
      if (!pc && !sp && mode === "play") {
        var ok = w.players[pi].mana >= CFG.summonCost;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(clock * 4);
        ctx.font = "900 22px Nunito, sans-serif"; ctx.fillStyle = ok ? col.dark : "#9a8aa6"; ctx.fillText("+", x, y + 2);
        ctx.font = "800 11px Nunito, sans-serif"; ctx.fillText(CFG.summonCost + " mana", x, y + 18);
        ctx.globalAlpha = 1;
      }
      if (u.denyT > 0) {
        ctx.globalAlpha = Math.min(1, u.denyT * 3);
        ctx.font = "800 13px Nunito, sans-serif";
        var tw = ctx.measureText(u.denyMsg).width + 16;
        rrect(ctx, x - tw / 2, y - h - 34, tw, 22, 11); ctx.fillStyle = "#e04848"; ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillText(u.denyMsg, x, y - h - 19);
        ctx.globalAlpha = 1;
      }
    });
  }

  function drawCircles() {
    circles.forEach(function (c) {
      var k = c.life / c.max, a = 1 - k;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, 0.4);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(0, 0, 20 + k * 22, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = c.color; ctx.stroke();
      ctx.rotate(clock * 3);
      for (var i = 0; i < 6; i++) { ctx.rotate(TAU / 6); star(ctx, 30 + k * 10, 0, 5, 4, 0.4); ctx.fillStyle = "#fff"; ctx.fill(); }
      var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, hexA(c.light, 0.8 * a)); gr.addColorStop(1, hexA(c.light, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }

  function drawUnits() {
    // ordre de dessin : de haut en bas (ce qui est devant passe devant)
    var list = [];
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var pc = w.grid[c][r]; if (pc) list.push({ y: cellY(r) + CELL * 0.32, pc: pc }); }
    for (var id in evis) list.push({ y: evis[id].y, ev: evis[id] });
    leakers.forEach(function (L) { list.push({ y: 9999, lk: L }); });
    deaths.forEach(function (d) { list.push({ y: d.y, dead: d }); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) {
      if (it.pc) drawBoardPiece(it.pc);
      else if (it.ev) drawBoardEnemy(it.ev);
      else if (it.lk) {
        var L = it.lk, k = clamp(L.t / 0.45, 0, 1), x = lerp(L.x0, KING_X + (L.x0 - KING_X) * 0.3, k), y = lerp(L.y0, KING_Y - 30, easeInOut(k)) - Math.sin(k * Math.PI) * 30;
        drawEnemy(ctx, L.v.type, x, y, CELL, { sx: 1 - k * 0.2, sy: 1 + k * 0.2 });
      } else {
        var d = it.dead, kk = d.t / 0.16;
        drawEnemy(ctx, d.type, d.x, d.y, CELL, { sx: 1 + kk * 0.5, sy: 1 - kk * 0.55, flash: 1, alpha: 1 - kk * 0.6 });
      }
    });
  }
  function drawBoardPiece(pc) {
    var v = pv(pc);
    if (clock < v.hideUntil) return;
    var x = cellX(pc.c), y = cellY(pc.r) + CELL * 0.32;
    var o = { seed: v.seed, blink: v.blink < 0, dir: pc.owner === 0 ? 1 : -1 };
    var sx = 1, sy = 1, oy = 0, ox = 0;
    // apparition : chute + squash & stretch
    var age = clock - v.born;
    if (age < 0) return;
    if (v.fuse && age < 0.55) {
      // la pièce fusionnée émerge du flash avec un gros rebond élastique
      var kf = age / 0.55, sc = easeOut(Math.min(1, kf * 1.6)) + Math.sin(kf * Math.PI * 2.6) * (1 - kf) * 0.32;
      sx = sc * (1 + 0.15 * Math.sin(kf * Math.PI * 3) * (1 - kf)); sy = sc * (1 - 0.12 * Math.sin(kf * Math.PI * 3) * (1 - kf));
      oy = -10 * Math.sin(kf * Math.PI) ;
    } else if (age < 0.5 && !v.fuse) {
      var k = age / 0.5;
      if (k < 0.3) { var kk = k / 0.3; oy = -36 * (1 - kk * kk); sx = 0.6 + kk * 0.3; sy = 1.35 - kk * 0.25; }
      else { var k2 = (k - 0.3) / 0.7, wob = Math.sin(k2 * Math.PI * 3) * (1 - k2); sx = 1 + 0.3 * wob; sy = 1 - 0.3 * wob; }
      if (k >= 0.3 && !v.landedOnce) { v.landedOnce = true; SFX.land(); burst(x, y - 4, 6, { colors: ["#fff", PCOL[pc.owner].light], min: 30, max: 100, life: 0.3, size: 3, g: 100 }); }
    }
    // respiration
    var br = Math.sin(clock * 2.2 + v.seed) * 0.025;
    sx *= 1 - br; sy *= 1 + br;
    if (pc.type === "bishop") oy += Math.sin(clock * 2 + v.seed) * 1.5;
    // ressort (tirs, fusion, amélioration)
    sx *= 1 + v.sq * 0.5; sy *= 1 - v.sq * 0.5;
    if (pc.type === "rook") ox = v.rdir * v.recoil * 6;
    if (pc.type === "knight") { var j = v.jump; if (j > 0) oy -= Math.sin((1 - j) * Math.PI) * 14; }
    // anticipation : la pièce se prépare juste avant de tirer
    if (w.state === "wave" && pc.cd < 0.16 && pc.cd > 0) {
      if (pc.type === "knight") { sx *= 1.08; sy *= 0.9; }
      if (pc.type === "bishop") o.cast = Math.max(o.cast || 0, 0.5 * (1 - pc.cd / 0.16));
    }
    o.cast = Math.max(o.cast || 0, v.cast);
    var u = ui[pc.owner], sel = u.sel && u.sel.id === pc.id;
    var sp = selPiece(u), compat = sp && !sel && K.canFuse(w, pc.owner, sp, pc, w.players[pc.owner].rainbow);
    if (sel) { oy -= 6 + Math.sin(clock * 8) * 2; o.happy = true; }
    if (w.players[pc.owner].rainbow && (!sp || compat || sel) && pc.lvl < CFG.maxLevel) drawRainbowRing(x, y);
    if (sel || compat) {
      ctx.save();
      var pr = 0.6 + 0.4 * Math.sin(clock * 7);
      ctx.translate(x, y - 6); ctx.scale(1, 0.42);
      ctx.beginPath(); ctx.arc(0, 0, CELL * 0.4, 0, TAU);
      ctx.lineWidth = sel ? 7 : 5; ctx.strokeStyle = sel ? "#fff" : hexA("#ffe066", 0.5 + 0.5 * pr); ctx.stroke();
      ctx.restore();
    }
    o.sx = sx; o.sy = sy; o.ox = ox; o.oy = oy;
    drawPiece(ctx, pc.type, pc.owner, pc.lvl, x, y, CELL, o);
    if (compat) {
      // flèche de fusion qui sautille
      var ay = y - CELL * 0.95 + Math.sin(clock * 8) * 3;
      ctx.beginPath(); ctx.moveTo(x, ay - 8); ctx.lineTo(x + 8, ay + 2); ctx.lineTo(x + 3, ay + 2); ctx.lineTo(x + 3, ay + 9); ctx.lineTo(x - 3, ay + 9); ctx.lineTo(x - 3, ay + 2); ctx.lineTo(x - 8, ay + 2); ctx.closePath();
      ctx.fillStyle = "#ffe066"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  function drawRainbowRing(x, y) {
    ctx.save(); ctx.translate(x, y - 6); ctx.scale(1, 0.42);
    var cols = ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"];
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(0, 0, CELL * 0.42, clock * 2 + i * TAU / 6, clock * 2 + (i + 1) * TAU / 6); ctx.lineWidth = 4; ctx.strokeStyle = cols[i]; ctx.stroke(); }
    ctx.restore();
  }
  function drawBoardEnemy(v) {
    var e = null;
    for (var i = 0; i < w.enemies.length; i++) if (w.enemies[i].id === v.id) { e = w.enemies[i]; break; }
    var sx = 1 + v.sq * 0.6, sy = 1 - v.sq * 0.6;
    var hopping = v.hop < 1;
    if (hopping) { var hk = Math.sin(v.hop * Math.PI); sx *= 1 - hk * 0.12; sy *= 1 + hk * 0.15; }
    var alpha = clamp((clock - v.born) / 0.25, 0, 1);
    var bob = Math.sin(clock * 3 + v.seed) * 0.03;
    sx *= 1 + bob; sy *= 1 - bob;
    var frozen = w.freeze > 0;
    drawEnemy(ctx, v.type, v.x, v.y + v.knock, CELL, { sx: sx, sy: sy, flash: v.flash, blink: v.blink < 0, walk: hopping ? v.hop * 2 : 0, alpha: alpha, frozen: frozen });
    // barre de vie
    if (e && v.hpShown < 0.999) {
      var bw = v.type === "boss" ? 70 : 42, bx = v.x - bw / 2, by = v.y + 4;
      rrect(ctx, bx - 2, by - 2, bw + 4, 9, 4.5); ctx.fillStyle = "rgba(40,25,60,.8)"; ctx.fill();
      rrect(ctx, bx, by, Math.max(3, bw * clamp(v.hpShown, 0, 1)), 5, 2.5); ctx.fillStyle = v.hpShown > 0.5 ? "#7be07f" : v.hpShown > 0.25 ? "#ffd257" : "#ff6b6b"; ctx.fill();
    }
    if (e && e.armor && v.type === "armored") { /* l'armure se voit déjà au casque */ }
  }

  function drawShots() {
    vshots.forEach(function (s) {
      var p = shotPos(s), col = PCOL[s.owner], lvl = s.lvl;
      var sz = 1 + (lvl - 1) * 0.18;
      if (s.type === "rook") {
        var dx = s.tx - s.x0, dy = s.ty - s.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        ctx.beginPath(); ctx.moveTo(p.x - ux * 18 * sz, p.y - uy * 18 * sz); ctx.lineTo(p.x, p.y);
        ctx.lineCap = "round"; ctx.lineWidth = 7 * sz; ctx.strokeStyle = hexA(col.main, 0.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 5 * sz, 0, TAU); ctx.fillStyle = lvl >= 4 ? "#ffd257" : "#fff"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col.dark; ctx.stroke();
      } else if (s.type === "bishop") {
        var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14 * sz);
        gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.4, hexA(col.main, 0.8)); gr.addColorStop(1, hexA(col.main, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 14 * sz, 0, TAU); ctx.fill();
        star(ctx, p.x, p.y, 5 * sz, 4, 0.4); ctx.fillStyle = "#fff"; ctx.fill();
      } else {
        // fer à cheval qui tourne en sautant
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.k * TAU * 1.5 * (s.owner ? -1 : 1)); ctx.scale(sz, sz);
        ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI * 0.15, Math.PI * 1.85, false);
        ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = 3.5; ctx.strokeStyle = lvl >= 3 ? "#ffd257" : "#e8eaf2"; ctx.stroke();
        ctx.restore();
      }
    });
  }

  function drawFusions() {
    fusions.forEach(function (f) {
      var t = f.t, p = f.p;
      if (t < 0.34) {
        var shakeA = t < 0.12 ? Math.sin(t * 120) * 2.5 : 0;
        var k = t < 0.12 ? 0 : easeInOut((t - 0.12) / 0.22);
        // pièce d'arrivée : se compresse
        var cs = t < 0.12 ? 1 : 1 - k * 0.35;
        drawPiece(ctx, f.into.type, p, f.into.lvl, f.into.x + shakeA, f.into.y, CELL, { sx: cs * (1 + k * 0.2), sy: cs, noStars: k > 0.5, flash: k * 0.8, noAura: true });
        // pièce qui rejoint : attirée, étirée
        var x = lerp(f.from.x, f.into.x, k) - shakeA, y = lerp(f.from.y, f.into.y, k) - Math.sin(k * Math.PI) * 26;
        drawPiece(ctx, f.from.type, p, f.from.lvl, x, y, CELL, { sx: (1 - k * 0.45) * (1 - k * 0.2), sy: (1 - k * 0.45) * (1 + k * 0.35), alpha: 1 - k * 0.3, noStars: k > 0.3, flash: k, noAura: true });
        if (k > 0 && fxOn() && Math.random() < 0.6) part({ x: x + rnd(-8, 8), y: y - 20 + rnd(-8, 8), vx: 0, vy: -20, life: 0, max: 0.3, size: 3, color: PCOL[p].light, kind: "dot", g: 0, drag: 1, rot: 0, vr: 0 });
      }
      // lueur au moment du flash
      if (t > 0.28 && t < 0.6) {
        var a = 1 - (t - 0.28) / 0.32;
        var gr = ctx.createRadialGradient(f.into.x, f.into.y - 28, 0, f.into.x, f.into.y - 28, 70);
        gr.addColorStop(0, "rgba(255,255,235," + (0.9 * a) + ")"); gr.addColorStop(1, "rgba(255,255,235,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.into.x, f.into.y - 28, 70, 0, TAU); ctx.fill();
      }
    });
  }
  function drawRays() {
    rays.forEach(function (r) {
      var k = r.life / r.max, a = Math.sin(k * Math.PI);
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(clock * 1.5);
      ctx.globalAlpha = a * 0.55;
      for (var i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(120, -10); ctx.lineTo(120, 10); ctx.closePath();
        ctx.fillStyle = r.gold ? "#ffd257" : "#fff6d0"; ctx.fill();
      }
      ctx.restore();
    });
  }
  function drawThrows() {
    throws.forEach(function (t) {
      var k = clamp(t.t / t.dur, 0, 1), x = lerp(t.x0, t.x1, k), y = lerp(t.y0, t.y1, k) - Math.sin(k * Math.PI) * 120;
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * TAU * 1.2); drawPowerIcon(ctx, "grenade", 0, 0, 16); ctx.restore();
      if (fxOn()) part({ x: x, y: y, vx: rnd(-20, 20), vy: rnd(-20, 0), life: 0, max: 0.35, size: 4, color: "#ffd257", kind: "dot", g: -20, drag: 2, rot: 0, vr: 0 });
    });
  }

  function drawKingArea() {
    var hp = w.kingHp, max = CFG.kingHp;
    // cœurs : 5 à gauche, 5 à droite du roi
    for (var i = 0; i < max; i++) {
      var left = i < 5, j = left ? 4 - i : i - 5;
      var x = left ? KING_X - 78 - j * 30 : KING_X + 78 + j * 30, y = KING_Y - 24;
      var full = i < hp;
      var beat = full && hp <= 3 ? 1 + 0.12 * Math.max(0, Math.sin(clock * 8)) : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(beat, beat);
      heart(ctx, 0, 0, 24);
      ctx.fillStyle = full ? "#ff6b81" : "rgba(40,25,60,.5)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      if (full) { ctx.beginPath(); ctx.ellipse(-5, -5, 3.5, 2.2, -0.6, 0, TAU); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill(); }
      ctx.restore();
    }
    // le roi
    var sq = kingFx.sq, br = Math.sin(clock * 1.8) * 0.02;
    var fall = kingFx.fall;
    drawKing(ctx, KING_X, KING_Y + 4, 100, { sx: (1 + sq * 0.4) * (1 - br), sy: (1 - sq * 0.4) * (1 + br), hurt: kingFx.hurt, look: kingFx.look, blink: Math.sin(clock * 0.9) > 0.985, sweat: hp <= 3 && hp > 0, dead: w.state === "over", rot: fall > 0 ? easeOut(fall) * 1.35 : 0 });
    // PV en chiffres, au-dessus des cœurs de gauche
    ctx.font = "900 14px Nunito, sans-serif"; ctx.textAlign = "center";
    var hx = KING_X - 78 - 4 * 30 - 62, hy = KING_Y - 24;
    rrect(ctx, hx - 44, hy - 15, 88, 22, 11); ctx.fillStyle = hp <= 3 ? "#e04860" : "rgba(36,26,58,.85)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText("ROI ♥ " + hp + " / " + max, hx, hy + 1);
  }

  function drawParticles() {
    parts.forEach(function (p) {
      var k = p.life / p.max, a = p.kind === "gem" ? 1 : 1 - k * k;
      ctx.globalAlpha = a;
      var s = p.size * (p.kind === "confetti" || p.kind === "snow" ? 1 : 1 - k * 0.5);
      if (p.kind === "star") { star(ctx, p.x, p.y, s * 1.4, 5, 0.45); ctx.fillStyle = p.color; ctx.fill(); }
      else if (p.kind === "heart") { heart(ctx, p.x, p.y, s * 2.2); ctx.fillStyle = p.color; ctx.fill(); }
      else if (p.kind === "gem") { drawGem(ctx, p.x, p.y, 6, PCOL[p.p], 0); }
      else if (p.kind === "confetti") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9); ctx.restore(); }
      else if (p.kind === "snow") { star(ctx, p.x, p.y, s, 6, 0.35); ctx.fillStyle = "#fff"; ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fillStyle = p.color; ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }
  function drawRings() {
    rings.forEach(function (r) {
      var k = r.life / r.max, e = easeOut(k);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, e), 0, TAU);
      ctx.lineWidth = r.width * (1 - k * 0.7); ctx.strokeStyle = r.color; ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  function drawBeams() {
    beams.forEach(function (b) {
      var k = b.life / b.max, head = easeOut(Math.min(1, k * 2)), tail = easeOut(Math.max(0, k * 2 - 1));
      var x0 = lerp(b.x0, b.x1, tail), y0 = lerp(b.y0, b.y1, tail), x1 = lerp(b.x0, b.x1, head), y1 = lerp(b.y0, b.y1, head);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineCap = "round";
      ctx.lineWidth = 12; ctx.strokeStyle = hexA(b.color, 0.35); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
    });
  }
  function drawTexts() {
    ctx.textAlign = "center";
    texts.forEach(function (t) {
      var k = t.life / t.max, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      var pop = t.pop && k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : k < 0.25 ? 1.15 - (k - 0.15) * 1.5 : 1;
      ctx.save(); ctx.translate(t.x, t.y); ctx.scale(pop, pop);
      ctx.globalAlpha = a;
      ctx.font = "900 " + t.size + "px Nunito, sans-serif";
      ctx.lineJoin = "round"; ctx.lineWidth = Math.max(4, t.size * 0.22); ctx.strokeStyle = t.outline; ctx.strokeText(t.txt, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.txt, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  function drawDrag() {
    ui.forEach(function (u) {
      if (!u.drag || !u.drag.moved) return;
      var pc = selPiece(u); if (!pc) return;
      drawPiece(ctx, pc.type, pc.owner, pc.lvl, mouse.x, mouse.y + 26, CELL, { alpha: 0.75, sx: 1.05, sy: 1.05, noAura: true });
    });
  }

  function panelBox(x, y, ww, hh, fill, r) { rrect(ctx, x, y, ww, hh, r || 14); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(25,15,40,.6)"; ctx.stroke(); }
  function drawTopBar() {
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    // vague
    panelBox(18, 12, 264, 56, "rgba(36,26,58,.82)");
    ctx.fillStyle = "#ffd257"; ctx.font = "900 26px Nunito, sans-serif"; ctx.fillText("Vague " + w.wave, 34, 48);
    ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
    ctx.textAlign = "right";
    ctx.fillText(w.state === "wave" ? "⚔ En cours" : w.state === "over" ? "Terminé" : "☕ Préparation", 266, 46);
    // aperçu de la vague + score
    panelBox(298, 12, 504, 56, "rgba(36,26,58,.82)");
    var def = K.waveDef(w.wave), counts = {};
    def.list.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    ctx.textAlign = "left"; ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
    ctx.fillText(w.state === "wave" ? "Cette vague" : "Prochaine vague", 312, 30);
    var ix = 322;
    ["normal", "fast", "armored", "boss"].forEach(function (t) {
      if (!counts[t]) return;
      drawEnemy(ctx, t, ix, 62, t === "boss" ? 22 : 30, { blink: false });
      ctx.font = "900 15px Nunito, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText("×" + counts[t], ix + 14, 59);
      ix += 62;
    });
    ctx.textAlign = "right"; ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
    ctx.fillText("SCORE D'ÉQUIPE", 788, 30);
    ctx.save(); ctx.translate(788, 58); var sb = 1 + scoreBump * 0.08; ctx.scale(sb, sb);
    ctx.font = "900 26px Nunito, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(fmt(shownScore), 0, 0); ctx.restore();
    // jauge coop
    panelBox(818, 12, 184, 56, "rgba(36,26,58,.82)");
    ctx.textAlign = "left"; ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
    ctx.fillText("Jauge coop → pouvoirs", 832, 30);
    var gk = w.coop / CFG.coopGauge, gx = 832, gw = 156;
    rrect(ctx, gx, 38, gw, 18, 9); ctx.fillStyle = "rgba(15,8,30,.7)"; ctx.fill();
    ctx.save(); rrect(ctx, gx + 2, 40, gw - 4, 14, 7); ctx.clip();
    var gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, PCOL[0].main); gg.addColorStop(1, PCOL[1].main);
    ctx.fillStyle = gg; ctx.fillRect(gx + 2, 40, (gw - 4) * gk, 14);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(gx + 2, 40, (gw - 4) * gk, 4);
    ctx.restore();
    ctx.textAlign = "center"; ctx.font = "900 11px Nunito, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(w.coop + " / " + CFG.coopGauge, gx + gw / 2, 51);
  }

  function drawPanel(pi) {
    var P = PANEL[pi], u = ui[pi], pl = w.players[pi], col = PCOL[pi];
    var x = P.x, y = P.y;
    panelBox(x, y, P.w, P.h, "rgba(36,26,58,.82)", 18);
    // en-tête coloré
    rrect(ctx, x + 6, y + 6, P.w - 12, 40, 12); ctx.fillStyle = col.main; ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.3)"; rrect(ctx, x + 6, y + 6, P.w - 12, 12, 8); ctx.fill();
    ctx.textAlign = "left"; ctx.font = "900 19px Nunito, sans-serif"; ctx.fillStyle = col.deep;
    ctx.fillText(col.name.toUpperCase(), x + 18, y + 33);
    ctx.textAlign = "right"; ctx.font = "800 12px Nunito, sans-serif";
    ctx.fillText(pi === 0 ? "ZQSD · Espace" : "Flèches · Entrée", x + P.w - 16, y + 32);
    // mana
    var mb = 1 + u.manaBump * 0.15;
    ctx.save(); ctx.translate(x + 42, y + 98); ctx.scale(mb, mb); drawGem(ctx, 0, 0, 22, col, 0.6 + 0.4 * Math.sin(clock * 3)); ctx.restore();
    ctx.textAlign = "left"; ctx.fillStyle = "#d9cdf0"; ctx.font = "800 12px Nunito, sans-serif"; ctx.fillText("MANA", x + 74, y + 74);
    ctx.save(); ctx.translate(x + 74, y + 114); ctx.scale(mb, mb);
    ctx.font = "900 38px Nunito, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(String(Math.round(u.mana)), 0, 0); ctx.restore();
    var can = pl.mana >= CFG.summonCost;
    rrect(ctx, x + 158, y + 64, 94, 30, 15); ctx.fillStyle = can ? "#7be07f" : "rgba(255,255,255,.12)"; ctx.fill();
    ctx.textAlign = "center"; ctx.font = "900 13px Nunito, sans-serif"; ctx.fillStyle = can ? "#1f4a22" : "#a99cbc";
    ctx.fillText("Invoquer : " + CFG.summonCost, x + 205, y + 84);
    var n = K.countPieces(w, pi), max = K.zoneSize(pi);
    ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = n >= max ? "#ffd257" : "#d9cdf0";
    ctx.fillText("Pièces " + n + " / " + max, x + 205, y + 116);
    // infos sur la case visée
    var pc = selPiece(u) || K.pieceAt(w, u.cur.c, u.cur.r);
    rrect(ctx, x + 10, y + 138, P.w - 20, 52, 10); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill();
    ctx.textAlign = "left";
    if (pc) {
      drawPiece(ctx, pc.type, pi, pc.lvl, x + 34, y + 186, 40, { noStars: true, noAura: true, dir: pi === 0 ? 1 : -1 });
      ctx.font = "900 15px Nunito, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(TYPE_NAME[pc.type] + " · niveau " + pc.lvl + (pc.lvl >= CFG.maxLevel ? " (max)" : ""), x + 60, y + 160);
      ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
      ctx.fillText(Math.round(K.pieceDmg(w, pc)) + " dégâts · " + (1 / K.pieceCd(pc)).toFixed(1) + " tirs/s", x + 60, y + 178);
    } else if (w.players[pi].rainbow) {
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#ffe066"; ctx.fillText("🌈 Arc-en-ciel : choisis 2 pièces", x + 20, y + 160);
      ctx.fillStyle = "#d9cdf0"; ctx.fillText("de même niveau (tous types)", x + 20, y + 178);
    } else {
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
      ctx.fillText(u.sel ? "Choisis une pièce identique" : "Case vide : invoque une pièce", x + 20, y + 160);
      ctx.font = "700 12px Nunito, sans-serif"; ctx.fillText(u.sel ? "(même type, même niveau)" : "Tour, Fou ou Cavalier au hasard", x + 20, y + 178);
    }
    // améliorations de type
    ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0"; ctx.textAlign = "left";
    ctx.fillText("RENFORCER TOUTES MES…", x + 14, y + 208);
    K.TYPES.forEach(function (t, i) {
      var R = upgRect(pi, i), cost = K.upgradeCost(w, pi, t), ok = pl.mana >= cost && mode === "play", lvl = pl.upg[t];
      var hov = hoverBtn === "upg" + pi + i, fl = u.upgFlash[i];
      ctx.save();
      if (hov && ok) { ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(1.02, 1.02); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2); }
      rrect(ctx, R.x, R.y, R.w, R.h, 12); ctx.fillStyle = fl > 0 ? mix("#4a3a6a", "#ffe066", fl * 0.7) : hov && ok ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)"; ctx.fill();
      drawPiece(ctx, t, pi, 1, R.x + 24, R.y + 40, 38, { noStars: true, noAura: true });
      ctx.textAlign = "left"; ctx.font = "900 14px Nunito, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(TYPE_NAME[t] + "s", R.x + 48, R.y + 20);
      ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = lvl ? "#ffe066" : "#a99cbc";
      ctx.fillText(lvl ? "+" + Math.round(lvl * CFG.upgrade.dmgPerLevel * 100) + " % dégâts" : "+" + Math.round(CFG.upgrade.dmgPerLevel * 100) + " % dégâts", R.x + 48, R.y + 36);
      rrect(ctx, R.x + R.w - 84, R.y + 8, 76, 28, 14); ctx.fillStyle = ok ? (hov ? "#ffe680" : "#ffd257") : "rgba(255,255,255,.1)"; ctx.fill();
      ctx.textAlign = "center"; ctx.font = "900 13px Nunito, sans-serif"; ctx.fillStyle = ok ? "#5a3c00" : "#8f84a3";
      ctx.fillText(cost + " ◆", R.x + R.w - 52, R.y + 27);
      ctx.font = "800 10px Nunito, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillText(pi === 0 ? String(i + 1) : String((i + 8) % 10), R.x + R.w - 14, R.y + 27);
      ctx.restore();
    });
    // pouvoir
    var B = powerBox(pi), pw = pl.power, hovP = hoverBtn === "pow" + pi;
    var bounce = 1 + u.powerPop * 0.2 * Math.sin(u.powerPop * 12);
    rrect(ctx, B.x, B.y, B.w, B.h, 14);
    ctx.fillStyle = pw ? (hovP ? "rgba(255,230,140,.25)" : "rgba(255,230,140,.14)") : "rgba(255,255,255,.05)"; ctx.fill();
    if (pw) { ctx.lineWidth = 2.5; ctx.strokeStyle = hexA("#ffd257", 0.5 + 0.4 * Math.sin(clock * 4)); ctx.stroke(); }
    ctx.textAlign = "left"; ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "#d9cdf0";
    ctx.fillText("POUVOIR", B.x + 12, B.y + 20);
    ctx.textAlign = "right"; ctx.fillText("touche " + (pi === 0 ? "E" : "Maj droite / 0"), B.x + B.w - 12, B.y + 20);
    if (pw) {
      ctx.save(); ctx.translate(B.x + 42, B.y + 68); ctx.scale(bounce, bounce); ctx.rotate(Math.sin(clock * 3) * 0.08); drawPowerIcon(ctx, pw, 0, 0, 24); ctx.restore();
      ctx.textAlign = "left"; ctx.font = "900 16px Nunito, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(POWER_NAME[pw], B.x + 78, B.y + 52);
      wrapText(POWER_DESC[pw], B.x + 78, B.y + 70, B.w - 88, 14, "700 11.5px Nunito, sans-serif", "#d9cdf0");
      if (pw !== "rainbow" && w.state !== "wave") { ctx.font = "800 11px Nunito, sans-serif"; ctx.fillStyle = "#ffb3a6"; ctx.fillText("Utilisable pendant la vague", B.x + 78, B.y + 112); }
      if (u.aimGrenade) { ctx.font = "800 11px Nunito, sans-serif"; ctx.fillStyle = "#ffe066"; ctx.fillText("Clique une ligne du couloir", B.x + 78, B.y + 112); }
    } else if (pl.rainbow) {
      ctx.save(); ctx.translate(B.x + 42, B.y + 68); drawPowerIcon(ctx, "rainbow", 0, 0, 22); ctx.restore();
      ctx.textAlign = "left"; ctx.font = "900 14px Nunito, sans-serif"; ctx.fillStyle = "#ffe066"; ctx.fillText("Arc-en-ciel actif", B.x + 78, B.y + 58);
      wrapText("Fusionne 2 de tes pièces de même niveau.", B.x + 78, B.y + 76, B.w - 88, 14, "700 11.5px Nunito, sans-serif", "#d9cdf0");
    } else {
      ctx.textAlign = "center"; ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = "#a99cbc";
      ctx.fillText("Remplissez la jauge coop", B.x + B.w / 2, B.y + 62);
      ctx.fillText("(combos coop + vagues)", B.x + B.w / 2, B.y + 80);
      ctx.fillText("pour gagner un pouvoir", B.x + B.w / 2, B.y + 98);
    }
  }
  function wrapText(txt, x, y, maxW, lh, font, color) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
    var words = txt.split(" "), line = "", yy = y;
    words.forEach(function (wd) { var t = line ? line + " " + wd : wd; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = wd; yy += lh; } else line = t; });
    if (line) ctx.fillText(line, x, yy);
  }
  function drawBottomHints() {
    ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = "rgba(240,230,255,.7)";
    ctx.textAlign = "left";
    ctx.fillText("Souris : clic = agir · glisser = fusionner", 22, BY + BH + 42);
    ctx.fillText("clic droit = annuler", 22, BY + BH + 60);
    ctx.textAlign = "right";
    ctx.fillText("V : lancer la vague", VW - 22, BY + BH + 42);
    ctx.fillText("Échap : pause", VW - 22, BY + BH + 60);
  }
  function drawBanner() {
    if (!banner) return;
    var t = banner.t, k = t < 0.25 ? easeOut(t / 0.25) : 1, a = t > banner.dur - 0.4 ? (banner.dur - t) / 0.4 : 1;
    var y = BY + BH * 0.3;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(KING_X, y); ctx.scale(0.6 + 0.4 * k + (t < 0.4 ? Math.sin(t / 0.4 * Math.PI) * 0.08 : 0), 0.6 + 0.4 * k);
    var bw = 470, bh = 92;
    rrect(ctx, -bw / 2, -bh / 2, bw, bh, 24); ctx.fillStyle = "rgba(36,26,58,.9)"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#ffd257"; ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "900 34px Nunito, sans-serif"; ctx.fillStyle = "#ffd257"; ctx.fillText(banner.t1, 0, 2);
    ctx.font = "800 15px Nunito, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(banner.t2 || "", 0, 28);
    ctx.restore();
  }

  /* ====================== ACTIONS DES JOUEURS ====================== */
  function deny(p, msg) { var u = ui[p]; u.deny = 1; u.denyMsg = msg; u.denyT = 1.1; SFX.deny(); }
  function moveCursor(p, dc, dr) {
    var u = ui[p], z = CFG.zones[p];
    var c = clamp(u.cur.c + dc, z[0], z[z.length - 1]), r = clamp(u.cur.r + dr, 0, CFG.rows - 1);
    u.lastMove = clock;
    if (c !== u.cur.c || r !== u.cur.r) { u.cur = { c: c, r: r }; SFX.move(); }
  }
  // le bouton d'action : invoquer / sélectionner / fusionner / annuler
  function act(p, c, r) {
    if (mode !== "play" || w.state === "over") return;
    var u = ui[p];
    if (!K.inZone(p, c, r)) return;
    u.cur = { c: c, r: r }; u.lastMove = clock;
    var pc = K.pieceAt(w, c, r), sp = selPiece(u), rb = w.players[p].rainbow;
    if (sp) {
      if (pc === sp) { u.sel = null; SFX.deselect(); return; }
      if (pc && K.canFuse(w, p, sp, pc, rb)) { u.sel = null; K.fuse(w, p, sp, pc, rb); handleEvents(); return; }
      if (pc) {
        u.sel = { c: c, r: r, id: pc.id }; SFX.select(); tutoEvent("select");
        if (pc.lvl === sp.lvl && pc.type !== sp.type && !rb) { u.denyMsg = "Pas le même type"; u.denyT = 0.8; }
        else if (pc.type === sp.type && pc.lvl !== sp.lvl) { u.denyMsg = "Pas le même niveau"; u.denyT = 0.8; }
        return;
      }
      u.sel = null; SFX.deselect(); return;
    }
    if (pc) { u.sel = { c: c, r: r, id: pc.id }; SFX.select(); pv(pc).sq = 0.2; pv(pc).sqv = 0; tutoEvent("select"); return; }
    var res = K.summon(w, p, c, r);
    if (res === "mana") deny(p, "Pas assez de mana");
    else if (res !== "ok") deny(p, "Impossible ici");
    handleEvents();
  }
  function tryUpgrade(p, i) {
    if (mode !== "play") return;
    var res = K.upgrade(w, p, K.TYPES[i]);
    if (res === "mana") deny(p, "Pas assez de mana");
    handleEvents();
  }
  function tryPower(p, row) {
    if (mode !== "play") return;
    var pl = w.players[p], u = ui[p];
    if (!pl.power) { if (pl.rainbow) { pl.rainbow = false; pl.power = "rainbow"; SFX.deselect(); return; } deny(p, "Pas de pouvoir"); return; }
    if (pl.power !== "rainbow" && w.state !== "wave") { deny(p, "Attends la vague"); return; }
    if (pl.power === "grenade") {
      var r = row == null ? u.cur.r : row;
      pl.power = null; u.aimGrenade = false;   // la grenade est en vol : elle ne peut pas partir deux fois
      var mp = manaPos(p);
      throws.push({ kind: "grenade", p: p, r: r, t: 0, dur: 0.45, x0: mp.x + 40, y0: PANEL[p].y + 420, x1: cellX(3), y1: cellY(r) });
      SFX.whoosh();
      return;
    }
    K.usePower(w, p, null);
    handleEvents();
  }
  function launchWave() {
    if (mode !== "play" || !w || w.state !== "prep") return;
    if (K.startWave(w)) { handleEvents(); updateLaunch(); startMusic(); }
  }
  function updateLaunch() {
    if (!launchBtn) return;
    var show = mode === "play" && w && w.state === "prep";
    launchBtn.hidden = !show;
    if (show) {
      launchBtn.style.left = (OX + KING_X * S) + "px";
      launchBtn.style.top = (OY + (BY - 52) * S) + "px";
      var b = launchBtn.querySelector("b"); if (b) b.textContent = String(w.wave);
    }
  }

  /* ====================== COMMANDES : CLAVIER ====================== */
  // codes physiques : ZQSD en AZERTY = WASD en QWERTY, mêmes touches
  var KEYS = {
    KeyW: [0, "up"], KeyS: [0, "down"], KeyA: [0, "left"], KeyD: [0, "right"], Space: [0, "act"], KeyE: [0, "power"],
    Digit1: [0, "u0"], Digit2: [0, "u1"], Digit3: [0, "u2"],
    ArrowUp: [1, "up"], ArrowDown: [1, "down"], ArrowLeft: [1, "left"], ArrowRight: [1, "right"], Enter: [1, "act"], NumpadEnter: [1, "act"],
    ShiftRight: [1, "power"], Numpad0: [1, "power"], Digit8: [1, "u0"], Digit9: [1, "u1"], Digit0: [1, "u2"], Numpad1: [1, "u0"], Numpad2: [1, "u1"], Numpad3: [1, "u2"],
  };
  function visible() { return !stage.hidden; }
  document.addEventListener("keydown", function (e) {
    if (!visible() || (e.target && /input|textarea|select/i.test(e.target.tagName))) return;
    audio();
    if (mode === "menu" || mode === "over") {
      if (e.target && e.target.closest && e.target.closest("button, summary, a")) return;
      if ((e.code === "Enter" || e.code === "Space") && mode === "over" && overlay.hidden === false) { e.preventDefault(); start(); }
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); if (mode === "pause") resume(); else pause(); return; }
    if (mode !== "play") return;
    if (e.code === "KeyV") { e.preventDefault(); if (!e.repeat) launchWave(); return; }
    var m = KEYS[e.code]; if (!m) return;
    e.preventDefault();
    var p = m[0], a = m[1];
    if (a === "up") moveCursor(p, 0, -1);
    else if (a === "down") moveCursor(p, 0, 1);
    else if (a === "left") moveCursor(p, -1, 0);
    else if (a === "right") moveCursor(p, 1, 0);
    else if (e.repeat) return;
    else if (a === "act") act(p, ui[p].cur.c, ui[p].cur.r);
    else if (a === "power") tryPower(p, null);
    else if (a[0] === "u") tryUpgrade(p, Number(a[1]));
  });

  /* ====================== COMMANDES : SOURIS / DOIGT ====================== */
  function toWorld(e) { var rc = canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left - OX) / S, y: (e.clientY - rc.top - OY) / S }; }
  function cellAt(x, y) { var c = Math.floor((x - BX) / CELL), r = Math.floor((y - BY) / CELL); return c >= 0 && c < 7 && r >= 0 && r < 7 ? { c: c, r: r } : null; }
  function inRect(x, y, R) { return x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h; }
  function buttonAt(x, y) {
    for (var p = 0; p < 2; p++) {
      for (var i = 0; i < 3; i++) { var R = upgRect(p, i); if (inRect(x, y, { x: R.x + R.w - 90, y: R.y, w: 90, h: R.h }) || inRect(x, y, R)) return "upg" + p + i; }
      if (inRect(x, y, powerBox(p))) return "pow" + p;
    }
    return null;
  }
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointermove", function (e) {
    var f = toWorld(e); mouse.x = f.x; mouse.y = f.y; mouse.in = true;
    if (mode !== "play" || !ui) return;
    var b = buttonAt(f.x, f.y);
    if (b !== hoverBtn) { hoverBtn = b; if (b) SFX.hover(); }
    var cl = cellAt(f.x, f.y);
    canvas.style.cursor = b ? "pointer" : cl ? (K.ownerOfCol(cl.c) >= 0 || ui.some(function (u) { return u.aimGrenade; }) ? "pointer" : "default") : "default";
    if (cl) { var p = K.ownerOfCol(cl.c); if (p >= 0) { if (ui[p].cur.c !== cl.c || ui[p].cur.r !== cl.r) ui[p].cur = cl; ui[p].lastMove = clock; } }
    ui.forEach(function (u) { if (u.drag && Math.hypot(f.x - u.drag.x, f.y - u.drag.y) > 10) u.drag.moved = true; });
  });
  canvas.addEventListener("pointerleave", function () { mouse.in = false; hoverBtn = null; });
  canvas.addEventListener("pointerdown", function (e) {
    audio();
    if (mode !== "play" || !ui) return;
    var f = toWorld(e);
    if (e.button === 2) { ui.forEach(function (u) { if (u.sel || u.aimGrenade) SFX.deselect(); u.sel = null; u.aimGrenade = false; }); return; }
    var b = buttonAt(f.x, f.y);
    if (b) {
      var p = Number(b[3]);
      if (b.indexOf("upg") === 0) tryUpgrade(p, Number(b[4]));
      else {
        var pw = w.players[p].power;
        if (pw === "grenade") { if (w.state !== "wave") deny(p, "Attends la vague"); else { ui[p].aimGrenade = !ui[p].aimGrenade; SFX.select(); } }
        else tryPower(p, null);
      }
      return;
    }
    var cl = cellAt(f.x, f.y);
    if (!cl) return;
    // une grenade en attente de cible
    for (var q = 0; q < 2; q++) if (ui[q].aimGrenade) { if (K.isLane(cl.c) || K.ownerOfCol(cl.c) === q) { tryPower(q, cl.r); return; } }
    var owner = K.ownerOfCol(cl.c);
    if (owner < 0) return;
    var before = ui[owner].sel;
    act(owner, cl.c, cl.r);
    var u = ui[owner];
    if (u.sel && (!before || before.id !== u.sel.id)) { u.drag = { x: f.x, y: f.y, moved: false, id: u.sel.id, from: cl }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} }
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!ui) return;
    var f = toWorld(e);
    ui.forEach(function (u, p) {
      if (!u.drag) return;
      var d = u.drag; u.drag = null;
      if (!d.moved || mode !== "play") return;
      var cl = cellAt(f.x, f.y);
      if (!cl || (cl.c === d.from.c && cl.r === d.from.r)) return;
      var sp = selPiece(u), pc = K.pieceAt(w, cl.c, cl.r);
      if (sp && pc && K.canFuse(w, p, sp, pc, w.players[p].rainbow)) act(p, cl.c, cl.r);
    });
  });
  canvas.addEventListener("pointercancel", function () { if (ui) ui.forEach(function (u) { u.drag = null; }); });
  if (launchBtn) launchBtn.addEventListener("click", function () { audio(); SFX.ui(); launchWave(); canvas.focus({ preventScroll: true }); });

  /* ====================== TUTORIEL ====================== */
  var TUTO = [
    { t: "Invoque une pièce sur une case vide.", d: "Place ton curseur sur une case vide de ton côté et appuie sur ton bouton d'action (J1 : Espace · J2 : Entrée · ou clic). Ça coûte 3 mana.", until: "summon" },
    { t: "Chaque pièce attaque selon sa forme aux échecs.", d: "Sélectionne une pièce pour voir sa zone : la Tour tire sur sa ligne, le Fou en diagonale, le Cavalier en L.", until: "select" },
    { t: "Fusionne deux pièces identiques pour les améliorer.", d: "Même type + même niveau : sélectionne l'une puis l'autre (ou glisse-la dessus). Tu obtiens une pièce au hasard, un niveau au-dessus.", until: "fuse" },
    { t: "Défendez votre roi ensemble !", d: "Quand vous êtes prêts, lancez la vague. Un ennemi touché par vos deux camps puis éliminé = COMBO COOP !", until: "wave" },
  ];
  function tutoShow() {
    if (!tipEl) return;
    if (!tuto.on || mode !== "play") { tipEl.hidden = true; return; }
    var s = TUTO[tuto.step];
    tipEl.innerHTML = '<span class="kd-tip-n">' + (tuto.step + 1) + " / " + TUTO.length + '</span><strong>' + s.t + "</strong><p>" + s.d + "</p>" +
      '<div class="kd-tip-btns"><button type="button" class="btn btn-small" data-tip="next">' + (tuto.step < TUTO.length - 1 ? "Suivant ›" : "C'est parti !") + '</button> <button type="button" class="btn btn-ghost btn-small" data-tip="skip">Passer le tutoriel</button></div>';
    tipEl.hidden = false;
    tipEl.classList.remove("kd-in"); void tipEl.offsetWidth; tipEl.classList.add("kd-in");
  }
  function tutoNext() { tuto.step++; if (tuto.step >= TUTO.length) tutoEnd(); else { tutoShow(); SFX.ui(); } }
  function tutoEnd() { tuto.on = false; store("kd-tuto", "1"); tutoShow(); }
  function tutoEvent(k) { if (tuto.on && TUTO[tuto.step].until === k) tutoNext(); }
  if (tipEl) tipEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tip]"); if (!b) return;
    audio(); SFX.ui();
    if (b.getAttribute("data-tip") === "skip") tutoEnd(); else tutoNext();
    canvas.focus({ preventScroll: true });
  });

  /* ====================== ÉCRANS ====================== */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function show(html, cls) { card.className = "panel game-card kd-card " + (cls || ""); card.innerHTML = html; overlay.hidden = false; card.classList.remove("kd-in"); void card.offsetWidth; card.classList.add("kd-in"); }
  function hide() { overlay.hidden = true; }
  function kbd(t) { return "<kbd>" + t + "</kbd>"; }
  var iconCache = {};
  function pieceImg(type, owner, lvl, size) {
    var key = type + owner + lvl + size;
    if (iconCache[key]) return iconCache[key];
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawPiece(g, type, owner, lvl, size / 2, size * 0.95, size * 0.95, { noAura: lvl < 3, noStars: lvl === 1 });
    return (iconCache[key] = '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">');
  }
  function enemyImg(type, size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawEnemy(g, type, size / 2, size * 0.92, size * (type === "boss" ? 0.6 : 0.85), {});
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function kingImg(size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    drawKing(g, size / 2, size * 0.98, size * 0.72, {});
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function patternImg(type, size) {
    // mini plateau 5 × 5 qui montre la zone d'attaque
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    var n = 5, cs = size / n, mid = 2, cells = {};
    if (type === "rook") for (var i = 0; i < n; i++) { cells[i + "," + mid] = 1; cells[mid + "," + i] = 1; }
    else if (type === "bishop") for (i = -2; i <= 2; i++) { cells[(mid + i) + "," + (mid + i)] = 1; cells[(mid + i) + "," + (mid - i)] = 1; }
    else [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(function (d) { cells[(mid + d[0]) + "," + (mid + d[1])] = 1; });
    for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) {
      g.fillStyle = (x + y) % 2 ? "#eadfcb" : "#f5ecdc"; g.fillRect(x * cs, y * cs, cs, cs);
      if (cells[x + "," + y] && !(x === mid && y === mid)) { g.fillStyle = "rgba(120,174,247,.75)"; g.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4); }
    }
    g.fillStyle = "#2f5ea8"; g.beginPath(); g.arc(mid * cs + cs / 2, mid * cs + cs / 2, cs * 0.3, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
    return '<img class="kd-pat" src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function settingsHtml() {
    return '<div class="kd-settings">' +
      '<label>🔔 Sons <input type="range" min="0" max="1" step="0.05" value="' + SET.sfx + '" data-set="sfx"></label>' +
      '<label>🎵 Musique <input type="range" min="0" max="1" step="0.05" value="' + SET.music + '" data-set="music"></label>' +
      '<label class="kd-check"><input type="checkbox" data-set="mute"' + (SET.mute ? " checked" : "") + "> 🔇 Couper tout le son</label>" +
      '<label class="kd-check"><input type="checkbox" data-set="fx"' + (SET.fx !== "full" ? " checked" : "") + "> 🧘 Réduire les mouvements et effets (pas de secousses, de flash ni de ralenti)</label>" +
      '<label class="kd-check"><input type="checkbox" data-set="ranges"' + (SET.ranges ? " checked" : "") + "> 🎯 Montrer la zone de la pièce sous le curseur</label>" +
      '<p class="kd-set-row"><button type="button" class="btn btn-ghost btn-small" data-act="retuto">Revoir le tutoriel à la prochaine partie</button></p>' +
      "</div>";
  }
  function bestLine() { return BEST.wave ? 'Record d\'équipe : <strong>vague ' + BEST.wave + "</strong> · <strong>" + fmt(BEST.score) + "</strong> points" : "Pas encore de record : à vous de jouer !"; }

  function menu() {
    mode = "menu"; hud.hidden = true; tutoShow(); updateLaunch(); stopMusic();
    if (!w) newGame();
    var cast = [["rook", 0, 1], ["bishop", 0, 2], ["knight", 0, 3], ["knight", 1, 3], ["bishop", 1, 2], ["rook", 1, 4]].map(function (a) { return '<span class="kd-who">' + pieceImg(a[0], a[1], a[2], 60) + "</span>"; }).join("");
    show('<div class="kd-logo">' + kingImg(92) + '<h2 class="kd-title"><span class="kd-k">KING</span> <span class="kd-d">DICE</span></h2></div>' +
      '<p class="kd-sub">Invoquez des pièces d\'échecs au hasard, fusionnez-les et protégez <strong>ensemble</strong> votre roi contre les vagues de Pionnets.</p>' +
      '<div class="kd-cast">' + cast + "</div>" +
      '<p class="kd-actions kd-col"><button class="btn kd-go" type="button" data-act="start">▶ Jouer en coop</button>' +
      '<span class="kd-row"><button class="btn btn-ghost" type="button" data-act="help">❓ Comment jouer</button> <button class="btn btn-ghost" type="button" data-act="settings">⚙ Paramètres</button></span></p>' +
      '<p class="game-small">' + bestLine() + ' · <span class="game-version">v' + VERSION + "</span></p>", "kd-menu");
  }
  function helpCard(back) {
    show('<h2 class="kd-h">Comment jouer</h2>' +
      '<ol class="kd-steps"><li><b>Invoquer</b> : case vide de ton côté + action → une pièce au hasard (3 mana).</li>' +
      "<li><b>Défendre</b> : les pièces tirent toutes seules sur les ennemis dans leur zone.</li>" +
      "<li><b>Fusionner</b> : deux pièces <em>du même type et du même niveau</em> → une pièce au hasard, un niveau au-dessus (gratuit, jusqu'au niveau 4).</li>" +
      "<li><b>Coopérer</b> : un ennemi touché par vos deux camps en moins de 2 s puis éliminé = <b>COMBO COOP</b> (+1 mana chacun, remplit la jauge des pouvoirs).</li></ol>" +
      '<div class="kd-pieces">' +
      '<div>' + pieceImg("rook", 0, 1, 54) + patternImg("rook", 60) + "<b>Tour</b><span>Toute sa ligne. Tirs rapides : la plus régulière.</span></div>" +
      '<div>' + pieceImg("bishop", 0, 1, 54) + patternImg("bishop", 60) + "<b>Fou</b><span>Ses diagonales : couvre plusieurs lignes du couloir.</span></div>" +
      '<div>' + pieceImg("knight", 0, 1, 54) + patternImg("knight", 60) + "<b>Cavalier</b><span>Les cases en L : courte portée, gros coups qui freinent l'ennemi. Mieux près du couloir !</span></div></div>" +
      '<div class="kd-enemies"><span>' + enemyImg("normal", 40) + "Pionnet</span><span>" + enemyImg("fast", 40) + "Filou (rapide)</span><span>" + enemyImg("armored", 40) + "Cabosse (blindé : les petits coups glissent)</span><span>" + enemyImg("boss", 40) + "Gros Pionnet (toutes les 10 vagues, 3 ♥)</span></div>" +
      '<div class="kd-players">' +
      '<div class="kd-p kd-p1"><span><strong>Joueur 1</strong> · à gauche</span><span>' + kbd("Z") + kbd("Q") + kbd("S") + kbd("D") + " curseur · " + kbd("Espace") + " action</span><span>" + kbd("E") + " pouvoir · " + kbd("1") + kbd("2") + kbd("3") + " renforcer</span><small>(QWERTY : W A S D)</small></div>" +
      '<div class="kd-p kd-p2"><span><strong>Joueur 2</strong> · à droite</span><span>' + kbd("↑") + kbd("←") + kbd("↓") + kbd("→") + " curseur · " + kbd("Entrée") + " action</span><span>" + kbd("Maj droite") + " pouvoir · " + kbd("8") + kbd("9") + kbd("0") + " renforcer</span><small>(ou pavé num. 0 et 1 2 3)</small></div></div>" +
      '<p class="game-small">Souris : clic pour agir sur n\'importe quel côté, glisser une pièce sur une autre pour fusionner, clic droit pour annuler. ' + kbd("V") + " lance la vague, " + kbd("Échap") + " met en pause. Entre deux vagues, prenez tout votre temps.</p>" +
      '<p class="kd-actions"><button class="btn" type="button" data-act="' + (back || "menu") + '">‹ Retour</button></p>', "kd-help");
  }
  function settingsCard(back) {
    show('<h2 class="kd-h">Paramètres</h2>' + settingsHtml() + '<p class="kd-actions"><button class="btn" type="button" data-act="' + (back || "menu") + '">‹ Retour</button></p>', "kd-set");
  }
  function start() {
    newGame();
    mode = "play"; hide(); hud.hidden = false;
    audio(); applyVolumes(); startMusic();
    tuto.on = load("kd-tuto", "") !== "1"; tuto.step = 0; tutoShow();
    updateLaunch();
    showBanner("PRÉPARATION", "Invoquez, fusionnez… puis lancez la vague !");
    canvas.focus({ preventScroll: true });
  }
  function pause() {
    if (mode !== "play" || party) return;
    mode = "pause"; SFX.pause(); updateLaunch(); if (tipEl) tipEl.hidden = true;
    ui.forEach(function (u) { u.drag = null; });
    pauseCard();
  }
  function pauseCard() {
    show('<h2 class="kd-h">Pause</h2><p>Vague <strong>' + w.wave + "</strong> · Score d'équipe <strong>" + fmt(w.score) + "</strong> · Roi ♥ <strong>" + w.kingHp + "</strong></p>" + settingsHtml() +
      '<p class="kd-actions"><button class="btn kd-go" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="helpP">❓ Comment jouer</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>', "kd-pause");
  }
  function resume() { if (mode !== "pause") return; mode = "play"; hide(); updateLaunch(); tutoShow(); canvas.focus({ preventScroll: true }); }
  function recordBest() {
    var rec = false;
    if (w.wave > BEST.wave || (w.wave === BEST.wave && w.score > BEST.score)) rec = true;
    if (w.score > BEST.score) BEST.score = w.score;
    if (w.wave > BEST.wave) BEST.wave = w.wave;
    store("kd-best", JSON.stringify(BEST));
    w.isRecord = rec;
  }
  function gameOverCard() {
    var st = w.stats;
    show('<h2 class="kd-h">' + (w.isRecord ? "Nouveau record d'équipe !" : "Le roi est tombé…") + "</h2>" +
      '<p class="kd-big">Vague <b>' + w.wave + "</b></p>" +
      '<p class="kd-score">' + fmt(w.score) + " <small>points</small></p>" +
      '<ul class="kd-stats">' +
      "<li><b>" + st.kills + "</b><span>ennemis éliminés</span></li>" +
      "<li><b>" + st.fusions + "</b><span>fusions</span></li>" +
      "<li><b>" + st.coop + "</b><span>combos coop</span></li>" +
      "<li><b>" + st.bestLevel + "</b><span>meilleur niveau</span></li></ul>" +
      '<p class="kd-split"><span class="kd-tag kd-t1">J1 : ' + w.players[0].kills + " éliminations</span> <span class=\"kd-tag kd-t2\">J2 : " + w.players[1].kills + " éliminations</span></p>" +
      '<p class="kd-actions"><button class="btn kd-go" type="button" data-act="start">↻ Rejouer <small>(Entrée)</small></button> ' +
      '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>' +
      '<p class="game-small">' + bestLine() + "</p>", "kd-over");
    var go = card.querySelector(".kd-go"); if (go) go.focus({ preventScroll: true });
  }

  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    audio(); SFX.ui();
    var a = b.getAttribute("data-act");
    if (a === "start") start();
    else if (a === "resume") resume();
    else if (a === "menu") { if (mode === "pause" || mode === "over") { overToken++; w = null; newGame(); } menu(); }
    else if (a === "help") helpCard("menu");
    else if (a === "helpP") helpCard("pauseBack");
    else if (a === "pauseBack") pauseCard();
    else if (a === "settings") settingsCard("menu");
    else if (a === "retuto") { store("kd-tuto", ""); b.textContent = "✓ Le tutoriel reviendra"; }
  });
  card.addEventListener("input", function (e) {
    var t = e.target, k = t.getAttribute("data-set");
    if (!k) return;
    if (k === "fx") SET.fx = t.checked ? "reduced" : "full";
    else if (k === "mute" || k === "ranges") SET[k] = t.checked;
    else SET[k] = Number(t.value);
    audio(); applyVolumes(); saveSet(); muteLabel();
    if (k === "music") { if (SET.music > 0 && mode !== "menu") startMusic(); else if (SET.music <= 0) stopMusic(); }
    if (k === "sfx") SFX.select();
  });
  function hudBtn(sel, fn) { var el = stage.querySelector(sel); if (el) el.addEventListener("click", function () { audio(); SFX.ui(); fn(el); }); }
  hudBtn("[data-kd-pause]", function () { if (mode === "pause") resume(); else pause(); });
  hudBtn("[data-kd-mute]", function () { SET.mute = !SET.mute; saveSet(); applyVolumes(); muteLabel(); });
  function muteLabel() { var el = stage.querySelector("[data-kd-mute]"); if (el) { el.textContent = SET.mute ? "🔇" : "🔊"; el.setAttribute("aria-label", SET.mute ? "Activer le son" : "Couper le son"); } }
  muteLabel();
  document.addEventListener("visibilitychange", function () { if (document.hidden) { if (mode === "play") pause(); stopMusic(); } });
  window.addEventListener("blur", function () { if (ui) ui.forEach(function (u) { u.drag = null; }); });

  /* ====================== PLEIN ÉCRAN ====================== */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { stage.classList.toggle("is-full", isFull()); setTimeout(resize, 50); }
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () {
    if (isFull()) { stage.classList.remove("is-max"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); syncFull(); return; }
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (er) { fallback(); } } else fallback();
  });
  document.addEventListener("fullscreenchange", syncFull);
  var fsExit = stage.querySelector("[data-fs-exit]");
  if (fsExit) fsExit.addEventListener("click", function () { stage.classList.remove("is-max"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); syncFull(); });
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
  else window.addEventListener("resize", resize);

  /* ====================== BOUCLE ====================== */
  var last = performance.now();
  function loop(now) {
    var rdt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (w) {
      if (mode === "play" || mode === "over") update(rdt);
      else if (mode === "menu") { clock += rdt; updateVis(rdt, rdt); updateFx(rdt); }
      render();
    }
    requestAnimationFrame(loop);
  }

  // outils de test dans la console : KD_DEBUG.state(), .mana(99), .wave(10), .give(0, "grenade")
  window.KD_DEBUG = {
    version: VERSION,
    world: function () { return w; },
    state: function () { return { mode: mode, wave: w.wave, state: w.state, king: w.kingHp, score: w.score, mana: w.players.map(function (p) { return p.mana; }), enemies: w.enemies.length, shots: w.shots.length, vshots: vshots.length, parts: parts.length, pieces: [K.countPieces(w, 0), K.countPieces(w, 1)], sel: ui.map(function (u) { return u.sel; }), cur: ui.map(function (u) { return u.cur; }) }; },
    mana: function (n) { w.players.forEach(function (p) { p.mana = n; }); },
    wave: function (n) { w.wave = n; },
    give: function (p, kind) { w.players[p].power = kind; },
    king: function (n) { w.kingHp = n; },
    act: function (p, c, r) { act(p, c, r); },
    launch: launchWave, start: start, pause: pause, resume: resume,
    grid: function () { var o = []; for (var r = 0; r < 7; r++) { var row = []; for (var c = 0; c < 7; c++) { var pc = w.grid[c][r]; row.push(pc ? pc.type[0].toUpperCase() + pc.lvl + (pc.owner ? "b" : "a") : ".."); } o.push(row.join(" ")); } return o.join("\n"); },
  };

  /* ====================== PARTY (versus multi-jeux, js/party.js) ======================
     Chacun protège son roi seul à la souris ; les vagues partent toutes seules
     après opts.autoWave secondes de préparation ; score = score d'équipe. */
  var party = null;
  var PT = window.Party && window.Party.pending && window.Party.pending();
  if (PT && PT.mode.game !== "kingdice") PT = null;
  if (PT) {
    window.Party.register("kingdice", {
      start: function (ctx) {
        party = { ctx: ctx, ended: false, prep: 0 };
        store("kd-tuto", "1");
        start();
        tuto.on = false; tutoShow();
      },
      stop: function () {
        if (party && !party.ended && w) {
          party.ended = true;
          if (mode === "play" || mode === "pause") {
            w.state = "over"; mode = "over"; hud.hidden = true; updateLaunch(); stopMusic(); recordBest();
            show('<h2 class="kd-h">Temps écoulé !</h2><p>Vague <strong>' + w.wave + "</strong> · Score <strong>" + fmt(w.score) + "</strong></p>", "kd-over");
          }
        }
        return { score: w ? w.score : 0 };
      },
    });
    setInterval(function () {
      if (!party || party.ended || !w || mode !== "play") return;
      window.Party.score(w.score);
      if (w.state === "prep") { party.prep += 0.25; if (party.prep >= (party.ctx.opts.autoWave || 6)) { party.prep = 0; launchWave(); } }
      else party.prep = 0;
    }, 250);
  }

  newGame();
  resize();
  if (PT) show('<h2 class="kd-h">Manche de party</h2><p>' + PT.mode.name + " : la partie démarre toute seule dans un instant.</p>", "kd-help");
  else menu();
  requestAnimationFrame(loop);
})();
