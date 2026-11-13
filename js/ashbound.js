/* Ashbound Tower — prototype navigateur : arène + 4 héros jouables (Noctis, Églantyne, Phelto, Épéiste).
   Moteur : rendu 3/4 (sol écrasé, sprites debout triés), ennemis sur chemin, tourelles par héros, UI minimale, commandes façon Mobile Legends.
   Les kits des héros sont dans js/ashbound-heroes.js. */
(function () {
  "use strict";
  var cv = document.getElementById("ash");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var RS = 1, CW = 1152, SL = 0, SR = 0, W = 1152, H = 720, OX = 0, PPU = 32, SY = Math.sin(55 * Math.PI / 180), TOP = 0, GW = 36, GH = 20, MAPW = 1152, MAPH = GH * PPU * SY;
  // caméra : monde en pixels « sol » (x*PPU, z*PPU*SY) ; zoom de combat / de construction ; Q = qualité des effets (adaptative)
  var TRAP_W = 40, CAM = { x: 0, y: 0, zm: 1.5, init: false }, ZC = 1.5, ZB = .72, VX = 576, VY = 360, VW = { x0: 0, x1: 0, y0: 0, y1: 0 }, LIMX = 17.4, LIMZ = 9.4, Q = 1, qEma = 16, PPOOL = [];
  var params = new URLSearchParams(location.search);
  var SPEED = Math.min(30, Math.max(1, parseFloat(params.get("speed")) || 1));
  var BASE = "ashbound/";
  var wrap = document.getElementById("ashwrap");
  var PINK = "#ff4fa8", PINKL = "#ff9bd2";

  // ---------- données (valeurs provisoires, identiques au projet Unity pour les ennemis) ----------
  var ENEMY = {
    orb:   { name: "Spectre corrompu", kind: "std", hp: 55, speed: 2.3, dmg: 4, gold: 4, xp: 4, atk: { k: "melee", range: 1.3, dmg: 5, cd: 1.1 }, spr: "enemy_orb", fps: 4, scale: 1, shadow: 1.2, bar: 1.0 },
    scout: { name: "Fureteur d'ombre", kind: "std", hp: 30, speed: 4.2, dmg: 3, gold: 3, xp: 4, atk: { k: "melee", range: 1.3, dmg: 4, cd: .8 }, spr: "enemy_scout", fps: 8, scale: 1, shadow: 1.5, bar: 1.0 },
    elite: { name: "Gardien de cendre", kind: "elite", hp: 240, speed: 1.5, dmg: 15, gold: 30, xp: 25, atk: { k: "shot", range: 7, dmg: 9, cd: 2.4, spd: 6 }, spr: "enemy_elite", fps: 2.5, scale: .9, shadow: 2.2, bar: 1.6, always: true },
    mini:  { name: "Broyeur de ruines", kind: "mini", hp: 1000, speed: 1.2, dmg: 35, gold: 90, xp: 80, atk: { k: "slam", range: 2.8, dmg: 16, cd: 2.6 }, spr: "enemy_miniboss", fps: 2, scale: .85, shadow: 3.4, bar: 2.4, always: true },
    boss:  { name: "Seigneur de Cendre", kind: "boss", hp: 3600, speed: .9, dmg: 100, gold: 250, xp: 200, atk: { k: "volley", range: 9, dmg: 12, cd: 3.2, spd: 7 }, spr: "enemy_boss", fps: 2, scale: .8, shadow: 4.2, bar: 3.2, always: true }
  };
  // séquence 2 : ennemis gélatineux (valeurs provisoires). gel = squash & stretch ; arm = résistance (réduction fixe des petits coups) ; split = se divise à la mort ; boom = explose (réaction en chaîne)
  ENEMY.slime = { name: "Gélatine verte", kind: "std", hp: 90, speed: 2.2, dmg: 6, gold: 7, xp: 6, atk: { k: "melee", range: 1.3, dmg: 6, cd: 1.1 }, spr: "enemy_slime", fps: 3, scale: 1, shadow: 1.5, bar: 1, gel: true, col: "#6fe08a" };
  ENEMY.blop = { name: "Blop violet", kind: "std", hp: 150, speed: 1.8, dmg: 8, gold: 10, xp: 9, atk: { k: "melee", range: 1.4, dmg: 8, cd: 1.2 }, spr: "enemy_blop", fps: 3, scale: 1.1, shadow: 1.7, bar: 1.1, gel: true, col: "#b46cff", split: [["blopm", 2]] };
  ENEMY.blopm = { name: "Petit blop", kind: "std", hp: 48, speed: 2.7, dmg: 3, gold: 3, xp: 3, atk: { k: "melee", range: 1.2, dmg: 4, cd: .9 }, spr: "enemy_blop", fps: 4, scale: .6, shadow: 1, bar: .8, gel: true, col: "#b46cff" };
  ENEMY.jelly = { name: "Gelée bleue", kind: "std", hp: 300, speed: 1.55, dmg: 10, gold: 16, xp: 14, arm: 7, atk: { k: "shot", range: 6.5, dmg: 5, cd: 2.8, spd: 6, slow: true }, spr: "enemy_jelly", fps: 2.5, scale: 1.05, shadow: 1.8, bar: 1.2, gel: true, col: "#5ac8ff" };
  ENEMY.boom = { name: "Gélatine explosive", kind: "std", hp: 110, speed: 1.95, dmg: 12, gold: 12, xp: 10, spr: "enemy_boom", fps: 4, scale: 1, shadow: 1.5, bar: 1, gel: true, col: "#ffb04a", boom: { r: 2.7, dmg: 70, hero: 9 } };
  ENEMY.gslime = { name: "Gélatine géante", kind: "mini", hp: 2600, speed: 1.05, dmg: 40, gold: 110, xp: 100, atk: { k: "slam", range: 3, dmg: 18, cd: 2.4 }, spr: "enemy_gslime", fps: 2, scale: .9, shadow: 3.8, bar: 2.4, always: true, gel: true, col: "#6fe08a", split: [["blop", 3], ["slime", 3]] };
  ENEMY.gking = { name: "Roi gélatineux", kind: "boss", hp: 9500, speed: .85, dmg: 100, gold: 300, xp: 260, atk: { k: "volley", range: 9, dmg: 12, cd: 3, spd: 7, slow: true }, spr: "enemy_gking", fps: 2, scale: .85, shadow: 4.8, bar: 3.4, always: true, gel: true, col: "#ff8ae6", split: [["gslime", 1], ["boom", 3], ["blop", 3]] };
  var BASE_STATS = { damage: 8, rate: 1.6, range: 5.5, zaps: 1, jumps: 0, radius: 2.8, falloff: .7, splash: 0, splashDmg: 0, slowF: 1, slowT: 0, stunEvery: 0, aura: 0, heal: 0, sr: 0, prot: 0 };
  // 1 famille de tourelles par héros (3 améliorations chacune ; valeurs provisoires)
  var TOWERS = {
    orb: { name: "Orbe foudroyant", cost: 50, col: "#7ff0ff", spr: "tower_orb_", my: 48, tag: "Éclairs précis",
      base: {}, ups: [
        { name: "Décharges multiples", desc: "3 éclairs par salve, sur des cibles différentes.", cost: 60, m: { zaps: 2, dmg: .85 } },
        { name: "Éclairs en chaîne", desc: "Chaque éclair rebondit sur 2 ennemis proches.", cost: 110, m: { jumps: 2, radius: .5 } },
        { name: "Surtension", desc: "Dégâts, cadence, portée et rebonds accrus.", cost: 180, m: { dmg: 1.5, rate: 1.25, range: 1, jumps: 2 } }] },
    faille: { name: "Totem d'ombre", cost: 50, col: "#c48bff", spr: "tower_faille_", my: 56, tag: "Éclats spectraux",
      base: { damage: 10, rate: 1.2, range: 5.8, radius: 2.4 }, ups: [
        { name: "Double projectile", desc: "2 éclats par salve.", cost: 60, m: { zaps: 1 } },
        { name: "Explosion en croix", desc: "L'impact explose autour de la cible.", cost: 110, m: { splash: 1.6, splashDmg: .6 } },
        { name: "Réactions en chaîne", desc: "Les éclats rebondissent sur 2 ennemis.", cost: 180, m: { jumps: 2, dmg: 1.2 } }] },
    ronce: { name: "Piège de ronce", cost: 50, col: "#b6f04a", spr: "tower_ronce_", my: 36, tag: "Ralentit",
      base: { damage: 11, rate: 2.3, range: 5.1, slowF: .75, slowT: 1.2 }, ups: [
        { name: "Lianes épaisses", desc: "Ralentissement 40 %.", cost: 60, m: { slowF: .6 } },
        { name: "Griffes terrestres", desc: "Dégâts accrus, 2 épines par salve.", cost: 110, m: { dmg: 1.6, zaps: 1 } },
        { name: "Entrelacs de fer", desc: "Une salve sur 4 immobilise 1,2 s.", cost: 180, m: { stunEvery: 4, slowF: .5 } }] },
    ampli: { name: "Totem mélodique", cost: 60, col: "#ff9bd2", spr: "tower_ampli_", my: 40, tag: "Aura de cadence",
      base: { damage: 9, rate: 2.4, range: 5.3, aura: .15 }, ups: [
        { name: "Basses profondes", desc: "Aura de cadence +25 %, dégâts accrus.", cost: 60, m: { aura: .25, dmg: 1.3 } },
        { name: "Écho", desc: "2 notes par salve.", cost: 110, m: { zaps: 1, dmg: 1.2 } },
        { name: "Concert", desc: "Aura +45 %, dégâts accrus.", cost: 180, m: { aura: .45, dmg: 1.6, range: .5 } }] }
  };
  // T2 / T3 de chaque famille (valeurs provisoires ; sprites de la tourelle T1 du héros, agrandis + pastilles de rang)
  TOWERS.arcane = { name: "Pylône d'arcs", cost: 110, col: "#c48bff", spr: "tower_faille_", my: 62, sc: 1.12, tag: "Arcs en chaîne",
    base: { damage: 16, rate: .9, range: 6.4, jumps: 2, radius: 3, falloff: .8 }, ups: [
      { name: "Arcs étendus", desc: "Rebonds +2, portée accrue.", cost: 90, m: { jumps: 2, range: .6 } },
      { name: "Orage", desc: "Dégâts et cadence accrus.", cost: 150, m: { dmg: 1.5, rate: 1.3 } }] };
  TOWERS.colosse = { name: "Colosse d'ombre", cost: 200, col: "#a070ff", spr: "tower_faille_", my: 70, sc: 1.28, tag: "Frappe de zone",
    base: { damage: 34, rate: .8, range: 7, zaps: 2, splash: 1.8, splashDmg: .5 }, ups: [
      { name: "Fracas", desc: "Dégâts et zone d'explosion accrus.", cost: 140, m: { dmg: 1.4, splash: 2.4, splashDmg: .6 } },
      { name: "Éclipse", desc: "Salve supplémentaire, cadence accrue.", cost: 200, m: { zaps: 1, rate: 1.3 } }] };
  TOWERS.poupee = { name: "Arbre à poupées", cost: 110, col: "#b6f04a", spr: "tower_ronce_", my: 44, sc: 1.12, tag: "Épines + ralentit",
    base: { damage: 14, rate: 1.6, range: 5.8, zaps: 2, slowF: .8, slowT: 1.5 }, ups: [
      { name: "Poupées gardiennes", desc: "Une épine de plus par salve.", cost: 90, m: { zaps: 1 } },
      { name: "Racines serrées", desc: "Ralentissement 40 %, dégâts accrus.", cost: 150, m: { slowF: .6, dmg: 1.3 } }] };
  TOWERS.monde = { name: "Arbre Monde", cost: 220, col: "#8dffa8", spr: "tower_ronce_", my: 52, sc: 1.3, tag: "Sanctuaire verdoyant",
    base: { damage: 16, rate: 1.4, range: 6.6, aura: .2, splash: 1.6, splashDmg: .5, slowF: .7, slowT: 1.5, heal: .015, sr: 5, prot: .3 }, ups: [
      { name: "Canopée", desc: "Sanctuaire plus vaste et plus régénérant, aura +20 %.", cost: 150, m: { aura: .2, range: .6, sr: 1.2, heal: .01, prot: .15 } },
      { name: "Sanctuaire", desc: "Aura +25 %, régénération et protection accrues, dégâts accrus.", cost: 220, m: { aura: .25, dmg: 1.4, sr: 1.2, heal: .015, prot: .2 } }] };
  TOWERS.feedback = { name: "Enceinte à feedback", cost: 110, col: "#ff9bd2", spr: "tower_ampli_", my: 46, sc: 1.12, tag: "Onde de choc",
    base: { damage: 15, rate: 1.5, range: 5.6, splash: 2.2, splashDmg: .7, aura: .1 }, ups: [
      { name: "Larsen", desc: "Zone d'onde accrue.", cost: 90, m: { splash: 2.8, dmg: 1.2 } },
      { name: "Mur de son", desc: "Cadence et dégâts accrus.", cost: 150, m: { rate: 1.3, dmg: 1.3 } }] };
  TOWERS.scene = { name: "Scène de concert", cost: 220, col: "#ffd0ee", spr: "tower_ampli_", my: 52, sc: 1.3, tag: "Grande aura",
    base: { damage: 20, rate: 2, range: 6.2, aura: .35, zaps: 2 }, ups: [
      { name: "Rappel", desc: "Aura +25 %.", cost: 150, m: { aura: .25 } },
      { name: "Finale", desc: "Dégâts et portée accrus.", cost: 220, m: { dmg: 1.5, range: .6 } }] };
  TOWERS.tesla = { name: "Bobine Tesla", cost: 110, col: "#7ff0ff", spr: "tower_orb_", my: 54, sc: 1.12, tag: "Chaîne longue",
    base: { damage: 18, rate: 1.1, range: 5.8, jumps: 3, radius: 2.8, falloff: .85 }, ups: [
      { name: "Surcharge", desc: "Rebonds +2.", cost: 90, m: { jumps: 2 } },
      { name: "Haute tension", desc: "Dégâts et cadence accrus.", cost: 150, m: { dmg: 1.4, rate: 1.25 } }] };
  TOWERS.foudre = { name: "Pylône de foudre", cost: 200, col: "#e6ffff", spr: "tower_orb_", my: 62, sc: 1.28, tag: "Triple décharge",
    base: { damage: 40, rate: .9, range: 7, zaps: 3, jumps: 2, falloff: .8 }, ups: [
      { name: "Tempête", desc: "Dégâts accrus, rebonds +1.", cost: 140, m: { dmg: 1.4, jumps: 1 } },
      { name: "Colère du ciel", desc: "Cadence et portée accrues.", cost: 200, m: { rate: 1.3, range: .8 } }] };
  // ---- progression des tourelles (PROVISOIRE, configurable) ----
  // 3 familles par héros, sans mélange. Cibles GDD : ~30 T1, ~10 T2, ~3 T3 atteintes au niveau 10 (43 constructions) sur la carte agrandie (56 emplacements).
  var FAM = { noctis: ["faille", "arcane", "colosse"], eglantyne: ["ronce", "poupee", "monde"], phelto: ["ampli", "feedback", "scene"], epeiste: ["orb", "tesla", "foudre"] };
  // niveau de déblocage + limite de tourelles construites, par niveau d'équipe (index = niveau - 1)
  var TIERCFG = [{ unlock: 1, cap: [6, 8, 10, 12, 15, 18, 21, 24, 27, 30] }, { unlock: 3, cap: [0, 0, 2, 3, 4, 5, 6, 7, 8, 10] }, { unlock: 6, cap: [0, 0, 0, 0, 0, 1, 1, 2, 3, 3] }], SELL_RATE = .6;
  Object.keys(FAM).forEach(function (h) { FAM[h].forEach(function (id, i) { TOWERS[id].fam = h; TOWERS[id].T = i + 1; }); });
  // ---- Piège de ronce d'Églantyne : posé SUR le chemin (hors des 43 emplacements), persistant, recharge, 3 spécialisations (PROVISOIRE, configurable) ----
  var TRAP = { cost: 40, specCost: 80, specLvl: 2, evoCost: 130, evoLvl: 4, cap: [4, 5, 6, 8, 10, 12, 14, 16, 18, 20], space: 2.4,
    base: { dmg: 14, r: 1.7, slowF: .55, slowT: 2, rech: 3.5, ch: 6, stun: 0, poison: 0 },
    specs: {
      solar: { name: "Floraison solaire", short: "Solaire", tag: "Gros dégâts", desc: "Éclat de lumière : dégâts de zone élevés.", col: "#ffe680", m: { dmg: 1.9, r: .8, rechx: 1.2 } },
      constrictor: { name: "Constricteur", short: "Constricteur", tag: "Immobilise", desc: "Racines : immobilise 1,4 s puis ralentit fort.", col: "#9a5cff", m: { dmg: .8, stun: 1.4, slowF: -.15, slowT: 1, rechx: 1.3 } },
      spore: { name: "Éclat de spores", short: "Spores", tag: "Poison", desc: "Nuage toxique : poison et ralentissement de zone.", col: "#d08cff", m: { dmg: .6, poison: 9, r: 1, slowT: 1 } } },
    evo: { name: "Évolution", desc: "Plus de dégâts, de rayon et de charges.", m: { dmg: 1.5, r: .5, ch: 4, rechx: .8 } } };
  var START_GOLD = 150, HEART_MAX = 100, TRID = 0;
  TOWERS.ronce.trap = true; TOWERS.ronce.cost = TRAP.cost; TOWERS.ronce.tag = "Piège sur le chemin";
  var WAVES = [
    ["Vague 1 — Premiers murmures", [["orb", 5, .5, 0]]],
    ["Vague 2 — La corruption s'étend", [["orb", 7, .45, 0]]],
    ["Vague 3 — Des ombres rapides", [["orb", 5, .5, 0], ["scout", 4, .4, 1.5]]],
    ["Vague 4 — Le flot grossit", [["orb", 9, .4, 0], ["scout", 5, .35, 2]]],
    ["Vague 5 — Le Broyeur de ruines approche !", [["mini", 1, 1, 0], ["orb", 8, .45, 2]]],
    ["Vague 6 — Meute d'ombres", [["orb", 8, .4, 0], ["scout", 8, .3, 1.5]]],
    ["Vague 7 — Gardiens de cendre", [["elite", 2, 2, 0], ["orb", 10, .4, 1]]],
    ["Vague 8 — Tempête d'ombres", [["scout", 12, .25, 0], ["orb", 8, .4, 2]]],
    ["Vague 9 — Bataillon de cendre", [["elite", 3, 1.8, 0], ["orb", 12, .35, 1]]],
    ["Vague 10 — LE SEIGNEUR DE CENDRE !", [["boss", 1, 1, 0], ["elite", 3, 2, 3], ["orb", 10, .4, 2]]]
  ];
  // séquence 2 (vagues 11–20) : monde gélatineux, groupes mixtes, cuirasses, explosions en chaîne, minibosses et boss plus durs
  var WAVES2 = [
    ["Vague 11 — La gelée s'éveille", [["slime", 10, .45, 0], ["blop", 3, 1.2, 2]]],
    ["Vague 12 — Les spores luisent", [["slime", 8, .35, 0], ["jelly", 2, 1.8, 1], ["blop", 4, .9, 3]]],
    ["Vague 13 — Éclats instables", [["boom", 5, .8, 0], ["slime", 10, .3, 1]]],
    ["Vague 14 — Cuirasse de gelée", [["jelly", 5, 1.2, 0], ["boom", 3, 1.5, 3], ["slime", 8, .3, 1]]],
    ["Vague 15 — LA GÉLATINE GÉANTE !", [["gslime", 1, 1, 0], ["blop", 6, .8, 4], ["boom", 4, 1, 6]]],
    ["Vague 16 — Marée visqueuse", [["slime", 18, .22, 0], ["blop", 8, .6, 1], ["boom", 3, 1.6, 3]]],
    ["Vague 17 — Réaction en chaîne", [["boom", 12, .5, 0], ["jelly", 4, 1.3, 3]]],
    ["Vague 18 — Peau de gelée", [["jelly", 8, .9, 0], ["blop", 8, .7, 2], ["slime", 12, .25, 1]]],
    ["Vague 19 — Le monde se referme", [["gslime", 2, 6, 0], ["boom", 8, .7, 3], ["jelly", 5, 1, 5], ["blop", 8, .5, 1]]],
    ["Vague 20 — LE ROI GÉLATINEUX !", [["gking", 1, 1, 0], ["gslime", 1, 1, 8], ["jelly", 6, 1, 3], ["boom", 8, .8, 5], ["blop", 10, .5, 1]]]
  ];
  var TRICKLE2 = [["slime", 2, 270, 6, 1, 3, .4], ["blop", 20, 270, 14, 1, 2, .6]];
  var SEQ2 = { bonus: 120, hpRamp: .09, spdRamp: .03, corr0: .3 };   // bonus de cristaux à la transition ; montée de PV / vitesse par vague ; part de corruption visuelle au départ
  var TRICKLE = [["orb", 2, 270, 6, 1, 3, .45], ["scout", 60, 270, 11, 1, 2, .35]];
  var HERO_ORDER = ["noctis", "eglantyne", "phelto", "epeiste"], HCOL = { noctis: "#b88cff", eglantyne: "#8dffa8", phelto: "#ff7ac8", epeiste: "#8ff0ff" };
  var KITS = null, COOP = null, EID = 0, OID = 0, CUR = null, UI = { offer: null, hide: false, seenLvl: 1, newT: {}, bmin: false };
  // vie des héros, niveaux (provisoire) : +12 % PV et +8 % de dégâts par niveau ; les améliorations de tourelle exigent un niveau
  var HEROHP = { noctis: 90, eglantyne: 100, phelto: 95, epeiste: 125 }, UPREQ = [2, 3, 5], MAXLVL = 10;
  // améliorations de héros (choix à chaque niveau, 3 propositions max) — provisoires, configurables ici
  var UPG = [
    { id: "pow", n: "Puissance", d: "+12 % de dégâts", max: 5, f: function (m) { m.dmg += .12; } },
    { id: "cdr", n: "Maîtrise", d: "-8 % de recharge des compétences", max: 5, f: function (m) { m.cdr += .08; } },
    { id: "asp", n: "Cadence", d: "+10 % de vitesse d'attaque", max: 5, f: function (m) { m.asp += .10; } },
    { id: "vig", n: "Vigueur", d: "+15 % de PV max", max: 5, f: function (m) { m.hp += .15; } },
    { id: "spd", n: "Célérité", d: "+8 % de vitesse de déplacement", max: 4, f: function (m) { m.spd += .08; } },
    { id: "mag", n: "Aimant", d: "+40 % de portée de ramassage d'XP", max: 4, f: function (m) { m.mag += .4; } },
    { id: "reg", n: "Régénération", d: "+1,5 % de PV par seconde", max: 3, f: function (m) { m.reg += .015; } },
    { id: "syn", n: "Synergie", d: "Tourelles proches : +10 % de cadence", max: 4, f: function (m) { m.syn += .10; } },
    { id: "clone", h: "noctis", n: "Double reflet", d: "+1 clone actif en même temps", max: 2, f: function (m) { m.clone += 1; } },
    { id: "cdS1", h: "noctis", n: "Failles rapides", d: "Traversée Fantôme : -25 % de recharge", max: 2, f: function (m) { m.cdS1 += .25; } },
    { id: "shade", h: "noctis", n: "Moisson spectrale", d: "+8 % de chance de ressusciter une ombre", max: 3, f: function (m) { m.shade += .08; } },
    { id: "venom", h: "eglantyne", n: "Venin tenace", d: "Poison +40 % plus puissant", max: 3, f: function (m) { m.venom += .4; } },
    { id: "swarm", h: "eglantyne", n: "Essaim fertile", d: "Une poupée toutes les 4 puis 3 éliminations", max: 2, f: function (m) { m.swarm += 1; } },
    { id: "rngS1", h: "eglantyne", n: "Calice profond", d: "Calice de l'Effroi : zone +30 %", max: 2, f: function (m) { m.rngS1 += .3; } },
    { id: "pierce", h: "phelto", n: "Crescendo", d: "Les notes traversent les ennemis", max: 1, f: function (m) { m.pierce += 1; } },
    { id: "rngS2", h: "phelto", n: "Riff étendu", d: "Riff d'accélération : zone +30 %, durée +2 s", max: 2, f: function (m) { m.rngS2 += .3; } },
    { id: "stun", h: "phelto", n: "Voix puissante", d: "Accord de choc : étourdissement +0,4 s", max: 3, f: function (m) { m.stun += .4; } },
    { id: "charge", h: "epeiste", n: "Charge rapide", d: "La charge électrique se remplit 50 % plus vite", max: 3, f: function (m) { m.charge += .5; } },
    { id: "rngAtk", h: "epeiste", n: "Lame étendue", d: "Portée du combo +20 %", max: 3, f: function (m) { m.rngAtk += .2; } },
    { id: "s2", h: "epeiste", n: "Foudre persistante", d: "Foudre Ancrée : dégâts et étourdissement accrus", max: 3, f: function (m) { m.s2 += .3; } }
  ];
  function recomputeMod(h) {
    var m = { dmg: 0, cdr: 0, asp: 0, hp: 0, spd: 0, mag: 0, reg: 0, syn: 0, clone: 0, cdS1: 0, shade: 0, venom: 0, swarm: 0, rngS1: 0, pierce: 0, rngS2: 0, stun: 0, charge: 0, rngAtk: 0, s2: 0 };
    UPG.forEach(function (u) { for (var i = 0; i < (h.picks[u.id] || 0); i++) u.f(m); });
    m.cdr = Math.min(.5, m.cdr); m.cdS1 = Math.min(.5, m.cdS1); h.mod = m;
    var nm = Math.round(hpFor(h.id, G ? G.lvl : 1) * (1 + m.hp)); if (nm !== h.mhp) { var d = nm - h.mhp; h.mhp = nm; if (!h.dead && d > 0) h.hp = Math.min(h.mhp, h.hp + d); }
  }
  function upgradeById(id) { for (var i = 0; i < UPG.length; i++) if (UPG[i].id === id) return UPG[i]; return null; }
  function makeOffer(h) {
    var avail = UPG.filter(function (u) { return (!u.h || u.h === h.id) && (h.picks[u.id] || 0) < u.max; });
    avail.sort(function () { return Math.random() - .5; });
    var spec = avail.filter(function (u) { return u.h; }), out = [];
    if (spec.length) out.push(spec[0]);
    avail.forEach(function (u) { if (out.length < 3 && out.indexOf(u) < 0) out.push(u); });
    return out.map(function (u) { return u.id; });
  }
  function hpFor(id, lvl) { return Math.round((HEROHP[id] || 100) * (1 + .12 * (lvl - 1))); }
  function xpCum(l) { var t = 0; for (var i = 1; i < l; i++) t += 40 + 35 * (i - 1); return t; }

  // ---------- ressources ----------
  var imgs = {}, snd = {}, L = null, loaded = false, muted = false;
  var IMGS = ["ground", "fx_shadow", "heart_0", "heart_1", "doll", "gate", "sparkle", "pine_s", "pine_m", "pine_d", "ruin_a", "ruin_b", "rock", "rock_small", "crystal", "bush", "fern", "grave", "tree_dead", "tree_teal", "ruin_pillar", "ruin_arch", "bones", "mushroom"];
  Object.keys(ENEMY).forEach(function (k) { [0, 1].forEach(function (f) { var n = ENEMY[k].spr + "_" + f; if (IMGS.indexOf(n) < 0) IMGS.push(n); }); });
  Object.keys(TOWERS).forEach(function (k) { for (var i = 0; i < 4; i++) if (IMGS.indexOf(TOWERS[k].spr + i) < 0) IMGS.push(TOWERS[k].spr + i); });
  ["epeiste", "eglantyne", "phelto", "noctis"].forEach(function (h) { ["idle0", "idle1", "move0", "move1", "atk", "cast"].forEach(function (n) { IMGS.push("hero_" + h + "_" + n); }); IMGS.push("icon_" + h, "big_" + h); });
  IMGS.push("fx_phelto_notes", "fx_eglantyne_seed", "skill_epeiste_s1", "skill_epeiste_s2", "skill_epeiste_ult", "skill_epeiste_passive");
  var SNDS = ["zap", "hit", "death", "build", "upgrade", "heart_hit", "win", "lose", "click", "error", "wave", "boss", "ambient", "splat", "blop", "boing", "boom"];
  function boot() {
    var pending = IMGS.length + 1;
    function done() { if (--pending === 0) { loaded = true; init(); } }
    IMGS.forEach(function (n) { var im = new Image(); im.onload = done; im.onerror = done; im.src = BASE + "img/" + n + ".png"; imgs[n] = im; });
    fetch(BASE + "layout.json").then(function (r) { return r.json(); }).then(function (j) { L = j; done(); }).catch(function () { L = null; done(); });
    SNDS.forEach(function (n) { var a = new Audio(BASE + "snd/" + n + ".wav"); a.preload = "auto"; snd[n] = a; });
  }
  var lastPlay = {};
  function play(n, vol, rate) {
    if (muted || !snd[n]) return;
    var now = performance.now(); if (lastPlay[n] && now - lastPlay[n] < 45) return; lastPlay[n] = now;
    try { var a = snd[n].cloneNode(); a.volume = Math.min(1, (vol || 1) * .7); a.playbackRate = Math.max(.25, Math.min(4, (rate || 1) * (1 + (Math.random() - .5) * .12))); a.play().catch(function () {}); } catch (e) {}
  }
  var ambient = null;
  function startAmbient() { if (ambient || !snd.ambient) return; ambient = snd.ambient; ambient.loop = true; ambient.volume = muted ? 0 : .2; ambient.play().catch(function () { ambient = null; }); }

  // ---------- état ----------
  var path, cum, LEN, slots, decor, G, hover = null, mouse = { x: -1, y: -1 }, buttons = [], ctl = [], time = 0;
  var keys = {}, ptrs = {}, joy = { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0 }, touchUI = false, full = false, mouseIn = false, aimSt = null;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    if (!L) { ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.fillText("Impossible de charger le jeu.", 40, 60); return; }
    GW = L.width; GH = L.height; MAPW = GW * PPU; MAPH = GH * PPU * SY; LIMX = GW / 2 - .7; LIMZ = GH / 2 - .7;
    path = L.path.map(function (p) { return [p.x, p.z]; });
    cum = [0]; for (var i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    LEN = cum[cum.length - 1];
    slots = L.slots.map(function (s) { return { x: s.x, z: s.z, tower: null }; });
    decor = L.decor; buildWorld2();
    KITS = window.AshHeroes(API);
    COOP = window.AshCoop ? window.AshCoop(BRIDGE) : null;
    var room = params.get("room"); if (room && COOP) setTimeout(function () { COOP.join(room); }, 50);
    touchUI = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var app = (window.navigator && window.navigator.standalone === true) || (window.matchMedia && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches)) || params.get("app");
    reset(false); resize(); requestAnimationFrame(frame);
    if (app) { touchUI = touchUI || !!params.get("app"); setFull(true); }
    try { if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {}
    var q = params.get("hero"); if (q && KITS[q]) pickHero(q);
  }
  // ---------- évolution du monde (séquence 2) : champignons / cristaux lumineux, yeux dans les bois, brume, teinte ; ne touche ni l'arène ni les constructions ----------
  var W2 = [], W2EYES = [], GLOWC = {}, FOGC = null;
  function glowCanvas(col) {
    if (GLOWC[col]) return GLOWC[col]; var c = document.createElement("canvas"); c.width = c.height = 96; var g = c.getContext("2d"), gr = g.createRadialGradient(48, 48, 2, 48, 48, 48);
    gr.addColorStop(0, col); gr.addColorStop(.35, col + "66"); gr.addColorStop(1, col + "00"); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); return (GLOWC[col] = c);
  }
  function buildWorld2() {
    var r = mulberry(777), tries = 0, cols = ["#4af0d0", "#ff5ad0", "#a070ff"]; W2 = []; W2EYES = [];
    while (W2.length < 170 && tries < 9000) {
      tries++; var x = (r() * 2 - 1) * (GW / 2 - 1), z = (r() * 2 - 1) * (GH / 2 - 1);
      if (nearestPath({ x: x, z: z }).dist < 2.4) continue;
      if (slots.some(function (q) { return Math.hypot(q.x - x, q.z - z) < 1.9; })) continue;
      if (Math.hypot(x - L.heart.x, z - L.heart.z) < 3.5 || Math.hypot(x - L.spawn.x, z - L.spawn.z) < 3.5) continue;
      if (W2.some(function (o) { return Math.hypot(o.x - x, o.z - z) < 1.5; })) continue;
      W2.push({ x: x, z: z, k: r() < .62 ? "mush" : "gcrystal", col: cols[Math.floor(r() * 3)], sc: .8 + r() * .7, ph: r() * 6.28 });
    }
    decor.filter(function (d) { return d.kind.indexOf("pine") === 0; }).forEach(function (d, i) { if (i % 4 === 0 && W2EYES.length < 40) W2EYES.push({ x: d.x, z: d.z, ph: r() * 6.28, col: i % 8 === 0 ? "#ff4060" : "#c8ff60" }); });
  }
  function newHero(id, slot) {
    var kit = KITS[id], h = { id: id, kit: kit, slot: slot || 0, hp: hpFor(id, G ? G.lvl || 1 : 1), mhp: hpFor(id, G ? G.lvl || 1 : 1), picks: {}, mod: {}, pend: 0, dead: false, down: 0, rv: 0, inv: 0, hurtT: 99, hflash: 0, ctrl: null, netMoving: false, x: L.heart.x - 5 + (slot || 0) * 1.6, z: L.heart.z + 3.5 - (slot || 0) * 0.8, face: Math.PI, moving: false, atkCd: 0, swing: 0, cd: { s1: 0, s2: 0, ult: 0 }, dash: null, lunge: null, speedMul: 1, k: {} };
    kit.init(h); recomputeMod(h); return h;
  }
  function reset(keepHero) {
    if (COOP && COOP.active() && !keepHero) COOP.leave();
    resetCore(keepHero);
  }
  function buildEvents(seq) {
    var ev = [], r = mulberry(seq === 2 ? 4321 : 1234), t0 = 10, dt = 27, W = seq === 2 ? WAVES2 : WAVES, TR = seq === 2 ? TRICKLE2 : TRICKLE;
    W.forEach(function (w, i) { w[1].forEach(function (g) { for (var k = 0; k < g[1]; k++) ev.push({ t: t0 + dt * i + g[3] + k * g[2], e: g[0], lat: lat(r, g[0]) }); }); });
    TR.forEach(function (tr) { for (var t = tr[1]; t <= tr[2]; t += tr[3]) { var n = tr[4] + Math.floor(r() * (tr[5] - tr[4] + 1)); for (var k = 0; k < n; k++) ev.push({ t: t + k * tr[6], e: tr[0], lat: lat(r, tr[0]) }); } });
    ev.sort(function (a, b) { return a.t - b.t; }); return ev;
  }
  function resetCore(keepHero) {
    var ev = buildEvents(1);
    slots.forEach(function (s) { s.tower = null; });
    var hid = keepHero && G && G.hero ? G.hero.id : null;
    G = { state: "select", paused: false, t: 0, events: ev, next: 0, wave: 0, gold: START_GOLD, heart: HEART_MAX, enemies: [], towers: [], parts: [], bolts: [], fx: [], pending: [], projs: [], actors: [], buffs: [], sortedNow: [],
      toast: "", toastT: 0, toastC: "#fff", build: false, sel: null, traps: [], selT: null, pvT: null, shake: 0, flashHeart: 0, kills: 0, anim: 0, hero: null, heroes: [], orbs: [], xp: 0, lvl: 1, dmgMul: 1, eprojs: [], floats: [], mirror: false, menu: false, coopMenu: false, rem: 0, tint: 0, tintT: 0, seq: 1, corr: 0, corrT: 0, trans: 0 };
    hover = null; ptrs = {}; joy.on = false; aimSt = null; UI.seenLvl = 1; UI.newT = {}; UI.bmin = false;
    if (hid) { G.hero = newHero(hid, 0); G.heroes = [G.hero]; G.state = "prep"; }
  }
  function lat(r, e) { return ENEMY[e].kind === "std" ? (r() * 2 - 1) * .45 : 0; }
  function pos(d) {
    d = Math.max(0, Math.min(LEN, d));
    var lo = 1, hi = path.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m; }
    var seg = cum[lo] - cum[lo - 1] || 1, t = (d - cum[lo - 1]) / seg, a = path[lo - 1], b = path[lo];
    var dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return { x: a[0] + dx * t, z: a[1] + dz * t, dx: dx / l, dz: dz / l };
  }
  function toast(s, c) { G.toast = s; G.toastC = c || "#f2e8d0"; G.toastT = 2.2; }
  function ep(e) { var p = pos(e.d); return { x: p.x - p.dz * e.lat + e.ox, z: p.z + p.dx * e.lat + e.oz, dx: p.dx }; }
  function sh(name) { var im = imgs[name]; return im && im.naturalHeight ? im.naturalHeight : 48; }
  function clampX(x) { return Math.max(-LIMX, Math.min(LIMX, x)); }
  function clampZ(z) { return Math.max(-LIMZ, Math.min(LIMZ, z)); }
  function tstats(def, tier) {
    var s = {}, k; for (k in BASE_STATS) s[k] = BASE_STATS[k]; for (k in def.base) s[k] = def.base[k];
    for (var i = 0; i < tier; i++) {
      var m = def.ups[i].m; s.damage *= m.dmg || 1; s.rate *= m.rate || 1; s.range += m.range || 0; s.zaps += m.zaps || 0; s.jumps += m.jumps || 0; s.radius += m.radius || 0;
      if (m.splash != null) { s.splash = m.splash; s.splashDmg = m.splashDmg; } if (m.slowF != null) s.slowF = m.slowF; if (m.stunEvery != null) s.stunEvery = m.stunEvery; if (m.aura != null) s.aura = m.aura; s.heal += m.heal || 0; s.sr += m.sr || 0; s.prot += m.prot || 0;
    }
    return s;
  }

  // ---------- projection / taille d'écran ----------
  function sx(x) { return (x + GW / 2) * PPU; }
  function sy(z) { return (GH / 2 - z) * PPU * SY; }
  // écran logique -> monde (inverse de la caméra)
  function toWorld(px, py) { var wx = (px - VX) / CAM.zm + CAM.x, wy = (py - VY) / CAM.zm + CAM.y; return { x: wx / PPU - GW / 2, z: GH / 2 - wy / (PPU * SY) }; }
  var probe = null;
  function safeInsets() {
    try {
      if (!probe) { probe = document.createElement("div"); probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"; document.body.appendChild(probe); }
      var cs = getComputedStyle(probe); return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
    } catch (e) { return { l: 0, r: 0 }; }
  }
  // largeur logique = ratio réel de l'écran ; zones sûres (encoche) retirées de la zone de jeu ; résolution interne adaptée à l'écran
  function resize() {
    var r0 = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    CW = 1152; SL = SR = 0;
    if (full) {
      var asp = r0.width > 10 && r0.height > 10 ? r0.width / r0.height : window.innerWidth / Math.max(1, window.innerHeight);
      CW = Math.max(960, Math.min(1700, Math.round(H * asp)));
      var sc0 = Math.min(r0.width / CW, r0.height / H) || 1, ins = safeInsets(); SL = Math.round(ins.l / sc0); SR = Math.round(ins.r / sc0);
    }
    W = CW - SL - SR;
    RS = Math.max(1, Math.min(2, Math.ceil((r0.width || CW) * dpr / CW - 0.05)));
    if (cv.width !== CW * RS || cv.height !== H * RS) { cv.width = CW * RS; cv.height = H * RS; }
  }
  // ---------- caméra : suit le héros avec lissage, zoom de combat / de construction, bornée à la carte ----------
  function camTarget() {
    var h = G.hero, build = G.build && (G.state === "play" || G.state === "prep"), sel = G.state === "select";
    return { x: h ? sx(h.x) : MAPW / 2, y: h ? sy(h.z) - 18 : MAPH / 2, zm: (build || sel) ? ZB : ZC, vy: build ? H * .47 : H * .52, over: build ? 100 : 0 };
  }
  function camClamp() {
    var z = CAM.zm, hw = W / (2 * z), over = CAM.over / z;
    CAM.x = MAPW <= 2 * hw ? MAPW / 2 : Math.max(hw, Math.min(MAPW - hw, CAM.x));
    var up = VY / z, dn = (H - VY) / z;
    CAM.y = MAPH <= up + dn ? MAPH / 2 : Math.max(up, Math.min(MAPH - dn + over, CAM.y));
  }
  function updateCam(dt) {
    if (!G || !L) return; var t = camTarget(); VX = W / 2;
    if (!CAM.init) { CAM.x = t.x; CAM.y = t.y; CAM.zm = t.zm; VY = t.vy; CAM.over = t.over; CAM.init = true; }
    var kp = 1 - Math.exp(-9 * dt), kz = 1 - Math.exp(-5 * dt);
    CAM.zm += (t.zm - CAM.zm) * kz; VY += (t.vy - VY) * kz; CAM.over += (t.over - CAM.over) * kz;
    CAM.x += (t.x - CAM.x) * kp; CAM.y += (t.y - CAM.y) * kp;
    camClamp();
    VW.x0 = CAM.x - (VX + SL) / CAM.zm; VW.x1 = CAM.x + (W + SR - VX) / CAM.zm; VW.y0 = CAM.y - VY / CAM.zm; VW.y1 = CAM.y + (H - VY) / CAM.zm;
    // qualité adaptative : si l'image dépasse ~24 ms en moyenne, on allège les effets
    qEma += (Math.min(80, dt * 1000) - qEma) * .05; Q = qEma > 26 ? .45 : qEma > 21 ? .7 : 1;
    if (mouseIn && !touchUI && !G.paused) hover = slotAt(toWorld(mouse.x, mouse.y));
  }
  function inView(x, y, mx, mt) { return x > VW.x0 - mx && x < VW.x1 + mx && y > VW.y0 - (mt || mx) && y < VW.y1 + mx; }
  var nativeFS = false;
  function setFull(on) {
    if (full === on || !wrap) return; full = on;
    if (on) {
      wrap.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;padding:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center";
      cv.style.cssText = "display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;touch-action:none;user-select:none;-webkit-user-select:none";
      document.body.style.overflow = "hidden";
      try { var el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(function () { nativeFS = true; if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {}); }).catch(function () {}); } catch (e) {}
    } else {
      wrap.style.cssText = "padding:8px;background:#09060f";
      cv.style.cssText = "display:block;width:100%;height:auto;image-rendering:pixelated;touch-action:none;border-radius:8px";
      document.body.style.overflow = "";
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    }
    resize();
  }
  function relayout() { if (loaded) resize(); }
  window.addEventListener("resize", relayout); window.addEventListener("orientationchange", function () { [50, 300, 800].forEach(function (d) { setTimeout(relayout, d); }); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", relayout);
  if (window.ResizeObserver && wrap) new ResizeObserver(relayout).observe(wrap);
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && full && nativeFS) { nativeFS = false; setFull(false); } [60, 300, 800].forEach(function (d) { setTimeout(relayout, d); }); });
  function toggleFull() { setFull(!full); }

  // ---------- jeu : ennemis, dégâts ----------
  function startSeq() { if (G.state !== "prep") return; if (G.mirror) { if (COOP) COOP.req({ k: "start" }); return; } G.state = "play"; G.t = 0; play("wave", .8); startAmbient(); }
  function endState(s) { if (G.mirror || G.state !== "play") return; G.state = s; play(s === "win" ? "win" : "lose"); }
  function burst(x, y, col, n, spd, life, size) {
    if (G.parts.length > 420 * Q) return; n = Math.max(1, Math.round(n * Q));
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (.3 + Math.random() * .7), q = PPOOL.pop() || {}; q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v - spd * .4; q.life = life * (.6 + Math.random() * .6); q.max = life; q.s = size * (.6 + Math.random() * .6); q.c = col; G.parts.push(q); }
  }
  function spawnKind(k, dist, lat0, parent) {
    var d = ENEMY[k], hs = G.heroes.length > 1 ? 1.5 : 1, ramp = parent ? parent.hpm : G.seq === 2 ? 1 + SEQ2.hpRamp * Math.max(0, G.wave - 1) : 1, sp = parent ? parent.spd : G.seq === 2 ? 1 + SEQ2.spdRamp * Math.max(0, G.wave - 1) : 1;
    var e = { id: ++EID, mhp: d.hp * hs * ramp, k: k, def: d, d: dist, hp: d.hp * hs * ramp, lat: lat0, flash: 0, age: 0, dead: false, ph: Math.random() * 4, ox: 0, oz: 0, stun: 0, slowF: 1, slowT: 0, poison: null, barT: 99, hpm: ramp, spd: sp };
    if (parent) e.born = .35; G.enemies.push(e); return e;
  }
  function spawn(ev) { spawnKind(ev.e, 0, ev.lat, null); if (ev.e === "boss" || ev.e === "gking" || ev.e === "gslime") play("boss", ev.e === "gslime" ? .7 : 1, ev.e === "gking" ? .8 : 1.1); }
  function splitEnemy(e) {
    var n = 0, tot = 0; e.def.split.forEach(function (g) { tot += g[1]; });
    e.def.split.forEach(function (g) { for (var i = 0; i < g[1]; i++) { var o = n++ - (tot - 1) / 2; spawnKind(g[0], Math.max(0, e.d + o * .45), Math.max(-.6, Math.min(.6, o * .35)), e); } });
    play("boing", .5, .9 + Math.random() * .3);
  }
  function explode(x, z, b, from) {
    G.fx.push({ k: "ring", x: x, z: z, r: b.r, t: 0, dur: .4, col: "#ffb04a", flash: true }); burst(sx(x), sy(z) - 12, "#ffb04a", 16, 170, .6, 5); G.shake = Math.max(G.shake, .16); play("boom", .6, .9 + Math.random() * .3);
    G.heroes.forEach(function (h) { if (!h.dead && Math.hypot(h.x - x, h.z - z) <= b.r) hurtHero(h, b.hero); });
    inRadius(x, z, b.r).forEach(function (o, i) { if (o === from) return; G.pending.push({ t: .1 + .03 * (i % 4), f: function () { dmgEnemy(o, o.def.boom ? b.dmg * 2.2 : b.dmg, true); } }); });   // réaction en chaîne : les explosifs voisins partent à leur tour
  }
  function splat(x, z, col) {
    var n = 0; G.fx.forEach(function (f) { if (f.k === "splat") n++; }); if (n > 14 * Q) return;
    G.fx.push({ k: "splat", x: x, z: z, t: 0, dur: 2.4, col: col, sd: Math.random() * 100 });
  }
  function aimPt(e) { var p = ep(e); return { x: sx(p.x), y: sy(p.z) - sh(e.def.spr + "_0") * e.def.scale * .5 }; }
  function dmgEnemy(e, a, silent) {
    if (e.dead || a <= 0) return;
    if (G.mirror) { e.flash = .1; e.spark = .16; e.sx = (Math.random() - .5) * 14; e.sy = (Math.random() - .5) * 12; if (!silent) play("hit", .4); var pm = aimPt(e); burst(pm.x, pm.y, PINKL, 2, 80, .25, 3); return; }
    if (e.def.arm) a = Math.max(a * .3, a - e.def.arm);   // résistance : les petits coups sont fortement réduits
    e.hp -= a; e.flash = .1; e.barT = 0; e.spark = .16; e.sx = (Math.random() - .5) * 14; e.sy = (Math.random() - .5) * 12; if (!silent) play("hit", .4);
    var p = aimPt(e); burst(p.x, p.y, PINKL, 2, 80, .25, 3);
    if (e.hp <= 0) {
      e.dead = true; G.gold += e.def.gold; G.kills++; var pw = ep(e); dropOrbs(pw.x, pw.z, e.def.xp || 1);
      if (e.def.gel) { play("splat", .55, .85 + Math.random() * .5); burst(p.x, p.y, e.def.col, 12 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : 0), 150, .65, 4); splat(pw.x, pw.z, e.def.col); }
      else { play("death", .6); burst(p.x, p.y, "#b278ff", 10 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : e.def.kind === "elite" ? 12 : 0), 140, .7, 5); }
      if (e.def.split) splitEnemy(e);
      if (e.def.boom) explode(pw.x, pw.z, e.def.boom, e);
      G.heroes.forEach(function (hh) { if (hh.kit.onKill) { var pc = CUR; CUR = hh; hh.kit.onKill(hh, e); CUR = pc; } });
    }
  }
  function dropOrbs(x, z, xp) {
    var n = xp >= 150 ? 10 : xp >= 60 ? 6 : xp >= 20 ? 3 : 1, v = xp / n;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, sp = n > 1 ? 1 + Math.random() * 2.5 : .6; G.orbs.push({ x: x, z: z, v: v, t: 0, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp }); }
    while (G.orbs.length > 60) { var o = G.orbs.shift(); G.orbs[0].v += o.v; }   // plafond d'orbes : on fusionne les plus anciennes (lisibilité, mobile)
  }
  function updateOrbs(dt) {
    if (G.mirror) return;
    G.orbs = G.orbs.filter(function (o) {
      o.t += dt; if (o.t > 40) return false;
      var f = Math.exp(-3 * dt); o.vx *= f; o.vz *= f; o.x = clampX(o.x + o.vx * dt); o.z = clampZ(o.z + o.vz * dt);
      var best = null, bd = 1e9;
      G.heroes.forEach(function (h) { if (h.dead) return; var d = Math.hypot(h.x - o.x, h.z - o.z); if (d < bd) { bd = d; best = h; } });
      if (best) {
        var mag = 2.6 * (1 + (best.mod.mag || 0));
        if (bd < mag) { var sp = 8 + (mag - bd) * 3; o.x += (best.x - o.x) / (bd || 1) * sp * dt; o.z += (best.z - o.z) / (bd || 1) * sp * dt; }
        if (bd < .6) { gainXp(o.v); G.xpFlash = .25; play("click", .25, 1.8 + Math.random() * .4); burst(sx(o.x), sy(o.z) - 12, "#c78bff", 3, 70, .3, 3); return false; }
      }
      return true;
    });
  }
  function gainXp(n) {
    if (G.mirror || n <= 0) return; G.xp += n;
    while (G.lvl < MAXLVL && G.xp >= xpCum(G.lvl + 1)) { G.lvl++; levelUp(); }
  }
  function levelUp() {
    G.dmgMul = 1 + .08 * (G.lvl - 1);
    G.heroes.forEach(function (h) { recomputeMod(h); h.mhp = Math.round(hpFor(h.id, G.lvl) * (1 + h.mod.hp)); if (!h.dead) h.hp = h.mhp; if (G.lvl >= 2) h.pend++; G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#ffe680" }); burst(sx(h.x), sy(h.z) - 30, "#ffe680", 14, 130, .7, 4); });
    G.lvlFlash = 1; toast("NIVEAU " + G.lvl + " !" + (G.lvl >= 2 ? " Choisis une amélioration" : ""), "#ffe680"); play("upgrade", 1);
  }
  function floatText(x, z, txt, col) { G.floats.push({ x: sx(x), y: sy(z) - 70, txt: txt, col: col, t: 0 }); }
  function hurtHero(h, dmg) {
    if (G.mirror || h.dead || h.inv > 0 || G.state !== "play") return;
    h.hp = Math.max(0, h.hp - dmg); h.inv = .35; h.hurtT = 0; h.hflash = .2;
    floatText(h.x, h.z, "-" + Math.round(dmg), "#ff6a6a"); play(dmg >= 12 ? "heart_hit" : "hit", dmg >= 12 ? .35 : .5);
    if (h === G.hero) G.shake = Math.max(G.shake, .1 + Math.min(.2, dmg / 80));
    if (h.hp <= 0) heroDown(h);
  }
  function heroDown(h) {
    h.dead = true; h.down = 0; h.rv = 0; h.dash = null; h.moving = false; h.atkCd = 0;
    burst(sx(h.x), sy(h.z) - 30, "#ff6a8a", 18, 150, .8, 5); toast((h.kit.short || h.kit.name) + " est à terre !", "#ff8a8a"); play("lose", .3);
    if (G.heroes.length > 1 && G.heroes.every(function (o) { return o.dead; })) endState("lose");
  }
  function revive(h, frac, atHeart) {
    h.dead = false; h.hp = Math.max(1, Math.round(h.mhp * frac)); h.rv = 0; h.down = 0; h.inv = 2;
    if (atHeart) { h.x = L.heart.x - 5; h.z = L.heart.z + 3.5; }
    G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#9bffd0" }); burst(sx(h.x), sy(h.z) - 30, "#9bffd0", 16, 130, .8, 5);
    toast(atHeart ? "Réapparition" : (h.kit.short || h.kit.name) + " est ranimé !", "#9bffd0"); play("upgrade", .8);
  }
  // minuteries des héros ; côté autorité : régénération, ranimation par l'équipier (3 s à moins de 1,9 u), réapparition automatique
  function applyPick(h, id, remote) {
    var u = upgradeById(id); if (!u || !h || h.pend <= 0 || (u.h && u.h !== h.id) || (h.picks[id] || 0) >= u.max) return false;
    h.picks[id] = (h.picks[id] || 0) + 1; h.pend--; recomputeMod(h);
    G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2, t: 0, dur: .5, col: "#9bffd0" }); burst(sx(h.x), sy(h.z) - 30, "#9bffd0", 10, 110, .6, 4); play("upgrade", .7, 1.2);
    if (!remote) toast(u.n + " : " + u.d, "#9bffd0");
    return true;
  }
  function chooseUpgrade(id) {
    var h = G.hero; if (!h || h.pend <= 0) return;
    if (G.mirror) { if (COOP) COOP.req({ k: "pick", id: id }); UI.offer = null; return; }
    if (applyPick(h, id, false)) UI.offer = null;
  }
  function updateHeroVitals(dt) {
    G.heroes.forEach(function (h) {
      if (h.inv > 0) h.inv -= dt; if (h.hflash > 0) h.hflash -= dt; h.hurtT += dt;
      if (G.mirror || G.state !== "play") return;
      if (!h.dead) { var rg = (h.hurtT > 5 ? .02 : 0) + (h.mod.reg || 0); if (rg > 0 && h.hp < h.mhp) h.hp = Math.min(h.mhp, h.hp + h.mhp * rg * dt); return; }
      h.down += dt;
      var mate = null; G.heroes.forEach(function (o) { if (o !== h && !o.dead && Math.hypot(o.x - h.x, o.z - h.z) <= 1.9) mate = o; });
      h.rv = mate ? Math.min(1, h.rv + dt / 3) : Math.max(0, h.rv - dt * .5);
      var solo = G.heroes.length < 2;
      if (h.rv >= 1) revive(h, .5, false); else if (solo && h.down >= 8) revive(h, .6, true); else if (!solo && h.down >= 30) revive(h, .35, true);
    });
  }
  function enemyAttack(e, dt) {
    var a = e.def.atk; if (!a || e.stun > 0 || G.state !== "play") return;
    if (e.atkCd === undefined) e.atkCd = a.cd * Math.random();
    e.atkCd -= dt; if (e.atkCd > 0) return;
    var p = ep(e), best = null, bd = a.range;
    G.heroes.forEach(function (h) { if (h.dead) return; var d = Math.hypot(h.x - p.x, h.z - p.z); if (d <= bd) { bd = d; best = h; } });
    if (!best) { e.atkCd = .1; return; }
    e.atkCd = a.cd;
    if (a.k === "melee") { hurtHero(best, a.dmg); burst(sx(best.x), sy(best.z) - 30, "#ff9aa8", 4, 90, .3, 3); }
    else if (a.k === "slam") {
      G.fx.push({ k: "ring", x: p.x, z: p.z, r: a.range, t: 0, dur: .4, col: "#ff9a5a" }); G.shake = Math.max(G.shake, .1); play("hit", .7, .6);
      G.heroes.forEach(function (h) { if (!h.dead && Math.hypot(h.x - p.x, h.z - p.z) <= a.range) hurtHero(h, a.dmg); });
    } else {
      var n = a.k === "volley" ? 3 : 1, base = Math.atan2(best.z - p.z, best.x - p.x);
      for (var i = 0; i < n; i++) { var ang = base + (i - (n - 1) / 2) * .22; G.eprojs.push({ x: p.x, z: p.z, vx: Math.cos(ang) * a.spd, vz: Math.sin(ang) * a.spd, life: a.range / a.spd * 1.4, dmg: a.dmg, r: .55, slow: a.slow }); }
      play("zap", .3, .7);
    }
  }
  function updateEProjs(dt) {
    G.eprojs = G.eprojs.filter(function (p) {
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt; if (p.life <= 0) return false;
      if (!G.mirror) for (var i = 0; i < G.heroes.length; i++) { var h = G.heroes[i]; if (!h.dead && Math.hypot(h.x - p.x, h.z - p.z) <= p.r + .5) { hurtHero(h, p.dmg); if (p.slow) h.slowT = 1.6; burst(sx(p.x), sy(p.z) - 20, p.slow ? "#7fe8ff" : "#ff9a5a", 6, 100, .3, 4); return false; } }
      return true;
    });
    G.floats = G.floats.filter(function (f) { f.t += dt; f.y -= 28 * dt; return f.t < 1; });
  }
  function inRadius(x, z, r) { var out = []; G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - x, p.z - z) <= r) out.push(e); }); return out; }
  function nearestEnemy(x, z, r, ex) {
    var best = null, bd = r;
    G.enemies.forEach(function (e) { if (e.dead || (ex && ex.indexOf(e) >= 0)) return; var p = ep(e), d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = e; } });
    return best;
  }
  function bolt(a, b, big) { G.bolts.push({ a: a, b: b, life: big ? .3 : .14, pts: jag(a, b, big ? 30 : 18), flick: false, big: !!big }); if (!big) burst(b.x, b.y, "#9ff4ff", 3, 100, .25, 3); }
  function jag(a, b, amp) {
    var pts = [a], n = 7, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (var i = 1; i < n; i++) { var t = i / n, o = (Math.random() - .5) * amp; pts.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o }); }
    pts.push(b); return pts;
  }
  function muzzle(t) { return { x: sx(t.s.x), y: sy(t.s.z) - TOWERS[t.type].my }; }

  // ---------- tourelles ----------
  function inRangeT(t, st) {
    var out = []; G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - t.s.x, p.z - t.s.z) <= st.range) out.push(e); });
    out.sort(function (a, b) { return b.d - a.d; }); return out;
  }
  function fire(t) {
    var def = TOWERS[t.type], st = t.st, tg = inRangeT(t, st);
    if (!tg.length) return false;
    var m = muzzle(t), distinct = Math.min(st.zaps, tg.length); t.salvo++;
    for (var z = 0; z < st.zaps; z++) {
      var cur = tg[z % distinct]; if (cur.dead) continue;
      var hit = [], dmg = st.damage, origin = m;
      for (var j = 0; j <= st.jumps; j++) {
        hit.push(cur); var a = aimPt(cur), p = ep(cur);
        G.bolts.push({ a: origin, b: a, life: .14, pts: jag(origin, a, 16), flick: false, col: def.col });
        dmgEnemy(cur, dmg, true);
        if (st.slowF < 1) { cur.slowF = Math.min(cur.slowF, st.slowF); cur.slowT = Math.max(cur.slowT, st.slowT); }
        if (st.stunEvery && t.salvo % st.stunEvery === 0) cur.stun = Math.max(cur.stun, 1.2);
        if (st.splash) inRadius(p.x, p.z, st.splash).forEach(function (o) { if (o !== cur) dmgEnemy(o, dmg * st.splashDmg, true); });
        if (j === st.jumps) break;
        var nx = nearestEnemy(p.x, p.z, st.radius, hit); if (!nx) break;
        dmg *= st.falloff; origin = a; cur = nx;
      }
    }
    t.punch = .6; play(def.fam === "phelto" ? "click" : "zap", .4, def.fam === "phelto" ? 1.6 : 1); return true;
  }

  // ---------- héros : entrées, visée, attaque, compétences ----------
  function moveVec() {
    var x = 0, z = 0;
    if (keys.KeyW || keys.KeyZ || keys.ArrowUp) z += 1;
    if (keys.KeyS || keys.ArrowDown) z -= 1;
    if (keys.KeyA || keys.KeyQ || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (joy.on) { x += joy.dx; z -= joy.dy; }
    var l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    return { x: x, z: z };
  }
  function mouseWorld() { return toWorld(mouse.x, mouse.y); }
  function skillRange(key, h) { var k = (h || G.hero).kit; if (key === "atk") return k.atkRange || 9; var a = k.skills[key].aim; return a.range || a.len || a.r || 5; }
  // retourne {a, d} : angle monde et distance visée (souris, glisser tactile, ou ciblage auto)
  function aimFor(key, touchAim, hh) {
    var h = hh || G.hero, range = skillRange(key, h);
    if (touchAim) { var wx = touchAim.dx / PPU, wz = -touchAim.dy / (PPU * SY); return { a: Math.atan2(wz, wx), d: Math.max(1, Math.min(range, touchAim.len / 100 * range)) }; }
    if (!touchUI && mouseIn) { var m = mouseWorld(); return { a: Math.atan2(m.z - h.z, m.x - h.x), d: Math.min(range, Math.hypot(m.x - h.x, m.z - h.z)) }; }
    var e = nearestEnemy(h.x, h.z, key === "atk" ? Math.max(range, 7) : 9);
    if (e) { var p = ep(e); return { a: Math.atan2(p.z - h.z, p.x - h.x), d: Math.min(range, Math.hypot(p.x - h.x, p.z - h.z)) }; }
    return { a: h.face, d: range * .6 };
  }
  function heroAttack(h, ov) {
    h = h || G.hero; if (!h || h.dead || h.atkCd > 0 || h.dash) return;
    var aim = ov || aimFor("atk", null, h); h.face = aim.a;
    CUR = h; h.atkCd = h.kit.attack(h, aim.a, aim.d) / (1 + (h.mod.asp || 0)); CUR = null; h.swing = Math.max(h.swing, .18);
    if (COOP && !ov && h === G.hero) COOP.onAction(h, "atk", aim);
  }
  function replAttack(h, a, d) { if (!h) return; h.face = a; CUR = h; h.atkCd = h.kit.attack(h, a, d); CUR = null; h.swing = Math.max(h.swing, .18); }
  // lance une compétence ; force = rejeu d'une action déjà validée par l'hôte (aucun contrôle de recharge)
  function doCast(h, key, aim, force) {
    if (!h || h.dead || (!force && (G.paused || (G.state !== "play" && G.state !== "prep")))) return false;
    if (!force && (h.cd[key] > 0 || h.dash)) { if (h.cd[key] > 0 && h === G.hero) play("error", .3); return false; }
    h.face = aim.a; CUR = h; var ok = h.kit.cast(key, h, aim.a, aim.d); CUR = null; if (ok === false) return false;
    h.cd[key] = h.kit.skills[key].cd * (1 - (h.mod.cdr || 0)) * (key === "s1" ? 1 - (h.mod.cdS1 || 0) : 1); h.swing = .3; return true;
  }
  function castWithAim(key, aim) { var h = G.hero; if (doCast(h, key, aim, false) && COOP) COOP.onAction(h, key, aim); }
  function castSkill(key) { if (G.hero) castWithAim(key, aimFor(key, null)); }
  function updateHero(h, dt) {
    if (!h) return;
    var local = h === G.hero, mirrorRemote = G.mirror && !local;
    ["s1", "s2", "ult"].forEach(function (k) { if (h.cd[k] > 0) h.cd[k] = Math.max(0, h.cd[k] - dt); });
    if (h.atkCd > 0) h.atkCd -= dt; if (h.swing > 0) h.swing -= dt;
    var mv = local ? moveVec() : (h.ctrl ? { x: h.ctrl.mx, z: h.ctrl.mz } : { x: 0, z: 0 }), l = Math.hypot(mv.x, mv.z);
    if (h.dead) { h.moving = false; h.kit.update(h, dt); return; }
    h.moving = mirrorRemote ? !!h.netMoving : l > .05;
    if (h.dash) { var d = h.dash; h.x = clampX(h.x + d.dx * d.speed * dt); h.z = clampZ(h.z + d.dz * d.speed * dt); d.t -= dt; if (d.tick) d.tick(h, dt); if (d.t <= 0) { if (d.end) d.end(h); h.dash = null; } }
    else if (!mirrorRemote) {
      if (h.slowT > 0) h.slowT -= dt; var sp = h.kit.speed * h.speedMul * (1 + (h.mod.spd || 0)) * (h.swing > 0 ? .7 : 1) * (h.slowT > 0 ? .6 : 1);
      if (h.moving) { h.x = clampX(h.x + mv.x * sp * dt); h.z = clampZ(h.z + mv.z * sp * dt); if (h.swing <= 0) h.face = Math.atan2(mv.z, mv.x); }
      if (h.lunge && h.lunge.t > 0) { var k = Math.min(dt, h.lunge.t) / .12; h.x = clampX(h.x + h.lunge.dx * k); h.z = clampZ(h.z + h.lunge.dz * k); h.lunge.t -= dt; }
    }
    if (local) { if ((keys.Space || attackHeld()) && G.state !== "select") heroAttack(h); }
    else if (!G.mirror && h.ctrl && h.ctrl.ah && (G.state === "play" || G.state === "prep")) heroAttack(h, { a: h.ctrl.a, d: h.ctrl.d || 6 });
    CUR = h; if ((h.moving || h.swing > 0) && h.kit.moveFx) h.kit.moveFx(h, dt);
    h.kit.update(h, dt); CUR = null;
  }
  function attackHeld() { for (var id in ptrs) if (ptrs[id].k === "atk" || ptrs[id].k === "matk") return true; return false; }

  // ---------- projectiles, acteurs, zones ----------
  function addProj(p) { var mul = (G.dmgMul || 1) * (1 + (CUR && CUR.mod ? CUR.mod.dmg || 0 : 0)); if (mul !== 1) { p.dmg *= mul; if (p.aoeDmg) p.aoeDmg *= mul; } p.owner = CUR; p.alive = true; p.hit = []; p.age = 0; G.projs.push(p); return p; }
  function aoeAt(x, z, r, dmg) { inRadius(x, z, r).forEach(function (e) { dmgEnemy(e, dmg, true); }); G.fx.push({ k: "ring", x: x, z: z, r: r, t: 0, dur: .3, col: "#c8a0ff" }); }
  function updateProjs(dt) {
    G.projs = G.projs.filter(function (p) {
      p.age += dt; if (p.acc) p.acc(p, dt);
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
      var dead = false;
      if (p.life > 0) {
        for (var i = 0; i < G.enemies.length; i++) {
          var e = G.enemies[i]; if (e.dead || p.hit.indexOf(e) >= 0) continue; var q = ep(e);
          if (Math.hypot(q.x - p.x, q.z - p.z) <= p.r + .55) { p.hit.push(e); dmgEnemy(e, p.dmg); if (p.onHit) { var pc2 = CUR; CUR = p.owner || null; p.onHit(e, p); CUR = pc2; } if (p.aoe) aoeAt(p.x, p.z, p.aoe, p.aoeDmg || 0); if (!p.pierce) { dead = true; break; } }
        }
      } else { if (p.aoe) aoeAt(p.x, p.z, p.aoe, p.aoeDmg || 0); dead = true; }
      if (dead) p.alive = false; return !dead;
    });
  }
  function projSprite(name, X, Y, ang, w) {
    var im = imgs[name]; if (!im || !im.naturalWidth) return false;
    var sc = w / im.naturalWidth, iw = im.naturalWidth * sc, ih = im.naturalHeight * sc;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); ctx.drawImage(im, -iw * .78, -ih / 2, iw, ih); ctx.restore(); return true;
  }
  function drawProj(p) {
    var X = sx(p.x), Y = sy(p.z) - 22;
    ctx.save();
    var ang = Math.atan2(-p.vz * SY, p.vx);
    if (p.kind === "note" && projSprite("fx_phelto_notes", X, Y, ang, 74)) { }
    else if (p.kind === "seed" && projSprite("fx_eglantyne_seed", X, Y, ang, 64)) { }
    else if (p.kind === "note") { ctx.shadowColor = p.col; ctx.shadowBlur = 12; ctx.fillStyle = p.col; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♪", X, Y + 8); }
    else if (p.kind === "seed") { ctx.shadowColor = p.col; ctx.shadowBlur = 10; ctx.fillStyle = "#9aff9a"; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = "rgba(110,255,140,.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - p.vx * .02 * PPU, Y + p.vz * .02 * PPU * SY); ctx.lineTo(X, Y); ctx.stroke(); }
    else { ctx.shadowColor = p.col; ctx.shadowBlur = 14; ctx.strokeStyle = p.col; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(X - p.vx * .035 * PPU, Y + p.vz * .035 * PPU * SY); ctx.lineTo(X, Y); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X, Y, 4, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  function addActor(a) { a.owner = CUR; a.t = a.t || 0; a.life = a.life || 1; G.actors.push(a); return a; }
  function updateActors(dt) {
    G.actors = G.actors.filter(function (a) { a.life -= dt; var pc = CUR; CUR = a.owner || null; if (a.update) a.update(dt); CUR = pc; return a.life > 0; });
    G.buffs = G.buffs.filter(function (b) { b.t -= dt; return b.t > 0; });
    G.pending = G.pending.filter(function (p) { p.t -= dt; if (p.t <= 0) { var pc = CUR; CUR = p.owner || null; p.f(); CUR = pc; return false; } return true; });
  }

  // ---------- boucle logique ----------
  function update(dt) {
    G.anim += dt; time += dt;
    if (G.trans > 0) G.trans -= dt; G.corr += (G.corrT - G.corr) * Math.min(1, dt * .55);
    if (ambient && ambient.playbackRate !== (G.seq === 2 ? .88 : 1)) ambient.playbackRate = G.seq === 2 ? .88 : 1;
    if (G.toastT > 0) G.toastT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
    if (G.flashHeart > 0) G.flashHeart -= dt;
    if (G.tintT > 0) G.tintT -= dt;
    if (G.xpFlash > 0) G.xpFlash -= dt; if (G.lvlFlash > 0) G.lvlFlash -= dt;
    for (var nk in UI.newT) if (UI.newT[nk] > 0) UI.newT[nk] -= dt;
    noticeUnlocks();
    if (G.paused || G.state === "select") return;
    var ps = G.parts, pj = 0; for (var pi = 0; pi < ps.length; pi++) { var pp = ps[pi]; pp.life -= dt; pp.vy += 260 * dt; pp.x += pp.vx * dt; pp.y += pp.vy * dt; if (pp.life > 0) ps[pj++] = pp; else PPOOL.push(pp); } ps.length = pj;
    G.bolts = G.bolts.filter(function (b) { b.life -= dt; if (!b.flick && b.life < .07) { b.flick = true; b.pts = jag(b.a, b.b, b.big ? 30 : 16); } return b.life > 0; });
    G.fx = G.fx.filter(function (f) { f.t = (f.t || 0) + dt; return f.t < f.dur; });
    G.towers.forEach(function (t) { if (t.punch > 0) t.punch = Math.max(0, t.punch - dt * 6); });
    if (G.state === "win" || G.state === "lose") return;
    G.heroes.forEach(function (h) { updateHero(h, dt); }); updateHeroVitals(dt); updateOrbs(dt); updateProjs(dt); updateEProjs(dt); updateActors(dt);
    if (G.state !== "play") return;
    G.t += dt;
    if (!G.mirror) {
      while (G.next < G.events.length && G.events[G.next].t <= G.t) spawn(G.events[G.next++]);
      var WL = G.seq === 2 ? WAVES2 : WAVES, w = 0; WL.forEach(function (_, i) { if (10 + 27 * i <= G.t) w = i + 1; });
      if (w !== G.wave) { G.wave = w; if (w) { toast(WL[w - 1][0], PINKL); play("wave", .7); if (G.seq === 2) G.corrT = Math.min(1, SEQ2.corr0 + (1 - SEQ2.corr0) * w / 10); } }
    }
    G.buffs.forEach(function (b) { if (b.follow) { b.x = b.follow.x; b.z = b.follow.z; } });
    G.towers.forEach(function (t) {
      var boost = 1;
      G.towers.forEach(function (u) { if (u !== t && u.st.aura > 0 && Math.hypot(u.s.x - t.s.x, u.s.z - t.s.z) <= 4.5) boost += u.st.aura; });
      G.buffs.forEach(function (b) { if (Math.hypot(b.x - t.s.x, b.z - t.s.z) <= b.r) boost += b.rate; });
      G.heroes.forEach(function (h) { if (!h.dead && h.mod.syn && Math.hypot(h.x - t.s.x, h.z - t.s.z) <= 5.5) boost += h.mod.syn; });
      t.boost = boost; t.cd -= dt * boost; if (t.cd <= 0) t.cd = fire(t) ? 1 / t.st.rate : .08;
    });
    updateSanctuaries(dt);
    updateTraps(dt);
    G.enemies.forEach(function (e) {
      if (e.dead) return;
      e.age += dt; if (e.born > 0) e.born -= dt; if (e.flash > 0) e.flash -= dt; if (e.spark > 0) e.spark -= dt; e.barT += dt;
      if (G.mirror) {   // invité : on ne fait qu'avancer les ennemis (prédiction) ; l'hôte corrige à chaque instantané
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
        if (e.stun > 0) e.stun -= dt; else { e.d = Math.min(LEN, e.d + e.def.speed * (e.spd || 1) * e.slowF * dt); var km = Math.exp(-2.5 * dt); e.ox *= km; e.oz *= km; }
        return;
      }
      enemyAttack(e, dt);
      if (e.poison) { e.poison.t -= dt; dmgEnemy(e, e.poison.dps * dt, true); if (e.poison && e.poison.t <= 0) e.poison = null; if (e.dead) return; }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
      if (e.stun > 0) e.stun -= dt; else { e.d += e.def.speed * (e.spd || 1) * e.slowF * dt; var k = Math.exp(-2.5 * dt); e.ox *= k; e.oz *= k; }
      if (e.age > 4 * LEN / e.def.speed + 12) { e.dead = true; return; }
      if (e.d >= LEN) { e.dead = true; hurtHeart(e.def.dmg); }
    });
    if (G.mirror) return;
    G.enemies = G.enemies.filter(function (e) { return !e.dead; });
    if (G.heart > 0 && G.next >= G.events.length && !G.enemies.length && !G.pending.length) { if (G.seq === 1) beginSeq2(); else endState("win"); }
  }
  // fin de la séquence 1 : pause, le monde s'éveille ; constructions / pièges / niveaux conservés, le Cœur n'est PAS soigné
  function beginSeq2() {
    if (G.mirror) return;
    G.seq = 2; G.state = "prep"; G.t = 0; G.wave = 0; G.events = buildEvents(2); G.next = 0; G.corrT = SEQ2.corr0; G.trans = 6.5; G.gold += SEQ2.bonus; G.build = false;
    G.heroes.forEach(function (h) { if (h.dead) revive(h, .6, false); G.fx.push({ k: "ring", x: h.x, z: h.z, r: 3, t: 0, dur: .8, col: "#d8b4ff" }); });
    G.tint = .45; G.tintT = 2.5; G.shake = Math.max(G.shake, .2); play("boss", .8, .7); toast("Séquence 1 terminée — le monde s'éveille", "#d8b4ff");
  }
  function hurtHeart(a) {
    if (G.mirror || G.state !== "play" || G.heart <= 0) return;
    G.heart = Math.max(0, G.heart - a); G.shake = .3; G.flashHeart = .35; play("heart_hit");
    burst(sx(L.heart.x), sy(L.heart.z) - 50, PINK, 14, 150, .6, 5);
    if (G.heart <= 0) endState("lose");
  }

  // ---------- API pour les kits ----------
  var API = {
    get ctx() { return ctx; }, PPU: PPU, SY: SY, sx: sx, sy: sy, clampX: clampX, clampZ: clampZ, time: function () { return time; },
    pos: function (e) { return ep(e); }, aimPt: aimPt, enemies: function () { return G.enemies.filter(function (e) { return !e.dead; }); },
    nearest: function (x, z, r, ex) { return nearestEnemy(x, z, r, ex); }, inRadius: inRadius,
    dmg: function (e, n) { dmgEnemy(e, n * (G.dmgMul || 1) * (1 + (CUR && CUR.mod ? CUR.mod.dmg || 0 : 0))); }, healHeroes: function (f) { G.heroes.forEach(function (h) { if (!h.dead) h.hp = Math.min(h.mhp, h.hp + h.mhp * f); }); }, stun: function (e, t) { e.stun = Math.max(e.stun, t); },
    wiltedTrap: wiltedTrapNear, reactivateTrap: reactivateTrap, sanc: function (x, z) { return sancAt(x, z).prot; },
    slow: function (e, f, t) { e.slowF = Math.min(e.slowF, f); e.slowT = Math.max(e.slowT, t); },
    poison: function (e, dps, t) { e.poison = { dps: Math.max(dps, e.poison ? e.poison.dps : 0), t: Math.max(t, e.poison ? e.poison.t : 0) }; },
    pull: function (e, dx, dz, k) { k = k == null ? 1 : k; e.ox += dx * k; e.oz += dz * k; }, push: function (e, dx, dz) { e.ox += dx; e.oz += dz; },
    addProj: addProj, addActor: addActor, burstW: function (x, z, col, n, spd, life, size) { burst(sx(x), sy(z) - 6, col, n, spd, life, size); }, after: function (t, f) { G.pending.push({ t: t, f: f, owner: CUR }); }, fx: function (f) { f.t = 0; G.fx.push(f); },
    bolt: bolt, tint: function (a, t) { G.tint = a; G.tintT = t; }, shake: function (s) { G.shake = Math.max(G.shake, s); }, play: play, toast: toast,
    healHeart: function (frac) { G.heart = Math.min(HEART_MAX, G.heart + HEART_MAX * frac); }, buff: function (b) { G.buffs.push(b); },
    spr: function (n, x, y, s, f, a) { spr(n, x, y, s, f, a); }, addSorted: function (z, fn) { G.sortedNow.push({ z: z, f: fn }); }
  };

  // ---------- pont vers le module coop (js/ashbound-coop.js) ----------
  function setHeroes(ids, mySlot, mirror) {
    resetCore(false);
    G.heroes = ids.map(function (id, i) { return newHero(id, i); }); G.hero = G.heroes[mySlot]; G.mirror = !!mirror; G.state = "prep";
    startAmbient(); if (touchUI) setFull(true);
  }
  var BRIDGE = {
    get G() { return G; }, ENEMY: ENEMY, TOWERS: TOWERS, WAVES: WAVES, HEART_MAX: HEART_MAX, PINKL: PINKL,
    slots: function () { return slots; }, LEN: function () { return LEN; }, newHero: newHero, tstats: tstats, play: play, toast: toast, burst: burst, sx: sx, sy: sy, ep: ep,
    moveVec: moveVec, applyPick: applyPick, recompute: recomputeMod, UPG: UPG, aimAtk: function () { return aimFor("atk", null); }, attackHeld: function () { return !!(keys.Space || attackHeld()); },
    doCast: doCast, replAttack: replAttack, pos: function (e) { return ep(e); }, tryBuild: tryBuild, tryUpgrade: tryUpgrade, trySell: trySell, trapBuild: function (d) { var q = pos(d); return tryTrapBuild({ d: d, x: q.x, z: q.z, dist: 0 }, true); }, trapUp: function (id, sp) { tryTrapUp(trapById(id), sp, true); }, trapSell: function (id) { tryTrapSell(trapById(id), true); }, trapReseed: function (id) { tryTrapReseed(trapById(id), true); }, trapFx: trapFx, trapStats: trapStats, TRAP: TRAP, startSeq: startSeq, setHeroes: setHeroes, resetCore: resetCore, muzzle: muzzle,
    mkEnemy: function (k, id) { var d = ENEMY[k]; return { id: id, mhp: d.hp, k: k, def: d, d: 0, hp: d.hp, lat: 0, flash: 0, age: 0, dead: false, ph: Math.random() * 4, ox: 0, oz: 0, stun: 0, slowF: 1, slowT: 0, poison: null, barT: 99 }; }
  };

  // ---------- actions joueur : construction ----------
  function slotAt(w) {
    var best = null, bd = touchUI ? 1.9 : 1.5;
    slots.forEach(function (s) { var d = Math.hypot(s.x - w.x, s.z - w.z); if (d <= bd) { bd = d; best = s; } });
    return best;
  }
  function famOf(h) { h = h || G.hero; return FAM[h ? h.id : "noctis"] || FAM.noctis; }
  function tierCfg(type) { return TIERCFG[TOWERS[type].T - 1]; }
  function unlockedT(type) { return G.lvl >= tierCfg(type).unlock; }
  function capOf(type) { return TOWERS[type].trap ? TRAP.cap[Math.min(MAXLVL, Math.max(1, G.lvl)) - 1] : tierCfg(type).cap[Math.min(MAXLVL, Math.max(1, G.lvl)) - 1]; }
  function countT(type) { if (TOWERS[type].trap) return G.traps.length; var n = 0; G.towers.forEach(function (t) { if (t.type === type) n++; }); return n; }
  function buildType() { var f = famOf(); return G.bt && f.indexOf(G.bt) >= 0 ? G.bt : f[0]; }
  function heroTowerType() { return buildType(); }
  function deny(remote, msg) { if (remote) { if (COOP) COOP.msg(msg); } else { play("error", .6); toast(msg, "#ff8a8a"); } }
  function tryBuild(s, type, remote) {
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "build", s: slots.indexOf(s), ty: type || buildType() }); G.build = false; return; }
    type = type || buildType(); var def = TOWERS[type]; if (!def) return;
    if (def.trap) { tryTrapBuild(nearestPath({ x: s.x, z: s.z }), remote); return; }
    if (s.tower) return;
    if (famOf(remote ? G.heroes[1] : G.hero).indexOf(type) < 0) { deny(remote, "Cette tourelle appartient à un autre héros"); return; }
    if (!unlockedT(type)) { deny(remote, def.name + " : débloquée au niveau " + tierCfg(type).unlock); return; }
    if (countT(type) >= capOf(type)) { deny(remote, "Limite atteinte : " + def.name + " " + countT(type) + "/" + capOf(type)); return; }
    if (G.gold < def.cost) { deny(remote, "Pas assez de cristaux (" + def.cost + " requis)"); return; }
    G.gold -= def.cost; var t = { s: s, tier: 0, cd: 0, punch: 0, type: type, st: tstats(def, 0), salvo: 0, boost: 1, spent: def.cost }; s.tower = t; G.towers.push(t);
    play("build", .9); burst(sx(s.x), sy(s.z), "#8c85bf", 16, 110, .7, 5); if (!remote) toast(def.name + " construite", "#9bffd0");
    if (!remote) { G.sel = t; G.build = false; }
  }
  function tryUpgrade(t, remote) {
    if (!t) return; var def = TOWERS[t.type]; if (t.tier >= def.ups.length) return;
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "up", s: slots.indexOf(t.s) }); return; }
    var u = def.ups[t.tier];
    if (G.lvl < UPREQ[t.tier]) { deny(remote, "Niveau " + UPREQ[t.tier] + " requis"); return; }
    if (G.gold < u.cost) { deny(remote, "Pas assez de cristaux"); return; }
    G.gold -= u.cost; t.spent = (t.spent || def.cost) + u.cost; t.tier++; t.st = tstats(def, t.tier); t.punch = 1; play("upgrade", .9);
    var m = muzzle(t); burst(m.x, m.y, def.col, 24, 160, .8, 5); if (!remote) toast(u.name + " !", def.col);
  }
  function trySell(t, remote) {
    if (!t) return;
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "sell", s: slots.indexOf(t.s) }); G.sel = null; return; }
    var back = Math.round((t.spent || TOWERS[t.type].cost) * SELL_RATE); G.gold += back;
    t.s.tower = null; G.towers = G.towers.filter(function (o) { return o !== t; }); if (G.sel === t) G.sel = null;
    play("click", .8); burst(sx(t.s.x), sy(t.s.z), "#ffd25e", 14, 110, .6, 4); if (!remote) toast("Vendue : +" + back + " cristaux", "#ffe680");
  }
  // ---------- pièges de ronce ----------
  function nearestPath(w) {
    var bi = 0, bd = 1e9; for (var i = 0; i < path.length; i++) { var d = Math.hypot(path[i][0] - w.x, path[i][1] - w.z); if (d < bd) { bd = d; bi = i; } }
    return { d: cum[bi], x: path[bi][0], z: path[bi][1], dist: bd };
  }
  function trapStats(t) {
    var st = {}, k; for (k in TRAP.base) st[k] = TRAP.base[k];
    [t.spec ? TRAP.specs[t.spec].m : null, t.tier >= 2 ? TRAP.evo.m : null].forEach(function (m) {
      if (!m) return; if (m.dmg) st.dmg *= m.dmg; if (m.rechx) st.rech *= m.rechx; ["r", "slowF", "slowT", "stun", "poison", "ch"].forEach(function (f) { if (m[f]) st[f] += m[f]; });
    });
    st.slowF = Math.max(.25, st.slowF); return st;
  }
  function trapNear(w, r) { var b = null, bd = r || 1.5; G.traps.forEach(function (t) { var d = Math.hypot(t.x - w.x, t.z - w.z); if (d <= bd) { bd = d; b = t; } }); return b; }
  function trapById(id) { for (var i = 0; i < G.traps.length; i++) if (G.traps[i].id === id) return G.traps[i]; return null; }
  function trapCheck(np, remote) {
    if (famOf(remote ? G.heroes[1] : G.hero).indexOf("ronce") < 0) return "Ce piège appartient à Églantyne";
    if (np.dist > 2.1) return "Place le piège sur le chemin des ennemis";
    if (np.d < 4 || np.d > LEN - 3.5) return "Trop près de l'entrée ou du Cœur";
    if (G.traps.some(function (t) { return Math.abs(t.d - np.d) < TRAP.space; })) return "Trop près d'un autre piège";
    if (G.traps.length >= capOf("ronce")) return "Limite atteinte : pièges " + G.traps.length + "/" + capOf("ronce");
    if (G.gold < TRAP.cost) return "Pas assez de cristaux (" + TRAP.cost + " requis)";
    return null;
  }
  function tryTrapBuild(np, remote) {
    var why = trapCheck(np, remote); if (why) { deny(remote, why); return false; }
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "trap", d: Math.round(np.d * 10) / 10 }); G.build = false; G.pvT = null; return true; }
    var q = pos(np.d); G.gold -= TRAP.cost;
    var t = { id: ++TRID, d: np.d, x: q.x, z: q.z, spec: null, tier: 0, cd: 0, ch: TRAP.base.ch, wilted: false, pop: 1, n: 0, spent: TRAP.cost }; G.traps.push(t);
    play("build", .8); burst(sx(t.x), sy(t.z), "#6fe08a", 14, 110, .6, 4);
    if (!remote) { toast("Piège de ronce posé", "#9bffd0"); G.selT = t; G.sel = null; G.build = false; G.pvT = null; }
    return true;
  }
  function tryTrapUp(t, spec, remote) {
    if (!t) return;
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "tup", id: t.id, sp: spec || "" }); return; }
    if (!t.spec) {
      if (!TRAP.specs[spec]) return; if (G.lvl < TRAP.specLvl) { deny(remote, "Niveau " + TRAP.specLvl + " requis"); return; }
      if (G.gold < TRAP.specCost) { deny(remote, "Pas assez de cristaux"); return; }
      G.gold -= TRAP.specCost; t.spent += TRAP.specCost; t.spec = spec; t.tier = 1;
    } else if (t.tier < 2) {
      if (G.lvl < TRAP.evoLvl) { deny(remote, "Niveau " + TRAP.evoLvl + " requis"); return; }
      if (G.gold < TRAP.evoCost) { deny(remote, "Pas assez de cristaux"); return; }
      G.gold -= TRAP.evoCost; t.spent += TRAP.evoCost; t.tier = 2;
    } else return;
    t.wilted = false; t.ch = trapStats(t).ch; t.cd = 0; t.pop = 1; play("upgrade", .9); burst(sx(t.x), sy(t.z) - 10, t.spec ? TRAP.specs[t.spec].col : "#b6f04a", 22, 150, .8, 5);
    if (!remote) toast((t.tier === 2 ? TRAP.evo.name : TRAP.specs[t.spec].name) + " !", t.spec ? TRAP.specs[t.spec].col : "#b6f04a");
  }
  function tryTrapSell(t, remote) {
    if (!t) return;
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "tsell", id: t.id }); G.selT = null; return; }
    var back = Math.round(t.spent * SELL_RATE); G.gold += back; G.traps = G.traps.filter(function (o) { return o !== t; }); if (G.selT === t) G.selT = null;
    play("click", .8); burst(sx(t.x), sy(t.z), "#ffd25e", 12, 100, .6, 4); if (!remote) toast("Vendu : +" + back + " cristaux", "#ffe680");
  }
  // réactivation d'un piège desséché : sacrifice d'une poupée d'Églantyne (crochet utilisé par son kit) ou replantage payant
  function reactivateTrap(t, how) {
    if (!t || G.mirror) return; t.wilted = false; t.ch = trapStats(t).ch; t.cd = 0; t.pop = 1; t.claim = 0;
    G.fx.push({ k: "ring", x: t.x, z: t.z, r: 2, t: 0, dur: .6, col: "#9bffd0" }); burst(sx(t.x), sy(t.z) - 8, "#9bffd0", 16, 120, .7, 4); play("upgrade", .6);
    toast(how === "doll" ? "Poupée sacrifiée : piège réactivé" : how === "sanct" ? "Le Sanctuaire ranime un piège" : "Piège replanté", "#9bffd0");
  }
  function tryTrapReseed(t, remote) {
    if (!t || !t.wilted) return;
    if (G.mirror && !remote) { if (COOP) COOP.req({ k: "tres", id: t.id }); return; }
    var c = Math.round(TRAP.cost * .6); if (G.gold < c) { deny(remote, "Pas assez de cristaux"); return; } G.gold -= c; reactivateTrap(t, "gold");
  }
  function wiltedTrapNear(x, z, r) { var b = null; G.traps.forEach(function (t) { if (t.wilted && !(t.claim > time) && Math.hypot(t.x - x, t.z - z) <= r) b = b || t; }); if (b) b.claim = time + 3; return b; }
  function trapFx(t, st) {
    var col = t.spec ? TRAP.specs[t.spec].col : "#b6f04a";
    G.fx.push({ k: "ring", x: t.x, z: t.z, r: st.r, t: 0, dur: .45, col: col }); burst(sx(t.x), sy(t.z) - 10, col, 14, 150, .6, 4); play("hit", .5, t.spec === "constrictor" ? .8 : 1.35);
  }
  function fireTrap(t) {
    var st = trapStats(t); t.cd = st.rech; t.pop = 1; t.n = (t.n + 1) & 255; t.ch--;
    inRadius(t.x, t.z, st.r).forEach(function (e) {
      dmgEnemy(e, st.dmg * (G.dmgMul || 1), true); if (e.dead) return;
      e.slowF = Math.min(e.slowF, st.slowF); e.slowT = Math.max(e.slowT, st.slowT);
      if (st.stun) e.stun = Math.max(e.stun, st.stun * (e.def.kind === "boss" ? .3 : e.def.kind === "mini" ? .5 : 1));
      if (st.poison) e.poison = { dps: Math.max(st.poison * (G.dmgMul || 1), e.poison ? e.poison.dps : 0), t: 4 };
    });
    trapFx(t, st);
    if (t.ch <= 0) { t.wilted = true; floatText(t.x, t.z, "Desséché", "#d8c8a0"); }
  }
  // ---------- Arbre Monde : Sanctuaire verdoyant (seule source de soin de zone ; le Cœur n'est JAMAIS soigné automatiquement) ----------
  function sancAt(x, z) {
    var r = { heal: 0, prot: 0, trap: 0, any: false };
    G.towers.forEach(function (t) { if (t.st.sr > 0 && Math.hypot(t.s.x - x, t.s.z - z) <= t.st.sr) { r.any = true; r.heal = Math.max(r.heal, t.st.heal); r.prot = Math.max(r.prot, t.st.prot); r.trap = Math.max(r.trap, .3 + t.st.heal * 12); } });
    return r;
  }
  function updateSanctuaries(dt) {
    if (G.mirror) return;
    G.towers.forEach(function (t) {
      if (!(t.st.sr > 0)) return; t.hfx = (t.hfx || 0) - dt;
      G.heroes.forEach(function (h) {
        if (h.dead || Math.hypot(t.s.x - h.x, t.s.z - h.z) > t.st.sr) return;
        if (h.hp < h.mhp) { h.hp = Math.min(h.mhp, h.hp + h.mhp * t.st.heal * dt); if (t.hfx <= 0) { burst(sx(h.x), sy(h.z) - 36, "#8dffa8", 3, 50, .7, 3); t.hfx = .9; } }
      });
    });
  }
  function updateTraps(dt) {
    G.traps.forEach(function (t) {
      if (t.pop > 0) t.pop = Math.max(0, t.pop - dt * 1.8);
      if (G.mirror || G.state !== "play") return;
      var sa = G.towers.length ? sancAt(t.x, t.z) : null;   // le Sanctuaire renforce les pièges : recharge plus rapide, pièges desséchés ranimés peu à peu
      if (t.cd > 0) { t.cd -= dt * (1 + (sa ? sa.trap : 0)); return; }
      if (t.wilted) { if (sa && sa.any) { t.wiltT = (t.wiltT || 0) + dt; if (t.wiltT > 12) { t.wiltT = 0; reactivateTrap(t, "sanct"); } } return; }
      for (var i = 0; i < G.enemies.length; i++) { var e = G.enemies[i]; if (e.dead) continue; var q = ep(e); if (Math.hypot(q.x - t.x, q.z - t.z) < 1.3) { fireTrap(t); break; } }
    });
  }
  function drawTrap(t) {
    var x = sx(t.x), y = sy(t.z), spec = t.spec ? TRAP.specs[t.spec] : null, col = spec ? spec.col : "#b6f04a", wil = t.wilted, rech = t.cd > 0 && !wil, pop = t.pop;
    var h = wil ? 6 : rech ? 7 : 12 + Math.sin(time * 3 + t.id) * 1.5; h += 34 * pop * pop;
    ctx.save();
    ctx.fillStyle = wil ? "rgba(80,60,36,.5)" : "rgba(14,34,20,.6)"; ctx.beginPath(); ctx.ellipse(x, y, 25, 25 * SY, 0, 0, 6.283); ctx.fill();
    if (!wil) { ctx.strokeStyle = rech ? "rgba(255,255,255,.14)" : col; ctx.globalAlpha = rech ? 1 : .55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
    var n = t.tier >= 2 ? 11 : 8;
    for (var i = 0; i < n; i++) {
      var a = i * 2.4 + t.id * 1.3, rr = 5 + (i % 3) * 6, bx = x + Math.cos(a) * rr, by = y + Math.sin(a) * rr * SY, hh = h * (.65 + .5 * (((i * 37) % 10) / 10)), tl = Math.cos(a) * 7;
      ctx.fillStyle = wil ? "#6a5638" : "#2c5a34"; ctx.beginPath(); ctx.moveTo(bx - 2.5, by); ctx.quadraticCurveTo(bx + tl * .4, by - hh * .55, bx + tl, by - hh); ctx.quadraticCurveTo(bx + tl * .4 + 2, by - hh * .5, bx + 2.5, by); ctx.fill();
      ctx.fillStyle = wil ? "#a08a5c" : col; ctx.beginPath(); ctx.moveTo(bx + tl - 2, by - hh + 3); ctx.lineTo(bx + tl, by - hh - 5); ctx.lineTo(bx + tl + 2, by - hh + 3); ctx.fill();
      if (t.tier >= 1 && i % 3 === 0 && !wil) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + tl * .5, by - hh * .5, 2.2, 0, 6.283); ctx.fill(); }
    }
    if (pop > .05 && t.spec === "solar") { ctx.globalAlpha = pop; ctx.fillStyle = "#fff3a0"; for (var k = 0; k < 8; k++) { var aa = k * .785; ctx.beginPath(); ctx.ellipse(x + Math.cos(aa) * 14, y - 24 + Math.sin(aa) * 8, 6, 3, aa, 0, 6.283); ctx.fill(); } ctx.fillStyle = "#ffb030"; ctx.beginPath(); ctx.arc(x, y - 24, 5, 0, 6.283); ctx.fill(); }
    if (pop > .05 && t.spec === "spore") { ctx.globalAlpha = pop * .7; ctx.fillStyle = "#c48bff"; for (var m = 0; m < 6; m++) { ctx.beginPath(); ctx.arc(x + Math.cos(m * 1.05 + time) * 18 * (1.2 - pop), y - 20 - pop * 14 + Math.sin(m * 2 + time * 3) * 4, 4 * pop + 1, 0, 6.283); ctx.fill(); } }
    ctx.restore();
  }
  // annonce légère des tourelles débloquées / capacités gagnées (tous les clients, selon le niveau d'équipe)
  function noticeUnlocks() {
    if (!G.hero) return; if (UI.seenLvl == null || G.lvl < UI.seenLvl) { UI.seenLvl = G.lvl; return; }
    while (UI.seenLvl < G.lvl) {
      var L = ++UI.seenLvl, msg = null, col = "#ffe680";
      famOf().forEach(function (id) { var d = TOWERS[id], c = tierCfg(id); if (c.unlock === L) { msg = "Tourelle débloquée : " + d.name; col = d.col; UI.newT[id] = 6; } else if (L > c.unlock && c.cap[L - 1] > c.cap[L - 2] && !msg) msg = "Capacité de " + d.name + " : " + c.cap[L - 1]; });
      if (msg) { toast("NIVEAU " + L + " — " + msg, col); play("upgrade", .9); }
    }
  }
  function toggleBuild() { if (G.state === "play" || G.state === "prep") { G.build = !G.build; G.pv = null; G.pvT = null; if (G.build) { G.sel = null; G.selT = null; } } }
  function cancel() { if (G.build) { G.build = false; G.pv = null; G.pvT = null; return true; } if (G.sel || G.selT) { G.sel = null; G.selT = null; return true; } return false; }
  function togglePause() { if (G.state === "play" || G.state === "prep") { if (COOP && COOP.active()) G.menu = !G.menu; else G.paused = !G.paused; ptrs = {}; joy.on = false; aimSt = null; } }
  function worldClick(px, py) {
    if (G.paused || G.menu || (G.state !== "play" && G.state !== "prep")) return false;
    var w = toWorld(px, py), s = slotAt(w), trapMode = G.build && TOWERS[buildType()].trap, tt = trapNear(w, 1.5);
    if (trapMode) {
      if (tt) { G.selT = tt; G.sel = null; G.build = false; G.pvT = null; return true; }
      var np = nearestPath(w);
      if (touchUI && !(G.pvT && Math.abs(G.pvT.d - np.d) < 1.2)) { G.pvT = np; play("click", .4); return true; }   // 1er toucher : aperçu ; 2e : poser
      G.pvT = null; tryTrapBuild(np, false); return true;
    }
    if (!G.build && tt) { G.selT = tt; G.sel = null; return true; }
    if (G.build) {
      if (!s) { G.pv = null; return true; }
      if (s.tower) { G.sel = s.tower; G.build = false; G.pv = null; return true; }
      if (touchUI && G.pv !== s) { G.pv = s; play("click", .4); return true; }   // 1er toucher : aperçu de la portée ; 2e toucher : construire
      G.pv = null; tryBuild(s); return true;
    }
    if (s && s.tower) { G.sel = s.tower; G.selT = null; return true; }
    if (G.sel || G.selT) { G.sel = null; G.selT = null; return true; }
    return false;
  }
  function pickHero(id) {
    if (!KITS[id]) { play("error", .5); return; }
    if (COOP && COOP.active()) { COOP.pick(id); play("click", .6); startAmbient(); return; }
    G.hero = newHero(id, 0); G.heroes = [G.hero]; G.state = "prep"; play("click", .6); startAmbient();
    if (touchUI) setFull(true);
  }

  // ---------- rendu : primitives ----------
  function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function panel(x, y, w, h) { rr(x, y, w, h, 10, "rgba(14,12,24,.82)", "rgba(255,255,255,.08)", 2); }
  function text(s, x, y, size, col, al, bold) {
    ctx.font = (bold === false ? "" : "bold ") + size + "px Nunito, system-ui, sans-serif"; ctx.textAlign = al || "left"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(8,4,18,.85)"; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); ctx.fillStyle = col || "#f2ecf6"; ctx.fillText(s, x, y);
  }
  function button(x, y, w, h, label, f, hot, col, fs, dis) {
    var h2 = !dis && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    rr(x, y, w, h, 10, dis ? "#1b1826" : hot ? "#6a1f4a" : h2 ? "#4a2a60" : "#2a1f3e", dis ? "#34304a" : h2 ? PINKL : "#7a5aa8", 2);
    if (label) text(label, x + w / 2, y + h / 2 + 1, fs || 22, dis ? "#6c6688" : col || "#fff", "center");
    buttons.push({ x: x, y: y, w: w, h: h, f: f });
  }
  function spr(name, x, y, scale, flip, alpha) {
    var im = imgs[name]; if (!im || !im.naturalWidth) return;
    var w = im.naturalWidth * scale, h = im.naturalHeight * scale;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
  function shadow(x, y, sz) { var im = imgs.fx_shadow; if (im && im.naturalWidth) { var w = sz * PPU, h = w * .5 * SY * 1.15; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); } }
  function ring(x, y, r, col, fillA) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * PPU, r * PPU * SY, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = fillA == null ? .08 : fillA; ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function slotMark(s, col, lw) {   // losange « + » comme sur le sol
    var x = sx(s.x), y = sy(s.z), rx = 1.15 * PPU, ry = rx * SY; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw || 3; ctx.beginPath();
    ctx.moveTo(x, y - ry); ctx.lineTo(x + rx, y); ctx.lineTo(x, y + ry); ctx.lineTo(x - rx, y); ctx.closePath(); ctx.stroke();
    if (lw) { ctx.fillStyle = col; ctx.globalAlpha = .12; ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); }
    ctx.restore();
  }
  function frameOf(e, f) { return (Math.floor(G.anim * f + (e.ph || 0)) & 1); }

  // effets partagés (kits + moteur)
  function drawFx(f) {
    var p = f.t / f.dur, a = 1 - p;
    if (f.k === "slash") {
      ctx.save(); ctx.translate(sx(f.x), sy(f.z) - 26); ctx.scale(1, SY); ctx.globalAlpha = a;
      var r = f.rng * PPU * (.75 + .25 * Math.min(1, p * 3)), a0 = -f.a - f.arc / 2, a1 = -f.a + f.arc / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fillStyle = "rgba(90,220,255,.16)"; ctx.fill();
      ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.strokeStyle = "rgba(60,190,255,.6)"; ctx.lineWidth = f.big ? 16 : 11; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r - 2, a0, a1); ctx.strokeStyle = "#f2ffff"; ctx.lineWidth = f.big ? 6 : 4; ctx.stroke(); ctx.restore();
    } else if (f.k === "splat") {
      var X = sx(f.x), Y = sy(f.z); ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.6) * .55; ctx.fillStyle = f.col; ctx.beginPath(); ctx.ellipse(X, Y, 16 + (f.sd % 5), 7 + (f.sd % 3), 0, 0, 6.283); ctx.fill();
      for (var qd = 0; qd < 5; qd++) { ctx.beginPath(); ctx.arc(X + Math.cos(f.sd + qd * 1.3) * 20, Y + Math.sin(f.sd + qd * 1.3) * 8, 2.5, 0, 6.283); ctx.fill(); } ctx.restore();
    } else if (f.k === "ring") {
      ctx.save(); ctx.globalAlpha = a * .9; ctx.strokeStyle = f.col; ctx.lineWidth = 5 * a + 1; var s = Math.min(1, p * 2.2 + .1);
      ctx.beginPath(); ctx.ellipse(sx(f.x), sy(f.z), f.r * PPU * s, f.r * PPU * SY * s, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = a * .25; ctx.fillStyle = f.flash ? "#ffffff" : f.col; ctx.fill(); ctx.restore();
    } else if (f.k === "pull") {
      var dx = Math.cos(f.a), dz = Math.sin(f.a); ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
      for (var i = 0; i < 6; i++) {
        var al = (i + 1) * f.len / 6 * Math.min(1, p * 3 + .3);
        [-1, 1].forEach(function (sd) {
          var x0 = f.x + dx * al + (-dz) * f.hw * sd * (1 - p * .8), z0 = f.z + dz * al + dx * f.hw * sd * (1 - p * .8), x1 = f.x + dx * al, z1 = f.z + dz * al;
          ctx.strokeStyle = "rgba(120,230,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx(x0), sy(z0) - 20); ctx.lineTo(sx(x1), sy(z1) - 20); ctx.stroke();
        });
      }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.z) - 20); ctx.lineTo(sx(f.x + dx * f.len), sy(f.z + dz * f.len) - 20); ctx.stroke(); ctx.restore();
    } else if (f.k === "anchor") {
      var x = sx(f.x), y = sy(f.z); ctx.save(); ctx.globalAlpha = Math.min(1, a * 3);
      ctx.strokeStyle = "rgba(60,200,255,.5)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.strokeStyle = "#e9ffff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.fillStyle = "#ffd25e"; ctx.fillRect(x - 12, y - 40, 24, 5); ctx.restore();
    } else if (f.k === "pulse") {
      ctx.save(); ctx.globalAlpha = a; f.pts.forEach(function (n, i) { if (i % 2) return; ctx.strokeStyle = "#e0c8ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx(n.x), sy(n.z), 1.4 * PPU * (.4 + p), 1.4 * PPU * SY * (.4 + p), 0, 0, 6.283); ctx.stroke(); }); ctx.restore();
    } else if (f.k === "star8") {
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#7aff9a"; ctx.lineWidth = 4; for (var i2 = 0; i2 < 8; i2++) { var an = i2 * .785; ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.z) - 6); ctx.lineTo(sx(f.x + Math.cos(an) * 3.4 * Math.min(1, p * 3)), sy(f.z + Math.sin(an) * 3.4 * Math.min(1, p * 3)) - 6); ctx.stroke(); } ctx.restore();
    } else if (f.k === "beams") {
      ctx.save(); ctx.globalAlpha = a; for (var i3 = 0; i3 < 9; i3++) { var bx = sx(f.x) + (i3 - 4) * 70 + Math.sin(i3 * 7) * 20; var g = ctx.createLinearGradient(bx, 0, bx, H); g.addColorStop(0, "rgba(255,243,160,0)"); g.addColorStop(.5, "rgba(255,243,160,.7)"); g.addColorStop(1, "rgba(255,243,160,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 10, 0, 20, H); } ctx.restore();
    }
  }

  function drawHero(h) {
    var x = sx(h.x), y = sy(h.z), k = h.kit, fr = h.moving ? (Math.floor(G.anim * 9) & 1) : (Math.floor(G.anim * 2) & 1);
    shadow(x, y, 1.9);
    var col = HCOL[h.id] || PINKL;
    if (h.dead) {   // à terre : sprite couché, anneau de ranimation
      ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); ctx.globalAlpha = .6; ctx.filter = "grayscale(.85) brightness(.8)"; spr(k.spr.idle[0], 0, 0, k.scale, false); ctx.restore();
      ctx.save(); ctx.strokeStyle = "rgba(155,255,208,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 22, 20, 0, 6.283); ctx.stroke();
      if (h.rv > 0) { ctx.strokeStyle = "#9bffd0"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - 22, 20, -Math.PI / 2, -Math.PI / 2 + 6.283 * h.rv); ctx.stroke(); }
      ctx.restore(); text("+", x, y - 22, 22, "#9bffd0", "center"); text(G.heroes.length > 1 ? "RANIMER" : "KO", x, y - 50, 12, "#9bffd0", "center");
      return;
    }
    ctx.save(); ctx.globalAlpha = .6; ctx.strokeStyle = PINKL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 20, 20 * SY, 0, 0, 6.283); ctx.stroke(); ctx.restore();
    var pose = h.swing > 0 ? (k.swingPose ? k.swingPose(h) : (h.swing > .18 ? "cast" : "atk")) : null;
    var name = pose ? k.spr[pose] : (h.moving ? k.spr.move[fr] : k.spr.idle[fr]);
    var bob = h.moving ? Math.abs(Math.sin(G.anim * 14)) * -2 : Math.sin(G.anim * 3) * -1;
    ctx.save(); if (h.dash) ctx.globalAlpha = .75; if (h.hflash > 0) ctx.filter = "brightness(2.2) saturate(.35)"; else if (h.inv > 1) ctx.globalAlpha = .55 + .3 * Math.sin(G.anim * 30);
    spr(name, x, y + bob, k.scale, Math.cos(h.face) < -.1); ctx.restore();
    // plaque : nom + barre de vie + fine barre de ressource
    var top = y - sh(k.spr.idle[0]) * k.scale - 24, w = 78, r = Math.max(0, h.hp / h.mhp);
    rr(x - w / 2, top - 12, w, 30, 5, "rgba(10,8,20,.88)", "rgba(255,255,255,.12)", 1);
    text(k.short || k.name, x, top - 4, 12, col, "center");
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(x - w / 2 + 5, top + 4, w - 10, 5); ctx.fillStyle = r > .6 ? "#59e07a" : r > .3 ? "#f2c038" : "#ec3b4a"; ctx.fillRect(x - w / 2 + 5, top + 4, (w - 10) * r, 5);
    var m = k.meter ? k.meter(h) : null, mv = m ? Math.min(1, m.v) : 1;
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x - w / 2 + 5, top + 11, w - 10, 2); ctx.fillStyle = col; ctx.fillRect(x - w / 2 + 5, top + 11, (w - 10) * mv, 2);
  }
  function drawEProj(p) {
    var X = sx(p.x), Y = sy(p.z) - 20; ctx.save(); ctx.shadowColor = p.slow ? "#5ad0ff" : "#ff7a3a"; ctx.shadowBlur = Q < .6 ? 0 : 14;
    ctx.strokeStyle = p.slow ? "rgba(90,200,255,.5)" : "rgba(255,120,60,.5)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(X - p.vx * .06 * PPU, Y + p.vz * .06 * PPU * SY); ctx.lineTo(X, Y); ctx.stroke();
    ctx.fillStyle = p.slow ? "#c8f4ff" : "#ffd08a"; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = p.slow ? "#3aa8f0" : "#ff6a2a"; ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 6.283); ctx.fill(); ctx.restore();
  }

  function drawIndicator(h, key, aim) {
    var t = h.kit.skills[key].aim, x = sx(h.x), y = sy(h.z);
    ctx.save(); ctx.fillStyle = "rgba(255,90,190,.22)"; ctx.strokeStyle = "rgba(255,160,220,.9)"; ctx.lineWidth = 2;
    if (t.type === "dir") {
      var len = t.len * PPU, w = (t.w || 1.2) * PPU * .5; ctx.translate(x, y); ctx.scale(1, SY); ctx.rotate(-aim.a); ctx.beginPath(); ctx.rect(0, -w, len, w * 2); ctx.fill(); ctx.stroke();
    } else if (t.type === "cone") {
      ctx.translate(x, y); ctx.scale(1, SY); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.len * PPU, -aim.a - t.arc * Math.PI / 360, -aim.a + t.arc * Math.PI / 360); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.type === "point") {
      ring(x, y, t.range, "rgba(255,160,220,.7)", .03);
      var px = clampX(h.x + Math.cos(aim.a) * aim.d), pz = clampZ(h.z + Math.sin(aim.a) * aim.d); ctx.beginPath(); ctx.ellipse(sx(px), sy(pz), t.r * PPU, t.r * PPU * SY, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    } else { ctx.beginPath(); ctx.ellipse(x, y, t.r * PPU, t.r * PPU * SY, 0, 0, 6.283); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- rendu : scène ----------
  function draw() {
    buttons.length = 0; ctl.length = 0;
    ctx.setTransform(RS, 0, 0, RS, SL * RS, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0c0814"; ctx.fillRect(-SL, 0, CW, H);
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - .5) * 10 * G.shake / .3, (Math.random() - .5) * 8 * G.shake / .3);
    ctx.translate(VX, VY); ctx.scale(CAM.zm, CAM.zm); ctx.translate(-CAM.x, -CAM.y);
    // sol : seule la partie visible est dessinée (image source non écrasée verticalement)
    var gx0 = Math.max(0, Math.floor(VW.x0)), gx1 = Math.min(MAPW, Math.ceil(VW.x1)), gy0 = Math.max(0, Math.floor(VW.y0)), gy1 = Math.min(MAPH, Math.ceil(VW.y1));
    if (gx1 > gx0 && gy1 > gy0) ctx.drawImage(imgs.ground, gx0, gy0 / SY, gx1 - gx0, (gy1 - gy0) / SY, gx0, gy0, gx1 - gx0, gy1 - gy0);

    var cr = G.corr;
    if (cr > .01) {   // teinte progressive du sol (multiplication) + halos lumineux des champignons / cristaux
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgba(120,96,200," + (.62 * cr).toFixed(3) + ")"; ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      W2.forEach(function (o, i) {
        var al = Math.max(0, Math.min(1, (cr * 1.15 * W2.length - i) / 8)); if (al <= 0) return; var X = sx(o.x), Y = sy(o.z); if (!inView(X, Y, 70, 90)) return;
        ctx.globalAlpha = al * (.55 + .25 * Math.sin(time * 2 + o.ph)); var sz = (o.k === "gcrystal" ? 110 : 80) * o.sc; ctx.drawImage(glowCanvas(o.col), X - sz / 2, Y - sz * (o.k === "gcrystal" ? .78 : .62), sz, sz);
      });
      ctx.restore();
    }
    var sel = G.sel, hv = touchUI && G.build ? G.pv : hover, hero = G.hero, tdef = TOWERS[heroTowerType()];
    var bokT = G.build && unlockedT(buildType()) && countT(buildType()) < capOf(buildType()) && G.gold >= tdef.cost;
    var trapB = G.build && TOWERS[buildType()].trap;
    if (trapB) {
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(182,240,74,.3)"; ctx.lineWidth = TRAP_W; ctx.beginPath(); path.forEach(function (q, i) { var X = sx(q[0]), Y = sy(q[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); ctx.restore();
      var hp0 = touchUI ? G.pvT : (mouseIn ? nearestPath(toWorld(mouse.x, mouse.y)) : null);
      if (hp0) { var okp = !trapCheck(hp0, false); ring(sx(hp0.x), sy(hp0.z), TRAP.base.r, okp ? "#9bffd0" : "#ff6a72", .1); text(okp ? (touchUI ? "Touche encore pour poser" : "Clic : poser le piège") : trapCheck(hp0, false), sx(hp0.x), sy(hp0.z) - 36, 14, okp ? "#9bffd0" : "#ffb0b0", "center"); }
    }
    if (G.build && !trapB) slots.forEach(function (s) {
      var X = sx(s.x), Y = sy(s.z); if (!inView(X, Y, 60)) return;
      if (!s.tower) { slotMark(s, s === hv ? (bokT ? "#8dffb0" : "#ff6a72") : "rgba(255,160,220," + (.55 + .25 * Math.sin(time * 4 + s.x)) + ")", s === hv ? 3.5 : 3); }
      else { ctx.fillStyle = "rgba(141,255,176,.7)"; ctx.beginPath(); ctx.arc(X, Y + 2, 4, 0, 6.283); ctx.fill(); }   // emplacement occupé : point vert
    });
    else if (hv && hv.tower) slotMark(hv, "#8dffb0");
    if (G.build && hv && !hv.tower && !TOWERS[buildType()].trap) ring(sx(hv.x), sy(hv.z), tstats(tdef, 0).range, bokT ? "#ffa0dc" : "#ff5a64");
    if (sel) ring(sx(sel.s.x), sy(sel.s.z), sel.st.range, "#ffe680");
    if (G.selT) ring(sx(G.selT.x), sy(G.selT.z), trapStats(G.selT).r, "#ffe680");
    G.buffs.forEach(function (b) { if (!b.follow) ring(sx(b.x), sy(b.z), b.r, "#ffc878", .04); });
    G.towers.forEach(function (t) {
      if (!(t.st.sr > 0)) return; var X = sx(t.s.x), Y = sy(t.s.z); if (!inView(X, Y, t.st.sr * PPU + 20, t.st.sr * PPU * SY + 40)) return;
      ring(X, Y, t.st.sr, "rgba(141,255,168," + (.35 + .15 * Math.sin(time * 2)).toFixed(2) + ")", .05);
      if (Q >= .7) { ctx.fillStyle = "rgba(190,255,200,.7)"; for (var mi = 0; mi < 6; mi++) { var ma = mi * 1.047 + time * .4, mr = t.st.sr * PPU * (.3 + .6 * ((mi * .37 + time * .15) % 1)); ctx.fillRect(X + Math.cos(ma) * mr, Y + Math.sin(ma) * mr * SY - ((time * 14 + mi * 9) % 22), 3, 3); } }
    });
    G.fx.forEach(function (f) { if (f.k === "splat") drawFx(f); });
    G.actors.forEach(function (a) { if (a.ground && a.draw) a.draw(); });
    if (aimSt && aimSt.key && hero) drawIndicator(hero, aimSt.key, aimSt.aim);

    G.sortedNow.length = 0;
    var items = [];
    if (cr > .01) W2.forEach(function (o, i) {
      var al = Math.max(0, Math.min(1, (cr * 1.15 * W2.length - i) / 8)); if (al <= 0) return; var X = sx(o.x), Y = sy(o.z); if (!inView(X, Y, 70, 120)) return;
      items.push({ z: o.z, f: function () { shadow(X, Y, .9 * o.sc); spr(o.k === "mush" ? "mushroom" : "crystal", X, Y, o.sc * (o.k === "mush" ? 1 : .8), (i & 1) === 1, al); } });
    });
    G.traps.forEach(function (t) { var X = sx(t.x), Y = sy(t.z); if (inView(X, Y, 70, 110)) items.push({ z: t.z + .4, f: function () { drawTrap(t); } }); });
    decor.forEach(function (d) {
      var n = d.kind; if (!inView(sx(d.x), sy(d.z), 70, 150)) return; if (n === "sparkle") { if (Q < .6) return; items.push({ z: d.z + 3, f: function () { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .5 + .4 * Math.sin(time * 2 + d.x * 3); spr("sparkle", sx(d.x), sy(d.z) + 6, 1); ctx.restore(); } }); return; }
      var big = n === "gate" || n === "fern" || n === "bones" ? 0 : n.indexOf("pine") === 0 ? .9 : n === "ruin_arch" ? 2.6 : n.indexOf("ruin") === 0 ? 1.5 : n === "rock" ? 1.6 : n.indexOf("tree") === 0 ? 1.4 : n === "bush" ? .9 : 1.0;
      items.push({ z: d.z, f: function () { var x = sx(d.x), y = sy(d.z); if (big) shadow(x, y, big); spr(n, x, y, 1, d.flip); } });
    });
    slots.forEach(function (s) { if (s.tower && inView(sx(s.x), sy(s.z), 90, 160)) items.push({ z: s.z - .001, f: function () { var t = s.tower, x = sx(s.x), y = sy(s.z); shadow(x, y, 2.2); ctx.save(); if (t.boost > 1.01) { ctx.shadowColor = "#ffe680"; ctx.shadowBlur = 18; } var td0 = TOWERS[t.type]; spr(td0.spr + t.tier, x, y, (td0.sc || 1) * (1 + .1 * t.punch)); ctx.restore(); for (var pi = 0; pi < td0.T; pi++) { ctx.fillStyle = td0.T === 3 ? "#ffd25e" : td0.T === 2 ? "#e0b8ff" : "#9bffd0"; ctx.beginPath(); ctx.arc(x + (pi - (td0.T - 1) / 2) * 9, y + 8, 3, 0, 6.283); ctx.fill(); } } }); });
    items.push({ z: L.heart.z + .5, f: function () { var x = sx(L.heart.x), y = sy(L.heart.z), low = 1 - G.heart / HEART_MAX; ctx.save(); if (G.flashHeart > 0) ctx.globalAlpha = .75 + .25 * Math.sin(G.anim * 60); spr("heart_" + (Math.floor(G.anim * (1.5 + 3 * low)) & 1), x, y, 1); ctx.restore(); } });
    G.enemies.forEach(function (e) {
      var p = ep(e); if (!inView(sx(p.x), sy(p.z), 90, 170)) return;
      items.push({ z: p.z, f: function () {
        var x = sx(p.x), y = sy(p.z), name = e.def.spr + "_" + (e.stun > 0 ? 0 : frameOf(e, e.def.fps)), bob = e.k === "orb" ? Math.sin(G.anim * 4 + e.ph) * 2 : 0;
        shadow(x, y, e.def.shadow);
        var gsave = false; if (e.def.gel) { var ph2 = G.anim * 6 + e.ph * 3, k2 = Math.sin(ph2), hit = e.flash > 0 ? 1 : 0, scx = 1 - .1 * k2 + hit * .18, scy = 1 + .1 * k2 - hit * .16; if (e.born > 0) { scy += .3 * e.born; scx -= .15 * e.born; } ctx.save(); ctx.translate(x, y); ctx.scale(scx, scy); ctx.translate(-x, -y); gsave = true; y -= Math.max(0, k2) * 3; }
        if (e.flash > 0) { ctx.save(); ctx.filter = "brightness(2.4) saturate(.3)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else if (e.stun > 0) { ctx.save(); ctx.filter = "brightness(1.4) hue-rotate(150deg)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else if (e.slowF < 1) { ctx.save(); ctx.filter = "hue-rotate(-30deg) brightness(1.1)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else spr(name, x, y + bob, e.def.scale, p.dx < -.2);
        if (e.spark > 0) { var q = aimPt(e), sp = e.spark / .16, ll = 5 + 9 * sp; ctx.save(); ctx.strokeStyle = "#f4dcff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowColor = "#d58cff"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(q.x + e.sx - ll, q.y + e.sy); ctx.lineTo(q.x + e.sx + ll, q.y + e.sy); ctx.moveTo(q.x + e.sx, q.y + e.sy - ll); ctx.lineTo(q.x + e.sx, q.y + e.sy + ll); ctx.stroke(); ctx.restore(); }
        if (gsave) ctx.restore();
        if (e.poison) { ctx.fillStyle = "rgba(120,255,140,.8)"; ctx.fillRect(x - 3 + Math.sin(G.anim * 8 + e.ph) * 6, y - 26 - ((G.anim * 30 + e.ph * 10) % 20), 3, 3); }
      } });
    });
    G.heroes.forEach(function (hh) { items.push({ z: hh.z, f: function () { drawHero(hh); } }); });
    G.actors.forEach(function (a) { if (a.sorted && a.draw) items.push({ z: a.z, f: function () { a.draw(); } }); });
    G.heroes.forEach(function (hh) { if (hh.kit.drawExtra) hh.kit.drawExtra(hh); });
    G.sortedNow.forEach(function (i) { items.push(i); });
    G.projs.forEach(function (p) { if (!inView(sx(p.x), sy(p.z), 120, 200)) return; items.push({ z: p.z - 3, f: function () { drawProj(p); } }); });
    G.eprojs.forEach(function (p) { items.push({ z: p.z - 3, f: function () { drawEProj(p); } }); });
    G.orbs.forEach(function (o) { if (!inView(sx(o.x), sy(o.z), 40, 60)) return; items.push({ z: o.z - 2, f: function () { var X = sx(o.x), Y = sy(o.z) - 8 - Math.sin(G.anim * 5 + o.x * 3) * 2, r = 3 + Math.min(4, o.v * .22); if (o.t > 30 && ((G.anim * 8) | 0) % 2) return; ctx.save(); ctx.shadowColor = "#b46cff"; ctx.shadowBlur = 10; ctx.fillStyle = "#b46cff"; ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.283); ctx.fill(); ctx.fillStyle = "#f2e0ff"; ctx.beginPath(); ctx.arc(X - 1, Y - 1, r * .45, 0, 6.283); ctx.fill(); ctx.restore(); } }); });
    items.sort(function (a, b) { return b.z - a.z; }).forEach(function (i) { i.f(); });
    G.fx.forEach(function (f) { if (f.k !== "splat") drawFx(f); });
    G.floats.forEach(function (f) { ctx.globalAlpha = Math.max(0, 1 - f.t); text(f.txt, f.x, f.y, 20, f.col, "center"); }); ctx.globalAlpha = 1;

    // barres de vie : élites/boss en permanence ; les autres au hit puis disparition après 2,5 s ; vert / jaune / rouge
    G.enemies.forEach(function (e) {
      if (!(e.def.always || e.barT < 2.5)) return;
      var p = ep(e); if (!inView(sx(p.x), sy(p.z), 90, 170)) return;
      var w = e.def.bar * PPU * .75, x = sx(p.x) - w / 2, y = sy(p.z) - sh(e.def.spr + "_0") * e.def.scale - 8, r = Math.max(0, e.hp / e.mhp);
      ctx.globalAlpha = e.def.always ? 1 : Math.min(1, (2.5 - e.barT) * 2);
      rr(x - 2, y - 3, w + 4, 9, 3, "rgba(10,6,20,.92)", "rgba(255,255,255,.28)", 1);
      ctx.fillStyle = r > .6 ? "#59e07a" : r > .3 ? "#f2c038" : "#ec3b4a"; ctx.fillRect(x, y - 1, w * r, 5); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(x, y - 1, w * r, 1.5); ctx.globalAlpha = 1;
    });
    G.bolts.forEach(function (b) {
      var c = b.col || "#7ff0ff";
      [[b.big ? 16 : 9, c, .35], [b.big ? 6 : 3, "#ffffff", 1]].forEach(function (o) { ctx.globalAlpha = o[2]; ctx.strokeStyle = o[1]; ctx.lineWidth = o[0]; ctx.lineJoin = "round"; ctx.beginPath(); b.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
      ctx.globalAlpha = 1;
    });
    G.parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; var s = p.s * (.4 + p.life / p.max); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); });
    ctx.globalAlpha = 1;
    if (cr > .15) {   // yeux dans les bois (clignent) et brume mouvante
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      W2EYES.forEach(function (o, i) { if (i > cr * 60) return; var X = sx(o.x), Y = sy(o.z) - 22; if (!inView(X, Y, 20, 40)) return; var bl = Math.sin(time * .7 + o.ph) > .86 ? 0 : 1; if (!bl) return; ctx.globalAlpha = Math.min(1, cr * 1.2) * .9; ctx.fillStyle = o.col; ctx.fillRect(X - 5, Y, 3, 2); ctx.fillRect(X + 2, Y, 3, 2); });
      ctx.restore();
      if (Q >= .7) {
        if (!FOGC) { FOGC = document.createElement("canvas"); FOGC.width = FOGC.height = 128; var fg = FOGC.getContext("2d"), fr = fg.createRadialGradient(64, 64, 4, 64, 64, 64); fr.addColorStop(0, "rgba(140,110,190,.5)"); fr.addColorStop(1, "rgba(140,110,190,0)"); fg.fillStyle = fr; fg.fillRect(0, 0, 128, 128); }
        var fw = VW.x1 - VW.x0 + 500; ctx.save(); ctx.globalAlpha = .22 * cr;
        for (var fi = 0; fi < 6; fi++) { var fx0 = VW.x0 - 250 + ((fi * 331 + time * (10 + fi * 3)) % fw), fy0 = VW.y0 + ((fi * 173) % Math.max(1, VW.y1 - VW.y0)) - 60; ctx.drawImage(FOGC, fx0 - 260, fy0 - 130, 520, 260); }
        ctx.restore();
      }
    }
    var vwid = VW.x1 - VW.x0, vhei = VW.y1 - VW.y0, nm = Math.round(26 * Q);
    for (var i = 0; i < nm; i++) { var fx = VW.x0 + (i * 197 + Math.sin(time * .3 + i) * 40 + 4000) % vwid, fy = VW.y0 + ((i * 331 + time * 8 * (1 + i % 3)) % vhei); ctx.globalAlpha = .3 + .3 * Math.sin(time * 2 + i); ctx.fillStyle = i % 2 ? "#ffb0e0" : "#c48bff"; ctx.fillRect(fx, fy, 3, 3); }
    ctx.globalAlpha = 1;
    if (G.build && hv && !hv.tower && !trapB) {
      spr(tdef.spr + "0", sx(hv.x), sy(hv.z), tdef.sc || 1, false, bokT ? .6 : .35);
      if (touchUI) text(bokT ? "Touche encore pour construire" : (!unlockedT(buildType()) ? "Verrouillée" : countT(buildType()) >= capOf(buildType()) ? "Limite atteinte" : "Pas assez de cristaux"), sx(hv.x), sy(hv.z) - 96, 15, bokT ? "#9bffd0" : "#ffb0b0", "center");
    }
    text("SPAWN", sx(L.spawn.x) + 12, sy(L.spawn.z) + 34, 15, PINK, "center");
    var hx = sx(L.heart.x), hy = sy(L.heart.z) - 132, hr = Math.max(0, G.heart / HEART_MAX);
    text("CŒUR", hx, hy, 18, "#fff", "center"); text(Math.ceil(G.heart) + " / " + HEART_MAX, hx, hy + 20, 15, hr > .35 ? "#f2ecf6" : "#ff8a96", "center");
    rr(hx - 46, hy + 33, 92, 8, 3, "rgba(10,6,20,.92)", "rgba(255,255,255,.28)", 1); ctx.fillStyle = hr > .35 ? PINK : "#ff4058"; ctx.fillRect(hx - 44, hy + 35, 88 * hr, 4);
    ctx.restore();
    if (G.tintT > 0) { ctx.fillStyle = "rgba(14,8,48," + (G.tint * Math.min(1, G.tintT)) + ")"; ctx.fillRect(0, 0, W, H); }
    var g = ctx.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 760); g.addColorStop(0, "rgba(6,3,18,0)"); g.addColorStop(1, "rgba(6,3,18," + (.5 + .22 * G.corr).toFixed(2) + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawHud();
  }

  function clock(s) { s = Math.max(0, Math.floor(s)); return ("0" + (s / 60 | 0)).slice(-2) + ":" + ("0" + s % 60).slice(-2); }
  function gem(x, y, s, col) { ctx.fillStyle = col || PINK; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .8, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .8, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * .8, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); }

  // bouton de commande : rond (tactile) ou carré arrondi (clavier/souris, comme la barre de la maquette)
  function circle(id, cx, cy, r, glyph, cdLeft, cdMax, keyHint, big) {
    ctl.push({ id: id, x: cx, y: cy, r: r });
    var pressed = (id === "atk" && attackHeld()) || (aimSt && aimSt.key === id), sq = !touchUI;
    ctx.save();
    if (sq) rr(cx - r, cy - r, r * 2, r * 2, 12, pressed ? "rgba(255,90,190,.55)" : "rgba(14,10,30,.85)", cdLeft > 0 ? "#5a4f86" : PINKL, 3);
    else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fillStyle = pressed ? "rgba(255,90,190,.55)" : "rgba(14,10,30,.78)"; ctx.fill(); ctx.lineWidth = big ? 5 : 4; ctx.strokeStyle = cdLeft > 0 ? "#5a4f86" : PINKL; ctx.stroke(); }
    var skIm = G.hero ? imgs["skill_" + G.hero.id + "_" + id] : null;
    if (skIm && skIm.naturalWidth) {   // icône officielle de la compétence (planche du héros)
      ctx.save(); if (sq) rr(cx - r + 3, cy - r + 3, r * 2 - 6, r * 2 - 6, 9, null, null); else { ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, 6.283); } ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = cdLeft > 0 ? .55 : 1; ctx.drawImage(skIm, cx - r, cy - r, r * 2, r * 2); ctx.restore(); glyph = "";
    }
    ctx.translate(cx, cy); ctx.strokeStyle = cdLeft > 0 ? "#8d86b4" : "#ffd0ee"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var s = r / 40;
    if (glyph === "atk") { ctx.beginPath(); ctx.moveTo(-14 * s, 16 * s); ctx.lineTo(16 * s, -16 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18 * s, 8 * s); ctx.lineTo(-8 * s, 18 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8 * s, -22 * s); ctx.lineTo(22 * s, -22 * s); ctx.lineTo(22 * s, -8 * s); ctx.stroke(); }
    else if (glyph === "s1") { ctx.beginPath(); ctx.moveTo(-16 * s, 12 * s); ctx.lineTo(16 * s, -12 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4 * s, -16 * s); ctx.lineTo(18 * s, -12 * s); ctx.lineTo(12 * s, 2 * s); ctx.stroke(); }
    else if (glyph === "s2") { ctx.beginPath(); ctx.moveTo(6 * s, -20 * s); ctx.lineTo(-8 * s, 2 * s); ctx.lineTo(2 * s, 2 * s); ctx.lineTo(-6 * s, 20 * s); ctx.lineTo(10 * s, -4 * s); ctx.lineTo(0, -4 * s); ctx.closePath(); ctx.fill(); }
    else if (glyph === "ult") { ctx.beginPath(); ctx.arc(0, 0, 16 * s, 0, 5.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2 * s, -6 * s); ctx.lineTo(-4 * s, 4 * s); ctx.lineTo(3 * s, 4 * s); ctx.lineTo(-2 * s, 14 * s); ctx.stroke(); }
    ctx.restore();
    if (cdLeft > 0) {
      ctx.save();
      if (sq) { rr(cx - r, cy - r, r * 2, r * 2, 12, null, null); ctx.beginPath(); ctx.rect(cx - r, cy - r, r * 2, r * 2 * (cdLeft / cdMax)); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + 6.283 * (cdLeft / cdMax)); ctx.closePath(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fill(); }
      ctx.restore(); text(String(Math.ceil(cdLeft)), cx, cy, Math.round(r * .62), "#fff", "center");
    }
    if (keyHint && sq) text(keyHint, cx, cy + r - 8, 12, "#ffd0ee", "center");
  }

  function drawControls() {
    var h = G.hero; if (!h) return;
    var k = h.kit;
    if (touchUI) {
      var ax = W - 112, ay = H - 118, bigR = 58, sr = 42;
      circle("atk", ax, ay, bigR, "atk", 0, 1, "", true);
      circle("s1", ax - (bigR + sr * .9), ay + 22, sr, "s1", h.cd.s1, k.skills.s1.cd, "");
      circle("s2", ax - (bigR * .75 + sr * .7), ay - (bigR + sr * .5), sr, "s2", h.cd.s2, k.skills.s2.cd, "");
      circle("ult", ax + 6, ay - (bigR + sr * 2.1), sr, "ult", h.cd.ult, k.skills.ult.cd, "");
      var bx = joy.on ? joy.bx : 150, by = joy.on ? joy.by : H - 140, kx = bx + (joy.on ? joy.dx : 0) * 60, ky = by + (joy.on ? joy.dy : 0) * 60;
      ctx.save(); ctx.globalAlpha = joy.on ? .95 : .35; ctx.beginPath(); ctx.arc(bx, by, 78, 0, 6.283); ctx.fillStyle = "rgba(14,10,34,.55)"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PINKL; ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky, 36, 0, 6.283); ctx.fillStyle = "rgba(255,110,200,.5)"; ctx.fill(); ctx.strokeStyle = "#ffd0ee"; ctx.stroke(); ctx.restore();
    } else {   // clavier/souris : portrait + rangée de compétences en bas à droite (composition de la maquette)
      var px = W - 112, py = H - 112, r = 31, cy = H - 58, c3 = px - 18 - r;
      panel(px - 4, py - 4, 106, 112);
      var im = imgs["icon_" + h.id]; ctx.save(); rr(px, py, 98, 104, 8, "#1c1630", PINKL, 2); ctx.clip();
      if (im && im.naturalWidth) ctx.drawImage(im, px + 2, py + 2, 94, 100); ctx.restore();
      circle("ult", c3, cy, r, "ult", h.cd.ult, k.skills.ult.cd, "F"); circle("s2", c3 - 70, cy, r, "s2", h.cd.s2, k.skills.s2.cd, "R");
      circle("s1", c3 - 140, cy, r, "s1", h.cd.s1, k.skills.s1.cd, "E"); circle("atk", c3 - 210, cy, r, "atk", 0, 1, "Clic", true);
      if (k.meter) { var m = k.meter(h), mx = c3 - 210 - r, my = cy - r - 14; text(m.label + (m.text ? " " + m.text : ""), mx, my - 10, 12, "#d8d0ee"); rr(mx, my - 2, 4 * 70 - 8, 8, 4, "rgba(10,6,24,.85)", "#46386e", 1); if (m.v > 0) rr(mx + 1, my - 1, (4 * 70 - 10) * Math.min(1, m.v), 6, 3, m.full ? "#fff3a0" : m.col); }
    }
    if (touchUI && k.meter) {
      var m2 = k.meter(h), mx2 = W - 112 - 310, my2 = H - 118 + 58;
      text(m2.label + (m2.text ? " " + m2.text : ""), mx2, my2 - 12, 12, "#d8d0ee"); rr(mx2, my2 - 4, 150, 9, 4, "rgba(10,6,24,.85)", "#46386e", 1);
      if (m2.v > 0) rr(mx2 + 1, my2 - 3, 148 * Math.min(1, m2.v), 7, 3, m2.full ? "#fff3a0" : m2.col);
    }
  }

  // choix d'amélioration : 3 cartes max, tactile (touche = choisir), clavier 1-2-3 ; « Plus tard » réduit en pastille ; la partie continue
  function drawOffer() {
    var h = G.hero; if (!h || h.pend <= 0 || h.dead || G.menu || G.paused) { UI.offer = null; return; }
    if (!UI.offer || !UI.offer.length) UI.offer = makeOffer(h);
    if (UI.hide) { button(W / 2 - 110, H - 176, 220, 38, "★ " + h.pend + " amélioration" + (h.pend > 1 ? "s" : "") + " à choisir", function () { UI.hide = false; }, true, "#ffe680", 15); return; }
    var cw = 196, ch = 136, gap = 14, n = UI.offer.length, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, y0 = H - 140 - ch;
    text("NIVEAU " + G.lvl + " — choisis une amélioration" + (h.pend > 1 ? " (" + h.pend + ")" : ""), W / 2, y0 - 16, 17, "#ffe680", "center");
    button(W / 2 + n * cw / 2 - 60, y0 - 34, 120, 24, "Plus tard ▾", function () { UI.hide = true; }, false, "#cfc6dc", 13);
    UI.offer.forEach(function (id, i) {
      var u = upgradeById(id), x = x0 + i * (cw + gap), have = h.picks[id] || 0;
      button(x, y0, cw, ch, "", function () { chooseUpgrade(id); }, false);
      text(u.n, x + cw / 2, y0 + 22, 17, u.h ? (HCOL[u.h] || "#ffe680") : "#ffe680", "center");
      text(have + 1 + " / " + u.max, x + cw / 2, y0 + 42, 12, "#cfc6dc", "center", false);
      wrapText(u.d, x + cw / 2, y0 + 70, cw - 22, 14, "#f2ecf6");
      if (!touchUI) text("[" + (i + 1) + "]", x + cw - 18, y0 + ch - 14, 12, "#ffd0ee", "center");
    });
  }
  function hpBar(x, y, w, h, r, hh) {
    rr(x, y, w, hh || 12, 4, "rgba(10,6,20,.92)", "rgba(255,255,255,.25)", 1); ctx.fillStyle = r > .6 ? "#59e07a" : r > .3 ? "#f2c038" : "#ec3b4a"; ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.max(0, Math.min(1, r))), (hh || 12) - 4);
  }
  function drawHeroStatus() {
    var h = G.hero; if (!h) return;
    var lo = xpCum(G.lvl), hi = xpCum(G.lvl + 1), xr = G.lvl >= MAXLVL ? 1 : (G.xp - lo) / Math.max(1, hi - lo);
    panel(0, 90, 196, 62); text("NIV. " + G.lvl, 14, 108, 17, "#ffe680"); text(h.kit.short || h.kit.name, 182, 108, 13, HCOL[h.id] || PINKL, "right");
    hpBar(12, 120, 172, 12, h.hp / h.mhp); text(Math.ceil(h.hp) + " / " + h.mhp, 98, 126, 11, "#fff", "center");
    rr(12, 138, 172, 7, 3, "rgba(10,6,20,.92)", "rgba(255,255,255,.2)", 1); ctx.fillStyle = "#b46cff"; ctx.fillRect(14, 140, 168 * Math.max(0, Math.min(1, xr)), 3);
    G.heroes.forEach(function (o) {
      if (o === h) return; panel(0, 156, 196, 38); text(o.kit.short || o.kit.name, 12, 168, 13, HCOL[o.id] || PINKL); hpBar(12, 178, 172, 9, o.dead ? 0 : o.hp / o.mhp, 9);
      if (o.dead) text("À TERRE", 184, 168, 12, "#ff8a8a", "right");
    });
    if (h.dead) {
      var solo = G.heroes.length < 2, left = Math.max(0, Math.ceil((solo ? 8 : 30) - h.down));
      text("À TERRE", W / 2, 150, 34, "#ff6a76", "center");
      text(solo ? "Réapparition dans " + left + " s" : "Ton équipier peut te ranimer : il doit rester près de toi · réapparition dans " + left + " s", W / 2, 180, 15, "#ffd0ee", "center", false);
      if (h.rv > 0) { rr(W / 2 - 80, 194, 160, 10, 4, "rgba(10,6,20,.9)", "rgba(255,255,255,.3)", 1); ctx.fillStyle = "#9bffd0"; ctx.fillRect(W / 2 - 78, 196, 156 * h.rv, 6); }
    } else G.heroes.forEach(function (o) { if (o !== h && o.dead && Math.hypot(o.x - h.x, o.z - h.z) < 4) text("Reste près de " + (o.kit.short || o.kit.name) + " pour le ranimer", W / 2, 150, 18, "#9bffd0", "center"); });
  }
  function drawHud() {
    if (G.state === "select") { drawSelect(); return; }
    var hero = G.hero, def = TOWERS[heroTowerType()];
    var alive = G.mirror ? G.rem : G.enemies.length + (G.events.length - G.next);
    if (COOP && COOP.active()) text("COOP · SALON " + COOP.code() + (COOP.isHost() ? " (hôte)" : ""), 208, 16, 13, "#ffd0ee");
    // haut gauche : vague + ennemis restants
    panel(0, 0, 196, 84);
    text("VAGUE " + (Math.max(1, G.wave) + 10 * (G.seq - 1)) + "/20", 18, 28, 26, "#fff");
    ctx.fillStyle = "#e8e0f0"; ctx.beginPath(); ctx.arc(26, 62, 9, 0, 6.283); ctx.fill(); ctx.fillRect(20, 62, 12, 8); ctx.fillStyle = "#14101e"; ctx.fillRect(21, 59, 4, 5); ctx.fillRect(28, 59, 4, 5);
    text(String(alive), 46, 62, 24, "#fff");
    drawHeroStatus();
    // haut centre : séquence + 10 vagues
    var cx = W / 2; text("SÉQUENCE " + G.seq, cx, 24, 22, G.seq === 2 ? "#d8b4ff" : PINKL, "center");
    for (var i = 0; i < 10; i++) { var dx = cx - 108 + i * 24, done = i < G.wave, cur = i === G.wave - 1; ctx.fillStyle = done ? PINK : "rgba(10,8,18,.85)"; ctx.beginPath(); ctx.arc(dx, 52, 9, 0, 6.283); ctx.fill(); ctx.strokeStyle = cur ? "#fff" : "rgba(255,255,255,.18)"; ctx.lineWidth = cur ? 3 : 1.5; ctx.stroke(); }
    text("1", cx - 108, 76, 13, "#cfc6dc", "center"); text("10", cx + 108, 76, 13, "#cfc6dc", "center");
    // haut droite : cristaux + pause
    panel(W - 178, 0, 178, 64); gem(W - 150, 32, 11); text(String(G.gold), W - 126, 32, 30, "#fff");
    button(W - 56, 74, 44, 44, "", togglePause, G.paused); ctx.fillStyle = "#fff"; ctx.fillRect(W - 43, 86, 7, 20); ctx.fillRect(W - 30, 86, 7, 20);
    button(W - 108, 74, 44, 44, "", toggleFull, full);   // icône grand écran : quatre coins
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; var fx0 = W - 98, fy0 = 84, d = 8;
    [[0, 0, 1, 1], [24, 0, -1, 1], [0, 24, 1, -1], [24, 24, -1, -1]].forEach(function (c) { ctx.beginPath(); ctx.moveTo(fx0 + c[0] + c[2] * d, fy0 + c[1]); ctx.lineTo(fx0 + c[0], fy0 + c[1]); ctx.lineTo(fx0 + c[0], fy0 + c[1] + c[3] * d); ctx.stroke(); }); ctx.restore();
    drawControls();
    drawOffer();
    var xlo = xpCum(G.lvl), xhi = xpCum(G.lvl + 1), xr2 = G.lvl >= MAXLVL ? 1 : (G.xp - xlo) / Math.max(1, xhi - xlo);
    ctx.fillStyle = "rgba(10,6,20,.75)"; ctx.fillRect(0, H - 4, W, 4); ctx.fillStyle = G.lvlFlash > 0 ? "#ffe680" : G.xpFlash > 0 ? "#e0b8ff" : "#b46cff"; ctx.fillRect(0, H - 4, W * Math.max(0, Math.min(1, xr2)), 4);
    // menu de construction compact et rétractable (bas centre) : 3 familles du héros, verrous, n/limite
    var fam = famOf(), bw = 372, bx0 = W / 2 - bw / 2 - (touchUI ? 0 : 60), open = !UI.bmin || G.build;
    if (!open) {
      var anyNew = false; for (var nk in UI.newT) if (UI.newT[nk] > 0) anyNew = true;
      button(bx0 + bw / 2 - 70, H - 38, 140, 30, "TOURELLES ▴", function () { UI.bmin = false; }, anyNew, anyNew ? "#ffe680" : "#cfc6dc", 14);
    } else {
      var by0 = H - 128; panel(bx0, by0, bw, 118);
      button(bx0 + 6, by0 + 4, 130, 22, "TOURELLES ▾", function () { UI.bmin = true; G.build = false; }, false, "#cfc6dc", 13);
      for (var s = 0; s < 3; s++) {
        var id = fam[s], d = TOWERS[id], x = bx0 + 12 + s * 118, y = by0 + 28, w = 108, h = 82, lock = !unlockedT(id), n = countT(id), cp = capOf(id), full2 = !lock && n >= cp, sel2 = G.build && buildType() === id, glow = UI.newT[id] > 0;
        (function (id2, lock2) { button(x, y, w, h, "", function () { if (lock2) { play("error", .5); toast(TOWERS[id2].name + " : niveau " + tierCfg(id2).unlock + " requis", "#ffb0b0"); return; } if (G.build && buildType() === id2) { G.build = false; return; } G.bt = id2; G.build = true; G.sel = null; }, sel2, null, null, false); })(id, lock);
        if (glow) { ctx.save(); ctx.strokeStyle = "#ffe680"; ctx.globalAlpha = .5 + .5 * Math.sin(time * 8); ctx.lineWidth = 3; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.restore(); }
        if (lock) {
          ctx.globalAlpha = .35; spr(d.spr + "0", x + w / 2, y + 50, .6 * (d.sc || 1)); ctx.globalAlpha = 1;
          ctx.fillStyle = "#cfc6dc"; ctx.fillRect(x + w / 2 - 9, y + 26, 18, 14); ctx.strokeStyle = "#cfc6dc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w / 2, y + 26, 6, Math.PI, 0); ctx.stroke();
          text("NIV. " + tierCfg(id).unlock, x + w / 2, y + h - 12, 15, "#ffb0b0", "center");
        } else {
          spr(d.spr + "0", x + w / 2, y + 50, .6 * (d.sc || 1));
          gem(x + w / 2 - 22, y + h - 10, 7); text(String(d.cost), x + w / 2 - 10, y + h - 9, 17, G.gold >= d.cost ? "#fff" : "#ff8a96");
          text(n + "/" + cp, x + w - 8, y + 14, 13, full2 ? "#ff8a96" : "#cfc6dc", "right");
        }
        text("T" + d.T, x + 8, y + 14, 13, d.T === 3 ? "#ffd25e" : d.T === 2 ? "#e0b8ff" : "#9bffd0");
      }
      if (G.build) text(TOWERS[buildType()].name + " — " + TOWERS[buildType()].tag, bx0 + bw / 2 + 40, by0 - 8, 14, "#f2ecf6", "center", false);
    }
    if (!touchUI && hero) {   // bas gauche : rappel des touches
      panel(0, H - 112, 250, 102);
      text("ZQSD / flèches : bouger", 14, H - 92, 13, "#cfc6dc", "left", false); text("Clic : attaquer · E R F : sorts", 14, H - 72, 13, "#cfc6dc", "left", false); text("B / Tab : construire", 14, H - 52, 13, "#cfc6dc", "left", false); text("G : grand écran · Échap : pause", 14, H - 32, 13, "#cfc6dc", "left", false);
    }
    if (G.sel) {
      var t = G.sel, st = t.st, td = TOWERS[t.type], px = 12, py = 196;
      panel(px, py, 268, 266);
      text(td.name + " · T" + td.T + " niv. " + (t.tier + 1), px + 14, py + 22, 18, "#fff");
      text("Dégâts " + +st.damage.toFixed(1) + " · " + +st.rate.toFixed(1) + "/s · portée " + +st.range.toFixed(1), px + 14, py + 48, 14, "#cfc6dc", "left", false);
      text(st.sr ? "Soin " + (st.heal * 100).toFixed(1) + " %/s · rayon " + st.sr.toFixed(1) + " · poupées " + Math.round(st.prot * 100) + " %" : td.tag + (st.zaps > 1 ? " ×" + st.zaps : "") + (st.jumps ? " · chaîne " + st.jumps : ""), px + 14, py + 68, 13, st.sr ? "#9bffd0" : "#cfc6dc", "left", false);
      if (t.tier < td.ups.length) {
        var u = td.ups[t.tier], lockLv = G.lvl < UPREQ[t.tier], ok = G.gold >= u.cost && !lockLv;
        button(px + 12, py + 86, 244, 128, "", function () { tryUpgrade(t); });
        text(u.name, px + 134, py + 110, 17, ok ? "#fff" : "#ff8a96", "center"); gem(px + 112, py + 136, 8); text(String(u.cost), px + 126, py + 136, 20, ok ? "#fff" : "#ff8a96");
        wrapText(lockLv ? "Niveau " + UPREQ[t.tier] + " requis (niveau actuel : " + G.lvl + ")" : u.desc, px + 134, py + 164, 220, 14, lockLv ? "#ffb0b0" : "#d8d0ee");
      } else text("NIVEAU MAXIMAL", px + 134, py + 150, 20, PINKL, "center");
      button(px + 12, py + 222, 244, 34, "Vendre  +" + Math.round((t.spent || td.cost) * SELL_RATE), function () { trySell(t); }, false, "#ffd25e", 16);
    }
    if (G.trans > 0) {   // transition : bandeau, sans bloquer le jeu
      var ta = Math.min(1, G.trans / 1.2, (6.5 - G.trans) / .6); ctx.save(); ctx.globalAlpha = ta * .6; ctx.fillStyle = "#0a0418"; ctx.fillRect(0, 250, W, 150); ctx.globalAlpha = ta;
      text("LE MONDE S'ÉVEILLE", W / 2, 305, 46, "#d8b4ff", "center"); text("Séquence 2 — vagues 11 à 20", W / 2, 345, 22, "#f2ecf6", "center", false); text("Tes constructions restent. La corruption gagne du terrain.", W / 2, 376, 16, "#cfc6dc", "center", false); ctx.restore();
    }
    if (G.selT) drawTrapPanel(G.selT);
    if (G.toastT > 0) { ctx.globalAlpha = Math.min(1, G.toastT / .5); text(G.toast, W / 2, G.state === "prep" ? 222 : 132, 26, G.toastC, "center"); ctx.globalAlpha = 1; }
    if (G.paused || G.menu) {
      ctx.fillStyle = "rgba(4,2,12,.6)"; ctx.fillRect(0, 0, W, H);
      var py2 = 110; panel(W / 2 - 230, py2, 460, 420); text("PAUSE", W / 2, py2 + 48, 44, PINKL, "center");
      button(W / 2 - 160, py2 + 90, 320, 52, "Reprendre", togglePause);
      button(W / 2 - 160, py2 + 152, 320, 52, COOP && COOP.active() ? "Quitter la coop" : "Changer de héros", function () { reset(false); });
      button(W / 2 - 160, py2 + 214, 320, 52, "Recommencer", function () { if (COOP && COOP.active()) { if (COOP.isHost()) { COOP.restart(); G.menu = false; } } else reset(true); }, false, null, null, !!(COOP && COOP.active() && !COOP.isHost()));
      button(W / 2 - 160, py2 + 276, 320, 52, full ? "Quitter le grand écran" : "Grand écran", function () { setFull(!full); G.paused = false; });
      button(W / 2 - 160, py2 + 338, 320, 52, muted ? "Son : coupé" : "Son : activé", toggleSound);
    } else if (G.state === "prep") {
      text("Prépare ta défense : déplace-toi et construis.", W / 2, 112, 18, "#f2ecf6", "center", false);
      button(W / 2 - 150, 128, 300, 46, "LANCER LA SÉQUENCE " + G.seq, startSeq, false, null, 20);
      if (hero && hero.kit.provisional) text("Kit provisoire : ce héros n'est pas encore défini dans les documents.", W / 2, 196, 14, "#ffb0dc", "center", false);
    } else if (G.state === "win") endScreen("VICTOIRE", "Le Cœur tient bon : la séquence est vaincue.", "#ffd25e");
    else if (G.state === "lose") endScreen("DÉFAITE", "Le Cœur s'est effondré sous la corruption.", "#ff6a76");
    if (full && window.innerHeight > window.innerWidth) { ctx.fillStyle = "rgba(4,2,12,.9)"; ctx.fillRect(0, 0, W, H); text("Tourne ton téléphone en paysage", W / 2, H / 2, 34, "#ffd25e", "center"); }
  }
  function drawTrapPanel(t) {
    var px = 12, py = 196, st = trapStats(t), sp = t.spec ? TRAP.specs[t.spec] : null;
    panel(px, py, 268, 262);
    text((sp ? sp.name : "Piège de ronce") + (t.tier >= 2 ? " ★" : ""), px + 14, py + 22, 18, sp ? sp.col : "#fff");
    text("Dégâts " + Math.round(st.dmg) + " · rayon " + st.r.toFixed(1) + " · recharge " + st.rech.toFixed(1) + " s", px + 14, py + 46, 13, "#cfc6dc", "left", false);
    text("Charges " + Math.max(0, t.ch) + "/" + st.ch + (st.stun ? " · immobilise " + st.stun + " s" : "") + (st.poison ? " · poison" : ""), px + 14, py + 64, 13, "#cfc6dc", "left", false);
    var y0 = py + 78;
    if (t.wilted) {
      wrapText("Desséché : Églantyne peut sacrifier une poupée près de lui, ou tu peux le replanter.", px + 134, y0 + 18, 240, 14, "#ffd9a0");
      var rc = Math.round(TRAP.cost * .6); button(px + 12, y0 + 54, 244, 42, "Replanter  " + rc, function () { tryTrapReseed(t); }, false, G.gold >= rc ? "#fff" : "#ff8a96", 17);
    } else if (!t.spec) {
      text("Spécialisation  (" + TRAP.specCost + ")", px + 14, y0 + 12, 14, G.lvl >= TRAP.specLvl ? "#e8e0f0" : "#ffb0b0", "left", false);
      Object.keys(TRAP.specs).forEach(function (k, i) {
        var s2 = TRAP.specs[k], x = px + 12 + i * 82, lock = G.lvl < TRAP.specLvl;
        button(x, y0 + 24, 78, 74, "", function () { if (lock) { play("error", .5); toast("Niveau " + TRAP.specLvl + " requis", "#ffb0b0"); return; } tryTrapUp(t, k); }, false, null, null, lock);
        ctx.fillStyle = lock ? "#6c6688" : s2.col; ctx.beginPath(); ctx.arc(x + 39, y0 + 42, 7, 0, 6.283); ctx.fill();
        text(s2.short, x + 39, y0 + 64, 12, lock ? "#6c6688" : "#fff", "center"); text(lock ? "NIV. " + TRAP.specLvl : s2.tag, x + 39, y0 + 84, 11, lock ? "#ffb0b0" : "#cfc6dc", "center", false);
      });
    } else if (t.tier < 2) {
      var lock2 = G.lvl < TRAP.evoLvl, ok = G.gold >= TRAP.evoCost && !lock2;
      button(px + 12, y0 + 6, 244, 92, "", function () { tryTrapUp(t); });
      text(TRAP.evo.name, px + 134, y0 + 30, 17, ok ? "#fff" : "#ff8a96", "center"); gem(px + 112, y0 + 54, 8); text(String(TRAP.evoCost), px + 126, y0 + 54, 20, ok ? "#fff" : "#ff8a96");
      wrapText(lock2 ? "Niveau " + TRAP.evoLvl + " requis (niveau actuel : " + G.lvl + ")" : TRAP.evo.desc, px + 134, y0 + 78, 220, 14, lock2 ? "#ffb0b0" : "#d8d0ee");
    } else text("NIVEAU MAXIMAL", px + 134, y0 + 52, 20, PINKL, "center");
    button(px + 12, py + 222, 244, 34, "Vendre  +" + Math.round(t.spent * SELL_RATE), function () { tryTrapSell(t); }, false, "#ffd25e", 16);
  }
  function endScreen(title, body, col) {
    ctx.fillStyle = "rgba(4,2,12,.55)"; ctx.fillRect(0, 0, W, H);
    var w = 640, h = 300, x = (W - w) / 2, y = 150;
    panel(x, y, w, h); text(title, W / 2, y + 52, 52, col, "center");
    text(body, W / 2, y + 108, 19, "#f2ecf6", "center", false); text("Ennemis vaincus : " + G.kills + "  ·  Temps : " + clock(G.t), W / 2, y + 138, 19, "#f2ecf6", "center", false);
    var co = COOP && COOP.active(), gst = co && !COOP.isHost();
    button(W / 2 - 220, y + h - 124, 440, 50, gst ? "L'hôte relance la partie…" : "REJOUER", function () { if (co) COOP.restart(); else reset(true); }, false, null, gst ? 18 : null, gst);
    button(W / 2 - 220, y + h - 66, 440, 46, co ? "Quitter la coop" : "Changer de héros", function () { reset(false); }, false, "#ffd0ee", 18);
  }
  function wrapText(s, x, y, maxw, size, col) {
    ctx.font = "bold " + size + "px Nunito, system-ui, sans-serif"; var words = s.split(" "), line = "", ly = y;
    words.forEach(function (w) { var tt = line ? line + " " + w : w; if (ctx.measureText(tt).width > maxw && line) { text(line, x, ly, size, col, "center"); line = w; ly += size + 4; } else line = tt; });
    text(line, x, ly, size, col, "center");
  }
  function drawSelect() {
    ctx.fillStyle = "rgba(8,5,18,.86)"; ctx.fillRect(0, 0, W, H);
    text("CHOISIS TON HÉROS", W / 2, 54, 44, PINKL, "center");
    text("Tu le déplaces en temps réel pendant que tes tourelles défendent le Cœur.", W / 2, 92, 17, "#d8d0ee", "center", false);
    var n = HERO_ORDER.length, gap = 14, cw = Math.min(268, (W - 60 - gap * (n - 1)) / n), ch = 520, x0 = (W - (cw * n + gap * (n - 1))) / 2, y0 = 116;
    HERO_ORDER.forEach(function (id, i) {
      var k = KITS[id], x = x0 + i * (cw + gap), hot = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch;
      rr(x, y0, cw, ch, 14, hot ? "rgba(46,30,70,.97)" : "rgba(26,20,44,.95)", hot ? PINKL : "rgba(255,255,255,.12)", 2);
      var im = imgs["big_" + id], sz = Math.min(cw - 16, 300), bob = Math.sin(time * 2 + i) * 3;
      if (im && im.naturalWidth) { ctx.drawImage(im, x + cw / 2 - sz / 2, y0 + 14 + bob, sz, sz); }
      text(k.name, x + cw / 2, y0 + sz + 34, 22, HCOL[id] || "#fff", "center"); text(k.role, x + cw / 2, y0 + sz + 60, 15, PINKL, "center", false);
      k.lines.forEach(function (l, j) { text(l, x + cw / 2, y0 + sz + 90 + j * 20, 13, "#cfc6dc", "center", false); });
      if (k.provisional) text("kit provisoire", x + cw / 2, y0 + ch - 82, 12, "#ffb0dc", "center", false);
      var inCoop = COOP && COOP.active(), mine = inCoop && COOP.myPick() === id;
      if (inCoop && COOP.peerPick() === id) text("Ami ✓", x + cw / 2, y0 + ch - 78, 14, "#ffd0ee", "center");
      button(x + 16, y0 + ch - 62, cw - 32, 46, inCoop ? (mine ? "✓ CHOISI" : "CHOISIR") : "JOUER", function () { pickHero(id); }, mine, null, 22);
      buttons.push({ x: x, y: y0, w: cw, h: ch - 66, f: function () { pickHero(id); } });
    });
    drawCoopLobby();
  }
  // lobby coop (écran de sélection) : créer / rejoindre un salon, état de la connexion
  function drawCoopLobby() {
    if (!COOP) return;
    if (!COOP.active()) {
      button(W / 2 - 190, H - 60, 380, 46, "COOP EN LIGNE · 2 JOUEURS", function () { G.coopMenu = true; }, false, "#ffd0ee", 20);
      if (G.coopMenu) {
        ctx.fillStyle = "rgba(4,2,12,.78)"; ctx.fillRect(0, 0, W, H); buttons.push({ x: 0, y: 0, w: W, h: H, f: function () {} });
        panel(W / 2 - 240, 150, 480, 380); text("COOP EN LIGNE", W / 2, 198, 38, PINKL, "center");
        text("Joue avec un ami, chacun sur son écran.", W / 2, 240, 17, "#f2ecf6", "center", false); text("Les ennemis ont 50 % de PV en plus.", W / 2, 264, 15, "#cfc6dc", "center", false);
        button(W / 2 - 180, 300, 360, 56, "Créer un salon", function () { G.coopMenu = false; COOP.host(); });
        button(W / 2 - 180, 368, 360, 56, "Rejoindre un salon", function () { G.coopMenu = false; var c = window.prompt("Code du salon (4 lettres) :"); if (c) COOP.join(c); });
        button(W / 2 - 180, 446, 360, 46, "Retour", function () { G.coopMenu = false; }, false, "#cfc6dc", 18);
      }
      return;
    }
    var I = COOP.info();
    text(I.line1, W / 2, H - 62, 19, "#fff", "center"); text(I.line2, W / 2, H - 36, 14, "#ffd0ee", "center", false);
    button(W - 212, H - 62, 192, 42, "Quitter le salon", function () { reset(false); }, false, "#ffd0ee", 16);
    if (COOP.isHost()) button(20, H - 62, 212, 42, "Copier le lien", function () { COOP.copyLink(); }, false, "#ffd0ee", 16);
  }

  // ---------- boucle & entrées ----------
  var last = 0;
  function frame(ts) {
    if (!last) last = ts; var dt = Math.min(.1, (ts - last) / 1000); last = ts;
    for (var i = 0; i < SPEED; i++) update(dt);
    if (COOP) COOP.tick(dt);
    updateCam(dt); draw(); requestAnimationFrame(frame);
  }
  // position dans le repère logique du jeu : tient compte de la zone réellement affichée (bandes noires du plein écran) et des zones sûres
  function cpos(ev) {
    var r = cv.getBoundingClientRect(), sc = Math.min(r.width / CW, r.height / H) || 1, ox = (r.width - CW * sc) / 2, oy = (r.height - H * sc) / 2;
    return { x: (ev.clientX - r.left - ox) / sc - SL, y: (ev.clientY - r.top - oy) / sc };
  }
  function hitRect(p) { for (var i = buttons.length - 1; i >= 0; i--) { var b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; } return null; }
  function hitCircle(p) { var pad = touchUI ? 16 : 8; for (var i = ctl.length - 1; i >= 0; i--) { var c = ctl[i]; if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r + pad) return c; } return null; }
  cv.addEventListener("pointermove", function (e) {
    var p = cpos(e); mouse = p; mouseIn = true; if (e.pointerType === "mouse") touchUI = false;
    if (e.pointerType === "mouse") hover = slotAt(toWorld(p.x, p.y));
    var pt = ptrs[e.pointerId]; if (!pt) return;
    if (pt.k === "joy") { var dx = p.x - joy.bx, dy = p.y - joy.by, l = Math.hypot(dx, dy), m = Math.min(1, l / 70); if (l > 0) { dx /= l; dy /= l; } joy.dx = l < 10 ? 0 : dx * m; joy.dy = l < 10 ? 0 : dy * m; pt.moved = pt.moved || Math.hypot(p.x - pt.x0, p.y - pt.y0) > 14; }
    else if (pt.k === "skill" && !pt.self) {
      var vx = p.x - pt.cx, vy = p.y - pt.cy, vl = Math.hypot(vx, vy);
      if (vl > 16) { pt.drag = true; aimSt = { key: pt.key, aim: aimFor(pt.key, { dx: vx, dy: vy, len: vl }) }; }
    }
  });
  cv.addEventListener("pointerleave", function () { mouseIn = false; });
  ["touchstart", "touchmove"].forEach(function (n) { cv.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });   // pas de défilement / zoom pendant le jeu
  cv.addEventListener("pointerdown", function (e) {
    var p = cpos(e); mouse = p; startAmbient(); touchUI = e.pointerType !== "mouse";
    if (e.button === 2) { cancel(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var b = hitRect(p); if (b) { play("click", .5); b.f(); return; }
    if (!G.hero || G.paused || G.menu || (G.state !== "play" && G.state !== "prep")) return;
    var c = hitCircle(p);
    if (c) {
      if (c.id === "atk") ptrs[e.pointerId] = { k: "atk" };
      else ptrs[e.pointerId] = { k: "skill", key: c.id, cx: c.x, cy: c.y, drag: false, self: G.hero.kit.skills[c.id].aim.type === "self" };
      return;
    }
    if (e.pointerType !== "mouse") {
      if (p.x < W * .5) { joy.on = true; joy.id = e.pointerId; joy.bx = Math.max(90, Math.min(W * .5 - 20, p.x)); joy.by = Math.max(110, Math.min(H - 90, p.y)); joy.dx = joy.dy = 0; ptrs[e.pointerId] = { k: "joy", x0: p.x, y0: p.y, t0: performance.now(), moved: false }; }
      else worldClick(p.x, p.y);
      return;
    }
    hover = slotAt(toWorld(p.x, p.y));
    if (!worldClick(p.x, p.y)) ptrs[e.pointerId] = { k: "matk" };
  });
  function release(e) {
    var pt = ptrs[e.pointerId]; if (!pt) return;
    if (pt.k === "joy") { joy.on = false; joy.dx = joy.dy = 0; if (!pt.moved && performance.now() - pt.t0 < 300) { var p = cpos(e); worldClick(p.x, p.y); } }
    else if (pt.k === "skill") { var tA = null; if (pt.drag && aimSt && aimSt.key === pt.key) tA = aimSt.aim; aimSt = null; if (tA) castWithAim(pt.key, tA); else castSkill(pt.key); }
    delete ptrs[e.pointerId];
  }
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); cancel(); });
  window.addEventListener("keydown", function (e) {
    if (!loaded || !L) return; var k = e.code; keys[k] = true; touchUI = false;
    if (k === "Escape") { if (!cancel()) togglePause(); }
    else if (k === "KeyP") togglePause();
    else if (k === "Enter") { if (G.state === "select") pickHero("noctis"); else if (G.state === "prep" && !G.paused) startSeq(); }
    else if (/^Digit[1-3]$/.test(k) && G.hero && G.hero.pend > 0 && UI.offer && !UI.hide && UI.offer[+k.slice(5) - 1]) { chooseUpgrade(UI.offer[+k.slice(5) - 1]); }
    else if (k === "KeyB" || k === "Tab" || k === "Digit1") { toggleBuild(); e.preventDefault(); }
    else if (k === "KeyE") castSkill("s1");
    else if (k === "KeyR") castSkill("s2");
    else if (k === "KeyF") castSkill("ult");
    else if (k === "KeyM") toggleSound();
    else if (k === "KeyG") toggleFull();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) >= 0 && (G.state === "play" || G.state === "prep" || G.state === "select")) e.preventDefault();
    startAmbient();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; ptrs = {}; joy.on = false; aimSt = null; });
  function toggleSound() { muted = !muted; if (ambient) ambient.volume = muted ? 0 : .2; var b = document.querySelector("[data-ash-sound]"); if (b) { b.setAttribute("aria-pressed", String(!muted)); b.textContent = muted ? "🔇 Son coupé" : "🔊 Son"; } }
  var sb = document.querySelector("[data-ash-sound]"); if (sb) sb.addEventListener("click", toggleSound);
  var fb = document.querySelector("[data-ash-full]"); if (fb) fb.addEventListener("click", function () { setFull(!full); });

  window.__ash = { get G() { return G; }, spawnKind: spawnKind, dmgEnemy: dmgEnemy, beginSeq2: beginSeq2, SEQ2: SEQ2, WAVES2: WAVES2, W2n: function () { return W2.length; }, trapUp: function (i, sp) { tryTrapUp(G.traps[i], sp); }, trapSell: function (i) { tryTrapSell(G.traps[i]); }, trapStats: trapStats, TRAP: TRAP, nearestPath: nearestPath, buildTrap: function (d) { var q = pos(d); tryTrapBuild({ d: d, x: q.x, z: q.z, dist: 0 }); }, reseed: function (i) { tryTrapReseed(G.traps[i]); }, ep: ep, scr: function (x, z) { return { x: (sx(x) - CAM.x) * CAM.zm + VX, y: (sy(z) - CAM.y) * CAM.zm + VY }; }, cam: function () { return { x: Math.round(CAM.x), y: Math.round(CAM.y), zm: +CAM.zm.toFixed(2), vw: { x0: Math.round(VW.x0), x1: Math.round(VW.x1), y0: Math.round(VW.y0), y1: Math.round(VW.y1) }, MAPW: MAPW, MAPH: Math.round(MAPH), Q: Q }; }, inView: inView, toWorld: toWorld, slots: function () { return slots; }, build: function (i) { tryBuild(slots[i]); }, upgrade: function (i) { tryUpgrade(slots[i].tower); }, sell: function (i) { trySell(slots[i].tower); }, buildType: function (t) { G.bt = t; }, FAM: FAM, TIERCFG: TIERCFG, capOf: capOf, countT: countT, ui: function () { return UI; }, start: startSeq, reset: reset, pick: pickHero, setFull: setFull, joy: joy, W: function () { return W; }, cast: castSkill, choose: chooseUpgrade, hero: function () { return G.hero; }, hurt: function (i, d) { hurtHero(G.heroes[i], d); }, xp: function (n) { gainXp(n); }, attack: function () { heroAttack(); }, coop: function () { return COOP; }, ctl: function () { return ctl; }, view: function () { return { CW: CW, SL: SL, SR: SR, H: H, RS: RS, W: W }; }, RS: function () { return RS; }, toggleFull: toggleFull, tstats: tstats, TOWERS: TOWERS };
  boot();
})();
