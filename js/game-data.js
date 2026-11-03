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

  var SPRITES = {
    /* --- écureuils jouables --- */
    sq_pip: { pal: { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430", s: "#3a7ad8", S: "#8ac0ff" }, frames: [PIP_TOP.concat([LEGS_A]), PIP_TOP.concat([LEGS_B])] },
    sq_pop: { pal: { t: "#f6c27a", d: "#c0703a", o: "#f0a060", c: "#fdf3de", k: "#2b1709", n: "#6b4430", b: "#e84a8a", B: "#ffb0d0" }, frames: [POP_TOP.concat([LEGS_A]), POP_TOP.concat([LEGS_B])] },
    sq_chevalier: { pal: { t: "#e0c49a", d: "#8a6a48", o: "#c49a6a", c: "#fdf3de", k: "#1b1226", n: "#5a4030", h: "#8a929a", H: "#c0c8d0", S: "#3a5aa8", Y: "#f6d36b" }, frames: [KNIGHT_TOP.concat([LEGS_A]), KNIGHT_TOP.concat([LEGS_B])] },
    sq_mage: { pal: { t: "#b0a0c8", d: "#5a4a78", o: "#8a7aa8", c: "#efe6ff", k: "#1b1226", n: "#3a2a58", p: "#4a3a9a", y: "#f6d36b", w: "#8a5a3b" }, frames: [WIZ_TOP.concat([LEGS_A]), WIZ_TOP.concat([LEGS_B])] },
    sq_bucheron: { pal: { t: "#d88a4a", d: "#8a4a20", o: "#c06a30", c: "#fdf3de", k: "#2b1709", n: "#5a3018", r: "#c8282a", R: "#2b1709", a: "#c0c8d0", h: "#8a5a3b" }, frames: [LUMB_TOP.concat([LEGS_A]), LUMB_TOP.concat([LEGS_B])] },
    sq_ninja: { pal: { t: "#4a4a5a", d: "#1e1b26", o: "#38384a", c: "#6a6a7a", k: "#1e1b26", w: "#fdf3de", n: "#1e1b26", r: "#d0281a" }, frames: [NIN_TOP.concat([LEGS_A]), NIN_TOP.concat([LEGS_B])] },
    sq_druide: { pal: { t: "#c8a070", d: "#6b4a28", o: "#a07848", c: "#f3e1c0", k: "#2b1709", n: "#4a3018", l: "#4f8a40", f: "#f29ad8", y: "#f6d36b" }, frames: [DRU_TOP.concat([LEGS_A]), DRU_TOP.concat([LEGS_B])] },
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
    sq_noisette: squirrel({ t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" }),
    sq_cendrine: squirrel({ t: "#d6d1ca", d: "#6f6a64", o: "#9a958e", c: "#f3efe6", k: "#2b1709", n: "#4a4540" }),
    sq_charbon: squirrel({ t: "#57506a", d: "#1e1b26", o: "#38334a", c: "#8a8496", k: "#f6d36b", n: "#1e1b26" }),
    sq_flocon: squirrel({ t: "#ffffff", d: "#b8c8d8", o: "#e8eef5", c: "#ffffff", k: "#c8553d", n: "#f29a85" }),
    sq_planeur: { pal: { t: "#c9ae88", d: "#6b5a48", o: "#a08868", c: "#f3e1c0", k: "#2b1709", n: "#4a3a2a", m: "#8a7660" }, frames: [GLIDE_A, GLIDE_B], flying: true },
    sq_capitaine: { pal: { t: "#f2b05e", d: "#b85e2a", o: "#e06a2c", c: "#fdf3de", k: "#2b1709", n: "#6b4430", r: "#c8553d", w: "#fdf3de" },
                    frames: [CAP_TOP.concat([LEGS_A]), CAP_TOP.concat([LEGS_B])] },

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
    trefle: { name: "Trèfle", sprite: "clover", desc: "+20 % de chance de butin." },
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
    { id: "coeur", name: "Cœur de chêne", icon: "❤️", desc: "+30 PV max" },
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
    { id: "boss_3", name: "Trophée de chasse", desc: "Bats 3 boss en une partie.", gold: 300, check: function (r) { return r.bosses >= 3; } },
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
    { id: "coeur_chene", name: "Cœur de chêne", desc: "Survis 5 minutes en mode Difficile.", gold: 300, check: function (r) { return r.hard && r.time >= 300; } },
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
    { id: "griffes",  r: 0, icon: "🗡️", name: "Griffes aiguisées", desc: "+7 % de coups critiques." },
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
    { id: "lanterne", r: 1, solo: true, icon: "🏮", name: "Lanterne de l'ermite", desc: "SOLO · -15 % de recharge quand tes PV sont au-dessus de 80 %." },
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
    difficile: { name: "Difficile", hp: 1.6, spd: 1.1, spawn: 1.25, gold: 1.6, score: 1.5, unlock: "survie_5" },
  };

  return { RAGE: RAGE, DUNGEONS: DUNGEONS, QUESTS: QUESTS, TIERS: TIERS, TIER: TIER, SHRINES: SHRINES, ITEMS: ITEMS, RARITIES: RARITIES, AFFIXES: AFFIXES, DUNGEON: DUNGEON, RELICS: RELICS, ARENA: ARENA, PRESTIGE_SHOP: PRESTIGE_SHOP, SKILLS: SKILLS, SKILL_BRANCHES: SKILL_BRANCHES, PRESTIGE: PRESTIGE, rankNeed: rankNeed, SPRITES: SPRITES, CHARACTERS: CHARACTERS, WEAPONS: WEAPONS, FUSIONS: FUSIONS, PASSIVES: PASSIVES, LOOT: LOOT, MAPS: MAPS,
           SHOP: SHOP, ACHIEVEMENTS: ACHIEVEMENTS, ENEMIES: ENEMIES, DIFFICULTIES: DIFFICULTIES };
})();
