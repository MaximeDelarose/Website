/* =========================================================================
   Écureuil Survivor · version « dithering » : sprites refaits (js/v2/dither-art.js)
   Chargé avant le jeu par jeu.html. Le jeu passe chaque sprite par ES_ART.upgrade(nom, définition).
   - Tous les écureuils sont l'écureuil du logo (assets/squirrel.png, 18 × 19, 8 couleurs), repris pixel pour pixel
     à sa taille d'origine pour Noisette, et recoloré aux couleurs des autres personnages. Le logo est
     déjà dithered : on n'ajoute rien dessus, on l'anime (queue qui ondule, pattes qui alternent, respiration).
   - Tous les autres sprites passent à la taille × 2 (algorithme Scale2x, qui lisse les diagonales sans flou) et
     reçoivent un contour brun très sombre s'il leur manque. Le dithering ne sert qu'aux dégradés : à la frontière entre
     deux tons voisins d'une même couleur, une bande de 2 px en damier remplace le trait net ; les aplats et les silhouettes restent francs.
   ========================================================================= */
(function () {
  "use strict";
  // ?simple=1 : rendu d'origine, sans les sprites haute résolution (au cas où l'appareil ne les supporte pas) ; ?simple=0 : on revient aux nouveaux sprites
  try { var qs = /[?&]simple=([01])/.exec(location.search); if (qs) localStorage.setItem("es2-simple", qs[1]); if (localStorage.getItem("es2-simple") === "1") return; } catch (e) {}
  var OUT = "#2a1810";
  // l'écureuil du logo, tel quel (a… h = les 8 couleurs du fichier, du plus sombre au plus clair)
  var LOGO = ["..edddddc.........", ".ehhgghhgc........", "ehgfffgghhc.......", "egedefffggc..c.c..", "fedbcdeffgc.cgcg..", "ecb.bcdffec.bhbh..", "cb..ceffedb.bdefe.", "...cdffedc.cdffaf.", "..bdffecaabdeffahd", ".aeffecacddffehhgb", ".bfeecacdeffhhg...", "beffcacdefehhe.a..", "aeeecadffbfefeaca.", ".bcecadeffbhbfefd.", ".aeceaefefchgbcdc.", "..becacefechgc.c..", "...abaccecbecc....", "......acaaecaa....", "......abcbabcba..."];
  var LOGO_PAL = { a: "#4a2313", b: "#632e17", c: "#8a3f20", d: "#aa5324", e: "#bd5c25", f: "#e47f31", g: "#f09b40", h: "#efab5c" };

  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgbHex(c) { return "#" + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function lum(h) { var c = hexRgb(h); return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255; }

  // Scale2x (EPX) : chaque pixel devient 4, les diagonales sont lissées sans flou
  function scale2x(g) {
    var H = g.length, W = g[0].length, out = [], x, y;
    function at(xx, yy) { return xx < 0 || yy < 0 || xx >= W || yy >= H ? null : g[yy][xx]; }
    for (y = 0; y < H * 2; y++) out.push(new Array(W * 2));
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var P = g[y][x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      var e1 = P, e2 = P, e3 = P, e4 = P;
      if (A !== null && C !== null && C === A && C !== D && A !== B) e1 = A;
      if (A !== null && B !== null && A === B && A !== C && B !== D) e2 = B;
      if (D !== null && C !== null && D === C && D !== B && C !== A) e3 = C;
      if (B !== null && D !== null && B === D && B !== A && D !== C) e4 = D;
      out[y * 2][x * 2] = e1; out[y * 2][x * 2 + 1] = e2; out[y * 2 + 1][x * 2] = e3; out[y * 2 + 1][x * 2 + 1] = e4;
    }
    return out;
  }
  function toGrid(rows, w) { return rows.map(function (r) { var o = [], i; for (i = 0; i < w; i++) o.push(i < r.length ? r[i] : "."); return o; }); }
  function fromGrid(g) { return g.map(function (r) { return r.join(""); }); }

  /* ---------- sprites ordinaires : × 2, contour, dithering des seuls dégradés de ton ---------- */
  function hsl(h) {
    var c = hexRgb(h), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hh = 0, ss = 0;
    if (d > 0) { ss = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
    return [hh, ss, l];
  }
  // deux couleurs forment un « dégradé » si ce sont deux tons de la même teinte (ou deux gris) assez proches en luminosité
  function related(a, b) {
    var x = hsl(a), y = hsl(b), dl = Math.abs(x[2] - y[2]);
    if (dl < 0.04 || dl > 0.38 || x[2] < 0.1 || y[2] < 0.1) return false;
    if (x[1] < 0.18 && y[1] < 0.18) return true;
    var dh = Math.abs(x[0] - y[0]); dh = Math.min(dh, 360 - dh);
    return dh < 32 && Math.abs(x[1] - y[1]) < 0.5;
  }
  function upgradeSprite(d, noScale) {
    var pal = d.pal, keys = Object.keys(pal), pal2 = {}, rel = {};
    keys.forEach(function (k) { pal2[k] = pal[k]; });
    var OL = "ð"; pal2[OL] = OUT;
    keys.forEach(function (a) { rel[a] = {}; keys.forEach(function (b) { if (a !== b && related(pal[a], pal[b])) rel[a][b] = 1; }); });
    function dark(ch) { return ch === OL || (pal[ch] && lum(pal[ch]) < 0.2); }
    function conv(rows) {
      if (!rows || !rows.length) return rows;
      var w = 0; rows.forEach(function (r) { w = Math.max(w, r.length); });
      var g0 = toGrid(rows, w), g = noScale ? g0 : scale2x(g0), H = g.length, W = g[0].length, x, y;
      var bord = 0, bordDark = 0;
      function edge0(xx, yy) { return xx < 0 || yy < 0 || xx >= W || yy >= H || g[yy][xx] === "."; }
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (g[y][x] !== "." && (edge0(x - 1, y) || edge0(x + 1, y) || edge0(x, y - 1) || edge0(x, y + 1))) { bord++; if (dark(g[y][x])) bordDark++; }
      var pad = noScale ? 0 : 1, G = [];
      for (y = -pad; y < H + pad; y++) { var row = []; for (x = -pad; x < W + pad; x++) row.push(y >= 0 && y < H && x >= 0 && x < W ? g[y][x] : "."); G.push(row); }
      var H2 = G.length, W2 = G[0].length, needOut = !noScale && bord > 0 && bordDark / bord < 0.5;
      function tr(xx, yy) { return xx < 0 || yy < 0 || xx >= W2 || yy >= H2 || G[yy][xx] === "."; }
      // dithering des dégradés : à la frontière entre deux tons voisins, on mélange les deux en damier (une bande de 2 px)
      var R = G.map(function (r) { return r.slice(); }), nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      // on ne touche que les vraies plages de couleur (au moins 2 voisins de même ton) : les textures déjà en damier et les silhouettes restent intactes
      function same(xx, yy) { var cc = G[yy][xx], n = 0, q; for (q = 0; q < 4; q++) { var ax = xx + nb[q][0], ay = yy + nb[q][1]; if (ax >= 0 && ay >= 0 && ax < W2 && ay < H2 && G[ay][ax] === cc) n++; } return n; }
      var cand = [], opaque = 0;
      if (W2 * H2 >= 64) for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) {
        var c = G[y][x]; if (c === ".") continue; opaque++; if (!rel[c] || same(x, y) < 2) continue;
        for (var k = 0; k < 4; k++) {
          var nx = x + nb[k][0], ny = y + nb[k][1]; if (nx < 0 || ny < 0 || nx >= W2 || ny >= H2) continue;
          var c2 = G[ny][nx]; if (c2 === "." || c2 === c || !rel[c][c2] || same(nx, ny) < 2) continue;
          if ((x + y) % 2 === (c < c2 ? 0 : 1)) { cand.push([x, y, c2]); break; }
        }
      }
      if (cand.length < opaque * 0.22) cand.forEach(function (q) { R[q[1]][q[0]] = q[2]; });       // sprite très texturé : pas de dithering
      if (needOut) for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) if (G[y][x] === "." && (!tr(x - 1, y) || !tr(x + 1, y) || !tr(x, y - 1) || !tr(x, y + 1))) R[y][x] = OL;
      return fromGrid(R);
    }
    var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k]; });
    o.hr = 1; o.up = !noScale;
    o.pal = pal2; o.frames = d.frames.map(conv);
    if (d.idle) o.idle = d.idle.map(conv);
    if (d.volte) o.volte = conv(d.volte);
    return o;
  }

  /* ---------- les écureuils : le logo, recoloré ---------- */
  function heroPal(dp) {
    var base = dp.o || dp.t || "#e8873a", light = dp.t || dp.h || mix(base, "#ffffff", 0.3), dk = dp.d || dp.O || mix(base, OUT, 0.4);
    var exact = lum(base) > 0.45 && Math.abs(hexRgb(base)[0] - 0xe8) < 28 && Math.abs(hexRgb(base)[1] - 0x87) < 28 && Math.abs(hexRgb(base)[2] - 0x3a) < 28;
    if (exact) return LOGO_PAL;                                    // Noisette et les roux : l'écureuil du logo, tel quel
    return { a: mix(dk, OUT, 0.55), b: mix(dk, OUT, 0.3), c: dk, d: mix(dk, base, 0.5), e: mix(dk, base, 0.8), f: base, g: mix(base, light, 0.55), h: light };
  }
  function shear(rows, k) { var H = rows.length; return rows.map(function (r, i) { var s = Math.round((H - 1 - i) / H * k), w = r.length; return s > 0 ? ".".repeat(s) + r.slice(0, w - s) : r; }); }
  // animation du logo : la queue (colonnes 0 à 9) monte ou descend d'un pixel, les pattes (2 dernières rangées) glissent d'une colonne
  function tail(rows, dy) {
    var H = rows.length, W = rows[0].length, g = toGrid(rows, W), out = g.map(function (r) { return r.slice(); }), x, y;
    for (x = 0; x <= 9; x++) for (y = 0; y < H - 3; y++) { var sy = y - dy; out[y][x] = sy >= 0 && sy < H - 3 ? g[sy][x] : "."; }
    return fromGrid(out);
  }
  function feet(rows, dx) {
    var H = rows.length, W = rows[0].length, g = toGrid(rows, W), out = g.map(function (r) { return r.slice(); }), x, y;
    for (y = H - 2; y < H; y++) for (x = 5; x < 16; x++) { var sx = x - dx; out[y][x] = sx >= 5 && sx < 16 ? g[y][sx] : "."; }
    return fromGrid(out);
  }
  function dbl(rows) { return rows; }   // le logo garde ses pixels d'origine (18 × 19)
  function upgradeHero(d) {
    var pal = heroPal(d.pal || {}), F = LOGO.slice(), o = {};
    Object.keys(d).forEach(function (k) { o[k] = d[k]; });
    var up = tail(F, -1), dn = tail(F, 1);
    o.pal = pal; o.hr = 1;
    o.frames = [F, feet(up, 1), F, feet(dn, -1)].map(dbl);
    o.bob = [0, 1, 0, 1];
    o.idle = [F, up, F, dn].map(dbl);
    o.volte = dbl(shear(F, 2));
    return o;
  }

  var SKIP = {};
  // un sprite à haute résolution (canevas flaggé __hr) est dessiné à sa taille « logique » : on garde la taille à l'écran, on gagne en finesse
  var od = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, a, b, c, d) {
    if (arguments.length === 3 && img && img.__hr > 1 && !this.__raw) { var q = img.__hr; return od.call(this, img, Math.round(a * q) / q, Math.round(b * q) / q, img.width / q, img.height / q); }   // collé à la grille fine (1/hr de pixel de jeu)
    return od.apply(this, arguments);
  };

  /* ---------- décor du monde : sol en dégradés dithered, détails cuits à 2× ---------- */
  var BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return (BY[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }
  function vh(x, y) { var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, s) {
    var gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = vh(gx, gy), b = vh(gx + 1, gy), c = vh(gx, gy + 1), d = vh(gx + 1, gy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function band(v, b) { var u = (v - 0.3) / 0.4; return u <= 0 ? 0 : u >= 1 ? 1 : (u > b ? 1 : 0); }   // plateaux francs, dithering seulement dans la zone de transition
  function ramp(G) {
    if (G._r2) return G._r2;
    var B = hexRgb(G.base), P = hexRgb(G.patch), K = hexRgb(mix(G.base, "#000000", 0.13)), L = hexRgb(mix(G.patch, "#ffffff", 0.07));
    return (G._r2 = { B: B, P: P, K: K, L: L });
  }
  // un morceau de sol de 4 × 4 tuiles (128 × 128 px écran), seamless : le bruit dépend des coordonnées du monde
  function groundChunk(ccx, ccy, getG) {
    var S = 64, cv = document.createElement("canvas"); cv.width = cv.height = S;
    var g = cv.getContext("2d"), im = g.createImageData(S, S), d = im.data, tx, ty, px, py, GT = {};
    function gat(a, b) { var k = a + "," + b; return GT[k] || (GT[k] = getG(a, b)); }
    for (ty = 0; ty < 4; ty++) for (tx = 0; tx < 4; tx++) {
      var wx = ccx * 4 + tx, wy = ccy * 4 + ty, G0 = gat(wx, wy), R0 = ramp(G0), GE = gat(wx + 1, wy), GW = gat(wx - 1, wy), GS = gat(wx, wy + 1), GN = gat(wx, wy - 1);
      for (py = 0; py < 16; py++) for (px = 0; px < 16; px++) {
        var X = ccx * S + tx * 16 + px, Y = ccy * S + ty * 16 + py, b = bay(X, Y), R = R0;
        // bord de biome : le sol du voisin déborde en dithering sur 3 px
        var best = 99, nG = null, dd;
        if (GE !== G0 && (dd = 15 - px) < best) { best = dd; nG = GE; }
        if (GW !== G0 && (dd = px) < best) { best = dd; nG = GW; }
        if (GS !== G0 && (dd = 15 - py) < best) { best = dd; nG = GS; }
        if (GN !== G0 && (dd = py) < best) { best = dd; nG = GN; }
        if (nG && best < 3 && (1 - best / 3) * 0.5 > b) R = ramp(nG);
        var f = vn(X, Y, 95) * 0.85 + vn(X + 5000, Y - 3000, 30) * 0.15;
        var c = band((f - 0.6) * 1.7 + 0.5, b) ? R.P : R.B;
        var o = ((ty * 16 + py) * S + tx * 16 + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0); return cv;
  }
  // un petit décor dessiné à 1× : Scale2x, puis dégradé dithered (clair en haut, sombre en bas) sur les tons pleins
  function bake(cv) {
    var w = cv.width, h = cv.height, id = cv.getContext("2d").getImageData(0, 0, w, h).data, g = [], x, y;
    for (y = 0; y < h; y++) { var row = []; for (x = 0; x < w; x++) { var o = (y * w + x) * 4; row.push(id[o + 3] < 8 ? "." : ((id[o] << 24 | id[o + 1] << 16 | id[o + 2] << 8 | id[o + 3]) >>> 0)); } g.push(row); }
    var s = g, W2 = w, H2 = h, out = document.createElement("canvas"); out.width = W2; out.height = H2;
    var og = out.getContext("2d"), im = og.createImageData(W2, H2), d = im.data, top = H2, bot = -1;
    for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) { var v = s[y][x]; if (v !== "." && (v & 255) >= 200) { if (y < top) top = y; if (y > bot) bot = y; } }
    var bh = bot - top + 1;
    for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) {
      var v2 = s[y][x]; if (v2 === ".") continue;
      var r = v2 >>> 24, gg = (v2 >>> 16) & 255, bb = (v2 >>> 8) & 255, a = v2 & 255;
      if (a >= 200 && bh >= 6) {
        var tt = (y - top) / bh, k = bay(x, y);
        if (tt > 0.5 && (tt - 0.5) * 1.5 > k * 0.75) { r *= 0.8; gg *= 0.8; bb *= 0.8; }
        else if (tt < 0.22 && (0.22 - tt) * 3.5 > k * 0.75) { r = r + (255 - r) * 0.16; gg = gg + (255 - gg) * 0.16; bb = bb + (255 - bb) * 0.16; }
      }
      var o2 = (y * W2 + x) * 4; d[o2] = r; d[o2 + 1] = gg; d[o2 + 2] = bb; d[o2 + 3] = a;
    }
    og.putImageData(im, 0, 0); return out;
  }
  // coffres refaits à la main en 2 × (20 × 14)
  var CH_PAL = { h: "#c4895a", B: "#a06a3e", b: "#7a4528", d: "#5a3220", M: "#9c6f12", m: "#d9a521", Y: "#f6d36b", k: "#2a1810", y: "#f2c230" };
  var CHESTS = {
    chest: ["...hhhhhhhhhhhhhh...", "..hhBBBBBBBBBBBBhh..", ".hBBBBBBBBBBBBBBBBh.", ".BBBBBBBBBBBBBBBBBB.", ".bbbbbbbbbbbbbbbbbb.", ".MmmmmmmmmmmmmmmmmM.", ".bBBBBBBYYYYBBBBBBb.", ".bBBBBBBYkkYBBBBBBb.", ".bBBBBBBBkkBBBBBBBb.", ".bBbBBbBBBBBBbBBbBb.", ".bbbbbbbbbbbbbbbbbb.", ".dbdbdbdbdbdbdbdbdb.", ".dddddddddddddddddd.", "..dddddddddddddddd.."],
    chestopen: ["..bbbbbbbbbbbbbbbb..", ".bBBBBBBBBBBBBBBBBb.", ".bBhhBBBBBBBBBBBBBb.", ".bbbbbbbbbbbbbbbbbb.", ".kkkkkkkkkkkkkkkkkk.", "..kYYkkYYYkkYYYkk...", ".kYYYyYYYYyYYYyYYYk.", ".bYyYYYyYYYYyYYYyYb.", ".bBBBBBBYkkYBBBBBBb.", ".bBBBBBBBkkBBBBBBBb.", ".bBbBBbBBBBBBbBBbBb.", ".bbbbbbbbbbbbbbbbbb.", ".dbdbdbdbdbdbdbdbdb.", "..dddddddddddddddd.."]
  };
  window.ES_ART = {
    groundChunk: groundChunk, bake: bake,
    scale: 2, hr: 1,
    upgrade: function (name, d) {
      if (CHESTS[name]) return { pal: CH_PAL, frames: [CHESTS[name]], hr: 1 };
      if (!d || !d.frames || !d.frames.length || SKIP[name]) return d;
      try { return /^sq_/.test(name) && name !== "sq_ninja_clone" ? upgradeHero(d) : upgradeSprite(d, !!d.ns); } catch (e) { return d; }
    }
  };
})();
