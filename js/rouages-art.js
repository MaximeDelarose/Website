/* Rouages : sprites dessinés au pixel, dans la palette des convoyeurs de Blood_seller
   (gris métal #838385 / #6b6b70 / #4f4f54, contours noirs, jaune #fbf236).
   Tout est dessiné à 32 px par tuile, comme les convoyeurs. */
(function () {
  "use strict";
  var P = {
    K: "#000000", L2: "#a7a7ad", L: "#838385", M: "#6b6b70", D: "#4f4f54", D2: "#393542", D3: "#292831", D4: "#1e2122",
    Y: "#fbf236", Y2: "#d1c928", R: "#e43b44", G: "#63c74d", B: "#3b5dc9", B2: "#5b8ce0", B3: "#9cc6ff",
    O: "#f28c28", O2: "#ffd23f", O3: "#fff1a8"
  };
  function rng(seed) { var a = seed | 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; var g = c.getContext("2d"); g.imageSmoothingEnabled = false; return { c: c, g: g }; }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function disc(g, cx, cy, r, c) {
    g.fillStyle = c;
    for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) g.fillRect(x, y, 1, 1);
    }
  }
  function odisc(g, cx, cy, r, fill, hi, lo) {
    disc(g, cx, cy, r, P.K); disc(g, cx, cy, r - 1, lo || fill); disc(g, cx - 0.6, cy - 0.6, r - 1.6, fill);
    if (hi) disc(g, cx - r * 0.35, cy - r * 0.35, Math.max(1, r * 0.3), hi);
  }
  // panneau métal à la Blood_seller : contour noir, arête claire en haut/gauche, ombre en bas/droite, rivets
  function panel(g, x, y, w, h, o) {
    o = o || {};
    R(g, x, y, w, h, P.K);
    R(g, x + 1, y + 1, w - 2, h - 2, o.fill || P.M);
    R(g, x + 1, y + 1, w - 2, 1, o.hi || P.L); R(g, x + 1, y + 1, 1, h - 2, o.hi || P.L);
    R(g, x + 1, y + h - 3, w - 2, 2, o.lo || P.D); R(g, x + w - 2, y + 1, 1, h - 2, o.lo || P.D);
    if (o.rivets !== false && w > 10 && h > 10) {
      [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 6], [x + w - 5, y + h - 6]].forEach(function (p) { R(g, p[0], p[1], 2, 2, P.D2); R(g, p[0], p[1], 1, 1, P.L2); });
    }
  }
  function hazard(g, x, y, w, h) {
    R(g, x, y, w, h, P.K);
    for (var i = -h; i < w; i += 4) for (var k = 0; k < h; k++) { var xx = x + i + k; if (xx >= x && xx < x + w) { R(g, xx, y + k, 2, 1, P.Y2); } }
  }
  function grille(g, x, y, w, h) {
    R(g, x, y, w, h, P.K);
    for (var yy = y + 1; yy < y + h - 1; yy += 2) R(g, x + 1, yy, w - 2, 1, P.D2);
  }
  function led(g, x, y, c) { R(g, x - 1, y - 1, 4, 4, P.K); R(g, x, y, 2, 2, c); R(g, x, y, 1, 1, "#ffffff"); }
  function rot(src, q) {
    if (!q) return src;
    var w = src.width, h = src.height, o = cv(q % 2 ? h : w, q % 2 ? w : h);
    o.g.translate(o.c.width / 2, o.c.height / 2); o.g.rotate(q * Math.PI / 2); o.g.drawImage(src, -w / 2, -h / 2);
    return o.c;
  }
  function rots(src) { return [0, 1, 2, 3].map(function (q) { return rot(src, q); }); }

  /* ---------- terrain ---------- */
  var GROUND = ["#33352d", "#30322a", "#363830"];
  function ground(seed) {
    var o = cv(32, 32), g = o.g, r = rng(seed);
    R(g, 0, 0, 32, 32, GROUND[seed % 3]);
    for (var i = 0; i < 26; i++) R(g, (r() * 32) | 0, (r() * 32) | 0, 1 + ((r() * 2) | 0), 1, r() < 0.5 ? "#2a2c24" : "#3c3f35");
    for (i = 0; i < 2; i++) { var x = (r() * 28) | 0, y = (r() * 28) | 0; R(g, x, y + 1, 3, 1, "#22241d"); R(g, x, y, 3, 1, "#4a4c43"); }
    return o.c;
  }
  function rock(seed) {
    var o = cv(32, 32), g = o.g, r = rng(seed);
    g.drawImage(ground(seed + 7), 0, 0);
    var blobs = [[16, 17, 13]];
    for (var i = 0; i < 2; i++) blobs.push([7 + r() * 18, 7 + r() * 18, 6 + r() * 4]);
    blobs.forEach(function (b) { disc(g, b[0], b[1] + 1, b[2] + 1, "#15161a"); });
    blobs.forEach(function (b) { disc(g, b[0], b[1], b[2], P.K); });
    blobs.forEach(function (b) { disc(g, b[0], b[1], b[2] - 1, "#45414b"); disc(g, b[0] - 1, b[1] - 1, b[2] - 2.2, "#5a5662"); disc(g, b[0] - b[2] * 0.35, b[1] - b[2] * 0.4, b[2] * 0.35, "#77727d"); });
    for (i = 0; i < 4; i++) R(g, 6 + ((r() * 20) | 0), 6 + ((r() * 20) | 0), 2, 1, "#2e2b33");
    return o.c;
  }
  // massif rocheux en auto-tiling : mask = côtés ouverts (1 haut, 2 droite, 4 bas, 8 gauche)
  function rockTile(mask, seed) {
    var o = cv(32, 32), g = o.g, r = rng(seed * 7 + 3);
    g.drawImage(ground(seed), 0, 0);
    var top = mask & 1, right = mask & 2, bot = mask & 4, left = mask & 8;
    var x0 = left ? 2 : 0, x1 = right ? 30 : 32, y0 = top ? 3 : 0, y1 = bot ? 26 : 32;
    if (bot) { R(g, x0, y1, x1 - x0, 6, "#15161a"); }
    R(g, x0, y0, x1 - x0, y1 - y0, "#4a4651");
    for (var i = 0; i < 40; i++) R(g, x0 + ((r() * (x1 - x0)) | 0), y0 + ((r() * (y1 - y0)) | 0), 2, 1, r() < 0.5 ? "#55515d" : "#3f3b46");
    for (i = 0; i < 3; i++) { var cx = x0 + 3 + ((r() * (x1 - x0 - 8)) | 0), cy = y0 + 3 + ((r() * (y1 - y0 - 8)) | 0); R(g, cx, cy, 4, 1, "#2e2b33"); R(g, cx + 3, cy + 1, 1, 3, "#2e2b33"); R(g, cx, cy - 1, 4, 1, "#625e6b"); }
    if (bot) { R(g, x0, y1 - 4, x1 - x0, 4, "#35313c"); R(g, x0, y1, x1 - x0, 1, P.K); }
    if (top) { R(g, x0, y0, x1 - x0, 1, P.K); R(g, x0, y0 + 1, x1 - x0, 2, "#6f6a78"); }
    if (left) { R(g, x0, y0, 1, y1 - y0 + (bot ? 1 : 0), P.K); R(g, x0 + 1, y0 + (top ? 1 : 0), 1, y1 - y0 - (top ? 1 : 0), "#5d5966"); }
    if (right) { R(g, x1 - 1, y0, 1, y1 - y0 + (bot ? 1 : 0), P.K); R(g, x1 - 2, y0 + (top ? 1 : 0), 1, y1 - y0 - (top ? 1 : 0), "#35313c"); }
    // coins arrondis
    function cut(cx, cy, fx, fy) { for (var k = 0; k < 3; k++) for (var j = 0; j < 3 - k; j++) { var gx = cx + fx * j, gy = cy + fy * k; g.drawImage(groundPx, (gx & 31), (gy & 31), 1, 1, gx, gy, 1, 1); } R(g, cx + fx * (3 - 1) * 0 + (fx > 0 ? 3 : -3) * 0, cy, 0, 0, P.K); }
    var groundPx = ground(seed);
    if (top && left) { cut(x0, y0, 1, 1); R(g, x0 + 3, y0, 1, 1, P.K); R(g, x0, y0 + 3, 1, 1, P.K); R(g, x0 + 1, y0 + 2, 1, 1, P.K); R(g, x0 + 2, y0 + 1, 1, 1, P.K); }
    if (top && right) { cut(x1 - 1, y0, -1, 1); R(g, x1 - 4, y0, 1, 1, P.K); R(g, x1 - 1, y0 + 3, 1, 1, P.K); R(g, x1 - 2, y0 + 2, 1, 1, P.K); R(g, x1 - 3, y0 + 1, 1, 1, P.K); }
    if (bot && left) { cut(x0, y1 + 0, 1, -1); R(g, x0 + 1, y1 - 2, 1, 1, P.K); R(g, x0 + 2, y1 - 1, 1, 1, P.K); }
    if (bot && right) { cut(x1 - 1, y1 + 0, -1, -1); R(g, x1 - 2, y1 - 2, 1, 1, P.K); R(g, x1 - 3, y1 - 1, 1, 1, P.K); }
    return o.c;
  }
  var ORE_COL = {
    cu_o: ["#8f4426", "#d77643", "#f5a66b"],
    fe_o: ["#5f6b78", "#9aa7b5", "#dfe7ee"],
    coal: ["#141417", "#2c2c33", "#5d5d6b"]
  };
  function ore(kind, seed) {
    var o = cv(32, 32), g = o.g, r = rng(seed * 13 + kind.length);
    g.drawImage(ground(seed), 0, 0);
    var c = ORE_COL[kind];
    var n = 4 + ((r() * 2) | 0);
    for (var i = 0; i < n; i++) {
      var x = 6 + (i % 2) * 11 + r() * 9, y = 6 + ((i / 2) | 0) * 9 + r() * 6, s = 3.4 + r() * 2.4;
      disc(g, x + 0.5, y + 1.2, s + 1, "#1a1b16");
      disc(g, x, y, s + 1, P.K); disc(g, x, y, s, c[0]); disc(g, x - 0.7, y - 0.7, s - 1, c[1]); R(g, Math.round(x - s / 2), Math.round(y - s / 2), 2, 1, c[2]);
    }
    return o.c;
  }

  /* ---------- objets (icônes 16 px) ---------- */
  function itemIcon(id) {
    var o = cv(16, 16), g = o.g;
    if (ORE_COL[id]) {
      var c = ORE_COL[id];
      disc(g, 8, 9, 6.5, P.K); disc(g, 8, 9, 5.5, c[0]); disc(g, 7.2, 8.2, 4.3, c[1]); R(g, 5, 5, 3, 2, c[2]); R(g, 10, 10, 2, 1, c[0]);
    } else if (id === "cu" || id === "fe" || id === "steel") {
      var cc = id === "cu" ? ["#8f4426", "#d77643", "#f5a66b"] : id === "fe" ? ["#5f6b78", "#a9b5c2", "#eef3f7"] : ["#2f4466", "#5b8ce0", "#b9d4ff"];
      R(g, 1, 5, 14, 8, P.K); R(g, 3, 4, 10, 1, P.K);
      R(g, 2, 6, 12, 6, cc[0]); R(g, 3, 5, 10, 4, cc[1]); R(g, 4, 5, 6, 1, cc[2]);
      if (id === "steel") { R(g, 2, 8, 12, 1, P.K); }
    } else if (id === "ammo") {
      for (var k = 0; k < 3; k++) { var x = 2 + k * 4; R(g, x, 4, 4, 10, P.K); R(g, x + 1, 8, 2, 5, "#c99a2e"); R(g, x + 1, 5, 2, 3, "#b0b8c0"); R(g, x + 1, 8, 1, 4, "#f2d36b"); }
    } else if (id === "shell") {
      R(g, 5, 1, 6, 14, P.K); R(g, 4, 9, 8, 6, P.K);
      R(g, 6, 2, 4, 6, "#7a8792"); R(g, 6, 2, 2, 5, "#c3ccd4"); R(g, 5, 9, 6, 5, "#c99a2e"); R(g, 5, 9, 2, 4, "#f2d36b"); R(g, 5, 8, 6, 1, P.R);
    }
    return o.c;
  }

  /* ---------- machines (vues de dessus, orientées vers la droite) ---------- */
  function drill(frame) {
    var o = cv(64, 64), g = o.g;
    panel(g, 1, 1, 62, 62);
    hazard(g, 4, 4, 56, 4); hazard(g, 4, 54, 56, 4);
    R(g, 4, 9, 4, 44, P.D); R(g, 56, 9, 4, 44, P.D);
    odisc(g, 32, 31, 19, P.D, null, P.D2);
    disc(g, 32, 31, 15, P.K); disc(g, 32, 31, 14, P.D3);
    // tête de forage qui tourne
    var a = frame * Math.PI / 8;
    for (var b = 0; b < 3; b++) {
      var an = a + b * 2.094;
      for (var t = 3; t < 13; t++) {
        var x = 32 + Math.cos(an + t * 0.09) * t, y = 31 + Math.sin(an + t * 0.09) * t;
        R(g, Math.round(x) - 1, Math.round(y) - 1, 3, 3, P.K);
      }
      for (t = 3; t < 12; t++) { x = 32 + Math.cos(an + t * 0.09) * t; y = 31 + Math.sin(an + t * 0.09) * t; R(g, Math.round(x), Math.round(y), 1, 1, t < 7 ? P.L2 : P.L); }
    }
    odisc(g, 32, 31, 4, P.Y, P.O3, P.Y2);
    led(g, 51, 11, frame % 4 < 2 ? P.G : "#2e6b25");
    return o.c;
  }
  function smelter(on) {
    var o = cv(64, 64), g = o.g;
    panel(g, 1, 1, 62, 62);
    grille(g, 6, 6, 18, 12); grille(g, 6, 46, 18, 12);
    // creuset central
    R(g, 14, 20, 34, 24, P.K); R(g, 15, 21, 32, 22, P.D2); R(g, 15, 21, 32, 2, P.D);
    R(g, 18, 25, 26, 15, P.K);
    R(g, 19, 26, 24, 13, on ? P.O : "#3a2a22");
    if (on) { R(g, 21, 28, 20, 9, P.O2); R(g, 24, 30, 12, 5, P.O3); }
    // cheminée
    odisc(g, 50, 14, 8, P.M, P.L, P.D); disc(g, 50, 14, 5, P.K); disc(g, 50, 14, 4, on ? "#3b2a22" : P.D4);
    led(g, 52, 50, on ? P.O2 : P.R);
    return o.c;
  }
  function foundry(on) {
    var o = cv(64, 64), g = o.g;
    panel(g, 1, 1, 62, 62, { fill: "#5f5f66" });
    hazard(g, 4, 4, 4, 56);
    odisc(g, 34, 32, 18, P.M, P.L, P.D);
    disc(g, 34, 32, 13, P.K); disc(g, 34, 32, 12, P.D3);
    if (on) { disc(g, 34, 32, 10, P.O); disc(g, 33, 31, 7, P.O2); disc(g, 32, 30, 3.5, P.O3); }
    else disc(g, 34, 32, 10, "#2e2220");
    [[54, 10], [54, 54]].forEach(function (p) { odisc(g, p[0], p[1], 6, P.M, P.L, P.D); disc(g, p[0], p[1], 3.5, P.K); });
    led(g, 12, 52, on ? P.B3 : P.R);
    return o.c;
  }
  function gear(g, cx, cy, r, a, col) {
    for (var i = 0; i < 8; i++) { var an = a + i * Math.PI / 4; R(g, Math.round(cx + Math.cos(an) * r) - 2, Math.round(cy + Math.sin(an) * r) - 2, 4, 4, P.K); }
    disc(g, cx, cy, r, P.K); disc(g, cx, cy, r - 1, col);
    for (i = 0; i < 8; i++) { an = a + i * Math.PI / 4; R(g, Math.round(cx + Math.cos(an) * r) - 1, Math.round(cy + Math.sin(an) * r) - 1, 2, 2, col); }
    disc(g, cx - 1, cy - 1, r - 3, P.L); disc(g, cx, cy, 2.5, P.K);
  }
  function assembler(frame) {
    var o = cv(64, 64), g = o.g;
    panel(g, 1, 1, 62, 62);
    R(g, 6, 6, 52, 18, P.K); R(g, 7, 7, 50, 16, P.D2);
    gear(g, 20, 15, 6, frame * Math.PI / 16, P.M); gear(g, 34, 15, 6, -frame * Math.PI / 16 + 0.39, P.M);
    R(g, 44, 9, 11, 12, P.K); R(g, 45, 10, 9, 10, P.B); R(g, 46, 11, 7, 2, P.B3); R(g, 46, 15, (frame % 8) + 1 > 7 ? 7 : (frame % 8) + 1, 1, P.B2);
    // bras / presse
    R(g, 8, 28, 48, 28, P.K); R(g, 9, 29, 46, 26, P.D3);
    var py = 34 + Math.round(Math.abs(Math.sin(frame * Math.PI / 8)) * 6);
    panel(g, 22, py - 6, 20, 14, { rivets: false });
    R(g, 30, 28, 4, py - 34, P.L);
    hazard(g, 10, 50, 44, 3);
    return o.c;
  }
  function gunBase() {
    var o = cv(64, 64), g = o.g;
    panel(g, 2, 2, 60, 60, { fill: P.D, hi: P.M, lo: P.D2 });
    hazard(g, 6, 6, 52, 3); hazard(g, 6, 55, 52, 3);
    odisc(g, 32, 32, 21, P.M, null, P.D);
    disc(g, 32, 32, 17, P.D2);
    return o.c;
  }
  function gunHead(flash) {
    var o = cv(64, 64), g = o.g;
    // canons jumeaux vers la droite
    [[26], [35]].forEach(function (b) { R(g, 32, b[0] - 1, 28, 5, P.K); R(g, 33, b[0], 26, 3, P.D); R(g, 33, b[0], 26, 1, P.L2); R(g, 54, b[0] - 1, 3, 5, P.K); });
    if (flash) { disc(g, 61, 28, 3, P.O2); disc(g, 61, 37, 3, P.O2); disc(g, 61, 28, 1.5, "#fff"); disc(g, 61, 37, 1.5, "#fff"); }
    odisc(g, 30, 32, 13, P.M, P.L2, P.D);
    R(g, 21, 29, 14, 7, P.K); R(g, 22, 30, 12, 5, P.D2); R(g, 23, 31, 4, 3, P.Y);
    return o.c;
  }
  function cannonBase() {
    var o = cv(64, 64), g = o.g;
    panel(g, 1, 1, 62, 62, { fill: "#5a5f6e", hi: "#7d8396", lo: "#3c4050" });
    for (var i = 0; i < 4; i++) { var x = i % 2 ? 50 : 6, y = i < 2 ? 6 : 50; R(g, x, y, 8, 8, P.K); R(g, x + 1, y + 1, 6, 6, P.Y2); R(g, x + 2, y + 2, 4, 4, P.K); }
    odisc(g, 32, 32, 23, "#5a5f6e", null, "#3c4050");
    disc(g, 32, 32, 19, "#2c2f3a");
    return o.c;
  }
  function cannonHead(flash) {
    var o = cv(80, 80), g = o.g;
    R(g, 40, 33, 36, 14, P.K); R(g, 41, 34, 34, 12, "#3c4050"); R(g, 41, 35, 34, 3, "#7d8396"); R(g, 70, 31, 8, 18, P.K); R(g, 71, 32, 6, 16, "#2c2f3a");
    if (flash) { disc(g, 78, 40, 5, P.O2); disc(g, 78, 40, 2.5, "#fff"); }
    odisc(g, 38, 40, 17, "#7d8396", "#b3bacb", "#5a5f6e");
    R(g, 28, 36, 18, 8, P.K); R(g, 29, 37, 16, 6, "#2c2f3a"); R(g, 30, 38, 4, 4, P.R);
    return o.c;
  }
  function wall() {
    var o = cv(32, 32), g = o.g;
    panel(g, 0, 0, 32, 32, { fill: "#5d5d63" });
    for (var i = 4; i < 28; i++) { R(g, i, i, 2, 1, P.D2); R(g, 31 - i - 1, i, 2, 1, P.D2); }
    R(g, 13, 13, 6, 6, P.K); R(g, 14, 14, 4, 4, P.L);
    return o.c;
  }
  function unloader() {
    var o = cv(32, 32), g = o.g;
    panel(g, 1, 1, 30, 30, { fill: "#5f5a6e", hi: "#837d96", lo: "#3f3a4c" });
    R(g, 8, 13, 12, 6, P.K); R(g, 18, 9, 2, 14, P.K); for (var i = 0; i < 7; i++) R(g, 20 + i, 9 + i, 1, 14 - 2 * i, P.K);
    R(g, 9, 14, 11, 4, P.Y); for (i = 0; i < 5; i++) R(g, 19 + i, 11 + i, 1, 10 - 2 * i, P.Y);
    return o.c;
  }
  function core(frame) {
    var o = cv(96, 96), g = o.g;
    panel(g, 1, 1, 94, 94);
    hazard(g, 5, 5, 86, 5); hazard(g, 5, 86, 86, 5); hazard(g, 5, 10, 5, 76); hazard(g, 86, 10, 5, 76);
    [[16, 16], [80, 16], [16, 80], [80, 80]].forEach(function (p) { odisc(g, p[0], p[1], 6, P.M, P.L, P.D); disc(g, p[0], p[1], 2.5, P.K); });
    grille(g, 30, 14, 36, 8); grille(g, 30, 74, 36, 8);
    odisc(g, 48, 48, 26, P.M, null, P.D);
    disc(g, 48, 48, 21, P.K); disc(g, 48, 48, 20, "#1b2c4a");
    var pulse = [P.B, P.B2, P.B3, P.B2][frame % 4];
    disc(g, 48, 48, 15, P.B); disc(g, 48, 48, 11, pulse); disc(g, 46, 46, 6, P.B3); disc(g, 45, 45, 2.5, "#ffffff");
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + frame * 0.2; R(g, Math.round(48 + Math.cos(a) * 18) - 1, Math.round(48 + Math.sin(a) * 18) - 1, 2, 2, P.B3); }
    led(g, 22, 34, frame % 2 ? P.G : "#2e6b25"); led(g, 72, 34, frame % 2 ? "#2e6b25" : P.G);
    return o.c;
  }
  // repères d'entrée/sortie (style Satisfactory) : flèche vers l'extérieur pour une sortie, vers l'intérieur pour une entrée
  function portMark(out) {
    var o = cv(12, 8), g = o.g, c = out ? P.Y : "#7fe0ff", c2 = out ? P.Y2 : "#3aa7d0";
    R(g, 0, 0, 12, 8, P.K);
    for (var i = 0; i < 4; i++) { var y = out ? 1 + i : 6 - i; R(g, 1 + i, y, 10 - 2 * i, 1, i === 0 ? c2 : c); }
    return o.c;
  }

  function build() {
    var memo = {};
    var A = { P: P, ground: [], rock: [], ore: {}, items: {}, b: {}, rockTile: function (mask, v) { var k = mask + "_" + v; return memo[k] || (memo[k] = rockTile(mask, v)); } };
    for (var i = 0; i < 6; i++) { A.ground.push(ground(i)); A.rock.push(rock(i + 31)); }
    Object.keys(ORE_COL).forEach(function (k) { A.ore[k] = [0, 1, 2, 3].map(function (s) { return ore(k, s); }); });
    ["cu_o", "fe_o", "coal", "cu", "fe", "steel", "ammo", "shell"].forEach(function (k) { A.items[k] = itemIcon(k); });
    function frames(fn, n) { var a = []; for (var f = 0; f < n; f++) a.push(rots(fn(f))); return a; }
    A.b.drill = frames(drill, 8);
    A.b.smelter = [rots(smelter(false)), rots(smelter(true))];
    A.b.foundry = [rots(foundry(false)), rots(foundry(true))];
    A.b.assembler = frames(assembler, 16);
    A.b.gunBase = gunBase(); A.b.gunHead = [gunHead(false), gunHead(true)];
    A.b.cannonBase = cannonBase(); A.b.cannonHead = [cannonHead(false), cannonHead(true)];
    A.b.wall = wall(); A.b.unloader = rots(unloader());
    A.b.core = [0, 1, 2, 3].map(core);
    A.port = { out: rots(portMark(true)), in: rots(portMark(false)) };
    return A;
  }
  window.RouagesArt = { build: build };
})();
