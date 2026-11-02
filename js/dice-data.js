/* =========================================================================
   Écureuil Dice — données du jeu (modifiable à la main)
   Les sprites des ennemis viennent d'Écureuil Survivor (js/game-data.js).
   Icônes : une lettre = une couleur de la palette, "." = transparent.
   ========================================================================= */
(function (root) {
  "use strict";

  /* =====================================================================
     Écureuils (les « dés »)
     dmg / pu  : dégâts par tir + bonus par niveau d'amélioration en partie
     every     : secondes entre deux salves (une salve = 1 tir par point)
     target    : "front" (le plus avancé), "strong" (le plus de PV), "random"
     range     : portée en pixels du plateau (une case = 26) ; sans range = 100
     rarity    : "commun" | "rare" | "epique" | "legendaire" (se gagnent dans les coffres)
     ===================================================================== */
  var TYPES = {
    noisette: { name: "Noisette", role: "Tireuse", rarity: "commun", color: "#c98d4a", dark: "#7a4a22",
      fur: { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" },
      icon: { pal: { a: "#d39a52", b: "#6b4430" }, rows: [".bbb.", "bbbbb", ".aaa.", ".aaa.", "..a.."] },
      emblem: { pal: {"a": "#d39a52", "b": "#6b4430", "c": "#8a5a3b"}, rows: ["....b....", "..bbbbb..", ".bbbbbbb.", ".ccccccc.", ".aaaaaaa.", ".aaaaaaa.", "..aaaaa..", "...aaa...", "....a...."] },
      dmg: 20, pu: 9, every: 0.8, range: 110, target: "front",
      desc: "Lance des noisettes sur l'ennemi le plus avancé. Simple et costaud." },
    braise: { name: "Braise", role: "Zone", rarity: "commun", color: "#c8553d", dark: "#7a2a1a",
      fur: { t: "#f6d36b", d: "#a8321e", o: "#e0542a", c: "#ffd9a0", k: "#2b1709", n: "#6b2010" },
      icon: { pal: { a: "#e8542a", b: "#f6d36b" }, rows: ["..a..", ".aa..", ".aba.", "abbba", ".aaa."] },
      emblem: { pal: {"a": "#e8542a", "b": "#f6a23a", "c": "#fff3b0"}, rows: ["....a....", "...aa....", "...aaa.a.", "..aabaaa.", ".aabbbaa.", ".abbcbba.", ".abcccba.", ".abcccba.", "..aaaaa.."] },
      dmg: 14, pu: 6, every: 1.0, pspd: 260, range: 90, target: "front", splash: 0.5, splashR: 16,
      desc: "Glands enflammés : brûle aussi les ennemis autour de la cible (50 %)." },
    givre: { name: "Givre", role: "Ralentit", rarity: "commun", color: "#5fa3c9", dark: "#2a5a7a",
      fur: { t: "#e6f6fa", d: "#5f8fb8", o: "#a8d8f0", c: "#ffffff", k: "#2b1709", n: "#5f8fb8" },
      icon: { pal: { a: "#e6f6fa", b: "#2a5a7a" }, rows: ["a.a.a", ".aaa.", "aabaa", ".aaa.", "a.a.a"] },
      emblem: { pal: {"a": "#e6f6fa", "b": "#5fa3c9"}, rows: ["....a....", ".a..a..a.", "..a.a.a..", "...aaa...", "aaaabaaaa", "...aaa...", "..a.a.a..", ".a..a..a.", "....a...."] },
      dmg: 8, pu: 4, every: 1.0, pspd: 340, range: 100, target: "front", slow: 0.2, slowPip: 0.04, slowMax: 0.55,
      desc: "Gèle la cible : ralentie de 20 % + 4 % par point (moitié moins sur les boss)." },
    venin: { name: "Venin", role: "Poison", rarity: "rare", color: "#7a5288", dark: "#3e2448",
      fur: { t: "#b8e07a", d: "#3e6b2a", o: "#7fae4a", c: "#e6f5c0", k: "#2b1709", n: "#3e6b2a" },
      icon: { pal: { a: "#9cd06a", b: "#e6f5c0" }, rows: ["..a..", ".aaa.", "aabaa", "aaaaa", ".aaa."] },
      emblem: { pal: {"a": "#5b8a2a", "b": "#b8e07a", "c": "#ffffff"}, rows: ["....a....", "...aaa...", "...aba...", "..abbba..", "..abbba..", ".abbcbba.", ".abbbcba.", ".abbbbba.", "..aaaaa.."] },
      dmg: 5, pu: 2, every: 1.0, range: 110, target: "random", poison: 16, poisonPu: 8,
      desc: "Empoisonne (dégâts par seconde, ignore l'armure). Vise de préférence les ennemis sains." },
    eclair: { name: "Éclair", role: "Chaîne", rarity: "rare", color: "#4a4a8a", dark: "#24244a",
      fur: { t: "#fff2a0", d: "#b8901a", o: "#f2c230", c: "#fffbe0", k: "#2b1709", n: "#8a6a10" },
      icon: { pal: { a: "#f6d36b" }, rows: ["..aa.", ".aa..", "aaaa.", "..aa.", ".a..."] },
      emblem: { pal: {"a": "#f6d36b", "b": "#fff3b0"}, rows: [".....aaa.", "....aba..", "...aba...", "..aaaaaa.", ".aaaaaa..", "....aa...", "...aa....", "..aa.....", ".a......."] },
      dmg: 16, pu: 7, every: 1.1, pspd: 700, range: 105, target: "front", chain: 2, chainPip: 4, chainFall: 0.7,
      desc: "La foudre rebondit sur 2 ennemis proches (3 à partir de 4 points)." },
    vent: { name: "Rafale", role: "Rapide", rarity: "commun", color: "#3f8f8a", dark: "#1f4f4a",
      fur: { t: "#e0fff8", d: "#3f8f8a", o: "#7fd1c7", c: "#f0fffb", k: "#2b1709", n: "#1f4f4a" },
      icon: { pal: { a: "#e0fff8" }, rows: ["aaaa.", "....a", "aaaa.", "...a.", "aaa.."] },
      emblem: { pal: {"a": "#e0fff8", "b": "#7fd1c7"}, rows: ["..aaaa...", ".......a.", "aaaaaaaa.", ".........", ".bbbbbbbb", ".........", "aaaaaa...", "......a..", ".....a..."] },
      dmg: 7, pu: 3, every: 0.33, pspd: 460, range: 85, target: "front",
      desc: "Tire très vite, mais chaque tir fait peu de dégâts." },
    pepite: { name: "Pépite", role: "Économie", rarity: "commun", color: "#a8741a", dark: "#5a3a08",
      fur: { t: "#ffe27a", d: "#a8741a", o: "#e0a82a", c: "#fff3c0", k: "#2b1709", n: "#6b4430" },
      icon: { pal: { a: "#6b4430", b: "#ffe27a" }, rows: [".aaa.", "abbba", "abbba", "abbba", ".aaa."] },
      emblem: { pal: {"a": "#a8741a", "b": "#f2c230", "c": "#fff3b0"}, rows: ["..aaaaa..", ".abbbbba.", "abbcbbbba", "abbcbbbba", "abbbbbbba", "abbbbbbba", "abbbbbbba", ".abbbbba.", "..aaaaa.."] },
      dmg: 6, pu: 2, every: 1.2, range: 90, target: "random", income: 8, incomePu: 4,
      desc: "Rapporte 8 noisettes par point au début de chaque vague (+4 par amélioration)." },
    bucheron: { name: "Bûcheron", role: "Anti-boss", rarity: "epique", color: "#8f3a2a", dark: "#4a1a10",
      fur: { t: "#c98d4a", d: "#5a3420", o: "#8a5a3b", c: "#e8c8a0", k: "#2b1709", n: "#3a2010" },
      icon: { pal: { a: "#d6d1ca", b: "#c98d4a" }, rows: ["aaab.", "aaab.", ".a.b.", "...b.", "...b."] },
      emblem: { pal: {"a": "#d6d1ca", "b": "#8a5a3b", "c": "#ffffff"}, rows: ["..aaaa...", ".acaaab..", "acaaaab..", "aaaaaab..", ".aaaaab..", "..aaa.b..", "......b..", "......b..", "......b.."] },
      dmg: 26, pu: 12, every: 1.5, range: 125, target: "strong", bossMul: 3,
      desc: "Frappe l'ennemi le plus solide. Dégâts ×3 contre les boss." },
    lune: { name: "Lune", role: "Critique", rarity: "epique", color: "#3a2e5a", dark: "#1b1226",
      fur: { t: "#e9dcff", d: "#2e2448", o: "#57506a", c: "#c9b3ff", k: "#f6d36b", n: "#1b1226" },
      icon: { pal: { a: "#f6d36b" }, rows: [".aaa.", "aa...", "a....", "aa...", ".aaa."] },
      emblem: { pal: {"a": "#f6d36b", "c": "#fdf3de"}, rows: ["...aaa...", ".aaa.....", "aaa......", "aa....c..", "aa...ccc.", "aa....c..", "aaa......", ".aaa.....", "...aaa..."] },
      dmg: 12, pu: 5, every: 1.0, range: 105, target: "random", critPip: 0.025,
      desc: "Chaque point donne +2,5 % de coup critique à TOUS tes écureuils (crit = ×2,5)." },
    chene: { name: "Chêne", role: "Soutien", rarity: "epique", color: "#3f6b3a", dark: "#1f3a1b",
      fur: { t: "#9cd06a", d: "#2f4f2a", o: "#5b8a4a", c: "#d8efb0", k: "#2b1709", n: "#1f3a1b" },
      icon: { pal: { a: "#9cd06a", b: "#2f4f2a" }, rows: ["...aa", "..aaa", ".aaba", "aaba.", "b...."] },
      emblem: { pal: {"a": "#9cd06a", "b": "#2f4f2a"}, rows: ["....a....", "...aaa...", "..aaaaa..", ".aaabaaa.", "..aabaa..", ".aaabaaa.", "..aabaa..", "....b....", "....b...."] },
      dmg: 0, pu: 0, every: 1, target: "none", haste: 0.07, hastePu: 0.02,
      desc: "N'attaque pas : les écureuils voisins (haut, bas, gauche, droite) tirent 7 % plus vite par point." },
    mine: { name: "Pomme de pin", role: "Pièges", rarity: "rare", color: "#5a3a2a", dark: "#2b1709",
      fur: { t: "#b07a4f", d: "#4a2a18", o: "#7a4a2a", c: "#d39a52", k: "#f6d36b", n: "#2b1709" },
      icon: { pal: { a: "#6b4430", b: "#d39a52" }, rows: ["..b..", ".aba.", "ababa", ".aba.", "..a.."] },
      emblem: { pal: {"a": "#6b4430", "b": "#b07a4f", "c": "#f6d36b", "d": "#e8542a"}, rows: [".....dc..", "....b....", "...aaa...", "..ababa..", ".aabaaba.", ".ababaab.", ".aabaaba.", "..ababa..", "...aaa..."] },
      dmg: 45, pu: 20, every: 2.2, range: 100, target: "none", mineR: 16,
      desc: "Pose des pommes de pin explosives sur le chemin (une par point)." },
    graine: { name: "Graine", role: "Croissance", rarity: "epique", color: "#9cae4f", dark: "#4a5a1a",
      fur: { t: "#f29a85", d: "#6b8a34", o: "#bce08a", c: "#fdf3de", k: "#2b1709", n: "#6b8a34" },
      icon: { pal: { a: "#9cd06a", b: "#6b4430" }, rows: ["a...a", "aa.aa", ".aba.", "..b..", "..b.."] },
      emblem: { pal: {"a": "#9cd06a", "b": "#5b8a4a", "c": "#8a5a3b"}, rows: ["aa.....aa", "aaa...aaa", ".aaa.aaa.", "..aabaa..", "....b....", "....b....", "...ccc...", "..ccccc..", ".ccccccc."] },
      dmg: 5, pu: 2, every: 1.2, range: 80, target: "random", grow: 16, growPu: 2,
      desc: "Pousse : au bout de 16 s, devient un écureuil au hasard de ton deck avec 1 point de plus." },
    cameleon: { name: "Caméléon", role: "Joker", rarity: "legendaire", color: "#c86a98", dark: "#6a2a4a",
      fur: { t: "#c9b3ff", d: "#3f8f8a", o: "#f29a85", c: "#f6d36b", k: "#2b1709", n: "#3f8f8a" },
      icon: { pal: { a: "#fdf3de" }, rows: [".aaa.", "a...a", "...a.", "..a..", "..a.."] },
      emblem: { pal: {"a": "#fdf3de", "b": "#f29a85"}, rows: ["..aaaa...", ".aa..aa..", ".....aa..", "....aa...", "...aa....", "...aa....", ".........", "...bb....", "...bb...."] },
      dmg: 10, pu: 4, every: 1.0, range: 105, target: "front", joker: true,
      desc: "Glisse-le sur n'importe quel écureuil qui a le même nombre de points : il devient sa copie." },
    ronce: { name: "Ronce", role: "Perce-armure", rarity: "commun", color: "#5a6a2a", dark: "#2a3a10",
      fur: { t: "#8a6a4a", d: "#3a2a1a", o: "#6b5a3a", c: "#d8c8a0", k: "#2b1709", n: "#3a2a1a" },
      icon: { pal: { a: "#c8553d", b: "#9cd06a" }, rows: ["a...a", ".a.a.", "..b..", ".a.a.", "a...a"] },
      emblem: { pal: {"a": "#5b8a4a", "b": "#9cd06a", "c": "#e8542a"}, rows: ["....c....", "....c....", "...aaa...", "...aba...", "..aabaa..", "..abbba..", ".aabbbaa.", ".abbbbba.", "aaaaaaaaa"] },
      dmg: 18, pu: 8, every: 0.9, range: 105, target: "front", pierce: true,
      desc: "Ses épines ignorent l'armure des scarabées et des hérissons." },
    croc: { name: "Croc", role: "Exécution", rarity: "rare", color: "#6a6a7a", dark: "#2a2a3a",
      fur: { t: "#d6d1ca", d: "#4a4540", o: "#9a958e", c: "#f3efe6", k: "#c8553d", n: "#2b1709" },
      icon: { pal: { a: "#fdf3de" }, rows: ["aaaaa", "a.a.a", "a.a.a", ".a.a.", "....."] },
      emblem: { pal: {"a": "#fdf3de", "b": "#c9b8a0"}, rows: ["aaaaaaaab", ".aaaaaab.", ".aaaaaab.", "..aaaab..", "..aaaab..", "...aab...", "...aab...", "....a....", "....a...."] },
      dmg: 16, pu: 7, every: 1.0, pspd: 380, range: 90, target: "front", exec: 0.1, execPip: 0.015,
      desc: "Achève d'un coup les bestioles sous 10 % de leurs PV (+1,5 % par point). Pas les boss." },
    echo: { name: "Écho", role: "Double tir", rarity: "rare", color: "#5a8ab8", dark: "#2a4a6a",
      fur: { t: "#e6f6fa", d: "#3a6a8a", o: "#a8c8e0", c: "#ffffff", k: "#2b1709", n: "#3a6a8a" },
      icon: { pal: { a: "#e6f6fa" }, rows: ["a..a.", ".a..a", ".a..a", ".a..a", "a..a."] },
      emblem: { pal: {"a": "#e6f6fa", "b": "#a8d8f0"}, rows: ["a..b..a..", ".a..b..a.", "..a..b..a", "..a..b..a", "..a..b..a", ".a..b..a.", "a..b..a.."] },
      dmg: 14, pu: 6, every: 0.9, range: 105, target: "front", echo: 0.3,
      desc: "Chaque tir a 30 % de chance de partir une deuxième fois." },
    pie: { name: "Pie", role: "Voleuse", rarity: "rare", color: "#2b2b3a", dark: "#101018",
      fur: { t: "#24243a", d: "#101018", o: "#3a3a50", c: "#fdf3de", k: "#5fa3c9", n: "#101018" },
      icon: { pal: { a: "#5fa3c9", b: "#e6f6fa" }, rows: ["..a..", ".aba.", "abbba", ".aba.", "..a.."] },
      emblem: { pal: {"a": "#2a5a7a", "b": "#5fa3c9", "c": "#e6f6fa"}, rows: ["..aaaaa..", ".abbcbba.", "abbbcbbba", ".abbbbba.", "..abbba..", "...aba...", "....a...."] },
      dmg: 10, pu: 4, every: 1.0, range: 115, target: "random", steal: 3,
      desc: "Une bestiole achevée par la Pie rapporte 3 noisettes de plus par point." },
    blizzard: { name: "Blizzard", role: "Gel", rarity: "epique", color: "#8ab8d8", dark: "#3a6a8a",
      fur: { t: "#ffffff", d: "#7aa8c8", o: "#d8f0ff", c: "#ffffff", k: "#2a5a7a", n: "#7aa8c8" },
      icon: { pal: { a: "#ffffff", b: "#9fd8ff" }, rows: ["b.b.b", ".aaa.", "baaab", ".aaa.", "b.b.b"] },
      emblem: { pal: {"a": "#5fa3c9", "b": "#bfe8ff", "c": "#ffffff"}, rows: ["...aaa...", "..abbba..", ".abbcbba.", "abbcbbbba", "abbbbbbba", "abbbbcbba", ".abbcbba.", "..abbba..", "...aaa..."] },
      dmg: 10, pu: 5, every: 1.4, range: 100, target: "front", freeze: 0.4, freezePip: 0.08,
      desc: "Gèle net la cible 0,4 s (+0,08 s par point). Moitié moins sur les boss, rien sur les corbeaux." },
    orage: { name: "Orage", role: "Tout le chemin", rarity: "legendaire", color: "#2e2448", dark: "#120a20",
      fur: { t: "#c9b3ff", d: "#3a2e5a", o: "#7a6aa8", c: "#f6d36b", k: "#f6d36b", n: "#1b1226" },
      icon: { pal: { a: "#c9b3ff", b: "#f6d36b" }, rows: [".aaa.", "aaaaa", "..b..", ".b...", "b...."] },
      emblem: { pal: {"a": "#c9b3ff", "b": "#f6d36b", "c": "#e9dcff"}, rows: ["..aca....", ".acccaa..", "aaaaaaaaa", "aaaaaaaaa", ".aaaaaaa.", "...bb....", "..bb.....", "...bb....", "..b......"] },
      dmg: 12, pu: 6, every: 2.2, target: "all", range: Infinity,
      desc: "La foudre frappe TOUTES les bestioles du chemin à chaque salve." },
    ancetre: { name: "Ancêtre", role: "Aura", rarity: "legendaire", color: "#6b5a2a", dark: "#3a2a08",
      fur: { t: "#d6d1ca", d: "#6f6a64", o: "#b8a888", c: "#f3efe6", k: "#2b1709", n: "#4a4540" },
      icon: { pal: { a: "#f6d36b", b: "#c8553d" }, rows: ["a.a.a", "aaaaa", "abbba", "aaaaa", "....."] },
      emblem: { pal: {"a": "#f6d36b", "b": "#c8553d", "c": "#5fa3c9"}, rows: ["a...a...a", "a..aaa..a", "aa.aaa.aa", "aaaaaaaaa", "abacacaba", "aaaaaaaaa"] },
      dmg: 0, pu: 0, every: 1, target: "none", aura: 0.06, auraPu: 0.01,
      desc: "N'attaque pas : +6 % de dégâts par point pour TOUS tes écureuils (+1 % par amélioration)." },
    comete: { name: "Comète", role: "Écrasement", rarity: "legendaire", color: "#e06a2c", dark: "#6a2010",
      fur: { t: "#fdf3de", d: "#c8553d", o: "#f6d36b", c: "#ffffff", k: "#2b1709", n: "#c8553d" },
      icon: { pal: { a: "#fdf3de", b: "#f6d36b" }, rows: ["....a", "...aa", "..ab.", ".bb..", "b...."] },
      emblem: { pal: {"a": "#e8873a", "b": "#f6d36b", "c": "#fdf3de"}, rows: ["c........", ".c....aa.", "..c..abba", "...cabcba", "....abbba", "...c.aaa.", "..c......"] },
      dmg: 200, pu: 80, every: 3.2, pspd: 200, range: 155, target: "strong", splash: 1, splashR: 22,
      desc: "Une comète énorme tombe sur la bestiole la plus solide et écrase tout autour." },
  };
  var ORDER = ["noisette", "braise", "givre", "vent", "pepite", "ronce", "venin", "eclair", "mine", "croc", "echo", "pie", "bucheron", "lune", "chene", "graine", "blizzard", "cameleon", "orage", "ancetre", "comete"];
  var START_DECK = ["noisette", "braise", "givre", "vent", "pepite"];

  /* =====================================================================
     Raretés, coffres et niveaux (glands d'or seulement, aucun vrai argent)
     copies : exemplaires du même écureuil pour passer au niveau suivant
              (table de base × facteur de la rareté, arrondi au-dessus)
     ===================================================================== */
  var RARITY = {
    commun:     { name: "Commun", color: "#a8a59e", copies: 1, weight: 70 },
    rare:       { name: "Rare", color: "#5fa3c9", copies: 0.5, weight: 24 },
    epique:     { name: "Épique", color: "#a06ad8", copies: 0.25, weight: 5.4 },
    legendaire: { name: "Légendaire", color: "#f2c230", copies: 0.1, weight: 0.6 },
  };
  var COPIES = [2, 4, 8, 14, 22, 34, 50, 70, 100];   // niveau 1→2, 2→3, …, 9→10
  var CHESTS = [
    { id: "bois", name: "Coffre en bois", price: 80, cards: 5, color: "#a06a3e" },
    { id: "fer", name: "Coffre en fer", price: 220, cards: 14, minRarity: "rare", luck: 2, color: "#8d8a86" },
    { id: "or", name: "Coffre doré", price: 600, cards: 32, minRarity: "epique", luck: 4, color: "#e0a82a" },
  ];
  var KEYS_FOR_FREE = 3; // une clé par partie terminée, 3 clés = un coffre en bois offert

  /* =====================================================================
     Ennemis (mêmes bestioles que dans Écureuil Survivor)
     hp      : multiplicateur des PV de la vague   spd : vitesse sur le chemin
     from    : première vague où il apparaît       w   : poids de tirage
     leak    : vies perdues s'il arrive au bout
     armor   : part des dégâts ignorée   dodge : chance d'esquive
     ===================================================================== */
  var ENEMIES = {
    slug:       { name: "Limace", hp: 1, spd: 20, from: 1, w: 6, leak: 1 },
    beetle:     { name: "Scarabée", hp: 1.6, spd: 18, from: 1, w: 4, leak: 1, armor: 0.3 },
    wasp:       { name: "Guêpe", hp: 0.55, spd: 40, from: 3, w: 4, leak: 1, fly: true },
    bunny:      { name: "Lapin", hp: 0.8, spd: 34, from: 3, w: 3, leak: 1, hop: true },
    spider:     { name: "Araignée", hp: 1.1, spd: 26, from: 4, w: 3, leak: 1, split: 2 },
    moth:       { name: "Papillon de nuit", hp: 0.8, spd: 28, from: 4, w: 3, leak: 1, fly: true, dodge: 0.25 },
    fox:        { name: "Renard", hp: 1, spd: 38, from: 6, w: 3, leak: 1 },
    frog:       { name: "Grenouille", hp: 1.3, spd: 22, from: 6, w: 2, leak: 1, heal: 0.08 },
    toad:       { name: "Crapaud", hp: 4, spd: 15, from: 7, w: 2, leak: 2, big: true },
    hedgehog:   { name: "Hérisson", hp: 2, spd: 19, from: 8, w: 2, leak: 1, armor: 0.5 },
    crow:       { name: "Corbeau", hp: 1, spd: 42, from: 8, w: 2, leak: 1, fly: true, noSlow: true },
    bombshroom: { name: "Champi-bombe", hp: 1.2, spd: 24, from: 9, w: 2, leak: 1, stunOnDeath: 2 },
    mole:       { name: "Taupe", hp: 1.5, spd: 30, from: 11, w: 2, leak: 1, burrow: true },
    badger:     { name: "Blaireau", hp: 6, spd: 13, from: 12, w: 1, leak: 2, big: true },
    // boss : une vague sur 5, en alternance
    boar: { name: "Grand Sanglier", hp: 14, spd: 9, leak: 99, boss: true, power: "charge",
            powerDesc: "Charge et assomme 2 écureuils" },
    owl:  { name: "Hibou Ancien", hp: 18, spd: 8.5, leak: 99, boss: true, power: "hoot",
            powerDesc: "Change 2 écureuils et appelle des papillons" },
  };
  var BOSSES = ["boar", "owl"];

  /* =====================================================================
     Réglages
     ===================================================================== */
  var CFG = {
    startSp: 100,         // noisettes au départ
    summonBase: 10,       // prix de la 1re invocation
    summonStep: 10,       // +10 à chaque invocation
    puCosts: [100, 200, 400, 700], // améliorations en partie (niveau 1 → 5)
    maxPips: 7,
    lives: 3,
    crit: 0.05, critMul: 2.5,
    pipBonus: 0.3,        // +30 % de dégâts par tir pour chaque point au-delà du premier
    hpBase: 60, hpGrowth: 1.15, hpLin: 0.08,   // PV d'une limace : base × growth^(v-1) × (1 + lin × (v-1))
    coopHp: 1.8,          // PV en coop (2 plateaux)
    killSp: 8, killSpWave: 1.5, // noisettes par ennemi : 8 + 1,5 par vague
    bossSp: 100,
    waveLen: 20, spawnLen: 15, bossEvery: 5, bossTimeout: 70,
    // progression permanente (glands d'or, aucune vraie monnaie)
    classMax: 10, classBonus: 0.12,
    classCosts: [0, 30, 60, 100, 150, 220, 300, 400, 520, 660],
  };

  /* =====================================================================
     Cartes (solo, contre l'IA, versus). Grille de 7 colonnes, une case = 26 px.
     rows  : « # » emplacement d'écureuil, « P » chemin, « S » départ, « E » sortie,
             « T » arbre, « ~ » flaque, « . » herbe (le chemin suit « paths », dans l'ordre)
     paths : un ou plusieurs tracés [colonne, ligne] ; plusieurs = plusieurs terriers
     mods  : hp (PV des bestioles), spd (vitesse), mud (la boue ne ralentit pas les volantes),
             range (portée des écureuils), sp (noisettes par bestiole)
     ===================================================================== */
  var MAPS = [
    { id: "clairiere", name: "Clairière", icon: "🌳", ground: "#3f6b3a",
      spec: "La carte classique : un chemin en U autour d'un grand plateau.",
      rows: ["PPPPPPP",
             "P#####P",
             "P#####P",
             "P#####P",
             "S.....E"],
      paths: [[[0, 4], [0, 0], [6, 0], [6, 4]]], mods: { hp: 0.85 } },
    { id: "riviere", name: "Rivière", icon: "🌊", ground: "#3b6b4a",
      spec: "Le chemin serpente : chaque rangée touche deux berges. Mais les bestioles nagent vite (+15 % de vitesse, +25 % de PV, +10 % de noisettes).",
      rows: ["SPPPPPP",
             "######P",
             "PPPPPPP",
             "P######",
             "PPPPPPE"],
      paths: [[[0, 0], [6, 0], [6, 2], [0, 2], [0, 4], [6, 4]]], mods: { spd: 1.15, hp: 1.25, sp: 1.1 } },
    { id: "sousbois", name: "Sous-bois", icon: "🌲", ground: "#2f5a32",
      spec: "Long chemin sinueux entre les arbres, qui gênent la vue : −15 % de portée.",
      rows: ["S##T##T",
             "PPPPPP.",
             "##T##P#",
             "TPPPPP.",
             "#P##T##",
             "TPPPPPE"],
      paths: [[[0, 0], [0, 1], [5, 1], [5, 3], [1, 3], [1, 5], [6, 5]]], mods: { range: 0.85 } },
    { id: "terrier", name: "Le Terrier", icon: "🕳️", ground: "#4a5a32",
      spec: "Spirale jusqu'au cœur du terrier : 17 emplacements, mais les bestioles sont coriaces (+20 % de PV).",
      rows: ["SPPPPPP",
             "######P",
             "PPPPE#P",
             "P#####P",
             "P#####P",
             "PPPPPPP"],
      paths: [[[0, 0], [6, 0], [6, 5], [0, 5], [0, 2], [4, 2]]], mods: { hp: 1.2 } },
    { id: "marais", name: "Marais", icon: "🐸", ground: "#3a5a40",
      spec: "Chemin très court bordé de 20 emplacements, dans la boue : bestioles −50 % de vitesse… sauf les volantes, qui passent au-dessus !",
      rows: ["~.#S#.~",
             ".##P##.",
             "~##P##.",
             ".##P##~",
             ".##P##.",
             "~.#E#.~"],
      paths: [[[3, 0], [3, 5]]], mods: { spd: 0.5, mud: true, hp: 0.88 } },
    { id: "carrefour", name: "Deux terriers", icon: "🔀", ground: "#45703a",
      spec: "Les bestioles sortent de deux terriers et se rejoignent avant la sortie : surveille les deux côtés.",
      rows: ["SPPP###",
             "#T#P#T#",
             "###PPPE",
             "#T#P#T#",
             "SPPP###"],
      paths: [[[0, 0], [3, 0], [3, 2], [6, 2]], [[0, 4], [3, 4], [3, 2], [6, 2]]], mods: { spd: 0.8, hp: 0.9 } },
  ];

  var ACHIEVEMENTS = [
    { id: "v5", name: "Premier boss", desc: "Atteins la vague 6 en solo.", gold: 30, check: function (r) { return r.mode === "solo" && r.wave >= 6; } },
    { id: "v15", name: "Écureuil de garde", desc: "Atteins la vague 15 en solo.", gold: 80, check: function (r) { return r.mode === "solo" && r.wave >= 15; } },
    { id: "v25", name: "Gardien du chêne", desc: "Atteins la vague 25 en solo.", gold: 200, check: function (r) { return r.mode === "solo" && r.wave >= 25; } },
    { id: "pip7", name: "Sept points", desc: "Obtiens un écureuil à 7 points.", gold: 100, check: function (r) { return r.maxPip >= 7; } },
    { id: "coop10", name: "Main dans la patte", desc: "Atteins la vague 10 en coop.", gold: 80, check: function (r) { return r.mode === "coop" && r.wave >= 10; } },
    { id: "win1", name: "Duelliste", desc: "Gagne un versus.", gold: 60, check: function (r) { return r.mode === "versus" && r.win; } },
    { id: "winbot", name: "Plus malin que la machine", desc: "Bats l'IA en versus.", gold: 40, check: function (r) { return r.mode === "versus" && r.win && r.bot; } },
    { id: "boss5", name: "Chasseur de boss", desc: "Bats 5 boss en une partie.", gold: 120, check: function (r) { return r.bosses >= 5; } },
  ];

  root.RD_DATA = { TYPES: TYPES, ORDER: ORDER, START_DECK: START_DECK, ENEMIES: ENEMIES, BOSSES: BOSSES, CFG: CFG, ACHIEVEMENTS: ACHIEVEMENTS, MAPS: MAPS, RARITY: RARITY, COPIES: COPIES, CHESTS: CHESTS, KEYS_FOR_FREE: KEYS_FOR_FREE };
})(typeof window !== "undefined" ? window : globalThis);
