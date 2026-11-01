/* =========================================================================
   Écureuil Survivor — données du jeu (modifiable à la main)
   Sprites : une lettre = une couleur de la palette, "." = transparent.
   Le contour sombre est ajouté automatiquement.
   ========================================================================= */
window.ES_DATA = (function () {
  "use strict";

  /* ---------- sprites ---------- */
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
  var FOX_TOP = [
    "............o..o.",
    "...........ooooo.",
    "...........ookoo.",
    "...........ooocck",
    "ww.........occc..",
    "wwo......oooo....",
    ".ooo...ooooooo...",
    "..oooooooooooo...",
    "...ooooooccooo...",
    ".....oooooooo....",
  ];
  var HOG_TOP = [
    "....s.s.s.......",
    "..sSsSsSsS......",
    ".sSsSsSsSsSs....",
    "sSsSsSsSsSsSf...",
    "sSsSsSsSsSsfkf..",
    "sSsSsSsSsSfffffn",
    ".sSsSsSsSffff...",
    "..ffffffffff....",
  ];
  var BUN_TOP = [
    "..........gg.gg.",
    "..........gp.gp.",
    "..........gp.gp.",
    "..........gggggg",
    "..........ggkggg",
    "..........gggggp",
    "..w....gggggg...",
    ".www.ggggggggg..",
    "..wgggggggGGg...",
    "...ggggggGGgg...",
  ];
  var BAD_TOP = [
    "..........kwk....",
    ".........kwkwkk..",
    "..ggggggkwkwkwk..",
    ".gGGGGGGkkwkwkwkn",
    "gGGGGGGGGkkwwwwk.",
    "gGGGGGGGGGkkkk...",
    ".gGGGGGGGGGGgg...",
    "..gggggggggggg...",
  ];
  var MOTH_A = [
    ".....k....k.....",
    "......k..k......",
    "..ww...bb...ww..",
    ".wWWw..bb..wWWw.",
    "wWeWWw.bb.wWWeWw",
    "wWWWWWwbbwWWWWWw",
    ".wWWWWwbbwWWWWw.",
    "..wWWw.bb.wWWw..",
    "...ww..bb..ww...",
  ];
  var MOTH_B = [
    ".....k....k.....",
    "......k..k......",
    ".......bb.......",
    "....ww.bb.ww....",
    "...wWWwbbwWWw...",
    "...wWeWbbWeWw...",
    "...wWWwbbwWWw...",
    "....ww.bb.ww....",
    ".......bb.......",
  ];

  var SPRITES = {
    squirrel: { pal: { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" },
                frames: [SQ_TOP.concat(["......dd..dd...."]), SQ_TOP.concat([".....dd....dd..."])] },
    fox: { pal: { o: "#e06a2c", c: "#fdf3de", w: "#fdf3de", k: "#2b1709" },
           frames: [FOX_TOP.concat([".....kk....kk...."]), FOX_TOP.concat(["....kk......kk..."])] },
    hedgehog: { pal: { s: "#6b4430", S: "#a06a3e", f: "#f0d2a8", k: "#2b1709", n: "#2b1709" },
                frames: [HOG_TOP.concat(["...kk....kk....."]), HOG_TOP.concat(["..kk......kk...."])] },
    bunny: { pal: { g: "#d8c2a0", G: "#b89c78", p: "#f29a85", w: "#fdf3de", k: "#2b1709" },
             frames: [BUN_TOP.concat(["....kk.....kk..."]), BUN_TOP.concat(["...kk.......kk.."])] },
    badger: { pal: { g: "#8d8a86", G: "#6b6966", k: "#24221f", w: "#f3efe6", n: "#2b1709" },
              frames: [BAD_TOP.concat(["..kk..kk..kk.kk.."]), BAD_TOP.concat([".kk..kk....kk.kk."])] },
    moth: { pal: { w: "#c9b3ff", W: "#e9dcff", e: "#7a5ab8", b: "#6b4430", k: "#2b1709" }, frames: [MOTH_A, MOTH_B], flying: true },

    slug: { pal: { g: "#d9cf63", h: "#a39a3c", k: "#1f3a2b", e: "#1f3a2b" }, frames: [
      [".k...k......", ".h...h......", "..h.h.......", ".gggg.......", "gegggg......", "gggggggggg..", ".ggggggggggg", "..hhhhhhhhh."],
      ["..k...k.....", "..h...h.....", "...h.h......", ".gggg.......", "gegggg......", "ggggggggg...", ".gggggggggg.", "..hhhhhhhh.."]] },
    beetle: { pal: { b: "#6a4c93", B: "#a88ad8", k: "#1b1226" }, frames: [
      ["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", ".bBbbbbBb.", "kbbbbbbbbk", ".bbBbbBbb.", "kbbbbbbbbk", "..bbbbbb..", "...b..b..."],
      ["..k....k..", "...k..k...", "...kkkk...", "..bbbbbb..", "kbBbbbbBbk", ".bbbbbbbb.", "kbbBbbBbbk", ".bbbbbbbb.", "..bbbbbb..", "..b....b.."]] },
    wasp: { pal: { y: "#f2c230", k: "#2b1709", w: "#e6f6fa", s: "#2b1709" }, frames: [
      ["..ww.ww...", "..ww.ww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."],
      [".........", ".wwwwww...", ".yykyykyy.", "kyykyykyys", ".yykyykyy."]], flying: true },
    crow: { pal: { k: "#24243a", g: "#4a4a6a", o: "#e8873a", e: "#fdf3de" }, frames: [
      ["......kkk...", ".....kkekk..", "kk..kkkkkoo.", "kkkkkgggkk..", ".kkgggggkk..", "..kkkkkkk...", "....o..o...."],
      ["kk....kkk...", ".kk..kkekk..", "..kkkkkkkoo.", "...kgggkkk..", "...kgggkk...", "..kkkkkkk...", "....o..o...."]], flying: true },
    toad: { pal: { G: "#6f8a34", g: "#9cae4f", y: "#e9d68a", k: "#1f2a14", e: "#f2c230" }, frames: [
      ["...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGGGGGGGGGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", ".GyyyyyyyyyyG.", "GG.GG....GG.GG"],
      ["..............", "...kk....kk...", "..keek..keek..", ".gGGGGGGGGGGg.", "gGGGgGGGgGGGGg", "gGkkkkkkkkkkGg", "GGyyyyyyyyyyGG", "GGyyyyyyyyyyGG", ".GG.GG..GG.GG."]] },
    spider: { pal: { l: "#9a7aa8", p: "#5a3a62", P: "#7a5288", r: "#e8735a" }, frames: [
      ["l.......l", ".l.....l.", "..lpppl..", "llpPpPpll", "..pprpp..", "llpppppll", "..lpppl..", ".l.....l.", "l.......l"],
      [".l.....l.", "l.......l", "..lpppl..", ".lpPpPpl.", "l.pprpp.l", ".lpppppl.", "l.lpppl.l", "..l...l..", "........."]] },
    boar: { pal: { b: "#6b4430", B: "#8f6243", k: "#2b1709", w: "#fdf3de", p: "#c8553d", e: "#f2c230" }, frames: [
      ["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "..bb.bb....bb.bb....", "..kk.kk....kk.kk...."],
      ["........kk.kk.......", "......bbbbbbbbb.....", "...bbbbbbbbbbbbbb...", "..bbBBbbbbbbbbbbbb..", ".bbBBBBbbbbbbbbbebb.", ".bbBBBBBbbbbbbbbbbpp", "bbbBBBBBBbbbbbbbbppp", "bbbBBBBBBbbbbbbbwppp", ".bbbBBBBbbbbbbbbw.p.", ".bbbbbbbbbbbbbbb....", "..bbbbbbbbbbbbbb....", "...bb.bb..bb.bb.....", "...kk.kk..kk.kk....."]] },
    owl: { pal: { b: "#7a6a8a", B: "#a597b8", w: "#fdf3de", y: "#f2c230", k: "#1b1226", o: "#e8873a" }, frames: [
      ["..k........k..", "..bb......bb..", "..bbbbbbbbbb..", ".bwwwbbbbwwwb.", ".bwykwbbwykwb.", ".bwwwbo.bwwwb.", "bbbbbbobbbbbbb", "bBbBbBbBbBbBbb", "bbBbBbBbBbBbBb", ".bBbBbBbBbBbb.", "..bbbbbbbbbb..", "...oo....oo..."],
      ["..k........k..", "..bb......bb..", "..bbbbbbbbbb..", ".bwwwbbbbwwwb.", ".bwkywbbwkywb.", ".bwwwbo.bwwwb.", "bbbbbbobbbbbbb", "bBbBbBbBbBbBbb", "bbBbBbBbBbBbBb", ".bBbBbBbBbBbb.", "..bbbbbbbbbb..", "...oo....oo..."]] },

    nut: { pal: { c: "#6b4430", n: "#a06a3e", N: "#c98d4a" }, frames: [[".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."]] },
    bignut: { pal: { c: "#4a6f8a", n: "#5fa3c9", N: "#a8e0f5" }, frames: [[".cc..", "ccccc", "nNNNn", "nNNNn", ".nnn."]] },
    gold: { pal: { c: "#a8741a", n: "#e0a82a", N: "#ffe27a" }, frames: [[".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."]] },
    berry: { pal: { r: "#c8553d", R: "#f29a85", g: "#5b8a4a" }, frames: [["..g..", ".rgr.", "rRrrr", "rrrrr", ".rrr."]] },
    chest: { pal: { b: "#6b4430", B: "#a06a3e", k: "#3a2618", y: "#f2c230" }, frames: [["..bbbbbb..", ".bBBBBBBb.", "bBBBBBBBBb", "kkkkyykkkk", "bBBByyBBBb", "bBBBBBBBBb", "bbbbbbbbbb"]] },
    magnet: { pal: { r: "#c8553d", w: "#fdf3de", k: "#2b1709" }, frames: [["rr..rr", "rr..rr", "rr..rr", "rrrrrr", ".rrrr.", "ww..ww"]] },
    acorn: { pal: { n: "#6b4430", N: "#8a5a3b", c: "#d39a52" }, frames: [[".nnn.", "nNNNn", ".ccc.", ".ccc.", "..c.."]] },
    pinecone: { pal: { p: "#6b4430", P: "#b07a4f" }, frames: [["..p..", ".pPp.", "pPpPp", ".pPp.", "pPpPp", ".pPp."]] },
    mushroom: { pal: { r: "#c8553d", w: "#fdf3de", s: "#f3e1c0" }, frames: [["..rrrr..", ".rrwrrr.", "rrrrrwrr", "rwrrrrrr", "..ssss..", "..ssss.."]] },
    leaf: { pal: { l: "#9cc56b", L: "#3f6b3a" }, frames: [["...lL", ".llL.", "lLll.", "Lll..", "L...."], ["L....", "Lll..", "lLll.", ".llL.", "...lL"]] },
    spore: { pal: { p: "#9a7fd1", P: "#e2d6ff" }, frames: [[".p.", "pPp", ".p."]] },
    feather: { pal: { w: "#fdf3de", f: "#8fb8d8", k: "#4a6f8a" }, frames: [["....wk", "...wfk", "..wfk.", ".wfk..", "wk....", "k....."], ["k.....", "wk....", ".wfk..", "..wfk.", "...wfk", "....wk"]] },
    firefly: { pal: { w: "#e6f6fa", k: "#2b1709", y: "#f6ef7a", Y: "#fffbd0" }, frames: [["w.w..", ".wkk.", "..kyy", "...yY"]] },
    tail: { pal: { t: "#f2b05e", d: "#b85e2a" }, frames: [["..tt..", ".tttt.", "ttdttt", "ttd.tt", ".td.t.", "..d..."]] },
  };

  /* ---------- personnages ---------- */
  // mods : hp (PV en plus), speed/might/magnet/cd/xp (fraction), armor (points)
  var CHARACTERS = [
    { id: "noisette", name: "Noisette", animal: "Écureuil", sprite: "squirrel", weapon: "gland",
      desc: "Équilibrée et têtue. Lance des glands sur tout ce qui bouge.", mods: {} },
    { id: "roussette", name: "Roussette", animal: "Renarde", sprite: "fox", weapon: "queue",
      desc: "Rapide mais fragile. Balaye tout d'un coup de queue.", mods: { speed: 0.15, hp: -15, might: 0.05 },
      unlock: "survie_3", price: 300 },
    { id: "piquant", name: "Piquant", animal: "Hérisson", sprite: "hedgehog", weapon: "feuilles",
      desc: "Lent mais blindé. Fait tourbillonner les feuilles mortes.", mods: { armor: 2, hp: 25, speed: -0.1 },
      unlock: "tueur_500", price: 400 },
    { id: "pimprenelle", name: "Pimprenelle", animal: "Lapine", sprite: "bunny", weapon: "champi",
      desc: "Toujours pressée. Ramasse tout de très loin.", mods: { speed: 0.22, magnet: 0.5, hp: -20 },
      unlock: "niveau_20", price: 500 },
    { id: "grumpf", name: "Grumpf", animal: "Blaireau", sprite: "badger", weapon: "pomme",
      desc: "Costaud et ronchon. Ses pommes de pin font très mal.", mods: { hp: 50, might: 0.15, speed: -0.15 },
      unlock: "boss_1", price: 700 },
    { id: "phalene", name: "Phalène", animal: "Papillon de nuit", sprite: "moth", weapon: "spores",
      desc: "Vole au-dessus de la mêlée. Apprend vite, recharge vite.", mods: { cd: 0.1, xp: 0.2, hp: -10 },
      unlock: "survie_10", price: 900 },
  ];

  /* ---------- armes (niveaux 1 à 5) ---------- */
  var WEAPONS = {
    gland: { name: "Glands", icon: "acorn",
      desc: ["Lance un gland sur l'ennemi le plus proche.", "+1 gland à chaque tir.", "+50 % de dégâts.", "+1 gland, transperce un ennemi de plus.", "Tire bien plus vite."],
      count: [1, 2, 2, 3, 3], dmg: [11, 11, 16, 16, 19], pierce: [1, 1, 1, 2, 2], cd: [0.75, 0.75, 0.75, 0.7, 0.5] },
    queue: { name: "Coup de queue", icon: "tail",
      desc: ["Un grand coup de queue devant toi qui repousse tout.", "+40 % de dégâts.", "Frappe des deux côtés.", "Coup plus large.", "Plus fréquent et plus fort."],
      dmg: [15, 21, 21, 25, 32], r: [25, 25, 25, 32, 34], both: [0, 0, 1, 1, 1], cd: [1.4, 1.4, 1.3, 1.2, 0.95] },
    champi: { name: "Champignons gardiens", icon: "mushroom",
      desc: ["2 champignons tournent autour de toi.", "+1 champignon.", "Cercle plus grand, +dégâts.", "+1 champignon.", "+1 champignon, tournent plus vite."],
      n: [2, 3, 3, 4, 5], R: [24, 24, 30, 30, 32], dmg: [8, 8, 11, 11, 13], spd: [2.6, 2.6, 2.8, 2.8, 3.5] },
    feuilles: { name: "Tourbillon de feuilles", icon: "leaf",
      desc: ["Des feuilles tranchantes partent tout autour.", "+1 feuille.", "+dégâts, transpercent plus.", "+1 feuille.", "+2 feuilles, plus fréquent."],
      n: [4, 5, 5, 6, 8], dmg: [9, 9, 12, 12, 14], pierce: [2, 2, 3, 3, 3], cd: [2.0, 2.0, 2.0, 1.8, 1.4] },
    pomme: { name: "Pommes de pin", icon: "pinecone", unlock: "tueur_100",
      desc: ["Lance une pomme de pin qui explose.", "Explosion plus large.", "+1 pomme de pin.", "+50 % de dégâts.", "+1 pomme de pin, plus fréquentes."],
      n: [1, 1, 2, 2, 3], dmg: [24, 24, 24, 36, 38], rad: [18, 24, 24, 24, 27], cd: [2.4, 2.4, 2.4, 2.4, 1.9] },
    spores: { name: "Nuage de spores", icon: "spore", unlock: "total_1000",
      desc: ["Un nuage autour de toi qui blesse et ralentit.", "+dégâts.", "Nuage plus grand.", "Ralentit beaucoup plus.", "Nuage énorme et plus toxique."],
      dmg: [4, 6, 6, 7, 10], R: [24, 24, 32, 32, 42], slow: [0.3, 0.3, 0.3, 0.55, 0.55] },
    plume: { name: "Plume boomerang", icon: "feather", unlock: "niveau_20",
      desc: ["Une plume qui part et revient en transperçant tout.", "+dégâts.", "+1 plume.", "Va plus loin, +dégâts.", "+1 plume, plus fréquente."],
      n: [1, 1, 2, 2, 3], dmg: [12, 16, 16, 21, 24], range: [85, 85, 85, 110, 115], cd: [1.7, 1.7, 1.6, 1.5, 1.2] },
    lucioles: { name: "Lucioles", icon: "firefly", unlock: "boss_1",
      desc: ["Un éclair de luciole qui saute d'ennemi en ennemi.", "Saute sur 1 ennemi de plus.", "+1 éclair.", "+dégâts, +1 saut.", "+2 sauts, plus fréquent."],
      bolts: [1, 1, 2, 2, 2], chain: [3, 4, 4, 5, 7], dmg: [11, 11, 11, 15, 17], cd: [1.8, 1.7, 1.6, 1.5, 1.15] },
  };

  /* ---------- bonus de partie (niveaux 1 à 5) ---------- */
  var PASSIVES = {
    pattes: { name: "Pattes agiles", icon: "🐾", desc: "+10 % de vitesse de course." },
    appetit: { name: "Gros appétit", icon: "🍄", desc: "+20 PV max (et soigne 20 PV)." },
    joues: { name: "Grosses joues", icon: "🌰", desc: "+40 % de distance de ramassage." },
    griffes: { name: "Griffes aiguisées", icon: "🗡️", desc: "+10 % de dégâts." },
    vivacite: { name: "Vivacité", icon: "⚡", desc: "-8 % de temps de recharge." },
    ecorce: { name: "Armure d'écorce", icon: "🪵", desc: "-1 dégât reçu par coup." },
    seve: { name: "Sève", icon: "💧", desc: "Régénère 0,4 PV par seconde." },
    savoir: { name: "Vieux grimoire", icon: "📖", desc: "+12 % d'expérience." },
  };

  /* ---------- boutique (améliorations permanentes) ---------- */
  var SHOP = [
    { id: "vigueur", name: "Vigueur", icon: "❤️", desc: "+10 PV max", max: 5, cost: 40 },
    { id: "force", name: "Force", icon: "🗡️", desc: "+5 % de dégâts", max: 5, cost: 60 },
    { id: "celerite", name: "Célérité", icon: "🐾", desc: "+5 % de vitesse", max: 3, cost: 50 },
    { id: "aimant", name: "Aimant", icon: "🧲", desc: "+15 % de ramassage", max: 3, cost: 40 },
    { id: "recup", name: "Récupération", icon: "💧", desc: "+0,2 PV par seconde", max: 3, cost: 60 },
    { id: "ecorce", name: "Écorce", icon: "🪵", desc: "+1 armure", max: 3, cost: 80 },
    { id: "sagesse", name: "Sagesse", icon: "📖", desc: "+8 % d'expérience", max: 5, cost: 60 },
    { id: "avarice", name: "Avarice", icon: "💰", desc: "+10 % de glands d'or", max: 5, cost: 50 },
    { id: "chance", name: "Chance", icon: "🍀", desc: "+15 % de baies, coffres et glands d'or", max: 3, cost: 70 },
    { id: "vivacite", name: "Vivacité", icon: "⚡", desc: "-3 % de recharge", max: 3, cost: 90 },
    { id: "relance", name: "Relance", icon: "🎲", desc: "+1 relance des choix par partie", max: 3, cost: 100, unlock: "niveau_10" },
    { id: "renaissance", name: "Renaissance", icon: "💖", desc: "Revis une fois par partie avec 50 % de PV", max: 1, cost: 400, unlock: "survie_5" },
  ];

  /* ---------- succès ---------- */
  // check(r, s) : r = partie en cours, s = statistiques totales (déjà cumulées avec la partie)
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
    { id: "boss_1", name: "Chasseur de sanglier", desc: "Bats le Grand Sanglier.", gold: 100, check: function (r) { return r.bosses >= 1; } },
    { id: "boss_3", name: "Trophée de chasse", desc: "Bats 3 boss en une partie.", gold: 300, check: function (r) { return r.bosses >= 3; } },
    { id: "max_arme", name: "Arme ultime", desc: "Monte une arme au niveau 5.", gold: 50, check: function (r) { return r.maxedWeapon; } },
    { id: "arsenal", name: "Arsenal complet", desc: "Possède 4 armes et 4 bonus en même temps.", gold: 80, check: function (r) { return r.nWeapons >= 4 && r.nPassives >= 4; } },
    { id: "intouchable", name: "Intouchable", desc: "Passe 60 secondes d'affilée sans être touché.", gold: 60, check: function (r) { return r.time - r.lastHit >= 60; } },
    { id: "gourmand", name: "Gourmand", desc: "Mange 5 baies en une partie.", gold: 50, check: function (r) { return r.berries >= 5; } },
    { id: "riche", name: "Bas de laine", desc: "Gagne 1 000 glands d'or au total.", gold: 100, check: function (r, s) { return s.goldEarned >= 1000; } },
    { id: "troupe", name: "Toute la troupe", desc: "Joue une partie avec chaque personnage.", gold: 200, check: function (r, s) { return CHARACTERS.every(function (c) { return s.played[c.id]; }); } },
    { id: "prevoyant", name: "Prévoyant", desc: "Achète 10 améliorations dans la boutique.", gold: 50, check: function (r, s) { return s.bought >= 10; } },
    { id: "coeur_chene", name: "Cœur de chêne", desc: "Survis 5 minutes en mode Difficile.", gold: 300, check: function (r) { return r.hard && r.time >= 300; } },
  ];

  /* ---------- ennemis ---------- */
  var ENEMIES = {
    slug:   { sprite: "slug",   hp: 8,   spd: 24, dmg: 6,  r: 5,  xp: 1, from: 0,   w: 4, color: "#d9cf63" },
    beetle: { sprite: "beetle", hp: 24,  spd: 26, dmg: 8,  r: 5,  xp: 2, from: 40,  w: 4, color: "#a88ad8" },
    wasp:   { sprite: "wasp",   hp: 9,   spd: 48, dmg: 5,  r: 4,  xp: 1, from: 75,  w: 3, color: "#f2c230" },
    spider: { sprite: "spider", hp: 20,  spd: 34, dmg: 8,  r: 5,  xp: 2, from: 110, w: 3, color: "#5a3a62" },
    crow:   { sprite: "crow",   hp: 32,  spd: 38, dmg: 10, r: 6,  xp: 3, from: 150, w: 3, color: "#4a4a6a" },
    toad:   { sprite: "toad",   hp: 95,  spd: 15, dmg: 14, r: 8,  xp: 6, from: 220, w: 2, color: "#9cae4f" },
    boar:   { sprite: "boar",   hp: 900, spd: 22, dmg: 25, r: 12, xp: 40, boss: true, name: "Grand Sanglier", color: "#8f6243" },
    owl:    { sprite: "owl",    hp: 1400, spd: 30, dmg: 22, r: 10, xp: 60, boss: true, name: "Hibou Ancien", color: "#a597b8" },
  };

  var DIFFICULTIES = {
    normal: { name: "Normal", hp: 1, spd: 1, spawn: 1, gold: 1, score: 1 },
    difficile: { name: "Difficile", hp: 1.6, spd: 1.1, spawn: 1.25, gold: 1.6, score: 1.5, unlock: "survie_5" },
  };

  return { SPRITES: SPRITES, CHARACTERS: CHARACTERS, WEAPONS: WEAPONS, PASSIVES: PASSIVES, SHOP: SHOP,
           ACHIEVEMENTS: ACHIEVEMENTS, ENEMIES: ENEMIES, DIFFICULTIES: DIFFICULTIES };
})();
