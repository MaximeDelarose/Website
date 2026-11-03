/* =========================================================================
   King Dice — moteur (aucun DOM, testable dans Node)
   const K = require("./js/kingdice-core.js"); const w = K.createWorld({ mode: "coop" });
   K.summon(w, 0, 1, 2); K.launch(w, 0); K.step(w, 1 / 60);

   Plateau 7 × 7 : colonnes 0-1 = joueur 1, 2-4 = couloir des ennemis,
   5-6 = joueur 2. Les ennemis descendent du haut (ligne 0) vers le roi.
   Les pièces attaquent selon leur forme aux échecs.

   Deux modes, même moteur :
   - "coop"   : un roi commun, vagues communes, combos coop, jauge de pouvoirs commune.
   - "versus" : chacun son roi (w.kings). Chaque vague envoie les mêmes ennemis à chacun
                (e.target = le joueur qu'ils attaquent) ; on ne tire que sur ses propres
                ennemis, et on peut envoyer des ennemis chez l'adversaire contre du mana.
                Le dernier roi debout gagne.

   Le moteur ne fait que les règles. Tout ce qui se voit ou s'entend vient des
   événements de w.events (vidés par le rendu). snapshot() / applySnapshot()
   servent au jeu en ligne : l'hôte simule, l'invité reflète.
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
    killMana: 1,                      // coop : pour CHAQUE joueur ; versus : pour le joueur visé
    waveMana: 3,                      // pour chaque joueur, en fin de vague
    coopMana: 1,                      // bonus d'un combo coop, pour chacun
    coopWindow: 2,                    // secondes : touché par les deux joueurs dans cet intervalle
    maxLevel: 4,
    startPieces: [{ c: 0, r: 3, type: "rook" }, { c: 6, r: 3, type: "rook" }],
    // dégâts par coup, temps entre deux tirs (s), vitesse du projectile (cases/s)
    pieces: {
      rook:   { name: "Tour",     dmg: 8,   cd: 0.48, speed: 13 },
      bishop: { name: "Fou",      dmg: 10,  cd: 0.8,  speed: 8 },
      knight: { name: "Cavalier", dmg: 27,  cd: 1.3,  hop: 0.3, stagger: 0.35 },   // le coup de sabot retarde le pas suivant
      pawn:   { name: "Pion",     dmg: 5,   cd: 0.32, speed: 15 },                 // petite portée devant lui, tirs très rapides
      queen:  { name: "Dame",     dmg: 14,  cd: 0.7,  speed: 11 },                 // ligne + diagonales, n'apparaît que par fusion
    },
    summonTypes: ["rook", "bishop", "knight", "pawn"],
    fuseTypes: ["rook", "bishop", "knight", "pawn", "queen"],
    armorMin: 0.25,                   // l'armure ne retire jamais plus de 75 % d'un coup
    levelDmg: [1, 2.3, 4.8, 9],       // multiplicateur de dégâts par niveau (1 → 4)
    levelCd:  [1, 0.93, 0.86, 0.78],  // multiplicateur du temps entre deux tirs
    // renforcer un type de pièce (mana) : +dégâts pour toutes les pièces de ce type du joueur
    upgrade: { base: 6, grow: 1.4, dmgPerLevel: 0.12 },   // prix = base × grow^niveau, sans limite
    enemies: {
      normal:  { name: "Pionnet",       hp: 26,  step: 2.0,  dmg: 1, armor: 0, score: 10 },
      fast:    { name: "Filou",         hp: 16,  step: 1.05, dmg: 1, armor: 0, score: 12 },
      armored: { name: "Cabosse",       hp: 70,  step: 2.8,  dmg: 1, armor: 4, score: 20 },
      boss:    { name: "Gros Pionnet",  hp: 520, step: 3.3,  dmg: 3, armor: 3, score: 200 },
    },
    // jauge de pouvoirs (coop : commune ; versus : une par joueur, remplie par les éliminations)
    coopGauge: 14,
    waveGauge: 2,                     // coop : +2 à la jauge à chaque vague terminée
    powers: {
      meteor:    { name: "Météore",       dmg: 70, push: 1 },                // × la santé de la vague, 3 lignes, repousse d'une case
      freeze:    { name: "Gel",           time: 6, mul: 0.35, brittle: 1.3 }, // ralentit et fragilise (+30 % de dégâts)
      lightning: { name: "Foudre",        dmg: 95, count: 6 },               // frappe les 6 ennemis les plus avancés
      heal:      { name: "Soin",          hp: 2 },                           // +2 PV au roi
      frenzy:    { name: "Furie",         time: 8, coopTime: 6 },            // les pièces tirent 2× plus vite
      rainbow:   { name: "Arc-en-ciel" },                                    // fusion libre entre 2 pièces de même niveau
    },
    powerWeights: { meteor: 3, freeze: 3, lightning: 3, heal: 2, frenzy: 3, rainbow: 2 },
    score: { wave: 40, coop: 30, perfect: 60 },
    versus: {
      hpMul: 0.6,                     // santé des ennemis (un seul joueur par camp)
      countMul: 0.62,                 // nombre d'ennemis par vague
      gauge: 16,                      // éliminations pour gagner un pouvoir
      waveGauge: 3,
      prep: 18,                       // secondes de préparation avant la vague (ou quand les deux sont prêts)
      firstPrep: 30,
      send: { normal: 3, fast: 4, armored: 6 },   // coût (mana) pour envoyer un ennemi à l'adversaire
      sendCd: 1.3,
      sendRefund: 2,                  // mana rendu à l'envoyeur si son ennemi atteint le roi
      sendHp: 0.9,
    },
  };

  // composition des vagues : centralisée et lisible
  function hpMul(n) { var k = n - 1; return (1 + 0.4 * k + 0.035 * k * k) * Math.pow(1.05, Math.max(0, n - 6)); }
  function waveDef(n, mode) {
    var count = Math.min(32, 5 + Math.floor(n * 1.4));
    if (mode === "versus") count = Math.max(4, Math.round(count * CFG.versus.countMul));
    var fastShare = n < 3 ? 0 : Math.min(0.32, 0.12 + (n - 3) * 0.025);
    var armShare = n < 5 ? 0 : Math.min(0.28, 0.1 + (n - 5) * 0.02);
    var nf = Math.round(count * fastShare), na = Math.round(count * armShare);
    if (n === 3) nf = Math.max(nf, 2);
    if (n === 5) na = Math.max(na, 2);
    var list = [], i;
    for (i = 0; i < count - nf - na; i++) list.push("normal");
    for (i = 0; i < nf; i++) list.push("fast");
    for (i = 0; i < na; i++) list.push("armored");
    // mélange reproductible (même vague = même ordre), les premiers sont toujours des normaux
    var rng = seeded(n * 7919 + 13);
    for (i = list.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    for (i = 0; i < Math.min(2, list.length); i++) if (list[i] !== "normal") { var k = list.indexOf("normal", 2); if (k > 0) { list[k] = list[i]; list[i] = "normal"; } }
    if (n % 10 === 0) list.push("boss");
    return { n: n, list: list, interval: Math.max(0.62, 1.65 - n * 0.04), hp: hpMul(n) * (mode === "versus" ? CFG.versus.hpMul : 1) };
  }
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* ====================== OUTILS ====================== */
  var TYPES = CFG.fuseTypes;
  function inZone(p, c, r) { return r >= 0 && r < CFG.rows && CFG.zones[p].indexOf(c) >= 0; }
  function isLane(c) { return CFG.lanes.indexOf(c) >= 0; }
  function ownerOfCol(c) { return CFG.zones[0].indexOf(c) >= 0 ? 0 : CFG.zones[1].indexOf(c) >= 0 ? 1 : -1; }
  function dirOf(owner) { return owner === 0 ? 1 : -1; }   // vers le couloir

  // toutes les cases que la forme atteint (pour l'affichage), couloir ou pas
  function shapeCells(type, c, r, dir) {
    var out = [], i, R = CFG.rows, C = CFG.cols;
    function add(x, y) { if (x >= 0 && x < C && y >= 0 && y < R && !(x === c && y === r)) out.push({ c: x, r: y, lane: isLane(x) }); }
    function rook() { for (i = 0; i < C; i++) add(i, r); for (i = 0; i < R; i++) add(c, i); }
    function bishop() { for (i = 1; i < 8; i++) { add(c + i, r + i); add(c + i, r - i); add(c - i, r + i); add(c - i, r - i); } }
    if (type === "rook") rook();
    else if (type === "bishop") bishop();
    else if (type === "queen") { rook(); bishop(); }
    else if (type === "pawn") [[1, -1], [1, 0], [1, 1], [2, 0]].forEach(function (d) { add(c + d[0] * dir, r + d[1]); });
    else [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(function (d) { add(c + d[0], r + d[1]); });
    return out;
  }
  // cases du couloir couvertes par une pièce posée en (c, r)
  var RANGE_CACHE = {};
  function rangeCells(type, c, r, dir) {
    var key = type + c + "," + r + (dir > 0 ? "+" : "-");
    if (RANGE_CACHE[key]) return RANGE_CACHE[key];
    return (RANGE_CACHE[key] = shapeCells(type, c, r, dir).filter(function (x) { return x.lane; }));
  }

  /* ====================== MONDE ====================== */
  function createWorld(opts) {
    opts = opts || {};
    var mode = opts.mode === "versus" ? "versus" : "coop";
    var w = {
      mode: mode, t: 0, state: "prep", wave: 1, kingHp: CFG.kingHp, kings: [CFG.kingHp, CFG.kingHp], score: 0, winner: -1,
      grid: [], enemies: [], shots: [], queue: [], spawnT: 0, waveTotal: 0, waveLeaked: 0,
      players: [mkPlayer(0), mkPlayer(1)],
      coop: 0, coopChain: 0, coopChainT: 0, freeze: [0, 0], frenzy: [0, 0],
      ready: [false, false], prepT: mode === "versus" ? CFG.versus.firstPrep : 0,
      events: [], later: [], nextId: 1, rng: opts.rng || Math.random, lastLane: [-1, -1], laneRun: [0, 0],
      stats: { kills: 0, fusions: 0, coop: 0, summons: 0, bestLevel: 1, leaked: 0, powers: 0, sent: 0 },
    };
    for (var c = 0; c < CFG.cols; c++) { w.grid.push([]); for (var r = 0; r < CFG.rows; r++) w.grid[c].push(null); }
    CFG.startPieces.forEach(function (s) { place(w, ownerOfCol(s.c), s.c, s.r, s.type, 1); });
    return w;
  }
  function mkPlayer(i) {
    var upg = {}; TYPES.forEach(function (t) { upg[t] = 0; });
    return { i: i, mana: CFG.startMana, upg: upg, power: null, rainbow: false, bag: [], fbag: [], kills: 0, dmg: 0, gauge: 0, score: 0, sendCd: 0 };
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
  function kingOf(w, p) { return w.mode === "versus" ? w.kings[p] : w.kingHp; }

  // tirage « sac » : chaque type sort aussi souvent que les autres sur la durée (pas de longue malchance)
  function shuffle(w, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(w.rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function drawType(w, p, fusion) {
    var pl = w.players[p], key = fusion ? "fbag" : "bag";
    if (!pl[key].length) pl[key] = shuffle(w, (fusion ? CFG.fuseTypes : CFG.summonTypes).concat(fusion ? CFG.fuseTypes.slice(0, 4) : CFG.summonTypes));
    return pl[key].pop();
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
    var pc = place(w, p, c, r, drawType(w, p, false), 1);
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
    var useRainbow = !!(rainbow && pl.rainbow && a && b && a.type !== b.type);
    if (!canFuse(w, p, a, b, useRainbow)) return null;
    if (useRainbow) { pl.rainbow = false; w.stats.powers++; }
    w.grid[a.c][a.r] = null;
    var lvl = a.lvl + 1;
    var pc = place(w, p, b.c, b.r, drawType(w, p, true), lvl);
    pc.cd = 0.55;   // le temps que la nouvelle pièce sorte de son nuage
    w.stats.fusions++;
    if (lvl > w.stats.bestLevel) w.stats.bestLevel = lvl;
    emit(w, "fuse", { p: p, from: { c: a.c, r: a.r, type: a.type, lvl: a.lvl }, into: { c: b.c, r: b.r, type: b.type, lvl: b.lvl }, piece: pc, rainbow: useRainbow });
    return pc;
  }

  /* ====================== AMÉLIORATIONS DE TYPE ====================== */
  function upgradeCost(w, p, type) { var l = w.players[p].upg[type] || 0; return Math.round(CFG.upgrade.base * Math.pow(CFG.upgrade.grow, l)); }
  function upgrade(w, p, type) {
    if (w.state === "over" || TYPES.indexOf(type) < 0) return "over";
    var cost = upgradeCost(w, p, type), pl = w.players[p];
    if (pl.mana < cost) return "mana";
    pl.mana -= cost; pl.upg[type]++;
    emit(w, "upgrade", { p: p, type: type, lvl: pl.upg[type] });
    return "ok";
  }

  /* ====================== VAGUES ====================== */
  // coop : n'importe qui lance ; versus : chacun se déclare prêt, la vague part quand les deux le sont (ou au bout du temps)
  function launch(w, p) {
    if (w.state !== "prep") return false;
    if (w.mode === "coop") return startWave(w);
    if (w.ready[p]) return false;
    w.ready[p] = true; emit(w, "ready", { p: p });
    if (w.ready[0] && w.ready[1]) startWave(w);
    return true;
  }
  function startWave(w) {
    if (w.state !== "prep") return false;
    var d = waveDef(w.wave, w.mode);
    w.state = "wave"; w.queue = d.list.slice(); w.spawnT = 0.4; w.waveTotal = d.list.length * (w.mode === "versus" ? 2 : 1); w.waveLeaked = 0;
    w.waveInterval = d.interval; w.waveHp = d.hp; w.ready = [false, false];
    emit(w, "waveStart", { n: w.wave, total: w.waveTotal });
    return true;
  }
  function spawn(w, type, target, sentBy) {
    var E = CFG.enemies[type], lanes = CFG.lanes, tg = target || 0;
    var lane = lanes[Math.floor(w.rng() * lanes.length)];
    if (lane === w.lastLane[tg]) { w.laneRun[tg]++; if (w.laneRun[tg] >= 2) { lane = lanes[(lanes.indexOf(lane) + 1 + Math.floor(w.rng() * 2)) % 3]; w.laneRun[tg] = 0; } }
    else w.laneRun[tg] = 0;
    if (type === "boss" && w.mode === "coop") lane = 3;
    w.lastLane[tg] = lane;
    var hp = Math.round(E.hp * w.waveHp * (sentBy != null ? CFG.versus.sendHp : 1));
    var e = { id: w.nextId++, type: type, c: lane, r: 0, hp: hp, maxHp: hp, stepDur: E.step, stepT: E.step, pending: 0,
      hitBy: [-99, -99], staggerT: 0, armor: E.armor, dmg: E.dmg, dead: false, target: w.mode === "versus" ? tg : -1, sentBy: sentBy == null ? -1 : sentBy };
    w.enemies.push(e);
    emit(w, "spawn", { enemy: e });
    return e;
  }
  function endWave(w) {
    w.state = "prep";
    var perfect = w.waveLeaked === 0, gain = 0;
    if (w.mode === "coop") {
      gain = CFG.score.wave * w.wave + (perfect ? CFG.score.perfect * w.wave : 0);
      w.score += gain;
      addGauge(w, CFG.waveGauge);
    } else {
      w.prepT = CFG.versus.prep; w.ready = [false, false];
      w.players.forEach(function (pl) { addGauge(w, CFG.versus.waveGauge, pl.i); });
    }
    w.players.forEach(function (pl) { pl.mana += CFG.waveMana; });
    emit(w, "waveEnd", { n: w.wave, perfect: perfect, score: gain, mana: CFG.waveMana });
    w.wave++;
    w.shots = [];
  }

  /* ====================== ENVOYER DES ENNEMIS (versus) ====================== */
  function send(w, p, type) {
    if (w.mode !== "versus" || w.state !== "wave") return "wait";
    var cost = CFG.versus.send[type], pl = w.players[p];
    if (cost == null) return "over";
    if (pl.sendCd > 0) return "cd";
    if (pl.mana < cost) return "mana";
    pl.mana -= cost; pl.sendCd = CFG.versus.sendCd; w.stats.sent++;
    var e = spawn(w, type, 1 - p, p);
    emit(w, "send", { p: p, enemy: e });
    return "ok";
  }

  /* ====================== POUVOIRS ====================== */
  function addGauge(w, n, p) {
    if (w.mode === "versus") {
      var pl = w.players[p]; if (!pl) return;
      pl.gauge = Math.min(CFG.versus.gauge, pl.gauge + n);
      if (pl.gauge >= CFG.versus.gauge && !pl.power && !pl.rainbow) { givePower(w, p); pl.gauge = 0; }
      return;
    }
    w.coop = Math.min(CFG.coopGauge, w.coop + n);
    if (w.coop < CFG.coopGauge) return;
    var given = false;
    w.players.forEach(function (q) { if (!q.power && !q.rainbow) { givePower(w, q.i); given = true; } });
    if (given) w.coop = 0;
  }
  function givePower(w, p) {
    var pl = w.players[p], bag = [];
    Object.keys(CFG.powerWeights).forEach(function (k) {
      if (k === "heal" && kingOf(w, p) >= CFG.kingHp) return;
      for (var i = 0; i < CFG.powerWeights[k]; i++) bag.push(k);
    });
    pl.power = bag[Math.floor(w.rng() * bag.length)];
    emit(w, "powerGet", { p: p, kind: pl.power });
  }
  function mine(w, p, e) { return w.mode === "coop" || e.target === p; }
  // arg : ligne visée pour le météore
  function usePower(w, p, arg) {
    var pl = w.players[p];
    if (!pl.power || w.state === "over") return "none";
    var kind = pl.power, P = CFG.powers[kind];
    var needWave = kind !== "rainbow" && kind !== "heal";
    if (needWave && w.state !== "wave") return "wait";
    var vs = w.mode === "versus";
    if (kind === "meteor") {
      var row = Math.max(0, Math.min(CFG.rows - 1, arg == null ? 3 : arg));
      var dmg = Math.round(P.dmg * (w.waveHp || hpMul(w.wave)));
      pl.power = null; w.stats.powers++;
      emit(w, "meteorCall", { p: p, r: row });            // le rocher tombe ; les dégâts arrivent à l'impact
      w.later.push({ at: w.t + 0.42, kind: "meteor", p: p, row: row, dmg: dmg });
      return "ok";
    }
    if (kind === "freeze") {
      pl.power = null; w.stats.powers++;
      if (vs) w.freeze[p] = P.time; else w.freeze = [P.time, P.time];
      emit(w, "freeze", { p: p });
      return "ok";
    }
    if (kind === "lightning") {
      pl.power = null; w.stats.powers++;
      var list = w.enemies.filter(function (e) { return !e.dead && mine(w, p, e); }).sort(function (a, b) { return progress(b) - progress(a); }).slice(0, P.count);
      var dm = Math.round(P.dmg * (w.waveHp || hpMul(w.wave)));
      emit(w, "lightning", { p: p, ids: list.map(function (e) { return e.id; }) });
      list.forEach(function (e) { damage(w, e, dm, p, "lightning"); });
      return "ok";
    }
    if (kind === "heal") {
      if (kingOf(w, p) >= CFG.kingHp) return "full";
      pl.power = null; w.stats.powers++;
      if (vs) w.kings[p] = Math.min(CFG.kingHp, w.kings[p] + P.hp); else w.kingHp = Math.min(CFG.kingHp, w.kingHp + P.hp);
      emit(w, "heal", { p: p, hp: kingOf(w, p) });
      return "ok";
    }
    if (kind === "frenzy") {
      pl.power = null; w.stats.powers++;
      if (vs) w.frenzy[p] = P.time; else w.frenzy = [P.coopTime, P.coopTime];
      emit(w, "frenzy", { p: p });
      return "ok";
    }
    if (kind === "rainbow") {
      pl.power = null; pl.rainbow = true;
      emit(w, "rainbow", { p: p });
      return "ok";
    }
    return "none";
  }

  function meteorHit(w, L) {
    var P = CFG.powers.meteor;
    emit(w, "meteor", { p: L.p, r: L.row });
    w.enemies.slice().forEach(function (e) {
      if (e.dead || !mine(w, L.p, e) || Math.abs(e.r - L.row) > 1) return;
      damage(w, e, L.dmg, L.p, "meteor");
      if (!e.dead && e.r > 0) { e.r -= P.push; e.stepT = e.stepDur; emit(w, "push", { enemy: e }); }
    });
  }

  /* ====================== COMBAT ====================== */
  function pieceDmg(w, pc) {
    var P = CFG.pieces[pc.type];
    return P.dmg * CFG.levelDmg[pc.lvl - 1] * (1 + CFG.upgrade.dmgPerLevel * w.players[pc.owner].upg[pc.type]);
  }
  function pieceCd(pc) { return CFG.pieces[pc.type].cd * CFG.levelCd[pc.lvl - 1]; }
  function progress(e) { return e.r + (1 - e.stepT / e.stepDur); }

  function findTarget(w, pc) {
    var cells = rangeCells(pc.type, pc.c, pc.r, dirOf(pc.owner)), best = null, bp = -1, vs = w.mode === "versus";
    for (var i = 0; i < w.enemies.length; i++) {
      var e = w.enemies[i];
      if (e.dead || e.hp - e.pending <= 0) continue;
      if (vs && e.target !== pc.owner) continue;
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
    var fz = w.freeze[e.target > 0 ? e.target : 0] > 0 ? CFG.powers.freeze.brittle : 1;
    var a = amount * fz;
    var dealt = Math.max(1, Math.round(Math.max(a * CFG.armorMin, a - e.armor)));
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
    if (w.mode === "versus") {
      var o = w.players[e.target];
      o.score += pts; o.mana += CFG.killMana;
      emit(w, "kill", { enemy: e, p: p, score: pts, coop: false, owner: e.target });
      addGauge(w, 1, e.target);
      return;
    }
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
    var expected = Math.max(1, Math.round(Math.max(dmg * CFG.armorMin, dmg - e.armor)));
    e.pending += expected; s.expected = expected;
    w.shots.push(s);
    pc.shots++;
    emit(w, "fire", { piece: pc, shot: s, enemy: e });
  }

  function step(w, dt) {
    if (w.state === "over") return;
    w.t += dt;
    var i, k, c, r;
    if (w.coopChainT > 0) w.coopChainT -= dt;
    for (i = 0; i < 2; i++) {
      if (w.freeze[i] > 0) w.freeze[i] = Math.max(0, w.freeze[i] - dt);
      if (w.frenzy[i] > 0) w.frenzy[i] = Math.max(0, w.frenzy[i] - dt);
      if (w.players[i].sendCd > 0) w.players[i].sendCd = Math.max(0, w.players[i].sendCd - dt);
    }
    for (i = w.later.length - 1; i >= 0; i--) if (w.t >= w.later[i].at) { var L = w.later.splice(i, 1)[0]; meteorHit(w, L); }
    // versus : préparation chronométrée
    if (w.mode === "versus" && w.state === "prep") {
      w.prepT -= dt;
      if (w.prepT <= 0) startWave(w);
    }
    // vague : apparitions
    if (w.state === "wave") {
      if (w.queue.length) {
        w.spawnT -= dt;
        if (w.spawnT <= 0) {
          var type = w.queue.shift();
          if (w.mode === "versus") { spawn(w, type, 0); spawn(w, type, 1); } else spawn(w, type, 0);
          w.spawnT = w.waveInterval;
        }
      }
      // les ennemis avancent case par case
      for (i = w.enemies.length - 1; i >= 0; i--) {
        var e = w.enemies[i];
        if (e.staggerT > 0) e.staggerT -= dt;
        var mul = w.freeze[e.target > 0 ? e.target : 0] > 0 ? CFG.powers.freeze.mul : 1;
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
      for (k = 0; k < w.enemies.length; k++) if (w.enemies[k].id === s.target) { tg = w.enemies[k]; break; }
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
    for (c = 0; c < CFG.cols; c++) for (r = 0; r < CFG.rows; r++) {
      var pc = w.grid[c][r];
      if (!pc) continue;
      var fm = w.frenzy[pc.owner] > 0 ? 2 : 1;
      if (pc.cd > 0) pc.cd -= dt * fm;
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
    w.waveLeaked++; w.stats.leaked++;
    if (w.mode === "versus") {
      var p = e.target;
      w.kings[p] = Math.max(0, w.kings[p] - e.dmg);
      if (e.sentBy >= 0) { w.players[e.sentBy].mana += CFG.versus.sendRefund; emit(w, "refund", { p: e.sentBy, mana: CFG.versus.sendRefund }); }
      emit(w, "leak", { enemy: e, dmg: e.dmg, hp: w.kings[p], p: p });
      if (w.kings[p] <= 0) { w.state = "over"; w.winner = 1 - p; w.shots = []; emit(w, "over", { wave: w.wave, score: w.score, winner: w.winner }); }
      return;
    }
    w.kingHp = Math.max(0, w.kingHp - e.dmg);
    emit(w, "leak", { enemy: e, dmg: e.dmg, hp: w.kingHp, p: -1 });
    if (w.kingHp <= 0) { w.state = "over"; w.shots = []; emit(w, "over", { wave: w.wave, score: w.score, winner: -1 }); }
  }

  /* ====================== RÉSEAU : instantanés ====================== */
  function r2(n) { return Math.round(n * 100) / 100; }
  function snapshot(w) {
    var pcs = [], ens = [];
    for (var c = 0; c < CFG.cols; c++) for (var r = 0; r < CFG.rows; r++) { var p = w.grid[c][r]; if (p) pcs.push([p.id, p.type, p.lvl, p.owner, p.c, p.r, r2(p.cd)]); }
    w.enemies.forEach(function (e) { ens.push([e.id, e.type, e.c, e.r, Math.round(e.hp), e.maxHp, r2(e.stepT), e.stepDur, e.target, e.armor, e.dmg, e.sentBy]); });
    return {
      t: r2(w.t), st: w.state, wv: w.wave, kh: w.kingHp, ks: w.kings, sc: w.score, cp: w.coop, fz: w.freeze.map(r2), fr: w.frenzy.map(r2),
      wt: w.waveTotal, ql: w.queue.length, rd: w.ready, pt: r2(w.prepT), win: w.winner, ni: w.nextId, wi: w.waveInterval, wh: w.waveHp,
      pl: w.players.map(function (q) { return [Math.round(q.mana), TYPES.map(function (t) { return q.upg[t]; }), q.power, q.rainbow ? 1 : 0, q.kills, q.gauge, q.score, r2(q.sendCd), q.dmg]; }),
      pc: pcs, en: ens, stt: w.stats,
    };
  }
  function applySnapshot(w, s) {
    w.t = s.t; w.state = s.st; w.wave = s.wv; w.kingHp = s.kh; w.kings = s.ks.slice(); w.score = s.sc; w.coop = s.cp;
    w.freeze = s.fz.slice(); w.frenzy = s.fr.slice(); w.waveTotal = s.wt; w.ready = s.rd.slice(); w.prepT = s.pt; w.winner = s.win; w.nextId = s.ni;
    w.waveInterval = s.wi; w.waveHp = s.wh; w.stats = s.stt;
    w.queue = new Array(s.ql);
    s.pl.forEach(function (a, i) {
      var q = w.players[i]; q.mana = a[0]; TYPES.forEach(function (t, j) { q.upg[t] = a[1][j] || 0; });
      q.power = a[2]; q.rainbow = !!a[3]; q.kills = a[4]; q.gauge = a[5]; q.score = a[6]; q.sendCd = a[7]; q.dmg = a[8];
    });
    var c, r;
    for (c = 0; c < CFG.cols; c++) for (r = 0; r < CFG.rows; r++) w.grid[c][r] = null;
    s.pc.forEach(function (a) { w.grid[a[4]][a[5]] = { id: a[0], type: a[1], lvl: a[2], owner: a[3], c: a[4], r: a[5], cd: a[6], shots: 0 }; });
    var old = {}; w.enemies.forEach(function (e) { old[e.id] = e; });
    w.enemies = s.en.map(function (a) {
      var e = old[a[0]] || { id: a[0], pending: 0, hitBy: [-99, -99], staggerT: 0, dead: false };
      e.type = a[1]; e.c = a[2]; e.r = a[3]; e.hp = a[4]; e.maxHp = a[5]; e.stepT = a[6]; e.stepDur = a[7]; e.target = a[8]; e.armor = a[9]; e.dmg = a[10]; e.sentBy = a[11];
      return e;
    });
  }

  var api = {
    CFG: CFG, TYPES: TYPES, waveDef: waveDef, hpMul: hpMul,
    createWorld: createWorld, step: step, summon: summon, fuse: fuse, canFuse: canFuse,
    launch: launch, startWave: startWave, upgrade: upgrade, upgradeCost: upgradeCost, usePower: usePower, send: send,
    pieceAt: pieceAt, inZone: inZone, isLane: isLane, ownerOfCol: ownerOfCol, dirOf: dirOf, countPieces: countPieces, zoneSize: zoneSize, kingOf: kingOf,
    rangeCells: rangeCells, shapeCells: shapeCells, pieceDmg: pieceDmg, pieceCd: pieceCd, progress: progress, findTarget: findTarget,
    snapshot: snapshot, applySnapshot: applySnapshot,
  };
  root.KD_CORE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
