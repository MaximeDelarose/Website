/* =========================================================================
   Flippers · mode Ascension : une aventure en 9 zones dessinées à la main.
   DA « mini-golf 85 » (comme js/golf.js) : fairway lime en damier, rails
   noir et blanc, blocs rayés. Image basse résolution (240 × 420 px,
   1 pixel = 2 unités), agrandie sans lissage.

   Chaque zone est une grille de 30 × 24 cases de 32 unités (960 × 768) dessinée
   en caractères, puis convertie en murs, flippers, bumpers, mobs, boss… Les
   zones sont empilées : la sortie de l'une (une bouche « m » au plafond) mène
   par un tunnel dans la roche à la sortie « i » (au sommet de la corniche) de la
   suivante. Pas de chute d'une zone à l'autre : le danger, ce sont les gouffres
   (X), les mobs et les boss.

   Légende : # bloc · / \ 7 L demi-cases en diagonale (pleine en bas-droite,
   bas-gauche, haut-droite, haut-gauche) · = plateforme à sens unique · F f G g
   flippers (F → touche gauche, f ← touche droite, G → touche droite, g ← touche
   gauche) · o O p bumpers · % trampoline · u e q canons (haut, haut-droite,
   haut-gauche) · W colonne de vent · X gouffre · D barrière (ouverte à la mort
   du boss) · K boss · H E S B T R mobs · * x n w v bonus (gland, étoile, filet,
   plume, cœur) · @ camp (point de reprise) · m bouche du tunnel · i sortie du
   tunnel · Z gland doré.
   ========================================================================= */
(function (root) {
  "use strict";
  var CS = 32, COLS = 30, ROWS = 24, ZH = ROWS * CS;
  var BIOMES = [{ id: "prairie", name: "Prairie" }, { id: "bois", name: "Sous-bois" }, { id: "marais", name: "Marais" }, { id: "falaises", name: "Falaises" }, { id: "nuages", name: "Nuages" }];

  /* ---------- outils de dessin de grille ---------- */
  function mk() { var g = [], r; for (r = 0; r < ROWS; r++) g.push(new Array(COLS + 1).join(".").split("")); return g; }
  function set(g, c, r, ch) { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) g[r][c] = ch; }
  function rect(g, c0, r0, c1, r1, ch) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) set(g, c, r, ch); }
  function blit(g, c0, r0, rows) { rows.forEach(function (s, i) { for (var j = 0; j < s.length; j++) if (s[j] !== " ") set(g, c0 + j, r0 + i, s[j]); }); }
  function frame(g) { rect(g, 0, 0, 0, ROWS - 1, "#"); rect(g, COLS - 1, 0, COLS - 1, ROWS - 1, "#"); rect(g, 0, 0, COLS - 1, 0, "#"); rect(g, 0, 22, COLS - 1, 23, "#"); }
  // cuvette à deux flippers (pivots aux colonnes cF et cF + 7), fosse à trampoline entre les bouts
  function tray(g, cF) {
    var rP = 19, cf = cF + 7, k;
    if (cF - 3 >= 1) { rect(g, 1, rP - 3, cF - 4, 23, "#"); for (k = 0; k < 3; k++) { set(g, cF - 3 + k, rP - 3 + k, "\\"); rect(g, cF - 3 + k, rP - 2 + k, cF - 3 + k, 23, "#"); } }
    else rect(g, 1, rP - 1, cF - 1, 23, "#");
    if (cf + 3 <= 28) { rect(g, cf + 4, rP - 3, 28, 23, "#"); for (k = 0; k < 3; k++) { set(g, cf + 1 + k, rP - 1 - k, "/"); rect(g, cf + 1 + k, rP - k, cf + 1 + k, 23, "#"); } }
    else rect(g, cf + 1, rP - 1, 28, 23, "#");
    set(g, cF, rP, "F"); set(g, cf, rP, "f");
    rect(g, cF, rP + 1, cF, 23, "#"); rect(g, cf, rP + 1, cf, 23, "#");
    rect(g, cF + 1, 21, cF + 2, 23, "#"); rect(g, cf - 2, 21, cf - 1, 23, "#");
    set(g, cF + 1, 20, "#"); set(g, cf - 1, 20, "#");           // comble le coin sous le pivot : la bille ne peut plus se glisser sous le bras
    set(g, cF + 3, 22, "%"); set(g, cF + 4, 22, "%"); rect(g, cF + 3, 23, cF + 4, 23, "#");
    set(g, cF + 3, 17, "@");
  }
  // petite cuvette à mi-hauteur (corniche avec deux flippers) : c = colonne du flipper gauche, r = rangée des pivots
  function miniTray(g, c, r) { rect(g, c - 1, r + 2, c + 6, r + 3, "#"); set(g, c, r, "F"); set(g, c + 5, r, "f"); rect(g, c, r + 1, c, r + 1, "#"); rect(g, c + 5, r + 1, c + 5, r + 1, "#"); }
  // puits de vent entre deux zones : la « bouche » perce le plafond de la zone, le « puits » traverse la roche de la zone du dessus
  function mouthAt(g, c) { rect(g, c, 0, c + 2, 2, "W"); }
  function shaftAt(g, c) { rect(g, c, 17, c + 2, 23, "W"); rect(g, c, 16, c + 2, 16, "="); }

  /* ---------- zones ---------- */
  var Z = [];
  // 0 · La Lisière : la bille monte d'abord sur une corniche (facile), un canon la propulse vers le puits
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 11); mouthAt(g, 14);
    rect(g, 1, 12, 6, 13, "#"); rect(g, 23, 12, 28, 13, "#");      // deux corniches de chaque côté
    set(g, 3, 11, "e"); set(g, 27, 11, "q");                       // leurs canons visent le puits
    blit(g, 4, 5, ["o"]); blit(g, 25, 5, ["o"]); blit(g, 14, 9, ["p"]); blit(g, 13, 15, ["* *"]);
    blit(g, 2, 8, ["*"]); blit(g, 25, 9, ["* *"]); blit(g, 14, 5, ["x"]);
    return { name: "La Lisière", biome: 0, g: g, spawn: [14, 14] };
  });
  // 1 · Les Ruches : un long couloir vers la droite, des abeilles, un canon au bout
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 3); shaftAt(g, 14); mouthAt(g, 25);
    rect(g, 12, 9, 24, 10, "#");                                  // plafond du couloir
    set(g, 26, 15, "u");                                          // canon : projette dans le puits
    blit(g, 17, 12, ["E     E"]); blit(g, 18, 14, ["*  *"]); blit(g, 22, 14, ["x"]);
    blit(g, 5, 7, ["o"]); blit(g, 9, 4, ["p"]); blit(g, 6, 12, ["*"]); blit(g, 10, 5, ["*"]); blit(g, 22, 4, ["o"]);
    return { name: "Les Ruches", biome: 0, g: g, spawn: [6, 14] };
  });
  // 2 · Le Gros Hérisson : premier boss, la barrière ne s'ouvre qu'à sa défaite
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 11); shaftAt(g, 25); mouthAt(g, 2);
    rect(g, 5, 1, 5, 4, "D"); rect(g, 2, 4, 4, 4, "D");
    blit(g, 8, 6, ["o"]); blit(g, 21, 6, ["o"]); blit(g, 14, 12, ["O"]); blit(g, 4, 11, ["v"]); blit(g, 25, 11, ["* *"]);
    blit(g, 14, 2, ["K"]); set(g, 3, 15, "u");
    return { name: "Le Gros Hérisson", biome: 0, g: g, spawn: [14, 14], boss: { type: "hedgehog", hp: 4, x0: 6, x1: 24, y: 9, speed: 1.0, name: "LE GROS HÉRISSON" } };
  });
  // 3 · Sous-bois : deux étages, une corniche à flippers côté gauche
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 17); shaftAt(g, 2); mouthAt(g, 2);
    miniTray(g, 2, 8);                                           // la corniche : deux flippers qui renvoient vers le puits
    rect(g, 14, 5, 18, 5, "=");
    blit(g, 13, 10, ["S"]); blit(g, 21, 8, ["S"]); blit(g, 12, 3, ["S"]); blit(g, 24, 13, ["* *"]); blit(g, 6, 5, ["x"]);
    blit(g, 22, 4, ["o"]); blit(g, 26, 7, ["o"]); blit(g, 15, 8, ["p"]); blit(g, 10, 13, ["o"]);
    return { name: "Sous-bois", biome: 1, g: g, spawn: [20, 14] };
  });
  // 4 · Le Pont des Racines : pierres de gué, un gouffre d'épines au bout de l'étagère
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 11); shaftAt(g, 2); mouthAt(g, 8);
    rect(g, 17, 9, 23, 9, "="); rect(g, 8, 6, 14, 6, "="); rect(g, 13, 12, 17, 12, "#");
    rect(g, 27, 16, 28, 18, "."); rect(g, 27, 17, 28, 18, "X");   // gouffre d'épines
    blit(g, 21, 7, ["* *"]); blit(g, 10, 4, ["* *"]); blit(g, 15, 10, ["B"]); blit(g, 21, 4, ["B"]);
    blit(g, 7, 11, ["o"]); blit(g, 25, 11, ["o"]); blit(g, 3, 8, ["n"]); blit(g, 10, 14, ["T"]); blit(g, 19, 6, ["p"]);
    return { name: "Le Pont des Racines", biome: 1, g: g, spawn: [14, 14] };
  });
  // 5 · Le Terrier des Taupes : un couloir vers la gauche, des taupes qui sortent du sol
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 17); shaftAt(g, 8); mouthAt(g, 2);
    rect(g, 5, 9, 17, 10, "#"); set(g, 3, 15, "u");
    blit(g, 12, 15, ["T"]); blit(g, 15, 15, ["T"]); blit(g, 9, 12, ["B     B"]); blit(g, 6, 14, ["* *"]); blit(g, 15, 14, ["x"]);
    blit(g, 22, 5, ["o"]); blit(g, 25, 9, ["o"]); blit(g, 20, 11, ["p"]); blit(g, 24, 3, ["*"]); blit(g, 10, 5, ["*"]);
    return { name: "Le Terrier des Taupes", biome: 1, g: g, spawn: [20, 14] };
  });
  // 6 · La Reine Araignée : deuxième boss
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 11); shaftAt(g, 2); mouthAt(g, 25); set(g, 27, 15, "u");
    rect(g, 24, 1, 24, 4, "D"); rect(g, 25, 4, 27, 4, "D");
    blit(g, 17, 2, ["K"]); blit(g, 9, 6, ["o"]); blit(g, 20, 8, ["o"]); blit(g, 12, 11, ["O"]); blit(g, 22, 12, ["p"]); blit(g, 6, 3, ["w"]); blit(g, 8, 14, ["v"]);
    rect(g, 18, 13, 22, 13, "=");
    return { name: "La Reine Araignée", biome: 1, g: g, spawn: [14, 14], boss: { type: "spider", hp: 5, x: 17, y0: 2, y1: 11, speed: 0.9, name: "LA REINE ARAIGNÉE" } };
  });
  // 7 · Le Marais : un îlot-canon au-dessus de l'eau
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 11); shaftAt(g, 25); mouthAt(g, 25);
    rect(g, 23, 11, 28, 12, "#"); rect(g, 1, 8, 6, 9, "#");       // deux îlots
    rect(g, 25, 10, 27, 10, "u");
    rect(g, 4, 16, 5, 18, "."); rect(g, 4, 17, 5, 18, "X");       // l'eau, dans l'étagère gauche
    blit(g, 14, 14, ["R  R"]); blit(g, 15, 9, ["R"]); blit(g, 10, 12, ["* * *"]); blit(g, 2, 6, ["*  v"]); blit(g, 14, 5, ["x"]);
    blit(g, 17, 7, ["p"]); blit(g, 11, 7, ["p"]); blit(g, 20, 9, ["o"]); blit(g, 8, 3, ["o"]);
    return { name: "Le Marais", biome: 2, g: g, spawn: [14, 14] };
  });
  // 8 · Les Falaises : une cheminée de vent qui souffle jusqu'au puits
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 3); shaftAt(g, 25); mouthAt(g, 16);
    rect(g, 15, 3, 15, 12, "#"); rect(g, 19, 3, 19, 12, "#"); rect(g, 16, 3, 18, 15, "W");
    blit(g, 9, 6, ["B"]); blit(g, 23, 8, ["B"]); blit(g, 22, 12, ["*   *"]); blit(g, 8, 11, ["x"]); blit(g, 26, 5, ["o"]); blit(g, 24, 3, ["p"]);
    return { name: "Les Falaises", biome: 3, g: g, spawn: [10, 14] };
  });
  // 9 · Le Sommet : nuages, trampolines, dernier boss et gland doré
  Z.push(function () {
    var g = mk(); frame(g); tray(g, 3); shaftAt(g, 16); set(g, 26, 15, "u");
    rect(g, 23, 1, 23, 4, "D"); rect(g, 24, 4, 28, 4, "D"); set(g, 26, 2, "Z");
    rect(g, 6, 9, 11, 9, "="); rect(g, 17, 7, 22, 7, "="); rect(g, 12, 12, 16, 12, "=");
    set(g, 8, 8, "%"); set(g, 19, 6, "%"); set(g, 14, 11, "%");
    blit(g, 12, 3, ["K"]); blit(g, 6, 5, ["*"]); blit(g, 14, 14, ["v"]); blit(g, 20, 13, ["E"]); blit(g, 8, 14, ["E"]);
    return { name: "Le Sommet", biome: 4, g: g, spawn: [14, 14], goal: { c: 26, r: 2 }, boss: { type: "crow", hp: 6, x0: 6, x1: 21, y: 5, speed: 1.2, name: "LE GRAND CORBEAU" } };
  });

  /* ---------- conversion grille → monde ---------- */
  var SOLID = { "#": 1, "/": 1, "\\": 1, "7": 1, "L": 1 };
  var SIDES = { "#": { t: 1, b: 1, l: 1, r: 1 }, "/": { b: 1, r: 1 }, "\\": { b: 1, l: 1 }, "7": { t: 1, r: 1 }, "L": { t: 1, l: 1 } };
  function side(ch, s) { return !!(SIDES[ch] && SIDES[ch][s]); }
  function mobMotion(ch) { return ch === "H" || ch === "R" ? "patrol" : ch === "E" || ch === "B" ? "sine" : ch === "S" ? "bob" : "pop"; }
  var MOBTYPE = { H: "hedgehog", R: "frog", E: "bee", B: "bat", S: "spider", T: "mole" };

  function build() {
    var N = Z.length, W = { cols: COLS, cs: CS, width: COLS * CS, zh: ZH, n: N, worldH: N * ZH, zones: [], goal: null, spawn: null }, zi;
    for (zi = 0; zi < N; zi++) {
      var def = Z[zi](), g = def.g, y0 = (N - 1 - zi) * ZH;
      var zn = { i: zi, name: def.name, biome: def.biome, y0: y0, grid: g, segs: [], flippers: [], bumpers: [], mobs: [], bosses: [], bonuses: [], launchers: [], winds: [], hazards: [], flags: [], gates: [], plats: [], mouth: null, outlet: null, goalCell: null, tube: null, spawn: { x: def.spawn[0] * CS + 16, y: y0 + def.spawn[1] * CS }, boss: def.boss || null };
      W.zones.push(zn);
      var c, r, ch;
      var seg = function (x1, y1, x2, y2, o) {
        o = o || {};
        var s = { x1: x1, y1: y1 + y0, x2: x2, y2: y2 + y0, e: o.e != null ? o.e : 0.35, r: 2.5, oneWay: false, plat: !!o.plat, sling: null, kind: o.kind || "wall", gate: o.gate || null, z: zi };
        s.minx = Math.min(s.x1, s.x2) - 4; s.maxx = Math.max(s.x1, s.x2) + 4; s.miny = Math.min(s.y1, s.y2) - 4; s.maxy = Math.max(s.y1, s.y2) + 4; zn.segs.push(s); return s;
      };
      // arêtes des blocs : une arête entre une case pleine de ce côté et une case sans paroi en face
      var hor = {}, ver = {};
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        ch = g[r][c];
        if (!SIDES[ch]) continue;
        var up = r > 0 ? g[r - 1][c] : "#", dn = r < ROWS - 1 ? g[r + 1][c] : "#", lf = c > 0 ? g[r][c - 1] : "#", rt = c < COLS - 1 ? g[r][c + 1] : "#";
        if (side(ch, "t") && !side(up, "b")) (hor[r] = hor[r] || []).push(c);
        if (side(ch, "b") && !side(dn, "t") && r < ROWS - 1) (hor[r + 1] = hor[r + 1] || []).push(c);
        if (side(ch, "l") && !side(lf, "r")) (ver[c] = ver[c] || []).push(r);
        if (side(ch, "r") && !side(rt, "l")) (ver[c + 1] = ver[c + 1] || []).push(r);
      }
      var runs = function (list, emit) { var a = list.slice().sort(function (p, q) { return p - q; }), st = a[0], pv = a[0], i2; for (i2 = 1; i2 <= a.length; i2++) { if (i2 === a.length || a[i2] !== pv + 1) { emit(st, pv); st = a[i2]; } pv = a[i2]; } };
      Object.keys(hor).forEach(function (rk) { runs(hor[rk], function (a, b) { seg(a * CS, rk * CS, (b + 1) * CS, rk * CS); }); });
      Object.keys(ver).forEach(function (ck) { runs(ver[ck], function (a, b) { seg(ck * CS, a * CS, ck * CS, (b + 1) * CS); }); });
      var gate = null, platRuns = {};
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        ch = g[r][c]; var cx0 = c * CS + 16, cy0 = r * CS + 16, gx = c * CS, gy = r * CS;
        if (ch === "/") seg(gx, gy + CS, gx + CS, gy, { kind: "slope", e: 0.3 });
        else if (ch === "\\") seg(gx, gy, gx + CS, gy + CS, { kind: "slope", e: 0.3 });
        else if (ch === "7") seg(gx, gy, gx + CS, gy + CS, { kind: "slope", e: 0.3 });
        else if (ch === "L") seg(gx + CS, gy, gx, gy + CS, { kind: "slope", e: 0.3 });
        else if (ch === "=") (platRuns[r] = platRuns[r] || []).push(c);
        else if (ch === "D") {
          gate = gate || { open: false, z: zi, cells: [], segs: [] }; gate.cells.push([c, r]);
          [[gx, gy, gx + CS, gy], [gx, gy + CS, gx + CS, gy + CS], [gx, gy, gx, gy + CS], [gx + CS, gy, gx + CS, gy + CS]].forEach(function (q) { gate.segs.push(seg(q[0], q[1], q[2], q[3], { gate: gate })); });
        }
        else if (ch === "F" || ch === "G" || ch === "f" || ch === "g") {
          zn.flippers.push({ px: cx0, py: y0 + cy0, s: (ch === "F" || ch === "G") ? 1 : -1, a: 0.5, w: 0, key: (ch === "F" || ch === "g") ? "left" : "right", z: zi });
        }
        else if (ch === "o") zn.bumpers.push({ x: cx0, y: y0 + cy0, r: 22, kind: "mush", flash: 0, z: zi });
        else if (ch === "O") zn.bumpers.push({ x: cx0, y: y0 + cy0, r: 30, kind: "mush", flash: 0, z: zi });
        else if (ch === "p") zn.bumpers.push({ x: cx0, y: y0 + cy0, r: 11, kind: "peg", flash: 0, z: zi });
        else if (ch === "%") zn.bumpers.push({ x: cx0, y: y0 + cy0, r: 20, kind: "pad", flash: 0, z: zi });
        else if (ch === "u" || ch === "e" || ch === "q") zn.launchers.push({ x: cx0, y: y0 + cy0, r: 22, vx: ch === "u" ? 0 : ch === "e" ? 1050 : -1050, vy: ch === "u" ? -1560 : -1050, z: zi });
        else if (ch === "W") { var wd = zn.winds[zn.winds.length - 1]; if (wd && wd.r0 === r && wd.c1 === c - 1) wd.c1 = c; else if (wd && wd.c0 === c && wd.c1 === c && wd.r1 === r - 1) wd.r1 = r; else zn.winds.push({ c0: c, c1: c, r0: r, r1: r }); }
        else if (ch === "X") { var hz = zn.hazards[zn.hazards.length - 1]; if (hz && hz.r === r && hz.c1 === c - 1) hz.c1 = c; else zn.hazards.push({ r: r, c0: c, c1: c }); }
        else if (ch === "@") zn.flags.push({ x: cx0, y: y0 + cy0, z: zi, hit: false });
        else if (ch === "m") { if (!zn.mouth) zn.mouth = { c0: c, c1: c, r: r }; else zn.mouth.c1 = c; }
        else if (ch === "i") zn.outlet = { x: cx0, y: y0 + cy0 };
        else if (ch === "Z") zn.goalCell = { x: cx0, y: y0 + cy0 };
        else if (ch === "K") zn.bossCell = { x: cx0, y: y0 + cy0 };
        else if (MOBTYPE[ch]) {
          var m = { type: MOBTYPE[ch], motion: mobMotion(ch), r: 15, speed: 0.9 + ((c * 7 + r * 3) % 10) / 20, phase: (c * 13 + r * 7) % 6, alive: true, dead: 0, flash: 0, z: zi, amp: 26 }, k2;
          if (m.motion === "patrol" || m.motion === "sine") { var a = c, b2 = c; for (k2 = 1; k2 <= 3 && c - k2 >= 0 && !SOLID[g[r][c - k2]]; k2++) a = c - k2; for (k2 = 1; k2 <= 3 && c + k2 < COLS && !SOLID[g[r][c + k2]]; k2++) b2 = c + k2; m.x0 = a * CS + 16; m.x1 = b2 * CS + 16; if (m.x1 - m.x0 < 40) { m.x0 -= 30; m.x1 += 30; } m.y = y0 + cy0; }
          else if (m.motion === "bob") { var u = r, d = r; for (k2 = 1; k2 <= 3 && r - k2 >= 1 && !SOLID[g[r - k2][c]]; k2++) u = r - k2; for (k2 = 1; k2 <= 3 && r + k2 < ROWS && !SOLID[g[r + k2][c]]; k2++) d = r + k2; m.x = cx0; m.y0 = y0 + u * CS + 16; m.y1 = y0 + d * CS + 16; if (m.y1 - m.y0 < 40) { m.y0 -= 30; m.y1 += 30; } }
          else { m.x = cx0; m.y = y0 + cy0; }
          zn.mobs.push(m);
        }
        else if (ch === "*" || ch === "x" || ch === "n" || ch === "w" || ch === "v") zn.bonuses.push({ type: ch === "*" ? "acorn" : ch === "x" ? "star" : ch === "n" ? "net" : ch === "w" ? "feather" : "heart", x: cx0, y: y0 + cy0, got: false, z: zi });
      }
      // les colonnes de vent : on fusionne les rangées empilées (même colonnes, rangées contiguës)
      zn.winds.sort(function (p1, q1) { return p1.c0 - q1.c0 || p1.c1 - q1.c1 || p1.r0 - q1.r0; });
      zn.winds = zn.winds.reduce(function (acc, w) { var l = acc[acc.length - 1]; if (l && l.c0 === w.c0 && l.c1 === w.c1 && l.r1 + 1 === w.r0) l.r1 = w.r1; else acc.push(w); return acc; }, []);
      Object.keys(platRuns).forEach(function (rk) { runs(platRuns[rk], function (a, b) { zn.plats.push(seg(a * CS, rk * CS, (b + 1) * CS, rk * CS, { plat: true, kind: "plat" })); }); });
      if (gate) { zn.gates.push(gate); zn.launchers.forEach(function (l) { l.gate = gate; }); }
      if (def.boss && zn.bossCell) {
        var bd = def.boss;
        zn.bosses.push({ type: bd.type, name: bd.name, hp: bd.hp, max: bd.hp, r: 44, x: zn.bossCell.x, y: zn.bossCell.y, x0: (bd.x0 || 6) * CS + 16, x1: (bd.x1 || 24) * CS + 16, yy: y0 + (bd.y || 9) * CS + 16, yTop: y0 + (bd.y0 || 2) * CS + 16, yBot: y0 + (bd.y1 || 11) * CS + 16, bx: (bd.x || 15) * CS + 16, speed: bd.speed, flash: 0, dead: false, hitCool: 0, z: zi, gate: gate || null });
      }
      if (zn.goalCell) W.goal = zn.goalCell;
      if (zi === 0) W.spawn = zn.spawn;
    }
    return W;
  }
  function mobPos(m, t) {
    var u = m.phase + t * m.speed;
    if (m.motion === "patrol") return { x: (m.x0 + m.x1) / 2 + (m.x1 - m.x0) / 2 * Math.sin(u), y: m.y, up: true };
    if (m.motion === "bob") return { x: m.x, y: (m.y0 + m.y1) / 2 + (m.y1 - m.y0) / 2 * Math.sin(u), up: true };
    if (m.motion === "sine") return { x: (m.x0 + m.x1) / 2 + (m.x1 - m.x0) / 2 * Math.sin(u), y: m.y + m.amp * Math.sin(u * 2.3), up: true };
    var ph = ((u / 6.2832) % 1 + 1) % 1; return { x: m.x, y: m.y, up: ph < 0.62 };
  }
  function bossPos(b, t) {
    var f = b.hp <= 2 ? 1.5 : 1, u = t * b.speed * f;
    if (b.type === "spider") return { x: b.bx + Math.sin(u * 0.7) * 150, y: (b.yTop + b.yBot) / 2 + Math.sin(u) * (b.yBot - b.yTop) / 2 };
    if (b.type === "crow") return { x: (b.x0 + b.x1) / 2 + Math.sin(u) * (b.x1 - b.x0) / 2, y: b.yy + Math.sin(u * 2.1) * 60 };
    return { x: (b.x0 + b.x1) / 2 + Math.sin(u) * (b.x1 - b.x0) / 2, y: b.yy };
  }

  /* ======================= rendu pixel art ======================= */
  var P = {
    black: "#14141e", white: "#ffffff", gray: "#cdd2dc", gray2: "#9aa0b0", lime: "#a8e63a", lime2: "#96d632", limeHi: "#c6f55c",
    green: "#139a56", green2: "#0e7f49", rough: "#1f8f4e", rough2: "#177a42", tree: "#0b5a33", treeHi: "#34aa5c",
    sand: "#f3eea0", sandDot: "#4a4528", water: "#27a9f1", water2: "#1f98dc", waterHi: "#8dd8ff", waterEdge: "#126aa6",
    yellow: "#f6c445", brown: "#7a4b00", brown2: "#a8691a", red: "#d8322b", red2: "#ef6a52", cream: "#fdf3de", orange: "#e8872a", orange2: "#b05c14",
    stone: "#8a8fa3", stone2: "#7b8096", stone3: "#5d6277", snow: "#eaf6ff", sky: "#9ad8ff", sky2: "#8acff8", purple: "#7a4bd8", pink: "#ff9ec7",
  };
  var GROUND = [[P.lime, P.lime2], [P.green, P.green2], [P.water, P.water2], [P.stone, P.stone2], [P.sky, P.sky2]];
  var BLOCK = [[P.rough, P.rough2, P.tree], [P.brown, "#5f3a00", "#3d2500"], [P.green2, P.rough2, P.tree], [P.stone3, "#4a4f63", "#383c4d"], [P.white, P.gray, P.gray2]];
  function hash(x, y) { var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

  var cx = null, CAMX = 0, CAMY = 0;
  function X(x) { return Math.round((x - CAMX) / 2); }
  function Y(y) { return Math.round((y - CAMY) / 2); }
  function rect2(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(X(x), Y(y), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); }
  function disc(x, y, r, col) {
    var xx = X(x), yy = Y(y), rr = Math.max(1, Math.round(r / 2)); cx.fillStyle = col;
    for (var dy = -rr; dy <= rr; dy++) { var w = Math.floor(Math.sqrt(rr * rr + rr * 0.8 - dy * dy)); cx.fillRect(xx - w, yy + dy, 2 * w + 1, 1); }
  }
  function line(x1, y1, x2, y2, th, colFn) {
    var a = X(x1), b = Y(y1), c2 = X(x2), d = Y(y2), n = Math.max(1, Math.max(Math.abs(c2 - a), Math.abs(d - b)));
    for (var i = 0; i <= n; i++) { cx.fillStyle = typeof colFn === "string" ? colFn : colFn(i, n); cx.fillRect(Math.round(a + (c2 - a) * i / n - th / 2), Math.round(b + (d - b) * i / n - th / 2), th, th); }
  }
  function spr(rows, map, x, y, flipX, sc) {
    sc = sc || 1; var w = rows[0].length, ox = X(x) - Math.floor(w * sc / 2), oy = Y(y) - Math.floor(rows.length * sc / 2);
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < w; c++) { var ch = rows[r].charAt(flipX ? w - 1 - c : c); if (ch === "." || !map[ch]) continue; cx.fillStyle = map[ch]; cx.fillRect(ox + c * sc, oy + r * sc, sc, sc); }
  }
  var SP = {
    hedgehog: ["..kkkkk...", ".kdkdkdkk.", "kdkdkdkdkk", "kddddddddc", "kbbbbbbbce", ".bb.bb.bb."],
    bee: ["..ww.ww..", ".wwwwwww.", "yyyyyyykk", "kkkkkkykk", "yyyyyyyyk", "..yyyyy.."],
    spider: ["k.k...k.k", ".kk.k.kk.", "..kpppk..", "kkkpwpkkk", "..kpppk..", ".k.kkk.k."],
    bat: ["kk.....kk", "kkk...kkk", "kkkkkkkkk", ".kkkwkkk.", "..kkkkk..", "...k.k..."],
    frog: ["..gg.gg..", ".gwgggwg.", "gggggggg.", "gggggggg.", ".gg.g.gg.", "g.g...g.g"],
    mole: ["..bbbbb..", ".bbbbbbb.", "bbwbbbwbb", "bbbppbbbb", ".bbbbbbb.", "..b...b.."],
    crow: ["kk......kk", "kkk....kkk", "kkkkkkkkkk", ".kkkwkkkk.", "..kkkkkk..", "...kyk...."],
  };
  var MOBCOL = { hedgehog: { k: "#14141e", d: "#7a4b00", b: "#a8691a", c: "#f3eea0", e: "#14141e" }, bee: { w: "#ffffff", y: "#f6c445", k: "#14141e" }, spider: { k: "#14141e", p: "#7a4bd8", w: "#ffffff" }, bat: { k: "#3a2a5a", w: "#ffffff" }, frog: { g: "#34c25a", w: "#ffffff" }, mole: { b: "#7a4b00", w: "#ffffff", p: "#ff9ec7" }, crow: { k: "#14141e", w: "#ffffff", y: "#f6c445" } };
  var BON = {
    acorn: { rows: ["..nn..", ".bbbb.", "bbbbbb", "yyyyyy", ".yyyy.", "..yy.."], map: { n: "#7a4b00", b: "#a8691a", y: "#f6c445" } },
    star: { rows: ["...y...", "...y...", "yyyyyyy", ".yyyyy.", "..yyy..", ".yy.yy.", "yy...yy"], map: { y: "#f6c445" } },
    net: { rows: ["w.w.w.w", ".wwwww.", "wwwcwww", ".wwwww.", "w.w.w.w"], map: { w: "#ffffff", c: "#9aa0b0" } },
    feather: { rows: ["....bb", "...bbb", "..bbbw", ".bbbw.", "bbbw..", "bw...."], map: { b: "#9ad8ff", w: "#ffffff" } },
    heart: { rows: [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], map: { r: "#d8322b" } },
  };

  // --- couche statique d'une zone (mise en cache : 480 × 384 px) ---
  function drawTri(c, ox, oy, ch, pal) {
    for (var x = 0; x < 16; x++) {
      var edge = (ch === "/" || ch === "L") ? 15 - x : x;
      var from = (ch === "/" || ch === "\\") ? edge : 0, to = (ch === "/" || ch === "\\") ? 16 : edge + 1;
      for (var y = from; y < to; y++) {
        var d = (ch === "/" || ch === "\\") ? y - edge : edge - y;
        c.fillStyle = d === 0 ? P.black : d <= 2 ? (((x >> 1) & 1) ? P.white : P.gray) : d === 3 ? P.black : (hash(ox + x, oy + y) < 0.1 ? pal[2] : pal[0]);
        c.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
  function buildZoneLayer(W, zn) {
    var cv = document.createElement("canvas"); cv.width = COLS * 16; cv.height = ROWS * 16; var c = cv.getContext("2d"), g = zn.grid, r, cc, i;
    var gp = GROUND[zn.biome], bp = BLOCK[zn.biome], b = zn.biome;
    for (r = 0; r < ROWS * 2; r++) for (cc = 0; cc < COLS * 2; cc++) { c.fillStyle = ((cc + r) & 1) ? gp[0] : gp[1]; c.fillRect(cc * 8, r * 8, 8, 8); }
    for (i = 0; i < 70; i++) {
      var hx = Math.floor(hash(zn.i, i) * 470), hy = Math.floor(hash(i, zn.i + 77) * 376), t = hash(zn.i + 5, i + 3);
      if (b === 0) { if (t < 0.5) { c.fillStyle = P.limeHi; c.fillRect(hx, hy, 2, 2); c.fillStyle = P.yellow; c.fillRect(hx + 1, hy - 1, 1, 1); } else if (t < 0.8) { c.fillStyle = P.green; c.fillRect(hx, hy, 3, 1); c.fillRect(hx + 1, hy - 1, 1, 1); } else { c.fillStyle = P.sand; c.fillRect(hx, hy, 4, 3); c.fillStyle = P.sandDot; c.fillRect(hx + 1, hy + 1, 1, 1); } }
      else if (b === 1) { if (t < 0.5) { c.fillStyle = P.red; c.fillRect(hx, hy, 3, 2); c.fillStyle = P.white; c.fillRect(hx + 1, hy, 1, 1); c.fillStyle = P.cream; c.fillRect(hx + 1, hy + 2, 1, 2); } else { c.fillStyle = P.tree; c.fillRect(hx, hy, 4, 2); c.fillStyle = P.treeHi; c.fillRect(hx + 1, hy - 1, 2, 1); } }
      else if (b === 2) { if (t < 0.5) { c.fillStyle = P.green; c.fillRect(hx, hy, 5, 3); c.fillStyle = P.lime; c.fillRect(hx + 1, hy + 1, 3, 1); } else { c.fillStyle = P.green2; c.fillRect(hx, hy, 1, 5); c.fillRect(hx + 2, hy + 1, 1, 4); c.fillRect(hx + 4, hy + 2, 1, 3); } }
      else if (b === 3) { if (t < 0.5) { c.fillStyle = P.stone3; c.fillRect(hx, hy, 4, 3); c.fillStyle = P.gray; c.fillRect(hx, hy, 4, 1); } else { c.fillStyle = P.purple; c.fillRect(hx, hy, 3, 4); c.fillStyle = P.pink; c.fillRect(hx + 1, hy - 1, 1, 1); } }
      else { c.fillStyle = P.white; c.fillRect(hx, hy, 18, 3); c.fillRect(hx + 4, hy - 3, 10, 3); c.fillStyle = P.gray; c.fillRect(hx + 2, hy + 3, 12, 2); }
    }
    zn.hazards.forEach(function (h) {
      var x0 = h.c0 * 16, w = (h.c1 - h.c0 + 1) * 16, y0 = h.r * 16;
      c.fillStyle = b === 2 ? P.waterEdge : P.black; c.fillRect(x0, y0, w, 16);
      if (b === 2) { c.fillStyle = P.water; for (i = 0; i < w; i += 4) c.fillRect(x0 + i, y0 + 2 + (i & 4 ? 1 : 0), 3, 1); }
      else { for (i = 0; i < w; i += 4) { c.fillStyle = P.red; c.fillRect(x0 + i + 1, y0 + 8, 2, 8); c.fillRect(x0 + i, y0 + 12, 4, 4); c.fillStyle = P.white; c.fillRect(x0 + i + 1, y0 + 6, 2, 2); } }
    });
    function exposed(n, s) { return !side(n, s); }
    for (r = 0; r < ROWS; r++) for (cc = 0; cc < COLS; cc++) {
      var ch = g[r][cc], ox = cc * 16, oy = r * 16;
      if (ch === "/" || ch === "\\" || ch === "7" || ch === "L") { drawTri(c, ox, oy, ch, bp); continue; }
      if (ch !== "#") continue;
      c.fillStyle = bp[0]; c.fillRect(ox, oy, 16, 16);
      for (i = 0; i < 5; i++) { c.fillStyle = hash(ox + i, oy) < 0.5 ? bp[1] : bp[2]; c.fillRect(ox + Math.floor(hash(cc + i, r) * 14), oy + Math.floor(hash(cc, r + i) * 14), 2, 1); }
      var up = r > 0 ? g[r - 1][cc] : "#", dn = r < ROWS - 1 ? g[r + 1][cc] : "#", lf = cc > 0 ? g[r][cc - 1] : "#", rt = cc < COLS - 1 ? g[r][cc + 1] : "#", k;
      if (exposed(up, "b")) for (k = 0; k < 16; k++) { c.fillStyle = P.black; c.fillRect(ox + k, oy, 1, 1); c.fillStyle = ((k >> 1) & 1) ? P.white : P.gray; c.fillRect(ox + k, oy + 1, 1, 2); c.fillStyle = P.black; c.fillRect(ox + k, oy + 3, 1, 1); }
      if (exposed(dn, "t")) for (k = 0; k < 16; k++) { c.fillStyle = P.black; c.fillRect(ox + k, oy + 15, 1, 1); c.fillStyle = ((k >> 1) & 1) ? P.white : P.gray; c.fillRect(ox + k, oy + 13, 1, 2); c.fillStyle = P.black; c.fillRect(ox + k, oy + 12, 1, 1); }
      if (exposed(lf, "r")) for (k = 0; k < 16; k++) { c.fillStyle = P.black; c.fillRect(ox, oy + k, 1, 1); c.fillStyle = ((k >> 1) & 1) ? P.white : P.gray; c.fillRect(ox + 1, oy + k, 2, 1); c.fillStyle = P.black; c.fillRect(ox + 3, oy + k, 1, 1); }
      if (exposed(rt, "l")) for (k = 0; k < 16; k++) { c.fillStyle = P.black; c.fillRect(ox + 15, oy + k, 1, 1); c.fillStyle = ((k >> 1) & 1) ? P.white : P.gray; c.fillRect(ox + 13, oy + k, 2, 1); c.fillStyle = P.black; c.fillRect(ox + 12, oy + k, 1, 1); }
    }
    zn.plats.forEach(function (s) {
      var x0 = Math.round(s.x1 / 2), w = Math.round((s.x2 - s.x1) / 2), y0 = Math.round((s.y1 - zn.y0) / 2);
      c.fillStyle = P.black; c.fillRect(x0, y0 - 1, w, 4); c.fillStyle = b === 4 ? P.white : P.brown2; c.fillRect(x0, y0, w, 2); c.fillStyle = b === 4 ? P.gray : P.yellow; c.fillRect(x0, y0, w, 1);
    });
    zn.layer = cv; return cv;
  }

  function drawBumper(m) {
    var f = m.flash > 0.1;
    if (m.kind === "pad") { disc(m.x + 3, m.y + 5, m.r, "rgba(0,0,0,.3)"); disc(m.x, m.y, m.r + 3, P.black); disc(m.x, m.y, m.r, f ? P.white : P.water); disc(m.x, m.y, m.r * 0.7, f ? P.waterHi : P.waterEdge); line(m.x - m.r * 0.5, m.y, m.x + m.r * 0.5, m.y, 1, P.white); return; }
    var k = 1 + (f ? 0.14 : 0), r = m.r * k;
    disc(m.x + 3, m.y + 5, r + 2, "rgba(0,0,0,.32)"); disc(m.x, m.y, r + 3, P.black);
    if (m.kind === "peg") { disc(m.x, m.y, r, f ? P.yellow : P.gray2); disc(m.x - r * 0.3, m.y - r * 0.3, Math.max(2, r * 0.35), P.white); return; }
    disc(m.x, m.y, r, P.cream); disc(m.x, m.y, r - 3, f ? P.yellow : P.red);
    var sp = [[-0.4, -0.35, 0.22], [0.35, -0.4, 0.17], [0.42, 0.3, 0.2], [-0.35, 0.4, 0.16], [0, 0.0, 0.14]];
    for (var i = 0; i < sp.length; i++) disc(m.x + sp[i][0] * r, m.y + sp[i][1] * r, Math.max(2, sp[i][2] * r * 0.9), P.white);
  }
  function drawFlipper(f) {
    var L = 92, tx = f.px + f.s * L * Math.cos(f.a), ty = f.py + L * Math.sin(f.a);
    line(f.px, f.py, tx, ty, 9, P.black); line(f.px, f.py, tx, ty, 7, P.brown2); line(f.px, f.py - 2, tx, ty - 2, 2, P.yellow);
    disc(f.px, f.py, 11, P.black); disc(f.px, f.py, 9, P.orange); disc(f.px, f.py, 4, P.cream);
  }
  function drawBall(b, big) { var r = 14 * (big ? 1.12 : 1), ox = big ? 6 : 3; disc(b.x + ox, b.y + ox + 2, r, "rgba(0,0,0,.35)"); disc(b.x, b.y, r + 2, P.black); disc(b.x, b.y, r, P.white); disc(b.x + 3, b.y + 3, r * 0.6, P.gray); disc(b.x - r * 0.35, b.y - r * 0.4, 3, P.white); }
  function drawMob(m, t) {
    var p = mobPos(m, t); if (!m.alive || !p.up) return;
    var fl = Math.sin(t * 14) > 0;
    if (m.type === "spider") line(p.x, m.y0 - 30, p.x, p.y, 1, P.gray2);
    if (m.type === "mole") rect2(p.x - 18, p.y + 6, 36, 8, P.brown);
    var rows = SP[m.type];
    if (m.type === "bat" && fl) rows = ["...kkk...", "kk.kkk.kk", "kkkkkkkkk", ".kkkwkkk.", "..kkkkk..", "...k.k..."];
    if (m.type === "bee" && fl) rows = [".ww.ww...", ".wwwwww..", "yyyyyyykk", "kkkkkkykk", "yyyyyyyyk", "..yyyyy.."];
    spr(rows, MOBCOL[m.type], p.x, p.y, Math.cos(m.phase + t * m.speed) < 0, 2);
    if (m.flash > 0) { cx.fillStyle = "rgba(255,255,255,.6)"; cx.fillRect(X(p.x) - 8, Y(p.y) - 6, 16, 12); }
  }
  function drawBoss(b, t) {
    if (b.dead) return;
    var p = bossPos(b, t), fl = b.flash > 0;
    disc(p.x + 6, p.y + 12, 46, "rgba(0,0,0,.3)");
    var rows = SP[b.type] || SP.hedgehog, map = fl ? { k: "#fff", d: "#fff", b: "#fff", c: "#fff", e: "#fff", p: "#fff", w: "#fff", y: "#fff" } : (MOBCOL[b.type] || MOBCOL.hedgehog);
    spr(rows, map, p.x, p.y, Math.cos(t * b.speed) < 0, 5);
    cx.fillStyle = P.red; cx.fillRect(X(p.x) - 6, Y(p.y) - 8, 3, 2); cx.fillRect(X(p.x) + 3, Y(p.y) - 8, 3, 2);
    if (b.type === "spider") { cx.fillStyle = P.yellow; cx.fillRect(X(p.x) - 6, Y(p.y) - 22, 12, 3); cx.fillRect(X(p.x) - 6, Y(p.y) - 26, 3, 4); cx.fillRect(X(p.x) - 1, Y(p.y) - 26, 3, 4); cx.fillRect(X(p.x) + 4, Y(p.y) - 26, 3, 4); }
    var bw = 40, bx = X(p.x) - bw / 2, by = Y(p.y) - 36;
    cx.fillStyle = P.black; cx.fillRect(bx - 1, by - 1, bw + 2, 5); cx.fillStyle = P.gray2; cx.fillRect(bx, by, bw, 3); cx.fillStyle = P.red2; cx.fillRect(bx, by, Math.round(bw * b.hp / b.max), 3);
  }

  function render(c, view) {
    cx = c; var W = view.world, t = view.t, i, j, zi;
    CAMX = view.camX; CAMY = view.camY; cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
    cx.fillStyle = P.black; cx.fillRect(0, 0, view.pxW, view.pxH);
    var zmin = Math.max(0, Math.floor((W.worldH - (CAMY + view.H)) / ZH)), zmax = Math.min(W.n - 1, Math.floor((W.worldH - CAMY) / ZH));
    for (zi = zmin; zi <= zmax; zi++) { var zl = W.zones[zi]; if (!zl.layer) buildZoneLayer(W, zl); cx.drawImage(zl.layer, -Math.round(CAMX / 2), Math.round((zl.y0 - CAMY) / 2)); }
    for (zi = zmin; zi <= zmax; zi++) {
      var z = W.zones[zi];
      z.winds.forEach(function (w) {
        var x0 = w.c0 * CS, x1 = (w.c1 + 1) * CS, y0 = z.y0 + w.r0 * CS, y1 = z.y0 + (w.r1 + 1) * CS;
        rect2(x0, y0, x1 - x0, y1 - y0, "rgba(255,255,255,.14)");
        for (j = 0; j < 9; j++) { var yy = y1 - ((t * 240 + j * 70) % (y1 - y0)), xx = x0 + 10 + ((j * 37) % (x1 - x0 - 20)); rect2(xx, yy, 2, 10, P.white); rect2(xx + 6, yy + 22, 2, 8, P.waterHi); }
      });
      z.flags.forEach(function (f) { rect2(f.x - 1, f.y - 40, 3, 50, P.white); rect2(f.x + 2, f.y - 40, 20, 14, f.hit ? P.yellow : P.red); rect2(f.x + 2, f.y - 40, 20, 3, f.hit ? P.limeHi : P.red2); });
      z.launchers.forEach(function (l) {
        var ang = Math.atan2(l.vy, l.vx);
        var off = l.gate && !l.gate.open;
        disc(l.x, l.y + 8, 26, P.black); disc(l.x, l.y + 8, 22, off ? P.stone3 : P.stone2);
        line(l.x, l.y + 6, l.x + Math.cos(ang) * 28, l.y + 6 + Math.sin(ang) * 28, 16, P.black); line(l.x, l.y + 6, l.x + Math.cos(ang) * 26, l.y + 6 + Math.sin(ang) * 26, 11, P.stone3);
        disc(l.x, l.y + 6, 9, P.black); disc(l.x, l.y + 6, 5, off ? P.gray2 : (Math.sin(t * 8) > 0 ? P.yellow : P.orange2));
      });
      z.gates.forEach(function (gt) { if (gt.open) return; gt.cells.forEach(function (q) { var gx = q[0] * CS, gy = z.y0 + q[1] * CS; rect2(gx, gy, 32, 32, P.black); rect2(gx + 2, gy + 2, 28, 28, P.brown2); rect2(gx + 4, gy + 4, 6, 24, P.brown); rect2(gx + 14, gy + 4, 6, 24, P.brown); rect2(gx + 24, gy + 4, 4, 24, P.brown); }); });
      for (j = 0; j < z.bumpers.length; j++) drawBumper(z.bumpers[j]);
      for (j = 0; j < z.bonuses.length; j++) { var bo = z.bonuses[j]; if (bo.got) continue; var bob = Math.sin(t * 4 + j) * 3; disc(bo.x, bo.y + 12, 9, "rgba(0,0,0,.25)"); spr(BON[bo.type].rows, BON[bo.type].map, bo.x, bo.y + bob, false, 2); }
      for (j = 0; j < z.mobs.length; j++) drawMob(z.mobs[j], t);
      for (j = 0; j < z.bosses.length; j++) drawBoss(z.bosses[j], t);
      for (j = 0; j < z.flippers.length; j++) drawFlipper(z.flippers[j]);
      if (z.goalCell && z.i === W.n - 1) {
        var gy = z.goalCell.y + Math.sin(t * 3) * 3; disc(z.goalCell.x, gy, 44, "rgba(255,220,100," + (0.2 + 0.1 * Math.sin(t * 4)) + ")");
        spr(["...nn...", "..bbbb..", ".bbbbbb.", "bbbbbbbb", "yyyyyyyy", "yyywwyyy", ".yywyyy.", ".yyyyyy.", "..yyyy..", "...yy..."], { n: "#7a4b00", b: "#a8691a", y: "#f6c445", w: "#ffffff" }, z.goalCell.x, gy, false, 3);
      }
    }
    for (i = 0; i < view.balls.length; i++) {
      var bl = view.balls[i]; if (bl.mode === "warp" || bl.mode === "cannon") continue;
      for (j = 0; j < bl.trail.length - 1; j++) if (j % 2) { cx.fillStyle = "rgba(255,255,255," + (j / bl.trail.length * 0.3) + ")"; cx.fillRect(X(bl.trail[j].x) - 2, Y(bl.trail[j].y) - 2, 4, 4); }
      drawBall(bl, false);
    }
    for (i = 0; i < view.particles.length; i++) { var pa = view.particles[i]; cx.globalAlpha = Math.max(0, pa.life); cx.fillStyle = pa.col; cx.fillRect(X(pa.x), Y(pa.y), Math.max(1, Math.round(pa.size / 2)), Math.max(1, Math.round(pa.size / 2))); }
    cx.globalAlpha = 1; cx.font = "bold 8px monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
    for (i = 0; i < view.popups.length; i++) { var po = view.popups[i]; cx.globalAlpha = Math.max(0, Math.min(1, po.life * 1.5)); cx.fillStyle = P.black; cx.fillText(po.text, X(po.x) + 1, Y(po.y) + 1); cx.fillStyle = P.white; cx.fillText(po.text, X(po.x), Y(po.y)); }
    cx.globalAlpha = 1;
    if (view.drama > 0) { var a2 = Math.min(0.55, view.drama * 0.5); cx.fillStyle = "rgba(216,50,43," + a2 * 0.45 + ")"; cx.fillRect(0, 0, view.pxW, view.pxH); cx.fillStyle = "rgba(20,20,30," + a2 + ")"; cx.fillRect(0, 0, view.pxW, 18); cx.fillRect(0, view.pxH - 18, view.pxW, 18); }
    if (view.bannerT > 0) {
      var bb = Math.min(1, view.bannerT * 2); cx.globalAlpha = bb; cx.fillStyle = P.black; cx.fillRect(0, 36, view.pxW, 24);
      cx.fillStyle = view.bannerCol || P.yellow; cx.font = "bold 11px monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(view.banner, view.pxW / 2, 44);
      cx.fillStyle = P.white; cx.font = "bold 7px monospace"; cx.fillText(view.banner2 || "", view.pxW / 2, 55); cx.globalAlpha = 1;
    }
    for (i = 0; i < view.hearts; i++) { cx.fillStyle = P.black; cx.fillRect(4 + i * 10, 4, 9, 8); cx.fillStyle = P.red2; cx.fillRect(5 + i * 10, 5, 7, 6); cx.fillStyle = P.white; cx.fillRect(6 + i * 10, 6, 2, 2); }
    var frac = Math.max(0, Math.min(1, view.progress)); cx.fillStyle = P.black; cx.fillRect(3, 40, 4, 120); cx.fillStyle = P.gray2; cx.fillRect(4, 41, 2, 118); cx.fillStyle = P.yellow; cx.fillRect(4, 159 - Math.round(118 * frac), 2, Math.round(118 * frac)); cx.fillStyle = P.white; cx.fillRect(2, 159 - Math.round(118 * frac) - 1, 6, 2);
  }

  function preview(zi) { return Z[zi]().g.map(function (r) { return r.join(""); }).join("\n"); }
  root.FlippersClimb = { build: build, render: render, mobPos: mobPos, bossPos: bossPos, BIOMES: BIOMES, ZH: ZH, CS: CS, COLS: COLS, BON: BON, preview: preview, zoneCount: function () { return Z.length; } };
})(typeof window !== "undefined" ? window : this);
