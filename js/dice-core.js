/* =========================================================================
   Écureuil Dice — moteur de simulation (aucun accès au DOM)
   Un « monde » = un chemin + 1 ou 2 plateaux d'écureuils + les ennemis.
   Solo : 1 plateau. Coop : 2 plateaux autour du même chemin.
   Versus : chaque joueur a son propre monde (même graine = mêmes vagues).
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.RD_DATA, T = D.TYPES, C = D.CFG;
  var CELL = 26, COLS = 5, ROWS = 3, NSLOT = COLS * ROWS, BW = CELL * COLS, BH = CELL * ROWS;
  var EKEYS = Object.keys(D.ENEMIES), EIDX = {};
  EKEYS.forEach(function (k, i) { EIDX[k] = i; });
  var TIDX = {};
  D.ORDER.forEach(function (k, i) { TIDX[k] = i; });

  function rngOf(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, rnd) { return arr[Math.floor((rnd || Math.random)() * arr.length)]; }

  /* ---------- géométrie ---------- */
  function makePath(pts) {
    var segs = [], L = 0;
    for (var k = 0; k < pts.length - 1; k++) {
      var a = pts[k], b = pts[k + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a: a, b: b, len: len, at: L });
      L += len;
    }
    return { pts: pts, segs: segs, len: L };
  }
  // 1 plateau : le chemin fait le tour (monte à gauche, traverse en haut, descend à droite).
  // 2 plateaux (coop) : plateaux l'un au-dessus de l'autre ; une moitié des bestioles
  // descend à gauche, l'autre monte, elles se rejoignent au centre puis filent à droite.
  // Chaque plateau a ses commandes (cy) : sous le plateau du bas, au-dessus de celui du haut.
  var SOLO_LEN = 0;
  function layout(n) {
    var left = 10, right = 25 + BW + 15;
    if (n === 1) {
      var top = 24, by = 39, bottom = by + BH + 25;
      var p = makePath([[left, bottom], [left, top], [right, top], [right, bottom]]);
      return { w: right + 10, h: bottom + 50, paths: [p], len: p.len, spdMul: 1, boards: [{ x: 25, y: by, cy: by + BH + 7 }] };
    }
    var b0 = 80, mid = b0 + BH + 15, b1 = mid + 15, endX = right + 4;
    var pa = makePath([[left, b0 - 6], [left, mid], [endX, mid]]);
    var pb = makePath([[left, b1 + BH + 6], [left, mid], [endX, mid]]);
    return { w: right + 10, h: b1 + BH + 8 + 54 + 14, paths: [pa, pb], len: pa.len, spdMul: pa.len / SOLO_LEN, coop: true,
             boards: [{ x: 25, y: b0, cy: 18 }, { x: 25, y: b1, cy: b1 + BH + 8 }] };
  }
  SOLO_LEN = layout(1).len;
  function posAt(lay, dist, lane) {
    var segs = lay.paths[lane || 0].segs, s = segs[segs.length - 1];
    for (var i = 0; i < segs.length; i++) if (dist < segs[i].at + segs[i].len) { s = segs[i]; break; }
    var f = Math.max(0, Math.min(1, (dist - s.at) / s.len));
    return { x: s.a[0] + (s.b[0] - s.a[0]) * f, y: s.a[1] + (s.b[1] - s.a[1]) * f, dx: Math.sign(s.b[0] - s.a[0]), dy: Math.sign(s.b[1] - s.a[1]) };
  }
  function epos(w, e) { return posAt(w.lay, e.dist, e.lane); }
  function near(w, a, b, r) { var p = epos(w, a), q = epos(w, b); return Math.hypot(p.x - q.x, p.y - q.y) <= r; }
  function rangeOf(type) { var r = T[type].range; return r === undefined ? 100 : r; }
  function slotCenter(lay, bi, s) {
    var b = lay.boards[bi];
    return { x: b.x + (s % COLS) * CELL + CELL / 2, y: b.y + Math.floor(s / COLS) * CELL + CELL / 2 };
  }

  /* ---------- création ---------- */
  function makeBoard(info) {
    var deck = (info.deck || D.START_DECK).slice(0, 5);
    return { name: info.name || "Écureuil", id: info.id || "solo", deck: deck, cls: info.cls || {}, slots: new Array(NSLOT).fill(null),
             sp: C.startSp, sumN: 0, pu: [0, 0, 0, 0, 0], kills: 0, dmg: 0, bot: !!info.bot, botT: 1, maxPip: 1 };
  }
  function createWorld(opt) {
    var n = opt.boards.length;
    var w = {
      mode: opt.mode || "solo", lay: layout(n), boards: opt.boards.map(makeBoard),
      rng: rngOf(opt.seed || 1), t: 0, wave: 0, waveT: 0, nextWave: 3, spawnQ: [], lives: C.lives, over: false,
      enemies: [], emap: {}, projs: [], mines: [], nextId: 1, ev: [], fx: [], bossAlive: 0, bosses: 0, kills: 0,
      hpMul: n > 1 ? C.coopHp : 1, view: !!opt.view,
    };
    return w;
  }

  /* ---------- outils plateau ---------- */
  function classMul(b, type) { var lv = b.cls[type] || 1; return 1 + C.classBonus * (lv - 1); }
  function puOf(b, type) { var i = b.deck.indexOf(type); return i < 0 ? 0 : b.pu[i]; }
  function summonCost(b) { return C.summonBase + C.summonStep * b.sumN; }
  function puCost(b, i) { return b.pu[i] >= C.puCosts.length ? Infinity : C.puCosts[b.pu[i]]; }
  function freeSlots(b) { var out = []; for (var i = 0; i < NSLOT; i++) if (!b.slots[i]) out.push(i); return out; }
  function newSq(b, type, pips) {
    var sq = { t: type, p: pips, cd: Math.random() * 0.5, stun: 0, bob: 0, born: 0.25 };
    if (T[type].grow) sq.grow = T[type].grow - T[type].growPu * puOf(b, type);
    if (pips > b.maxPip) b.maxPip = pips;
    return sq;
  }
  function randomDeckType(b, not) {
    var list = b.deck.filter(function (k) { return k !== not; });
    return pick(list.length ? list : b.deck);
  }

  /* ---------- actions des joueurs ---------- */
  function summon(w, bi) {
    var b = w.boards[bi], cost = summonCost(b), free = freeSlots(b);
    if (w.over || !free.length || b.sp < cost) return false;
    b.sp -= cost; b.sumN++;
    var s = pick(free);
    b.slots[s] = newSq(b, pick(b.deck), 1);
    w.ev.push({ k: "summon", b: bi, s: s });
    return true;
  }
  function canMerge(b, a, c) {
    if (a === c || a < 0 || c < 0) return false;
    var A = b.slots[a], B = b.slots[c];
    if (!A || !B || A.p !== B.p) return false;
    if (A.t === "cameleon" && B.t !== "cameleon") return true;
    return A.t === B.t && A.p < C.maxPips;
  }
  function merge(w, bi, a, c) {
    var b = w.boards[bi];
    if (w.over || !canMerge(b, a, c)) return false;
    var A = b.slots[a], B = b.slots[c];
    if (A.t === "cameleon" && B.t !== "cameleon") {
      b.slots[a] = newSq(b, B.t, B.p);
      w.ev.push({ k: "copy", b: bi, s: a });
      return true;
    }
    b.slots[a] = null;
    b.slots[c] = newSq(b, pick(b.deck), A.p + 1);
    w.ev.push({ k: "merge", b: bi, s: c, p: A.p + 1 });
    return true;
  }
  function powerUp(w, bi, i) {
    var b = w.boards[bi], cost = puCost(b, i);
    if (w.over || b.sp < cost) return false;
    b.sp -= cost; b.pu[i]++;
    w.ev.push({ k: "pu", b: bi, i: i });
    return true;
  }
  function act(w, bi, cmd) {
    if (!cmd || !w.boards[bi]) return false;
    if (cmd.a === "sum") return summon(w, bi);
    if (cmd.a === "mg") return merge(w, bi, cmd.f | 0, cmd.t | 0);
    if (cmd.a === "pu") return powerUp(w, bi, cmd.i | 0);
    return false;
  }

  /* ---------- vagues ---------- */
  function waveHp(w, n) { return C.hpBase * Math.pow(C.hpGrowth, n - 1) * (1 + C.hpLin * (n - 1)) * w.hpMul; }
  function isBossWave(n) { return n % C.bossEvery === 0; }
  function startWave(w) {
    w.wave++; w.waveT = 0;
    var n = w.wave, rnd = w.rng, q = [];
    if (isBossWave(n)) {
      var boss = D.BOSSES[(n / C.bossEvery - 1) % D.BOSSES.length];
      q.push({ t: 1.5, type: boss });
      for (var e = 0; e < 4 + Math.floor(n / 5); e++) q.push({ t: 4 + e * 1.2, type: pickEnemy(n, rnd) });
      w.nextWave = Infinity;
    } else {
      var count = Math.min(44, 7 + 2 * n);
      for (var i = 0; i < count; i++) q.push({ t: 0.6 + i * (C.spawnLen / count), type: pickEnemy(n, rnd) });
      w.nextWave = C.waveLen;
    }
    w.spawnQ = q;
    // revenus des Pépites
    w.boards.forEach(function (b, bi) {
      var inc = 0;
      b.slots.forEach(function (s) { if (s && T[s.t].income) inc += s.p * (T[s.t].income + T[s.t].incomePu * puOf(b, s.t)); });
      if (inc) { b.sp += inc; w.ev.push({ k: "income", b: bi, v: inc }); }
    });
    w.ev.push({ k: "wave", n: n, boss: isBossWave(n) });
  }
  function pickEnemy(n, rnd) {
    var tot = 0, list = [];
    EKEYS.forEach(function (k) { var e = D.ENEMIES[k]; if (!e.boss && e.from <= n) { list.push(k); tot += e.w; } });
    var x = rnd() * tot;
    for (var i = 0; i < list.length; i++) { x -= D.ENEMIES[list[i]].w; if (x <= 0) return list[i]; }
    return list[0];
  }
  function spawnEnemy(w, type, dist, hp, lane) {
    var d = D.ENEMIES[type];
    var max = hp || waveHp(w, Math.max(1, w.wave)) * d.hp;
    var e = { id: w.nextId++, type: type, d: d, hp: max, max: max, dist: dist || 0, lane: lane || 0, spd: d.spd * Math.min(1.45, 1 + 0.012 * w.wave) * w.lay.spdMul,
              slowT: 0, slowF: 0, poison: 0, poisonT: 0, t: Math.random() * 3, power: 3, chargeT: 0, under: false, flash: 0, baby: !!hp };
    if (d.boss) { w.bossAlive++; w.ev.push({ k: "boss", type: type }); }
    w.enemies.push(e); w.emap[e.id] = e;
    return e;
  }

  /* ---------- combat ---------- */
  function boardCrit(b) {
    var c = C.crit;
    b.slots.forEach(function (s) { if (s && s.t === "lune") c += s.p * T.lune.critPip; });
    return Math.min(0.6, c);
  }
  function boardAura(b) {
    var a = 0;
    b.slots.forEach(function (s) { if (s && T[s.t].aura && s.stun <= 0) a += s.p * (T[s.t].aura + T[s.t].auraPu * puOf(b, s.t)); });
    return a;
  }
  function targetable(e) { return !e.dead && !e.under && e.dist >= 0; }
  // from / range : seules les bestioles à portée de l'écureuil comptent
  function inRange(w, e, from, range) {
    if (!from || !isFinite(range)) return true;
    var p = epos(w, e); return Math.hypot(p.x - from.x, p.y - from.y) <= range;
  }
  function chooseTarget(w, mode, from, range) {
    var best = null, bv = -Infinity, list = w.enemies;
    if (mode === "random") {
      var pool = list.filter(function (e) { return targetable(e) && !e.poison && inRange(w, e, from, range); });
      if (!pool.length) pool = list.filter(function (e) { return targetable(e) && inRange(w, e, from, range); });
      return pool.length ? pick(pool) : null;
    }
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (!targetable(e) || !inRange(w, e, from, range)) continue;
      var v = mode === "strong" ? e.hp : e.dist;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  function damage(w, e, dmg, bi, opt) {
    if (e.dead) return;
    opt = opt || {};
    if (!opt.pure && e.d.armor) dmg *= 1 - e.d.armor;
    e.hp -= dmg; e.flash = 0.08;
    if (w.boards[bi]) w.boards[bi].dmg += dmg;
    if (e.hp <= 0) kill(w, e, bi);
  }
  function kill(w, e, bi) {
    e.dead = true; e.hp = 0;
    w.kills++;
    var gain = e.d.boss ? C.bossSp * (Math.floor(w.wave / C.bossEvery) || 1) : C.killSp + C.killSpWave * w.wave;
    if (e.baby) gain = Math.ceil(gain / 2);
    w.boards.forEach(function (b) { b.sp += gain; });
    if (w.boards[bi]) w.boards[bi].kills++;
    var p = epos(w, e);
    w.ev.push({ k: "kill", x: p.x, y: p.y, type: e.type, boss: !!e.d.boss });
    if (e.d.boss) { w.bossAlive--; w.bosses++; w.ev.push({ k: "bossdead", type: e.type }); }
    if (e.d.split) for (var i = 0; i < e.d.split; i++) spawnEnemy(w, "slug", Math.max(0, e.dist - 4 - i * 4), e.max * 0.3, e.lane);
    if (e.d.stunOnDeath) stunRandom(w, 1, e.d.stunOnDeath);
  }
  function stunRandom(w, n, dur) {
    var all = [];
    w.boards.forEach(function (b, bi) { b.slots.forEach(function (s, si) { if (s && s.stun <= 0) all.push([bi, si]); }); });
    for (var i = 0; i < n && all.length; i++) {
      var k = Math.floor(Math.random() * all.length), it = all.splice(k, 1)[0];
      w.boards[it[0]].slots[it[1]].stun = dur;
      w.ev.push({ k: "stun", b: it[0], s: it[1] });
    }
  }
  function transformRandom(w, n) {
    var all = [];
    w.boards.forEach(function (b, bi) { b.slots.forEach(function (s, si) { if (s) all.push([bi, si]); }); });
    for (var i = 0; i < n && all.length; i++) {
      var k = Math.floor(Math.random() * all.length), it = all.splice(k, 1)[0], b = w.boards[it[0]], old = b.slots[it[1]];
      b.slots[it[1]] = newSq(b, randomDeckType(b, old.t), old.p);
      w.ev.push({ k: "xf", b: it[0], s: it[1] });
    }
  }
  function hit(w, pr, e) {
    var b = w.boards[pr.b], Tp = T[pr.t];
    if (e.d.dodge && Math.random() < e.d.dodge) { var mp = epos(w, e); w.ev.push({ k: "miss", x: mp.x, y: mp.y }); return; }
    var dmg = pr.dmg, crit = Math.random() < pr.crit;
    if (crit) dmg *= C.critMul;
    if (Tp.bossMul && e.d.boss) dmg *= Tp.bossMul;
    if (Tp.slow && !e.d.noSlow) {
      var f = Math.min(Tp.slowMax, Tp.slow + Tp.slowPip * (pr.p - 1)) * (e.d.boss ? 0.5 : 1);
      if (f >= e.slowF || e.slowT < 0.5) { e.slowF = f; }
      e.slowT = 2;
    }
    if (Tp.poison) {
      var dps = (Tp.poison + Tp.poisonPu * puOf(b, pr.t)) * classMul(b, pr.t);
      if (dps >= e.poison) { e.poison = dps; e.poisonB = pr.b; }
      e.poisonT = 4;
    }
    if (Tp.freeze && !e.d.noSlow) e.frozenT = Math.max(e.frozenT || 0, (Tp.freeze + Tp.freezePip * (pr.p - 1)) * (e.d.boss ? 0.5 : 1));
    damage(w, e, dmg, pr.b, { pure: !!Tp.pierce });
    var hp0 = epos(w, e);
    w.ev.push({ k: "hit", x: hp0.x, y: hp0.y - 3, t: pr.t, v: Math.round(dmg), crit: crit, big: !!e.d.boss });
    if (!e.dead && Tp.exec && !e.d.boss && e.hp < e.max * (Tp.exec + Tp.execPip * (pr.p - 1))) {
      var xp = epos(w, e); w.ev.push({ k: "exec", x: xp.x, y: xp.y });
      damage(w, e, e.hp + 1, pr.b, { pure: true });
    }
    if (e.dead && Tp.steal && b) { var st = Tp.steal * pr.p; b.sp += st; var sp0 = epos(w, e); w.ev.push({ k: "steal", x: sp0.x, y: sp0.y, v: st }); }
    if (crit) { var cp = epos(w, e); w.ev.push({ k: "crit", x: cp.x, y: cp.y, v: Math.round(dmg) }); }
    if (Tp.splash) {
      w.enemies.forEach(function (o) {
        if (o === e || !targetable(o)) return;
        if (near(w, o, e, Tp.splashR)) damage(w, o, dmg * Tp.splash, pr.b);
      });
      var sp = epos(w, e); w.ev.push({ k: "boom", x: sp.x, y: sp.y, r: Tp.splashR, c: Tp.color });
    }
    if (Tp.chain) {
      var hitIds = {}, from = e, left = Tp.chain + (pr.p >= Tp.chainPip ? 1 : 0), d2 = dmg, pts = [epos(w, e)];
      hitIds[e.id] = 1;
      while (left-- > 0) {
        var best = null, bd = 34, fp = epos(w, from);
        for (var i = 0; i < w.enemies.length; i++) {
          var o = w.enemies[i]; if (hitIds[o.id] || !targetable(o)) continue;
          var op = epos(w, o), dd = Math.hypot(op.x - fp.x, op.y - fp.y); if (dd < bd) { bd = dd; best = o; }
        }
        if (!best) break;
        d2 *= Tp.chainFall; hitIds[best.id] = 1; pts.push(epos(w, best));
        damage(w, best, d2, pr.b); from = best;
      }
      if (pts.length > 1) w.ev.push({ k: "bolt", pts: pts.map(function (q) { return [q.x, q.y]; }) });
    }
  }
  function aim(sq, c, w, e) { var q = epos(w, e); sq.ang = Math.atan2(q.y - c.y, q.x - c.x); sq.fx = 1; }
  function fire(w, bi, si, sq) {
    var b = w.boards[bi], Tp = T[sq.t], pu = puOf(b, sq.t), dmg = (Tp.dmg + Tp.pu * pu) * classMul(b, sq.t) * (1 + C.pipBonus * (sq.p - 1));
    dmg *= 1 + boardAura(b);
    var c = slotCenter(w.lay, bi, si), crit = boardCrit(b), rg = rangeOf(sq.t);
    if (Tp.target === "all") {
      var any = false;
      var spts = [];
      w.enemies.slice().forEach(function (e) { if (targetable(e) && inRange(w, e, c, rg)) { any = true; var q = epos(w, e); if (spts.length < 24) spts.push([Math.round(q.x), Math.round(q.y)]); hit(w, { b: bi, t: sq.t, p: sq.p, dmg: dmg * sq.p, crit: crit }, e); } });
      if (!any) return false;
      w.ev.push({ k: "storm", b: bi, s: si, pts: spts });
      sq.bob = 0.12; sq.fx = 1; sq.ang = -Math.PI / 2;
      return true;
    }
    if (sq.t === "mine") {
      if (w.mines.length > 40) return false;
      var spots = [];
      w.lay.paths.forEach(function (pth, ln) { for (var dd = 4; dd < pth.len - 4; dd += 4) { var q = posAt(w.lay, dd, ln); if (Math.hypot(q.x - c.x, q.y - c.y) <= rg) spots.push([ln, dd]); } });
      if (!spots.length) return false;
      for (var m = 0; m < sq.p; m++) {
        var spot = pick(spots), dist = spot[1];
        w.mines.push({ dist: dist, lane: spot[0], dmg: dmg, b: bi, crit: crit, fly: 0.35, x0: c.x, y0: c.y, t: 0 });
      }
      sq.bob = 0.12; sq.fx = 1; sq.ang = -Math.PI / 2;
      return true;
    }
    var first = chooseTarget(w, Tp.target, c, rg);
    if (!first) return false;
    aim(sq, c, w, first);
    if (sq.t === "eclair") w.ev.push({ k: "zap", x0: c.x, y0: c.y, id: first.id });
    for (var k = 0; k < sq.p; k++) {
      var tg = k === 0 ? first : (Tp.target === "random" ? chooseTarget(w, "random", c, rg) || first : first);
      var shots = Tp.echo && Math.random() < Tp.echo ? 2 : 1;
      for (var z = 0; z < shots; z++) {
        w.projs.push({ x: c.x, y: c.y, tid: tg.id, t: sq.t, b: bi, p: sq.p, dmg: dmg, crit: crit, delay: k * 0.06 + z * 0.12 });
        if (w.fx.length < 200) w.fx.push(bi, si, tg.id, TIDX[sq.t]);
      }
    }
    sq.bob = 0.12;
    return true;
  }

  /* ---------- pas de simulation ---------- */
  function step(w, dt) {
    if (w.over) return;
    w.t += dt; w.waveT += dt;
    if (w.wave === 0) { if (w.waveT >= w.nextWave) startWave(w); }
    else if (isBossWave(w.wave)) {
      if ((!w.bossAlive && !w.spawnQ.length && w.waveT > 3) || w.waveT > C.bossTimeout) { w.bossDone = w.waveT; startWave(w); }
    } else if (w.waveT >= w.nextWave) startWave(w);

    while (w.spawnQ.length && w.spawnQ[0].t <= w.waveT) { var sq0 = w.spawnQ.shift(); spawnEnemy(w, sq0.type, 0, 0, w.lay.paths.length > 1 ? (w.laneN = (w.laneN || 0) + 1) % 2 : 0); }

    // plateaux
    w.boards.forEach(function (b, bi) {
      var haste = new Array(NSLOT).fill(0);
      b.slots.forEach(function (s, i) {
        if (!s || s.t !== "chene" || s.stun > 0) return;
        var h = (T.chene.haste + T.chene.hastePu * puOf(b, "chene")) * s.p, x = i % COLS;
        if (x > 0) haste[i - 1] += h;
        if (x < COLS - 1) haste[i + 1] += h;
        if (i - COLS >= 0) haste[i - COLS] += h;
        if (i + COLS < NSLOT) haste[i + COLS] += h;
      });
      b.slots.forEach(function (s, i) {
        if (!s) return;
        if (s.born > 0) s.born -= dt;
        if (s.bob > 0) s.bob -= dt;
        if (s.stun > 0) { s.stun -= dt; return; }
        if (s.grow !== undefined) {
          s.grow -= dt;
          if (s.grow <= 0) {
            if (s.p < C.maxPips) { b.slots[i] = newSq(b, pick(b.deck), s.p + 1); w.ev.push({ k: "grow", b: bi, s: i }); return; }
            delete s.grow;
          }
        }
        var Tp = T[s.t];
        if (Tp.target === "none" && s.t !== "mine") return;
        s.cd -= dt * (1 + haste[i]);
        if (s.cd <= 0) { if (fire(w, bi, i, s)) s.cd += Tp.every; else s.cd = 0; }
      });
    });

    // projectiles
    for (var i = w.projs.length - 1; i >= 0; i--) {
      var pr = w.projs[i];
      if (pr.delay > 0) { pr.delay -= dt; continue; }
      var e = w.emap[pr.tid];
      if (!e || !targetable(e)) {
        if (pr.vis) { w.projs.splice(i, 1); continue; }
        var nt = chooseTarget(w, "front");
        if (!nt) { w.projs.splice(i, 1); continue; }
        pr.tid = nt.id; e = nt;
      }
      var p = epos(w, e), dx = p.x - pr.x, dy = p.y - 3 - pr.y, d = Math.hypot(dx, dy), mv = (T[pr.t].pspd || 300) * dt;
      if (d <= mv + 2) { w.projs.splice(i, 1); if (!pr.vis) hit(w, pr, e); continue; }
      pr.x += dx / d * mv; pr.y += dy / d * mv;
    }

    // pièges
    for (var m = w.mines.length - 1; m >= 0; m--) {
      var mn = w.mines[m];
      mn.t += dt;
      if (mn.t < mn.fly) continue;
      var trig = null;
      var mpos = posAt(w.lay, mn.dist, mn.lane);
      for (var k = 0; k < w.enemies.length; k++) { var en = w.enemies[k]; if (!targetable(en) || en.d.fly) continue; var ep = epos(w, en); if (Math.hypot(ep.x - mpos.x, ep.y - mpos.y) < 6) { trig = en; break; } }
      if (!trig) continue;
      w.mines.splice(m, 1);
      var crit = Math.random() < mn.crit, md = mn.dmg * (crit ? C.critMul : 1);
      w.enemies.forEach(function (o) { if (!targetable(o) || o.d.fly) return; var op = epos(w, o); if (Math.hypot(op.x - mpos.x, op.y - mpos.y) <= T.mine.mineR) damage(w, o, md, mn.b); });
      var mp = mpos; w.ev.push({ k: "boom", x: mp.x, y: mp.y, r: T.mine.mineR, c: "#e8873a" });
    }

    // ennemis
    var L = w.lay.len;
    for (var j = w.enemies.length - 1; j >= 0; j--) {
      var en2 = w.enemies[j];
      if (en2.dead) { w.enemies.splice(j, 1); delete w.emap[en2.id]; continue; }
      var dd2 = en2.d;
      en2.t += dt;
      if (en2.flash > 0) en2.flash -= dt;
      if (en2.slowT > 0) { en2.slowT -= dt; if (en2.slowT <= 0) en2.slowF = 0; }
      if (en2.poisonT > 0) {
        en2.poisonT -= dt;
        damage(w, en2, en2.poison * dt, en2.poisonB, { pure: true });
        if (en2.poisonT <= 0) en2.poison = 0;
        if (en2.dead) continue;
      }
      var sp = en2.spd * (1 - en2.slowF);
      if (en2.frozenT > 0) { en2.frozenT -= dt; sp = 0; }
      if (dd2.hop) sp *= Math.sin(en2.t * 7) > -0.2 ? 1.6 : 0.1;
      if (dd2.burrow) { var ph = en2.t % 3.6; en2.under = ph > 2.4; if (en2.under) sp *= 1.5; }
      if (dd2.heal) {
        en2.power -= dt;
        if (en2.power <= 0) {
          en2.power = 3;
          w.enemies.forEach(function (o) { if (!o.dead && near(w, o, en2, 30)) o.hp = Math.min(o.max, o.hp + o.max * dd2.heal); });
          var hp = epos(w, en2); w.ev.push({ k: "heal", x: hp.x, y: hp.y });
        }
      }
      if (dd2.boss) {
        en2.power -= dt;
        if (en2.chargeT > 0) { en2.chargeT -= dt; sp *= 2.2; }
        if (en2.power <= 0) {
          if (dd2.power === "charge") { en2.power = 6; en2.chargeT = 1.1; stunRandom(w, 2, 3); w.ev.push({ k: "charge" }); }
          else { en2.power = 7; transformRandom(w, 2); for (var mo = 0; mo < 2; mo++) spawnEnemy(w, "moth", Math.max(0, en2.dist - 6 - mo * 6), en2.max * 0.02, en2.lane); w.ev.push({ k: "hoot" }); }
        }
      }
      en2.dist += sp * dt;
      if (en2.dist >= L) {
        en2.dead = true; w.enemies.splice(j, 1); delete w.emap[en2.id];
        if (dd2.boss) w.bossAlive--;
        w.lives = Math.max(0, w.lives - dd2.leak);
        w.ev.push({ k: "leak", n: dd2.leak });
        if (w.lives <= 0) { w.over = true; w.ev.push({ k: "over" }); return; }
      }
    }
  }

  /* ---------- IA (versus contre l'ordi) ---------- */
  function botStep(w, bi, dt, level) {
    var b = w.boards[bi];
    b.botT -= dt;
    if (b.botT > 0 || w.over) return;
    b.botT = (level === 2 ? 0.25 : 0.5) + Math.random() * 0.4;
    var free = freeSlots(b);
    if (free.length && b.sp >= summonCost(b)) { summon(w, bi); return; }
    // fusions : les caméléons copient le meilleur, puis les plus petits points d'abord
    var pairs = [];
    for (var a = 0; a < NSLOT; a++) for (var c = 0; c < NSLOT; c++) if (canMerge(b, a, c)) {
      var A = b.slots[a], B = b.slots[c], score = 10 - A.p;
      if (A.t === "cameleon" && B.t !== "cameleon") score = 20 + B.p;
      if (A.t === "pepite" && w.wave < 12) score -= 3;
      if (A.t === "chene" || A.t === "lune") score -= 2;
      pairs.push([score, a, c]);
    }
    pairs.sort(function (x, y) { return y[0] - x[0]; });
    var wantMerge = free.length <= 3 || (pairs.length && pairs[0][0] >= 20);
    if (wantMerge && pairs.length && Math.random() < (level === 2 ? 0.95 : 0.75)) { merge(w, bi, pairs[0][1], pairs[0][2]); return; }
    // améliorations : le type le plus présent sur le plateau
    var weight = [0, 0, 0, 0, 0];
    b.slots.forEach(function (s) { if (s) { var i = b.deck.indexOf(s.t); if (i >= 0) weight[i] += s.p; } });
    var bestI = -1, bestW = 0;
    weight.forEach(function (v, i) { if (v > bestW && puCost(b, i) <= b.sp) { bestW = v; bestI = i; } });
    if (bestI >= 0 && (free.length <= 3 || puCost(b, bestI) <= summonCost(b) * 2)) powerUp(w, bi, bestI);
  }

  /* ---------- réseau : instantanés ---------- */
  function snapshot(w, evs) {
    var e = [];
    w.enemies.forEach(function (en) {
      if (en.dead) return;
      e.push(en.id, EIDX[en.type], Math.round(en.dist * 10), Math.ceil(en.hp), Math.ceil(en.max),
        (en.under ? 1 : 0) | (en.slowT > 0 || en.frozenT > 0 ? 2 : 0) | (en.poisonT > 0 ? 4 : 0) | (en.chargeT > 0 ? 8 : 0) | (en.flash > 0 ? 16 : 0) | (en.lane ? 32 : 0));
    });
    var b = w.boards.map(function (bd) {
      var s = [], st = 0;
      bd.slots.forEach(function (q, i) { s.push(q ? TIDX[q.t] * 8 + q.p : -1); if (q && q.stun > 0) st |= 1 << i; });
      return { sp: Math.floor(bd.sp), n: bd.sumN, pu: bd.pu.slice(), s: s, st: st, k: bd.kills, mp: bd.maxPip };
    });
    var snap = { w: w.wave, wt: Math.round(w.waveT * 10), nw: isFinite(w.nextWave) ? w.nextWave : -1, l: w.lives, o: w.over ? 1 : 0, kl: w.kills, bs: w.bosses,
                 e: e, b: b, f: w.fx.slice(0, 240), m: w.mines.map(function (mn) { return Math.round(mn.dist) * 2 + (mn.lane || 0); }), v: evs || [] };
    w.fx.length = 0;
    return snap;
  }
  function applySnap(w, s) {
    w.wave = s.w; w.waveT = s.wt / 10; w.nextWave = s.nw < 0 ? Infinity : s.nw; w.lives = s.l; w.over = !!s.o; w.kills = s.kl; w.bosses = s.bs;
    var seen = {};
    for (var i = 0; i + 5 < s.e.length + 1; i += 6) {
      var id = s.e[i], en = w.emap[id];
      if (!en) {
        var type = EKEYS[s.e[i + 1]];
        en = { id: id, type: type, d: D.ENEMIES[type], dist: s.e[i + 2] / 10, t: Math.random() * 3, flash: 0 };
        w.enemies.push(en); w.emap[id] = en;
      }
      en.tdist = s.e[i + 2] / 10; en.hp = s.e[i + 3]; en.max = s.e[i + 4];
      var fl = s.e[i + 5];
      en.under = !!(fl & 1); en.slowT = fl & 2 ? 1 : 0; en.poisonT = fl & 4 ? 1 : 0; en.chargeT = fl & 8 ? 1 : 0;
      if (fl & 16) en.flash = 0.08;
      en.lane = fl & 32 ? 1 : 0;
      seen[id] = 1;
    }
    for (var j = w.enemies.length - 1; j >= 0; j--) {
      var o = w.enemies[j];
      if (!seen[o.id]) { w.enemies.splice(j, 1); delete w.emap[o.id]; }
    }
    s.b.forEach(function (sb, bi) {
      var bd = w.boards[bi]; if (!bd) return;
      bd.sp = sb.sp; bd.sumN = sb.n; bd.pu = sb.pu; bd.kills = sb.k; bd.maxPip = sb.mp;
      sb.s.forEach(function (code, k) {
        var cur = bd.slots[k];
        if (code < 0) { bd.slots[k] = null; return; }
        var t = D.ORDER[code >> 3], p = code & 7;
        if (!cur || cur.t !== t || cur.p !== p) bd.slots[k] = cur = { t: t, p: p, cd: 0, stun: 0, bob: 0, born: 0.25 };
        cur.stun = sb.st & (1 << k) ? 1 : 0;
      });
    });
    for (var f = 0; f + 3 < s.f.length + 1; f += 4) {
      var c = slotCenter(w.lay, s.f[f], s.f[f + 1]), sq = w.boards[s.f[f]] && w.boards[s.f[f]].slots[s.f[f + 1]];
      if (sq) { sq.bob = 0.12; sq.fx = 1; var te = w.emap[s.f[f + 2]]; if (te) { var tq = epos(w, te); sq.ang = Math.atan2(tq.y - c.y, tq.x - c.x); } }
      if (w.projs.length < 300) w.projs.push({ x: c.x, y: c.y, tid: s.f[f + 2], t: D.ORDER[s.f[f + 3]], vis: true, delay: (f / 4 % 7) * 0.05 });
    }
    w.mines = s.m.map(function (d) { return { dist: d >> 1, lane: d & 1, t: 1, fly: 0 }; });
  }
  // fait avancer un monde « vue » (rempli par instantanés) entre deux réceptions
  function stepView(w, dt) {
    w.enemies.forEach(function (en) {
      en.t += dt;
      if (en.flash > 0) en.flash -= dt;
      if (en.tdist !== undefined) { en.tdist += en.d.spd * w.lay.spdMul * 0.6 * dt; en.dist += (en.tdist - en.dist) * Math.min(1, dt * 10); }
    });
    w.boards.forEach(function (b) { b.slots.forEach(function (s) { if (s) { if (s.bob > 0) s.bob -= dt; if (s.born > 0) s.born -= dt; } }); });
    for (var i = w.projs.length - 1; i >= 0; i--) {
      var pr = w.projs[i];
      if (pr.delay > 0) { pr.delay -= dt; continue; }
      var e = w.emap[pr.tid];
      if (!e) { w.projs.splice(i, 1); continue; }
      var p = epos(w, e), dx = p.x - pr.x, dy = p.y - 3 - pr.y, d = Math.hypot(dx, dy), mv = (T[pr.t].pspd || 300) * dt;
      if (d <= mv + 2) { w.projs.splice(i, 1); w.ev.push({ k: "hit", x: p.x, y: p.y - 3, t: pr.t }); continue; }
      pr.x += dx / d * mv; pr.y += dy / d * mv;
    }
  }

  root.RD_CORE = {
    CELL: CELL, COLS: COLS, ROWS: ROWS, NSLOT: NSLOT, BW: BW, BH: BH, EKEYS: EKEYS, TIDX: TIDX,
    layout: layout, posAt: posAt, epos: epos, rangeOf: rangeOf, slotCenter: slotCenter, createWorld: createWorld, step: step, stepView: stepView,
    summon: summon, merge: merge, canMerge: canMerge, powerUp: powerUp, act: act, botStep: botStep,
    summonCost: summonCost, puCost: puCost, freeSlots: freeSlots, isBossWave: isBossWave, waveHp: waveHp,
    snapshot: snapshot, applySnap: applySnap, boardCrit: boardCrit,
  };
})(typeof window !== "undefined" ? window : globalThis);
