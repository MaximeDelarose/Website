/* =========================================================================
   Ronceclair — données et règles pures (js/ronceclair-data.js)
   Jeu de tactique au tour par tour sur cellules, façon Dofus : PA / PM / portée, quatre éléments
   (Terre, Feu, Eau, Air), caractéristiques, résistances, sorts, équipement.
   Aucune dépendance au DOM. Tout le contenu éditable à la main est ici :
   ELEMENTS, CHARS, CLASSES, SPELLS, MOBS, FURS, LOOKS, RARITIES.
   API : window.RC_DATA (et module.exports pour les tests Node).
   ========================================================================= */
(function (root) {
  "use strict";
  var D = {};

  /* ====================== ÉLÉMENTS ======================
     Chaque sort a un élément ; ses dégâts (ou soins) augmentent de 1 % par point de la caractéristique liée. */
  D.ELEMENTS = {
    terre: { name: "Terre", stat: "frc", col: "#c98a3a", icon: "el_terre" },
    feu:   { name: "Feu",   stat: "int", col: "#ff7b4a", icon: "el_feu" },
    eau:   { name: "Eau",   stat: "cha", col: "#4fb6dd", icon: "el_eau" },
    air:   { name: "Air",   stat: "agi", col: "#7df0c2", icon: "el_air" }
  };
  D.EL_ORDER = ["terre", "feu", "eau", "air"];
  D.CHARS = {
    vit: { name: "Vitalité",     short: "Vita", desc: "+2 PV par point" },
    sag: { name: "Sagesse",      short: "Sag",  desc: "+1 % d'XP par point" },
    frc: { name: "Force",        short: "For",  desc: "+1 % aux dégâts et soins de Terre par point", el: "terre" },
    int: { name: "Intelligence", short: "Int",  desc: "+1 % aux dégâts et soins de Feu par point", el: "feu" },
    cha: { name: "Chance",       short: "Cha",  desc: "+1 % aux dégâts et soins d'Eau par point", el: "eau" },
    agi: { name: "Agilité",      short: "Agi",  desc: "+1 % aux dégâts et soins d'Air par point, +0,3 % de critique", el: "air" }
  };
  D.CHAR_ORDER = ["vit", "sag", "frc", "int", "cha", "agi"];
  D.PTS_PER_LEVEL = 5;
  D.MAX_LVL = 30;
  D.xpFor = function (lvl) { return Math.round(30 * Math.pow(lvl, 1.55)); };

  /* ====================== SORTS ======================
     pa = coût, min/max = portée en cases (distance de Manhattan), line = en ligne droite, los = ligne de vue,
     cd = tours de recharge, perTurn = lancers par tour, tgt = cible : enemy · ally (allié ou soi) · self · free (case vide) · cell (toute case),
     area = zone autour de la cible : { shape: "circle" | "cross" | "line", r },
     eff = effets dans l'ordre : dmg · heal · shield · push · pull · buff · tp · dash.
     Les sorts se débloquent au niveau « lvl » de la classe. */
  D.SPELLS = {
    /* ---- Gardien : Terre, corps à corps, protège et bouscule ---- */
    g_griffes:    { name: "Coup de griffes", el: "terre", pa: 3, min: 1, max: 1, tgt: "enemy", lvl: 1, icon: "tourbillon", eff: [{ t: "dmg", a: 9, b: 13 }], text: "Un coup de griffes en pleine face." },
    g_bousculade: { name: "Bousculade", el: "terre", pa: 3, min: 1, max: 4, line: true, los: true, tgt: "enemy", perTurn: 2, lvl: 1, icon: "charge", eff: [{ t: "dmg", a: 5, b: 8 }, { t: "push", n: 2 }], text: "Frappe en ligne droite et repousse de 2 cases. Un obstacle derrière inflige des dégâts de collision." },
    g_carapace:   { name: "Carapace", el: "terre", pa: 2, min: 0, max: 0, tgt: "self", cd: 3, lvl: 3, icon: "rempart", eff: [{ t: "shield", a: 16, b: 22 }, { t: "buff", st: "res", v: 15, turns: 2 }], text: "Un bouclier de noix absorbe les dégâts et réduit de 15 % tous les dégâts subis pendant 2 tours." },
    g_braise:     { name: "Racines brûlantes", el: "feu", pa: 4, min: 1, max: 4, los: true, tgt: "cell", area: { shape: "cross", r: 1 }, perTurn: 1, lvl: 6, icon: "ronces", eff: [{ t: "dmg", a: 7, b: 10 }], text: "Des racines enflammées jaillissent en croix (zone de 5 cases)." },
    g_charge:     { name: "Charge du Chêne", el: "terre", pa: 4, min: 2, max: 6, line: true, los: true, tgt: "enemy", cd: 3, lvl: 10, icon: "charge", eff: [{ t: "dash" }, { t: "dmg", a: 15, b: 21 }], text: "Fonce sur l'ennemi en ligne droite et le frappe violemment." },
    /* ---- Lanceur : Air et Feu, tireur d'élite ---- */
    l_tir:        { name: "Tir de gland", el: "air", pa: 3, min: 2, max: 6, los: true, tgt: "enemy", lvl: 1, icon: "atk_shoot", eff: [{ t: "dmg", a: 8, b: 12 }], text: "Un gland lancé avec précision." },
    l_enflamme:   { name: "Gland enflammé", el: "feu", pa: 4, min: 2, max: 6, los: true, tgt: "enemy", perTurn: 2, lvl: 1, icon: "salve", eff: [{ t: "dmg", a: 11, b: 16 }], text: "Un gland en feu : plus de dégâts, mais coûte plus de PA." },
    l_salve:      { name: "Salve", el: "air", pa: 4, min: 2, max: 5, line: true, los: true, tgt: "cell", area: { shape: "line", r: 3 }, lvl: 3, icon: "pluie", eff: [{ t: "dmg", a: 6, b: 9 }], text: "Une salve en ligne : touche la cible et les 2 cases derrière elle." },
    l_roulade:    { name: "Roulade", el: "air", pa: 2, min: 1, max: 3, tgt: "free", cd: 2, lvl: 6, icon: "dash", eff: [{ t: "tp" }], text: "Une roulade acrobatique vers une case libre proche." },
    l_grandchene: { name: "Tir du Grand Chêne", el: "air", pa: 5, min: 3, max: 8, los: true, tgt: "enemy", cd: 3, perTurn: 1, lvl: 10, icon: "tir", eff: [{ t: "dmg", a: 26, b: 34 }], text: "Un énorme gland de longue portée. Dégâts massifs." },
    /* ---- Mystique : Feu et Eau, magie de zone ---- */
    m_orbe:       { name: "Orbe ardente", el: "feu", pa: 3, min: 1, max: 5, los: true, tgt: "enemy", lvl: 1, icon: "atk_magic", eff: [{ t: "dmg", a: 9, b: 13 }], text: "Une orbe de feu qui file droit sur sa cible." },
    m_nova:       { name: "Nova glaciale", el: "eau", pa: 4, min: 1, max: 4, los: true, tgt: "cell", area: { shape: "cross", r: 1 }, perTurn: 2, lvl: 1, icon: "nova", eff: [{ t: "dmg", a: 7, b: 10 }], text: "Une explosion givrée en croix (zone de 5 cases)." },
    m_maree:      { name: "Marée", el: "eau", pa: 3, min: 1, max: 5, line: true, los: true, tgt: "enemy", lvl: 3, icon: "tempete", eff: [{ t: "dmg", a: 6, b: 9 }, { t: "pull", n: 2 }], text: "Une vague qui attire l'ennemi de 2 cases vers toi." },
    m_brume:      { name: "Saut de brume", el: "air", pa: 2, min: 2, max: 6, los: true, tgt: "free", cd: 3, lvl: 6, icon: "orbes", eff: [{ t: "tp" }], text: "Disparais dans la brume et réapparais sur une case libre." },
    m_tempete:    { name: "Tempête arcanique", el: "feu", pa: 6, min: 2, max: 5, los: true, tgt: "cell", area: { shape: "circle", r: 2 }, cd: 4, lvl: 10, icon: "nova", eff: [{ t: "dmg", a: 15, b: 21 }], text: "Une tempête de feu sur un disque de 13 cases." },
    /* ---- Sylvain : Eau et Terre, soin et contrôle ---- */
    s_rosee:      { name: "Rosée", el: "eau", pa: 3, min: 1, max: 4, los: true, tgt: "ally", perTurn: 2, lvl: 1, icon: "source", eff: [{ t: "heal", a: 10, b: 14 }], text: "Soigne un allié (ou toi-même). Les soins profitent de la Chance." },
    s_ronces:     { name: "Ronces", el: "terre", pa: 3, min: 1, max: 4, los: true, tgt: "enemy", lvl: 1, icon: "ronces", eff: [{ t: "dmg", a: 7, b: 10 }, { t: "rpm", a: 1, b: 2 }], text: "Des ronces blessent l'ennemi et lui retirent 1 à 2 PM (l'Esquive PM de la cible peut les annuler)." },
    s_epine:      { name: "Épine acérée", el: "air", pa: 3, min: 2, max: 6, los: true, tgt: "enemy", lvl: 3, icon: "atk_vine", eff: [{ t: "dmg", a: 7, b: 10 }], text: "Une épine lancée de loin." },
    s_source:     { name: "Source vivifiante", el: "eau", pa: 4, min: 1, max: 3, tgt: "cell", area: { shape: "circle", r: 1 }, cd: 2, lvl: 6, icon: "source", eff: [{ t: "heal", a: 8, b: 12 }], text: "Soigne tous les alliés dans un disque de 5 cases." },
    s_floraison:  { name: "Floraison", el: "terre", pa: 5, min: 0, max: 4, los: true, tgt: "ally", cd: 4, lvl: 10, icon: "floraison", eff: [{ t: "buff", st: "pa", v: 1, turns: 2 }, { t: "buff", st: "dom", v: 8, turns: 2 }], text: "Un allié gagne +1 PA et +8 Dommages pendant 2 tours." }
  };

  /* ====================== CLASSES ======================
     hp = PV au niveau 1, hpL = PV par niveau, ini = initiative de base, crit = critique de base.
     Passif (appliqué dans computeStats) : resAll (% de résistance à tous les éléments), hpPct, po, crit, areaDmg (% dégâts de zone), healPct, regen (PV au début du tour). */
  D.CLASSES = {
    gardien: {
      name: "Gardien", title: "Gardien des Racines", role: "Tank · Terre", icon: "atk_melee", el: ["terre", "feu"],
      hp: 66, hpL: 9, ini: 80, crit: 0.04,
      stars: { Survie: 5, Dégâts: 3, Mobilité: 2, Soutien: 3 },
      desc: "Premier au contact, dernier à tomber. Il encaisse, bouscule les ennemis et protège ses alliés avec la Carapace. Il vit surtout de Force (Terre).",
      passive: { name: "Écorce", text: "+10 % de résistance à tous les éléments et +10 % de PV.", resAll: 10, hpPct: 0.1 },
      spells: ["g_griffes", "g_bousculade", "g_carapace", "g_braise", "g_charge"],
      starter: { tete: "noix", bouclier: "bois" }
    },
    lanceur: {
      name: "Lanceur", title: "Lanceur de Glands", role: "Dégâts à distance · Air", icon: "atk_shoot", el: ["air", "feu"],
      hp: 56, hpL: 7.5, ini: 130, crit: 0.1,
      stars: { Survie: 2, Dégâts: 5, Mobilité: 4, Soutien: 1 },
      desc: "Rapide et précis, il frappe de loin et esquive d'une roulade. Fragile en mêlée. Il vit d'Agilité (Air) pour des critiques fréquents.",
      passive: { name: "Œil de lynx", text: "+1 de portée sur tous ses sorts et +8 % de critique.", po: 1, crit: 0.08 },
      spells: ["l_tir", "l_enflamme", "l_salve", "l_roulade", "l_grandchene"],
      starter: { tete: "bandeau", main: "gland" }
    },
    mystique: {
      name: "Mystique", title: "Mystique des Brumes", role: "Magie de zone · Feu/Eau", icon: "atk_magic", el: ["feu", "eau"],
      hp: 50, hpL: 6.5, ini: 110, crit: 0.06,
      stars: { Survie: 1, Dégâts: 5, Mobilité: 3, Soutien: 2 },
      desc: "Maître des zones et des téléportations. Il nettoie les groupes d'un seul sort, repousse et attire. Très peu de PV : à protéger !",
      passive: { name: "Maîtrise des zones", text: "+15 % de dégâts sur tous les sorts de zone.", areaDmg: 15 },
      spells: ["m_orbe", "m_nova", "m_maree", "m_brume", "m_tempete"],
      starter: { tete: "sorcier", main: "baton" }
    },
    sylvain: {
      name: "Sylvain", title: "Sylvain de la Mousse", role: "Soutien · Eau/Terre", icon: "atk_vine", el: ["eau", "terre"],
      hp: 56, hpL: 7, ini: 100, crit: 0.05,
      stars: { Survie: 3, Dégâts: 2, Mobilité: 3, Soutien: 5 },
      desc: "Le druide de la bande : il soigne, entrave les ennemis et booste ses alliés. Indispensable en coop. Il vit de Chance (Eau) pour des soins puissants.",
      passive: { name: "Photosynthèse", text: "+25 % de soins et récupère 3 PV au début de chaque tour.", healPct: 25, regen: 3 },
      spells: ["s_rosee", "s_ronces", "s_epine", "s_source", "s_floraison"],
      starter: { tete: "feuille", main: "fleur" }
    }
  };
  D.CLASS_ORDER = ["gardien", "lanceur", "mystique", "sylvain"];

  /* ====================== MONSTRES ======================
     hp/xp/gold à lvl 1 (mis à l'échelle du niveau), res = résistances en % (négatif = faiblesse), el = éléments qu'il maîtrise. */
  D.MOBS = {
    limace:     { name: "Limace goulue", hp: 28, pa: 4, pm: 2, ini: 60,  res: { terre: 10, feu: -20, eau: 30, air: 0 },   xp: 10, gold: [1, 2], el: "terre", spells: ["x_bave", "x_gelee"], sz: 1 },
    corbeau:    { name: "Corbeau",       hp: 20, pa: 5, pm: 5, ini: 150, res: { terre: -10, feu: 0, eau: 0, air: 25 },   xp: 14, gold: [1, 3], el: "air",   spells: ["x_bec", "x_pique"], sz: 1 },
    renard:     { name: "Renard rôdeur", hp: 40, pa: 6, pm: 4, ini: 110, res: { terre: 0, feu: 30, eau: -15, air: 5 },   xp: 28, gold: [3, 6], el: "feu",   spells: ["x_griffure", "x_bond"], sz: 1 },
    grenouille: { name: "Grenouille bondissante", hp: 36, pa: 5, pm: 3, ini: 80, res: { terre: 0, feu: -20, eau: 35, air: 0 }, xp: 22, gold: [2, 5], el: "eau", spells: ["x_langue", "x_jet"], sz: 1 },
    roi:        { name: "Roi-corbeau",   hp: 210, pa: 7, pm: 4, ini: 130, res: { terre: 0, feu: -10, eau: 0, air: 30 }, xp: 300, gold: [40, 60], el: "air",  spells: ["x_becroyal", "x_plumes"], sz: 1, boss: true }
  };
  D.MOB_SPELLS = {
    x_bave:     { name: "Bave collante", el: "terre", pa: 3, min: 1, max: 1, tgt: "enemy", eff: [{ t: "dmg", a: 5, b: 8 }] },
    x_gelee:    { name: "Gelée", el: "eau", pa: 3, min: 1, max: 3, los: true, tgt: "enemy", cd: 1, eff: [{ t: "dmg", a: 4, b: 7 }] },
    x_bec:      { name: "Coup de bec", el: "air", pa: 3, min: 1, max: 1, tgt: "enemy", eff: [{ t: "dmg", a: 6, b: 9 }] },
    x_pique:    { name: "Piqué", el: "air", pa: 4, min: 2, max: 4, los: true, tgt: "enemy", cd: 1, eff: [{ t: "dmg", a: 7, b: 10 }, { t: "rpa", a: 0, b: 1 }] },
    x_griffure: { name: "Griffure", el: "feu", pa: 3, min: 1, max: 1, tgt: "enemy", eff: [{ t: "dmg", a: 8, b: 11 }] },
    x_bond:     { name: "Bond de feu", el: "feu", pa: 4, min: 2, max: 4, los: true, tgt: "enemy", cd: 1, eff: [{ t: "dmg", a: 9, b: 13 }] },
    x_langue:   { name: "Coup de langue", el: "eau", pa: 3, min: 1, max: 3, line: true, los: true, tgt: "enemy", eff: [{ t: "dmg", a: 6, b: 9 }, { t: "pull", n: 1 }] },
    x_jet:      { name: "Jet d'eau", el: "eau", pa: 4, min: 2, max: 5, los: true, tgt: "enemy", cd: 1, eff: [{ t: "dmg", a: 8, b: 11 }] },
    x_becroyal: { name: "Bec royal", el: "air", pa: 3, min: 1, max: 1, tgt: "enemy", eff: [{ t: "dmg", a: 12, b: 17 }] },
    x_plumes:   { name: "Tempête de plumes", el: "air", pa: 4, min: 1, max: 4, los: true, tgt: "cell", area: { shape: "circle", r: 1 }, cd: 1, eff: [{ t: "dmg", a: 9, b: 13 }] }
  };
  Object.keys(D.MOB_SPELLS).forEach(function (k) { D.MOB_SPELLS[k].eff.forEach(function (e) { if (e.t === "dmg") { e.a = Math.round(e.a * 0.8); e.b = Math.round(e.b * 0.8); } }); });
  // statistiques d'un monstre au niveau donné (utilisées par le moteur de combat)
  D.mobStats = function (type, lvl) {
    var M = D.MOBS[type], k = 0.85 + 0.15 * lvl, el = 3 + lvl * 2;
    return { type: type, name: M.name, lvl: lvl, hp: Math.round(M.hp * k), pa: M.pa, pm: M.pm, po: 0, ini: M.ini + lvl * 3, res: M.res,
      el: { terre: M.el === "terre" ? el : 0, feu: M.el === "feu" ? el : 0, eau: M.el === "eau" ? el : 0, air: M.el === "air" ? el : 0 }, dom: Math.round(lvl * 0.4), crit: 0.05, heal: 0,
      spells: M.spells, xp: Math.round(M.xp * (0.6 + 0.4 * lvl)), gold: M.gold, boss: !!M.boss };
  };

  /* ====================== ÉQUIPEMENT ======================
     Les mêmes types de stuff que dans Dofus : coiffe, cape, arme, bouclier, amulette, 2 anneaux, ceinture, bottes,
     familier et 3 trophées (les « Dofus »). 13 emplacements en tout. Coiffe, cape, arme et bouclier se voient sur l'écureuil.
     Un objet appartient à une catégorie (item.slot) ; les anneaux et les trophées peuvent aller dans plusieurs emplacements. */
  D.SLOTS = {
    tete:     { name: "Coiffe",   visible: true },
    dos:      { name: "Cape",     visible: true },
    main:     { name: "Arme",     visible: true },
    bouclier: { name: "Bouclier", visible: true },
    amulette: { name: "Amulette", visible: false },
    anneau:   { name: "Anneau",   visible: false },
    ceinture: { name: "Ceinture", visible: false },
    bottes:   { name: "Bottes",   visible: false },
    familier: { name: "Familier", visible: false },
    trophee:  { name: "Trophée",  visible: false }
  };
  D.CATEGORIES = ["tete", "dos", "main", "bouclier", "amulette", "anneau", "ceinture", "bottes", "familier", "trophee"];
  D.EQ_SLOTS = ["tete", "dos", "main", "bouclier", "amulette", "anneau1", "anneau2", "ceinture", "bottes", "familier", "trophee1", "trophee2", "trophee3"];
  D.SLOT_ORDER = D.EQ_SLOTS;
  D.EQ_NAMES = { tete: "Coiffe", dos: "Cape", main: "Arme", bouclier: "Bouclier", amulette: "Amulette", anneau1: "Anneau", anneau2: "Anneau", ceinture: "Ceinture", bottes: "Bottes", familier: "Familier", trophee1: "Trophée", trophee2: "Trophée", trophee3: "Trophée" };
  D.eqSlotsOf = function (cat) { return cat === "anneau" ? ["anneau1", "anneau2"] : cat === "trophee" ? ["trophee1", "trophee2", "trophee3"] : [cat]; };
  D.catOfSlot = function (eq) { return eq.replace(/\d$/, ""); };
  // emplacement où ira l'objet : le premier libre, sinon le premier compatible (échange)
  D.eqSlotFor = function (p, it) { var l = D.eqSlotsOf(it.slot), i; for (i = 0; i < l.length; i++) if (!p.eq[l[i]]) return l[i]; return l[0]; };
  D.LOOKS = {
    tete: { noix: "Casque de noix", bandeau: "Bandeau rouge", sorcier: "Chapeau étoilé", feuille: "Feuille de chêne", champi: "Chapeau champignon", fleurs: "Couronne de fleurs", heaume: "Heaume d'acier", couronne: "Couronne dorée" },
    dos: { feuille: "Cape de feuilles", rouge: "Cape rouge", nuit: "Cape étoilée", mousse: "Manteau de mousse", ailes: "Ailes de libellule" },
    main: { baton: "Bâton à gemme", gland: "Gland géant", fleur: "Sceptre fleuri", epee: "Épée de brindille", lanterne: "Lanterne de lucioles" },
    bouclier: { bois: "Bouclier de bois", ecorce: "Bouclier d'écorce", acier: "Bouclier d'acier", or: "Bouclier doré" },
    amulette: { gland: "Gland d'or", pierre: "Pierre de lune", baie: "Collier de baies", plume: "Amulette de plume" },
    anneau: { gland: "Anneau de gland", pierre: "Anneau de lune", baie: "Anneau de baie", or: "Anneau d'or" },
    ceinture: { cuir: "Ceinture de cuir", tresse: "Ceinture tressée", mousse: "Ceinture de mousse", or: "Ceinture dorée" },
    bottes: { mousse: "Bottes de mousse", cuir: "Bottes de cuir", vent: "Bottes du vent", or: "Bottes dorées" },
    familier: { limace: "Limace apprivoisée", corbeau: "Corbeau apprivoisé", renard: "Renardeau", grenouille: "Grenouille domestique" },
    trophee: { emeraude: "Dofus Émeraude", turquoise: "Dofus Turquoise", pourpre: "Dofus Pourpre", ocre: "Dofus Ocre", ivoire: "Dofus Ivoire" }
  };
  D.RARITIES = [
    { id: 0, name: "Commun",     col: "#cfd3d8", w: 55 },
    { id: 1, name: "Inhabituel", col: "#6fd07f", w: 25 },
    { id: 2, name: "Rare",       col: "#5aa8ff", w: 13 },
    { id: 3, name: "Épique",     col: "#b57cff", w: 5 },
    { id: 4, name: "Légendaire", col: "#ffb23a", w: 2 }
  ];
  /* Toutes les caractéristiques d'objet (clés de item.st). Les résistances : « res_* » en %, « rf_* » fixes.
     Les dommages fixes par élément : « do_* ». */
  D.STAT_NAMES = {
    vit: "Vitalité", sag: "Sagesse", frc: "Force", int: "Intelligence", cha: "Chance", agi: "Agilité",
    pa: "PA", pm: "PM", po: "Portée",
    dom: "Dommages", dopct: "% Dommages", pui: "Puissance", do_terre: "Dommages Terre", do_feu: "Dommages Feu", do_eau: "Dommages Eau", do_air: "Dommages Air",
    do_cri: "Dommages critiques", do_push: "Dommages de poussée", soin: "Soins", cri: "% Critique", ini: "Initiative", pros: "Prospection",
    esq_pa: "Esquive PA", esq_pm: "Esquive PM", ret_pa: "Retrait PA", ret_pm: "Retrait PM", tacle: "Tacle", fuite: "Fuite",
    res_terre: "% Résistance Terre", res_feu: "% Résistance Feu", res_eau: "% Résistance Eau", res_air: "% Résistance Air",
    rf_terre: "Résistance Terre", rf_feu: "Résistance Feu", rf_eau: "Résistance Eau", rf_air: "Résistance Air",
    rcri: "Résistance critiques", rpush: "Résistance poussée"
  };
  // pools de stats par catégorie (tirage pondéré par répétition) ; « elem » = une caractéristique élémentaire, « res » / « rf » / « do_el » = un élément au choix
  var POOLS = {
    tete:     ["vit", "vit", "sag", "res", "rf", "elem", "elem", "ini"],
    dos:      ["res", "res", "vit", "rf", "elem", "esq", "soin", "ini"],
    main:     ["elem", "elem", "dom", "dopct", "do_el", "cri", "do_cri", "pui"],
    bouclier: ["vit", "res", "res", "rf", "rcri", "rpush", "tacle", "fuite"],
    amulette: ["elem", "elem", "dom", "pui", "cri", "sag", "pros", "res", "vit"],
    anneau:   ["elem", "dom", "dopct", "do_el", "soin", "cri", "ini", "pui"],
    ceinture: ["vit", "vit", "res", "rf", "ini", "sag", "esq", "ret"],
    bottes:   ["ini", "pros", "esq", "ret", "fuite", "vit", "res", "tacle"],
    familier: ["vit", "elem", "ini", "pros", "sag", "res"],
    trophee:  ["vit", "elem", "dom", "pui", "cri", "pros", "sag", "res", "do_el"]
  };
  var SPECIAL = { tete: ["po", "pa"], dos: ["pm", "pm"], main: ["pa", "po"], bouclier: ["pa", "pm"], amulette: ["pa", "pm"], anneau: ["pa", "pm", "po"], ceinture: ["pa", "pm"], bottes: ["pm", "pm"], familier: ["pm", "po"], trophee: ["pa", "pm", "po"] };
  var EPITHETS = ["du Sous-bois", "de l'Aube", "des Racines", "du Grand Chêne", "de Ronceclair", "des Brumes", "de la Rosée"];
  var uid = 1;
  function unitOf(k) {                                              // valeur de base d'une caractéristique à rareté 0
    if (k === "vit") return 10; if (k === "sag") return 4; if (k === "frc" || k === "int" || k === "cha" || k === "agi") return 8;
    if (k === "dom" || k === "dopct") return 2; if (k === "pui") return 5; if (k.indexOf("do_") === 0 && k !== "do_cri" && k !== "do_push") return 2;
    if (k === "do_cri") return 3; if (k === "do_push") return 4; if (k === "soin") return 2; if (k === "cri") return 1.5; if (k === "ini") return 14; if (k === "pros") return 6;
    if (k.indexOf("esq_") === 0 || k.indexOf("ret_") === 0 || k === "tacle" || k === "fuite") return 3;
    if (k.indexOf("res_") === 0) return 3; if (k.indexOf("rf_") === 0) return 2; if (k === "rcri") return 3; if (k === "rpush") return 4; return 2;
  }
  D.rollRarity = function (rnd, bonus) {
    var tot = 0, i; D.RARITIES.forEach(function (r) { tot += r.w; });
    var x = rnd() * tot;
    for (i = 0; i < D.RARITIES.length; i++) { x -= D.RARITIES[i].w; if (x <= 0) break; }
    return Math.min(4, Math.max(0, (i >= D.RARITIES.length ? 4 : i) + (bonus || 0)));
  };
  D.makeItem = function (slot, look, rar, lvl, st, name) {
    return { id: Date.now().toString(36) + "-" + (uid++) + Math.floor(Math.random() * 1e4).toString(36), slot: slot, look: look, rar: rar, lvl: lvl, st: st || {}, name: name || D.LOOKS[slot][look] };
  };
  function resolveStat(tok, rnd, elStat, elName) {
    var els = D.EL_ORDER, e = els[Math.floor(rnd() * 4)];
    if (tok === "elem") return rnd() < 0.55 && elStat ? elStat : D.CHAR_ORDER[2 + Math.floor(rnd() * 4)];
    if (tok === "res") return "res_" + e; if (tok === "rf") return "rf_" + e;
    if (tok === "do_el") return "do_" + (elName && rnd() < 0.6 ? elName : e);
    if (tok === "esq") return rnd() < 0.5 ? "esq_pa" : "esq_pm"; if (tok === "ret") return rnd() < 0.5 ? "ret_pa" : "ret_pm";
    return tok;
  }
  D.genItem = function (cat, lvl, rar, rnd, elStat) {
    rnd = rnd || Math.random;
    if (cat === "trophee") rar = Math.max(rar, 3);                  // les trophées sont toujours épiques ou légendaires
    var looks = Object.keys(D.LOOKS[cat]), look = looks[Math.floor(rnd() * looks.length)];
    var unit = (1 + rar * 0.55) * (1 + lvl * 0.06), count = [2, 3, 4, 5, 6][rar] + (cat === "trophee" ? 1 : 0), st = {}, tries = 0, pool = POOLS[cat];
    var elName = null; if (elStat) D.EL_ORDER.forEach(function (e) { if (D.ELEMENTS[e].stat === elStat) elName = e; });
    while (Object.keys(st).length < count && tries++ < 80) {
      var k = resolveStat(pool[Math.floor(rnd() * pool.length)], rnd, elStat, elName);
      if (st[k] != null) continue;
      st[k] = Math.max(1, Math.round(unitOf(k) * unit * (0.8 + rnd() * 0.4)));
    }
    var spChance = cat === "trophee" ? 0.9 : rar === 4 ? 0.7 : rar === 3 ? 0.3 : 0;
    if (spChance && rnd() < spChance) { var sp = SPECIAL[cat][Math.floor(rnd() * SPECIAL[cat].length)]; st[sp] = (st[sp] || 0) + 1; }   // PA / PM / portée : épique, légendaire et trophées
    var name = D.LOOKS[cat][look] + (rar >= 2 && cat !== "trophee" ? " " + EPITHETS[Math.floor(rnd() * EPITHETS.length)] : "");
    return D.makeItem(cat, look, rar, lvl, st, name);
  };
  D.randomItem = function (lvl, rnd, bonus, cat, elStat) {
    rnd = rnd || Math.random;
    var rar = D.rollRarity(rnd, bonus);
    if (!cat) { var w = ["tete", "dos", "main", "bouclier", "amulette", "anneau", "anneau", "ceinture", "bottes", "familier"]; if (rar >= 3 && rnd() < 0.25) cat = "trophee"; else cat = w[Math.floor(rnd() * w.length)]; }
    return D.genItem(cat, lvl, rar, rnd, elStat);
  };
  D.starterItem = function (cat, look) { return D.makeItem(cat, look, 0, 1, cat === "main" ? { dom: 1 } : { vit: 5 }, D.LOOKS[cat][look]); };
  D.sellValue = function (it) { return Math.round(4 * (it.rar + 1) * (1 + it.lvl * 0.4)) * (it.slot === "trophee" ? 3 : 1); };
  D.buyValue = function (it) { return D.sellValue(it) * 4; };

  /* ====================== FURS ====================== */
  D.FURS = {
    roux:     { name: "Roux",     desc: "Le pelage d'origine de la guilde." },
    cendre:   { name: "Cendré",   desc: "Gris argenté, comme la brume du matin." },
    chocolat: { name: "Chocolat", desc: "Brun profond, couleur de châtaigne." }
  };
  D.FUR_ORDER = ["roux", "cendre", "chocolat"];

  /* ====================== STATISTIQUES D'UN PERSONNAGE ====================== */
  D.computeStats = function (p) {
    var C = D.CLASSES[p.cls], ps = C.passive, ch = p.chars, g = {}, k;
    D.EQ_SLOTS.forEach(function (s) { var it = p.eq && p.eq[s]; if (it) for (k in it.st) g[k] = (g[k] || 0) + it.st[k]; });
    function G(key) { return g[key] || 0; }
    var tot = {}; D.CHAR_ORDER.forEach(function (c) { tot[c] = (ch[c] || 0) + G(c); });
    var lv = p.lvl - 1, el = {}, res = {}, rf = {}, doEl = {}, pui = G("pui");
    D.EL_ORDER.forEach(function (e) { el[e] = tot[D.ELEMENTS[e].stat] + pui; doEl[e] = G("do_" + e); res[e] = Math.min(50, G("res_" + e) + (ps.resAll || 0)); rf[e] = G("rf_" + e); });
    var hp = Math.round((C.hp + lv * C.hpL + tot.vit * 2) * (1 + (ps.hpPct || 0)));
    return {
      maxHp: hp, pa: 6 + G("pa") + (p.lvl >= 20 ? 1 : 0), pm: 3 + G("pm"), po: (ps.po || 0) + G("po"),
      init: Math.round(C.ini + (tot.frc + tot.int + tot.cha + tot.agi) * 0.5 + G("ini")), pros: 100 + G("pros"),
      crit: Math.min(0.6, C.crit + (ps.crit || 0) + tot.agi * 0.003 + G("cri") / 100),
      dom: G("dom"), dopct: G("dopct"), pui: pui, doEl: doEl, doCri: G("do_cri"), doPush: G("do_push"),
      healFlat: G("soin"), healPct: ps.healPct || 0, areaDmg: ps.areaDmg || 0, regen: ps.regen || 0, xpPct: tot.sag,
      esqPa: Math.floor(tot.sag / 4) + G("esq_pa"), esqPm: Math.floor(tot.sag / 4) + G("esq_pm"), retPa: Math.floor(tot.sag / 6) + G("ret_pa"), retPm: Math.floor(tot.sag / 6) + G("ret_pm"),
      tacle: Math.floor(tot.agi / 10) + G("tacle"), fuite: Math.floor(tot.agi / 10) + G("fuite"),
      rcri: G("rcri"), rpush: G("rpush"), el: el, res: res, rf: rf, tot: tot, g: g
    };
  };

  /* ====================== PROFIL ====================== */
  function emptyEq() { var eq = {}; D.EQ_SLOTS.forEach(function (s) { eq[s] = null; }); return eq; }
  D.newProfile = function (cls, name, fur) {
    var C = D.CLASSES[cls], eq = emptyEq();
    Object.keys(C.starter).forEach(function (s) { eq[s] = D.starterItem(s, C.starter[s]); });
    var p = { v: 4, id: Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36), name: String(name || C.name).trim().slice(0, 14) || C.name, cls: cls, fur: D.FURS[fur] ? fur : "roux",
      lvl: 1, xp: 0, pts: 0, gold: 10, potions: 1, hp: 1, chars: { vit: 0, sag: 0, frc: 0, int: 0, cha: 0, agi: 0 }, eq: eq, bag: [],
      quest: 0, qn: 0, zone: 0, bossDead: false, chests: {}, kills: 0, time: 0, created: Date.now() };
    p.hp = D.computeStats(p).maxHp;
    return p;
  };
  // sorts débloqués à ce niveau
  D.spellsOf = function (p) { return D.CLASSES[p.cls].spells.filter(function (id) { return p.lvl >= D.SPELLS[id].lvl; }); };
  // répare un objet venu d'une ancienne version (le bouclier est devenu un emplacement à part)
  function fixItem(it) {
    if (!it || !it.slot || !D.LOOKS[it.slot]) return null;
    if (it.slot === "main" && it.look === "bouclier") { it.slot = "bouclier"; it.look = "bois"; }
    if (!D.LOOKS[it.slot][it.look]) it.look = Object.keys(D.LOOKS[it.slot])[0];
    it.st = it.st || {}; it.name = it.name || D.LOOKS[it.slot][it.look];
    return it;
  }
  // Profils v1 / v2 (temps réel) et v3 (stuff à 4 emplacements) → v4
  D.migrate = function (o) {
    if (!o || !D.CLASSES[o.cls]) return null;
    if (o.v === 4) return o;
    if (o.v === 3) {
      var eq = emptyEq();
      Object.keys(o.eq || {}).forEach(function (k) { var it = fixItem(o.eq[k]); if (it) { var tgt = D.EQ_SLOTS.indexOf(k) >= 0 && D.catOfSlot(k) === it.slot ? k : D.eqSlotsOf(it.slot)[0]; if (!eq[tgt]) eq[tgt] = it; else o.bag = (o.bag || []).concat([it]); } });
      o.eq = eq; o.bag = (o.bag || []).map(fixItem).filter(Boolean); o.v = 4; return o;
    }
    var p = D.newProfile(o.cls, o.name || D.CLASSES[o.cls].name, o.fur || "roux");
    ["lvl", "xp", "gold", "potions", "quest", "qn", "zone", "bossDead", "chests", "kills", "time"].forEach(function (k) { if (o[k] != null) p[k] = o[k]; });
    p.pts = (p.lvl - 1) * D.PTS_PER_LEVEL;
    if (o.v === 2) {
      ["tete", "dos", "main", "amulette"].forEach(function (s) {
        var it = o.eq && o.eq[s];
        if (it && it.look && D.LOOKS[s] && (D.LOOKS[s][it.look] || it.look === "bouclier")) { var cat = (s === "main" && it.look === "bouclier") ? "bouclier" : s; var n = D.genItem(cat, it.lvl || 1, it.rar || 0); n.look = cat === "bouclier" ? "bois" : it.look; n.name = it.name || n.name; p.eq[cat] = n; }
      });
      (o.bag || []).forEach(function (it) { it = fixItem(it); if (it) { var n = D.genItem(it.slot, it.lvl || 1, it.rar || 0); n.look = it.look; n.name = it.name || n.name; p.bag.push(n); } });
    } else { var g = o.gear || {}; p.gold += 30 * ((g.queue || 0) + (g.cape || 0) + (g.bottes || 0)); }
    p.hp = D.computeStats(p).maxHp;
    return p;
  };
  D.fixProfile = function (p) {
    p = D.migrate(p); if (!p) return null;
    p.eq = p.eq || {}; D.EQ_SLOTS.forEach(function (s) { if (!(s in p.eq)) p.eq[s] = null; });
    p.bag = (p.bag || []).map(fixItem).filter(Boolean); p.chars = p.chars || { vit: 0, sag: 0, frc: 0, int: 0, cha: 0, agi: 0 }; p.chests = p.chests || {};
    D.CHAR_ORDER.forEach(function (c) { if (p.chars[c] == null) p.chars[c] = 0; });
    if (!D.FURS[p.fur]) p.fur = "roux";
    return p;
  };

  /* ====================== SAUVEGARDES (5 emplacements) ====================== */
  D.SAVE_KEY = "rc-save-v3"; D.OLD_KEYS = ["rc-save-v2", "rc-save-v1"]; D.MAX_SLOTS = 5;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  D.loadSlots = function () {
    var arr = [];
    try { var a = JSON.parse(lsGet(D.SAVE_KEY) || "null"); if (a && a.length != null) arr = a.map(D.fixProfile).filter(Boolean); } catch (e) {}
    if (!arr.length && !lsGet(D.SAVE_KEY)) {                         // première ouverture : récupère les anciennes sauvegardes
      D.OLD_KEYS.some(function (key) {
        try { var old = JSON.parse(lsGet(key) || "null"); if (old) { var list = old.length != null ? old : [old]; arr = list.map(D.fixProfile).filter(Boolean); if (arr.length) { D.saveSlots(arr); return true; } } } catch (e) {}
        return false;
      });
    }
    return arr.slice(0, D.MAX_SLOTS);
  };
  D.saveSlots = function (arr) { lsSet(D.SAVE_KEY, JSON.stringify(arr)); };

  if (typeof module !== "undefined" && module.exports) module.exports = D;
  else root.RC_DATA = D;
})(typeof window !== "undefined" ? window : this);
