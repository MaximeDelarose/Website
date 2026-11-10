/* =========================================================================
   Ronceclair — pixel-art (js/ronceclair-art.js)
   Tout est dessiné en pixels réels, puis affiché ×3 sans lissage.
   - L'écureuil du logo (assets/squirrel.png, 18 × 19, 8 couleurs) est repris
     pixel pour pixel : c'est le héros. Les classes le recolorent et lui
     ajoutent un accessoire.
   - Monstres, PNJ, coffre, objets et terrain sont dessinés dans le même style :
     contour brun très sombre (#2a1810), trois tons par couleur, pas de dégradé.
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
    elder:    ["#9d9da6", "#8d8d97", "#6e6e7a", "#f0f0f6", "#d6d6e0", "#b4b4c0", "#47474f", "#2c2c34"],
    glandine: ["#d9809a", "#c56f89", "#a5546e", "#ffe0e8", "#f7adc0", "#ec8ea8", "#6f3248", "#4b1c2e"]
  };
  var LOGO_OX = 4, LOGO_OY = 6, SQ_W = 26, SQ_H = 25;     // marge pour chapeau, bouclier, bâton
  function legendOf(p) { var l = {}; for (var i = 0; i < 8; i++) l[String(i)] = p[i]; return l; }

  var ACC = {
    gardien: function (g) {
      // casque d'acier + petit bouclier de bois devant le ventre
      grid(g, [".hhh.", "hhhhh", "hdddh"], { h: "#b6bfd2", d: "#7a8398" }, LOGO_OX + 12, LOGO_OY + 1);
      px(g, LOGO_OX + 14, LOGO_OY, "#e8eefc");
      grid(g, [".ssss.", "sbbbbs", "sbyybs", "sbyybs", "sbbbbs", ".ssss."], { s: "#6e7488", b: "#9a6a36", y: "#ffd257" }, LOGO_OX + 14, LOGO_OY + 8);
    },
    lanceur: function (g) {
      // bandeau rouge noué + gland dans la patte
      rect(g, LOGO_OX + 12, LOGO_OY + 3, 5, 1, "#d94f4f"); px(g, LOGO_OX + 11, LOGO_OY + 3, "#b03a3a"); px(g, LOGO_OX + 10, LOGO_OY + 4, "#d94f4f");
      grid(g, [".kk.", "kooc", "kooc", ".kk."], { k: "#6a4426", o: "#e8a838", c: "#fcd27a" }, LOGO_OX + 15, LOGO_OY + 10);
    },
    mystique: function (g) {
      // chapeau pointu étoilé + bâton à gemme
      grid(g, ["...p...", "...p...", "..ppp..", "..pps..", ".ppppp.", "bbbbbbb"], { p: "#5a3d99", s: "#ffd257", b: "#3d2a6e" }, LOGO_OX + 11, LOGO_OY - 3);
      rect(g, LOGO_OX + 18, LOGO_OY + 6, 1, 12, "#7a5230"); grid(g, [".y.", "yww", ".y."], { y: "#ffd257", w: "#fff6c8" }, LOGO_OX + 17, LOGO_OY + 3);
    },
    elder: function (g) {
      grid(g, ["wwwww", ".www.", "..w.."], { w: "#f6f6fa" }, LOGO_OX + 13, LOGO_OY + 6);
      rect(g, LOGO_OX + 18, LOGO_OY + 4, 1, 14, "#7a5230"); grid(g, [".g.", "ggg", ".g."], { g: "#7df0a0" }, LOGO_OX + 17, LOGO_OY + 1);
    },
    glandine: function (g) {
      grid(g, ["wwww", "wwww", "wwww"], { w: "#fff6f0" }, LOGO_OX + 9, LOGO_OY + 11);
      px(g, LOGO_OX + 15, LOGO_OY + 3, "#fff6f0"); px(g, LOGO_OX + 16, LOGO_OY + 3, "#d94f4f");
    }
  };
  var sqCache = {};
  // frame : 0 = repos, 1 = queue levée (alterne pendant la marche)
  function squirrel(kind, frame) {
    var key = kind + frame; if (sqCache[key]) return sqCache[key];
    var pal = PAL[kind === "lanceur" ? "logo" : (PAL[kind] ? kind : "logo")];
    var c = build(SQ_W, SQ_H, function (g) {
      var base = cv(18, 19), bg = base.getContext("2d");
      grid(bg, LOGO, legendOf(pal), 0, 0);
      if (frame === 1) {            // la queue (colonnes 0-9) monte d'un pixel
        var t = cv(10, 19); t.getContext("2d").drawImage(base, 0, 0, 10, 19, 0, 0, 10, 19);
        g.drawImage(base, 10, 0, 8, 19, LOGO_OX + 10, LOGO_OY, 8, 19);
        g.drawImage(t, LOGO_OX, LOGO_OY - 1);
      } else g.drawImage(base, LOGO_OX, LOGO_OY);
      if (ACC[kind]) ACC[kind](g);
    }, true);
    outline(c, OUT);
    return (sqCache[key] = reg(c, 13, SQ_H + 2 - 1));
  }

  /* ====================== MONSTRES ====================== */
  var mobCache = {};
  function mob(type, frame) {
    var key = type + frame; if (mobCache[key]) return mobCache[key];
    var s;
    if (type === "limace") s = limace(frame);
    else if (type === "corbeau") s = corbeau(frame, false);
    else if (type === "roi") s = roi(frame);
    else if (type === "renard") s = renard(frame);
    else s = grenouille(frame);
    return (mobCache[key] = s);
  }
  function limace(f) {
    var w = 18, st = f ? 1 : 0;
    return reg(build(w, 11, function (g) {
      ell(g, 8 + st, 7, 7 + st, 3, "#a0b05a");                  // corps
      ell(g, 6, 8, 5, 2, "#6e7a32");                              // ventre sombre
      rect(g, 2 - st, 9, 13 + st * 2, 1, "#d9d98a");              // pied clair
      ell(g, 11, 5, 3, 1.4, "#c6d47a");                           // reflet
      ell(g, 14, 6, 3, 3, "#a0b05a");                             // tête
      px(g, 4, 5, "#6e7a32"); px(g, 6, 4, "#6e7a32"); px(g, 8, 4, "#6e7a32"); px(g, 10, 4, "#6e7a32");
      rect(g, 13, 1, 1, 3, "#7e8a3e"); rect(g, 16, 2, 1, 2, "#7e8a3e");   // antennes
      px(g, 13, 0, "#ffffff"); px(g, 16, 1, "#ffffff");
      px(g, 15, 6, "#2a1810"); px(g, 16, 8, "#e0583a");
    }), 10, 12);
  }
  function corbeau(f) {
    return reg(build(20, 16, function (g) {
      var wing = "#2d2b3c", wing2 = "#4a4770";
      if (f === 0) { for (var r = 0; r < 7; r++) rect(g, 5 - (r >> 1), 6 - r, 5 + (r >> 1), 1, r % 3 === 0 ? wing2 : wing); }
      else { for (var q = 0; q < 6; q++) rect(g, 5 - (q >> 1), 10 + q, 6 + (q >> 1), 1, q % 3 === 0 ? wing2 : wing); }
      rect(g, 0, 8, 4, 2, "#23212f");                              // queue
      ell(g, 9, 8.5, 6, 3.2, "#3a3850");                           // corps
      ell(g, 8, 7.2, 3, 1.2, "#5b5880");                           // reflet
      ell(g, 14, 6.5, 3, 3, "#3a3850");                            // tête
      rect(g, 17, 6, 3, 1, "#f2a73a"); px(g, 17, 7, "#d98a1f");    // bec
      px(g, 15, 5, "#ffffff"); px(g, 15, 5, "#ffffff");
    }), 10, f ? 15 : 13);
  }
  function roi(f) {
    return reg(build(40, 32, function (g) {
      var wing = "#2d2b50", wing2 = "#4f4b86";
      if (f === 0) { for (var r = 0; r < 13; r++) rect(g, 8 - (r >> 1), 12 - r, 10 + (r >> 1), 1, r % 4 === 0 ? wing2 : wing); }
      else { for (var q = 0; q < 11; q++) rect(g, 8 - (q >> 1), 20 + q, 12 + (q >> 1), 1, q % 4 === 0 ? wing2 : wing); }
      rect(g, 0, 17, 7, 4, "#23213f");
      ell(g, 18, 18, 12, 6.5, "#34305a");
      ell(g, 16, 15.5, 6, 2.4, "#5a5694");
      ell(g, 28, 13, 6, 6, "#34305a");
      rect(g, 33, 12, 6, 2, "#f2a73a"); rect(g, 33, 14, 4, 1, "#d98a1f");
      px(g, 30, 11, "#ff5a4a"); px(g, 31, 11, "#ffffff");
      grid(g, ["y.y.y", "yyyyy", "yryry"], { y: "#ffd257", r: "#e0583a" }, 25, 4);   // couronne
    }), 20, f ? 31 : 28);
  }
  function renard(f) {
    var s = f ? 1 : 0;
    return reg(build(26, 15, function (g) {
      ell(g, 3, 8 - s, 3.6, 2.6, "#e0763a"); ell(g, 1, 8 - s, 1.6, 2, "#fff3dd");    // queue au bout blanc
      rect(g, 6, 12, 2, 3, "#a8501f"); rect(g, 10, 12, 2, 3 - s, "#a8501f"); rect(g, 15, 12, 2, 3, "#a8501f"); rect(g, 18, 12, 2, 3 - s, "#a8501f");   // pattes
      ell(g, 12, 9, 8, 4, "#e0763a");                                                  // corps
      ell(g, 12, 11, 6, 2, "#fff3dd");                                                 // ventre
      ell(g, 11, 7, 4, 1.2, "#f59a5a");                                                // reflet
      ell(g, 20, 7, 4, 3.4, "#e0763a");                                                // tête
      rect(g, 22, 8, 4, 2, "#fff3dd"); px(g, 25, 8, "#2a1810");                        // museau + truffe
      rect(g, 18, 2, 2, 3, "#e0763a"); rect(g, 22, 2, 2, 3, "#e0763a"); px(g, 19, 3, "#2a1810"); px(g, 23, 3, "#2a1810");   // oreilles
      px(g, 21, 6, "#ffffff"); px(g, 22, 6, "#2a1810");
    }), 14, 15);
  }
  function grenouille(f) {
    var j = f ? 1 : 0;
    return reg(build(18, 14, function (g) {
      rect(g, 1, 9 + j, 4, 3, "#3d8a4e"); rect(g, 13, 9 + j, 4, 3, "#3d8a4e");           // pattes arrière
      ell(g, 9, 8 - j, 7, 3.4, "#58b36a");
      ell(g, 9, 9 - j, 4.5, 2, "#8be09a");
      ell(g, 5, 3 - j, 2.6, 2.6, "#58b36a"); ell(g, 13, 3 - j, 2.6, 2.6, "#58b36a");     // yeux
      px(g, 5, 3 - j, "#ffffff"); px(g, 6, 3 - j, "#2a1810"); px(g, 13, 3 - j, "#ffffff"); px(g, 14, 3 - j, "#2a1810");
      rect(g, 6, 8 - j, 6, 1, "#2f7a45");                                                   // bouche
      px(g, 4, 6 - j, "#2f7a45"); px(g, 9, 5 - j, "#3d8a4e"); px(g, 12, 6 - j, "#3d8a4e");
    }), 9, 14);
  }

  /* ====================== OBJETS, COFFRE, PROJECTILES ====================== */
  var itCache = {};
  function item(kind, f) {
    var key = kind + (f || 0); if (itCache[key]) return itCache[key];
    var s;
    if (kind === "gold") s = reg(build(8, 9, function (g) {
      ell(g, 4, 5.5, 3.5, 3.5, "#e8a838"); ell(g, 3, 4.5, 1.4, 1.4, "#fcd27a");
      rect(g, 1, 0, 6, 2, "#6a4426"); px(g, 4, -0 + 0, "#4a2d16"); px(g, 4, 8, "#c47f1f");
    }), 5, 10);
    else if (kind === "potion") s = reg(build(8, 8, function (g) {
      ell(g, 4, 4.5, 3.5, 3.2, "#d94f6f"); px(g, 3, 3, "#ff9db3"); px(g, 4, 3, "#ff9db3");
      rect(g, 4, 0, 1, 2, "#4fae5f"); rect(g, 5, 0, 2, 1, "#6fd07f");
    }), 5, 9);
    else s = reg(build(8, 8, function (g) { ell(g, 4, 4, 3.5, 3.5, "#ffd257"); }), 5, 9);
    return (itCache[key] = s);
  }
  var shCache = {};
  function shot(kind) {
    if (shCache[kind]) return shCache[kind];
    var s;
    if (kind === "gland") s = reg(build(8, 5, function (g) { ell(g, 4, 2.5, 3.5, 2.3, "#d9a35a"); rect(g, 0, 1, 2, 3, "#6a4426"); px(g, 5, 1, "#f2c88a"); }), 5, 3);
    else if (kind === "orbe") s = reg(build(11, 11, function (g) { ell(g, 5.5, 5.5, 5, 5, "#8f78c8"); ell(g, 5.5, 5.5, 3, 3, "#c9a6ff"); ell(g, 4.5, 4.5, 1.2, 1.2, "#ffffff"); }), 6, 6);
    else s = reg(build(10, 4, function (g) { ell(g, 5, 2, 4.5, 1.6, "#3a3850"); rect(g, 0, 1, 3, 2, "#23212f"); px(g, 7, 1, "#5b5880"); }), 6, 3);
    return (shCache[kind] = s);
  }
  var chCache = {};
  function chest(open) {
    var k = open ? 1 : 0; if (chCache[k]) return chCache[k];
    var s = reg(build(18, 14, function (g) {
      if (open) { rect(g, 1, 1, 16, 4, "#8a5a2b"); rect(g, 1, 1, 16, 1, "#b9773a"); rect(g, 3, 5, 12, 2, "#2a1810"); }
      rect(g, 1, 6, 16, 8, "#b9773a"); rect(g, 1, 11, 16, 3, "#8a5a2b"); rect(g, 1, 6, 16, 1, "#d9944e");
      if (!open) { rect(g, 1, 1, 16, 5, "#c98744"); rect(g, 1, 1, 16, 1, "#e8a860"); rect(g, 2, 0, 14, 1, "#c98744"); }
      rect(g, 4, 1, 2, 13, "#6e7488"); rect(g, 12, 1, 2, 13, "#6e7488");
      if (!open) { rect(g, 8, 5, 3, 4, "#ffd257"); px(g, 9, 6, "#8a5a2b"); } else { for (var i = 0; i < 4; i++) px(g, 6 + i * 2, 5, "#ffd257"); }
    }), 10, 16);
    return (chCache[k] = s);
  }
  function stall() {
    if (itCache.stall) return itCache.stall;
    var s = reg(build(34, 14, function (g) {
      rect(g, 0, 4, 34, 10, "#c9a06a"); rect(g, 0, 4, 34, 2, "#e2bd86"); rect(g, 0, 11, 34, 3, "#8a6a42");
      for (var i = 0; i < 6; i++) rect(g, i * 6 + 1, 0, 3, 4, i % 2 ? "#fff3dd" : "#d94f4f");     // auvent rayé
      ell(g, 6, 8, 2, 2, "#d94f6f"); ell(g, 12, 8, 2, 2, "#d94f6f"); ell(g, 20, 8, 2, 2, "#e8a838"); ell(g, 27, 8, 2, 2, "#e8a838");
    }), 18, 15);
    return (itCache.stall = s);
  }

  /* ====================== TERRAIN ====================== */
  var TILE = 16;
  function treeSprite(C, v) {
    return build(26, 26, function (g) {
      var dark = C.tree, mid = C.tree2, light = shade(C.tree2, 0.28);
      ell(g, 13, 13, 11, 11, dark);
      for (var i = 0; i < 9; i++) { var a = i / 9 * 6.283 + v * 2; ell(g, 13 + Math.cos(a) * 9.5, 13 + Math.sin(a) * 9.5, 3.4, 3.4, dark); }
      ell(g, 12, 11, 8.5, 8, mid);
      for (var j = 0; j < 5; j++) { var b = j / 5 * 6.283 + v * 3; ell(g, 12 + Math.cos(b) * 6, 11 + Math.sin(b) * 5.5, 3, 2.6, mid); }
      ell(g, 8, 7, 4, 3, light); ell(g, 15, 9, 2.4, 1.8, light); px(g, 11, 14, shade(dark, -0.2)); px(g, 16, 15, shade(dark, -0.2)); px(g, 7, 13, shade(dark, -0.2));
      ell(g, 17, 17, 4, 3, shade(dark, -0.18));
    });
  }
  function rockSprite(v) {
    return build(16, 12, function (g) {
      ell(g, 8, 8, 7.2, 4, "#8a919a"); ell(g, 7, 6, 5.5, 3.2, "#aab1ba"); ell(g, 5.5, 4.5, 2.5, 1.4, "#d4dae0");
      rect(g, 3, 9, 10, 1, "#6e757e"); if (v > 0.5) { px(g, 10, 5, "#6e757e"); px(g, 11, 6, "#6e757e"); } else { px(g, 4, 7, "#6e757e"); px(g, 5, 8, "#6e757e"); }
    });
  }
  function terrain(m) {
    var C = m.Z.col, w = m.w, h = m.h, c = cv(w * TILE, h * TILE), g = c.getContext("2d"), x, y, i;
    var g1 = C.g1, g2 = C.g2, gd = shade(C.g1, -0.22), gl = shade(C.g1, 0.16);
    var pa = C.path, pd = shade(C.path, -0.18), pl = shade(C.path, 0.14);
    var w1 = C.water, wd = shade(C.water, -0.2), wl = shade(C.water, 0.22), foam = shade(C.water, 0.65);
    function kind(tx, ty) { return tx < 0 || ty < 0 || tx >= w || ty >= h ? 3 : m.t[ty][tx]; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var k = m.t[y][x], ox = x * TILE, oy = y * TILE, hv = hash2(x, y);
      if (k === 2) {                                   // eau
        rect(g, ox, oy, TILE, TILE, w1);
        for (i = 0; i < 6; i++) px(g, ox + Math.floor(hash2(x * 7 + i, y) * 16), oy + Math.floor(hash2(x, y * 7 + i) * 16), i % 2 ? wl : wd);
        if (kind(x, y - 1) !== 2) { rect(g, ox, oy, TILE, 1, foam); rect(g, ox, oy + 1, TILE, 1, wl); }
        if (kind(x, y + 1) !== 2) { rect(g, ox, oy + TILE - 2, TILE, 1, wl); rect(g, ox, oy + TILE - 1, TILE, 1, foam); }
        if (kind(x - 1, y) !== 2) { rect(g, ox, oy, 1, TILE, foam); rect(g, ox + 1, oy, 1, TILE, wl); }
        if (kind(x + 1, y) !== 2) { rect(g, ox + TILE - 2, oy, 1, TILE, wl); rect(g, ox + TILE - 1, oy, 1, TILE, foam); }
      } else if (k === 1) {                            // chemin de terre
        rect(g, ox, oy, TILE, TILE, pa);
        for (i = 0; i < 8; i++) px(g, ox + Math.floor(hash2(x * 5 + i, y + 3) * 16), oy + Math.floor(hash2(x + 9, y * 5 + i) * 16), i % 3 ? pd : pl);
        if (hv < 0.4) { rect(g, ox + 3 + Math.floor(hv * 20), oy + 5 + Math.floor(hv * 17), 2, 1, pl); }
        if (kind(x, y - 1) === 0 || kind(x, y - 1) === 3) { rect(g, ox, oy, TILE, 1, pd); for (i = 0; i < 16; i += 3) if (hash2(x + i, y) < 0.5) px(g, ox + i, oy + 1, g1); }
        if (kind(x, y + 1) === 0 || kind(x, y + 1) === 3) { rect(g, ox, oy + TILE - 1, TILE, 1, pd); for (i = 1; i < 16; i += 3) if (hash2(x + i, y + 2) < 0.5) px(g, ox + i, oy + TILE - 2, g1); }
      } else {                                         // herbe (et fond sous les arbres et rochers)
        rect(g, ox, oy, TILE, TILE, k === 3 ? shade(g1, -0.16) : g1);
        for (i = 0; i < 6; i++) px(g, ox + Math.floor(hash2(x * 3 + i, y) * 16), oy + Math.floor(hash2(x, y * 3 + i) * 16), i < 3 ? g2 : gl);
        if (hv < 0.3 && k === 0) { var tx = 3 + Math.floor(hash2(y, x) * 10), ty = 5 + Math.floor(hash2(x + 4, y) * 9); px(g, ox + tx, oy + ty, gd); px(g, ox + tx - 1, oy + ty - 1, gd); px(g, ox + tx + 1, oy + ty - 1, gd); }
      }
    }
    // décors (coordonnées du monde → pixels : /3)
    m.deco.forEach(function (d) {
      var dx = Math.round(d.x / 3), dy = Math.round(d.y / 3);
      if (d.k === "fleur") { var col = ["#fff6d8", "#ff9fb8", "#ffd257", "#c9a6ff"][d.c % 4]; px(g, dx, dy - 1, col); px(g, dx, dy + 1, col); px(g, dx - 1, dy, col); px(g, dx + 1, dy, col); px(g, dx, dy, "#ffb43a"); px(g, dx, dy + 2, gd); }
      else if (d.k === "touffe") { px(g, dx, dy, gd); px(g, dx - 1, dy - 1, gd); px(g, dx + 1, dy - 1, gd); px(g, dx, dy - 2, gd); px(g, dx - 2, dy - 3, gd); px(g, dx + 2, dy - 3, gd); }
      else if (d.k === "champi") { rect(g, dx, dy, 1, 3, "#fff3dd"); rect(g, dx - 2, dy - 2, 5, 2, d.c % 2 ? "#e8584a" : "#b58cf0"); px(g, dx, dy - 3, d.c % 2 ? "#e8584a" : "#b58cf0"); px(g, dx - 1, dy - 2, "#ffffff"); px(g, dx + 1, dy - 1, "#ffffff"); rect(g, dx - 2, dy, 5, 1, "rgba(0,0,0,.25)"); }
      else if (d.k === "nenuphar") { ell(g, dx, dy, 4, 3, "#4fae5f"); px(g, dx + 1, dy, w1); px(g, dx + 2, dy, w1); px(g, dx + 1, dy + 1, w1); px(g, dx - 1, dy - 1, "#7fd88c"); px(g, dx - 2, dy - 1, "#7fd88c"); }
    });
    // rochers puis arbres (avec ombre portée), triés par rangée
    var rocks = [rockSprite(0.2), rockSprite(0.8)], trees = [treeSprite(C, 0.1), treeSprite(C, 0.5), treeSprite(C, 0.9)];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var kk = m.t[y][x], cx = x * TILE + 8, cy = y * TILE + 8;
      if (kk === 4) { g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(cx - 7, cy + 4, 15, 3); var rs = rocks[hash2(x, y) > 0.5 ? 1 : 0]; g.drawImage(rs, cx - rs.width / 2 | 0, cy - rs.height / 2 | 0); }
      else if (kk === 3) {
        var tv = trees[Math.floor(hash2(x + 5, y) * 3) % 3], jx = Math.floor((hash2(x, y) - 0.5) * 4), jy = Math.floor((hash2(y, x) - 0.5) * 4);
        g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(cx - 8 + jx, cy + 6 + jy, 17, 4);
        g.drawImage(tv, cx - tv.width / 2 + jx | 0, cy - tv.height / 2 + jy | 0);
      }
    }
    return c;
  }

  window.RC_ART = { squirrel: squirrel, mob: mob, item: item, shot: shot, chest: chest, stall: stall, terrain: terrain, silhouette: silhouette, TILE: TILE, shade: shade };
})();
