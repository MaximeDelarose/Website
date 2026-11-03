/* =========================================================================
   King Dice — moteur (aucun DOM, testable dans Node)
   require("./js/kingdice-core.js") puis KD_CORE.createWorld() / KD_CORE.step(w, dt)

   Plateau 7 × 7 : colonnes 0-1 = joueur 1, 2-4 = couloir des ennemis,
   5-6 = joueur 2. Les ennemis descendent du haut (ligne 0) vers le roi
   (sous la ligne 6). Les pièces attaquent selon leur forme aux échecs :
   Tour = sa ligne, Fou = ses diagonales, Cavalier = les cases en L.

   Le moteur ne fait que les règles. Tout ce qui se voit ou s'entend est
   déclenché par les événements de w.events (vidés par le rendu à chaque image).
   ========================================================================= */
(function (root) {
  "use strict";

  /* ====================== ÉQUILIBRAGE (tout se règle ici) ====================== */
  var CFG = {
    cols: 7, rows: 7,
    zones: [[0, 1], [5, 6]],          // colonnes de chaque joueur
    lanes: [2, 3, 4],                 // couloir central
    kingHp: 10,
    startMana: 9,
    summonCost: 3,
    killMana: 1,                      // pour CHAQUE joueur
    waveMana: 3,                      // pour chaque joueur, en fin de vague
    coopMana: 1,                      // bonus d'un combo coop, pour chacun
    coopWindow: 2,                    // secondes : touché par les deux joueurs dans cet intervalle
    maxLevel: 4,
    startPieces: [{ c: 0, r: 3, type: "rook" }, { c: 6, r: 3, type: "rook" }],
    // dégâts par coup, temps entre deux tirs (s), vitesse du projectile (cases/s)
    pieces: {
      rook:   { name: "Tour",     dmg: 8,  cd: 0.48, speed: 13 },
      bishop: { name: "Fou",      dmg: 10, cd: 0.8,  speed: 8 },
      knight: { name: "Cavalier", dmg: 27, cd: 1.3,  hop: 0.3, stagger: 0.35 },   // le coup de sabot retarde le pas suivant
    },
    levelDmg: [1, 2.3, 4.8, 9],       // multiplicateur de dégâts par niveau (1 → 4)
    levelCd:  [1, 0.93, 0.86, 0.78],  // multiplicateur du temps entre deux tirs
    // améliorations de type (mana) : +dégâts pour toutes les pièces de ce type du joueur
    upgrade: { base: 6, grow: 1.4, dmgPerLevel: 0.12 },   // prix = base × grow^niveau, sans limite
    enemies: {
      normal:  { name: "Pionnet",       hp: 26,  step: 2.0,  dmg: 1, armor: 0, score: 10 },
      fast:    { name: "Filou",         hp: 16,  step: 1.05, dmg: 1, armor: 0, score: 12 },
      armored: { name: "Cabosse",       hp: 70,  step: 2.8,  dmg: 1, armor: 4, score: 20 },
      boss:    { name: "Gros Pionnet",  hp: 520, step: 3.3,  dmg: 3, armor: 3, score: 200 },
    },
    // les pouvoirs arrivent par la jauge coop (combos coop + vagues réussies)
    coopGauge: 20,
    waveGauge: 2,                     // +2 à la jauge à chaque vague terminée
    powers: {
      grenade: { name: "Grenade", dmg: 60 },     // × la santé de la vague, sur 3 lignes du couloir
      freeze:  { name: "Gel", time: 6, mul: 0.35 },
      rainbow: { name: "Arc-en-ciel" },
    },
    score: { wave: 40, coop: 30, perfect: 60 },
  };

  // composition des vagues : centralisée et lisible
  function hpMul(n) { var k = n - 1; return (1 + 0.45 * k + 0.05 * k * k) * Math.pow(1.04, Math.max(0, n - 6)); }
  function waveDef(n) {
    var count = Math.min(32, 5 + Math.floor(n * 1.4));
    var fastShare = n < 3 ? 0 : Math.min(0.32, 0.12 + (n - 3) * 0.025);
    var armShare = n < 5 ? 0 : Math.min(0.28, 0.1 + (n - 5) * 0.02);
    var nf = Math.round(count * fastShare), na = Math.round(count * armShare);
    if (n === 3) nf = Math.max(nf, 2);
    if (n === 5) na = Math.max(na, 2);
    var list = [];
    for (var i = 0; i < count - nf - na; i++) list.push("normal");
    for (i = 0; i < nf; i++) list.push("fast");
    for (i = 0; i < na; i++) list.push("armored");
    // mélange reproductible (même vague = même ordre), les premiers sont toujours des normaux
    var rng = seeded(n * 7919 + 13);
    for (i = list.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    for (i = 0; i < Math.min(2, list.length); i++) if (list[i] !== "normal") { var k = list.indexOf("normal", 2); if (k > 0) { list[k] = list[i]; list[i] = "normal"; } }
    if (n % 10 === 0) list.push("boss");
    return { n: n, list: list, interval: Math.max(0.62, 1.65 - n * 0.04), hp: hpMul(n) };
  }
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* ====================== OUTILS ====================== */
  var TYPES = ["rook", "bishop", "knight"];
  function inZone(p, c, r) { return r >= 0 && r < CFG.rows && CFG.zones[p].indexOf(c) >= 0; }
  function isLane(c) { return CFG.lanes.indexOf(c) >= 0; }
  function ownerOfCol(c) { return CFG.zones[0].indexOf(c) >= 0 ? 0 : CFG.zones[1].indexOf(c) >= 0 ? 1 : -1; }

  // cases du couloir couvertes par une pièce posée en (c, r)
  var RANGE_CACHE = {};
  function rangeCells(type, c, r) {
    var key = type + c + "," + r;
    if (RANGE_CACHE[key]) return RANGE_CACHE[key];
    var out = [], i, R = CFG.rows;
    function add(x, y) { if (y >= 0 && y < R && isLane(x)) out.push({ c: x, r: y }); }
    if (type === "rook") {
      for (i = 0; i < CFG.cols; i++) add(i, r);
      for (i = 0; i < R; i++) add(c, i);      // sa colonne (jamais dans le couloir ici, mais c'est la règle)
    } else if (type === "bishop") {
      for (i = 1; i < 8; i++) { add(c + i, r + i); add(c + i, r - i); add(c - i, r + i); add(c - i, r - i); }
    } else {
      [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(function (d) { add(c + d[0], r + d[1]); });
    }
    RANGE_CACHE[key] = out;
    return out;
  }
  // toutes les cases que la forme atteint (pour l'affichage, couloir ou pas)
  function shapeCells(type, c, r) {
    var out = [], i, R = CFG.rows, C = CFG.cols;
    function add(x, y) { if (x >= 0 && x < C && y >= 0 && y < R && !(x === c && y === r)) out.push({ c: x, r: y, lane: isLane(x) }); }
    if (type === "rook") { for (i = 0; i < C; i++) add(i, r); for (i = 0; i < R; i++) add(c, i); }
    else if (type === "bishop") { for (i = 1; i < 8; i++) { add(c + i, r + i); add(c + i, r - i); add(c - i, r + i); add(c - i, r - i); } }
    else [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(function (d) { add(c + d[0], r + d[1]); });
    return out;
  }

  /* ====================== MONDE ====================== */
  function createWorld(opts) {
    opts = opts || {};
    var w = {
      t: 0, state: "prep", wave: 1, kingHp: CFG.kingHp, score: 0,
      grid: [], enemies: [], shots: [], queue: [], spawnT: 0, waveTotal: 0, waveLeaked: 0,
      players: [mkPlayer(0), mkPlayer(1)],
      coop: 0, coopChain: 0, coopChainT: 0, freeze: 0,
      events: [], nextId: 1, rng: opts.rng || Math.random,
      stats: { kills: 0, fusions: 0, coop: 0, summons: 0, bestLevel: 1, leaked: 0, powers: 0 },
    };
    for (var c = 0; c < CFG.cols; c++) { w.grid.push([]); for (var r = 0; r < CFG.rows; r++) w.grid[c].push(null); }
    CFG.startPieces.forEach(function (s) { place(w, ownerOfCol(s.c), s.c, s.r, s.type, 1); });
    return w;
  }
  function mkPlayer(i) {
    return { i: i, mana: CFG.startMana, upg: { rook: 0, bishop: 0, knight: 0 }, power: null, rainbow: false, bag: [], kills: 0, dmg: 0 };
  }
  function emit(w, k, o) { o = o || {}; o.k = k; w.events.push(o); }
  function place(w, p, c, r, type, lvl) {
    var pc = { id: w.nextId++, type: type, lvl: lvl, owner: p, c: c, r: r, cd: 0.35, shots: 0 };
    w.grid[c][r] = pc;
    return pc;
  }
  function pieceAt(w, c, r) { return c >= 0 && c < CFG.cols && r >= 0 && r < CFG.rows ? w.grid[c][r] : null; }
  function countPieces(w, p) { var n = 0; CFG.zones[p].forEach(function (c) { for (var r = 0; r < CFG.rows; r++) if (w.grid[c][r]) n++; }); return n; }
  function zoneSize(p) { return CFG.zones[p].length * CFG.rows; }

  // tirage « sac » : chaque type sort aussi souvent que les autres sur la durée (pas de longue malchance)
  function drawType(w, p) {
    var pl = w.players[p];
    if (!pl.bag.length) { pl.bag = TYPES.concat(TYPES); for (var i = pl.bag.length - 1; i > 0; i--) { var j = Math.floor(w.rng() * (i + 1)); var t = pl.bag[i]; pl.bag[i] = pl.bag[j]; pl.bag[j] = t; } }
    return pl.bag.pop();
  }

  /* ====================== INVOCATION ====================== */
  // renvoie "ok" | "zone" | "occupied" | "mana" | "over"
  function summon(w, p, c, r) {
    if (w.state === "over") return "over";
    if (!inZone(p, c, r)) return "zone";
    if (w.grid[c][r]) return "occupied";
    var pl = w.players[p];
    if (pl.mana < CFG.summonCost) return "mana";
    pl.mana -= CFG.summonCost;
    var pc = place(w, p, c, r, drawType(w, p), 1);
    w.stats.summons++;
    emit(w, "summon", { p: p, piece: pc });
    return "ok";
  }

  /* ====================== FUSION ====================== */
  function canFuse(w, p, a, b, rainbow) {
    if (!a || !b || a === b) return false;
    if (a.owner !== p || b.owner !== p) return false;
    if (a.lvl !== b.lvl || a.lvl >= CFG.maxLevel) return false;
    if (!rainbow && a.type !== b.type) return false;
    return w.grid[a.c][a.r] === a && w.grid[b.c][b.r] === b;
  }
  // a rejoint b : le résultat apparaît sur la case de b
  function fuse(w, p, a, b, rainbow) {
    if (w.state === "over") return null;
    var pl = w.players[p];
    var useRainbow = !!(rainbow && pl.rainbow && a.type !== b.type);
    if (!canFuse(w, p, a, b, useRainbow)) return null;
    if (useRainbow) { pl.rainbow = false; w.stats.powers++; }
    w.grid[a.c][a.r] = null;
    var lvl = a.lvl + 1;
    var pc = place(w, p, b.c, b.r, drawType(w, p), lvl);
    pc.cd = 0.55;   // le temps que la nouvelle pièce sorte de son nuage
    w.stats.fusions++;
    if (lvl > w.stats.bestLevel) w.stats.bestLevel = lvl;
    emit(w, "fuse", { p: p, from: { c: a.c, r: a.r, type: a.type, lvl: a.lvl }, into: { c: b.c, r: b.r, type: b.type, lvl: b.lvl }, piece: pc, rainbow: useRainbow });
    return pc;
  }

  /* ====================== AMÉLIORATIONS DE TYPE ====================== */
  function upgradeCost(w, p, type) { var l = w.players[p].upg[type]; return Math.round(CFG.upgrade.base * Math.pow(CFG.upgrade.grow, l)); }
  function upgrade(w, p, type) {
    if (w.state === "over" || TYPES.indexOf(type) < 0) return "over";
    var cost = upgradeCost(w, p, type), pl = w.players[p];
    if (pl.mana < cost) return "mana";
    pl.mana -= cost; pl.upg[type]++;
    emit(w, "upgrade", { p: p, type: type, lvl: pl.upg[type] });
    return "ok";
  }

  /* ====================== VAGUES ====================== */
  function startWave(w) {
    if (w.state !== "prep") return false;
    var d = waveDef(w.wave);
    w.state = "wave"; w.queue = d.list.slice(); w.spawnT = 0.4; w.waveTotal = d.list.length; w.waveLeaked = 0;
    w.waveInterval = d.interval; w.waveHp = d.hp; w.lastLane = -1; w.laneRun = 0;
    emit(w, "waveStart", { n: w.wave, total: w.waveTotal });
    return true;
  }
  function spawn(w, type) {
    var E = CFG.enemies[type], lanes = CFG.lanes;
    var lane = lanes[Math.floor(w.rng() * lanes.length)];
    if (lane === w.lastLane) { w.laneRun++; if (w.laneRun >= 2) { lane = lanes[(lanes.indexOf(lane) + 1 + Math.floor(w.rng() * 2)) % 3]; w.laneRun = 0; } }
    else w.laneRun = 0;
    if (type === "boss") lane = 3;
    w.lastLane = lane;
    var hp = Math.round(E.hp * w.waveHp);
    var e = { id: w.nextId++, type: type, c: lane, r: 0, hp: hp, maxHp: hp, stepDur: E.step, stepT: E.step, pending: 0,
      hitBy: [-99, -99], staggerT: 0, armor: E.armor, dmg: E.dmg, dead: false };
    w.enemies.push(e);
    emit(w, "spawn", { enemy: e });
  }
  function endWave(w) {
    w.state = "prep";
    var perfect = w.waveLeaked === 0;
    var gain = CFG.score.wave * w.wave + (perfect ? CFG.score.perfect * w.wave : 0);
    w.score += gain;
    w.players.forEach(function (pl) { pl.mana += CFG.waveMana; });
    addGauge(w, CFG.waveGauge);
    emit(w, "waveEnd", { n: w.wave, perfect: perfect, score: gain, mana: CFG.waveMana });
    w.wave++;
    w.shots = [];
  }

  /* ====================== POUVOIRS ====================== */
  function addGauge(w, n) {
    w.coop = Math.min(CFG.coopGauge, w.coop + n);
    if (w.coop < CFG.coopGauge) return;
    var given = false;
    w.players.forEach(function (pl) {
      if (pl.power || pl.rainbow) return;
      var kinds = ["grenade", "freeze", "rainbow"];
      pl.power = kinds[Math.floor(w.rng() * kinds.length)];
      given = true;
      emit(w, "powerGet", { p: pl.i, kind: pl.power });
    });
    if (given) w.coop = 0;
  }
  // arg : ligne visée pour la grenade
  function usePower(w, p, arg) {
    var pl = w.players[p];
    if (!pl.power || w.state === "over") return "none";
    var kind = pl.power;
    if (kind !== "rainbow" && w.state !== "wave") return "wait";   // grenade et gel : seulement pendant une vague
    if (kind === "grenade") {
      var row = Math.max(0, Math.min(CFG.rows - 1, arg == null ? 3 : arg));
      var dmg = Math.round(CFG.powers.grenade.dmg * (w.waveHp || hpMul(w.wave)));
      pl.power = null; w.stats.powers++;
      emit(w, "grenade", { p: p, r: row });
      w.enemies.slice().forEach(function (e) { if (!e.dead && Math.abs(e.r - row) <= 1) damage(w, e, dmg, p, "grenade"); });
      return "ok";
    }
    if (kind === "freeze") {
      pl.power = null; w.stats.powers++;
      w.freeze = CFG.powers.freeze.time;
      emit(w, "freeze", { p: p });
      return "ok";
    }
    if (kind === "rainbow") {
      pl.power = null; pl.rainbow = true;
      emit(w, "rainbow", { p: p });
      return "ok";
    }
    return "none";
  }

  /* ====================== COMBAT ====================== */
  function pieceDmg(w, pc) {
    var P = CFG.pieces[pc.type];
    return P.dmg * CFG.levelDmg[pc.lvl - 1] * (1 + CFG.upgrade.dmgPerLevel * w.players[pc.owner].upg[pc.type]);
  }
  function pieceCd(pc) { return CFG.pieces[pc.type].cd * CFG.levelCd[pc.lvl - 1]; }
  function progress(e) { return e.r + (1 - e.stepT / e.stepDur); }

  function findTarget(w, pc) {
    var cells = rangeCells(pc.type, pc.c, pc.r), best = null, bp = -1;
    for (var i = 0; i < w.enemies.length; i++) {
      var e = w.enemies[i];
      if (e.dead || e.hp - e.pending <= 0) continue;
      for (var k = 0; k < cells.length; k++) {
        if (cells[k].c === e.c && cells[k].r === e.r) {
          var pr = progress(e);
          if (pr > bp + 1e-6 || (Math.abs(pr - bp) < 1e-6 && e.hp < best.hp)) { bp = pr; best = e; }
          break;
        }
      }
    }
    return best;
  }

  function damage(w, e, amount, p, src) {
    if (e.dead) return;
    var dealt = Math.max(1, Math.round(amount - e.armor));
    e.hp -= dealt;
    if (p === 0 || p === 1) { e.hitBy[p] = w.t; w.players[p].dmg += dealt; }
    var kill = e.hp <= 0;
    emit(w, "hit", { enemy: e, dmg: dealt, p: p, src: src, kill: kill });
    if (kill) killEnemy(w, e, p);
  }
  function killEnemy(w, e, p) {
    e.dead = true; e.hp = 0;
    w.enemies.splice(w.enemies.indexOf(e), 1);
    w.stats.kills++;
    if (p === 0 || p === 1) w.players[p].kills++;
    var E = CFG.enemies[e.type];
    var pts = Math.round(E.score * (1 + 0.1 * (w.wave - 1)));
    w.score += pts;
    w.players.forEach(function (pl) { pl.mana += CFG.killMana; });
    var coop = w.t - e.hitBy[0] <= CFG.coopWindow && w.t - e.hitBy[1] <= CFG.coopWindow;
    emit(w, "kill", { enemy: e, p: p, score: pts, coop: coop });
    if (coop) {
      w.coopChain = w.coopChainT > 0 ? w.coopChain + 1 : 1;
      w.coopChainT = 3;
      var bonus = CFG.score.coop * w.coopChain;
      w.score += bonus;
      w.players.forEach(function (pl) { pl.mana += CFG.coopMana; });
      w.stats.coop++;
      emit(w, "combo", { enemy: e, chain: w.coopChain, score: bonus, mana: CFG.coopMana });
      addGauge(w, 1);
    }
  }

  function fire(w, pc, e) {
    var P = CFG.pieces[pc.type];
    var dist = Math.hypot(e.c - pc.c, (e.r + 0.5) - (pc.r + 0.5));
    var dur = pc.type === "knight" ? P.hop : Math.max(0.08, dist / P.speed);
    var dmg = pieceDmg(w, pc);
    var s = { id: w.nextId++, piece: pc.id, owner: pc.owner, type: pc.type, lvl: pc.lvl, from: { c: pc.c, r: pc.r }, target: e.id, t: 0, dur: dur, dmg: dmg };
    var expected = Math.max(1, Math.round(dmg - e.armor));
    e.pending += expected; s.expected = expected;
    w.shots.push(s);
    pc.shots++;
    emit(w, "fire", { piece: pc, shot: s, enemy: e });
  }

  function step(w, dt) {
    if (w.state === "over") return;
    w.t += dt;
    if (w.coopChainT > 0) w.coopChainT -= dt;
    // vague : apparitions
    if (w.state === "wave") {
      if (w.queue.length) {
        w.spawnT -= dt;
        if (w.spawnT <= 0) { spawn(w, w.queue.shift()); w.spawnT = w.waveInterval; }
      }
      if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt);
      var mul = w.freeze > 0 ? CFG.powers.freeze.mul : 1;
      // les ennemis avancent case par case
      for (var i = w.enemies.length - 1; i >= 0; i--) {
        var e = w.enemies[i];
        if (e.staggerT > 0) e.staggerT -= dt;
        e.stepT -= dt * mul;
        if (e.stepT <= 0) {
          e.r++; e.stepT += e.stepDur;
          if (e.r >= CFG.rows) { leak(w, e); if (w.state === "over") return; continue; }
          emit(w, "step", { enemy: e });
        }
      }
    }
    // tirs
    for (i = w.shots.length - 1; i >= 0; i--) {
      var s = w.shots[i];
      s.t += dt;
      if (s.t < s.dur) continue;
      w.shots.splice(i, 1);
      var tg = null;
      for (var k = 0; k < w.enemies.length; k++) if (w.enemies[k].id === s.target) { tg = w.enemies[k]; break; }
      if (!tg) continue;
      tg.pending = Math.max(0, tg.pending - s.expected);
      damage(w, tg, s.dmg, s.owner, s.type);
      if (s.type === "knight" && !tg.dead && tg.staggerT <= 0) {
        tg.stepT = Math.min(tg.stepDur * 1.5, tg.stepT + CFG.pieces.knight.stagger);
        tg.staggerT = 0.9;
      }
      if (w.state === "over") return;
    }
    // pièces
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) {
      var pc = w.grid[c][r];
      if (!pc) continue;
      if (pc.cd > 0) pc.cd -= dt;
      if (pc.cd > 0 || w.state !== "wave") continue;
      var t = findTarget(w, pc);
      if (t) { fire(w, pc, t); pc.cd += pieceCd(pc); if (pc.cd < 0) pc.cd = 0; }
      else pc.cd = 0;
    }
    if (w.state === "wave" && !w.queue.length && !w.enemies.length) endWave(w);
  }

  function leak(w, e) {
    e.dead = true;
    w.enemies.splice(w.enemies.indexOf(e), 1);
    w.kingHp = Math.max(0, w.kingHp - e.dmg);
    w.waveLeaked++; w.stats.leaked++;
    emit(w, "leak", { enemy: e, dmg: e.dmg, hp: w.kingHp });
    if (w.kingHp <= 0) { w.state = "over"; w.shots = []; emit(w, "over", { wave: w.wave, score: w.score }); }
  }

  var api = {
    CFG: CFG, TYPES: TYPES, waveDef: waveDef, hpMul: hpMul,
    createWorld: createWorld, step: step, summon: summon, fuse: fuse, canFuse: canFuse,
    startWave: startWave, upgrade: upgrade, upgradeCost: upgradeCost, usePower: usePower,
    pieceAt: pieceAt, inZone: inZone, isLane: isLane, ownerOfCol: ownerOfCol, countPieces: countPieces, zoneSize: zoneSize,
    rangeCells: rangeCells, shapeCells: shapeCells, pieceDmg: pieceDmg, findTarget: findTarget, pieceCd: pieceCd, progress: progress,
  };
  root.KD_CORE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
