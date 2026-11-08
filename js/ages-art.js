/* =========================================================================
   Age of Defense — dessin : terrain peint (plateaux d'herbe bordés, route en contrebas),
   bâtiments à 5 formes, troupes, ennemis, projectiles, effets, décalcomanies de sang / brûlures.
   Tout est généré (aucune image). API : window.AGES_ART.
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.AGES_DATA, C = root.AGES_CORE, T = D.T, LINES = D.LINES, AGES = D.AGES;
  var PI = Math.PI, TAU = PI * 2;
  var OUT = "#24160b";

  // palette « matériaux » de chaque âge
  var PAL = [
    { base: "#a98458", dark: "#6a4a2a", hi: "#d9bc8c", metal: "#8a8478", glow: "#ffb347" },
    { base: "#9a9ca8", dark: "#5a5e6e", hi: "#cfd2de", metal: "#b8bcc8", glow: "#ffcf5a" },
    { base: "#7f8d5f", dark: "#48553a", hi: "#b4c28f", metal: "#9aa08c", glow: "#ffd25a" },
    { base: "#7f90a2", dark: "#3c4a5a", hi: "#bccbda", metal: "#a9b4c0", glow: "#7fd0ff" },
    { base: "#d3d8f2", dark: "#5b4fc9", hi: "#e9f0ff", metal: "#aab4ee", glow: "#58f0ff" },
  ];
  var TEAM = "#3d7fe0", TEAM_D = "#1f4c93", FOE = "#c4402c", FOE_D = "#6e1d12";

  /* ---------- petits outils ---------- */
  function hash(x, y, s) { var h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function circ(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 1.5; c.strokeStyle = stroke; c.stroke(); } }
  function rect(c, x, y, w, h, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); } if (stroke) { c.lineWidth = lw || 1.5; c.strokeStyle = stroke; c.strokeRect(x, y, w, h); } }
  function poly(c, pts, fill, stroke, lw) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 1.5; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); } }
  function line(c, x1, y1, x2, y2, col, lw) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 1.5; c.lineCap = "round"; c.stroke(); }
  function shadow(c, x, y, rx, ry, a) { c.save(); c.globalAlpha = a || 0.28; c.fillStyle = "#000"; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.restore(); }
  function rgb(a) { return "rgb(" + (a[0] | 0) + "," + (a[1] | 0) + "," + (a[2] | 0) + ")"; }

  /* ---------- terrain ---------- */
  function terrain(map) {
    var th = D.THEMES[map.theme], W = map.W, H = map.H, w = map.w, h = map.h, S = 2;
    var cw = w / S, ch = h / S, cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    var cx = cv.getContext("2d"), img = cx.createImageData(cw, ch), d = img.data;
    var tiles = map.tiles;
    function tt(tx, ty) { return (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 1 : (tiles[ty * W + tx] === 1 ? 1 : 0); }
    for (var py = 0; py < ch; py++) {
      for (var px = 0; px < cw; px++) {
        var wx = px * S, wy = py * S, tx = (wx / T) | 0, ty = (wy / T) | 0, road = tt(tx, ty) === 1;
        var lx = wx - tx * T, ly = wy - ty * T;
        // distance au bord de la zone (en pixels de monde) vers un voisin de type différent, avec bruit pour un bord irrégulier
        var dmin = 99, j = vnoise(wx / 9, wy / 9, 3) * 4 - 2;
        if (tt(tx - 1, ty) !== (road ? 1 : 0)) dmin = Math.min(dmin, lx + j);
        if (tt(tx + 1, ty) !== (road ? 1 : 0)) dmin = Math.min(dmin, T - 1 - lx + j);
        if (tt(tx, ty - 1) !== (road ? 1 : 0)) dmin = Math.min(dmin, ly + j);
        if (tt(tx, ty + 1) !== (road ? 1 : 0)) dmin = Math.min(dmin, T - 1 - ly + j);
        // coins
        if (dmin > 90) {
          var cs = [[-1, -1, lx, ly], [1, -1, T - 1 - lx, ly], [-1, 1, lx, T - 1 - ly], [1, 1, T - 1 - lx, T - 1 - ly]];
          for (var k = 0; k < 4; k++) if (tt(tx + cs[k][0], ty + cs[k][1]) !== (road ? 1 : 0)) dmin = Math.min(dmin, Math.sqrt(cs[k][2] * cs[k][2] + cs[k][3] * cs[k][3]) + j);
        }
        var n1 = vnoise(wx / 14, wy / 14, 1), n2 = vnoise(wx / 4, wy / 4, 2), n3 = hash(px, py, 5);
        var col;
        if (road) {
          var m = n1 * 0.6 + n2 * 0.4;
          col = [th.road[0] + (th.road2[0] - th.road[0]) * m, th.road[1] + (th.road2[1] - th.road[1]) * m, th.road[2] + (th.road2[2] - th.road[2]) * m];
          if (n3 > 0.93) { col[0] *= 0.84; col[1] *= 0.84; col[2] *= 0.84; } else if (n3 < 0.04) { col[0] *= 1.12; col[1] *= 1.12; col[2] *= 1.1; }
          if (dmin < 10) { var sh = 1 - (1 - dmin / 10) * 0.42; col[0] *= sh; col[1] *= sh; col[2] *= sh; }   // ombre de la falaise
        } else {
          var g = n1 * 0.55 + n2 * 0.45;
          col = [th.grass[0] + (th.grass2[0] - th.grass[0]) * g, th.grass[1] + (th.grass2[1] - th.grass[1]) * g, th.grass[2] + (th.grass2[2] - th.grass[2]) * g];
          if (n3 > 0.9) { col[0] *= 0.82; col[1] *= 0.86; col[2] *= 0.82; } else if (n3 < 0.05) { col[0] *= 1.14; col[1] *= 1.12; col[2] *= 1.1; }
          if (dmin < 2.6) { col = [th.rim[0], th.rim[1], th.rim[2]]; }
          else if (dmin < 4.4) { col = [th.rim[0] * 1.45 + 14, th.rim[1] * 1.4 + 10, th.rim[2] * 1.35 + 6]; }
          else if (dmin < 7) { var q = 0.9 + (dmin - 4.4) * 0.04; col[0] *= q; col[1] *= q; col[2] *= q; }
        }
        var o = (py * cw + px) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    var out = document.createElement("canvas"); out.width = w; out.height = h;
    var oc = out.getContext("2d"); oc.imageSmoothingEnabled = false; oc.drawImage(cv, 0, 0, w, h);
    // décor : touffes, fleurs, cailloux sur l'herbe ; obstacles sur les cases bloquées
    var rnd = C.rng32(map.W * 31 + map.H * 7 + map.theme.length);
    var gtufts = { prairie: "#3d6b2a", desert: "#8a7a3a", neige: "#a9bccb", volcan: "#3a2e30", canyon: "#6e5230" }[map.theme];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = tiles[y * W + x];
      if (t === 1) {
        for (var r = 0; r < 3; r++) if (rnd() < 0.5) { var rx = x * T + rnd() * T, ry = y * T + rnd() * T; circ(oc, rx, ry, 0.8 + rnd() * 1.4, "rgba(70,40,20,.35)"); }
        continue;
      }
      if (t === 2) { oc.save(); decorBlock(oc, map.theme, x * T + T / 2, y * T + T / 2, rnd); oc.restore(); continue; }
      var cnt = rnd() < 0.5 ? 2 : 1;
      for (var q2 = 0; q2 < cnt; q2++) {
        var ux = x * T + 4 + rnd() * (T - 8), uy = y * T + 5 + rnd() * (T - 8), kind = rnd();
        if (kind < 0.55) { line(oc, ux, uy, ux - 2, uy - 5, gtufts, 1.6); line(oc, ux, uy, ux + 1, uy - 6, gtufts, 1.6); line(oc, ux, uy, ux + 3, uy - 4, gtufts, 1.6); }
        else if (kind < 0.8 && map.theme === "prairie") { circ(oc, ux, uy, 1.6, rnd() < 0.5 ? "#f6f1d0" : "#f3d34f"); }
        else if (kind < 0.9) { circ(oc, ux, uy, 2.4, "rgba(40,30,20,.45)"); circ(oc, ux - 0.5, uy - 1, 2, "#9a968a"); }
      }
    }
    return out;
  }
  function decorBlock(c, theme, x, y, rnd) {
    var a = rnd() * 0.5;
    shadow(c, x + 3, y + 9, 12, 5, 0.3);
    if (theme === "prairie") {
      circ(c, x, y - 2, 13, "#2f5d25", OUT, 1.5); circ(c, x - 4, y - 6, 8, "#3f7a30"); circ(c, x + 4, y - 3, 6, "#468a35"); circ(c, x - 5, y - 8, 3, "#6bb04a");
      rect(c, x - 2, y + 8, 4, 5, "#5b3b1f");
    } else if (theme === "desert") {
      rect(c, x - 3, y - 11, 6, 22, "#4f8a3a", OUT, 1.5); rect(c, x - 10, y - 4, 4, 9, "#4f8a3a", OUT, 1.5); rect(c, x - 10, y + 2, 8, 3, "#4f8a3a", OUT, 1); rect(c, x + 6, y - 7, 4, 9, "#4f8a3a", OUT, 1.5); rect(c, x + 2, y - 1, 8, 3, "#4f8a3a", OUT, 1);
    } else if (theme === "neige") {
      poly(c, [x, y - 15, x - 11, y + 4, x + 11, y + 4], "#2d6b4a", OUT, 1.5); poly(c, [x, y - 8, x - 13, y + 11, x + 13, y + 11], "#3a8160", OUT, 1.5); poly(c, [x, y - 15, x - 5, y - 8, x + 5, y - 8], "#f4f8ff");
    } else {
      poly(c, [x - 12, y + 6, x - 9, y - 6, x - 1, y - 11, x + 8, y - 7, x + 12, y + 5, x + 2, y + 10], theme === "volcan" ? "#4a3c3c" : "#8a6a44", OUT, 1.5);
      poly(c, [x - 8, y - 3, x - 1, y - 9, x + 5, y - 5, x, y], theme === "volcan" ? "#6a5a58" : "#b08a5c");
      if (theme === "volcan" && a > 0.25) circ(c, x + 4, y + 2, 2.2, "#ff6a2a");
    }
  }

  /* ---------- icônes d'interface : on dessine la forme du bâtiment dans un petit canvas ---------- */
  var iconCache = {};
  function icon(line, age, size) {
    var key = line + ":" + age + ":" + size;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement("canvas"); cv.width = cv.height = size * 2; var c = cv.getContext("2d");
    var L = LINES[line], sc = size * 2 / (L.size === 2 ? 66 : 38);
    c.scale(sc, sc); c.translate((L.size === 2 ? 66 : 38) / 2, (L.size === 2 ? 66 : 38) / 2);
    drawBuilding(c, { line: line, x: 0, y: 0, lvl: 1, ang: -0.9, size: L.size || 1, t: 0.4, firing: 0, rally: null, flag: 0, life: 1 }, age, 0, { icon: true });
    return (iconCache[key] = cv.toDataURL());
  }

  /* ---------- bâtiments ---------- */
  function drawBuilding(c, b, age, t, o) {
    var L = LINES[b.line], P = PAL[age], k = L.kind, x = b.x, y = b.y;
    c.save(); c.translate(x, y);
    var s2 = (L.size || 1) === 2, hs = s2 ? 28 : 13;
    if (k === "mine") { drawMine(c, P, age, b); c.restore(); return; }
    if (k === "pit") { drawPit(c, P, age, b, t); c.restore(); return; }
    if (k === "ramp") { drawRamp(c, P, age, b); c.restore(); return; }
    // socle
    shadow(c, 2, hs - 2, hs, hs * 0.35, 0.3);
    var sock = age === 4 ? P.dark : P.dark;
    if (k === "barracks" || k === "garrison" || k === "airfield" || k === "heli") { /* socle propre */ }
    else if (age >= 3) { rect(c, -hs, -hs, hs * 2, hs * 2, P.metal, OUT, 1.6); rect(c, -hs + 3, -hs + 3, hs * 2 - 6, hs * 2 - 6, P.base); }
    else if (age === 2) { rect(c, -hs, -hs, hs * 2, hs * 2, "#8d8d80", OUT, 1.6); rect(c, -hs + 3, -hs + 3, hs * 2 - 6, hs * 2 - 6, "#a5a597"); }
    else { circ(c, 0, 0, hs, age === 1 ? "#8f8f98" : "#9a7b54", OUT, 1.6); circ(c, 0, 0, hs - 3, age === 1 ? "#b2b2bc" : "#b9966a"); }
    var a = b.ang, rec = b.firing > 0 ? 2.2 : 0;
    switch (k) {
      case "shoot": case "mortar": drawTurret(c, b.line, P, age, a, rec, t); break;
      case "pulse": drawFire(c, P, age, a, b, t); break;
      case "chain": drawShock(c, P, age, a, b, t); break;
      case "banner": drawBanner(c, P, age, t); break;
      case "barracks": drawBarracks(c, b, P, age, t); break;
      case "garrison": drawGarrison(c, P, age, a); break;
      case "airfield": drawAirfield(c, P, age, t); break;
      case "heli": drawHeliport(c, P, age, t); break;
    }
    if (b.buff && (b.buff.r || b.buff.d)) { c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); circ(c, hs - 4, -hs + 4, 3, "#ffe36a", OUT, 1); c.globalAlpha = 1; }
    if (!o || !o.icon) for (var i = 0; i < (b.lvl || 1) - 1; i++) circ(c, -hs + 5 + i * 7, hs - 3, 2.8, "#ffd447", OUT, 1);
    if (b.flag === 1 && (!o || !o.icon)) { c.font = "bold 11px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ff5a3a"; c.strokeStyle = "#000"; c.lineWidth = 3; c.strokeText("⚠", 0, -hs - 4); c.fillText("⚠", 0, -hs - 4); }
    c.restore();
  }
  function barrel(c, len, w, col, rec) { c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 1.4; c.fillRect(2 - rec, -w / 2, len, w); c.strokeRect(2 - rec, -w / 2, len, w); }
  function drawTurret(c, id, P, age, a, rec, t) {
    c.save(); c.rotate(a);
    switch (id) {
      case "tour":
        if (age === 0) { line(c, -4, -5, 8, 0, "#6a4a2a", 2); line(c, -4, 5, 8, 0, "#6a4a2a", 2); circ(c, 8 - rec, 0, 3.2, "#8f8f88", OUT, 1.2); }
        else if (age === 1) { rect(c, -3, -6, 5, 12, "#7a5a36", OUT, 1.4); line(c, -2, 0, 13 - rec, 0, "#4a3220", 2); poly(c, [13 - rec, 0, 9 - rec, -2.5, 9 - rec, 2.5], "#d0d4de", OUT, 1); }
        else if (age === 2) { barrel(c, 15, 4, "#40463a", rec); circ(c, 0, 0, 7, P.base, OUT, 1.6); circ(c, -1, -1, 3, P.hi); }
        else if (age === 3) { barrel(c, 11, 3, "#2f3a46", rec); barrel(c, 11, 3, "#2f3a46", rec); c.translate(0, 0); circ(c, 0, 0, 7.5, P.base, OUT, 1.6); line(c, 2, -3, 14 - rec, -3, "#222c36", 2.4); line(c, 2, 3, 14 - rec, 3, "#222c36", 2.4); }
        else { circ(c, 0, 0, 7.5, P.hi, OUT, 1.6); rect(c, 2 - rec, -2.5, 15, 5, P.dark, OUT, 1.4); circ(c, 14 - rec, 0, 2.2, P.glow); }
        break;
      case "sniper":
        circ(c, 0, 0, 6.5, P.base, OUT, 1.6);
        rect(c, 2 - rec, -1.6, 20 + age, 3.2, age >= 3 ? "#2a3038" : age === 4 ? P.dark : "#5a4228", OUT, 1.2);
        rect(c, -2, -6, 7, 3, age === 4 ? P.glow : "#222", OUT, 1); if (age === 4) { rect(c, 6, -2.6, 14, 1.4, P.glow); }
        break;
      case "mortar":
        c.rotate(-a); c.rotate(-PI / 2 + Math.sin(t * 2) * 0.02);
        if (age === 0) { rect(c, -9, -4, 18, 9, "#7a5a36", OUT, 1.5); circ(c, 0, -2, 7, "#8f8f88", OUT, 1.4); circ(c, 0, -2, 4, "#5a5a54"); }
        else if (age === 1) { rect(c, -10, 0, 20, 5, "#6a4a2a", OUT, 1.5); line(c, -6, 1, 8, -14 + rec, "#8a5a2a", 3); circ(c, 9, -14 + rec, 4.5, "#9a9a92", OUT, 1.2); }
        else { rect(c, -5.5 - rec / 2, -13 + rec, 11, 15, age === 4 ? P.hi : "#4a5240", OUT, 1.5); circ(c, 0, -13 + rec, 5.5, "#14181c", OUT, 1.2); if (age === 4) circ(c, 0, -13 + rec, 3, P.glow); rect(c, -8, 1, 16, 5, P.dark, OUT, 1.2); }
        break;
      case "aa":
        circ(c, 0, 0, 6.5, P.base, OUT, 1.6);
        if (age === 0) { line(c, -5, -5, 9 - rec, 0, "#6a4a2a", 2.2); line(c, -5, 5, 9 - rec, 0, "#6a4a2a", 2.2); circ(c, 9 - rec, 0, 3.6, "#8f8f88", OUT, 1.2); }
        else if (age === 1) { rect(c, -2, -7, 18 - rec, 3.4, "#6a4a2a", OUT, 1.2); rect(c, -2, 3.6, 18 - rec, 3.4, "#6a4a2a", OUT, 1.2); poly(c, [18 - rec, -5.3, 14 - rec, -7.5, 14 - rec, -3], "#d8dce6", OUT, 1); }
        else if (age <= 3) { barrel(c, 14, 3, "#2f3a2a", rec); barrel(c, 14, 3, "#2f3a2a", rec); c.fillStyle = "#2f3a2a"; rect(c, 1, -6, 14 - rec, 3, "#2f3a2a", OUT, 1.2); rect(c, 1, 3, 14 - rec, 3, "#2f3a2a", OUT, 1.2); if (age === 3) { poly(c, [16, -4.5, 11, -7, 11, -2], "#c9d2dc", OUT, 1); poly(c, [16, 4.5, 11, 7, 11, 2], "#c9d2dc", OUT, 1); } }
        else { circ(c, 8, 0, 4, P.glow, OUT, 1.2); rect(c, 0, -2, 10, 4, P.dark, OUT, 1.2); }
        break;
      case "glue":
        c.rotate(-a); circ(c, 0, 0, 8, age === 4 ? "#7fe58a" : age >= 2 ? "#6fcf6a" : "#2a2420", OUT, 1.6);
        circ(c, -2, -2, 4, age >= 2 ? "#b7f5ac" : "#4a4038"); circ(c, 3, 2, 2.6, age >= 2 ? "#d9ffd0" : "#3a302a");
        if (age >= 1) rect(c, -3, -11 + Math.sin(t * 4), 6, 4, P.dark, OUT, 1);
        break;
      case "freeze":
        c.rotate(-a); circ(c, 0, 0, 7, "#cfeaff", OUT, 1.5);
        for (var i = 0; i < 6; i++) { c.save(); c.rotate(i * PI / 3 + (age >= 3 ? t * 0.8 : 0)); poly(c, [0, -3, 3, -11, -3, -11], age === 4 ? "#a4f2ff" : "#eaf6ff", "#3b6a96", 1); c.restore(); }
        circ(c, 0, 0, 3, age >= 3 ? "#5ad0ff" : "#fff", "#3b6a96", 1);
        break;
    }
    c.restore();
  }
  function drawFire(c, P, age, a, b, t) {
    var on = b.firing > 0;
    c.save();
    if (age === 0) { rect(c, -8, -3, 16, 8, "#5a3a22", OUT, 1.5); circ(c, 0, -2, 7, "#ff9a2a", OUT, 1.2); circ(c, 0, -3, 4, "#ffe36a"); }
    else if (age === 1) { circ(c, 0, 0, 9, "#3c3c42", OUT, 1.6); circ(c, 0, 0, 6, "#7a4a1a"); circ(c, 0, 0, 3.5, "#ff9a2a"); }
    else { c.rotate(a); rect(c, -6, -6, 10, 12, P.dark, OUT, 1.4); rect(c, 3, -2.2, 12, 4.4, "#2a2a2e", OUT, 1.2); circ(c, 16, 0, 1.8, age === 4 ? "#6be6ff" : "#ff9a2a"); }
    c.restore();
    if (on) {
      c.save(); c.rotate(a); c.globalCompositeOperation = "lighter";
      for (var i = 0; i < 7; i++) { var d = 14 + i * 7 + Math.random() * 4; circ(c, d * (age >= 2 ? 1 : 0.5), (Math.random() - 0.5) * (4 + i * 1.5), 3.5 + i * 0.7, age === 4 ? "rgba(90,210,255,.6)" : "rgba(255," + (150 + i * 12) + ",40,.55)"); }
      c.restore();
    }
  }
  function drawShock(c, P, age, a, b, t) {
    c.save();
    if (age === 0) { rect(c, -3, -10, 6, 20, "#6a4a2a", OUT, 1.5); circ(c, 0, -10, 5, "#8f8f88", OUT, 1.3); circ(c, 0, -10, 2.4, "#ffe84a"); }
    else if (age === 1) { rect(c, -4, -2, 8, 10, "#6a4a2a", OUT, 1.4); circ(c, 0, -4, 7, "#b9b9c4", OUT, 1.4); for (var i = 0; i < 3; i++) line(c, 0, -4, Math.cos(t * 5 + i * 2.1) * 9, -4 + Math.sin(t * 5 + i * 2.1) * 9, "#ffe84a", 1.4); }
    else if (age === 2) { circ(c, 0, 0, 8, "#4a5560", OUT, 1.5); circ(c, 0, 0, 4.5, "#ffe84a"); line(c, -8, 0, 8, 0, "#2a2f34", 2); line(c, 0, -8, 0, 8, "#2a2f34", 2); }
    else { c.rotate(t * (age === 4 ? 1.5 : 0.6)); for (var j = 0; j < 4; j++) { c.rotate(PI / 2); rect(c, 3, -2, 8, 4, age === 4 ? P.hi : "#4a5a6a", OUT, 1.2); circ(c, 12, 0, 2, age === 4 ? "#6be6ff" : "#ffe84a"); } circ(c, 0, 0, 4.5, age === 4 ? P.glow : "#ffe84a", OUT, 1.2); }
    c.restore();
    if (b.firing > 0) { c.save(); c.globalCompositeOperation = "lighter"; circ(c, 0, 0, 16, "rgba(255,240,120,.35)"); c.restore(); }
  }
  function drawBanner(c, P, age, t) {
    var w = Math.sin(t * 3) * 2.5;
    rect(c, -1.6, -17, 3.2, 28, age === 4 ? P.hi : "#6a4a2a", OUT, 1.2);
    var col = age === 0 ? "#b6482c" : age === 1 ? "#c9302c" : age === 2 ? "#4f7a3a" : age === 3 ? "#2e5fa8" : "#7a5cff";
    c.beginPath(); c.moveTo(1.6, -16); c.quadraticCurveTo(10, -18 + w, 18, -13 + w); c.lineTo(18, -3 + w); c.quadraticCurveTo(10, -6 + w, 1.6, -4); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    circ(c, 9, -9.5 + w * 0.6, 2.6, "#ffe36a"); if (age >= 3) { line(c, 4, -14, 15, -14 + w, P.glow, 1.2); }
    circ(c, 0, -17, 2.4, "#ffd447", OUT, 1);
  }
  function drawRamp(c, P, age, b) {
    var a = b.ang; c.rotate(a);
    var col = age === 0 ? "#9a7a4a" : age === 1 ? "#8a5f33" : age === 2 ? "#9a9a8c" : age === 3 ? "#b0b4b8" : "#8fd0ee";
    poly(c, [-14, -13, 14, -16, 14, 16, -14, 13], col, OUT, 1.6);
    for (var i = -2; i <= 3; i++) line(c, -14 + (i + 2) * 5.6, -14, -14 + (i + 2) * 5.6, 14, "rgba(0,0,0,.25)", 1.2);
    poly(c, [8, -6, 15, 0, 8, 6], "rgba(255,255,255,.55)");
  }
  function drawMine(c, P, age, b) {
    if (age === 0) { for (var i = 0; i < 5; i++) { var a = i * 1.26; poly(c, [Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 9, Math.cos(a - 0.5) * 9, Math.sin(a - 0.5) * 9], "#d9c9a0", OUT, 1); } circ(c, 0, 0, 3, "#6a4a2a"); }
    else if (age === 1) { circ(c, 0, 0, 8, "#4a4038", OUT, 1.5); circ(c, 0, 0, 4, "#8a7a6a"); line(c, 0, -8, 3, -12, "#ffb347", 1.5); }
    else if (age === 2) { circ(c, 0, 0, 8, "#4a5240", OUT, 1.5); circ(c, 0, 0, 3.5, "#2a2f26", OUT, 1); circ(c, 0, 0, 1.6, "#ff4a3a"); }
    else if (age === 3) { circ(c, 0, 0, 8.5, "#39434d", OUT, 1.5); circ(c, 0, 0, 5, "#6f7d89"); circ(c, 0, 0, 2, "#ff3b3b"); }
    else { circ(c, 0, 0, 8.5, "#2b2457", OUT, 1.5); circ(c, 0, 0, 5, "#7a5cff"); circ(c, 0, 0, 2.2, "#58f0ff"); }
  }
  function drawPit(c, P, age, b, t) {
    var life = Math.max(0.15, b.life);
    c.globalAlpha = 0.55 + 0.45 * life;
    var inner = age === 3 ? "#1a2a14" : age === 2 ? "#3a2a1a" : age === 4 ? "#0a0716" : "#2a1c10";
    c.beginPath(); c.ellipse(0, 0, 17, 14, 0, 0, TAU); c.fillStyle = age === 1 ? "#14100a" : inner; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    if (age === 3) circ(c, 0, 0, 10, "rgba(110,200,60,.35)");
    if (age === 4) { c.save(); c.globalCompositeOperation = "lighter"; circ(c, 0, 0, 12 + Math.sin(t * 4) * 1.5, "rgba(122,92,255,.45)"); c.restore(); }
    if (age === 0) for (var i = 0; i < 7; i++) { var a = i * 0.9; poly(c, [Math.cos(a) * 9 - 1.5, Math.sin(a) * 7, Math.cos(a) * 9 + 1.5, Math.sin(a) * 7, Math.cos(a) * 9, Math.sin(a) * 7 - 7], "#e0cfa0", OUT, 1); }
    if (age === 1) { circ(c, -3, -2, 6, "rgba(255,150,40,.35)"); }
    c.globalAlpha = 1;
  }
  function drawBarracks(c, b, P, age, t) {
    var hs = 27;
    shadow(c, 2, hs - 2, hs, 8, 0.3);
    var lance = b.line === "lancers";
    if (age === 0) { poly(c, [-24, 20, 0, -22, 24, 20], "#a88255", OUT, 1.8); poly(c, [-8, 20, 0, 0, 8, 20], "#3a2a18"); line(c, 0, -22, 0, -28, "#6a4a2a", 2.4); poly(c, [0, -28, 10, -25, 0, -22], lance ? "#e0a030" : "#b6482c", OUT, 1); for (var i = 0; i < 3; i++) circ(c, -14 + i * 14, 21, 2.2, "#e4d8b8", OUT, 1); }
    else if (age === 1) { rect(c, -25, -14, 50, 36, "#a2a6b4", OUT, 1.8); poly(c, [-27, -14, 0, -30, 27, -14], "#8a3a2a", OUT, 1.8); rect(c, -6, 4, 12, 18, "#4a3220", OUT, 1.4); for (var j = 0; j < 4; j++) rect(c, -25 + j * 14, -18, 8, 5, "#8a8e9c", OUT, 1); poly(c, [20, -28, 30, -26, 20, -22], lance ? "#e0a030" : "#2e5fa8", OUT, 1); line(c, 20, -30, 20, -14, "#6a4a2a", 1.8); }
    else if (age === 2) { rect(c, -26, -18, 52, 40, "#8a9470", OUT, 1.8); rect(c, -26, -18, 52, 8, "#6a7456"); rect(c, -9, 6, 18, 16, "#3a3f30", OUT, 1.4); for (var j2 = 0; j2 < 3; j2++) rect(c, -20 + j2 * 14, -6, 8, 7, "#c9e3f0", OUT, 1); circ(c, 18, 17, 3.5, "#6a6a5a", OUT, 1); circ(c, -18, 17, 3.5, "#6a6a5a", OUT, 1); }
    else if (age === 3) { rect(c, -27, -20, 54, 42, "#707d8a", OUT, 1.8); rect(c, -27, -20, 54, 9, "#4a5560"); rect(c, -14, 2, 28, 20, "#2f3a46", OUT, 1.4); line(c, -14, 12, 14, 12, "#ffcf5a", 1.4); circ(c, -20, -15, 2, "#ff4a3a"); rect(c, 12, -10, 10, 8, "#c9d2dc", OUT, 1); }
    else { poly(c, [-27, 20, -27, -8, -14, -22, 14, -22, 27, -8, 27, 20], "#cfd6f2", OUT, 1.8); rect(c, -14, 2, 28, 18, "#2b2457", OUT, 1.4); line(c, -12, 11, 12, 11, "#58f0ff", 2); circ(c, 0, -10, 5, "#7a5cff", OUT, 1.4); circ(c, 0, -10, 2.2, "#58f0ff"); }
    // lanterne rallye
    if (b.flag === 1) { }
  }
  function drawGarrison(c, P, age, a) {
    // petit poste : sacs de sable / palissade
    if (age === 0) { for (var i = 0; i < 6; i++) { var an = i * 1.05; rect(c, Math.cos(an) * 9 - 2, Math.sin(an) * 9 - 5, 4, 10, "#8a6a3a", OUT, 1); } circ(c, 0, 0, 5, "#5a3a22", OUT, 1); }
    else if (age === 1) { rect(c, -9, -9, 18, 18, "#9a9ca8", OUT, 1.6); for (var j = 0; j < 4; j++) rect(c, -9 + j * 5, -12, 3.5, 4, "#8a8e9c", OUT, 1); circ(c, 0, 0, 3.5, "#6a4a2a"); }
    else if (age === 2) { rect(c, -10, -9, 20, 18, "#b4aa84", OUT, 1.6); for (var k = 0; k < 4; k++) circ(c, -7.5 + k * 5, -7, 2.6, "#cdc39a", OUT, 0.8); rect(c, -3, -1, 6, 8, "#4a5a3a", OUT, 1); }
    else if (age === 3) { rect(c, -10, -9, 20, 18, "#7c8794", OUT, 1.6); rect(c, -6, -5, 12, 10, "#3a4552", OUT, 1); rect(c, -3, -2, 6, 4, "#9bd0ee", OUT, 0.8); }
    else { circ(c, 0, 0, 10, "#d3d8f2", OUT, 1.6); circ(c, 0, 0, 6, "#5b4fc9", OUT, 1); circ(c, 0, 0, 2.6, "#58f0ff"); }
  }
  function drawAirfield(c, P, age, t) {
    var hs = 27;
    rect(c, -hs, -hs, hs * 2, hs * 2, age >= 2 ? "#6a6c6e" : age === 1 ? "#8a7a5a" : "#9a7b54", OUT, 1.8);
    if (age >= 2) { for (var i = -2; i <= 2; i++) rect(c, i * 10 - 1.5, -22, 3, 12, "rgba(255,255,255,.7)"); rect(c, -hs, hs - 6, hs * 2, 6, "#444"); }
    else { circ(c, 0, 0, 16, "rgba(0,0,0,.18)"); circ(c, 0, 0, 10, "rgba(255,255,255,.12)"); }
    var wing = age === 0 ? "#6a8f3a" : age === 1 ? "#b88a3a" : age === 2 ? "#6f8a4a" : age === 3 ? "#7f90a2" : "#d3d8f2";
    poly(c, [0, -18, 4, -6, 18, 2, 18, 6, 4, 4, 2, 14, 7, 17, -7, 17, -2, 14, -4, 4, -18, 6, -18, 2, -4, -6], wing, OUT, 1.4);
  }
  function drawHeliport(c, P, age, t) {
    var hs = 27;
    rect(c, -hs, -hs, hs * 2, hs * 2, age >= 3 ? "#58606a" : age === 2 ? "#6a6c6e" : "#8a7a5a", OUT, 1.8);
    circ(c, 0, 0, 20, null, "rgba(255,255,255,.75)", 2.4);
    c.font = "bold 22px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(255,255,255,.8)"; c.fillText("H", 0, 1);
  }

  /* ---------- troupes ---------- */
  function drawUnit(c, u, age, t) {
    var P = PAL[age], k = u.kind, hpf = u.hpmax ? u.hp / u.hpmax : 1;
    c.save(); c.translate(u.x, u.y); c.scale(1.35, 1.35);
    if (k === "plane") { drawPlane(c, u, age, t); c.restore(); return; }
    if (k === "heli") { drawHeli(c, u, age, t); c.restore(); return; }
    shadow(c, 0, 4, 6, 2.6, 0.3);
    c.rotate(u.ang);
    var atk = u.atkT > 0 ? 3 : 0, big = (k === "def" && age >= 3);
    if (k === "def" && u.line === "barracks" && age === 3) { // tank
      rect(c, -9, -7, 18, 14, "#4f5d3f", OUT, 1.5); rect(c, -10, -9, 20, 3, "#2a2f26"); rect(c, -10, 6, 20, 3, "#2a2f26");
      circ(c, -1, 0, 5, "#66794f", OUT, 1.4); circ(c, -1, 0, 3, "#d2762c", OUT, 1); poly(c, [-3, -2, -2, -5, 0, -2], "#d2762c", OUT, 0.8); poly(c, [-3, 2, -2, 5, 0, 2], "#d2762c", OUT, 0.8); rect(c, 3 - atk, -1.4, 12, 2.8, "#2a2f26", OUT, 1);
    } else if (k === "def" && u.line === "barracks" && age === 4) { // méca
      rect(c, -7, -8, 14, 16, "#cfd6f2", OUT, 1.5); circ(c, 0, 0, 5, "#d2762c", OUT, 1.3); poly(c, [-2, -3, -1, -6.5, 1, -3], "#d2762c", OUT, 0.8); poly(c, [-2, 3, -1, 6.5, 1, 3], "#d2762c", OUT, 0.8); circ(c, 1.5, 0, 2.2, "#58f0ff");
      rect(c, 4 - atk, -7, 10, 3, "#5b4fc9", OUT, 1); rect(c, 4 - atk, 4, 10, 3, "#5b4fc9", OUT, 1);
    } else {
      var fur = u.line === "lancers" ? "#8a8f98" : k === "arch" ? "#b9b2a6" : "#d2762c", belly = "#f2d9b0";
      // queue en panache derrière le corps
      c.beginPath(); c.ellipse(-8, 0, 7.5, 4.6, Math.sin(t * 4 + u.id) * 0.25, 0, TAU); c.fillStyle = fur; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
      c.beginPath(); c.ellipse(-9, 0, 4, 2, 0, 0, TAU); c.fillStyle = belly; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
      circ(c, 0, 0, 5.8, fur, OUT, 1.4); circ(c, -0.5, 0, 3, belly);
      circ(c, 4, 0, 3.8, fur, OUT, 1.2);
      poly(c, [3, -3.4, 5.5, -7, 6.2, -2.6], fur, OUT, 1); poly(c, [3, 3.4, 5.5, 7, 6.2, 2.6], fur, OUT, 1);
      circ(c, 5.6, -1.4, 0.9, "#111"); circ(c, 5.6, 1.4, 0.9, "#111"); circ(c, 7.4, 0, 0.8, "#4a2a1a");
      // casque / coiffe selon l'âge
      if (age === 0) { line(c, 2, -3.5, 2, 3.5, "#6a4a2a", 2); poly(c, [1, -3, 2, -6, 3, -3], "#e8d8b0", OUT, 0.8); }
      else if (age === 1) { circ(c, 3.4, 0, 3.2, "#aeb2c2", OUT, 1); line(c, 3.4, -3.2, 3.4, 3.2, "#6a6e7e", 1); }
      else if (age === 2) { circ(c, 3.4, 0, 3.2, "#566a3e", OUT, 1); }
      else if (age === 3) { circ(c, 3.4, 0, 3.2, "#3a4552", OUT, 1); rect(c, 4.6, -1.6, 2.4, 3.2, "#9bd0ee"); }
      else { circ(c, 3.4, 0, 3.2, "#d3d8f2", OUT, 1); rect(c, 4.6, -1.6, 2.6, 3.2, "#58f0ff"); }
      // arme
      if (u.line === "lancers") { line(c, 2, 5, 17 - atk + (age >= 2 ? 3 : 0), 5, age >= 2 ? "#4a4a50" : "#6a4a2a", 1.6); poly(c, [17 - atk, 5, 14 - atk, 3.4, 14 - atk, 6.6], age === 4 ? "#58f0ff" : "#d8dce6", OUT, 0.8); }
      else if (k === "arch") { if (age === 0) { line(c, 3, -2, 8, -2, "#6a4a2a", 1.6); circ(c, 9, -2, 1.6, "#8f8f88"); } else if (age === 1) { c.beginPath(); c.arc(7, 0, 5, -1.2, 1.2); c.strokeStyle = "#6a4a2a"; c.lineWidth = 1.6; c.stroke(); } else { rect(c, 2 - atk, 2, 10, 2.4, age === 4 ? "#58f0ff" : "#2a2f26", OUT, 0.8); } }
      else { if (age === 0) { rect(c, 3 - atk, 2, 9, 3, "#7a5a36", OUT, 1); circ(c, 12 - atk, 3.5, 2.6, "#8f8f88", OUT, 1); } else if (age === 1) { line(c, 3 - atk, 5, 13 - atk, 5, "#d8dce6", 2); circ(c, -1, -6, 3.8, "#2e5fa8", OUT, 1); } else { rect(c, 3 - atk, 2, 10, 2.4, age === 4 ? "#58f0ff" : "#2a2f26", OUT, 0.8); } }
    }
    c.rotate(-u.ang);
    if (k === "def" && hpf < 0.995) { rect(c, -8, -13, 16, 3, "#222"); rect(c, -8, -13, 16 * Math.max(0, hpf), 3, hpf > 0.5 ? "#6bd24a" : "#e8a02a"); }
    if (u.flash > 0) { c.globalAlpha = 0.5; circ(c, 0, 0, 8, "#fff"); }
    c.restore();
  }
  function drawPlane(c, u, age, t) {
    var h = 6 + Math.sin(t * 3 + u.id) * 1;
    shadow(c, 8, 12, 8, 3, 0.22);
    c.translate(0, -h); c.rotate(u.ang);
    if (age === 0) { poly(c, [10, 0, 4, 2, -10, 12, -4, 0, -10, -12, 4, -2], "#7a9a3a", OUT, 1.3); circ(c, 9, 0, 2.5, "#e8bf94", OUT, 1); line(c, -4, 0, -12, 0, "#7a9a3a", 2); }
    else if (age === 1) { poly(c, [11, 0, 5, 3, -3, 14, -1, 2, -9, 3, -9, -3, -1, -2, -3, -14, 5, -3], "#c8963a", OUT, 1.3); circ(c, 10, 0, 2.6, "#f0d890", OUT, 1); }
    else if (age === 2) { rect(c, -8, -2, 18, 4, "#7f8d5f", OUT, 1.3); rect(c, 0, -13, 5, 26, "#6f7d4f", OUT, 1.3); rect(c, -9, -6, 3, 12, "#6f7d4f", OUT, 1.2); circ(c, 11, 0, 2, "#222"); c.save(); c.translate(11, 0); c.rotate(t * 30); line(c, 0, -5, 0, 5, "rgba(40,40,40,.6)", 1.6); c.restore(); }
    else if (age === 3) { poly(c, [13, 0, 4, 3, -2, 14, -5, 14, -3, 3, -9, 3, -11, 8, -13, 8, -12, 0, -13, -8, -11, -8, -9, -3, -3, -3, -5, -14, -2, -14, 4, -3], "#8a9aaa", OUT, 1.2); circ(c, 7, 0, 2, "#9bd0ee"); }
    else { circ(c, 0, 0, 11, "#cfd6f2", OUT, 1.4); circ(c, 0, 0, 6, "#5b4fc9", OUT, 1.2); circ(c, 0, 0, 2.5, "#58f0ff"); }
  }
  function drawHeli(c, u, age, t) {
    var h = 10 + Math.sin(u.orb) * 1.5; shadow(c, 0, 12, 10, 4, 0.25);
    c.translate(0, -h); c.rotate(u.ang);
    if (age === 0) { c.rotate(0); poly(c, [-3, -3, -14, -14, -10, -4, -9, 0, -10, 4, -14, 14, -3, 3, 8, 2, 12, 0, 8, -2], "#6a4a2a", OUT, 1.2); circ(c, 11, 0, 3, "#e8d8b0", OUT, 1); poly(c, [13, 0, 17, -1, 17, 1], "#e8a02a", OUT, 0.8); }
    else if (age === 1) { circ(c, 0, 0, 11, "#b8402a", OUT, 1.4); for (var i = 0; i < 6; i++) { c.save(); c.rotate(i * PI / 3); rect(c, 0, -1.2, 11, 2.4, i % 2 ? "#f0d890" : "#b8402a"); c.restore(); } rect(c, -3, -3, 6, 6, "#6a4a2a", OUT, 1); }
    else {
      var body = age === 2 ? "#5a6a48" : age === 3 ? "#39434d" : "#cfd6f2";
      if (age < 4) { rect(c, -12, -1.4, 10, 2.8, body, OUT, 1); circ(c, 0, 0, 7, body, OUT, 1.4); circ(c, 4, 0, 3, age === 3 ? "#ffcf5a" : "#9bd0ee", OUT, 1); rect(c, 3, -6, 8, 2, "#2a2f26", OUT, 0.8); rect(c, 3, 4, 8, 2, "#2a2f26", OUT, 0.8); }
      else { circ(c, 0, 0, 8, body, OUT, 1.4); circ(c, 0, 0, 3.4, "#58f0ff"); for (var q = 0; q < 4; q++) { var an = q * PI / 2 + PI / 4; line(c, 0, 0, Math.cos(an) * 12, Math.sin(an) * 12, "#5b4fc9", 2); circ(c, Math.cos(an) * 12, Math.sin(an) * 12, 3, "rgba(255,255,255,.4)", OUT, 0.8); } }
    }
    if (age >= 2 && age < 4) { c.rotate(-u.ang); c.save(); c.rotate(t * 40); c.globalAlpha = 0.55; line(c, -14, 0, 14, 0, "#222", 1.6); line(c, 0, -14, 0, 14, "#222", 1.6); c.restore(); circ(c, 0, 0, 2, "#222"); }
  }

  /* ---------- ennemis ---------- */
  function drawEnemy(c, e, t) {
    var E = D.ENEMIES[e.type], r = E.r, hpf = e.hpmax ? e.hp / e.hpmax : 1;
    c.save(); c.translate(e.x, e.y); c.scale(1.22, 1.22);
    if (E.air) { shadow(c, 6, 14, r * 0.9, r * 0.35, 0.22); c.translate(0, -9); } else shadow(c, 0, r * 0.55, r * 0.9, r * 0.38, 0.3);
    var walk = Math.sin(t * 9 + e.id) * 1.2;
    c.rotate(e.a);
    var fl = e.hit > 0, base = fl ? "#fff" : FOE;
    switch (e.type) {
      case "grunt": // limace
        c.beginPath(); c.ellipse(-1, 0, 9, 5.2 + walk * 0.12, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#9aa84a"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
        c.beginPath(); c.ellipse(-3, 0, 5, 3, 0, 0, TAU); c.fillStyle = "rgba(255,255,200,.35)"; c.fill();
        line(c, 7, -2, 11, -4, "#6a7a2a", 1.4); line(c, 7, 2, 11, 4, "#6a7a2a", 1.4); circ(c, 11, -4, 1.3, "#111"); circ(c, 11, 4, 1.3, "#111"); break;
      case "runner": // lapin
        c.beginPath(); c.ellipse(-3, 0, 7, 4.6, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#cfc6b8"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
        circ(c, 4, 0, 3.8, fl ? "#fff" : "#d8cfc2", OUT, 1.2); circ(c, -9, walk * 0.4, 2.6, "#fff", OUT, 1);
        poly(c, [2, -2.5, -4, -6, 2, -4.4], "#e8dfd2", OUT, 1); poly(c, [2, 2.5, -4, 6, 2, 4.4], "#e8dfd2", OUT, 1); circ(c, 5.4, -1.4, 0.9, "#c0302a"); circ(c, 5.4, 1.4, 0.9, "#c0302a"); break;
      case "brute": // blaireau
        c.beginPath(); c.ellipse(-1, 0, 13, 9.5, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#6a6d74"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
        circ(c, 9, 0, 6, fl ? "#fff" : "#8a8d94", OUT, 1.4); rect(c, 4, -1.6, 11, 3.2, "#f2f2f2"); rect(c, 4, -4.4, 11, 1.8, "#1e1e22"); rect(c, 4, 2.6, 11, 1.8, "#1e1e22");
        circ(c, 13.5, 0, 1.6, "#111"); circ(c, 8, -5.6, 2, "#6a6d74", OUT, 1); circ(c, 8, 5.6, 2, "#6a6d74", OUT, 1); break;
      case "shield": { // hérisson
        for (var hi = 0; hi < 14; hi++) { var ha = hi * TAU / 14 + 0.2; poly(c, [Math.cos(ha - 0.2) * 6, Math.sin(ha - 0.2) * 6, Math.cos(ha) * 12, Math.sin(ha) * 12, Math.cos(ha + 0.2) * 6, Math.sin(ha + 0.2) * 6], fl ? "#fff" : "#5a3a22", OUT, 0.8); }
        circ(c, 0, 0, 7.5, fl ? "#fff" : "#8a5a32", OUT, 1.3); circ(c, 7.5, 0, 3.6, "#d8b48a", OUT, 1.2); circ(c, 10.5, 0, 1.2, "#111"); circ(c, 8.5, -1.6, 0.8, "#111"); break; }
      case "healer": // grenouille
        c.beginPath(); c.ellipse(0, 0, 7.5, 6, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#4fae4a"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
        circ(c, 5, -3.6, 2.6, "#7fd070", OUT, 1); circ(c, 5, 3.6, 2.6, "#7fd070", OUT, 1); circ(c, 5.6, -3.6, 1, "#111"); circ(c, 5.6, 3.6, 1, "#111");
        line(c, -4, -5, -9, -8 + walk, "#4fae4a", 2); line(c, -4, 5, -9, 8 - walk, "#4fae4a", 2); rect(c, -1.2, -3.6, 2.4, 7.2, "#fff"); rect(c, -3.6, -1.2, 7.2, 2.4, "#fff"); break;
      case "tank": // sanglier
        c.beginPath(); c.ellipse(-1, 0, 16, 11, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#5a3a28"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.8; c.stroke();
        for (var bi = -2; bi <= 2; bi++) line(c, -10, bi * 4, -2, bi * 4, "#3a2418", 1.6);
        circ(c, 12, 0, 7, fl ? "#fff" : "#6e4a34", OUT, 1.5); circ(c, 17, 0, 3.2, "#c89a8a", OUT, 1); poly(c, [14, -4, 20, -6, 16, -2], "#f2ead8", OUT, 1); poly(c, [14, 4, 20, 6, 16, 2], "#f2ead8", OUT, 1); circ(c, 11, -4, 1.1, "#ffe36a"); circ(c, 11, 4, 1.1, "#ffe36a"); break;
      case "bird": // guêpe
        c.save(); c.globalAlpha = 0.55; c.beginPath(); c.ellipse(-1, -7, 6, 3, 0.4, 0, TAU); c.fillStyle = "#dff"; c.fill(); c.beginPath(); c.ellipse(-1, 7, 6, 3, -0.4, 0, TAU); c.fill(); c.restore();
        c.beginPath(); c.ellipse(-3, 0, 6.5, 4, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#f2c230"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
        rect(c, -6, -3.4, 2, 6.8, "#222"); rect(c, -2, -3.8, 2, 7.6, "#222"); circ(c, 4, 0, 3, "#2a1c10", OUT, 1); poly(c, [-9, 0, -12, -1, -12, 1], "#222"); break;
      case "chopper": // corbeau
        poly(c, [2, 0, -2, -15, -9, -12, -6, -3, -12, 0, -6, 3, -9, 12, -2, 15], fl ? "#fff" : "#26262e", OUT, 1.4);
        c.beginPath(); c.ellipse(0, 0, 8, 5.6, 0, 0, TAU); c.fillStyle = fl ? "#fff" : "#32323c"; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
        circ(c, 8, 0, 3.6, "#32323c", OUT, 1.2); poly(c, [11, -1.6, 17, 0, 11, 1.6], "#e8a02a", OUT, 0.9); circ(c, 9, -1.6, 0.9, "#fff"); circ(c, 9, 1.6, 0.9, "#fff"); break;
      case "boss": // golem de racines
        for (var ri = 0; ri < 8; ri++) { var ra = ri * TAU / 8; line(c, Math.cos(ra) * 12, Math.sin(ra) * 12, Math.cos(ra + 0.3) * 24, Math.sin(ra + 0.3) * 24, "#4a3220", 3.2); }
        circ(c, 0, 0, 18, fl ? "#fff" : "#5a4026", OUT, 2); circ(c, -3, -6, 7, "#6e5232"); circ(c, -5, 6, 6, "#6e5232"); circ(c, 4, 0, 9, "#4f7a34", OUT, 1.4);
        circ(c, 10, -3.4, 2.2, "#ffe36a"); circ(c, 10, 3.4, 2.2, "#ffe36a"); circ(c, 10, -3.4, 0.9, "#111"); circ(c, 10, 3.4, 0.9, "#111"); poly(c, [-10, -2, -4, -6, -6, 0], "#7fd070"); break;
    }
    c.rotate(-e.a);
    // statuts
    var f = e.fl | 0;
    if (f & 16) { c.globalAlpha = 0.6; circ(c, 0, 0, r + 3, "#9fe0ff", "#e8f8ff", 1.5); c.globalAlpha = 1; }
    else if (f & 4) { c.globalAlpha = 0.55; circ(c, 0, r * 0.2, r + 2, "#7ee06a", "#3a7a2a", 1.2); c.globalAlpha = 1; }
    if (f & 1) { c.save(); c.globalCompositeOperation = "lighter"; circ(c, Math.sin(t * 20 + e.id) * 2, -r * 0.4, r * 0.7, "rgba(255,140,30,.7)"); circ(c, 0, -r * 0.7 - 2, r * 0.45, "rgba(255,220,90,.7)"); c.restore(); }
    if (f & 8) { c.save(); c.strokeStyle = "#ffe84a"; c.lineWidth = 1.6; c.beginPath(); var zx = -5, zy = -r - 5; c.moveTo(zx, zy); c.lineTo(zx + 4, zy + 3); c.lineTo(zx + 1, zy + 4); c.lineTo(zx + 6, zy + 9); c.stroke(); c.restore(); }
    if (hpf < 0.999) { var bw = Math.max(14, r * 2); rect(c, -bw / 2, -r - 9, bw, 3.2, "#1a0e08"); rect(c, -bw / 2 + 0.5, -r - 8.5, (bw - 1) * Math.max(0, hpf), 2.2, hpf > 0.5 ? "#e0402c" : "#f0a030"); }
    c.restore();
  }

  /* ---------- projectiles ---------- */
  function drawProj(c, p, t) {
    c.save(); c.translate(p.x, p.y - (p.z || 0));
    switch (p.kind) {
      case "stone": c.rotate(p.a); circ(c, -1, 0, 3, "#b9772e", OUT, 1); rect(c, 1.5, -2.2, 2.4, 4.4, "#6a4a2a", OUT, 0.8); break;
      case "arrow": c.rotate(p.a); line(c, -7, 0, 4, 0, "#6a4a2a", 1.6); poly(c, [6, 0, 2, -2.2, 2, 2.2], "#d0d4de", OUT, 0.8); break;
      case "dart": case "bolt": c.rotate(p.a); line(c, -9, 0, 5, 0, "#4a3220", 1.8); poly(c, [8, 0, 4, -2.4, 4, 2.4], "#e0e4ee", OUT, 0.8); break;
      case "bullet": case "bulletsm": c.rotate(p.a); rect(c, -4, -1, 8, 2, "#ffe6a0"); break;
      case "tracer": c.rotate(p.a); c.save(); c.globalCompositeOperation = "lighter"; rect(c, -12, -1, 16, 2, "rgba(255,230,140,.9)"); c.restore(); break;
      case "plasma": c.save(); c.globalCompositeOperation = "lighter"; circ(c, 0, 0, 5, "rgba(120,240,255,.5)"); circ(c, 0, 0, 2.6, "#c8fbff"); c.restore(); break;
      case "rail": c.rotate(p.a); c.save(); c.globalCompositeOperation = "lighter"; rect(c, -26, -1.4, 34, 2.8, "rgba(160,120,255,.9)"); rect(c, -26, -0.5, 34, 1, "#fff"); c.restore(); break;
      case "rock": circ(c, 2, 4 + (p.z || 0) * 0.3, 4, "rgba(0,0,0,.25)"); circ(c, 0, 0, 5, "#8a867a", OUT, 1.4); circ(c, -1.5, -1.5, 1.8, "#b5b1a4"); break;
      case "shell": circ(c, 0, 0, 4.4, "#3a4046", OUT, 1.2); circ(c, 0, 0, 1.6, "#ffb347"); break;
      case "plasmaball": c.save(); c.globalCompositeOperation = "lighter"; circ(c, 0, 0, 8, "rgba(160,100,255,.5)"); circ(c, 0, 0, 4, "#e0d0ff"); c.restore(); break;
      case "glue": case "foam": case "nano": circ(c, 0, 0, 4.2, p.kind === "glue" ? "#5aa23a" : p.kind === "foam" ? "#d8ffd0" : "#7fffb0", OUT, 1); circ(c, -1.2, -1.2, 1.4, "#fff"); break;
      case "ice": case "cryo": c.rotate(t * 6); poly(c, [0, -5, 3, 0, 0, 5, -3, 0], "#d8f2ff", "#3b6a96", 1); break;
      case "missile": case "rocket": c.rotate(p.a); rect(c, -6, -1.8, 10, 3.6, "#d8dce6", OUT, 1); poly(c, [7, 0, 4, -1.8, 4, 1.8], "#d0302a", OUT, 0.8); c.save(); c.globalCompositeOperation = "lighter"; circ(c, -8, 0, 3.4, "rgba(255,170,60,.8)"); c.restore(); break;
      case "bomb": circ(c, 0, 0, 3.6, "#2a2f34", OUT, 1); break;
    }
    c.restore();
  }

  /* ---------- effets (particules + décalcomanies) ---------- */
  function Fx(map) {
    this.parts = []; this.flashes = []; this.shake = 0; this.map = map;
    this.decal = document.createElement("canvas"); this.decal.width = map.w / 2; this.decal.height = map.h / 2; this.dc = this.decal.getContext("2d");
    this.dc.scale(0.5, 0.5);
    this.zaps = []; this.rings = [];
  }
  Fx.prototype.splat = function (x, y, r, col, n) {
    var c = this.dc; c.save(); c.fillStyle = col;
    for (var i = 0; i < n; i++) { var a = Math.random() * TAU, d = Math.random() * r; c.globalAlpha = 0.3 + Math.random() * 0.45; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + Math.random() * 2.4, 0, TAU); c.fill(); }
    c.restore();
  };
  Fx.prototype.scorch = function (x, y, r) { var c = this.dc; c.save(); var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(10,6,4,.55)"); g.addColorStop(1, "rgba(10,6,4,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
  Fx.prototype.spawnPart = function (o) { if (this.parts.length < 900) this.parts.push(o); };
  Fx.prototype.event = function (f, age) {
    var type = f[0], x = f[1], y = f[2], i, a, sp;
    switch (type) {
      case "boom": {
        var R = Math.max(18, f[3] || 40);
        this.flashes.push({ x: x, y: y, r: R * 2.2, life: 0.45, max: 0.45, col: age >= 4 ? "120,200,255" : "255,200,110" });
        this.rings.push({ x: x, y: y, r: R * 0.3, R: R * 1.05, life: 0.35, max: 0.35 });
        for (i = 0; i < 14; i++) { a = Math.random() * TAU; sp = 40 + Math.random() * 130; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, max: 0.8, r: 2 + Math.random() * 3, col: Math.random() < 0.5 ? "#ffb347" : "#ff6a2a", g: 0, add: true }); }
        for (i = 0; i < 8; i++) { a = Math.random() * TAU; sp = 10 + Math.random() * 40; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12, life: 0.7 + Math.random() * 0.7, max: 1.4, r: 5 + Math.random() * 7, col: "rgba(70,60,56,.5)", g: -8, grow: 8 }); }
        for (i = 0; i < 8; i++) { a = Math.random() * TAU; sp = 60 + Math.random() * 110; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.3, max: 0.8, r: 1.6, col: "#3a2a1a", g: 0 }); }
        this.scorch(x, y, R * 0.9); this.shake = Math.max(this.shake, Math.min(6, R / 12)); break;
      }
      case "hit": for (i = 0; i < 3; i++) { a = Math.random() * TAU; sp = 30 + Math.random() * 50; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.18, max: 0.18, r: 1.6, col: "#ffe6a0", add: true }); } break;
      case "splat": for (i = 0; i < 5; i++) { a = Math.random() * TAU; sp = 20 + Math.random() * 60; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, r: 2.4, col: "#6fcf6a" }); } break;
      case "die": {
        var ei = f[3] | 0, isAir = f[4], E = D.ENEMIES[D.ENEMY_ORDER[ei]];
        this.splat(x, y, E ? E.r + 6 : 10, "rgba(150,22,16,.8)", 9 + (E ? E.r : 6));
        for (i = 0; i < 9; i++) { a = Math.random() * TAU; sp = 30 + Math.random() * 90; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, max: 0.7, r: 1.4 + Math.random() * 2, col: isAir ? "#6a6a6a" : "#b32218", g: 0, drag: 3 }); }
        if (isAir) { this.flashes.push({ x: x, y: y, r: 40, life: 0.3, max: 0.3, col: "255,200,110" }); this.scorch(x, y, 16); }
        if (E && E.r >= 12) { this.flashes.push({ x: x, y: y, r: 50, life: 0.25, max: 0.25, col: "255,230,160" }); this.shake = Math.max(this.shake, E.r >= 20 ? 8 : 3); this.scorch(x, y, E.r + 4); }
        break;
      }
      case "dieu": this.splat(x, y, 10, "rgba(40,80,170,.7)", 8); break;
      case "muzzle": this.spawnPart({ x: x, y: y, vx: 0, vy: 0, life: 0.07, max: 0.07, r: 4, col: "#fff3b0", add: true }); break;
      case "zap": this.zaps.push({ x1: x, y1: y, x2: f[3], y2: f[4], life: 0.18, max: 0.18 }); break;
      case "build": case "level": case "spawn": for (i = 0; i < 6; i++) { a = Math.random() * TAU; sp = 20 + Math.random() * 30; this.spawnPart({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, life: 0.5, max: 0.5, r: 2, col: type === "level" ? "#ffe36a" : "#e8d8b0", g: 30, add: type === "level" }); } break;
      case "sell": for (i = 0; i < 6; i++) this.spawnPart({ x: x, y: y, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.7, max: 0.7, r: 2.6, col: "#ffd447", g: 60 }); break;
      case "heal": this.rings.push({ x: x, y: y, r: 6, R: 40, life: 0.5, max: 0.5, col: "120,255,140" }); break;
      case "leak": this.shake = Math.max(this.shake, 4); this.flashes.push({ x: x, y: y, r: 60, life: 0.4, max: 0.4, col: "255,60,50" }); break;
      case "smoke": for (i = 0; i < 5; i++) this.spawnPart({ x: x, y: y, vx: (Math.random() - 0.5) * 20, vy: -10, life: 0.8, max: 0.8, r: 6, col: "rgba(80,70,60,.5)", grow: 6 }); break;
      case "age": this.flashes.push({ x: this.map.w / 2, y: this.map.h / 2, r: Math.max(this.map.w, this.map.h), life: 0.9, max: 0.9, col: "255,236,170" }); break;
    }
  };
  Fx.prototype.update = function (dt) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      var dr = p.drag ? Math.max(0, 1 - p.drag * dt) : 1; p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.grow) p.r += p.grow * dt;
    }
    for (i = this.flashes.length - 1; i >= 0; i--) { this.flashes[i].life -= dt; if (this.flashes[i].life <= 0) this.flashes.splice(i, 1); }
    for (i = this.rings.length - 1; i >= 0; i--) { this.rings[i].life -= dt; if (this.rings[i].life <= 0) this.rings.splice(i, 1); }
    for (i = this.zaps.length - 1; i >= 0; i--) { this.zaps[i].life -= dt; if (this.zaps[i].life <= 0) this.zaps.splice(i, 1); }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 22);
  };
  Fx.prototype.drawBelow = function (c) {
    for (var i = 0; i < this.parts.length; i++) { var p = this.parts[i]; if (p.add) continue; c.globalAlpha = Math.min(1, p.life / p.max * 1.4); circ(c, p.x, p.y, p.r, p.col); }
    c.globalAlpha = 1;
  };
  Fx.prototype.drawAbove = function (c) {
    var i, p;
    c.save(); c.globalCompositeOperation = "lighter";
    for (i = 0; i < this.flashes.length; i++) {
      var f = this.flashes[i], k = f.life / f.max, g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, "rgba(" + f.col + "," + (0.85 * k) + ")"); g.addColorStop(0.5, "rgba(" + f.col + "," + (0.3 * k) + ")"); g.addColorStop(1, "rgba(" + f.col + ",0)");
      c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill();
    }
    for (i = 0; i < this.parts.length; i++) { p = this.parts[i]; if (!p.add) continue; c.globalAlpha = Math.min(1, p.life / p.max * 1.4); circ(c, p.x, p.y, p.r, p.col); }
    c.globalAlpha = 1;
    for (i = 0; i < this.zaps.length; i++) { var z = this.zaps[i]; c.globalAlpha = z.life / z.max; c.strokeStyle = "#fff6a0"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(z.x1, z.y1); var n = 5; for (var j = 1; j < n; j++) { var tt = j / n; c.lineTo(z.x1 + (z.x2 - z.x1) * tt + (Math.random() - 0.5) * 9, z.y1 + (z.y2 - z.y1) * tt + (Math.random() - 0.5) * 9); } c.lineTo(z.x2, z.y2); c.stroke(); }
    c.restore(); c.globalAlpha = 1;
    for (i = 0; i < this.rings.length; i++) { var r = this.rings[i], k2 = 1 - r.life / r.max; c.globalAlpha = 1 - k2; c.strokeStyle = r.col ? "rgb(" + r.col + ")" : "#fff0c0"; c.lineWidth = 3; c.beginPath(); c.arc(r.x, r.y, r.r + (r.R - r.r) * k2, 0, TAU); c.stroke(); }
    c.globalAlpha = 1;
  };

  root.AGES_ART = { terrain: terrain, drawBuilding: drawBuilding, drawUnit: drawUnit, drawEnemy: drawEnemy, drawProj: drawProj, Fx: Fx, icon: icon, PAL: PAL, circ: circ, line: line, TEAM: TEAM };
})(window);
