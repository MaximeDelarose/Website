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
    village: { top: ["#9ee05f", "#8fd650", "#aee870"], path: ["#f3d58f", "#ebc977"], side: "#5e9a3a", side2: "#48802c", water: "#45b8f0", line: "rgba(30,70,20,.16)" },
    prairie: { top: ["#a6e65c", "#98dc4e", "#b4ee6c"], path: ["#f0cf7e", "#e6c26a"], side: "#63a83a", side2: "#4d8c2c", water: "#3fb4f2", line: "rgba(30,70,20,.16)" },
    bois: { top: ["#4fb86a", "#45aa5e", "#5cc676"], path: ["#c9a062", "#bd9255"], side: "#2f7f46", side2: "#236536", water: "#2f9fd0", line: "rgba(10,50,20,.18)" },
    falaises: { top: ["#b8d2f0", "#a9c6ea", "#c6dcf5"], path: ["#eadfc6", "#dfd2b4"], side: "#6f8ab8", side2: "#566e98", water: "#5fe0ff", line: "rgba(30,50,90,.14)" },
    donjon: { top: ["#5d527c", "#564b74", "#655a86"], path: ["#6d6290", "#655a86"], side: "#3a3156", side2: "#2a2342", water: "#9f6cff", line: "rgba(255,255,255,.06)" },
    marais: { top: ["#3fa37a", "#36966e", "#4ab086"], path: ["#a08a58", "#927c4e"], side: "#236e4f", side2: "#19533c", water: "#2fd6c0", line: "rgba(10,50,30,.18)" },
    nuages: { top: ["#f3eefc", "#ebe4f8", "#faf6ff"], path: ["#ffd9ec", "#ffcde6"], side: "#c9b8e8", side2: "#b3a0d9", water: "#9fd8ff", line: "rgba(120,90,160,.10)" },
    confiserie: { top: ["#ffd3e6", "#ffc6de", "#ffe0ee"], path: ["#fff1c2", "#ffe9a8"], side: "#e08ab0", side2: "#c96a94", water: "#ff8ab4", line: "rgba(160,60,110,.10)" },
    horloge: { top: ["#3b4a66", "#34425c", "#425272"], path: ["#5a6a86", "#4f5e78"], side: "#222c40", side2: "#161d2c", water: "#d9a441", line: "rgba(217,164,65,.14)" },
  };

  function ell(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); }
  var STROKE = 1;   // multiplicateur des contours (plus épais sur les héros, façon dessin animé)
  function poly(g, pts, col, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    if (col) { g.fillStyle = col; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = (lw || 2) * STROKE; g.lineJoin = "round"; g.stroke(); }
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
    var skin = o.gear && o.gear.skin && SKIN_PAL[o.gear.skin];
    if (skin) { var P2 = {}; for (var pk in P) P2[pk] = P[pk]; P2.main = skin.main; P2.dark = skin.dark; P2.light = skin.light; P = P2; }
    g.save();
    g.translate(x, y);
    if (!o.noShadow) shadow(g, 0, 0, 17 * s, 0.3);
    if (skin && !o.noAura) aura(g, skin.aura, t, s);
    STROKE = 1.6;
    var bob = Math.sin(t * 3.2) * 1.4, hop = 0, lean = 0;
    if (o.walk != null) { hop = -Math.abs(Math.sin(o.walk * Math.PI)) * 5; bob = 0; lean = 0.06; }
    if (o.win) hop = -Math.abs(Math.sin(t * 6)) * 9;
    var sq = 1 + (o.cast ? Math.sin(o.cast * Math.PI) * 0.08 : 0) - (o.hurt ? o.hurt * 0.1 : 0);
    g.translate(0, hop + bob * 0.4);
    g.scale(s * (o.flip || 1) / sq * (o.hurt ? 1 + o.hurt * 0.06 : 1), s * sq);
    g.rotate((o.flip || 1) < 0 ? -lean : lean);
    if (o.hurt) g.translate(-o.hurt * 4, 0);
    var G = o.gear || {};
    if (G.cape) gearCape(g, G.cape, t, o);
    if (cls === "bastion") drawBastion(g, P, t, o, bob);
    else if (cls === "prisme") drawPrisme(g, P, t, o, bob);
    else if (cls === "sibylle") drawSibylle(g, P, t, o, bob);
    else if (cls === "clarine") drawClarine(g, P, t, o, bob);
    else if (cls === "orage") drawOrage(g, P, t, o, bob);
    else if (cls === "ondine") drawOndine(g, P, t, o, bob);
    else drawVoltige(g, P, t, o, bob);
    if (G.bottes) gearBoots(g, G.bottes, t, o);
    if (G.amulette) gearAmulet(g, G.amulette, t, o);
    if (G.anneau) gearRing(g, G.anneau, t, o);
    if (G.coiffe) gearHat(g, G.coiffe, t, o, cls === "bastion" ? -70 : cls === "orage" || cls === "ondine" ? -66 : -62);
    if (G.arme) gearWeapon(g, G.arme, t, o, cls);
    if (skin && !o.noAura) auraFront(g, skin.aura, t, s);
    STROKE = 1;
    if (o.hurt > 0.3) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,255,255," + (o.hurt * 0.7) + ")"; g.fillRect(-40, -80, 80, 90); g.globalCompositeOperation = "source-over"; }
    g.restore();
  }
  // ---- tenues (skins) : palette + aura au sol et autour ----
  var SKIN_PAL = {
    royal: { main: "#d4a62a", dark: "#8a5f0e", light: "#ffe28a", aura: "royal" },
    astral: { main: "#5b2d8e", dark: "#2a1446", light: "#c77dff", aura: "astral" },
    infernal: { main: "#b3261e", dark: "#5c0f0a", light: "#ff8a4a", aura: "infernal" },
    givre: { main: "#4fb6dd", dark: "#1f5f8a", light: "#dff6ff", aura: "givre" },
    ombre: { main: "#1b1530", dark: "#09060f", light: "#5b4a9e", aura: "ombre" },
  };
  function aura(g, kind, t, s) {
    g.save(); g.scale(s, s);
    if (kind === "royal") {
      glow(g, 0, -4, 40, "rgba(255,215,90,.9)", 0.55 + Math.sin(t * 3) * 0.1);
      g.strokeStyle = "rgba(255,230,140,.9)"; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, 30, 13, 0, 0, TAU); g.stroke();
      for (var i = 0; i < 10; i++) { var a = t * 1.2 + i * TAU / 10, r = 30; sparkle(g, Math.cos(a) * r, Math.sin(a) * r * 0.45 - ((t * 30 + i * 17) % 60), t + i, i % 2 ? "#fff" : "#ffd257"); }
    } else if (kind === "astral") {
      glow(g, 0, -4, 40, "rgba(160,110,255,.8)", 0.5);
      for (var j = 0; j < 7; j++) { var b = t * 1.6 + j * TAU / 7; sparkle(g, Math.cos(b) * 34, -20 + Math.sin(b) * 14 + Math.sin(t * 2 + j) * 4, t + j, j % 2 ? "#fff" : "#c77dff"); }
    } else if (kind === "infernal") {
      glow(g, 0, -2, 38, "rgba(255,110,40,.85)", 0.55);
      for (var k = 0; k < 9; k++) { var fa = k * TAU / 9 + t * 0.4, fx = Math.cos(fa) * 28, fy = Math.sin(fa) * 11, fh = 14 + Math.sin(t * 9 + k * 2) * 7; poly(g, [fx - 5, fy, fx, fy - fh, fx + 5, fy], k % 2 ? "#ff8a4a" : "#ffd257"); }
    } else if (kind === "givre") {
      glow(g, 0, -4, 40, "rgba(120,220,255,.8)", 0.5);
      for (var m = 0; m < 6; m++) { var ga = m * TAU / 6 + t * 0.3; g.save(); g.translate(Math.cos(ga) * 30, Math.sin(ga) * 12); g.rotate(t); poly(g, [0, -9, 4, 0, 0, 9, -4, 0], "#dff6ff", "#4fb6dd", 1); g.restore(); }
      for (var n = 0; n < 8; n++) circ(g, Math.sin(t * 0.7 + n * 2) * 30, -10 - ((t * 14 + n * 9) % 70), 1.8, "#fff");
    } else if (kind === "ombre") {
      glow(g, 0, -6, 44, "rgba(80,40,140,.9)", 0.7);
      for (var q = 0; q < 6; q++) { var oa = t * 0.9 + q * TAU / 6; circ(g, Math.cos(oa) * 26, -8 + Math.sin(oa) * 10, 7 + Math.sin(t * 3 + q) * 2, "rgba(60,30,110,.55)"); }
    }
    g.restore();
  }
  function auraFront(g, kind, t, s) {
    g.save(); g.scale(s, s);
    if (kind === "royal") { var cy = -78 + Math.sin(t * 2) * 2; glow(g, 0, cy, 14, "rgba(255,230,140,.9)", 0.8); poly(g, [-9, cy + 4, 9, cy + 4, 9, cy - 4, 5, cy, 2, cy - 8, 0, cy - 2, -2, cy - 8, -5, cy, -9, cy - 4], "#ffd257", "#9a6f1a", 1); }
    if (kind === "ombre") { var e = 0.7 + Math.sin(t * 5) * 0.3; g.fillStyle = "rgba(200,120,255," + e + ")"; g.fillRect(-6, -47, 4, 2); g.fillRect(2, -47, 4, 2); }
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
  // corps d'une invocation (animaux d'encre), aux pieds en (x, y)
  function summonBody(g, cls, x, y, s, t, P) {
    g.save(); g.translate(x, y); g.scale(s, s);
    var w = Math.sin(t * 3) * 1.5, I = P.ink, M = P.mint;
    var eye = function (ex, ey) { circ(g, ex, ey, 2.6, M); circ(g, ex + 0.6, ey - 0.6, 1, "#fff"); };
    if (cls === "ecureuil") {
      // queue en panache, petit corps rond
      g.fillStyle = I; g.beginPath(); g.moveTo(-8, -6); g.quadraticCurveTo(-30, -14 + w, -22, -40 + w); g.quadraticCurveTo(-10, -44 + w, -10, -22); g.closePath(); g.fill();
      ell(g, 0, -12, 11, 10, I); circ(g, 6, -24, 8, I); poly(g, [0, -30, 3, -38, 6, -30], I); poly(g, [8, -30, 11, -38, 13, -30], I);
      eye(8, -25); circ(g, 13, -22, 1.5, "#ff8ab4"); ell(g, 2, -8, 5, 3, "rgba(255,255,255,.2)");
    } else if (cls === "herisson") {
      for (var i = 0; i < 9; i++) { var a = Math.PI + i * Math.PI / 8; poly(g, [Math.cos(a) * 10, -12 + Math.sin(a) * 8, Math.cos(a) * 22 + w, -12 + Math.sin(a) * 18, Math.cos(a + 0.2) * 10, -12 + Math.sin(a + 0.2) * 8], I); }
      ell(g, 0, -11, 14, 10, I); ell(g, 10, -8, 7, 5, shade(I, 0.25));
      eye(11, -10); circ(g, 16, -7, 1.6, "#1b1530");
    } else if (cls === "lama") {
      rrect(g, -12, -8, 5, 8, 2, I); rrect(g, 7, -8, 5, 8, 2, I);
      ell(g, 0, -16, 16, 9, I);
      rrect(g, 8, -40 + w, 7, 26, 3, I); ell(g, 12, -42 + w, 8, 6, I); poly(g, [8, -46 + w, 10, -53 + w, 13, -46 + w], I); poly(g, [14, -46 + w, 17, -53 + w, 18, -46 + w], I);
      eye(15, -43 + w); ell(g, 19, -40 + w, 2.5, 1.5, "#ff8ab4");
      for (var f = 0; f < 4; f++) circ(g, -10 + f * 6, -24, 3.5, shade(I, 0.2));
    } else if (cls === "hibou") {
      var fy = -20 + Math.sin(t * 2.5) * 3;
      ell(g, 0, fy, 11, 14, I);
      [-1, 1].forEach(function (sd) { g.save(); g.translate(sd * 9, fy - 4); g.rotate(sd * (0.4 + Math.sin(t * 8) * 0.35)); ell(g, sd * 8, 0, 10, 5, I); g.restore(); });
      circ(g, 0, fy - 12, 9, I); poly(g, [-8, fy - 18, -6, fy - 26, -2, fy - 19], I); poly(g, [8, fy - 18, 6, fy - 26, 2, fy - 19], I);
      circ(g, -3.5, fy - 13, 4, "#fff"); circ(g, 3.5, fy - 13, 4, "#fff"); circ(g, -3.5, fy - 13, 2, M); circ(g, 3.5, fy - 13, 2, M);
      poly(g, [-2, fy - 9, 2, fy - 9, 0, fy - 6], "#ff9a3c");
    } else if (cls === "ours") {
      rrect(g, -14, -10, 9, 10, 3, I); rrect(g, 5, -10, 9, 10, 3, I);
      rrect(g, -20, -42 + w, 40, 34, 12, I); ell(g, 0, -20 + w, 11, 8, shade(I, 0.2));
      circ(g, 0, -46 + w, 12, I); circ(g, -9, -55 + w, 4, I); circ(g, 9, -55 + w, 4, I);
      eye(-4, -47 + w); eye(4, -47 + w); ell(g, 0, -41 + w, 4, 2.5, shade(I, 0.4));
      rrect(g, -26, -36 + w, 8, 18, 4, I); rrect(g, 18, -36 + w, 8, 18, 4, I);
    } else if (cls === "phenix") {
      var py = -26 + Math.sin(t * 2.2) * 4;
      glow(g, 0, py, 26, "rgba(255,154,60,.7)", 0.6);
      [-1, 1].forEach(function (sd) { g.save(); g.translate(sd * 6, py); g.rotate(sd * (-0.5 + Math.sin(t * 9) * 0.3)); poly(g, [0, 0, sd * 26, -12, sd * 28, -2, sd * 22, 6, sd * 10, 8], "#ff6f3c"); poly(g, [0, 0, sd * 18, -8, sd * 14, 4], "#ffd257"); g.restore(); });
      ell(g, 0, py, 9, 11, "#ff6f3c"); circ(g, 0, py - 11, 7, "#ff8a4a"); poly(g, [-5, py - 18, 0, py - 26, 5, py - 18], "#ffd257");
      eye(-2.5, py - 12); eye(2.5, py - 12); poly(g, [-2, py - 8, 2, py - 8, 0, py - 5], "#ffd257");
      for (var k = 0; k < 3; k++) { var ta = t * 4 + k; g.strokeStyle = k ? "#ffd257" : "#ff6f3c"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, py + 8); g.quadraticCurveTo(-6 - k * 4, py + 18 + Math.sin(ta) * 3, -2 - k * 6, py + 30); g.stroke(); }
    } else if (cls === "pion") {
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
    summonBody(g, cls, 0, 0, cls === "ours" ? 1 : cls === "dame" ? 0.95 : 0.85, t + (o.seed || 0), P);
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

  /* ====================== ÉQUIPEMENT VISIBLE (gros et rigolo) ====================== */
  var RCOL = ["#c9ccd6", "#5fb7ff", "#ffd257", "#c77dff", "#ff9a3c"];
  function rc(it) { return RCOL[it.r] || RCOL[0]; }
  function sparkle(g, x, y, t, col) { var k = 0.5 + Math.sin(t * 5) * 0.5; poly(g, [x, y - 4 * k, x + 2 * k, y, x, y + 4 * k, x - 2 * k, y], col || "#fff"); }
  // ---- coiffes : posées sur le haut de la tête (y = top) ----
  function gearHat(g, it, t, o, top) {
    var c = rc(it), d = shade(c, -0.4), l = shade(c, 0.35);
    g.save(); g.translate(0, top);
    switch (it.look % 10) {
      case 0: // casque à cornes
        poly(g, [-12, 6, 12, 6, 11, -4, 0, -9, -11, -4], "#8a8fa3", "#3a3e4c", 1.5);
        poly(g, [-10, -2, -16, -10, -26, -22, -22, -4, -12, 4], c, d, 1.5); poly(g, [10, -2, 16, -10, 26, -22, 22, -4, 12, 4], c, d, 1.5);
        break;
      case 1: // chapeau champignon
        g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 24, 14, 0, Math.PI, TAU); g.fill(); g.strokeStyle = d; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = "#fff"; g.beginPath(); g.ellipse(0, 1, 24, 4, 0, 0, Math.PI); g.fill();
        circ(g, -10, -6, 3.5, "#fff"); circ(g, 6, -9, 3, "#fff"); circ(g, 14, -3, 2.5, "#fff"); circ(g, -2, -2, 2, "#fff");
        break;
      case 2: // citrouille
        for (var i = -2; i <= 2; i++) ell(g, i * 6, -2, 8, 12, i % 2 ? shade("#ff8c2a", -0.1) : "#ff8c2a");
        g.strokeStyle = "#8a3a0a"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -2, 20, 12, 0, 0, TAU); g.stroke();
        rrect(g, -2, -18, 5, 7, 2, "#4f7a2a");
        poly(g, [-8, -6, -4, -1, -11, -1], "#3a1a08"); poly(g, [8, -6, 11, -1, 4, -1], "#3a1a08"); poly(g, [-7, 4, 7, 4, 4, 8, 1, 5, -2, 8, -5, 5], "#3a1a08");
        glow(g, 0, 0, 22, c, 0.3);
        break;
      case 3: // seau renversé
        poly(g, [-16, 4, 16, 4, 12, -20, -12, -20], "#9aa3b8", "#4b5266", 1.5); g.fillStyle = "#6f788c"; g.fillRect(-13, -22, 26, 4);
        g.strokeStyle = d; g.lineWidth = 3; g.beginPath(); g.arc(0, -20, 12, Math.PI, TAU); g.stroke();
        break;
      case 4: // couronne géante
        poly(g, [-20, 4, 20, 4, 20, -14, 12, -4, 6, -22, 0, -6, -6, -22, -12, -4, -20, -14], c, d, 1.5);
        circ(g, 0, -4, 3.5, "#ff5a6a"); circ(g, -12, -2, 2.5, "#5fd3c0"); circ(g, 12, -2, 2.5, "#5fd3c0");
        break;
      case 5: // chapeau pointu XXL
        ell(g, 0, 2, 26, 7, d); poly(g, [-14, 2, 14, 2, 4, -44 + Math.sin(t * 2) * 2, -2, -30], c, d, 1.5);
        g.fillStyle = l; g.fillRect(-13, -4, 26, 4); sparkle(g, 4, -44 + Math.sin(t * 2) * 2, t);
        break;
      case 6: // poisson sur la tête
        g.save(); g.rotate(-0.25);
        poly(g, [-18, 0, -8, -9, 10, -9, 20, -2, 10, 5, -8, 5], "#5fb6e6", "#1f5f8a", 1.5); poly(g, [20, -2, 30, -10, 28, 6], "#5fb6e6", "#1f5f8a", 1.5);
        circ(g, -8, -3, 2.5, "#fff"); circ(g, -8, -3, 1.2, "#000"); g.fillStyle = c; g.fillRect(-2, -9, 10, 3);
        g.restore();
        break;
      case 7: // nid d'oiseau
        ell(g, 0, 2, 18, 7, "#8a5a3b"); ell(g, 0, 0, 16, 5, "#c98f5c");
        g.strokeStyle = "#6b4a2a"; g.lineWidth = 1.2; for (var n = -3; n <= 3; n++) { g.beginPath(); g.moveTo(n * 5, 2); g.lineTo(n * 5 + 3, 7); g.stroke(); }
        var hop = Math.abs(Math.sin(t * 4)) * 3;
        circ(g, 0, -8 - hop, 6, c); circ(g, 5, -11 - hop, 4, c); poly(g, [8, -11 - hop, 13, -10 - hop, 8, -9 - hop], "#ff9a3c"); circ(g, 6, -12 - hop, 1, "#000");
        break;
      case 8: // abat-jour
        poly(g, [-22, 4, 22, 4, 14, -20, -14, -20], c, d, 1.5); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(-18, -8, 36, 3);
        glow(g, 0, 8, 26, "rgba(255,230,160,.8)", 0.5 + Math.sin(t * 3) * 0.1);
        break;
      default: // bonnet à pompon
        g.fillStyle = c; g.beginPath(); g.moveTo(-16, 4); g.quadraticCurveTo(-14, -26, 10, -30); g.quadraticCurveTo(22, -16, 16, 4); g.closePath(); g.fill(); g.strokeStyle = d; g.lineWidth = 1.5; g.stroke();
        rrect(g, -17, -2, 34, 8, 4, "#f4ecd8"); circ(g, 12 + Math.sin(t * 3) * 2, -32, 7, "#f4ecd8");
    }
    g.restore();
  }
  // ---- capes : derrière le corps ----
  function gearCape(g, it, t, o) {
    var c = rc(it), d = shade(c, -0.4), fl = Math.sin(t * 2.5) * 3;
    g.save();
    switch (it.look % 8) {
      case 0: // ailes de dragon
        [-1, 1].forEach(function (sd) {
          var wf = Math.sin(t * 3) * 4;
          poly(g, [sd * 8, -34, sd * 34, -56 + wf, sd * 42, -30 + wf, sd * 36, -20, sd * 24, -12, sd * 10, -14], "#7a2a3a", "#3a1020", 2);
          g.strokeStyle = "#3a1020"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sd * 8, -34); g.lineTo(sd * 36, -20); g.moveTo(sd * 8, -34); g.lineTo(sd * 42, -30 + wf); g.stroke();
        });
        break;
      case 1: // cape-drapeau
        g.strokeStyle = "#6b4a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, -36); g.lineTo(-10, -84); g.stroke();
        g.fillStyle = c; g.beginPath(); g.moveTo(-10, -84); for (var i = 0; i <= 4; i++) g.lineTo(-10 + i * 9, -84 + Math.sin(t * 4 + i) * 3); g.lineTo(26, -60 + Math.sin(t * 4 + 4) * 3); for (var j = 4; j >= 0; j--) g.lineTo(-10 + j * 9, -60 + Math.sin(t * 4 + j) * 3); g.closePath(); g.fill(); g.strokeStyle = d; g.lineWidth = 1.5; g.stroke();
        sparkle(g, 8, -72, t, "#fff");
        break;
      case 2: // serviette de plage
        for (var k = 0; k < 5; k++) poly(g, [-18, -38 + k * 8, 18, -38 + k * 8, 20 + fl, -30 + k * 8, -20 + fl, -30 + k * 8], k % 2 ? "#fff" : c);
        break;
      case 3: // ailes de papillon
        [-1, 1].forEach(function (sd) {
          var wf = Math.sin(t * 5) * 0.15;
          g.save(); g.translate(sd * 6, -34); g.scale(1 + wf, 1);
          ell(g, sd * 20, -12, 18, 14, c); ell(g, sd * 16, 8, 13, 10, shade(c, 0.2));
          circ(g, sd * 22, -12, 5, "#fff"); circ(g, sd * 22, -12, 2.5, d); circ(g, sd * 16, 8, 3, "#fff");
          g.restore();
        });
        break;
      case 4: // cape étoilée immense
        g.fillStyle = "#1d1438"; g.beginPath(); g.moveTo(-14, -38); g.lineTo(14, -38); g.quadraticCurveTo(34 + fl, -10, 30 + fl, 6); g.lineTo(-30 - fl, 6); g.quadraticCurveTo(-34 - fl, -10, -14, -38); g.fill();
        for (var st = 0; st < 7; st++) sparkle(g, -22 + st * 7 + (st % 2) * 3, -26 + (st * 13) % 28, t + st, st % 3 ? "#ffd257" : "#fff");
        break;
      case 5: // carapace
        ell(g, 0, -24, 22, 26, "#4f7a2a"); ell(g, 0, -24, 18, 22, "#6fa040");
        g.strokeStyle = "#3a5a1a"; g.lineWidth = 1.5; for (var h = 0; h < 3; h++) { g.beginPath(); g.ellipse(0, -24, 6 + h * 6, 7 + h * 7, 0, 0, TAU); g.stroke(); }
        break;
      case 6: // cape de super-héros
        g.fillStyle = c; g.beginPath(); g.moveTo(-12, -38); g.lineTo(12, -38); g.lineTo(26 + fl * 2, 4); g.lineTo(-26 - fl * 2, 4); g.closePath(); g.fill(); g.strokeStyle = d; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = "#fff"; g.font = "900 14px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 0, -18);
        break;
      default: // sac à dos géant
        rrect(g, -20, -46, 40, 44, 8, c); rrect(g, -16, -42, 32, 14, 5, d); rrect(g, -8, -22, 16, 10, 3, d);
        g.strokeStyle = "#6b4a2a"; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -40); g.lineTo(-24, -14); g.moveTo(20, -40); g.lineTo(24, -14); g.stroke();
        circ(g, 12, -50, 5, "#f4ecd8"); circ(g, 12, -50, 2, "#000");   // un petit copain qui dépasse
    }
    g.restore();
  }
  // ---- armes : dans la main droite ----
  function gearWeapon(g, it, t, o, cls) {
    var c = rc(it), d = shade(c, -0.4), sw = o.cast ? Math.sin(o.cast * Math.PI) : 0;
    g.save(); g.translate(16, -30); g.rotate(-0.35 + Math.sin(t * 1.6) * 0.06 - sw * 1.3);
    switch (it.look % 10) {
      case 0: rrect(g, -2, -44, 4, 54, 2, "#9aa3b8"); ell(g, 0, -48, 10, 14, "#b8c4d6"); ell(g, -2, -50, 5, 8, "#dfe4ee"); break;   // cuillère géante
      case 1: poly(g, [-5, 10, 5, 10, 7, -20, 3, -56, 0, -70, -3, -56, -7, -20], "#5fb6e6", "#1f5f8a", 1.5); poly(g, [-5, 10, -14, 22, 0, 16, 14, 22, 5, 10], "#5fb6e6", "#1f5f8a", 1.5); circ(g, 3, -18, 2.5, "#fff"); circ(g, 3, -18, 1.2, "#000"); break;   // poisson-épée
      case 2: rrect(g, -2.5, -40, 5, 50, 2, "#7a5236"); rrect(g, -16, -56, 32, 20, 5, "#6f788c"); rrect(g, -16, -56, 32, 6, 3, "#9aa3b8"); break;   // marteau énorme
      case 3: g.save(); g.rotate(0.2); rrect(g, -5, -50, 10, 62, 5, "#e0a85a"); g.strokeStyle = "#a66f2e"; g.lineWidth = 2; for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-4, -44 + i * 11); g.lineTo(4, -40 + i * 11); g.stroke(); } g.restore(); break;   // baguette
      case 4: rrect(g, -1.5, -40, 3, 52, 1.5, "#3a3e4c"); g.fillStyle = c; g.beginPath(); g.moveTo(-26, -40); g.quadraticCurveTo(0, -70, 26, -40); for (var k = 2; k >= -2; k--) g.quadraticCurveTo(k * 13 - 6.5, -34, k * 13 - 13, -40); g.fill(); g.strokeStyle = d; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = "#3a3e4c"; g.lineWidth = 3; g.beginPath(); g.arc(4, 12, 4, 0, Math.PI); g.stroke(); break;   // parapluie
      case 5: rrect(g, -2, -60, 4, 72, 2, "#7a5236"); g.fillStyle = "#b8c4d6"; g.beginPath(); g.moveTo(0, -60); g.quadraticCurveTo(30, -62, 34, -44); g.quadraticCurveTo(22, -52, 0, -54); g.fill(); g.strokeStyle = "#4b5266"; g.lineWidth = 1.5; g.stroke(); break;   // faux
      case 6: circ(g, 0, -24, 14, c); circ(g, -10, -36, 6, c); circ(g, 10, -36, 6, c); ell(g, 0, -8, 12, 9, c); circ(g, -5, -26, 2, "#000"); circ(g, 5, -26, 2, "#000"); poly(g, [-3, -20, 3, -20, 0, -17], "#000"); circ(g, 0, -8, 5, shade(c, 0.4)); break;   // peluche
      case 7: rrect(g, -2.5, -46, 5, 56, 2, "#4b5266"); g.strokeStyle = "#4b5266"; g.lineWidth = 6; g.beginPath(); g.arc(0, -2, 16, 0.2, Math.PI - 0.2); g.stroke(); rrect(g, -14, -46, 28, 5, 2, "#4b5266"); g.lineWidth = 3; g.beginPath(); g.arc(0, -52, 5, 0, TAU); g.stroke(); break;   // ancre
      case 8: rrect(g, -2.5, -30, 5, 40, 2, "#3a3e4c"); circ(g, 0, -44, 16, "#3a3e4c"); circ(g, 0, -44, 12, "#6f788c"); ell(g, -3, -47, 5, 3, "#ffd257"); ell(g, -3, -47, 2, 1.5, "#fff"); break;   // poêle (avec un œuf)
      default: rrect(g, -1.5, -62, 3, 74, 1.5, "#7a5236"); g.strokeStyle = "#e8e1cf"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -62); g.quadraticCurveTo(26, -60, 22, -20 + Math.sin(t * 2) * 4); g.stroke(); circ(g, 22, -18 + Math.sin(t * 2) * 4, 3, "#ff5a6a"); poly(g, [22, -14 + Math.sin(t * 2) * 4, 26, -6 + Math.sin(t * 2) * 4, 18, -6 + Math.sin(t * 2) * 4], "#5fb6e6");   // canne à pêche
    }
    g.restore();
  }
  // ---- bottes : aux pieds ----
  function gearBoots(g, it, t, o) {
    var c = rc(it), d = shade(c, -0.4);
    [-7, 7].forEach(function (x, i) {
      var hop = o.walk != null ? Math.sin((o.walk + i * 0.5) * TAU) * 2 : 0;
      g.save(); g.translate(x, hop);
      switch (it.look % 7) {
        case 0: rrect(g, -9, -16, 18, 16, 5, c); rrect(g, -11, -4, 22, 6, 3, d); g.fillStyle = shade(c, 0.3); g.fillRect(-7, -14, 14, 3); break;   // bottes de géant
        case 1: poly(g, [-4, -8, 4, -8, 4, -2, 16, 0, 8, 4, -8, 4, -16, 0, -4, -2], "#ff9a3c", "#b35a0a", 1.5); break;   // pattes de canard
        case 2: g.strokeStyle = "#9aa3b8"; g.lineWidth = 2.5; g.beginPath(); for (var k = 0; k < 4; k++) { g.moveTo(-7, -2 - k * 3.5); g.lineTo(7, -4 - k * 3.5); } g.stroke(); rrect(g, -8, 0, 16, 3, 1.5, "#4b5266"); break;   // ressorts
        case 3: ell(g, 0, -4, 10, 7, "#fff"); ell(g, 0, -4, 7, 4, "#ffc4d6"); rrect(g, -8, -22, 5, 16, 2.5, "#fff"); rrect(g, 3, -22, 5, 16, 2.5, "#fff"); circ(g, -5, -1, 1.2, "#000"); circ(g, 5, -1, 1.2, "#000"); break;   // pantoufles lapin
        case 4: rrect(g, -7, -14, 14, 14, 4, c); rrect(g, -9, -4, 18, 5, 2, "#6f788c"); var f = 6 + Math.random() * 6; poly(g, [-5, 1, 5, 1, 0, 1 + f], "#ff9a3c"); poly(g, [-2.5, 1, 2.5, 1, 0, 1 + f * 0.6], "#ffe08a"); break;   // bottes-fusées
        case 5: poly(g, [-5, -8, 5, -8, 6, -2, 20, -1, 18, 4, -6, 4, -6, -2], "#2fd29a", "#0f6a4a", 1.5); break;   // palmes
        default: rrect(g, -7, -12, 14, 12, 3, c); g.strokeStyle = "#9aa3b8"; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, 2); g.lineTo(11, 2); g.stroke();   // patins
      }
      g.restore();
    });
  }
  // ---- amulette : pendue au cou ----
  function gearAmulet(g, it, t, o) {
    var c = rc(it), d = shade(c, -0.4), sw = Math.sin(t * 1.8) * 2;
    g.save(); g.translate(sw, -22);
    g.strokeStyle = "#ffd257"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, -16); g.lineTo(0, -4); g.lineTo(9, -16); g.stroke();
    switch (it.look % 6) {
      case 0: circ(g, 0, 6, 11, "#ffd257"); circ(g, 0, 6, 8, c); circ(g, 0, 6, 3, "#fff"); break;   // médaillon énorme
      case 1: poly(g, [-9, 10, 9, 10, 6, -2, 0, -6, -6, -2], "#ffd257", "#9a6f1a", 1.5); circ(g, 0, 11, 2.5, "#9a6f1a"); break;   // cloche
      case 2: ell(g, 0, 4, 11, 7, "#fff"); circ(g, 0 + Math.sin(t * 2) * 3, 4, 4, c); circ(g, Math.sin(t * 2) * 3, 4, 1.8, "#000"); break;   // œil
      case 3: circ(g, 0, -1, 5, "#ffd257"); circ(g, 0, -1, 2, d); rrect(g, -1.5, 2, 3, 16, 1, "#ffd257"); g.fillStyle = "#ffd257"; g.fillRect(1, 12, 5, 2.5); g.fillRect(1, 16, 4, 2.5); break;   // clé géante
      case 4: circ(g, 0, 5, 10, "#f4ecd8"); circ(g, 0, 5, 8, "#fff"); g.strokeStyle = "#000"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 5); g.lineTo(0, 0); g.moveTo(0, 5); g.lineTo(Math.cos(t) * 5, 5 + Math.sin(t) * 5); g.stroke(); break;   // horloge
      default: g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.arc(0, 5, 7, 0, TAU); g.stroke(); g.strokeStyle = "#ff8aa8"; g.lineWidth = 4; g.beginPath(); g.arc(0, 5, 7, 0, TAU); g.stroke(); for (var i = 0; i < 5; i++) circ(g, Math.cos(i * 1.3) * 7, 5 + Math.sin(i * 1.3) * 7, 1, ["#fff", "#5fd3c0", "#ffd257"][i % 3]);   // donut
    }
    g.restore();
  }
  // ---- anneau : sur la main gauche, énorme ----
  function gearRing(g, it, t, o) {
    var c = rc(it);
    g.save(); g.translate(-14, -26);
    switch (it.look % 4) {
      case 0: g.strokeStyle = "#ffd257"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); poly(g, [0, -16, 7, -8, 0, -2, -7, -8], c, "#fff", 1); glow(g, 0, -9, 12, c, 0.35 + Math.sin(t * 4) * 0.15); sparkle(g, 4, -14, t); break;
      case 1: g.strokeStyle = "#ffd257"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); var by = -14 + Math.sin(t * 2) * 2; g.strokeStyle = "#fff"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, by + 8); g.stroke(); ell(g, 0, by, 8, 10, c); ell(g, -3, by - 3, 2.5, 3.5, "rgba(255,255,255,.5)"); break;   // bague-ballon
      case 2: for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + t * 0.5; ell(g, Math.cos(a) * 6, -8 + Math.sin(a) * 6, 4, 2.5, c); } circ(g, 0, -8, 3.5, "#ffd257"); break;   // bague-fleur
      default: g.strokeStyle = "#ffd257"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); rrect(g, -8, -16, 16, 12, 3, "#ffd257"); rrect(g, -5, -13, 10, 6, 2, c);   // chevalière
    }
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
    if (type === "dopeul" && o.mirror) { g.scale(1 / s, 1 / s); hero(g, o.mirror, 0, 0, { t: t, flip: o.flip, back: o.back, walk: o.walk, cast: o.cast, hurt: 0, scale: 1.35, noShadow: true, gear: { skin: "ombre" } }); }
    else f(g, M, t, o);
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
    candy: function (g, c, t, o) {
      // bonbon emballé qui sautille, les deux bouts du papier qui frétillent
      var w = Math.sin(t * 5) * 3;
      poly(g, [-14, -14, -24, -24 + w, -22, -8, -24, 6 - w, -14, -4], shade(c, 0.2), shade(c, -0.4), 1.5);
      poly(g, [14, -14, 24, -24 - w, 22, -8, 24, 6 + w, 14, -4], shade(c, 0.2), shade(c, -0.4), 1.5);
      ell(g, 0, -10, 15, 11, c);
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, -20); g.lineTo(-2, -1); g.moveTo(2, -20); g.lineTo(8, -1); g.stroke();
      g.strokeStyle = shade(c, -0.45); g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -10, 15, 11, 0, 0, TAU); g.stroke();
      eyes(g, 0, -11, 5, 2.4, o);
      g.fillStyle = "#1b1530"; g.beginPath(); g.arc(0, -6, 3, 0.2, Math.PI - 0.2); g.fill();
    },
    frog: function (g, c, t, o) {
      var p = Math.abs(Math.sin(t * 3)) * 2;
      ell(g, -12, -2, 7, 4, shade(c, -0.3)); ell(g, 12, -2, 7, 4, shade(c, -0.3));
      ell(g, 0, -12 + p, 17, 12, c);
      ell(g, 0, -8 + p, 11, 6, shade(c, 0.3));
      circ(g, -8, -22 + p, 6, c); circ(g, 8, -22 + p, 6, c);
      circ(g, -8, -22 + p, 4, "#fff"); circ(g, 8, -22 + p, 4, "#fff"); circ(g, -7, -22 + p, 2, "#1b1530"); circ(g, 9, -22 + p, 2, "#1b1530");
      g.strokeStyle = "#1b1530"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -14 + p); g.quadraticCurveTo(0, -10 + p, 6, -14 + p); g.stroke();
      circ(g, -3, -16 + p, 1.5, "#ff8ab4"); circ(g, 3, -16 + p, 1.5, "#ff8ab4");
      if (Math.sin(t * 2.5) > 0.7) { g.strokeStyle = "#ff6f9c"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -12 + p); g.lineTo(14 + Math.sin(t * 20) * 3, -16 + p); g.stroke(); }
    },
    cloudsheep: function (g, c, t, o) {
      var fy = -16 + Math.sin(t * 1.8) * 3;
      [[-10, 0], [8, -2], [-2, -8], [0, 4], [12, 6], [-12, 8]].forEach(function (q, i) { circ(g, q[0], fy + q[1], 9 + (i % 2) * 2, i % 3 ? "#fff" : c); });
      circ(g, 12, fy - 2, 7, "#3a2c4c"); circ(g, 14, fy - 4, 2, "#fff"); circ(g, 14.5, fy - 4, 1, "#1b1530");
      ell(g, 18, fy - 8, 4, 2.5, "#3a2c4c"); ell(g, 8, fy - 9, 4, 2.5, "#3a2c4c");
      g.fillStyle = "#1b1530"; g.beginPath(); g.arc(13, fy + 1, 2, 0.2, Math.PI - 0.2); g.fill();
      for (var i = 0; i < 3; i++) circ(g, -16 + i * 5, fy + 14 + Math.sin(t * 3 + i) * 2, 1.5, "#bff0ff");
    },
    clock: function (g, c, t, o) {
      var b = Math.sin(t * 2) * 1;
      rrect(g, -12, -8, 8, 8, 2, "#3b4a66"); rrect(g, 4, -8, 8, 8, 2, "#3b4a66");
      rrect(g, -18, -40 + b, 36, 32, 6, c); rrect(g, -18, -40 + b, 36, 32, 6, "rgba(0,0,0,0)");
      g.strokeStyle = shade(c, -0.5); g.lineWidth = 2; g.strokeRect(-18, -40 + b, 36, 32);
      circ(g, 0, -24 + b, 12, "#f4ecd8"); g.strokeStyle = "#3b4a66"; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -24 + b, 12, 0, TAU); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24 + b); g.lineTo(0, -32 + b); g.moveTo(0, -24 + b); g.lineTo(Math.cos(t * 3) * 7, -24 + b + Math.sin(t * 3) * 7); g.stroke();
      circ(g, 0, -24 + b, 1.8, "#ff5a6a");
      rrect(g, -8, -46 + b, 16, 6, 3, shade(c, -0.3)); circ(g, -9, -47 + b, 4, "#d9a441"); circ(g, 9, -47 + b, 4, "#d9a441");
      if (!o.back) { circ(g, -6, -30 + b, 1.5, "#1b1530"); circ(g, 6, -30 + b, 1.5, "#1b1530"); }
      rrect(g, -24, -34 + b, 7, 18, 3, shade(c, -0.2)); rrect(g, 17, -34 + b, 7, 18, 3, shade(c, -0.2));
    },
    queen: function (g, c, t, o) {
      // Reine Guimauve : gros chamallow rose avec une couronne en sucre
      var w = Math.sin(t * 2) * 2;
      ell(g, 0, 0, 24, 8, shade(c, -0.3));
      rrect(g, -24, -46 + w, 48, 46 - w, 16, c);
      rrect(g, -20, -42 + w, 20, 14, 8, "rgba(255,255,255,.45)");
      g.strokeStyle = shade(c, -0.45); g.lineWidth = 2; if (g.roundRect) { g.beginPath(); g.roundRect(-24, -46 + w, 48, 46 - w, 16); g.stroke(); }
      eyes(g, 0, -28 + w, 8, 3, o);
      g.strokeStyle = "#1b1530"; g.lineWidth = 2; g.beginPath(); g.arc(0, -18 + w, 6, 0.2, Math.PI - 0.2); g.stroke();
      circ(g, -14, -20 + w, 3, "#ff6f9c"); circ(g, 14, -20 + w, 3, "#ff6f9c");
      poly(g, [-16, -46 + w, 16, -46 + w, 16, -60 + w, 10, -52 + w, 5, -64 + w, 0, -54 + w, -5, -64 + w, -10, -52 + w, -16, -60 + w], "#ffd257", "#c98a3a", 1.5);
      circ(g, 0, -56 + w, 3, "#ff5a6a"); circ(g, -10, -54 + w, 2, "#5fd3c0"); circ(g, 10, -54 + w, 2, "#5fd3c0");
      for (var i = 0; i < 4; i++) { var a = t * 1.5 + i * TAU / 4; circ(g, Math.cos(a) * 30, -30 + Math.sin(a) * 10, 2.5, ["#fff", "#ffd257", "#5fd3c0", "#ff6f9c"][i]); }
    },
    bigclock: function (g, c, t, o) {
      // Grand Tic-Tac : horloge de bronze sur pattes, balancier qui bat
      rrect(g, -16, -8, 10, 8, 3, "#3b4a66"); rrect(g, 6, -8, 10, 8, 3, "#3b4a66");
      rrect(g, -26, -70, 52, 62, 10, c); g.strokeStyle = "#5a3a0a"; g.lineWidth = 2.5; if (g.roundRect) { g.beginPath(); g.roundRect(-26, -70, 52, 62, 10); g.stroke(); }
      rrect(g, -22, -66, 44, 54, 8, shade(c, -0.15));
      circ(g, 0, -44, 18, "#f4ecd8"); g.strokeStyle = "#3b4a66"; g.lineWidth = 2; g.beginPath(); g.arc(0, -44, 18, 0, TAU); g.stroke();
      for (var k = 0; k < 12; k++) { var ka = k * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(ka) * 15, -44 + Math.sin(ka) * 15); g.lineTo(Math.cos(ka) * 17, -44 + Math.sin(ka) * 17); g.stroke(); }
      g.lineWidth = 3; g.beginPath(); g.moveTo(0, -44); g.lineTo(0, -56); g.moveTo(0, -44); g.lineTo(Math.cos(t * 4) * 12, -44 + Math.sin(t * 4) * 12); g.stroke();
      if (!o.back) { circ(g, -6, -48, 2.2, "#1b1530"); circ(g, 6, -48, 2.2, "#1b1530"); g.strokeStyle = "#1b1530"; g.lineWidth = 2; g.beginPath(); g.moveTo(-5, -38); g.lineTo(5, -38); g.stroke(); }
      var pa = Math.sin(t * 3) * 0.5;
      g.save(); g.translate(0, -16); g.rotate(pa); g.strokeStyle = "#5a3a0a"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12); g.stroke(); circ(g, 0, 14, 5, "#d9a441"); g.restore();
      rrect(g, -14, -80, 28, 12, 4, shade(c, -0.3)); circ(g, -16, -80, 7, "#d9a441"); circ(g, 16, -80, 7, "#d9a441");
      var gl = 0.5 + Math.sin(t * 6) * 0.4; g.fillStyle = "rgba(255,210,87," + gl + ")"; g.fillRect(-4, -82, 8, 4);
      rrect(g, -34, -56, 9, 30, 4, shade(c, -0.2)); rrect(g, 25, -56, 9, 30, 4, shade(c, -0.2));
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
      case "bigshroom": {
        shadow(g, 0, 2, 22, 0.25);
        rrect(g, -7, -34, 14, 34, 5, "#efe4d0"); g.fillStyle = "#d9cdb5"; g.fillRect(-7, -20, 14, 3);
        var bc = v < 0.5 ? "#9b6cff" : "#ff6f9c";
        g.fillStyle = bc; g.beginPath(); g.ellipse(sway * 0.4, -34, 30, 18, 0, Math.PI, TAU); g.fill();
        g.fillStyle = shade(bc, 0.35); g.beginPath(); g.ellipse(sway * 0.4, -34, 30, 5, 0, 0, Math.PI); g.fill();
        circ(g, -12 + sway * 0.4, -42, 4.5, "#fff"); circ(g, 8 + sway * 0.4, -46, 4, "#fff"); circ(g, 18 + sway * 0.4, -38, 3, "#fff"); circ(g, -2, -38, 2.5, "#fff");
        glow(g, 0, -36, 36, bc, 0.25 + Math.sin(t * 2 + v * 7) * 0.1);
        break;
      }
      case "reed": {
        g.strokeStyle = "#4f7a3a"; g.lineWidth = 3; g.lineCap = "round";
        for (var rd = -2; rd <= 2; rd++) { g.beginPath(); g.moveTo(rd * 6, 0); g.quadraticCurveTo(rd * 6 + sway, -20, rd * 6 + sway * 2 + rd * 2, -36 - Math.abs(rd) * -4); g.stroke(); ell(g, rd * 6 + sway * 2 + rd * 2, -38 + Math.abs(rd) * 4, 3, 7, "#6b4a2a"); }
        break;
      }
      case "lantern": {
        var ly = -40 + Math.sin(t * 1.6 + v * 9) * 5, lc = v < 0.5 ? "#5fd3c0" : "#ffb347";
        g.strokeStyle = "#4a3a2a"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, ly + 14); g.stroke();
        glow(g, 0, ly, 30, lc, 0.5 + Math.sin(t * 3 + v) * 0.15);
        poly(g, [-9, ly - 12, 9, ly - 12, 11, ly + 10, -11, ly + 10], "rgba(255,245,210,.5)", "#4a3a2a", 2);
        rrect(g, -11, ly - 15, 22, 4, 2, "#4a3a2a"); rrect(g, -12, ly + 9, 24, 4, 2, "#4a3a2a");
        poly(g, [0, ly - 8 + Math.sin(t * 9) * 1.5, 5, ly + 2, 0, ly + 6, -5, ly + 2], lc);
        break;
      }
      case "cloud": {
        var cy = -14 + Math.sin(t * 1.4 + v * 5) * 3;
        ell(g, 0, 4, 26, 8, "rgba(120,90,160,.12)");
        circ(g, -14, cy, 12, "#fff"); circ(g, 2, cy - 6, 15, "#fff"); circ(g, 16, cy, 11, "#fff"); ell(g, 0, cy + 6, 28, 9, "#fff");
        circ(g, -14, cy + 2, 10, "#f3eefc"); circ(g, 16, cy + 2, 9, "#f3eefc");
        if (v > 0.6) { eyes(g, 0, cy - 2, 5, 2, { t: t, seed: v * 9 }); g.strokeStyle = "#8a5cc7"; g.lineWidth = 1.5; g.beginPath(); g.arc(0, cy + 2, 4, 0.2, Math.PI - 0.2); g.stroke(); }
        break;
      }
      case "cotton": {
        shadow(g, 0, 2, 18, 0.2);
        rrect(g, -3, -26, 6, 26, 3, "#f4ecd8");
        var cc1 = v < 0.5 ? "#ffb3d9" : "#bff0ff", cc2 = v < 0.5 ? "#ff8ab4" : "#9fd8ff";
        circ(g, sway * 0.4, -44, 20, cc1); circ(g, -12 + sway * 0.5, -50, 13, cc2); circ(g, 10 + sway * 0.5, -54, 12, cc2); circ(g, sway, -60, 10, "#fff");
        for (var sp = 0; sp < 4; sp++) circ(g, -14 + sp * 9 + sway, -40 - (sp % 2) * 12, 2, "#fff");
        break;
      }
      case "star": {
        var sy2 = -10 + Math.sin(t * 2 + v * 4) * 3;
        glow(g, 0, sy2, 28, "rgba(255,230,120,.8)", 0.5 + Math.sin(t * 4) * 0.15);
        g.save(); g.translate(0, sy2); g.rotate(Math.sin(t) * 0.1);
        var pts = []; for (var sk = 0; sk < 10; sk++) { var sa = -Math.PI / 2 + sk * Math.PI / 5, sr = sk % 2 ? 7 : 16; pts.push(Math.cos(sa) * sr, Math.sin(sa) * sr); }
        poly(g, pts, "#ffd257", "#c98a3a", 1.5);
        eyes(g, 0, 1, 3.5, 1.6, { t: t, seed: v * 7 });
        g.restore();
        break;
      }
      case "balloon": {
        var by2 = -40 + Math.sin(t * 1.5 + v * 6) * 4, bc2 = ["#ff5a6a", "#5fb7ff", "#ffd257", "#7df0c2"][Math.floor(v * 4) % 4];
        g.strokeStyle = "#fff"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4, by2 / 2, 0, by2 + 16); g.stroke();
        ell(g, 0, by2, 14, 17, bc2); ell(g, -5, by2 - 5, 4, 6, "rgba(255,255,255,.45)"); poly(g, [-3, by2 + 16, 3, by2 + 16, 0, by2 + 20], bc2);
        break;
      }
      case "candy": {
        shadow(g, 0, 1, 12, 0.22);
        g.lineCap = "round"; g.lineWidth = 9; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -44); g.arc(10, -44, 10, Math.PI, 0); g.stroke();
        g.strokeStyle = "#ff5a6a"; g.lineWidth = 9; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -44); g.arc(10, -44, 10, Math.PI, 0); g.stroke(); g.setLineDash([]);
        break;
      }
      case "cupcake": {
        shadow(g, 0, 1, 16, 0.22);
        poly(g, [-14, -18, 14, -18, 10, 0, -10, 0], "#f4b68a", "#b35a2a", 1.5);
        g.strokeStyle = "#b35a2a"; g.lineWidth = 1; for (var cu = -2; cu <= 2; cu++) { g.beginPath(); g.moveTo(cu * 5, -16); g.lineTo(cu * 4, -2); g.stroke(); }
        var ic = v < 0.5 ? "#ff8ab4" : "#bff0ff";
        circ(g, 0, -26, 14, ic); circ(g, -8, -22, 9, ic); circ(g, 8, -22, 9, ic); circ(g, 0, -36, 8, shade(ic, 0.3));
        circ(g, 0, -44, 4, "#ff5a6a");
        for (var sp2 = 0; sp2 < 6; sp2++) circ(g, -10 + sp2 * 4, -28 + (sp2 % 2) * 6, 1.3, ["#ffd257", "#5fb7ff", "#7df0c2"][sp2 % 3]);
        break;
      }
      case "lollipop": {
        shadow(g, 0, 1, 10, 0.22);
        rrect(g, -2, -40, 4, 40, 2, "#f4ecd8");
        g.save(); g.translate(0, -50); g.rotate(t * 0.5);
        circ(g, 0, 0, 16, "#ff8ab4"); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); for (var lp = 0; lp < 40; lp++) { var la = lp * 0.5, lr = lp * 0.38; g.lineTo(Math.cos(la) * lr, Math.sin(la) * lr); } g.stroke();
        g.restore();
        break;
      }
      case "gear": {
        shadow(g, 0, 1, 18, 0.25);
        g.save(); g.translate(0, -22); g.rotate(t * (v < 0.5 ? 0.6 : -0.6));
        g.fillStyle = "#d9a441"; g.beginPath(); for (var gk = 0; gk < 16; gk++) { var ga = gk * Math.PI / 8, gr = gk % 2 ? 16 : 22; g.lineTo(Math.cos(ga) * gr, Math.sin(ga) * gr); } g.closePath(); g.fill();
        g.strokeStyle = "#7a5a1a"; g.lineWidth = 1.5; g.stroke();
        circ(g, 0, 0, 10, "#3b4a66"); circ(g, 0, 0, 5, "#d9a441");
        g.restore();
        break;
      }
      case "pendulum": {
        rrect(g, -10, -70, 20, 8, 3, "#7a5a1a");
        var pa2 = Math.sin(t * 2.2 + v) * 0.4;
        g.save(); g.translate(0, -64); g.rotate(pa2);
        g.strokeStyle = "#d9a441"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 48); g.stroke();
        circ(g, 0, 52, 10, "#d9a441"); circ(g, 0, 52, 5, "#3b4a66");
        g.restore();
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
  function heroIcon(cls, size, gear, full) {
    var gk = gear ? Object.keys(gear).map(function (k) { return k === "skin" ? "S" + gear[k] : k[0] + gear[k].look + gear[k].r; }).join("") : "";
    return icon("h-" + cls + gk + (full ? "F" : ""), size, function (g, s) {
      var gr = g.createLinearGradient(0, 0, 0, s);
      var bg = { bastion: ["#3a4f9a", "#1a2550"], prisme: ["#6e3fb0", "#2a1446"], voltige: ["#ff8a6a", "#7a2a22"], sibylle: ["#2fa37a", "#134a39"], clarine: ["#ffd27d", "#9a6f1a"], orage: ["#a3335c", "#2a0a18"], ondine: ["#4fb6dd", "#0f2a4a"] }[cls];
      gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]);
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      hero(g, cls, s / 2, full ? s * 0.97 : s * 1.12, { t: 0.6, flip: 1, scale: full ? s / 118 : s / 52, noShadow: !full, gear: gear });
    });
  }
  function summonIcon(cls, size) {
    return icon("sm-" + cls, size, function (g, s) {
      var gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, "#2fa37a"); gr.addColorStop(1, "#17233a");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      summon(g, cls, s / 2, s * 1.05, { t: 0.6, scale: s / (cls === "ours" || cls === "dame" ? 62 : cls === "lama" ? 58 : 48), noShadow: true });
    });
  }
  function mobIcon(type, size, col, elite) {
    return icon("m-" + type + (elite ? "e" : ""), size, function (g, s) {
      g.fillStyle = elite ? "#4a3a12" : "#2a2342"; g.fillRect(0, 0, s, s);
      var big = /^(archonte|guimauve|tictac|sentinelle)$/.test(type);
      mob(g, type, s / 2, s * (big ? 1.25 : 0.92), { t: 0.6, col: col, scale: s / (big ? 80 : 44), noShadow: true });
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
    ecureuil: "#c98a3a", herisson: "#7df0c2", lama: "#4fb6dd", hibou: "#ff7b4a", ours: "#8a5a3b", phenix: "#ffd257", benanimale: "#7dffb0", menagerie: "#2fd29a",
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
      if (sid.indexOf("g:") === 0) {   // icône générique : élément + initiale
        var parts = sid.split(":"), el = parts[1], letter = parts[2] || "?";
        var ec = { terre: "#c98a3a", feu: "#ff7b4a", eau: "#4fb6dd", air: "#7df0c2", none: "#ffd257" }[el] || "#ffd257";
        g.fillStyle = ec; g.strokeStyle = ec;
        if (el === "terre") poly(g, [-14, 12, -6, -4, 0, 4, 6, -10, 14, 12], ec);
        else if (el === "feu") { g.beginPath(); g.moveTo(0, -15); g.quadraticCurveTo(12, -2, 6, 10); g.quadraticCurveTo(0, 16, -6, 10); g.quadraticCurveTo(-12, -2, 0, -15); g.fill(); }
        else if (el === "eau") { g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(12, 2, 8, 9); g.quadraticCurveTo(0, 16, -8, 9); g.quadraticCurveTo(-12, 2, 0, -14); g.fill(); }
        else if (el === "air") { for (var wq = -1; wq <= 1; wq++) { g.beginPath(); g.moveTo(-13, wq * 8); g.quadraticCurveTo(0, wq * 8 - 6, 13, wq * 8); g.stroke(); } }
        else { g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.stroke(); }
        g.fillStyle = "#fff"; g.font = "900 16px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 4; g.strokeStyle = "rgba(0,0,0,.5)"; g.strokeText(letter, 0, 1); g.fillText(letter, 0, 1);
        g.restore(); return;
      }
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
        case "ecureuil": case "herisson": case "lama": case "hibou": case "ours": case "phenix": g.restore(); g.save(); g.translate(0, 0); summon(g, sid, s / 2, s * 1.05, { t: 0.6, scale: s / (sid === "ours" ? 62 : sid === "lama" ? 58 : 48), noShadow: true }); break;
        case "benanimale": circ(g, 0, 2, 9, c); L([0, -5, 0, 9]); L([-7, 2, 7, 2]); for (var ba = 0; ba < 4; ba++) { var bb = ba * Math.PI / 2 + 0.78; circ(g, Math.cos(bb) * 14, 2 + Math.sin(bb) * 14, 2, "#fff"); } break;
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

  root.AT_ART = { hero: hero, mob: mob, summon: summon, summonIcon: summonIcon, SKIN_PAL: SKIN_PAL, npc: npc, deco: deco, diamond: diamond, shade: shade, glow: glow, circ: circ, ell: ell, poly: poly, rrect: rrect,
    heroIcon: heroIcon, mobIcon: mobIcon, itemIcon: itemIcon, spellIcon: spellIcon, THEMES: THEMES, HERO_PAL: HERO_PAL, SPELL_COL: SPELL_COL };
})(typeof window !== "undefined" ? window : globalThis);
