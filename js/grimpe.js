/* =========================================================================
   Grimpe-Chêne : jeu de grimpe façon Jump King (solo), direction artistique
   « console 8 bits de 1985 » : palette NES, aplats, tramage 2 px, contours noirs,
   pas d'ombres floues, polices bitmap.
   Physique : js/grimpe-core.js (partagée avec tools/grimpe-check.js qui prouve
   que la tour est franchissable). Niveau : js/grimpe-data.js (généré par
   tools/grimpe-gen.js : 7 zones). Rendu : canvas 320 × 240, un écran à la fois.
   ?debug dans l'URL expose window.GRIMPE_DEBUG.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-gr]");
  var C = window.GrimpeCore, DATA = window.GRIMPE_LEVEL;
  if (!root || !C || !DATA) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var SAVE_KEY = "grimpe-save-v2", BEST_KEY = "grimpe-best-v2", SND_KEY = "grimpe-sound-v1", MUS_KEY = "grimpe-music-v1", CRT_KEY = "grimpe-crt-v1";
  var TS = C.TS, SW = C.COLS * TS, SH = C.SROWS * TS, METERS_PER_TILE = 0.5;
  var L = C.createLevel(DATA), ZONES = DATA.zones || [{ id: "racines", name: "Grimpe-Chêne", a0: 0, a1: 1 }];
  var canvas = $("[data-gr-canvas]"), ctx = canvas.getContext("2d");
  canvas.width = SW; canvas.height = SH;
  var FONT = '8px "Press Start 2P", ui-monospace, monospace';

  /* ---------- état ---------- */
  var S = { mode: "menu", p: null, jumps: 0, falls: 0, time: 0, scr: 0, msg: "", msgT: 0, shake: 0, t: 0, lastSave: 0,
            camY: 0, freeze: 0, flash: 0, flashCol: "#FCFCFC", squat: 0, zoneId: "", zoneIdx: 0, banner: null, bolt: 0, boltT: 4, confetti: 0, trailT: 0, windT: 0, lastGround: false };
  var best = (function () { try { return JSON.parse(store(BEST_KEY)) || {}; } catch (e) { return {}; } })();
  var keys = { left: {}, right: {}, jump: {} };
  function any(o) { for (var k in o) if (o[k]) return true; return false; }
  function heightM(p) { return Math.max(0, Math.round((L.startY - p.minY) / TS * METERS_PER_TILE * 10) / 10); }
  function standM(p) { return Math.max(0, Math.round((L.startY - p.y) / TS * METERS_PER_TILE)); }
  var TOTAL_M = Math.round((L.startY - (L.goal ? L.goal.y * TS : 0)) / TS * METERS_PER_TILE);
  var WORLD_H = L.h * TS;
  function altAtPx(wy) { return Math.max(0, Math.min(1, 1 - wy / WORLD_H)); }
  function zoneIdxAt(alt) { for (var i = 0; i < ZONES.length; i++) if (alt < ZONES[i].a1) return i; return ZONES.length - 1; }

  /* ---------- sons & musique (puces carrées / triangle, façon APU) ---------- */
  var actx = null, soundOn = store(SND_KEY) !== "0", musicOn = store(MUS_KEY) !== "0";
  function audio() {
    if (!soundOn && !musicOn) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(f0, f1, dur, type, vol, delay, force) {
    if (!soundOn && !force) return;
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, delay, hp) {
    if (!soundOn) return;
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = a.createBufferSource(), g = a.createGain(), t = a.currentTime + (delay || 0);
    src.buffer = buf; g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (hp) { var f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; src.connect(f); f.connect(g); } else src.connect(g);
    g.connect(a.destination); src.start(t);
  }
  var SND = {
    jump: function (c) { tone(260 + 260 * c, 520 + 500 * c, 0.16, "square", 0.05); if (c > 0.8) tone(900, 1500, 0.1, "square", 0.025, 0.05); },
    land: function () { tone(150, 70, 0.07, "triangle", 0.08); noise(0.05, 0.03, 0, 2000); },
    bump: function () { tone(210, 150, 0.06, "square", 0.04); },
    bonk: function () { tone(120, 80, 0.1, "square", 0.06); noise(0.08, 0.04, 0, 900); },
    crash: function () { tone(180, 40, 0.5, "sawtooth", 0.09); tone(90, 40, 0.5, "square", 0.06); noise(0.35, 0.09, 0, 300); },
    charge: function (c) { tone(180 + 400 * c, 180 + 400 * c, 0.04, "triangle", 0.025); },
    full: function () { tone(1200, 1200, 0.05, "square", 0.03); tone(1600, 1600, 0.06, "square", 0.03, 0.05); },
    fall: function () { tone(500, 120, 0.5, "sine", 0.05); },
    thunder: function () { noise(0.9, 0.08, 0.08, 120); tone(70, 30, 0.8, "sawtooth", 0.04, 0.08); },
    zone: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, f, 0.12, "square", 0.04, i * 0.08); }); },
    win: function () { [523, 659, 784, 1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, f, 0.22, "square", 0.06, i * 0.1); tone(f / 2, f / 2, 0.22, "triangle", 0.05, i * 0.1); }); },
    screen: function () { tone(440, 660, 0.08, "triangle", 0.04); },
  };
  // musique : une petite boucle générative par zone (gamme, tempo et timbre propres)
  var ZM = {
    racines: { r: 45, sc: [0, 3, 5, 7, 10], bpm: 76, lead: "triangle" }, tronc: { r: 43, sc: [0, 3, 7, 8, 10], bpm: 84, lead: "square" },
    canopee: { r: 48, sc: [0, 2, 4, 7, 9], bpm: 96, lead: "square" }, orage: { r: 41, sc: [0, 1, 5, 7, 8], bpm: 112, lead: "square" },
    glace: { r: 50, sc: [0, 2, 4, 6, 7, 11], bpm: 88, lead: "triangle" }, nuages: { r: 52, sc: [0, 2, 4, 7, 9, 11], bpm: 100, lead: "square" },
    sommet: { r: 53, sc: [0, 4, 7, 11, 12], bpm: 124, lead: "square" },
  };
  var MU = { step: 0, next: 0 };
  function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function musicTick() {
    if (!musicOn || S.mode !== "play") { MU.next = 0; return; }
    var a = audio(); if (!a) return;
    var z = ZM[S.zoneId] || ZM.racines, sp = 60 / z.bpm / 2;
    if (MU.next < a.currentTime) MU.next = a.currentTime + 0.05;
    while (MU.next < a.currentTime + 0.35) {
      var s = MU.step++, bar = s >> 4, st = s & 15, dl = MU.next - a.currentTime;
      if (st % 4 === 0) tone(midiHz(z.r - 12 + ((bar & 1) && st === 8 ? 7 : 0)), 0, sp * 3.2, "triangle", 0.03, dl, true);
      if (hash(bar % 6, st + z.r) > 0.4) {
        var deg = z.sc[Math.floor(hash(bar % 6 + 3, st * 3 + z.r) * z.sc.length)], oct = hash(st, bar % 6) > 0.7 ? 12 : 0;
        tone(midiHz(z.r + 12 + deg + oct), 0, sp * 1.6, z.lead, 0.012, dl, true);
      }
      MU.next += sp;
    }
  }
  setInterval(musicTick, 120);

  /* ---------- HUD ---------- */
  var hud = {};
  ["height", "best", "screen", "jumps", "falls", "time", "msg", "zone"].forEach(function (k) { hud[k] = $("[data-gr-" + k + "]"); });
  var hc = {};
  function setHud(k, v) { if (hc[k] !== v && hud[k]) { hc[k] = v; hud[k].textContent = v; } }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function updateHud() {
    var p = S.p;
    setHud("height", (p ? standM(p) : 0) + "/" + TOTAL_M + " m");
    setHud("best", (best.h || 0) + " m");
    setHud("screen", (S.scr + 1) + "/" + L.screens);
    setHud("jumps", String(S.jumps));
    setHud("falls", String(S.falls));
    setHud("time", fmtTime(S.time));
    setHud("zone", (S.zoneIdx + 1) + "/" + ZONES.length + " · " + (ZONES[S.zoneIdx] ? ZONES[S.zoneIdx].name : ""));
    setHud("msg", S.msg);
  }
  function say(t, s) { S.msg = t; S.msgT = s || 2.5; }

  /* ---------- partie ---------- */
  function resetFx() { parts.length = 0; amb.length = 0; S.camY = S.scr * SH; S.freeze = 0; S.flash = 0; S.banner = null; S.confetti = 0; S.squat = 0; }
  function enterZone(z, first) {
    var i = zoneIdxAt(z);
    if (ZONES[i].id === S.zoneId) return;
    S.zoneId = ZONES[i].id; S.zoneIdx = i; amb.length = 0;
    S.banner = { t: 0, a: "ZONE " + (i + 1), b: ZONES[i].name.toUpperCase() };
    if (!first) SND.zone();
  }
  function newGame() {
    S.p = C.newPlayer(L); S.jumps = 0; S.falls = 0; S.time = 0;
    S.scr = C.screenOf(L, S.p.y - C.PH / 2); S.zoneId = ""; resetFx();
    S.mode = "play"; setOverlay(null);
    enterZone(altAtPx(S.p.y), true);
    say("Maintiens Espace pour armer ton saut, relâche pour sauter", 6);
    store(SAVE_KEY, null); audio();
  }
  function loadGame() {
    var sv = null;
    try { sv = JSON.parse(store(SAVE_KEY)); } catch (e) {}
    if (!sv) return newGame();
    S.p = C.newPlayer(L); S.p.x = sv.x; S.p.y = sv.y; S.p.minY = sv.minY != null ? sv.minY : sv.y;
    S.jumps = sv.jumps | 0; S.falls = sv.falls | 0; S.time = +sv.time || 0;
    S.scr = C.screenOf(L, S.p.y - C.PH / 2); S.zoneId = ""; resetFx();
    S.mode = "play"; setOverlay(null); enterZone(altAtPx(S.p.y), true); say("On reprend là où tu t'étais arrêté", 3); audio();
  }
  function hasSave() { try { return !!JSON.parse(store(SAVE_KEY)); } catch (e) { return false; } }
  function saveGame() {
    var p = S.p; if (!p || S.mode !== "play" || !p.ground) return;
    store(SAVE_KEY, JSON.stringify({ x: p.x, y: p.y, minY: p.minY, jumps: S.jumps, falls: S.falls, time: S.time }));
  }
  function recordBest(win) {
    var h = standM(S.p), changed = false;
    if (win) h = TOTAL_M;
    if (h > (best.h || 0)) { best.h = h; changed = true; }
    if (win && (!best.t || S.time < best.t)) { best.t = S.time; changed = true; S.newBestTime = true; }
    if (changed) store(BEST_KEY, JSON.stringify(best));
  }
  function pause(on) {
    if (on && S.mode === "play") { S.mode = "paused"; setOverlay("pause"); }
    else if (!on && S.mode === "paused") { S.mode = "play"; setOverlay(null); }
  }

  /* ---------- fenêtres ---------- */
  var overlay = $("[data-gr-overlay]"), card = $("[data-gr-card]");
  function setOverlay(kind) {
    if (!kind) { overlay.hidden = true; return; }
    overlay.hidden = false;
    var h = "";
    if (kind === "menu") {
      h = '<h2 class="gr-title">GRIMPE<br>CHÊNE</h2><p class="gr-sub">Escalade le grand chêne jusqu\'au gland doré.<br>' + ZONES.length + ' zones · ' + L.screens + ' écrans · ' + TOTAL_M + ' m</p>' +
        "<p><kbd>Espace</kbd> armer / sauter · <kbd>←</kbd> <kbd>→</kbd> direction</p>" +
        (best.h ? "<p>RECORD <strong>" + best.h + " m</strong>" + (best.t ? " · TEMPS " + fmtTime(best.t) : "") + "</p>" : "") +
        (hasSave() ? '<button class="btn gr-blink" type="button" data-gr-act="continue">▶ Continuer</button><button class="btn btn-ghost" type="button" data-gr-act="new">↺ Nouvelle partie</button>'
          : '<button class="btn gr-blink" type="button" data-gr-act="new">▶ Appuie sur start</button>');
    } else if (kind === "pause") {
      h = '<h2>PAUSE</h2><button class="btn" type="button" data-gr-act="resume">▶ Reprendre</button><button class="btn btn-ghost" type="button" data-gr-act="new">↺ Recommencer</button>';
    } else if (kind === "won") {
      h = '<h2>★ FÉLICITATIONS ★</h2><p class="gr-big">' + fmtTime(S.time) + "</p><p>" + S.jumps + " sauts · " + S.falls + " chutes</p>" +
        (S.newBestTime ? "<p><strong>Nouveau meilleur temps !</strong></p>" : best.t ? "<p>Meilleur temps : <strong>" + fmtTime(best.t) + "</strong></p>" : "") +
        '<button class="btn" type="button" data-gr-act="new">↺ Rejouer</button>';
    }
    card.innerHTML = h;
    var btn = card.querySelector("button");
    if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
  }
  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-gr-act]"); if (!b) return;
    var a = b.dataset.grAct;
    if (a === "new") newGame(); else if (a === "continue") loadGame(); else if (a === "resume") pause(false);
  });

  /* ---------- commandes ---------- */
  var K_LEFT = { ArrowLeft: 1, q: 1, Q: 1, a: 1, A: 1 }, K_RIGHT = { ArrowRight: 1, d: 1, D: 1 };
  var K_JUMP = { " ": 1, ArrowUp: 1, z: 1, Z: 1, w: 1, W: 1 };
  function group(e) { return K_LEFT[e.key] ? "left" : K_RIGHT[e.key] ? "right" : K_JUMP[e.key] ? "jump" : null; }
  function typing(e) { var t = e.target && e.target.tagName; return t === "INPUT" || t === "TEXTAREA" || t === "SELECT"; }
  window.addEventListener("keydown", function (e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); return; }
    var focusBtn = e.target && e.target.closest && e.target.closest("button, a");
    if (S.mode !== "play") {
      if ((e.key === "Enter" || e.key === " ") && !focusBtn) {
        e.preventDefault();
        if (S.mode === "menu") (hasSave() ? loadGame : newGame)(); else if (S.mode === "paused") pause(false); else if (S.mode === "won") newGame();
      }
      return;
    }
    var g = group(e); if (!g) return;
    e.preventDefault(); keys[g]["k:" + e.key] = true;
  });
  window.addEventListener("keyup", function (e) {
    var g = group(e); if (!g) return;
    delete keys[g]["k:" + e.key];
    if (S.mode === "play") e.preventDefault();
  });
  window.addEventListener("blur", function () { keys = { left: {}, right: {}, jump: {} }; if (S.mode === "play") pause(true); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && S.mode === "play") pause(true); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-gr-btn]"), function (btn) {
    var g = btn.dataset.grBtn;
    btn.addEventListener("pointerdown", function (e) {
      if (S.mode !== "play") return;
      e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      keys[g]["b:" + e.pointerId] = true; audio();
    });
    function up(e) { delete keys[g]["b:" + e.pointerId]; }
    btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  });
  // sur la scène : toucher la moitié gauche / droite = direction, double zone basse = saut
  var stage = $(".gr-stage");
  var pointerRole = {};
  stage.addEventListener("pointerdown", function (e) {
    if (S.mode !== "play" || e.pointerType === "mouse") return;
    var r = stage.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    var g = fy > 0.45 ? "jump" : fx < 0.5 ? "left" : "right";
    pointerRole[e.pointerId] = g; keys[g]["s:" + e.pointerId] = true; e.preventDefault(); audio();
  });
  function stageUp(e) { var g = pointerRole[e.pointerId]; if (g) { delete keys[g]["s:" + e.pointerId]; delete pointerRole[e.pointerId]; } }
  stage.addEventListener("pointerup", stageUp); stage.addEventListener("pointercancel", stageUp);
  var pauseBtn = $("[data-gr-pause]"), soundBtn = $("[data-gr-sound]"), musicBtn = $("[data-gr-music]"), crtBtn = $("[data-gr-crt]");
  pauseBtn.addEventListener("click", function () { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); });
  function soundLabel() { soundBtn.textContent = soundOn ? "🔊 Sons" : "🔇 Sons"; soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false"); }
  function musicLabel() { if (!musicBtn) return; musicBtn.textContent = musicOn ? "🎵 Musique" : "🎵 Coupée"; musicBtn.setAttribute("aria-pressed", musicOn ? "true" : "false"); }
  function crtApply() { var on = store(CRT_KEY) !== "0"; stage.classList.toggle("gr-crt", on); if (crtBtn) { crtBtn.textContent = on ? "📺 CRT" : "📺 Net"; crtBtn.setAttribute("aria-pressed", on ? "true" : "false"); } }
  soundBtn.addEventListener("click", function () { soundOn = !soundOn; store(SND_KEY, soundOn ? "1" : "0"); soundLabel(); if (soundOn) audio(); });
  if (musicBtn) musicBtn.addEventListener("click", function () { musicOn = !musicOn; store(MUS_KEY, musicOn ? "1" : "0"); musicLabel(); if (musicOn) audio(); });
  if (crtBtn) crtBtn.addEventListener("click", function () { store(CRT_KEY, store(CRT_KEY) === "0" ? "1" : "0"); crtApply(); });
  soundLabel(); musicLabel(); crtApply();

  /* ---------- effets : particules ---------- */
  var parts = [], amb = [];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function spawn(x, y, n, o) {
    for (var i = 0; i < n; i++) {
      var ang = o.ang != null ? o.ang + rnd(-(o.spread || 0), o.spread || 0) : rnd(0, 6.283), sp = rnd(o.v0 || 10, o.v1 || 40);
      parts.push({ x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(ang) * sp + (o.vx || 0), vy: Math.sin(ang) * sp + (o.vy || 0),
        g: o.g || 0, life: rnd(o.l0 || 0.3, o.l1 || 0.5), max: 0, col: Array.isArray(o.col) ? o.col[(Math.random() * o.col.length) | 0] : o.col, s: o.s || 2, kind: o.kind || 0 });
      parts[parts.length - 1].max = parts[parts.length - 1].life;
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
  }
  function dust(x, y, n, big) { spawn(x, y, n, { ang: -1.57, spread: 1.4, v0: 8, v1: big ? 60 : 34, g: 40, l0: 0.25, l1: big ? 0.6 : 0.4, col: ["#FCFCFC", "#BCBCBC", "#FCE0A8"], s: big ? 4 : 2, jx: 5 }); }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
  }
  function drawParts(c, oy) {
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i];
      if (q.life < q.max * 0.4 && ((q.life * 30) | 0) % 2) continue;                   // clignote avant de disparaître (pas de transparence)
      var sz = q.life < q.max * 0.25 ? Math.max(2, q.s - 2) : q.s, x = Math.round(q.x / 2) * 2, y = Math.round((q.y - oy) / 2) * 2;
      c.fillStyle = q.col;
      if (q.kind === 1) { c.fillRect(x - 2, y, 6, 2); c.fillRect(x, y - 2, 2, 6); }  // étincelle en croix
      else c.fillRect(x, y, sz, sz);
    }
  }

  /* ---------- simulation ---------- */
  var chargeTick = 0, fullPlayed = false;
  function simulate(dt) {
    var p = S.p, dir = (any(keys.right) ? 1 : 0) - (any(keys.left) ? 1 : 0);
    C.step(L, p, { dir: dir, jump: any(keys.jump) }, dt);
    S.time += dt;
    if (p.charge > 0 && p.ground) {
      chargeTick += dt; if (chargeTick > 0.12) { chargeTick = 0; SND.charge(p.charge / C.P.chargeMax); }
      var f = Math.min(1, p.charge / C.P.chargeMax);
      if (f >= 1 && !fullPlayed) { fullPlayed = true; SND.full(); }
      if (Math.random() < 0.5 + f) {                                                    // étincelles aspirées vers l'écureuil
        var a = rnd(0, 6.283), r = 22;
        spawn(p.x + Math.cos(a) * r, p.y - 7 + Math.sin(a) * r, 1, { ang: a + 3.1416, spread: 0.05, v0: 60, v1: 70, l0: 0.28, l1: 0.3, col: f < 0.5 ? "#58D854" : f < 0.85 ? "#F8D878" : "#F87858", s: 2 });
      }
    } else fullPlayed = false;
    var ev = p.ev; p.ev = [];
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.indexOf("jump:") === 0) {
        var jc = parseFloat(e.slice(5)); S.jumps++; SND.jump(jc); dust(p.x, p.y, 4 + Math.round(jc * 6));
        if (jc > 0.8) spawn(p.x, p.y - 6, 8, { v0: 40, v1: 80, l0: 0.2, l1: 0.35, col: ["#F8D878", "#FCFCFC"], s: 2, kind: 1 });
      } else if (e === "land") { SND.land(); saveGame(); S.squat = 0.1; dust(p.x - 4, p.y, 3); dust(p.x + 4, p.y, 3); }
      else if (e === "bump") { SND.bump(); spawn(p.x + (p.vx > 0 ? -6 : 6), p.y - 7, 4, { v0: 20, v1: 50, l0: 0.15, l1: 0.3, col: ["#FCFCFC", "#F8D878"], s: 2 }); }
      else if (e === "bonk") { SND.bonk(); S.shake = 3; spawn(p.x, p.y - C.PH, 5, { ang: -1.57, spread: 1.2, v0: 30, v1: 70, g: 120, l0: 0.3, l1: 0.5, col: "#F8D878", s: 2, kind: 1 }); }
      else if (e === "crash") {
        SND.crash(); S.shake = 9; S.freeze = 0.14; S.flash = 0.12; S.flashCol = "#FCFCFC"; say("Aïe ! Tu t'écrases…", 2.5); saveGame();
        dust(p.x, p.y, 14, true);
        spawn(p.x, p.y - 8, 14, { v0: 50, v1: 120, g: 260, l0: 0.5, l1: 0.9, col: ["#F8D878", "#FCA044", "#FCFCFC"], s: 2, kind: 1 });
      } else if (e === "win") winGame();
    }
    // rémanence de saut + traînée de vitesse
    if (!p.ground) {
      S.trailT -= dt; if (S.trailT <= 0) { S.trailT = 0.035; spawn(p.x, p.y - 7, 1, { v0: 0, v1: 4, l0: 0.2, l1: 0.26, col: p.vy > 330 ? "#FCFCFC" : "#FCA044", s: 4 }); }
      if (p.vy > 380) spawn(p.x + rnd(-8, 8), p.y - rnd(0, 14), 1, { ang: -1.57, spread: 0.02, v0: 140, v1: 190, l0: 0.12, l1: 0.18, col: "#FCFCFC", s: 2 });
    } else if (p.ice && Math.abs(p.vx) > 14 && Math.random() < 0.35) spawn(p.x - Math.sign(p.vx) * 4, p.y, 1, { ang: -1.57, spread: 0.6, v0: 6, v1: 20, l0: 0.2, l1: 0.3, col: ["#FCFCFC", "#A4E4FC"], s: 2 });
    else if (p.ground && Math.abs(p.vx) > 5 && Math.random() < 0.12) spawn(p.x - Math.sign(p.vx) * 4, p.y, 1, { ang: -1.57, spread: 0.8, v0: 4, v1: 14, l0: 0.2, l1: 0.3, col: "#BCBCBC", s: 2 });
    // écran courant (le décor change quand on passe d'un étage à l'autre)
    var scr = C.screenOf(L, p.y - C.PH / 2);
    if (scr !== S.scr) {
      if (scr > S.scr) { S.falls++; if (p.vy > 200) { SND.fall(); } say(scr - S.scr > 1 ? "Quelle chute !" : "Tu retombes d'un étage", 2.5); }
      else SND.screen();
      S.scr = scr; recordBest(false); enterZone(altAtPx(p.y - C.PH / 2), false);
    }
  }
  function winGame() {
    S.mode = "won"; S.newBestTime = false; recordBest(true); store(SAVE_KEY, null); SND.win();
    S.flash = 0.3; S.flashCol = "#F8D878"; S.confetti = 4; S.banner = { t: 0, a: "BRAVO !", b: "SOMMET ATTEINT" };
    setTimeout(function () { setOverlay("won"); }, 2600);
  }

  /* ---------- rendu : palette NES, aplats, tramage ---------- */
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  var pat = {};
  function dpat(col) {                                                                // damier 2 px : tramage façon NES
    if (pat[col]) return pat[col];
    var cv = document.createElement("canvas"); cv.width = cv.height = 4; var g = cv.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, 2, 2); g.fillRect(2, 2, 2, 2);
    return (pat[col] = ctx.createPattern(cv, "repeat"));
  }
  function dith(c, col, x, y, w, h) { c.fillStyle = dpat(col); c.fillRect(x, y, w, h); }
  function blob(c, col, x, y, w, h) {                                                // nuage / feuillage en rangées de 2 px
    for (var r = 0; r < h; r += 2) { var t = (r + 1) / h, k = Math.sin(Math.PI * Math.min(0.98, t * 0.5 + 0.5)); var ww = Math.max(4, Math.round(w * (0.55 + 0.45 * Math.sqrt(1 - Math.pow(1 - t, 2))) / 2) * 2); c.fillStyle = col; c.fillRect(x + ((w - ww) >> 1 & ~1), y + r, ww, 2); }
  }
  // thèmes (couleurs NES) : sky = bandes du bas vers le haut ; base/dark/lite = tuile pleine ; cap = revêtement du dessus
  var TH = {
    racines: { sky: ["#000000", "#004058"], base: "#503000", dark: "#000000", lite: "#AC7C00", cap: "#00A800", capL: "#58D854", brA: "#503000", brB: "#AC7C00", bush: "#007800" },
    tronc:   { sky: ["#000000", "#503000"], base: "#AC7C00", dark: "#503000", lite: "#FCA044", cap: null, capL: null, brA: "#503000", brB: "#FCA044", bush: "#00A800" },
    canopee: { sky: ["#005800", "#007800", "#00A800"], base: "#503000", dark: "#000000", lite: "#AC7C00", cap: "#58D854", capL: "#B8F8B8", brA: "#503000", brB: "#AC7C00", bush: "#58D854" },
    orage:   { sky: ["#4428BC", "#0000BC", "#000000"], base: "#7C7C7C", dark: "#000000", lite: "#BCBCBC", cap: "#BCBCBC", capL: "#FCFCFC", brA: "#503000", brB: "#7C7C7C", bush: "#4428BC" },
    glace:   { sky: ["#0058F8", "#0078F8", "#3CBCFC", "#A4E4FC"], base: "#0078F8", dark: "#0058F8", lite: "#3CBCFC", cap: "#FCFCFC", capL: "#A4E4FC", brA: "#0058F8", brB: "#A4E4FC", bush: "#FCFCFC" },
    nuages:  { sky: ["#A4E4FC", "#3CBCFC", "#6888FC", "#9878F8"], base: "#B8B8F8", dark: "#9878F8", lite: "#FCFCFC", cap: "#FCFCFC", capL: "#FCFCFC", brA: "#BCBCBC", brB: "#FCFCFC", bush: "#FCFCFC" },
    sommet:  { sky: ["#4428BC", "#0000BC", "#000000"], base: "#F8B800", dark: "#AC7C00", lite: "#F8D878", cap: "#F8D878", capL: "#FCFCFC", brA: "#AC7C00", brB: "#F8D878", bush: "#F8D878" },
  };
  function thAt(wy) { return TH[ZONES[zoneIdxAt(altAtPx(wy))].id] || TH.racines; }
  // bandes de ciel globales (du bas de l'arbre vers le sommet)
  var BANDS = [];
  ZONES.forEach(function (z) {
    var t = TH[z.id] || TH.racines, n = t.sky.length;
    for (var i = 0; i < n; i++) BANDS.push({ a0: z.a0 + (z.a1 - z.a0) * i / n, a1: z.a0 + (z.a1 - z.a0) * (i + 1) / n, col: t.sky[i] });
  });
  function bandAt(a) { for (var i = 0; i < BANDS.length; i++) if (a < BANDS[i].a1) return i; return BANDS.length - 1; }

  function skyPaint(c, scr) {
    for (var y = 0; y < SH; y += 2) {
      var wy = scr * SH + y, b = bandAt(altAtPx(wy + 1)), bu = bandAt(altAtPx(wy - 3)), bd = bandAt(altAtPx(wy + 5)), col = BANDS[b].col;
      R(c, col, 0, y, SW, 2);
      if (bu !== b || bd !== b) {                                                       // frontière entre deux bandes : damier de 2 px
        var oc = bu !== b ? BANDS[bu].col : BANDS[bd].col;
        c.fillStyle = oc; for (var x = ((y >> 1) & 1) * 2; x < SW; x += 4) c.fillRect(x, y, 2, 2);
      }
    }
  }
  var bgCache = {}, tileCache = {};
  function trimCache() { [bgCache, tileCache].forEach(function (m) { for (var k in m) if (Math.abs(k - S.scr) > 3) delete m[k]; }); }
  function bgFor(scr) {
    if (bgCache[scr]) return bgCache[scr];
    trimCache();
    var cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
    var c = cv.getContext("2d"), id = ZONES[zoneIdxAt(altAtPx(scr * SH + SH / 2))].id, i, x, y;
    skyPaint(c, scr);
    if (id === "racines") {                                                             // troncs lointains + champignons
      for (i = 0; i < 4; i++) { x = 8 + Math.floor(hash(scr, i + 70) * 12) * 24; dith(c, "#503000", x, 0, 16, SH); R(c, "#503000", x + 2, 0, 2, SH); }
      for (i = 0; i < 5; i++) { x = Math.floor(hash(scr, i + 9) * 18) * 16 + 16; y = SH - 6 - Math.floor(hash(i, scr) * 6) * 2; R(c, "#A80020", x, y - 4, 8, 4); R(c, "#FCFCFC", x + 2, y - 4, 2, 2); R(c, "#FCE0A8", x + 2, y, 4, 4); }
    } else if (id === "tronc") {                                                        // écorce : sillons verticaux et nœuds
      for (i = 0; i < 22; i++) { x = i * 16 + Math.floor(hash(scr, i) * 3) * 2; dith(c, "#000000", x, 0, 4, SH); R(c, "#881400", x + 6, Math.floor(hash(i, scr) * 20) * 12, 2, 18 + Math.floor(hash(scr, i + 4) * 5) * 4); }
      for (i = 0; i < 3; i++) { x = 24 + Math.floor(hash(scr + 5, i) * 14) * 16; y = 16 + Math.floor(hash(i, scr + 9) * 12) * 16; blob(c, "#000000", x, y, 20, 16); blob(c, "#881400", x + 4, y + 4, 12, 8); }
    } else if (id === "canopee") {                                                      // masses de feuillage + lianes
      for (i = 0; i < 9; i++) { x = Math.floor(hash(scr, i + 30) * 17) * 16 - 8; y = Math.floor(hash(i, scr + 30) * 12) * 16; dith(c, "#005800", x, y, 48, 28); blob(c, "#005800", x + 4, y, 40, 22); }
      for (i = 0; i < 5; i++) { x = 16 + Math.floor(hash(scr + 1, i) * 17) * 16; R(c, "#007800", x, 0, 2, 30 + Math.floor(hash(i, scr) * 8) * 8); R(c, "#58D854", x - 2, 28 + Math.floor(hash(i, scr) * 8) * 8, 6, 4); }
    } else if (id === "orage") {                                                        // nuages d'orage noirs
      for (i = 0; i < 6; i++) { x = Math.floor(hash(scr, i + 3) * 16) * 16 - 16; y = Math.floor(hash(i + 2, scr) * 13) * 16; blob(c, "#000000", x, y, 72, 28); dith(c, "#4428BC", x + 8, y + 22, 52, 6); }
    } else if (id === "glace") {                                                        // montagnes enneigées au loin
      for (i = 0; i < 3; i++) { x = Math.floor(hash(scr, i + 11) * 14) * 16 - 24; var hgt = 60 + Math.floor(hash(i, scr) * 8) * 8, bw = hgt * 1.6; for (y = 0; y < hgt; y += 2) { var w2 = Math.round((y / hgt) * bw / 4) * 4; R(c, y < 14 ? "#FCFCFC" : "#6888FC", x + ((bw - w2) >> 1 & ~1), SH - hgt + y, w2, 2); } }
      dith(c, "#FCFCFC", 0, SH - 10, SW, 10);
    } else if (id === "nuages") {                                                       // gros cumulus au loin
      for (i = 0; i < 4; i++) { x = Math.floor(hash(scr, i + 21) * 16) * 16 - 16; y = Math.floor(hash(i + 1, scr + 4) * 12) * 16 + 8; blob(c, "#FCFCFC", x, y, 64 + Math.floor(hash(i, i) * 3) * 8, 26); dith(c, "#BCBCBC", x + 6, y + 18, 44, 8); }
    } else if (id === "sommet") {                                                       // ciel nocturne, aurore, étoiles fixes
      dith(c, "#00E8D8", 0, 24 + Math.floor(hash(scr, 1) * 6) * 8, SW, 14); dith(c, "#58F898", 0, 40 + Math.floor(hash(scr, 2) * 6) * 8, SW, 10);
      for (i = 0; i < 40; i++) R(c, i % 5 ? "#FCFCFC" : "#F8D878", Math.floor(hash(scr, i + 50) * 160) * 2, Math.floor(hash(i, scr + 50) * 120) * 2, i % 7 ? 2 : 4, 2);
    }
    bgCache[scr] = cv; return cv;
  }

  function drawTile(c, ch, tx, ty, px, py) {
    var T = thAt(ty * TS + 8), h = hash(tx, ty), i, zid = ZONES[zoneIdxAt(altAtPx(ty * TS + 8))].id;
    var upC = C.tile(L, tx, ty - 1), upOpen = upC === "." || upC === "G" || upC === "=";
    function S_(a, b) { return C.isSolid(C.tile(L, a, b)); }
    if (ch === "#") {
      var side = tx === 0 || tx === C.COLS - 1;
      R(c, T.base, px, py, TS, TS);
      for (i = 0; i < 5; i++) R(c, T.dark, px + 2 * Math.floor(hash(tx * 7 + i, ty) * 8), py + 2 * Math.floor(hash(tx, ty * 7 + i) * 8), 2, 2);
      for (i = 0; i < 2; i++) R(c, T.lite, px + 2 * Math.floor(hash(tx * 3 + i, ty + 9) * 8), py + 2 * Math.floor(hash(tx + 9, ty * 3 + i) * 8), 2, 2);
      if (side) for (i = 0; i < 3; i++) R(c, T.dark, px + 4 + i * 4, py, 2, TS);
      if (!S_(tx, ty - 1)) R(c, T.lite, px, py, TS, 2);
      if (!S_(tx - 1, ty)) R(c, T.lite, px, py, 2, TS);
      if (!S_(tx, ty + 1)) R(c, T.dark, px, py + TS - 2, TS, 2);
      if (!S_(tx + 1, ty)) R(c, T.dark, px + TS - 2, py, 2, TS);
      if (upOpen && T.cap && !side) {
        R(c, T.cap, px, py, TS, 4); R(c, T.capL, px, py, TS, 2);
        for (i = 0; i < 4; i++) if (hash(tx * 4 + i, ty) > 0.4) R(c, T.cap, px + i * 4, py + 4, 2, hash(tx + i, ty * 3) > 0.7 ? 6 : 2);
        if (zid === "canopee" && h > 0.55) { R(c, "#00A800", px + 4, py - 2, 2, 2); R(c, "#58D854", px + 8, py - 4, 2, 4); }
        if (zid === "racines" && h > 0.7) { R(c, "#A80020", px + 4, py - 4, 6, 4); R(c, "#FCFCFC", px + 6, py - 4, 2, 2); }
      }
      if (zid === "sommet" && !side && (tx + ty) % 3 === 0) R(c, "#FCFCFC", px + 6, py + 6, 2, 2);
    } else if (ch === "I") {
      R(c, "#A4E4FC", px, py, TS, TS);
      R(c, "#3CBCFC", px, py + TS - 4, TS, 4); R(c, "#FCFCFC", px, py, TS, 2);
      for (i = 0; i < 3; i++) { var sx = px + 2 + 4 * ((tx * 5 + i * 3) % 3) + i * 2; R(c, "#FCFCFC", sx, py + 4 + i * 2, 2, 2); R(c, "#FCFCFC", sx + 2, py + 2 + i * 2, 2, 2); }
      if (!S_(tx - 1, ty)) R(c, "#3CBCFC", px, py, 2, TS);
      if (!S_(tx + 1, ty)) R(c, "#3CBCFC", px + TS - 2, py, 2, TS);
    } else if (ch === "=") {
      if (zid === "nuages" || zid === "sommet") {                                      // nuage traversable
        R(c, "#FCFCFC", px, py, TS, 6); R(c, "#BCBCBC", px, py + 4, TS, 2);
        if (C.tile(L, tx - 1, ty) !== "=") { R(c, "#FCFCFC", px - 2, py + 2, 2, 2); R(c, "#BCBCBC", px - 2, py + 4, 2, 2); }
        if (C.tile(L, tx + 1, ty) !== "=") { R(c, "#FCFCFC", px + TS, py + 2, 2, 2); R(c, "#BCBCBC", px + TS, py + 4, 2, 2); }
        if (h > 0.4) R(c, "#FCFCFC", px + 2 + 2 * Math.floor(h * 5), py - 2, 6, 2);
        if (zid === "sommet") R(c, "#F8D878", px + 6, py + 2, 2, 2);
      } else {                                                                        // branche
        R(c, T.brA, px, py, TS, 6); R(c, T.brB, px, py, TS, 2); R(c, "#000000", px, py + 6, TS, 2);
        for (i = 0; i < 2; i++) R(c, "#000000", px + 3 + i * 7, py + 2, 2, 2);
        if (C.tile(L, tx - 1, ty) !== "=") { R(c, T.brA, px - 2, py + 2, 2, 4); R(c, "#000000", px - 2, py + 6, 2, 2); }
        R(c, T.bush, px + 2 + 2 * Math.floor(h * 5), py - 2, 4, 2); R(c, T.bush, px + 4 + 2 * Math.floor(h * 4), py - 4, 2, 2);
      }
    }
  }
  function tilesFor(scr) {
    if (tileCache[scr]) return tileCache[scr];
    var cv = document.createElement("canvas"); cv.width = SW; cv.height = SH; var c = cv.getContext("2d");
    var y0 = scr * C.SROWS;
    for (var ry = 0; ry < C.SROWS; ry++) {
      var ty = y0 + ry; if (ty >= L.h) break;
      var row = L.rows[ty];
      for (var tx = 0; tx < C.COLS; tx++) { var ch = row.charAt(tx); if (ch === "#" || ch === "I" || ch === "=") drawTile(c, ch, tx, ty, tx * TS, ry * TS); }
    }
    tileCache[scr] = cv; return cv;
  }

  // gland doré : contour noir, reflets, rayons qui tournent
  function drawGoal(c, oy) {
    if (!L.goal) return;
    var px = L.goal.x * TS, py = L.goal.y * TS - oy;
    if (py < -40 || py > SH + 20) return;
    var bob = Math.round(Math.sin(S.t * 3) * 1.5), k = Math.floor(S.t * 8) % 4, i;
    for (i = 0; i < 8; i++) {
      var a = i * 0.785 + S.t * 0.8; c.fillStyle = (i + k) % 2 ? "#F8D878" : "#FCFCFC";
      c.fillRect(Math.round((px + 8 + Math.cos(a) * (14 + (k & 1) * 2)) / 2) * 2, Math.round((py + 8 + bob + Math.sin(a) * (14 + (k & 1) * 2)) / 2) * 2, 2, 2);
    }
    R(c, "#000000", px + 1, py + 2 + bob, 14, 14); R(c, "#000000", px + 6, py + bob, 4, 3);
    R(c, "#AC7C00", px + 2, py + 3 + bob, 12, 4); R(c, "#F8D878", px + 4, py + 3 + bob, 8, 2);
    R(c, "#F8B800", px + 3, py + 7 + bob, 10, 7); R(c, "#FCFCFC", px + 4, py + 8 + bob, 2, 4); R(c, "#AC7C00", px + 10, py + 10 + bob, 2, 4);
    R(c, "#503000", px + 7, py + 1 + bob, 2, 3);
  }

  // écureuil : poses dessinées en aplats puis contour noir généré automatiquement
  var O = "#E45C10", LT = "#FCA044", D = "#881400", CR = "#FCE0A8", K = "#000000";
  function mkSprite(fn) {
    var W = 30, H = 28, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var c = cv.getContext("2d"); c.translate(15, 25); fn(c);
    var id = c.getImageData(0, 0, W, H), d = id.data, src = new Uint8ClampedArray(d), x, y;
    function op(xx, yy) { return xx >= 0 && yy >= 0 && xx < W && yy < H && src[(yy * W + xx) * 4 + 3] > 0; }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (src[(y * W + x) * 4 + 3] === 0 && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) { var i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; }
    }
    c.putImageData(id, 0, 0); return cv;
  }
  function pose(name, f) {
    return function (c) {
      var r = function (col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); };
      if (name === "crash") {
        r(D, -9, -9, 5, 5); r(O, -5, -6, 11, 6); r(CR, -1, -3, 6, 3); r(O, 4, -9, 7, 7); r(D, 5, -11, 2, 3); r(K, 7, -7, 3, 1); r(K, 8, -8, 1, 3);
      } else if (name === "crouch") {
        r(D, -10, -13, 5, 9); r(CR, -10, -13, 5, 2); r(LT, -9, -10, 2, 4);
        r(O, -5, -6, 11, 6); r(CR, 0, -4, 5, 4); r(D, -3, -1, 3, 1); r(D, 3, -1, 3, 1);
        r(O, 1, -11, 8, 6); r(D, 2, -13, 2, 3); r(D, 6, -13, 2, 3); r(K, 6, -9, 2, 1); r(K, 9, -8, 1, 1);
      } else if (name === "up") {
        r(D, -9, -9, 4, 9); r(CR, -9, -1, 4, 1); r(LT, -8, -7, 2, 4);
        r(O, -4, -11, 8, 9); r(CR, 0, -9, 4, 6); r(D, -3, -2, 3, 2); r(D, 2, -2, 3, 2);
        r(O, 0, -16, 8, 6); r(D, 1, -18, 2, 3); r(D, 5, -18, 2, 3); r(K, 5, -14, 1, 2); r(K, 8, -13, 1, 1);
      } else if (name === "fall") {
        r(D, -9, -17, 4, 9); r(CR, -9, -17, 4, 2); r(LT, -8, -14, 2, 4);
        r(O, -4, -11, 8, 9); r(CR, 0, -9, 4, 6); r(O, -6, -12, 3, 2); r(O, 4, -12, 3, 2); r(D, -3, -2, 3, 2); r(D, 2, -2, 3, 2);
        r(O, 0, -16, 8, 6); r(D, 1, -18, 2, 3); r(D, 5, -18, 2, 3); r(K, 5, -14, 1, 2); r(K, 8, -13, 1, 1);
      } else {                                                                        // stand / walk (f = 0|1)
        var wob = name === "walk" ? (f ? 1 : -1) : 0, tw = name === "stand" ? f : 0;
        r(D, -10 + tw, -15 + wob, 5, 11); r(O, -9 + tw, -17 + wob, 4, 3); r(CR, -10 + tw, -15 + wob, 5, 2); r(LT, -9 + tw, -12 + wob, 2, 4);
        r(O, -4, -8, 9, 8); r(CR, 0, -6, 4, 6);
        if (name === "walk") { r(D, f ? -4 : -2, -1, 3, 1); r(D, f ? 2 : 4, -1, 3, 1); } else { r(D, -3, -1, 3, 1); r(D, 3, -1, 3, 1); }
        r(O, 1, -14, 8, 7); r(D, 2, -16, 2, 3); r(D, 6, -16, 2, 3); r(K, 6, -12, 1, 2); r(K, 9, -10, 1, 1);
      }
    };
  }
  var SPR = {};
  ["stand0", "stand1", "walk0", "walk1", "crouch", "up", "fall", "crash"].forEach(function (k) { SPR[k] = mkSprite(pose(k.replace(/\d$/, ""), +(k.slice(-1) === "1"))); });
  var SPR_HI = {};                                                                    // version « chargée à fond » : tout en blanc
  function hiSprite(k) {
    if (SPR_HI[k]) return SPR_HI[k];
    var src = SPR[k], cv = document.createElement("canvas"); cv.width = src.width; cv.height = src.height; var g = cv.getContext("2d");
    g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = "#FCFCFC"; g.fillRect(0, 0, cv.width, cv.height);
    return (SPR_HI[k] = cv);
  }
  function drawSquirrel(c, p) {
    var k, t = S.t;
    if (p.stun > 0) k = "crash";
    else if (p.ground) k = (p.charge > 0 || S.squat > 0) ? "crouch" : Math.abs(p.vx) > 5 ? "walk" + (Math.floor(t * 10) & 1) : "stand" + (Math.floor(t * 2.5) & 1);
    else k = p.vy < 0 ? "up" : "fall";
    var spr = SPR[k];
    if (p.charge >= C.P.chargeMax * 0.98 && Math.floor(t * 14) % 2) spr = hiSprite(k);
    c.save(); c.translate(Math.round(p.x), Math.round(p.y)); c.scale(p.facing, 1); c.drawImage(spr, -15, -25);
    if (k === "crash") for (var s = 0; s < 3; s++) { c.fillStyle = "#F8D878"; c.fillRect(-6 + s * 6 + Math.round(Math.sin(t * 8 + s) * 2), -16 + Math.round(Math.cos(t * 8 + s)) , 2, 2); }
    c.restore();
  }

  /* ---------- ambiance de zone ---------- */
  var AMB = { racines: ["fire", 14], tronc: ["mote", 22], canopee: ["leaf", 14], orage: ["rain", 70], glace: ["snow", 46], nuages: ["cloud", 5], sommet: ["spark", 16] };
  function ambInit(kind, q, fresh) {
    q.k = kind; q.ph = rnd(0, 6.28);
    if (kind === "rain") { q.x = rnd(-20, SW + 20); q.y = fresh ? rnd(0, SH) : -8; q.vx = -50; q.vy = rnd(260, 340); }
    else if (kind === "snow") { q.x = rnd(0, SW); q.y = fresh ? rnd(0, SH) : -4; q.vx = 0; q.vy = rnd(14, 34); }
    else if (kind === "leaf") { q.x = rnd(0, SW); q.y = fresh ? rnd(0, SH) : -6; q.vx = rnd(8, 22); q.vy = rnd(14, 30); q.c = ["#58D854", "#00A800", "#FCA044", "#B8F818"][(Math.random() * 4) | 0]; }
    else if (kind === "mote") { q.x = rnd(0, SW); q.y = fresh ? rnd(0, SH) : SH + 4; q.vx = rnd(-4, 4); q.vy = -rnd(6, 16); }
    else if (kind === "fire") { q.x = rnd(10, SW - 10); q.y = rnd(30, SH - 10); q.vx = 0; q.vy = 0; }
    else if (kind === "cloud") { q.x = fresh ? rnd(-20, SW) : -60; q.y = rnd(10, SH - 40); q.vx = rnd(4, 12); q.vy = 0; q.w = 40 + ((Math.random() * 3) | 0) * 12; }
    else if (kind === "spark") { q.x = rnd(0, SW); q.y = fresh ? rnd(0, SH) : SH + 4; q.vx = rnd(-4, 4); q.vy = -rnd(8, 20); }
  }
  function updateAmb(dt) {
    var def = AMB[S.zoneId]; if (!def) return;
    while (amb.length < def[1]) { var q = {}; ambInit(def[0], q, true); amb.push(q); }
    for (var i = 0; i < amb.length; i++) {
      var q2 = amb[i]; q2.ph += dt * 3;
      if (q2.k === "fire") { q2.x += Math.cos(q2.ph * 0.6) * 12 * dt; q2.y += Math.sin(q2.ph * 0.8) * 10 * dt; }
      else { q2.x += (q2.vx + (q2.k === "snow" ? Math.sin(q2.ph) * 14 : q2.k === "leaf" ? Math.sin(q2.ph * 1.5) * 20 : 0)) * dt; q2.y += q2.vy * dt; }
      if (q2.y > SH + 10 || q2.y < -12 || q2.x > SW + 70 || q2.x < -80) ambInit(q2.k, q2, false);
    }
  }
  function drawAmb(c, back) {
    for (var i = 0; i < amb.length; i++) {
      var q = amb[i], x = Math.round(q.x / 2) * 2, y = Math.round(q.y / 2) * 2;
      if (q.k === "cloud") { if (back) { blob(c, "#FCFCFC", x, y, q.w, 14); dith(c, "#BCBCBC", x + 4, y + 10, q.w - 10, 4); } continue; }
      if (back) continue;
      if (q.k === "rain") { c.fillStyle = "#B8B8F8"; c.fillRect(x, y, 2, 6); c.fillRect(x - 2, y + 6, 2, 2); }
      else if (q.k === "snow") { c.fillStyle = "#FCFCFC"; c.fillRect(x, y, 2, 2); if (i % 3 === 0) c.fillRect(x + 2, y + 2, 2, 2); }
      else if (q.k === "leaf") { c.fillStyle = q.c; c.fillRect(x, y, 4, 2); c.fillRect(x + (Math.sin(q.ph * 1.5) > 0 ? 2 : 0), y + 2, 2, 2); }
      else if (q.k === "mote") { c.fillStyle = i % 2 ? "#F8D878" : "#FCA044"; c.fillRect(x, y, 2, 2); }
      else if (q.k === "fire") { if (Math.sin(q.ph * 1.3) > -0.2) { c.fillStyle = "#F8D878"; c.fillRect(x, y, 2, 2); if (Math.sin(q.ph * 1.3) > 0.8) { c.fillStyle = "#FCFCFC"; c.fillRect(x - 2, y, 6, 2); c.fillRect(x, y - 2, 2, 6); } } }
      else if (q.k === "spark") { c.fillStyle = (i + Math.floor(S.t * 6)) % 2 ? "#F8D878" : "#FCFCFC"; c.fillRect(x - 2, y, 6, 2); c.fillRect(x, y - 2, 2, 6); }
    }
    if (back && S.zoneId === "nuages") {                                               // oiseaux qui battent des ailes
      for (var b = 0; b < 2; b++) {
        var bx = Math.round(((S.t * 24 + b * 160) % (SW + 40)) - 20), by = 40 + b * 70 + Math.round(Math.sin(S.t * 2 + b) * 6), up = Math.floor(S.t * 6 + b) % 2;
        c.fillStyle = "#000000"; c.fillRect(bx, by + (up ? 0 : 2), 2, 2); c.fillRect(bx + 2, by + 2 - (up ? 0 : 2), 2, 2); c.fillRect(bx + 4, by + (up ? 0 : 2), 2, 2);
      }
    }
  }
  function drawWind(c, wind) {                                                        // traînées de vent
    var n = 10, dir = wind > 0 ? 1 : -1;
    for (var i = 0; i < n; i++) {
      var sp = 150 + (i % 3) * 60, len = 10 + (i % 4) * 6, x = ((S.t * sp * dir + i * 97) % (SW + 40) + SW + 40) % (SW + 40) - 20, y = 8 + ((i * 53) % (SH - 16));
      c.fillStyle = i % 2 ? "#FCFCFC" : "#BCBCBC"; c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, len, 2);
      if (i % 3 === 0) c.fillRect(Math.round(x / 2) * 2 + (dir > 0 ? len : -4), Math.round(y / 2) * 2 + 2, 4, 2);
    }
  }

  /* ---------- texte bitmap & interface dans le canevas ---------- */
  function txt(c, s, x, y, col, align) {
    c.font = FONT; c.textBaseline = "top"; c.textAlign = align || "left";
    c.fillStyle = "#000000"; c.fillText(s, x + 1, y + 1); c.fillStyle = col || "#FCFCFC"; c.fillText(s, x, y);
  }
  function drawBox(c, x, y, w, h) { R(c, "#000000", x, y, w, h); R(c, "#FCFCFC", x + 2, y + 2, w - 4, 2); R(c, "#FCFCFC", x + 2, y + h - 4, w - 4, 2); R(c, "#FCFCFC", x + 2, y + 2, 2, h - 4); R(c, "#FCFCFC", x + w - 4, y + 2, 2, h - 4); }
  function drawBanner(c) {
    var b = S.banner; if (!b) return;
    b.t += 1 / 60;
    var slide = b.t < 0.3 ? b.t / 0.3 : b.t > 3.2 ? Math.max(0, 1 - (b.t - 3.2) / 0.3) : 1;
    if (b.t > 3.6) { S.banner = null; return; }
    var w = 168, h = 34, x = (SW - w) >> 1, y = Math.round(-h + (h + 10) * slide);
    drawBox(c, x, y, w, h);
    txt(c, b.a, SW >> 1, y + 8, "#F8D878", "center");
    txt(c, b.b.slice(0, Math.max(0, Math.floor((b.t - 0.3) * 28))), SW >> 1, y + 20, "#FCFCFC", "center");
  }
  function drawMinimap(c, p) {
    var x = SW - 11, y = 22, w = 6, h = 112;
    R(c, "#000000", x - 2, y - 2, w + 4, h + 4);
    for (var i = 0; i < ZONES.length; i++) { var z = ZONES[i], y0 = Math.round(y + h * (1 - Math.min(1, z.a1))), y1 = Math.round(y + h * (1 - z.a0)); R(c, (TH[z.id] || TH.racines).sky[Math.min(1, (TH[z.id] || TH.racines).sky.length - 1)] === "#000000" ? "#503000" : (TH[z.id] || TH.racines).sky[Math.min(1, (TH[z.id] || TH.racines).sky.length - 1)], x, y0, w, Math.max(2, y1 - y0 - 1)); }
    R(c, "#F8D878", x - 2, y - 4, w + 4, 2);
    var pr = Math.max(0, Math.min(1, (L.startY - p.y) / Math.max(1, L.startY - (L.goal ? L.goal.y * TS : 0))));
    if (Math.floor(S.t * 4) % 2 || p.ground) R(c, "#FCFCFC", x - 2, Math.round(y + h - h * pr) - 1, w + 4, 3);
    R(c, "#E45C10", x, Math.round(y + h - h * pr), w, 1);
  }
  function drawCharge(c, p) {
    var f = Math.min(1, p.charge / C.P.chargeMax), bx = Math.round(p.x) - 17, by = Math.round(p.y) - 33, segs = Math.ceil(f * 8), i;
    R(c, "#000000", bx - 1, by - 1, 36, 8);
    var full = f >= 0.98 && Math.floor(S.t * 14) % 2;
    for (i = 0; i < 8; i++) {
      if (i >= segs) { R(c, "#383838", bx + i * 4 + 1, by + 1, 3, 4); continue; }
      R(c, full ? "#FCFCFC" : i < 4 ? "#58D854" : i < 7 ? "#F8B800" : "#F83800", bx + i * 4 + 1, by + 1, 3, 4);
    }
  }

  function draw() {
    var c = ctx, p = S.p, scr = S.scr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    // caméra : défile par pas de 8 px vers l'écran courant
    var target = scr * SH, dd = target - S.camY;
    if (Math.abs(dd) > 0.5) S.camY += Math.sign(dd) * Math.min(Math.abs(dd), Math.max(16, Math.ceil(Math.abs(dd) * 0.28 / 8) * 8)); else S.camY = target;
    var cam = Math.round(S.camY), s0 = Math.floor(cam / SH), sx = 0, sy = 0;
    if (S.shake > 0.1) { sx = Math.round((Math.random() - 0.5) * S.shake / 2) * 2; sy = Math.round((Math.random() - 0.5) * S.shake / 2) * 2; }
    c.setTransform(1, 0, 0, 1, sx, sy);
    for (var k = s0; k <= s0 + 1; k++) if (k >= 0 && k < L.screens) c.drawImage(bgFor(k), 0, k * SH - cam);
    c.save(); c.translate(0, 0); drawAmb(c, true); c.restore();
    for (k = s0; k <= s0 + 1; k++) if (k >= 0 && k < L.screens) c.drawImage(tilesFor(k), 0, k * SH - cam);
    drawGoal(c, cam);
    if (p) {
      c.save(); c.translate(0, -cam);
      drawParts(c, 0);
      drawSquirrel(c, p);
      if (p.charge > 0 && p.ground) drawCharge(c, p);
      c.restore();
    }
    drawAmb(c, false);
    var wnd = L.wind[scr] || 0; if (wnd && S.mode !== "menu") drawWind(c, wnd);
    if (S.confetti > 0 && L.goal) {
      S.confetti -= 1 / 60;
      if (Math.random() < 0.5) spawn(L.goal.x * TS + 8, L.goal.y * TS, 3, { ang: -1.57, spread: 1.2, v0: 60, v1: 150, g: 160, l0: 0.9, l1: 1.6, col: ["#F83800", "#F8B800", "#58D854", "#3CBCFC", "#F878F8", "#FCFCFC"], s: 4 });
    }
    // éclairs (zone de l'orage) : flash par damier
    if (S.zoneId === "orage" && S.mode === "play") {
      S.boltT -= 1 / 60; if (S.boltT <= 0) { S.boltT = rnd(4, 9); S.bolt = 0.22; SND.thunder(); }
    }
    if (S.bolt > 0) { S.bolt -= 1 / 60; var ph = Math.floor(S.bolt * 30); if (ph % 3 !== 1) { c.fillStyle = dpat("#FCFCFC"); c.fillRect(0, 0, SW, SH); if (ph % 3 === 0) { c.fillStyle = "#FCFCFC"; var bx = 40 + Math.floor(hash(Math.floor(S.t), 3) * 220); for (var by = 0; by < SH * 0.6; by += 12) { c.fillRect(bx + ((by / 12) % 2) * 6, by, 4, 12); } } } }
    if (S.flash > 0) { S.flash -= 1 / 60; c.fillStyle = S.flash > 0.06 ? S.flashCol : dpat(S.flashCol); c.fillRect(0, 0, SW, SH); }
    // l'écran se « tasse » dans les derniers pixels, comme sur un vrai téléviseur : liseré clair en haut
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (p && S.mode !== "menu") { drawMinimap(c, p); drawBanner(c); }
    if (S.mode === "menu") { c.fillStyle = dpat("#000000"); c.fillRect(0, 0, SW, SH); }
  }

  /* ---------- boucle ---------- */
  var acc = 0, last = 0, STEP = 1 / 60;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    S.t += dt; S.shake = Math.max(0, S.shake - dt * 24); S.squat = Math.max(0, S.squat - dt);
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.msg = ""; }
    if (S.mode === "play" && S.p) {
      if (S.freeze > 0) S.freeze -= dt;                                                  // arrêt sur image à l'écrasement
      else { acc += dt; while (acc >= STEP) { simulate(STEP); acc -= STEP; if (S.mode !== "play") break; } }
    } else acc = 0;
    if (S.mode !== "paused") { updateParts(dt); updateAmb(dt); }
    draw(); updateHud();
    requestAnimationFrame(frame);
  }

  S.p = C.newPlayer(L); S.scr = C.screenOf(L, S.p.y - C.PH / 2); S.camY = S.scr * SH; enterZone(altAtPx(S.p.y), true);
  setOverlay("menu"); updateHud();
  requestAnimationFrame(function (t) { last = t; requestAnimationFrame(frame); });
  if (/[?&]debug\b/.test(location.search)) window.GRIMPE_DEBUG = { S: S, L: L, C: C, newGame: newGame, keys: function () { return keys; }, tick: simulate, ZONES: ZONES };
})();
