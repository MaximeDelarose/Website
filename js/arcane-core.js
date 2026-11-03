/* =========================================================================
   Arcane Tactics — règles du jeu, sans DOM
   (le rendu, les commandes et le réseau sont dans js/arcane.js)

   RPG tactique isométrique coop à 2 : exploration case par case, combats
   au tour par tour (PA / PM), 3 héros inspirés des pièces d'échecs
   (Bastion = la tour, Prisme = le fou, Voltige = le cavalier), monstres,
   zones, donjon, quêtes, et surtout du BUTIN ALÉATOIRE après chaque
   combat : objets à raretés, grosses caractéristiques, +1 PA, +1 PM, +PO
   et pouvoirs légendaires.

   Tout le monde du jeu (w) est un objet JSON : l'hôte le fait avancer et
   l'envoie tel quel à l'invité. Les cartes d'exploration ne sont pas
   envoyées : elles sont générées à l'identique à partir de leur graine.

   Testable dans Node :
     const A = require("./js/arcane-core.js");
     const w = A.createWorld({ players: [{ name: "Moi", profile: A.newProfile("bastion") }] });
     A.cmd(w, 0, { t: "walk", x: 10, y: 8 }); A.step(w, 1);
   ========================================================================= */
(function (root) {
  "use strict";

  /* ====================== RÉGLAGES GÉNÉRAUX ====================== */
  var CFG = {
    maxLevel: 15,
    exploreStep: 0.2,          // s par case en exploration
    packWander: [2.5, 6],      // s entre deux pas d'un groupe de monstres
    respawn: 35,               // s avant qu'un groupe battu revienne
    caps: { pa: 12, pm: 7, po: 4, res: 50, crit: 60 },
    dropChance: 0.5,           // chance qu'un monstre normal lâche un objet (par joueur)
    eliteChance: 0.12,
    pushDmg: 9,                // dégâts par case de poussée bloquée
    dungeonHeal: 0.4,          // part des PV rendue entre deux salles du donjon
  };

  /* ====================== HASARD ====================== */
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  var R = Math.random;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
  function key(x, y) { return x + "," + y; }

  /* ====================== HÉROS ====================== */
  var CLASSES = {
    bastion: {
      name: "Bastion", role: "Tank · contrôle des lignes", piece: "Tour",
      desc: "Protège son partenaire, pousse, attire et coupe le terrain avec des murs.",
      hp: 120, hpL: 12, pa: 6, pm: 3, res: 12, ini: 10, crit: 5, el: "terre",
      base: { vit: 20, sag: 0, for: 25, int: 0, cha: 0, agi: 5 },
      spells: ["impact", "rempart", "mur", "attraction", "forteresse"],
    },
    prisme: {
      name: "Prisme", role: "Mage · soutien des diagonales", piece: "Fou",
      desc: "Frappe en diagonale, soigne, place des cristaux relais et téléporte ses alliés.",
      hp: 90, hpL: 8, pa: 6, pm: 3, res: 0, ini: 12, crit: 8, el: "feu",
      base: { vit: 5, sag: 10, for: 0, int: 30, cha: 0, agi: 5 },
      spells: ["rayon", "balise", "transpo", "onde", "convergence"],
    },
    voltige: {
      name: "Voltige", role: "Assassin · bonds en L", piece: "Cavalier",
      desc: "Bondit en L par-dessus les obstacles, frappe fort au contact et passe derrière les ennemis.",
      hp: 95, hpL: 9, pa: 6, pm: 4, res: 0, ini: 16, crit: 12, el: "air",
      base: { vit: 5, sag: 0, for: 0, int: 0, cha: 5, agi: 35 },
      spells: ["bond", "frappe", "fantome", "brume", "danse"],
    },
    sibylle: {
      name: "Sibylle", role: "Invocatrice · pions d'encre", piece: "Pion",
      desc: "Fragile, mais jamais seule : ses pions d'encre se battent tout seuls à ses côtés. Elle les promeut en Dame et les sacrifie au bon moment.",
      hp: 85, hpL: 7, pa: 6, pm: 3, res: 0, ini: 11, crit: 6, el: "eau",
      base: { vit: 10, sag: 5, for: 0, int: 10, cha: 25, agi: 0 },
      spells: ["pion", "promotion", "sacrifice", "roque", "maree"],
    },
    clarine: {
      name: "Clarine", role: "Soigneuse · feu sacré", piece: "Roi",
      desc: "Soigne ses alliés de loin, les protège, et brûle les ennemis avec le même feu. Jamais inutile, jamais en première ligne.",
      hp: 95, hpL: 8, pa: 6, pm: 3, res: 5, ini: 9, crit: 5, el: "feu",
      base: { vit: 10, sag: 10, for: 0, int: 35, cha: 0, agi: 0 },
      spells: ["lueur", "eclat", "benediction", "rayonnement", "aurore"],
    },
    orage: {
      name: "Orage", role: "Cogneuse · lignes et diagonales", piece: "Dame",
      desc: "Frappe comme une dame d'échecs : loin, fort, dans toutes les directions. Mais personne ne la soigne à part ses alliés.",
      hp: 110, hpL: 10, pa: 6, pm: 3, res: 5, ini: 12, crit: 10, el: "terre",
      base: { vit: 10, sag: 0, for: 40, int: 0, cha: 0, agi: 5 },
      spells: ["foudre", "fracas", "trombe", "transe", "jugement"],
    },
    ondine: {
      name: "Ondine", role: "Maîtresse des zones · eau", piece: "Fou",
      desc: "Vagues, geysers et déferlantes : tous ses sorts touchent plusieurs cases. Placement des ennemis = dégâts doublés.",
      hp: 92, hpL: 8, pa: 6, pm: 3, res: 0, ini: 11, crit: 7, el: "eau",
      base: { vit: 5, sag: 5, for: 0, int: 5, cha: 35, agi: 0 },
      spells: ["vague", "geyser", "deferlante", "rosee", "razdemaree"],
    },
  };
  var CLASS_IDS = ["bastion", "prisme", "voltige", "sibylle", "clarine", "orage", "ondine"];
  var ELEMENTS = { terre: { name: "Terre", stat: "for", col: "#c98a3a" }, feu: { name: "Feu", stat: "int", col: "#ff7b4a" }, eau: { name: "Eau", stat: "cha", col: "#4fb6dd" }, air: { name: "Air", stat: "agi", col: "#7df0c2" } };
  // invocations : des IA alliées (elles jouent toutes seules juste après leur invocatrice)
  var SUMMONS = {
    pion: { name: "Pion d'encre", hp: 20, hpL: 3, pa: 3, pm: 3, ini: 6, spells: ["pointe"], desc: "Petit, nombreux, et il avance tout seul vers l'ennemi. Promu en Dame, il devient redoutable." },
    dame: { name: "Dame d'encre", hp: 54, hpL: 7, pa: 4, pm: 4, ini: 9, spells: ["ravage", "pointe"], desc: "La pièce promue : frappe en ligne et en diagonale, toute seule." },
  };
  var SUMMON_MAX = 3;
  var ULT_LEVEL = 5;

  /* Sorts.
     steps : une étape de ciblage par clic.
       shape : line (ligne droite) | diag | any (distance de Manhattan) | knight (L exact) | self | ray (une des 4 diagonales)
       range : [min, max] ; boost : la portée des objets s'ajoute
       los : ligne de vue nécessaire
       target : enemy | ally | allyOrBeacon | empty | cell | self
       from : caster (défaut) | prev (la case de l'étape précédente) | relay (le lanceur ou un de ses cristaux)
     minSteps : étapes minimum (le reste est facultatif, on valide avec « Lancer ») */
  var SPELLS = {
    // ---------- Bastion ----------
    impact: { name: "Impact rectiligne", pa: 3, el: "terre", icon: "impact", dmg: 22, push: 1, perTurn: 2,
      desc: "Ligne droite, 1 à 3 cases. 22 dégâts et repousse d'une case (une poussée bloquée blesse).",
      steps: [{ shape: "line", range: [1, 3], boost: true, los: true, target: "enemy" }] },
    rempart: { name: "Rempart", pa: 2, icon: "rempart", shield: 25, perTurn: 2, perTarget: 1,
      desc: "Bouclier de 25 sur soi ou un allié proche, jusqu'à ton prochain tour.",
      steps: [{ shape: "any", range: [0, 3], los: true, target: "ally" }] },
    mur: { name: "Mur runique", pa: 3, icon: "mur", cd: 2, dur: 2,
      desc: "Fait surgir un mur de 2 cases pendant 2 tours. Bloque le passage et la ligne de vue.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: true, target: "empty" }] },
    attraction: { name: "Attraction", pa: 2, el: "terre", icon: "attraction", dmg: 6, pull: 2, perTurn: 1,
      desc: "Attire un ennemi de 2 cases vers toi, en ligne droite. Parfait pour préparer un combo.",
      steps: [{ shape: "line", range: [2, 5], boost: true, los: true, target: "enemy" }] },
    forteresse: { name: "Forteresse vivante", pa: 5, icon: "forteresse", ult: true, cd: 4, shield: 40,
      desc: "ULTIME. Bouclier de 40 et +25 % de résistance aux alliés à 2 cases, repousse les ennemis collés.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    // ---------- Prisme ----------
    rayon: { name: "Rayon oblique", pa: 3, el: "feu", icon: "rayon", dmg: 20, perTurn: 2,
      desc: "Diagonale, 2 à 5 cases. 20 dégâts. Peut partir d'un de tes cristaux.",
      steps: [{ shape: "diag", range: [2, 5], boost: true, los: true, target: "enemy", from: "relay" }] },
    balise: { name: "Balise prismatique", pa: 2, icon: "balise", dur: 3, max: 2, hp: 20,
      desc: "Pose un cristal (3 tours, 2 max). Tes rayons et soins peuvent partir du cristal. Il bloque le passage.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: false, target: "empty" }] },
    transpo: { name: "Transposition", pa: 3, icon: "transpo", cd: 1,
      desc: "Choisis un allié (ou un cristal) puis une case libre à 4 cases de lui : il s'y téléporte.",
      steps: [{ shape: "any", range: [1, 5], los: false, target: "allyOrBeacon" }, { shape: "any", range: [1, 4], los: false, target: "empty", from: "prev" }] },
    onde: { name: "Onde réparatrice", pa: 3, icon: "onde", heal: 24, perTurn: 1,
      desc: "Rend 24 PV à un allié ou à toi. Peut partir d'un cristal.",
      steps: [{ shape: "any", range: [0, 4], boost: true, los: true, target: "ally", from: "relay" }] },
    convergence: { name: "Convergence astrale", pa: 5, el: "feu", icon: "convergence", ult: true, cd: 4, dmg: 30, heal: 15,
      desc: "ULTIME. Choisis 1 ou 2 diagonales : des rayons les traversent (et partent aussi de tes cristaux). 30 dégâts aux ennemis, 15 PV aux alliés.",
      minSteps: 1,
      steps: [{ shape: "ray", range: [1, 12], los: false, target: "cell" }, { shape: "ray", range: [1, 12], los: false, target: "cell" }] },
    // ---------- Voltige ----------
    bond: { name: "Bond du cavalier", pa: 2, icon: "bond", perTurn: 2,
      desc: "Saut en L exact (2 + 1 cases), par-dessus les obstacles. La case d'arrivée doit être libre.",
      steps: [{ shape: "knight", range: [0, 0], los: false, target: "empty" }] },
    frappe: { name: "Frappe éclair", pa: 3, el: "air", icon: "frappe", dmg: 26, perTurn: 2,
      desc: "Au contact. 26 dégâts, frappe lourde.",
      steps: [{ shape: "any", range: [1, 1], los: true, target: "enemy" }] },
    fantome: { name: "Passage fantôme", pa: 3, el: "air", icon: "fantome", dmg: 18, cd: 1,
      desc: "Se téléporte derrière un ennemi proche (case libre) et lui inflige 18 dégâts.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: true, target: "enemy" }] },
    brume: { name: "Brume fractale", pa: 2, icon: "brume", cd: 1, dur: 1,
      desc: "Nuage en croix jusqu'à ton prochain tour : bloque les lignes de vue.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: false, target: "cell" }] },
    danse: { name: "Danse du cavalier", pa: 5, el: "air", icon: "danse", ult: true, cd: 4, dmg: 20,
      desc: "ULTIME. Jusqu'à 3 bonds en L d'affilée : chaque atterrissage inflige 20 dégâts aux ennemis autour.",
      minSteps: 1,
      steps: [{ shape: "knight", range: [0, 0], target: "empty", from: "prev" }, { shape: "knight", range: [0, 0], target: "empty", from: "prev" }, { shape: "knight", range: [0, 0], target: "empty", from: "prev" }] },
    // ---------- Sibylle ----------
    pion: { name: "Pion d'encre", pa: 2, icon: "pion", perTurn: 2,
      desc: "Invoque un Pion d'encre sur une case libre à côté de toi (3 invocations max). Il joue juste après toi : 3 PA, 3 PM, une pointe au contact.",
      steps: [{ shape: "any", range: [1, 2], los: false, target: "empty" }] },
    promotion: { name: "Promotion", pa: 3, icon: "promotion", cd: 2,
      desc: "Comme un pion qui atteint la dernière rangée : un de tes Pions devient une Dame d'encre (plus de PV, 4 PA, 4 PM, attaque en ligne et en diagonale). Une seule Dame à la fois.",
      steps: [{ shape: "any", range: [1, 6], los: false, target: "summon" }] },
    sacrifice: { name: "Sacrifice", pa: 2, el: "eau", icon: "sacrifice", dmg: 16, heal: 18, perTurn: 2,
      desc: "Une de tes invocations éclate : 16 dégâts aux ennemis collés, 18 PV aux alliés à 2 cases (toi compris).",
      steps: [{ shape: "any", range: [0, 8], los: false, target: "summon" }] },
    roque: { name: "Roque", pa: 2, icon: "roque", cd: 1,
      desc: "Tu échanges ta place avec une de tes invocations, où qu'elle soit. Pour fuir, ou envoyer un pion en première ligne.",
      steps: [{ shape: "any", range: [1, 12], los: false, target: "summon" }] },
    maree: { name: "Marée d'encre", pa: 5, icon: "maree", ult: true, cd: 4, shield: 12,
      desc: "ULTIME. Trois Pions d'encre surgissent autour de toi (dans la limite de 3 invocations) et toutes tes invocations gagnent un bouclier de 12 et +1 PA ce tour.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    // ---------- Clarine ----------
    lueur: { name: "Lueur", pa: 3, icon: "lueur", heal: 26, perTurn: 2,
      desc: "Rend 26 PV à un allié jusqu'à 5 cases (ou à toi). Monte avec l'Intelligence.",
      steps: [{ shape: "any", range: [0, 5], boost: true, los: true, target: "ally" }] },
    eclat: { name: "Éclat sacré", pa: 3, icon: "eclat", el: "feu", dmg: 20, perTurn: 2,
      desc: "Feu, 1 à 4 cases. 20 dégâts : la soigneuse frappe aussi.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: true, target: "enemy" }] },
    benediction: { name: "Bénédiction", pa: 2, icon: "benediction", heal: 12, shield: 12, cd: 1,
      desc: "Un allié reçoit 12 PV et un bouclier de 12 jusqu'à ton prochain tour.",
      steps: [{ shape: "any", range: [0, 4], boost: true, los: true, target: "ally" }] },
    rayonnement: { name: "Rayonnement", pa: 3, icon: "rayonnement", el: "feu", dmg: 14, heal: 10, cd: 2,
      desc: "Zone autour de toi (2 cases) : 14 dégâts de feu aux ennemis, 10 PV aux alliés.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    aurore: { name: "Aurore", pa: 5, icon: "aurore", ult: true, cd: 4, el: "feu", dmg: 24, heal: 40,
      desc: "ULTIME. Tous tes alliés, où qu'ils soient, récupèrent 40 PV ; les ennemis à 3 cases prennent 24 dégâts de feu.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    // ---------- Orage ----------
    foudre: { name: "Foudre", pa: 4, icon: "foudre", el: "terre", dmg: 32, perTurn: 2,
      desc: "Comme une dame : en ligne ou en diagonale, 1 à 5 cases. 32 dégâts.",
      steps: [{ shape: "queen", range: [1, 5], boost: true, los: true, target: "enemy" }] },
    fracas: { name: "Fracas", pa: 3, icon: "fracas", el: "terre", dmg: 36, cd: 1,
      desc: "Au contact. 36 dégâts. Lourd.",
      steps: [{ shape: "any", range: [1, 1], los: true, target: "enemy" }] },
    trombe: { name: "Trombe", pa: 3, icon: "trombe", el: "terre", dmg: 24, push: 2, perTurn: 1,
      desc: "Ligne droite, 1 à 3 cases. 24 dégâts et repousse de 2 cases (poussée bloquée = dégâts en plus).",
      steps: [{ shape: "line", range: [1, 3], boost: true, los: true, target: "enemy" }] },
    transe: { name: "Transe", pa: 2, icon: "transe", perTurn: 1,
      desc: "+25 dommages sur tous tes coups jusqu'à la fin de ton tour.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    jugement: { name: "Jugement", pa: 5, icon: "jugement", ult: true, cd: 4, el: "terre", dmg: 30,
      desc: "ULTIME. Huit rayons partent de toi (lignes et diagonales) : 30 dégâts à chaque ennemi traversé.",
      steps: [{ shape: "self", range: [0, 0], target: "self" }] },
    // ---------- Ondine ----------
    vague: { name: "Vague", pa: 3, icon: "vague", el: "eau", dmg: 19, perTurn: 2,
      desc: "Vise une case à 2–5 cases : croix de 5 cases, 19 dégâts d'eau à chaque ennemi.",
      steps: [{ shape: "any", range: [2, 5], boost: true, los: true, target: "cell" }] },
    geyser: { name: "Geyser", pa: 4, icon: "geyser", el: "eau", dmg: 23, push: 1, perTurn: 1,
      desc: "Vise une case à 1–4 cases : 23 dégâts à tout ce qui est à 1 case autour, et ça repousse.",
      steps: [{ shape: "any", range: [1, 4], boost: true, los: true, target: "cell" }] },
    deferlante: { name: "Déferlante", pa: 3, icon: "deferlante", el: "eau", dmg: 20, perTurn: 1,
      desc: "Choisis une direction (case à côté de toi) : une lame de 4 cases part de toi, 20 dégâts à chaque ennemi.",
      steps: [{ shape: "line", range: [1, 1], los: false, target: "cell" }] },
    rosee: { name: "Rosée", pa: 2, icon: "rosee", heal: 10, perTurn: 1,
      desc: "Petite pluie : 10 PV aux alliés dans une croix autour de la cible (toi compris).",
      steps: [{ shape: "any", range: [0, 4], los: true, target: "ally" }] },
    razdemaree: { name: "Raz-de-marée", pa: 5, icon: "razdemaree", ult: true, cd: 4, el: "eau", dmg: 34, heal: 8,
      desc: "ULTIME. Vise une case à 1–5 cases : 34 dégâts d'eau à tous les ennemis à 2 cases autour, 8 PV aux alliés.",
      steps: [{ shape: "any", range: [1, 5], boost: true, los: false, target: "cell" }] },
  };
  function spellsOf(u) { return u.summon ? [] : CLASSES[u.cls].spells; }

  /* ====================== MONSTRES ====================== */
  var MOB_SPELLS = {
    gobe: { name: "Gobe", pa: 3, range: [1, 1], shape: "any", los: true, dmg: 11 },
    mandibule: { name: "Mandibules", pa: 2, range: [1, 1], shape: "any", los: true, dmg: 8 },
    fouet: { name: "Fouet épineux", pa: 3, range: [1, 2], shape: "line", los: true, dmg: 13 },
    flamme: { name: "Flamme follette", pa: 3, range: [2, 6], shape: "any", los: true, dmg: 11 },
    souffle: { name: "Souffle d'éther", pa: 3, range: [1, 4], shape: "any", los: true, dmg: 9 },
    rosee: { name: "Rosée", pa: 3, range: [0, 5], shape: "any", los: true, heal: 18 },
    rune: { name: "Coup de rune", pa: 4, range: [1, 1], shape: "any", los: true, dmg: 19, push: 1 },
    eclat: { name: "Éclat de cristal", pa: 3, range: [1, 3], shape: "diag", los: true, dmg: 14 },
    pique: { name: "Pique fractale", pa: 3, range: [1, 2], shape: "line", los: true, dmg: 22 },
    sentence: { name: "Sentence", pa: 4, range: [0, 0], shape: "self", telegraph: true, dmg: 34 },
    appel: { name: "Appel du vide", pa: 3, range: [0, 0], shape: "self", summon: "glorbe", cd: 3 },
    racines: { name: "Racines", pa: 4, range: [0, 0], shape: "self", telegraph: true, dmg: 22 },
    sucre: { name: "Jet de sucre", pa: 3, range: [1, 3], shape: "any", los: true, dmg: 13 },
    langue: { name: "Coup de langue", pa: 3, range: [1, 3], shape: "line", los: true, dmg: 14, pull: 2 },
    cocon: { name: "Câlin cotonneux", pa: 3, range: [0, 4], shape: "any", los: true, heal: 22 },
    eclair: { name: "Petit éclair", pa: 3, range: [2, 5], shape: "any", los: true, dmg: 16 },
    tictac: { name: "Tic-tac", pa: 4, range: [1, 1], shape: "any", los: true, dmg: 24 },
    rembobine: { name: "Rembobinage", pa: 3, range: [0, 0], shape: "self", los: false, heal: 30, cd: 3 },
    calin: { name: "Gros câlin", pa: 4, range: [1, 1], shape: "any", los: true, dmg: 22, push: 2 },
    pluie: { name: "Pluie de sucre", pa: 4, range: [0, 0], shape: "self", telegraph: true, dmg: 28 },
    sucreries: { name: "Appel des sucreries", pa: 3, range: [0, 0], shape: "self", summon: "bonbonk", cd: 3 },
    carillon: { name: "Carillon", pa: 5, range: [0, 0], shape: "self", telegraph: true, dmg: 38 },
    aiguilles: { name: "Aiguilles", pa: 3, range: [1, 3], shape: "line", los: true, dmg: 26 },
    lierre: { name: "Appel du lierre", pa: 3, range: [0, 0], shape: "self", summon: "ronceau", cd: 3 },
    // invocations alliées
    pointe: { name: "Pointe", pa: 2, range: [1, 1], shape: "any", los: true, dmg: 11 },
    ravage: { name: "Ravage", pa: 3, range: [1, 4], shape: "queen", los: true, dmg: 19 },
  };
  var MOBS = {
    glorbe: { name: "Glorbe", hp: 34, pa: 4, pm: 3, ini: 8, res: 0, spells: ["gobe"], xp: 10, col: "#5fd3c0", shape: "blob" },
    scarabrume: { name: "Scarabrume", hp: 30, pa: 4, pm: 5, ini: 14, res: 0, spells: ["mandibule"], xp: 11, col: "#7a8cf0", shape: "beetle" },
    ronceau: { name: "Ronceau", hp: 56, pa: 5, pm: 2, ini: 5, res: 10, spells: ["fouet"], xp: 14, col: "#7fb257", shape: "bush" },
    lanterneau: { name: "Lanterneau", hp: 32, pa: 6, pm: 3, ini: 10, res: 0, spells: ["flamme"], ranged: true, xp: 14, col: "#ffb347", shape: "lantern" },
    sylphe: { name: "Sylphe fêlée", hp: 38, pa: 6, pm: 3, ini: 12, res: 5, spells: ["rosee", "souffle"], ranged: true, healer: true, xp: 16, col: "#c7a6ff", shape: "sylph" },
    golem: { name: "Golem de rune", hp: 92, pa: 6, pm: 2, ini: 4, res: 20, spells: ["rune"], xp: 22, col: "#a99a86", shape: "golem" },
    cristallin: { name: "Cristallin", hp: 44, pa: 6, pm: 3, ini: 11, res: 10, spells: ["eclat"], ranged: true, xp: 18, col: "#8fe6ff", shape: "shard" },
    bonbonk: { name: "Bonbonk", hp: 42, pa: 5, pm: 3, ini: 9, res: 5, spells: ["sucre"], ranged: true, xp: 17, col: "#ff7bb0", shape: "candy" },
    grenouillon: { name: "Grenouillon", hp: 50, pa: 5, pm: 5, ini: 13, res: 0, spells: ["langue"], xp: 18, col: "#6fd36a", shape: "frog" },
    nuagelet: { name: "Nuagelet", hp: 48, pa: 6, pm: 3, ini: 10, res: 10, spells: ["cocon", "eclair"], ranged: true, healer: true, xp: 24, col: "#f7f3ff", shape: "cloudsheep" },
    horlogeon: { name: "Horlogeon", hp: 80, pa: 6, pm: 3, ini: 7, res: 20, spells: ["tictac", "rembobine"], xp: 28, col: "#d9a441", shape: "clock" },
    guimauve: { name: "Reine Guimauve", hp: 340, pa: 8, pm: 2, ini: 8, res: 10, spells: ["pluie", "sucreries", "calin"], boss: true, xp: 300, col: "#ffb3d9", shape: "queen" },
    tictac: { name: "Grand Tic-Tac", hp: 560, pa: 9, pm: 2, ini: 10, res: 20, spells: ["carillon", "aiguilles", "rembobine"], boss: true, xp: 520, col: "#c48a2a", shape: "bigclock" },
    sentinelle: { name: "Sentinelle d'Incarnam", hp: 190, pa: 7, pm: 2, ini: 6, res: 10, spells: ["racines", "lierre", "rune"], boss: true, xp: 160, col: "#8fa37a", shape: "statue" },
    archonte: { name: "Archonte fractal", hp: 460, pa: 8, pm: 2, ini: 9, res: 15, spells: ["sentence", "appel", "pique"], boss: true, xp: 420, col: "#d36cff", shape: "boss" },
  };
  var AFFIXES = {
    enrage: { name: "Enragé", pow: 30 },
    blinde: { name: "Blindé", res: 20 },
    rapide: { name: "Rapide", pm: 2 },
    arcanique: { name: "Arcanique", pa: 3 },
    geant: { name: "Géant", hpMul: 1.6 },
    vampire: { name: "Vampire", vamp: 30 },
  };
  var AFFIX_IDS = Object.keys(AFFIXES);

  /* ====================== BUTIN ====================== */
  var SLOTS = ["arme", "coiffe", "cape", "amulette", "anneau", "bottes"];
  var SLOT_NAME = { arme: "Arme", coiffe: "Coiffe", cape: "Cape", amulette: "Amulette", anneau: "Anneau", bottes: "Bottes" };
  var RARITIES = [
    { id: "commun", name: "Commun", col: "#c9ccd6", mul: 1, affixes: 1, special: 0.02, w: 50, sell: 1 },
    { id: "magique", name: "Magique", col: "#5fb7ff", mul: 1.3, affixes: 2, special: 0.08, w: 12, sell: 2 },
    { id: "rare", name: "Rare", col: "#ffd257", mul: 1.65, affixes: 3, special: 0.2, w: 8, sell: 4 },
    { id: "epique", name: "Épique", col: "#c77dff", mul: 2.05, affixes: 4, special: 0.42, w: 20, sell: 8 },
    { id: "legendaire", name: "Légendaire", col: "#ff9a3c", mul: 2.6, affixes: 4, special: 1, w: 10, sell: 16 },
  ];
  // caractéristiques : base + parNiveau, multipliées par la rareté
  // caractéristiques : les 6 principales se répartissent aussi à chaque niveau (5 points)
  var STATS = {
    vit: { name: "Vitalité", short: "Vita", base: 16, lvl: 6, fmt: "+{v} Vitalité", main: true, desc: "+1 PV par point" },
    sag: { name: "Sagesse", short: "Sag", base: 6, lvl: 2.2, fmt: "+{v} Sagesse", main: true, desc: "+1 % d'XP par point" },
    for: { name: "Force", short: "For", base: 8, lvl: 3.2, fmt: "+{v} Force", main: true, el: "terre", desc: "+1 % aux dégâts Terre par point" },
    int: { name: "Intelligence", short: "Int", base: 8, lvl: 3.2, fmt: "+{v} Intelligence", main: true, el: "feu", desc: "+1 % aux dégâts Feu et aux soins par point" },
    cha: { name: "Chance", short: "Cha", base: 8, lvl: 3.2, fmt: "+{v} Chance", main: true, el: "eau", desc: "+1 % aux dégâts Eau par point" },
    agi: { name: "Agilité", short: "Agi", base: 8, lvl: 3.2, fmt: "+{v} Agilité", main: true, el: "air", desc: "+1 % aux dégâts Air par point, +1 % critique tous les 10 points" },
    dom: { name: "Dommages", short: "Dom", base: 2, lvl: 0.7, fmt: "+{v} Dommages", desc: "Ajoutés à chaque coup" },
    res: { name: "Résistance", short: "Rés", base: 2.5, lvl: 0.5, fmt: "+{v} % Résistance" },
    ini: { name: "Initiative", short: "Ini", base: 10, lvl: 4, fmt: "+{v} Initiative" },
    pros: { name: "Prospection", short: "Pros", base: 5, lvl: 2, fmt: "+{v} Prospection", desc: "+1 % de chance de butin par point" },
    pa: { name: "PA", short: "PA", special: true, fmt: "+{v} PA" },
    pm: { name: "PM", short: "PM", special: true, fmt: "+{v} PM" },
    po: { name: "Portée", short: "PO", special: true, fmt: "+{v} Portée" },
  };
  var NORMAL_STATS = ["vit", "sag", "for", "int", "cha", "agi", "dom", "res", "ini", "pros"];
  var MAIN_STATS = ["vit", "sag", "for", "int", "cha", "agi"];
  var SLOT_MAIN = { arme: ["elem", "elem", "dom"], coiffe: ["vit", "sag", "res"], cape: ["res", "vit", "elem"], amulette: ["elem", "sag", "vit"], anneau: ["elem", "dom", "ini"], bottes: ["ini", "vit", "pros"] };
  var SLOT_SPECIAL = { arme: ["po", "pa"], coiffe: ["pa", "po"], cape: ["pm", "pa"], amulette: ["pa", "po"], anneau: ["pa", "pm", "po"], bottes: ["pm", "pm", "pa"] };
  // pouvoirs des objets légendaires
  var POWERS = {
    vamp: { name: "Soif d'arcane", desc: "Tes dégâts te soignent de 15 %." },
    cheap: { name: "Élan", desc: "Ton premier sort de chaque tour coûte 1 PA de moins." },
    killpm: { name: "Chasseur", desc: "Chaque ennemi vaincu te rend 2 PM et 2 PA." },
    aegis: { name: "Égide", desc: "Début de tour : bouclier de 12 % de tes PV max." },
    crush: { name: "Écrasement", desc: "Les poussées bloquées font le triple de dégâts." },
    critx2: { name: "Coup fatal", desc: "Tes coups critiques font ×2 au lieu de ×1,5." },
    thorns: { name: "Épines runiques", desc: "Les ennemis qui te frappent au contact subissent 30 % des dégâts." },
    echo: { name: "Écho", desc: "20 % de chance qu'un sort ne coûte aucun PA." },
    first: { name: "Fulgurance", desc: "+60 % de dégâts sur ton premier sort offensif du tour." },
  };
  var POWER_IDS = Object.keys(POWERS);
  // apparences des objets : chaque objet en tire une au hasard (nom:genre ; m, f, mp, fp), et elle se voit sur le héros
  var LOOKS = {
    arme: ["Cuillère géante:f", "Poisson-épée:m", "Marteau énorme:m", "Baguette de pain:f", "Parapluie:m", "Faux:f", "Peluche:f", "Ancre:f", "Poêle:f", "Canne à pêche:f"],
    coiffe: ["Casque à cornes:m", "Chapeau champignon:m", "Citrouille:f", "Seau:m", "Couronne géante:f", "Chapeau pointu XXL:m", "Poisson-chapeau:m", "Nid d'oiseau:m", "Abat-jour:m", "Bonnet à pompon:m"],
    cape: ["Ailes de dragon:fp", "Cape-drapeau:f", "Serviette de plage:f", "Ailes de papillon:fp", "Cape étoilée:f", "Carapace:f", "Cape de super-héros:f", "Sac à dos géant:m"],
    amulette: ["Médaillon énorme:m", "Cloche:f", "Œil pendentif:m", "Clé géante:f", "Horloge:f", "Donut:m"],
    anneau: ["Bague à gemme énorme:f", "Bague-ballon:f", "Bague-fleur:f", "Chevalière:f"],
    bottes: ["Bottes de géant:fp", "Pattes de canard:fp", "Ressorts:mp", "Pantoufles lapin:fp", "Bottes-fusées:fp", "Palmes:fp", "Patins:mp"],
  };
  var ITEM_SUFFIX = { vit: "de vitalité", sag: "du sage", for: "du titan", int: "de la flamme", cha: "des marées", agi: "du zéphyr", dom: "du tonnerre", res: "du rempart", ini: "du vif-argent", pros: "du chercheur", pa: "de l'archimage", pm: "du voyageur", po: "de l'horizon" };
  // adjectifs : m|f|mp|fp
  var ITEM_ADJ = { commun: ["usé|usée|usés|usées", "simple|simple|simples|simples", "robuste|robuste|robustes|robustes"],
    magique: ["runique|runique|runiques|runiques", "chatoyant|chatoyante|chatoyants|chatoyantes", "enchanté|enchantée|enchantés|enchantées"],
    rare: ["astral|astrale|astraux|astrales", "prismatique|prismatique|prismatiques|prismatiques", "ancestral|ancestrale|ancestraux|ancestrales"],
    epique: ["fractal|fractale|fractals|fractales", "éthéré|éthérée|éthérés|éthérées", "céleste|céleste|célestes|célestes"],
    legendaire: ["de l'Archonte", "des Sept Lunes", "du Premier Mage", "de l'Aube éternelle"] };
  var GENDER = { m: 0, f: 1, mp: 2, fp: 3 };

  /* ====================== QUÊTES ====================== */
  var QUESTS = [
    { id: "q1", name: "Premiers pas", desc: "Vaincre 4 Glorbes dans la Prairie des Runes.", kind: "kill", mob: "glorbe", n: 4, xp: 60, gold: 40, item: "magique" },
    { id: "q2", name: "Nuisibles", desc: "Vaincre 3 Scarabrumes.", kind: "kill", mob: "scarabrume", n: 3, req: "q1", xp: 90, gold: 60, item: "rare" },
    { id: "qi", name: "Le donjon d'Incarnam", desc: "Vaincre la Sentinelle au fond du donjon d'Incarnam (portail au nord de la Prairie).", kind: "kill", mob: "sentinelle", n: 1, req: "q2", xp: 220, gold: 150, item: "epique" },
    { id: "q3", name: "Bois Fractal", desc: "Atteindre le niveau 3 et entrer dans le Bois Fractal.", kind: "zone", zone: "bois", req: "q2", xp: 120, gold: 80, item: "rare" },
    { id: "q4", name: "Lanternes folles", desc: "Vaincre 5 Lanterneaux.", kind: "kill", mob: "lanterneau", n: 5, req: "q3", xp: 180, gold: 120, item: "rare" },
    { id: "q5", name: "Chasse aux élites", desc: "Vaincre 3 monstres élites (contour doré).", kind: "elite", n: 3, req: "q4", xp: 260, gold: 160, item: "epique" },
    { id: "q6", name: "Les Falaises", desc: "Atteindre les Falaises de Cristal.", kind: "zone", zone: "falaises", req: "q5", xp: 300, gold: 200, item: "epique" },
    { id: "q7", name: "Cœur de pierre", desc: "Vaincre 4 Golems de rune.", kind: "kill", mob: "golem", n: 4, req: "q6", xp: 420, gold: 260, item: "epique" },
    { id: "qm1", name: "Ça bulle", desc: "Entrer dans le Marais Bulleux (portail au sud du Bois Fractal).", kind: "zone", zone: "marais", req: "q3", xp: 160, gold: 100, item: "rare" },
    { id: "qm2", name: "Sucre d'orge", desc: "Vaincre 5 Bonbonks.", kind: "kill", mob: "bonbonk", n: 5, req: "qm1", xp: 240, gold: 150, item: "epique" },
    { id: "qm3", name: "La Reine Guimauve", desc: "Vaincre la Reine Guimauve au fond de sa Confiserie.", kind: "kill", mob: "guimauve", n: 1, req: "qm2", xp: 500, gold: 300, item: "legendaire" },
    { id: "q8", name: "L'Archonte", desc: "Vaincre l'Archonte fractal au fond du Sanctuaire brisé.", kind: "kill", mob: "archonte", n: 1, req: "q7", xp: 900, gold: 500, item: "legendaire" },
    { id: "qn1", name: "Tête dans les nuages", desc: "Atteindre les Îles Cotonneuses (à l'est des Falaises).", kind: "zone", zone: "nuages", req: "q8", xp: 500, gold: 300, item: "epique" },
    { id: "qn2", name: "L'heure tourne", desc: "Vaincre 4 Horlogeons.", kind: "kill", mob: "horlogeon", n: 4, req: "qn1", xp: 700, gold: 400, item: "legendaire" },
    { id: "qn3", name: "Le Grand Tic-Tac", desc: "Vaincre le Grand Tic-Tac au sommet de la Tour des Horloges.", kind: "kill", mob: "tictac", n: 1, req: "qn2", xp: 1500, gold: 900, item: "legendaire" },
  ];

  /* ====================== ZONES ====================== */
  var ZONES = {
    village: { name: "Lumebourg", sub: "Village", w: 20, h: 18, lvl: [1, 1], safe: true, theme: "village", seed: 101,
      portals: [{ x: 19, y: 9, to: "prairie", label: "Prairie des Runes" }],
      spawn: { x: 9, y: 9 } },
    prairie: { name: "Prairie des Runes", sub: "Niv. 1 à 3", w: 26, h: 22, lvl: [1, 3], theme: "prairie", seed: 202, packs: 6, size: [1, 3],
      mobs: ["glorbe", "glorbe", "scarabrume", "ronceau"],
      portals: [{ x: 0, y: 11, to: "village", label: "Lumebourg" }, { x: 25, y: 11, to: "bois", req: 3, label: "Bois Fractal" }, { x: 13, y: 0, to: "dungeon:incarnam", req: 2, label: "Donjon d'Incarnam" }] },
    bois: { name: "Bois Fractal", sub: "Niv. 3 à 6", w: 26, h: 24, lvl: [3, 6], theme: "bois", seed: 303, packs: 7, size: [2, 3],
      mobs: ["ronceau", "lanterneau", "sylphe", "scarabrume", "lanterneau"],
      portals: [{ x: 0, y: 12, to: "prairie", label: "Prairie des Runes" }, { x: 25, y: 12, to: "falaises", req: 5, label: "Falaises de Cristal" }, { x: 13, y: 23, to: "marais", req: 4, label: "Marais Bulleux" }] },
    marais: { name: "Marais Bulleux", sub: "Niv. 4 à 7 · grenouilles et bonbons", w: 26, h: 22, lvl: [4, 7], theme: "marais", seed: 505, packs: 7, size: [2, 3], elite: 0.15,
      mobs: ["grenouillon", "bonbonk", "grenouillon", "lanterneau", "glorbe"],
      portals: [{ x: 13, y: 0, to: "bois", label: "Bois Fractal" }, { x: 25, y: 11, to: "dungeon:confiserie", req: 5, label: "Confiserie de la Reine Guimauve (donjon)" }] },
    falaises: { name: "Falaises de Cristal", sub: "Niv. 6 à 9", w: 26, h: 24, lvl: [6, 9], theme: "falaises", seed: 404, packs: 7, size: [2, 4], elite: 0.2,
      mobs: ["golem", "cristallin", "sylphe", "lanterneau", "cristallin"],
      portals: [{ x: 0, y: 12, to: "bois", label: "Bois Fractal" }, { x: 13, y: 0, to: "dungeon:sanctuaire", req: 7, label: "Sanctuaire brisé (donjon)" }, { x: 25, y: 12, to: "nuages", req: 9, label: "Îles Cotonneuses" }] },
    nuages: { name: "Îles Cotonneuses", sub: "Niv. 9 à 12 · au-dessus des nuages", w: 26, h: 22, lvl: [9, 12], theme: "nuages", seed: 606, packs: 7, size: [2, 4], elite: 0.25,
      mobs: ["nuagelet", "horlogeon", "nuagelet", "cristallin", "sylphe"],
      portals: [{ x: 0, y: 11, to: "falaises", label: "Falaises de Cristal" }, { x: 13, y: 21, to: "dungeon:horloge", req: 10, label: "Tour des Horloges (donjon)" }] },
  };
  var ZONE_IDS = ["village", "prairie", "bois", "marais", "falaises", "nuages"];
  var DUNGEONS = {
    incarnam: { name: "Donjon d'Incarnam", sub: "Niv. 2 à 4 · 3 salles", exit: "prairie", req: 2, rooms: [
      { name: "Cour envahie", lvl: 2, mobs: ["glorbe", "scarabrume", "glorbe", "ronceau"], elite: 0.15 },
      { name: "Serre aux lierres", lvl: 3, mobs: ["ronceau", "scarabrume", "lanterneau", "glorbe"], elite: 0.35 },
      { name: "Salle de la Sentinelle", lvl: 4, mobs: ["sentinelle", "ronceau", "glorbe"], boss: true },
    ] },
    confiserie: { name: "Confiserie de la Reine Guimauve", sub: "Niv. 5 à 7 · 3 salles", exit: "marais", req: 5, theme: "confiserie", rooms: [
      { name: "Cuisine en sucre", lvl: 5, mobs: ["bonbonk", "grenouillon", "bonbonk", "glorbe"], elite: 0.2 },
      { name: "Grand four à guimauves", lvl: 6, mobs: ["bonbonk", "lanterneau", "grenouillon", "bonbonk"], elite: 0.45 },
      { name: "Trône en chamallow", lvl: 7, mobs: ["guimauve", "bonbonk", "grenouillon"], boss: true },
    ] },
    horloge: { name: "Tour des Horloges", sub: "Niv. 11 à 13 · 3 salles", exit: "nuages", req: 10, theme: "horloge", rooms: [
      { name: "Salle des engrenages", lvl: 11, mobs: ["horlogeon", "nuagelet", "cristallin", "horlogeon"], elite: 0.3 },
      { name: "Escalier à rebours", lvl: 12, mobs: ["horlogeon", "sylphe", "nuagelet", "golem"], elite: 0.6 },
      { name: "Cadran du Grand Tic-Tac", lvl: 13, mobs: ["tictac", "horlogeon", "nuagelet"], boss: true },
    ] },
    sanctuaire: { name: "Sanctuaire brisé", sub: "Niv. 8 à 10 · 3 salles", exit: "falaises", req: 7, rooms: [
      { name: "Salle des échos", lvl: 8, mobs: ["cristallin", "golem", "lanterneau", "glorbe"], elite: 0.25 },
      { name: "Galerie fêlée", lvl: 9, mobs: ["sylphe", "golem", "cristallin", "scarabrume"], elite: 0.6 },
      { name: "Trône fractal", lvl: 10, mobs: ["archonte", "cristallin", "glorbe"], boss: true },
    ] },
  };
  var NPCS = {
    village: [
      { id: "elya", name: "Elya la gardienne", x: 8, y: 6, role: "quests", col: "#ffd257" },
      { id: "tobin", name: "Tobin le marchand", x: 12, y: 12, role: "shop", col: "#ff9a3c" },
      { id: "source", name: "Source de mana", x: 9, y: 9, role: "heal", col: "#5fd3c0", obj: true },
    ],
  };

  /* ====================== GÉNÉRATION DES CARTES ====================== */
  // cellule d'exploration : 0 = sol, 1 = bloqué (décor), 2 = chemin (sol), 3 = eau (bloque)
  var mapCache = {};
  function zoneMap(id) {
    if (mapCache[id]) return mapCache[id];
    var Z = ZONES[id], r = rng(Z.seed), W = Z.w, H = Z.h;
    var g = [], deco = {};
    for (var x = 0; x < W; x++) { g.push([]); for (var y = 0; y < H; y++) g[x].push(0); }
    // bordure
    for (x = 0; x < W; x++) for (y = 0; y < H; y++) if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { g[x][y] = 1; deco[key(x, y)] = borderDeco(Z.theme, r); }
    var anchors = Z.portals.map(function (p) { return { x: p.x, y: p.y }; });
    var center = Z.spawn || { x: Math.floor(W / 2), y: Math.floor(H / 2) };
    // chemins : de chaque portail vers le centre, en serpentant un peu
    var path = {};
    anchors.forEach(function (a) {
      var cx = a.x, cy = a.y, guard = 0;
      while ((cx !== center.x || cy !== center.y) && guard++ < 400) {
        path[key(cx, cy)] = 1;
        var dx = center.x - cx, dy = center.y - cy;
        if (r() < 0.25) { if (dx !== 0 && r() < 0.5) cy += sgn(r() - 0.5); else if (dy !== 0) cx += sgn(r() - 0.5); }
        else if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && r() < 0.5)) cx += sgn(dx); else cy += sgn(dy);
        cx = clamp(cx, 1, W - 2); cy = clamp(cy, 1, H - 2);
      }
      path[key(center.x, center.y)] = 1;
    });
    Z.portals.forEach(function (p) { g[p.x][p.y] = 2; delete deco[key(p.x, p.y)]; });
    if (Z.theme !== "village") {
      // amas de décor
      var dens = Z.theme === "bois" ? 0.17 : Z.theme === "falaises" ? 0.15 : Z.theme === "marais" ? 0.16 : Z.theme === "nuages" ? 0.14 : 0.11;
      for (x = 1; x < W - 1; x++) for (y = 1; y < H - 1; y++) {
        if (path[key(x, y)]) continue;
        var near = 0;
        for (var i = 0; i < anchors.length; i++) if (Math.abs(anchors[i].x - x) + Math.abs(anchors[i].y - y) < 3) near = 1;
        if (near) continue;
        if (r() < dens) { g[x][y] = 1; deco[key(x, y)] = fieldDeco(Z.theme, r); }
      }
      // petit lac / gouffre
      if (Z.theme !== "village") {
        var lakes = Z.theme === "marais" ? 4 : Z.theme === "nuages" ? 3 : 1;
        for (var lk = 0; lk < lakes; lk++) {
          var lx = ri(r, 4, W - 8), ly = ri(r, 3, H - 7), lw = ri(r, 2, 4), lh = ri(r, 2, 3);
          for (x = lx; x < lx + lw; x++) for (y = ly; y < ly + lh; y++) if (!path[key(x, y)] && g[x][y] === 0) { g[x][y] = 3; delete deco[key(x, y)]; }
        }
      }
    }
    Object.keys(path).forEach(function (k) { var p = k.split(","), px = +p[0], py = +p[1]; if (g[px][py] !== 1 || !(px === 0 || py === 0 || px === W - 1 || py === H - 1)) { if (g[px][py] === 1 && deco[k] && deco[k].big) return; g[px][py] = 2; delete deco[k]; } });
    Z.portals.forEach(function (p) { g[p.x][p.y] = 2; delete deco[key(p.x, p.y)]; });
    if (Z.theme === "village") {
      buildVillage(g, deco, W, H, path);
      (NPCS[id] || []).forEach(function (n) { if (!n.obj) { g[n.x][n.y] = 1; delete deco[key(n.x, n.y)]; } });
    }
    // on bouche tout ce qui n'est pas relié au centre
    var seen = {}, q = [[center.x, center.y]]; seen[key(center.x, center.y)] = 1;
    while (q.length) {
      var c = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k]) return;
        if (g[nx][ny] === 0 || g[nx][ny] === 2) { seen[k] = 1; q.push([nx, ny]); }
      });
    }
    for (x = 0; x < W; x++) for (y = 0; y < H; y++) if ((g[x][y] === 0 || g[x][y] === 2) && !seen[key(x, y)]) { g[x][y] = 1; deco[key(x, y)] = fieldDeco(Z.theme, r); }
    // variations de sol et petites fleurs (purement visuel)
    var tint = [], flora = {};
    for (x = 0; x < W; x++) { tint.push([]); for (y = 0; y < H; y++) { tint[x].push(r()); if ((g[x][y] === 0) && r() < 0.12) flora[key(x, y)] = ri(r, 0, 3); } }
    var m = { id: id, w: W, h: H, g: g, deco: deco, tint: tint, flora: flora, spawn: center };
    mapCache[id] = m;
    return m;
  }
  function borderDeco(theme, r) {
    if (theme === "falaises") return { t: r() < 0.6 ? "cliff" : "crystal", s: 0.9 + r() * 0.4, v: r() };
    if (theme === "village") return { t: r() < 0.5 ? "fence" : "tree", s: 0.9 + r() * 0.3, v: r() };
    if (theme === "marais") return { t: r() < 0.5 ? "bigshroom" : "pine", s: 1 + r() * 0.4, v: r() };
    if (theme === "nuages") return { t: r() < 0.7 ? "cloud" : "cotton", s: 1 + r() * 0.4, v: r() };
    return { t: r() < 0.75 ? "tree" : "rock", s: 0.95 + r() * 0.45, v: r() };
  }
  function fieldDeco(theme, r) {
    var v = r();
    if (theme === "prairie") return { t: v < 0.45 ? "tree" : v < 0.75 ? "bush" : v < 0.92 ? "rock" : "rune", s: 0.8 + r() * 0.4, v: r() };
    if (theme === "bois") return { t: v < 0.6 ? "pine" : v < 0.8 ? "mushroom" : v < 0.92 ? "rock" : "rune", s: 0.85 + r() * 0.5, v: r() };
    if (theme === "falaises") return { t: v < 0.45 ? "crystal" : v < 0.8 ? "rock" : v < 0.9 ? "pine" : "rune", s: 0.8 + r() * 0.5, v: r() };
    if (theme === "marais") return { t: v < 0.35 ? "bigshroom" : v < 0.6 ? "lantern" : v < 0.8 ? "reed" : v < 0.92 ? "mushroom" : "rune", s: 0.85 + r() * 0.5, v: r() };
    if (theme === "nuages") return { t: v < 0.4 ? "cotton" : v < 0.65 ? "cloud" : v < 0.85 ? "star" : "balloon", s: 0.85 + r() * 0.5, v: r() };
    return { t: v < 0.5 ? "tree" : "bush", s: 0.9 + r() * 0.3, v: r() };
  }
  function buildVillage(g, deco, W, H, path) {
    var houses = [{ x: 4, y: 3, c: 0 }, { x: 13, y: 3, c: 1 }, { x: 3, y: 12, c: 2 }, { x: 15, y: 13, c: 3 }, { x: 8, y: 14, c: 1 }];
    houses.forEach(function (hs) {
      for (var x = hs.x; x < hs.x + 2; x++) for (var y = hs.y; y < hs.y + 2; y++) { g[x][y] = 1; delete deco[key(x, y)]; }
      deco[key(hs.x + 1, hs.y + 1)] = { t: "house", s: 1, v: hs.c / 4, big: true };
    });
    // places pavées autour de la source
    for (var x = 6; x <= 12; x++) for (var y = 7; y <= 11; y++) if (g[x][y] === 0) { g[x][y] = 2; path[key(x, y)] = 1; }
    g[9][9] = 1; deco[key(9, 9)] = { t: "fountain", s: 1, v: 0 };
    [[2, 7], [17, 6], [6, 16], [17, 16], [11, 2], [2, 2], [17, 2]].forEach(function (p) { if (g[p[0]][p[1]] === 0) { g[p[0]][p[1]] = 1; deco[key(p[0], p[1])] = { t: "tree", s: 1.1, v: 0.3 }; } });
    [[6, 5], [12, 6], [5, 10], [14, 10], [11, 15]].forEach(function (p) { if (g[p[0]][p[1]] === 0) { g[p[0]][p[1]] = 1; deco[key(p[0], p[1])] = { t: p[0] % 2 ? "lamp" : "crate", s: 1, v: 0.5 }; } });
  }
  function exploreWalkable(m, x, y) { return x >= 0 && y >= 0 && x < m.w && y < m.h && (m.g[x][y] === 0 || m.g[x][y] === 2); }

  // arène de combat : 11 × 11 aux coins coupés (petite : les combats vont vite, et ça tient sur un téléphone)
  var AW = 11, AH = 11;
  function genArena(theme, seed, nHeroes) {
    var r = rng(seed), g = [];
    for (var x = 0; x < AW; x++) { g.push([]); for (var y = 0; y < AH; y++) g[x].push(Math.abs(x - 5) + Math.abs(y - 5) > 8 ? 9 : 0); }
    var heroCells = [], mobCells = [];
    for (x = 2; x <= 8; x++) { heroCells.push([x, 9], [x, 8]); mobCells.push([x, 1], [x, 2]); }
    heroCells = heroCells.filter(function (c) { return g[c[0]][c[1]] === 0; });
    mobCells = mobCells.filter(function (c) { return g[c[0]][c[1]] === 0; });
    var reserved = {};
    heroCells.concat(mobCells).forEach(function (c) { reserved[key(c[0], c[1])] = 1; });
    var tries = 0, deco = {};
    do {
      for (x = 0; x < AW; x++) for (y = 0; y < AH; y++) if (g[x][y] === 1) { g[x][y] = 0; }
      deco = {};
      var n = ri(r, 6, 10);
      for (var i = 0; i < n; i++) {
        var ox = ri(r, 1, 9), oy = ri(r, 3, 7);
        if (g[ox][oy] !== 0 || reserved[key(ox, oy)]) continue;
        g[ox][oy] = 1; deco[key(ox, oy)] = arenaDeco(theme, r);
        // parfois une paire symétrique : lisible et tactique
        var sx = 10 - ox;
        if (r() < 0.45 && g[sx][oy] === 0 && !reserved[key(sx, oy)]) { g[sx][oy] = 1; deco[key(sx, oy)] = arenaDeco(theme, r); }
      }
      tries++;
    } while (!arenaConnected(g, heroCells, mobCells) && tries < 30);
    var tint = [];
    for (x = 0; x < AW; x++) { tint.push([]); for (y = 0; y < AH; y++) tint[x].push(Math.round(r() * 100) / 100); }
    return { w: AW, h: AH, g: g, deco: deco, tint: tint, heroCells: heroCells, mobCells: mobCells, theme: theme };
  }
  function arenaDeco(theme, r) {
    var v = r();
    if (theme === "donjon") return { t: v < 0.5 ? "pillar" : "crystal", s: 1 + r() * 0.25, v: r() };
    if (theme === "marais") return { t: v < 0.5 ? "bigshroom" : v < 0.8 ? "lantern" : "reed", s: 1 + r() * 0.3, v: r() };
    if (theme === "nuages") return { t: v < 0.5 ? "cotton" : v < 0.8 ? "cloud" : "star", s: 1 + r() * 0.3, v: r() };
    if (theme === "confiserie") return { t: v < 0.5 ? "candy" : v < 0.8 ? "cupcake" : "lollipop", s: 1 + r() * 0.3, v: r() };
    if (theme === "horloge") return { t: v < 0.5 ? "gear" : v < 0.8 ? "pillar" : "pendulum", s: 1 + r() * 0.3, v: r() };
    if (theme === "falaises") return { t: v < 0.5 ? "crystal" : "rock", s: 1.1 + r() * 0.3, v: r() };
    if (theme === "bois") return { t: v < 0.5 ? "pine" : v < 0.8 ? "mushroom" : "rock", s: 1 + r() * 0.3, v: r() };
    return { t: v < 0.45 ? "rock" : v < 0.8 ? "bush" : "tree", s: 1.1 + r() * 0.3, v: r() };
  }
  function arenaConnected(g, a, b) {
    var seen = {}, q = [a[0]]; seen[key(a[0][0], a[0][1])] = 1;
    while (q.length) {
      var c = q.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= AW || ny >= AH || g[nx][ny] !== 0 || seen[key(nx, ny)]) return;
        seen[key(nx, ny)] = 1; q.push([nx, ny]);
      });
    }
    return a.concat(b).every(function (c) { return seen[key(c[0], c[1])]; });
  }

  /* ====================== PROFILS (sauvegarde d'un héros) ====================== */
  function newProfile(cls, name) {
    var b = {}; for (var k in CLASSES[cls].base) b[k] = CLASSES[cls].base[k];
    return { cls: cls, name: name || CLASSES[cls].name, level: 1, xp: 0, gold: 30, equip: {}, bag: [], quests: {}, qdone: {}, kills: 0, bossKills: 0, uid: 1, rev: 0, base: b, pts: 0, created: Date.now() };
  }
  function fixProfile(p) {
    if (!p || !CLASSES[p.cls]) return null;
    p.level = clamp(Math.floor(p.level) || 1, 1, CFG.maxLevel); p.xp = Math.max(0, Math.floor(p.xp) || 0);
    p.gold = Math.max(0, Math.floor(p.gold) || 0); p.equip = p.equip || {}; p.bag = (p.bag || []).slice(0, BAG_MAX);
    if (!p.base) { p.base = {}; for (var k in CLASSES[p.cls].base) p.base[k] = CLASSES[p.cls].base[k]; p.pts = (p.pts || 0) + 5 * (p.level - 1); }
    p.pts = Math.max(0, Math.floor(p.pts) || 0);
    // anciens objets (v1.0) : leurs caractéristiques n'existent plus, on les convertit
    var conv = function (it) { if (!it || !it.st) return; if (it.look == null) it.look = Math.floor(Math.random() * LOOKS[it.slot].length); var st = {}, el = ELEMENTS[CLASSES[p.cls].el].stat; for (var k in it.st) { var nk = k === "pow" ? el : k === "crit" ? "agi" : k === "heal" ? "int" : k; st[nk] = (st[nk] || 0) + it.st[k]; } it.st = st; };
    SLOTS.forEach(function (sl) { conv(p.equip[sl]); }); p.bag.forEach(conv);
    p.quests = p.quests || {}; p.qdone = p.qdone || {}; p.uid = p.uid || 1; p.rev = p.rev || 0; p.kills = p.kills || 0; p.bossKills = p.bossKills || 0;
    return p;
  }
  var BAG_MAX = 30;
  function xpNeed(l) { return Math.round(28 * Math.pow(l, 1.55) + 22); }
  function heroStats(p) {
    var C = CLASSES[p.cls], L = p.level;
    var s = { pa: C.pa, pm: C.pm, po: 0, res: C.res, ini: 0, dom: 0, pros: 0, powers: [], vit: 0, sag: 0, for: 0, int: 0, cha: 0, agi: 0 };
    for (var b in p.base) s[b] = (s[b] || 0) + p.base[b];
    SLOTS.forEach(function (sl) {
      var it = p.equip[sl]; if (!it) return;
      for (var k in it.st) s[k] = (s[k] || 0) + it.st[k];
      if (it.power && s.powers.indexOf(it.power) < 0) s.powers.push(it.power);
    });
    s.hp = C.hp + C.hpL * (L - 1) + s.vit;
    s.elem = { terre: s.for, feu: s.int, eau: s.cha, air: s.agi };
    s.heal = s.int;
    s.crit = Math.min(CFG.caps.crit, C.crit + Math.floor(s.agi / 10));
    s.ini = C.ini + L + s.ini + Math.round((s.for + s.int + s.cha + s.agi) / 10);
    s.pa = Math.min(CFG.caps.pa, s.pa); s.pm = Math.min(CFG.caps.pm, s.pm); s.po = Math.min(CFG.caps.po, s.po);
    s.res = Math.min(CFG.caps.res, s.res);
    return s;
  }
  // ce que porte un héros, pour le dessin : { coiffe: { look, r }, ... }
  function gearOf(p) {
    var g = {};
    if (!p || !p.equip) return g;
    SLOTS.forEach(function (sl) { var it = p.equip[sl]; if (it) g[sl] = { look: it.look || 0, r: it.r }; });
    return g;
  }
  function itemScore(it) {
    if (!it) return 0;
    var w = { vit: 0.5, sag: 0.6, for: 1, int: 1, cha: 1, agi: 1, dom: 3, res: 2.6, ini: 0.25, pros: 0.5, pa: 40, pm: 28, po: 18 }, s = 0;
    for (var k in it.st) s += (w[k] || 1) * it.st[k];
    if (it.power) s += 25;
    return Math.round(s);
  }

  /* ====================== FABRICATION DES OBJETS ====================== */
  function rollRarity(luck, min) {
    // luck : 0 normal, 1 élite, 2 boss
    var ws = RARITIES.map(function (rr, i) { return rr.w * (i >= 3 ? Math.pow(1.5, luck) : 1) * (i === 0 && luck ? 0.5 : 1); });
    var tot = ws.reduce(function (a, b) { return a + b; }, 0), v = R() * tot, i = 0;
    for (; i < ws.length - 1; i++) { if (v < ws[i]) break; v -= ws[i]; }
    return Math.max(i, min || 0);
  }
  function makeItem(p, level, rarityIdx, slot) {
    var rar = RARITIES[rarityIdx], L = Math.max(1, level);
    slot = slot || pick(R, SLOTS);
    var st = {}, used = {};
    var elemStat = ELEMENTS[CLASSES[p.cls].el].stat;
    var main = pick(R, SLOT_MAIN[slot]);
    if (main === "elem") main = R() < 0.75 ? elemStat : pick(R, ["for", "int", "cha", "agi"]);
    var order = [main];
    var pool = NORMAL_STATS.filter(function (k) { return k !== main; });
    // l'élément de la classe revient souvent, les autres éléments rarement
    pool = pool.filter(function (k) { return !STATS[k].el || k === elemStat || R() < 0.25; });
    while (order.length < rar.affixes && pool.length) order.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    order.forEach(function (k, i) {
      var S = STATS[k];
      var v = (S.base + S.lvl * L) * rar.mul * (0.8 + R() * 0.45) * (i === 0 ? 1.35 : 1);
      st[k] = Math.max(1, Math.round(v));
      used[k] = 1;
    });
    // caractéristiques spéciales : +PA, +PM, +portée
    var specials = SLOT_SPECIAL[slot], nSpecial = 0;
    if (rar.special >= 1) nSpecial = 1 + (R() < 0.3 ? 1 : 0);
    else if (R() < rar.special) nSpecial = 1;
    for (var n = 0; n < nSpecial; n++) {
      var sp = pick(R, specials);
      st[sp] = (st[sp] || 0) + (sp === "po" && rarityIdx >= 3 && R() < 0.4 ? 2 : 1);
    }
    // la portée tombe aussi toute seule sur les objets rares et plus
    if (!st.po && rarityIdx >= 2 && R() < 0.22) st.po = 1;
    var power = rarityIdx === 4 ? pick(R, POWER_IDS) : null;
    var main2 = nSpecial || st.po ? Object.keys(st).filter(function (k) { return STATS[k].special; })[0] : main;
    var look = ri(R, 0, LOOKS[slot].length - 1);
    var base = LOOKS[slot][look].split(":"), adj = pick(R, ITEM_ADJ[rar.id]).split("|");
    var name = base[0] + " " + (adj[GENDER[base[1]]] || adj[0]);
    if (rarityIdx < 4) name += " " + ITEM_SUFFIX[main2];
    var it = { uid: p.uid++, slot: slot, r: rarityIdx, lvl: L, name: name, st: st, power: power, look: look, isNew: true };
    it.value = Math.round((6 + L * 3) * rar.sell);
    return it;
  }

  /* ====================== MONDE ====================== */
  function createWorld(opt) {
    opt = opt || {};
    var w = {
      v: 1, rev: 0, seed: opt.seed || Math.floor(Math.random() * 1e9),
      mode: "explore",            // explore | combat | loot | over
      zone: "village", players: [], heroes: [], packs: [], packId: 1,
      combat: null, loot: null, dungeon: null, msg: [], events: [], t: 0, local: !!opt.local,
    };
    (opt.players || []).forEach(function (pl, i) { addPlayer(w, pl.name, pl.profile, i); });
    enterZone(w, "village", null);
    return w;
  }
  function addPlayer(w, name, profile, i) {
    profile = fixProfile(profile) || newProfile("bastion", name);
    w.players[i] = { name: name || profile.name, profile: profile, ready: false };
    var m = zoneMap(w.zone);
    w.heroes[i] = { pi: i, x: m.spawn.x + i, y: m.spawn.y + 1, path: [], t: 0, face: 1 };
    updateQuests(w, i);
  }
  // un joueur en ligne s'en va : son héros quitte la partie
  function removePlayer(w, i) {
    if (!w.players[i]) return;
    w.players[i] = null; w.heroes[i] = null;
    var c = w.combat;
    if (c) {
      c.units.forEach(function (u) { if (u.side === 0 && u.pi === i && u.alive) { u.alive = false; u.hp = 0; ev(w, { k: "die", id: u.id }); } });
      if (c.phase === "place" && w.players.every(function (p) { return !p || p.ready; })) beginFight(w);
      else if (c.phase === "fight") { var a = active(c); if (a && !a.alive) nextTurn(w); checkEnd(w); }
    }
    if (w.mode === "loot" && w.players.every(function (p) { return !p || p.ready; })) { var any = w.players.findIndex(function (p) { return p; }); if (any >= 0) { w.players[any].ready = false; lootDone(w, any); } }
    bump(w);
  }
  function ev(w, e) { w.events.push(e); }
  function bump(w) { w.rev++; }
  function say(w, text, pi) { ev(w, { k: "msg", text: text, pi: pi == null ? -1 : pi }); }
  function partyLevel(w) { var m = 1; w.players.forEach(function (p) { if (p) m = Math.max(m, p.profile.level); }); return m; }
  function avgLevel(w) { var s = 0, n = 0; w.players.forEach(function (p) { if (p) { s += p.profile.level; n++; } }); return n ? s / n : 1; }

  function enterZone(w, id, fromZone) {
    w.zone = id;
    var m = zoneMap(id), Z = ZONES[id], at = m.spawn;
    if (fromZone) Z.portals.forEach(function (p) { if (p.to === fromZone) at = { x: p.x, y: p.y }; });
    w.heroes.forEach(function (h, i) {
      if (!h) return;
      var c = freeNear(m, at.x, at.y, i, w);
      h.x = c.x; h.y = c.y; h.path = []; h.t = 0;
    });
    w.packs = [];
    if (!Z.safe) for (var i = 0; i < Z.packs; i++) spawnPack(w, id);
    w.players.forEach(function (p, pi) { if (p) questEvent(w, pi, { kind: "zone", zone: id }); });
    ev(w, { k: "zone", zone: id });
    bump(w);
  }
  function freeNear(m, x, y, n, w) {
    var out = [];
    for (var r = 0; r < 6 && out.length <= n; r++)
      for (var dx = -r; dx <= r; dx++) for (var dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        var cx = x + dx, cy = y + dy;
        if (exploreWalkable(m, cx, cy) && !portalAt(w.zone, cx, cy)) out.push({ x: cx, y: cy });
      }
    return out[Math.min(n, out.length - 1)] || { x: x, y: y };
  }
  function portalAt(zone, x, y) { var Z = ZONES[zone]; for (var i = 0; i < Z.portals.length; i++) if (Z.portals[i].x === x && Z.portals[i].y === y) return Z.portals[i]; return null; }
  function spawnPack(w, zid) {
    var Z = ZONES[zid], m = zoneMap(zid), r = R;
    for (var tries = 0; tries < 60; tries++) {
      var x = ri(r, 2, m.w - 3), y = ri(r, 2, m.h - 3);
      if (!exploreWalkable(m, x, y) || portalAt(zid, x, y)) continue;
      if (Math.abs(x - m.spawn.x) + Math.abs(y - m.spawn.y) < 6) continue;
      if (w.packs.some(function (p) { return Math.abs(p.x - x) + Math.abs(p.y - y) < 4; })) continue;
      if (w.heroes.some(function (h) { return h && Math.abs(h.x - x) + Math.abs(h.y - y) < 5; })) continue;
      var size = ri(r, Z.size[0], Z.size[1]) + (w.players.filter(Boolean).length - 1);
      var mobs = [];
      for (var i = 0; i < size; i++) {
        var lvl = ri(r, Z.lvl[0], Z.lvl[1]);
        var mob = { type: pick(r, Z.mobs), lvl: lvl, affix: null };
        if (r() < (Z.elite || CFG.eliteChance)) mob.affix = pick(r, AFFIX_IDS);
        mobs.push(mob);
      }
      mobs.sort(function (a, b) { return (b.affix ? 1 : 0) - (a.affix ? 1 : 0) || b.lvl - a.lvl; });
      w.packs.push({ id: w.packId++, x: x, y: y, hx: x, hy: y, mobs: mobs, t: 1 + r() * 4, face: 1 });
      return;
    }
  }

  /* ---------- chemins (A*) ---------- */
  function findPath(W, H, ok, sx, sy, tx, ty, maxLen) {
    if (sx === tx && sy === ty) return [];
    var open = [[sx, sy]], came = {}, gS = {}, sk = key(sx, sy);
    gS[sk] = 0;
    var fS = {}; fS[sk] = Math.abs(tx - sx) + Math.abs(ty - sy);
    var guard = 0;
    while (open.length && guard++ < 4000) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (fS[key(open[i][0], open[i][1])] < fS[key(open[bi][0], open[bi][1])]) bi = i;
      var c = open.splice(bi, 1)[0], ck = key(c[0], c[1]);
      if (c[0] === tx && c[1] === ty) {
        var out = [], k = ck;
        while (k !== sk) { var p = k.split(","); out.unshift([+p[0], +p[1]]); k = came[k]; }
        return out;
      }
      if (maxLen != null && gS[ck] >= maxLen) continue;
      for (var d = 0; d < 4; d++) {
        var nx = c[0] + DX[d], ny = c[1] + DY[d], nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!(nx === tx && ny === ty && ok(nx, ny, true)) && !ok(nx, ny, false)) continue;
        var ng = gS[ck] + 1;
        if (gS[nk] == null || ng < gS[nk]) {
          gS[nk] = ng; came[nk] = ck; fS[nk] = ng + Math.abs(tx - nx) + Math.abs(ty - ny);
          if (!open.some(function (o) { return o[0] === nx && o[1] === ny; })) open.push([nx, ny]);
        }
      }
    }
    return null;
  }
  var DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];

  /* ====================== EXPLORATION ====================== */
  function walkTo(w, pi, x, y) {
    var h = w.heroes[pi], m = zoneMap(w.zone);
    if (!h || w.mode !== "explore") return false;
    if (!exploreWalkable(m, x, y)) {
      // clic sur un décor : on va à côté
      var best = null, bd = 1e9;
      for (var d = 0; d < 4; d++) { var nx = x + DX[d], ny = y + DY[d]; if (exploreWalkable(m, nx, ny)) { var dd = Math.abs(nx - h.x) + Math.abs(ny - h.y); if (dd < bd) { bd = dd; best = [nx, ny]; } } }
      if (!best) return false;
      x = best[0]; y = best[1];
    }
    var sx = h.path.length ? h.path[0][0] : h.x, sy = h.path.length ? h.path[0][1] : h.y;
    var p = findPath(m.w, m.h, function (cx, cy) { return exploreWalkable(m, cx, cy); }, h.x, h.y, x, y);
    if (!p) return false;
    h.path = p; h.target = null;
    if (h.t <= 0) h.t = 0.001;
    bump(w);
    return true;
  }
  function engage(w, pi, packId) {
    var pk = w.packs.filter(function (p) { return p.id === packId; })[0];
    if (!pk) return false;
    var h = w.heroes[pi];
    if (Math.abs(pk.x - h.x) + Math.abs(pk.y - h.y) <= 1) { startCombat(w, pk); return true; }
    var m = zoneMap(w.zone);
    var p = findPath(m.w, m.h, function (cx, cy, end) { return exploreWalkable(m, cx, cy) || end; }, h.x, h.y, pk.x, pk.y);
    if (!p) return false;
    p.pop();
    h.path = p; h.target = packId; if (h.t <= 0) h.t = 0.001;
    bump(w);
    return true;
  }
  function stepExplore(w, dt) {
    var m = zoneMap(w.zone), changed = false;
    for (var i = 0; i < w.heroes.length; i++) {
      var h = w.heroes[i];
      if (!h || !h.path.length) continue;
      h.t -= dt;
      if (h.t > 0) continue;
      var nx = h.path.shift();
      h.face = sgn(nx[0] - h.x) || sgn(nx[1] - h.y) * 2 || h.face;
      h.dir = [nx[0] - h.x, nx[1] - h.y];
      h.x = nx[0]; h.y = nx[1]; h.t = CFG.exploreStep; changed = true;
      ev(w, { k: "step", pi: i });
      var po = portalAt(w.zone, h.x, h.y);
      if (po && !h.path.length) {
        if (po.req && partyLevel(w) < po.req) { say(w, "Il faut être niveau " + po.req + " pour aller vers « " + po.label + " ».", i); h.path = []; }
        else if (po.to.indexOf("dungeon:") === 0) { startDungeon(w, po.to.slice(8)); return; }
        else { enterZone(w, po.to, w.zone); return; }
      }
    }
    // les groupes se promènent
    w.packs.forEach(function (pk) {
      if (pk.dead) { pk.t -= dt; if (pk.t <= 0) { pk.dead = false; pk.t = 3; changed = true; } return; }
      pk.t -= dt;
      if (pk.t > 0) return;
      // un groupe visé par un héros l'attend
      if (w.heroes.some(function (h) { return h && h.target === pk.id && h.path.length; })) { pk.t = 0.5; return; }
      pk.t = CFG.packWander[0] + R() * (CFG.packWander[1] - CFG.packWander[0]);
      var d = Math.floor(R() * 4), nx = pk.x + DX[d], ny = pk.y + DY[d];
      if (!exploreWalkable(m, nx, ny) || portalAt(w.zone, nx, ny) || Math.abs(nx - pk.hx) + Math.abs(ny - pk.hy) > 3) return;
      if (w.heroes.some(function (h) { return h && h.x === nx && h.y === ny; })) return;
      if (w.packs.some(function (o) { return o !== pk && !o.dead && o.x === nx && o.y === ny; })) return;
      pk.face = sgn(nx - pk.x) || sgn(ny - pk.y) * 2; pk.x = nx; pk.y = ny; changed = true;
      ev(w, { k: "pstep", id: pk.id });
    });
    // un groupe de monstres collé à un héros : combat !
    for (var hi = 0; hi < w.heroes.length; hi++) {
      var hh = w.heroes[hi];
      if (!hh) continue;
      for (var j = 0; j < w.packs.length; j++) {
        var pk = w.packs[j];
        if (pk.dead || pk.calm > w.t) continue;
        if (Math.abs(pk.x - hh.x) + Math.abs(pk.y - hh.y) <= 1) { w.heroes.forEach(function (o) { if (o) { o.path = []; o.target = null; } }); startCombat(w, pk); return; }
      }
    }
    if (changed) bump(w);
  }

  /* ====================== COMBAT : MISE EN PLACE ====================== */
  function startCombat(w, pk, room) {
    var theme = room ? (DUNGEONS[room.dungeon] && DUNGEONS[room.dungeon].theme) || "donjon" : ZONES[w.zone].theme;
    var A = genArena(theme, Math.floor(R() * 1e9), w.players.length);
    var c = { arena: A, units: [], uid: 1, turn: -1, order: [], round: 1, phase: "place", objects: [], tele: [], log: [], packId: pk ? pk.id : null, room: room || null, aiT: 0, aiN: 0, stats: {} };
    w.combat = c; w.mode = "combat";
    // héros
    w.players.forEach(function (pl, i) {
      if (!pl) return;
      var s = heroStats(pl.profile), C = CLASSES[pl.profile.cls];
      var keepHp = w.dungeon && w.dungeon.hp && w.dungeon.hp[i] != null ? w.dungeon.hp[i] : null;
      var cell = A.heroCells[i * 4 + 4] || A.heroCells[i];
      c.units.push({ id: c.uid++, side: 0, pi: i, cls: pl.profile.cls, name: pl.name, lvl: pl.profile.level,
        x: cell[0], y: cell[1], hp: keepHp != null ? Math.max(1, Math.min(s.hp, keepHp)) : s.hp, maxHp: s.hp,
        pa: s.pa, pm: s.pm, maxPa: s.pa, maxPm: s.pm, po: s.po, res: s.res, ini: s.ini, crit: s.crit, heal: s.heal, pow: 0, elem: s.elem, dom: s.dom,
        powers: s.powers, shield: [], status: [], cds: {}, used: {}, usedT: {}, alive: true, face: 1, ult: pl.profile.level >= ULT_LEVEL });
      c.stats[i] = { dmg: 0, heal: 0, kills: 0 };
    });
    // monstres
    var mobs = pk ? pk.mobs : [];
    mobs.forEach(function (mb, i) {
      var cell = A.mobCells[(i * 5 + 3) % A.mobCells.length];
      while (unitAt(c, cell[0], cell[1])) cell = A.mobCells[(A.mobCells.indexOf(cell) + 1) % A.mobCells.length];
      addMob(c, mb.type, mb.lvl, mb.affix, cell[0], cell[1]);
    });
    computeOrder(c);
    ev(w, { k: "combat" });
    bump(w);
  }
  function addMob(c, type, lvl, affix, x, y, summoned) {
    var M = MOBS[type], A = affix ? AFFIXES[affix] : {};
    var hp = Math.round(M.hp * (1 + 0.24 * (lvl - 1)) * (A.hpMul || 1) * (affix ? 1.15 : 1));
    var u = { id: c.uid++, side: 1, type: type, name: M.name, lvl: lvl, affix: affix, x: x, y: y, hp: hp, maxHp: hp,
      pa: M.pa + (A.pa || 0), pm: M.pm + (A.pm || 0), maxPa: M.pa + (A.pa || 0), maxPm: M.pm + (A.pm || 0), po: 0,
      res: (M.res || 0) + (A.res || 0), ini: M.ini + lvl, crit: 5, heal: 0, pow: (lvl - 1) * 7 + (A.pow || 0), vamp: A.vamp || 0,
      powers: [], shield: [], status: [], cds: {}, used: {}, usedT: {}, alive: true, face: -1, boss: !!M.boss, summoned: !!summoned };
    c.units.push(u);
    return u;
  }
  function computeOrder(c) {
    // ordre par initiative, en alternant les camps comme sur un échiquier
    var h = c.units.filter(function (u) { return u.side === 0 && u.alive; }).sort(byIni);
    var m = c.units.filter(function (u) { return u.side === 1 && u.alive; }).sort(byIni);
    var first = (h[0] ? h[0].ini : 0) >= (m[0] ? m[0].ini : 0) ? [h, m] : [m, h], out = [];
    while (first[0].length || first[1].length) { if (first[0].length) out.push(first[0].shift().id); if (first[1].length) out.push(first[1].shift().id); }
    c.order = out;
  }
  function byIni(a, b) { return b.ini - a.ini || a.id - b.id; }
  function unitAt(c, x, y) { for (var i = 0; i < c.units.length; i++) { var u = c.units[i]; if (u.alive && u.x === x && u.y === y) return u; } return null; }
  function objAt(c, x, y) { for (var i = 0; i < c.objects.length; i++) { var o = c.objects[i]; if (o.x === x && o.y === y) return o; } return null; }
  function uById(c, id) { for (var i = 0; i < c.units.length; i++) if (c.units[i].id === id) return c.units[i]; return null; }
  function active(c) { return c && c.turn >= 0 ? uById(c, c.order[c.turn]) : null; }
  function inArena(c, x, y) { var A = c.arena; return x >= 0 && y >= 0 && x < A.w && y < A.h && A.g[x][y] !== 9; }
  function groundOk(c, x, y) { return inArena(c, x, y) && c.arena.g[x][y] === 0; }
  function solidObj(c, x, y) { var o = objAt(c, x, y); return o && (o.kind === "wall" || o.kind === "beacon"); }
  function cellFree(c, x, y, ignore) {
    if (!groundOk(c, x, y) || solidObj(c, x, y)) return false;
    var u = unitAt(c, x, y);
    return !u || u === ignore;
  }
  function blocksLos(c, x, y) {
    if (!inArena(c, x, y)) return true;
    if (c.arena.g[x][y] === 1) return true;
    var o = objAt(c, x, y);
    if (o && (o.kind === "wall" || o.kind === "beacon" || o.kind === "smoke")) return true;
    return !!unitAt(c, x, y);
  }
  // ligne de vue : on parcourt les cases traversées par le segment (sans les deux bouts)
  function los(c, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, n = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
    if (n === 0) return true;
    var last = null;
    for (var i = 1; i < n; i++) {
      var t = i / n, fx = ax + dx * t, fy = ay + dy * t;
      // on décale un peu pour ne pas « frôler » un coin exact
      var cx = Math.round(fx + 1e-4), cy = Math.round(fy - 1e-4);
      var k = cx + "," + cy;
      if (k === last) continue; last = k;
      if ((cx === ax && cy === ay) || (cx === bx && cy === by)) continue;
      if (blocksLos(c, cx, cy)) return false;
    }
    return true;
  }
  function shapeOk(st, dx, dy, bonus) {
    var mn = st.range[0], mx = st.range[1] + (st.boost ? bonus : 0), adx = Math.abs(dx), ady = Math.abs(dy), d = adx + ady;
    switch (st.shape) {
      case "self": return dx === 0 && dy === 0;
      case "line": return (dx === 0 || dy === 0) && d >= mn && d <= mx;
      case "diag": return adx === ady && adx >= mn && adx <= mx;
      case "ray": return adx === ady && adx >= 1;
      case "knight": return (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
      case "queen": return (dx === 0 || dy === 0 || adx === ady) && Math.max(adx, ady) >= mn && Math.max(adx, ady) <= mx;
      default: return d >= mn && d <= mx;
    }
  }

  /* ---------- ciblage ---------- */
  function spellOrigins(c, u, st, prev) {
    if (st.from === "prev") return [prev.length ? prev[prev.length - 1] : [u.x, u.y]];
    var o = [[u.x, u.y]];
    if (st.from === "relay") c.objects.forEach(function (b) { if (b.kind === "beacon" && b.by === u.id) o.push([b.x, b.y]); });
    return o;
  }
  function canCast(w, u, sid) {
    var c = w.combat, S = SPELLS[sid];
    if (!c || !u || !S) return "?";
    if (S.ult && !u.ult) return "Débloqué au niveau " + ULT_LEVEL;
    if ((u.cds[sid] || 0) > 0) return "Recharge : " + u.cds[sid] + " tour" + (u.cds[sid] > 1 ? "s" : "");
    if (S.perTurn && (u.used[sid] || 0) >= S.perTurn) return "Déjà lancé " + S.perTurn + "× ce tour";
    if (spellCost(u, sid) > u.pa) return "Pas assez de PA";
    if ((sid === "pion" || sid === "maree") && mySummons(c, u).length >= SUMMON_MAX) return SUMMON_MAX + " invocations maximum";
    if (sid === "promotion" && mySummons(c, u).some(function (x) { return x.cls === "dame"; })) return "Une seule Dame à la fois";
    if (sid === "balise" && c.objects.filter(function (o) { return o.kind === "beacon" && o.by === u.id; }).length >= S.max) return "2 cristaux maximum";
    return null;
  }
  function spellCost(u, sid) {
    var cost = SPELLS[sid].pa;
    if (u.powers.indexOf("cheap") >= 0 && !u.castThisTurn) cost = Math.max(1, cost - 1);
    return cost;
  }
  // cases valides pour l'étape suivante (prev = cases déjà choisies)
  function targets(w, u, sid, prev) {
    var c = w.combat, S = SPELLS[sid];
    prev = prev || [];
    var st = S.steps[prev.length];
    if (!st || !c) return [];
    var out = [], seen = {}, A = c.arena, origins = spellOrigins(c, u, st, prev);
    // pour les bonds enchaînés et le passage fantôme : le lanceur a quitté sa case
    origins.forEach(function (o) {
      for (var x = 0; x < A.w; x++) for (var y = 0; y < A.h; y++) {
        if (seen[key(x, y)] || !inArena(c, x, y)) continue;
        var dx = x - o[0], dy = y - o[1];
        if (!shapeOk(st, dx, dy, u.po || 0)) continue;
        if (st.shape === "ray" && prev.some(function (p) { return sgn(p[0] - u.x) === sgn(dx) && sgn(p[1] - u.y) === sgn(dy); })) continue;
        if (!targetOk(c, u, st, x, y, sid, prev)) continue;
        if (st.los && !(dx === 0 && dy === 0) && !los(c, o[0], o[1], x, y)) continue;
        seen[key(x, y)] = 1; out.push([x, y]);
      }
    });
    return out;
  }
  function targetOk(c, u, st, x, y, sid, prev) {
    var t = unitAt(c, x, y);
    switch (st.target) {
      case "self": return t === u;
      case "enemy":
        if (!t || t.side === u.side) return false;
        if (sid === "fantome") return !!behindCell(c, u, t);
        return true;
      case "ally": if (!t || t.side !== u.side) return false; if (SPELLS[sid].perTarget && (u.usedT[sid + ":" + t.id] || 0) >= SPELLS[sid].perTarget) return false; return true;
      case "summon": return !!(t && t.summon && t.owner === u.id && (sid !== "promotion" || t.cls === "pion"));
      case "allyOrBeacon": { if (t && t.side === u.side && t !== u) return true; var o = objAt(c, x, y); return !!(o && o.kind === "beacon"); }
      case "empty": {
        if (!groundOk(c, x, y) || solidObj(c, x, y)) return false;
        var occ = unitAt(c, x, y);
        if (sid === "danse") { if (occ && occ !== u) return false; return !prev.some(function (p) { return p[0] === x && p[1] === y; }); }
        if (sid === "transpo" && prev.length) { var mover = unitAt(c, prev[0][0], prev[0][1]); return !occ || occ === mover; }
        return !occ;
      }
      default: return inArena(c, x, y);
    }
  }
  function behindCell(c, u, t) {
    var dx = t.x - u.x, dy = t.y - u.y, cands = [];
    if (Math.abs(dx) >= Math.abs(dy)) cands.push([t.x + sgn(dx), t.y]);
    if (Math.abs(dy) >= Math.abs(dx)) cands.push([t.x, t.y + sgn(dy)]);
    cands.push([t.x + sgn(dx || 1), t.y + sgn(dy)], [t.x - sgn(dy), t.y + sgn(dx)], [t.x + sgn(dy), t.y - sgn(dx)]);
    for (var i = 0; i < cands.length; i++) if (cellFree(c, cands[i][0], cands[i][1], u) && !(cands[i][0] === u.x && cands[i][1] === u.y && false)) return cands[i];
    return null;
  }
  // cases touchées (aperçu en jaune / rouge)
  function area(w, u, sid, tg) {
    var c = w.combat, out = [];
    if (!c || !tg || !tg.length) return out;
    var last = tg[tg.length - 1];
    if (sid === "mur") return wallCells(c, u, last[0], last[1]);
    if (sid === "brume") return plus(last[0], last[1]).filter(function (p) { return inArena(c, p[0], p[1]); });
    if (sid === "forteresse" || sid === "rayonnement") return disc(c, u.x, u.y, 2);
    if (sid === "aurore") return disc(c, u.x, u.y, 3);
    if (sid === "transe") return [[u.x, u.y]];
    if (sid === "jugement") { [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) { var x = u.x + d[0], y = u.y + d[1]; while (inArena(c, x, y) && c.arena.g[x][y] !== 1) { out.push([x, y]); x += d[0]; y += d[1]; } }); return out; }
    if (sid === "vague" || sid === "rosee") return plus(last[0], last[1]).filter(function (p) { return inArena(c, p[0], p[1]); });
    if (sid === "geyser") return disc(c, last[0], last[1], 1);
    if (sid === "razdemaree") return disc(c, last[0], last[1], 2);
    if (sid === "deferlante") return lineFrom(c, u, last, 4);
    if (sid === "convergence") { tg.forEach(function (p) { rays(c, u, p).forEach(function (r) { out = out.concat(r.cells); }); }); return out; }
    if (sid === "danse") { tg.forEach(function (p) { out = out.concat(ring8(c, p[0], p[1])); }); return out; }
    if (sid === "impact" || sid === "attraction") return [last];
    return [last];
  }
  function plus(x, y) { return [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; }
  function ring8(c, x, y) { var o = []; for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) if ((dx || dy) && inArena(c, x + dx, y + dy)) o.push([x + dx, y + dy]); return o; }
  function disc(c, x, y, r) { var o = []; for (var dx = -r; dx <= r; dx++) for (var dy = -r; dy <= r; dy++) if (Math.abs(dx) + Math.abs(dy) <= r && inArena(c, x + dx, y + dy)) o.push([x + dx, y + dy]); return o; }
  function wallCells(c, u, x, y) {
    var dx = x - u.x, dy = y - u.y, out = [[x, y]];
    var side = Math.abs(dx) >= Math.abs(dy) ? [[x, y + 1], [x, y - 1]] : [[x + 1, y], [x - 1, y]];
    for (var i = 0; i < side.length; i++) if (groundOk(c, side[i][0], side[i][1]) && !unitAt(c, side[i][0], side[i][1]) && !objAt(c, side[i][0], side[i][1])) { out.push(side[i]); break; }
    return out;
  }
  function rays(c, u, p) {
    var dx = sgn(p[0] - u.x), dy = sgn(p[1] - u.y), out = [];
    var origins = [[u.x, u.y]];
    c.objects.forEach(function (b) { if (b.kind === "beacon" && b.by === u.id) origins.push([b.x, b.y]); });
    origins.forEach(function (o) {
      var cells = [], x = o[0] + dx, y = o[1] + dy;
      while (inArena(c, x, y) && c.arena.g[x][y] !== 1 && !(objAt(c, x, y) && objAt(c, x, y).kind === "wall")) { cells.push([x, y]); x += dx; y += dy; }
      out.push({ from: o, dir: [dx, dy], cells: cells });
    });
    return out;
  }

  /* ---------- dégâts, soins, déplacements forcés ---------- */
  function damage(w, src, t, base, opt) {
    var c = w.combat;
    opt = opt || {};
    if (!t || !t.alive) return 0;
    var el = opt.el || (src && src.curEl) || null;
    var stat = src ? (src.elem ? (el ? src.elem[el] || 0 : Math.max(src.elem.terre, src.elem.feu, src.elem.eau, src.elem.air)) : src.pow || 0) : 0;
    var mul = 1 + stat / 100;
    if (src && src.powers.indexOf("first") >= 0 && !src.firstHit && !opt.noFirst) { mul *= 1.6; src.firstHit = true; }
    var crit = !opt.noCrit && src && R() * 100 < src.crit;
    if (crit) mul *= src.powers.indexOf("critx2") >= 0 ? 2 : 1.5;
    var flat = src ? (src.dom || 0) + statusSum(src, "dom") : 0;
    var res = t.res + statusSum(t, "res");
    var d = Math.max(1, Math.round((base * mul + (opt.push ? 0 : flat)) * (1 - clamp(res, -50, 75) / 100) * (0.92 + R() * 0.16)));
    var absorbed = 0;
    while (d > 0 && t.shield.length) {
      var sh = t.shield[0], a = Math.min(sh.v, d);
      sh.v -= a; d -= a; absorbed += a;
      if (sh.v <= 0) t.shield.shift();
    }
    t.hp -= d;
    ev(w, { k: "dmg", id: t.id, v: d, sh: absorbed, crit: crit, src: src ? src.id : 0, push: !!opt.push });
    if (src && src.side === 0) c.stats[src.pi] && (c.stats[src.pi].dmg += d + absorbed);
    // vol de vie
    if (src && src.alive && (src.vamp || src.powers.indexOf("vamp") >= 0) && d > 0) heal(w, src, src, Math.round(d * ((src.vamp || 15) / 100)), true);
    // épines
    if (src && !opt.thorn && t.powers.indexOf("thorns") >= 0 && Math.abs(src.x - t.x) + Math.abs(src.y - t.y) <= 1) damage(w, t, src, Math.round((d + absorbed) * 0.3 / (1 + t.pow / 100)), { thorn: true, noCrit: true, noFirst: true });
    if (t.hp <= 0) kill(w, t, src);
    return d;
  }
  function kill(w, t, src) {
    var c = w.combat;
    t.hp = 0; t.alive = false; t.shield = [];
    ev(w, { k: "die", id: t.id });
    if (!t.summon) c.units.forEach(function (m) { if (m.alive && m.summon && m.owner === t.id) { m.alive = false; m.hp = 0; ev(w, { k: "die", id: m.id, quiet: true }); } });
    // les cristaux et murs de ce lanceur restent ; ses télégraphes tombent
    c.tele = c.tele.filter(function (tl) { return tl.by !== t.id; });
    if (src && src.side === 0 && t.side === 1) {
      if (c.stats[src.pi]) c.stats[src.pi].kills++;
      if (src.powers.indexOf("killpm") >= 0 && src.alive) { src.pm += 2; src.pa += 2; ev(w, { k: "buff", id: src.id, text: "+2 PA +2 PM" }); }
    }
    if (t.side === 1 && !t.summoned) { c.defeated = c.defeated || []; c.defeated.push({ type: t.type, lvl: t.lvl, affix: t.affix, boss: t.boss }); }
  }
  function heal(w, src, t, v, silent) {
    if (!t || !t.alive) return 0;
    var a = Math.min(t.maxHp - t.hp, Math.round(v));
    if (a <= 0 && silent) return 0;
    t.hp += Math.max(0, a);
    ev(w, { k: "heal", id: t.id, v: Math.max(0, a) });
    if (src && src.side === 0 && w.combat.stats[src.pi] && !silent) w.combat.stats[src.pi].heal += Math.max(0, a);
    return a;
  }
  function addShield(w, src, t, v) {
    var amt = Math.round(v * (1 + (src.heal || 0) / 100));
    t.shield.push({ v: amt, by: src.id });
    ev(w, { k: "shield", id: t.id, v: amt });
  }
  function statusSum(u, k) { var s = 0; u.status.forEach(function (st) { if (st.k === k) s += st.v; }); return s; }
  // pousse (d > 0) ou attire (d < 0) t par rapport à la case (ox, oy)
  function knock(w, src, t, ox, oy, dist, pull) {
    var c = w.combat;
    if (!t.alive || t.boss) { if (t.boss) ev(w, { k: "buff", id: t.id, text: "Inébranlable" }); return; }
    var dx = sgn(t.x - ox), dy = sgn(t.y - oy);
    if (pull) { dx = -dx; dy = -dy; }
    if (dx && dy) { if (Math.abs(t.x - ox) >= Math.abs(t.y - oy)) dy = 0; else dx = 0; }
    var moved = 0, path = [];
    for (var i = 0; i < dist; i++) {
      var nx = t.x + dx, ny = t.y + dy;
      if (pull && nx === ox && ny === oy) break;
      if (!cellFree(c, nx, ny)) break;
      t.x = nx; t.y = ny; moved++; path.push([nx, ny]);
    }
    if (moved) ev(w, { k: "slide", id: t.id, path: path });
    if (!pull && moved < dist) {
      var hit = CFG.pushDmg * (dist - moved) * (src && src.powers.indexOf("crush") >= 0 ? 3 : 1);
      ev(w, { k: "bump", id: t.id, dx: dx, dy: dy });
      damage(w, src, t, hit, { push: true, noFirst: true });
      var other = unitAt(c, t.x + dx, t.y + dy);
      if (other && other !== src) damage(w, src, other, Math.round(hit / 2), { push: true, noFirst: true });
    }
  }
  function teleport(w, u, x, y, fx) {
    var from = [u.x, u.y];
    u.x = x; u.y = y;
    ev(w, { k: "tp", id: u.id, from: from, to: [x, y], fx: fx || "tri" });
  }

  /* ---------- lancer un sort ---------- */
  function cast(w, u, sid, tg) {
    var c = w.combat, S = SPELLS[sid];
    if (canCast(w, u, sid)) return false;
    var need = S.minSteps || S.steps.length;
    if (!tg || tg.length < need || tg.length > S.steps.length) return false;
    // on valide chaque étape
    for (var i = 0; i < tg.length; i++) {
      var ok = targets(w, u, sid, tg.slice(0, i)).some(function (p) { return p[0] === tg[i][0] && p[1] === tg[i][1]; });
      if (!ok) return false;
    }
    var cost = spellCost(u, sid);
    var echo = u.powers.indexOf("echo") >= 0 && R() < 0.2;
    u.pa -= echo ? 0 : cost;
    u.castThisTurn = true; u.curEl = S.el || null;
    u.used[sid] = (u.used[sid] || 0) + 1;
    if (S.cd) u.cds[sid] = S.cd + 1;
    var t0 = tg[0], tu = unitAt(c, t0[0], t0[1]);
    if (tu && tu !== u) u.face = faceOf(t0[0] - u.x, t0[1] - u.y);
    ev(w, { k: "cast", id: u.id, s: sid, tg: tg, echo: echo });
    if (echo) ev(w, { k: "buff", id: u.id, text: "Écho ! 0 PA" });
    if (S.perTarget && tu) u.usedT[sid + ":" + tu.id] = (u.usedT[sid + ":" + tu.id] || 0) + 1;
    EFFECTS[sid](w, u, tg, S);
    afterAction(w);
    return true;
  }
  function faceOf(dx, dy) { return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : -1) : (dy >= 0 ? 2 : -2); }
  function powScale(u) { return 1; }
  // zone : dégâts aux ennemis, soins aux alliés (jamais au lanceur lui-même pour les dégâts)
  function zone(w, u, cells, dmg, hl) {
    var c = w.combat, seen = {};
    cells.forEach(function (p) {
      var t = unitAt(c, p[0], p[1]);
      if (!t || seen[t.id]) return;
      seen[t.id] = 1;
      if (t.side !== u.side) { if (dmg) damage(w, u, t, dmg); }
      else if (hl) heal(w, u, t, hl * (1 + u.heal / 100));
    });
  }
  function lineFrom(c, u, dir, n) {
    var dx = sgn(dir[0] - u.x), dy = sgn(dir[1] - u.y), out = [];
    for (var i = 1; i <= n; i++) { var x = u.x + dx * i, y = u.y + dy * i; if (!inArena(c, x, y) || c.arena.g[x][y] === 1) break; out.push([x, y]); }
    return out;
  }
  function mySummons(c, u) { return c.units.filter(function (x) { return x.alive && x.summon && x.owner === u.id; }); }
  function addSummon(w, u, cls, x, y) {
    var c = w.combat, S = SUMMONS[cls], hp = Math.round((S.hp + S.hpL * u.lvl) * (1 + (u.heal || 0) / 200));
    var m = { id: c.uid++, side: 0, pi: u.pi, cls: cls, summon: true, owner: u.id, name: S.name, lvl: u.lvl, x: x, y: y, hp: hp, maxHp: hp,
      pa: S.pa, pm: S.pm, maxPa: S.pa, maxPm: S.pm, po: 0, res: 0, ini: S.ini, crit: Math.round(u.crit / 2), heal: 0, pow: Math.round((u.elem ? u.elem[CLASSES[u.cls].el] : 0) * 0.8), dom: Math.round((u.dom || 0) / 2),
      powers: [], shield: [], status: [], cds: {}, used: {}, usedT: {}, alive: true, face: u.face, ult: false };
    c.units.push(m);
    // elle joue juste après son invocatrice
    var at = c.order.indexOf(u.id);
    c.order.splice(at < 0 ? c.order.length : at + 1, 0, m.id);
    ev(w, { k: "summon", id: m.id, hero: true });
    return m;
  }
  var EFFECTS = {
    pion: function (w, u, tg) { addSummon(w, u, "pion", tg[0][0], tg[0][1]); },
    promotion: function (w, u, tg) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]), S = SUMMONS.dame;
      var hp = Math.round((S.hp + S.hpL * u.lvl) * (1 + (u.heal || 0) / 200));
      t.cls = "dame"; t.name = S.name; t.maxHp = hp; t.hp = Math.min(hp, t.hp + Math.round(hp * 0.5)); t.ini = S.ini;
      t.maxPa = S.pa; t.maxPm = S.pm; t.pa = Math.min(t.pa + 1, S.pa); t.pm = Math.min(t.pm + 1, S.pm);
      ev(w, { k: "promote", id: t.id });
    },
    sacrifice: function (w, u, tg, S) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]);
      ev(w, { k: "burst", at: [t.x, t.y] });
      ring8(c, t.x, t.y).forEach(function (p) { var e = unitAt(c, p[0], p[1]); if (e && e.side !== u.side) damage(w, u, e, S.dmg); });
      disc(c, t.x, t.y, 2).forEach(function (p) { var a = unitAt(c, p[0], p[1]); if (a && a.side === u.side && a !== t && !a.summon) heal(w, u, a, S.heal * (1 + u.heal / 100)); });
      t.alive = false; t.hp = 0; ev(w, { k: "die", id: t.id, quiet: true });
    },
    roque: function (w, u, tg) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]), ux = u.x, uy = u.y;
      u.x = t.x; u.y = t.y; t.x = ux; t.y = uy;
      ev(w, { k: "tp", id: u.id, from: [ux, uy], to: [u.x, u.y], fx: "ink" });
      ev(w, { k: "tp", id: t.id, from: [u.x, u.y], to: [ux, uy], fx: "ink" });
    },
    maree: function (w, u, tg, S) {
      var c = w.combat, spots = ring8(c, u.x, u.y).filter(function (q) { return cellFree(c, q[0], q[1]); });
      var n = Math.min(3, SUMMON_MAX - mySummons(c, u).length, spots.length);
      for (var i = 0; i < n; i++) addSummon(w, u, "pion", spots[i][0], spots[i][1]);
      mySummons(c, u).forEach(function (m) { addShield(w, u, m, S.shield); m.maxPaBonus = 1; });
      ev(w, { k: "ink", at: [u.x, u.y] });
    },
    // Clarine
    lueur: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); if (t !== u) ev(w, { k: "beam", from: [u.x, u.y], to: tg[0], col: "#ffd27d", w: 3 }); heal(w, u, t, S.heal * (1 + u.heal / 100)); },
    eclat: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); ev(w, { k: "beam", from: [u.x, u.y], to: tg[0], col: "#ff9a3c" }); damage(w, u, t, S.dmg); },
    benediction: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); heal(w, u, t, S.heal * (1 + u.heal / 100)); addShield(w, u, t, S.shield); },
    rayonnement: function (w, u, tg, S) { ev(w, { k: "nova", at: [u.x, u.y], r: 2, col: "#ff9a3c" }); zone(w, u, disc(w.combat, u.x, u.y, 2), S.dmg, S.heal); },
    aurore: function (w, u, tg, S) {
      var c = w.combat;
      ev(w, { k: "nova", at: [u.x, u.y], r: 3, col: "#ffd27d", big: true });
      c.units.forEach(function (t) { if (t.alive && t.side === u.side && !t.summon) heal(w, u, t, S.heal * (1 + u.heal / 100)); });
      disc(c, u.x, u.y, 3).forEach(function (p) { var t = unitAt(c, p[0], p[1]); if (t && t.side !== u.side) damage(w, u, t, S.dmg); });
    },
    // Orage
    foudre: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); ev(w, { k: "beam", from: [u.x, u.y], to: tg[0], col: "#e0c060", big: true }); damage(w, u, t, S.dmg); },
    fracas: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); ev(w, { k: "slash", id: u.id, to: tg[0], col: "#e0c060" }); damage(w, u, t, S.dmg); },
    trombe: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); ev(w, { k: "beam", from: [u.x, u.y], to: tg[0], col: "#c9b2ff", w: 5 }); damage(w, u, t, S.dmg); if (t && t.alive) knock(w, u, t, u.x, u.y, S.push); },
    transe: function (w, u, tg, S) { u.status.push({ k: "dom", v: 25, by: u.id, turns: 1, name: "Transe" }); ev(w, { k: "buff", id: u.id, text: "+25 dommages" }); ev(w, { k: "nova", at: [u.x, u.y], r: 1, col: "#e0c060" }); },
    jugement: function (w, u, tg, S) {
      var c = w.combat, hit = {};
      [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) {
        var cells = [], x = u.x + d[0], y = u.y + d[1];
        while (inArena(c, x, y) && c.arena.g[x][y] !== 1 && !(objAt(c, x, y) && objAt(c, x, y).kind === "wall")) { cells.push([x, y]); x += d[0]; y += d[1]; }
        ev(w, { k: "beam", from: [u.x, u.y], to: cells.length ? cells[cells.length - 1] : [u.x, u.y], col: "#e0c060", big: true });
        cells.forEach(function (p) { var t = unitAt(c, p[0], p[1]); if (t && t.side !== u.side && !hit[t.id]) { hit[t.id] = 1; damage(w, u, t, S.dmg); } });
      });
    },
    // Ondine
    vague: function (w, u, tg, S) { ev(w, { k: "splash", cells: plus(tg[0][0], tg[0][1]) }); zone(w, u, plus(tg[0][0], tg[0][1]), S.dmg, 0); },
    geyser: function (w, u, tg, S) {
      var c = w.combat, cells = disc(c, tg[0][0], tg[0][1], 1);
      ev(w, { k: "splash", cells: cells, big: true });
      cells.forEach(function (p) { var t = unitAt(c, p[0], p[1]); if (t && t.side !== u.side) { damage(w, u, t, S.dmg); if (t.alive && !(p[0] === tg[0][0] && p[1] === tg[0][1])) knock(w, u, t, tg[0][0], tg[0][1], S.push); } });
    },
    deferlante: function (w, u, tg, S) { var cells = lineFrom(w.combat, u, tg[0], 4); ev(w, { k: "splash", cells: cells, wave: true }); zone(w, u, cells, S.dmg, 0); },
    rosee: function (w, u, tg, S) { ev(w, { k: "splash", cells: plus(tg[0][0], tg[0][1]), soft: true }); zone(w, u, plus(tg[0][0], tg[0][1]), 0, S.heal); },
    razdemaree: function (w, u, tg, S) { var cells = disc(w.combat, tg[0][0], tg[0][1], 2); ev(w, { k: "splash", cells: cells, big: true, huge: true }); zone(w, u, cells, S.dmg, S.heal); },
    impact: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); damage(w, u, t, S.dmg); if (t && t.alive) knock(w, u, t, u.x, u.y, S.push); },
    rempart: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); addShield(w, u, t, S.shield); },
    mur: function (w, u, tg, S) {
      var c = w.combat;
      wallCells(c, u, tg[0][0], tg[0][1]).forEach(function (p) { c.objects.push({ kind: "wall", x: p[0], y: p[1], by: u.id, turns: S.dur }); });
      ev(w, { k: "wall", cells: wallCells(c, u, tg[0][0], tg[0][1]) });
    },
    attraction: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); damage(w, u, t, S.dmg); if (t && t.alive) knock(w, u, t, u.x, u.y, S.pull, true); },
    forteresse: function (w, u, tg, S) {
      var c = w.combat;
      disc(c, u.x, u.y, 2).forEach(function (p) {
        var t = unitAt(c, p[0], p[1]);
        if (t && t.side === u.side) { addShield(w, u, t, S.shield); t.status.push({ k: "res", v: 25, by: u.id, turns: 1, name: "Forteresse" }); }
      });
      ring8(c, u.x, u.y).forEach(function (p) { var t = unitAt(c, p[0], p[1]); if (t && t.side !== u.side) knock(w, u, t, u.x, u.y, 1); });
    },
    rayon: function (w, u, tg, S) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]);
      // d'où part le rayon ? du lanceur si possible, sinon d'un cristal
      var st = S.steps[0], from = [u.x, u.y];
      var os = spellOrigins(c, u, st, []);
      for (var i = 0; i < os.length; i++) { var o = os[i]; if (shapeOk(st, tg[0][0] - o[0], tg[0][1] - o[1], u.po) && los(c, o[0], o[1], tg[0][0], tg[0][1])) { from = o; break; } }
      ev(w, { k: "beam", from: from, to: tg[0], col: "#b98cff" });
      damage(w, u, t, S.dmg + (from[0] !== u.x || from[1] !== u.y ? 4 : 0));
    },
    balise: function (w, u, tg, S) { w.combat.objects.push({ kind: "beacon", x: tg[0][0], y: tg[0][1], by: u.id, turns: S.dur, hp: S.hp }); },
    transpo: function (w, u, tg) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]);
      if (t) teleport(w, t, tg[1][0], tg[1][1]);
      else { var o = objAt(c, tg[0][0], tg[0][1]); if (o) { ev(w, { k: "tpobj", from: [o.x, o.y], to: tg[1] }); o.x = tg[1][0]; o.y = tg[1][1]; } }
    },
    onde: function (w, u, tg, S) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]);
      heal(w, u, t, S.heal * (1 + u.heal / 100));
    },
    convergence: function (w, u, tg, S) {
      var c = w.combat, hitOnce = {};
      tg.forEach(function (p) {
        rays(c, u, p).forEach(function (r) {
          ev(w, { k: "beam", from: r.from, to: r.cells.length ? r.cells[r.cells.length - 1] : r.from, col: "#9ff3ff", big: true });
          r.cells.forEach(function (cl) {
            var t = unitAt(c, cl[0], cl[1]);
            if (!t || hitOnce[t.id]) return;
            hitOnce[t.id] = 1;
            if (t.side !== u.side) damage(w, u, t, S.dmg); else heal(w, u, t, S.heal * (1 + u.heal / 100));
          });
        });
      });
    },
    bond: function (w, u, tg) { var from = [u.x, u.y]; u.x = tg[0][0]; u.y = tg[0][1]; u.face = faceOf(u.x - from[0], u.y - from[1]); ev(w, { k: "jump", id: u.id, from: from, to: tg[0] }); },
    frappe: function (w, u, tg, S) { var t = unitAt(w.combat, tg[0][0], tg[0][1]); ev(w, { k: "slash", id: u.id, to: tg[0] }); damage(w, u, t, S.dmg); },
    fantome: function (w, u, tg, S) {
      var c = w.combat, t = unitAt(c, tg[0][0], tg[0][1]), b = behindCell(c, u, t);
      if (b) { teleport(w, u, b[0], b[1], "ghost"); u.face = faceOf(t.x - u.x, t.y - u.y); }
      ev(w, { k: "slash", id: u.id, to: tg[0] });
      damage(w, u, t, S.dmg);
    },
    brume: function (w, u, tg, S) {
      var c = w.combat;
      plus(tg[0][0], tg[0][1]).forEach(function (p) {
        if (!inArena(c, p[0], p[1]) || c.arena.g[p[0]][p[1]] === 1) return;
        var o = objAt(c, p[0], p[1]); if (o) return;
        c.objects.push({ kind: "smoke", x: p[0], y: p[1], by: u.id, turns: S.dur });
      });
      ev(w, { k: "smoke", at: tg[0] });
    },
    danse: function (w, u, tg, S) {
      var c = w.combat, hit = {};
      tg.forEach(function (p, i) {
        var from = [u.x, u.y];
        u.x = p[0]; u.y = p[1];
        ev(w, { k: "jump", id: u.id, from: from, to: p, i: i });
        ring8(c, p[0], p[1]).forEach(function (q) {
          var t = unitAt(c, q[0], q[1]);
          if (t && t.side !== u.side && !hit[t.id + ":" + i]) { hit[t.id + ":" + i] = 1; damage(w, u, t, S.dmg); }
        });
      });
    },
  };

  /* ---------- déplacement en combat ---------- */
  function reach(w, u) {
    var c = w.combat, out = {}, q = [[u.x, u.y, 0]];
    out[key(u.x, u.y)] = 0;
    while (q.length) {
      var p = q.shift();
      if (p[2] >= u.pm) continue;
      for (var d = 0; d < 4; d++) {
        var nx = p[0] + DX[d], ny = p[1] + DY[d], k = key(nx, ny);
        if (out[k] != null || !cellFree(c, nx, ny)) continue;
        out[k] = p[2] + 1; q.push([nx, ny, p[2] + 1]);
      }
    }
    return out;
  }
  function combatPath(c, u, x, y, max) {
    return findPath(c.arena.w, c.arena.h, function (cx, cy) { return cellFree(c, cx, cy, u); }, u.x, u.y, x, y, max);
  }
  function moveUnit(w, u, x, y) {
    var c = w.combat;
    if (!cellFree(c, x, y)) return false;
    var p = combatPath(c, u, x, y, u.pm);
    if (!p || !p.length || p.length > u.pm) return false;
    u.pm -= p.length;
    var last = p[p.length - 1], prev = p.length > 1 ? p[p.length - 2] : [u.x, u.y];
    u.face = faceOf(last[0] - prev[0], last[1] - prev[1]);
    u.x = last[0]; u.y = last[1];
    ev(w, { k: "move", id: u.id, path: p });
    // marcher dans un télégraphe ne déclenche rien tout de suite (il explose au tour du boss)
    afterAction(w);
    return true;
  }

  /* ---------- tours ---------- */
  function beginFight(w) {
    var c = w.combat;
    c.phase = "fight"; c.turn = -1; c.round = 1;
    computeOrder(c);
    ev(w, { k: "fight" });
    nextTurn(w);
  }
  function nextTurn(w) {
    var c = w.combat;
    if (!c || c.phase !== "fight") return;
    for (var guard = 0; guard < 40; guard++) {
      c.turn++;
      if (c.turn >= c.order.length) { c.turn = 0; c.round++; }
      var u = uById(c, c.order[c.turn]);
      if (u && u.alive) { startTurn(w, u); return; }
    }
  }
  function startTurn(w, u) {
    var c = w.combat;
    u.pa = u.maxPa + (u.maxPaBonus || 0); u.maxPaBonus = 0; u.pm = u.maxPm; u.used = {}; u.usedT = {}; u.castThisTurn = false; u.firstHit = false;
    for (var k in u.cds) if (u.cds[k] > 0) u.cds[k]--;
    // ce que ce lanceur a posé expire à son tour
    c.units.forEach(function (o) {
      o.shield = o.shield.filter(function (s) { return s.by !== u.id; });
      o.status = o.status.filter(function (s) { if (s.by !== u.id) return true; s.turns--; return s.turns > 0; });
    });
    var before = c.objects.length;
    c.objects = c.objects.filter(function (o) { if (o.by !== u.id) return true; o.turns--; return o.turns > 0; });
    if (c.objects.length !== before) ev(w, { k: "expire" });
    if (u.powers.indexOf("aegis") >= 0) addShield(w, u, u, Math.round(u.maxHp * 0.12) / (1 + u.heal / 100));
    ev(w, { k: "turn", id: u.id, round: c.round });
    // le boss déclenche ses sentences
    var mine = c.tele.filter(function (t) { return t.by === u.id; });
    if (mine.length) {
      c.tele = c.tele.filter(function (t) { return t.by !== u.id; });
      mine.forEach(function (tl) {
        ev(w, { k: "boom", cells: tl.cells });
        tl.cells.forEach(function (p) { var t = unitAt(c, p[0], p[1]); if (t && t.side !== u.side) damage(w, u, t, tl.dmg, { noFirst: true }); });
      });
      if (checkEnd(w)) return;
    }
    c.aiT = u.side === 1 || u.summon ? 0.75 : 0;
    bump(w);
  }
  function endTurn(w) {
    var c = w.combat, u = active(c);
    if (!u || c.phase !== "fight") return;
    ev(w, { k: "endturn", id: u.id });
    nextTurn(w);
    bump(w);
  }
  function afterAction(w) { checkEnd(w); bump(w); }
  function checkEnd(w) {
    var c = w.combat;
    if (!c || c.phase !== "fight") return false;
    var heroes = c.units.some(function (u) { return u.side === 0 && u.alive && !u.summon; });
    var mobs = c.units.some(function (u) { return u.side === 1 && u.alive; });
    if (!mobs) { finishCombat(w, true); return true; }
    if (!heroes) { finishCombat(w, false); return true; }
    var a = active(c);
    if (a && !a.alive) { nextTurn(w); }
    return false;
  }

  /* ---------- IA des monstres ---------- */
  function mobSpells(u) { return (u.summon ? SUMMONS[u.cls].spells : MOBS[u.type].spells).map(function (id) { return { id: id, S: MOB_SPELLS[id] }; }); }
  function mobDef(u) { return u.summon ? SUMMONS[u.cls] : MOBS[u.type]; }
  function mobCanHit(c, u, S, fx, fy, t) {
    var dx = t.x - fx, dy = t.y - fy;
    if (!shapeOk({ shape: S.shape, range: S.range }, dx, dy, 0)) return false;
    if (S.los && !(dx === 0 && dy === 0) && !losFrom(c, u, fx, fy, t.x, t.y)) return false;
    return true;
  }
  function losFrom(c, u, fx, fy, tx, ty) {
    // la case de départ peut être hypothétique : on retire le monstre le temps du calcul
    var ox = u.x, oy = u.y; u.x = fx; u.y = fy;
    var r = los(c, fx, fy, tx, ty);
    u.x = ox; u.y = oy;
    return r;
  }
  function aiStep(w) {
    var c = w.combat, u = active(c);
    if (!u || (u.side !== 1 && !u.summon)) return null;
    var foes = c.units.filter(function (o) { return o.alive && o.side !== u.side; });
    var friends = c.units.filter(function (o) { return o.alive && o.side === u.side; });
    if (!foes.length) return null;
    var spells = mobSpells(u).filter(function (s) { return s.S.pa <= u.pa && !(u.cds[s.id] > 0); });
    // boss : sentence télégraphiée et invocations
    if (u.boss) {
      var sum = spells.filter(function (s) { return s.S.summon; })[0];
      if (sum && friends.length < 4 && c.round % 3 === 1) return { t: "mcast", s: sum.id };
      var sen = spells.filter(function (s) { return s.S.telegraph; })[0];
      if (sen && !c.tele.some(function (tl) { return tl.by === u.id; })) return { t: "mcast", s: sen.id };
    }
    // soigneur
    var healS = spells.filter(function (s) { return s.S.heal; })[0];
    if (healS) {
      var hurt = friends.filter(function (f) { return f.hp < f.maxHp * 0.65 && mobCanHit(c, u, healS.S, u.x, u.y, f); }).sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
      if (hurt) return { t: "mcast", s: healS.id, x: hurt.x, y: hurt.y };
    }
    var atk = spells.filter(function (s) { return s.S.dmg && !s.S.telegraph; });
    // frapper d'ici
    var best = null;
    atk.forEach(function (s) {
      foes.forEach(function (f) {
        if (!mobCanHit(c, u, s.S, u.x, u.y, f)) return;
        var sc = s.S.dmg * 2 - f.hp / f.maxHp * 10 - (f.shield.length ? 6 : 0);
        if (!best || sc > best.sc) best = { sc: sc, s: s.id, x: f.x, y: f.y };
      });
    });
    if (best) return { t: "mcast", s: best.s, x: best.x, y: best.y };
    if (u.pm <= 0) return null;
    // aller vers une case d'où l'on peut frapper
    var rc = reach(w, u), cand = null;
    var allAtk = mobSpells(u).filter(function (s) { return s.S.dmg && !s.S.telegraph && s.S.pa <= u.maxPa; });
    Object.keys(rc).forEach(function (k) {
      var p = k.split(","), x = +p[0], y = +p[1], d = rc[k];
      if (d === 0) return;
      var canNow = atk.some(function (s) { return foes.some(function (f) { return mobCanHit(c, u, s.S, x, y, f); }); });
      if (!canNow) return;
      var near = foes.reduce(function (m, f) { return Math.min(m, Math.abs(f.x - x) + Math.abs(f.y - y)); }, 99);
      var sc = (mobDef(u).ranged ? near * 2 : -near) - d * 0.3;
      if (!cand || sc > cand.sc) cand = { sc: sc, x: x, y: y };
    });
    if (cand) return { t: "mmove", x: cand.x, y: cand.y };
    // sinon s'approcher (ou, pour un tireur collé, reculer)
    var target = foes.slice().sort(function (a, b) { return (Math.abs(a.x - u.x) + Math.abs(a.y - u.y)) - (Math.abs(b.x - u.x) + Math.abs(b.y - u.y)); })[0];
    var bestC = null;
    Object.keys(rc).forEach(function (k) {
      var p = k.split(","), x = +p[0], y = +p[1];
      if (rc[k] === 0) return;
      var pth = findPath(c.arena.w, c.arena.h, function (cx, cy, end) { return end || cellFree(c, cx, cy, u); }, x, y, target.x, target.y);
      var dist = pth ? pth.length : 50 + Math.abs(target.x - x) + Math.abs(target.y - y);
      if (!bestC || dist < bestC.d) bestC = { d: dist, x: x, y: y };
    });
    var curP = findPath(c.arena.w, c.arena.h, function (cx, cy, end) { return end || cellFree(c, cx, cy, u); }, u.x, u.y, target.x, target.y);
    var curD = curP ? curP.length : 50 + Math.abs(target.x - u.x) + Math.abs(target.y - u.y);
    if (bestC && bestC.d < curD) return { t: "mmove", x: bestC.x, y: bestC.y };
    return null;
  }
  function aiDo(w, a) {
    var c = w.combat, u = active(c);
    if (!a) { endTurn(w); return 0.25; }
    if (a.t === "mmove") {
      var p = combatPath(c, u, a.x, a.y, u.pm);
      if (!p || !moveUnit(w, u, a.x, a.y)) { endTurn(w); return 0.25; }
      return 0.18 * p.length + 0.25;
    }
    var S = MOB_SPELLS[a.s];
    u.pa -= S.pa;
    if (S.cd) u.cds[a.s] = S.cd + 1;
    var t = a.x != null ? unitAt(c, a.x, a.y) : null;
    if (t && t !== u) u.face = faceOf(t.x - u.x, t.y - u.y);
    ev(w, { k: "cast", id: u.id, s: a.s, tg: a.x != null ? [[a.x, a.y]] : [], mob: true });
    if (S.summon) {
      var spots = ring8(c, u.x, u.y).filter(function (q) { return cellFree(c, q[0], q[1]); }).slice(0, 2);
      spots.forEach(function (q) {
        var m = addMob(c, S.summon, u.lvl - 2, null, q[0], q[1], true);
        c.order.splice(c.turn + 1, 0, m.id);
        ev(w, { k: "summon", id: m.id });
      });
    } else if (S.telegraph) {
      // une croix ou deux lignes, au choix, centrées sur un héros
      var foes = c.units.filter(function (o) { return o.alive && o.side !== u.side; });
      var f = foes[Math.floor(R() * foes.length)], cells = [];
      if (R() < 0.5) { for (var i = -2; i <= 2; i++) { cells.push([f.x + i, f.y]); if (i) cells.push([f.x, f.y + i]); } }
      else { for (var j = -2; j <= 2; j++) { cells.push([f.x + j, f.y + j]); if (j) cells.push([f.x + j, f.y - j]); } }
      cells = cells.filter(function (q) { return inArena(c, q[0], q[1]); });
      c.tele.push({ by: u.id, cells: cells, dmg: Math.round(S.dmg * (1 + u.pow / 100)) });
      ev(w, { k: "tele", cells: cells });
    } else if (S.heal) heal(w, u, t, S.heal * (1 + u.lvl * 0.08));
    else if (t) {
      if (S.shape === "diag" || S.range[1] > 1) ev(w, { k: "beam", from: [u.x, u.y], to: [t.x, t.y], col: u.summon ? "#2fd29a" : MOBS[u.type].col, mob: true });
      else if (u.summon) ev(w, { k: "slash", id: u.id, to: [t.x, t.y], col: "#2f8f6c" });
      damage(w, u, t, S.dmg);
      if (S.push && t.alive) knock(w, u, t, u.x, u.y, S.push);
      if (S.pull && t.alive) knock(w, u, t, u.x, u.y, S.pull, true);
    }
    afterAction(w);
    return 0.85;
  }

  /* ---------- fin de combat et butin ---------- */
  function finishCombat(w, won) {
    var c = w.combat;
    c.phase = "end";
    ev(w, { k: won ? "victory" : "defeat" });
    var loot = { won: won, players: [] };
    var defeated = c.defeated || [];
    w.players.forEach(function (pl, i) {
      if (!pl) return;
      var p = pl.profile, res = { xp: 0, gold: 0, items: [], levels: 0, quests: [] }, hs = heroStats(p);
      var dropP = Math.min(0.95, CFG.dropChance * (1 + (hs.pros || 0) / 100));
      if (won) {
        defeated.forEach(function (d) {
          var M = MOBS[d.type];
          res.xp += Math.round((M.xp + d.lvl * 6) * (d.affix ? 2 : 1));
          res.gold += Math.round((3 + d.lvl * 2) * (d.affix ? 2.5 : 1) * (0.7 + R() * 0.6)) + (d.boss ? 200 : 0);
          // le butin : chaque monstre tire au hasard, pour chaque joueur
          var luck = d.boss ? 2 : d.affix ? 1 : 0;
          var n = d.boss ? 3 : d.affix ? 1 : (R() < dropP ? 1 : 0);
          for (var k = 0; k < n; k++) res.items.push(makeItem(p, d.lvl + (R() < 0.3 ? 1 : 0), rollRarity(luck, d.boss ? 3 : 0)));
          questEvent(w, i, { kind: "kill", mob: d.type, elite: !!d.affix, boss: d.boss }, res);
          p.kills++;
          if (d.boss) p.bossKills++;
        });
        // jamais les mains vides
        if (!res.items.length && defeated.length) res.items.push(makeItem(p, Math.round(defeated.reduce(function (a, d) { return a + d.lvl; }, 0) / defeated.length), rollRarity(0)));
        if (c.room) { res.xp = Math.round(res.xp * 1.3); }
        res.xp = Math.round(res.xp * (1 + (hs.sag || 0) / 100));
        res.items = res.items.slice(0, 6);
        res.items.sort(function (a, b) { return b.r - a.r; });
        giveXp(w, i, res.xp, res);
        p.gold += res.gold;
        res.items.forEach(function (it) { if (p.bag.length < BAG_MAX) p.bag.push(it); else { p.gold += it.value; it.sold = true; } });
      }
      p.rev++;
      loot.players[i] = res;
    });
    loot.stats = c.stats;
    loot.room = c.room;
    loot.dungeonNext = won && w.dungeon && w.dungeon.room < DUNGEONS[w.dungeon.id].rooms.length - 1;
    loot.dungeonDone = won && w.dungeon && w.dungeon.room === DUNGEONS[w.dungeon.id].rooms.length - 1;
    if (w.dungeon) {
      w.dungeon.hp = c.units.filter(function (u) { return u.side === 0 && !u.summon; }).reduce(function (o, u) { o[u.pi] = u.alive ? u.hp : 1; return o; }, {});
    }
    // le groupe battu disparaît un moment
    if (won && c.packId) w.packs.forEach(function (pk) { if (pk.id === c.packId) { pk.dead = true; pk.t = CFG.respawn; } });
    w.packs.forEach(function (pk) { pk.calm = w.t + 4; });
    loot.id = Math.floor(R() * 1e9);
    w.loot = loot; w.mode = "loot";
    w.players.forEach(function (pl) { if (pl) pl.ready = false; });
    bump(w);
  }
  function giveXp(w, i, xp, res) {
    var p = w.players[i].profile;
    p.xp += xp;
    while (p.level < CFG.maxLevel && p.xp >= xpNeed(p.level)) {
      p.xp -= xpNeed(p.level); p.level++; p.pts += 5;
      if (res) res.levels++;
      ev(w, { k: "levelup", pi: i, level: p.level });
      if (p.level === ULT_LEVEL) ev(w, { k: "ult", pi: i });
    }
    if (p.level >= CFG.maxLevel) p.xp = Math.min(p.xp, xpNeed(p.level));
    updateQuests(w, i);
  }
  function lootDone(w, pi) {
    if (w.mode !== "loot") return;
    w.players[pi].ready = true;
    if (!w.players.every(function (p) { return !p || p.ready; })) { bump(w); return; }
    var L = w.loot;
    w.loot = null; w.combat = null;
    w.players.forEach(function (p) { if (!p) return; p.ready = false; p.profile.bag.forEach(function (it) { it.isNew = false; }); });
    if (w.dungeon) {
      if (L.won && L.dungeonNext) {
        w.dungeon.room++;
        // un peu de répit entre les salles
        w.players.forEach(function (pl, i) {
          if (!pl) return;
          var mx = heroStats(pl.profile).hp;
          w.dungeon.hp[i] = Math.min(mx, (w.dungeon.hp[i] || 1) + Math.round(mx * CFG.dungeonHeal));
        });
        dungeonRoom(w);
        return;
      }
      var exitZone = DUNGEONS[w.dungeon.id].exit;
      w.dungeon = null;
      w.mode = "explore";
      enterZone(w, L.won ? exitZone : "village", null);
      return;
    }
    w.mode = "explore";
    if (!L.won) enterZone(w, "village", null);
    bump(w);
  }
  function startDungeon(w, id) {
    if (!DUNGEONS[id]) id = "sanctuaire";
    w.dungeon = { id: id, room: 0, hp: {} };
    ev(w, { k: "dungeon", id: id });
    dungeonRoom(w);
  }
  function dungeonRoom(w) {
    var D = DUNGEONS[w.dungeon.id].rooms[w.dungeon.room], n = w.players.filter(Boolean).length;
    var mobs = [];
    if (D.boss) { mobs.push({ type: D.mobs[0], lvl: D.lvl, affix: null }); for (var b = 0; b < n; b++) mobs.push({ type: D.mobs[1 + (b % 2)], lvl: D.lvl - 1, affix: null }); }
    else for (var i = 0; i < 2 + n; i++) mobs.push({ type: D.mobs[i % D.mobs.length], lvl: D.lvl + (i % 2), affix: R() < D.elite ? pick(R, AFFIX_IDS) : null });
    var hpMul = n === 1 ? 0.8 : 1;
    startCombat(w, { id: 0, mobs: mobs }, { idx: w.dungeon.room, name: D.name, boss: !!D.boss, dungeon: w.dungeon.id });
    if (D.boss) w.combat.units.forEach(function (u) { if (u.boss) { u.maxHp = Math.round(u.maxHp * hpMul); u.hp = u.maxHp; } });
  }

  /* ---------- quêtes ---------- */
  function updateQuests(w, i) {
    var p = w.players[i].profile;
    QUESTS.forEach(function (q) {
      if (p.qdone[q.id] || p.quests[q.id] != null) return;
      if (q.req && !p.qdone[q.req]) return;
      p.quests[q.id] = 0;
    });
  }
  function questEvent(w, i, e, res) {
    var p = w.players[i].profile, changed = false;
    QUESTS.forEach(function (q) {
      if (p.quests[q.id] == null || p.qdone[q.id]) return;
      var inc = 0;
      if (q.kind === "kill" && e.kind === "kill" && e.mob === q.mob) inc = 1;
      if (q.kind === "elite" && e.kind === "kill" && e.elite) inc = 1;
      if (q.kind === "boss" && e.kind === "kill" && e.boss) inc = 1;
      if (q.kind === "zone" && e.kind === "zone" && e.zone === q.zone) inc = 1;
      if (!inc) return;
      p.quests[q.id] = Math.min(q.n || 1, p.quests[q.id] + inc); changed = true;
      if (p.quests[q.id] >= (q.n || 1)) completeQuest(w, i, q, res);
    });
    if (changed) p.rev++;
  }
  function completeQuest(w, i, q, res) {
    var p = w.players[i].profile;
    p.qdone[q.id] = 1; delete p.quests[q.id];
    var it = makeItem(p, Math.max(p.level, 2), RARITIES.map(function (r) { return r.id; }).indexOf(q.item));
    if (p.bag.length < BAG_MAX) p.bag.push(it); else p.gold += it.value;
    p.gold += q.gold;
    ev(w, { k: "quest", pi: i, q: q.id, item: it });
    if (res) { res.quests.push(q.id); res.items.push(it); res.gold += q.gold; res.xp += q.xp; }
    else giveXp(w, i, q.xp, null);
    updateQuests(w, i);
  }

  /* ====================== INVENTAIRE ====================== */
  function findBag(p, uid) { for (var i = 0; i < p.bag.length; i++) if (p.bag[i].uid === uid) return i; return -1; }
  function equip(w, pi, uid) {
    var p = w.players[pi].profile, i = findBag(p, uid);
    if (i < 0 || (w.mode === "combat" && w.combat && w.combat.phase === "fight")) return false;
    var it = p.bag.splice(i, 1)[0], old = p.equip[it.slot];
    it.isNew = false;
    p.equip[it.slot] = it;
    if (old) p.bag.splice(i, 0, old);
    p.rev++;
    ev(w, { k: "equip", pi: pi, uid: uid });
    bump(w);
    return true;
  }
  function unequip(w, pi, slot) {
    var p = w.players[pi].profile, it = p.equip[slot];
    if (!it || p.bag.length >= BAG_MAX || (w.mode === "combat" && w.combat && w.combat.phase === "fight")) return false;
    delete p.equip[slot]; p.bag.unshift(it); p.rev++; bump(w); return true;
  }
  function sell(w, pi, uid) {
    var p = w.players[pi].profile, i = findBag(p, uid);
    if (i < 0) return false;
    var it = p.bag.splice(i, 1)[0];
    p.gold += it.value; p.rev++;
    ev(w, { k: "sell", pi: pi, v: it.value });
    bump(w);
    return true;
  }
  function sellJunk(w, pi, maxR) {
    var p = w.players[pi].profile, g = 0;
    p.bag = p.bag.filter(function (it) { if (it.r <= maxR && !it.lock) { g += it.value; return false; } return true; });
    if (g) { p.gold += g; p.rev++; ev(w, { k: "sell", pi: pi, v: g }); bump(w); }
    return g;
  }
  function chestPrice(p) { return 45 + p.level * 28; }
  function buyChest(w, pi) {
    var p = w.players[pi].profile, cost = chestPrice(p);
    if (p.gold < cost || p.bag.length >= BAG_MAX) return false;
    p.gold -= cost;
    var it = makeItem(p, p.level, rollRarity(1, 1));
    p.bag.push(it); p.rev++;
    ev(w, { k: "chest", pi: pi, item: it });
    bump(w);
    return true;
  }

  /* ====================== COMMANDES ====================== */
  // toutes les actions des joueurs passent par ici (l'invité les envoie à l'hôte)
  function cmd(w, pi, c) {
    if (!c || !w.players[pi]) return false;
    var cb = w.combat;
    switch (c.t) {
      case "walk": return w.mode === "explore" && walkTo(w, pi, c.x | 0, c.y | 0);
      case "engage": return w.mode === "explore" && engage(w, pi, c.id);
      case "heal":
        if (w.mode !== "explore") return false;
        ev(w, { k: "fountain", pi: pi }); bump(w); return true;
      case "place": {
        if (!cb || cb.phase !== "place") return false;
        var me = cb.units.filter(function (u) { return u.side === 0 && u.pi === pi && !u.summon; })[0];
        if (!me || !cb.arena.heroCells.some(function (h) { return h[0] === c.x && h[1] === c.y; })) return false;
        var other = unitAt(cb, c.x, c.y);
        if (other && other.side === 0 && other !== me) { other.x = me.x; other.y = me.y; }
        else if (other) return false;
        me.x = c.x; me.y = c.y; ev(w, { k: "place", id: me.id }); bump(w); return true;
      }
      case "ready": {
        if (!cb || cb.phase !== "place") return false;
        w.players[pi].ready = !w.players[pi].ready;
        if (w.players.every(function (p) { return !p || p.ready; })) { w.players.forEach(function (p) { if (p) p.ready = false; }); beginFight(w); }
        bump(w); return true;
      }
      case "move": { var u = myTurn(w, pi); return !!u && moveUnit(w, u, c.x | 0, c.y | 0); }
      case "cast": { var u2 = myTurn(w, pi); return !!u2 && cast(w, u2, c.s, c.tg); }
      case "end": { var u3 = myTurn(w, pi); if (!u3) return false; endTurn(w); return true; }
      case "flee": {
        if (!cb || cb.room) return false;
        finishCombat(w, false); return true;
      }
      case "lootok": lootDone(w, pi); return true;
      case "equip": return equip(w, pi, c.uid);
      case "unequip": return unequip(w, pi, c.slot);
      case "sell": return sell(w, pi, c.uid);
      case "junk": return sellJunk(w, pi, c.r | 0) > 0;
      case "lock": { var p = w.players[pi].profile, ix = findBag(p, c.uid); if (ix < 0) return false; p.bag[ix].lock = !p.bag[ix].lock; p.rev++; bump(w); return true; }
      case "chest": return w.mode === "explore" && buyChest(w, pi);
      case "stat": {
        var sp = w.players[pi].profile, n = Math.max(1, c.n | 0);
        if (!STATS[c.k] || !STATS[c.k].main || sp.pts < n) return false;
        sp.pts -= n; sp.base[c.k] = (sp.base[c.k] || 0) + n; sp.rev++; bump(w); return true;
      }
      case "seen": { var pp = w.players[pi].profile; pp.bag.forEach(function (it) { it.isNew = false; }); pp.rev++; bump(w); return true; }
    }
    return false;
  }
  function myTurn(w, pi) {
    var c = w.combat;
    if (!c || c.phase !== "fight" || w.mode !== "combat") return null;
    var u = active(c);
    return u && u.side === 0 && u.pi === pi && u.alive && !u.summon ? u : null;
  }

  /* ====================== AVANCER LE TEMPS (hôte) ====================== */
  function step(w, dt) {
    w.t += dt;
    if (w.mode === "explore") stepExplore(w, dt);
    else if (w.mode === "combat" && w.combat && w.combat.phase === "fight") {
      var c = w.combat, u = active(c);
      if (u && (u.side === 1 || u.summon)) {
        c.aiT -= dt;
        if (c.aiT <= 0) {
          var a = aiStep(w);
          c.aiT = aiDo(w, a);
          if (++c.aiN > 12 && a) { c.aiN = 0; endTurn(w); }
          if (!a) c.aiN = 0;
        }
      } else if (c) c.aiN = 0;
    }
  }

  var API = {
    CFG: CFG, CLASSES: CLASSES, CLASS_IDS: CLASS_IDS, SPELLS: SPELLS, SUMMONS: SUMMONS, spellsOf: spellsOf, MOBS: MOBS, MOB_SPELLS: MOB_SPELLS, AFFIXES: AFFIXES,
    SLOTS: SLOTS, SLOT_NAME: SLOT_NAME, RARITIES: RARITIES, STATS: STATS, POWERS: POWERS, QUESTS: QUESTS, ZONES: ZONES, ZONE_IDS: ZONE_IDS,
    DUNGEONS: DUNGEONS, NPCS: NPCS, AW: AW, ELEMENTS: ELEMENTS, MAIN_STATS: MAIN_STATS, ULT_LEVEL: ULT_LEVEL, BAG_MAX: BAG_MAX,
    newProfile: newProfile, fixProfile: fixProfile, heroStats: heroStats, gearOf: gearOf, LOOKS: LOOKS, xpNeed: xpNeed, itemScore: itemScore, makeItem: makeItem, rollRarity: rollRarity,
    createWorld: createWorld, addPlayer: addPlayer, removePlayer: removePlayer, zoneMap: zoneMap, exploreWalkable: exploreWalkable, portalAt: portalAt, findPath: findPath,
    cmd: cmd, step: step, active: active, unitAt: unitAt, objAt: objAt, uById: uById, inArena: inArena, groundOk: groundOk, cellFree: cellFree,
    targets: targets, area: area, canCast: canCast, spellCost: spellCost, reach: reach, combatPath: combatPath, myTurn: myTurn, los: los,
    chestPrice: chestPrice, partyLevel: partyLevel, checkEnd: checkEnd, startDungeon: startDungeon, enterZone: enterZone, statusSum: statusSum, aiStep: aiStep, aiDo: aiDo,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.AT_CORE = API;
})(typeof window !== "undefined" ? window : globalThis);
