/* =========================================================================
   Écureuil Défense — moteur sans DOM (manches, tours, améliorations, combat)
   Testable dans Node : require("./js/defense-data.js"); require("./js/defense-core.js")
   puis TD_CORE.createWorld({ map: "clairiere", mode: "normal" }) / TD_CORE.step(w, dt)
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.TD_DATA, T = D.TOWERS, E = D.ENEMIES, CFG = D.CFG;

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function mapById(id) { return D.MAPS.filter(function (m) { return m.id === id; })[0] || D.MAPS[0]; }
  function modeById(id) { return D.MODES.filter(function (m) { return m.id === id; })[0] || D.MODES[1]; }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  /* ---------- chemins ---------- */
  function buildPath(pts) {
    var segs = [], len = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], l: l, s: len, dx: (b[0] - a[0]) / l, dy: (b[1] - a[1]) / l });
      len += l;
    }
    return { pts: pts, segs: segs, len: len };
  }
  function pathPos(p, d) {
    var segs = p.segs;
    if (d <= 0) return { x: segs[0].ax + segs[0].dx * d, y: segs[0].ay + segs[0].dy * d, dx: segs[0].dx, dy: segs[0].dy };
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (d <= s.s + s.l || i === segs.length - 1) { var t = d - s.s; return { x: s.ax + s.dx * t, y: s.ay + s.dy * t, dx: s.dx, dy: s.dy }; }
    }
  }
  function segDist(px, py, s) {
    var t = Math.max(0, Math.min(s.l, (px - s.ax) * s.dx + (py - s.ay) * s.dy));
    return Math.hypot(px - (s.ax + s.dx * t), py - (s.ay + s.dy * t));
  }
  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  /* ---------- monde ---------- */
  function createWorld(o) {
    var map = mapById(o.map), mode = modeById(o.mode);
    var w = {
      map: map, mode: mode, paths: map.paths.map(buildPath),
      cash: mode.cash, lives: mode.lives, round: 0, running: false, auto: false, freeplay: false,
      towers: [], enemies: [], projs: [], queue: [], rt: 0, spawnN: 0,
      nextId: 1, t: 0, ev: [], won: false, over: false, kills: 0, spent: 0, popped: 0,
      dirty: true, seed: o.seed || 1,
    };
    return w;
  }
  function emit(w, e) { if (w.ev.length < 400) w.ev.push(e); }

  /* ---------- prix ---------- */
  function price(w, c) { return Math.max(5, Math.round(c * w.mode.cost / 5) * 5); }
  function towerCost(w, type) { return price(w, T[type].cost); }
  function discountAt(w, t) {
    var best = 0;
    w.towers.forEach(function (f) { if (f !== t && f.st.discount > best && dist2(f.x, f.y, t.x, t.y) <= f.st.range * f.st.range) best = f.st.discount; });
    return Math.min(0.25, best);
  }
  function upCost(w, t, p) {
    var u = T[t.type].paths[p].up[t.tiers[p]]; if (!u) return Infinity;
    return Math.max(5, Math.round(price(w, u.c) * (1 - discountAt(w, t)) / 5) * 5);
  }
  // règle des voies : 2 voies au plus, une seule au-delà du niveau 2
  function pathLimit(t, p) {
    var others = t.tiers.filter(function (v, i) { return i !== p; });
    var used = others.filter(function (v) { return v > 0; }).length;
    if (used >= 2) return 0;
    var high = others.some(function (v) { return v > 2; });
    return high ? 2 : 5;
  }
  function canUpgrade(w, t, p) {
    if (t.tiers[p] >= 5 || t.tiers[p] >= pathLimit(t, p)) return false;
    return w.cash >= upCost(w, t, p);
  }
  function sellValue(w, t) {
    var bonus = 0; w.towers.forEach(function (f) { bonus += f.st.sellBonus || 0; });
    return Math.floor(t.spent * (CFG.sell + Math.min(0.15, bonus)));
  }

  /* ---------- statistiques d'une tour (améliorations + auras) ---------- */
  var DEF = { dmg: 0, pierce: 1, count: 1, spread: 0.2, pspd: 300, splash: 0, sdmg: 0, slow: 0, slowT: 0, freeze: 0, stun: 0, burn: 0, burnT: 0,
    ap: false, camo: false, bossMul: 1, bigMul: 1, home: false, crit: 0, critMul: 3, frags: 0, fragDmg: 0, chain: 0, chainR: 46, income: 0,
    interest: 0, interestCap: 0, discount: 0, sellBonus: 0, killBonus: 0, auraSpd: 0, auraRange: 0, auraDmg: 0, auraCamo: false, auraCrit: 0, auraAp: false,
    expose: 0, thorns: 0, auraSlow: 0, bossSlow: false, brittle: 0, freezeBig: false, ringPulse: false, psize: 0, cmdSpd: 0, cmdR: 0, ability: null };
  function applyMod(s, m) {
    Object.keys(m).forEach(function (k) {
      var v = m[k];
      if (k === "rateX") s.rate *= v;
      else if (k === "pspdX") s.pspd *= v;
      else if (typeof v === "number" && typeof s[k] === "number") s[k] += v;
      else s[k] = v;
    });
  }
  function baseStats(t) {
    var d = T[t.type], s = {};
    Object.keys(DEF).forEach(function (k) { s[k] = DEF[k]; });
    applyMod(s, d.base);
    d.paths.forEach(function (p, pi) { for (var i = 0; i < t.tiers[pi]; i++) applyMod(s, p.up[i].m); });
    return s;
  }
  function refresh(w) {
    w.towers.forEach(function (t) { t.bs = baseStats(t); });
    w.towers.forEach(function (t) {
      var s = {}; Object.keys(t.bs).forEach(function (k) { s[k] = t.bs[k]; });
      var spd = 0, rng = 0, dmg = 0, crit = 0, camo = false, ap = false, cmd = 0;
      w.towers.forEach(function (o) {
        if (o === t) return;
        var b = o.bs, d2 = dist2(o.x, o.y, t.x, t.y);
        if (o.type === "chene" && d2 <= b.range * b.range) {
          spd = Math.max(spd, b.auraSpd); rng = Math.max(rng, b.auraRange); dmg = Math.max(dmg, b.auraDmg);
          crit = Math.max(crit, b.auraCrit); camo = camo || b.auraCamo; ap = ap || b.auraAp;
        }
        if (b.cmdSpd && d2 <= b.cmdR * b.cmdR) cmd = Math.max(cmd, b.cmdSpd);
      });
      if (s.kind !== "aura" && s.kind !== "farm") {
        s.rate /= (1 + spd + cmd); s.range *= 1 + rng;
        if (s.dmg > 0) s.dmg += dmg;
        if (crit > s.crit) { s.crit = crit; s.critMul = Math.max(s.critMul, 3); }
        s.camo = s.camo || camo; s.ap = s.ap || ap;
      }
      t.buffed = spd + cmd + rng + dmg + crit > 0 || camo;
      t.st = s;
    });
    w.dirty = false;
  }

  /* ---------- placement ---------- */
  function placeError(w, type, x, y) {
    var R = CFG.towerR;
    if (x < R || y < R + 4 || x > CFG.W - R || y > CFG.H - R) return "Hors de la carte";
    for (var i = 0; i < w.paths.length; i++) {
      var segs = w.paths[i].segs;
      for (var j = 0; j < segs.length; j++) if (segDist(x, y, segs[j]) < CFG.pathW / 2 + R - 2) return "Sur le chemin";
    }
    if (w.map.water.some(function (p) { return inPoly(x, y, p); })) return "Dans l'eau";
    if (w.map.rocks.some(function (r) { return dist2(x, y, r[0], r[1]) < (r[2] + R - 2) * (r[2] + R - 2); })) return "Sur un rocher";
    if (w.map.trees.some(function (r) { return dist2(x, y, r[0], r[1]) < (R + 8) * (R + 8); })) return "Sur un arbre";
    if (w.towers.some(function (t) { return dist2(x, y, t.x, t.y) < (R * 2 - 1) * (R * 2 - 1); })) return "Trop près d'une tour";
    return null;
  }
  function place(w, type, x, y) {
    var c = towerCost(w, type);
    if (!T[type] || w.cash < c || placeError(w, type, x, y)) return null;
    w.cash -= c; w.spent += c;
    var t = { id: w.nextId++, type: type, x: x, y: y, tiers: [0, 0, 0], spent: c, cd: 0.1, target: "first", ang: -Math.PI / 2, kills: 0, dmgDone: 0, acd: 0, buffT: 0, buffX: 1, thornCd: 0 };
    w.towers.push(t); w.dirty = true; refresh(w);
    emit(w, { k: "place", x: x, y: y });
    return t;
  }
  function upgrade(w, t, p) {
    if (!canUpgrade(w, t, p)) return false;
    var c = upCost(w, t, p);
    w.cash -= c; w.spent += c; t.spent += c; t.tiers[p]++;
    var u = T[t.type].paths[p].up[t.tiers[p] - 1];
    if (u.m.ability) t.acd = Math.min(t.acd || 0, 5);
    w.dirty = true; refresh(w);
    emit(w, { k: "upgrade", x: t.x, y: t.y, tier: t.tiers[p] });
    return true;
  }
  function sell(w, t) {
    var v = sellValue(w, t);
    w.cash += v; w.towers.splice(w.towers.indexOf(t), 1); w.dirty = true; refresh(w);
    emit(w, { k: "sell", x: t.x, y: t.y, v: v });
  }
  var TARGETS = ["first", "last", "strong", "close"];
  function cycleTarget(t) { t.target = TARGETS[(TARGETS.indexOf(t.target) + 1) % TARGETS.length]; }

  /* ---------- manches ---------- */
  function hpMul(w, r) {
    var m = 1 + 0.03 * Math.max(0, r - 6) + Math.max(0, r - 30) * 0.06 + Math.pow(Math.max(0, r - 45), 2) * 0.012;
    if (r > 60) m *= Math.pow(1.05, r - 60);
    return m * w.mode.hp;
  }
  function cashMul(r) { return r <= 30 ? 1.5 : r <= 45 ? 0.9 : 0.5; }
  function roundSpec(w, r) {
    var R = rng(r * 7919 + 13), out = [];
    var budget = 30 + 14 * r + 1.3 * r * r;
    var dur = Math.min(34, 10 + r * 0.6);
    var avail = Object.keys(E).filter(function (k) { return !E[k].boss && E[k].from <= r; });
    function pick() {
      var tot = 0, ws = avail.map(function (k) { var f = E[k].from; var wgt = 1 + 3 * f / r; tot += wgt; return wgt; });
      var x = R() * tot;
      for (var i = 0; i < avail.length; i++) { x -= ws[i]; if (x <= 0) return avail[i]; }
      return avail[avail.length - 1];
    }
    if (r % 10 === 0) {
      var bi = ((r / 10) - 1) % D.BOSSES.length;
      out.push({ type: D.BOSSES[bi], n: 1, gap: 1, delay: dur * 0.3, boss: true, lvl: Math.floor((r / 10 - 1) / D.BOSSES.length) });
      budget *= 0.45;
    }
    var intro = avail.filter(function (k) { return E[k].from === r; })[0];
    var groups = 1 + (r > 3) + (r > 12) + (r > 25);
    var rush = r % 5 === 0 && r % 10 !== 0;
    for (var g = 0; g < groups; g++) {
      var type = g === 0 && intro ? intro : pick();
      if (rush) { var fast = avail.filter(function (k) { return E[k].spd >= 45; }); if (fast.length) type = fast[(R() * fast.length) | 0]; }
      var n = Math.max(1, Math.round(budget / groups / (E[type].hp * Math.max(1, E[type].spd / 30))));
      if (E[type].big) n = Math.max(1, Math.round(n * 0.8));
      n = Math.min(n, 120);
      var start = g * dur * 0.18 * R();
      var span = rush ? dur * 0.6 : dur * (0.5 + 0.5 * R());
      out.push({ type: type, n: n, gap: Math.max(0.12, span / n), delay: start, camo: r >= 30 && !E[type].big && R() < 0.3 });
    }
    return out;
  }
  function startRound(w) {
    if (w.running || w.over || (w.won && !w.freeplay)) return false;
    w.round++; w.running = true; w.rt = 0; w.queue = [];
    roundSpec(w, w.round).forEach(function (g) {
      for (var i = 0; i < g.n; i++) w.queue.push({ t: g.delay + i * g.gap, type: g.type, camo: g.camo, lvl: g.lvl || 0 });
    });
    w.queue.sort(function (a, b) { return a.t - b.t; });
    emit(w, { k: "round", r: w.round, boss: w.round % 10 === 0 });
    return true;
  }
  function endRound(w) {
    w.running = false;
    var inc = CFG.roundBonus + w.round, farms = 0, interest = 0;
    w.towers.forEach(function (t) {
      if (t.st.income) { farms += t.st.income; emit(w, { k: "coin", x: t.x, y: t.y, v: t.st.income }); }
      if (t.st.interest) interest += Math.min(t.st.interestCap, Math.floor(w.cash * t.st.interest));
    });
    w.cash += inc + farms + interest;
    emit(w, { k: "roundEnd", r: w.round, v: inc + farms + interest });
    if (w.round >= w.mode.rounds && !w.won) { w.won = true; emit(w, { k: "win" }); }
    else if (w.auto) startRound(w);
  }

  /* ---------- bestioles ---------- */
  function spawn(w, type, opt) {
    var d = E[type]; opt = opt || {};
    var pi = opt.path != null ? opt.path : (w.spawnN++ % w.paths.length);
    var mul = d.boss ? w.mode.hp * Math.pow(4, opt.lvl || 0) : hpMul(w, w.round);
    var hp = Math.max(1, Math.round(d.hp * mul));
    var e = { id: w.nextId++, type: type, d: d, hp: hp, max: hp, dist: opt.dist || 0, path: pi, spd: d.spd,
      camo: !!(d.camo || opt.camo), slow: 0, slowT: 0, freezeT: 0, stunT: 0, burn: 0, burnT: 0, burnAp: false, t: Math.random() * 3,
      x: 0, y: 0, dx: 1, dy: 0, powT: 4, chargeT: 0, aSlow: 0, exposed: 0, r: d.boss ? 12 : d.big ? 9 : d.scale ? 4 : 6 };
    pos(w, e);
    w.enemies.push(e);
    if (d.boss) emit(w, { k: "boss", name: d.name });
    return e;
  }
  function pos(w, e) { var q = pathPos(w.paths[e.path], e.dist); e.x = q.x; e.y = q.y; e.dx = q.dx; e.dy = q.dy; }
  function killEnemy(w, e, src) {
    if (e.dead) return;
    e.dead = true; w.kills++;
    var kb = 0; w.towers.forEach(function (t) { kb += t.st.killBonus || 0; });
    var c = Math.max(1, Math.round(e.d.cash * cashMul(w.round) * (1 + Math.min(0.5, kb))));
    w.cash += c;
    if (src) src.kills++;
    emit(w, { k: "kill", x: e.x, y: e.y, type: e.type, big: !!(e.d.big || e.d.boss), boss: !!e.d.boss });
    if (e.d.kids) Object.keys(e.d.kids).forEach(function (k) {
      for (var i = 0; i < e.d.kids[k]; i++) {
        var kid = spawn(w, k, { path: e.path, dist: Math.max(0, e.dist - i * 7), camo: e.camo });
        kid.slow = e.slow; kid.slowT = e.slowT * 0.5;
      }
    });
  }
  function canHit(e) { return !e.dead; }
  function damage(w, e, dmg, s, src, noArmor) {
    if (e.dead || dmg <= 0) return 0;
    var d = dmg;
    if (e.d.boss) d *= s.bossMul; else if (e.d.big) d *= s.bigMul;
    if (!noArmor) {
      if (e.brittle && e.freezeT > 0) d += e.brittle;
      d += e.exposed;
      if (s.crit && Math.random() < s.crit) { d *= s.critMul; emit(w, { k: "crit", x: e.x, y: e.y }); }
    }
    if (e.d.armor && !s.ap && !noArmor) {
      d -= e.d.armor;
      if (d <= 0) { if (Math.random() < 0.25) emit(w, { k: "block", x: e.x, y: e.y }); return 0; }
    }
    d = Math.min(e.hp, d);
    e.hp -= d; e.flash = 0.08; w.popped += d;
    if (src) src.dmgDone += d;
    if (e.hp <= 0.0001) killEnemy(w, e, src);
    return d;
  }
  function effects(w, e, s) {
    if (e.dead) return;
    var boss = e.d.boss;
    if (s.slow && !e.d.noSlow) { var sl = boss ? s.slow * 0.5 : s.slow; if (sl >= e.slow || e.slowT <= 0) { e.slow = sl; e.slowT = Math.max(e.slowT, s.slowT); } }
    if (s.freeze && !boss && (!e.d.big || s.freezeBig)) { e.freezeT = Math.max(e.freezeT, s.freeze); e.brittle = Math.max(e.brittle || 0, s.brittle); }
    else if (s.freeze && !e.d.noSlow) { e.slow = Math.max(e.slow, boss ? 0.25 : 0.4); e.slowT = Math.max(e.slowT, s.freeze); }
    if (s.stun && !boss && !e.d.big) e.stunT = Math.max(e.stunT, s.stun);
    if (s.burn) { e.burn = Math.max(e.burn, s.burn); e.burnT = Math.max(e.burnT, s.burnT); e.burnSrc = e.burnSrc || null; }
  }
  function hitFull(w, e, s, src, dmg) {
    var dealt = damage(w, e, dmg == null ? s.dmg : dmg, s, src);
    effects(w, e, s);
    if (s.burn && !e.dead) e.burnSrc = src;
    return dealt;
  }
  function explode(w, x, y, s, src, skip) {
    var r2 = s.splash * s.splash, dmg = s.sdmg || s.dmg;
    emit(w, { k: "boom", x: x, y: y, r: s.splash, type: src ? src.type : "" });
    w.enemies.forEach(function (e) {
      if (e === skip || e.dead) return;
      if (dist2(e.x, e.y, x, y) <= r2 + e.r * e.r) hitFull(w, e, s, src, dmg);
    });
  }

  /* ---------- ciblage ---------- */
  function sees(s, e) { return !e.camo || s.camo || e.exposed > 0 || e.revealed; }
  function findTargets(w, t, s, n, from) {
    var r2 = s.range * s.range, cx = from ? from.x : t.x, cy = from ? from.y : t.y, list = [];
    w.enemies.forEach(function (e) {
      if (e.dead || !sees(s, e)) return;
      if (dist2(e.x, e.y, cx, cy) <= (s.range + e.r) * (s.range + e.r) || s.range > 5000) list.push(e);
    });
    if (!list.length) return list;
    var key = t.target;
    list.sort(function (a, b) {
      if (key === "first") return b.dist / w.paths[b.path].len - a.dist / w.paths[a.path].len;
      if (key === "last") return a.dist / w.paths[a.path].len - b.dist / w.paths[b.path].len;
      if (key === "strong") return (b.d.boss ? 1e9 : 0) + b.hp - (a.d.boss ? 1e9 : 0) - a.hp;
      return dist2(a.x, a.y, cx, cy) - dist2(b.x, b.y, cx, cy);
    });
    return list.slice(0, n);
  }
  function lead(t, e, spd) {
    var d = Math.hypot(e.x - t.x, e.y - t.y), tt = d / spd, v = e.spd * (1 - e.slow) * (e.freezeT > 0 || e.stunT > 0 ? 0 : 1);
    return { x: e.x + e.dx * v * tt, y: e.y + e.dy * v * tt };
  }
  function shoot(w, t, s, x, y, ang, target, extra) {
    if (w.projs.length > 900) return;
    var p = { x: x, y: y, vx: Math.cos(ang) * s.pspd, vy: Math.sin(ang) * s.pspd, life: (s.range * 1.35 + 20) / s.pspd, pierce: s.pierce, hit: {},
      s: s, src: t, type: t.type, target: target, size: s.psize, home: s.home };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    w.projs.push(p);
  }
  function chainFrom(w, t, s, first, maxJ, R) {
    var pts = [[t.x, t.y - 6], [first.x, first.y - 3]], hit = {}, cur = first, j = 0;
    hit[first.id] = 1; hitAt(w, first, s, t);
    while (j < maxJ) {
      var best = null, bd = R * R;
      for (var i = 0; i < w.enemies.length; i++) {
        var e = w.enemies[i]; if (e.dead || hit[e.id] || !sees(s, e)) continue;
        var dd = dist2(e.x, e.y, cur.x, cur.y); if (dd < bd) { bd = dd; best = e; }
      }
      if (!best) break;
      hit[best.id] = 1; hitAt(w, best, s, t); pts.push([best.x, best.y - 3]); cur = best; j++;
    }
    return pts;
  }
  function hitAt(w, e, s, t) {
    var ex = e.x, ey = e.y;
    hitFull(w, e, s, t);
    if (s.splash) explode(w, ex, ey, s, t, e);
  }

  /* ---------- tours ---------- */
  function towerStep(w, t, dt) {
    var s = t.st;
    if (t.buffT > 0) { t.buffT -= dt; if (t.buffT <= 0) t.buffX = 1; }
    if (t.acd > 0) t.acd -= dt;
    // épines du chêne
    if (s.thorns) {
      t.thornCd -= dt;
      if (t.thornCd <= 0) {
        t.thornCd = 1 / (t.buffX || 1);
        var any = false, r2 = s.range * s.range;
        w.enemies.forEach(function (e) { if (!e.dead && dist2(e.x, e.y, t.x, t.y) <= r2) { any = true; hitFull(w, e, { dmg: s.thorns, bossMul: s.bossMul, bigMul: 1, ap: s.ap, slow: s.slow, slowT: s.slowT, stun: s.stun }, t); } });
        if (any) emit(w, { k: "thorns", x: t.x, y: t.y, r: s.range });
      }
    }
    if (s.kind === "aura" || s.kind === "farm") return;
    t.cd -= dt * (t.buffX || 1);
    if (t.cd > 0) return;
    if (s.kind === "pulse") {
      var r2p = s.range * s.range, got = w.enemies.filter(function (e) { return !e.dead && dist2(e.x, e.y, t.x, t.y) <= (s.range + e.r) * (s.range + e.r); });
      if (!got.length) { t.cd = 0.05; return; }
      t.cd = s.rate;
      got.forEach(function (e) { hitFull(w, e, s, t); });
      if (s.frags) for (var f = 0; f < s.frags; f++) { var a = f / s.frags * Math.PI * 2; shoot(w, t, { pspd: 260, range: s.range * 1.6, pierce: 2, dmg: s.fragDmg, bossMul: 1, bigMul: 1, ap: s.ap, psize: 0 }, t.x, t.y - 4, a, null, { type: "shard" }); }
      emit(w, { k: "pulse", x: t.x, y: t.y, r: s.range, type: t.type });
      return;
    }
    if (s.kind === "ring") {
      var near = findTargets(w, t, s, 1);
      if (!near.length) { t.cd = 0.05; return; }
      t.cd = s.rate;
      if (s.ringPulse) {
        w.enemies.forEach(function (e) { if (!e.dead && dist2(e.x, e.y, t.x, t.y) <= (s.range + e.r) * (s.range + e.r)) hitFull(w, e, s, t); });
        emit(w, { k: "ring", x: t.x, y: t.y, r: s.range, type: t.type });
        return;
      }
      for (var i = 0; i < s.count; i++) shoot(w, t, s, t.x, t.y - 4, i / s.count * Math.PI * 2 + w.t * 0.7, null, { ring: true });
      emit(w, { k: "shot", type: t.type });
      return;
    }
    var n = s.kind === "snipe" ? s.count : 1;
    var tg = findTargets(w, t, s, n);
    if (!tg.length) { t.cd = 0.05; return; }
    t.cd = s.rate;
    var e0 = tg[0];
    t.ang = Math.atan2(e0.y - t.y, e0.x - t.x);
    if (s.kind === "proj") {
      var L = lead(t, e0, s.pspd), base = Math.atan2(L.y - (t.y - 4), L.x - t.x);
      for (var k = 0; k < s.count; k++) {
        var off = s.count > 1 ? (k - (s.count - 1) / 2) * (s.spread / Math.max(1, (s.count - 1) / 2)) * 0.6 : 0;
        shoot(w, t, s, t.x, t.y - 4, base + off, e0);
      }
      emit(w, { k: "shot", type: t.type });
    } else if (s.kind === "snipe") {
      tg.forEach(function (e) {
        var ex = e.x, ey = e.y;
        hitFull(w, e, s, t);
        if (s.splash) explode(w, ex, ey, s, t, e);
        var pts = [[t.x, t.y - 6], [ex, ey - 3]];
        if (s.chain) {
          var cur = { x: ex, y: ey }, hit = {}; hit[e.id] = 1;
          for (var j = 0; j < s.chain; j++) {
            var best = null, bd = s.chainR * s.chainR;
            w.enemies.forEach(function (o) { if (!o.dead && !hit[o.id] && sees(s, o)) { var dd = dist2(o.x, o.y, cur.x, cur.y); if (dd < bd) { bd = dd; best = o; } } });
            if (!best) break; hit[best.id] = 1; pts.push([best.x, best.y - 3]); cur = { x: best.x, y: best.y }; hitFull(w, best, s, t);
          }
        }
        emit(w, { k: "snipe", pts: pts });
      });
    } else if (s.kind === "chain") {
      var pts = chainFrom(w, t, s, e0, s.chain, s.chainR);
      emit(w, { k: "bolt", pts: pts, type: t.type });
    }
  }

  function projStep(w, p, dt) {
    if (p.home) {
      var tg = p.target && !p.target.dead ? p.target : null;
      if (!tg) { var best = null, bd = 120 * 120; w.enemies.forEach(function (e) { if (!e.dead && !p.hit[e.id] && sees(p.s, e)) { var dd = dist2(e.x, e.y, p.x, p.y); if (dd < bd) { bd = dd; best = e; } } }); tg = p.target = best; }
      if (tg) {
        var sp = Math.hypot(p.vx, p.vy), a = Math.atan2(p.vy, p.vx), b = Math.atan2(tg.y - p.y, tg.x - p.x), da = b - a;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        a += Math.max(-8 * dt, Math.min(8 * dt, da)); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0 || p.x < -20 || p.y < -20 || p.x > CFG.W + 20 || p.y > CFG.H + 20) { p.dead = true; return; }
    var rad = 3 + p.size * 2;
    for (var i = 0; i < w.enemies.length; i++) {
      var e = w.enemies[i];
      if (e.dead || p.hit[e.id]) continue;
      var rr = rad + e.r;
      if (dist2(e.x, e.y - 3, p.x, p.y) > rr * rr) continue;
      if (!p.ring && !p.s.splash && p.type !== "shard" && !sees(p.s, e)) continue;
      p.hit[e.id] = 1;
      var ex = e.x, ey = e.y;
      hitFull(w, e, p.s, p.src);
      if (p.s.splash) explode(w, ex, ey, p.s, p.src, e);
      if (p.s.frags) for (var f = 0; f < p.s.frags; f++) {
        var ang = f / p.s.frags * Math.PI * 2;
        shoot(w, p.src, { pspd: 240, range: 40, pierce: 1, dmg: p.s.fragDmg + 1, bossMul: 1, bigMul: 1, ap: true, psize: 0 }, ex, ey - 2, ang, null, { type: "shard", hit: (function () { var h = {}; h[e.id] = 1; return h; })() });
      }
      if (--p.pierce <= 0) { p.dead = true; return; }
    }
  }

  function enemyStep(w, e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.burnT > 0) { e.burnT -= dt; damage(w, e, e.burn * dt, { bossMul: 1, bigMul: 1, ap: true }, e.burnSrc, true); if (e.dead) return; }
    if (e.d.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.d.regen * hpMul(w, w.round) * dt);
    // pouvoirs des boss
    if (e.d.power) {
      e.powT -= dt;
      if (e.powT <= 0) {
        e.powT = 6;
        if (e.d.power === "charge") { e.chargeT = 1.4; emit(w, { k: "charge", x: e.x, y: e.y }); }
        if (e.d.power === "swarm") { for (var i = 0; i < 2 + w.round / 20; i++) spawn(w, "wasp", { path: e.path, dist: Math.max(0, e.dist - 10 - i * 6) }); e.powT = 5; emit(w, { k: "swarm", x: e.x, y: e.y }); }
        if (e.d.power === "heal") { w.enemies.forEach(function (o) { if (!o.dead && dist2(o.x, o.y, e.x, e.y) < 90 * 90) o.hp = Math.min(o.max, o.hp + o.max * 0.2); }); emit(w, { k: "heal", x: e.x, y: e.y }); }
        if (e.d.power === "roots") {
          var near = w.towers.filter(function (t) { return dist2(t.x, t.y, e.x, e.y) < 110 * 110 && t.st.kind !== "farm"; }).slice(0, 3);
          near.forEach(function (t) { t.cd = Math.max(t.cd, 2.5); emit(w, { k: "rooted", x: t.x, y: t.y }); });
        }
      }
    }
    if (e.chargeT > 0) e.chargeT -= dt;
    var stop = e.freezeT > 0 || e.stunT > 0;
    if (e.freezeT > 0) e.freezeT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (stop) { pos(w, e); return; }
    var sl = e.d.noSlow ? 0 : Math.max(e.slow, e.aSlow);
    var v = e.spd * (1 - Math.min(0.8, sl)) * (e.chargeT > 0 ? 2.6 : 1);
    e.dist += v * dt;
    if (e.dist >= w.paths[e.path].len) {
      e.dead = true; e.leaked = true;
      var loss = Math.min(e.d.leak, Math.max(1, Math.ceil(e.d.leak * e.hp / e.max)));
      w.lives -= loss;
      emit(w, { k: "leak", v: loss, type: e.type });
      if (w.lives <= 0) { w.lives = 0; w.over = true; emit(w, { k: "lose" }); }
      return;
    }
    pos(w, e);
  }

  /* ---------- pouvoirs ---------- */
  function useAbility(w, t) {
    var a = t.st.ability;
    if (!a || t.acd > 0 || !w.running) return false;
    t.acd = a.cd;
    if (a.id === "frenzy") { t.buffT = a.dur; t.buffX = a.x; }
    if (a.id === "awaken") w.towers.forEach(function (o) { if (dist2(o.x, o.y, t.x, t.y) <= t.st.range * t.st.range) { o.buffT = a.dur; o.buffX = Math.max(o.buffX || 1, a.x); } });
    if (a.id === "meteor") {
      var best = null; w.enemies.forEach(function (e) { if (!e.dead && (!best || e.hp > best.hp)) best = e; });
      if (best) { var bx = best.x, by = best.y; damage(w, best, a.dmg, { bossMul: 1, bigMul: 1, ap: true }, t); explode(w, bx, by, { splash: a.r, dmg: a.dmg * 0.2, bossMul: 1, bigMul: 1, ap: true }, t, best); emit(w, { k: "meteor", x: bx, y: by }); }
    }
    if (a.id === "inferno") { w.enemies.forEach(function (e) { if (!e.dead) { e.burn = Math.max(e.burn, a.dps); e.burnT = Math.max(e.burnT, a.t); e.burnSrc = t; } }); emit(w, { k: "flash", col: "#ff7a2a" }); }
    if (a.id === "absolute") { w.enemies.forEach(function (e) { if (!e.dead) e.freezeT = Math.max(e.freezeT, e.d.boss ? a.t / 2 : a.t); }); emit(w, { k: "flash", col: "#bfe8ff" }); }
    if (a.id === "storm") { w.enemies.slice().forEach(function (e) { damage(w, e, a.dmg, { bossMul: 1, bigMul: 1, ap: true }, t); }); emit(w, { k: "storm" }); }
    if (a.id === "gust") { w.enemies.forEach(function (e) { if (!e.dead) { e.dist = Math.max(0, e.dist - (e.d.boss ? a.d * 0.35 : e.d.big ? a.d * 0.6 : a.d)); pos(w, e); } }); emit(w, { k: "flash", col: "#e0fff8" }); }
    if (a.id === "cash") { var v = a.base + a.per * w.round; w.cash += v; emit(w, { k: "coin", x: t.x, y: t.y, v: v }); }
    return true;
  }

  /* ---------- pas de simulation ---------- */
  function step(w, dt) {
    if (w.over) return;
    if (w.dirty) refresh(w);
    w.t += dt;
    if (!w.running) { w.towers.forEach(function (t) { if (t.buffT > 0) { t.buffT = 0; t.buffX = 1; } }); return; }
    w.rt += dt;
    while (w.queue.length && w.queue[0].t <= w.rt) { var q = w.queue.shift(); spawn(w, q.type, { camo: q.camo, lvl: q.lvl }); }
    // auras qui ralentissent / révèlent
    w.enemies.forEach(function (e) { e.aSlow = 0; e.exposed = 0; e.revealed = false; });
    w.towers.forEach(function (t) {
      var s = t.st;
      if (!s.auraSlow && !s.expose) return;
      var r2 = s.range * s.range;
      w.enemies.forEach(function (e) {
        if (dist2(e.x, e.y, t.x, t.y) > r2) return;
        if (s.auraSlow) e.aSlow = Math.max(e.aSlow, e.d.boss ? (s.bossSlow ? s.auraSlow * 0.8 : s.auraSlow * 0.4) : s.auraSlow);
        if (s.expose) { e.exposed = Math.max(e.exposed, s.expose); e.revealed = true; }
      });
    });
    for (var i = 0; i < w.enemies.length; i++) enemyStep(w, w.enemies[i], dt);
    for (i = 0; i < w.towers.length; i++) towerStep(w, w.towers[i], dt);
    for (i = 0; i < w.projs.length; i++) projStep(w, w.projs[i], dt);
    w.enemies = w.enemies.filter(function (e) { return !e.dead; });
    w.projs = w.projs.filter(function (p) { return !p.dead; });
    if (!w.over && !w.queue.length && !w.enemies.length) endRound(w);
  }

  root.TD_CORE = { createWorld: createWorld, step: step, place: place, placeError: placeError, upgrade: upgrade, canUpgrade: canUpgrade, upCost: upCost,
    pathLimit: pathLimit, sell: sell, sellValue: sellValue, towerCost: towerCost, cycleTarget: cycleTarget, startRound: startRound, useAbility: useAbility,
    roundSpec: roundSpec, hpMul: hpMul, pathPos: pathPos, mapById: mapById, modeById: modeById, refresh: refresh, TARGETS: TARGETS, inPoly: inPoly, buildPath: buildPath };
})(typeof window !== "undefined" ? window : globalThis);
