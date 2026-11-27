/* Bataille navale : deux versions sur la même page (onglets en haut).
   - Classique : solo contre l'ordinateur, grille 10×10, 5 navires. Par défaut ils ne se touchent pas
     (même en diagonale) ; l'option « Navires collés autorisés » lève cette règle.
   - Roguelite : une traversée de 7 étapes (~15 min). Ta flotte garde ses dégâts d'un combat à l'autre
     et chaque navire a un pouvoir tant qu'il flotte ; munitions spéciales, reliques, ports, épaves,
     ennemis à règle spéciale et le Kraken en boss.
   Trois niveaux d'IA : Facile (au hasard), Normal (chasse + cible), Difficile (carte de probabilités).
   Pensé pour mobile en portrait : un doigt suffit. Pas de dépendance. */
(function () {
  "use strict";

  var N = 10;
  var LETTERS = "ABCDEFGHIJ";
  var CLASSIC = [
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

  /* ---------- contenu du roguelite ---------- */
  // navires du joueur : chacun a un pouvoir tant qu'il flotte
  var TYPES = {
    cuirasse: { name: "Cuirassé", len: 4, ico: "🛳️", power: "Bordée", desc: "Tous les 3 tours, tu tires 2 fois." },
    fregate: { name: "Frégate radar", len: 3, ico: "📡", power: "Radar", desc: "Tes tirs normaux à l'eau indiquent combien de cases de navire les entourent." },
    sousmarin: { name: "Sous-marin", len: 3, ico: "🫧", power: "Plongée", desc: "Esquive le premier tir qui le touche à chaque combat." },
    torpilleur: { name: "Torpilleur", len: 2, ico: "🚤", power: "Torpilles", desc: "+1 torpille au début de chaque combat." },
    porteavions: { name: "Porte-avions", len: 5, ico: "✈️", power: "Reconnaissance", desc: "Tous les 4 tours, un avion révèle une zone de 3×3 sans passer ton tour.", price: 30 },
    atelier: { name: "Navire-atelier", len: 3, ico: "🔧", power: "Réparations", desc: "Après chaque combat gagné, répare une case abîmée.", price: 20 },
    mouilleur: { name: "Mouilleur de mines", len: 2, ico: "⚙️", power: "Mines", desc: "Cache 2 mines sur ta grille : l'ennemi qui tire dessus perd son tour suivant.", price: 16 }
  };
  var START_FLEET = ["cuirasse", "fregate", "sousmarin", "torpilleur"];
  var MAX_FLEET = 5;
  var AMMO = {
    tir: { name: "Tir", ico: "🎯", desc: "Un tir normal, illimité." },
    torpille: { name: "Torpille", ico: "🚀", desc: "Part de la case choisie, file vers la droite et s'arrête sur le premier navire.", price: 6 },
    bombe: { name: "Bombe", ico: "💥", desc: "Touche 5 cases en croix.", price: 8 },
    salve: { name: "Salve", ico: "🎇", desc: "3 tirs au hasard dans une zone de 3×3.", price: 6 },
    sonar: { name: "Sonar", ico: "📶", desc: "Compte les cases de navire dans une zone de 3×3. Ne passe pas ton tour.", price: 4 }
  };
  var AMMO_KEYS = ["torpille", "bombe", "salve", "sonar"];
  var RELICS = {
    longuevue: { name: "Longue-vue", ico: "🔭", desc: "Au début de chaque combat, une case de navire ennemi est repérée." },
    trefle: { name: "Trèfle à quatre feuilles", ico: "🍀", desc: "Quand un tir normal tombe à l'eau, 1 chance sur 4 de rejouer." },
    coque: { name: "Coque renforcée", ico: "🛡️", desc: "Le premier tir ennemi qui te touche à chaque combat est ignoré." },
    poudre: { name: "Poudre noire", ico: "🧨", desc: "Tes bombes touchent 9 cases (3×3) au lieu de 5." },
    butin: { name: "Coffre à butin", ico: "💰", desc: "+50 % de glands gagnés." },
    recup: { name: "Récupération", ico: "♻️", desc: "Chaque navire ennemi coulé te donne une munition au hasard." },
    canonnier: { name: "Canonnier", ico: "🎖️", desc: "Après avoir coulé un navire, tu rejoues." },
    rhum: { name: "Rhum de réserve", ico: "🍶", desc: "Au début de chaque combat, répare une case abîmée." },
    ouverture: { name: "Tir d'ouverture", ico: "🎺", desc: "Au premier tour de chaque combat, tu tires 3 fois." }
  };
  var ENEMIES = {
    pie: { name: "Capitaine Pie", ico: "🐦", rule: "", desc: "Une pirate sans règle spéciale." },
    pieuvre: { name: "La Pieuvre", ico: "🐙", rule: "pieuvre", desc: "Tous les 5 tours, elle déplace un navire que tu n'as pas encore touché." },
    hibou: { name: "Le Hibou du brouillard", ico: "🦉", rule: "brouillard", desc: "Le résultat de tes tirs reste caché jusqu'à ton tour suivant." },
    blaireau: { name: "Le Blaireau mineur", ico: "🦡", rule: "mines", desc: "3 mines cachées sur sa grille : tirer dessus abîme un de tes navires." },
    sanglier: { name: "Le Sanglier cuirassé", ico: "🐗", rule: "blindage", desc: "Son plus grand navire est blindé : chaque case demande 2 tirs." },
    kraken: { name: "Le Kraken", ico: "🦑", rule: "kraken", desc: "Un corps de 3×3 et 4 tentacules qui repoussent. Coule le corps pour gagner. Il tire 2 fois tant qu'il a 3 tentacules ou plus." }
  };
  var RULE_FOES = ["pieuvre", "hibou", "blaireau", "sanglier"];
  var NODES = {
    combat: { name: "Combat", ico: "⚔️", desc: "Un ennemi à couler. Gagne des glands et choisis une récompense." },
    elite: { name: "Élite", ico: "💀", desc: "Un ennemi plus fort, avec 5 navires. Récompense : une relique au choix." },
    port: { name: "Port", ico: "⚓", desc: "Répare ta flotte, achète des munitions, recrute un navire." },
    epave: { name: "Épave", ico: "🏴‍☠️", desc: "Fouille une épave : prudemment, ou en prenant un risque." },
    boss: { name: "Le Kraken", ico: "🦑", desc: "Le boss de la traversée." }
  };
  var STEPS = 7;

  var stage = document.getElementById("game-stage");
  if (!stage) return;
  var GK = window.GameKit || null;

  /* ---------- outils ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(list) { return list[rnd(list.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function idx(r, c) { return r * N + c; }
  function rc(i) { return [Math.floor(i / N), i % N]; }
  function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function coord(i) { var p = rc(i); return LETTERS[p[1]] + (p[0] + 1); }
  function around(i, rad) { var p = rc(i), out = []; for (var dr = -rad; dr <= rad; dr++) for (var dc = -rad; dc <= rad; dc++) { var r = p[0] + dr, c = p[1] + dc; if (inb(r, c)) out.push(idx(r, c)); } return out; }
  function haptic(k) { if (GK) GK.haptic(k); }
  function toast(msg, icon) { if (GK) GK.ui.toast(msg, { icon: icon }); }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function reduced() { return document.documentElement.classList.contains("gk-reduce-fx"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  var store = readJSON("bn-v1") || {};
  store.diff = store.diff || "normal";
  store.again = !!store.again;
  store.touch = !!store.touch;
  store.stats = store.stats || {};
  function save() { writeJSON("bn-v1", store); }

  var rstore = readJSON("bn-rogue-v1") || {};
  rstore.best = rstore.best || { runs: 0, wins: 0, step: 0, fast: 0 };
  function rsave() { writeJSON("bn-rogue-v1", rstore); }
  var R = rstore.run && !rstore.run.over ? rstore.run : null; // traversée en cours

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
    clank: function () { tone(900, 700, 0.12, 0.12, "square", 0.08); tone(1400, 1100, 0.1, 0.06, "square", 0.1); },
    ping: function () { tone(1200, 1180, 0.35, 0.08, "sine"); tone(1200, 1180, 0.3, 0.04, "sine", 0.25); },
    place: function () { tone(420, 520, 0.06, 0.06, "triangle"); },
    coin: function () { tone(880, 1320, 0.08, 0.07, "square"); tone(1320, 1760, 0.1, 0.05, "square", 0.07); },
    bad: function () { tone(180, 120, 0.12, 0.08, "square"); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, f, 0.22, 0.1, "triangle", i * 0.12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.98, 0.3, 0.1, "triangle", i * 0.16); }); }
  };

  /* ---------- modèle ---------- */
  // defs : [{ name, len, type?, shape? }] ; touch : navires collés autorisés sur cette grille
  function emptyBoard(defs, touch) {
    var b = { defs: defs, touch: !!touch, cells: [], ships: [] };
    for (var i = 0; i < N * N; i++) b.cells.push({ ship: -1, shot: false, water: false, spot: false, mine: false, armor: 0, dent: false, n: null, sonar: null, fog: false });
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
  // un navire ne doit jamais en chevaucher un autre ; sans « collés », il ne doit pas non plus en toucher un
  function canPlace(b, cells, ignore) {
    if (!cells) return false;
    var reach = b.touch ? 0 : 1;
    for (var k = 0; k < cells.length; k++) {
      var p = rc(cells[k]);
      for (var dr = -reach; dr <= reach; dr++) for (var dc = -reach; dc <= reach; dc++) {
        var r = p[0] + dr, c = p[1] + dc;
        if (!inb(r, c)) continue;
        var s = b.cells[idx(r, c)].ship;
        if (s !== -1 && s !== ignore) return false;
      }
    }
    return true;
  }
  function putShip(b, si, cells, vert, dmg) {
    var sh = b.ships[si];
    if (sh && sh.cells) sh.cells.forEach(function (i) { b.cells[i].ship = -1; });
    var d = b.defs[si];
    b.ships[si] = { name: d.name, len: d.len, type: d.type || "", shape: d.shape || "", cells: cells, vert: vert, dmg: dmg ? dmg.slice() : cells.map(function () { return false; }), sunk: false };
    cells.forEach(function (i) { b.cells[i].ship = si; });
  }
  function liftShip(b, si) {
    var sh = b.ships[si];
    if (!sh || !sh.cells) return;
    sh.cells.forEach(function (i) { b.cells[i].ship = -1; });
    b.ships[si] = null;
  }
  function randomPlace(b, si, keepDmg, filter) {
    var d = b.defs[si];
    for (var a = 0; a < 400; a++) {
      var vert = Math.random() < 0.5, cells = shipCells(rnd(N), rnd(N), d.len, vert);
      if (!canPlace(b, cells, si)) continue;
      if (filter && !cells.every(filter)) continue;
      putShip(b, si, cells, vert, keepDmg);
      return true;
    }
    return false;
  }
  function randomFleet(defs, touch, dmgs) {
    for (var tries = 0; tries < 200; tries++) {
      var b = emptyBoard(defs, touch), ok = true;
      for (var si = 0; si < defs.length && ok; si++) ok = randomPlace(b, si, dmgs && dmgs[si]);
      if (ok) return b;
    }
    return null;
  }
  function fleetValid(b) {
    for (var si = 0; si < b.defs.length; si++) if (!b.ships[si] || !canPlace(b, b.ships[si].cells, si)) return false;
    return true;
  }
  function allPlaced(b) { for (var i = 0; i < b.defs.length; i++) if (!b.ships[i]) return false; return true; }
  function aliveCount(b) { return b.ships.filter(function (s) { return s && !s.sunk && !s.wreck; }).length; }
  function shipsOf(b) { return b.ships.filter(function (s) { return s && !s.wreck; }); }

  function sinkShip(b, sh) {
    sh.sunk = true;
    // un navire coulé est entièrement révélé ; sans « collés », les cases autour sont forcément de l'eau
    sh.cells.forEach(function (j) { b.cells[j].shot = true; b.cells[j].spot = false; });
    if (b.touch) return;
    sh.cells.forEach(function (j) {
      around(j, 1).forEach(function (k) { var cc = b.cells[k]; if (cc.ship === -1 && !cc.shot) { cc.water = true; cc.spot = false; } });
    });
  }
  // tir : renvoie { res: "miss" | "hit" | "sunk" | "armor" | "mine" | "again", ship }
  function fireAt(b, i) {
    var cell = b.cells[i];
    if (cell.shot || cell.water) return { res: "again" };
    if (cell.armor > 0) { cell.armor--; cell.dent = true; return { res: "armor", ship: b.ships[cell.ship] }; }
    cell.shot = true; cell.spot = false; cell.fog = false;
    if (cell.ship === -1) return { res: cell.mine ? "mine" : "miss" };
    var sh = b.ships[cell.ship];
    sh.dmg[sh.cells.indexOf(i)] = true;
    if (sh.dmg.every(Boolean)) { sinkShip(b, sh); return { res: "sunk", ship: sh }; }
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
  function remainingLens(b) { return shipsOf(b).filter(function (s) { return !s.sunk; }).map(function (s) { return s.len; }); }
  function unknowns(k) { var out = []; for (var i = 0; i < k.length; i++) if (k[i] === "u") out.push(i); return out; }
  function neighbors4(i) {
    var p = rc(i), out = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { var r = p[0] + d[0], c = p[1] + d[1]; if (inb(r, c)) out.push(idx(r, c)); });
    return out;
  }
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
  function aiMove(b, level) {
    if (!unknowns(aiKnown(b)).length) return -1;
    return level === "easy" ? aiEasy(b) : level === "hard" ? aiHard(b) : aiNormal(b);
  }

  /* ---------- état de la partie ---------- */
  var MODE_KEY = "bn-mode";
  var G = {
    mode: "classic", // classic | rogue
    phase: "menu", // menu | place | battle | over | camp (roguelite : carte, récompenses, port…)
    me: emptyBoard(CLASSIC, store.touch),
    foe: null,
    sel: 0, vert: false,
    turn: "me", busy: false,
    shots: 0, hits: 0, foeShots: 0, t0: 0,
    lastMe: -1, lastFoe: -1,
    paused: false,
    touch: store.touch,
    ai: "normal",
    // roguelite, propre au combat en cours
    node: null, enemy: null, ammo: "tir", shotsLeft: 1, turnNo: 0,
    subDodged: false, coqueUsed: false, skipFoe: false, reconCd: 0, sunkNow: 0
  };
  try { G.mode = localStorage.getItem(MODE_KEY) === "rogue" ? "rogue" : "classic"; } catch (e) {}
  function has(rel) { return !!(R && R.relics.indexOf(rel) >= 0); }
  function alive(type) { return !!(G.me && G.me.ships.some(function (s) { return s && s.type === type && !s.sunk; })); }

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
        '<h2 class="bn-title"><span data-foe-name>Grille ennemie</span><span class="bn-count" data-count="foe"></span></h2>' +
        '<div class="bn-board bn-foe" role="grid" aria-label="Grille ennemie : touche une case pour tirer"></div>' +
        '<div class="bn-ammo" role="group" aria-label="Munitions"></div>' +
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
  var ammoEl = $(".bn-ammo", root);
  var foeNameEl = $("[data-foe-name]", root);

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
  var EMPTY = emptyBoard([], false);
  var cellCache = { foe: [], me: [] };
  $$(".bn-cell", foeEl).forEach(function (e) { cellCache.foe[+e.dataset.i] = e; });
  $$(".bn-cell", meEl).forEach(function (e) { cellCache.me[+e.dataset.i] = e; });
  function cellEl(host, i) { return cellCache[host === foeEl ? "foe" : "me"][i]; }

  function shipShape(sh, i) {
    if (sh.shape === "body") return " krk";
    var pos = sh.cells.indexOf(i), cls = sh.vert ? " v" : " h";
    if (pos === 0) cls += " s0";
    if (pos === sh.cells.length - 1) cls += " s1";
    return cls;
  }

  function paintBoard(host, b, who) {
    var showShips = who === "me" || G.phase === "over";
    for (var i = 0; i < N * N; i++) {
      var c = b.cells[i], e = cellEl(host, i), cls = "bn-cell", txt = "";
      var sh = c.ship >= 0 ? b.ships[c.ship] : null;
      var label = coord(i);
      if (c.fog) {
        cls += " fog"; txt = "?"; label += ", résultat caché";
      } else {
        if (sh && (showShips || sh.sunk)) {
          cls += " ship" + shipShape(sh, i);
          if (sh.sunk) cls += " sunk";
          if (who === "me" && !c.shot && sh.dmg[sh.cells.indexOf(i)]) { cls += " dmg"; label += ", abîmé"; }
        }
        if (c.shot && c.ship === -1) {
          cls += c.mine ? " mine boom" : " miss"; label += c.mine ? ", mine" : ", à l'eau";
          if (c.n != null) { txt = String(c.n); cls += " num"; }
        } else if (c.shot) { cls += " hit"; label += sh && sh.sunk ? ", coulé" : ", touché"; }
        else if (c.water) { cls += " water"; label += ", eau"; }
        if (!c.shot && c.spot) { cls += " spot"; label += ", repéré"; }
        if (!c.shot && c.dent) { cls += " dent"; label += ", blindage entamé"; }
        if (who === "me" && c.mine && !c.shot) { cls += " mymine"; label += ", ta mine"; }
        if (!c.shot && c.sonar != null) { txt = String(c.sonar); cls += " sonar"; label += ", sonar : " + c.sonar; }
      }
      if (who === "foe" && (c.shot || c.water)) cls += " done";
      if ((who === "foe" && i === G.lastMe) || (who === "me" && i === G.lastFoe)) cls += " last";
      if (who === "me" && G.phase === "place" && c.ship === G.sel) cls += " picked";
      var fx = (e.className.match(/ fx-\w+/g) || []).join("");
      if (e.className !== cls + fx) e.className = cls + fx;
      if (e.textContent !== txt) e.textContent = txt;
      e.setAttribute("aria-label", label);
    }
  }

  function pipsHTML(len, dmg) {
    var s = ""; for (var k = 0; k < len; k++) s += "<i" + (dmg && dmg[k] ? ' class="d"' : "") + "></i>";
    return '<span class="bn-pips">' + s + "</span>";
  }
  function renderFleet() {
    if (!G.foe) { fleetEl.innerHTML = ""; return; }
    if (G.enemy === "kraken") {
      var body = G.foe.ships[0], tent = G.foe.ships.filter(function (s) { return s && s.shape === "tentacle" && !s.wreck; });
      var aliveT = tent.filter(function (s) { return !s.sunk; }).length;
      fleetEl.innerHTML = '<li class="' + (body.sunk ? "sunk" : "") + '">' + pipsHTML(9) + '<span class="bn-sname">Corps du Kraken</span></li>' +
        '<li>' + pipsHTML(2) + '<span class="bn-sname">Tentacules : ' + aliveT + "/4</span></li>";
      return;
    }
    fleetEl.innerHTML = shipsOf(G.foe).map(function (s) {
      return '<li class="' + (s.sunk ? "sunk" : "") + '">' + pipsHTML(s.len) + '<span class="bn-sname">' + s.name + "</span></li>";
    }).join("");
  }
  function renderTray() {
    trayEl.innerHTML = G.me.defs.map(function (f, si) {
      var placed = !!G.me.ships[si];
      return '<li><button type="button" class="bn-ship' + (placed ? " placed" : "") + (G.sel === si ? " on" : "") + '" data-ship="' + si + '" aria-pressed="' + (G.sel === si) + '">' +
        pipsHTML(f.len, f.dmg) + '<span class="bn-sname">' + (f.type ? TYPES[f.type].ico + " " : "") + f.name + (placed ? " ✓" : "") + "</span></button></li>";
    }).join("");
    goBtn.disabled = !allPlaced(G.me);
  }
  function renderAmmo() {
    if (G.mode !== "rogue" || !R || G.phase !== "battle") { ammoEl.innerHTML = ""; return; }
    var html = btnAmmo("tir", "∞");
    AMMO_KEYS.forEach(function (k) { html += btnAmmo(k, R.ammo[k] || 0); });
    if (alive("porteavions")) html += btnAmmo("recon", G.reconCd > 0 ? G.reconCd : "✓");
    ammoEl.innerHTML = html;
  }
  function btnAmmo(k, n) {
    var a = k === "recon" ? { name: "Avion", ico: "✈️", desc: TYPES.porteavions.desc } : AMMO[k];
    var off = k === "recon" ? G.reconCd > 0 : k !== "tir" && !(R.ammo[k] > 0);
    return '<button type="button" class="bn-ammo-btn' + (G.ammo === k ? " on" : "") + '" data-ammo="' + k + '"' + (off ? " disabled" : "") +
      ' aria-pressed="' + (G.ammo === k) + '" title="' + esc(a.name + " : " + a.desc) + '"><span aria-hidden="true">' + a.ico + '</span><b>' + n + '</b><span class="visually-hidden">' + a.name + "</span></button>";
  }
  function setStatus(txt, tone) { statusEl.textContent = txt; statusEl.dataset.tone = tone || ""; }
  function counts() {
    $('[data-count="me"]', root).textContent = G.phase === "place" || G.phase === "camp" ? "" : aliveCount(G.me) + "/" + shipsOf(G.me).length;
    var fc = "";
    if (G.foe && G.enemy !== "kraken") fc = aliveCount(G.foe) + "/" + shipsOf(G.foe).length;
    $('[data-count="foe"]', root).textContent = fc;
    foeNameEl.textContent = G.mode === "rogue" && G.enemy ? ENEMIES[G.enemy].ico + " " + ENEMIES[G.enemy].name : "Grille ennemie";
  }

  function render() {
    root.dataset.phase = G.phase;
    root.dataset.turn = G.turn;
    root.dataset.mode = G.mode;
    paintBoard(meEl, G.me, "me");
    paintBoard(foeEl, G.foe || EMPTY, "foe");
    renderFleet();
    if (G.phase === "place") renderTray();
    renderAmmo();
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
    var ammoH = ammoEl.offsetHeight ? ammoEl.offsetHeight + 6 : 0;
    if (G.phase === "place") {
      var toolsH = toolsEl.offsetHeight || 220;
      if (wide) big = Math.min((aw - 250) / L, (ah - title) / L);
      else big = Math.min(aw / L, (ah - title - toolsH - 12) / L);
      small = big;
    } else if (wide) {
      // deux grilles côte à côte, la liste des navires sous la grille perso
      big = Math.min((aw - 24) / (2 * L), (ah - title - 84) / L, (ah - title - ammoH) / L);
      small = big;
    } else {
      // portrait : grande grille ennemie, petite grille perso à côté de la liste des navires
      big = Math.min(aw / L, (ah - title * 2 - 14 - ammoH) / (L * 1.42));
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
    var p = rc(i), len = G.me.defs[G.sel].len;
    var r = p[0], c = p[1];
    // si le navire dépasse du bord, on le recale à l'intérieur
    if (G.vert) r = Math.min(r, N - len); else c = Math.min(c, N - len);
    return shipCells(r, c, len, G.vert);
  }
  function clearPreview() {
    $$(".pv, .pv-bad", meEl).forEach(function (e) { e.classList.remove("pv", "pv-bad"); });
  }
  function showPreview(i) {
    clearPreview();
    if (G.phase !== "place" || G.sel < 0 || i < 0 || G.me.cells[i].ship >= 0) return;
    var cells = previewCells(i), ok = canPlace(G.me, cells, G.sel);
    cells.forEach(function (j) { cellEl(meEl, j).classList.add(ok ? "pv" : "pv-bad"); });
  }
  function nextUnplaced(from) {
    var n = G.me.defs.length;
    for (var k = 0; k < n; k++) { var si = (from + k) % n; if (!G.me.ships[si]) return si; }
    return -1;
  }
  function defDmg(si) { return G.me.defs[si].dmg || null; }
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
      toast(G.me.touch ? "Ce navire chevauche un autre navire." : "Les navires ne doivent pas se toucher, même en diagonale.", "⚠️");
      return;
    }
    putShip(G.me, G.sel, cells, G.vert, defDmg(G.sel));
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
    G.me = randomFleet(G.me.defs, G.me.touch, G.me.defs.map(function (d) { return d.dmg; }));
    G.sel = -1;
    sfx.place(); haptic("tap");
    render();
  }
  function clearFleet() {
    G.me = emptyBoard(G.me.defs, G.me.touch);
    G.sel = 0;
    render();
  }

  /* ---------- version classique ---------- */
  function startPlacement(keep) {
    G.mode = "classic"; G.enemy = null;
    G.touch = store.touch;
    var old = G.me;
    // une flotte collée n'est plus valable si on réactive la règle « ne se touchent pas »
    if (!keep || !old || old.defs !== CLASSIC || !allPlaced(old)) G.me = emptyBoard(CLASSIC, G.touch);
    else {
      G.me = emptyBoard(CLASSIC, G.touch);
      old.ships.forEach(function (s, si) { putShip(G.me, si, s.cells, s.vert); });
      if (!fleetValid(G.me)) G.me = emptyBoard(CLASSIC, G.touch);
    }
    G.foe = null; G.sel = nextUnplaced(0); G.lastMe = G.lastFoe = -1;
    G.phase = "place";
    hideOverlay();
    setStatus("Place ta flotte (" + diffLabel() + ")");
    render();
  }
  function beginBattle() {
    G.phase = "battle";
    G.shots = G.hits = G.foeShots = 0;
    G.t0 = Date.now();
    G.busy = false;
    G.ammo = "tir";
    render();
    haptic("success");
  }
  function startBattle() {
    if (!allPlaced(G.me)) return;
    clearPreview();
    if (G.mode === "rogue") return startRogueBattle();
    G.foe = randomFleet(CLASSIC, G.touch);
    G.ai = store.diff;
    G.turn = Math.random() < 0.5 ? "me" : "foe";
    beginBattle();
    if (G.turn === "me") { setStatus("À toi de tirer !", "me"); focusFoe(); }
    else { setStatus("L'ennemi commence…", "foe"); G.busy = true; setTimeout(foeTurn, 900); }
  }
  function diffLabel() { for (var k = 0; k < DIFFS.length; k++) if (DIFFS[k].id === store.diff) return DIFFS[k].label; return ""; }

  function classicFire(i) {
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
      toFoe();
    }, out.res === "miss" ? 450 : 750);
  }
  function toFoe() {
    G.turn = "foe"; render();
    setStatus("L'ennemi vise…", "foe");
    setTimeout(foeTurn, 500);
  }
  function foeTurn() {
    if (G.phase !== "battle") return;
    if (G.paused) { setTimeout(foeTurn, 300); return; }
    if (G.mode === "rogue") return rogueFoeTurn();
    var i = aiMove(G.me, G.ai);
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
      setStatus(mine ? "À l'eau (" + where + ")" : "L'ennemi tire en " + where + " : à l'eau", mine ? "me" : "foe");
    } else if (out.res === "hit") {
      fx(host, i, "boom"); sfx.hit(); haptic("hit");
      setStatus(mine ? "Touché en " + where + " !" : "L'ennemi te touche en " + where + " !", mine ? "good" : "bad");
    } else if (out.res === "sunk") {
      fx(host, i, "boom"); sfx.sunk(); haptic("success"); shakeEl(host);
      var nm = out.ship.shape === "tentacle" ? "Tentacule" : out.ship.shape === "body" ? "Kraken" : out.ship.name;
      setStatus(mine ? "Coulé ! " + nm + " ennemi au fond." : "Ton " + nm.toLowerCase() + " est coulé…", mine ? "good" : "bad");
      toast(mine ? nm + " ennemi coulé !" : "Ton " + nm.toLowerCase() + " a coulé", mine ? "💥" : "🌊");
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
        statsHTML([["Tirs", G.shots], ["Précision", acc + " %"], ["Durée", mmss(secs)]]) +
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
  function statsHTML(list) {
    return '<dl class="bn-stats">' + list.map(function (s) { return "<div><dt>" + s[0] + "</dt><dd>" + s[1] + "</dd></div>"; }).join("") + "</dl>";
  }

  /* =====================================================================
     ROGUELITE
     ===================================================================== */
  function newRun() {
    R = {
      step: 0, // étape à jouer (0..STEPS-1)
      fleet: START_FLEET.map(function (t) { return { type: t, dmg: null, pos: null }; }),
      relics: [], ammo: { torpille: 1, bombe: 1, salve: 1, sonar: 2 }, glands: 10,
      at: null, options: null, lastFoe: "", stats: { won: 0, sunk: 0, shots: 0, hits: 0 }, secs: 0, over: false
    };
    R.options = genOptions(0);
    rstore.best.runs++;
    rstore.run = R; rsave();
  }
  function rpersist() { if (R) { rstore.run = R; rsave(); } }
  // temps de jeu actif de la traversée
  setInterval(function () { if (R && !R.over && G.mode === "rogue" && G.phase !== "menu" && !G.paused && !document.hidden) R.secs++; }, 1000);

  function genOptions(step) {
    if (step === 0) return [{ type: "combat" }];
    if (step === STEPS - 1) return [{ type: "boss" }];
    var pool = [["combat", 44], ["port", step >= 2 ? 22 : 10], ["epave", 16]];
    if (step >= 2) pool.push(["elite", 20]);
    if (step === STEPS - 2) pool = pool.map(function (p) { return p[0] === "port" ? [p[0], 40] : p; });
    function draw(excl) {
      var list = pool.filter(function (p) { return p[0] !== excl; }), tot = 0;
      list.forEach(function (p) { tot += p[1]; });
      var x = Math.random() * tot;
      for (var k = 0; k < list.length; k++) { x -= list[k][1]; if (x <= 0) return list[k][0]; }
      return list[0][0];
    }
    var a = draw(""), b = draw(a);
    return [{ type: a }, { type: b }];
  }
  function fleetDefs() {
    return R.fleet.map(function (f) { var t = TYPES[f.type]; return { name: t.name, len: t.len, type: f.type, dmg: f.dmg }; });
  }
  function foeDefsFor(node) {
    var lens = node.type === "elite" || R.step >= 4 ? [5, 4, 3, 3, 2] : R.step >= 2 ? [4, 3, 3, 2] : [4, 3, 2];
    var names = { 5: "Porte-avions", 4: "Croiseur", 3: "Contre-torpilleur", 2: "Torpilleur" }, seen3 = false;
    return lens.map(function (l) { var n = names[l]; if (l === 3) { if (seen3) n = "Sous-marin"; seen3 = true; } return { name: n, len: l }; });
  }
  function enemyFor(node) {
    if (node.type === "boss") return "kraken";
    if (node.type === "elite") return pick(RULE_FOES);
    if (R.step === 0) return "pie";
    return pick(["pie"].concat(RULE_FOES).filter(function (e) { return e !== R.lastFoe; }));
  }
  function aiFor(node) {
    if (node.type === "elite") return "hard";
    if (node.type === "boss") return "normal";
    return R.step <= 1 ? "easy" : "normal";
  }
  function krakenBoard() {
    var defs = [{ name: "Corps du Kraken", len: 9, shape: "body" }];
    for (var t = 0; t < 4; t++) defs.push({ name: "Tentacule", len: 2, shape: "tentacle" });
    var b = emptyBoard(defs, true);
    var r0 = rnd(N - 2), c0 = rnd(N - 2), body = [];
    for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) body.push(idx(r0 + dr, c0 + dc));
    putShip(b, 0, body, false);
    for (var si = 1; si < defs.length; si++) randomPlace(b, si);
    return b;
  }

  /* ---------- écrans de la traversée ---------- */
  function runSummary() {
    var fleet = R.fleet.map(function (f) {
      var t = TYPES[f.type];
      return '<li><span class="bn-fs-ico" aria-hidden="true">' + t.ico + '</span><span class="bn-fs-txt"><strong>' + t.name + "</strong> " + pipsHTML(t.len, f.dmg) +
        '<small>' + t.power + " : " + t.desc + "</small></span></li>";
    }).join("");
    var relics = R.relics.length ? R.relics.map(function (k) { var r = RELICS[k]; return '<li title="' + esc(r.desc) + '"><span aria-hidden="true">' + r.ico + "</span> " + r.name + "<small>" + r.desc + "</small></li>"; }).join("") : '<li class="bn-none">Aucune pour l\'instant.</li>';
    var ammo = AMMO_KEYS.map(function (k) { return '<span title="' + esc(AMMO[k].desc) + '">' + AMMO[k].ico + " " + AMMO[k].name + " ×" + (R.ammo[k] || 0) + "</span>"; }).join("");
    return '<details class="bn-run"><summary>Ta flotte, tes reliques, tes munitions</summary>' +
      '<ul class="bn-fs">' + fleet + "</ul>" +
      '<p class="bn-run-h">Reliques</p><ul class="bn-relics">' + relics + "</ul>" +
      '<p class="bn-run-h">Munitions</p><p class="bn-ammo-list">' + ammo + "</p></details>";
  }
  function trackHTML() {
    var s = "";
    for (var k = 0; k < STEPS; k++) s += '<i class="' + (k < R.step ? "done" : k === R.step ? "now" : "") + (k === STEPS - 1 ? " boss" : "") + '"></i>';
    return '<div class="bn-track" aria-label="Étape ' + (R.step + 1) + " sur " + STEPS + '">' + s + "</div>";
  }
  function headHTML(title) {
    return '<p class="bn-kick">Étape ' + (R.step + 1) + "/" + STEPS + ' · <span class="bn-glands">🌰 ' + R.glands + "</span></p>" + trackHTML() + "<h2>" + title + "</h2>";
  }
  function showMap() {
    G.phase = "camp"; G.paused = false; G.foe = null; G.enemy = null;
    R.at = null; rpersist();
    setStatus("Traversée · étape " + (R.step + 1) + "/" + STEPS);
    render();
    var opts = R.options.map(function (o, k) {
      var nd = NODES[o.type];
      return '<button type="button" class="bn-route bn-route-' + o.type + '" data-route="' + k + '"><span class="bn-route-ico" aria-hidden="true">' + nd.ico + '</span><strong>' + nd.name + "</strong><small>" + nd.desc + "</small></button>";
    }).join("");
    showOverlay(
      headHTML(R.options.length > 1 ? "Choisis ta route" : R.step === STEPS - 1 ? "Le repaire du Kraken" : "Cap au large") +
      '<div class="bn-routes' + (R.options.length > 1 ? "" : " one") + '">' + opts + "</div>" +
      runSummary() +
      '<div class="bn-card-btns bn-card-small"><button class="btn btn-ghost btn-small" type="button" data-act="rabandon">Abandonner la traversée</button></div>'
    );
  }
  function goNode(k) {
    var node = R.options[k];
    if (!node) return;
    R.at = { type: node.type };
    if (node.type === "port") return showPort();
    if (node.type === "epave") return showWreck();
    R.at.enemy = enemyFor(node);
    R.at.ai = aiFor(node);
    rpersist();
    startRogueCombat();
  }
  function nextStep() {
    R.step++;
    R.at = null;
    R.options = genOptions(R.step);
    rpersist();
    showMap();
  }

  /* ---------- combat roguelite ---------- */
  function startRogueCombat() {
    G.mode = "rogue";
    G.enemy = R.at.enemy; G.ai = R.at.ai;
    var defs = fleetDefs();
    G.me = emptyBoard(defs, false);
    // on remet la flotte là où elle était au combat précédent, si c'est encore possible
    R.fleet.forEach(function (f, si) { if (f.pos && canPlace(G.me, f.pos.cells, si) && f.pos.cells.length === defs[si].len) putShip(G.me, si, f.pos.cells, f.pos.vert, f.dmg); });
    G.foe = null; G.sel = nextUnplaced(0); G.lastMe = G.lastFoe = -1;
    G.phase = "place";
    hideOverlay();
    var en = ENEMIES[G.enemy];
    setStatus("Place ta flotte · " + en.ico + " " + en.name);
    render();
    toast(en.name + " : " + en.desc, en.ico);
  }
  function startRogueBattle() {
    // la position de chaque navire est gardée pour le combat suivant
    R.fleet.forEach(function (f, si) { var s = G.me.ships[si]; f.pos = { cells: s.cells.slice(), vert: s.vert }; });
    G.foe = G.enemy === "kraken" ? krakenBoard() : randomFleet(foeDefsFor(R.at), false);
    var rule = ENEMIES[G.enemy].rule;
    if (rule === "mines") {
      var water = []; G.foe.cells.forEach(function (c, i) { if (c.ship === -1) water.push(i); });
      shuffle(water).slice(0, 3).forEach(function (i) { G.foe.cells[i].mine = true; });
    }
    if (rule === "blindage") {
      var big = shipsOf(G.foe).slice().sort(function (a, b) { return b.len - a.len; })[0];
      big.cells.forEach(function (i) { G.foe.cells[i].armor = 1; });
    }
    if (alive("mouilleur")) {
      var free = []; G.me.cells.forEach(function (c, i) { if (c.ship === -1 && around(i, 1).every(function (j) { return G.me.cells[j].ship === -1; })) free.push(i); });
      shuffle(free).slice(0, 2).forEach(function (i) { G.me.cells[i].mine = true; });
    }
    G.turnNo = 0; G.subDodged = false; G.coqueUsed = false; G.skipFoe = false; G.reconCd = 0; G.sunkNow = 0;
    if (alive("torpilleur")) { R.ammo.torpille = (R.ammo.torpille || 0) + 1; toast("Torpilleur : +1 torpille", "🚤"); }
    if (has("rhum")) repairOne("Rhum de réserve");
    if (has("longuevue")) {
      var cand = []; G.foe.cells.forEach(function (c, i) { if (c.ship >= 0) cand.push(i); });
      var sp = pick(cand); G.foe.cells[sp].spot = true;
      setTimeout(function () { toast("Longue-vue : une case ennemie repérée", "🔭"); }, 400);
    }
    G.turn = "me";
    beginBattle();
    beginPlayerTurn();
  }
  function repairOne(by) {
    // répare une case abîmée d'un navire encore à flot (pas une case déjà touchée pendant ce combat)
    var list = [];
    G.me.ships.forEach(function (s, si) { if (s && !s.sunk) s.dmg.forEach(function (d, k) { if (d && !G.me.cells[s.cells[k]].shot) list.push([si, k]); }); });
    if (!list.length) return false;
    var p = pick(list);
    G.me.ships[p[0]].dmg[p[1]] = false;
    if (G.me.defs[p[0]].dmg) G.me.defs[p[0]].dmg[p[1]] = false;
    toast(by + " : " + G.me.ships[p[0]].name + " réparé d'une case", "🔧");
    return true;
  }
  function beginPlayerTurn() {
    if (G.phase !== "battle") return;
    G.turnNo++;
    // brouillard : les résultats du tour précédent apparaissent
    var fogged = G.foe.cells.filter(function (c) { return c.fog; });
    if (fogged.length) { fogged.forEach(function (c) { c.fog = false; }); toast("Le brouillard se lève", "🦉"); }
    if (G.enemy === "kraken") regrowTentacles();
    if (ENEMIES[G.enemy].rule === "pieuvre" && G.turnNo > 1 && G.turnNo % 5 === 0) pieuvreMove();
    if (G.reconCd > 0) G.reconCd--;
    G.shotsLeft = 1;
    var extra = [];
    if (alive("cuirasse") && G.turnNo % 3 === 0) { G.shotsLeft++; extra.push("Bordée du cuirassé"); }
    if (has("ouverture") && G.turnNo === 1) { G.shotsLeft += 2; extra.push("Tir d'ouverture"); }
    if (!(G.ammo === "tir" || (G.ammo === "recon" && G.reconCd === 0) || (R.ammo[G.ammo] > 0))) G.ammo = "tir";
    G.turn = "me"; G.busy = false;
    render();
    setStatus(G.shotsLeft > 1 ? extra.join(" + ") + " : " + G.shotsLeft + " tirs !" : "À toi de tirer !", "me");
    focusFoe();
  }
  function regrowTentacles() {
    G.foe.ships.forEach(function (s) {
      if (!s || s.shape !== "tentacle" || !s.sunk || s.wreck || G.turnNo - s.sunkTurn < 5) return;
      var si = G.foe.ships.length;
      G.foe.defs.push({ name: "Tentacule", len: 2, shape: "tentacle" });
      G.foe.ships.push(null);
      var ok = randomPlace(G.foe, si, null, function (i) { var c = G.foe.cells[i]; return !c.shot && !c.water && !c.spot && c.sonar == null; });
      if (ok) { s.wreck = true; toast("Un tentacule repousse !", "🦑"); }
      else { G.foe.ships.pop(); G.foe.defs.pop(); }
    });
  }
  function pieuvreMove() {
    var cand = [];
    G.foe.ships.forEach(function (s, si) { if (s && !s.sunk && !s.dmg.some(Boolean)) cand.push(si); });
    if (!cand.length) return;
    var si = pick(cand), old = G.foe.ships[si];
    old.cells.forEach(function (i) { G.foe.cells[i].spot = false; });
    liftShip(G.foe, si);
    var ok = randomPlace(G.foe, si, null, function (i) { var c = G.foe.cells[i]; return !c.shot && !c.water && !c.mine; });
    if (!ok) putShip(G.foe, si, old.cells, old.vert);
    // les relevés de sonar ne sont plus fiables
    G.foe.cells.forEach(function (c) { c.sonar = null; });
    toast("La Pieuvre déplace un navire !", "🐙");
    shakeEl(foeEl);
  }

  function targetCells(a, i) {
    var cells = G.foe.cells, ok = function (j) { return !cells[j].shot && !cells[j].water; };
    if (a === "tir") return ok(i) ? [i] : [];
    if (a === "torpille") {
      var p = rc(i), out = [];
      for (var c = p[1]; c < N; c++) {
        var j = idx(p[0], c);
        if (!ok(j)) continue;
        out.push(j);
        if (cells[j].ship >= 0) break;
      }
      return out;
    }
    if (a === "bombe") {
      if (has("poudre")) return around(i, 1).filter(ok);
      return [i].concat(neighbors4(i)).filter(ok);
    }
    if (a === "salve") return shuffle(around(i, 1).filter(ok)).slice(0, 3);
    return [];
  }
  function rogueAct(i) {
    var a = G.ammo;
    var tc = G.foe.cells[i];
    if ((a === "sonar" || a === "recon") && (tc.shot || tc.water)) { shakeEl(cellEl(foeEl, i)); haptic("tick"); return; }
    if (a === "sonar") {
      var n = 0;
      around(i, 1).forEach(function (j) { var c = G.foe.cells[j]; if (c.ship >= 0 && !c.shot && !G.foe.ships[c.ship].sunk) n++; });
      R.ammo.sonar--; G.foe.cells[i].sonar = n;
      sfx.ping(); haptic("tap");
      setStatus("Sonar en " + coord(i) + " : " + n + " case" + (n > 1 ? "s" : "") + " de navire autour", "me");
      if (!(R.ammo.sonar > 0)) G.ammo = "tir";
      render(); return;
    }
    if (a === "recon") {
      around(i, 1).forEach(function (j) { var c = G.foe.cells[j]; if (c.shot) return; if (c.ship >= 0) c.spot = true; else if (!c.mine) c.water = true; else c.spot = false; });
      G.reconCd = 4; G.ammo = "tir";
      sfx.ping(); haptic("tap");
      setStatus("L'avion a survolé " + coord(i) + " : les navires repérés sont marqués", "me");
      render(); return;
    }
    var list = targetCells(a, i);
    if (!list.length) { shakeEl(cellEl(foeEl, i)); haptic("tick"); return; }
    G.busy = true;
    if (a !== "tir") { R.ammo[a]--; if (!(R.ammo[a] > 0)) G.ammo = "tir"; }
    sfx.fire();
    var fog = ENEMIES[G.enemy].rule === "brouillard";
    var res = { miss: 0, hit: 0, sunk: [], armor: 0, mine: 0 };
    list.forEach(function (j) {
      var out = fireAt(G.foe, j);
      G.shots++;
      if (out.res === "hit" || out.res === "sunk") G.hits++;
      if (out.res === "sunk") { res.sunk.push(out.ship); if (out.ship.shape === "tentacle") out.ship.sunkTurn = G.turnNo; }
      else if (out.res === "hit") res.hit++;
      else if (out.res === "armor") res.armor++;
      else if (out.res === "mine") res.mine++;
      else res.miss++;
      if (out.res === "miss" && a === "tir" && alive("fregate")) {
        var n = 0; around(j, 1).forEach(function (k) { if (G.foe.cells[k].ship >= 0 && !G.foe.ships[G.foe.cells[k].ship].sunk) n++; });
        G.foe.cells[j].n = n;
      }
      if (fog && out.res !== "sunk" && out.res !== "armor") G.foe.cells[j].fog = true;
      if (!fog) fx(foeEl, j, out.res === "miss" ? "splash" : "boom");
    });
    G.lastMe = list[list.length - 1];
    G.shotsLeft--;
    // effets des tirs
    if (res.sunk.length) {
      sfx.sunk(); haptic("success"); shakeEl(foeEl);
      res.sunk.forEach(function (s) {
        var nm = s.shape === "tentacle" ? "Tentacule" : s.shape === "body" ? "Kraken" : s.name;
        toast(nm + " ennemi coulé !", "💥");
        if (s.shape !== "tentacle") R.stats.sunk++;
        if (has("recup")) { var k = pick(AMMO_KEYS); R.ammo[k] = (R.ammo[k] || 0) + 1; toast("Récupération : +1 " + AMMO[k].name.toLowerCase(), "♻️"); }
      });
      if (has("canonnier")) { G.shotsLeft++; toast("Canonnier : tu rejoues", "🎖️"); }
    } else if (fog) { setStatus("Tir dans le brouillard… résultat au prochain tour", "me"); }
    else if (res.hit) { sfx.hit(); haptic("hit"); }
    else if (res.armor) { sfx.clank(); haptic("tap"); }
    else sfx.miss();
    if (!fog || res.sunk.length) {
      var parts = [];
      if (res.sunk.length) parts.push("Coulé !");
      if (res.hit) parts.push(res.hit > 1 ? res.hit + " touchés" : "Touché");
      if (res.armor) parts.push("Ricochet sur le blindage");
      if (res.mine) parts.push("Mine !");
      if (!parts.length) parts.push("À l'eau");
      setStatus(parts.join(" · ") + (list.length === 1 ? " (" + coord(list[0]) + ")" : ""), res.sunk.length || res.hit ? "good" : "me");
    }
    if (res.mine) {
      for (var m = 0; m < res.mine; m++) mineDamage();
      if (!aliveCount(G.me)) { render(); return setTimeout(function () { rogueEnd(false); }, 900); }
    }
    if (a === "tir" && list.length === 1 && res.miss && !res.mine && has("trefle") && Math.random() < 0.25) { G.shotsLeft++; toast("Trèfle : tu rejoues !", "🍀"); }
    render();
    if (foeBeaten()) return setTimeout(function () { rogueEnd(true); }, 800);
    setTimeout(function () {
      if (G.phase !== "battle") return;
      if (G.shotsLeft > 0) { G.busy = false; setStatus((G.shotsLeft > 1 ? G.shotsLeft + " tirs restants" : "Encore un tir !"), "me"); render(); return; }
      toFoe();
    }, res.sunk.length || res.hit ? 750 : 450);
  }
  function mineDamage() {
    var list = [];
    G.me.ships.forEach(function (s, si) { if (s && !s.sunk) s.dmg.forEach(function (d, k) { if (!d) list.push([si, k]); }); });
    if (!list.length) return;
    var p = pick(list), s = G.me.ships[p[0]];
    s.dmg[p[1]] = true;
    sfx.hit(); haptic("fail"); shakeEl(meEl);
    if (s.dmg.every(Boolean)) { sinkShip(G.me, s); toast("Mine ! Ton " + s.name.toLowerCase() + " a coulé", "💣"); }
    else toast("Mine ! Ton " + s.name.toLowerCase() + " est abîmé", "💣");
  }
  function foeBeaten() {
    if (G.enemy === "kraken") return G.foe.ships[0].sunk;
    return !aliveCount(G.foe);
  }
  function rogueFoeTurn() {
    if (G.skipFoe) {
      G.skipFoe = false;
      setStatus("L'ennemi est sonné par ta mine et passe son tour", "good");
      toast("Mine : l'ennemi perd son tour", "⚙️");
      return setTimeout(beginPlayerTurn, 900);
    }
    var n = 1;
    if (G.enemy === "kraken") {
      var t = G.foe.ships.filter(function (s) { return s && s.shape === "tentacle" && !s.sunk && !s.wreck; }).length;
      if (t >= 3) n = 2;
    }
    foeShot(n);
  }
  function foeShot(left) {
    if (G.phase !== "battle") return;
    if (G.paused) { setTimeout(function () { foeShot(left); }, 300); return; }
    var i = aiMove(G.me, G.ai);
    if (i < 0) return beginPlayerTurn();
    sfx.fire();
    G.foeShots++; G.lastFoe = i;
    var c = G.me.cells[i], sh = c.ship >= 0 ? G.me.ships[c.ship] : null;
    var dodge = "";
    if (sh && !c.shot && !sh.dmg[sh.cells.indexOf(i)]) {
      if (sh.type === "sousmarin" && !G.subDodged) { G.subDodged = true; dodge = "Le sous-marin plonge et esquive le tir !"; }
      else if (has("coque") && !G.coqueUsed) { G.coqueUsed = true; dodge = "Coque renforcée : le tir est ignoré !"; }
    }
    if (dodge) {
      fx(meEl, i, "splash"); sfx.clank();
      setStatus(dodge, "good"); toast(dodge, "🛡️");
    } else {
      var out = fireAt(G.me, i);
      if (out.res === "mine") {
        G.skipFoe = true; fx(meEl, i, "boom"); sfx.hit();
        setStatus("L'ennemi tire sur ta mine en " + coord(i) + " : il perdra son prochain tour", "good");
      } else report(out, false, i);
    }
    render();
    if (!aliveCount(G.me)) return setTimeout(function () { rogueEnd(false); }, 900);
    setTimeout(function () {
      if (G.phase !== "battle") return;
      if (left > 1) { setStatus("Le Kraken frappe encore…", "foe"); setTimeout(function () { foeShot(left - 1); }, 450); return; }
      beginPlayerTurn();
    }, 650);
  }

  function rogueEnd(won) {
    G.phase = "over"; G.busy = true;
    R.stats.shots += G.shots; R.stats.hits += G.hits;
    // la flotte garde ses dégâts ; les navires coulés sont perdus pour de bon
    var keep = [];
    R.fleet.forEach(function (f, si) {
      var s = G.me.ships[si];
      if (!s || s.sunk) return;
      f.dmg = s.dmg.some(Boolean) ? s.dmg.slice() : null;
      keep.push(f);
    });
    R.fleet = keep;
    render();
    if (!won) return runOver(false);
    sfx.win(); haptic("success");
    R.stats.won++;
    R.lastFoe = G.enemy;
    var node = R.at;
    if (node.type === "boss") return runOver(true);
    var notes = [];
    if (R.fleet.some(function (f) { return f.type === "atelier"; })) {
      var dmgList = [];
      R.fleet.forEach(function (f, fi) { if (f.dmg) f.dmg.forEach(function (d, k) { if (d) dmgList.push([fi, k]); }); });
      if (dmgList.length) { var p = pick(dmgList), f = R.fleet[p[0]]; f.dmg[p[1]] = false; if (!f.dmg.some(Boolean)) f.dmg = null; notes.push("🔧 Le navire-atelier répare ton " + TYPES[f.type].name.toLowerCase() + "."); }
    }
    var g = (node.type === "elite" ? 20 : 10) + R.step * 2;
    var acc = G.shots ? G.hits / G.shots : 0;
    if (acc >= 0.5) g += 4;
    if (has("butin")) g = Math.round(g * 1.5);
    R.glands += g;
    R.at = { type: "reward", elite: node.type === "elite", gained: g, notes: notes, choices: rewardChoices(node.type === "elite") };
    rpersist();
    setStatus("Victoire !", "good");
    setTimeout(showReward, 700);
  }
  function rewardChoices(elite) {
    var free = Object.keys(RELICS).filter(function (k) { return R.relics.indexOf(k) < 0; });
    if (elite) return shuffle(free).slice(0, 3).map(function (k) { return { kind: "relic", key: k }; });
    var pool = [
      { kind: "ammo", key: "bombe", n: 2 }, { kind: "ammo", key: "torpille", n: 2 }, { kind: "ammo", key: "salve", n: 2 }, { kind: "ammo", key: "sonar", n: 3 },
      { kind: "glands", n: 12 }
    ];
    if (R.fleet.some(function (f) { return f.dmg; })) pool.push({ kind: "repair", n: 2 });
    var out = shuffle(pool).slice(0, 3);
    if (free.length && Math.random() < 0.35) out[2] = { kind: "relic", key: pick(free) };
    return out;
  }
  function choiceHTML(c, k) {
    var ico, name, desc;
    if (c.kind === "relic") { ico = RELICS[c.key].ico; name = RELICS[c.key].name; desc = RELICS[c.key].desc; }
    else if (c.kind === "ammo") { ico = AMMO[c.key].ico; name = c.n + " × " + AMMO[c.key].name; desc = AMMO[c.key].desc; }
    else if (c.kind === "glands") { ico = "🌰"; name = c.n + " glands"; desc = "À dépenser au port."; }
    else { ico = "🔧"; name = "Réparer " + c.n + " cases"; desc = "Répare des cases abîmées de ta flotte."; }
    return '<button type="button" class="bn-route bn-choice" data-pickreward="' + k + '"><span class="bn-route-ico" aria-hidden="true">' + ico + "</span><strong>" + name + "</strong><small>" + desc + "</small></button>";
  }
  function showReward() {
    G.phase = "camp"; render();
    var at = R.at;
    showOverlay(
      headHTML(at.elite ? "Élite vaincue !" : "Victoire !") +
      '<p>+' + at.gained + " glands" + (has("butin") ? " (coffre à butin)" : "") + ".</p>" +
      (at.notes || []).map(function (n) { return "<p>" + n + "</p>"; }).join("") +
      '<p class="bn-sub">' + (at.elite ? "Choisis une relique" : "Choisis une récompense") + "</p>" +
      '<div class="bn-routes">' + at.choices.map(choiceHTML).join("") + "</div>" +
      runSummary()
    );
  }
  function takeReward(k) {
    var c = R.at.choices[k];
    if (!c) return;
    if (c.kind === "relic") R.relics.push(c.key);
    else if (c.kind === "ammo") R.ammo[c.key] = (R.ammo[c.key] || 0) + c.n;
    else if (c.kind === "glands") R.glands += c.n;
    else for (var r = 0; r < c.n; r++) repairFleet();
    sfx.coin(); haptic("success");
    nextStep();
  }
  function repairFleet() {
    var list = [];
    R.fleet.forEach(function (f, fi) { if (f.dmg) f.dmg.forEach(function (d, k) { if (d) list.push([fi, k]); }); });
    if (!list.length) return false;
    var p = pick(list), f = R.fleet[p[0]];
    f.dmg[p[1]] = false;
    if (!f.dmg.some(Boolean)) f.dmg = null;
    return true;
  }

  function showPort() {
    G.phase = "camp"; render();
    if (!R.at.stock) {
      var can = Object.keys(TYPES).filter(function (t) { return TYPES[t].price && !R.fleet.some(function (f) { return f.type === t; }); });
      R.at.stock = shuffle(can).slice(0, 2);
    }
    rpersist();
    var dmgCount = 0; R.fleet.forEach(function (f) { if (f.dmg) f.dmg.forEach(function (d) { if (d) dmgCount++; }); });
    function buy(act, label, price, off, desc) {
      return '<button type="button" class="bn-shop-btn" data-buy="' + act + '"' + (off || R.glands < price ? " disabled" : "") + '><span>' + label + (desc ? "<small>" + desc + "</small>" : "") + '</span><b>🌰 ' + price + "</b></button>";
    }
    var html = headHTML("⚓ Le port") +
      '<p class="bn-sub">Chantier</p>' +
      buy("repair", "🔧 Réparer une case (" + dmgCount + " abîmée" + (dmgCount > 1 ? "s" : "") + ")", 6, !dmgCount) +
      '<p class="bn-sub">Munitions</p>' +
      AMMO_KEYS.map(function (k) { return buy("ammo:" + k, AMMO[k].ico + " " + AMMO[k].name + " (tu en as " + (R.ammo[k] || 0) + ")", AMMO[k].price); }).join("") +
      '<p class="bn-sub">Recrutement' + (R.fleet.length >= MAX_FLEET ? " (flotte complète)" : "") + "</p>" +
      (R.at.stock.length ? R.at.stock.map(function (t) { var ty = TYPES[t]; return buy("ship:" + t, ty.ico + " " + ty.name + " (" + ty.len + " cases)", ty.price, R.fleet.length >= MAX_FLEET, ty.power + " : " + ty.desc); }).join("") : '<p class="bn-none">Plus personne à recruter.</p>') +
      '<div class="bn-card-btns"><button class="btn" type="button" data-act="leave">⛵ Reprendre la mer</button></div>' +
      runSummary();
    showOverlay(html, true);
  }
  function doBuy(what) {
    var parts = what.split(":");
    if (parts[0] === "repair") { if (R.glands < 6 || !repairFleet()) return; R.glands -= 6; }
    else if (parts[0] === "ammo") { var a = AMMO[parts[1]]; if (R.glands < a.price) return; R.glands -= a.price; R.ammo[parts[1]] = (R.ammo[parts[1]] || 0) + 1; }
    else if (parts[0] === "ship") {
      var t = TYPES[parts[1]]; if (R.glands < t.price || R.fleet.length >= MAX_FLEET) return;
      R.glands -= t.price; R.fleet.push({ type: parts[1], dmg: null, pos: null });
      R.at.stock = R.at.stock.filter(function (s) { return s !== parts[1]; });
      toast(t.name + " rejoint ta flotte !", t.ico);
    }
    sfx.coin(); haptic("tap");
    rpersist();
    var sc = card.parentNode.scrollTop;
    showPort();
    card.parentNode.scrollTop = sc;
  }

  function showWreck() {
    G.phase = "camp"; render(); rpersist();
    showOverlay(
      headHTML("🏴‍☠️ Une épave") +
      "<p>Une coque échouée dépasse des vagues. Que fais-tu ?</p>" +
      '<div class="bn-routes">' +
        '<button type="button" class="bn-route" data-wreck="safe"><span class="bn-route-ico" aria-hidden="true">🪝</span><strong>Fouiller prudemment</strong><small>+8 glands et une munition au hasard.</small></button>' +
        '<button type="button" class="bn-route" data-wreck="risk"><span class="bn-route-ico" aria-hidden="true">🤿</span><strong>Plonger dans la cale</strong><small>6 chances sur 10 : une relique. Sinon, un de tes navires est abîmé.</small></button>' +
      "</div>" + runSummary()
    );
  }
  function doWreck(kind) {
    var msg;
    if (kind === "safe") {
      var k = pick(AMMO_KEYS); R.glands += 8; R.ammo[k] = (R.ammo[k] || 0) + 1;
      msg = "+8 glands et 1 " + AMMO[k].name.toLowerCase() + " " + AMMO[k].ico; sfx.coin();
    } else {
      var free = Object.keys(RELICS).filter(function (r) { return R.relics.indexOf(r) < 0; });
      if (Math.random() < 0.6 && free.length) { var r = pick(free); R.relics.push(r); msg = "Trouvé : " + RELICS[r].ico + " " + RELICS[r].name + " ! " + RELICS[r].desc; sfx.win(); }
      else {
        var list = [];
        R.fleet.forEach(function (f, fi) { var len = TYPES[f.type].len; for (var q = 0; q < len; q++) if (!(f.dmg && f.dmg[q])) list.push([fi, q]); });
        // l'épave ne coule jamais un navire : on garde au moins une case intacte
        list = list.filter(function (p) { var f = R.fleet[p[0]], len = TYPES[f.type].len, d = f.dmg ? f.dmg.filter(Boolean).length : 0; return d < len - 1; });
        if (list.length) {
          var p = pick(list), f = R.fleet[p[0]];
          if (!f.dmg) f.dmg = TYPES[f.type].len ? new Array(TYPES[f.type].len).fill(false) : [];
          f.dmg[p[1]] = true;
          msg = "La cale s'effondre : ton " + TYPES[f.type].name.toLowerCase() + " est abîmé.";
        } else msg = "La cale est vide.";
        sfx.bad();
      }
    }
    rpersist();
    showOverlay(headHTML("🏴‍☠️ Une épave") + "<p>" + msg + '</p><div class="bn-card-btns"><button class="btn" type="button" data-act="leave">⛵ Reprendre la mer</button></div>');
  }

  function runOver(won) {
    R.over = true; R.won = won;
    var b = rstore.best;
    if (won) { b.wins++; if (!b.fast || R.secs < b.fast) b.fast = R.secs; }
    b.step = Math.max(b.step || 0, won ? STEPS : R.step + 1);
    rstore.run = null; rsave();
    var r = R; R = null;
    if (won) { sfx.win(); haptic("success"); } else { sfx.lose(); haptic("fail"); }
    setStatus(won ? "Le Kraken est vaincu !" : "Naufrage…", won ? "good" : "bad");
    setTimeout(function () {
      var acc = r.stats.shots ? Math.round(r.stats.hits / r.stats.shots * 100) : 0;
      showOverlay(
        "<h2>" + (won ? "🦑 Traversée réussie !" : "🌊 Naufrage…") + "</h2>" +
        "<p>" + (won ? "Le Kraken retourne dans les abysses. La mer est à toi." : "Ta dernière coque disparaît sous les vagues à l'étape " + (r.step + 1) + "/" + STEPS + ".") + "</p>" +
        statsHTML([["Combats", r.stats.won], ["Navires coulés", r.stats.sunk], ["Précision", acc + " %"]]) +
        statsHTML([["Étape", Math.min(r.step + 1, STEPS) + "/" + STEPS], ["Reliques", r.relics.length], ["Durée", mmss(r.secs)]]) +
        '<div class="bn-card-btns">' +
          '<button class="btn" type="button" data-act="rnew">⛵ Nouvelle traversée</button>' +
          '<button class="btn btn-ghost" type="button" data-act="look">Voir les grilles</button>' +
          '<button class="btn btn-ghost" type="button" data-act="rmenu">Menu</button>' +
        "</div>"
      );
    }, 900);
  }

  function showRogueMenu() {
    G.mode = "rogue"; G.phase = "menu"; G.paused = false; G.busy = false; G.foe = null; G.enemy = null;
    if (G.me.defs === CLASSIC) G.me = emptyBoard(fleetDefsFallback(), false);
    setStatus("Bataille navale · Roguelite");
    render();
    var b = rstore.best;
    var best = b.runs ? (b.wins ? "🏆 " + b.wins + " traversée" + (b.wins > 1 ? "s" : "") + " réussie" + (b.wins > 1 ? "s" : "") + (b.fast ? " · record " + mmss(b.fast) : "") : "Meilleure étape : " + b.step + "/" + STEPS) : "Pas encore de traversée.";
    showOverlay(
      "<h2>🦑 La traversée</h2>" +
      "<p>7 étapes jusqu'au Kraken, environ 15 minutes. Ta flotte garde ses dégâts d'un combat à l'autre : un navire coulé est perdu, avec son pouvoir.</p>" +
      (R ? '<button class="btn bn-start" type="button" data-act="rcontinue">▶ Continuer (étape ' + (R.step + 1) + "/" + STEPS + ")</button>" : "") +
      '<button class="btn ' + (R ? "btn-alt " : "") + 'bn-start" type="button" data-act="rnew">⛵ Nouvelle traversée</button>' +
      '<p class="bn-statsline">' + best + "</p>" +
      '<details class="bn-rules"><summary>Comment ça marche</summary><ul>' +
        "<li>À chaque étape, choisis ta route : combat, élite, port ou épave. Le Kraken attend à la 7ᵉ.</li>" +
        "<li>Chaque navire a un pouvoir tant qu'il flotte : la bordée du cuirassé, le radar de la frégate, la plongée du sous-marin, les torpilles du torpilleur… D'autres se recrutent au port.</li>" +
        "<li>Choisis une munition sous la grille ennemie avant de tirer : torpille, bombe, salve ou sonar.</li>" +
        "<li>Chaque ennemi a sa règle : la Pieuvre déplace ses navires, le Hibou cache tes résultats, le Blaireau pose des mines, le Sanglier blinde son plus gros navire.</li>" +
        "<li>Après chaque victoire, choisis une récompense. Les glands 🌰 se dépensent au port.</li>" +
        "<li>Les navires ne se touchent jamais, même en diagonale.</li>" +
      "</ul></details>"
    );
  }
  function fleetDefsFallback() { return START_FLEET.map(function (t) { var ty = TYPES[t]; return { name: ty.name, len: ty.len, type: t }; }); }
  function rContinue() {
    if (!R) return showRogueMenu();
    var at = R.at;
    if (!at) return showMap();
    if (at.type === "reward") return showReward();
    if (at.type === "port") return showPort();
    if (at.type === "epave") return showWreck();
    if (at.enemy) return startRogueCombat();
    showMap();
  }

  /* ---------- menus ---------- */
  function showOverlay(html, keepScroll) {
    card.innerHTML = html; overlay.hidden = false;
    if (!keepScroll) overlay.scrollTop = 0;
    var b = card.querySelector("button:not([disabled])"); if (b) b.focus({ preventScroll: true });
  }
  function hideOverlay() { overlay.hidden = true; }
  function statsLine() {
    var st = store.stats[store.diff];
    if (!st || !(st.w + st.l)) return "Pas encore de partie dans ce niveau.";
    return st.w + " victoire" + (st.w > 1 ? "s" : "") + " · " + st.l + " défaite" + (st.l > 1 ? "s" : "") + (st.best ? " · record : " + st.best + " tirs" : "");
  }
  function showMenu() {
    G.mode = "classic"; G.phase = "menu"; G.paused = false; G.busy = false; G.enemy = null;
    if (G.me.defs !== CLASSIC) G.me = emptyBoard(CLASSIC, store.touch);
    setStatus("Bataille navale");
    render();
    showOverlay(
      '<h2>Bataille navale</h2>' +
      "<p>Coule les 5 navires ennemis avant qu'il ne coule les tiens.</p>" +
      '<p class="bn-sub">Niveau de l\'ordinateur</p>' +
      '<div class="bn-seg" role="group" aria-label="Niveau">' +
        DIFFS.map(function (d) { return '<button type="button" data-diff="' + d.id + '" aria-pressed="' + (store.diff === d.id) + '" class="' + (store.diff === d.id ? "on" : "") + '">' + d.label + "</button>"; }).join("") +
      "</div>" +
      '<div class="bn-opts">' +
        '<label class="bn-check"><input type="checkbox" data-opt="again"' + (store.again ? " checked" : "") + "> Touché = on rejoue</label>" +
        '<label class="bn-check"><input type="checkbox" data-opt="touch"' + (store.touch ? " checked" : "") + "> Navires collés autorisés</label>" +
      "</div>" +
      '<p class="bn-statsline">' + statsLine() + "</p>" +
      '<button class="btn bn-start" type="button" data-act="place">⚓ Placer ma flotte</button>' +
      '<details class="bn-rules"><summary>Règles</summary>' +
        "<ul><li>Chaque camp a 5 navires : porte-avions (5 cases), croiseur (4), contre-torpilleur (3), sous-marin (3) et torpilleur (2).</li>" +
        "<li>Les navires sont droits. Par défaut, ils ne se touchent jamais, même en diagonale : quand un navire est coulé, les cases autour sont marquées comme de l'eau.</li>" +
        "<li>Avec l'option « Navires collés autorisés », ils peuvent se toucher : deux touchés voisins peuvent alors appartenir à deux navires différents, et rien n'est marqué autour d'un navire coulé.</li>" +
        "<li>Chacun tire à son tour.</li>" +
        "<li>Avec l'option « Touché = on rejoue », un tir réussi donne un tir de plus.</li></ul>" +
      "</details>"
    );
  }
  function showPause() {
    if (G.phase === "over") { if (G.mode === "rogue") return R ? rContinue() : showRogueMenu(); return showMenu(); }
    if (G.phase !== "battle" && G.phase !== "place") return;
    G.paused = true;
    var rogue = G.mode === "rogue";
    showOverlay(
      "<h2>Pause</h2>" +
      (rogue ? "<p>Ta traversée est sauvegardée. Si tu quittes, ce combat recommencera depuis le placement.</p>" : "") +
      '<div class="bn-card-btns">' +
        '<button class="btn" type="button" data-act="resume">▶ Reprendre</button>' +
        (!rogue && G.phase === "battle" ? '<button class="btn btn-alt" type="button" data-act="restart">↺ Recommencer</button>' : "") +
        '<button class="btn btn-ghost" type="button" data-act="' + (rogue ? "rmenu" : "menu") + '">Menu principal</button>' +
      "</div>"
    );
  }

  /* ---------- onglets Classique / Roguelite ---------- */
  var tabs = $$("[data-bnmode]");
  function setMode(m, silent) {
    G.mode = m === "rogue" ? "rogue" : "classic";
    try { localStorage.setItem(MODE_KEY, G.mode); } catch (e) {}
    tabs.forEach(function (t) { var on = t.dataset.bnmode === G.mode; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    $$("[data-bnhelp]").forEach(function (h) { h.hidden = h.dataset.bnhelp !== G.mode; });
    if (!silent) haptic("tick");
    if (G.mode === "rogue") showRogueMenu(); else showMenu();
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      var m = t.dataset.bnmode;
      if (m === G.mode) return;
      if (G.phase === "battle" && G.mode === "classic" && GK) {
        GK.ui.confirm({ title: "Quitter la partie ?", text: "La partie classique en cours sera perdue.", ok: "Changer de version", cancel: "Rester" }).then(function (ok) { if (ok) setMode(m); });
        return;
      }
      setMode(m);
    });
  });

  /* ---------- évènements ---------- */
  root.addEventListener("click", function (e) {
    ac();
    var t = e.target.closest("button, input");
    if (!t || t.disabled) return;
    if (t.dataset.diff) {
      store.diff = t.dataset.diff; save();
      $$("[data-diff]", card).forEach(function (b) { var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      var sl = card.querySelector(".bn-statsline"); if (sl) sl.textContent = statsLine();
      return;
    }
    if (t.dataset.opt === "again") { store.again = t.checked; save(); return; }
    if (t.dataset.opt === "touch") { store.touch = t.checked; save(); return; }
    if (t.dataset.ship != null) { var si = +t.dataset.ship; if (G.me.ships[si]) { G.vert = G.me.ships[si].vert; liftShip(G.me, si); } G.sel = si; render(); return; }
    if (t.dataset.ammo) {
      var k = t.dataset.ammo;
      G.ammo = G.ammo === k && k !== "tir" ? "tir" : k;
      haptic("tick");
      var a = k === "recon" ? { name: "Avion", desc: "touche une case : l'avion révèle la zone de 3×3 autour, sans passer ton tour." } : AMMO[k];
      if (G.ammo === k && k !== "tir") setStatus(a.name + " : " + a.desc.charAt(0).toLowerCase() + a.desc.slice(1), "me");
      else if (G.phase === "battle" && G.turn === "me") setStatus(G.shotsLeft > 1 ? G.shotsLeft + " tirs restants" : "À toi de tirer !", "me");
      render(); return;
    }
    if (t.dataset.route != null) { goNode(+t.dataset.route); return; }
    if (t.dataset.pickreward != null) { takeReward(+t.dataset.pickreward); return; }
    if (t.dataset.buy) { doBuy(t.dataset.buy); return; }
    if (t.dataset.wreck) { doWreck(t.dataset.wreck); return; }
    if (t.classList.contains("bn-cell")) {
      var i = +t.dataset.i;
      if (t.dataset.who === "foe") {
        if (G.phase !== "battle" || G.turn !== "me" || G.busy || G.paused) return;
        if (G.mode === "rogue") rogueAct(i); else classicFire(i);
      } else if (G.phase === "place") placeAt(i);
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
      case "look": hideOverlay(); setStatus("Touche ☰ pour continuer"); break;
      case "rnew":
        if (R && GK && card.querySelector('[data-act="rcontinue"]')) {
          GK.ui.confirm({ title: "Nouvelle traversée ?", text: "La traversée en cours sera abandonnée.", ok: "Recommencer", cancel: "Annuler" }).then(function (ok) { if (ok) { newRun(); showMap(); } });
        } else { newRun(); showMap(); }
        break;
      case "rcontinue": rContinue(); break;
      case "rmenu": G.paused = false; showRogueMenu(); break;
      case "leave": sfx.place(); nextStep(); break;
      case "rabandon":
        var go = function () { R.step = Math.max(0, R.step); runOver(false); };
        if (GK) GK.ui.confirm({ title: "Abandonner ?", text: "La traversée s'arrête ici.", ok: "Abandonner", cancel: "Continuer" }).then(function (ok) { if (ok) go(); });
        else go();
        break;
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
  window.__bn = {
    ai: { easy: aiEasy, normal: aiNormal, hard: aiHard }, randomFleet: function (defs, touch) { return randomFleet(defs || CLASSIC, touch); }, fireAt: fireAt, aliveCount: aliveCount,
    G: G, start: startBattle, place: startPlacement, randomize: randomize, fire: classicFire, end: endGame, store: store,
    rogue: { get R() { return R; }, combat: function (enemy, ai) { R.at = { type: "combat", enemy: enemy, ai: ai || "normal" }; startRogueCombat(); }, newRun: newRun, map: showMap, go: goNode, act: rogueAct, end: rogueEnd, foeBeaten: foeBeaten, TYPES: TYPES, RELICS: RELICS }
  };

  setMode(G.mode, true);
  layout();
})();
