/* Rouages : tower defense d'usine.
   Convoyeurs à deux voies (à la Factorio), machines à entrées/sorties dédiées (à la Satisfactory),
   splitters, fusionneurs, déchargeurs ; tourelles alimentées en munitions par la chaîne de production.
   Sprites : convoyeurs/splitters/fusionneurs par Blood_seller, ennemis par CraftPix.net, le reste dans js/rouages-art.js. */
(function () {
  "use strict";
  var stage = document.getElementById("game-stage");
  if (!stage || !window.RouagesArt) return;

  /* ---------- constantes ---------- */
  var W = 48, H = 30, TS = 32;
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  var ROCK = 9, ORE = { 1: "cu_o", 2: "fe_o", 3: "coal" };
  var BELT_SPEED = 1.9, GAP = 0.25;
  var ITEMS = {
    cu_o: "Minerai de cuivre", fe_o: "Minerai de fer", coal: "Charbon",
    cu: "Lingot de cuivre", fe: "Lingot de fer", steel: "Acier",
    ammo: "Munitions", shell: "Obus"
  };
  var ITEM_IDS = Object.keys(ITEMS);
  var RECIPES = {
    s_cu:   { n: "Lingot de cuivre", in: { cu_o: 1 }, out: { cu: 1 }, t: 1.6 },
    s_fe:   { n: "Lingot de fer", in: { fe_o: 1 }, out: { fe: 1 }, t: 1.6 },
    steel:  { n: "Acier", in: { fe: 1, coal: 1 }, out: { steel: 1 }, t: 2.6 },
    ammo:   { n: "Munitions", in: { cu: 1 }, out: { ammo: 3 }, t: 1.4 },
    shell:  { n: "Obus", in: { steel: 1, fe: 1 }, out: { shell: 2 }, t: 3 }
  };
  // ports dans le repère local (orientation « vers la droite ») : x, y, côté (0 droite,1 bas,2 gauche,3 haut)
  function edgePorts(s, io) { var p = []; for (var i = 0; i < s; i++) { p.push([s - 1, i, 0, io], [0, i, 2, io], [i, 0, 3, io], [i, s - 1, 1, io]); } return p; }
  var DEFS = {
    belt:      { n: "Convoyeur", cat: 0, s: 1, cost: { fe: 1 }, hp: 40, walk: true, d: "Deux voies, comme dans Factorio. Glisse pour tracer, R pour tourner. Un tapis qui arrive sur le côté d’un autre charge sa voie la plus proche." },
    splitter:  { n: "Splitter", cat: 0, s: 1, cost: { fe: 2, cu: 2 }, hp: 80, walk: true, d: "Entrée à l’arrière, sorties devant / gauche / droite en alternance. Filtre réglable : l’objet filtré ne sort que devant." },
    merger:    { n: "Fusionneur", cat: 0, s: 1, cost: { fe: 2, cu: 2 }, hp: 80, walk: true, d: "Entrées arrière / gauche / droite, une seule sortie devant." },
    unloader:  { n: "Déchargeur", cat: 0, s: 1, cost: { fe: 4, cu: 6 }, hp: 80, d: "Collé au noyau, il sort l’objet choisi du stock vers l’avant. Idéal pour envoyer des munitions." },
    drill:     { n: "Foreuse", cat: 1, s: 2, cost: { fe: 10, cu: 6 }, hp: 160, ports: [[1, 0, 0, "out"]], d: "2×2 sur du minerai. Plus il y a de minerai dessous, plus elle va vite. Une sortie." },
    smelter:   { n: "Fonderie", cat: 1, s: 2, cost: { cu: 12, fe: 6 }, hp: 160, ports: [[0, 0, 2, "in"], [1, 0, 0, "out"]], recipes: ["s_cu", "s_fe"], d: "Minerai → lingot. Une entrée, une sortie. Choisis la recette en cliquant dessus." },
    foundry:   { n: "Aciérie", cat: 1, s: 2, cost: { fe: 20, cu: 10 }, hp: 200, ports: [[0, 0, 2, "in"], [0, 1, 2, "in"], [1, 0, 0, "out"]], recipes: ["steel"], d: "Lingot de fer + charbon → acier. Deux entrées, une sortie." },
    assembler: { n: "Atelier", cat: 1, s: 2, cost: { cu: 16, fe: 16 }, hp: 180, ports: [[0, 0, 2, "in"], [0, 1, 2, "in"], [1, 0, 0, "out"]], recipes: ["ammo", "shell"], d: "Fabrique les munitions (cuivre) et les obus (acier + fer). Deux entrées, une sortie." },
    gun:       { n: "Mitrailleuse", cat: 2, s: 2, cost: { fe: 16, cu: 10 }, hp: 260, ports: edgePorts(2, "in"), ammo: "ammo", shots: 6, cap: 240, range: 6.5, rate: 0.13, dmg: 7, air: true, d: "Sol et air, tir rapide. Munitions : munitions. Entrées sur tous les côtés." },
    cannon:    { n: "Canon", cat: 2, s: 2, cost: { steel: 20, fe: 20 }, hp: 420, ports: edgePorts(2, "in"), ammo: "shell", shots: 2, cap: 40, range: 9, rate: 1.5, dmg: 55, splash: 1.6, d: "Obus explosifs, sol uniquement, longue portée. Munitions : obus." },
    wall:      { n: "Mur", cat: 2, s: 1, cost: { fe: 4 }, hp: 520, d: "Encaisse. Les ennemis préfèrent le contourner." }
  };
  var CATS = ["Logistique", "Production", "Défense"];
  var ENEMY = {
    rat:    { n: "Rat d’égout", sheet: 1, hp: 34, spd: 1.5, dmg: 9, r: 0.35, rew: 2, scale: 1 },
    knight: { n: "Cavalier", sheet: 2, hp: 170, spd: 0.75, dmg: 28, r: 0.45, rew: 6, scale: 1.1 },
    mage:   { n: "Mage volant", sheet: 3, hp: 60, spd: 1.05, dmg: 14, r: 0.4, rew: 5, scale: 1, air: true },
    boss:   { n: "Champion", sheet: 2, hp: 1600, spd: 0.5, dmg: 90, r: 0.8, rew: 80, scale: 1.9 }
  };
  var BEST_KEY = "rouages.best2";

  /* ---------- sprites ---------- */
  var A = RouagesArt.build();
  function img(src) { var i = new Image(); i.src = src; return i; }
  var V = "?v=20261123rg2";
  var IMG = { belts: img("assets/rouages/belts.png" + V), splitter: img("assets/rouages/splitter.png" + V), merger: img("assets/rouages/merger.png" + V), en: {} };
  [1, 2, 3].forEach(function (n) {
    var run = n === 3 ? "Fly" : "Run";
    IMG.en[n] = { S: img("assets/rouages/enemies/" + n + "/S_" + run + ".png" + V), D: img("assets/rouages/enemies/" + n + "/D_" + run + ".png" + V), U: img("assets/rouages/enemies/" + n + "/U_" + run + ".png" + V), X: img("assets/rouages/enemies/" + n + "/S_Death.png" + V), A: img("assets/rouages/enemies/" + n + "/S_Attack.png" + V) };
  });
  // splitter / fusionneur : images 64 px réduites à une tuile
  var SM = { splitter: null, merger: null };
  function prepSM() {
    ["splitter", "merger"].forEach(function (k) {
      var im = IMG[k]; if (!im.complete || !im.naturalWidth || SM[k]) return;
      SM[k] = [0, 1, 2, 3].map(function (d) {
        var fr = [];
        for (var f = 0; f < 8; f++) { var c = document.createElement("canvas"); c.width = c.height = 32; var g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(im, f * 64, d * 64, 64, 64, 0, 0, 32, 32); fr.push(c); }
        return fr;
      });
    });
  }

  /* ---------- DOM ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function iconCanvas(src, size) { var c = el("canvas", "rg-ic"); c.width = c.height = size; var g = c.getContext("2d"); g.imageSmoothingEnabled = false; var k = Math.min(size / src.width, size / src.height); g.drawImage(src, (size - src.width * k) / 2, (size - src.height * k) / 2, src.width * k, src.height * k); return c; }
  var canvas = el("canvas", "game-canvas rg-canvas"); canvas.tabIndex = 0;
  var ctx = canvas.getContext("2d");
  var hud = el("div", "rg-hud");
  var stockBox = el("div", "rg-stock");
  var waveBox = el("div", "rg-wave");
  var waveTxt = el("span", "rg-wave-txt");
  var waveBtn = el("button", "rg-btn", "Vague maintenant");
  var speedBtn = el("button", "rg-btn rg-sq", "×1");
  var pauseBtn = el("button", "rg-btn rg-sq", "❚❚");
  [waveBtn, speedBtn, pauseBtn].forEach(function (b) { b.type = "button"; });
  var coreBar = el("div", "rg-core", "<span></span>");
  waveBox.append(waveTxt, waveBtn, speedBtn, pauseBtn, coreBar);
  var info = el("div", "rg-info");
  var menu = el("div", "rg-menu");
  var tabs = el("div", "rg-tabs");
  var shelf = el("div", "rg-shelf");
  menu.append(tabs, shelf);
  var insp = el("div", "rg-insp"); insp.hidden = true;
  var overlay = el("div", "rg-overlay");
  hud.append(stockBox, waveBox, info, menu, insp);
  stage.append(canvas, hud, overlay);

  // stock (menu des objets)
  var stockCells = {};
  ITEM_IDS.forEach(function (k) {
    var c = el("div", "rg-st"); c.title = ITEMS[k];
    c.append(iconCanvas(A.items[k], 16), el("b", "", "0"));
    stockCells[k] = c.lastChild; stockBox.append(c);
  });

  // menu de construction par catégories
  var curCat = 0, toolBtns = {};
  var selBtn = el("button", "rg-tool rg-sel", "<span class='rg-emo'>✋</span><small>Sélection</small>");
  selBtn.type = "button"; selBtn.title = "Sélectionner / déplacer (Échap)";
  selBtn.addEventListener("click", function () { setTool("select"); });
  var delBtn = el("button", "rg-tool rg-del", "<span class='rg-emo'>🗑</span><small>Démolir</small>");
  delBtn.type = "button"; delBtn.title = "Démolir (X ou clic droit)";
  delBtn.addEventListener("click", function () { setTool("del"); });
  CATS.forEach(function (n, i) {
    var t = el("button", "rg-tab", n); t.type = "button";
    t.addEventListener("click", function () { curCat = i; renderShelf(); });
    tabs.append(t);
  });
  tabs.append(el("span", "rg-tab-hint", "Tab : catégorie · 1-4 : bâtiment"));
  function iconFor(type) {
    var s = DEFS[type].s, c = document.createElement("canvas"); c.width = c.height = 32 * s;
    drawBuildingTo(c.getContext("2d"), { type: type, dir: 0, x: 0, y: 0, s: s, on: false, ang: -0.6 }, 0, 0, 1, 0);
    return c;
  }
  function renderShelf() {
    Array.from(tabs.children).forEach(function (t, i) { t.classList.toggle("on", i === curCat); });
    shelf.innerHTML = "";
    shelf.append(selBtn);
    var n = 0;
    Object.keys(DEFS).forEach(function (k) {
      var d = DEFS[k]; if (d.cat !== curCat) return;
      n++;
      var b = toolBtns[k];
      if (!b) {
        b = el("button", "rg-tool"); b.type = "button"; b.dataset.tool = k;
        b.append(iconCanvas(iconFor(k), 30), el("small", "", d.n), el("span", "rg-cost"));
        b.addEventListener("click", function () { setTool(k); canvas.focus({ preventScroll: true }); });
        toolBtns[k] = b;
      }
      b.querySelector(".rg-cost").innerHTML = costHtml(d.cost);
      b.title = d.n + " (" + n + ")";
      b.dataset.key = n;
      shelf.append(b);
    });
    shelf.append(delBtn);
    markTool();
  }
  function costHtml(cost) {
    return Object.keys(cost).map(function (k) { return '<i data-it="' + k + '"></i>' + cost[k]; }).join(" ");
  }
  // les petites icônes de coût sont des <i data-it> remplacées par une image de fond
  var itemURL = {};
  ITEM_IDS.forEach(function (k) { itemURL[k] = A.items[k].toDataURL(); });
  var css = el("style", "", ITEM_IDS.map(function (k) { return '.rg-hud i[data-it="' + k + '"]{background-image:url(' + itemURL[k] + ")}"; }).join(""));
  document.head.append(css);

  // les icônes du menu ont besoin des images de convoyeurs/splitters : on les redessine une fois chargées
  [IMG.belts, IMG.splitter, IMG.merger].forEach(function (im) {
    im.addEventListener("load", function () { prepSM(); toolBtns = {}; if (S) renderShelf(); });
  });

  /* ---------- état ---------- */
  var S = null;
  var cam = { x: 14, y: 15, z: 30 };
  var ui = { tool: "select", dir: 0, hover: null, speed: 1, paused: false, started: false, sel: null };
  var dpr = 1, floorCv = document.createElement("canvas");

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function idx(x, y) { return y * W + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function bAt(x, y) { return inb(x, y) ? S.b[idx(x, y)] : null; }
  function loadBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

  function newGame() {
    for (var tries = 0; tries < 40; tries++) {
      S = {
        floor: new Uint8Array(W * H), b: new Array(W * H).fill(null), list: [], inPort: new Map(),
        enemies: [], corpses: [], bullets: [], parts: [],
        stock: { cu_o: 0, fe_o: 0, coal: 0, cu: 120, fe: 120, steel: 0, ammo: 60, shell: 0 },
        wave: 0, timer: 120, spawnQ: [], spawnT: 0, time: 0, kills: 0, over: false,
        dist: new Float32Array(W * H), dirty: true, topo: true, spawns: [], core: null, uid: 1
      };
      genMap((Math.random() * 1e9) | 0);
      computeField();
      S.spawns = [];
      for (var y = 0; y < H; y++) if (S.dist[idx(W - 1, y)] < 1e8) S.spawns.push(y);
      if (S.spawns.length >= 10) break;
    }
    renderFloor();
    cam.x = 15; cam.y = H / 2; fitZoom();
    ui.sel = null; insp.hidden = true;
    refreshHud(true);
  }

  function genMap(seed) {
    var rnd = mulberry32(seed), f = S.floor;
    function blob(cx, cy, r, t) {
      for (var y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (var x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!inb(x, y)) continue;
        var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (rnd() - 0.5) * 1.2;
        if (d < r) f[idx(x, y)] = t;
      }
    }
    for (var i = 0; i < 26; i++) blob(13 + rnd() * (W - 17), rnd() * H, 0.9 + rnd() * 1.8, ROCK);
    for (var x = 0; x < W; x++) { if (rnd() < 0.5) blob(x, -0.5, 1.3 + rnd(), ROCK); if (rnd() < 0.5) blob(x, H + 0.5, 1.3 + rnd(), ROCK); }
    var cy0 = Math.floor(H / 2) - 1;
    for (var y = 0; y < H; y++) for (x = 0; x < 11; x++) if (Math.hypot(x - 4.5, y - cy0 - 1) < 8) f[idx(x, y)] = 0;
    for (y = 0; y < H; y++) for (x = W - 2; x < W; x++) f[idx(x, y)] = 0;
    var oy = function (k) { return (rnd() - 0.5) * k; };
    blob(11, cy0 - 5 + oy(2), 2.6, 1); blob(11, cy0 + 7 + oy(2), 2.6, 2);
    blob(18, cy0 - 9 + oy(2), 2.4, 3); blob(19, cy0 + 1 + oy(4), 2.2, 2);
    blob(18, cy0 + 11 + oy(2), 2.3, 1); blob(27, 5 + oy(3), 2.6, 1); blob(27, H - 6 + oy(3), 2.6, 3);
    blob(30, H / 2 + oy(6), 2.4, 2); blob(38, 8 + oy(3), 2.2, 3); blob(38, H - 9 + oy(3), 2.2, 1);
    var core = mk("core", 3, cy0, 0, 3);
    S.core = core;
    for (y = core.y; y < core.y + 3; y++) for (x = core.x; x < core.x + 3; x++) f[idx(x, y)] = 0;
    addB(core);
  }

  /* ---------- bâtiments ---------- */
  function mk(type, x, y, dir, s) {
    var d = DEFS[type] || { hp: 2500 };
    var b = { id: S.uid++, type: type, x: x, y: y, dir: dir, s: s || d.s || 1, hp: d.hp, max: d.hp, inv: {}, out: {}, prog: 0, rr: 0, cd: 0, ang: Math.PI, on: false, flash: 0, kick: 0 };
    if (type === "belt") { b.lanes = [[], []]; b.curve = -1; b.part = 0; }
    if (type === "core") { b.hp = b.max = 2500; }
    if (DEFS[type] && DEFS[type].recipes) b.recipe = DEFS[type].recipes[0];
    if (type === "unloader") b.item = "ammo";
    if (type === "splitter") b.filter = null;
    if (type === "drill") b.ore = drillOre(x, y);
    return b;
  }
  function drillOre(x, y) {
    var cnt = {}, best = null;
    for (var yy = y; yy < y + 2; yy++) for (var xx = x; xx < x + 2; xx++) { var o = inb(xx, yy) && ORE[S.floor[idx(xx, yy)]]; if (o) { cnt[o] = (cnt[o] || 0) + 1; if (!best || cnt[o] > cnt[best]) best = o; } }
    return best ? { item: best, n: cnt[best] } : null;
  }
  function localPorts(b) {
    if (b.type === "core") return edgePorts(3, "in");
    return (DEFS[b.type] && DEFS[b.type].ports) || [];
  }
  function absPorts(b) {
    return localPorts(b).map(function (p) {
      var x = p[0], y = p[1], side = p[2];
      for (var q = 0; q < b.dir; q++) { var nx = b.s - 1 - y; y = x; x = nx; side = (side + 1) % 4; }
      return { x: b.x + x, y: b.y + y, side: side, io: p[3] };
    });
  }
  function addB(b) {
    for (var y = b.y; y < b.y + b.s; y++) for (var x = b.x; x < b.x + b.s; x++) S.b[idx(x, y)] = b;
    b.ports = absPorts(b);
    b.ports.forEach(function (p) { if (p.io === "in") S.inPort.set(idx(p.x, p.y) * 4 + p.side, b); });
    S.list.push(b); S.dirty = true; S.topo = true;
  }
  function removeB(b, refund) {
    if (!b || b.type === "core") return;
    if (refund) {
      pay(DEFS[b.type].cost, 1);
      // ce qui était dans le bâtiment revient au stock
      var give = function (k, n) { if (n > 0) S.stock[k] = Math.min(99999, (S.stock[k] || 0) + n); };
      Object.keys(b.inv).forEach(function (k) { give(k, b.inv[k]); });
      Object.keys(b.out).forEach(function (k) { give(k, b.out[k]); });
      if (b.lanes) b.lanes.forEach(function (l) { l.forEach(function (it) { give(it.k, 1); }); });
      if (b.buf) give(b.buf, 1);
    }
    for (var y = b.y; y < b.y + b.s; y++) for (var x = b.x; x < b.x + b.s; x++) if (S.b[idx(x, y)] === b) S.b[idx(x, y)] = null;
    (b.ports || []).forEach(function (p) { if (p.io === "in" && S.inPort.get(idx(p.x, p.y) * 4 + p.side) === b) S.inPort.delete(idx(p.x, p.y) * 4 + p.side); });
    var k = S.list.indexOf(b); if (k >= 0) S.list.splice(k, 1);
    if (ui.sel === b) closeInsp();
    S.dirty = true; S.topo = true;
  }
  function canAfford(cost) { for (var k in cost) if ((S.stock[k] || 0) < cost[k]) return false; return true; }
  function pay(cost, sign) { for (var k in cost) S.stock[k] = (S.stock[k] || 0) + cost[k] * sign; }
  function canPlace(type, x, y) {
    var d = DEFS[type], s = d.s, ore = false;
    for (var yy = y; yy < y + s; yy++) for (var xx = x; xx < x + s; xx++) {
      if (!inb(xx, yy) || S.floor[idx(xx, yy)] === ROCK) return false;
      var cur = S.b[idx(xx, yy)];
      if (cur && !(s === 1 && type === "belt" && cur.type === "belt")) return false;
      if (ORE[S.floor[idx(xx, yy)]]) ore = true;
    }
    if (type === "drill" && !ore) return false;
    if (type === "unloader" && !touchesCore(x, y)) return false;
    var cur1 = S.b[idx(x, y)];
    if (cur1 && cur1.type === "belt") return true;
    return canAfford(d.cost);
  }
  function touchesCore(x, y) { for (var d = 0; d < 4; d++) { var n = bAt(x + DX[d], y + DY[d]); if (n && n.type === "core") return true; } return false; }
  function place(type, x, y, dir) {
    if (!canPlace(type, x, y)) return false;
    var cur = S.b[idx(x, y)];
    if (cur && cur.type === "belt" && type === "belt") { if (cur.dir !== dir) { cur.dir = dir; S.topo = true; } return true; }
    pay(DEFS[type].cost, -1);
    var b = mk(type, x, y, dir);
    if (type === "unloader") b.item = ui.lastUnload || "ammo";
    addB(b);
    puff(x + DEFS[type].s / 2, y + DEFS[type].s / 2, "#a7a7ad", 6);
    return true;
  }

  /* ---------- logistique ---------- */
  // n envoie-t-il des objets vers la tuile (tx,ty) en se déplaçant dans la direction d ?
  function feeds(n, d, tx, ty) {
    if (!n) return false;
    switch (n.type) {
      case "belt": case "merger": case "unloader": return n.dir === d;
      case "splitter": return d !== (n.dir + 2) % 4;
      default:
        return (n.ports || []).some(function (p) { return p.io === "out" && p.side === d && p.x + DX[d] === tx && p.y + DY[d] === ty; });
    }
  }
  function feedsFrom(b, side) { var n = bAt(b.x + DX[side], b.y + DY[side]); return !!n && n !== b && feeds(n, (side + 2) % 4, b.x, b.y); }
  function acceptsFrom(n, d, tx, ty) {
    if (!n) return false;
    var side = (d + 2) % 4;
    switch (n.type) {
      case "belt": return n.dir !== side;
      case "splitter": return side === (n.dir + 2) % 4;
      case "merger": return side !== n.dir;
      default: return S.inPort.get(idx(tx, ty) * 4 + side) === n;
    }
  }
  function updateTopo() {
    S.list.forEach(function (b) {
      if (b.type !== "belt") return;
      var back = (b.dir + 2) % 4, l = (b.dir + 3) % 4, r = (b.dir + 1) % 4;
      b.curve = -1;
      var fb = feedsFrom(b, back), fl = feedsFrom(b, l), fr = feedsFrom(b, r);
      if (!fb && fl !== fr) b.curve = fl ? l : r;
      var fx = b.x + DX[b.dir], fy = b.y + DY[b.dir];
      var start = !(fb || fl || fr), end = !acceptsFrom(bAt(fx, fy), b.dir, fx, fy);
      b.part = start && end ? 0 : start ? 1 : end ? 3 : 2;
    });
    S.topo = false;
  }
  function laneInsert(b, lane, k, p) {
    var arr = b.lanes[lane], i;
    for (i = 0; i < arr.length; i++) if (Math.abs(arr[i].p - p) < GAP - 0.001) return false;
    i = 0; while (i < arr.length && arr[i].p < p) i++;
    arr.splice(i, 0, { k: k, p: p });
    return true;
  }
  // un objet arrive sur la tuile (tx,ty) en se déplaçant dans la direction d ; lane = voie d'origine si c'est un tapis
  function insertAt(tx, ty, d, k, lane) {
    var n = bAt(tx, ty);
    if (!n) return false;
    var side = (d + 2) % 4;
    switch (n.type) {
      case "belt":
        if (side === n.dir) return false;
        if (side === (n.dir + 2) % 4 || side === n.curve) {
          if (lane == null) { n.rr = (n.rr + 1) % 2; return laneInsert(n, n.rr, k, 0) || laneInsert(n, 1 - n.rr, k, 0); }
          return laneInsert(n, lane, k, 0);
        }
        return laneInsert(n, side === (n.dir + 3) % 4 ? 0 : 1, k, 0.5);
      case "splitter":
        if (side !== (n.dir + 2) % 4 || n.buf) return false;
        n.buf = k; n.bt = 0; return true;
      case "merger":
        if (side === n.dir || n.buf) return false;
        n.buf = k; n.bt = 0; return true;
      default:
        if (S.inPort.get(idx(tx, ty) * 4 + side) !== n) return false;
        return acceptItem(n, k);
    }
  }
  function acceptItem(b, k) {
    if (b.type === "core") { S.stock[k] = Math.min(99999, (S.stock[k] || 0) + 1); return true; }
    var d = DEFS[b.type];
    if (d.ammo) {
      if (k !== d.ammo || (b.ammo || 0) + d.shots > d.cap) return false;
      b.ammo = (b.ammo || 0) + d.shots; return true;
    }
    if (d.recipes) {
      var r = RECIPES[b.recipe];
      if (!r.in[k] || (b.inv[k] || 0) >= r.in[k] * 8) return false;
      b.inv[k] = (b.inv[k] || 0) + 1; return true;
    }
    return false;
  }
  function pushOut(b) {
    var keys = Object.keys(b.out);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; if (!b.out[k]) continue;
      for (var j = 0; j < b.ports.length; j++) {
        var p = b.ports[j]; if (p.io !== "out") continue;
        if (insertAt(p.x + DX[p.side], p.y + DY[p.side], p.side, k, null)) { b.out[k]--; return; }
      }
    }
  }
  function outCount(b) { var n = 0; for (var k in b.out) n += b.out[k]; return n; }

  /* ---------- simulation ---------- */
  function step(dt) {
    S.time += dt;
    if (S.topo) updateTopo();
    if (S.dirty) computeField();
    S.timer -= dt;
    if (S.timer <= 0) startWave();
    if (S.spawnQ.length) { S.spawnT -= dt; if (S.spawnT <= 0) { spawn(S.spawnQ.shift()); S.spawnT = 0.45; } }

    var i, b;
    for (i = 0; i < S.list.length; i++) {
      b = S.list[i];
      switch (b.type) {
        case "belt": stepBelt(b, dt); break;
        case "splitter":
          if (b.buf) {
            b.bt += dt; if (b.bt < 0.08) break;
            var outs = [b.dir, (b.dir + 3) % 4, (b.dir + 1) % 4];
            for (var k = 0; k < 3; k++) {
              var o = outs[(b.rr + k) % 3];
              if (b.filter && (o === b.dir) !== (b.buf === b.filter)) continue;
              if (insertAt(b.x + DX[o], b.y + DY[o], o, b.buf, null)) { b.buf = null; b.rr = (b.rr + k + 1) % 3; break; }
            }
          }
          break;
        case "merger":
          if (b.buf) { b.bt += dt; if (b.bt >= 0.08 && insertAt(b.x + DX[b.dir], b.y + DY[b.dir], b.dir, b.buf, null)) b.buf = null; }
          break;
        case "unloader":
          b.cd -= dt;
          if (b.cd <= 0 && b.item && touchesCore(b.x, b.y) && S.stock[b.item] > 0 && insertAt(b.x + DX[b.dir], b.y + DY[b.dir], b.dir, b.item, null)) { S.stock[b.item]--; b.cd = 0.12; }
          break;
        case "drill":
          if (b.ore && outCount(b) < 6) { b.prog += dt * b.ore.n / 4; if (b.prog >= 1.5) { b.prog = 0; b.out[b.ore.item] = (b.out[b.ore.item] || 0) + 1; } b.on = true; } else b.on = false;
          pushOut(b);
          break;
        case "smelter": case "foundry": case "assembler":
          var r = RECIPES[b.recipe], ok = outCount(b) < 10, key;
          for (key in r.in) if ((b.inv[key] || 0) < r.in[key]) ok = false;
          if (ok) {
            b.prog += dt; b.on = true;
            if (b.prog >= r.t) { b.prog = 0; for (key in r.in) b.inv[key] -= r.in[key]; for (key in r.out) b.out[key] = (b.out[key] || 0) + r.out[key]; }
          } else b.on = false;
          pushOut(b);
          break;
        case "gun": case "cannon": turret(b, dt); break;
        case "core": coreGun(b, dt); break;
      }
      if (b.flash > 0) b.flash -= dt;
      if (b.kick > 0) b.kick = Math.max(0, b.kick - dt * 8);
    }
    stepEnemies(dt);
    stepBullets(dt);
    for (i = S.parts.length - 1; i >= 0; i--) { var pa = S.parts[i]; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vx *= 0.9; pa.vy *= 0.9; pa.life -= dt; if (pa.life <= 0) S.parts.splice(i, 1); }
    for (i = S.corpses.length - 1; i >= 0; i--) { S.corpses[i].t += dt; if (S.corpses[i].t > 1.2) S.corpses.splice(i, 1); }
  }

  function stepBelt(b, dt) {
    var mv = BELT_SPEED * dt;
    for (var l = 0; l < 2; l++) {
      var arr = b.lanes[l], limit = 1;
      for (var i = arr.length - 1; i >= 0; i--) {
        var it = arr[i];
        it.p = Math.min(it.p + mv, limit);
        if (it.p >= 1 && i === arr.length - 1 && insertAt(b.x + DX[b.dir], b.y + DY[b.dir], b.dir, it.k, l)) { arr.splice(i, 1); limit = 1; continue; }
        limit = it.p - GAP;
      }
    }
  }

  /* ---------- champ de déplacement ---------- */
  function computeField() {
    var D = S.dist; D.fill(1e9);
    var hc = [], hi = [];
    function swap(a, b) { var t = hc[a]; hc[a] = hc[b]; hc[b] = t; t = hi[a]; hi[a] = hi[b]; hi[b] = t; }
    function push(c, i) { var n = hc.length; hc.push(c); hi.push(i); while (n > 0) { var p = (n - 1) >> 1; if (hc[p] <= hc[n]) break; swap(p, n); n = p; } }
    function pop() { var last = hc.length - 1; swap(0, last); var c = hc.pop(), i = hi.pop(), n = 0, L = hc.length; for (;;) { var l = 2 * n + 1, r = l + 1, m = n; if (l < L && hc[l] < hc[m]) m = l; if (r < L && hc[r] < hc[m]) m = r; if (m === n) break; swap(m, n); n = m; } return [c, i]; }
    var co = S.core;
    for (var y = co.y; y < co.y + 3; y++) for (var x = co.x; x < co.x + 3; x++) { D[idx(x, y)] = 0; push(0, idx(x, y)); }
    while (hc.length) {
      var t = pop(), c = t[0], i = t[1];
      if (c > D[i]) continue;
      var px = i % W, py = (i / W) | 0;
      for (var d = 0; d < 4; d++) {
        var nx = px + DX[d], ny = py + DY[d];
        if (!inb(nx, ny)) continue;
        var ni = idx(nx, ny);
        if (S.floor[ni] === ROCK) continue;
        var bb = S.b[ni], w = 1;
        if (bb && bb.type !== "core") w += DEFS[bb.type].walk ? 0.3 : bb.type === "wall" ? 18 : 8;
        if (c + w < D[ni]) { D[ni] = c + w; push(c + w, ni); }
      }
    }
    S.dirty = false;
  }

  /* ---------- combat ---------- */
  function nearest(x, y, range, airOk) {
    var best = null, bd = range;
    for (var i = 0; i < S.enemies.length; i++) { var e = S.enemies[i]; if (e.air && !airOk) continue; var d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function turret(b, dt) {
    var d = DEFS[b.type], x = b.x + 1, y = b.y + 1;
    b.cd -= dt;
    var t = nearest(x, y, d.range, d.air);
    if (!t) return;
    var want = Math.atan2(t.y - y, t.x - x), da = Math.atan2(Math.sin(want - b.ang), Math.cos(want - b.ang));
    b.ang += Math.max(-dt * 7, Math.min(dt * 7, da));
    if (Math.abs(da) < 0.25 && (b.ammo || 0) > 0 && b.cd <= 0) {
      b.cd = d.rate; b.ammo--; b.kick = 1;
      var spd = d.splash ? 9 : 16, mz = d.splash ? 1.15 : 0.95;
      if (d.splash) S.bullets.push({ x: x, y: y, tx: t.x, ty: t.y, sx: x + Math.cos(b.ang) * mz, sy: y + Math.sin(b.ang) * mz, t: 0, T: Math.max(0.2, Math.hypot(t.x - x, t.y - y) / spd), dmg: d.dmg, splash: d.splash, shell: true, h: 0 });
      else {
        b.rr = 1 - (b.rr || 0);
        var side = b.rr ? 0.28 : -0.28, nx = -Math.sin(b.ang) * side, ny = Math.cos(b.ang) * side;
        S.bullets.push({ x: x + Math.cos(b.ang) * mz + nx, y: y + Math.sin(b.ang) * mz + ny, vx: Math.cos(b.ang) * spd, vy: Math.sin(b.ang) * spd, life: d.range / spd + 0.1, dmg: d.dmg });
      }
    }
  }
  function coreGun(b, dt) {
    b.cd -= dt;
    var x = b.x + 1.5, y = b.y + 1.5, t = nearest(x, y, 5, true);
    if (!t || b.cd > 0) return;
    b.cd = 0.5; var a = Math.atan2(t.y - y, t.x - x);
    S.bullets.push({ x: x, y: y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, life: 0.5, dmg: 5, core: true });
  }
  function stepBullets(dt) {
    for (var i = S.bullets.length - 1; i >= 0; i--) {
      var u = S.bullets[i], j, e;
      if (u.shell) {
        u.t += dt; var k = Math.min(1, u.t / u.T);
        u.x = u.sx + (u.tx - u.sx) * k; u.y = u.sy + (u.ty - u.sy) * k; u.h = Math.sin(k * Math.PI) * Math.min(1.5, u.T);
        if (k >= 1) {
          for (j = 0; j < S.enemies.length; j++) { e = S.enemies[j]; if (!e.air && Math.hypot(e.x - u.x, e.y - u.y) < u.splash) damage(e, u.dmg); }
          puff(u.x, u.y, "#ffd23f", 16); puff(u.x, u.y, "#f28c28", 12); puff(u.x, u.y, "#4f4f54", 8);
          S.bullets.splice(i, 1);
        }
        continue;
      }
      u.x += u.vx * dt; u.y += u.vy * dt; u.life -= dt;
      var hitE = null;
      for (j = 0; j < S.enemies.length; j++) { e = S.enemies[j]; if (Math.hypot(e.x - u.x, e.y - u.y) < e.r + 0.1) { hitE = e; break; } }
      if (hitE) { damage(hitE, u.dmg); puff(u.x, u.y, "#fff1a8", 3); }
      if (hitE || u.life <= 0) S.bullets.splice(i, 1);
    }
  }
  function damage(e, d) { e.hp -= d; e.flash = 0.08; }
  function hit(e, target) {
    if (e.cd > 0 || S.over) return;
    e.cd = 1; e.atk = 0.5; target.hp -= e.dmg; target.flash = 0.15;
    if (target.hp <= 0) {
      if (target === S.core) { gameOver(); return; }
      puff(target.x + target.s / 2, target.y + target.s / 2, "#6b6b70", 18);
      removeB(target, false);
    }
  }
  function solid(b) { return b && (b.type === "core" || !DEFS[b.type].walk); }
  function stepEnemies(dt) {
    var co = S.core, ccx = co.x + 1.5, ccy = co.y + 1.5, i, e;
    for (i = 0; i < S.enemies.length; i++) {
      e = S.enemies[i];
      var vx = 0, vy = 0;
      e.cd -= dt; e.atk = Math.max(0, (e.atk || 0) - dt); e.anim += dt; if (e.flash > 0) e.flash -= dt;
      if (e.air) {
        var dx = ccx - e.x, dy = ccy - e.y, dl = Math.hypot(dx, dy);
        if (dl < 1.9) { hit(e, co); e.fx = dx; e.fy = dy; continue; }
        vx = dx / dl; vy = dy / dl;
      } else {
        var tx = Math.floor(e.x), ty = Math.floor(e.y), here = bAt(tx, ty);
        if (solid(here)) { hit(e, here); continue; }
        var best = -1, bd = 1e10;
        for (var d = 0; d < 4; d++) { var nx = tx + DX[d], ny = ty + DY[d]; if (!inb(nx, ny)) continue; var v = S.dist[idx(nx, ny)]; if (v < bd) { bd = v; best = d; } }
        if (best < 0) continue;
        var gx = tx + DX[best], gy = ty + DY[best], tgt = bAt(gx, gy);
        if (!solid(tgt)) tgt = null;
        var px = gx + 0.5 + (tgt ? 0 : e.ox), py = gy + 0.5 + (tgt ? 0 : e.oy);
        var mx = px - e.x, my = py - e.y, ml = Math.hypot(mx, my) || 1;
        if (tgt && ml < 0.55 + e.r) { hit(e, tgt); e.fx = mx; e.fy = my; continue; }
        vx = mx / ml; vy = my / ml;
      }
      e.x += vx * e.spd * dt; e.y += vy * e.spd * dt; e.fx = vx; e.fy = vy;
    }
    for (i = 0; i < S.enemies.length; i++) for (var j = i + 1; j < S.enemies.length; j++) {
      var a = S.enemies[i], c = S.enemies[j]; if (a.air !== c.air) continue;
      var sx = c.x - a.x, sy = c.y - a.y, sd = Math.hypot(sx, sy), min = (a.r + c.r) * 0.85;
      if (sd > 0.001 && sd < min) { var p = (min - sd) * 0.5 / sd; a.x -= sx * p; a.y -= sy * p; c.x += sx * p; c.y += sy * p; }
    }
    for (i = S.enemies.length - 1; i >= 0; i--) {
      e = S.enemies[i];
      if (e.hp <= 0) {
        S.enemies.splice(i, 1); S.kills++;
        S.stock.cu = Math.min(99999, S.stock.cu + e.rew);
        S.corpses.push({ x: e.x, y: e.y, sheet: e.sheet, scale: e.scale, flip: e.fx > 0, t: 0 });
      }
    }
  }
  function puff(x, y, c, n) {
    if (S.parts.length > 700) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = 0.6 + Math.random() * 2.6; S.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.4, c: c }); }
  }
  function startWave() {
    S.wave++;
    var w = S.wave, q = [], i;
    for (i = 0; i < 4 + w * 2; i++) q.push("rat");
    if (w >= 3) for (i = 0; i < Math.floor((w - 1) / 2); i++) q.push("knight");
    if (w >= 5) for (i = 0; i < Math.floor((w - 3) / 2); i++) q.push("mage");
    for (i = q.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = q[i]; q[i] = q[j]; q[j] = t; }
    if (w % 10 === 0) q.push("boss");
    S.spawnQ = S.spawnQ.concat(q);
    S.timer = 50;
    flashMsg("Vague " + w + (w % 10 === 0 ? " · un Champion approche !" : ""));
  }
  function spawn(type) {
    var D = ENEMY[type], sc = 1 + 0.15 * Math.pow(S.wave - 1, 1.15);
    var y = S.spawns[(Math.random() * S.spawns.length) | 0] + 0.5;
    S.enemies.push({ type: type, sheet: D.sheet, scale: D.scale, x: W - 0.3, y: y, hp: D.hp * sc, max: D.hp * sc, spd: D.spd, dmg: D.dmg * (1 + (sc - 1) * 0.5), r: D.r, rew: D.rew, air: !!D.air, cd: 0, anim: Math.random(), fx: -1, fy: 0, ox: (Math.random() - 0.5) * 0.4, oy: (Math.random() - 0.5) * 0.4, flash: 0 });
  }
  function gameOver() {
    S.over = true; S.core.hp = 0;
    var best = loadBest(), rec = S.wave > best;
    if (rec) saveBest(S.wave);
    showOverlay("<h2>Noyau détruit</h2><p>Tu as tenu <b>" + S.wave + "</b> vague" + (S.wave > 1 ? "s" : "") + " · " + S.kills + " ennemis éliminés.</p><p>" + (rec ? "🏆 Nouveau record !" : "Record : vague " + best) + "</p>", "Rejouer", function () { newGame(); hideOverlay(); });
  }

  /* ---------- rendu ---------- */
  function renderFloor() {
    floorCv.width = W * TS; floorCv.height = H * TS;
    var g = floorCv.getContext("2d"), r = mulberry32(99);
    g.imageSmoothingEnabled = false;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = S.floor[idx(x, y)], v = (r() * 1e6) | 0;
      var im;
      if (t === ROCK) {
        var open = function (dx, dy) { var nx = x + dx, ny = y + dy; return inb(nx, ny) && S.floor[idx(nx, ny)] !== ROCK; };
        im = A.rockTile((open(0, -1) ? 1 : 0) | (open(1, 0) ? 2 : 0) | (open(0, 1) ? 4 : 0) | (open(-1, 0) ? 8 : 0), v % 3);
      } else im = ORE[t] ? A.ore[ORE[t]][v % 4] : A.ground[v % A.ground.length];
      g.drawImage(im, x * TS, y * TS);
      if (x >= W - 2) { g.fillStyle = "rgba(228,59,68," + (x === W - 1 ? 0.18 : 0.08) + ")"; g.fillRect(x * TS, y * TS, TS, TS); }
    }
  }
  var FR = 0;
  function half(g, im, sx, sy, X, Y, z, side) {
    var hx = side === 0 ? 16 : 0, hy = side === 1 ? 16 : 0, hw = side % 2 === 0 ? 16 : 32, hh = side % 2 ? 16 : 32;
    g.drawImage(im, sx + hx, sy + hy, hw, hh, X + hx / 32 * z, Y + hy / 32 * z, hw / 32 * z, hh / 32 * z);
  }
  function drawBelt(g, b, X, Y, k) {
    var bi = IMG.belts; if (!bi.complete || !bi.naturalWidth) return;
    var f = FR % 8, z = TS * k;
    var row = function (dir, part) { return (dir * 4 + part) * 32; };
    if (b.curve >= 0) {
      // virage : la moitié d'entrée dans le sens d'arrivée + la moitié de sortie
      half(g, bi, f * 32, row((b.curve + 2) % 4, 2), X, Y, z, b.curve);
      half(g, bi, f * 32, row(b.dir, 2), X, Y, z, b.dir);
    } else g.drawImage(bi, f * 32, row(b.dir, b.part || 0), 32, 32, X, Y, z, z);
  }
  function drawBuildingTo(g, b, X, Y, k, t) {
    var z = TS * k, f8 = Math.floor(t * 8);
    switch (b.type) {
      case "belt": if (b.lanes) drawBelt(g, b, X, Y, k); else if (IMG.belts.complete && IMG.belts.naturalWidth) g.drawImage(IMG.belts, 0, (b.dir * 4 + 2) * 32, 32, 32, X, Y, z, z); break;
      case "splitter": case "merger":
        prepSM();
        if (SM[b.type]) g.drawImage(SM[b.type][b.dir][FR % 8], X, Y, z, z);
        break;
      case "drill": g.drawImage(A.b.drill[b.on ? f8 % 8 : 0][b.dir], X, Y, z * 2, z * 2); break;
      case "smelter": case "foundry": g.drawImage(A.b[b.type][b.on ? 1 : 0][b.dir], X, Y, z * 2, z * 2); break;
      case "assembler": g.drawImage(A.b.assembler[b.on ? Math.floor(t * 12) % 16 : 0][b.dir], X, Y, z * 2, z * 2); break;
      case "unloader": g.drawImage(A.b.unloader[b.dir], X, Y, z, z); break;
      case "wall": g.drawImage(A.b.wall, X, Y, z, z); break;
      case "core": g.drawImage(A.b.core[Math.floor(t * 3) % 4], X, Y, z * 3, z * 3); break;
      case "gun": case "cannon":
        var base = b.type === "gun" ? A.b.gunBase : A.b.cannonBase, head = b.type === "gun" ? A.b.gunHead : A.b.cannonHead;
        g.drawImage(base, X, Y, z * 2, z * 2);
        var hs = head[0].width / 32 * z, kick = (b.kick || 0) * 0.08 * z;
        g.save(); g.translate(X + z, Y + z); g.rotate(b.ang); g.drawImage(head[b.kick > 0.6 ? 1 : 0], -hs / 2 - kick, -hs / 2, hs, hs); g.restore();
        break;
    }
  }
  function drawPorts(g, b, X0, Y0, z, alpha) {
    g.globalAlpha = alpha;
    b.ports.forEach(function (p) {
      var im = A.port[p.io === "out" ? "out" : "in"][(p.side + 3) % 4];
      var cx = X0 + (p.x - b.x + 0.5 + DX[p.side] * 0.5) * z, cy = Y0 + (p.y - b.y + 0.5 + DY[p.side] * 0.5) * z;
      var w = im.width / 32 * z, h = im.height / 32 * z;
      g.drawImage(im, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    });
    g.globalAlpha = 1;
  }
  function itemPos(b, it, lane) {
    var cx = b.x + 0.5, cy = b.y + 0.5, d, x, y;
    if (b.curve >= 0 && it.p < 0.5) { x = cx + DX[b.curve] * (0.5 - it.p); y = cy + DY[b.curve] * (0.5 - it.p); d = (b.curve + 2) % 4; }
    else { x = cx + DX[b.dir] * (it.p - 0.5); y = cy + DY[b.dir] * (it.p - 0.5); d = b.dir; }
    var ln = (d + 3) % 4, off = lane === 0 ? 0.2 : -0.2;
    return [x + DX[ln] * off, y + DY[ln] * off];
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = stage.clientWidth, h = stage.clientHeight;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function fitZoom() { var w = stage.clientWidth || 800, h = stage.clientHeight || 500; cam.z = Math.max(16, Math.min(44, Math.min(w / 28, (h - 120) / 17))); }
  function toScreen(wx, wy) { var s = cam.z * dpr; return [(wx - cam.x) * s + canvas.width / 2, (wy - cam.y) * s + canvas.height / 2]; }
  function toWorld(px, py) { var r = canvas.getBoundingClientRect(); return [(px - r.left - r.width / 2) / cam.z + cam.x, (py - r.top - r.height / 2) / cam.z + cam.y]; }

  function render() {
    var cw = canvas.width, ch = canvas.height, s = cam.z * dpr, t = S.time;
    FR = Math.floor(t * 12);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#16171a"; ctx.fillRect(0, 0, cw, ch);
    var o = toScreen(0, 0), ox = Math.round(o[0]), oy = Math.round(o[1]);
    ctx.drawImage(floorCv, ox, oy, Math.round(W * s), Math.round(H * s));
    function sx(x) { return Math.round(ox + x * s); }
    function sy(y) { return Math.round(oy + y * s); }
    var vx0 = cam.x - cw / 2 / s - 3, vx1 = cam.x + cw / 2 / s + 1, vy0 = cam.y - ch / 2 / s - 3, vy1 = cam.y + ch / 2 / s + 1;
    var i, b, list = S.list, k = s / TS;
    function vis(b) { return b.x + b.s > vx0 && b.x < vx1 && b.y + b.s > vy0 && b.y < vy1; }
    // 1. tapis  2. objets  3. bâtiments (les splitters recouvrent les tapis)
    for (i = 0; i < list.length; i++) { b = list[i]; if (b.type === "belt" && vis(b)) drawBuildingTo(ctx, b, sx(b.x), sy(b.y), k, t); }
    var isz = Math.max(6, Math.round(s * 0.36));
    for (i = 0; i < list.length; i++) {
      b = list[i]; if (b.type !== "belt" || !vis(b)) continue;
      for (var l = 0; l < 2; l++) for (var j = 0; j < b.lanes[l].length; j++) {
        var p = itemPos(b, b.lanes[l][j], l);
        ctx.drawImage(A.items[b.lanes[l][j].k], Math.round(ox + p[0] * s - isz / 2), Math.round(oy + p[1] * s - isz / 2), isz, isz);
      }
    }
    for (i = 0; i < list.length; i++) {
      b = list[i]; if (b.type === "belt" || !vis(b)) continue;
      var X = sx(b.x), Y = sy(b.y), d = DEFS[b.type];
      drawBuildingTo(ctx, b, X, Y, k, t);
      if ((b.type === "splitter" || b.type === "merger") && b.buf) ctx.drawImage(A.items[b.buf], X + s * 0.3, Y + s * 0.3, s * 0.4, s * 0.4);
      if (b.type === "unloader" && b.item) ctx.drawImage(A.items[b.item], X + s * 0.05, Y + s * 0.05, s * 0.4, s * 0.4);
      if (b.type === "splitter" && b.filter) ctx.drawImage(A.items[b.filter], X + s * 0.55, Y + s * 0.05, s * 0.4, s * 0.4);
      if (d && d.ports && !d.ammo) drawPorts(ctx, b, X, Y, s, 0.95);
      if (d && d.recipes && b.recipe) { var rk = Object.keys(RECIPES[b.recipe].out)[0]; ctx.drawImage(A.items[rk], X + s * 1.45, Y + s * 1.45, s * 0.45, s * 0.45); }
      if (d && d.ammo && !b.ammo) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8); ctx.drawImage(A.items[d.ammo], X + s * 0.7, Y + s * 0.7, s * 0.6, s * 0.6); ctx.globalAlpha = 1; }
      if (b.flash > 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = "#e43b44"; ctx.fillRect(X, Y, b.s * s, b.s * s); ctx.globalAlpha = 1; }
      if (b.hp < b.max && b.type !== "core") bar(X + b.s * s * 0.1, Y - 5 * dpr, b.s * s * 0.8, b.hp / b.max, b.hp / b.max > 0.4 ? "#63c74d" : "#e43b44");
      if (b === ui.sel) { ctx.strokeStyle = "#fbf236"; ctx.lineWidth = 2 * dpr; ctx.strokeRect(X + 1, Y + 1, b.s * s - 2, b.s * s - 2); }
    }
    if (ui.sel && ui.sel.type === "belt") { ctx.strokeStyle = "#fbf236"; ctx.lineWidth = 2 * dpr; ctx.strokeRect(sx(ui.sel.x) + 1, sy(ui.sel.y) + 1, s - 2, s - 2); }
    // ennemis (et cadavres), triés par profondeur
    var all = S.corpses.concat(S.enemies);
    all.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < all.length; i++) drawEnemy(all[i], ox, oy, s);
    for (i = 0; i < S.bullets.length; i++) {
      var u = S.bullets[i];
      if (u.shell) {
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx(u.x) - 3 * dpr, sy(u.y) - 2 * dpr, 6 * dpr, 4 * dpr);
        ctx.fillStyle = "#000"; ctx.fillRect(sx(u.x) - 4 * dpr, sy(u.y - u.h) - 4 * dpr, 8 * dpr, 8 * dpr);
        ctx.fillStyle = "#c99a2e"; ctx.fillRect(sx(u.x) - 3 * dpr, sy(u.y - u.h) - 3 * dpr, 6 * dpr, 6 * dpr);
      } else { ctx.strokeStyle = u.core ? "#9cc6ff" : "#fff1a8"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(sx(u.x), sy(u.y)); ctx.lineTo(sx(u.x - u.vx * 0.03), sy(u.y - u.vy * 0.03)); ctx.stroke(); }
    }
    for (i = 0; i < S.parts.length; i++) { var pa = S.parts[i]; ctx.globalAlpha = Math.min(1, pa.life * 3); ctx.fillStyle = pa.c; ctx.fillRect(sx(pa.x) - dpr * 1.5, sy(pa.y) - dpr * 1.5, 3 * dpr, 3 * dpr); }
    ctx.globalAlpha = 1;

    // fantôme de construction
    var hv = ui.hover;
    if (hv && !S.over && DEFS[ui.tool]) {
      var dd = DEFS[ui.tool], a0 = anchor(hv), gx = a0[0], gy = a0[1];
      var ok = canPlace(ui.tool, gx, gy);
      var ghost = { type: ui.tool, x: gx, y: gy, dir: ui.dir, s: dd.s, ang: ui.dir * Math.PI / 2, on: false, curve: -1, part: 0 };
      ghost.ports = absPorts(ghost);
      ctx.globalAlpha = 0.65; drawBuildingTo(ctx, ghost, sx(gx), sy(gy), k, t); ctx.globalAlpha = 1;
      if (ghost.type === "belt" || ghost.type === "splitter" || ghost.type === "merger" || ghost.type === "unloader") {
        ctx.fillStyle = "#fbf236"; ctx.save(); ctx.translate(sx(gx + 0.5), sy(gy + 0.5)); ctx.rotate(ui.dir * Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(s * 0.62, 0); ctx.lineTo(s * 0.4, -s * 0.16); ctx.lineTo(s * 0.4, s * 0.16); ctx.fill(); ctx.restore();
      }
      if (dd.ports && !dd.ammo) drawPorts(ctx, ghost, sx(gx), sy(gy), s, 1);
      ctx.strokeStyle = ok ? "#63c74d" : "#e43b44"; ctx.lineWidth = 2 * dpr; ctx.strokeRect(sx(gx) + 1, sy(gy) + 1, dd.s * s - 2, dd.s * s - 2);
      if (dd.range) ring(gx + dd.s / 2, gy + dd.s / 2, dd.range, ok ? "rgba(99,199,77,.6)" : "rgba(228,59,68,.6)");
      if (ui.tool === "drill") { var dore = drillOre(gx, gy); if (dore) ctx.drawImage(A.items[dore.item], sx(gx) + s * 1.5, sy(gy) - s * 0.4, s * 0.6, s * 0.6); }
    } else if (hv && ui.tool === "del") {
      var hb = bAt(hv[0], hv[1]);
      ctx.strokeStyle = hb && hb.type !== "core" ? "#e43b44" : "rgba(255,255,255,.3)"; ctx.lineWidth = 2 * dpr;
      if (hb) ctx.strokeRect(sx(hb.x) + 1, sy(hb.y) + 1, hb.s * s - 2, hb.s * s - 2); else ctx.strokeRect(sx(hv[0]) + 1, sy(hv[1]) + 1, s - 2, s - 2);
    }
    if (ui.sel && DEFS[ui.sel.type] && DEFS[ui.sel.type].range) ring(ui.sel.x + 1, ui.sel.y + 1, DEFS[ui.sel.type].range, "rgba(251,242,54,.45)");
    function ring(x, y, r, c) { ctx.strokeStyle = c; ctx.lineWidth = 2 * dpr; ctx.setLineDash([6 * dpr, 6 * dpr]); ctx.beginPath(); ctx.arc(sx(x), sy(y), r * s, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
    function bar(x, y, w, v, c) { ctx.fillStyle = "#000"; ctx.fillRect(x - dpr, y - dpr, w + 2 * dpr, 5 * dpr); ctx.fillStyle = c; ctx.fillRect(x, y, w * Math.max(0, v), 3 * dpr); }
    if (S.spawnQ.length || S.timer < 8) {
      var sp = toScreen(W, H / 2), px = Math.min(cw - 30 * dpr, sp[0] - 10 * dpr), py = Math.max(80 * dpr, Math.min(ch - 140 * dpr, sp[1]));
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8); ctx.fillStyle = "#e43b44";
      ctx.beginPath(); ctx.moveTo(px, py - 14 * dpr); ctx.lineTo(px - 18 * dpr, py); ctx.lineTo(px, py + 14 * dpr); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function drawEnemy(e, ox, oy, s) {
    var dead = e.t != null, set = IMG.en[e.sheet], im, flip = false;
    if (dead) { im = set.X; flip = e.flip; }
    else if (e.atk > 0 && !e.air) { im = set.A; flip = e.fx > 0; }
    else if (Math.abs(e.fx) >= Math.abs(e.fy)) { im = set.S; flip = e.fx > 0; }
    else im = e.fy > 0 ? set.D : set.U;
    if (!im || !im.complete || !im.naturalWidth) return;
    var fr = dead ? Math.min(5, Math.floor(e.t * 8)) : Math.floor(e.anim * (e.air ? 8 : 12)) % 6;
    var size = 96 / TS * s * 0.85 * e.scale, X = ox + e.x * s, Y = oy + e.y * s - size * 0.12;
    if (dead) ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - 0.7) * 2);
    if (!dead && e.air) { ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(X, oy + e.y * s + size * 0.28, size * 0.18, size * 0.07, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = dead ? ctx.globalAlpha : 1; }
    ctx.save(); ctx.translate(Math.round(X), Math.round(Y)); if (flip) ctx.scale(-1, 1);
    if (e.flash > 0) ctx.filter = "brightness(3)";
    ctx.drawImage(im, fr * 96, 0, 96, 96, -size / 2, -size / 2, size, size);
    ctx.restore(); ctx.globalAlpha = 1;
    if (!dead && e.hp < e.max) { var w = size * 0.4; ctx.fillStyle = "#000"; ctx.fillRect(X - w / 2 - dpr, Y - size * 0.32 - dpr, w + 2 * dpr, 5 * dpr); ctx.fillStyle = "#e43b44"; ctx.fillRect(X - w / 2, Y - size * 0.32, w * Math.max(0, e.hp / e.max), 3 * dpr); }
  }

  /* ---------- HUD ---------- */
  var msgT = 0, msgText = "", lastTxt = "";
  function flashMsg(m) { msgText = m; msgT = 2.5; }
  function refreshHud(force) {
    ITEM_IDS.forEach(function (k) { var v = String(Math.floor(S.stock[k] || 0)); if (stockCells[k].textContent !== v) stockCells[k].textContent = v; });
    waveTxt.textContent = S.spawnQ.length ? "Vague " + S.wave + " en cours" : (S.wave ? "Vague " + S.wave + " · " : "") + "prochaine dans " + Math.ceil(S.timer) + " s";
    coreBar.firstChild.style.width = (100 * Math.max(0, S.core.hp) / S.core.max) + "%";
    coreBar.title = "Noyau : " + Math.ceil(S.core.hp) + " / " + S.core.max;
    var txt, d = DEFS[ui.tool];
    if (msgT > 0) txt = '<b class="rg-msg">' + msgText + "</b>";
    else if (d) txt = "<b>" + d.n + "</b> " + costHtml(d.cost) + " · " + d.d + " <span class='rg-dim'>R : tourner · clic droit : annuler</span>";
    else if (ui.tool === "del") txt = "<b>Démolir</b> · ressources et contenu remboursés.";
    else txt = "<b>Sélection</b> · clique un bâtiment pour ouvrir son menu, glisse pour déplacer la carte.";
    if (force || txt !== lastTxt) { info.innerHTML = txt; lastTxt = txt; }
    Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle("poor", !canAfford(DEFS[k].cost)); });
    if (ui.sel) refreshInsp();
  }
  function markTool() {
    Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle("on", k === ui.tool); });
    selBtn.classList.toggle("on", ui.tool === "select"); delBtn.classList.toggle("on", ui.tool === "del");
  }
  function setTool(id) {
    ui.tool = id;
    if (DEFS[id] && DEFS[id].cat !== curCat) { curCat = DEFS[id].cat; renderShelf(); }
    markTool();
    canvas.style.cursor = id === "select" ? "default" : "crosshair";
    msgT = 0; refreshHud(true);
  }

  /* ---------- menu d'un bâtiment ---------- */
  function openInsp(b) { ui.sel = b; insp.hidden = false; insp.dataset.html = ""; refreshInsp(); }
  function closeInsp() { ui.sel = null; insp.hidden = true; }
  function itemBtn(k, on, title) { return '<button type="button" class="rg-itb' + (on ? " on" : "") + '" data-pick="' + (k || "") + '" title="' + title + '">' + (k ? '<i data-it="' + k + '"></i>' : "∅") + "</button>"; }
  function slot(k, n, cap) { return '<span class="rg-slot" title="' + ITEMS[k] + '"><i data-it="' + k + '"></i><b>' + (n || 0) + (cap ? "<small>/" + cap + "</small>" : "") + "</b></span>"; }
  function refreshInsp() {
    var b = ui.sel; if (!b) return;
    var d = DEFS[b.type], name = b.type === "core" ? "Noyau" : d.n, body = "";
    if (b.type === "core") body = "<p>Tout ce qui y entre rejoint le stock (en haut à gauche) et paie les constructions. Petit canon intégré.</p>";
    else if (d.recipes) {
      var r = RECIPES[b.recipe];
      body += '<div class="rg-sec">Recette</div><div class="rg-row">' + d.recipes.map(function (id) {
        var rr = RECIPES[id], ok = Object.keys(rr.out)[0];
        return '<button type="button" class="rg-rec' + (id === b.recipe ? " on" : "") + '" data-rec="' + id + '"><i data-it="' + ok + '"></i>' + rr.n + "</button>";
      }).join("") + "</div>";
      body += '<div class="rg-sec">Entrées → sortie</div><div class="rg-row rg-flow">' +
        Object.keys(r.in).map(function (k) { return slot(k, b.inv[k], r.in[k] * 8); }).join("") + '<span class="rg-arrow">→</span>' +
        Object.keys(r.out).map(function (k) { return slot(k, b.out[k]); }).join("") + "</div>" +
        '<div class="rg-prog"><span style="width:' + Math.round(100 * b.prog / r.t) + '%"></span></div>' +
        '<p class="rg-dim">' + Object.keys(r.in).map(function (k) { return r.in[k] + " " + ITEMS[k].toLowerCase(); }).join(" + ") + " → " + Object.keys(r.out).map(function (k) { return r.out[k] + " " + ITEMS[k].toLowerCase(); }).join(" + ") + " · " + r.t + " s</p>";
    } else if (b.type === "drill") {
      body = b.ore ? '<div class="rg-row rg-flow">' + slot(b.ore.item, b.out[b.ore.item]) + "</div><p class='rg-dim'>" + b.ore.n + " tuile" + (b.ore.n > 1 ? "s" : "") + " de " + ITEMS[b.ore.item].toLowerCase() + " · " + Math.round(b.ore.n / 4 / 1.5 * 60) + " / min</p>" : "<p>Aucun minerai dessous.</p>";
    } else if (d.ammo) {
      body = '<div class="rg-row rg-flow">' + slot(d.ammo, b.ammo || 0, d.cap) + "</div><p class='rg-dim'>Coups en réserve. Amène des " + ITEMS[d.ammo].toLowerCase() + " par tapis, sur n’importe quel côté.</p>";
    } else if (b.type === "splitter") {
      body = '<div class="rg-sec">Filtre (sortie avant)</div><div class="rg-grid">' + itemBtn(null, !b.filter, "Aucun filtre : alternance") + ITEM_IDS.map(function (k) { return itemBtn(k, b.filter === k, ITEMS[k]); }).join("") + "</div>";
    } else if (b.type === "unloader") {
      body = '<div class="rg-sec">Objet à sortir du noyau</div><div class="rg-grid">' + ITEM_IDS.map(function (k) { return itemBtn(k, b.item === k, ITEMS[k]); }).join("") + "</div>" + (touchesCore(b.x, b.y) ? "" : "<p class='rg-warn'>Pas collé au noyau !</p>");
    } else if (b.type === "belt") {
      body = "<p class='rg-dim'>Voie gauche : " + b.lanes[0].length + " objet(s) · voie droite : " + b.lanes[1].length + "</p>";
    }
    var html = '<div class="rg-ih"><b>' + name + '</b><button type="button" class="rg-x" data-act="close" title="Fermer">✕</button></div>' +
      '<div class="rg-hp"><span style="width:' + Math.round(100 * b.hp / b.max) + '%"></span></div>' + body +
      (b.type !== "core" ? '<div class="rg-row rg-acts"><button type="button" class="rg-btn" data-act="rot">↻ Tourner</button><button type="button" class="rg-btn rg-danger" data-act="del">Démolir</button></div>' : "");
    if (insp.dataset.html !== html) { insp.innerHTML = html; insp.dataset.html = html; }
  }
  insp.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
  insp.addEventListener("click", function (ev) {
    var t = ev.target.closest("button"), b = ui.sel; if (!t || !b) return;
    if (t.dataset.act === "close") return closeInsp();
    if (t.dataset.act === "del") { removeB(b, true); return; }
    if (t.dataset.act === "rot") { rotateB(b); return; }
    if (t.dataset.rec && b.recipe !== t.dataset.rec) { Object.keys(b.inv).forEach(function (k) { S.stock[k] += b.inv[k]; }); b.inv = {}; b.prog = 0; b.recipe = t.dataset.rec; }
    if (t.dataset.pick != null) {
      var k = t.dataset.pick || null;
      if (b.type === "splitter") b.filter = k;
      if (b.type === "unloader") { b.item = k; ui.lastUnload = k; }
    }
    refreshInsp();
  });
  function rotateB(b) {
    if (b.type === "core") return;
    var keep = { inv: b.inv, out: b.out, recipe: b.recipe, filter: b.filter, item: b.item, ammo: b.ammo, hp: b.hp, lanes: b.lanes, ang: b.ang };
    removeB(b, false);
    var n = mk(b.type, b.x, b.y, (b.dir + 1) % 4);
    Object.keys(keep).forEach(function (k) { if (keep[k] !== undefined) n[k] = keep[k]; });
    addB(n); openInsp(n);
  }
  function showOverlay(html, btn, fn) {
    overlay.innerHTML = '<div class="rg-panel">' + html + '<button type="button" class="btn">' + btn + "</button></div>";
    overlay.querySelector("button").addEventListener("click", fn);
    overlay.hidden = false;
  }
  function hideOverlay() { overlay.hidden = true; canvas.focus({ preventScroll: true }); }
  waveBtn.addEventListener("click", function () { if (S && !S.over && !S.spawnQ.length) S.timer = 0; });
  speedBtn.addEventListener("click", function () { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 3 : 1; speedBtn.textContent = "×" + ui.speed; });
  pauseBtn.addEventListener("click", togglePause);
  function togglePause() { ui.paused = !ui.paused; pauseBtn.textContent = ui.paused ? "▶" : "❚❚"; if (ui.paused) { flashMsg("Pause"); msgT = 1e9; } else msgT = 0; }

  /* ---------- entrées ---------- */
  var ptrs = new Map(), drag = null, pinch = null;
  function tileAt(ev) { var w = toWorld(ev.clientX, ev.clientY); return [Math.floor(w[0]), Math.floor(w[1])]; }
  function anchor(t) { var d = DEFS[ui.tool]; var o = d && d.s > 1 ? Math.floor((d.s - 1) / 2) : 0; return [t[0] - o, t[1] - o]; }
  function applyTool(t) {
    if (S.over) return;
    if (ui.tool === "del") { removeB(bAt(t[0], t[1]), true); return; }
    if (DEFS[ui.tool]) { var a = anchor(t); place(ui.tool, a[0], a[1], ui.dir); }
  }
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointerdown", function (ev) {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 2) { var a = Array.from(ptrs.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: cam.z, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 }; drag = null; return; }
    var t = tileAt(ev);
    if (ev.button === 2) { if (DEFS[ui.tool]) { setTool("select"); return; } removeB(bAt(t[0], t[1]), true); drag = { mode: "del" }; return; }
    if (ev.button === 1 || ui.tool === "select" || ev.shiftKey) { drag = { mode: "pan", x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y, moved: false, t: t }; return; }
    drag = { mode: "build", last: t };
    applyTool(t);
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    var t = tileAt(ev); ui.hover = t;
    if (pinch && ptrs.size === 2) {
      var a = Array.from(ptrs.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
      cam.z = clampZ(pinch.z * d / pinch.d); cam.x -= (mx - pinch.mx) / cam.z; cam.y -= (my - pinch.my) / cam.z; pinch.mx = mx; pinch.my = my; clampCam(); return;
    }
    if (!drag) return;
    if (drag.mode === "pan") {
      if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > 5) { drag.moved = true; canvas.style.cursor = "grabbing"; }
      if (drag.moved) { cam.x = drag.cx - (ev.clientX - drag.x) / cam.z; cam.y = drag.cy - (ev.clientY - drag.y) / cam.z; clampCam(); }
      return;
    }
    if (drag.mode === "del") { if (ev.buttons & 2) removeB(bAt(t[0], t[1]), true); return; }
    if (ui.tool === "belt" || ui.tool === "wall" || ui.tool === "del") {
      var l = drag.last;
      while (l[0] !== t[0] || l[1] !== t[1]) {
        var ddx = t[0] - l[0], ddy = t[1] - l[1], dd = Math.abs(ddx) >= Math.abs(ddy) ? (ddx > 0 ? 0 : 2) : (ddy > 0 ? 1 : 3);
        var n = [l[0] + DX[dd], l[1] + DY[dd]];
        if (ui.tool === "belt") { ui.dir = dd; var pb = bAt(l[0], l[1]); if (pb && pb.type === "belt" && pb.dir !== dd) { pb.dir = dd; S.topo = true; } }
        applyTool(n); l = n;
      }
      drag.last = l;
    }
  });
  function endPtr(ev) {
    ptrs.delete(ev.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (drag && drag.mode === "pan" && !drag.moved && ui.tool === "select") { var b = bAt(drag.t[0], drag.t[1]); if (b) openInsp(b); else closeInsp(); }
    if (ptrs.size === 0) { drag = null; canvas.style.cursor = ui.tool === "select" ? "default" : "crosshair"; }
  }
  canvas.addEventListener("pointerup", endPtr);
  canvas.addEventListener("pointercancel", endPtr);
  canvas.addEventListener("pointerleave", function () { if (!drag) ui.hover = null; });
  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var before = toWorld(ev.clientX, ev.clientY);
    cam.z = clampZ(cam.z * (ev.deltaY < 0 ? 1.12 : 1 / 1.12));
    var after = toWorld(ev.clientX, ev.clientY);
    cam.x += before[0] - after[0]; cam.y += before[1] - after[1]; clampCam();
  }, { passive: false });
  function clampZ(z) { return Math.max(10, Math.min(80, z)); }
  function clampCam() { cam.x = Math.max(0, Math.min(W, cam.x)); cam.y = Math.max(0, Math.min(H, cam.y)); }
  var keys = {};
  document.addEventListener("keydown", function (ev) {
    if (!S || /INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || "")) return;
    var k = ev.key.toLowerCase(); keys[k] = true;
    var mine = document.activeElement === canvas || stage.contains(document.activeElement) || !!document.fullscreenElement;
    if ((/^arrow/.test(k) || k === "tab") && mine) ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (k === "tab") { if (mine) { curCat = (curCat + (ev.shiftKey ? 2 : 1)) % 3; renderShelf(); } return; }
    if (/^[1-9]$/.test(k)) { var bt = shelf.querySelector('.rg-tool[data-key="' + k + '"]'); if (bt) setTool(bt.dataset.tool); return; }
    if (k === "escape") { setTool("select"); closeInsp(); }
    else if (k === "x") setTool("del");
    else if (k === "r") { if (DEFS[ui.tool]) ui.dir = (ui.dir + (ev.shiftKey ? 3 : 1)) % 4; else if (ui.sel) rotateB(ui.sel); }
    else if (k === "p") togglePause();
  });
  document.addEventListener("keyup", function (ev) { keys[ev.key.toLowerCase()] = false; });
  window.addEventListener("blur", function () { keys = {}; });

  /* ---------- boucle ---------- */
  var last = performance.now(), hudT = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var pan = 16 / cam.z * 30 * dt;
    if (keys.q || keys.a || keys.arrowleft) cam.x -= pan;
    if (keys.d || keys.arrowright) cam.x += pan;
    if (keys.z || keys.w || keys.arrowup) cam.y -= pan;
    if (keys.s || keys.arrowdown) cam.y += pan;
    clampCam();
    if (ui.started && !ui.paused && !S.over) { for (var i = 0; i < ui.speed; i++) step(dt); if (msgT > 0 && msgT < 1e8) msgT -= dt; }
    else if (S.topo) updateTopo();
    render();
    hudT -= dt; if (hudT <= 0) { hudT = 0.15; refreshHud(false); }
    requestAnimationFrame(loop);
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize();
  newGame();
  renderShelf();
  setTool("select");
  var best = loadBest();
  showOverlay(
    "<h2>Rouages</h2><p>Des créatures arrivent par la droite. Protège ton <b>noyau</b> en faisant tourner une usine.</p>" +
    "<ol><li>Pose des <b>foreuses</b> (2×2) sur le minerai. La flèche jaune montre leur sortie.</li>" +
    "<li>Trace des <b>convoyeurs</b> jusqu’à une <b>fonderie</b> : une entrée (flèche bleue), une sortie (flèche jaune).</li>" +
    "<li>L’<b>atelier</b> transforme les lingots de cuivre en <b>munitions</b>. Envoie-les à une <b>mitrailleuse</b>.</li>" +
    "<li>Tu démarres avec 60 munitions : un <b>déchargeur</b> collé au noyau peut les envoyer sur un tapis.</li>" +
    "<li>Clique un bâtiment pour son menu : recettes, filtre du splitter, objet du déchargeur.</li></ol>" +
    '<p class="rg-small">Tab catégorie · 1-4 bâtiment · R tourner · X ou clic droit démolir · Échap sélection · molette zoom · ZQSD caméra · P pause' + (best ? "<br>Record : vague " + best : "") + "</p>",
    "Lancer la partie", function () { ui.started = true; hideOverlay(); }
  );
  if (/[?&]debug\b/.test(location.search)) window.RG = { get S() { return S; }, place: place, ui: ui, insertAt: insertAt, setTool: setTool, openInsp: openInsp, cam: cam };
  requestAnimationFrame(loop);
})();
