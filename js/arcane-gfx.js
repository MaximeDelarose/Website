/* =========================================================================
   Arcane Tactics — bibliothèque graphique commune (AT_GFX)
   Palette globale, courbes lissées, volumes (dégradé + lumière), membres
   effilés, yeux lumineux, particules. Tout le dessin vectoriel du jeu
   (personnages, monstres, équipements, décors, interface) passe par ces
   outils : c'est ce qui donne une direction artistique cohérente et permet
   d'ajouter de nouveaux éléments sans redessiner à la main.

   Direction artistique : fantasy sombre stylisée, vue isométrique, contours
   nets encre, lumière chaude venant du haut-gauche, ombres froides violettes,
   accents cramoisis / turquoise lumineux (référence : « Direction Artistique »).
   ========================================================================= */
(function (root) {
  "use strict";
  var TAU = Math.PI * 2;

  /* ====================== PALETTE ====================== */
  var PAL = {
    ink: "#150f1f", night: "#1a1426", aubergine: "#241a33", plum: "#3a2650",
    violet: "#5b3a8e", violetLight: "#8a63c9", slate: "#3b4a7a", slateLight: "#5d70a8",
    crimson: "#b3283a", crimsonLight: "#e04258", wine: "#6b1f3a", rose: "#ff6f8e",
    cream: "#efe3cc", parchment: "#e8dcc8", bone: "#d9ccb4",
    gold: "#e0ad4a", goldDark: "#8a6624", bronze: "#8a5a3b",
    teal: "#4fc3c7", tealDark: "#2a7e86", cyan: "#7ff0ff", crystal: "#5db8ff",
    leaf: "#4fa86a", moss: "#3a7a52", ash: "#8a8798", stone: "#7d7694",
    // raretés
    common: "#c9ccd6", magic: "#5fb7ff", rare: "#ffd257", epic: "#c77dff", legend: "#ff9a3c",
    // langage visuel des effets
    danger: "#ff4a5e", disrupt: "#b58cff", control: "#5fb7ff", power: "#ff9a3c", heal: "#6dffa4",
  };

  /* ====================== COULEURS ====================== */
  function parse(hex) {
    if (hex[0] === "#") { if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]; var n = parseInt(hex.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    var m = /rgba?\(([^)]+)\)/.exec(hex); if (m) { var p = m[1].split(","); return [+p[0], +p[1], +p[2]]; }
    return [128, 128, 128];
  }
  function toHex(r, g, b) { return "#" + ((1 << 24) + (Math.max(0, Math.min(255, r | 0)) << 16) + (Math.max(0, Math.min(255, g | 0)) << 8) + Math.max(0, Math.min(255, b | 0))).toString(16).slice(1); }
  var shadeCache = {};
  function shade(hex, k) {
    var key = hex + k; if (shadeCache[key]) return shadeCache[key];
    var c = parse(hex), r = c[0], g = c[1], b = c[2];
    if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return (shadeCache[key] = toHex(r, g, b));
  }
  function mix(a, b, t) { var A = parse(a), B = parse(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function rgba(hex, a) { var c = parse(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  /* ====================== COURBES LISSÉES ====================== */
  // courbe de Catmull-Rom passant par les points (fermée ou non)
  function smooth(g, pts, closed, tension) {
    var n = pts.length, t = tension == null ? 0.5 : tension;
    if (n < 3) { g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]); return; }
    g.moveTo(pts[0][0], pts[0][1]);
    var last = closed ? n : n - 1;
    for (var k = 0; k < last; k++) {
      var p0 = pts[closed ? (k - 1 + n) % n : Math.max(0, k - 1)], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[closed ? (k + 2) % n : Math.min(n - 1, k + 2)];
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t / 3 * 2 * 0.5 * 1, p1[1] + (p2[1] - p0[1]) * t / 3 * 2 * 0.5 * 1,
        p2[0] - (p3[0] - p1[0]) * t / 3 * 2 * 0.5 * 1, p2[1] - (p3[1] - p1[1]) * t / 3 * 2 * 0.5 * 1, p2[0], p2[1]);
    }
    if (closed) g.closePath();
  }
  function bbox(pts) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }); return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 }; }

  /* ====================== VOLUMES ====================== */
  // remplit une forme lissée avec dégradé, lumière haut-gauche, ombre bas-droite, contour encre
  function body(g, pts, col, o) {
    o = o || {};
    var bb = bbox(pts), lw = o.lw == null ? 2 : o.lw, closed = o.closed !== false;
    g.save();
    g.beginPath(); smooth(g, pts, closed, o.tension);
    var gr = g.createLinearGradient(bb.x0, bb.y0, bb.x0 + bb.w * 0.7, bb.y1);
    gr.addColorStop(0, shade(col, o.hi == null ? 0.2 : o.hi)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, o.lo == null ? -0.34 : o.lo));
    g.fillStyle = gr; g.fill();
    g.clip();
    var cx = bb.x0 + bb.w * 0.3, cy = bb.y0 + bb.h * 0.22, rr = Math.max(bb.w, bb.h) * 0.75;
    var rg = g.createRadialGradient(cx, cy, 1, cx, cy, rr);
    rg.addColorStop(0, "rgba(255,255,255," + (o.shine == null ? 0.26 : o.shine) + ")"); rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(bb.x0 - 2, bb.y0 - 2, bb.w + 4, bb.h + 4);
    var sg = g.createLinearGradient(0, bb.y0 + bb.h * 0.55, 0, bb.y1);
    sg.addColorStop(0, "rgba(10,5,25,0)"); sg.addColorStop(1, "rgba(10,5,25," + (o.shadow == null ? 0.3 : o.shadow) + ")");
    g.fillStyle = sg; g.fillRect(bb.x0 - 2, bb.y0 - 2, bb.w + 4, bb.h + 4);
    if (o.paint) o.paint(g, bb);
    g.restore();
    if (lw > 0) { g.save(); g.beginPath(); smooth(g, pts, closed, o.tension); g.strokeStyle = o.stroke || PAL.ink; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); g.restore(); }
  }
  // membre effilé : courbe de contrôle (3 points) avec épaisseur variable
  function limb(g, a, b, c, w0, w1, col, o) {
    o = o || {};
    var N = 12, L = [], R = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N, mt = 1 - t;
      var x = mt * mt * a[0] + 2 * mt * t * b[0] + t * t * c[0], y = mt * mt * a[1] + 2 * mt * t * b[1] + t * t * c[1];
      var dx = 2 * mt * (b[0] - a[0]) + 2 * t * (c[0] - b[0]), dy = 2 * mt * (b[1] - a[1]) + 2 * t * (c[1] - b[1]);
      var d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = (w0 + (w1 - w0) * t) / 2;
      L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]);
    }
    g.save();
    g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (var j = 1; j <= N; j++) g.lineTo(L[j][0], L[j][1]); for (var k = N; k >= 0; k--) g.lineTo(R[k][0], R[k][1]); g.closePath();
    var gr = g.createLinearGradient(a[0], a[1], c[0], c[1]); gr.addColorStop(0, shade(col, 0.15)); gr.addColorStop(1, shade(col, -0.3));
    g.fillStyle = gr; g.fill();
    if (o.lw !== 0) { g.strokeStyle = o.stroke || PAL.ink; g.lineWidth = o.lw || 1.6; g.lineJoin = "round"; g.stroke(); }
    g.restore();
  }
  function disc(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill(); }
  function poly(g, pts, fill, stroke, lw) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.lineJoin = "round"; g.stroke(); } }
  function glow(g, x, y, r, col, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a == null ? 0.8 : a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // œil lumineux : fente ou rond, avec halo
  function eye(g, x, y, w, h, col, o) {
    o = o || {};
    glow(g, x, y, Math.max(w, h) * 2.6, col, 0.55);
    g.fillStyle = o.core || "#fff"; g.beginPath(); g.ellipse(x, y, w, h, o.rot || 0, 0, TAU); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, w * 0.72, h * 0.72, o.rot || 0, 0, TAU); g.fill();
    if (o.pupil) { g.fillStyle = PAL.ink; g.beginPath(); g.ellipse(x, y, w * 0.18, h * 0.8, o.rot || 0, 0, TAU); g.fill(); }
  }
  function shadow(g, x, y, r, a) { g.fillStyle = "rgba(14,8,28," + (a == null ? 0.32 : a) + ")"; g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0, TAU); g.fill(); }
  function sparkle(g, x, y, s, col) { g.fillStyle = col || "#fff"; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s * 0.7, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s * 0.7, y); g.quadraticCurveTo(x, y, x, y - s); g.fill(); }
  // petits éclats qui montent / tournent (animation partagée)
  function motes(g, t, n, rx, ry, cy, col, size) {
    for (var i = 0; i < n; i++) { var a = t * 0.9 + i * TAU / n, f = (t * 0.4 + i / n) % 1; disc(g, Math.cos(a) * rx * (0.6 + 0.4 * Math.sin(i * 7)), cy - f * ry, (size || 1.6) * (1 - f), rgba(col, (1 - f) * 0.9)); }
  }
  // texture de pierre / écailles : petites fissures dans une zone
  function cracks(g, bb, n, col, seed) {
    var s = seed || 7; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    g.strokeStyle = col || "rgba(20,10,35,.35)"; g.lineWidth = 1; g.lineCap = "round";
    for (var i = 0; i < n; i++) { var x = bb.x0 + r() * bb.w, y = bb.y0 + r() * bb.h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 10, y + r() * 9); g.lineTo(x + (r() - 0.5) * 12, y + r() * 14); g.stroke(); }
  }

  root.AT_GFX = { TAU: TAU, PAL: PAL, shade: shade, mix: mix, rgba: rgba, parse: parse, smooth: smooth, bbox: bbox, body: body, limb: limb, disc: disc, ell: ell, poly: poly, glow: glow, eye: eye, shadow: shadow, sparkle: sparkle, motes: motes, cracks: cracks };
})(typeof window !== "undefined" ? window : globalThis);
