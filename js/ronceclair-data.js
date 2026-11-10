/* =========================================================================
   Ronceclair — données et règles pures (js/ronceclair-data.js)
   Aucune dépendance au DOM : classes, pelages, sorts, équipements, formules de
   caractéristiques, génération d'objets, sauvegardes à plusieurs emplacements.
   Tout le contenu éditable à la main est ici : CLASSES, FURS, SKILLS, LOOKS, RARITIES.
   API : window.RC_DATA (et module.exports pour les tests Node).
   ========================================================================= */
(function (root) {
  "use strict";
  var D = {};

  /* ====================== CLASSES ======================
     Quatre rôles qui se complètent à deux en coop :
       Gardien  = tank, corps à corps, encaisse et protège
       Lanceur  = dégâts à distance, critiques
       Mystique = magie de zone, perforante
       Sylvain  = soutien : soigne, ralentit, booste son partenaire
     hp / atk = valeurs au niveau 1, hpL / atkL = gain par niveau, spd = vitesse (px/s),
     cd = délai entre deux attaques, crit = critique de base, dr = réduction de dégâts, regen = PV/s en continu. */
  D.CLASSES = {
    gardien: {
      name: "Gardien", title: "Gardien des Racines", role: "Tank · mêlée", icon: "atk_melee",
      hp: 74, hpL: 10, atk: 6, atkL: 1.2, spd: 148, cd: 0.42, crit: 0.06, dr: 0.15, regen: 0, kind: "melee",
      stars: { Vitalité: 5, Dégâts: 3, Mobilité: 2, Soutien: 3 },
      desc: "Premier au contact, dernier à tomber. Le Gardien frappe de près avec ses griffes, encaisse les coups pour son équipe et protège ses alliés de son Rempart.",
      passive: { name: "Écorce", text: "Réduit de 15 % tous les dégâts subis." },
      attack: { name: "Coup de griffes", text: "Frappe en arc devant toi, repousse légèrement." },
      starter: { tete: "noix", main: "bouclier" }
    },
    lanceur: {
      name: "Lanceur", title: "Lanceur de Glands", role: "Dégâts · distance", icon: "atk_shoot",
      hp: 48, hpL: 7, atk: 6.5, atkL: 1.5, spd: 168, cd: 0.42, crit: 0.14, dr: 0, regen: 0, kind: "shoot",
      stars: { Vitalité: 2, Dégâts: 5, Mobilité: 4, Soutien: 1 },
      desc: "Rapide et précis, il arrose ses ennemis de glands avant qu'ils n'approchent. Fragile, il mise sur la distance, la roulade et les coups critiques.",
      passive: { name: "Œil de lynx", text: "+8 % de chances de coup critique." },
      attack: { name: "Tir de gland", text: "Lance un gland en ligne droite, longue portée." },
      starter: { tete: "bandeau", main: "gland" }
    },
    mystique: {
      name: "Mystique", title: "Mystique des Brumes", role: "Magie · zone", icon: "atk_magic",
      hp: 42, hpL: 6, atk: 8, atkL: 1.7, spd: 158, cd: 0.62, crit: 0.08, dr: 0, regen: 0, kind: "magic",
      stars: { Vitalité: 1, Dégâts: 5, Mobilité: 3, Soutien: 2 },
      desc: "Maître des éclats arcaniques qui traversent plusieurs ennemis d'un coup. Il nettoie les groupes et ralentit ceux qui approchent.",
      passive: { name: "Perforation", text: "Ses orbes traversent un ennemi de plus." },
      attack: { name: "Orbe arcanique", text: "Lance une orbe lente qui traverse plusieurs ennemis." },
      starter: { tete: "sorcier", main: "baton" }
    },
    sylvain: {
      name: "Sylvain", title: "Sylvain de la Mousse", role: "Soutien · soin", icon: "atk_vine",
      hp: 54, hpL: 8, atk: 5, atkL: 1.1, spd: 160, cd: 0.5, crit: 0.06, dr: 0.05, regen: 1.2, kind: "vine",
      stars: { Vitalité: 3, Dégâts: 2, Mobilité: 3, Soutien: 5 },
      desc: "Le druide de la bande : il soigne ses alliés, ralentit les ennemis avec des ronces et se régénère en continu. Indispensable en coop, plus lent à jouer seul.",
      passive: { name: "Photosynthèse", text: "Régénère 1,2 PV par seconde et soigne 25 % de plus." },
      attack: { name: "Épine ralentissante", text: "Lance une épine qui ralentit l'ennemi touché." },
      starter: { tete: "feuille", main: "fleur" }
    }
  };
  D.CLASS_ORDER = ["gardien", "lanceur", "mystique", "sylvain"];

  /* ====================== PELAGES (3 couleurs au départ) ====================== */
  D.FURS = {
    roux:     { name: "Roux",     desc: "Le pelage d'origine de la guilde." },
    cendre:   { name: "Cendré",   desc: "Gris argenté, comme la brume du matin." },
    chocolat: { name: "Chocolat", desc: "Brun profond, couleur de châtaigne." }
  };
  D.FUR_ORDER = ["roux", "cendre", "chocolat"];

  /* ====================== SORTS ======================
     slot 1 = niveau 1, slot 2 = niveau 4, slot 3 = niveau 8 (touches 1 2 3 ; E = sort 1).
     type : nova (zone autour de soi) · volley (projectiles) · zone (zone au sol, visée à la souris)
            dashstrike (charge) · heal (soin de zone) · buff (bouclier / force / régénération). */
  D.SKILLS = {
    gardien: [
      { id: "tourbillon", name: "Tourbillon", icon: "tourbillon", lvl: 1, cd: 6, type: "nova", r: 100, mult: 2, knock: 260, col: "#ffe6a8",
        text: "Une rotation de griffes qui frappe tous les ennemis autour de toi et les repousse." },
      { id: "rempart", name: "Rempart", icon: "rempart", lvl: 4, cd: 12, type: "buff", dur: 4, shield: 0.6, r: 170, col: "#9ad7ff",
        text: "Une carapace de noix : −60 % de dégâts subis pendant 4 s, pour toi et ton allié proche." },
      { id: "charge", name: "Charge du Chêne", icon: "charge", lvl: 8, cd: 9, type: "dashstrike", dist: 240, mult: 2.4, knock: 320, col: "#ffd257",
        text: "Fonce droit devant en bousculant tout sur ton passage (invincible pendant la charge)." }
    ],
    lanceur: [
      { id: "salve", name: "Salve de glands", icon: "salve", lvl: 1, cd: 6, type: "volley", n: 5, spread: 0.22, mult: 1.2, kind: "gland", speed: 420,
        text: "Cinq glands en éventail dans la direction visée." },
      { id: "pluie", name: "Pluie de glands", icon: "pluie", lvl: 4, cd: 10, type: "zone", r: 90, dur: 3.5, tick: 0.5, mult: 0.75, col: "#d9a35a", range: 330,
        text: "Une pluie de glands tombe sur la zone visée pendant 3,5 s." },
      { id: "tir", name: "Tir du Grand Chêne", icon: "tir", lvl: 8, cd: 12, type: "volley", n: 1, spread: 0, mult: 4.5, kind: "gland", speed: 620, pierce: 99, big: true,
        text: "Un énorme gland qui traverse tous les ennemis de la ligne. Dégâts ×4,5." }
    ],
    mystique: [
      { id: "nova", name: "Nova arcane", icon: "nova", lvl: 1, cd: 6, type: "nova", r: 140, mult: 2.2, knock: 200, col: "#c9a6ff",
        text: "Une onde arcanique autour de toi qui frappe fort et repousse." },
      { id: "orbes", name: "Orbes jumeaux", icon: "orbes", lvl: 4, cd: 8, type: "volley", n: 3, spread: 0.5, mult: 1.3, kind: "orbe", speed: 300, pierce: 2,
        text: "Trois orbes perforantes en éventail large." },
      { id: "tempete", name: "Tempête arcanique", icon: "tempete", lvl: 8, cd: 16, type: "zone", r: 120, dur: 4, tick: 0.4, mult: 0.8, slow: 0.5, col: "#b49be6", range: 300,
        text: "Une tempête sur la zone visée : dégâts continus et ennemis ralentis de moitié." }
    ],
    sylvain: [
      { id: "source", name: "Source vivifiante", icon: "source", lvl: 1, cd: 8, type: "heal", r: 180, pct: 0.3, col: "#7df0a0",
        text: "Une source de vie : soigne 30 % des PV max de toi et de ton allié proche." },
      { id: "ronces", name: "Ronces", icon: "ronces", lvl: 4, cd: 9, type: "zone", r: 100, dur: 4, tick: 0.5, mult: 0.6, slow: 0.6, col: "#4fae5f", range: 300,
        text: "Des ronces jaillissent à l'endroit visé : dégâts continus et ennemis ralentis." },
      { id: "floraison", name: "Floraison", icon: "floraison", lvl: 8, cd: 18, type: "buff", dur: 7, atk: 0.3, regen: 3, r: 200, col: "#ff9fd0",
        text: "Pendant 7 s, toi et ton allié proche gagnez +30 % d'attaque et 3 PV/s." }
    ]
  };
  D.SKILL_LEVELS = [1, 4, 8];

  /* ====================== STATS ====================== */
  D.STATS = {
    vit: { name: "Vitalité", desc: "+10 PV max par point" },
    frc: { name: "Force",    desc: "+2 attaque par point" },
    agi: { name: "Agilité",  desc: "+8 vitesse et +1 % de critique par point" }
  };
  D.MAX_LVL = 30;
  D.xpFor = function (lvl) { return Math.round(30 * Math.pow(lvl, 1.55)); };

  /* ====================== ÉQUIPEMENT ======================
     3 emplacements visibles sur l'écureuil (tête, dos, objet tenu) + l'amulette (stats seulement).
     Chaque « look » est dessiné par js/ronceclair-art.js (même identifiant). */
  D.SLOTS = {
    tete:     { name: "Tête",     visible: true,  fav: ["hp", "dr"] },
    dos:      { name: "Dos",      visible: true,  fav: ["spd", "crit"] },
    main:     { name: "Objet tenu", visible: true, fav: ["atk", "crit"] },
    amulette: { name: "Amulette", visible: false, fav: ["regen", "hp"] }
  };
  D.SLOT_ORDER = ["tete", "dos", "main", "amulette"];
  D.LOOKS = {
    tete: {
      noix:     "Casque de noix", bandeau: "Bandeau rouge", sorcier: "Chapeau étoilé", feuille: "Feuille de chêne",
      champi:   "Chapeau champignon", fleurs: "Couronne de fleurs", heaume: "Heaume d'acier", couronne: "Couronne dorée"
    },
    dos: {
      feuille: "Cape de feuilles", rouge: "Cape rouge", nuit: "Cape étoilée", mousse: "Manteau de mousse", ailes: "Ailes de libellule"
    },
    main: {
      bouclier: "Bouclier de bois", baton: "Bâton à gemme", gland: "Gland géant", fleur: "Sceptre fleuri",
      epee: "Épée de brindille", lanterne: "Lanterne de lucioles"
    },
    amulette: { gland: "Gland d'or", pierre: "Pierre de lune", baie: "Collier de baies" }
  };
  D.RARITIES = [
    { id: 0, name: "Commun",     col: "#cfd3d8", w: 55 },
    { id: 1, name: "Inhabituel", col: "#6fd07f", w: 25 },
    { id: 2, name: "Rare",       col: "#5aa8ff", w: 13 },
    { id: 3, name: "Épique",     col: "#b57cff", w: 5 },
    { id: 4, name: "Légendaire", col: "#ffb23a", w: 2 }
  ];
  D.STAT_NAMES = { hp: "PV", atk: "Attaque", spd: "Vitesse", crit: "Critique %", dr: "Réduction %", regen: "PV/s" };
  var UNIT = { hp: 6, atk: 1.2, spd: 4, crit: 1.5, dr: 1.5, regen: 0.35 };
  var EPITHETS = ["du Sous-bois", "de l'Aube", "des Racines", "du Grand Chêne", "de Ronceclair", "des Brumes", "de la Rosée"];
  var uid = 1;

  D.rollRarity = function (rnd, bonus) {
    var tot = 0, i; D.RARITIES.forEach(function (r) { tot += r.w; });
    var x = rnd() * tot;
    for (i = 0; i < D.RARITIES.length; i++) { x -= D.RARITIES[i].w; if (x <= 0) break; }
    return Math.min(4, Math.max(0, (i >= D.RARITIES.length ? 4 : i) + (bonus || 0)));
  };
  D.makeItem = function (slot, look, rar, lvl, st, name) {
    return { id: Date.now().toString(36) + "-" + (uid++) + Math.floor(Math.random() * 1e4).toString(36), slot: slot, look: look, rar: rar, lvl: lvl, st: st || {}, name: name || D.LOOKS[slot][look] };
  };
  D.genItem = function (slot, lvl, rar, rnd) {
    rnd = rnd || Math.random;
    var looks = Object.keys(D.LOOKS[slot]), look = looks[Math.floor(rnd() * looks.length)];
    var unit = (1 + rar * 0.8) * (1 + lvl * 0.12), fav = D.SLOTS[slot].fav, st = {};
    var count = 1 + (rar >= 1 ? 1 : 0) + (rar >= 3 ? 1 : 0), pool = fav.slice(), extra = ["hp", "atk", "spd", "crit", "dr", "regen"].filter(function (k) { return pool.indexOf(k) < 0; });
    while (pool.length < count) pool.push(extra.splice(Math.floor(rnd() * extra.length), 1)[0]);
    for (var i = 0; i < count; i++) {
      var k = pool[i], v = UNIT[k] * unit * (i === 0 ? 1 : 0.7) * (0.85 + rnd() * 0.3);
      st[k] = k === "regen" ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
    }
    var name = D.LOOKS[slot][look] + (rar >= 2 ? " " + EPITHETS[Math.floor(rnd() * EPITHETS.length)] : "");
    return D.makeItem(slot, look, rar, lvl, st, name);
  };
  D.randomItem = function (lvl, rnd, bonus, slot) {
    rnd = rnd || Math.random;
    slot = slot || D.SLOT_ORDER[Math.floor(rnd() * D.SLOT_ORDER.length)];
    return D.genItem(slot, lvl, D.rollRarity(rnd, bonus), rnd);
  };
  D.starterItem = function (slot, look) { return D.makeItem(slot, look, 0, 1, slot === "main" ? { atk: 1 } : { hp: 5 }, D.LOOKS[slot][look]); };
  D.sellValue = function (it) { return Math.round(4 * (it.rar + 1) * (1 + it.lvl * 0.4)); };
  D.buyValue = function (it) { return D.sellValue(it) * 4; };

  /* ====================== PROFIL ====================== */
  D.newProfile = function (cls, name, fur) {
    var C = D.CLASSES[cls], eq = { tete: null, dos: null, main: null, amulette: null };
    Object.keys(C.starter).forEach(function (s) { eq[s] = D.starterItem(s, C.starter[s]); });
    var p = { v: 2, id: Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36), name: String(name || C.name).trim().slice(0, 14) || C.name, cls: cls, fur: D.FURS[fur] ? fur : "roux",
      lvl: 1, xp: 0, pts: 0, gold: 10, potions: 1, hp: 1, stats: { vit: 0, frc: 0, agi: 0 }, eq: eq, bag: [],
      quest: 0, qn: 0, zone: 0, bossDead: false, chests: {}, kills: 0, time: 0, created: Date.now() };
    p.hp = D.computeStats(p).maxHp;
    return p;
  };
  D.computeStats = function (p) {
    var C = D.CLASSES[p.cls], st = p.stats, e = { hp: 0, atk: 0, spd: 0, crit: 0, dr: 0, regen: 0 };
    D.SLOT_ORDER.forEach(function (s) { var it = p.eq && p.eq[s]; if (it) for (var k in it.st) e[k] = (e[k] || 0) + it.st[k]; });
    var lv = p.lvl - 1;
    return {
      maxHp: Math.round(C.hp + lv * C.hpL + st.vit * 10 + e.hp),
      atk: C.atk + lv * C.atkL + st.frc * 2 + e.atk,
      spd: C.spd + st.agi * 8 + e.spd,
      crit: Math.min(0.75, C.crit + st.agi * 0.01 + e.crit / 100),
      dr: Math.min(0.6, C.dr + e.dr / 100),
      regen: C.regen + e.regen,
      eq: e
    };
  };
  // Profil de l'ancienne version (v1, une seule sauvegarde) → profil v2
  D.migrateV1 = function (o) {
    var p = D.newProfile(o.cls, D.CLASSES[o.cls].name, "roux");
    ["lvl", "xp", "pts", "gold", "potions", "stats", "quest", "qn", "zone", "bossDead", "chests", "kills", "time"].forEach(function (k) { if (o[k] != null) p[k] = o[k]; });
    var g = o.gear || {}; p.gold += 30 * ((g.queue || 0) + (g.cape || 0) + (g.bottes || 0));   // les anciens objets sont remboursés
    p.hp = D.computeStats(p).maxHp;
    return p;
  };
  D.fixProfile = function (p) {
    if (!p || !D.CLASSES[p.cls]) return null;
    if (p.v !== 2) return null;
    p.eq = p.eq || {}; D.SLOT_ORDER.forEach(function (s) { if (!(s in p.eq)) p.eq[s] = null; });
    p.bag = p.bag || []; p.stats = p.stats || { vit: 0, frc: 0, agi: 0 }; p.chests = p.chests || {};
    if (!D.FURS[p.fur]) p.fur = "roux";
    return p;
  };

  /* ====================== SAUVEGARDES (5 emplacements) ====================== */
  D.SAVE_KEY = "rc-save-v2"; D.OLD_KEY = "rc-save-v1"; D.MAX_SLOTS = 5;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  D.loadSlots = function () {
    var arr = [];
    try { var a = JSON.parse(lsGet(D.SAVE_KEY) || "null"); if (a && a.length != null) arr = a.map(D.fixProfile).filter(Boolean); } catch (e) {}
    if (!arr.length && !lsGet(D.SAVE_KEY)) {                       // première ouverture : récupère l'ancienne sauvegarde
      try { var old = JSON.parse(lsGet(D.OLD_KEY) || "null"); if (old && D.CLASSES[old.cls] && old.v === 1) { arr = [D.migrateV1(old)]; D.saveSlots(arr); } } catch (e) {}
    }
    return arr.slice(0, D.MAX_SLOTS);
  };
  D.saveSlots = function (arr) { lsSet(D.SAVE_KEY, JSON.stringify(arr)); };

  if (typeof module !== "undefined" && module.exports) module.exports = D;
  else root.RC_DATA = D;
})(typeof window !== "undefined" ? window : this);
