/* =========================================================================
   Ronceclair — moteur de combat tour par tour sur cellules (js/ronceclair-tactics.js)
   Pur (aucun DOM), testable dans Node. Règles façon Dofus :
   - une grille de cases, des équipes (héros / monstres), un ordre de jeu par initiative ;
   - à son tour : PA (lancer des sorts) et PM (se déplacer d'une case par PM, sans diagonale) ;
   - portée min–max en distance de Manhattan, ligne droite, ligne de vue ;
   - dégâts élémentaires façon Dofus : base × (1 + (caractéristique de l'élément + Puissance) / 100) + Dommages + Dommages de l'élément,
     × (1 + % Dommages), critique (+ Dommages critiques), puis résistances fixes et en % de la cible ;
     boucliers, soins, poussées (Dommages / Résistance de poussée), attractions, téléportations, buffs ;
   - retrait de PA / PM contré par l'Esquive, Tacle et Fuite quand on quitte une case voisine d'un ennemi ;
   - phase de placement avant le combat, IA des monstres, victoire / défaite.
   L'état « f » est un objet JSON : l'hôte l'envoie tel quel à l'invité en coop.
   API : window.RC_TACT (T.create, T.cmd, T.reach, T.castCells, T.area, T.aiStep, T.heroUnit, T.mobUnit …)
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.RC_DATA || (typeof require !== "undefined" ? require("./ronceclair-data.js") : null);
  var T = {};
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ---------- accès ---------- */
  T.spell = function (sid) { return D.SPELLS[sid] || D.MOB_SPELLS[sid]; };
  function inb(f, x, y) { return x >= 0 && y >= 0 && x < f.w && y < f.h; }
  function gc(f, x, y) { return f.g.charAt(y * f.w + x); }                      // '0' libre · '1' bloque le passage · '2' bloque passage et vue
  T.unitAt = function (f, x, y) { for (var i = 0; i < f.units.length; i++) { var u = f.units[i]; if (u.alive && u.x === x && u.y === y) return u; } return null; };
  T.unit = function (f, id) { for (var i = 0; i < f.units.length; i++) if (f.units[i].id === id) return f.units[i]; return null; };
  T.walkable = function (f, x, y) { return inb(f, x, y) && gc(f, x, y) === "0"; };
  T.free = function (f, x, y) { return T.walkable(f, x, y) && !T.unitAt(f, x, y); };
  function dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }
  T.dist = dist;
  function alive(f, side) { return f.units.filter(function (u) { return u.alive && (side == null || u.side === side); }); }
  function pushEv(f, e) { f.ev.push(e); }

  /* ---------- fabrication des unités ---------- */
  T.heroUnit = function (p, id, owner) {
    var st = D.computeStats(p);
    return { id: id, side: 0, kind: "hero", owner: owner, pid: p.id, name: p.name, cls: p.cls, lvl: p.lvl, look: { fur: p.fur, tete: p.eq.tete && p.eq.tete.look, dos: p.eq.dos && p.eq.dos.look, main: p.eq.main && p.eq.main.look },
      x: 0, y: 0, hp: Math.min(p.hp, st.maxHp) > 0 ? Math.min(p.hp, st.maxHp) : st.maxHp, max: st.maxHp, bpa: st.pa, bpm: st.pm, pa: 0, pm: 0, po: st.po, init: st.init, el: st.el, res: st.res, dom: st.dom, crit: st.crit,
      rf: st.rf, doEl: st.doEl, dopct: st.dopct, doCri: st.doCri, doPush: st.doPush, rcri: st.rcri, rpush: st.rpush, healFlat: st.healFlat,
      esqPa: st.esqPa, esqPm: st.esqPm, retPa: st.retPa, retPm: st.retPm, tacle: st.tacle, fuite: st.fuite,
      healPct: st.healPct, areaDmg: st.areaDmg, regen: st.regen, shield: 0, buffs: [], cd: {}, cast: {}, castT: {}, spells: D.spellsOf(p), alive: true, potions: p.potions || 0, potUsed: false };
  };
  T.mobUnit = function (type, lvl, id) {
    var m = D.mobStats(type, lvl);
    return { id: id, side: 1, kind: "mob", owner: null, name: m.name, type: type, lvl: lvl, x: 0, y: 0, hp: m.hp, max: m.hp, bpa: m.pa, bpm: m.pm, pa: 0, pm: 0, po: 0, init: m.ini, el: m.el, res: m.res, dom: m.dom, crit: m.crit,
      rf: { terre: 0, feu: 0, eau: 0, air: 0 }, doEl: { terre: 0, feu: 0, eau: 0, air: 0 }, dopct: 0, doCri: 0, doPush: 0, rcri: 0, rpush: 0, healFlat: 0,
      esqPa: lvl, esqPm: lvl, retPa: Math.floor(lvl / 2), retPm: Math.floor(lvl / 2), tacle: Math.floor(lvl * 1.5), fuite: Math.floor(lvl * 1.5),
      healPct: 0, areaDmg: 0, regen: 0, shield: 0, buffs: [], cd: {}, cast: {}, castT: {}, spells: m.spells, alive: true, xp: m.xp, gold: m.gold, boss: m.boss };
  };

  /* ---------- création ----------
     opts : { w, h, g (chaîne de w*h caractères), zone: [{x,y}...] cases de placement des héros, heroes: [unit], mobs: [{unit, x, y}] } */
  T.create = function (opts) {
    var f = { w: opts.w, h: opts.h, g: opts.g, phase: "placement", units: [], order: [], turn: -1, round: 0, zone: opts.zone || [], ready: {}, result: null, ev: [], seq: 0 };
    opts.mobs.forEach(function (m) { m.unit.x = m.x; m.unit.y = m.y; f.units.push(m.unit); });
    opts.heroes.forEach(function (h, i) { h.x = f.zone[i % f.zone.length].x; h.y = f.zone[i % f.zone.length].y; f.units.push(h); });
    return f;
  };
  T.snap = function (f) { var c = {}; for (var k in f) if (k !== "ev") c[k] = f[k]; c.ev = []; return c; };

  /* ---------- déplacements ---------- */
  T.reach = function (f, u, maxPm) {                           // { "x,y": {c: coût, p: "x,y" parent} }
    var pm = maxPm == null ? u.pm : maxPm, map = {}, q = [[u.x, u.y]], k0 = u.x + "," + u.y, i, d, nx, ny, k;
    map[k0] = { c: 0, p: null };
    for (i = 0; i < q.length; i++) {
      var cx = q[i][0], cy = q[i][1], cur = map[cx + "," + cy];
      if (cur.c >= pm) continue;
      for (d = 0; d < 4; d++) {
        nx = cx + DIRS[d][0]; ny = cy + DIRS[d][1]; k = nx + "," + ny;
        if (map[k] || !T.free(f, nx, ny)) continue;
        map[k] = { c: cur.c + 1, p: cx + "," + cy }; q.push([nx, ny]);
      }
    }
    return map;
  };
  T.pathTo = function (map, x, y) {
    var k = x + "," + y, out = [];
    if (!map[k]) return null;
    while (k) { var a = k.split(","); out.unshift({ x: +a[0], y: +a[1] }); k = map[k].p; }
    return out;
  };

  /* ---------- ligne de vue (Bresenham entre centres de cases ; les unités ne bloquent pas) ---------- */
  T.los = function (f, x0, y0, x1, y1) {
    var ax = x0, ay = y0, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, e2;
    for (;;) {
      if (!(x0 === ax && y0 === ay) && !(x0 === x1 && y0 === y1) && gc(f, x0, y0) === "2") return false;
      if (x0 === x1 && y0 === y1) return true;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };

  /* ---------- sorts ---------- */
  T.rangeOf = function (u, sp) { return { min: sp.min, max: sp.max + (sp.max > 1 && sp.po !== false ? (u.po || 0) + bonus(u, "po") : 0) }; };
  T.canCast = function (f, u, sid) {
    var sp = T.spell(sid); if (!sp) return "inconnu";
    if (u.pa < sp.pa) return "pa";
    if ((u.cd[sid] || 0) > 0) return "cd";
    if (sp.perTurn && (u.cast[sid] || 0) >= sp.perTurn) return "perturn";
    return null;
  };
  T.targetOk = function (f, u, sp, x, y) {
    var t = T.unitAt(f, x, y);
    switch (sp.tgt || "any") {
      case "enemy": return !!t && t.side !== u.side;
      case "ally": return !!t && t.side === u.side;
      case "self": return x === u.x && y === u.y;
      case "free": return T.free(f, x, y);
      default: return inb(f, x, y) && gc(f, x, y) !== "2";
    }
  };
  // toutes les cases visables avec ce sort depuis (ox, oy)
  T.castCells = function (f, u, sid, ox, oy) {
    var sp = T.spell(sid), r = T.rangeOf(u, sp), out = [], x, y, d;
    if (ox == null) { ox = u.x; oy = u.y; }
    var x0 = Math.max(0, ox - r.max), x1 = Math.min(f.w - 1, ox + r.max), y0 = Math.max(0, oy - r.max), y1 = Math.min(f.h - 1, oy + r.max);
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      d = dist(ox, oy, x, y);
      if (d < r.min || d > r.max) continue;
      if (sp.line && !(x === ox || y === oy)) continue;
      if (sp.los && !T.los(f, ox, oy, x, y)) continue;
      var t = T.unitAt(f, x, y);
      switch (sp.tgt || "any") {
        case "enemy": if (!t || t.side === u.side) continue; break;
        case "ally": if (!t || t.side !== u.side) continue; break;
        case "self": if (x !== ox || y !== oy) continue; break;
        case "free": if (!T.walkable(f, x, y) || (t && !(x === ox && y === oy))) continue; break;
        default: if (gc(f, x, y) === "2") continue;
      }
      out.push({ x: x, y: y });
    }
    return out;
  };
  // cases touchées par un sort lancé depuis (ox, oy) sur (tx, ty)
  T.area = function (f, u, sp, tx, ty, ox, oy) {
    if (ox == null) { ox = u.x; oy = u.y; }
    var a = sp.area, out = [{ x: tx, y: ty }], r, x, y;
    if (!a) return out;
    r = a.r;
    if (a.shape === "circle") { out = []; for (y = ty - r; y <= ty + r; y++) for (x = tx - r; x <= tx + r; x++) if (inb(f, x, y) && dist(tx, ty, x, y) <= r) out.push({ x: x, y: y }); }
    else if (a.shape === "cross") { out = [{ x: tx, y: ty }]; DIRS.forEach(function (d) { for (var i = 1; i <= r; i++) { var cx = tx + d[0] * i, cy = ty + d[1] * i; if (inb(f, cx, cy) && gc(f, cx, cy) !== "2") out.push({ x: cx, y: cy }); else break; } }); }
    else if (a.shape === "line") {
      var dx = Math.sign(tx - ox), dy = Math.sign(ty - oy); if (dx && dy) dy = 0;
      out = []; for (var i = 0; i < r; i++) { var lx = tx + dx * i, ly = ty + dy * i; if (!inb(f, lx, ly) || gc(f, lx, ly) === "2") break; out.push({ x: lx, y: ly }); }
    }
    return out;
  };

  /* ---------- dégâts, soins, effets ---------- */
  function bonus(u, st) { var s = 0; u.buffs.forEach(function (b) { if (b.st === st && b.turns > 0) s += b.v; }); return s; }
  T.bonus = bonus;
  function rnd(f, a, b) { return a + Math.floor((f.rng ? f.rng() : Math.random()) * (b - a + 1)); }
  function growth(u, sp) { return u.kind === "hero" ? 1 + 0.07 * Math.max(0, u.lvl - (sp.lvl || 1)) : 1; }
  // fourchette de dégâts / soins affichée au joueur (sans critique ni résistance)
  T.preview = function (u, sp, eff) {
    var g = growth(u, sp), el = (u.el[sp.el] || 0) / 100, extra = sp.area && u.areaDmg ? 1 + u.areaDmg / 100 : 1;
    if (eff.t === "heal") { var hh = 1 + (u.healPct || 0) / 100, fl = u.healFlat || 0; return [Math.round((eff.a * g * (1 + el) + fl) * hh), Math.round((eff.b * g * (1 + el) + fl) * hh)]; }
    var flat = u.dom + bonus(u, "dom") + ((u.doEl && u.doEl[sp.el]) || 0), pc = 1 + (u.dopct || 0) / 100;
    return [Math.round((eff.a * g * (1 + el) * extra + flat) * pc), Math.round((eff.b * g * (1 + el) * extra + flat) * pc)];
  };
  function dealDamage(f, src, tgt, n, el, crit, kind) {
    var absorbed = 0;
    if (tgt.shield > 0) { absorbed = Math.min(tgt.shield, n); tgt.shield -= absorbed; n -= absorbed; }
    n = Math.max(0, Math.round(n));
    tgt.hp -= n;
    pushEv(f, { t: "dmg", id: tgt.id, n: n, abs: absorbed, el: el, crit: !!crit, kind: kind || "" });
    if (tgt.hp <= 0 && tgt.alive) { tgt.hp = 0; tgt.alive = false; pushEv(f, { t: "die", id: tgt.id }); }
  }
  function spellDamage(f, src, tgt, sp, eff) {
    var base = rnd(f, eff.a, eff.b) * growth(src, sp), el = (src.el[sp.el] || 0) / 100;
    var n = base * (1 + el) + src.dom + bonus(src, "dom") + ((src.doEl && src.doEl[sp.el]) || 0);     // + Dommages et Dommages de l'élément
    if (sp.area && src.areaDmg) n *= 1 + src.areaDmg / 100;
    n *= 1 + (src.dopct || 0) / 100;                                                                    // × % Dommages
    if (eff.lowHp && tgt.hp < tgt.max * 0.5) n *= eff.lowHp;                                            // exécution : plus de dégâts sur une cible blessée
    var crit = (f.rng ? f.rng() : Math.random()) < src.crit + bonus(src, "crit") / 100; if (crit) n = n * 1.3 + (src.doCri || 0);   // critique : + Dommages critiques
    n -= ((tgt.rf && tgt.rf[sp.el]) || 0) + (crit ? tgt.rcri || 0 : 0);                                // résistances fixes
    var res = Math.min(50, (tgt.res[sp.el] || 0) + bonus(tgt, "res")); n *= 1 - res / 100;             // puis résistances en %
    if (n < 1) n = 1;
    dealDamage(f, src, tgt, n, sp.el, crit, "spell");
  }
  function healUnit(f, src, tgt, sp, eff) {
    var n = (rnd(f, eff.a, eff.b) * growth(src, sp) * (1 + (src.el[sp.el] || 0) / 100) + (src.healFlat || 0)) * (1 + (src.healPct || 0) / 100);
    n = Math.round(n); var real = Math.min(n, tgt.max - tgt.hp); tgt.hp += real;
    pushEv(f, { t: "heal", id: tgt.id, n: real });
  }
  // déplace de force d'une case à la fois ; collision = dégâts
  function forceMove(f, src, tgt, dx, dy, n) {
    var moved = 0, i;
    for (i = 0; i < n; i++) {
      var nx = tgt.x + dx, ny = tgt.y + dy, blocker = inb(f, nx, ny) && T.unitAt(f, nx, ny);
      if (!T.walkable(f, nx, ny) || blocker) {
        var coll = (n - i) * (3 + Math.floor((src.lvl || 1) / 2)) + (src.doPush || 0);
        dealDamage(f, src, tgt, Math.max(0, coll - (tgt.rpush || 0)), "terre", false, "coll");
        if (blocker && blocker.alive) dealDamage(f, src, blocker, Math.max(0, coll - (blocker.rpush || 0)), "terre", false, "coll");
        break;
      }
      tgt.x = nx; tgt.y = ny; moved++;
    }
    if (moved) pushEv(f, { t: "push", id: tgt.id, x: tgt.x, y: tgt.y });
  }
  function applyEffect(f, u, sp, eff, tx, ty, cells) {
    var targets = [], seen = {};
    cells.forEach(function (c) { var t = T.unitAt(f, c.x, c.y); if (t && !seen[t.id]) { seen[t.id] = 1; targets.push(t); } });
    switch (eff.t) {
      case "dmg": targets.filter(function (t) { return t.side !== u.side; }).forEach(function (t) {
        var h0 = t.hp; spellDamage(f, u, t, sp, eff);
        if (eff.vamp && u.alive) { var gain = Math.min(Math.round((h0 - t.hp) * eff.vamp), u.max - u.hp); if (gain > 0) { u.hp += gain; pushEv(f, { t: "heal", id: u.id, n: gain }); } }
      }); break;
      case "dot": targets.filter(function (t) { return t.side !== u.side; }).forEach(function (t) {     // poison : dégâts au début de chaque tour de la cible
        var v = rnd(f, eff.a, eff.b) * growth(u, sp) * (1 + (u.el[sp.el] || 0) / 100) + (u.dom + bonus(u, "dom")) * 0.5 + ((u.doEl && u.doEl[sp.el]) || 0) * 0.5;
        t.buffs.push({ st: "dot", v: Math.max(1, Math.round(v)), turns: eff.turns, el: sp.el, by: u.id });
        pushEv(f, { t: "buff", id: t.id, st: "dot", v: Math.round(v) });
      }); break;
      case "heal": targets.filter(function (t) { return t.side === u.side; }).forEach(function (t) { healUnit(f, u, t, sp, eff); }); break;
      case "shield": targets.filter(function (t) { return t.side === u.side; }).forEach(function (t) { var n = Math.round(rnd(f, eff.a, eff.b) * growth(u, sp) * (1 + (u.el[sp.el] || 0) / 200)); t.shield += n; pushEv(f, { t: "shield", id: t.id, n: n }); }); break;
      case "buff":
        targets.filter(function (t) { return eff.foe ? t.side !== u.side : t.side === u.side; }).forEach(function (t) {
          t.buffs.push({ st: eff.st, v: eff.v, turns: eff.turns });
          if ((eff.st === "pa" || eff.st === "pm") && eff.v > 0 && f.phase === "fight" && f.order[f.turn] === t.id) t[eff.st] += eff.v;
          pushEv(f, { t: "buff", id: t.id, st: eff.st, v: eff.v });
        });
        break;
      case "push": case "pull":
        targets.filter(function (t) { return t.side !== u.side && t.alive; }).forEach(function (t) {
          var dx = Math.sign(t.x - u.x), dy = Math.sign(t.y - u.y); if (dx && dy) { if (Math.abs(t.x - u.x) >= Math.abs(t.y - u.y)) dy = 0; else dx = 0; }
          if (eff.t === "pull") { dx = -dx; dy = -dy; }
          forceMove(f, u, t, dx, dy, eff.n);
        });
        break;
      case "rpa": case "rpm":                                                    // retrait de PA / PM : chaque point peut être esquivé
        targets.filter(function (t) { return t.side !== u.side; }).forEach(function (t) {
          var pa = eff.t === "rpa", pts = rnd(f, eff.a, eff.b), got = 0, chance = Math.max(0.1, Math.min(0.95, 0.5 + ((pa ? u.retPa : u.retPm) - (pa ? t.esqPa : t.esqPm)) / 100));
          for (var q = 0; q < pts; q++) if ((f.rng ? f.rng() : Math.random()) < chance) got++;
          if (!got) { pushEv(f, { t: "dodge", id: t.id, st: pa ? "pa" : "pm" }); return; }
          var key = pa ? "pa" : "pm"; t.buffs.push({ st: key, v: -got, turns: 1 });
          if (f.phase === "fight" && f.order[f.turn] === t.id) t[key] = Math.max(0, t[key] - got);
          pushEv(f, { t: "buff", id: t.id, st: key, v: -got });
        });
        break;
      case "tp": u.x = tx; u.y = ty; pushEv(f, { t: "tp", id: u.id, x: tx, y: ty }); break;
      case "dash": {
        var ddx = Math.sign(tx - u.x), ddy = Math.sign(ty - u.y), cx = u.x, cy = u.y;
        while (dist(cx, cy, tx, ty) > 1 && T.free(f, cx + ddx, cy + ddy)) { cx += ddx; cy += ddy; }
        if (cx !== u.x || cy !== u.y) { u.x = cx; u.y = cy; pushEv(f, { t: "tp", id: u.id, x: cx, y: cy }); }
        break;
      }
    }
  }
  T.cast = function (f, u, sid, tx, ty) {
    var sp = T.spell(sid), err = T.canCast(f, u, sid); if (err) return { err: err };
    var legal = T.castCells(f, u, sid).some(function (c) { return c.x === tx && c.y === ty; });
    if (!legal) return { err: "cible" };
    u.pa -= sp.pa; if (sp.cd) u.cd[sid] = sp.cd + 1; u.cast[sid] = (u.cast[sid] || 0) + 1;
    var cells = T.area(f, u, sp, tx, ty);
    pushEv(f, { t: "cast", id: u.id, sid: sid, x: tx, y: ty, cells: cells, el: sp.el });
    sp.eff.forEach(function (eff) {
      if (eff.t === "tp" || eff.t === "dash") { applyEffect(f, u, sp, eff, tx, ty, cells); if (eff.t === "dash") cells = T.area(f, u, sp, tx, ty, u.x, u.y); }
      else applyEffect(f, u, sp, eff, tx, ty, cells);
    });
    checkEnd(f);
    return { ok: true };
  };

  /* ---------- tours ---------- */
  function buildOrder(f) {                                       // alternance des équipes, chacune triée par initiative
    var a = alive(f, 0).sort(function (x, y) { return y.init - x.init; }), b = alive(f, 1).sort(function (x, y) { return y.init - x.init; }), out = [], first = (a[0] && b[0] && b[0].init > a[0].init) ? 1 : 0;
    var q = first === 0 ? [a, b] : [b, a], i = 0;
    while (a.length || b.length) { var side = q[i % 2]; if (side.length) out.push(side.shift().id); else { var o = q[(i + 1) % 2]; if (o.length) out.push(o.shift().id); } i++; }
    return out;
  }
  function startTurn(f) {
    var u = T.unit(f, f.order[f.turn]);
    u.pa = Math.max(0, u.bpa + bonus(u, "pa")); u.pm = Math.max(0, u.bpm + bonus(u, "pm"));
    u.cast = {}; u.potUsed = false; for (var k in u.cd) { if (u.cd[k] > 0) u.cd[k]--; }
    u.buffs.forEach(function (b) {                                                                       // poisons
      if (b.st !== "dot" || !u.alive) return;
      var n = b.v - ((u.rf && u.rf[b.el]) || 0); n *= 1 - Math.min(50, (u.res[b.el] || 0) + bonus(u, "res")) / 100;
      dealDamage(f, null, u, Math.max(1, n), b.el, false, "poison");
    });
    if (!u.alive) { checkEnd(f); if (f.phase === "fight") T.endTurn(f); return; }
    u.buffs.forEach(function (b) { b.turns--; }); u.buffs = u.buffs.filter(function (b) { return b.turns > 0; });
    if (u.regen && u.hp < u.max) { var n = Math.min(u.regen, u.max - u.hp); u.hp += n; pushEv(f, { t: "heal", id: u.id, n: n }); }
    pushEv(f, { t: "turn", id: u.id, round: f.round });
  }
  T.start = function (f) {
    f.phase = "fight"; f.order = buildOrder(f); f.turn = 0; f.round = 1;
    f.units.forEach(function (u) { u.pa = 0; u.pm = 0; });
    pushEv(f, { t: "start" }); startTurn(f);
  };
  T.endTurn = function (f) {
    if (f.phase !== "fight") return;
    for (var guard = 0; guard < 200; guard++) {
      f.turn++; if (f.turn >= f.order.length) { f.turn = 0; f.round++; f.order = f.order.filter(function (id) { var u = T.unit(f, id); return u && u.alive; }); }
      var u = T.unit(f, f.order[f.turn]);
      if (u && u.alive) break;
    }
    startTurn(f);
  };
  function checkEnd(f) {
    if (f.phase === "end") return;
    var h = alive(f, 0).length, m = alive(f, 1).length;
    if (!m || !h) {
      f.phase = "end"; f.result = { win: m === 0, xp: 0, gold: 0, kills: [] };
      f.units.forEach(function (u) { if (u.side === 1 && !u.alive) { f.result.xp += u.xp || 0; f.result.gold += Math.round(((u.gold && (u.gold[0] + Math.random() * (u.gold[1] - u.gold[0] + 1))) || 0)); f.result.kills.push(u.type); } });
      pushEv(f, { t: "end", win: m === 0 });
    }
  }
  T.current = function (f) { return f.phase === "fight" ? T.unit(f, f.order[f.turn]) : null; };
  T.checkEnd = checkEnd;
  // retire un héros du combat (déconnexion) sans bloquer les tours
  T.removeUnit = function (f, id) {
    var u = T.unit(f, id); if (!u || !u.alive) return;
    var wasCur = f.phase === "fight" && f.order[f.turn] === id;
    u.alive = false; u.hp = 0; pushEv(f, { t: "die", id: id });
    checkEnd(f); if (wasCur && f.phase === "fight") T.endTurn(f);
  };

  /* ---------- commandes (validées) ---------- */
  T.cmd = function (f, uid, c) {
    var u = T.unit(f, uid); if (!u || !u.alive) return { err: "unité" };
    if (f.phase === "placement") {
      if (c.t === "place") {
        if (u.kind !== "hero" || !f.zone.some(function (z) { return z.x === c.x && z.y === c.y; })) return { err: "zone" };
        var o = T.unitAt(f, c.x, c.y); if (o && o.id !== u.id) return { err: "occupé" };
        u.x = c.x; u.y = c.y; pushEv(f, { t: "tp", id: u.id, x: c.x, y: c.y }); return { ok: true };
      }
      if (c.t === "ready") { f.ready[uid] = true; if (alive(f, 0).every(function (h) { return f.ready[h.id]; })) T.start(f); return { ok: true }; }
      return { err: "phase" };
    }
    if (f.phase !== "fight") return { err: "fini" };
    if (f.order[f.turn] !== uid) return { err: "tour" };
    if (c.t === "end") { T.endTurn(f); return { ok: true }; }
    if (c.t === "move") {
      var map = T.reach(f, u), path = T.pathTo(map, c.x, c.y);
      if (!path || path.length < 2) return { err: "chemin" };
      // Tacle : quitter une case voisine d'un ennemi peut coûter 1 PA et 1 PM (chance d'échapper = Fuite contre Tacle)
      var tacklers = alive(f, 1 - u.side).filter(function (e) { return dist(u.x, u.y, e.x, e.y) === 1; });
      if (tacklers.length) {
        var lost = tacklers.some(function (e) { var esc = Math.max(0.25, Math.min(1, 0.75 * (u.fuite + 4) / (e.tacle + 4))); return (f.rng ? f.rng() : Math.random()) > esc; });
        if (lost) { u.pa = Math.max(0, u.pa - 1); u.pm = Math.max(0, u.pm - 1); pushEv(f, { t: "tackle", id: u.id }); if (path.length - 1 > u.pm) return { err: "tacle" }; }
      }
      u.pm -= path.length - 1; u.x = c.x; u.y = c.y;
      pushEv(f, { t: "move", id: u.id, path: path });
      return { ok: true };
    }
    if (c.t === "cast") return T.cast(f, u, c.sid, c.x, c.y);
    if (c.t === "potion") {                                        // baie de soin : 3 PA, 1 fois par tour, 25 % des PV max
      if (u.kind !== "hero" || u.potions <= 0 || u.pa < 3 || u.potUsed || u.hp >= u.max) return { err: "baie" };
      u.pa -= 3; u.potions--; u.potUsed = true;
      var real = Math.min(Math.round(u.max * 0.25), u.max - u.hp); u.hp += real; pushEv(f, { t: "heal", id: u.id, n: real });
      return { ok: true };
    }
    return { err: "commande" };
  };

  /* ---------- IA des monstres : une commande à la fois ---------- */
  function estimate(f, u, sid, tx, ty) {                             // valeur d'un lancer pour l'IA
    var sp = T.spell(sid), cells = T.area(f, u, sp, tx, ty), score = 0;
    sp.eff.forEach(function (eff) {
      if (eff.t !== "dmg") { if (eff.t === "dot") cells.forEach(function (c) { var t = T.unitAt(f, c.x, c.y); if (t && t.side !== u.side) score += (eff.a + eff.b) / 2 * eff.turns * 0.6; }); else if (eff.t === "push" || eff.t === "pull" || eff.t === "buff" || eff.t === "rpa" || eff.t === "rpm") score += 1; return; }
      cells.forEach(function (c) {
        var t = T.unitAt(f, c.x, c.y); if (!t || t.side === u.side) return;
        var n = (eff.a + eff.b) / 2 * (1 + (u.el[sp.el] || 0) / 100) * (1 - Math.min(50, t.res[sp.el] || 0) / 100) + u.dom;
        score += Math.min(n, t.hp + t.shield) + (n >= t.hp ? 20 : 0);
      });
    });
    return score / Math.max(1, sp.pa) * 3 + score * 0.1;
  }
  T.aiStep = function (f) {
    var u = T.current(f); if (!u) return { t: "end" };
    var best = null, bs = 0, enemies = alive(f, 1 - u.side);
    if (!enemies.length) return { t: "end" };
    u.spells.forEach(function (sid) {
      if (T.canCast(f, u, sid)) return;
      T.castCells(f, u, sid).forEach(function (c) { var s = estimate(f, u, sid, c.x, c.y); if (s > bs) { bs = s; best = { t: "cast", sid: sid, x: c.x, y: c.y }; } });
    });
    if (best) return best;
    if (u.pm > 0) {
      var map = T.reach(f, u), pick = null, ps = -1e9, here = u.x + "," + u.y;
      var nearestD = function (x, y) { var d = 1e9; enemies.forEach(function (e) { d = Math.min(d, dist(x, y, e.x, e.y)); }); return d; };
      for (var k in map) {
        var a = k.split(","), x = +a[0], y = +a[1], canHit = 0;
        u.spells.forEach(function (sid) { if (!T.canCast(f, u, sid) && T.castCells(f, u, sid, x, y).length) canHit = 1; });
        var s = -nearestD(x, y) + canHit * 50 - map[k].c * 0.01;
        if (s > ps) { ps = s; pick = { x: x, y: y }; }
      }
      if (pick && (pick.x + "," + pick.y) !== here) return { t: "move", x: pick.x, y: pick.y };
    }
    return { t: "end" };
  };

  /* ---------- aide à la mise en place ---------- */
  // construit une arène à partir d'une fonction de terrain : kind(x, y) → '0' libre · '1' bloque le passage · '2' bloque aussi la vue
  T.buildGrid = function (w, h, kind) { var s = ""; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) s += kind(x, y); return s; };

  if (typeof module !== "undefined" && module.exports) module.exports = T;
  else root.RC_TACT = T;
})(typeof window !== "undefined" ? window : this);
