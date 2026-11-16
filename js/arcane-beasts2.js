/* =========================================================================
   Arcane Tactics 3.0 — anciens monstres redessinés dans la nouvelle DA (AT_GFX).
   Même repères que arcane-beasts.js : pieds en (0,0), regard vers la droite, signature (g, t, o).
   Les boss sont agrandis par ART.mob (×1.8).
   ========================================================================= */
(function (root) {
  "use strict";
  var G = root.AT_GFX, B = root.AT_BEASTS; if (!G || !B) return;
  var P = G.PAL, TAU = G.TAU, body = G.body, limb = G.limb, disc = G.disc, ell = G.ell, glow = G.glow, eye = G.eye, poly = G.poly, shade = G.shade, rgba = G.rgba, shadow = G.shadow, mix = G.mix;
  var D = B.draw;
  function bob(t, a, s) { return Math.sin(t * (s || 2)) * a; }
  function wk(o) { return o.walk != null ? Math.sin(o.walk * TAU) : 0; }

  // Glorbe : goutte translucide avec noyau lumineux
  D.glorbe = function (g, t, o) {
    var c = o.col || "#5fd3c0", w = Math.sin(t * 3.5) * 2, k = o.cast || 0;
    shadow(g, 0, 0, 15);
    body(g, [[-16 - w, 0], [-17, -14 + w], [-11, -26 - w], [0, -31 - w], [11, -26 - w], [17, -14 + w], [16 + w, 0], [0, 3]], c, { lw: 1.8, shine: 0.45, paint: function (gg, bb) { gg.fillStyle = "rgba(255,255,255,.18)"; gg.fillRect(bb.x0, bb.y0, bb.w, bb.h * 0.3); } });
    glow(g, 2, -12, 16, "#fff", 0.35); disc(g, 2, -12, 5 + k * 2, shade(c, 0.55));
    for (var i = 0; i < 3; i++) disc(g, -8 + i * 8 + Math.sin(t * 2 + i) * 2, -6 - ((t * 10 + i * 9) % 14), 1.4, "rgba(255,255,255,.7)");
    eye(g, 4, -18, 2.3, 2.6, "#1b1530"); eye(g, 11, -17, 2, 2.3, "#1b1530");
    g.strokeStyle = "#1b1530"; g.lineWidth = 1.3; g.beginPath(); g.arc(7, -11, 3, 0.2, 2.9); g.stroke();
  };
  // Scarabrume : scarabée à carapace nacrée
  D.scarabrume = function (g, t, o) {
    var c = o.col || "#7a8cf0", w = wk(o);
    shadow(g, 0, 0, 17);
    for (var i = -1; i <= 1; i++) { var s = Math.sin(t * 10 + i * 2) * 2 * (o.walk != null ? 1.5 : 0.6); limb(g, [i * 6, -9], [i * 9 - 5, -3 + s], [i * 12 - 7, 0], 2.4, 1.2, "#1f2347", { lw: 1 }); limb(g, [i * 6, -9], [i * 9 + 5, -3 - s], [i * 12 + 7, 0], 2.4, 1.2, "#1f2347", { lw: 1 }); }
    body(g, [[-16, -8], [-13, -19], [-2, -23], [11, -19], [15, -8], [8, -3], [-9, -3]], c, { lw: 1.9, shine: 0.45, paint: function (gg, bb) { gg.strokeStyle = rgba("#fff", 0.35); gg.lineWidth = 1.2; gg.beginPath(); gg.moveTo(bb.x0 + bb.w * 0.45, bb.y0 + 1); gg.lineTo(bb.x0 + bb.w * 0.45, bb.y1); gg.stroke(); } });
    body(g, [[10, -17], [19, -15], [21, -8], [13, -6]], shade(c, -0.35), { lw: 1.6 });
    eye(g, 17, -12, 1.7, 1.7, "#ff4a5e");
    limb(g, [19, -16], [24, -22], [22, -27], 2, 1, "#1f2347", { lw: 1 }); limb(g, [16, -17], [18, -25], [14, -29], 2, 1, "#1f2347", { lw: 1 });
    glow(g, -2, -16, 20, c, 0.2);
  };
  // Ronceau : buisson épineux avec visage
  D.ronceau = function (g, t, o) {
    var w = Math.sin(t * 2) * 1.5, k = o.cast || 0;
    shadow(g, 0, 0, 18);
    body(g, [[-18, 0], [-20, -14], [-12, -26], [0, -30 + w], [13, -26], [20, -13], [17, 0]], "#4f8f3f", { lw: 1.9, shine: 0.3 });
    body(g, [[-9, -4], [-12, -17], [-3, -26], [8, -23], [13, -12], [8, -3]], "#7fb257", { lw: 0, shine: 0.3 });
    for (var i = 0; i < 7; i++) { var a = -2.6 + i * 0.7, x = Math.cos(a) * 20, y = -14 + Math.sin(a) * 17; poly(g, [[x - 2, y], [x + Math.cos(a) * 8, y + Math.sin(a) * 8 + w * 0.3], [x + 2, y]], "#e8dcc0", "#2a2219", 1); }
    disc(g, -6, -26 + w, 3, "#e0526a"); disc(g, 9, -23, 2.4, "#e0526a");
    body(g, [[-1, -18], [11, -18], [11, -8], [-1, -8]], "#2a3a1f", { lw: 1.2 });
    eye(g, 3, -14, 1.8, 1.8, "#ffd257"); eye(g, 8, -14, 1.8, 1.8, "#ffd257");
    limb(g, [14, -10], [22 + k * 6, -14], [26 + k * 8, -8 - k * 6], 3, 1.5, "#4f8f3f", { lw: 1.2 });
  };
  // Lanterneau : lanterne vivante qui flotte
  D.lanterneau = function (g, t, o) {
    var fl = bob(t, 3, 2) - 14, k = o.cast || 0, p = 0.7 + Math.sin(t * 5) * 0.3;
    shadow(g, 0, 0, 12, 0.2);
    glow(g, 0, -26 + fl, 34 + k * 10, "#ffb347", 0.45 * p);
    limb(g, [0, -48 + fl], [-5, -56 + fl], [0, -60 + fl], 2, 2, "#5a3a22", { lw: 1.2 });
    body(g, [[-10, -44 + fl], [10, -44 + fl], [14, -24 + fl], [8, -10 + fl], [-8, -10 + fl], [-14, -24 + fl]], "#ffcf6a", { lw: 2, shine: 0.45 });
    body(g, [[-12, -46 + fl], [12, -46 + fl], [10, -42 + fl], [-10, -42 + fl]], "#5a3a22", { lw: 1.4 }); body(g, [[-9, -12 + fl], [9, -12 + fl], [7, -7 + fl], [-7, -7 + fl]], "#5a3a22", { lw: 1.4 });
    glow(g, 0, -26 + fl, 12, "#fff7c9", 0.9); disc(g, 0, -26 + fl, 5, "#fff7c9");
    eye(g, -3, -30 + fl, 1.8, 2.2, "#3a1a08"); eye(g, 5, -30 + fl, 1.8, 2.2, "#3a1a08");
    for (var i = 0; i < 3; i++) limb(g, [-4 + i * 4, -8 + fl], [-5 + i * 4 + Math.sin(t * 3 + i), -3 + fl], [-4 + i * 4, 1 + fl * 0.3], 2, 0.8, "#ffb347", { lw: 0 });
  };
  // Sylphe fêlée : esprit ailé fissuré
  D.sylphe = function (g, t, o) {
    var c = o.col || "#c7a6ff", fl = bob(t, 3, 2.4) - 16, f = Math.sin(t * 9), k = o.cast || 0;
    glow(g, 0, -34 + fl, 38, c, 0.3 + k * 0.3); shadow(g, 0, 0, 11, 0.18);
    [[-1, 1], [1, 1]].forEach(function (S) { var sd = S[0]; body(g, [[sd * 3, -38 + fl], [sd * (16 + f * 3), -56 + fl], [sd * 26, -44 + fl - f * 2], [sd * 12, -32 + fl]], rgba("#fff", 0.55), { lw: 1.2, shadow: 0, shine: 0.4 }); body(g, [[sd * 3, -34 + fl], [sd * 22, -34 + fl], [sd * 12, -22 + fl]], rgba(c, 0.5), { lw: 1, shadow: 0 }); });
    body(g, [[-6, -40 + fl], [6, -40 + fl], [8, -22 + fl], [0, -10 + fl], [-8, -22 + fl]], shade(c, -0.1), { lw: 1.8, shine: 0.35 });
    body(g, [[-6, -52 + fl], [0, -58 + fl], [6, -52 + fl], [5, -42 + fl], [-5, -42 + fl]], "#efe6ff", { lw: 1.6, shine: 0.35 });
    eye(g, -2, -48 + fl, 1.5, 1.8, "#5a2fc9"); eye(g, 3, -48 + fl, 1.5, 1.8, "#5a2fc9");
    g.strokeStyle = "#2a1450"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1, -57 + fl); g.lineTo(2, -50 + fl); g.lineTo(0, -45 + fl); g.stroke();
    G.motes && G.motes(g, t, 5, 12, 34, -26 + fl, c, 1.5);
  };
  // Golem de rune : bloc de pierre gravé
  D.golem = function (g, t, o) {
    var c = o.col || "#a99a86", k = o.cast || 0, w = wk(o), br = bob(t, 0.8, 1.6);
    shadow(g, 0, 0, 22, 0.35);
    body(g, [[-14, -22], [-4, -22], [-4, -2], [-16, 0], [-16, -8]], shade(c, -0.15), { lw: 1.8 }); body(g, [[3, -22], [14, -22], [16, -8], [16, 0], [4, -2]], c, { lw: 1.8 });
    limb(g, [-16, -42 + br], [-24, -30], [-22 + w * 2, -14], 10, 9, shade(c, -0.2), { lw: 1.6 });
    body(g, [[-17, -46 + br], [-8, -54 + br], [10, -54 + br], [18, -44 + br], [16, -24], [-16, -24]], c, { lw: 2, shine: 0.3, paint: function (gg, bb) { G.cracks && G.cracks(gg, bb, 4, "rgba(30,20,10,.35)", 4); } });
    g.strokeStyle = "#7ff6ff"; g.lineWidth = 1.8; g.globalAlpha = 0.75 + Math.sin(t * 3) * 0.2; g.beginPath(); g.moveTo(0, -46 + br); g.lineTo(5, -40 + br); g.lineTo(-1, -35 + br); g.lineTo(5, -29 + br); g.stroke(); g.globalAlpha = 1; glow(g, 2, -38 + br, 14, "#7ff6ff", 0.25);
    body(g, [[-7, -62 + br], [8, -62 + br], [10, -52 + br], [-8, -52 + br]], shade(c, 0.05), { lw: 1.8 }); g.fillStyle = "#14101c"; g.fillRect(-4, -60 + br, 12, 3.4);
    eye(g, -1, -58.3 + br, 1.4, 1, "#7ff6ff"); eye(g, 6, -58.3 + br, 1.4, 1, "#7ff6ff");
    var fx = 20 + k * 6, fy = -20 - Math.sin(k * Math.PI) * 24;
    limb(g, [16, -44 + br], [26, -34], [fx, fy], 10, 9, c, { lw: 1.6 }); body(g, [[fx - 7, fy - 6], [fx + 7, fy - 7], [fx + 9, fy + 6], [fx - 6, fy + 8]], shade(c, 0.1), { lw: 2 });
  };
  // Cristallin : amas de cristaux flottants
  D.cristallin = function (g, t, o) {
    var c = o.col || "#8fe6ff", fl = bob(t, 3, 2) - 10, k = o.cast || 0;
    shadow(g, 0, 0, 14, 0.22); glow(g, 0, -30 + fl, 40 + k * 10, c, 0.35);
    [[-14, -22, 0.8, -0.3], [14, -26, 0.9, 0.35], [0, -40, 1.25, 0], [-8, -12, 0.7, 0.15], [9, -14, 0.65, -0.2]].forEach(function (s, i) {
      g.save(); g.translate(s[0], s[1] + fl + Math.sin(t * 2 + i) * 1.5); g.rotate(s[3] + Math.sin(t + i) * 0.05); var z = s[2];
      body(g, [[-6 * z, 8 * z], [-9 * z, -8 * z], [0, -20 * z], [9 * z, -8 * z], [6 * z, 8 * z]], shade(c, i % 2 ? -0.1 : 0.1), { lw: 1.7, shine: 0.5 }); poly(g, [[0, -20 * z], [9 * z, -8 * z], [0, 0]], rgba("#fff", 0.5)); g.restore();
    });
    eye(g, -3, -38 + fl, 1.6, 2, "#10324a"); eye(g, 3, -38 + fl, 1.6, 2, "#10324a");
    G.motes && G.motes(g, t, 5, 16, 36, -28 + fl, "#fff", 1.4);
  };
  // Bonbonk : bonbon sur pattes, papier froissé
  D.bonbonk = function (g, t, o) {
    var c = o.col || "#ff7bb0", w = wk(o), k = o.cast || 0, br = bob(t, 1, 3);
    shadow(g, 0, 0, 15);
    limb(g, [-5, -14], [-6 + w * 3, -7], [-7 + w * 5, 0], 4, 3, "#c0345f", { lw: 1.2 }); limb(g, [5, -14], [6 - w * 3, -7], [7 - w * 5, 0], 4, 3, "#c0345f", { lw: 1.2 });
    poly(g, [[-14, -30 + br], [-26, -36 + br], [-25, -22 + br]], "#fff", "#c0345f", 1.4); poly(g, [[14, -30 + br], [26, -36 + br], [25, -22 + br]], "#fff", "#c0345f", 1.4);
    body(g, [[-14, -24 + br], [-10, -38 + br], [0, -42 + br], [10, -38 + br], [14, -24 + br], [8, -12 + br], [-8, -12 + br]], c, { lw: 1.9, shine: 0.45, paint: function (gg, bb) { gg.strokeStyle = "rgba(255,255,255,.7)"; gg.lineWidth = 3; for (var i = -1; i < 4; i++) { gg.beginPath(); gg.moveTo(bb.x0 + i * 8, bb.y1); gg.lineTo(bb.x0 + i * 8 + 12, bb.y0); gg.stroke(); } } });
    eye(g, -1, -28 + br, 2, 2.4, "#4a102a"); eye(g, 7, -28 + br, 2, 2.4, "#4a102a");
    body(g, [[-1, -21 + br], [9, -21 + br], [7, -15 + br - k * 3], [1, -15 + br - k * 3]], "#4a102a", { lw: 1 }); g.fillStyle = "#fff"; g.fillRect(1, -21 + br, 2, 2.4); g.fillRect(5, -21 + br, 2, 2.4);
  };
  // Grenouillon : grenouille ventrue
  D.grenouillon = function (g, t, o) {
    var c = o.col || "#6fd36a", br = bob(t, 1.3, 2.6), k = o.cast || 0, w = Math.abs(wk(o)) * 4;
    shadow(g, 0, 0, 17);
    body(g, [[-18, -4 - w], [-10, -12 - w], [-4, -4], [-8, 0]], shade(c, -0.2), { lw: 1.5 }); body(g, [[8, -4], [14, -12 - w], [22, -4 - w], [14, 0]], shade(c, -0.1), { lw: 1.5 });
    body(g, [[-16, -10], [-12, -26 + br], [0, -31 + br], [12, -26 + br], [17, -12], [9, -3], [-9, -3]], c, { lw: 1.9, shine: 0.4, paint: function (gg, bb) { gg.fillStyle = "rgba(255,255,255,.22)"; gg.beginPath(); gg.ellipse(bb.x0 + bb.w * 0.5, bb.y1 - 5, bb.w * 0.32, 5, 0, 0, TAU); gg.fill(); gg.fillStyle = "rgba(20,70,30,.3)"; for (var i = 0; i < 4; i++) { gg.beginPath(); gg.arc(bb.x0 + 6 + i * 8, bb.y0 + 8 + (i % 2) * 5, 2, 0, TAU); gg.fill(); } } });
    [[-3, -34], [8, -34]].forEach(function (e) { disc(g, e[0], e[1] + br, 5.5, shade(c, 0.05)); disc(g, e[0], e[1] + br, 3.6, "#fff7c9"); eye(g, e[0] + 1, e[1] + br, 1.4, 2.4, "#1b1530"); });
    g.strokeStyle = "#1f5a28"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -17 + br); g.quadraticCurveTo(6, -12 + br + k * 4, 16, -17 + br); g.stroke();
    if (k > 0.2) limb(g, [14, -16], [26, -18], [26 + k * 14, -14], 3, 3, "#ff7b9c", { lw: 1 });
  };
  // Nuagelet : mouton-nuage
  D.nuagelet = function (g, t, o) {
    var br = bob(t, 1.6, 2), fl = -8 + br, k = o.cast || 0;
    shadow(g, 0, 0, 16, 0.18); glow(g, 0, -24 + fl, 38, "#cfe6ff", 0.3);
    [[-12, -22, 11], [0, -30, 13], [12, -23, 11], [-4, -16, 12], [8, -14, 10], [-14, -12, 8]].forEach(function (c, i) { disc(g, c[0], c[1] + fl + Math.sin(t * 2 + i) * 1, c[2], i % 2 ? "#ffffff" : "#eef3ff"); });
    g.strokeStyle = "#8aa0d0"; g.lineWidth = 1.2; [[-12, -22, 11], [0, -30, 13], [12, -23, 11]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1] + fl, c[2], 3.4, 5.9); g.stroke(); });
    body(g, [[10, -26 + fl], [22, -26 + fl], [24, -14 + fl], [12, -12 + fl]], "#6d6a8a", { lw: 1.6, shine: 0.2 });
    eye(g, 16, -20 + fl, 1.5, 2, "#fff7c9"); eye(g, 21, -20 + fl, 1.3, 1.8, "#fff7c9");
    poly(g, [[12, -26 + fl], [10, -34 + fl], [16, -27 + fl]], "#6d6a8a", "#2a2750", 1); poly(g, [[20, -27 + fl], [24, -34 + fl], [24, -26 + fl]], "#6d6a8a", "#2a2750", 1);
    if (k > 0.2) for (var i = 0; i < 4; i++) limb(g, [-10 + i * 7, -8 + fl], [-10 + i * 7, -2 + fl], [-10 + i * 7 + 1, 4 + fl], 1.8, 0.8, "#9fd8ff", { lw: 0 });
  };
  // Horlogeon : horloge de table à jambes
  D.horlogeon = function (g, t, o) {
    var c = o.col || "#d9a441", w = wk(o), k = o.cast || 0, br = bob(t, 1, 3);
    shadow(g, 0, 0, 16);
    limb(g, [-5, -12], [-6 + w * 3, -6], [-8 + w * 5, 0], 3.4, 2.6, "#5a3a22", { lw: 1.2 }); limb(g, [5, -12], [6 - w * 3, -6], [8 - w * 5, 0], 3.4, 2.6, "#5a3a22", { lw: 1.2 });
    disc(g, -10, -42 + br, 5, "#e8c870"); disc(g, 10, -42 + br, 5, "#e8c870"); disc(g, -10, -42 + br, 2, "#7a5a1a"); disc(g, 10, -42 + br, 2, "#7a5a1a");
    body(g, [[-15, -26 + br], [-12, -40 + br], [0, -46 + br], [12, -40 + br], [15, -26 + br], [11, -12 + br], [-11, -12 + br]], c, { lw: 2.1, shine: 0.4 });
    disc(g, 0, -28 + br, 10.5, "#fff3d0"); g.strokeStyle = "#5a3a22"; g.lineWidth = 1.2; g.beginPath(); g.arc(0, -28 + br, 10.5, 0, TAU); g.stroke();
    for (var i = 0; i < 12; i++) { var a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * 8.5, -28 + br + Math.sin(a) * 8.5); g.lineTo(Math.cos(a) * 10, -28 + br + Math.sin(a) * 10); g.stroke(); }
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, -28 + br); g.lineTo(Math.cos(t * 6) * 7, -28 + br + Math.sin(t * 6) * 7); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -28 + br); g.lineTo(Math.cos(t * 0.5) * 5, -28 + br + Math.sin(t * 0.5) * 5); g.stroke();
    eye(g, -3, -30 + br, 1.3, 1.7, "#a02030"); eye(g, 4, -30 + br, 1.3, 1.7, "#a02030");
    if (k > 0.2) glow(g, 0, -28 + br, 24, "#ffd257", 0.5 * k);
  };
  // Sentinelle d'Incarnam (boss) : statue de mousse et de pierre
  D.sentinelle = function (g, t, o) {
    var c = o.col || "#8fa37a", k = o.cast || 0, br = bob(t, 0.7, 1.5);
    shadow(g, 0, 0, 22, 0.35);
    body(g, [[-14, -26], [14, -26], [16, 0], [-16, 0]], shade(c, -0.25), { lw: 2 });
    body(g, [[-18, -50 + br], [-9, -58 + br], [9, -58 + br], [18, -50 + br], [15, -26], [-15, -26]], c, { lw: 2.2, shine: 0.3, paint: function (gg, bb) { G.cracks && G.cracks(gg, bb, 4, "rgba(20,30,15,.4)", 4); gg.fillStyle = "rgba(80,160,70,.5)"; for (var i = 0; i < 5; i++) { gg.beginPath(); gg.arc(bb.x0 + 4 + i * 7, bb.y0 + 2 + (i % 2) * 4, 4, 0, TAU); gg.fill(); } } });
    limb(g, [-16, -48 + br], [-24, -36], [-22, -20], 9, 8, shade(c, -0.1), { lw: 1.6 });
    var up = Math.sin(k * Math.PI) * 18;
    limb(g, [16, -48 + br], [26, -40 - up * 0.5], [24, -34 - up], 9, 8, c, { lw: 1.6 }); body(g, [[20, -64 - up], [26, -64 - up], [27, -34 - up], [21, -34 - up]], "#cfd8bf", { lw: 1.6, shine: 0.3 });
    body(g, [[-7, -70 + br], [8, -70 + br], [10, -58 + br], [-8, -58 + br]], shade(c, 0.1), { lw: 2 }); g.fillStyle = "#14101c"; g.fillRect(-4, -66 + br, 11, 3);
    eye(g, -1, -64.5 + br, 1.5, 1, "#ffd257"); eye(g, 6, -64.5 + br, 1.5, 1, "#ffd257");
    glow(g, 3, -40 + br, 14, "#ffd257", 0.2 + 0.1 * Math.sin(t * 3));
  };
  // Ancien Sylvestre (boss) : tronc-géant
  D.sylvestre = function (g, t, o) {
    var k = o.cast || 0, sw = Math.sin(t * 1.2) * 2;
    shadow(g, 0, 0, 22, 0.35);
    [[-14, 0, -20], [14, 0, 20], [0, 2, 0]].forEach(function (r) { limb(g, [r[0] * 0.3, -14], [r[0], -4], [r[2] * 1.4, 2], 8, 3, "#5a3a22", { lw: 1.4 }); });
    body(g, [[-14, -4], [-11, -36], [-14, -58], [-4, -66], [6, -64], [14, -56], [11, -34], [15, -4]], "#7a5236", { lw: 2.2, shine: 0.3, paint: function (gg, bb) { gg.strokeStyle = "rgba(30,15,5,.4)"; gg.lineWidth = 1.2; for (var i = 0; i < 4; i++) { gg.beginPath(); gg.moveTo(bb.x0 + 4 + i * 5, bb.y0 + 6); gg.quadraticCurveTo(bb.x0 + 2 + i * 5, bb.y0 + bb.h / 2, bb.x0 + 5 + i * 5, bb.y1 - 4); gg.stroke(); } } });
    body(g, [[-6, -52], [9, -52], [9, -40], [-6, -40]], "#2e1c10", { lw: 1.4 }); eye(g, -1, -47, 1.8, 2, "#7dff6a"); eye(g, 6, -47, 1.8, 2, "#7dff6a"); glow(g, 3, -47, 14, "#7dff6a", 0.25);
    limb(g, [-12, -50], [-26, -48 + sw], [-30, -66 + sw], 7, 2.5, "#7a5236", { lw: 1.4 }); limb(g, [12, -52], [26, -50 - k * 10], [32, -70 - k * 12], 7, 2.5, "#7a5236", { lw: 1.4 });
    [[-6, -70, 16, "#3f8a3f"], [10, -72, 14, "#4fa04a"], [-20, -68, 11, "#5ab455"], [22, -66, 11, "#3f8a3f"], [2, -80, 12, "#5ab455"]].forEach(function (l, i) { disc(g, l[0] + sw * 0.5, l[1], l[2], l[3]); disc(g, l[0] - 3 + sw * 0.5, l[1] - 4, l[2] * 0.4, "rgba(255,255,255,.18)"); });
  };
  // Reine Guimauve (boss) : reine rose sur trône de crème
  D.guimauve = function (g, t, o) {
    var k = o.cast || 0, br = bob(t, 1, 2), c = o.col || "#ffb3d9";
    shadow(g, 0, 0, 22, 0.3);
    body(g, [[-22, 0], [-20, -22], [-12, -26], [-8, -8], [8, -8], [12, -26], [20, -22], [22, 0]], "#ff8ac0", { lw: 2, shine: 0.4 });
    body(g, [[-16, -10 + br], [-12, -34 + br], [0, -42 + br], [12, -34 + br], [16, -10 + br], [8, -2], [-8, -2]], c, { lw: 2.1, shine: 0.45, paint: function (gg, bb) { gg.fillStyle = "rgba(255,255,255,.5)"; for (var i = 0; i < 3; i++) { gg.beginPath(); gg.arc(bb.x0 + 6 + i * 9, bb.y1 - 5, 5, 0, TAU); gg.fill(); } } });
    body(g, [[-8, -48 + br], [0, -56 + br], [8, -48 + br], [7, -38 + br], [-7, -38 + br]], "#fff1f8", { lw: 1.8, shine: 0.4 });
    eye(g, -2.5, -46 + br, 1.6, 2, "#8a1a4a"); eye(g, 3.5, -46 + br, 1.6, 2, "#8a1a4a");
    poly(g, [[-9, -54 + br], [-6, -64 + br], [-2, -56 + br], [0, -68 + br], [2, -56 + br], [6, -64 + br], [9, -54 + br]], "#ffd257", "#a67a2c", 1.4); disc(g, 0, -62 + br, 1.8, "#ff5a9a");
    limb(g, [12, -30 + br], [22, -26], [24 + k * 6, -38 - k * 8], 6, 4, c, { lw: 1.4 }); limb(g, [24 + k * 6, -38 - k * 8], [26 + k * 6, -46 - k * 8], [28 + k * 6, -58 - k * 8], 2.4, 2, "#ffd257", { lw: 1 }); disc(g, 28 + k * 6, -60 - k * 8, 4, "#ff5a9a");
    G.motes && G.motes(g, t, 5, 20, 40, -30, "#fff", 1.4);
  };
  // Grand Tic-Tac (boss) : horloge-tour
  D.tictac = function (g, t, o) {
    var k = o.cast || 0, c = o.col || "#c48a2a", br = bob(t, 0.8, 2);
    shadow(g, 0, 0, 22, 0.35);
    limb(g, [-10, -18], [-12, -8], [-14, 0], 8, 6, "#5a3a22", { lw: 1.6 }); limb(g, [10, -18], [12, -8], [14, 0], 8, 6, "#5a3a22", { lw: 1.6 });
    body(g, [[-18, -22], [-14, -58 + br], [0, -66 + br], [14, -58 + br], [18, -22], [12, -12], [-12, -12]], c, { lw: 2.3, shine: 0.4 });
    disc(g, 0, -38 + br, 14, "#fff3d0"); g.strokeStyle = "#5a3a22"; g.lineWidth = 1.8; g.beginPath(); g.arc(0, -38 + br, 14, 0, TAU); g.stroke();
    for (var i = 0; i < 12; i++) { var a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * 11.5, -38 + br + Math.sin(a) * 11.5); g.lineTo(Math.cos(a) * 13.5, -38 + br + Math.sin(a) * 13.5); g.stroke(); }
    g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -38 + br); g.lineTo(Math.cos(t * 4) * 10, -38 + br + Math.sin(t * 4) * 10); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -38 + br); g.lineTo(Math.cos(t * 0.4) * 7, -38 + br + Math.sin(t * 0.4) * 7); g.stroke();
    eye(g, -4, -42 + br, 1.6, 2, "#a02030"); eye(g, 5, -42 + br, 1.6, 2, "#a02030");
    for (var s = -1; s <= 1; s += 2) { g.save(); g.translate(s * 16, -30 + br); g.rotate(t * 1.5 * s); for (var j = 0; j < 8; j++) { g.rotate(TAU / 8); poly(g, [[-2, -9], [2, -9], [1.5, -13], [-1.5, -13]], "#8a5a1a", "#2a1a08", 1); } disc(g, 0, 0, 7, "#d9a441"); disc(g, 0, 0, 2.4, "#5a3a22"); g.restore(); }
    body(g, [[-8, -72 + br], [0, -80 + br], [8, -72 + br], [6, -64 + br], [-6, -64 + br]], "#8a5a1a", { lw: 1.8 });
    if (k > 0.2) glow(g, 0, -38 + br, 34, "#ffd257", 0.5 * k);
  };
  // Archonte (boss) : sage fractal flottant couronné de cristal
  D.archonte = function (g, t, o) {
    var k = o.cast || 0, fl = bob(t, 3, 1.8) - 12;
    shadow(g, 0, 0, 16, 0.22); glow(g, 0, -42 + fl, 52, "#d36cff", 0.35 + k * 0.3);
    body(g, [[-14, -50 + fl], [-18, -22 + fl], [-8, -4 + fl], [0, 4 + fl], [8, -4 + fl], [18, -22 + fl], [14, -50 + fl], [0, -56 + fl]], "#4a2a80", { lw: 2.1, paint: function (gg, bb) { gg.strokeStyle = rgba("#e0b8ff", 0.6); gg.lineWidth = 1.2; for (var i = 0; i < 3; i++) { gg.beginPath(); gg.moveTo(bb.x0 + 4, bb.y0 + 14 + i * 9); gg.lineTo(bb.x1 - 4, bb.y0 + 14 + i * 9); gg.stroke(); } } });
    body(g, [[-12, -52 + fl], [-6, -60 + fl], [6, -60 + fl], [12, -52 + fl], [8, -44 + fl], [-8, -44 + fl]], "#6a3ab0", { lw: 1.8, shine: 0.3 });
    body(g, [[-7, -72 + fl], [0, -78 + fl], [7, -72 + fl], [6, -58 + fl], [-6, -58 + fl]], "#e6dccb", { lw: 1.8, shine: 0.35 });
    eye(g, -2.5, -67 + fl, 1.7, 2.4, "#c77dff"); eye(g, 3.5, -67 + fl, 1.7, 2.4, "#c77dff");
    for (var i = -2; i <= 2; i++) { var h = 14 - Math.abs(i) * 3, x = i * 6; poly(g, [[x - 2.5, -78 + fl + Math.abs(i) * 2], [x, -78 - h + fl], [x + 2.5, -78 + fl + Math.abs(i) * 2]], "#e0b8ff", "#4a2a80", 1.2); }
    [-1, 1].forEach(function (s) { limb(g, [s * 12, -46 + fl], [s * 22, -40 + fl - k * 6], [s * 26, -32 + fl - k * 14], 6, 4, "#4a2a80", { lw: 1.4 }); poly(g, [[s * 26, -40 + fl - k * 14], [s * 31, -33 + fl - k * 14], [s * 26, -26 + fl - k * 14], [s * 21, -33 + fl - k * 14]], "#e0b8ff", "#fff", 1); });
    for (var q = 0; q < 5; q++) { var a = t * 1.2 + q * TAU / 5; poly(g, [[Math.cos(a) * 30 - 3, -40 + fl + Math.sin(a) * 10], [Math.cos(a) * 30, -46 + fl + Math.sin(a) * 10], [Math.cos(a) * 30 + 3, -40 + fl + Math.sin(a) * 10], [Math.cos(a) * 30, -34 + fl + Math.sin(a) * 10]], "#c77dff", "#fff", 0.8); }
  };

  B.HEIGHT.glorbe = 34; B.HEIGHT.golem = 66; B.HEIGHT.archonte = 84;
})(typeof window !== "undefined" ? window : globalThis);
