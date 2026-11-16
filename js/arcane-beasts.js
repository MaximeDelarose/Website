/* =========================================================================
   Arcane Tactics — bestiaire graphique (AT_BEASTS)
   Chaque monstre est dessiné aux pieds en (0, 0), tourné vers la droite.
   Signature : fn(g, t, o) avec t = temps, o = { walk, cast, hurt, elite, back, seed }.
   Les silhouettes sont pensées pour rester lisibles à petite taille sur la grille :
     Traqueur   élancé, arc de cristal         Colosse    massif, plaques et cristaux
     Spectre    flottant, cape en lambeaux      Tisseur    longs membres, filaments
     Siphonneur runes et vortex d'absorption    Araignée   pattes articulées, yeux rouges
     Chat masqué siamois, masque blanc, yeux rouges
   ========================================================================= */
(function (root) {
  "use strict";
  var G = root.AT_GFX;
  if (!G) return;
  var P = G.PAL, TAU = G.TAU, body = G.body, limb = G.limb, disc = G.disc, ell = G.ell, glow = G.glow, eye = G.eye, shade = G.shade, rgba = G.rgba, poly = G.poly, shadow = G.shadow, mix = G.mix;
  var B = {};
  function bob(t, a, sp) { return Math.sin(t * (sp || 2)) * a; }

  /* ---------------- Traqueur d'éclats ---------------- */
  B.traqueur = function (g, t, o) {
    var c = o.cast || 0, pull = c < 0.5 ? c * 2 : 1 - (c - 0.5) * 4, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, by = bob(t, 1.2, 2.4);
    shadow(g, 0, 0, 16);
    // jambes fines et bottes
    limb(g, [-3, -30], [-6 + w * 3, -16], [-9 + w * 5, -1], 6, 5, "#2a2040");
    limb(g, [5, -30], [8 - w * 3, -16], [10 - w * 5, -1], 6, 5, "#352a4e");
    // pans de cape qui flottent derrière
    body(g, [[-12, -34 + by], [-24 + Math.sin(t * 3) * 3, -22], [-30 + Math.sin(t * 3 + 1) * 4, -6], [-16, -10], [-8, -26]], "#4a3382", { lw: 1.6 });
    // manteau
    body(g, [[-12, -36 + by], [-10, -58 + by], [0, -66 + by], [10, -58 + by], [14, -38], [10, -14], [-2, -8], [-14, -18]], "#5b3f9e", { paint: function (gg, bb) { gg.fillStyle = rgba(P.cyan, 0.25); gg.fillRect(bb.x0, bb.y0 + bb.h * 0.62, bb.w, 2); gg.fillRect(bb.x0, bb.y0 + bb.h * 0.7, bb.w, 1); } });
    // plastron de cuir et ceinture
    body(g, [[-6, -48 + by], [8, -48 + by], [10, -30], [-8, -30]], "#2e2347", { lw: 1.2, shine: 0.15 });
    g.fillStyle = P.gold; g.fillRect(-9, -31, 19, 2.2); disc(g, 1, -30, 2.2, P.cyan);
    // capuche pointue
    body(g, [[-9, -62 + by], [-8, -74 + by], [4, -82 + by - Math.sin(t * 2) * 1], [-3, -72 + by], [11, -66 + by], [12, -56 + by], [4, -52 + by], [-5, -54 + by]], "#6a49b4", { lw: 1.8 });
    // visage dans l'ombre + yeux
    g.fillStyle = "#0b0714"; g.beginPath(); g.ellipse(5, -61 + by, 6, 7, 0.1, 0, TAU); g.fill();
    eye(g, 3, -62 + by, 1.8, 1.2, "#7ff0ff", { rot: -0.2 }); eye(g, 8, -62 + by, 1.8, 1.2, "#7ff0ff", { rot: -0.2 });
    // arc de cristal (tendu quand il vise)
    var ax = 18 + pull * -3, ay = -46 + by;
    limb(g, [8, -48 + by], [13, -48 + by], [ax, ay], 5, 4, "#5b3f9e");
    g.save(); g.translate(ax + 4, ay);
    glow(g, 0, 0, 20 + c * 14, P.cyan, 0.35 + c * 0.45);
    g.strokeStyle = shade(P.crystal, 0.2); g.lineWidth = 3.6; g.lineCap = "round"; g.beginPath(); g.arc(-8, 0, 17, -0.95, 0.95); g.stroke();
    g.strokeStyle = "#fff"; g.lineWidth = 1.2; g.beginPath(); g.arc(-8, 0, 17, -0.95, 0.95); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8 + Math.cos(-0.95) * 17, Math.sin(-0.95) * 17); g.lineTo(-10 - pull * 9, 0); g.lineTo(-8 + Math.cos(0.95) * 17, Math.sin(0.95) * 17); g.stroke();
    if (c > 0.1) { poly(g, [[-10 - pull * 9, -1.2], [12, 0], [-10 - pull * 9, 1.2]], P.cyan); G.glow(g, 12, 0, 8, P.cyan, 0.7); }
    g.restore();
    // éclats qui flottent derrière l'épaule
    for (var i = 0; i < 3; i++) { var fy = -66 + by + Math.sin(t * 2 + i * 2) * 3 - i * 4, fx = -16 - i * 5; poly(g, [[fx, fy - 5], [fx + 3, fy], [fx, fy + 5], [fx - 3, fy]], P.cyan, "#fff", 0.6); glow(g, fx, fy, 7, P.cyan, 0.4); }
  };

  /* ---------------- Colosse serti ---------------- */
  B.colosse = function (g, t, o) {
    var c = o.cast || 0, lift = Math.sin(c * Math.PI), br = bob(t, 1.1, 1.8), w = o.walk != null ? Math.sin(o.walk * TAU) : 0;
    shadow(g, 0, 0, 26, 0.38);
    // jambes-piliers
    body(g, [[-18, -34], [-4, -34], [-3, -4], [-5, 0], [-20, 0], [-21, -6]], "#6c6585", { lw: 2 });
    body(g, [[2, -34], [18, -34], [20, -6], [19, 0], [4, 0], [1, -6]], "#7a7396", { lw: 2 });
    g.fillStyle = rgba(P.ink, 0.5); g.fillRect(-20, -20, 16, 2); g.fillRect(3, -20, 16, 2);
    // bras arrière (poing pendant)
    limb(g, [-20, -64 + br], [-34, -46], [-30 + w * 2, -16], 15, 17, "#625b7c");
    body(g, [[-38, -18], [-26, -20], [-24, -6], [-34, -2], [-40, -8]], "#7d7694", { lw: 2 });
    // torse massif en plaques
    body(g, [[-26, -66 + br], [-8, -78 + br], [14, -76 + br], [30, -62 + br], [28, -40], [18, -26], [-14, -26], [-28, -42]], "#857ea3", { lw: 2.4, paint: function (gg, bb) { G.cracks(gg, bb, 7, "rgba(25,15,45,.35)", 5); } });
    body(g, [[-12, -62 + br], [6, -66 + br], [18, -56 + br], [14, -38], [-8, -38]], "#9b94b8", { lw: 1.6, shine: 0.3 });
    // runes lumineuses
    g.strokeStyle = rgba(P.cyan, 0.8 + Math.sin(t * 3) * 0.15); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-2, -58 + br); g.lineTo(4, -48 + br); g.lineTo(-2, -42 + br); g.moveTo(4, -48 + br); g.lineTo(10, -52 + br); g.stroke();
    glow(g, 4, -48 + br, 12, P.cyan, 0.3 + Math.sin(t * 3) * 0.1);
    // cristaux incrustés aux épaules
    [[-24, -70], [22, -72], [28, -56]].forEach(function (q, i) { var s = 1 + i * 0.1 + Math.sin(t * 2 + i) * 0.05; g.save(); g.translate(q[0], q[1] + br); glow(g, 0, -6, 14, P.crystal, 0.5); poly(g, [[-4 * s, 0], [-2 * s, -14 * s], [2 * s, -17 * s], [5 * s, -2 * s]], shade(P.crystal, 0.1), P.ink, 1.4); poly(g, [[-2 * s, -14 * s], [2 * s, -17 * s], [0, -4]], "#d9f4ff"); g.restore(); });
    // tête-heaume
    body(g, [[-6, -80 + br], [0, -92 + br], [10, -90 + br], [14, -80 + br], [10, -72 + br], [-4, -72 + br]], "#6c6585", { lw: 2 });
    g.fillStyle = "#0b0714"; g.fillRect(-1, -83 + br, 14, 4);
    eye(g, 3, -81 + br, 1.8, 1.4, P.crimsonLight); eye(g, 9, -81 + br, 1.8, 1.4, P.crimsonLight);
    // poing levé (attaque)
    var fy = -26 - lift * 40, fx = 26 + lift * 6;
    limb(g, [24, -62 + br], [38 + lift * 2, -50 - lift * 24], [fx, fy], 16, 18, "#7a7396");
    body(g, [[fx - 10, fy - 8], [fx + 8, fy - 10], [fx + 14, fy + 4], [fx + 4, fy + 14], [fx - 12, fy + 8]], "#9b94b8", { lw: 2.4 });
    G.cracks(g, { x0: fx - 10, y0: fy - 8, w: 22, h: 20 }, 2, "rgba(25,15,45,.4)", 3);
    if (c > 0.4) glow(g, fx, fy, 26, P.power, 0.5 * lift);
  };

  /* ---------------- Spectre voilé ---------------- */
  B.spectre = function (g, t, o) {
    var c = o.cast || 0, fl = bob(t, 3, 2) - 12, wv = Math.sin(t * 3);
    g.globalAlpha *= 0.94;
    shadow(g, 0, 0, 14, 0.18);
    glow(g, 0, -42 + fl, 44, "#8a63c9", 0.35 + c * 0.35);
    // lambeaux de cape en bas (effet de fumée)
    var tail = [[-14, -24 + fl], [-22 + wv * 2, -10 + fl], [-12, 2 + fl + wv], [-4, -6 + fl], [2, 6 + fl + Math.sin(t * 3 + 2) * 2], [10, -4 + fl], [20 + wv * 2, -10 + fl], [14, -26 + fl]];
    body(g, [[-12, -58 + fl]].concat(tail.slice(0, 1)).concat(tail.slice(1)).concat([[12, -58 + fl]]), "#35266a", { lw: 1.6, shadow: 0.05, lo: -0.1, paint: function (gg, bb) { var gr = gg.createLinearGradient(0, bb.y0, 0, bb.y1); gr.addColorStop(0, "rgba(160,120,255,0)"); gr.addColorStop(1, "rgba(20,10,50,0.55)"); gg.fillStyle = gr; gg.fillRect(bb.x0, bb.y0, bb.w, bb.h); } });
    // épaules et capuche
    body(g, [[-8, -52 + fl], [-12, -66 + fl], [0, -76 + fl], [12, -66 + fl], [8, -52 + fl], [0, -48 + fl]], "#4a3590", { lw: 1.8 });
    // masque d'os
    body(g, [[-6, -62 + fl], [0, -68 + fl], [6, -62 + fl], [5, -52 + fl], [0, -48 + fl], [-5, -52 + fl]], "#e6dccb", { lw: 1.4, shine: 0.35, lo: -0.22 });
    eye(g, -2.6, -58 + fl, 1.6, 2.4, "#c77dff", { rot: 0.15 }); eye(g, 2.6, -58 + fl, 1.6, 2.4, "#c77dff", { rot: -0.15 });
    g.strokeStyle = rgba(P.ink, 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(-2, -52 + fl); g.quadraticCurveTo(0, -50 + fl, 2, -52 + fl); g.stroke();
    // mains-spectres
    [-1, 1].forEach(function (sd) {
      var hx = sd * 17 + sd * c * 8, hy = -36 + fl + Math.sin(t * 2.4 + sd) * 3 - c * 10;
      limb(g, [sd * 8, -46 + fl], [sd * 14, -42 + fl], [hx, hy], 6, 3, "#4a3590");
      for (var f = 0; f < 3; f++) G.limb(g, [hx, hy], [hx + sd * 4, hy + 2 + f], [hx + sd * (7 + f), hy + 5 + f * 2], 2, 0.6, "#c9b4ff", { lw: 0 });
    });
    // éclats de cape en orbite
    for (var i = 0; i < 4; i++) { var a = t * 1.1 + i * TAU / 4, ox = Math.cos(a) * 24, oy = -36 + fl + Math.sin(a) * 9; G.poly(g, [[ox, oy - 5], [ox + 3, oy], [ox, oy + 4], [ox - 3, oy]], "#8a63c9", "#d9c7ff", 0.7); }
    G.motes(g, t, 5, 12, 40, -6 + fl, "#c77dff", 1.6);
    g.globalAlpha /= 0.94;
  };

  /* ---------------- Tisseur de brume ---------------- */
  B.tisseur = function (g, t, o) {
    var c = o.cast || 0, by = bob(t, 1.5, 2), w = o.walk != null ? Math.sin(o.walk * TAU) : 0, col = "#2f7f78";
    shadow(g, 0, 0, 20, 0.3);
    // fils au sol (toile fantôme)
    g.strokeStyle = rgba(P.teal, 0.35); g.lineWidth = 1; for (var k = 0; k < 6; k++) { var a = k * TAU / 6 + 0.3; g.beginPath(); g.ellipse(0, 0, 10 + k * 3, (10 + k * 3) * 0.4, 0, a, a + 1.2); g.stroke(); }
    // six longs membres articulés
    [[-1, 0], [-1, 1], [-1, 2], [1, 0], [1, 1], [1, 2]].forEach(function (L, i) {
      var sd = L[0], j = L[1], sw = Math.sin(t * 2 + i) * 2 + (j % 2 ? w : -w) * 3;
      var sx = sd * 4, sy = -44 + by + j * 5, kx = sd * (22 + j * 4), ky = -58 + by - j * 2 + sw, ex = sd * (30 + j * 5 + Math.abs(sw)), ey = -2;
      limb(g, [sx, sy], [kx, ky], [ex, ey], 4, 1.2, col, { lw: 1.2 });
      disc(g, ex, ey - 1, 1.5, rgba(P.cyan, 0.9));
    });
    // abdomen en bulbe
    body(g, [[-9, -34 + by], [0, -42 + by], [11, -36 + by], [13, -24 + by], [4, -16 + by], [-8, -20 + by]], "#3f9a8d", { lw: 2, paint: function (gg, bb) { gg.strokeStyle = rgba(P.cyan, 0.5); gg.lineWidth = 1; for (var q = 0; q < 4; q++) { gg.beginPath(); gg.moveTo(bb.x0, bb.y0 + 5 + q * 5); gg.quadraticCurveTo(bb.x0 + bb.w / 2, bb.y0 + 9 + q * 5, bb.x1, bb.y0 + 5 + q * 5); gg.stroke(); } } });
    // torse + tête
    body(g, [[-6, -52 + by], [0, -58 + by], [7, -52 + by], [6, -40 + by], [-5, -40 + by]], "#58b3a6", { lw: 1.8 });
    body(g, [[-5, -64 + by], [0, -70 + by], [6, -64 + by], [5, -57 + by], [-4, -57 + by]], "#79d1c0", { lw: 1.6, shine: 0.35 });
    [[-2.2, -64], [2.2, -64], [-1, -61], [1, -61]].forEach(function (e, i) { eye(g, e[0], e[1] + by, i < 2 ? 1.5 : 1, i < 2 ? 1.5 : 1, P.rose); });
    // couronne de filaments
    for (var f = 0; f < 5; f++) { var fa = -0.9 + f * 0.45; G.limb(g, [0, -69 + by], [Math.sin(fa) * 10, -78 + by], [Math.sin(fa) * 14 + Math.sin(t * 2 + f) * 2, -84 + by - Math.cos(fa) * 4], 1.4, 0.4, P.cyan, { lw: 0 }); }
    // anneau de fil tissé entre les bras quand il lance
    if (c > 0) { g.save(); g.translate(20, -48 + by); g.rotate(t * 4); glow(g, 0, 0, 22, P.control, 0.5 * c); g.strokeStyle = rgba(P.cyan, 0.9); g.lineWidth = 1.2; for (var r = 4; r <= 12; r += 4) { g.beginPath(); g.arc(0, 0, r * (0.5 + c * 0.6), 0, TAU); g.stroke(); } for (var sp = 0; sp < 8; sp++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(sp * TAU / 8) * 12 * c, Math.sin(sp * TAU / 8) * 12 * c); g.stroke(); } g.restore(); }
  };

  /* ---------------- Siphonneur runique ---------------- */
  B.siphonneur = function (g, t, o) {
    var c = o.cast || 0, fl = bob(t, 3, 1.8) - 10;
    shadow(g, 0, 0, 15, 0.2);
    glow(g, 0, -40 + fl, 46, "#9b4ee0", 0.34 + c * 0.3);
    // tentacules-entonnoirs sous la robe
    for (var i = 0; i < 4; i++) { var a = -0.9 + i * 0.6, sw = Math.sin(t * 2.3 + i * 1.3) * 4; limb(g, [Math.sin(a) * 4, -28 + fl], [Math.sin(a) * 12 + sw, -14 + fl], [Math.sin(a) * 16 + sw * 1.5, 0 + fl * 0.3], 6, 1.5, "#3a2160", { lw: 1.2 }); disc(g, Math.sin(a) * 16 + sw * 1.5, 1 + fl * 0.3, 2, rgba("#d9a3ff", 0.6)); }
    // robe
    body(g, [[-12, -34 + fl], [-8, -56 + fl], [0, -62 + fl], [8, -56 + fl], [12, -34 + fl], [8, -22 + fl], [-8, -22 + fl]], "#4a2a78", { lw: 2, paint: function (gg, bb) { gg.strokeStyle = rgba("#d9a3ff", 0.55); gg.lineWidth = 1; gg.beginPath(); gg.moveTo(bb.x0 + 3, bb.y0 + 8); gg.lineTo(bb.x1 - 3, bb.y0 + 8); gg.moveTo(bb.x0 + 2, bb.y0 + 14); gg.lineTo(bb.x1 - 2, bb.y0 + 14); gg.stroke(); } });
    // grand œil-vortex dans la poitrine
    var pulse = 0.7 + Math.sin(t * 3) * 0.3;
    disc(g, 0, -42 + fl, 9, "#120a22"); glow(g, 0, -42 + fl, 14, "#c77dff", 0.5 * pulse);
    g.save(); g.translate(0, -42 + fl); g.rotate(t * 2.2); g.strokeStyle = "#e0b8ff"; g.lineWidth = 1.4; g.beginPath(); for (var s = 0; s < 40; s++) { var r = s * 0.2, aa = s * 0.45; g.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } g.stroke(); g.restore();
    disc(g, 0, -42 + fl, 2.2, "#fff");
    // capuche
    body(g, [[-8, -60 + fl], [-5, -72 + fl], [3, -76 + fl], [10, -68 + fl], [9, -58 + fl], [0, -54 + fl]], "#5b3590", { lw: 1.8 });
    g.fillStyle = "#07040f"; g.beginPath(); g.ellipse(2, -62 + fl, 5.5, 6.5, 0, 0, TAU); g.fill();
    eye(g, 0, -63 + fl, 1.4, 1.8, "#e0b8ff"); eye(g, 4.6, -63 + fl, 1.4, 1.8, "#e0b8ff");
    // runes en orbite
    for (var k = 0; k < 5; k++) { var ra = t * 1.2 + k * TAU / 5, rx = Math.cos(ra) * 24, ry = -40 + fl + Math.sin(ra) * 10; g.fillStyle = rgba("#e0b8ff", 0.85); g.font = "700 9px serif"; g.textAlign = "center"; g.fillText(["ᚠ", "ᚱ", "ᛟ", "ᛉ", "ᚦ"][k], rx, ry + 3); }
    // absorption : particules qui filent vers le cœur
    for (var m = 0; m < 8; m++) { var f = (t * 0.7 + m / 8) % 1, ma = m * TAU / 8 + 0.4, px = Math.cos(ma) * 34 * (1 - f), py = -42 + fl + Math.sin(ma) * 16 * (1 - f); disc(g, px, py, 1.7 * (1 - f * 0.4), rgba("#d9a3ff", 0.35 + 0.6 * f)); }
  };

  /* ---------------- Araignées ---------------- */
  function spider(g, t, o, S, pal) {
    var c = o.cast || 0, w = o.walk != null ? o.walk : 0, wk = o.walk != null ? 1 : 0.35, by = bob(t, 0.9 * S, 3);
    shadow(g, 0, 0, 24 * S, 0.34);
    // pattes (4 par côté, deux segments)
    for (var side = 0; side < 2; side++) {
      for (var i = 0; i < 4; i++) {
        var ph = Math.sin((o.walk != null ? w * TAU : t * 2) + i * 1.6 + side * Math.PI) * wk;
        var sx = (side ? 5 : -2) + i * 4 - 4, sx0 = sx * S, bx = ((side ? 30 : -26) + i * 10 - 10) * S, tipX = ((side ? 38 : -34) + i * 14 - 14 + ph * 6) * S, tipY = ph > 0.3 ? -3 * S : 0;
        var kneeY = (-46 - (i % 2) * 6 + ph * -4) * S;
        limb(g, [sx0, (-24 + by) * S], [bx * 0.65, kneeY], [tipX, tipY], 5 * S, 1.6 * S, pal.leg, { lw: 1.3 });
        disc(g, bx * 0.65, kneeY, 1.8 * S, shade(pal.leg, 0.3));
        if (side === 0) { /* pattes lointaines plus sombres */ }
      }
    }
    // abdomen (arrière)
    body(g, [[-30 * S, -26 * S + by], [-26 * S, -44 * S + by], [-12 * S, -50 * S + by], [-2 * S, -40 * S + by], [-2 * S, -24 * S + by], [-14 * S, -16 * S + by]], pal.abd, { lw: 2.2, paint: function (gg, bb) {
      gg.fillStyle = rgba(pal.mark, 0.95); gg.beginPath(); gg.moveTo(bb.x0 + bb.w * 0.5, bb.y0 + bb.h * 0.22); gg.lineTo(bb.x0 + bb.w * 0.66, bb.y0 + bb.h * 0.5); gg.lineTo(bb.x0 + bb.w * 0.5, bb.y0 + bb.h * 0.78); gg.lineTo(bb.x0 + bb.w * 0.34, bb.y0 + bb.h * 0.5); gg.closePath(); gg.fill();
      for (var d = 0; d < 6; d++) { gg.fillStyle = rgba(pal.mark, 0.8); gg.beginPath(); gg.arc(bb.x0 + bb.w * (0.2 + (d % 3) * 0.3), bb.y0 + bb.h * (d < 3 ? 0.18 : 0.84), 1.4 * S, 0, TAU); gg.fill(); }
    } });
    glow(g, -14 * S, -34 * S + by, 18 * S, pal.mark, 0.22 + Math.sin(t * 3) * 0.08);
    // céphalothorax + tête
    body(g, [[-4 * S, -26 * S + by], [-2 * S, -40 * S + by], [10 * S, -42 * S + by], [18 * S, -32 * S + by], [14 * S, -22 * S + by], [2 * S, -20 * S + by]], pal.cep, { lw: 2.2 });
    // yeux rouges
    [[14, -36], [17, -33], [11, -39], [18, -37], [13, -31], [9, -35]].forEach(function (e, i) { eye(g, e[0] * S, e[1] * S + by, (i < 2 ? 1.9 : 1.2) * S, (i < 2 ? 1.9 : 1.2) * S, pal.eye); });
    // crochets (s'ouvrent à l'attaque)
    var open = c * 5 * S;
    limb(g, [17 * S, -26 * S + by], [22 * S + open, -22 * S + by], [20 * S + open, -14 * S + by], 3.6 * S, 0.8 * S, "#e8dcc8", { lw: 1 });
    limb(g, [12 * S, -25 * S + by], [16 * S, -20 * S + by], [13 * S, -13 * S + by + open * 0.4], 3.4 * S, 0.8 * S, "#d9ccb4", { lw: 1 });
    if (c > 0.3) { g.fillStyle = rgba("#7dff6a", 0.9 * c); g.beginPath(); g.arc(20 * S + open, -12 * S + by, 1.8 * S, 0, TAU); g.fill(); }
  }
  B.araignee = function (g, t, o) { spider(g, t, o, 1, { leg: "#2c2040", abd: "#2a1f3d", cep: "#352848", mark: "#e0405a", eye: "#ff4a5e" }); };
  B.araignelet = function (g, t, o) { spider(g, t, o, 0.5, { leg: "#4a2a55", abd: "#3a2447", cep: "#4a2f5a", mark: "#ff6f8e", eye: "#ff4a5e" }); };
  B.reinetisse = function (g, t, o) {
    spider(g, t, o, 1.25, { leg: "#251a38", abd: "#241a33", cep: "#33264a", mark: "#ff4a6a", eye: "#ff4a5e" });
    // couronne d'épines de soie
    for (var i = 0; i < 5; i++) { var cx = 6 + i * 3.4 - 6, ch = 10 + (i % 2 ? 0 : 5); poly(g, [[cx * 1.25, -52 + Math.sin(t * 2 + i) * 1], [(cx + 1.6) * 1.25, (-52 - ch) * 1], [(cx + 3.2) * 1.25, -52]], P.gold, P.goldDark, 1); }
    glow(g, 14, -58, 20, P.crimsonLight, 0.3);
  };

  /* ---------------- Chat Masqué ---------------- */
  B.chatmasque = function (g, t, o) {
    var c = o.cast || 0, w = o.walk != null ? Math.sin(o.walk * TAU) : 0, by = bob(t, 0.9, 2.6), stretch = 1 + Math.sin(c * Math.PI) * 0.18, cream = "#f0e9dd", seal = "#4a4955", warm = "#c9c1b3";
    shadow(g, 0, 0, 22, 0.3);
    // queue en S
    var tw = Math.sin(t * 2.4) * 5;
    limb(g, [-20, -24 + by], [-36 + tw, -26], [-34 + tw * 1.3, -50 + Math.sin(t * 2) * 3], 7, 3, seal, { lw: 1.4 });
    // pattes arrière / avant
    limb(g, [-12, -20 + by], [-14 + w * 6, -10], [-17 + w * 8, 0], 8, 5, mix(cream, seal, 0.55), { lw: 1.4 });
    limb(g, [-6, -20 + by], [-4 - w * 6, -10], [-2 - w * 8, 0], 7, 4.5, mix(cream, seal, 0.7), { lw: 1.4 });
    // corps élancé
    body(g, [[-24 * stretch, -24 + by], [-14, -34 + by], [2, -34 + by], [14 * stretch, -30 + by], [20 * stretch, -22 + by], [10, -13 + by], [-8, -12 + by], [-22, -16 + by]], cream, { lw: 2, shine: 0.3, paint: function (gg, bb) { gg.fillStyle = rgba(seal, 0.3); gg.fillRect(bb.x0, bb.y0, bb.w, bb.h * 0.28); } });
    limb(g, [10, -18 + by], [14 + w * 5, -9], [17 + w * 8, 0], 7, 4.5, seal, { lw: 1.4 });
    limb(g, [16, -20 + by], [20 - w * 5, -9], [22 - w * 8, 0], 6.5, 4, seal, { lw: 1.4 });
    // écharpe cramoisie
    body(g, [[10, -36 + by], [20, -34 + by], [22, -28 + by], [12, -26 + by]], P.crimson, { lw: 1.4 });
    limb(g, [12, -28 + by], [4, -20 + Math.sin(t * 4) * 2, ], [-4, -12 + Math.sin(t * 4 + 1) * 3], 5, 2, P.crimsonLight, { lw: 1 });
    // tête
    var hx = 24 * stretch, hy = -36 + by;
    poly(g, [[hx - 6, hy - 10], [hx - 3, hy - 22], [hx + 3, hy - 10]], seal, P.ink, 1.4);
    poly(g, [[hx + 1, hy - 10], [hx + 6, hy - 21], [hx + 10, hy - 8]], seal, P.ink, 1.4);
    body(g, [[hx - 8, hy - 8], [hx - 2, hy - 12], [hx + 8, hy - 9], [hx + 13, hy - 2], [hx + 10, hy + 5], [hx, hy + 7], [hx - 7, hy + 3]], cream, { lw: 1.8, shine: 0.3 });
    // museau sombre (point siamois)
    body(g, [[hx + 5, hy - 1], [hx + 13, hy - 2], [hx + 14, hy + 3], [hx + 8, hy + 6], [hx + 3, hy + 3]], seal, { lw: 1, shine: 0.1 });
    // demi-masque blanc aux motifs rouges
    body(g, [[hx - 8, hy - 8], [hx - 1, hy - 12], [hx + 9, hy - 9], [hx + 10, hy - 3], [hx + 3, hy - 2], [hx - 3, hy + 1], [hx - 8, hy - 1]], "#f7f3ec", { lw: 1.6, shine: 0.4, paint: function (gg, bb) { gg.strokeStyle = P.crimson; gg.lineWidth = 1.2; gg.beginPath(); gg.moveTo(bb.x0 + 2, bb.y0 + 3); gg.quadraticCurveTo(bb.x0 + 6, bb.y1 - 1, bb.x1 - 4, bb.y0 + 2); gg.moveTo(bb.x0 + 7, bb.y0 + 1); gg.lineTo(bb.x0 + 9, bb.y0 + 6); gg.stroke(); } });
    eye(g, hx + 1, hy - 5, 2.6, 1.5, "#ff2e45", { rot: -0.25, pupil: true }); eye(g, hx + 8, hy - 5, 2.2, 1.4, "#ff2e45", { rot: -0.25, pupil: true });
    // moustaches
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 0.7; for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hx + 12, hy + 1 + i); g.lineTo(hx + 24, hy - 1 + i * 3); g.stroke(); }
    // anneau d'or à l'oreille
    g.strokeStyle = P.gold; g.lineWidth = 1.2; g.beginPath(); g.arc(hx - 4, hy - 8, 2, 0, TAU); g.stroke();
    // traînée d'ombre pendant l'action
    if (c > 0.1) { glow(g, -10, -22, 30, "#ff2e45", 0.28 * Math.sin(c * Math.PI)); }
  };

  /* ====================== EXTRAS : ÉLITES ====================== */
  // Un élite se reconnaît de loin : anneau doré au sol, couronne de runes, halo chaud
  function eliteMark(g, t, o) {
    g.save();
    g.strokeStyle = rgba(P.gold, 0.85); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 28, 11, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgba(P.gold, 0.45); g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, 33, 13, 0, 0, TAU); g.stroke();
    for (var i = 0; i < 6; i++) { var a = t * 0.8 + i * TAU / 6; G.sparkle(g, Math.cos(a) * 30, Math.sin(a) * 12, 2.6, i % 2 ? P.gold : "#fff"); }
    g.restore();
  }
  function eliteCrown(g, t, y) {
    g.save(); g.translate(0, y + Math.sin(t * 2) * 1.5);
    glow(g, 0, 0, 16, P.gold, 0.5);
    G.poly(g, [[-8, 2], [-8, -6], [-4, -2], [0, -9], [4, -2], [8, -6], [8, 2]], P.gold, P.goldDark, 1.2);
    G.disc(g, 0, -1, 1.6, P.crimsonLight);
    g.restore();
  }

  root.AT_BEASTS = { draw: B, eliteMark: eliteMark, eliteCrown: eliteCrown, HEIGHT: { traqueur: 84, colosse: 94, spectre: 78, tisseur: 86, siphonneur: 78, araignee: 52, araignelet: 28, reinetisse: 80, chatmasque: 58 } };
})(typeof window !== "undefined" ? window : globalThis);
