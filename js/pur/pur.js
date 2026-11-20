/* =========================================================================
   Survivor classique : le « survivor » à l'état pur, tel qu'à sa sortie.
   10 minutes, 1 boss, 12 armes, 12 améliorations, 6 emplacements de chaque.
   Aucune méta-progression, aucun équipement. Même direction artistique que le jeu (pixel du logo, 18 × 19).
   ========================================================================= */
(function () {
  "use strict";
  var OUT = "#2a1810", TAU = Math.PI * 2;
  var WIN_TIME = 600;                                   // le boss arrive à 10:00
    var FONT = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
    N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
    ":": "000010000010000", "/": "001001010100100", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "%": "101001010100101", "'": "010010000000000", " ": "000000000000000" };

  function textWidth(str, sc) { return (String(str).length * 4 - 1) * (sc || 1); }

  /* ---------- DOM ---------- */
  var stage = document.querySelector("[data-pur]"), canvas = stage.querySelector("canvas"), ctx = canvas.getContext("2d");
  var ui = stage.querySelector("[data-ui]");
  var W = 200, H = 340, scale = 4;
  function resize() {
    var dpr = window.devicePixelRatio || 1, cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    scale = Math.max(2, Math.round(Math.sqrt(cw * ch) * dpr / 250));
    W = Math.max(80, Math.ceil(cw * dpr / scale)); H = Math.max(80, Math.ceil(ch * dpr / scale));
    canvas.width = W; canvas.height = H;
    canvas.style.width = (W * scale / dpr) + "px"; canvas.style.height = (H * scale / dpr) + "px";
    ctx.imageSmoothingEnabled = false;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();

  function drawText(str, x, y, color, align, sc) {
    str = String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); sc = sc || 1;
    var w = textWidth(str, sc); x = Math.round(align === "l" ? x : align === "r" ? x - w : x - w / 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? color : OUT;
      for (var i = 0; i < str.length; i++) {
        var b = FONT[str[i]]; if (!b) continue;
        for (var j = 0; j < 15; j++) if (b[j] === "1") { var px = x + (i * 4 + (j % 3)) * sc, py = y + ((j / 3) | 0) * sc; if (pass) ctx.fillRect(px, py, sc, sc); else ctx.fillRect(px - 1, py - 1, sc + 2, sc + 2); }
      }
    }
  }

  /* ---------- couleurs et petit rastériseur : formes ombrées en 4 tons, dithering aux frontières ---------- */
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return "#" + [0, 1, 2].map(function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function ramp(c) { return [mix(c, "#ffffff", 0.28), c, mix(c, "#000000", 0.22), mix(c, "#000000", 0.42)]; }
  var BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return (BY[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }
  var LX = -0.42, LY = -0.58, LZ = 0.69;
  function E(cx, cy, rx, ry, m, flat) { return { t: "e", cx: cx, cy: cy, rx: rx, ry: ry, m: m, flat: flat }; }
  function C(x1, y1, x2, y2, r, m, flat) { return { t: "c", x1: x1, y1: y1, x2: x2, y2: y2, r: r, m: m, flat: flat }; }
  function P(x, y, col) { return { t: "p", x: x, y: y, m: [col], flat: true }; }
  function hit(o, x, y) {
    if (o.t === "p") return Math.floor(x) === o.x && Math.floor(y) === o.y ? [0, 0, 0] : null;
    if (o.t === "e") { var u = (x - o.cx) / o.rx, v = (y - o.cy) / o.ry, q = u * u + v * v; return q > 1 ? null : [u, v, q]; }
    var vx = o.x2 - o.x1, vy = o.y2 - o.y1, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - o.x1) * vx + (y - o.y1) * vy) / L2));
    var nx = (x - (o.x1 + vx * t)) / o.r, ny = (y - (o.y1 + vy * t)) / o.r, q2 = nx * nx + ny * ny; return q2 > 1 ? null : [nx, ny, q2];
  }
  // renvoie un canevas (W + 2) × (H + 2) avec contour
  function raster(w, h, shapes) {
    var c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; var g = c.getContext("2d"), fill = new Uint8Array((w + 2) * (h + 2)), x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      for (i = shapes.length - 1; i >= 0; i--) {
        var o = shapes[i], n = hit(o, x + 0.5, y + 0.5); if (!n) continue;
        var m = o.m, tone = 0;
        if (m.length > 1 && !o.flat) {
          var d = n[0] * LX + n[1] * LY + Math.sqrt(Math.max(0, 1 - n[2])) * LZ + (bay(x, y) - 0.5) * 0.2;
          tone = d > 0.8 ? 0 : d > 0.34 ? 1 : d > -0.1 ? 2 : 3;
        }
        g.fillStyle = m[Math.min(tone, m.length - 1)]; g.fillRect(x + 1, y + 1, 1, 1); fill[(y + 1) * (w + 2) + x + 1] = 1; break;
      }
    }
    g.fillStyle = OUT; var W2 = w + 2, H2 = h + 2;
    for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) if (!fill[y * W2 + x] && ((x > 0 && fill[y * W2 + x - 1]) || (x < W2 - 1 && fill[y * W2 + x + 1]) || (y > 0 && fill[(y - 1) * W2 + x]) || (y < H2 - 1 && fill[(y + 1) * W2 + x]))) g.fillRect(x, y, 1, 1);
    return { c: c, w: W2, h: H2 };
  }
  function whiten(s) {
    if (s.wc) return s.wc;
    var c = document.createElement("canvas"); c.width = s.w; c.height = s.h; var g = c.getContext("2d"); g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, s.w, s.h); return (s.wc = c);
  }
  // sprite posé, centré ; flip = miroir ; flash = blanc
  function put(s, x, y, flip, flash) {
    var ix = Math.round(x - s.w / 2), iy = Math.round(y - s.h / 2);
    if (flip) { ctx.save(); ctx.translate(ix + s.w, iy); ctx.scale(-1, 1); ctx.drawImage(flash ? whiten(s) : s.c, 0, 0); ctx.restore(); }
    else ctx.drawImage(flash ? whiten(s) : s.c, ix, iy);
  }

  /* ---------- sprites ---------- */
  var M = { ant: ramp("#8a3f20"), antd: ["#2a1810"], slug: ramp("#a8c050"), bat: ramp("#6a4a8a"), cap: ramp("#c8553d"), stem: ramp("#f3e1c0"), boar: ramp("#8a5a3b"), bear: ramp("#5e3d28"),
    bark: ramp("#7a5232"), leaf: ramp("#4f8a3a"), leaf2: ramp("#6aa850"), white: ["#fdf3de"], red: ["#ff4a3a"], eye: ["#fdf3de"], dark: ["#2a1810"], tusk: ["#fdf3de"], glow: ["#ffd05a"] };
  function antS(ph) { return raster(13, 9, [C(2, 7, 0, 8, 0.5, M.antd, 1), C(5, 7, 4, 8 - ph, 0.5, M.antd, 1), C(7, 7, 8, 8 - (1 - ph), 0.5, M.antd, 1), C(9, 7, 11, 8, 0.5, M.antd, 1),
    E(3.5, 5, 3.2, 2.6, M.ant), E(7, 5, 1.9, 1.7, M.ant), E(10, 4.5, 2.4, 2.2, M.ant), C(11, 3, 12.5, 0.5, 0.4, M.antd, 1), C(9, 3, 9.5, 0.5, 0.4, M.antd, 1), P(11, 4, "#fdf3de")]); }
  function slugS(ph) { return raster(17, 10, [E(8, 7, 7.5, 3 + ph * 0.3, M.slug), E(14, 4.6, 2.6, 3, M.slug), C(13, 2.5, 12, 0.5, 0.35, M.antd, 1), C(15, 2.5, 16, 0.5, 0.35, M.antd, 1), P(15, 4, "#2a1810"), P(14, 4, "#fdf3de")]); }
  function batS(ph) { var u = ph ? 2 : 0; return raster(17, 11, [E(3.5, 4 + u * 0.5, 3.5, 2 - ph * 0.5, M.bat), E(13.5, 4 + u * 0.5, 3.5, 2 - ph * 0.5, M.bat), C(1, 3 + u, 5, 5, 0.9, M.bat), C(16, 3 + u, 12, 5, 0.9, M.bat),
    E(8.5, 6.5, 2.7, 3.3, M.bat), C(6.6, 3.6, 6.2, 1.6, 0.6, M.bat), C(10.4, 3.6, 10.8, 1.6, 0.6, M.bat), P(7, 6, "#ff4a3a"), P(10, 6, "#ff4a3a")]); }
  function shroomS(ph) { return raster(13, 14, [C(4, 11, 3.5 - ph, 13, 0.7, M.antd, 1), C(8, 11, 8.5 + ph, 13, 0.7, M.antd, 1), E(6.5, 8.5, 2.7, 3.2, M.stem), E(6.5, 4.5, 6, 4, M.cap), P(3, 3, "#fdf3de"), P(8, 2, "#fdf3de"), P(9, 5, "#fdf3de"), P(5, 8, "#2a1810"), P(8, 8, "#2a1810")]); }
  function boarS(ph) { return raster(28, 18, [C(6, 13, 5, 17, 1.1, M.boar), C(10, 13, 11, 17 - ph, 1.1, M.boar), C(18, 13, 17, 17 - ph, 1.1, M.boar), C(22, 13, 23, 17, 1.1, M.boar),
    E(12, 9, 10.5, 6.5, M.boar), E(22, 10, 5.5, 4.6, M.boar), E(25.5, 11.6, 2.2, 1.7, ramp("#c08a6a")), E(19, 5, 2, 2.4, M.boar), P(23, 8, "#ff4a3a"), P(24, 13, "#fdf3de"), P(26, 13, "#fdf3de"), C(2, 6, 0.5, 4, 0.8, M.boar)]); }
  function bearS(ph) { return raster(34, 32, [C(10, 24, 9, 31, 2.6, M.bear), C(24, 24, 25, 31 - ph, 2.6, M.bear), E(17, 18, 12, 11, M.bear), C(7, 15, 3, 24 + ph, 2.4, M.bear), C(27, 15, 31, 24 - ph, 2.4, M.bear), E(17, 7, 7.5, 6.5, M.bear), E(10.5, 2.5, 2.4, 2.4, M.bear), E(23.5, 2.5, 2.4, 2.4, M.bear),
    E(17, 9.4, 3.4, 2.6, ramp("#c08a6a")), P(13, 6, "#ff4a3a"), P(20, 6, "#ff4a3a"), P(16, 9, "#2a1810"), P(17, 9, "#2a1810")]); }
  function bossS(ph) {
    var sh = [C(14, 56, 12, 66, 5, M.bark), C(34, 56, 36, 66, 5, M.bark), E(24, 46, 15, 19, M.bark),
      C(10, 40, 1 + ph * 2, 26, 3.4, M.bark), C(38, 40, 47 - ph * 2, 26, 3.4, M.bark), C(1 + ph * 2, 26, -1, 20, 1.6, M.bark), C(47 - ph * 2, 26, 49, 20, 1.6, M.bark),
      E(24, 20, 23, 15, M.leaf), E(11, 24, 11, 9, M.leaf2), E(37, 24, 11, 9, M.leaf2), E(24, 11, 13, 9, M.leaf2),
      E(17, 40, 3, 3.6, M.dark, 1), E(31, 40, 3, 3.6, M.dark, 1), P(17, 40, "#ff4a3a"), P(31, 40, "#ff4a3a"), E(24, 52, 5, 2.2, M.dark, 1)];
    return raster(50, 70, sh);
  }
  var SP = { ant: [antS(0), antS(1)], slug: [slugS(0), slugS(1)], bat: [batS(0), batS(1)], shroom: [shroomS(0), shroomS(1)], boar: [boarS(0), boarS(1)], bear: [bearS(0), bearS(1)], boss: [bossS(0), bossS(1)] };
  var LAMP = raster(7, 14, [C(3.5, 6, 3.5, 13, 0.9, ramp("#7a5232")), E(3.5, 3.5, 3, 3.2, ramp("#6a625a")), E(3.5, 3.5, 1.7, 1.9, M.glow, 1), P(3, 3, "#fff3b0")]);
  var LAMP2 = raster(7, 14, [C(3.5, 6, 3.5, 13, 0.9, ramp("#7a5232")), E(3.5, 3.5, 3, 3.2, ramp("#6a625a")), E(3.5, 3.5, 1.7, 1.9, ["#ff9a3a"], 1), P(3, 3, "#ffe08a")]);
  var GIGOT = raster(11, 9, [E(4.5, 4, 4.4, 3.4, ramp("#c8783a")), C(8, 6, 10, 8, 0.9, ramp("#f3e1c0")), E(10, 8, 1.3, 1.1, ramp("#f3e1c0")), P(3, 2, "#ffd9a0")]);
  var AIMANT = raster(9, 9, [C(2, 1, 2, 6, 1.7, ramp("#d8483a")), C(7, 1, 7, 6, 1.7, ramp("#d8483a")), E(4.5, 6.5, 4.4, 2.4, ramp("#d8483a")), E(4.5, 6.9, 2, 1, ["#2a1810"], 1), C(2, 0.5, 2, 1.8, 1.7, ramp("#e8e8f0")), C(7, 0.5, 7, 1.8, 1.7, ramp("#e8e8f0"))]);
  var PIECE = raster(7, 7, [E(3.5, 3.5, 3.2, 3.2, ramp("#f2c230")), E(3.5, 3.5, 1.6, 1.6, ramp("#d49a1a"), 1), P(2, 2, "#fff3b0")]);
  var GEM = { 1: raster(5, 6, [E(2.5, 3, 2.2, 2.8, ramp("#5ab0f0"))]), 5: raster(6, 7, [E(3, 3.5, 2.7, 3.3, ramp("#6ad06a"))]), 25: raster(7, 8, [E(3.5, 4, 3.2, 3.8, ramp("#e8503a")), P(2, 2, "#fff3b0")]) };
  var CHEST_PAL = { h: "#c4895a", B: "#a06a3e", b: "#7a4528", d: "#5a3220", M: "#9c6f12", m: "#d9a521", Y: "#f6d36b", k: "#2a1810" };
  var CHEST_ROWS = ["...hhhhhhhhhhhhhh...", "..hhBBBBBBBBBBBBhh..", ".hBBBBBBBBBBBBBBBBh.", ".BBBBBBBBBBBBBBBBBB.", ".bbbbbbbbbbbbbbbbbb.", ".MmmmmmmmmmmmmmmmmM.", ".bBBBBBBYYYYBBBBBBb.", ".bBBBBBBYkkYBBBBBBb.", ".bBBBBBBBkkBBBBBBBb.", ".bBbBBbBBBBBBbBBbBb.", ".bbbbbbbbbbbbbbbbbb.", ".dbdbdbdbdbdbdbdbdb.", ".dddddddddddddddddd.", "..dddddddddddddddd.."];
  var CHEST = (function () {
    var c = document.createElement("canvas"); c.width = 22; c.height = 16; var g = c.getContext("2d");
    CHEST_ROWS.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (CHEST_PAL[r[x]]) { g.fillStyle = CHEST_PAL[r[x]]; g.fillRect(x + 1, y + 1, 1, 1); } });
    g.fillStyle = OUT; var d = g.getImageData(0, 0, 22, 16).data, out = [];
    for (var y = 0; y < 16; y++) for (var x = 0; x < 22; x++) if (!d[(y * 22 + x) * 4 + 3]) { var n = false; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (q) { var xx = x + q[0], yy = y + q[1]; if (xx >= 0 && yy >= 0 && xx < 22 && yy < 16 && d[(yy * 22 + xx) * 4 + 3]) n = true; }); if (n) out.push([x, y]); }
    out.forEach(function (q) { g.fillRect(q[0], q[1], 1, 1); });
    return { c: c, w: 22, h: 16 };
  })();
  var HERO = new Image(); HERO.src = "assets/squirrel.png"; var HERO_S = { c: HERO, w: 18, h: 19 };
  var heroWhite = null;
  function heroFlash() { if (heroWhite || !HERO.complete) return heroWhite; var c = document.createElement("canvas"); c.width = 18; c.height = 19; var g = c.getContext("2d"); g.drawImage(HERO, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, 18, 19); return (heroWhite = c); }


  /* ---------- icônes d'armes et d'améliorations (11 × 11, mêmes ombres que les sprites) ---------- */
  var WOOD = ramp("#a87a48"), STEEL = ramp("#b0b0b8"), GOLD = ramp("#f2c230"), BLUE = ramp("#5ab0f0"), GREEN = ramp("#6ad06a"), PURP = ramp("#b07cf0"), ORNG = ramp("#ff8a2a"), REDR = ramp("#d8483a"), CREAM = ramp("#fdf3de");
  var ICON = {
    griffes: raster(11, 11, [C(2, 1.5, 4.5, 9.5, 1, CREAM), C(5.5, 1, 6.5, 9.5, 1, CREAM), C(9, 1.5, 8.5, 9.5, 1, CREAM)]),
    gland: raster(11, 11, [E(5.5, 5.5, 4.6, 4.6, BLUE), E(5.5, 5.5, 2, 2, ["#fdf3de"], 1), P(3, 3, "#fdf3de")]),
    brindille: raster(11, 11, [C(1, 9.5, 8.5, 2.5, 0.9, WOOD), C(3.5, 7, 2, 5, 0.5, GREEN), E(9, 2, 1.7, 1.7, STEEL)]),
    hache: raster(11, 11, [C(2.5, 9.5, 7, 2.5, 0.9, WOOD), E(7, 3.2, 3.3, 2.7, STEEL)]),
    boomerang: raster(11, 11, [C(1.5, 3, 5, 9, 1.2, GOLD), C(5, 9, 9.5, 2.5, 1.2, GOLD)]),
    feuillage: raster(11, 11, [E(5.5, 5.5, 4.8, 2.6, GREEN), C(1.5, 8, 9.5, 3, 0.4, ["#2a5a2a"], 1)]),
    rosee: raster(11, 11, [E(5.5, 6.6, 3.7, 3.9, BLUE), C(5.5, 0.8, 5.5, 4, 1.4, BLUE), P(4, 5, "#fdf3de")]),
    spores: raster(11, 11, [E(5.5, 5.5, 4.8, 4.8, PURP), E(3.5, 4, 1.2, 1.2, ["#fdf3de"], 1), E(7.5, 6.5, 1.5, 1.5, ["#fdf3de"], 1), E(5, 8, 0.9, 0.9, ["#fdf3de"], 1)]),
    foudre: raster(11, 11, [C(7, 0.8, 3.5, 5, 1, GOLD), C(3.5, 5, 7.5, 5.5, 1, GOLD), C(7.5, 5.5, 4, 10, 1, GOLD)]),
    braise: raster(11, 11, [E(5.5, 6.2, 3.9, 4.4, ORNG), E(5.5, 7, 2, 2.4, ramp("#ffd05a")), C(5.5, 0.5, 5.5, 3, 1, ORNG)]),
    rebond: raster(11, 11, [E(5.5, 5.5, 4.8, 4.8, PURP), E(5.5, 5.5, 2.3, 2.3, ["#2a1810"], 1), P(3, 3, "#e0c8ff")]),
    essaim: raster(11, 11, [E(5.5, 6.5, 3.4, 2.5, GOLD), E(3, 3.5, 2, 1.6, ["#e8f0ff"], 1), E(8, 3.5, 2, 1.6, ["#e8f0ff"], 1), P(4, 6, "#2a1810"), P(6, 6, "#2a1810")]),
    puissance: raster(11, 11, [C(5.5, 1, 5.5, 10, 1.6, REDR), C(1, 5.5, 10, 5.5, 1.6, REDR)]),
    armure: raster(11, 11, [E(5.5, 5, 4.6, 4.6, STEEL), E(5.5, 8, 2.6, 2.4, STEEL), E(5.5, 5, 2.2, 2.2, ramp("#c8553d"))]),
    vitalite: raster(11, 11, [E(3.4, 3.6, 2.9, 2.8, REDR), E(7.6, 3.6, 2.9, 2.8, REDR), E(5.5, 7, 4.2, 3.4, REDR), P(2, 2, "#ffd9d0")]),
    regen: raster(11, 11, [E(5.5, 5.5, 4.8, 4.8, GREEN), C(5.5, 2.5, 5.5, 8.5, 0.8, ["#fdf3de"], 1), C(2.5, 5.5, 8.5, 5.5, 0.8, ["#fdf3de"], 1)]),
    celerite: raster(11, 11, [E(5.5, 5.5, 4.8, 4.8, GOLD), C(5.5, 5.5, 5.5, 2, 0.5, ["#2a1810"], 1), C(5.5, 5.5, 8, 6.5, 0.5, ["#2a1810"], 1)]),
    portee: raster(11, 11, [E(5.5, 5.5, 4.8, 4.8, BLUE), E(5.5, 5.5, 2.6, 2.6, ["#1f3a5a"], 1)]),
    elan: raster(11, 11, [C(1, 5.5, 8, 5.5, 1.1, CREAM), C(5.5, 2, 9.5, 5.5, 0.9, CREAM), C(5.5, 9, 9.5, 5.5, 0.9, CREAM)]),
    duree: raster(11, 11, [E(5.5, 2.8, 3.6, 2.6, PURP), E(5.5, 8.2, 3.6, 2.6, PURP), C(5.5, 3, 5.5, 8, 0.8, ["#fdf3de"], 1)]),
    multi: raster(11, 11, [E(4, 4, 3.4, 3.4, ORNG), E(7, 7, 3.4, 3.4, ORNG), P(3, 3, "#ffe08a")]),
    agilite: raster(11, 11, [E(4, 4, 2.6, 3.4, WOOD), E(6.2, 7.8, 4.4, 2.4, WOOD)]),
    aimant: AIMANT,
    croissance: raster(11, 11, [E(5.5, 5.5, 3.6, 5, BLUE), P(4, 3, "#fdf3de"), E(5.5, 5.5, 1.6, 2.4, ramp("#8ad0ff"))])
  };
  function iconCanvas(id, size) { var s = ICON[id], c = document.createElement("canvas"); c.width = s.w; c.height = s.h; c.getContext("2d").drawImage(s.c, 0, 0); c.style.width = size + "px"; c.style.height = size + "px"; c.style.imageRendering = "pixelated"; return c; }

  /* ---------- sons (synthétisés, aucun fichier) ---------- */
  var AC = null, muted = false, lastSfx = {};
  try { muted = localStorage.getItem("pur-mute") === "1"; } catch (e) {}
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") AC.resume(); return AC; }
  function beep(f, d, type, vol, slide, delay) {
    if (muted) return; var a = ac(); if (!a) return; var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
    g.gain.setValueAtTime(vol || 0.04, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
  }
  function sfx(n, k) {
    var now = performance.now(), gap = { hit: 45, kill: 35, gem: 30 }[n] || 0; if (now - (lastSfx[n] || 0) < gap) return; lastSfx[n] = now;
    if (n === "hit") beep(230, 0.05, "square", 0.025, 0.5);
    else if (n === "kill") beep(150, 0.09, "triangle", 0.05, 0.4);
    else if (n === "gem") beep(520 + Math.min(12, k || 0) * 45, 0.07, "sine", 0.05);
    else if (n === "hurt") { beep(170, 0.2, "sawtooth", 0.06, 0.4); }
    else if (n === "level") [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.14, "square", 0.04, 0, i * 0.07); });
    else if (n === "chest") [392, 523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.12, "triangle", 0.05, 0, i * 0.06); });
    else if (n === "pickup") beep(700, 0.1, "triangle", 0.05, 1.5);
    else if (n === "boss") { beep(70, 0.7, "sawtooth", 0.09, 0.6); beep(52, 0.9, "square", 0.05, 0.7, 0.1); }
    else if (n === "win") [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.18, "square", 0.045, 0, i * 0.12); });
    else if (n === "lose") [330, 262, 196, 131].forEach(function (f, i) { beep(f, 0.25, "sawtooth", 0.05, 0.8, i * 0.18); });
    else if (n === "boom") beep(110, 0.18, "sawtooth", 0.05, 0.3);
    else if (n === "bolt") beep(900, 0.12, "square", 0.04, 0.2);
    else if (n === "swing") beep(300, 0.07, "triangle", 0.03, 1.8);
  }
  /* ---------- particules, secousses ---------- */
  function burst(x, y, col, n, spd, life) {
    if (!G) return; for (var i = 0; i < n; i++) { if (G.parts.length > 260) G.parts.shift(); var a = rnd(0, TAU), v = rnd(0.3, 1) * (spd || 40); G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8, life: rnd(0.25, 1) * (life || 0.5), max: life || 0.5, col: col, sz: Math.random() < 0.3 ? 2 : 1 }); }
  }
  function shake(v) { if (G) G.shake = Math.max(G.shake, v); }

  /* ---------- sol : dégradé dithered, par morceaux ---------- */
  function vh(x, y) { var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, s) { var gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); var a = vh(gx, gy), b = vh(gx + 1, gy), c = vh(gx, gy + 1), d = vh(gx + 1, gy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
  var GB = hexRgb("#6aa850"), GP = hexRgb("#5d9a49"), GCH = {};
  function chunk(cx, cy) {
    var k = cx + "," + cy; if (GCH[k]) return GCH[k];
    var S = 64, c = document.createElement("canvas"); c.width = c.height = S; var g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var X = cx * S + x, Y = cy * S + y, f = vn(X, Y, 95) * 0.85 + vn(X + 5000, Y - 3000, 30) * 0.15, u = (f - 0.6) * 1.7 + 0.5 - 0.3; u = u / 0.4;
      var col = u <= 0 ? GB : u >= 1 ? GP : (u > bay(X, Y) ? GP : GB), o = (y * S + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    // petits détails : touffes, fleurs, cailloux
    for (var i = 0; i < 18; i++) {
      var h = vh(cx * 97 + i, cy * 131 + 7), px = Math.floor(vh(cx + i, cy * 3 + 1) * 60) + 2, py = Math.floor(vh(cx * 5 + 2, cy + i * 7) * 58) + 3;
      if (h < 0.55) { g.fillStyle = "rgba(30,52,22,.22)"; g.fillRect(px - 1, py + 2, 7, 1); g.fillStyle = "#4f8a3a"; g.fillRect(px, py + 1, 1, 1); g.fillRect(px + 2, py + 1, 1, 1); g.fillRect(px + 4, py + 1, 1, 1); g.fillStyle = "#7ab85c"; g.fillRect(px, py, 1, 1); g.fillRect(px + 2, py, 1, 1); g.fillRect(px + 4, py, 1, 1); g.fillStyle = "#a8d684"; g.fillRect(px + 2, py - 1, 1, 1); }
      else if (h < 0.8) { var fc = ["#f6d36b", "#fdf3de", "#f29ad8", "#e8873a"][i % 4]; g.fillStyle = "#4f8a3a"; g.fillRect(px + 1, py + 3, 1, 2); g.fillStyle = fc; g.fillRect(px + 1, py, 1, 1); g.fillRect(px, py + 1, 3, 1); g.fillRect(px + 1, py + 2, 1, 1); g.fillStyle = fc === "#f6d36b" ? "#c8553d" : "#f6d36b"; g.fillRect(px + 1, py + 1, 1, 1); }
      else if (h < 0.9) { g.fillStyle = "rgba(30,52,22,.22)"; g.fillRect(px, py + 3, 6, 1); g.fillStyle = "#6a625a"; g.fillRect(px, py + 1, 5, 2); g.fillStyle = "#8a827a"; g.fillRect(px + 1, py, 3, 2); g.fillStyle = "#b0a898"; g.fillRect(px + 1, py, 1, 1); }
    }
    var n = Object.keys(GCH).length; if (n > 60) GCH = {};
    return (GCH[k] = c);
  }
  function drawGround(cx, cy) {
    for (var gy = Math.floor(cy / 64); gy <= Math.floor((cy + H) / 64); gy++) for (var gx = Math.floor(cx / 64); gx <= Math.floor((cx + W) / 64); gx++) ctx.drawImage(chunk(gx, gy), gx * 64 - cx, gy * 64 - cy);
  }

  /* ---------- données : 12 armes et 12 améliorations ---------- */
  var UPTXT = { amt: "+1 projectile", dmg: "+25 % de dégâts", area: "+20 % de zone", cd: "-15 % de recharge", spd: "+20 % de vitesse", dur: "+25 % de durée", pierce: "+1 perforation" };
  var WEAPONS = [
    { id: "griffes", name: "Griffes", desc: "Lacère devant toi, puis derrière.", col: "#e8873a", ic: "GR", b: { dmg: 10, cd: 1.4, amt: 1, area: 1 }, ord: ["amt", "dmg", "area", "dmg", "amt", "dmg", "area"] },
    { id: "gland", name: "Gland magique", desc: "Vise l'ennemi le plus proche.", col: "#8ad0ff", ic: "GL", b: { dmg: 9, cd: 1.1, amt: 1, spd: 1 }, ord: ["amt", "dmg", "cd", "amt", "dmg", "pierce", "amt"] },
    { id: "brindille", name: "Brindilles", desc: "Lancées droit devant, elles traversent.", col: "#c8a878", ic: "BR", b: { dmg: 6, cd: 0.95, amt: 1, spd: 1, pierce: 1 }, ord: ["amt", "dmg", "amt", "pierce", "dmg", "amt", "pierce"] },
    { id: "hache", name: "Hachette", desc: "Monte puis retombe, traverse tout.", col: "#b0b0b8", ic: "HA", b: { dmg: 20, cd: 1.6, amt: 1, area: 1 }, ord: ["amt", "dmg", "area", "amt", "dmg", "pierce", "amt"] },
    { id: "boomerang", name: "Boomerang", desc: "Part au loin puis revient.", col: "#f6d36b", ic: "BO", b: { dmg: 12, cd: 2.1, amt: 1, spd: 1 }, ord: ["amt", "dmg", "area", "dmg", "amt", "spd", "amt"] },
    { id: "feuillage", name: "Feuillage", desc: "Des feuilles tournent autour de toi.", col: "#6ad06a", ic: "FE", b: { dmg: 9, cd: 3.4, amt: 1, area: 1, dur: 1, spd: 1 }, ord: ["amt", "dur", "dmg", "amt", "area", "dmg", "amt"] },
    { id: "rosee", name: "Rosée", desc: "Des flaques blessent ceux qui marchent dedans.", col: "#5ab0f0", ic: "RO", b: { dmg: 5, cd: 3.2, amt: 1, area: 1, dur: 1 }, ord: ["area", "amt", "dmg", "dur", "amt", "area", "dmg"] },
    { id: "spores", name: "Spores", desc: "Un nuage de spores ronge autour de toi.", col: "#c9b3ff", ic: "SP", b: { dmg: 4, cd: 0.8, amt: 1, area: 1 }, ord: ["area", "dmg", "cd", "area", "dmg", "cd", "dmg"] },
    { id: "foudre", name: "Foudre", desc: "Frappe des ennemis au hasard.", col: "#fff3b0", ic: "FO", b: { dmg: 16, cd: 2.2, amt: 1, area: 1 }, ord: ["amt", "dmg", "amt", "area", "dmg", "amt", "dmg"] },
    { id: "braise", name: "Braise", desc: "Une boule de feu qui explose.", col: "#ff8a2a", ic: "BA", b: { dmg: 20, cd: 3.4, amt: 1, area: 1, spd: 1 }, ord: ["amt", "area", "dmg", "cd", "amt", "dmg", "area"] },
    { id: "rebond", name: "Rune rebondissante", desc: "Rebondit sur les bords de l'écran.", col: "#b07cf0", ic: "RE", b: { dmg: 8, cd: 3, amt: 1, spd: 1, dur: 1 }, ord: ["amt", "dmg", "dur", "amt", "dmg", "spd", "amt"] },
    { id: "essaim", name: "Essaim", desc: "Des abeilles poursuivent les ennemis.", col: "#f2c230", ic: "ES", b: { dmg: 4, cd: 2.6, amt: 3, dur: 1 }, ord: ["amt", "dmg", "dur", "amt", "dmg", "cd", "amt"] }
  ];
  var WBY = {}; WEAPONS.forEach(function (w) { WBY[w.id] = w; });
  var PASSIVES = [
    { id: "puissance", name: "Puissance", max: 5, ic: "PU", col: "#e8503a", desc: "+10 % de dégâts" },
    { id: "armure", name: "Écorce", max: 5, ic: "AR", col: "#8a827a", desc: "-1 dégât subi" },
    { id: "vitalite", name: "Vitalité", max: 5, ic: "PV", col: "#e8503a", desc: "+20 % de PV max" },
    { id: "regen", name: "Sève", max: 5, ic: "RG", col: "#6ad06a", desc: "+0,3 PV par seconde" },
    { id: "celerite", name: "Célérité", max: 5, ic: "CD", col: "#f2c230", desc: "-8 % de recharge" },
    { id: "portee", name: "Envergure", max: 5, ic: "ZN", col: "#5ab0f0", desc: "+10 % de zone" },
    { id: "elan", name: "Élan", max: 5, ic: "VT", col: "#fdf3de", desc: "+10 % de vitesse des projectiles" },
    { id: "duree", name: "Persistance", max: 5, ic: "DR", col: "#b07cf0", desc: "+15 % de durée" },
    { id: "multi", name: "Duplicateur", max: 2, ic: "X2", col: "#ff8a2a", desc: "+1 projectile pour toutes les armes" },
    { id: "agilite", name: "Pattes agiles", max: 5, ic: "MV", col: "#c8a878", desc: "+10 % de vitesse de déplacement" },
    { id: "aimant", name: "Aimant", max: 5, ic: "MG", col: "#d8483a", desc: "+25 % de portée de ramassage" },
    { id: "croissance", name: "Croissance", max: 5, ic: "XP", col: "#5ab0f0", desc: "+8 % d'expérience" }
  ];
  var PBY = {}; PASSIVES.forEach(function (p) { PBY[p.id] = p; });

  /* ---------- ennemis ---------- */
  var EN = {
    ant: { n: "Fourmi", sp: "ant", hp: 5, dmg: 6, spd: 16, xp: 1, r: 5, fr: 2 },
    slug: { n: "Limace", sp: "slug", hp: 12, dmg: 8, spd: 11, xp: 1, r: 6, fr: 3 },
    bat: { n: "Chauve-souris", sp: "bat", hp: 6, dmg: 7, spd: 30, xp: 1, r: 6, fr: 6, fly: 1 },
    shroom: { n: "Champignon", sp: "shroom", hp: 24, dmg: 10, spd: 13, xp: 2, r: 6, fr: 3 },
    boar: { n: "Sanglier", sp: "boar", hp: 260, dmg: 16, spd: 15, xp: 8, r: 11, fr: 3, elite: 1 },
    bear: { n: "Ours", sp: "bear", hp: 700, dmg: 22, spd: 12, xp: 20, r: 14, fr: 3, elite: 1 },
    boss: { n: "Vieux Chêne", sp: "boss", hp: 5200, dmg: 26, spd: 9, xp: 0, r: 22, fr: 3, boss: 1 }
  };

  /* ---------- état ---------- */
  var G = null, keys = {}, stick = { on: false, ox: 0, oy: 0, x: 0, y: 0 }, last = 0, raf = 0, best = 0;
  try { best = +localStorage.getItem("pur-best") || 0; } catch (e) {}
  var ST = {};
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function need(n) { return 5 + (n - 1) * 10 + (n > 20 ? (n - 20) * 3 : 0); }

  function newGame(starter) {
    G = { t: 0, state: "play", p: { x: 0, y: 0, hp: 100, maxHp: 100, lvl: 1, xp: 0, face: 1, inv: 0, moving: false, flash: 0, kills: 0, gold: 0 },
      weapons: [], pas: {}, en: [], pr: [], ep: [], gems: [], items: [], fx: [], nums: [], pools: [], orbs: [], spawnT: 1, lampT: 6, nextElite: 120, toast: [], toastT: 0, bossOn: false, bossDone: false, swarm: 3, pending: 0, id: 1, parts: [], shake: 0, freeze: 0, hitFlash: 0, xpFlash: 0, combo: 0, comboT: 0, banner: null, cam: { x: 0, y: 0 }, dust: 0, elapsed: 0 };
    recalc(); G.p.hp = G.p.maxHp;
    addWeapon(starter);
  }
  function recalc() {
    var L = function (id) { return G.pas[id] || 0; };
    ST = { power: 1 + 0.1 * L("puissance"), armor: L("armure"), maxHp: Math.round(100 * (1 + 0.2 * L("vitalite"))), regen: 0.3 * L("regen"), cd: Math.pow(0.92, L("celerite")), area: 1 + 0.1 * L("portee"), pspd: 1 + 0.1 * L("elan"), dur: 1 + 0.15 * L("duree"), amount: L("multi"), move: 1 + 0.1 * L("agilite"), magnet: 26 * (1 + 0.25 * L("aimant")), growth: 1 + 0.08 * L("croissance") };
    if (G) { var diff = ST.maxHp - G.p.maxHp; G.p.maxHp = ST.maxHp; if (diff > 0) G.p.hp += diff; }
  }
  function addWeapon(id) { G.weapons.push({ id: id, lvl: 1, t: rnd(0.2, 0.6), st: null }); }
  function wstat(w) {
    var d = WBY[w.id], b = d.b, s = { dmg: b.dmg, cd: b.cd, amt: b.amt, area: b.area || 1, spd: b.spd || 1, dur: b.dur || 1, pierce: b.pierce || 0 };
    for (var l = 2; l <= w.lvl; l++) { var k = d.ord[l - 2]; if (k === "amt") s.amt++; else if (k === "dmg") s.dmg *= 1.25; else if (k === "area") s.area *= 1.2; else if (k === "cd") s.cd *= 0.85; else if (k === "spd") s.spd *= 1.2; else if (k === "dur") s.dur *= 1.25; else if (k === "pierce") s.pierce++; }
    s.dmg *= ST.power; s.area *= ST.area; s.spd *= ST.pspd; s.dur *= ST.dur; s.cd *= ST.cd; s.amt += ST.amount;
    return s;
  }
  function toast(msg) { G.toast.push(msg); G.toastT = 2.6; if (G.toast.length > 4) G.toast.shift(); }

  /* ---------- ennemis : apparition ---------- */
  function minute() { return Math.floor(G.t / 60); }
  function spawnAt(type, x, y) {
    var d = EN[type], mn = G.t / 60, sc = d.boss ? 1 : 1 + mn * 0.22 + (d.elite ? mn * 0.1 : 0);
    var e = { id: G.id++, type: type, d: d, x: x, y: y, hp: d.hp * sc, max: d.hp * sc, kx: 0, ky: 0, fl: 0, ph: Math.random() * 6, face: 1, cd: {}, bt: 2 };
    G.en.push(e); return e;
  }
  function ringPos(extra) { var a = rnd(0, TAU), R = Math.hypot(W, H) / 2 + 12 + (extra || 0); return [G.p.x + Math.cos(a) * R, G.p.y + Math.sin(a) * R]; }
  function pool() {
    var m = G.t / 60, o = [["ant", 10]];
    if (m >= 0.7) o.push(["slug", 6]);
    if (m >= 1.6) o.push(["bat", 5]);
    if (m >= 2.4) o.push(["shroom", 5]);
    if (m >= 5) { o[0][1] = 5; o.push(["shroom", 4]); }
    return o;
  }
  function spawnTick() {
    var m = G.t / 60, n = Math.round(1.5 + m * 1.35 + Math.min(4, m * m * 0.07)), pl = pool(), tot = 0; pl.forEach(function (q) { tot += q[1]; });
    var cap = 260; if (G.en.length > cap) return;
    for (var i = 0; i < n; i++) { var r = Math.random() * tot, t = "ant"; for (var j = 0; j < pl.length; j++) { r -= pl[j][1]; if (r <= 0) { t = pl[j][0]; break; } } var p = ringPos(rnd(0, 18)); spawnAt(t, p[0], p[1]); }
  }
  function batSwarm() {
    var a = rnd(0, TAU), R = Math.hypot(W, H) / 2 + 14, cx = G.p.x + Math.cos(a) * R, cy = G.p.y + Math.sin(a) * R, tx = -Math.sin(a), ty = Math.cos(a);
    for (var i = -10; i <= 10; i++) { var e = spawnAt("bat", cx + tx * i * 9, cy + ty * i * 9); e.swarm = { vx: -Math.cos(a), vy: -Math.sin(a) }; e.hp = e.max = 6 * (1 + G.t / 60 * 0.22); }
    toast("Nuée de chauves-souris !");
  }

  /* ---------- dégâts, mort, butin ---------- */
  function num(x, y, v, col) { if (G.nums.length > 50) G.nums.shift(); G.nums.push({ x: x + rnd(-3, 3), y: y - 6, v: v, t: 0.6, col: col || "#fdf3de" }); }
  function hurt(e, dmg, kx, ky, nofl) {
    if (e.dead) return;
    e.hp -= dmg; e.fl = 0.08; if (!e.d.boss && !e.d.elite) { e.kx += kx || 0; e.ky += ky || 0; }
    if (dmg >= 1) num(e.x, e.y - e.d.r, Math.round(dmg), e.d.boss ? "#ffd05a" : "#fdf3de");
    if (!e.obj) { sfx("hit"); if (e.d.elite || e.d.boss) { burst(e.x, e.y, "#fdf3de", 2, 30, 0.3); } } else burst(e.x, e.y, "#ffd05a", 4, 30, 0.35);
    if (e.hp <= 0) kill(e);
  }
  function gem(x, y, v) { if (G.gems.length > 500) { G.gems.shift(); } G.gems.push({ x: x + rnd(-3, 3), y: y + rnd(-3, 3), v: v, pull: false }); }
  function item(type, x, y) { G.items.push({ x: x, y: y, type: type, t: 0 }); }
  function kill(e) {
    e.dead = true; var d = e.d;
    if (e.obj) { burst(e.x, e.y, "#ffd05a", 10, 40, 0.5); sfx("pickup"); var r = Math.random(); if (r < 0.4) item("gigot", e.x, e.y); else if (r < 0.55) item("aimant", e.x, e.y); else item("piece", e.x, e.y); return; }
    G.p.kills++; sfx("kill"); burst(e.x, e.y, d.boss ? "#7a5232" : d.elite ? "#c08a6a" : (d.sp === "slug" ? "#a8c050" : d.sp === "bat" ? "#6a4a8a" : d.sp === "shroom" ? "#c8553d" : "#8a3f20"), d.boss ? 60 : d.elite ? 24 : 7, d.boss ? 90 : 38, d.boss ? 1.2 : 0.5);
    if (d.elite) { shake(3); G.freeze = 0.06; }
    if (d.boss) { shake(8); G.freeze = 0.25; win(); return; }
    var v = d.xp; if (d.elite) { gem(e.x, e.y, v >= 20 ? 25 : 5); item("chest", e.x + 6, e.y); } else gem(e.x, e.y, v >= 2 ? 5 : (Math.random() < 0.04 ? 5 : 1));
    if (Math.random() < 0.012) item("piece", e.x, e.y);
  }

  /* ---------- armes ---------- */
  function nearest(x, y, skip, maxD) {
    var best = null, bd = (maxD || 1e9) * (maxD || 1e9);
    for (var i = 0; i < G.en.length; i++) { var e = G.en[i]; if (e.dead || e.obj || (skip && skip.indexOf(e) >= 0)) continue; var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function visibleEnemies() { var out = [], hw = W / 2 + 6, hh = H / 2 + 6; G.en.forEach(function (e) { if (!e.dead && !e.obj && Math.abs(e.x - G.p.x) < hw && Math.abs(e.y - G.p.y) < hh) out.push(e); }); return out; }
  function shoot(o) { o.hit = []; o.life = o.life || 2; G.pr.push(o); return o; }
  function fire(w) {
    var s = wstat(w), p = G.p, id = w.id, i, e;
    if (id === "griffes") {
      var n = Math.min(s.amt, 4);
      for (i = 0; i < n; i++) { (function (k) { G.fx.push({ k: "slash", delay: k * 0.22, dir: (k % 2 ? -1 : 1) * p.face, w: 34 * s.area, h: 15 * s.area, t: 0.14, dmg: s.dmg, done: false, row: Math.floor(k / 2) }); })(i); }
    } else if (id === "gland") {
      var skip = [];
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.1, fn: function () { var t = nearest(p.x, p.y, null, 180), a = t ? Math.atan2(t.y - p.y, t.x - p.x) : rnd(0, TAU); shoot({ k: "gland", x: p.x, y: p.y, vx: Math.cos(a) * 130 * s.spd, vy: Math.sin(a) * 130 * s.spd, dmg: s.dmg, r: 3, pierce: s.pierce, life: 1.8 }); } }); })(i);
    } else if (id === "brindille") {
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.09, fn: function () { var sp = (p.moving ? G.dirx : p.face) ; var a = Math.atan2(p.moving ? G.diry : 0, p.moving ? G.dirx : p.face) + (k % 2 ? 1 : -1) * Math.floor((k + 1) / 2) * 0.08; shoot({ k: "brin", x: p.x, y: p.y, vx: Math.cos(a) * 200 * s.spd, vy: Math.sin(a) * 200 * s.spd, dmg: s.dmg, r: 3, pierce: s.pierce, life: 1.2, a: a }); } }); })(i);
    } else if (id === "hache") {
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.18, fn: function () { shoot({ k: "hache", x: p.x, y: p.y - 4, vx: rnd(-26, 26) + p.face * 8, vy: -118, g: 215, dmg: s.dmg, r: 5 * s.area, pierce: 99, life: 2.4, rot: 0 }); } }); })(i);
    } else if (id === "boomerang") {
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.25, fn: function () { var t = nearest(p.x, p.y, null, 200), a = t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.face > 0 ? 0 : Math.PI); a += (k % 2 ? 1 : -1) * k * 0.2; shoot({ k: "boom", x: p.x, y: p.y, vx: Math.cos(a) * 110 * s.spd, vy: Math.sin(a) * 110 * s.spd, dmg: s.dmg, r: 5 * s.area, pierce: 99, life: 3, back: false, bt: 0.65 / s.spd, spd: 110 * s.spd, rot: 0 }); } }); })(i);
    } else if (id === "feuillage") {
      if (G.orbs.some(function (o) { return o.w === w; })) return;
      for (i = 0; i < s.amt; i++) G.orbs.push({ w: w, a: i * TAU / s.amt, t: 0, life: 2.4 * s.dur, r: 26 * s.area, spd: 2.4 * s.spd, dmg: s.dmg, size: 5 });
    } else if (id === "rosee") {
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.2, fn: function () { var t = nearest(p.x, p.y, null, 160), a = rnd(0, TAU), d = rnd(14, 50); var x = t && Math.random() < 0.7 ? t.x : p.x + Math.cos(a) * d, y = t && Math.random() < 0.7 ? t.y : p.y + Math.sin(a) * d; G.pools.push({ x: x, y: y, r: 16 * s.area, life: 2.2 * s.dur, t: 0, tick: 0, dmg: s.dmg }); } }); })(i);
    } else if (id === "spores") {
      var R = 24 * s.area; G.fx.push({ k: "aura", t: 0.25, r: R, x: 0, y: 0 });
      G.en.forEach(function (e) { if (e.dead) return; var d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.d.r) { var a = Math.atan2(e.y - p.y, e.x - p.x); hurt(e, s.dmg, Math.cos(a) * 8, Math.sin(a) * 8); } });
    } else if (id === "foudre") {
      var vis = visibleEnemies(); if (!vis.length) { w.t = 0.3; return; }
      for (i = 0; i < s.amt && vis.length; i++) { var tg = vis.splice((Math.random() * vis.length) | 0, 1)[0]; (function (tg2, k) { G.fx.push({ k: "bolt", delay: k * 0.12, x: tg2.x, y: tg2.y, t: 0.2, dmg: s.dmg, r: 11 * s.area, done: false }); })(tg, i); }
    } else if (id === "braise") {
      for (i = 0; i < s.amt; i++) (function (k) { G.fx.push({ k: "shot", delay: k * 0.18, fn: function () { var vis = visibleEnemies(), t = vis.length ? pick(vis) : null, a = t ? Math.atan2(t.y - p.y, t.x - p.x) : rnd(0, TAU); shoot({ k: "braise", x: p.x, y: p.y, vx: Math.cos(a) * 85 * s.spd, vy: Math.sin(a) * 85 * s.spd, dmg: s.dmg, r: 4, pierce: 0, life: 2, boom: 18 * s.area }); } }); })(i);
    } else if (id === "rebond") {
      for (i = 0; i < s.amt; i++) { var a2 = rnd(0, TAU); shoot({ k: "rebond", x: p.x, y: p.y, vx: Math.cos(a2) * 95 * s.spd, vy: Math.sin(a2) * 95 * s.spd, dmg: s.dmg, r: 5, pierce: 99, life: 3.4 * s.dur, bounce: true, rehit: {} }); }
    } else if (id === "essaim") {
      for (i = 0; i < s.amt; i++) { var a3 = rnd(0, TAU); shoot({ k: "bee", x: p.x, y: p.y, vx: Math.cos(a3) * 60, vy: Math.sin(a3) * 60, dmg: s.dmg, r: 3, pierce: 0, life: 2.6 * s.dur, home: true, spd: 82 }); }
    }
    w.t = s.cd; w.cdMax = s.cd;
  }

  /* ---------- mise à jour ---------- */
  function boom(x, y, r, dmg) { sfx("boom"); shake(1.5); burst(x, y, "#ff8a2a", 14, 60, 0.45); G.fx.push({ k: "boom", x: x, y: y, r: r, t: 0.25 }); G.en.forEach(function (e) { if (!e.dead && Math.hypot(e.x - x, e.y - y) < r + e.d.r) hurt(e, dmg, 0, 0); }); }
  function updWeapons(dt) {
    G.weapons.forEach(function (w) {
      w.t -= dt;
      if (w.id === "feuillage" || w.id === "spores") { /* le cycle suit sa propre recharge */ }
      if (w.t <= 0) fire(w);
    });
    // effets différés
    for (var i = G.fx.length - 1; i >= 0; i--) {
      var f = G.fx[i];
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.k === "shot") { f.fn(); G.fx.splice(i, 1); continue; }
      if (f.k === "slash" && !f.done) {
        f.done = true; var p = G.p, cx = p.x + f.dir * (f.w / 2 + 4), cy = p.y - 1 + (f.row ? 8 : 0);
        f.cx = cx; f.cy = cy; sfx("swing");
        G.en.forEach(function (e) { if (!e.dead && Math.abs(e.x - cx) < f.w / 2 + e.d.r && Math.abs(e.y - cy) < f.h / 2 + e.d.r) hurt(e, f.dmg, f.dir * 18, 0); });
      }
      if (f.k === "bolt" && !f.done) { f.done = true; sfx("bolt"); shake(1); burst(f.x, f.y, "#fff3b0", 8, 50, 0.35); G.en.forEach(function (e) { if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) < f.r + e.d.r) hurt(e, f.dmg, 0, 0); }); }
      f.t -= dt; if (f.t <= 0) G.fx.splice(i, 1);
    }
  }
  function updProj(dt) {
    var p = G.p;
    for (var i = G.pr.length - 1; i >= 0; i--) {
      var q = G.pr[i];
      q.life -= dt; if (q.life <= 0) { if (q.k === "braise") boom(q.x, q.y, q.boom, q.dmg); G.pr.splice(i, 1); continue; }
      if (q.g) q.vy += q.g * dt;
      if (q.k === "boom") { q.bt -= dt; if (q.bt < 0) q.back = true; if (q.back) { var a = Math.atan2(p.y - q.y, p.x - q.x), sp = q.spd * 1.15; q.vx += (Math.cos(a) * sp - q.vx) * Math.min(1, dt * 6); q.vy += (Math.sin(a) * sp - q.vy) * Math.min(1, dt * 6); if (Math.hypot(p.x - q.x, p.y - q.y) < 8) { G.pr.splice(i, 1); continue; } } }
      if (q.home) { var tg = nearest(q.x, q.y, null, 150); if (tg) { var a2 = Math.atan2(tg.y - q.y, tg.x - q.x); q.vx += (Math.cos(a2) * q.spd - q.vx) * Math.min(1, dt * 4); q.vy += (Math.sin(a2) * q.spd - q.vy) * Math.min(1, dt * 4); } }
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot = (q.rot || 0) + dt * 12;
      if (q.bounce) { var hw = W / 2 - 4, hh = H / 2 - 4; if (q.x < p.x - hw) { q.x = p.x - hw; q.vx = Math.abs(q.vx); } if (q.x > p.x + hw) { q.x = p.x + hw; q.vx = -Math.abs(q.vx); } if (q.y < p.y - hh) { q.y = p.y - hh; q.vy = Math.abs(q.vy); } if (q.y > p.y + hh) { q.y = p.y + hh; q.vy = -Math.abs(q.vy); } for (var kk in q.rehit) if ((q.rehit[kk] -= dt) <= 0) delete q.rehit[kk]; }
      var removed = false;
      for (var j = 0; j < G.en.length && !removed; j++) {
        var e = G.en[j]; if (e.dead) continue;
        var dx = e.x - q.x, dy = e.y - q.y, rr = q.r + e.d.r; if (dx * dx + dy * dy > rr * rr) continue;
        if (q.bounce) { if (q.rehit[e.id]) continue; q.rehit[e.id] = 0.5; hurt(e, q.dmg, dx * 0.2, dy * 0.2); continue; }
        if (q.hit.indexOf(e.id) >= 0) continue;
        q.hit.push(e.id); var l = Math.hypot(q.vx, q.vy) || 1; hurt(e, q.dmg, q.vx / l * 10, q.vy / l * 10);
        if (q.k === "braise") { boom(q.x, q.y, q.boom, q.dmg); removed = true; }
        else if (q.pierce-- <= 0) removed = true;
      }
      if (removed) G.pr.splice(i, 1);
      else if (Math.abs(q.x - p.x) > W + 60 || Math.abs(q.y - p.y) > H + 60) G.pr.splice(i, 1);
    }
    // feuilles en orbite
    for (i = G.orbs.length - 1; i >= 0; i--) {
      var o = G.orbs[i]; o.t += dt; o.a += o.spd * dt; if (o.t > o.life) { G.orbs.splice(i, 1); continue; }
      o.x = p.x + Math.cos(o.a) * o.r; o.y = p.y + Math.sin(o.a) * o.r;
      G.en.forEach(function (e) { if (e.dead) return; if (Math.hypot(e.x - o.x, e.y - o.y) < o.size + e.d.r && (e.cd.orb || 0) <= 0) { e.cd.orb = 0.55; hurt(e, o.dmg, (e.x - o.x) * 0.6, (e.y - o.y) * 0.6); } });
    }
    // flaques
    for (i = G.pools.length - 1; i >= 0; i--) {
      var pl = G.pools[i]; pl.t += dt; pl.tick -= dt; if (pl.t > pl.life) { G.pools.splice(i, 1); continue; }
      if (pl.tick <= 0) { pl.tick = 0.4; G.en.forEach(function (e) { if (!e.dead && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < pl.r + e.d.r * 0.5) hurt(e, pl.dmg, 0, 0); }); }
    }
    // projectiles ennemis
    for (i = G.ep.length - 1; i >= 0; i--) {
      var b = G.ep[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) { G.ep.splice(i, 1); continue; }
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 6) { hitPlayer(b.dmg); G.ep.splice(i, 1); }
    }
  }
  function hitPlayer(d) {
    var p = G.p; if (p.inv > 0) return;
    var dmg = Math.max(1, Math.round(d - ST.armor)); p.hp -= dmg; p.inv = 0.5; p.flash = 0.25; num(p.x, p.y - 12, dmg, "#ff6a5a"); G.hitFlash = 0.3; shake(3 + Math.min(4, dmg / 8)); G.freeze = 0.05; sfx("hurt"); burst(p.x, p.y, "#e8873a", 8, 45, 0.45);
    if (p.hp <= 0) { p.hp = 0; lose(); }
  }
  function updEnemies(dt) {
    var p = G.p, i, j;
    var grid = {}; // séparation entre ennemis
    for (i = 0; i < G.en.length; i++) { var e = G.en[i]; if (e.dead) continue; var k = ((e.x / 14) | 0) + "," + ((e.y / 14) | 0); (grid[k] = grid[k] || []).push(e); }
    for (i = 0; i < G.en.length; i++) {
      e = G.en[i]; if (e.dead) continue;
      for (var kk in e.cd) e.cd[kk] -= dt;
      e.fl -= dt; e.ph += dt * 5;
      if (e.obj) continue;
      var dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1, sp = e.d.spd * (e.d.boss && e.hp < e.max * 0.5 ? 1.4 : 1);
      if (e.swarm) { e.x += e.swarm.vx * sp * 1.6 * dt; e.y += e.swarm.vy * sp * 1.6 * dt; if (dist < 12) { /* contact */ } if (dist > Math.hypot(W, H) * 0.9) { e.swarm = null; } }
      else { e.x += dx / dist * sp * dt; e.y += dy / dist * sp * dt; }
      e.face = dx < 0 ? -1 : 1;
      e.x += e.kx * dt * 8; e.y += e.ky * dt * 8; e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
      // séparation
      var gx = (e.x / 14) | 0, gy = (e.y / 14) | 0;
      for (var ax = -1; ax <= 1; ax++) for (var ay = -1; ay <= 1; ay++) { var cell = grid[(gx + ax) + "," + (gy + ay)]; if (!cell) continue; for (j = 0; j < cell.length; j++) { var o = cell[j]; if (o === e || o.dead || o.obj) continue; var ddx = e.x - o.x, ddy = e.y - o.y, dd = Math.hypot(ddx, ddy), mn = (e.d.r + o.d.r) * 0.7; if (dd < mn && dd > 0.01) { var push = (mn - dd) * 0.25; e.x += ddx / dd * push; e.y += ddy / dd * push; } } }
      // recyclage des ennemis trop loin
      if (!e.d.boss && dist > Math.hypot(W, H) * 0.9 + 30 && !e.swarm) { var rp = ringPos(0); e.x = rp[0]; e.y = rp[1]; }
      if (e.swarm && dist > Math.hypot(W, H) + 40) e.dead = true;
      // contact
      if (dist < e.d.r + 5) hitPlayer(e.d.dmg);
      // boss
      if (e.d.boss) {
        e.bt -= dt; var low = e.hp < e.max * 0.5;
        if (e.bt <= 0) { e.bt = low ? 1.6 : 2.6; var n = low ? 16 : 12, a0 = rnd(0, TAU); for (j = 0; j < n; j++) { var a = a0 + j * TAU / n; G.ep.push({ x: e.x, y: e.y, vx: Math.cos(a) * 46, vy: Math.sin(a) * 46, dmg: 11, r: 3, life: 5 }); } if (low && Math.random() < 0.5) for (j = 0; j < 4; j++) { var q = ringPos(0); spawnAt("ant", q[0], q[1]); } }
      }
    }
    G.en = G.en.filter(function (e) { return !e.dead; });
  }
  function updPickups(dt) {
    var p = G.p, i;
    for (i = G.gems.length - 1; i >= 0; i--) {
      var g = G.gems[i], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
      if (d < ST.magnet || g.pull) { g.pull = g.pull || true; var sp = 140 + (g.pull ? 60 : 0); g.x += dx / (d || 1) * sp * dt; g.y += dy / (d || 1) * sp * dt; }
      if (d < 6) { G.gems.splice(i, 1); G.comboT = 0.45; G.combo++; sfx("gem", G.combo); burst(g.x, g.y, g.v >= 25 ? "#e8503a" : g.v >= 5 ? "#6ad06a" : "#8ad0ff", 3, 25, 0.3); G.xpFlash = 0.25; xp(g.v); }
    }
    for (i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i]; it.t += dt; var d2 = Math.hypot(p.x - it.x, p.y - it.y);
      if (it.type === "piece" && d2 < ST.magnet) { it.x += (p.x - it.x) / (d2 || 1) * 120 * dt; it.y += (p.y - it.y) / (d2 || 1) * 120 * dt; }
      if (d2 < (it.type === "chest" ? 13 : 9)) {
        G.items.splice(i, 1);
        burst(it.x, it.y, it.type === "piece" ? "#f2c230" : it.type === "gigot" ? "#6ad06a" : "#ff8a2a", 10, 45, 0.5); if (it.type !== "chest") sfx("pickup");
        if (it.type === "gigot") { p.hp = Math.min(p.maxHp, p.hp + 30); num(p.x, p.y - 12, "+30", "#6ad06a"); }
        else if (it.type === "aimant") { G.gems.forEach(function (g) { g.pull = true; }); toast("Aimant !"); }
        else if (it.type === "piece") { p.gold += 10; num(p.x, p.y - 12, "+10", "#f2c230"); }
        else if (it.type === "chest") openChest();
      }
    }
    // lanternes à casser
    G.lampT -= dt; var lamps = G.en.filter(function (e) { return e.obj; });
    if (G.lampT <= 0 && lamps.length < 4) { G.lampT = 11; var a = rnd(0, TAU), R = rnd(40, Math.min(W, H) / 2 - 6), e = { id: G.id++, type: "lamp", d: { r: 5, hp: 1, boss: 0, obj: 1, xp: 0 }, obj: true, x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, hp: 3, max: 3, kx: 0, ky: 0, fl: 0, ph: 0, face: 1, cd: {} }; G.en.push(e); }
    lamps.forEach(function (l) { if (Math.hypot(l.x - p.x, l.y - p.y) > Math.hypot(W, H)) l.dead = true; });
  }
  function xp(v) {
    var p = G.p; p.xp += v * ST.growth;
    while (p.xp >= need(p.lvl)) { p.xp -= need(p.lvl); p.lvl++; G.pending++; }
    if (G.pending > 0 && G.state === "play") levelUp();
  }
  function openChest() {
    var n = Math.random() < 0.2 ? 3 : Math.random() < 0.5 ? 2 : 1, got = [];
    for (var i = 0; i < n; i++) { var c = upgradable(); if (!c.length) break; var u = pick(c); applyUp(u); got.push(u.name); }
    if (!got.length) { G.p.hp = G.p.maxHp; got.push("Plein de PV"); }
    toast("Coffre : " + got.join(", ")); sfx("chest"); shake(3); burst(G.p.x, G.p.y - 4, "#f6d36b", 40, 70, 0.9); burst(G.p.x, G.p.y - 4, "#fff3b0", 20, 50, 0.7);
  }
  function upgradable() {
    var o = [];
    G.weapons.forEach(function (w) { if (w.lvl < 8) o.push({ t: "w", id: w.id, name: WBY[w.id].name, lv: w.lvl + 1 }); });
    PASSIVES.forEach(function (q) { if ((G.pas[q.id] || 0) > 0 && G.pas[q.id] < q.max) o.push({ t: "p", id: q.id, name: q.name, lv: G.pas[q.id] + 1 }); });
    return o;
  }
  function applyUp(u) {
    if (u.t === "w") { var w = G.weapons.filter(function (x) { return x.id === u.id; })[0]; if (w) w.lvl++; else addWeapon(u.id); }
    else { G.pas[u.id] = (G.pas[u.id] || 0) + 1; recalc(); }
  }
  function choices() {
    var c = upgradable();
    if (G.weapons.length < 6) WEAPONS.forEach(function (w) { if (!G.weapons.some(function (x) { return x.id === w.id; })) c.push({ t: "w", id: w.id, name: w.name, lv: 1 }); });
    if (Object.keys(G.pas).length < 6) PASSIVES.forEach(function (q) { if (!(G.pas[q.id] > 0)) c.push({ t: "p", id: q.id, name: q.name, lv: 1 }); });
    var out = []; while (out.length < 3 && c.length) out.push(c.splice((Math.random() * c.length) | 0, 1)[0]);
    return out;
  }

  /* ---------- boucle ---------- */
  function dirInput() {
    var x = 0, y = 0;
    if (keys.ArrowLeft || keys.q || keys.a) x -= 1; if (keys.ArrowRight || keys.d) x += 1; if (keys.ArrowUp || keys.z || keys.w) y -= 1; if (keys.ArrowDown || keys.s) y += 1;
    if (stick.on) { var dx = stick.x - stick.ox, dy = stick.y - stick.oy, l = Math.hypot(dx, dy); if (l > 3) { x = dx / l; y = dy / l; if (l < 8) { x *= l / 8; y *= l / 8; } } }
    var l2 = Math.hypot(x, y); if (l2 > 1) { x /= l2; y /= l2; }
    return [x, y];
  }
  function updParts(dt) { for (var pi = G.parts.length - 1; pi >= 0; pi--) { var q = G.parts[pi]; q.life -= dt; if (q.life <= 0) { G.parts.splice(pi, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt; q.vx *= Math.pow(0.1, dt); } }
  function update(dt) {
    var p = G.p; G.t += dt;
    var d = dirInput(), sp = 62 * ST.move; p.moving = Math.hypot(d[0], d[1]) > 0.05;
    if (p.moving) { p.x += d[0] * sp * dt; p.y += d[1] * sp * dt; G.dirx = d[0]; G.diry = d[1]; if (Math.abs(d[0]) > 0.1) p.face = d[0] > 0 ? 1 : -1; }
    p.inv -= dt; p.flash -= dt; G.hitFlash -= dt; G.xpFlash -= dt; G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; G.shake = Math.max(0, G.shake - dt * 14); G.elapsed += dt;
    G.dust -= dt; if (p.moving && G.dust <= 0) { G.dust = 0.1; burst(p.x - p.face * 3, p.y + 8, "#a08a5a", 1, 12, 0.35); }
    var tx = p.moving ? d[0] * 14 : 0, ty = p.moving ? d[1] * 10 : 0, kc = 1 - Math.pow(0.05, dt); G.cam.x += (tx - G.cam.x) * kc; G.cam.y += (ty - G.cam.y) * kc;
    updParts(dt);
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    if (ST.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + ST.regen * dt);
    // boss
    if (G.t >= WIN_TIME && !G.bossOn) {
      G.bossOn = true; G.en.forEach(function (e) { e.dead = true; }); G.ep = []; var b = spawnAt("boss", p.x, p.y - H / 2 + 78); toast("Le Vieux Chêne se réveille !"); G.banner = { text: "LE VIEUX CHENE SE REVEILLE", t: 3 }; sfx("boss"); shake(7);
    }
    if (!G.bossOn) {
      G.spawnT -= dt; if (G.spawnT <= 0) { G.spawnT = Math.max(0.35, 1.0 - G.t / 60 * 0.07); spawnTick(); }
      G.nextElite -= dt; if (G.nextElite <= 0) { G.nextElite = 120; var q = ringPos(10), m = G.t / 60; spawnAt(m >= 5.5 ? "bear" : "boar", q[0], q[1]); toast(m >= 5.5 ? "Un ours approche !" : "Un sanglier approche !"); }
      G.swarm -= dt / 60; if (G.t > 150 && Math.floor(G.t / 60) !== G.lastSwarm && (G.t % 60) < 3 && (Math.floor(G.t / 60) % 2 === 1 || Math.floor(G.t / 60) === 3)) { G.lastSwarm = Math.floor(G.t / 60); batSwarm(); }
    }
    updWeapons(dt); updProj(dt); updEnemies(dt); updPickups(dt);
    G.nums.forEach(function (n) { n.t -= dt; n.y -= 12 * dt; }); G.nums = G.nums.filter(function (n) { return n.t > 0; });
    if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) G.toast = []; }
  }

  /* ---------- dessin ---------- */
  function drawHP(x, y, w, hp, max, col) { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, 4); ctx.fillStyle = "#5a2a20"; ctx.fillRect(x, y, w, 2); ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.round(w * hp / max)), 2); }
  function rot(img, x, y, a, w, h) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.drawImage(img.c, -img.w / 2, -img.h / 2); ctx.restore(); }
  var PIC = {};
  function projPic(name, w, h, fn) { if (!PIC[name]) { var c = document.createElement("canvas"); c.width = w; c.height = h; var g = c.getContext("2d"); fn(g); PIC[name] = { c: c, w: w, h: h }; } return PIC[name]; }
  function drawProj(q) {
    var x = Math.round(q.x), y = Math.round(q.y);
    if (q.k === "gland") { var s = projPic("gland", 7, 7, function (g) { g.fillStyle = OUT; g.fillRect(2, 0, 3, 7); g.fillRect(0, 2, 7, 3); g.fillStyle = "#8ad0ff"; g.fillRect(3, 1, 1, 5); g.fillRect(1, 3, 5, 1); g.fillStyle = "#fff"; g.fillRect(3, 3, 1, 1); }); ctx.drawImage(s.c, x - 3, y - 3); }
    else if (q.k === "brin") { var s2 = projPic("brin", 11, 5, function (g) { g.fillStyle = OUT; g.fillRect(0, 1, 11, 3); g.fillStyle = "#c8a878"; g.fillRect(1, 2, 7, 1); g.fillStyle = "#e8e8f0"; g.fillRect(8, 2, 2, 1); g.fillStyle = "#6ad06a"; g.fillRect(2, 1, 2, 1); g.fillRect(4, 3, 2, 1); }); rot(s2, x, y, q.a, 11, 5); }
    else if (q.k === "hache") { var s3 = projPic("hache", 11, 11, function (g) { g.fillStyle = OUT; g.fillRect(4, 0, 3, 11); g.fillRect(0, 1, 11, 5); g.fillStyle = "#7a5232"; g.fillRect(5, 2, 1, 8); g.fillStyle = "#b0b0b8"; g.fillRect(1, 2, 9, 3); g.fillStyle = "#e8e8f0"; g.fillRect(1, 2, 9, 1); }); rot(s3, x, y, q.rot, 11, 11); }
    else if (q.k === "boom") { var s4 = projPic("boom", 11, 11, function (g) { g.fillStyle = OUT; g.fillRect(0, 4, 11, 3); g.fillRect(4, 0, 3, 11); g.fillStyle = "#f6d36b"; g.fillRect(1, 5, 9, 1); g.fillRect(5, 1, 1, 9); g.fillStyle = "#fff3b0"; g.fillRect(5, 5, 1, 1); }); rot(s4, x, y, q.rot, 11, 11); }
    else if (q.k === "braise") { var s5 = projPic("braise", 9, 9, function (g) { g.fillStyle = OUT; g.fillRect(2, 0, 5, 9); g.fillRect(0, 2, 9, 5); g.fillStyle = "#ff8a2a"; g.fillRect(2, 1, 5, 7); g.fillRect(1, 2, 7, 5); g.fillStyle = "#ffd05a"; g.fillRect(3, 3, 3, 3); g.fillStyle = "#fff3b0"; g.fillRect(4, 4, 1, 1); }); ctx.drawImage(s5.c, x - 4, y - 4); }
    else if (q.k === "rebond") { var s6 = projPic("rebond", 11, 11, function (g) { g.fillStyle = OUT; g.fillRect(4, 0, 3, 11); g.fillRect(2, 2, 7, 7); g.fillRect(0, 4, 11, 3); g.fillStyle = "#b07cf0"; g.fillRect(5, 1, 1, 9); g.fillRect(3, 3, 5, 5); g.fillRect(1, 5, 9, 1); g.fillStyle = "#e0c8ff"; g.fillRect(4, 4, 3, 3); }); ctx.drawImage(s6.c, x - 5, y - 5); }
    else if (q.k === "bee") { var s7 = projPic("bee", 6, 5, function (g) { g.fillStyle = OUT; g.fillRect(0, 1, 6, 3); g.fillStyle = "#f2c230"; g.fillRect(1, 2, 4, 1); g.fillStyle = "#2a1810"; g.fillRect(2, 2, 1, 1); g.fillStyle = "#fdf3de"; g.fillRect(2, 0, 2, 1); }); ctx.drawImage(s7.c, x - 3, y - 2); }
  }
  function draw() {
    var p = G.p, shx = G.shake > 0.2 ? Math.round(rnd(-1, 1) * G.shake) : 0, shy = G.shake > 0.2 ? Math.round(rnd(-1, 1) * G.shake) : 0;
    var cx = Math.round(p.x + G.cam.x - W / 2) + shx, cy = Math.round(p.y + G.cam.y - H / 2) + shy;
    drawGround(cx, cy);
    ctx.save(); ctx.translate(-cx, -cy);
    G.pools.forEach(function (pl) {
      var a = Math.min(1, (pl.life - pl.t) * 2); ctx.globalAlpha = 0.55 * a; ctx.fillStyle = "#5ab0f0";
      for (var yy = -pl.r; yy <= pl.r; yy++) { var w = Math.floor(Math.sqrt(pl.r * pl.r - yy * yy) * 1.1); for (var xx = -w; xx <= w; xx++) if (((xx + yy) & 1) === 0 || Math.abs(xx) < w - 2) ctx.fillRect(Math.round(pl.x) + xx, Math.round(pl.y + yy * 0.7), 1, 1); }
      ctx.globalAlpha = 1;
    });
    G.items.forEach(function (it) { var b = Math.round(Math.sin(it.t * 4)); var s = it.type === "chest" ? CHEST : it.type === "gigot" ? GIGOT : it.type === "aimant" ? AIMANT : PIECE; ctx.fillStyle = "rgba(20,30,15,.25)"; ctx.fillRect(Math.round(it.x - 4), Math.round(it.y + s.h / 2 - 1), 8, 2); put(s, it.x, it.y + b); });
    G.gems.forEach(function (g) { var s = GEM[g.v] || GEM[1]; put(s, g.x, g.y); });
    var list = G.en.slice().sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (e) {
      if (e.dead) return;
      if (e.obj) { put(Math.floor(G.t * 5) % 2 ? LAMP : LAMP2, e.x, e.y, false, e.fl > 0); return; }
      var fr = SP[e.d.sp][Math.floor(e.ph) % 2], by = e.d.fly ? Math.round(Math.sin(e.ph) * 1.5) - 4 : (Math.floor(e.ph) % 2 ? -1 : 0);
      ctx.fillStyle = "rgba(20,30,15,.25)"; var sw = Math.round(fr.w * 0.7); ctx.fillRect(Math.round(e.x - sw / 2), Math.round(e.y + fr.h / 2 - 2), sw, 2);
      put(fr, e.x, e.y + by - (e.d.fly ? 0 : 0), e.face < 0, e.fl > 0);
      if (e.d.boss || e.d.elite) drawHP(Math.round(e.x - 12), Math.round(e.y - fr.h / 2 - 5), 24, e.hp, e.max, "#e8503a");
    });
    // joueur
    var hy = Math.round(p.y) + (p.moving && Math.floor(G.t * 10) % 2 ? -1 : 0);
    ctx.fillStyle = "rgba(20,30,15,.3)"; ctx.fillRect(Math.round(p.x - 6), Math.round(p.y + 8), 12, 2); ctx.fillRect(Math.round(p.x - 5), Math.round(p.y + 7), 10, 4);
    if (!(p.inv > 0 && Math.floor(G.t * 20) % 2)) {
      var hx = Math.round(p.x - 9);
      ctx.save(); if (p.face < 0) { ctx.translate(hx + 18, 0); ctx.scale(-1, 1); ctx.drawImage(p.flash > 0 && heroFlash() ? heroFlash() : HERO, 0, hy - 10); } else ctx.drawImage(p.flash > 0 && heroFlash() ? heroFlash() : HERO, hx, hy - 10); ctx.restore();
    }
    drawHP(Math.round(p.x - 9), Math.round(p.y + 11), 18, p.hp, p.maxHp, "#6ad06a");
    // armes : aura, feuilles, projectiles, effets
    G.fx.forEach(function (f) {
      if (f.delay > 0) return;
      if (f.k === "slash" && f.cx !== undefined) {
        var a = f.t / 0.14; ctx.fillStyle = "#fdf3de"; var w2 = Math.round(f.w * (1.1 - a * 0.3)), hh = Math.round(f.h);
        for (var i2 = 0; i2 < w2; i2++) { var u = i2 / w2, yy = Math.round(Math.sin(u * Math.PI) * hh * 0.45), xx = f.cx + f.dir * (i2 - w2 / 2); ctx.fillRect(Math.round(xx), Math.round(f.cy - yy + hh * 0.2), 1, 2); ctx.fillRect(Math.round(xx), Math.round(f.cy + yy - hh * 0.2 - 1), 1, 1); }
      } else if (f.k === "aura") {
        var ar = Math.round(f.r * (1.1 - f.t)); ctx.fillStyle = "rgba(201,179,255," + (f.t * 2).toFixed(2) + ")";
        for (var an = 0; an < 56; an++) { var aa = an / 56 * TAU; if (an % 2) continue; ctx.fillRect(Math.round(p.x + Math.cos(aa) * ar), Math.round(p.y + Math.sin(aa) * ar), 2, 2); }
      } else if (f.k === "bolt") {
        ctx.fillStyle = "#fff3b0"; var bx = Math.round(f.x), top = Math.round(f.y - H / 2 - 20), zx = 0;
        for (var yy2 = top; yy2 < f.y; yy2 += 4) { zx = (vh(yy2, Math.floor(f.x)) * 6 - 3) | 0; ctx.fillRect(bx + zx, yy2, 2, 4); }
        ctx.fillStyle = "rgba(255,243,176,.5)"; ctx.fillRect(bx - f.r, Math.round(f.y) - 1, f.r * 2, 3);
      } else if (f.k === "boom") {
        var br = Math.round(f.r * (1.2 - f.t * 2)); ctx.fillStyle = "rgba(255,138,42,.6)"; ctx.beginPath(); ctx.arc(Math.round(f.x), Math.round(f.y), Math.max(1, br), 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,243,176,.8)"; ctx.beginPath(); ctx.arc(Math.round(f.x), Math.round(f.y), Math.max(1, br * 0.5), 0, TAU); ctx.fill();
      }
    });
    G.orbs.forEach(function (o) { var s = projPic("leaf", 9, 9, function (g) { g.fillStyle = OUT; g.fillRect(2, 0, 5, 9); g.fillRect(0, 2, 9, 5); g.fillStyle = "#4f8a3a"; g.fillRect(3, 1, 3, 7); g.fillRect(1, 3, 7, 3); g.fillStyle = "#86d070"; g.fillRect(3, 2, 2, 2); }); ctx.drawImage(s.c, Math.round(o.x) - 4, Math.round(o.y) - 4); });
    G.pr.forEach(drawProj);
    G.ep.forEach(function (b) { var s = projPic("acorn", 7, 7, function (g) { g.fillStyle = OUT; g.fillRect(1, 0, 5, 7); g.fillRect(0, 1, 7, 5); g.fillStyle = "#8a5a3b"; g.fillRect(2, 2, 3, 4); g.fillStyle = "#4f8a3a"; g.fillRect(1, 1, 5, 2); g.fillStyle = "#c8a878"; g.fillRect(2, 3, 1, 1); }); ctx.drawImage(s.c, Math.round(b.x) - 3, Math.round(b.y) - 3); });
    G.parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.sz, q.sz); }); ctx.globalAlpha = 1;
    G.nums.forEach(function (n) { drawText(n.v, n.x, n.y - (n.t > 0.5 ? 0 : 0), n.col, "c", n.t > 0.52 ? 2 : 1); });
    ctx.restore();
    // interface
    ctx.fillStyle = "rgba(20,14,10,.5)"; ctx.fillRect(0, 9, W, 11);
    var xpw = W - 4, xf = Math.min(1, p.xp / need(p.lvl)); ctx.fillStyle = OUT; ctx.fillRect(1, 1, W - 2, 7); ctx.fillStyle = "#1f3a5a"; ctx.fillRect(2, 2, xpw, 5);
    ctx.fillStyle = G.xpFlash > 0 ? "#bfe8ff" : "#5ab0f0"; ctx.fillRect(2, 2, Math.round(xpw * xf), 5); ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(2, 2, Math.round(xpw * xf), 1);
    ctx.fillStyle = "rgba(0,0,0,.25)"; for (var tk = 1; tk < 10; tk++) ctx.fillRect(2 + Math.round(xpw * tk / 10), 2, 1, 5);
    drawText("NIV " + p.lvl, W - 4, 11, "#fdf3de", "r");
    var mm = Math.floor(G.t / 60), ss = Math.floor(G.t % 60), late = G.t > WIN_TIME - 60 && Math.floor(G.t * 2) % 2 === 0 && !G.bossOn;
    drawText((mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss, W / 2, 11, late ? "#ff6a5a" : "#fdf3de", "c", 2);
    drawText(p.kills + " K", 4, 11, "#fdf3de", "l"); drawText(p.gold + " G", 4, 18, "#f2c230", "l");
    // emplacements : 6 armes, 6 améliorations
    for (var i = 0; i < 6; i++) { slot(3 + i * 17, 27, G.weapons[i] ? WBY[G.weapons[i].id] : null, G.weapons[i] ? G.weapons[i].lvl : 0, 8, G.weapons[i]); }
    var pk = Object.keys(G.pas).filter(function (k) { return G.pas[k] > 0; });
    for (i = 0; i < 6; i++) slot(3 + i * 17, 43, pk[i] ? PBY[pk[i]] : null, pk[i] ? G.pas[pk[i]] : 0, PBY[pk[i]] && PBY[pk[i]].max);
    // boss
    if (G.bossOn) { var bs = G.en.filter(function (e) { return e.d.boss; })[0]; if (bs) { drawText("VIEUX CHENE", W / 2, 54, "#ffd05a", "c"); drawHP(Math.round(W / 2 - 40), 62, 80, bs.hp, bs.max, "#e8503a"); } }
    // messages
    if (G.toast.length) G.toast.forEach(function (m, i) { drawText(m, W / 2, 74 + i * 8, "#f6d36b", "c"); });
    // alerte : bords rouges quand les PV sont bas, éclair rouge quand on est touché
    var low = p.hp / p.maxHp < 0.3, va = Math.max(low ? 0.18 + 0.1 * Math.sin(G.elapsed * 6) : 0, G.hitFlash > 0 ? G.hitFlash * 0.7 : 0);
    if (va > 0.01) { ctx.fillStyle = "rgba(220,40,30," + va.toFixed(2) + ")"; ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H); ctx.fillStyle = "rgba(220,40,30," + (va * 0.4).toFixed(2) + ")"; ctx.fillRect(3, 3, W - 6, 4); ctx.fillRect(3, H - 7, W - 6, 4); ctx.fillRect(3, 3, 4, H - 6); ctx.fillRect(W - 7, 3, 4, H - 6); }
    if (G.combo >= 6) drawText("x" + G.combo, W - 4, H - 10, "#8ad0ff", "r");
    if (G.banner) { var bt = G.banner.t, by = Math.round(H * 0.3), ba = Math.min(1, bt * 2, (3 - bt) * 4); ctx.globalAlpha = Math.max(0, ba); ctx.fillStyle = "rgba(20,14,10,.75)"; ctx.fillRect(0, by - 6, W, 22); ctx.fillStyle = "#e8503a"; ctx.fillRect(0, by - 6, W, 1); ctx.fillRect(0, by + 15, W, 1); drawText(G.banner.text, W / 2, by, "#ffd05a", "c", 1); ctx.globalAlpha = 1; }
    // manette
    if (stick.on) { ctx.fillStyle = "rgba(253,243,222,.35)"; ring(stick.ox, stick.oy, 12); ctx.fillStyle = "rgba(253,243,222,.7)"; var dx = stick.x - stick.ox, dy = stick.y - stick.oy, l = Math.hypot(dx, dy) || 1, k = Math.min(l, 12) / l; ctx.fillRect(Math.round(stick.ox + dx * k) - 2, Math.round(stick.oy + dy * k) - 2, 5, 5); }
  }
  function ring(x, y, r) { for (var i = 0; i < 24; i++) { var a = i / 24 * TAU; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); } }
  function slot(x, y, d, lv, max, wpn) {
    ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, 15, 15); ctx.fillStyle = d ? "#2c4a36" : "rgba(31,58,43,.5)"; ctx.fillRect(x, y, 13, 13);
    if (!d) { ctx.fillStyle = "rgba(253,243,222,.18)"; ctx.fillRect(x + 6, y + 6, 1, 1); return; }
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(x, y, 13, 1);
    var ic = ICON[d.id]; ctx.drawImage(ic.c, x + 1, y + 1);
    if (wpn && wpn.cdMax) { var f = Math.max(0, Math.min(1, 1 - wpn.t / wpn.cdMax)); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x, y + 13, 13, 1); ctx.fillStyle = f >= 1 ? "#6ad06a" : d.col; ctx.fillRect(x, y + 13, Math.round(13 * f), 1); }
    ctx.fillStyle = OUT; ctx.fillRect(x + 8, y + 8, 6, 6); ctx.fillStyle = lv >= max ? "#f6d36b" : "#2c4a36"; ctx.fillRect(x + 9, y + 9, 4, 4); drawText(lv, x + 9, y + 9, lv >= max ? "#2a1810" : "#fdf3de", "l");
  }

  /* ---------- écrans ---------- */
  function icon(d, size) { return iconCanvas(d.id, size); }
  function card(html) { ui.innerHTML = '<div class="pur-card">' + html + "</div>"; ui.hidden = false; return ui.firstChild; }
  function hideUI() { ui.hidden = true; ui.innerHTML = ""; }
  function menu() {
    G = null; var c = card('<h2>Survivor classique</h2><p>Le survivor à l\'état pur : 10 minutes, un boss, 12 armes, 12 améliorations, 6 emplacements de chaque. Ni équipement ni progression : juste toi, la forêt et ce qui rampe.</p><p class="pur-small">Déplace-toi (flèches, ZQSD, ou glisse le doigt) : les armes tirent toutes seules. Ramasse les gemmes bleues pour monter de niveau, casse les lanternes, ouvre les coffres des élites. Au bout de 10:00, le Vieux Chêne se réveille : abats-le pour gagner.</p>' + (best ? '<p class="pur-small">Meilleur : ' + Math.floor(best / 60) + ":" + ("0" + (best % 60)).slice(-2) + " tenu</p>" : "") + '<h3>Choisis ton arme de départ</h3><div class="pur-cards" data-starters></div>');
    ["griffes", "gland", "brindille", "hache"].forEach(function (id) { var d = WBY[id], b = document.createElement("button"); b.type = "button"; b.className = "pur-opt"; b.appendChild(icon(d, 36)); b.insertAdjacentHTML("beforeend", "<span><b>" + d.name + "</b><small>" + d.desc + "</small></span>"); b.onclick = function () { hideUI(); newGame(id); startLoop(); }; c.querySelector("[data-starters]").appendChild(b); });
  }
  function levelUp() {
    G.state = "levelup"; G.pending--; var ch = choices(); sfx("level"); burst(G.p.x, G.p.y - 4, "#8ad0ff", 36, 80, 0.8); burst(G.p.x, G.p.y - 4, "#fdf3de", 14, 55, 0.6);
    if (!ch.length) { G.p.hp = Math.min(G.p.maxHp, G.p.hp + 30); G.p.gold += 25; G.state = "play"; toast("Tout est au maximum : +25 G"); if (G.pending > 0) levelUp(); return; }
    var c = card('<h2>Niveau ' + G.p.lvl + (G.pending ? ' <small>(+' + G.pending + ' à suivre)</small>' : "") + '</h2><div class="pur-cards" data-ch></div>');
    ch.forEach(function (u) {
      var d = u.t === "w" ? WBY[u.id] : PBY[u.id], b = document.createElement("button"); b.type = "button"; b.className = "pur-opt";
      var txt = u.t === "w" ? (u.lv === 1 ? d.desc : "Niv " + u.lv + " : " + UPTXT[d.ord[u.lv - 2]]) : (u.lv === 1 ? d.desc : "Niv " + u.lv + " : " + d.desc);
      var mxl = u.t === "w" ? 8 : d.max, pips = ""; for (var pq = 1; pq <= mxl; pq++) pips += pq <= u.lv ? "●" : "○";
      b.appendChild(icon(d, 40)); b.insertAdjacentHTML("beforeend", "<span><b>" + d.name + (u.lv === 1 ? ' <em>nouveau</em>' : ' <em>niv ' + u.lv + '</em>') + "</b><small>" + txt + "</small><i class='pur-pips'>" + pips + "</i></span><kbd>" + (ch.indexOf(u) + 1) + "</kbd>");
      b.onclick = function () { applyUp(u); hideUI(); G.state = "play"; last = performance.now(); if (G.pending > 0) levelUp(); };
      c.querySelector("[data-ch]").appendChild(b);
    });
  }
  function end(won) {
    G.state = "over"; var t = Math.floor(G.t); if (t > best) { best = t; try { localStorage.setItem("pur-best", best); } catch (e) {} }
    var c = card('<h2>' + (won ? "Victoire !" : "Tu es tombé…") + '</h2><p>' + (won ? "Le Vieux Chêne est à terre." : "Tenu " + Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2) + " sur 10:00.") + '</p><p class="pur-small">Niveau ' + G.p.lvl + ' · ' + G.p.kills + (G.p.kills > 1 ? ' ennemis' : ' ennemi') + ' · ' + G.p.gold + ' G</p><div class="pur-row"><button class="btn" type="button" data-again>Rejouer</button><a class="btn btn-ghost" href="jeu.html">Écureuil Survivor</a></div>');
    c.querySelector("[data-again]").onclick = function () { menu(); };
  }
  function win() { G.state = "over"; sfx("win"); burst(G.p.x, G.p.y, "#f6d36b", 80, 100, 1.4); setTimeout(function () { end(true); }, 900); }
  function lose() { G.state = "over"; sfx("lose"); shake(6); burst(G.p.x, G.p.y, "#e8873a", 50, 80, 1); setTimeout(function () { end(false); }, 700); }

  function pause(on) {
    if (!G || (G.state !== "play" && G.state !== "paused")) return;
    if (on && G.state === "play") { G.state = "paused"; var c = card('<h2>Pause</h2><div class="pur-row"><button class="btn" type="button" data-go>Reprendre</button><button class="btn btn-ghost" type="button" data-quit>Abandonner</button></div>'); c.querySelector("[data-go]").onclick = function () { pause(false); }; c.querySelector("[data-quit]").onclick = function () { hideUI(); G.state = "play"; G.p.hp = 0; lose(); }; }
    else if (!on && G.state === "paused") { hideUI(); G.state = "play"; last = performance.now(); }
  }
  function startLoop() { last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (G && G.freeze > 0) { G.freeze -= dt; if (G.state !== "play") G.freeze = 0; }
    else if (G && G.state === "play") update(dt);
    else if (G) { updParts(dt); G.shake = Math.max(0, G.shake - dt * 14); }
    if (G) draw(); else { drawGround(0, 0); }
  }

  /* ---------- entrées ---------- */
  window.addEventListener("keydown", function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true; if (k === "Escape" || k === "p") pause(G && G.state === "play");
    if (/^[1-4]$/.test(k) && !ui.hidden) { var ob = ui.querySelectorAll(".pur-opt")[+k - 1]; if (ob) ob.click(); }
    ac(); if (/^Arrow/.test(e.key)) e.preventDefault(); });
  window.addEventListener("keyup", function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  window.addEventListener("blur", function () { keys = {}; pause(true); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(true); });
  function toLocal(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  canvas.addEventListener("pointerdown", function (e) { var l = toLocal(e); stick.on = true; stick.ox = stick.x = l[0]; stick.oy = stick.y = l[1]; stick.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
  canvas.addEventListener("pointermove", function (e) { if (stick.on && e.pointerId === stick.id) { var l = toLocal(e); stick.x = l[0]; stick.y = l[1]; var dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy); if (d > 18) { stick.ox = stick.x - dx / d * 18; stick.oy = stick.y - dy / d * 18; } } });
  function up(e) { if (e.pointerId === stick.id) stick.on = false; }
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  var mb = stage.querySelector("[data-mute]"); function syncMute() { if (mb) mb.textContent = muted ? "🔇" : "🔊"; }
  if (mb) { mb.addEventListener("click", function () { muted = !muted; try { localStorage.setItem("pur-mute", muted ? "1" : "0"); } catch (e) {} syncMute(); if (!muted) { ac(); sfx("pickup"); } }); syncMute(); }
  stage.addEventListener("pointerdown", function () { ac(); }, { passive: true });
  var pb = stage.querySelector("[data-pause]"); if (pb) pb.addEventListener("click", function () { pause(G && G.state === "play"); });

  window.PUR = { debug: function () { return G; }, newGame: function (id) { hideUI(); newGame(id || "gland"); startLoop(); }, up: function () { return upgradable(); }, apply: function (u) { applyUp(u); }, xp: xp, W: WEAPONS, P: PASSIVES, setTime: function (t) { G.t = t; }, god: function () { G.p.maxHp = G.p.hp = 99999; }, tp: function (x, y) { G.p.x = x; G.p.y = y; }, level: function () { levelUp(); } };
  menu(); startLoop();
})();
