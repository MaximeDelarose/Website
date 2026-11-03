/* =========================================================================
   Merger Coop — puzzle coopératif à 2 joueurs
   Deux façons de jouer : sur le même ordinateur, ou en ligne avec un code de salon.
   (le mode Solo d'origine est dans js/merger.js, les personnages dans js/merger-art.js)

   Deux lanceurs, un de chaque côté d'un terrain commun. Les joueurs visent
   chacun de leur côté et tirent à tour de rôle UN personnage à la fois.
   Les tirs volent en cloche, rebondissent un peu, retombent et s'empilent.
   3 identiques (ou plus) qui se touchent → POP, et ce qui tombe peut déclencher
   des réactions en chaîne. Score commun, pas de chrono : la partie s'arrête
   quand la pile reste au-dessus de la ligne.

   Physique : vitesses + impulsions (rebond, frottement) et corrections de
   position, 8 sous-pas par image et vitesse plafonnée → un projectile avance
   d'au plus ~3 unités par sous-pas (rayon 24) : il ne peut rien traverser.

   En ligne (Supabase Realtime, comme Survivor et Dice) : l'hôte (Joueur 1)
   calcule tout et envoie l'état ~10 fois par seconde avec la liste des effets ;
   l'invité (Joueur 2) affiche cet état en le lissant, rejoue effets et sons,
   et n'envoie que sa visée et ses tirs. La logique de jeu appelle emit(...)
   pour chaque effet : il est joué ici ET transmis à l'invité.
   ========================================================================= */
(function () {
  "use strict";

  var ART = window.MergerArt;
  var stage = document.querySelector("[data-merger-coop]");
  if (!ART || !stage) return;

  var VERSION = "2.1.0";
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
  var G = 1150;                        // gravité (cartoon)
  var SUB = 8, ITER = 4;               // sous-pas physiques par image, passes de collision
  var MAXV = 1350;                     // vitesse max (unités/s) → jamais de traversée
  var BOUNCE = 0.24, BOUNCE_MIN = 80;  // rebond des personnages posés
  var BOUNCE_SHOT = 0.5;               // rebond d'un tir juste après son premier contact (plus vivant)
  var SHOT_FRESH = 0.7;                // … pendant combien de secondes
  var VMIN = 380, VMAX = 1020;         // vitesse de tir (puissance 0 → 1)
  var A_MIN = -1.3, A_MAX = 0.85;      // angle de tir (radians, négatif = vers le haut)
  var GROUP = 3;
  var TOUCH = 7;                       // tolérance de contact pour les groupes
  // les 7 personnages du mode coop, choisis pour leurs silhouettes très différentes
  var TYPES = [1, 3, 0, 2, 5, 8, 10];
  var START_TYPES = 4, UNLOCK_AT = [500, 1400, 3000];   // un nouveau personnage à ces scores
  var RAIN_EVERY = 4;                  // tous les 4 tirs, des personnages tombent du ciel (pression douce, sans chrono)
  var RAINBOW_CHANCE = 0.1;            // 10 % de chance que le prochain tir soit la boule multicolore (joker)
  var GRENADE_CHANCE = 0.5;            // chance qu'une pluie apporte une grenade (max 2 dans le terrain)
  var GRENADE_RAD = 2.7;               // rayon d'explosion (en rayons de personnage)
  // pouvoirs offerts par les gros combos (débloqués après N tirs)
  var BONUS = [{ kind: "rainbow", at: 0 }, { kind: "lightning", at: 8 }, { kind: "bomb", at: 14 }];
  var ANTIC = 0.17, POP_T = 0.26;      // anticipation puis POP d'une combinaison (secondes)
  var LAUNCH = [{ x: 44, y: 112, dir: 1 }, { x: FW - 44, y: 112, dir: -1 }];
  var PCOL = [{ main: "#f08a3c", light: "#ffd2a8", dark: "#9a4a12" },
              { main: "#3fb6c6", light: "#b8f0f5", dark: "#1d6f7a" }];

  /* ====================== SAUVEGARDE / OPTIONS ====================== */
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var SET = { music: 0.45, sfx: 0.8, fx: "full", mute: false };
  try { var s0 = JSON.parse(load("merger-coop-settings", "{}")); for (var k0 in s0) if (k0 in SET) SET[k0] = s0[k0]; } catch (e) {}
  function saveSet() { store("merger-coop-settings", JSON.stringify(SET)); }
  var best = Number(load("merger-coop-best", 0)) || 0;

  /* ====================== ÉTAT ====================== */
  var state = "menu";                  // menu | aim | flight | pause | over
  var screen = "menu";                 // écran affiché quand state = menu : menu | online
  var prevState = "aim";
  var balls = [], parts = [], rings = [], texts = [], bolts = [];
  var players, active = 0, shots = 0, score = 0, shownScore = 0, scoreBump = 0;
  var chain = 0, chainShow = 0, chainLvlShown = 0, typesN = START_TYPES;
  var flying = null, resolveT = 0, calmT = 0, bombsTicked = false, rained = false, overT = 0, lastShooter = 0;
  var flash = 0, flashCol = "#fff", trauma = 0, hitStop = 0, clock = 0, glow = 0;
  var banner = null, toasts = [], popEvents = [];
  var stats, ballId = 0, overlayOpen = false, lastImpactSfx = 0;
  var names = ["Joueur 1", "Joueur 2"];

  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fxMul() { return SET.fx === "full" ? 1 : 0.45; }

  function mkPlayer(i) { return { i: i, ang: -0.42, pow: 0.62, cur: null, next: null, rec: 0, recV: 0, load: 1, deny: 0, keys: {} }; }
  function isPower(it) { return it && it.kind !== "sq"; }
  function gen() {
    var queued = players.some(function (q) { return isPower(q.cur) || isPower(q.next); });
    if (shots >= 2 && !queued && Math.random() < RAINBOW_CHANCE) return { kind: "rainbow" };
    return { kind: "sq", type: TYPES[rnd(typesN)] };
  }

  function newBall(item, x, y) {
    return { id: ++ballId, kind: item.kind, type: item.kind === "sq" ? item.type : -1, x: x, y: y, vx: 0, vy: 0, r: R,
      tx: x, ty: y, proj: false, fresh: 0, age: 0, pop: -1, popLvl: 1, dead: false, touch: false,
      jw: 0, jv: 0, jang: 0, impCd: 0, blink: Math.random() * 4, flip: Math.random() < 0.5 ? -1 : 1,
      breath: Math.random() * TAU, rate: 1.4 + Math.random() * 0.8, pal: false, owner: -1, scared: 0,
      count: item.kind === "bomb" ? 3 : 0, morph: -1, morphTo: -1, waitT: 0, trail: null, shotNo: 0 };
  }
  function byId(id) { for (var i = 0; i < balls.length; i++) if (balls[i].id === id) return balls[i]; return null; }

  function reset() {
    balls = []; parts = []; rings = []; texts = []; bolts = []; toasts = []; popEvents = [];
    players = [mkPlayer(0), mkPlayer(1)];
    active = 0; shots = 0; score = 0; shownScore = 0; chain = 0; chainShow = 0; typesN = START_TYPES;
    flying = null; resolveT = 0; calmT = 0; overT = 0; bombsTicked = false; rained = false; trauma = 0; hitStop = 0; flash = 0; banner = null;
    stats = { maxChain: 0, maxGroup: 0, shots: 0, powers: 0, popped: 0, booms: 0 };
    players.forEach(function (p) { p.cur = gen(); p.next = gen(); });
    // quelques personnages pour commencer, rangés pour qu'aucun groupe de 3 ne se forme tout seul, + une grenade
    var n = 10;
    for (var i = 0; i < n; i++) {
      var x = 150 + (FW - 300) * (i / (n - 1)) + (Math.random() - 0.5) * 10;
      var b = newBall(i === 5 ? { kind: "grenade" } : { kind: "sq", type: TYPES[i % START_TYPES] }, x, -40 - i * 38 - Math.random() * 20);
      b.vy = 120; b.age = 2;
      balls.push(b);
    }
  }
  function nameOf(i) { return names[i]; }

  /* ====================== EFFETS (joués ici et envoyés à l'invité en ligne) ====================== */
  var FX = {};
  function emit(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    FX[name].apply(null, args);
    if (NET.started && NET.role === "host") NET.out.push([name].concat(args));
  }

  FX.impact = function (ida, idb, nx, ny, v, cx, cy) {
    var I = clamp(v / 900, 0, 1), ang = Math.atan2(ny, nx);
    [byId(ida), byId(idb)].forEach(function (q) { if (q && q.pop < 0 && I * 10 > q.jv) { q.jv += I * 10; q.jang = ang; } });
    var a = byId(ida);
    if (I > 0.2) dust(cx, cy, Math.round(2 + I * 6), a && a.type >= 0 ? SQ[a.type].body : "#fff");
    if (I > 0.55) rings.push({ x: cx, y: cy, r0: 4, r1: 18 + I * 26, t: 0, dur: 0.28, col: "rgba(255,255,255,.7)", w: 3 });
    sfxImpact(I);
    if (I > 0.7) trauma = Math.min(0.6, trauma + 0.06);
  };
  FX.wall = function (id, nx, ny, v, cx, cy) {
    var I = clamp(v / 900, 0, 1), b = byId(id);
    if (b && I * 10 > b.jv) { b.jv += I * 10; b.jang = Math.atan2(ny, nx); }
    if (I > 0.2) dust(cx, cy, Math.round(2 + I * 5), "#e9dcc0");
    sfxImpact(I * 0.8);
  };
  FX.antic = function (lvl) { sfxAntic(lvl); };
  // data = [x, y, type, x, y, type, …]
  FX.pop = function (cx, cy, lvl, n, gain, kind, data) {
    for (var i = 0; i < data.length; i += 3) {
      var col = data[i + 2] >= 0 ? SQ[data[i + 2]].body : "#ffe66d";
      burst(data[i], data[i + 1], col, 12 + lvl * 3, 1 + lvl * 0.12);
      rings.push({ x: data[i], y: data[i + 1], r0: R * 0.6, r1: R * 1.7, t: 0, dur: 0.3, col: col, w: 4 });
    }
    if (gain > 0) floatText(cx, cy - 10, "+" + gain.toLocaleString("fr-FR") + (lvl > 1 ? "  x" + lvl : ""), lvl > 1 ? "#ffe066" : "#fff3c4", 24 + Math.min(18, lvl * 5 + n));
    rings.push({ x: cx, y: cy, r0: R, r1: R * (2.6 + lvl * 0.5), t: 0, dur: 0.45, col: "rgba(255,248,220,.9)", w: 5 + lvl });
    if (kind === "match") sfxPop(lvl, n);
    trauma = Math.min(0.7, trauma + 0.05 + 0.07 * lvl * fxMul());
    glow = Math.min(1, glow + 0.2 * lvl);
    if (lvl >= 2 || n >= 5) hitStop = Math.max(hitStop, 0.05 + 0.025 * Math.min(4, lvl));
    if (lvl >= 3 && SET.fx === "full") { flash = 0.25; flashCol = "#fff6d8"; }
    if (lvl >= 2) { chainShow = 1.6; chainLvlShown = lvl; }
  };
  FX.boom = function (x, y, rad, kind, gain) {
    burst(x, y, "#ffb347", 30, 1.5); burst(x, y, "#ff6b4a", 18, 1.2); burst(x, y, "#9bc06a", 10, 1.1);
    rings.push({ x: x, y: y, r0: 6, r1: rad * 1.25, t: 0, dur: 0.4, col: "rgba(255,200,120,.95)", w: 9 });
    rings.push({ x: x, y: y, r0: 6, r1: rad * 2.1, t: 0, dur: 0.6, col: "rgba(255,255,255,.6)", w: 4 });
    trauma = Math.min(0.8, trauma + 0.35 * fxMul()); hitStop = Math.max(hitStop, 0.09);
    if (SET.fx === "full") { flash = 0.35; flashCol = "#ffe2b0"; }
    sfxBoom(kind === "bomb" ? 1.25 : 1);
    floatText(x, y - 34, gain ? "BOUM ! +" + gain.toLocaleString("fr-FR") : "BOUM !", "#ffcf7a", 30);
  };
  FX.zap = function (x, floorY, gain) {
    var pts = [], y = 0;
    while (y < floorY) { pts.push([x + (Math.random() - 0.5) * 26, y]); y += 22 + Math.random() * 18; }
    pts.push([x, floorY]);
    bolts.push({ x: x, pts: pts, t: 0, dur: 0.45 });
    for (var i = 0; i < 16 * fxMul(); i++) { var yy = Math.random() * floorY; parts.push({ x: x, y: yy, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 200, t: 0, life: 0.3 + Math.random() * 0.3, col: "#fff59a", size: 2 + Math.random() * 3, g: 0, kind: "spark" }); }
    trauma = Math.min(0.8, trauma + 0.3 * fxMul()); hitStop = Math.max(hitStop, 0.08);
    if (SET.fx === "full") { flash = 0.45; flashCol = "#fffbd0"; }
    sfxZap();
    floatText(x, 70, gain ? "ZAP ! +" + gain : "ZAP !", "#fff59a", 30);
  };
  FX.launch = function (pi, mx, my, dx, dy, pow) {
    var p = players[pi];
    p.recV = 7 + pow * 5; p.load = 0;
    for (var i = 0; i < 8 * fxMul(); i++) { var a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.4, s = 60 + Math.random() * 120; parts.push({ x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.35, col: "#fffaf0", size: 3 + Math.random() * 3, g: -40, kind: "dot" }); }
    rings.push({ x: mx, y: my, r0: 6, r1: 26, t: 0, dur: 0.22, col: PCOL[pi].light, w: 3 });
    trauma = Math.min(0.5, trauma + 0.04);
    sfxLaunch(pow, pi);
  };
  FX.magic = function () { sfxMagic(); };
  FX.morphed = function (x, y, type) { burst(x, y, SQ[type].body, 14, 0.8); sfxMagicEnd(); };
  FX.tick = function (id, c) { var b = byId(id); if (b) { b.jv += 5; b.jang = -Math.PI / 2; } sfxTick(c); };
  FX.banner = function (txt, type, side) { banner = { txt: txt, type: type, side: side, t: 0, dur: 1.5 }; };
  FX.toast = function (side, txt) { toasts = toasts.filter(function (t) { return t.side !== side; }); toasts.push({ side: side, txt: txt, t: 0, dur: 1.4 }); };
  FX.sound = function (name, a) { var f = { rain: sfxRain, bonus: sfxBonus, swap: sfxSwap, turn: sfxTurn, deny: sfxDeny }[name]; if (f) f(a); };

  /* ====================== PHYSIQUE ====================== */
  function isStatic(b) { return b.pop >= 0 || b.dead; }

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
      if (a.touch && !a.proj && a.fresh <= 0 && a.vx * a.vx + a.vy * a.vy < 14 * 14) { a.vx *= 0.86; a.vy *= 0.86; }
      if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(a.vx) || !isFinite(a.vy)) { a.x = FW / 2; a.y = 60; a.vx = a.vy = 0; }
    }
  }

  function bounceOf(a, b) { return (a.proj || a.fresh > 0 || (b && (b.proj || b.fresh > 0))) ? BOUNCE_SHOT : BOUNCE; }

  function collide(a, b, first) {
    var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    if (a.dead || b.dead) return;
    // tirer dans une grenade → BOUM
    if (a.proj && b.kind === "grenade" && !b.proj && b.pop < 0) { grenadeHit(b, a); return; }
    if (b.proj && a.kind === "grenade" && !a.proj && a.pop < 0) { grenadeHit(a, b); return; }
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
      var e = -vn > BOUNCE_MIN ? bounceOf(a, b) : 0;
      var jn = -(1 + e) * vn;
      a.vx -= nx * jn * wa; a.vy -= ny * jn * wa;
      b.vx += nx * jn * wb; b.vy += ny * jn * wb;
      var tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = vt * 0.1;
      a.vx += tx * jt * wa; a.vy += ty * jt * wa;
      b.vx -= tx * jt * wb; b.vy -= ty * jt * wb;
      if (first && -vn > 90 && (a.impCd <= 0 || b.impCd <= 0) && clock - lastImpactSfx > 0.035) {
        lastImpactSfx = clock; a.impCd = b.impCd = 0.08;
        emit("impact", a.id, b.id, +nx.toFixed(2), +ny.toFixed(2), Math.round(-vn), Math.round(a.x + nx * a.r), Math.round(a.y + ny * a.r));
      }
    }
    if (a.proj) landed(a);
    if (b.proj) landed(b);
  }

  function bounds(b, first) {
    if (isStatic(b)) return;
    var hit = false, e, eb = bounceOf(b, null);
    if (b.x < b.r) {
      b.x = b.r;
      if (b.vx < 0) { wallFx(b, -1, 0, -b.vx, first); e = -b.vx > BOUNCE_MIN ? eb : 0; b.vx = -b.vx * e; b.vy *= 0.985; }
      hit = true;
    } else if (b.x > FW - b.r) {
      b.x = FW - b.r;
      if (b.vx > 0) { wallFx(b, 1, 0, b.vx, first); e = b.vx > BOUNCE_MIN ? eb : 0; b.vx = -b.vx * e; b.vy *= 0.985; }
      hit = true;
    }
    if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * eb; }
    if (b.y > BY) {
      var ex = b.x - BX, ey = b.y - BY, ed = Math.sqrt(ex * ex + ey * ey), lim = BOWL - b.r;
      if (ed > lim) {
        var nx = ex / ed, ny = ey / ed;
        b.x = BX + nx * lim; b.y = BY + ny * lim;
        var vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          wallFx(b, nx, ny, vn, first);
          e = vn > BOUNCE_MIN ? eb : 0;
          b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
          var tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
          b.vx -= tx * vt * 0.05; b.vy -= ty * vt * 0.05;
        }
        hit = true;
      }
    }
    // filet de sécurité : jamais hors du terrain
    if (b.x < b.r) b.x = b.r;
    if (b.x > FW - b.r) b.x = FW - b.r;
    if (b.y > FH - b.r) b.y = FH - b.r;
    if (hit) { b.touch = true; if (b.proj) landed(b); }
  }
  function wallFx(b, nx, ny, v, first) {
    if (!first || v <= 90 || b.impCd > 0 || clock - lastImpactSfx < 0.035) return;
    lastImpactSfx = clock; b.impCd = 0.08;
    emit("wall", b.id, +nx.toFixed(2), +ny.toFixed(2), Math.round(v), Math.round(b.x + nx * b.r), Math.round(b.y + ny * b.r));
  }

  /* premier contact d'un projectile : il rebondit encore un peu, puis redevient un personnage normal */
  function landed(b) {
    if (!b.proj) return;
    b.proj = false; b.fresh = SHOT_FRESH;
    if (b.kind === "lightning") zap(b);
    else if (b.kind === "rainbow") b.waitT = 0;
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
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === b) continue;
      var lim = b.r + o.r + pad, dx = o.x - b.x, dy = o.y - b.y;
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

  function startPop(group, kind) {
    var lvl = Math.max(1, chain);
    group.forEach(function (b) { b.pop = kind === "blast" ? ANTIC * 0.55 : 0; b.popLvl = lvl; b.vx = b.vy = 0; });
    popEvents.push({ balls: group, lvl: lvl, kind: kind || "match", done: false });
  }

  function checkCombos() {
    var groups = findGroups();
    if (!groups.length) return;
    chain++;
    stats.maxChain = Math.max(stats.maxChain, chain);
    groups.forEach(function (g) {
      stats.maxGroup = Math.max(stats.maxGroup, g.length);
      startPop(g, "match");
      emit("antic", chain);
      // gros combo → un pouvoir en bonus pour le tireur
      if ((g.length >= 5 || chain >= 3) && state === "flight") grantPower(players[lastShooter]);
    });
  }

  function grantPower(p) {
    if (isPower(p.cur) || isPower(p.next)) return;
    var un = BONUS.filter(function (b) { return shots >= b.at; }).map(function (b) { return b.kind; });
    var kind = un[rnd(un.length)];
    p.next = { kind: kind };
    emit("toast", p.i, "Bonus : " + ART.POWERS[kind].name + " !");
    emit("sound", "bonus");
  }

  function updatePops(dt) {
    balls.forEach(function (b) { if (b.pop >= 0) b.pop += dt; });
    popEvents.forEach(function (ev) {
      if (ev.done) return;
      if (!ev.balls.every(function (b) { return b.pop >= POP_T; })) return;
      ev.done = true;
      var cx = 0, cy = 0, n = ev.balls.length, data = [];
      ev.balls.forEach(function (b) { b.dead = true; cx += b.x; cy += b.y; data.push(Math.round(b.x), Math.round(b.y), b.type); });
      cx /= n; cy /= n;
      stats.popped += n;
      var gain = (ev.kind === "match" ? n * 10 + Math.max(0, n - 3) * 20 : n * 20) * ev.lvl;
      addScore(gain);
      // les explosions affichent leur total dans « BOUM ! », pas de nombre en double
      emit("pop", Math.round(cx), Math.round(cy), ev.lvl, n, ev.kind === "match" ? gain : 0, ev.kind, data);
    });
    popEvents = popEvents.filter(function (ev) { return !ev.done; });
    if (balls.some(function (b) { return b.dead; })) balls = balls.filter(function (b) { return !b.dead; });
  }

  function addScore(n) { score += n; scoreBump = 1; }

  /* ====================== POUVOIRS ====================== */
  // grenade posée dans le terrain : un tir dedans la fait exploser et rapporte des points
  function grenadeHit(g, shot) {
    if (g.dead) return;
    shot.proj = false; shot.fresh = SHOT_FRESH;
    stats.booms++;
    explode(g, GRENADE_RAD * R, "grenade");
  }
  function explode(src, rad, kind) {
    src.dead = true;
    if (chain < 1) chain = 1;
    var near = balls.filter(function (b) { return b !== src && b.pop < 0 && !b.dead && Math.hypot(b.x - src.x, b.y - src.y) < rad + b.r * 0.4; });
    var victims = near.filter(function (b) { return b.kind !== "grenade"; });
    // souffle : on pousse ceux qui sont un peu plus loin
    balls.forEach(function (b) {
      if (b === src || near.indexOf(b) >= 0 || isStatic(b)) return;
      var dx = b.x - src.x, dy = b.y - src.y, d = Math.hypot(dx, dy) || 1;
      if (d < rad * 2.2) { var f = (1 - d / (rad * 2.2)) * 520; b.vx += dx / d * f; b.vy += dy / d * f - 60; }
    });
    var gain = (50 + victims.length * 20) * Math.max(1, chain);
    addScore(50 * Math.max(1, chain));     // la prime de la grenade ; les personnages emportés comptent à leur POP
    if (victims.length) startPop(victims, "blast");
    emit("boom", Math.round(src.x), Math.round(src.y), rad, kind, kind === "grenade" ? gain : 0);
    // une grenade prise dans l'explosion saute à son tour
    near.filter(function (b) { return b.kind === "grenade"; }).forEach(function (g) { stats.booms++; explode(g, GRENADE_RAD * R, "grenade"); });
  }

  function zap(src) {
    stats.powers++;
    src.dead = true;
    var x = src.x;
    if (chain < 1) chain = 1;
    var victims = balls.filter(function (b) { return b !== src && b.pop < 0 && !b.dead && Math.abs(b.x - x) < R * 1.25; });
    victims.filter(function (b) { return b.kind === "grenade"; }).forEach(function (g) { stats.booms++; explode(g, GRENADE_RAD * R, "grenade"); });
    victims = victims.filter(function (b) { return !b.dead; });
    if (victims.length) startPop(victims, "blast");
    var floorY = BY + Math.sqrt(Math.max(0, BOWL * BOWL - (x - BX) * (x - BX)));
    emit("zap", Math.round(x), Math.round(floorY), victims.length * 20);
  }

  // la boule multicolore (joker) prend la couleur qui fait le plus gros groupe autour d'elle
  function rainbowCheck(b, dt) {
    if (b.kind !== "rainbow" || b.proj || b.pop >= 0) return;
    if (b.morph >= 0) {
      b.morph += dt;
      if (b.morph >= 0.45) { b.kind = "sq"; b.type = b.morphTo; b.morph = -1; emit("morphed", Math.round(b.x), Math.round(b.y), b.type); }
      return;
    }
    b.waitT += dt;
    var cand = balls.filter(groupable);
    var near = neighbors(b, cand, TOUCH);
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
    if (choice >= 0) { b.morph = 0; b.morphTo = choice; stats.powers++; emit("magic"); }
  }

  // les bombes perdent 1 à chaque fin de tour (sauf au tour où elles ont été tirées)
  function tickBombs() {
    var boom = false;
    balls.forEach(function (b) {
      if (b.kind !== "bomb" || b.proj || b.pop >= 0 || b.dead || b.shotNo === shots) return;
      b.count--;
      emit("tick", b.id, b.count);
      if (b.count <= 0) { stats.powers++; explode(b, 3.3 * R, "bomb"); boom = true; }
    });
    return boom;
  }

  /* ====================== TIR ET TOURS ====================== */
  function muzzle(p) {
    var L = LAUNCH[p.i], a = p.ang;
    return { x: L.x + Math.cos(a) * L.dir * 34, y: L.y + Math.sin(a) * 34, vx: Math.cos(a) * L.dir, vy: Math.sin(a) };
  }
  function shotSpeed(p) { return VMIN + (VMAX - VMIN) * p.pow; }

  // un joueur d'ici essaie de tirer (clavier, souris)
  function tryFire(p) {
    if (state !== "aim") return;
    if (p.i !== active) { p.deny = 0.4; sfxDeny(); FX.toast(p.i, "Attends ton tour !"); return; }
    if (isGuest()) { netSend("cmd", { t: "fire", ang: p.ang, pow: p.pow }); return; }
    fire(p);
  }
  function fire(p) {
    if (state !== "aim" || p.i !== active) return;
    var m = muzzle(p), v = shotSpeed(p), it = p.cur;
    var b = newBall(it, m.x, m.y);
    b.vx = m.vx * v; b.vy = m.vy * v; b.proj = true; b.owner = p.i; b.flip = LAUNCH[p.i].dir; b.shotNo = shots + 1; b.trail = [];
    balls.push(b);
    flying = b; lastShooter = p.i;
    p.cur = p.next; p.next = gen();
    shots++; stats.shots++;
    state = "flight"; resolveT = 0; calmT = 0; chain = 0; bombsTicked = false; rained = false;
    emit("launch", p.i, Math.round(m.x), Math.round(m.y), +m.vx.toFixed(2), +m.vy.toFixed(2), +p.pow.toFixed(2));
    if (isPower(it)) emit("toast", p.i, ART.POWERS[it.kind].name + " !");
  }

  function trySwap(p) {
    if (state !== "aim" && state !== "flight") return;
    if (isGuest()) { netSend("cmd", { t: "swap" }); sfxSwap(); return; }
    swapItems(p);
  }
  function swapItems(p) {
    var t = p.cur; p.cur = p.next; p.next = t; p.load = 0.4;
    emit("sound", "swap");
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
    // pluie d'écureuils (parfois avec une grenade)
    if (!rained && shots > 0 && shots % RAIN_EVERY === 0) {
      rained = true;
      var n = Math.min(7, 2 + Math.floor(shots / 16));
      var grenades = balls.filter(function (b) { return b.kind === "grenade"; }).length;
      var gi = grenades < 2 && Math.random() < GRENADE_CHANCE ? rnd(n) : -1;
      for (var i = 0; i < n; i++) {
        var x = 110 + Math.random() * (FW - 220);
        var b = newBall(i === gi ? { kind: "grenade" } : { kind: "sq", type: TYPES[rnd(typesN)] }, x, -30 - i * 50);
        b.vy = 60; b.age = 0.5;
        balls.push(b);
      }
      emit("banner", gi >= 0 ? "Pluie d'écureuils… et une grenade !" : "Pluie d'écureuils !", -1, null);
      emit("sound", "rain");
      calmT = 0; resolveT = Math.min(resolveT, 3);
      return;
    }
    flying = null;
    // nouveau personnage débloqué ?
    var want = Math.min(TYPES.length, START_TYPES + UNLOCK_AT.filter(function (s) { return score >= s; }).length);
    if (want > typesN) {
      typesN = want;
      var t = TYPES[typesN - 1];
      emit("banner", "Nouveau venu : " + SQ[t].name + " !", t, null);
      emit("sound", "bonus");
    }
    active = 1 - active;
    state = "aim";
    chain = 0;
    emit("banner", "À toi, " + nameOf(active) + " !", -1, active);
    emit("sound", "turn", active);
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
      delayNode = AC.createDelay(1); delayNode.delayTime.value = 0.42;
      var fb = AC.createGain(); fb.gain.value = 0.32; var dl = AC.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 1800;
      delayNode.connect(dl); dl.connect(fb); fb.connect(delayNode); dl.connect(musicBus);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
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
    if (!audio() || music.on || SET.music <= 0) return;
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
    var seed = 7; function r01() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 26; i++) {
      var x = r01() * W, y = r01() * H * 0.8, rad = 10 + r01() * 40;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,236,190," + (0.05 + r01() * 0.08) + ")"); gr.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
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
    ctx.fillStyle = "#c79a62"; fieldPath(12); ctx.fill();
    ctx.fillStyle = "#8f6a3f"; fieldPath(6); ctx.fill();
    var ig = ctx.createLinearGradient(0, 0, 0, FH);
    ig.addColorStop(0, "#1d3a3a"); ig.addColorStop(1, "#24433a");
    ctx.fillStyle = ig; fieldPath(0); ctx.fill();
    if (glow > 0.01) {
      var gg = ctx.createRadialGradient(FW / 2, FH * 0.6, 20, FW / 2, FH * 0.6, FW * 0.7);
      gg.addColorStop(0, "rgba(255,214,140," + (0.22 * glow) + ")"); gg.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = gg; fieldPath(0); ctx.fill();
    }
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
      for (var j = 0; j < cand.length; j++) { var b = cand[j], dx = b.x - x, dy = b.y - y, lim = b.r + R; if (dx * dx + dy * dy < lim * lim) { hit = { x: x, y: y, ball: b }; break; } }
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
      var onGrenade = pr.hit.ball && pr.hit.ball.kind === "grenade";
      ctx.globalAlpha = alpha * 0.8; ctx.strokeStyle = onGrenade ? "#ffcf7a" : col.light; ctx.lineWidth = onGrenade ? 3.5 : 2.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(pr.hit.x, pr.hit.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (onGrenade && me) pr.hit.ball.scared = 0.4;   // la grenade voit qu'on la vise
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
    if (me) {
      var pr = 30 + Math.sin(clock * 4) * 3;
      var hg = ctx.createRadialGradient(0, 0, 10, 0, 0, pr + 22);
      hg.addColorStop(0, col.main + "88"); hg.addColorStop(1, col.main + "00");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, pr + 22, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#7a5230"; ctx.strokeStyle = "#2b1709"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(-dir * 6, 22, 24, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#946436"; ctx.fillRect(-dir * 6 - 20, 4, 40, 18); ctx.strokeRect(-dir * 6 - 20, 4, 40, 18);
    ctx.save();
    ctx.rotate(dir > 0 ? a : Math.PI - a);
    ctx.translate(-rec * 9, 0);
    ctx.scale(1 - rec * 0.12, 1 + rec * 0.22);
    var bg = ctx.createLinearGradient(0, -14, 0, 14);
    bg.addColorStop(0, col.light); bg.addColorStop(0.5, col.main); bg.addColorStop(1, col.dark);
    ctx.fillStyle = bg; ctx.strokeStyle = "#2b1709"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(30, -15); ctx.quadraticCurveTo(38, 0, 30, 15); ctx.lineTo(-12, 12); ctx.quadraticCurveTo(-20, 0, -12, -12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-6, -9, 30, 4);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-8, 6, 34, 4);
    ctx.fillStyle = "#fff3c4"; ctx.fillRect(-8, 6, 34 * p.pow, 4);
    ctx.restore();
    ctx.restore();
    var m = muzzle(p);
    var bob = Math.sin(clock * 3 + p.i) * 1.5, k = 0.55 + 0.45 * easeOutBack(Math.min(1, p.load));
    drawItem(p.cur, m.x - Math.cos(a) * dir * 6, m.y - Math.sin(a) * 6 + bob, R * 0.92, { k: k, flip: -dir, lx: Math.cos(a) * dir, ly: Math.sin(a), wag: Math.sin(clock * 4) });
    // étiquette du joueur (pseudo en ligne) + suivant
    var label = NET.started ? names[p.i].slice(0, 12) : (p.i === 0 ? "J1" : "J2");
    var tagX = L.x + dir * 22, tagY = 34;
    ctx.save();
    ctx.font = "900 14px Nunito, sans-serif";
    var tw = Math.max(70, ctx.measureText(label).width + 52);
    var bx = dir > 0 ? tagX - 30 : tagX + 30 - tw;
    ctx.globalAlpha = me ? 1 : 0.75;
    roundRect(bx, tagY - 15, tw, 28, 14);
    ctx.fillStyle = me ? col.main : "rgba(20,30,30,.65)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = me ? "#fff3c4" : col.main; ctx.stroke();
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fffaf0";
    ctx.fillText(label, bx + 12, tagY + 1);
    ctx.restore();
    var nx = bx + tw - 16, ny = tagY;
    p.nextX = nx; p.nextY = ny;
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(nx, ny, 13, 0, TAU); ctx.fill();
    drawItem(p.next, nx, ny + 2, 10, { flip: -dir });
    if (me && state === "aim") {
      var ay = 74 + Math.sin(clock * 6) * 4, mine = !NET.started || p.i === myIndex();
      var txt = mine ? "À toi !" : "Il vise…";
      ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "#2b1709"; ctx.strokeText(txt, L.x + dir * 60, ay);
      ctx.fillStyle = col.light; ctx.fillText(txt, L.x + dir * 60, ay);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  // traînée douce derrière un tir
  function drawTrail(b) {
    if (!b.trail || b.trail.length < 2) return;
    var col = PCOL[b.owner >= 0 ? b.owner : 0].light;
    for (var i = 0; i < b.trail.length; i++) {
      var q = (i + 1) / b.trail.length;
      ctx.globalAlpha = q * 0.45; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(b.trail[i][0], b.trail[i][1], R * 0.55 * q, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBall(b) {
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var def = null, k = 1 + 0.022 * Math.sin(clock * b.rate + b.breath), mood = "", white = 0, ox = 0, oy = 0;
    if (b.proj && sp > 50) { var s = Math.min(0.24, sp / 3800); def = { ang: Math.atan2(b.vy, b.vx), sx: 1 + s, sy: 1 - s * 0.55 }; }
    else if (Math.abs(b.jw) > 0.01) def = { ang: b.jang, sx: 1 - b.jw, sy: 1 + b.jw * 0.7 };
    if (b.pop >= 0) {
      mood = "pop";
      if (b.pop < ANTIC) { var q = b.pop / ANTIC; k *= 1 + 0.18 * q; ox = Math.sin(b.pop * 95) * 1.6 * q; oy = Math.cos(b.pop * 80) * 1.2 * q; white = 0.45 * q; }
      else { var c = Math.min(1, (b.pop - ANTIC) / (POP_T - ANTIC)); def = { ang: 0, sx: 1.18 + 0.3 * c, sy: 1.18 - 0.55 * c }; white = 0.55 + 0.4 * c; }
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
      if (b.kind === "grenade") {
        // grenade posée : un halo qui pulse pour dire « tire-moi dessus »
        var pg = 0.5 + 0.5 * Math.sin(clock * 4 + b.id);
        ctx.strokeStyle = "rgba(255,207,122," + (0.25 + 0.35 * pg) + ")"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, b.r * (1.15 + 0.1 * pg), 0, TAU); ctx.stroke();
        var scared = b.scared > 0 || (flying && flying.proj && Math.hypot(flying.x - b.x, flying.y - b.y) < 160);
        ART.drawPower(ctx, "grenade", 0, Math.sin(clock * 3 + b.id), b.r * k, { t: clock, scared: scared });
      } else if (b.kind === "rainbow" && b.morph >= 0 && b.morphTo >= 0) {
        var m = Math.min(1, b.morph / 0.45);
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
    ctx.save();
    ctx.translate(FW / 2, 34);
    var sc = 1 + scoreBump * 0.18;
    ctx.scale(sc, sc);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "800 12px Nunito, sans-serif"; ctx.fillStyle = "rgba(230,245,225,.8)"; ctx.fillText(NET.started ? "SCORE D'ÉQUIPE · EN LIGNE" : "SCORE D'ÉQUIPE", 0, -18);
    ctx.font = "900 34px Nunito, sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = "#16261f";
    var txt = Math.round(shownScore).toLocaleString("fr-FR");
    ctx.strokeText(txt, 0, 6); ctx.fillStyle = "#fff3c4"; ctx.fillText(txt, 0, 6);
    ctx.restore();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 12px Nunito, sans-serif"; ctx.fillStyle = "rgba(230,245,225,.65)";
    ctx.fillText("meilleur : " + Math.max(best, score).toLocaleString("fr-FR"), FW / 2, 64);
    for (var i = 0; i < typesN; i++) art.blit(ctx, FW / 2 + (i - (typesN - 1) / 2) * 24, 88, TYPES[i], 9, S * dpr, {});
    // prochaine pluie
    var left = RAIN_EVERY - (shots % RAIN_EVERY);
    ctx.font = "700 11px Nunito, sans-serif"; ctx.fillStyle = "rgba(230,245,225,.55)";
    ctx.fillText(left === 1 ? "pluie au prochain tir" : "pluie dans " + left + " tirs", FW / 2, 108);
    if (chainShow > 0 && chainLvlShown >= 2) {
      var q = 1 - chainShow / 1.6, pop = q < 0.12 ? easeOutBack(q / 0.12) : 1;
      ctx.save(); ctx.translate(FW / 2, 136); ctx.scale(pop, pop); ctx.rotate(Math.sin(clock * 10) * 0.04);
      ctx.globalAlpha = chainShow < 0.4 ? chainShow / 0.4 : 1;
      var hue = (clock * 120) % 360;
      ctx.font = "900 " + (28 + Math.min(20, chainLvlShown * 4)) + "px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 8; ctx.strokeStyle = "#2b1709"; ctx.strokeText("CHAÎNE x" + chainLvlShown, 0, 0);
      ctx.fillStyle = chainLvlShown >= 3 ? "hsl(" + hue + ",90%,72%)" : "#ffe066"; ctx.fillText("CHAÎNE x" + chainLvlShown, 0, 0);
      ctx.restore();
    }
    if (banner) {
      var bq = banner.t / banner.dur, ba = bq < 0.15 ? bq / 0.15 : bq > 0.8 ? (1 - bq) / 0.2 : 1;
      var bx = banner.side == null ? FW / 2 : banner.side === 0 ? 210 : FW - 210;
      ctx.save(); ctx.globalAlpha = ba; ctx.translate(bx, FH * 0.42 - (1 - ba) * 14);
      ctx.font = "900 22px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var w = ctx.measureText(banner.txt).width + (banner.type >= 0 ? 60 : 36);
      roundRect(-w / 2, -22, w, 44, 22); ctx.fillStyle = banner.side == null ? "rgba(30,40,35,.82)" : PCOL[banner.side].dark + "dd"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = banner.side == null ? "#fff3c4" : PCOL[banner.side].light; ctx.stroke();
      ctx.fillStyle = "#fffaf0"; ctx.fillText(banner.txt, banner.type >= 0 ? 14 : 0, 1);
      if (banner.type >= 0) art.blit(ctx, -w / 2 + 26, 2, banner.type, 15, S * dpr, { mood: "happy" });
      ctx.restore();
    }
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
    var sh = trauma * trauma * 14 * fxMul();
    var sx = sh ? (Math.sin(clock * 47) + Math.sin(clock * 83)) * 0.5 * sh : 0, sy = sh ? (Math.cos(clock * 53) + Math.sin(clock * 71)) * 0.5 * sh : 0;
    ctx.save();
    ctx.translate(OX + sx, OY + sy); ctx.scale(S, S);
    drawField(now);
    if (state === "aim" || state === "flight") players.forEach(drawPreview);
    balls.forEach(drawTrail);
    balls.forEach(drawBall);
    players.forEach(drawLauncher);
    drawEffects();
    drawHud();
    ctx.restore();
    if (flash > 0) { ctx.globalAlpha = Math.min(0.6, flash); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (H > W * 1.15) {
      ctx.font = "800 14px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,243,196,.85)";
      ctx.fillText("📱 Tourne l'écran pour un plus grand terrain", W / 2, OY + FH * S + 30);
    }
  }

  /* ====================== MISE À JOUR ====================== */
  function update(dt) {
    clock += dt;
    var running = state === "aim" || state === "flight" || state === "menu" || state === "over";
    if (isGuest()) guestUpdate(dt);
    else if (hitStop > 0) hitStop -= dt;
    else if (running) {
      var h = dt / SUB;
      for (var i = 0; i < SUB; i++) step(h);
      balls.forEach(function (b) {
        b.age += dt; if (b.impCd > 0) b.impCd -= dt; if (b.fresh > 0) b.fresh -= dt;
        rainbowCheck(b, dt);
        if (b.trail) { if (b.proj || b.fresh > 0.4) { b.trail.push([b.x, b.y]); if (b.trail.length > 9) b.trail.shift(); } else if (b.trail.length) b.trail.shift(); }
      });
      updatePops(dt);
      if (state !== "menu") checkCombos(); else findGroups();
      if (state === "flight") updateFlight(dt);
      if (state === "aim" || state === "flight") checkDanger(dt);
    }
    if ((state === "aim" || state === "flight") && !overlayOpen) players.forEach(function (p) { keyAim(p, dt); });
    if (NET.started) netTick(dt);
    players.forEach(function (p) {
      p.recV += (-220 * p.rec - 13 * p.recV) * dt; p.rec += p.recV * dt;
      if (p.load < 1) p.load = Math.min(1, p.load + dt * 3.5);
      if (p.deny > 0) p.deny -= dt;
    });
    balls.forEach(function (b) {
      b.jv += (-330 * b.jw - 15 * b.jv) * dt; b.jw = clamp(b.jw + b.jv * dt, -0.24, 0.3);
      b.blink -= dt; if (b.blink < -0.14) b.blink = 2 + Math.random() * 4;
      if (b.scared > 0) b.scared -= dt;
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

  /* ====================== COMMANDES ====================== */
  // codes physiques : marchent pareil en AZERTY (Z Q S D) et en QWERTY (W A S D)
  var KEYMAP = {
    KeyW: [0, "up"], KeyS: [0, "down"], KeyA: [0, "less"], KeyD: [0, "more"], Space: [0, "fire"], KeyE: [0, "swap"],
    ArrowUp: [1, "up"], ArrowDown: [1, "down"], ArrowLeft: [1, "more"], ArrowRight: [1, "less"], Enter: [1, "fire"], NumpadEnter: [1, "fire"],
    ShiftRight: [1, "swap"], Backspace: [1, "swap"], Numpad0: [1, "swap"],
  };
  function keyAim(p, dt) {
    var k = p.keys;
    if (k.up) p.ang = clamp(p.ang - 1.25 * dt, A_MIN, A_MAX);
    if (k.down) p.ang = clamp(p.ang + 1.25 * dt, A_MIN, A_MAX);
    if (k.more) p.pow = clamp(p.pow + 0.75 * dt, 0, 1);
    if (k.less) p.pow = clamp(p.pow - 0.75 * dt, 0, 1);
  }
  // en ligne, les deux jeux de touches pilotent MON lanceur (« vers le terrain = plus fort » s'adapte à mon côté)
  function keyTarget(map) {
    if (!NET.started) return { p: players[map[0]], act: map[1] };
    var me = players[myIndex()], act = map[1];
    if ((act === "more" || act === "less") && map[0] !== me.i) act = act === "more" ? "less" : "more";
    return { p: me, act: act };
  }
  function visible() { return !stage.hidden; }
  document.addEventListener("keydown", function (e) {
    if (!visible() || (e.target && /input|textarea|select/i.test(e.target.tagName))) return;
    audio(); if (state !== "menu") startMusic();
    if (state === "menu" || state === "over" || overlayOpen) {
      if (e.target && e.target.closest && e.target.closest("button, summary, a")) return;
      if (e.code === "Escape" && overlayOpen) { e.preventDefault(); closeOverlay(); return; }
      var enter = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
      if (enter && state === "over" && NET.on && canAgain()) { e.preventDefault(); askAgain(); }
      else if (enter && !NET.on && (state === "over" || (state === "menu" && screen === "menu"))) { e.preventDefault(); start(); }
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); if (state === "pause") resume(); else pause(); return; }
    if (state === "pause") return;
    var map = KEYMAP[e.code];
    if (!map) return;
    e.preventDefault();
    var t = keyTarget(map);
    if (t.act === "fire") { if (!e.repeat) tryFire(t.p); }
    else if (t.act === "swap") { if (!e.repeat) trySwap(t.p); }
    else t.p.keys[t.act] = true;
  });
  document.addEventListener("keyup", function (e) {
    var map = KEYMAP[e.code];
    if (!map || !players) return;
    var t = keyTarget(map);
    t.p.keys[t.act] = false;
  });
  window.addEventListener("blur", function () { if (players) players.forEach(function (p) { p.keys = {}; }); });

  // souris / doigt : le joueur actif (en ligne : moi) tire comme à la fronde
  function toField(e) { var rc = canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left - OX) / S, y: (e.clientY - rc.top - OY) / S }; }
  var drag = null;
  function pointerPlayer() { return NET.started ? myIndex() : active; }
  canvas.addEventListener("pointerdown", function (e) {
    audio(); startMusic();
    if (state !== "aim" && state !== "flight") return;
    var f = toField(e);
    for (var i = 0; i < 2; i++) {
      if (NET.started && i !== myIndex()) continue;
      var p = players[i], L = LAUNCH[i];
      if ((p.nextX && Math.hypot(f.x - p.nextX, f.y - p.nextY) < 22) || Math.hypot(f.x - L.x, f.y - L.y) < 30) { trySwap(p); return; }
    }
    if (state !== "aim") return;
    drag = { x: f.x, y: f.y, id: e.pointerId, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag || drag.id !== e.pointerId || state !== "aim") return;
    var pi = pointerPlayer(), f = toField(e), p = players[pi], dir = LAUNCH[pi].dir;
    var dx = drag.x - f.x, dy = drag.y - f.y, d = Math.hypot(dx, dy);
    if (d > 10) { drag.moved = true; p.ang = clamp(Math.atan2(dy, dx * dir), A_MIN, A_MAX); p.pow = clamp((d - 10) / 190, 0, 1); }
  });
  function endDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var ok = drag.moved; drag = null;
    if (ok && state === "aim") tryFire(players[pointerPlayer()]);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", function () { drag = null; });

  /* ====================== EN LIGNE ====================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NET = { on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, roster: [], status: "", err: "",
    started: false, out: [], acc: 0, aimAcc: 0, otherId: null, ts: 0, sentAng: null, sentPow: null };
  var myName = String(load("merger-name", "")).slice(0, 14);
  function isGuest() { return NET.started && NET.role === "guest"; }
  function myIndex() { return NET.role === "guest" ? 1 : 0; }
  function canAgain() { return NET.on && NET.roster.length >= 2; }
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 30 } } });
    return NET.client;
  }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH[rnd(CODE_CH.length)]; return s; }
  function netJoin(code, asHost) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showOnline(); return; }
    netLeave();
    NET.on = true; NET.role = asHost ? "host" : "guest"; NET.code = code; NET.status = "connexion"; NET.err = ""; NET.started = false; NET.roster = []; NET.ts = Date.now();
    var ch = cl.channel("mg-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["start", "s", "cmd", "aim", "end", "again"].forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload); } catch (err) { if (window.console) console.error(err); } }); });
    ch.subscribe(function (status) {
      NET.status = status;
      if (status === "SUBSCRIBED") trackMe();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      if (state === "menu" && screen === "online") showOnline();
    });
    NET.ch = ch;
    if (history.replaceState) history.replaceState(null, "", "#coop=" + code);
    showOnline();
  }
  function netLeave() {
    if (NET.ch) { try { NET.ch.untrack(); } catch (e) {} try { NET.client.removeChannel(NET.ch); } catch (e) {} }
    NET.ch = null; NET.on = false; NET.role = null; NET.started = false; NET.roster = []; NET.code = null;
  }
  function trackMe() { if (NET.ch) NET.ch.track({ id: NET.id, name: myName || "Écureuil", host: NET.role === "host", ingame: NET.started, ts: NET.ts, v: VERSION }); }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    NET.roster = list;
    if (NET.role === "guest" && !NET.started) {
      var idx = list.map(function (x) { return x.id; }).indexOf(NET.id);
      if (idx >= 2) { NET.err = "Salon plein (2 joueurs max)."; netLeave(); showOnline(); return; }
    }
    if (NET.started && NET.otherId && !list.some(function (x) { return x.id === NET.otherId; })) {
      NET.started = false;
      if (state === "aim" || state === "flight" || state === "pause") gameOver(NET.role === "host" ? "Ton coéquipier a quitté la partie." : "L'hôte a quitté la partie.");
    }
    if (state === "menu" && screen === "online") showOnline();
  }
  function hostStart() {
    if (NET.role !== "host" || NET.roster.length < 2) return;
    var other = NET.roster.filter(function (x) { return x.id !== NET.id; })[0];
    if (!other) return;
    var info = { names: [myName || "Écureuil", other.name || "Écureuil"], ids: [NET.id, other.id], v: VERSION };
    netSend("start", info);
    startOnline(info);
  }
  function startOnline(info) {
    NET.started = true; NET.out = []; NET.acc = 0;
    names = info.names.slice(0, 2);
    NET.otherId = info.ids[NET.role === "host" ? 1 : 0];
    trackMe();
    start(true);
  }
  // l'hôte envoie l'état ~10×/s ; l'invité envoie sa visée ~8×/s quand elle change
  function netTick(dt) {
    NET.acc += dt;
    if (NET.role === "host") {
      if (NET.acc < 0.1 && NET.out.length < 40) return;
      NET.acc = 0;
      netSend("s", snapshot());
    } else {
      NET.aimAcc += dt;
      var me = players[1];
      if (NET.aimAcc > 0.12 && (me.ang !== NET.sentAng || me.pow !== NET.sentPow)) { NET.aimAcc = 0; NET.sentAng = me.ang; NET.sentPow = me.pow; netSend("aim", { a: +me.ang.toFixed(3), p: +me.pow.toFixed(3) }); }
    }
  }
  function itemCode(it) { return it ? (it.kind === "sq" ? it.type : it.kind) : null; }
  function itemOf(c) { return c == null ? null : typeof c === "number" ? { kind: "sq", type: c } : { kind: c }; }
  var KIND = ["sq", "grenade", "rainbow", "lightning", "bomb"];
  var BN = 14;   // nombres par personnage dans un instantané
  function snapshot() {
    var b = [];
    balls.forEach(function (q) {
      b.push(q.id, KIND.indexOf(q.kind), q.type, Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, Math.round(q.vx), Math.round(q.vy),
        q.pop >= 0 ? Math.round(q.pop * 100) : -1, q.count, q.morph >= 0 ? Math.round(q.morph * 100) : -1, q.morphTo,
        (q.proj ? 1 : 0) | (q.pal ? 4 : 0), q.owner, q.flip);
    });
    var ev = NET.out; NET.out = [];
    return { st: state, a: active, sc: score, tn: typesN, sh: shots, ov: +overT.toFixed(2), ch: chain,
      p: players.map(function (p) { return [+p.ang.toFixed(3), +p.pow.toFixed(3), itemCode(p.cur), itemCode(p.next)]; }), b: b, v: ev, f: flying ? flying.id : 0 };
  }
  function applySnap(d) {
    if (d.st === "aim" || d.st === "flight") state = d.st;
    active = d.a; score = d.sc; typesN = d.tn; shots = d.sh; overT = d.ov; chain = d.ch;
    var p0 = players[0], p1 = players[1];
    p0.ang = d.p[0][0]; p0.pow = d.p[0][1];        // la visée de l'hôte ; la mienne reste à moi
    p0.cur = itemOf(d.p[0][2]); p0.next = itemOf(d.p[0][3]);
    p1.cur = itemOf(d.p[1][2]); p1.next = itemOf(d.p[1][3]);
    var seen = {};
    for (var i = 0; i < d.b.length; i += BN) {
      var id = d.b[i], q = byId(id);
      if (!q) { q = newBall({ kind: KIND[d.b[i + 1]], type: d.b[i + 2] }, d.b[i + 3], d.b[i + 4]); q.id = id; q.age = 1; balls.push(q); }
      q.kind = KIND[d.b[i + 1]]; q.type = d.b[i + 2];
      q.tx = d.b[i + 3]; q.ty = d.b[i + 4]; q.vx = d.b[i + 5]; q.vy = d.b[i + 6];
      var pop = d.b[i + 7] / 100;
      if (d.b[i + 7] >= 0) { if (q.pop < 0 || Math.abs(q.pop - pop) > 0.12) q.pop = pop; } else q.pop = -1;
      q.count = d.b[i + 8];
      q.morph = d.b[i + 9] >= 0 ? d.b[i + 9] / 100 : -1; q.morphTo = d.b[i + 10];
      var fl = d.b[i + 11]; q.proj = !!(fl & 1); q.pal = !!(fl & 4);
      q.owner = d.b[i + 12]; q.flip = d.b[i + 13];
      seen[id] = true;
    }
    balls = balls.filter(function (q) { return seen[q.id]; });
    flying = d.f ? byId(d.f) : null;
    (d.v || []).forEach(function (ev) { if (FX[ev[0]]) FX[ev[0]].apply(null, ev.slice(1)); });
  }
  // l'invité : on glisse vers la position reçue, en prolongeant le mouvement entre deux messages
  function guestUpdate(dt) {
    if (hitStop > 0) hitStop -= dt;
    balls.forEach(function (b) {
      if (b.pop < 0) { if (b.proj) b.vy += G * dt; b.tx += b.vx * dt; b.ty += b.vy * dt; }
      else b.pop += dt;
      var k = b.proj ? 1 : Math.min(1, dt * 14);
      if (Math.hypot(b.tx - b.x, b.ty - b.y) > 80) k = 1;
      b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k;
      if (b.proj) { if (!b.trail) b.trail = []; b.trail.push([b.x, b.y]); if (b.trail.length > 9) b.trail.shift(); }
      else if (b.trail && b.trail.length) b.trail.shift();
      if (b.morph >= 0) b.morph += dt;
    });
  }
  function onNet(ev, d) {
    if (!d) return;
    if (ev === "start" && NET.role === "guest") { startOnline(d); return; }
    if (ev === "again" && NET.role === "host" && state === "over") { hostStart(); return; }
    if (!NET.started) return;
    if (ev === "s" && NET.role === "guest") { applySnap(d); return; }
    if (ev === "aim" && NET.role === "host") { players[1].ang = clamp(d.a, A_MIN, A_MAX); players[1].pow = clamp(d.p, 0, 1); return; }
    if (ev === "cmd" && NET.role === "host") {
      var p = players[1];
      if (d.t === "fire" && active === 1 && state === "aim") { p.ang = clamp(d.ang, A_MIN, A_MAX); p.pow = clamp(d.pow, 0, 1); fire(p); }
      if (d.t === "swap" && (state === "aim" || state === "flight")) swapItems(p);
      return;
    }
    if (ev === "end" && NET.role === "guest") { score = d.sc; if (d.stats) stats = d.stats; gameOver(); return; }
  }
  function askAgain() {
    if (!canAgain()) return;
    if (NET.role === "host") hostStart();
    else { netSend("again", { id: NET.id }); var b = card.querySelector(".mc-go"); if (b) b.textContent = "En attente de l'hôte…"; }
  }

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
    state = "menu"; screen = "menu"; hud.hidden = true; overlayOpen = false;
    var who = TYPES.map(function (t) { return '<span class="mc-who" title="' + esc(SQ[t].name) + '">' + icon(t, 44) + "</span>"; }).join("");
    show('<h2 class="mc-title">Merger <span>Coop</span></h2>' +
      '<p class="mc-sub">Un puzzle tout doux à deux. Visez ensemble, empilez, faites des groupes de <strong>3 identiques</strong> et lancez des réactions en chaîne. Pas de chrono.</p>' +
      '<div class="mc-cast">' + who + "</div>" +
      '<div class="mc-modes">' +
      '<button class="mc-mode" type="button" data-act="start"><b>🎮 Sur ce PC</b><span>À deux sur le même clavier</span></button>' +
      '<button class="mc-mode mc-mode-net" type="button" data-act="online"><b>🌐 En ligne</b><span>Chacun chez soi, avec un code</span></button>' +
      "</div>" +
      '<div class="mc-powers">' +
      "<span>" + powerIcon("rainbow", 30) + "<b>Boule multicolore</b> 10 % de chance : elle complète n'importe quel groupe</span>" +
      "<span>" + powerIcon("grenade", 30) + "<b>Grenade</b> posée dans le terrain : tire dedans, BOUM et des points</span>" +
      "<span>" + powerIcon("lightning", 30) + powerIcon("bomb", 30) + "<b>Éclair et bombe</b> offerts par les gros combos</span>" +
      "</div>" +
      '<details class="mc-more"><summary>Commandes et réglages</summary>' +
      '<div class="mc-players">' +
      '<div class="mc-p mc-p1"><strong>Joueur 1</strong> · à gauche<span>' + kbd("Z") + kbd("S") + " viser · " + kbd("Q") + kbd("D") + " puissance</span><span>" + kbd("Espace") + " tirer · " + kbd("E") + " échanger</span><small>(QWERTY : W A S D) · en ligne : toutes les touches</small></div>" +
      '<div class="mc-p mc-p2"><strong>Joueur 2</strong> · à droite<span>' + kbd("↑") + kbd("↓") + " viser · " + kbd("←") + kbd("→") + " puissance</span><span>" + kbd("Entrée") + " tirer · " + kbd("Maj droite") + " échanger</span><small>Souris ou doigt : tirer en arrière comme une fronde</small></div>" +
      "</div>" + settingsHtml() + "</details>" +
      '<p class="game-small">Meilleur score d\'équipe : <strong>' + best.toLocaleString("fr-FR") + "</strong> · <span class=\"game-version\">Merger Coop v" + VERSION + "</span></p>", "mc-menu");
  }

  function showOnline() {
    state = "menu"; screen = "online"; hud.hidden = true;
    var typed = card.querySelector("[data-code]"), typedVal = typed ? typed.value : "", hadFocus = typed && document.activeElement === typed;
    var html = '<h2 class="mc-title">Coop <span>en ligne</span></h2>';
    html += '<p class="mc-name"><label for="mc-name">Ton pseudo</label> <input id="mc-name" type="text" maxlength="14" value="' + esc(myName) + '" placeholder="Écureuil" autocomplete="nickname" data-name></p>';
    if (!NET.on) {
      html += '<div class="mc-modes">' +
        '<button class="mc-mode" type="button" data-act="host"><b>➕ Créer un salon</b><span>Tu seras le Joueur 1 (à gauche)</span></button>' +
        '<div class="mc-mode mc-join"><b>🔑 Rejoindre</b><span><input type="text" maxlength="4" placeholder="CODE" data-code autocomplete="off" autocapitalize="characters" aria-label="Code du salon"> <button class="btn btn-small" type="button" data-act="join">Entrer</button></span></div>' +
        "</div>";
    } else {
      var link = location.origin + location.pathname + "#coop=" + NET.code;
      html += '<p class="game-small">Code du salon</p><p class="mc-code">' + esc(NET.code) + "</p>";
      html += '<p class="game-small">Envoie ce code, ou ce lien à ton ami·e : <a class="text-link" href="' + esc(link) + '" data-copy="' + esc(link) + '">copier le lien</a></p>';
      html += '<ul class="mc-roster">';
      for (var i = 0; i < 2; i++) {
        var r = NET.roster[i];
        html += '<li class="' + (r ? "on" : "") + '"><span class="mc-dot mc-dot' + (i + 1) + '"></span>' + (r ? esc(r.name) + (r.id === NET.id ? " (toi)" : "") + (r.host ? " · hôte" : "") : "En attente d'un joueur…") +
          (r && r.v && r.v !== VERSION ? " <small>⚠️ version différente, rechargez la page</small>" : "") + "</li>";
      }
      html += "</ul>";
      if (NET.status !== "SUBSCRIBED" && !NET.err) html += '<p class="game-small">Connexion au salon…</p>';
      if (NET.role === "host") html += '<p class="mc-actions"><button class="btn mc-go" type="button" data-act="hoststart"' + (NET.roster.length < 2 ? " disabled" : "") + ">▶ Lancer la partie</button></p>";
      else html += '<p class="game-small">L\'hôte lance la partie dès que vous êtes deux.</p>';
    }
    if (NET.err) html += '<p class="mc-err">' + esc(NET.err) + "</p>";
    html += '<p class="mc-actions"><button class="btn btn-ghost btn-small" type="button" data-act="leave">← Retour</button></p>';
    show(html, "mc-online");
    var inp = card.querySelector("[data-code]");
    if (inp && typedVal) { inp.value = typedVal; if (hadFocus) inp.focus(); }
  }

  function start(online) {
    if (!online && NET.on) netLeave();
    reset();
    state = "aim"; hide(); hud.hidden = false; overlayOpen = false;
    if (!online) names = ["Joueur 1", "Joueur 2"];
    audio(); applyVolumes(); startMusic();
    FX.banner("À toi, " + nameOf(0) + " !", -1, 0);
    sfxTurn(0);
    if (isGuest()) { balls = []; FX.banner("Tu joues à droite. " + names[0] + " commence !", -1, 1); }
    canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (state !== "aim" && state !== "flight") return;
    if (NET.started) {
      overlayOpen = true;
      show('<h2>Réglages</h2><p class="game-small">En ligne, la partie continue pendant que tu règles.</p>' + settingsHtml() +
        '<p class="mc-actions"><button class="btn" type="button" data-act="close">▶ Revenir</button> <button class="btn btn-ghost" type="button" data-act="quit">Quitter le salon</button></p>', "mc-pause");
      return;
    }
    prevState = state; state = "pause";
    show('<h2>Pause</h2><p>Score d\'équipe : <strong>' + score.toLocaleString("fr-FR") + "</strong></p>" + settingsHtml() +
      '<p class="mc-actions"><button class="btn" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>', "mc-pause");
  }
  function closeOverlay() { overlayOpen = false; hide(); canvas.focus({ preventScroll: true }); }
  function resume() { if (state === "pause") { state = prevState; hide(); canvas.focus({ preventScroll: true }); } }

  function gameOver(why) {
    if (state === "over") return;
    state = "over"; hud.hidden = true; overlayOpen = false;
    if (NET.started && NET.role === "host") { netSend("s", snapshot()); netSend("end", { sc: score, stats: stats }); }
    var rec = score > best;
    if (rec) { best = score; store("merger-coop-best", String(best)); }
    sfxOver();
    setTimeout(function () {
      if (state !== "over") return;
      var again = NET.on ? (canAgain() ? '<button class="btn mc-go" type="button" data-act="again">↻ Rejouer ensemble <small>(Entrée)</small></button> ' : "")
                         : '<button class="btn mc-go" type="button" data-act="start">↻ Rejouer <small>(Entrée)</small></button> ';
      show('<h2 class="mc-title">' + (why ? esc(why) : rec ? "Nouveau record d'équipe !" : "Le terrain déborde !") + "</h2>" +
        '<p class="mc-score">' + score.toLocaleString("fr-FR") + "</p>" +
        '<ul class="mc-stats">' +
        "<li><b>" + stats.maxChain + "</b><span>plus longue chaîne</span></li>" +
        "<li><b>" + stats.maxGroup + "</b><span>plus gros groupe</span></li>" +
        "<li><b>" + stats.popped + "</b><span>personnages libérés</span></li>" +
        "<li><b>" + ((stats.booms || 0) + stats.powers) + "</b><span>grenades et pouvoirs</span></li></ul>" +
        '<p class="mc-actions">' + again + '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>' +
        '<p class="game-small">Meilleur score d\'équipe : <strong>' + best.toLocaleString("fr-FR") + "</strong></p>", "mc-over");
      var go = card.querySelector(".mc-go"); if (go) go.focus({ preventScroll: true });
    }, 900);
  }

  card.addEventListener("click", function (e) {
    var cp = e.target.closest("[data-copy]");
    if (cp) { e.preventDefault(); try { navigator.clipboard.writeText(cp.getAttribute("data-copy")); cp.textContent = "lien copié !"; } catch (er) {} return; }
    var b = e.target.closest("[data-act]");
    if (!b) return;
    audio(); sfxUi();
    var a = b.getAttribute("data-act");
    if (a === "start") start();
    else if (a === "resume") resume();
    else if (a === "close") closeOverlay();
    else if (a === "menu" || a === "quit") { if (NET.on) netLeave(); if (history.replaceState) history.replaceState(null, "", "#coop"); reset(); menu(); }
    else if (a === "online") { NET.err = ""; showOnline(); }
    else if (a === "host") netJoin(newCode(), true);
    else if (a === "join") { var c = (card.querySelector("[data-code]").value || "").toUpperCase().replace(/[^A-Z]/g, ""); if (c.length === 4) netJoin(c, false); else { NET.err = "Le code fait 4 lettres."; showOnline(); } }
    else if (a === "hoststart") hostStart();
    else if (a === "leave") { netLeave(); NET.err = ""; if (history.replaceState) history.replaceState(null, "", "#coop"); menu(); }
    else if (a === "again") askAgain();
  });
  card.addEventListener("input", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-name")) { myName = t.value.trim().slice(0, 14); store("merger-name", myName); if (NET.on) trackMe(); return; }
    if (t.hasAttribute("data-code")) { t.value = t.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); return; }
    var k = t.getAttribute("data-set");
    if (!k) return;
    if (k === "fx") SET.fx = t.checked ? "full" : "reduced";
    else SET[k] = Number(t.value);
    audio(); applyVolumes(); saveSet();
    if (k === "music") { if (SET.music > 0 && state !== "menu") startMusic(); else if (SET.music <= 0) stopMusic(); }
    if (k === "sfx") sfxImpact(0.5);
  });
  card.addEventListener("keydown", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-code") && e.key === "Enter") { e.preventDefault(); var btn = card.querySelector('[data-act="join"]'); if (btn) btn.click(); }
  });

  function hudBtn(sel, fn) { var el = stage.querySelector(sel); if (el) el.addEventListener("click", function () { audio(); sfxUi(); fn(el); }); }
  hudBtn("[data-c-pause]", function () { if (state === "pause") resume(); else if (overlayOpen) closeOverlay(); else pause(); });
  hudBtn("[data-c-restart]", function () { if (NET.started) { if (NET.role === "host") hostStart(); } else start(); });
  hudBtn("[data-c-mute]", function () { SET.mute = !SET.mute; saveSet(); applyVolumes(); muteLabel(); });
  function muteLabel() { var el = stage.querySelector("[data-c-mute]"); if (el) { el.textContent = SET.mute ? "🔇" : "🔊"; el.setAttribute("aria-label", SET.mute ? "Activer le son" : "Couper le son"); } }
  muteLabel();
  document.addEventListener("visibilitychange", function () { if (document.hidden) { if (!NET.started) pause(); stopMusic(); } });

  /* ====================== SOLO / COOP ====================== */
  var soloStage = document.querySelector("[data-merger]");
  var tabs = document.querySelectorAll("[data-mode]");
  function setMode(m) {
    if (soloStage) soloStage.hidden = m !== "solo";
    stage.hidden = m !== "coop";
    tabs.forEach(function (t) { var on = t.getAttribute("data-mode") === m; t.setAttribute("aria-selected", on ? "true" : "false"); t.classList.toggle("is-on", on); });
    document.querySelectorAll("[data-help]").forEach(function (h) { h.hidden = h.getAttribute("data-help") !== m; });
    store("merger-mode", m);
    if (m === "coop") { if (history.replaceState && !/#coop/.test(location.hash)) history.replaceState(null, "", "#coop"); resize(); if (state === "menu" && screen === "menu") menu(); }
    else { if (history.replaceState && !/^#party/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); if ((state === "aim" || state === "flight") && !NET.started) pause(); stopMusic(); }
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
    if (players && (!stage.hidden || NET.started)) {
      if (state !== "pause") update(dt);
      if (!stage.hidden) render(now);
    }
    requestAnimationFrame(loop);
  }

  // outils de test (console) : MERGER_COOP.state(), .give(0, "rainbow"), .fire(0)
  window.MERGER_COOP = {
    version: VERSION,
    state: function () { return { state: state, screen: screen, active: active, score: score, balls: balls.length, chain: chain, shots: shots, typesN: typesN, stats: stats,
      net: { on: NET.on, started: NET.started, role: NET.role, code: NET.code, roster: NET.roster.length, status: NET.status, err: NET.err },
      players: players.map(function (p) { return { ang: p.ang, pow: p.pow, cur: p.cur, next: p.next }; }) }; },
    balls: function () { return balls.map(function (b) { return { id: b.id, kind: b.kind, type: b.type, x: b.x, y: b.y, vx: b.vx, vy: b.vy, proj: b.proj, pop: b.pop }; }); },
    give: function (i, kind) { players[i].cur = kind === "sq" ? { kind: "sq", type: TYPES[0] } : { kind: kind }; },
    aim: function (i, ang, pow) { players[i].ang = ang; players[i].pow = pow; },
    fire: function (i) { tryFire(players[i]); },
    add: function (type, x, y, kind) { var b = newBall(kind ? { kind: kind } : { kind: "sq", type: type }, x, y); b.age = 2; balls.push(b); },
    score: function (n) { addScore(n); },
    over: function () { gameOver(); },
    clear: function () { balls = []; },
    // tir « intelligent » pour les tests : cherche l'angle/puissance qui touche un personnage de la même couleur (ou une grenade)
    bestShot: function (i) {
      var p = players[i], it = p.cur, keep = [p.ang, p.pow], bestS = -1, bestA = keep;
      for (var a = A_MIN; a <= A_MAX; a += 0.06) for (var w = 0.05; w <= 1; w += 0.05) {
        p.ang = a; p.pow = w;
        var pr = predict(p); if (!pr.hit) continue;
        var sc = 0;
        if (pr.hit.ball && pr.hit.ball.kind === "grenade") sc += 4;
        balls.forEach(function (b) { if (b.pop < 0 && it.kind === "sq" && b.type === it.type) { var d = Math.hypot(b.x - pr.hit.x, b.y - pr.hit.y); if (d < R * 2.4) sc += 3; } });
        sc += pr.hit.y / 1000;
        if (sc > bestS) { bestS = sc; bestA = [a, w]; }
      }
      p.ang = bestA[0]; p.pow = bestA[1];
      return bestS;
    },
  };

  var hashCode = /#coop=([A-Za-z]{4})/.exec(location.hash || "");
  var startMode = /#coop/.test(location.hash) ? "coop" : (load("merger-mode", "solo") === "coop" ? "coop" : "solo");
  if (/^#party/.test(location.hash)) startMode = "solo";   // manche de party (js/party.js)
  reset();
  setMode(startMode);
  menu();
  if (hashCode) netJoin(hashCode[1].toUpperCase(), false);
  requestAnimationFrame(loop);
})();
