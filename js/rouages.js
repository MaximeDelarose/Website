/* Rouages : tower defense d'usine.
   Extraire du minerai, l'acheminer sur des convoyeurs, fondre de l'acier,
   alimenter les tourelles en munitions et tenir le noyau face aux vagues. */
(function () {
  "use strict";
  var stage = document.getElementById("game-stage");
  if (!stage) return;

  /* ---------- constantes ---------- */
  var W = 44, H = 28, SUB = 16;
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  var ROCK = 9;
  var ORE = { 1: "cu", 2: "fe", 3: "ch" };
  var ITEMS = {
    cu: { n: "Cuivre", c: "#e8873a" },
    fe: { n: "Fer", c: "#c9d2d8" },
    ch: { n: "Charbon", c: "#34343c" },
    ac: { n: "Acier", c: "#7fb0e8" }
  };
  var DEFS = {
    conv:   { n: "Convoyeur", cost: { cu: 1 }, hp: 30, d: "Transporte vers la flèche. Glisse pour tracer une ligne, R pour tourner." },
    drill:  { n: "Foreuse", cost: { cu: 12 }, hp: 90, d: "Sur un minerai. Extrait et pousse dans les blocs voisins." },
    router: { n: "Routeur", cost: { cu: 3 }, hp: 50, d: "Répartit ce qu’il reçoit dans toutes les directions." },
    wall:   { n: "Mur", cost: { cu: 6 }, hp: 420, d: "Encaisse les coups. Les ennemis préfèrent le contourner." },
    duo:    { n: "Tourelle", cost: { cu: 35 }, hp: 170, range: 5.5, d: "Tire au sol et en l’air. Munitions : cuivre." },
    smelt:  { n: "Fonderie", cost: { cu: 40, fe: 15 }, hp: 160, d: "Fer + charbon → acier. Ressort par les côtés libres." },
    canon:  { n: "Canon", cost: { fe: 40, ac: 20 }, hp: 280, range: 7.5, d: "Obus explosifs, sol uniquement. Munitions : acier." }
  };
  var TOOLS = [
    { id: "hand", ico: "✋", n: "Déplacer", key: "H", d: "Glisse pour bouger la carte. Survole un bloc pour voir son état." },
    { id: "conv", key: "1" }, { id: "drill", key: "2" }, { id: "router", key: "3" }, { id: "wall", key: "4" },
    { id: "duo", key: "5" }, { id: "smelt", key: "6" }, { id: "canon", key: "7" },
    { id: "del", ico: "🗑", n: "Démolir", key: "X", d: "Retire un bloc, ressources remboursées. Clic droit marche aussi." }
  ];
  var ENEMY = {
    crawl: { n: "Rampant", hp: 30, spd: 1.35, dmg: 8, r: 0.3, rew: 2 },
    tank:  { n: "Blindé", hp: 150, spd: 0.62, dmg: 26, r: 0.42, rew: 6 },
    fly:   { n: "Volant", hp: 45, spd: 1.15, dmg: 12, r: 0.32, rew: 4, air: true },
    boss:  { n: "Colosse", hp: 1400, spd: 0.45, dmg: 90, r: 0.72, rew: 60 }
  };
  var BEST_KEY = "rouages.best";

  /* ---------- DOM ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var canvas = el("canvas", "game-canvas rg-canvas");
  canvas.setAttribute("tabindex", "0");
  var ctx = canvas.getContext("2d");
  var hud = el("div", "rg-hud");
  var top = el("div", "rg-top");
  var resBox = el("div", "rg-res");
  var waveBox = el("div", "rg-wave");
  var waveTxt = el("span", "rg-wave-txt");
  var waveBtn = el("button", "rg-btn", "Vague maintenant");
  var speedBtn = el("button", "rg-btn rg-sq", "×1");
  var pauseBtn = el("button", "rg-btn rg-sq", "❚❚");
  waveBtn.type = speedBtn.type = pauseBtn.type = "button";
  speedBtn.title = "Vitesse"; pauseBtn.title = "Pause (P)";
  waveBox.append(waveTxt, waveBtn, speedBtn, pauseBtn);
  var coreBar = el("div", "rg-core", "<span></span>");
  top.append(resBox, waveBox);
  var info = el("div", "rg-info");
  var bar = el("div", "rg-bar");
  var overlay = el("div", "rg-overlay");
  hud.append(top, coreBar, info, bar);
  stage.append(canvas, hud, overlay);

  var toolBtns = {};
  TOOLS.forEach(function (t) {
    var def = DEFS[t.id];
    var b = el("button", "rg-tool");
    b.type = "button";
    b.dataset.tool = t.id;
    var ic = el("canvas", "rg-ico"); ic.width = ic.height = 32;
    if (def) drawIcon(ic, t.id); else { ic = el("span", "rg-ico rg-emo", t.ico); }
    b.append(ic, el("span", "rg-key", t.key));
    b.title = (def ? def.n : t.n) + " (" + t.key + ")";
    b.addEventListener("click", function () { setTool(t.id); canvas.focus({ preventScroll: true }); });
    toolBtns[t.id] = b;
    bar.append(b);
  });

  /* ---------- état ---------- */
  var S = null;
  var cam = { x: 14, y: 14, z: 30 };
  var ui = { tool: "conv", dir: 0, hover: null, speed: 1, paused: false, started: false };
  var dpr = 1;
  var floorCv = document.createElement("canvas");

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function idx(x, y) { return y * W + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function bAt(x, y) { return inb(x, y) ? S.b[idx(x, y)] : null; }
  function loadBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

  function newGame() {
    for (var tries = 0; tries < 30; tries++) {
      S = {
        floor: new Uint8Array(W * H), b: new Array(W * H).fill(null), list: [],
        enemies: [], bullets: [], parts: [], stock: { cu: 160, fe: 0, ch: 0, ac: 0 },
        wave: 0, timer: 75, spawnQ: [], spawnT: 0, time: 0, kills: 0, over: false,
        dist: new Float32Array(W * H), dirty: true, spawns: [], core: null
      };
      genMap((Math.random() * 1e9) | 0);
      computeField();
      S.spawns = [];
      for (var y = 0; y < H; y++) if (S.dist[idx(W - 1, y)] < 1e8) S.spawns.push(y);
      if (S.spawns.length >= 8) break;
    }
    renderFloor();
    cam.x = 14; cam.y = H / 2;
    fitZoom();
    refreshHud(true);
  }

  function genMap(seed) {
    var rnd = mulberry32(seed), f = S.floor;
    function blob(cx, cy, r, t) {
      for (var y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (var x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!inb(x, y)) continue;
        var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (rnd() - 0.5) * 1.1;
        if (d < r) f[idx(x, y)] = t;
      }
    }
    for (var i = 0; i < 24; i++) blob(12 + rnd() * (W - 16), rnd() * H, 0.8 + rnd() * 1.6, ROCK);
    for (var x = 0; x < W; x++) { if (rnd() < 0.55) blob(x, -0.5, 1.4 + rnd(), ROCK); if (rnd() < 0.55) blob(x, H + 0.5, 1.4 + rnd(), ROCK); }
    // clairière du noyau
    for (var y = 0; y < H; y++) for (x = 0; x < 9; x++) if (Math.hypot(x - 5.5, y - H / 2) < 6.5 || x < 2) f[idx(x, y)] = f[idx(x, y)] === ROCK && x < 2 && (y < 3 || y > H - 4) ? ROCK : 0;
    for (y = 0; y < H; y++) for (x = W - 2; x < W; x++) f[idx(x, y)] = 0;
    var oy = function () { return (rnd() - 0.5) * 3; };
    blob(10 + rnd() * 2, 9 + oy(), 2.3, 1); blob(10 + rnd() * 2, 19 + oy(), 2.1, 1);
    blob(17 + rnd() * 2, 5 + oy(), 2.0, 3); blob(17 + rnd() * 2, 22 + oy(), 2.0, 2);
    blob(26, 14 + oy() * 2, 2.4, 2); blob(30, 5 + oy(), 2.1, 1); blob(30, 23 + oy(), 2.1, 3);
    blob(37, 10 + oy(), 1.8, 2); blob(37, 19 + oy(), 1.8, 1);
    // noyau 3x3
    var cx = 4, cy = Math.floor(H / 2) - 1;
    var core = { type: "core", x: cx, y: cy, w: 3, hp: 1500, max: 1500, cd: 0, ang: 0 };
    for (y = cy; y < cy + 3; y++) for (x = cx; x < cx + 3; x++) { f[idx(x, y)] = 0; S.b[idx(x, y)] = core; }
    S.core = core;
    S.list.push(core);
  }

  /* ---------- champ de déplacement (Dijkstra depuis le noyau) ---------- */
  function computeField() {
    var D = S.dist; D.fill(1e9);
    var hc = [], hi = [];
    function push(c, i) {
      var n = hc.length; hc.push(c); hi.push(i);
      while (n > 0) { var p = (n - 1) >> 1; if (hc[p] <= hc[n]) break; swap(p, n); n = p; }
    }
    function swap(a, b) { var t = hc[a]; hc[a] = hc[b]; hc[b] = t; t = hi[a]; hi[a] = hi[b]; hi[b] = t; }
    function pop() {
      var last = hc.length - 1; swap(0, last); var c = hc.pop(), i = hi.pop(), n = 0, L = hc.length;
      for (;;) { var l = 2 * n + 1, r = l + 1, m = n; if (l < L && hc[l] < hc[m]) m = l; if (r < L && hc[r] < hc[m]) m = r; if (m === n) break; swap(m, n); n = m; }
      return [c, i];
    }
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
        if (bb && bb.type !== "core") w += bb.type === "wall" ? 16 : 7;
        var nc = c + w;
        if (nc < D[ni]) { D[ni] = nc; push(nc, ni); }
      }
    }
    S.dirty = false;
  }

  /* ---------- construction ---------- */
  function canAfford(cost) { for (var k in cost) if ((S.stock[k] || 0) < cost[k]) return false; return true; }
  function pay(cost, sign) { for (var k in cost) S.stock[k] += cost[k] * sign; }
  function canPlace(type, x, y) {
    if (!inb(x, y)) return false;
    var i = idx(x, y);
    if (S.floor[i] === ROCK) return false;
    var cur = S.b[i];
    if (cur) return type === "conv" && cur.type === "conv";
    if (type === "drill" && !ORE[S.floor[i]]) return false;
    return canAfford(DEFS[type].cost);
  }
  function place(type, x, y, dir) {
    if (!canPlace(type, x, y)) return false;
    var cur = S.b[idx(x, y)];
    if (cur) { cur.dir = dir; return true; }
    pay(DEFS[type].cost, -1);
    var b = { type: type, x: x, y: y, dir: dir, hp: DEFS[type].hp, max: DEFS[type].hp, item: null, t: 0, rr: 0, cd: 0, ammo: 0, ang: Math.PI, fe: 0, ch: 0, out: null, src: null, work: 0 };
    S.b[idx(x, y)] = b; S.list.push(b); S.dirty = true;
    puff(x + 0.5, y + 0.5, "#c9d2d8", 5);
    return true;
  }
  function removeB(b, refund) {
    if (!b || b.type === "core") return;
    if (refund) pay(DEFS[b.type].cost, 1);
    S.b[idx(b.x, b.y)] = null;
    var k = S.list.indexOf(b); if (k >= 0) S.list.splice(k, 1);
    S.dirty = true;
  }

  /* ---------- logistique ---------- */
  function accept(b, item, from) {
    switch (b.type) {
      case "core": S.stock[item] = Math.min(9999, S.stock[item] + 1); return true;
      case "conv":
        if (b.item) return false;
        if (from && bAt(b.x + DX[b.dir], b.y + DY[b.dir]) === from) return false;
        b.item = item; b.t = 0; return true;
      case "router":
        if (b.item) return false;
        b.item = item; b.src = from; b.t = 0; return true;
      case "duo": if (item !== "cu" || b.ammo > 22) return false; b.ammo += 2; return true;
      case "canon": if (item !== "ac" || b.ammo > 12) return false; b.ammo += 4; return true;
      case "smelt":
        if (item === "fe" && b.fe < 10) { b.fe++; return true; }
        if (item === "ch" && b.ch < 10) { b.ch++; return true; }
        return false;
    }
    return false;
  }
  function pushOut(b, item, exclude) {
    for (var k = 0; k < 4; k++) {
      var d = (b.rr + k) % 4, n = bAt(b.x + DX[d], b.y + DY[d]);
      if (n && n !== exclude && n !== b && accept(n, item, b)) { b.rr = (d + 1) % 4; return true; }
    }
    return false;
  }

  /* ---------- simulation ---------- */
  function step(dt) {
    S.time += dt;
    if (S.dirty) computeField();

    // vagues
    S.timer -= dt;
    if (S.timer <= 0) startWave();
    if (S.spawnQ.length) {
      S.spawnT -= dt;
      if (S.spawnT <= 0) { spawn(S.spawnQ.shift()); S.spawnT = 0.5; }
    }

    // blocs
    for (var i = 0; i < S.list.length; i++) {
      var b = S.list[i];
      switch (b.type) {
        case "conv":
          if (b.item) {
            b.t = Math.min(1, b.t + dt * 4.2);
            if (b.t >= 1) { var n = bAt(b.x + DX[b.dir], b.y + DY[b.dir]); if (n && accept(n, b.item, b)) b.item = null; }
          }
          break;
        case "drill":
          if (!b.out) { b.t += dt; if (b.t >= 1.5) { b.t = 0; b.out = ORE[S.floor[idx(b.x, b.y)]]; } }
          if (b.out && pushOut(b, b.out, null)) b.out = null;
          break;
        case "router":
          b.t += dt;
          if (b.item && b.t > 0.08 && pushOut(b, b.item, b.src)) b.item = null;
          break;
        case "smelt":
          if (!b.out && b.fe > 0 && b.ch > 0) { b.work += dt; if (b.work >= 1.8) { b.work = 0; b.fe--; b.ch--; b.out = "ac"; } }
          if (b.out && pushOut(b, b.out, null)) b.out = null;
          break;
        case "duo": turret(b, dt, 0.32, 9, 13, false, 0); break;
        case "canon": turret(b, dt, 1.25, 38, 8, true, 1.35); break;
        case "core": coreGun(b, dt); break;
      }
    }

    // ennemis
    var co = S.core, ccx = co.x + 1.5, ccy = co.y + 1.5;
    for (i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      e.cd -= dt; e.anim += dt * e.spd * 6;
      if (e.air) {
        var ddx = ccx - e.x, ddy = ccy - e.y, dl = Math.hypot(ddx, ddy);
        if (dl < 1.9) hit(e, co); else { e.x += ddx / dl * e.spd * dt; e.y += ddy / dl * e.spd * dt; e.face = Math.atan2(ddy, ddx); }
        continue;
      }
      var tx = Math.floor(e.x), ty = Math.floor(e.y);
      var here = bAt(tx, ty);
      if (here) { hit(e, here); continue; }
      var best = -1, bd = 1e10;
      for (var d = 0; d < 4; d++) {
        var nx = tx + DX[d], ny = ty + DY[d];
        if (!inb(nx, ny)) continue;
        var v = S.dist[idx(nx, ny)];
        if (v < bd) { bd = v; best = d; }
      }
      if (best < 0) continue;
      var gx = tx + DX[best], gy = ty + DY[best];
      var tgt = bAt(gx, gy);
      var px = gx + 0.5 + (tgt ? 0 : e.ox), py = gy + 0.5 + (tgt ? 0 : e.oy);
      var mx = px - e.x, my = py - e.y, ml = Math.hypot(mx, my) || 1;
      if (tgt && ml < 0.55 + e.r) { hit(e, tgt); e.face = Math.atan2(my, mx); continue; }
      e.x += mx / ml * e.spd * dt; e.y += my / ml * e.spd * dt; e.face = Math.atan2(my, mx);
    }
    // écartement léger
    for (i = 0; i < S.enemies.length; i++) for (var j = i + 1; j < S.enemies.length; j++) {
      var a = S.enemies[i], c = S.enemies[j];
      if (a.air !== c.air) continue;
      var sx = c.x - a.x, sy = c.y - a.y, sd = Math.hypot(sx, sy), min = (a.r + c.r) * 0.9;
      if (sd > 0.001 && sd < min) { var p = (min - sd) * 0.5 / sd; a.x -= sx * p; a.y -= sy * p; c.x += sx * p; c.y += sy * p; }
    }

    // projectiles
    for (i = S.bullets.length - 1; i >= 0; i--) {
      var bu = S.bullets[i];
      bu.x += bu.vx * dt; bu.y += bu.vy * dt; bu.life -= dt;
      var hitE = null;
      for (j = 0; j < S.enemies.length; j++) {
        var en = S.enemies[j];
        if (bu.ground && en.air) continue;
        if (Math.hypot(en.x - bu.x, en.y - bu.y) < en.r + 0.12) { hitE = en; break; }
      }
      if (hitE || bu.life <= 0) {
        if (bu.splash) {
          for (j = 0; j < S.enemies.length; j++) { var s2 = S.enemies[j]; if (!s2.air && Math.hypot(s2.x - bu.x, s2.y - bu.y) < bu.splash) damage(s2, bu.dmg); }
          puff(bu.x, bu.y, "#f2c94c", 14); puff(bu.x, bu.y, "#e8873a", 8);
        } else if (hitE) { damage(hitE, bu.dmg); puff(bu.x, bu.y, "#ffe9a8", 3); }
        S.bullets.splice(i, 1);
      }
    }
    for (i = S.enemies.length - 1; i >= 0; i--) {
      e = S.enemies[i];
      if (e.hp <= 0) {
        S.enemies.splice(i, 1); S.kills++;
        S.stock.cu = Math.min(9999, S.stock.cu + e.rew);
        puff(e.x, e.y, e.col, 10);
      }
    }
    // particules
    for (i = S.parts.length - 1; i >= 0; i--) {
      var pa = S.parts[i]; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vx *= 0.92; pa.vy *= 0.92; pa.life -= dt;
      if (pa.life <= 0) S.parts.splice(i, 1);
    }
  }

  function nearest(x, y, range, groundOnly) {
    var best = null, bd = range;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i]; if (groundOnly && e.air) continue;
      var d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function fire(x, y, ang, spd, dmg, range, ground, splash, col) {
    S.bullets.push({ x: x + Math.cos(ang) * 0.45, y: y + Math.sin(ang) * 0.45, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg: dmg, life: range / spd + 0.05, ground: ground, splash: splash, col: col });
  }
  function turret(b, dt, rate, dmg, spd, ground, splash) {
    b.cd -= dt;
    var range = DEFS[b.type].range, x = b.x + 0.5, y = b.y + 0.5;
    var t = nearest(x, y, range, ground);
    if (!t) return;
    var ang = Math.atan2(t.y - y, t.x - x);
    b.ang = ang;
    if (b.ammo > 0 && b.cd <= 0) {
      b.cd = rate; b.ammo--;
      fire(x, y, ang, spd, dmg, range + 0.5, ground, splash, ground ? "#7fb0e8" : "#ffd27a");
      b.kick = 1;
    }
  }
  function coreGun(b, dt) {
    b.cd -= dt;
    var x = b.x + 1.5, y = b.y + 1.5, t = nearest(x, y, 5, false);
    if (!t) return;
    b.ang = Math.atan2(t.y - y, t.x - x);
    if (b.cd <= 0) { b.cd = 0.45; fire(x, y, b.ang, 12, 5, 5.5, false, 0, "#8ee6d0"); }
  }
  function hit(e, target) {
    if (e.cd > 0 || S.over) return;
    e.cd = 1; target.hp -= e.dmg; target.flash = 0.15;
    puff(target === S.core ? e.x : target.x + 0.5, target === S.core ? e.y : target.y + 0.5, "#ff6b4a", 4);
    if (target.hp <= 0) {
      if (target === S.core) { gameOver(); return; }
      puff(target.x + 0.5, target.y + 0.5, "#8a8f96", 14);
      removeB(target, false);
    }
  }
  function damage(e, d) { e.hp -= d; e.flash = 0.08; }
  function puff(x, y, c, n) {
    if (S.parts.length > 600) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = 0.5 + Math.random() * 2.5; S.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.35, c: c }); }
  }

  function startWave() {
    S.wave++;
    var w = S.wave, q = [], i;
    for (i = 0; i < 3 + w * 2; i++) q.push("crawl");
    if (w >= 4) for (i = 0; i < Math.floor((w - 2) / 2); i++) q.push("tank");
    if (w >= 6) for (i = 0; i < Math.floor((w - 4) / 2); i++) q.push("fly");
    for (i = q.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = q[i]; q[i] = q[j]; q[j] = t; }
    if (w % 10 === 0) q.push("boss");
    S.spawnQ = S.spawnQ.concat(q);
    S.timer = 42;
    flashMsg("Vague " + w + (w % 10 === 0 ? " · un Colosse approche !" : ""));
  }
  var COLS = { crawl: "#c94a4a", tank: "#8a4a7a", fly: "#d8a23a", boss: "#5a2a4a" };
  function spawn(type) {
    var D = ENEMY[type], sc = 1 + 0.14 * Math.pow(S.wave - 1, 1.15);
    var y = S.spawns[(Math.random() * S.spawns.length) | 0] + 0.5;
    S.enemies.push({ type: type, x: W - 0.4, y: y, hp: D.hp * sc, max: D.hp * sc, spd: D.spd, dmg: D.dmg * (1 + (sc - 1) * 0.5), r: D.r, rew: D.rew, air: !!D.air, cd: 0, anim: Math.random() * 6, face: Math.PI, ox: (Math.random() - 0.5) * 0.4, oy: (Math.random() - 0.5) * 0.4, col: COLS[type] });
  }
  function gameOver() {
    S.over = true;
    S.core.hp = 0;
    var best = loadBest(), rec = S.wave > best;
    if (rec) saveBest(S.wave);
    showOverlay(
      "<h2>Noyau détruit</h2><p>Tu as tenu <b>" + S.wave + "</b> vague" + (S.wave > 1 ? "s" : "") + " · " + S.kills + " ennemis éliminés.</p>" +
      "<p>" + (rec ? "🏆 Nouveau record !" : "Record : vague " + best) + "</p>",
      "Rejouer", function () { newGame(); hideOverlay(); }
    );
  }

  /* ---------- rendu ---------- */
  function renderFloor() {
    floorCv.width = W * SUB; floorCv.height = H * SUB;
    var g = floorCv.getContext("2d"), rnd = mulberry32(1234);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = S.floor[idx(x, y)], ox = x * SUB, oy = y * SUB;
      var base = t === ROCK ? "#24262b" : ((x + y) & 1 ? "#3a3f37" : "#373c34");
      g.fillStyle = base; g.fillRect(ox, oy, SUB, SUB);
      for (var k = 0; k < 6; k++) { g.fillStyle = t === ROCK ? "#2e3137" : "#40463c"; g.fillRect(ox + ((rnd() * 15) | 0), oy + ((rnd() * 15) | 0), 2, 1); }
      if (t === ROCK) {
        g.fillStyle = "#3a3e45"; g.fillRect(ox + 2, oy + 2, 6, 5); g.fillRect(ox + 9, oy + 8, 5, 5);
        g.fillStyle = "#1a1c20"; g.fillRect(ox + 2, oy + 7, 6, 1); g.fillRect(ox + 9, oy + 13, 5, 1);
      } else if (ORE[t]) {
        var c = ITEMS[ORE[t]].c;
        var coal = ORE[t] === "ch";
        g.globalAlpha = 0.16; g.fillStyle = coal ? "#9a9ab0" : c; g.fillRect(ox, oy, SUB, SUB); g.globalAlpha = 1;
        for (k = 0; k < 4; k++) {
          var px = ox + 1 + ((rnd() * 11) | 0), py = oy + 1 + ((rnd() * 11) | 0);
          g.fillStyle = "#23261f"; g.fillRect(px, py + 3, 4, 1);
          g.fillStyle = c; g.fillRect(px, py, 4, 3);
          g.fillStyle = coal ? "#7a7a8c" : "rgba(255,255,255,.35)"; g.fillRect(px, py, coal ? 3 : 2, 1);
        }
      }
      if (x >= W - 2) { g.fillStyle = "rgba(201,74,74," + (x === W - 1 ? 0.22 : 0.1) + ")"; g.fillRect(ox, oy, SUB, SUB); }
    }
  }

  var R;
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function drawBlock(b, t) {
    R = rect;
    switch (b.type) {
      case "conv":
        rot(b.dir, function () {
          R(0, 2, 16, 12, "#24272c"); R(0, 2, 16, 2, "#5d646d"); R(0, 12, 16, 2, "#5d646d");
          var o = (t * 4.2 * 16) % 8;
          for (var k = -1; k < 2; k++) { var x = k * 8 + o; R(x + 2, 6, 2, 1, "#4a5058"); R(x + 3, 7, 2, 2, "#4a5058"); R(x + 2, 9, 2, 1, "#4a5058"); }
        });
        break;
      case "drill":
        R(1, 1, 14, 14, "#3d434a"); R(2, 2, 12, 12, "#646c75"); R(1, 1, 3, 3, "#2a2e33"); R(12, 1, 3, 3, "#2a2e33"); R(1, 12, 3, 3, "#2a2e33"); R(12, 12, 3, 3, "#2a2e33");
        ctx.save(); ctx.translate(8, 8); ctx.rotate(b.out ? 0 : t * 7);
        R(-5, -1, 10, 2, "#d8dde2"); R(-1, -5, 2, 10, "#d8dde2"); ctx.restore();
        var oc = S && ITEMS[ORE[S.floor[idx(b.x, b.y)]]]; R(6, 6, 4, 4, oc ? oc.c : "#e8873a");
        break;
      case "router":
        R(1, 1, 14, 14, "#3d434a"); R(3, 3, 10, 10, "#5d646d"); R(5, 5, 6, 6, "#24272c");
        R(7, 1, 2, 2, "#f2c94c"); R(7, 13, 2, 2, "#f2c94c"); R(1, 7, 2, 2, "#f2c94c"); R(13, 7, 2, 2, "#f2c94c");
        if (b.item) R(6, 6, 4, 4, ITEMS[b.item].c);
        break;
      case "wall":
        R(0, 0, 16, 16, "#8a5a2b"); R(0, 0, 16, 1, "#c08048"); R(0, 15, 16, 1, "#4a2e14");
        R(0, 5, 16, 1, "#5e3c1b"); R(0, 10, 16, 1, "#5e3c1b"); R(5, 0, 1, 5, "#5e3c1b"); R(11, 5, 1, 5, "#5e3c1b"); R(4, 10, 1, 5, "#5e3c1b");
        break;
      case "duo":
        R(1, 1, 14, 14, "#353b42"); R(3, 3, 10, 10, "#505861");
        ctx.save(); ctx.translate(8, 8); ctx.rotate(b.ang);
        var kk = (b.kick || 0) * 2;
        R(2 - kk, -2.5, 7, 2, "#c9d2d8"); R(2 - kk, 0.5, 7, 2, "#c9d2d8"); R(-4, -4, 7, 8, "#e8873a"); R(-4, -4, 7, 2, "#f2a65e");
        ctx.restore();
        ammoBar(b, 24, "#e8873a");
        break;
      case "canon":
        R(0, 0, 16, 16, "#2a3240"); R(2, 2, 12, 12, "#3e4a5e");
        ctx.save(); ctx.translate(8, 8); ctx.rotate(b.ang);
        kk = (b.kick || 0) * 3;
        R(2 - kk, -2, 9, 4, "#1c2330"); R(9 - kk, -2.5, 3, 5, "#11161f"); R(-5, -5, 9, 10, "#7fb0e8"); R(-5, -5, 9, 2, "#a9cdf2");
        ctx.restore();
        ammoBar(b, 16, "#7fb0e8");
        break;
      case "smelt":
        R(1, 2, 14, 13, "#6e3b2a"); R(1, 2, 14, 1, "#9a5a40"); R(1, 7, 14, 1, "#4e281c"); R(1, 11, 14, 1, "#4e281c");
        R(10, 0, 3, 3, "#3a3a40"); R(4, 7, 8, 7, "#150d09");
        var on = b.fe > 0 && b.ch > 0 || b.work > 0;
        if (on) { R(5, 9, 6, 5, Math.sin(t * 18) > 0 ? "#f28c3a" : "#f2c94c"); R(6, 11, 4, 3, "#fff0b0"); }
        if (b.out) R(6, 4, 4, 2, ITEMS.ac.c);
        break;
    }
  }
  function rot(d, fn) { ctx.save(); ctx.translate(8, 8); ctx.rotate(d * Math.PI / 2); ctx.translate(-8, -8); fn(); ctx.restore(); }
  function ammoBar(b, cap, c) { R(2, 14, 12, 1.5, "#11131a"); R(2, 14, 12 * Math.min(1, b.ammo / cap), 1.5, c); }

  function drawCore(b, t) {
    R(0, 0, 48, 48, "#1d2a2a"); R(2, 2, 44, 44, "#2f4a46"); R(2, 2, 44, 3, "#4d7a72");
    R(0, 0, 8, 8, "#17201f"); R(40, 0, 8, 8, "#17201f"); R(0, 40, 8, 8, "#17201f"); R(40, 40, 8, 8, "#17201f");
    R(12, 12, 24, 24, "#13201e");
    var p = 0.5 + 0.5 * Math.sin(t * 2.5);
    R(16, 16, 16, 16, p > 0.5 ? "#4fc9b0" : "#3fb39c"); R(19, 19, 10, 10, "#8ee6d0"); R(22, 22, 4, 4, "#e6fff8");
    ctx.save(); ctx.translate(24, 24); ctx.rotate(b.ang); R(8, -2, 10, 4, "#8ee6d0"); ctx.restore();
  }

  function drawEnemy(e, t) {
    var f = e.flash > 0;
    var c = f ? "#ffffff" : e.col;
    ctx.save(); ctx.rotate(e.face);
    var l = Math.sin(e.anim) * 1.5;
    if (e.type === "crawl") {
      R(-4, -6 + l, 2, 2, "#3a1a1a"); R(2, -6 - l, 2, 2, "#3a1a1a"); R(-4, 4 - l, 2, 2, "#3a1a1a"); R(2, 4 + l, 2, 2, "#3a1a1a");
      R(-5, -4, 10, 8, c); R(1, -3, 4, 6, f ? c : "#e06a5a"); R(4, -2, 2, 1, "#ffe9a8"); R(4, 1, 2, 1, "#ffe9a8");
    } else if (e.type === "tank") {
      R(-7, -7, 14, 3, "#2a1a2a"); R(-7, 4, 14, 3, "#2a1a2a");
      R(-6, -5, 12, 10, c); R(-6, -5, 12, 2, f ? c : "#b06a9a"); R(2, -3, 5, 6, f ? c : "#5a2a4a"); R(5, -1, 2, 2, "#ff6b4a");
    } else if (e.type === "fly") {
      var wv = Math.sin(t * 20) * 2;
      R(-2, -8 - wv, 4, 6, f ? c : "#f2d48a"); R(-2, 2 + wv, 4, 6, f ? c : "#f2d48a");
      R(-5, -2, 10, 4, c); R(3, -1, 3, 2, "#3a2a0a");
    } else {
      R(-12, -12, 24, 4, "#1a0f1a"); R(-12, 8, 24, 4, "#1a0f1a");
      R(-11, -9, 22, 18, c); R(-11, -9, 22, 3, f ? c : "#8a4a7a"); R(4, -6, 8, 12, f ? c : "#3a1a2a"); R(9, -4, 3, 2, "#ff6b4a"); R(9, 2, 3, 2, "#ff6b4a");
    }
    ctx.restore();
  }

  function drawIcon(cv, type) {
    var g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
    var fake = { type: type, x: 0, y: 0, dir: 0, ang: -Math.PI / 4, ammo: 0, item: null, fe: 1, ch: 1, out: null, work: 0 };
    g.setTransform(2, 0, 0, 2, 0, 0);
    var save = ctx; ctx = g;
    drawBlock(fake, 0.2);
    ctx = save;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = stage.clientWidth, h = stage.clientHeight;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function fitZoom() {
    var w = stage.clientWidth || 800, h = stage.clientHeight || 500;
    cam.z = Math.max(14, Math.min(36, Math.min(w / 32, (h - 60) / 20)));
  }
  function toScreen(wx, wy) { var s = cam.z * dpr; return [(wx - cam.x) * s + canvas.width / 2, (wy - cam.y) * s + canvas.height / 2]; }
  function toWorld(px, py) { var r = canvas.getBoundingClientRect(), s = cam.z; return [(px - r.left - r.width / 2) / s + cam.x, (py - r.top - r.height / 2) / s + cam.y]; }

  function render() {
    var cw = canvas.width, ch = canvas.height, s = cam.z * dpr, k = s / SUB, t = S.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#141619"; ctx.fillRect(0, 0, cw, ch);
    var o = toScreen(0, 0);
    ctx.drawImage(floorCv, Math.round(o[0]), Math.round(o[1]), Math.round(W * s), Math.round(H * s));
    R = rect;
    function at(x, y) { var p = toScreen(x, y); ctx.setTransform(k, 0, 0, k, Math.round(p[0]), Math.round(p[1])); }
    var vx0 = cam.x - cw / 2 / s - 2, vx1 = cam.x + cw / 2 / s + 2, vy0 = cam.y - ch / 2 / s - 2, vy1 = cam.y + ch / 2 / s + 2;
    var i, b;
    for (i = 0; i < S.list.length; i++) {
      b = S.list[i];
      if (b.x < vx0 || b.x > vx1 || b.y < vy0 || b.y > vy1) continue;
      at(b.x, b.y);
      if (b.type === "core") drawCore(b, t); else drawBlock(b, t);
      if (b.kick) b.kick = Math.max(0, b.kick - 0.15);
      if (b.flash > 0) { ctx.globalAlpha = 0.45; R(0, 0, b.type === "core" ? 48 : 16, b.type === "core" ? 48 : 16, "#ff6b4a"); ctx.globalAlpha = 1; b.flash -= 1 / 60; }
      if (b.hp < b.max && b.type !== "core") { R(2, -2, 12, 1.5, "#11131a"); R(2, -2, 12 * b.hp / b.max, 1.5, b.hp / b.max > 0.4 ? "#7fd36a" : "#ff6b4a"); }
    }
    // objets sur les tapis
    for (i = 0; i < S.list.length; i++) {
      b = S.list[i];
      if (b.type !== "conv" || !b.item) continue;
      var ix = b.x + 0.5 + DX[b.dir] * (b.t - 0.5), iy = b.y + 0.5 + DY[b.dir] * (b.t - 0.5);
      at(ix, iy);
      R(-3, -3, 6, 6, "#11131a"); R(-2.5, -2.5, 5, 5, ITEMS[b.item].c); R(-2.5, -2.5, 2, 1, "rgba(255,255,255,.4)");
    }
    // ennemis
    for (i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.air) { at(e.x + 0.15, e.y + 0.35); ctx.globalAlpha = 0.3; R(-4, -2, 8, 4, "#000"); ctx.globalAlpha = 1; }
      at(e.x, e.y);
      drawEnemy(e, t);
      if (e.flash > 0) e.flash -= 1 / 60;
      if (e.hp < e.max) { var bw = e.type === "boss" ? 24 : 12; R(-bw / 2, -e.r * 16 - 5, bw, 1.5, "#11131a"); R(-bw / 2, -e.r * 16 - 5, bw * Math.max(0, e.hp / e.max), 1.5, "#ff6b4a"); }
    }
    // projectiles et particules
    for (i = 0; i < S.bullets.length; i++) { var u = S.bullets[i]; at(u.x, u.y); var z = u.splash ? 3 : 2; R(-z / 2, -z / 2, z, z, u.col); }
    for (i = 0; i < S.parts.length; i++) { var p = S.parts[i]; at(p.x, p.y); ctx.globalAlpha = Math.min(1, p.life * 3); R(-1, -1, 2, 2, p.c); }
    ctx.globalAlpha = 1;

    // fantôme de construction
    var hv = ui.hover;
    if (hv && !S.over && inb(hv[0], hv[1])) {
      at(hv[0], hv[1]);
      var tool = ui.tool;
      if (DEFS[tool]) {
        var ok = canPlace(tool, hv[0], hv[1]);
        ctx.globalAlpha = 0.6;
        drawBlock({ type: tool, x: hv[0], y: hv[1], dir: ui.dir, ang: ui.dir * Math.PI / 2, ammo: 0, item: null, fe: 0, ch: 0, out: null, work: 0 }, t);
        ctx.globalAlpha = 1;
        frame(ok ? "#7fd36a" : "#ff6b4a");
        if (DEFS[tool].range) ring(hv[0] + 0.5, hv[1] + 0.5, DEFS[tool].range, ok ? "rgba(127,211,106,.5)" : "rgba(255,107,74,.5)");
      } else if (tool === "del") {
        frame(bAt(hv[0], hv[1]) ? "#ff6b4a" : "rgba(255,255,255,.25)");
      } else {
        var hb = bAt(hv[0], hv[1]);
        if (hb && hb.type !== "core") { frame("rgba(255,255,255,.5)"); if (DEFS[hb.type].range) ring(hb.x + 0.5, hb.y + 0.5, DEFS[hb.type].range, "rgba(255,255,255,.35)"); }
      }
    }
    function frame(c) { R(0, 0, 16, 1, c); R(0, 15, 16, 1, c); R(0, 0, 1, 16, c); R(15, 0, 1, 16, c); }
    function ring(x, y, r, c) {
      var p = toScreen(x, y);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = c; ctx.lineWidth = 2 * dpr; ctx.setLineDash([6 * dpr, 6 * dpr]);
      ctx.beginPath(); ctx.arc(p[0], p[1], r * s, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    }
    // flèche de l'apparition
    if (S.spawnQ.length || S.timer < 8) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var sp = toScreen(W, H / 2);
      var px = Math.min(cw - 30 * dpr, sp[0] - 10 * dpr), py = Math.max(30 * dpr, Math.min(ch - 30 * dpr, sp[1]));
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.fillStyle = "#ff6b4a"; ctx.beginPath(); ctx.moveTo(px, py - 12 * dpr); ctx.lineTo(px - 16 * dpr, py); ctx.lineTo(px, py + 12 * dpr); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- HUD ---------- */
  var msgT = 0, msgText = "";
  function flashMsg(m) { msgText = m; msgT = 2.5; }
  var lastHud = "";
  function costHtml(cost) {
    return Object.keys(cost).map(function (k) { return '<span class="rg-c' + (S.stock[k] < cost[k] ? " no" : "") + '"><i style="background:' + ITEMS[k].c + '"></i>' + cost[k] + "</span>"; }).join(" ");
  }
  function refreshHud(force) {
    var r = Object.keys(ITEMS).map(function (k) { return '<span class="rg-r" title="' + ITEMS[k].n + '"><i style="background:' + ITEMS[k].c + '"></i>' + Math.floor(S.stock[k]) + "</span>"; }).join("");
    var wv = S.spawnQ.length ? "Vague " + S.wave + " en cours" : (S.wave ? "Vague " + S.wave + " · " : "") + "prochaine dans " + Math.ceil(S.timer) + " s";
    var txt;
    if (msgT > 0) txt = '<b class="rg-msg">' + msgText + "</b>";
    else {
      var tool = TOOLS.filter(function (x) { return x.id === ui.tool; })[0], def = DEFS[ui.tool], hb = ui.hover && bAt(ui.hover[0], ui.hover[1]);
      if (ui.tool === "hand" && hb) txt = blockInfo(hb);
      else if (def) txt = "<b>" + def.n + "</b> " + costHtml(def.cost) + " · " + def.d;
      else txt = "<b>" + tool.n + "</b> · " + tool.d;
    }
    var key = r + wv + txt + S.core.hp;
    if (!force && key === lastHud) return;
    lastHud = key;
    resBox.innerHTML = r;
    waveTxt.textContent = wv;
    info.innerHTML = txt;
    coreBar.firstChild.style.width = (100 * Math.max(0, S.core.hp) / S.core.max) + "%";
    coreBar.title = "Noyau : " + Math.ceil(S.core.hp) + " / " + S.core.max;
    TOOLS.forEach(function (x) { var d = DEFS[x.id]; toolBtns[x.id].classList.toggle("poor", !!d && !canAfford(d.cost)); });
  }
  function blockInfo(b) {
    if (b.type === "core") return "<b>Noyau</b> · " + Math.ceil(b.hp) + " / " + b.max + " PV. Tout ce qui y entre rejoint ton stock.";
    var d = DEFS[b.type], s = "<b>" + d.n + "</b> · " + Math.ceil(b.hp) + "/" + b.max + " PV";
    if (b.type === "duo" || b.type === "canon") s += " · munitions " + b.ammo + (b.ammo ? "" : ' <span class="rg-warn">vide !</span>');
    if (b.type === "smelt") s += " · fer " + b.fe + " · charbon " + b.ch;
    return s;
  }
  function setTool(id) {
    ui.tool = id;
    Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle("on", k === id); });
    canvas.style.cursor = id === "hand" ? "grab" : "crosshair";
    msgT = 0; refreshHud(true);
  }
  function showOverlay(html, btn, fn) {
    overlay.innerHTML = '<div class="rg-panel">' + html + '<button type="button" class="btn">' + btn + "</button></div>";
    overlay.querySelector("button").addEventListener("click", fn);
    overlay.hidden = false;
  }
  function hideOverlay() { overlay.hidden = true; canvas.focus({ preventScroll: true }); }

  waveBtn.addEventListener("click", function () { if (S && !S.over) { S.timer = 0; } });
  speedBtn.addEventListener("click", function () { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 3 : 1; speedBtn.textContent = "×" + ui.speed; });
  pauseBtn.addEventListener("click", togglePause);
  function togglePause() { ui.paused = !ui.paused; pauseBtn.textContent = ui.paused ? "▶" : "❚❚"; if (ui.paused) flashMsg("Pause"); msgT = ui.paused ? 1e9 : 0; }

  /* ---------- entrées ---------- */
  var ptrs = new Map(), drag = null, pinch = null;
  function tileAt(ev) { var w = toWorld(ev.clientX, ev.clientY); return [Math.floor(w[0]), Math.floor(w[1])]; }
  function applyTool(tx, ty) {
    if (S.over) return;
    if (ui.tool === "del") { removeB(bAt(tx, ty), true); return; }
    if (DEFS[ui.tool]) place(ui.tool, tx, ty, ui.dir);
  }
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("pointerdown", function (ev) {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 2) {
      var a = Array.from(ptrs.values());
      pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: cam.z, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 };
      drag = null; return;
    }
    var t = tileAt(ev);
    if (ev.button === 2) { removeB(bAt(t[0], t[1]), true); drag = { mode: "del" }; return; }
    if (ev.button === 1 || ui.tool === "hand" || ev.shiftKey) {
      drag = { mode: "pan", x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y };
      canvas.style.cursor = "grabbing"; return;
    }
    drag = { mode: "build", last: t };
    applyTool(t[0], t[1]);
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    var t = tileAt(ev);
    ui.hover = t;
    if (pinch && ptrs.size === 2) {
      var a = Array.from(ptrs.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      var mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
      cam.z = clampZ(pinch.z * d / pinch.d);
      cam.x -= (mx - pinch.mx) / cam.z; cam.y -= (my - pinch.my) / cam.z;
      pinch.mx = mx; pinch.my = my; clampCam(); return;
    }
    if (!drag) return;
    if (drag.mode === "pan") { cam.x = drag.cx - (ev.clientX - drag.x) / cam.z; cam.y = drag.cy - (ev.clientY - drag.y) / cam.z; clampCam(); return; }
    if (drag.mode === "del") { if (ev.buttons & 2) removeB(bAt(t[0], t[1]), true); return; }
    // tracé tuile par tuile, le tapis prend la direction du geste
    var l = drag.last;
    while (l[0] !== t[0] || l[1] !== t[1]) {
      var ddx = t[0] - l[0], ddy = t[1] - l[1], d;
      if (Math.abs(ddx) >= Math.abs(ddy)) d = ddx > 0 ? 0 : 2; else d = ddy > 0 ? 1 : 3;
      var n = [l[0] + DX[d], l[1] + DY[d]];
      if (ui.tool === "conv") {
        ui.dir = d;
        var pb = bAt(l[0], l[1]); if (pb && pb.type === "conv") pb.dir = d;
      }
      applyTool(n[0], n[1]);
      l = n;
    }
    drag.last = l;
  });
  function endPtr(ev) {
    ptrs.delete(ev.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) { drag = null; canvas.style.cursor = ui.tool === "hand" ? "grab" : "crosshair"; }
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
  function clampZ(z) { return Math.max(10, Math.min(64, z)); }
  function clampCam() { cam.x = Math.max(0, Math.min(W, cam.x)); cam.y = Math.max(0, Math.min(H, cam.y)); }

  var keys = {};
  document.addEventListener("keydown", function (ev) {
    if (!S || /INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || "")) return;
    var k = ev.key.toLowerCase();
    keys[k] = true;
    if (/^arrow/.test(k) && (document.activeElement === canvas || document.fullscreenElement)) ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var t = TOOLS.filter(function (x) { return x.key.toLowerCase() === k; })[0];
    if (t) { setTool(t.id); return; }
    if (k === "escape") setTool("hand");
    else if (k === "r") { ui.dir = (ui.dir + (ev.shiftKey ? 3 : 1)) % 4; }
    else if (k === "p") togglePause();
  });
  document.addEventListener("keyup", function (ev) { keys[ev.key.toLowerCase()] = false; });
  window.addEventListener("blur", function () { keys = {}; });

  /* ---------- boucle ---------- */
  var last = performance.now(), hudT = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var pan = 14 / cam.z * 30 * dt;
    if (keys.a || keys.q || keys.arrowleft) cam.x -= pan;
    if (keys.d || keys.arrowright) cam.x += pan;
    if (keys.w || keys.z || keys.arrowup) cam.y -= pan;
    if (keys.s || keys.arrowdown) cam.y += pan;
    clampCam();
    if (ui.started && !ui.paused && !S.over) {
      for (var i = 0; i < ui.speed; i++) step(dt);
      if (msgT > 0 && msgT < 1e8) msgT -= dt;
    }
    render();
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; refreshHud(false); }
    requestAnimationFrame(loop);
  }

  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
  resize();
  newGame();
  setTool("conv");
  var best = loadBest();
  showOverlay(
    "<h2>Rouages</h2>" +
    "<p>Des créatures arrivent par la droite. Protège ton <b>noyau</b>.</p>" +
    "<ol><li>Pose des <b>foreuses</b> sur le minerai de cuivre.</li>" +
    "<li>Relie-les au noyau avec des <b>convoyeurs</b> (glisse pour tracer).</li>" +
    "<li>Branche des <b>tourelles</b> sur une ligne de cuivre : sans munitions, elles ne tirent pas.</li>" +
    "<li>Plus tard : fer + charbon dans une <b>fonderie</b> donnent l’acier des <b>canons</b>.</li></ol>" +
    '<p class="rg-small">1-7 construire · R tourner · X ou clic droit démolir · H ou Échap déplacer · Maj+glisser pour bouger · molette zoom · ZQSD/flèches caméra · P pause' +
    (best ? "<br>Record : vague " + best : "") + "</p>",
    "Lancer la partie", function () { ui.started = true; hideOverlay(); }
  );
  if (/[?&]debug\b/.test(location.search)) window.RG = { get S() { return S; }, place: function (t, x, y, d) { return place(t, x, y, d); }, ui: ui };
  requestAnimationFrame(loop);
})();
