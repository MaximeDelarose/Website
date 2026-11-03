/* =========================================================================
   Arcane Tactics — dessin vectoriel (héros, monstres, PNJ, décor, icônes)
   Tout est dessiné au canvas, aux pieds du personnage (x, y = centre de la
   case au sol). Aucun fichier image.
   ========================================================================= */
(function (root) {
  "use strict";
  var TAU = Math.PI * 2;

  var HERO_PAL = {
    bastion: { main: "#2c3e78", dark: "#1a2550", light: "#4d64b0", gold: "#f2c14e", stone: "#e8e1cf", cape: "#a8323e" },
    prisme: { main: "#5b2d8e", dark: "#371a5c", light: "#8a5cc7", teal: "#3fe0d0", white: "#f4f1ff", gem: "#7ff6ff" },
    voltige: { main: "#ff6f59", dark: "#c2453a", light: "#ff9b85", cyan: "#3fe8ff", ash: "#33373f", ash2: "#4a505b" },
    sibylle: { main: "#1f7a5c", dark: "#134a39", light: "#2fa37a", ivory: "#f4ecd8", bronze: "#c98a3a", ink: "#17233a", mint: "#7df0c2" },
    clarine: { main: "#f4ecd8", dark: "#c9b48a", light: "#ffffff", gold: "#e8b54a", rose: "#ff8aa8", flame: "#ff9a3c" },
    orage: { main: "#6b1f3a", dark: "#3d1022", light: "#a3335c", steel: "#b8c4d6", steel2: "#7c8899", bolt: "#e0c060" },
    ondine: { main: "#2a6fb8", dark: "#173f6e", light: "#4fb6dd", pearl: "#eef8ff", foam: "#bff0ff", deep: "#0f2a4a" },
  };
  var THEMES = {
    village: { top: ["#9ed27b", "#93c972", "#a7d985"], path: ["#e8d4a2", "#dfc994"], side: "#6f9a4f", side2: "#5a8340", water: "#5fb2e6", line: "rgba(40,70,30,.10)" },
    prairie: { top: ["#a9da7c", "#9fd173", "#b3e186"], path: ["#e2cc93", "#d8c086"], side: "#76a34f", side2: "#5d8840", water: "#58b4ea", line: "rgba(40,70,30,.10)" },
    bois: { top: ["#5ea468", "#559a60", "#68ae70"], path: ["#b89d70", "#ad9266"], side: "#3e7247", side2: "#2f5a37", water: "#3f8fb8", line: "rgba(10,40,20,.14)" },
    falaises: { top: ["#b9c6d9", "#adbbd0", "#c4d0e1"], path: ["#ddd6c6", "#d1c9b8"], side: "#7d89a3", side2: "#626d86", water: "#6fd6ff", line: "rgba(30,40,70,.12)" },
    donjon: { top: ["#5d527c", "#564b74", "#655a86"], path: ["#6d6290", "#655a86"], side: "#3a3156", side2: "#2a2342", water: "#9f6cff", line: "rgba(255,255,255,.06)" },
  };

  function ell(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); }
  function poly(g, pts, col, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    if (col) { g.fillStyle = col; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.lineJoin = "round"; g.stroke(); }
  }
  function rrect(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function shadow(g, x, y, r, a) { ell(g, x, y, r, r * 0.42, "rgba(20,15,40," + (a == null ? 0.28 : a) + ")"); }
  function glow(g, x, y, r, col, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save(); g.globalAlpha *= a == null ? 1 : Math.max(0, a); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  }
  function eyes(g, x, y, gap, r, o) {
    if (o.back) return;
    var blink = (Math.sin((o.t || 0) * 1.3 + (o.seed || 0)) > 0.985);
    if (blink) { g.fillStyle = "#1b1530"; g.fillRect(x - gap - r, y, r * 2, 1.6); g.fillRect(x + gap - r, y, r * 2, 1.6); return; }
    circ(g, x - gap, y, r, "#1b1530"); circ(g, x + gap, y, r, "#1b1530");
    circ(g, x - gap + r * 0.35, y - r * 0.35, r * 0.38, "#fff"); circ(g, x + gap + r * 0.35, y - r * 0.35, r * 0.38, "#fff");
  }

  /* ====================== HÉROS ====================== */
  // o : t (temps), flip (1 = regarde à droite), back (de dos), walk (phase), cast (0..1), hurt (0..1), win, alpha
  function hero(g, cls, x, y, o) {
    o = o || {};
    var t = o.t || 0, P = HERO_PAL[cls], s = o.scale || 1;
    g.save();
    g.translate(x, y);
    if (!o.noShadow) shadow(g, 0, 0, 17 * s, 0.3);
    var bob = Math.sin(t * 3.2) * 1.4, hop = 0, lean = 0;
    if (o.walk != null) { hop = -Math.abs(Math.sin(o.walk * Math.PI)) * 5; bob = 0; lean = 0.06; }
    if (o.win) hop = -Math.abs(Math.sin(t * 6)) * 9;
    var sq = 1 + (o.cast ? Math.sin(o.cast * Math.PI) * 0.08 : 0) - (o.hurt ? o.hurt * 0.1 : 0);
    g.translate(0, hop + bob * 0.4);
    g.scale(s * (o.flip || 1) / sq * (o.hurt ? 1 + o.hurt * 0.06 : 1), s * sq);
    g.rotate((o.flip || 1) < 0 ? -lean : lean);
    if (o.hurt) g.translate(-o.hurt * 4, 0);
    if (cls === "bastion") drawBastion(g, P, t, o, bob);
    else if (cls === "prisme") drawPrisme(g, P, t, o, bob);
    else if (cls === "sibylle") drawSibylle(g, P, t, o, bob);
    else if (cls === "clarine") drawClarine(g, P, t, o, bob);
    else if (cls === "orage") drawOrage(g, P, t, o, bob);
    else if (cls === "ondine") drawOndine(g, P, t, o, bob);
    else drawVoltige(g, P, t, o, bob);
    if (o.hurt > 0.3) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255," + (o.hurt * 0.7) + ")"; g.fillRect(-40, -80, 80, 90); g.globalCompositeOperation = "source-over"; }
    g.restore();
  }
  function drawBastion(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // cape courte
    poly(g, [-14, -36, 14, -36, 17, -10, 0, -6, -17, -10], P.cape);
    // jambes
    rrect(g, -11, -10, 8, 10, 3, P.dark); rrect(g, 3, -10, 8, 10, 3, P.dark);
    // corps massif
    poly(g, [-17, -40, 17, -40, 15, -10, -15, -10], P.main, "#121a38", 2);
    poly(g, [-17, -40, 17, -40, 14, -33, -14, -33], P.light);
    g.fillStyle = P.gold; g.fillRect(-15, -22, 30, 3);
    if (!back) poly(g, [0, -31, 5, -26, 0, -21, -5, -26], P.gold);
    // casque géométrique
    poly(g, [-13, -42, -11, -58, 0, -64, 11, -58, 13, -42], P.stone, "#2b2a3a", 2);
    poly(g, [-11, -58, 0, -64, 11, -58, 0, -55], "#ffffff");
    if (!back) {
      g.fillStyle = "#1b1530"; g.fillRect(-9, -51, 18, 4);
      g.fillStyle = P.gold; g.fillRect(-9, -51, 18, 1.4);
      var gl = 0.6 + Math.sin(t * 4) * 0.3;
      g.fillStyle = "rgba(120,220,255," + gl + ")"; g.fillRect(-6, -50, 3.5, 2); g.fillRect(2.5, -50, 3.5, 2);
    }
    poly(g, [-2, -64, 2, -64, 1, -70, -1, -70], P.gold);
    // grand bouclier flottant
    var sx = 21 + c * 6, sy = -30 + Math.sin(t * 2.4) * 3 - c * 6;
    g.save(); g.translate(sx, sy); g.rotate(-0.12 + Math.sin(t * 2.4) * 0.05);
    glow(g, 0, 0, 22, "rgba(242,193,78,.55)", 0.4 + c * 0.6);
    poly(g, [0, -18, 12, -11, 12, 7, 0, 17, -12, 7, -12, -11], P.main, P.gold, 3);
    poly(g, [0, -11, 6, -6, 6, 4, 0, 9, -6, 4, -6, -6], P.light);
    g.strokeStyle = P.gold; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 7); g.moveTo(-4, -1); g.lineTo(4, -1); g.stroke();
    g.restore();
  }
  function drawPrisme(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // robe élancée
    poly(g, [-9, -40, 9, -40, 14, -2, 0, 2, -14, -2], P.main, "#25103f", 2);
    poly(g, [-3, -38, 3, -38, 5, -2, -5, -2], P.dark);
    g.fillStyle = P.teal; g.fillRect(-12, -6, 24, 2);
    // symboles lumineux sur la robe
    if (!back) { g.strokeStyle = P.teal; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-6, -22); g.lineTo(-2, -26); g.lineTo(2, -22); g.lineTo(6, -26); g.stroke(); }
    // bras levé quand il lance
    var ax = 9 + c * 4, ay = -32 - c * 14;
    g.strokeStyle = P.main; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(6, -34); g.lineTo(ax, ay); g.stroke();
    circ(g, ax, ay, 3, P.white);
    // tête et capuche asymétrique
    circ(g, 0, -47, 9, back ? P.dark : "#f2dccd");
    poly(g, [-12, -44, -10, -56, 2, -64, 16, -60, 9, -52, 11, -42, 6, -50, -6, -50], P.light, "#25103f", 2);
    if (!back) { eyes(g, -1, -46, 3.4, 1.9, o); g.fillStyle = "#e7a7b8"; g.fillRect(-6, -43, 2.5, 1.5); }
    // cristal flottant au-dessus de l'épaule
    var cx = -14 + Math.sin(t * 1.7) * 2, cy = -62 + Math.sin(t * 2.3) * 3 - c * 4;
    g.save(); g.translate(cx, cy); g.rotate(t * 1.2);
    glow(g, 0, 0, 16, "rgba(127,246,255,.7)", 0.5 + c * 0.5);
    poly(g, [0, -8, 5, 0, 0, 8, -5, 0], P.gem, "#ffffff", 1.4);
    poly(g, [0, -8, 5, 0, 0, 0], "#ffffff");
    g.restore();
    // petits triangles en orbite
    for (var i = 0; i < 3; i++) {
      var a = t * 1.6 + i * TAU / 3, px = Math.cos(a) * 18, py = -24 + Math.sin(a) * 6;
      g.globalAlpha = 0.6 + 0.4 * Math.sin(a);
      poly(g, [px, py - 2.5, px + 2.5, py + 2, px - 2.5, py + 2], i % 2 ? P.teal : P.white);
    }
    g.globalAlpha = 1;
  }
  function drawVoltige(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // foulard flottant
    g.strokeStyle = P.cyan; g.lineWidth = 4; g.lineCap = "round";
    g.beginPath(); g.moveTo(-3, -42);
    for (var i = 1; i <= 5; i++) g.lineTo(-3 - i * 5, -42 + Math.sin(t * 6 + i) * 3 + i * 1.2);
    g.stroke();
    // jambes anguleuses
    var wk = o.walk != null ? Math.sin(o.walk * TAU) * 4 : 0;
    poly(g, [-7, -16, -2, -16, -4 + wk, 0, -9 + wk, 0], P.ash);
    poly(g, [2, -16, 7, -16, 9 - wk, 0, 4 - wk, 0], P.ash2);
    // buste en triangle
    poly(g, [-11, -40, 11, -40, 6, -15, -6, -15], P.main, "#5c1d17", 2);
    poly(g, [-11, -40, 0, -40, -3, -15, -6, -15], P.light);
    g.fillStyle = P.ash; g.fillRect(-7, -19, 14, 4);
    // tête anguleuse
    poly(g, [-8, -42, 8, -42, 9, -52, 4, -60, -6, -59, -9, -52], back ? P.ash : "#f3d2bd", "#2b1d22", 1.6);
    poly(g, [-10, -52, -6, -61, 4, -62, 11, -56, 9, -51, 3, -56, -4, -55], P.ash2);
    if (!back) {
      g.fillStyle = P.cyan; g.fillRect(-7, -51, 15, 3);
      g.fillStyle = "#fff"; g.fillRect(-4, -50.5, 3, 1.4); g.fillRect(3, -50.5, 3, 1.4);
    }
    // deux lames d'énergie
    var sw = c ? Math.sin(c * Math.PI) : 0;
    blade(g, 13 + sw * 6, -28 - sw * 6, -0.9 + sw * 1.8, P);
    blade(g, -13, -27, 0.7 + Math.sin(t * 2) * 0.1, P);
  }
  function drawSibylle(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // robe émeraude évasée, liseré ivoire
    poly(g, [-8, -40, 8, -40, 15, 0, 0, 3, -15, 0], P.main, P.dark, 2);
    poly(g, [-8, -40, -2, -40, -6, 0, -13, 0], P.light);
    g.strokeStyle = P.ivory; g.lineWidth = 2; g.beginPath(); g.moveTo(-13, -3); g.lineTo(13, -3); g.stroke();
    if (!back) { g.fillStyle = P.ivory; g.fillRect(-2, -38, 4, 34); poly(g, [0, -30, 3, -26, 0, -22, -3, -26], P.bronze); }
    // bras tenant le grand bâton-encrier
    var sx = 13, sy = -30;
    g.strokeStyle = P.main; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(6, -34); g.lineTo(sx, sy); g.stroke();
    circ(g, sx, sy, 3, "#f2dccd");
    g.strokeStyle = P.bronze; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + 2, 2); g.lineTo(sx + 2, -62 - c * 4); g.stroke();
    // encrier ouvert au sommet, encre qui goutte
    rrect(g, sx - 5, -70 - c * 4, 14, 9, 3, P.ink); rrect(g, sx - 3, -72 - c * 4, 10, 3, 1.5, P.bronze);
    glow(g, sx + 2, -68 - c * 4, 18, "rgba(125,240,194,.7)", 0.4 + c * 0.6);
    for (var i = 0; i < 3; i++) { var a = t * 2 + i * 2.1, dy = ((t * 18 + i * 11) % 26); circ(g, sx + 2 + Math.cos(a) * 9, -62 + dy - c * 6, 2.2 - dy / 20, i === 1 ? P.mint : P.ink); }
    // tête, capuche souple en pointe repliée
    circ(g, 0, -47, 9, back ? P.dark : "#f2dccd");
    poly(g, [-12, -44, -11, -56, -4, -63, 6, -63, 12, -56, 13, -44, 8, -50, -8, -50], P.dark, P.ink, 1.6);
    poly(g, [6, -63, 12, -56, 20, -70, 10, -72], P.main);
    g.fillStyle = P.ivory; g.fillRect(-10, -52, 20, 2);
    if (!back) { eyes(g, 0, -46, 3.4, 1.8, o); g.fillStyle = P.ink; g.fillRect(-1, -42, 2.5, 1.4); }
    // petit pion d'encre familier qui flotte à gauche
    var fx = -16 + Math.sin(t * 1.5) * 2, fy = -30 + Math.sin(t * 2.6) * 3;
    summonBody(g, "pion", fx, fy, 0.45, t, P);
  }
  function drawClarine(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // robe ivoire, large, liseré or ; cape rose
    poly(g, [-10, -38, 10, -38, 15, -8, 2, -4, -15, -8], P.rose);
    poly(g, [-9, -40, 9, -40, 16, 2, 0, 4, -16, 2], P.main, P.dark, 2);
    g.strokeStyle = P.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -2); g.lineTo(14, -2); g.moveTo(0, -38); g.lineTo(0, -4); g.stroke();
    if (!back) { poly(g, [0, -28, 4, -23, 0, -18, -4, -23], P.gold); g.fillStyle = P.rose; g.fillRect(-11, -20, 22, 2); }
    // bras tendus : main ouverte qui rayonne
    var hx = 12 + c * 5, hy = -34 - c * 10;
    g.strokeStyle = P.main; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(6, -34); g.lineTo(hx, hy); g.stroke();
    glow(g, hx, hy, 18, "rgba(255,154,60,.8)", 0.4 + c * 0.6);
    circ(g, hx, hy, 3.2, "#f2dccd");
    for (var i = 0; i < 4; i++) { var a = t * 2.4 + i * TAU / 4; poly(g, [hx + Math.cos(a) * 9, hy + Math.sin(a) * 9 - 2.5, hx + Math.cos(a) * 9 + 2.5, hy + Math.sin(a) * 9 + 2, hx + Math.cos(a) * 9 - 2.5, hy + Math.sin(a) * 9 + 2], i % 2 ? P.flame : P.gold); }
    // tête : chevelure dorée, petite couronne (le roi)
    circ(g, 0, -47, 9, back ? P.gold : "#f2dccd");
    poly(g, [-11, -45, -10, -56, -3, -60, 5, -60, 11, -55, 11, -45, 7, -49, -7, -49], P.gold, "#9a6f1a", 1.4);
    poly(g, [-7, -58, -4, -66, 0, -60, 4, -66, 7, -58], P.rose, "#9a6f1a", 1.2);
    circ(g, 0, -64, 1.8, "#fff");
    if (!back) { eyes(g, 0, -46, 3.4, 1.8, o); g.fillStyle = "#e7a7b8"; g.fillRect(-6, -43, 2.5, 1.5); g.fillRect(3.5, -43, 2.5, 1.5); }
    // halo doux
    glow(g, 0, -56, 26, "rgba(232,181,74,.45)", 0.5 + Math.sin(t * 2) * 0.15);
  }
  function drawOrage(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back;
    // cape pourpre fendue
    poly(g, [-14, -38, 14, -38, 18, -4, 6, -8, 0, 0, -6, -8, -18, -4], P.dark);
    // jambes blindées
    rrect(g, -10, -12, 8, 12, 3, P.steel2); rrect(g, 2, -12, 8, 12, 3, P.steel2);
    // buste : plastron d'acier sur tunique pourpre
    poly(g, [-14, -42, 14, -42, 12, -12, -12, -12], P.main, P.dark, 2);
    poly(g, [-11, -41, 11, -41, 9, -24, 0, -20, -9, -24], P.steel, P.steel2, 1.5);
    poly(g, [-11, -41, 0, -41, 0, -22, -9, -24], "rgba(255,255,255,.35)");
    rrect(g, -16, -42, 8, 7, 3, P.steel2); rrect(g, 8, -42, 8, 7, 3, P.steel2);   // épaulières
    // grande épée-foudre tenue à deux mains, levée quand elle lance
    var sa = -0.5 + Math.sin(t * 1.5) * 0.05 - c * 1.2;
    g.save(); g.translate(13, -30); g.rotate(sa);
    glow(g, 0, -22, 16, "rgba(224,192,96,.7)", 0.4 + c * 0.6);
    poly(g, [-3, 0, 3, 0, 2, -40, 0, -46, -2, -40], P.steel, P.steel2, 1.2);
    g.fillStyle = P.bolt; g.fillRect(-1, -36, 2, 30);
    rrect(g, -7, 0, 14, 4, 2, P.bolt); rrect(g, -2, 4, 4, 10, 2, P.dark);
    g.restore();
    g.strokeStyle = P.main; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(8, -34); g.lineTo(13, -30); g.stroke();
    // tête : cheveux sombres relevés, diadème d'acier (la dame)
    circ(g, 0, -49, 9, back ? P.dark : "#f0cfb5");
    poly(g, [-11, -48, -9, -60, 0, -64, 9, -60, 11, -48, 8, -52, -8, -52], P.dark);
    poly(g, [-9, -56, -5, -66, 0, -60, 5, -66, 9, -56], P.steel, P.steel2, 1.2);
    circ(g, 0, -63, 2, P.bolt);
    if (!back) { g.fillStyle = "#1b1530"; g.fillRect(-7, -50, 5, 2); g.fillRect(2, -50, 5, 2); g.fillStyle = P.bolt; g.fillRect(-6, -49.5, 3, 1); g.fillRect(3, -49.5, 3, 1); g.fillStyle = "#1b1530"; g.fillRect(-2, -44, 4, 1.4); }
    g.strokeStyle = P.bolt; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, -57); g.lineTo(-6, -53); g.lineTo(-9, -49); g.stroke();
  }
  function drawOndine(g, P, t, o, bob) {
    var c = o.cast || 0, back = o.back, wv = Math.sin(t * 2.2);
    // jupe-vague qui ondule
    g.fillStyle = P.main; g.beginPath(); g.moveTo(-9, -38); g.lineTo(9, -38);
    g.quadraticCurveTo(20, -14 + wv * 2, 16, 2); g.quadraticCurveTo(8, 6 - wv, 0, 2); g.quadraticCurveTo(-8, 6 + wv, -16, 2); g.quadraticCurveTo(-20, -14 - wv * 2, -9, -38); g.closePath(); g.fill();
    g.strokeStyle = P.dark; g.lineWidth = 2; g.stroke();
    g.strokeStyle = P.foam; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -4 + wv); g.quadraticCurveTo(-7, -9 - wv, 0, -4); g.quadraticCurveTo(7, 1 + wv, 14, -4 - wv); g.stroke();
    poly(g, [-8, -38, 8, -38, 6, -16, -6, -16], P.light);
    if (!back) { poly(g, [0, -32, 4, -27, 0, -22, -4, -27], P.pearl, P.dark, 1); }
    // bras : orbe d'eau qui tourne au-dessus de la main
    var hx = 13 + c * 3, hy = -36 - c * 8;
    g.strokeStyle = P.light; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(6, -34); g.lineTo(hx, hy); g.stroke();
    circ(g, hx, hy, 3.2, "#f2dccd");
    glow(g, hx, hy - 12, 18, "rgba(79,182,221,.8)", 0.5 + c * 0.5);
    g.save(); g.translate(hx, hy - 12); g.rotate(t * 2);
    g.fillStyle = P.light; g.beginPath(); g.ellipse(0, 0, 7, 5.5, 0, 0, TAU); g.fill();
    circ(g, -2, -2, 2, P.pearl);
    g.restore();
    for (var i = 0; i < 4; i++) { var a = t * 3 + i * TAU / 4; circ(g, hx + Math.cos(a) * 12, hy - 12 + Math.sin(a) * 6, 1.6, P.foam); }
    // tête : longue chevelure bleu nuit, coquillage-tiare
    circ(g, 0, -47, 9, back ? P.deep : "#f2dccd");
    g.fillStyle = P.deep; g.beginPath(); g.moveTo(-11, -46); g.quadraticCurveTo(-13, -60, 0, -62); g.quadraticCurveTo(13, -60, 11, -46); g.lineTo(8, -50); g.quadraticCurveTo(0, -56, -8, -50); g.closePath(); g.fill();
    g.fillStyle = P.deep; g.beginPath(); g.moveTo(-11, -46); g.quadraticCurveTo(-16, -30 + wv, -12, -18); g.lineTo(-8, -22); g.quadraticCurveTo(-10, -32, -8, -44); g.closePath(); g.fill();
    poly(g, [-6, -58, -3, -66, 0, -61, 3, -66, 6, -58], P.pearl, P.light, 1.2);
    if (!back) { eyes(g, 0, -46, 3.4, 1.8, o); g.fillStyle = "#e7a7b8"; g.fillRect(-1.5, -42, 3, 1.4); }
  }
  // corps d'une invocation (pion / dame d'encre), aux pieds en (x, y)
  function summonBody(g, cls, x, y, s, t, P) {
    g.save(); g.translate(x, y); g.scale(s, s);
    var w = Math.sin(t * 3) * 1.5;
    ell(g, 0, 0, 16, 6, P.ink);
    poly(g, [-13, -2, 13, -2, 9, -8, -9, -8], P.ink, P.ivory, 1.5);
    if (cls === "pion") {
      poly(g, [-8, -8, 8, -8, 5, -30 + w, -5, -30 + w], P.ink);
      circ(g, 0, -37 + w, 9, P.ink);
      circ(g, -3, -40 + w, 3, "rgba(255,255,255,.25)");
      circ(g, 2, -36 + w, 2.6, P.mint);
      circ(g, 2.6, -36.6 + w, 1, "#fff");
    } else {
      poly(g, [-9, -8, 9, -8, 6, -40 + w, -6, -40 + w], P.ink);
      g.strokeStyle = P.ivory; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -20); g.lineTo(6, -20); g.stroke();
      circ(g, 0, -46 + w, 8, P.ink);
      poly(g, [-9, -50 + w, -6, -62 + w, -2, -54 + w, 0, -64 + w, 2, -54 + w, 6, -62 + w, 9, -50 + w], P.bronze, P.ink, 1.2);
      circ(g, -3, -47 + w, 2.4, P.mint); circ(g, 3, -47 + w, 2.4, P.mint);
      circ(g, -2.5, -47.5 + w, 0.9, "#fff"); circ(g, 3.5, -47.5 + w, 0.9, "#fff");
    }
    g.restore();
  }
  // invocation sur le plateau (même options que hero)
  function summon(g, cls, x, y, o) {
    o = o || {};
    var t = o.t || 0, P = HERO_PAL.sibylle, s = o.scale || 1;
    g.save(); g.translate(x, y);
    if (!o.noShadow) shadow(g, 0, 0, 13 * s, 0.28);
    var hop = o.walk != null ? -Math.abs(Math.sin(o.walk * Math.PI)) * 5 : 0;
    g.translate(0, hop);
    if (o.hurt) g.translate(-o.hurt * 3, 0);
    var sq = 1 + (o.cast ? Math.sin(o.cast * Math.PI) * 0.12 : 0);
    g.scale(s * (o.flip || 1) / sq, s * sq);
    summonBody(g, cls, 0, 0, cls === "dame" ? 0.95 : 0.8, t + (o.seed || 0), P);
    if (o.hurt > 0.3) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255," + (o.hurt * 0.7) + ")"; g.fillRect(-40, -80, 80, 90); g.globalCompositeOperation = "source-over"; }
    g.restore();
  }
  function blade(g, x, y, a, P) {
    g.save(); g.translate(x, y); g.rotate(a);
    glow(g, 0, -8, 12, "rgba(63,232,255,.6)", 0.7);
    poly(g, [-2, 2, 0, -18, 2, 2], P.cyan, "#ffffff", 1);
    g.fillStyle = P.ash; g.fillRect(-3, 2, 6, 3);
    g.restore();
  }

  /* ====================== MONSTRES ====================== */
  function mob(g, type, x, y, o) {
    o = o || {};
    var t = o.t || 0, M = o.col || "#8fd", s = (o.scale || 1) * (o.boss ? 1.8 : 1);
    g.save(); g.translate(x, y);
    if (!o.noShadow) shadow(g, 0, 0, 16 * s, 0.3);
    if (o.elite) { g.save(); g.globalAlpha = 0.6 + Math.sin(t * 4) * 0.2; ell(g, 0, 0, 22 * s, 9 * s, "rgba(255,210,87,.5)"); g.restore(); }
    var hop = o.walk != null ? -Math.abs(Math.sin(o.walk * Math.PI)) * 4 : 0;
    g.translate(0, hop);
    g.scale(s * (o.flip || 1), s);
    if (o.hurt) g.translate(-o.hurt * 4, 0);
    var f = SHAPES[type] || SHAPES.blob;
    if (o.elite) { g.shadowColor = "#ffd257"; g.shadowBlur = 10; }
    f(g, M, t, o);
    g.shadowBlur = 0;
    if (o.hurt > 0.3) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255," + (o.hurt * 0.7) + ")"; g.fillRect(-40, -80, 80, 90); g.globalCompositeOperation = "source-over"; }
    g.restore();
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; gg *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; }
    return "rgb(" + (r | 0) + "," + (gg | 0) + "," + (b | 0) + ")";
  }
  var SHAPES = {
    glorbe: function (g, c, t, o) {
      var w = Math.sin(t * 4) * 2;
      g.beginPath(); g.moveTo(-15 - w, 0); g.quadraticCurveTo(-17, -24 + w, 0, -27 - w); g.quadraticCurveTo(17, -24 + w, 15 + w, 0); g.closePath();
      g.fillStyle = c; g.fill(); g.strokeStyle = shade(c, -0.45); g.lineWidth = 2; g.stroke();
      ell(g, -5, -18, 4, 6, "rgba(255,255,255,.45)");
      circ(g, 4, -9, 2.5, shade(c, -0.3));
      eyes(g, 0, -15, 5, 2.6, o);
    },
    scarabrume: function (g, c, t, o) {
      g.strokeStyle = shade(c, -0.55); g.lineWidth = 2;
      for (var i = -1; i <= 1; i++) { var l = Math.sin(t * 12 + i) * 2; g.beginPath(); g.moveTo(i * 6, -6); g.lineTo(i * 9 - 4, 0 + l); g.moveTo(i * 6, -6); g.lineTo(i * 9 + 4, 0 - l); g.stroke(); }
      ell(g, 0, -12, 15, 10, shade(c, -0.25));
      ell(g, -1, -14, 13, 9, c);
      g.strokeStyle = shade(c, -0.5); g.beginPath(); g.moveTo(-1, -23); g.lineTo(-1, -5); g.stroke();
      ell(g, 13, -11, 6, 5, shade(c, -0.4));
      circ(g, 15, -12, 1.7, "#fff");
      g.strokeStyle = shade(c, -0.6); g.beginPath(); g.moveTo(17, -14); g.quadraticCurveTo(24, -20, 22, -25); g.stroke();
      ell(g, -5, -18, 4, 2.5, "rgba(255,255,255,.4)");
    },
    ronceau: function (g, c, t, o) {
      var sw = Math.sin(t * 2) * 1.5;
      for (var i = 0; i < 7; i++) { var a = -Math.PI + i * Math.PI / 6; poly(g, [Math.cos(a) * 12, -14 + Math.sin(a) * 10, Math.cos(a) * 22 + sw, -14 + Math.sin(a) * 18, Math.cos(a + 0.2) * 12, -14 + Math.sin(a + 0.2) * 10], shade(c, -0.35)); }
      circ(g, 0, -14, 14, c); circ(g, -7, -19, 8, shade(c, 0.15)); circ(g, 7, -10, 8, shade(c, -0.15));
      circ(g, 9, -21, 2.5, "#e0405a"); circ(g, -10, -9, 2.2, "#e0405a");
      eyes(g, 0, -15, 4.5, 2.4, o);
      g.fillStyle = "#1b1530"; g.fillRect(-4, -9, 8, 1.6);
    },
    lanterneau: function (g, c, t, o) {
      var fy = -22 + Math.sin(t * 2.6) * 3;
      glow(g, 0, fy, 26, "rgba(255,179,71,.7)", 0.6);
      g.strokeStyle = "#4a3a2a"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, fy - 16); g.lineTo(0, fy - 22); g.stroke();
      poly(g, [-9, fy - 14, 9, fy - 14, 12, fy + 8, -12, fy + 8], "rgba(255,240,200,.35)", "#4a3a2a", 2);
      rrect(g, -11, fy - 17, 22, 4, 2, "#4a3a2a"); rrect(g, -13, fy + 7, 26, 4, 2, "#4a3a2a");
      var fl = Math.sin(t * 9) * 1.5;
      poly(g, [0, fy - 10 + fl, 6, fy + 2, 0, fy + 6, -6, fy + 2], c);
      poly(g, [0, fy - 4 + fl, 3, fy + 2, 0, fy + 5, -3, fy + 2], "#fff6c8");
      eyes(g, 0, fy + 1, 3, 1.5, o);
    },
    sylphe: function (g, c, t, o) {
      var fy = -24 + Math.sin(t * 2) * 3, wf = Math.sin(t * 8) * 0.3;
      g.save(); g.globalAlpha = 0.55;
      g.save(); g.translate(-4, fy - 4); g.rotate(-0.5 - wf); ell(g, -9, 0, 11, 5, "#e7dcff"); g.restore();
      g.save(); g.translate(4, fy - 4); g.rotate(0.5 + wf); ell(g, 9, 0, 11, 5, "#e7dcff"); g.restore();
      g.restore();
      poly(g, [-6, fy - 4, 6, fy - 4, 3, fy + 16, 0, fy + 22, -3, fy + 16], c);
      circ(g, 0, fy - 10, 7, shade(c, 0.4));
      g.strokeStyle = "rgba(60,30,90,.7)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(3, fy - 16); g.lineTo(-1, fy - 9); g.lineTo(2, fy - 5); g.stroke();
      eyes(g, 0, fy - 10, 3, 1.6, o);
      for (var i = 0; i < 3; i++) { var a = t * 2 + i * 2.1; circ(g, Math.cos(a) * 13, fy + Math.sin(a) * 8, 1.4, "#fff"); }
    },
    golem: function (g, c, t, o) {
      var b = Math.sin(t * 1.6) * 1;
      rrect(g, -15, -8, 10, 8, 2, shade(c, -0.35)); rrect(g, 5, -8, 10, 8, 2, shade(c, -0.35));
      poly(g, [-20, -42 + b, 20, -42 + b, 17, -8, -17, -8], c, shade(c, -0.5), 2);
      poly(g, [-20, -42 + b, 20, -42 + b, 16, -35 + b, -16, -35 + b], shade(c, 0.25));
      rrect(g, -27, -38 + b, 9, 22, 3, shade(c, -0.15)); rrect(g, 18, -38 + b, 9, 22, 3, shade(c, -0.15));
      poly(g, [-10, -54 + b, 10, -54 + b, 11, -42 + b, -11, -42 + b], shade(c, 0.1), shade(c, -0.5), 2);
      var gl = 0.55 + Math.sin(t * 3) * 0.35;
      g.fillStyle = "rgba(127,246,255," + gl + ")"; if (!o.back) { g.fillRect(-7, -50 + b, 4, 3); g.fillRect(3, -50 + b, 4, 3); }
      g.strokeStyle = "rgba(127,246,255," + gl + ")"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-6, -30 + b); g.lineTo(0, -22 + b); g.lineTo(6, -30 + b); g.moveTo(0, -22 + b); g.lineTo(0, -14 + b); g.stroke();
    },
    cristallin: function (g, c, t, o) {
      var fy = -24 + Math.sin(t * 2.2) * 3;
      glow(g, 0, fy, 22, "rgba(143,230,255,.6)", 0.5);
      g.save(); g.translate(0, fy); g.rotate(Math.sin(t) * 0.1);
      poly(g, [0, -20, 10, -4, 6, 14, -6, 14, -10, -4], c, "#ffffff", 1.6);
      poly(g, [0, -20, 10, -4, 0, 0], shade(c, 0.5)); poly(g, [-10, -4, 0, 0, -6, 14], shade(c, -0.25));
      eyes(g, 0, -2, 3.5, 1.8, o);
      g.restore();
      for (var i = 0; i < 2; i++) { var a = t * 1.8 + i * Math.PI; g.save(); g.translate(Math.cos(a) * 16, fy + Math.sin(a) * 6); g.rotate(a); poly(g, [0, -5, 3, 0, 0, 5, -3, 0], shade(c, 0.3)); g.restore(); }
    },
    statue: function (g, c, t, o) {
      // Sentinelle d'Incarnam : statue de pierre couverte de lierre, un œil de rune
      var b = Math.sin(t * 1.2) * 1;
      rrect(g, -18, -10, 36, 10, 3, shade(c, -0.4));
      poly(g, [-16, -50 + b, 16, -50 + b, 14, -10, -14, -10], c, shade(c, -0.5), 2);
      poly(g, [-16, -50 + b, 16, -50 + b, 12, -42 + b, -12, -42 + b], shade(c, 0.2));
      rrect(g, -26, -46 + b, 10, 26, 3, shade(c, -0.1)); rrect(g, 16, -46 + b, 10, 26, 3, shade(c, -0.1));
      poly(g, [-9, -64 + b, 9, -64 + b, 10, -50 + b, -10, -50 + b], shade(c, 0.1), shade(c, -0.5), 2);
      // lierre
      g.strokeStyle = "#3f8a5a"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.moveTo(-14, -12); g.quadraticCurveTo(-4, -30 + b, -12, -46 + b); g.moveTo(10, -14); g.quadraticCurveTo(16, -32 + b, 6, -44 + b); g.stroke();
      [[-10, -20], [-8, -36 + b], [12, -24 + b], [8, -40 + b], [-24, -30 + b]].forEach(function (p) { ell(g, p[0], p[1], 4, 2.5, "#62b25b"); });
      var gl = 0.55 + Math.sin(t * 3) * 0.35;
      if (!o.back) { g.fillStyle = "rgba(255,210,87," + gl + ")"; g.fillRect(-5, -59 + b, 10, 3.5); }
      g.strokeStyle = "rgba(255,210,87," + gl + ")"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-6, -36 + b); g.lineTo(0, -28 + b); g.lineTo(6, -36 + b); g.moveTo(0, -28 + b); g.lineTo(0, -18 + b); g.stroke();
    },
    archonte: function (g, c, t, o) {
      var fy = -30 + Math.sin(t * 1.4) * 3;
      glow(g, 0, fy, 40, "rgba(211,108,255,.55)", 0.7);
      for (var i = 0; i < 6; i++) { var a = t * 0.8 + i * TAU / 6; g.save(); g.translate(Math.cos(a) * 26, fy + 4 + Math.sin(a) * 9); g.rotate(-a); poly(g, [0, -6, 4, 0, 0, 6, -4, 0], i % 2 ? "#9ff3ff" : "#f2c1ff", "#fff", 1); g.restore(); }
      poly(g, [-14, fy - 6, 14, fy - 6, 20, fy + 24, 0, fy + 30, -20, fy + 24], "#2a1640", "#d36cff", 2);
      poly(g, [-11, fy - 22, 11, fy - 22, 13, fy - 4, -13, fy - 4], "#3d1f5c", "#d36cff", 2);
      poly(g, [-12, fy - 22, -8, fy - 32, -3, fy - 24, 0, fy - 36, 3, fy - 24, 8, fy - 32, 12, fy - 22], "#ffd257", "#7a4a10", 1.4);
      var gl = 0.7 + Math.sin(t * 5) * 0.3;
      if (!o.back) { g.fillStyle = "rgba(255,120,255," + gl + ")"; g.fillRect(-8, -15 + fy, 5, 3); g.fillRect(3, -15 + fy, 5, 3); }
      g.strokeStyle = "rgba(255,210,255,.7)"; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-8, fy + 6); g.lineTo(0, fy + 16); g.lineTo(8, fy + 6); g.stroke();
    },
  };
  SHAPES.blob = SHAPES.glorbe;

  /* ====================== PNJ ====================== */
  function npc(g, id, x, y, o) {
    o = o || {}; var t = o.t || 0;
    g.save(); g.translate(x, y);
    if (id === "source") {
      g.restore(); return;
    }
    shadow(g, 0, 0, 14, 0.28);
    var bob = Math.sin(t * 2.4 + (id === "tobin" ? 1 : 0)) * 1.2;
    g.translate(0, bob * 0.5);
    if (o.flip) g.scale(o.flip, 1);
    if (id === "elya") {
      poly(g, [-10, -36, 10, -36, 15, 0, -15, 0], "#e9e3d2", "#5b4a2a", 2);
      g.fillStyle = "#ffd257"; g.fillRect(-14, -6, 28, 3);
      circ(g, 0, -44, 9, "#f0cfb5");
      poly(g, [-11, -46, 0, -60, 11, -46, 8, -40, -8, -40], "#ffd257", "#7a5a10", 1.6);
      eyes(g, 0, -43, 3.4, 1.8, o);
      g.strokeStyle = "#6b4a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 0); g.lineTo(16, -52); g.stroke();
      glow(g, 16, -56, 12, "rgba(255,210,87,.8)", 0.8); circ(g, 16, -56, 4, "#fff6c8");
    } else {
      rrect(g, -14, -34, 28, 34, 8, "#8a5a3b");
      rrect(g, -12, -20, 24, 18, 4, "#c98f5c");
      g.fillStyle = "#ff9a3c"; g.fillRect(-14, -24, 28, 4);
      circ(g, 0, -42, 10, "#f0cfb5");
      poly(g, [-14, -44, 14, -44, 9, -52, -9, -52], "#3d2a1e");
      rrect(g, -8, -60, 16, 9, 3, "#3d2a1e");
      eyes(g, 0, -41, 3.6, 1.8, o);
      g.fillStyle = "#7a4a2a"; g.fillRect(-5, -36, 10, 2.2);
      // sac sur le dos
      rrect(g, -22, -30, 10, 16, 3, "#6b4a2a");
    }
    g.restore();
  }

  /* ====================== DÉCOR ====================== */
  // d : { t, s, v }, o : { t, alpha, theme }
  function deco(g, d, x, y, o) {
    o = o || {}; var t = o.t || 0, s = d.s || 1, v = d.v || 0;
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha = o.alpha;
    g.scale(s, s);
    var sway = Math.sin(t * 1.2 + v * 9) * 1.5;
    switch (d.t) {
      case "tree": {
        shadow(g, 0, 2, 22, 0.25);
        rrect(g, -4, -26, 8, 26, 3, "#7a5236");
        var leaf = v < 0.33 ? ["#4f9a4e", "#62b25b", "#85cc6c"] : v < 0.66 ? ["#5aa055", "#72bb61", "#98d478"] : ["#d88a3d", "#eca14d", "#f7c56b"];
        circ(g, sway * 0.4, -42, 22, leaf[0]); circ(g, -9 + sway * 0.6, -50, 15, leaf[1]); circ(g, 8 + sway * 0.6, -54, 14, leaf[1]); circ(g, -2 + sway, -60, 11, leaf[2]);
        circ(g, -10 + sway, -58, 4, "rgba(255,255,255,.25)");
        break;
      }
      case "pine": {
        shadow(g, 0, 2, 18, 0.25);
        rrect(g, -3, -16, 6, 16, 2, "#5c3d28");
        var pc = v < 0.5 ? ["#2f6b4a", "#3d8258", "#4f9a66"] : ["#3a6e5d", "#4b8a73", "#63a68b"];
        poly(g, [-20 + sway * 0.3, -14, 20 + sway * 0.3, -14, sway * 0.6, -44], pc[0]);
        poly(g, [-16 + sway * 0.5, -32, 16 + sway * 0.5, -32, sway, -60], pc[1]);
        poly(g, [-11 + sway * 0.7, -50, 11 + sway * 0.7, -50, sway * 1.2, -74], pc[2]);
        break;
      }
      case "bush": {
        shadow(g, 0, 1, 15, 0.22);
        circ(g, -7, -9, 10, "#4f9a4e"); circ(g, 7, -9, 10, "#5aa655"); circ(g, 0, -15, 11, "#6dba62");
        if (v > 0.5) { circ(g, -5, -16, 2.2, "#ff7b9c"); circ(g, 6, -12, 2.2, "#fff1a8"); circ(g, 1, -20, 2, "#ff7b9c"); }
        break;
      }
      case "rock": {
        shadow(g, 0, 1, 16, 0.25);
        poly(g, [-16, 0, -14, -12, -4, -20, 10, -17, 16, -6, 12, 0], "#9097a8", "#5c6272", 2);
        poly(g, [-14, -12, -4, -20, 10, -17, 2, -11], "#b8bfcd");
        break;
      }
      case "cliff": {
        poly(g, [-24, 4, -22, -34, -8, -50, 14, -46, 24, -28, 22, 4], "#8590a8", "#565f78", 2);
        poly(g, [-22, -34, -8, -50, 14, -46, 2, -32], "#aab3c8");
        poly(g, [6, -10, 22, -28, 22, 4, 10, 4], "#6d7790");
        break;
      }
      case "crystal": {
        shadow(g, 0, 1, 14, 0.22);
        var cc = v < 0.5 ? ["#8fe6ff", "#c9f5ff", "#4fb6dd"] : ["#c79bff", "#ead9ff", "#8a5cc7"];
        glow(g, 0, -18, 26, cc[0], 0.25 + Math.sin(t * 2 + v * 7) * 0.1);
        poly(g, [-4, 0, -9, -22, -3, -38, 4, -24, 3, 0], cc[0], cc[2], 1.5);
        poly(g, [2, 0, 6, -16, 13, -24, 12, -6, 8, 0], cc[2]);
        poly(g, [-9, -22, -3, -38, -1, -24], cc[1]);
        break;
      }
      case "mushroom": {
        shadow(g, 0, 1, 14, 0.22);
        rrect(g, -4, -16, 8, 16, 3, "#efe4d0");
        var mc = v < 0.5 ? "#d9534f" : "#9b6cff";
        g.fillStyle = mc; g.beginPath(); g.ellipse(0, -16, 15, 11, 0, Math.PI, TAU); g.fill();
        circ(g, -6, -21, 2.5, "#fff"); circ(g, 4, -24, 2, "#fff"); circ(g, 7, -18, 1.6, "#fff");
        if (v >= 0.5) glow(g, 0, -18, 20, "rgba(155,108,255,.5)", 0.4 + Math.sin(t * 2) * 0.15);
        break;
      }
      case "rune": {
        shadow(g, 0, 1, 12, 0.25);
        poly(g, [-9, 0, -10, -28, -2, -36, 8, -32, 9, 0], "#7f8798", "#4f5566", 2);
        var rg = 0.5 + Math.sin(t * 2.5 + v * 5) * 0.4;
        g.strokeStyle = "rgba(127,246,255," + rg + ")"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-4, -24); g.lineTo(0, -16); g.lineTo(4, -24); g.moveTo(0, -16); g.lineTo(0, -8); g.stroke();
        glow(g, 0, -16, 16, "rgba(127,246,255,.6)", rg * 0.5);
        break;
      }
      case "house": {
        // occupe 2 × 2 cases ; x, y = centre de la case avant
        var walls = ["#f1e3c6", "#e8d1b0", "#f3dccf", "#e4e8f0"][Math.floor(v * 4) % 4];
        var roof = ["#c8553d", "#4d7bbf", "#8a5cc7", "#3f8a5a"][Math.floor(v * 4) % 4];
        g.translate(0, -24);
        poly(g, [-48, 0, 0, 24, 0, -24, -48, -48], shade(walls, -0.12), "#5a4630", 2);
        poly(g, [0, 24, 48, 0, 48, -48, 0, -24], walls, "#5a4630", 2);
        rrect(g, 14, -18, 14, 22, 3, "#7a5236");
        rrect(g, -32, -30, 12, 10, 2, "#9fd4ff");
        poly(g, [-56, -42, 0, -14, 0, -76, -24, -96], shade(roof, -0.15), "#4a2a20", 2);
        poly(g, [0, -14, 56, -42, 24, -96, 0, -76], roof, "#4a2a20", 2);
        poly(g, [-24, -96, 24, -96, 0, -76], shade(roof, 0.2));
        rrect(g, 28, -88, 8, 18, 2, "#7a6a60");
        if (Math.sin(t * 2 + v * 4) > -0.3) circ(g, 32 + Math.sin(t * 2) * 2, -96 - ((t * 10) % 14), 3, "rgba(255,255,255,.45)");
        break;
      }
      case "fountain": {
        shadow(g, 0, 2, 28, 0.25);
        ell(g, 0, -4, 30, 15, "#b9b3a6"); ell(g, 0, -8, 26, 12, "#d8d2c4"); ell(g, 0, -8, 21, 9, "#4fb6dd");
        rrect(g, -4, -34, 8, 26, 3, "#d8d2c4");
        glow(g, 0, -40, 26, "rgba(95,211,192,.8)", 0.5 + Math.sin(t * 2) * 0.2);
        for (var i = 0; i < 5; i++) { var a = t * 1.5 + i * TAU / 5; circ(g, Math.cos(a) * 12, -34 + Math.sin(a * 2) * 6 - ((t * 20 + i * 7) % 18), 2, "#c9fff5"); }
        poly(g, [0, -52, 6, -42, 0, -34, -6, -42], "#7ff6ff", "#fff", 1.5);
        break;
      }
      case "lamp": {
        shadow(g, 0, 1, 8, 0.25);
        g.fillStyle = "#4a3a2a"; g.fillRect(-2, -38, 4, 38);
        rrect(g, -6, -48, 12, 12, 3, "#4a3a2a");
        rrect(g, -4, -46, 8, 8, 2, "#ffe08a");
        glow(g, 0, -42, 24, "rgba(255,224,138,.8)", 0.5 + Math.sin(t * 3 + v) * 0.1);
        break;
      }
      case "crate": {
        shadow(g, 0, 1, 14, 0.22);
        poly(g, [-14, -8, 0, -1, 0, -21, -14, -28], "#a8743f", "#5a3a1a", 1.5);
        poly(g, [0, -1, 14, -8, 14, -28, 0, -21], "#c98f5c", "#5a3a1a", 1.5);
        poly(g, [-14, -28, 0, -21, 14, -28, 0, -35], "#dba66e", "#5a3a1a", 1.5);
        break;
      }
      case "fence": {
        g.fillStyle = "#a8743f";
        for (var f = -1; f <= 1; f++) rrect(g, f * 12 - 2, -24, 5, 24, 2, "#a8743f");
        g.fillRect(-16, -18, 32, 4); g.fillRect(-16, -9, 32, 4);
        break;
      }
      case "pillar": {
        shadow(g, 0, 1, 16, 0.3);
        rrect(g, -13, -10, 26, 10, 3, "#3e3560");
        rrect(g, -9, -62, 18, 54, 3, "#6d6290");
        rrect(g, -9, -62, 6, 54, 2, "#857aa8");
        rrect(g, -13, -68, 26, 8, 3, "#3e3560");
        var pg = 0.5 + Math.sin(t * 2 + v * 6) * 0.4;
        g.fillStyle = "rgba(211,108,255," + pg + ")"; g.fillRect(-2, -48, 4, 20);
        break;
      }
      case "portal": {
        var pgl = 0.6 + Math.sin(t * 3) * 0.3;
        glow(g, 0, -20, 34, o.locked ? "rgba(255,90,90,.6)" : "rgba(160,120,255,.8)", pgl);
        g.strokeStyle = o.locked ? "#ff8a8a" : "#c9b2ff"; g.lineWidth = 3;
        g.beginPath(); g.ellipse(0, -2, 22, 10, 0, 0, TAU); g.stroke();
        for (var k = 0; k < 6; k++) { var pa = t * 2 + k * TAU / 6; circ(g, Math.cos(pa) * 18, -4 - ((t * 24 + k * 9) % 40), 2, o.locked ? "#ffb0b0" : "#e9dcff"); }
        break;
      }
    }
    g.restore();
  }

  /* ====================== SOL ====================== */
  function diamond(g, x, y, hw, hh) { g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hw, y); g.lineTo(x, y + hh); g.lineTo(x - hw, y); g.closePath(); }

  /* ====================== ICÔNES ====================== */
  var iconCache = {};
  function icon(key, size, draw) {
    var k = key + "@" + size;
    if (iconCache[k]) return iconCache[k];
    var c = document.createElement("canvas"); c.width = c.height = size * 2;
    var g = c.getContext("2d"); g.scale(2, 2);
    draw(g, size);
    iconCache[k] = c.toDataURL();
    return iconCache[k];
  }
  function heroIcon(cls, size) {
    return icon("h-" + cls, size, function (g, s) {
      var gr = g.createLinearGradient(0, 0, 0, s);
      var bg = { bastion: ["#3a4f9a", "#1a2550"], prisme: ["#6e3fb0", "#2a1446"], voltige: ["#ff8a6a", "#7a2a22"], sibylle: ["#2fa37a", "#134a39"], clarine: ["#ffd27d", "#9a6f1a"], orage: ["#a3335c", "#2a0a18"], ondine: ["#4fb6dd", "#0f2a4a"] }[cls];
      gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]);
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      hero(g, cls, s / 2, s * 1.12, { t: 0.6, flip: 1, scale: s / 52, noShadow: true });
    });
  }
  function summonIcon(cls, size) {
    return icon("sm-" + cls, size, function (g, s) {
      var gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, "#2fa37a"); gr.addColorStop(1, "#17233a");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      summon(g, cls, s / 2, s * 1.05, { t: 0.6, scale: s / (cls === "dame" ? 62 : 48), noShadow: true });
    });
  }
  function mobIcon(type, size, col, elite) {
    return icon("m-" + type + (elite ? "e" : ""), size, function (g, s) {
      g.fillStyle = elite ? "#4a3a12" : "#2a2342"; g.fillRect(0, 0, s, s);
      mob(g, type, s / 2, s * (type === "archonte" ? 1.25 : 0.92), { t: 0.6, col: col, scale: s / (type === "archonte" ? 76 : 44), noShadow: true });
    });
  }
  var SLOT_GLYPH = {
    arme: function (g, s, c) { poly(g, [s * .5, s * .12, s * .6, s * .62, s * .5, s * .72, s * .4, s * .62], c, "#1b1530", 1.5); g.fillStyle = "#1b1530"; g.fillRect(s * .3, s * .7, s * .4, s * .07); g.fillRect(s * .46, s * .76, s * .08, s * .14); },
    coiffe: function (g, s, c) { poly(g, [s * .2, s * .7, s * .26, s * .34, s * .5, s * .18, s * .74, s * .34, s * .8, s * .7], c, "#1b1530", 1.5); g.fillStyle = "#1b1530"; g.fillRect(s * .3, s * .5, s * .4, s * .06); },
    cape: function (g, s, c) { poly(g, [s * .32, s * .2, s * .68, s * .2, s * .82, s * .82, s * .5, s * .74, s * .18, s * .82], c, "#1b1530", 1.5); },
    amulette: function (g, s, c) { g.strokeStyle = "#1b1530"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(s * .25, s * .18); g.quadraticCurveTo(s * .5, s * .6, s * .75, s * .18); g.stroke(); poly(g, [s * .5, s * .45, s * .64, s * .62, s * .5, s * .82, s * .36, s * .62], c, "#1b1530", 1.5); },
    anneau: function (g, s, c) { g.strokeStyle = c; g.lineWidth = s * .12; g.beginPath(); g.arc(s * .5, s * .58, s * .22, 0, TAU); g.stroke(); poly(g, [s * .5, s * .18, s * .62, s * .3, s * .5, s * .42, s * .38, s * .3], "#fff", "#1b1530", 1.2); },
    bottes: function (g, s, c) { poly(g, [s * .3, s * .18, s * .54, s * .18, s * .54, s * .6, s * .82, s * .66, s * .82, s * .82, s * .3, s * .82], c, "#1b1530", 1.5); },
  };
  function itemIcon(slot, rarityCol, size) {
    return icon("i-" + slot + rarityCol, size, function (g, s) {
      var gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s * 0.7);
      gr.addColorStop(0, shade(rarityCol, -0.35)); gr.addColorStop(1, shade(rarityCol, -0.75));
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      (SLOT_GLYPH[slot] || SLOT_GLYPH.arme)(g, s, rarityCol);
    });
  }
  var SPELL_COL = { impact: "#4d64b0", rempart: "#f2c14e", mur: "#8a93b8", attraction: "#5bc0ff", forteresse: "#ffd257",
    rayon: "#b98cff", balise: "#7ff6ff", transpo: "#3fe0d0", onde: "#7dffb0", convergence: "#9ff3ff",
    bond: "#ff8a6a", frappe: "#3fe8ff", fantome: "#a7b0c0", brume: "#c7c9e8", danse: "#ffb347",
    pion: "#7df0c2", promotion: "#c98a3a", sacrifice: "#ff7b9c", roque: "#f4ecd8", maree: "#2fd29a", pointe: "#7df0c2", ravage: "#2fd29a",
    lueur: "#ffd27d", eclat: "#ff9a3c", benediction: "#ff8aa8", rayonnement: "#ffb347", aurore: "#ffe08a",
    foudre: "#e0c060", fracas: "#b8c4d6", trombe: "#c9b2ff", transe: "#ff5a6a", jugement: "#ffd257",
    vague: "#4fb6dd", geyser: "#bff0ff", deferlante: "#2a6fb8", rosee: "#7dffb0", razdemaree: "#8fe6ff" };
  function spellIcon(sid, size) {
    return icon("s-" + sid, size, function (g, s) {
      var c = SPELL_COL[sid] || "#fff";
      var gr = g.createLinearGradient(0, 0, s, s);
      gr.addColorStop(0, shade(c, -0.45)); gr.addColorStop(1, shade(c, -0.8));
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.save(); g.translate(s / 2, s / 2); g.scale(s / 40, s / 40);
      g.lineWidth = 3; g.strokeStyle = c; g.fillStyle = c; g.lineCap = "round"; g.lineJoin = "round";
      var L = function (a) { g.beginPath(); g.moveTo(a[0], a[1]); for (var i = 2; i < a.length; i += 2) g.lineTo(a[i], a[i + 1]); g.stroke(); };
      switch (sid) {
        case "impact": rrect(g, -14, -6, 18, 12, 2, c); L([6, -10, 14, 0, 6, 10]); break;
        case "rempart": poly(g, [0, -14, 12, -8, 12, 4, 0, 14, -12, 4, -12, -8], null, c, 3); poly(g, [0, -7, 6, -4, 6, 2, 0, 7, -6, 2, -6, -4], c); break;
        case "mur": rrect(g, -14, -2, 12, 14, 1, c); rrect(g, 2, -2, 12, 14, 1, c); rrect(g, -6, -15, 12, 11, 1, shade(c, 0.3)); break;
        case "attraction": L([14, 0, -8, 0]); L([-2, -6, -8, 0, -2, 6]); circ(g, 14, 0, 4, c); g.beginPath(); g.arc(-12, 0, 5, 0, TAU); g.stroke(); break;
        case "forteresse": poly(g, [-14, 12, -14, -6, -8, -6, -8, -12, -2, -12, -2, -6, 2, -6, 2, -12, 8, -12, 8, -6, 14, -6, 14, 12], c); rrect(g, -4, 2, 8, 10, 3, shade(c, -0.6)); break;
        case "rayon": L([-12, 12, 12, -12]); circ(g, 12, -12, 4, "#fff"); L([-6, 12, 12, -6]); break;
        case "balise": poly(g, [0, -15, 8, 0, 0, 15, -8, 0], c, "#fff", 1.5); poly(g, [0, -15, 8, 0, 0, 0], "#fff"); break;
        case "transpo": poly(g, [-12, -4, -6, -12, 0, -4], c); poly(g, [0, 4, 6, 12, 12, 4], c); L([-6, -6, -6, 6, 6, 6]); L([2, 2, 6, 6, 2, 10]); break;
        case "onde": g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.stroke(); rrect(g, -3, -9, 6, 18, 2, c); rrect(g, -9, -3, 18, 6, 2, c); break;
        case "convergence": L([-13, -13, 13, 13]); L([-13, 13, 13, -13]); circ(g, 0, 0, 5, "#fff"); break;
        case "bond": L([-12, 12, -12, -4, 4, -4]); L([0, -10, 6, -4, 0, 2]); circ(g, -12, 12, 3, c); break;
        case "frappe": L([-12, 12, 10, -10]); L([-4, -12, 0, -4, -6, -2, 4, 12]); break;
        case "fantome": g.globalAlpha = 0.5; circ(g, -6, 0, 7, c); g.globalAlpha = 1; circ(g, 6, -2, 7, c); L([-14, 12, 14, 12]); break;
        case "brume": circ(g, -6, 2, 8, c); circ(g, 6, 0, 9, c); circ(g, 0, -6, 8, shade(c, 0.3)); break;
        case "danse": L([-14, 12, -14, 2, -8, 2]); L([-6, 0, -6, -8, 2, -8]); L([4, -10, 4, -14, 12, -14]); circ(g, 12, -14, 3, "#fff"); break;
        case "pion": case "pointe": poly(g, [-9, 12, 9, 12, 5, 0, -5, 0], c); circ(g, 0, -7, 7, c); if (sid === "pointe") { L([8, -12, 15, -15]); L([11, -15, 15, -15, 15, -11]); } break;
        case "promotion": poly(g, [-10, 12, 10, 12, 6, -2, -6, -2], c); poly(g, [-9, -4, -6, -15, -2, -8, 0, -16, 2, -8, 6, -15, 9, -4], "#fff", c, 1.5); break;
        case "sacrifice": circ(g, 0, 2, 7, c); for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; L([Math.cos(a) * 10, 2 + Math.sin(a) * 10, Math.cos(a) * 15, 2 + Math.sin(a) * 15]); } break;
        case "roque": L([-13, 2, 13, 2]); L([8, -4, 13, 2, 8, 8]); L([-8, -4, -13, 2, -8, 8]); circ(g, -4, -10, 4, c); circ(g, 6, -10, 3, "#fff"); break;
        case "maree": for (var m = 0; m < 3; m++) { var mx = -11 + m * 11; poly(g, [mx - 5, 12, mx + 5, 12, mx + 3, 2, mx - 3, 2], c); circ(g, mx, -3, 4.5, c); } L([-14, -12, -8, -15, -2, -12, 4, -15, 10, -12, 14, -14]); break;
        case "ravage": L([-12, 0, 12, 0]); L([0, -12, 0, 12]); L([-9, -9, 9, 9]); L([-9, 9, 9, -9]); circ(g, 0, 0, 4, "#fff"); break;
        case "lueur": circ(g, 0, 0, 7, c); for (var q = 0; q < 8; q++) { var qa = q * Math.PI / 4; L([Math.cos(qa) * 10, Math.sin(qa) * 10, Math.cos(qa) * (q % 2 ? 13 : 16), Math.sin(qa) * (q % 2 ? 13 : 16)]); } break;
        case "eclat": poly(g, [0, -16, 5, -4, 16, 0, 5, 4, 0, 16, -5, 4, -16, 0, -5, -4], c); poly(g, [0, -7, 3, 0, 0, 7, -3, 0], "#fff"); break;
        case "benediction": poly(g, [0, -14, 12, -8, 12, 4, 0, 14, -12, 4, -12, -8], null, c, 3); L([0, -6, 0, 6]); L([-6, 0, 6, 0]); break;
        case "rayonnement": g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.stroke(); circ(g, 0, 0, 5, c); L([-4, -4, 4, 4]); L([-4, 4, 4, -4]); break;
        case "aurore": g.beginPath(); g.arc(0, 4, 13, Math.PI, TAU); g.stroke(); L([-16, 4, 16, 4]); circ(g, 0, 4, 5, "#fff"); L([0, -14, 0, -9]); L([-10, -10, -7, -7]); L([10, -10, 7, -7]); break;
        case "foudre": poly(g, [2, -16, -8, 2, 0, 2, -3, 16, 9, -4, 1, -4], c, "#fff", 1); break;
        case "fracas": L([-12, 12, 12, -12]); poly(g, [8, -16, 16, -8, 11, -3, 3, -11], "#fff"); L([-6, 2, -10, 6]); L([2, -6, 6, -10]); L([-13, -2, -9, -4]); L([2, 13, 4, 9]); break;
        case "trombe": L([-14, 0, 2, 0]); L([-4, -6, 2, 0, -4, 6]); L([4, -8, 12, -8]); L([4, 0, 14, 0]); L([4, 8, 12, 8]); break;
        case "transe": poly(g, [0, -14, 4, -4, 14, -2, 6, 5, 8, 15, 0, 10, -8, 15, -6, 5, -14, -2, -4, -4], c); circ(g, 0, 1, 3, "#fff"); break;
        case "jugement": for (var j = 0; j < 8; j++) { var ja = j * Math.PI / 4; L([Math.cos(ja) * 4, Math.sin(ja) * 4, Math.cos(ja) * 15, Math.sin(ja) * 15]); } circ(g, 0, 0, 4, "#fff"); break;
        case "vague": g.beginPath(); g.moveTo(-15, 4); g.quadraticCurveTo(-8, -10, 0, 2); g.quadraticCurveTo(8, 12, 15, -2); g.stroke(); g.beginPath(); g.moveTo(-15, 11); g.quadraticCurveTo(-8, -1, 0, 9); g.quadraticCurveTo(8, 17, 15, 6); g.stroke(); break;
        case "geyser": L([0, 14, 0, -4]); L([-8, 14, -8, 2]); L([8, 14, 8, 2]); circ(g, 0, -10, 5, c); circ(g, -8, -3, 3, c); circ(g, 8, -3, 3, c); break;
        case "deferlante": for (var dq = 0; dq < 3; dq++) { g.beginPath(); g.moveTo(-14, -8 + dq * 8); g.quadraticCurveTo(0, -16 + dq * 8, 14, -8 + dq * 8); g.stroke(); } L([8, -12, 14, -8, 8, -4]); break;
        case "rosee": for (var rq = 0; rq < 5; rq++) { var rx = -12 + rq * 6, ry = -8 + (rq % 2) * 8; poly(g, [rx, ry - 5, rx + 3.5, ry + 1, rx, ry + 4, rx - 3.5, ry + 1], c); } break;
        case "razdemaree": g.beginPath(); g.moveTo(-16, 12); g.quadraticCurveTo(-10, -14, 4, -8); g.quadraticCurveTo(12, -4, 2, 2); g.stroke(); g.beginPath(); g.moveTo(-16, 12); g.lineTo(16, 12); g.stroke(); circ(g, 6, -10, 3, "#fff"); break;
      }
      g.restore();
    });
  }

  root.AT_ART = { hero: hero, mob: mob, summon: summon, summonIcon: summonIcon, npc: npc, deco: deco, diamond: diamond, shade: shade, glow: glow, circ: circ, ell: ell, poly: poly, rrect: rrect,
    heroIcon: heroIcon, mobIcon: mobIcon, itemIcon: itemIcon, spellIcon: spellIcon, THEMES: THEMES, HERO_PAL: HERO_PAL, SPELL_COL: SPELL_COL };
})(typeof window !== "undefined" ? window : globalThis);
