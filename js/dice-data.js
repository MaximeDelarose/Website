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
     cost      : prix en glands d'or pour le débloquer (0 = dès le début)
     ===================================================================== */
  var TYPES = {
    noisette: { name: "Noisette", role: "Tireuse", color: "#c98d4a", dark: "#7a4a22",
      fur: { t: "#f2b05e", d: "#b85e2a", o: "#e8873a", c: "#fdf3de", k: "#2b1709", n: "#6b4430" },
      icon: { pal: { a: "#d39a52", b: "#6b4430" }, rows: [".bbb.", "bbbbb", ".aaa.", ".aaa.", "..a.."] },
      dmg: 20, pu: 9, every: 0.8, target: "front", cost: 0,
      desc: "Lance des noisettes sur l'ennemi le plus avancé. Simple et costaud." },
    braise: { name: "Braise", role: "Zone", color: "#c8553d", dark: "#7a2a1a",
      fur: { t: "#f6d36b", d: "#a8321e", o: "#e0542a", c: "#ffd9a0", k: "#2b1709", n: "#6b2010" },
      icon: { pal: { a: "#e8542a", b: "#f6d36b" }, rows: ["..a..", ".aa..", ".aba.", "abbba", ".aaa."] },
      dmg: 14, pu: 6, every: 1.0, target: "front", splash: 0.5, splashR: 16, cost: 0,
      desc: "Glands enflammés : brûle aussi les ennemis autour de la cible (50 %)." },
    givre: { name: "Givre", role: "Ralentit", color: "#5fa3c9", dark: "#2a5a7a",
      fur: { t: "#e6f6fa", d: "#5f8fb8", o: "#a8d8f0", c: "#ffffff", k: "#2b1709", n: "#5f8fb8" },
      icon: { pal: { a: "#e6f6fa", b: "#2a5a7a" }, rows: ["a.a.a", ".aaa.", "aabaa", ".aaa.", "a.a.a"] },
      dmg: 8, pu: 4, every: 1.0, target: "front", slow: 0.2, slowPip: 0.04, slowMax: 0.55, cost: 0,
      desc: "Gèle la cible : ralentie de 20 % + 4 % par point (moitié moins sur les boss)." },
    venin: { name: "Venin", role: "Poison", color: "#7a5288", dark: "#3e2448",
      fur: { t: "#b8e07a", d: "#3e6b2a", o: "#7fae4a", c: "#e6f5c0", k: "#2b1709", n: "#3e6b2a" },
      icon: { pal: { a: "#9cd06a", b: "#e6f5c0" }, rows: ["..a..", ".aaa.", "aabaa", "aaaaa", ".aaa."] },
      dmg: 5, pu: 2, every: 1.0, target: "random", poison: 16, poisonPu: 8, cost: 0,
      desc: "Empoisonne (dégâts par seconde, ignore l'armure). Vise de préférence les ennemis sains." },
    eclair: { name: "Éclair", role: "Chaîne", color: "#4a4a8a", dark: "#24244a",
      fur: { t: "#fff2a0", d: "#b8901a", o: "#f2c230", c: "#fffbe0", k: "#2b1709", n: "#8a6a10" },
      icon: { pal: { a: "#f6d36b" }, rows: ["..aa.", ".aa..", "aaaa.", "..aa.", ".a..."] },
      dmg: 16, pu: 7, every: 1.1, target: "front", chain: 2, chainPip: 4, chainFall: 0.7, cost: 0,
      desc: "La foudre rebondit sur 2 ennemis proches (3 à partir de 4 points)." },
    vent: { name: "Rafale", role: "Rapide", color: "#3f8f8a", dark: "#1f4f4a",
      fur: { t: "#e0fff8", d: "#3f8f8a", o: "#7fd1c7", c: "#f0fffb", k: "#2b1709", n: "#1f4f4a" },
      icon: { pal: { a: "#e0fff8" }, rows: ["aaaa.", "....a", "aaaa.", "...a.", "aaa.."] },
      dmg: 7, pu: 3, every: 0.33, target: "front", cost: 0,
      desc: "Tire très vite, mais chaque tir fait peu de dégâts." },
    pepite: { name: "Pépite", role: "Économie", color: "#a8741a", dark: "#5a3a08",
      fur: { t: "#ffe27a", d: "#a8741a", o: "#e0a82a", c: "#fff3c0", k: "#2b1709", n: "#6b4430" },
      icon: { pal: { a: "#6b4430", b: "#ffe27a" }, rows: [".aaa.", "abbba", "abbba", "abbba", ".aaa."] },
      dmg: 6, pu: 2, every: 1.2, target: "random", income: 8, incomePu: 4, cost: 0,
      desc: "Rapporte 8 noisettes par point au début de chaque vague (+4 par amélioration)." },
    bucheron: { name: "Bûcheron", role: "Anti-boss", color: "#8f3a2a", dark: "#4a1a10",
      fur: { t: "#c98d4a", d: "#5a3420", o: "#8a5a3b", c: "#e8c8a0", k: "#2b1709", n: "#3a2010" },
      icon: { pal: { a: "#d6d1ca", b: "#c98d4a" }, rows: ["aaab.", "aaab.", ".a.b.", "...b.", "...b."] },
      dmg: 26, pu: 12, every: 1.5, target: "strong", bossMul: 3, cost: 120,
      desc: "Frappe l'ennemi le plus solide. Dégâts ×3 contre les boss." },
    lune: { name: "Lune", role: "Critique", color: "#3a2e5a", dark: "#1b1226",
      fur: { t: "#e9dcff", d: "#2e2448", o: "#57506a", c: "#c9b3ff", k: "#f6d36b", n: "#1b1226" },
      icon: { pal: { a: "#f6d36b" }, rows: [".aaa.", "aa...", "a....", "aa...", ".aaa."] },
      dmg: 12, pu: 5, every: 1.0, target: "random", critPip: 0.025, cost: 180,
      desc: "Chaque point donne +2,5 % de coup critique à TOUS tes écureuils (crit = ×2,5)." },
    chene: { name: "Chêne", role: "Soutien", color: "#3f6b3a", dark: "#1f3a1b",
      fur: { t: "#9cd06a", d: "#2f4f2a", o: "#5b8a4a", c: "#d8efb0", k: "#2b1709", n: "#1f3a1b" },
      icon: { pal: { a: "#9cd06a", b: "#2f4f2a" }, rows: ["...aa", "..aaa", ".aaba", "aaba.", "b...."] },
      dmg: 0, pu: 0, every: 1, target: "none", haste: 0.07, hastePu: 0.02, cost: 220,
      desc: "N'attaque pas : les écureuils voisins (haut, bas, gauche, droite) tirent 7 % plus vite par point." },
    mine: { name: "Pomme de pin", role: "Pièges", color: "#5a3a2a", dark: "#2b1709",
      fur: { t: "#b07a4f", d: "#4a2a18", o: "#7a4a2a", c: "#d39a52", k: "#f6d36b", n: "#2b1709" },
      icon: { pal: { a: "#6b4430", b: "#d39a52" }, rows: ["..b..", ".aba.", "ababa", ".aba.", "..a.."] },
      dmg: 45, pu: 20, every: 2.2, target: "none", mineR: 16, cost: 180,
      desc: "Pose des pommes de pin explosives sur le chemin (une par point)." },
    graine: { name: "Graine", role: "Croissance", color: "#9cae4f", dark: "#4a5a1a",
      fur: { t: "#f29a85", d: "#6b8a34", o: "#bce08a", c: "#fdf3de", k: "#2b1709", n: "#6b8a34" },
      icon: { pal: { a: "#9cd06a", b: "#6b4430" }, rows: ["a...a", "aa.aa", ".aba.", "..b..", "..b.."] },
      dmg: 5, pu: 2, every: 1.2, target: "random", grow: 16, growPu: 2, cost: 260,
      desc: "Pousse : au bout de 16 s, devient un écureuil au hasard de ton deck avec 1 point de plus." },
    cameleon: { name: "Caméléon", role: "Joker", color: "#c86a98", dark: "#6a2a4a",
      fur: { t: "#c9b3ff", d: "#3f8f8a", o: "#f29a85", c: "#f6d36b", k: "#2b1709", n: "#3f8f8a" },
      icon: { pal: { a: "#fdf3de" }, rows: [".aaa.", "a...a", "...a.", "..a..", "..a.."] },
      dmg: 10, pu: 4, every: 1.0, target: "front", joker: true, cost: 320,
      desc: "Glisse-le sur n'importe quel écureuil qui a le même nombre de points : il devient sa copie." },
  };
  var ORDER = ["noisette", "braise", "givre", "venin", "eclair", "vent", "pepite", "bucheron", "lune", "chene", "mine", "graine", "cameleon"];
  var START_DECK = ["noisette", "braise", "givre", "eclair", "pepite"];

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
    hpBase: 70, hpGrowth: 1.15, hpLin: 0.08,   // PV d'une limace : base × growth^(v-1) × (1 + lin × (v-1))
    coopHp: 1.8,          // PV en coop (2 plateaux)
    killSp: 8, killSpWave: 1.5, // noisettes par ennemi : 8 + 1,5 par vague
    bossSp: 100,
    waveLen: 20, spawnLen: 15, bossEvery: 5, bossTimeout: 70, runBossEvery: 4,
    // progression permanente (glands d'or, aucune vraie monnaie)
    classMax: 10, classBonus: 0.12,
    classCosts: [0, 30, 60, 100, 150, 220, 300, 400, 520, 660],
  };

  /* =====================================================================
     Mode Saisons (roguelike) : zone restreinte, vagues fixes, boutique
     de reliques entre les vagues (payée en pignons, gagnés en jouant)
     mods : effets cumulables lus par le moteur
       dmg (+x dégâts), typeDmg {type: +x}, crit, critMul, haste (cadence),
       summonDisc (réduction invocation), pip2 (chance d'invoquer à 2 points),
       merge2 (chance de +2 points en fusion), killSp, waveSp, waveGrow,
       slowAll (bestioles plus lentes), boss (+x contre les boss),
       hermit (+x par case libre), variety (+x par type différent)
     ===================================================================== */
  var RUN = {
    waves: 16, seasons: ["Printemps", "Été", "Automne", "Hiver"],
    startCoins: 4, waveCoins: 3, bossCoins: 6, interestPer: 5, interestMax: 4,
    startOpen: [1, 2, 3, 6, 7, 8],               // cases ouvertes au départ (3 × 2 au centre)
    openOrder: [11, 12, 13, 5, 9, 0, 4, 10, 14], // ordre d'agrandissement de la zone
    expandCost: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    rerollCost: 1, relicSlots: 5, sackSp: 120, sackCost: 3, lifeCost: 8,
  };
  var RELICS = [
    { id: "gland_dore", icon: "🌰", name: "Gland doré", price: 6, desc: "+25 % de dégâts pour tous tes écureuils.", mods: { dmg: 0.25 } },
    { id: "loupe", icon: "🔍", name: "Loupe de pie", price: 5, desc: "+8 % de chance de coup critique.", mods: { crit: 0.08 } },
    { id: "marteau", icon: "🔨", name: "Casse-noix", price: 6, desc: "Les coups critiques font ×3,5 au lieu de ×2,5.", mods: { critMul: 1 } },
    { id: "sablier", icon: "⏳", name: "Sablier de rosée", price: 6, desc: "Tous tes écureuils tirent 15 % plus vite.", mods: { haste: 0.15 } },
    { id: "sac", icon: "🎒", name: "Besace", price: 5, desc: "Invoquer coûte 25 % moins cher.", mods: { summonDisc: 0.25 } },
    { id: "trefle", icon: "🍀", name: "Trèfle à quatre feuilles", price: 7, desc: "25 % de chance qu'un écureuil invoqué arrive avec 2 points.", mods: { pip2: 0.25 } },
    { id: "double", icon: "🪺", name: "Nid douillet", price: 7, desc: "20 % de chance qu'une fusion donne 2 points de plus au lieu d'un.", mods: { merge2: 0.2 } },
    { id: "chasseur", icon: "🏹", name: "Carquois", price: 4, desc: "+4 noisettes par bestiole vaincue.", mods: { killSp: 4 } },
    { id: "noisetier", icon: "🌳", name: "Noisetier", price: 4, desc: "+60 noisettes au début de chaque vague.", mods: { waveSp: 60 } },
    { id: "lune_rousse", icon: "🌕", name: "Lune rousse", price: 8, desc: "Au début de chaque vague, un écureuil au hasard gagne 1 point.", mods: { waveGrow: 1 } },
    { id: "epouvantail", icon: "🧣", name: "Épouvantail", price: 5, desc: "Toutes les bestioles avancent 12 % moins vite.", mods: { slowAll: 0.12 } },
    { id: "couronne", icon: "👑", name: "Couronne de lierre", price: 5, desc: "+100 % de dégâts contre les boss.", mods: { boss: 1 } },
    { id: "ermite", icon: "🍄", name: "Champignon ermite", price: 6, desc: "+12 % de dégâts par case libre dans ta zone.", mods: { hermit: 0.12 } },
    { id: "mosaique", icon: "🎨", name: "Mosaïque de feuilles", price: 6, desc: "+8 % de dégâts par type d'écureuil différent sur le plateau.", mods: { variety: 0.08 } },
    // une relique « fan » par type du deck, générée à la volée
    { id: "fan", icon: "⭐", name: "Fan de", price: 4, desc: "+60 % de dégâts pour les", fan: 0.6 },
  ];

  var ACHIEVEMENTS = [
    { id: "saison1", name: "Premier printemps", desc: "Termine le Printemps en mode Saisons.", gold: 40, check: function (r) { return r.mode === "run" && r.wave >= 4 && (r.win || r.wave > 4); } },
    { id: "saison4", name: "Les quatre saisons", desc: "Termine l'Hiver en mode Saisons.", gold: 250, check: function (r) { return r.mode === "run" && r.runWin; } },
    { id: "v5", name: "Premier boss", desc: "Atteins la vague 6 en solo.", gold: 30, check: function (r) { return r.mode === "solo" && r.wave >= 6; } },
    { id: "v15", name: "Écureuil de garde", desc: "Atteins la vague 15 en solo.", gold: 80, check: function (r) { return r.mode === "solo" && r.wave >= 15; } },
    { id: "v25", name: "Gardien du chêne", desc: "Atteins la vague 25 en solo.", gold: 200, check: function (r) { return r.mode === "solo" && r.wave >= 25; } },
    { id: "pip7", name: "Sept points", desc: "Obtiens un écureuil à 7 points.", gold: 100, check: function (r) { return r.maxPip >= 7; } },
    { id: "coop10", name: "Main dans la patte", desc: "Atteins la vague 10 en coop.", gold: 80, check: function (r) { return r.mode === "coop" && r.wave >= 10; } },
    { id: "win1", name: "Duelliste", desc: "Gagne un versus.", gold: 60, check: function (r) { return r.mode === "versus" && r.win; } },
    { id: "winbot", name: "Plus malin que la machine", desc: "Bats l'IA en versus.", gold: 40, check: function (r) { return r.mode === "versus" && r.win && r.bot; } },
    { id: "boss5", name: "Chasseur de boss", desc: "Bats 5 boss en une partie.", gold: 120, check: function (r) { return r.bosses >= 5; } },
  ];

  root.RD_DATA = { TYPES: TYPES, ORDER: ORDER, START_DECK: START_DECK, ENEMIES: ENEMIES, BOSSES: BOSSES, CFG: CFG, ACHIEVEMENTS: ACHIEVEMENTS, RUN: RUN, RELICS: RELICS };
})(typeof window !== "undefined" ? window : globalThis);
