/* =========================================================================
   Arcane Tactics — IA tactique (monstres, boss, invocations, bots)

   Chaque décision est un petit plan : on énumère des suites d'actions
   (déplacement, sort, déplacement de repli), on note le résultat avec des
   valeurs lisibles (dégâts utiles, mort d'une cible, contrôle, position
   sûre selon le rôle) et on joue la PREMIÈRE action du meilleur plan. L'IA
   recalcule à chaque action : elle s'adapte à ce qui vient d'arriver.

   Elle ne triche jamais : elle n'utilise que ce que le joueur voit (positions,
   PV, états, portées) et passe par les mêmes règles que les joueurs
   (cases, obstacles, lignes de vue, PA, PM, temps de recharge).

   Rôles : kite (garde ses distances) · brute (fonce, bouscule) · teleport
   (disparaît et frappe dans le dos) · control (terrain, pièges) · disruptor
   (drains, malédictions) · skirm (frappe puis recule) · support · boss.
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE;
  if (!A || !A.I) return;
  var I = A.I, EXT = A.EXT, MS = A.MOB_SPELLS, MOBS = A.MOBS, SUMMONS = A.SUMMONS, SPELLS = A.SPELLS, CLASSES = A.CLASSES;
  var abs = Math.abs;
  function md(ax, ay, bx, by) { return abs(ax - bx) + abs(ay - by); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var HERO_ROLE = { bastion: "brute", prisme: "kite", voltige: "skirm", sibylle: "control", clarine: "support", orage: "brute", ondine: "kite" };

  /* ====================== ÉTAT DES UNITÉS ====================== */
  function splOf(u) { return u.summon ? SUMMONS[u.cls].spells : (u.spl || (MOBS[u.type] && MOBS[u.type].spells) || []); }
  EXT.onSpawn = function (w, u) {
    var M = MOBS[u.type], list = (M.spells || []).slice();
    if (u.affix === "elite" && M.elite) {
      if (M.elite.swap) list = list.map(function (s) { return M.elite.swap[s] || s; });
      if (M.elite.spells) list = list.concat(M.elite.spells);
      u.elite = true;
    }
    u.spl = list;
    if (M.boss) u.role = "boss";
  };
  // illusions : elles disparaissent seules (au bout de 2 tours ou si leur créateur tombe)
  var prevTurnStart = EXT.onTurnStart;
  EXT.onTurnStart = function (w, u) {
    if (prevTurnStart) prevTurnStart(w, u);
    var c = w.combat;
    if (u.illusion) {
      u.life--;
      var owner = I.unitAt ? null : null;
      var o = c.units.filter(function (x) { return x.id === u.ownerId; })[0];
      if (u.life <= 0 || !o || !o.alive) { u.alive = false; u.hp = 0; I.ev(w, { k: "die", id: u.id, quiet: true }); }
    }
  };

  /* ====================== CONTEXTE DE DÉCISION ====================== */
  function heroRange(f) {
    // portée "typique" d'un héros adverse : celle de ses sorts offensifs les plus forts
    var best = 0, rng = 1, list = A.unlockedSpells && CLASSES[f.cls] ? A.unlockedSpells(f.cls, f.lvl) : [];
    list.forEach(function (sid) { var S = SPELLS[sid]; if (S.dmg > best) best = S.dmg; });
    list.forEach(function (sid) {
      var S = SPELLS[sid]; if (!S.dmg || S.dmg < best * 0.6) return;
      var st = S.steps[0], r = st.shape === "self" ? 2 : st.range[1] + (st.boost ? (f.po || 0) : 0);
      if (r > rng) rng = r;
    });
    return rng;
  }
  function foeRange(f) {
    if (f.summon) { var m = 1; SUMMONS[f.cls].spells.forEach(function (s) { m = Math.max(m, MS[s].range[1]); }); return m; }
    if (!f.ai || f.bot || f.cls) return heroRange(f);
    var mx = 1; splOf(f).forEach(function (sid) { var S = MS[sid]; if (S && (S.dmg || S.telegraph)) mx = Math.max(mx, S.range[1] || 1); }); return mx;
  }
  function foePotential(f) {
    if (f.summon) return 10;
    if (f.ai && !f.bot) return 18;
    var best = 12; if (CLASSES[f.cls]) A.unlockedSpells(f.cls, f.lvl).forEach(function (sid) { var S = SPELLS[sid]; if (S.dmg) best = Math.max(best, S.dmg * (1 + Math.max(f.elem.terre, f.elem.feu, f.elem.eau, f.elem.air) / 100)); });
    return best * 1.3;
  }
  function buildCtx(w, u) {
    var c = w.combat, role = u.role || (u.cls && HERO_ROLE[u.cls]) || "brute";
    var foes = c.units.filter(function (o) { return o.alive && o.side !== u.side && !o.illusion; });
    var allFoes = c.units.filter(function (o) { return o.alive && o.side !== u.side; });
    var friends = c.units.filter(function (o) { return o.alive && o.side === u.side && o.id !== u.id && !o.illusion; });
    var ctx = { w: w, c: c, u: u, role: role, foes: foes, allFoes: allFoes, friends: friends, illusions: c.units.filter(function (o) { return o.alive && o.illusion && o.side === u.side; }).length };
    ctx.avgMax = foes.length ? foes.reduce(function (a, f) { return a + f.maxHp; }, 0) / foes.length : 1;
    // menace : où chaque adversaire peut frapper au prochain tour
    ctx.threat = foes.map(function (f) {
      var reach = A.reach(w, { x: f.x, y: f.y, pm: Math.max(0, f.maxPm - statusPm(f)), side: f.side, id: f.id });
      var cells = Object.keys(reach).map(function (k) { var p = k.split(","); return [+p[0], +p[1]]; });
      return { f: f, cells: cells, rng: foeRange(f), pot: foePotential(f) };
    });
    // priorité d'équipe : la cible que tous les monstres préfèrent ce tour-ci
    if (!c.focus || c.focus.round !== c.round) {
      var bestF = null, bs = -1;
      foes.forEach(function (f) { var s = (1 - f.hp / f.maxHp) * 2 + (f.summon ? -1 : 0.5) + (CLASSES[f.cls] && (f.cls === "clarine" || f.cls === "sibylle") ? 0.7 : 0) + (f.maxHp < ctx.avgMax ? 0.5 : 0) + Math.random() * 0.1; if (s > bs) { bs = s; bestF = f; } });
      c.focus = { round: c.round, id: bestF ? bestF.id : 0 };
    }
    ctx.focus = c.focus.id;
    ctx.aggr = clamp((c.round - 3) / 4, 0, 1);       // un combat qui s'éternise force les monstres à s'engager
    ctx.spells = (u.summon || u.ai && !u.bot ? splOf(u).map(function (id) { return MS[id]; }).filter(Boolean) : []);
    ctx.fc = foes.length ? [foes.reduce(function (a, f) { return a + f.x; }, 0) / foes.length, foes.reduce(function (a, f) { return a + f.y; }, 0) / foes.length] : [u.x, u.y];
    ctx.mc = friends.length ? [friends.reduce(function (a, f) { return a + f.x; }, 0) / friends.length, friends.reduce(function (a, f) { return a + f.y; }, 0) / friends.length] : [u.x, u.y];
    return ctx;
  }
  function statusPm(u) { var s = 0; u.status.forEach(function (st) { if (st.deb && (st.k === "slow" || st.k === "drainpm")) s += st.v; if (st.deb && st.k === "root") s += 99; }); return Math.min(s, 99); }
  function hasSt(u, k) { return u.status.some(function (s) { return s.k === k; }); }
  function prio(ctx, t) {
    var p = 1 + (1 - t.hp / t.maxHp) * 0.9;
    if (t.summon) p *= 0.55;
    if (t.cls && (t.cls === "clarine" || t.cls === "sibylle") && !t.summon) p *= 1.15;
    if (t.maxHp < ctx.avgMax * 0.85) p *= 1.12;
    if (ctx.focus === t.id) p *= 1.3;
    if (hasSt(t, "root") || hasSt(t, "slow")) p *= 1.1;
    return p;
  }
  function estDmg(u, S, t, P) {
    var base = S.dmg || 0; if (!base) return 0;
    var mul = 1 + (u.pow || 0) / 100;
    if (u.elem && S.el) mul = 1 + (u.elem[S.el] || 0) / 100;
    var res = clamp((t.res || 0) + I.statusSum(t, "res"), -50, 75);
    var d = base * mul * (1 - res / 100) + (u.dom || 0) * 0.5;
    var mk = P && P.marks && P.marks[t.id] ? P.marks[t.id] : 0; if (mk) d *= 1 + mk / 100;
    else t.status.forEach(function (s) { if (s.k === "mark" && s.by === u.id) d *= 1 + s.v / 100; });
    var vul = I.statusSum(t, "curse") + I.statusSum(t, "vuln") + (P && P.curses && P.curses[t.id] ? 25 : 0); if (vul) d *= 1 + vul / 100;
    return d;
  }

  /* ====================== VALEUR D'UNE POSITION ====================== */
  function risk(ctx, x, y) {
    var r = 0;
    ctx.threat.forEach(function (T) { for (var i = 0; i < T.cells.length; i++) if (md(T.cells[i][0], T.cells[i][1], x, y) <= T.rng) { r += T.pot; return; } });
    return r;
  }
  function nearestFoe(ctx, x, y) { var m = 99; ctx.foes.forEach(function (f) { var d = md(f.x, f.y, x, y); if (d < m) m = d; }); return m; }
  function maxRangeOf(ctx) { var m = 1; ctx.spells.forEach(function (S) { if (S.dmg || S.mark || S.fx) m = Math.max(m, S.range[1]); }); if (ctx.heroRng) m = Math.max(m, ctx.heroRng); return m; }
  function posValue(ctx, P) {
    var x = P.x, y = P.y, near = nearestFoe(ctx, x, y), rk = risk(ctx, x, y) * (1 - (ctx.aggr || 0)), role = ctx.role, v = 0, mr = maxRangeOf(ctx);
    var ideal = clamp(mr - 1, 3, 5);
    switch (role) {
      case "kite": v = -rk * 0.9 - abs(near - ideal) * 0.7 + (rk === 0 ? 6 : 0); break;
      case "teleport": v = -rk * 0.8 - abs(near - 3.5) * 0.5 + (rk === 0 ? 5 : 0); break;
      case "control": v = -rk * 0.75 - abs(near - 3.5) * 0.45 + (rk === 0 ? 4 : 0); break;
      case "disruptor": v = -rk * 0.6 - abs(near - 3) * 0.4; break;
      case "support": v = -rk * 0.85 + (rk === 0 ? 4 : 0) - (ctx.friends.length ? md(x, y, ctx.mc[0], ctx.mc[1]) * 0.25 : 0); break;
      case "skirm": v = -rk * 0.5 - near * 0.25 + (P.atk ? -rk * 0.3 : 0); break;
      case "boss": v = -near * 0.4; break;
      default: v = -rk * 0.05 - near * 1.5 + (near <= 1 ? 2 : 0);
    }
    // dangers connus : attaques annoncées et zones au sol adverses (les joueurs les voient, l'IA aussi)
    (ctx.c.tele || []).forEach(function (tl) { var by = ctx.c.units.filter(function (o) { return o.id === tl.by; })[0]; if (by && by.side !== ctx.u.side && tl.cells.some(function (q) { return q[0] === x && q[1] === y; })) v -= tl.dmg * 0.9 + (tl.push ? 6 : 0); });
    var hzp = I.hazardFor(ctx.c, x, y, ctx.u); if (hzp) v -= hzp.kind === "glue" ? 9 : 11;
    // les brutes protègent leurs tireurs : se placer entre l'ennemi le plus proche et un allié fragile
    if (role === "brute") ctx.friends.forEach(function (fr) { if (fr.role === "kite" || fr.role === "support" || fr.role === "control" || fr.role === "teleport") ctx.foes.forEach(function (f) { if (md(x, y, f.x, f.y) + md(x, y, fr.x, fr.y) <= md(f.x, f.y, fr.x, fr.y) + 1) v += 1.6; }); });
    // flanquer : le spectre aime se retrouver derrière les héros
    if (role === "teleport" && ctx.friends.length) { var dx = ctx.fc[0] - ctx.mc[0], dy = ctx.fc[1] - ctx.mc[1], n = Math.max(1, abs(dx) + abs(dy)); var proj = ((x - ctx.fc[0]) * dx + (y - ctx.fc[1]) * dy) / n; if (proj > 0.5) v += 2.5; }
    // couvert : une case sans ligne de vue pour la plupart des adversaires
    if (role === "kite" || role === "teleport") { var seen = 0; ctx.foes.forEach(function (f) { if (md(f.x, f.y, x, y) <= foeRange(f) + 1 && I.losFrom(ctx.c, ctx.u, x, y, f.x, f.y)) seen++; }); v -= seen * 0.8; }
    return v;
  }

  /* ====================== ÉTAT SIMULÉ ====================== */
  function initP(ctx) {
    var u = ctx.u, hp = {}, ahp = {};
    ctx.foes.forEach(function (f) { hp[f.id] = f.hp + f.shield.reduce(function (s, q) { return s + q.v; }, 0); });
    ctx.friends.forEach(function (f) { ahp[f.id] = f.hp; });
    return { x: u.x, y: u.y, pa: u.pa, pm: u.pm - Math.min(0, 0), moves: u.mv || 0, atk: u.atk || 0, hp: hp, ahp: ahp, cds: {}, used: {}, marks: {}, curses: {}, hz: [], nsum: 0, buffed: {}, ill: 0, selfHp: u.hp };
  }
  function cloneP(P) { return { x: P.x, y: P.y, pa: P.pa, pm: P.pm, moves: P.moves, atk: P.atk, hp: Object.assign({}, P.hp), ahp: Object.assign({}, P.ahp), cds: Object.assign({}, P.cds), used: Object.assign({}, P.used), marks: Object.assign({}, P.marks), curses: Object.assign({}, P.curses), hz: P.hz.slice(), nsum: P.nsum, buffed: Object.assign({}, P.buffed), ill: P.ill, selfHp: P.selfHp }; }
  function inRng(S, fx, fy, tx, ty) { return I.shapeOk({ shape: S.shape, range: S.range }, tx - fx, ty - fy, 0); }
  function teleCells(c, area, cx, cy) {
    var out;
    if (area === "plus") out = I.plus(cx, cy);
    else if (area === "disc1") out = I.disc(c, cx, cy, 1);
    else if (area === "disc2") out = I.disc(c, cx, cy, 2);
    else if (area === "cross2") { out = []; for (var i = -2; i <= 2; i++) { out.push([cx + i, cy]); if (i) out.push([cx, cy + i]); } }
    else out = [[cx, cy]];
    return out.filter(function (q) { return I.inArena(c, q[0], q[1]); });
  }
  function adjFree(ctx, f, exclude) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { return [f.x + d[0], f.y + d[1]]; }).filter(function (q) { return I.cellFree(ctx.c, q[0], q[1], ctx.u) && !I.hazardFor(ctx.c, q[0], q[1], ctx.u); });
  }
  // où atterrit une cible poussée / attirée (simulation sans effet)
  function simKnock(ctx, t, ox, oy, dist, pull) {
    var dx = Math.sign(t.x - ox), dy = Math.sign(t.y - oy);
    if (pull) { dx = -dx; dy = -dy; }
    if (dx && dy) { if (abs(t.x - ox) >= abs(t.y - oy)) dy = 0; else dx = 0; }
    var x = t.x, y = t.y, moved = 0;
    if (!dx && !dy) return { x: x, y: y, moved: 0, blocked: 0 };
    for (var i = 0; i < dist; i++) { var nx = x + dx, ny = y + dy; if (pull && nx === ox && ny === oy) break; if (!I.cellFree(ctx.c, nx, ny)) break; x = nx; y = ny; moved++; }
    return { x: x, y: y, moved: moved, blocked: pull ? 0 : dist - moved };
  }
  function bestFollowDmg(ctx, P, f) {
    var best = 0;
    ctx.spells.forEach(function (S) { if (!S.dmg || S.pa > P.pa) return; if ((P.cds[S.id] != null ? P.cds[S.id] : ctx.u.cds[S.id] || 0) > 0) return; if (S.tgt !== "foe") return; best = Math.max(best, estDmg(ctx.u, S, f, P)); });
    return best;
  }

  /* ====================== VALEUR D'UN SORT DE MONSTRE ====================== */
  function evalCast(ctx, P, S, spec) {
    var u = ctx.u, c = ctx.c, v = 0, P2 = cloneP(P), f = spec.f;
    P2.pa -= S.pa; P2.atk++;
    if (S.cd) P2.cds[S.id] = S.cd + 1;
    var cd0 = S.cd; if (u.elite && u.type === "chatmasque" && S.id === "bondfelin") P2.cds[S.id] = 0;
    // déplacement du lanceur
    if (spec.dest) { P2.x = spec.dest[0]; P2.y = spec.dest[1]; }
    var pr = f ? prio(ctx, f) : 1;
    if (f && S.dmg && S.tgt === "foe") {
      var d = estDmg(u, S, f, P), real = Math.min(d, P.hp[f.id] || 0);
      v += real * pr;
      if (d >= (P.hp[f.id] || 0)) v += 16 + f.maxHp * 0.12;
      P2.hp[f.id] = Math.max(0, (P.hp[f.id] || 0) - d);
      if (P.marks[f.id]) delete P2.marks[f.id];
      if (S.shock) ctx.foes.forEach(function (o) { if (o !== f && md(o.x, o.y, P2.x, P2.y) <= S.shock.r) v += S.shock.dmg * prio(ctx, o) * 0.8; });
    }
    if (f && S.fx) S.fx.forEach(function (x) {
      if (x.k === "drainpa") v += 7 * pr * (f.maxPa >= 6 ? 1 : 0.7);
      else if (x.k === "drainpm") v += 5 * pr * (CLASSES[f.cls] && (f.cls === "bastion" || f.cls === "voltige" || f.cls === "orage") ? 1.4 : 1);
      else if (x.k === "dot") v += x.v * x.turns * 0.65 * pr;
      else if (x.k === "root") v += 9 * pr;
      else if (x.k === "slow") v += 6 * pr;
      else if (x.k === "curse") { if (P.curses[f.id] || hasSt(f, "curse")) v -= 20; else { v += 9 + 4 * ctx.friends.length; P2.curses[f.id] = 1; } }
    });
    if (f && S.mark) {
      if (P.marks[f.id] || f.status.some(function (s) { return s.k === "mark" && s.by === u.id; })) v -= 20;
      else {
        var fd = bestFollowDmg(ctx, P2, f);
        v += (fd > 0 ? 0.8 * fd * (S.mark.v / 100) * pr : 1);
        P2.marks[f.id] = S.mark.v;
      }
    }
    if (f && (S.push || S.pull) && S.tgt === "foe") {
      var from = spec.dest || [P.x, P.y];
      var kn = simKnock(ctx, f, from[0], from[1], S.push || S.pull, !!S.pull);
      if (S.push) {
        v += kn.blocked * (S.slam || 9) * 1.2 * pr;
        // zone au sol alliée à l'arrivée
        var hz = I.hazardAt(c, kn.x, kn.y); if (hz && hz.side === u.side) v += hz.kind === "glue" ? 10 : 13;
        // éloigner un adversaire de ses coéquipiers (séparer le duo) ou de mes tireurs
        ctx.foes.forEach(function (o) { if (o !== f) v += (md(kn.x, kn.y, o.x, o.y) - md(f.x, f.y, o.x, o.y)) * 1.2; });
        ctx.friends.forEach(function (fr) { if (fr.role === "kite" || fr.role === "support") v += (md(kn.x, kn.y, fr.x, fr.y) - md(f.x, f.y, fr.x, fr.y)) * 0.7; });
        if (kn.moved === 0 && kn.blocked === 0) v -= 3;
      } else { v += 2 + (kn.moved ? 3 : -4); }
      var fd2 = f; P2.pushed = { id: f.id };
    }
    if (S.selfHeal) v += Math.min(S.selfHeal, u.maxHp - u.hp) * 0.6;
    // zones au sol, murs, pièges
    if (S.hazard || S.silk || S.telegraph || S.illusion || S.ring) {
      var cx = spec.cx, cy = spec.cy;
      if (S.hazard) {
        var cells = S.hazard.area === "plus" ? I.plus(cx, cy) : [[cx, cy]];
        cells.forEach(function (q) {
          if (!I.groundOk(c, q[0], q[1]) || I.hazardAt(c, q[0], q[1])) return;
          ctx.foes.forEach(function (o) { var dd = md(o.x, o.y, q[0], q[1]); if (dd === 0) v += (S.hazard.kind === "glue" ? 9 : 11) * prio(ctx, o); else if (dd === 1) v += 3 * prio(ctx, o); });
          ctx.friends.forEach(function (fr) { ctx.foes.forEach(function (o) { if (md(q[0], q[1], o.x, o.y) + md(q[0], q[1], fr.x, fr.y) <= md(o.x, o.y, fr.x, fr.y) + 1 && (fr.role === "kite" || fr.role === "support")) v += 0.8; }); });
        });
        P2.hz.push([cx, cy]);
      }
      if (S.silk) {
        var sc = silkCells(ctx, cx, cy, S.silk.n);
        sc.forEach(function (q) {
          ctx.friends.forEach(function (fr) { ctx.foes.forEach(function (o) { if (md(q[0], q[1], o.x, o.y) + md(q[0], q[1], fr.x, fr.y) <= md(o.x, o.y, fr.x, fr.y) + 1) v += 1.8; }); });
          if (ctx.foes.length >= 2) { var a = ctx.foes[0], b = ctx.foes[1]; if (md(q[0], q[1], a.x, a.y) + md(q[0], q[1], b.x, b.y) <= md(a.x, a.y, b.x, b.y) + 1) v += 3.5; }
        });
        if (!sc.length) v -= 30;
      }
      if (S.telegraph) {
        var cells2 = teleCells(c, S.telegraph.area, cx, cy), dmgT = S.telegraph.dmg * (1 + (u.pow || 0) / 100);
        ctx.foes.forEach(function (o) { if (cells2.some(function (q) { return q[0] === o.x && q[1] === o.y; })) { v += dmgT * 0.55 * prio(ctx, o); v += 3; } });
        // une attaque annoncée gêne même quand elle est esquivée : elle oblige à bouger
        if (S.telegraph.exhaust) v -= 4;
        if (!ctx.foes.some(function (o) { return cells2.some(function (q) { return q[0] === o.x && q[1] === o.y; }); })) v -= 12;
      }
      if (S.illusion) { v += ctx.illusions + P.ill < 2 ? 7 * S.illusion.n : 0; P2.ill += S.illusion.n; }
      if (S.ring) { ctx.foes.forEach(function (o) { if (md(o.x, o.y, u.x, u.y) <= 2) v += 9 * prio(ctx, o); }); }
    }
    if (S.summon) { var n = S.n || 1; v += (ctx.friends.length + P.nsum < 5 ? 14 * n : 0); P2.nsum += n; }
    if (f && S.buff) { // renforcer un allié qui n'a pas encore joué
      var af = f; if (P.buffed[af.id] || af.status.some(function (s) { return s.k === S.buff.k && s.by === u.id; })) v -= 20;
      else { v += 8 + (af.maxPa >= 5 ? 4 : 0) + (af.role === "support" ? -5 : 0); P2.buffed[af.id] = 1; }
    }
    if (f && S.heal) { var miss = (f.maxHp - (P.ahp[f.id] != null ? P.ahp[f.id] : f.hp)); v += Math.min(miss, S.heal * 1.2) * 0.9; if (miss <= 0) v -= 30; P2.ahp[f.id] = Math.min(f.maxHp, (P.ahp[f.id] || f.hp) + S.heal); }
    // un sort qui ne sert à rien ne doit pas être lancé
    if (v < 0.01 && !spec.dest) v = -5;
    return { val: v, P2: P2 };
  }
  function silkCells(ctx, cx, cy, n) {
    var out = [], c = ctx.c;
    if (I.cellFree(c, cx, cy) && !I.hazardAt(c, cx, cy)) out.push([cx, cy]);
    var side = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < side.length && out.length < n; i++) { var q = [cx + side[i][0], cy + side[i][1]]; if (I.cellFree(c, q[0], q[1]) && !I.hazardAt(c, q[0], q[1])) out.push(q); }
    return out;
  }

  /* ====================== ÉNUMÉRATION DES ACTIONS ====================== */
  function spellReady(ctx, P, S) {
    if (S.pa > P.pa) return false;
    var cd = P.cds[S.id] != null ? P.cds[S.id] : (ctx.u.cds[S.id] || 0);
    return cd <= 0;
  }
  function genActions(ctx, P) {
    var u = ctx.u, c = ctx.c, out = [];
    ctx.spells.forEach(function (S) {
      if (!spellReady(ctx, P, S)) return;
      var kind = S.tgt;
      if (kind === "foe") {
        ctx.foes.forEach(function (f) {
          if ((P.hp[f.id] || 0) <= 0) return;
          var dd = md(P.x, P.y, f.x, f.y);
          if (S.tp && S.tp.adjacent) {
            if (dd < S.range[0] || dd > S.range[1]) return;
            adjFree(ctx, f).filter(function (q) { return md(P.x, P.y, q[0], q[1]) <= S.tp.range; }).forEach(function (q) {
              var r = evalCast(ctx, P, S, { f: f, dest: q, cx: q[0], cy: q[1] });
              out.push({ kind: "cast", S: S, x: q[0], y: q[1], ax: f.x, ay: f.y, val: r.val, P2: r.P2 });
            });
            return;
          }
          if (S.dash) {
            if (!inRng(S, P.x, P.y, f.x, f.y) || !I.losFrom(c, u, P.x, P.y, f.x, f.y)) return;
            var dx = Math.sign(f.x - P.x), dy = Math.sign(f.y - P.y), q = [f.x - dx, f.y - dy];
            if (!I.cellFree(c, q[0], q[1], u) && !(q[0] === P.x && q[1] === P.y)) return;
            var r2 = evalCast(ctx, P, S, { f: f, dest: q, cx: q[0], cy: q[1] });
            out.push({ kind: "cast", S: S, x: q[0], y: q[1], ax: f.x, ay: f.y, val: r2.val, P2: r2.P2 });
            return;
          }
          if (!inRng(S, P.x, P.y, f.x, f.y)) return;
          if (S.los && !I.losFrom(c, u, P.x, P.y, f.x, f.y)) return;
          var r3 = evalCast(ctx, P, S, { f: f, cx: f.x, cy: f.y });
          out.push({ kind: "cast", S: S, x: f.x, y: f.y, ax: f.x, ay: f.y, val: r3.val, P2: r3.P2 });
        });
      } else if (kind === "ally") {
        ctx.friends.forEach(function (fr) {
          if (fr.hp <= 0 || fr.illusion) return;
          if (!inRng(S, P.x, P.y, fr.x, fr.y) || (S.los && !I.losFrom(c, u, P.x, P.y, fr.x, fr.y))) return;
          var r = evalCast(ctx, P, S, { f: fr, cx: fr.x, cy: fr.y });
          out.push({ kind: "cast", S: S, x: fr.x, y: fr.y, val: r.val, P2: r.P2 });
        });
      } else if (kind === "self") {
        var r4 = evalCast(ctx, P, S, { cx: P.x, cy: P.y });
        out.push({ kind: "cast", S: S, x: P.x, y: P.y, val: r4.val, P2: r4.P2 });
      } else if (kind === "enemycell") {
        ctx.foes.forEach(function (f) { var r = evalCast(ctx, P, S, { f: null, cx: f.x, cy: f.y }); out.push({ kind: "cast", S: S, x: f.x, y: f.y, val: r.val, P2: r.P2 }); });
      } else if (kind === "cell") {
        cellCands(ctx, P, S).forEach(function (q) {
          if (S.tp && !S.tp.adjacent) {                        // téléportation libre
            var rt = evalCast(ctx, P, S, { dest: q, cx: q[0], cy: q[1] });
            out.push({ kind: "cast", S: S, x: q[0], y: q[1], val: rt.val + 0, P2: rt.P2 });
            return;
          }
          var r = evalCast(ctx, P, S, { cx: q[0], cy: q[1] });
          out.push({ kind: "cast", S: S, x: q[0], y: q[1], val: r.val, P2: r.P2 });
        });
      }
    });
    // déplacements : un avant d'attaquer, un seul de repli après
    if (P.pm > 0 && (P.moves === 0 || (P.atk > 0 && P.moves === 1))) {
      var reach = A.reach(ctx.w, { x: P.x, y: P.y, pm: P.pm, side: u.side, id: u.id });
      var cand = [];
      Object.keys(reach).forEach(function (k) {
        if (!reach[k]) return;
        var p = k.split(","), x = +p[0], y = +p[1];
        var Pq = { x: x, y: y, atk: P.atk }, sc = posValue(ctx, Pq) + attackPotential(ctx, P, x, y) * 2.2 - reach[k] * 0.05;
        cand.push({ x: x, y: y, d: reach[k], sc: sc });
      });
      cand.sort(function (a, b) { return b.sc - a.sc; });
      cand.slice(0, 5).forEach(function (q) { var P2 = cloneP(P); P2.x = q.x; P2.y = q.y; P2.pm -= q.d; P2.moves++; out.push({ kind: "move", x: q.x, y: q.y, val: -0.05 * q.d, P2: P2 }); });
    }
    return out;
  }
  function attackPotential(ctx, P, x, y) {
    var n = 0;
    ctx.spells.forEach(function (S) {
      if (S.tgt !== "foe" || !(S.dmg || S.mark || S.fx) || S.pa > P.pa) return;
      for (var i = 0; i < ctx.foes.length; i++) { var f = ctx.foes[i]; if (S.tp || S.dash) { if (md(x, y, f.x, f.y) <= (S.tp ? S.tp.range : S.range[1]) + 1) { n += 0.5; break; } continue; } if (inRng(S, x, y, f.x, f.y) && (!S.los || I.losFrom(ctx.c, ctx.u, x, y, f.x, f.y))) { n++; break; } }
    });
    return n;
  }
  function cellCands(ctx, P, S) {
    var c = ctx.c, out = [], seen = {};
    function add(q) { var k = q[0] + "," + q[1]; if (seen[k] || !I.inArena(c, q[0], q[1])) return; seen[k] = 1; out.push(q); }
    if (S.tp && !S.tp.adjacent) {
      for (var x = 0; x < c.arena.w; x++) for (var y = 0; y < c.arena.h; y++) {
        if (md(P.x, P.y, x, y) > S.tp.range || (x === P.x && y === P.y)) continue;
        if (!I.cellFree(c, x, y, ctx.u) || I.hazardFor(c, x, y, ctx.u)) continue;
        out.push([x, y]);
      }
      var sc = out.map(function (q) { return { q: q, s: posValue(ctx, { x: q[0], y: q[1], atk: P.atk }) + attackPotential(ctx, P, q[0], q[1]) * 2.2 }; });
      sc.sort(function (a, b) { return b.s - a.s; });
      return sc.slice(0, 6).map(function (o) { return o.q; });
    }
    if (S.illusion) {
      for (var ix = 0; ix < c.arena.w; ix++) for (var iy = 0; iy < c.arena.h; iy++) { var dd = md(P.x, P.y, ix, iy); if (dd >= S.range[0] && dd <= S.range[1] && I.cellFree(c, ix, iy, ctx.u)) add([ix, iy]); }
      out.sort(function (a, b) { return md(b[0], b[1], ctx.fc[0], ctx.fc[1]) - md(a[0], a[1], ctx.fc[0], ctx.fc[1]); });
      return out.slice(0, 3);
    }
    ctx.foes.forEach(function (f) {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var q = [f.x + d[0], f.y + d[1]];
        if (!I.inArena(c, q[0], q[1]) || !I.groundOk(c, q[0], q[1])) return;
        if (!inRng(S, P.x, P.y, q[0], q[1])) return;
        if (S.los && !I.losFrom(c, ctx.u, P.x, P.y, q[0], q[1])) return;
        if (S.silk && (!I.cellFree(c, q[0], q[1]))) return;
        add(q);
      });
    });
    return out;
  }

  /* ====================== RECHERCHE ====================== */
  function search(ctx, P, depth, budget) {
    var best = { total: posValue(ctx, P), seq: [] };
    if (depth <= 0 || budget.n <= 0) return best;
    var acts = ctx.gen(ctx, P);
    var casts = acts.filter(function (a) { return a.kind === "cast"; }).sort(function (a, b) { return b.val - a.val; }).slice(0, 5);
    var moves = acts.filter(function (a) { return a.kind === "move"; }).sort(function (a, b) { return posValue(ctx, b.P2) - posValue(ctx, a.P2); }).slice(0, 4);
    casts.concat(moves).forEach(function (a) {
      if (a.val <= -4 && a.kind === "cast") return;
      budget.n--;
      var r = search(ctx, a.P2, depth - 1, budget);
      var tot = a.val + r.total;
      if (tot > best.total + 1e-6) best = { total: tot, seq: [a].concat(r.seq) };
    });
    return best;
  }

  // quand aucun plan ne frappe : se rapprocher (ou se placer à bonne distance de tir) plutôt que d'attendre
  function advance(ctx, P0) {
    var u = ctx.u, reach = A.reach(ctx.w, { x: u.x, y: u.y, pm: u.pm, side: u.side, id: u.id });
    if (P0.moves > 0 || u.pm <= 0) return null;
    var role = ctx.role, ideal = clamp(maxRangeOf(ctx) - 1, 2, 5), best = null;
    var cur = nearestFoe(ctx, u.x, u.y), curSc = -abs(cur - (role === "brute" || role === "skirm" || role === "boss" ? 1 : ideal)) * 1.0;
    Object.keys(reach).forEach(function (k) {
      if (!reach[k]) return;
      var p = k.split(","), x = +p[0], y = +p[1], near = nearestFoe(ctx, x, y);
      var want = role === "brute" || role === "skirm" || role === "boss" ? 1 : ideal;
      var sc = -abs(near - want) * 1.0 - risk(ctx, x, y) * 0.02 - reach[k] * 0.01 + (ctx.hspells ? heroAttackPotential(ctx, P0, x, y) : attackPotential(ctx, P0, x, y)) * 4;
      if (!best || sc > best.sc) best = { sc: sc, x: x, y: y };
    });
    return best && best.sc > curSc + 0.4 ? best : null;
  }
  /* ====================== DÉCISION ET EXÉCUTION (MONSTRES) ====================== */
  function aiStep(w) {
    var c = w.combat, u = I.active ? null : null;
    u = A.active(c);
    if (!u || !u.ai) return null;
    if (u.illusion) return null;
    if (u.bot) return botStep(w, u);
    if (u.pa <= 0 && u.pm <= 0) return null;
    var ctx = buildCtx(w, u);
    if (!ctx.foes.length) return null;
    ctx.gen = genActions;
    var P0 = initP(ctx);
    var base = posValue(ctx, P0);
    var plan = search(ctx, P0, 4, { n: 900 });
    if (!plan.seq.length || plan.total < base + 0.4) { var adv = advance(ctx, P0); return adv ? { t: "mmove", x: adv.x, y: adv.y } : null; }
    var a = plan.seq[0];
    if (a.kind === "move") return { t: "mmove", x: a.x, y: a.y };
    return { t: "mcast", s: a.S.id, x: a.x, y: a.y, ax: a.ax, ay: a.ay };
  }
  function aiDo(w, a) {
    var c = w.combat, u = A.active(c);
    if (!u) return 0.2;
    if (!a) { I.endTurn(w); return 0.25; }
    if (a.t === "mmove") {
      var p = I.combatPath(c, u, a.x, a.y, u.pm);
      if (!p || !I.moveUnit(w, u, a.x, a.y)) { I.endTurn(w); return 0.25; }
      u.mv = (u.mv || 0) + 1;
      return 0.16 * p.length + 0.2;
    }
    if (a.t === "hcast") return heroCast(w, u, a);
    return castMob(w, u, a.s, a.x, a.y, a.ax, a.ay);
  }
  function snap(c) { return c.units.map(function (o) { return [o, o.x, o.y]; }); }
  function afterMoves(w, before) { before.forEach(function (e) { if (e[0].alive && (e[0].x !== e[1] || e[0].y !== e[2])) I.triggerHazards(w, e[0], "enter"); }); }
  function castMob(w, u, sid, x, y, ax, ay) {
    var c = w.combat, S = MS[sid], tx = ax != null ? ax : x, ty = ay != null ? ay : y;
    if (!S || S.pa > u.pa) { I.endTurn(w); return 0.2; }
    u.pa -= S.pa; u.curEl = S.el || null; u.atk = (u.atk || 0) + 1;
    var cd = S.cd; if (u.elite && u.type === "chatmasque" && sid === "bondfelin") cd = 0;
    if (cd) u.cds[sid] = cd + 1;
    var tu = I.unitAt(c, tx, ty);
    if (tu && tu !== u) u.face = I.faceOf(tu.x - u.x, tu.y - u.y);
    I.ev(w, { k: "cast", id: u.id, s: sid, tg: [[tx, ty]], mob: true, col: S.col, fx0: S.fx0, name: S.name });
    var before = snap(c), delay = 0.8;
    // --- mouvements du lanceur
    if (S.tp) {
      var from = [u.x, u.y];
      I.teleport(w, u, x, y, S.tp.adjacent ? "ghost" : "tri");
      if (S.tp.adjacent && tu) u.face = I.faceOf(tu.x - u.x, tu.y - u.y);
      delay = 0.7;
    } else if (S.dash) {
      var from2 = [u.x, u.y]; u.x = x; u.y = y; I.ev(w, { k: "dash", id: u.id, from: from2, to: [x, y] }); I.triggerHazards(w, u, "enter");
    }
    // --- zones, murs, pièges, illusions
    if (S.hazard) {
      var cells = S.hazard.area === "plus" ? I.plus(x, y) : [[x, y]], made = [];
      cells.forEach(function (q) { if (I.groundOk(c, q[0], q[1]) && !I.hazardAt(c, q[0], q[1])) { c.hazards.push({ x: q[0], y: q[1], kind: S.hazard.kind, turns: S.hazard.turns, by: u.id, side: u.side, dmg: 8 }); made.push([q[0], q[1], S.hazard.kind]); } });
      I.ev(w, { k: "hazard", cells: made, from: [u.x, u.y] });
      cells.forEach(function (q) { var t = I.unitAt(c, q[0], q[1]); if (t && t.side !== u.side) I.triggerHazards(w, t, "enter"); });
      delay = 0.7;
    }
    if (S.silk) {
      var sc = silkCells({ c: c }, x, y, S.silk.n);
      sc.forEach(function (q) { c.objects.push({ kind: "silk", x: q[0], y: q[1], by: u.id, side: u.side, turns: S.silk.turns }); });
      I.ev(w, { k: "silk", cells: sc, from: [u.x, u.y] });
    }
    if (S.telegraph) {
      var T = S.telegraph, tc = teleCells(c, T.area, x, y);
      c.tele.push({ by: u.id, cells: tc, dmg: Math.round(T.dmg * (1 + (u.pow || 0) / 100)), kind: T.kind || "slam", push: T.push, slam: T.slam, fx: T.fx, cx: x, cy: y, hazard: T.hazard, after: T.exhaust ? [{ exhaust: T.exhaust }] : null, name: S.name });
      I.ev(w, { k: "tele", cells: tc, kind: T.kind || "slam", push: !!T.push, cx: x, cy: y, name: S.name });
    }
    if (S.illusion) {
      var spots = [[x, y]].concat(I.disc(c, x, y, 2)).filter(function (q) { return I.cellFree(c, q[0], q[1]); });
      var made2 = 0;
      for (var i = 0; i < spots.length && made2 < S.illusion.n; i++) {
        var q = spots[i];
        if (!I.cellFree(c, q[0], q[1])) continue;
        var m = I.addMob(c, u.type, u.lvl, null, q[0], q[1], true);
        m.illusion = true; m.hp = m.maxHp = 1; m.pa = m.maxPa = 0; m.pm = m.maxPm = 0; m.name = "Illusion"; m.life = S.illusion.turns; m.ownerId = u.id; m.spl = [];
        c.order.splice(c.turn + 1, 0, m.id); I.ev(w, { k: "summon", id: m.id, ghost: true }); made2++;
      }
    }
    if (S.summon) {
      var ring = I.ring8(c, u.x, u.y).filter(function (q) { return I.cellFree(c, q[0], q[1]); }), k = 0;
      for (var j = 0; j < ring.length && k < (S.n || 2); j++) { if (!I.cellFree(c, ring[j][0], ring[j][1])) continue; var m2 = I.addMob(c, S.summon, Math.max(1, u.lvl - 2), null, ring[j][0], ring[j][1], true); c.order.splice(c.turn + 1, 0, m2.id); I.ev(w, { k: "summon", id: m2.id }); k++; }
    }
    if (S.ring) { A.BESTIARY.ringHazard(w, u, S.ring); }
    // --- effets sur la cible
    var t = tu && tu.alive ? tu : null;
    if (t && S.tgt === "ally") {
      if (S.buff) { t.status.push({ k: S.buff.k, v: S.buff.v, by: u.id, turns: 1, name: "Renforcé" }); I.ev(w, { k: "buff", id: t.id, text: "Renforcé !" }); }
      if (S.allyPm) { t.pm += S.allyPm; }
      if (S.heal) I.heal(w, u, t, S.heal);
      if (S.shield) I.addShield(w, u, t, S.shield);
    } else if (t && S.tgt === "foe" && t.side !== u.side) {
      if (S.shape !== "self" && (S.range[1] > 1 || S.tp)) I.ev(w, { k: "beam", from: [u.x, u.y], to: [t.x, t.y], col: S.col || "#c77dff", mob: true, kind: S.fx0, soft: !S.dmg });
      if (S.dmg) I.damage(w, u, t, S.dmg);
      if (t.alive && S.mark) I.applyStatus(w, t, { k: "mark", v: S.mark.v, turns: S.mark.turns, by: u.id, name: "Marque" });
      if (t.alive && S.fx) S.fx.forEach(function (f) { I.applyStatus(w, t, { k: f.k, v: f.v, turns: f.turns, by: u.id, name: f.name || f.k }); });
      if (t.alive && S.push) { I.knock(w, u, t, u.x, u.y, S.push, false, { slam: S.slam }); }
      if (t.alive && S.pull) I.knock(w, u, t, u.x, u.y, S.pull, true);
      if (S.selfHeal) I.heal(w, u, u, S.selfHeal, true);
      if (S.shock) I.ring8(c, u.x, u.y).forEach(function (q) { var o = I.unitAt(c, q[0], q[1]); if (o && o.side !== u.side) { I.damage(w, u, o, S.shock.dmg, { push: true, noFirst: true }); } });
      if (S.shock) I.ev(w, { k: "nova", at: [u.x, u.y], r: 1, col: "#ff9a3c" });
    }
    afterMoves(w, before);
    I.afterAction(w);
    return delay;
  }

  /* ====================== IA DES HÉROS (bots, duels, tests) ====================== */
  // On réutilise la même recherche avec les sorts de classe : chaque sort est décrit par ses
  // champs (dmg, heal, shield, push, pull, area, summon…) et ses cases valides viennent du moteur.
  var SKIP = { transpo: 1, balise: 1, mur: 1, roque: 1, brume: 1, rafale0: 1 };
  function heroSpells(u) { return A.unlockedSpells(u.cls, u.lvl).filter(function (sid) { return !SKIP[sid] && !(u.badSpell && u.badSpell[sid]); }); }
  function withPos(u, P, fn) { var ox = u.x, oy = u.y, op = u.pa; u.x = P.x; u.y = P.y; var r = fn(); u.x = ox; u.y = oy; return r; }
  function heroCasts(ctx, P) {
    var u = ctx.u, w = ctx.w, out = [];
    ctx.hspells.forEach(function (sid) {
      var S = SPELLS[sid];
      if (S.pa > P.pa) return;
      var cd = P.cds[sid] != null ? P.cds[sid] : (u.cds[sid] || 0); if (cd > 0) return;
      if ((S.perTurn || 99) <= (P.used[sid] || 0) + (u.used[sid] || 0) * 0) return;
      if (S.perTurn && (P.used[sid] || 0) >= S.perTurn) return;
      if (S.summon && (ctx.mySum + P.nsum) >= 3) return;
      if (sid === "menagerie" && ctx.mySum >= 3) return;
      if (sid === "benanimale" && !ctx.mySum) return;
      var tgs = withPos(u, P, function () { try { return A.targets(w, u, sid, []); } catch (e) { return []; } });
      var st = S.steps[0], cap = 14;
      if (tgs.length > cap) { tgs = tgs.map(function (q) { return { q: q, k: nearestFoe(ctx, q[0], q[1]) }; }).sort(function (a, b) { return a.k - b.k; }).slice(0, cap).map(function (o) { return o.q; }); }
      tgs.forEach(function (q) {
        var r = evalHero(ctx, P, sid, S, q);
        if (r) out.push({ kind: "cast", hs: sid, S: S, x: q[0], y: q[1], val: r.val, P2: r.P2 });
      });
    });
    return out;
  }
  function evalHero(ctx, P, sid, S, q) {
    var u = ctx.u, w = ctx.w, c = ctx.c, v = 0, P2 = cloneP(P);
    P2.pa -= S.pa; P2.atk++; P2.used[sid] = (P2.used[sid] || 0) + 1;
    if (S.cd) P2.cds[sid] = S.cd + 1;
    var aff = withPos(u, P, function () { try { return A.area(w, u, sid, [q]); } catch (e) { return [q]; } });
    var mul = u.elem && S.el ? 1 + (u.elem[S.el] || 0) / 100 : 1;
    // sorts de déplacement
    if (sid === "bond" || sid === "danse" || sid === "fantome") { P2.x = q[0]; P2.y = q[1]; if (sid === "fantome") { var tf = I.unitAt(c, q[0], q[1]); if (tf) { var dx = Math.sign(tf.x - P.x), dy = Math.sign(tf.y - P.y); var b = [tf.x + dx, tf.y + dy]; if (I.cellFree(c, b[0], b[1], u)) { P2.x = b[0]; P2.y = b[1]; } } } v -= 1; }
    var foeSeen = {};
    aff.forEach(function (cell) {
      var t = I.unitAt(c, cell[0], cell[1]); if (!t || foeSeen[t.id]) return; foeSeen[t.id] = 1;
      if (t.side !== u.side) {
        if (t.illusion) { v += 0.3; return; }
        if (S.dmg) {
          var d = S.dmg * mul * (1 - clamp(t.res || 0, 0, 75) / 100) + (u.dom || 0) * 0.5, hp = P.hp[t.id] != null ? P.hp[t.id] : t.hp;
          v += Math.min(d, hp) * prio(ctx, t); if (d >= hp) v += 16 + t.maxHp * 0.12; P2.hp[t.id] = Math.max(0, hp - d);
        }
        if (S.push || S.pull) {
          var kn = simKnock(ctx, t, u.x, u.y, S.push || S.pull, !!S.pull);
          if (S.push) { v += kn.blocked * 9 * 1.1; if (kn.moved === 0) v -= 2; } else v += kn.moved ? 3 : -3;
        }
      } else if (t !== u || S.heal) {
        var miss = t.maxHp - (P.ahp[t.id] != null ? P.ahp[t.id] : t.hp);
        if (S.heal) { v += Math.min(miss, S.heal * (1 + (u.heal || 0) / 100)) * 1.0; if (miss < 5) v -= 20; P2.ahp[t.id] = Math.min(t.maxHp, (P.ahp[t.id] != null ? P.ahp[t.id] : t.hp) + S.heal); }
        if (S.shield) { var thr = ctx.threat.length ? 1 : 0; v += S.shield * 0.55 * (t.hp < t.maxHp * 0.8 ? 1.3 : 0.9) * (risk(ctx, t.x, t.y) > 0 ? 1 : 0.35); }
      }
    });
    if (S.healAll) { ctx.friends.concat([u]).forEach(function (t) { if (!t.summon) v += Math.min(t.maxHp - t.hp, S.healAll) * 0.9; }); }
    if (S.healSelf) v += Math.min(u.maxHp - u.hp, S.healSelf) * 0.8;
    if (S.healSummons) v += ctx.mySum * 6;
    if (S.summon) { v += 16; P2.nsum++; }
    if (sid === "menagerie") { v += 20; P2.nsum += 3; }
    if (S.status && !S.dmg) v += 4 + ctx.foes.length * 2;
    if (S.shield && S.steps[0].shape === "self") v += S.shield * 0.5;
    if (sid === "forteresse") v += ctx.friends.length * 4;
    if (!foeSeen.__x && v < 0.01 && P2.x === P.x && P2.y === P.y) return null;
    return { val: v, P2: P2 };
  }
  function heroGen(ctx, P) {
    var out = heroCasts(ctx, P), u = ctx.u;
    if (P.pm > 0 && (P.moves === 0 || (P.atk > 0 && P.moves === 1))) {
      var reach = A.reach(ctx.w, { x: P.x, y: P.y, pm: P.pm, side: u.side, id: u.id }), cand = [];
      Object.keys(reach).forEach(function (k) {
        if (!reach[k]) return;
        var p = k.split(","), x = +p[0], y = +p[1];
        cand.push({ x: x, y: y, d: reach[k], sc: posValue(ctx, { x: x, y: y, atk: P.atk }) + heroAttackPotential(ctx, P, x, y) * 2.2 - reach[k] * 0.05 });
      });
      cand.sort(function (a, b) { return b.sc - a.sc; });
      cand.slice(0, 5).forEach(function (q) { var P2 = cloneP(P); P2.x = q.x; P2.y = q.y; P2.pm -= q.d; P2.moves++; out.push({ kind: "move", x: q.x, y: q.y, val: -0.05 * q.d, P2: P2 }); });
    }
    return out;
  }
  function heroAttackPotential(ctx, P, x, y) {
    var n = 0, r = ctx.heroRng || 1;
    ctx.foes.forEach(function (f) { var d = md(x, y, f.x, f.y); if (d <= r && (d <= 1 || I.losFrom(ctx.c, ctx.u, x, y, f.x, f.y))) n++; });
    return Math.min(n, 2);
  }
  function botStep(w, u) {
    if (u.pa <= 0 && u.pm <= 0) return null;
    u.role = HERO_ROLE[u.cls] || "brute";
    var ctx = buildCtx(w, u);
    ctx.role = u.role; ctx.hspells = heroSpells(u); ctx.heroRng = heroRange(u); ctx.mySum = I.mySummons(w.combat, u).length;
    if (!ctx.foes.length) return null;
    ctx.gen = heroGen;
    var P0 = initP(ctx), base = posValue(ctx, P0);
    var plan = search(ctx, P0, 3, { n: 500 });
    if (!plan.seq.length || plan.total < base + 0.5) { var adv = advance(ctx, P0); return adv ? { t: "mmove", x: adv.x, y: adv.y } : null; }
    var a = plan.seq[0];
    if (a.kind === "move") return { t: "mmove", x: a.x, y: a.y };
    return { t: "hcast", s: a.hs, x: a.x, y: a.y };
  }
  function heroCast(w, u, a) {
    var ok = false, S = SPELLS[a.s];
    // le moteur valide tout (portée, PA, ligne de vue) : comme pour un joueur
    var tgs = [[a.x, a.y]], steps = S.steps.length;
    var t0 = A.targets(w, u, a.s, []);
    if (S.steps.length > 1 && (S.minSteps || S.steps.length) > 1) { I.endTurn(w); return 0.2; }
    if (A.canCast(w, u, a.s)) { u.badSpell = u.badSpell || {}; u.badSpell[a.s] = 1; return 0.05; }
    var before = u.pa;
    ok = I.cast(w, u, a.s, tgs);
    if (!ok) { u.badSpell = u.badSpell || {}; u.badSpell[a.s] = 1; return 0.05; }
    u.atk = (u.atk || 0) + 1;
    return 0.8;
  }

  EXT.aiStep = aiStep;
  EXT.aiDo = aiDo;
  A.AI = { botStep: botStep, aiDo: aiDo, buildCtx: buildCtx, posValue: posValue, risk: risk, search: search, castMob: castMob, HERO_ROLE: HERO_ROLE, splOf: splOf, teleCells: teleCells, foeRange: foeRange };
})(typeof window !== "undefined" ? window : globalThis);
