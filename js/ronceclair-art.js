/* =========================================================================
   Ronceclair — pixel-art (js/ronceclair-art.js)
   Tout est dessiné en pixels réels, puis affiché ×3 sans lissage.
   - L'écureuil du logo (assets/squirrel.png, 18 × 19, 8 couleurs) est repris
     pixel pour pixel : c'est le héros. Les classes le recolorent et lui
     ajoutent un accessoire.
   - Monstres, PNJ, coffre, objets et terrain sont dessinés dans le même style :
     contour brun très sombre (#2a1810), 3 à 4 tons par couleur et du DITHERING
     (damier entre deux tons voisins, comme dans le logo) pour le volume : pas de dégradé lisse.
   API : window.RC_ART (squirrel, npc, mob, chest, item, shot, terrain, silhouette)
   ========================================================================= */
(function () {
  "use strict";

  var OUT = "#2a1810";

  /* ---------- petits outils ---------- */
  function cv(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function hexRgb(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function rgbHex(r, g, b) { function f(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); } return "#" + f(r) + f(g) + f(b); }
  function shade(hex, f) {          // f > 0 éclaircit, f < 0 assombrit
    var c = hexRgb(hex);
    return f >= 0 ? rgbHex(c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f) : rgbHex(c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f));
  }
  function hash2(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function ell(g, cx, cy, rx, ry, col) {           // ellipse « à pixels » : on teste le centre de chaque pixel
    g.fillStyle = col;
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  }
  function outline(c, col) {                        // contour 1 px autour des pixels pleins
    var g = c.getContext("2d"), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, rgb = hexRgb(col), mark = [], x, y, i;
    function solid(xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] > 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = (y * w + x) * 4; if (a[i + 3] === 0 && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) mark.push(i); }
    mark.forEach(function (j) { a[j] = rgb[0]; a[j + 1] = rgb[1]; a[j + 2] = rgb[2]; a[j + 3] = 255; });
    g.putImageData(d, 0, 0);
  }
  function build(w, h, fn, noOutline) {             // canvas w × h + 1 px de marge pour le contour
    var c = cv(w + 2, h + 2), g = c.getContext("2d");
    g.translate(1, 1); fn(g); g.setTransform(1, 0, 0, 1, 0, 0);
    if (!noOutline) outline(c, OUT);
    return c;
  }
  function grid(g, rows, legend, ox, oy) {          // dessine une grille de caractères
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) { var ch = rows[y][x]; if (ch !== "." && legend[ch]) px(g, ox + x, oy + y, legend[ch]); }
  }

  /* ---------- dithering : damier de Bayer 2 × 2, comme dans le logo ---------- */
  var BAY = [[0, 2], [3, 1]];
  function dth(f, x, y) { var i = Math.floor(f), fr = f - i; return fr > (BAY[y & 1][x & 1] + 0.5) / 4 ? i + 1 : i; }
  // ellipse ombrée : lumière en haut à gauche, rampe = tons du plus sombre au plus clair, transitions en damier
  function ellD(g, cx, cy, rx, ry, ramp, o) {
    o = o || {};
    var lx = o.lx == null ? -0.45 : o.lx, ly = o.ly == null ? -0.6 : o.ly, lz = 0.66, bias = o.bias || 0, gain = o.gain || 0.75, top = ramp.length - 1;
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      var d = dx * lx + dy * ly + Math.sqrt(1 - r2) * lz, v = 0.25 + gain * d + bias;
      v = v < 0 ? 0 : v > 0.999 ? 0.999 : v;
      g.fillStyle = ramp[dth(v * top, x, y)]; g.fillRect(x, y, 1, 1);
    }
  }
  // rectangle à dégradé vertical dithered (v0 en haut, v1 en bas, entre 0 et 1)
  function rectD(g, x, y, w, h, ramp, v0, v1) {
    var top = ramp.length - 1;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var v = v0 + (v1 - v0) * (h > 1 ? j / (h - 1) : 0); v = v < 0 ? 0 : v > 0.999 ? 0.999 : v;
      g.fillStyle = ramp[dth(v * top, x + i, y + j)]; g.fillRect(x + i, y + j, 1, 1);
    }
  }
  function checker(g, x, y, w, h, col) { g.fillStyle = col; for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (((x + i + y + j) & 1) === 0) g.fillRect(x + i, y + j, 1, 1); }
  function vnoise(x, y) {           // bruit de valeur lisse 0..1
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  var silCache = {};
  function silhouette(c, col) {                     // même forme, une seule couleur (flash de dégâts, élites)
    var key = c.__id + col; if (silCache[key]) return silCache[key];
    var o = cv(c.width, c.height), g = o.getContext("2d"); g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, o.width, o.height);
    silCache[key] = o; return o;
  }
  var idSeq = 1;
  function reg(c, ax, ay) { c.__id = "s" + (idSeq++); return { c: c, w: c.width, h: c.height, ax: ax == null ? c.width / 2 : ax, ay: ay == null ? c.height : ay }; }

  /* ====================== L'ÉCUREUIL DU LOGO ====================== */
  var LOGO = [
    "..0111112.........",
    ".033443342........",
    "03455544332.......",
    "04010555442..2.2..",
    "50162105542.2424..",
    "026.6215502.6363..",
    "26..2055016.61050.",
    "...2155012.215575.",
    "..6155027761055731",
    ".70550272115503346",
    ".65002721055334...",
    "60552721050330.7..",
    "70002715565050727.",
    ".6202710556365051.",
    ".7020705052346212.",
    "..602720502342.2..",
    "...76722026022....",
    "......72770277....",
    "......762676267..."
  ];
  // palettes : 0..7 comme dans le logo (clair → très sombre)
  var PAL = {
    logo:     ["#bd5c25", "#aa5324", "#8a3f20", "#efab5c", "#f09b40", "#e47f31", "#632e17", "#4a2313"],
    gardien:  ["#c9893a", "#b57a32", "#8f5d26", "#f3d08a", "#f0b04c", "#e29a3a", "#5e3a16", "#3f240d"],
    mystique: ["#8068c8", "#715ab6", "#5a4694", "#e6dcff", "#a58ce6", "#9275d8", "#3d2d6b", "#291c4d"],
    cendre:   ["#8f96a8", "#7f869a", "#676e84", "#eef1f8", "#cdd3e4", "#aab2c8", "#444a5e", "#2b2f3f"],
    chocolat: ["#7d4b2b", "#6c4026", "#53311c", "#e8cba6", "#cba27a", "#a98059", "#3a2112", "#26140a"],
    elder:    ["#9d9da6", "#8d8d97", "#6e6e7a", "#f0f0f6", "#d6d6e0", "#b4b4c0", "#47474f", "#2c2c34"],
    glandine: ["#d9809a", "#c56f89", "#a5546e", "#ffe0e8", "#f7adc0", "#ec8ea8", "#6f3248", "#4b1c2e"]
  };
  PAL.roux = PAL.logo;
  var LOGO_OX = 4, LOGO_OY = 6, SQ_W = 26, SQ_H = 25;     // marge pour chapeau, bouclier, bâton
  function legendOf(p) { var l = {}; for (var i = 0; i < 8; i++) l[String(i)] = p[i]; return l; }

  var ACC = {
    gardien: function (g) {
      // casque d'acier + petit bouclier de bois devant le ventre
      grid(g, [".hhh.", "hhdhh", "hdhdh"], { h: "#b6bfd2", d: "#7a8398" }, LOGO_OX + 12, LOGO_OY + 1);
      px(g, LOGO_OX + 14, LOGO_OY, "#e8eefc");
      grid(g, [".ssss.", "sbBbBs", "sByybs", "sbyyBs", "sBbBbs", ".ssss."], { s: "#6e7488", b: "#9a6a36", B: "#7a5128", y: "#ffd257" }, LOGO_OX + 14, LOGO_OY + 8);
    },
    lanceur: function (g) {
      // bandeau rouge noué + gland dans la patte
      rect(g, LOGO_OX + 12, LOGO_OY + 3, 5, 1, "#d94f4f"); px(g, LOGO_OX + 11, LOGO_OY + 3, "#b03a3a"); px(g, LOGO_OX + 10, LOGO_OY + 4, "#d94f4f");
      grid(g, [".kk.", "kooc", "kooc", ".kk."], { k: "#6a4426", o: "#e8a838", c: "#fcd27a" }, LOGO_OX + 15, LOGO_OY + 10);
    },
    mystique: function (g) {
      // chapeau pointu étoilé + bâton à gemme
      grid(g, ["...p...", "...q...", "..pqp..", "..qps..", ".pqpqp.", "bbbbbbb"], { p: "#5a3d99", q: "#6e50b5", s: "#ffd257", b: "#3d2a6e" }, LOGO_OX + 11, LOGO_OY - 3);
      rect(g, LOGO_OX + 18, LOGO_OY + 6, 1, 12, "#7a5230"); grid(g, [".y.", "yww", ".y."], { y: "#ffd257", w: "#fff6c8" }, LOGO_OX + 17, LOGO_OY + 3);
    },
    elder: function (g) {
      grid(g, ["wvwvw", ".wvw.", "..w.."], { w: "#f6f6fa", v: "#cfcfdc" }, LOGO_OX + 13, LOGO_OY + 6);
      rect(g, LOGO_OX + 18, LOGO_OY + 4, 1, 14, "#7a5230"); grid(g, [".g.", "ggg", ".g."], { g: "#7df0a0" }, LOGO_OX + 17, LOGO_OY + 1);
    },
    glandine: function (g) {
      grid(g, ["wwww", "wvwv", "wwww"], { w: "#fff6f0", v: "#f0d4dc" }, LOGO_OX + 9, LOGO_OY + 11);
      px(g, LOGO_OX + 15, LOGO_OY + 3, "#fff6f0"); px(g, LOGO_OX + 16, LOGO_OY + 3, "#d94f4f");
    }
  };
  var sqCache = {};
  function drawBase(g, pal, frame) {                  // l'écureuil du logo, recoloré ; frame 1 = queue levée d'un pixel
    var base = cv(18, 19), bg = base.getContext("2d");
    grid(bg, LOGO, legendOf(pal), 0, 0);
    if (frame === 1) {
      var t = cv(10, 19); t.getContext("2d").drawImage(base, 0, 0, 10, 19, 0, 0, 10, 19);
      g.drawImage(base, 10, 0, 8, 19, LOGO_OX + 10, LOGO_OY, 8, 19);
      g.drawImage(t, LOGO_OX, LOGO_OY - 1);
    } else g.drawImage(base, LOGO_OX, LOGO_OY);
  }
  // PNJ (Maître Noisetier, Dame Glandine) : même écureuil, autre palette, accessoire fixe
  function squirrel(kind, frame) {
    var key = kind + frame; if (sqCache[key]) return sqCache[key];
    var pal = PAL[PAL[kind] ? kind : "logo"];
    var c = build(SQ_W, SQ_H, function (g) { drawBase(g, pal, frame); if (ACC[kind]) ACC[kind](g); }, true);
    outline(c, OUT);
    return (sqCache[key] = reg(c, 13, SQ_H + 2 - 1));
  }

  /* ====================== ÉQUIPEMENTS VISIBLES ======================
     Chaque look est dessiné par-dessus l'écureuil (coordonnées du logo + marge). Les mêmes dessins servent d'icônes d'inventaire. */
  var OX = LOGO_OX, OY = LOGO_OY;
  var G_ = ["#1f5c33", "#3d8a4e", "#58b36a", "#9be8a8"];
  var EQ = { tete: {}, dos: {}, main: {}, bouclier: {} };
  EQ.tete.noix = function (g) {
    grid(g, ["..bb...", ".bhbBb.", "bhbBbBb", "bBbBbBb"], { b: "#9a6a36", B: "#7a5128", h: "#c9985a" }, OX + 11, OY + 0);
    px(g, OX + 13, OY - 1, "#5a3a18"); px(g, OX + 14, OY - 1, "#5a3a18");
  };
  EQ.tete.bandeau = function (g) {
    grid(g, ["rrRrrRr", "RrrRrrR"], { r: "#d94f4f", R: "#a83030" }, OX + 11, OY + 4);
    px(g, OX + 10, OY + 4, "#a83030"); px(g, OX + 9, OY + 5, "#d94f4f"); px(g, OX + 10, OY + 6, "#a83030"); px(g, OX + 9, OY + 6, "#d94f4f");
  };
  EQ.tete.sorcier = function (g) {
    grid(g, ["...p...", "...q...", "..pqp..", "..qps..", ".pqpqp.", "bbbbbbb"], { p: "#5a3d99", q: "#6e50b5", s: "#ffd257", b: "#3d2a6e" }, OX + 11, OY - 3);
  };
  EQ.tete.feuille = function (g) {
    grid(g, ["....gg.", "..ggGgg", ".gGgggG", "..gggg."], { g: "#58b36a", G: "#9be8a8" }, OX + 11, OY - 1);
    px(g, OX + 12, OY + 3, "#3d8a4e"); px(g, OX + 13, OY + 3, "#3d8a4e");
  };
  EQ.tete.champi = function (g) {
    grid(g, ["..rrrr..", ".rWrrWr.", "rrrrWrrr", "RRRRRRRR"], { r: "#e8584a", W: "#fff3dd", R: "#a83a30" }, OX + 10, OY - 1);
    rect(g, OX + 12, OY + 3, 4, 1, "#fff3dd");
  };
  EQ.tete.fleurs = function (g) {
    grid(g, ["pGyGwGp", ".G.G.G."], { p: "#ff9fb8", G: "#3d8a4e", y: "#ffd257", w: "#fff6d8" }, OX + 11, OY + 2);
    px(g, OX + 12, OY + 1, "#ffd257"); px(g, OX + 15, OY + 1, "#ff9fb8");
  };
  EQ.tete.heaume = function (g) {
    grid(g, [".hhh.", "hhdhh", "hdhdh", "hddhh"], { h: "#b6bfd2", d: "#7a8398" }, OX + 12, OY + 1);
    px(g, OX + 14, OY, "#e8eefc"); px(g, OX + 14, OY - 1, "#d94f4f");
  };
  EQ.tete.couronne = function (g) {
    grid(g, ["y.y.y", "yyyyy", "yrybr"], { y: "#ffd257", r: "#e0583a", b: "#5aa8ff" }, OX + 12, OY + 1);
    checker(g, OX + 12, OY + 2, 5, 1, "#c98a1f");
  };

  EQ.dos.feuille = function (g) {
    ellD(g, OX + 8.5, OY + 12.5, 3.2, 4.6, G_); px(g, OX + 8, OY + 9, G_[0]); px(g, OX + 8, OY + 11, G_[0]); px(g, OX + 8, OY + 13, G_[0]); px(g, OX + 9, OY + 15, G_[0]);
    px(g, OX + 11, OY + 9, "#ffd257");
  };
  EQ.dos.rouge = function (g) {
    var r = ["#6a1a1a", "#a83030", "#d94f4f", "#f08a7a"];
    rectD(g, OX + 6, OY + 9, 5, 7, r, 0.9, 0.15); rect(g, OX + 11, OY + 9, 1, 1, "#ffd257"); px(g, OX + 6, OY + 16, r[0]); px(g, OX + 10, OY + 16, r[0]);
  };
  EQ.dos.nuit = function (g) {
    var r = ["#14143a", "#26266a", "#3e3e96", "#6a6ac8"];
    rectD(g, OX + 6, OY + 9, 5, 7, r, 0.85, 0.1); px(g, OX + 7, OY + 11, "#ffd257"); px(g, OX + 9, OY + 13, "#ffd257"); px(g, OX + 8, OY + 15, "#fff0a0"); px(g, OX + 11, OY + 9, "#ffd257");
  };
  EQ.dos.mousse = function (g) {
    var r = ["#2f5a24", "#4a7f34", "#79ad4c", "#b4dc78"];
    ellD(g, OX + 8.5, OY + 12.5, 3.4, 4.8, r); px(g, OX + 7, OY + 10, "#fff3dd"); px(g, OX + 9, OY + 14, "#e8584a"); px(g, OX + 8, OY + 13, "#e8584a");
  };
  EQ.dos.ailes = function (g) {
    var w = ["#5a9cc0", "#a4dcf0", "#e8fbff"];
    ellD(g, OX + 6.5, OY + 6, 2.2, 5, w, { bias: 0.2 }); ellD(g, OX + 9.5, OY + 5.5, 1.9, 4.2, w, { bias: 0.25 });
    px(g, OX + 6, OY + 3, "#ffffff"); px(g, OX + 9, OY + 3, "#ffffff");
  };

  var SHIELD = [".ssss.", "sbBbBs", "sByybs", "sbyyBs", "sBbBbs", ".ssss."];
  EQ.bouclier.bois = function (g) { grid(g, SHIELD, { s: "#6e7488", b: "#9a6a36", B: "#7a5128", y: "#ffd257" }, OX + 14, OY + 8); };
  EQ.bouclier.ecorce = function (g) { grid(g, SHIELD, { s: "#3a2a1a", b: "#7a5a3a", B: "#54391f", y: "#9be8a8" }, OX + 14, OY + 8); };
  EQ.bouclier.acier = function (g) { grid(g, SHIELD, { s: "#46506a", b: "#b6bfd2", B: "#8791aa", y: "#e8eefc" }, OX + 14, OY + 8); };
  EQ.bouclier.or = function (g) { grid(g, SHIELD, { s: "#8a5a14", b: "#ffd257", B: "#c98a1f", y: "#fff6c8" }, OX + 14, OY + 8); };
  EQ.main.bouclier = EQ.bouclier.bois;                // anciennes sauvegardes
  EQ.main.baton = function (g) {
    rect(g, OX + 18, OY + 5, 1, 13, "#7a5230"); checker(g, OX + 18, OY + 6, 1, 11, "#5a3a1c");
    ellD(g, OX + 18.5, OY + 3.5, 2.4, 2.6, ["#3d2a6e", "#8f78c8", "#c9a6ff", "#f1e6ff"]);
  };
  EQ.main.gland = function (g) {
    ellD(g, OX + 17.5, OY + 14, 3, 3.4, ["#8a5a2b", "#d9a35a", "#f6cf94"]); ellD(g, OX + 17.5, OY + 11, 3.2, 1.8, ["#2e1a0a", "#6a4426", "#9a6a3a"]);
  };
  EQ.main.fleur = function (g) {
    rect(g, OX + 18, OY + 6, 1, 12, "#3d8a4e"); px(g, OX + 19, OY + 11, "#58b36a"); px(g, OX + 17, OY + 13, "#58b36a");
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) { px(g, OX + 18 + d[0] * 1, OY + 4 + d[1] * 1, "#ff9fb8"); }); px(g, OX + 18, OY + 4, "#ffd257");
    px(g, OX + 17, OY + 3, "#ffc4d4"); px(g, OX + 19, OY + 5, "#ffc4d4");
  };
  EQ.main.epee = function (g) {
    rect(g, OX + 18, OY + 2, 1, 11, "#d9c9a0"); rect(g, OX + 17, OY + 3, 1, 9, "#a8946a"); px(g, OX + 18, OY + 1, "#fff6d8");
    rect(g, OX + 16, OY + 13, 5, 1, "#7a5230"); rect(g, OX + 18, OY + 14, 1, 3, "#5a3a1c");
  };
  EQ.main.lanterne = function (g) {
    rect(g, OX + 18, OY + 5, 1, 12, "#7a5230");
    checker(g, OX + 15, OY + 5, 7, 6, "rgba(255,236,150,.45)");
    ellD(g, OX + 18.5, OY + 8, 2.6, 2.8, ["#c98a1f", "#ffd257", "#fff6c8"], { bias: 0.3 }); px(g, OX + 17, OY + 7, "#fff"); rect(g, OX + 17, OY + 5, 3, 1, "#5a3a1c");
  };

  var heroCache = {};
  // spec = { fur, tete, dos, main } ; frame 0 / 1 (queue)
  function hero(spec, frame) {
    var key = [spec.fur, spec.tete, spec.dos, spec.main, spec.bouc, frame].join("|");
    if (heroCache[key]) return heroCache[key];
    var pal = PAL[spec.fur] || PAL.roux;
    var c = build(SQ_W, SQ_H, function (g) {
      drawBase(g, pal, frame);
      if (spec.dos && EQ.dos[spec.dos]) EQ.dos[spec.dos](g);
      if (spec.tete && EQ.tete[spec.tete]) EQ.tete[spec.tete](g);
      if (spec.main && EQ.main[spec.main]) EQ.main[spec.main](g);
      if (spec.bouc && EQ.bouclier[spec.bouc]) EQ.bouclier[spec.bouc](g);
    }, true);
    outline(c, OUT);
    return (heroCache[key] = reg(c, 13, SQ_H + 2 - 1));
  }
  var urlCache = {};
  function toURL(c, key) { return urlCache[key] || (urlCache[key] = c.toDataURL()); }
  function trim(c, pad) {                              // recadre un canvas sur ses pixels visibles
    var g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, x, y;
    for (y = 0; y < c.height; y++) for (x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    var o = cv(x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2); o.getContext("2d").drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
    return o;
  }
  function heroURL(spec, frame) { var sp = hero(spec, frame || 0); return toURL(sp.c, "hero|" + [spec.fur, spec.tete, spec.dos, spec.main, spec.bouc, frame || 0].join("|")); }
  function headURL(spec) {                              // portrait de la barre de vie : la tête de l'écureuil
    var key = "head|" + [spec.fur, spec.tete].join("|"); if (urlCache[key]) return urlCache[key];
    var sp = hero({ fur: spec.fur, tete: spec.tete, dos: null, main: null }, 0), o = cv(14, 14);
    o.getContext("2d").drawImage(sp.c, OX + 8, OY - 4, 14, 14, 0, 0, 14, 14);
    return (urlCache[key] = o.toDataURL());
  }
  // icône d'un équipement : son dessin isolé, recadré
  function itemIconURL(slot, look) {
    var key = "item|" + slot + "|" + look; if (urlCache[key]) return urlCache[key];
    var c = cv(SQ_W + 2, SQ_H + 2), g = c.getContext("2d");
    if (slot === "amulette") {
      var gem = { gland: ["#8a4f14", "#e8a838", "#fcd27a"], pierre: ["#4a5a8a", "#9aaee0", "#e8f0ff"], baie: ["#7a1e38", "#d94f6f", "#ffa9bd"], plume: ["#2a6a8a", "#5ac8e8", "#e0faff"] }[look] || ["#555", "#aaa", "#fff"];
      rect(g, 10, 8, 1, 1, "#7a5230"); rect(g, 9, 7, 1, 1, "#7a5230"); rect(g, 11, 7, 1, 1, "#7a5230");
      ellD(g, 10.5, 11.5, 3, 3, gem);
      var out = cv(16, 16); out.getContext("2d").drawImage(trim(c, 1), 0, 0); outline(out, OUT); return (urlCache[key] = out.toDataURL());
    }
    if (slot === "familier") { var mu = new Image(); var mk = "pet|" + look; var mc = mob(look, 0).c, o2 = cv(mc.width, mc.height); o2.getContext("2d").drawImage(mc, 0, 0); var t2 = trim(o2, 1); return (urlCache[key] = t2.toDataURL()); }
    var P8 = { anneau: { gland: ["#8a4f14", "#e8a838", "#fcd27a"], pierre: ["#4a5a8a", "#9aaee0", "#e8f0ff"], baie: ["#7a1e38", "#d94f6f", "#ffa9bd"], or: ["#8a5a14", "#ffd257", "#fff6c8"] },
      ceinture: { cuir: ["#3a2412", "#7a5230", "#b78a52"], tresse: ["#7a6a2a", "#d9c46a", "#f6eaa0"], mousse: ["#2f5a24", "#79ad4c", "#b4dc78"], or: ["#8a5a14", "#ffd257", "#fff6c8"] },
      bottes: { mousse: ["#2f5a24", "#79ad4c", "#b4dc78"], cuir: ["#3a2412", "#7a5230", "#b78a52"], vent: ["#5a9cc0", "#a4dcf0", "#e8fbff"], or: ["#8a5a14", "#ffd257", "#fff6c8"] },
      trophee: { emeraude: ["#14683a", "#3ecf7a", "#c8ffe0"], turquoise: ["#1a6a7a", "#3ec8d8", "#d0fbff"], pourpre: ["#4a1a7a", "#a45ae0", "#ecd6ff"], ocre: ["#8a5a14", "#e0a030", "#ffe6a8"], ivoire: ["#8a8070", "#e8e0cc", "#fffaf0"] } };
    var cl = P8[slot] && P8[slot][look];
    if (cl) {
      var out2 = cv(16, 16), g2 = out2.getContext("2d");
      if (slot === "anneau") { ellD(g2, 8, 9, 5, 5, cl); ellD(g2, 8, 9, 2.4, 2.4, ["rgba(0,0,0,0)", "rgba(0,0,0,0)"]); g2.clearRect(6, 7, 4, 4); rect(g2, 7, 3, 2, 2, "#ffffff"); }
      else if (slot === "ceinture") { rect(g2, 1, 6, 14, 4, cl[1]); checker(g2, 1, 6, 14, 4, cl[0]); rect(g2, 6, 5, 4, 6, cl[2]); rect(g2, 7, 6, 2, 4, cl[0]); }
      else if (slot === "bottes") { ellD(g2, 6, 6, 3, 4.6, cl); ellD(g2, 8, 11.5, 6, 3, cl); rect(g2, 3, 2, 6, 1, "#fff3dd"); }
      else { ellD(g2, 8, 8, 6, 6.4, cl, { bias: 0.1 }); px(g2, 5, 5, "#ffffff"); px(g2, 6, 4, "#ffffff"); }       // Dofus : œuf brillant
      var tt = trim(out2, 1); outline(tt, OUT); return (urlCache[key] = tt.toDataURL());
    }
    g.translate(1, 1);
    if (EQ[slot] && EQ[slot][look]) EQ[slot][look](g);
    var t = trim(c, 1); outline(t, OUT);
    return (urlCache[key] = t.toDataURL());
  }

  /* ====================== ICÔNES DE SORTS ====================== */
  function lineP(g, x0, y0, x1, y1, col) {              // trait Bresenham
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, er = dx + dy, e2;
    for (;;) { px(g, x0, y0, col); if (x0 === x1 && y0 === y1) break; e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
  }
  var ICONS = {
    atk_melee: function (g) { var c = ["#fff3dd", "#ffd9a0"]; for (var i = 0; i < 3; i++) { lineP(g, 3 + i * 4, 2, 6 + i * 4 - 1, 13, c[0]); lineP(g, 4 + i * 4, 2, 7 + i * 4 - 1, 13, c[1]); } },
    atk_shoot: function (g) { ellD(g, 8, 9, 3.6, 4.2, ["#8a5a2b", "#d9a35a", "#f6cf94"]); ellD(g, 8, 5.5, 3.8, 2, ["#2e1a0a", "#6a4426", "#9a6a3a"]); px(g, 8, 2, "#4a2d16"); },
    atk_magic: function (g) { checker(g, 1, 1, 14, 14, "rgba(201,166,255,.35)"); ellD(g, 8, 8, 5.2, 5.2, ["#3d2a6e", "#8f78c8", "#c9a6ff", "#f1e6ff"]); px(g, 6, 6, "#fff"); },
    atk_vine: function (g) { lineP(g, 3, 13, 12, 3, "#4fae5f"); lineP(g, 4, 13, 13, 3, "#3d8a4e"); [[6, 9], [9, 6], [11, 4]].forEach(function (a) { px(g, a[0] - 2, a[1], "#9be8a8"); px(g, a[0] + 1, a[1] - 2, "#9be8a8"); }); },
    tourbillon: function (g) { var a, n = 16; for (var i = 0; i < n * 2; i++) { a = i / n * 3.4; var r = 1.5 + i * 0.17; px(g, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), i % 3 ? "#ffe6a8" : "#fff"); } px(g, 8, 8, "#fff"); },
    rempart: function (g) { ellD(g, 8, 8.5, 5.4, 6, ["#3a4258", "#6e7488", "#aab3cc", "#e0e6f8"]); rect(g, 7, 4, 2, 9, "#ffd257"); rect(g, 4, 7, 8, 2, "#ffd257"); checker(g, 4, 7, 8, 2, "#c98a1f"); },
    charge: function (g) { rect(g, 2, 7, 9, 2, "#ffd257"); rect(g, 3, 9, 7, 1, "#c98a1f"); for (var i = 0; i < 4; i++) { px(g, 10 + i, 7 - i, "#ffd257"); px(g, 10 + i, 8 + i, "#ffd257"); } rect(g, 2, 4, 3, 1, "#fff3dd"); rect(g, 2, 11, 3, 1, "#fff3dd"); },
    salve: function (g) { [[-4, 0.5], [0, -1], [4, 0.5]].forEach(function (a) { ellD(g, 8 + a[0], 9 + a[1] * 2, 2.2, 2.8, ["#8a5a2b", "#d9a35a", "#f6cf94"]); }); },
    pluie: function (g) { ellD(g, 8, 5, 5.6, 3, ["#6a7088", "#aab3cc", "#e0e6f8"]); [[4, 9], [7, 11], [10, 9], [6, 13], [9, 14]].forEach(function (a) { ellD(g, a[0], a[1], 1.2, 1.6, ["#8a5a2b", "#d9a35a", "#f6cf94"]); }); },
    tir: function (g) { rect(g, 1, 7, 6, 2, "#fff3dd"); ellD(g, 10, 8, 4.5, 3.6, ["#8a5a2b", "#d9a35a", "#f6cf94"]); rect(g, 6, 7, 2, 2, "#6a4426"); px(g, 2, 6, "#fff"); px(g, 2, 9, "#fff"); },
    nova: function (g) { ellD(g, 8, 8, 6, 6, ["#3d2a6e", "#8f78c8", "#c9a6ff"], { bias: -0.1 }); for (var i = 0; i < 8; i++) { var a = i * 0.785; lineP(g, Math.round(8 + Math.cos(a) * 3), Math.round(8 + Math.sin(a) * 3), Math.round(8 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7), "#f1e6ff"); } },
    orbes: function (g) { ellD(g, 5.5, 5.5, 3.6, 3.6, ["#3d2a6e", "#8f78c8", "#c9a6ff", "#f1e6ff"]); ellD(g, 10.5, 10.5, 3.6, 3.6, ["#3d2a6e", "#8f78c8", "#c9a6ff", "#f1e6ff"]); },
    tempete: function (g) { for (var i = 0; i < 30; i++) { var a = i / 5 * 1.6, r = 1 + i * 0.22; px(g, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r * 0.8), i % 2 ? "#b49be6" : "#e8dcff"); } lineP(g, 9, 2, 6, 7, "#ffd257"); lineP(g, 6, 7, 10, 7, "#ffd257"); lineP(g, 10, 7, 7, 13, "#ffd257"); },
    source: function (g) { ellD(g, 8, 9.5, 4.6, 5, ["#1f5c33", "#3d8a4e", "#7df0a0", "#d4f7da"]); px(g, 8, 2, "#7df0a0"); px(g, 8, 3, "#7df0a0"); rect(g, 7, 4, 2, 2, "#7df0a0"); rect(g, 7, 8, 2, 4, "#fff"); rect(g, 5, 9, 6, 2, "#fff"); },
    ronces: function (g) { lineP(g, 2, 13, 6, 8, "#3d8a4e"); lineP(g, 6, 8, 5, 3, "#3d8a4e"); lineP(g, 6, 8, 12, 6, "#4fae5f"); lineP(g, 12, 6, 13, 12, "#4fae5f"); [[5, 3], [12, 5], [13, 12], [2, 12], [9, 7]].forEach(function (a) { px(g, a[0], a[1], "#e8584a"); px(g, a[0] + 1, a[1] - 1, "#fff"); }); },
    floraison: function (g) { [[0, -3], [0, 3], [-3, 0], [3, 0], [2, 2], [-2, -2], [-2, 2], [2, -2]].forEach(function (a) { ellD(g, 8 + a[0], 8 + a[1], 1.9, 1.9, ["#d94f8a", "#ff9fd0", "#ffe0ef"]); }); ellD(g, 8, 8, 2.2, 2.2, ["#c98a1f", "#ffd257", "#fff0a0"]); },
    potion: function (g) { ellD(g, 8, 9, 5, 4.6, ["#7a1e38", "#d94f6f", "#ffa9bd"]); rect(g, 8, 3, 2, 3, "#4fae5f"); rect(g, 10, 3, 3, 2, "#6fd07f"); },
    dash: function (g) { rect(g, 3, 6, 8, 2, "#9ad7ff"); rect(g, 5, 9, 6, 1, "#5aa8ff"); for (var i = 0; i < 4; i++) { px(g, 10 + i, 6 - i + 1, "#e0f2ff"); px(g, 10 + i, 7 + i - 1, "#e0f2ff"); } },
    nut: function (g) { ellD(g, 8, 9, 4.2, 4.8, ["#8a4f14", "#e8a838", "#fcd27a"]); ellD(g, 8, 5.5, 4.4, 2.4, ["#2e1a0a", "#6a4426", "#9a6a3a"]); px(g, 8, 2, "#4a2d16"); },
    el_terre: function (g) { ellD(g, 8, 10, 5.2, 4.4, ["#4a2d16", "#8a5a2b", "#c98a3a", "#e8b866"]); ellD(g, 5.5, 8.5, 2.2, 1.6, ["#6a4426", "#c98a3a", "#f0cf8a"]); lineP(g, 8, 6, 8, 2, "#58b36a"); ellD(g, 10, 3.5, 2.4, 1.6, ["#1f5c33", "#58b36a", "#9be8a8"]); },
    el_feu: function (g) { ellD(g, 8, 10.5, 4.8, 4.6, ["#8a1e10", "#e8583a", "#ff9a4a"]); ellD(g, 8, 6.8, 3.2, 4.6, ["#c83a1a", "#ff7b4a", "#ffd257"]); lineP(g, 8, 1, 8, 5, "#ffd257"); px(g, 8, 1, "#fff6c8"); ellD(g, 8, 11.5, 2.2, 2.4, ["#ffb23a", "#ffe08a", "#ffffff"]); },
    el_eau: function (g) { ellD(g, 8, 10, 4.8, 4.8, ["#1a4a7a", "#4fb6dd", "#9ae0ff", "#e0f6ff"]); for (var i = 0; i < 5; i++) rect(g, 8 - (4 - i) * 0.5 | 0, 2 + i, 1 + (i >> 0) * 0 + (i > 1 ? 1 : 0) + (i > 3 ? 1 : 0), 1, i % 2 ? "#4fb6dd" : "#9ae0ff"); px(g, 6, 10, "#ffffff"); px(g, 6, 9, "#ffffff"); },
    el_air: function (g) { for (var i = 0; i < 26; i++) { var a = i / 4.2, r = 1 + i * 0.26; px(g, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r * 0.9), i % 3 ? "#7df0c2" : "#e0fff4"); } px(g, 8, 8, "#ffffff"); lineP(g, 11, 12, 15, 12, "#7df0c2"); lineP(g, 1, 4, 5, 4, "#7df0c2"); },
    scroll: function (g) { rectD(g, 3, 2, 10, 12, ["#b8975a", "#e8d4a0", "#fff3d0"], 0.9, 0.2); for (var i = 0; i < 4; i++) rect(g, 5, 4 + i * 2, 6, 1, "#8a6a3a"); ellD(g, 8, 2, 5.2, 1.4, ["#7a5a2a", "#c9a060", "#f0d898"]); ellD(g, 8, 14, 5.2, 1.4, ["#7a5a2a", "#c9a060", "#f0d898"]); },
    gear: function (g) { for (var i = 0; i < 8; i++) { var a = i * 0.785; ellD(g, 8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, 1.8, 1.8, ["#4a5064", "#8a91a8", "#c8cfe0"]); } ellD(g, 8, 8, 4.8, 4.8, ["#4a5064", "#8a91a8", "#c8cfe0", "#eef0fa"]); ellD(g, 8, 8, 1.8, 1.8, ["#1a1c28", "#3a3e52"]); },
    bag: function (g) { ellD(g, 8, 10, 5.6, 4.8, ["#4a2d16", "#8a5a2b", "#c98744", "#e8a860"]); rect(g, 5, 3, 6, 3, "#6a4426"); checker(g, 5, 3, 6, 3, "#8a5a2b"); rect(g, 4, 5, 8, 1, "#ffd257"); },
    star: function (g) { lineP(g, 8, 2, 8, 14, "#ffd257"); lineP(g, 2, 8, 14, 8, "#ffd257"); ellD(g, 8, 8, 3, 3, ["#c98a1f", "#ffd257", "#fff6c8"]); }
  };
  function icon(name) {
    var key = "icon|" + name; if (urlCache[key]) return urlCache[key];
    var f = ICONS[name] || ICONS.star, c = build(16, 16, f);
    return (urlCache[key] = c.toDataURL());
  }

  /* ====================== MONSTRES ====================== */
  var mobCache = {};
  function mob(type, frame) {
    var key = type + frame; if (mobCache[key]) return mobCache[key];
    var s;
    if (type === "limace") s = limace(frame);
    else if (type === "corbeau") s = corbeau(frame);
    else if (type === "roi") s = roi(frame);
    else if (type === "renard") s = renard(frame);
    else s = grenouille(frame);
    return (mobCache[key] = s);
  }
  function wing(g, x0, y0, n, wd, dir, ramp) {      // aile en plumes : chaque rangée est dithered du sombre vers le clair
    for (var r = 0; r < n; r++) {
      var y = dir < 0 ? y0 - r : y0 + r, x = x0 - (r >> 1), w = wd + (r >> 1), v = 0.15 + 0.7 * (r / Math.max(1, n - 1));
      for (var i = 0; i < w; i++) { var f = (v + (i / w) * 0.25) * (ramp.length - 1); g.fillStyle = ramp[dth(Math.min(f, ramp.length - 1.001), x + i, y)]; g.fillRect(x + i, y, 1, 1); }
    }
  }
  function limace(f) {
    var st = f ? 1 : 0, rS = ["#434d1d", "#6e7a32", "#a0b05a", "#d2de8c"];
    return reg(build(18, 11, function (g) {
      ellD(g, 8 + st, 7, 7 + st, 3.3, rS);                          // corps
      rect(g, 2 - st, 9, 13 + st * 2, 1, "#d9d98a"); checker(g, 2 - st, 10, 13 + st * 2, 1, "#a9b062");   // pied clair
      ellD(g, 14, 6, 3.3, 3.3, rS, { bias: 0.05 });                 // tête
      px(g, 4, 5, rS[0]); px(g, 6, 4, rS[0]); px(g, 8, 4, rS[0]); px(g, 10, 4, rS[0]); px(g, 7, 5, rS[1]); px(g, 9, 5, rS[1]);
      rect(g, 13, 1, 1, 3, rS[1]); rect(g, 16, 2, 1, 2, rS[1]);
      px(g, 13, 0, "#ffffff"); px(g, 16, 1, "#ffffff");
      px(g, 15, 6, "#2a1810"); px(g, 16, 8, "#e0583a");
    }), 10, 12);
  }
  function corbeau(f) {
    var rC = ["#14121f", "#23212f", "#3a3850", "#6a67a0"], rW = ["#1a1828", "#2d2b3c", "#4a4770", "#7a76b8"];
    return reg(build(20, 16, function (g) {
      if (f === 0) wing(g, 5, 6, 7, 5, -1, rW); else wing(g, 5, 10, 6, 6, 1, rW);
      rect(g, 0, 8, 4, 2, "#23212f"); checker(g, 0, 8, 4, 2, "#3a3850");   // queue
      ellD(g, 9, 8.5, 6, 3.4, rC);                                         // corps
      ellD(g, 14, 6.5, 3.2, 3.2, rC, { bias: 0.1 });                       // tête
      rect(g, 17, 6, 3, 1, "#f2a73a"); px(g, 17, 7, "#d98a1f"); px(g, 19, 6, "#ffd27a");
      px(g, 15, 5, "#ffffff");
    }), 10, f ? 15 : 13);
  }
  function roi(f) {
    var rC = ["#0f0d22", "#23213f", "#34305a", "#6460a8"], rW = ["#15122b", "#2d2b50", "#4f4b86", "#8480c8"];
    return reg(build(40, 32, function (g) {
      if (f === 0) wing(g, 8, 12, 13, 10, -1, rW); else wing(g, 8, 20, 11, 12, 1, rW);
      rect(g, 0, 17, 7, 4, "#23213f"); checker(g, 0, 17, 7, 4, "#34305a");
      ellD(g, 18, 18, 12, 6.8, rC);
      ellD(g, 28, 13, 6.2, 6.2, rC, { bias: 0.1 });
      rect(g, 33, 12, 6, 2, "#f2a73a"); rect(g, 33, 14, 4, 1, "#d98a1f"); checker(g, 33, 12, 6, 2, "#ffd27a");
      px(g, 30, 11, "#ff5a4a"); px(g, 31, 11, "#ffffff");
      grid(g, ["y.y.y", "yyyyy", "yryry"], { y: "#ffd257", r: "#e0583a" }, 25, 4); checker(g, 25, 6, 5, 1, "#c98a1f");   // couronne
    }), 20, f ? 31 : 28);
  }
  function renard(f) {
    var s = f ? 1 : 0, rF = ["#7a3a14", "#b4561f", "#e0763a", "#f9a868"], rB = ["#cfae86", "#e8d2b2", "#fff3dd"];
    return reg(build(26, 15, function (g) {
      ellD(g, 3, 8 - s, 3.7, 2.7, rF); ellD(g, 1, 8 - s, 1.7, 2.1, rB, { bias: 0.2 });          // queue au bout blanc
      rect(g, 6, 12, 2, 3, "#8a4018"); rect(g, 10, 12, 2, 3 - s, "#8a4018"); rect(g, 15, 12, 2, 3, "#8a4018"); rect(g, 18, 12, 2, 3 - s, "#8a4018");
      checker(g, 6, 12, 2, 3, "#a8501f"); checker(g, 15, 12, 2, 3, "#a8501f");                   // pattes
      ellD(g, 12, 9, 8.2, 4.2, rF);                                                                // corps
      ellD(g, 12, 11.5, 6, 1.8, rB, { bias: 0.1 });                                                // ventre
      ellD(g, 20, 7, 4.2, 3.5, rF, { bias: 0.1 });                                                 // tête
      rect(g, 22, 8, 4, 2, "#fff3dd"); checker(g, 22, 9, 4, 1, "#e8d2b2"); px(g, 25, 8, "#2a1810");
      rect(g, 18, 2, 2, 3, "#e0763a"); rect(g, 22, 2, 2, 3, "#e0763a"); px(g, 19, 3, "#2a1810"); px(g, 23, 3, "#2a1810"); px(g, 18, 2, "#f9a868"); px(g, 22, 2, "#f9a868");
      px(g, 21, 6, "#ffffff"); px(g, 22, 6, "#2a1810");
    }), 14, 15);
  }
  function grenouille(f) {
    var j = f ? 1 : 0, rG = ["#1f5c33", "#3d8a4e", "#58b36a", "#9be8a8"];
    return reg(build(18, 14, function (g) {
      ellD(g, 3, 11 + j, 2.6, 2, rG, { bias: -0.1 }); ellD(g, 15, 11 + j, 2.6, 2, rG, { bias: -0.1 });   // pattes arrière
      ellD(g, 9, 8 - j, 7.2, 3.6, rG);
      ellD(g, 9, 9.6 - j, 4.6, 1.9, ["#58b36a", "#9be8a8", "#d4f7da"], { bias: 0.2 });
      ellD(g, 5, 3 - j, 2.7, 2.7, rG); ellD(g, 13, 3 - j, 2.7, 2.7, rG);                                  // yeux
      px(g, 5, 3 - j, "#ffffff"); px(g, 6, 3 - j, "#2a1810"); px(g, 13, 3 - j, "#ffffff"); px(g, 14, 3 - j, "#2a1810");
      rect(g, 6, 8 - j, 6, 1, "#1f5c33");
      px(g, 4, 6 - j, "#1f5c33"); px(g, 9, 5 - j, "#3d8a4e"); px(g, 12, 6 - j, "#1f5c33"); px(g, 7, 6 - j, "#3d8a4e");
    }), 9, 14);
  }

  /* ====================== OBJETS, COFFRE, PROJECTILES ====================== */
  var itCache = {};
  function item(kind, f) {
    var key = kind + (f || 0); if (itCache[key]) return itCache[key];
    var s;
    if (kind === "gold") s = reg(build(8, 9, function (g) {
      ellD(g, 4, 5.6, 3.6, 3.6, ["#8a4f14", "#e8a838", "#fcd27a"]);
      ellD(g, 4, 1.6, 3.4, 1.9, ["#2e1a0a", "#6a4426", "#9a6a3a"]); px(g, 4, 0, "#4a2d16");
    }), 5, 10);
    else if (kind === "potion") s = reg(build(8, 8, function (g) {
      ellD(g, 4, 4.6, 3.6, 3.3, ["#7a1e38", "#d94f6f", "#ffa9bd"]);
      rect(g, 4, 0, 1, 2, "#4fae5f"); rect(g, 5, 0, 2, 1, "#6fd07f");
    }), 5, 9);
    else if (kind.indexOf("loot") === 0) {                // sac de butin : le bijou prend la couleur de la rareté
      var rc = ["#cfd3d8", "#6fd07f", "#5aa8ff", "#b57cff", "#ffb23a"][+kind.slice(4)] || "#cfd3d8";
      s = reg(build(10, 10, function (g) {
        ellD(g, 5, 6, 4.4, 3.6, ["#4a2d16", "#8a5a2b", "#c98744"]); rect(g, 3, 1, 4, 2, "#6a4426"); checker(g, 3, 1, 4, 2, "#8a5a2b");
        ellD(g, 5, 6, 1.8, 1.8, [rc === "#cfd3d8" ? "#8a8f96" : rc, rc, "#ffffff"], { bias: 0.25 });
      }), 6, 11);
    }
    else s = reg(build(8, 8, function (g) { ellD(g, 4, 4, 3.6, 3.6, ["#a8801a", "#ffd257", "#fff0a0"]); }), 5, 9);
    return (itCache[key] = s);
  }
  var shCache = {};
  function shot(kind) {
    if (shCache[kind]) return shCache[kind];
    var s;
    if (kind === "gland") s = reg(build(8, 5, function (g) { ellD(g, 4, 2.5, 3.6, 2.4, ["#8a5a2b", "#d9a35a", "#f6cf94"]); rect(g, 0, 1, 2, 3, "#4a2d16"); checker(g, 0, 1, 2, 3, "#6a4426"); }), 5, 3);
    else if (kind === "orbe") s = reg(build(13, 13, function (g) {
      checker(g, 0, 0, 13, 13, "rgba(201,166,255,.35)");                                                // halo en damier
      ellD(g, 6.5, 6.5, 6.2, 6.2, ["rgba(0,0,0,0)", "rgba(143,120,200,.9)"], { bias: 0.2 });
      ellD(g, 6.5, 6.5, 5, 5, ["#5a3d99", "#8f78c8", "#c9a6ff", "#f1e6ff"], { bias: 0.1 }); px(g, 4, 4, "#ffffff");
    }, true), 7, 7);
    else if (kind === "epine") s = reg(build(9, 5, function (g) { ellD(g, 4, 2.5, 3.8, 1.9, ["#1f5c33", "#4fae5f", "#9be8a8"]); px(g, 8, 2, "#e8584a"); px(g, 1, 1, "#9be8a8"); px(g, 1, 4, "#3d8a4e"); }), 5, 3);
    else s = reg(build(10, 4, function (g) { ellD(g, 5, 2, 4.6, 1.8, ["#15122b", "#3a3850", "#7a76b8"]); rect(g, 0, 1, 3, 2, "#23212f"); checker(g, 0, 1, 3, 2, "#3a3850"); }), 6, 3);
    return (shCache[kind] = s);
  }
  var chCache = {};
  function chest(open) {
    var k = open ? 1 : 0; if (chCache[k]) return chCache[k];
    var wood = ["#6e4420", "#9a6330", "#c98744", "#e8a860"], band = ["#4a5064", "#6e7488", "#a4abc0"];
    var s = reg(build(18, 14, function (g) {
      if (open) { rectD(g, 1, 1, 16, 5, wood, 0.2, 0.7); rect(g, 3, 5, 12, 2, "#2a1810"); }
      rectD(g, 1, 6, 16, 8, wood, 0.75, 0.05);                                  // caisse : clair en haut, sombre en bas
      if (!open) { rectD(g, 1, 1, 16, 5, wood, 0.95, 0.55); rect(g, 2, 0, 14, 1, wood[2]); }
      for (var i = 0; i < 14; i += 4) px(g, 2 + i, open ? 9 : 4, wood[0]);       // veines du bois
      rectD(g, 4, 1, 2, 13, band, 0.9, 0.2); rectD(g, 12, 1, 2, 13, band, 0.9, 0.2);
      if (!open) { rect(g, 8, 5, 3, 4, "#ffd257"); px(g, 9, 6, "#8a5a2b"); checker(g, 8, 8, 3, 1, "#c98a1f"); } else { for (var q = 0; q < 4; q++) { px(g, 6 + q * 2, 5, "#ffd257"); px(g, 7 + q * 2, 5, "#e8a838"); } }
    }), 10, 16);
    return (chCache[k] = s);
  }
  function stall() {
    if (itCache.stall) return itCache.stall;
    var wood = ["#7a5a34", "#a8804c", "#c9a06a", "#e8c48e"];
    var s = reg(build(34, 14, function (g) {
      rectD(g, 0, 4, 34, 10, wood, 0.85, 0.05);
      for (var i = 0; i < 6; i++) { rect(g, i * 6 + 1, 0, 3, 4, i % 2 ? "#fff3dd" : "#d94f4f"); checker(g, i * 6 + 1, 3, 3, 1, i % 2 ? "#e8d2b2" : "#a83030"); }   // auvent rayé
      ellD(g, 6, 8, 2.2, 2.2, ["#7a1e38", "#d94f6f", "#ffa9bd"]); ellD(g, 12, 8, 2.2, 2.2, ["#7a1e38", "#d94f6f", "#ffa9bd"]);
      ellD(g, 20, 8, 2.2, 2.2, ["#8a4f14", "#e8a838", "#fcd27a"]); ellD(g, 27, 8, 2.2, 2.2, ["#8a4f14", "#e8a838", "#fcd27a"]);
    }), 18, 15);
    return (itCache.stall = s);
  }

  /* ====================== TERRAIN ====================== */
  var TILE = 16;
  function treeSprite(C, v) {
    return build(26, 26, function (g) {
      var ramp = [shade(C.tree, -0.32), shade(C.tree, -0.12), C.tree2, shade(C.tree2, 0.3)];
      ellD(g, 13, 13, 11, 11, ramp, { bias: -0.12 });
      for (var i = 0; i < 9; i++) { var a = i / 9 * 6.283 + v * 2; ellD(g, 13 + Math.cos(a) * 9.5, 13 + Math.sin(a) * 9.5, 3.6, 3.6, ramp, { bias: -0.05 }); }   // lobes du feuillage
      ellD(g, 12, 11, 8.6, 8.2, ramp, { bias: 0.1 });
      for (var j = 0; j < 5; j++) { var b = j / 5 * 6.283 + v * 3; ellD(g, 12 + Math.cos(b) * 6, 11 + Math.sin(b) * 5.5, 3.2, 2.8, ramp, { bias: 0.18 }); }
      ellD(g, 8, 7, 4.4, 3.4, ramp, { bias: 0.4 });
    });
  }
  function rockSprite(v) {
    var ramp = ["#4f565f", "#7d848d", "#aab1ba", "#dde3e9"];
    return build(16, 12, function (g) {
      ellD(g, 8, 8, 7.2, 4.2, ramp, { bias: -0.05 }); ellD(g, 6.5, 6, 5, 3, ramp, { bias: 0.2 }); ellD(g, 5.5, 4.5, 2.4, 1.4, ramp, { bias: 0.45 });
      rect(g, 3, 9, 10, 1, ramp[0]); checker(g, 3, 8, 10, 1, ramp[1]);
      if (v > 0.5) { px(g, 10, 5, ramp[0]); px(g, 11, 6, ramp[0]); } else { px(g, 4, 7, ramp[0]); px(g, 5, 8, ramp[0]); }
    });
  }
  function terrain(m) {
    var C = m.Z.col, w = m.w, h = m.h, W = w * TILE, H = h * TILE, c = cv(W, H), g = c.getContext("2d"), x, y, i;
    var img = g.createImageData(W, H), a = img.data;
    var gR = [shade(C.g1, -0.1), C.g2, C.g1, shade(C.g1, 0.07)].map(hexRgb);
    var gD = [shade(C.g1, -0.4), shade(C.g1, -0.34), shade(C.g1, -0.28), shade(C.g1, -0.2)].map(hexRgb);
    var pR = [shade(C.path, -0.16), shade(C.path, -0.06), C.path, shade(C.path, 0.08)].map(hexRgb);
    var wR = [shade(C.water, -0.16), shade(C.water, -0.07), C.water, shade(C.water, 0.12)].map(hexRgb);
    var foam = hexRgb(shade(C.water, 0.7)), wl = hexRgb(shade(C.water, 0.32)), pd = hexRgb(shade(C.path, -0.3)), g1 = hexRgb(C.g1);
    function kind(tx, ty) { return tx < 0 || ty < 0 || tx >= w || ty >= h ? 3 : m.t[ty][tx]; }
    function pick(ramp, n, X, Y, contrast) {            // n 0..1 → couleur de la rampe, avec transitions en damier
      n = (n - 0.5) * contrast + 0.5; n = n < 0 ? 0 : n > 0.999 ? 0.999 : n;
      return ramp[dth(n * (ramp.length - 1), X, Y)];
    }
    function set(X, Y, col) { var o = (Y * W + X) * 4; a[o] = col[0]; a[o + 1] = col[1]; a[o + 2] = col[2]; a[o + 3] = 255; }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var tx = x >> 4, ty = y >> 4, k = m.t[ty][tx], lx = x & 15, ly = y & 15;
      var n = vnoise(x / 6, y / 6) * 0.65 + vnoise(x / 2.3 + 40, y / 2.3 + 7) * 0.35;
      if (k === 2) {                                           // eau : rides dithered + bord d'écume en dégradé de damier
        var wv = (Math.sin((x * 0.75 + y * 0.4) / 2.6 + vnoise(x / 7, y / 7) * 6) + 1) / 2;
        var d = 99;
        if (kind(tx, ty - 1) !== 2) d = Math.min(d, ly);
        if (kind(tx, ty + 1) !== 2) d = Math.min(d, 15 - ly);
        if (kind(tx - 1, ty) !== 2) d = Math.min(d, lx);
        if (kind(tx + 1, ty) !== 2) d = Math.min(d, 15 - lx);
        var col;
        if (d === 0) col = foam; else if (d === 1) col = ((x + y) & 1) ? foam : wl; else if (d === 2) col = wl;
        else if (d === 3) col = ((x + y) & 1) ? wl : pick(wR, wv, x, y, 1.5); else col = pick(wR, wv * 0.55 + n * 0.45, x, y, 1.35);
        set(x, y, col);
      } else if (k === 1) {                                    // chemin : terre mouchetée, bord assombri en damier
        var pe = 99;
        if (kind(tx, ty - 1) === 0 || kind(tx, ty - 1) === 3) pe = Math.min(pe, ly);
        if (kind(tx, ty + 1) === 0 || kind(tx, ty + 1) === 3) pe = Math.min(pe, 15 - ly);
        var pc;
        if (pe === 0) pc = pd; else if (pe === 1) pc = ((x + y) & 1) ? pd : pR[0]; else if (pe === 2) pc = ((x + y) & 1) ? pR[0] : pR[1]; else pc = pick(pR, n, x, y, 1.5);
        set(x, y, pc);
      } else {                                                 // herbe : plages claires / sombres fondues en damier
        set(x, y, pick(k === 3 ? gD : gR, n, x, y, 1.6));
      }
    }
    g.putImageData(img, 0, 0);
    // petits détails de sol
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var kk = m.t[y][x], ox = x * TILE, oy = y * TILE, hv = hash2(x, y);
      if (kk === 0 && hv < 0.3) { var tx2 = 3 + Math.floor(hash2(y, x) * 10), ty2 = 5 + Math.floor(hash2(x + 4, y) * 9), gd = shade(C.g1, -0.3); px(g, ox + tx2, oy + ty2, gd); px(g, ox + tx2 - 1, oy + ty2 - 1, gd); px(g, ox + tx2 + 1, oy + ty2 - 1, gd); px(g, ox + tx2, oy + ty2 - 2, shade(C.g1, 0.18)); }
      if (kk === 1 && hv < 0.45) { rect(g, ox + 3 + Math.floor(hv * 20), oy + 5 + Math.floor(hv * 17), 2, 1, shade(C.path, 0.2)); px(g, ox + 9 + Math.floor(hv * 5), oy + 11, shade(C.path, -0.25)); }
    }
    // décors (coordonnées du monde → pixels : /3)
    var gdk = shade(C.g1, -0.3);
    m.deco.forEach(function (d) {
      var dx = Math.round(d.x / 3), dy = Math.round(d.y / 3);
      if (d.k === "fleur") { var col = ["#fff6d8", "#ff9fb8", "#ffd257", "#c9a6ff"][d.c % 4]; px(g, dx, dy - 1, col); px(g, dx, dy + 1, col); px(g, dx - 1, dy, col); px(g, dx + 1, dy, col); px(g, dx, dy, "#ffb43a"); px(g, dx, dy + 2, gdk); px(g, dx + 1, dy + 2, gdk); }
      else if (d.k === "touffe") { px(g, dx, dy, gdk); px(g, dx - 1, dy - 1, gdk); px(g, dx + 1, dy - 1, gdk); px(g, dx, dy - 2, gdk); px(g, dx - 2, dy - 3, gdk); px(g, dx + 2, dy - 3, gdk); px(g, dx, dy - 3, shade(C.g1, 0.2)); }
      else if (d.k === "champi") { var cr = d.c % 2 ? ["#8a2a22", "#e8584a", "#ff9a8a"] : ["#4d3a85", "#b58cf0", "#e2d0ff"]; ellD(g, dx, dy - 1, 3, 2.2, cr); rect(g, dx, dy + 1, 1, 2, "#fff3dd"); px(g, dx - 1, dy - 2, "#ffffff"); px(g, dx + 1, dy - 1, "#ffffff"); checker(g, dx - 2, dy + 3, 5, 1, "rgba(0,0,0,.3)"); }
      else if (d.k === "nenuphar") { ellD(g, dx, dy, 4.2, 3.2, ["#2c7a3c", "#4fae5f", "#8fe49c"]); px(g, dx + 1, dy, C.water); px(g, dx + 2, dy, C.water); px(g, dx + 1, dy + 1, C.water); }
    });
    // rochers puis arbres, avec ombre portée en damier
    var rocks = [rockSprite(0.2), rockSprite(0.8)], trees = [treeSprite(C, 0.1), treeSprite(C, 0.5), treeSprite(C, 0.9)];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var k2 = m.t[y][x], cx = x * TILE + 8, cy = y * TILE + 8;
      if (k2 === 4) { checker(g, cx - 7, cy + 4, 15, 3, "rgba(0,0,0,.45)"); var rs = rocks[hash2(x, y) > 0.5 ? 1 : 0]; g.drawImage(rs, cx - rs.width / 2 | 0, cy - rs.height / 2 | 0); }
      else if (k2 === 3) {
        var tv = trees[Math.floor(hash2(x + 5, y) * 3) % 3], jx = Math.floor((hash2(x, y) - 0.5) * 4), jy = Math.floor((hash2(y, x) - 0.5) * 4);
        checker(g, cx - 9 + jx, cy + 6 + jy, 19, 5, "rgba(0,0,0,.4)");
        g.drawImage(tv, cx - tv.width / 2 + jx | 0, cy - tv.height / 2 + jy | 0);
      }
    }
    return c;
  }

  var mobUrlCache = {};
  function mobURL(type) { if (mobUrlCache[type]) return mobUrlCache[type]; var sp = mob(type, 0); return (mobUrlCache[type] = sp.c.toDataURL()); }
  window.RC_ART = { mobURL: mobURL, hero: hero, heroURL: heroURL, headURL: headURL, itemIconURL: itemIconURL, icon: icon, PAL: PAL, squirrel: squirrel, mob: mob, item: item, shot: shot, chest: chest, stall: stall, terrain: terrain, silhouette: silhouette, TILE: TILE, shade: shade };
})();
