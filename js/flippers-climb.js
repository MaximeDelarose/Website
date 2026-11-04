/* =========================================================================
   Flippers · mode Ascension : le monde (50 étages) et son rendu pixel art.
   DA « mini-golf 85 » (comme js/golf.js) : fairway lime en damier, rails
   noir et blanc, forêt de blobs verts autour, image basse résolution
   (240 × 420 px, 1 pixel = 2 unités du monde) agrandie sans lissage.

   Données : FlippersClimb.build({ stages }) → { stages[], worldH, py0, … }.
   Chaque étage k a sa cuvette (2 flippers) en py = py0 − k·SH, une pièce de
   SH = 560 unités au-dessus, un moyen de monter (rampe, canon, portail ou
   tornade), des obstacles (champignons, moulins, glissières, corniches,
   trampolines), des mobs qui bougent, des bonus. Les étages 10, 20, 30 et 40
   sont des camps de base (trampoline sous les flippers : on n'y tombe pas
   plus bas). Les coordonnées sont celles du moteur (flippers.js).
   Rendu : FlippersClimb.render(c, V).
   ========================================================================= */
(function (root) {
  "use strict";
  var SH = 560, SUMMIT = 640, WORLD_PAD = 140, X0 = 24, X1 = 420, X2 = 456, G = 900;
  var BIOMES = [
    { id: "prairie", name: "Prairie" }, { id: "bois", name: "Sous-bois" }, { id: "marais", name: "Marais" },
    { id: "falaises", name: "Falaises" }, { id: "nuages", name: "Nuages" },
  ];
  var OBST_NAMES = ["Clairière", "Le Moulin", "Le Balancier", "Les Corniches", "Champ de piquets", "Les Jumeaux", "Les Trampolines"];
  var TRANS_NAMES = ["Rampe", "Canon", "Portail", "Tornade"];
  var MOB_BY_BIOME = [["hedgehog", "bee"], ["spider", "hedgehog"], ["bat", "frog"], ["mole", "bat"], ["bee", "bat"]];

  // étages réglés à la main après mesure (tirs aléatoires : taux de réussite trop bas) : 1 = bouche élargie, 2 = en plus plus d'obstacles
  var EASE = { 0: 2, 1: 2, 6: 1, 8: 1, 10: 1, 12: 1, 23: 1, 26: 1, 32: 1, 39: 1, 48: 1 };
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // motion d'un mob à l'instant t (secondes) : position et visibilité
  function mobPos(m, t) {
    var u = m.phase + t * m.speed;
    if (m.motion === "patrol") return { x: (m.x0 + m.x1) / 2 + (m.x1 - m.x0) / 2 * Math.sin(u), y: m.y, up: true };
    if (m.motion === "bob") return { x: m.x, y: (m.y0 + m.y1) / 2 + (m.y1 - m.y0) / 2 * Math.sin(u), up: true };
    if (m.motion === "sine") return { x: (m.x0 + m.x1) / 2 + (m.x1 - m.x0) / 2 * Math.sin(u), y: m.y + m.amp * Math.sin(u * 2.3), up: true };
    var ph = ((u / 6.2832) % 1 + 1) % 1;                    // pop : la taupe sort de son trou
    return { x: m.x, y: m.y, up: ph < 0.62 };
  }
  function armAngle(a, t) { return a.phase + a.w * t; }
  function sliderX(s, t) { return (s.x0 + s.x1) / 2 + (s.x1 - s.x0) / 2 * Math.sin(s.phase + s.speed * t); }

  var LAYOUTS = [
    [[150, 260, 24], [294, 260, 24], [222, 360, 24]],
    [[130, 300, 18], [190, 300, 18], [254, 300, 18], [314, 300, 18]],
    [[222, 240, 22], [150, 330, 22], [294, 330, 22], [222, 420, 22]],
    [[140, 230, 22], [200, 300, 22], [260, 370, 22], [320, 440, 22]],
    [[160, 300, 30], [284, 390, 30]],
    [[222, 270, 12], [292, 340, 12], [222, 410, 12], [152, 340, 12], [222, 340, 12]],
    [[150, 450, 22], [222, 450, 22], [294, 450, 22], [222, 240, 24]],
    [[222, 300, 26]],
  ];

  function build(cfg) {
    cfg = cfg || {};
    var N = cfg.stages || 50, rnd = mulberry(cfg.seed || 1985);
    var PY0 = SUMMIT + (N - 1) * SH, WORLD_H = PY0 + WORLD_PAD;
    var W = { N: N, SH: SH, py0: PY0, worldH: WORLD_H, plungerY: PY0 + 60, laneMinY: PY0 - 440, stages: [], X0: X0, X1: X1, X2: X2, goal: { x: 222, y: 96 } };
    var used = {}, k;
    function seg(st, x1, y1, x2, y2, o) { o = o || {}; st.segs.push({ x1: x1, y1: y1, x2: x2, y2: y2, e: o.e != null ? o.e : 0.35, r: o.r != null ? o.r : 2.5, oneWay: !!o.oneWay, sling: null, kind: o.kind || "wall" }); }
    for (k = 0; k < N; k++) {
      var py = PY0 - k * SH, b = Math.min(4, Math.floor(k * 5 / N));
      var st = { k: k, py: py, top: py - SH, biome: b, segs: [], bumpers: [], arms: [], sliders: [], mobs: [], bonuses: [], flippers: [], transport: null, camp: (k === 3 || (k > 0 && k % 10 === 0)) && k < N - 1, side: k % 2 === 0 ? "L" : "R", summit: k === N - 1 };
      // combinaison unique (disposition × obstacle × transport)
      var L = k % 8, O = (k * 3 + Math.floor(k / 8)) % 7, T = (k * 2 + Math.floor(k / 5)) % 4, guard = 0;
      while (used[L + "-" + O + "-" + T] && guard++ < 60) { O = (O + 1) % 7; if (guard % 7 === 0) L = (L + 1) % 8; if (guard % 11 === 0) T = (T + 1) % 4; }
      used[L + "-" + O + "-" + T] = 1;
      if (k === 0) { O = 0; T = 0; L = 7; } else if (k === N - 1) { T = 0; O = 5; L = 2; }
      if (((k + 1 === 3) || ((k + 1) % 10 === 0 && k + 1 < N - 1)) && (T === 1 || T === 3)) T = T === 1 ? 0 : 2;   // le trampoline du camp bloquerait un canon ou une tornade
      st.L = L; st.O = O; st.T = T;
      st.name = (k === 0 ? "Départ · " : st.camp ? "Camp de base · " : st.summit ? "Sommet · " : "") + BIOMES[b].name + " · " + OBST_NAMES[O] + (k < N - 1 ? " & " + TRANS_NAMES[T] : "");
      var flip = st.side === "L";
      function fx(x) { return flip ? 444 - x : x; }
      // murs et cuvette
      seg(st, X0, py - 90 - SH, X0, py - 90);
      if (k === 0) {
        seg(st, X1, py - 90 - SH, X1, py - 460);
        seg(st, X1, py - 460, X1, py - 380, { oneWay: true });
        seg(st, X1, py - 380, X1, py + 90);
        seg(st, X2, py - 380, X2, py + 90);
        seg(st, X1, py + 90, X2, py + 90);
        var qc = { x: X2 - 80, y: py - 380 };
        for (var qi = 0; qi < 12; qi++) {
          var b1 = -Math.PI / 2 * qi / 12, b2 = -Math.PI / 2 * (qi + 1) / 12;
          seg(st, qc.x + Math.cos(b1) * 80, qc.y + Math.sin(b1) * 80, qc.x + Math.cos(b2) * 80, qc.y + Math.sin(b2) * 80, { kind: "arc" });
        }
      } else seg(st, X1, py - 90 - SH, X1, py - 90);
      seg(st, X0, py - 90, 104, py, { e: 0.2, kind: "slope" });
      seg(st, X1, py - 90, 340, py, { e: 0.2, kind: "slope" });
      st.flippers.push({ px: 104, py: py, s: 1, a: 0.5, w: 0, key: "left", k: k }, { px: 340, py: py, s: -1, a: 0.5, w: 0, key: "right", k: k });
      if (st.camp) st.bumpers.push({ x: 222, y: py + 72, r: 40, kind: "pad", flash: 0, camp: true });
      // champignons
      LAYOUTS[L].forEach(function (q) { st.bumpers.push({ x: fx(q[0]), y: py - q[1], r: q[2], kind: q[2] <= 14 ? "peg" : "mush", flash: 0 }); });
      // obstacle
      if (O === 1) st.arms.push({ x: 222, y: py - 410, len: 66, w: (k % 2 ? 1 : -1) * (1.2 + k * 0.012), phase: rnd() * 6, kind: "windmill" });
      if (O === 5) { st.arms.push({ x: 140, y: py - 390, len: 44, w: 1.5, phase: 0, kind: "windmill" }, { x: 304, y: py - 390, len: 44, w: -1.5, phase: 2, kind: "windmill" }); }
      if (O === 2) st.sliders.push({ y: py - 225, x0: 150, x1: 294, hw: 30, speed: 1.2 + k * 0.01, phase: rnd() * 6, r: 7 });
      if (O === 3) {
        seg(st, X0, py - 440, 104, py - 404, { kind: "ledge" });
        seg(st, X1, py - 440, 340, py - 404, { kind: "ledge" });
      }
      if (O === 4) for (var pi = 0; pi < 7; pi++) st.bumpers.push({ x: 110 + (pi % 4) * 70 + (Math.floor(pi / 4) ? 35 : 0), y: py - 250 - Math.floor(pi / 4) * 90 - (pi % 2) * 20, r: 9, kind: "peg", flash: 0 });
      if (O === 6) { st.bumpers.push({ x: fx(130), y: py - 200, r: 22, kind: "pad", flash: 0 }, { x: fx(314), y: py - 330, r: 22, kind: "pad", flash: 0 }); seg(st, fx(104), py - 170, fx(156), py - 170, { kind: "ledge" }); }
      if (T === 3 && k > 0) {
        st.bumpers = st.bumpers.filter(function (q) { return q.camp || Math.abs(q.x - 222) > 52; });
        st.arms = st.arms.filter(function (a) { return Math.abs(a.x - 222) > 90; });
        st.sliders = [];
      }
      // moyen de monter
      var mx = flip ? 72 : 372, my = py - 330, ex = flip ? 294 : 150;
      if (k === N - 1) {
        st.transport = { type: "ramp", top: true, mouth: { x: mx, y: py - 330, r: 24 }, pts: [[mx, py - 330], [mx, py - 330 - 90], [300, 160], [222, W.goal.y]], speed: 560 };
      } else if (T === 0 || k === 0) {
        st.transport = { type: "ramp", mouth: { x: mx, y: my, r: 30 }, pts: [[mx, my], [mx, my - 100], [(mx + ex) / 2, (my + py - SH - 250) / 2], [ex, py - SH - 250]], speed: 600 };
      } else if (T === 1) {
        var cy = py - 300, rise = 490, vy0 = -Math.sqrt(2 * G * rise), tc = (-vy0 - Math.sqrt(vy0 * vy0 - 2 * G * (SH - 44 - 300))) / G;  // la bille traverse le plan des bouts de flippers du dessus au centre de l'ouverture
        st.transport = { type: "cannon", mouth: { x: mx, y: cy, r: 30 }, vx: (222 - mx) / tc, vy: vy0 };
        // couloir de tir du canon : on dégage la trajectoire balistique (t jusqu'à la traversée de la cuvette du dessus)
        var corridor = [], ct;
        for (ct = 0; ct <= 0.42; ct += 0.03) corridor.push([mx + st.transport.vx * ct, cy + vy0 * ct + 0.5 * G * ct * ct]);
        function nearPath(x, y, rad) { return corridor.some(function (q) { return Math.hypot(q[0] - x, q[1] - y) < rad; }); }
        st.bumpers = st.bumpers.filter(function (q) { return q.camp || !nearPath(q.x, q.y, q.r + 46); });
        st.arms = st.arms.filter(function (a2) { return !nearPath(a2.x, a2.y, a2.len + 46); });
        st.sliders = st.sliders.filter(function (sl2) { return !corridor.some(function (q) { return Math.abs(q[1] - sl2.y) < 40 && q[0] > sl2.x0 - sl2.hw - 20 && q[0] < sl2.x1 + sl2.hw + 20; }); });
        st.cannonCorridor = corridor;
      } else if (T === 2) {
        st.transport = { type: "portal", mouth: { x: flip ? 80 : 364, y: py - 340, r: 28 }, exit: { x: ex, y: py - SH - 240 } };
      } else {
        st.transport = { type: "updraft", x0: 190, x1: 254, y0: py - 90, y1: py - SH - 70, dir: flip ? 1 : -1 };
      }
      var ease = EASE[k] || 0;
      if (ease && st.transport && st.transport.mouth) st.transport.mouth.r += ease === 1 ? 10 : 20;
      if (ease) { st.arms = []; st.sliders = []; }
      if (ease > 1) st.bumpers = st.bumpers.filter(function (q) { return q.camp || q.kind !== "peg"; });
      // mobs
      var nm = k < 3 ? 0 : Math.min(4, 1 + Math.floor((k - 3) / 11) + (k % 3 === 0 ? 1 : 0)), kinds = MOB_BY_BIOME[b], mi;
      for (mi = 0; mi < nm; mi++) {
        var kind = kinds[(k + mi) % 2], my2 = py - (190 + ((k * 37 + mi * 97) % 220)), motion = kind === "spider" ? "bob" : kind === "mole" ? "pop" : kind === "bat" || kind === "bee" ? "sine" : "patrol";
        var mob = { type: kind, motion: motion, r: 15, speed: 0.9 + rnd() * 0.5 + k * 0.01, phase: rnd() * 6, alive: true, dead: 0, flash: 0 };
        if (motion === "patrol" || motion === "sine") { mob.x0 = 100 + (mi % 2) * 60; mob.x1 = 330 - ((mi + 1) % 2) * 60; mob.y = my2; mob.amp = 36; }
        else if (motion === "bob") { mob.x = fx(190 + (mi * 61) % 130); mob.y0 = py - 450; mob.y1 = py - 330 - (mi * 13) % 50; }
        else { mob.x = fx(130 + (mi * 77) % 190); mob.y = py - 120; }
        if (st.cannonCorridor && st.cannonCorridor.some(function (q) { return Math.abs(q[1] - (mob.y != null ? mob.y : (mob.y0 + mob.y1) / 2)) < 60; })) continue;
        st.mobs.push(mob);
      }
      // bonus
      st.bonuses.push({ type: "acorn", x: fx(70), y: py - 440, got: false }, { type: "acorn", x: fx(100), y: py - 470, got: false });
      if (k % 5 === 2) st.bonuses.push({ type: "star", x: fx(222), y: py - 500, got: false });
      if (k % 6 === 4) st.bonuses.push({ type: "net", x: fx(360), y: py - 470, got: false });
      if (k % 7 === 3) st.bonuses.push({ type: "feather", x: fx(80), y: py - 230, got: false });
      if (k % 9 === 8 || k === 20) st.bonuses.push({ type: "heart", x: fx(222), y: py - 330 - (k % 2) * 60, got: false });
      W.stages.push(st);
    }
    return W;
  }

  /* ======================= rendu pixel art ======================= */
  var P = {
    black: "#14141e", white: "#ffffff", gray: "#cdd2dc", gray2: "#9aa0b0", lime: "#a8e63a", lime2: "#96d632", limeHi: "#c6f55c",
    green: "#139a56", green2: "#0e7f49", rough: "#1f8f4e", rough2: "#177a42", tree: "#0b5a33", treeHi: "#34aa5c",
    sand: "#f3eea0", sandDot: "#4a4528", water: "#27a9f1", water2: "#1f98dc", waterHi: "#8dd8ff", waterEdge: "#126aa6",
    yellow: "#f6c445", brown: "#7a4b00", brown2: "#a8691a", red: "#d8322b", red2: "#ef6a52", cream: "#fdf3de", orange: "#e8872a", orange2: "#b05c14",
    stone: "#8a8fa3", stone2: "#7b8096", stone3: "#5d6277", snow: "#eaf6ff", sky: "#9ad8ff", sky2: "#8acff8", purple: "#7a4bd8", pink: "#ff9ec7",
  };
  var GROUND = [[P.lime, P.lime2, P.limeHi], [P.green, P.green2, P.rough], [P.water, P.water2, P.waterHi], [P.stone, P.stone2, P.gray], [P.sky, P.sky2, P.white]];
  var OUTSIDE = [[P.rough, P.rough2, P.tree, P.treeHi], [P.rough2, P.tree, P.black, P.rough], [P.green2, P.rough2, P.tree, P.green], [P.stone3, P.stone2, P.snow, P.gray], [P.white, P.gray, P.sky2, P.snow]];

  function hash(x, y) { var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

  var V = null, cx = null, CAM = 0;
  function X(x) { return Math.round(x / 2); }
  function Y(y) { return Math.round((y - CAM) / 2); }
  function rect(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(X(x), Y(y), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); }
  function pr(px, py, w, h, col) { cx.fillStyle = col; cx.fillRect(px, py, w, h); }       // en pixels écran
  function disc(x, y, r, col) {                                                           // r en unités du monde
    var xx = X(x), yy = Y(y), rr = Math.max(1, Math.round(r / 2));
    cx.fillStyle = col;
    for (var dy = -rr; dy <= rr; dy++) { var w = Math.floor(Math.sqrt(rr * rr + rr * 0.8 - dy * dy)); cx.fillRect(xx - w, yy + dy, 2 * w + 1, 1); }
  }
  function ring(x, y, r, col) {
    var xx = X(x), yy = Y(y), rr = Math.max(1, Math.round(r / 2)), n = Math.max(12, rr * 6);
    cx.fillStyle = col;
    for (var i = 0; i < n; i++) { var a = i / n * 6.2832; cx.fillRect(Math.round(xx + Math.cos(a) * rr), Math.round(yy + Math.sin(a) * rr), 1, 1); }
  }
  function line(x1, y1, x2, y2, th, colFn) {
    var a = X(x1), b = Y(y1), c2 = X(x2), d = Y(y2), n = Math.max(1, Math.max(Math.abs(c2 - a), Math.abs(d - b)));
    for (var i = 0; i <= n; i++) { cx.fillStyle = typeof colFn === "string" ? colFn : colFn(i, n); cx.fillRect(Math.round(a + (c2 - a) * i / n - th / 2), Math.round(b + (d - b) * i / n - th / 2), th, th); }
  }
  // sprite : lignes de caractères, 1 caractère = 1 pixel ; map = { caractère: couleur }
  function spr(rows, map, x, y, flipX, sc) {
    sc = sc || 1;
    var w = rows[0].length, ox = X(x) - Math.floor(w * sc / 2), oy = Y(y) - Math.floor(rows.length * sc / 2);
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < w; c++) {
      var ch = rows[r].charAt(flipX ? w - 1 - c : c); if (ch === "." || !map[ch]) continue;
      cx.fillStyle = map[ch]; cx.fillRect(ox + c * sc, oy + r * sc, sc, sc);
    }
  }
  function stageAt(W, y) { return Math.max(0, Math.min(W.N - 1, Math.floor((W.py0 - y) / SH))); }

  /* ---- sprites ---- */
  var SP = {
    hedgehog: ["..kkkkk...", ".kdkdkdkk.", "kdkdkdkdkk", "kddddddddc", "kbbbbbbbce", ".bb.bb.bb."],
    bee: ["..ww.ww..", ".wwwwwww.", "yyyyyyykk", "kkkkkkykk", "yyyyyyyyk", "..yyyyy.."],
    spider: ["k.k...k.k", ".kk.k.kk.", "..kpppk..", "kkkpwpkkk", "..kpppk..", ".k.kkk.k."],
    bat: ["kk.....kk", "kkk...kkk", "kkkkkkkkk", ".kkkwkkk.", "..kkkkk..", "...k.k..."],
    frog: ["..gg.gg..", ".gwgggwg.", "gggggggg.", "gggggggg.", ".gg.g.gg.", "g.g...g.g"],
    mole: ["..bbbbb..", ".bbbbbbb.", "bbwbbbwbb", "bbbppbbbb", ".bbbbbbb.", "..b...b.."],
  };
  var MOBCOL = {
    hedgehog: { k: "#14141e", d: "#7a4b00", b: "#a8691a", c: "#f3eea0", e: "#14141e" },
    bee: { w: "#ffffff", y: "#f6c445", k: "#14141e" },
    spider: { k: "#14141e", p: "#7a4bd8", w: "#ffffff" },
    bat: { k: "#3a2a5a", w: "#ffffff" },
    frog: { g: "#34c25a", w: "#ffffff" },
    mole: { b: "#7a4b00", w: "#ffffff", p: "#ff9ec7" },
  };
  var BON = {
    acorn: { rows: ["..nn..", ".bbbb.", "bbbbbb", "yyyyyy", ".yyyy.", "..yy.."], map: { n: "#7a4b00", b: "#a8691a", y: "#f6c445" } },
    star: { rows: ["...y...", "...y...", "yyyyyyy", ".yyyyy.", "..yyy..", ".yy.yy.", "yy...yy"], map: { y: "#f6c445" } },
    net: { rows: ["w.w.w.w", ".wwwww.", "wwwcwww", ".wwwww.", "w.w.w.w"], map: { w: "#ffffff", c: "#9aa0b0" } },
    feather: { rows: ["....bb", "...bbb", "..bbbw", ".bbbw.", "bbbw..", "bw...."], map: { b: "#9ad8ff", w: "#ffffff" } },
    heart: { rows: [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], map: { r: "#d8322b" } },
  };

  function drawGroundBand(c0, c1, biome) {
    // damier du fairway (cellules de 8 px, comme le golf)
    var pal = GROUND[biome], camPx = Math.floor(CAM / 2);
    var yTop = Math.max(0, Math.floor((c0 - CAM) / 2)), yBot = Math.min(V.pxH, Math.ceil((c1 - CAM) / 2));
    if (yBot <= yTop) return;
    var absTop = camPx + yTop, absBot = camPx + yBot;
    for (var r = Math.floor(absTop / 8); r <= Math.floor((absBot - 1) / 8); r++) {
      var ya = Math.max(absTop, r * 8) - camPx, yb = Math.min(absBot, (r + 1) * 8) - camPx;
      for (var gx = 1; gx < 27; gx++) {
        var x0 = Math.max(13, gx * 8), x1 = Math.min(209, (gx + 1) * 8);
        if (x1 <= x0) continue;
        cx.fillStyle = ((gx + r) & 1) ? pal[0] : pal[1]; cx.fillRect(x0, ya, x1 - x0, yb - ya);
      }
    }
  }
  function drawOutside(c0, c1, biome) {
    var pal = OUTSIDE[biome], y0 = Math.max(0, Math.floor((c0 - CAM) / 2)), y1 = Math.min(V.pxH, Math.ceil((c1 - CAM) / 2));
    if (y1 <= y0) return;
    cx.fillStyle = pal[0]; cx.fillRect(0, y0, 12, y1 - y0); cx.fillRect(210, y0, 30, y1 - y0);
    var base = Math.floor(CAM / 2);
    for (var py = y0; py < y1; py++) {
      var ay = base + py;
      for (var s = 0; s < 2; s++) {
        var xs = s ? 210 : 0, xe = s ? 240 : 12;
        for (var px = xs; px < xe; px++) {
          var cxl = Math.floor(px / 8), cyl = Math.floor(ay / 8), col = null;
          if (hash(cxl + s * 31, cyl) < 0.6) {
            var tx = cxl * 8 + 3 + Math.floor(hash(cxl + 7, cyl) * 3), ty = cyl * 8 + 3 + Math.floor(hash(cxl, cyl + 9) * 3), dx = px - tx, dy = ay - ty, d2 = dx * dx + dy * dy;
            if (d2 <= 9) col = d2 <= 2 && dx <= 0 && dy <= 0 ? pal[3] : pal[2];
          }
          if (!col) col = hash(px, ay) < 0.16 ? pal[1] : pal[0];
          cx.fillStyle = col; cx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
  function drawRails(c0, c1) {
    var y0 = Math.max(0, Math.floor((c0 - CAM) / 2)), y1 = Math.min(V.pxH, Math.ceil((c1 - CAM) / 2)), base = Math.floor(CAM / 2);
    for (var py = y0; py < y1; py++) {
      var st = ((base + py) >> 1) & 1;
      pr(9, py, 1, 1, P.black); pr(10, py, 2, 1, st ? P.white : P.gray); pr(12, py, 1, 1, P.black);
      pr(209, py, 1, 1, P.black); pr(210, py, 2, 1, st ? P.white : P.gray);
    }
  }
  function drawPolyRail(x1, y1, x2, y2, th) {
    line(x1, y1, x2, y2, th + 2, P.black);
    line(x1, y1, x2, y2, th, function (i) { return (i >> 1) & 1 ? P.white : P.gray; });
  }

  function decor(W, st) {
    var b = st.biome, k = st.k, n = 16, i;
    for (i = 0; i < n; i++) {
      var hx = 40 + hash(k, i) * 340, hy = st.py - 40 - hash(i, k + 90) * (SH - 80), t = hash(k + 5, i + 3);
      if (b === 0) { if (t < 0.5) { rect(hx, hy, 4, 4, P.limeHi); rect(hx + 2, hy - 2, 2, 2, P.yellow); } else if (t < 0.8) { rect(hx, hy, 6, 2, P.green); rect(hx + 2, hy - 2, 2, 2, P.green); } else { rect(hx, hy, 8, 6, P.sand); rect(hx + 2, hy + 2, 2, 2, P.sandDot); } }
      else if (b === 1) { if (t < 0.5) { rect(hx, hy, 6, 4, P.red); rect(hx + 2, hy, 2, 2, P.white); rect(hx + 2, hy + 4, 2, 4, P.cream); } else { rect(hx, hy, 8, 4, P.tree); rect(hx + 2, hy - 2, 4, 2, P.treeHi); } }
      else if (b === 2) { if (t < 0.5) { rect(hx, hy, 10, 6, P.green); rect(hx + 2, hy + 2, 6, 2, P.lime); rect(hx + 8, hy, 2, 2, P.water); } else { rect(hx, hy, 2, 10, P.green2); rect(hx + 4, hy + 2, 2, 8, P.green); rect(hx + 8, hy + 4, 2, 6, P.green2); } }
      else if (b === 3) { if (t < 0.5) { rect(hx, hy, 8, 6, P.stone3); rect(hx, hy, 8, 2, P.gray); } else { rect(hx, hy, 6, 8, P.purple); rect(hx + 2, hy - 2, 2, 2, P.pink); rect(hx + 2, hy + 2, 2, 4, P.white); } }
      else { rect(hx, hy, 40, 8, P.white); rect(hx + 8, hy - 6, 24, 6, P.white); rect(hx + 4, hy + 8, 28, 4, P.gray); }
    }
  }

  function drawBumper(m) {
    var f = m.flash > 0.1;
    if (m.kind === "pad") {
      disc(m.x + 3, m.y + 5, m.r, "rgba(0,0,0,.3)");
      disc(m.x, m.y, m.r + 3, P.black); disc(m.x, m.y, m.r, f ? P.white : P.water); disc(m.x, m.y, m.r * 0.7, f ? P.waterHi : P.waterEdge);
      line(m.x - m.r * 0.5, m.y, m.x + m.r * 0.5, m.y, 1, P.white); line(m.x, m.y - m.r * 0.5, m.x, m.y + m.r * 0.5, 1, P.white);
      return;
    }
    var k = 1 + (f ? 0.14 : 0), r = m.r * k;
    disc(m.x + 3, m.y + 5, r + 2, "rgba(0,0,0,.32)");
    disc(m.x, m.y, r + 3, P.black);
    if (m.kind === "peg") { disc(m.x, m.y, r, f ? P.yellow : P.gray2); disc(m.x - r * 0.3, m.y - r * 0.3, Math.max(2, r * 0.35), P.white); return; }
    disc(m.x, m.y, r, P.cream); disc(m.x, m.y, r - 3, f ? P.yellow : P.red);
    var sp = [[-0.4, -0.35, 0.22], [0.35, -0.4, 0.17], [0.42, 0.3, 0.2], [-0.35, 0.4, 0.16], [0, 0.0, 0.14]];
    for (var i = 0; i < sp.length; i++) disc(m.x + sp[i][0] * r, m.y + sp[i][1] * r, Math.max(2, sp[i][2] * r * 0.9), P.white);
  }
  function drawFlipper(f) {
    var L = 92, tx = f.px + f.s * L * Math.cos(f.a), ty = f.py + L * Math.sin(f.a);
    line(f.px, f.py, tx, ty, 9, P.black);
    line(f.px, f.py, tx, ty, 7, P.brown2);
    line(f.px + 0, f.py - 2, tx, ty - 2, 2, P.yellow);
    disc(f.px, f.py, 11, P.black); disc(f.px, f.py, 9, P.orange); disc(f.px, f.py, 4, P.cream);
  }
  function drawBall(b, big) {
    var r = 14 * (big ? 1.12 : 1), ox = big ? 6 : 3;
    disc(b.x + ox, b.y + ox + 2, r, "rgba(0,0,0,.35)");
    disc(b.x, b.y, r + 2, P.black); disc(b.x, b.y, r, P.white); disc(b.x + 3, b.y + 3, r * 0.6, P.gray); disc(b.x - r * 0.35, b.y - r * 0.4, 3, P.white);
  }
  function drawMob(m, t) {
    var p = mobPos(m, t); if (!m.alive || !p.up) return;
    var fl = Math.sin(t * 14) > 0;
    if (m.type === "spider") { line(p.x, m.y0 - 30, p.x, p.y, 1, P.gray2); }
    if (m.type === "mole") { rect(p.x - 18, p.y + 6, 36, 8, P.brown); }
    var rows = SP[m.type];
    if (m.type === "bat" && fl) rows = ["...kkk...", "kk.kkk.kk", "kkkkkkkkk", ".kkkwkkk.", "..kkkkk..", "...k.k..."];
    if (m.type === "bee" && fl) rows = [".ww.ww...", ".wwwwww..", "yyyyyyykk", "kkkkkkykk", "yyyyyyyyk", "..yyyyy.."];
    var dir = Math.cos(m.phase + t * m.speed) < 0;
    spr(rows, MOBCOL[m.type], p.x, p.y, dir, 2);
    if (m.flash > 0) { cx.fillStyle = "rgba(255,255,255,.6)"; cx.fillRect(X(p.x) - 8, Y(p.y) - 6, 16, 12); }
  }

  function drawTransport(st, t) {
    var tr = st.transport; if (!tr) return;
    if (tr.type === "ramp") {
      var P2 = tr.pts, i, n = 0;
      for (i = 1; i < P2.length; i++) { line(P2[i - 1][0] + 7, P2[i - 1][1] + 10, P2[i][0] + 7, P2[i][1] + 10, 8, "rgba(0,0,0,.28)"); }
      for (i = 1; i < P2.length; i++) { line(P2[i - 1][0], P2[i - 1][1], P2[i][0], P2[i][1], 11, P.black); }
      for (i = 1; i < P2.length; i++) { line(P2[i - 1][0], P2[i - 1][1], P2[i][0], P2[i][1], 9, P.gray2); }
      for (i = 1; i < P2.length; i++) { line(P2[i - 1][0], P2[i - 1][1], P2[i][0], P2[i][1], 3, P.white); }
      var mo = tr.mouth; disc(mo.x, mo.y + 4, mo.r + 8, P.black); disc(mo.x, mo.y + 4, mo.r + 5, P.stone3);
      var on = Math.sin(t * 8) > 0; disc(mo.x, mo.y + 30, 6, on ? P.yellow : P.orange2);
      var last = P2[P2.length - 1]; disc(last[0], last[1], 8, P.black); disc(last[0], last[1], 6, P.gray);
    } else if (tr.type === "cannon") {
      var m = tr.mouth, ang = Math.atan2(tr.vy, tr.vx);
      disc(m.x, m.y, m.r + 6, P.black); disc(m.x, m.y, m.r + 3, P.stone2);
      line(m.x, m.y, m.x + Math.cos(ang) * 40, m.y + Math.sin(ang) * 40, 22, P.black); line(m.x, m.y, m.x + Math.cos(ang) * 38, m.y + Math.sin(ang) * 38, 16, P.stone3);
      disc(m.x, m.y, 12, P.black); disc(m.x + Math.cos(ang) * 38, m.y + Math.sin(ang) * 38, 7, P.black);
      disc(m.x, m.y + 30, 6, Math.sin(t * 8) > 0 ? P.yellow : P.orange2);
    } else if (tr.type === "portal") {
      var q = tr.mouth, e = tr.exit;
      [q, e].forEach(function (o, idx) {
        var rr = (idx ? 22 : q.r) + Math.sin(t * 6 + idx) * 2;
        disc(o.x, o.y, rr + 5, P.black); disc(o.x, o.y, rr + 2, P.purple); disc(o.x, o.y, rr - 4, P.pink); disc(o.x, o.y, rr - 10, P.black);
        ring(o.x, o.y, rr + 8 + Math.sin(t * 5) * 3, P.white);
      });
    } else if (tr.type === "updraft") {
      var cxm = (tr.x0 + tr.x1) / 2;
      rect(tr.x0, tr.y1, 3, tr.y0 - tr.y1, "rgba(255,255,255,.22)"); rect(tr.x1 - 3, tr.y1, 3, tr.y0 - tr.y1, "rgba(255,255,255,.22)");
      for (var j = 0; j < 14; j++) {
        var yy = tr.y0 - ((t * 260 + j * 60) % (tr.y0 - tr.y1)), xx = cxm + Math.sin(t * 3 + j * 1.7) * 22;
        rect(xx, yy, 2, 10, P.white); rect(xx + 6, yy + 24, 2, 8, P.waterHi);
      }
      // ventilateur
      var fa = t * 12;
      disc(cxm, tr.y0 + 4, 30, P.black); disc(cxm, tr.y0 + 4, 27, P.stone2);
      line(cxm - Math.cos(fa) * 22, tr.y0 + 4 - Math.sin(fa) * 6, cxm + Math.cos(fa) * 22, tr.y0 + 4 + Math.sin(fa) * 6, 5, P.white);
    }
  }

  function render(c, view) {
    V = view; cx = c; CAM = view.camY; var t = view.t, W = view.world, i, k, j;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
    var kmin = stageAt(W, CAM + view.H), kmax = stageAt(W, CAM);
    kmin = Math.max(0, kmin - 1); kmax = Math.min(W.N - 1, kmax + 1);
    // sol et décor, par étage
    for (k = kmin; k <= kmax; k++) {
      var st = W.stages[k], c0 = st.top, c1 = st.py + (k === 0 ? 200 : 0);
      if (k === W.N - 1) c0 = 0;
      drawOutside(c0, c1, st.biome); drawGroundBand(c0, c1, st.biome);
    }
    cx.fillStyle = P.rough2; if (kmin === 0) { var pitY = Y(W.py0 + 90); if (pitY < V.pxH) cx.fillRect(12, Math.max(0, pitY), 198, V.pxH - Math.max(0, pitY)); }
    drawRails(Math.max(0, CAM), CAM + view.H);
    for (k = kmin; k <= kmax; k++) decor(W, W.stages[k]);
    // couloir du ressort (bas de la tour)
    if (kmin === 0) { rect(W.X1, W.py0 - 450, 36, 560, "rgba(0,0,0,.3)"); }
    for (k = kmin; k <= kmax; k++) {
      var s = W.stages[k];
      // numéro d'étage peint au sol
      var num = String(k + 1);
      cx.fillStyle = "rgba(255,255,255,.22)"; cx.font = "bold 34px monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(num, 105, Y(s.py - 520));
      cx.font = "bold 7px monospace"; cx.fillText(Math.round((W.plungerY - s.py) / 20) + " m", 105, Y(s.py - 495));
      if (s.camp) {                                                                         // camp de base : drapeau
        rect(60, s.py - 160, 3, 50, P.white); rect(63, s.py - 160, 22, 14, P.red); rect(63, s.py - 160, 22, 3, P.red2);
        rect(360, s.py - 160, 3, 50, P.white); rect(363, s.py - 160, 22, 14, P.yellow);
      }
      // segments saillants (rampes de cuvette, corniches, couloir)
      for (j = 0; j < s.segs.length; j++) {
        var sg = s.segs[j];
        var isLane = k === 0 && sg.x1 >= W.X1 && sg.kind !== "wall";
        if (sg.kind === "arc" || sg.kind === "slope" || sg.kind === "ledge" || isLane) {
          if (sg.kind === "ledge") { line(sg.x1, sg.y1, sg.x2, sg.y2, 7, P.black); line(sg.x1, sg.y1, sg.x2, sg.y2, 5, P.brown2); line(sg.x1, sg.y1 - 3, sg.x2, sg.y2 - 3, 1, P.yellow); }
          else drawPolyRail(sg.x1, sg.y1, sg.x2, sg.y2, 4);
        }
      }
      if (k === 0) { drawPolyRail(W.X2, W.py0 - 380, W.X2, W.py0 + 90, 4); drawPolyRail(W.X1, W.py0 - 380, W.X1, W.py0 + 90, 4); drawPolyRail(W.X1, W.py0 + 90, W.X2, W.py0 + 90, 4); }
      // transports et obstacles
      drawTransport(s, t);
      for (j = 0; j < s.bumpers.length; j++) drawBumper(s.bumpers[j]);
      for (j = 0; j < s.arms.length; j++) {
        var a = s.arms[j], an = armAngle(a, t), dx = Math.cos(an) * a.len, dy = Math.sin(an) * a.len;
        line(a.x - dx, a.y - dy, a.x + dx, a.y + dy, 10, P.black); line(a.x - dx, a.y - dy, a.x + dx, a.y + dy, 7, P.brown2);
        line(a.x - dx, a.y - dy, a.x + dx, a.y + dy, 2, P.yellow); disc(a.x, a.y, 10, P.black); disc(a.x, a.y, 7, P.red);
      }
      for (j = 0; j < s.sliders.length; j++) {
        var sl = s.sliders[j], sx = sliderX(sl, t);
        line(sl.x0 - 20, sl.y, sl.x1 + 20, sl.y, 2, "rgba(0,0,0,.25)");
        line(sx - sl.hw, sl.y, sx + sl.hw, sl.y, 11, P.black); line(sx - sl.hw, sl.y, sx + sl.hw, sl.y, 8, P.stone); line(sx - sl.hw, sl.y - 2, sx + sl.hw, sl.y - 2, 2, P.white);
      }
      for (j = 0; j < s.bonuses.length; j++) {
        var bo = s.bonuses[j]; if (bo.got) continue;
        var bob = Math.sin(t * 4 + j) * 3; disc(bo.x, bo.y + 12, 9, "rgba(0,0,0,.25)"); spr(BON[bo.type].rows, BON[bo.type].map, bo.x, bo.y + bob, false, 2);
        if (Math.sin(t * 6 + j * 2) > 0.8) { cx.fillStyle = P.white; cx.fillRect(X(bo.x) + 4, Y(bo.y + bob) - 5, 1, 1); }
      }
      for (j = 0; j < s.mobs.length; j++) drawMob(s.mobs[j], t);
    }
    // sommet : gland doré
    if (CAM < 700) {
      var gy = W.goal.y + Math.sin(t * 3) * 3;
      disc(W.goal.x, gy, 44, "rgba(255,220,100," + (0.18 + 0.1 * Math.sin(t * 4)) + ")");
      spr(["...nn...", "..bbbb..", ".bbbbbb.", "bbbbbbbb", "yyyyyyyy", "yyywwyyy", ".yywyyy.", ".yyyyyy.", "..yyyy..", "...yy..."], { n: "#7a4b00", b: "#a8691a", y: "#f6c445", w: "#ffffff" }, W.goal.x, gy, false, 3);
    }
    // ressort
    if (kmin === 0) {
      var py2 = view.plungerY;
      for (var z = 0; z < 8; z++) { var zy = py2 + 4 + z * ((W.py0 + 86 - py2) / 8); rect(W.X1 + 6 + (z % 2) * 18, zy, 14, 3, P.gray); }
      rect(W.X1 + 4, py2 - 2, 28, 6, P.black); rect(W.X1 + 6, py2 - 2, 24, 4, P.gray2); rect(W.X1 + 6, py2 - 2, 24, 2, P.orange);
    }
    for (k = kmin; k <= kmax; k++) for (j = 0; j < W.stages[k].flippers.length; j++) drawFlipper(W.stages[k].flippers[j]);
    // billes
    for (i = 0; i < view.balls.length; i++) {
      var bl = view.balls[i]; if (bl.mode === "ramp" || bl.mode === "warp" || bl.mode === "cannon") continue;
      for (j = 0; j < bl.trail.length - 1; j++) if (j % 2) { cx.fillStyle = "rgba(255,255,255," + (j / bl.trail.length * 0.3) + ")"; cx.fillRect(X(bl.trail[j].x) - 2, Y(bl.trail[j].y) - 2, 4, 4); }
      drawBall(bl, false);
    }
    for (i = 0; i < view.balls.length; i++) if (view.balls[i].mode === "ramp") drawBall(view.balls[i], true);
    // particules et points
    for (i = 0; i < view.particles.length; i++) { var pa = view.particles[i]; cx.globalAlpha = Math.max(0, pa.life); cx.fillStyle = pa.col; cx.fillRect(X(pa.x), Y(pa.y), Math.max(1, Math.round(pa.size / 2)), Math.max(1, Math.round(pa.size / 2))); }
    cx.globalAlpha = 1;
    cx.font = "bold 8px monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
    for (i = 0; i < view.popups.length; i++) { var po = view.popups[i]; cx.globalAlpha = Math.max(0, Math.min(1, po.life * 1.5)); cx.fillStyle = P.black; cx.fillText(po.text, X(po.x) + 1, Y(po.y) + 1); cx.fillStyle = P.white; cx.fillText(po.text, X(po.x), Y(po.y)); }
    cx.globalAlpha = 1;
    // indications : ESPACE, jauge
    if (view.waiting && view.charge === 0 && kmin === 0) {
      cx.fillStyle = Math.sin(t * 6) > 0 ? P.white : P.yellow; cx.font = "bold 6px monospace"; cx.fillText("ESPACE", X(438), Y(view.plungerY - 55));
    }
    if (view.charge > 0) { rect(W.X1 + 6, view.plungerY - 140, 8, 84, P.black); rect(W.X1 + 6, view.plungerY - 56 - 84 * view.charge, 8, 84 * view.charge, view.charge > 0.8 ? P.red2 : P.yellow); }
    // effets d'écran : ralenti dramatique, vignette rouge
    if (view.drama > 0) {
      var a2 = Math.min(0.55, view.drama * 0.5);
      cx.fillStyle = "rgba(216,50,43," + a2 * 0.45 + ")"; cx.fillRect(0, 0, V.pxW, V.pxH);
      cx.fillStyle = "rgba(20,20,30," + a2 + ")"; cx.fillRect(0, 0, V.pxW, 18); cx.fillRect(0, V.pxH - 18, V.pxW, 18);
    }
    if (view.bannerT > 0) {
      var bb = Math.min(1, view.bannerT * 2);
      cx.globalAlpha = bb; cx.fillStyle = P.black; cx.fillRect(0, 36, V.pxW, 24);
      cx.fillStyle = view.bannerCol || P.yellow; cx.font = "bold 11px monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(view.banner, V.pxW / 2, 44);
      cx.fillStyle = P.white; cx.font = "bold 7px monospace"; cx.fillText(view.banner2 || "", V.pxW / 2, 55);
      cx.globalAlpha = 1;
    }
    // jauge d'altitude à gauche
    var frac = Math.max(0, Math.min(1, (W.plungerY - view.topY) / (W.plungerY - W.goal.y)));
    pr(3, 40, 4, 120, P.black); pr(4, 41, 2, 118, P.gray2); pr(4, 159 - Math.round(118 * frac), 2, Math.round(118 * frac), P.yellow);
    pr(2, 159 - Math.round(118 * frac) - 1, 6, 2, P.white);
  }

  root.FlippersClimb = { build: build, render: render, mobPos: mobPos, armAngle: armAngle, sliderX: sliderX, BIOMES: BIOMES, SH: SH, BON: BON };
})(typeof window !== "undefined" ? window : this);
