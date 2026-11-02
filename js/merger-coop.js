/* =========================================================================
   Merger Coop — puzzle coopératif à 2 joueurs sur le même ordinateur
   (le mode Solo d'origine est dans js/merger.js, les personnages dans js/merger-art.js)

   Deux lanceurs, un de chaque côté d'un terrain commun. Les joueurs visent
   chacun de leur côté et tirent à tour de rôle UN personnage à la fois.
   Les personnages volent en cloche, rebondissent un peu, retombent et
   s'empilent. 3 identiques (ou plus) qui se touchent → POP, et ce qui tombe
   peut déclencher des réactions en chaîne. Score commun, pas de chrono :
   la partie s'arrête quand la pile reste au-dessus de la ligne.

   Physique : vitesses + impulsions (rebond, frottement) et corrections de
   position, 8 sous-pas par image et vitesse plafonnée → un projectile avance
   d'au plus ~3 unités par sous-pas (rayon 24) : il ne peut rien traverser.
   ========================================================================= */
(function () {
  "use strict";

  var ART = window.MergerArt;
  var stage = document.querySelector("[data-merger-coop]");
  if (!ART || !stage) return;

  var VERSION = "2.0.0";
  var TAU = Math.PI * 2;
  var SQ = ART.SQUIRRELS;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var hud = stage.querySelector("[data-hud]");

  /* ====================== RÉGLAGES DU JEU ====================== */
  var FW = 760, FH = 560;              // terrain (unités)
  var R = 24;                          // rayon d'un personnage
  var BOWL = 900, BX = FW / 2, BY = FH - BOWL;   // fond légèrement arrondi vers le centre
  var DANGER = 170;                    // ligne de danger (y)
  var G = 1150;                        // gravité (cartoon : un peu plus douce qu'en vrai)
  var SUB = 8, ITER = 4;               // sous-pas physiques par image, passes de collision
  var MAXV = 1350;                     // vitesse max (unités/s) → jamais de traversée
  var BOUNCE = 0.26, BOUNCE_MIN = 80;  // rebond (au-dessus d'une petite vitesse d'impact)
  var VMIN = 380, VMAX = 1020;         // vitesse de tir (puissance 0 → 1)
  var A_MIN = -1.3, A_MAX = 0.85;      // angle de tir (radians, négatif = vers le haut)
  var GROUP = 3;
  var TOUCH = 7;                       // tolérance de contact pour les groupes (oreilles et queues qui se frôlent comptent)
  // les 7 personnages du mode coop, choisis pour leurs silhouettes très différentes
  var TYPES = [1, 3, 0, 2, 5, 8, 10];
  var START_TYPES = 4, UNLOCK_AT = [700, 2000, 4200];   // un nouveau personnage à ces scores
  // pouvoirs : débloqués après N tirs, rares (bonus des gros combos + 5 % de chance)
  var POWERS = [{ kind: "grenade", at: 5 }, { kind: "rainbow", at: 10 }, { kind: "lightning", at: 16 }, { kind: "bomb", at: 22 }];
  var RAIN_EVERY = 5;                  // tous les 5 tirs, quelques personnages tombent du ciel (pression douce, sans chrono)
  var ANTIC = 0.17, POP_T = 0.26;      // anticipation puis POP d'une combinaison (secondes)
  var LAUNCH = [{ x: 44, y: 112, dir: 1 }, { x: FW - 44, y: 112, dir: -1 }];
  var PCOL = [{ main: "#f08a3c", light: "#ffd2a8", dark: "#9a4a12", name: "Joueur 1" },
              { main: "#3fb6c6", light: "#b8f0f5", dark: "#1d6f7a", name: "Joueur 2" }];

  /* ====================== SAUVEGARDE / OPTIONS ====================== */
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var SET = { music: 0.45, sfx: 0.8, fx: "full", mute: false };
  try { var s0 = JSON.parse(load("merger-coop-settings", "{}")); for (var k0 in s0) if (k0 in SET) SET[k0] = s0[k0]; } catch (e) {}
  function saveSet() { store("merger-coop-settings", JSON.stringify(SET)); }
  var best = Number(load("merger-coop-best", 0)) || 0;

  /* ====================== ÉTAT ====================== */
  var state = "menu";                  // menu | aim | flight | pause | over
  var prevState = "aim";
  var balls = [], parts = [], rings = [], texts = [], bolts = [];
  var players, active = 0, shots = 0, score = 0, shownScore = 0, scoreBump = 0;
  var chain = 0, chainShow = 0, chainLvlShown = 0, typesN = START_TYPES;
  var flying = null, resolveT = 0, calmT = 0, bombsTicked = false, rained = false, overT = 0;
  var flash = 0, flashCol = "#fff", trauma = 0, hitStop = 0, clock = 0, glow = 0;
  var banner = null, toasts = [];
  var stats;
  var ballId = 0;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fxMul() { return SET.fx === "full" ? 1 : 0.45; }

  function mkPlayer(i) {
    return { i: i, ang: -0.42, pow: 0.62, cur: null, next: null, bonus: null,
      rec: 0, recV: 0, load: 1, deny: 0, keys: {}, drag: null };
  }
  function unlockedPowers() { return POWERS.filter(function (p) { return shots >= p.at; }).map(function (p) { return p.kind; }); }
  function isPower(it) { return it && it.kind !== "sq"; }
  function gen(p) {
    if (p.bonus) { var b = p.bonus; p.bonus = null; return { kind: b }; }
    var un = unlockedPowers();
    var queued = players.some(function (q) { return isPower(q.cur) || isPower(q.next); });
    if (un.length && shots >= 8 && !queued && Math.random() < 0.05) return { kind: un[rnd(un.length)] };
    return { kind: "sq", type: TYPES[rnd(typesN)] };
  }

  function newBall(item, x, y) {
    var b = { id: ++ballId, kind: item.kind, type: item.kind === "sq" ? item.type : -1, x: x, y: y, vx: 0, vy: 0, r: R,
      proj: false, age: 0, pop: -1, popLvl: 1, dead: false, frozen: false, touch: false,
      jw: 0, jv: 0, jang: 0, impCd: 0, blink: Math.random() * 4, flip: Math.random() < 0.5 ? -1 : 1,
      breath: Math.random() * TAU, rate: 1.4 + Math.random() * 0.8, pal: false, owner: -1,
      count: item.kind === "bomb" ? 3 : 0, morph: -1, morphTo: -1, waitT: 0, spin: 0 };
    return b;
  }

  function reset() {
    balls = []; parts = []; rings = []; texts = []; bolts = []; toasts = [];
    players = [mkPlayer(0), mkPlayer(1)];
    active = 0; shots = 0; score = 0; shownScore = 0; chain = 0; chainShow = 0; typesN = START_TYPES;
    flying = null; resolveT = 0; calmT = 0; overT = 0; bombsTicked = false; trauma = 0; hitStop = 0; flash = 0;
    stats = { maxChain: 0, maxGroup: 0, shots: 0, powers: 0, popped: 0 };
    players.forEach(function (p) { p.cur = gen(p); p.next = gen(p); });
    // quelques personnages pour commencer, rangés pour qu'aucun groupe de 3 ne se forme tout seul
    var n = 10;
    for (var i = 0; i < n; i++) {
      var x = 150 + (FW - 300) * (i / (n - 1)) + (Math.random() - 0.5) * 10;
      var b = newBall({ kind: "sq", type: TYPES[i % START_TYPES] }, x, -40 - i * 38 - Math.random() * 20);
      b.vy = 120; b.age = 2;
      balls.push(b);
    }
  }

  /* ====================== PHYSIQUE ====================== */
  function isStatic(b) { return b.pop >= 0 || b.frozen || b.dead; }

  function step(dt) {
    var i, j, k, a, b, n = balls.length;
    for (i = 0; i < n; i++) {
      a = balls[i];
      a.touch = false;
      if (isStatic(a)) continue;
      a.vy += G * dt;
      a.vx *= 0.9995; a.vy *= 0.9995;
      var sp = a.vx * a.vx + a.vy * a.vy;
      if (sp > MAXV * MAXV) { sp = MAXV / Math.sqrt(sp); a.vx *= sp; a.vy *= sp; }
      a.x += a.vx * dt; a.y += a.vy * dt;
    }
    // balayage : triés par x, on ne teste que les voisins proches
    balls.sort(function (p, q) { return p.x - q.x; });
    for (k = 0; k < ITER; k++) {
      for (i = 0; i < n; i++) {
        a = balls[i];
        for (j = i + 1; j < n; j++) {
          b = balls[j];
          if (b.x - a.x > a.r + b.r) break;
          collide(a, b, k === 0);
        }
      }
      for (i = 0; i < n; i++) bounds(balls[i], k === 0);
    }
    for (i = 0; i < n; i++) {
      a = balls[i];
      if (isStatic(a)) continue;
      // au repos et en contact : on calme les micro-tremblements pour une pile stable
      if (a.touch && !a.proj && a.vx * a.vx + a.vy * a.vy < 14 * 14) { a.vx *= 0.86; a.vy *= 0.86; }
      if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(a.vx) || !isFinite(a.vy)) { a.x = FW / 2; a.y = 60; a.vx = a.vy = 0; }
    }
  }

  function collide(a, b, first) {
    var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    if (a.dead || b.dead) return;
    var sa = isStatic(a), sb = isStatic(b);
    if (sa && sb) return;
    var d = Math.sqrt(d2);
    if (d < 0.0001) { dx = 0.01; dy = -1; d = 1; }
    var nx = dx / d, ny = dy / d, ov = rr - d;
    var wa = sa ? 0 : (sb ? 1 : 0.5), wb = sb ? 0 : (sa ? 1 : 0.5);
    a.x -= nx * ov * wa; a.y -= ny * ov * wa;
    b.x += nx * ov * wb; b.y += ny * ov * wb;
    a.touch = b.touch = true;
    var rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      var e = -vn > BOUNCE_MIN ? BOUNCE : 0;
      var jn = -(1 + e) * vn;
      a.vx -= nx * jn * wa; a.vy -= ny * jn * wa;
      b.vx += nx * jn * wb; b.vy += ny * jn * wb;
      var tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = vt * 0.1;
      a.vx += tx * jt * wa; a.vy += ty * jt * wa;
      b.vx -= tx * jt * wb; b.vy -= ty * jt * wb;
      if (first && -vn > 90) impact(a, b, nx, ny, -vn);
    }
    if (a.proj) landed(a, b);
    if (b.proj) landed(b, a);
  }

  function bounds(b, first) {
    if (isStatic(b)) return;
    var hit = false, e;
    if (b.x < b.r) {
      b.x = b.r;
      if (b.vx < 0) { if (first && -b.vx > 90) impactWall(b, -1, 0, -b.vx); e = -b.vx > BOUNCE_MIN ? BOUNCE : 0; b.vx = -b.vx * e; b.vy *= 0.985; }
      hit = true;
    } else if (b.x > FW - b.r) {
      b.x = FW - b.r;
      if (b.vx > 0) { if (first && b.vx > 90) impactWall(b, 1, 0, b.vx); e = b.vx > BOUNCE_MIN ? BOUNCE : 0; b.vx = -b.vx * e; b.vy *= 0.985; }
      hit = true;
    }
    if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * BOUNCE; }
    if (b.y > BY) {
      var ex = b.x - BX, ey = b.y - BY, ed = Math.sqrt(ex * ex + ey * ey), lim = BOWL - b.r;
      if (ed > lim) {
        var nx = ex / ed, ny = ey / ed;
        b.x = BX + nx * lim; b.y = BY + ny * lim;
        var vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          if (first && vn > 90) impactWall(b, nx, ny, vn);
          e = vn > BOUNCE_MIN ? BOUNCE : 0;
          b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
          var tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
          b.vx -= tx * vt * 0.05; b.vy -= ty * vt * 0.05;
        }
        hit = true;
      }
    }
    // filet de sécurité : jamais hors du terrain
    if (b.x < b.r) b.x = b.r; if (b.x > FW - b.r) b.x = FW - b.r;
    if (b.y > FH - b.r) b.y = FH - b.r;
    if (hit) { b.touch = true; if (b.proj) landed(b, null); }
  }

  /* premier contact d'un projectile : il redevient un personnage normal ou déclenche son pouvoir */
  function landed(b, other) {
    if (!b.proj) return;
    b.proj = false;
    if (b.kind === "grenade") explode(b, 2.8 * R, "grenade");
    else if (b.kind === "lightning") zap(b);
    else if (b.kind === "rainbow") { b.waitT = 0; }
  }

  /* ====================== GAME FEEL : IMPACTS ====================== */
  var lastImpactSfx = 0;
  function impact(a, b, nx, ny, v) {
    var I = clamp(v / 900, 0, 1);
    var ang = Math.atan2(ny, nx);
    [a, b].forEach(function (q) {
      if (isStatic(q)) return;
      if (I * 10 > q.jv) { q.jv += I * 10; q.jang = ang; }
    });
    var cx = a.x + nx * a.r, cy = a.y + ny * a.r;
    if (I > 0.2) dust(cx, cy, Math.round(2 + I * 6), a.type >= 0 ? SQ[a.type].body : "#fff");
    if (I > 0.55) rings.push({ x: cx, y: cy, r0: 4, r1: 18 + I * 26, t: 0, dur: 0.28, col: "rgba(255,255,255,.7)", w: 3 });
    if (clock - lastImpactSfx > 0.035 && (a.impCd <= 0 || b.impCd <= 0)) { sfxImpact(I); lastImpactSfx = clock; a.impCd = b.impCd = 0.08; }
    if (I > 0.7) trauma = Math.min(0.6, trauma + 0.06);
  }
  function impactWall(b, nx, ny, v) {
    var I = clamp(v / 900, 0, 1);
    if (I * 10 > b.jv) { b.jv += I * 10; b.jang = Math.atan2(ny, nx); }
    if (I > 0.2) dust(b.x + nx * b.r, b.y + ny * b.r, Math.round(2 + I * 5), "#e9dcc0");
    if (clock - lastImpactSfx > 0.035 && b.impCd <= 0) { sfxImpact(I * 0.8); lastImpactSfx = clock; b.impCd = 0.08; }
  }

  /* ====================== PARTICULES ====================== */
  function dust(x, y, n, col) {
    n = Math.round(n * fxMul());
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 40 + Math.random() * 110;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.3 + Math.random() * 0.25, col: col, size: 2 + Math.random() * 3, g: 300, kind: "dot" });
    }
  }
  function burst(x, y, col, n, power) {
    n = Math.round(n * fxMul());
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = (90 + Math.random() * 260) * (power || 1);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0, life: 0.45 + Math.random() * 0.45, col: Math.random() < 0.25 ? "#fff8e0" : col,
        size: 3 + Math.random() * 4, g: 520, kind: Math.random() < 0.3 ? "star" : "dot", rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
    }
  }
  function floatText(x, y, txt, col, size) { texts.push({ x: x, y: y, txt: txt, col: col || "#fff3c4", size: size || 26, t: 0, life: 1.1 }); }

  /* ====================== COMBINAISONS ====================== */
  function groupable(b) { return b.kind === "sq" && b.type >= 0 && b.pop < 0 && !b.proj && b.age > 0.06 && b.morph < 0; }
  function neighbors(b, list, pad) {
    var out = [], lim;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === b) continue;
      lim = b.r + o.r + pad;
      var dx = o.x - b.x, dy = o.y - b.y;
      if (dx * dx + dy * dy <= lim * lim) out.push(o);
    }
    return out;
  }
  function findGroups() {
    var cand = balls.filter(groupable), seen = new Set(), groups = [];
    cand.forEach(function (b) { b.pal = false; });
    cand.forEach(function (b) {
      if (seen.has(b)) return;
      var stack = [b], grp = [];
      seen.add(b);
      while (stack.length) {
        var a = stack.pop();
        grp.push(a);
        neighbors(a, cand, TOUCH).forEach(function (o) { if (!seen.has(o) && o.type === a.type) { seen.add(o); stack.push(o); } });
      }
      if (grp.length >= 2) grp.forEach(function (q) { q.pal = true; });
      if (grp.length >= GROUP) groups.push(grp);
    });
    return groups;
  }

  var popEvents = [];
  function startPop(group, kind) {
    var lvl = Math.max(1, chain);
    group.forEach(function (b) { b.pop = kind === "blast" ? ANTIC * 0.55 : 0; b.popLvl = lvl; b.vx = b.vy = 0; });
    popEvents.push({ balls: group, lvl: lvl, kind: kind || "match", t: 0, done: false });
  }

  function checkCombos() {
    var groups = findGroups();
    if (!groups.length) return;
    chain++;
    stats.maxChain = Math.max(stats.maxChain, chain);
    groups.forEach(function (g) {
      stats.maxGroup = Math.max(stats.maxGroup, g.length);
      startPop(g, "match");
      // petit son d'anticipation
      sfxAntic(chain);
      // gros combo → un pouvoir en bonus pour le tireur
      if ((g.length >= 5 || chain >= 3) && flyingOwner() >= 0) grantPower(players[flyingOwner()]);
    });
    if (chain >= 2) { chainShow = 1.6; chainLvlShown = chain; }
  }
  var lastShooter = 0;
  function flyingOwner() { return state === "flight" ? lastShooter : -1; }

  function grantPower(p) {
    if (isPower(p.cur) || isPower(p.next) || p.bonus) return;
    var un = unlockedPowers(); if (!un.length) un = ["grenade"];
    var kind = un[rnd(un.length)];
    p.next = { kind: kind };
    toast(p.i, "Bonus : " + ART.POWERS[kind].name + " !");
    sfxBonus();
  }

  function updatePops(dt) {
    balls.forEach(function (b) { if (b.pop >= 0) b.pop += dt; });
    popEvents.forEach(function (ev) {
      if (ev.done) return;
      var ready = ev.balls.every(function (b) { return b.pop >= POP_T; });
      if (!ready) return;
      ev.done = true;
      var cx = 0, cy = 0, n = ev.balls.length;
      ev.balls.forEach(function (b) {
        b.dead = true; cx += b.x; cy += b.y;
        var col = b.type >= 0 ? SQ[b.type].body : b.kind === "bomb" ? "#8f88b8" : "#ffe66d";
        burst(b.x, b.y, col, 12 + ev.lvl * 3, 1 + ev.lvl * 0.12);
        rings.push({ x: b.x, y: b.y, r0: R * 0.6, r1: R * 1.7, t: 0, dur: 0.3, col: col, w: 4 });
      });
      cx /= n; cy /= n;
      stats.popped += n;
      var base = ev.kind === "match" ? n * 10 + Math.max(0, n - 3) * 20 : n * 15;
      var gain = base * ev.lvl;
      addScore(gain);
      var big = ev.lvl >= 2 || n >= 5;
      floatText(cx, cy - 10, "+" + gain.toLocaleString("fr-FR") + (ev.lvl > 1 ? "  x" + ev.lvl : ""), ev.lvl > 1 ? "#ffe066" : "#fff3c4", 24 + Math.min(18, ev.lvl * 5 + n));
      rings.push({ x: cx, y: cy, r0: R, r1: R * (2.6 + ev.lvl * 0.5), t: 0, dur: 0.45, col: "rgba(255,248,220,.9)", w: 5 + ev.lvl });
      if (ev.kind === "match") sfxPop(ev.lvl, n);
      trauma = Math.min(0.7, trauma + 0.05 + 0.07 * ev.lvl * fxMul());
      glow = Math.min(1, glow + 0.2 * ev.lvl);
      if (big) { hitStop = Math.max(hitStop, 0.05 + 0.025 * Math.min(4, ev.lvl)); }
      if (ev.lvl >= 3 && SET.fx === "full") { flash = 0.25; flashCol = "#fff6d8"; }
    });
    popEvents = popEvents.filter(function (ev) { return !ev.done; });
    if (balls.some(function (b) { return b.dead; })) balls = balls.filter(function (b) { return !b.dead; });
  }

  function addScore(n) { score += n; scoreBump = 1; }

  /* ====================== POUVOIRS ====================== */
  function explode(src, rad, kind) {
    stats.powers += kind === "grenade" ? 1 : 0;
    src.dead = true;
    var victims = balls.filter(function (b) { return b !== src && b.pop < 0 && Math.hypot(b.x - src.x, b.y - src.y) < rad + b.r * 0.4; });
    // souffle : on pousse ceux qui sont un peu plus loin
    balls.forEach(function (b) {
      if (b === src || victims.indexOf(b) >= 0 || isStatic(b)) return;
      var dx = b.x - src.x, dy = b.y - src.y, d = Math.hypot(dx, dy) || 1;
      if (d < rad * 2.2) { var f = (1 - d / (rad * 2.2)) * 520; b.vx += dx / d * f; b.vy += dy / d * f - 60; b.jv += 4; b.jang = Math.atan2(dy, dx); }
    });
    if (victims.length) { if (chain < 1) chain = 1; startPop(victims, "blast"); }
    burst(src.x, src.y, "#ffb347", 30, 1.5); burst(src.x, src.y, "#ff6b4a", 18, 1.2);
    rings.push({ x: src.x, y: src.y, r0: 6, r1: rad * 1.25, t: 0, dur: 0.4, col: "rgba(255,200,120,.95)", w: 9 });
    rings.push({ x: src.x, y: src.y, r0: 6, r1: rad * 2.1, t: 0, dur: 0.6, col: "rgba(255,255,255,.6)", w: 4 });
    trauma = Math.min(0.8, trauma + 0.35 * fxMul()); hitStop = Math.max(hitStop, 0.09);
    if (SET.fx === "full") { flash = 0.35; flashCol = "#ffe2b0"; }
    sfxBoom(kind === "bomb" ? 1.25 : 1);
    floatText(src.x, src.y - 30, kind === "bomb" ? "BOUM !" : "BOUM !", "#ffcf7a", 30);
  }

  function zap(src) {
    stats.powers++;
    src.dead = true;
    var x = src.x;
    var victims = balls.filter(function (b) { return b !== src && b.pop < 0 && Math.abs(b.x - x) < R * 1.25; });
    if (victims.length) { if (chain < 1) chain = 1; startPop(victims, "blast"); }
    // la foudre : une ligne brisée du haut jusqu'au fond
    var pts = [], y = 0, floorY = BY + Math.sqrt(Math.max(0, BOWL * BOWL - (x - BX) * (x - BX)));
    while (y < floorY) { pts.push([x + (Math.random() - 0.5) * 26, y]); y += 22 + Math.random() * 18; }
    pts.push([x, floorY]);
    bolts.push({ x: x, pts: pts, t: 0, dur: 0.45 });
    for (var i = 0; i < 16 * fxMul(); i++) { var yy = Math.random() * floorY; parts.push({ x: x, y: yy, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 200, t: 0, life: 0.3 + Math.random() * 0.3, col: "#fff59a", size: 2 + Math.random() * 3, g: 0, kind: "spark" }); }
    trauma = Math.min(0.8, trauma + 0.3 * fxMul()); hitStop = Math.max(hitStop, 0.08);
    if (SET.fx === "full") { flash = 0.45; flashCol = "#fffbd0"; }
    sfxZap();
    floatText(x, 70, "ZAP !", "#fff59a", 30);
  }

  // l'arc-en-ciel prend la couleur qui fait le plus gros groupe autour de lui
  function rainbowCheck(b, dt) {
    if (b.kind !== "rainbow" || b.proj || b.pop >= 0) return;
    if (b.morph >= 0) {
      b.morph += dt;
      if (b.morph >= 0.45) { b.kind = "sq"; b.type = b.morphTo; b.morph = -1; burst(b.x, b.y, SQ[b.type].body, 14, 0.8); sfxMagicEnd(); }
      return;
    }
    b.waitT += dt;
    var cand = balls.filter(groupable);
    var near = neighbors(b, cand, 4);
    var choice = -1;
    if (near.length) {
      var bestN = 0;
      near.forEach(function (o) {
        var t = o.type, seen = new Set([b]), stack = near.filter(function (q) { return q.type === t; }), cnt = 1;
        stack.forEach(function (q) { seen.add(q); });
        while (stack.length) { var a = stack.pop(); cnt++; neighbors(a, cand, TOUCH).forEach(function (q) { if (!seen.has(q) && q.type === t) { seen.add(q); stack.push(q); } }); }
        if (cnt > bestN) { bestN = cnt; choice = t; }
      });
    } else if (b.waitT > 1.4) choice = TYPES[rnd(typesN)];
    if (choice >= 0) { b.morph = 0; b.morphTo = choice; sfxMagic(); stats.powers++; }
  }

  // les bombes perdent 1 à chaque fin de tour
  function tickBombs() {
    var boom = false;
    balls.forEach(function (b) {
      if (b.kind !== "bomb" || b.proj || b.pop >= 0 || b.dead || b.shotNo === shots) return;   // pas au tour où elle a été tirée
      b.count--;
      b.jv += 5; b.jang = -Math.PI / 2;
      sfxTick(b.count);
      if (b.count <= 0) { explode(b, 3.3 * R, "bomb"); stats.powers++; boom = true; }
    });
    return boom;
  }

  /* ====================== TIR ET TOURS ====================== */
  function muzzle(p) {
    var L = LAUNCH[p.i], a = p.ang;
    return { x: L.x + Math.cos(a) * L.dir * 34, y: L.y + Math.sin(a) * 34, vx: Math.cos(a) * L.dir, vy: Math.sin(a) };
  }
  function shotSpeed(p) { return VMIN + (VMAX - VMIN) * p.pow; }

  function fire(p) {
    if (state !== "aim") return;
    if (p.i !== active) { p.deny = 0.4; sfxDeny(); toast(p.i, "Attends ton tour !"); return; }
    var m = muzzle(p), v = shotSpeed(p), it = p.cur;
    var b = newBall(it, m.x, m.y);
    b.vx = m.vx * v; b.vy = m.vy * v; b.proj = true; b.owner = p.i; b.flip = LAUNCH[p.i].dir; b.shotNo = shots + 1;
    balls.push(b);
    flying = b; lastShooter = p.i;
    p.cur = p.next; p.next = gen(p); p.load = 0;
    p.recV = 7 + p.pow * 5;
    // petite bouffée au départ
    for (var i = 0; i < 8 * fxMul(); i++) { var a = Math.atan2(m.vy, m.vx) + (Math.random() - 0.5) * 1.4, s = 60 + Math.random() * 120; parts.push({ x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.35, col: "#fffaf0", size: 3 + Math.random() * 3, g: -40, kind: "dot" }); }
    rings.push({ x: m.x, y: m.y, r0: 6, r1: 26, t: 0, dur: 0.22, col: PCOL[p.i].light, w: 3 });
    trauma = Math.min(0.5, trauma + 0.04);
    sfxLaunch(p.pow, p.i);
    shots++; stats.shots++;
    state = "flight"; resolveT = 0; calmT = 0; chain = 0; bombsTicked = false; rained = false;
    if (isPower(it)) toast(p.i, ART.POWERS[it.kind].name + " !");
  }

  function swapItems(p) {
    if (state === "over" || state === "menu" || state === "pause") return;
    var t = p.cur; p.cur = p.next; p.next = t; p.load = 0.4;
    sfxSwap();
  }

  function updateFlight(dt) {
    resolveT += dt;
    var moving = balls.some(function (b) { return !isStatic(b) && b.vx * b.vx + b.vy * b.vy > 32 * 32; });
    var busy = popEvents.length > 0 || balls.some(function (b) { return b.morph >= 0 || (b.kind === "rainbow" && !b.proj); });
    var stillFlying = flying && flying.proj && !flying.dead && resolveT < 4;
    if (!moving && !busy && !stillFlying) calmT += dt; else calmT = 0;
    if ((calmT > 0.22 && resolveT > 0.4) || resolveT > 7) endTurn();
  }

  function endTurn() {
    if (!bombsTicked) {
      bombsTicked = true;
      if (tickBombs()) { calmT = 0; resolveT = Math.min(resolveT, 5); return; }
    }
    // pluie d'écureuils
    if (!rained && shots > 0 && shots % RAIN_EVERY === 0) {
      rained = true;
      var n = Math.min(6, 2 + Math.floor(shots / 20));
      for (var i = 0; i < n; i++) {
        var x = 110 + Math.random() * (FW - 220);
        var b = newBall({ kind: "sq", type: TYPES[rnd(typesN)] }, x, -30 - i * 50);
        b.vy = 60; b.age = 0.5;
        balls.push(b);
      }
      showBanner("Pluie d'écureuils !", -1);
      sfxRain();
      calmT = 0; resolveT = Math.min(resolveT, 3);
      return;
    }
    flying = null;
    // nouveau personnage débloqué ?
    var want = START_TYPES + UNLOCK_AT.filter(function (s) { return score >= s; }).length;
    want = Math.min(TYPES.length, want);
    if (want > typesN) {
      typesN = want;
      var t = TYPES[typesN - 1];
      showBanner("Nouveau venu : " + SQ[t].name + " !", t);
      sfxBonus();
    }
    active = 1 - active;
    state = "aim";
    chain = 0;
    showBanner("À toi, " + PCOL[active].name + " !", -1, active);
    sfxTurn(active);
  }

  /* ====================== FIN DE PARTIE ====================== */
  function checkDanger(dt) {
    var danger = balls.some(function (b) { return !b.proj && b.pop < 0 && b.age > 1 && b.y - b.r < DANGER && b.vx * b.vx + b.vy * b.vy < 60 * 60; });
    overT = danger ? overT + dt : Math.max(0, overT - dt * 2);
    if (overT > 2.6) gameOver();
  }

  /* ====================== SON (WebAudio, aucun fichier) ====================== */
  var AC = null, master, sfxBus, musicBus, noiseBuf, delayNode;
  function audio() {
    if (AC) return AC;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination);
      sfxBus = AC.createGain(); sfxBus.connect(master);
      musicBus = AC.createGain(); musicBus.connect(master);
      // écho doux pour la musique
      delayNode = AC.createDelay(1); delayNode.delayTime.value = 0.42;
      var fb = AC.createGain(); fb.gain.value = 0.32; var dl = AC.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 1800;
      delayNode.connect(dl); dl.connect(fb); fb.connect(delayNode); dl.connect(musicBus);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 1, AC.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
    } catch (e) { AC = null; }
    return AC;
  }
  function applyVolumes() {
    if (!AC) return;
    master.gain.value = SET.mute ? 0 : 1;
    sfxBus.gain.value = SET.sfx * 0.9;
    musicBus.gain.value = SET.music * 0.55;
  }
  function tone(f, d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    var v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g);
    if (o.filter) { var fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.filter; g.connect(fl); fl.connect(o.bus || sfxBus); }
    else g.connect(o.bus || sfxBus);
    if (o.echo && delayNode) g.connect(delayNode);
    osc.start(t); osc.stop(t + d + 0.05);
  }
  function noise(d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), src = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter();
    src.buffer = noiseBuf; fl.type = o.type || "lowpass"; fl.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + d);
    fl.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(o.vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  function note(i, base) { return (base || 392) * Math.pow(2, PENTA[clamp(i, 0, PENTA.length - 1)] / 12); }
  function sfxLaunch(pow, pi) { tone(170 + pow * 60, 0.22, { to: 420 + pow * 200, type: "sine", vol: 0.22, glide: 0.12 }); noise(0.16, { f: 900, fTo: 300, vol: 0.12 }); tone(pi ? 660 : 587, 0.12, { type: "triangle", vol: 0.05, delay: 0.02 }); }
  function sfxImpact(I) { var f = 520 - I * 300 + Math.random() * 60; tone(f, 0.07 + I * 0.08, { to: f * 0.6, type: "sine", vol: 0.04 + I * 0.16 }); noise(0.04 + I * 0.05, { f: 2400 - I * 1400, vol: 0.03 + I * 0.08 }); }
  function sfxAntic(lvl) { tone(note(lvl + 1, 330), 0.14, { to: note(lvl + 2, 330), type: "triangle", vol: 0.06 }); }
  function sfxPop(lvl, n) {
    var i = Math.min(10, lvl * 2 + Math.min(2, n - 3));
    tone(note(i, 392), 0.18, { to: note(i, 392) * 1.9, type: "sine", vol: 0.24, glide: 0.08 });
    tone(note(i + 2, 392), 0.3, { type: "triangle", vol: 0.08, delay: 0.03 });
    noise(0.06, { f: 3200, type: "highpass", vol: 0.06 });
    if (lvl >= 2) for (var k = 0; k < Math.min(5, lvl + 1); k++) tone(note(i + 2 + k, 523), 0.25, { type: "triangle", vol: 0.06, delay: 0.06 + k * 0.05 });
  }
  function sfxBoom(m) { noise(0.7 * m, { f: 900, fTo: 80, vol: 0.45 }); tone(110, 0.6 * m, { to: 40, type: "sine", vol: 0.35 }); tone(220, 0.15, { to: 70, type: "triangle", vol: 0.12 }); }
  function sfxZap() { noise(0.35, { type: "highpass", f: 2500, vol: 0.18 }); tone(1400, 0.3, { to: 120, type: "square", vol: 0.06, glide: 0.25 }); tone(900, 0.2, { to: 200, type: "sawtooth", vol: 0.04, delay: 0.05 }); }
  function sfxMagic() { for (var k = 0; k < 6; k++) tone(note(4 + k, 523), 0.3, { type: "triangle", vol: 0.07, delay: k * 0.05, echo: true }); }
  function sfxMagicEnd() { tone(note(9, 523), 0.4, { type: "sine", vol: 0.1, echo: true }); }
  function sfxTick(c) { tone(c <= 1 ? 1200 : 900, 0.06, { type: "square", vol: 0.06 }); }
  function sfxBonus() { [0, 2, 4, 7].forEach(function (k, i) { tone(note(k + 3, 523), 0.25, { type: "triangle", vol: 0.08, delay: i * 0.07 }); }); }
  function sfxTurn(pi) { tone(pi ? 659 : 523, 0.3, { type: "sine", vol: 0.08 }); tone(pi ? 988 : 784, 0.35, { type: "sine", vol: 0.05, delay: 0.08 }); }
  function sfxRain() { for (var k = 0; k < 5; k++) tone(note(8 - k, 523), 0.18, { type: "triangle", vol: 0.06, delay: k * 0.07 }); }
  function sfxSwap() { tone(700, 0.08, { to: 900, type: "sine", vol: 0.07 }); }
  function sfxDeny() { tone(220, 0.12, { to: 180, type: "triangle", vol: 0.08 }); }
  function sfxUi() { tone(880, 0.06, { type: "sine", vol: 0.06 }); }
  function sfxOver() { [7, 4, 2, 0].forEach(function (k, i) { tone(note(k, 330), 0.5, { type: "triangle", vol: 0.1, delay: i * 0.16, echo: true }); }); }

  /* ---------- musique relaxante générée en direct ---------- */
  var music = { on: false, timer: null, next: 0, beat: 0 };
  var CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];   // Fmaj7 Em7 Dm7 Cmaj7
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startMusic() {
    if (!audio() || music.on) return;
    music.on = true; music.next = AC.currentTime + 0.1; music.beat = 0;
    music.timer = setInterval(scheduleMusic, 120);
  }
  function stopMusic() { music.on = false; if (music.timer) clearInterval(music.timer); music.timer = null; }
  function scheduleMusic() {
    if (!AC || !music.on) return;
    var spb = 60 / 70 / 2;   // croches à 70 bpm
    while (music.next < AC.currentTime + 0.4) {
      var b = music.beat, bar = Math.floor(b / 8), chord = CHORDS[Math.floor(bar / 2) % 4], t = music.next - AC.currentTime;
      if (b % 16 === 0) chord.forEach(function (m) { tone(midi(m), spb * 16, { type: "triangle", vol: 0.035, att: 0.9, filter: 900, bus: musicBus, delay: t }); });
      if (b % 8 === 0) tone(midi(chord[0] - 12), spb * 6, { type: "sine", vol: 0.07, att: 0.05, bus: musicBus, delay: t });
      if (b % 2 === 0 && Math.random() < 0.42) {
        var m = chord[rnd(4)] + 12 + (Math.random() < 0.3 ? 12 : 0);
        tone(midi(m), 0.9, { type: "sine", vol: 0.045, att: 0.01, bus: musicBus, delay: t, echo: true });
      }
      music.next += spb; music.beat++;
    }
  }

  /* ====================== DESSIN ====================== */
  var art = ART.cache();
  var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;
  var bgCanvas = document.createElement("canvas");

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    // le terrain en haut, une bande en bas pour les boutons
    S = Math.min((cw - 16) / FW, (ch - 64) / FH);
    OX = (cw - FW * S) / 2; OY = Math.max(10, (ch - 54 - FH * S) / 2);
    art.clear();
    paintBackground();
  }

  function paintBackground() {
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    var g = bgCanvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#27465f"); sky.addColorStop(0.55, "#3d6b62"); sky.addColorStop(1, "#5d8a55");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // lumières douces (bokeh)
    var seed = 7; function r01() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 26; i++) {
      var x = r01() * W, y = r01() * H * 0.8, rad = 10 + r01() * 40;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,236,190," + (0.05 + r01() * 0.08) + ")"); gr.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
    // collines et sapins lointains
    [["rgba(20,44,40,.45)", 0.72, 26], ["rgba(18,38,30,.6)", 0.82, 34]].forEach(function (L) {
      g.fillStyle = L[0]; g.beginPath(); g.moveTo(0, H);
      for (var x2 = 0; x2 <= W + 40; x2 += L[2]) { var y2 = H * L[1] - (Math.sin(x2 * 0.013 + L[1] * 9) * 18 + (r01() * 30)); g.lineTo(x2, y2); g.lineTo(x2 + L[2] / 2, y2 - 26 - r01() * 20); }
      g.lineTo(W, H); g.closePath(); g.fill();
    });
  }

  function fieldPath(pad) {
    var a0 = Math.asin(Math.min(1, (BX + pad) / (BOWL + pad)));
    ctx.beginPath();
    ctx.moveTo(-pad, -pad);
    ctx.lineTo(-pad, BY + Math.cos(a0) * (BOWL + pad));
    ctx.arc(BX, BY, BOWL + pad, Math.PI / 2 + a0, Math.PI / 2 - a0, true);
    ctx.lineTo(FW + pad, -pad);
    ctx.closePath();
  }

  function drawField(now) {
    // cadre en bois clair + intérieur
    ctx.fillStyle = "#c79a62"; fieldPath(12); ctx.fill();
    ctx.fillStyle = "#8f6a3f"; fieldPath(6); ctx.fill();
    var ig = ctx.createLinearGradient(0, 0, 0, FH);
    ig.addColorStop(0, "#1d3a3a"); ig.addColorStop(1, "#24433a");
    ctx.fillStyle = ig; fieldPath(0); ctx.fill();
    // lueur des combos
    if (glow > 0.01) {
      var gg = ctx.createRadialGradient(FW / 2, FH * 0.6, 20, FW / 2, FH * 0.6, FW * 0.7);
      gg.addColorStop(0, "rgba(255,214,140," + (0.22 * glow) + ")"); gg.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = gg; fieldPath(0); ctx.fill();
    }
    // ligne de danger
    var pulse = overT > 0 ? 0.5 + 0.5 * Math.sin(now / 90) : 0;
    ctx.strokeStyle = overT > 0 ? "rgba(255," + Math.round(90 + 100 * pulse) + ",90,1)" : "rgba(255,170,120,.35)";
    ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(90, DANGER); ctx.lineTo(FW - 90, DANGER); ctx.stroke();
    ctx.setLineDash([]);
  }

  // trajectoire prévue : on simule le même vol jusqu'au premier contact
  function predict(p) {
    var m = muzzle(p), v = shotSpeed(p), x = m.x, y = m.y, vx = m.vx * v, vy = m.vy * v, pts = [], dt = 1 / 120, hit = null;
    var cand = balls.filter(function (b) { return b.pop < 0 && !b.proj; });
    for (var i = 0; i < 300; i++) {
      vy += G * dt; x += vx * dt; y += vy * dt;
      if (i % 3 === 0) pts.push(x, y);
      if (x < R || x > FW - R || y < R) { hit = { x: clamp(x, R, FW - R), y: Math.max(R, y) }; break; }
      if (y > BY) { var ex = x - BX, ey = y - BY; if (ex * ex + ey * ey > (BOWL - R) * (BOWL - R)) { hit = { x: x, y: y }; break; } }
      for (var j = 0; j < cand.length; j++) { var b = cand[j], dx = b.x - x, dy = b.y - y, lim = b.r + R; if (dx * dx + dy * dy < lim * lim) { hit = { x: x, y: y }; break; } }
      if (hit) break;
    }
    return { pts: pts, hit: hit };
  }

  function drawPreview(p) {
    var me = p.i === active && state === "aim";
    var pr = predict(p), col = PCOL[p.i];
    var alpha = me ? 1 : 0.35;
    for (var i = 0; i < pr.pts.length; i += 2) {
      var k = i / pr.pts.length;
      ctx.globalAlpha = alpha * (1 - k * 0.6);
      ctx.fillStyle = col.light;
      ctx.beginPath(); ctx.arc(pr.pts[i], pr.pts[i + 1], 3.2 - k * 1.4 + (me ? 0.6 * Math.sin(clock * 8 - i * 0.2) : 0), 0, TAU); ctx.fill();
    }
    if (pr.hit) {
      ctx.globalAlpha = alpha * 0.8; ctx.strokeStyle = col.light; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(pr.hit.x, pr.hit.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  function drawItem(it, x, y, r, o) {
    o = o || {};
    if (!it) return;
    if (it.kind === "sq") art.blit(ctx, x, y, it.type, r, S * dpr, o);
    else ART.drawPower(ctx, it.kind, x, y, r * (o.k || 1), { t: clock, count: it.kind === "bomb" ? 3 : null, alpha: o.alpha });
  }

  function drawLauncher(p) {
    var L = LAUNCH[p.i], col = PCOL[p.i], me = p.i === active && (state === "aim" || state === "flight");
    var dir = L.dir, a = p.ang, rec = p.rec;
    ctx.save();
    ctx.translate(L.x, L.y);
    if (p.deny > 0) ctx.translate(Math.sin(p.deny * 60) * 4 * p.deny, 0);
    // halo du joueur actif
    if (me) {
      var pr = 30 + Math.sin(clock * 4) * 3;
      var hg = ctx.createRadialGradient(0, 0, 10, 0, 0, pr + 22);
      hg.addColorStop(0, col.main + "88"); hg.addColorStop(1, col.main + "00");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, pr + 22, 0, TAU); ctx.fill();
    }
    // socle (souche)
    ctx.fillStyle = "#7a5230"; ctx.strokeStyle = "#2b1709"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(-dir * 6, 22, 24, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#946436"; ctx.fillRect(-dir * 6 - 20, 4, 40, 18); ctx.strokeRect(-dir * 6 - 20, 4, 40, 18);
    // canon qui recule (ressort)
    ctx.save();
    ctx.rotate(dir > 0 ? a : Math.PI - a);
    ctx.translate(-rec * 9, 0);
    ctx.scale(1 - rec * 0.12, 1 + rec * 0.22);
    var bg = ctx.createLinearGradient(0, -14, 0, 14);
    bg.addColorStop(0, col.light); bg.addColorStop(0.5, col.main); bg.addColorStop(1, col.dark);
    ctx.fillStyle = bg; ctx.strokeStyle = "#2b1709"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(30, -15); ctx.quadraticCurveTo(38, 0, 30, 15); ctx.lineTo(-12, 12); ctx.quadraticCurveTo(-20, 0, -12, -12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-6, -9, 30, 4);
    // jauge de puissance sur le canon
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-8, 6, 34, 4);
    ctx.fillStyle = "#fff3c4"; ctx.fillRect(-8, 6, 34 * p.pow, 4);
    ctx.restore();
    // le personnage chargé, qui attend en se dandinant
    var m = muzzle(p);
    var bob = Math.sin(clock * 3 + p.i) * 1.5, k = 0.55 + 0.45 * easeOutBack(Math.min(1, p.load));
    ctx.restore();
    drawItem(p.cur, m.x - Math.cos(a) * dir * 6, m.y - Math.sin(a) * 6 + bob, R * 0.92, { k: k, flip: -dir, lx: Math.cos(a) * dir, ly: Math.sin(a), wag: Math.sin(clock * 4) });
    // étiquette du joueur + suivant
    var tagX = L.x + dir * 14, tagY = 34;
    ctx.save();
    ctx.globalAlpha = me ? 1 : 0.75;
    roundRect(tagX - 40, tagY - 15, 80, 28, 14);
    ctx.fillStyle = me ? col.main : "rgba(20,30,30,.65)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = me ? "#fff3c4" : col.main; ctx.stroke();
    ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fffaf0"; ctx.fillText(p.i === 0 ? "J1" : "J2", tagX - 14, tagY);
    ctx.restore();
    // le suivant, dans une bulle à côté de l'étiquette
    var nx = tagX + 22, ny = tagY;
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(nx, ny, 13, 0, TAU); ctx.fill();
    drawItem(p.next, nx, ny + 2, 10, { flip: -dir });
    // flèche « à toi ! »
    if (me && state === "aim") {
      var ay = 74 + Math.sin(clock * 6) * 4;
      ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "#2b1709"; ctx.strokeText("À toi !", L.x + dir * 60, ay);
      ctx.fillStyle = col.light; ctx.fillText("À toi !", L.x + dir * 60, ay);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function drawBall(b) {
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var def = null, k = 1 + 0.022 * Math.sin(clock * b.rate + b.breath), alpha = 1, mood = "", white = 0, ox = 0, oy = 0;
    // en vol : étiré dans le sens du mouvement
    if (b.proj && sp > 50) { var s = Math.min(0.24, sp / 3800); def = { ang: Math.atan2(b.vy, b.vx), sx: 1 + s, sy: 1 - s * 0.55 }; }
    // après un choc : écrasé puis rebond élastique (visuel)
    else if (Math.abs(b.jw) > 0.01) { def = { ang: b.jang, sx: 1 - b.jw, sy: 1 + b.jw * 0.7 }; }
    // combinaison : anticipation (gonfle + tremble + blanchit), compression, POP
    if (b.pop >= 0) {
      mood = "pop";
      if (b.pop < ANTIC) { var q = b.pop / ANTIC; k *= 1 + 0.18 * q; ox = Math.sin(b.pop * 95) * 1.6 * q; oy = Math.cos(b.pop * 80) * 1.2 * q; white = 0.45 * q; }
      else { var c = (b.pop - ANTIC) / (POP_T - ANTIC); def = { ang: 0, sx: 1.18 + 0.3 * c, sy: 1.18 - 0.55 * c }; white = 0.55 + 0.4 * c; }
    } else if (b.y - b.r < DANGER + 26 && b.age > 1 && !b.proj) mood = "worried";
    else if (b.pal) mood = "happy";
    if (b.kind === "sq") {
      var tgt = flying && !flying.dead ? flying : { x: LAUNCH[active].x, y: LAUNCH[active].y };
      var dx = tgt.x - b.x, dy = tgt.y - b.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      art.blit(ctx, b.x + ox, b.y + oy, b.type, b.r, S * dpr, { k: k, def: def, blink: b.blink, flip: b.flip, lx: dx / dl, ly: dy / dl, mood: mood,
        wag: Math.sin(clock * b.rate * (mood ? 3 : 1.3) + b.breath) });
    } else {
      ctx.save(); ctx.translate(b.x + ox, b.y + oy);
      if (def) { ctx.rotate(def.ang); ctx.scale(def.sx, def.sy); ctx.rotate(-def.ang); }
      if (b.kind === "rainbow" && b.morph >= 0) {
        // transformation magique : le joker tourne, rétrécit et prend sa nouvelle couleur
        var m = b.morph / 0.45;
        ART.drawPower(ctx, "rainbow", 0, 0, b.r * (1 - 0.3 * Math.sin(m * Math.PI)), { t: clock * (1 + m * 6), alpha: 1 - m * 0.6 });
        ctx.globalAlpha = m; art.blit(ctx, 0, 0, b.morphTo, b.r, S * dpr, { k: 0.6 + 0.4 * m }); ctx.globalAlpha = 1;
      } else ART.drawPower(ctx, b.kind, 0, 0, b.r * k, { t: clock, count: b.kind === "bomb" && !b.proj ? b.count : null });
      ctx.restore();
    }
    if (white > 0) { ctx.globalAlpha = white; ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, b.r * k * 1.02, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }

  function drawEffects() {
    rings.forEach(function (r) {
      var q = r.t / r.dur, e = 1 - Math.pow(1 - q, 3);
      ctx.globalAlpha = Math.max(0, 1 - q); ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (1 - q * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    bolts.forEach(function (b) {
      var q = b.t / b.dur;
      ctx.globalAlpha = Math.max(0, 1 - q);
      ctx.strokeStyle = "rgba(255,250,170,.5)"; ctx.lineWidth = 16 * (1 - q);
      ctx.beginPath(); b.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
      ctx.strokeStyle = "#fffef0"; ctx.lineWidth = 4;
      ctx.beginPath(); b.pts.forEach(function (p, i) { var jx = (Math.random() - 0.5) * 6 * (1 - q); if (i) ctx.lineTo(p[0] + jx, p[1]); else ctx.moveTo(p[0] + jx, p[1]); }); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    parts.forEach(function (p) {
      var q = p.t / p.life;
      ctx.globalAlpha = Math.max(0, 1 - q * q);
      ctx.fillStyle = p.col;
      if (p.kind === "star") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        var s = p.size * 1.4 * (1 - q * 0.5);
        ctx.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? s * 0.4 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.kind === "spark") {
        ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - q * 0.5), 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    texts.forEach(function (t) {
      var q = t.t / t.life, sc = q < 0.15 ? easeOutBack(q / 0.15) : 1;
      ctx.save(); ctx.translate(t.x, t.y - q * 40); ctx.scale(sc, sc);
      ctx.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
      ctx.font = "900 " + t.size + "px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6; ctx.strokeStyle = "#2b1709"; ctx.strokeText(t.txt, 0, 0);
      ctx.fillStyle = t.col; ctx.fillText(t.txt, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    // score commun, en haut au centre
    ctx.save();
    ctx.translate(FW / 2, 34);
    var sc = 1 + scoreBump * 0.18;
    ctx.scale(sc, sc);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "rgba(230,245,225,.8)"; ctx.fillText("SCORE D'ÉQUIPE", 0, -18);
    ctx.font = "900 34px Nunito, sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = "#16261f";
    var txt = Math.round(shownScore).toLocaleString("fr-FR");
    ctx.strokeText(txt, 0, 6); ctx.fillStyle = "#fff3c4"; ctx.fillText(txt, 0, 6);
    ctx.restore();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = "rgba(230,245,225,.65)";
    ctx.fillText("meilleur : " + Math.max(best, score).toLocaleString("fr-FR"), FW / 2, 64);
    // personnages en jeu
    for (var i = 0; i < typesN; i++) art.blit(ctx, FW / 2 + (i - (typesN - 1) / 2) * 24, 88, TYPES[i], 9, S * dpr, {});
    // multiplicateur de chaîne
    if (chainShow > 0 && chainLvlShown >= 2) {
      var q = 1 - chainShow / 1.6, pop = q < 0.12 ? easeOutBack(q / 0.12) : 1;
      ctx.save(); ctx.translate(FW / 2, 132); ctx.scale(pop, pop); ctx.rotate(Math.sin(clock * 10) * 0.04);
      ctx.globalAlpha = chainShow < 0.4 ? chainShow / 0.4 : 1;
      var hue = (clock * 120) % 360;
      ctx.font = "900 " + (28 + Math.min(20, chainLvlShown * 4)) + "px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 8; ctx.strokeStyle = "#2b1709"; ctx.strokeText("CHAÎNE x" + chainLvlShown, 0, 0);
      ctx.fillStyle = chainLvlShown >= 3 ? "hsl(" + hue + ",90%,72%)" : "#ffe066"; ctx.fillText("CHAÎNE x" + chainLvlShown, 0, 0);
      ctx.restore();
    }
    // bannière (tour, nouveau personnage)
    if (banner) {
      var bq = banner.t / banner.dur, ba = bq < 0.15 ? bq / 0.15 : bq > 0.8 ? (1 - bq) / 0.2 : 1;
      var bx = banner.side == null ? FW / 2 : banner.side === 0 ? 200 : FW - 200;
      ctx.save(); ctx.globalAlpha = ba; ctx.translate(bx, FH * 0.42 - (1 - ba) * 14);
      ctx.font = "900 22px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var w = ctx.measureText(banner.txt).width + (banner.type >= 0 ? 60 : 36);
      roundRect(-w / 2, -22, w, 44, 22); ctx.fillStyle = banner.side == null ? "rgba(30,40,35,.82)" : PCOL[banner.side].dark + "dd"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = banner.side == null ? "#fff3c4" : PCOL[banner.side].light; ctx.stroke();
      ctx.fillStyle = "#fffaf0"; ctx.fillText(banner.txt, banner.type >= 0 ? 14 : 0, 1);
      if (banner.type >= 0) art.blit(ctx, -w / 2 + 26, 2, banner.type, 15, S * dpr, { mood: "happy" });
      ctx.restore();
    }
    // petits messages près de chaque lanceur
    toasts.forEach(function (t) {
      var q = t.t / t.dur, a = q > 0.75 ? (1 - q) / 0.25 : 1;
      var x = t.side === 0 ? 150 : FW - 150;
      ctx.globalAlpha = a; ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(t.txt, x, 150 - q * 12);
      ctx.fillStyle = PCOL[t.side].light; ctx.fillText(t.txt, x, 150 - q * 12);
      ctx.globalAlpha = 1;
    });
  }

  function render(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // secousse de caméra (douce)
    var sh = trauma * trauma * 14 * fxMul();
    var sx = sh ? (Math.sin(clock * 47) + Math.sin(clock * 83)) * 0.5 * sh : 0, sy = sh ? (Math.cos(clock * 53) + Math.sin(clock * 71)) * 0.5 * sh : 0;
    ctx.save();
    ctx.translate(OX + sx, OY + sy); ctx.scale(S, S);
    drawField(now);
    if (state === "aim" || state === "flight") players.forEach(drawPreview);
    balls.forEach(drawBall);
    players.forEach(drawLauncher);
    drawEffects();
    drawHud();
    ctx.restore();
    if (flash > 0) { ctx.globalAlpha = Math.min(0.6, flash); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (H > W * 1.15) {   // téléphone en portrait : le terrain est petit
      ctx.font = "800 14px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,243,196,.85)";
      ctx.fillText("📱 Tourne l'écran pour un plus grand terrain", W / 2, OY + FH * S + 30);
    }
  }

  /* ====================== MISE À JOUR ====================== */
  function update(dt) {
    clock += dt;
    var playing = state === "aim" || state === "flight" || state === "menu" || state === "over";
    // hit stop : la physique s'arrête un instant sur les gros moments
    if (hitStop > 0) hitStop -= dt;
    else if (playing) {
      var h = dt / SUB;
      for (var i = 0; i < SUB; i++) step(h);
      balls.forEach(function (b) { b.age += dt; if (b.impCd > 0) b.impCd -= dt; rainbowCheck(b, dt); });
      updatePops(dt);
      if (state !== "menu") checkCombos();
      else findGroups();
      if (state === "flight") updateFlight(dt);
      if (state === "aim" || state === "flight") checkDanger(dt);
    }
    // contrôles clavier (maintenus)
    if (state === "aim" || state === "flight") players.forEach(function (p) { keyAim(p, dt); });
    // animations
    players && players.forEach(function (p) {
      p.recV += (-220 * p.rec - 13 * p.recV) * dt; p.rec += p.recV * dt;
      if (p.load < 1) p.load = Math.min(1, p.load + dt * 3.5);
      if (p.deny > 0) p.deny -= dt;
    });
    balls.forEach(function (b) {
      b.jv += (-330 * b.jw - 15 * b.jv) * dt; b.jw = clamp(b.jw + b.jv * dt, -0.24, 0.3);
      b.blink -= dt; if (b.blink < -0.14) b.blink = 2 + Math.random() * 4;
    });
    parts.forEach(function (p) { p.t += dt; p.vy += p.g * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot != null) p.rot += p.vr * dt; });
    parts = parts.filter(function (p) { return p.t < p.life; });
    if (parts.length > 600) parts.splice(0, parts.length - 600);
    rings.forEach(function (r) { r.t += dt; }); rings = rings.filter(function (r) { return r.t < r.dur; });
    texts.forEach(function (t) { t.t += dt; }); texts = texts.filter(function (t) { return t.t < t.life; });
    bolts.forEach(function (b) { b.t += dt; }); bolts = bolts.filter(function (b) { return b.t < b.dur; });
    toasts.forEach(function (t) { t.t += dt; }); toasts = toasts.filter(function (t) { return t.t < t.dur; });
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
    trauma = Math.max(0, trauma - dt * 1.4);
    flash = Math.max(0, flash - dt * 2.2);
    glow = Math.max(0, glow - dt * 0.5);
    if (chainShow > 0) chainShow -= dt;
    shownScore += (score - shownScore) * Math.min(1, dt * 8); if (Math.abs(score - shownScore) < 0.5) shownScore = score;
    scoreBump = Math.max(0, scoreBump - dt * 4);
  }

  function showBanner(txt, type, side) { banner = { txt: txt, type: type == null ? -1 : type, side: side == null ? null : side, t: 0, dur: 1.5 }; }
  function toast(side, txt) { toasts = toasts.filter(function (t) { return t.side !== side; }); toasts.push({ side: side, txt: txt, t: 0, dur: 1.4 }); }

  /* ====================== COMMANDES ====================== */
  // codes physiques : marchent pareil en AZERTY (Z Q S D) et en QWERTY (W A S D)
  var KEYMAP = {
    KeyW: [0, "up"], KeyS: [0, "down"], KeyA: [0, "less"], KeyD: [0, "more"], Space: [0, "fire"], KeyE: [0, "swap"],
    ArrowUp: [1, "up"], ArrowDown: [1, "down"], ArrowLeft: [1, "more"], ArrowRight: [1, "less"], Enter: [1, "fire"], NumpadEnter: [1, "fire"],
    ShiftRight: [1, "swap"], Backspace: [1, "swap"], Numpad0: [1, "swap"],
  };
  function keyAim(p, dt) {
    var k = p.keys, fine = 1;
    if (k.up) p.ang = clamp(p.ang - 1.25 * dt * fine, A_MIN, A_MAX);
    if (k.down) p.ang = clamp(p.ang + 1.25 * dt * fine, A_MIN, A_MAX);
    if (k.more) p.pow = clamp(p.pow + 0.75 * dt, 0, 1);
    if (k.less) p.pow = clamp(p.pow - 0.75 * dt, 0, 1);
  }
  function visible() { return !stage.hidden; }
  document.addEventListener("keydown", function (e) {
    if (!visible() || (e.target && /input|textarea|select/i.test(e.target.tagName))) return;
    audio(); if (SET.music > 0 && state !== "menu") startMusic();
    var map = KEYMAP[e.code];
    if (state === "menu" || state === "over") {
      if (e.target && e.target.closest && e.target.closest("button, summary, a")) return;   // le bouton fait déjà son travail
      if (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") { e.preventDefault(); start(); }
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); if (state === "pause") resume(); else pause(); return; }
    if (state === "pause") return;
    if (!map) return;
    e.preventDefault();
    var p = players[map[0]], act = map[1];
    if (act === "fire") { if (!e.repeat) fire(p); }
    else if (act === "swap") { if (!e.repeat) swapItems(p); }
    else p.keys[act] = true;
  });
  document.addEventListener("keyup", function (e) {
    var map = KEYMAP[e.code];
    if (map && players) players[map[0]].keys[map[1]] = false;
  });
  window.addEventListener("blur", function () { if (players) players.forEach(function (p) { p.keys = {}; }); });

  // souris / doigt : le joueur actif tire comme à la fronde (on tire vers l'arrière, on relâche)
  function toField(e) { var rc = canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left - OX) / S, y: (e.clientY - rc.top - OY) / S }; }
  var drag = null;
  canvas.addEventListener("pointerdown", function (e) {
    audio(); if (SET.music > 0) startMusic();
    if (state !== "aim" && state !== "flight") return;
    var f = toField(e);
    // toucher la bulle « suivant » d'un joueur → il échange
    for (var i = 0; i < 2; i++) {
      var L = LAUNCH[i], nx = L.x + L.dir * 14 + 22, ny = 34;
      if (Math.hypot(f.x - nx, f.y - ny) < 22 || Math.hypot(f.x - L.x, f.y - L.y) < 30) { swapItems(players[i]); return; }
    }
    if (state !== "aim") return;
    drag = { x: f.x, y: f.y, id: e.pointerId, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag || drag.id !== e.pointerId || state !== "aim") return;
    var f = toField(e), p = players[active], dir = LAUNCH[active].dir;
    var dx = drag.x - f.x, dy = drag.y - f.y, d = Math.hypot(dx, dy);
    if (d > 10) {
      drag.moved = true;
      p.ang = clamp(Math.atan2(dy, dx * dir), A_MIN, A_MAX);
      p.pow = clamp((d - 10) / 190, 0, 1);
    }
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var ok = drag.moved; drag = null;
    if (ok && state === "aim") fire(players[active]);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", function () { drag = null; });

  /* ====================== ÉCRANS ====================== */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function show(html, cls) { card.className = "panel game-card mc-card " + (cls || ""); card.innerHTML = html; overlay.hidden = false; card.classList.remove("mc-in"); void card.offsetWidth; card.classList.add("mc-in"); }
  function hide() { overlay.hidden = true; }
  function kbd(t) { return "<kbd>" + t + "</kbd>"; }

  function icon(type, size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    ART.draw(c.getContext("2d"), size, size * 1.12, type, size * 0.62, { mood: "happy" });
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }
  function powerIcon(kind, size) {
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    ART.drawPower(c.getContext("2d"), kind, size, size * 1.1, size * 0.62, { t: 0.4 });
    return '<img src="' + c.toDataURL() + '" alt="" width="' + size + '" height="' + size + '">';
  }

  function settingsHtml() {
    return '<div class="mc-settings">' +
      '<label>🎵 Musique <input type="range" min="0" max="1" step="0.05" value="' + SET.music + '" data-set="music"></label>' +
      '<label>🔔 Sons <input type="range" min="0" max="1" step="0.05" value="' + SET.sfx + '" data-set="sfx"></label>' +
      '<label class="mc-check"><input type="checkbox" data-set="fx"' + (SET.fx === "full" ? " checked" : "") + '> ✨ Effets visuels complets (flash, secousses)</label>' +
      "</div>";
  }

  function menu() {
    state = "menu"; hud.hidden = true;
    if (!players) reset();
    var who = TYPES.slice(0, 7).map(function (t) { return '<span class="mc-who" title="' + esc(SQ[t].name) + '">' + icon(t, 44) + "</span>"; }).join("");
    show('<h2 class="mc-title">Merger <span>Coop</span></h2>' +
      '<p class="mc-sub">Un puzzle tout doux à deux. Visez ensemble, empilez, faites des groupes de <strong>3 identiques</strong> et lancez des réactions en chaîne. Pas de chrono.</p>' +
      '<div class="mc-cast">' + who + "</div>" +
      '<div class="mc-players">' +
      '<div class="mc-p mc-p1"><strong>Joueur 1</strong> · à gauche<span>' + kbd("Z") + kbd("S") + " viser · " + kbd("Q") + kbd("D") + " puissance</span><span>" + kbd("Espace") + " tirer · " + kbd("E") + " échanger</span><small>(QWERTY : W A S D)</small></div>" +
      '<div class="mc-p mc-p2"><strong>Joueur 2</strong> · à droite<span>' + kbd("↑") + kbd("↓") + " viser · " + kbd("←") + kbd("→") + " puissance</span><span>" + kbd("Entrée") + " tirer · " + kbd("Maj droite") + " échanger</span><small>&nbsp;</small></div>" +
      "</div>" +
      '<p class="game-small">À la souris ou au doigt : tirez en arrière comme une fronde, relâchez pour lancer. Touchez la bulle « suivant » pour échanger.</p>' +
      '<p class="mc-actions"><button class="btn mc-go" type="button" data-act="start">▶ Jouer à deux</button></p>' +
      '<details class="mc-more"><summary>Réglages</summary>' + settingsHtml() + "</details>" +
      '<p class="game-small">Meilleur score d\'équipe : <strong>' + best.toLocaleString("fr-FR") + "</strong> · <span class=\"game-version\">Merger Coop v" + VERSION + "</span></p>", "mc-menu");
  }

  function start() {
    reset();
    state = "aim"; hide(); hud.hidden = false;
    audio(); applyVolumes(); if (SET.music > 0) startMusic();
    showBanner("À toi, " + PCOL[0].name + " !", -1, 0);
    sfxTurn(0);
    canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (state !== "aim" && state !== "flight") return;
    prevState = state; state = "pause";
    show('<h2>Pause</h2><p>Score d\'équipe : <strong>' + score.toLocaleString("fr-FR") + "</strong></p>" + settingsHtml() +
      '<p class="mc-actions"><button class="btn" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>', "mc-pause");
  }
  function resume() { if (state === "pause") { state = prevState; hide(); canvas.focus({ preventScroll: true }); } }

  function gameOver() {
    if (state === "over") return;
    state = "over"; hud.hidden = true;
    var rec = score > best;
    if (rec) { best = score; store("merger-coop-best", String(best)); }
    sfxOver();
    setTimeout(function () {
      if (state !== "over") return;
      show('<h2 class="mc-title">' + (rec ? "Nouveau record d'équipe !" : "Le terrain déborde !") + "</h2>" +
        '<p class="mc-score">' + score.toLocaleString("fr-FR") + "</p>" +
        '<ul class="mc-stats">' +
        "<li><b>" + stats.maxChain + "</b><span>plus longue chaîne</span></li>" +
        "<li><b>" + stats.maxGroup + "</b><span>plus gros groupe</span></li>" +
        "<li><b>" + stats.popped + "</b><span>personnages libérés</span></li>" +
        "<li><b>" + stats.powers + "</b><span>pouvoirs utilisés</span></li></ul>" +
        '<p class="mc-actions"><button class="btn mc-go" type="button" data-act="start">↻ Rejouer <small>(Entrée)</small></button> ' +
        '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>' +
        '<p class="game-small">Meilleur score d\'équipe : <strong>' + best.toLocaleString("fr-FR") + "</strong></p>", "mc-over");
      var go = card.querySelector(".mc-go"); if (go) go.focus({ preventScroll: true });
    }, 900);
  }

  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    audio(); sfxUi();
    var a = b.getAttribute("data-act");
    if (a === "start") start();
    else if (a === "resume") resume();
    else if (a === "menu") { reset(); menu(); }
  });
  card.addEventListener("input", function (e) {
    var t = e.target, k = t.getAttribute("data-set");
    if (!k) return;
    if (k === "fx") SET.fx = t.checked ? "full" : "reduced";
    else SET[k] = Number(t.value);
    audio(); applyVolumes(); saveSet();
    if (k === "music") { if (SET.music > 0 && state !== "menu") startMusic(); }
    if (k === "sfx") sfxImpact(0.5);
  });

  // boutons du HUD
  function hudBtn(sel, fn) { var el = stage.querySelector(sel); if (el) el.addEventListener("click", function () { audio(); sfxUi(); fn(el); }); }
  hudBtn("[data-c-pause]", function () { if (state === "pause") resume(); else pause(); });
  hudBtn("[data-c-restart]", function () { start(); });
  hudBtn("[data-c-mute]", function (el) { SET.mute = !SET.mute; saveSet(); applyVolumes(); muteLabel(); });
  function muteLabel() { var el = stage.querySelector("[data-c-mute]"); if (el) { el.textContent = SET.mute ? "🔇" : "🔊"; el.setAttribute("aria-label", SET.mute ? "Activer le son" : "Couper le son"); } }
  muteLabel();
  document.addEventListener("visibilitychange", function () { if (document.hidden) { pause(); stopMusic(); } });

  /* ====================== SOLO / COOP ====================== */
  var soloStage = document.querySelector("[data-merger]");
  var tabs = document.querySelectorAll("[data-mode]");
  function setMode(m) {
    if (soloStage) soloStage.hidden = m !== "solo";
    stage.hidden = m !== "coop";
    tabs.forEach(function (t) { var on = t.getAttribute("data-mode") === m; t.setAttribute("aria-selected", on ? "true" : "false"); t.classList.toggle("is-on", on); });
    document.querySelectorAll("[data-help]").forEach(function (h) { h.hidden = h.getAttribute("data-help") !== m; });
    store("merger-mode", m);
    if (history.replaceState) history.replaceState(null, "", m === "coop" ? "#coop" : location.pathname + location.search);
    if (m === "coop") { resize(); if (state === "menu") menu(); }
    else { if (state === "aim" || state === "flight") pause(); stopMusic(); }
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { setMode(t.getAttribute("data-mode")); }); });
  window.MergerMode = setMode;

  /* ====================== PLEIN ÉCRAN ====================== */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { stage.classList.toggle("is-full", isFull()); }
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () {
    if (stage.hidden) return;
    if (isFull()) { stage.classList.remove("is-max"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); syncFull(); return; }
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (er) { fallback(); } } else fallback();
  });
  document.addEventListener("fullscreenchange", syncFull);
  var fsExit = stage.querySelector("[data-fs-exit]");
  if (fsExit) fsExit.addEventListener("click", function () { stage.classList.remove("is-max"); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); syncFull(); });

  if (window.ResizeObserver) new ResizeObserver(function () { if (!stage.hidden) resize(); }).observe(stage);
  else window.addEventListener("resize", resize);

  /* ====================== BOUCLE ====================== */
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(1 / 30, (now - last) / 1000); last = now;
    if (!stage.hidden && players) {
      if (state !== "pause") update(dt);
      render(now);
    }
    requestAnimationFrame(loop);
  }

  // outils de test (console) : MERGER_COOP.state(), .give(0, "grenade"), .fire(0)
  window.MERGER_COOP = {
    version: VERSION,
    state: function () { return { state: state, active: active, score: score, balls: balls.length, chain: chain, shots: shots, typesN: typesN, stats: stats,
      players: players.map(function (p) { return { ang: p.ang, pow: p.pow, cur: p.cur, next: p.next }; }) }; },
    balls: function () { return balls.map(function (b) { return { id: b.id, kind: b.kind, type: b.type, x: b.x, y: b.y, vx: b.vx, vy: b.vy, proj: b.proj, pop: b.pop }; }); },
    give: function (i, kind) { players[i].cur = kind === "sq" ? { kind: "sq", type: TYPES[0] } : { kind: kind }; },
    aim: function (i, ang, pow) { players[i].ang = ang; players[i].pow = pow; },
    fire: function (i) { fire(players[i]); },
    add: function (type, x, y) { var b = newBall({ kind: "sq", type: type }, x, y); b.age = 2; balls.push(b); },
    score: function (n) { addScore(n); },
    over: function () { gameOver(); },
    clear: function () { balls = []; },
    // tir « intelligent » pour les tests : cherche l'angle/puissance qui touche un personnage de la même couleur
    bestShot: function (i) {
      var p = players[i], it = p.cur, keep = [p.ang, p.pow], bestS = -1, bestA = keep;
      for (var a = A_MIN; a <= A_MAX; a += 0.06) for (var w = 0.05; w <= 1; w += 0.05) {
        p.ang = a; p.pow = w;
        var pr = predict(p); if (!pr.hit) continue;
        var sc = 0;
        balls.forEach(function (b) { if (b.pop < 0 && it.kind === "sq" && b.type === it.type) { var d = Math.hypot(b.x - pr.hit.x, b.y - pr.hit.y); if (d < R * 2.4) sc += 3; } });
        sc += pr.hit.y / 1000;
        if (sc > bestS) { bestS = sc; bestA = [a, w]; }
      }
      p.ang = bestA[0]; p.pow = bestA[1];
      return bestS;
    },
  };

  var startMode = /#coop/.test(location.hash) ? "coop" : (load("merger-mode", "solo") === "coop" ? "coop" : "solo");
  reset();
  setMode(startMode);
  menu();
  requestAnimationFrame(loop);
})();
