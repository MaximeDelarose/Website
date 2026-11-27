/* Bataille navale : version de base (solo contre l'ordinateur).
   Grille 10×10, 5 navires qui ne se touchent pas (même en diagonale).
   Trois niveaux d'IA : Facile (au hasard), Normal (chasse + cible), Difficile (carte de probabilités).
   Pensé pour mobile en portrait : un doigt suffit. Pas de dépendance. */
(function () {
  "use strict";

  var N = 10;
  var LETTERS = "ABCDEFGHIJ";
  var FLEET = [
    { name: "Porte-avions", len: 5 },
    { name: "Croiseur", len: 4 },
    { name: "Contre-torpilleur", len: 3 },
    { name: "Sous-marin", len: 3 },
    { name: "Torpilleur", len: 2 }
  ];
  var DIFFS = [
    { id: "easy", label: "Facile" },
    { id: "normal", label: "Normal" },
    { id: "hard", label: "Difficile" }
  ];
  var STORE = "bn-v1";

  var stage = document.getElementById("game-stage");
  if (!stage) return;
  var GK = window.GameKit || null;

  /* ---------- outils ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function idx(r, c) { return r * N + c; }
  function rc(i) { return [Math.floor(i / N), i % N]; }
  function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function coord(i) { var p = rc(i); return LETTERS[p[1]] + (p[0] + 1); }
  function haptic(k) { if (GK) GK.haptic(k); }
  function toast(msg, icon) { if (GK) GK.ui.toast(msg, { icon: icon }); }
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) {} }
  function reduced() { return document.documentElement.classList.contains("gk-reduce-fx"); }

  var store = load();
  store.diff = store.diff || "normal";
  store.again = !!store.again;
  store.stats = store.stats || {};

  /* ---------- sons (synthé WebAudio, suit le volume global du GameKit) ---------- */
  var AC = null;
  function ac() {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (C) { try { AC = new C(); } catch (e) {} } }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function noise(dur, f0, f1, vol, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0);
    var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    var g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
  }
  function tone(f0, f1, dur, vol, type, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(); o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    var g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    fire: function () { noise(0.18, 2200, 500, 0.12); },
    miss: function () { noise(0.45, 900, 180, 0.22, 0.12); tone(520, 260, 0.18, 0.05, "sine", 0.12); },
    hit: function () { tone(140, 40, 0.4, 0.35, "square", 0.1); noise(0.35, 600, 80, 0.35, 0.1); },
    sunk: function () { tone(140, 40, 0.4, 0.35, "square", 0.1); noise(0.6, 500, 60, 0.4, 0.1); tone(330, 110, 0.6, 0.12, "triangle", 0.35); },
    place: function () { tone(420, 520, 0.06, 0.06, "triangle"); },
    bad: function () { tone(180, 120, 0.12, 0.08, "square"); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, f, 0.22, 0.1, "triangle", i * 0.12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.98, 0.3, 0.1, "triangle", i * 0.16); }); }
  };

  /* ---------- modèle ---------- */
  function emptyBoard() {
    var b = { cells: [], ships: [] };
    for (var i = 0; i < N * N; i++) b.cells.push({ ship: -1, shot: false, water: false });
    return b;
  }
  function shipCells(r, c, len, vert) {
    var out = [];
    for (var k = 0; k < len; k++) {
      var rr = r + (vert ? k : 0), cc = c + (vert ? 0 : k);
      if (!inb(rr, cc)) return null;
      out.push(idx(rr, cc));
    }
    return out;
  }
  // un navire ne doit ni chevaucher ni toucher (même en diagonale) un autre navire
  function canPlace(b, cells, ignore) {
    if (!cells) return false;
    for (var k = 0; k < cells.length; k++) {
      var p = rc(cells[k]);
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var r = p[0] + dr, c = p[1] + dc;
        if (!inb(r, c)) continue;
        var s = b.cells[idx(r, c)].ship;
        if (s !== -1 && s !== ignore) return false;
      }
    }
    return true;
  }
  function putShip(b, si, cells, vert) {
    var sh = b.ships[si];
    if (sh && sh.cells) sh.cells.forEach(function (i) { b.cells[i].ship = -1; });
    b.ships[si] = { name: FLEET[si].name, len: FLEET[si].len, cells: cells, vert: vert, hits: 0, sunk: false };
    cells.forEach(function (i) { b.cells[i].ship = si; });
  }
  function liftShip(b, si) {
    var sh = b.ships[si];
    if (!sh || !sh.cells) return;
    sh.cells.forEach(function (i) { b.cells[i].ship = -1; });
    b.ships[si] = null;
  }
  function randomFleet() {
    for (var tries = 0; tries < 200; tries++) {
      var b = emptyBoard(), ok = true;
      for (var si = 0; si < FLEET.length && ok; si++) {
        var placed = false;
        for (var a = 0; a < 300 && !placed; a++) {
          var vert = Math.random() < 0.5, r = rnd(N), c = rnd(N);
          var cells = shipCells(r, c, FLEET[si].len, vert);
          if (canPlace(b, cells, -1)) { putShip(b, si, cells, vert); placed = true; }
        }
        ok = placed;
      }
      if (ok) return b;
    }
    return null;
  }
  function allPlaced(b) { for (var i = 0; i < FLEET.length; i++) if (!b.ships[i]) return false; return true; }
  function aliveCount(b) { return b.ships.filter(function (s) { return s && !s.sunk; }).length; }

  // tir : renvoie { res: "miss" | "hit" | "sunk" | "again", ship }
  function fireAt(b, i) {
    var cell = b.cells[i];
    if (cell.shot || cell.water) return { res: "again" };
    cell.shot = true;
    if (cell.ship === -1) return { res: "miss" };
    var sh = b.ships[cell.ship];
    sh.hits++;
    if (sh.hits >= sh.len) {
      sh.sunk = true;
      // les cases autour d'un navire coulé sont forcément de l'eau
      sh.cells.forEach(function (j) {
        var p = rc(j);
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          var r = p[0] + dr, c = p[1] + dc;
          if (inb(r, c)) { var cc = b.cells[idx(r, c)]; if (cc.ship === -1 && !cc.shot) cc.water = true; }
        }
      });
      return { res: "sunk", ship: sh };
    }
    return { res: "hit", ship: sh };
  }

  /* ---------- IA ---------- */
  // L'IA ne lit que ce qu'un joueur verrait : cases tirées, touchés, navires coulés.
  function aiKnown(b) {
    var k = [];
    for (var i = 0; i < N * N; i++) {
      var c = b.cells[i];
      if (c.water) k.push("w");
      else if (!c.shot) k.push("u");
      else if (c.ship === -1) k.push("m");
      else k.push(b.ships[c.ship].sunk ? "s" : "h");
    }
    return k;
  }
  function remainingLens(b) { return b.ships.filter(function (s) { return !s.sunk; }).map(function (s) { return s.len; }); }
  function pick(list) { return list[rnd(list.length)]; }
  function unknowns(k) { var out = []; for (var i = 0; i < k.length; i++) if (k[i] === "u") out.push(i); return out; }

  function aiEasy(b) {
    var k = aiKnown(b), u = unknowns(k);
    // un peu de bon sens : 40 % du temps, il tire à côté d'un touché
    var hits = []; for (var i = 0; i < k.length; i++) if (k[i] === "h") hits.push(i);
    if (hits.length && Math.random() < 0.4) {
      var near = neighbors4(pick(hits)).filter(function (j) { return k[j] === "u"; });
      if (near.length) return pick(near);
    }
    return pick(u);
  }
  function neighbors4(i) {
    var p = rc(i), out = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { var r = p[0] + d[0], c = p[1] + d[1]; if (inb(r, c)) out.push(idx(r, c)); });
    return out;
  }
  function aiNormal(b) {
    var k = aiKnown(b);
    var hits = []; for (var i = 0; i < k.length; i++) if (k[i] === "h") hits.push(i);
    if (hits.length) {
      // plusieurs touchés alignés : on prolonge la ligne
      if (hits.length >= 2) {
        var p0 = rc(hits[0]), p1 = rc(hits[1]);
        var vert = p0[1] === p1[1] && p0[0] !== p1[0], horiz = p0[0] === p1[0] && p0[1] !== p1[1];
        if (vert || horiz) {
          var line = hits.filter(function (h) { var p = rc(h); return vert ? p[1] === p0[1] : p[0] === p0[0]; });
          var vals = line.map(function (h) { var p = rc(h); return vert ? p[0] : p[1]; });
          var lo = Math.min.apply(null, vals) - 1, hi = Math.max.apply(null, vals) + 1;
          var cand = [];
          [lo, hi].forEach(function (v) {
            var r = vert ? v : p0[0], c = vert ? p0[1] : v;
            if (inb(r, c) && k[idx(r, c)] === "u") cand.push(idx(r, c));
          });
          if (cand.length) return pick(cand);
        }
      }
      var near = [];
      hits.forEach(function (h) { neighbors4(h).forEach(function (j) { if (k[j] === "u" && near.indexOf(j) < 0) near.push(j); }); });
      if (near.length) return pick(near);
    }
    // chasse : un damier suffit, le plus petit navire fait 2 cases
    var u = unknowns(k), even = u.filter(function (i) { var p = rc(i); return (p[0] + p[1]) % 2 === 0; });
    return pick(even.length ? even : u);
  }
  function aiHard(b) {
    var k = aiKnown(b), lens = remainingLens(b);
    var score = new Array(N * N).fill(0);
    var hasHits = k.indexOf("h") >= 0;
    lens.forEach(function (len) {
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) for (var v = 0; v < 2; v++) {
        var cells = shipCells(r, c, len, v === 1);
        if (!cells) continue;
        var ok = true, covered = 0;
        for (var j = 0; j < cells.length; j++) {
          var s = k[cells[j]];
          if (s === "m" || s === "w" || s === "s") { ok = false; break; }
          if (s === "h") covered++;
        }
        if (!ok) continue;
        if (hasHits && !covered) continue;
        var w = hasHits ? 1 + covered * 30 : 1;
        cells.forEach(function (j) { if (k[j] === "u") score[j] += w; });
      }
    });
    var best = -1, list = [];
    for (var i = 0; i < N * N; i++) {
      if (k[i] !== "u") continue;
      var sc = score[i] + Math.random() * 0.5;
      if (sc > best + 0.5) { best = sc; list = [i]; } else if (sc > best - 0.5) list.push(i);
    }
    return list.length ? pick(list) : aiNormal(b);
  }
  function aiMove(b) { return store.diff === "easy" ? aiEasy(b) : store.diff === "hard" ? aiHard(b) : aiNormal(b); }

  /* ---------- état de la partie ---------- */
  var G = {
    phase: "menu", // menu | place | battle | over
    me: emptyBoard(),
    foe: null,
    sel: 0, vert: false,
    turn: "me", busy: false,
    shots: 0, hits: 0, foeShots: 0, t0: 0,
    lastMe: -1, lastFoe: -1,
    paused: false
  };

  /* ---------- interface ---------- */
  stage.innerHTML = "";
  var root = el("div", "bn");
  root.innerHTML =
    '<div class="bn-bar">' +
      '<p class="bn-status" aria-live="polite"></p>' +
      '<button class="bn-iconbtn" type="button" data-act="pause" aria-label="Menu de la partie">☰</button>' +
    '</div>' +
    '<div class="bn-body">' +
      '<section class="bn-zone bn-zone-foe" aria-label="Grille ennemie">' +
        '<h2 class="bn-title"><span>Grille ennemie</span><span class="bn-count" data-count="foe"></span></h2>' +
        '<div class="bn-board bn-foe" role="grid" aria-label="Grille ennemie : touche une case pour tirer"></div>' +
      '</section>' +
      '<div class="bn-aside">' +
        '<section class="bn-zone bn-zone-me" aria-label="Ta flotte">' +
          '<h2 class="bn-title"><span>Ta flotte</span><span class="bn-count" data-count="me"></span></h2>' +
          '<div class="bn-board bn-me" role="grid" aria-label="Ta grille"></div>' +
        '</section>' +
        '<section class="bn-zone bn-zone-fleet" aria-label="Navires ennemis">' +
          '<h2 class="bn-title"><span>À couler</span></h2>' +
          '<ul class="bn-fleet"></ul>' +
        '</section>' +
      '</div>' +
      '<section class="bn-tools" aria-label="Placement de la flotte">' +
        '<p class="bn-hint">Choisis un navire puis touche une case. Touche un navire posé pour le reprendre.</p>' +
        '<ul class="bn-tray"></ul>' +
        '<div class="bn-tool-row">' +
          '<button class="btn btn-small btn-ghost" type="button" data-act="rotate">↻ Pivoter</button>' +
          '<button class="btn btn-small btn-ghost" type="button" data-act="random">🎲 Aléatoire</button>' +
          '<button class="btn btn-small btn-ghost" type="button" data-act="clear">Vider</button>' +
        '</div>' +
        '<button class="btn bn-go" type="button" data-act="battle">⚓ Au combat !</button>' +
      '</section>' +
    '</div>' +
    '<div class="game-overlay bn-overlay" hidden><div class="panel game-card bn-card"></div></div>';
  stage.appendChild(root);

  var statusEl = $(".bn-status", root);
  var foeEl = $(".bn-foe", root), meEl = $(".bn-me", root);
  var fleetEl = $(".bn-fleet", root), trayEl = $(".bn-tray", root);
  var overlay = $(".bn-overlay", root), card = $(".bn-card", root);
  var goBtn = $(".bn-go", root);
  var toolsEl = $(".bn-tools", root);
  var bodyEl = $(".bn-body", root);

  function buildBoard(host, who) {
    host.innerHTML = "";
    host.appendChild(el("span", "bn-corner"));
    for (var c = 0; c < N; c++) host.appendChild(el("span", "bn-lab bn-lab-col", LETTERS[c]));
    for (var r = 0; r < N; r++) {
      host.appendChild(el("span", "bn-lab bn-lab-row", String(r + 1)));
      for (var c2 = 0; c2 < N; c2++) {
        var i = idx(r, c2);
        var b = el("button", "bn-cell");
        b.type = "button";
        b.dataset.i = i;
        b.dataset.who = who;
        b.setAttribute("aria-label", coord(i));
        b.tabIndex = i === 0 ? 0 : -1;
        host.appendChild(b);
      }
    }
  }
  buildBoard(foeEl, "foe");
  buildBoard(meEl, "me");
  function cellEl(host, i) { return host.querySelector('.bn-cell[data-i="' + i + '"]'); }

  function shipShape(sh, i) {
    var pos = sh.cells.indexOf(i), cls = sh.vert ? " v" : " h";
    if (pos === 0) cls += " s0";
    if (pos === sh.cells.length - 1) cls += " s1";
    return cls;
  }

  function paintBoard(host, b, who) {
    var showShips = who === "me" || G.phase === "over";
    for (var i = 0; i < N * N; i++) {
      var c = b.cells[i], e = cellEl(host, i), cls = "bn-cell";
      var sh = c.ship >= 0 ? b.ships[c.ship] : null;
      var label = coord(i);
      if (sh && (showShips || sh.sunk)) {
        cls += " ship" + shipShape(sh, i);
        if (sh.sunk) cls += " sunk";
      }
      if (c.shot && c.ship === -1) { cls += " miss"; label += ", à l'eau"; }
      else if (c.shot) { cls += " hit"; label += sh && sh.sunk ? ", coulé" : ", touché"; }
      else if (c.water) { cls += " water"; label += ", eau"; }
      if (who === "foe" && (c.shot || c.water)) cls += " done";
      if ((who === "foe" && i === G.lastMe) || (who === "me" && i === G.lastFoe)) cls += " last";
      if (who === "me" && G.phase === "place" && c.ship === G.sel) cls += " picked";
      if (e.className.replace(/ fx-\w+/g, "") !== cls) {
        var fx = (e.className.match(/ fx-\w+/g) || []).join("");
        e.className = cls + fx;
      }
      e.setAttribute("aria-label", label);
    }
  }

  function renderFleet() {
    if (!G.foe) { fleetEl.innerHTML = ""; return; }
    fleetEl.innerHTML = G.foe.ships.map(function (s) {
      var pips = ""; for (var k = 0; k < s.len; k++) pips += "<i></i>";
      return '<li class="' + (s.sunk ? "sunk" : "") + '"><span class="bn-pips">' + pips + '</span><span class="bn-sname">' + s.name + "</span></li>";
    }).join("");
  }
  function renderTray() {
    trayEl.innerHTML = FLEET.map(function (f, si) {
      var placed = !!G.me.ships[si], pips = "";
      for (var k = 0; k < f.len; k++) pips += "<i></i>";
      return '<li><button type="button" class="bn-ship' + (placed ? " placed" : "") + (G.sel === si ? " on" : "") + '" data-ship="' + si + '" aria-pressed="' + (G.sel === si) + '">' +
        '<span class="bn-pips">' + pips + '</span><span class="bn-sname">' + f.name + (placed ? " ✓" : "") + "</span></button></li>";
    }).join("");
    goBtn.disabled = !allPlaced(G.me);
  }
  function setStatus(txt, tone) { statusEl.textContent = txt; statusEl.dataset.tone = tone || ""; }
  function counts() {
    $('[data-count="me"]', root).textContent = G.phase === "place" ? "" : aliveCount(G.me) + "/5";
    $('[data-count="foe"]', root).textContent = G.foe ? aliveCount(G.foe) + "/5" : "";
  }

  function render() {
    root.dataset.phase = G.phase;
    root.dataset.turn = G.turn;
    paintBoard(meEl, G.me, "me");
    if (G.foe) paintBoard(foeEl, G.foe, "foe");
    renderFleet();
    if (G.phase === "place") renderTray();
    counts();
    layout();
  }

  /* ---------- mise en page : tailles de case calculées selon l'écran ---------- */
  function layout() {
    var W = stage.clientWidth;
    if (!W || !stage.clientHeight) return;
    var wide = W > stage.clientHeight * 1.05;
    root.classList.toggle("bn-wide", wide);
    root.classList.toggle("bn-mini", !wide && G.phase !== "place");
    var cs = getComputedStyle(bodyEl);
    var aw = bodyEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ah = bodyEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var title = 24, L = 10.7, big, small;
    if (G.phase === "place") {
      var toolsH = toolsEl.offsetHeight || 220;
      if (wide) big = Math.min((aw - 250) / L, (ah - title) / L);
      else big = Math.min(aw / L, (ah - title - toolsH - 12) / L);
      small = big;
    } else if (wide) {
      // deux grilles côte à côte, la liste des navires sous la grille perso
      big = Math.min((aw - 24) / (2 * L), (ah - title - 84) / L);
      small = big;
    } else {
      // portrait : grande grille ennemie, petite grille perso à côté de la liste des navires
      big = Math.min(aw / L, (ah - title * 2 - 14) / (L * 1.42));
      small = Math.min(big * 0.42, (aw - 150) / L);
    }
    big = Math.max(14, Math.min(54, Math.floor(big)));
    small = Math.max(9, Math.min(54, Math.floor(small)));
    foeEl.style.setProperty("--c", big + "px");
    meEl.style.setProperty("--c", (G.phase === "place" ? big : small) + "px");
  }
  window.addEventListener("resize", layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);

  /* ---------- effets ---------- */
  function fx(host, i, kind) {
    var e = cellEl(host, i);
    if (!e || reduced()) return;
    e.classList.remove("fx-splash", "fx-boom");
    void e.offsetWidth;
    e.classList.add("fx-" + kind);
    setTimeout(function () { e.classList.remove("fx-" + kind); }, 700);
  }
  function shakeEl(e) { if (GK && !reduced()) GK.ui.shake(e); }

  /* ---------- placement ---------- */
  var hoverI = -1;
  function previewCells(i) {
    var p = rc(i), len = FLEET[G.sel].len;
    var r = p[0], c = p[1];
    // si le navire dépasse du bord, on le recale à l'intérieur
    if (G.vert) r = Math.min(r, N - len); else c = Math.min(c, N - len);
    return shipCells(r, c, len, G.vert);
  }
  function clearPreview() {
    Array.prototype.forEach.call(meEl.querySelectorAll(".pv, .pv-bad"), function (e) { e.classList.remove("pv", "pv-bad"); });
  }
  function showPreview(i) {
    clearPreview();
    if (G.phase !== "place" || G.sel < 0 || i < 0 || G.me.cells[i].ship >= 0) return;
    var cells = previewCells(i), ok = canPlace(G.me, cells, G.sel);
    cells.forEach(function (j) { cellEl(meEl, j).classList.add(ok ? "pv" : "pv-bad"); });
  }
  function nextUnplaced(from) {
    for (var k = 0; k < FLEET.length; k++) { var si = (from + k) % FLEET.length; if (!G.me.ships[si]) return si; }
    return -1;
  }
  function placeAt(i) {
    var c = G.me.cells[i];
    if (c.ship >= 0) {
      // reprendre un navire posé
      var si = c.ship;
      G.vert = G.me.ships[si].vert;
      liftShip(G.me, si);
      G.sel = si;
      sfx.place(); haptic("tick");
      render(); showPreview(i);
      return;
    }
    if (G.sel < 0) { toast("Tous les navires sont posés : touche-en un pour le déplacer.", "⚓"); return; }
    var cells = previewCells(i);
    if (!canPlace(G.me, cells, G.sel)) {
      sfx.bad(); haptic("fail"); shakeEl(meEl);
      toast("Les navires ne doivent pas se toucher, même en diagonale.", "⚠️");
      return;
    }
    putShip(G.me, G.sel, cells, G.vert);
    sfx.place(); haptic("tap");
    G.sel = nextUnplaced(G.sel);
    clearPreview();
    render();
  }
  function rotate() {
    G.vert = !G.vert;
    if (hoverI >= 0) showPreview(hoverI);
    toast(G.vert ? "Navire à la verticale" : "Navire à l'horizontale", "↻");
  }
  function randomize() {
    G.me = randomFleet();
    G.sel = -1;
    sfx.place(); haptic("tap");
    render();
  }
  function clearFleet() {
    G.me = emptyBoard();
    G.sel = 0;
    render();
  }

  /* ---------- combat ---------- */
  function startPlacement(keep) {
    if (!keep || !G.me || !allPlaced(G.me)) G.me = emptyBoard();
    else G.me.ships.forEach(function (s, si) { G.me.ships[si].hits = 0; G.me.ships[si].sunk = false; });
    G.me.cells.forEach(function (c) { c.shot = false; c.water = false; });
    G.foe = null; G.sel = nextUnplaced(0); G.lastMe = G.lastFoe = -1;
    G.phase = "place";
    hideOverlay();
    setStatus("Place ta flotte (" + diffLabel() + ")");
    render();
  }
  function startBattle() {
    if (!allPlaced(G.me)) return;
    clearPreview();
    G.foe = randomFleet();
    G.phase = "battle";
    G.shots = G.hits = G.foeShots = 0;
    G.t0 = Date.now();
    G.turn = Math.random() < 0.5 ? "me" : "foe";
    G.busy = false;
    render();
    haptic("success");
    if (G.turn === "me") { setStatus("À toi de tirer !", "me"); focusFoe(); }
    else { setStatus("L'ennemi commence…", "foe"); G.busy = true; setTimeout(foeTurn, 900); }
  }
  function diffLabel() { for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].id === store.diff) return DIFFS[k].label; return ""; }

  function playerFire(i) {
    if (G.phase !== "battle" || G.turn !== "me" || G.busy || G.paused) return;
    var c = G.foe.cells[i];
    if (c.shot || c.water) { shakeEl(cellEl(foeEl, i)); haptic("tick"); return; }
    G.busy = true;
    sfx.fire();
    var out = fireAt(G.foe, i);
    G.shots++; G.lastMe = i;
    if (out.res !== "miss") G.hits++;
    report(out, true, i);
    render();
    if (!aliveCount(G.foe)) return setTimeout(function () { endGame(true); }, 700);
    var again = out.res !== "miss" && store.again;
    setTimeout(function () {
      if (G.phase !== "battle") return;
      if (again) { G.busy = false; setStatus("Touché, tu rejoues !", "me"); return; }
      G.turn = "foe"; render();
      setStatus("L'ennemi vise…", "foe");
      setTimeout(foeTurn, 500);
    }, out.res === "miss" ? 450 : 750);
  }
  function foeTurn() {
    if (G.phase !== "battle") return;
    if (G.paused) { setTimeout(foeTurn, 300); return; }
    var i = aiMove(G.me);
    sfx.fire();
    var out = fireAt(G.me, i);
    G.foeShots++; G.lastFoe = i;
    report(out, false, i);
    render();
    if (!aliveCount(G.me)) return setTimeout(function () { endGame(false); }, 800);
    var again = out.res !== "miss" && store.again;
    setTimeout(function () {
      if (G.phase !== "battle") return;
      if (again) { setStatus("L'ennemi a touché, il rejoue…", "foe"); setTimeout(foeTurn, 600); return; }
      G.turn = "me"; G.busy = false; render();
      setStatus("À toi de tirer !", "me");
    }, out.res === "miss" ? 350 : 750);
  }
  function report(out, mine, i) {
    var host = mine ? foeEl : meEl, where = coord(i);
    if (out.res === "miss") {
      fx(host, i, "splash"); sfx.miss();
      setStatus((mine ? "À l'eau" : "L'ennemi tire en " + where + " : à l'eau") + (mine ? " (" + where + ")" : ""), mine ? "me" : "foe");
    } else if (out.res === "hit") {
      fx(host, i, "boom"); sfx.hit(); haptic("hit");
      setStatus(mine ? "Touché en " + where + " !" : "L'ennemi te touche en " + where + " !", mine ? "good" : "bad");
    } else if (out.res === "sunk") {
      fx(host, i, "boom"); sfx.sunk(); haptic("success"); shakeEl(host);
      setStatus(mine ? "Coulé ! " + out.ship.name + " ennemi au fond." : "Ton " + out.ship.name.toLowerCase() + " est coulé…", mine ? "good" : "bad");
      toast(mine ? out.ship.name + " ennemi coulé !" : "Ton " + out.ship.name.toLowerCase() + " a coulé", mine ? "💥" : "🌊");
    }
  }

  function endGame(won) {
    G.phase = "over"; G.busy = true;
    var secs = Math.round((Date.now() - G.t0) / 1000);
    var acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0;
    var st = store.stats[store.diff] = store.stats[store.diff] || { w: 0, l: 0, best: 0 };
    var record = false;
    if (won) { st.w++; if (!st.best || G.shots < st.best) { record = true; st.best = G.shots; } }
    else st.l++;
    save();
    render();
    if (won) { sfx.win(); haptic("success"); } else { sfx.lose(); haptic("fail"); }
    setStatus(won ? "Victoire !" : "Défaite…", won ? "good" : "bad");
    setTimeout(function () {
      showOverlay(
        "<h2>" + (won ? "Victoire !" : "Défaite…") + "</h2>" +
        "<p>" + (won ? "Toute la flotte ennemie est au fond." : "Ta flotte a coulé. La position des navires ennemis restants est révélée.") + "</p>" +
        '<dl class="bn-stats">' +
          "<div><dt>Tirs</dt><dd>" + G.shots + "</dd></div>" +
          "<div><dt>Précision</dt><dd>" + acc + " %</dd></div>" +
          "<div><dt>Durée</dt><dd>" + Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0") + "</dd></div>" +
        "</dl>" +
        (won && record ? '<p class="bn-record">🏆 Meilleur score en ' + diffLabel() + " : " + st.best + " tirs</p>" : "") +
        '<div class="bn-card-btns">' +
          '<button class="btn" type="button" data-act="replay">↺ Rejouer (même flotte)</button>' +
          '<button class="btn btn-alt" type="button" data-act="newfleet">Nouvelle flotte</button>' +
          '<button class="btn btn-ghost" type="button" data-act="look">Voir les grilles</button>' +
          '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button>' +
        "</div>"
      );
    }, won ? 600 : 900);
  }

  /* ---------- menus ---------- */
  function showOverlay(html) { card.innerHTML = html; overlay.hidden = false; var b = card.querySelector("button"); if (b) b.focus({ preventScroll: true }); }
  function hideOverlay() { overlay.hidden = true; }
  function statsLine() {
    var st = store.stats[store.diff];
    if (!st || !(st.w + st.l)) return "Pas encore de partie dans ce niveau.";
    return st.w + " victoire" + (st.w > 1 ? "s" : "") + " · " + st.l + " défaite" + (st.l > 1 ? "s" : "") + (st.best ? " · record : " + st.best + " tirs" : "");
  }
  function showMenu() {
    G.phase = "menu"; G.paused = false; G.busy = false;
    setStatus("Bataille navale");
    render();
    showOverlay(
      '<h2>Bataille navale</h2>' +
      "<p>Coule les 5 navires ennemis avant qu'il ne coule les tiens.</p>" +
      '<p class="bn-sub">Niveau de l\'ordinateur</p>' +
      '<div class="bn-seg" role="group" aria-label="Niveau">' +
        DIFFS.map(function (d) { return '<button type="button" data-diff="' + d.id + '" aria-pressed="' + (store.diff === d.id) + '" class="' + (store.diff === d.id ? "on" : "") + '">' + d.label + "</button>"; }).join("") +
      "</div>" +
      '<label class="bn-check"><input type="checkbox" data-opt="again"' + (store.again ? " checked" : "") + "> Touché = on rejoue</label>" +
      '<p class="bn-statsline">' + statsLine() + "</p>" +
      '<button class="btn bn-start" type="button" data-act="place">⚓ Placer ma flotte</button>' +
      '<details class="bn-rules"><summary>Règles</summary>' +
        "<ul><li>Chaque camp a 5 navires : porte-avions (5 cases), croiseur (4), contre-torpilleur (3), sous-marin (3) et torpilleur (2).</li>" +
        "<li>Les navires sont droits et ne se touchent jamais, même en diagonale.</li>" +
        "<li>Chacun tire à son tour. Quand un navire est coulé, les cases autour sont marquées comme de l'eau.</li>" +
        "<li>Avec l'option « Touché = on rejoue », un tir réussi donne un tir de plus.</li></ul>" +
      "</details>"
    );
  }
  function showPause() {
    if (G.phase !== "battle" && G.phase !== "place") { if (G.phase === "over") showMenu(); return; }
    G.paused = true;
    showOverlay(
      "<h2>Pause</h2>" +
      '<div class="bn-card-btns">' +
        '<button class="btn" type="button" data-act="resume">▶ Reprendre</button>' +
        (G.phase === "battle" ? '<button class="btn btn-alt" type="button" data-act="restart">↺ Recommencer</button>' : "") +
        '<button class="btn btn-ghost" type="button" data-act="menu">Menu principal</button>' +
      "</div>"
    );
  }

  /* ---------- évènements ---------- */
  root.addEventListener("click", function (e) {
    ac();
    var t = e.target.closest("button, input");
    if (!t) return;
    if (t.dataset.diff) {
      store.diff = t.dataset.diff; save();
      Array.prototype.forEach.call(card.querySelectorAll("[data-diff]"), function (b) { var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      var sl = card.querySelector(".bn-statsline"); if (sl) sl.textContent = statsLine();
      return;
    }
    if (t.dataset.opt === "again") { store.again = t.checked; save(); return; }
    if (t.dataset.ship != null) { var si = +t.dataset.ship; if (G.me.ships[si]) { G.vert = G.me.ships[si].vert; liftShip(G.me, si); } G.sel = si; render(); return; }
    if (t.classList.contains("bn-cell")) {
      var i = +t.dataset.i;
      if (t.dataset.who === "foe") playerFire(i);
      else if (G.phase === "place") placeAt(i);
      return;
    }
    switch (t.dataset.act) {
      case "pause": showPause(); break;
      case "resume": G.paused = false; hideOverlay(); break;
      case "restart": G.paused = false; startPlacement(true); break;
      case "menu": G.paused = false; G.foe = null; showMenu(); break;
      case "place": startPlacement(true); break;
      case "rotate": rotate(); break;
      case "random": randomize(); break;
      case "clear": clearFleet(); break;
      case "battle": startBattle(); break;
      case "replay": startPlacement(true); startBattle(); break;
      case "newfleet": startPlacement(false); break;
      case "look": hideOverlay(); setStatus("Touche ☰ pour rejouer"); break;
    }
  });
  meEl.addEventListener("pointermove", function (e) {
    if (G.phase !== "place" || e.pointerType !== "mouse") return;
    var t = e.target.closest(".bn-cell");
    var i = t ? +t.dataset.i : -1;
    if (i !== hoverI) { hoverI = i; showPreview(i); }
  });
  meEl.addEventListener("pointerleave", function () { hoverI = -1; clearPreview(); });

  // clavier : flèches dans la grille, Entrée pour tirer / poser, R pour pivoter
  root.addEventListener("keydown", function (e) {
    if (e.key === "r" || e.key === "R") { if (G.phase === "place") { rotate(); e.preventDefault(); } return; }
    if (e.key === "Escape" && overlay.hidden) { showPause(); return; }
    var t = e.target.closest && e.target.closest(".bn-cell");
    if (!t) return;
    var d = { ArrowUp: -N, ArrowDown: N, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (d == null) return;
    e.preventDefault();
    var i = +t.dataset.i, p = rc(i), j = i + d, q = rc(Math.max(0, Math.min(N * N - 1, j)));
    if (j < 0 || j >= N * N || (Math.abs(d) === 1 && q[0] !== p[0])) return;
    var host = t.parentNode, n = cellEl(host, j);
    t.tabIndex = -1; n.tabIndex = 0; n.focus();
    if (host === meEl) { hoverI = j; showPreview(j); }
  });
  function focusFoe() {
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest(".bn")) {
      var f = foeEl.querySelector('.bn-cell[tabindex="0"]'); if (f) f.focus({ preventScroll: true });
    }
  }

  // le jeu se met en pause quand on quitte l'onglet
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && G.phase === "battle" && overlay.hidden) showPause();
  });

  // petit accès pour les tests
  window.__bn = { ai: { easy: aiEasy, normal: aiNormal, hard: aiHard }, randomFleet: randomFleet, fireAt: fireAt, aliveCount: aliveCount, G: G, start: startBattle, place: startPlacement, randomize: randomize, fire: playerFire, end: endGame, store: store };

  showMenu();
  layout();
})();
