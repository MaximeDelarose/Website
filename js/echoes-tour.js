/* =========================================================================
   Echoes of Aether : Contes d'Aelor
   L'aventure d'Echoes of Aether (Augh, Aka, Gorak, les Prairies d'Aelor, la Bergerie oubliée)
   refaite en RPG au tour par tour, avec les sprites et la direction artistique d'Écureuil Survivor
   (js/v2/game-data.js + js/v2/dither-art.js).
   Combats : commandes d'action à chaque attaque, garde et contre au bon moment, public qui remplit la jauge d'Écho.
   ========================================================================= */
(function () {
  "use strict";
  var D = window.ES_DATA, ART = window.ES_ART;
  var W = 480, H = 270, TS = 32, TAU = Math.PI * 2;
  var cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  function $(s) { return document.querySelector(s); }
  function now() { return performance.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* =====================================================================
     Sprites (même fabrication que dans Écureuil Survivor : contour brun, version × 2 dithered)
     ===================================================================== */
  var OUT = "#2b1709";
  function mk(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (r) { w = Math.max(w, r.length); });
    var Wc = w + 2, Hc = h + 2, filled = new Uint8Array(Wc * Hc);
    var c = document.createElement("canvas"); c.width = Wc; c.height = Hc;
    var g = c.getContext("2d");
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * Wc + x + 1] = 1; }
    }
    g.fillStyle = OUT;
    for (y = 0; y < Hc; y++) for (x = 0; x < Wc; x++) {
      if (filled[y * Wc + x]) continue;
      if ((x > 0 && filled[y * Wc + x - 1]) || (x < Wc - 1 && filled[y * Wc + x + 1]) || (y > 0 && filled[(y - 1) * Wc + x]) || (y < Hc - 1 && filled[(y + 1) * Wc + x])) g.fillRect(x, y, 1, 1);
    }
    var o = { c: c, w: Wc, h: Hc }, fl = null, wh = null;
    Object.defineProperty(o, "f", { get: function () { if (!fl) { fl = document.createElement("canvas"); fl.width = Wc; fl.height = Hc; var q = fl.getContext("2d"); q.translate(Wc, 0); q.scale(-1, 1); q.drawImage(c, 0, 0); } return fl; } });
    Object.defineProperty(o, "wc", { get: function () { if (!wh) { wh = document.createElement("canvas"); wh.width = Wc; wh.height = Hc; var q = wh.getContext("2d"); q.drawImage(c, 0, 0); q.globalCompositeOperation = "source-in"; q.fillStyle = "#fff"; q.fillRect(0, 0, Wc, Hc); } return wh; } });
    return o;
  }

  /* sprites propres à cette version, dessinés comme ceux de Survivor (1 lettre = 1 couleur, tête à gauche comme les ennemis) */
  var LEGS_M = [".ll.ll..ll.ll..", "..ll.ll..ll.ll."];
  function sheep(pal, horns, eye) {
    var top = horns ? [
      "..hh.www.www....",
      ".hHHhwwwwwwwww..",
      "hHhkkwwwwwwwwww.",
      ".hkkkkwwwwwwwwww",
      "..kk" + eye + "kwwwwwwwwWw",
      ".nkkkkwwwwwwwWWw",
      "..kkWWwwwwwwWWW.",
      "....WWWWWWWWWW.."
    ] : [
      ".....www.www....",
      "...wwwwwwwwww...",
      ".kkwwwwwwwwwww..",
      "kkkkwwwwwwwwwww.",
      "kk" + eye + "kwwwwwwwwWw.",
      "nkkkwwwwwwwwWWw.",
      ".kkWWwwwwwwWWW..",
      "...WWWWWWWWWW..."
    ];
    var off = horns ? "." : "";
    return { pal: pal, frames: [top.concat([off + "..ll.ll..ll.ll."]), top.concat([off + ".ll..ll.ll..ll."])] };
  }
  var EXTRA = {
    mouton: sheep({ w: "#f3efe6", W: "#c9c0b0", k: "#6b5444", e: "#fdf3de", n: "#f29a85", l: "#4a3a30" }, false, "e"),
    mouton_mystique: (function () {
      var s = sheep({ w: "#e2d6ff", W: "#9a86c8", k: "#4a3a78", e: "#f6d36b", n: "#f29ad8", l: "#3a2a58", y: "#f6d36b" }, false, "e");
      s.frames = s.frames.map(function (f) { f = f.slice(); f[0] = "y....www.www...."; f[1] = ".y.wwwwwwwwww..."; return f; });
      return s;
    })(),
    belier: sheep({ w: "#e8dcc4", W: "#b9a98a", k: "#5a4636", r: "#e0283a", n: "#f29a85", l: "#3a2a20", h: "#a06a3e", H: "#d39a52" }, true, "r"),
    belier_furieux: sheep({ w: "#d8a890", W: "#a8705a", k: "#4a2a20", r: "#ffd05a", n: "#e0283a", l: "#2b1709", h: "#5a3220", H: "#c8553d" }, true, "r"),
    grand_belier: { pal: { w: "#cfc6dc", W: "#8a80a0", V: "#5a5070", k: "#3a2a40", r: "#ff5a4a", n: "#c8553d", l: "#2b1709", h: "#9c6f12", H: "#f6d36b" }, frames: [[
      "...hhh....ww.www.www....",
      "..hHHHh.wwwwwwwwwwwww...",
      ".hHhhHHhwwwwwwwwwwwwwww.",
      ".hH..hHkkwwwwwwwwwwwwwww",
      "..h.hHkkkkwwwwwwwwwwwwww",
      "....kkkrkkwwwwwwwwwwwwWw",
      "...kkkkkkkwwwwwwwwwwwWWw",
      "..nkkkkkkWwwwwwwwwwwWWWw",
      "....kkkWWWwwwwwwwwwWWWWV",
      "......WWWWWWWWWWWWWWWWV.",
      ".......VVWWWWWWWWWWVVV..",
      ".......ll.ll....ll.ll...",
      ".......ll.ll....ll.ll...",
      "......lll.lll..lll.lll.."], [
      "...hhh....ww.www.www....",
      "..hHHHh.wwwwwwwwwwwww...",
      ".hHhhHHhwwwwwwwwwwwwwww.",
      ".hH..hHkkwwwwwwwwwwwwwww",
      "..h.hHkkkkwwwwwwwwwwwwww",
      "....kkkrkkwwwwwwwwwwwwWw",
      "...kkkkkkkwwwwwwwwwwwWWw",
      "..nkkkkkkWwwwwwwwwwwWWWw",
      "....kkkWWWwwwwwwwwwWWWWV",
      "......WWWWWWWWWWWWWWWWV.",
      ".......VVWWWWWWWWWWVVV..",
      "......ll.ll......ll.ll..",
      "......ll.ll......ll.ll..",
      ".....lll.lll....lll.lll."]] },
    miniyeti: { pal: { w: "#ffffff", b: "#8ac0ff", k: "#1b1226", n: "#3a5aa8" }, frames: [["..wwww..", ".wwwwww.", "wwbbbbww", "wbkbbkbw", "wbbbbbbw", "wwbnnbww", ".wwwwww.", "..w..w.."]] },
    tree: { pal: { g: "#3f6b3a", G: "#5b8a4a", l: "#9cc56b", b: "#6b4430", B: "#8a5a3b" }, frames: [[
      "......gggg......", "....ggGGGGgg....", "...gGGlGGGGGg...", "..gGGllGGGGGGg..", ".gGGGlGGGGGGGGg.", ".gGGGGGGGGlGGGg.",
      "gGGlGGGGGllGGGGg", "gGGGGGGGGGGGGGGg", "gGGGGGGlGGGGGGgg", ".gGGGGGGGGGGGgg.", ".ggGGGGGGGGGggg.", "..gggGGGGGgggg..",
      "....gggbBggg....", "......bBb.......", "......bBb.......", ".....bbBbb......"]] },
    pine: { pal: { g: "#1f3a2b", G: "#2f5a3a", l: "#4f8a40", b: "#4a3020", B: "#6b4430" }, frames: [[
      ".......g........", "......gGg.......", ".....gGlGg......", "....gGGGGGg.....", ".....gGlGg......", "....gGGGGGGg....",
      "...gGGlGGGGGg...", "....gGGGGGGg....", "...gGGGGGlGGg...", "..gGGlGGGGGGGg..", ".gGGGGGGGGlGGGg.", "..ggGGGGGGGGgg..",
      "....ggggbgggg...", ".......bB.......", ".......bB.......", "......bbBb......"]] },
    bigoak: { pal: { g: "#2f5a2a", G: "#4f7a3a", l: "#86b56c", b: "#5a3820", B: "#8a5a3b", y: "#f6d36b" }, frames: [[
      ".......gggggg.........", ".....ggGGGGGGgg.......", "...ggGGlGGGGGGGgg.....", "..gGGllGGGGGGlGGGg....", ".gGGlGGGGGGGGllGGGg...",
      "gGGGGGGGlGGGGGGGGGGg..", "gGGGGGGGGGGGGGGlGGGGg.", "gGlGGGGGGGGGGGGGGGGGg.", ".gGGGGGlGGGGGGGGGGGGg.", ".ggGGGGGGGGGGGlGGGgg..",
      "...gggGGGGGGGGGGggg...", ".....ggggbBBggggg.....", "........bBBb..........", "........bBBb..........", "........bBBb..........",
      ".......bbBBbb.........", "......bb.BB.bb........"]] },
    pillar: { pal: { s: "#a8a090", S: "#d8d0c0", d: "#6a6258", m: "#4f8a40" }, frames: [[".SSSSSS.", "sssssssm", ".sSSSs..", ".sSsSs..", ".sSSSsm.", ".sSsSs..", ".sSSSs..", ".sSsSs..", "dsssssm.", "dddddddd"]] },
    gate: { pal: { c: "#6ad8ff", C: "#e8fbff", s: "#5a5a6a", S: "#8a929a", p: "#a87ae8" }, frames: [["...cc...", "..cCCc..", ".cCppCc.", ".cCppCc.", "..cCCc..", "...cc...", ".SSSSSS.", "SssssssS", "SsSSSSsS", "SSSSSSSS"]] },
    herb: { pal: { g: "#4f8a40", G: "#9cc56b", w: "#e8fbff", y: "#c9b3ff" }, frames: [["..w.w..", ".wywyw.", "..www..", "...g...", ".G.g.G.", "..GgG..", "...g..."]] },
    well: { pal: { s: "#8a929a", S: "#c0c8d0", b: "#6b4430", B: "#a06a3e", w: "#5aa0d8", W: "#bfefff" }, frames: [["bBBBBBBBBb", ".b......b.", ".b......b.", "SSSSSSSSSS", "sWwWwwWwWs", "sSSSSSSSSs", "ssssssssss"]] },
    fence: { pal: { b: "#8a5a3b", B: "#c9a070" }, frames: [[".B....B.", "BBBBBBBB", ".b....b.", "BBBBBBBB", ".b....b."]] },
    sign: { pal: { b: "#8a5a3b", B: "#d39a52", k: "#6b4430" }, frames: [["BBBBBBB", "BkkkkkB", "BBBBBBB", "...b...", "...b..."]] }
  };

  var SPR = {};
  function buildSpr(name) {
    var def = EXTRA[name] || D.SPRITES[name];
    if (name === "sq_gorak") {
      var src = D.SPRITES.sq_pataud; def = {}; Object.keys(src).forEach(function (k) { def[k] = src[k]; });
      def.pal = { t: "#9aa8b8", d: "#4a5868", o: "#748496", c: "#e8eef5", k: "#1b1226", n: "#3a4858" };
    }
    if (name === "sq_aelor") {
      var s2 = D.SPRITES.sq_cendrine; def = {}; Object.keys(s2).forEach(function (k) { def[k] = s2[k]; });
    }
    if (!def) return null;
    var d = def;
    try { if (ART) d = ART.upgrade(name, def) || def; } catch (e) { d = def; }
    var arr = d.frames.map(function (f) { return mk(f, d.pal); });
    if (d.idle) arr.idle = d.idle.map(function (f) { return mk(f, d.pal); });
    arr.bob = d.bob || null; arr.flying = !!d.flying;
    return arr;
  }
  function natLeft(name) { return !!EXTRA[name]; }
  function S_(name) { if (!SPR[name]) SPR[name] = buildSpr(name) || buildSpr("nut"); return SPR[name]; }
  var urlC = {};
  function sprUrl(name, fr) { var k = name + (fr || 0); if (!urlC[k]) { var a = S_(name); urlC[k] = ((a.idle || a)[fr || 0] || a[0]).c.toDataURL(); } return urlC[k]; }
  // dessine un sprite ancré en bas au centre
  function blit(s, x, y, sc, flip, white) {
    sc = sc || 1;
    var img = white ? s.wc : flip ? s.f : s.c;
    if (white && flip) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(s.wc, Math.round(-s.w * sc / 2), Math.round(y - s.h * sc), s.w * sc, s.h * sc); ctx.restore(); return; }
    ctx.drawImage(img, Math.round(x - s.w * sc / 2), Math.round(y - s.h * sc), s.w * sc, s.h * sc);
  }
  function frameOf(name, t, moving) {
    var a = S_(name);
    if (!moving && a.idle) return { s: a.idle[Math.floor(t * 2.4) % a.idle.length], dy: 0 };
    var i = Math.floor(t * (a.bob ? 8 : 5)) % a.length;
    return { s: a[i], dy: a.bob && moving ? a.bob[i] : 0 };
  }

  /* ---------- police pixel 3 × 5 de Survivor (chiffres des dégâts) ---------- */
  var FONT = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
    N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
    ":": "000010000010000", "/": "001001010100100", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "?": "111001011000010", "%": "101001010100101", "'": "010010000000000", " ": "000000000000000" };
  function ptext(str, x, y, col, sc, align) {
    str = String(str).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    sc = sc || 1; var w = (str.length * 4 - 1) * sc;
    var x0 = Math.round(align === "c" ? x - w / 2 : align === "r" ? x - w : x), y0 = Math.round(y), i, j;
    function pass(c, ox, oy) {
      ctx.fillStyle = c;
      for (i = 0; i < str.length; i++) {
        var g = FONT[str[i]] || FONT[" "];
        for (j = 0; j < 15; j++) if (g[j] === "1") ctx.fillRect(x0 + ox + (i * 4 + (j % 3)) * sc, y0 + oy + Math.floor(j / 3) * sc, sc, sc);
      }
    }
    [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]].forEach(function (o) { pass(OUT, o[0] * sc, o[1] * sc); });
    pass(col || "#fdf3de", 0, 0);
  }

  /* =====================================================================
     Données : héros, attaques, ennemis, objets, insignes
     ===================================================================== */
  var HEROES = {
    augh: { name: "Augh", title: "Lanceur de haches", spr: "sq_bucheron", weapon: "axe", hp: 10, field: "chop", fieldName: "abattre les arbres",
      desc: "Ses haches volent loin et reviennent : il touche aussi les ennemis volants." },
    aka: { name: "Aka", title: "Stratège des cristaux", spr: "sq_mage", weapon: "orb", hp: 8, field: "bind", fieldName: "lier les cristaux anciens",
      desc: "Sa magie ignore la défense des ennemis. Elle prépare les combats et protège l'équipe." },
    gorak: { name: "Gorak", title: "Colosse des Cimes", spr: "sq_gorak", weapon: "hammer", hp: 12, field: "smash", fieldName: "briser les rochers",
      desc: "Sa massue frappe fort au sol, mais ne peut pas atteindre ce qui vole. Il invoque des mini-yétis." }
  };
  // cmd : timed (appuyer au bon moment), hold (maintenir puis relâcher), mash (marteler), seq (suite de flèches)
  var MOVES = {
    augh: [
      { id: "hache", name: "Hache rapide", pe: 0, lv: 1, tgt: "one", air: true, cmd: "timed", desc: "Lance la hache. Appuie sur A à l'impact : elle revient frapper une seconde fois (Retour brutal)." },
      { id: "vent", name: "Lames du vent", pe: 2, lv: 1, tgt: "all", air: true, cmd: "timed", desc: "Trois petites haches en éventail. A à chaque impact : 2 dégâts au lieu d'1." },
      { id: "feu", name: "Hache incendiaire", pe: 3, lv: 2, tgt: "all", air: true, cmd: "hold", desc: "Traverse toute la ligne. Charge bien la hache : les ennemis brûlent (1 dégât par tour)." },
      { id: "glace", name: "Hache glaciale", pe: 4, lv: 4, tgt: "one", air: true, cmd: "seq", desc: "Recopie les flèches : l'ennemi touché est gelé 2 tours (1 tour pour un boss)." }
    ],
    aka: [
      { id: "orbe", name: "Orbe arcanique", pe: 0, lv: 1, tgt: "one", air: true, magic: true, cmd: "seq", desc: "Trace les runes (flèches) à temps. Magie : ignore la défense." },
      { id: "rempart", name: "Rempart arcanique", pe: 3, lv: 1, tgt: "party", cmd: "timed", desc: "Barrière de cristaux : +1 de défense pour l'équipe pendant 3 tours (+2 si réussi)." },
      { id: "nova", name: "Nova de givre", pe: 3, lv: 2, tgt: "all", air: true, magic: true, cmd: "mash", desc: "Onde glaciale sur tous les ennemis. Martèle A : ils perdent 1 d'attaque pendant 2 tours." },
      { id: "comete", name: "Comète arcanique", pe: 5, lv: 4, tgt: "one", air: true, magic: true, cmd: "hold", desc: "Énorme impact sur une cible, éclats sur les autres." }
    ],
    gorak: [
      { id: "massue", name: "Coup de massue", pe: 0, lv: 1, tgt: "front", air: false, cmd: "hold", desc: "Frappe l'ennemi au sol le plus proche. Relâche A quand la massue est chargée. Attention aux piquants !" },
      { id: "fracas", name: "Fracas", pe: 3, lv: 1, tgt: "all", air: true, quake: true, cmd: "mash", desc: "Onde de choc : touche tout le monde, fait tomber les volants et retourne les carapaces (défense 0)." },
      { id: "boulet", name: "Yéti-boulet", pe: 2, lv: 1, tgt: "ground", air: false, cmd: "timed", desc: "Un mini-yéti roulé en boule traverse tous les ennemis au sol." },
      { id: "cri", name: "Cri de guerre", pe: 4, lv: 3, tgt: "party", cmd: "mash", desc: "Gorak rugit : +1 d'attaque pour toute l'équipe pendant 3 tours." },
      { id: "meute", name: "Meute des Cimes", pe: 5, lv: 5, tgt: "all", air: true, cmd: "timed", desc: "Deux mini-yétis bondissent sur les ennemis : A à chaque morsure." }
    ]
  };
  var ECHO_MOVES = [
    { id: "souffle", name: "Souffle d'Aether", cost: 1, cmd: "mash", desc: "Soigne toute l'équipe (PV et PE). Martèle A pour soigner plus." },
    { id: "avalanche", name: "Avalanche des Cimes", cost: 2, need: "eveil", cmd: "mash", desc: "Une avalanche de mini-yétis sur tous les ennemis." },
    { id: "eveil", name: "Éveil d'Aether", cost: 3, need: "eveil", cmd: "timed", desc: "L'équipe s'éveille : +2 attaque, +1 défense pendant 3 tours." }
  ];
  var ENEMIES = {
    mouton:   { name: "Boufton", spr: "mouton", lv: 1, hp: 3, atk: 1, def: 0, xp: 8, gold: [1, 3], ai: ["charge"] },
    limace:   { name: "Limace", spr: "slug", lv: 1, hp: 2, atk: 1, def: 0, xp: 5, gold: [1, 2], ai: ["charge"] },
    guepe:    { name: "Guêpe", spr: "wasp", lv: 2, hp: 3, atk: 1, def: 0, xp: 8, gold: [1, 3], ai: ["dive"], fly: true, poison: 0.35 },
    herisson: { name: "Hérisson", spr: "hedgehog", lv: 3, hp: 4, atk: 2, def: 0, xp: 12, gold: [2, 4], ai: ["charge"], spiky: true },
    belier:   { name: "Bélier", spr: "belier", lv: 3, hp: 5, atk: 2, def: 1, xp: 14, gold: [2, 5], ai: ["charge", "charge", "double"] },
    mystique: { name: "Mouton mystique", spr: "mouton_mystique", lv: 4, hp: 5, atk: 2, def: 0, xp: 16, gold: [3, 6], ai: ["zap", "heal", "charge"] },
    renard:   { name: "Renard", spr: "fox", lv: 4, hp: 6, atk: 2, def: 0, xp: 16, gold: [3, 6], ai: ["double", "charge"] },
    araignee: { name: "Araignée", spr: "spider", lv: 4, hp: 5, atk: 2, def: 0, xp: 15, gold: [2, 5], ai: ["web", "charge"] },
    spectre:  { name: "Spectre", spr: "ghost", lv: 5, hp: 5, atk: 2, def: 0, xp: 18, gold: [3, 6], ai: ["dive", "zap"], fly: true, sc: 3 },
    corbeau:  { name: "Corbeau", spr: "crow", lv: 5, hp: 5, atk: 2, def: 0, xp: 17, gold: [3, 6], ai: ["dive"], fly: true },
    sanglier: { name: "Sanglier", spr: "boar", lv: 6, hp: 9, atk: 3, def: 1, xp: 24, gold: [4, 8], ai: ["charge"] },
    tisseuse: { name: "Tisseuse des brumes", spr: "weaver", lv: 6, hp: 18, atk: 2, def: 0, xp: 60, gold: [30, 30], ai: ["web", "charge", "zap", "summon"], summon: "araignee", boss: true, sc: 3 },
    belier_furieux: { name: "Bélier furieux", spr: "belier_furieux", lv: 8, hp: 24, atk: 3, def: 1, xp: 90, gold: [45, 45], ai: ["charge", "double", "rage", "charge"], boss: true, sc: 3 },
    grand_belier: { name: "Grand Bélier", spr: "grand_belier", lv: 11, hp: 42, atk: 4, def: 1, xp: 200, gold: [120, 120], ai: ["charge", "stomp", "bleat", "summon", "double"], summon: "mouton", boss: true, sc: 2 }
  };
  var ITEMS = {
    potion: { name: "Potion de baies", icon: "berry", price: 6, desc: "Rend 5 PV à un héros.", use: "hero", hp: 5 },
    grande: { name: "Grande potion", icon: "bignut", price: 15, desc: "Rend 10 PV à un héros.", use: "hero", hp: 10 },
    ether: { name: "Fiole d'éther", icon: "drop", price: 10, desc: "Rend 5 PE.", use: "party", pe: 5 },
    miel: { name: "Miel doré", icon: "goldacorn", price: 25, desc: "Relève un héros KO avec la moitié de ses PV (ou soigne 10 PV).", use: "hero", revive: true },
    bombe: { name: "Gland explosif", icon: "pinebomb", price: 12, desc: "3 dégâts à tous les ennemis (ignore la défense).", use: "enemies", dmg: 3 },
    sommeil: { name: "Graine de sommeil", icon: "spore", price: 14, desc: "Endort les ennemis (sauf les boss) pendant 2 tours, avec de la chance.", use: "enemies", sleep: true },
    plume: { name: "Plume de fuite", icon: "feather", price: 5, desc: "Fuite assurée (hors boss).", use: "flee" }
  };
  var BADGES = {
    ecoute: { name: "Oreille fine", pi: 1, icon: "bell", desc: "Fenêtre de garde plus large, et un « ! » prévient de chaque attaque.", price: 0 },
    facile: { name: "Patte douce", pi: 0, icon: "clover", desc: "Commandes d'action plus faciles (moins d'Écho gagné).", price: 0 },
    tranchant: { name: "Fil tranchant", pi: 2, icon: "katana", desc: "+1 dégât à toutes les attaques des héros.", price: 45 },
    ecorce: { name: "Écorce", pi: 3, icon: "shield", desc: "+1 défense pour les héros.", price: 55 },
    coeur: { name: "Cœur de chêne", pi: 3, icon: "acorn", desc: "+5 PV max pour chaque héros.", price: 0 },
    fleur: { name: "Fleur d'éther", pi: 3, icon: "fairy", desc: "+5 PE max.", price: 0 },
    panache: { name: "Panache", pi: 1, icon: "feather", desc: "Le public adore : +50 % d'Écho gagné.", price: 0 },
    epines: { name: "Contre-épines", pi: 1, icon: "thorn", desc: "Un contre inflige 1 dégât de plus.", price: 0 },
    fortune: { name: "Gland porte-bonheur", pi: 1, icon: "goldacorn", desc: "+50 % de glands d'or gagnés.", price: 30 },
    regain: { name: "Regain", pi: 2, icon: "drop", desc: "+1 PE au début de chaque tour.", price: 60 },
    souffle: { name: "Dernier souffle", pi: 2, icon: "skull", desc: "+2 attaque pour un héros à 3 PV ou moins.", price: 0 },
    premier: { name: "Premier élan", pi: 1, icon: "dash", desc: "Le premier coup sur la carte inflige 2 dégâts de plus.", price: 35 }
  };
  var QUESTS = [
    null,
    { title: "Les Bouftons envahissants", text: "Abats 3 Bouftons dans les Prairies d'Aelor, puis reviens voir Aelor.", hint: "Le pont est cassé : Augh peut abattre le grand chêne au bord de la rivière." },
    { title: "L'herbe de lune", text: "Rapporte l'herbe de lune de la Forêt mystérieuse (à l'ouest).", hint: "Aka sait lier le cristal qui ferme la forêt." },
    { title: "Le bélier furieux", text: "Calme le Bélier furieux dans les Ruines anciennes (à l'est).", hint: "Un rocher bloque les ruines : Gorak peut le briser." },
    { title: "Éveil", text: "Rends-toi au Sanctuaire du Gardien, au nord, avec toute l'équipe.", hint: "Le chemin part du haut de la prairie." },
    { title: "Le Grand Bélier", text: "Traverse les trois salles de la Bergerie oubliée et vaincs le Grand Bélier.", hint: "La Bergerie est au nord-est de la prairie." },
    { title: "Aelor est sauvé", text: "Merci d'avoir joué ! Les prairies restent ouvertes.", hint: "" }
  ];

  /* =====================================================================
     Sauvegarde
     ===================================================================== */
  var KEY = "eoa-tour-save-1", S;
  function fresh() {
    return { v: 1, lv: 1, xp: 0, hpBonus: 0, peMax: 5, pe: 5, pi: 3, echo: 0, echoMax: 3, gold: 15,
      items: { potion: 2, ether: 1 }, badges: ["ecoute", "facile"], equip: [], party: ["augh"], lead: "augh", hp: { augh: 10, aka: 8, gorak: 12 },
      q: 0, flags: {}, kills: 0, map: "world", x: 31.5 * TS, y: 41.5 * TS, chests: {}, sound: true, played: 0 };
  }
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return j; } catch (e) {} return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  S = load() || fresh();
  function has(b) { return S.equip.indexOf(b) >= 0; }
  function maxHp(h) { return HEROES[h].hp + S.hpBonus + (has("coeur") ? 5 : 0); }
  function maxPe() { return S.peMax + (has("fleur") ? 5 : 0); }
  function piUsed() { return S.equip.reduce(function (a, b) { return a + BADGES[b].pi; }, 0); }
  function easy() { return has("facile"); }
  function addItem(id, n) { S.items[id] = (S.items[id] || 0) + (n || 1); }

  /* =====================================================================
     Son (petits bips synthétisés)
     ===================================================================== */
  var AC = null;
  function au() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === "suspended") AC.resume(); return AC; }
  function tone(f, d, type, vol, slide) {
    if (!S.sound) return; var a = au(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || "square"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol, hp) {
    if (!S.sound) return; var a = au(); if (!a) return;
    var n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0), i;
    for (i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 800;
    s.buffer = b; g.gain.value = vol || 0.08; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  var SFX = {
    move: function () { tone(660, 0.04, "square", 0.03); },
    ok: function () { tone(880, 0.06, "square", 0.04); setTimeout(function () { tone(1320, 0.07, "square", 0.04); }, 50); },
    back: function () { tone(440, 0.06, "square", 0.04, 0.7); },
    hit: function () { noise(0.12, 0.12, 400); tone(160, 0.12, "square", 0.06, 0.5); },
    nice: function () { tone(988, 0.06, "square", 0.05); setTimeout(function () { tone(1480, 0.1, "square", 0.05); }, 60); },
    miss: function () { tone(220, 0.15, "sawtooth", 0.04, 0.6); },
    guard: function () { tone(520, 0.08, "triangle", 0.08); noise(0.05, 0.05, 2000); },
    contre: function () { tone(1200, 0.05, "square", 0.06); setTimeout(function () { tone(1800, 0.12, "square", 0.05); }, 50); noise(0.08, 0.06, 3000); },
    hurt: function () { tone(300, 0.2, "sawtooth", 0.06, 0.4); },
    cheer: function () { noise(0.5, 0.05, 1500); for (var i = 0; i < 4; i++) setTimeout(function () { tone(rnd(700, 1300), 0.05, "triangle", 0.03); }, i * 70); },
    coin: function () { tone(1320, 0.05, "square", 0.04); setTimeout(function () { tone(1760, 0.09, "square", 0.04); }, 60); },
    lvl: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.12, "square", 0.05); }, i * 110); }); },
    win: function () { [392, 523, 659, 784, 659, 784].forEach(function (f, i) { setTimeout(function () { tone(f, 0.14, "square", 0.05); }, i * 120); }); },
    charge: function (p) { tone(200 + p * 600, 0.03, "square", 0.025); },
    chop: function () { noise(0.15, 0.1, 600); tone(120, 0.15, "square", 0.05, 0.6); },
    magic: function () { tone(600, 0.25, "sine", 0.06, 2.2); }
  };

  /* =====================================================================
     Entrées : clavier, tactile, souris
     ===================================================================== */
  var held = {}, listeners = [];
  var KMAP = { ArrowUp: "up", KeyW: "up", KeyZ: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", KeyQ: "left", ArrowRight: "right", KeyD: "right",
    Space: "a", Enter: "a", KeyJ: "a", KeyX: "b", KeyK: "b", Backspace: "b", ShiftLeft: "b", Escape: "menu", KeyM: "menu", KeyE: "a", KeyC: "swap", Tab: "swap" };
  function press(k) { au(); var t = now(); for (var i = listeners.length - 1; i >= 0; i--) { if (listeners[i](k, t) === true) return; } }
  function onKey(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  addEventListener("keydown", function (e) {
    var k = KMAP[e.code]; if (!k) return;
    e.preventDefault(); if (e.repeat) return;
    held[k] = true; press(k);
  });
  addEventListener("keyup", function (e) { var k = KMAP[e.code]; if (k) { held[k] = false; release(k); } });
  var relListeners = [];
  function release(k) { relListeners.slice().forEach(function (f) { f(k, now()); }); }
  var isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0 && matchMedia("(pointer: coarse)").matches);
  if (isTouch) $("#touch").hidden = false;
  document.querySelectorAll("#touch button").forEach(function (b) {
    var k = b.dataset.k;
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("on"); held[k] = true; press(k); });
    function up(e) { if (!held[k]) return; b.classList.remove("on"); held[k] = false; release(k); }
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
  });
  $("#btn-pause").addEventListener("click", function () { press("menu"); });
  // joystick analogique : il apparaît sous le pouce, n'importe où dans la moitié gauche de l'écran
  var STICK = { x: 0, y: 0, on: false };
  (function () {
    var el = $("#stick"); if (!el) return;
    var base = el.querySelector(".base"), knob = el.querySelector(".knob"), id = null, cx = 0, cy = 0, R0 = 52;
    function setDir(k, v) { if (!!held[k] === v) return; held[k] = v; if (v) press(k); else release(k); }
    function upd(px, py) {
      var dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
      if (d > R0) { dx *= R0 / d; dy *= R0 / d; }
      knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      STICK.x = dx / R0; STICK.y = dy / R0;
      var ax = Math.abs(STICK.x), ay = Math.abs(STICK.y);   // directions franches pour les menus et les flèches
      setDir("left", STICK.x < -0.5 && ax > ay); setDir("right", STICK.x > 0.5 && ax > ay);
      setDir("up", STICK.y < -0.5 && ay >= ax); setDir("down", STICK.y > 0.5 && ay >= ax);
    }
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault(); au(); if (id !== null) return;
      id = e.pointerId; try { el.setPointerCapture(id); } catch (er) {}
      var r = el.getBoundingClientRect(); cx = e.clientX; cy = e.clientY;
      base.style.left = (cx - r.left) + "px"; base.style.top = (cy - r.top) + "px";
      el.classList.add("on"); STICK.on = true; upd(cx, cy);
    });
    el.addEventListener("pointermove", function (e) { if (e.pointerId === id) upd(e.clientX, e.clientY); });
    function end(e) {
      if (e.pointerId !== id) return; id = null; STICK.on = false; STICK.x = STICK.y = 0;
      knob.style.transform = ""; el.classList.remove("on"); base.style.left = ""; base.style.top = "";
      ["left", "right", "up", "down"].forEach(function (k) { setDir(k, false); });
    }
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", end);
  })();

  function fit() {
    var s = Math.min(innerWidth / W, innerHeight / H);
    if (s >= 2) s = Math.floor(s * 2) / 2;
    cv.style.width = Math.round(W * s) + "px"; cv.style.height = Math.round(H * s) + "px";
  }
  addEventListener("resize", fit); fit();
  function canvasPos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  var tapListeners = [];
  cv.addEventListener("pointerdown", function (e) { au(); var p = canvasPos(e); tapListeners.slice().forEach(function (f) { f(p); }); });

  /* =====================================================================
     Temps, tweens, attentes
     ===================================================================== */
  var tweens = [], waits = [];
  function wait(ms) { return new Promise(function (res) { waits.push({ t: now() + ms, res: res }); }); }
  var EASE = { lin: function (t) { return t; }, out: function (t) { return 1 - (1 - t) * (1 - t); }, in: function (t) { return t * t; }, io: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  function tween(o, to, ms, ease, arc) {
    return new Promise(function (res) {
      var from = {}; Object.keys(to).forEach(function (k) { from[k] = isFinite(o[k]) ? o[k] : 0; if (!isFinite(to[k])) { if (window.__EOA_DEBUG) console.error("tween NaN " + k + " " + new Error().stack); to[k] = from[k]; } });
      if (!isFinite(ms)) { if (window.__EOA_DEBUG) console.error("tween ms NaN " + new Error().stack); ms = 300; }
      tweens.push({ o: o, from: from, to: to, t0: now(), ms: Math.max(1, ms), e: EASE[ease || "io"], arc: arc || 0, res: res });
    });
  }
  function stepTime() {
    var t = now(), i;
    for (i = tweens.length - 1; i >= 0; i--) {
      var w = tweens[i], p = clamp((t - w.t0) / w.ms, 0, 1), e = w.e(p);
      Object.keys(w.to).forEach(function (k) { w.o[k] = w.from[k] + (w.to[k] - w.from[k]) * e; });
      if (w.arc) w.o.lift = Math.sin(p * Math.PI) * w.arc;
      if (p >= 1) { if (w.arc) w.o.lift = 0; tweens.splice(i, 1); w.res(); }
    }
    for (i = waits.length - 1; i >= 0; i--) if (t >= waits[i].t) { var r = waits[i].res; waits.splice(i, 1); r(); }
  }

  /* =====================================================================
     Interface HTML : HUD, toasts, dialogues, menus
     ===================================================================== */
  function iconImg(name) { return '<img src="' + sprUrl(name) + '" alt="">'; }
  function echoHtml() {
    var h = '<span class="echo" title="Jauge d\'Écho">', i;
    for (i = 0; i < S.echoMax; i++) { var f = clamp(S.echo - i, 0, 1); h += '<i class="' + (f >= 1 ? "full" : "") + '"><b style="height:' + Math.round(f * 100) + '%"></b></i>'; }
    return h + "</span>";
  }
  var hudKey = "";
  function hud(force) {
    var el = $("#hud"), list = mode === "battle" && B ? B.heroes.map(function (h) { return h.id; }) : S.party;
    var k = JSON.stringify([list, S.hp, S.pe, S.echo.toFixed(2), S.gold, S.lead, mode, S.lv, S.equip]);
    if (k === hudKey && !force) return; hudKey = k;
    var h = "";
    list.forEach(function (id) {
      var ko = S.hp[id] <= 0;
      h += '<div class="hcard' + (id === S.lead && mode !== "battle" ? " lead" : "") + (ko ? " ko" : "") + '"><img src="' + sprUrl(HEROES[id].spr) + '" alt=""><span><span class="nm">' + HEROES[id].name + '</span><span class="hp">♥ ' + Math.max(0, S.hp[id]) + "/" + maxHp(id) + "</span></span></div>";
    });
    h += '<div class="hcard res"><span class="pe">✦ ' + S.pe + "/" + maxPe() + " PE</span>" + echoHtml() + (mode !== "battle" ? '<span class="gold">' + iconImg("gold").replace("<img", '<img style="width:16px;height:16px;vertical-align:-3px"') + " " + S.gold + "</span>" : "") + "</div>";
    el.innerHTML = h;
  }
  var toastT = 0;
  function toast(msg, ms) {
    var el = $("#toast"); el.innerHTML = msg; el.className = "box show"; el.hidden = false;
    void el.offsetWidth; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, ms || 1600);
  }
  function hint(msg) { var el = $("#hint"); if (!msg) { el.hidden = true; return; } if (el.innerHTML !== msg) el.innerHTML = msg; el.hidden = false; }
  function cmdHint(msg) { var el = $("#cmd"); if (!msg) { el.hidden = true; return; } el.innerHTML = msg; el.hidden = false; }
  var KA = isTouch ? "<kbd>A</kbd>" : "<kbd>Espace</kbd>", KB = isTouch ? "<kbd>B</kbd>" : "<kbd>X</kbd>";

  var uiBusy = 0;
  var FACES = { Aelor: "sq_aelor", Aka: "sq_mage", Augh: "sq_bucheron", Gorak: "sq_gorak", Fiole: "sq_alchimiste", Pip: "sq_pip", "Grand Bélier": "grand_belier", Gardien: "crystal", Panneau: "sign" };
  // dialogue : une suite de répliques, A pour avancer
  function say(lines, name) {
    if (typeof lines === "string") lines = [lines];
    uiBusy++;
    var el = $("#dialog"), tx = el.querySelector(".dlg-text"); el.querySelector(".dlg-name").textContent = name || "";
    var face = FACES[name]; el.classList.toggle("narr", !face); if (face) el.querySelector(".dlg-face img").src = sprUrl(face);
    el.querySelector(".dlg-next").textContent = isTouch ? "▼ touche pour continuer" : "▼ Espace pour continuer";
    el.hidden = false;
    return new Promise(function (res) {
      var i = 0, shown = 0, full = "", tm = 0;
      function show() { full = lines[i]; shown = 0; clearInterval(tm); tm = setInterval(function () { shown += 2; tx.textContent = full.slice(0, shown); if (shown >= full.length) clearInterval(tm); else if (shown % 6 === 0) tone(520 + Math.random() * 80, 0.02, "square", 0.015); }, 18); }
      function next() {
        if (shown < full.length) { shown = full.length; clearInterval(tm); tx.textContent = full; return; }
        i++; SFX.move();
        if (i >= lines.length) { clearInterval(tm); off(); el.hidden = true; $("#stage").removeEventListener("pointerdown", tap); uiBusy--; res(); } else show();
      }
      var off = onKey(function (k) { if (k === "a" || k === "b") { next(); return true; } return true; });
      var t0 = now();
      function tap(e) { if (e.target.closest("#touch, #btn-pause") || now() - t0 < 200) return; next(); }
      $("#stage").addEventListener("pointerdown", tap);
      show();
    });
  }
  // menu de choix : options [{label, sub, icon, off, desc}], renvoie l'index ou -1
  function choose(opts, o) {
    o = o || {}; uiBusy++;
    var el = $("#menu"), sel = o.start || 0;
    while (opts[sel] && opts[sel].off && sel < opts.length - 1) sel++;
    function draw() {
      var h = o.title ? '<div class="mt">' + esc(o.title) + "</div>" : "";
      opts.forEach(function (op, i) { h += '<div class="mi' + (i === sel ? " sel" : "") + (op.off ? " off" : "") + '" data-i="' + i + '"><span class="ic">' + (op.icon ? (op.icon.length > 2 ? iconImg(op.icon) : op.icon) : "") + "</span>" + esc(op.label) + (op.sub ? '<span class="sub">' + esc(op.sub) + "</span>" : "") + "</div>"; });
      if (opts[sel] && opts[sel].desc) h += '<div class="md">' + esc(opts[sel].desc) + "</div>";
      el.innerHTML = h;
    }
    var pos = o.pos || { x: 16, y: 80 };
    el.className = "box"; el.hidden = false;
    draw();
    function place() {   // bas du menu au-dessus du point d'ancrage, sans sortir de l'écran
      var r = el.getBoundingClientRect(), x = clamp(pos.x - 40, 8, innerWidth - r.width - 8), y = pos.bottom ? pos.y - r.height : pos.y;
      el.style.left = x + "px"; el.style.top = clamp(y, 8, innerHeight - r.height - 8) + "px";
    }
    place(); var draw0 = draw; draw = function () { draw0(); place(); };
    return new Promise(function (res) {
      function done(v) { off(); el.hidden = true; el.onclick = null; el.onmousemove = null; uiBusy--; res(v); }
      var off = onKey(function (k) {
        if (k === "up" || k === "down") { var d = k === "up" ? -1 : 1, n = sel; do { n = (n + d + opts.length) % opts.length; } while (opts[n].off && n !== sel); sel = n; SFX.move(); draw(); }
        else if (k === "a") { if (opts[sel] && !opts[sel].off) { SFX.ok(); done(sel); } else SFX.miss(); }
        else if (k === "b" || k === "menu") { if (o.noBack) return true; SFX.back(); done(-1); }
        return true;
      });
      el.onclick = function (e) { var it = e.target.closest(".mi"); if (!it) return; var i = +it.dataset.i; if (opts[i].off) { SFX.miss(); return; } if (i === sel || isTouch) { SFX.ok(); done(i); } else { sel = i; draw(); } };
    });
  }
  function menuPosNear(x, y) {
    var r = cv.getBoundingClientRect(), sx = r.width / W;
    return { x: Math.round(r.left + x * sx), y: Math.round(Math.max(8, r.top + y * sx)), bottom: true };
  }
  // panneau plein écran (HTML libre) avec boutons [data-act]
  function panel(html, handlers, o) {
    o = o || {}; uiBusy++;
    var el = $("#panel"); el.innerHTML = '<div class="card box">' + html + "</div>"; el.hidden = false;
    return new Promise(function (res) {
      var btns = function () { return Array.prototype.slice.call(el.querySelectorAll("[data-act]")).filter(function (b) { return !b.disabled; }); }, sel = 0;
      function mark() { btns().forEach(function (b, i) { b.classList.toggle("sel", i === sel); }); var b = btns()[sel]; if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest" }); }
      function close(v) { off(); el.hidden = true; el.onclick = null; uiBusy--; res(v); }
      function act(b) {
        var a = b.dataset.act; SFX.ok();
        if (handlers && handlers[a]) { var r = handlers[a](b, close); if (r !== undefined) close(r); }
        else close(a);
      }
      var off = onKey(function (k) {
        var bs = btns();
        if (k === "left" || k === "up") { sel = (sel - 1 + bs.length) % bs.length; SFX.move(); mark(); }
        else if (k === "right" || k === "down") { sel = (sel + 1) % bs.length; SFX.move(); mark(); }
        else if (k === "a") { if (bs[sel]) act(bs[sel]); }
        else if ((k === "b" || k === "menu") && o.back) { SFX.back(); close(o.back); }
        return true;
      });
      el.onclick = function (e) { var b = e.target.closest("[data-act]"); if (b && !b.disabled) act(b); };
      el.refresh = function (h) { el.querySelector(".card").innerHTML = h; sel = Math.min(sel, btns().length - 1); mark(); };
      mark();
    });
  }

  /* =====================================================================
     Monde : cartes en tuiles (32 px), sol dithered de Survivor
     ===================================================================== */
  var GR = {
    ".": { base: "#7fa95a", patch: "#76a052", fl: ["#fdf3de", "#f2b05e", "#c8553d", "#f6d36b"], tuft: "#5b8a4a" },
    "v": { base: "#8fb866", patch: "#86ae5e", fl: ["#fdf3de", "#f6d36b"], tuft: "#6a9a52" },
    "p": { base: "#c9a070", patch: "#b98f60", pebble: "#8a6a48" },
    "f": { base: "#4a7038", patch: "#426532", fl: ["#c9b3ff", "#7fd1c7"], tuft: "#2f5a2a" },
    "w": { base: "#4f8fc0", patch: "#4686b6" },
    "r": { base: "#a8a090", patch: "#9a9282", pebble: "#7a7266", tuft: "#6a8a4a" },
    "s": { base: "#8fb0a0", patch: "#86a898", fl: ["#e8fbff", "#c9b3ff"] },
    "q": { base: "#a07848", patch: "#946c40" },
    "y": { base: "#d8b860", patch: "#cfae55" },
    "X": { base: "#1f3a2b", patch: "#1c3528" }
  };
  // tuile -> sol
  var FLOOR = { ".": ".", t: ".", v: "v", h: "v", p: "p", f: "f", T: "f", w: "w", b: "w", B: "w", r: "r", S: "r", s: "s", q: "q", y: "y", X: "X", k: "X", g: "." };
  var SOLID = { t: 1, T: 1, w: 1, b: 1, S: 1, h: 1, X: 1, k: 1 };
  var MAPS = {}, M = null;

  function seeded(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function grid(w, h, ch) { var g = [], y; for (y = 0; y < h; y++) g.push(new Array(w).fill(ch)); return g; }
  function rect(g, x0, y0, x1, y1, ch) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; }

  function genWorld() {
    var w = 64, h = 48, g = grid(w, h, "t"), R = seeded(7), x, y;
    rect(g, 12, 11, 50, 32, ".");                        // Prairies d'Aelor
    for (y = 12; y < 32; y++) for (x = 13; x < 50; x++) if (R() < 0.045) g[y][x] = "t";
    rect(g, 23, 35, 41, 46, "v");                        // Village d'Aelor
    rect(g, 0, 33, 63, 34, "w");                         // rivière
    rect(g, 31, 33, 32, 34, "b");                        // pont cassé
    rect(g, 1, 3, 11, 30, "f");                          // Forêt mystérieuse
    for (y = 3; y <= 30; y++) for (x = 1; x <= 11; x++) if (R() < 0.36) g[y][x] = "T";
    rect(g, 53, 9, 62, 31, "r");                         // Ruines anciennes
    for (y = 10; y < 31; y++) for (x = 54; x < 62; x++) if (R() < 0.1) g[y][x] = "S";
    rect(g, 26, 2, 37, 8, "s");                          // Sanctuaire du Gardien
    rect(g, 40, 2, 50, 10, ".");                         // abords de la Bergerie
    rect(g, 42, 3, 49, 6, "h");                          // la Bergerie
    // chemins
    rect(g, 31, 9, 32, 32, "p"); rect(g, 31, 35, 32, 40, "p"); rect(g, 26, 40, 38, 41, "p");
    rect(g, 12, 21, 52, 22, "p"); rect(g, 45, 7, 46, 11, "p"); rect(g, 52, 21, 56, 22, "p");
    // sentier de la forêt (de la porte au fond)
    var path = [[11, 21], [8, 21], [8, 16], [4, 16], [4, 10], [7, 10], [7, 6], [4, 6], [4, 4]];
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], sx = Math.sign(b[0] - a[0]), sy = Math.sign(b[1] - a[1]), px = a[0], py = a[1];
      while (true) { rect(g, px, py, px + 1, py + 1, "f"); if (px === b[0] && py === b[1]) break; px += sx; py += sy; }
    }
    rect(g, 3, 3, 6, 6, "f");
    for (y = 12; y <= 30; y += 5) rect(g, 55, y, 60, y + 1, "r");   // allées des ruines
    rect(g, 56, 12, 60, 16, "r");
    rect(g, 10, 21, 12, 22, "f"); rect(g, 50, 21, 53, 22, "p");
    // maisons du village
    rect(g, 25, 36, 28, 38, "h"); rect(g, 35, 36, 38, 38, "h"); rect(g, 25, 43, 28, 45, "h"); rect(g, 36, 43, 39, 45, "h");
    var objs = [], spawns = [];
    function O(type, tx, ty, extra) { var o = { type: type, x: (tx + 0.5) * TS, y: (ty + 0.5) * TS + 8, tx: tx, ty: ty }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); objs.push(o); return o; }
    O("house", 25, 36, { w: 4, h: 3, roof: "#c8553d", name: "Maison d'Aelor" });
    O("house", 35, 36, { w: 4, h: 3, roof: "#3a7ad8", name: "Échoppe" });
    O("house", 25, 43, { w: 4, h: 3, roof: "#8a5a3b" });
    O("house", 36, 43, { w: 4, h: 3, roof: "#4f8a40" });
    O("barn", 42, 3, { w: 8, h: 4 });
    O("npc", 30, 38, { id: "aelor", spr: "sq_aelor", name: "Aelor" });
    O("npc", 37, 39.4, { id: "fiole", spr: "sq_alchimiste", name: "Fiole" });
    O("npc", 28.2, 39.3, { id: "aka", spr: "sq_mage", name: "Aka", cond: function () { return S.q >= 1 && S.party.indexOf("aka") < 0; } });
    O("npc", 34.8, 42, { id: "gorak", spr: "sq_gorak", name: "Gorak", cond: function () { return S.q >= 3 && S.party.indexOf("gorak") < 0; } });
    O("npc", 24.5, 40.5, { id: "kid", spr: "sq_pip", name: "Pip" });
    O("well", 33.5, 42, { name: "Source d'Aether" });
    O("save", 29.5, 42);
    O("save", 33.4, 24);
    O("save", 45.5, 9.2);
    O("oak", 35, 35.3, { id: "oak" });
    O("gate", 11, 21, { id: "gate", w: 1, h: 2 });
    O("boulder", 52, 21, { id: "boulder", w: 1, h: 2 });
    O("guardian", 31.5, 4.2, { id: "guardian" });
    O("door", 45.5, 6.6, { id: "bdoor" });
    O("herb", 4.5, 4.5, { id: "herb" });
    O("bosspot", 58, 14, { id: "belier", boss: "belier_furieux" });
    O("sign", 30, 31, { text: ["Au nord : le Sanctuaire du Gardien.", "À l'ouest : la Forêt mystérieuse. À l'est : les Ruines anciennes."] });
    O("sign", 33.6, 36.6, { text: ["Village d'Aelor. Les Bouftons sont priés de rester dans la prairie."] });
    O("chest", 39.5, 41, { id: "c_v", gives: { badge: "panache" } });
    O("chest", 14, 13, { id: "c_p1", gives: { item: "potion", n: 2 } });
    O("chest", 48.5, 30, { id: "c_p2", gives: { badge: "premier" } });
    O("chest", 2, 28, { id: "c_f1", gives: { badge: "coeur" } });
    O("chest", 9, 8, { id: "c_f2", gives: { item: "ether", n: 2 } });
    O("chest", 61, 29, { id: "c_r1", gives: { badge: "epines" } });
    O("chest", 54, 10, { id: "c_r2", gives: { gold: 40 } });
    O("chest", 36.5, 3, { id: "c_s1", gives: { badge: "fleur" } });
    O("chest", 41, 9, { id: "c_b0", gives: { item: "miel", n: 1 } });
    for (y = 35; y <= 46; y++) for (x = 23; x <= 41; x++) { if (y === 35 && (x < 30 || x > 37) && x % 2 === 0) O("fence", x, y - 0.4); }
    // ennemis de la carte : zones et groupes
    spawns.push({ zone: [13, 12, 49, 31], n: 7, groups: function () { var g2 = [["mouton"], ["mouton", "mouton"], ["mouton", "limace"], ["guepe", "mouton"], ["limace", "limace"], ["mouton", "mouton", "limace"]]; if (S.q >= 2) g2.push(["herisson"], ["belier", "mouton"], ["guepe", "guepe"]); return g2; }, bg: "prairie" });
    spawns.push({ zone: [2, 4, 10, 29], n: 6, groups: function () { return [["araignee"], ["spectre", "araignee"], ["renard"], ["guepe", "araignee", "guepe"], ["spectre", "spectre"]]; }, bg: "foret" });
    spawns.push({ zone: [54, 10, 61, 30], n: 6, groups: function () { return [["belier", "belier"], ["mystique", "mouton"], ["sanglier"], ["corbeau", "renard"], ["herisson", "mystique"]]; }, bg: "ruines" });
    return { id: "world", name: "Prairies d'Aelor", w: w, h: h, g: g, objs: objs, spawns: spawns, regions: [
      { name: "Village d'Aelor", r: [23, 35, 41, 46], bg: "prairie" }, { name: "Sanctuaire du Gardien", r: [26, 0, 38, 8], bg: "sanctuaire" },
      { name: "Forêt mystérieuse", r: [0, 0, 11, 32], bg: "foret" }, { name: "Ruines anciennes", r: [53, 8, 63, 32], bg: "ruines" },
      { name: "Bergerie oubliée", r: [40, 0, 51, 10], bg: "prairie" }, { name: "Prairies d'Aelor", r: [0, 0, 63, 47], bg: "prairie" }] };
  }
  // Bergerie oubliée : trois salles
  function genRoom(n) {
    var w = 15, h = 10, g = grid(w, h, "k"), x, y, objs = [];
    rect(g, 1, 1, 13, 8, "q");
    for (y = 2; y < 8; y++) for (x = 2; x < 13; x++) if ((x * 7 + y * 13 + n * 5) % 11 === 0) g[y][x] = "y";
    rect(g, 6, 9, 8, 9, "q");                       // porte sud
    function O(type, tx, ty, extra) { var o = { type: type, x: (tx + 0.5) * TS, y: (ty + 0.5) * TS + 8, tx: tx, ty: ty }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); objs.push(o); return o; }
    O("exit", 7, 9, { to: n === 1 ? "world" : "berg" + (n - 1), tx2: n === 1 ? 45.5 : 7, ty2: n === 1 ? 8.4 : 1.6 });
    if (n < 3) { rect(g, 6, 0, 8, 0, "q"); O("updoor", 7, 0.2, { to: "berg" + (n + 1), need: "clear" + n }); }
    var fixed = [];
    if (n === 1) { fixed.push({ x: 4, y: 4, group: ["mouton", "mystique"] }, { x: 10, y: 3, group: ["belier", "mouton"] }); O("save", 2, 7.4); }
    if (n === 2) { fixed.push({ x: 4, y: 3, group: ["sanglier", "mouton", "mouton"] }, { x: 10, y: 5, group: ["mystique", "mystique", "belier"] }); O("chest", 12, 7, { id: "c_b2", gives: { badge: "souffle" } }); }
    if (n === 3) { O("bosspot", 7, 3, { id: "boss", boss: "grand_belier" }); O("save", 2, 7.4); O("chest", 12, 7, { id: "c_b3", gives: { item: "grande", n: 2 } }); }
    return { id: "berg" + n, name: "Bergerie oubliée · salle " + n, w: w, h: h, g: g, objs: objs, spawns: [], fixed: fixed, room: n, regions: [{ name: "Bergerie oubliée", r: [0, 0, 14, 9], bg: "bergerie" }] };
  }

  function tileAt(m, tx, ty) { if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return "X"; return m.g[ty][tx]; }
  function groundOf(m, tx, ty) { return GR[FLOOR[tileAt(m, tx, ty)] || "."]; }
  // rendu du sol complet d'une carte (morceaux de 4 × 4 tuiles de Survivor, agrandis × 2)
  function bakeGround(m) {
    var c = document.createElement("canvas"); c.width = m.w * TS; c.height = m.h * TS;
    var g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    var getG = function (a, b) { return groundOf(m, a, b); }, cx, cy;
    for (cy = 0; cy < Math.ceil(m.h / 4); cy++) for (cx = 0; cx < Math.ceil(m.w / 4); cx++) {
      if (ART && ART.groundChunk) { var ch = ART.groundChunk(cx, cy, getG); g.drawImage(ch, cx * 128, cy * 128, 128, 128); }
      else { for (var yy = 0; yy < 4; yy++) for (var xx = 0; xx < 4; xx++) { g.fillStyle = getG(cx * 4 + xx, cy * 4 + yy).base; g.fillRect((cx * 4 + xx) * TS, (cy * 4 + yy) * TS, TS, TS); } }
    }
    // détails : fleurs, touffes, cailloux (déterministes)
    var R = seeded(m.w * 31 + m.h), tx, ty;
    for (ty = 0; ty < m.h; ty++) for (tx = 0; tx < m.w; tx++) {
      var G = groundOf(m, tx, ty), k = 0;
      for (k = 0; k < 3; k++) {
        var r = R(), px = tx * TS + Math.floor(R() * 28) + 2, py = ty * TS + Math.floor(R() * 28) + 2;
        if (G.fl && r < 0.12) { g.fillStyle = OUT; g.fillRect(px - 1, py - 1, 4, 4); g.fillStyle = G.fl[Math.floor(R() * G.fl.length)]; g.fillRect(px, py, 2, 2); }
        else if (G.tuft && r < 0.4) { g.fillStyle = G.tuft; g.fillRect(px, py, 2, 4); g.fillRect(px + 2, py + 1, 2, 3); g.fillRect(px - 2, py + 2, 2, 2); }
        else if (G.pebble && r < 0.5) { g.fillStyle = G.pebble; g.fillRect(px, py, 4, 2); }
      }
      if (tileAt(m, tx, ty) === "w") { g.fillStyle = "rgba(191,239,255,.35)"; g.fillRect(tx * TS + 4 + (tx * 7) % 14, ty * TS + 10 + (ty * 5) % 12, 8, 2); }
      if (FLOOR[tileAt(m, tx, ty)] === "w" && FLOOR[tileAt(m, tx, ty - 1)] !== "w") { g.fillStyle = "#3a6a8a"; g.fillRect(tx * TS, ty * TS, TS, 3); g.fillStyle = "#2b1709"; g.fillRect(tx * TS, ty * TS, TS, 1); }
      if (tileAt(m, tx, ty) === "k") { g.fillStyle = "#5a3820"; g.fillRect(tx * TS, ty * TS, TS, TS); g.fillStyle = "#6b4430"; for (var pl = 0; pl < 4; pl++) g.fillRect(tx * TS, ty * TS + pl * 8, TS, 6); g.fillStyle = OUT; g.fillRect(tx * TS + ((ty % 2) ? 10 : 22), ty * TS, 2, TS); }
    }
    m.ground = c;
  }
  function getMap(id) {
    if (!MAPS[id]) { MAPS[id] = id === "world" ? genWorld() : genRoom(+id.slice(4)); bakeGround(MAPS[id]); }
    return MAPS[id];
  }
  function objSolid(o) {
    if (o.type === "house" || o.type === "barn" || o.type === "fence" || o.type === "chest" || o.type === "save" || o.type === "well" || o.type === "sign") return true;
    if (o.type === "npc") return !o.cond || o.cond();
    if (o.type === "oak") return true;
    if (o.type === "gate") return !S.flags.gate;
    if (o.type === "boulder") return !S.flags.boulder;
    if (o.type === "guardian") return true;
    if (o.type === "bosspot") return !S.flags[o.id];
    if (o.type === "updoor") return !S.flags[o.need];
    return false;
  }
  function objBox(o) {
    if (o.type === "house" || o.type === "barn") return [o.tx * TS, o.ty * TS, o.w * TS, o.h * TS];
    if (o.type === "gate" || o.type === "boulder") return [o.tx * TS, o.ty * TS, TS * (o.w || 1), TS * (o.h || 1)];
    if (o.type === "updoor") return [o.tx * TS - 48, 0, TS * 3, TS];
    if (o.type === "fence") return [o.x - 16, o.y - 8, 32, 8];
    if (o.type === "oak") return [o.x - 14, o.y - 12, 28, 12];
    return [o.x - 10, o.y - 10, 20, 10];
  }
  function solidAt(px, py) {
    var t = tileAt(M, Math.floor(px / TS), Math.floor(py / TS));
    if (t === "b") return !S.flags.bridge;
    if (SOLID[t]) return true;
    for (var i = 0; i < M.objs.length; i++) { var o = M.objs[i]; if (!objSolid(o)) continue; var b = objBox(o); if (px >= b[0] && px < b[0] + b[2] && py >= b[1] && py < b[1] + b[3]) return true; }
    return false;
  }
  function boxFree(x, y) { return !solidAt(x - 6, y - 3) && !solidAt(x + 6, y - 3) && !solidAt(x - 6, y + 3) && !solidAt(x + 6, y + 3); }
  function regionAt(x, y) { var tx = x / TS, ty = y / TS; for (var i = 0; i < M.regions.length; i++) { var r = M.regions[i].r; if (tx >= r[0] && tx <= r[2] + 1 && ty >= r[1] && ty <= r[3] + 1) return M.regions[i]; } return M.regions[M.regions.length - 1]; }

  /* ---------- joueur, compagnons, ennemis de la carte ---------- */
  var P = { x: S.x, y: S.y, fx: 0, fy: 1, face: 1, moving: false, t: 0, act: 0, inv: 0, trail: [] };
  var WE = [];         // ennemis visibles sur la carte
  var mode = "title", B = null, curRegion = "";
  function enterMap(id, x, y) {
    M = getMap(id); S.map = id; P.x = x; P.y = y; P.trail = []; WE = [];
    for (var i = 0; i < 40; i++) P.trail.push({ x: x, y: y + i * 0.01 });
    spawnAll(true);
  }
  function spawnAll(full) {
    if (M.fixed) {
      M.fixed.forEach(function (f, i) { var key = M.id + "_" + i; if (S.flags[key]) return; if (!WE.some(function (e) { return e.key === key; })) WE.push(mkWE((f.x + 0.5) * TS, (f.y + 0.5) * TS, f.group, "bergerie", key)); });
      return;
    }
    M.spawns.forEach(function (sp) {
      var cur = WE.filter(function (e) { return e.sp === sp; }).length, tries = 0;
      while (cur < sp.n && tries++ < 60) {
        var tx = ri(sp.zone[0], sp.zone[2]), ty = ri(sp.zone[1], sp.zone[3]), x = (tx + 0.5) * TS, y = (ty + 0.5) * TS;
        if (!boxFree(x, y)) continue;
        if (!full && Math.hypot(x - P.x, y - P.y) < 260) continue;
        if (Math.hypot(x - P.x, y - P.y) < 120) continue;
        var e = mkWE(x, y, pick(sp.groups()), sp.bg); e.sp = sp; WE.push(e); cur++;
      }
    });
  }
  function mkWE(x, y, group, bg, key) {
    var lead = ENEMIES[group[0]];
    return { x: x, y: y, hx: x, hy: y, group: group, bg: bg, key: key, spr: lead.spr, fly: !!lead.fly, t: Math.random() * 10, vx: 0, vy: 0, st: "wander", wt: 0, stun: 0, face: -1, sc: lead.sc === 3 ? 2 : 1 };
  }

  function leadHero() { return S.party.indexOf(S.lead) >= 0 ? S.lead : S.party[0]; }
  function swapLead() {
    if (S.party.length < 2) { toast("Augh voyage seul pour l'instant."); return; }
    var i = S.party.indexOf(leadHero()); S.lead = S.party[(i + 1) % S.party.length]; SFX.ok();
    toast("<b>" + HEROES[S.lead].name + "</b> mène l'équipe<br><small>A sert à " + HEROES[S.lead].fieldName + "</small>", 1300);
    hud();
  }
  // objet interactif le plus proche, devant le joueur
  function nearObj() {
    var best = null, bd = 44, fx = P.x + P.fx * 14, fy = P.y + P.fy * 12;
    M.objs.forEach(function (o) {
      if (o.type === "npc" && o.cond && !o.cond()) return;
      if (["house", "barn", "fence"].indexOf(o.type) >= 0) return;
      if (o.type === "chest" && S.chests[o.id]) return;
      if ((o.type === "gate" && S.flags.gate) || (o.type === "boulder" && S.flags.boulder) || (o.type === "herb" && S.flags.herb) || (o.type === "oak" && S.flags.bridge)) return;
      if (o.type === "bosspot" && S.flags[o.id]) return;
      var b = objBox(o), cx = clamp(fx, b[0], b[0] + b[2]), cy = clamp(fy, b[1], b[1] + b[3]), d = Math.hypot(fx - cx, fy - cy);
      if (o.type === "door" || o.type === "exit" || o.type === "updoor") d = Math.hypot(fx - o.x, fy - o.y) - 4;
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }
  function objLabel(o) {
    var L = leadHero();
    switch (o.type) {
      case "npc": return "Parler à " + o.name;
      case "chest": return "Ouvrir le coffre";
      case "save": return "Cristal d'écho : sauvegarder";
      case "well": return "Boire à la source (soins)";
      case "sign": return "Lire le panneau";
      case "oak": return L === "augh" ? "Abattre le grand chêne" : "Un grand chêne… (il faudrait Augh)";
      case "gate": return L === "aka" ? "Lier le cristal" : "Un cristal scelle le passage… (il faudrait Aka)";
      case "boulder": return L === "gorak" ? "Briser le rocher" : "Un rocher énorme… (il faudrait Gorak)";
      case "guardian": return "Toucher le cristal du Gardien";
      case "door": return "Entrer dans la Bergerie";
      case "exit": return "Sortir";
      case "updoor": return S.flags[o.need] ? "Salle suivante" : "Porte fermée : bats les moutons de la salle";
      case "herb": return "Cueillir l'herbe de lune";
      case "bosspot": return "Affronter " + ENEMIES[o.boss].name;
    }
    return "";
  }
  async function interact(o) {
    var L = leadHero();
    switch (o.type) {
      case "npc": await talk(o); break;
      case "sign": await say(o.text, "Panneau"); break;
      case "chest": await openChest(o); break;
      case "save":
        save(); SFX.magic(); await say(["Le cristal d'écho vibre doucement… La partie est sauvegardée."]); break;
      case "well":
        S.party.forEach(function (h) { S.hp[h] = maxHp(h); }); S.pe = maxPe(); SFX.lvl(); hud();
        await say(["L'eau de la source d'Aether est fraîche. PV et PE restaurés !"]); spawnAll(false); break;
      case "oak":
        if (L !== "augh") { await say(["Un vieux chêne penche au-dessus de la rivière. Augh pourrait l'abattre pour en faire un pont."]); break; }
        P.act = 0.35; SFX.chop(); await wait(250); SFX.chop(); shakeW = 8; S.flags.bridge = 1; save();
        await say(["Augh abat le grand chêne d'un seul lancer de hache. Le tronc tombe en travers de la rivière : voilà un pont !"], "Augh"); break;
      case "gate":
        if (L !== "aka") { await say(["Un cristal ancien scelle l'entrée de la forêt. Aka sait lier ces cristaux."]); break; }
        SFX.magic(); flashW = 1; S.flags.gate = 1; save(); await say(["Aka trace une rune : le cristal se lie à elle et s'éteint. Le passage est ouvert."], "Aka"); break;
      case "boulder":
        if (L !== "gorak") { await say(["Un rocher énorme bloque le chemin des ruines. Il faudrait la massue de Gorak."]); break; }
        P.act = 0.35; SFX.hit(); shakeW = 12; S.flags.boulder = 1; save(); await say(["GORAK… FRAPPE ! Le rocher vole en éclats."], "Gorak"); break;
      case "herb":
        if (!S.flags.tisseuse) { await say(["Une herbe argentée brille sous la lune… mais des fils de brume s'agitent tout autour !"]); await startBattle(["tisseuse", "araignee"], { bg: "foret", boss: true, flag: "tisseuse" }); break; }
        S.flags.herb = 1; SFX.coin(); save(); await say(["Tu cueilles l'herbe de lune. Rapporte-la à Aelor."]); break;
      case "bosspot":
        if (o.boss === "belier_furieux" && S.q < 3) { await say(["Un bélier énorme gratte le sol en soufflant… Mieux vaut revenir plus tard."]); break; }
        if (o.boss === "grand_belier") { await say(["Le Grand Bélier se dresse au milieu de la paille, les cornes couronnées d'or.", "« BÊÊÊÊ ! Qui ose troubler ma bergerie ? »"], "Grand Bélier"); await startBattle(["grand_belier", "mouton"], { bg: "bergerie", boss: true, flag: "boss" }); }
        else { await say(["Le Bélier furieux baisse les cornes…"]); await startBattle(["belier_furieux"], { bg: "ruines", boss: true, flag: "belier" }); }
        break;
      case "guardian": await guardian(); break;
      case "door":
        if (S.q < 5) { await say(["La porte de la Bergerie oubliée est scellée par une magie ancienne."]); break; }
        await fadeTo(function () { enterMap("berg1", 7.5 * TS, 8.2 * TS); }); break;
      case "exit": await fadeTo(function () { enterMap(o.to, o.tx2 * TS, o.ty2 * TS + 12); }); break;
      case "updoor":
        if (!S.flags[o.need]) { await say(["La porte ne s'ouvre pas tant qu'il reste des moutons dans la salle."]); break; }
        await fadeTo(function () { enterMap(o.to, 7.5 * TS, 8.2 * TS); }); break;
    }
    hud();
  }
  async function openChest(o) {
    S.chests[o.id] = 1; SFX.coin(); var g = o.gives, msg;
    if (g.badge) { S.badges.push(g.badge); msg = "Insigne trouvé : « " + BADGES[g.badge].name + " » ! " + BADGES[g.badge].desc + " (À équiper dans le menu, onglet Insignes.)"; }
    else if (g.item) { addItem(g.item, g.n); msg = "Tu trouves " + (g.n || 1) + " × " + ITEMS[g.item].name + "."; }
    else { S.gold += g.gold; msg = "Tu trouves " + g.gold + " glands d'or !"; }
    save(); await say([msg]);
  }
  async function guardian() {
    if (S.q < 4) { await say(["Un immense cristal dort ici. Il semble attendre quelque chose… ou quelqu'un."]); return; }
    if (S.q > 4) { await say(["Le cristal du Gardien veille sur Aelor. Ta jauge d'Écho résonne avec lui."]); S.echo = S.echoMax; hud(); return; }
    if (S.party.length < 3) { await say(["Le cristal reste muet. Il faut toute l'équipe."]); return; }
    SFX.magic(); flashW = 1;
    await say(["Augh, Aka et Gorak posent la main sur le cristal…", "Une voix ancienne résonne : « Les échos de l'Aether vous reconnaissent. »", "La jauge d'Écho grandit (5 cases) ! Nouvelles techniques d'Écho : Avalanche des Cimes et Éveil d'Aether.", "Le sceau de la Bergerie oubliée est brisé. Le Grand Bélier vous attend, au nord-est."], "Gardien");
    S.echoMax = 5; S.echo = 5; S.flags.eveil = 1; S.q = 5; save();
  }
  async function talk(o) {
    if (o.id === "aelor") {
      if (S.q === 0) {
        await say(["Bienvenue à Aelor, Augh. Les petits moutons des prairies, les Bouftons, piétinent nos récoltes.", "Élimine-en trois, veux-tu ? Le pont sur la rivière est cassé… mais ta hache peut abattre le grand chêne, juste à côté.",
          "Dans les prairies, touche un monstre pour l'affronter. Frappe-le avec A avant qu'il te touche : tu auras le premier coup !"], "Aelor");
        S.q = 1; S.kills = 0;
      } else if (S.q === 1) {
        if (S.kills >= 3) {
          await say(["Merci ! Tu as la main sûre. Prends ces potions, elles te sauveront la vie.", "Et voici Aka, mon élève. Elle sait lier les cristaux anciens. Emmène-la !"], "Aelor");
          addItem("potion", 3); S.party.push("aka"); S.hp.aka = maxHp("aka"); S.q = 2; SFX.lvl();
          await say(["Enchantée, Augh. Je ne frappe pas très fort… mais ma magie passe à travers toutes les armures.", "Change de meneur avec " + (isTouch ? "B" : "C ou Tab") + " : je peux ouvrir le passage de la forêt."], "Aka");
        } else await say(["Encore " + (3 - S.kills) + " Bouftons à calmer dans les prairies, au nord de la rivière."], "Aelor");
      } else if (S.q === 2) {
        if (S.flags.herb) {
          await say(["L'herbe de lune ! Avec elle, je vais pouvoir soigner le village. Voici 50 glands d'or.", "Oh, et un colosse est descendu des Cimes ce matin. Il attend près de la source et cherche des adversaires à sa taille."], "Aelor");
          S.gold += 50; S.q = 3; SFX.coin();
        } else await say(["L'herbe de lune pousse au fond de la Forêt mystérieuse, à l'ouest. Méfie-toi des brumes."], "Aelor");
      } else if (S.q === 3) {
        if (S.flags.belier) {
          await say(["Tu as calmé le Bélier furieux ! Ses cornes ont laissé ça dans les ruines : une hache d'acier, pour Augh.", "Les Hache rapide d'Augh infligent maintenant 1 dégât de plus.", "Il est temps : rendez-vous tous les trois au Sanctuaire du Gardien, au nord. Le cristal vous attend."], "Aelor");
          S.flags.steel = 1; S.q = 4; S.gold += 30; SFX.lvl();
        } else await say(["Un bélier énorme s'est installé dans les Ruines anciennes, à l'est. Il charge tout ce qui bouge."], "Aelor");
      } else if (S.q === 4) await say(["Le Sanctuaire du Gardien est au bout du chemin du nord. Allez-y tous les trois."], "Aelor");
      else if (S.q === 5) await say(["Le Grand Bélier règne sur la Bergerie oubliée, au nord-est. Traverse ses trois salles et vaincs-le.", "Observe ses charges, garde au bon moment, puis contre-attaque !"], "Aelor");
      else await say(["Tu as vaincu le Grand Bélier ! Aelor te doit tout. Les prairies sont à toi, reviens quand tu veux."], "Aelor");
    } else if (o.id === "aka") {
      await say(["Maître Aelor m'a parlé de toi. Va d'abord l'aider, on se reparle ensuite !"], "Aka");
    } else if (o.id === "gorak") {
      await say(["GORAK… CHERCHE… ADVERSAIRES.", "Toi petit, mais toi fort. Gorak vient avec toi. Gorak brise rochers !", "(Gorak ne peut pas frapper les volants avec sa massue… mais son Fracas les fait tomber.)"], "Gorak");
      S.party.push("gorak"); S.hp.gorak = maxHp("gorak"); SFX.lvl();
    } else if (o.id === "fiole") await shop();
    else if (o.id === "kid") {
      await say(pick([["Au combat, appuie juste avant que le monstre te touche : c'est une garde !", "Et si tu appuies sur " + (isTouch ? "B" : "X") + " pile au dernier moment, c'est un contre : zéro dégât, et ça le pique !"],
        ["Le public de la forêt adore le spectacle. Réussis tes commandes et il remplit ta jauge d'Écho.", "Quand une étincelle ✦ apparaît après un beau coup, appuie sur " + (isTouch ? "B" : "X") + " pour faire le malin !"],
        ["Les insignes changent tout ! Équipe-les depuis le menu (" + (isTouch ? "☰" : "Échap") + "), onglet Insignes."]]), "Pip");
    }
    save();
  }
  async function shop() {
    await say(["Bienvenue à l'échoppe de Fiole ! Potions, babioles et insignes."], "Fiole");
    var stock = ["potion", "grande", "ether", "miel", "bombe", "sommeil", "plume"].map(function (id) { return { k: "item", id: id }; })
      .concat(["tranchant", "ecorce", "fortune", "regain", "premier"].map(function (id) { return { k: "badge", id: id }; }));
    function html() {
      var h = '<span class="kick">Échoppe de Fiole</span><h2>Que veux-tu acheter ?</h2><p class="gold">' + iconImg("gold").replace("<img", '<img style="width:18px;height:18px;vertical-align:-3px"') + " " + S.gold + ' glands d\'or</p><div class="list">';
      stock.forEach(function (s, i) {
        var d = s.k === "item" ? ITEMS[s.id] : BADGES[s.id], owned = s.k === "badge" && S.badges.indexOf(s.id) >= 0;
        h += '<button class="li' + (owned ? " off" : "") + '" data-act="buy" data-i="' + i + '"' + (owned || S.gold < d.price ? " disabled" : "") + ">" + iconImg(d.icon) + '<span class="grow">' + esc(d.name) + (s.k === "badge" ? " <span class=\"tag\">insigne · " + d.pi + " PI</span>" : " (x" + (S.items[s.id] || 0) + ")") + "<small>" + esc(d.desc) + '</small></span><span class="tag">' + (owned ? "acquis" : d.price + " ✦") + "</span></button>";
      });
      return h + '</div><div class="row" style="margin-top:10px"><button class="btn ghost" data-act="close">Merci, au revoir</button></div>';
    }
    await panel(html(), {
      buy: function (b) { var s = stock[+b.dataset.i], d = s.k === "item" ? ITEMS[s.id] : BADGES[s.id]; if (S.gold < d.price) return; S.gold -= d.price; if (s.k === "item") addItem(s.id); else S.badges.push(s.id); SFX.coin(); save(); hud(); $("#panel").refresh(html()); },
      close: function () { return "close"; }
    }, { back: "close" });
  }

  var fadeA = 0, shakeW = 0, flashW = 0;
  async function fadeTo(fn) { uiBusy++; await tween(window.__fade = window.__fade || { a: 0 }, { a: 1 }, 250, "in"); fn(); hud(true); await tween(window.__fade, { a: 0 }, 300, "out"); uiBusy--; }

  /* ---------- mise à jour de la carte ---------- */
  var lastInteract = 0;
  function updateWorld(dt) {
    P.t += dt; if (P.inv > 0) P.inv -= dt; if (P.act > 0) P.act -= dt;
    var busy = uiBusy > 0;
    var dx = 0, dy = 0;
    var mag = 1;
    if (!busy) {
      if (STICK.on && Math.hypot(STICK.x, STICK.y) > 0.18) { dx = STICK.x; dy = STICK.y; mag = clamp(Math.hypot(dx, dy) * 1.15, 0.4, 1); }
      else { if (held.left) dx--; if (held.right) dx++; if (held.up) dy--; if (held.down) dy++; }
    }
    P.moving = !!(dx || dy);
    if (P.moving) {
      var l = Math.hypot(dx, dy); dx /= l; dy /= l; P.fx = dx; P.fy = dy; if (Math.abs(dx) > 0.2) P.face = dx > 0 ? 1 : -1;
      var sp = 92 * mag * dt, nx = P.x + dx * sp, ny = P.y + dy * sp;
      if (boxFree(nx, P.y)) P.x = nx; if (boxFree(P.x, ny)) P.y = ny;
      var last = P.trail[0]; if (!last || Math.hypot(last.x - P.x, last.y - P.y) > 2) { P.trail.unshift({ x: P.x, y: P.y, f: P.face }); if (P.trail.length > 60) P.trail.pop(); }
    }
    var reg = regionAt(P.x, P.y);
    if (reg.name !== curRegion) { curRegion = reg.name; if (mode === "world") toast("<small>~</small> " + reg.name + " <small>~</small>", 1400); if (reg.name === "Village d'Aelor") spawnAll(false); }
    // ennemis
    WE.forEach(function (e) {
      e.t += dt; if (e.stun > 0) { e.stun -= dt; return; }
      var d = Math.hypot(P.x - e.x, P.y - e.y), sp = 0;
      if (busy) return;
      if (d < 110 && P.inv <= 0 && !e.key) { e.st = "chase"; }
      else if (d > 190 || P.inv > 0) e.st = "wander";
      if (e.key) e.st = d < 70 ? "chase" : "wander";
      if (e.st === "chase") { if (e.wt <= 0 && !e.seen) { e.seen = 0.5; } if (e.seen > 0) { e.seen -= dt; return; } sp = 58; e.vx = (P.x - e.x) / d; e.vy = (P.y - e.y) / d; }
      else { e.seen = 0; e.wt -= dt; if (e.wt <= 0) { e.wt = rnd(1, 2.6); var a = Math.random() * TAU; e.vx = Math.cos(a); e.vy = Math.sin(a); if (Math.random() < 0.35) e.vx = e.vy = 0; if (Math.hypot(e.x - e.hx, e.y - e.hy) > 70) { var b2 = Math.atan2(e.hy - e.y, e.hx - e.x); e.vx = Math.cos(b2); e.vy = Math.sin(b2); } } sp = 22; }
      if (e.vx) e.face = e.vx > 0 ? 1 : -1;
      var nx = e.x + e.vx * sp * dt, ny = e.y + e.vy * sp * dt;
      if (e.fly || boxFree(nx, e.y)) e.x = nx; if (e.fly || boxFree(e.x, ny)) e.y = ny;
      if (e.fly) { e.x = clamp(e.x, e.hx - 120, e.hx + 120); e.y = clamp(e.y, e.hy - 120, e.hy + 120); }
      if (d < 16 && P.inv <= 0 && mode === "world" && !busy) {
        var behind = (P.fx * (e.x - P.x) + P.fy * (e.y - P.y)) < -4 && e.st === "chase";
        engage(e, behind ? "enemy" : null);
      }
    });
    // attaque de terrain : le premier coup
    if (P.act > 0 && P.act < 0.24 && !P.hitDone && mode === "world") {
      var hx = P.x + P.fx * 18, hy = P.y + P.fy * 14 - 4;
      WE.forEach(function (e) { if (!P.hitDone && Math.hypot(e.x - hx, e.y - hy) < 22 && (!e.fly || leadHero() !== "gorak")) { P.hitDone = true; engage(e, "hero"); } });
    }
    var o = !busy ? nearObj() : null;
    hint(o ? "<b>A</b> · " + objLabel(o) : "");
    if (S.party.length) { var k = 0; S.party.forEach(function () { }); }
  }
  function worldA() {
    if (mode !== "world" || uiBusy) return;
    var o = nearObj();
    if (o) { if (now() - lastInteract < 250) return; lastInteract = now(); hint(""); interact(o); return; }
    if (P.act > 0) return;
    P.act = 0.32; P.hitDone = false; tone(300, 0.06, "square", 0.04, 1.6);
  }
  onKey(function (k) {
    if (mode !== "world" || uiBusy) return false;
    if (k === "a") { worldA(); return true; }
    if (k === "b" || k === "swap") { swapLead(); return true; }
    if (k === "menu") { pauseMenu(); return true; }
    return false;
  });
  async function engage(e, first) {
    if (mode !== "world") return;
    mode = "trans"; hint("");
    var idx = WE.indexOf(e);
    var res = await startBattle(e.group, { bg: e.bg, first: first, key: e.key });
    if (res === "win") { WE.splice(WE.indexOf(e), 1); if (e.key) { S.flags[e.key] = 1; checkRoomClear(); } }
    else if (res === "flee") { e.stun = 2.5; P.inv = 2.5; }
    save();
  }
  function checkRoomClear() {
    if (!M.fixed) return;
    var all = M.fixed.every(function (f, i) { return S.flags[M.id + "_" + i]; });
    if (all && !S.flags["clear" + M.room]) { S.flags["clear" + M.room] = 1; setTimeout(function () { toast("La porte du nord s'ouvre !"); SFX.ok(); }, 600); }
  }

  /* ---------- objectif courant : une flèche montre où aller ---------- */
  function objById(id) { for (var i = 0; i < M.objs.length; i++) if (M.objs[i].id === id) return M.objs[i]; return null; }
  function leadTip(h) { return leadHero() === h ? "" : " (passe " + HEROES[h].name + " en tête avec " + (isTouch ? "B" : "C") + ")"; }
  function objective() {
    var o;
    if (M.room) {
      if (M.room < 3) {
        if (S.flags["clear" + M.room]) { o = M.objs.filter(function (x) { return x.type === "updoor"; })[0]; return { x: o.x, y: o.y + 20, label: "Passe la porte du nord" }; }
        var e = WE.filter(function (w) { return w.key; })[0]; return e ? { x: e.x, y: e.y, label: "Bats les moutons de la salle" } : null;
      }
      o = objById("boss"); return S.flags.boss ? null : { x: o.x, y: o.y, label: "Affronte le Grand Bélier" };
    }
    if (S.q === 0) { o = objById("aelor"); return { x: o.x, y: o.y, label: "Parle à Aelor (A devant lui)" }; }
    if (S.q === 1) {
      if (!S.flags.bridge) { o = objById("oak"); return { x: o.x, y: o.y + 6, label: "Abats le grand chêne (A devant l'arbre)" }; }
      if (S.kills < 3) return { x: 31.5 * TS, y: 22 * TS, near: true, label: "Fonce sur les Bouftons de la prairie (" + S.kills + "/3)" };
      o = objById("aelor"); return { x: o.x, y: o.y, label: "Retourne voir Aelor" };
    }
    if (S.q === 2) {
      if (!S.flags.gate) { o = objById("gate"); return { x: o.x + 18, y: o.y + 16, label: "Lie le cristal de la forêt" + leadTip("aka") }; }
      if (!S.flags.herb) { o = objById("herb"); return { x: o.x, y: o.y, label: "Cueille l'herbe de lune au fond de la forêt" }; }
      o = objById("aelor"); return { x: o.x, y: o.y, label: "Rapporte l'herbe à Aelor" };
    }
    if (S.q === 3) {
      if (S.party.indexOf("gorak") < 0) { o = objById("gorak"); return { x: o.x, y: o.y, label: "Parle à Gorak, près de la source" }; }
      if (!S.flags.boulder) { o = objById("boulder"); return { x: o.x - 18, y: o.y + 16, label: "Brise le rocher des ruines" + leadTip("gorak") }; }
      if (!S.flags.belier) { o = objById("belier"); return { x: o.x, y: o.y, label: "Affronte le Bélier furieux" }; }
      o = objById("aelor"); return { x: o.x, y: o.y, label: "Retourne voir Aelor" };
    }
    if (S.q === 4) { o = objById("guardian"); return { x: o.x, y: o.y, label: "Touche le cristal du Sanctuaire, au nord" }; }
    if (S.q === 5) { o = objById("bdoor"); return { x: o.x, y: o.y + 10, label: "Entre dans la Bergerie oubliée" }; }
    return null;
  }
  function drawObjective(t) {
    var ob = objective(); if (!ob || uiBusy) return;
    var sx = ob.x - cam.x, sy = ob.y - cam.y, d = Math.hypot(ob.x - P.x, ob.y - P.y);
    if (ob.near && d < 120) return;
    var inside = sx > 20 && sx < W - 20 && sy > 50 && sy < H - 10;
    if (inside) {
      if (d < 40) return;
      var by = sy - 44 + Math.sin(t * 6) * 4;
      arrowTri(sx, by, Math.PI / 2, 9);
    } else {
      var a = Math.atan2(sy - H / 2, sx - W / 2), ex = clamp(W / 2 + Math.cos(a) * 400, 22, W - 22), ey = clamp(H / 2 + Math.sin(a) * 400, 62, H - 22);
      var pulse = 1 + Math.sin(t * 7) * 0.12;
      arrowTri(ex, ey, a, 10 * pulse);
    }
  }
  function arrowTri(x, y, a, s) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(s + 4, 0); ctx.lineTo(-s - 2, -s - 3); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s - 2, s + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f6d36b"; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s + 1, -s); ctx.lineTo(-s * 0.4 + 1, 0); ctx.lineTo(-s + 1, s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ---------- dessin de la carte ---------- */
  var cam = { x: 0, y: 0 };
  function drawHouse(o) {
    var x = o.tx * TS, y = o.ty * TS, w = o.w * TS, h = o.h * TS;
    ctx.fillStyle = "rgba(20,30,15,.25)"; ctx.fillRect(x + 4, y + h - 4, w, 8);
    // murs en planches
    ctx.fillStyle = OUT; ctx.fillRect(x + 4, y + 22, w - 8, h - 22);
    ctx.fillStyle = "#d39a52"; ctx.fillRect(x + 6, y + 24, w - 12, h - 26);
    ctx.fillStyle = "#b07a4f"; for (var i = 0; i < (h - 26) / 6; i++) ctx.fillRect(x + 6, y + 28 + i * 6, w - 12, 1);
    // porte, fenêtres
    ctx.fillStyle = OUT; ctx.fillRect(x + w / 2 - 9, y + h - 26, 18, 24); ctx.fillStyle = "#8a5a3b"; ctx.fillRect(x + w / 2 - 7, y + h - 24, 14, 22); ctx.fillStyle = "#f6d36b"; ctx.fillRect(x + w / 2 + 3, y + h - 14, 2, 2);
    [x + 18, x + w - 34].forEach(function (wx) { ctx.fillStyle = OUT; ctx.fillRect(wx - 1, y + h - 40, 18, 16); ctx.fillStyle = "#f6d36b"; ctx.fillRect(wx + 1, y + h - 38, 14, 12); ctx.fillStyle = "#fdf3de"; ctx.fillRect(wx + 2, y + h - 37, 4, 4); ctx.fillStyle = OUT; ctx.fillRect(wx + 7, y + h - 38, 2, 12); });
    // toit
    var rc = o.roof, rd = shade(rc, 0.7), rl = shade(rc, 1.25);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 4, y + 30); ctx.lineTo(x + w / 2, y - 14); ctx.lineTo(x + w + 4, y + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rc; ctx.beginPath(); ctx.moveTo(x, y + 27); ctx.lineTo(x + w / 2, y - 10); ctx.lineTo(x + w, y + 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rd; for (var r = 0; r < 5; r++) { var yy = y - 4 + r * 7, half = (yy - (y - 10)) / 37 * (w / 2); ctx.fillRect(Math.round(x + w / 2 - half), yy, Math.round(half * 2), 2); }
    ctx.fillStyle = rl; ctx.fillRect(x + w / 2 - 2, y - 8, 4, 30);
  }
  function shade(hex, k) { var c = [1, 3, 5].map(function (i) { return clamp(Math.round(parseInt(hex.substr(i, 2), 16) * k), 0, 255); }); return "rgb(" + c.join(",") + ")"; }
  function drawBarn(o) {
    var x = o.tx * TS, y = o.ty * TS, w = o.w * TS, h = o.h * TS;
    ctx.fillStyle = "rgba(20,30,15,.3)"; ctx.fillRect(x + 6, y + h - 4, w, 10);
    ctx.fillStyle = OUT; ctx.fillRect(x, y + 20, w, h - 18);
    ctx.fillStyle = "#8a929a"; ctx.fillRect(x + 2, y + 22, w - 4, h - 22);
    ctx.fillStyle = "#6a7078"; for (var by = 0; by < (h - 22) / 10; by++) for (var bx = 0; bx < w / 20; bx++) ctx.fillRect(x + 2 + bx * 20 + (by % 2) * 10, y + 22 + by * 10, 1, 10), ctx.fillRect(x + 2, y + 31 + by * 10, w - 4, 1);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 8, y + 28); ctx.lineTo(x + w / 2, y - 28); ctx.lineTo(x + w + 8, y + 28); ctx.fill();
    ctx.fillStyle = "#5a5070"; ctx.beginPath(); ctx.moveTo(x - 3, y + 25); ctx.lineTo(x + w / 2, y - 23); ctx.lineTo(x + w + 3, y + 25); ctx.fill();
    ctx.fillStyle = "#3a3048"; ctx.fillRect(x + w / 2 + 20, y - 4, 26, 14); // trou dans le toit
    ctx.fillStyle = "#7a7090"; for (var r = 0; r < 6; r++) ctx.fillRect(x + w / 2 - 6 - r * 18, y - 14 + r * 7, 30, 2);
    var open = S.q >= 5;
    ctx.fillStyle = OUT; ctx.fillRect(x + w / 2 - 22, y + h - 44, 44, 44);
    ctx.fillStyle = open ? "#1a1020" : "#6b4430"; ctx.fillRect(x + w / 2 - 20, y + h - 42, 40, 42);
    if (!open) { ctx.fillStyle = "#a87ae8"; ctx.fillRect(x + w / 2 - 20, y + h - 24, 40, 4); ctx.fillStyle = "#e0c8ff"; ctx.fillRect(x + w / 2 - 4, y + h - 30, 8, 14); }
  }
  function drawObj(o, t) {
    var s;
    switch (o.type) {
      case "house": drawHouse(o); break;
      case "barn": drawBarn(o); break;
      case "npc": if (o.cond && !o.cond()) return; var f = frameOf(o.spr, t + o.tx, false); shadowAt(o.x, o.y, 12); blit(f.s, o.x, o.y + 2, 1, P.x < o.x); break;
      case "save": var b = Math.sin(t * 3) * 2; ctx.fillStyle = "rgba(106,216,255," + (0.18 + 0.1 * Math.sin(t * 3)) + ")"; ctx.beginPath(); ctx.ellipse(o.x, o.y, 14, 6, 0, 0, TAU); ctx.fill(); blit(S_("crystal")[0], o.x, o.y - 4 + b, 1.5); break;
      case "well": shadowAt(o.x, o.y, 22); blit(S_("well")[0], o.x, o.y + 2, 2); break;
      case "fence": blit(S_("fence")[0], o.x, o.y + 2, 2); break;
      case "sign": shadowAt(o.x, o.y, 10); blit(S_("sign")[0], o.x, o.y + 2, 2); break;
      case "chest": shadowAt(o.x, o.y, 18); blit(S_(S.chests[o.id] ? "chestopen" : "chest")[0], o.x, o.y + 2, 1); break;
      case "oak":
        if (S.flags.bridge) return;
        shadowAt(o.x, o.y, 26); blit(S_("bigoak")[0], o.x, o.y + 4, 2); break;
      case "gate":
        if (S.flags.gate) { blit(S_("gate")[0], o.x, o.y + 22, 1.5); return; }
        ctx.fillStyle = "rgba(168,122,232," + (0.25 + 0.15 * Math.sin(t * 4)) + ")"; ctx.fillRect(o.tx * TS + 4, o.ty * TS, TS - 8, TS * 2);
        blit(S_("gate")[0], o.x, o.y + 22, 2); break;
      case "boulder": if (S.flags.boulder) return; shadowAt(o.x, o.y + 22, 26); blit(S_("boulder")[0], o.x, o.y + 26, 1.4); break;
      case "guardian":
        ctx.fillStyle = "rgba(106,216,255," + (S.q >= 4 ? 0.3 : 0.12) + ")"; ctx.beginPath(); ctx.ellipse(o.x, o.y, 30, 12, 0, 0, TAU); ctx.fill();
        blit(S_("crystal")[0], o.x, o.y - 4 + Math.sin(t * 2) * 3, 4); break;
      case "herb": if (S.flags.herb) return; ctx.fillStyle = "rgba(232,251,255," + (0.2 + 0.12 * Math.sin(t * 3)) + ")"; ctx.beginPath(); ctx.arc(o.x, o.y - 8, 16, 0, TAU); ctx.fill(); blit(S_("herb")[0], o.x, o.y, 2); break;
      case "bosspot":
        if (S.flags[o.id]) return; var E = ENEMIES[o.boss], fb = S_(E.spr); shadowAt(o.x, o.y, 30);
        blit(fb[Math.floor(t * 3) % fb.length], o.x, o.y + 2, o.boss === "grand_belier" ? 1 : 1.5, true); break;
      case "updoor": if (!S.flags[o.need]) { ctx.fillStyle = OUT; ctx.fillRect(o.tx * TS - 32, 0, TS * 3, TS); ctx.fillStyle = "#6b4430"; ctx.fillRect(o.tx * TS - 30, 2, TS * 3 - 4, TS - 4); ctx.fillStyle = "#a87ae8"; ctx.fillRect(o.tx * TS - 30, 14, TS * 3 - 4, 3); } break;
    }
  }
  function shadowAt(x, y, w) { ctx.fillStyle = "rgba(20,30,15,.25)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w / 2, w / 5, 0, 0, TAU); ctx.fill(); }
  function drawHeroW(id, x, y, face, moving, t, act) {
    var f = frameOf(HEROES[id].spr, t, moving);
    shadowAt(x, y, 14);
    blit(f.s, x, y + 2 - f.dy, 1, face < 0);
    if (act > 0) {   // geste de terrain : hache, orbe ou massue
      var p = 1 - act / 0.32, w = S_(HEROES[id].weapon)[0], ox = P.fx * (6 + p * 14), oy = P.fy * (4 + p * 10) - 10;
      ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(p * TAU * (id === "augh" ? 1.5 : 0.4) * (face < 0 ? -1 : 1)); ctx.drawImage(w.c, -w.w / 2, -w.h / 2); ctx.restore();
    }
  }
  function drawWorld(t) {
    var tx0, ty0, tx1, ty1, x, y;
    cam.x = clamp(P.x - W / 2, 0, M.w * TS - W); cam.y = clamp(P.y - H / 2 - 10, 0, M.h * TS - H);
    if (M.w * TS < W) cam.x = (M.w * TS - W) / 2; if (M.h * TS < H) cam.y = (M.h * TS - H) / 2;
    var sx = shakeW > 0 ? rnd(-shakeW, shakeW) : 0; shakeW = Math.max(0, shakeW - 0.6);
    ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-Math.round(cam.x) + Math.round(sx), -Math.round(cam.y));
    ctx.drawImage(M.ground, 0, 0);
    // eau animée
    tx0 = Math.floor(cam.x / TS); ty0 = Math.floor(cam.y / TS); tx1 = tx0 + Math.ceil(W / TS) + 1; ty1 = ty0 + Math.ceil(H / TS) + 2;
    for (y = ty0; y <= ty1; y++) for (x = tx0; x <= tx1; x++) {
      var tt = tileAt(M, x, y);
      if (FLOOR[tt] === "w") { var ph = (t * 1.5 + x * 0.7 + y * 1.3) % 3; if (ph < 0.5) { ctx.fillStyle = "rgba(232,251,255,.55)"; ctx.fillRect(x * TS + 6 + ((x * 13) % 16), y * TS + 12 + ((y * 7) % 10), 6, 2); } }
      if ((tt === "b" || tt === "B") && S.flags.bridge) {  // pont en tronc
        ctx.fillStyle = OUT; ctx.fillRect(x * TS - 1, y * TS, TS + 2, TS); ctx.fillStyle = "#8a5a3b"; ctx.fillRect(x * TS, y * TS, TS, TS); ctx.fillStyle = "#a06a3e"; ctx.fillRect(x * TS + 4, y * TS, 6, TS); ctx.fillRect(x * TS + 18, y * TS, 4, TS); ctx.fillStyle = "#6b4430"; ctx.fillRect(x * TS + 12, y * TS, 2, TS);
      } else if (tt === "b") { if (y === 33) { ctx.fillStyle = "#8a5a3b"; ctx.fillRect(x * TS + 2, y * TS - 4, 6, 10); ctx.fillRect(x * TS + 22, y * TS - 2, 6, 8); } }
    }
    // tout ce qui a une profondeur, trié par y
    var dr = [];
    for (y = ty0 - 1; y <= ty1; y++) for (x = tx0 - 1; x <= tx1; x++) {
      var tl = tileAt(M, x, y);
      if (tl === "t" || tl === "T") dr.push({ y: (y + 1) * TS - 2, f: (function (x2, y2, tl2) { return function () { var hx = ((x2 * 73856093) ^ (y2 * 19349663)) >>> 0, ox = (hx % 9) - 4; shadowAt(x2 * TS + 16 + ox, (y2 + 1) * TS - 4, 26); blit(S_(tl2 === "T" ? "pine" : "tree")[0], x2 * TS + 16 + ox, (y2 + 1) * TS + 2, 2); }; })(x, y, tl) });
      else if (tl === "S") dr.push({ y: (y + 1) * TS - 2, f: (function (x2, y2) { return function () { shadowAt(x2 * TS + 16, (y2 + 1) * TS - 4, 22); blit(S_("pillar")[0], x2 * TS + 16, (y2 + 1) * TS, 2.4); }; })(x, y) });
    }
    M.objs.forEach(function (o) {
      var bx = o.type === "house" || o.type === "barn" ? (o.ty + o.h) * TS : o.y;
      if (o.x < cam.x - 200 || o.x > cam.x + W + 200 || o.y < cam.y - 200 || o.y > cam.y + H + 200) return;
      dr.push({ y: bx, f: function () { drawObj(o, t); } });
    });
    WE.forEach(function (e) {
      dr.push({ y: e.y, f: function () {
        var a = S_(e.spr), fr = a[Math.floor(e.t * (e.st === "chase" ? 8 : 4)) % a.length], lift = e.fly ? 10 + Math.sin(e.t * 4) * 3 : 0;
        shadowAt(e.x, e.y, 16);
        if (e.stun > 0 && Math.floor(e.stun * 10) % 2) return;
        blit(fr, e.x, e.y + 2 - lift, e.sc, natLeft(e.spr) ? e.face > 0 : e.face < 0);
        if (e.seen > 0) ptext("!", e.x, e.y - fr.h * e.sc - lift - 10, "#f6d36b", 2, "c");
      } });
    });
    // héros : meneur + compagnons sur sa trace
    var order = [leadHero()].concat(S.party.filter(function (h) { return h !== leadHero(); }));
    order.forEach(function (id, i) {
      if (i === 0) dr.push({ y: P.y, f: function () { if (P.inv > 0 && Math.floor(P.inv * 12) % 2) return; drawHeroW(id, P.x, P.y, P.face, P.moving, P.t, P.act); } });
      else { var tp = P.trail[Math.min(P.trail.length - 1, i * 9)] || P; dr.push({ y: tp.y - 0.1, f: function () { drawHeroW(id, tp.x, tp.y, tp.f || P.face, P.moving, P.t + i * 0.3, 0); } }); }
    });
    dr.sort(function (a, b) { return a.y - b.y; }).forEach(function (d) { d.f(); });
    ctx.restore();
    if (flashW > 0) { ctx.fillStyle = "rgba(232,251,255," + flashW + ")"; ctx.fillRect(0, 0, W, H); flashW = Math.max(0, flashW - 0.03); }
    // léger vignettage et lumière de forêt
    var reg = regionAt(P.x, P.y);
    if (reg.bg === "foret") { ctx.fillStyle = "rgba(20,30,60,.22)"; ctx.fillRect(0, 0, W, H); }
    if (M.room) { var gr = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 280); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,10,30,.55)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    if (mode === "world") drawObjective(t);
  }

  /* =====================================================================
     Combat au tour par tour sur la scène de la forêt
     ===================================================================== */
  var BSC = 2, STAGE_Y = 196;
  var HERO_X = [150, 104, 58], EN_X = [292, 354, 416, 458];
  var RATE = ["Bien !", "Joli !", "Superbe !", "Fabuleux !", "Ébouriffant !"];
  var backCache = {};
  function backdrop(bg) {
    if (backCache[bg]) return backCache[bg];
    var c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    var P2 = {
      prairie: { sky: ["#9fd8e8", "#d8f0d0"], hill: "#7fa95a", hill2: "#5b8a4a", tree: "tree" },
      foret: { sky: ["#2a3a5a", "#4a6a6a"], hill: "#2f5a3a", hill2: "#1f3a2b", tree: "pine" },
      ruines: { sky: ["#d8c8a8", "#f0e0c0"], hill: "#a8a090", hill2: "#8a8274", tree: "pillar" },
      sanctuaire: { sky: ["#7fb0d8", "#c8e8f0"], hill: "#8fb0a0", hill2: "#6a9080", tree: "tree" },
      bergerie: { sky: ["#3a2a28", "#5a4030"], hill: "#6b4430", hill2: "#5a3820", tree: null }
    }[bg] || {};
    var gr = g.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, P2.sky[0]); gr.addColorStop(1, P2.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, 170);
    var ctx0 = ctx; ctx = g;
    if (bg === "bergerie") {
      g.fillStyle = "#4a3020"; for (var i = 0; i < 12; i++) g.fillRect(i * 44, 0, 6, 170);
      g.fillStyle = "#6b4430"; g.fillRect(0, 40, W, 8); g.fillRect(0, 100, W, 8);
      g.fillStyle = "#d8b860"; for (i = 0; i < 9; i++) { g.beginPath(); g.ellipse(30 + i * 56, 160, 34, 18, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = "rgba(246,211,107,.15)"; g.beginPath(); g.moveTo(300, 0); g.lineTo(340, 0); g.lineTo(420, 170); g.lineTo(260, 170); g.fill();
    } else {
      g.fillStyle = P2.hill2; g.beginPath(); g.moveTo(0, 130); for (var x = 0; x <= W; x += 20) g.lineTo(x, 112 + Math.sin(x * 0.02) * 10 + Math.sin(x * 0.07) * 4); g.lineTo(W, 170); g.lineTo(0, 170); g.fill();
      for (x = -10; x < W + 20; x += 34) blit(S_(P2.tree)[0], x + ((x * 7) % 13), 150 + ((x * 3) % 9), P2.tree === "pillar" ? 2.6 : 2.2);
      g.fillStyle = P2.hill; g.fillRect(0, 150, W, 20);
      if (bg === "foret") { g.fillStyle = "rgba(200,220,255,.18)"; g.fillRect(0, 120, W, 30); }
    }
    // scène en rondins
    g.fillStyle = OUT; g.fillRect(0, 164, W, 52);
    for (var r = 0; r < 4; r++) { g.fillStyle = r % 2 ? "#a06a3e" : "#8a5a3b"; g.fillRect(0, 166 + r * 11, W, 10); g.fillStyle = "#6b4430"; for (x = (r * 37) % 60; x < W; x += 60) g.fillRect(x, 166 + r * 11, 2, 10); }
    g.fillStyle = "#c9a070"; g.fillRect(0, 166, W, 2);
    g.fillStyle = "#5a3820"; g.fillRect(0, 210, W, 6);
    // rideaux de feuillage
    function curtain(x0, dir) {
      for (var k = 0; k < 7; k++) { var cx = x0 + dir * k * 9; g.fillStyle = OUT; g.fillRect(cx - 1, 0, 11, 150 - k * 14); g.fillStyle = k % 2 ? "#3f6b3a" : "#5b8a4a"; g.fillRect(cx, 0, 9, 148 - k * 14); g.fillStyle = "#9cc56b"; for (var j = 8; j < 140 - k * 14; j += 16) g.fillRect(cx + 2 + (j % 3), j, 4, 3); }
    }
    curtain(0, 1); curtain(W - 10, -1);
    g.fillStyle = OUT; g.fillRect(0, 0, W, 12); g.fillStyle = "#3f6b3a"; g.fillRect(0, 0, W, 10);
    for (x = 0; x < W; x += 16) { g.fillStyle = OUT; g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 16, 10); g.lineTo(x + 8, 20); g.fill(); g.fillStyle = x % 32 ? "#5b8a4a" : "#9cc56b"; g.beginPath(); g.moveTo(x + 2, 10); g.lineTo(x + 14, 10); g.lineTo(x + 8, 17); g.fill(); }
    ctx = ctx0;
    backCache[bg] = c; return c;
  }
  var AUD_SPR = ["sq_noisette", "bunny", "hedgehog", "sq_cendrine", "sq_flocon", "sq_pip", "sq_pop", "shrew", "sq_charbon", "frog", "sq_trefle", "mole"];
  function audienceSize() { return clamp(6 + S.lv * 4, 6, 40); }

  function heroAtk(h) { var a = 1 + (has("tranchant") ? 1 : 0) + (h.atkUp > 0 ? h.atkUpV : 0) + (B.eveil > 0 ? 2 : 0) + (has("souffle") && S.hp[h.id] <= 3 ? 2 : 0); return a; }
  function heroDef(h) { return (h.guard ? 1 : 0) + (h.defUp > 0 ? h.defUpV : 0) + (has("ecorce") ? 1 : 0) + (B.eveil > 0 ? 1 : 0); }
  function enDef(e) { return e.flip > 0 ? 0 : e.def; }
  function aliveE() { return B.enemies.filter(function (e) { return e.hp > 0; }); }
  function aliveH() { return B.heroes.filter(function (h) { return S.hp[h.id] > 0; }); }
  function addEcho(v) {
    if (v <= 0) return;
    v *= (has("panache") ? 1.5 : 1) * (easy() ? 0.6 : 1) * (0.7 + B.aud / 40);
    var before = Math.floor(S.echo); S.echo = Math.min(S.echoMax, S.echo + v); B.cheer = 1; hud();
    if (Math.floor(S.echo) > before) SFX.cheer();
  }
  function num(x, y, n, col, big) { B.nums.push({ x: x, y: y, n: n, col: col || "#fdf3de", t: 0, big: big }); }
  function word(x, y, txt, col) { B.words.push({ x: x, y: y, txt: txt, col: col || "#f6d36b", t: 0 }); }
  function burst(x, y, col, n) { for (var i = 0; i < (n || 10); i++) { var a = Math.random() * TAU, s = rnd(40, 140); B.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: rnd(0.3, 0.7), col: col || "#f6d36b" }); } }

  async function startBattle(group, o) {
    o = o || {};
    mode = "trans"; hint(""); uiBusy++;
    var F = window.__fade = window.__fade || { a: 0 };
    SFX.hit(); await tween(F, { a: 1 }, 320, "in");
    B = { bg: o.bg || "prairie", heroes: [], enemies: [], nums: [], words: [], parts: [], fx: [], cursor: null, prompt: null, aud: audienceSize(), cheer: 0, shake: 0, turn: 0, eveil: 0, boss: !!o.boss, done: null, t: 0, spark: null };
    S.party.forEach(function (id, i) { B.heroes.push({ kind: "h", id: id, name: HEROES[id].name, spr: HEROES[id].spr, x: HERO_X[i], y: STAGE_Y, hx: HERO_X[i], hy: STAGE_Y, lift: 0, flash: 0, sc: BSC, atkUp: 0, defUp: 0, stun: 0, guard: false, poison: 0, rot: 0 }); });
    group.forEach(function (id) { addEnemy(id); });
    mode = "battle"; hud(true); $("#btn-pause").hidden = true;
    await tween(F, { a: 0 }, 300, "out");
    uiBusy--;
    var res = await battleLoop(o);
    return res;
  }
  function addEnemy(id, x) {
    var d = ENEMIES[id], i = B.enemies.filter(function (e) { return e.hp > 0; }).length;
    if (i >= 4) return null;
    var slot = 0; while (B.enemies.some(function (e) { return e.hp > 0 && e.slot === slot; })) slot++;
    var e = { kind: "e", id: id, d: d, name: d.name, spr: d.spr, hp: d.hp, max: d.hp, atk: d.atk, def: d.def, fly: !!d.fly, spiky: !!d.spiky, boss: !!d.boss, slot: slot,
      x: x || EN_X[slot], y: STAGE_Y, hx: EN_X[slot], hy: STAGE_Y, lift: 0, flash: 0, sc: d.sc === 3 ? 3 : d.sc === 2 ? 2 : BSC, burn: 0, freeze: 0, sleep: 0, flip: 0, weak: 0, rage: 0, alpha: 1, t: Math.random() * 3, rot: 0 };
    if (e.id === "grand_belier") e.sc = 2.2;
    if (e.fly) e.hy = e.y = STAGE_Y - 46;
    B.enemies.push(e);
    return e;
  }
  function enTop(e) { var s = S_(e.spr)[0]; return e.y - e.lift - s.h * e.sc; }
  function heroTop(h) { return h.y - h.lift - 19 * h.sc; }

  async function battleLoop(o) {
    if (o.first === "hero") {
      var t0 = aliveE()[0], L = B.heroes.find(function (h) { return h.id === leadHero(); }) || B.heroes[0];
      word(W / 2, 70, "Premier coup !", "#f6d36b"); SFX.ok(); await wait(500);
      await tween(L, { x: t0.x - 40 }, 260, "in", 20); hurtE(t0, 1 + (has("premier") ? 2 : 0), { pierce: true }); SFX.hit(); await tween(L, { x: L.hx }, 260, "out", 10);
      if (await checkEnd()) return finish(o);
    }
    if (o.first === "enemy") { word(W / 2, 70, "Embuscade !", "#e0283a"); SFX.hurt(); await wait(600); await enemyPhase(); if (await checkEnd()) return finish(o); }
    if (o.boss && B.turn === 0) await bossIntro(o);
    if (!S.flags.tuto) {
      S.flags.tuto = 1;
      await say(["Premier combat ! Tes héros sont à gauche, les monstres à droite, et le public de la forêt regarde.",
        "À ton tour, choisis une action dans le menu (" + (isTouch ? "joystick haut / bas, puis A" : "flèches haut / bas, puis Espace") + "). « Hache rapide » est un bon début.",
        "Pendant ton attaque, une consigne s'affiche en haut de l'écran : suis-la au bon moment pour frapper plus fort.",
        "Quand un monstre t'attaque, appuie sur " + (isTouch ? "A" : "Espace") + " juste avant qu'il te touche : tu prends moins de dégâts."]);
    }
    while (true) {
      B.turn++;
      if (has("regain")) S.pe = Math.min(maxPe(), S.pe + 1);
      for (var i = 0; i < B.heroes.length; i++) {
        var h = B.heroes[i];
        if (S.hp[h.id] <= 0) continue;
        h.guard = false;
        if (h.stun > 0) { h.stun--; word(h.x, heroTop(h) - 10, "Empêtré…", "#c9b3ff"); await wait(600); continue; }
        var r = await heroTurn(h);
        if (r === "flee") { B.done = "flee"; return finish(o); }
        if (await checkEnd()) return finish(o);
      }
      await enemyPhase();
      if (await checkEnd()) return finish(o);
      await endOfTurn();
      if (await checkEnd()) return finish(o);
    }
  }
  async function bossIntro(o) {
    var b = B.enemies[0];
    word(b.x, enTop(b) - 16, b.name, "#f2b05e"); SFX.hurt(); B.shake = 6; await wait(900);
  }
  async function checkEnd() {
    if (!aliveE().length) { B.done = "win"; return true; }
    if (!aliveH().length) { B.done = "lose"; return true; }
    return false;
  }
  async function endOfTurn() {
    var i;
    for (i = 0; i < B.enemies.length; i++) {
      var e = B.enemies[i]; if (e.hp <= 0) continue;
      if (e.burn > 0) { e.burn--; hurtE(e, 1, { pierce: true, col: "#ff8a2a" }); burst(e.x, enTop(e) + 10, "#ff8a2a", 6); await wait(350); }
      if (e.flip > 0) e.flip--; if (e.weak > 0) e.weak--;
    }
    B.heroes.forEach(function (h) {
      if (h.atkUp > 0) h.atkUp--; if (h.defUp > 0) h.defUp--;
      if (h.poison > 0 && S.hp[h.id] > 0) { h.poison--; S.hp[h.id] = Math.max(1, S.hp[h.id] - 1); num(h.x, heroTop(h), 1, "#9cc56b"); }
    });
    if (B.eveil > 0) B.eveil--;
    // le public réagit
    if (Math.random() < 0.18) {
      var hs = aliveH(); if (hs.length) {
        var tg = pick(hs);
        if (Math.random() < 0.7) { word(W / 2, 228, "Un spectateur lance une baie !", "#fdf3de"); await projectile({ x: rnd(80, 400), y: 250 }, { x: tg.x, y: heroTop(tg) + 10 }, "berry", 500); S.hp[tg.id] = Math.min(maxHp(tg.id), S.hp[tg.id] + 2); num(tg.x, heroTop(tg), "+2", "#9cc56b"); SFX.coin(); }
        else { word(W / 2, 228, "Un spectateur lance un caillou !", "#fdf3de"); await projectile({ x: rnd(80, 400), y: 250 }, { x: tg.x, y: heroTop(tg) + 10 }, "pebble", 500); S.hp[tg.id] = Math.max(1, S.hp[tg.id] - 1); num(tg.x, heroTop(tg), 1); SFX.hurt(); }
        hud();
      }
    }
    if (B.aud < 40 && Math.random() < 0.3) B.aud++;
    await wait(200);
  }
  async function finish(o) {
    cmdHint(""); B.cursor = null;
    var res = B.done;
    if (res === "win") {
      var xp = 0, gold = 0;
      B.enemies.forEach(function (e) { if (e.summoned && !e.d.boss) { xp += 1; return; } var k = clamp(1 + (e.d.lv - S.lv) * 0.25, 0.25, 2); xp += Math.max(1, Math.round(e.d.xp * k)); gold += ri(e.d.gold[0], e.d.gold[1]); });
      if (has("fortune")) gold = Math.round(gold * 1.5);
      B.enemies.forEach(function (e) { if (e.id === "mouton" && S.q === 1 && !e.summoned) S.kills++; });
      if (o.flag) S.flags[o.flag] = 1;
      SFX.win(); word(W / 2, 80, "Victoire !", "#f6d36b"); B.cheer = 2; B.heroes.forEach(function (h) { if (S.hp[h.id] > 0) tween(h, { lift: 0 }, 400, "out", 18); });
      await wait(1100);
      S.xp += xp; S.gold += gold;
      await panel('<span class="kick">Victoire</span><h2>Bravo !</h2><p>+ ' + xp + " points d'écho · + " + gold + " glands d'or</p>" + xpBar() + '<div class="row" style="margin-top:12px"><button class="btn" data-act="ok">Continuer</button></div>', null, { back: "ok" });
      while (S.xp >= 100) { S.xp -= 100; S.lv++; await levelUp(); }
      B.heroes.forEach(function (h) { if (S.hp[h.id] <= 0) S.hp[h.id] = 1; });
      if (o.flag === "boss") { await endingScene(); }
      else if (o.flag === "tisseuse") { await say(["La Tisseuse se dissout dans la brume. L'herbe de lune est à toi !"]); S.flags.herb = 1; SFX.coin(); }
      else if (o.flag === "belier") { await say(["Le Bélier furieux s'effondre, vaincu… puis s'enfuit en bêlant. Retourne voir Aelor."]); }
      if (S.q === 1 && S.kills === 3) toast("3 Bouftons calmés : retourne voir Aelor !", 2200);
    } else if (res === "flee") {
      await wait(300);
    } else if (res === "lose") {
      SFX.hurt(); word(W / 2, 90, "Les échos s'éteignent…", "#e0283a"); await wait(1400);
      await panel('<span class="kick">Défaite</span><h2>Les échos s\'éteignent…</h2><p>Tu reprends à ta dernière sauvegarde (au cristal d\'écho).</p><div class="row"><button class="btn" data-act="ok">Réessayer</button></div>', null);
      var keep = S.sound; S = load() || fresh(); S.sound = keep;
      S.party.forEach(function (h) { S.hp[h] = Math.max(S.hp[h], Math.ceil(maxHp(h) / 2)); });
      B = null; mode = "world"; enterMap(S.map, S.x, S.y); hud(true); $("#btn-pause").hidden = false; return "lose";
    }
    var F = window.__fade; uiBusy++; await tween(F, { a: 1 }, 250, "in");
    B = null; mode = "world"; hud(true); $("#btn-pause").hidden = false;
    await tween(F, { a: 0 }, 300, "out"); uiBusy--;
    S.x = P.x; S.y = P.y; save();
    return res;
  }
  function xpBar() { return '<div style="height:12px;border:3px solid var(--line);border-radius:999px;background:var(--panel-2);overflow:hidden"><div style="height:100%;width:' + clamp(S.xp, 0, 100) + '%;background:linear-gradient(90deg,#9cc56b,#f6d36b)"></div></div><p class="keys">Niveau ' + S.lv + " · " + S.xp + "/100 avant le prochain niveau</p>"; }
  async function levelUp() {
    SFX.lvl();
    var r = await panel('<span class="kick">Niveau ' + S.lv + ' !</span><h2>Choisis ton bonus</h2><p>Comme toujours, une seule récompense par niveau.</p><div class="list">' +
      '<button class="li" data-act="hp">' + iconImg("berry") + '<span class="grow">+4 PV<small>Pour chaque héros (' + S.party.map(function (h) { return HEROES[h].name; }).join(", ") + ")</small></span></button>" +
      '<button class="li" data-act="pe">' + iconImg("drop") + '<span class="grow">+5 PE<small>Plus de sorts par combat</small></span></button>' +
      '<button class="li" data-act="pi">' + iconImg("bell") + '<span class="grow">+3 PI<small>Plus d\'insignes équipés en même temps</small></span></button></div>', null);
    if (r === "hp") { S.hpBonus += 4; S.party.forEach(function (h) { S.hp[h] = maxHp(h); }); }
    if (r === "pe") { S.peMax += 5; }
    if (r === "pi") { S.pi += 3; }
    S.pe = maxPe(); S.party.forEach(function (h) { S.hp[h] = maxHp(h); }); S.echo = S.echoMax; hud(true); save();
    var unl = []; Object.keys(MOVES).forEach(function (h) { if (S.party.indexOf(h) < 0) return; MOVES[h].forEach(function (m) { if (m.lv === S.lv) unl.push(HEROES[h].name + " : " + m.name); }); });
    if (unl.length) await say(["Nouvelle technique ! " + unl.join(" · ")]);
  }
  async function endingScene() {
    await say(["Le Grand Bélier pousse un dernier bêlement… et redevient un simple vieux bélier, tout penaud.", "La brume de la Bergerie se dissipe. Les échos de l'Aether chantent sur les prairies.", "Bergerie purifiée !"]);
    S.q = 6; S.flags.end = 1; save();
    await panel('<span class="kick">Fin</span><h1>Aelor est sauvé !</h1><p>Augh, Aka et Gorak rentrent au village sous les applaudissements du public de la forêt.</p><p>Merci d\'avoir joué à <b>Echoes of Aether : Contes d\'Aelor</b>. Les prairies restent ouvertes : finis les coffres, monte de niveau, essaie tous les insignes.</p><div class="row"><button class="btn" data-act="ok">Continuer l\'aventure</button></div>', null);
    await fadeTo(function () { enterMap("world", 31.5 * TS, 39.6 * TS); });
  }

  /* ---------- dégâts ---------- */
  function hurtE(e, dmg, o) {
    o = o || {};
    var d = o.pierce || o.magic ? dmg : Math.max(0, dmg - enDef(e));
    if (e.sleep > 0 && d > 0) e.sleep = 0;
    e.hp = Math.max(0, e.hp - d); e.flash = 0.2; B.shake = Math.min(8, 2 + d);
    num(e.x + rnd(-6, 6), enTop(e) - 4, d, o.col || (d === 0 ? "#8a929a" : "#fdf3de"), d >= 4);
    burst(e.x, enTop(e) + 14, o.col || "#fdf3de", 6 + d * 2);
    if (d > 0) SFX.hit(); else tone(200, 0.08, "square", 0.04);
    if (e.hp <= 0) dieE(e);
    return d;
  }
  function dieE(e) {
    tween(e, { alpha: 0, rot: 1 }, 520, "in"); burst(e.x, enTop(e) + 20, "#fdf3de", 18);
    B.parts.push({ x: e.x, y: enTop(e), vx: 0, vy: -30, t: 0, life: 0.8, col: "#f6d36b", star: true });
  }
  // un coup ennemi sur un héros, après lecture de la garde
  function hurtH(h, dmg, res, e) {
    var d = Math.max(0, dmg - heroDef(h) - (res === "garde" ? 1 : 0));
    if (res === "contre") {
      d = 0; SFX.contre(); word(h.x, heroTop(h) - 14, "Contre !", "#7fd1c7"); burst(h.x + 18, heroTop(h) + 20, "#7fd1c7", 14); addEcho(0.35);
      if (e && e.hp > 0) { var dd = 1 + (has("epines") ? 1 : 0); if (e.spiky) dd += 0; hurtE(e, dd, { pierce: true, col: "#7fd1c7" }); }
    } else if (res === "garde") { SFX.guard(); word(h.x, heroTop(h) - 14, "Garde !", "#f6d36b"); addEcho(0.12); }
    if (res !== "contre") {
      if (d > 0) SFX.hurt();
      S.hp[h.id] = Math.max(0, S.hp[h.id] - d); h.flash = 0.25; B.shake = 3 + d;
      num(h.x, heroTop(h) - 4, d, d === 0 ? "#8a929a" : "#ff8a80", d >= 4);
      if (S.hp[h.id] <= 0) { word(h.x, heroTop(h) - 22, "K.-O.", "#e0283a"); h.lift = 0; }
    }
    hud();
    return { d: d, res: res };
  }

  /* ---------- lecture de la garde (A) et du contre (B) au moment de l'impact ---------- */
  var DEFW = null;
  onKey(function (k, t) {
    if (!DEFW) return false;
    if (k === "a" && DEFW.a === null && DEFW.b === null) DEFW.a = t;
    if (k === "b" && DEFW.a === null && DEFW.b === null) DEFW.b = t;
    return k === "a" || k === "b";
  });
  function openDef(tImpact, h) {
    DEFW = { t: tImpact, a: null, b: null, h: h }; if (has("ecoute")) B.alert = { h: h, t: tImpact };
    if ((S.defTips || 0) < 6) cmdHint("Attaque ennemie : " + KA + " juste avant le choc pour te protéger !");
  }
  async function closeDef() {
    await wait(45);
    var w = DEFW; DEFW = null; B.alert = null; if (!w) return "";
    if ((S.defTips || 0) < 6) { S.defTips = (S.defTips || 0) + 1; cmdHint(""); }
    var gw = (easy() ? 260 : 150) + (has("ecoute") ? 70 : 0), cw = easy() ? 140 : 85;
    if (w.b !== null && w.b >= w.t - cw && w.b <= w.t + 45) return "contre";
    if (w.a !== null && w.a >= w.t - gw && w.a <= w.t + 45) return "garde";
    return "";
  }

  /* ---------- commandes d'action ---------- */
  // appuyer au bon moment : un anneau se resserre sur le point d'impact
  function cmdTimed(dur, pos, label) {
    var t0 = now(), tEnd = t0 + dur, win = easy() ? 210 : 120, res = null;
    B.prompt = { kind: "timed", t0: t0, tEnd: tEnd, pos: pos };
    cmdHint(label || ("Appuie sur " + KA + " au moment de l'impact !"));
    return new Promise(function (done) {
      var off = onKey(function (k, t) {
        if (k !== "a" || res !== null) return k === "a";
        res = t >= tEnd - win && t <= tEnd + 90;
        if (res) { B.prompt.hit = true; } else B.prompt.fail = true;
        return true;
      });
      (async function () {
        await wait(dur + 95);
        off(); B.prompt = null; cmdHint("");
        done(!!res);
      })();
    });
  }
  // maintenir A, relâcher quand la jauge est pleine (pas trop tard)
  function cmdHold(pos, label) {
    var fill = easy() ? 1250 : 950, tol = easy() ? 520 : 300;
    cmdHint(label || ("Maintiens " + KA + ", relâche quand la jauge est pleine !"));
    B.prompt = { kind: "hold", pos: pos, p: 0, start: 0 };
    return new Promise(function (done) {
      var started = 0, finished = false, startT = now();
      function end(ok) { if (finished) return; finished = true; off(); rel(); B.prompt = null; cmdHint(""); done(ok); }
      var off = onKey(function (k, t) { if (k === "a" && !started) { started = t; B.prompt.start = t; } return k === "a"; });
      var rel = (function () { var f = function (k, t) { if (k === "a" && started) { var p = (t - started) / fill; B.prompt.p = p; end(p >= 0.92 && (t - started) <= fill + tol); } }; relListeners.push(f); return function () { var i = relListeners.indexOf(f); if (i >= 0) relListeners.splice(i, 1); }; })();
      (function tick() {
        if (finished) return;
        if (!started && held.a) { started = now(); B.prompt.start = started; }
        if (started) { var p = (now() - started) / fill; B.prompt.p = p; if (p < 1 && Math.random() < 0.3) SFX.charge(p); if (now() - started > fill + tol) { B.prompt.over = true; end(false); return; } }
        else if (now() - startT > 3500) { end(false); return; }
        requestAnimationFrame(tick);
      })();
    });
  }
  // marteler A
  function cmdMash(dur, pos, label) {
    var g = 0, inc = easy() ? 0.12 : 0.085, t0 = now(), last = t0;
    cmdHint(label || ("Martèle " + KA + " !"));
    B.prompt = { kind: "mash", pos: pos, g: 0, t0: t0, dur: dur };
    return new Promise(function (done) {
      var off = onKey(function (k) { if (k === "a") { g = Math.min(1, g + inc); tone(400 + g * 700, 0.03, "square", 0.025); return true; } return false; });
      (function tick() {
        var t = now(), dt = (t - last) / 1000; last = t; g = Math.max(0, g - dt * 0.28); if (B.prompt) B.prompt.g = g;
        if (t - t0 >= dur) { off(); B.prompt = null; cmdHint(""); done(g); return; }
        requestAnimationFrame(tick);
      })();
    });
  }
  // recopier une suite de flèches
  var ARR = ["up", "right", "down", "left"], ARR_CH = { up: "▲", right: "▶", down: "▼", left: "◀" };
  function cmdSeq(n, limit, pos, label) {
    var seq = []; for (var i = 0; i < n; i++) seq.push(pick(ARR));
    limit = limit * (easy() ? 1.6 : 1);
    cmdHint(label || "Recopie les flèches !");
    B.prompt = { kind: "seq", pos: pos, seq: seq, i: 0, t0: now(), lim: limit, bad: false };
    return new Promise(function (done) {
      var fin = false;
      function end() { if (fin) return; fin = true; off(); var c = B.prompt.i; var p = B.prompt; setTimeout(function () { if (B && B.prompt === p) B.prompt = null; }, 250); cmdHint(""); done(c); }
      var off = onKey(function (k) {
        if (ARR.indexOf(k) < 0) return k === "a" || k === "b";
        var p = B.prompt; if (k === p.seq[p.i]) { p.i++; SFX.move(); if (p.i >= n) end(); } else { p.bad = true; SFX.miss(); end(); }
        return true;
      });
      (function tick() { if (fin) return; if (now() - B.prompt.t0 > limit) { end(); return; } requestAnimationFrame(tick); })();
    });
  }
  // Panache : une étincelle ✦ apparaît après un beau coup ; B au bon moment = le public adore
  async function stylish(pos) {
    if (Math.random() < 0.35) return false;
    await wait(ri(80, 220));
    var ok = null, t0 = now(), win = easy() ? 420 : 300;
    B.spark = { x: pos.x, y: pos.y, t0: t0, win: win };
    var off = onKey(function (k, t) { if (k === "b" && ok === null) { ok = t - t0 <= win; return true; } return false; });
    await wait(win + 30); off(); B.spark = null;
    if (ok) { word(pos.x, pos.y - 12, "Panache !", "#f29ad8"); SFX.cheer(); addEcho(0.3); burst(pos.x, pos.y, "#f29ad8", 12); B.cheer = 2; }
    return !!ok;
  }
  function rateWord(i, x, y) { word(x, y, RATE[Math.min(i, RATE.length - 1)], "#f6d36b"); SFX.nice(); }
  async function projectile(a, b, spr, ms, arc) {
    var p = { x: a.x, y: a.y, lift: 0, spr: spr, rot: 0, spin: spr === "axe" || spr === "hammer" };
    B.fx.push(p); await tween(p, { x: b.x, y: b.y }, ms, "lin", arc || 0);
    B.fx.splice(B.fx.indexOf(p), 1);
  }

  /* ---------- tour d'un héros ---------- */
  function pickTarget(list, label) {
    if (!list.length) return Promise.resolve(null);
    uiBusy++;
    var i = 0;
    B.cursor = { list: list, i: 0, all: label === "all" };
    function lab() { cmdHint(B.cursor.all ? "Tous les ennemis · " + KA + " pour valider" : "Cible : <b>" + esc(list[i].name) + "</b> · " + list[i].hp + "/" + list[i].max + " PV"); }
    lab();
    return new Promise(function (res) {
      function done(v) { off(); offTap(); B.cursor = null; cmdHint(""); uiBusy--; res(v); }
      var off = onKey(function (k) {
        if (!B.cursor.all && (k === "left" || k === "up")) { i = (i - 1 + list.length) % list.length; B.cursor.i = i; SFX.move(); lab(); }
        else if (!B.cursor.all && (k === "right" || k === "down")) { i = (i + 1) % list.length; B.cursor.i = i; SFX.move(); lab(); }
        else if (k === "a") { SFX.ok(); done(B.cursor.all ? list : list[i]); }
        else if (k === "b" || k === "menu") { SFX.back(); done(null); }
        return true;
      });
      var tapF = function (p) {
        var best = -1, bd = 60; list.forEach(function (e, j) { var d = Math.hypot(e.x - p.x, (enTop(e) + e.y) / 2 - p.y); if (d < bd) { bd = d; best = j; } });
        if (best < 0) return; if (B.cursor.all || best === i) { SFX.ok(); done(B.cursor.all ? list : list[i]); } else { i = best; B.cursor.i = i; SFX.move(); lab(); }
      };
      tapListeners.push(tapF);
      function offTap() { var j = tapListeners.indexOf(tapF); if (j >= 0) tapListeners.splice(j, 1); }
    });
  }
  function targetsFor(m) {
    var al = aliveE();
    if (m.tgt === "front") { var g = al.filter(function (e) { return !e.fly; }).sort(function (a, b) { return a.slot - b.slot; }); return g.length ? [g[0]] : []; }
    if (m.tgt === "ground") return al.filter(function (e) { return !e.fly; });
    if (!m.air) return al.filter(function (e) { return !e.fly; });
    return al;
  }
  function movesOf(id) { return MOVES[id].filter(function (m) { return S.lv >= m.lv; }); }
  async function heroTurn(h) {
    B.active = h;
    try {
      while (true) {
        var basic = movesOf(h.id)[0], pos = menuPosNear(h.x - 10, heroTop(h) - 16);
        var top = [
          { label: basic.name, icon: HEROES[h.id].weapon, desc: basic.desc, off: !targetsFor(basic).length },
          { label: "Sorts", icon: "✦", sub: S.pe + " PE", desc: "Techniques qui coûtent des PE.", off: !movesOf(h.id).slice(1).some(function (m) { return S.pe >= m.pe && (m.tgt === "party" || targetsFor(m).length); }) },
          { label: "Écho", icon: "❂", sub: Math.floor(S.echo) + "/" + S.echoMax, desc: "Techniques spéciales, payées avec la jauge d'Écho que remplit le public.", off: S.echo < 1 },
          { label: "Objets", icon: "berry", desc: "Potions, éther, glands explosifs…", off: !Object.keys(S.items).some(function (k) { return S.items[k] > 0; }) },
          { label: "Tactique", icon: "⚑", desc: "Défendre, saluer le public, fuir." }
        ];
        var c = await choose(top, { title: h.name + " · à toi !", pos: pos, noBack: true, start: h.lastTop || 0 });
        h.lastTop = c;
        if (c === 0) { var tg = await pickTarget(targetsFor(basic), basic.tgt === "all" ? "all" : ""); if (!tg) continue; await doMove(h, basic, tg); return; }
        if (c === 1) {
          var ms = movesOf(h.id).slice(1);
          var opts = ms.map(function (m) { return { label: m.name, sub: m.pe + " PE", desc: m.desc, off: S.pe < m.pe || (m.tgt !== "party" && !targetsFor(m).length) }; });
          if (!opts.length) { await say(["Pas encore de sort. Monte de niveau !"]); continue; }
          var s = await choose(opts, { title: "Sorts de " + h.name, pos: pos });
          if (s < 0) continue;
          var m = ms[s], t2 = null;
          if (m.tgt === "one") { t2 = await pickTarget(targetsFor(m)); if (!t2) continue; }
          else if (m.tgt === "all" || m.tgt === "ground") { t2 = await pickTarget(targetsFor(m), "all"); if (!t2) continue; }
          S.pe -= m.pe; hud(); await doMove(h, m, t2); return;
        }
        if (c === 2) {
          var em = ECHO_MOVES.filter(function (m) { return !m.need || S.flags[m.need]; });
          var e2 = await choose(em.map(function (m) { return { label: m.name, sub: m.cost + " ❂", desc: m.desc, off: S.echo < m.cost }; }), { title: "Écho", pos: pos });
          if (e2 < 0) continue;
          S.echo -= em[e2].cost; hud(); await doEcho(h, em[e2]); return;
        }
        if (c === 3) { var r = await itemMenu(h, pos); if (r === "back") continue; return r; }
        if (c === 4) {
          var tc = await choose([{ label: "Défendre", icon: "shield", desc: "+1 défense jusqu'à ton prochain tour." }, { label: "Saluer le public", icon: "✶", desc: "Le public t'acclame : la jauge d'Écho se remplit." }, { label: "Fuir", icon: "dash", desc: B.boss ? "Impossible de fuir un boss !" : "Martèle A pour t'échapper.", off: B.boss }], { title: "Tactique", pos: pos });
          if (tc < 0) continue;
          if (tc === 0) { h.guard = true; word(h.x, heroTop(h) - 10, "En garde", "#f6d36b"); SFX.guard(); await wait(500); return; }
          if (tc === 1) { await tween(h, { lift: 0 }, 420, "out", 22); B.cheer = 2; SFX.cheer(); addEcho(0.55); word(h.x, heroTop(h) - 12, "Bravo !", "#f29ad8"); if (B.aud < 40) B.aud += 1; await wait(400); return; }
          if (tc === 2) {
            var g = await cmdMash(1500, { x: h.x, y: heroTop(h) - 10 }, "Martèle " + KA + " pour fuir !");
            if (g >= 0.4 + 0.08 * aliveE().length) { word(h.x, heroTop(h) - 10, "Fuite !", "#fdf3de"); await Promise.all(B.heroes.map(function (x) { return tween(x, { x: -40 }, 500, "in"); })); return "flee"; }
            word(h.x, heroTop(h) - 10, "Raté…", "#e0283a"); SFX.miss(); await wait(400); return;
          }
        }
      }
    } finally { B.active = null; }
  }
  async function itemMenu(h, pos) {
    var ids = Object.keys(ITEMS).filter(function (k) { return S.items[k] > 0; });
    var c = await choose(ids.map(function (k) { return { label: ITEMS[k].name, icon: ITEMS[k].icon, sub: "x" + S.items[k], desc: ITEMS[k].desc, off: ITEMS[k].use === "flee" && B.boss }; }), { title: "Objets", pos: pos });
    if (c < 0) return "back";
    var id = ids[c], it = ITEMS[id];
    if (it.use === "hero") {
      var hs = B.heroes.filter(function (x) { return it.revive || S.hp[x.id] > 0; });
      var hc = await choose(hs.map(function (x) { return { label: x.name, sub: Math.max(0, S.hp[x.id]) + "/" + maxHp(x.id) + " PV" }; }), { title: "Sur qui ?", pos: pos });
      if (hc < 0) return "back";
      var t = hs[hc]; S.items[id]--;
      var amt = it.revive ? (S.hp[t.id] <= 0 ? Math.ceil(maxHp(t.id) / 2) : 10) : it.hp;
      S.hp[t.id] = Math.min(maxHp(t.id), Math.max(0, S.hp[t.id]) + amt); num(t.x, heroTop(t) - 4, "+" + amt, "#9cc56b"); burst(t.x, heroTop(t) + 10, "#9cc56b", 12); SFX.coin();
    } else if (it.use === "party") { S.items[id]--; S.pe = Math.min(maxPe(), S.pe + it.pe); num(h.x, heroTop(h) - 4, "+" + it.pe + " PE", "#8ac0ff"); SFX.coin(); }
    else if (it.use === "enemies") {
      S.items[id]--;
      if (it.dmg) { for (var i = 0; i < aliveE().length; i++) { } var al = aliveE(); for (i = 0; i < al.length; i++) { projectile({ x: h.x, y: heroTop(h) }, { x: al[i].x, y: enTop(al[i]) + 10 }, "pinebomb", 420, 40); } await wait(430); al.forEach(function (e) { hurtE(e, it.dmg, { pierce: true, col: "#ff8a2a" }); }); B.shake = 8; }
      else { aliveE().forEach(function (e) { if (!e.boss && Math.random() < 0.7) { e.sleep = 2; word(e.x, enTop(e) - 10, "Zzz", "#c9b3ff"); } else word(e.x, enTop(e) - 10, "Résiste", "#fdf3de"); }); SFX.magic(); }
    } else if (it.use === "flee") { S.items[id]--; word(h.x, heroTop(h) - 10, "Fuite !", "#fdf3de"); await Promise.all(B.heroes.map(function (x) { return tween(x, { x: -40 }, 500, "in"); })); hud(); return "flee"; }
    hud(); await wait(600);
  }
  function mid(e) { return { x: e.x, y: enTop(e) + S_(e.spr)[0].h * e.sc * 0.45 }; }
  function hand(h) { return { x: h.x + 14, y: heroTop(h) + 14 }; }
  async function walkTo(h, x) { await tween(h, { x: x }, Math.abs(h.x - x) * 2.2 + 80, "io"); }

  async function doMove(h, m, tg) {
    var A = heroAtk(h), ok, i, k = 0;
    switch (m.id) {
      case "hache": {
        var dmg = A + (S.flags.steel ? 1 : 0), to = mid(tg);
        h.rot = -0.3; setTimeout(function () { h.rot = 0; }, 200);
        var pr = projectile(hand(h), to, "axe", 520, 30); ok = await cmdTimed(520, to); await pr;
        hurtE(tg, dmg);
        if (ok && tg.hp > 0) {
          rateWord(0, to.x, to.y - 30); addEcho(0.15);
          var up = { x: to.x + 10, y: to.y - 50 };
          var p2 = projectile(to, to, "axe", 480, 60); var ok2 = await cmdTimed(480, to, "Retour brutal : encore " + KA + " !"); await p2;
          hurtE(tg, dmg); if (ok2) { rateWord(1, to.x, to.y - 30); addEcho(0.2); await stylish(to); }
        } else if (!ok) { SFX.miss(); }
        await projectile(to, hand(h), "axe", 380, 20);
        break;
      }
      case "vent":
        for (i = 0; i < 3; i++) {
          var al = aliveE(); if (!al.length) break; var t = pick(al), p = mid(t);
          var pp = projectile(hand(h), p, "axe", 420, 18); ok = await cmdTimed(420, p); await pp;
          hurtE(t, A - 1 + (ok ? 2 : 1)); if (ok) { rateWord(k++, p.x, p.y - 30); addEcho(0.12); }
        }
        if (k === 3) await stylish(hand(h));
        break;
      case "feu": {
        ok = await cmdHold({ x: h.x, y: heroTop(h) - 16 }, "Maintiens " + KA + " pour enflammer la hache, relâche quand c'est plein !");
        var axe = { x: h.x + 14, y: STAGE_Y - 30, lift: 0, spr: "axe", spin: true, fire: true }; B.fx.push(axe);
        var targets = aliveE().slice().sort(function (a, b) { return a.x - b.x; }), hitSet = {};
        var tw = tween(axe, { x: W + 40 }, 900, "lin");
        while (axe.x < W + 30) {
          targets.forEach(function (e) { if (!hitSet[e.slot] && axe.x >= e.x - 10) { hitSet[e.slot] = 1; hurtE(e, A + (ok ? 1 : 0), { col: "#ff8a2a" }); if (ok && e.hp > 0) e.burn = 2; burst(e.x, mid(e).y, "#ff8a2a", 10); } });
          await wait(16);
        }
        await tw; B.fx.splice(B.fx.indexOf(axe), 1);
        if (ok) { rateWord(1, W / 2 + 60, 90); addEcho(0.25); await stylish({ x: W / 2 + 60, y: 100 }); } else SFX.miss();
        break;
      }
      case "glace": {
        var tp = mid(tg);
        var c = await cmdSeq(4, 2600, { x: W / 2, y: 92 }, "Recopie les flèches pour geler !");
        await projectile(hand(h), tp, "axe", 360, 16);
        hurtE(tg, A + (c >= 4 ? 2 : c >= 2 ? 1 : 0), { col: "#8ae8ff" });
        if (c >= 4 && tg.hp > 0) { tg.freeze = tg.boss ? 1 : 2; word(tp.x, tp.y - 30, "Gelé !", "#8ae8ff"); addEcho(0.3); await stylish(tp); } else if (c < 4) SFX.miss();
        break;
      }
      case "orbe": {
        var c2 = await cmdSeq(3, 2000, { x: W / 2, y: 92 }, "Trace les runes : recopie les flèches !");
        var op = mid(tg); await projectile(hand(h), op, "orb", 380, 10);
        hurtE(tg, A + (c2 >= 3 ? 2 : c2 >= 2 ? 1 : 0), { magic: true, col: "#e0a0ff" });
        if (c2 >= 3) { rateWord(1, op.x, op.y - 30); addEcho(0.22); await stylish(op); } else if (c2 < 2) SFX.miss();
        break;
      }
      case "rempart": {
        ok = await cmdTimed(700, { x: h.x, y: heroTop(h) + 10 }, "Appuie sur " + KA + " quand l'anneau se referme !");
        B.heroes.forEach(function (x) { x.defUp = 3; x.defUpV = ok ? 2 : 1; burst(x.x, heroTop(x) + 10, "#6ad8ff", 10); });
        word(h.x, heroTop(h) - 14, ok ? "Rempart +2 !" : "Rempart +1", "#6ad8ff"); SFX.magic(); if (ok) addEcho(0.2);
        await wait(500); break;
      }
      case "nova": {
        var g = await cmdMash(1800, { x: h.x, y: heroTop(h) - 10 }, "Martèle " + KA + " pour amplifier le givre !");
        SFX.magic(); B.flashC = "rgba(138,232,255,"; B.flash = 0.5;
        aliveE().forEach(function (e) { hurtE(e, A + (g >= 0.7 ? 1 : 0), { magic: true, col: "#8ae8ff" }); if (g >= 0.5 && e.hp > 0) e.weak = 2; });
        if (g >= 0.7) { rateWord(1, W / 2 + 60, 90); addEcho(0.25); }
        await wait(500); break;
      }
      case "comete": {
        ok = await cmdHold({ x: h.x, y: heroTop(h) - 16 }, "Maintiens " + KA + " pour appeler la comète !");
        var cp = mid(tg); await projectile({ x: cp.x - 80, y: -20 }, cp, "fireball", 420);
        B.shake = 10; hurtE(tg, A + (ok ? 4 : 1), { magic: true, col: "#e0a0ff" });
        if (ok) { aliveE().forEach(function (e) { if (e !== tg) hurtE(e, 1, { magic: true, col: "#e0a0ff" }); }); rateWord(2, cp.x, cp.y - 30); addEcho(0.3); await stylish(cp); } else SFX.miss();
        break;
      }
      case "massue": {
        var hx0 = h.x; await walkTo(h, tg.x - 44);
        ok = await cmdHold({ x: h.x, y: heroTop(h) - 16 }, "Maintiens " + KA + ", relâche quand la massue est chargée !");
        h.rot = 0.4; await wait(90); h.rot = 0; B.fx.push({ x: h.x + 24, y: STAGE_Y - 10, spr: "hammer", life: 0.25, t: 0, sc: 2 });
        hurtE(tg, A + (ok ? 2 : 0));
        if (tg.spiky) { await wait(200); word(h.x, heroTop(h) - 12, "Aïe, des piquants !", "#ff8a80"); S.hp[h.id] = Math.max(0, S.hp[h.id] - 1); num(h.x, heroTop(h), 1, "#ff8a80"); SFX.hurt(); hud(); }
        if (ok) { rateWord(0, tg.x, enTop(tg) - 14); addEcho(0.18); await stylish(mid(tg)); } else SFX.miss();
        await walkTo(h, hx0); h.x = h.hx; break;
      }
      case "fracas": {
        await tween(h, { lift: 0 }, 420, "out", 46);
        var g2 = await cmdMash(1500, { x: h.x, y: heroTop(h) - 10 }, "Martèle " + KA + " pour faire trembler la scène !");
        B.shake = 14; SFX.hit();
        aliveE().forEach(function (e) {
          if (e.fly) { e.fly = false; tween(e, { y: STAGE_Y }, 300, "in"); e.hy = STAGE_Y; word(e.x, enTop(e) - 8, "Tombé !", "#fdf3de"); }
          if (e.def > 0) { e.flip = 2; word(e.x, enTop(e) - 20, "Retourné !", "#f6d36b"); }
          hurtE(e, A - 1 + (g2 >= 0.7 ? 2 : 1), { pierce: true });
        });
        if (g2 >= 0.7) { rateWord(1, W / 2 + 60, 90); addEcho(0.22); }
        await wait(400); break;
      }
      case "boulet": {
        var yeti = { x: h.x + 20, y: STAGE_Y - 4, spr: "miniyeti", spin: true, lift: 0, sc: 2 }; B.fx.push(yeti);
        var gt = (Array.isArray(tg) ? tg : targetsFor(m)).slice().sort(function (a, b) { return a.x - b.x; });
        var first = gt[0], dist = first ? first.x - yeti.x : 200;
        var twy = tween(yeti, { x: first ? first.x : W }, Math.max(200, dist * 2.4), "in");
        ok = await cmdTimed(Math.max(200, dist * 2.4), { x: first ? first.x : W - 60, y: STAGE_Y - 20 }, "Appuie sur " + KA + " quand le yéti percute !");
        await twy;
        for (i = 0; i < gt.length; i++) { await tween(yeti, { x: gt[i].x }, 120, "lin"); hurtE(gt[i], A - 1 + (ok ? 2 : 1)); }
        await tween(yeti, { x: W + 40 }, 300, "lin", 30); B.fx.splice(B.fx.indexOf(yeti), 1);
        if (ok) { rateWord(0, W / 2 + 60, 90); addEcho(0.18); await stylish({ x: W - 100, y: 120 }); } else SFX.miss();
        break;
      }
      case "cri": {
        var g3 = await cmdMash(1500, { x: h.x, y: heroTop(h) - 10 }, "Martèle " + KA + " pour rugir !");
        B.shake = 8; noise(0.4, 0.1, 200);
        var v = g3 >= 0.85 ? 2 : g3 >= 0.4 ? 1 : 0;
        if (v) { B.heroes.forEach(function (x) { x.atkUp = 3; x.atkUpV = v; burst(x.x, heroTop(x) + 10, "#e0283a", 8); }); word(h.x, heroTop(h) - 14, "Attaque +" + v + " !", "#ff8a80"); addEcho(0.1 * v); }
        else { word(h.x, heroTop(h) - 14, "Le rugissement s'étouffe…", "#fdf3de"); SFX.miss(); }
        await wait(500); break;
      }
      case "meute": {
        var ys = [{ x: h.x, y: STAGE_Y, spr: "miniyeti", lift: 0, sc: 2 }, { x: h.x - 30, y: STAGE_Y, spr: "miniyeti", lift: 0, sc: 2 }];
        ys.forEach(function (y) { B.fx.push(y); });
        for (i = 0; i < 4; i++) {
          var al2 = aliveE(); if (!al2.length) break; var tt = pick(al2), yy = ys[i % 2], mp = mid(tt);
          var py = tween(yy, { x: tt.x - 10, y: tt.fly ? mp.y + 20 : STAGE_Y }, 380, "io", 40); ok = await cmdTimed(380, mp, "Morsure de givre : " + KA + " !"); await py;
          hurtE(tt, A - 1 + (ok ? 2 : 1), { col: "#8ae8ff" }); if (ok) { rateWord(k++, mp.x, mp.y - 30); addEcho(0.1); }
        }
        await Promise.all(ys.map(function (y) { return tween(y, { x: -30, y: STAGE_Y }, 400, "in"); })); ys.forEach(function (y) { B.fx.splice(B.fx.indexOf(y), 1); });
        break;
      }
    }
    await wait(250);
  }
  async function doEcho(h, m) {
    var g;
    B.flashC = "rgba(246,211,107,"; B.flash = 0.6; SFX.magic(); word(W / 2, 64, m.name, "#f6d36b"); await wait(500);
    if (m.id === "souffle") {
      g = await cmdMash(1800, { x: W / 2, y: 100 }, "Martèle " + KA + " pour attiser le souffle !");
      var hp = 3 + Math.round(g * 5), pe = 2 + Math.round(g * 4);
      B.heroes.forEach(function (x) { if (S.hp[x.id] <= 0) return; S.hp[x.id] = Math.min(maxHp(x.id), S.hp[x.id] + hp); num(x.x, heroTop(x) - 4, "+" + hp, "#9cc56b"); burst(x.x, heroTop(x) + 10, "#9cc56b", 12); });
      S.pe = Math.min(maxPe(), S.pe + pe); SFX.lvl();
    } else if (m.id === "avalanche") {
      g = await cmdMash(2000, { x: W / 2, y: 100 }, "Martèle " + KA + " : plus de yétis !");
      var n = 3 + Math.round(g * 6), i;
      for (i = 0; i < n; i++) { var yx = rnd(260, 460); B.fx.push({ x: yx, y: -10, spr: "miniyeti", sc: 2, fall: true, t: 0, life: 0.5, vy: 420 }); }
      await wait(450); B.shake = 14;
      aliveE().forEach(function (e) { hurtE(e, 2 + Math.round(g * 4), { pierce: true, col: "#8ae8ff" }); });
    } else if (m.id === "eveil") {
      var ok = await cmdTimed(800, { x: W / 2, y: 110 }, "Appuie sur " + KA + " quand l'anneau se referme !");
      B.eveil = ok ? 4 : 3;
      B.heroes.forEach(function (x) { if (S.hp[x.id] > 0) { S.hp[x.id] = Math.min(maxHp(x.id), S.hp[x.id] + 3); burst(x.x, heroTop(x) + 10, "#f6d36b", 14); } });
      word(W / 2, 90, "Attaque +2 · Défense +1", "#f6d36b");
    }
    hud(); await wait(600);
  }

  /* ---------- tour des ennemis ---------- */
  async function enemyPhase() {
    var list = B.enemies.slice();
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (e.hp <= 0) continue;
      if (!aliveH().length) return;
      if (e.sleep > 0) { e.sleep--; word(e.x, enTop(e) - 10, "Zzz…", "#c9b3ff"); await wait(450); continue; }
      if (e.freeze > 0) { e.freeze--; word(e.x, enTop(e) - 10, "Gelé…", "#8ae8ff"); await wait(450); continue; }
      await enemyAct(e);
      await wait(180);
    }
  }
  function eAtk(e) { return Math.max(1, e.atk + e.rage - (e.weak > 0 ? 1 : 0)); }
  function pickHero() { var a = aliveH(); var w = a.map(function (h, i) { return i === 0 ? 1.4 : 1; }); var s = w.reduce(function (x, y) { return x + y; }, 0), r = Math.random() * s; for (var i = 0; i < a.length; i++) { r -= w[i]; if (r <= 0) return a[i]; } return a[0]; }
  async function enemyAct(e) {
    var ai = e.d.ai, act = pick(ai), h = pickHero();
    if (e.boss && e.hp < e.max / 2 && e.d.summon && Math.random() < 0.4 && aliveE().length < 3) act = "summon";
    if (act === "summon" && aliveE().length >= 3) act = "charge";
    if (act === "heal") { var hurt = aliveE().filter(function (x) { return x.hp < x.max; }); if (!hurt.length) act = "zap"; }
    if (act === "rage" && e.rage >= 2) act = "double";
    switch (act) {
      case "charge": await atkCharge(e, h, eAtk(e), 360); break;
      case "double": await atkCharge(e, h, eAtk(e), 320); if (S.hp[h.id] > 0 && e.hp > 0) await atkCharge(e, h, eAtk(e), 240, true); break;
      case "dive": await atkDive(e, h); break;
      case "zap": await atkShot(e, h, "orb", function (r) { }); break;
      case "web": await atkShot(e, h, "needle", function (r, hh) { if (!r) { hh.stun = 1; word(hh.x, heroTop(hh) - 20, "Empêtré !", "#c9b3ff"); } }); break;
      case "heal": {
        var tg = aliveE().filter(function (x) { return x.hp < x.max; }).sort(function (a, b) { return a.hp / a.max - b.hp / b.max; })[0];
        word(e.x, enTop(e) - 10, "Laine apaisante", "#c9b3ff"); SFX.magic(); await tween(e, { lift: 0 }, 400, "out", 14);
        var v = Math.min(3, tg.max - tg.hp); tg.hp += v; num(tg.x, enTop(tg) - 4, "+" + v, "#9cc56b"); burst(tg.x, mid(tg).y, "#9cc56b", 10); await wait(400); break;
      }
      case "summon": {
        word(e.x, enTop(e) - 14, e.id === "tisseuse" ? "Tisse une araignée !" : "BÊÊÊ ! Renforts !", "#f2b05e"); SFX.hurt(); await wait(400);
        var n2 = addEnemy(e.d.summon, W + 30); if (n2) { n2.summoned = true; await tween(n2, { x: n2.hx }, 500, "out"); }
        await wait(300); break;
      }
      case "rage": e.rage++; word(e.x, enTop(e) - 14, "Il enrage ! Attaque +1", "#e0283a"); B.shake = 6; SFX.hurt(); await tween(e, { lift: 0 }, 300, "out", 10); await wait(300); break;
      case "stomp": await atkStomp(e, false); break;
      case "bleat": await atkStomp(e, true); break;
    }
  }
  async function atkCharge(e, h, dmg, dashMs, quick) {
    if (!quick) { await tween(e, { x: e.x + 12 }, 260, "out"); e.glint = 0.2; await wait(140); }
    var tI = now() + dashMs; openDef(tI, h);
    await tween(e, { x: h.x + 26 + S_(e.spr)[0].w * e.sc * 0.3 }, dashMs, "in");
    var res = await closeDef(); hurtH(h, dmg, res, e);
    if (res !== "contre") tween(h, { x: h.hx - 10 }, 90, "out").then(function () { return tween(h, { x: h.hx }, 160, "io"); });
    await tween(e, { x: e.hx }, res === "contre" ? 260 : 380, "out", res === "contre" ? 24 : 0);
  }
  async function atkDive(e, h) {
    await tween(e, { y: e.hy - 30 }, 300, "out"); e.glint = 0.2; await wait(120);
    var tI = now() + 380; openDef(tI, h);
    await tween(e, { x: h.x + 22, y: STAGE_Y - 10 }, 380, "in");
    var res = await closeDef(), r = hurtH(h, eAtk(e), res, e);
    if (!res && e.d.poison && Math.random() < e.d.poison && S.hp[h.id] > 0) { h.poison = 2; word(h.x, heroTop(h) - 24, "Empoisonné", "#9cc56b"); }
    await tween(e, { x: e.hx, y: e.fly ? e.hy : STAGE_Y }, 420, "out");
  }
  async function atkShot(e, h, spr, after) {
    await tween(e, { lift: 0 }, 340, "out", 12); e.glint = 0.2; SFX.magic();
    var tI = now() + 480; openDef(tI, h);
    await projectile(mid(e), { x: h.x + 6, y: heroTop(h) + 16 }, spr, 480, 20);
    var res = await closeDef(); hurtH(h, eAtk(e), res, res === "contre" ? e : null); after(res, h);
    await wait(200);
  }
  async function atkStomp(e, bleat) {
    word(e.x, enTop(e) - 14, bleat ? "Bêlement assourdissant !" : "Piétinement !", "#f2b05e");
    await tween(e, { lift: 0 }, 520, "out", bleat ? 12 : 54); B.shake = 10; SFX.hit();
    var hs = aliveH().slice().sort(function (a, b) { return b.x - a.x; });
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i], wave = { x: e.x - 30, y: STAGE_Y - 6, spr: bleat ? "note" : "pebble", lift: 0, sc: 2 }; B.fx.push(wave);
      var tI = now() + 420; openDef(tI, h);
      await tween(wave, { x: h.x + 10 }, 420, "lin", bleat ? 10 : 0);
      B.fx.splice(B.fx.indexOf(wave), 1);
      var res = await closeDef(); hurtH(h, bleat ? Math.max(1, eAtk(e) - 2) : eAtk(e), res, null);
      if (bleat && !res && S.hp[h.id] > 0) { h.stun = 1; word(h.x, heroTop(h) - 24, "Assourdi !", "#c9b3ff"); }
    }
    await wait(300);
  }

  /* ---------- dessin du combat ---------- */
  function drawPromptRing(p, t) {
    var dur = p.tEnd - p.t0, r = 6 + Math.max(0, (p.tEnd - now()) / dur) * 34;
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = p.hit ? "#9cc56b" : p.fail ? "#e0283a" : "#f6d36b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(253,243,222,.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 7, 0, TAU); ctx.stroke();
    btnIcon(p.pos.x + 26, p.pos.y - 22, "A", t);
  }
  function btnIcon(x, y, L, t) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.fillStyle = L === "A" ? "#e8873a" : "#9cc56b"; ctx.beginPath(); ctx.arc(x, y - (Math.floor(t * 6) % 2), 7, 0, TAU); ctx.fill(); ptext(L, x + 1, y - 3, "#2b1709", 1, "c"); }
  function drawPrompt(t) {
    var p = B.prompt; if (!p) return;
    if (p.kind === "timed") drawPromptRing(p, t);
    else if (p.kind === "hold") {
      var x = p.pos.x - 30, y = p.pos.y - 10, w = 60, f = clamp(p.p, 0, 1);
      ctx.fillStyle = OUT; ctx.fillRect(x - 2, y - 2, w + 4, 12); ctx.fillStyle = "#4a3a30"; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = "#3f6b3a"; ctx.fillRect(x + w * 0.92, y, w * 0.08, 8);
      var full = p.p >= 0.92; ctx.fillStyle = full ? (Math.floor(t * 16) % 2 ? "#fdf3de" : "#f6d36b") : "#e8873a"; ctx.fillRect(x, y, Math.round(w * f), 8);
      for (var i = 1; i < 6; i++) { ctx.fillStyle = OUT; ctx.fillRect(x + i * 10, y, 1, 8); }
      btnIcon(x + w + 14, y + 3, "A", t);
      if (!p.start) ptext("MAINTIENS", p.pos.x, y - 10, "#fdf3de", 1, "c"); else if (full) ptext("RELACHE !", p.pos.x, y - 10, "#f6d36b", 1, "c");
    } else if (p.kind === "mash") {
      var mx = p.pos.x - 36, my = p.pos.y - 10, mw = 72;
      ctx.fillStyle = OUT; ctx.fillRect(mx - 2, my - 2, mw + 4, 12); ctx.fillStyle = "#4a3a30"; ctx.fillRect(mx, my, mw, 8);
      ctx.fillStyle = p.g >= 0.7 ? "#9cc56b" : "#e8873a"; ctx.fillRect(mx, my, Math.round(mw * p.g), 8);
      ctx.fillStyle = "#fdf3de"; ctx.fillRect(mx + mw * 0.7, my - 1, 1, 10);
      var tl = 1 - (now() - p.t0) / p.dur; ctx.fillStyle = "#f6d36b"; ctx.fillRect(mx, my + 10, Math.round(mw * clamp(tl, 0, 1)), 2);
      btnIcon(mx + mw + 14, my + 3 - (Math.floor(t * 12) % 2) * 2, "A", t);
    } else if (p.kind === "seq") {
      var n = p.seq.length, bw = 22, sx = p.pos.x - n * bw / 2;
      ctx.fillStyle = "rgba(43,23,9,.75)"; ctx.fillRect(sx - 6, p.pos.y - 16, n * bw + 12, 34);
      p.seq.forEach(function (d, i) {
        var cx = sx + i * bw + bw / 2, cy = p.pos.y;
        ctx.fillStyle = i < p.i ? "#9cc56b" : i === p.i ? (p.bad ? "#e0283a" : "#f6d36b") : "#fdf3de";
        drawArrow(cx, cy, d, i === p.i ? 7 : 6);
      });
      var tl2 = 1 - (now() - p.t0) / p.lim; ctx.fillStyle = "#f6d36b"; ctx.fillRect(sx - 4, p.pos.y + 13, Math.round((n * bw + 8) * clamp(tl2, 0, 1)), 2);
    }
  }
  function drawArrow(x, y, d, s) {
    var a = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[d];
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    var f = ctx.fillStyle; ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(s + 2, 0); ctx.lineTo(-s, -s - 2); ctx.lineTo(-s, s + 2); ctx.fill();
    ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s + 2, -s + 1); ctx.lineTo(-s + 2, s - 1); ctx.fill(); ctx.restore();
  }
  function drawBattle(t, dt) {
    var b = B; b.t += dt;
    var sx = b.shake > 0 ? rnd(-b.shake, b.shake) : 0; b.shake = Math.max(0, b.shake - dt * 30);
    ctx.save(); ctx.translate(Math.round(sx), 0);
    ctx.drawImage(backdrop(b.bg), 0, 0);
    // projecteurs
    [[130, "rgba(255,240,190,"], [370, "rgba(255,240,190,"]].forEach(function (s) { var gr = ctx.createRadialGradient(s[0], 200, 10, s[0], 200, 120); gr.addColorStop(0, s[1] + ".22)"); gr.addColorStop(1, s[1] + "0)"); ctx.fillStyle = gr; ctx.fillRect(s[0] - 130, 60, 260, 160); });
    // ombres
    b.heroes.concat(b.enemies).forEach(function (e) { if (e.kind === "e" && e.hp <= 0 && e.alpha < 0.05) return; var w = e.kind === "e" ? S_(e.spr)[0].w * e.sc * 0.6 : 26; ctx.globalAlpha = e.alpha === undefined ? 1 : e.alpha; shadowAt(e.x, STAGE_Y, w); ctx.globalAlpha = 1; });
    // ennemis
    b.enemies.forEach(function (e) {
      if (e.hp <= 0 && e.alpha <= 0.02) return;
      e.t += dt; e.flash = Math.max(0, e.flash - dt); e.glint = Math.max(0, (e.glint || 0) - dt);
      var a = S_(e.spr), fr = a[Math.floor(e.t * (e.sleep > 0 || e.freeze > 0 ? 0 : 4)) % a.length], bob = e.fly ? Math.sin(e.t * 4) * 3 : 0, y = e.y - e.lift + bob;
      ctx.save(); ctx.globalAlpha = e.alpha;
      if (e.rot) { ctx.translate(e.x, y); ctx.rotate(e.rot * 1.4); ctx.translate(-e.x, -y); }
      if (e.flip > 0) { ctx.translate(e.x, y - fr.h * e.sc / 2); ctx.scale(1, -1); ctx.translate(-e.x, -(y - fr.h * e.sc / 2)); }
      blit(fr, e.x, y, e.sc, !natLeft(e.spr), e.flash > 0 && Math.floor(e.flash * 30) % 2 === 0);
      if (e.freeze > 0) { ctx.globalAlpha = 0.4 * e.alpha; ctx.fillStyle = "#8ae8ff"; ctx.fillRect(e.x - fr.w * e.sc / 2, y - fr.h * e.sc, fr.w * e.sc, fr.h * e.sc); }
      ctx.restore();
      if (e.hp > 0) {
        if (e.glint > 0) ptext("!", e.x, y - fr.h * e.sc - 12, "#fdf3de", 2, "c");
        var bw = 30, bx = e.x - bw / 2, by = STAGE_Y + 6;
        ctx.fillStyle = OUT; ctx.fillRect(bx - 1, by - 1, bw + 2, 5); ctx.fillStyle = "#4a3a30"; ctx.fillRect(bx, by, bw, 3); ctx.fillStyle = e.hp / e.max > 0.35 ? "#9cc56b" : "#e0283a"; ctx.fillRect(bx, by, Math.round(bw * e.hp / e.max), 3);
        ptext(e.hp, e.x, by + 6, "#fdf3de", 1, "c");
        var st = []; if (e.burn > 0) st.push(["#ff8a2a", "F"]); if (e.sleep > 0) st.push(["#c9b3ff", "Z"]); if (e.flip > 0) st.push(["#f6d36b", "-"]); if (e.weak > 0) st.push(["#8ae8ff", "-"]); if (e.rage > 0) st.push(["#e0283a", "+"]); if (e.spiky) st.push(["#a06a3e", "!"]); if (e.def > 0 && !e.flip) st.push(["#8a929a", "" + e.def]);
        st.forEach(function (s, i) { ctx.fillStyle = OUT; ctx.fillRect(e.x + 17 + i * 0, by - 2 - i * 9, 9, 9); ctx.fillStyle = s[0]; ctx.fillRect(e.x + 18, by - 1 - i * 9, 7, 7); ptext(s[1], e.x + 22, by - i * 9, OUT, 1, "c"); });
      }
    });
    // héros
    b.heroes.forEach(function (h) {
      h.flash = Math.max(0, h.flash - dt);
      var ko = S.hp[h.id] <= 0, f = frameOf(h.spr, b.t + h.hx * 0.01, false), y = h.y - h.lift;
      ctx.save();
      if (ko) { ctx.translate(h.x, y - 6); ctx.rotate(-Math.PI / 2); ctx.translate(-h.x, -(y - 6)); ctx.globalAlpha = 0.75; }
      else if (h.rot) { ctx.translate(h.x, y); ctx.rotate(h.rot); ctx.translate(-h.x, -y); }
      blit(f.s, h.x, y, h.sc, false, h.flash > 0 && Math.floor(h.flash * 30) % 2 === 0);
      ctx.restore();
      if (!ko) {
        if (h.defUp > 0 || h.guard) { ctx.strokeStyle = "rgba(106,216,255,.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, y - 18, 24, -1.2, 1.2); ctx.stroke(); }
        if (h.atkUp > 0 || b.eveil > 0) { ctx.fillStyle = "rgba(224,40,58," + (0.3 + 0.2 * Math.sin(b.t * 8)) + ")"; ctx.fillRect(h.x - 16, y - 4, 32, 3); }
        if (h.stun > 0) ptext("@", h.x, heroTop(h) - 6, "#c9b3ff", 1, "c");
        if (h.poison > 0) { ctx.fillStyle = "#9cc56b"; ctx.fillRect(h.x - 18, heroTop(h), 4, 4); }
      }
      if (b.active === h && !b.prompt) { var ay = heroTop(h) - 14 + Math.sin(b.t * 6) * 2; ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(h.x - 6, ay - 2); ctx.lineTo(h.x + 6, ay - 2); ctx.lineTo(h.x, ay + 7); ctx.fill(); ctx.fillStyle = "#f6d36b"; ctx.beginPath(); ctx.moveTo(h.x - 4, ay); ctx.lineTo(h.x + 4, ay); ctx.lineTo(h.x, ay + 5); ctx.fill(); }
      if (b.alert && b.alert.h === h) { var lt = b.alert.t - now(); if (lt < 320 && lt > -60) ptext("!", h.x + 18, heroTop(h) - 10, "#e0283a", 2, "c"); }
    });
    // projectiles et effets
    for (var i = b.fx.length - 1; i >= 0; i--) {
      var p = b.fx[i];
      if (p.life !== undefined) { p.t += dt; if (p.fall) p.y += p.vy * dt; if (p.t > p.life) { b.fx.splice(i, 1); continue; } }
      var s = S_(p.spr)[0]; ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - (p.lift || 0)));
      if (p.spin) ctx.rotate(b.t * 18);
      var sc = p.sc || 2; ctx.drawImage(s.c, -s.w * sc / 2, -s.h * sc / 2, s.w * sc, s.h * sc);
      if (p.fire) { ctx.fillStyle = "rgba(255,138,42,.55)"; ctx.beginPath(); ctx.arc(0, 0, 14 + Math.sin(b.t * 30) * 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // curseur de cible
    if (b.cursor) {
      var cl = b.cursor.all ? b.cursor.list : [b.cursor.list[b.cursor.i]];
      cl.forEach(function (e) { var cy = enTop(e) - 12 + Math.sin(b.t * 7) * 3; ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(e.x - 8, cy - 3); ctx.lineTo(e.x + 8, cy - 3); ctx.lineTo(e.x, cy + 8); ctx.fill(); ctx.fillStyle = "#e8873a"; ctx.beginPath(); ctx.moveTo(e.x - 6, cy - 1); ctx.lineTo(e.x + 6, cy - 1); ctx.lineTo(e.x, cy + 5); ctx.fill(); });
    }
    drawPrompt(t);
    if (b.spark) { var sp = b.spark, age = now() - sp.t0, on = age < sp.win; if (on) { var r = 6 + Math.sin(age / 40) * 3; ctx.fillStyle = "#fdf3de"; ctx.fillRect(sp.x - 1, sp.y - r, 3, r * 2); ctx.fillRect(sp.x - r, sp.y - 1, r * 2, 3); ctx.fillStyle = "#f29ad8"; ctx.fillRect(sp.x - 2, sp.y - 2, 5, 5); btnIcon(sp.x + 18, sp.y - 12, "B", t); } }
    // particules
    for (i = b.parts.length - 1; i >= 0; i--) { var q = b.parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; if (q.t > q.life) { b.parts.splice(i, 1); continue; } ctx.fillStyle = q.col; var z = q.star ? 4 : 3; ctx.fillRect(Math.round(q.x), Math.round(q.y), z, z); }
    ctx.restore();
    // public de la forêt
    drawAudience(t, dt);
    // nombres et mots
    for (i = b.nums.length - 1; i >= 0; i--) { var n = b.nums[i]; n.t += dt; if (n.t > 1) { b.nums.splice(i, 1); continue; } var yy = n.y - Math.min(18, n.t * 60); var sc2 = n.big ? 3 : 2; if (typeof n.n === "number" || /^\d+$/.test(n.n)) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(n.x, yy + 5, 11 + (n.big ? 3 : 0), 0, TAU); ctx.fill(); ctx.fillStyle = n.col === "#ff8a80" ? "#c8553d" : "#e8873a"; ctx.beginPath(); ctx.arc(n.x, yy + 5, 9 + (n.big ? 3 : 0), 0, TAU); ctx.fill(); ptext(n.n, n.x + 1, yy + 5 - 2.5 * sc2, "#fdf3de", sc2, "c"); } else ptext(n.n, n.x, yy, n.col, 2, "c"); }
    for (i = b.words.length - 1; i >= 0; i--) { var w = b.words[i]; w.t += dt; if (w.t > 1.1) { b.words.splice(i, 1); continue; } var pop = w.t < 0.12 ? 1 + (0.12 - w.t) * 4 : 1; ptext(w.txt, w.x, w.y - w.t * 10, w.col, Math.round(2 * pop), "c"); }
    if (b.flash > 0) { ctx.fillStyle = (b.flashC || "rgba(255,255,255,") + b.flash + ")"; ctx.fillRect(0, 0, W, H); b.flash = Math.max(0, b.flash - dt * 1.5); }
    b.cheer = Math.max(0, b.cheer - dt);
  }
  function drawAudience(t, dt) {
    var b = B, n = b.aud, i;
    ctx.fillStyle = OUT; ctx.fillRect(0, 216, W, 54);
    ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 218, W, 52);
    for (i = 0; i < n; i++) {
      var row = i % 2, col = Math.floor(i / 2), per = Math.ceil(n / 2), x = 20 + (col + (row ? 0.5 : 0)) * ((W - 40) / Math.max(1, per)), y = 252 + row * 14;
      var name = AUD_SPR[(i * 7 + 3) % AUD_SPR.length], a = S_(name), s = (a.idle || a)[0];
      var jump = b.cheer > 0 ? Math.abs(Math.sin(t * 10 + i)) * 6 * Math.min(1, b.cheer) : Math.abs(Math.sin(t * 2 + i * 1.7)) * 1;
      var sc = s.w > 26 ? 0.6 : 1;
      ctx.globalAlpha = 1;
      ctx.drawImage(i % 3 === 0 ? s.f : s.c, Math.round(x - s.w * sc / 2), Math.round(y - s.h * sc - jump), Math.round(s.w * sc), Math.round(s.h * sc));
    }
    var gr = ctx.createLinearGradient(0, 218, 0, 270); gr.addColorStop(0, "rgba(15,28,20,.25)"); gr.addColorStop(1, "rgba(15,28,20,.6)"); ctx.fillStyle = gr; ctx.fillRect(0, 218, W, 52);
    ptext("PUBLIC " + n, W - 8, 222, "#c9a070", 1, "r");
  }

  /* =====================================================================
     Menu de pause : équipe, insignes, objets, quêtes, options
     ===================================================================== */
  async function pauseMenu() {
    var tab = "team";
    function tabs() { return '<div class="tabs">' + [["team", "Équipe"], ["badges", "Insignes"], ["items", "Objets"], ["quest", "Quêtes"], ["opt", "Options"]].map(function (t) { return '<button class="btn ' + (t[0] === tab ? "" : "ghost") + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '<button class="btn alt" data-act="close" style="margin-left:auto">Reprendre</button></div>'; }
    function body() {
      var h = '<span class="kick">Echoes of Aether · Contes d\'Aelor</span>' + tabs();
      if (tab === "team") {
        h += xpBar() + '<div class="list">';
        S.party.forEach(function (id) { var H2 = HEROES[id]; h += '<div class="li' + (id === leadHero() ? " on" : "") + '">' + iconImg(H2.spr) + '<span class="grow">' + H2.name + " — " + H2.title + " · ♥ " + S.hp[id] + "/" + maxHp(id) + "<small>" + H2.desc + "</small><small>Techniques : " + movesOf(id).map(function (m) { return m.name + (m.pe ? " (" + m.pe + " PE)" : ""); }).join(" · ") + "</small></span></div>"; });
        h += "</div><p class=\"keys\">PE " + S.pe + "/" + maxPe() + " · PI " + piUsed() + "/" + S.pi + " · Écho " + Math.floor(S.echo) + "/" + S.echoMax + " · " + S.gold + " glands d'or</p>";
      } else if (tab === "badges") {
        h += "<p>Points d'insigne : <b>" + piUsed() + " / " + S.pi + " PI</b>. Clique pour équiper ou retirer.</p><div class=\"list\">";
        S.badges.forEach(function (id) { var bd = BADGES[id], on = has(id), can = on || piUsed() + bd.pi <= S.pi; h += '<button class="li' + (on ? " on" : "") + (can ? "" : " off") + '" data-act="badge" data-id="' + id + '">' + iconImg(bd.icon) + '<span class="grow">' + esc(bd.name) + "<small>" + esc(bd.desc) + '</small></span><span class="tag">' + (on ? "équipé · " : "") + bd.pi + " PI</span></button>"; });
        h += "</div>";
      } else if (tab === "items") {
        var ids = Object.keys(ITEMS).filter(function (k) { return S.items[k] > 0; });
        h += ids.length ? '<div class="list">' + ids.map(function (k) { var it = ITEMS[k], usable = it.use === "hero" || it.use === "party"; return '<button class="li' + (usable ? "" : " off") + '" data-act="item" data-id="' + k + '"' + (usable ? "" : " disabled") + ">" + iconImg(it.icon) + '<span class="grow">' + esc(it.name) + " x" + S.items[k] + "<small>" + esc(it.desc) + "</small></span></button>"; }).join("") + "</div>" : "<p>Ta besace est vide.</p>";
      } else if (tab === "quest") {
        var q = QUESTS[S.q];
        h += q ? "<h3>" + esc(q.title) + "</h3><p>" + esc(q.text) + "</p>" + (q.hint ? '<p class="keys">Indice : ' + esc(q.hint) + "</p>" : "") : "<p>Va parler à Aelor, au centre du village.</p>";
        h += "<h3>Terminées</h3><p>" + (QUESTS.slice(1, S.q).map(function (x) { return "✔ " + esc(x.title); }).join("<br>") || "Aucune pour l'instant.") + "</p>";
      } else {
        h += '<div class="list"><button class="li" data-act="sound">' + iconImg("bell") + '<span class="grow">Son : ' + (S.sound ? "activé" : "coupé") + "</span></button>" +
          '<button class="li" data-act="help">' + iconImg("book") + '<span class="grow">Comment jouer</span></button>' +
          '<button class="li" data-act="title">' + iconImg("feather") + '<span class="grow">Retour à l\'écran titre<small>La partie est sauvegardée au dernier cristal d\'écho.</small></span></button></div>';
      }
      return h;
    }
    var el = $("#panel");
    await panel(body(), {
      tab: function (b) { tab = b.dataset.t; el.refresh(body()); },
      badge: function (b) { var id = b.dataset.id, i = S.equip.indexOf(id); if (i >= 0) S.equip.splice(i, 1); else if (piUsed() + BADGES[id].pi <= S.pi) S.equip.push(id); else { SFX.miss(); return; } S.party.forEach(function (h) { S.hp[h] = Math.min(S.hp[h], maxHp(h)); }); S.pe = Math.min(S.pe, maxPe()); el.refresh(body()); hud(); },
      item: function (b) { var id = b.dataset.id, it = ITEMS[id]; if (it.use === "party") { S.pe = Math.min(maxPe(), S.pe + it.pe); } else { var t = S.party.filter(function (h) { return S.hp[h] < maxHp(h); }).sort(function (a, c) { return S.hp[a] / maxHp(a) - S.hp[c] / maxHp(c); })[0]; if (!t) { SFX.miss(); return; } S.hp[t] = Math.min(maxHp(t), S.hp[t] + (it.hp || 10)); } S.items[id]--; SFX.coin(); el.refresh(body()); hud(); },
      sound: function () { S.sound = !S.sound; el.refresh(body()); },
      help: function (b, close) { close("help"); },
      title: function (b, close) { close("title"); },
      close: function () { return "close"; }
    }, { back: "close" }).then(async function (r) {
      save();
      if (r === "help") { await helpPanel(); pauseMenu(); }
      if (r === "title") { mode = "title"; titleScreen(); }
    });
  }
  function helpPanel() {
    return panel('<span class="kick">Comment jouer</span><h2>Sur la carte</h2><p>' + (isTouch ? "Croix pour marcher, <b>A</b> pour agir (parler, ouvrir, frapper), <b>B</b> pour changer de meneur, ☰ pour le menu." : "<b>Flèches / ZQSD</b> pour marcher, <b>Espace</b> pour agir (parler, ouvrir, frapper), <b>C</b> pour changer de meneur, <b>Échap</b> pour le menu.") +
      " Chaque héros a un talent : Augh abat les arbres, Aka lie les cristaux, Gorak brise les rochers. Frappe un monstre avant qu'il te touche : premier coup gratuit !</p>" +
      "<h2>Au combat</h2><p>Chaque attaque a sa commande d'action : appuyer au moment de l'impact, maintenir puis relâcher, marteler, ou recopier des flèches. Réussis-la pour frapper plus fort.</p>" +
      "<p>Quand un ennemi attaque, appuie sur " + (isTouch ? "<b>A</b>" : "<b>Espace</b>") + " juste avant le choc : <b>Garde</b> (−1 dégât). Sur " + (isTouch ? "<b>B</b>" : "<b>X</b>") + " pile au dernier moment : <b>Contre</b> (aucun dégât, et l'ennemi est piqué). N'appuie pas trop tôt : seul le premier appui compte !</p>" +
      "<p>Le public de la forêt adore le spectacle : réussir ses commandes, faire du <b>Panache</b> (" + (isTouch ? "B" : "X") + " quand l'étincelle ✦ apparaît) ou le saluer remplit la jauge d'<b>Écho</b>, qui paie les techniques spéciales.</p>" +
      "<p>Les <b>insignes</b> (menu) changent les règles : plus de dégâts, de défense, de PE… L'insigne <b>Patte douce</b> rend les commandes plus faciles.</p><div class=\"row\"><button class=\"btn\" data-act=\"ok\">Compris !</button></div>", null, { back: "ok" });
  }

  /* =====================================================================
     Écran titre
     ===================================================================== */
  var titleT = 0;
  async function titleScreen() {
    mode = "title"; $("#hud").hidden = true; $("#quest").hidden = true; $("#btn-pause").hidden = true; hint("");
    var sv = load();
    var r = await panel('<span class="kick">Echoes of Aether</span><h1>Contes d\'Aelor</h1><p>Augh, Aka et Gorak reprennent l\'aventure d\'Aelor en RPG au tour par tour, sur la scène de la forêt et devant son public : commandes d\'action, gardes au bon moment, insignes et Bergerie oubliée.</p>' +
      '<div class="row" style="margin-top:10px">' + (sv ? '<button class="btn" data-act="cont">▶ Continuer (niv. ' + sv.lv + ")</button>" : "") + '<button class="btn ' + (sv ? "ghost" : "") + '" data-act="new">Nouvelle partie</button><button class="btn alt" data-act="help">Comment jouer</button></div>' +
      '<p class="keys" style="margin-top:10px">' + (isTouch ? "Joue en paysage, au doigt." : "<kbd>Flèches</kbd> marcher · <kbd>Espace</kbd> agir / valider · <kbd>X</kbd> retour, contre · <kbd>C</kbd> meneur · <kbd>Échap</kbd> menu") + "</p>", null);
    if (r === "help") { await helpPanel(); return titleScreen(); }
    if (r === "new") {
      if (sv) { var c = await panel("<h2>Nouvelle partie ?</h2><p>L'ancienne sauvegarde (niveau " + sv.lv + ") sera effacée.</p><div class=\"row\"><button class=\"btn\" data-act=\"yes\">Oui, recommencer</button><button class=\"btn ghost\" data-act=\"no\">Non</button></div>", null, { back: "no" }); if (c !== "yes") return titleScreen(); }
      var snd = S.sound; S = fresh(); S.sound = snd; save();
    } else S = sv || fresh();
    MAPS = {}; startWorld(r === "new");
  }
  async function startWorld(intro) {
    enterMap(S.map || "world", S.x, S.y);
    mode = "world"; $("#hud").hidden = false; $("#btn-pause").hidden = false; hud(true); curRegion = regionAt(P.x, P.y).name;
    if (intro) {
      await panel('<span class="kick">Bienvenue</span><h2>Comment ça marche</h2><div class="list">' +
        '<div class="li">' + iconImg("sq_bucheron") + '<span class="grow">Se déplacer<small>' + (isTouch ? "Pose le pouce n'importe où à gauche de l'écran et glisse : c'est le joystick." : "Flèches ou ZQSD.") + "</small></span></div>" +
        '<div class="li">' + iconImg("sq_aelor") + '<span class="grow">Agir avec ' + (isTouch ? "le bouton A" : "Espace") + "<small>Parler, ouvrir un coffre, lire un panneau… Une bulle en bas de l'écran dit ce que fera A.</small></span></div>" +
        '<div class="li">' + iconImg("crystal") + '<span class="grow">Suivre la flèche jaune<small>Elle montre toujours où aller. L\'objectif est écrit en haut à droite.</small></span></div>' +
        '<div class="li">' + iconImg("mouton") + '<span class="grow">Combattre<small>Touche un monstre pour lancer un combat. Frappe-le avec A avant qu\'il te touche : premier coup gratuit !</small></span></div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn" data-act="ok">C\'est parti !</button></div>', null, { back: "ok" });
      await say(["Le village d'Aelor, au bord des prairies. Le vent porte des échos étranges depuis la Bergerie oubliée…", "Toi, c'est Augh, le lanceur de haches. Aelor, l'ancien du village, t'attend juste au-dessus : suis la flèche jaune."]);
    }
  }
  function drawTitle(t) {
    ctx.drawImage(backdrop("prairie"), 0, 0);
    var hs = ["sq_bucheron", "sq_mage", "sq_gorak"];
    hs.forEach(function (n, i) { var f = frameOf(n, t + i * 0.4, false); shadowAt(HERO_X[i], STAGE_Y, 26); blit(f.s, HERO_X[i], STAGE_Y, 2); });
    ["mouton", "belier", "mouton_mystique"].forEach(function (n, i) { var a = S_(n); shadowAt(EN_X[i], STAGE_Y, 40); blit(a[Math.floor(t * 3 + i) % a.length], EN_X[i], STAGE_Y - Math.abs(Math.sin(t * 3 + i)) * 4, 2); });
    if (!B) B = null;
    var b0 = { aud: 24, cheer: Math.sin(t) > 0.7 ? 1 : 0 }; var keep = B; B = b0; drawAudience(t, 0); B = keep;
  }

  /* =====================================================================
     Boucle principale
     ===================================================================== */
  var last = now(), saveTick = 0;
  var frameN = 0;
  function frame() { frameN++;
    var t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    stepTime();
    var ts = t / 1000;
    if (mode === "world" || mode === "trans") {
      if (mode === "world") updateWorld(dt);
      if (M) drawWorld(ts);
      saveTick += dt; if (saveTick > 2 && mode === "world") { saveTick = 0; S.x = P.x; S.y = P.y; }
    } else if (mode === "battle" && B) drawBattle(ts, dt);
    else if (mode === "title") drawTitle(ts);
    var F = window.__fade; if (F && F.a > 0) { ctx.fillStyle = "rgba(15,28,20," + F.a + ")"; ctx.fillRect(0, 0, W, H); }
    if (mode === "world" || mode === "battle") {
      hud(); var q = QUESTS[S.q], qe = $("#quest");
      var ob = mode === "world" && M ? objective() : null, step = ob ? '<span class="step">➜ ' + esc(ob.label) + "</span>" : "";
      if (mode === "world" && (S.q === 0 || (q && S.q < 6))) { var txt = "<b>" + (S.q === 0 ? "Bienvenue à Aelor" : esc(q.title)) + "</b>" + step; if (qe.innerHTML !== txt) { qe.innerHTML = txt; qe.className = "box"; } qe.hidden = false; }
      else qe.hidden = true;
      $("#hud").hidden = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  titleScreen();
  window.__EOA = { get S() { return S; }, get B() { return B; }, get mode() { return mode; }, get DEFW() { return DEFW; }, tweens: tweens, waits: waits, get frameN() { return frameN; }, get uiBusy() { return uiBusy; }, P: P, enterMap: enterMap, startBattle: startBattle, press: press };
})();
