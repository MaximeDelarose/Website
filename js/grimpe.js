/* =========================================================================
   Grimpe-Chêne : jeu de grimpe façon Jump King (solo).
   Physique : js/grimpe-core.js (partagée avec tools/grimpe-check.js qui prouve
   que la tour est franchissable). Niveau : js/grimpe-data.js (généré par
   tools/grimpe-gen.js). Rendu : canvas 320 × 240, un écran à la fois.
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
  var SAVE_KEY = "grimpe-save-v1", BEST_KEY = "grimpe-best-v1", SND_KEY = "grimpe-sound-v1";
  var TS = C.TS, SW = C.COLS * TS, SH = C.SROWS * TS, METERS_PER_TILE = 0.5;
  var L = C.createLevel(DATA);
  var canvas = $("[data-gr-canvas]"), ctx = canvas.getContext("2d");
  canvas.width = SW; canvas.height = SH;

  /* ---------- état ---------- */
  var S = { mode: "menu", p: null, jumps: 0, falls: 0, time: 0, scr: 0, msg: "", msgT: 0, shake: 0, t: 0, stars: 0, lastSave: 0 };
  var best = (function () { try { return JSON.parse(store(BEST_KEY)) || {}; } catch (e) { return {}; } })();
  var keys = { left: {}, right: {}, jump: {} };
  function any(o) { for (var k in o) if (o[k]) return true; return false; }
  function heightM(p) { return Math.max(0, Math.round((L.startY - p.minY) / TS * METERS_PER_TILE * 10) / 10); }
  function standM(p) { return Math.max(0, Math.round((L.startY - p.y) / TS * METERS_PER_TILE)); }
  var TOTAL_M = Math.round((L.startY - (L.goal ? L.goal.y * TS : 0)) / TS * METERS_PER_TILE);

  /* ---------- sons ---------- */
  var actx = null, soundOn = store(SND_KEY) !== "0";
  function audio() {
    if (!soundOn) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  var SND = {
    jump: function (c) { tone(260 + 260 * c, 520 + 500 * c, 0.16, "square", 0.05); },
    land: function () { tone(150, 70, 0.07, "triangle", 0.08); },
    bump: function () { tone(210, 150, 0.06, "square", 0.04); },
    bonk: function () { tone(120, 80, 0.1, "square", 0.06); },
    crash: function () { tone(180, 40, 0.5, "sawtooth", 0.09); tone(90, 40, 0.5, "square", 0.06); },
    charge: function (c) { tone(180 + 400 * c, 180 + 400 * c, 0.04, "triangle", 0.025); },
    fall: function () { tone(500, 120, 0.5, "sine", 0.05); },
    win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, f, 0.2, "square", 0.06, i * 0.1); }); },
    screen: function () { tone(440, 660, 0.08, "triangle", 0.04); },
  };

  /* ---------- HUD ---------- */
  var hud = {};
  ["height", "best", "screen", "jumps", "falls", "time", "msg"].forEach(function (k) { hud[k] = $("[data-gr-" + k + "]"); });
  var hc = {};
  function setHud(k, v) { if (hc[k] !== v && hud[k]) { hc[k] = v; hud[k].textContent = v; } }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function updateHud() {
    var p = S.p;
    setHud("height", (p ? standM(p) : 0) + " m / " + TOTAL_M + " m");
    setHud("best", (best.h || 0) + " m");
    setHud("screen", (S.scr + 1) + " / " + L.screens);
    setHud("jumps", String(S.jumps));
    setHud("falls", String(S.falls));
    setHud("time", fmtTime(S.time));
    setHud("msg", S.msg);
  }
  function say(t, s) { S.msg = t; S.msgT = s || 2.5; }

  /* ---------- partie ---------- */
  function newGame() {
    S.p = C.newPlayer(L); S.jumps = 0; S.falls = 0; S.time = 0; S.stars = 0;
    S.scr = C.screenOf(L, S.p.y - C.PH / 2);
    S.mode = "play"; setOverlay(null);
    say("Maintiens Espace pour armer ton saut, relâche pour sauter", 6);
    store(SAVE_KEY, null); audio();
  }
  function loadGame() {
    var sv = null;
    try { sv = JSON.parse(store(SAVE_KEY)); } catch (e) {}
    if (!sv) return newGame();
    S.p = C.newPlayer(L); S.p.x = sv.x; S.p.y = sv.y; S.p.minY = sv.minY != null ? sv.minY : sv.y;
    S.jumps = sv.jumps | 0; S.falls = sv.falls | 0; S.time = +sv.time || 0;
    S.scr = C.screenOf(L, S.p.y - C.PH / 2);
    S.mode = "play"; setOverlay(null); say("On reprend là où tu t'étais arrêté", 3); audio();
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
      h = "<h2>Grimpe-Chêne</h2><p>Escalade le grand chêne jusqu'au gland doré. Un saut se prépare, et ne se rattrape pas.</p>" +
        "<p><kbd>Espace</kbd> armer / sauter · <kbd>←</kbd> <kbd>→</kbd> direction</p>" +
        (best.h ? "<p>Record : <strong>" + best.h + " m</strong>" + (best.t ? " · meilleur temps " + fmtTime(best.t) : "") + "</p>" : "") +
        (hasSave() ? '<button class="btn" type="button" data-gr-act="continue">▶ Continuer</button><button class="btn btn-ghost" type="button" data-gr-act="new">↺ Nouvelle partie</button>'
          : '<button class="btn" type="button" data-gr-act="new">▶ Grimper</button>');
    } else if (kind === "pause") {
      h = '<h2>Pause</h2><button class="btn" type="button" data-gr-act="resume">▶ Reprendre</button><button class="btn btn-ghost" type="button" data-gr-act="new">↺ Recommencer</button>';
    } else if (kind === "won") {
      h = '<h2>🏆 Tu l\'as eu !</h2><p class="gr-big">' + fmtTime(S.time) + "</p><p>" + S.jumps + " sauts · " + S.falls + " chutes</p>" +
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
  var pauseBtn = $("[data-gr-pause]"), soundBtn = $("[data-gr-sound]");
  pauseBtn.addEventListener("click", function () { if (S.mode === "play") pause(true); else if (S.mode === "paused") pause(false); });
  function soundLabel() { soundBtn.textContent = soundOn ? "🔊 Son" : "🔇 Muet"; soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false"); }
  soundBtn.addEventListener("click", function () { soundOn = !soundOn; store(SND_KEY, soundOn ? "1" : "0"); soundLabel(); if (soundOn) audio(); });
  soundLabel();

  /* ---------- simulation ---------- */
  var chargeTick = 0;
  function simulate(dt) {
    var p = S.p, dir = (any(keys.right) ? 1 : 0) - (any(keys.left) ? 1 : 0);
    var wasCharge = p.charge;
    C.step(L, p, { dir: dir, jump: any(keys.jump) }, dt);
    S.time += dt;
    if (p.charge > 0 && p.ground) { chargeTick += dt; if (chargeTick > 0.12) { chargeTick = 0; SND.charge(p.charge / C.P.chargeMax); } }
    var ev = p.ev; p.ev = [];
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.indexOf("jump:") === 0) { S.jumps++; SND.jump(parseFloat(e.slice(5))); }
      else if (e === "land") { SND.land(); saveGame(); }
      else if (e === "bump") SND.bump();
      else if (e === "bonk") { SND.bonk(); S.shake = 3; }
      else if (e === "crash") { SND.crash(); S.shake = 7; say("Aïe ! Tu t'écrases…", 2.5); saveGame(); }
      else if (e === "win") { winGame(); }
    }
    // écran courant (le décor change quand on passe d'un étage à l'autre)
    var scr = C.screenOf(L, p.y - C.PH / 2);
    if (scr !== S.scr) {
      if (scr > S.scr) { S.falls++; if (p.vy > 200) { SND.fall(); } say(scr - S.scr > 1 ? "Quelle chute !" : "Tu retombes d'un étage", 2.5); }
      else SND.screen();
      S.scr = scr; recordBest(false);
    }
  }
  function winGame() {
    S.mode = "won"; S.newBestTime = false; recordBest(true); store(SAVE_KEY, null); SND.win();
    setTimeout(function () { setOverlay("won"); }, 700);
  }

  /* ---------- rendu ---------- */
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) { return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]; }
  function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  var SKY = [[16, 38, 24], [34, 68, 52], [54, 82, 110], [110, 160, 210], [150, 214, 255]];
  function skyAt(a) { a = Math.max(0, Math.min(1, a)) * (SKY.length - 1); var i = Math.min(SKY.length - 2, Math.floor(a)); return mix(SKY[i], SKY[i + 1], a - i); }
  function altOf(scr) { return 1 - scr / Math.max(1, L.screens - 1); }

  var bgCache = {};
  function bgFor(scr) {
    if (bgCache[scr]) return bgCache[scr];
    var cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
    var c = cv.getContext("2d"), a0 = altOf(scr), a1 = altOf(scr + 1);
    var g = c.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, rgb(skyAt(a0))); g.addColorStop(1, rgb(skyAt(a1)));
    c.fillStyle = g; c.fillRect(0, 0, SW, SH);
    var i, x, y;
    if (a0 > 0.55) {                                    // étoiles de jour : rien ; nuages
      for (i = 0; i < 5; i++) {
        x = Math.floor(hash(scr, i) * SW); y = Math.floor(hash(i, scr + 40) * SH);
        c.fillStyle = "rgba(255,255,255,.55)";
        c.fillRect(x, y, 34, 7); c.fillRect(x + 6, y - 5, 22, 6); c.fillRect(x + 10, y + 6, 18, 4);
        c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x + 3, y - 8, 12, 3);
      }
    } else if (a0 < 0.3) {                              // lucioles
      for (i = 0; i < 18; i++) { c.fillStyle = "rgba(255, 230, 140, " + (0.2 + hash(i, scr) * 0.5) + ")"; c.fillRect(Math.floor(hash(i, scr + 9) * SW), Math.floor(hash(scr, i + 5) * SH), 2, 2); }
    }
    // troncs lointains
    c.fillStyle = "rgba(0,0,0," + (a0 > 0.6 ? 0.06 : 0.22) + ")";
    for (i = 0; i < 3; i++) { x = 24 + Math.floor(hash(scr, i + 70) * (SW - 80)); c.fillRect(x, 0, 18 + Math.floor(hash(i, scr) * 18), SH); }
    // feuillage
    if (a0 < 0.75) for (i = 0; i < 26; i++) {
      x = Math.floor(hash(scr + 3, i) * SW); y = Math.floor(hash(i + 8, scr) * SH);
      c.fillStyle = "rgba(" + (a0 < 0.4 ? "60,120,70" : "90,150,100") + "," + (0.1 + hash(i, i + scr) * 0.15) + ")";
      c.fillRect(x, y, 10, 5); c.fillRect(x + 3, y - 3, 6, 4);
    }
    bgCache[scr] = cv; return cv;
  }

  function drawTile(c, ch, tx, ty, px, py, alt) {
    var up = C.tile(L, tx, ty - 1), h = hash(tx, ty);
    var snow = alt > 0.5, i;
    if (ch === "#") {
      var base = alt > 0.62 ? [150, 160, 176] : [116, 74, 40], dark = alt > 0.62 ? [112, 122, 140] : [84, 52, 28], lite = alt > 0.62 ? [190, 200, 214] : [146, 98, 56];
      if (tx === 0 || tx === C.COLS - 1) { base = [100, 64, 34]; dark = [72, 44, 22]; lite = [128, 84, 46]; }
      c.fillStyle = rgb(base); c.fillRect(px, py, TS, TS);
      c.fillStyle = rgb(dark); c.fillRect(px, py + TS - 3, TS, 3); c.fillRect(px + TS - 2, py, 2, TS);
      c.fillStyle = rgb(lite); c.fillRect(px, py, 2, TS);
      for (i = 0; i < 3; i++) { c.fillStyle = rgb(dark); c.fillRect(px + 2 + Math.floor(hash(tx + i, ty) * 11), py + 2 + Math.floor(hash(tx, ty + i) * 10), 1, 4); }
      if (up === "." || up === "G" || up === "=") {
        c.fillStyle = snow ? "#f4fbff" : "#6fae4a"; c.fillRect(px, py, TS, 4);
        c.fillStyle = snow ? "#cfe6f5" : "#4f8a34"; c.fillRect(px, py + 4, TS, 1);
        for (i = 0; i < 4; i++) { c.fillStyle = snow ? "#f4fbff" : "#6fae4a"; c.fillRect(px + 1 + i * 4, py + 4 + (h > 0.5 ? 1 : 0) * (i % 2), 2, 2); }
      }
    } else if (ch === "I") {
      c.fillStyle = "#a9e4f5"; c.fillRect(px, py, TS, TS);
      c.fillStyle = "#e6fbff"; c.fillRect(px, py, TS, 3);
      c.fillStyle = "#7cc7e0"; c.fillRect(px, py + TS - 4, TS, 4);
      c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(px + 3 + Math.floor(h * 6), py + 5, 4, 1); c.fillRect(px + 8, py + 9, 3, 1);
    } else if (ch === "=") {
      if (alt > 0.65) {                               // nuage
        c.fillStyle = "#ffffff"; c.fillRect(px, py, TS, 6); c.fillStyle = "#dbe9f5"; c.fillRect(px, py + 5, TS, 2);
        if (C.tile(L, tx - 1, ty) !== "=") c.fillRect(px - 1, py + 1, 1, 4);
      } else {                                         // branche
        c.fillStyle = "#7a4d28"; c.fillRect(px, py, TS, 5); c.fillStyle = "#9a6a3a"; c.fillRect(px, py, TS, 2); c.fillStyle = "#54331a"; c.fillRect(px, py + 4, TS, 1);
        c.fillStyle = "#5f9e3e"; c.fillRect(px + 3 + Math.floor(h * 6), py - 2, 4, 3);
      }
    } else if (ch === "G") {
      var bob = Math.sin(S.t * 3) * 1.5;
      c.fillStyle = "rgba(255, 220, 100, " + (0.25 + 0.15 * Math.sin(S.t * 4)) + ")"; c.fillRect(px - 4, py - 4 + bob, TS + 8, TS + 8);
      c.fillStyle = "#c98a1e"; c.fillRect(px + 2, py + 2 + bob, 12, 4);
      c.fillStyle = "#ffd257"; c.fillRect(px + 3, py + 6 + bob, 10, 7); c.fillRect(px + 5, py + 13 + bob, 6, 2);
      c.fillStyle = "#fff3c4"; c.fillRect(px + 4, py + 7 + bob, 2, 4);
      c.fillStyle = "#7a4d28"; c.fillRect(px + 7, py + bob, 2, 3);
    }
  }

  function drawSquirrel(c, p, pose) {
    c.save(); c.translate(Math.round(p.x), Math.round(p.y)); c.scale(p.facing, 1);
    var O = "#e8873a", D = "#b8581f", Cr = "#fdf3de", K = "#2a170b";
    function r(col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
    if (pose === "crash") {
      r(D, -9, -9, 5, 5); r(O, -5, -6, 11, 6); r(Cr, -1, -3, 6, 3); r(O, 4, -9, 7, 7); r(D, 5, -11, 2, 3); r(K, 7, -7, 3, 1); r(K, 8, -8, 1, 3);
      for (var s = 0; s < 3; s++) { r("#ffd257", -6 + s * 6 + Math.round(Math.sin(S.t * 8 + s) * 2), -15 + Math.round(Math.cos(S.t * 8 + s)), 2, 2); }
    } else if (pose === "crouch") {
      r(D, -10, -13, 5, 9); r(Cr, -10, -13, 5, 2);
      r(O, -5, -6, 11, 6); r(Cr, 0, -4, 5, 4); r(D, -3, -1, 3, 1); r(D, 3, -1, 3, 1);
      r(O, 1, -11, 8, 6); r(D, 2, -13, 2, 3); r(D, 6, -13, 2, 3); r(K, 6, -9, 2, 1); r(K, 9, -8, 1, 1);
    } else if (pose === "up") {
      r(D, -9, -9, 4, 9); r(Cr, -9, 0 - 1, 4, 1);
      r(O, -4, -11, 8, 9); r(Cr, 0, -9, 4, 6); r(D, -3, -2, 3, 2); r(D, 2, -2, 3, 2);
      r(O, 0, -16, 8, 6); r(D, 1, -18, 2, 3); r(D, 5, -18, 2, 3); r(K, 5, -14, 1, 2); r(K, 8, -13, 1, 1);
    } else if (pose === "fall") {
      r(D, -9, -17, 4, 9); r(Cr, -9, -17, 4, 2);
      r(O, -4, -11, 8, 9); r(Cr, 0, -9, 4, 6); r(O, -6, -12, 3, 2); r(O, 4, -12, 3, 2); r(D, -3, -2, 3, 2); r(D, 2, -2, 3, 2);
      r(O, 0, -16, 8, 6); r(D, 1, -18, 2, 3); r(D, 5, -18, 2, 3); r(K, 5, -14, 1, 2); r(K, 8, -13, 1, 1);
    } else {
      var bob = Math.abs(p.vx) > 5 && p.ground ? Math.round(Math.sin(S.t * 14)) : 0;
      r(D, -10, -15 + bob, 5, 11); r(O, -9, -17 + bob, 4, 3); r(Cr, -10, -15 + bob, 5, 2);
      r(O, -4, -8, 9, 8); r(Cr, 0, -6, 4, 6); r(D, -3, -1, 3, 1); r(D, 3, -1, 3, 1);
      r(O, 1, -14, 8, 7); r(D, 2, -16, 2, 3); r(D, 6, -16, 2, 3); r(K, 6, -12, 1, 2); r(K, 9, -10, 1, 1);
    }
    c.restore();
  }

  function draw() {
    var c = ctx, p = S.p, scr = S.scr, alt = altOf(scr);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bgFor(scr), 0, 0);
    var sx = 0, sy = 0;
    if (S.shake > 0.1) { sx = Math.round((Math.random() - 0.5) * S.shake); sy = Math.round((Math.random() - 0.5) * S.shake); }
    c.setTransform(1, 0, 0, 1, sx, sy);
    var y0 = scr * C.SROWS;
    for (var ry = 0; ry < C.SROWS; ry++) {
      var ty = y0 + ry; if (ty >= L.h) break;
      var row = L.rows[ty];
      for (var tx = 0; tx < C.COLS; tx++) { var ch = row.charAt(tx); if (ch !== ".") drawTile(c, ch, tx, ty, tx * TS, ry * TS, alt); }
    }
    if (p) {
      var oy = scr * SH;
      c.save(); c.translate(0, -oy);
      var pose = p.stun > 0 ? "crash" : p.ground ? (p.charge > 0 ? "crouch" : "stand") : p.vy < 0 ? "up" : "fall";
      drawSquirrel(c, p, pose);
      if (p.charge > 0 && p.ground) {
        var f = Math.min(1, p.charge / C.P.chargeMax), bx = Math.round(p.x) - 10, by = Math.round(p.y) - 24;
        c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(bx - 1, by - 1, 22, 5);
        c.fillStyle = f < 0.5 ? "#9cf0b0" : f < 0.85 ? "#ffd257" : "#ff7a5a"; c.fillRect(bx, by, Math.round(20 * f), 3);
      }
      c.restore();
    }
    // indice de l'étage du dessus (un petit liseré)
    var g = c.createLinearGradient(0, 0, 0, 10); g.addColorStop(0, "rgba(255,255,255,.12)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, SW, 10);
  }

  /* ---------- boucle ---------- */
  var acc = 0, last = 0, STEP = 1 / 60;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    S.t += dt; S.shake = Math.max(0, S.shake - dt * 24);
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.msg = ""; }
    if (S.mode === "play" && S.p) {
      acc += dt;
      while (acc >= STEP) { simulate(STEP); acc -= STEP; if (S.mode !== "play") break; }
    } else acc = 0;
    draw(); updateHud();
    requestAnimationFrame(frame);
  }

  S.p = C.newPlayer(L); S.scr = C.screenOf(L, S.p.y - C.PH / 2);
  setOverlay("menu"); updateHud();
  requestAnimationFrame(function (t) { last = t; requestAnimationFrame(frame); });
  if (/[?&]debug\b/.test(location.search)) window.GRIMPE_DEBUG = { S: S, L: L, C: C, newGame: newGame, keys: function () { return keys; }, tick: simulate };
})();
