/* Ultimate Écureuil — un « party platformer » façon Ultimate Chicken Horse.
   Chaque manche : 1) on choisit une pièce, 2) tout le monde la pose dans le niveau, 3) on court
   jusqu'au drapeau. Seuls ceux qui arrivent marquent, et les pièges font des points.
   Aucun module : tout est ici. Réglages en haut (TS, COLS, PHYS, PIECES, SCORE). */
(function () {
  "use strict";
  var root = document.querySelector("[data-uch]");
  if (!root) return;
  var VERSION = "1.0.0";

  /* ------------------------------------------------------------------ réglages */
  var TS = 16, COLS = 40, ROWS = 24, W = COLS * TS, H = ROWS * TS;
  var GROUND = 19;                         // rangée du dessus du sol
  var FLAG_C = 37;                         // colonne du drapeau
  var PHYS = { gravity: 1000, fall: 460, run: 112, accel: 900, air: 620, ice: 150, jump: 322, cut: 110, spring: 560, wallSlide: 70, wallJump: 150, wallUp: 300 };
  var SCORE = { finish: 10, first: 5, kill: 3 };   // pièges : max 3 par manche, et seulement si quelqu'un arrive
  var PLAYER_W = 10, PLAYER_H = 13;
  var T_EMPTY = 0, T_ROCK = 1, T_ICE = 2, T_SPIKE = 3, T_SPRING = 4, T_WOOD = 5, T_CANNON = 6;
  var SOLID = [0, 1, 1, 0, 1, 1, 1];

  var COLORS = [
    { name: "Roux",    body: "#d9772b", dark: "#9c4a16", belly: "#f6d9a8" },
    { name: "Bleu",    body: "#4f8fd8", dark: "#2c5a96", belly: "#d7e8fb" },
    { name: "Mousse",  body: "#5aa84a", dark: "#38702d", belly: "#dcf2c4" },
    { name: "Violette", body: "#a869d1", dark: "#6e3d92", belly: "#f0dcfa" }
  ];

  /* pièces : kind = tile (cases pleines) | spike | saw | mover | cannon | spring */
  var PIECES = [
    { id: "p3",  name: "Planche",           kind: "tile", tile: T_WOOD, cells: [[0,0],[1,0],[2,0]], tip: "Une petite planche." },
    { id: "p5",  name: "Longue planche",    kind: "tile", tile: T_WOOD, cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], tip: "Pour traverser un trou." },
    { id: "sq",  name: "Bloc",              kind: "tile", tile: T_WOOD, cells: [[0,0],[1,0],[0,1],[1,1]], tip: "Un gros bloc." },
    { id: "L",   name: "Équerre",           kind: "tile", tile: T_WOOD, cells: [[0,0],[0,1],[0,2],[1,2]], tip: "Une marche ou un mur." },
    { id: "T",   name: "Table",             kind: "tile", tile: T_WOOD, cells: [[0,0],[1,0],[2,0],[1,1]], tip: "Plateforme en T." },
    { id: "pil", name: "Pilier",            kind: "tile", tile: T_WOOD, cells: [[0,0],[0,1],[0,2],[0,3]], tip: "Un mur à escalader." },
    { id: "ice", name: "Glace",             kind: "tile", tile: T_ICE,  cells: [[0,0],[1,0],[2,0],[3,0]], tip: "Ça glisse !" },
    { id: "spr", name: "Ressort",           kind: "spring", tile: T_SPRING, cells: [[0,0]], tip: "Fait rebondir très haut." },
    { id: "spk", name: "Piques",            kind: "spike", tile: T_SPIKE, cells: [[0,0],[1,0],[2,0]], hazard: true, tip: "Pointes mortelles (tourne-les)." },
    { id: "saw", name: "Scie circulaire",   kind: "saw", cells: [[0,0],[1,0],[0,1],[1,1]], hazard: true, tip: "Immobile mais coupante." },
    { id: "mov", name: "Plateforme mobile", kind: "mover", cells: [], tip: "Va et vient (tourne-la pour la rendre verticale)." },
    { id: "can", name: "Canon à glands",    kind: "cannon", tile: T_CANNON, cells: [[0,0]], hazard: true, tip: "Tire des glands toutes les 2 s." }
  ];
  var PIECE_BY_ID = {}; PIECES.forEach(function (p) { PIECE_BY_ID[p.id] = p; });

  /* ------------------------------------------------------------------ éléments du DOM */
  var cv = root.querySelector("canvas.game-canvas");
  var cx = cv.getContext("2d");
  var overlay = root.querySelector("[data-overlay]");
  var card = root.querySelector("[data-card]");
  var touchBar = root.querySelector("[data-touch]");
  var muteBtn = root.querySelector("[data-uch-mute]");
  var pauseBtn = root.querySelector("[data-uch-pause]");
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  var fsExit = root.querySelector("[data-fs-exit]");
  var hud = root.querySelector("[data-hud]");
  var DEMO = /demo|bots/.test(location.hash + location.search);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} return null; }

  /* ------------------------------------------------------------------ sons */
  var AC = null, muted = !!store("uch-mute");
  function beep(f, d, type, vol, slide) {
    if (muted) return;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  var SFX = {
    jump: function () { beep(300, 0.12, "square", 0.04, 640); },
    die: function () { beep(380, 0.3, "sawtooth", 0.06, 60); },
    win: function () { beep(520, 0.1, "triangle", 0.07); setTimeout(function () { beep(780, 0.18, "triangle", 0.07); }, 90); },
    pick: function () { beep(440, 0.08, "triangle", 0.05); },
    place: function () { beep(180, 0.1, "square", 0.06, 90); },
    spring: function () { beep(200, 0.2, "sine", 0.07, 900); },
    shot: function () { beep(240, 0.09, "square", 0.03, 120); },
    tick: function () { beep(660, 0.06, "square", 0.04); },
    go: function () { beep(880, 0.25, "triangle", 0.07); }
  };

  /* ------------------------------------------------------------------ état global */
  var cfg = Object.assign({ total: 4, humans: 1, target: 50 }, store("uch-cfg") || {});
  if (DEMO) cfg.humans = 0;
  var phase = "menu";
  var players = [], round = 0, timer = 0, paused = false, prevPhase = "";
  var grid, own, occ, dirs, saws, movers, cannons, arrows, parts, pits, placedPieces;
  var offer = [], pickOrder = [], pickIdx = 0, pickT = 0, runT = 0, firstDone = false, finishCount = 0;
  var banner = { text: "", t: 0 };
  var scale = 1, offX = 0, offY = 0;
  var time = 0;

  /* ------------------------------------------------------------------ niveau */
  function ix(c, r) { return r * COLS + c; }
  function newLevel() {
    grid = new Uint8Array(COLS * ROWS); own = new Int8Array(COLS * ROWS).fill(-1);
    occ = new Uint8Array(COLS * ROWS); dirs = new Uint8Array(COLS * ROWS);
    saws = []; movers = []; cannons = []; arrows = []; parts = []; pits = []; placedPieces = [];
    var gap = {};
    var tries = 0;
    while (pits.length < 3 && tries++ < 100) {
      var c0 = 9 + rnd(22), ok = true;
      pits.forEach(function (p) { if (Math.abs(p - c0) < 8) ok = false; });
      if (ok) pits.push(c0);
    }
    pits.forEach(function (p) { for (var k = 0; k < 3; k++) gap[p + k] = 1; });
    var steps = 0; tries = 0;
    var stepAt = {};
    while (steps < 4 && tries++ < 100) {
      var sc = 7 + rnd(26), good = true;
      for (var k = -1; k <= 3; k++) if (gap[sc + k] || stepAt[sc + k]) good = false;
      if (!good) continue;
      var sw = 1 + rnd(2), sh = 1 + rnd(2);
      for (var a = 0; a < sw; a++) stepAt[sc + a] = sh;
      steps++;
    }
    for (var c = 0; c < COLS; c++) {
      if (gap[c]) continue;
      var top = GROUND - (stepAt[c] || 0);
      for (var r = top; r < ROWS; r++) { grid[ix(c, r)] = T_ROCK; occ[ix(c, r)] = 1; }
    }
    // zones réservées : départ et arrivée
    for (var rr = GROUND - 6; rr < GROUND; rr++) {
      for (var c1 = 0; c1 <= 5; c1++) occ[ix(c1, rr)] = 2;
      for (var c2 = 34; c2 < COLS; c2++) occ[ix(c2, rr)] = 2;
    }
  }
  function solidTile(c, r) {
    if (c < 0 || c >= COLS) return true;
    if (r < 0 || r >= ROWS) return false;
    return !!SOLID[grid[ix(c, r)]];
  }
  function solidPx(x, y) { return solidTile(Math.floor(x / TS), Math.floor(y / TS)); }
  function boxHits(x, y, w, h) {
    var c0 = Math.floor(x / TS), c1 = Math.floor((x + w - 0.001) / TS), r0 = Math.floor(y / TS), r1 = Math.floor((y + h - 0.001) / TS);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidTile(c, r)) return true;
    return false;
  }

  /* cellules d'une pièce selon la rotation */
  function cellsOf(pc, rot) {
    var cs;
    if (pc.kind === "mover") {
      cs = [];
      if (rot % 2 === 0) { for (var a = 0; a < 7; a++) cs.push([a, 0]); }
      else { for (var b = 0; b < 7; b++) for (var d = 0; d < 3; d++) cs.push([d, b]); }
      return cs;
    }
    if (pc.kind === "saw" || pc.kind === "spring") return pc.cells.map(function (c) { return [c[0], c[1]]; });
    cs = pc.cells.map(function (c) { return [c[0], c[1]]; });
    for (var k = 0; k < rot; k++) cs = cs.map(function (c) { return [-c[1], c[0]]; });
    var mx = 99, my = 99;
    cs.forEach(function (c) { mx = Math.min(mx, c[0]); my = Math.min(my, c[1]); });
    return cs.map(function (c) { return [c[0] - mx, c[1] - my]; });
  }
  function canPlace(pc, rot, c, r) {
    var cs = cellsOf(pc, rot);
    for (var i = 0; i < cs.length; i++) {
      var cc = c + cs[i][0], rr = r + cs[i][1];
      if (cc < 0 || cc >= COLS || rr < 1 || rr >= ROWS - 1) return false;
      if (occ[ix(cc, rr)]) return false;
    }
    return true;
  }
  function commit(pi, pc, rot, c, r) {
    var cs = cellsOf(pc, rot), i;
    for (i = 0; i < cs.length; i++) occ[ix(c + cs[i][0], r + cs[i][1])] = 3;
    if (pc.kind === "tile" || pc.kind === "spring") {
      for (i = 0; i < cs.length; i++) { var k = ix(c + cs[i][0], r + cs[i][1]); grid[k] = pc.tile; own[k] = pi; }
    } else if (pc.kind === "spike") {
      for (i = 0; i < cs.length; i++) { var k2 = ix(c + cs[i][0], r + cs[i][1]); grid[k2] = T_SPIKE; own[k2] = pi; dirs[k2] = rot; }
    } else if (pc.kind === "cannon") {
      var k3 = ix(c, r); grid[k3] = T_CANNON; own[k3] = pi; dirs[k3] = rot;
      cannons.push({ c: c, r: r, dir: rot, t: 1.2 + Math.random() * 1.2, owner: pi });
    } else if (pc.kind === "saw") {
      saws.push({ x: (c + 1) * TS, y: (r + 1) * TS, rad: 7.5, a: 0, owner: pi });
    } else if (pc.kind === "mover") {
      var vert = rot % 2 === 1;
      movers.push({ ox: c * TS, oy: r * TS, vert: vert, w: 3 * TS, range: 4 * TS, ph: Math.random() * 6, x: c * TS, y: r * TS, dx: 0, dy: 0, owner: pi, c: c, r: r });
    }
    placedPieces.push({ pi: pi, id: pc.id });
  }

  /* ------------------------------------------------------------------ joueurs */
  var KEYS = [
    { l: ["KeyA"], r: ["KeyD"], u: ["KeyW", "Space"], d: ["KeyS"], rot: ["KeyE", "KeyR"], ok: ["Space", "KeyF"] },
    { l: ["ArrowLeft"], r: ["ArrowRight"], u: ["ArrowUp"], d: ["ArrowDown"], rot: ["ShiftRight", "Slash", "Numpad0"], ok: ["Enter", "NumpadEnter"] }
  ];
  var down = {};
  function keyHeld(set, list) { for (var i = 0; i < list.length; i++) if (down[list[i]]) return true; return false; }
  var touch = { l: false, r: false, j: false };

  function mkPlayers() {
    players = [];
    for (var i = 0; i < cfg.total; i++) {
      players.push({
        id: i, col: COLORS[i], human: i < cfg.humans ? i + 1 : 0, score: 0, roundPts: 0, kills: 0,
        x: 0, y: 0, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, face: 1, alive: true, done: false, onGround: false,
        coyote: 0, jbuf: 0, wall: 0, on: null, piece: null, ghost: null, anim: 0,
        bot: { skill: 0.82 + Math.random() * 0.16, hold: 0, stuck: 0, lastX: 0, think: 0 }, in: { l: 0, r: 0, j: 0, jh: 0 }
      });
    }
  }
  function keysFor(p) {
    if (!p.human) return null;
    var set = KEYS[p.human - 1];
    if (cfg.humans === 1) {
      var a = KEYS[0], b = KEYS[1], m = {};
      Object.keys(a).forEach(function (k) { m[k] = a[k].concat(b[k]); });
      return m;
    }
    return set;
  }
  function spawn(p, i) {
    p.x = 14 + i * 14; p.y = (GROUND - 1) * TS - PLAYER_H + 1; p.vx = p.vy = 0; p.alive = true; p.done = false;
    p.on = null; p.jbuf = 0; p.coyote = 0; p.face = 1; p.doneAt = 0;
    p.bot.hold = 0; p.bot.stuck = 0; p.bot.lastX = p.x; p.killer = -1;
  }

  /* ------------------------------------------------------------------ phases */
  function setBanner(t, d) { banner.text = t; banner.t = d || 1.6; }

  function startGame() {
    cfg.total = clamp(cfg.total, 2, 4); cfg.humans = DEMO ? 0 : clamp(cfg.humans, 1, Math.min(2, cfg.total));
    store("uch-cfg", { total: cfg.total, humans: cfg.humans, target: cfg.target });
    mkPlayers(); newLevel(); round = 0;
    startPick();
  }
  function startPick() {
    round++; phase = "pick";
    players.forEach(function (p) { p.piece = null; p.ghost = null; p.roundPts = 0; p.rank = 0; });
    var pool = PIECES.slice(), n = players.length + 2;
    offer = [];
    while (offer.length < n && pool.length) offer.push(Object.assign({}, pool.splice(rnd(pool.length), 1)[0]));
    pickOrder = players.slice().sort(function (a, b) { return a.score - b.score || a.id - b.id; }).map(function (p) { return p.id; });
    pickIdx = 0; pickT = 14;
    touchBar.dataset.mode = "none";
    renderPick();
  }
  function renderPick() {
    var who = players[pickOrder[pickIdx]];
    var h = '<p class="uch-kicker">Manche ' + round + ' · Pioche</p><h2><span class="uch-dot" style="background:' + who.col.body + '"></span>' + esc(who.col.name) + (who.human ? " : choisis une pièce" : " réfléchit…") + '</h2><div class="uch-offer">';
    offer.forEach(function (pc, i) {
      var taken = offer[i].takenBy !== undefined;
      h += '<button class="choice uch-pc' + (taken ? " taken" : "") + '" type="button" data-pc="' + i + '"' + (taken ? " disabled" : "") + '>' +
        '<span class="choice-key">' + (i + 1) + '</span><canvas width="72" height="56" data-prev="' + i + '"></canvas>' +
        '<span class="choice-text"><strong>' + esc(pc.name) + '</strong>' + (pc.hazard ? "<em>Piège</em>" : "<em>Construction</em>") + '<span>' + esc(pc.tip) + '</span></span>' +
        (taken ? '<span class="uch-by" style="background:' + players[pc.takenBy].col.body + '">' + esc(players[pc.takenBy].col.name) + '</span>' : "") + '</button>';
    });
    h += '</div><p class="game-small">Le moins bien classé choisit en premier. Clique une pièce ou touche <kbd>1</kbd>…<kbd>' + offer.length + '</kbd>.</p>';
    showCard(h, "uch-card-wide");
    card.querySelectorAll("canvas[data-prev]").forEach(function (c) { drawPreview(c, offer[+c.dataset.prev]); });
    card.querySelectorAll("[data-pc]").forEach(function (b) { b.addEventListener("click", function () { humanPick(+b.dataset.pc); }); });
  }
  function humanPick(i) {
    if (phase !== "pick") return;
    var who = players[pickOrder[pickIdx]];
    if (!who.human || offer[i].takenBy !== undefined) return;
    doPick(who, i);
  }
  function doPick(who, i) {
    offer[i].takenBy = who.id; who.piece = offer[i];
    SFX.pick();
    pickIdx++; pickT = 14;
    if (pickIdx >= pickOrder.length) { setTimeout(startPlace, 450); pickIdx = pickOrder.length; phase = "pickdone"; renderPickDone(); }
    else renderPick();
  }
  function renderPickDone() {
    var h = '<p class="uch-kicker">Manche ' + round + '</p><h2>Tout le monde est servi !</h2><div class="uch-offer">';
    offer.forEach(function (pc) {
      h += '<div class="choice uch-pc' + (pc.takenBy === undefined ? " taken" : "") + '"><span class="uch-prevbox"></span><span class="choice-text"><strong>' + esc(pc.name) + '</strong></span>' +
        (pc.takenBy !== undefined ? '<span class="uch-by" style="background:' + players[pc.takenBy].col.body + '">' + esc(players[pc.takenBy].col.name) + '</span>' : "") + '</div>';
    });
    showCard(h + "</div>", "uch-card-wide");
  }
  function botPick(who) {
    var free = [];
    offer.forEach(function (pc, i) { if (pc.takenBy === undefined) free.push(i); });
    // les bots aiment les pièges quand ils mènent, les ponts quand ils sont derrière
    var lead = who.score >= Math.max.apply(null, players.map(function (p) { return p.score; })) && who.score > 0;
    var pref = free.filter(function (i) { return !!offer[i].hazard === lead; });
    var list = pref.length && Math.random() < 0.7 ? pref : free;
    doPick(who, list[rnd(list.length)]);
  }

  function startPlace() {
    phase = "place"; timer = 22;
    hideCard();
    players.forEach(function (p, i) {
      p.ghost = { c: 14 + i * 4, r: 10, rot: 0, placed: false, fail: 0, botT: 2 + Math.random() * 4 };
      if (p.piece.kind === "cannon") p.ghost.rot = 2;
    });
    touchBar.dataset.mode = players[0].human ? "place" : "none";
    setBanner("Pose ta pièce !", 1.4);
  }
  function placeGhost(p) {
    var g = p.ghost;
    if (!g || g.placed) return false;
    if (!canPlace(p.piece, g.rot, g.c, g.r)) { g.fail = 0.4; beep(120, 0.1, "square", 0.04); return false; }
    commit(p.id, p.piece, g.rot, g.c, g.r);
    g.placed = true; SFX.place();
    for (var i = 0; i < 8; i++) parts.push({ x: (g.c + 1) * TS, y: (g.r + 1) * TS, vx: (Math.random() - .5) * 120, vy: -Math.random() * 90, t: .5, c: p.col.body, s: 2 });
    return true;
  }
  function randomPlace(p) {
    var g = p.ghost;
    for (var n = 0; n < 400; n++) {
      var rot = p.piece.kind === "spike" || p.piece.kind === "tile" || p.piece.kind === "cannon" || p.piece.kind === "mover" ? rnd(4) : 0;
      var c = 4 + rnd(COLS - 8), r = 6 + rnd(ROWS - 10);
      if (canPlace(p.piece, rot, c, r)) { g.rot = rot; g.c = c; g.r = r; return placeGhost(p); }
    }
    g.placed = true; // plus de place : la pièce est perdue
    return false;
  }
  function botPlaceTarget(p) {
    var pc = p.piece, g = p.ghost, best = null, bs = -1e9;
    for (var n = 0; n < 160; n++) {
      var rot = (pc.kind === "saw" || pc.kind === "spring") ? 0 : rnd(4);
      if (pc.kind === "cannon") rot = Math.random() < 0.7 ? 2 : rnd(4);
      var c = 6 + rnd(COLS - 12), r = 6 + rnd(ROWS - 9);
      if (!canPlace(pc, rot, c, r)) continue;
      var cs = cellsOf(pc, rot), s = Math.random() * 4, supported = false, near = 0;
      cs.forEach(function (q) {
        if (solidTile(c + q[0], r + q[1] + 1)) supported = true;
      });
      var mid = c + cs.length / 2;
      pits.forEach(function (pt) { near = Math.max(near, 8 - Math.abs(pt + 1 - mid)); });
      if (pc.hazard) {
        s += (supported ? 20 : 0) + (mid > 8 && mid < 33 ? 8 : 0) - Math.abs((r + 1) - (GROUND - 2)) * 1.2;
        if (pc.kind === "spike" && rot !== 0 && !supported) s -= 10;
      } else if (pc.kind === "spring") {
        s += near * 2 + (supported ? 6 : -20);
      } else {
        // un bot bâtisseur comble les trous (planche au niveau du sol) et évite de murer le couloir
        cs.forEach(function (q) {
          var qc = c + q[0], qr = r + q[1], inPit = pits.some(function (pt) { return qc >= pt && qc < pt + 3; });
          if (inPit && qr === GROUND) s += 7;
          else if (qr >= GROUND - 4 && qr <= GROUND - 2) s -= 6;
          else if (qr < GROUND - 4 && qr > GROUND - 8) s += 1;
        });
        s += near * 0.5;
      }
      if (s > bs) { bs = s; best = { rot: rot, c: c, r: r }; }
    }
    if (best) { g.rot = best.rot; g.c = best.c; g.r = best.r; placeGhost(p); }
    else randomPlace(p);
  }

  function startCountdown() {
    phase = "countdown"; timer = 2.4;
    players.forEach(function (p, i) { spawn(p, i); });
    cannons.forEach(function (c) { c.t = 1.4 + Math.random(); });
    arrows = []; runT = 0; firstDone = false; finishCount = 0;
    touchBar.dataset.mode = players[0].human ? "run" : "none";
  }
  function startRun() { phase = "run"; runT = 0; timer = 45; SFX.go(); setBanner("Courez !", 1); }

  // personne n'est arrivé : on retire les pièges pour ne pas bloquer la partie
  function clearTraps() {
    var n = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var k = ix(c, r);
      if (grid[k] === T_SPIKE || grid[k] === T_CANNON) { grid[k] = 0; occ[k] = 0; own[k] = -1; n++; }
    }
    saws.forEach(function (sw) {
      var c0 = Math.round(sw.x / TS) - 1, r0 = Math.round(sw.y / TS) - 1;
      for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) occ[ix(c0 + a, r0 + b)] = 0;
      n++;
    });
    saws = []; cannons = []; arrows = [];
    return n;
  }
  function endRun() {
    phase = "recap";
    var fin = players.filter(function (p) { return p.done; }).sort(function (a, b) { return a.doneAt - b.doneAt; });
    fin.forEach(function (p, i) { p.roundPts += SCORE.finish + (i === 0 ? SCORE.first : 0); p.rank = i + 1; });
    // les pièges ne rapportent que si quelqu'un a atteint le drapeau (pas de massacre gratuit), 3 max par manche
    players.forEach(function (p) { p.kills = fin.length ? Math.min(p.kills, 3) : 0; p.roundPts += p.kills * SCORE.kill; p.score += p.roundPts; });
    touchBar.dataset.mode = "none";
    var winner = null, best = 0;
    players.forEach(function (p) { if (p.score >= cfg.target && p.score > best) { best = p.score; winner = p; } });
    var tie = winner && players.filter(function (p) { return p.score === best; }).length > 1;
    var rows = players.slice().sort(function (a, b) { return b.score - a.score; });
    var h = '<p class="uch-kicker">Manche ' + round + ' · Résultats</p><h2>' + (fin.length ? "Bravo " + esc(fin[0].col.name) + " !" : "Personne n'est arrivé…") + '</h2><ul class="uch-recap">';
    rows.forEach(function (p) {
      var why = [];
      if (p.done) why.push("arrivé" + (p.rank === 1 ? " 1er" : "") + " +" + (SCORE.finish + (p.rank === 1 ? SCORE.first : 0)));
      else why.push(p.alive ? "n'a pas atteint le drapeau" : "éliminé");
      if (p.kills) why.push(p.kills + " piège" + (p.kills > 1 ? "s" : "") + " réussi" + (p.kills > 1 ? "s" : "") + " +" + p.kills * SCORE.kill);
      h += '<li><span class="uch-dot" style="background:' + p.col.body + '"></span><b>' + esc(p.col.name) + (p.human ? " (J" + p.human + ")" : "") + '</b><i>' + esc(why.join(" · ")) + '</i><strong>' + p.score + '<small> / ' + cfg.target + '</small></strong></li>';
    });
    h += '</ul>';
    if (!fin.length && clearTraps()) h += '<p class="game-small">Personne n\'est arrivé : les pièges sont retirés du parcours.</p>';
    if (winner && !tie) {
      h += '<h3>🏆 ' + esc(winner.col.name) + ' gagne la partie !</h3><div class="game-btns"><button class="btn" type="button" data-act="again">Rejouer</button><button class="btn btn-ghost" type="button" data-act="menu">Menu</button></div>';
      SFX.win(); phase = "over";
    } else {
      h += '<div class="game-btns"><button class="btn" type="button" data-act="next">Manche suivante ▶</button></div><p class="game-small">Premier à ' + cfg.target + ' points.' + (tie ? " Égalité en tête : on continue !" : "") + '</p>';
    }
    setTimeout(function () { showCard(h, "uch-card-wide"); bindActs(); }, 900);
  }
  function bindActs() {
    card.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.dataset.act;
        if (a === "next") { hideCard(); startPick(); }
        else if (a === "again") { hideCard(); startGame(); }
        else if (a === "menu") showMenu();
        else if (a === "resume") togglePause(false);
        else if (a === "start") startGame();
      });
    });
  }

  /* ------------------------------------------------------------------ menus */
  function showCard(html, cls) {
    card.className = "panel game-card uch-card " + (cls || "");
    card.innerHTML = html;
    overlay.hidden = false;
  }
  function hideCard() { overlay.hidden = true; }
  function showMenu() {
    phase = "menu"; hud.hidden = true; touchBar.dataset.mode = "none";
    function row(label, key, vals, fmt) {
      var h = '<div class="uch-row"><span>' + label + '</span><div class="uch-opts">';
      vals.forEach(function (v) { h += '<button type="button" class="btn btn-small ' + (cfg[key] === v ? "" : "btn-ghost") + '" data-cfg="' + key + '" data-v="' + v + '" aria-pressed="' + (cfg[key] === v) + '">' + (fmt ? fmt(v) : v) + '</button>'; });
      return h + '</div></div>';
    }
    var h = '<h2>Ultimate Écureuil</h2><p>Construis le parcours… puis fais tomber tes rivaux dedans ! <small>v' + VERSION + '</small></p>' +
      row("Joueurs", "total", [2, 3, 4]) +
      row("Humains", "humans", [1, 2], function (v) { return v + (v === 1 ? " (+ bots)" : " (même clavier)"); }) +
      row("Points pour gagner", "target", [30, 50, 80]) +
      '<div class="game-btns"><button class="btn" type="button" data-act="start">▶ Jouer</button></div>' +
      '<p class="game-small">Les bots complètent jusqu\'à ' + cfg.total + ' écureuils.</p>';
    showCard(h);
    bindActs();
    card.querySelectorAll("[data-cfg]").forEach(function (b) {
      b.addEventListener("click", function () {
        cfg[b.dataset.cfg] = +b.dataset.v;
        if (cfg.humans > cfg.total) cfg.humans = cfg.total;
        showMenu();
      });
    });
  }
  function togglePause(on) {
    if (phase === "menu" || phase === "over") return;
    paused = on === undefined ? !paused : on;
    if (paused) {
      showCard('<h2>Pause</h2><div class="game-btns"><button class="btn" type="button" data-act="resume">▶ Reprendre</button><button class="btn btn-ghost" type="button" data-act="menu">Quitter</button></div>');
      bindActs();
    } else if (phase === "pick") renderPick();
    else if (phase === "recap") endRecapRestore();
    else hideCard();
  }
  function endRecapRestore() { hideCard(); }

  /* ------------------------------------------------------------------ physique */
  function kill(p, by) {
    if (!p.alive || p.done) return;
    p.alive = false; SFX.die();
    for (var i = 0; i < 14; i++) parts.push({ x: p.x + 5, y: p.y + 6, vx: (Math.random() - .5) * 220, vy: -Math.random() * 200, t: .7, c: i % 2 ? p.col.body : p.col.dark, s: 2 });
    if (by !== undefined && by >= 0 && by !== p.id && players[by]) players[by].kills++;
  }
  function hazardsAt(p) {
    var x = p.x + 1.5, y = p.y + 1.5, w = p.w - 3, h = p.h - 2;
    var c0 = Math.floor(x / TS), c1 = Math.floor((x + w) / TS), r0 = Math.floor(y / TS), r1 = Math.floor((y + h) / TS);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
      var k = ix(c, r);
      if (grid[k] === T_SPIKE) {
        // pointes : moitié du carré du côté de la pointe
        var d = dirs[k] % 4, bx = c * TS, by = r * TS, bw = TS, bh = TS;
        if (d === 0) { by += 6; bh = 10; } else if (d === 2) { bh = 10; } else if (d === 1) { bw = 10; } else { bx += 6; bw = 10; }
        if (x < bx + bw && x + w > bx && y < by + bh && y + h > by) return own[k];
      }
    }
    for (var i = 0; i < saws.length; i++) {
      var s = saws[i], nx = clamp(s.x, x, x + w), ny = clamp(s.y, y, y + h);
      if ((nx - s.x) * (nx - s.x) + (ny - s.y) * (ny - s.y) < (s.rad - 0.5) * (s.rad - 0.5)) return s.owner;
    }
    for (var j = 0; j < arrows.length; j++) {
      var a = arrows[j];
      if (x < a.x + 5 && x + w > a.x - 5 && y < a.y + 3 && y + h > a.y - 3) { a.dead = true; return a.owner; }
    }
    return -2;
  }

  function stepPlayer(p, dt) {
    var inp = p.in;
    if (p.on) { p.x += p.on.dx; p.y += p.on.dy; p.on = null; }
    // entrées
    var tgt = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (tgt) p.face = tgt;
    var ice = false;
    if (p.onGround) { var gt = grid[ix(clamp(Math.floor((p.x + p.w / 2) / TS), 0, COLS - 1), clamp(Math.floor((p.y + p.h + 1) / TS), 0, ROWS - 1))]; ice = gt === T_ICE; }
    var acc = p.onGround ? (ice ? PHYS.ice : PHYS.accel) : PHYS.air;
    if (!tgt && ice && p.onGround) acc = 70;
    var want = tgt * PHYS.run;
    if (p.vx < want) p.vx = Math.min(want, p.vx + acc * dt); else if (p.vx > want) p.vx = Math.max(want, p.vx - acc * dt);
    // saut
    p.jbuf = inp.j ? 0.12 : Math.max(0, p.jbuf - dt);
    inp.j = 0;
    p.coyote = p.onGround ? 0.09 : Math.max(0, p.coyote - dt);
    p.wall = 0;
    if (!p.onGround) {
      if (boxHits(p.x + 1, p.y + 2, p.w, p.h - 4)) p.wall = 1;
      else if (boxHits(p.x - 1, p.y + 2, p.w, p.h - 4)) p.wall = -1;
    }
    if (p.jbuf > 0) {
      if (p.coyote > 0) { p.vy = -PHYS.jump; p.jbuf = 0; p.coyote = 0; p.onGround = false; SFX.jump(); }
      else if (p.wall) { p.vy = -PHYS.wallUp; p.vx = -p.wall * PHYS.wallJump; p.face = -p.wall; p.jbuf = 0; SFX.jump(); }
    }
    if (!inp.jh && p.vy < -PHYS.cut) p.vy = -PHYS.cut;
    p.vy = Math.min(PHYS.fall, p.vy + PHYS.gravity * dt);
    if (p.wall && p.vy > PHYS.wallSlide && ((p.wall > 0 && inp.r) || (p.wall < 0 && inp.l))) p.vy = PHYS.wallSlide;
    // déplacement X
    p.x += p.vx * dt;
    if (boxHits(p.x, p.y, p.w, p.h)) {
      if (p.vx > 0) p.x = Math.floor((p.x + p.w) / TS) * TS - p.w - 0.01; else p.x = (Math.floor(p.x / TS) + 1) * TS + 0.01;
      p.vx = 0;
    }
    // déplacement Y
    var oldBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.onGround = false;
    if (boxHits(p.x, p.y, p.w, p.h)) {
      if (p.vy > 0) {
        var fy = Math.floor((p.y + p.h) / TS), tc = clamp(Math.floor((p.x + p.w / 2) / TS), 0, COLS - 1);
        p.y = fy * TS - p.h - 0.01;
        if (grid[ix(tc, clamp(fy, 0, ROWS - 1))] === T_SPRING || grid[ix(clamp(Math.floor((p.x + 1) / TS), 0, COLS - 1), clamp(fy, 0, ROWS - 1))] === T_SPRING) { p.vy = -PHYS.spring; SFX.spring(); }
        else { p.vy = 0; p.onGround = true; }
      } else { p.y = (Math.floor(p.y / TS) + 1) * TS + 0.01; p.vy = 0; }
    }
    // plateformes mobiles (à sens unique)
    if (p.vy >= 0) {
      for (var i = 0; i < movers.length; i++) {
        var m = movers[i], top = m.y + 4;
        if (p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && p.y + p.h >= top && oldBottom <= top + 2 + Math.max(0, m.dy)) {
          p.y = top - p.h; p.vy = 0; p.onGround = true; p.on = m; break;
        }
      }
    }
    p.anim += Math.abs(p.vx) * dt * 0.12;
    // dangers
    if (p.alive) {
      var by = hazardsAt(p);
      if (by !== -2) kill(p, by);
      else if (p.y > H + 30) kill(p, -1);
    }
    // drapeau
    if (p.alive && !p.done && p.x + p.w > FLAG_C * TS && p.x < (FLAG_C + 1) * TS + 4 && p.y + p.h > (GROUND - 3) * TS) {
      p.done = true; p.doneAt = runT; finishCount++; SFX.win();
      if (!firstDone) { firstDone = true; if (timer > 10) timer = 10; setBanner(p.col.name + " arrive en premier !", 1.6); }
      for (var q = 0; q < 12; q++) parts.push({ x: p.x + 5, y: p.y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 160, t: .8, c: ["#ffd257", "#fff", p.col.body][q % 3], s: 2 });
    }
  }

  function solidAhead(p, dx, dy) { return solidPx(p.x + p.w / 2 + dx, p.y + dy); }
  function botThink(p, dt) {
    var inp = p.in, b = p.bot;
    inp.l = 0; inp.r = 1; inp.jh = b.hold > 0 ? 1 : 0;
    b.hold -= dt; b.think -= dt;
    var feet = p.y + p.h;
    if (p.onGround && b.think <= 0) {
      b.think = 0.04;
      var wall = solidAhead(p, 11, p.h - 4) || solidAhead(p, 11, p.h - 12);
      var gap = true;
      for (var d = 6; d <= 16; d += 5) for (var k = 1; k <= 3; k++) if (solidPx(p.x + p.w / 2 + d, feet + k * TS - 6)) gap = false;
      var hz = false;
      for (var kx = 8; kx <= 30 && !hz; kx += 8) {
        var tc = Math.floor((p.x + p.w / 2 + kx) / TS), tr = Math.floor((feet - 4) / TS);
        if (tc < COLS && tr >= 0 && (grid[ix(tc, tr)] === T_SPIKE || grid[ix(tc, Math.max(0, tr - 1))] === T_SPIKE)) hz = true;
      }
      for (var i = 0; i < saws.length && !hz; i++) { var s = saws[i]; if (s.x > p.x && s.x - p.x < 44 && Math.abs(s.y - (p.y + 6)) < 20) hz = true; }
      for (var j = 0; j < arrows.length && !hz; j++) { var a = arrows[j]; if (Math.abs(a.y - (p.y + 6)) < 12 && Math.abs(a.x - p.x) < 50 && a.vx * (p.x - a.x) < 0) hz = true; }
      if ((wall || gap || hz) && Math.random() < b.skill + 0.1) { inp.j = 1; inp.jh = 1; b.hold = hz ? 0.28 : 0.4; }
    }
    if (!p.onGround && p.wall) { if (Math.random() < 0.15) { inp.j = 1; inp.jh = 1; b.hold = 0.3; } }
    // coincé ?
    b.stuck += dt;
    if (Math.abs(p.x - b.lastX) > 6) { b.stuck = 0; b.lastX = p.x; }
    if (b.stuck > 0.8 && p.onGround) { inp.j = 1; inp.jh = 1; b.hold = 0.45; b.stuck = 0.3; }
    if (b.stuck > 3) { inp.l = 1; inp.r = 0; }
  }
  function humanInput(p) {
    var k = keysFor(p), inp = p.in;
    inp.l = keyHeld(down, k.l) || (p.human === 1 && touch.l) ? 1 : 0;
    inp.r = keyHeld(down, k.r) || (p.human === 1 && touch.r) ? 1 : 0;
    var jh = keyHeld(down, k.u) || (p.human === 1 && touch.j);
    if (jh && !p.jheld) inp.j = 1;
    p.jheld = jh; inp.jh = jh ? 1 : 0;
  }

  function updateWorld(dt) {
    time += dt;
    // plateformes mobiles
    movers.forEach(function (m) {
      var nx = m.x, ny = m.y;
      var f = (Math.sin(time * 0.9 + m.ph) + 1) / 2 * m.range;
      if (m.vert) ny = m.oy + f; else nx = m.ox + f;
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    });
    saws.forEach(function (s) { s.a += dt * 9; });
    if (phase === "run") {
      cannons.forEach(function (c) {
        c.t -= dt;
        if (c.t <= 0) {
          c.t = 2;
          var dx = [1, 0, -1, 0][c.dir % 4], dy = [0, 1, 0, -1][c.dir % 4];
          arrows.push({ x: (c.c + 0.5 + dx) * TS, y: (c.r + 0.5 + dy) * TS, vx: dx * 120, vy: dy * 120, owner: c.owner, life: 6 });
          SFX.shot();
        }
      });
      arrows.forEach(function (a) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        if (a.life <= 0 || solidPx(a.x, a.y) || a.x < -8 || a.x > W + 8 || a.y < -8 || a.y > H + 8) a.dead = true;
      });
      arrows = arrows.filter(function (a) { return !a.dead; });
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt;
      if (q.t <= 0) parts.splice(i, 1);
    }
  }

  function tick(dt) {
    if (banner.t > 0) banner.t -= dt;
    if (phase === "menu" || paused) { updateWorld(dt); return; }
    updateWorld(dt);
    var i, p;
    if (phase === "pick") {
      var who = players[pickOrder[pickIdx]];
      if (who) {
        pickT -= dt;
        if (!who.human) { if (pickT < 14 - (0.7 + Math.random() * 0.01)) botPick(who); }
        else if (pickT <= 0) { var fr = []; offer.forEach(function (pc, n) { if (pc.takenBy === undefined) fr.push(n); }); doPick(who, fr[rnd(fr.length)]); }
      }
    } else if (phase === "place") {
      timer -= dt;
      var all = true;
      for (i = 0; i < players.length; i++) {
        p = players[i];
        var g = p.ghost;
        if (g.fail > 0) g.fail -= dt;
        if (!g.placed) {
          all = false;
          if (!p.human) { g.botT -= dt; if (g.botT <= 0) botPlaceTarget(p); }
        }
      }
      if (timer <= 0) { players.forEach(function (q) { if (!q.ghost.placed) randomPlace(q); }); all = true; }
      if (all) startCountdown();
    } else if (phase === "countdown") {
      var before = Math.ceil(timer);
      timer -= dt;
      if (Math.ceil(timer) !== before && timer > 0) SFX.tick();
      if (timer <= 0) startRun();
    } else if (phase === "run") {
      runT += dt; timer -= dt;
      var alive = 0;
      for (i = 0; i < players.length; i++) {
        p = players[i];
        if (p.alive && !p.done) {
          if (p.human) humanInput(p); else botThink(p, dt);
          stepPlayer(p, dt);
          if (p.alive && !p.done) alive++;
        }
      }
      if (alive === 0 || timer <= 0) endRun();
    }
  }

  /* ------------------------------------------------------------------ dessin */
  function fr(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }

  function drawTile(g, t, x, y, dir, c, r) {
    if (t === T_ROCK) {
      var topFree = r === 0 || !grid || !SOLID[grid[ix(c, r - 1)]] ;
      fr(g, "#7a5a3a", x, y, TS, TS);
      fr(g, "#664a2e", x + 2, y + 9, 5, 3); fr(g, "#8a6844", x + 9, y + 4, 4, 3);
      if (topFree) { fr(g, "#5aa84a", x, y, TS, 5); fr(g, "#7cc65f", x, y, TS, 2); fr(g, "#3f7d35", x, y + 5, TS, 1); }
    } else if (t === T_WOOD) {
      fr(g, "#b27a3e", x, y, TS, TS); fr(g, "#d49a58", x, y, TS, 3); fr(g, "#7a4e22", x, y + TS - 2, TS, 2);
      fr(g, "#7a4e22", x, y, 1, TS); fr(g, "#7a4e22", x + TS - 1, y, 1, TS);
      fr(g, "#8c5a2a", x + 3, y + 7, 4, 1); fr(g, "#4a2f1a", x + 11, y + 6, 2, 2);
    } else if (t === T_ICE) {
      fr(g, "#a8defa", x, y, TS, TS); fr(g, "#e4f7ff", x, y, TS, 3); fr(g, "#6cb8e0", x, y + TS - 2, TS, 2);
      fr(g, "#fff", x + 3, y + 6, 4, 1); fr(g, "#fff", x + 9, y + 9, 3, 1);
    } else if (t === T_SPRING) {
      fr(g, "#555", x + 2, y + 13, 12, 3); fr(g, "#c8c8c8", x + 4, y + 8, 8, 2); fr(g, "#c8c8c8", x + 4, y + 11, 8, 2);
      fr(g, "#e0463c", x + 1, y + 4, 14, 4); fr(g, "#ff8a7a", x + 2, y + 4, 12, 1);
    } else if (t === T_SPIKE) {
      g.save(); g.translate(x + TS / 2, y + TS / 2); g.rotate((dir % 4) * Math.PI / 2); g.translate(-TS / 2, -TS / 2);
      fr(g, "#555b66", 0, 12, TS, 4);
      g.fillStyle = "#d8dde6";
      for (var k = 0; k < 2; k++) { g.beginPath(); g.moveTo(k * 8 + 0.5, 12); g.lineTo(k * 8 + 4, 2); g.lineTo(k * 8 + 7.5, 12); g.closePath(); g.fill(); }
      g.fillStyle = "#8a93a3"; g.fillRect(3, 6, 1, 6); g.fillRect(11, 6, 1, 6);
      g.restore();
    } else if (t === T_CANNON) {
      g.save(); g.translate(x + TS / 2, y + TS / 2); g.rotate((dir % 4) * Math.PI / 2); g.translate(-TS / 2, -TS / 2);
      fr(g, "#3c3f48", 1, 4, 14, 8); fr(g, "#5b5f6b", 1, 4, 14, 2); fr(g, "#22242a", 12, 5, 4, 6);
      fr(g, "#8c5a2a", 3, 12, 4, 3); fr(g, "#8c5a2a", 9, 12, 4, 3);
      g.restore();
    }
  }
  function drawSaw(g, x, y, a, rad) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = "#c9ced8"; g.beginPath();
    for (var i = 0; i < 16; i++) { var an = i / 16 * Math.PI * 2, rr = i % 2 ? rad - 2 : rad + 1; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    g.closePath(); g.fill();
    g.fillStyle = "#8a93a3"; g.beginPath(); g.arc(0, 0, rad - 4, 0, 7); g.fill();
    g.fillStyle = "#e0463c"; g.beginPath(); g.arc(0, 0, 2, 0, 7); g.fill();
    g.restore();
  }
  function drawMoverAt(g, x, y, vert) {
    fr(g, "#7a4e22", x, y + 4, 3 * TS, 6); fr(g, "#d49a58", x, y + 4, 3 * TS, 2);
    for (var i = 0; i < 3; i++) fr(g, "#3f3f48", x + i * TS + 6, y + 10, 4, 3);
  }
  function drawPieceAt(g, pc, rot, c, r, own_, alpha) {
    g.save(); g.globalAlpha = alpha === undefined ? 1 : alpha;
    var cs = cellsOf(pc, rot), i;
    if (pc.kind === "tile" || pc.kind === "spring" || pc.kind === "spike" || pc.kind === "cannon") {
      for (i = 0; i < cs.length; i++) drawTile(g, pc.tile, (c + cs[i][0]) * TS, (r + cs[i][1]) * TS, rot, 0, 0);
    } else if (pc.kind === "saw") drawSaw(g, (c + 1) * TS, (r + 1) * TS, time * 9, 7.5);
    else if (pc.kind === "mover") {
      g.globalAlpha *= 0.35;
      for (i = 0; i < cs.length; i++) fr(g, "#fff", (c + cs[i][0]) * TS + 1, (r + cs[i][1]) * TS + 1, TS - 2, TS - 2);
      g.globalAlpha = alpha === undefined ? 1 : alpha;
      drawMoverAt(g, c * TS, r * TS, rot % 2);
    }
    g.restore();
  }
  function drawPreview(canvas, pc) {
    var g = canvas.getContext("2d"), rot = 0;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var cs = cellsOf(pc, rot), mw = 0, mh = 0;
    cs.forEach(function (c) { mw = Math.max(mw, c[0] + 1); mh = Math.max(mh, c[1] + 1); });
    var s = Math.min(canvas.width / (mw * TS), canvas.height / (mh * TS), 1.4);
    g.save(); g.translate((canvas.width - mw * TS * s) / 2, (canvas.height - mh * TS * s) / 2); g.scale(s, s);
    g.imageSmoothingEnabled = false;
    drawPieceAt(g, pc, rot, 0, 0, 0, 1);
    g.restore();
  }

  function drawSquirrel(g, p, ghostAlpha) {
    var x = Math.round(p.x), y = Math.round(p.y), f = p.face, col = p.col;
    g.save(); g.globalAlpha = ghostAlpha === undefined ? 1 : ghostAlpha;
    var run = Math.abs(p.vx) > 10 && p.onGround, step = run ? Math.floor(p.anim) % 2 : 0;
    var air = !p.onGround;
    // queue
    var tx = f > 0 ? x - 5 : x + p.w, sway = air ? 0 : (run ? step : 0);
    fr(g, col.dark, tx, y + 1 + sway, 5, 9); fr(g, col.body, tx + (f > 0 ? 1 : 0), y + sway, 4, 8); fr(g, col.belly, tx + (f > 0 ? 1 : 0), y + sway, 2, 2);
    // corps
    fr(g, col.body, x + 1, y + 5, 8, 6);
    fr(g, col.belly, f > 0 ? x + 5 : x + 2, y + 7, 3, 4);
    // tête
    var hx = f > 0 ? x + 3 : x;
    fr(g, col.body, hx, y + 1, 7, 6);
    fr(g, col.dark, hx + (f > 0 ? 1 : 4), y - 1, 2, 3); // oreille
    fr(g, "#fff", hx + (f > 0 ? 4 : 1), y + 2, 2, 2); fr(g, "#222", hx + (f > 0 ? 5 : 1), y + 3, 1, 1);
    fr(g, "#3a2414", hx + (f > 0 ? 6 : 0), y + 4, 1, 1);
    // pattes
    var l1 = air ? 2 : (run ? (step ? 0 : 2) : 1), l2 = air ? 0 : (run ? (step ? 2 : 0) : 1);
    fr(g, col.dark, x + 2 + l1 * 0, y + 11, 2, 2); fr(g, col.dark, x + 6, y + 11, 2, 2);
    if (run) { fr(g, col.dark, x + 2 + (step ? 1 : -1), y + 11, 2, 2); fr(g, col.dark, x + 6 + (step ? -1 : 1), y + 11, 2, 2); }
    g.restore();
  }
  function drawFlag(g) {
    var x = FLAG_C * TS, y = (GROUND - 3) * TS;
    fr(g, "#e8e8e8", x + 1, y, 2, 3 * TS); fr(g, "#999", x + 1, y, 2, 2);
    var w = Math.sin(time * 5) * 1.5;
    g.fillStyle = "#e0463c"; g.beginPath(); g.moveTo(x + 3, y + 2); g.lineTo(x + 17 + w, y + 6); g.lineTo(x + 3, y + 11); g.closePath(); g.fill();
    // gland sur le drapeau
    fr(g, "#f2d48a", x + 7, y + 5, 3, 3);
  }

  function render() {
    var g = cx;
    var dpr = window.devicePixelRatio || 1;
    var cw = cv.width, ch = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#14231a"; g.fillRect(0, 0, cw, ch);
    g.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    g.imageSmoothingEnabled = false;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    // ciel
    var sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#8fd0f0"); sk.addColorStop(1, "#d8f1ff");
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    // nuages & collines
    g.fillStyle = "rgba(255,255,255,.8)";
    for (var n = 0; n < 5; n++) { var cxp = ((n * 170 + time * 4) % (W + 80)) - 40, cyp = 24 + (n * 37) % 90; g.fillRect(cxp, cyp, 44, 8); g.fillRect(cxp + 8, cyp - 6, 26, 8); }
    g.fillStyle = "#a6d6a0"; for (var hx = 0; hx < W; hx += 4) g.fillRect(hx, GROUND * TS - 40 - Math.sin(hx * 0.02) * 16 - Math.sin(hx * 0.05) * 6, 4, 80);
    if (grid) {
      // aide à la pose : grille
      if (phase === "place") {
        g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1; g.beginPath();
        for (var gx = 0; gx <= COLS; gx++) { g.moveTo(gx * TS + .5, 0); g.lineTo(gx * TS + .5, H); }
        for (var gy = 0; gy <= ROWS; gy++) { g.moveTo(0, gy * TS + .5); g.lineTo(W, gy * TS + .5); }
        g.stroke();
        g.fillStyle = "rgba(255,210,87,.18)";
        for (var rr = GROUND - 6; rr < GROUND; rr++) { g.fillRect(0, rr * TS, 6 * TS, TS); g.fillRect(34 * TS, rr * TS, 6 * TS, TS); }
      }
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var t = grid[ix(c, r)];
        if (t) drawTile(g, t, c * TS, r * TS, dirs[ix(c, r)], c, r);
      }
      // pointe d'un pit : liquide sombre
      pits.forEach(function (pt) { fr(g, "rgba(30,20,10,.35)", pt * TS, (GROUND + 2) * TS, 3 * TS, ROWS * TS); });
      movers.forEach(function (m) { drawMoverAt(g, m.x, m.y, m.vert); });
      saws.forEach(function (s) { drawSaw(g, s.x, s.y, s.a, s.rad); });
      arrows.forEach(function (a) {
        g.save(); g.translate(a.x, a.y); g.rotate(Math.atan2(a.vy, a.vx));
        fr(g, "#8c5a2a", -4, -2, 8, 4); fr(g, "#f2d48a", 0, -2, 4, 4); fr(g, "#5a3a14", -4, -1, 2, 2);
        g.restore();
      });
    }
    drawFlag(g);
    // joueurs
    players.forEach(function (p) {
      if (phase === "menu" || phase === "place" || phase === "pick" || phase === "pickdone") { drawSquirrel(g, Object.assign({}, p, { x: 14 + p.id * 14, y: (GROUND - 1) * TS - PLAYER_H + 1, vx: 0, onGround: true, face: 1 }), 1); return; }
      if (p.alive) drawSquirrel(g, p, 1);
    });
    // fantômes de pose
    if (phase === "place") {
      players.forEach(function (p) {
        var gh = p.ghost; if (!gh || gh.placed) return;
        var ok = canPlace(p.piece, gh.rot, gh.c, gh.r);
        drawPieceAt(g, p.piece, gh.rot, gh.c, gh.r, p.id, p.human ? 0.85 : 0.45);
        var cs = cellsOf(p.piece, gh.rot);
        g.fillStyle = ok ? "rgba(90,200,90,.28)" : "rgba(230,60,60,.4)";
        cs.forEach(function (q) { g.fillRect((gh.c + q[0]) * TS, (gh.r + q[1]) * TS, TS, TS); });
        g.strokeStyle = p.col.body; g.lineWidth = 2;
        cs.forEach(function (q) { g.strokeRect((gh.c + q[0]) * TS + 1, (gh.r + q[1]) * TS + 1, TS - 2, TS - 2); });
        g.fillStyle = p.col.body; g.fillRect(gh.c * TS, gh.r * TS - 10, 20, 8);
        g.fillStyle = "#fff"; g.font = "bold 7px sans-serif"; g.fillText(p.col.name.slice(0, 4), gh.c * TS + 2, gh.r * TS - 4);
      });
    }
    parts.forEach(function (q) { fr(g, q.c, q.x, q.y, q.s, q.s); });
    g.restore();
    // HUD
    g.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    drawHud(g);
  }

  function text(g, s, x, y, size, col, align) {
    g.font = "900 " + size + "px Nunito, sans-serif"; g.textAlign = align || "left"; g.textBaseline = "middle";
    g.fillStyle = "#2b1709"; g.fillText(s, x + 1, y + 1.5); g.fillStyle = col || "#fdf3de"; g.fillText(s, x, y);
  }
  function drawHud(g) {
    if (phase === "menu") return;
    // scores
    players.forEach(function (p, i) {
      var x = 6 + i * 74, y = 6;
      g.fillStyle = "rgba(43,23,9,.72)"; g.fillRect(x, y, 70, 18);
      fr(g, p.col.body, x + 2, y + 2, 5, 14);
      text(g, p.col.name.slice(0, 6) + (p.human ? " J" + p.human : ""), x + 10, y + 6, 7, "#fdf3de");
      text(g, p.score + "/" + cfg.target, x + 10, y + 14, 8, "#ffd257");
      if (phase === "run" || phase === "countdown") {
        if (p.done) text(g, "✔", x + 62, y + 10, 10, "#8be06b", "center");
        else if (!p.alive) text(g, "✖", x + 62, y + 10, 10, "#ff7a6a", "center");
      }
    });
    var mid = W / 2;
    if (phase === "place") text(g, "Pose : " + Math.max(0, Math.ceil(timer)) + " s", W - 8, 15, 11, "#fdf3de", "right");
    if (phase === "run") text(g, Math.max(0, Math.ceil(timer)) + " s", W - 8, 15, 11, timer < 6 ? "#ff7a6a" : "#fdf3de", "right");
    if (phase === "countdown") text(g, String(Math.max(1, Math.ceil(timer - 0.4))), mid, H * 0.35, 56, "#ffd257", "center");
    if (banner.t > 0 && banner.text) text(g, banner.text, mid, H * 0.22, 20, "#ffd257", "center");
    if (phase === "place") {
      var me = players[0];
      if (me && me.human && !me.ghost.placed) text(g, "Souris / flèches : déplacer · clic / Espace : poser · clic droit / E : tourner", mid, H - 10, 8, "#fff", "center");
      else if (me && me.ghost && me.ghost.placed) text(g, "En attente des autres…", mid, H - 10, 9, "#fff", "center");
    }
  }

  /* ------------------------------------------------------------------ entrées */
  function humanPlayersOf(code) {
    var res = [];
    players.forEach(function (p) {
      if (!p.human) return;
      var k = keysFor(p);
      for (var key in k) if (k[key].indexOf(code) >= 0) { res.push([p, key]); }
    });
    return res;
  }
  window.addEventListener("keydown", function (e) {
    if (!root.isConnected) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var code = e.code;
    if (code === "Escape") { if (phase !== "menu") { togglePause(); e.preventDefault(); } return; }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(code) >= 0 && phase !== "menu") e.preventDefault();
    down[code] = true;
    if (phase === "pick" && /^Digit[1-9]$/.test(code)) humanPick(+code.slice(5) - 1);
    if (phase === "pick" && /^Numpad[1-9]$/.test(code)) humanPick(+code.slice(6) - 1);
    if (phase === "place" && !paused) {
      humanPlayersOf(code).forEach(function (pr) {
        var p = pr[0], key = pr[1], g = p.ghost;
        if (!g || g.placed) return;
        if (key === "l") g.c = clamp(g.c - 1, -2, COLS - 1);
        else if (key === "r") g.c = clamp(g.c + 1, -2, COLS - 1);
        else if (key === "u") g.r = clamp(g.r - 1, 0, ROWS - 1);
        else if (key === "d") g.r = clamp(g.r + 1, 0, ROWS - 1);
        else if (key === "rot" && !e.repeat) { g.rot = (g.rot + 1) % 4; SFX.tick(); }
        else if (key === "ok" && !e.repeat) placeGhost(p);
      });
    }
  });
  window.addEventListener("keyup", function (e) { down[e.code] = false; });
  window.addEventListener("blur", function () { down = {}; touch.l = touch.r = touch.j = false; });

  function ptToTile(e) {
    var r = cv.getBoundingClientRect();
    var x = (e.clientX - r.left - offX) / scale, y = (e.clientY - r.top - offY) / scale;
    return { c: Math.floor(x / TS), r: Math.floor(y / TS) };
  }
  function moveGhostTo(e) {
    if (phase !== "place" || paused) return;
    var p = players[0]; if (!p || !p.human || p.ghost.placed) return;
    var t = ptToTile(e), cs = cellsOf(p.piece, p.ghost.rot), mw = 0, mh = 0;
    cs.forEach(function (c) { mw = Math.max(mw, c[0] + 1); mh = Math.max(mh, c[1] + 1); });
    p.ghost.c = clamp(t.c - Math.floor(mw / 2), -2, COLS - 1); p.ghost.r = clamp(t.r - Math.floor(mh / 2), 0, ROWS - 1);
  }
  cv.addEventListener("pointermove", moveGhostTo);
  cv.addEventListener("pointerdown", function (e) {
    moveGhostTo(e);
    if (e.pointerType === "mouse" && e.button === 0 && phase === "place" && players[0] && players[0].human) placeGhost(players[0]);
  });
  cv.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    var p = players[0];
    if (phase === "place" && p && p.human && !p.ghost.placed) { p.ghost.rot = (p.ghost.rot + 1) % 4; SFX.tick(); }
  });
  cv.addEventListener("wheel", function (e) {
    var p = players[0];
    if (phase === "place" && p && p.human && !p.ghost.placed) { e.preventDefault(); p.ghost.rot = (p.ghost.rot + (e.deltaY > 0 ? 1 : 3)) % 4; }
  }, { passive: false });

  // boutons tactiles
  function holdBtn(sel, key) {
    var b = touchBar.querySelector(sel); if (!b) return;
    function on(e) { e.preventDefault(); touch[key] = true; if (key === "j") { var p = players[0]; if (p && p.human && phase === "run") { p.in.j = 1; p.jheld = true; } } }
    function off(e) { e.preventDefault(); touch[key] = false; }
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  }
  holdBtn("[data-t=l]", "l"); holdBtn("[data-t=r]", "r"); holdBtn("[data-t=j]", "j");
  touchBar.querySelector("[data-t=rot]").addEventListener("click", function () { var p = players[0]; if (phase === "place" && p && p.human && !p.ghost.placed) { p.ghost.rot = (p.ghost.rot + 1) % 4; SFX.tick(); } });
  touchBar.querySelector("[data-t=ok]").addEventListener("click", function () { var p = players[0]; if (phase === "place" && p && p.human) placeGhost(p); });
  muteBtn.addEventListener("click", function () { muted = !muted; store("uch-mute", muted); muteBtn.textContent = muted ? "🔇" : "🔊"; });
  muteBtn.textContent = muted ? "🔇" : "🔊";
  pauseBtn.addEventListener("click", function () { togglePause(); });

  /* ------------------------------------------------------------------ plein écran + taille */
  function isFull() { return document.fullscreenElement === root || root.classList.contains("is-max"); }
  function toggleFull() {
    if (isFull()) {
      if (document.fullscreenElement) document.exitFullscreen(); root.classList.remove("is-max");
    } else if (root.requestFullscreen) root.requestFullscreen().catch(function () { root.classList.add("is-max"); });
    else root.classList.add("is-max");
    setTimeout(resize, 120);
  }
  if (fsBtn) fsBtn.addEventListener("click", toggleFull);
  if (fsExit) fsExit.addEventListener("click", toggleFull);
  document.addEventListener("fullscreenchange", function () { if (fsBtn) fsBtn.textContent = isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran"; resize(); });
  function resize() {
    var r = root.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    scale = Math.min(r.width / W, r.height / H);
    offX = (r.width - W * scale) / 2; offY = (r.height - H * scale) / 2;
  }
  window.addEventListener("resize", resize);

  /* ------------------------------------------------------------------ boucle */
  var last = 0, acc = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    acc += dt;
    while (acc >= 1 / 60) { tick(1 / 60); acc -= 1 / 60; }
    render();
    requestAnimationFrame(frame);
  }
  newLevel(); mkPlayers();
  resize();
  hud.hidden = false;
  showMenu();
  if (DEMO) { cfg.humans = 0; setTimeout(startGame, 200); }
  requestAnimationFrame(frame);

  // pour les tests
  window.UCH_DEBUG = { get state() { return { phase: phase, round: round, players: players, timer: timer }; }, tick: tick, cfg: cfg };
})();
