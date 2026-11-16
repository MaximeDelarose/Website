/* =========================================================================
   Arcane Tactics 3.0 — héros redessinés (Éclaireur, Arcaniste, Gardien) avec AT_GFX.
   Rig modulaire : jambes → cape → torse → bras → tête (capuche/casque/cheveux) → accessoires.
   Même signature et mêmes repères que les anciens dessins (mains vers (15,-30), sommet de tête ≈ -62/-70)
   pour que l'équipement porté (coiffe, arme, amulette…) se superpose sans changement.
   Les sept classes ont désormais leur version.
   ========================================================================= */
(function (root) {
  "use strict";
  var G = root.AT_GFX, ART = root.AT_ART; if (!G || !ART) return;
  var P0 = G.PAL, TAU = G.TAU, body = G.body, limb = G.limb, eye = G.eye, glow = G.glow, disc = G.disc, poly = G.poly, shade = G.shade, rgba = G.rgba;
  var X = ART.heroExt = ART.heroExt || {};

  function legs(g, o, c1, c2, boot) {
    var w = o.walk != null ? Math.sin(o.walk * TAU) : 0;
    limb(g, [-4, -26], [-5 + w * 3, -14], [-6 + w * 6, -1], 7, 5.5, c1);
    limb(g, [5, -26], [6 - w * 3, -14], [7 - w * 6, -1], 7, 5.5, c2);
    body(g, [[-10 + w * 6, -4], [-2 + w * 6, -4], [-1 + w * 6, 1], [-11 + w * 6, 1]], boot, { lw: 1.4 });
    body(g, [[3 - w * 6, -4], [11 - w * 6, -4], [12 - w * 6, 1], [2 - w * 6, 1]], boot, { lw: 1.4 });
  }
  function arm(g, o, c, hand, side) { // bras avant (côté arme) qui se lève au lancer
    var k = o.cast ? Math.sin(o.cast * Math.PI) : 0;
    limb(g, [8, -46], [14 + k * 3, -38 - k * 6], [15 + k * 3, -30 - k * 14], 6, 4.5, c);
    disc(g, 15 + k * 3, -29 - k * 14, 3.4, hand);
  }

  /* ---------------- Éclaireur ---------------- */
  X.voltige = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.5, wv = Math.sin(t * 5);
    // écharpe flottante
    var sc = [[-3, -46 + b]]; for (var i = 1; i <= 6; i++) sc.push([-3 - i * 5.5, -46 + b + Math.sin(t * 6 + i * 0.8) * 3 + i * 1.3]);
    g.strokeStyle = P.cyan; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); sc.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
    g.strokeStyle = rgba("#fff", 0.35); g.lineWidth = 1.2; g.beginPath(); sc.forEach(function (p, i) { i ? g.lineTo(p[0], p[1] - 1) : g.moveTo(p[0], p[1] - 1); }); g.stroke();
    legs(g, o, "#2b2f3b", "#3a404e", "#1c1f29");
    // pan de cape court
    body(g, [[-9, -44 + b], [-18 + wv, -28], [-14 + wv, -14], [-5, -20]], shade(P.main, -0.35), { lw: 1.4 });
    // veste
    body(g, [[-10, -48 + b], [0, -52 + b], [10, -48 + b], [8, -26], [-8, -26]], P.main, { lw: 1.8, paint: function (gg, bb) { gg.fillStyle = rgba("#000", 0.2); gg.fillRect(bb.x0, bb.y0 + bb.h * 0.78, bb.w, 3); gg.fillStyle = P.cyan; gg.fillRect(bb.x0 + bb.w * 0.46, bb.y0 + 3, 2, bb.h - 8); } });
    body(g, [[-9, -27], [9, -27], [10, -22], [-10, -22]], "#2b2f3b", { lw: 1.4 });
    disc(g, 0, -24.5, 2, P.cyan);
    // bras arrière + avant
    limb(g, [-8, -46 + b], [-13, -38], [-12, -30], 6, 4.5, shade(P.main, -0.25));
    arm(g, o, P.light, "#e9c9a8");
    // tête : capuche
    var hy = -56 + b;
    body(g, [[-9, hy + 4], [-8, hy - 8], [0, hy - 15], [9, hy - 8], [10, hy + 3], [4, hy + 8], [-4, hy + 8]], shade(P.main, -0.15), { lw: 1.8 });
    body(g, [[-8, hy - 8], [0, hy - 15], [-3, hy - 3]], P.light, { lw: 0, shine: 0 });
    if (!back) {
      body(g, [[-5, hy - 5], [6, hy - 5], [7, hy + 3], [0, hy + 7], [-5, hy + 3]], "#151320", { lw: 1 });
      eye(g, -1.2, hy - 1, 2, 1.4, P.cyan, { rot: -0.1 }); eye(g, 4.6, hy - 1, 2, 1.4, P.cyan, { rot: -0.1 });
      body(g, [[-5, hy + 2], [6, hy + 2], [5, hy + 8], [-4, hy + 8]], "#2b2f3b", { lw: 1 }); // masque bas
    }
    // dague à la ceinture
    limb(g, [-9, -24], [-12, -21], [-11, -14], 2.5, 1.5, "#cfd6e4", { lw: 0.8 });
    if (c > 0.1) glow(g, 18, -40, 22 * c + 6, P.cyan, 0.4 * c);
  };

  /* ---------------- Arcaniste ---------------- */
  X.prisme = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.5, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, sw = Math.sin(t * 2.6);
    // robe longue
    body(g, [[-11, -46 + b], [-14 - w * 2, -24], [-17 + sw * 1.5, -4], [-6, 1], [6, 1], [18 - sw * 1.5, -4], [15 + w * 2, -24], [11, -46 + b], [0, -50 + b]], P.main, { lw: 1.8, paint: function (gg, bb) {
      gg.fillStyle = rgba(P.teal, 0.85); gg.fillRect(bb.x0, bb.y1 - 5, bb.w, 2.2);
      gg.strokeStyle = rgba(P.teal, 0.6); gg.lineWidth = 1; gg.beginPath(); gg.moveTo(bb.x0 + bb.w * 0.5, bb.y0 + 8); gg.lineTo(bb.x0 + bb.w * 0.5, bb.y1 - 8); gg.stroke(); } });
    // pieds
    limb(g, [-4, -4], [-5, -1], [-7 + w * 4, 1], 5, 4, "#241038", { lw: 1 }); limb(g, [4, -4], [5, -1], [8 - w * 4, 1], 5, 4, "#241038", { lw: 1 });
    // col haut + épaulière
    body(g, [[-10, -50 + b], [-6, -58 + b], [6, -58 + b], [11, -50 + b], [8, -44 + b], [-8, -44 + b]], P.dark, { lw: 1.6 });
    body(g, [[-6, -56 + b], [6, -56 + b], [3, -46 + b], [-3, -46 + b]], P.white, { lw: 1, shine: 0.3 });
    // gemme de poitrine
    glow(g, 0, -38 + b, 12, P.gem, 0.4 + 0.15 * Math.sin(t * 3));
    body(g, [[0, -43 + b], [4, -38 + b], [0, -32 + b], [-4, -38 + b]], P.gem, { lw: 1.2, shine: 0.5 });
    // bras
    limb(g, [-9, -48 + b], [-14, -40], [-13, -32], 6, 4.5, P.dark);
    arm(g, o, P.main, "#f1d6c0");
    // tête : visage + cheveux argentés
    var hy = -60 + b;
    if (!back) { body(g, [[-6, hy - 6], [6, hy - 6], [7, hy + 2], [0, hy + 8], [-7, hy + 2]], "#f1d6c0", { lw: 1.6, shine: 0.25 }); eye(g, -2.4, hy, 1.7, 1.5, P.teal); eye(g, 3.4, hy, 1.7, 1.5, P.teal); g.strokeStyle = "#7a4a3a"; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, hy + 5); g.quadraticCurveTo(1, hy + 6.5, 3, hy + 5); g.stroke(); }
    body(g, [[-8, hy + 1], [-9, hy - 8], [-2, hy - 13], [7, hy - 11], [9, hy - 4], [6, hy - 6], [-1, hy - 8], [-6, hy - 4]], "#d9d2f0", { lw: 1.6, shine: 0.3 });
    limb(g, [-8, hy - 4], [-14 + sw, hy + 8], [-13, hy + 20], 4, 1, "#c9c0e6", { lw: 1.1 });
    // cristal flottant (orbite)
    var cx = 22 + Math.cos(t * 1.6) * 3, cy = -62 + Math.sin(t * 2) * 4 - c * 8;
    glow(g, cx, cy, 16 + c * 10, P.gem, 0.45 + c * 0.3);
    poly(g, [[cx, cy - 8], [cx + 5, cy], [cx, cy + 8], [cx - 5, cy]], P.gem, "#fff", 1);
  };

  /* ---------------- Gardien ---------------- */
  X.bastion = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.4, wv = Math.sin(t * 3);
    // cape cramoisie
    body(g, [[-12, -56 + b], [-24 + wv, -36], [-22 + wv * 1.5, -8], [-6, -10], [-4, -40]], P.cape, { lw: 1.8, paint: function (gg, bb) { gg.fillStyle = rgba("#000", 0.2); gg.fillRect(bb.x0, bb.y0 + bb.h * 0.6, bb.w, bb.h * 0.4); } });
    legs(g, o, "#3a4468", "#46528a", "#222a48");
    // plastron
    body(g, [[-13, -58 + b], [0, -63 + b], [13, -58 + b], [11, -30], [-11, -30]], P.main, { lw: 2, paint: function (gg, bb) {
      gg.fillStyle = rgba(P.gold, 0.95); gg.fillRect(bb.x0 + bb.w * 0.46, bb.y0 + 4, 3, bb.h - 12); gg.fillRect(bb.x0 + 4, bb.y0 + bb.h * 0.32, bb.w - 8, 3); } });
    body(g, [[-11, -32], [11, -32], [12, -24], [-12, -24]], "#222a48", { lw: 1.6 });
    disc(g, 0, -28, 2.4, P.gold);
    // épaulières
    body(g, [[-18, -58 + b], [-8, -62 + b], [-8, -50 + b], [-18, -48 + b]], P.light, { lw: 1.8, shine: 0.3 });
    body(g, [[8, -62 + b], [18, -58 + b], [18, -48 + b], [8, -50 + b]], P.light, { lw: 1.8, shine: 0.3 });
    // bras arrière + bouclier
    limb(g, [-12, -52 + b], [-17, -42], [-14, -34], 8, 6, P.dark);
    var sk = c * 0.2;
    g.save(); g.translate(-18, -36); g.rotate(-0.08 - sk);
    body(g, [[-9, -17], [9, -17], [10, 2], [0, 14], [-10, 2]], P.light, { lw: 2.2, shine: 0.25 });
    body(g, [[-5, -12], [5, -12], [5, 0], [0, 8], [-5, 0]], P.main, { lw: 1.2 });
    g.fillStyle = P.gold; g.fillRect(-1.2, -11, 2.4, 14); g.fillRect(-4.5, -6, 9, 2.4);
    g.restore();
    arm(g, o, P.main, P.gold);
    // casque à cimier
    var hy = -68 + b;
    body(g, [[-9, hy + 8], [-9, hy - 4], [-4, hy - 11], [4, hy - 11], [9, hy - 4], [9, hy + 8], [4, hy + 12], [-4, hy + 12]], "#d9d6e6", { lw: 2, shine: 0.35 });
    body(g, [[-1.5, hy - 11], [1.5, hy - 11], [3 + wv * 1.5, hy - 22], [-3 + wv, hy - 20]], P.cape, { lw: 1.4 });
    if (!back) { g.fillStyle = "#12101c"; g.fillRect(-7, hy, 14, 4.5); eye(g, -3, hy + 2.2, 1.6, 1.1, P.gem || "#7ff6ff"); eye(g, 3, hy + 2.2, 1.6, 1.1, P.gem || "#7ff6ff"); }
    g.fillStyle = P.gold; g.fillRect(-9, hy + 8, 18, 2);
  };


  /* ---------------- Sibylle (invocatrice) ---------------- */
  X.sibylle = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.5, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, sw = Math.sin(t * 2.4);
    body(g, [[-10, -48 + b], [-15 - w * 2, -22], [-18 + sw * 1.5, -3], [-5, 1], [6, 1], [19 - sw * 1.5, -3], [15 + w * 2, -22], [10, -48 + b], [0, -52 + b]], P.main, { lw: 1.8, paint: function (gg, bb) { gg.fillStyle = rgba(P.bronze, 0.9); gg.fillRect(bb.x0, bb.y1 - 5, bb.w, 2.2); gg.fillRect(bb.x0 + bb.w * 0.47, bb.y0 + 6, 2.2, bb.h - 10); } });
    body(g, [[-10, -50 + b], [0, -54 + b], [10, -50 + b], [7, -42 + b], [-7, -42 + b]], P.ivory, { lw: 1.4, shine: 0.3 });
    // ceinture de pions
    for (var i = 0; i < 3; i++) { disc(g, -7 + i * 7, -33 + b * 0.3, 2.3, i % 2 ? P.mint : P.ink); }
    limb(g, [-9, -48 + b], [-14, -40], [-13, -32], 6, 4.5, P.dark);
    arm(g, o, P.main, "#efd2b4");
    var hy = -60 + b;
    body(g, [[-9, hy + 8], [-11, hy - 4], [-5, hy - 13], [5, hy - 13], [11, hy - 4], [9, hy + 8], [4, hy + 11], [-4, hy + 11]], P.ink, { lw: 1.8 });
    if (!back) { body(g, [[-6, hy - 6], [6, hy - 6], [7, hy + 2], [0, hy + 8], [-7, hy + 2]], "#efd2b4", { lw: 1.6, shine: 0.25 }); eye(g, -2.4, hy, 1.7, 1.5, P.mint); eye(g, 3.4, hy, 1.7, 1.5, P.mint); }
    body(g, [[-9, hy - 5], [0, hy - 14], [9, hy - 5], [0, hy - 8]], P.mint, { lw: 1.2 });
    glow(g, 20, -34 + b - c * 12, 14, P.mint, 0.3 + c * 0.4);
  };
  /* ---------------- Clarine (soigneuse) ---------------- */
  X.clarine = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.5, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, sw = Math.sin(t * 2.2);
    body(g, [[-9, -48 + b], [-14 - w * 2, -24], [-17 + sw, -3], [-5, 1], [6, 1], [18 - sw, -3], [14 + w * 2, -24], [9, -48 + b], [0, -51 + b]], P.main, { lw: 1.8, paint: function (gg, bb) { gg.fillStyle = rgba(P.gold, 0.95); gg.fillRect(bb.x0, bb.y1 - 5, bb.w, 2.2); gg.fillRect(bb.x0 + bb.w * 0.46, bb.y0 + 6, 2.4, bb.h - 10); } });
    body(g, [[-12, -50 + b], [-5, -56 + b], [5, -56 + b], [12, -50 + b], [8, -44 + b], [-8, -44 + b]], P.light, { lw: 1.5, shine: 0.3 });
    glow(g, 0, -38 + b, 11, P.flame, 0.3 + 0.12 * Math.sin(t * 3));
    poly(g, [[0, -42 + b], [3.5, -37 + b], [0, -32 + b], [-3.5, -37 + b]], P.rose, "#fff", 1);
    limb(g, [-8, -48 + b], [-13, -40], [-12, -32], 5.5, 4.2, P.dark);
    arm(g, o, P.main, "#f3d8c4");
    var hy = -60 + b;
    if (!back) { body(g, [[-6, hy - 6], [6, hy - 6], [7, hy + 2], [0, hy + 8], [-7, hy + 2]], "#f3d8c4", { lw: 1.6, shine: 0.25 }); eye(g, -2.4, hy, 1.7, 1.5, "#5a3a22"); eye(g, 3.4, hy, 1.7, 1.5, "#5a3a22"); }
    body(g, [[-9, hy + 3], [-10, hy - 8], [-3, hy - 14], [7, hy - 12], [10, hy - 4], [8, hy + 8], [6, hy - 5], [-1, hy - 8], [-6, hy - 4]], "#f1c96a", { lw: 1.6, shine: 0.3 });
    body(g, [[-6, hy - 13], [0, hy - 21], [6, hy - 13], [0, hy - 11]], P.gold, { lw: 1.4, shine: 0.4 });
    glow(g, 20, -46 + b - c * 10, 14 + c * 10, P.flame, 0.25 + c * 0.4);
  };
  /* ---------------- Orage (cogneuse) ---------------- */
  X.orage = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.4, wv = Math.sin(t * 3.4);
    body(g, [[-10, -56 + b], [-21 + wv, -36], [-19 + wv * 1.4, -9], [-5, -11], [-4, -40]], P.main, { lw: 1.8 });
    legs(g, o, "#2d2230", "#3b2c40", "#1a1220");
    body(g, [[-12, -56 + b], [0, -60 + b], [12, -56 + b], [10, -30], [-10, -30]], P.steel, { lw: 2, paint: function (gg, bb) { gg.fillStyle = rgba(P.bolt, 0.95); gg.beginPath(); gg.moveTo(bb.x0 + bb.w * 0.55, bb.y0 + 4); gg.lineTo(bb.x0 + bb.w * 0.35, bb.y0 + bb.h * 0.5); gg.lineTo(bb.x0 + bb.w * 0.52, bb.y0 + bb.h * 0.5); gg.lineTo(bb.x0 + bb.w * 0.4, bb.y1 - 5); gg.lineTo(bb.x0 + bb.w * 0.68, bb.y0 + bb.h * 0.4); gg.lineTo(bb.x0 + bb.w * 0.5, bb.y0 + bb.h * 0.4); gg.closePath(); gg.fill(); } });
    body(g, [[-11, -32], [11, -32], [12, -24], [-12, -24]], P.dark, { lw: 1.5 });
    body(g, [[-16, -56 + b], [-8, -60 + b], [-8, -48 + b], [-16, -46 + b]], P.steel2, { lw: 1.6, shine: 0.3 });
    limb(g, [-10, -50 + b], [-15, -42], [-13, -34], 6.5, 5, P.dark);
    arm(g, o, P.steel, P.steel2);
    var hy = -64 + b;
    if (!back) { body(g, [[-6, hy - 5], [6, hy - 5], [7, hy + 3], [0, hy + 9], [-7, hy + 3]], "#e8c4a8", { lw: 1.6, shine: 0.25 }); eye(g, -2.4, hy + 1, 1.7, 1.3, P.bolt); eye(g, 3.4, hy + 1, 1.7, 1.3, P.bolt); }
    body(g, [[-9, hy + 2], [-8, hy - 8], [0, hy - 13], [9, hy - 8], [9, hy - 1], [6, hy - 5], [-6, hy - 5]], "#241426", { lw: 1.6 });
    poly(g, [[-3, hy - 12], [0, hy - 24], [3, hy - 12]], P.bolt, P.dark, 1.2);
    if (c > 0.1) glow(g, 18, -40, 20 * c + 6, P.bolt, 0.45 * c);
  };
  /* ---------------- Ondine (maîtresse des eaux) ---------------- */
  X.ondine = function (g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, b = bob * 0.5, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, sw = Math.sin(t * 2.6);
    body(g, [[-9, -48 + b], [-14 - w * 2, -24], [-19 + sw * 2, -3], [-6, 1], [7, 1], [20 - sw * 2, -3], [14 + w * 2, -24], [9, -48 + b], [0, -51 + b]], P.main, { lw: 1.8, paint: function (gg, bb) { gg.strokeStyle = rgba(P.foam, 0.8); gg.lineWidth = 1.4; for (var i = 0; i < 3; i++) { gg.beginPath(); gg.moveTo(bb.x0, bb.y1 - 6 - i * 7); gg.quadraticCurveTo(bb.x0 + bb.w * 0.25, bb.y1 - 10 - i * 7, bb.x0 + bb.w * 0.5, bb.y1 - 6 - i * 7); gg.quadraticCurveTo(bb.x0 + bb.w * 0.75, bb.y1 - 2 - i * 7, bb.x1, bb.y1 - 6 - i * 7); gg.stroke(); } } });
    body(g, [[-9, -50 + b], [0, -55 + b], [9, -50 + b], [6, -42 + b], [-6, -42 + b]], P.light, { lw: 1.4, shine: 0.3 });
    glow(g, 0, -38 + b, 11, P.foam, 0.4);
    poly(g, [[0, -43 + b], [4, -38 + b], [0, -33 + b], [-4, -38 + b]], P.pearl, "#fff", 1);
    limb(g, [-8, -48 + b], [-13, -40], [-12, -32], 5.5, 4.2, P.dark);
    arm(g, o, P.main, "#f1d6c8");
    var hy = -60 + b;
    body(g, [[-8, hy + 20], [-11, hy], [-8, hy - 11], [0, hy - 14], [9, hy - 10], [10, hy + 2], [8, hy + 20], [5, hy + 4], [-6, hy + 4]], P.deep, { lw: 1.6, shine: 0.2 });
    if (!back) { body(g, [[-6, hy - 6], [6, hy - 6], [7, hy + 2], [0, hy + 8], [-7, hy + 2]], "#f1d6c8", { lw: 1.6, shine: 0.25 }); eye(g, -2.4, hy, 1.7, 1.5, P.light); eye(g, 3.4, hy, 1.7, 1.5, P.light); }
    poly(g, [[-5, hy - 11], [-3, hy - 19], [0, hy - 13], [3, hy - 19], [5, hy - 11]], P.foam, "#fff", 1);
    for (var i = 0; i < 3; i++) disc(g, 21 + Math.cos(t * 2 + i * 2) * 3, -44 + Math.sin(t * 2.4 + i * 2) * 5 - c * 6, 2.6 - i * 0.4, rgba(P.foam, 0.9));
  };

  // branche dans le rendu : ART.hero consulte heroExt avant ses anciens dessins
})(typeof window !== "undefined" ? window : globalThis);
