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
  ];

  /* =====================================================================
     Armes. type = comportement dans le moteur. Les tableaux = niveaux 1 à 5.
     ===================================================================== */
  var WEAPONS = {
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
      swarm: ["slug", "wasp", "spider", "beetle"], bosses: ["boar", "owl"],
      biomes: [
        { name: "Prairie", prop: "stump", ground: G_PRAIRIE,
          enemies: [["slug", 0, 4], ["beetle", 40, 4], ["wasp", 75, 3], ["bombshroom", 120, 2], ["fox", 300, 2]] },
        { name: "Sous-bois", prop: "stump", decor: "bush",
          ground: { base: "#5f8a48", patch: "#567f41", tuft: "#3f6b3a", hi: "#86b56c", flowers: ["#fdf3de", "#f6d36b", "#9cc56b", "#e2d6ff"], pebble: "#9a8f7a", pebbleDk: "#6f6655", shroom: "#c8553d", bush: "#3a5f34", bushHi: "#5b8a4a" },
          enemies: [["spider", 0, 4], ["beetle", 30, 3], ["crow", 60, 3], ["frog", 90, 3], ["toad", 220, 2]] },
        { name: "Champignonnière", prop: "lantern", decor: "bigshroom",
          ground: { base: "#7d7290", patch: "#73688a", tuft: "#5a4f6e", hi: "#a597b8", flowers: ["#f29ad8", "#e2d6ff", "#f6d36b", "#c8553d"], pebble: "#9a90a8", pebbleDk: "#6a6078", shroom: "#c8553d" },
          enemies: [["bombshroom", 0, 4], ["moth", 0, 3], ["slug", 0, 2], ["toad", 150, 2]] },
      ] },
    { id: "marais", name: "Marais brumeux", desc: "Tourbière, étang et roselière. Ennemis plus coriaces.", hp: 1.15, gold: 1.25, unlock: "survie_3",
      swarm: ["moth", "slug", "frog", "toad"], bosses: ["owl", "boar"],
      biomes: [
        { name: "Tourbière", prop: "basket", decor: "water",
          ground: { base: "#57735a", patch: "#4f6a52", tuft: "#33503a", hi: "#86a46a", flowers: ["#c9e3a0", "#e6f6fa", "#9ad0c4", "#f6d36b"], pebble: "#6f7a62", pebbleDk: "#4f5a48", shroom: "#9ad0c4", water: "#3d6b6e", waterHi: "#6fa8a8" },
          enemies: [["slug", 0, 4], ["moth", 25, 4], ["toad", 70, 3], ["hedgehog", 160, 3], ["badger", 300, 2]] },
        { name: "Étang", prop: "basket", decor: "pond",
          ground: { base: "#4a6f6a", patch: "#436661", tuft: "#2f5050", hi: "#7fa8a0", flowers: ["#e6f6fa", "#f29ad8", "#f6d36b", "#e6f6fa"], pebble: "#6f8a84", pebbleDk: "#4a6460", shroom: "#e6f6fa", water: "#2f5f70", waterHi: "#7fc0d0" },
          enemies: [["frog", 0, 4], ["moth", 0, 2], ["toad", 40, 3], ["crow", 200, 2]] },
        { name: "Roselière", prop: "basket", decor: "reeds",
          ground: { base: "#8a9a5a", patch: "#808f52", tuft: "#6b7a3a", hi: "#b8c87a", flowers: ["#f6d36b", "#fdf3de", "#c8553d", "#f2b05e"], pebble: "#a09a7a", pebbleDk: "#7a7458", shroom: "#c8553d", reed: "#6b5a30", reedHi: "#c9b070" },
          enemies: [["moth", 0, 3], ["hedgehog", 50, 3], ["spider", 80, 3], ["mole", 140, 2]] },
      ] },
    { id: "automne", name: "Bois d'automne", desc: "Bois roux, clairière dorée et terriers.", hp: 1.3, gold: 1.5, unlock: "boss_1",
      swarm: ["bunny", "fox", "wasp", "mole"], bosses: ["boar", "owl"],
      biomes: [
        { name: "Bois roux", prop: "leafpile", decor: "bush",
          ground: { base: "#b8833f", patch: "#ad7a3a", tuft: "#8a5a2b", hi: "#e8b25e", flowers: ["#c8553d", "#e8873a", "#f6d36b", "#8a5a3b"], pebble: "#9a8f7a", pebbleDk: "#6f6655", shroom: "#c8553d", bush: "#a0461f", bushHi: "#e8873a" },
          enemies: [["bunny", 0, 4], ["fox", 35, 4], ["hedgehog", 80, 3], ["wasp", 110, 3]] },
        { name: "Clairière dorée", prop: "leafpile",
          ground: { base: "#c9a24a", patch: "#bf9944", tuft: "#9a7a30", hi: "#f2d48a", flowers: ["#fdf3de", "#c8553d", "#f2b05e", "#fdf3de"], pebble: "#b0a080", pebbleDk: "#857858", shroom: "#c8553d" },
          enemies: [["bunny", 0, 4], ["wasp", 30, 3], ["bombshroom", 90, 2], ["crow", 180, 2]] },
        { name: "Terriers", prop: "stump", decor: "rock",
          ground: { base: "#8a6440", patch: "#7d5a3a", tuft: "#5a4030", hi: "#b08a60", flowers: ["#d39a52", "#f2b05e", "#8a5a3b", "#c8553d"], pebble: "#a09080", pebbleDk: "#6f6355", shroom: "#c8553d", rock: "#7a7068", rockHi: "#a89e94" },
          enemies: [["mole", 0, 4], ["fox", 0, 2], ["badger", 60, 3], ["hedgehog", 120, 2]] },
      ] },
    { id: "nuit", name: "Nuit des lucioles", desc: "Forêt noire, clairière lunaire et souches mortes. Rapporte deux fois plus.", hp: 1.5, gold: 2, unlock: "survie_10", night: true,
      swarm: ["moth", "crow", "bombshroom", "fox"], bosses: ["owl", "boar"],
      biomes: [
        { name: "Forêt noire", prop: "lantern", decor: "bush",
          ground: { base: "#264634", patch: "#22402f", tuft: "#1b3326", hi: "#3f6b3a", flowers: ["#7fd1c7", "#c9b3ff", "#f2d48a", "#7fd1c7"], pebble: "#4b5a52", pebbleDk: "#33403a", shroom: "#7fd1c7", bush: "#16291e", bushHi: "#2f4f3a" },
          enemies: [["moth", 0, 4], ["spider", 25, 4], ["crow", 60, 3], ["fox", 100, 3]] },
        { name: "Clairière lunaire", prop: "lantern",
          ground: { base: "#2f4458", patch: "#2a3e50", tuft: "#22323f", hi: "#5f7a94", flowers: ["#e6f6fa", "#c9b3ff", "#7fd1c7", "#f2d48a"], pebble: "#5a6a7a", pebbleDk: "#3a4858", shroom: "#7fd1c7" },
          enemies: [["moth", 0, 3], ["frog", 40, 3], ["bombshroom", 80, 3], ["badger", 150, 2]] },
        { name: "Souches mortes", prop: "stump", decor: "rock",
          ground: { base: "#3a3236", patch: "#332c30", tuft: "#28222a", hi: "#5a4f58", flowers: ["#c9b3ff", "#7fd1c7", "#f29ad8", "#c9b3ff"], pebble: "#5a5058", pebbleDk: "#3a3238", shroom: "#7fd1c7", rock: "#4a4248", rockHi: "#6a6068" },
          enemies: [["crow", 0, 3], ["bombshroom", 30, 3], ["mole", 60, 3], ["toad", 200, 2]] },
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
  };

  var DIFFICULTIES = {
    normal: { name: "Normal", hp: 1, spd: 1, spawn: 1, gold: 1, score: 1 },
    difficile: { name: "Difficile", hp: 1.6, spd: 1.1, spawn: 1.25, gold: 1.6, score: 1.5, unlock: "survie_5" },
  };

  return { ARENA: ARENA, PRESTIGE_SHOP: PRESTIGE_SHOP, SKILLS: SKILLS, SKILL_BRANCHES: SKILL_BRANCHES, PRESTIGE: PRESTIGE, rankNeed: rankNeed, SPRITES: SPRITES, CHARACTERS: CHARACTERS, WEAPONS: WEAPONS, FUSIONS: FUSIONS, PASSIVES: PASSIVES, LOOT: LOOT, MAPS: MAPS,
           SHOP: SHOP, ACHIEVEMENTS: ACHIEVEMENTS, ENEMIES: ENEMIES, DIFFICULTIES: DIFFICULTIES };
})();
