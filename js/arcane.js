/* =========================================================================
   Arcane Tactics — rendu isométrique, commandes, interface, son, en ligne
   (les règles sont dans js/arcane-core.js, le dessin dans js/arcane-art.js)

   Sections : réglages · sauvegarde · état · son · caméra · effets ·
   événements du moteur → effets · rendu · interface (HUD) · panneaux ·
   commandes · en ligne · écrans · boucle.
   ========================================================================= */
(function () {
  "use strict";

  var A = window.AT_CORE, ART = window.AT_ART;
  var stage = document.querySelector("[data-arcane]");
  if (!A || !ART || !stage) return;

  var VERSION = "1.0.0";
  var TW = 96, TH = 48, HW = TW / 2, HH = TH / 2;
  var TAU = Math.PI * 2;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");

  function $(sel, el) { return (el || stage).querySelector(sel); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function iso(x, y) { return { x: (x - y) * HW, y: (x + y) * HH }; }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }

  /* ====================== RÉGLAGES ====================== */
  var SET = { sfx: 0.7, music: 0.3, mute: false, fx: "full", grid: true };
  try { var s0 = JSON.parse(load("at-settings", "{}")); for (var k0 in s0) if (k0 in SET) SET[k0] = s0[k0]; } catch (e) {}
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches && load("at-settings", null) == null) SET.fx = "reduced";
  function saveSet() { store("at-settings", JSON.stringify(SET)); }
  function fxOn() { return SET.fx === "full"; }

  /* ====================== SAUVEGARDE ====================== */
  // un profil par héros : chaque classe a sa propre progression
  var SAVE = { profiles: {}, name: "", last: "bastion", last2: "prisme" };
  try { var sv = JSON.parse(load("at-save-v1", "{}")); if (sv && sv.profiles) SAVE = Object.assign(SAVE, sv); } catch (e) {}
  A.CLASS_IDS.forEach(function (c) { SAVE.profiles[c] = A.fixProfile(SAVE.profiles[c]) || A.newProfile(c); });
  function persist() { store("at-save-v1", JSON.stringify(SAVE)); }
  function profileFor(cls) { return JSON.parse(JSON.stringify(SAVE.profiles[cls])); }
  var savedRev = {};
  function saveLocalProfiles() {
    if (!w) return;
    var dirty = false;
    w.players.forEach(function (pl, i) {
      if (!pl || locals.indexOf(i) < 0) return;
      var key = i + pl.profile.cls;
      if (savedRev[key] === pl.profile.rev) return;
      savedRev[key] = pl.profile.rev;
      SAVE.profiles[pl.profile.cls] = JSON.parse(JSON.stringify(pl.profile));
      dirty = true;
    });
    if (dirty) persist();
  }

  /* ====================== ÉTAT ====================== */
  var screen = "menu";          // menu | game
  var w = null;                 // monde (hôte / local) ou copie reçue (invité)
  var locals = [0];             // joueurs pilotés sur cet ordinateur
  var duo = false;              // deux joueurs sur le même écran
  var focusPi = 0;              // héros piloté (duo : Tab)
  var sel = null;               // sort choisi { sid, tg: [] }
  var hover = null;             // case survolée { x, y }
  var hoverObj = null;          // unité / groupe / PNJ survolé
  var panel = null;             // inv | quests | shop | help | pause | loot
  var panelPi = 0, invSel = null, shopReveal = null;
  var pendingNpc = null;
  var lastRev = -1, hudDirty = true;
  var clock = 0;
  var vis = {};
  var parts = [], texts = [], rings = [], beams = [], slashes = [], later = [], booms = [];
  var shakeT = 0, hitstop = 0, flash = 0, flashCol = "#fff";
  var objBorn = {};
  var lootSeen = null;
  var menuSel = SAVE.last || "bastion", menuSel2 = SAVE.last2 || "prisme", menuStep = "main";
  var mouse = { x: 0, y: 0, in: false, down: null };
  var cam = { x: 0, y: 0, z: 1, zu: 1, free: false, fit: 1 };

  /* ====================== SON (WebAudio, généré) ====================== */
  var AC = null, master = null, musicGain = null, musicOn = false;
  function audio() {
    if (AC) return AC;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.connect(master);
      applyVolume();
    } catch (e) { AC = null; }
    return AC;
  }
  function applyVolume() { if (!master) return; master.gain.value = SET.mute ? 0 : 1; musicGain.gain.value = SET.music * 0.5; }
  function tone(f, d, type, vol, slide, delay) {
    if (!AC || SET.mute) return;
    var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((vol || 0.2) * SET.sfx, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol, f, delay) {
    if (!AC || SET.mute) return;
    var t = AC.currentTime + (delay || 0), n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), da = b.getChannelData(0);
    for (var i = 0; i < n; i++) da[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter();
    fl.type = "lowpass"; fl.frequency.value = f || 1800;
    s.buffer = b; g.gain.value = (vol || 0.2) * SET.sfx;
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
  }
  var SFX = {
    click: function () { tone(660, 0.06, "triangle", 0.12); },
    step: function () { tone(180 + Math.random() * 40, 0.04, "sine", 0.05); },
    hit: function (big) { noise(0.12, big ? 0.35 : 0.22, big ? 900 : 1600); tone(big ? 120 : 200, 0.12, "square", 0.08, 0.5); },
    cast: function () { tone(520, 0.18, "sine", 0.12, 1.8); tone(780, 0.14, "triangle", 0.06, 1.5, 0.04); },
    heal: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.22, "sine", 0.09, 1, i * 0.06); }); },
    shield: function () { tone(330, 0.25, "triangle", 0.12, 1.4); tone(495, 0.2, "sine", 0.08, 1.2, 0.05); },
    jump: function () { tone(300, 0.16, "triangle", 0.12, 2.4); },
    tp: function () { tone(900, 0.25, "sine", 0.1, 0.4); tone(1400, 0.18, "sine", 0.06, 0.5, 0.06); },
    wall: function () { noise(0.25, 0.25, 500); tone(90, 0.3, "square", 0.08, 0.7); },
    die: function () { tone(400, 0.35, "sawtooth", 0.08, 0.25); noise(0.2, 0.15, 1200, 0.05); },
    turn: function () { tone(587, 0.1, "triangle", 0.14); tone(880, 0.16, "triangle", 0.12, 1, 0.09); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.13, 1, i * 0.11); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.4, "triangle", 0.12, 0.9, i * 0.16); }); },
    loot: function (r) { var base = 600 + r * 140; tone(base, 0.2, "sine", 0.1 + r * 0.02, 1.5); if (r >= 3) [1, 1.25, 1.5, 2].forEach(function (m, i) { tone(base * m, 0.3, "triangle", 0.08, 1, 0.08 * i); }); },
    level: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.25, "square", 0.06, 1, i * 0.07); }); },
    coin: function () { tone(1320, 0.07, "square", 0.06); tone(1760, 0.1, "square", 0.05, 1, 0.06); },
    boom: function () { noise(0.45, 0.4, 600); tone(70, 0.4, "sine", 0.2, 0.5); },
    warn: function () { tone(220, 0.2, "square", 0.07); tone(220, 0.2, "square", 0.07, 1, 0.25); },
    error: function () { tone(160, 0.12, "square", 0.08); },
  };
  // petite musique d'ambiance en boucle (arpèges doux)
  var musicT = 0, musicStep = 0;
  var SCALES = { calm: [0, 3, 7, 10, 12, 15, 19, 22], fight: [0, 2, 3, 7, 8, 12, 14, 15] };
  function musicTick(dt) {
    if (!AC || SET.mute || SET.music <= 0 || screen !== "game") return;
    musicT -= dt;
    if (musicT > 0) return;
    var fight = w && w.mode === "combat";
    musicT = fight ? 0.22 : 0.34;
    var sc = SCALES[fight ? "fight" : "calm"], root = fight ? 196 : 220;
    var chord = [0, 5, 3, 4][Math.floor(musicStep / 8) % 4];
    var n = sc[(musicStep * 3 + chord) % sc.length];
    var f = root * Math.pow(2, n / 12), t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.55);
    if (musicStep % 8 === 0) { var b = AC.createOscillator(), bg = AC.createGain(); b.type = "sine"; b.frequency.value = root / 2 * Math.pow(2, sc[chord] / 12); bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.06, t + 0.05); bg.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); b.connect(bg); bg.connect(musicGain); b.start(t); b.stop(t + 2.5); }
    musicStep++;
  }

  /* ====================== HUD (DOM) ====================== */
  var hud = document.createElement("div");
  hud.className = "at-hud"; hud.hidden = true;
  hud.innerHTML =
    '<div class="at-party" data-party></div>' +
    '<div class="at-top" data-top></div>' +
    '<div class="at-side" data-side></div>' +
    '<div class="at-btns">' +
    '<button class="at-hbtn" type="button" data-act="inv" title="Sac (I)">🎒<b data-newcount hidden></b></button>' +
    '<button class="at-hbtn" type="button" data-act="quests" title="Quêtes (J)">📜</button>' +
    '<button class="at-hbtn" type="button" data-act="mute" title="Son">🔊</button>' +
    '<button class="at-hbtn" type="button" data-act="pause" title="Menu (Échap)">☰</button></div>' +
    '<div class="at-bar" data-bar></div>' +
    '<div class="at-toasts" data-toasts></div>' +
    '<div class="at-banner" data-banner hidden></div>' +
    '<div class="at-tip" data-tip hidden></div>';
  stage.appendChild(hud);
  var tipEl = $("[data-tip]", hud), bannerEl = $("[data-banner]", hud), toastsEl = $("[data-toasts]", hud);

  /* ====================== CAMÉRA ====================== */
  var W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, stage.clientWidth); H = Math.max(200, stage.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    fitZoom();
  }
  function fitZoom() {
    if (w && w.combat) cam.fit = clamp(Math.min(W / (13 * TW + 40), (H - 150) / (13 * TH + 140)), W < 700 ? 0.5 : 0.35, 1.25);
    else cam.fit = clamp(Math.min(W / 1100, H / 640), 0.5, 1.2);
  }
  function camTarget() {
    if (!w) return { x: 0, y: 0 };
    if (w.combat) { var c = iso(6, 6); return { x: c.x, y: c.y - 30 + (W < 700 ? 0 : 20) }; }
    var v = vis["h" + focusPi] || w.heroes[focusPi] && { gx: w.heroes[focusPi].x, gy: w.heroes[focusPi].y };
    if (v) { var p = iso(v.gx, v.gy); return { x: p.x, y: p.y - 30 }; }
    return { x: 0, y: 0 };
  }
  function updateCam(dt) {
    var tz = cam.fit * cam.zu;
    cam.z += (tz - cam.z) * Math.min(1, dt * 8);
    if (!cam.free) { var t = camTarget(); cam.x += (t.x - cam.x) * Math.min(1, dt * 5); cam.y += (t.y - cam.y) * Math.min(1, dt * 5); }
  }
  function snapCam() { var t = camTarget(); cam.x = t.x; cam.y = t.y; cam.free = false; }
  function toWorld(sx, sy) { return { x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y }; }
  function toScreen(wx, wy) { return { x: (wx - cam.x) * cam.z + W / 2, y: (wy - cam.y) * cam.z + H / 2 }; }
  function cellAt(sx, sy) {
    var p = toWorld(sx, sy);
    var fx = p.x / TW + p.y / TH, fy = p.y / TH - p.x / TW;
    return { x: Math.round(fx), y: Math.round(fy) };
  }

  /* ====================== EFFETS ====================== */
  function addText(gx, gy, text, col, o) {
    o = o || {};
    var p = iso(gx, gy);
    texts.push({ x: p.x + rnd(-8, 8), y: p.y - (o.h || 74) * (w && w.combat ? 1.2 : 1), text: text, col: col, life: o.life || 1.1, t: 0, size: o.size || 20, vy: o.vy || -40 });
  }
  function addParts(x, y, n, col, o) {
    o = o || {};
    if (!fxOn()) n = Math.ceil(n * 0.35);
    for (var i = 0; i < n; i++) {
      var a = o.a != null ? o.a + rnd(-o.spread || -1, o.spread || 1) : rnd(0, TAU), sp = rnd(o.min || 40, o.max || 160);
      parts.push({ x: x + rnd(-(o.r || 4), o.r || 4), y: y + rnd(-(o.r || 4), o.r || 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - (o.up || 0), g: o.g == null ? 120 : o.g,
        life: rnd(0.4, o.life || 0.9), t: 0, col: Array.isArray(col) ? col[i % col.length] : col, s: rnd(o.s0 || 2, o.s1 || 4.5), shape: o.shape || "c" });
    }
  }
  function addRing(x, y, col, r0, r1, life, o) { rings.push({ x: x, y: y, col: col, r0: r0, r1: r1, life: life || 0.5, t: 0, flat: o && o.flat, lw: (o && o.lw) || 3 }); }
  function addBeam(from, to, col, o) {
    var a = iso(from[0], from[1]), b = iso(to[0], to[1]);
    beams.push({ x0: a.x, y0: a.y - 32, x1: b.x, y1: b.y - 32, col: col, life: (o && o.life) || 0.38, t: 0, w: (o && o.w) || 6 });
  }
  function shake(v) { if (fxOn()) shakeT = Math.min(18, shakeT + v); }
  function after(t, f) { later.push({ t: t, f: f }); }
  function unitScreen(u) { var v = vis["u" + u.id]; var gx = v ? v.gx : u.x, gy = v ? v.gy : u.y; var p = iso(gx, gy); return { x: p.x, y: p.y, gx: gx, gy: gy }; }
  function toast(text, cls) {
    var el = document.createElement("div");
    el.className = "at-toast " + (cls || "");
    el.innerHTML = text;
    toastsEl.appendChild(el);
    while (toastsEl.children.length > 4) toastsEl.removeChild(toastsEl.firstChild);
    setTimeout(function () { el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); }, 3200);
  }
  var bannerTimer = 0;
  function banner(text, sub, cls) {
    bannerEl.className = "at-banner " + (cls || "");
    bannerEl.innerHTML = "<strong>" + esc(text) + "</strong>" + (sub ? "<span>" + esc(sub) + "</span>" : "");
    bannerEl.hidden = false;
    bannerEl.classList.remove("in"); void bannerEl.offsetWidth; bannerEl.classList.add("in");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { bannerEl.hidden = true; }, 1900);
  }

  /* ====================== ÉVÉNEMENTS DU MOTEUR → EFFETS ====================== */
  function unitOf(id) { return w && w.combat ? A.uById(w.combat, id) : null; }
  function uvis(u) {
    var k = "u" + u.id;
    if (!vis[k]) vis[k] = { gx: u.x, gy: u.y, q: [], speed: 6, hurt: 0, cast: 0, alpha: 1, born: clock };
    return vis[k];
  }
  function isLocal(pi) { return locals.indexOf(pi) >= 0; }
  function handleEvents(list) {
    list.forEach(function (e) { try { onEvent(e); } catch (err) { if (window.console) console.error(err); } });
    if (list.length) hudDirty = true;
  }
  function onEvent(e) {
    var u = e.id != null ? unitOf(e.id) : null, v = u ? uvis(u) : null, p;
    switch (e.k) {
      case "msg": if (e.pi < 0 || isLocal(e.pi)) toast(esc(e.text), "warn"); break;
      case "step": if (isLocal(e.pi) && Math.random() < 0.5) SFX.step(); break;
      case "zone": {
        var Z = A.ZONES[e.zone];
        vis = {}; sel = null; pendingNpc = null;
        setTimeout(function () { snapCam(); }, 0);
        banner(Z.name, Z.sub, "zone");
        break;
      }
      case "dungeon": banner("Sanctuaire brisé", "Donjon · 3 salles", "zone"); break;
      case "combat": {
        Object.keys(vis).forEach(function (k) { if (k[0] === "u") delete vis[k]; });
        sel = null; objBorn = {}; fitZoom(); cam.free = false; cam.zu = 1;
        setTimeout(snapCam, 0);
        var room = w.combat && w.combat.room;
        banner(room ? room.name : "Combat !", room && room.boss ? "Boss · Archonte fractal" : "Placez-vous sur les cases bleues", "fight");
        SFX.warn(); flash = 0.5; flashCol = "#ffffff";
        break;
      }
      case "fight": banner("Que le combat commence !", null, "fight"); SFX.turn(); break;
      case "turn":
        if (u) {
          sel = null;
          if (u.side === 0 && isLocal(u.pi)) { banner(duo ? "Au tour de " + u.name : "À toi de jouer !", u.pa + " PA · " + u.pm + " PM", "turn"); SFX.turn(); }
          if (u.side === 0) focusPi = isLocal(u.pi) ? u.pi : focusPi;
        }
        break;
      case "move": if (v) { v.q = v.q.concat(e.path.map(function (c) { return [c[0], c[1]]; })); v.speed = u.side ? 5.5 : 6.5; } break;
      case "slide": if (v) { v.q = v.q.concat(e.path); v.speed = 11; } break;
      case "bump": if (u) { p = unitScreen(u); shake(5); addParts(p.x, p.y - 20, 10, ["#fff", "#ffd257"], { max: 120 }); addText(u.x, u.y, "Bam !", "#ffd257", { size: 16, h: 90 }); SFX.hit(true); } break;
      case "jump": if (v) { v.q = []; v.jump = { from: e.from, to: e.to, t: -(e.i || 0) * 0.32, dur: 0.32 }; SFX.jump(); var a = iso(e.from[0], e.from[1]); addParts(a.x, a.y, 8, ["#3fe8ff", "#ff8a6a"], { max: 90, g: 0 }); } break;
      case "tp": if (v) { var f = iso(e.from[0], e.from[1]); addParts(f.x, f.y - 30, 18, e.fx === "ghost" ? ["#a7b0c0", "#ffffff"] : ["#7ff6ff", "#c77dff", "#fff"], { shape: "t", g: -40, max: 90 }); v.q = []; v.jump = null; v.gx = e.to[0]; v.gy = e.to[1]; v.tpIn = 0.35; var t2 = iso(e.to[0], e.to[1]); after(0.12, function () { addParts(t2.x, t2.y - 30, 18, ["#7ff6ff", "#c77dff", "#fff"], { shape: "t", g: 60, max: 70 }); }); SFX.tp(); } break;
      case "tpobj": { var tf = iso(e.from[0], e.from[1]); addParts(tf.x, tf.y - 30, 14, ["#7ff6ff", "#fff"], { shape: "t" }); SFX.tp(); break; }
      case "cast": onCast(e, u, v); break;
      case "beam": {
        var big = e.big;
        addBeam(e.from, e.to, e.col, { w: big ? 12 : 6, life: big ? 0.6 : 0.38 });
        var bt = iso(e.to[0], e.to[1]);
        addParts(bt.x, bt.y - 32, big ? 20 : 10, [e.col, "#fff"], { g: 0, max: 140 });
        if (big) { shake(6); flash = 0.35; flashCol = e.col; }
        break;
      }
      case "slash": { var st = iso(e.to[0], e.to[1]); slashes.push({ x: st.x, y: st.y - 30, t: 0, life: 0.28, col: "#3fe8ff", a: rnd(-0.6, 0.6) }); hitstop = Math.max(hitstop, 0.07); break; }
      case "dmg":
        if (u) {
          p = unitScreen(u);
          var delay = e.push ? 0.08 : 0.12;
          after(delay, function () {
            if (e.sh) addText(p.gx, p.gy, "-" + e.sh, "#9fd8ff", { size: 16, h: 92 });
            if (e.v) addText(p.gx, p.gy, (e.crit ? "-" + e.v + " !" : "-" + e.v), e.crit ? "#ffd257" : "#ff5a6a", { size: e.crit ? 30 : 22 });
            v.hurt = 1;
            addParts(p.x, p.y - 30, e.crit ? 18 : 9, e.sh && !e.v ? ["#9fd8ff", "#fff"] : ["#ff5a6a", "#ffd2d8", "#fff"], { max: e.crit ? 200 : 130 });
            shake(e.crit ? 9 : Math.min(6, 2 + e.v / 10));
            if (e.crit) { hitstop = Math.max(hitstop, 0.1); flash = 0.25; flashCol = "#ffd257"; }
            SFX.hit(e.crit || e.v > 25);
          });
        }
        break;
      case "heal": if (u && e.v > 0) { p = unitScreen(u); after(0.1, function () { addText(p.gx, p.gy, "+" + e.v, "#5dff9a", { size: 20 }); addParts(p.x, p.y - 20, 12, ["#5dff9a", "#c8ffd8", "#fff"], { g: -60, max: 60, shape: "plus" }); addRing(p.x, p.y, "#5dff9a", 6, 34, 0.5, { flat: true }); SFX.heal(); }); } break;
      case "shield": if (u) { p = unitScreen(u); addText(p.gx, p.gy, "+" + e.v + " 🛡", "#9fd8ff", { size: 17, h: 90 }); addRing(p.x, p.y - 30, "#9fd8ff", 10, 40, 0.5); addParts(p.x, p.y - 30, 10, ["#f2c14e", "#9fd8ff"], { shape: "sq", g: -30, max: 70 }); SFX.shield(); } break;
      case "buff": if (u) addText(u.x, u.y, e.text, "#ffd257", { size: 15, h: 96 }); break;
      case "die":
        if (u && v) {
          p = unitScreen(u); v.dying = 0;
          addParts(p.x, p.y - 26, 26, u.side ? [A.MOBS[u.type] ? A.MOBS[u.type].col : "#fff", "#fff"] : ["#ffffff", "#9fd8ff"], { max: 180, up: 40 });
          addRing(p.x, p.y, "#ffffff", 8, 46, 0.5, { flat: true });
          SFX.die();
          if (u.boss) { shake(16); flash = 0.7; flashCol = "#d36cff"; }
        }
        break;
      case "wall": e.cells.forEach(function (c) { objBorn[c[0] + "," + c[1]] = clock; var q = iso(c[0], c[1]); addParts(q.x, q.y, 10, ["#c9c3b0", "#8a93b8"], { max: 90, up: 60 }); }); shake(4); SFX.wall(); break;
      case "smoke": { var sm = iso(e.at[0], e.at[1]); addParts(sm.x, sm.y - 10, 22, ["#d8dcef", "#a9aec8", "#fff"], { g: -20, max: 70, r: 30, s0: 5, s1: 10, life: 1.2 }); noise(0.4, 0.15, 900); break; }
      case "tele": e.cells.forEach(function (c) { objBorn["t" + c[0] + "," + c[1]] = clock; }); SFX.warn(); toast("⚠ L'Archonte prépare une <b>Sentence</b> : quittez les cases rouges !", "warn"); break;
      case "boom": e.cells.forEach(function (c, i) { var q = iso(c[0], c[1]); after(i * 0.02, function () { addParts(q.x, q.y - 10, 6, ["#ff5a6a", "#ffd257", "#d36cff"], { up: 80, max: 120 }); }); booms.push({ x: q.x, y: q.y, t: 0 }); }); shake(12); SFX.boom(); break;
      case "summon": if (u) { p = unitScreen(u); addParts(p.x, p.y - 20, 18, ["#d36cff", "#fff"], { up: 60 }); SFX.tp(); } break;
      case "victory": banner("Victoire !", null, "win"); SFX.win(); w.combat.units.forEach(function (x) { if (x.side === 0 && x.alive) uvis(x).win = clock; }); break;
      case "defeat": banner("Défaite…", "Retour au village", "lose"); SFX.lose(); break;
      case "levelup": if (isLocal(e.pi)) { after(0.8, function () { banner("Niveau " + e.level + " !", "PV et puissance augmentés", "level"); SFX.level(); }); } break;
      case "ult": if (isLocal(e.pi)) after(1.6, function () { toast("✨ <b>Sort ultime débloqué !</b> (touche 5)", "gold"); }); break;
      case "quest": if (isLocal(e.pi)) { var Q = A.QUESTS.filter(function (q) { return q.id === e.q; })[0]; toast("📜 Quête terminée : <b>" + esc(Q ? Q.name : "") + "</b>", "gold"); } break;
      case "equip": if (isLocal(e.pi)) SFX.click(); break;
      case "sell": if (isLocal(e.pi)) { SFX.coin(); toast("+" + fmt(e.v) + " or", "gold"); } break;
      case "chest": if (isLocal(e.pi)) { shopReveal = e.item; SFX.loot(e.item.r); if (panel === "shop") showShop(); } break;
      case "fountain": break;
    }
  }
  function onCast(e, u, v) {
    if (!u || !v) return;
    v.cast = 0.001;
    var p = unitScreen(u), tg = e.tg || [];
    if (e.mob) {
      if (tg[0] && !A.MOB_SPELLS[e.s].heal) { v.lunge = { to: tg[0], t: 0 }; }
      if (A.MOB_SPELLS[e.s].heal && tg[0]) { var hq = iso(tg[0][0], tg[0][1]); addParts(hq.x, hq.y - 30, 10, ["#c7a6ff", "#fff"], { g: -50 }); }
      SFX.cast();
      return;
    }
    var col = ART.SPELL_COL[e.s] || "#fff";
    addParts(p.x, p.y - 40, 10, [col, "#fff"], { g: -40, max: 70 });
    SFX.cast();
    switch (e.s) {
      case "impact": {
        var t = tg[0], dx = Math.sign(t[0] - u.x), dy = Math.sign(t[1] - u.y), n = Math.abs(t[0] - u.x) + Math.abs(t[1] - u.y);
        for (var i = 1; i <= n; i++) (function (i) { after(i * 0.05, function () { var q = iso(u.x + dx * i, u.y + dy * i); addRing(q.x, q.y, "#7f9cff", 6, 42, 0.35, { flat: true, lw: 5 }); addParts(q.x, q.y - 8, 5, ["#7f9cff", "#f2c14e"], { max: 60 }); }); })(i);
        break;
      }
      case "attraction": addBeam([u.x, u.y], tg[0], "#5bc0ff", { w: 4, life: 0.45 }); break;
      case "forteresse": addRing(p.x, p.y, "#ffd257", 10, 2.4 * TW, 0.8, { flat: true, lw: 6 }); addRing(p.x, p.y - 40, "#ffd257", 10, 90, 0.6); flash = 0.3; flashCol = "#ffd257"; shake(6); break;
      case "balise": { var b = iso(tg[0][0], tg[0][1]); objBorn[tg[0][0] + "," + tg[0][1]] = clock; addParts(b.x, b.y - 30, 16, ["#7ff6ff", "#fff"], { g: -20 }); addRing(b.x, b.y, "#7ff6ff", 4, 30, 0.4, { flat: true }); break; }
      case "onde": addBeam([u.x, u.y], tg[0], "#7dffb0", { w: 3, life: 0.3 }); break;
      case "convergence": flash = 0.4; flashCol = "#9ff3ff"; break;
      case "brume": case "mur": break;
    }
  }

  /* ====================== VISUELS (interpolation) ====================== */
  function updateVis(dt) {
    if (!w) return;
    // exploration
    if (!w.combat) {
      w.heroes.forEach(function (h, i) {
        if (!h) return;
        var k = "h" + i, v = vis[k];
        if (!v) v = vis[k] = { gx: h.x, gy: h.y, walk: null, face: 1 };
        stepToward(v, h.x, h.y, 1 / A.CFG.exploreStep * 1.05, dt);
        if (h.face) v.face = h.face;
      });
      w.packs.forEach(function (pk) {
        var k = "p" + pk.id, v = vis[k];
        if (!v) v = vis[k] = { gx: pk.x, gy: pk.y, walk: null, face: 1, alpha: 0 };
        stepToward(v, pk.x, pk.y, 3, dt);
        v.face = pk.face || v.face;
        v.alpha = clamp(v.alpha + (pk.dead ? -dt * 2 : dt * 2), 0, 1);
      });
    } else {
      w.combat.units.forEach(function (u) {
        var v = uvis(u);
        if (v.jump) {
          v.jump.t += dt;
          if (v.jump.t >= v.jump.dur) { v.gx = v.jump.to[0]; v.gy = v.jump.to[1]; var land = iso(v.gx, v.gy); addParts(land.x, land.y, 8, ["#3fe8ff", "#fff"], { max: 80 }); addRing(land.x, land.y, "#3fe8ff", 4, 30, 0.3, { flat: true }); v.jump = null; }
        } else if (v.q.length) {
          var t = v.q[0];
          var arrived = stepToward(v, t[0], t[1], v.speed, dt);
          if (arrived) { v.q.shift(); if (u.side === 0 && Math.random() < 0.4) SFX.step(); }
        } else stepToward(v, u.x, u.y, 8, dt);
        if (v.q.length || v.jump) { var nx = v.jump ? v.jump.to : v.q[0]; var dx = nx[0] - v.gx, dy = nx[1] - v.gy; if (Math.abs(dx) + Math.abs(dy) > 0.05) v.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 2 : -2); }
        else v.face = u.face || v.face;
        v.hurt = Math.max(0, v.hurt - dt * 3.5);
        if (v.cast) { v.cast += dt * 2.6; if (v.cast >= 1) v.cast = 0; }
        if (v.tpIn) v.tpIn = Math.max(0, v.tpIn - dt);
        if (v.lunge) { v.lunge.t += dt * 3.2; if (v.lunge.t >= 1) v.lunge = null; }
        if (v.dying != null) v.dying += dt;
      });
    }
  }
  function stepToward(v, tx, ty, speed, dt) {
    var dx = tx - v.gx, dy = ty - v.gy, d = Math.abs(dx) + Math.abs(dy);
    if (d > 4.5) { v.gx = tx; v.gy = ty; v.walk = null; return true; }
    if (d < 0.001) { v.walk = null; return true; }
    var stp = speed * dt;
    if (stp >= d) { v.gx = tx; v.gy = ty; v.walk = null; return true; }
    // un axe à la fois, comme sur la grille
    if (Math.abs(dx) > 0.001) v.gx += Math.sign(dx) * Math.min(Math.abs(dx), stp);
    else v.gy += Math.sign(dy) * Math.min(Math.abs(dy), stp);
    v.walk = ((v.walk || 0) + dt * speed) % 1;
    return false;
  }
  function updateFx(dt) {
    later = later.filter(function (l) { l.t -= dt; if (l.t <= 0) { l.f(); return false; } return true; });
    parts = parts.filter(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.97; return p.t < p.life; });
    texts = texts.filter(function (t) { t.t += dt; t.y += t.vy * dt; t.vy *= 0.94; return t.t < t.life; });
    rings = rings.filter(function (r) { r.t += dt; return r.t < r.life; });
    beams = beams.filter(function (b) { b.t += dt; return b.t < b.life; });
    slashes = slashes.filter(function (s) { s.t += dt; return s.t < s.life; });
    booms = booms.filter(function (b) { b.t += dt; return b.t < 0.6; });
    shakeT = Math.max(0, shakeT - dt * 30);
    flash = Math.max(0, flash - dt * 2.2);
  }

  /* ====================== RENDU ====================== */
  function render() {
    var g = ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var theme = w && w.combat ? w.combat.arena.theme : w ? A.ZONES[w.zone].theme : "prairie";
    var bg = g.createLinearGradient(0, 0, 0, H);
    var BG = { village: ["#7ec8e8", "#cfe9d6"], prairie: ["#86cbe9", "#d9f0cf"], bois: ["#20403a", "#4f7d5d"], falaises: ["#6f7fb5", "#c9d6ef"], donjon: ["#160f2a", "#3a2a5c"] }[theme] || ["#222", "#444"];
    bg.addColorStop(0, BG[0]); bg.addColorStop(1, BG[1]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // brume d'ambiance
    for (var i = 0; i < 5; i++) {
      var bx = (i * 271 + clock * 6) % (W + 300) - 150, by = H * (0.15 + i * 0.17);
      ART.glow(g, bx, by, 160, theme === "donjon" ? "rgba(160,90,255,.12)" : "rgba(255,255,255,.18)", 1);
    }
    if (!w) return;
    var sx = shakeT ? rnd(-shakeT, shakeT) * 0.5 : 0, sy = shakeT ? rnd(-shakeT, shakeT) * 0.5 : 0;
    g.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (W / 2 - cam.x * cam.z + sx), dpr * (H / 2 - cam.y * cam.z + sy));
    if (w.combat) renderCombat(g); else renderExplore(g);
    renderFx(g);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flash > 0) { g.globalAlpha = Math.min(0.5, flash); g.fillStyle = flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    // vignette
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,5,30,.35)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function tileCol(T, kind, tint) {
    var arr = kind === 2 ? T.path : T.top;
    return arr[Math.floor(tint * arr.length) % arr.length];
  }
  function drawTile(g, x, y, top, thick, sideL, sideR, line) {
    var p = iso(x, y);
    if (thick) {
      if (sideL) { g.fillStyle = sideL; g.beginPath(); g.moveTo(p.x - HW, p.y); g.lineTo(p.x, p.y + HH); g.lineTo(p.x, p.y + HH + thick); g.lineTo(p.x - HW, p.y + thick); g.closePath(); g.fill(); }
      if (sideR) { g.fillStyle = sideR; g.beginPath(); g.moveTo(p.x + HW, p.y); g.lineTo(p.x, p.y + HH); g.lineTo(p.x, p.y + HH + thick); g.lineTo(p.x + HW, p.y + thick); g.closePath(); g.fill(); }
    }
    g.fillStyle = top;
    ART.diamond(g, p.x, p.y, HW + 0.6, HH + 0.4); g.fill();
    if (line) { g.strokeStyle = line; g.lineWidth = 1; ART.diamond(g, p.x, p.y, HW - 1, HH - 0.5); g.stroke(); }
  }
  function fillCell(g, x, y, col, inset) {
    var p = iso(x, y), k = inset || 3;
    g.fillStyle = col; ART.diamond(g, p.x, p.y, HW - k, HH - k / 2); g.fill();
  }
  function strokeCell(g, x, y, col, lw, inset) {
    var p = iso(x, y), k = inset || 3;
    g.strokeStyle = col; g.lineWidth = lw || 2; ART.diamond(g, p.x, p.y, HW - k, HH - k / 2); g.stroke();
  }
  // liste triée par profondeur : tout ce qui « tient debout »
  function drawSorted(g, items) {
    items.sort(function (a, b) { return a.d - b.d || (a.o || 0) - (b.o || 0); });
    items.forEach(function (it) { it.f(g); });
  }
  function occluders() {
    // personnages à garder visibles derrière le décor
    var out = [];
    if (!w) return out;
    if (w.combat) w.combat.units.forEach(function (u) { if (u.alive) { var v = vis["u" + u.id]; out.push(v ? [v.gx, v.gy] : [u.x, u.y]); } });
    else w.heroes.forEach(function (h, i) { if (h) { var v = vis["h" + i]; out.push(v ? [v.gx, v.gy] : [h.x, h.y]); } });
    return out;
  }
  function decoAlpha(x, y, occ, tall) {
    for (var i = 0; i < occ.length; i++) {
      var o = occ[i], dd = (x + y) - (o[0] + o[1]);
      if (dd <= 0 || dd > (tall ? 4 : 2.2)) continue;
      if (Math.abs((x - y) - (o[0] - o[1])) <= (tall ? 2.2 : 1.2)) return 0.42;
    }
    return 1;
  }

  /* ---------- exploration ---------- */
  function renderExplore(g) {
    var m = A.zoneMap(w.zone), Z = A.ZONES[w.zone], T = ART.THEMES[Z.theme];
    var line = SET.grid ? T.line : null;
    for (var s = 0; s < m.w + m.h; s++) for (var x = 0; x <= s; x++) {
      var y = s - x;
      if (x >= m.w || y >= m.h) continue;
      var k = m.g[x][y], tint = m.tint[x][y];
      var edgeL = y === m.h - 1, edgeR = x === m.w - 1;
      if (k === 3) {
        drawTile(g, x, y, T.side2, 0);
        var p = iso(x, y);
        g.fillStyle = T.water; ART.diamond(g, p.x, p.y + 5, HW - 2, HH - 1); g.fill();
        g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1.5;
        var wv = Math.sin(clock * 2 + x * 1.3 + y) * 6;
        g.beginPath(); g.moveTo(p.x - 16 + wv, p.y + 4); g.lineTo(p.x - 4 + wv, p.y + 4); g.stroke();
        continue;
      }
      drawTile(g, x, y, tileCol(T, k === 2 ? 2 : 0, tint), edgeL || edgeR ? 26 : 0, edgeL ? T.side : null, edgeR ? T.side2 : null, line);
      var fl = m.flora[x + "," + y];
      if (fl != null) {
        var q = iso(x, y), fc = ["#ff7b9c", "#fff1a8", "#c7a6ff", "#ffffff"][fl];
        for (var j = 0; j < 3; j++) ART.circ(g, q.x - 14 + j * 12 + (tint * 9 % 5), q.y - 3 + (j % 2) * 6, 2.2, fc);
      }
    }
    // survol
    if (hover && A.exploreWalkable(m, hover.x, hover.y) && !panel) { fillCell(g, hover.x, hover.y, "rgba(255,255,255,.22)"); strokeCell(g, hover.x, hover.y, "rgba(255,255,255,.6)", 1.5); }
    // destination de mon héros
    var me = w.heroes[focusPi];
    if (me && me.path && me.path.length) { var dst = me.path[me.path.length - 1]; var dq = iso(dst[0], dst[1]); ART.ell(g, dq.x, dq.y, 14 + Math.sin(clock * 6) * 2, 7, "rgba(255,255,255,.35)"); }
    var occ = occluders(), items = [];
    Object.keys(m.deco).forEach(function (key) {
      var c = key.split(","), x = +c[0], y = +c[1], d = m.deco[key];
      var p = iso(x, y), tall = d.t === "tree" || d.t === "pine" || d.t === "house" || d.t === "cliff";
      if (!onScreen(p.x, p.y, 140)) return;
      var a = decoAlpha(x, y, occ, tall);
      items.push({ d: x + y + (d.t === "house" ? 0.2 : 0), o: 1, f: function (g) { ART.deco(g, d, p.x, p.y, { t: clock, alpha: a }); } });
    });
    Z.portals.forEach(function (po) {
      var p = iso(po.x, po.y), locked = po.req && A.partyLevel(w) < po.req;
      items.push({ d: po.x + po.y - 0.5, o: 0, f: function (g) {
        ART.deco(g, { t: "portal", s: 1, v: 0 }, p.x, p.y, { t: clock, locked: locked });
        label(g, p.x, p.y - 62, (locked ? "🔒 " : "→ ") + po.label + (locked ? " (niv. " + po.req + ")" : ""), locked ? "#ffb0b0" : "#ffffff", 13);
      } });
    });
    (A.NPCS[w.zone] || []).forEach(function (n) {
      if (n.obj) return;
      var p = iso(n.x, n.y);
      items.push({ d: n.x + n.y, o: 2, f: function (g) {
        ART.npc(g, n.id, p.x, p.y, { t: clock, flip: me && me.x + me.y < n.x + n.y ? -1 : 1 });
        var hv = hoverObj && hoverObj.npc === n.id;
        label(g, p.x, p.y - 78, n.name, hv ? "#ffd257" : "#fff", 13);
        var bob = Math.sin(clock * 3) * 3;
        ART.circ(g, p.x, p.y - 98 + bob, 10, n.role === "quests" ? "#ffd257" : "#ff9a3c");
        g.fillStyle = "#3a2618"; g.font = "900 14px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(n.role === "quests" ? "!" : "$", p.x, p.y - 97 + bob);
      } });
    });
    w.packs.forEach(function (pk) {
      var v = vis["p" + pk.id];
      if (!v || v.alpha <= 0.01) return;
      var p = iso(v.gx, v.gy), flip = v.face === 1 || v.face === -2 ? 1 : -1;
      items.push({ d: v.gx + v.gy, o: 3, f: function (g) {
        g.save(); g.globalAlpha = v.alpha;
        var hv = hoverObj && hoverObj.pack === pk.id;
        if (hv) { ART.ell(g, p.x, p.y, 30, 14, "rgba(255,90,106,.35)"); }
        for (var i = pk.mobs.length - 1; i >= 0; i--) {
          var mb = pk.mobs[i], M = A.MOBS[mb.type];
          var ox = i === 0 ? 0 : (i % 2 ? -18 : 18), oy = i === 0 ? 0 : -8 - Math.floor((i - 1) / 2) * 6;
          ART.mob(g, mb.type, p.x + ox, p.y + oy, { t: clock + i * 0.7 + pk.id, col: M.col, flip: flip, walk: v.walk, elite: !!mb.affix, scale: i === 0 ? 0.95 : 0.7, boss: M.boss, seed: pk.id + i });
        }
        var lvl = pk.mobs.reduce(function (s, mb) { return Math.max(s, mb.lvl); }, 0);
        label(g, p.x, p.y - 58, "Niv. " + lvl + " · ×" + pk.mobs.length + (pk.mobs.some(function (mb) { return mb.affix; }) ? " ★" : ""), pk.mobs.some(function (mb) { return mb.affix; }) ? "#ffd257" : "#fff", 12);
        g.restore();
      } });
    });
    w.heroes.forEach(function (h, i) {
      if (!h || !w.players[i]) return;
      var v = vis["h" + i]; if (!v) return;
      var p = iso(v.gx, v.gy), cls = w.players[i].profile.cls;
      items.push({ d: v.gx + v.gy, o: 4, f: function (g) {
        if (duo && i === focusPi) { ART.ell(g, p.x, p.y, 22, 10, "rgba(255,255,255,.25)"); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, p.y, 22, 10, 0, 0, TAU); g.stroke(); }
        ART.hero(g, cls, p.x, p.y, { t: clock + i, flip: v.face === 1 || v.face === -2 ? 1 : -1, back: v.face < 0, walk: v.walk, seed: i * 3 });
        if (w.players.filter(Boolean).length > 1) label(g, p.x, p.y - 84, w.players[i].name, isLocal(i) ? "#ffffff" : "#9fd8ff", 12);
      } });
    });
    drawSorted(g, items);
  }
  function onScreen(x, y, pad) {
    var s = toScreen(x, y);
    return s.x > -pad * cam.z && s.x < W + pad * cam.z && s.y > -pad * 2 * cam.z && s.y < H + pad * cam.z;
  }
  function label(g, x, y, text, col, size) {
    g.font = "800 " + (size || 13) + "px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    var tw = g.measureText(text).width + 12;
    g.fillStyle = "rgba(20,14,40,.62)";
    ART.rrect(g, x - tw / 2, y - (size || 13) * 0.75, tw, (size || 13) * 1.5, 7, "rgba(20,14,40,.62)");
    g.fillStyle = col || "#fff"; g.fillText(text, x, y + 0.5);
  }

  /* ---------- combat ---------- */
  function renderCombat(g) {
    var c = w.combat, Ar = c.arena, T = ART.THEMES[Ar.theme] || ART.THEMES.prairie;
    for (var s = 0; s < Ar.w + Ar.h; s++) for (var x = 0; x <= s; x++) {
      var y = s - x;
      if (x >= Ar.w || y >= Ar.h || Ar.g[x][y] === 9) continue;
      var tint = Ar.tint[x][y], chk = (x + y) % 2;
      var top = T.top[chk ? 0 : 2];
      if (Ar.theme === "donjon") top = chk ? "#5d527c" : "#665b88";
      var below = y + 1 >= Ar.h || Ar.g[x][y + 1] === 9, right = x + 1 >= Ar.w || Ar.g[x + 1][y] === 9;
      drawTile(g, x, y, ART.shade(top, (tint - 0.5) * 0.06 - (Ar.g[x][y] === 1 ? 0.18 : 0)), below || right ? 34 : 0, below ? T.side : null, right ? T.side2 : null, "rgba(255,255,255,.14)");
    }
    var a = A.active(c), my = a && a.side === 0 && isLocal(a.pi) && c.phase === "fight" && w.mode === "combat";
    // placement
    if (c.phase === "place") {
      Ar.heroCells.forEach(function (h) { fillCell(g, h[0], h[1], "rgba(70,150,255,.42)"); strokeCell(g, h[0], h[1], "rgba(150,200,255,.9)", 1.5); });
      Ar.mobCells.forEach(function (h) { fillCell(g, h[0], h[1], "rgba(255,70,90,.25)"); });
    }
    // télégraphes (cases dangereuses)
    c.tele.forEach(function (tl) {
      tl.cells.forEach(function (q) {
        var pulse = 0.35 + Math.sin(clock * 8) * 0.15;
        fillCell(g, q[0], q[1], "rgba(255,40,70," + pulse + ")", 2); strokeCell(g, q[0], q[1], "#ff5a6a", 2, 2);
      });
    });
    // portée de déplacement d'un ennemi survolé
    var hu = hoverObj && hoverObj.unit ? A.uById(c, hoverObj.unit) : null;
    if (hu && hu.side === 1 && hu.alive && c.phase === "fight" && !sel) {
      var saved = hu.pm; hu.pm = hu.maxPm;
      var rr = A.reach(w, hu); hu.pm = saved;
      Object.keys(rr).forEach(function (k) { var q = k.split(","); if (rr[k] > 0) fillCell(g, +q[0], +q[1], "rgba(255,80,100,.18)"); });
    }
    if (my) {
      if (sel) {
        var tg = A.targets(w, a, sel.sid, sel.tg), S = A.SPELLS[sel.sid];
        var col = S.steps[sel.tg.length] && (S.steps[sel.tg.length].target === "ally" || S.steps[sel.tg.length].target === "allyOrBeacon") ? "rgba(60,255,140,.45)" : "rgba(150,80,255,.52)";
        rangeCells(a, sel).forEach(function (q) { fillCell(g, q[0], q[1], "rgba(90,60,170,.22)"); });
        tg.forEach(function (q) { fillCell(g, q[0], q[1], col); strokeCell(g, q[0], q[1], "rgba(235,215,255,.9)", 1.6); });
        sel.tg.forEach(function (q, i) { fillCell(g, q[0], q[1], "rgba(255,210,87,.55)"); var p = iso(q[0], q[1]); label(g, p.x, p.y, String(i + 1), "#ffd257", 12); });
        var hv = hover && tg.some(function (q) { return q[0] === hover.x && q[1] === hover.y; });
        if (hv) {
          var ar = A.area(w, a, sel.sid, sel.tg.concat([[hover.x, hover.y]]));
          ar.forEach(function (q) { fillCell(g, q[0], q[1], "rgba(255,210,87,.42)"); strokeCell(g, q[0], q[1], "#ffd257", 2); });
        }
      } else if (!(vis["u" + a.id] && (vis["u" + a.id].q.length || vis["u" + a.id].jump))) {
        var r = A.reach(w, a);
        Object.keys(r).forEach(function (k) { var q = k.split(","); if (r[k] > 0) fillCell(g, +q[0], +q[1], "rgba(40,220,210,.30)"); });
        if (hover && r[hover.x + "," + hover.y] > 0) {
          var path = A.combatPath(c, a, hover.x, hover.y, a.pm) || [];
          path.forEach(function (q, i) { fillCell(g, q[0], q[1], "rgba(60,255,235,.45)"); if (i === path.length - 1) { var p = iso(q[0], q[1]); label(g, p.x, p.y, path.length + " PM", "#7ffff0", 12); } });
        }
      }
    }
    if (hover && A.inArena(c, hover.x, hover.y) && !panel) strokeCell(g, hover.x, hover.y, "rgba(255,255,255,.85)", 2);
    // anneaux au sol
    c.units.forEach(function (u) {
      var v = vis["u" + u.id]; if (!v || (!u.alive && v.dying == null)) return;
      if (!u.alive) return;
      var p = iso(v.gx, v.gy), isA = a && a.id === u.id;
      g.strokeStyle = u.side === 0 ? "rgba(90,170,255,.9)" : "rgba(255,90,110,.9)"; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(p.x, p.y, 24, 11, 0, 0, TAU); g.stroke();
      if (isA) { g.strokeStyle = "#ffd257"; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y, 29 + Math.sin(clock * 5) * 2, 14 + Math.sin(clock * 5), 0, 0, TAU); g.stroke(); }
    });
    booms.forEach(function (b) { g.globalAlpha = 1 - b.t / 0.6; g.fillStyle = "#ff5a6a"; ART.diamond(g, b.x, b.y, HW * (0.6 + b.t), HH * (0.6 + b.t)); g.fill(); g.globalAlpha = 1; });
    var occ = occluders(), items = [];
    Object.keys(Ar.deco).forEach(function (key) {
      var q = key.split(","), x = +q[0], y = +q[1], d = Ar.deco[key], p = iso(x, y);
      var al = decoAlpha(x, y, occ, true);
      items.push({ d: x + y, o: 1, f: function (g) { ART.deco(g, d, p.x, p.y, { t: clock, alpha: al }); } });
    });
    c.objects.forEach(function (o) {
      var p = iso(o.x, o.y), born = objBorn[o.x + "," + o.y] || -9, k = clamp((clock - born) / 0.35, 0, 1);
      items.push({ d: o.x + o.y + (o.kind === "smoke" ? 0.4 : 0), o: o.kind === "smoke" ? 9 : 2, f: function (g) { drawObj(g, o, p, k); } });
    });
    c.units.forEach(function (u) {
      var v = uvis(u);
      if (!u.alive && (v.dying == null || v.dying > 0.7)) return;
      items.push({ d: v.gx + v.gy, o: 5, f: function (g) { drawUnit(g, u, v, a); } });
    });
    drawSorted(g, items);
    // barres de vie au-dessus de tout
    c.units.forEach(function (u) {
      if (!u.alive) return;
      var v = vis["u" + u.id]; if (!v) return;
      var p = iso(v.gx, v.gy), h = u.boss ? 150 : u.side === 0 ? 102 : 76;
      if (v.jump) h += 40;
      hpBar(g, p.x, p.y - h, u);
    });
  }
  function rangeCells(u, s) {
    var S = A.SPELLS[s.sid], st = S.steps[s.tg.length], c = w.combat, out = [];
    if (!st || st.shape === "self") return out;
    var o = st.from === "prev" && s.tg.length ? s.tg[s.tg.length - 1] : [u.x, u.y];
    for (var x = 0; x < 13; x++) for (var y = 0; y < 13; y++) {
      if (!A.inArena(c, x, y)) continue;
      var dx = x - o[0], dy = y - o[1], adx = Math.abs(dx), ady = Math.abs(dy), d = adx + ady, mx = st.range[1] + (st.boost ? u.po : 0);
      var ok = st.shape === "line" ? (dx === 0 || dy === 0) && d >= st.range[0] && d <= mx :
        st.shape === "diag" ? adx === ady && adx >= st.range[0] && adx <= mx :
        st.shape === "ray" ? adx === ady && adx > 0 :
        st.shape === "knight" ? (adx === 1 && ady === 2) || (adx === 2 && ady === 1) : d >= st.range[0] && d <= mx;
      if (ok) out.push([x, y]);
    }
    return out;
  }
  function drawObj(g, o, p, k) {
    if (o.kind === "wall") {
      var h = 46 * k;
      g.fillStyle = "#6c6a8a"; g.beginPath(); g.moveTo(p.x - HW + 6, p.y); g.lineTo(p.x, p.y + HH - 3); g.lineTo(p.x, p.y + HH - 3 - h); g.lineTo(p.x - HW + 6, p.y - h); g.closePath(); g.fill();
      g.fillStyle = "#8784aa"; g.beginPath(); g.moveTo(p.x + HW - 6, p.y); g.lineTo(p.x, p.y + HH - 3); g.lineTo(p.x, p.y + HH - 3 - h); g.lineTo(p.x + HW - 6, p.y - h); g.closePath(); g.fill();
      g.fillStyle = "#b9b4d8"; ART.diamond(g, p.x, p.y - h, HW - 6, HH - 3); g.fill();
      var gl = 0.5 + Math.sin(clock * 4 + o.x) * 0.3;
      g.strokeStyle = "rgba(255,210,87," + gl + ")"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p.x - 24, p.y - h * 0.5); g.lineTo(p.x - 14, p.y - h * 0.5 + 8); g.lineTo(p.x - 24, p.y - h * 0.5 + 16); g.stroke();
      g.beginPath(); g.moveTo(p.x + 14, p.y - h * 0.4); g.lineTo(p.x + 24, p.y - h * 0.4 + 6); g.stroke();
      if (k >= 1) label(g, p.x, p.y - h - 10, String(o.turns), "#ffd257", 11);
    } else if (o.kind === "beacon") {
      var fy = p.y - 34 * k + Math.sin(clock * 2.5 + o.x) * 3;
      ART.ell(g, p.x, p.y, 16, 7, "rgba(127,246,255,.3)");
      ART.glow(g, p.x, fy, 30, "rgba(127,246,255,.65)", 0.7);
      g.save(); g.translate(p.x, fy); g.rotate(clock * 1.5);
      ART.poly(g, [0, -16, 10, 0, 0, 16, -10, 0], "#7ff6ff", "#ffffff", 2); ART.poly(g, [0, -16, 10, 0, 0, 0], "#ffffff");
      g.restore();
      label(g, p.x, fy - 26, String(o.turns), "#7ff6ff", 11);
    } else if (o.kind === "smoke") {
      g.save(); g.globalAlpha = 0.7 * k;
      for (var i = 0; i < 4; i++) { var a = clock * 0.8 + i * 1.6 + o.x; ART.circ(g, p.x + Math.cos(a) * 14, p.y - 14 + Math.sin(a) * 6 - i * 6, 16 + i * 2, i % 2 ? "#d8dcef" : "#b9bed8"); }
      g.restore();
    }
  }
  function drawUnit(g, u, v, act) {
    var p = iso(v.gx, v.gy), y = p.y, x = p.x;
    if (v.jump) {
      var k = clamp(v.jump.t / v.jump.dur, 0, 1), a = iso(v.jump.from[0], v.jump.from[1]), b = iso(v.jump.to[0], v.jump.to[1]);
      if (v.jump.t < 0) { x = a.x; y = a.y; } else { x = a.x + (b.x - a.x) * k; y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 70; }
      if (k > 0 && k < 1) { ART.ell(g, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 14, 6, "rgba(0,0,0,.25)"); addParts(x, y - 30, 1, "#3fe8ff", { g: 0, max: 10, life: 0.4 }); }
    }
    if (v.lunge) { var lt = iso(v.lunge.to[0], v.lunge.to[1]), lk = Math.sin(v.lunge.t * Math.PI) * 0.3; x += (lt.x - x) * lk; y += (lt.y - y) * lk; }
    var flip = v.face === 1 || v.face === -2 ? 1 : -1, back = v.face < 0;
    g.save();
    var alpha = 1;
    if (v.tpIn) alpha = 1 - v.tpIn / 0.35;
    if (!u.alive && v.dying != null) { alpha = Math.max(0, 1 - v.dying / 0.7); g.translate(0, -v.dying * 30); }
    g.globalAlpha = alpha;
    var opt = { t: clock + u.id, flip: flip, back: back, walk: v.q.length ? v.walk || 0.01 : null, cast: v.cast || 0, hurt: v.hurt, seed: u.id, noShadow: !!v.jump, scale: 1.22 };
    if (v.win && clock - v.win < 2) opt.win = true;
    if (u.side === 0) {
      // bouclier : bulle légère
      if (u.shield.length) { ART.glow(g, x, y - 34, 44, "rgba(159,216,255,.45)", 0.8); g.strokeStyle = "rgba(159,216,255,.7)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 34, 30, 40, 0, 0, TAU); g.stroke(); }
      ART.hero(g, u.cls, x, y, opt);
    } else {
      var M = A.MOBS[u.type];
      opt.col = M.col; opt.elite = !!u.affix; opt.boss = u.boss;
      if (u.shield.length) ART.glow(g, x, y - 26, 36, "rgba(159,216,255,.45)", 0.8);
      ART.mob(g, u.type, x, y, opt);
    }
    g.restore();
  }
  function hpBar(g, x, y, u) {
    var bw = u.boss ? 80 : 46, hpk = clamp(u.hp / u.maxHp, 0, 1);
    var sh = u.shield.reduce(function (s, q) { return s + q.v; }, 0);
    ART.rrect(g, x - bw / 2 - 2, y - 3, bw + 4, 9, 4, "rgba(20,14,40,.75)");
    ART.rrect(g, x - bw / 2, y - 1, bw * hpk, 5, 3, u.side === 0 ? (hpk > 0.35 ? "#5dff9a" : "#ffb347") : (u.affix ? "#ffd257" : "#ff5a6a"));
    if (sh) ART.rrect(g, x - bw / 2, y - 1, Math.min(bw, bw * sh / u.maxHp), 2.5, 2, "#9fd8ff");
    if (u.affix || u.boss) {
      g.font = "800 10px Nunito, sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffd257";
      g.fillText(u.boss ? "BOSS" : A.AFFIXES[u.affix].name, x, y - 9);
    }
  }
  function renderFx(g) {
    rings.forEach(function (r) {
      var k = r.t / r.life, rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2));
      g.strokeStyle = r.col; g.globalAlpha = 1 - k; g.lineWidth = r.lw * (1 - k * 0.5);
      g.beginPath(); g.ellipse(r.x, r.y, rad, r.flat ? rad * 0.5 : rad, 0, 0, TAU); g.stroke();
    });
    g.globalAlpha = 1;
    beams.forEach(function (b) {
      var k = b.t / b.life;
      g.globalAlpha = 1 - k; g.lineCap = "round";
      g.strokeStyle = b.col; g.lineWidth = b.w * (1.6 - k);
      g.shadowColor = b.col; g.shadowBlur = fxOn() ? 18 : 0;
      g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = b.w * 0.4; g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
      g.shadowBlur = 0;
    });
    g.globalAlpha = 1;
    slashes.forEach(function (s) {
      var k = s.t / s.life;
      g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.globalAlpha = 1 - k;
      g.strokeStyle = s.col; g.lineWidth = 6 * (1 - k); g.lineCap = "round";
      g.beginPath(); g.arc(0, 0, 26 + k * 12, -1.4 + k * 1.2, 0.8 + k * 1.2); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 24 + k * 12, -1.2 + k * 1.2, 0.6 + k * 1.2); g.stroke();
      g.restore();
    });
    parts.forEach(function (p) {
      var k = 1 - p.t / p.life;
      g.globalAlpha = Math.min(1, k * 1.4);
      g.fillStyle = p.col;
      if (p.shape === "t") { g.beginPath(); g.moveTo(p.x, p.y - p.s); g.lineTo(p.x + p.s, p.y + p.s); g.lineTo(p.x - p.s, p.y + p.s); g.fill(); }
      else if (p.shape === "sq") g.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      else if (p.shape === "plus") { g.fillRect(p.x - p.s, p.y - p.s * 0.3, p.s * 2, p.s * 0.6); g.fillRect(p.x - p.s * 0.3, p.y - p.s, p.s * 0.6, p.s * 2); }
      else { g.beginPath(); g.arc(p.x, p.y, p.s * (0.5 + k * 0.5), 0, TAU); g.fill(); }
    });
    g.globalAlpha = 1;
    texts.forEach(function (t) {
      var k = t.t / t.life, sc = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : k < 0.25 ? 1.2 - (k - 0.12) / 0.13 * 0.2 : 1;
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.font = "900 " + Math.round(t.size * sc) + "px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 5; g.strokeStyle = "rgba(20,10,40,.85)"; g.strokeText(t.text, t.x, t.y);
      g.fillStyle = t.col; g.fillText(t.text, t.x, t.y);
    });
    g.globalAlpha = 1;
  }

  /* ====================== INTERFACE ====================== */
  function myPlayer(pi) { return w && w.players[pi == null ? focusPi : pi]; }
  function activeLocal() {
    if (!w || !w.combat || w.combat.phase !== "fight" || w.mode !== "combat") return null;
    var a = A.active(w.combat);
    return a && a.side === 0 && isLocal(a.pi) ? a : null;
  }
  function refreshHud() {
    if (!w) return;
    hudDirty = false;
    // portraits du groupe
    var party = w.players.map(function (pl, i) {
      if (!pl) return "";
      var pr = pl.profile, st = A.heroStats(pr), u = w.combat ? w.combat.units.filter(function (x) { return x.side === 0 && x.pi === i; })[0] : null;
      var hp = u ? u.hp : st.hp, mhp = u ? u.maxHp : st.hp, sh = u ? u.shield.reduce(function (s, q) { return s + q.v; }, 0) : 0;
      var xpk = pr.level >= A.CFG.maxLevel ? 1 : pr.xp / A.xpNeed(pr.level);
      var act = w.combat && A.active(w.combat) && u && A.active(w.combat).id === u.id;
      return '<button type="button" class="at-pf' + (isLocal(i) && i === focusPi ? " me" : "") + (act ? " act" : "") + (u && !u.alive ? " ko" : "") + '" data-focus="' + i + '">' +
        '<img src="' + ART.heroIcon(pr.cls, 44) + '" alt="" width="44" height="44">' +
        '<span class="at-pf-b"><span class="at-pf-n">' + esc(pl.name) + ' <em>niv. ' + pr.level + '</em></span>' +
        '<span class="at-pf-hp"><i style="width:' + (hp / mhp * 100).toFixed(1) + '%"></i>' + (sh ? '<u style="width:' + Math.min(100, sh / mhp * 100).toFixed(1) + '%"></u>' : "") + '<b>' + Math.max(0, hp) + " / " + mhp + (sh ? " +" + sh : "") + '</b></span>' +
        '<span class="at-pf-xp"><i style="width:' + (xpk * 100).toFixed(1) + '%"></i></span>' +
        (isLocal(i) ? '<span class="at-pf-g">' + fmt(pr.gold) + ' or</span>' : "") + "</span></button>";
    }).join("");
    $("[data-party]", hud).innerHTML = party;
    var newN = 0; locals.forEach(function (i) { var pl = w.players[i]; if (pl) newN += pl.profile.bag.filter(function (it) { return it.isNew; }).length; });
    var nc = $("[data-newcount]", hud); nc.hidden = !newN; nc.textContent = newN;
    // haut : zone ou frise des tours
    var top = $("[data-top]", hud);
    if (w.combat && w.combat.phase === "fight") {
      var c = w.combat, order = [], n = c.order.length;
      for (var j = 0; j < n; j++) { var uu = A.uById(c, c.order[(c.turn + j) % n]); if (uu && uu.alive) order.push(uu); }
      top.innerHTML = '<div class="at-tl"><span class="at-round">Tour ' + c.round + "</span>" + order.slice(0, 9).map(function (x, k) {
        var img = x.side === 0 ? ART.heroIcon(x.cls, 40) : ART.mobIcon(x.type, 40, A.MOBS[x.type].col, !!x.affix);
        return '<span class="at-tl-u' + (k === 0 ? " now" : "") + (x.side ? " mob" : " ally") + (x.affix ? " elite" : "") + '" data-unit="' + x.id + '"><img src="' + img + '" alt="" width="40" height="40"><i style="width:' + (x.hp / x.maxHp * 100).toFixed(0) + '%"></i></span>';
      }).join("") + "</div>";
    } else if (w.combat) top.innerHTML = '<div class="at-zone"><b>' + (w.combat.phase === "place" ? "Placement" : w.loot && w.loot.won ? "Victoire" : "Fin du combat") + '</b><span>' + (w.combat.room ? esc(w.combat.room.name) : esc(A.ZONES[w.zone].name)) + "</span></div>";
    else top.innerHTML = '<div class="at-zone"><b>' + esc(A.ZONES[w.zone].name) + "</b><span>" + esc(A.ZONES[w.zone].sub) + "</span></div>";
    // côté : quêtes
    var side = $("[data-side]", hud), pl = myPlayer();
    if (!w.combat && pl) {
      var qs = A.QUESTS.filter(function (q) { return pl.profile.quests[q.id] != null; }).slice(0, 3);
      side.innerHTML = qs.length ? '<div class="at-qt"><b>Quêtes</b>' + qs.map(function (q) { var v = pl.profile.quests[q.id], n2 = q.n || 1; return '<p><span>' + esc(q.name) + '</span><small>' + esc(q.desc) + "</small><i><u style=\"width:" + (v / n2 * 100) + '%"></u></i><em>' + v + " / " + n2 + "</em></p>"; }).join("") + "</div>" : "";
    } else side.innerHTML = "";
    refreshBar();
  }
  function refreshBar() {
    var bar = $("[data-bar]", hud);
    if (!w) return;
    var c = w.combat;
    if (w.mode === "explore") {
      bar.className = "at-bar hint";
      bar.innerHTML = '<span>' + (matchMedia("(pointer: coarse)").matches ? "Touche une case pour marcher · touche un monstre pour l'attaquer" : "Clic : marcher · clic sur des monstres : combat · <kbd>I</kbd> sac · <kbd>J</kbd> quêtes · molette : zoom") + (duo ? " · <kbd>Tab</kbd> changer de héros" : "") + "</span>";
      return;
    }
    if (!c) { bar.innerHTML = ""; return; }
    if (c.phase === "place") {
      var waiting = locals.every(function (i) { return !w.players[i] || w.players[i].ready; });
      bar.className = "at-bar place";
      bar.innerHTML = '<span class="at-bar-t">Choisis ta case de départ (en bleu)' + (duo ? " · <kbd>Tab</kbd> change de héros" : "") + "</span>" +
        '<button class="btn at-ready" type="button" data-act="ready">' + (waiting ? "En attente…" : "Prêt ! <small>Espace</small>") + "</button>" +
        (c.room ? "" : '<button class="btn btn-ghost btn-small" type="button" data-act="flee">Fuir</button>');
      return;
    }
    if (c.phase !== "fight" || w.mode !== "combat") { bar.innerHTML = ""; return; }
    var a = A.active(c), me = activeLocal();
    var shown = me || c.units.filter(function (u) { return u.side === 0 && u.pi === focusPi; })[0];
    if (!shown) { bar.innerHTML = ""; return; }
    var spells = A.CLASSES[shown.cls].spells;
    var html = '<div class="at-papm"><span class="pa" title="Points d\'action"><b>' + shown.pa + '</b>PA</span><span class="pm" title="Points de mouvement"><b>' + shown.pm + '</b>PM</span></div><div class="at-spells">';
    spells.forEach(function (sid, i) {
      var S = A.SPELLS[sid], why = A.canCast(w, shown, sid), cd = shown.cds[sid] || 0, locked = S.ult && !shown.ult;
      html += '<button type="button" class="at-sp' + (sel && sel.sid === sid ? " on" : "") + (why || !me ? " off" : "") + (S.ult ? " ult" : "") + (locked ? " lock" : "") + '" data-spell="' + sid + '">' +
        '<img src="' + ART.spellIcon(sid, 48) + '" alt="" width="48" height="48"><kbd>' + (i + 1) + "</kbd><em>" + A.spellCost(shown, sid) + "</em>" + (cd ? "<b>" + cd + "</b>" : "") + (locked ? "<b>🔒</b>" : "") + "</button>";
    });
    html += "</div>";
    if (me) {
      var S2 = sel && A.SPELLS[sel.sid], need = S2 ? S2.minSteps || S2.steps.length : 0;
      if (S2 && S2.steps.length > 1 && sel.tg.length >= need) html += '<button class="btn btn-small at-go" type="button" data-act="confirm">Lancer <small>Entrée</small></button>';
      html += '<button class="btn at-end" type="button" data-act="end">Fin du tour <small>Espace</small></button>';
    } else html += '<span class="at-wait">' + (a ? (a.side ? "Tour de " + esc(a.name) + "…" : "Tour de " + esc(a.name)) : "") + "</span>";
    bar.className = "at-bar fight" + (me ? " mine" : "");
    bar.innerHTML = html;
    if (sel) {
      var st = A.SPELLS[sel.sid].steps[sel.tg.length];
      var hint = sel.sid === "transpo" ? (sel.tg.length ? "Choisis la case d'arrivée" : "Choisis l'allié ou le cristal à téléporter") :
        sel.sid === "danse" ? "Bond " + (sel.tg.length + 1) + " / 3 · Entrée pour lancer" :
        sel.sid === "convergence" ? (sel.tg.length ? "2ᵉ diagonale (facultatif) · Entrée pour lancer" : "Choisis une diagonale") : st ? "Choisis une cible" : "";
      bar.insertAdjacentHTML("afterbegin", '<span class="at-hint">' + esc(A.SPELLS[sel.sid].name) + " · " + hint + " · clic droit : annuler</span>");
    }
  }
  function spellTip(sid, u) {
    var S = A.SPELLS[sid], st = S.steps[0];
    var rng = st.shape === "self" ? "Soi-même" : st.shape === "knight" ? "Mouvement en L" : st.shape === "ray" ? "Diagonales" :
      (st.range[0] === st.range[1] ? st.range[0] : st.range[0] + " à " + (st.range[1] + (st.boost && u ? u.po : 0))) + " case" + (st.range[1] > 1 ? "s" : "") + (st.shape === "line" ? " en ligne" : st.shape === "diag" ? " en diagonale" : "");
    return "<strong>" + esc(S.name) + "</strong><p>" + esc(S.desc) + '</p><p class="at-tip-m"><span>' + A.spellCost(u || { powers: [] }, sid) + " PA</span><span>" + esc(rng) + "</span>" + (st.los ? "<span>Ligne de vue</span>" : "") + (S.cd ? "<span>Recharge " + S.cd + "</span>" : "") + (S.perTurn ? "<span>" + S.perTurn + "× / tour</span>" : "") + "</p>" +
      (S.ult && u && !u.ult ? '<p class="at-tip-warn">Débloqué au niveau ' + A.ULT_LEVEL + "</p>" : "") + (u && A.canCast(w, u, sid) && A.canCast(w, u, sid) !== "Pas assez de PA" ? '<p class="at-tip-warn">' + esc(A.canCast(w, u, sid)) + "</p>" : "");
  }
  function unitTip(u) {
    var name = u.side === 0 ? u.name + " · " + A.CLASSES[u.cls].name : A.MOBS[u.type].name;
    var sh = u.shield.reduce(function (s, q) { return s + q.v; }, 0);
    var html = "<strong>" + esc(name) + " <em>niv. " + u.lvl + "</em></strong>" +
      '<p class="at-tip-m"><span>❤ ' + u.hp + " / " + u.maxHp + (sh ? " (+" + sh + ")" : "") + "</span><span>" + u.maxPa + " PA</span><span>" + u.maxPm + " PM</span>" + (u.res ? "<span>" + (u.res + A.statusSum(u, "res")) + " % rés.</span>" : "") + "</p>";
    if (u.affix) html += '<p class="at-tip-gold">Élite : ' + esc(A.AFFIXES[u.affix].name) + "</p>";
    if (u.side === 1) html += "<p>" + A.MOBS[u.type].spells.map(function (s) { var M = A.MOB_SPELLS[s]; return esc(M.name) + (M.dmg ? " (" + M.dmg + ")" : M.heal ? " (soin)" : ""); }).join(" · ") + "</p>";
    if (u.side === 1 && w.combat.phase === "fight") html += '<p class="at-tip-dim">En rouge : là où il peut marcher</p>';
    return html;
  }
  function packTip(pk) {
    return "<strong>Groupe de monstres</strong>" + pk.mobs.map(function (mb) {
      return "<p>" + (mb.affix ? '<span class="at-tip-gold">★ ' + esc(A.AFFIXES[mb.affix].name) + "</span> " : "") + esc(A.MOBS[mb.type].name) + " <em>niv. " + mb.lvl + "</em></p>";
    }).join("") + '<p class="at-tip-dim">Clique pour attaquer · les élites lâchent du meilleur butin</p>';
  }
  function showTip(html, x, y) {
    tipEl.innerHTML = html; tipEl.hidden = false;
    var r = stage.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var lx = clamp(x + 16, 6, r.width - tw - 6), ly = y + 18 + th > r.height ? y - th - 12 : y + 18;
    tipEl.style.left = lx + "px"; tipEl.style.top = Math.max(6, ly) + "px";
  }
  function hideTip() { tipEl.hidden = true; }

  /* ====================== PANNEAUX ====================== */
  function show(html, cls) {
    card.className = "panel game-card at-card " + (cls || "");
    card.innerHTML = html; overlay.hidden = false;
    card.classList.remove("at-in"); void card.offsetWidth; card.classList.add("at-in");
    hideTip();
  }
  function hide() { overlay.hidden = true; panel = null; card.innerHTML = ""; }
  function closePanel() { if (panel === "loot") return; hide(); }
  function statLine(k, v) { var S = A.STATS[k]; return S.fmt.replace("{v}", v); }
  function itemHtml(it, opt) {
    opt = opt || {};
    var R = A.RARITIES[it.r];
    var stats = Object.keys(it.st).map(function (k) {
      var sp = A.STATS[k].special;
      return '<li class="' + (sp ? "sp" : "") + '">' + esc(statLine(k, it.st[k])) + "</li>";
    }).join("");
    var pw = it.power ? '<p class="at-it-pw"><b>' + esc(A.POWERS[it.power].name) + "</b> · " + esc(A.POWERS[it.power].desc) + "</p>" : "";
    var cmp = "";
    if (opt.cmp !== false && opt.pl) {
      var cur = opt.pl.profile.equip[it.slot];
      if (cur && cur.uid !== it.uid) {
        var keys = {}; Object.keys(it.st).concat(Object.keys(cur.st)).forEach(function (k) { keys[k] = 1; });
        var d = Object.keys(keys).map(function (k) { var dv = (it.st[k] || 0) - (cur.st[k] || 0); return dv ? '<span class="' + (dv > 0 ? "up" : "down") + '">' + (dv > 0 ? "+" : "") + dv + " " + A.STATS[k].short + "</span>" : ""; }).join("");
        cmp = '<p class="at-it-cmp">vs équipé : ' + (d || "<span>identique</span>") + "</p>";
      } else if (!cur) cmp = '<p class="at-it-cmp"><span class="up">Emplacement vide</span></p>';
    }
    return '<div class="at-it r' + it.r + '" style="--rc:' + R.col + '">' +
      '<div class="at-it-h"><img src="' + ART.itemIcon(it.slot, R.col, 40) + '" alt="" width="40" height="40"><div><b>' + esc(it.name) + "</b><small>" + R.name + " · " + A.SLOT_NAME[it.slot] + " · niv. " + it.lvl + "</small></div></div>" +
      "<ul>" + stats + "</ul>" + pw + cmp + (opt.actions || "") + "</div>";
  }
  function better(pl, it) { var cur = pl.profile.equip[it.slot]; return !cur || A.itemScore(it) > A.itemScore(cur); }

  // ---------- butin de fin de combat ----------
  function showLoot() {
    var L = w.loot; if (!L) return;
    panel = "loot";
    var first = lootSeen !== L.id;
    lootSeen = L.id;
    var cols = locals.filter(function (i) { return w.players[i]; }).map(function (i) {
      var pl = w.players[i], res = L.players[i] || { items: [], xp: 0, gold: 0, levels: 0, quests: [] }, st = L.stats && L.stats[i];
      var xpk = pl.profile.level >= A.CFG.maxLevel ? 1 : pl.profile.xp / A.xpNeed(pl.profile.level);
      var items = res.items.map(function (it, k) {
        var inBag = pl.profile.bag.some(function (b) { return b.uid === it.uid; }), worn = pl.profile.equip[it.slot] && pl.profile.equip[it.slot].uid === it.uid;
        var acts = worn ? '<p class="at-it-ok">✔ Équipé</p>' : inBag ? '<div class="at-it-a"><button class="btn btn-small' + (better(pl, it) ? "" : " btn-ghost") + '" type="button" data-equip="' + it.uid + '" data-pi="' + i + '">' + (better(pl, it) ? "▲ Équiper" : "Équiper") + '</button><button class="btn btn-small btn-ghost" type="button" data-sell="' + it.uid + '" data-pi="' + i + '">Vendre ' + it.value + "</button></div>" : it.sold ? '<p class="at-it-ok">Sac plein : vendu ' + it.value + " or</p>" : '<p class="at-it-ok">Vendu</p>';
        return '<div class="at-loot-i" style="--d:' + (0.35 + k * 0.28) + 's">' + (it.r >= 3 ? '<span class="at-rays"></span>' : "") + itemHtml(it, { pl: pl, actions: acts }) + "</div>";
      }).join("");
      return '<div class="at-loot-p">' + (duo || w.players.filter(Boolean).length > 1 ? '<h3><img src="' + ART.heroIcon(pl.profile.cls, 28) + '" alt="" width="28" height="28"> ' + esc(pl.name) + "</h3>" : "") +
        (L.won ? '<div class="at-gains"><span class="xp">+' + fmt(res.xp) + ' XP</span><span class="gold">+' + fmt(res.gold) + " or</span>" + (res.levels ? '<span class="lvl">Niveau ' + pl.profile.level + " !</span>" : "") + "</div>" +
          '<div class="at-xpbar"><i style="width:' + (xpk * 100).toFixed(1) + '%"></i><span>Niv. ' + pl.profile.level + " · " + fmt(pl.profile.xp) + " / " + fmt(A.xpNeed(pl.profile.level)) + " XP</span></div>" +
          (st ? '<p class="at-cstats">⚔ ' + fmt(st.dmg) + " dégâts · ✚ " + fmt(st.heal) + " soins · ☠ " + st.kills + "</p>" : "") +
          (res.quests.length ? '<p class="at-qdone">📜 Quête terminée : ' + res.quests.map(function (q) { return esc(A.QUESTS.filter(function (x) { return x.id === q; })[0].name); }).join(", ") + "</p>" : "") +
          '<div class="at-loot-grid">' + (items || '<p class="game-small">Rien cette fois…</p>') + "</div>"
          : '<p>Vos héros sont rentrés à Lumebourg pour se soigner. Rien n\'est perdu : retentez votre chance !</p>') + "</div>";
    }).join("");
    var waiting = locals.every(function (i) { return !w.players[i] || w.players[i].ready; });
    var others = w.players.some(function (p, i) { return p && !isLocal(i) && !p.ready; });
    var title = L.won ? (L.dungeonDone ? "Donjon terminé !" : L.room ? L.room.name + " : victoire !" : "Victoire !") : "Défaite";
    show('<div class="at-loot-head ' + (L.won ? "win" : "lose") + '"><h2>' + esc(title) + "</h2>" + (L.won ? "<p>Le butin tombe des monstres : à toi de choisir ce que tu gardes.</p>" : "") + "</div>" +
      '<div class="at-loot-cols">' + cols + "</div>" +
      '<div class="btn-row center"><button class="btn" type="button" data-act="lootok"' + (waiting ? " disabled" : "") + ">" +
      (waiting && others ? "En attente de ton coéquipier…" : L.dungeonNext ? "Salle suivante →" : "Continuer") + '</button><button class="btn btn-ghost btn-small" type="button" data-act="inv">🎒 Sac</button></div>',
      "at-card-loot" + (first ? "" : " no-anim"));
    if (first && L.won) {
      var best = 0; locals.forEach(function (i) { var r = L.players[i]; if (r) r.items.forEach(function (it) { best = Math.max(best, it.r); }); });
      after(0.4, function () { SFX.loot(best); });
    }
  }

  // ---------- sac / équipement ----------
  function showInv(pi) {
    if (pi != null) panelPi = pi;
    if (locals.indexOf(panelPi) < 0) panelPi = locals[0];
    var pl = w.players[panelPi]; if (!pl) return;
    panel = "inv";
    var pr = pl.profile, st = A.heroStats(pr), fighting = w.combat && w.combat.phase === "fight" && w.mode === "combat";
    var tabs = locals.length > 1 ? '<div class="at-tabs">' + locals.map(function (i) { return w.players[i] ? '<button type="button" class="' + (i === panelPi ? "on" : "") + '" data-invpi="' + i + '"><img src="' + ART.heroIcon(w.players[i].profile.cls, 24) + '" alt="" width="24" height="24"> ' + esc(w.players[i].name) + "</button>" : ""; }).join("") + "</div>" : "";
    var slots = A.SLOTS.map(function (sl) {
      var it = pr.equip[sl];
      return '<button type="button" class="at-slot' + (it ? " r" + it.r : "") + (invSel && it && invSel === it.uid ? " on" : "") + '" ' + (it ? 'data-isel="' + it.uid + '" style="--rc:' + A.RARITIES[it.r].col + '"' : "") + ">" +
        (it ? '<img src="' + ART.itemIcon(sl, A.RARITIES[it.r].col, 40) + '" alt="" width="40" height="40">' : '<span class="at-slot-e">' + A.SLOT_NAME[sl] + "</span>") + "</button>";
    }).join("");
    var bag = "";
    for (var i = 0; i < A.BAG_MAX; i++) {
      var it = pr.bag[i];
      bag += it ? '<button type="button" class="at-bagc r' + it.r + (invSel === it.uid ? " on" : "") + '" data-isel="' + it.uid + '" style="--rc:' + A.RARITIES[it.r].col + '" title="' + esc(it.name) + '"><img src="' + ART.itemIcon(it.slot, A.RARITIES[it.r].col, 36) + '" alt="" width="36" height="36">' + (it.isNew ? "<b>new</b>" : "") + (better(pl, it) ? "<i>▲</i>" : "") + (it.lock ? "<u>🔒</u>" : "") + "</button>" : '<span class="at-bagc at-bage"></span>';
    }
    var selIt = invSel ? (pr.bag.filter(function (x) { return x.uid === invSel; })[0] || A.SLOTS.map(function (s) { return pr.equip[s]; }).filter(function (x) { return x && x.uid === invSel; })[0]) : null;
    var worn = selIt && pr.equip[selIt.slot] && pr.equip[selIt.slot].uid === selIt.uid;
    var detail = selIt ? itemHtml(selIt, { pl: pl, cmp: !worn, actions: '<div class="at-it-a">' +
      (worn ? '<button class="btn btn-small btn-ghost" type="button" data-unequip="' + selIt.slot + '"' + (fighting ? " disabled" : "") + ">Retirer</button>" :
        '<button class="btn btn-small" type="button" data-equip="' + selIt.uid + '" data-pi="' + panelPi + '"' + (fighting ? " disabled" : "") + ">Équiper</button>" +
        '<button class="btn btn-small btn-ghost" type="button" data-sell="' + selIt.uid + '" data-pi="' + panelPi + '"' + (selIt.lock ? " disabled" : "") + ">Vendre " + selIt.value + " or</button>" +
        '<button class="btn btn-small btn-ghost" type="button" data-lock="' + selIt.uid + '">' + (selIt.lock ? "Déverrouiller" : "🔒") + "</button>") + "</div>" }) : '<p class="game-small">Choisis un objet pour voir ses caractéristiques. ▲ = mieux que ce que tu portes.</p>';
    var sline = function (n, v) { return "<li><span>" + n + "</span><b>" + v + "</b></li>"; };
    show('<div class="at-inv-h"><h2>Sac</h2><span class="at-gold">' + fmt(pr.gold) + ' or</span><button class="at-x" type="button" data-act="close" aria-label="Fermer">✕</button></div>' + tabs +
      '<div class="at-inv">' +
      '<div class="at-inv-l"><div class="at-doll"><img src="' + ART.heroIcon(pr.cls, 72) + '" alt="" width="72" height="72"><div><b>' + esc(pl.name) + "</b><small>" + A.CLASSES[pr.cls].name + " · niv. " + pr.level + "</small></div></div>" +
      '<div class="at-slots">' + slots + "</div>" +
      '<ul class="at-stats">' + sline("PV", st.hp) + sline("PA", st.pa) + sline("PM", st.pm) + sline("Portée", "+" + st.po) + sline("Puissance", st.pow + " %") + sline("Résistance", st.res + " %") + sline("Critique", st.crit + " %") + sline("Soins", st.heal + " %") + sline("Initiative", st.ini) + "</ul>" +
      (st.powers.length ? '<p class="at-pows">' + st.powers.map(function (p) { return "<span title=\"" + esc(A.POWERS[p].desc) + "\">✦ " + esc(A.POWERS[p].name) + "</span>"; }).join("") + "</p>" : "") + "</div>" +
      '<div class="at-inv-r"><div class="at-bag">' + bag + '</div><p class="at-bag-n">' + pr.bag.length + " / " + A.BAG_MAX + ' · <button class="text-link" type="button" data-junk="0">Vendre les communs</button> · <button class="text-link" type="button" data-junk="1">et les magiques</button></p>' +
      '<div class="at-detail">' + detail + "</div></div></div>" + (fighting ? '<p class="game-small">On ne peut pas changer d\'équipement pendant un combat.</p>' : ""), "at-card-inv");
    if (pr.bag.some(function (x) { return x.isNew; })) setTimeout(function () { sendCmd({ t: "seen" }, panelPi); }, 1200);
  }

  function showQuests() {
    var pl = myPlayer(); if (!pl) return;
    panel = "quests";
    var pr = pl.profile;
    var act = A.QUESTS.filter(function (q) { return pr.quests[q.id] != null; });
    var done = A.QUESTS.filter(function (q) { return pr.qdone[q.id]; });
    var locked = A.QUESTS.filter(function (q) { return !pr.qdone[q.id] && pr.quests[q.id] == null; });
    var row = function (q, state) {
      var v = pr.quests[q.id] || 0, n = q.n || 1, R = A.RARITIES.filter(function (r) { return r.id === q.item; })[0];
      return '<li class="at-q ' + state + '"><div><b>' + esc(q.name) + "</b><p>" + esc(q.desc) + "</p>" +
        (state === "act" ? '<i><u style="width:' + (v / n * 100) + '%"></u></i>' : "") + "</div>" +
        '<span class="at-q-r">' + (state === "done" ? "✔" : "+" + q.xp + " XP · +" + q.gold + ' or · <em style="color:' + R.col + '">objet ' + R.name.toLowerCase() + "</em>") + "</span></li>";
    };
    show('<div class="at-inv-h"><h2>Quêtes d\'Elya</h2><button class="at-x" type="button" data-act="close" aria-label="Fermer">✕</button></div>' +
      '<ul class="at-qlist">' + act.map(function (q) { return row(q, "act"); }).join("") + locked.slice(0, 2).map(function (q) { return row(q, "lock"); }).join("") + done.map(function (q) { return row(q, "done"); }).join("") + "</ul>" +
      '<p class="game-small">Les quêtes avancent toutes seules en jouant. Leur récompense tombe directement dans ton sac.</p>', "at-card-q");
  }

  function showShop() {
    var pl = myPlayer(); if (!pl) return;
    panel = "shop";
    var pr = pl.profile, price = A.chestPrice(pr);
    show('<div class="at-inv-h"><h2>Tobin le marchand</h2><span class="at-gold">' + fmt(pr.gold) + ' or</span><button class="at-x" type="button" data-act="close" aria-label="Fermer">✕</button></div>' +
      '<p>« Des coffres scellés, tout droit des ruines ! Rare garanti au minimum… ou presque. Et je rachète tout ce que tu trouves. »</p>' +
      '<div class="at-shop"><div class="at-chest' + (shopReveal ? " open" : "") + '"><span></span></div>' +
      '<button class="btn" type="button" data-act="chest"' + (pr.gold < price || pr.bag.length >= A.BAG_MAX ? " disabled" : "") + ">Ouvrir un coffre runique · " + fmt(price) + " or</button>" +
      (shopReveal ? '<div class="at-loot-i" style="--d:.2s">' + (shopReveal.r >= 3 ? '<span class="at-rays"></span>' : "") + itemHtml(shopReveal, { pl: pl, actions: pr.bag.some(function (b) { return b.uid === shopReveal.uid; }) ? '<div class="at-it-a"><button class="btn btn-small" type="button" data-equip="' + shopReveal.uid + '" data-pi="' + focusPi + '">Équiper</button></div>' : "" }) + "</div>" : "") + "</div>" +
      '<div class="btn-row center"><button class="btn btn-ghost btn-small" type="button" data-act="inv">🎒 Vendre depuis le sac</button><button class="btn btn-ghost btn-small" type="button" data-junk="0">Vendre tous les communs</button></div>', "at-card-shop");
  }

  function showSource() {
    panel = "help";
    show('<div class="at-inv-h"><h2>Source de mana</h2><button class="at-x" type="button" data-act="close" aria-label="Fermer">✕</button></div>' +
      "<p>L'eau scintille. Tes PV remontent au maximum après chaque combat — sauf dans le donjon, où il faudra tenir trois salles d'affilée.</p>" + helpList(), "at-card-q");
  }
  function helpList() {
    return '<ul class="at-help">' +
      "<li><b>Combat</b> : chaque tour tu as des <b>PA</b> (sorts) et des <b>PM</b> (cases de marche). Turquoise = où marcher, violet = où viser, jaune = zone touchée, rouge = danger.</li>" +
      "<li><b>Bastion</b> (la tour) frappe et attire en ligne droite, pose des murs et des boucliers. Une cible poussée contre un obstacle prend des dégâts.</li>" +
      "<li><b>Prisme</b> (le fou) tire en diagonale, soigne, téléporte ses alliés et pose des cristaux d'où partent ses rayons.</li>" +
      "<li><b>Voltige</b> (le cavalier) bondit en L par-dessus tout, passe derrière les ennemis et les aveugle avec sa brume.</li>" +
      "<li><b>Butin</b> : chaque monstre peut lâcher un objet aléatoire. 5 raretés, de grosses caractéristiques, parfois <b>+1 PA</b>, <b>+1 PM</b> ou <b>+Portée</b>, et des pouvoirs légendaires. Les élites (★) lâchent toujours quelque chose.</li>" +
      "<li><b>Raccourcis</b> : <kbd>1</kbd>–<kbd>5</kbd> sorts · <kbd>Espace</kbd> fin du tour · clic droit annule · <kbd>I</kbd> sac · <kbd>J</kbd> quêtes · <kbd>C</kbd> recentrer · molette zoom · glisser pour déplacer la vue.</li></ul>";
  }
  function showPause() {
    panel = "pause";
    show('<div class="at-inv-h"><h2>Pause</h2><button class="at-x" type="button" data-act="close" aria-label="Fermer">✕</button></div>' +
      '<div class="at-set"><label>Effets sonores <input type="range" min="0" max="1" step="0.05" value="' + SET.sfx + '" data-set="sfx"></label>' +
      '<label>Musique <input type="range" min="0" max="1" step="0.05" value="' + SET.music + '" data-set="music"></label>' +
      '<label><input type="checkbox" data-set="fx"' + (SET.fx === "full" ? " checked" : "") + "> Effets visuels complets (secousses, éclats)</label>" +
      '<label><input type="checkbox" data-set="grid"' + (SET.grid ? " checked" : "") + "> Quadrillage léger en exploration</label></div>" +
      helpList() +
      '<div class="btn-row center"><button class="btn" type="button" data-act="close">Reprendre</button>' +
      (w && w.combat && !w.combat.room && (!NET.on || NET.role === "host") ? '<button class="btn btn-ghost" type="button" data-act="flee">Abandonner le combat</button>' : "") +
      '<button class="btn btn-ghost" type="button" data-act="quit">Quitter vers le menu</button></div>', "at-card-pause");
  }

  /* ====================== COMMANDES ====================== */
  function sendCmd(c, pi) {
    if (!w) return false;
    if (pi == null) pi = focusPi;
    if (NET.started && NET.role === "guest") { netSend("cmd", { c: c }); return true; }
    var ok = A.cmd(w, pi, c);
    if (!ok && (c.t === "move" || c.t === "cast")) SFX.error();
    return ok;
  }
  function pickSpell(sid) {
    var u = activeLocal();
    if (!u) return;
    if (sel && sel.sid === sid) { sel = null; hudDirty = true; return; }
    var why = A.canCast(w, u, sid);
    if (why) { toast(esc(why), "warn"); SFX.error(); return; }
    var S = A.SPELLS[sid];
    if (S.steps[0].shape === "self") { sendCmd({ t: "cast", s: sid, tg: [[u.x, u.y]] }, u.pi); sel = null; hudDirty = true; return; }
    sel = { sid: sid, tg: [] };
    SFX.click(); hudDirty = true;
  }
  function confirmSpell() {
    var u = activeLocal();
    if (!u || !sel) return false;
    var S = A.SPELLS[sel.sid];
    if (sel.tg.length < (S.minSteps || S.steps.length)) return false;
    sendCmd({ t: "cast", s: sel.sid, tg: sel.tg }, u.pi);
    sel = null; hudDirty = true;
    return true;
  }
  function clickCell(x, y) {
    if (!w) return;
    audio();
    var c = w.combat;
    if (w.mode === "explore") {
      if (hoverObj && hoverObj.pack) { sendCmd({ t: "engage", id: hoverObj.pack }); cam.free = false; return; }
      if (hoverObj && hoverObj.npc) {
        var n = (A.NPCS[w.zone] || []).filter(function (q) { return q.id === hoverObj.npc; })[0];
        if (n) { pendingNpc = n; sendCmd({ t: "walk", x: n.x, y: n.y }); cam.free = false; checkNpc(); }
        return;
      }
      if (hoverObj && hoverObj.hero != null && isLocal(hoverObj.hero)) { focusPi = hoverObj.hero; hudDirty = true; return; }
      pendingNpc = null;
      if (sendCmd({ t: "walk", x: x, y: y })) {
        cam.free = false;
        if (duo) { var o = locals.filter(function (i) { return i !== focusPi && w.heroes[i]; })[0]; if (o != null) followWalk(o, x, y); }
      }
      return;
    }
    if (!c || w.mode !== "combat") return;
    if (c.phase === "place") {
      var me = c.units.filter(function (u) { return u.side === 0 && u.pi === focusPi; })[0];
      var t = A.unitAt(c, x, y);
      if (t && t.side === 0 && isLocal(t.pi) && t !== me) { focusPi = t.pi; hudDirty = true; return; }
      sendCmd({ t: "place", x: x, y: y });
      return;
    }
    var u = activeLocal();
    if (!u) return;
    if (sel) {
      var ok = A.targets(w, u, sel.sid, sel.tg).some(function (q) { return q[0] === x && q[1] === y; });
      if (!ok) { sel = null; hudDirty = true; return; }
      sel.tg.push([x, y]);
      var S = A.SPELLS[sel.sid];
      if (sel.tg.length >= S.steps.length || !A.targets(w, u, sel.sid, sel.tg).length) {
        if (sel.tg.length >= (S.minSteps || S.steps.length)) confirmSpell();
        else { sel = null; }
      }
      SFX.click(); hudDirty = true;
      return;
    }
    var r = A.reach(w, u);
    if (r[x + "," + y] > 0) sendCmd({ t: "move", x: x, y: y }, u.pi);
  }
  function followWalk(o, x, y) {
    var m = A.zoneMap(w.zone);
    var cands = [[x - 1, y], [x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y - 1], [x + 1, y + 1]];
    for (var i = 0; i < cands.length; i++) if (A.exploreWalkable(m, cands[i][0], cands[i][1]) && !A.portalAt(w.zone, cands[i][0], cands[i][1])) { A.cmd(w, o, { t: "walk", x: cands[i][0], y: cands[i][1] }); return; }
  }
  function checkNpc() {
    if (!pendingNpc || !w || w.mode !== "explore" || panel) return;
    var h = w.heroes[focusPi];
    if (!h || h.path.length) return;
    if (Math.abs(h.x - pendingNpc.x) + Math.abs(h.y - pendingNpc.y) <= 1) {
      var n = pendingNpc; pendingNpc = null;
      SFX.click();
      if (n.role === "quests") showQuests(); else if (n.role === "shop") { shopReveal = null; showShop(); } else showSource();
    }
  }

  // ---------- souris / doigt ----------
  function evPos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pickObj(sx, sy) {
    if (!w) return null;
    var best = null, bd = -1e9;
    var test = function (gx, gy, h, o) {
      var p = iso(gx, gy), s = toScreen(p.x, p.y);
      if (Math.abs(sx - s.x) < 24 * cam.z && sy < s.y + 8 * cam.z && sy > s.y - h * cam.z && gx + gy > bd) { bd = gx + gy; best = o; }
    };
    if (w.combat) w.combat.units.forEach(function (u) { if (u.alive) { var v = vis["u" + u.id]; test(v ? v.gx : u.x, v ? v.gy : u.y, u.boss ? 150 : 92, { unit: u.id, x: u.x, y: u.y }); } });
    else {
      w.packs.forEach(function (pk) { if (!pk.dead) { var v = vis["p" + pk.id]; if (v) test(v.gx, v.gy, 60, { pack: pk.id, x: pk.x, y: pk.y }); } });
      (A.NPCS[w.zone] || []).forEach(function (n) { test(n.x, n.y, n.obj ? 60 : 80, { npc: n.id, x: n.x, y: n.y }); });
      w.heroes.forEach(function (h, i) { if (h && duo) { var v = vis["h" + i]; if (v) test(v.gx, v.gy, 70, { hero: i, x: h.x, y: h.y }); } });
    }
    return best;
  }
  canvas.addEventListener("pointerdown", function (e) {
    audio();
    var p = evPos(e);
    mouse.down = { x: p.x, y: p.y, cx: cam.x, cy: cam.y, id: e.pointerId, moved: false, btn: e.button };
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = evPos(e);
    mouse.x = p.x; mouse.y = p.y; mouse.in = true;
    if (mouse.down && mouse.down.id === e.pointerId) {
      var dx = p.x - mouse.down.x, dy = p.y - mouse.down.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) mouse.down.moved = true;
      if (mouse.down.moved) { cam.free = true; cam.x = mouse.down.cx - dx / cam.z; cam.y = mouse.down.cy - dy / cam.z; }
    }
    updateHover();
  });
  canvas.addEventListener("pointerup", function (e) {
    var d = mouse.down; mouse.down = null;
    if (!d || d.moved) return;
    if (d.btn === 2) { if (sel) { sel = null; hudDirty = true; } return; }
    var p = evPos(e);
    mouse.x = p.x; mouse.y = p.y; updateHover();
    if (panel || screen !== "game") return;
    var tgt = hoverObj && w && w.combat ? { x: hoverObj.x, y: hoverObj.y } : hover;
    if (tgt) clickCell(tgt.x, tgt.y);
  });
  canvas.addEventListener("pointerleave", function () { mouse.in = false; hover = null; hoverObj = null; hideTip(); });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    cam.zu = clamp(cam.zu * (e.deltaY > 0 ? 0.9 : 1.1), 0.55, 2);
  }, { passive: false });
  function updateHover() {
    if (!w || screen !== "game") return;
    hoverObj = mouse.in ? pickObj(mouse.x, mouse.y) : null;
    hover = mouse.in ? (hoverObj && w.combat ? { x: hoverObj.x, y: hoverObj.y } : cellAt(mouse.x, mouse.y)) : null;
    if (sel && w.combat && hover) {
      // en visant, on vise la case (les unités ne cachent pas leurs voisines)
      var cc = cellAt(mouse.x, mouse.y), u = activeLocal();
      if (u && A.targets(w, u, sel.sid, sel.tg).some(function (q) { return q[0] === cc.x && q[1] === cc.y; })) { hover = cc; }
    }
    if (panel) { hideTip(); return; }
    if (hoverObj && hoverObj.unit) { var un = A.uById(w.combat, hoverObj.unit); if (un) showTip(unitTip(un), mouse.x, mouse.y); }
    else if (hoverObj && hoverObj.pack) { var pk = w.packs.filter(function (q) { return q.id === hoverObj.pack; })[0]; if (pk) showTip(packTip(pk), mouse.x, mouse.y); }
    else if (hoverObj && hoverObj.npc) { var n = A.NPCS[w.zone].filter(function (q) { return q.id === hoverObj.npc; })[0]; showTip("<strong>" + esc(n.name) + "</strong><p>" + (n.role === "quests" ? "Quêtes et récompenses" : n.role === "shop" ? "Coffres runiques · rachète ton butin" : "Conseils et rappels") + "</p>", mouse.x, mouse.y); }
    else hideTip();
    canvas.style.cursor = hoverObj && (hoverObj.pack || hoverObj.npc) ? "pointer" : sel ? "crosshair" : "default";
  }

  // ---------- boutons du HUD et des panneaux ----------
  hud.addEventListener("click", function (e) {
    audio();
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.spell) { pickSpell(b.dataset.spell); return; }
    if (b.dataset.focus != null) { var fi = +b.dataset.focus; if (isLocal(fi)) { focusPi = fi; hudDirty = true; cam.free = false; } return; }
    act(b.dataset.act);
  });
  hud.addEventListener("pointerover", function (e) {
    var b = e.target.closest("[data-spell]");
    if (b) { var u = activeLocal() || (w && w.combat && w.combat.units.filter(function (x) { return x.side === 0 && x.pi === focusPi; })[0]); var r = b.getBoundingClientRect(), sr = stage.getBoundingClientRect(); showTip(spellTip(b.dataset.spell, u), r.left - sr.left, r.top - sr.top - 150); return; }
    var t = e.target.closest("[data-unit]");
    if (t && w && w.combat) { var un = A.uById(w.combat, +t.dataset.unit); var r2 = t.getBoundingClientRect(), sr2 = stage.getBoundingClientRect(); if (un) showTip(unitTip(un), r2.left - sr2.left, r2.bottom - sr2.top); }
  });
  hud.addEventListener("pointerout", function (e) { if (e.target.closest("[data-spell],[data-unit]")) hideTip(); });
  var tipTimer = 0;
  stage.addEventListener("pointerup", function (e) { if (e.pointerType === "touch") { clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 1800); } });
  function act(a) {
    switch (a) {
      case "inv": invSel = null; showInv(focusPi); break;
      case "quests": showQuests(); break;
      case "mute": SET.mute = !SET.mute; saveSet(); applyVolume(); $("[data-act=mute]", hud).textContent = SET.mute ? "🔇" : "🔊"; break;
      case "pause": showPause(); break;
      case "close": closePanel(); if (w && w.mode === "loot") showLoot(); break;
      case "ready": locals.forEach(function (i) { if (w.players[i] && !w.players[i].ready) sendCmd({ t: "ready" }, i); }); SFX.click(); break;
      case "flee": hide(); sendCmd({ t: "flee" }); break;
      case "end": sel = null; var u = activeLocal(); if (u) sendCmd({ t: "end" }, u.pi); break;
      case "confirm": confirmSpell(); break;
      case "lootok": locals.forEach(function (i) { if (w.players[i] && !w.players[i].ready) sendCmd({ t: "lootok" }, i); }); SFX.click(); break;
      case "chest": sendCmd({ t: "chest" }); break;
      case "quit": quitToMenu(); break;
    }
  }
  card.addEventListener("click", function (e) {
    audio();
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.equip) { var pi = +b.dataset.pi; sendCmd({ t: "equip", uid: +b.dataset.equip }, pi); invSel = null; refreshPanelSoon(); return; }
    if (b.dataset.sell) { sendCmd({ t: "sell", uid: +b.dataset.sell }, +b.dataset.pi); invSel = null; refreshPanelSoon(); return; }
    if (b.dataset.unequip) { sendCmd({ t: "unequip", slot: b.dataset.unequip }, panelPi); invSel = null; refreshPanelSoon(); return; }
    if (b.dataset.lock) { sendCmd({ t: "lock", uid: +b.dataset.lock }, panelPi); refreshPanelSoon(); return; }
    if (b.dataset.junk != null) { sendCmd({ t: "junk", r: +b.dataset.junk }, panel === "inv" ? panelPi : focusPi); refreshPanelSoon(); return; }
    if (b.dataset.isel) { invSel = +b.dataset.isel; SFX.click(); showInv(); return; }
    if (b.dataset.invpi != null) { invSel = null; showInv(+b.dataset.invpi); return; }
    if (b.dataset.menu) { menuAct(b.dataset.menu, b); return; }
    if (b.dataset.pick) { if (menuStep === "duo2") menuSel2 = b.dataset.pick; else menuSel = b.dataset.pick; SFX.click(); showMenu(); return; }
    if (b.dataset.act) act(b.dataset.act);
  });
  card.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.set === "sfx" || t.dataset.set === "music") { SET[t.dataset.set] = +t.value; saveSet(); applyVolume(); }
    if (t.dataset.set === "fx") { SET.fx = t.checked ? "full" : "reduced"; saveSet(); }
    if (t.dataset.set === "grid") { SET.grid = t.checked; saveSet(); }
    if (t.dataset.name != null) { SAVE.name = t.value.slice(0, 14); persist(); }
  });
  var panelTimer = 0;
  function refreshPanelSoon() { clearTimeout(panelTimer); panelTimer = setTimeout(refreshPanel, NET.started && NET.role === "guest" ? 220 : 20); }
  function refreshPanel() {
    if (!w || !panel) return;
    if (panel === "inv") showInv(); else if (panel === "loot") showLoot(); else if (panel === "shop") showShop(); else if (panel === "quests") showQuests();
  }

  // ---------- clavier ----------
  var keys = {};
  window.addEventListener("keydown", function (e) {
    if (screen !== "game" || !w) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (!stage.contains(document.activeElement) && document.activeElement !== document.body && document.activeElement !== canvas) return;
    var k = e.key;
    keys[k.toLowerCase()] = true;
    if (k === "Escape") { if (sel) { sel = null; hudDirty = true; } else if (panel && panel !== "loot") closePanel(); else if (!panel) showPause(); e.preventDefault(); return; }
    if (panel === "loot" && (k === "Enter" || k === " ")) { act("lootok"); e.preventDefault(); return; }
    if (panel) { if (k === "i" || k === "I") { if (panel === "inv") closePanel(); } if (k === "j" || k === "J") { if (panel === "quests") closePanel(); } return; }
    if (k >= "1" && k <= "5") { var u = activeLocal(); if (u) pickSpell(A.CLASSES[u.cls].spells[+k - 1]); e.preventDefault(); return; }
    if (k === " " || k === "Enter") {
      e.preventDefault();
      if (w.combat && w.combat.phase === "place") { act("ready"); return; }
      if (sel && confirmSpell()) return;
      if (k === " " && activeLocal()) act("end");
      return;
    }
    if (k === "i" || k === "I") { act("inv"); return; }
    if (k === "j" || k === "J") { act("quests"); return; }
    if (k === "c" || k === "C") { cam.free = false; cam.zu = 1; return; }
    if (k === "Tab") { e.preventDefault(); if (duo) { focusPi = focusPi === locals[0] ? locals[1] : locals[0]; hudDirty = true; cam.free = false; } return; }
  });
  window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
  function panKeys(dt) {
    if (panel || screen !== "game") return;
    var dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.q || keys.a ? 1 : 0);
    var dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.z || keys.w ? 1 : 0);
    if (dx || dy) { cam.free = true; cam.x += dx * dt * 600 / cam.z; cam.y += dy * dt * 600 / cam.z; }
  }

  /* ====================== EN LIGNE ====================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NET = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, roster: [], status: "", err: "",
    started: false, out: [], acc: 0, otherId: null, guest: null, sentRev: {}, lastSnapRev: -1, profiles: {} };
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 30 } } });
    return NET.client;
  }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; return s; }
  function myName() { return (SAVE.name || "").trim() || A.CLASSES[menuSel].name; }
  function netJoin(code, asHost) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showOnline(); return; }
    netLeave();
    NET.on = true; NET.role = asHost ? "host" : "guest"; NET.code = code; NET.status = "connexion"; NET.err = ""; NET.started = false; NET.roster = []; NET.guest = null; NET.ts = Date.now();
    var ch = cl.channel("at-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["hello", "start", "s", "cmd", "bye"].forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { if (window.console) console.error(err); } }); });
    if (window.Party && window.Party.emoteChannel) window.Party.emoteChannel(ch, myName);   // émotes (bouton 😀 / touche T)
    ch.subscribe(function (status) {
      NET.status = status;
      if (status === "SUBSCRIBED") { trackMe(); if (NET.role === "guest") sayHello(); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      if (screen === "menu" && menuStep === "online") showOnline();
    });
    NET.ch = ch;
    if (history.replaceState) history.replaceState(null, "", "#at=" + code);
    showOnline();
  }
  function netLeave() {
    if (NET.ch && window.Party && window.Party.emoteChannelOff) window.Party.emoteChannelOff();
    if (NET.ch) { try { netSend("bye", { id: NET.id }); NET.ch.untrack(); } catch (e) {} try { NET.client.removeChannel(NET.ch); } catch (e) {} }
    NET.ch = null; NET.on = false; NET.role = null; NET.started = false; NET.roster = []; NET.code = null; NET.guest = null; NET.sentRev = {}; NET.profiles = {};
  }
  function trackMe() { if (NET.ch) NET.ch.track({ id: NET.id, name: myName(), host: NET.role === "host", ingame: NET.started, ts: NET.ts, v: VERSION, cls: menuSel, lvl: SAVE.profiles[menuSel].level }); }
  function sayHello() { netSend("hello", { id: NET.id, name: myName(), profile: SAVE.profiles[menuSel], v: VERSION }); }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    NET.roster = list;
    if (NET.role === "guest" && !NET.started) {
      var idx = list.map(function (x) { return x.id; }).indexOf(NET.id);
      if (idx >= 2) { NET.err = "Salon plein (2 joueurs max)."; netLeave(); showOnline(); return; }
      var host = list.filter(function (x) { return x.host; })[0];
      if (host && host.v !== VERSION) NET.err = "Versions différentes (" + host.v + " / " + VERSION + ") : rechargez la page tous les deux.";
      sayHello();
    }
    if (NET.started && NET.otherId && !list.some(function (x) { return x.id === NET.otherId; })) partnerLeft();
    if (screen === "menu" && menuStep === "online") showOnline();
  }
  function partnerLeft() {
    if (!NET.started) return;
    if (NET.role === "host") {
      toast("Ton coéquipier a quitté la partie. Tu continues seul.", "warn");
      if (w && w.players[1]) A.removePlayer(w, 1);
      NET.otherId = null; NET.started = false; NET.guest = null;
      if (panel === "loot") refreshPanel();
    } else {
      NET.started = false;
      quitToMenu("L'hôte a quitté la partie. Ta progression est sauvegardée.");
    }
  }
  function hostStart() {
    if (NET.role !== "host" || !NET.guest) return;
    var other = NET.roster.filter(function (x) { return x.id === NET.guest.id; })[0];
    if (!other) return;
    var gp = A.fixProfile(JSON.parse(JSON.stringify(NET.guest.profile)));
    if (!gp) return;
    startGame([{ name: myName(), profile: profileFor(menuSel) }, { name: String(NET.guest.name || "Invité").slice(0, 14), profile: gp }], [0], false);
    NET.started = true; NET.otherId = NET.guest.id; NET.sentRev = {}; NET.lastSnapRev = -1; NET.acc = 1;
    trackMe();
    netSend("start", { host: NET.id, guest: NET.guest.id, v: VERSION });
  }
  function snapshot() {
    var o = {}, pr = {};
    for (var k in w) if (k !== "events" && k !== "players") o[k] = w[k];
    o.players = w.players.map(function (p, i) {
      if (!p) return null;
      if (NET.sentRev[i] !== p.profile.rev) { pr[i] = p.profile; NET.sentRev[i] = p.profile.rev; }
      return { name: p.name, ready: p.ready };
    });
    var ev = NET.out; NET.out = [];
    return { w: o, pr: pr, ev: ev };
  }
  function netTick(dt) {
    if (!NET.started || NET.role !== "host" || !w) return;
    NET.acc += dt;
    if (NET.acc < 0.08) return;
    if (w.rev === NET.lastSnapRev && !NET.out.length && NET.acc < 2) return;
    NET.acc = 0; NET.lastSnapRev = w.rev;
    netSend("s", snapshot());
  }
  function applySnap(d) {
    var nw = d.w;
    nw.events = [];
    nw.players = nw.players.map(function (p, i) {
      if (!p) return null;
      if (d.pr && d.pr[i]) NET.profiles[i] = d.pr[i];
      return { name: p.name, ready: p.ready, profile: NET.profiles[i] || A.newProfile("bastion") };
    });
    var prevMode = w ? w.mode : null, first = !w;
    w = nw;
    if (first) { screen = "game"; hide(); hud.hidden = false; snapCam(); fitZoom(); }
    handleEvents(d.ev || []);
    // ma progression : je la garde chez moi
    if (d.pr && d.pr[1]) { SAVE.profiles[d.pr[1].cls] = JSON.parse(JSON.stringify(d.pr[1])); persist(); }
    hudDirty = true;
    afterWorldChange(prevMode);
  }
  function onNet(ev, d) {
    if (!d) return;
    if (ev === "hello" && NET.role === "host" && !NET.started) { NET.guest = d; if (screen === "menu" && menuStep === "online") showOnline(); return; }
    if (ev === "start" && NET.role === "guest" && d.guest === NET.id) { NET.started = true; NET.otherId = d.host; w = null; locals = [1]; duo = false; focusPi = 1; vis = {}; prevModeSeen = null; NET.profiles = {}; trackMe(); show('<h2>Connexion à la partie…</h2><p class="game-small">Le monde arrive.</p>', "at-card-s"); return; }
    if (ev === "bye") { if (NET.started && d.id === NET.otherId) partnerLeft(); return; }
    if (!NET.started) return;
    if (ev === "s" && NET.role === "guest") { applySnap(d); return; }
    if (ev === "cmd" && NET.role === "host" && w && d.c) { A.cmd(w, 1, d.c); return; }
  }

  /* ====================== PARTIE ====================== */
  function startGame(players, loc, isDuo) {
    w = A.createWorld({ players: players });
    locals = loc; duo = !!isDuo; focusPi = loc[0];
    w.events = [];
    vis = {}; sel = null; panel = null; savedRev = {};
    screen = "game"; hide(); hud.hidden = false;
    lastRev = -1; hudDirty = true;
    fitZoom(); snapCam();
    banner(A.ZONES.village.name, "Le village des apprentis", "zone");
    if (!load("at-tuto", null)) {
      store("at-tuto", "1");
      setTimeout(function () { toast("👋 Bienvenue ! Va voir <b>Elya</b> (le « ! » doré) pour tes premières quêtes, puis sors par l'est vers la Prairie.", "gold"); }, 900);
    }
  }
  function quitToMenu(msg) {
    if (NET.on) netLeave();
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    saveLocalProfiles();
    w = null; screen = "menu"; hud.hidden = true; panel = null; sel = null;
    menuStep = "main";
    showMenu(msg);
  }
  var prevModeSeen = null;
  function afterWorldChange(prevMode) {
    if (!w) return;
    if (w.mode !== prevModeSeen) {
      if (w.mode === "loot") { setTimeout(function () { if (w && w.mode === "loot") showLoot(); }, 1200); }
      if (prevModeSeen === "loot" && panel === "loot") hide();
      if (w.mode === "combat" || prevModeSeen === "combat" || prevModeSeen === "loot") fitZoom();
      prevModeSeen = w.mode;
    } else if (w.mode === "loot" && panel === "loot") refreshPanelSoon();
  }

  /* ====================== MENU ====================== */
  function heroCard(cls, selected, taken) {
    var C = A.CLASSES[cls], pr = SAVE.profiles[cls], st = A.heroStats(pr);
    return '<button type="button" class="at-hero' + (selected ? " on" : "") + (taken ? " taken" : "") + '" data-pick="' + cls + '"' + (taken ? " disabled" : "") + ">" +
      '<span class="at-hero-art" style="--hc:' + ART.HERO_PAL[cls].main + '"><img src="' + ART.heroIcon(cls, 96) + '" alt="" width="96" height="96"></span>' +
      "<b>" + C.name + '</b><em>' + C.role + "</em><small>Niv. " + pr.level + " · " + st.hp + " PV · " + st.pa + " PA · " + st.pm + " PM</small>" +
      '<span class="at-hero-sp">' + C.spells.map(function (s) { return '<img src="' + ART.spellIcon(s, 26) + '" alt="" width="26" height="26" title="' + esc(A.SPELLS[s].name) + '">'; }).join("") + "</span>" +
      '<span class="at-hero-d">' + esc(C.desc) + "</span></button>";
  }
  function showMenu(msg) {
    screen = "menu"; panel = null; hud.hidden = true;
    if (menuStep === "duo2") {
      if (menuSel2 === menuSel) menuSel2 = A.CLASS_IDS.filter(function (c) { return c !== menuSel; })[0];
      show('<div class="at-logo"><span>Joueur 2</span><h2>Choisis le second héros</h2></div>' +
        '<div class="at-heroes">' + A.CLASS_IDS.map(function (c) { return heroCard(c, c === menuSel2, c === menuSel); }).join("") + "</div>" +
        '<div class="btn-row center"><button class="btn" type="button" data-menu="duogo">▶ Partir à deux</button><button class="btn btn-ghost" type="button" data-menu="back">Retour</button></div>' +
        '<p class="game-small">Même écran : chacun joue son tour à la souris. <kbd>Tab</kbd> change de héros en exploration.</p>', "at-card-menu");
      return;
    }
    if (menuStep === "online") { showOnline(); return; }
    show('<div class="at-logo"><span>RPG tactique coop</span><h2>Arcane Tactics</h2></div>' +
      (msg ? '<p class="at-err">' + esc(msg) + "</p>" : "") +
      '<div class="at-heroes">' + A.CLASS_IDS.map(function (c) { return heroCard(c, c === menuSel); }).join("") + "</div>" +
      '<label class="at-name">Ton nom <input type="text" maxlength="14" placeholder="' + esc(A.CLASSES[menuSel].name) + '" value="' + esc(SAVE.name || "") + '" data-name></label>' +
      '<div class="btn-row center"><button class="btn" type="button" data-menu="solo">▶ Jouer seul</button>' +
      '<button class="btn btn-alt" type="button" data-menu="duo">👥 Duo même écran</button>' +
      '<button class="btn btn-alt" type="button" data-menu="online">🌐 Coop en ligne</button></div>' +
      '<p class="game-small">Chaque héros garde sa propre progression (niveau, butin, quêtes) dans ce navigateur. v' + VERSION + "</p>", "at-card-menu");
  }
  function showOnline() {
    if (screen !== "menu") return;
    menuStep = "online";
    var body;
    if (!NET.on) {
      body = '<p>Joue à deux en ligne : l\'un crée un salon, l\'autre entre le code (ou ouvre le lien).</p>' +
        '<div class="btn-row center"><button class="btn" type="button" data-menu="host">Créer un salon</button></div>' +
        '<div class="at-join"><input type="text" maxlength="4" placeholder="CODE" data-code aria-label="Code du salon"><button class="btn btn-alt" type="button" data-menu="join">Rejoindre</button></div>';
    } else {
      var link = location.origin + location.pathname + "#at=" + NET.code;
      var roster = NET.roster.map(function (p) { return '<li><img src="' + ART.heroIcon(p.cls || "bastion", 28) + '" alt="" width="28" height="28"> <b>' + esc(p.name) + "</b> " + (A.CLASSES[p.cls] ? A.CLASSES[p.cls].name : "") + " niv. " + (p.lvl || 1) + (p.host ? " <em>hôte</em>" : "") + (p.id === NET.id ? " <em>toi</em>" : "") + "</li>"; }).join("");
      var canStart = NET.role === "host" && NET.roster.length >= 2 && NET.guest;
      body = '<p class="at-code">Salon <b>' + esc(NET.code) + '</b></p><p class="game-small">Lien à envoyer : <input type="text" readonly value="' + esc(link) + '" class="at-link" onclick="this.select()"></p>' +
        '<ul class="at-roster">' + (roster || "<li>Connexion…</li>") + "</ul>" +
        (NET.role === "host" ? '<div class="btn-row center"><button class="btn" type="button" data-menu="start"' + (canStart ? "" : " disabled") + ">" + (canStart ? "▶ Lancer la partie" : "En attente d'un joueur…") + "</button></div>" : '<p>En attente que l\'hôte lance la partie…</p>');
    }
    show('<div class="at-logo"><span>Coop en ligne</span><h2>Salon</h2></div>' + (NET.err ? '<p class="at-err">' + esc(NET.err) + "</p>" : "") + body +
      '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-menu="back">Retour</button></div>' +
      '<p class="game-small">Tu joues ' + esc(A.CLASSES[menuSel].name) + " (niv. " + SAVE.profiles[menuSel].level + "). Ton butin et ton niveau restent chez toi.</p>", "at-card-menu");
  }
  function menuAct(a, b) {
    audio(); SFX.click();
    SAVE.last = menuSel; SAVE.last2 = menuSel2; persist();
    switch (a) {
      case "solo": startGame([{ name: myName(), profile: profileFor(menuSel) }], [0], false); break;
      case "duo": menuStep = "duo2"; showMenu(); break;
      case "duogo": startGame([{ name: A.CLASSES[menuSel].name, profile: profileFor(menuSel) }, { name: A.CLASSES[menuSel2].name, profile: profileFor(menuSel2) }], [0, 1], true); break;
      case "online": menuStep = "online"; showOnline(); break;
      case "host": netJoin(newCode(), true); break;
      case "join": { var inp = card.querySelector("[data-code]"), code = (inp ? inp.value : "").toUpperCase().replace(/[^A-Z]/g, ""); if (code.length === 4) netJoin(code, false); else { NET.err = "Le code fait 4 lettres."; showOnline(); } break; }
      case "start": hostStart(); break;
      case "back": if (NET.on) netLeave(); NET.err = ""; menuStep = "main"; if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); showMenu(); break;
    }
  }

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
  window.addEventListener("beforeunload", function () { saveLocalProfiles(); if (NET.on) netLeave(); });

  /* ====================== BOUCLE ====================== */
  var last = performance.now();
  function loop(now) {
    var rdt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    clock += rdt;
    var dt = rdt;
    if (hitstop > 0) { hitstop -= rdt; dt = rdt * 0.15; }
    if (screen === "game" && w) {
      var host = !(NET.started && NET.role === "guest");
      if (host) {
        var prevMode = w.mode;
        A.step(w, dt);
        if (w.events.length) {
          var evs = w.events; w.events = [];
          handleEvents(evs);
          if (NET.started) NET.out = NET.out.concat(evs);
        }
        if (w.rev !== lastRev) { lastRev = w.rev; hudDirty = true; afterWorldChange(prevMode); }
        netTick(rdt);
        saveLocalProfiles();
      }
      checkNpc();
      panKeys(rdt);
      updateVis(dt);
      if (hudDirty) refreshHud();
      musicTick(rdt);
    }
    updateFx(dt);
    updateCam(rdt);
    render();
    requestAnimationFrame(loop);
  }

  // outils de test dans la console : AT_DEBUG.world(), .level(5), .gold(999), .loot(4), .zone("bois")
  window.AT_DEBUG = {
    version: VERSION,
    world: function () { return w; },
    screenOf: function (x, y) { var p = iso(x, y), q = toScreen(p.x, p.y), r = canvas.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; },
    level: function (n, pi) { var p = w.players[pi || 0].profile; p.level = n; p.xp = 0; p.rev++; w.rev++; },
    gold: function (n) { w.players[0].profile.gold += n; w.players[0].profile.rev++; w.rev++; },
    loot: function (r, pi) { var p = w.players[pi || 0].profile; var it = A.makeItem(p, p.level, r == null ? 4 : r); p.bag.push(it); p.rev++; w.rev++; return it; },
    zone: function (z) { w.zone = z; vis = {}; A.cmd(w, 0, { t: "walk", x: 1, y: 1 }); },
    win: function () { if (w.combat) { w.combat.units.forEach(function (u) { if (u.side === 1) { u.alive = false; u.hp = 0; } }); if (!w.combat.defeated) w.combat.defeated = [{ type: "glorbe", lvl: 3, affix: "geant" }]; A.checkEnd(w); } },
  };

  // lien d'invitation : #at=CODE
  resize();
  var hm = /#at=([A-Z]{4})/i.exec(location.hash);
  if (hm) { menuStep = "online"; screen = "menu"; netJoin(hm[1].toUpperCase(), false); }
  else showMenu();
  requestAnimationFrame(loop);
})();
