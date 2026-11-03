/* =========================================================================
   King Dice — dessin vectoriel (pièces, ennemis, roi, icônes) et outils de tracé
   Tout est dessiné au canvas : aucune image. Les fonctions prennent un contexte 2D
   et une position (x, y = bas de la figure) ; l'animation vient de l'appelant (o.sx, o.sy…).
   ========================================================================= */
(function (root) {
  "use strict";
  var PCOL = [
    { main: "#78aef7", light: "#d4e6ff", mid: "#a9cbfb", dark: "#2f5ea8", deep: "#1f3f78", name: "Joueur 1", short: "J1" },
    { main: "#ffa257", light: "#ffe3c9", mid: "#ffc596", dark: "#b8561a", deep: "#7c370c", name: "Joueur 2", short: "J2" },
  ];
  var INK = "#3a2c4c";
  var ENEMY_COL = {
    normal: { main: "#a58be0", light: "#d8c9fb", dark: "#5e4398" },
    fast: { main: "#5fd0ac", light: "#c3f5e2", dark: "#227a62" },
    armored: { main: "#9aa3b8", light: "#dfe4ee", dark: "#4b5266" },
    boss: { main: "#8a4d9e", light: "#d6a8e4", dark: "#4a1f5a" },
  };
  var TAU = Math.PI * 2;
  var clock = 0;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* ====================== DESSIN : OUTILS ====================== */
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  var mixCache = {};
  function mix(a, b, t) {
    if (t <= 0) return a; if (t >= 1) return b;
    var key = a + b + Math.round(t * 20);
    if (mixCache[key]) return mixCache[key];
    var A = hex2rgb(a), B = hex2rgb(b), r = [0, 1, 2].map(function (i) { return Math.round(lerp(A[i], B[i], Math.round(t * 20) / 20)); });
    return (mixCache[key] = "#" + ((1 << 24) + (r[0] << 16) + (r[1] << 8) + r[2]).toString(16).slice(1));
  }
  function rrect(g, x, y, ww, hh, r) {
    r = Math.min(r, ww / 2, hh / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r);
    g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath();
  }
  function grad(g, y0, y1, c0, c1) { var gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
  function fillStroke(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
  function star(g, x, y, r, n, inner) {
    n = n || 5; inner = inner || 0.45;
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.25);
    g.bezierCurveTo(x - s * 0.45, y - s * 0.55, x - s * 0.05, y - s * 0.55, x, y - s * 0.25);
    g.bezierCurveTo(x + s * 0.05, y - s * 0.55, x + s * 0.45, y - s * 0.55, x + s * 0.5, y - s * 0.25);
    g.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
    g.closePath();
  }
  function eye(g, x, y, r, o) {
    o = o || {};
    if (o.closed) { g.beginPath(); g.arc(x, y + r * 0.2, r * 0.8, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = r * 0.45; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); return; }
    if (o.happy) { g.beginPath(); g.arc(x, y + r * 0.4, r * 0.85, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = r * 0.5; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); return; }
    var sy = o.blink ? 0.12 : 1;
    g.save(); g.translate(x, y); g.scale(1, sy);
    g.beginPath(); g.ellipse(0, 0, r * 0.85, r, 0, 0, TAU); g.fillStyle = INK; g.fill();
    g.beginPath(); g.arc(-r * 0.25 + (o.lx || 0) * r * 0.2, -r * 0.35 + (o.ly || 0) * r * 0.2, r * 0.32, 0, TAU); g.fillStyle = "#fff"; g.fill();
    g.restore();
  }
  function blush(g, x, y, r) { g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fillStyle = "rgba(255,120,140,.45)"; g.fill(); }

  /* ====================== DESSIN : PIÈCES ====================== */
  // (0,0) = bas de la pièce ; s = taille d'une case
  function drawBase(g, s, col, lvl) {
    g.beginPath(); g.ellipse(0, -s * 0.07, s * 0.29, s * 0.1, 0, 0, TAU); g.fillStyle = lvl >= 4 ? "#c58a1c" : col.dark; g.fill();
    g.lineWidth = s * 0.03; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.ellipse(0, -s * 0.1, s * 0.27, s * 0.08, 0, 0, TAU); g.fillStyle = lvl >= 4 ? "#f4c64e" : col.main; g.fill();
  }
  function drawRook(g, s, col, lvl, o) {
    var lw = s * 0.032, body = grad(g, -s * 0.7, -s * 0.1, col.light, col.main);
    // jupe
    rrect(g, -s * 0.25, -s * 0.22, s * 0.5, s * 0.13, s * 0.05); fillStroke(g, col.mid, lw);
    // corps
    rrect(g, -s * 0.19, -s * 0.52, s * 0.38, s * 0.34, s * 0.06); fillStroke(g, body, lw);
    // créneaux
    rrect(g, -s * 0.25, -s * 0.6, s * 0.5, s * 0.12, s * 0.04); fillStroke(g, col.light, lw);
    [-0.25, -0.06, 0.13].forEach(function (x) { rrect(g, x * s, -s * 0.7, s * 0.12, s * 0.12, s * 0.03); fillStroke(g, col.light, lw); });
    // porte
    g.beginPath(); g.moveTo(-s * 0.055, -s * 0.18); g.lineTo(-s * 0.055, -s * 0.24); g.arc(0, -s * 0.24, s * 0.055, Math.PI, 0); g.lineTo(s * 0.055, -s * 0.18); g.closePath();
    g.fillStyle = col.dark; g.fill();
    // visage
    var ey = -s * 0.38;
    eye(g, -s * 0.075, ey, s * 0.034, { blink: o.blink, happy: o.happy, ly: 0.2, lx: o.dir * 0.6 });
    eye(g, s * 0.075, ey, s * 0.034, { blink: o.blink, happy: o.happy, ly: 0.2, lx: o.dir * 0.6 });
    blush(g, -s * 0.12, -s * 0.32, s * 0.03); blush(g, s * 0.12, -s * 0.32, s * 0.03);
    g.beginPath(); g.arc(0, -s * 0.33, s * 0.025, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = s * 0.018; g.strokeStyle = INK; g.stroke();
    if (lvl >= 2) { // petit drapeau
      g.beginPath(); g.moveTo(s * 0.19, -s * 0.7); g.lineTo(s * 0.19, -s * 0.9); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
      var wv = Math.sin(clock * 6 + o.seed) * s * 0.015;
      g.beginPath(); g.moveTo(s * 0.19, -s * 0.9); g.quadraticCurveTo(s * 0.26, -s * 0.88 + wv, s * 0.32, -s * 0.86); g.lineTo(s * 0.19, -s * 0.8); g.closePath();
      g.fillStyle = lvl >= 3 ? "#ffd75e" : col.dark; g.fill(); g.lineWidth = s * 0.015; g.stroke();
    }
  }
  function drawBishop(g, s, col, lvl, o) {
    var lw = s * 0.032;
    rrect(g, -s * 0.2, -s * 0.2, s * 0.4, s * 0.11, s * 0.05); fillStroke(g, col.mid, lw);
    // robe en goutte
    g.beginPath(); g.moveTo(-s * 0.19, -s * 0.16);
    g.bezierCurveTo(-s * 0.31, -s * 0.42, -s * 0.13, -s * 0.62, 0, -s * 0.77);
    g.bezierCurveTo(s * 0.13, -s * 0.62, s * 0.31, -s * 0.42, s * 0.19, -s * 0.16); g.closePath();
    fillStroke(g, grad(g, -s * 0.77, -s * 0.16, col.light, col.main), lw);
    // chapeau (mitre) : le haut de la goutte, plus foncé, avec sa fente
    g.save(); g.clip();
    g.beginPath(); g.rect(-s * 0.4, -s * 0.9, s * 0.8, s * 0.43); g.fillStyle = col.dark; g.fill();
    g.beginPath(); g.moveTo(-s * 0.01, -s * 0.73); g.lineTo(s * 0.13, -s * 0.52); g.lineWidth = s * 0.035; g.strokeStyle = col.light; g.stroke();
    g.restore();
    g.beginPath(); g.moveTo(-s * 0.19, -s * 0.16);
    g.bezierCurveTo(-s * 0.31, -s * 0.42, -s * 0.13, -s * 0.62, 0, -s * 0.77);
    g.bezierCurveTo(s * 0.13, -s * 0.62, s * 0.31, -s * 0.42, s * 0.19, -s * 0.16); g.closePath();
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    // col
    g.beginPath(); g.ellipse(0, -s * 0.47, s * 0.21, s * 0.045, 0, 0, TAU); fillStroke(g, col.light, lw * 0.8);
    // pompon + étoile de mage
    g.beginPath(); g.arc(0, -s * 0.8, s * 0.045, 0, TAU); fillStroke(g, lvl >= 3 ? "#ffd75e" : col.light, lw * 0.8);
    star(g, -s * 0.06, -s * 0.6, s * 0.035, 5, 0.45); g.fillStyle = "#ffe68a"; g.fill();
    // visage
    var ey = -s * 0.34;
    eye(g, -s * 0.07, ey, s * 0.03, { blink: o.blink, happy: o.happy || o.cast > 0.3, ly: 0.3, lx: o.dir * 0.5 });
    eye(g, s * 0.07, ey, s * 0.03, { blink: o.blink, happy: o.happy || o.cast > 0.3, ly: 0.3, lx: o.dir * 0.5 });
    blush(g, -s * 0.11, -s * 0.28, s * 0.028); blush(g, s * 0.11, -s * 0.28, s * 0.028);
    g.beginPath(); g.ellipse(0, -s * 0.275, s * 0.018, o.cast > 0.3 ? s * 0.022 : s * 0.01, 0, 0, TAU); g.fillStyle = INK; g.fill();
    if (o.cast > 0) { // lueur magique au bout du chapeau
      var gr = g.createRadialGradient(0, -s * 0.8, 0, 0, -s * 0.8, s * 0.22);
      gr.addColorStop(0, "rgba(255,250,210," + (0.9 * o.cast) + ")"); gr.addColorStop(1, "rgba(255,250,210,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, -s * 0.8, s * 0.22, 0, TAU); g.fill();
    }
  }
  function knightPath(g, s, d) {
    g.beginPath();
    g.moveTo(-s * 0.17 * d, -s * 0.18);
    g.bezierCurveTo(-s * 0.24 * d, -s * 0.34, -s * 0.22 * d, -s * 0.5, -s * 0.14 * d, -s * 0.64);
    g.lineTo(-s * 0.1 * d, -s * 0.8);                               // oreille
    g.lineTo(-s * 0.01 * d, -s * 0.68);
    g.quadraticCurveTo(s * 0.16 * d, -s * 0.68, s * 0.25 * d, -s * 0.5);   // front → museau
    g.quadraticCurveTo(s * 0.31 * d, -s * 0.4, s * 0.22 * d, -s * 0.36);
    g.quadraticCurveTo(s * 0.1 * d, -s * 0.37, s * 0.05 * d, -s * 0.33);   // mâchoire
    g.quadraticCurveTo(s * 0.18 * d, -s * 0.25, s * 0.17 * d, -s * 0.18);  // poitrail
    g.closePath();
  }
  function drawKnight(g, s, col, lvl, o) {
    var lw = s * 0.032, d = o.dir;
    rrect(g, -s * 0.24, -s * 0.22, s * 0.48, s * 0.13, s * 0.05); fillStroke(g, col.mid, lw);
    knightPath(g, s, d); fillStroke(g, grad(g, -s * 0.8, -s * 0.18, col.light, col.main), lw);
    // crinière
    g.beginPath();
    for (var i = 0; i < 4; i++) {
      var t = i / 3, x = lerp(-s * 0.2, -s * 0.11, t) * d, y = lerp(-s * 0.3, -s * 0.66, t);
      g.moveTo(x, y); g.arc(x - s * 0.035 * d, y, s * 0.05, 0, TAU);
    }
    g.fillStyle = lvl >= 3 ? "#ffd75e" : col.dark; g.fill();
    // œil, naseau, joue
    eye(g, s * 0.07 * d, -s * 0.55, s * 0.033, { blink: o.blink, happy: o.happy, lx: d * 0.8, ly: 0.3 });
    g.beginPath(); g.ellipse(s * 0.23 * d, -s * 0.42, s * 0.017, s * 0.012, 0, 0, TAU); g.fillStyle = INK; g.fill();
    blush(g, s * 0.12 * d, -s * 0.46, s * 0.03);
    // bride
    g.beginPath(); g.moveTo(s * 0.04 * d, -s * 0.36); g.lineTo(s * 0.14 * d, -s * 0.61); g.lineWidth = s * 0.02; g.strokeStyle = lvl >= 2 ? "#ffd75e" : col.dark; g.stroke();
  }
  function drawPawn(g, s, col, lvl, o) {
    var lw = s * 0.032;
    // petit corps en cloche
    g.beginPath(); g.moveTo(-s * 0.2, -s * 0.15);
    g.bezierCurveTo(-s * 0.2, -s * 0.28, -s * 0.09, -s * 0.34, -s * 0.08, -s * 0.44);
    g.lineTo(s * 0.08, -s * 0.44);
    g.bezierCurveTo(s * 0.09, -s * 0.34, s * 0.2, -s * 0.28, s * 0.2, -s * 0.15); g.closePath();
    fillStroke(g, grad(g, -s * 0.45, -s * 0.15, col.light, col.main), lw);
    // col
    rrect(g, -s * 0.14, -s * 0.48, s * 0.28, s * 0.07, s * 0.035); fillStroke(g, col.mid, lw * 0.8);
    // tête ronde avec casquette
    g.beginPath(); g.arc(0, -s * 0.6, s * 0.15, 0, TAU); fillStroke(g, grad(g, -s * 0.75, -s * 0.45, col.light, col.mid), lw);
    g.save(); g.beginPath(); g.arc(0, -s * 0.6, s * 0.15, 0, TAU); g.clip();
    g.fillStyle = lvl >= 3 ? "#ffd75e" : col.dark; g.fillRect(-s * 0.2, -s * 0.8, s * 0.4, s * 0.12);
    g.restore();
    g.beginPath(); g.arc(0, -s * 0.6, s * 0.15, 0, TAU); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(0, -s * 0.76, s * 0.032, 0, TAU); fillStroke(g, col.light, lw * 0.7);
    var ey = -s * 0.58;
    eye(g, -s * 0.055, ey, s * 0.028, { blink: o.blink, happy: o.happy, ly: 0.3, lx: o.dir * 0.5 });
    eye(g, s * 0.055, ey, s * 0.028, { blink: o.blink, happy: o.happy, ly: 0.3, lx: o.dir * 0.5 });
    blush(g, -s * 0.095, -s * 0.54, s * 0.024); blush(g, s * 0.095, -s * 0.54, s * 0.024);
    g.beginPath(); g.arc(0, -s * 0.54, s * 0.02, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = s * 0.016; g.strokeStyle = INK; g.stroke();
    // petite épée
    g.beginPath(); g.moveTo(s * 0.2 * o.dir, -s * 0.3); g.lineTo(s * 0.3 * o.dir, -s * 0.5); g.lineWidth = s * 0.03; g.strokeStyle = INK; g.lineCap = "round"; g.stroke();
    g.beginPath(); g.moveTo(s * 0.2 * o.dir, -s * 0.3); g.lineTo(s * 0.3 * o.dir, -s * 0.5); g.lineWidth = s * 0.016; g.strokeStyle = "#f2f4fa"; g.stroke();
  }
  function drawQueen(g, s, col, lvl, o) {
    var lw = s * 0.032;
    rrect(g, -s * 0.27, -s * 0.2, s * 0.54, s * 0.11, s * 0.05); fillStroke(g, col.mid, lw);
    // robe évasée
    g.beginPath(); g.moveTo(-s * 0.25, -s * 0.16);
    g.bezierCurveTo(-s * 0.3, -s * 0.34, -s * 0.12, -s * 0.46, -s * 0.1, -s * 0.62);
    g.lineTo(s * 0.1, -s * 0.62);
    g.bezierCurveTo(s * 0.12, -s * 0.46, s * 0.3, -s * 0.34, s * 0.25, -s * 0.16); g.closePath();
    fillStroke(g, grad(g, -s * 0.62, -s * 0.16, col.light, col.main), lw);
    g.beginPath(); g.moveTo(0, -s * 0.2); g.lineTo(0, -s * 0.5); g.lineWidth = lw * 0.6; g.strokeStyle = "rgba(58,44,76,.35)"; g.stroke();
    heart(g, 0, -s * 0.3, s * 0.12); g.fillStyle = "#ff6b81"; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = INK; g.stroke();
    // collerette
    g.beginPath(); g.ellipse(0, -s * 0.63, s * 0.17, s * 0.05, 0, 0, TAU); fillStroke(g, "#fff8ea", lw * 0.8);
    // tête
    g.beginPath(); g.arc(0, -s * 0.74, s * 0.13, 0, TAU); fillStroke(g, mix(col.light, "#ffffff", 0.4), lw);
    var ey = -s * 0.74;
    eye(g, -s * 0.05, ey, s * 0.026, { blink: o.blink, happy: o.happy, ly: 0.3, lx: o.dir * 0.5 });
    eye(g, s * 0.05, ey, s * 0.026, { blink: o.blink, happy: o.happy, ly: 0.3, lx: o.dir * 0.5 });
    blush(g, -s * 0.085, -s * 0.7, s * 0.022); blush(g, s * 0.085, -s * 0.7, s * 0.022);
    g.beginPath(); g.arc(0, -s * 0.7, s * 0.018, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = s * 0.015; g.strokeStyle = INK; g.stroke();
    // couronne à 5 pointes
    var y = -s * 0.83;
    g.beginPath(); g.moveTo(-s * 0.15, y + s * 0.02); g.lineTo(-s * 0.17, y - s * 0.1); g.lineTo(-s * 0.09, y - s * 0.04); g.lineTo(-s * 0.045, y - s * 0.14);
    g.lineTo(0, y - s * 0.05); g.lineTo(s * 0.045, y - s * 0.14); g.lineTo(s * 0.09, y - s * 0.04); g.lineTo(s * 0.17, y - s * 0.1); g.lineTo(s * 0.15, y + s * 0.02); g.closePath();
    fillStroke(g, "#ffd257", lw * 0.8);
    [[-0.17, -0.1], [-0.045, -0.14], [0.045, -0.14], [0.17, -0.1]].forEach(function (p) { g.beginPath(); g.arc(p[0] * s, y + p[1] * s, s * 0.018, 0, TAU); g.fillStyle = "#ff6d8a"; g.fill(); });
    if (lvl >= 2 || o.cast > 0.2) { star(g, s * 0.2, -s * 0.55 + Math.sin(clock * 3 + o.seed) * s * 0.02, s * 0.045, 4, 0.3); g.fillStyle = "#fff6c4"; g.fill(); }
  }
  function drawCrownTop(g, s, y) {
    g.beginPath(); g.moveTo(-s * 0.13, y); g.lineTo(-s * 0.15, y - s * 0.11); g.lineTo(-s * 0.07, y - s * 0.05); g.lineTo(0, y - s * 0.14); g.lineTo(s * 0.07, y - s * 0.05); g.lineTo(s * 0.15, y - s * 0.11); g.lineTo(s * 0.13, y); g.closePath();
    g.fillStyle = "#ffd257"; g.fill(); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(0, y - s * 0.035, s * 0.022, 0, TAU); g.fillStyle = "#ff6d8a"; g.fill();
  }
  var TOP_Y = { rook: -0.7, bishop: -0.85, knight: -0.8, pawn: -0.78, queen: -0.97 };
  // dessin complet d'une pièce (avec aura, étoiles de niveau, couronne)
  function drawPiece(g, type, owner, lvl, x, y, s, o) {
    o = o || {};
    var col = o.flash ? whiteCol(owner, o.flash) : PCOL[owner];
    if (o.dir == null) o.dir = owner === 0 ? 1 : -1;
    if (o.seed == null) o.seed = 0;
    var sc = (1 + (lvl - 1) * 0.045) * (o.scale || 1);
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    // ombre
    g.beginPath(); g.ellipse(0, -s * 0.04, s * 0.32 * sc, s * 0.09, 0, 0, TAU); g.fillStyle = "rgba(40,20,60,.22)"; g.fill();
    // aura des hauts niveaux
    if (lvl >= 3 && !o.noAura) {
      var pulse = 0.75 + 0.25 * Math.sin(clock * 3 + o.seed);
      var ar = s * (lvl >= 4 ? 0.62 : 0.5) * pulse;
      var ag = g.createRadialGradient(0, -s * 0.38, 0, 0, -s * 0.38, ar);
      ag.addColorStop(0, lvl >= 4 ? "rgba(255,214,90,.55)" : hexA(col.main, 0.45)); ag.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = ag; g.beginPath(); g.arc(0, -s * 0.38, ar, 0, TAU); g.fill();
    }
    g.translate(o.ox || 0, o.oy || 0);
    g.scale(sc * (o.sx || 1), sc * (o.sy || 1));
    if (o.rot) g.rotate(o.rot);
    drawBase(g, s, col, lvl);
    if (type === "rook") drawRook(g, s, col, lvl, o);
    else if (type === "bishop") drawBishop(g, s, col, lvl, o);
    else if (type === "knight") drawKnight(g, s, col, lvl, o);
    else if (type === "pawn") drawPawn(g, s, col, lvl, o);
    else drawQueen(g, s, col, lvl, o);
    if (lvl >= 4 && type !== "queen") drawCrownTop(g, s, TOP_Y[type] * s + s * 0.02);
    g.restore();
    // étoiles de niveau (toujours droites et lisibles)
    // étoiles de niveau, posées sur le socle : toujours droites, jamais cachées par la pièce du dessus
    if (!o.noStars) drawLevel(g, x + (o.ox || 0), y - s * 0.05, s, lvl, o.alpha);
  }
  var whiteCache = {};
  function whiteCol(owner, f) {
    var k = Math.round(clamp(f, 0, 1) * 10), key = owner + "_" + k;
    if (whiteCache[key]) return whiteCache[key];
    var c = PCOL[owner], o = {};
    for (var n in c) o[n] = c[n][0] === "#" ? mix(c[n], "#ffffff", k / 10 * 0.85) : c[n];
    return (whiteCache[key] = o);
  }
  function drawLevel(g, x, y, s, lvl, alpha) {
    var r = s * 0.062, gap = r * 2.1, x0 = x - (lvl - 1) * gap / 2;
    g.save(); if (alpha != null) g.globalAlpha *= alpha;
    for (var i = 0; i < lvl; i++) {
      var bob = lvl >= 3 ? Math.sin(clock * 4 + i * 0.8) * s * 0.008 : 0;
      star(g, x0 + i * gap, y + bob, r, 5, 0.48);
      g.fillStyle = lvl >= 4 ? "#ffd257" : lvl >= 3 ? "#fff0a0" : "#fff7d6"; g.fill();
      g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
    }
    g.restore();
  }
  function hexA(h, a) { var c = hex2rgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  /* ====================== DESSIN : ENNEMIS ====================== */
  function drawEnemy(g, type, x, y, s, o) {
    o = o || {};
    var C = ENEMY_COL[type], boss = type === "boss";
    var sz = boss ? 1.45 : type === "fast" ? 0.82 : type === "armored" ? 1.08 : 1;
    var ww = s * 0.56 * sz, hh = s * 0.5 * sz;
    var main = mix(C.main, "#ffffff", o.flash || 0), light = mix(C.light, "#ffffff", o.flash || 0);
    if (o.frozen) { main = mix(main, "#a6dcff", 0.5); light = mix(light, "#e6f6ff", 0.5); }
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.beginPath(); g.ellipse(0, -s * 0.02, ww * 0.52, s * 0.08 * sz, 0, 0, TAU); g.fillStyle = "rgba(40,20,60,.25)"; g.fill();
    g.scale(o.sx || 1, o.sy || 1);
    var lw = s * 0.032;
    // pieds
    var step = Math.sin((o.walk || 0) * Math.PI) * s * 0.04;
    [-1, 1].forEach(function (k) { g.beginPath(); g.ellipse(k * ww * 0.25, -s * 0.03 - (k > 0 ? step : 0), ww * 0.14, s * 0.05, 0, 0, TAU); g.fillStyle = C.dark; g.fill(); });
    // corps (blob)
    g.beginPath();
    g.moveTo(-ww / 2, -s * 0.07);
    g.bezierCurveTo(-ww * 0.56, -hh * 0.75, -ww * 0.3, -hh * 1.12, 0, -hh * 1.12);
    g.bezierCurveTo(ww * 0.3, -hh * 1.12, ww * 0.56, -hh * 0.75, ww / 2, -s * 0.07);
    g.quadraticCurveTo(0, -s * 0.01, -ww / 2, -s * 0.07);
    g.closePath();
    fillStroke(g, grad(g, -hh * 1.12, 0, light, main), lw);
    // reflet
    g.beginPath(); g.ellipse(-ww * 0.2, -hh * 0.85, ww * 0.1, hh * 0.08, -0.5, 0, TAU); g.fillStyle = "rgba(255,255,255,.55)"; g.fill();
    var ey = -hh * 0.6, er = s * 0.055 * Math.min(1.25, sz), ex = ww * 0.17;
    if (type === "armored") {
      // casque
      g.beginPath(); g.moveTo(-ww * 0.52, -hh * 0.5);
      g.bezierCurveTo(-ww * 0.56, -hh * 1.2, ww * 0.56, -hh * 1.2, ww * 0.52, -hh * 0.5);
      g.closePath(); fillStroke(g, grad(g, -hh * 1.2, -hh * 0.5, mix("#e7ecf4", "#ffffff", o.flash || 0), mix("#7d869c", "#ffffff", o.flash || 0)), lw);
      g.beginPath(); g.moveTo(0, -hh * 1.12); g.lineTo(0, -hh * 0.52); g.lineWidth = s * 0.02; g.strokeStyle = "#5a627a"; g.stroke();
      [-0.36, 0.36].forEach(function (k) { g.beginPath(); g.arc(k * ww, -hh * 0.62, s * 0.015, 0, TAU); g.fillStyle = "#5a627a"; g.fill(); });
      ey = -hh * 0.4; er *= 0.8;
    }
    if (type === "fast") {
      // antenne + petite plume
      g.beginPath(); g.moveTo(ww * 0.05, -hh * 1.1); g.quadraticCurveTo(ww * 0.2, -hh * 1.45, ww * 0.38, -hh * 1.4); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(ww * 0.38, -hh * 1.4, s * 0.035, 0, TAU); fillStroke(g, "#fff27a", s * 0.018);
    }
    if (boss) {
      g.save(); g.translate(0, -hh * 1.05); g.scale(1.3, 1.3); drawCrownTop(g, s, 0); g.restore();
      g.beginPath(); g.moveTo(-ww * 0.28, -hh * 0.82); g.lineTo(-ww * 0.18, -hh * 0.62); g.lineWidth = s * 0.02; g.strokeStyle = C.dark; g.stroke();
    }
    // yeux (regardent vers le roi, en bas)
    var hurt = (o.flash || 0) > 0.4;
    if (hurt) {
      // yeux plissés > <
      [-1, 1].forEach(function (k) { var cx = k * ex, d = -k * er * 0.6; g.beginPath(); g.moveTo(cx - d, ey - er * 0.55); g.lineTo(cx + d, ey); g.lineTo(cx - d, ey + er * 0.55); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); });
    } else {
      [-1, 1].forEach(function (k) {
        g.beginPath(); g.ellipse(k * ex, ey, er, er * 1.1, 0, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.lineWidth = s * 0.016; g.strokeStyle = INK; g.stroke();
        if (!o.blink) { g.beginPath(); g.arc(k * ex + k * er * 0.1, ey + er * 0.35, er * 0.5, 0, TAU); g.fillStyle = INK; g.fill(); }
        else { g.beginPath(); g.moveTo(k * ex - er, ey); g.lineTo(k * ex + er, ey); g.lineWidth = s * 0.02; g.stroke(); }
      });
      // sourcils ronchons
      [-1, 1].forEach(function (k) { g.beginPath(); g.moveTo(k * (ex + er * 0.9), ey - er * 1.5); g.lineTo(k * (ex - er * 0.6), ey - er * 1.1); g.lineWidth = s * 0.024; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); });
    }
    // bouche
    g.beginPath(); g.arc(0, -hh * 0.28 + (hurt ? 0 : s * 0.02), s * 0.03 * sz, hurt ? 0 : Math.PI * 1.15, hurt ? TAU : Math.PI * 1.85); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke();
    if (o.frozen) {
      g.globalAlpha *= 0.7;
      [[-0.3, -0.9], [0.32, -0.55], [-0.05, -1.05]].forEach(function (p) { star(g, p[0] * ww, p[1] * hh, s * 0.04, 6, 0.35); g.fillStyle = "#ffffff"; g.fill(); });
    }
    g.restore();
  }

  /* ====================== DESSIN : ROI ====================== */
  function drawKing(g, x, y, s, o) {
    o = o || {};
    g.save(); g.translate(x, y);
    g.beginPath(); g.ellipse(0, -s * 0.03, s * 0.42, s * 0.1, 0, 0, TAU); g.fillStyle = "rgba(30,15,45,.3)"; g.fill();
    if (o.rot) g.rotate(o.rot);
    g.scale(o.sx || 1, o.sy || 1);
    var lw = s * 0.03;
    var flashK = o.hurt || 0;
    // socle
    rrect(g, -s * 0.36, -s * 0.16, s * 0.72, s * 0.14, s * 0.06); fillStroke(g, "#d9b06a", lw);
    // robe : moitié bleue, moitié orange (le roi des deux joueurs)
    g.save();
    g.beginPath(); g.moveTo(-s * 0.32, -s * 0.15); g.quadraticCurveTo(-s * 0.3, -s * 0.5, -s * 0.16, -s * 0.62); g.lineTo(s * 0.16, -s * 0.62); g.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.32, -s * 0.15); g.closePath();
    g.save(); g.clip();
    g.fillStyle = mix(PCOL[0].main, "#ff6060", flashK); g.fillRect(-s * 0.4, -s * 0.7, s * 0.4, s * 0.6);
    g.fillStyle = mix(PCOL[1].main, "#ff6060", flashK); g.fillRect(0, -s * 0.7, s * 0.4, s * 0.6);
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(-s * 0.4, -s * 0.7, s * 0.8, s * 0.12);
    g.restore();
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.restore();
    // ceinture + boucle
    rrect(g, -s * 0.27, -s * 0.33, s * 0.54, s * 0.06, s * 0.03); fillStroke(g, "#ffd257", lw * 0.7);
    // tête
    g.beginPath(); g.arc(0, -s * 0.78, s * 0.2, 0, TAU); fillStroke(g, mix("#ffe2c6", "#ff9a9a", flashK), lw);
    // barbe moustache
    g.beginPath(); g.moveTo(-s * 0.12, -s * 0.7); g.quadraticCurveTo(0, -s * 0.6, s * 0.12, -s * 0.7); g.quadraticCurveTo(0, -s * 0.66, -s * 0.12, -s * 0.7); g.fillStyle = "#fffaf0"; g.fill(); g.lineWidth = lw * 0.6; g.stroke();
    // yeux
    var lk = clamp(o.look || 0, -1, 1);
    if (o.dead) { [-1, 1].forEach(function (k) { var ex = k * s * 0.075, ey = -s * 0.8; g.beginPath(); g.moveTo(ex - s * 0.03, ey - s * 0.03); g.lineTo(ex + s * 0.03, ey + s * 0.03); g.moveTo(ex + s * 0.03, ey - s * 0.03); g.lineTo(ex - s * 0.03, ey + s * 0.03); g.lineWidth = s * 0.02; g.strokeStyle = INK; g.stroke(); }); }
    else if (flashK > 0.3) { [-1, 1].forEach(function (k) { var ex = k * s * 0.075, ey = -s * 0.8; g.beginPath(); g.moveTo(ex - k * s * 0.035, ey - s * 0.03); g.lineTo(ex + k * s * 0.025, ey); g.lineTo(ex - k * s * 0.035, ey + s * 0.03); g.lineWidth = s * 0.022; g.strokeStyle = INK; g.lineCap = "round"; g.stroke(); }); }
    else { eye(g, -s * 0.075, -s * 0.81, s * 0.032, { blink: o.blink, lx: lk, ly: 0.5 }); eye(g, s * 0.075, -s * 0.81, s * 0.032, { blink: o.blink, lx: lk, ly: 0.5 }); }
    blush(g, -s * 0.13, -s * 0.74, s * 0.035); blush(g, s * 0.13, -s * 0.74, s * 0.035);
    if (o.sweat) { g.beginPath(); g.moveTo(s * 0.19, -s * 0.92); g.quadraticCurveTo(s * 0.23, -s * 0.85, s * 0.2, -s * 0.82); g.quadraticCurveTo(s * 0.16, -s * 0.85, s * 0.19, -s * 0.92); g.fillStyle = "#8fd3ff"; g.fill(); }
    // couronne + croix
    g.save(); g.translate(0, -s * 0.94); g.scale(1.6, 1.6); drawCrownTop(g, s, 0); g.restore();
    g.beginPath(); g.rect(-s * 0.018, -s * 1.27, s * 0.036, s * 0.12); g.rect(-s * 0.05, -s * 1.23, s * 0.1, s * 0.034); g.fillStyle = "#ffd257"; g.fill(); g.lineWidth = lw * 0.6; g.strokeStyle = INK; g.stroke();
    g.restore();
  }

  /* ====================== DESSIN : ICÔNES ====================== */
  function drawGem(g, x, y, r, col, shine) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, -r * 0.25); g.lineTo(0, r); g.lineTo(-r * 0.8, -r * 0.25); g.closePath();
    fillStroke(g, grad(g, -r, r, col.light, col.main), r * 0.12);
    g.beginPath(); g.moveTo(-r * 0.8, -r * 0.25); g.lineTo(r * 0.8, -r * 0.25); g.moveTo(0, -r); g.lineTo(-r * 0.3, -r * 0.25); g.lineTo(0, r); g.lineTo(r * 0.3, -r * 0.25); g.closePath();
    g.lineWidth = r * 0.06; g.strokeStyle = "rgba(58,44,76,.45)"; g.stroke();
    if (shine) { g.globalAlpha = shine; star(g, -r * 0.35, -r * 0.45, r * 0.35, 4, 0.25); g.fillStyle = "#fff"; g.fill(); }
    g.restore();
  }
  function drawPowerIcon(g, kind, x, y, r) {
    g.save(); g.translate(x, y);
    var lw = r * 0.1;
    if (kind === "meteor") {
      // flammes derrière le rocher
      g.beginPath(); g.moveTo(r * 0.1, -r * 0.55); g.quadraticCurveTo(r * 0.7, -r * 1.15, r * 1.05, -r * 1.0); g.quadraticCurveTo(r * 0.8, -r * 0.7, r * 0.95, -r * 0.35);
      g.quadraticCurveTo(r * 0.6, -r * 0.4, r * 0.55, -r * 0.05); g.closePath(); g.fillStyle = "#ffcf4a"; g.fill(); g.lineWidth = lw * 0.8; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(-r * 0.1, r * 0.15, r * 0.7, 0, TAU); fillStroke(g, grad(g, -r * 0.6, r * 0.8, "#ff9a52", "#c8381f"), lw);
      g.beginPath(); g.arc(-r * 0.4, r * 0.35, r * 0.12, 0, TAU); g.arc(r * 0.15, r * 0.5, r * 0.09, 0, TAU); g.fillStyle = "rgba(100,20,10,.35)"; g.fill();
      eye(g, -r * 0.35, r * 0.1, r * 0.11, { ly: 0.2 }); eye(g, r * 0.1, r * 0.1, r * 0.11, { ly: 0.2 });
      g.beginPath(); g.arc(-r * 0.12, r * 0.3, r * 0.12, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = lw * 0.6; g.strokeStyle = INK; g.stroke();
    } else if (kind === "freeze") {
      rrect(g, -r * 0.75, -r * 0.75, r * 1.5, r * 1.5, r * 0.3); fillStroke(g, grad(g, -r, r, "#eaf8ff", "#8fd0ff"), lw);
      g.strokeStyle = "#3b82c4"; g.lineWidth = r * 0.12; g.lineCap = "round";
      for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); g.lineTo(-Math.cos(a) * r * 0.5, -Math.sin(a) * r * 0.5); g.stroke(); }
      g.beginPath(); g.ellipse(-r * 0.4, -r * 0.45, r * 0.15, r * 0.08, -0.6, 0, TAU); g.fillStyle = "#fff"; g.fill();
    } else if (kind === "lightning") {
      g.beginPath(); g.arc(0, 0, r * 0.88, 0, TAU); fillStroke(g, grad(g, -r, r, "#7b6cf0", "#3a2f8f"), lw);
      g.beginPath(); g.moveTo(r * 0.22, -r * 0.7); g.lineTo(-r * 0.4, r * 0.12); g.lineTo(-r * 0.03, r * 0.12); g.lineTo(-r * 0.22, r * 0.72); g.lineTo(r * 0.42, -r * 0.18); g.lineTo(r * 0.05, -r * 0.18); g.closePath();
      fillStroke(g, "#ffe45e", lw * 0.8);
    } else if (kind === "heal") {
      heart(g, 0, r * 0.05, r * 2.0); fillStroke(g, grad(g, -r * 0.7, r * 0.7, "#ff9bb0", "#ef4466"), lw);
      g.fillStyle = "#fff"; rrect(g, -r * 0.08, -r * 0.38, r * 0.16, r * 0.62, r * 0.05); g.fill(); rrect(g, -r * 0.31, -r * 0.15, r * 0.62, r * 0.16, r * 0.05); g.fill();
      g.beginPath(); g.ellipse(-r * 0.5, -r * 0.4, r * 0.14, r * 0.08, -0.6, 0, TAU); g.fillStyle = "rgba(255,255,255,.7)"; g.fill();
    } else if (kind === "frenzy") {
      star(g, 0, 0, r * 0.98, 9, 0.68); fillStroke(g, grad(g, -r, r, "#ffb347", "#e8412c"), lw);
      eye(g, -r * 0.27, -r * 0.05, r * 0.11, { ly: 0.3 }); eye(g, r * 0.27, -r * 0.05, r * 0.11, { ly: 0.3 });
      g.beginPath(); g.moveTo(-r * 0.42, -r * 0.3); g.lineTo(-r * 0.12, -r * 0.18); g.moveTo(r * 0.42, -r * 0.3); g.lineTo(r * 0.12, -r * 0.18); g.lineWidth = lw * 0.8; g.lineCap = "round"; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(0, r * 0.32, r * 0.18, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = lw * 0.7; g.stroke();
    } else {
      var cols = ["#ff6b8a", "#ffb05a", "#ffe066", "#7fe08a", "#6fc3ff", "#a98bff"];
      for (var k = 0; k < cols.length; k++) { g.beginPath(); g.arc(0, r * 0.35, r * (0.95 - k * 0.11), Math.PI, TAU); g.lineWidth = r * 0.12; g.strokeStyle = cols[k]; g.stroke(); }
      g.beginPath(); g.arc(-r * 0.62, r * 0.4, r * 0.22, 0, TAU); g.arc(-r * 0.4, r * 0.42, r * 0.2, 0, TAU); g.fillStyle = "#fff"; g.fill();
      g.beginPath(); g.arc(r * 0.62, r * 0.4, r * 0.22, 0, TAU); g.arc(r * 0.4, r * 0.42, r * 0.2, 0, TAU); g.fill();
    }
    g.restore();
  }

  root.KD_ART = {
    PCOL: PCOL, INK: INK, ENEMY_COL: ENEMY_COL, TAU: TAU, lerp: lerp, clamp: clamp, setClock: function (c) { clock = c; },
    mix: mix, rrect: rrect, grad: grad, fillStroke: fillStroke, star: star, heart: heart, eye: eye, blush: blush, hexA: hexA,
    drawPiece: drawPiece, drawEnemy: drawEnemy, drawKing: drawKing, drawGem: drawGem, drawPowerIcon: drawPowerIcon, drawCrownTop: drawCrownTop,
  };
})(window);
