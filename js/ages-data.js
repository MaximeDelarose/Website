/* =========================================================================
   Age of Defense — données et équilibrage (aucun DOM).
   Tout ce qui se règle est ici : âges, bâtiments (« lignées » à 5 formes),
   ennemis, vagues, cartes, envois de troupes (versus), améliorations hors partie.
   Chargé par ages-core.js (Node ou navigateur) : window.AGES_DATA / require().
   ========================================================================= */
(function (root) {
  "use strict";

  var T = 32; // taille d'une case en pixels de monde

  /* ---------- ÂGES ----------
     cost : prix (or) pour atteindre l'âge ; dm : multiplicateur de dégâts / PV des bâtiments ;
     cm : multiplicateur de prix des nouvelles constructions ; rg : bonus de portée. */
  var AGES = [
    { id: 0, name: "Préhistoire",   cost: 0,    dm: 1,    cm: 1,   rg: 0,    col: "#c98a4b" },
    { id: 1, name: "Médiéval",      cost: 450,  dm: 2.3,  cm: 1.6, rg: 0.1,  col: "#9aa0b4" },
    { id: 2, name: "Contemporain",  cost: 1300, dm: 5.2,  cm: 2.6, rg: 0.2,  col: "#6f8f5a" },
    { id: 3, name: "Moderne",       cost: 3200, dm: 11,   cm: 4,   rg: 0.3,  col: "#5d8fb8" },
    { id: 4, name: "Futuriste",     cost: 7000, dm: 23,   cm: 6.2, rg: 0.4,  col: "#b56cf0" },
  ];

  /* ---------- BÂTIMENTS ----------
     cat : onglet du menu. kind : comportement (voir ages-core.js).
     size : cases (1 ou 2). minAge : âge qui le débloque. cost : prix de base (âge 0).
     forms : nom de la forme à chaque âge. Les stats s'appliquent × AGES[].dm. */
  var CATS = [
    { id: "tir", name: "Tourelles", ico: "🎯" },
    { id: "sol", name: "Pièges", ico: "💣" },
    { id: "troupe", name: "Troupes", ico: "⚔️" },
    { id: "air", name: "Air", ico: "✈️" },
    { id: "aide", name: "Soutien", ico: "🚩" },
  ];

  var LINES = {
    tour: { name: "Tourelle", cat: "tir", kind: "shoot", size: 1, minAge: 0, cost: 50, dmg: 14, rate: 1.6, range: 4, dtype: "phys", air: true, ground: true, speed: 360,
      forms: ["Lance-glands", "Tour des archers-écureuils", "Mitrailleuse à glands", "Tourelle auto à glands", "Canon plasma-noisette"],
      ammo: ["stone", "arrow", "bullet", "bullet", "plasma"], info: "Tireuse polyvalente, sol et air." },
    sniper: { name: "Sniper", cat: "tir", kind: "shoot", size: 1, minAge: 1, cost: 120, dmg: 62, rate: 0.42, range: 8.6, dtype: "phys", air: true, ground: true, speed: 760,
      forms: ["Sarbacane à épines", "Arbalète du guetteur", "Tour de sniper", "Fusil à noisette perforante", "Rail gun du chêne"],
      ammo: ["dart", "bolt", "tracer", "tracer", "rail"], info: "Très longue portée, gros dégâts, tir lent." },
    mortar: { name: "Mortier", cat: "tir", kind: "mortar", size: 1, minAge: 0, cost: 100, dmg: 40, rate: 0.36, range: 7, minRange: 1.8, splash: 1.5, dtype: "blast", air: false, ground: true, speed: 210,
      forms: ["Lance-cailloux", "Catapulte à pommes de pin", "Mortier à glands", "Obusier de la forêt", "Artillerie plasma"],
      ammo: ["rock", "rock", "shell", "shell", "plasmaball"], info: "Dégâts de zone, sol uniquement." },
    fire: { name: "Brûleur", cat: "tir", kind: "pulse", size: 1, minAge: 0, cost: 80, dmg: 7, rate: 3, range: 2.7, dtype: "fire", air: false, ground: true, status: "burn", dps: 7, dur: 3,
      forms: ["Brasero de brindilles", "Huile de faînes", "Lance-flammes", "Lance-flammes lourd", "Torche thermique"],
      info: "Brûle tout ce qui approche (sol)." },
    glue: { name: "Colle", cat: "tir", kind: "shoot", size: 1, minAge: 0, cost: 60, dmg: 2, rate: 0.85, range: 4, splash: 0.9, dtype: "energy", air: false, ground: true, status: "glue", dur: 3.2, speed: 240,
      forms: ["Sève collante", "Poix de pin", "Mousse adhésive", "Gel collant", "Nano-gelée"],
      ammo: ["glue", "glue", "foam", "foam", "nano"], info: "Colle les ennemis : gros ralentissement." },
    freeze: { name: "Givre", cat: "tir", kind: "shoot", size: 1, minAge: 1, cost: 95, dmg: 3, rate: 0.65, range: 3.9, splash: 1.1, dtype: "energy", air: true, ground: true, status: "freeze", dur: 1, speed: 300,
      forms: ["Glaçon", "Totem de givre", "Cryo-canon", "Azote liquide", "Rayon cryo"],
      ammo: ["ice", "ice", "cryo", "cryo", "cryo"], info: "Gèle sur place puis ralentit." },
    shock: { name: "Choc", cat: "tir", kind: "chain", size: 1, minAge: 1, cost: 105, dmg: 14, rate: 0.95, range: 3.9, jumps: 2, dtype: "energy", air: true, ground: true, status: "stun", dur: 0.7,
      forms: ["Totem foudre", "Bobine", "Taser", "Générateur EMP", "Arc stasis"],
      info: "Éclair en chaîne, paralyse parfois." },
    aa: { name: "Antiaérien", cat: "tir", kind: "shoot", size: 1, minAge: 0, cost: 85, dmg: 20, rate: 1.6, range: 5.6, dtype: "phys", air: true, ground: false, speed: 520,
      forms: ["Fronde géante", "Baliste à plumes", "Canon AA", "Missiles SAM", "Laser orbital"],
      ammo: ["stone", "bolt", "bullet", "missile", "plasma"], info: "Spécialiste des ennemis volants." },

    mine: { name: "Mine", cat: "sol", kind: "mine", size: 1, minAge: 0, cost: 28, dmg: 95, splash: 1.5, dtype: "blast", info: "Sur la route : explose au contact (1 fois).",
      forms: ["Épines cachées", "Mine à poudre", "Mine à glands", "Mine guidée", "Mine plasma"] },
    pit: { name: "Fosse", cat: "sol", kind: "pit", size: 1, minAge: 0, cost: 34, dps: 12, life: 28, radius: 1.05, dtype: "phys", info: "Sur la route : piège et freine (dure 28 s).",
      forms: ["Fosse à épines", "Fosse à huile", "Tranchée piégée", "Fosse à acide", "Trou noir"] },

    ramp: { name: "Rampe d'accès", cat: "troupe", kind: "ramp", size: 1, minAge: 0, cost: 15, info: "Au bord de la route : les troupes descendent par là.",
      forms: ["Rampe de terre", "Rampe en bois", "Rampe en pierre", "Rampe en béton", "Rampe magnétique"] },
    barracks: { name: "Caserne", cat: "troupe", kind: "barracks", size: 2, minAge: 0, cost: 95, units: 3, hp: 90, dmg: 6, rate: 1.2, respawn: 9, speed: 62, reach: 22, rallyRange: 7, zone: 6.5,
      forms: ["Arbre-terrier de chasseurs", "Fortin de chevaliers", "Caserne de soldats", "Usine de chars à glands", "Hangar de méchas"],
      unitNames: ["Écureuil des cavernes", "Écureuil chevalier", "Écureuil soldat", "Écureuil tankiste", "Écureuil méca"], info: "Envoie des soldats bloquer la route (il faut une rampe)." },
    lancers: { name: "Lanciers", cat: "troupe", kind: "barracks", size: 2, minAge: 0, cost: 105, units: 2, hp: 65, dmg: 11, rate: 0.95, respawn: 9, speed: 66, reach: 34, rallyRange: 7, zone: 7, bonusArmor: 2.2,
      forms: ["Arbre des lanciers", "Fortin de lanciers", "Fantassins AT", "Lance-roquettes", "Lance-plasma"],
      unitNames: ["Chasseur", "Lancier", "Fantassin AT", "Roquettiste", "Plasmatier"], info: "Portée au corps à corps, ×2.2 contre les blindés." },
    garrison: { name: "Garnison", cat: "troupe", kind: "garrison", size: 1, minAge: 0, cost: 72, units: 3, dmg: 7, rate: 1.15, range: 4.3, respawn: 0, speed: 70, dtype: "phys",
      forms: ["Frondeurs écureuils", "Archers écureuils", "Fusiliers écureuils", "Mitrailleurs écureuils", "Écureuils laser"],
      unitNames: ["Frondeur", "Archer", "Fusilier", "Mitrailleur", "Soldat laser"], info: "Tireurs postés au bord de la route." },

    airfield: { name: "Piste aérienne", cat: "air", kind: "airfield", size: 2, minAge: 1, cost: 165, units: 2, dmg: 13, rate: 1.1, range: 3.2, splash: 0.7, orbit: 3, speed: 150, dtype: "blast",
      forms: ["Perchoir de ptérodactyles", "Nid de griffons", "Piste de biplans", "Base de chasseurs", "Hangar de vaisseaux"],
      unitNames: ["Ptérodactyle", "Griffon", "Avion", "Chasseur", "Vaisseau"], info: "Avions qui patrouillent et bombardent autour d'un point." },
    heli: { name: "Héliport", cat: "air", kind: "heli", size: 2, minAge: 2, cost: 215, units: 1, dmg: 6, rate: 4, range: 4.6, splash: 1.1, rocket: 5.5, speed: 120, dtype: "phys",
      forms: ["Perchoir d'aigles", "Montgolfière à glands", "Héliport", "Base d'Apaches", "Drones d'assaut"],
      unitNames: ["Aigle", "Montgolfière", "Hélicoptère", "Apache", "Drone"], info: "Hélicoptère stationnaire : mitrailleuse + roquettes." },

    banner: { name: "Bannière", cat: "aide", kind: "banner", size: 1, minAge: 0, cost: 125, radius: 4.3,
      buffRate: [0.12, 0.16, 0.21, 0.27, 0.34], buffDmg: [0.1, 0.15, 0.2, 0.3, 0.4], buffRange: [0, 0.03, 0.05, 0.08, 0.1],
      forms: ["Totem de queue", "Bannière du Grand Chêne", "Poste de commandement", "Centre de commandement", "Réseau IA"],
      info: "Aura : cadence, dégâts et portée des alliés proches." },
  };
  var LINE_ORDER = ["tour", "sniper", "mortar", "fire", "glue", "freeze", "shock", "aa", "mine", "pit", "ramp", "barracks", "lancers", "garrison", "airfield", "heli", "banner"];

  // niveaux manuels (1..3) : multiplicateurs de stats et de prix d'amélioration
  var LEVELS = { dmg: [1, 1.35, 1.85], rate: [1, 1.1, 1.22], range: [1, 1.05, 1.1], cost: [0, 0.8, 1.5] };

  /* ---------- ENNEMIS ----------
     hp de base (× hpMul de la vague), speed px/s, armor 0..1, rew or, lives vies perdues,
     r rayon, air volant, res résistance aux contrôles (stun/gel) 0..1. */
  var ENEMIES = {
    grunt:   { name: "Limace",   hp: 24,  speed: 38, armor: 0,    rew: 4,  lives: 1, r: 8,  cost: 1 },
    runner:  { name: "Lapin", hp: 18, speed: 72, armor: 0,    rew: 4,  lives: 1, r: 7,  cost: 1 },
    brute:   { name: "Blaireau",    hp: 150, speed: 26, armor: 0.15, rew: 12, lives: 2, r: 12, cost: 3, atk: 9 },
    shield:  { name: "Hérisson", hp: 95,  speed: 32, armor: 0.5,  rew: 10, lives: 2, r: 9,  cost: 2.5 },
    healer:  { name: "Grenouille",    hp: 62,  speed: 34, armor: 0,    rew: 10, lives: 1, r: 8,  cost: 3, heal: 0.06 },
    tank:    { name: "Sanglier",   hp: 520, speed: 28, armor: 0.6,  rew: 40, lives: 5, r: 14, cost: 8, atk: 16, res: 0.4 },
    bird:    { name: "Guêpe", hp: 52, speed: 62, armor: 0, rew: 8,  lives: 1, r: 8,  cost: 1.5, air: true },
    chopper: { name: "Corbeau", hp: 330, speed: 46, armor: 0.3, rew: 36, lives: 4, r: 12, cost: 7, air: true, res: 0.3 },
    boss:    { name: "Golem de racines",  hp: 1500, speed: 20, armor: 0.35, rew: 320, lives: 20, r: 20, cost: 60, atk: 28, res: 0.75 },
  };
  var ENEMY_ORDER = ["grunt", "runner", "brute", "shield", "healer", "tank", "bird", "chopper", "boss"];

  // PV des ennemis selon la manche (n ≥ 1)
  function hpMul(n) { return 1 + n * 0.17 + n * n * 0.0095; }

  /* Composition d'une manche : liste de groupes { type, count, gap (s), delay (s) } —
     déterministe (même manche = même composition, utile en versus). */
  function waveDef(n) {
    var budget = 6 + n * 3.4, groups = [], t = 0;
    var seed = n * 7919 + 13;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var pool = [["grunt", 0], ["runner", 3], ["brute", 5], ["bird", 8], ["shield", 7], ["healer", 9], ["tank", 12], ["chopper", 15]];
    var avail = pool.filter(function (p) { return n >= p[1]; });
    if (n % 10 === 0) { groups.push({ type: "boss", count: 1, gap: 1, delay: 1 }); budget *= 0.45; t = 4; }
    var guard = 0;
    while (budget > 0.8 && guard++ < 12) {
      // plus on est cher, plus c'est rare ; les nouveautés (4 manches) sont mises en avant
      var ws = avail.map(function (p) { return Math.pow(ENEMIES[p[0]].cost, -0.8) * (n - p[1] < 4 && p[1] > 0 ? 1.6 : 1); });
      var tot = ws.reduce(function (a, c) { return a + c; }, 0), r = rnd() * tot, k = 0;
      while (k < ws.length - 1 && r > ws[k]) { r -= ws[k]; k++; }
      var ty = avail[k][0], c = ENEMIES[ty].cost;
      var cnt = Math.max(1, Math.min(Math.floor(budget / c), 2 + Math.floor(rnd() * 5)));
      groups.push({ type: ty, count: cnt, gap: Math.max(0.35, 1.1 - n * 0.012 + c * 0.1), delay: t });
      t += cnt * 0.6 + 1.4;
      budget -= cnt * c;
    }
    return groups;
  }

  /* ---------- ENVOIS DE TROUPES (versus) ---------- */
  var SENDS = [
    { id: "grunt",  name: "Limaces",   ico: "🐌", type: "grunt",  count: 5, cost: 40,  inc: 2 },
    { id: "runner", name: "Lapins",     ico: "🐇", type: "runner", count: 5, cost: 55,  inc: 3 },
    { id: "brute",  name: "Blaireaux",       ico: "🦡", type: "brute",  count: 2, cost: 80,  inc: 5 },
    { id: "shield", name: "Hérissons",    ico: "🦔", type: "shield", count: 3, cost: 100, inc: 6 },
    { id: "bird",   name: "Guêpes",      ico: "🐝", type: "bird",   count: 4, cost: 110, inc: 7 },
    { id: "tank",   name: "Sanglier",       ico: "🐗", type: "tank",   count: 1, cost: 190, inc: 14 },
    { id: "chopper", name: "Corbeau",      ico: "🐦‍⬛", type: "chopper", count: 1, cost: 260, inc: 20 },
  ];

  /* ---------- CARTES ----------
     Routes larges : chaque chemin est une polyligne (en cases, centre de case = x+.5) et une demi-largeur hw (cases).
     W × H cases. theme : palette du décor. */
  var MAPS = [
    { id: "vallee", name: "Vallée verte", theme: "prairie", W: 40, H: 24, hw: 1.6, desc: "Route en S, grands îlots d'herbe.",
      paths: [[[-2, 4.5], [34.5, 4.5], [34.5, 11.5], [5.5, 11.5], [5.5, 18.5], [42, 18.5]]] },
    { id: "croisement", name: "Croisement", theme: "desert", W: 40, H: 24, hw: 1.6, desc: "Deux entrées qui fusionnent.",
      paths: [[[-2, 3.5], [14.5, 3.5], [14.5, 11.5], [42, 11.5]], [[-2, 20.5], [14.5, 20.5], [14.5, 11.5], [42, 11.5]]] },
    { id: "spirale", name: "Spirale gelée", theme: "neige", W: 40, H: 24, hw: 1.6, desc: "Longue spirale vers le centre.",
      paths: [[[-2, 2.5], [37.5, 2.5], [37.5, 21.5], [2.5, 21.5], [2.5, 7.5], [31.5, 7.5], [31.5, 16.5], [12.5, 16.5]]] },
    { id: "volcan", name: "Anneau de feu", theme: "volcan", W: 40, H: 24, hw: 1.6, desc: "La route se sépare puis se rejoint.",
      paths: [[[-2, 11.5], [7.5, 11.5], [7.5, 3.5], [32.5, 3.5], [32.5, 11.5], [42, 11.5]], [[-2, 11.5], [7.5, 11.5], [7.5, 20.5], [32.5, 20.5], [32.5, 11.5], [42, 11.5]]] },
    { id: "canyon", name: "Canyon (portrait)", theme: "canyon", W: 24, H: 36, hw: 1.6, desc: "Grande route verticale, idéale au téléphone.",
      paths: [[[4.5, -2], [4.5, 10.5], [19.5, 10.5], [19.5, 22.5], [4.5, 22.5], [4.5, 33.5], [26, 33.5]]] },
  ];

  /* ---------- THÈMES DE DÉCOR ---------- */
  var THEMES = {
    prairie: { grass: [134, 196, 62], grass2: [155, 216, 71], hi: [201, 240, 106], road: [233, 201, 140], road2: [244, 220, 166], cliff1: [185, 118, 58], cliff2: [138, 82, 38], deco: "tree" },
    desert:  { grass: [236, 200, 110], grass2: [247, 217, 134], hi: [255, 238, 170], road: [196, 128, 78], road2: [214, 150, 96], cliff1: [176, 92, 52], cliff2: [120, 58, 34], deco: "cactus" },
    neige:   { grass: [226, 241, 252], grass2: [244, 251, 255], hi: [255, 255, 255], road: [150, 196, 226], road2: [176, 216, 240], cliff1: [120, 168, 208], cliff2: [70, 110, 160], deco: "pine" },
    volcan:  { grass: [92, 72, 96], grass2: [112, 90, 116], hi: [158, 132, 158], road: [168, 72, 48], road2: [212, 104, 52], cliff1: [64, 40, 56], cliff2: [36, 22, 36], deco: "rock" },
    canyon:  { grass: [214, 142, 84], grass2: [232, 164, 100], hi: [250, 196, 130], road: [120, 158, 172], road2: [146, 186, 198], cliff1: [170, 84, 50], cliff2: [110, 50, 34], deco: "rock" },
  };

  /* ---------- AMÉLIORATIONS HORS PARTIE (acquises avec les étoiles) ---------- */
  var META = [
    { id: "gold", name: "Caisse de guerre", ico: "💰", desc: "+60 noisettes de départ par niveau", max: 6, cost: [4, 8, 14, 22, 34, 50], fmt: function (l) { return "+" + l * 60 + " or"; } },
    { id: "income", name: "Économie de guerre", ico: "🏦", desc: "+6 % de revenu (manches et éliminations) par niveau", max: 6, cost: [5, 10, 17, 26, 38, 55], fmt: function (l) { return "+" + l * 6 + " %"; } },
    { id: "lives", name: "Murailles", ico: "🏰", desc: "+2 vies par niveau", max: 5, cost: [4, 9, 16, 26, 40], fmt: function (l) { return "+" + l * 2 + " vies"; } },
    { id: "dmg", name: "Armurerie", ico: "🗡️", desc: "+4 % de dégâts par niveau", max: 8, cost: [5, 9, 14, 20, 28, 38, 50, 66], fmt: function (l) { return "+" + l * 4 + " %"; } },
    { id: "range", name: "Longue-vue", ico: "🔭", desc: "+3 % de portée par niveau", max: 5, cost: [6, 12, 20, 32, 48], fmt: function (l) { return "+" + l * 3 + " %"; } },
    { id: "troops", name: "Entraînement", ico: "🎖️", desc: "+8 % de PV des troupes par niveau", max: 6, cost: [4, 8, 14, 22, 32, 46], fmt: function (l) { return "+" + l * 8 + " %"; } },
    { id: "tech", name: "Recherche", ico: "🔬", desc: "-5 % sur le prix des âges par niveau", max: 6, cost: [6, 11, 18, 28, 42, 60], fmt: function (l) { return "-" + l * 5 + " %"; } },
    { id: "cheap", name: "Intendance", ico: "🧰", desc: "-3 % sur le prix des constructions par niveau", max: 6, cost: [5, 10, 16, 24, 35, 50], fmt: function (l) { return "-" + l * 3 + " %"; } },
  ];

  var DIFFS = [
    { id: "easy", name: "Facile", hp: 0.8, gold: 1.2, stars: 0.7 },
    { id: "normal", name: "Normal", hp: 1, gold: 1, stars: 1 },
    { id: "hard", name: "Difficile", hp: 1.35, gold: 0.9, stars: 1.5 },
  ];

  var D = {
    T: T, AGES: AGES, CATS: CATS, LINES: LINES, LINE_ORDER: LINE_ORDER, LEVELS: LEVELS, ENEMIES: ENEMIES, ENEMY_ORDER: ENEMY_ORDER,
    hpMul: hpMul, waveDef: waveDef, SENDS: SENDS, MAPS: MAPS, THEMES: THEMES, META: META, DIFFS: DIFFS,
    START_GOLD: 240, START_LIVES: 20, WIN_WAVE: 40, SELL: 0.7, VERSUS_WAVE_EVERY: 38, COOP_WAIT: 18,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = D;
  root.AGES_DATA = D;
})(typeof window !== "undefined" ? window : globalThis);
