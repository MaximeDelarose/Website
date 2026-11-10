/* =========================================================================
   Écureuil Survivor · version « dithering » : sprites refaits (js/v2/dither-art.js)
   Chargé avant le jeu par jeu-dither.html. Le jeu passe chaque sprite par ES_ART.upgrade(nom, définition).
   - Tous les écureuils sont l'écureuil du logo (assets/squirrel.png, 18 × 19, 8 couleurs), repris pixel pour pixel
     à sa taille d'origine pour Noisette, et recoloré aux couleurs des autres personnages. Le logo est
     déjà dithered : on n'ajoute rien dessus, on l'anime (queue qui ondule, pattes qui alternent, respiration).
   - Tous les autres sprites passent à la taille × 2 (algorithme Scale2x, qui lisse les diagonales sans flou) et
     reçoivent un contour brun très sombre s'il leur manque. Le dithering ne sert qu'aux dégradés : à la frontière entre
     deux tons voisins d'une même couleur, une bande de 2 px en damier remplace le trait net ; les aplats et les silhouettes restent francs.
   ========================================================================= */
(function () {
  "use strict";
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
  function dbl(rows) { var o = []; rows.forEach(function (r) { var d = ""; for (var i = 0; i < r.length; i++) d += r[i] + r[i]; o.push(d, d); }); return o; }   // pixels doublés, sans lissage
  function upgradeHero(d) {
    var pal = heroPal(d.pal || {}), F = LOGO.slice(), o = {};
    Object.keys(d).forEach(function (k) { o[k] = d[k]; });
    var up = tail(F, -1), dn = tail(F, 1);
    o.pal = pal;
    o.frames = [F, feet(up, 1), F, feet(dn, -1)];
    o.bob = [0, 1, 0, 1];
    o.idle = [F, up, F, dn];
    o.volte = shear(F, 2);
    return o;
  }

  var SKIP = {};
  window.ES_ART = {
    scale: 1,
    upgrade: function (name, d) {
      if (!d || !d.frames || !d.frames.length || SKIP[name]) return d;
      try { return /^sq_/.test(name) && name !== "sq_ninja_clone" ? upgradeHero(d) : upgradeSprite(d, !!d.ns); } catch (e) { return d; }
    }
  };
})();
