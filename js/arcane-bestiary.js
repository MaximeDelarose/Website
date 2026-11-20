/* =========================================================================
   Arcane Tactics — bestiaire (données seulement)
   Familles de monstres, sorts de monstres, versions élites, boss à phases,
   compositions de groupes par zone et adaptation à la puissance de l'équipe.
   Se branche sur le moteur (js/arcane-core.js) : doit être chargé après lui.

   Champs d'un sort de monstre (MOB_SPELLS) :
     pa, range [min, max], shape any / line / diag / queen / self, los (ligne de vue)
     tgt   foe (ennemi) · ally (allié) · cell (case) · self
     dmg, el, cd, push, pull, slam (dégâts par case de poussée bloquée)
     dash  charge en ligne droite jusqu'à la cible
     tp    { range, adjacent }  téléportation du lanceur (adjacent = à côté de la cible)
     hazard { kind glue/venom, turns, area single/plus }   zone au sol
     silk   { n, turns }   murs de soie (bloquent le passage, pas la vue)
     telegraph { area, dmg, push, slam, kind, fx, exhaust }   attaque annoncée (explose au tour suivant du lanceur)
     fx [ { k, v, turns, name } ]   états sur la cible (dot, slow, root, drainpa, drainpm, curse, mark)
     mark { v, turns }  marque du chasseur
     buff { k, v }  renfort sur un allié ; heal ; shield ; selfHeal
     summon type · illusion { n, turns } · shock { dmg, r } (onde de choc élite)
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE;
  if (!A) return;
  var MS = A.MOB_SPELLS, MOBS = A.MOBS, AFFIXES = A.AFFIXES;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ====================== SORTS ====================== */
  var S = {
    // --- Traqueur : tireur qui garde ses distances
    trait: { name: "Trait d'éclat", pa: 3, range: [2, 6], shape: "any", los: true, dmg: 15, tgt: "foe", col: "#c77dff", fx0: "bolt" },
    marque: { name: "Marque du chasseur", pa: 2, range: [2, 6], shape: "any", los: true, tgt: "foe", mark: { v: 70, turns: 2 }, cd: 1, col: "#ff5a6a", fx0: "mark", info: "Sa prochaine attaque sur la cible fait +70 %." },
    traitperfor: { name: "Trait perforant", pa: 3, range: [2, 7], shape: "any", los: false, dmg: 18, tgt: "foe", col: "#ff9a3c", fx0: "bolt", info: "Ignore la ligne de vue (élite)." },
    // --- Colosse : tank qui bouscule
    poing: { name: "Poing de pierre", pa: 3, range: [1, 1], shape: "any", los: true, dmg: 19, push: 2, slam: 13, tgt: "foe", col: "#ff9a3c", fx0: "smash", info: "Repousse de 2 cases ; un obstacle derrière fait 13 dégâts par case." },
    poingelite: { name: "Poing de cristal", pa: 3, range: [1, 1], shape: "any", los: true, dmg: 21, push: 2, slam: 15, shock: { dmg: 11, r: 1 }, tgt: "foe", col: "#ff9a3c", fx0: "smash", info: "Repousse de 2 cases, puis onde de choc autour de lui (élite)." },
    charge: { name: "Charge titanesque", pa: 3, range: [2, 4], shape: "line", los: true, dash: true, dmg: 12, push: 1, slam: 12, cd: 2, tgt: "foe", col: "#ff9a3c", fx0: "smash", info: "Fonce en ligne droite sur la cible." },
    ecrasement: { name: "Écrasement", pa: 4, range: [1, 3], shape: "any", los: false, tgt: "cell", cd: 2, col: "#ff5a6a", fx0: "slam",
      telegraph: { area: "plus", dmg: 30, push: 1, slam: 10, kind: "slam", exhaust: 25 }, info: "Annoncé en rouge : explose au tour suivant du colosse. Il est épuisé juste après." },
    // --- Spectre : tire, disparaît, revient dans le dos
    eclatombre: { name: "Éclat d'ombre", pa: 3, range: [2, 5], shape: "any", los: true, dmg: 15, tgt: "foe", col: "#a47bff", fx0: "bolt" },
    glissade: { name: "Passage spectral", pa: 2, range: [0, 0], shape: "self", tp: { range: 6 }, cd: 2, tgt: "cell", col: "#a47bff", fx0: "tp", info: "Se téléporte jusqu'à 6 cases (recharge 2 tours)." },
    mirage: { name: "Mirage", pa: 2, range: [1, 3], shape: "any", los: false, illusion: { n: 1, turns: 2 }, cd: 3, tgt: "cell", col: "#a47bff", fx0: "tp", info: "Crée une illusion qui disparaît au premier coup." },
    mirageelite: { name: "Double mirage", pa: 2, range: [1, 4], shape: "any", los: false, illusion: { n: 2, turns: 2 }, cd: 3, tgt: "cell", col: "#a47bff", fx0: "tp", info: "Deux illusions ; il peut se téléporter sur l'une d'elles (élite)." },
    // --- Tisseur : contrôle du terrain
    aiguillon: { name: "Aiguillon", pa: 3, range: [1, 3], shape: "any", los: true, dmg: 13, tgt: "foe", col: "#7ed6c0", fx0: "bolt" },
    toile: { name: "Toile engluante", pa: 3, range: [2, 5], shape: "any", los: true, hazard: { kind: "glue", turns: 3, area: "plus" }, cd: 1, tgt: "cell", col: "#5fb7ff", fx0: "web", info: "Zone bleue : qui s'y arrête perd ses PM, qui démarre dessus en perd 2." },
    soie: { name: "Mur de soie", pa: 3, range: [2, 5], shape: "any", los: true, silk: { n: 2, turns: 2 }, cd: 2, tgt: "cell", col: "#5fb7ff", fx0: "web", info: "Bloque le passage (pas la vue) pendant 2 tours." },
    soieelite: { name: "Cocon de soie", pa: 3, range: [2, 5], shape: "any", los: true, silk: { n: 3, turns: 2 }, cd: 2, tgt: "cell", col: "#5fb7ff", fx0: "web", info: "Trois murs de soie (élite)." },
    piege: { name: "Piège de brume", pa: 3, range: [2, 5], shape: "any", los: true, tgt: "cell", cd: 1, col: "#b58cff", fx0: "trap",
      telegraph: { area: "plus", dmg: 20, kind: "trap", fx: [{ k: "slow", v: 2, turns: 1, name: "Ralenti" }] }, info: "Piège violet visible : explose au tour suivant du tisseur (20 dégâts, −2 PM)." },
    // --- Siphonneur : perturbe et renforce
    siphon: { name: "Siphon", pa: 3, range: [1, 4], shape: "any", los: true, dmg: 10, tgt: "foe", fx: [{ k: "drainpa", v: 1, turns: 1, name: "Siphonné" }], selfHeal: 6, col: "#c77dff", fx0: "drain", info: "−1 PA au prochain tour de la cible (maximum −1 PA par tour)." },
    aspiration: { name: "Aspiration", pa: 3, range: [1, 4], shape: "any", los: true, dmg: 8, tgt: "foe", fx: [{ k: "drainpm", v: 1, turns: 1, name: "Aspiré" }], cd: 1, col: "#c77dff", fx0: "drain", info: "−1 PM au prochain tour de la cible." },
    aspirationelite: { name: "Double aspiration", pa: 3, range: [1, 4], shape: "any", los: true, dmg: 10, tgt: "foe", fx: [{ k: "drainpm", v: 1, turns: 1, name: "Aspiré" }, { k: "drainpa", v: 1, turns: 1, name: "Siphonné" }], cd: 2, col: "#c77dff", fx0: "drain", info: "−1 PA et −1 PM (élite)." },
    malediction: { name: "Malédiction", pa: 3, range: [2, 5], shape: "any", los: true, tgt: "foe", fx: [{ k: "curse", v: 25, turns: 2, name: "Maudit" }], cd: 2, col: "#c77dff", fx0: "curse", info: "+25 % de dégâts subis pendant 2 tours." },
    rituel: { name: "Rituel de renfort", pa: 3, range: [0, 4], shape: "any", los: true, tgt: "ally", buff: { k: "dom", v: 14 }, allyPm: 1, cd: 1, col: "#ff9a3c", fx0: "buff", info: "Un monstre allié gagne +14 dommages et +1 PM." },
    // --- Araignée des Ombres
    morsure: { name: "Morsure venimeuse", pa: 3, range: [1, 1], shape: "any", los: true, dmg: 17, tgt: "foe", fx: [{ k: "dot", v: 7, turns: 3, name: "Venin" }], col: "#7dff6a", fx0: "smash" },
    embuscade: { name: "Embuscade", pa: 3, range: [2, 4], shape: "any", los: false, tp: { range: 4, adjacent: true }, dmg: 12, tgt: "foe", fx: [{ k: "root", v: 1, turns: 1, name: "Immobilisé" }], cd: 2, col: "#ff5a6a", fx0: "tp", info: "Bondit sur la cible : dégâts + immobilisée 1 tour." },
    toilelance: { name: "Lancer de toile", pa: 2, range: [2, 5], shape: "any", los: true, hazard: { kind: "glue", turns: 2, area: "single" }, tgt: "cell", col: "#5fb7ff", fx0: "web" },
    fildattire: { name: "Fil d'attraction", pa: 3, range: [2, 5], shape: "line", los: true, dmg: 8, pull: 2, cd: 1, tgt: "foe", col: "#5fb7ff", fx0: "web", info: "Attire de 2 cases en ligne droite." },
    // --- Chat Masqué
    griffure: { name: "Griffure", pa: 2, range: [1, 1], shape: "any", los: true, dmg: 13, tgt: "foe", fx: [{ k: "dot", v: 6, turns: 2, name: "Saignement" }], col: "#ff5a6a", fx0: "claw" },
    bondfelin: { name: "Bond félin", pa: 2, range: [2, 5], shape: "any", los: false, tp: { range: 5, adjacent: true }, tgt: "foe", cd: 1, col: "#ff5a6a", fx0: "tp", info: "Bondit à côté de la cible, par-dessus tout." },
    regard: { name: "Regard glacial", pa: 2, range: [1, 4], shape: "any", los: true, tgt: "foe", fx: [{ k: "drainpm", v: 1, turns: 1, name: "Intimidé" }], cd: 2, col: "#ff5a6a", fx0: "curse", info: "−1 PM au prochain tour." },
    // --- Araignelets (invoqués par la reine)
    piqure: { name: "Piqûre", pa: 3, range: [1, 1], shape: "any", los: true, dmg: 10, tgt: "foe", fx: [{ k: "dot", v: 4, turns: 2, name: "Venin" }], col: "#7dff6a", fx0: "claw" },
    // --- Boss de la Forêt des Cendres
    pluievenin: { name: "Pluie de venin", pa: 4, range: [1, 5], shape: "any", los: false, tgt: "cell", cd: 2, col: "#7dff6a", fx0: "slam",
      telegraph: { area: "disc1", dmg: 26, kind: "slam", hazard: { kind: "venom", turns: 3 }, exhaust: 20 }, info: "Disque rouge annoncé : dégâts puis nuage de venin." },
    ponte: { name: "Ponte", pa: 3, range: [0, 0], shape: "self", summon: "araignelet", n: 2, cd: 3, tgt: "self", col: "#7dff6a", fx0: "buff", info: "Fait éclore 2 araignelets." },
    tissagenoir: { name: "Tissage noir", pa: 3, range: [0, 0], shape: "self", tgt: "self", cd: 3, col: "#5fb7ff", fx0: "web", ring: { kind: "glue", turns: 3 }, info: "Pose une couronne de toile autour de la reine (phase 2)." },
    // --- anciens boss : attaques annoncées + fenêtres de vulnérabilité
    sentenceB: { name: "Sentence", pa: 4, range: [0, 0], shape: "self", tgt: "enemycell", cd: 0, col: "#ff5a6a", fx0: "slam",
      telegraph: { area: "cross2", dmg: 34, kind: "slam", exhaust: 30 }, info: "Croix rouge annoncée sur un héros. L'Archonte est vulnérable (+30 %) ensuite." },
    racinesB: { name: "Racines", pa: 4, range: [0, 0], shape: "self", tgt: "enemycell", col: "#ff5a6a", fx0: "slam",
      telegraph: { area: "cross2", dmg: 24, kind: "slam", exhaust: 30 }, info: "Racines annoncées sous un héros ; le Sylvestre est vulnérable ensuite." },
    carillonB: { name: "Carillon", pa: 5, range: [0, 0], shape: "self", tgt: "enemycell", cd: 1, col: "#ff5a6a", fx0: "slam",
      telegraph: { area: "disc2", dmg: 36, kind: "slam", exhaust: 30 }, info: "Disque rouge annoncé ; le Grand Tic-Tac est vulnérable ensuite." },
    pluieB: { name: "Pluie de sucre", pa: 4, range: [0, 0], shape: "self", tgt: "enemycell", cd: 1, col: "#ff5a6a", fx0: "slam",
      telegraph: { area: "disc1", dmg: 28, kind: "slam", exhaust: 30 }, info: "Cases roses annoncées ; la Reine est vulnérable ensuite." },
  };
  Object.keys(S).forEach(function (k) { S[k].id = k; MS[k] = S[k]; });
  // anciens sorts de monstres : plus nerveux, avec de vraies conséquences
  MS.rune.push = 2; MS.rune.slam = 12; MS.rune.dmg = 20;
  MS.fouet.pull = 1; MS.fouet.dmg = 14;
  MS.mandibule.dmg = 11; MS.mandibule.fx = [{ k: "dot", v: 5, turns: 2, name: "Saignement" }];
  MS.flamme.dmg = 13; MS.souffle.dmg = 11; MS.eclat.dmg = 15;

  /* ====================== MONSTRES ====================== */
  function mob(id, o) { MOBS[id] = o; }
  mob("traqueur", { name: "Traqueur d'éclats", hp: 44, pa: 6, pm: 4, ini: 13, res: 0, role: "kite", spells: ["trait", "marque"], xp: 20, col: "#9a7bff", shape: "traqueur",
    elite: { spells: ["traitperfor"], note: "Trait perforant : ignore la ligne de vue" } });
  mob("colosse", { name: "Colosse serti", hp: 110, pa: 5, pm: 2, ini: 5, res: 14, role: "brute", spells: ["poing", "charge", "ecrasement"], xp: 30, col: "#8f8aa0", shape: "colosse",
    elite: { swap: { poing: "poingelite" }, note: "Onde de choc après chaque poussée" } });
  mob("spectre", { name: "Spectre voilé", hp: 40, pa: 6, pm: 3, ini: 15, res: 0, role: "teleport", spells: ["eclatombre", "glissade", "mirage"], xp: 26, col: "#8a6bff", shape: "spectre",
    elite: { swap: { mirage: "mirageelite" }, note: "Deux illusions, se téléporte sur l'une d'elles" } });
  mob("tisseur", { name: "Tisseur de brume", hp: 64, pa: 6, pm: 3, ini: 9, res: 4, role: "control", spells: ["aiguillon", "toile", "soie", "piege"], xp: 28, col: "#5fc9b0", shape: "tisseur",
    elite: { swap: { soie: "soieelite" }, note: "Cocon de soie : 3 murs, pièges plus larges" } });
  mob("siphonneur", { name: "Siphonneur runique", hp: 52, pa: 6, pm: 3, ini: 11, res: 0, role: "disruptor", spells: ["siphon", "aspiration", "malediction", "rituel"], xp: 26, col: "#b56bff", shape: "siphonneur",
    elite: { swap: { aspiration: "aspirationelite" }, note: "Aspire un PA et un PM d'un coup" } });
  mob("araignee", { name: "Araignée des Ombres", hp: 112, pa: 6, pm: 4, ini: 12, res: 8, role: "skirm", spells: ["morsure", "embuscade", "toilelance", "fildattire"], xp: 40, col: "#ff4a6a", shape: "araignee",
    elite: { spells: ["tissagenoir"], note: "Couronne de toile et venin renforcé" } });
  mob("chatmasque", { name: "Chat Masqué", hp: 52, pa: 6, pm: 6, ini: 18, res: 0, role: "skirm", spells: ["griffure", "bondfelin", "regard"], xp: 34, col: "#dfe3ea", shape: "chatmasque",
    elite: { note: "Bondit sans temps de recharge" } });
  mob("araignelet", { name: "Araignelet", hp: 22, pa: 4, pm: 4, ini: 14, res: 0, role: "skirm", spells: ["piqure"], xp: 6, col: "#c0405a", shape: "araignelet" });
  mob("reinetisse", { name: "Mère Tisse-Nuit", hp: 560, pa: 8, pm: 3, ini: 11, res: 12, role: "boss", spells: ["morsure", "embuscade", "toilelance", "pluievenin", "ponte"], boss: true, xp: 700, col: "#ff4a6a", shape: "reinetisse",
    phases: [{ at: 0.66, id: "p2", msg: "La Mère Tisse-Nuit tisse un cocon !", ring: { kind: "glue", turns: 3 }, summon: ["araignelet", "araignelet"], addSpell: "tissagenoir" },
      { at: 0.33, id: "p3", msg: "Elle se déchaîne : le sol se couvre de venin !", venomRows: true, buff: { k: "dom", v: 10 }, pm: 1 }] });
  // bosses existants : phases et attaques annoncées
  MOBS.archonte.spells = ["sentenceB", "appel", "pique"];
  MOBS.archonte.phases = [{ at: 0.6, id: "p2", msg: "L'Archonte fracture le terrain !", venomRows: true, summon: ["cristallin"] }, { at: 0.3, id: "p3", msg: "Il se concentre : fuyez ses croix !", buff: { k: "dom", v: 12 }, pm: 1 }];
  MOBS.sentinelle.spells = ["racinesB", "lierre", "rune"];
  MOBS.sentinelle.phases = [{ at: 0.55, id: "p2", msg: "Le lierre envahit la salle !", ring: { kind: "glue", turns: 3 }, summon: ["ronceau"] }];
  MOBS.sylvestre.spells = ["racinesB", "fouet", "lierre"];
  MOBS.sylvestre.phases = [{ at: 0.5, id: "p2", msg: "Les racines remontent !", venomRows: true, summon: ["ronceau"] }];
  MOBS.guimauve.spells = ["pluieB", "sucreries", "calin"];
  MOBS.guimauve.phases = [{ at: 0.5, id: "p2", msg: "Le caramel coule sur le sol !", ring: { kind: "glue", turns: 3 }, summon: ["bonbonk", "bonbonk"] }];
  MOBS.tictac.spells = ["carillonB", "aiguilles", "rembobine"];
  MOBS.tictac.phases = [{ at: 0.6, id: "p2", msg: "Les aiguilles s'emballent !", buff: { k: "dom", v: 10 }, pm: 1 }, { at: 0.3, id: "p3", msg: "Dernière heure !", venomRows: true, summon: ["horlogeon"] }];
  MOBS.dopeul.spells = ["dopfrappe", "doptir", "dopsoin"];

  // rôles tactiques des monstres déjà existants
  var ROLES = { glorbe: "brute", scarabrume: "skirm", ronceau: "control", lanterneau: "kite", sylphe: "support", golem: "brute", cristallin: "kite", bonbonk: "kite", grenouillon: "skirm", nuagelet: "support", horlogeon: "brute", archonte: "boss", sentinelle: "boss", sylvestre: "boss", guimauve: "boss", tictac: "boss", dopeul: "boss" };
  Object.keys(ROLES).forEach(function (k) { if (MOBS[k]) MOBS[k].role = ROLES[k]; });
  // les petites bêtes d'origine sont plus dangereuses
  MOBS.glorbe.hp = 40; MOBS.glorbe.spells = ["gobe"]; MS.gobe.dmg = 13;
  MOBS.scarabrume.hp = 34;
  MOBS.golem.hp = 100;

  AFFIXES.elite = { name: "Élite", pow: 14, hpMul: 1.3, res: 6 };

  /* ====================== COMPOSITION DES GROUPES ====================== */
  // un modèle = les monstres d'un groupe en solo (`base`) ; à deux, on ajoute `duo`. l = décalage de niveau.
  var PACKS = {
    prairie: [
      { tag: "Chasseurs", w: 3, base: [["traqueur", 0], ["colosse", 0]], duo: [["scarabrume", 0]] },
      { tag: "Bousculade", w: 2, base: [["colosse", 0], ["glorbe", 0]], duo: [["traqueur", 0]] },
      { tag: "Embuscade", w: 2, base: [["traqueur", 0], ["scarabrume", 0]], duo: [["glorbe", 0]] },
    ],
    bois: [
      { tag: "Toile et pierre", w: 3, base: [["colosse", 0], ["tisseur", 0]], duo: [["traqueur", 0]] },
      { tag: "Tir croisé", w: 2, base: [["traqueur", 0], ["tisseur", 0], ["scarabrume", 0]], duo: [["colosse", 0]] },
      { tag: "Lanternes", w: 2, base: [["lanterneau", 0], ["colosse", 0]], duo: [["tisseur", 0]] },
    ],
    marais: [
      { tag: "Sangsues", w: 3, base: [["siphonneur", 0], ["colosse", 0]], duo: [["tisseur", 0]] },
      { tag: "Bonbons empoisonnés", w: 2, base: [["bonbonk", 0], ["grenouillon", 0], ["siphonneur", 0]], duo: [["bonbonk", 0]] },
      { tag: "Piège à rainettes", w: 2, base: [["grenouillon", 0], ["tisseur", 0]], duo: [["traqueur", 0]] },
    ],
    falaises: [
      { tag: "Mur et fantôme", w: 3, base: [["colosse", 0], ["spectre", 0], ["traqueur", 0]], duo: [["siphonneur", 0]] },
      { tag: "Cristaux hanteurs", w: 2, base: [["spectre", 0], ["cristallin", 0], ["golem", 0]], duo: [["tisseur", 0]] },
      { tag: "Éboulement", w: 2, base: [["golem", 0], ["tisseur", 0], ["siphonneur", 0]], duo: [["spectre", 0]] },
    ],
    cendres: [
      { tag: "Prédateurs", w: 3, base: [["araignee", 0], ["chatmasque", 0]], duo: [["siphonneur", 0]] },
      { tag: "Meute masquée", w: 3, base: [["chatmasque", 0], ["chatmasque", 0], ["spectre", 0]], duo: [["colosse", 0]] },
      { tag: "Toile d'ombres", w: 2, base: [["araignee", 0], ["tisseur", 0], ["spectre", 0]], duo: [["traqueur", 0]] },
    ],
    nuages: [
      { tag: "Orage cotonneux", w: 2, base: [["nuagelet", 0], ["spectre", 0], ["horlogeon", 0]], duo: [["siphonneur", 0]] },
      { tag: "Mécanique", w: 2, base: [["horlogeon", 0], ["tisseur", 0], ["nuagelet", 0]], duo: [["spectre", 0]] },
      { tag: "Chasse haute", w: 3, base: [["traqueur", 0], ["spectre", 0], ["colosse", 0]], duo: [["nuagelet", 0]] },
    ],
  };
  var ELITE_CHANCE = { prairie: 0.06, bois: 0.12, marais: 0.15, falaises: 0.2, cendres: 0.24, nuages: 0.28 };
  var ZONE_MUL = { prairie: 1, bois: 1.1, marais: 1.16, falaises: 1.3, cendres: 1.28, nuages: 1.3, donjon: 1.0 };
  var FAMILY = { traqueur: 1, colosse: 1, spectre: 1, tisseur: 1, siphonneur: 1, araignee: 1, chatmasque: 1 };

  // puissance d'un héros (sert à adapter les groupes) : un équipement très fort relève la barre
  function heroPower(p) {
    var st = A.heroStats(p), el = Math.max(st.elem.terre, st.elem.feu, st.elem.eau, st.elem.air);
    return st.hp / 9 + el * 0.55 + st.dom * 1.1 + st.res * 0.9 + (st.pa - 6) * 9 + (st.pm - 3) * 7 + st.po * 5 + (st.crit - 5) * 0.4;
  }
  function expectedPower(level) { return 30 + level * 8; }
  function packScale(w, lvl, zid) {
    var ps = w.players.filter(Boolean), n = ps.length;
    if (!n) return { hp: 1, pow: 0, res: 0 };
    var pw = 0; ps.forEach(function (p) { pw += heroPower(p.profile); }); pw /= n;
    var r = pw / expectedPower(Math.max(1, lvl)), zm = (ZONE_MUL[zid] || 1);
    var hp = clamp(1 + 0.85 * (r - 1), 0.95, 3.2) * zm, pow = Math.round(clamp(58 * (r - 1), -4, 150) * zm);
    if (n === 1) { hp *= 0.88; pow -= 4; }                         // solo : un cran en dessous
    else { hp *= 1.18; pow += 8; }                                   // à deux : plus de monstres, un peu plus coriaces
    return { hp: +hp.toFixed(2), pow: pow, res: Math.round(clamp((r - 1) * 9, 0, 22)) };
  }
  function weighted(list) { var tot = list.reduce(function (a, t) { return a + t.w; }, 0), v = Math.random() * tot; for (var i = 0; i < list.length; i++) { if (v < list[i].w) return list[i]; v -= list[i].w; } return list[0]; }
  function composePack(w, zid) {
    var tpls = PACKS[zid]; if (!tpls) return null;
    var Z = A.ZONES[zid], n = w.players.filter(Boolean).length, T = weighted(tpls);
    var lvl = Z.lvl[0] + Math.floor(Math.random() * (Z.lvl[1] - Z.lvl[0] + 1));
    var list = T.base.slice(); if (n > 1) list = list.concat(T.duo);
    var eliteP = ELITE_CHANCE[zid] || 0.1, eliteDone = false;
    var mobs = list.map(function (m) {
      var o = { type: m[0], lvl: Math.max(1, lvl + m[1]), affix: null };
      if (!eliteDone && Math.random() < eliteP && (FAMILY[o.type] || MOBS[o.type].role !== "boss")) { o.affix = FAMILY[o.type] ? "elite" : (Object.keys(AFFIXES).filter(function (k) { return k !== "elite"; })[Math.floor(Math.random() * 6)]); eliteDone = true; }
      return o;
    });
    mobs.sort(function (a, b) { return (b.affix ? 1 : 0) - (a.affix ? 1 : 0) || b.lvl - a.lvl; });
    return { mobs: mobs, scale: packScale(w, lvl, zid), tag: T.tag };
  }
  A.EXT.composePack = composePack;
  // les salles de donjon : composition fixe, mais adaptée à l'équipe
  A.EXT.dungeonScale = function (w, lvl, mul) { var sc = packScale(w, lvl, 'donjon'); mul = mul || 1; sc.hp = +(sc.hp * mul).toFixed(2); sc.pow = Math.round(sc.pow + (mul - 1) * 45); return sc; };

  /* ====================== BOSS À PHASES ====================== */
  // appelé après chaque coup : déclenche les phases franchies (une seule fois chacune)
  A.EXT.afterDamage = function (w, t) {
    var c = w.combat, M = t.type && MOBS[t.type];
    if (!c || !M || !M.phases || !t.alive) return;
    t.ph = t.ph || {};
    M.phases.forEach(function (P) {
      if (t.ph[P.id] || t.hp > t.maxHp * P.at) return;
      t.ph[P.id] = 1;
      var I = A.I;
      I.ev(w, { k: "phase", id: t.id, msg: P.msg });
      if (P.addSpell) { t.spl = t.spl || (M.spells || []).slice(); if (t.spl.indexOf(P.addSpell) < 0) t.spl.push(P.addSpell); }
      if (P.ring) ringHazard(w, t, P.ring);
      if (P.venomRows) venomRows(w, t);
      if (P.buff) t.status.push({ k: P.buff.k, v: P.buff.v, by: t.id, turns: 99, name: "Fureur" });
      if (P.pm) { t.maxPm += P.pm; }
      if (P.summon) P.summon.forEach(function (ty) {
        var spots = I.ring8(c, t.x, t.y).concat(I.disc(c, t.x, t.y, 2)).filter(function (q) { return I.cellFree(c, q[0], q[1]); });
        if (!spots.length) return;
        var q = spots[Math.floor(Math.random() * spots.length)];
        var m = I.addMob(c, ty, Math.max(1, t.lvl - 2), null, q[0], q[1], true);
        c.order.splice(c.turn + 1, 0, m.id);
        I.ev(w, { k: "summon", id: m.id });
      });
    });
  };
  function ringHazard(w, t, hz) {
    var c = w.combat, I = A.I;
    I.ring8(c, t.x, t.y).concat(I.disc(c, t.x, t.y, 2)).forEach(function (q) {
      if (I.hazardAt(c, q[0], q[1]) || I.unitAt(c, q[0], q[1]) === t || !I.groundOk(c, q[0], q[1])) return;
      c.hazards.push({ x: q[0], y: q[1], kind: hz.kind, turns: hz.turns, by: t.id, side: t.side, dmg: 8 });
    });
    I.ev(w, { k: "hazard", cells: c.hazards.filter(function (h) { return h.by === t.id; }).map(function (h) { return [h.x, h.y, h.kind]; }) });
  }
  // changement de terrain : deux rangées de venin avec une brèche (on peut toujours passer)
  function venomRows(w, t) {
    var c = w.combat, I = A.I, rows = [3, 6], gap = 2 + Math.floor(Math.random() * 6), cells = [];
    rows.forEach(function (y) { for (var x = 0; x < c.arena.w; x++) if (x !== gap && x !== gap + 1 && I.groundOk(c, x, y) && !I.hazardAt(c, x, y)) { c.hazards.push({ x: x, y: y, kind: "venom", turns: 3, by: t.id, side: t.side, dmg: 9 }); cells.push([x, y, "venom"]); } });
    I.ev(w, { k: "hazard", cells: cells });
  }
  /* ====================== DONJONS : compositions fixes ====================== */
  // comp = monstres en solo, duo = ajoutés à deux ; [type, décalage de niveau, "elite" facultatif]
  function rooms(id, list) { A.DUNGEONS[id].rooms = list; }
  rooms("incarnam", [
    { name: "Cour envahie", lvl: 2, comp: [["colosse", 0], ["traqueur", 0]], duo: [["scarabrume", 0]] },
    { name: "Serre aux lierres", lvl: 3, comp: [["tisseur", 0], ["traqueur", 0], ["scarabrume", 0]], duo: [["colosse", 0]] },
    { name: "Salle de la Sentinelle", lvl: 4, boss: true, mobs: ["sentinelle"], comp: [["traqueur", -1]], duo: [["ronceau", -1]] },
  ]);
  rooms("racines", [
    { name: "Sentier des lucioles", lvl: 4, comp: [["lanterneau", 0], ["colosse", 0], ["tisseur", 0]], duo: [["traqueur", 0]] },
    { name: "Clairière fêlée", lvl: 5, comp: [["traqueur", 0], ["tisseur", 0], ["colosse", 0, "elite"]], duo: [["siphonneur", 0]] },
    { name: "Souche de l'Ancien", lvl: 6, boss: true, mobs: ["sylvestre"], comp: [["ronceau", -1], ["lanterneau", 0]], duo: [["tisseur", -1]] },
  ]);
  rooms("confiserie", [
    { name: "Cuisine en sucre", lvl: 5, comp: [["bonbonk", 0], ["siphonneur", 0], ["grenouillon", 0]], duo: [["bonbonk", 0]] },
    { name: "Grand four à guimauves", lvl: 6, comp: [["colosse", 0], ["siphonneur", 0], ["bonbonk", 0, "elite"]], duo: [["tisseur", 0]] },
    { name: "Trône en chamallow", lvl: 7, boss: true, mobs: ["guimauve"], comp: [["bonbonk", -1], ["siphonneur", -1]], duo: [["grenouillon", -1]] },
  ]);
  rooms("sanctuaire", [
    { name: "Salle des échos", lvl: 8, comp: [["spectre", 0], ["colosse", 0], ["traqueur", 0]], duo: [["siphonneur", 0]] },
    { name: "Galerie fêlée", lvl: 9, comp: [["spectre", 0, "elite"], ["tisseur", 0], ["siphonneur", 0], ["golem", 0]], duo: [["traqueur", 0]] },
    { name: "Trône fractal", lvl: 10, boss: true, mobs: ["archonte"], comp: [["cristallin", -1], ["spectre", -1]], duo: [["siphonneur", -1]] },
  ]);
  rooms("horloge", [
    { name: "Salle des engrenages", lvl: 11, comp: [["horlogeon", 0], ["spectre", 0], ["nuagelet", 0]], duo: [["tisseur", 0]] },
    { name: "Escalier à rebours", lvl: 12, comp: [["horlogeon", 0], ["siphonneur", 0], ["nuagelet", 0], ["golem", 0, "elite"]], duo: [["spectre", 0]] },
    { name: "Cadran du Grand Tic-Tac", lvl: 13, boss: true, mobs: ["tictac"], comp: [["horlogeon", -1], ["nuagelet", -1]], duo: [["spectre", -1]] },
  ]);
  A.DUNGEONS.incarnam.mul = 0.62; A.DUNGEONS.racines.mul = 0.72; A.DUNGEONS.confiserie.mul = 1.05; A.DUNGEONS.sanctuaire.mul = 1.55; A.DUNGEONS.horloge.mul = 1.75;
  A.BESTIARY = { PACKS: PACKS, heroPower: heroPower, expectedPower: expectedPower, packScale: packScale, composePack: composePack, ringHazard: ringHazard, venomRows: venomRows, FAMILY: FAMILY };
})(typeof window !== "undefined" ? window : globalThis);
