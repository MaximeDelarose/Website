/* =========================================================================
   Écureuil Survivor — données du jeu (modifiable à la main)
   Sprites : une lettre = une couleur de la palette, "." = transparent.
   Le contour sombre est ajouté automatiquement.
   « unlock: "<id de succès>" » verrouille un élément jusqu'au succès.
   ========================================================================= */
window.ES_DATA = (function () {
  "use strict";

  /* =====================================================================
     Sprites
     ===================================================================== */
  var SQ_TOP = [
    "....tt..........",
    "..ttttt.........",
    ".tttdtttt..d..d.",
    ".ttd...tt.ooooo.",
    ".ttd....t.ookooo",
    ".ttd......ooooon",
    "..ttd....ooccc..",
    "...ttd..ooocc...",
    "....tddoooocc...",
    ".....doooooc....",
    ".....ddooooo....",
  ];
  var LEGS_A = "......dd..dd....", LEGS_B = ".....dd....dd...";
  var CAP_TOP = [
    "....tt..........",
    "..ttttt.........",
    ".tttdtttt.rrrrr.",
    ".ttd...ttrrwrrrr",
    ".ttd....t.okkooo",
    ".ttd......ooooon",
    "..ttd....ooccc..",
    "...ttd..ooocc...",
    "....tddoooocc...",
    ".....doooooc....",
    ".....ddooooo....",
  ];
  var GLIDE_A = [
    "....tt..........",
    "..ttttt.........",
    ".tttdtttt..d..d.",
    ".ttd...tt.ooooo.",
    ".ttd....t.ookooo",
    ".ttd......ooooon",
    "..ttd....ooccc..",
    "..mmtd..ooocc...",
    ".mmmmddoooocccm.",
    "..mmmdooooocmmm.",
    "....mddooooomm..",
    "......dd..dd....",
  ];
  var GLIDE_B = [
    "....tt..........",
    "..ttttt.........",
    ".tttdtttt..d..d.",
    ".ttd...tt.ooooo.",
    ".ttd....t.ookooo",
    ".ttd......ooooon",
    "..ttd....ooccc..",
    "...ttd..ooocc...",
    "..mmtddoooocc...",
    ".mmmmdoooooccmm.",
    "..mmmddooooommm.",
    "......dd..dd....",
  ];
  var KNIGHT_TOP = ["....tt..........", "..ttttt...hhh...", ".tttdtttt.hHHhh.", ".ttd...tthHHHHhh", ".ttd....thhkkkkh", ".ttd......hhhhhn", "..ttd....ooccc..", "...ttd..SSScc...", "....tddSYYSc....", ".....doSSSSc....", ".....ddoSSoo...."];
  var WIZ_TOP = ["....tt.....p....", "..ttttt...ppp...", ".tttdtttt.pyp.d.", ".ttd...ttppppppp", ".ttd....t.ookooo", ".ttd......ooooon", "..ttd....ooccc..", "...ttd..ooocc.w.", "....tddoooocc.w.", ".....doooooc..w.", ".....ddooooo..w."];
  var LUMB_TOP = ["....tt..........", "..ttttt...rRrR..", ".tttdtttt.RrRrR.", ".ttd...ttrrrrrrr", ".ttd....t.ookooo", ".ttd......ooooon", "..ttd....ooccc..", "...ttd..ooocc.aa", "....tddoooocchaa", ".....doooooc.h..", ".....ddooooo.h.."];
  var NIN_TOP = ["....tt..........", "..ttttt.........", ".tttdtttt..d..d.", ".ttd..rrrrrrrrr.", ".ttdrr..t.kkwkko", ".ttd......ooooon", "..ttd....ooccc..", "...ttd..ooocc...", "....tddoooocc...", ".....doooooc....", ".....ddooooo...."];
  var DRU_TOP = ["....tt..........", "..ttttt...f.y.f.", ".tttdtttt.lflfl.", ".ttd...tt.ooooo.", ".ttd....t.ookooo", ".ttd......ooooon", "..ttd..llooccc..", "...ttdllloocc...", "....tlllooocc...", ".....llooooc....", ".....ddooooo...."];
  var PIP_TOP = ["....tt..........", "..ttttt.........", ".tttdtttt..d..d.", ".ttd...tt.ooooo.", ".ttd....t.ookooo", ".ttd......ooooon", "..ttd...sSssss..", "...ttd..soocc...", "....tddoooocc...", ".....doooooc....", ".....ddooooo...."];
  var POP_TOP = ["....tt..........", "..ttttt....bBb..", ".tttdtttt..dbd..", ".ttd...tt.ooooo.", ".ttd....t.ookooo", ".ttd......ooooon", "..ttd....ooccc..", "...ttd..ooocc...", "....tddoooocc...", ".....doooooc....", ".....ddooooo...."];
  function squirrel(pal) { return { pal: pal, frames: [SQ_TOP.concat([LEGS_A]), SQ_TOP.concat([LEGS_B])] }; }

  var FOX_TOP = [
    "............o..o.", "...........ooooo.", "...........ookoo.", "...........ooocck", "ww.........occc..",
    "wwo......oooo....", ".ooo...ooooooo...", "..oooooooooooo...", "...ooooooccooo...", ".....oooooooo....",
  ];
  var HOG_TOP = [
    "....s.s.s.......", "..sSsSsSsS......", ".sSsSsSsSsSs....", "sSsSsSsSsSsSf...",
    "sSsSsSsSsSsfkf..", "sSsSsSsSsSfffffn", ".sSsSsSsSffff...", "..ffffffffff....",
  ];
  var BUN_TOP = [
    "..........gg.gg.", "..........gp.gp.", "..........gp.gp.", "..........gggggg", "..........ggkggg",
    "..........gggggp", "..w....gggggg...", ".www.ggggggggg..", "..wgggggggGGg...", "...ggggggGGgg...",
  ];
  var BAD_TOP = [
    "..........kwk....", ".........kwkwkk..", "..ggggggkwkwkwk..", ".gGGGGGGkkwkwkwkn",
    "gGGGGGGGGkkwwwwk.", "gGGGGGGGGGkkkk...", ".gGGGGGGGGGGgg...", "..gggggggggggg...",
  ];

  /* ---------------------------------------------------------------------
     Style A (graphismes 2.3) : écureuils en 3 tons, marche en 4 images,
     respiration au repos et pose de Volte. Les tenues (chapeaux, foulards…)
     sont reprises des anciens sprites et posées sur le nouveau corps.
     --------------------------------------------------------------------- */
  var A_TOP = [
    "....su..........",
    "..sstuu.........",
    ".sttvvtu...d..d.",
    ".stv..tuu.ohhho.",
    ".stv...uu.ohwooo",
    ".stv.....oookoon",
    ".stuv....ooccc..",
    "..stuv..Ooocc...",
    "...stuvOOoocc...",
    "....suvOOooc....",
    ".....vOOoooo....",
  ];
  var A_LEGS = ["......vv..vv....", ".....vv....vv...", "......vv..vv....", ".......vvvv....."];
  var A_FUR = "tdockn", A_EXTRA = "123456789+*=%&$#@";
  function hx(c) { c = c.replace("#", ""); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function mixc(a, b, t) { var A = hx(a), B = hx(b); return "#" + [0, 1, 2].map(function (i) { var v = Math.round(A[i] + (B[i] - A[i]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function shRows(rows, idx, dx) {
    return rows.map(function (r, i) {
      if (idx.indexOf(i) < 0 || !dx) return r;
      return dx > 0 ? (".".repeat(dx) + r).slice(0, r.length) : (r + ".".repeat(-dx)).slice(-dx);
    });
  }
  function shearRows(rows, k) {
    var n = rows.length;
    return rows.map(function (r, i) { var d = Math.round((n - 1 - i) * k); return d ? ".".repeat(d) + r : r; });
  }
  // top : variante de SQ_TOP (11 lignes) ; renvoie les lignes du corps A + la palette complète
  function aBody(top, pal) {
    var P = {
      s: mixc(pal.t, "#ffffff", 0.35), t: pal.t, u: mixc(pal.t, pal.d, 0.45), v: mixc(pal.d, "#000000", 0.12),
      o: pal.o, O: pal.d, h: mixc(mixc(pal.o, pal.t, 0.5), "#ffffff", 0.14), c: pal.c, k: pal.k, w: "#ffffff", n: pal.n, d: pal.d
    };
    var map = {}, ni = 0;
    Object.keys(pal).forEach(function (ch) { if (A_FUR.indexOf(ch) < 0) { var nc = A_EXTRA[ni++]; map[ch] = nc; P[nc] = pal[ch]; } });
    var rows = A_TOP.map(function (r) { return r.split(""); });
    for (var y = 0; y < 11; y++) for (var x = 0; x < 16; x++) {
      var b = SQ_TOP[y][x], v = (top[y] || "")[x] || ".";
      if (v === b) continue;
      rows[y][x] = v === "." ? "." : A_FUR.indexOf(v) >= 0 ? v : map[v];
    }
    // œil couvert (bandeau, visière, masque) : on retire l'œil A de la ligne du dessous
    if (top[4][12] !== "k" && top[5][12] === SQ_TOP[5][12] && rows[5][12] === "k") rows[5][12] = "o";
    return { rows: rows.map(function (r) { return r.join(""); }), pal: P, map: map };
  }
  function squirrelA(pal, top) {
    var B = aBody(top || SQ_TOP, pal), T = B.rows;
    return {
      pal: B.pal,
      frames: [T.concat([A_LEGS[0]]), shRows(T, [0, 1, 2], 1).concat([A_LEGS[1]]), T.concat([A_LEGS[2]]), shRows(T, [0, 1, 2], -1).concat([A_LEGS[3]])],
      bob: [0, 1, 0, 1],
      idle: [T.concat([A_LEGS[0]]), ["................"].concat(shRows(T.slice(0, 9), [0, 1], 1), T.slice(10), [A_LEGS[0]])],
      volte: shearRows(shRows(T, [0, 1], -1), 0.22).concat(["...vvv....vvv..."])
    };
  }
  // planeur : deux images de vol, même corps A, membrane conservée
  function glideA(pal, frames) {
    var out = null;
    var fr = frames.map(function (F) {
      var B = aBody(F.slice(0, 11), pal), last = F[11].split("").map(function (ch) { return ch === "." ? "." : A_FUR.indexOf(ch) >= 0 ? (ch === "d" ? "v" : ch) : B.map[ch]; }).join("");
      out = B; return B.rows.concat([last]);
    });
    return { pal: out.pal, frames: fr, flying: true, volte: shearRows(fr[0].slice(0, 11), 0.22).concat([fr[0][11]]) };
  }

  var SPRITES = {
    /* --- écureuils jouables --- */
    sq_pip: squirrelA({ t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430", s: "#3a7ad8", S: "#8ac0ff" }, PIP_TOP),
    sq_pop: squirrelA({ t: "#f6c27a", d: "#c0703a", o: "#f0a060", c: "#fdf3de", k: "#2b1709", n: "#6b4430", b: "#e84a8a", B: "#ffb0d0" }, POP_TOP),
    sq_chevalier: squirrelA({ t: "#e0c49a", d: "#8a6a48", o: "#c49a6a", c: "#fdf3de", k: "#1b1226", n: "#5a4030", h: "#8a929a", H: "#c0c8d0", S: "#3a5aa8", Y: "#f6d36b" }, KNIGHT_TOP),
    sq_mage: squirrelA({ t: "#b0a0c8", d: "#5a4a78", o: "#8a7aa8", c: "#efe6ff", k: "#1b1226", n: "#3a2a58", p: "#4a3a9a", y: "#f6d36b", w: "#8a5a3b" }, WIZ_TOP),
    sq_bucheron: squirrelA({ t: "#d88a4a", d: "#8a4a20", o: "#c06a30", c: "#fdf3de", k: "#2b1709", n: "#5a3018", r: "#c8282a", R: "#2b1709", a: "#c0c8d0", h: "#8a5a3b" }, LUMB_TOP),
    sq_ninja: squirrelA({ t: "#4a4a5a", d: "#1e1b26", o: "#38384a", c: "#6a6a7a", k: "#1e1b26", w: "#fdf3de", n: "#1e1b26", r: "#d0281a" }, NIN_TOP),
    sq_druide: squirrelA({ t: "#c8a070", d: "#6b4a28", o: "#a07848", c: "#f3e1c0", k: "#2b1709", n: "#4a3018", l: "#4f8a40", f: "#f29ad8", y: "#f6d36b" }, DRU_TOP),
    lienicon: { pal: { y: "#6ad8ff", w: "#e8fbff" }, frames: [["......y.", ".....yy.", "....yw..", "...yyyy.", "..ywyy..", "...yy...", "..yy....", ".y......"]] },
    ronde: { pal: { c: "#f2b05e", k: "#6ad8ff" }, frames: [["...cc...", ".c....c.", "c..kk..c", "c.kkkk.c", "c.kkkk.c", "c..kk..c", ".c....c.", "...cc..."]] },
    paws2: { pal: { k: "#8a5a3b" }, frames: [[".k.k....", "kkkkk.k.", ".kkk.kkk", "......k.", "..k.k...", ".kkkkk..", "..kkk..."]] },
    hand: { pal: { r: "#e0283a", R: "#ff9aa0" }, frames: [[".rr.rr.", "rRrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."]] },
    needle: { pal: { w: "#e8f0d0", g: "#5a8a3a" }, frames: [["......w", ".....wg", "....wg.", "...wg..", "..wg...", ".wg....", "g......"]] },
    shieldorb: { pal: { m: "#5a5a6a", W: "#c0c8d0", y: "#f6d36b" }, frames: [["..mmmm..", ".mWWWWm.", "mWWyyWWm", "mWyyyyWm", "mWWyyWWm", ".mWWWWm.", "..mmmm.."]] },
    axe: { pal: { a: "#8a929a", A: "#d8dee2", h: "#8a5a3b" }, frames: [["aaa.....", "aAAa....", "aAAAh...", ".aah.h..", "....h...", ".....h..", "......h.", "........"], [".....aaa", "....aAAa", "....aAAa", "....hAa.", "...h.h..", "..h.h...", ".h......", "........"]] },
    shuriken: { pal: { s: "#c0c8d0", S: "#8a929a", k: "#2b1709" }, frames: [["...s...", "...s...", "..sSs..", "sssksss", "..sSs..", "...s...", "...s..."], ["s.....s", ".s...s.", "..sSs..", "..SkS..", "..sSs..", ".s...s.", "s.....s"]] },
    orb: { pal: { p: "#6a4aa8", P: "#a87ae8", w: "#f0e0ff" }, frames: [["..ppp..", ".pPPPp.", "pPwPPPp", "pPPPPPp", "pPPPPPp", ".pPPPp.", "..ppp.."]] },
    thorn: { pal: { g: "#6a9a3a", G: "#3a5a2a" }, frames: [["...g....", "..gG..g.", ".g.Gg.G.", "g..GgG..", ".GgGG...", "..GGg.g.", ".g.Gg...", "...G...."]] },
    fang: { pal: { w: "#f3efe6", k: "#8a806c" }, frames: [["..ww..", ".wwww.", ".wwww.", "..ww..", "..wk..", "...w.."]] },
    tailpuff: { pal: { o: "#b85e2a", O: "#f2b05e" }, frames: [["..oo..", ".oOOo.", "oOOOOo", "oOOOo.", ".oOo..", "..o..."]] },
    sack: { pal: { b: "#8a5a3b", B: "#c9a070", y: "#f6d36b", k: "#6b4430" }, frames: [["..kk..", ".bkkb.", "bBBBBb", "bByBBb", "bBBBBb", ".bbbb."]] },
    sq_noisette: squirrelA({ t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" }),
    sq_cendrine: squirrelA({ t: "#d6d1ca", d: "#6f6a64", o: "#9a958e", c: "#f3efe6", k: "#2b1709", n: "#4a4540" }),
    sq_charbon: squirrelA({ t: "#57506a", d: "#1e1b26", o: "#38334a", c: "#8a8496", k: "#f6d36b", n: "#1e1b26" }),
    sq_flocon: squirrelA({ t: "#ffffff", d: "#b8c8d8", o: "#e8eef5", c: "#ffffff", k: "#c8553d", n: "#f29a85" }),
    sq_planeur: glideA({ t: "#c9ae88", d: "#6b5a48", o: "#a08868", c: "#f3e1c0", k: "#2b1709", n: "#4a3a2a", m: "#8a7660" }, [GLIDE_A, GLIDE_B]),
    sq_capitaine: squirrelA({ t: "#f2b05e", d: "#b85e2a", o: "#e06a2c", c: "#fdf3de", k: "#2b1709", n: "#6b4430", r: "#c8553d", w: "#fdf3de" }, CAP_TOP),

    /* --- ennemis --- */
    slug: { pal: { g: "#d9cf63", h: "#a39a3c", k: "#1f3a2b", e: "#1f3a2b" }, frames: [
      [".k...k......", ".h...h......", "..h.h.......", ".gggg.......", "gegggg......", "gggggggggg..", ".ggggggggggg", "..hhhhhhhhh."],
      ["..k...k.....", "..h...h.....", "...h.h......", ".gggg.......", "gegggg......", "ggggggggg...", ".gggggggggg.", "..hhhhhhhh.."]] },
    beetle: { pal: { b: "#6a4c93", B: "#a88ad8", k: "#1b1226" }, frames: [
      ["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", ".bBbbbbBb.", "kbbbbbbbbk", ".bbBbbBbb.", "kbbbbbbbbk", "..bbbbbb..", "...b..b..."],
      ["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", "kbBbbbbBbk", ".bbbbbbbb.", "kbbBbbBbbk", ".bbbbbbbb.", "..bbbbbb..", "..b....b.."]] },
    wasp: { pal: { y: "#f2c230", k: "#2b1709", w: "#e6f6fa", s: "#2b1709" }, frames: [
      ["..ww.ww...", "..ww.ww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."],
      [".........", ".wwwwww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."]], flying: true },
    spider: { pal: { l: "#9a7aa8", p: "#5a3a62", P: "#7a5288", r: "#e8735a" }, frames: [
      ["l.......l", ".l.....l.", "..lpppl..", "llpPpPpll", "..pprpp..", "llpppppll", "..lpppl..", ".l.....l.", "l.......l"],
      [".l.....l.", "l.......l", "..lpppl..", ".lpPpPpl.", "l.pprpp.l", ".lpppppl.", "l.lpppl.l", "..l...l..", "........."]] },
    crow: { pal: { k: "#24243a", g: "#4a4a6a", o: "#e8873a", e: "#fdf3de" }, frames: [
      ["......kkk...", ".....kkekk..", "kk..kkkkkoo.", "kkkkkgggkk..", ".kkgggggkk..", "..kkkkkkk...", "....o..o...."],
      ["kk....kkk...", ".kk..kkekk..", "..kkkkkkkoo.", "...kgggkkk..", "...kgggkk...", "..kkkkkkk...", "....o..o...."]], flying: true },
    toad: { pal: { G: "#6f8a34", g: "#9cae4f", y: "#e9d68a", k: "#1f2a14", e: "#f2c230" }, frames: [
      ["...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGGGGGGGGGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", ".GyyyyyyyyyyG.", "GG.GG....GG.GG"],
      ["..............", "...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", "GGyyyyyyyyyyGG", ".GG.GG..GG.GG."]] },
    fox: { pal: { o: "#e06a2c", c: "#fdf3de", w: "#fdf3de", k: "#2b1709" },
           frames: [FOX_TOP.concat([".....kk....kk...."]), FOX_TOP.concat(["....kk......kk..."])] },
    hedgehog: { pal: { s: "#6b4430", S: "#a06a3e", f: "#f0d2a8", k: "#2b1709", n: "#2b1709" },
                frames: [HOG_TOP.concat(["...kk....kk....."]), HOG_TOP.concat(["..kk......kk...."])] },
    bunny: { pal: { g: "#d8c2a0", G: "#b89c78", p: "#f29a85", w: "#fdf3de", k: "#2b1709" },
             frames: [BUN_TOP.concat(["....kk.....kk..."]), BUN_TOP.concat(["...kk.......kk.."])] },
    badger: { pal: { g: "#8d8a86", G: "#6b6966", k: "#24221f", w: "#f3efe6", n: "#2b1709" },
              frames: [BAD_TOP.concat(["..kk..kk..kk.kk.."]), BAD_TOP.concat([".kk..kk....kk.kk."])] },
    moth: { pal: { w: "#c9b3ff", W: "#e9dcff", e: "#7a5ab8", b: "#6b4430", k: "#2b1709" }, flying: true, frames: [
      [".....k....k.....", "......k..k......", "..ww...bb...ww..", ".wWWw..bb..wWWw.", "wWeWWw.bb.wWWeWw", "wWWWWWwbbwWWWWWw", ".wWWWWwbbwWWWWw.", "..wWWw.bb.wWWw..", "...ww..bb..ww..."],
      [".....k....k.....", "......k..k......", ".......bb.......", "....ww.bb.ww....", "...wWWwbbwWWw...", "...wWeWbbWeWw...", "...wWWwbbwWWw...", "....ww.bb.ww....", ".......bb......."]] },
    boar: { pal: { b: "#6b4430", B: "#8f6243", k: "#2b1709", w: "#fdf3de", p: "#c8553d", e: "#f2c230" }, frames: [
      ["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "..bb.bb....bb.bb....", "..kk.kk....kk.kk...."],
      ["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "...bb.bb..bb.bb.....", "...kk.kk..kk.kk....."]] },
    owl: { pal: { b: "#7a6a8a", B: "#a597b8", w: "#fdf3de", y: "#f2c230", k: "#1b1226", o: "#e8873a" }, frames: [
      ["..k........k..", "..bb......bb..", "..bbbbbbbbbb..", ".bwwwbbbbwwwb.", ".bwykwbbwykwb.", ".bwwwbo.bwwwb.", "bbbbbbobbbbbbb", "bBbBbBbBbBbBbb", "bbBbBbBbBbBbBb", ".bBbBbBbBbBbb.", "..bbbbbbbbbb..", "...oo....oo..."],
      ["..k........k..", "..bb......bb..", "..bbbbbbbbbb..", ".bwwwbbbbwwwb.", ".bwkywbbwkywb.", ".bwwwbo.bwwwb.", "bbbbbbobbbbbbb", "bBbBbBbBbBbBbb", "bbBbBbBbBbBbBb", ".bBbBbBbBbBbb.", "..bbbbbbbbbb..", "...oo....oo..."]] },

    /* --- objets destructibles --- */
    stump: { pal: { b: "#6b4430", B: "#8a5a3b", c: "#d39a52", C: "#b07a4f" }, frames: [[".bbbbbbbb.", "bCcCcCcCcb", "bcCCCCCCcb", "bBBBBBBBBb", "bBbBBbBBBb", "bBBBbBBbBb", "BBbBBBBBbB"]] },
    basket: { pal: { y: "#c9b070", Y: "#8a7848" }, frames: [[".yyyyyyy.", "yYyYyYyYy", "yyyyyyyyy", "YyYyYyYyY", "yyyyyyyyy", ".yYyYyYy."]] },
    leafpile: { pal: { o: "#e8873a", r: "#c8553d", y: "#f6d36b", b: "#8a5a3b" }, frames: [["...oro....", "..orroyor.", ".oyorroryo", "rooyoorrob", "bbrobbyorb"]] },
    lantern: { pal: { c: "#3f8f8a", C: "#7fd1c7", y: "#e6fff8", s: "#f3e1c0" }, frames: [["..cccc..", ".cCyyCc.", "cCyyyyCc", "cccccccc", "...ss...", "...ss...", "..ssss.."]] },

    /* --- butin --- */
    nut: { pal: { c: "#6b4430", n: "#a06a3e", N: "#c98d4a" }, frames: [[".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."]] },
    bignut: { pal: { c: "#4a6f8a", n: "#5fa3c9", N: "#a8e0f5" }, frames: [[".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."]] },
    gold: { pal: { c: "#a8741a", n: "#e0a82a", N: "#ffe27a" }, frames: [[".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."]] },
    berry: { pal: { r: "#c8553d", R: "#f29a85", g: "#5b8a4a" }, frames: [["..g..", ".rgr.", "rRrrr", "rrrrr", ".rrr."]] },
    chest: { pal: { b: "#6b4430", B: "#a06a3e", k: "#3a2618", y: "#f2c230" }, frames: [["..bbbbbb..", ".bBBBBBBb.", "bBBBBBBBBb", "kkkkyykkkk", "bBBByyBBBb", "bBBBBBBBBb", "bbbbbbbbbb"]] },
    relic: { pal: { k: "#4a2a6a", p: "#9a6ad8", P: "#d6b8ff", y: "#f6d36b" }, frames: [["...yy...", "..y..y..", "..kppk..", ".kpPPpk.", "kpPPPPpk", ".kpPPpk.", "..kppk..", "...kk..."]] },
    chestopen: { pal: { b: "#6b4430", B: "#a06a3e", k: "#3a2618", y: "#f2c230", Y: "#fff3b0" }, frames: [[".bbbbbbbb.", "bBBBBBBBBb", "kkkkkkkkkk", "..........", "kYYYYYYYYk", "byYYYYYYyb", "bBBByyBBBb", "bBBBBBBBBb", "bbbbbbbbbb"]] },
    // ---- nouveaux ennemis
    salamander: { pal: { r: "#d8572a", R: "#f29a3d", k: "#2b1709", y: "#f6d36b" }, frames: [
      ["...........rr.", "....rrrrr.rrkr", "..rrRyRRyRrrrr", "rrrRRRRRRRrrr.", "r..rrrrrrrr...", "...r.r...r.r..", "..k..k...k..k."],
      ["...........rr.", "....rrrrr.rrkr", "..rrRyRRyRrrrr", "rrrRRRRRRRrrr.", ".r.rrrrrrrr...", "....r.r.r.r...", "...k.k.k.k...."]] },
    weaver: { pal: { p: "#3a2a4a", P: "#6a4a8a", w: "#e8e0f0", r: "#d0281a" }, frames: [
      ["..p......p..", "...p....p...", "p..pPPPPp..p", ".ppPrPPrPpp.", "..pPPPPPPp..", "ppPPwwwwPPpp", "..pPPPPPPp..", ".p..pppp..p."],
      [".p........p.", "..p......p..", "...pPPPPp...", "pppPrPPrPppp", "..pPPPPPPp..", ".pPPwwwwPPp.", "p.pPPPPPPp.p", "....pppp...."]] },
    // ---- compagnons : familiers, tourelles, drones, montures
    pethog: { pal: { s: "#6b4430", S: "#a06a3e", f: "#f0d2a8", k: "#2b1709", g: "#5ac85a" }, frames: [
      ["..ssss....", ".sSsSss...", "sSsSsSsff.", "sssssssfkf", "gggssssfff", ".ssssssff.", ".k..k..k.."],
      ["..ssss....", ".sSsSss...", "sSsSsSsff.", "sssssssfkf", "gggssssfff", ".ssssssff.", "..k..k..k."]] },
    pethog2: { pal: { s: "#3a2a5a", S: "#8a6ad8", f: "#f0d2a8", k: "#1b1226", g: "#f6d36b" }, frames: [
      ["..ssss....", ".sSsSss...", "sSsSsSsff.", "sssssssfkf", "gggssssfff", ".ssssssff.", ".k..k..k.."],
      ["..ssss....", ".sSsSss...", "sSsSsSsff.", "sssssssfkf", "gggssssfff", ".ssssssff.", "..k..k..k."]] },
    petowl: { flying: true, pal: { b: "#8a7a5a", B: "#c8b48a", w: "#fdf3de", k: "#1b1226", o: "#e8873a" }, frames: [
      [".k....k.", ".bbbbbb.", "bwkbbkwb", "bbboobbb", "bBbBbBbb", ".bbbbbb.", "..o..o.."],
      ["bk....kb", "bbbbbbbb", "bwkbbkwb", "bbboobbb", "bBbBbBbb", "..bbbb..", "..o..o.."]] },
    petowl2: { flying: true, pal: { b: "#4a4a6a", B: "#c8c0e8", w: "#fdf3de", k: "#1b1226", o: "#f6d36b" }, frames: [
      ["..k......k..", "..bbbbbbbb..", ".bbbbbbbbbb.", "bwwkbbbbkwwb", "bwwwbooBwwwb", "bbbbbbobbbbb", "bBbBbBbBbBbb", ".bBbBbBbBbb.", "..bbbbbbbb..", "...oo..oo..."],
      ["bk........kb", "bbbbbbbbbbbb", ".bbbbbbbbbb.", "bwwkbbbbkwwb", "bwwwbooBwwwb", "bbbbbbobbbbb", "bBbBbBbBbBbb", ".bBbBbBbBbb.", "...bbbbbb...", "...oo..oo..."]] },
    turret: { pal: { a: "#8a8278", A: "#c8c0b0", g: "#2b1709", b: "#8a5a3b", B: "#c08a52", k: "#2b1709" }, frames: [
      ["...kkkk...", "..kaaaakkk", "..kaAAaagk", "..kaaaakkk", "...kkkk...", ".kbbbbbbk.", ".kbBbbBbk.", "kbbbbbbbbk", "kkkkkkkkkk"]] },
    turret2: { pal: { a: "#c8553d", A: "#ff9a6a", g: "#2b1709", b: "#5a5a6a", B: "#9a9aaa", k: "#1a120c" }, frames: [
      ["..kkkkkk..", ".kaaaaaakk", ".kaAAAaagk", ".kaaaaaakk", "..kkkkkk..", ".kbbbbbbk.", "kbBbbbbBbk", "kbbbbbbbbk", "kkkkkkkkkk"]] },
    drone: { flying: true, pal: { k: "#2b1709", c: "#3a6aa8", C: "#6ad8ff", y: "#f6e06b", w: "#d8e8ff" }, frames: [
      ["ww....ww", ".wkkkkw.", ".kcCCck.", "..kyyk..", "...yy..."],
      ["........", "wwkkkkww", ".kcCCck.", "..kyyk..", "...yy..."]] },
    drone2: { flying: true, pal: { k: "#1b1226", c: "#8a2ab0", C: "#ff7af0", y: "#ffd84a", w: "#ffd8f8" }, frames: [
      ["ww....ww", ".wkkkkw.", ".kcCCck.", "..kyyk..", "...yy..."],
      ["........", "wwkkkkww", ".kcCCck.", "..kyyk..", "...yy..."]] },
    spark: { pal: { y: "#fff8c0", c: "#6ad8ff" }, frames: [[".c.", "cyc", ".c."]] },
    mount_scarab: { pal: { k: "#1b1226", b: "#3a6a4a", B: "#6ad89a", e: "#f6d36b" }, frames: [
      ["..kkkkkkkk....", ".kbBBbbBBbk...", "kbBbbbbbbBbkkk", "kbbbbbbbbbbkek", ".kbbbbbbbbkkkk", "..k.k..k.k...."],
      ["..kkkkkkkk....", ".kbBBbbBBbk...", "kbBbbbbbbBbkkk", "kbbbbbbbbbbkek", ".kbbbbbbbbkkkk", ".k.k..k.k....."]] },
    mount_hare: { pal: { k: "#2b1709", g: "#c8a878", G: "#e8d4b0", w: "#fdf3de" }, frames: [
      ["..........kk..", ".........kgk..", "..ggggggggggk.", ".gGGGgggggggwk", "gggggggggggkkk", ".gg......gg..."],
      ["..........kk..", ".........kgk..", "..ggggggggggk.", ".gGGGgggggggwk", "gggggggggggkkk", "gg........gg.."]] },
    mount_boar: { pal: { k: "#2b1709", b: "#6b4430", B: "#a06a3e", w: "#fdf3de", p: "#c8553d" }, frames: [
      ["...kkkkkkkk.....", "..kbbbbbbbbkk...", ".kbBBbbbbbbbbkk.", "kbBBBbbbbbbbbwpk", "kbbbbbbbbbbbbbpk", ".kbbbbbbbbbbbkk.", "..kk.kk..kk.kk.."],
      ["...kkkkkkkk.....", "..kbbbbbbbbkk...", ".kbBBbbbbbbbbkk.", "kbBBBbbbbbbbbwpk", "kbbbbbbbbbbbbbpk", ".kbbbbbbbbbbbkk.", ".kk.kk....kk.kk."]] },
    // ---- 2.0
    katana: { pal: { s: "#d8e0e8", S: "#ffffff", h: "#2b1709", r: "#c8553d", g: "#f6d36b" }, frames: [
      [".......S", "......Ss", ".....Ss.", "....Ss..", "..gSs...", "..rg....", ".rh.....", "hh......"]] },
    matelot: { pal: { b: "#a06a3e", B: "#d39a52", w: "#fdf3de", k: "#2b1709", r: "#c8553d" }, frames: [
      [".rrr...", "rrrrr.b", ".bwkb.b", ".bbbbbb", "..bBbb.", ".bbbbb.", ".k...k."],
      [".rrr...", "rrrrr.b", ".bwkb.b", ".bbbbbb", "..bBbb.", ".bbbbb.", "..k.k.."]] },
    luciole: { flying: true, pal: { k: "#2b1709", y: "#f6e06b", Y: "#fff8c0", w: "#d8e8ff" }, frames: [
      [".w....w.", "ww.kk.ww", ".wkkkkw.", "..kyyk..", "..yYYy..", "...yy..."],
      ["........", "...kk...", "wwkkkkww", ".wkyykw.", "..yYYy..", "...yy..."]] },
    puffball: { pal: { b: "#c9b88a", B: "#e8dcb4", g: "#7a8a4a", k: "#3a2a1a" }, frames: [
      ["...BBBB...", "..BBbBBB..", ".BBbBBbBB.", ".BbBBBBbB.", "BBBBkBkBBB", ".BBBBBBBB.", "..gggggg..", ".g.g..g.g."],
      ["..BBBBBB..", ".BBbBBBBB.", "BBbBBBbBBB", "BbBBBBBBbB", "BBBBkBkBBB", ".BBBBBBBB.", "..gggggg..", ".g.g..g.g."]] },
    turtle: { pal: { g: "#4a7a3a", G: "#6a9a4a", s: "#7a5a3a", S: "#a07a4a", k: "#1b1226" }, frames: [
      ["....SSSSS.....", "..SSsSSSsSS...", ".SsSSsSsSSsS..", ".SSSSSSSSSSSgg", "gssssssssssgkG", ".gg.gg..gg.gg."],
      ["....SSSSS.....", "..SSsSSSsSS...", ".SsSSsSsSSsS..", ".SSSSSSSSSSSgg", "gssssssssssgkG", "..gg.gg.gg.gg."]] },
    turtleshell: { pal: { s: "#7a5a3a", S: "#a07a4a", w: "#fdf3de" }, frames: [
      ["....SSSSS.....", "..SSsSSSsSS...", ".SsSSsSsSSsS..", ".SSSSwSSSSSS..", ".ssssssssssss.", ".............."]] },
    snake: { pal: { g: "#5a8a3a", G: "#8aba5a", k: "#1b1226", r: "#d0281a" }, frames: [
      ["..........GG..", "..gg.....gGkG.", ".gGGg...gGGGr.", "gG..Gg.gG.....", "g....gGg......", ".............."],
      ["..........GG..", ".........gGkG.", "..gg....gGGGr.", ".gGGg..gG.....", "gG..GgGg......", "g............."]] },
    bat: { flying: true, pal: { b: "#3a2a3a", B: "#5a4a5a", r: "#d0281a", w: "#fdf3de" }, frames: [
      ["b..........b", "bb..b..b..bb", "bBb.bbbb.bBb", ".bBbBrrBbBb.", "..bbbbbbbb..", "....w..w...."],
      ["............", "....b..b....", "..b.bbbb.b..", ".bBbBrrBbBb.", "bBBbbbbbbBBb", "b...w..w...b"]] },
    rat: { pal: { g: "#7a7068", G: "#a09890", p: "#e8a0a0", k: "#1b1226" }, frames: [
      ["......gg..", "..gggggGkg", "pgGGGGGggp", ".g.g..g.g."],
      ["......gg..", "..gggggGkg", "pgGGGGGggp", "..g.gg.g.."]] },
    // ---- nouveaux boss
    queen: { flying: true, pal: { y: "#f2c230", Y: "#f6e06b", k: "#2b1709", w: "#e8f0ff", W: "#b8d0e8", r: "#d0281a", c: "#f6d36b" }, frames: [
      [".....c.c.c......", ".....ccccc......", ".ww..kyyyk...ww.", "wWWw.yrkry..wWWw", "wWWWwkyyykwwWWWw", ".wWWWkkyykkWWWw.", "..wwyyyyyyyyww..", "....kkkkkkkk....", "....yyyyyyyy....", "....kkkkkkkk....", ".....yyyyyy.....", "......kkkk......", ".......kk.......", "........k......."],
      [".....c.c.c......", ".....ccccc......", ".....kyyyk......", "..ww.yrkry.ww...", ".wWWwkyyykwWWw..", "wWWWWkkyykkWWWWw", "wWWwyyyyyyyywWWw", ".ww.kkkkkkkk.ww.", "....yyyyyyyy....", "....kkkkkkkk....", ".....yyyyyy.....", "......kkkk......", ".......kk.......", "........k......."]] },
    stag: { pal: { b: "#7a4a2a", B: "#a06a3e", a: "#e8d8b0", A: "#c9b88a", k: "#2b1709", w: "#fdf3de" }, frames: [
      ["..a..a.....a..a..", "..aa.a.....a.aa..", "...aaa.....aaa...", "....aA.....Aa....", ".....aa...aa.....", "......bbbbb......", ".....bBkBkBb.....", ".....bBBBBBb.....", "......bBwBb......", ".......bbbbbbbbb.", "......bbBBBBBBBbb", "......bBBBBBBBBbb", "......bbbbbbbbbb.", "......b.b....b.b.", "......k.k....k.k."],
      ["..a..a.....a..a..", "..aa.a.....a.aa..", "...aaa.....aaa...", "....aA.....Aa....", ".....aa...aa.....", "......bbbbb......", ".....bBkBkBb.....", ".....bBBBBBb.....", "......bBwBb......", ".......bbbbbbbbb.", "......bbBBBBBBBbb", "......bBBBBBBBBbb", "......bbbbbbbbbb.", ".......b.b..b.b..", ".......k.k..k.k.."]] },
    mushking: { pal: { r: "#c8553d", R: "#e8735a", w: "#fdf3de", s: "#e8dcb4", S: "#c9b88a", k: "#2b1709", y: "#f6d36b" }, frames: [
      ["......y.y.y.......", "......yyyyy.......", "....rrrrrrrrrr....", "..rrRRwRRRRwRRrr..", ".rRRwwRRRRRRwwRRr.", "rRRRRRRRwwRRRRRRRr", "rrrrrrrrrrrrrrrrrr", ".....ssssssss.....", ".....skssssks.....", ".....ssssssss.....", ".....sskkkkss.....", "....SssssssssS....", "...SS.ssssss.SS...", ".....ss....ss.....", ".....kk....kk....."],
      ["......y.y.y.......", "......yyyyy.......", "....rrrrrrrrrr....", "..rrRRwRRRRwRRrr..", ".rRRwwRRRRRRwwRRr.", "rRRRRRRRwwRRRRRRRr", "rrrrrrrrrrrrrrrrrr", ".....ssssssss.....", ".....skssssks.....", ".....ssssssss.....", ".....ssskkkss.....", "...SSssssssssSS...", ".....SssssssS.....", "......ss..ss......", "......kk..kk......"]] },
    golem: { pal: { s: "#5a4a3a", S: "#7a6a52", m: "#4a7a3a", M: "#7aaa4a", e: "#f6e06b", k: "#1e1612", r: "#6b4430" }, frames: [
      [".......mMm..mm.......", "......ssssssssss.....", ".....sSSSSSSSSSss....", "....sSSeSSSSeSSSs....", "....sSSSSkkSSSSSs....", ".mm.sSSSSSSSSSSSs.mm.", "sSSssssSSSSSSSssssSSs", "sSSSs.sSSmmSSSs.sSSSs", "sSSSs.sSSMMSSSs.sSSSs", ".sSs..sSSSSSSSs..sSs.", ".rr...sSSSSSSSs...rr.", ".r....ssssssssss...r.", "......sSSs..sSSs.....", "......sSSs..sSSs.....", ".....rssss..ssssr....", "....r..............r."],
      [".......mMm..mm.......", "......ssssssssss.....", ".....sSSSSSSSSSss....", "....sSSeSSSSeSSSs....", "....sSSSSkkSSSSSs....", "....sSSSSSSSSSSSs....", ".mmsssssSSSSSSsssmm..", "sSSSs.sSSmmSSSs.sSSSs", "sSSSs.sSSMMSSSs.sSSSs", "sSSSs.sSSSSSSSs.sSSSs", ".sSs..sSSSSSSSs..sSs.", ".rr...ssssssssss..rr.", "......sSSs..sSSs.....", ".....sSSs....sSSs....", "....rssss....ssssr...", "...r..............r.."]] },
    bigmole: { pal: { m: "#4a3a4a", M: "#6a5a6a", k: "#1b1226", p: "#f29a85", c: "#f3e1c0", w: "#fdf3de" }, frames: [
      ["......mmmmmm......", "....mmMMMMMMmm....", "...mMMMMMMMMMMm...", "..mMMwkMMMMwkMMm..", "..mMMkkMMMMkkMMm..", ".mMMMMMppppMMMMMm.", ".mMMMMMppppMMMMMm.", "ccmMMMMMMMMMMMMmcc", "cccmMMMMMMMMMMmccc", ".cc.mmmmmmmmmm.cc."],
      ["......mmmmmm......", "....mmMMMMMMmm....", "...mMMMMMMMMMMm...", "..mMMwkMMMMwkMMm..", "..mMMkkMMMMkkMMm..", ".mMMMMMppppMMMMMm.", "cmMMMMMppppMMMMMmc", "ccmMMMMMMMMMMMMmcc", ".ccmMMMMMMMMMMmcc.", "..c.mmmmmmmmmm.c.."]] },
    magnet: { pal: { r: "#c8553d", w: "#fdf3de" }, frames: [["rr..rr", "rr..rr", "rr..rr", "rrrrrr", ".rrrr.", "ww..ww"]] },
    xpjar: { pal: { b: "#5fa3c9", B: "#a8e0f5", k: "#6b4430" }, frames: [[".kk.", "bbbb", "bBBb", "bBBb", "bbbb"]] },
    bomb: { pal: { k: "#3a3a4a", K: "#7a7a9a", y: "#f6d36b", b: "#8a5a3b" }, frames: [["....y", "...b.", ".kkk.", "kKkkk", "kkkkk", ".kkk."]] },
    freeze: { pal: { w: "#9fd8ff", W: "#ffffff" }, frames: [["..w..", "w.w.w", ".www.", "wwWww", ".www.", "w.w.w", "..w.."]] },
    goldbag: { pal: { k: "#6b4430", y: "#e0a82a", Y: "#ffe27a" }, frames: [[".kk.", "yyyy", "yYyy", "yyyy"]] },
    skull: { pal: { w: "#fdf3de", k: "#2b1709" }, frames: [[".www.", "wkwkw", "wwwww", ".w.w."]] },

    /* --- armes --- */
    acorn: { pal: { n: "#6b4430", N: "#8a5a3b", c: "#d39a52" }, frames: [[".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."]] },
    miniacorn: { pal: { n: "#6b4430", c: "#d39a52" }, frames: [[".n.", "ncn", ".c."]] },
    goldacorn: { pal: { n: "#a8741a", N: "#e0a82a", c: "#ffe27a" }, frames: [[".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."]] },
    gatling: { pal: { n: "#a8741a", c: "#ffe27a" }, frames: [["n.n.n", "c.c.c", "c.c.c", ".c.c."]] },
    smg: { pal: { n: "#6b4430", c: "#d39a52", k: "#555" }, frames: [["kkkkk.", "kcncnc", "kk....", "k....."]] },
    pinecone: { pal: { p: "#6b4430", P: "#b07a4f" }, frames: [["..p..", ".pPp.", "pPpPp", ".pPp.", "pPpPp", ".pPp."]] },
    pinebomb: { pal: { p: "#6b4430", P: "#b07a4f", y: "#f6d36b", r: "#c8553d" }, frames: [["y.r..", ".rp..", ".pPp.", "pPpPp", ".pPp.", "pPpPp"]] },
    mushroom: { pal: { r: "#c8553d", w: "#fdf3de", s: "#f3e1c0" }, frames: [["..rrrr..", ".rrwrrr.", "rrrrrwrr", "rwrrrrrr", "..ssss..", "..ssss.."]] },
    fairy: { pal: { r: "#c8553d", p: "#f29ad8" }, frames: [[".r.p.", "p...r", ".....", "r...p", ".p.r."]] },
    leaf: { pal: { l: "#9cc56b", L: "#3f6b3a" }, frames: [["...lL", ".llL.", "lLll.", "Lll..", "L...."], ["L....", "Lll..", "lLll.", ".llL.", "...lL"]] },
    autumnleaf: { pal: { l: "#f2b05e", L: "#c8553d" }, frames: [["...lL", ".llL.", "lLll.", "Lll..", "L...."], ["L....", "Lll..", "lLll.", ".llL.", "...lL"]] },
    spore: { pal: { p: "#9a7fd1", P: "#e2d6ff" }, frames: [[".p.", "pPp", ".p."]] },
    shield: { pal: { b: "#3f8f8a", B: "#7fd1c7", w: "#e6fff8" }, frames: [[".bbb.", "bBwBb", "bBBBb", "bBBBb", ".bBb.", "..b.."]] },
    mist: { pal: { p: "#9a7fd1", P: "#e2d6ff", c: "#7fd1c7" }, frames: [[".ppp.", "pPcPp", "pcccp", "pPcPp", ".ppp."]] },
    feather: { pal: { w: "#fdf3de", f: "#8fb8d8", k: "#4a6f8a" }, frames: [["....wk", "...wfk", "..wfk.", ".wfk..", "wk....", "k....."], ["k.....", "wk....", ".wfk..", "..wfk.", "...wfk", "....wk"]] },
    stormfeather: { pal: { w: "#fffbd0", f: "#f6d36b", k: "#a8741a" }, frames: [["....wk", "...wfk", "..wfk.", ".wfk..", "wk....", "k....."], ["k.....", "wk....", ".wfk..", "..wfk.", "...wfk", "....wk"]] },
    firefly: { pal: { w: "#e6f6fa", k: "#2b1709", y: "#f6ef7a", Y: "#fffbd0" }, frames: [["w.w..", ".wkk.", "..kyy", "...yY"]] },
    swarm: { pal: { y: "#f6ef7a", Y: "#fffbd0", w: "#e6f6fa" }, frames: [["y...y", ".Y.Y.", "..y..", ".Y.Y.", "y...y"]] },
    rocket: { pal: { r: "#c8553d", w: "#e6e6e6", f: "#f6b468" }, frames: [["rr....", "fwwwwr", "rr...."]] },
    rockets: { pal: { r: "#c8553d", w: "#e6e6e6", f: "#f6b468" }, frames: [["rr....", "fwwwwr", "rr....", "..rr....", "..fwwwwr", "..rr...."]] },
    tail: { pal: { t: "#f2b05e", d: "#b85e2a" }, frames: [["..tt..", ".tttt.", "ttdttt", "ttd.tt", ".td.t.", "..d..."]] },
    /* --- fusions légendaires --- */
    canon: { pal: { n: "#a8741a", N: "#e0a82a", c: "#ffe27a", y: "#c8553d" }, frames: [[".nnn.", "nNNNn", ".cyc.", ".cyc.", "..y.."]] },
    ouragan: { pal: { p: "#9a7fd1", c: "#7fd1c7", w: "#e6fff8" }, frames: [[".ppp.", "p..cp", "p.w.p", "pc..p", ".ppp."]] },
    bosquet: { pal: { g: "#3f6b3a", G: "#9cc56b", b: "#6b4430", r: "#c8553d" }, frames: [["..ggg..", ".gGrGg.", "gGgGgGg", ".gGgGg.", "...b...", "...b..."]] },
    ciel: { pal: { w: "#c9d6e3", W: "#ffffff", y: "#f6d36b" }, frames: [[".www..", "wWWWw.", "wwwwww", "..yy..", ".yy...", "yy...."]] },
    meteore: { pal: { r: "#c8553d", o: "#e8873a", y: "#f6d36b" }, frames: [["....r", "...ro", "..roy", ".royy", "royy.", ".yy.."]] },
    /* --- projectiles ennemis (toujours rouges) --- */
    hshot: { pal: { r: "#d0281a", R: "#ff8a6a" }, frames: [[".rr.", "rRRr", "rRRr", ".rr."]] },
    /* --- nouveaux ennemis --- */
    bombshroom: { pal: { r: "#c8553d", w: "#fdf3de", s: "#f3e1c0", k: "#2b1709", y: "#f6d36b" }, frames: [
      ["...y....", "...k....", ".rrrrrr.", "rrwrrwrr", "rrrrrrrr", "..skks..", "..ssss..", ".s....s."],
      ["....y...", "...k....", ".rrrrrr.", "rrwrrwrr", "rrrrrrrr", "..skks..", "..ssss..", "..s..s.."]] },
    frog: { pal: { G: "#2f7f7a", g: "#7fd1c7", y: "#e6f6fa", k: "#1f2a14", e: "#d0281a" }, frames: [
      ["..kk..kk..", ".keek.keek", ".gGGGGGGg.", "gGGgGGgGGg", "gGkkkkkkGg", "GGyyyyyyGG", "G.G....G.G"],
      ["..........", "..kk..kk..", ".keek.keek", ".gGGGGGGg.", "gGGgGGgGGg", "gGkkkkkkGg", "GGyyyyyyGG"]] },
    mole: { pal: { m: "#4a3a4a", M: "#6a5a6a", k: "#1b1226", p: "#f29a85", c: "#f3e1c0" }, frames: [
      ["...mmmm...", "..mMMMMm..", ".mMkMMkMm.", ".mMMppMMm.", "cmMMMMMMmc", "cc.mmmm.cc"],
      ["...mmmm...", "..mMMMMm..", ".mMkMMkMm.", ".mMMppMMm.", ".cMMMMMMc.", ".cc.mm.cc."]] },
    mound: { pal: { b: "#6b4430", B: "#8a5a3b" }, frames: [["...bb...", ".bBbBbb.", "bBbBbBbB"], ["..bb....", ".bbBbBb.", "BbBbBbBb"]] },
    cyclone: { pal: { t: "#f2b05e", d: "#b85e2a" }, frames: [[".ttt.", "t..dt", "t.d.t", "td..t", ".ttt."]] },

    /* --- objets (bonus de partie) --- */
    paw: { pal: { p: "#f29a85", P: "#c8553d" }, frames: [[".p.p.", "p...p", ".PPP.", "PPPPP", ".PPP."]] },
    claw: { pal: { w: "#fdf3de", g: "#b9ae96" }, frames: [["w..w..w", ".w..w..w", ".w..w..w", "..g..g..g"]] },
    bolt: { pal: { y: "#f6d36b", Y: "#fff6c0" }, frames: [["...yy", "..yY.", ".yyyy", "..Yy.", ".yy..", "yy..."]] },
    log: { pal: { b: "#6b4430", c: "#d39a52", C: "#a06a3e" }, frames: [[".bbb.", "bcccb", "bcCcb", "bcccb", ".bbb."]] },
    drop: { pal: { w: "#7fd1c7", W: "#e6f6fa" }, frames: [["..w..", ".www.", "wwwww", "wWwww", ".www."]] },
    book: { pal: { r: "#c8553d", w: "#fdf3de", k: "#6b4430" }, frames: [["rrrr.", "rwwwr", "rwkwr", "rwwwr", "rrrr."]] },
    pocket: { pal: { b: "#6b4430", B: "#a06a3e", n: "#d39a52" }, frames: [["bbbbb", "bBBBb", "bBnBb", "bBBBb", ".bbb."]] },
    loupe: { pal: { g: "#9a8f7a", w: "#cfeaf5", W: "#ffffff" }, frames: [[".ggg..", "gwWwg.", "gwwwg.", ".ggg..", "....g.", ".....g"]] },
    clover: { pal: { g: "#5b8a4a", G: "#9cc56b" }, frames: [[".G.G.", "GgGgG", ".GgG.", "..g..", "..g.."]] },
    moss: { pal: { m: "#5b8a4a", M: "#9cc56b" }, frames: [[".mmm.", "mMmMm", "mmMmm", ".mmm."]] },
  };

  /* =====================================================================
     Personnages (tous des écureuils)
     mods : hp (PV), speed/might/magnet/cd/xp/area (fraction), armor, amount (projectiles)
     ===================================================================== */
  var CHARACTERS = [
    { id: "noisette", name: "Noisette", title: "Écureuil roux", sprite: "sq_noisette", weapon: "gland",
      desc: "Équilibrée et têtue. Lance des glands sur tout ce qui bouge.", mods: {} },
    { id: "cendrine", name: "Cendrine", title: "Écureuil gris", sprite: "sq_cendrine", weapon: "champ",
      desc: "Solide comme un vieux chêne. Repousse tout avec son champ de force.", mods: { hp: 30, armor: 1, speed: -0.1 },
      unlock: "survie_3", price: 300 },
    { id: "charbon", name: "Charbon", title: "Écureuil noir", sprite: "sq_charbon", weapon: "mitraillette",
      desc: "Nerveux et sans pitié. Arrose tout à la mitraillette à glands.", mods: { might: 0.15, hp: -15 },
      unlock: "tueur_500", price: 400 },
    { id: "flocon", name: "Flocon", title: "Écureuil blanc", sprite: "sq_flocon", weapon: "lucioles",
      desc: "Rare et malin. Apprend vite et recharge vite.", mods: { xp: 0.2, cd: 0.1, hp: -20 },
      unlock: "niveau_20", price: 500 },
    { id: "planeur", name: "Planeur", title: "Écureuil volant", sprite: "sq_planeur", weapon: "plume",
      desc: "Plane au-dessus de la mêlée et ramasse tout de loin.", mods: { speed: 0.2, magnet: 0.5, hp: -10 },
      unlock: "boss_1", price: 700 },
    { id: "capitaine", name: "Capitaine", title: "Écureuil pirate", sprite: "sq_capitaine", weapon: "roquettes",
      desc: "Un œil, zéro peur. Ses roquettes font de gros trous.", mods: { area: 0.15, amount: 1, speed: -0.05 },
      unlock: "survie_10", price: 900 },
    { id: "jumeaux", name: "Pip & Pop", title: "Écureuils jumeaux", sprite: "sq_pip", weapon: "gland", quest: "q_duo10", twin: { name: "Pop", sprite: "sq_pop", dmg: 0.6 },
      desc: "Deux écureuils sur les mêmes commandes, chacun sa vie. Leurs armes font 60 % des dégâts. Si l'un tombe, l'autre peut le relever.", mods: {},
      unlock: "survie_5", price: 1000 },
    { id: "chevalier", name: "Bastien", title: "Écureuil chevalier", sprite: "sq_chevalier", weapon: "ecu",
      desc: "Casque, écu et cœur vaillant. Ses boucliers tournent autour de lui.", mods: { hp: 40, armor: 2, speed: -0.12, might: -0.05 },
      unlock: "donjon_2", price: 800 },
    { id: "mage", name: "Myrtille", title: "Écureuil mage", sprite: "sq_mage", weapon: "nova",
      desc: "Libère des ondes arcaniques tout autour d'elle.", mods: { area: 0.2, cd: 0.1, hp: -25 },
      unlock: "niveau_20", price: 900 },
    { id: "bucheron", name: "Bûche", title: "Écureuil bûcheron", sprite: "sq_bucheron", weapon: "hache",
      desc: "Lance sa hache qui revient en fauchant tout sur son passage.", mods: { might: 0.2, hp: 20, speed: -0.08 },
      unlock: "boss_1", price: 800 },
    { id: "ninja", name: "Ombre", title: "Écureuil ninja", sprite: "sq_ninja", weapon: "shuriken", quest: "q_intouchable",
      desc: "Rapide et insaisissable. Ses shurikens transpercent tout.", mods: { speed: 0.18, hp: -20, dodge: 0.1 },
      unlock: "tueur_500", price: 1000 },
    { id: "druide", name: "Fougère", title: "Écureuil druide", sprite: "sq_druide", weapon: "ronces",
      desc: "Fait jaillir des ronces sous les ennemis. Se soigne doucement.", mods: { regen: 0.6, area: 0.1, might: -0.05 },
      unlock: "donjon_win", price: 1200 },
  ];

  /* =====================================================================
     Armes. type = comportement dans le moteur. Les tableaux = niveaux 1 à 5.
     ===================================================================== */
  var WEAPONS = {
    // ---- 2.0 : arme du prototype
    katana: { name: "Katana", icon: "katana", type: "slash", family: "melee", element: "air",
      desc: ["Une entaille en arc devant toi.", "+dégâts.", "Arc plus large.", "Frappe plus vite.", "Double entaille, la 2e part dans l'autre sens."],
      dmg: [16, 21, 21, 25, 30], r: [30, 30, 36, 36, 40], arc: [2.0, 2.0, 2.4, 2.4, 2.6], cd: [0.8, 0.8, 0.75, 0.6, 0.55], double: [0, 0, 0, 0, 1] },
    // ---- compagnons
    familier: { name: "Hérisson fidèle", icon: "pethog", type: "pet", pet: "pethog",
      desc: ["Un hérisson te suit et fonce mordre les ennemis proches.", "+dégâts.", "+1 hérisson.", "Plus rapide, mord plus souvent.", "+1 hérisson, +dégâts."],
      n: [1, 1, 2, 2, 3], dmg: [9, 13, 13, 16, 21], rate: [0.6, 0.6, 0.55, 0.42, 0.38], spd: [95, 95, 100, 125, 130], range: 150 },
    chouette: { name: "Chouette gardienne", icon: "petowl", type: "pet", pet: "petowl", fly: true,
      desc: ["Une chouette plane au-dessus de toi et pique sur les ennemis.", "+dégâts.", "Pique plus souvent.", "+1 chouette.", "Ses piqûres explosent en petite zone."],
      n: [1, 1, 1, 2, 2], dmg: [12, 17, 17, 19, 24], rate: [0.9, 0.9, 0.65, 0.65, 0.6], spd: [140, 140, 150, 150, 165], range: 190, splash: [0, 0, 0, 0, 22] },
    tourelle: { name: "Tourelle à glands", icon: "turret", type: "turret", turret: "turret", sprite: "acorn",
      desc: ["Pose régulièrement une tourelle qui tire sur les ennemis.", "Tire plus vite.", "+1 tourelle en même temps.", "Dure plus longtemps, +dégâts.", "+1 tourelle, tirs perçants."],
      n: [1, 1, 2, 2, 3], dmg: [8, 8, 10, 13, 15], rate: [0.6, 0.45, 0.45, 0.4, 0.35], cd: [6, 6, 5.5, 5, 4.5], dur: [9, 9, 10, 13, 14], pierce: [1, 1, 1, 1, 2], range: 160 },
    drone: { name: "Drone-luciole", icon: "drone", type: "drone", drone: "drone", sprite: "spark",
      desc: ["Un petit drone vole autour de toi et tire des étincelles.", "+1 drone.", "Tire plus vite.", "+1 drone, +dégâts.", "Les étincelles transpercent."],
      n: [1, 2, 2, 3, 3], dmg: [6, 6, 6, 8, 9], rate: [0.7, 0.7, 0.5, 0.5, 0.45], pierce: [1, 1, 1, 1, 3], range: 140 },
    gland: { name: "Glands", icon: "acorn", type: "shooter", sprite: "acorn",
      desc: ["Lance un gland sur l'ennemi le plus proche.", "+1 gland à chaque tir.", "+50 % de dégâts.", "+1 gland, transperce un ennemi de plus.", "Tire bien plus vite."],
      count: [1, 2, 2, 3, 3], dmg: [11, 11, 16, 16, 19], pierce: [1, 1, 1, 2, 2], cd: [0.75, 0.75, 0.75, 0.7, 0.5], spd: 150, range: 135 },
    mitraillette: { name: "Mitraillette à glands", icon: "smg", type: "shooter", sprite: "miniacorn",
      desc: ["Une rafale continue de petits glands, faibles mais très nombreux.", "Tire plus vite.", "+1 dégât.", "Tire encore plus vite.", "+1 gland par rafale, +1 dégât."],
      count: [1, 1, 1, 1, 2], dmg: [3, 3, 4, 4, 5], pierce: [1, 1, 1, 1, 1], cd: [0.13, 0.11, 0.11, 0.09, 0.08], spd: 190, range: 130, spread: 0.3 },
    queue: { name: "Coup de queue", icon: "tail", type: "whip",
      desc: ["Un grand coup de queue devant toi qui repousse tout.", "+40 % de dégâts.", "Frappe des deux côtés.", "Coup plus large.", "Plus fréquent et plus fort."],
      dmg: [15, 21, 21, 25, 32], r: [25, 25, 25, 32, 34], both: [0, 0, 1, 1, 1], cd: [1.4, 1.4, 1.3, 1.2, 0.95] },
    champ: { name: "Champ de force", icon: "shield", type: "aura", color: "force",
      desc: ["Une bulle qui repousse les ennemis et les brûle en continu.", "Bulle plus grande.", "+dégâts.", "Repousse plus fort.", "Bulle énorme et plus forte."],
      R: [22, 27, 27, 30, 36], dmg: [3, 3, 5, 5, 7], tick: 0.4, slow: 0, push: [45, 50, 55, 85, 95] },
    champi: { name: "Champignons gardiens", icon: "mushroom", type: "orbit", sprite: "mushroom",
      desc: ["2 champignons tournent autour de toi.", "+1 champignon.", "Cercle plus grand, +dégâts.", "+1 champignon.", "+1 champignon, tournent plus vite."],
      n: [2, 3, 3, 4, 5], R: [24, 24, 30, 30, 32], dmg: [8, 8, 11, 11, 13], spd: [2.6, 2.6, 2.8, 2.8, 3.5] },
    feuilles: { name: "Tourbillon de feuilles", icon: "leaf", type: "radial", sprite: "leaf",
      desc: ["Des feuilles tranchantes partent tout autour.", "+1 feuille.", "+dégâts, transpercent plus.", "+1 feuille.", "+2 feuilles, plus fréquent."],
      n: [4, 5, 5, 6, 8], dmg: [9, 9, 12, 12, 14], pierce: [2, 2, 3, 3, 3], cd: [2.0, 2.0, 2.0, 1.8, 1.4], spd: 105 },
    pomme: { name: "Pommes de pin", icon: "pinecone", type: "lob", unlock: "tueur_100",
      desc: ["Lance une pomme de pin qui explose.", "Explosion plus large.", "+1 pomme de pin.", "+50 % de dégâts.", "+1 pomme de pin, plus fréquentes."],
      n: [1, 1, 2, 2, 3], dmg: [24, 24, 24, 36, 38], rad: [18, 24, 24, 24, 27], cd: [2.4, 2.4, 2.4, 2.4, 1.9], frag: 0 },
    roquettes: { name: "Roquettes", icon: "rocket", type: "rocket", unlock: "survie_5",
      desc: ["Une roquette à tête chercheuse qui explose.", "+dégâts.", "+1 roquette.", "Explosion plus large.", "+1 roquette, plus fréquentes."],
      n: [1, 1, 2, 2, 3], dmg: [22, 28, 28, 32, 36], rad: [16, 16, 16, 22, 24], cd: [2.2, 2.1, 2.0, 1.9, 1.5], spd: 120 },
    spores: { name: "Nuage de spores", icon: "spore", type: "aura", unlock: "total_1000", color: "spore",
      desc: ["Un nuage autour de toi qui blesse et ralentit.", "+dégâts.", "Nuage plus grand.", "Ralentit beaucoup plus.", "Nuage énorme et plus toxique."],
      R: [24, 24, 32, 32, 42], dmg: [4, 6, 6, 7, 10], tick: 0.5, slow: [0.3, 0.3, 0.3, 0.55, 0.55], push: 0 },
    plume: { name: "Plume boomerang", icon: "feather", type: "boomerang", sprite: "feather", unlock: "niveau_20",
      desc: ["Une plume qui part et revient en transperçant tout.", "+dégâts.", "+1 plume.", "Va plus loin, +dégâts.", "+1 plume, plus fréquente."],
      n: [1, 1, 2, 2, 3], dmg: [12, 16, 16, 21, 24], range: [85, 85, 85, 110, 115], cd: [1.7, 1.7, 1.6, 1.5, 1.2], chain: 0 },
    ecu: { name: "Écus tournoyants", icon: "shieldorb", type: "orbit", sprite: "shieldorb", unlock: "donjon_2",
      desc: ["2 écus tournent lentement autour de toi et repoussent.", "+1 écu.", "+dégâts, cercle plus grand.", "+1 écu.", "+1 écu, tournent plus vite."],
      n: [2, 3, 3, 4, 5], R: [20, 20, 26, 26, 28], dmg: [10, 10, 14, 14, 17], spd: [1.8, 1.8, 2, 2, 2.6] },
    nova: { name: "Onde arcanique", icon: "orb", type: "nova", unlock: "niveau_20",
      desc: ["Une onde violette blesse tout autour de toi.", "Onde plus large.", "+dégâts.", "Plus fréquente.", "Onde énorme et double."],
      R: [40, 50, 50, 54, 64], dmg: [16, 16, 24, 24, 30], cd: [2.4, 2.4, 2.3, 1.8, 1.6], twice: [0, 0, 0, 0, 1] },
    hache: { name: "Hache de jet", icon: "axe", type: "boomerang", sprite: "axe", unlock: "boss_1",
      desc: ["Une lourde hache qui part et revient.", "+dégâts.", "Va plus loin.", "+1 hache.", "+dégâts, plus fréquente."],
      n: [1, 1, 1, 2, 2], dmg: [20, 27, 27, 30, 38], range: [75, 75, 95, 95, 100], cd: [2.0, 2.0, 1.9, 1.8, 1.4], chain: 0 },
    shuriken: { name: "Shurikens", icon: "shuriken", type: "shooter", sprite: "shuriken", unlock: "tueur_500",
      desc: ["Lance un shuriken qui transperce 3 ennemis.", "+1 shuriken.", "Transperce plus.", "+1 shuriken, +dégâts.", "Tire bien plus vite."],
      count: [1, 2, 2, 3, 3], dmg: [9, 9, 9, 12, 13], pierce: [3, 3, 5, 5, 6], cd: [0.9, 0.9, 0.85, 0.8, 0.55], spd: 190, range: 150, anim: true },
    ronces: { name: "Ronces", icon: "thorn", type: "thorns", unlock: "donjon_win",
      desc: ["Des ronces jaillissent sous un ennemi, blessent et ralentissent.", "+1 roncier.", "Ronciers plus grands.", "+dégâts, durent plus.", "+2 ronciers."],
      n: [1, 2, 2, 2, 4], dmg: [5, 5, 5, 8, 8], rad: [16, 16, 22, 22, 24], dur: [3, 3, 3, 4.5, 4.5], cd: [2.6, 2.6, 2.5, 2.4, 2.2] },
    lien: { name: "Arc électrique", icon: "lienicon", type: "tether", coop: true,
      desc: ["COOP · Un arc électrique relie tes alliés proches et électrocute tout ce qui le traverse.", "+dégâts.", "Portée plus longue.", "Arc plus large.", "+dégâts, crépite plus vite."],
      dmg: [7, 10, 10, 12, 16], tick: [0.3, 0.3, 0.28, 0.25, 0.2], range: [130, 130, 160, 160, 180], width: [7, 7, 8, 11, 12] },
    ronde: { name: "Ronde des amis", icon: "ronde", type: "orbit", sprite: "acorn", around: "partner", coop: true, quest: "q_coopboss",
      desc: ["COOP · Des glands tournent autour de ton allié le plus proche pour le protéger.", "+1 gland.", "+dégâts.", "+1 gland, cercle plus grand.", "+1 gland, tournent plus vite."],
      n: [3, 4, 4, 5, 6], R: [18, 18, 18, 22, 24], dmg: [9, 9, 13, 13, 16], spd: [3, 3, 3, 3.2, 3.8] },
    solitaire: { name: "Épines de l'ermite", icon: "needle", type: "radial", sprite: "needle", solo: true, quest: "q_seul",
      desc: ["SOLO · Des aiguilles de pin jaillissent tout autour de toi.", "+2 aiguilles.", "+dégâts, transpercent plus.", "+2 aiguilles.", "+3 aiguilles, plus fréquentes."],
      n: [6, 8, 8, 10, 13], dmg: [10, 10, 14, 14, 17], pierce: [2, 2, 3, 3, 4], cd: [1.8, 1.8, 1.7, 1.6, 1.25], spd: 130 },
    lucioles: { name: "Lucioles", icon: "firefly", type: "chain", unlock: "boss_1",
      desc: ["Un éclair de luciole qui saute d'ennemi en ennemi.", "Saute sur 1 ennemi de plus.", "+1 éclair.", "+dégâts, +1 saut.", "+2 sauts, plus fréquent."],
      bolts: [1, 1, 2, 2, 2], chain: [3, 4, 4, 5, 7], dmg: [11, 11, 11, 15, 17], cd: [1.8, 1.7, 1.6, 1.5, 1.15] },
  };

  /* =====================================================================
     Fusions : quand les deux ingrédients sont au niveau max, la fusion
     apparaît dans les choix. Arme + arme : les deux sont remplacées (une
     case se libère). Arme + objet : l'arme est remplacée, l'objet reste.
     ===================================================================== */
  var FUSIONS = {
    // ---- compagnons
    meute_herissons: { name: "Meute de hérissons", icon: "pethog2", from: ["familier", "dresseur"], type: "pet", pet: "pethog2", roll: 1,
      desc: ["Une meute de hérissons-boules roule sur tout ce qui bouge.", "+1 hérisson.", "+dégâts.", "Roulés plus larges.", "+1 hérisson, +dégâts."],
      n: [3, 4, 4, 4, 5], dmg: [18, 18, 24, 26, 32], rate: [0.35, 0.35, 0.32, 0.3, 0.26], spd: [140, 140, 150, 160, 170], range: 190, splash: [14, 14, 16, 20, 22] },
    grand_duc: { name: "Grand-duc", icon: "petowl2", from: ["chouette", "dresseur"], type: "pet", pet: "petowl2", fly: true,
      desc: ["Un énorme hibou fond sur les ennemis et fait trembler le sol.", "+dégâts.", "+1 grand-duc.", "Explosions plus larges.", "Plonge sans arrêt."],
      n: [1, 1, 2, 2, 2], dmg: [40, 52, 52, 58, 70], rate: [0.9, 0.9, 0.85, 0.8, 0.55], spd: [170, 170, 175, 180, 200], range: 220, splash: [30, 30, 32, 40, 42] },
    fortin: { name: "Fortin à roquettes", icon: "turret2", from: ["tourelle", "mecano"], type: "turret", turret: "turret2", rocket: 1,
      desc: ["Tes tourelles deviennent des fortins qui tirent des roquettes.", "+1 fortin.", "+dégâts.", "Durent plus longtemps.", "+1 fortin, tirs plus rapides."],
      n: [2, 3, 3, 3, 4], dmg: [22, 22, 30, 32, 38], rate: [0.8, 0.8, 0.75, 0.7, 0.55], cd: [5, 5, 4.5, 4.5, 4], dur: [12, 12, 13, 17, 18], rad: [22, 22, 24, 26, 30], range: 190 },
    essaim_drones: { name: "Essaim de drones", icon: "drone2", from: ["drone", "mecano"], type: "drone", drone: "drone2", zap: 1,
      desc: ["Un essaim de drones lance des arcs électriques qui rebondissent.", "+1 drone.", "+1 rebond.", "+dégâts.", "+1 drone, plus rapides."],
      n: [3, 4, 4, 4, 5], dmg: [12, 12, 12, 16, 18], rate: [0.6, 0.6, 0.6, 0.55, 0.45], chain: [2, 2, 3, 3, 4], range: 160 },
    tourelle_vivante: { name: "Hérisson-tourelle", icon: "pethog", from: ["familier", "tourelle"], type: "turret", turret: "pethog", sprite: "needle",
      desc: ["Des hérissons s'enracinent et crachent leurs piquants partout.", "+1 hérisson-tourelle.", "+dégâts.", "Plus de piquants.", "Durent bien plus longtemps."],
      n: [2, 3, 3, 3, 3], dmg: [12, 12, 16, 16, 19], rate: [0.5, 0.5, 0.45, 0.4, 0.4], cd: [5, 5, 4.5, 4.5, 4], dur: [10, 10, 11, 12, 18], spray: [4, 4, 5, 7, 7], pierce: [2, 2, 2, 2, 3], range: 150 },
    // ---- exclusives coop / solo
    orage_meute: { name: "Tempête de meute", icon: "lienicon", from: ["lien", "meute"], type: "tether", coop: true, chain: 3,
      desc: ["COOP · Arcs géants entre alliés, qui rebondissent sur 3 ennemis.", "+dégâts.", "Plus long.", "+1 rebond.", "Orage permanent."],
      dmg: [14, 18, 18, 20, 26], tick: [0.22, 0.22, 0.2, 0.2, 0.15], range: [190, 190, 220, 220, 240], width: [12, 12, 13, 14, 16] },
    bouclier_ami: { name: "Bouclier d'amitié", icon: "ronde", from: ["ronde", "entraide"], type: "orbit", sprite: "shieldorb", around: "partner", coop: true, healAlly: 1,
      desc: ["COOP · Des écus tournent autour de ton allié et le soignent à chaque coup.", "+1 écu.", "+dégâts.", "Cercle plus grand.", "+1 écu, plus rapides."],
      n: [5, 6, 6, 6, 7], R: [24, 24, 24, 30, 32], dmg: [16, 16, 21, 21, 25], spd: [3, 3, 3.2, 3.2, 3.8] },
    loup: { name: "Rugissement de l'ermite", icon: "needle", from: ["solitaire", "ermite"], type: "radial", sprite: "needle", homing: true, solo: true,
      desc: ["SOLO · Une couronne d'aiguilles chercheuses, encore et encore.", "+3 aiguilles.", "+dégâts.", "Transpercent plus.", "+4 aiguilles, plus fréquentes."],
      n: [14, 17, 17, 17, 21], dmg: [15, 15, 20, 20, 24], pierce: [4, 4, 4, 7, 7], cd: [1.2, 1.2, 1.1, 1.0, 0.8], spd: 135 },
    // ---- nouvelles fusions (un même ingrédient peut mener à plusieurs fusions)
    pluie_glands: { name: "Pluie de glands", icon: "goldacorn", from: ["gland", "poches"], type: "shooter", sprite: "acorn",
      desc: ["Une gerbe de glands vers plusieurs ennemis à la fois.", "+1 gland.", "+dégâts.", "+2 glands.", "Tire plus vite."],
      count: [5, 6, 6, 8, 8], dmg: [13, 13, 17, 17, 19], pierce: [1, 1, 2, 2, 2], cd: [0.7, 0.7, 0.7, 0.65, 0.45], spd: 160, range: 150, spread: 0.4 },
    queue_lame: { name: "Queue tranchante", icon: "tail", from: ["queue", "griffes"], type: "whip",
      desc: ["Un coup de queue énorme des deux côtés.", "+dégâts.", "Plus large.", "Plus fréquent.", "Lame de tempête."],
      dmg: [34, 42, 42, 46, 58], r: [36, 36, 44, 44, 50], both: [1, 1, 1, 1, 1], cd: [1.1, 1.1, 1.05, 0.85, 0.75] },
    champi_soin: { name: "Champignons guérisseurs", icon: "mushroom", from: ["champi", "seve"], type: "orbit", sprite: "mushroom", heal: 0.6,
      desc: ["Des champignons qui te soignent un peu à chaque coup.", "+1 champignon.", "+dégâts.", "Cercle plus grand.", "+1 champignon."],
      n: [4, 5, 5, 5, 6], R: [28, 28, 28, 34, 36], dmg: [12, 12, 16, 16, 19], spd: [2.8, 2.8, 3, 3, 3.4] },
    bourrasque: { name: "Bourrasque", icon: "leaf", from: ["feuilles", "vivacite"], type: "radial", sprite: "leaf",
      desc: ["Des salves de feuilles très rapprochées.", "+2 feuilles.", "+dégâts.", "Plus fréquentes.", "+3 feuilles."],
      n: [8, 10, 10, 10, 13], dmg: [11, 11, 15, 15, 17], pierce: [3, 3, 3, 4, 4], cd: [0.9, 0.9, 0.85, 0.7, 0.6], spd: 140 },
    grande_plume: { name: "Grande plume", icon: "feather", from: ["plume", "loupe"], type: "boomerang", sprite: "feather",
      desc: ["Des plumes qui vont très loin et reviennent.", "+dégâts.", "+1 plume.", "Encore plus loin.", "+1 plume, +dégâts."],
      n: [2, 2, 3, 3, 4], dmg: [22, 27, 27, 30, 36], range: [140, 140, 140, 175, 180], cd: [1.4, 1.4, 1.35, 1.3, 1.1], chain: 0 },
    lucioles_or: { name: "Lucioles dorées", icon: "firefly", from: ["lucioles", "trefle"], type: "chain",
      desc: ["Des éclairs dorés qui sautent très loin.", "+2 sauts.", "+1 éclair.", "+dégâts.", "+3 sauts."],
      bolts: [2, 2, 3, 3, 3], chain: [6, 8, 8, 8, 11], dmg: [16, 16, 16, 21, 24], cd: [1.3, 1.25, 1.2, 1.15, 0.95] },
    obus: { name: "Obus de noisette", icon: "rocket", from: ["roquettes", "loupe"], type: "rocket",
      desc: ["Des roquettes lentes à l'explosion énorme.", "+dégâts.", "Explosion plus large.", "+1 obus.", "+dégâts, plus fréquent."],
      n: [1, 1, 1, 2, 2], dmg: [55, 70, 70, 75, 90], rad: [34, 34, 42, 42, 46], cd: [2.4, 2.3, 2.3, 2.2, 1.8], spd: 95 },
    rempart: { name: "Rempart", icon: "shieldorb", quest: "q_chevalier", from: ["ecu", "ecorce"], type: "orbit", sprite: "shieldorb",
      desc: ["Un mur d'écus qui tourne autour de toi.", "+1 écu.", "+dégâts.", "+1 écu, cercle plus grand.", "+2 écus."],
      n: [5, 6, 6, 7, 9], R: [24, 24, 24, 30, 32], dmg: [15, 15, 20, 20, 23], spd: [2.2, 2.2, 2.4, 2.4, 2.8] },
    supernova: { name: "Supernova", icon: "orb", quest: "q_mage", from: ["nova", "savoir"], type: "nova", twice: [1, 1, 1, 1, 1],
      desc: ["Deux ondes arcaniques coup sur coup.", "Plus large.", "+dégâts.", "Plus fréquente.", "Onde gigantesque."],
      R: [62, 70, 70, 74, 86], dmg: [28, 28, 38, 38, 46], cd: [2.0, 2.0, 1.9, 1.5, 1.3] },
    double_hache: { name: "Double hache", icon: "axe", quest: "q_bucheron", from: ["hache", "griffes"], type: "boomerang", sprite: "axe",
      desc: ["Deux haches lourdes qui reviennent.", "+dégâts.", "Vont plus loin.", "+1 hache.", "+dégâts, plus fréquentes."],
      n: [2, 2, 2, 3, 3], dmg: [36, 44, 44, 48, 58], range: [95, 95, 115, 115, 120], cd: [1.7, 1.7, 1.6, 1.5, 1.2], chain: 0 },
    tempete_shuriken: { name: "Tempête de shurikens", icon: "shuriken", quest: "q_ninja", from: ["shuriken", "pattes"], type: "shooter", sprite: "shuriken", anim: true,
      desc: ["Une rafale de shurikens qui traversent tout.", "+1 shuriken.", "+dégâts.", "Transpercent plus.", "Rafale continue."],
      count: [3, 4, 4, 4, 5], dmg: [13, 13, 17, 17, 19], pierce: [6, 6, 6, 9, 9], cd: [0.55, 0.55, 0.5, 0.5, 0.35], spd: 210, range: 170 },
    foret: { name: "Forêt vivante", icon: "thorn", quest: "q_druide", from: ["ronces", "seve"], type: "thorns",
      desc: ["Des ronciers géants partout autour de toi.", "+1 roncier.", "Plus grands.", "+dégâts.", "+2 ronciers."],
      n: [3, 4, 4, 4, 6], dmg: [9, 9, 9, 13, 14], rad: [24, 24, 30, 30, 32], dur: [5, 5, 5, 5, 6], cd: [2.2, 2.2, 2.1, 2, 1.8] },
    gatling: { name: "Gatling de chêne", icon: "gatling", from: ["gland", "mitraillette"], type: "shooter", sprite: "goldacorn",
      desc: ["Un déluge de glands dorés qui transpercent.", "+dégâts.", "+1 gland par rafale.", "Tire plus vite.", "+1 gland, +dégâts."],
      count: [3, 3, 4, 4, 5], dmg: [10, 12, 12, 13, 15], pierce: [2, 2, 3, 3, 3], cd: [0.2, 0.2, 0.18, 0.15, 0.13], spd: 210, range: 170, spread: 0.18 },
    cyclone: { name: "Queue cyclone", icon: "cyclone", from: ["queue", "pattes"], type: "spin",
      desc: ["Ta queue tourne sur 360° et balaye tout autour de toi.", "+dégâts.", "Plus large.", "Plus fréquent.", "Tornade géante."],
      dmg: [24, 28, 28, 32, 40], r: [38, 38, 44, 44, 54], cd: [1.0, 0.95, 0.9, 0.75, 0.65] },
    fees: { name: "Cercle des fées", icon: "fairy", from: ["champi", "appetit"], type: "orbit", sprite: "mushroom", heal: 0.4,
      desc: ["Un grand cercle de champignons qui te soignent à chaque coup.", "+1 champignon.", "+dégâts.", "Cercle plus grand.", "+1 champignon, plus rapides."],
      n: [6, 7, 7, 7, 8], R: [34, 34, 34, 40, 44], dmg: [14, 14, 18, 18, 22], spd: [3, 3, 3.2, 3.2, 3.6] },
    tempete: { name: "Tempête d'automne", icon: "autumnleaf", from: ["feuilles", "seve"], type: "radial", sprite: "autumnleaf", homing: true,
      desc: ["Des feuilles d'automne qui poursuivent les ennemis.", "+1 feuille.", "+dégâts.", "Transpercent plus.", "+2 feuilles, plus fréquent."],
      n: [10, 11, 11, 11, 13], dmg: [14, 14, 18, 18, 22], pierce: [5, 5, 5, 8, 8], cd: [1.3, 1.3, 1.2, 1.1, 0.9], spd: 120 },
    pinbombe: { name: "Pin-bombe", icon: "pinebomb", from: ["pomme", "griffes"], type: "lob",
      desc: ["Des pommes de pin qui éclatent en petites explosions.", "+1 pin-bombe.", "+dégâts.", "Plus d'éclats.", "+1 pin-bombe, plus fréquentes."],
      n: [2, 3, 3, 3, 4], dmg: [40, 40, 50, 50, 60], rad: [28, 28, 30, 32, 36], cd: [1.8, 1.7, 1.6, 1.5, 1.3], frag: [4, 4, 5, 7, 7] },
    brume: { name: "Brume répulsive", icon: "mist", from: ["spores", "champ"], type: "aura", color: "mist",
      desc: ["Un énorme nuage qui ralentit, repousse et ronge tout.", "+dégâts.", "Plus grand.", "Repousse plus fort.", "Gigantesque."],
      R: [48, 48, 54, 56, 66], dmg: [10, 13, 13, 15, 20], tick: 0.35, slow: 0.5, push: [70, 70, 75, 110, 120] },
    orage: { name: "Plume d'orage", icon: "stormfeather", from: ["plume", "lucioles"], type: "boomerang", sprite: "stormfeather",
      desc: ["Des plumes boomerang qui déclenchent un éclair à chaque coup.", "+dégâts.", "+1 plume.", "L'éclair saute plus loin.", "+1 plume, plus fréquentes."],
      n: [2, 2, 3, 3, 4], dmg: [22, 26, 26, 28, 32], range: [120, 120, 120, 125, 130], cd: [1.4, 1.4, 1.3, 1.2, 1.0], chain: [3, 3, 3, 5, 5] },
    essaim: { name: "Essaim de roquettes", icon: "rockets", from: ["roquettes", "vivacite"], type: "rocket",
      desc: ["Une salve de mini-roquettes qui pistent tout l'écran.", "+1 roquette.", "+dégâts.", "Explosions plus larges.", "+2 roquettes, plus fréquentes."],
      n: [5, 6, 6, 6, 8], dmg: [22, 22, 26, 26, 30], rad: [18, 18, 18, 22, 24], cd: [1.6, 1.5, 1.4, 1.3, 1.1], spd: 135 },
    nuee: { name: "Nuée de lucioles", icon: "swarm", from: ["lucioles", "savoir"], type: "chain",
      desc: ["Une nuée d'éclairs qui illumine tout l'écran.", "+1 éclair.", "+dégâts.", "+2 sauts.", "+1 éclair, plus fréquent."],
      bolts: [4, 5, 5, 5, 6], chain: [6, 6, 6, 8, 9], dmg: [18, 18, 22, 22, 26], cd: [1.1, 1.05, 1.0, 0.95, 0.8] },

    /* --- fusions légendaires (tier 2) : à partir de fusions déjà faites --- */
    canon: { name: "Canon à glands", icon: "canon", tier: 2, from: ["gatling", "essaim"], type: "shooter", sprite: "goldacorn", explode: 16,
      desc: ["Une rafale de glands dorés qui explosent à l'impact.", "+dégâts.", "+1 gland.", "Explosions plus larges.", "+1 gland, plus rapide."],
      count: [3, 3, 4, 4, 5], dmg: [16, 20, 20, 22, 26], pierce: 1, cd: [0.3, 0.3, 0.28, 0.26, 0.22], spd: 220, range: 180, spread: 0.15, explodeR: [16, 16, 16, 22, 24] },
    ouragan: { name: "Ouragan", icon: "ouragan", tier: 2, from: ["cyclone", "brume"], type: "aura", color: "hurricane",
      desc: ["Un vortex qui aspire les ennemis et les déchiquette.", "+dégâts.", "Plus grand.", "Aspire plus fort.", "Tempête géante."],
      R: [60, 60, 68, 70, 80], dmg: [14, 18, 18, 20, 26], tick: 0.3, slow: 0.4, push: [-40, -40, -45, -70, -80], spinCd: 0.8, spinDmg: [30, 36, 36, 40, 50] },
    bosquet: { name: "Bosquet enchanté", icon: "bosquet", tier: 2, from: ["fees", "tempete"], type: "orbit", sprite: "mushroom", heal: 0.6, shootCd: 1.2,
      desc: ["Les champignons des fées soignent et lancent des feuilles chercheuses.", "+1 champignon.", "+dégâts.", "Tirent plus souvent.", "+1 champignon, cercle plus grand."],
      n: [7, 8, 8, 8, 9], R: [40, 40, 40, 42, 48], dmg: [20, 20, 25, 25, 30], spd: [3.2, 3.2, 3.4, 3.4, 3.8], leafDmg: [14, 14, 18, 18, 22] },
    ciel: { name: "Ciel d'orage", icon: "ciel", tier: 2, from: ["orage", "nuee"], type: "storm",
      desc: ["La foudre tombe du ciel sur tout l'écran et saute d'ennemi en ennemi.", "+1 éclair.", "+dégâts.", "+2 sauts.", "+2 éclairs, plus fréquent."],
      strikes: [5, 6, 6, 6, 8], chain: [4, 4, 4, 6, 6], dmg: [30, 30, 38, 38, 46], cd: [1.2, 1.15, 1.1, 1.05, 0.85] },
    meteores: { name: "Pluie de météores", icon: "meteore", tier: 2, from: ["pinbombe", "loupe"], type: "meteor",
      desc: ["Des pommes de pin en feu tombent du ciel sur les ennemis.", "+1 météore.", "+dégâts.", "Explosions plus larges.", "+2 météores, plus fréquents."],
      n: [3, 4, 4, 4, 6], dmg: [60, 60, 75, 75, 90], rad: [32, 32, 32, 40, 44], cd: [1.6, 1.5, 1.45, 1.4, 1.2], frag: 5 },
  };

  /* =====================================================================
     Objets (bonus de partie, niveaux 1 à 5)
     ===================================================================== */
  var PASSIVES = {
    pattes: { name: "Pattes agiles", sprite: "paw", desc: "+10 % de vitesse de course." },
    appetit: { name: "Gros appétit", sprite: "mushroom", desc: "+20 PV max (et soigne 20 PV)." },
    joues: { name: "Grosses joues", sprite: "nut", desc: "+40 % de distance de ramassage." },
    griffes: { name: "Griffes aiguisées", sprite: "claw", desc: "+10 % de dégâts." },
    vivacite: { name: "Vivacité", sprite: "bolt", desc: "-8 % de temps de recharge." },
    ecorce: { name: "Armure d'écorce", sprite: "log", desc: "-1 dégât reçu par coup." },
    seve: { name: "Sève", sprite: "drop", desc: "Régénère 0,4 PV par seconde." },
    savoir: { name: "Vieux grimoire", sprite: "book", desc: "+12 % d'expérience." },
    poches: { name: "Poches profondes", sprite: "pocket", desc: "+1 projectile pour toutes les armes (niv. 1, 3 et 5)." },
    loupe: { name: "Loupe", sprite: "loupe", desc: "+10 % de zone d'effet." },
    trefle: { name: "Flair", sprite: "clover", desc: "+20 % de chance de butin." },
    meute: { name: "Esprit de meute", sprite: "paws2", coop: true, desc: "COOP · Avec un allié à moins de 80 px : +8 % de dégâts et -1 dégât reçu." },
    entraide: { name: "Main tendue", sprite: "hand", coop: true, quest: "q_releve1", desc: "COOP · Soigne tes alliés proches (0,3 PV/s) et relève 25 % plus vite." },
    ermite: { name: "Lanterne de l'ermite", sprite: "lantern", solo: true, desc: "SOLO · +12 % de dégâts et +8 % d'expérience." },
    crocs: { name: "Crocs", sprite: "fang", quest: "q_crits", desc: "+5 % de coups critiques." },
    queuetouffue: { name: "Queue touffue", sprite: "tailpuff", quest: "q_esquive", desc: "4 % de chance d'esquiver un coup." },
    sacglands: { name: "Sac de glands", sprite: "sack", quest: "q_riche", desc: "+10 % de glands d'or." },
    dresseur: { name: "Dresseur", sprite: "pethog", desc: "+15 % de dégâts des familiers, tourelles et drones." },
    mecano: { name: "Petit mécano", sprite: "turret", desc: "Tourelles +25 % de durée, drones et tourelles tirent 10 % plus vite." },
    mousse: { name: "Coussin de mousse", sprite: "moss", desc: "Bloque un coup, se recharge plus vite à chaque niveau." },
  };

  /* =====================================================================
     Butin des objets destructibles (poids = probabilité relative)
     ===================================================================== */
  var LOOT = [
    { id: "magnet", name: "Aspirateur à noisettes", weight: 18 },
    { id: "xpjar", name: "Pot d'expérience", weight: 18 },
    { id: "goldbag", name: "Sac de glands d'or", weight: 22 },
    { id: "berry", name: "Baie", weight: 22 },
    { id: "freeze", name: "Givre", weight: 9 },
    { id: "bomb", name: "Gland explosif", weight: 8 },
    { id: "chest", name: "Coffre", weight: 3 },
  ];

  /* =====================================================================
     Cartes
     enemies : [type, apparaît à (s), poids]
     ===================================================================== */
  var G_PRAIRIE = { base: "#7fa95a", patch: "#76a052", tuft: "#5b8a4a", hi: "#a6cf74", flowers: ["#fdf3de", "#f2b05e", "#c8553d", "#f6d36b"], pebble: "#b9ae96", pebbleDk: "#8a806c", shroom: "#c8553d" };
  var MAPS = [
    { id: "clairiere", name: "Clairière", desc: "Prairie, sous-bois et champignonnière. Parfait pour débuter.", hp: 1, gold: 1,
      swarm: ["slug", "wasp", "spider", "beetle"], bosses: ["boar", "queen", "owl"],
      biomes: [
        { name: "Prairie", giant: "tree", giantD: 0.18, prop: "stump", ground: G_PRAIRIE,
          enemies: [["slug", 0, 4], ["beetle", 40, 4], ["wasp", 75, 3], ["bombshroom", 120, 2], ["snake", 160, 2], ["fox", 300, 2]] },
        { name: "Sous-bois", giant: "tree", giantD: 0.55, prop: "stump", decor: "bush",
          ground: { base: "#5f8a48", patch: "#567f41", tuft: "#3f6b3a", hi: "#86b56c", flowers: ["#fdf3de", "#f6d36b", "#9cc56b", "#e2d6ff"], pebble: "#9a8f7a", pebbleDk: "#6f6655", shroom: "#c8553d", bush: "#3a5f34", bushHi: "#5b8a4a" },
          enemies: [["spider", 0, 4], ["beetle", 30, 3], ["crow", 60, 3], ["frog", 90, 3], ["weaver", 140, 2], ["toad", 220, 2]] },
        { name: "Champignonnière", giant: "shroom", giantD: 0.5, prop: "lantern", decor: "bigshroom",
          ground: { base: "#7d7290", patch: "#73688a", tuft: "#5a4f6e", hi: "#a597b8", flowers: ["#f29ad8", "#e2d6ff", "#f6d36b", "#c8553d"], pebble: "#9a90a8", pebbleDk: "#6a6078", shroom: "#c8553d" },
          enemies: [["bombshroom", 0, 4], ["moth", 0, 3], ["slug", 0, 2], ["puffball", 60, 3], ["toad", 150, 2]] },
      ] },
    { id: "marais", name: "Marais brumeux", desc: "Tourbière, étang et roselière. Ennemis plus coriaces.", hp: 1.15, gold: 1.25, unlock: "survie_3",
      swarm: ["moth", "slug", "frog", "toad"], bosses: ["mushking", "owl", "boar"],
      biomes: [
        { name: "Tourbière", giant: "tree", giantD: 0.3, prop: "basket", decor: "water",
          ground: { base: "#57735a", patch: "#4f6a52", tuft: "#33503a", hi: "#86a46a", flowers: ["#c9e3a0", "#e6f6fa", "#9ad0c4", "#f6d36b"], pebble: "#6f7a62", pebbleDk: "#4f5a48", shroom: "#9ad0c4", water: "#3d6b6e", waterHi: "#6fa8a8" },
          enemies: [["slug", 0, 4], ["moth", 25, 4], ["toad", 70, 3], ["hedgehog", 160, 3], ["turtle", 120, 2], ["badger", 300, 2]] },
        { name: "Étang", prop: "basket", decor: "pond",
          ground: { base: "#4a6f6a", patch: "#436661", tuft: "#2f5050", hi: "#7fa8a0", flowers: ["#e6f6fa", "#f29ad8", "#f6d36b", "#e6f6fa"], pebble: "#6f8a84", pebbleDk: "#4a6460", shroom: "#e6f6fa", water: "#2f5f70", waterHi: "#7fc0d0" },
          enemies: [["frog", 0, 4], ["moth", 0, 2], ["snake", 60, 3], ["toad", 40, 3], ["crow", 200, 2]] },
        { name: "Roselière", giant: "shroom", giantD: 0.15, prop: "basket", decor: "reeds",
          ground: { base: "#8a9a5a", patch: "#808f52", tuft: "#6b7a3a", hi: "#b8c87a", flowers: ["#f6d36b", "#fdf3de", "#c8553d", "#f2b05e"], pebble: "#a09a7a", pebbleDk: "#7a7458", shroom: "#c8553d", reed: "#6b5a30", reedHi: "#c9b070" },
          enemies: [["moth", 0, 3], ["hedgehog", 50, 3], ["spider", 80, 3], ["firefly", 100, 2], ["mole", 140, 2]] },
      ] },
    { id: "automne", name: "Bois d'automne", desc: "Bois roux, clairière dorée et terriers.", hp: 1.3, gold: 1.5, unlock: "boss_1",
      swarm: ["bunny", "fox", "wasp", "mole"], bosses: ["stag", "bigmole", "boar"],
      biomes: [
        { name: "Bois roux", giant: "tree", giantD: 0.5, prop: "leafpile", decor: "bush",
          ground: { base: "#b8833f", patch: "#ad7a3a", tuft: "#8a5a2b", hi: "#e8b25e", flowers: ["#c8553d", "#e8873a", "#f6d36b", "#8a5a3b"], pebble: "#9a8f7a", pebbleDk: "#6f6655", shroom: "#c8553d", bush: "#a0461f", bushHi: "#e8873a" },
          enemies: [["bunny", 0, 4], ["fox", 35, 4], ["hedgehog", 80, 3], ["wasp", 110, 3], ["salamander", 150, 2]] },
        { name: "Clairière dorée", giant: "tree", giantD: 0.15, prop: "leafpile",
          ground: { base: "#c9a24a", patch: "#bf9944", tuft: "#9a7a30", hi: "#f2d48a", flowers: ["#fdf3de", "#c8553d", "#f2b05e", "#fdf3de"], pebble: "#b0a080", pebbleDk: "#857858", shroom: "#c8553d" },
          enemies: [["bunny", 0, 4], ["wasp", 30, 3], ["bombshroom", 90, 2], ["crow", 180, 2]] },
        { name: "Terriers", giant: "rock", giantD: 0.4, prop: "stump", decor: "rock",
          ground: { base: "#8a6440", patch: "#7d5a3a", tuft: "#5a4030", hi: "#b08a60", flowers: ["#d39a52", "#f2b05e", "#8a5a3b", "#c8553d"], pebble: "#a09080", pebbleDk: "#6f6355", shroom: "#c8553d", rock: "#7a7068", rockHi: "#a89e94" },
          enemies: [["mole", 0, 4], ["rat", 20, 3], ["fox", 0, 2], ["badger", 60, 3], ["hedgehog", 120, 2]] },
      ] },
    { id: "nuit", name: "Nuit des lucioles", desc: "Forêt noire, clairière lunaire et souches mortes. Rapporte deux fois plus.", hp: 1.5, gold: 2, unlock: "survie_10", night: true,
      swarm: ["moth", "crow", "bombshroom", "fox"], bosses: ["owl", "mushking", "stag"],
      biomes: [
        { name: "Forêt noire", giant: "tree", giantD: 0.55, prop: "lantern", decor: "bush",
          ground: { base: "#264634", patch: "#22402f", tuft: "#1b3326", hi: "#3f6b3a", flowers: ["#7fd1c7", "#c9b3ff", "#f2d48a", "#7fd1c7"], pebble: "#4b5a52", pebbleDk: "#33403a", shroom: "#7fd1c7", bush: "#16291e", bushHi: "#2f4f3a" },
          enemies: [["moth", 0, 4], ["spider", 25, 4], ["crow", 60, 3], ["bat", 40, 4], ["fox", 100, 3]] },
        { name: "Clairière lunaire", giant: "shroom", giantD: 0.35, prop: "lantern",
          ground: { base: "#2f4458", patch: "#2a3e50", tuft: "#22323f", hi: "#5f7a94", flowers: ["#e6f6fa", "#c9b3ff", "#7fd1c7", "#f2d48a"], pebble: "#5a6a7a", pebbleDk: "#3a4858", shroom: "#7fd1c7" },
          enemies: [["moth", 0, 3], ["frog", 40, 3], ["bombshroom", 80, 3], ["firefly", 60, 3], ["badger", 150, 2]] },
        { name: "Souches mortes", giant: "rock", giantD: 0.35, prop: "stump", decor: "rock",
          ground: { base: "#3a3236", patch: "#332c30", tuft: "#28222a", hi: "#5a4f58", flowers: ["#c9b3ff", "#7fd1c7", "#f29ad8", "#c9b3ff"], pebble: "#5a5058", pebbleDk: "#3a3238", shroom: "#7fd1c7", rock: "#4a4248", rockHi: "#6a6068" },
          enemies: [["crow", 0, 3], ["bombshroom", 30, 3], ["mole", 60, 3], ["weaver", 90, 3], ["toad", 200, 2]] },
      ] },
  ];

  /* =====================================================================
     Mode Arène : arène fermée, manches chronométrées, boutique entre les manches
     ===================================================================== */
  var ARENA = {
    w: 240, h: 165,                // demi-largeur / demi-hauteur de l'arène (pixels de jeu)
    rounds: 20,                    // manches à gagner
    roundTime: function (n) { return Math.min(60, 22 + n * 2); },
    eliteEvery: 3, bossEvery: 5,   // manche d'élite (malus) et manche de boss
    income: function (n, kills) { return 14 + n * 2 + Math.floor(kills * 0.4); },
    interestPer: 5, interestMax: 5, // +1 noisette par tranche de 5 gardées, 5 max
    rerollBase: 3,
    maxPicks: 2,                   // choix de pouvoir max par fin de manche
    extraLevelCoins: 6,            // noisettes données par niveau au-delà du plafond
    // XP nécessaire pour passer du niveau L à L+1 en Arène (plus lent qu'en Survie)
    need: function (L) { return 12 + (L - 1) * 7 + Math.max(0, L - 12) * 6; },
    prices: { newWeapon: 18, upgrade: 10, perLevel: 5, item: 13, fusion: 55, heal: 8, maxhp: 12 },
    priceGrowth: 0.08,             // +8 % de prix par manche
    mods: [
      { id: "enrages", name: "Enragés", desc: "+35 % de vitesse ennemie", spd: 1.35 },
      { id: "blindes", name: "Blindés", desc: "+60 % de PV ennemis", hp: 1.6 },
      { id: "nuee", name: "Nuée", desc: "+60 % d'ennemis", rate: 1.6 },
      { id: "disette", name: "Disette", desc: "Revenu de manche divisé par deux", income: 0.5 },
      { id: "verre", name: "Peau de verre", desc: "+50 % de dégâts reçus", taken: 1.5 },
    ],
  };

  /* =====================================================================
     Mode Donjon : étages générés procéduralement, salles, élites, gardiens
     ===================================================================== */
  var DUNGEON = {
    floors: 3,
    rooms: function (floor) { return 7 + floor * 2; },            // salles par étage
    cellW: 470, cellH: 370,
    corridorMobs: 0.55,                                         // espacement de la grille des salles
    elites: function (floor) { return floor >= 2 ? 2 : 1; },        // salles d'élite par étage
    treasures: 1,
    extraLinks: 0.18,                                               // chance d'ajouter des boucles
    waves: function (floor) { return [4 + floor * 2, 3 + floor * 2]; },
    eliteHp: 3.5, eliteDmg: 1.5,
    guardHp: 14,                                                    // PV du gardien (× PV de base)
    pools: [
      ["slug", "beetle", "spider", "bombshroom", "rat", "rat", "bat", "puffball"],
      ["beetle", "spider", "frog", "mole", "hedgehog", "weaver", "snake", "salamander", "bat", "turtle"],
      ["frog", "mole", "hedgehog", "crow", "badger", "toad", "salamander", "weaver", "firefly", "turtle", "snake"],
    ],
    guards: ["bigmole", "queen", "stag"],     // mini-boss de fin d'étage
    finalBoss: "golem",
    affixes: function (floor) { return floor >= 2 ? 2 : 1; },
    healOnStairs: 0.35,
    // XP par niveau : ~1 niveau par salle au début, niveau ~5 fin d'étage 1, ~10 fin d'étage 2, ~15 au boss
    need: function (L) { return 18 + (L - 1) * 11; },
  };
  // Reliques : butin rare des salles d'élite et des gardiens (bonus pour la partie)
  // Types de donjon (remplacent les cartes en mode Donjon) : ambiance des étages, ennemis, mini-boss, boss final, dangers
  var DUNGEONS = [
    { id: "terriers", name: "Terriers oubliés", icon: "golem", desc: "Galeries de terre, grottes moussues et racines. Le donjon classique.",
      hp: 1, gold: 1, final: "golem", finalHp: 1.3, guards: ["bigmole", "queen", "stag"], poison: 0, pits: 1,
      themes: [
        { name: "Terriers", floor: "#4a3a2c", grid: "#43342a", wall: "#2a1d14", top: "#5a4330", dark: 0.5, accent: "#6b5440" },
        { name: "Grottes moussues", floor: "#34402f", grid: "#2c3727", wall: "#1b2218", top: "#4c5a3c", dark: 0.6, accent: "#55704a" },
        { name: "Racines profondes", floor: "#3d2a2e", grid: "#35242a", wall: "#1e1215", top: "#5a3038", dark: 0.7, accent: "#6a3a44" }],
      pools: [["slug", "beetle", "spider", "bombshroom", "rat", "rat", "bat", "puffball"],
              ["beetle", "spider", "frog", "mole", "hedgehog", "weaver", "snake", "salamander", "bat", "turtle"],
              ["frog", "mole", "hedgehog", "crow", "badger", "toad", "salamander", "weaver", "firefly", "turtle", "snake"]] },
    { id: "ruche", name: "Ruche abandonnée", icon: "queen", desc: "Alvéoles de cire et couloirs bourdonnants. Insectes partout, la Reine au fond.", unlock: "donjon_2",
      hp: 1.15, gold: 1.3, final: "queen", finalHp: 2.6, guards: ["queen", "bigmole", "queen"], poison: 0.05, pits: 0.6,
      themes: [
        { name: "Alvéoles", floor: "#8a6a2a", grid: "#7a5c22", wall: "#3a2a10", top: "#b8902e", dark: 0.45, accent: "#d8b040" },
        { name: "Couvain", floor: "#7a5226", grid: "#6a461f", wall: "#2e1e0c", top: "#a87830", dark: 0.55, accent: "#e0a83a" },
        { name: "Chambre royale", floor: "#6a3a1e", grid: "#5a3018", wall: "#2a140a", top: "#9a5a26", dark: 0.65, accent: "#f2c230" }],
      pools: [["wasp", "wasp", "beetle", "spider", "moth", "firefly"],
              ["wasp", "weaver", "spider", "moth", "firefly", "beetle", "bat"],
              ["wasp", "weaver", "firefly", "moth", "crow", "salamander", "spider"]] },
    { id: "crypte", name: "Crypte fongique", icon: "mushking", desc: "Champignons géants, spores et flaques toxiques. Beaucoup de poison.", unlock: "donjon_win",
      hp: 1.3, gold: 1.6, final: "mushking", finalHp: 2.2, guards: ["mushking", "bigmole", "mushking"], poison: 0.35, pits: 0.8,
      themes: [
        { name: "Mycélium", floor: "#3e3550", grid: "#352d46", wall: "#1a1424", top: "#5a4a72", dark: 0.55, accent: "#8a6ac8" },
        { name: "Spores bleues", floor: "#2a3e4a", grid: "#233540", wall: "#10181e", top: "#3a5a6a", dark: 0.65, accent: "#7fd1c7" },
        { name: "Cœur pourri", floor: "#2e3a24", grid: "#26311e", wall: "#12180c", top: "#4a5a30", dark: 0.75, accent: "#9ad04a" }],
      pools: [["slug", "puffball", "bombshroom", "moth", "frog"],
              ["puffball", "bombshroom", "toad", "frog", "weaver", "slug", "moth"],
              ["puffball", "bombshroom", "toad", "badger", "weaver", "turtle", "firefly"]] },
    { id: "taniere", name: "Tanière des bêtes", icon: "stag", desc: "Ruines envahies où rôdent renards, blaireaux et hérissons. Le Grand Cerf règne.", unlock: "boss_1",
      hp: 1.2, gold: 1.4, final: "stag", finalHp: 2.3, guards: ["boar", "bigmole", "stag"], poison: 0, pits: 1.3,
      themes: [
        { name: "Sous-bois en ruine", floor: "#4a4a34", grid: "#40402c", wall: "#22221a", top: "#62623e", dark: 0.5, accent: "#7a8a4a" },
        { name: "Halls effondrés", floor: "#4a3e36", grid: "#40352e", wall: "#221c18", top: "#6a5a4a", dark: 0.6, accent: "#a08060" },
        { name: "Trône du cerf", floor: "#3a2e24", grid: "#32281f", wall: "#1a140e", top: "#5a4630", dark: 0.7, accent: "#c09a5a" }],
      pools: [["rat", "fox", "bunny", "beetle", "hedgehog"],
              ["fox", "badger", "hedgehog", "crow", "snake", "rat"],
              ["badger", "fox", "hedgehog", "crow", "turtle", "salamander", "snake"]] },
  ];
  var RELICS = [
    { id: "croc", name: "Croc de loup", icon: "🦷", desc: "+15 % de dégâts" },
    { id: "plume", name: "Plume de geai", icon: "🪶", desc: "+12 % de vitesse" },
    { id: "coeur", name: "Sève de chêne", icon: "❤️", desc: "+30 PV max" },
    { id: "oeil", name: "Œil de chouette", icon: "👁️", desc: "+10 % de coups critiques" },
    { id: "trefle", name: "Gland porte-bonheur", icon: "🍀", desc: "+30 % de chance de butin" },
    { id: "mousse", name: "Mousse éternelle", icon: "💧", desc: "+0,8 PV par seconde" },
    { id: "sablier", name: "Sablier de sève", icon: "⏳", desc: "-10 % de recharge" },
    { id: "poche", name: "Poche sans fond", icon: "👝", desc: "+1 projectile" },
    { id: "loupe", name: "Loupe du sage", icon: "🔍", desc: "+20 % de zone d'effet" },
    { id: "aimant", name: "Aimant de noisetier", icon: "🧲", desc: "+60 % de ramassage" },
  ];

  /* =====================================================================
     Boutique (améliorations permanentes)
     ===================================================================== */
  var SHOP = [
    { id: "vigueur", name: "Vigueur", icon: "❤️", desc: "+10 PV max", max: 5, cost: 40 },
    { id: "force", name: "Force", icon: "🗡️", desc: "+5 % de dégâts", max: 5, cost: 60 },
    { id: "celerite", name: "Célérité", icon: "🐾", desc: "+5 % de vitesse", max: 3, cost: 50 },
    { id: "aimant", name: "Aimant", icon: "🧲", desc: "+15 % de ramassage", max: 3, cost: 40 },
    { id: "recup", name: "Récupération", icon: "💧", desc: "+0,2 PV par seconde", max: 3, cost: 60 },
    { id: "ecorce", name: "Écorce", icon: "🪵", desc: "+1 armure", max: 3, cost: 80 },
    { id: "zone", name: "Grandeur", icon: "🔍", desc: "+5 % de zone d'effet", max: 3, cost: 70 },
    { id: "sagesse", name: "Sagesse", icon: "📖", desc: "+8 % d'expérience", max: 5, cost: 60 },
    { id: "avarice", name: "Avarice", icon: "💰", desc: "+10 % de glands d'or", max: 5, cost: 50 },
    { id: "chance", name: "Chance", icon: "🍀", desc: "+15 % de butin", max: 3, cost: 70 },
    { id: "vivacite", name: "Vivacité", icon: "⚡", desc: "-3 % de recharge", max: 3, cost: 90 },
    { id: "relance", name: "Relance", icon: "🎲", desc: "+1 relance des choix par partie", max: 3, cost: 100, unlock: "niveau_10" },
    { id: "renaissance", name: "Renaissance", icon: "💖", desc: "Revis une fois par partie avec 50 % de PV", max: 1, cost: 400, unlock: "survie_5" },
  ];

  /* =====================================================================
     Arbre de compétences (permanent, payé en points de compétence)
     Un point par rang d'écureuil gagné, +2 par niveau de prestige.
     req : compétences qui doivent avoir au moins 1 niveau ; prestige : niveau de prestige requis
     pos : [distance le long de la tentacule, décalage latéral] pour l'affichage ; angle de branche en degrés
     ===================================================================== */
  var SKILL_BRANCHES = [
    { id: "attaque", name: "Attaque", color: "#c8553d", angle: -90 },
    { id: "survie", name: "Survie", color: "#5b8a4a", angle: 150 },
    { id: "fortune", name: "Fortune", color: "#c99a00", angle: 30 },
  ];
  var SKILLS = [
    { id: "a1", pos: [1, 0], branch: "attaque", name: "Crocs", icon: "🦷", desc: "+4 % de dégâts par niveau.", max: 3, cost: 1 },
    { id: "a2", pos: [2, -1], branch: "attaque", name: "Cadence", icon: "⏱️", desc: "-3 % de recharge par niveau.", max: 3, cost: 1, req: ["a1"] },
    { id: "a3", pos: [2, 1], branch: "attaque", name: "Portée", icon: "📏", desc: "+6 % de zone d'effet par niveau.", max: 3, cost: 1, req: ["a1"] },
    { id: "a5", pos: [3, -1.7], branch: "attaque", name: "Coup critique", icon: "💥", desc: "8 % de chances par niveau de doubler les dégâts.", max: 3, cost: 1, req: ["a2"] },
    { id: "a4", pos: [3, 0.2], branch: "attaque", name: "Salve", icon: "🎯", desc: "+1 projectile pour toutes les armes.", max: 1, cost: 3, req: ["a2", "a3"] },
    { id: "a6", pos: [4, 0], branch: "attaque", name: "Rage ancestrale", icon: "🔥", desc: "+25 % de dégâts sous 30 % de PV.", max: 1, cost: 3, req: ["a4"], prestige: 1 },
    { id: "s1", pos: [1, 0], branch: "survie", name: "Peau dure", icon: "❤️", desc: "+10 PV max par niveau.", max: 3, cost: 1 },
    { id: "s2", pos: [2, -1], branch: "survie", name: "Régénération", icon: "💧", desc: "+0,15 PV par seconde par niveau.", max: 3, cost: 1, req: ["s1"] },
    { id: "s3", pos: [2, 1], branch: "survie", name: "Carapace", icon: "🛡️", desc: "+1 armure par niveau.", max: 2, cost: 1, req: ["s1"] },
    { id: "s5", pos: [3, 1.7], branch: "survie", name: "Esquive", icon: "💨", desc: "4 % de chances par niveau d'esquiver un coup.", max: 3, cost: 1, req: ["s3"] },
    { id: "s4", pos: [3, -0.2], branch: "survie", name: "Second souffle", icon: "💖", desc: "+1 renaissance par partie.", max: 1, cost: 3, req: ["s2", "s3"] },
    { id: "s6", pos: [4, 0], branch: "survie", name: "Écorce millénaire", icon: "🌳", desc: "-15 % de dégâts reçus.", max: 1, cost: 3, req: ["s4"], prestige: 1 },
    { id: "f1", pos: [1, 0], branch: "fortune", name: "Flair", icon: "🧲", desc: "+10 % de ramassage par niveau.", max: 3, cost: 1 },
    { id: "f2", pos: [2, -1], branch: "fortune", name: "Avidité", icon: "💰", desc: "+8 % de glands d'or par niveau.", max: 3, cost: 1, req: ["f1"] },
    { id: "f3", pos: [2, 1], branch: "fortune", name: "Érudit", icon: "📖", desc: "+6 % d'expérience par niveau.", max: 3, cost: 1, req: ["f1"] },
    { id: "f5", pos: [3, 1.7], branch: "fortune", name: "Coffre de départ", icon: "🎁", desc: "Commence chaque partie avec un pouvoir au choix.", max: 1, cost: 2, req: ["f3"] },
    { id: "f4", pos: [3, -0.2], branch: "fortune", name: "Choix multiple", icon: "🃏", desc: "4 pouvoirs proposés à chaque niveau au lieu de 3.", max: 1, cost: 3, req: ["f2", "f3"] },
    { id: "f6", pos: [4, 0], branch: "fortune", name: "Mains d'or", icon: "✋", desc: "Les glands d'or ramassés comptent double.", max: 1, cost: 3, req: ["f4"], prestige: 1 },
  ];

  /* =====================================================================
     Prestige
     Conditions : avoir débloqué une part « req » de la progression (niveaux
     de boutique + niveaux de l'arbre) et posséder « cost » glands d'or.
     Les deux augmentent à chaque prestige. Le prestige remet tout à zéro et
     rapporte des points de prestige (✨) : tout débloqué = fullPoints.
     ===================================================================== */
  var PRESTIGE = {
    reqBase: 1 / 3,      // part de la progression requise au 1er prestige
    reqStep: 0.08,       // +8 points de pourcentage par prestige déjà fait
    reqMax: 0.9,
    costBase: 15000,     // glands d'or au 1er prestige (consommés)
    costGrowth: 1.4,     // ×1,4 à chaque prestige
    fullPoints: 1500,    // points de prestige si boutique + arbre sont au maximum
    upCosts: [50, 100, 250, 500, 1000, 2500, 5000, 10000],   // coût des niveaux d'amélioration de prestige
  };
  // Améliorations de prestige (permanentes, payées en points de prestige). « costs » remplace la grille upCosts.
  var PRESTIGE_SHOP = [
    { id: "multi", name: "Multiplicateur", icon: "✨", desc: "+25 % de points de prestige gagnés", max: 8 },
    { id: "racines", name: "Racines profondes", icon: "🗡️", desc: "+8 % de dégâts", max: 8 },
    { id: "ecorce", name: "Écorce ancienne", icon: "❤️", desc: "+15 PV max", max: 8 },
    { id: "tresor", name: "Trésor ancestral", icon: "💰", desc: "+12 % de glands d'or", max: 8 },
    { id: "seve", name: "Sève ancienne", icon: "📖", desc: "+10 % d'expérience", max: 8 },
    { id: "rang", name: "Mémoire du rang", icon: "⭐", desc: "+20 % d'XP de rang", max: 6 },
    { id: "points", name: "Graines de savoir", icon: "🌳", desc: "+2 points de compétence", max: 8 },
    { id: "heritage", name: "Héritage", icon: "🎁", desc: "Repars de chaque prestige avec +1 000 glands d'or", max: 6 },
    { id: "memoire", name: "Mémoire du terrier", icon: "🗝️", desc: "Garde tes succès, écureuils et cartes débloqués au prestige", max: 1, costs: [1000] },
  ];
  // XP de rang nécessaire pour passer du rang n au rang n+1
  function rankNeed(n) { return 100 + (n - 1) * 60; }

  /* =====================================================================
     Succès
     check(r, s) : r = partie en cours, s = statistiques totales
     ===================================================================== */
  var ACHIEVEMENTS = [
    { id: "premiers_pas", name: "Premiers pas", desc: "Termine ta première partie.", gold: 20, check: function (r) { return r.ended; } },
    { id: "survie_1", name: "Une minute de calme", desc: "Survis 1 minute.", gold: 25, check: function (r) { return r.time >= 60; } },
    { id: "survie_3", name: "Ça chauffe", desc: "Survis 3 minutes.", gold: 50, check: function (r) { return r.time >= 180; } },
    { id: "survie_5", name: "Increvable", desc: "Survis 5 minutes.", gold: 100, check: function (r) { return r.time >= 300; } },
    { id: "survie_10", name: "Gardien de la forêt", desc: "Survis 10 minutes.", gold: 250, check: function (r) { return r.time >= 600; } },
    { id: "survie_15", name: "Légende sylvestre", desc: "Survis 15 minutes.", gold: 500, check: function (r) { return r.time >= 900; } },
    { id: "tueur_100", name: "Nettoyage de printemps", desc: "Élimine 100 ennemis en une partie.", gold: 25, check: function (r) { return r.kills >= 100; } },
    { id: "tueur_500", name: "Tempête de glands", desc: "Élimine 500 ennemis en une partie.", gold: 75, check: function (r) { return r.kills >= 500; } },
    { id: "tueur_1500", name: "Fléau des bestioles", desc: "Élimine 1 500 ennemis en une partie.", gold: 200, check: function (r) { return r.kills >= 1500; } },
    { id: "total_1000", name: "Mille bestioles", desc: "Élimine 1 000 ennemis au total.", gold: 50, check: function (r, s) { return s.kills >= 1000; } },
    { id: "total_10000", name: "Dix mille !", desc: "Élimine 10 000 ennemis au total.", gold: 300, check: function (r, s) { return s.kills >= 10000; } },
    { id: "niveau_10", name: "Bien nourri", desc: "Atteins le niveau 10.", gold: 30, check: function (r) { return r.level >= 10; } },
    { id: "niveau_20", name: "Écureuil aguerri", desc: "Atteins le niveau 20.", gold: 80, check: function (r) { return r.level >= 20; } },
    { id: "niveau_35", name: "Maître du terrier", desc: "Atteins le niveau 35.", gold: 200, check: function (r) { return r.level >= 35; } },
    { id: "boss_1", name: "Chasseur de sanglier", desc: "Bats un boss.", gold: 100, check: function (r) { return r.bosses >= 1; } },
    { id: "boss_3", name: "Tableau de chasse", desc: "Bats 3 boss en une partie.", gold: 300, check: function (r) { return r.bosses >= 3; } },
    { id: "max_arme", name: "Arme ultime", desc: "Monte une arme au niveau 5.", gold: 50, check: function (r) { return r.maxedWeapon; } },
    { id: "fusion_1", name: "Alchimiste", desc: "Crée ta première fusion.", gold: 100, check: function (r) { return r.fusions >= 1; } },
    { id: "fusion_3", name: "Grand alchimiste", desc: "Crée 3 fusions en une partie.", gold: 300, check: function (r) { return r.fusions >= 3; } },
    { id: "arsenal", name: "Arsenal complet", desc: "Possède 6 armes et 6 objets en même temps.", gold: 120, check: function (r) { return r.nWeapons >= 6 && r.nPassives >= 6; } },
    { id: "legende", name: "Légendaire", desc: "Crée une fusion légendaire.", gold: 300, check: function (r) { return r.legend >= 1; } },
    { id: "bricoleur", name: "Casse-tout", desc: "Détruis 25 objets en une partie.", gold: 60, check: function (r) { return r.props >= 25; } },
    { id: "intouchable", name: "Intouchable", desc: "Passe 60 secondes d'affilée sans être touché.", gold: 60, check: function (r) { return r.time - r.lastHit >= 60; } },
    { id: "gourmand", name: "Gourmand", desc: "Mange 5 baies en une partie.", gold: 50, check: function (r) { return r.berries >= 5; } },
    { id: "riche", name: "Bas de laine", desc: "Gagne 1 000 glands d'or au total.", gold: 100, check: function (r, s) { return s.goldEarned >= 1000; } },
    { id: "troupe", name: "Toute la famille", desc: "Joue une partie avec chaque écureuil.", gold: 200, check: function (r, s) { return CHARACTERS.every(function (c) { return s.played[c.id]; }); } },
    { id: "explorateur", name: "Explorateur", desc: "Joue sur chaque carte.", gold: 200, check: function (r, s) { return MAPS.every(function (m) { return s.maps[m.id]; }); } },
    { id: "rang_5", name: "Écureuil confirmé", desc: "Atteins le rang 5.", gold: 80, check: function (r, s) { return s.rank >= 5; } },
    { id: "rang_15", name: "Vétéran du chêne", desc: "Atteins le rang 15.", gold: 250, check: function (r, s) { return s.rank >= 15; } },
    { id: "prestige_1", name: "Renouveau", desc: "Fais ton premier prestige.", gold: 0, check: function (r, s) { return s.prestige >= 1; } },
    { id: "arbre", name: "Arbre fleuri", desc: "Dépense 10 points de compétence.", gold: 100, check: function (r, s) { return s.spent >= 10; } },
    { id: "arene_10", name: "Gladiateur", desc: "Atteins la manche 10 en Arène.", gold: 150, check: function (r) { return r.mode === "arena" && r.round >= 10; } },
    { id: "arene_win", name: "Champion de l'arène", desc: "Gagne les 20 manches de l'Arène.", gold: 500, check: function (r) { return r.mode === "arena" && r.won; } },
    { id: "donjon_2", name: "Spéléologue", desc: "Atteins le 2e étage du Donjon.", gold: 150, check: function (r) { return r.mode === "dungeon" && r.dg && r.dg.floor >= 2; } },
    { id: "donjon_win", name: "Pourfendeur de donjon", desc: "Bats le boss final du Donjon.", gold: 500, check: function (r) { return r.mode === "dungeon" && r.won; } },
    { id: "prevoyant", name: "Prévoyant", desc: "Achète 10 améliorations dans la boutique.", gold: 50, check: function (r, s) { return s.bought >= 10; } },
    { id: "coeur_chene", name: "Racines solides", desc: "Survis 5 minutes en mode Difficile.", gold: 300, check: function (r) { return r.hard && r.time >= 300; } },
  ];

  /* =====================================================================
     Ennemis
     ===================================================================== */
  var ENEMIES = {
    slug:     { sprite: "slug",     hp: 8,   spd: 24, dmg: 6,  r: 5,  xp: 1, color: "#d9cf63" },
    beetle:   { sprite: "beetle",   hp: 24,  spd: 26, dmg: 8,  r: 5,  xp: 2, color: "#a88ad8" },
    wasp:     { sprite: "wasp",     hp: 9,   spd: 48, dmg: 5,  r: 4,  xp: 1, color: "#f2c230", move: "wobble" },
    spider:   { sprite: "spider",   hp: 20,  spd: 34, dmg: 8,  r: 5,  xp: 2, color: "#5a3a62", move: "wobble" },
    crow:     { sprite: "crow",     hp: 32,  spd: 38, dmg: 10, r: 6,  xp: 3, color: "#4a4a6a" },
    toad:     { sprite: "toad",     hp: 95,  spd: 15, dmg: 14, r: 8,  xp: 6, color: "#9cae4f" },
    fox:      { sprite: "fox",      hp: 22,  spd: 46, dmg: 8,  r: 6,  xp: 2, color: "#e06a2c" },
    hedgehog: { sprite: "hedgehog", hp: 45,  spd: 20, dmg: 10, r: 6,  xp: 3, color: "#a06a3e", ai: "spiker", shot: 7 },
    bunny:    { sprite: "bunny",    hp: 14,  spd: 42, dmg: 6,  r: 5,  xp: 1, color: "#d8c2a0", move: "hop" },
    badger:   { sprite: "badger",   hp: 110, spd: 18, dmg: 15, r: 8,  xp: 6, color: "#8d8a86" },
    moth:     { sprite: "moth",     hp: 12,  spd: 32, dmg: 5,  r: 5,  xp: 1, color: "#c9b3ff", move: "wobble" },
    // attaques spéciales : zones rouges au sol et projectiles rouges
    bombshroom: { sprite: "bombshroom", hp: 14, spd: 32, dmg: 6, r: 5, xp: 2, color: "#c8553d", ai: "bomber", blast: 18, blastR: 24 },
    frog:     { sprite: "frog",     hp: 18,  spd: 24, dmg: 6,  r: 5,  xp: 2, color: "#7fd1c7", ai: "spitter", shot: 8 },
    mole:     { sprite: "mole",     hp: 30,  spd: 52, dmg: 8,  r: 6,  xp: 3, color: "#6a5a6a", ai: "mole", blast: 14, blastR: 22 },
    boar:     { sprite: "boar",     hp: 900, spd: 22, dmg: 25, r: 12, xp: 40, boss: true, name: "Grand Sanglier", color: "#8f6243" },
    owl:      { sprite: "owl",      hp: 1400, spd: 30, dmg: 22, r: 10, xp: 60, boss: true, name: "Hibou Ancien", color: "#a597b8" },
    // nouveaux comportements
    salamander: { sprite: "salamander", hp: 34, spd: 30, dmg: 9, r: 6, xp: 3, color: "#d8572a", ai: "dasher" },
    weaver:   { sprite: "weaver",   hp: 28,  spd: 26, dmg: 7,  r: 6,  xp: 3, color: "#6a4a8a", ai: "webber" },
    firefly:  { sprite: "luciole",  hp: 6,   spd: 58, dmg: 4,  r: 4,  xp: 1, color: "#f6e06b", move: "wobble", ai: "bomber", blast: 9, blastR: 15, fuse: 0.35 },
    puffball: { sprite: "puffball", hp: 30,  spd: 14, dmg: 6,  r: 6,  xp: 3, color: "#c9b88a", ai: "sporer" },
    turtle:   { sprite: "turtle",   hp: 80,  spd: 14, dmg: 12, r: 7,  xp: 5, color: "#6a9a4a", ai: "shell" },
    snake:    { sprite: "snake",    hp: 26,  spd: 36, dmg: 9,  r: 5,  xp: 2, color: "#8aba5a", move: "zigzag", ai: "lunger" },
    bat:      { sprite: "bat",      hp: 14,  spd: 44, dmg: 6,  r: 5,  xp: 2, color: "#5a4a5a", ai: "swoop" },
    rat:      { sprite: "rat",      hp: 7,   spd: 54, dmg: 4,  r: 4,  xp: 1, color: "#a09890" },
    // nouveaux boss et mini-boss
    queen:    { sprite: "queen",    hp: 1000, spd: 34, dmg: 18, r: 10, xp: 45, boss: true, bossAi: "queen", name: "Reine des guêpes", color: "#f2c230" },
    stag:     { sprite: "stag",     hp: 1300, spd: 26, dmg: 24, r: 11, xp: 55, boss: true, bossAi: "stag", name: "Grand Cerf", color: "#a06a3e" },
    mushking: { sprite: "mushking", hp: 1500, spd: 16, dmg: 20, r: 11, xp: 60, boss: true, bossAi: "mushking", name: "Roi Champignon", color: "#c8553d" },
    bigmole:  { sprite: "bigmole",  hp: 900,  spd: 30, dmg: 20, r: 10, xp: 40, boss: true, bossAi: "bigmole", name: "Taupe géante", color: "#6a5a6a" },
    golem:    { sprite: "golem",    hp: 2600, spd: 15, dmg: 28, r: 13, xp: 120, boss: true, bossAi: "golem", name: "Golem de racines", color: "#7a6a52" },
  };

  /* =====================================================================
     Objets à effets (ramassés au sol, empilables), avec raretés
     ===================================================================== */
  var RARITIES = [
    { id: "commun", name: "Commun", color: "#e8e0d0", weight: 70 },
    { id: "peu", name: "Peu commun", color: "#7ac850", weight: 24 },
    { id: "rare", name: "Rare", color: "#4aa3df", weight: 8 },
    { id: "legende", name: "Légendaire", color: "#ff5a3a", weight: 2 },
  ];
  var ITEMS = [
    { id: "bonheur",  r: 0, icon: "🌰", name: "Gland porte-bonheur", desc: "6 % de chance par coup de gagner 1 gland d'or (+1 par exemplaire)." },
    { id: "griffes",  r: 0, icon: "🗡️", name: "Ergot tranchant", desc: "+7 % de coups critiques." },
    { id: "plume",    r: 0, icon: "🪶", name: "Plume de vent", desc: "+8 % de vitesse." },
    { id: "baies",    r: 0, icon: "🍇", name: "Baies séchées", desc: "Chaque ennemi tué rend 1 PV." },
    { id: "fourche",  r: 0, icon: "🪵", name: "Bâton fourchu", desc: "+50 % de dégâts aux ennemis presque intacts." },
    { id: "ecaille",  r: 0, icon: "🐢", name: "Écaille de tortue", desc: "Encaisse 2 dégâts de moins par coup." },
    { id: "sablier",  r: 0, icon: "⏳", name: "Sablier ébréché", desc: "-6 % de recharge des armes." },
    { id: "gluant",   r: 0, icon: "🍄", name: "Champignon gluant", desc: "10 % de chance par coup de ralentir fortement l'ennemi." },
    { id: "pile",     r: 1, icon: "⚡", name: "Noisette électrique", desc: "10 % de chance par coup : un éclair touche 3 ennemis (25 dégâts)." },
    { id: "follet",   r: 1, icon: "🔥", name: "Feu follet", desc: "Les ennemis tués explosent (20 dégâts autour)." },
    { id: "tique",    r: 1, icon: "🩸", name: "Tique gourmande", desc: "20 % de chance par coup de rendre 1 PV." },
    { id: "pomme",    r: 1, icon: "🌲", name: "Pomme de pin bouclier", desc: "4 s sans être touché : bouclier de 10 % des PV max." },
    { id: "givre",    r: 1, icon: "❄️", name: "Dague de givre", desc: "6 % de chance par coup de geler l'ennemi 1,5 s." },
    { id: "missile",  r: 1, icon: "🚀", name: "Pomme de pin guidée", desc: "10 % de chance par coup de tirer une pomme de pin chercheuse (30 dégâts)." },
    { id: "cape",     r: 1, icon: "🧣", name: "Cape d'ombre", desc: "Quand tu es touché : +35 % de vitesse pendant 2 s." },
    { id: "coeurchene", r: 2, icon: "🌳", name: "Cœur de chêne", desc: "+25 % de PV max et +1 PV/s." },
    { id: "corne",    r: 2, icon: "🦌", name: "Bois de cerf", desc: "+10 % de critiques, et les critiques font ×3." },
    { id: "lune",     r: 2, icon: "🌙", name: "Collier lunaire", desc: "Les ennemis tués ont 4 % de chance de laisser des baies." },
    { id: "totem",    r: 2, icon: "🌩️", name: "Totem d'orage", desc: "Toutes les 3 s, la foudre frappe un ennemi proche (45 dégâts)." },
    { id: "rage",     r: 2, icon: "💢", name: "Rage du chêne", desc: "+4 % de dégâts par ennemi proche (max +32 %)." },
    { id: "glandsjumeaux", r: 0, coop: true, icon: "🤝", name: "Glands jumeaux", desc: "COOP · +10 % de critiques avec un allié à moins de 70 px." },
    { id: "ralliement", r: 1, coop: true, icon: "📯", name: "Cri de ralliement", desc: "COOP · Quand un allié tombe : +40 % de dégâts pendant 6 s ; tu relèves 50 % plus vite." },
    { id: "talisman", r: 2, coop: true, icon: "💞", name: "Talisman d'amitié", desc: "COOP · 10 % de chance par coup de soigner ton allié le plus proche (3 PV)." },
    { id: "sifflet",   r: 0, icon: "🎶", name: "Sifflet de berger", desc: "Un hérisson vient t'aider (+1 par exemplaire, plus fort à chaque copie)." },
    { id: "ruche",     r: 1, icon: "🛸", name: "Nid de lucioles", desc: "Un drone-luciole tourne autour de toi (+1 par exemplaire)." },
    { id: "caisse",    r: 1, icon: "🧰", name: "Caisse à outils", desc: "Pose une tourelle toutes les 12 s (plus souvent avec des copies)." },
    { id: "oeuf",      r: 2, icon: "🥚", name: "Œuf de chouette", desc: "Une chouette éclot et chasse avec toi (+1 par exemplaire)." },
    { id: "selle",     r: 1, icon: "🪲", name: "Selle de scarabée", desc: "MONTURE · +20 % de vitesse, tu écrases les ennemis que tu touches." },
    { id: "lievre",    r: 2, icon: "🐇", name: "Lièvre de course", desc: "MONTURE · +35 % de vitesse et +8 % d'esquive." },
    { id: "laie",      r: 3, icon: "🐗", name: "Laie de guerre", desc: "MONTURE · +25 % de vitesse, +2 d'armure, charge et renverse tout sur son passage." },
    { id: "carnet", r: 0, solo: true, icon: "📓", name: "Carnet de survie", desc: "SOLO · +0,5 PV/s et +5 % d'XP." },
    { id: "lanterne", r: 1, solo: true, icon: "🏮", name: "Bougie de l'ermite", desc: "SOLO · -15 % de recharge quand tes PV sont au-dessus de 80 %." },
    { id: "pleinelune", r: 2, solo: true, icon: "🌕", name: "Pleine lune", desc: "SOLO · +25 % de dégâts contre les élites et les boss." },
    // ---- objets à débloquer par des quêtes (re-verrouillés à chaque prestige)
    { id: "trefle4", r: 2, quest: "q_coffres", icon: "🍀", name: "Trèfle à quatre feuilles", desc: "+40 % de chance de butin." },
    { id: "cor", r: 1, quest: "q_elites", icon: "📣", name: "Cor de guerre", desc: "Après avoir tué une élite : +15 % de dégâts pendant 5 s." },
    { id: "masque", r: 3, quest: "q_pactes", icon: "👺", name: "Masque du démon", desc: "+10 % de dégâts par pacte du diable scellé." },
    { id: "halo", r: 2, quest: "q_sanctuaires", icon: "🌟", name: "Halo d'or", desc: "+0,5 PV/s par sanctuaire activé dans la partie (max 5)." },
    { id: "fiole", r: 1, quest: "q_survie8", icon: "🧪", name: "Fiole de rage", desc: "Sous 30 % de PV : les armes rechargent 30 % plus vite." },
    { id: "trophee", r: 2, quest: "q_folie", icon: "🏆", name: "Trophée de chasse", desc: "+25 % de dégâts contre les boss." },
    { id: "graine", r: 0, quest: "q_niveau15", icon: "🌱", name: "Graine ancienne", desc: "+10 PV max et +0,2 PV/s." },
    { id: "boussole", r: 0, quest: "q_palier", icon: "🧭", name: "Boussole", desc: "+10 % de vitesse, les sanctuaires se chargent 30 % plus vite." },
    { id: "dague_ombre", r: 3, quest: "q_donjon", icon: "🗡️", name: "Dague de l'ombre", desc: "15 % de chance par coup d'infliger ×4 dégâts." },
    { id: "nid", r: 2, quest: "q_releve", icon: "🪺", name: "Nid douillet", desc: "+1 renaissance, et tu relèves deux fois plus vite." },
    { id: "plume_solo", r: 1, quest: "q_arene", icon: "🪶", name: "Plume solitaire", desc: "+20 % d'expérience." },
    { id: "eclat", r: 2, quest: "q_massacre", icon: "💠", name: "Éclat de météore", desc: "+20 % de zone d'effet." },
    // ---- pool des boss (lâchés seulement par les boss)
    { id: "plume_hibou", r: 2, pool: "boss", icon: "🦉", name: "Plume du Hibou ancien", desc: "BOSS · +1 projectile pour toutes les armes." },
    { id: "bois_roi", r: 2, pool: "boss", icon: "🦌", name: "Couronne de bois", desc: "BOSS · +25 PV max et +1 armure." },
    { id: "dard_reine", r: 2, pool: "boss", icon: "🐝", name: "Dard de la Reine", desc: "BOSS · Tes coups critiques explosent (15 dégâts autour)." },
    { id: "coeur_golem", r: 3, pool: "boss", icon: "🗿", name: "Cœur de golem", desc: "BOSS · +50 PV max, +2 armure, -5 % de vitesse." },
    // ---- pacte du diable (autel de sang : coûte 20 % de PV max)
    { id: "pacte_force", r: 3, pool: "diable", icon: "😈", name: "Pacte de force", desc: "DIABLE · +40 % de dégâts." },
    { id: "pacte_ailes", r: 3, pool: "diable", icon: "🦇", name: "Ailes de chauve-souris", desc: "DIABLE · +25 % de vitesse et -20 % de recharge." },
    { id: "pacte_calice", r: 3, pool: "diable", icon: "🍷", name: "Calice de sang", desc: "DIABLE · Chaque ennemi tué rend 3 PV." },
    { id: "pacte_ombre", r: 3, pool: "diable", icon: "👁️", name: "Ombre du démon", desc: "DIABLE · +2 projectiles pour toutes les armes." },
    // ---- sacré (statue sainte, seulement sans pacte)
    { id: "aureole", r: 3, pool: "sacre", icon: "😇", name: "Auréole", desc: "SACRÉ · +20 % de dégâts et +15 % de vitesse." },
    { id: "plume_ange", r: 3, pool: "sacre", icon: "🕊️", name: "Plume d'ange", desc: "SACRÉ · Un bouclier qui bloque un coup, rechargé toutes les 10 s." },
    { id: "eau_benite", r: 3, pool: "sacre", icon: "💧", name: "Eau bénite", desc: "SACRÉ · Régénère 2 PV par seconde." },
    { id: "lumiere", r: 3, pool: "sacre", icon: "✨", name: "Lumière divine", desc: "SACRÉ · Toutes les 4 s, une onde de lumière blesse tout autour (60 dégâts)." },
    { id: "phenix",   r: 3, icon: "🌅", name: "Plume de phénix", desc: "Une renaissance de plus." },
    { id: "couronne", r: 3, icon: "👑", name: "Couronne de glands", desc: "+50 % d'or et d'XP." },
    { id: "meteore",  r: 3, icon: "☄️", name: "Cœur de météore", desc: "4 % de chance par coup de faire tomber un météore (150 dégâts)." },
    { id: "horloge",  r: 3, icon: "🕰️", name: "Horloge de la forêt", desc: "-20 % de recharge et +15 % de dégâts." },
  ];

  /* =====================================================================
     Difficulté qui monte avec le temps (à la Risk of Rain) et sanctuaires
     ===================================================================== */
  var TIERS = [
    { name: "Très facile", color: "#5ac85a" }, { name: "Facile", color: "#9ad04a" }, { name: "Moyen", color: "#e8d040" },
    { name: "Difficile", color: "#f0a030" }, { name: "Très difficile", color: "#f06a30" }, { name: "Épuisant", color: "#e0383a" },
    { name: "Infernal", color: "#c02860" }, { name: "Impossible", color: "#8a2ab0" }, { name: "Je te vois", color: "#5a1a8a" },
    { name: "J'arrive", color: "#3a1070" }, { name: "Cours", color: "#2a0a50" }, { name: "HAHAHAHA", color: "#2a0a30" },
    { name: "HAHAHAHAHAHA", color: "#40081a" }, { name: "HAAAAAAAAAAAA", color: "#600010" }, { name: "AAAAAAAAAAAAAAAA", color: "#900010" },
    { name: "C'est la fin", color: "#100008" },
  ];
  var TIER = {
    minutes: 2.4,          // minutes par palier (mode Normal)
    hp: 0.12, dmg: 0.18, spawn: 0.1, elite: 0.006, // bonus par palier (continue au-delà du dernier palier)
  };
  // Rage : passé 10 min sur une même carte, les bêtes s'énervent de plus en plus vite (dégâts et vitesse)
  var RAGE = { start: 600, dmgK: 0.5, dmgPow: 1.6, spdPerMin: 0.07, spdMax: 2.2, hpPerMin: 0.25 };
  // Sanctuaires : on les active en restant dans leur zone (jauge au sol)
  var SHRINES = [
    { id: "coffre", name: "Coffre scellé",  color: "#f6d36b", time: 1.4, weight: 30, desc: "Paie des glands pour un objet." },
    { id: "defi",   name: "Totem de défi",  color: "#ff5a3a", time: 2.0, weight: 18, desc: "Fait venir des élites. Récompense quand elles sont toutes mortes." },
    { id: "sang",   name: "Autel de sang",  color: "#c0283a", time: 2.0, weight: 12, desc: "Pacte du diable : -20 % de PV max contre un objet maudit." },
    { id: "boss",   name: "Autel du boss",  color: "#b07cf0", time: 2.5, weight: 9,  desc: "Invoque un boss tout de suite." },
    { id: "folie",  name: "Totem de folie", color: "#ff40c0", time: 2.0, weight: 9,  desc: "Les prochains boss arrivent en plus d'exemplaires (cumulable)." },
    { id: "soin",   name: "Source claire",  color: "#6ad8ff", time: 1.4, weight: 14, desc: "Soigne toute l'équipe de moitié." },
    { id: "marchand", name: "Écureuil marchand", color: "#7ad07a", time: 1.2, weight: 14, desc: "Vend un objet peu commun ou mieux contre des glands." },
    { id: "fortune",  name: "Totem de fortune",  color: "#ffd84a", time: 1.2, weight: 12, desc: "Mise des glands : tout perdre, doubler la mise ou gagner un objet." },
    { id: "sacrifice",name: "Autel du sacrifice",color: "#e07a3a", time: 2.0, weight: 10, desc: "Sacrifie un de tes objets au hasard contre un objet plus rare." },
    { id: "sacre",  name: "Statue sainte",  color: "#fff3b0", time: 2.5, weight: 6,  desc: "Un objet sacré… si tu n'as fait aucun pacte." },
  ];

  /* =====================================================================
     Quêtes : débloquent des objets (comme dans les roguelites), à refaire à chaque prestige
     r = partie en cours (ou finie)
     ===================================================================== */
  var QUESTS = [
    { id: "q_niveau15", desc: "Atteins le niveau 15 dans une partie.", check: function (r) { return r.level >= 15; } },
    { id: "q_palier", desc: "Atteins le palier de difficulté « Difficile ».", check: function (r) { return (r.tier || 0) >= 3; } },
    { id: "q_coffres", desc: "Ouvre 3 coffres scellés dans une partie.", check: function (r) { return (r.chestsOpened || 0) >= 3; } },
    { id: "q_elites", desc: "Tue 15 élites dans une partie.", check: function (r) { return (r.elites || 0) >= 15; } },
    { id: "q_sanctuaires", desc: "Active 6 sanctuaires dans une partie.", check: function (r) { return (r.shrinesUsed || 0) >= 6; } },
    { id: "q_survie8", desc: "Survis 8 minutes.", check: function (r) { return r.time >= 480; } },
    { id: "q_pactes", desc: "Scelle 2 pactes du diable dans une partie.", check: function (r) { return (r.devil || 0) >= 2; } },
    { id: "q_folie", desc: "Bats un boss pendant la folie (totem de folie activé).", check: function (r) { return (r.madBoss || 0) >= 1; } },
    { id: "q_massacre", desc: "Tue 1 000 ennemis dans une partie.", check: function (r) { return r.kills >= 1000; } },
    { id: "q_releve", desc: "Relève 3 fois un coéquipier (ou ton jumeau) dans une partie.", check: function (r) { return (r.revivesDone || 0) >= 3; } },
    { id: "q_arene", desc: "Atteins la manche 10 de l'Arène en solo.", check: function (r) { return r.mode === "arena" && !r.coop && r.round >= 10; } },
    { id: "q_donjon", desc: "Bats le boss final du Donjon.", check: function (r) { return r.mode === "dungeon" && r.won; } },
    // quêtes qui débloquent des armes, objets de niveau, fusions et persos
    { id: "q_coopboss", desc: "Bats un boss en coop (ou avec les jumeaux).", check: function (r) { return r.duo && r.bosses >= 1; } },
    { id: "q_seul", desc: "Survis 6 minutes en solo, sans partenaire.", check: function (r) { return !r.duo && r.time >= 360; } },
    { id: "q_crits", desc: "Fais 400 coups critiques dans une partie.", check: function (r) { return (r.crits || 0) >= 400; } },
    { id: "q_esquive", desc: "Esquive 15 coups dans une partie.", check: function (r) { return (r.dodges || 0) >= 15; } },
    { id: "q_riche", desc: "Ramasse 400 glands d'or dans une partie.", check: function (r) { return r.gold >= 400; } },
    { id: "q_releve1", desc: "Relève un coéquipier (ou ton jumeau) en coop.", check: function (r) { return r.duo && (r.revivesDone || 0) >= 1; } },
    { id: "q_druide", desc: "Survis 7 minutes avec Fougère.", check: function (r) { return r.char === "druide" && r.time >= 420; } },
    { id: "q_bucheron", desc: "Survis 7 minutes avec Bûche.", check: function (r) { return r.char === "bucheron" && r.time >= 420; } },
    { id: "q_ninja", desc: "Survis 7 minutes avec Ombre.", check: function (r) { return r.char === "ninja" && r.time >= 420; } },
    { id: "q_mage", desc: "Survis 7 minutes avec Myrtille.", check: function (r) { return r.char === "mage" && r.time >= 420; } },
    { id: "q_chevalier", desc: "Survis 7 minutes avec Bastien.", check: function (r) { return r.char === "chevalier" && r.time >= 420; } },
    { id: "q_intouchable", desc: "Ne prends aucun coup pendant 2 minutes d'affilée (après 3 min de jeu).", check: function (r) { return r.time >= 180 && r.time - (r.lastHit || 0) >= 120; } },
    { id: "q_duo10", desc: "Survis 10 minutes.", check: function (r) { return r.time >= 600; } },
  ];

  /* =====================================================================
     Pouvoirs d'élite : s'appliquent à n'importe quel ennemi, boss compris
     ===================================================================== */
  var AFFIXES = [
    { id: "ardent",     name: "Ardent",     color: "#ff7a2a", desc: "laisse des flammes" },
    { id: "glacial",    name: "Glacial",    color: "#8fd8ff", desc: "ralentit autour de lui" },
    { id: "rapide",     name: "Rapide",     color: "#f6f6a0", desc: "très rapide" },
    { id: "blinde",     name: "Blindé",     color: "#c0c8d0", desc: "encaisse la moitié des dégâts" },
    { id: "vampire",    name: "Vampire",    color: "#e0283a", desc: "se soigne en frappant" },
    { id: "explosif",   name: "Explosif",   color: "#ff4a2a", desc: "explose à sa mort" },
    { id: "invocateur", name: "Invocateur", color: "#b07cf0", desc: "appelle des renforts" },
    { id: "electrique", name: "Électrique", color: "#6ad8ff", desc: "décharges autour de lui" },
    { id: "epineux",    name: "Épineux",    color: "#9cd04a", desc: "renvoie des épines quand on le frappe" },
  ];

  var DIFFICULTIES = {
    normal: { name: "Normal", hp: 1, spd: 1, spawn: 1, gold: 1, score: 1 },
    // Difficile : la montée en difficulté de la 0.27.0 (paliers toutes les 2 min, +22 % de dégâts par palier, invulnérabilité courte)
    difficile: { name: "Difficile", hp: 1.3, spd: 1.05, spawn: 1.15, gold: 1.6, score: 1.5, unlock: "survie_5",
                 tier: { minutes: 2.0, hp: 0.14, dmg: 0.22, spawn: 0.1, elite: 0.006 }, inv: 0.22 },
  };

  /* =====================================================================
     2.0 : les 3 états du mouvement, les postures et les règles uniques
     ===================================================================== */
  var V2 = { anchorT: 0.4, volteCd: 3, turnDot: -0.5, turnRun: 0.2, stopRun: 0.35 };
  // une posture = une règle par état (Ancré · Mouvement · Volte) ; la 1re est libre, les 2 autres par quête
  var POSTURES = {
    noisette: [
      { id: "tireuse",  name: "Tireuse",  color: "#f2b05e", a: "Ancrée, sa cadence monte (jusqu'à +60 %).", m: "Normal.", v: "Une couronne de glands part tout autour." },
      { id: "acrobate", name: "Acrobate", color: "#6ad8ff", quest: "p_noisette2", a: "Ancrée, +15 % d'esquive.", m: "+10 % de vitesse.", v: "Roulade invulnérable dans ta direction." },
      { id: "glaneuse", name: "Glaneuse", color: "#9cc56b", quest: "p_noisette3", a: "Ancrée, ramassage +50 %.", m: "En mouvement, ramassage x2.", v: "Aspire les noisettes proches." },
    ],
    capitaine: [
      { id: "bordee",   name: "Bordée",   color: "#c8553d", a: "Ancré, l'équipage tire en salve, deux fois plus vite.", m: "Normal.", v: "Bordée : tout l'équipage tire d'un coup, dégâts x2." },
      { id: "abordage", name: "Abordage", color: "#f6d36b", quest: "p_capitaine2", a: "Ancré, l'équipage se range en cercle autour de toi.", m: "Normal.", v: "À l'abordage : l'équipage charge les ennemis proches." },
      { id: "convoi",   name: "Convoi",   color: "#9cc56b", quest: "p_capitaine3", a: "Ancré, un matelot rejoint la file toutes les 8 s.", m: "La file s'allonge plus vite (recrute 2 fois plus vite, 10 matelots max).", v: "La file fouette : chaque matelot frappe autour de lui." },
    ],
    planeur: [
      { id: "pique",    name: "Piqué",    color: "#6ad8ff", a: "Accroché, se recharge 2 fois plus vite.", m: "Normal.", v: "Plongeon : invulnérable, frappe fort à l'arrivée." },
      { id: "courant",  name: "Courant",  color: "#b07cf0", quest: "p_planeur2", a: "Accroché, rien de spécial.", m: "Plus il va vite, plus il fait mal (jusqu'à +60 %).", v: "Rafale qui repousse et blesse autour de lui." },
      { id: "perchoir", name: "Perchoir", color: "#f2b05e", quest: "p_planeur3", a: "Accroché, portée x1,6 et +30 % de dégâts.", m: "Normal.", v: "Une gerbe de 5 plumes vers l'avant." },
    ],
  };
  var V2CH = {
    noisette:  { order: 0, rule: "Choisit parmi 4 cartes au lieu de 3. L'écureuil d'apprentissage." },
    capitaine: { order: 1, rule: "Une file de matelots le suit et tire. Un coup reçu coûte le dernier matelot au lieu de PV ; les noisettes d'XP recrutent." },
    planeur:   { order: 2, rule: "Glisse sans cesse (inertie) et survole les obstacles. Ne s'ancre qu'accroché à un arbre ou à une souche." },
  };
  var CHAR_ALL = CHARACTERS.slice();
  CHARACTERS = CHARACTERS.filter(function (c) { return V2CH[c.id]; }).map(function (c) {
    var v = V2CH[c.id]; c.rule = v.rule; c.order = v.order; c.weapon = "katana"; c.unlock = null; c.quest = null; c.price = 0; c.mods = {}; c.desc = v.rule; return c;
  }).sort(function (a, b) { return a.order - b.order; });
  QUESTS = QUESTS.concat([
    { id: "p_noisette2",  desc: "Survis 5 minutes avec Noisette.", check: function (r) { return r.char === "noisette" && r.time >= 300; } },
    { id: "p_noisette3",  desc: "Atteins le niveau 15 avec Noisette.", check: function (r) { return r.char === "noisette" && r.level >= 15; } },
    { id: "p_capitaine2", desc: "Recrute 25 matelots dans une partie avec le Capitaine.", check: function (r) { return r.char === "capitaine" && (r.recruits || 0) >= 25; } },
    { id: "p_capitaine3", desc: "Survis 8 minutes avec le Capitaine.", check: function (r) { return r.char === "capitaine" && r.time >= 480; } },
    { id: "p_planeur2",   desc: "Fais 40 Voltes dans une partie avec le Planeur.", check: function (r) { return r.char === "planeur" && (r.voltes || 0) >= 40; } },
    { id: "p_planeur3",   desc: "Survis 8 minutes avec le Planeur.", check: function (r) { return r.char === "planeur" && r.time >= 480; } },
  ]);

  /* =====================================================================
     2.0 phase 2 : armes, 20 techniques communes, évolutions et fusions
     ===================================================================== */
  // sprites des armes et de leurs techniques
  [["bow", { pal: { w: "#a06a3e", W: "#d39a52", s: "#fdf3de" }, frames: [["..ww...", ".w..s..", "w...s..", "w...s..", "w...s..", ".w..s..", "..ww..."]] }],
   ["arrow", { pal: { w: "#8a5a3b", g: "#c8c0b0", f: "#e8873a" }, frames: [["f.....g", "fwwwwwg", "f.....g"]] }],
   ["staff", { pal: { w: "#6b4430", W: "#a06a3e", g: "#9cc56b", G: "#5ac85a" }, frames: [[".....gG", "....gGg", "....Wg.", "...W...", "..w....", ".w.....", "w......"]] }],
   ["stone", { pal: { s: "#8a8278", S: "#c8c0b0", k: "#3a322c" }, frames: [[".ss.", "sSss", "ssks", ".ss."]] }],
   ["windblade", { pal: { w: "#d8e8ff", W: "#ffffff" }, frames: [["..ww", ".wW.", "wW..", "wW..", ".wW.", "..ww"]] }],
   ["hawk", { flying: true, pal: { b: "#8a5a3b", B: "#c08a52", w: "#fdf3de", k: "#1b1226", y: "#f2c230" }, frames: [
     ["b......b", "bb.kk.bb", ".bBBBBb.", "..bwyb..", "...bb..."], ["........", "bbbkkbbb", ".bBBBBb.", "..bwyb..", "...bb..."]] }],
   ["mossgolem", { pal: { g: "#5a8a3a", G: "#9cc56b", s: "#6a625a", k: "#2b1709" }, frames: [
     [".gGGg.", "gsGGsg", "gkssks", ".ssss.", "ss..ss", "k....k"], [".gGGg.", "gsGGsg", "gkssks", ".ssss.", ".ss.ss", ".k..k."]] }],
   ["ghost", { pal: { w: "#d8e0ff", k: "#5a6a9a" }, frames: [[".www.", "wkwkw", "wwwww", "wwwww", "w.w.w"]] }]
  ].forEach(function (s) { SPRITES[s[0]] = s[1]; });

  // les 20 techniques : statistiques communes ; chaque arme les habille (nom, sprite)
  var TECH = {
    projection: { fam: "tir", type: "shooter", name: "Projection", icon: "acorn", sprite: "acorn", count: [1, 1, 2, 2, 3], dmg: [14, 18, 18, 22, 26], pierce: [2, 2, 3, 3, 4], cd: [1.0, 0.95, 0.9, 0.85, 0.75], spd: 170, range: 150,
      evos: [{ id: "a", name: "Perce-tout", desc: "Traverse tout, +30 % de dégâts.", add: { pierce: 30 }, mul: { dmg: 1.3 } },
             { id: "b", name: "Éclat", desc: "Explose à l'impact.", set: { explodeR: [20, 20, 20, 20, 24] } }] },
    rafale: { fam: "tir", type: "shooter", name: "Rafale", icon: "smg", sprite: "miniacorn", count: [1, 1, 1, 1, 2], dmg: [4, 5, 5, 6, 7], pierce: [1, 1, 1, 1, 1], cd: [0.16, 0.14, 0.13, 0.11, 0.1], spd: 200, range: 130, spread: 0.35,
      evos: [{ id: "a", name: "Arrosage", desc: "+2 tirs par rafale, plus dispersés.", add: { count: 2, spread: 0.3 } },
             { id: "b", name: "Précision", desc: "Tirs droits, +70 % de dégâts, transpercent.", mul: { dmg: 1.7 }, add: { pierce: 1 }, set: { spread: 0.05 } }] },
    rayon: { fam: "tir", type: "beam", name: "Rayon", icon: "bolt", dmg: [10, 13, 16, 19, 24], len: [110, 120, 130, 140, 160], w: [6, 6, 7, 8, 9], cd: [1.6, 1.5, 1.4, 1.3, 1.1], color: "246,239,122",
      evos: [{ id: "a", name: "Diffraction", desc: "Le rayon se divise en 3.", set: { split: 3 } },
             { id: "b", name: "Faisceau", desc: "Rayon deux fois plus long et plus large.", mul: { len: 1.8, w: 1.6 } }] },
    fente: { fam: "melee", type: "lunge", name: "Fente", icon: "claw", dmg: [20, 26, 30, 36, 44], len: [46, 50, 56, 60, 70], w: [8, 8, 9, 10, 12], cd: [1.3, 1.2, 1.1, 1.0, 0.85], color: "253,243,222",
      evos: [{ id: "a", name: "Trait éclair", desc: "Deux fois plus fréquente.", mul: { cd: 0.5 } },
             { id: "b", name: "Exécution", desc: "Dégâts x2, x4 sur un ennemi blessé à moins de 30 %.", mul: { dmg: 2 }, set: { execute: 1 } }] },
    tourbillon: { fam: "melee", type: "spin", name: "Tourbillon", icon: "tail", r: [22, 24, 26, 28, 32], dmg: [10, 13, 15, 18, 22], cd: [1.6, 1.5, 1.4, 1.3, 1.1],
      evos: [{ id: "a", name: "Toupie", desc: "Tourne sans arrêt.", mul: { cd: 0.35, dmg: 0.6 } },
             { id: "b", name: "Grand cercle", desc: "Rayon x1,6 et repousse fort.", mul: { r: 1.6, dmg: 1.2 } }] },
    charge: { fam: "melee", type: "wave", name: "Charge", icon: "paw", sprite: "windblade", dmg: [14, 18, 22, 26, 32], r: [9, 10, 11, 12, 14], range: [70, 80, 90, 100, 110], cd: [2, 1.9, 1.8, 1.7, 1.5], spd: 150,
      evos: [{ id: "a", name: "Ruée", desc: "Part dans 3 directions.", set: { fan: 3 } },
             { id: "b", name: "Défonceur", desc: "Onde énorme qui renverse tout.", mul: { r: 1.8, dmg: 1.4, range: 1.3 } }] },
    riposte: { fam: "melee", type: "riposte", name: "Riposte", icon: "shield", dmg: [20, 26, 32, 38, 48], R: [32, 36, 40, 44, 50], cd: [3, 2.8, 2.6, 2.4, 2],
      evos: [{ id: "a", name: "Parade", desc: "Le coup reçu est entièrement annulé.", set: { parry: 1 } },
             { id: "b", name: "Vengeance", desc: "Riposte aussi toute seule toutes les 4 s.", set: { auto: 4 } }] },
    onde: { fam: "zone", type: "nova", name: "Onde", icon: "orb", R: [40, 48, 50, 54, 62], dmg: [14, 16, 22, 24, 28], cd: [2.4, 2.4, 2.2, 1.9, 1.7], twice: [0, 0, 0, 0, 0],
      evos: [{ id: "a", name: "Contre-onde", desc: "Une 2e onde suit la première.", set: { twice: [1, 1, 1, 1, 1] } },
             { id: "b", name: "Tremblement", desc: "Onde x1,5 plus large.", mul: { R: 1.5, dmg: 1.15 } }] },
    pluie: { fam: "zone", type: "meteor", name: "Pluie", icon: "meteore", lob: "meteore", n: [2, 2, 3, 3, 4], dmg: [16, 20, 20, 24, 28], rad: [16, 16, 18, 18, 22], cd: [3, 2.8, 2.6, 2.4, 2.1], frag: 0,
      evos: [{ id: "a", name: "Averse", desc: "+3 impacts.", add: { n: 3 } },
             { id: "b", name: "Grêle", desc: "Chaque impact se brise en éclats.", set: { frag: 4 }, mul: { dmg: 1.2 } }] },
    piege: { fam: "zone", type: "thorns", name: "Piège", icon: "thorn", n: [1, 2, 2, 2, 3], dmg: [5, 5, 6, 8, 9], rad: [16, 16, 20, 22, 24], dur: [3, 3, 3.5, 4, 4.5], cd: [2.6, 2.6, 2.4, 2.3, 2.1],
      evos: [{ id: "a", name: "Champ de pièges", desc: "+3 pièges à chaque fois.", add: { n: 3 } },
             { id: "b", name: "Mâchoires", desc: "Pièges plus larges et 2 fois plus forts.", mul: { dmg: 2, rad: 1.3 } }] },
    orbite: { fam: "zone", type: "orbit", name: "Orbite", icon: "mushroom", sprite: "mushroom", n: [2, 3, 3, 4, 4], R: [24, 24, 28, 30, 32], dmg: [9, 9, 12, 12, 15], spd: [2.6, 2.6, 2.8, 2.8, 3.2],
      evos: [{ id: "a", name: "Couronne", desc: "+3 objets en orbite.", add: { n: 3 } },
             { id: "b", name: "Large orbite", desc: "Rayon x1,6, tourne plus vite.", mul: { R: 1.6, spd: 1.4, dmg: 1.2 } }] },
    aura: { fam: "zone", type: "aura", name: "Aura", icon: "shield", color: "force", R: [22, 26, 28, 30, 34], dmg: [3, 4, 5, 6, 7], tick: 0.4, slow: 0, push: [30, 35, 40, 50, 60],
      evos: [{ id: "a", name: "Incandescence", desc: "Dégâts x2,2.", mul: { dmg: 2.2 } },
             { id: "b", name: "Bourbier", desc: "Plus grande et ralentit de 40 %.", mul: { R: 1.4 }, set: { slow: 0.4, color: "mist" } }] },
    mortier: { fam: "zone", type: "lob", name: "Mortier", icon: "pinecone", n: [1, 1, 2, 2, 3], dmg: [24, 28, 28, 34, 38], rad: [18, 22, 22, 24, 27], cd: [2.4, 2.4, 2.3, 2.2, 1.9], frag: 0,
      evos: [{ id: "a", name: "Obus à fragments", desc: "Chaque obus éclate en 6 fragments.", set: { frag: 6 } },
             { id: "b", name: "Gros calibre", desc: "Explosion x1,6, dégâts x1,5.", mul: { rad: 1.6, dmg: 1.5 } }] },
    boomerang: { fam: "retour", type: "boomerang", name: "Boomerang", icon: "feather", sprite: "feather", n: [1, 1, 2, 2, 3], dmg: [12, 16, 16, 21, 24], range: [85, 85, 90, 110, 115], cd: [1.7, 1.7, 1.6, 1.5, 1.2], chain: 0,
      evos: [{ id: "a", name: "Retours multiples", desc: "+2 projectiles.", add: { n: 2 } },
             { id: "b", name: "Long retour", desc: "Portée x1,6, dégâts x1,4.", mul: { range: 1.6, dmg: 1.4 } }] },
    ricochet: { fam: "retour", type: "chain", name: "Ricochet", icon: "firefly", bolts: [1, 1, 2, 2, 2], chain: [3, 4, 4, 5, 6], dmg: [11, 11, 13, 15, 17], cd: [1.8, 1.7, 1.6, 1.5, 1.2],
      evos: [{ id: "a", name: "Chaîne sans fin", desc: "+5 rebonds.", add: { chain: 5 } },
             { id: "b", name: "Double départ", desc: "+2 départs, +20 % de dégâts.", add: { bolts: 2 }, mul: { dmg: 1.2 } }] },
    grappin: { fam: "retour", type: "grapple", name: "Grappin", icon: "needle", n: [1, 1, 1, 2, 2], dmg: [16, 20, 24, 26, 30], range: [130, 140, 150, 160, 170], cd: [2.2, 2.1, 2, 1.8, 1.6],
      evos: [{ id: "a", name: "Rafle", desc: "Attire 3 ennemis à la fois.", add: { n: 2 } },
             { id: "b", name: "Hameçon", desc: "L'ennemi attiré explose à l'arrivée.", set: { boom: 26 }, mul: { dmg: 1.3 } }] },
    echo: { fam: "compagnon", type: "echo", name: "Écho", icon: "ghost", mul: [0.5, 0.55, 0.6, 0.7, 0.8], cd: [2.2, 2, 1.8, 1.6, 1.3],
      evos: [{ id: "a", name: "Double", desc: "Deux échos, de chaque côté.", set: { twins: 1 } },
             { id: "b", name: "Reflet parfait", desc: "L'écho frappe à 100 %.", set: { mul: [1, 1, 1, 1, 1] } }] },
    sentinelle: { fam: "compagnon", type: "turret", name: "Sentinelle", icon: "turret", turret: "turret", sprite: "acorn", n: [1, 1, 2, 2, 3], dmg: [8, 8, 10, 13, 15], rate: [0.6, 0.45, 0.45, 0.4, 0.35], cd: [6, 6, 5.5, 5, 4.5], dur: [9, 9, 10, 13, 14], pierce: [1, 1, 1, 1, 2], range: 160,
      evos: [{ id: "a", name: "Renforts", desc: "+2 sentinelles en même temps.", add: { n: 2 } },
             { id: "b", name: "Lourde", desc: "Tire des roquettes.", set: { rocket: 1, rad: [22, 22, 22, 22, 26] }, mul: { dmg: 1.8, rate: 1.4 } }] },
    familier: { fam: "compagnon", type: "pet", name: "Familier", icon: "pethog", pet: "pethog", n: [1, 1, 2, 2, 3], dmg: [9, 13, 13, 16, 21], rate: [0.6, 0.6, 0.55, 0.42, 0.38], spd: [95, 95, 100, 125, 130], range: 150,
      evos: [{ id: "a", name: "Meute", desc: "+2 familiers.", add: { n: 2 } },
             { id: "b", name: "Bête alpha", desc: "Mord en zone, dégâts x1,8.", mul: { dmg: 1.8 }, set: { splash: [22, 22, 22, 22, 26] } }] },
    nuee: { fam: "compagnon", type: "drone", name: "Nuée", icon: "drone", drone: "drone", sprite: "spark", n: [1, 2, 2, 3, 3], dmg: [6, 6, 6, 8, 9], rate: [0.7, 0.7, 0.5, 0.5, 0.45], pierce: [1, 1, 1, 1, 3], range: 140,
      evos: [{ id: "a", name: "Essaim", desc: "+3 membres.", add: { n: 3 } },
             { id: "b", name: "Arcs", desc: "Tirent des éclairs qui rebondissent.", set: { zap: 1, chain: [3, 3, 3, 3, 4] }, mul: { dmg: 1.4 } }] },
  };
  // attaques de base des armes (1er emplacement, monte jusqu'au niveau 5)
  var BASES = {
    katana: WEAPONS.katana,
    arc_tir: { name: "Tir à l'arc", icon: "bow", type: "shooter", family: "tir", sprite: "arrow", count: [1, 1, 1, 2, 2], dmg: [15, 19, 22, 22, 28], pierce: [2, 2, 3, 3, 4], cd: [0.8, 0.75, 0.7, 0.65, 0.55], spd: 210, range: 175,
      desc: ["Une flèche perçante sur l'ennemi le plus proche.", "+dégâts.", "Transperce un ennemi de plus.", "+1 flèche.", "Tire plus vite, +dégâts."] },
    baton_coup: { name: "Coup de bâton", icon: "staff", type: "nova", family: "zone", R: [26, 28, 30, 32, 36], dmg: [14, 18, 21, 24, 30], cd: [1.1, 1.05, 1.0, 0.9, 0.8], twice: [0, 0, 0, 0, 1],
      desc: ["Frappe le sol : une petite onde autour de toi.", "+dégâts.", "Onde plus large.", "Frappe plus vite.", "Double onde."] },
  };
  WEAPONS = {}; Object.keys(BASES).forEach(function (k) { WEAPONS[k] = BASES[k]; });
  Object.keys(TECH).forEach(function (k) {
    var t = TECH[k]; t.family = t.fam;
    t.desc = t.desc || [t.name + " : niveau 1.", "+dégâts.", "Amélioration.", "Amélioration.", "Niveau max : choisis une évolution au prochain niveau."];
    WEAPONS[k] = t;
  });
  // les 3 armes de départ : chacune donne accès à 12 techniques, à sa façon
  var ARMES = {
    katana: { name: "Katana", icon: "katana", base: "katana", fam: "melee", element: "air", desc: "Mêlée, Air. Entailles en arc, lames d'air et doubles spectraux.",
      skin: { projection: ["Vague d'acier", "windblade"], fente: ["Iaï"], tourbillon: ["Lune tournante"], charge: ["Ruée du vent", "windblade"], riposte: ["Contre-taille"],
              orbite: ["Lames spectrales", "windblade"], piege: ["Sceaux de papier"], ricochet: ["Éclat de lame"], grappin: ["Chaîne kusari"], echo: ["Ombre du maître"],
              rayon: ["Fil du vent"], onde: ["Souffle tranchant"] } },
    arc: { name: "Arc", icon: "bow", base: "arc_tir", fam: "tir", element: "feu", desc: "Tir, Feu. Flèches perçantes, pluies de flèches et un faucon.",
      skin: { projection: ["Flèche perçante", "arrow"], rafale: ["Volée", "arrow"], rayon: ["Flèche solaire"], pluie: ["Pluie de flèches"], piege: ["Chausse-trappes"],
              mortier: ["Flèche-obus"], boomerang: ["Plume-retour"], ricochet: ["Flèche rebondissante"], grappin: ["Flèche-harpon"], sentinelle: ["Archer de paille"],
              familier: ["Faucon", "hawk"], nuee: ["Essaim de plumes"] } },
    baton: { name: "Bâton", icon: "staff", base: "baton_coup", fam: "zone", element: "terre", desc: "Zone, Terre. Ondes, pierres, racines et un golem de mousse.",
      skin: { onde: ["Onde tellurique"], pluie: ["Pluie de cailloux"], piege: ["Racines piégeuses"], orbite: ["Pierres gravitantes", "stone"], aura: ["Cercle de mousse"],
              mortier: ["Rocher lancé"], tourbillon: ["Moulinet"], fente: ["Estoc"], riposte: ["Rempart de terre"], sentinelle: ["Totem de pierre"],
              familier: ["Golem de mousse", "mossgolem"], boomerang: ["Bâton tournoyant", "staff"] } },
  };
  // 1) technique évoluée + son objet de niveau au max : la technique se renforce (garde son évolution)
  var TFUS = {
    projection: { p: "poches", name: "Salve", desc: "+2 projectiles, +25 % de dégâts.", add: { count: 2 }, mul: { dmg: 1.25 } },
    rafale: { p: "vivacite", name: "Mitraille", desc: "Cadence x1,5.", mul: { cd: 0.66 } },
    rayon: { p: "loupe", name: "Soleil", desc: "Rayon 50 % plus large, +40 % de dégâts.", mul: { w: 1.5, dmg: 1.4 } },
    fente: { p: "crocs", name: "Coup mortel", desc: "Dégâts x1,6.", mul: { dmg: 1.6 } },
    tourbillon: { p: "pattes", name: "Vortex", desc: "Rayon x1,3, dégâts x1,4.", mul: { r: 1.3, dmg: 1.4 } },
    charge: { p: "ecorce", name: "Rempart roulant", desc: "Onde plus grosse, dégâts x1,5.", mul: { r: 1.4, dmg: 1.5 } },
    riposte: { p: "mousse", name: "Contre absolu", desc: "Recharge 2 fois plus vite, dégâts x1,5.", mul: { cd: 0.5, dmg: 1.5 } },
    onde: { p: "savoir", name: "Grande onde", desc: "Dégâts x1,6.", mul: { dmg: 1.6 } },
    pluie: { p: "trefle", name: "Trombe", desc: "+3 impacts, dégâts x1,3.", add: { n: 3 }, mul: { dmg: 1.3 } },
    piege: { p: "seve", name: "Piège vivace", desc: "+2 pièges, durent 2 fois plus.", add: { n: 2 }, mul: { dur: 2 } },
    orbite: { p: "appetit", name: "Ceinture", desc: "+2 en orbite, dégâts x1,4.", add: { n: 2 }, mul: { dmg: 1.4 } },
    aura: { p: "queuetouffue", name: "Aura vive", desc: "Aura x1,4, dégâts x1,6.", mul: { R: 1.4, dmg: 1.6 } },
    mortier: { p: "griffes", name: "Artillerie", desc: "+2 obus.", add: { n: 2 } },
    boomerang: { p: "joues", name: "Moisson", desc: "+2 projectiles, dégâts x1,3.", add: { n: 2 }, mul: { dmg: 1.3 } },
    ricochet: { p: "ermite", name: "Foudre", desc: "Dégâts x1,7.", mul: { dmg: 1.7 } },
    grappin: { p: "sacglands", name: "Grappin d'or", desc: "+1 cible, dégâts x1,5.", add: { n: 1 }, mul: { dmg: 1.5 } },
    echo: { p: "vivacite", name: "Écho rapide", desc: "Recharge 2 fois plus vite.", mul: { cd: 0.5 } },
    sentinelle: { p: "mecano", name: "Bastion", desc: "+1 sentinelle, durent 50 % plus.", add: { n: 1 }, mul: { dur: 1.5 } },
    familier: { p: "dresseur", name: "Compagnon d'élite", desc: "+1 familier, dégâts x1,5.", add: { n: 1 }, mul: { dmg: 1.5 } },
    nuee: { p: "mecano", name: "Nuée d'acier", desc: "+2 membres, dégâts x1,3.", add: { n: 2 }, mul: { dmg: 1.3 } },
  };
  // 2) deux techniques évoluées → une technique fusionnée (libère un emplacement)
  // 3) deux fusions → une légendaire (libère un emplacement)
  var COMBOS = {
    satellites: { name: "Satellites", icon: "mushroom", parts: ["projection", "orbite"], mul: 1.35, desc: "Des projectiles tournent autour de toi et tirent à leur tour." },
    cyclone_t: { name: "Œil du cyclone", icon: "tail", parts: ["tourbillon", "aura"], mul: 1.35, desc: "Un tourbillon permanent dans une aura qui brûle." },
    bombardement: { name: "Bombardement", icon: "meteore", parts: ["pluie", "mortier"], mul: 1.35, desc: "Le ciel et le sol explosent ensemble." },
    prisme: { name: "Prisme", icon: "bolt", parts: ["rayon", "ricochet"], mul: 1.35, desc: "Rayons et éclairs qui rebondissent." },
    assaut: { name: "Assaut", icon: "claw", parts: ["charge", "fente"], mul: 1.35, desc: "Ondes de choc et estocades d'un seul geste." },
    represailles: { name: "Représailles", icon: "shield", parts: ["riposte", "onde"], mul: 1.35, desc: "Chaque coup reçu déclenche une onde." },
    filet: { name: "Filet", icon: "thorn", parts: ["piege", "grappin"], mul: 1.35, desc: "Attire les ennemis droit dans tes pièges." },
    retour_eclair: { name: "Retour éclair", icon: "feather", parts: ["boomerang", "rafale"], mul: 1.35, desc: "Rafales et projectiles qui reviennent." },
    garnison: { name: "Garnison", icon: "turret", parts: ["sentinelle", "nuee"], mul: 1.35, desc: "Sentinelles et nuée défendent ta position." },
    meute_echo: { name: "Meute fantôme", icon: "ghost", parts: ["familier", "echo"], mul: 1.35, desc: "Familiers et doubles frappent avec toi." },
    seisme: { name: "Secousse", icon: "orb", parts: ["onde", "mortier"], mul: 1.35, desc: "Ondes et obus font trembler la terre." },
    tornade: { name: "Tornade", icon: "tail", parts: ["tourbillon", "boomerang"], mul: 1.35, desc: "Tout tourne et tout revient." },
  };
  var LEGENDS = {
    constellation: { name: "Constellation", icon: "mushroom", parts: ["satellites", "prisme"], mul: 1.7, desc: "Légendaire : orbites, rayons et éclairs." },
    ouragan_t: { name: "Ouragan", icon: "tail", parts: ["cyclone_t", "tornade"], mul: 1.7, desc: "Légendaire : une tempête qui ne s'arrête jamais." },
    apocalypse: { name: "Apocalypse", icon: "meteore", parts: ["bombardement", "seisme"], mul: 1.7, desc: "Légendaire : tout explose." },
    forteresse: { name: "Forteresse", icon: "turret", parts: ["garnison", "represailles"], mul: 1.7, desc: "Légendaire : une place forte vivante." },
    chasse: { name: "Grande chasse", icon: "ghost", parts: ["meute_echo", "filet"], mul: 1.7, desc: "Légendaire : rien n'échappe à la meute." },
    lame_tempete: { name: "Lame-tempête", icon: "claw", parts: ["assaut", "retour_eclair"], mul: 1.7, desc: "Légendaire : un orage d'acier." },
    deluge: { name: "Déluge", icon: "bolt", parts: ["prisme", "bombardement"], mul: 1.7, desc: "Légendaire : lumière et feu du ciel." },
    eternite: { name: "Éternité", icon: "shield", parts: ["represailles", "cyclone_t"], mul: 1.7, desc: "Légendaire : intouchable et implacable." },
  };
  Object.keys(COMBOS).forEach(function (k) { var c = COMBOS[k]; c.type = "combo"; c.fusion = true; c.desc = [c.desc]; WEAPONS[k] = c; });
  Object.keys(LEGENDS).forEach(function (k) { var c = LEGENDS[k]; c.type = "combo"; c.fusion = true; c.legend = true; c.desc = [c.desc]; WEAPONS[k] = c; });
  FUSIONS = {};   // l'ancien système de fusion est remplacé
  /* =====================================================================
     2.0 phase 3 : rôles des ennemis, escouades, éléments, méga boss
     ===================================================================== */
  // chaque espèce a un rôle qui demande une réponse par le mouvement
  var ROLES = {
    nuee:      { name: "Nuée",      cost: 1,   desc: "Faibles et nombreux" },
    chargeur:  { name: "Chargeur",  cost: 3,   desc: "Un signal, puis une charge en ligne" },
    tireur:    { name: "Tireur",    cost: 2.5, desc: "Tire de loin" },
    artilleur: { name: "Artilleur", cost: 3,   desc: "Zones au sol à retardement" },
    guetteur:  { name: "Guetteur",  cost: 3,   desc: "Tire là où tu vas être" },
    bouclier:  { name: "Bouclier",  cost: 4,   desc: "Bloque les tirs de face" },
    soutien:   { name: "Soutien",   cost: 4,   desc: "Soigne ses alliés" },
    piegeur:   { name: "Piégeur",   cost: 3,   desc: "Toiles qui ralentissent" },
    rodeur:    { name: "Rôdeur",    cost: 3,   desc: "Surgit sous toi si tu restes ancré" },
    kamikaze:  { name: "Kamikaze",  cost: 2,   desc: "Explose au contact" },
  };
  var ROLE_OF = { slug: "nuee", rat: "nuee", bat: "nuee", bunny: "nuee", beetle: "chargeur", badger: "chargeur", frog: "chargeur",
                  wasp: "tireur", toad: "tireur", salamander: "artilleur", puffball: "artilleur", crow: "guetteur", turtle: "bouclier", hedgehog: "bouclier",
                  firefly: "soutien", moth: "soutien", spider: "piegeur", weaver: "piegeur", mole: "rodeur", snake: "rodeur", fox: "rodeur", bombshroom: "kamikaze" };
  var ROLE_AI = { chargeur: "charger", tireur: "spitter", artilleur: "artillery", guetteur: "predict", soutien: "healer", piegeur: "webber", rodeur: "ambush", kamikaze: "bomber" };
  Object.keys(ROLE_OF).forEach(function (k) {
    var e = ENEMIES[k]; if (!e) return; var ro = ROLE_OF[k]; e.role = ro;
    if (ro === "rodeur" && e.ai === "mole") return;              // la taupe garde son terrier
    if (ro === "bouclier") return;                                 // tortue et hérisson gardent leur attaque, plus le bouclier
    if (ROLE_AI[ro]) e.ai = ROLE_AI[ro];
    if (ro === "tireur" && !e.shot) e.shot = e.dmg;
    if (ro === "kamikaze") { e.blastR = e.blastR || 22; e.blast = e.blast || 16; }
  });
  // escouades prédéfinies : le directeur reçoit des points selon le palier et les dépense (façon Risk of Rain)
  var SQUADS = [
    { nuee: 6 }, { nuee: 10, soutien: 1 }, { tireur: 3, bouclier: 2 }, { chargeur: 2, nuee: 4 }, { soutien: 1, bouclier: 2, tireur: 3, nuee: 10 },
    { piegeur: 2, rodeur: 2 }, { artilleur: 2, nuee: 6 }, { guetteur: 2, kamikaze: 3 }, { bouclier: 3, artilleur: 1 }, { chargeur: 3, soutien: 1 },
  ];
  // 4 éléments : chacun craint le suivant du cycle (Eau > Feu > Air > Terre > Eau)
  var ELEMENTS = {
    terre: { name: "Terre", color: "#c8a060", ui: "#9a7030", weak: "air" },
    feu:   { name: "Feu",   color: "#ff7a2a", ui: "#d8551a", weak: "eau" },
    eau:   { name: "Eau",   color: "#4aa8ff", ui: "#2a78c8", weak: "terre" },
    air:   { name: "Air",   color: "#c8f8e8", ui: "#2f9a7e", weak: "feu" },
  };
  // deux éléments sur une même cible : une réaction
  var REACTIONS = {
    "air+eau":   { name: "Gel",          color: "#9ee8ff", desc: "gèle l'ennemi 1,6 s" },
    "air+feu":   { name: "Embrasement",  color: "#ff9a3a", desc: "explosion de flammes" },
    "eau+terre": { name: "Boue",         color: "#8a6a3a", desc: "ralentit tout autour" },
    "eau+feu":   { name: "Vapeur",       color: "#e8e8f0", desc: "nuage brûlant qui reste" },
    "feu+terre": { name: "Magma",        color: "#ff4a1a", desc: "énormes dégâts sur la cible" },
    "air+terre": { name: "Tempête de sable", color: "#e8d090", desc: "repousse et blesse tout autour" },
  };
  // biomes : la Clairière reste neutre (premières parties sans éléments)
  var MAP_ELEM = { clairiere: null, marais: "eau", automne: "feu", nuit: "air" };
  MAPS.forEach(function (m) { m.element = MAP_ELEM[m.id] || null; });
  MAPS.filter(function (m) { return m.id === "clairiere"; }).forEach(function (m) { m.mega = "colosse"; });
  // objets qui marquent un 2e élément (le style multi-élément)
  ITEMS.push(
    { id: "braise", r: 0, icon: "🔥", name: "Braise", elem: "feu", desc: "20 % de chance par coup de marquer Feu : permet les réactions." },
    { id: "goutte", r: 0, icon: "💧", name: "Goutte de rosée", elem: "eau", desc: "20 % de chance par coup de marquer Eau : permet les réactions." },
    { id: "galet", r: 0, icon: "🪨", name: "Galet", elem: "terre", desc: "20 % de chance par coup de marquer Terre : permet les réactions." },
    { id: "brise", r: 0, icon: "🌬️", name: "Plume de brise", elem: "air", desc: "20 % de chance par coup de marquer Air : permet les réactions." },
    { id: "coeur_humus", r: 3, pool: "boss", icon: "🟫", name: "Cœur d'humus", desc: "Trophée du Colosse : +25 % de PV max, tes coups marquent Terre." }
  );
  ITEMS.forEach(function (it, i) { it.idx = i; });
  // élites : 7 pouvoirs (Ardent, Glacial, Électrique et Invocateur font doublon avec les éléments)
  AFFIXES = AFFIXES.filter(function (a) { return ["ardent", "glacial", "electrique", "invocateur"].indexOf(a.id) < 0; }).concat([
    { id: "elementaire", name: "Élémentaire", color: "#ffd84a", desc: "aura de son élément" },
    { id: "meneur", name: "Meneur", color: "#ff5ad0", desc: "renforce son escouade" },
  ]);
  // méga boss Terre : repaire en Clairière (portail) ; 3 phases, chacune teste un état
  ENEMIES.colosse = { sprite: "golem", hp: 5200, spd: 17, dmg: 30, r: 13, xp: 200, boss: true, name: "Colosse d'humus", color: "#c8a060", bossAi: "mega_terre", elem: "terre", mega: true };
  /* =====================================================================
     2.0 phase 4 : attirail (équipement permanent), ressources, talents, maîtrise
     ===================================================================== */
  // ressources : une par biome, plus un trophée par boss
  var RES = {
    herbe: { name: "Herbe tendre", icon: "🌿", map: "clairiere" }, ecorce: { name: "Écorce", icon: "🪵", map: "clairiere" }, chapeau: { name: "Chapeau de champi", icon: "🍄", map: "clairiere" },
    tourbe: { name: "Tourbe", icon: "🟤", map: "marais" }, roseau: { name: "Roseau", icon: "🎋", map: "marais" }, nenuphar: { name: "Nénuphar", icon: "🪷", map: "marais" },
    feuille_rousse: { name: "Feuille rousse", icon: "🍁", map: "automne" }, gland_dore: { name: "Gland doré", icon: "🌰", map: "automne" }, silex: { name: "Silex", icon: "🪨", map: "automne" },
    mousse_noire: { name: "Mousse noire", icon: "🌑", map: "nuit" }, poussiere_lune: { name: "Poussière de lune", icon: "✨", map: "nuit" }, bois_mort: { name: "Bois mort", icon: "🥀", map: "nuit" },
    t_boar: { name: "Défense de sanglier", icon: "🦷", trophy: "boar" }, t_owl: { name: "Plume d'hibou ancien", icon: "🪶", trophy: "owl" }, t_queen: { name: "Dard royal", icon: "🐝", trophy: "queen" },
    t_stag: { name: "Ramure du Grand Cerf", icon: "🦌", trophy: "stag" }, t_mushking: { name: "Spore royale", icon: "🍄", trophy: "mushking" }, t_bigmole: { name: "Griffe de taupe", icon: "🐾", trophy: "bigmole" },
    t_golem: { name: "Cœur de racine", icon: "🌳", trophy: "golem" }, t_colosse: { name: "Humus ancien", icon: "🟫", trophy: "colosse" },
  };
  var MAP_RES = { clairiere: ["herbe", "ecorce", "chapeau"], marais: ["tourbe", "roseau", "nenuphar"], automne: ["feuille_rousse", "gland_dore", "silex"], nuit: ["mousse_noire", "poussiere_lune", "bois_mort"] };
  var ELEM_MAP = { terre: "clairiere", eau: "marais", feu: "automne", air: "nuit" };
  // un rôle par emplacement : coiffe = Ancré, bottes = Mouvement, cape = Volte, amulette = élément, anneaux = contenu de la partie
  var SLOTS = [
    { id: "coiffe", name: "Coiffe", state: "Ancré" }, { id: "bottes", name: "Bottes", state: "Mouvement" }, { id: "cape", name: "Cape", state: "Volte" },
    { id: "amulette", name: "Amulette", state: "Élément" }, { id: "anneau1", name: "Anneau", state: "Partie", kind: "anneau" }, { id: "anneau2", name: "Anneau", state: "Partie", kind: "anneau" },
  ];
  // modèles : effets fixes, seule la force varie dans une fourchette [min, max] ; les effets grandissent avec le niveau de partie
  var GEAR = {
    c_champi:  { slot: "coiffe", name: "Coiffe-champignon", elem: "terre", icon: "🍄", fx: "spores", lo: 3, hi: 6, desc: "Ancré : une flaque de spores pousse sous toi ({v} dégâts)." },
    c_gland:   { slot: "coiffe", name: "Casque de gland", elem: "terre", icon: "🪖", fx: "armure", lo: 10, hi: 25, desc: "Ancré : -{v} % de dégâts reçus." },
    c_mousse:  { slot: "coiffe", name: "Bonnet de mousse", elem: "eau", icon: "🧢", fx: "regen", lo: 0.8, hi: 2, desc: "Ancré : régénère {v} PV/s." },
    c_epines:  { slot: "coiffe", name: "Chapeau d'épines", elem: "feu", icon: "🎩", fx: "epines", lo: 6, hi: 12, desc: "Ancré : des épines blessent autour de toi ({v} dégâts)." },
    b_braise:  { slot: "bottes", name: "Bottes de braise", elem: "feu", icon: "🥾", fx: "trainee", lo: 4, hi: 8, desc: "En mouvement : traînée de feu ({v} dégâts)." },
    b_feuille: { slot: "bottes", name: "Bottes-feuilles", elem: "air", icon: "👢", fx: "vitesse", lo: 6, hi: 14, desc: "En mouvement : +{v} % de vitesse." },
    b_pierre:  { slot: "bottes", name: "Sabots de pierre", elem: "terre", icon: "🦶", fx: "pas", lo: 10, hi: 20, desc: "En mouvement : une onde tous les 50 px ({v} dégâts)." },
    b_rosee:   { slot: "bottes", name: "Bottes de rosée", elem: "eau", icon: "🩴", fx: "ralenti", lo: 25, hi: 45, desc: "En mouvement : les ennemis frôlés sont ralentis de {v} %." },
    k_eclair:  { slot: "cape", name: "Cape-éclair", elem: "air", icon: "⚡", fx: "eclair", lo: 20, hi: 40, desc: "Volte : un éclair saute sur 4 ennemis ({v} dégâts)." },
    k_brume:   { slot: "cape", name: "Cape de brume", elem: "eau", icon: "🌫️", fx: "brume", lo: 0.5, hi: 1.1, desc: "Volte : invulnérable {v} s." },
    k_ronces:  { slot: "cape", name: "Cape de ronces", elem: "terre", icon: "🌿", fx: "ronces", lo: 6, hi: 12, desc: "Volte : un cercle de ronces reste au sol ({v} dégâts)." },
    k_vent:    { slot: "cape", name: "Cape de vent", elem: "air", icon: "🧣", fx: "souffle", lo: 8, hi: 16, desc: "Volte : repousse tout autour ({v} dégâts)." },
    a_flamme:  { slot: "amulette", name: "Amulette de flamme", elem: "feu", icon: "🔥", fam: "tir", desc: "Tes techniques de Tir deviennent Feu." },
    a_maree:   { slot: "amulette", name: "Amulette des marées", elem: "eau", icon: "🌊", fam: "zone", desc: "Tes techniques de Zone deviennent Eau." },
    a_roche:   { slot: "amulette", name: "Amulette de roche", elem: "terre", icon: "🪨", fam: "melee", desc: "Tes techniques de Mêlée deviennent Terre." },
    a_zephyr:  { slot: "amulette", name: "Amulette du zéphyr", elem: "air", icon: "🌬️", fam: "compagnon", desc: "Tes techniques de Compagnon et de Retour deviennent Air." },
    r_pacte:   { slot: "anneau", name: "Anneau du pacte", icon: "💍", ring: "pacte", desc: "Pacte : les autels de sang donnent 2 objets." },
    r_danger:  { slot: "anneau", name: "Anneau du danger", icon: "💀", ring: "danger", desc: "Pacte : +1 boss à chaque apparition, chaque boss lâche un coffre." },
    r_chasse:  { slot: "anneau", name: "Anneau de chasse", icon: "🎯", ring: "chasse", desc: "Pacte : élites 2 fois plus fréquentes, chacune lâche un objet." },
    r_furie:   { slot: "anneau", name: "Anneau de furie", icon: "😡", ring: "furie", desc: "Pacte : la rage arrive 3 min plus tôt, glands d'or x2." },
    r_source:  { slot: "anneau", name: "Anneau de source", icon: "💧", ring: "source", desc: "Événement : chaque boss vaincu soigne toute l'équipe de 40 %." },
    r_marchand:{ slot: "anneau", name: "Anneau du marchand", icon: "🪙", ring: "marchand", desc: "Économie : coffres et marchand 30 % moins chers." },
    r_apprenti:{ slot: "anneau", name: "Anneau d'apprenti", icon: "📖", ring: "apprenti", desc: "Déblocage : 2 techniques hors de ton arme peuvent apparaître ({t})." },
  };
  // recettes : ressources de la région de l'élément (+ un trophée pour capes, amulettes et anneaux)
  Object.keys(GEAR).forEach(function (k) {
    var g = GEAR[k], m = ELEM_MAP[g.elem] || "clairiere", rs = MAP_RES[m], cost = {};
    cost[rs[0]] = 8; cost[rs[1]] = 6; cost[rs[2]] = 3;
    if (g.slot === "cape" || g.slot === "amulette" || g.slot === "anneau") cost[{ clairiere: "t_boar", marais: "t_mushking", automne: "t_stag", nuit: "t_owl" }[m]] = 1;
    g.cost = cost;
  });
  // points d'élément de l'attirail : paliers de passifs, comme les synergies d'un auto-battler
  var ELEM_TIERS = {
    feu:   [[3, "Tes coups peuvent enflammer (brûlure)."], [6, "La brûlure se propage aux voisins."], [9, "Les ennemis brûlés explosent à leur mort."]],
    terre: [[3, "Tes coups peuvent étourdir 0,5 s."], [6, "Les étourdis prennent +30 % de dégâts."], [9, "Un étourdi projette des éclats de roche."]],
    eau:   [[3, "Tes coups ralentissent de 20 %."], [6, "Les ralentis peuvent geler."], [9, "Un gelé éclate en glace autour de lui."]],
    air:   [[3, "10 % de chance d'un mini-éclair par coup."], [6, "Les éclairs rebondissent sur 3 ennemis."], [9, "Tes coups repoussent beaucoup plus fort, éclairs x2."]],
  };
  // talents : 4 paliers par posture, 2 choix exclusifs par palier ; le niveau de l'écureuil ouvre les paliers
  var TAL_COMMON = [
    [{ id: "racines", name: "Ancrage vif", desc: "Tu t'ancres en 0,25 s au lieu de 0,4." }, { id: "ressort", name: "Détente", desc: "La Volte se recharge en 2,2 s au lieu de 3." }],
    [{ id: "piedferme", name: "Pied ferme", desc: "Ancré : -20 % de dégâts reçus." }, { id: "sillage", name: "Sillage", desc: "Après une Volte : +30 % de vitesse pendant 1,5 s." }],
  ];
  var TAL = {
    tireuse:  [[{ id: "gachette", name: "Gâchette", desc: "Cadence ancrée jusqu'à +100 % (au lieu de +60 %)." }, { id: "grandecouronne", name: "Grande couronne", desc: "La couronne de la Volte tire 20 glands." }],
               [{ id: "tourelle_v", name: "Tourelle vivante", desc: "Clé : ancrée depuis 2 s, une couronne part toute seule toutes les 3 s." }, { id: "tircourse", name: "Tir de course", desc: "Clé : la cadence gagnée reste 2 s quand tu repars." }]],
    acrobate: [[{ id: "longroulade", name: "Longue roulade", desc: "Roulade 2 fois plus longue." }, { id: "roulade_lame", name: "Roulade tranchante", desc: "La roulade blesse les ennemis traversés." }],
               [{ id: "voltigeuse", name: "Voltigeuse", desc: "Clé : la Volte se recharge en 1,5 s." }, { id: "intouchable", name: "Intouchable", desc: "Clé : invulnérable 1 s de plus après une roulade." }]],
    glaneuse: [[{ id: "pochespleines", name: "Poches pleines", desc: "En mouvement : +15 % d'expérience." }, { id: "aspiration", name: "Aspiration", desc: "La Volte aspire aussi l'or et les objets." }],
               [{ id: "moisson", name: "Grande glane", desc: "Clé : ramassage x3 en mouvement." }, { id: "avarice", name: "Avarice", desc: "Clé : toutes les 30 noisettes, une onde part autour de toi." }]],
    bordee:   [[{ id: "canonniers", name: "Canonniers", desc: "+2 matelots max." }, { id: "salvelourde", name: "Salve lourde", desc: "Ancré : l'équipage fait +50 % de dégâts." }],
               [{ id: "batterie", name: "Canonnade", desc: "Clé : ancré, la salve part toutes les 0,3 s." }, { id: "couverture", name: "Tir de couverture", desc: "Clé : la salve marche aussi en mouvement, 2 fois plus lente." }]],
    abordage: [[{ id: "sabres", name: "Sabres", desc: "La charge fait +50 % de dégâts." }, { id: "recrue", name: "Recrue d'abordage", desc: "Un ennemi tué pendant une charge a 25 % de chance de recruter." }],
               [{ id: "mutinerie", name: "Mutinerie", desc: "Clé : la charge dure 2 fois plus longtemps." }, { id: "bouclierh", name: "Mur de matelots", desc: "Clé : en cercle, les matelots arrêtent les tirs ennemis." }]],
    convoi:   [[{ id: "longuefile", name: "Longue file", desc: "+3 matelots max." }, { id: "ravitaillement", name: "Ravitaillement", desc: "Chaque recrue soigne 3 PV." }],
               [{ id: "train", name: "Train", desc: "Clé : en mouvement, les matelots blessent au contact." }, { id: "lignetir", name: "Ligne de tir", desc: "Clé : tout l'équipage tire ensemble toutes les 1,5 s." }]],
    pique:    [[{ id: "grandplongeon", name: "Grand plongeon", desc: "Dégâts du plongeon x1,6." }, { id: "remontee", name: "Reprise d'altitude", desc: "Après un plongeon, la Volte se recharge 2 fois plus vite." }],
               [{ id: "faucon_t", name: "Serres plongeantes", desc: "Clé : le plongeon fonce sur l'ennemi le plus proche." }, { id: "meteore_t", name: "Météore", desc: "Clé : le plongeon laisse une zone qui brûle 3 s." }]],
    courant:  [[{ id: "ventarriere", name: "Vent porteur", desc: "+20 % de vitesse max." }, { id: "lameair", name: "Lame d'air", desc: "Au-delà de 80 % de vitesse, une lame part devant toutes les 0,8 s." }],
               [{ id: "ouragan_t", name: "Tempête intérieure", desc: "Clé : bonus de dégâts jusqu'à +120 %." }, { id: "sillagetr", name: "Sillage tranchant", desc: "Clé : en vol rapide, tu blesses au contact." }]],
    perchoir: [[{ id: "longuevue", name: "Longue-vue", desc: "Accroché : portée x2 au lieu de x1,6." }, { id: "nid_t", name: "Nid", desc: "Accroché : régénère 2 PV/s." }],
               [{ id: "sniper", name: "Tireur d'élite", desc: "Clé : accroché depuis 2 s, tous tes coups sont critiques." }, { id: "grappe", name: "Agrippe-tout", desc: "Clé : tu peux t'accrocher n'importe où en ralentissant." }]],
  };
  var TAL_LVL = [2, 4, 6, 8];   // niveau d'écureuil qui ouvre chaque palier
  // maîtrise des armes : des options, pas de puissance (1 : techniques et 1re évolution · 2 : 1re signature · 3 : 2e évolution · 4 : signatures 2 et 3 · 5 : éveil)
  var MASTERY = [0, 120, 350, 700, 1200];
  var SIGS = {
    katana: [{ id: "sig_contre", name: "Contre", icon: "katana", desc: "Ancré : le prochain coup reçu est annulé et renvoyé (recharge 4 s)." },
             { id: "sig_garde", name: "Garde du vent", icon: "windblade", desc: "Les tirs ennemis proches sont déviés." },
             { id: "sig_pas", name: "Pas du vent", icon: "windblade", desc: "Chaque Volte laisse une traînée de lames d'air." }],
    arc:    [{ id: "sig_charge", name: "Tir chargé", icon: "arrow", desc: "Ancré depuis 1 s : tes coups font x2 dégâts." },
             { id: "sig_ardente", name: "Pluie ardente", icon: "arrow", desc: "Toutes les 4 s, une pluie de flèches de feu tombe autour de toi." },
             { id: "sig_faucon", name: "Œil de faucon", icon: "hawk", desc: "+15 % de coups critiques et +20 % de portée." }],
    baton:  [{ id: "sig_racine", name: "Enracinement", icon: "staff", desc: "Ancré : des racines poussent autour de toi." },
             { id: "sig_pierre", name: "Pierre de garde", icon: "stone", desc: "Une pierre tourne autour de toi et arrête les tirs ennemis." },
             { id: "sig_seisme", name: "Séisme", icon: "stone", desc: "Chaque Volte frappe le sol (onde de Terre)." }],
  };
  var ULTS = { katana: { name: "Mille coupes", desc: "Des dizaines d'entailles frappent tout l'écran." },
               arc: { name: "Soleil ardent", desc: "Une pluie de 24 flèches de feu." }, baton: { name: "Colère de la terre", desc: "Trois énormes ondes de Terre." } };
  /* =====================================================================
     2.0 phase 6 : les 7 autres écureuils, les 3 autres méga boss, les paliers Cauchemar
     ===================================================================== */
  SPRITES.sq_pataud = squirrelA({ t: "#c89058", d: "#7a4a20", o: "#a86a38", c: "#fdecd0", k: "#2b1709", n: "#5a3018" });
  SPRITES.sq_trefle = squirrelA({ t: "#9cd070", d: "#3f7a3a", o: "#6aa850", c: "#f3f8e0", k: "#1b2a12", n: "#2a4a1a", b: "#3fa040", B: "#7ad86a" }, POP_TOP);
  SPRITES.sapling = { pal: { g: "#5ac85a", G: "#9cd04a", b: "#6b4430" }, frames: [["..G..", ".gGg.", "..b..", "..b.."]] };
  SPRITES.minitree = { pal: { g: "#3f8a3a", G: "#6ac85a", L: "#9cd04a", b: "#6b4430", k: "#2b1709" }, frames: [["..gGg..", ".gGLGg.", "gGLgLGg", ".gGgGg.", "..kbk..", "...b...", "..bbb.."]] };
  CHAR_ALL.push(
    { id: "pataud", name: "Pataud", title: "Écureuil glouton", sprite: "sq_pataud", weapon: "katana", desc: "" },
    { id: "trefle", name: "Trèfle", title: "Écureuil joueur", sprite: "sq_trefle", weapon: "katana", desc: "" }
  );
  var V2CH2 = {
    jumeaux: { order: 3, quest: "q2_jumeaux", rule: "Deux corps sur les mêmes commandes, vies séparées. Pop reprend tes armes à 60 % ; si l'un tombe, l'autre peut le relever." },
    cendrine: { order: 4, quest: "q2_cendrine", rule: "Les coups reçus s'écoulent sur 4 s ; frapper pendant ce délai en efface une partie. Un champ de force l'entoure." },
    druide: { order: 5, quest: "q2_fougere", rule: "Ancrée, elle enterre une noisette qui devient pousse, puis arbre qui attaque." },
    pataud: { order: 6, quest: "q2_pataud", rule: "Grossit en mangeant l'XP : plus de PV et de dégâts au contact, mais plus lent et plus facile à toucher. La Volte recrache tout." },
    mage: { order: 7, quest: "q2_mage", rule: "Ses armes puisent dans une jauge de sève ; à sec, elles tirent 2 fois moins vite. Ancrée, elle recharge ; jauge pleine = surcharge." },
    ninja: { order: 8, quest: "q2_ninja", rule: "Les ennemis ne la repèrent qu'à courte portée. Dégâts x3 sur ceux qui ne l'ont pas vue." },
    trefle: { order: 9, quest: "q2_trefle", rule: "À chaque niveau, elle prend sa carte ou la mise : deux cartes au niveau suivant, ou rien." },
  };
  Object.keys(V2CH2).forEach(function (k) { V2CH[k] = V2CH2[k]; });
  var ALLCH = CHAR_ALL;
  CHARACTERS = ALLCH.filter(function (c) { return V2CH[c.id]; }).map(function (c) {
    var v = V2CH[c.id]; c.rule = v.rule; c.order = v.order; c.weapon = "katana"; c.unlock = null; c.quest = v.quest || null; c.price = 0; c.mods = {}; c.desc = v.rule; return c;
  }).sort(function (a, b) { return a.order - b.order; });
  var P6 = {
    jumeaux: [
      { id: "formation", name: "Formation", color: "#f2b05e", a: "Collés et ancrés : leurs coups font +35 %.", m: "Pop te suit de près.", v: "Tirs croisés : chacun lance une salve vers l'autre." },
      { id: "miroir", name: "Miroir", color: "#6ad8ff", a: "Ancrés : Pop se recentre sur toi.", m: "Pop bouge à l'opposé de Pip.", v: "Un rayon relie Pip et Pop et blesse tout entre eux." },
      { id: "relais", name: "Relais", color: "#9cc56b", a: "Ancrés : chacun régénère 1 PV/s.", m: "Pop te suit.", v: "Pip et Pop échangent leurs places, avec une onde à l'arrivée." },
    ],
    cendrine: [
      { id: "rempart", name: "Rempart", color: "#7fd1c7", a: "Le champ grossit et bloque les tirs.", m: "Champ réduit.", v: "Onde qui repousse tout." },
      { id: "belier", name: "Bélier", color: "#f2b05e", a: "Recharge l'élan.", m: "L'élan monte, le contact blesse.", v: "Choc qui étourdit autour de toi." },
      { id: "carapace", name: "Carapace", color: "#c8c0b0", a: "En boule : -50 % de dégâts, renvoie les coups.", m: "Normal.", v: "Piquants en cercle." },
    ],
    druide: [
      { id: "jardiniere", name: "Jardinière", color: "#9cc56b", a: "Plante une noisette ; ses arbres soignent autour d'eux.", m: "Normal.", v: "Tous tes arbres te soignent d'un coup." },
      { id: "ronceraie", name: "Ronceraie", color: "#5a8a3a", a: "Plante une noisette ; ses arbres lancent des épines.", m: "Normal.", v: "Chaque arbre lance une salve d'épines." },
      { id: "semeuse", name: "Semeuse", color: "#f6d36b", a: "Plante plus vite.", m: "Plante en marchant : arbres plus faibles, mais partout.", v: "Les pousses deviennent arbres d'un coup." },
    ],
    pataud: [
      { id: "goinfre", name: "Goinfre", color: "#f2b05e", a: "Digère : regagne 1 PV/s.", m: "Grossit deux fois plus vite.", v: "Recrache tout autour de lui." },
      { id: "canon", name: "Canon", color: "#c8553d", a: "Normal.", m: "Normal.", v: "Recrache en rafale dirigée, dégâts x1,5." },
      { id: "rouleau", name: "Rouleau", color: "#a06a3e", a: "Normal.", m: "Gros et en mouvement : écrase tout (contact x2).", v: "Recrache tout autour de lui." },
    ],
    mage: [
      { id: "canalisatrice", name: "Canalisatrice", color: "#b07cf0", a: "Recharge la sève ; surcharges 2 fois plus longues.", m: "Consomme la sève.", v: "Rend 20 de sève." },
      { id: "vagabonde", name: "Vagabonde", color: "#6ad8ff", a: "Recharge la sève.", m: "Recharge aussi en marchant, plus lentement.", v: "Rend 15 de sève." },
      { id: "instable", name: "Instable", color: "#ff5ad0", a: "Recharge la sève.", m: "Consomme la sève.", v: "Déclenche une surcharge si la jauge dépasse 60 ; les surcharges explosent." },
    ],
    ninja: [
      { id: "affut", name: "Affût", color: "#8a8aa8", a: "Après 1 s : invisible, le prochain coup est critique.", m: "Normal.", v: "Disparaît 1 s." },
      { id: "lamevent", name: "Lame-vent", color: "#d8e8ff", a: "Normal.", m: "Des shurikens restent dans son sillage.", v: "Une gerbe de 6 shurikens." },
      { id: "danseuse", name: "Danseuse", color: "#ff7a9a", a: "Normal.", m: "Normal.", v: "Chaque Volte sans prendre de coup : +8 % de cadence (5 fois max)." },
    ],
    trefle: [
      { id: "portebonheur", name: "Porte-bonheur", color: "#9cd070", a: "Ancrée, sa chance monte (butin).", m: "Normal.", v: "Une pièce : un objet tombe 1 fois sur 4." },
      { id: "toutourien", name: "Tout-ou-rien", color: "#f6d36b", a: "Normal.", m: "Normal.", v: "Lance une pièce : salve doublée, ou rien." },
      { id: "flambeuse", name: "Flambeuse", color: "#ff5a3a", a: "Normal.", m: "Normal (-25 % de PV max).", v: "Mises gagnées 6 fois sur 10." },
    ],
  };
  Object.keys(P6).forEach(function (cid) {
    var nm = (ALLCH.filter(function (c) { return c.id === cid; })[0] || {}).name;
    P6[cid][1].quest = "p_" + cid + "2"; P6[cid][2].quest = "p_" + cid + "3";
    QUESTS.push({ id: "p_" + cid + "2", desc: "Survis 5 minutes avec " + nm + ".", check: function (r) { return r.char === cid && r.time >= 300; } },
                { id: "p_" + cid + "3", desc: "Survis 8 minutes avec " + nm + ".", check: function (r) { return r.char === cid && r.time >= 480; } });
    POSTURES[cid] = P6[cid];
  });
  QUESTS.push(
    { id: "q2_cendrine", desc: "Survis 6 minutes (débloque Cendrine).", check: function (r) { return r.time >= 360; } },
    { id: "q2_jumeaux", desc: "Réussis une extraction en Expédition (débloque Pip & Pop).", check: function (r) { return !!r.extracted; } },
    { id: "q2_fougere", desc: "Active 4 sanctuaires dans une partie (débloque Fougère).", check: function (r) { return (r.shrinesUsed || 0) >= 4; } },
    { id: "q2_pataud", desc: "Ramasse 400 noisettes dans une partie (débloque Pataud).", check: function (r) { return (r.nuts || 0) >= 400; } },
    { id: "q2_mage", desc: "Déclenche 30 réactions élémentaires dans une partie (débloque Myrtille).", check: function (r) { return (r.reactions || 0) >= 30; } },
    { id: "q2_ninja", desc: "Fais 30 Voltes dans une partie (débloque Ombre).", check: function (r) { return (r.voltes || 0) >= 30; } },
    { id: "q2_trefle", desc: "Ouvre 3 coffres scellés dans une partie (débloque Trèfle).", check: function (r) { return (r.chestsOpened || 0) >= 3; } }
  );
  // talents des 21 nouvelles postures : palier 3 et clé de voûte (paliers 1 et 2 communs)
  var T6 = {
    formation: [["Garde serrée", "Collés, -20 % de dégâts reçus."], ["Grand écart", "Formation compte jusqu'à 40 px."], ["Tir croisé", "Clé : collés, +60 % au lieu de +35 %."], ["Escorte", "Clé : Pop relève Pip 2 fois plus vite."]],
    miroir: [["Rayon fort", "Le rayon de Volte fait x1,6."], ["Reflets", "Pop a +30 % de PV."], ["Double miroir", "Clé : le rayon reste 1 s."], ["Symétrie", "Clé : chaque coup de Pop ralentit."]],
    relais: [["Relais rapide", "La Volte se recharge 30 % plus vite."], ["Onde forte", "Onde d'arrivée x1,6."], ["Chassé-croisé", "Clé : l'échange rend invulnérable 1 s."], ["Passe-passe", "Clé : l'échange soigne les deux de 10 %."]],
    rempart: [["Pied de granit", "Ancrée depuis 2 s, le champ grossit deux fois plus vite."], ["Pas de côté", "Le champ ne rétrécit pas pendant la 1re seconde de mouvement."], ["Champ ancré", "Clé : le champ reste posé 10 s là où tu l'as quitté."], ["Bastion mobile", "Clé : le champ garde sa taille en mouvement, mais plus de Volte."]],
    belier: [["Élan durable", "L'élan retombe 2 fois moins vite."], ["Corne", "Contact +50 %."], ["Coulée", "Clé : élan max x2."], ["Onde de choc", "Clé : le choc de Volte est 2 fois plus large."]],
    carapace: [["Coquille épaisse", "En boule : -65 % au lieu de -50 %."], ["Retour à l'envoyeur", "Coups renvoyés x2."], ["Piquants", "Clé : en boule, piquants toutes les 1,5 s."], ["Boule roulante", "Clé : la Volte fait rouler la boule et écrase."]],
    jardiniere: [["Bon terreau", "Les pousses grandissent 2 fois plus vite."], ["Sève douce", "Soins des arbres x2."], ["Verger", "Clé : +3 arbres max."], ["Grand chêne", "Clé : les arbres ont 2 fois plus de portée."]],
    ronceraie: [["Épines longues", "Épines +50 % de dégâts."], ["Fourré", "Les arbres posent des ronces au sol."], ["Forêt hostile", "Clé : +3 arbres max."], ["Tireur des bois", "Clé : les arbres tirent 2 fois plus vite."]],
    semeuse: [["Pas vert", "Plante tous les 45 px au lieu de 70."], ["Graines robustes", "Arbres de semeuse +50 % de dégâts."], ["Prairie", "Clé : +6 arbres max."], ["Germination", "Clé : les pousses deviennent arbres en 1 s."]],
    goinfre: [["Panse", "+50 % de PV par taille."], ["Digestion", "Regain 2 PV/s ancré."], ["Ogre", "Clé : taille max x1,5."], ["Buffet", "Clé : chaque ennemi tué au contact fait grossir."]],
    canon: [["Mitraille", "Recrache 2 fois plus de projectiles."], ["Boulets", "Projectiles qui transpercent."], ["Bombardier", "Clé : les projectiles explosent."], ["Rechargement", "Clé : garde la moitié de sa taille après la Volte."]],
    rouleau: [["Masse", "Contact x1,5."], ["Élan lourd", "Ralentit 2 fois moins en grossissant."], ["Rouleau compresseur", "Clé : les ennemis écrasés sont étourdis."], ["Boule de neige", "Clé : grossit aussi en écrasant."]],
    canalisatrice: [["Grand réservoir", "Jauge rechargée 2 fois plus vite."], ["Sobriété", "Consomme 30 % de sève en moins."], ["Transe", "Clé : surcharge x1,8 au lieu de x1,4."], ["Flux continu", "Clé : à sec, tire seulement 30 % moins vite."]],
    vagabonde: [["Sève vive", "Recharge en marchant 2 fois plus vite."], ["Sobriété", "Consomme 30 % de sève en moins."], ["Pèlerine", "Clé : en mouvement, surcharge douce permanente (+15 %)."], ["Source", "Clé : la Volte rend 40 de sève."]],
    instable: [["Mèche courte", "Surcharge dès 80 de sève."], ["Détonation", "Explosions de surcharge x1,6."], ["Réaction en chaîne", "Clé : chaque explosion recharge 5 de sève."], ["Chaos", "Clé : explosions 2 fois plus fréquentes."]],
    affut: [["Œil de lynx", "Invisible après 0,6 s ancrée."], ["Coup sûr", "Le coup critique fait x3."], ["Prédatrice", "Clé : invisible, x4 sur les ennemis qui ne l'ont pas vue."], ["Fantôme", "Clé : invisible 1 s de plus en repartant."]],
    lamevent: [["Sillage dense", "2 fois plus de shurikens dans le sillage."], ["Lames longues", "Shurikens du sillage x1,5."], ["Tempête d'acier", "Clé : le sillage blesse 2 fois plus vite."], ["Vent coupant", "Clé : la gerbe de Volte fait 12 shurikens."]],
    danseuse: [["Grâce", "+10 % de cadence par Volte au lieu de 8 %."], ["Souplesse", "Les charges ne sautent qu'une fois sur deux."], ["Ballet", "Clé : 8 charges max."], ["Révérence", "Clé : à 5 charges, chaque Volte libère une onde."]],
    portebonheur: [["Fer à cheval", "Chance ancrée x2."], ["Pièce porte-bonheur", "La pièce de Volte réussit 1 fois sur 3."], ["Jackpot", "Clé : la pièce peut lâcher un objet rare."], ["Bonne étoile", "Clé : -20 % de dégâts reçus tant que ta chance est montée."]],
    toutourien: [["Double ou rien", "La salve gagnée fait 32 glands."], ["Lancer sûr", "La pièce réussit 6 fois sur 10."], ["Banco", "Clé : salve gagnée explosive."], ["Consolation", "Clé : une pièce ratée te soigne 10 PV."]],
    flambeuse: [["Gros joueur", "Mise gagnée : 3 cartes au lieu de 2."], ["Assurance", "Mise perdue : +20 glands."], ["All-in", "Clé : mises gagnées 7 fois sur 10."], ["Sang-froid", "Clé : plus de malus de PV."]],
  };
  Object.keys(T6).forEach(function (ps) {
    var t = T6[ps], id = function (i) { return ps + "_t" + i; };
    TAL[ps] = [[{ id: id(1), name: t[0][0], desc: t[0][1] }, { id: id(2), name: t[1][0], desc: t[1][1] }], [{ id: id(3), name: t[2][0], desc: t[2][1] }, { id: id(4), name: t[3][0], desc: t[3][1] }]];
  });
  // 3 autres méga boss, un par élément ; leur repaire : la carte de Survie (et la région en Expédition) de leur élément
  ENEMIES.mere = { sprite: "toad", hp: 5400, spd: 18, dmg: 28, r: 13, xp: 200, boss: true, mega: true, name: "Mère des Marais", color: "#4aa8ff", bossAi: "mega_terre", elem: "eau", scale: 3 };
  ENEMIES.brasier = { sprite: "salamander", hp: 5000, spd: 22, dmg: 30, r: 12, xp: 200, boss: true, mega: true, name: "Brasier ancestral", color: "#ff7a2a", bossAi: "mega_terre", elem: "feu", scale: 3.4 };
  ENEMIES.tempete = { sprite: "owl", hp: 5200, spd: 24, dmg: 26, r: 12, xp: 200, boss: true, mega: true, name: "Roi-Tempête", color: "#c8f8e8", bossAi: "mega_terre", elem: "air", scale: 2.2 };
  ENEMIES.colosse.scale = 2.6;
  MAPS.forEach(function (m) { m.mega = { clairiere: "colosse", marais: "mere", automne: "brasier", nuit: "tempete" }[m.id]; });
  RES.t_mere = { name: "Écaille de la Mère", icon: "🐸", trophy: "mere" };
  RES.t_brasier = { name: "Braise ancestrale", icon: "🔥", trophy: "brasier" };
  RES.t_tempete = { name: "Plume d'orage", icon: "🌩️", trophy: "tempete" };
  // paliers Cauchemar : chacun ajoute une règle, et elles se cumulent ; battre le méga boss d'une carte en Cauchemar N débloque N+1
  var NIGHTMARE = [
    "Les élites arrivent deux fois plus souvent.",
    "Les boss ont un pouvoir d'élite.",
    "La rage (ou la corruption) arrive 2 minutes plus tôt.",
    "Les méga boss changent d'élément en dernière phase.",
    "Les soins sont réduits de moitié.",
    "Les ennemis sont 20 % plus rapides.",
    "Coffres, marchand et passeur coûtent 2 fois plus.",
    "Les élites ont toujours 2 pouvoirs.",
    "Dégâts reçus +30 %.",
    "La difficulté démarre 5 paliers plus haut.",
  ];
  /* =====================================================================
     2.0 fin de phase 6 : 3 armes de plus, panoplies, runes, camp
     ===================================================================== */
  SPRITES.sling = { pal: { w: "#8a5a3b", W: "#c08a52", s: "#c8c0b0" }, frames: [["w.....w", ".w...w.", "..wWw..", "...w...", "...w...", "...W...", "...w..."]] };
  SPRITES.fan = { pal: { f: "#d8e8ff", F: "#6ad8ff", k: "#2b1709" }, frames: [["fFfFfFf", ".fFfFf.", "..fFf..", "...k...", "...k..."]] };
  SPRITES.trident = { pal: { s: "#c8d8e8", S: "#4aa8ff", w: "#6b4430" }, frames: [["s.s.s..", "sSsSs..", ".sss...", "..w....", ".w.....", "w......", "......."]] };
  SPRITES.bubble = { pal: { b: "#4aa8ff", w: "#e8f8ff" }, frames: [[".bb.", "bwbb", "bbbb", ".bb."]] };
  BASES.fronde_tir = WEAPONS.fronde_tir = { name: "Tir à la fronde", icon: "sling", type: "shooter", family: "tir", sprite: "stone", count: [1, 1, 2, 2, 3], dmg: [13, 17, 18, 22, 26], pierce: [1, 1, 1, 2, 2], cd: [0.75, 0.7, 0.7, 0.65, 0.55], spd: 180, range: 160,
    desc: ["Un galet sur l'ennemi le plus proche.", "+dégâts.", "+1 galet.", "Transperce.", "+1 galet, plus rapide."] };
  BASES.eventail_jet = WEAPONS.eventail_jet = { name: "Lancer d'éventail", icon: "fan", type: "boomerang", family: "retour", sprite: "windblade", n: [1, 1, 2, 2, 2], dmg: [11, 15, 15, 19, 23], range: [80, 85, 85, 100, 110], cd: [1.3, 1.2, 1.2, 1.05, 0.9], chain: 0,
    desc: ["Une lame d'éventail part et revient.", "+dégâts.", "+1 lame.", "Plus loin.", "Plus rapide, +dégâts."] };
  BASES.trident_coup = WEAPONS.trident_coup = { name: "Coup de trident", icon: "trident", type: "lunge", family: "melee", len: [44, 48, 52, 56, 64], w: [7, 8, 8, 9, 11], dmg: [18, 23, 26, 30, 36], cd: [1.0, 0.95, 0.9, 0.8, 0.7], color: "106,200,255",
    desc: ["Un coup de trident droit devant toi.", "+dégâts.", "Plus long.", "Plus fréquent.", "Plus large, +dégâts."] };
  ARMES.fronde = { name: "Fronde", icon: "sling", base: "fronde_tir", fam: "tir", element: "terre", desc: "Tir, Terre. Galets, éboulis et pièges de pierre.",
    skin: { projection: ["Galet perçant", "stone"], rafale: ["Grêle de cailloux", "stone"], pluie: ["Chute de pierres"], mortier: ["Bloc lancé"], piege: ["Chausse-trappes de pierre"], ricochet: ["Galet rebondissant"],
            orbite: ["Pierres en orbite", "stone"], onde: ["Onde de roche"], charge: ["Coup de bélier", "stone"], sentinelle: ["Catapulte"], grappin: ["Fronde-lasso"], nuee: ["Nuée de cailloux"] } };
  ARMES.eventail = { name: "Éventail", icon: "fan", base: "eventail_jet", fam: "retour", element: "air", desc: "Retour, Air. Lames qui reviennent, bourrasques et plumes.",
    skin: { boomerang: ["Lame d'éventail", "windblade"], ricochet: ["Rafale ricochet"], grappin: ["Vent attirant"], tourbillon: ["Ronde des plumes"], aura: ["Brise tranchante"], rayon: ["Courant d'air"],
            projection: ["Plume tranchante", "feather"], rafale: ["Volée de plumes", "feather"], echo: ["Double de vent"], nuee: ["Nuée de plumes"], familier: ["Pie voleuse", "hawk"], onde: ["Souffle"] } };
  ARMES.trident = { name: "Trident", icon: "trident", base: "trident_coup", fam: "melee", element: "eau", desc: "Mêlée, Eau. Estocs, vagues et tourbillons.",
    skin: { fente: ["Estoc des marées"], tourbillon: ["Tourbillon d'écume"], charge: ["Vague", "bubble"], riposte: ["Brise-lame"], onde: ["Raz"], aura: ["Brume salée"],
            piege: ["Filets"], orbite: ["Bulles gardiennes", "bubble"], pluie: ["Averse"], grappin: ["Harpon"], familier: ["Loutre", "pethog"], echo: ["Reflet dans l'eau"] } };
  // signatures : chaque type a un comportement générique (kind)
  var SIGK = { sig_contre: "contre", sig_garde: "deflect", sig_pas: "voltePath", sig_charge: "anchorDmg", sig_ardente: "rain", sig_faucon: "critRange", sig_racine: "anchorThorns", sig_pierre: "orbitBlock", sig_seisme: "volteNova" };
  Object.keys(SIGS).forEach(function (a) { SIGS[a].forEach(function (s) { s.kind = SIGK[s.id]; s.elem = s.id === "sig_ardente" ? "feu" : s.id === "sig_seisme" ? "terre" : null; }); });
  SIGS.fronde = [{ id: "sig_lourd", kind: "anchorDmg", name: "Pierre lourde", icon: "stone", desc: "Ancré depuis 1 s : tes coups font x2 dégâts." },
                 { id: "sig_eboulis", kind: "volteNova", elem: "terre", name: "Éboulis", icon: "stone", desc: "Chaque Volte fait tomber des pierres autour de toi." },
                 { id: "sig_galet", kind: "critRange", name: "Œil du frondeur", icon: "sling", desc: "+15 % de coups critiques et +20 % de portée." }];
  SIGS.eventail = [{ id: "sig_bourrasque", kind: "volteNova", elem: "air", name: "Bourrasque", icon: "fan", desc: "Chaque Volte libère un souffle d'Air." },
                   { id: "sig_danse", kind: "deflect", name: "Danse des lames", icon: "windblade", desc: "Les tirs ennemis proches sont déviés." },
                   { id: "sig_plumes", kind: "rain", elem: "air", name: "Pluie de plumes", icon: "feather", desc: "Toutes les 4 s, des plumes tombent autour de toi." }];
  SIGS.trident = [{ id: "sig_maree", kind: "anchorThorns", elem: "eau", name: "Marée", icon: "bubble", desc: "Ancré : l'eau monte et blesse autour de toi." },
                  { id: "sig_remous", kind: "orbitBlock", name: "Remous", icon: "bubble", desc: "Une bulle tourne autour de toi et arrête les tirs ennemis." },
                  { id: "sig_ressac", kind: "contre", name: "Ressac", icon: "trident", desc: "Ancré : le prochain coup reçu est annulé et renvoyé (recharge 4 s)." }];
  ULTS.katana.kind = "slash"; ULTS.arc.kind = "rain"; ULTS.arc.elem = "feu"; ULTS.baton.kind = "nova"; ULTS.baton.elem = "terre";
  ULTS.fronde = { name: "Avalanche", kind: "nova", elem: "terre", desc: "Trois énormes ondes de Terre." };
  ULTS.eventail = { name: "Cyclone", kind: "slash", elem: "air", desc: "Des lames d'Air frappent tout l'écran." };
  ULTS.trident = { name: "Raz-de-marée", kind: "rain", elem: "eau", desc: "Une pluie de 24 vagues." };
  // runes (forge de Charbon) : surtout en Arène
  RES.rune = { name: "Rune", icon: "🔹", rune: 1 };
  RES.rune_rare = { name: "Rune rare", icon: "🔷", rune: 1 };
  // panoplies : 2 à 4 pièces ; 2 pièces = un bonus d'effet, 4 pièces = un bonus qui change une règle ; recettes trouvées en Donjon
  var SETS = {
    corsaire: { name: "Panoplie du Corsaire", who: "capitaine", b2: "+2 matelots max.", b4: "Les matelots tirent des boulets qui explosent." },
    sylve:    { name: "Panoplie de la Sylve", b2: "Ancré : régénère 1 PV/s.", b4: "Ancré : une pousse d'arbre toutes les 4 s, qui attaque." },
    orage:    { name: "Panoplie de l'Orage", b2: "La Volte se recharge 0,6 s plus vite.", b4: "Chaque Volte lance un éclair qui saute sur 5 ennemis." },
    braise:   { name: "Panoplie de Braise", b2: "10 % de chance par coup d'enflammer.", b4: "Les ennemis brûlés explosent à leur mort." },
  };
  [["corsaire", "eau", [["coiffe", "Tricorne", "🏴‍☠️", "armure", 12, 24], ["bottes", "Bottes de pont", "🥾", "vitesse", 6, 12], ["cape", "Cape de corsaire", "🧥", "souffle", 8, 14], ["amulette", "Ancre porte-bonheur", "⚓", null, 0, 0, "tir"]]],
   ["sylve", "terre", [["coiffe", "Couronne de lierre", "🌿", "regen", 0.8, 1.8], ["bottes", "Sabots d'écorce", "🪵", "pas", 10, 18], ["cape", "Cape de mousse", "🍃", "ronces", 6, 11], ["amulette", "Gland de la Sylve", "🌰", null, 0, 0, "zone"]]],
   ["orage", "air", [["coiffe", "Heaume d'orage", "⛈️", "epines", 6, 12], ["bottes", "Bottes de foudre", "⚡", "vitesse", 8, 14], ["cape", "Cape-tonnerre", "🌩️", "eclair", 22, 38], ["amulette", "Œil de la tempête", "🌀", null, 0, 0, "compagnon"]]],
   ["braise", "feu", [["coiffe", "Masque de braise", "🎭", "epines", 7, 13], ["bottes", "Bottes de lave", "🔥", "trainee", 5, 9], ["cape", "Cape de cendres", "🧣", "souffle", 9, 15], ["amulette", "Cœur de braise", "❤️‍🔥", null, 0, 0, "melee"]]]
  ].forEach(function (st) {
    st[2].forEach(function (pc) {
      var id = "s_" + st[0] + "_" + pc[0], fx = pc[3];
      GEAR[id] = { slot: pc[0], name: pc[1], elem: st[1], icon: pc[2], set: st[0], fx: fx || undefined, lo: fx ? pc[4] : undefined, hi: fx ? pc[5] : undefined, fam: pc[6] || undefined,
        desc: fx ? GEAR[Object.keys(GEAR).filter(function (k) { return GEAR[k].fx === fx; })[0]].desc : "Tes techniques de " + { tir: "Tir", zone: "Zone", compagnon: "Compagnon et de Retour", melee: "Mêlée" }[pc[6]] + " deviennent " + { feu: "Feu", eau: "Eau", air: "Air", terre: "Terre" }[st[1]] + "." };
      var m = { terre: "clairiere", eau: "marais", feu: "automne", air: "nuit" }[st[1]], rs = MAP_RES[m], cost = {};
      cost[rs[0]] = 10; cost[rs[1]] = 8; cost[rs[2]] = 6; cost[{ clairiere: "t_colosse", marais: "t_mere", automne: "t_brasier", nuit: "t_tempete" }[m]] = 1;
      GEAR[id].cost = cost;
    });
  });
  // le camp : 7 lieux, un seul écran
  var CAMP = [
    { id: "sentier", name: "Le sentier", who: "", x: 160, y: 0.8, screen: "play", desc: "Partir : mode, région, contrats" },
    { id: "terrier", name: "Le terrier", who: "", x: 56, y: 0.6, screen: "terrier", desc: "Attirail, posture, talents" },
    { id: "atelier", name: "L'atelier", who: "Bûche", npc: "sq_bucheron", x: 104, y: 0.32, screen: "atelier", desc: "Craft et recyclage" },
    { id: "forge", name: "La forge", who: "Charbon", npc: "sq_charbon", x: 210, y: 0.3, screen: "forge", desc: "Runes : relancer, ajouter un effet" },
    { id: "comptoir", name: "Le comptoir", who: "le Marchand", npc: "sq_capitaine", x: 252, y: 0.66, screen: "comptoir", desc: "Glands d'or, conversion de ressources" },
    { id: "chene", name: "Le vieux chêne", who: "Flocon", npc: "sq_flocon", x: 160, y: 0.3, screen: "quetes", desc: "Quêtes, codex, succès" },
    { id: "arene", name: "L'arène", who: "Bastien", npc: "sq_chevalier", x: 266, y: 0.36, screen: "succes", desc: "Succès et records" },
  ];
  /* =====================================================================
     Contenu étendu, lot 1 : objets de niveau, 3e évolution, fusions
     ===================================================================== */
  [["spring", { pal: { s: "#c8c0b0", S: "#fdf3de" }, frames: [[".ssss..", "....s..", ".sSss..", ".s.....", ".ssSs..", "....s..", ".ssss.."]] }],
   ["roots", { pal: { g: "#5ac85a", b: "#8a5a3b", B: "#c08a52" }, frames: [["...g...", "..ggg..", "...b...", "..bBb..", ".b.b.b.", "b..B..b"]] }],
   ["hourglass", { pal: { w: "#a06a3e", s: "#f6d36b" }, frames: [["wwwww", ".sss.", "..s..", ".s.s.", "wwwww"]] }],
   ["dash", { pal: { y: "#f6d36b", Y: "#fdf3de" }, frames: [["...y...", "....y..", "yyYYyy.", "....y..", "...y..."]] }],
   ["leafstep", { pal: { g: "#9cc56b", G: "#5a8a3a" }, frames: [["...gg", "..gGg", ".gGg.", "gGg..", "Gg..."]] }],
   ["counter", { pal: { y: "#6ad8ff", Y: "#fdf3de" }, frames: [["y...y", ".y.y.", "..Y..", ".y.y.", "y...y"]] }],
   ["flint", { pal: { f: "#ff7a2a", F: "#f6d36b", s: "#6a625a", S: "#8a8278" }, frames: [["..f..", ".fFf.", ".sss.", "sSsss", ".sss."]] }],
   ["shell", { pal: { c: "#f2c8b0", C: "#d89a80" }, frames: [["..ccc..", ".cCcCc.", "cCcCcCc", ".ccccc.", "...c..."]] }],
   ["ochre", { pal: { s: "#c8783a", S: "#e8a060", k: "#5a3018" }, frames: [[".ss.", "sSss", "ssks", ".ss."]] }],
   ["jayfeather", { pal: { b: "#2a78c8", B: "#6ad8ff", k: "#1b1226" }, frames: [["....bB", "...bBb", "..bBb.", ".bBb..", "kb...."]] }]
  ].forEach(function (s) { SPRITES[s[0]] = s[1]; });
  // 10 objets de niveau : les 3 états et les points d'élément (chacun sert au moins à une fusion)
  PASSIVES.racines = { name: "Racines", sprite: "roots", quest: "q3_racines", desc: "Ancré : +6 % de dégâts." };
  PASSIVES.patience = { name: "Patience", sprite: "hourglass", desc: "L'Ancré s'active 0,06 s plus tôt (0,4 s → 0,1 s au niveau 5)." };
  PASSIVES.elan = { name: "Élan", sprite: "dash", quest: "q3_elan", desc: "Après 2 s de course sans t'arrêter : +5 % de dégâts." };
  PASSIVES.foulee = { name: "Foulée légère", sprite: "leafstep", desc: "En mouvement : -12 % de dégâts des zones au sol et des pièges." };
  PASSIVES.ressort = { name: "Ressort", sprite: "spring", quest: "q3_ressort", desc: "La Volte se recharge 0,3 s plus vite (3 s → 1,5 s)." };
  PASSIVES.contrepied = { name: "Contre-pied", sprite: "counter", desc: "Après une Volte : +12 % de dégâts pendant 1,5 s." };
  PASSIVES.pierre_feu = { name: "Pierre à feu", sprite: "flint", quest: "q3_feu", elemPt: "feu", desc: "+1 point de Feu aux niveaux 1, 3 et 5." };
  PASSIVES.coquillage = { name: "Coquillage", sprite: "shell", quest: "q3_eau", elemPt: "eau", desc: "+1 point d'Eau aux niveaux 1, 3 et 5." };
  PASSIVES.ocre = { name: "Ocre", sprite: "ochre", quest: "q3_terre", elemPt: "terre", desc: "+1 point de Terre aux niveaux 1, 3 et 5." };
  PASSIVES.plume_geai = { name: "Plume de geai", sprite: "jayfeather", quest: "q3_air", elemPt: "air", desc: "+1 point d'Air aux niveaux 1, 3 et 5." };
  // ingrédients : Vivacité ne sert plus qu'à la Rafale, Petit mécano qu'à la Sentinelle
  TFUS.echo.p = "ressort"; TFUS.nuee.p = "plume_geai"; TFUS.ricochet.p = "contrepied";
  // recettes secondaires : une technique ne prend qu'une seule fusion d'objet, la principale ou celle-ci
  var TFUS2 = {
    ricochet: { p: "ermite", name: "Chaîne de l'ermite", desc: "+3 rebonds, chaque rebond fait +10 %.", add: { chain: 3 }, set: { chainUp: 0.1 } },
    echo: { p: "meute", name: "Écho de meute", desc: "L'écho copie aussi l'attaque de l'allié le plus proche.", set: { pack: 1 } },
    familier: { p: "entraide", name: "Gardien bienveillant", desc: "Tes familiers relèvent les alliés à terre.", set: { medic: 1 } },
    fente: { p: "racines", name: "Coup de racine", desc: "Ancré, la Fente part dans 3 directions.", set: { root3: 1 } },
    riposte: { p: "patience", name: "Garde patiente", desc: "Ancré depuis 2 s, la riposte frappe en grand cercle et fait +50 %.", set: { patient: 1 } },
    charge: { p: "elan", name: "Charge lancée", desc: "Plus tu cours longtemps, plus l'onde est large, jusqu'au double.", set: { runWide: 1 } },
    piege: { p: "foulee", name: "Semis", desc: "En mouvement, un piège tombe tous les 80 px.", set: { sow: 80 } },
    boomerang: { p: "ressort", name: "Rappel", desc: "Chaque Volte relance tous tes boomerangs.", set: { recall: 1 } },
    projection: { p: "pierre_feu", name: "Salve de braises", desc: "Chaque projectile laisse une petite flamme au sol.", set: { hfx: { flame: 1 } } },
    onde: { p: "coquillage", name: "Marée montante", desc: "Chaque onde laisse une flaque qui marque Eau.", set: { puddle: "eau" } },
    orbite: { p: "ocre", name: "Anneau de roche", desc: "Les objets en orbite étourdissent 0,3 s.", set: { hfx: { stun: 0.3 } } },
    rayon: { p: "plume_geai", name: "Fil d'orage", desc: "Le rayon marque Air et repousse.", set: { elemX: "air", push: 1 } },
  };
  // 3e évolution, élémentaire : niveau 5, arme en maîtrise 3 et au moins 6 points de l'élément de l'arme
  var EVOC = {
    projection: ["Empreinte", "Chaque projectile marque ton élément à coup sûr ; les réactions qu'il déclenche font +50 %.", { hfx: { react: 1.5 } }],
    rafale: ["Saturation", "5 tirs sur la même cible déclenchent une explosion de ton élément.", { hfx: { sat: 5 } }],
    rayon: ["Fil élémentaire", "Le rayon laisse une traînée de ton élément qui marque tout ce qui la traverse.", { trail: 1 }],
    fente: ["Lame chargée", "Un ennemi tué par la Fente explose en réaction avec la marque qu'il portait.", { hfx: { killBoom: 1 } }],
    tourbillon: ["Œil élémentaire", "Chaque ennemi marqué d'un autre élément touché par le tourbillon déclenche sa réaction.", { hfx: { force: 1 } }],
    charge: ["Front élémentaire", "L'onde de choc marque tous les ennemis touchés et ceux qui les entourent.", { hfx: { markR: 24 } }],
    riposte: ["Retour d'élément", "Chaque riposte marque l'attaquant et les ennemis autour de lui.", { markRing: 1 }],
    onde: ["Onde chargée", "Chaque onde applique ton élément et prolonge de 2 s les marques déjà posées.", { hfx: { ext: 2 } }],
    pluie: ["Pluie élémentaire", "Chaque impact laisse une petite zone de ton élément pendant 3 s.", { crater: 3 }],
    piege: ["Piège réactif", "Un piège déclenché fait réagir ton élément avec tous les ennemis marqués à moins de 60 px.", { reactive: 60 }],
    orbite: ["Anneau élémentaire", "Les objets en orbite marquent et font le double sur une cible marquée d'un autre élément.", { hfx: { vsMark: 2 } }],
    aura: ["Climat", "Les ennemis qui restent 2 s dans ton aura gardent ta marque jusqu'à leur mort.", { climat: 1 }],
    mortier: ["Obus élémentaire", "L'explosion laisse un cratère de ton élément qui marque pendant 4 s.", { crater: 4 }],
    boomerang: ["Aller-retour", "Marque à l'aller, déclenche la réaction au retour.", { allerRetour: 1 }],
    ricochet: ["Chaîne alternée", "Chaque rebond alterne entre ton élément et le dernier élément touché.", { hfx: { alt: 1 } }],
    grappin: ["Prise élémentaire", "L'ennemi attiré est marqué et réagit en arrivant près de toi.", { grabReact: 1 }],
    echo: ["Écho inversé", "L'écho frappe avec l'élément qui suit le tien dans le cycle : il crée des réactions seul.", { inverse: 1 }],
    sentinelle: ["Totem élémentaire", "La sentinelle crée autour d'elle une zone de ton élément.", { totem: 1 }],
    familier: ["Familier élémentaire", "Il prend ton élément et déclenche une réaction en mordant une cible marquée.", { hfx: { force: 1, react: 1.25 } }],
    nuee: ["Nuée chargée", "Chaque membre de la nuée explose en ton élément quand il disparaît, puis revient.", { charged: 6 }],
  };
  Object.keys(EVOC).forEach(function (k) { var c = EVOC[k]; TECH[k].evos.push({ id: "c", elemC: true, name: c[0], desc: c[1], set: c[2] }); });
  // 18 fusions de techniques de plus : chaque composant garde son comportement et gagne une règle (fx)
  var COMBOS2 = {
    tir_crochet: ["Tir-crochet", "needle", ["projection", "grappin"], "Les projectiles attirent vers toi ce qu'ils touchent.", { projection: { set: { hfx: { pull: 18 } } } }],
    poste_tir: ["Poste de tir", "turret", ["rafale", "sentinelle"], "Les sentinelles tirent tes rafales.", { sentinelle: { set: { spray: [3, 3, 3, 3, 4] }, mul: { rate: 0.6 } } }],
    phare: ["Phare", "bolt", ["rayon", "orbite"], "Un rayon tourne autour de toi en permanence.", { rayon: { set: { sweep: 1 }, mul: { cd: 0.3, dmg: 0.6 } } }],
    taille_jumelle: ["Taille jumelle", "claw", ["fente", "echo"], "Chaque Fente est répétée en miroir par un écho.", { fente: { set: { mirror: 1 } } }],
    ronde_betes: ["Ronde des bêtes", "pethog", ["tourbillon", "familier"], "Tes familiers tournent autour de toi en attaquant.", { familier: { set: { circle: 1 } } }],
    ruee_minee: ["Ruée minée", "paw", ["charge", "piege"], "Chaque charge sème des pièges sur sa ligne.", { charge: { set: { mines: 1 } } }],
    ecorce_vive: ["Écorce vive", "shield", ["riposte", "aura"], "Un coup reçu fait pulser ton aura à double puissance.", { riposte: { set: { auraPulse: 1 } } }],
    essor: ["Essor", "drone", ["onde", "nuee"], "Chaque onde projette ta nuée vers l'extérieur.", { onde: { set: { essor: 1 } } }],
    pluie_folle: ["Pluie folle", "meteore", ["pluie", "ricochet"], "Chaque impact rebondit sur 2 ennemis.", { pluie: { set: { hfx: { bounce: 2 } } } }],
    champ_mines: ["Champ de mines", "thorn", ["piege", "mortier"], "Les obus deviennent des pièges au sol.", { mortier: { set: { mine: 1 } } }],
    egide: ["Égide", "shield", ["orbite", "riposte"], "Les objets en orbite bloquent les tirs et ripostent.", { orbite: { set: { block: 1 } } }],
    nuage_vivant: ["Nuage vivant", "orb", ["aura", "nuee"], "La nuée reste dans ton aura et l'agrandit.", { aura: { mul: { R: 1.4 } }, nuee: { set: { stay: 1 } } }],
    batterie: ["Batterie", "turret", ["mortier", "sentinelle"], "Les sentinelles tirent des obus.", { sentinelle: { set: { lobber: 1 } } }],
    rabatteur: ["Rabatteur", "feather", ["boomerang", "grappin"], "Les boomerangs ramènent les ennemis vers toi.", { boomerang: { set: { hfx: { pull: 14 } } } }],
    bond_chaine: ["Bond en chaîne", "firefly", ["ricochet", "familier"], "Tes familiers bondissent d'ennemi en ennemi.", { familier: { set: { hop: 2 } } }],
    rayons_croises: ["Rayons croisés", "ghost", ["echo", "rayon"], "L'écho tire ton rayon en miroir.", { rayon: { set: { mirror: 1 } } }],
    spirale: ["Spirale", "smg", ["rafale", "tourbillon"], "Tes rafales partent en spirale autour de toi.", { rafale: { set: { spiral: 1 } } }],
    harponnage: ["Harponnage", "needle", ["grappin", "charge"], "Tu fonces vers l'ennemi attrapé et l'onde le pulvérise.", { grappin: { set: { dash: 1 } } }],
  };
  var LEGENDS2 = {
    aurore: ["Aurore", "bolt", ["phare", "rayons_croises"], "Légendaire : des rayons tournent et se croisent dans tout l'écran.", { rayon: { set: { split: 4 } } }],
    siege: ["Siège", "meteore", ["champ_mines", "batterie"], "Légendaire : obus et mines couvrent le terrain sans arrêt.", { mortier: { add: { n: 2 } }, sentinelle: { add: { n: 1 } } }],
    inebranlable: ["Inébranlable", "shield", ["egide", "ecorce_vive"], "Légendaire : chaque coup reçu est bloqué ou renvoyé.", { riposte: { set: { parry: 1 }, mul: { cd: 0.5 } } }],
    horde: ["Horde", "pethog", ["ronde_betes", "bond_chaine"], "Légendaire : des familiers sans nombre bondissent partout.", { familier: { add: { n: 3 } } }],
    fil_destin: ["Fil du destin", "claw", ["taille_jumelle", "harponnage"], "Légendaire : un ennemi attrapé subit des tailles en miroir jusqu'à sa mort.", { grappin: { set: { hfx: { fate: 1 } } } }],
    nuee_mille: ["Nuée des mille", "drone", ["essor", "nuage_vivant"], "Légendaire : un essaim permanent suit chacune de tes ondes.", { nuee: { add: { n: 4 } } }],
    filet_celeste: ["Filet céleste", "needle", ["tir_crochet", "rabatteur"], "Légendaire : tout ce que tu touches revient vers toi.", { "*": { set: { hfx: { pull: 16 } } } }],
    tourmente: ["Tourmente", "tail", ["spirale", "pluie_folle"], "Légendaire : une spirale de projectiles qui rebondissent partout.", { rafale: { set: { hfx: { bounce: 1 } } } }],
  };
  Object.keys(COMBOS2).forEach(function (k) { var c = COMBOS2[k]; COMBOS[k] = { name: c[0], icon: c[1], parts: c[2], mul: 1.35, desc: [c[3]], fx: c[4], type: "combo", fusion: true }; WEAPONS[k] = COMBOS[k]; });
  Object.keys(LEGENDS2).forEach(function (k) { var c = LEGENDS2[k]; LEGENDS[k] = { name: c[0], icon: c[1], parts: c[2], mul: 1.7, desc: [c[3]], fx: c[4], type: "combo", fusion: true, legend: true }; WEAPONS[k] = LEGENDS[k]; });
  // quêtes des objets de niveau
  QUESTS.push(
    { id: "q3_racines", desc: "Reste ancré 2 minutes au total dans une partie.", check: function (r) { return (r.anchorTot || 0) >= 120; } },
    { id: "q3_elan", desc: "Cours 30 secondes sans t'arrêter.", check: function (r) { return (r.runMax || 0) >= 30; } },
    { id: "q3_ressort", desc: "Fais 300 Voltes au total.", check: function (r) { return ((r.tot && r.tot.voltes) || 0) >= 300; } },
    { id: "q3_feu", desc: "Porte 6 points de Feu.", check: function (r) { return ((r.eptMax || {}).feu || 0) >= 6; } },
    { id: "q3_eau", desc: "Porte 6 points d'Eau.", check: function (r) { return ((r.eptMax || {}).eau || 0) >= 6; } },
    { id: "q3_terre", desc: "Porte 6 points de Terre.", check: function (r) { return ((r.eptMax || {}).terre || 0) >= 6; } },
    { id: "q3_air", desc: "Porte 6 points d'Air.", check: function (r) { return ((r.eptMax || {}).air || 0) >= 6; } }
  );
  /* =====================================================================
     Contenu étendu, lot 2 : 14 armes de plus (une par famille et par élément)
     ===================================================================== */
  [["hammer", { pal: { S: "#8a8278", s: "#c8c0b0", w: "#8a5a3b" }, frames: [["SSSSS..", "SsssS..", "SSSSS..", "..w....", "..w....", "..w....", "..w...."]] }],
   ["axe", { pal: { S: "#c8c0b0", s: "#ff7a2a", w: "#8a5a3b" }, frames: [[".SSs...", "SSSsw..", ".SS.w..", "....w..", "....w..", "....w.."]] }],
   ["crossbow", { pal: { b: "#9ee8ff", w: "#6b4430", W: "#c8d8e8" }, frames: [["b.....b", ".b...b.", "..bwb..", "wwwWwww", "...w...", "...w..."]] }],
   ["icebolt", { pal: { b: "#9ee8ff", B: "#e8f8ff", w: "#6b4430" }, frames: [["b....", "wwwwB", "b...."]] }],
   ["blowgun", { pal: { w: "#9cc56b", k: "#3a322c" }, frames: [["......w", ".....w.", "....w..", "...w...", "..w....", ".k....."]] }],
   ["dart", { pal: { k: "#3a322c", g: "#c8f8e8", G: "#fdf3de" }, frames: [["g..", "kkG", "g.."]] }],
   ["censer", { pal: { g: "#c8a060", f: "#ff7a2a", F: "#f6d36b", k: "#6a625a" }, frames: [["...k...", "..kgk..", ".ggggg.", ".gfFfg.", "..ggg..", "...k..."]] }],
   ["rainstick", { pal: { b: "#4aa8ff", w: "#a06a3e" }, frames: [["b.b.b..", ".b.b...", "....w..", "...w...", "..w....", ".w.....", "w......"]] }],
   ["raindrop", { pal: { b: "#4aa8ff", B: "#e8f8ff" }, frames: [[".b.", "bBb", ".b."]] }],
   ["chime", { pal: { y: "#d8e8ff", Y: "#ffffff", k: "#6a625a" }, frames: [["..k..", ".yyy.", ".yYy.", "yyyyy", "..k.."]] }],
   ["yoyo", { pal: { o: "#a06a3e", O: "#d39a52", s: "#fdf3de" }, frames: [["..s....", "..s....", "..s....", ".ooo...", "oOooo..", ".ooo..."]] }],
   ["chakram", { pal: { f: "#ff7a2a", F: "#f6d36b" }, frames: [[".fff.", "fF.Ff", "f...f", "fF.Ff", ".fff."]] }],
   ["rod", { pal: { w: "#8a5a3b", s: "#e8f8ff", h: "#c8c0b0" }, frames: [["......w", ".....w.", "....w.s", "...w..s", "..w...s", ".w....h", "w......"]] }],
   ["bell", { pal: { y: "#c8a060", Y: "#f6d36b", k: "#5a3018" }, frames: [["..k..", ".yyy.", "yyYyy", "yyyyy", ".kyk."]] }],
   ["lampion", { pal: { r: "#c8553d", Y: "#f6d36b", y: "#fdf3de", k: "#3a322c" }, frames: [["..k..", ".rrr.", "rrYrr", "rYyYr", ".rrr.", "..k.."]] }],
   ["wisp", { pal: { f: "#ff9a3a", F: "#fdf3de" }, frames: [[".f.", "fFf", ".f."]] }],
   ["conch", { pal: { c: "#f2c8b0", C: "#d88a70" }, frames: [["...cc..", "..cCcc.", ".cCcCcc", "cCcCcc.", ".cccc.."]] }],
   ["crab", { pal: { c: "#e8603a", k: "#1b1226" }, frames: [["c.....c", ".c...c.", ".ccccc.", "cckckcc", ".c.c.c."], ["c.....c", ".c...c.", ".ccccc.", "cckckcc", "c.c.c.c"]] }],
   ["flute", { pal: { w: "#d39a52", k: "#5a3018" }, frames: [["......w", ".....w.", "....k..", "...w...", "..k....", ".w.....", "w......"]] }],
   ["blackbird", { flying: true, pal: { k: "#1b1226", K: "#3a3a4a", y: "#f2a030" }, frames: [["k......k", "kk.kk.kk", ".kKKKKk.", "..kyk...", "...kk..."], ["........", "kkkkkkkk", ".kKKKKk.", "..kyk...", "...kk..."]] }],
   ["shrew", { pal: { b: "#8a6a5a", k: "#1b1226", n: "#f2a0a0" }, frames: [[".bb.....", "bbbbbb..", "bkbbbbbn", ".bbbbbb.", "..b..b.."]] }]
  ].forEach(function (s) { SPRITES[s[0]] = s[1]; });
  var D5 = function (a, b, c, d, e) { return [a, b, c, d, e]; };
  [
    ["marteau_coup", { name: "Coup de marteau", icon: "hammer", type: "hammer", family: "melee", R: [20, 22, 24, 26, 30], reach: 18, dmg: [26, 32, 38, 44, 54], cd: [1.4, 1.35, 1.3, 1.2, 1.05], desc: D5("Un coup lent au sol devant toi, avec une petite onde de choc.", "+dégâts.", "Onde plus large.", "Frappe plus vite.", "Plus large, +dégâts.") }],
    ["hache_taille", { name: "Taille de hache", icon: "axe", type: "slash", family: "melee", r: [26, 28, 30, 32, 36], arc: [2.4, 2.4, 2.6, 2.6, 2.8], dmg: [16, 20, 23, 27, 33], cd: [1.0, 0.95, 0.9, 0.85, 0.75], hfx: { ignite: 0.1 }, desc: D5("Une large taille en arc ; 10 % de chance d'enflammer.", "+dégâts.", "Arc plus large.", "Plus rapide.", "Plus large, +dégâts.") }],
    ["arbalete_tir", { name: "Carreau de givre", icon: "crossbow", type: "shooter", family: "tir", sprite: "icebolt", count: [1, 1, 1, 2, 2], dmg: [20, 25, 30, 30, 38], pierce: [4, 4, 5, 5, 6], cd: [1.2, 1.15, 1.1, 1.0, 0.9], spd: 120, range: 180, hfx: { slow: 0.4 }, desc: D5("Un carreau lent et perçant qui ralentit.", "+dégâts.", "Transperce un ennemi de plus.", "+1 carreau.", "Plus rapide, +dégâts.") }],
    ["sarbacane_tir", { name: "Dard", icon: "blowgun", type: "shooter", family: "tir", sprite: "dart", count: [1, 1, 1, 1, 2], dmg: [8, 10, 11, 13, 14], pierce: [1, 1, 1, 2, 2], cd: [0.45, 0.42, 0.38, 0.35, 0.32], spd: 340, range: 200, desc: D5("Un dard très rapide et précis.", "+dégâts.", "Souffle plus vite.", "Transperce.", "+1 dard.") }],
    ["encensoir_fumee", { name: "Fumée brûlante", icon: "censer", type: "aura", family: "zone", color: "smoke", smoke: 1, R: [26, 28, 30, 32, 36], dmg: [4, 5, 6, 7, 9], tick: 0.5, push: [0, 0, 0, 0, 0], hfx: { ignite: 0.06 }, desc: D5("Un nuage de fumée brûlante autour de toi, qui pulse.", "+dégâts.", "Nuage plus large.", "+dégâts.", "Plus large, brûle plus.") }],
    ["pluie_baton", { name: "Petite pluie", icon: "rainstick", type: "drizzle", family: "zone", n: [3, 3, 4, 4, 5], R: 60, dmg: [9, 11, 12, 14, 16], rad: [10, 10, 11, 12, 13], cd: [0.9, 0.85, 0.8, 0.75, 0.65], desc: D5("Une petite pluie tombe autour de toi et frappe au hasard.", "+dégâts.", "+1 goutte.", "Plus fréquente.", "+1 goutte, +dégâts.") }],
    ["carillon_onde", { name: "Onde sonore", icon: "chime", type: "sonic", family: "zone", R: [50, 54, 58, 62, 70], dmg: [12, 15, 17, 20, 24], cd: [1.5, 1.45, 1.4, 1.3, 1.15], spd: 140, desc: D5("Une onde sonore part de toi à intervalle régulier.", "+dégâts.", "Onde plus large.", "Plus fréquente.", "Plus large, +dégâts.") }],
    ["yoyo_jet", { name: "Yo-yo", icon: "yoyo", type: "boomerang", family: "retour", sprite: "nut", yoyo: 1, n: [1, 1, 1, 2, 2], dmg: [13, 17, 20, 22, 27], range: [70, 75, 80, 85, 95], cd: [1.0, 0.95, 0.9, 0.85, 0.75], chain: 0, desc: D5("La noix part vers l'ennemi le plus proche et revient au bout de son fil.", "+dégâts.", "Fil plus long.", "+1 yo-yo.", "Plus rapide, +dégâts.") }],
    ["chakram_jet", { name: "Anneau de feu", icon: "chakram", type: "boomerang", family: "retour", sprite: "chakram", fast: 1, n: [1, 1, 2, 2, 2], dmg: [12, 15, 16, 19, 23], range: [110, 115, 120, 130, 140], cd: [1.4, 1.3, 1.3, 1.2, 1.05], chain: 0, desc: D5("Un anneau de feu part en ligne droite et revient en traversant.", "+dégâts.", "+1 anneau.", "Plus loin.", "Plus rapide, +dégâts.") }],
    ["canne_jet", { name: "Hameçon", icon: "rod", type: "grapple", family: "retour", n: [1, 1, 1, 1, 2], dmg: [14, 18, 21, 25, 30], range: [120, 130, 140, 150, 160], cd: [1.4, 1.35, 1.3, 1.2, 1.05], desc: D5("L'hameçon part, accroche un ennemi et revient en le tirant vers toi.", "+dégâts.", "Ligne plus longue.", "Plus rapide.", "+1 hameçon.") }],
    ["grelot_appel", { name: "Musaraignes", icon: "bell", type: "burrow", family: "compagnon", pop: "shrew", n: [1, 1, 2, 2, 3], dmg: [12, 15, 16, 19, 22], rad: 14, cd: [1.3, 1.25, 1.2, 1.1, 1.0], desc: D5("Des musaraignes surgissent du sol sous l'ennemi le plus proche.", "+dégâts.", "+1 musaraigne.", "Plus fréquentes.", "+1 musaraigne.") }],
    ["lampion_esprit", { name: "Esprit de flamme", icon: "lampion", type: "shooter", family: "compagnon", sprite: "wisp", homing: 1, lampion: 1, count: [1, 1, 1, 2, 2], dmg: [14, 17, 20, 21, 25], pierce: [1, 1, 1, 1, 2], cd: [1.1, 1.05, 1.0, 0.95, 0.85], spd: 90, range: 170, hfx: { ignite: 0.25 }, desc: D5("Un esprit de flamme sort du lampion et brûle l'ennemi le plus proche.", "+dégâts.", "Plus fréquent.", "+1 esprit.", "Transperce, +dégâts.") }],
    ["conque_crabe", { name: "Crabe", icon: "conch", type: "pet", family: "compagnon", pet: "crab", crab: 1, n: [1, 1, 2, 2, 3], dmg: [11, 14, 14, 17, 21], rate: [0.7, 0.65, 0.6, 0.55, 0.5], spd: [90, 95, 100, 110, 120], range: 140, desc: D5("Un crabe surgit et pince l'ennemi le plus proche.", "+dégâts.", "+1 crabe.", "Pince plus vite.", "+1 crabe.") }],
    ["flute_oiseau", { name: "Merle", icon: "flute", type: "pet", family: "compagnon", pet: "blackbird", fly: true, roll: true, bird: 1, n: [1, 1, 2, 2, 2], dmg: [12, 15, 16, 19, 24], rate: [0.8, 0.75, 0.7, 0.65, 0.55], spd: [150, 155, 160, 170, 180], range: 170, desc: D5("Un oiseau pique sur l'ennemi le plus proche et revient.", "+dégâts.", "+1 oiseau.", "Pique plus vite.", "Plus rapide, +dégâts.") }],
  ].forEach(function (b) { BASES[b[0]] = WEAPONS[b[0]] = b[1]; });
  // nom, icône, attaque de base, famille, élément, quête, description, habillage des 12 techniques
  var ARMES2 = {
    marteau: ["Marteau", "hammer", "marteau_coup", "melee", "terre", "Mêlée, Terre. Coups lourds, ondes de choc et rivets.",
      { fente: ["Coup de manche"], tourbillon: ["Moulin de fer"], charge: ["Ruée du forgeron"], riposte: ["Parade de fer"], onde: ["Onde de choc"], pluie: ["Pluie de clous"], piege: ["Clous semés"], orbite: ["Masses tournantes", "hammer"], mortier: ["Marteau lancé"], boomerang: ["Marteau-retour", "hammer"], grappin: ["Chaîne de forge"], sentinelle: ["Petite forge"] }],
    hache: ["Hache", "axe", "hache_taille", "melee", "feu", "Mêlée, Feu. Larges tailles qui enflamment et fissures brûlantes.",
      { fente: ["Coup de taille"], tourbillon: ["Valse de hache"], charge: ["Ruée sauvage"], riposte: ["Contre-hache"], onde: ["Souffle de braise"], pluie: ["Pluie d'escarbilles"], mortier: ["Bûche enflammée"], boomerang: ["Hache de jet", "axe"], ricochet: ["Éclat de braise"], aura: ["Fournaise"], familier: ["Furet ardent", "pethog"], echo: ["Ombre du bûcheron"] }],
    arbalete: ["Arbalète de givre", "crossbow", "arbalete_tir", "tir", "eau", "Tir, Eau. Carreaux lents et perçants qui ralentissent et gèlent.",
      { projection: ["Carreau perçant", "icebolt"], rafale: ["Salve de glace", "icebolt"], rayon: ["Rayon gelé"], onde: ["Onde de froid"], pluie: ["Grésil"], piege: ["Mâchoires de glace"], orbite: ["Cristaux tournants", "raindrop"], mortier: ["Bloc de glace"], ricochet: ["Éclat de givre"], grappin: ["Carreau-filin"], echo: ["Reflet de givre"], sentinelle: ["Baliste de glace"] }],
    sarbacane: ["Sarbacane", "blowgun", "sarbacane_tir", "tir", "air", "Tir, Air. Dards très rapides, précis et perçants.",
      { projection: ["Dard perçant", "dart"], rafale: ["Salve de dards", "dart"], rayon: ["Jet d'air"], pluie: ["Averse de dards"], piege: ["Dards plantés"], orbite: ["Dards en orbite", "dart"], ricochet: ["Dard rebondissant"], grappin: ["Dard-ficelle"], echo: ["Second souffle"], sentinelle: ["Tube posé"], familier: ["Mésange", "blackbird"], nuee: ["Essaim de dards"] }],
    encensoir: ["Encensoir", "censer", "encensoir_fumee", "zone", "feu", "Zone, Feu. Fumée brûlante qui s'étend, cendres et braises.",
      { tourbillon: ["Tourbillon de fumée"], riposte: ["Retour de flamme"], onde: ["Bouffée ardente"], pluie: ["Pluie de cendres"], piege: ["Charbons ardents"], orbite: ["Braises tournantes", "wisp"], aura: ["Halo de fumée"], mortier: ["Pot de feu"], echo: ["Fumée jumelle"], sentinelle: ["Brasero"], familier: ["Phalène de feu", "blackbird"], nuee: ["Nuée d'étincelles"] }],
    pluie: ["Bâton de pluie", "rainstick", "pluie_baton", "zone", "eau", "Zone, Eau. Une pluie qui frappe au hasard, flaques et crues.",
      { riposte: ["Éclaboussure"], onde: ["Ronds dans l'eau"], pluie: ["Ondée"], piege: ["Bulles-pièges"], orbite: ["Gouttes tournantes", "raindrop"], aura: ["Bruine"], mortier: ["Seau d'eau"], ricochet: ["Ricochet de galet"], grappin: ["Courant attirant"], echo: ["Reflet de pluie"], familier: ["Têtard", "pethog"], nuee: ["Nuée de gouttes"] }],
    carillon: ["Carillon", "chime", "carillon_onde", "zone", "air", "Zone, Air. Ondes sonores qui résonnent et étourdissent.",
      { rayon: ["Note perçante"], tourbillon: ["Ronde sonore"], riposte: ["Contre-chant"], onde: ["Volée de cloches"], pluie: ["Pluie de notes"], piege: ["Clochettes-pièges"], orbite: ["Clochettes tournantes", "chime"], aura: ["Bourdonnement"], ricochet: ["Note rebondissante"], echo: ["Double carillon"], familier: ["Rossignol", "blackbird"], nuee: ["Nuée de notes"] }],
    yoyo: ["Yo-yo de noix", "yoyo", "yoyo_jet", "retour", "terre", "Retour, Terre. Une noix au bout d'un fil qui coupe et étourdit.",
      { projection: ["Noix lancée", "nut"], fente: ["Fil coupant"], tourbillon: ["Ronde de fil"], charge: ["Ruée de noix", "nut"], piege: ["Noix piégées"], orbite: ["Noix en orbite", "nut"], mortier: ["Grosse noix"], boomerang: ["Noix-retour", "nut"], ricochet: ["Noix rebondissante"], grappin: ["Fil-lasso"], sentinelle: ["Toupie posée"], familier: ["Loir", "pethog"] }],
    chakram: ["Chakram", "chakram", "chakram_jet", "retour", "feu", "Retour, Feu. Anneaux de feu qui traversent et reviennent.",
      { projection: ["Disque lancé", "chakram"], rafale: ["Volée d'anneaux", "chakram"], rayon: ["Rai de feu"], tourbillon: ["Roue de feu"], riposte: ["Parade d'anneau"], orbite: ["Anneaux tournants", "chakram"], aura: ["Halo ardent"], mortier: ["Disque-obus"], boomerang: ["Anneau-retour", "chakram"], ricochet: ["Anneau rebondissant"], grappin: ["Anneau-crochet"], echo: ["Anneau fantôme"] }],
    canne: ["Canne à pêche", "rod", "canne_jet", "retour", "eau", "Retour, Eau. Hameçons qui ramènent les ennemis vers toi.",
      { projection: ["Plomb lancé"], charge: ["Lame de fond", "bubble"], onde: ["Rides"], pluie: ["Pluie d'hameçons"], piege: ["Nasses"], orbite: ["Bouchons tournants", "bubble"], boomerang: ["Bouchon-retour", "bubble"], ricochet: ["Ricochet sur l'eau"], grappin: ["Ligne lestée"], echo: ["Pêcheur fantôme"], sentinelle: ["Canne posée"], familier: ["Martin-pêcheur", "blackbird"] }],
    grelot: ["Grelot", "bell", "grelot_appel", "compagnon", "terre", "Compagnon, Terre. Musaraignes qui surgissent du sol.",
      { tourbillon: ["Ronde de terre"], charge: ["Ruée du troupeau"], riposte: ["Contre-morsure"], onde: ["Grondement"], piege: ["Trous de musaraigne"], orbite: ["Mottes tournantes", "stone"], aura: ["Terre meuble"], grappin: ["Racine-lasso"], echo: ["Double de terre"], sentinelle: ["Tertre de garde"], familier: ["Blaireautin", "pethog"], nuee: ["Nuée de mulots"] }],
    lampion: ["Lampion", "lampion", "lampion_esprit", "compagnon", "feu", "Compagnon, Feu. Esprits de flamme qui chassent pour toi.",
      { projection: ["Boule de feu", "wisp"], rayon: ["Rayon de lampe"], riposte: ["Retour d'étincelles"], pluie: ["Pluie de feu"], orbite: ["Flammèches", "wisp"], aura: ["Chaleur"], mortier: ["Lampion lancé"], ricochet: ["Flamme bondissante"], echo: ["Flamme jumelle"], sentinelle: ["Lampion suspendu"], familier: ["Grand esprit", "petowl"], nuee: ["Essaim de braises"] }],
    conque: ["Conque", "conch", "conque_crabe", "compagnon", "eau", "Compagnon, Eau. Des crabes qui pincent et bloquent les tirs.",
      { tourbillon: ["Remous de sable"], charge: ["Ruée des crabes", "bubble"], riposte: ["Pince-riposte"], onde: ["Bruit des vagues"], piege: ["Coquilles piégées"], orbite: ["Nacres tournantes", "bubble"], aura: ["Embruns"], grappin: ["Pince-crochet"], echo: ["Reflet de nacre"], sentinelle: ["Bénitier"], familier: ["Bernard-l'ermite", "crab"], nuee: ["Nuée de crevettes"] }],
    flute: ["Flûte", "flute", "flute_oiseau", "compagnon", "air", "Compagnon, Air. Des oiseaux qui piquent et interceptent les tirs.",
      { projection: ["Plume-flèche", "feather"], rayon: ["Trille"], onde: ["Battement d'ailes"], pluie: ["Pluie de duvet"], orbite: ["Ronde d'hirondelles", "feather"], boomerang: ["Pigeon voyageur", "feather"], ricochet: ["Piqué en chaîne"], grappin: ["Serres"], echo: ["Oiseau-reflet"], sentinelle: ["Nichoir"], familier: ["Épervier", "hawk"], nuee: ["Nuée de moineaux"] }],
  };
  var AQ = {
    marteau: ["Bats la Taupe géante.", function (r) { return !!(r.bossT && r.bossT.bigmole); }],
    hache: ["Détruis 40 éléments du décor dans une partie.", function (r) { return (r.props || 0) >= 40; }],
    arbalete: ["Gèle 50 ennemis dans une partie.", function (r) { return (r.freezes || 0) >= 50; }],
    sarbacane: ["Tue 300 ennemis avec des techniques de Tir dans une partie.", function (r) { return (r.tirKills || 0) >= 300; }],
    encensoir: ["Brûle 200 ennemis dans une partie.", function (r) { return (r.burns || 0) >= 200; }],
    pluie: ["Déclenche 20 réactions Boue ou Vapeur dans une partie.", function (r) { var k = r.reactK || {}; return (k["eau+terre"] || 0) + (k["eau+feu"] || 0) >= 20; }],
    carillon: ["Reste ancré 3 minutes au total dans une partie.", function (r) { return (r.anchorTot || 0) >= 180; }],
    yoyo: ["Monte une technique de Retour au niveau 5.", function (r) { return !!r.retour5; }],
    chakram: ["Aie 3 techniques de Retour en même temps.", function (r) { return (r.retourMax || 0) >= 3; }],
    canne: ["Réussis 3 extractions.", function (r) { return ((r.tot && r.tot.extracts) || 0) >= 3; }],
    grelot: ["Aie 4 techniques de Compagnon en même temps.", function (r) { return (r.compMax || 0) >= 4; }],
    lampion: ["Traverse une nuit d'Expédition.", function (r) { return !!r.nightDone; }],
    conque: ["Bats le Grand Castor.", function (r) { return !!(r.bossT && r.bossT.castor); }],
    flute: ["Fais 100 Voltes dans une partie.", function (r) { return (r.voltes || 0) >= 100; }],
  };
  Object.keys(ARMES2).forEach(function (k) {
    var a = ARMES2[k], sk = {};
    Object.keys(a[6]).forEach(function (t) { sk[t] = a[6][t]; });
    ARMES[k] = { name: a[0], icon: a[1], base: a[2], fam: a[3], element: a[4], desc: a[5], skin: sk, quest: "q4_" + k };
    QUESTS.push({ id: "q4_" + k, desc: AQ[k][0], check: AQ[k][1] });
  });
  // signatures : 3 par arme, chacune avec sa règle (kind)
  var SIG2 = {
    marteau: [["sig_enclume", "anvil", null, "Enclume", "Ancré depuis 1 s : le prochain coup est 3 fois plus fort et étourdit."],
              ["sig_rivet", "rivet", null, "Rivet", "Chaque coup plante un rivet ; à 3 rivets, l'ennemi est cloué 1 s."],
              ["sig_choc", "slam", null, "Choc en retour", "Un ennemi repoussé contre un obstacle prend le double."]],
    hache: [["sig_abatteur", "lumber", "feu", "Abatteur", "Détruire un élément du décor enflamme autour de toi et rend 2 PV."],
            ["sig_tranchefeu", "critFire", "feu", "Tranche-feu", "Les coups critiques laissent une ligne de feu."],
            ["sig_fendoir", "fissure", "feu", "Fendoir", "Toutes les 5 s, la hache se plante et ouvre une fissure qui brûle."]],
    arbalete: [["sig_carreau", "freeze5", "eau", "Carreau gelé", "Un tir sur 5 gèle 1 s."],
               ["sig_visee", "aim", null, "Visée", "Ancrée, chaque seconde ajoute +30 % au prochain tir (3 fois max)."],
               ["sig_stalactite", "stalactite", "eau", "Stalactite", "Les carreaux plantés au sol deviennent des pics de glace."]],
    sarbacane: [["sig_souffle", "longBreath", null, "Souffle long", "Ancrée, portée et vitesse des dards doublées."],
                ["sig_sifflante", "whistle", "air", "Fléchette sifflante", "Les tirs traversent 2 ennemis de plus et marquent Air à coup sûr."],
                ["sig_volee", "volteDarts", "air", "Volée de dards", "À la Volte, 8 dards partent en cercle."]],
    encensoir: [["sig_encens", "incense", "feu", "Encens", "Ancré, la fumée s'étend de 10 % par seconde, jusqu'au double."],
                ["sig_cendres", "ash", null, "Cendres lentes", "Les ennemis tués près de toi laissent des cendres qui ralentissent."],
                ["sig_aveugle", "blind", null, "Fumée aveuglante", "Les ennemis proches de toi ratent un tir sur deux."]],
    pluie: [["sig_flaques", "puddles", "eau", "Flaques", "La pluie laisse des flaques ; en mouvement dedans, tu vas 20 % plus vite."],
            ["sig_crue", "flood", "eau", "Crue", "Toutes les 20 s, l'eau monte autour de toi et repousse."],
            ["sig_arcenciel", "rainbow", null, "Arc-en-ciel", "Une réaction déclenchée près de toi lâche une noisette d'XP en plus."]],
    carillon: [["sig_resonance", "resonance", null, "Résonance", "Un ennemi touché par 2 ondes en moins de 1 s prend le double."],
               ["sig_tenue", "sustain", null, "Note tenue", "Ancré, les ondes s'enchaînent sans pause."],
               ["sig_gamme", "gamme", "air", "Gamme", "Une onde sur 7 repousse et étourdit."]],
    yoyo: [["sig_fil", "string", null, "Fil tendu", "En mouvement, le fil reste tendu derrière toi et coupe ce qu'il traverse."],
           ["sig_noixdure", "stunOut", "terre", "Noix dure", "Tes projectiles de Retour étourdissent à l'aller."],
           ["sig_tour", "volteSpin", "terre", "Tour du monde", "À la Volte, le yo-yo fait un tour complet autour de toi."]],
    chakram: [["sig_rougie", "redBlade", "feu", "Lame rougie", "Chaque retour réussi : +10 % de dégâts (5 fois max), perdus si tu es touché."],
              ["sig_double", "volteRing2", "feu", "Double anneau", "À la Volte, un 2e anneau part à l'opposé."],
              ["sig_sillon", "fireTrail", "feu", "Sillon ardent", "Tes projectiles de Retour laissent une ligne de feu au sol."]],
    canne: [["sig_prise", "catch", null, "Prise", "Un ennemi ramené jusqu'à toi lâche une noisette d'XP en plus."],
            ["sig_remontee", "reel", null, "Remontée", "Ancrée, la ligne ramène 2 fois plus fort."],
            ["sig_grospoisson", "bigFish", null, "Gros poisson", "Sur une élite ou un boss, l'hameçon reste planté et blesse en continu."]],
    grelot: [["sig_galeries", "galleries", "terre", "Galeries", "Les musaraignes étourdissent en surgissant."],
             ["sig_rassemblement", "rally", null, "Rassemblement", "Ancré, tes compagnons reviennent autour de toi et tu gagnes 2 d'armure."],
             ["sig_colonie", "colony", null, "Colonie", "+1 musaraigne tous les 5 niveaux de partie."]],
    lampion: [["sig_meche", "wick", "feu", "Mèche", "Ancré, le lampion lance 2 fois plus d'esprits."],
              ["sig_fete", "volteLanterns", "feu", "Fête des lampions", "À la Volte, 5 lampions s'envolent et explosent."],
              ["sig_braises", "docile", null, "Braises dociles", "Les esprits ramassent les noisettes d'XP pour toi."]],
    conque: [["sig_nacre", "nacre", null, "Carapace de nacre", "Tes crabes bloquent les tirs ennemis."],
             ["sig_mareecrabes", "volteCrabs", "eau", "Marée de crabes", "À la Volte, 4 crabes surgissent en cercle."],
             ["sig_perle", "pearl", null, "Perle", "Un crabe qui survit 20 s devient un crabe géant."]],
    flute: [["sig_melodie", "melody", null, "Mélodie", "Ancré, tes oiseaux tournent autour de toi et interceptent les tirs."],
            ["sig_envol", "volteDive", "air", "Envol", "À la Volte, tous tes oiseaux piquent ensemble."],
            ["sig_merle", "blackbird", null, "Chant du merle", "Un piqué sur 10 appelle un merle de plus pour 10 s."]],
  };
  Object.keys(SIG2).forEach(function (a) { SIGS[a] = SIG2[a].map(function (s) { return { id: s[0], kind: s[1], elem: s[2], name: s[3], icon: ARMES[a].icon, desc: s[4] }; }); });
  var ULT2 = {
    marteau: ["Frappe du titan", "cross", "terre", "Le sol se fend en croix sur tout l'écran."],
    hache: ["Grand chêne abattu", "oak", "feu", "Un chêne géant s'abat en travers de l'écran."],
    arbalete: ["Hiver éternel", "freeze", "eau", "Tout l'écran gèle 3 s."],
    sarbacane: ["Tempête de dards", "darts", "air", "Pendant 5 s, chaque ennemi à l'écran reçoit un dard toutes les 0,2 s."],
    encensoir: ["Bûcher", "pyre", "feu", "Une colonne de feu géante te suit 6 s."],
    pluie: ["Mousson", "monsoon", "eau", "6 s de déluge sur tout l'écran, tout est marqué Eau."],
    carillon: ["Grand bourdon", "bell", "air", "Une cloche géante sonne 3 fois et étourdit tout l'écran."],
    yoyo: ["Grand tour", "sweep", "terre", "3 yo-yos géants balaient l'écran."],
    chakram: ["Roue solaire", "wheel", "feu", "Un chakram géant tourne autour de toi et grandit pendant 6 s."],
    canne: ["Pêche miraculeuse", "net", "eau", "Un filet géant ramène tous les ennemis de l'écran vers toi."],
    grelot: ["Grande colonie", "colony", "terre", "Pendant 5 s, le sol de l'écran grouille de musaraignes."],
    lampion: ["Nuit des lampions", "lanterns", "feu", "Pendant 6 s, des dizaines de lampions brûlent tout l'écran."],
    conque: ["Roi des crabes", "crabking", "eau", "Un crabe colossal surgit et frappe tout l'écran 3 fois."],
    flute: ["Grande migration", "flock", "air", "Un vol d'oiseaux traverse l'écran 3 fois."],
  };
  Object.keys(ULT2).forEach(function (a) { var u = ULT2[a]; ULTS[a] = { name: u[0], kind: u[1], elem: u[2], desc: u[3] }; });
  /* =====================================================================
     Contenu étendu, lot 3 : objets à effets (états, réactions, rôles, sanctuaires, Expédition, coop)
     ===================================================================== */
  // [id, rareté 0-3, icône, nom, effet, options]
  [
    // Ancré
    ["pierre_patience", 0, "🪨", "Pierre de patience", "Ancré depuis 2 s : ta prochaine technique fait +50 %.", { quest: "q5_patience" }],
    ["souche", 0, "🪵", "Souche", "Ancré : les tirs ennemis ralentissent de moitié à moins de 60 px de toi."],
    ["nid_mousse", 0, "🪺", "Nid de mousse", "Ancré depuis 3 s : les noisettes d'XP viennent à toi de 2 fois plus loin."],
    ["bogue", 1, "🌰", "Bogue de châtaigne", "Ancré : un ennemi qui te frappe au contact prend 15 dégâts."],
    ["ancre_pierre", 1, "⚓", "Ancre de pierre", "Ancré : on ne peut plus te repousser ; un Chargeur qui te percute est étourdi 1 s."],
    ["cadran", 1, "🕰️", "Cadran solaire", "Ancré : les recharges défilent 25 % plus vite."],
    ["meditation", 2, "🧘", "Méditation", "Ancré depuis 3 s : +4 % de dégâts par seconde ancrée, jusqu'au prochain mouvement (max +40 %).", { quest: "q5_meditation" }],
    ["cloche_pierre", 2, "🔔", "Cloche de pierre", "Ancré : toutes les 5 s, une onde étourdit les ennemis proches 0,5 s."],
    ["statuette", 2, "🐿️", "Statuette d'écureuil", "Ancré : tes objets « au coup » se déclenchent 50 % plus souvent."],
    ["racine_mere", 3, "🌳", "Racine-mère", "Ancré : chaque seconde réduit de 10 % le prochain coup reçu (max 60 %), et tes techniques de Zone sont 30 % plus larges.", { quest: "q5_racinemere" }],
    // Mouvement
    ["fil_ariane", 0, "🧶", "Fil d'Ariane", "En mouvement, ta traînée ramasse les noisettes d'XP pendant 2 s."],
    ["ecorce_glissante", 0, "🍂", "Écorce glissante", "En mouvement : 10 % de chance d'ignorer un coup au contact."],
    ["gland_roulant", 0, "🌰", "Gland roulant", "Tous les 200 px parcourus, un gland roule vers l'ennemi le plus proche (20 dégâts)."],
    ["patin", 1, "🍃", "Patin de feuille", "En mouvement, flaques et toiles ennemies ne te ralentissent plus."],
    ["sillon", 1, "↩️", "Sillon", "En mouvement, tes projectiles partent aussi derrière toi, à 40 %."],
    ["vent_arriere", 1, "💨", "Vent arrière", "Après 3 s de course : +25 % de vitesse et de portée des projectiles."],
    ["comete_poche", 2, "☄️", "Comète de poche", "En mouvement, toutes les 4 s, une traînée d'étoiles explose derrière toi (40 dégâts)."],
    ["dynamo", 2, "⚙️", "Dynamo", "Tous les 500 px parcourus, ta technique la plus lente se recharge d'un coup."],
    ["vent_dos", 2, "🌬️", "Vent du dos", "En mouvement, les tirs ennemis qui arrivent par derrière sont déviés."],
    ["semelles", 3, "👟", "Semelles des sept lieues", "+20 % de vitesse ; à pleine course, tu traverses les ennemis de Nuée en les tuant.", { quest: "q5_semelles" }],
    // Volte
    ["pirouette", 0, "🌀", "Pirouette", "Chaque Volte rend 3 PV."],
    ["feinte", 0, "🎭", "Feinte", "Après une Volte, les ennemis au contact frappent à côté pendant 1 s."],
    ["eclats_bois", 0, "🪓", "Éclats de bois", "Chaque Volte lance 4 éclats de bois en croix (12 dégâts)."],
    ["contre_courant", 1, "🔄", "Contre-courant", "Chaque Volte inverse le sens de tes orbites et boomerangs, qui font +30 % pendant 2 s."],
    ["leurre", 1, "🍁", "Leurre de feuilles", "Chaque Volte laisse un leurre qui attire les ennemis 2 s."],
    ["frisson", 1, "🥶", "Frisson", "Après une Volte, ta prochaine attaque gèle 0,5 s."],
    ["double_detente", 2, "⏩", "Double détente", "La Volte se stocke 2 fois.", { quest: "q5_double" }],
    ["pivot", 2, "📍", "Pivot", "Chaque Volte termine la recharge de ta technique la plus proche d'être prête."],
    ["girouette", 2, "🌪️", "Girouette", "Chaque Volte crée un petit cyclone qui file dans la direction prise (30 dégâts/s pendant 2 s)."],
    ["pas_ecureuil", 3, "🐾", "Pas de l'écureuil", "Tuer une élite recharge la Volte, et chaque Volte déclenche une fois tes effets « au coup ».", { quest: "q5_pas" }],
    // Réactions élémentaires
    ["givre_persistant", 0, "❄️", "Givre persistant", "Les gels durent 0,6 s de plus."],
    ["soufflet", 0, "🪗", "Soufflet", "Les embrasements sont 30 % plus larges."],
    ["glaise", 0, "🟫", "Glaise", "La boue dure 2 s de plus."],
    ["bouilloire", 0, "🫖", "Bouilloire", "Le nuage de vapeur dure 2 s de plus."],
    ["dune", 0, "🏜️", "Dune", "La tempête de sable repousse 40 % plus loin."],
    ["feu_foret", 1, "🔥", "Feu de forêt", "Un embrasement a 30 % de chance d'en déclencher un 2e sur un ennemi proche."],
    ["sables_mouvants", 1, "⏳", "Sables mouvants", "Les ennemis pris dans la boue prennent +25 % de dégâts."],
    ["sauna", 1, "♨️", "Sauna", "Dans ta propre vapeur, tu régénères 2 PV/s."],
    ["obsidienne", 1, "🖤", "Obsidienne", "Le magma laisse une flaque de lave pendant 3 s (10 dégâts/s)."],
    ["statue_glace", 2, "🧊", "Statue de glace", "Un ennemi gelé devient un obstacle qui bloque les tirs ennemis pendant 2 s.", { quest: "q5_statue" }],
    ["eruption", 2, "🌋", "Éruption", "Tous les 10 magmas, une éruption frappe tout l'écran (80 dégâts).", { quest: "q5_eruption" }],
    ["mirage", 2, "🏝️", "Mirage", "Les ennemis pris dans une tempête de sable ratent leurs attaques pendant 2 s.", { quest: "q5_mirage" }],
    // Rôles d'ennemis
    ["filet_papillons", 0, "🦋", "Filet à papillons", "Tuer 3 ennemis de Nuée en 1 s rend 2 PV."],
    ["miroir_poche", 0, "🪞", "Miroir de poche", "Les Tireurs à moins de 100 px de toi tirent 40 % moins vite."],
    ["feuilles_mortes", 0, "🍂", "Feuilles mortes", "Les Guetteurs tirent là où tu es, et plus là où tu vas."],
    ["ciseaux", 0, "✂️", "Ciseaux", "Tu coupes les toiles en les traversant ; chaque toile coupée rend 1 PV."],
    ["antenne", 0, "📡", "Antenne", "Un Rôdeur qui surgit sous toi est étourdi 1,5 s."],
    ["allumette", 0, "🧯", "Allumette mouillée", "Les Kamikazes ne te blessent plus, et leur explosion blesse les ennemis 2 fois plus."],
    ["muleta", 1, "🚩", "Muleta", "Un Chargeur qui te rate est étourdi 2 s et prend +50 %."],
    ["bouclier_boue", 1, "🛡️", "Bouclier de boue", "Tuer un Artilleur fait exploser ses zones en cours contre les ennemis."],
    ["pince", 1, "🔧", "Pince-monseigneur", "Tes techniques de Tir traversent les boucliers de face, à 50 %.", { quest: "q5_pince" }],
    ["sifflet_strident", 1, "📯", "Sifflet strident", "Les Soutiens deviennent la cible prioritaire de tes techniques.", { quest: "q5_sifflet" }],
    // Sanctuaires
    ["chapelet", 0, "📿", "Chapelet de glands", "Chaque sanctuaire activé donne 10 glands."],
    ["cle_rouillee", 1, "🗝️", "Clé rouillée", "Un coffre scellé sur trois s'ouvre gratuitement."],
    ["de_pipe", 1, "🎲", "Dé pipé", "Au Totem de fortune, tu ne perds ta mise qu'une fois sur 4."],
    ["offrande", 1, "🕯️", "Offrande", "À l'Autel du sacrifice, tu gardes l'objet sacrifié une fois sur trois."],
    ["lettre_defi", 2, "✉️", "Lettre de défi", "Les élites du Totem de défi lâchent 2 objets.", { quest: "q5_lettre" }],
    ["reliquaire", 3, "⛩️", "Reliquaire", "+5 % de dégâts par type de sanctuaire activé dans la partie (max +50 %).", { quest: "q5_reliquaire" }],
    // Expédition (ne tombent qu'en Expédition)
    ["lampe_huile", 0, "🪔", "Lampe à huile", "La nuit ne réduit plus ta vision.", { expe: true }],
    ["pelle", 0, "⛏️", "Pelle", "Les gisements se récoltent 2 fois plus vite.", { expe: true }],
    ["sceau_passeur", 1, "🔖", "Sceau du passeur", "Le passeur ne prend que la moitié de tes glands.", { expe: true }],
    ["trousseau", 1, "🔑", "Trousseau", "Chaque élite a 25 % de chance de lâcher une clé de sortie.", { expe: true }],
    ["corde_rappel", 2, "🪢", "Corde de rappel", "Une fois par expédition, tu extrais sur place en restant ancré 10 s.", { expe: true, quest: "q5_corde" }],
    ["sacoche", 2, "👜", "Sacoche cousue", "+2 emplacements de sac pour cette expédition.", { expe: true, quest: "q5_sacoche" }],
    ["seve_pure", 2, "💧", "Sève pure", "La corruption avance 25 % moins vite sur cet étage et le suivant.", { expe: true, quest: "q5_seve" }],
    ["sablier_inverse", 2, "⌛", "Sablier inversé", "À chaque descente, un objet de plus est mis à l'abri.", { expe: true }],
    ["trophee_profondeur", 3, "🏅", "Trophée de profondeur", "+10 % de dégâts par étage descendu dans cette expédition.", { expe: true, quest: "q5_profondeur" }],
    // Coop (un allié, Pop compris)
    ["bracelet", 0, "📿", "Bracelet tressé", "COOP · Près d'un allié, les noisettes d'XP rapportent 10 % de plus.", { coop: true }],
    ["echarpe", 0, "🧣", "Écharpe partagée", "COOP · Quand un allié ramasse un objet à effets, tu gagnes 5 PV.", { coop: true }],
    ["relais_volte", 1, "🏃", "Relais de Volte", "COOP · Ta Volte recharge aussi de 1 s celle de l'allié le plus proche.", { coop: true }],
    ["tambour", 2, "🥁", "Tambour", "COOP · Toutes les 10 s, les alliés à moins de 120 px gagnent +20 % de cadence pendant 3 s.", { coop: true, quest: "q5_tambour" }],
    ["banniere", 2, "🚩", "Bannière", "COOP · Ancré, tu plantes une bannière : les alliés autour gagnent +2 armure.", { coop: true }],
    ["ame_soeur", 3, "💞", "Âme sœur", "COOP · Un allié que tu relèves revient à 100 % de PV, une fois par carte ou par étage.", { coop: true, quest: "q5_ame" }],
    // méga boss (les 3 déjà là ; le Colosse garde son Cœur d'humus)
    ["perle_marais", 3, "🦪", "Perle des marais", "Trophée de la Mère des Marais : dans l'eau et la boue, tu régénères 3 PV/s.", { pool: "mega", mega: "mere" }],
    ["tison", 3, "🔥", "Tison éternel", "Trophée du Brasier ancestral : +1 point de Feu, et tes brûlures font +50 %.", { pool: "mega", mega: "brasier" }],
    ["couronne_eclairs", 3, "👑", "Couronne d'éclairs", "Trophée du Roi-Tempête : toutes les 2 s, un éclair frappe l'ennemi qui a le plus de PV (60 dégâts).", { pool: "mega", mega: "tempete" }],
    // diable et sacré
    ["contrat_cendres", 3, "📜", "Contrat de cendres", "DIABLE · +60 % de dégâts, mais plus aucun soin.", { pool: "diable" }],
    ["de_demon", 3, "🎲", "Dé du démon", "DIABLE · Chaque coffre donne 2 objets, mais chaque boss arrive en double.", { pool: "diable" }],
    ["corne_malin", 3, "😈", "Corne du malin", "DIABLE · Un ennemi tué a 10 % de chance de revenir en allié 10 s ; -25 % de PV max.", { pool: "diable" }],
    ["cloche_benie", 3, "🔔", "Cloche bénie", "SACRÉ · La 1re fois que tu touches une élite, elle perd ses pouvoirs pendant 5 s.", { pool: "sacre" }],
    ["pain_beni", 3, "🍞", "Pain béni", "SACRÉ · Les sources claires apparaissent 2 fois plus souvent et soignent entièrement.", { pool: "sacre" }],
    ["sceau_purete", 3, "🕊️", "Sceau de pureté", "SACRÉ · Immunité aux pouvoirs Vampire, Explosif et Épineux des élites.", { pool: "sacre" }],
  ].forEach(function (a) { var it = { id: a[0], r: a[1], icon: a[2], name: a[3], desc: a[4] }; var o = a[5] || {}; Object.keys(o).forEach(function (k) { it[k] = o[k]; }); ITEMS.push(it); });
  ITEMS.forEach(function (it, i) { it.idx = i; });
  QUESTS.push(
    { id: "q5_patience", desc: "Reste ancré 5 s d'affilée, 20 fois dans une partie.", check: function (r) { return (r.anchor5N || 0) >= 20; } },
    { id: "q5_meditation", desc: "Reste ancré 10 s d'affilée.", check: function (r) { return (r.anchorMax || 0) >= 10; } },
    { id: "q5_racinemere", desc: "Reste ancré 60 s d'affilée.", check: function (r) { return (r.anchorMax || 0) >= 60; } },
    { id: "q5_semelles", desc: "Parcours 20 000 px dans une partie.", check: function (r) { return (r.dist || 0) >= 20000; } },
    { id: "q5_double", desc: "Fais 2 Voltes en moins de 1 s, 10 fois dans une partie.", check: function (r) { return (r.dblVolte || 0) >= 10; } },
    { id: "q5_pas", desc: "Fais 50 Voltes sans être touché dans une partie.", check: function (r) { return (r.vcMax || 0) >= 50; } },
    { id: "q5_eruption", desc: "Déclenche 10 Magma dans une partie.", check: function (r) { return ((r.reactK || {})["feu+terre"] || 0) >= 10; } },
    { id: "q5_mirage", desc: "Déclenche 15 Tempêtes de sable dans une partie.", check: function (r) { return ((r.reactK || {})["air+terre"] || 0) >= 15; } },
    { id: "q5_statue", desc: "Gèle un boss.", check: function (r) { return !!r.bossFrozen; } },
    { id: "q5_sifflet", desc: "Tue 20 Soutiens dans une partie.", check: function (r) { return ((r.roleK || {}).soutien || 0) >= 20; } },
    { id: "q5_pince", desc: "Tue 30 Boucliers dans une partie.", check: function (r) { return ((r.roleK || {}).bouclier || 0) >= 30; } },
    { id: "q5_reliquaire", desc: "Active 6 types de sanctuaires dans une partie.", check: function (r) { return Object.keys(r.shrineTypes || {}).length >= 6; } },
    { id: "q5_lettre", desc: "Réussis 5 Totems de défi au total.", check: function (r) { return ((r.tot && r.tot.trials) || 0) >= 5; } },
    { id: "q5_corde", desc: "Réussis une extraction en Cauchemar 1 ou plus.", check: function (r) { return !!r.extracted && (r.cauch || 0) >= 1; } },
    { id: "q5_sacoche", desc: "Réussis une extraction avec le sac plein.", check: function (r) { return !!r.extracted && !!r.bagFull; } },
    { id: "q5_profondeur", desc: "Atteins l'étage 6 en Expédition.", check: function (r) { return !!r.ex && r.ex.floor >= 6; } },
    { id: "q5_seve", desc: "Reste jusqu'à la minute 18 d'un étage d'Expédition.", check: function (r) { return !!r.min18; } },
    { id: "q5_tambour", desc: "Bats 10 méga boss en coop.", check: function (r) { return ((r.tot && r.tot.coopMega) || 0) >= 10; } },
    { id: "q5_ame", desc: "Relève 20 alliés au total.", check: function (r) { return ((r.tot && r.tot.revives) || 0) >= 20; } }
  );
  /* =====================================================================
     Contenu étendu, lot 4 : attirail (pièces de base, anneaux, pièces uniques, panoplies réécrites)
     ===================================================================== */
  var G4 = function (slot, name, elem, icon, fx, lo, hi, desc, o) { var g = { slot: slot, name: name, elem: elem || undefined, icon: icon, fx: fx, lo: lo === null ? undefined : lo, hi: hi === null ? undefined : hi, desc: desc }; Object.keys(o || {}).forEach(function (k) { g[k] = o[k]; }); return g; };
  var GEAR4 = {
    c_givre: G4("coiffe", "Toque de givre", "eau", "❄️", "givreA", 30, 50, "Ancré : un anneau de givre ralentit les ennemis proches de {v} %."),
    c_braiseb: G4("coiffe", "Bonnet de braise", "feu", "🔥", "flammeA", 15, 30, "Ancré : toutes les 3 s, une flamme part vers l'ennemi le plus proche ({v} dégâts)."),
    c_plumes: G4("coiffe", "Casque à plumes", "air", "🪶", "deviA", 10, 25, "Ancré : {v} % des tirs ennemis sont déviés autour de toi."),
    c_vigie: G4("coiffe", "Bonnet de vigie", "air", "🔭", "vigie", 10, 20, "Ancré : tu vois plus loin en Expédition, et la portée des techniques de Tir gagne +{v} %."),
    b_galoches: G4("bottes", "Galoches", "eau", "🥿", "galoche", 2, 4, "En mouvement : tu laisses des flaques qui marquent Eau ({v} s)."),
    b_cendre: G4("bottes", "Mocassins de cendre", "feu", "🩰", "frole", 10, 20, "En mouvement : {v} % de chance d'enflammer les ennemis que tu frôles."),
    b_moussep: G4("bottes", "Chaussons de mousse", "terre", "🧦", "pasSoin", 0.3, 0.6, "En mouvement : rend {v} PV tous les 50 px."),
    b_nuage: G4("bottes", "Bottes de nuage", "air", "☁️", "traverse", 8, 15, "En mouvement : {v} % des tirs ennemis te traversent."),
    k_flammes: G4("cape", "Cape de flammes", "feu", "🔥", "anneauFeu", 10, 20, "Volte : un anneau de feu reste 2 s ({v} dégâts/s)."),
    k_etincelles: G4("cape", "Cape d'étincelles", "feu", "✨", "etincelles", null, null, "Volte : tes 3 prochains coups enflamment à coup sûr."),
    k_maree: G4("cape", "Cape de marée", "eau", "🌊", "vagueV", 15, 25, "Volte : une vague part dans la direction prise et repousse ({v} dégâts)."),
    k_pierre: G4("cape", "Cape de pierre", "terre", "🪨", "capePierre", 3, 6, "Volte : +{v} d'armure pendant 2 s."),
    a_ambre: G4("amulette", "Collier d'ambre", "terre", "🟠", "ambre", null, null, "+2 points de Terre et +1 point de Feu."),
    a_larme: G4("amulette", "Larme de pluie", "eau", "💧", "larme", null, null, "Tes marques Eau durent 2 fois plus longtemps."),
    a_orage: G4("amulette", "Pendentif d'orage", "air", "⚡", "pendOrage", 30, 50, "Les réactions qui contiennent de l'Air font +{v} %."),
    a_foyer: G4("amulette", "Pierre de foyer", "feu", "🏮", "foyer", null, null, "L'attaque de base de ton arme devient Feu, quel que soit son élément."),
    // anneaux (l'Anneau de l'orage arrive avec les événements)
    r_horde: G4("anneau", "Anneau de la horde", null, "🐜", null, null, null, "Pacte : escouades 50 % plus grosses, XP x1,5.", { ring: "horde" }),
    r_verre: G4("anneau", "Anneau de verre", null, "🔮", null, null, null, "Pacte : -30 % de PV max, +40 % de glands d'or et de chance de butin.", { ring: "verre" }),
    r_tenebres: G4("anneau", "Anneau des ténèbres", null, "🌑", null, null, null, "Pacte : vision réduite toute la partie, objets rares 2 fois plus fréquents.", { ring: "tenebres", quest: "q6_tenebres" }),
    r_forgeron: G4("anneau", "Anneau du forgeron", null, "🔨", null, null, null, "Déblocage : les fusions entre techniques peuvent être proposées dès le niveau 4.", { ring: "forgeron" }),
    r_alchimiste: G4("anneau", "Anneau de l'alchimiste", null, "⚗️", null, null, null, "Déblocage : l'évolution élémentaire est proposée sans les 6 points d'élément.", { ring: "alchimiste", quest: "q6_alchimiste" }),
    r_menagerie: G4("anneau", "Anneau de la ménagerie", null, "🐾", null, null, null, "Déblocage : les techniques de Compagnon apparaissent 2 fois plus souvent.", { ring: "menagerie" }),
    r_collection: G4("anneau", "Anneau du collectionneur", null, "🗃️", null, null, null, "Déblocage : chaque choix de niveau propose aussi un objet à effets commun.", { ring: "collection", quest: "q6_collection" }),
    r_pelerin: G4("anneau", "Anneau du pèlerin", null, "🥾", null, null, null, "Sanctuaires : un sanctuaire de plus par zone ou par salle.", { ring: "pelerin" }),
    r_defi: G4("anneau", "Anneau de défi", null, "⚔️", null, null, null, "Sanctuaires : chaque Totem de défi invoque aussi un boss, qui lâche un coffre violet.", { ring: "defi" }),
    r_relance: G4("anneau", "Anneau de relance", null, "🔁", null, null, null, "Économie : 2 relances de cartes gratuites par partie.", { ring: "relance" }),
    r_avare: G4("anneau", "Anneau de l'avare", null, "💰", null, null, null, "Économie : à chaque boss tué, tes glands non dépensés rapportent 10 %.", { ring: "avare" }),
    r_troc: G4("anneau", "Anneau du troc", null, "🤝", null, null, null, "Économie : l'Autel du sacrifice accepte des glands à la place d'un objet.", { ring: "troc" }),
    // pièces uniques : 2 effets, au cœur d'une expédition ou sur un méga boss ; une seule portée à la fois
    u_veilleur: G4("coiffe", "Heaume du veilleur", "air", "🪖", "u_veilleur", null, null, "Ancré : tes techniques de Tir visent l'ennemi le plus fort et lui font +20 %.", { unique: true }),
    u_diademe: G4("coiffe", "Diadème de racines", "terre", "👑", "u_diademe", null, null, "Ancré : toutes les 6 s, les ennemis au contact sont enracinés 1,5 s ; après chaque enracinement, +10 % de vitesse 2 s.", { unique: true }),
    u_capuche: G4("coiffe", "Capuche du sorcier", "eau", "🧙", "u_capuche", null, null, "Ancré : toutes les 4 s, une réaction au hasard éclate autour de toi ; à la Volte, la dernière réaction se répète.", { unique: true }),
    u_renard: G4("bottes", "Bottes du renard", "air", "🦊", "u_renard", null, null, "Mouvement : tu traverses les ennemis sans les toucher, et chaque ennemi traversé est marqué Air.", { unique: true }),
    u_ours: G4("bottes", "Sabots de l'Ours", "feu", "🐻", "u_ours", null, null, "Mouvement : tes empreintes brûlent ; un ennemi qui marche dessus est marqué Feu et ralenti de 30 %.", { unique: true }),
    u_patins: G4("bottes", "Patins de givre", "eau", "⛸️", "u_patins", null, null, "Mouvement : tu vas 30 % plus vite, et ton sillage gèle.", { unique: true }),
    u_derniere: G4("cape", "Cape de la dernière chance", "feu", "🧥", "u_derniere", null, null, "Volte : une gerbe de feu (30) ; sous 25 % de PV, la Volte se recharge aussitôt.", { unique: true }),
    u_eclipse: G4("cape", "Manteau d'éclipse", "air", "🌘", "u_eclipse", null, null, "Volte : le temps ralentit de moitié autour de toi pendant 1 s, puis +20 % de vitesse 1 s.", { unique: true }),
    u_racines: G4("cape", "Cape des racines", "terre", "🌿", "u_racines", null, null, "Volte : tu échanges ta place avec un compagnon, une sentinelle ou un arbre.", { unique: true }),
    u_vents: G4("amulette", "Cœur des quatre vents", null, "🧭", "u_vents", null, null, "Compte comme 3 points de chaque élément.", { unique: true }),
    u_cycle: G4("amulette", "Œil du cycle", null, "👁️", "u_cycle", null, null, "L'élément de ton arme avance d'un cran dans le cycle à chaque boss vaincu ; tes réactions font +20 %.", { unique: true }),
    u_sceau: G4("anneau", "Sceau royal", null, "💍", "u_sceau", null, null, "L'effet de ton autre anneau est doublé.", { unique: true, ring: "sceau" }),
  };
  Object.keys(GEAR4).forEach(function (k) {
    var g = GEAR4[k]; GEAR[k] = g;
    var m = ELEM_MAP[g.elem] || "clairiere", rs = MAP_RES[m], cost = {};
    if (g.unique) { cost.rune_rare = 2; g.cost = cost; return; }
    cost[rs[0]] = 8; cost[rs[1]] = 6; cost[rs[2]] = 3;
    if (g.slot === "cape" || g.slot === "amulette" || g.slot === "anneau") cost[{ clairiere: "t_boar", marais: "t_mushking", automne: "t_stag", nuit: "t_owl" }[m]] = 1;
    g.cost = cost;
  });
  // l'Ancre porte-bonheur et le Gland de la Sylve deviennent des amulettes de base
  ["s_corsaire_amulette", "s_sylve_amulette"].forEach(function (k) { var g = GEAR[k]; delete g.set; var rs = MAP_RES[ELEM_MAP[g.elem]], c = {}; c[rs[0]] = 8; c[rs[1]] = 6; c[rs[2]] = 3; c[{ eau: "t_mushking", terre: "t_boar" }[g.elem]] = 1; g.cost = c; });
  // panoplies : 3 pièces (d'écureuil ou de méga boss), Orage et Braise gardent 4 pièces ; chaque pièce a son effet propre
  // [id, nom, élément, écureuil, méga boss, bonus 2, bonus 3 ou 4, pièces [emplacement, nom, icône, effet, min, max, description]]
  var SETS4 = [
    ["apprentie", "Panoplie de l'Apprentie", "terre", "noisette", null, "1 relance de cartes gratuite par palier de difficulté.", "Chaque choix propose au moins une amélioration d'une technique que tu as.",
      [["coiffe", "Bonnet roux", "🧢", "app_c", 15, 30, "Ancrée : l'XP ramassée compte +{v} %."], ["bottes", "Sandales de noisetier", "🩴", "app_b", 5, 10, "En mouvement : {v} % des noisettes comptent double."], ["cape", "Écharpe d'automne", "🧣", "app_k", null, null, "Volte : attire toutes les noisettes de l'écran."]]],
    ["corsaire", "Panoplie du Corsaire", "eau", "capitaine", null, "+2 matelots max.", "Les matelots tirent des boulets qui explosent.",
      [["coiffe", "Tricorne", "🏴‍☠️", "cor_c", null, null, "Ancré : les matelots se mettent en carré et bloquent les tirs."], ["bottes", "Bottes de pont", "🥾", "cor_b", 6, 12, "En mouvement : la file piétine les ennemis ({v} dégâts)."], ["cape", "Cape de corsaire", "🧥", "cor_k", null, null, "Volte : les matelots tirent une bordée."]]],
    ["sylve", "Panoplie de la Sylve", "terre", "druide", null, "Tes arbres te rendent 1 PV quand ils tuent.", "Ancrée, une pousse apparaît toutes les 4 s.",
      [["coiffe", "Couronne de lierre", "🌿", "syl_c", 30, 50, "Ancrée : tes pousses grandissent {v} % plus vite."], ["bottes", "Sabots d'écorce", "🪵", "syl_b", null, null, "Passer près de tes arbres les fait tirer 2 fois."], ["cape", "Cape de mousse", "🍃", "syl_k", null, null, "Volte : une pousse apparaît là où tu étais."]]],
    ["jumeaux", "Panoplie des Jumeaux", "air", "jumeaux", null, "Pop reprend tes armes à 75 % au lieu de 60 %.", "Quand l'un tombe, l'autre est invulnérable 2 s et le relève 2 fois plus vite.",
      [["coiffe", "Bonnets assortis", "🎩", "jum_c", 20, 35, "Ancrés côte à côte : +{v} % de dégâts."], ["bottes", "Chaussettes dépareillées", "🧦", "jum_b", null, null, "En mouvement : Pop se place toujours derrière Pip."], ["cape", "Cape partagée", "🧣", "jum_k", null, null, "Volte : les jumeaux égalisent leurs PV."]]],
    ["granit", "Panoplie de Granit", "terre", "cendrine", null, "Frapper pendant le délai efface 25 % de plus.", "Quand les dégâts différés retombent à zéro, une onde de choc repousse tout.",
      [["coiffe", "Heaume de granit", "🪖", "gra_c", 15, 30, "Ancrée : champ de force +{v} % de rayon."], ["bottes", "Grèves de granit", "🥾", "gra_b", null, null, "En mouvement : les dégâts différés s'écoulent sur 5 s."], ["cape", "Cape de granit", "🧥", "gra_k", 20, 35, "Volte : efface {v} % des dégâts différés."]]],
    ["volplane", "Panoplie du Vol plané", "air", "planeur", null, "Tu peux aussi t'accrocher aux rochers et aux murs.", "Après 3 s sans t'accrocher, +25 % de dégâts jusqu'à la prochaine accroche.",
      [["coiffe", "Lunettes d'aviateur", "🥽", "vol_c", 20, 40, "Accroché : portée +{v} %."], ["bottes", "Chaussons d'envol", "🩰", "vol_b", 20, 40, "Virages {v} % plus serrés."], ["cape", "Voilure", "🪁", "vol_k", null, null, "La Volte te propulse 2 fois plus loin."]]],
    ["glouton", "Panoplie du Glouton", "feu", "pataud", null, "Grossir ne ralentit plus.", "Ce que tu recraches soigne les alliés touchés et toi (2 PV par noisette).",
      [["coiffe", "Bavoir", "🍽️", "glo_c", null, null, "Ancré : tu digères (-1 % de taille par seconde contre 2 PV/s)."], ["bottes", "Gros chaussons", "🧦", "glo_b", null, null, "En mouvement : ta taille repousse les ennemis touchés."], ["cape", "Nappe", "🧺", "glo_k", null, null, "Volte : ce que tu recraches marque Feu."]]],
    ["sevevive", "Panoplie de la Sève vive", "eau", "mage", null, "La surcharge déclenche les réactions sans délai.", "La fin d'une surcharge déclenche une explosion de sève (100).",
      [["coiffe", "Chapeau de mage", "🎩", "sev_c", 20, 40, "Ancrée : recharge de sève +{v} %."], ["bottes", "Bottes d'alambic", "🥾", "sev_b", null, null, "À sec, tes armes ne ralentissent plus que de 30 %."], ["cape", "Cape de lune", "🌙", "sev_k", null, null, "Chaque Volte prolonge la surcharge de 1 s."]]],
    ["shinobi", "Panoplie du Shinobi", "air", "ninja", null, "Dégâts x3,5 au lieu de x3 sur ceux qui ne t'ont pas vue.", "Tuer un ennemi qui ne t'a pas vue te rend invisible 1 s.",
      [["coiffe", "Masque de nuit", "🥷", "shi_c", 20, 35, "Ancrée : les ennemis te repèrent {v} % moins loin."], ["bottes", "Tabi", "🧦", "shi_b", null, null, "Un ennemi qui t'a repérée te perd après 3 s loin de toi."], ["cape", "Cape de nuit", "🌌", "shi_k", null, null, "Volte : tu disparais de la vue des ennemis proches."]]],
    ["vatout", "Panoplie du Va-tout", "feu", "trefle", null, "Une mise ratée donne quand même une carte, une fois sur 4.", "Une mise gagnée donne 3 cartes au lieu de 2.",
      [["coiffe", "Chapeau de joueur", "🎩", "vat_c", 5, 10, "Ancrée : +{v} % de critiques par mise en cours."], ["bottes", "Bottes porte-veine", "👢", "vat_b", 3, 6, "En mouvement : +{v} % de vitesse par mise en cours."], ["cape", "Cape de tapis vert", "🟩", "vat_k", null, null, "Une Volte pendant une mise rapporte 10 glands, une fois par niveau."]]],
    ["colosse", "Panoplie du Colosse", "terre", null, "colosse", "+2 points de Terre.", "Ancré 3 s : tu deviens un colosse (+4 armure) jusqu'au prochain mouvement.",
      [["coiffe", "Heaume d'humus", "🪖", "clo_c", null, null, "Ancré : les ennemis au contact sont ralentis de 40 %."], ["bottes", "Pieds d'argile", "🦶", "clo_b", null, null, "En mouvement : tes pas font trébucher les Nuées proches 0,5 s."], ["cape", "Manteau de terreau", "🧥", "clo_k", null, null, "Volte : un mur de terre surgit derrière toi 3 s."]]],
    ["mere", "Panoplie de la Mère des Marais", "eau", null, "mere", "+2 points d'Eau.", "Tes réactions Boue et Gel se propagent à un ennemi proche.",
      [["coiffe", "Diadème de nénuphar", "🪷", "mer_c", null, null, "Ancré : une flaque grandit sous toi et marque Eau."], ["bottes", "Bottes de tourbe", "🥾", "mer_b", null, null, "Traverser l'eau ou la boue donne +20 % de dégâts 3 s."], ["cape", "Cape de vase", "🧥", "mer_k", null, null, "Volte : tu plonges et réapparais 1 s plus tard en éclaboussant (20)."]]],
    ["brasier", "Panoplie du Brasier", "feu", null, "brasier", "+2 points de Feu.", "Vapeur et Magma font +50 %.",
      [["coiffe", "Couronne de braise", "👑", "bra_c", null, null, "Ancré : +5 % de dégâts par seconde (max +25 %)."], ["bottes", "Semelles de lave", "🥾", "bra_b", null, null, "Tu marches sans dégâts sur les flaques de feu."], ["cape", "Cape d'incendie", "🧥", "bra_k", null, null, "Volte : toutes tes brûlures éclatent d'un coup."]]],
    ["tempete", "Panoplie du Roi-Tempête", "air", null, "tempete", "+2 points d'Air.", "Embrasement et Tempête de sable font +50 %.",
      [["coiffe", "Couronne de nuages", "⛅", "tem_c", null, null, "Ancré : un nuage détruit un tir ennemi toutes les 2 s."], ["bottes", "Bottes-girouettes", "👢", "tem_b", null, null, "Chaque changement de direction lance un petit éclair."], ["cape", "Cape de rafale", "🧥", "tem_k", null, null, "La Volte t'emporte 2 fois plus loin."]]],
    ["orage", "Panoplie de l'Orage", "air", null, null, "Chaque éclair que tu lances marque Air.", "Chaque Volte lance un éclair sur 5 ennemis.",
      [["coiffe", "Heaume d'orage", "⛈️", "ora_c", null, null, "Ancré : un paratonnerre attire les tirs ennemis proches et les renvoie en éclair."], ["bottes", "Bottes de foudre", "⚡", "ora_b", null, null, "Tous les 100 px, tu charges un éclair, lâché à l'arrêt."], ["cape", "Cape-tonnerre", "🌩️", "ora_k", null, null, "Volte : laisse une ligne électrique 2 s."], ["amulette", "Œil de la tempête", "🌀", "ora_a", null, null, "Tes éclairs rebondissent sur 1 ennemi de plus."]]],
    ["braise", "Panoplie de Braise", "feu", null, null, "10 % de chance par coup d'enflammer.", "Tes brûlures font 2 fois plus aux élites et aux boss.",
      [["coiffe", "Masque de braise", "🎭", "brs_c", null, null, "Ancré : chaque ennemi brûlé proche te rend 0,5 PV/s."], ["bottes", "Bottes de lave", "🔥", "brs_b", null, null, "Les ennemis brûlés que tu frôles explosent (15)."], ["cape", "Cape de cendres", "🧣", "brs_k", null, null, "Volte : les cendres aveuglent les ennemis proches 1 s."], ["amulette", "Cœur de braise", "❤️‍🔥", "brs_a", null, null, "Tes techniques de Mêlée deviennent Feu."]]],
  ];
  Object.keys(SETS).forEach(function (k) { delete SETS[k]; });
  var MEGA_T = { colosse: "t_colosse", mere: "t_mere", brasier: "t_brasier", tempete: "t_tempete" }, REG_T = { clairiere: "t_boar", marais: "t_mushking", automne: "t_stag", nuit: "t_owl" };
  SETS4.forEach(function (st) {
    SETS[st[0]] = { name: st[1], elem: st[2], who: st[3] || undefined, mega: st[4] || undefined, b2: st[5], b4: st[6], full: st[7].length };
    st[7].forEach(function (pc) {
      var id = "s_" + st[0] + "_" + pc[0], m = ELEM_MAP[st[2]], rs = MAP_RES[m], cost = {};
      cost[rs[0]] = 10; cost[rs[1]] = 8; cost[rs[2]] = 6;
      if (st[4]) cost[MEGA_T[st[4]]] = 2; else cost[REG_T[m]] = 2;
      GEAR[id] = { slot: pc[0], name: pc[1], elem: st[2], icon: pc[2], set: st[0], who: st[3] || undefined, fx: pc[3], lo: pc[4] === null ? undefined : pc[4], hi: pc[5] === null ? undefined : pc[5], desc: pc[6], cost: cost, fam: pc[3] === "brs_a" ? "melee" : undefined };
    });
  });
  QUESTS.push(
    { id: "q6_tenebres", desc: "Traverse 3 nuits d'Expédition au total.", check: function (r) { return ((r.tot && r.tot.nights) || 0) >= 3; } },
    { id: "q6_alchimiste", desc: "Obtiens 5 évolutions élémentaires au total.", check: function (r) { return ((r.tot && r.tot.evoC) || 0) >= 5; } },
    { id: "q6_collection", desc: "Découvre 50 objets différents au codex.", check: function (r) { return ((r.tot && r.tot.seen) || 0) >= 50; } }
  );
  /* =====================================================================
     Contenu étendu, lot 5 : 18 espèces, variantes élémentaires, élites, escouades, 9 boss
     ===================================================================== */
  [["ant", { pal: { a: "#8a3a2a", A: "#b85a3a", k: "#1b1226" }, frames: [["k......k", ".k....k.", "aa.aAa.a", "aAaaAaaa", ".k.k.k.."], ["k......k", ".k....k.", "aa.aAa.a", "aAaaAaaa", "..k.k.k."]] }],
   ["mosquito", { flying: true, pal: { k: "#3a3a4a", w: "#e6f6fa", r: "#c8553d" }, frames: [["w.....w", ".w...w.", "..kkk..", "kkkrkkk", "..k.k.."], [".......", "wwwwwww", "..kkk..", "kkkrkkk", ".k...k."]] }],
   ["stagbeetle", { pal: { b: "#5a3018", B: "#8a5a3b", k: "#1b1226" }, frames: [["k.....k..", "kk...kk..", ".kbbbk...", "bbBbbBbb.", "bBbbbbBb.", ".bbbbbb..", "..b..b..."], ["k.....k..", "kk...kk..", ".kbbbk...", "bbBbbBbb.", "bBbbbbBb.", ".bbbbbb..", ".b....b.."]] }],
   ["boarlet", { pal: { b: "#a0703a", s: "#e8c890", k: "#1b1226", n: "#d89a80" }, frames: [[".bb.....", "bbbbbbb.", "bsbsbsbn", "bbbbbbbk", ".b.b.b.."], [".bb.....", "bbbbbbb.", "bsbsbsbn", "bbbbbbbk", "b.b.b.b."]] }],
   ["woodpecker", { flying: true, pal: { k: "#1b1226", w: "#fdf3de", r: "#c8553d", y: "#c8a060" }, frames: [["..rr....", ".kkkk...", "kwkkkyy.", "kkwwkk..", ".kkkk...", "..k.k..."], ["..rr....", ".kkkk...", "kwkkkyy.", "kkwwkk..", "kkkkkk..", "..k.k..."]] }],
   ["bombardier", { pal: { b: "#3a5aa8", r: "#e8603a", k: "#1b1226" }, frames: [["..kk....", ".rrrr...", "bbbbbbk.", "bbrrbbbk", ".b.b.b.."], ["..kk....", ".rrrr...", "bbbbbbk.", "bbrrbbbk", "b.b.b.b."]] }],
   ["cockchafer", { flying: true, pal: { b: "#8a5a3b", B: "#c08a52", w: "#d8e8ff", k: "#1b1226" }, frames: [["w......w", ".w....w.", "..kkkk..", ".bBbbBb.", "bbBbbBbb", ".bbbbbb."], ["........", "wwwwwwww", "..kkkk..", ".bBbbBb.", "bbBbbBbb", ".bbbbbb."]] }],
   ["beaver", { pal: { b: "#8a5a3b", B: "#a87040", w: "#fdf3de", t: "#5a3018", k: "#1b1226" }, frames: [[".bbbb.....", "bkbbbb....", "bbbbbbbttt", "wbbbbbbttt", ".bBBbbb...", ".b...b...."], [".bbbb.....", "bkbbbb....", "bbbbbbbttt", "wbbbbbbttt", ".bBBbbb...", "..b...b..."]] }],
   ["jackdaw", { flying: true, pal: { k: "#2a2a3a", g: "#6a6a7a", e: "#d8e0ff", o: "#3a3a4a" }, frames: [[".....kk..", "....kekko", "kk.kkggk.", "kkkkggkk.", ".kkkkkk..", "...k.k..."], ["kk...kk..", ".kk.kekko", "..kkkggk.", "...kggkk.", "..kkkkk..", "...k.k..."]] }],
   ["barnowl", { flying: true, pal: { w: "#fdf3de", b: "#c8a060", k: "#1b1226" }, frames: [["..bbbb..", ".bwwwwb.", "bwkwwkwb", "bwwbbwwb", ".bwwwwb.", "..b..b.."], ["b.bbbb.b", "bbwwwwbb", ".wkwwkw.", ".wwbbww.", ".bwwwwb.", "..b..b.."]] }],
   ["woodlouse", { pal: { g: "#6a6a7a", G: "#9a9aa8", k: "#1b1226" }, frames: [[".gggggg.", "gGgGgGgg", "gggggggk", ".k.k.k.."], [".gggggg.", "gGgGgGgg", "gggggggk", "k.k.k.k."]] }],
   ["woodball", { pal: { g: "#6a6a7a", G: "#9a9aa8" }, frames: [[".gg.", "gGgg", "ggGg", ".gg."]] }],
   ["crayfish", { pal: { r: "#c8553d", R: "#e8806a", k: "#1b1226" }, frames: [["rr....rr", "r.r..r.r", ".rrRRrr.", "..rRRr..", "..rrrr..", ".r.rr.r."], ["rr....rr", ".rr..rr.", ".rrRRrr.", "..rRRr..", "..rrrr..", "r..rr..r"]] }],
   ["ladybug", { flying: true, pal: { r: "#e83a2a", k: "#1b1226", w: "#fdf3de" }, frames: [["..kk..", ".rkkr.", "rkrrkr", "rrkkrr", ".rrrr."], ["w.kk.w", ".rkkr.", "rkrrkr", "rrkkrr", ".rrrr."]] }],
   ["cricket", { pal: { g: "#6a9a3a", G: "#9cc56b", k: "#1b1226" }, frames: [["k.......", ".k..gg..", "..gGggg.", ".ggggggk", "g.g..g.g"], ["k.......", ".k..gg..", "..gGggg.", ".ggggggk", ".g.gg.g."]] }],
   ["antlion", { pal: { b: "#6a4a2a", k: "#1b1226" }, frames: [["k......k", ".k.bb.k.", "..bbbb..", ".bbbbbb.", "..bbbb.."]] }],
   ["caterpillar", { pal: { g: "#9cc56b", G: "#5a8a3a", k: "#1b1226", y: "#f6d36b" }, frames: [[".y.y.y..", "gGgGgGgk", "gGgGgGgg", ".k.k.k.."], [".y.y.y..", "gGgGgGgk", "gGgGgGgg", "k.k.k.k."]] }],
   ["dungbeetle", { pal: { b: "#3a2a1a", B: "#5a4a2a", d: "#8a6a3a", D: "#a8885a" }, frames: [["..dDd....", ".dDddD.bb", "dDddDdbBb", ".ddddDbbb", "..ddd.b.b"], ["..ddD....", ".dDdDd.bb", "dddDddbBb", ".dDdddbbb", "..ddd..b."]] }],
   ["horsefly", { flying: true, pal: { k: "#3a3020", y: "#c8a040", w: "#e6f6fa", r: "#c8553d" }, frames: [["ww...ww", ".w...w.", ".kykyk.", "rkykyky", ".kykyk."], ["wwwwwww", ".......", ".kykyk.", "rkykyky", ".kykyk."]] }],
   ["heron", { pal: { g: "#8a929a", G: "#c0c8d0", k: "#1b1226", y: "#f2a030" }, frames: [["....GG...", "...GkGyyy", "...GG....", "...G.....", "..GGG....", ".GgggG...", "GggggGG..", ".GgggG...", "..y..y...", "..y..y..."], ["....GG...", "...GkGyyy", "...GG....", "...G.....", "..GGG....", ".GgggG...", "GggggGG..", ".GgggG...", "..y..y...", ".y....y.."]] }],
   ["catfish", { pal: { b: "#4a5a5a", B: "#6a8a8a", w: "#c8d8d8", k: "#1b1226" }, frames: [["..bbbbbbb...", ".bBBBBBBbb..", "bkbbbbbbbbbb", "wbbbbbbbbbb.", "w.bBBBBb....", "....b..b...."], ["..bbbbbbb...", ".bBBBBBBbb.b", "bkbbbbbbbbb.", "wbbbbbbbbbbb", "w.bBBBBb....", "...b..b....."]] }],
   ["bear", { pal: { b: "#5a3a2a", B: "#8a5a3a", f: "#ff7a2a", k: "#1b1226", n: "#2b1709" }, frames: [[".b..b.....", ".bbbb.f...", "bkbbkbbbf.", "bbnnbbbbbb", ".bbbbbbBbb", ".bBbbbbBb.", ".bb..bb..."], [".b..b.....", ".bbbb..f..", "bkbbkbbbf.", "bbnnbbbbbb", ".bbbbbbBbb", ".bBbbbbBb.", "bb....bb.."]] }],
   ["centipede", { pal: { r: "#a03a2a", R: "#d8603a", k: "#1b1226", y: "#f2c230" }, frames: [["y.y.........", ".rRrRrRrRrR.", "krrrrrrrrrrr", ".k.k.k.k.k.k"], ["y.y.........", ".rRrRrRrRrR.", "krrrrrrrrrrr", "k.k.k.k.k.k."]] }]
  ].forEach(function (s) { SPRITES[s[0]] = s[1]; });
  // [id, sprite, rôle, PV, vitesse, dégâts, xp, couleur, comportement, nom]
  [["ant", "ant", "nuee", 6, 40, 4, 1, "#b85a3a", "column", "Fourmi"],
   ["mosquito", "mosquito", "nuee", 5, 60, 3, 1, "#c8553d", "sting", "Moustique"],
   ["stagbeetle", "stagbeetle", "chargeur", 60, 22, 12, 4, "#8a5a3b", "arcCharger", "Lucane"],
   ["boarlet", "boarlet", "chargeur", 30, 34, 8, 2, "#a0703a", "packCharger", "Marcassin"],
   ["woodpecker", "woodpecker", "tireur", 20, 30, 7, 2, "#c8553d", "pecker", "Pic épeiche"],
   ["bombardier", "bombardier", "tireur", 40, 20, 10, 3, "#3a5aa8", "flamer", "Bombardier"],
   ["cockchafer", "cockchafer", "artilleur", 26, 36, 8, 3, "#c08a52", "egger", "Hanneton"],
   ["beaver", "beaver", "artilleur", 90, 16, 12, 6, "#8a5a3b", "logger", "Castor"],
   ["jackdaw", "jackdaw", "guetteur", 24, 44, 6, 2, "#6a6a7a", "thief", "Choucas"],
   ["barnowl", "barnowl", "guetteur", 36, 40, 11, 3, "#c8a060", "ghostowl", "Effraie"],
   ["woodlouse", "woodlouse", "bouclier", 50, 18, 8, 3, "#9a9aa8", "ball", "Cloporte"],
   ["crayfish", "crayfish", "bouclier", 70, 20, 12, 4, "#c8553d", "crayfish", "Écrevisse"],
   ["ladybug", "ladybug", "soutien", 14, 36, 4, 2, "#e83a2a", "shielder", "Coccinelle"],
   ["cricket", "cricket", "soutien", 10, 40, 3, 2, "#6a9a3a", "singer", "Grillon"],
   ["antlion", "antlion", "piegeur", 60, 0, 10, 4, "#6a4a2a", "antlion", "Fourmi-lion"],
   ["caterpillar", "caterpillar", "piegeur", 30, 16, 6, 3, "#9cc56b", "procession", "Chenille processionnaire"],
   ["dungbeetle", "dungbeetle", "kamikaze", 40, 24, 20, 3, "#8a6a3a", "dungball", "Bousier"],
   ["horsefly", "horsefly", "kamikaze", 12, 70, 14, 2, "#c8a040", "horsefly", "Taon"]
  ].forEach(function (a) {
    ENEMIES[a[0]] = { sprite: a[1], role: a[2], hp: a[3], spd: a[4], dmg: a[5], r: 5, xp: a[6], color: a[7], ai: a[8], name: a[9], shot: a[5], blast: a[2] === "kamikaze" ? a[5] : undefined, blastR: a[2] === "kamikaze" ? 22 : undefined };
  });
  ENEMIES.beaver.r = 7; ENEMIES.crayfish.r = 6; ENEMIES.antlion.r = 6; ENEMIES.stagbeetle.r = 6;
  ENEMIES.logprop = { sprite: "log", hp: 30, spd: 0, dmg: 0, r: 6, xp: 0, color: "#8a5a3b", prop: true };
  // nouvelles espèces dans les biomes des 4 cartes actuelles (les autres arrivent avec leurs cartes)
  var BIO5 = { clairiere: [["ant", 20, 3], ["ladybug", 120, 1], ["boarlet", 150, 2], ["jackdaw", 200, 1]], marais: [["mosquito", 0, 3], ["cricket", 100, 1], ["crayfish", 140, 2], ["antlion", 200, 1]],
               automne: [["stagbeetle", 120, 2], ["boarlet", 60, 2], ["bombardier", 100, 2], ["caterpillar", 160, 1], ["jackdaw", 140, 1], ["ladybug", 180, 1], ["ant", 30, 2]],
               nuit: [["barnowl", 120, 2], ["horsefly", 90, 2], ["woodlouse", 100, 2], ["cockchafer", 140, 2], ["mosquito", 20, 2]] };
  MAPS.forEach(function (m) { (BIO5[m.id] || []).forEach(function (q, i) { var b = m.biomes[i % m.biomes.length]; b.enemies.push(q.slice()); }); });
  // élites : 3 pouvoirs de plus
  AFFIXES.push(
    { id: "lourd", name: "Lourd", color: "#8a8278", desc: "insensible au recul et à l'attirance" },
    { id: "vigilant", name: "Vigilant", color: "#6ad8ff", desc: "repère Ombre et les joueurs invisibles, ignore les leurres" },
    { id: "instable", name: "Instable", color: "#ff5ad0", desc: "change d'élément toutes les 4 s" }
  );
  // escouades par carte (espèces précises) ; les escouades par rôle restent
  var SQUADS_MAP = {
    clairiere: [["Fourmis des prés", { ant: 12, ladybug: 2 }], ["Laie et petits", { boarlet: 3, bunny: 6 }], ["Garde du champ", { hedgehog: 2, wasp: 3, slug: 8 }], ["Piège du sous-bois", { spider: 2, jackdaw: 1, rat: 6 }]],
    marais: [["Chorale", { cricket: 2, frog: 4, mosquito: 6 }], ["Bord de l'eau", { crayfish: 2, toad: 2, mosquito: 8 }], ["Embuscade", { snake: 2, weaver: 1, rat: 6 }], ["Fondrière", { antlion: 1, puffball: 3, slug: 6 }]],
    automne: [["Harde", { stagbeetle: 1, boarlet: 3, ladybug: 2 }], ["Brûlis", { salamander: 2, bombardier: 2, ant: 8 }], ["Chasseurs des terriers", { mole: 2, fox: 2, jackdaw: 1 }], ["Procession", { caterpillar: 2, beetle: 4, cricket: 1 }]],
    nuit: [["Chasse nocturne", { barnowl: 2, bat: 8 }], ["Lueurs trompeuses", { firefly: 2, bombshroom: 2, horsefly: 3 }], ["Vermoulu", { woodlouse: 2, cockchafer: 2, mosquito: 6 }], ["Clair de lune", { barnowl: 1, fox: 2, moth: 1, bat: 6 }]],
    gouffre: [["Colonie", { ant: 16, antlion: 1 }], ["Terrier profond", { mole: 3, woodlouse: 2, ladybug: 1 }], ["Effondrement", { dungbeetle: 3, beaver: 2 }], ["Racines vivantes", { spider: 2, stagbeetle: 2, rat: 6 }]],
    riviere: [["Digue", { beaver: 3, crayfish: 2 }], ["Berges", { jackdaw: 2, frog: 2, bunny: 6 }], ["Sous la glace", { snake: 2, woodpecker: 2, cricket: 1 }], ["Chute d'eau", { turtle: 1, toad: 3, mosquito: 6 }]],
    calcinee: [["Fourneau", { salamander: 3, bombardier: 2, ladybug: 1 }], ["Retombées", { horsefly: 4, bombshroom: 3, ant: 8 }], ["Survivants", { badger: 2, boarlet: 3 }], ["Feux couvants", { cockchafer: 2, hedgehog: 2, rat: 6 }]],
    cime: [["Envol noir", { woodpecker: 3, jackdaw: 2, bat: 8 }], ["Cimes bruyantes", { wasp: 2, cricket: 2, mosquito: 6 }], ["Funambules", { stagbeetle: 2, spider: 2, barnowl: 1 }], ["Sommet", { crow: 1, horsefly: 2, ladybug: 2, mosquito: 6 }]],
  };
  // 9 boss : chacun a une attaque à fuir, une à esquiver en Volte et une fenêtre où rester ancré paie
  [["castor", "beaver", 1600, 18, 24, "eau", "Grand Castor", "#8a5a3b", 2.4],
   ["heron", "heron", 1100, 30, 20, "eau", "Héron cendré", "#8a929a", 1.6],
   ["silure", "catfish", 1400, 22, 22, "eau", "Silure", "#4a5a5a", 1.8],
   ["ours", "bear", 2000, 24, 28, "feu", "Ours brûlé", "#5a3a2a", 1.9],
   ["sala_g", "salamander", 1200, 26, 22, "feu", "Salamandre géante", "#d8572a", 2.6],
   ["corbeau", "crow", 1500, 32, 20, "air", "Corbeau-roi", "#24243a", 2.2],
   ["pivert", "woodpecker", 1100, 30, 18, "air", "Grand Pivert", "#c8553d", 2.4],
   ["scolo", "centipede", 1300, 26, 22, "terre", "Scolopendre", "#a03a2a", 1.8],
   ["reine_f", "ant", 2400, 18, 24, "terre", "Reine des fourmis", "#8a3a2a", 3.2]
  ].forEach(function (b) { ENEMIES[b[0]] = { sprite: b[1], hp: b[2], spd: b[3], dmg: b[4], r: 11, xp: 55, boss: true, bossAi: "b5_" + b[0], elem: b[5], name: b[6], color: b[7], scale: b[8] }; });
  [["castor", "Planche rongée", "🪵"], ["heron", "Aigrette grise", "🪶"], ["silure", "Écaille de silure", "🐟"], ["ours", "Fourrure roussie", "🐻"], ["sala_g", "Peau de salamandre", "🦎"],
   ["corbeau", "Rémige du Corbeau-roi", "🐦‍⬛"], ["pivert", "Crête rouge", "🟥"], ["scolo", "Chitine", "🐛"], ["reine_f", "Œuf de reine", "🥚"]].forEach(function (t) { RES["t_" + t[0]] = { name: t[1], icon: t[2], trophy: t[0] }; });
  // objets de boss : un par nouveau boss
  [["dent_castor", "castor", "🦷", "Dent du Grand Castor", "Tes coups brisent le décor 3 fois plus vite ; chaque élément brisé lâche une noisette d'XP."],
   ["plume_heron", "heron", "🪶", "Plume du Héron", "Tes projectiles visent là où l'ennemi va être."],
   ["barbillon", "silure", "🐟", "Barbillon du Silure", "+30 % de dégâts contre les ennemis ralentis ou gelés."],
   ["patte_ours", "ours", "🐾", "Patte de l'Ours brûlé", "+40 PV max ; sous 50 % de PV, +25 % de dégâts."],
   ["ecaille_sala", "sala_g", "🦎", "Écaille de la Salamandre", "Immunité aux flammes au sol, et ce qui te touche s'enflamme."],
   ["oeil_corbeau", "corbeau", "👁️", "Œil du Corbeau-roi", "Les sanctuaires sont signalés de 2 fois plus loin."],
   ["bec_pivert", "pivert", "🪓", "Bec du Grand Pivert", "Tes projectiles traversent un ennemi de plus et brisent le décor sans s'arrêter."],
   ["carapace_seg", "scolo", "🛡️", "Carapace segmentée", "+1 armure par boss vaincu dans la partie."],
   ["colonne_fourmis", "reine_f", "🐜", "Colonne de fourmis", "Une colonne de fourmis suit ton chemin et mord (10 dégâts/s)."]
  ].forEach(function (a) { ITEMS.push({ id: a[0], r: 2, pool: "boss", from: a[1], icon: a[2], name: a[3], desc: "BOSS · " + a[4] }); });
  ITEMS.forEach(function (it, i) { it.idx = i; });
  // gardiens des donjons : chaque boss non final garde exactement 2 donjons
  var DG_GUARDS = { terriers: ["bigmole", "boar"], ruche: ["pivert", "owl"], crypte: ["silure", "scolo"], taniere: ["boar", "sala_g"] };
  DUNGEONS.forEach(function (d) { if (DG_GUARDS[d.id]) d.guards = DG_GUARDS[d.id].concat([DG_GUARDS[d.id][0]]); });
  var ARENA_BOSSES = ["boar", "queen", "owl", "stag", "mushking", "bigmole", "castor", "heron", "silure", "ours", "sala_g", "corbeau", "pivert", "scolo", "reine_f"];
  /* =====================================================================
     Contenu étendu, lot 6 : 4 cartes, mécaniques de terrain, 4 donjons, strates, ressources, 4 méga boss
     ===================================================================== */
  SPRITES.crystal = { pal: { c: "#9ee8ff", C: "#e8f8ff", k: "#3a6a8a" }, frames: [[".c.", "cCc", "cCk", "cck", ".k."]] };
  // mécaniques de terrain des 4 cartes actuelles
  MAPS.forEach(function (m) { m.mech = { clairiere: null, marais: "water", automne: "leaves", nuit: "dark" }[m.id]; });
  var GR = function (base, patch, tuft, hi, flowers, pebble, pebbleDk, extra) { var g = { base: base, patch: patch, tuft: tuft, hi: hi, flowers: flowers, pebble: pebble, pebbleDk: pebbleDk, shroom: flowers[0] }; Object.keys(extra || {}).forEach(function (k) { g[k] = extra[k]; }); return g; };
  MAPS.push(
    { id: "gouffre", name: "Gouffre de racines", desc: "Racines suspendues, grotte d'argile et puits de lumière. Toutes les 2 min, les racines ferment des passages et en ouvrent d'autres.", hp: 1.7, gold: 2.3, unlock: "ach_colosse", element: "terre", mech: "roots",
      swarm: ["ant", "rat", "mole", "spider"], bosses: ["scolo", "reine_f", "bigmole"], mega: "racines_m",
      biomes: [
        { name: "Racines suspendues", giant: "roots", giantD: 0.5, prop: "stump", decor: "rock", ground: GR("#5a4230", "#523b2a", "#3a2a1e", "#7a5a40", ["#c8a060", "#8a5a3b", "#9cc56b", "#e8d090"], "#8a7a68", "#5a4a3a", { rock: "#6a5a4a", rockHi: "#8a7a68" }),
          enemies: [["ant", 0, 4], ["spider", 20, 3], ["stagbeetle", 90, 2], ["rat", 30, 3], ["dungbeetle", 120, 2]] },
        { name: "Grotte d'argile", giant: "rock", giantD: 0.45, prop: "stump", decor: "rock", ground: GR("#8a5a3a", "#7d5234", "#5a3a26", "#b07a50", ["#e8a060", "#c8783a", "#fdf3de", "#8a5a3b"], "#a07a5a", "#6f5040", { rock: "#a0603a", rockHi: "#c88a5a" }),
          enemies: [["mole", 0, 4], ["woodlouse", 40, 3], ["beaver", 120, 2], ["ladybug", 80, 1], ["antlion", 150, 1]] },
        { name: "Puits de lumière", giant: "roots", giantD: 0.25, prop: "lantern", ground: GR("#7a8a5a", "#708052", "#56643e", "#a8b87a", ["#f6d36b", "#fdf3de", "#9cc56b", "#e8d090"], "#9a9a7a", "#6a6a52"),
          enemies: [["ant", 0, 3], ["ladybug", 30, 2], ["cricket", 60, 2], ["badger", 180, 2], ["dungbeetle", 90, 2]] },
      ] },
    { id: "riviere", name: "Rivière gelée", desc: "Rives enneigées, lac gelé et cascade figée. La glace fait glisser tout le monde et se brise sous les gros impacts.", hp: 1.7, gold: 2.3, unlock: "ach_mere", element: "eau", mech: "ice",
      swarm: ["mosquito", "bunny", "frog", "jackdaw"], bosses: ["castor", "heron", "silure"], mega: "brochet",
      biomes: [
        { name: "Rives enneigées", giant: "tree", giantD: 0.3, prop: "stump", decor: "bush", ground: GR("#d8e4ea", "#ccd8e0", "#a8b8c4", "#f4fafc", ["#9ee8ff", "#fdf3de", "#c8d8e8", "#e6f6fa"], "#a8b0b8", "#7a848c", { bush: "#7a9aa8", bushHi: "#c8dce4" }),
          enemies: [["bunny", 0, 4], ["jackdaw", 30, 3], ["frog", 50, 3], ["beaver", 100, 2], ["woodpecker", 140, 2]] },
        { name: "Lac gelé", ice: true, prop: "stump", decor: "water", ground: GR("#a8d0e8", "#9cc4dc", "#80aac4", "#dceef8", ["#e8f8ff", "#9ee8ff", "#fdf3de", "#c8e8f8"], "#8ab0c8", "#6890a8", { water: "#6aa8c8", waterHi: "#c8ecfa" }),
          enemies: [["mosquito", 0, 3], ["crayfish", 30, 3], ["turtle", 100, 2], ["snake", 60, 2], ["toad", 150, 2]] },
        { name: "Cascade figée", ice: true, giant: "rock", giantD: 0.35, prop: "stump", decor: "rock", ground: GR("#8ab0c8", "#80a6be", "#6a8ca4", "#c0dcec", ["#e8f8ff", "#9ee8ff", "#c8d8e8", "#fdf3de"], "#8aa0b0", "#5a7080", { rock: "#7a98ac", rockHi: "#b0ccdc" }),
          enemies: [["woodpecker", 0, 3], ["cricket", 40, 2], ["beaver", 80, 2], ["crayfish", 60, 2], ["mosquito", 0, 3]] },
      ] },
    { id: "calcinee", name: "Forêt calcinée", desc: "Futaie brûlée, champ de cendres et cœur du feu. Des incendies se déclarent et se propagent ; ils brûlent aussi les ennemis.", hp: 1.8, gold: 2.4, unlock: "ach_brasier", element: "feu", mech: "wildfire",
      swarm: ["ant", "salamander", "horsefly", "rat"], bosses: ["ours", "sala_g", "stag"], mega: "phenix",
      biomes: [
        { name: "Futaie brûlée", giant: "tree", giantD: 0.4, prop: "stump", decor: "rock", ground: GR("#3a2e28", "#342822", "#241c18", "#5a463a", ["#ff7a2a", "#c8553d", "#6a5a4a", "#f6d36b"], "#5a4e46", "#3a322c", { bush: "#2a201a", bushHi: "#4a3a2e", rock: "#4a3e36", rockHi: "#6a5a4e" }),
          enemies: [["salamander", 0, 3], ["boarlet", 30, 3], ["badger", 120, 2], ["horsefly", 60, 2], ["hedgehog", 90, 2]] },
        { name: "Champ de cendres", giant: "rock", giantD: 0.2, prop: "stump", ground: GR("#7a7068", "#706660", "#5a524c", "#a09890", ["#c8c0b8", "#ff7a2a", "#e8e0d8", "#8a8278"], "#8a8278", "#5a524c", { rock: "#6a625a", rockHi: "#8a827a" }),
          enemies: [["ant", 0, 4], ["bombardier", 40, 3], ["cockchafer", 80, 2], ["bombshroom", 50, 2], ["rat", 0, 3]] },
        { name: "Cœur du feu", giant: "rock", giantD: 0.3, prop: "lantern", decor: "rock", ground: GR("#5a2a1a", "#522618", "#3a1a10", "#8a3a20", ["#ff9a3a", "#ffd84a", "#ff5a2a", "#c8553d"], "#6a3a2a", "#4a2418", { rock: "#4a2418", rockHi: "#7a3a24" }),
          enemies: [["salamander", 0, 4], ["bombardier", 30, 3], ["horsefly", 50, 3], ["firefly", 80, 2], ["badger", 160, 2]] },
      ] },
    { id: "cime", name: "Cime des chênes", desc: "Canopée, pont de branches et nid d'orage. Le vent souffle par rafales et pousse joueurs, ennemis et projectiles.", hp: 1.8, gold: 2.4, unlock: "ach_tempete", element: "air", mech: "wind",
      swarm: ["mosquito", "wasp", "jackdaw", "bat"], bosses: ["corbeau", "pivert", "owl"], mega: "aigle",
      biomes: [
        { name: "Canopée", giant: "tree", giantD: 0.6, prop: "stump", decor: "bush", ground: GR("#4a7a3a", "#447034", "#30562a", "#7aa85a", ["#9cc56b", "#f6d36b", "#fdf3de", "#c8e8a0"], "#7a8a5a", "#56643e", { bush: "#2a4a22", bushHi: "#4a7a3a" }),
          enemies: [["woodpecker", 0, 3], ["wasp", 0, 3], ["spider", 40, 3], ["jackdaw", 60, 2], ["stagbeetle", 110, 2]] },
        { name: "Pont de branches", giant: "tree", giantD: 0.25, prop: "stump", ground: GR("#8a6a44", "#7d603e", "#5a442a", "#b08a5a", ["#9cc56b", "#d39a52", "#fdf3de", "#f6d36b"], "#a08a6a", "#6f5a44"),
          enemies: [["mosquito", 0, 3], ["cricket", 30, 2], ["crow", 60, 2], ["horsefly", 80, 2], ["ladybug", 100, 2]] },
        { name: "Nid d'orage", giant: "rock", giantD: 0.3, prop: "lantern", decor: "rock", ground: GR("#5a6a7a", "#526270", "#3a4856", "#8a9aaa", ["#c8f8e8", "#f6e06b", "#e6f6fa", "#9ad0c4"], "#7a8a9a", "#4a5868", { rock: "#4a5a6a", rockHi: "#7a8a9a" }),
          enemies: [["bat", 0, 4], ["barnowl", 40, 2], ["woodpecker", 60, 3], ["crow", 90, 2], ["moth", 0, 2]] },
      ] }
  );
  // ressources des 4 nouvelles régions
  [["gouffre", [["argile", "Argile", "🧱"], ["racine_creuse", "Racine creuse", "🪵"], ["cristal_terre", "Cristal de terre", "💎"]]],
   ["riviere", [["neige", "Neige tassée", "❄️"], ["galet_poli", "Galet poli", "🪨"], ["mousse_givree", "Mousse givrée", "🧊"]]],
   ["calcinee", [["charbon", "Charbon de bois", "⚫"], ["cendre_fine", "Cendre fine", "🌫️"], ["resine", "Résine ardente", "🟠"]]],
   ["cime", [["brindille", "Brindille d'altitude", "🌿"], ["duvet", "Duvet", "🪶"], ["lichen", "Lichen", "🍃"]]]].forEach(function (mr) {
    MAP_RES[mr[0]] = mr[1].map(function (x) { RES[x[0]] = { name: x[1], icon: x[2], map: mr[0] }; return x[0]; });
  });
  // 4 méga boss de plus : un par nouvelle carte, chacun avec ses 3 phases à lui
  ENEMIES.racines_m = { sprite: "golem", hp: 5600, spd: 15, dmg: 30, r: 13, xp: 200, boss: true, mega: true, name: "Mille-Racines", color: "#6b4430", bossAi: "mega_terre", elem: "terre", scale: 2.8, tint: "#5a8a3a" };
  ENEMIES.brochet = { sprite: "catfish", hp: 5400, spd: 20, dmg: 28, r: 13, xp: 200, boss: true, mega: true, name: "Grand Brochet des glaces", color: "#9ee8ff", bossAi: "mega_terre", elem: "eau", scale: 2.8, tint: "#c8ecfa" };
  ENEMIES.phenix = { sprite: "hawk", hp: 5000, spd: 26, dmg: 28, r: 12, xp: 200, boss: true, mega: true, name: "Phénix des cendres", color: "#ff7a2a", bossAi: "mega_terre", elem: "feu", scale: 3.2, tint: "#ff7a2a" };
  ENEMIES.aigle = { sprite: "hawk", hp: 5200, spd: 28, dmg: 26, r: 12, xp: 200, boss: true, mega: true, name: "Aigle des cimes", color: "#d8e8ff", bossAi: "mega_terre", elem: "air", scale: 3, tint: "#e8e0d0" };
  [["racines_m", "Rhizome ancien", "🌱"], ["brochet", "Mâchoire de glace", "🦈"], ["phenix", "Cendre vive", "🔥"], ["aigle", "Œuf d'aigle", "🥚"]].forEach(function (t) { RES["t_" + t[0]] = { name: t[1], icon: t[2], trophy: t[0] }; });
  // objets des 4 nouveaux méga boss
  ITEMS.push(
    { id: "racine_ancestrale", r: 3, pool: "mega", mega: "racines_m", icon: "🌱", name: "Racine ancestrale", desc: "Trophée de Mille-Racines : ancré, tu regagnes 2 % de PV max par seconde." },
    { id: "oeil_brochet", r: 3, pool: "mega", mega: "brochet", icon: "🐟", name: "Œil du brochet", desc: "Trophée du Grand Brochet : tes gels durent 2 fois plus, et un ennemi gelé prend +40 %." },
    { id: "coeur_phenix", r: 3, pool: "mega", mega: "phenix", icon: "❤️‍🔥", name: "Cœur de phénix", desc: "Trophée du Phénix : chaque renaissance déclenche une explosion géante (300) et 5 s d'invulnérabilité." },
    { id: "serre_aigle", r: 3, pool: "mega", mega: "aigle", icon: "🦅", name: "Serre de l'aigle", desc: "Trophée de l'Aigle : +30 % de vitesse ; chaque Volte fond sur l'ennemi le plus proche (80)." }
  );
  ITEMS.forEach(function (it, i) { it.idx = i; });
  // panoplies des 4 nouveaux méga boss
  [["racines_m", "Panoplie de Mille-Racines", "terre", "+2 points de Terre ; tes Pièges et Sentinelles durent 2 fois plus.", "Un ennemi immobilisé par une racine prend +40 %.",
     [["coiffe", "Couronne de rhizomes", "🌱", "mil_c", "Ancré : toutes les 3 s, une racine immobilise le premier ennemi au contact."], ["bottes", "Bottes-radicelles", "🥾", "mil_b", "En mouvement : tes radicelles marquent Terre ceux qui les franchissent."], ["cape", "Cape de lianes", "🧥", "mil_k", "Volte : 3 racines jaillissent dans la direction prise (40)."]]],
   ["brochet", "Panoplie du Grand Brochet", "eau", "+2 points d'Eau.", "Sur la glace, un ennemi que tu frappes peut glisser et geler 1 s.",
     [["coiffe", "Casque d'écailles", "🐟", "bro_c", "Ancré : toutes les 4 s, un brochet surgit sous l'ennemi le plus proche (40)."], ["bottes", "Bottes cramponnées", "🥾", "bro_b", "Tu ne glisses plus sur la glace."], ["cape", "Cape de givre", "🧥", "bro_k", "Volte : le sol gèle en ligne derrière toi."]]],
   ["phenix", "Panoplie du Phénix", "feu", "+2 points de Feu.", "Chaque élite tuée te rend 5 % de PV.",
     [["coiffe", "Plumet de feu", "🪶", "phe_c", "Ancré : tu brûles (1 PV/s) mais +25 % de dégâts."], ["bottes", "Serres ardentes", "🥾", "phe_b", "En mouvement : tu sèmes des plumes qui explosent après 2 s (15)."], ["cape", "Ailes de cendre", "🧥", "phe_k", "Sous 30 % de PV, la Volte rend 15 % de PV (toutes les 20 s)."]]],
   ["aigle", "Panoplie de l'Aigle", "air", "+2 points d'Air.", "Tes techniques de Retour reviennent en piqué et frappent 2 fois plus fort au retour.",
     [["coiffe", "Casque d'aigle", "🦅", "aig_c", "Ancré : +25 % de dégâts sur les cibles à plus de 150 px."], ["bottes", "Bottes d'altitude", "🥾", "aig_b", "En mouvement : les ennemis que tu dépasses sont projetés."], ["cape", "Grandes rémiges", "🧥", "aig_k", "Volte : tu prends de la hauteur 1 s et les attaques te ratent."]]]
  ].forEach(function (st) {
    SETS[st[0]] = { name: st[1], elem: st[2], mega: st[0], b2: st[3], b4: st[4], full: 3 };
    st[5].forEach(function (pc) {
      var rs = MAP_RES[{ terre: "gouffre", eau: "riviere", feu: "calcinee", air: "cime" }[st[2]]], cost = {}; cost[rs[0]] = 10; cost[rs[1]] = 8; cost[rs[2]] = 6; cost["t_" + st[0]] = 2;
      GEAR["s_" + st[0] + "_" + pc[0]] = { slot: pc[0], name: pc[1], elem: st[2], icon: pc[2], set: st[0], fx: pc[3], desc: pc[4], cost: cost };
    });
  });
  // 4 donjons de plus
  DUNGEONS.push(
    { id: "fourmiliere", name: "Fourmilière géante", icon: "ant", desc: "Couloirs étroits traversés par des colonnes de fourmis. La Reine au fond.", unlock: "ach_golem", mech: "ants",
      hp: 1.4, gold: 1.8, final: "reine_f", finalHp: 1.6, guards: ["scolo", "bigmole", "scolo"], poison: 0, pits: 0.6,
      themes: [{ name: "Galeries", floor: "#5a3a26", grid: "#50331f", wall: "#24160c", top: "#7a5030", dark: 0.55, accent: "#b85a3a" }, { name: "Couvain", floor: "#6a4228", grid: "#5e3a22", wall: "#2a1a0e", top: "#8a5a34", dark: 0.6, accent: "#e8c890" }, { name: "Salle de la Reine", floor: "#4a2a1a", grid: "#422416", wall: "#1e100a", top: "#6a3a24", dark: 0.7, accent: "#c8553d" }],
      pools: [["ant", "ant", "rat", "ladybug", "spider"], ["ant", "antlion", "woodlouse", "dungbeetle", "stagbeetle"], ["ant", "dungbeetle", "stagbeetle", "antlion", "badger", "woodlouse"]] },
    { id: "nid", name: "Nid des corbeaux", icon: "crow", desc: "Salles suspendues reliées par des branches : une chute te renvoie au début de la salle.", unlock: "ach_reine", mech: "nest",
      hp: 1.45, gold: 1.9, final: "corbeau", finalHp: 1.6, guards: ["owl", "heron", "owl"], poison: 0, pits: 2.6,
      themes: [{ name: "Branches", floor: "#5a4a34", grid: "#50422e", wall: "#1e1a12", top: "#7a6448", dark: 0.5, accent: "#9cc56b" }, { name: "Nids", floor: "#4a3e30", grid: "#42372a", wall: "#1a1610", top: "#6a5a44", dark: 0.6, accent: "#c8a060" }, { name: "Perchoir du roi", floor: "#3a3440", grid: "#322c38", wall: "#14121a", top: "#5a4e64", dark: 0.7, accent: "#8a8aa8" }],
      pools: [["jackdaw", "crow", "bat", "moth"], ["jackdaw", "barnowl", "woodpecker", "crow", "bat"], ["barnowl", "woodpecker", "crow", "horsefly", "jackdaw", "bat"]] },
    { id: "barrage", name: "Barrage des castors", icon: "beaver", desc: "L'eau monte à chaque étage ; certaines salles sont inondées. Le Grand Castor tient le barrage.", unlock: "ach_roi", mech: "flood",
      hp: 1.5, gold: 2, final: "castor", finalHp: 1.6, guards: ["heron", "silure", "heron"], poison: 0, pits: 0.4, puddles: 3,
      themes: [{ name: "Digue", floor: "#4a5a5a", grid: "#425050", wall: "#1a2222", top: "#6a7a7a", dark: 0.5, accent: "#8a5a3b" }, { name: "Huttes", floor: "#5a4a3a", grid: "#504234", wall: "#221a14", top: "#7a6450", dark: 0.6, accent: "#6aa8c8" }, { name: "Cœur du barrage", floor: "#3a4a5a", grid: "#324250", wall: "#121a22", top: "#5a6a7a", dark: 0.7, accent: "#9ee8ff" }],
      pools: [["frog", "mosquito", "crayfish", "slug"], ["beaver", "crayfish", "mosquito", "snake", "toad"], ["beaver", "crayfish", "turtle", "toad", "snake", "cricket"]] },
    { id: "charbonniere", name: "Charbonnière", icon: "bear", desc: "Des wagonnets traversent les salles sur des rails, des fours crachent du feu. L'Ours brûlé règne.", unlock: "ach_cerf", mech: "mine",
      hp: 1.55, gold: 2.1, final: "ours", finalHp: 1.6, guards: ["sala_g", "pivert", "sala_g"], poison: 0, pits: 0.8,
      themes: [{ name: "Galeries de charbon", floor: "#2e2a28", grid: "#282422", wall: "#100e0c", top: "#4a4440", dark: 0.6, accent: "#ff7a2a" }, { name: "Fours", floor: "#3a241a", grid: "#321e16", wall: "#140c08", top: "#5a3424", dark: 0.65, accent: "#ffd84a" }, { name: "Fournaise", floor: "#4a1e12", grid: "#401a10", wall: "#1a0a06", top: "#6a2a18", dark: 0.7, accent: "#ff5a2a" }],
      pools: [["salamander", "rat", "ant", "bombshroom"], ["salamander", "bombardier", "horsefly", "boarlet", "badger"], ["bombardier", "salamander", "horsefly", "cockchafer", "badger", "hedgehog"]] }
  );
  // succès qui ouvrent les nouvelles cartes et les nouveaux donjons
  ACHIEVEMENTS.push(
    { id: "ach_colosse", name: "Colosse terrassé", desc: "Bats le Colosse d'humus (ouvre le Gouffre de racines).", gold: 200, check: function (r) { return !!(r.bossT && r.bossT.colosse); } },
    { id: "ach_mere", name: "Mère vaincue", desc: "Bats la Mère des Marais (ouvre la Rivière gelée).", gold: 200, check: function (r) { return !!(r.bossT && r.bossT.mere); } },
    { id: "ach_brasier", name: "Brasier éteint", desc: "Bats le Brasier ancestral (ouvre la Forêt calcinée).", gold: 200, check: function (r) { return !!(r.bossT && r.bossT.brasier); } },
    { id: "ach_tempete", name: "Tempête apaisée", desc: "Bats le Roi-Tempête (ouvre la Cime des chênes).", gold: 200, check: function (r) { return !!(r.bossT && r.bossT.tempete); } },
    { id: "ach_golem", name: "Golem abattu", desc: "Bats le Golem de racines (ouvre la Fourmilière géante).", gold: 200, check: function (r) { return !!(r.bossT && r.bossT.golem); } },
    { id: "ach_reine", name: "Reine chassée", desc: "Bats la Reine des guêpes en finale de donjon (ouvre le Nid des corbeaux).", gold: 200, check: function (r) { return !!(r.finalT && r.finalT.queen); } },
    { id: "ach_roi", name: "Roi déchu", desc: "Bats le Roi Champignon en finale de donjon (ouvre le Barrage des castors).", gold: 200, check: function (r) { return !!(r.finalT && r.finalT.mushking); } },
    { id: "ach_cerf", name: "Cerf vaincu", desc: "Bats le Grand Cerf en finale de donjon (ouvre la Charbonnière).", gold: 200, check: function (r) { return !!(r.finalT && r.finalT.stag); } }
  );
  // strates d'Expédition : chaque strate commence à un étage du repaire et ajoute une règle
  var STRATA = [
    { from: 1, name: "Surface", desc: "Règles normales." },
    { from: 3, name: "Sous-bois profond", desc: "Brouillard permanent : vision -20 %, Rôdeurs plus nombreux." },
    { from: 6, name: "Racines", desc: "Des galeries de racines s'ouvrent et se ferment toutes les 90 s." },
    { from: 9, name: "Grottes", desc: "Obscurité hors de ta lueur ; les cristaux au sol éclairent et soignent quand on les casse." },
    { from: 12, name: "Cœur ancien", desc: "La corruption avance 2 fois plus vite, mais chaque élite lâche un objet rare." },
  ];
  /* =====================================================================
     Contenu étendu, lot 7 : événements de partie, sanctuaires, structures d'Expédition, modificateurs
     ===================================================================== */
  // 12 événements communs et 8 événements de carte : 1 ou 2 par carte en Survie, 1 par étage en Expédition
  var EVENTS = [
    { id: "migration", name: "Migration", dur: 30, desc: "Une nuée traverse la carte ; XP x2 pendant 30 s." },
    { id: "averse", name: "Averse", dur: 45, desc: "Chaque goutte marque Eau ; les réactions avec l'Eau font +30 %." },
    { id: "coup_vent", name: "Coup de vent", dur: 30, desc: "Un vent pousse tout dans une direction." },
    { id: "eclipse", name: "Éclipse", dur: 30, desc: "Obscurité ; les élites gagnent un pouvoir de plus." },
    { id: "pluie_glands", name: "Pluie de glands", dur: 20, desc: "Des glands d'or tombent, gardés par des Rôdeurs." },
    { id: "marchand_presse", name: "Marchand pressé", dur: 40, desc: "Un marchand passe avec 3 objets à prix cassé." },
    { id: "cage", name: "Écureuil en cage", dur: 75, desc: "Un ami est retenu dans un camp ennemi ; libéré, il se bat avec toi 60 s." },
    { id: "duel", name: "Duel d'élite", dur: 45, desc: "Une élite à 2 pouvoirs te défie : bats-la sans quitter le cercle pour un objet rare." },
    { id: "tresor", name: "Chasse au trésor", dur: 60, desc: "Une carte au trésor : reste ancré sur la croix pour creuser." },
    { id: "invasion", name: "Invasion", dur: 20, desc: "Une escouade d'une autre carte, d'un autre élément, arrive." },
    { id: "chasseurs", name: "Nuit des chasseurs", dur: 40, desc: "2 fois plus de Rôdeurs, chacun lâche une noisette d'XP dorée." },
    { id: "comete", name: "Comète", dur: 12, desc: "Une comète tombe dans une zone annoncée ; son cratère contient un coffre." },
    { id: "fete_champi", name: "Fête des champignons", map: "clairiere", dur: 12, desc: "Les champignons deviennent des Champignons-bombes, sauf ceux qu'on détruit avant." },
    { id: "brume", name: "Brume épaisse", map: "marais", dur: 40, desc: "Vision réduite ; les Guetteurs disparaissent." },
    { id: "chute_feuilles", name: "Chute de feuilles", map: "automne", dur: 30, desc: "Les feuilles cachent tous les pièges." },
    { id: "essaim_amical", name: "Essaim amical", map: "nuit", dur: 40, desc: "Des lucioles éclairent et soignent ceux qui les suivent." },
    { id: "eboulement", name: "Éboulement", map: "gouffre", dur: 20, desc: "Un pan de carte s'effondre et ouvre de nouveaux passages." },
    { id: "degel", name: "Dégel", map: "riviere", dur: 20, desc: "La glace fond par endroits et des trous d'eau apparaissent." },
    { id: "feu_brousse", name: "Feu de brousse", map: "calcinee", dur: 25, desc: "Un incendie traverse la carte et brûle aussi les ennemis." },
    { id: "orage_alt", name: "Orage en altitude", map: "cime", dur: 30, desc: "La foudre frappe autour de toi ; rester ancré protège." },
  ];
  // 8 sanctuaires de plus : ils agissent sur la posture, l'élément ou les techniques
  SHRINES.push(
    { id: "s_posture", name: "Statue de posture", color: "#f2b05e", time: 2, weight: 6, quest: "q7_posture", desc: "Change de posture une fois dans la partie." },
    { id: "s_elem", name: "Autel élémentaire", color: "#9ee8ff", time: 2, weight: 6, quest: "q7_elem", desc: "Change l'élément de ton arme pour la partie, parmi 2 proposés." },
    { id: "s_forge", name: "Forge errante", color: "#ff7a2a", time: 1.6, weight: 6, quest: "q7_forge", desc: "Contre des glands, une technique de niveau 4 passe au niveau 5." },
    { id: "s_nid", name: "Nid abandonné", color: "#c8a060", time: 1.6, weight: 5, quest: "q7_nid", desc: "Un œuf éclot après 150 ennemis tués et donne un familier pour la partie." },
    { id: "s_memoire", name: "Pierre de mémoire", color: "#b07cf0", time: 1.6, weight: 5, quest: "q7_memoire", desc: "Relance ton dernier choix de cartes." },
    { id: "s_puits", name: "Puits des souhaits", color: "#6ad8ff", time: 1.8, weight: 5, quest: "q7_puits", desc: "Jette un objet à effets, reçois-en deux d'une rareté en dessous." },
    { id: "s_cercle", name: "Cercle de pierres", color: "#a8b0b8", time: 2, weight: 5, quest: "q7_cercle", coop: true, desc: "Coop : si tous les joueurs sont dedans, chacun choisit une carte de plus." },
    { id: "s_escouade", name: "Autel des escouades", color: "#c8553d", time: 1.6, weight: 5, quest: "q7_escouade", desc: "Choisis la prochaine escouade : Nuée pour l'XP, ou élites pour le butin." }
  );
  // structures d'Expédition de plus
  var EXDEF2 = {
    cache: { name: "Coffre caché", col: "#f6d36b", t: 1.5 },
    plaques: { name: "Ruines à plaques", col: "#a8b0b8", t: 0 },
    arene_s: { name: "Arène sauvage", col: "#c8553d", t: 0 },
    marchands: { name: "Campement de marchands", col: "#7ad07a", t: 1.5 },
    pont: { name: "Pont-levis", col: "#8a5a3b", t: 0 },
    terrier_b: { name: "Terrier abandonné", col: "#b07cf0", t: 0 },
    source_ch: { name: "Source chaude", col: "#ff9a7a", t: 0 },
    prison: { name: "Camp du prisonnier", col: "#f2b05e", t: 1.5 },
    autel_prof: { name: "Autel de la profondeur", col: "#6ad8ff", t: 2 },
  };
  // 15 modificateurs de plus, partagés entre l'Arène et le défi de la semaine : chacun change une règle
  var MODS2 = [
    { id: "miroir", name: "Miroir", desc: "Les ennemis sont de l'élément qui bat celui de ton arme." },
    { id: "petit", name: "Petit format", desc: "Les ennemis sont 30 % plus petits." },
    { id: "sansvolte", name: "Sans Volte", desc: "La Volte est désactivée ; cadence +20 %." },
    { id: "immobiles", name: "Immobiles", desc: "Tes techniques ne tirent qu'ancré, mais font le double." },
    { id: "course", name: "Course", desc: "Tes techniques ne tirent qu'en mouvement, mais font +50 %." },
    { id: "fievre", name: "Fièvre élémentaire", desc: "L'élément des ennemis change chaque minute." },
    { id: "unique", name: "Choix unique", desc: "Une seule carte par niveau." },
    { id: "elitemania", name: "Élite-mania", desc: "Tous les ennemis ont un pouvoir d'élite, mais 40 % de PV en moins." },
    { id: "rueeboss", name: "Ruée des boss", desc: "Un boss toutes les 60 s, plus aucune escouade." },
    { id: "pauvrete", name: "Pauvreté", desc: "Aucun gland en partie ; les coffres sont gratuits." },
    { id: "brouillard", name: "Brouillard", desc: "Vision réduite de moitié." },
    { id: "gravite", name: "Gravité", desc: "Les projectiles retombent : portée -40 %, zones +30 %." },
    { id: "arsenal", name: "Arsenal aléatoire", desc: "Ton attaque de base change à chaque palier." },
    { id: "revenants", name: "Revenants", desc: "Chaque ennemi tué revient une fois en fantôme." },
    { id: "mouvante", name: "Arène mouvante", desc: "L'arène rétrécit puis s'élargit toutes les 30 s.", arena: true },
  ];
  ARENA.mods = ARENA.mods.concat(MODS2);
  // objets et anneau qui dépendent des événements et du coffre caché
  ITEMS.push(
    { id: "calendrier", r: 2, icon: "📅", name: "Calendrier", desc: "Chaque événement de partie terminé donne un objet commun." },
    { id: "carte_ciel", r: 2, icon: "🗺️", name: "Carte du ciel", quest: "q7_ciel", desc: "Les événements sont annoncés 30 s à l'avance et durent 50 % plus longtemps." },
    { id: "carte_froissee", r: 1, expe: true, icon: "📜", name: "Carte froissée", desc: "Révèle le coffre caché de chaque étage." }
  );
  ITEMS.forEach(function (it, i) { it.idx = i; });
  GEAR.r_orage = { slot: "anneau", name: "Anneau de l'orage", icon: "⛈️", ring: "orage", desc: "Événements : un événement de partie de plus par carte ou par étage.", cost: { mousse_noire: 8, poussiere_lune: 6, bois_mort: 3, t_owl: 1 } };
  // quêtes des sanctuaires (et de la Carte du ciel)
  QUESTS.push(
    { id: "q7_posture", desc: "Débloque les 3 postures d'un écureuil.", check: function (r) { return ((r.tot && r.tot.fullChar) || 0) >= 1; } },
    { id: "q7_elem", desc: "Déclenche les 6 réactions dans une partie.", check: function (r) { return Object.keys(r.reactK || {}).length >= 6; } },
    { id: "q7_forge", desc: "Fais 10 fusions au total.", check: function (r) { return ((r.tot && r.tot.fusions) || 0) >= 10; } },
    { id: "q7_nid", desc: "Tue 5 000 ennemis au total.", check: function (r) { return ((r.tot && r.tot.kills) || 0) >= 5000; } },
    { id: "q7_memoire", desc: "Joue 20 parties.", check: function (r) { return ((r.tot && r.tot.runs) || 0) >= 20; } },
    { id: "q7_puits", desc: "Sacrifie 5 objets à l'Autel du sacrifice au total.", check: function (r) { return ((r.tot && r.tot.sacrifices) || 0) >= 5; } },
    { id: "q7_cercle", desc: "Bats un méga boss en coop (Pip & Pop comptent).", check: function (r) { return ((r.tot && r.tot.coopMega) || 0) >= 1; } },
    { id: "q7_escouade", desc: "Tue 100 élites au total.", check: function (r) { return ((r.tot && r.tot.elites) || 0) >= 100; } },
    { id: "q7_ciel", desc: "Vis 10 événements au total.", check: function (r) { return ((r.tot && r.tot.events) || 0) >= 10; } }
  );
  /* =====================================================================
     Contenu étendu, lot 8 : succès (les 3 hérités de la v1 remplacés, 46 nouveaux), dernière quête
     ===================================================================== */
  ACHIEVEMENTS = ACHIEVEMENTS.filter(function (a) { return ["prestige_1", "arbre", "prevoyant"].indexOf(a.id) < 0; });
  var XP_ = function (r) { return r && r.ex ? r.ex.floor : 0; };
  var ACH8 = [
    ["eveil", "Éveil", "Éveille une arme (maîtrise 5).", 300, function (r, s) { return (s.awake || 0) >= 1; }],
    ["arbre_complet", "Arbre complet", "Ouvre tous les paliers de talents d'une posture.", 200, function (r, s) { return !!s.fullTal; }],
    ["batisseur", "Bâtisseur", "Achète 5 améliorations du camp.", 100, function (r, s) { return (s.campUps || 0) >= 5; }],
    ["x_premiere", "Première extraction", "Réussis une extraction.", 50, function (r) { return !!r.extracted; }],
    ["x_hotte", "Hotte pleine", "Extrais avec le sac plein.", 100, function (r) { return !!r.extracted && !!r.bagFull; }],
    ["x_sousbois", "Sous-bois", "Atteins l'étage 3 en Expédition.", 150, function (r) { return XP_(r) >= 3; }],
    ["x_plongee", "Plongée", "Atteins l'étage 6 en Expédition.", 300, function (r) { return XP_(r) >= 6; }],
    ["x_sansfond", "Sans fond", "Atteins l'étage 12 en Expédition.", 800, function (r) { return XP_(r) >= 12; }],
    ["x_passeur", "Passeur payé", "Extrais par le passeur.", 50, function (r) { return !!r.extracted && !!(r.exStats && r.exStats.passeur); }],
    ["x_nuit", "Survivant de la nuit", "Traverse une nuit d'Expédition sans mourir.", 100, function (r) { return !!r.nightDone; }],
    ["x_sauveteur", "Sauveteur", "En coop, extrais le sac d'un allié tombé.", 150, function (r) { return !!r.rescued; }],
    ["m_racines", "Racines tranchées", "Bats Mille-Racines.", 300, function (r) { return !!(r.bossT && r.bossT.racines_m); }],
    ["m_glace", "Glace brisée", "Bats le Grand Brochet des glaces.", 300, function (r) { return !!(r.bossT && r.bossT.brochet); }],
    ["m_cendres", "Cendres froides", "Bats le Phénix des cendres.", 300, function (r) { return !!(r.bossT && r.bossT.phenix); }],
    ["m_ciel", "Ciel conquis", "Bats l'Aigle des cimes.", 300, function (r) { return !!(r.bossT && r.bossT.aigle); }],
    ["n_premier", "Premier cauchemar", "Bats le méga boss d'une carte en Cauchemar 1.", 100, function (r) { return (r.cauch || 0) >= 1 && !!r.megaWon; }],
    ["n_cinq", "Cauchemar 5", "Bats le méga boss d'une carte en Cauchemar 5.", 300, function (r) { return (r.cauch || 0) >= 5 && !!r.megaWon; }],
    ["n_fond", "Fond du cauchemar", "Bats un méga boss en Cauchemar 10.", 800, function (r) { return (r.cauch || 0) >= 10 && !!r.megaWon; }],
    ["n_maitre", "Maître des cauchemars", "Bats le méga boss de toutes les cartes en Cauchemar 10.", 2000, function (r, s) { return MAPS.every(function (m) { return ((s.cauch || {})[m.id] || 0) >= 10; }); }],
    ["g_faitmain", "Fait main", "Fabrique une première pièce d'attirail.", 50, function (r, s) { return (s.crafted || 0) >= 1; }],
    ["g_tenue", "Tenue complète", "Porte une panoplie complète en partie.", 150, function (r) { return !!r.fullSet; }],
    ["g_unique", "Pièce unique", "Porte une pièce unique en partie.", 200, function (r) { return !!r.uniqueWorn; }],
    ["g_anneaux", "Collection d'anneaux", "Possède 10 anneaux différents.", 200, function (r, s) { return (s.rings || 0) >= 10; }],
    ["g_forge", "Forgemagie", "Applique 10 runes.", 100, function (r, s) { return (s.runes || 0) >= 10; }],
    ["w_poly", "Polyvalent", "Joue avec 10 armes différentes.", 150, function (r, s) { return (s.armes || 0) >= 10; }],
    ["w_armurerie", "Armurerie", "Joue avec les 20 armes.", 400, function (r, s) { return (s.armes || 0) >= 20; }],
    ["w_maitre", "Maître d'armes", "Éveille 5 armes.", 500, function (r, s) { return (s.awake || 0) >= 5; }],
    ["e_evoc", "Évolution élémentaire", "Obtiens une première évolution élémentaire.", 100, function (r, s) { return (s.evoC || 0) >= 1; }],
    ["e_six", "Six réactions", "Déclenche les 6 réactions dans une partie.", 200, function (r) { return Object.keys(r.reactK || {}).length >= 6; }],
    ["e_chaine", "Réaction en chaîne", "Déclenche 50 réactions dans une partie.", 150, function (r) { return (r.reactions || 0) >= 50; }],
    ["e_pur", "Élément pur", "Porte 9 points d'un élément.", 100, function (r) { var m = r.eptMax || {}; return Object.keys(m).some(function (k) { return m[k] >= 9; }); }],
    ["p_trois", "Trois styles", "Débloque les 3 postures d'un écureuil.", 100, function (r, s) { return (s.fullChar || 0) >= 1; }],
    ["p_toutes", "Toutes les postures", "Débloque les 30 postures.", 600, function (r, s) { return (s.fullChar || 0) >= 10; }],
    ["p_accompli", "Écureuil accompli", "Monte un écureuil au niveau 8.", 100, function (r, s) { return (s.charMax || 0) >= 8; }],
    ["v_temoin", "Témoin", "Vis 10 événements de partie.", 100, function (r, s) { return (s.events || 0) >= 10; }],
    ["v_liberateur", "Libérateur", "Libère chacun des 4 prisonniers.", 200, function (r, s) { return (s.freed || 0) >= 4; }],
    ["v_tresor", "Chercheur d'or", "Termine une chasse au trésor.", 80, function (r, s) { return (s.treasures || 0) >= 1; }],
    ["v_autels", "Tous les autels", "Active les 18 sanctuaires au moins une fois.", 300, function (r, s) { return (s.shrineK || 0) >= 18; }],
    ["c_quatre", "Expédition à quatre", "Extrais à 4 joueurs.", 200, function (r) { return !!r.extracted && (r.humans || 1) >= 4; }],
    ["c_toujours", "Toujours là", "Relève 50 alliés.", 150, function (r, s) { return (s.revives || 0) >= 50; }],
    ["c_bande", "Bande au complet", "Joue une partie à 6.", 100, function (r) { return (r.humans || 1) >= 6; }],
  ];
  ACH8.forEach(function (a) { ACHIEVEMENTS.push({ id: a[0], name: a[1], desc: a[2], gold: a[3], check: a[4] }); });
  QUESTS.push({ id: "q8_verre", desc: "Bats un méga boss en Cauchemar 3 ou plus.", check: function (r) { return (r.cauch || 0) >= 3 && !!r.megaWon; } });
  GEAR.r_verre.quest = "q8_verre";
  /* =====================================================================
     Graphismes 2.3, lot 2 : boss et méga boss dessinés à leur vraie taille.
     Chaque boss est décrit par des formes (ellipses, tubes, polygones) qui
     sont pixelisées en 3 ou 4 tons au chargement, avec traits intérieurs.
     Le contour sombre est ajouté ensuite par le moteur, comme partout.
     « ns » : l'échelle de jeu pour laquelle le sprite est dessiné (il n'est
     plus agrandi à l'écran).
     ===================================================================== */
  var RIG_L = [-0.45, -0.62, 0.64];
  function rgE(cx, cy, rx, ry, rot, m, o) { var s = { t: "e", cx: cx, cy: cy, rx: rx, ry: ry, rot: rot || 0, m: m }; if (o) for (var k in o) s[k] = o[k]; return s; }
  function rgC(x1, y1, x2, y2, r1, r2, m, o) { var s = { t: "c", x1: x1, y1: y1, x2: x2, y2: y2, r1: r1, r2: r2, m: m }; if (o) for (var k in o) s[k] = o[k]; return s; }
  function rgP(pts, m, o) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    var s = { t: "p", pts: pts, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: Math.max(0.5, (x1 - x0) / 2), hh: Math.max(0.5, (y1 - y0) / 2), m: m };
    if (o) for (var k in o) s[k] = o[k]; return s;
  }
  function rgHit(o, x, y) {
    var nx, ny, q;
    if (o.t === "e") {
      var cr = Math.cos(o.rot), sr = Math.sin(o.rot), dx = x - o.cx, dy = y - o.cy;
      var u = (dx * cr + dy * sr) / o.rx, v = (-dx * sr + dy * cr) / o.ry; q = u * u + v * v;
      if (q > 1) return null;
      return [u * cr - v * sr, u * sr + v * cr, q];
    }
    if (o.t === "c") {
      var vx = o.x2 - o.x1, vy = o.y2 - o.y1, L2 = vx * vx + vy * vy || 1;
      var t = Math.max(0, Math.min(1, ((x - o.x1) * vx + (y - o.y1) * vy) / L2));
      var px = o.x1 + vx * t, py = o.y1 + vy * t, r = o.r1 + (o.r2 - o.r1) * t;
      nx = (x - px) / r; ny = (y - py) / r; q = nx * nx + ny * ny;
      return q > 1 ? null : [nx, ny, q];
    }
    var inside = false, P = o.pts;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) inside = !inside;
    }
    if (!inside) return null;
    nx = (x - o.cx) / o.hw * 0.8; ny = (y - o.cy) / o.hh * 0.8; q = Math.min(0.95, nx * nx + ny * ny);
    return [nx, ny, q];
  }
  // shapes -> { rows, pal } ; mats : { nom: [clair, base, ombre, sombre] } (1 couleur = plat)
  function rigRaster(W, H, shapes, mats) {
    var idx = new Int16Array(W * H).fill(-1), col = new Array(W * H), x, y, i;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      for (i = shapes.length - 1; i >= 0; i--) {
        var o = shapes[i], n = rgHit(o, x + 0.5, y + 0.5); if (!n) continue;
        var m = mats[o.m], tone = 0;
        if (m.length > 1 && !o.flat) {
          var nz = Math.sqrt(Math.max(0, 1 - n[2])), d = n[0] * RIG_L[0] + n[1] * RIG_L[1] + nz * RIG_L[2];
          tone = d > 0.8 ? 0 : d > 0.34 ? 1 : d > -0.1 || m.length < 4 ? 2 : 3;
        }
        var p = y * W + x; idx[p] = i; col[p] = m[Math.min(tone, m.length - 1)];
        break;
      }
    }
    // traits intérieurs : la pièce de derrière s'assombrit au contact d'une pièce « line » posée devant
    var out = col.slice();
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var p0 = y * W + x, a = idx[p0]; if (a < 0 || shapes[a].flat) continue;
      var nb = [x > 0 ? p0 - 1 : -1, x < W - 1 ? p0 + 1 : -1, y < H - 1 ? p0 + W : -1, y > 0 ? p0 - W : -1];
      for (var k = 0; k < 4; k++) {
        var b = nb[k] < 0 ? -1 : idx[nb[k]];
        if (b > a && shapes[b].line && shapes[b].m !== shapes[a].m) { var mm = mats[shapes[a].m]; out[p0] = mm[mm.length - 1]; break; }
      }
    }
    var CH = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?!", pal = {}, back = {}, ci = 0, rows = [];
    for (y = 0; y < H; y++) {
      var row = "";
      for (x = 0; x < W; x++) {
        var c = idx[y * W + x] < 0 ? null : out[y * W + x];
        if (!c) { row += "."; continue; }
        if (!back[c]) { back[c] = CH[ci++]; pal[back[c]] = c; }
        row += back[c];
      }
      rows.push(row);
    }
    return { rows: rows, pal: pal };
  }
  // un boss : rig(ph) -> shapes, nf images ; toutes les images partagent une palette
  function rigSprite(W, H, mats, rig, nf, extra) {
    var pal = {}, frames = [], CH = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?!", back = {}, ci = 0;
    for (var f = 0; f < (nf || 4); f++) {
      var R = rigRaster(W, H, rig(f / (nf || 4)), mats);
      frames.push(R.rows.map(function (row) {
        return row.split("").map(function (ch) {
          if (ch === ".") return ".";
          var c = R.pal[ch]; if (!back[c]) { back[c] = CH[ci++]; pal[back[c]] = c; } return back[c];
        }).join("");
      }));
    }
    var d = { pal: pal, frames: frames };
    if (extra) for (var k in extra) d[k] = extra[k];
    return d;
  }
  var TAU2 = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  var INK = ["#2b1709"], WHITE = ["#fdf3de"];

  /* --- 9 boss --- */
  SPRITES.bs_castor = rigSprite(34, 22, {
    fur: ["#b88250", "#8a5a3b", "#6b4430", "#4a2e1c"], tail: ["#8a7868", "#5e4e40", "#45382c", "#2e241a"], belly: ["#d8b080", "#b8905e", "#8a6a48"],
    teeth: ["#f6c84a"], ink: INK, white: WHITE, scale: ["#3a2e22"]
  }, function (ph) {
    var s = sin(ph * TAU2), b = Math.abs(s) * 0.8;
    return [
      rgE(6.5, 14 - s * 1.5, 6.2, 3.2, -0.25 - s * 0.25, "tail", { line: true }),
      rgC(4, 13.5 - s * 1.4, 9, 15 - s * 1.2, 0.35, 0.35, "scale", { flat: true }), rgC(5, 16 - s, 8, 12 - s * 1.6, 0.35, 0.35, "scale", { flat: true }),
      rgE(12, 19.5, 3.4, 1.8, 0, "fur"),
      rgE(16, 13 - b, 9.5, 7.2, 0, "fur", { line: true }),
      rgE(20, 15.5 - b, 4.5, 4.2, 0, "belly"),
      rgE(22.5, 19.8, 2.8, 1.5, 0, "fur", { line: true }),
      rgE(25, 9.2 - b, 6.3, 5.6, 0, "fur", { line: true }),
      rgE(22, 4.4 - b, 1.7, 1.7, 0, "fur"),
      rgE(29, 11.5 - b, 3.8, 3.1, 0, "belly", { line: true }),
      rgP([[28.2, 12.6 - b], [30.4, 12.6 - b], [30.4, 16 - b], [28.2, 16 - b]], "teeth", { flat: true }),
      rgC(29.3, 12.6 - b, 29.3, 16 - b, 0.25, 0.25, "scale", { flat: true }),
      rgE(31.7, 9.6 - b, 1.3, 1, 0, "ink", { flat: true }),
      rgE(26.4, 7.5 - b, 1, 1.3, 0, "ink", { flat: true }), rgE(26.6, 7 - b, 0.45, 0.45, 0, "white", { flat: true })
    ];
  });
  SPRITES.bs_heron = rigSprite(26, 34, {
    grey: ["#d8dee4", "#a8b2bc", "#7a8692", "#545e6a"], wing: ["#a8b2bc", "#7a8692", "#5a6672", "#3e4852"], neck: ["#ffffff", "#eef2f4", "#c8d0d8", "#9aa4ae"],
    beak: ["#ffe07a", "#f2c230", "#c8941a"], leg: ["#c8941a"], ink: ["#1b1226"], eye: ["#f6d36b"]
  }, function (ph) {
    var s = sin(ph * TAU2), lift = Math.max(0, s) * 4, nb = s * 0.6;
    return [
      rgC(10, 23, 9, 33, 0.8, 0.7, "leg"),
      rgC(13, 23, 14 + lift * 0.4, 33 - lift, 0.8, 0.7, "leg", { line: true }),
      rgP([[1.5, 21], [6, 17.5], [6.5, 22.5]], "wing"),
      rgE(10.5, 19, 7.2, 5.2, -0.35, "grey", { line: true }),
      rgE(9, 18, 5.6, 3.6, -0.35, "wing", { line: true }),
      rgC(14.5, 16, 15.5 + nb, 10, 2.3, 1.8, "neck", { line: true }),
      rgC(15.5 + nb, 10, 18.5 + nb, 5.5, 1.8, 2, "neck"),
      rgC(16 + nb, 9, 17 + nb, 14, 0.4, 0.4, "ink", { flat: true }),
      rgC(18 + nb, 4, 12 + nb, 2.5 + s, 0.8, 0.35, "ink", { flat: true }),
      rgE(19 + nb, 5, 2.7, 2.3, 0, "neck", { line: true }),
      rgP([[21 + nb, 4.3], [25.5 + nb, 5.6], [21 + nb, 6.4]], "beak", { line: true }),
      rgE(19.8 + nb, 4.5, 0.9, 0.9, 0, "eye", { flat: true }), rgE(20 + nb, 4.5, 0.45, 0.5, 0, "ink", { flat: true })
    ];
  });
  SPRITES.bs_silure = rigSprite(38, 20, {
    body: ["#7e8e80", "#4e5e5a", "#38463f", "#26312c"], belly: ["#d0d0b0", "#a8a888", "#86866a"], fin: ["#62726a", "#45534e", "#313e3a", "#212a27"],
    ink: ["#1e2422"], eye: ["#e8e0a0"], spot: ["#2e3a36"]
  }, function (ph) {
    var s = sin(ph * TAU2), w = s * 1.6;
    return [
      rgP([[1, 4 + w], [9, 9], [9, 12.5], [1, 17 + w]], "fin", { line: true }),
      rgP([[12, 6], [17, 2], [21, 6]], "fin"),
      rgE(17, 11, 12.5, 6, 0, "body", { line: true }),
      rgE(21, 14.2, 9.5, 2.6, 0, "belly"),
      rgE(12, 9, 1.2, 0.8, 0, "spot", { flat: true }), rgE(16, 8, 1, 0.7, 0, "spot", { flat: true }), rgE(9, 11, 0.9, 0.7, 0, "spot", { flat: true }),
      rgP([[22, 14], [19.5, 18.5 + s * 0.5], [25.5, 16]], "fin", { line: true }),
      rgE(28.5, 10.5, 8, 6, 0, "body", { line: true }),
      rgC(31, 13.2, 37, 12.8, 0.6, 0.6, "ink", { flat: true }),
      rgC(34, 12, 37.6, 17.5 + w * 0.6, 0.45, 0.3, "ink", { flat: true }),
      rgC(33.5, 11, 37.6, 6.5 - w * 0.5, 0.4, 0.3, "ink", { flat: true }),
      rgC(31, 14.5, 32.5, 19.5, 0.4, 0.3, "ink", { flat: true }),
      rgE(31.5, 8, 1.2, 1.2, 0, "eye", { flat: true }), rgE(31.8, 8.1, 0.6, 0.65, 0, "ink", { flat: true })
    ];
  });
  SPRITES.bs_ours = rigSprite(36, 28, {
    fur: ["#7e5444", "#5a3a2a", "#40281c", "#2a1810"], muzzle: ["#b09278", "#8a6a54", "#6b5040"], ember: ["#ff8a2a"], ember2: ["#ffc04a"],
    ash: ["#a8988c"], ink: ["#1e120c"]
  }, function (ph) {
    var s = sin(ph * TAU2), lk = s * 2, eb = ph < 0.5 ? "ember" : "ember2";
    return [
      rgC(9, 18, 8 + lk, 26.5, 3, 2.6, "fur"),
      rgC(23, 18, 22 - lk, 26.5, 2.8, 2.5, "fur"),
      rgE(16, 15, 11.5, 8.3, 0, "fur", { line: true }),
      rgE(13, 9.5, 6.5, 4.5, -0.1, "fur"),
      rgC(12.5, 18, 13.5 - lk, 26.5, 3, 2.6, "fur", { line: true }),
      rgC(26, 18, 27 + lk, 26.5, 2.8, 2.5, "fur", { line: true }),
      rgE(28, 12, 5.8, 5.2, 0, "fur", { line: true }),
      rgE(25.5, 7, 1.9, 1.9, 0, "fur"),
      rgE(32, 14, 3, 2.3, 0, "muzzle", { line: true }),
      rgE(34.6, 13, 1.1, 0.9, 0, "ink", { flat: true }),
      rgE(29, 10.5, 0.9, 0.9, 0, eb, { flat: true }),
      rgC(10, 11, 14, 14, 0.5, 0.45, eb, { flat: true }), rgC(16, 8.5, 17.5, 13, 0.5, 0.4, eb, { flat: true }), rgC(19, 16, 22, 13.5, 0.45, 0.4, eb, { flat: true }),
      rgC(7, 15, 9, 18, 0.45, 0.4, eb, { flat: true }),
      rgE(12, 6.5, 2.2, 1, 0, "ash", { flat: true }), rgE(20, 8.5, 1.8, 0.8, 0, "ash", { flat: true })
    ];
  });
  SPRITES.bs_sala_g = rigSprite(42, 18, {
    body: ["#5a4646", "#342828", "#241a1a", "#160e0e"], belly: ["#e87a3a", "#d8572a", "#a8401e"], spot: ["#ffb02a"], spot2: ["#ff6a1a"],
    flame: ["#ff8a2a"], flame2: ["#ffd05a"], eye: ["#ffe07a"], ink: ["#120a0a"]
  }, function (ph) {
    var S = [], i, a = ph * TAU2, lk = sin(a) * 2;
    var tail = []; for (i = 0; i < 8; i++) tail.push([2 + i * 1.8, 10 + sin(a + i * 0.8) * 1.6 * (1 - i / 8)]);
    for (i = 0; i < 7; i++) S.push(rgC(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 0.8 + i * 0.35, 1.15 + i * 0.35, "body"));
    S.push(rgC(16, 12, 14 + lk, 16.5, 1.1, 0.9, "body"), rgC(26, 12, 28 - lk, 16.5, 1.1, 0.9, "body"));
    S.push(rgE(22, 10.5, 9.5, 4.6, 0, "body", { line: true }), rgE(23, 12.8, 7, 1.6, 0, "belly"));
    S.push(rgC(18, 12, 19 - lk, 16.5, 1.1, 0.9, "body", { line: true }), rgC(28, 12, 27 + lk, 16.5, 1.1, 0.9, "body", { line: true }));
    S.push(rgE(33.5, 9.5, 5.8, 4, 0, "body", { line: true }));
    [[10, 9.5], [16, 8], [20, 11], [24, 8], [28, 10.5], [32, 7.5], [6, 10]].forEach(function (p, k) { S.push(rgE(p[0], p[1], 1.1, 0.9, 0, k % 2 ? "spot2" : "spot", { flat: true })); });
    for (i = 0; i < 6; i++) { var fx = 14 + i * 3.4, fh = 3 + ((i + (ph * 4 | 0)) % 3); S.push(rgP([[fx - 1.4, 7], [fx + 0.4, 6.5 - fh], [fx + 1.6, 7]], (i + (ph * 4 | 0)) % 2 ? "flame" : "flame2", { flat: true })); }
    S.push(rgC(35, 11.3, 39, 11, 0.4, 0.4, "ink", { flat: true }));
    S.push(rgE(35.5, 8, 1.1, 1.1, 0, "eye", { flat: true }), rgE(35.8, 8, 0.5, 0.6, 0, "ink", { flat: true }));
    return S;
  });
  SPRITES.bs_corbeau = rigSprite(32, 26, {
    black: ["#50507a", "#30304a", "#1e1e30", "#12121c"], wing: ["#3e3e5e", "#26263c", "#18182a", "#0e0e18"], beak: ["#6a6a7a", "#44444e", "#2e2e36"],
    crown: ["#ffe88a", "#f6c23a", "#c8941a"], red: ["#e02a2a"], leg: ["#3a3a44"]
  }, function (ph) {
    var f = sin(ph * TAU2) * 0.25;
    return [
      rgC(13, 19, 12, 25.5, 0.7, 0.6, "leg"), rgC(16, 19, 17, 25.5, 0.7, 0.6, "leg", { line: true }),
      rgP([[1.5, 17], [9.5, 13], [9.5, 19]], "wing", { line: true }),
      rgE(14.5, 15.5, 8.3, 6.2, -0.2, "black", { line: true }),
      rgE(12.5, 13.5 - f * 6, 7.5, 4.2, -0.45 + f, "wing", { line: true }),
      rgE(22, 9.5, 4.8, 4.2, 0, "black", { line: true }),
      rgP([[25.5, 8.8], [31, 10.4], [25.5, 12]], "beak", { line: true }),
      rgE(23.5, 8.4, 0.95, 0.95, 0, "red", { flat: true }),
      rgP([[18.5, 5.8], [19, 1.6], [20.6, 3.8], [21.8, 0.6], [23, 3.8], [24.5, 1.6], [25, 5.8]], "crown", { line: true }),
      rgE(21.8, 4.2, 0.65, 0.65, 0, "red", { flat: true })
    ];
  }, 4, { flying: true });
  SPRITES.bs_pivert = rigSprite(28, 30, {
    green: ["#a8d468", "#6a9a3a", "#4a7a2a", "#30561c"], wing: ["#7aa84a", "#4f7a2c", "#3a5e20", "#264014"], red: ["#ff7060", "#d8483a", "#9a2a20"],
    face: ["#ffffff", "#eef0e0", "#c8ccb8"], beak: ["#e0e0d0", "#a8a898", "#78786a"], ink: ["#1b1226"], bar: ["#f6e08a"], leg: ["#8a8a7a"]
  }, function (ph) {
    var st = ph < 0.25 ? 2.5 : ph < 0.5 ? 1 : 0, hx = st * 0.6;
    return [
      rgP([[4, 19], [6.5, 29], [10.5, 21]], "wing", { line: true }),
      rgC(12, 23, 14, 26, 0.7, 0.6, "leg"), rgC(10, 23, 11, 26.5, 0.7, 0.6, "leg"),
      rgE(11.5, 17, 6.3, 7.8, -0.25, "green", { line: true }),
      rgE(9.5, 16, 4.6, 6.2, -0.25, "wing", { line: true }),
      rgE(8.5, 14, 0.7, 0.6, 0, "bar", { flat: true }), rgE(10, 17, 0.7, 0.6, 0, "bar", { flat: true }), rgE(8.6, 19.5, 0.7, 0.6, 0, "bar", { flat: true }),
      rgE(15 + hx, 7.5, 4.6, 4.3, 0, "green", { line: true }),
      rgE(14 + hx, 4.3, 4, 2.6, 0, "red", { line: true }),
      rgE(17 + hx, 8.6, 2.7, 2, 0, "face"),
      rgC(15.5 + hx, 10, 18.8 + hx, 10.6, 0.45, 0.4, "ink", { flat: true }),
      rgP([[18.6 + hx, 6.8], [22 + st * 2 + hx, 7.9], [18.6 + hx, 9.3]], "beak", { line: true }),
      rgE(16.2 + hx, 7, 0.85, 0.85, 0, "ink", { flat: true })
    ];
  }, 4, { flying: true });
  SPRITES.bs_scolo = rigSprite(44, 14, {
    seg: ["#e8785a", "#a83e2c", "#7a2a1e", "#541a12"], leg: ["#f2b05e"], ink: ["#1e0e0a"], head: ["#c85a3a", "#8a2e20", "#641e14", "#44120c"]
  }, function (ph) {
    var S = [], a = ph * TAU2, i;
    for (i = 0; i < 10; i++) {
      var x = 3.5 + i * 3.5, y = 6.5 + sin(a + i * 0.7) * 1.1, lk = sin(a * 2 + i) * 1.2;
      S.push(rgC(x, y + 1.5, x - 1 + lk, y + 6.2, 0.4, 0.3, "leg", { flat: true }));
      S.push(rgC(x + 0.6, y + 1.2, x + 1.4 - lk, y + 6, 0.4, 0.3, "leg", { flat: true }));
    }
    for (i = 0; i < 10; i++) S.push(rgE(3.5 + i * 3.5, 6.5 + sin(a + i * 0.7) * 1.1, 2.4 + i * 0.05, 2.7, 0, "seg", { line: true }));
    var hy = 6 + sin(a + 7) * 1.1;
    S.push(rgC(39, hy - 1.2, 43.5, hy - 4.5, 0.35, 0.25, "ink", { flat: true }), rgC(38.5, hy - 1.4, 41, hy - 5.5, 0.35, 0.25, "ink", { flat: true }));
    S.push(rgE(39.5, hy, 3.1, 2.7, 0, "head", { line: true }));
    S.push(rgC(41, hy + 1.5, 43.5, hy + 3 + sin(a) * 0.8, 0.6, 0.3, "ink", { flat: true }));
    S.push(rgE(40.5, hy - 0.8, 0.6, 0.6, 0, "leg", { flat: true }));
    return S;
  });
  SPRITES.bs_reine_f = rigSprite(38, 24, {
    chitin: ["#d87a5a", "#963e2c", "#6e2a1e", "#4a1a12"], stripe: ["#4a1a12"], wing: ["#f0f6f6", "#d0e0e4", "#a8c0c8"], ink: ["#1e0e0a"],
    crown: ["#ffe88a", "#f6c23a", "#c8941a"], eye: ["#f6d36b"]
  }, function (ph) {
    var a = ph * TAU2, lk = sin(a) * 1.6, S = [];
    S.push(rgE(17, 5.5, 7, 2.6, -0.35 + sin(a * 2) * 0.08, "wing"));
    S.push(rgC(18, 13, 15 + lk, 21.5, 0.6, 0.45, "chitin"), rgC(21, 13, 21 - lk, 22, 0.6, 0.45, "chitin"), rgC(23, 12, 26 + lk, 21.5, 0.6, 0.45, "chitin"));
    S.push(rgE(10.5, 12, 9.5, 7.5, -0.1, "chitin", { line: true }));
    [6, 9.5, 13].forEach(function (x) { S.push(rgC(x, 5.5, x + 1, 18.5, 0.45, 0.45, "stripe", { flat: true })); });
    S.push(rgE(21, 11, 4.2, 3.4, 0, "chitin", { line: true }));
    S.push(rgC(19.5, 13, 17 - lk, 21.5, 0.6, 0.45, "chitin", { line: true }), rgC(22.5, 13, 24 + lk, 22, 0.6, 0.45, "chitin", { line: true }), rgC(24, 12.5, 28 - lk, 21, 0.6, 0.45, "chitin", { line: true }));
    S.push(rgC(28, 6, 34, 1, 0.35, 0.3, "ink", { flat: true }), rgC(27, 6, 30, 0.8, 0.35, 0.3, "ink", { flat: true }));
    S.push(rgE(28.5, 8.5, 4.8, 4.2, 0, "chitin", { line: true }));
    S.push(rgC(31.5, 10.5, 35.5, 12.5 + sin(a) * 0.6, 0.7, 0.4, "ink", { flat: true }));
    S.push(rgE(30, 7.5, 1, 1, 0, "eye", { flat: true }));
    S.push(rgP([[25.5, 4.8], [26, 2], [27.3, 3.6], [28.3, 1.2], [29.3, 3.6], [30.6, 2], [31, 4.8]], "crown", { line: true }));
    return S;
  });

  /* --- 8 méga boss --- */
  var MOSS = ["#a8d468", "#6a9a3a", "#4a7a2a", "#30561c"];
  SPRITES.mg_colosse = rigSprite(60, 48, {
    rock: ["#c0a87e", "#8e7856", "#6a5840", "#4a3c2a"], soil: ["#8e6c48", "#6b4c30", "#4f3620", "#352414"], moss: MOSS,
    eye: ["#f6e06b"], core: ["#ffd85a"], crack: ["#352414"], cap: ["#c8553d"], stem: ["#f3e1c0"], ink: ["#2b1709"]
  }, function (ph) {
    var a = ph * TAU2, sw = sin(a) * 2.2, b = Math.abs(sin(a)) * 1;
    return [
      rgC(14, 19 - b, 8, 34 + sw, 5, 6, "rock"), rgE(8, 37 + sw, 5.3, 4.6, 0, "rock", { line: true }),
      rgC(21, 34, 20, 45.5, 6.2, 5.6, "soil"),
      rgE(30, 25 - b, 15.5, 12.5, 0, "rock", { line: true }),
      rgC(37, 34, 38 - sw * 0.5, 45.5, 6.2, 5.6, "soil", { line: true }),
      rgE(22, 22 - b, 2.8, 2, 0.4, "crack", { flat: true }), rgE(37, 31 - b, 2.4, 1.6, -0.3, "crack", { flat: true }),
      rgE(30, 26 - b, 3.8, 3.8, 0, "core", { flat: true }),
      rgC(30, 22 - b, 28, 18 - b, 0.5, 0.4, "core", { flat: true }), rgC(31, 29.5 - b, 33.5, 33 - b, 0.5, 0.4, "core", { flat: true }),
      rgE(17, 15.5 - b, 5.5, 3.3, -0.2, "moss", { line: true }), rgE(43, 15 - b, 5.5, 3.3, 0.2, "moss", { line: true }),
      rgE(30, 10.5 - b, 8.5, 7.3, 0, "rock", { line: true }),
      rgE(29, 4.3 - b, 7.5, 3.1, 0, "moss", { line: true }),
      rgE(27, 10.5 - b, 1.7, 1.3, 0, "eye", { flat: true }), rgE(33, 10.5 - b, 1.7, 1.3, 0, "eye", { flat: true }),
      rgC(27, 14.8 - b, 33, 15.2 - b, 0.6, 0.6, "ink", { flat: true }),
      rgC(47, 19 - b, 51, 33 - sw, 5, 6.5, "rock", { line: true }), rgE(51, 36 - sw, 5.8, 5.2, 0, "rock", { line: true }),
      rgC(45, 10.5 - b, 45, 13.5 - b, 0.7, 0.7, "stem", { flat: true }), rgE(45, 10 - b, 2.8, 1.7, 0, "cap", { line: true }),
      rgE(44.3, 9.4 - b, 0.6, 0.5, 0, "stem", { flat: true })
    ];
  }, 4, { ns: 2.6 });
  SPRITES.mg_mere = rigSprite(52, 36, {
    skin: ["#86ccb4", "#4e9e8a", "#36786a", "#245a50"], belly: ["#ece4b8", "#c8c090", "#a8a070"], spot: ["#2e6a5e"], pad: ["#9ad468", "#5a9a3a", "#3f7a2a"],
    eye: ["#ffe07a"], ink: ["#14302a"], sac: ["#d8f0f8", "#a8d0e0", "#80b0c8"], flower: ["#f29ad8"], drop: ["#bfefff"]
  }, function (ph) {
    var a = ph * TAU2, pu = (sin(a) + 1) * 0.9, b = Math.abs(sin(a)) * 0.6;
    return [
      rgE(13, 27, 9.5, 6.5, -0.3, "skin", { line: true }), rgE(10, 33.5, 6.5, 2, 0, "skin"),
      rgE(23, 22 - b, 16.5, 11.5, 0, "skin", { line: true }),
      rgE(29, 26 - b, 10.5, 6, 0, "belly"),
      rgE(16, 17 - b, 1.8, 1.4, 0, "spot", { flat: true }), rgE(21, 14.5 - b, 1.5, 1.2, 0, "spot", { flat: true }), rgE(11, 22 - b, 1.4, 1.1, 0, "spot", { flat: true }),
      rgC(36, 25, 39, 33.5, 3.2, 2.6, "skin", { line: true }), rgE(40.5, 34, 4.3, 1.7, 0, "skin", { line: true }),
      rgE(36, 15 - b, 10.5, 8.3, 0, "skin", { line: true }),
      rgE(41, 22 - b, 5 + pu, 3.8 + pu * 0.8, 0, "sac", { line: true }),
      rgE(33.5, 8 - b, 3.7, 3.4, 0, "skin", { line: true }), rgE(41, 8.8 - b, 3.2, 3, 0, "skin", { line: true }),
      rgE(34, 7.6 - b, 2.2, 2.2, 0, "eye", { flat: true }), rgE(34.3, 7.7 - b, 1.7, 0.6, 0, "ink", { flat: true }),
      rgE(41.4, 8.4 - b, 1.9, 1.9, 0, "eye", { flat: true }), rgE(41.7, 8.5 - b, 1.5, 0.55, 0, "ink", { flat: true }),
      rgC(38, 17.5 - b, 46.5, 16.2 - b, 0.6, 0.6, "ink", { flat: true }),
      rgP([[12, 10.5 - b], [24, 10.5 - b], [22, 13 - b], [14, 13 - b]], "pad", { line: true }),
      rgE(18, 10.8 - b, 6.5, 2, 0, "pad", { line: true }),
      rgE(19, 8.8 - b, 1.8, 1.5, 0, "flower", { line: true }),
      rgE(47, 26 + ph * 6, 0.6, 0.9, 0, "drop", { flat: true })
    ];
  }, 4, { ns: 3 });
  SPRITES.mg_brasier = rigSprite(56, 30, {
    rock: ["#76523e", "#4a3028", "#33201a", "#22140e"], lava: ["#ff8a2a"], lava2: ["#ffd05a"], flame: ["#ff6a1a"], ink: ["#120806"]
  }, function (ph) {
    var S = [], i, a = ph * TAU2, lk = sin(a) * 2.4, fi = ph * 4 | 0;
    var tail = []; for (i = 0; i < 8; i++) tail.push([2 + i * 2.4, 17 + sin(a + i * 0.8) * 2 * (1 - i / 8)]);
    for (i = 0; i < 7; i++) S.push(rgC(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 1 + i * 0.5, 1.5 + i * 0.5, "rock"));
    S.push(rgC(20, 20, 17 + lk, 27.5, 1.7, 1.4, "rock"), rgC(33, 20, 36 - lk, 27.5, 1.7, 1.4, "rock"));
    S.push(rgE(28, 18.5, 12.5, 6.5, 0, "rock", { line: true }));
    S.push(rgC(22, 20, 23 - lk, 27.5, 1.7, 1.4, "rock", { line: true }), rgC(36, 20, 35 + lk, 27.5, 1.7, 1.4, "rock", { line: true }));
    S.push(rgE(44, 15.5, 7.5, 5.8, 0, "rock", { line: true }));
    [[18, 17, 23, 20], [26, 15, 30, 19], [32, 21, 36, 17.5], [12, 18, 15, 16], [41, 17, 44, 19.5], [8, 17.5, 10, 19.5]].forEach(function (c, k) { S.push(rgC(c[0], c[1], c[2], c[3], 0.55, 0.45, (k + fi) % 3 ? "lava" : "lava2", { flat: true })); });
    for (i = 0; i < 9; i++) {
      var fx = 15 + i * 3.4, fh = 3.5 + ((i * 7 + fi * 3) % 5);
      S.push(rgP([[fx - 1.8, 13.5], [fx + 0.3 + sin(a + i) * 0.8, 13 - fh], [fx + 1.8, 13.5]], (i + fi) % 2 ? "flame" : "lava2", { flat: true }));
    }
    S.push(rgP([[40, 10.5], [42, 6 - (fi % 2) * 2], [44, 10]], "lava", { flat: true }));
    S.push(rgC(46, 18, 51, 17.6, 0.5, 0.5, "ink", { flat: true }), rgC(47, 18.5, 50, 18.4, 0.3, 0.3, "lava", { flat: true }));
    S.push(rgE(46.5, 13.5, 1.5, 1.3, 0, "lava2", { flat: true }));
    return S;
  }, 4, { ns: 3.4 });
  SPRITES.mg_tempete = rigSprite(46, 38, {
    feather: ["#f0fcf6", "#bcdcd4", "#88aaa8", "#5a7a7a"], dark: ["#6e9098", "#4a6a72", "#34525a", "#223c44"], disc: ["#ffffff"],
    eye: ["#fff47a"], ink: ["#1b1226"], beak: ["#e0a82a"], bolt: ["#fff47a"], cloud: ["#ffffff", "#e6f2f4", "#c0d4d8"]
  }, function (ph) {
    var a = ph * TAU2, f = sin(a) * 2.5, bo = (ph * 4 | 0) % 2;
    var S = [
      rgP([[3, 11 + f], [15, 15], [15, 28], [1, 24 + f]], "dark", { line: true }),
      rgP([[43, 11 + f], [31, 15], [31, 28], [45, 24 + f]], "dark", { line: true }),
      rgC(19, 31, 18, 36, 0.9, 0.8, "beak"), rgC(27, 31, 28, 36, 0.9, 0.8, "beak"),
      rgE(23, 22.5, 10.5, 11.5, 0, "feather", { line: true })
    ];
    [[20, 21], [26, 21], [23, 25], [19.5, 28], [26.5, 28]].forEach(function (p) { S.push(rgP([[p[0] - 1, p[1]], [p[0], p[1] + 1.5], [p[0] + 1, p[1]]], "dark", { flat: true })); });
    S.push(rgE(23, 11, 9.5, 7.5, 0, "feather", { line: true }));
    S.push(rgP([[14, 6.5], [14.5, 0.5], [18.5, 5]], "feather", { line: true }), rgP([[32, 6.5], [31.5, 0.5], [27.5, 5]], "feather", { line: true }));
    S.push(rgE(19.3, 11.3, 3.8, 3.6, 0, "disc", { flat: true }), rgE(26.7, 11.3, 3.8, 3.6, 0, "disc", { flat: true }));
    S.push(rgE(19.5, 11.3, 2.1, 2.1, 0, "eye", { flat: true }), rgE(19.7, 11.4, 1.1, 1.1, 0, "ink", { flat: true }));
    S.push(rgE(26.5, 11.3, 2.1, 2.1, 0, "eye", { flat: true }), rgE(26.7, 11.4, 1.1, 1.1, 0, "ink", { flat: true }));
    S.push(rgP([[22, 13], [24, 13], [23, 16.5]], "beak", { line: true }));
    S.push(rgP([[5 + bo, 14], [9, 17.5], [7, 18], [11, 23], [6, 18.5], [8, 18]], "bolt", { flat: true }));
    S.push(rgP([[41 - bo, 14], [37, 17.5], [39, 18], [35, 23], [40, 18.5], [38, 18]], "bolt", { flat: true }));
    S.push(rgE(17, 3.2 + f * 0.2, 3.2, 1.8, 0, "cloud"), rgE(23, 2.4, 3.8, 2.2, 0, "cloud"), rgE(29, 3.2 - f * 0.2, 3.2, 1.8, 0, "cloud"));
    return S;
  }, 4, { ns: 2.2 });
  SPRITES.mg_racines = rigSprite(60, 48, {
    bark: ["#a4825a", "#6b4c30", "#4f3620", "#352414"], root: ["#94724c", "#5e4228", "#44301c", "#2c2012"], moss: MOSS,
    hollow: ["#1e1612"], eye: ["#9cf06a"], groove: ["#352414"]
  }, function (ph) {
    var a = ph * TAU2, sw = sin(a) * 2, S = [];
    [[22, 34, 6, 46], [26, 36, 15, 47], [30, 37, 28, 47.5], [34, 36, 42, 47], [38, 34, 54, 46], [30, 33, 33 + sw, 47]].forEach(function (r, i) {
      var mx = (r[0] + r[2]) / 2 + sin(a + i) * 1.5, my = (r[1] + r[3]) / 2 + 2;
      S.push(rgC(r[0], r[1], mx, my, 3.2, 2.4, "root", { line: i > 3 }), rgC(mx, my, r[2], r[3], 2.4, 1.2, "root"));
    });
    S.push(rgC(20, 15, 10, 4 + sw, 2.6, 1.2, "bark"), rgC(13, 8 + sw * 0.6, 6, 9 + sw, 1.2, 0.8, "bark"));
    S.push(rgE(30, 24, 13.5, 15, 0, "bark", { line: true }));
    [[23, 13, 22, 34], [37, 12, 38, 33], [30, 28, 30, 37]].forEach(function (g) { S.push(rgC(g[0], g[1], g[2], g[3], 0.5, 0.5, "groove", { flat: true })); });
    S.push(rgC(40, 15, 50, 3 - sw, 2.6, 1.2, "bark", { line: true }), rgC(47, 7 - sw * 0.6, 54, 7.5 - sw, 1.2, 0.8, "bark"));
    S.push(rgE(30, 19, 6.3, 5.3, 0, "hollow", { flat: true }));
    S.push(rgE(27.5, 18, 1.5, 1.3, 0, "eye", { flat: true }), rgE(32.5, 18, 1.5, 1.3, 0, "eye", { flat: true }));
    S.push(rgC(28, 21.8, 32, 21.8, 0.5, 0.5, "eye", { flat: true }));
    S.push(rgE(30, 8.5, 10, 4.3, 0, "moss", { line: true }), rgE(9.5, 4 + sw, 4, 2.5, 0, "moss", { line: true }), rgE(50.5, 3 - sw, 4, 2.5, 0, "moss", { line: true }));
    S.push(rgE(25, 6.5, 1, 0.8, 0, "eye", { flat: true }), rgE(35, 7, 1, 0.8, 0, "eye", { flat: true }));
    return S;
  }, 4, { ns: 2.8 });
  SPRITES.mg_brochet = rigSprite(58, 26, {
    body: ["#eefaff", "#a8d8f0", "#78a8c8", "#4a7898"], belly: ["#ffffff", "#eef6fa", "#c8dce8"], fin: ["#bfe6f6", "#8ac0dc", "#5e94b4", "#3e6a88"],
    ice: ["#e8fbff"], ice2: ["#bfefff"], bar: ["#5e8eae"], eye: ["#ffe07a"], ink: ["#14283a"], teeth: ["#ffffff"]
  }, function (ph) {
    var a = ph * TAU2, w = sin(a) * 2, jaw = (sin(a) + 1) * 1.1, S = [];
    S.push(rgP([[1, 5 + w], [10, 11], [10, 14.5], [1, 21 + w]], "fin", { line: true }));
    S.push(rgP([[13, 16], [10, 22], [17, 17.5]], "fin"));
    S.push(rgE(27, 13, 18.5, 6.8, 0, "body", { line: true }));
    S.push(rgE(31, 16.5, 13.5, 2.8, 0, "belly"));
    [16, 21, 26, 31].forEach(function (x) { S.push(rgC(x, 8, x - 1, 16, 0.55, 0.45, "bar", { flat: true })); });
    for (var i = 0; i < 6; i++) { var x = 14 + i * 4.2, h = 4 + (i % 3); S.push(rgP([[x - 1.8, 7.2], [x + 0.6, 7 - h], [x + 1.8, 7]], i % 2 ? "ice" : "ice2", { flat: true })); }
    S.push(rgP([[30, 17], [27, 23.5], [34, 18.5]], "fin", { line: true }));
    S.push(rgC(43, 16, 55, 15.5 + jaw, 2, 1, "body", { line: true }));
    S.push(rgE(46, 12, 8.5, 5, 0, "body", { line: true }));
    S.push(rgC(46, 13.5, 57, 13.2, 1.8, 0.9, "body"));
    for (i = 0; i < 4; i++) S.push(rgP([[47 + i * 2.4, 14.3], [48 + i * 2.4, 15.8 + jaw * 0.4], [49 + i * 2.4, 14.3]], "teeth", { flat: true }));
    S.push(rgE(46.5, 10, 1.6, 1.6, 0, "eye", { flat: true }), rgE(46.9, 10.1, 0.8, 0.9, 0, "ink", { flat: true }));
    return S;
  }, 4, { ns: 2.8 });
  SPRITES.mg_phenix = rigSprite(48, 38, {
    body: ["#ffe07a", "#ff9a3a", "#d8572a", "#a8301a"], wing: ["#ffc04a", "#ff7a2a", "#c8401e", "#8a2414"], flame: ["#ffe88a"], flame2: ["#ff5a1a"],
    beak: ["#f6c23a", "#c8941a"], eye: ["#ffffff"], ink: ["#2a0a04"]
  }, function (ph) {
    var a = ph * TAU2, f = sin(a) * 4, fi = ph * 4 | 0, S = [];
    for (var i = 0; i < 3; i++) S.push(rgC(16, 24, 2 + i * 2, 32 + i * 2 - sin(a + i) * 2, 1.8, 0.6, i % 2 ? "flame2" : "wing", { flat: i === 1 }));
    S.push(rgP([[20, 18], [6, 4 - f], [10, 12 - f * 0.5], [3, 14 - f * 0.4], [12, 20], [18, 24]], "wing", { line: true }));
    S.push(rgE(23, 21, 8.5, 7.5, -0.15, "body", { line: true }));
    S.push(rgC(21, 27, 20, 33, 0.8, 0.6, "beak"), rgC(25, 27, 26, 33, 0.8, 0.6, "beak"));
    S.push(rgP([[25, 17], [42, 3 - f], [38, 11 - f * 0.5], [46, 12 - f * 0.4], [36, 20], [28, 24]], "wing", { line: true }));
    S.push(rgE(30, 12, 5.2, 4.6, 0, "body", { line: true }));
    for (i = 0; i < 3; i++) S.push(rgP([[27 + i * 2, 8.5], [26 + i * 2.6, 2 - ((i + fi) % 2) * 1.5], [29 + i * 2, 8]], (i + fi) % 2 ? "flame" : "flame2", { flat: true }));
    S.push(rgP([[34, 11.2], [39, 12.6], [34, 14.2]], "beak", { line: true }));
    S.push(rgE(31.5, 11, 1.1, 1.1, 0, "eye", { flat: true }), rgE(31.8, 11.1, 0.55, 0.6, 0, "ink", { flat: true }));
    [[10, 8], [40, 8], [8, 16], [43, 15]].forEach(function (p, k) { if ((k + fi) % 2) S.push(rgE(p[0], p[1] - f * 0.5, 0.8, 0.8, 0, "flame", { flat: true })); });
    return S;
  }, 4, { ns: 3.2, flying: true });
  SPRITES.mg_aigle = rigSprite(48, 34, {
    brown: ["#a8784a", "#7a5232", "#5a3a22", "#3e2614"], wing: ["#8e623c", "#664428", "#4a301a", "#321e10"], head: ["#ffffff", "#f0ece4", "#d0c8bc", "#a8a094"],
    beak: ["#ffe07a", "#f2c230", "#c8941a"], ink: ["#1b1226"], eye: ["#ffd05a"], tip: ["#2a1a10"]
  }, function (ph) {
    var a = ph * TAU2, f = sin(a) * 4, S = [];
    S.push(rgP([[9, 22], [15, 24], [14, 31], [8, 30]], "wing"));
    S.push(rgP([[20, 15], [2, 6 - f], [4, 12 - f * 0.6], [1, 15 - f * 0.4], [6, 19], [17, 23]], "wing", { line: true }));
    S.push(rgC(4, 9 - f * 0.8, 1.5, 15 - f * 0.4, 0.7, 0.7, "tip", { flat: true }));
    S.push(rgE(22, 19, 8.5, 7, -0.2, "brown", { line: true }));
    S.push(rgC(20, 25, 19, 31, 1, 0.8, "beak"), rgC(24, 25, 25, 31, 1, 0.8, "beak", { line: true }));
    S.push(rgP([[25, 14], [44, 4 - f], [42, 11 - f * 0.6], [47, 13 - f * 0.4], [40, 18], [28, 22]], "wing", { line: true }));
    S.push(rgC(44, 6 - f * 0.8, 47, 12.5 - f * 0.4, 0.7, 0.7, "tip", { flat: true }));
    S.push(rgE(30, 10.5, 5.5, 4.8, 0, "head", { line: true }));
    S.push(rgP([[33.5, 9], [38.5, 10], [38, 13], [35.5, 12.6], [33.5, 12.5]], "beak", { line: true }));
    S.push(rgE(31.8, 9.3, 1, 0.9, 0, "eye", { flat: true }), rgE(32.1, 9.4, 0.5, 0.5, 0, "ink", { flat: true }));
    S.push(rgC(29.5, 8.2, 33, 8.4, 0.35, 0.35, "ink", { flat: true }));
    return S;
  }, 4, { ns: 3, flying: true });

  // les boss pointent sur leurs sprites dessinés
  [["castor", "bs_castor"], ["heron", "bs_heron"], ["silure", "bs_silure"], ["ours", "bs_ours"], ["sala_g", "bs_sala_g"], ["corbeau", "bs_corbeau"],
   ["pivert", "bs_pivert"], ["scolo", "bs_scolo"], ["reine_f", "bs_reine_f"], ["colosse", "mg_colosse"], ["mere", "mg_mere"], ["brasier", "mg_brasier"],
   ["tempete", "mg_tempete"], ["racines_m", "mg_racines"], ["brochet", "mg_brochet"], ["phenix", "mg_phenix"], ["aigle", "mg_aigle"]].forEach(function (p) {
    var e = ENEMIES[p[0]]; if (!e) return;
    var sp = SPRITES[p[1]]; if (!sp.ns) sp.ns = e.scale || 1;
    e.sprite = p[1]; delete e.tint;
  });

  // les 7 boss d'origine : volume en 3 tons (bord haut éclairci, bord bas assombri)
  function autoShade(def) {
    var pal = {}, k, map = {}, CH = "0123456789@#$%&*+=?!";
    for (k in def.pal) pal[k] = def.pal[k];
    var ci = 0;
    function lum(c) { var v = hx(c); return (v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11) / 255; }
    function variant(ch, up) {
      var key = ch + (up ? "+" : "-");
      if (!map[key]) { var c = def.pal[ch]; map[key] = CH[ci++]; pal[map[key]] = up ? mixc(c, "#ffffff", 0.22) : mixc(c, "#000000", 0.24); }
      return map[key];
    }
    def.frames = def.frames.map(function (rows) {
      return rows.map(function (row, y) {
        return row.split("").map(function (ch, x) {
          if (ch === "." || !def.pal[ch] || lum(def.pal[ch]) < 0.18 || ci > CH.length - 2) return ch;
          var up = y === 0 || (rows[y - 1][x] || ".") === ".", dn = y === rows.length - 1 || (rows[y + 1][x] || ".") === ".";
          if (up && !dn) return variant(ch, true);
          if (dn && !up) return variant(ch, false);
          return ch;
        }).join("");
      });
    });
    def.pal = pal;
  }
  ["boar", "owl", "queen", "stag", "mushking", "bigmole", "golem"].forEach(function (n) { if (SPRITES[n]) autoShade(SPRITES[n]); });

  // bêta 2.0 : Survie solo et 3 écureuils seulement ; les quêtes qui demandent un autre mode ou un écureuil retiré
  // disparaissent et leur contenu devient libre
  var V2_DROP = { q_arene: 1, q_donjon: 1, q_coopboss: 1, q_releve: 1, q_releve1: 1, q_druide: 1, q_bucheron: 1, q_ninja: 1, q_mage: 1, q_chevalier: 1, q_intouchable: 1, q_duo10: 1, q_seul: 1, q_coopboss: 1 };
  QUESTS = QUESTS.filter(function (q) { return !V2_DROP[q.id]; });
  [ITEMS].forEach(function (l) { l.forEach(function (x) { if (V2_DROP[x.quest]) delete x.quest; }); });
  [WEAPONS, PASSIVES, FUSIONS].forEach(function (o) { Object.keys(o).forEach(function (k) { if (V2_DROP[o[k].quest]) delete o[k].quest; }); });

  return { EVENTS: EVENTS, EXDEF2: EXDEF2, MODS2: MODS2, STRATA: STRATA, SQUADS_MAP: SQUADS_MAP, ARENA_BOSSES: ARENA_BOSSES, TFUS2: TFUS2, SETS: SETS, CAMP: CAMP, NIGHTMARE: NIGHTMARE, RES: RES, MAP_RES: MAP_RES, SLOTS: SLOTS, GEAR: GEAR, ELEM_TIERS: ELEM_TIERS, TAL_COMMON: TAL_COMMON, TAL: TAL, TAL_LVL: TAL_LVL, MASTERY: MASTERY, SIGS: SIGS, ULTS: ULTS, ROLES: ROLES, SQUADS: SQUADS, ELEMENTS: ELEMENTS, REACTIONS: REACTIONS, TECH: TECH, ARMES: ARMES, TFUS: TFUS, COMBOS: COMBOS, LEGENDS: LEGENDS, V2: V2, POSTURES: POSTURES, RAGE: RAGE, DUNGEONS: DUNGEONS, QUESTS: QUESTS, TIERS: TIERS, TIER: TIER, SHRINES: SHRINES, ITEMS: ITEMS, RARITIES: RARITIES, AFFIXES: AFFIXES, DUNGEON: DUNGEON, RELICS: RELICS, ARENA: ARENA, PRESTIGE_SHOP: PRESTIGE_SHOP, SKILLS: SKILLS, SKILL_BRANCHES: SKILL_BRANCHES, PRESTIGE: PRESTIGE, rankNeed: rankNeed, SPRITES: SPRITES, CHARACTERS: CHARACTERS, WEAPONS: WEAPONS, FUSIONS: FUSIONS, PASSIVES: PASSIVES, LOOT: LOOT, MAPS: MAPS,
           SHOP: SHOP, ACHIEVEMENTS: ACHIEVEMENTS, ENEMIES: ENEMIES, DIFFICULTIES: DIFFICULTIES };
})();
