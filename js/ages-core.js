/* =========================================================================
   Age of Defense — moteur de jeu (aucun DOM, testable dans Node).
     const C = require("./js/ages-core.js");
     const sim = C.createSim({ mode: "solo", mapId: "vallee" });
     C.command(sim, 0, { c: "build", line: "tour", tx: 8, ty: 7 }); C.step(sim, 1/30);
   Modes : "solo" et "coop" (un monde partagé), "versus" (un monde par joueur, on s'envoie des troupes).
   Le jeu en ligne est « l'hôte décide » : l'hôte fait tourner la simulation, l'invité envoie des
   commandes et reçoit des instantanés (snapshot / applySnapshot / viewStep).
   ========================================================================= */
(function (root) {
  "use strict";
  var D = (typeof require === "function" && typeof module !== "undefined") ? require("./ages-data.js") : root.AGES_DATA;
  var T = D.T, LINES = D.LINES, ENEMIES = D.ENEMIES, AGES = D.AGES, LV = D.LEVELS;
  var ZERO = { r: 0, d: 0, g: 0 };
  var FL = { burn: 1, slow: 2, glue: 4, stun: 8, freeze: 16 };
  var KIND_IDX = { def: 0, arch: 1, plane: 2, heli: 3 }, KIND_NAMES = ["def", "arch", "plane", "heli"];
  var PROJ_NAMES = ["stone", "arrow", "bullet", "plasma", "dart", "bolt", "tracer", "rail", "rock", "shell", "plasmaball", "glue", "foam", "nano", "ice", "cryo", "missile", "bomb", "rocket", "bulletsm"];
  var ENEMY_IDX = {}; D.ENEMY_ORDER.forEach(function (k, i) { ENEMY_IDX[k] = i; });
  var LINE_IDX = {}; D.LINE_ORDER.forEach(function (k, i) { LINE_IDX[k] = i; });

  function rng32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return dist(px, py, ax + dx * t, ay + dy * t);
  }

  /* ---------------------------------------------------------------- carte */
  function buildMap(id) {
    var def = null; D.MAPS.forEach(function (m) { if (m.id === id) def = m; });
    if (!def) def = D.MAPS[0];
    var W = def.W, H = def.H, hw = def.hw * T;
    var paths = def.paths.map(function (pts) {
      var P = pts.map(function (p) { return { x: p[0] * T, y: p[1] * T }; }), cum = [0];
      for (var i = 1; i < P.length; i++) cum.push(cum[i - 1] + dist(P[i].x, P[i].y, P[i - 1].x, P[i - 1].y));
      return { pts: P, cum: cum, len: cum[cum.length - 1], hw: hw, flyLen: dist(P[0].x, P[0].y, P[P.length - 1].x, P[P.length - 1].y) };
    });
    var tiles = new Uint8Array(W * H), x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var cx = (x + 0.5) * T, cy = (y + 0.5) * T, near = false;
      for (var k = 0; k < paths.length && !near; k++) for (var j = 0; j < paths[k].pts.length - 1; j++) {
        var a = paths[k].pts[j], b = paths[k].pts[j + 1];
        if (segDist(cx, cy, a.x, a.y, b.x, b.y) < hw) { near = true; break; }
      }
      if (near) tiles[y * W + x] = 1;
    }
    function isRoad(tx, ty) { return tx >= 0 && ty >= 0 && tx < W && ty < H && tiles[ty * W + tx] === 1; }
    // décor bloquant (arbres, rochers…) en bouquets, jamais collé à la route
    var rnd = rng32(def.id.length * 977 + W * 31 + H), clusters = [];
    for (var c = 0; c < Math.round(W * H / 60); c++) clusters.push([rnd() * W, rnd() * H, 1 + rnd() * 1.4]);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (tiles[y * W + x]) continue;
      var nearRoad = false;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (isRoad(x + dx, y + dy)) nearRoad = true;
      if (nearRoad) continue;
      for (c = 0; c < clusters.length; c++) {
        if (dist(x + 0.5, y + 0.5, clusters[c][0], clusters[c][1]) < clusters[c][2] && rnd() < 0.72) { tiles[y * W + x] = 2; break; }
      }
    }
    var edge = [];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (tiles[y * W + x] !== 0) continue;
      if (isRoad(x + 1, y) || isRoad(x - 1, y) || isRoad(x, y + 1) || isRoad(x, y - 1)) edge.push([x, y]);
    }
    return { id: def.id, name: def.name, theme: def.theme, W: W, H: H, hw: hw, paths: paths, tiles: tiles, edge: edge, w: W * T, h: H * T };
  }
  function tileAt(map, tx, ty) { return (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) ? -1 : map.tiles[ty * map.W + tx]; }
  var _pp = { x: 0, y: 0, a: 0 };
  function pathAt(path, s, off) {
    var P = path.pts, cum = path.cum, i = 0;
    s = clamp(s, 0, path.len);
    while (i < P.length - 2 && s > cum[i + 1]) i++;
    var a = P[i], b = P[i + 1], l = cum[i + 1] - cum[i] || 1, t = (s - cum[i]) / l;
    var dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
    _pp.x = a.x + (b.x - a.x) * t - dy * off; _pp.y = a.y + (b.y - a.y) * t + dx * off; _pp.a = Math.atan2(dy, dx);
    return _pp;
  }
  function flyAt(path, s, off) {
    var a = path.pts[0], b = path.pts[path.pts.length - 1], l = path.flyLen || 1, t = clamp(s / l, 0, 1);
    var dx = (b.x - a.x) / l, dy = (b.y - a.y) / l, wob = Math.sin(s * 0.018 + off) * 22;
    _pp.x = a.x + (b.x - a.x) * t - dy * wob; _pp.y = a.y + (b.y - a.y) * t + dx * wob; _pp.a = Math.atan2(dy, dx);
    return _pp;
  }
  function nearestRoadPoint(map, x, y) {
    var best = null, bd = 1e9;
    for (var k = 0; k < map.paths.length; k++) {
      var P = map.paths[k].pts;
      for (var j = 0; j < P.length - 1; j++) {
        var a = P[j], b = P[j + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
        var qx = a.x + dx * t, qy = a.y + dy * t, d = dist(x, y, qx, qy);
        if (d < bd) { bd = d; best = { x: qx, y: qy }; }
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- création */
  function defaultMeta() { return { gold: 0, income: 0, lives: 0, dmg: 0, range: 0, troops: 0, tech: 0, cheap: 0 }; }

  function createSim(o) {
    o = o || {};
    var mode = o.mode || "solo", diff = D.DIFFS[1];
    D.DIFFS.forEach(function (d) { if (d.id === o.diff) diff = d; });
    var sim = { mode: mode, diff: diff, mapId: o.mapId || "vallee", map: buildMap(o.mapId || "vallee"), nextId: 1, rng: rng32(o.seed || 12345), time: 0, over: null,
      metas: [Object.assign(defaultMeta(), (o.metas || [])[0]), Object.assign(defaultMeta(), (o.metas || [])[1])], worlds: [], net: !!o.net, speedWarn: 0,
      vsTimer: 26, vsWave: 0, income: [0, 0], names: o.names || ["Joueur 1", "Joueur 2"], stats: { kills: [0, 0] } };
    var nW = mode === "versus" ? 2 : 1;
    for (var i = 0; i < nW; i++) {
      var players = mode === "coop" ? [0, 1] : mode === "versus" ? [i] : [0];
      var m0 = sim.metas[players[0]];
      var w = { idx: i, players: players, age: 0, lives: D.START_LIVES + 2 * m0.lives, maxLives: D.START_LIVES + 2 * m0.lives, wave: 0, clock: 0, queue: [], gold: [0, 0], inc: [0, 0],
        buildings: [], units: [], enemies: [], projs: [], emap: {}, occ: new Int32Array(sim.map.W * sim.map.H), fx: [], fxNet: [],
        active: false, nextT: -1, auto: mode === "coop" || mode === "solo" ? false : true, kills: 0, pathCtr: 0, dead: false, flash: 0 };
      players.forEach(function (p) { w.gold[p] = Math.round((D.START_GOLD + 60 * sim.metas[p].gold) * sim.diff.gold); });
      sim.worlds.push(w);
    }
    return sim;
  }
  function worldOf(sim, p) { return sim.mode === "versus" ? sim.worlds[p] : sim.worlds[0]; }
  function metaOf(sim, p) { return sim.metas[p] || sim.metas[0]; }
  function fx(sim, w, type, x, y, a, b) {
    if (w.fx.length < 500) w.fx.push([type, x, y, a || 0, b || 0]);
    if (sim.net && w.fxNet.length < 120) w.fxNet.push([type, Math.round(x), Math.round(y), a ? Math.round(a * 10) / 10 : 0, b ? Math.round(b) : 0]);
  }

  /* ---------------------------------------------------------------- stats */
  function bstat(sim, w, b) {
    var L = LINES[b.line], A = AGES[w.age], lv = b.lvl - 1, m = metaOf(sim, b.owner), bf = b.buff || ZERO;
    var dm = A.dm * LV.dmg[lv] * (1 + 0.04 * m.dmg) * (1 + bf.d);
    return {
      dmg: (L.dmg || 0) * dm,
      rate: (L.rate || 1) * LV.rate[lv] * (1 + bf.r),
      range: ((L.range || 0) + A.rg * (L.range ? 1 : 0)) * LV.range[lv] * (1 + 0.03 * m.range + bf.g) * T,
      hp: (L.hp || 0) * A.dm * LV.dmg[lv] * (1 + 0.08 * m.troops),
      dm: dm,
    };
  }
  function buildCost(sim, w, p, line) { return Math.round(LINES[line].cost * AGES[w.age].cm * (1 - 0.03 * metaOf(sim, p).cheap)); }
  function upgradeCost(sim, w, b) { return b.lvl >= 3 || b.fixed ? 0 : Math.round(LINES[b.line].cost * AGES[w.age].cm * LV.cost[b.lvl]); }
  function ageCost(sim, w, p) { var n = AGES[w.age + 1]; return n ? Math.round(n.cost * (1 - 0.05 * metaOf(sim, p).tech)) : 0; }
  function incomeMul(sim, p) { return 1 + 0.06 * metaOf(sim, p).income; }

  /* ---------------------------------------------------------------- construction */
  function canPlace(sim, w, line, tx, ty) {
    var L = LINES[line], map = sim.map, s = L.size || 1, x, y;
    if (!L) return "?";
    if (L.minAge > w.age) return "Âge " + AGES[L.minAge].name + " requis";
    for (y = ty; y < ty + s; y++) for (x = tx; x < tx + s; x++) {
      var t = tileAt(map, x, y);
      if (t < 0) return "Hors de la carte";
      if (w.occ[y * map.W + x]) return "Case occupée";
      if (L.kind === "mine" || L.kind === "pit") { if (t !== 1) return "À poser sur la route"; }
      else if (t === 1) return "Pas sur la route (une rampe permet d'y accéder)";
      else if (t === 2) return "Obstacle";
    }
    if (L.kind === "ramp") {
      if (!rampDir(map, tx, ty)) return "Une rampe se pose au bord de la route";
    }
    return "";
  }
  function rampDir(map, tx, ty) {
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) if (tileAt(map, tx + d[i][0], ty + d[i][1]) === 1) return d[i];
    return null;
  }
  function addBuilding(sim, w, p, line, tx, ty, free) {
    var L = LINES[line], map = sim.map, s = L.size || 1;
    var b = { id: sim.nextId++, line: line, owner: p, tx: tx, ty: ty, x: (tx + s / 2) * T, y: (ty + s / 2) * T, size: s, lvl: 1, cd: 0.4, ang: -Math.PI / 2, paid: free ? 0 : buildCost(sim, w, p, line),
      buff: ZERO, rally: null, slots: [], mode: 0, firing: 0, flag: 0, fixed: L.kind === "mine" || L.kind === "pit", life: 1, t: 0 };
    if (L.kind === "ramp") { var d = rampDir(map, tx, ty); b.rdir = d; b.ang = Math.atan2(d[1], d[0]); b.rpt = { x: (tx + 0.5 + d[0]) * T, y: (ty + 0.5 + d[1]) * T }; }
    if (L.kind === "pit") { b.lifeT = L.life; }
    if (L.kind === "barracks" || L.kind === "airfield" || L.kind === "heli") {
      var rp = nearestRoadPoint(map, b.x, b.y);
      if (L.kind === "barracks") { var rr = findRamp(w, b); b.rally = rr ? { x: rr.rpt.x, y: rr.rpt.y } : rp; }
      else b.rally = rp;
      for (var i = 0; i < (L.units || 1); i++) b.slots.push({ u: 0, t: 0.6 + i * 0.7 });
    }
    if (L.kind === "garrison") for (var j = 0; j < L.units; j++) b.slots.push({ u: 0, t: 0.5 + j * 0.5 });
    for (var y = ty; y < ty + s; y++) for (var x = tx; x < tx + s; x++) w.occ[y * map.W + x] = b.id;
    w.buildings.push(b);
    fx(sim, w, "build", b.x, b.y);
    return b;
  }
  function findBuilding(w, id) { for (var i = 0; i < w.buildings.length; i++) if (w.buildings[i].id === id) return w.buildings[i]; return null; }
  function findRamp(w, b) {
    var best = null, bd = (LINES[b.line].rallyRange || 7) * T;
    for (var i = 0; i < w.buildings.length; i++) {
      var r = w.buildings[i];
      if (LINES[r.line].kind !== "ramp") continue;
      var d = dist(r.x, r.y, b.x, b.y);
      if (d <= bd) { bd = d; best = r; }
    }
    return best;
  }
  function removeBuilding(sim, w, b) {
    var map = sim.map, s = b.size;
    for (var y = b.ty; y < b.ty + s; y++) for (var x = b.tx; x < b.tx + s; x++) if (w.occ[y * map.W + x] === b.id) w.occ[y * map.W + x] = 0;
    b.dead = true;
    for (var i = 0; i < w.units.length; i++) if (w.units[i].b === b.id) w.units[i].dead = true;
  }

  /* ---------------------------------------------------------------- commandes */
  // retourne "" si ok, sinon le message d'erreur
  function command(sim, p, cmd) {
    if (sim.over) return "Partie terminée";
    var w = worldOf(sim, p), map = sim.map, b, L;
    if (w.dead) return "Défaite";
    switch (cmd.c) {
      case "build": {
        L = LINES[cmd.line]; if (!L) return "?";
        var err = canPlace(sim, w, cmd.line, cmd.tx | 0, cmd.ty | 0); if (err) return err;
        var cost = buildCost(sim, w, p, cmd.line);
        if (w.gold[p] < cost) return "Pas assez d'or";
        w.gold[p] -= cost; addBuilding(sim, w, p, cmd.line, cmd.tx | 0, cmd.ty | 0); return "";
      }
      case "upgrade": {
        b = findBuilding(w, cmd.id); if (!b) return "?";
        var uc = upgradeCost(sim, w, b); if (!uc) return "Niveau maximum";
        if (w.gold[p] < uc) return "Pas assez d'or";
        w.gold[p] -= uc; b.paid += uc; b.lvl++; fx(sim, w, "level", b.x, b.y); return "";
      }
      case "sell": {
        b = findBuilding(w, cmd.id); if (!b) return "?";
        w.gold[p] += Math.round(b.paid * D.SELL * (b.fixed ? 0.5 : 1)); removeBuilding(sim, w, b); fx(sim, w, "sell", b.x, b.y); return "";
      }
      case "mode": { b = findBuilding(w, cmd.id); if (b) { b.mode = (b.mode + 1) % (LINES[b.line].kind === "barracks" ? 5 : 4); b.anchorKey = ""; } return ""; }
      case "rally": {
        b = findBuilding(w, cmd.id); if (!b) return "?"; L = LINES[b.line];
        var rx = clamp(cmd.x, 4, map.w - 4), ry = clamp(cmd.y, 4, map.h - 4);
        if (L.kind === "barracks") {
          if (b.mode !== 4) return "Passe le camp en mode Libre pour choisir où se placent les troupes";
          if (tileAt(map, Math.floor(rx / T), Math.floor(ry / T)) !== 1) return "Choisis un point sur la route";
          var zc = b.rally || { x: b.x, y: b.y };
          if (dist(rx, ry, zc.x, zc.y) > (L.zone + 0.4 * (b.lvl - 1)) * T) return "Hors de la zone d'action du camp";
          b.free = { x: rx, y: ry }; b.anchorKey = ""; return "";
        }
        else if (L.kind === "airfield" || L.kind === "heli") {
          if (dist(rx, ry, b.x, b.y) > 13 * T) return "Trop loin (13 cases max)";
        } else return "";
        b.rally = { x: rx, y: ry }; return "";
      }
      case "age": {
        if (w.age >= AGES.length - 1) return "Dernier âge atteint";
        var ac = ageCost(sim, w, p); if (w.gold[p] < ac) return "Pas assez d'or";
        w.gold[p] -= ac; w.age++; w.flash = 1; fx(sim, w, "age", map.w / 2, map.h / 2, w.age);
        for (var i = 0; i < w.buildings.length; i++) fx(sim, w, "level", w.buildings[i].x, w.buildings[i].y);
        return "";
      }
      case "wave": {
        if (sim.mode === "versus") return "En versus, les manches arrivent toutes seules";
        if (w.wave >= D.WIN_WAVE) return "";
        startWave(sim, w); return "";
      }
      case "auto": { if (sim.mode !== "versus") w.auto = !w.auto; if (w.auto && !w.active && w.nextT < 0) w.nextT = 4; return ""; }
      case "send": {
        if (sim.mode !== "versus") return "Disponible en versus";
        var sd = null; D.SENDS.forEach(function (s) { if (s.id === cmd.id) sd = s; }); if (!sd) return "?";
        if (w.gold[p] < sd.cost) return "Pas assez d'or";
        var ow = sim.worlds[1 - p]; if (ow.dead) return "";
        w.gold[p] -= sd.cost; sim.income[p] += sd.inc;
        var hm = D.hpMul(Math.max(1, sim.vsWave)) * sim.diff.hp;
        for (var k = 0; k < sd.count; k++) ow.queue.push({ t: ow.clock + 0.2 + k * 0.55, type: sd.type, path: ow.pathCtr++ % sim.map.paths.length, hpm: hm, rewm: 0.5, from: p });
        fx(sim, w, "sent", 0, 0); return "";
      }
    }
    return "?";
  }

  /* ---------------------------------------------------------------- manches */
  function startWave(sim, w) {
    var n = ++w.wave, groups = D.waveDef(n), hm = D.hpMul(n) * sim.diff.hp, np = sim.map.paths.length;
    groups.forEach(function (g) {
      for (var i = 0; i < g.count; i++) w.queue.push({ t: w.clock + g.delay + i * g.gap, type: g.type, path: w.pathCtr++ % np, hpm: hm, rewm: 1 });
    });
    w.active = true; w.nextT = -1;
    fx(sim, w, "wave", 0, 0, n);
  }
  function payday(sim, w, n) {
    w.players.forEach(function (p) {
      var g = Math.round((46 + 10 * n) * incomeMul(sim, p) * sim.diff.gold) + (sim.mode === "versus" ? sim.income[p] : 0);
      w.gold[p] += g;
    });
  }
  function spawnEnemy(sim, w, q) {
    var E = ENEMIES[q.type], path = sim.map.paths[q.path % sim.map.paths.length], off = (sim.rng() * 2 - 1) * path.hw * 0.62;
    var e = { id: sim.nextId++, type: q.type, path: q.path % sim.map.paths.length, s: 0, off: off, x: 0, y: 0, a: 0, hp: E.hp * q.hpm, hpmax: E.hp * q.hpm, air: !!E.air, speed: E.speed * (0.94 + sim.rng() * 0.12),
      armor: E.armor, st: {}, block: 0, rewm: q.rewm, last: w.players[0], fl: 0, frzImm: 0, stunImm: 0, pitT: 0, atkCd: 0, atk: (E.atk || 4) * (1 + w.wave * 0.1), healT: 0, from: q.from, hit: 0, r: E.r, rem: 1e9 };
    var pp = e.air ? flyAt(path, 0, off) : pathAt(path, 0, off);
    e.x = pp.x; e.y = pp.y; e.a = pp.a;
    w.enemies.push(e); w.emap[e.id] = e;
  }

  /* ---------------------------------------------------------------- dégâts */
  function applyStatus(e, type, dur, pow) {
    var E = ENEMIES[e.type], r = 1 - (E.res || 0), st = e.st;
    switch (type) {
      case "burn": st.burn = { t: dur, dps: pow }; break;
      case "glue": st.glue = { t: dur * (0.7 + 0.3 * r), f: pow }; break;
      case "slow": st.slow = { t: dur, f: pow }; break;
      case "freeze": if (e.frzImm <= 0) { st.freeze = { t: dur * r }; e.frzImm = dur * r + 1.6; } break;
      case "stun": if (e.stunImm <= 0) { st.stun = { t: dur * r }; e.stunImm = dur * r + 1.2; } break;
    }
  }
  function damage(sim, w, e, dmg, dtype, owner) {
    if (e.dead) return;
    var a = e.armor;
    if (dtype === "phys") dmg *= (1 - a); else if (dtype === "blast") dmg *= (1 - a * 0.5);
    e.hp -= dmg; e.hit = 0.12;
    if (owner != null) e.last = owner;
    if (e.hp <= 0) killEnemy(sim, w, e);
  }
  function killEnemy(sim, w, e) {
    if (e.dead) return;
    e.dead = true; w.kills++;
    var E = ENEMIES[e.type], m = metaOf(sim, e.last);
    var g = Math.round(E.rew * (1 + w.wave * 0.035) * e.rewm * sim.diff.gold * (1 + 0.06 * m.income));
    if (w.gold[e.last] != null) w.gold[e.last] += g;
    if (sim.stats.kills[e.last] != null) sim.stats.kills[e.last]++;
    fx(sim, w, "die", e.x, e.y, ENEMY_IDX[e.type], e.air ? 1 : 0);
  }
  function splashAt(sim, w, x, y, radius, dmg, dtype, owner, air, ground, st, ex) {
    for (var i = 0; i < w.enemies.length; i++) {
      var e = w.enemies[i]; if (e.dead || (e.air ? !air : !ground)) continue;
      var d = dist(x, y, e.x, e.y);
      if (d <= radius + e.r * 0.6) {
        damage(sim, w, e, dmg * (1 - 0.4 * clamp(d / (radius + 1), 0, 1)), dtype, owner);
        if (st && !e.dead) applyStatus(e, st.type, st.dur, st.pow);
      }
    }
  }
  function pickMode(w, x, y, range, air, ground, mode, minRange) {
    // mode 0 premier, 1 dernier, 2 fort, 3 proche (valeurs "v" ci-dessus : plus petit = meilleur)
    var best = null, bv = 0;
    for (var i = 0; i < w.enemies.length; i++) {
      var e = w.enemies[i]; if (e.dead || (e.air ? !air : !ground)) continue;
      var d = dist(x, y, e.x, e.y); if (d > range + e.r * 0.5 || d < (minRange || 0)) continue;
      var v = mode === 1 ? -e.rem : mode === 2 ? -e.hp : mode === 3 ? d : e.rem;
      if (best === null || v < bv) { best = e; bv = v; }
    }
    return best;
  }

  function shootProj(sim, w, o) {
    var p = { id: sim.nextId++, kind: o.kind, x: o.x, y: o.y, tx: o.tx, ty: o.ty, tid: o.tid || 0, speed: o.speed, dmg: o.dmg, dtype: o.dtype, splash: o.splash || 0, st: o.st || null,
      owner: o.owner, air: o.air !== false, ground: o.ground !== false, arc: !!o.arc, a: 0, z: 0, t: 0, T: 0, sx: o.x, sy: o.y };
    if (p.arc) { p.T = Math.max(0.25, dist(o.x, o.y, o.tx, o.ty) / o.speed); }
    p.a = Math.atan2(o.ty - o.y, o.tx - o.x);
    w.projs.push(p); return p;
  }

  /* ---------------------------------------------------------------- pas de simulation */
  function step(sim, dt) {
    if (sim.over) return;
    sim.time += dt;
    var i, w;
    if (sim.mode === "versus") {
      sim.vsTimer -= dt;
      if (sim.vsTimer <= 0 && sim.vsWave < D.WIN_WAVE) {
        sim.vsTimer = D.VERSUS_WAVE_EVERY; sim.vsWave++;
        sim.worlds.forEach(function (ww) { if (ww.dead) return; ww.wave = sim.vsWave; ww.active = true; var groups = D.waveDef(sim.vsWave), hm = D.hpMul(sim.vsWave) * sim.diff.hp;
          groups.forEach(function (g) { for (var k = 0; k < g.count; k++) ww.queue.push({ t: ww.clock + g.delay + k * g.gap, type: g.type, path: ww.pathCtr++ % sim.map.paths.length, hpm: hm, rewm: 1 }); });
          payday(sim, ww, sim.vsWave); fx(sim, ww, "wave", 0, 0, sim.vsWave); });
      }
    }
    for (i = 0; i < sim.worlds.length; i++) { w = sim.worlds[i]; if (!w.dead) stepWorld(sim, w, dt); }
    // fin de partie
    if (sim.mode === "versus") {
      var d0 = sim.worlds[0].dead, d1 = sim.worlds[1].dead;
      if (d0 || d1) sim.over = d0 && d1 ? { winner: -1 } : { winner: d0 ? 1 : 0 };
      else if (sim.vsWave >= D.WIN_WAVE && sim.worlds.every(function (x) { return !x.enemies.length && !x.queue.length; })) sim.over = { winner: sim.worlds[0].lives === sim.worlds[1].lives ? -1 : sim.worlds[0].lives > sim.worlds[1].lives ? 0 : 1 };
    } else {
      w = sim.worlds[0];
      if (w.dead) sim.over = { winner: -1, lost: true };
      else if (w.wave >= D.WIN_WAVE && !w.active && !w.enemies.length) sim.over = { winner: 0, won: true };
    }
  }

  function stepWorld(sim, w, dt) {
    var i, j, map = sim.map;
    w.clock += dt; if (w.flash > 0) w.flash -= dt;
    // file d'apparition
    if (w.queue.length) {
      var keep = [];
      for (i = 0; i < w.queue.length; i++) { var q = w.queue[i]; if (q.t <= w.clock) spawnEnemy(sim, w, q); else keep.push(q); }
      w.queue = keep;
    }
    // manches : fin / compte à rebours (hors versus)
    if (sim.mode !== "versus") {
      if (w.active && !w.queue.length && !w.enemies.length) {
        w.active = false; payday(sim, w, w.wave); fx(sim, w, "clear", 0, 0, w.wave);
        if (w.auto && w.wave < D.WIN_WAVE) w.nextT = D.COOP_WAIT;
      }
      if (!w.active && w.nextT >= 0) { w.nextT -= dt; if (w.nextT <= 0) startWave(sim, w); }
    } else if (w.active && !w.queue.length && !w.enemies.length) w.active = false;

    // bannières → bonus
    var banners = [];
    for (i = 0; i < w.buildings.length; i++) { var bb = w.buildings[i]; if (LINES[bb.line].kind === "banner") banners.push(bb); }
    for (i = 0; i < w.buildings.length; i++) {
      var b = w.buildings[i]; if (b.dead) continue;
      var bf = ZERO;
      if (banners.length && LINES[b.line].kind !== "banner" && !b.fixed) {
        var r = 0, d = 0, g = 0;
        for (j = 0; j < banners.length; j++) {
          var bn = banners[j], BL = LINES[bn.line], lv = 1 + 0.25 * (bn.lvl - 1), rad = (BL.radius + AGES[w.age].rg) * T;
          if (dist(b.x, b.y, bn.x, bn.y) <= rad) { r = Math.max(r, BL.buffRate[w.age] * lv); d = Math.max(d, BL.buffDmg[w.age] * lv); g = Math.max(g, BL.buffRange[w.age] * lv); }
        }
        if (r || d || g) bf = { r: r, d: d, g: g };
      }
      b.buff = bf;
      stepBuilding(sim, w, b, dt);
    }
    // ennemis
    for (i = 0; i < w.enemies.length; i++) stepEnemy(sim, w, w.enemies[i], dt);
    // troupes
    for (i = 0; i < w.units.length; i++) stepUnit(sim, w, w.units[i], dt);
    // projectiles
    for (i = 0; i < w.projs.length; i++) stepProj(sim, w, w.projs[i], dt);
    // nettoyage
    if (w.buildings.some(function (x) { return x.dead; })) w.buildings = w.buildings.filter(function (x) { return !x.dead; });
    if (w.enemies.some(function (x) { return x.dead; })) { w.enemies = w.enemies.filter(function (x) { if (x.dead) delete w.emap[x.id]; return !x.dead; }); }
    if (w.units.some(function (x) { return x.dead; })) w.units = w.units.filter(function (x) { return !x.dead; });
    if (w.projs.some(function (x) { return x.dead; })) w.projs = w.projs.filter(function (x) { return !x.dead; });
    if (w.lives <= 0) { w.lives = 0; w.dead = true; }
  }

  /* ---- bâtiments */
  function stepBuilding(sim, w, b, dt) {
    var L = LINES[b.line], st = null, A = AGES[w.age], map = sim.map, i, e, tg;
    b.t += dt; if (b.firing > 0) b.firing -= dt;
    switch (L.kind) {
      case "shoot": case "mortar": {
        st = bstat(sim, w, b); b.cd -= dt;
        tg = pickMode(w, b.x, b.y, st.range, L.air, L.ground, b.mode, (L.minRange || 0) * T);
        if (tg) {
          var aim = Math.atan2(tg.y - b.y, tg.x - b.x); b.ang = aim;
          if (b.cd <= 0) {
            b.cd = 1 / st.rate;
            var stt = null;
            if (L.status === "glue") stt = { type: "glue", dur: L.dur + b.lvl * 0.3, pow: [0.5, 0.45, 0.4, 0.35, 0.3][w.age] };
            else if (L.status === "freeze") stt = { type: "freeze", dur: L.dur + w.age * 0.14 + b.lvl * 0.1, pow: 0 };
            var mx = b.x + Math.cos(aim) * 14, my = b.y + Math.sin(aim) * 14;
            if (L.kind === "mortar") {
              var lead = dist(mx, my, tg.x, tg.y) / L.speed, nx = tg.x, ny = tg.y;
              if (!tg.air && !tg.st.stun && !tg.st.freeze) { var ps = tg.air ? flyAt(sim.map.paths[tg.path], tg.s + tg.speed * lead, tg.off) : pathAt(sim.map.paths[tg.path], tg.s + tg.speed * lead, tg.off); nx = ps.x; ny = ps.y; }
              shootProj(sim, w, { kind: L.ammo[w.age], x: mx, y: my, tx: nx, ty: ny, speed: L.speed, dmg: st.dmg, dtype: L.dtype, splash: (L.splash + 0.12 * (b.lvl - 1)) * T, owner: b.owner, air: false, arc: true });
            } else {
              shootProj(sim, w, { kind: L.ammo[w.age], x: mx, y: my, tx: tg.x, ty: tg.y, tid: tg.id, speed: L.speed, dmg: st.dmg, dtype: L.dtype, splash: (L.splash || 0) * T, st: stt, owner: b.owner, air: L.air, ground: L.ground });
            }
            b.firing = 0.12; fx(sim, w, "muzzle", mx, my, aim);
          }
        }
        break;
      }
      case "pulse": {
        st = bstat(sim, w, b); b.cd -= dt;
        tg = pickMode(w, b.x, b.y, st.range, L.air, L.ground, b.mode, 0);
        if (tg) b.ang = Math.atan2(tg.y - b.y, tg.x - b.x);
        if (tg && b.cd <= 0) {
          b.cd = 1 / st.rate; b.firing = 0.3;
          for (i = 0; i < w.enemies.length; i++) {
            e = w.enemies[i]; if (e.dead || e.air) continue;
            if (dist(b.x, b.y, e.x, e.y) <= st.range + e.r * 0.4) { damage(sim, w, e, st.dmg, "fire", b.owner); if (!e.dead) applyStatus(e, "burn", L.dur + b.lvl * 0.4, L.dps * st.dm); }
          }
        }
        break;
      }
      case "chain": {
        st = bstat(sim, w, b); b.cd -= dt;
        tg = pickMode(w, b.x, b.y, st.range, L.air, L.ground, b.mode, 0);
        if (tg) { b.ang = Math.atan2(tg.y - b.y, tg.x - b.x);
          if (b.cd <= 0) {
            b.cd = 1 / st.rate; b.firing = 0.2;
            var hit = [tg], cur = tg, px = b.x, py = b.y, dm = st.dmg, jumps = L.jumps + Math.floor(w.age / 2) + (b.lvl - 1);
            for (var jn = 0; jn <= jumps && cur; jn++) {
              fx(sim, w, "zap", px, py, cur.x, cur.y);
              damage(sim, w, cur, dm, "energy", b.owner);
              if (!cur.dead && sim.rng() < 0.3 + 0.06 * w.age + 0.05 * (b.lvl - 1)) applyStatus(cur, "stun", L.dur + 0.1 * w.age, 0);
              px = cur.x; py = cur.y; dm *= 0.8;
              var nxt = null, nd = 2.4 * T;
              for (i = 0; i < w.enemies.length; i++) { e = w.enemies[i]; if (e.dead || hit.indexOf(e) >= 0) continue; var dd = dist(px, py, e.x, e.y); if (dd < nd) { nd = dd; nxt = e; } }
              if (nxt) hit.push(nxt); cur = nxt;
            }
          } }
        break;
      }
      case "mine": {
        for (i = 0; i < w.enemies.length; i++) {
          e = w.enemies[i]; if (e.dead || e.air) continue;
          if (dist(b.x, b.y, e.x, e.y) < 15 + e.r * 0.5) {
            var md = L.dmg * A.dm * (1 + 0.04 * metaOf(sim, b.owner).dmg), rad = L.splash * T;
            splashAt(sim, w, b.x, b.y, rad, md, "blast", b.owner, false, true, { type: "stun", dur: 0.5, pow: 0 });
            fx(sim, w, "boom", b.x, b.y, rad, w.age); removeBuilding(sim, w, b); return;
          }
        }
        break;
      }
      case "pit": {
        b.lifeT -= dt; b.life = clamp(b.lifeT / L.life, 0, 1);
        if (b.lifeT <= 0) { removeBuilding(sim, w, b); fx(sim, w, "smoke", b.x, b.y); return; }
        var rad2 = L.radius * T, dps = L.dps * A.dm * (1 + 0.04 * metaOf(sim, b.owner).dmg);
        for (i = 0; i < w.enemies.length; i++) {
          e = w.enemies[i]; if (e.dead || e.air) continue;
          if (dist(b.x, b.y, e.x, e.y) <= rad2) {
            damage(sim, w, e, dps * dt, "energy", b.owner); if (e.dead) continue;
            applyStatus(e, "slow", 0.35, 0.5 - 0.03 * w.age);
            if (e.pitT <= 0) { applyStatus(e, "stun", 0.55, 0); e.pitT = 5; }
          }
        }
        break;
      }
      case "barracks": case "garrison": case "airfield": case "heli": manageSlots(sim, w, b, dt); break;
    }
  }

  function manageSlots(sim, w, b, dt) {
    var L = LINES[b.line], st = bstat(sim, w, b), ramp = null;
    b.flag = 0;
    if (L.kind === "barracks") { ramp = findRamp(w, b); if (!ramp) b.flag = 1; else if (!b.rally || b.rally.x !== ramp.rpt.x || b.rally.y !== ramp.rpt.y) { b.rally = { x: ramp.rpt.x, y: ramp.rpt.y }; b.anchorKey = ""; } }
    for (var i = 0; i < b.slots.length; i++) {
      var sl = b.slots[i], u = sl.u ? unitById(w, sl.u) : null;
      if (u && !u.dead) continue;
      sl.u = 0;
      sl.t -= dt; if (sl.t > 0) continue;
      if (L.kind === "barracks" && !ramp) { sl.t = 0.5; continue; }
      var unit = { id: sim.nextId++, b: b.id, owner: b.owner, line: b.line, slot: i, kind: L.kind === "barracks" ? "def" : L.kind === "garrison" ? "arch" : L.kind === "airfield" ? "plane" : "heli",
        x: b.x, y: b.y, hp: st.hp || 1, hpmax: st.hp || 1, ang: -Math.PI / 2, cd: 0.5, route: [], arrived: false, target: 0, atkT: 0, rcd: 2, spot: null, orb: i * (Math.PI * 2 / Math.max(1, b.slots.length)) + sim.rng() };
      if (unit.kind === "def") {
        if (!b.rally || dist(b.rally.x, b.rally.y, ramp.rpt.x, ramp.rpt.y) > 8 * T) b.rally = { x: ramp.rpt.x, y: ramp.rpt.y };
        unit.route = [{ x: ramp.x, y: ramp.y }, { x: ramp.rpt.x, y: ramp.rpt.y }];
      } else if (unit.kind === "arch") {
        unit.spot = pickSpot(sim, w, b, i);
        unit.route = [{ x: unit.spot.x, y: unit.spot.y }];
      } else { unit.x = b.x; unit.y = b.y; unit.h = 0; }
      w.units.push(unit); sl.u = unit.id; sl.t = (L.respawn || 8);
      fx(sim, w, "spawn", b.x, b.y);
    }
  }
  function unitById(w, id) { for (var i = 0; i < w.units.length; i++) if (w.units[i].id === id) return w.units[i]; return null; }
  function pickSpot(sim, w, b, idx) {
    var map = sim.map, cand = [];
    for (var i = 0; i < map.edge.length; i++) {
      var t = map.edge[i], x = (t[0] + 0.5) * T, y = (t[1] + 0.5) * T, d = dist(x, y, b.x, b.y);
      if (d > 5.5 * T) continue;
      var taken = false;
      for (var k = 0; k < w.units.length; k++) { var u = w.units[k]; if (u.kind === "arch" && u.spot && !u.dead && u.b !== b.id && dist(u.spot.x, u.spot.y, x, y) < 12) taken = true; if (u.kind === "arch" && u.b === b.id && u.slot !== idx && u.spot && dist(u.spot.x, u.spot.y, x, y) < 14) taken = true; }
      if (taken) continue;
      var dx = 0, dy = 0; // se tourner vers la route : on se met au bord
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d4) { if (tileAt(map, t[0] + d4[0], t[1] + d4[1]) === 1) { dx = d4[0]; dy = d4[1]; } });
      cand.push({ d: d + idx * 3 + ((t[0] * 7 + t[1] * 3 + idx * 5) % 6) * 6, x: x + dx * 8 + (dy ? (idx - 1) * 9 : 0), y: y + dy * 8 + (dx ? (idx - 1) * 9 : 0), face: Math.atan2(dy, dx) });
    }
    cand.sort(function (a, c) { return a.d - c.d; });
    return cand[0] || { x: b.x, y: b.y + T, face: 0 };
  }

  /* ---- ennemis */
  function stepEnemy(sim, w, e, dt) {
    if (e.dead) return;
    var E = ENEMIES[e.type], st = e.st, path = sim.map.paths[e.path], fl = 0, i;
    if (e.hit > 0) e.hit -= dt;
    if (e.frzImm > 0) e.frzImm -= dt; if (e.stunImm > 0) e.stunImm -= dt; if (e.pitT > 0) e.pitT -= dt;
    // statuts
    var f = 1;
    if (st.burn) { st.burn.t -= dt; damage(sim, w, e, st.burn.dps * dt, "fire", e.last); fl |= FL.burn; if (st.burn.t <= 0) delete st.burn; }
    if (e.dead) return;
    if (st.glue) { st.glue.t -= dt; f = Math.min(f, st.glue.f); fl |= FL.glue; if (st.glue.t <= 0) delete st.glue; }
    if (st.slow) { st.slow.t -= dt; f = Math.min(f, st.slow.f); fl |= FL.slow; if (st.slow.t <= 0) delete st.slow; }
    if (st.freeze) { st.freeze.t -= dt; f = 0; fl |= FL.freeze; if (st.freeze.t <= 0) { delete st.freeze; st.slow = { t: 2, f: 0.55 }; } }
    if (st.stun) { st.stun.t -= dt; f = 0; fl |= FL.stun; if (st.stun.t <= 0) delete st.stun; }
    e.fl = fl;
    // médic
    if (E.heal) { e.healT -= dt; if (e.healT <= 0) { e.healT = 1; for (i = 0; i < w.enemies.length; i++) { var o = w.enemies[i]; if (!o.dead && o !== e && dist(o.x, o.y, e.x, e.y) < 74 && o.hp < o.hpmax) { o.hp = Math.min(o.hpmax, o.hp + o.hpmax * E.heal); } } fx(sim, w, "heal", e.x, e.y); } }
    // blocage par une troupe
    var blocker = null;
    if (!e.air) {
      if (e.block) { blocker = unitById(w, e.block); if (!blocker || blocker.dead || dist(blocker.x, blocker.y, e.x, e.y) > e.r + 30) { blocker = null; e.block = 0; } }
      if (!blocker && !(st.stun || st.freeze)) {
        for (i = 0; i < w.units.length; i++) {
          var u = w.units[i];
          if (u.kind !== "def" || u.dead || !u.arrived) continue;
          if (dist(u.x, u.y, e.x, e.y) < e.r + 15) { blocker = u; e.block = u.id; break; }
        }
      }
    }
    if (blocker) {
      e.atkCd -= dt;
      var ba = Math.atan2(blocker.y - e.y, blocker.x - e.x); e.a = ba;
      if (e.atkCd <= 0 && f > 0) { e.atkCd = 1; blocker.hp -= e.atk * (e.type === "tank" ? 1 : 1); blocker.flash = 0.15; fx(sim, w, "hit", blocker.x, blocker.y); if (blocker.hp <= 0) { blocker.dead = true; fx(sim, w, "dieu", blocker.x, blocker.y); } }
    } else {
      e.s += e.speed * f * dt;
    }
    var len = e.air ? path.flyLen : path.len;
    var pp = e.air ? flyAt(path, e.s, e.off) : pathAt(path, e.s, e.off);
    if (!blocker) { e.a = pp.a; }
    e.x = pp.x; e.y = pp.y; e.rem = len - e.s;
    if (e.s >= len) {
      e.dead = true; w.lives -= E.lives; w.flash = 0.4; fx(sim, w, "leak", e.x, e.y, E.lives);
    }
  }

  /* ---- troupes */
  function stepUnit(sim, w, u, dt) {
    if (u.dead) return;
    var b = findBuilding(w, u.b); if (!b) { u.dead = true; return; }
    var L = LINES[b.line], st = bstat(sim, w, b), i;
    if (u.flash > 0) u.flash -= dt;
    if (u.atkT > 0) u.atkT -= dt;
    if (L.hp) { var hm = st.hp; if (Math.abs(hm - u.hpmax) > 0.01) { u.hp = u.hp * hm / u.hpmax; u.hpmax = hm; } }
    u.cd -= dt;
    if (u.kind === "def") {
      var spd = L.speed;
      if (u.route.length) {
        var wp = u.route[0], d = dist(u.x, u.y, wp.x, wp.y);
        if (d < 3) u.route.shift(); else { u.ang = Math.atan2(wp.y - u.y, wp.x - u.x); u.x += Math.cos(u.ang) * spd * dt; u.y += Math.sin(u.ang) * spd * dt; }
        if (!u.route.length) u.arrived = true;
        if (!u.arrived) return;
      }
      var rally = b.rally || { x: u.x, y: u.y };
      // zone d'action automatique centrée sur le pied de la rampe ; le mode du camp décide où ils se postent et qui ils attaquent
      var zone = (L.zone + 0.4 * (b.lvl - 1)) * T, md = b.mode;
      var tg = u.target ? w.emap[u.target] : null;
      if (tg && (tg.dead || tg.air || dist(tg.x, tg.y, rally.x, rally.y) > zone + 10)) { tg = null; u.target = 0; }
      if (!tg) {
        var bv = 1e9;
        for (i = 0; i < w.enemies.length; i++) {
          var e = w.enemies[i]; if (e.dead || e.air) continue; if (dist(e.x, e.y, rally.x, rally.y) > zone) continue;
          var sc = md === 0 ? -e.rem : md === 1 ? e.rem : md === 2 ? -e.hp : md === 3 ? dist(e.x, e.y, rally.x, rally.y) : dist(e.x, e.y, (b.anchor || rally).x, (b.anchor || rally).y);
          sc += (e.block && e.block !== u.id ? 25 : 0);
          if (sc < bv) { bv = sc; tg = e; }
        }
        u.target = tg ? tg.id : 0;
      }
      var ak = md + "|" + b.lvl + "|" + (b.free ? Math.round(b.free.x) + "," + Math.round(b.free.y) : ""); if (b.anchorKey !== ak) { b.anchorKey = ak; b.anchor = md === 4 ? (b.free || { x: rally.x, y: rally.y }) : campAnchor(sim, rally, zone, md); }
      var sx = b.anchor.x + Math.cos(u.orb) * 15, sy = b.anchor.y + Math.sin(u.orb) * 15;
      if (tg) {
        var dx = tg.x - u.x, dy = tg.y - u.y, dd2 = Math.sqrt(dx * dx + dy * dy), reach = L.reach + tg.r * 0.6;
        u.ang = Math.atan2(dy, dx);
        if (dd2 > reach - 4) { u.x += dx / dd2 * spd * 1.6 * dt; u.y += dy / dd2 * spd * 1.6 * dt; }
        if (dd2 <= reach && u.cd <= 0) {
          u.cd = 1 / st.rate; u.atkT = 0.18;
          var mul = (L.bonusArmor && tg.armor >= 0.4) ? L.bonusArmor : 1;
          damage(sim, w, tg, st.dmg * mul, "phys", b.owner); fx(sim, w, "hit", tg.x, tg.y);
          if (!tg.dead && tg.block === 0 && !tg.air) tg.block = u.id;
        }
      } else {
        var ddx = sx - u.x, ddy = sy - u.y, dl = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dl > 2) { u.x += ddx / dl * spd * dt; u.y += ddy / dl * spd * dt; u.ang = Math.atan2(ddy, ddx); }
        if (u.hp < u.hpmax) u.hp = Math.min(u.hpmax, u.hp + u.hpmax * 0.03 * dt);
      }
    } else if (u.kind === "arch") {
      if (u.route.length) {
        var wp2 = u.route[0], d2 = dist(u.x, u.y, wp2.x, wp2.y);
        if (d2 < 3) u.route.shift(); else { u.ang = Math.atan2(wp2.y - u.y, wp2.x - u.x); u.x += Math.cos(u.ang) * L.speed * dt; u.y += Math.sin(u.ang) * L.speed * dt; }
        return;
      }
      var tga = pickMode(w, u.x, u.y, st.range, true, true, b.mode, 0);
      if (tga) {
        u.ang = Math.atan2(tga.y - u.y, tga.x - u.x);
        if (u.cd <= 0) { u.cd = 1 / st.rate; u.atkT = 0.15;
          shootProj(sim, w, { kind: ["stone", "arrow", "bullet", "bullet", "plasma"][w.age], x: u.x, y: u.y, tx: tga.x, ty: tga.y, tid: tga.id, speed: [300, 420, 600, 700, 800][w.age], dmg: st.dmg, dtype: L.dtype, owner: b.owner }); }
      } else if (u.spot) u.ang = u.spot.face;
    } else if (u.kind === "plane") {
      var c = b.rally || { x: b.x, y: b.y }, R = L.orbit * T;
      u.orb += (L.speed / R) * dt;
      var px = c.x + Math.cos(u.orb) * R, py = c.y + Math.sin(u.orb) * R;
      var mdx = px - u.x, mdy = py - u.y, ml = Math.sqrt(mdx * mdx + mdy * mdy), sp = L.speed * 1.5 * dt;
      if (ml > sp) { u.x += mdx / ml * sp; u.y += mdy / ml * sp; u.ang = Math.atan2(mdy, mdx); } else { u.x = px; u.y = py; u.ang = u.orb + Math.PI / 2; }
      if (u.cd <= 0) {
        var tgp = pickMode(w, u.x, u.y, st.range, true, true, 3, 0);
        if (tgp) { u.cd = 1 / st.rate; u.atkT = 0.2; shootProj(sim, w, { kind: "bomb", x: u.x, y: u.y, tx: tgp.x, ty: tgp.y, tid: tgp.id, speed: 360, dmg: st.dmg, dtype: "blast", splash: L.splash * T, owner: b.owner }); }
      }
    } else if (u.kind === "heli") {
      var hc = b.rally || { x: b.x, y: b.y };
      var hdx = hc.x - u.x, hdy = hc.y - u.y, hl = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hl > 3) { u.x += hdx / hl * L.speed * dt; u.y += hdy / hl * L.speed * dt; }
      u.orb += dt * 1.4;
      var tgh = pickMode(w, u.x, u.y, st.range, true, true, b.mode === 0 ? 3 : b.mode, 0);
      if (tgh) {
        u.ang = Math.atan2(tgh.y - u.y, tgh.x - u.x);
        if (u.cd <= 0) { u.cd = 1 / st.rate; u.atkT = 0.1; shootProj(sim, w, { kind: "bulletsm", x: u.x, y: u.y, tx: tgh.x, ty: tgh.y, tid: tgh.id, speed: 640, dmg: st.dmg, dtype: "phys", owner: b.owner }); }
        u.rcd -= dt;
        if (u.rcd <= 0) { u.rcd = L.rocket; shootProj(sim, w, { kind: "rocket", x: u.x, y: u.y, tx: tgh.x, ty: tgh.y, tid: tgh.id, speed: 330, dmg: st.dmg * 5.5, dtype: "blast", splash: L.splash * T, owner: b.owner }); }
      }
    }
  }

  // point de la route (dans la zone) où les troupes attendent : 0 entrée (amont), 1 sortie (aval), 2/3 centre = pied de la rampe
  function campAnchor(sim, c, zone, md) {
    var best = { x: c.x, y: c.y }, bs = null;
    if (md === 2 || md === 3) return best;
    for (var k = 0; k < sim.map.paths.length; k++) {
      var P = sim.map.paths[k];
      for (var sP = 0; sP <= P.len; sP += 8) {
        var q = pathAt(P, sP, 0); if (dist(q.x, q.y, c.x, c.y) > zone * 0.97 || q.x < 24 || q.y < 24 || q.x > sim.map.w - 24 || q.y > sim.map.h - 24) continue;
        var key = md === 0 ? sP : -sP;
        if (bs === null || key < bs) { bs = key; best = { x: q.x, y: q.y }; }
      }
    }
    return best;
  }

  /* ---- projectiles */
  function stepProj(sim, w, p, dt) {
    if (p.dead) return;
    if (p.arc) {
      p.t += dt; var k = clamp(p.t / p.T, 0, 1);
      p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k; p.z = Math.sin(k * Math.PI) * 38; p.a = Math.atan2(p.ty - p.sy, p.tx - p.sx);
      if (k >= 1) { land(sim, w, p); }
      return;
    }
    var tg = p.tid ? w.emap[p.tid] : null;
    if (tg && !tg.dead) { p.tx = tg.x; p.ty = tg.y; }
    var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy), mv = p.speed * dt;
    p.a = Math.atan2(dy, dx);
    if (d <= mv + (tg ? tg.r * 0.6 : 3)) { p.x = p.tx; p.y = p.ty; land(sim, w, p, tg); return; }
    p.x += dx / d * mv; p.y += dy / d * mv; p.t += dt;
    if (p.t > 4) p.dead = true;
  }
  function land(sim, w, p, tg) {
    p.dead = true;
    if (p.splash) {
      splashAt(sim, w, p.tx, p.ty, p.splash, p.dmg, p.dtype, p.owner, p.air, p.ground, p.st);
      fx(sim, w, p.kind === "bomb" || p.kind === "rocket" || p.arc ? "boom" : p.st ? "splat" : "hit", p.tx, p.ty, p.splash, p.kind === "bomb" ? 1 : 0);
    } else if (tg && !tg.dead) {
      damage(sim, w, tg, p.dmg, p.dtype, p.owner);
      if (p.st && !tg.dead) applyStatus(tg, p.st.type, p.st.dur, p.st.pow);
      fx(sim, w, "hit", p.tx, p.ty);
    }
  }

  /* ---------------------------------------------------------------- instantané réseau */
  function r1(v) { return Math.round(v); }
  function snapshot(sim, p) {
    var w = worldOf(sim, p), o = sim.mode === "versus" ? sim.worlds[1 - p] : null;
    var s = { t: sim.time, a: w.age, l: w.lives, ml: w.maxLives, wv: w.active ? 1 : 0, wn: w.wave, nt: w.nextT < 0 ? -1 : Math.round(w.nextT * 10) / 10, au: w.auto ? 1 : 0, g: w.gold.map(r1), k: w.kills,
      vt: Math.round(sim.vsTimer * 10) / 10, vw: sim.vsWave, ic: sim.income, fl: w.flash > 0 ? 1 : 0,
      B: [], U: [], E: [], P: [], F: w.fxNet };
    if (o) s.o = [o.lives, o.age, o.wave, o.queue.length + o.enemies.length];
    if (sim.over) s.over = sim.over;
    w.fxNet = [];
    w.buildings.forEach(function (b) {
      s.B.push([b.id, LINE_IDX[b.line], b.tx, b.ty, b.lvl, Math.round(b.ang * 20), b.owner, b.rally ? r1(b.rally.x) : 0, b.rally ? r1(b.rally.y) : 0, b.mode, b.flag, Math.round(b.life * 100), b.firing > 0 ? 1 : 0, r1((b.buff.r + b.buff.d) * 100), b.anchor ? r1(b.anchor.x) : 0, b.anchor ? r1(b.anchor.y) : 0]);
    });
    w.units.forEach(function (u) { s.U.push([u.id, KIND_IDX[u.kind], LINE_IDX[u.line], r1(u.x), r1(u.y), Math.round(Math.max(0, u.hp / u.hpmax) * 100), Math.round(u.ang * 20), u.atkT > 0 ? 1 : 0, u.b]); });
    w.enemies.forEach(function (e) { s.E.push([e.id, ENEMY_IDX[e.type], r1(e.x), r1(e.y), Math.round(e.a * 20), Math.round(Math.max(0, e.hp / e.hpmax) * 100), e.fl, e.hit > 0 ? 1 : 0]); });
    w.projs.forEach(function (q) { s.P.push([q.id, PROJ_NAMES.indexOf(q.kind), r1(q.x), r1(q.y), Math.round(q.a * 20), Math.round(q.z)]); });
    return s;
  }
  // « vue » côté invité : mêmes champs que le monde de l'hôte pour ce que le dessin utilise
  function createView(sim0) {
    return { map: sim0.map, mode: sim0.mode, age: 0, lives: D.START_LIVES, maxLives: D.START_LIVES, wave: 0, active: false, nextT: -1, auto: false, gold: [0, 0], kills: 0, flash: 0, vsTimer: 0, vsWave: 0, income: [0, 0],
      buildings: [], units: [], enemies: [], projs: [], fx: [], opp: null, over: null, time: 0, _bm: {}, _um: {}, _em: {}, _pm: {} };
  }
  function lerpAng(a, b, k) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; }
  function applySnapshot(v, s) {
    v.age = s.a; v.lives = s.l; v.maxLives = s.ml; v.active = !!s.wv; v.wave = s.wn; v.nextT = s.nt; v.auto = !!s.au; v.gold = s.g; v.kills = s.k; v.vsTimer = s.vt; v.vsWave = s.vw; v.income = s.ic;
    if (s.fl) v.flash = 0.4; v.time = s.t; v.opp = s.o || null; v.over = s.over || null;
    var seen, nb = [], nu = [], ne = [], np = [], i, a, o;
    seen = {};
    s.B.forEach(function (r) { o = v._bm[r[0]] || (v._bm[r[0]] = { id: r[0] });
      var line = D.LINE_ORDER[r[1]], L = LINES[line], sz = L.size || 1;
      o.line = line; o.tx = r[2]; o.ty = r[3]; o.size = sz; o.x = (r[2] + sz / 2) * T; o.y = (r[3] + sz / 2) * T; o.lvl = r[4]; o.ang = r[5] / 20; o.owner = r[6]; o.rally = r[7] ? { x: r[7], y: r[8] } : null; o.mode = r[9]; o.flag = r[10]; o.life = r[11] / 100; o.firing = r[12] ? 0.1 : 0; o.buff = { r: r[13] / 100, d: 0, g: 0 }; o.anchor = r[14] ? { x: r[14], y: r[15] } : null; o.fixed = L.kind === "mine" || L.kind === "pit"; o.t = (o.t || 0);
      if (L.kind === "ramp") { var d4 = null; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (tileAt(v.map, r[2] + d[0], r[3] + d[1]) === 1) d4 = d; }); o.rdir = d4; if (d4) o.ang = Math.atan2(d4[1], d4[0]); }
      seen[r[0]] = 1; nb.push(o); });
    Object.keys(v._bm).forEach(function (k) { if (!seen[k]) delete v._bm[k]; }); v.buildings = nb;
    seen = {};
    s.U.forEach(function (r) { o = v._um[r[0]]; if (!o) { o = v._um[r[0]] = { id: r[0], x: r[3], y: r[4], tx: r[3], ty: r[4], ang: r[6] / 20 }; }
      o.kind = KIND_NAMES[r[1]]; o.line = D.LINE_ORDER[r[2]]; o.tx = r[3]; o.ty = r[4]; o.hp = r[5] / 100; o.hpmax = 1; o.ta = r[6] / 20; o.atkT = r[7] ? 0.1 : 0; o.b = r[8]; o.arrived = true; seen[r[0]] = 1; nu.push(o); });
    Object.keys(v._um).forEach(function (k) { if (!seen[k]) delete v._um[k]; }); v.units = nu;
    seen = {};
    s.E.forEach(function (r) { o = v._em[r[0]]; if (!o) { o = v._em[r[0]] = { id: r[0], x: r[2], y: r[3], tx: r[2], ty: r[3], a: r[4] / 20 }; }
      o.type = D.ENEMY_ORDER[r[1]]; o.tx = r[2]; o.ty = r[3]; o.ta = r[4] / 20; o.hp = r[5] / 100; o.hpmax = 1; o.fl = r[6]; o.hit = r[7] ? 0.1 : 0; o.air = !!ENEMIES[o.type].air; o.r = ENEMIES[o.type].r; seen[r[0]] = 1; ne.push(o); });
    Object.keys(v._em).forEach(function (k) { if (!seen[k]) delete v._em[k]; }); v.enemies = ne;
    seen = {};
    s.P.forEach(function (r) { o = v._pm[r[0]]; if (!o) { o = v._pm[r[0]] = { id: r[0], x: r[2], y: r[3] }; }
      o.kind = PROJ_NAMES[r[1]]; o.tx = r[2]; o.ty = r[3]; o.a = r[4] / 20; o.z = r[5]; seen[r[0]] = 1; np.push(o); });
    Object.keys(v._pm).forEach(function (k) { if (!seen[k]) delete v._pm[k]; }); v.projs = np;
    (s.F || []).forEach(function (f) { v.fx.push(f); });
  }
  function viewStep(v, dt) {
    var k = Math.min(1, dt * 16), i, o;
    for (i = 0; i < v.units.length; i++) { o = v.units[i]; o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.ang = lerpAng(o.ang, o.ta, k); if (o.atkT > 0) o.atkT -= dt; }
    for (i = 0; i < v.enemies.length; i++) { o = v.enemies[i]; o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.a = lerpAng(o.a, o.ta, k); if (o.hit > 0) o.hit -= dt; }
    for (i = 0; i < v.projs.length; i++) { o = v.projs[i]; o.x += (o.tx - o.x) * Math.min(1, dt * 24); o.y += (o.ty - o.y) * Math.min(1, dt * 24); }
    if (v.flash > 0) v.flash -= dt;
    for (i = 0; i < v.buildings.length; i++) { o = v.buildings[i]; o.t += dt; if (o.firing > 0) o.firing -= dt; }
  }

  var C = { D: D, createSim: createSim, step: step, command: command, snapshot: snapshot, createView: createView, applySnapshot: applySnapshot, viewStep: viewStep,
    canPlace: canPlace, buildCost: buildCost, upgradeCost: upgradeCost, ageCost: ageCost, bstat: bstat, findBuilding: findBuilding, findRamp: findRamp, buildMap: buildMap, tileAt: tileAt, pathAt: pathAt, worldOf: worldOf, metaOf: metaOf, defaultMeta: defaultMeta,
    FL: FL, PROJ_NAMES: PROJ_NAMES, rng32: rng32, dist: dist, nearestRoadPoint: nearestRoadPoint, startWave: startWave, unitById: unitById, LINE_IDX: LINE_IDX, ENEMY_IDX: ENEMY_IDX };
  if (typeof module !== "undefined" && module.exports) module.exports = C;
  root.AGES_CORE = C;
})(typeof window !== "undefined" ? window : globalThis);
