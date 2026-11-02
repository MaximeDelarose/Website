/* =========================================================================
   Le Grand Chêne — contenu modifiable à la main
   (moteur et interface : js/idle.js)

   Coûts en glands 🌰 sauf mention contraire. Les coûts « cps » des
   graines de fleurs / cultures / marchandises sont exprimés en secondes de
   production (ils suivent donc ta progression) avec un minimum fixe.
   ========================================================================= */
window.IDLE_DATA = (function () {
  "use strict";

  /* ---------- habitants de la forêt (production automatique) ----------
     cost = prix du premier, cps = glands/s de chacun (×1,15 de prix à chaque achat) */
  var PRODUCERS = [
    { id: "ecureuil", icon: "🐿️", name: "Écureuil cueilleur", cost: 12, cps: 0.1,   desc: "Ramasse les glands tombés au pied du chêne." },
    { id: "pic",      icon: "🐦", name: "Pic-vert",           cost: 140, cps: 0.9,     desc: "Toc toc toc : les glands dégringolent." },
    { id: "herisson", icon: "🦔", name: "Hérisson",           cost: 1600, cps: 7,     desc: "Roule dans les feuilles et repart couvert de glands." },
    { id: "hibou",    icon: "🦉", name: "Hibou",              cost: 2e4, cps: 45,    desc: "Veille la nuit : plus rien ne se perd." },
    { id: "blaireau", icon: "🦡", name: "Blaireau",           cost: 2.6e5, cps: 280,   desc: "Creuse des greniers secrets entre les racines." },
    { id: "renard",   icon: "🦊", name: "Renard",             cost: 3.5e6, cps: 1700,  desc: "Organise des cueillettes… très rusées." },
    { id: "cerf",     icon: "🦌", name: "Cerf",               cost: 5e7, cps: 1e4,  desc: "Secoue les plus hautes branches avec ses bois." },
    { id: "ours",     icon: "🐻", name: "Ours",               cost: 7.5e8, cps: 6e4, desc: "Un gros câlin au tronc et c'est la pluie de glands." },
    { id: "fee",      icon: "🧚", name: "Fée des bois",       cost: 1.2e10, cps: 3.6e5, desc: "Fait mûrir les glands d'un battement d'ailes." },
    { id: "dryade",   icon: "🧝", name: "Dryade",             cost: 2e11, cps: 2.2e6, desc: "L'âme du chêne travaille pour toi." },
    { id: "esprit",   icon: "✨", name: "Esprit ancien",      cost: 3.5e12, cps: 1.3e7,   desc: "Les glands naissent de la lumière." },
    { id: "monde",    icon: "🌌", name: "Chêne-monde",        cost: 6e13, cps: 8e7, desc: "Ses racines touchent les étoiles." }
  ];
  var COST_GROWTH = 1.15;
  /* chaque palier d'exemplaires double la production de l'habitant */
  var MILESTONES = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  /* améliorations uniques par habitant : il en faut « at », coûte cost × prix de base, ×2 */
  var PROD_UPG = [
    { at: 1,   cost: 10,   name: "Entraînement" },
    { at: 5,   cost: 50,   name: "Outils en bois" },
    { at: 25,  cost: 500,  name: "Outils en fer" },
    { at: 50,  cost: 5e4,  name: "Maîtrise" },
    { at: 100, cost: 5e6,  name: "Légende" },
    { at: 150, cost: 5e9,  name: "Mythe" },
    { at: 200, cost: 5e12, name: "Divin" }
  ];

  /* ---------- ta cueillette (améliorations à niveaux) ----------
     cost × growth^niveau ; max = niveau maximum (0 = illimité) */
  var LEVELED = [
    { id: "stick",  icon: "🪵", name: "Bâton de cueilleur", cost: 20,   growth: 1.45, max: 0,  desc: "+1 gland de base par clic." },
    { id: "sap",    icon: "💧", name: "Sève dans les veines", cost: 1000, growth: 4,  max: 15, desc: "Chaque clic rapporte aussi +1 % de ta production par seconde." },
    { id: "crit",   icon: "💥", name: "Coup sec",           cost: 3000, growth: 3.5,  max: 10, desc: "+2 % de chance de clic critique (×10)." },
    { id: "rhythm", icon: "🥁", name: "Rythme",             cost: 2000, growth: 3,    max: 10, desc: "+10 au combo maximum (chaque combo = +3 % par clic)." },
    { id: "auto",   icon: "🐦", name: "Pic tapeur",         cost: 200,  growth: 2.2,  max: 20, desc: "Un pic tape le tronc pour toi : +0,5 clic auto par seconde." },
    { id: "beak",   icon: "⛏️", name: "Bec d'acier",        cost: 5000, growth: 5,    max: 8,  desc: "Les clics auto valent +5 % de ton clic (20 % au départ)." }
  ];

  /* ---------- améliorations uniques globales ---------- */
  var CLICK_UPG = [   // il faut « clicks » clics à la main ; clic ×2
    { clicks: 25,     cost: 500,   name: "Mains agiles" },
    { clicks: 250,    cost: 5e4,   name: "Paume calleuse" },
    { clicks: 1000,   cost: 5e6,   name: "Poigne de fer" },
    { clicks: 5000,   cost: 5e8,   name: "Main de bûcheron" },
    { clicks: 15000,  cost: 5e10,  name: "Main de géant" },
    { clicks: 40000,  cost: 5e12,  name: "Main de titan" },
    { clicks: 100000, cost: 5e14,  name: "Main du chêne" }
  ];
  var SAP_UPG = [     // il faut avoir récolté « at » glands dans la partie ; +1 % prod/s par clic
    { at: 1e5,  cost: 1e5,  name: "Écorce poreuse" },
    { at: 1e8,  cost: 1e8,  name: "Racines sensibles" },
    { at: 1e11, cost: 1e11, name: "Cœur de sève" },
    { at: 1e14, cost: 1e14, name: "Sève céleste" }
  ];
  var GLOBAL_UPG = [  // production ×1,5
    { at: 1e4,  name: "Terre fertile" },
    { at: 1e6,  name: "Pluie d'été" },
    { at: 1e8,  name: "Humus profond" },
    { at: 1e10, name: "Champignons amis" },
    { at: 1e12, name: "Brume nourricière" },
    { at: 1e14, name: "Lune des moissons" },
    { at: 1e16, name: "Sol enchanté" },
    { at: 1e18, name: "Murmure des anciens" }
  ];
  var GOLD_UPG = [    // glands dorés : plus fréquents et plus forts
    { at: 7.77e4, cost: 7.77e5,  name: "Œil de pie" },
    { at: 7.77e7, cost: 7.77e8,  name: "Reflets d'or" },
    { at: 7.77e10, cost: 7.77e11, name: "Fièvre de l'or" }
  ];

  /* ---------- jardin : fleurs en pot ----------
     grow = secondes pour pousser, cps / min = prix, petals = pétales 🌸 à la récolte */
  var FLOWERS = [
    { id: "paquerette", icon: "🌼", name: "Pâquerette",    grow: 60,    cps: 30,   min: 50,    petals: 1,   effect: "Clic ×2 pendant 2 min." },
    { id: "tulipe",     icon: "🌷", name: "Tulipe",        grow: 300,   cps: 120,  min: 500,   petals: 3,   effect: "Production ×1,5 pendant 10 min." },
    { id: "tournesol",  icon: "🌻", name: "Tournesol",     grow: 1200,  cps: 900,  min: 5000,  petals: 8,   effect: "Gagne instantanément 25 min de production.", gain: 1500 },
    { id: "rose",       icon: "🌹", name: "Rose",          grow: 3600,  cps: 1200, min: 5e4,   petals: 20,  effect: "+15 % de critique et critiques ×2 pendant 20 min." },
    { id: "lotus",      icon: "🪷", name: "Lotus",         grow: 10800, cps: 3600, min: 1e6,   petals: 50,  effect: "Donne des graines 🌱 (3 % de ce que valent les glands de la saison, au moins 1).", need: "replant" },
    { id: "lune",       icon: "🌙", name: "Fleur de lune", grow: 28800, cps: 7200, min: 1e8,   petals: 120, effect: "Production +10 % pour toujours.", need: "season" }
  ];
  var BUFFS = {
    daisy:  { icon: "🌼", name: "Pâquerette", dur: 120 },
    tulip:  { icon: "🌷", name: "Tulipe", dur: 600 },
    rose:   { icon: "🌹", name: "Rose", dur: 1200 },
    frenzy: { icon: "🌰", name: "Frénésie dorée", dur: 60 },
    fever:  { icon: "👆", name: "Fièvre du clic", dur: 12 }
  };
  var GARDEN_SHOP = [ // payé en pétales 🌸
    { id: "pot",   icon: "🪴", name: "Pot en terre cuite", cost: 5,  growth: 3,   max: 4, desc: "+1 pot de fleurs." },
    { id: "fert",  icon: "🧪", name: "Engrais floral",     cost: 10, growth: 2.5, max: 5, desc: "Les fleurs poussent 15 % plus vite." },
    { id: "polli", icon: "🦋", name: "Pollinisation",      cost: 15, growth: 2.5, max: 5, desc: "Effets des fleurs +20 % de durée." }
  ];

  /* ---------- ferme : cultures → nourriture 🥫 pour le bétail ---------- */
  var CROPS = [
    { id: "ble",       icon: "🌾", name: "Blé",       grow: 120,  cps: 10,  min: 100, food: 6 },
    { id: "carotte",   icon: "🥕", name: "Carotte",   grow: 600,  cps: 30,  min: 1e3, food: 40 },
    { id: "mais",      icon: "🌽", name: "Maïs",      grow: 1800, cps: 60,  min: 1e4, food: 150 },
    { id: "citrouille",icon: "🎃", name: "Citrouille",grow: 7200, cps: 180, min: 1e5, food: 800 }
  ];
  var FARM_SHOP = [   // payé en glands
    { id: "field", icon: "🟫", name: "Nouvelle parcelle", cost: 2e4, growth: 20, max: 6,  desc: "+1 parcelle à cultiver." },
    { id: "silo",  icon: "🏚️", name: "Grenier",           cost: 1e4, growth: 5,  max: 15, desc: "Capacité de nourriture ×2." },
    { id: "fert",  icon: "💩", name: "Fumier",            cost: 5e4, growth: 6,  max: 10, desc: "Récoltes +25 %." },
    { id: "speed", icon: "🚜", name: "Tracteur",          cost: 1e5, growth: 8,  max: 5,  desc: "Les cultures poussent 20 % plus vite." },
    { id: "scare", icon: "🎎", name: "Épouvantail",       cost: 5e6, growth: 1,  max: 1,  desc: "Récolte et replante tout seul (même hors ligne)." }
  ];
  var FOOD_CAP = 200;

  /* ---------- bétail ----------
     eat = nourriture/min, rate = marchandise/min, bonus = tant qu'il est nourri */
  var ANIMALS = [
    { id: "poule",  icon: "🐔", name: "Poule",   cost: 500,  growth: 1.4,  eat: 0.5, good: "oeuf",   rate: 1,   bonus: "click", val: 0.03, bonusTxt: "+3 % de clic" },
    { id: "mouton", icon: "🐑", name: "Mouton",  cost: 5000, growth: 1.45, eat: 1,   good: "laine",  rate: 0.5, bonus: "prod",  val: 0.02, bonusTxt: "+2 % de production" },
    { id: "cochon", icon: "🐖", name: "Cochon",  cost: 5e4,  growth: 1.5,  eat: 1.5, good: "truffe", rate: 0.2, bonus: "crit",  val: 0.01, bonusTxt: "+1 % de critique" },
    { id: "vache",  icon: "🐄", name: "Vache",   cost: 5e5,  growth: 1.55, eat: 3,   good: "lait",   rate: 1,   bonus: "prod",  val: 0.04, bonusTxt: "+4 % de production" },
    { id: "ruche",  icon: "🐝", name: "Ruche",   cost: 10,   growth: 1.6,  eat: 0,   good: "miel",   rate: 0.3, bonus: "garden",val: 0.05, bonusTxt: "+5 % de pousse au jardin", petals: true, max: 10 }
  ];
  var GOODS = { // sell = secondes de production rapportées par unité
    oeuf:   { icon: "🥚", name: "Œufs",    sell: 2 },
    laine:  { icon: "🧶", name: "Laine",   sell: 6 },
    truffe: { icon: "🍄", name: "Truffes", sell: 20 },
    lait:   { icon: "🥛", name: "Lait",    sell: 5 },
    miel:   { icon: "🍯", name: "Miel",    sell: 10 }
  };
  var RANCH_SHOP = [
    { id: "stable", icon: "🛖", name: "Étable",   cost: 2e4, growth: 6, max: 10, desc: "+4 places pour les animaux (4 au départ)." },
    { id: "cart",   icon: "🛒", name: "Charrette", cost: 1e6, growth: 1, max: 1,  desc: "Vend les marchandises toute seule." }
  ];

  /* ---------- 1er prestige : Replanter → graines 🌱 ----------
     graines totales de la saison = (glands de la saison / 1 M) ^ SEED_POW ; chaque graine gagnée = +5 % à tout */
  var SEED_DIV = 1e6, SEED_POW = 0.25, SEED_BONUS = 0.05;
  var ROOTS = [ // payé en graines
    { id: "seve",    icon: "🌳", name: "Sève éternelle",   cost: 3,  growth: 4,   max: 0,  desc: "Production ×1,5." },
    { id: "poigne",  icon: "✊", name: "Poigne ancestrale", cost: 3,  growth: 5,   max: 0,  desc: "Clic ×2." },
    { id: "pivert",  icon: "🐦", name: "Pic fidèle",        cost: 3,  growth: 2,   max: 5,  desc: "Le pic tapeur repart avec 2 niveaux de plus." },
    { id: "reserve", icon: "🎒", name: "Réserves",          cost: 2,  growth: 2,   max: 8,  desc: "Chaque partie démarre avec 10× plus de glands (1 000 au niv. 1)." },
    { id: "sommeil", icon: "😴", name: "Long sommeil",      cost: 4,  growth: 2,   max: 5,  desc: "Hors ligne : +2 h de durée max et +10 % d'efficacité." },
    { id: "pouce",   icon: "👍", name: "Pouce vert",        cost: 5,  growth: 2,   max: 5,  desc: "Jardin et ferme poussent 10 % plus vite." },
    { id: "pot",     icon: "🪴", name: "Pot de racine",     cost: 3,  growth: 3,   max: 2,  desc: "+1 pot de fleurs." },
    { id: "memoire", icon: "🧠", name: "Mémoire des cimes", cost: 25, growth: 1,   max: 1,  desc: "Garde « Ta cueillette » quand tu replantes." },
    { id: "autobuy", icon: "🤖", name: "Écureuil comptable",cost: 15, growth: 3,   max: 3,  desc: "Achète les habitants tout seul (plus vite à chaque niveau)." },
    { id: "autoupg", icon: "📜", name: "Vieux grimoire",    cost: 30, growth: 1,   max: 1,  desc: "Achète les améliorations uniques tout seul." }
  ];

  /* ---------- 2e prestige : Saisons → essence 🍃 ----------
     essence = √(graines de la saison / 150) ; chaque essence gagnée = +50 % à tout */
  var SEASON_NEED = 150, ESSENCE_BONUS = 0.5;
  var SEASONS = [
    { id: "printemps", icon: "🌸", name: "Printemps", desc: "Jardin et ferme poussent 2× plus vite." },
    { id: "ete",       icon: "☀️", name: "Été",       desc: "Production ×2." },
    { id: "automne",   icon: "🍂", name: "Automne",   desc: "Clic ×3 et glands dorés 2× plus fréquents." },
    { id: "hiver",     icon: "❄️", name: "Hiver",     desc: "Tout ×1,25, bétail ×2 et hors ligne 2× plus efficace." }
  ];
  var PERKS = [ // payé en essence
    { id: "autoreplant", icon: "🔁", name: "Replantation auto", cost: 1, growth: 1, max: 1, desc: "Replante tout seul quand le gain atteint le seuil choisi." },
    { id: "germ",        icon: "🌱", name: "Germination",       cost: 1, growth: 2, max: 10, desc: "Chaque saison démarre avec 10 graines de plus." },
    { id: "memroots",    icon: "🌲", name: "Racines mémorielles", cost: 3, growth: 1, max: 1, desc: "Garde les améliorations de racines en changeant de saison." },
    { id: "berger",      icon: "🧑‍🌾", name: "Berger",          cost: 1, growth: 2, max: 3, desc: "Le bétail mange 25 % de moins." },
    { id: "double",      icon: "🙌", name: "Cueillette double", cost: 2, growth: 4, max: 0, desc: "Clic ×3." },
    { id: "golden",      icon: "🌟", name: "Pluie d'or",        cost: 2, growth: 2.5, max: 5, desc: "Glands dorés 15 % plus fréquents et plus longs." }
  ];

  var GOLDEN = { min: 90, max: 240, life: 13 };

  return {
    PRODUCERS: PRODUCERS, COST_GROWTH: COST_GROWTH, MILESTONES: MILESTONES, PROD_UPG: PROD_UPG,
    LEVELED: LEVELED, CLICK_UPG: CLICK_UPG, SAP_UPG: SAP_UPG, GLOBAL_UPG: GLOBAL_UPG, GOLD_UPG: GOLD_UPG,
    FLOWERS: FLOWERS, BUFFS: BUFFS, GARDEN_SHOP: GARDEN_SHOP,
    CROPS: CROPS, FARM_SHOP: FARM_SHOP, FOOD_CAP: FOOD_CAP,
    ANIMALS: ANIMALS, GOODS: GOODS, RANCH_SHOP: RANCH_SHOP,
    SEED_DIV: SEED_DIV, SEED_POW: SEED_POW, SEED_BONUS: SEED_BONUS, ROOTS: ROOTS,
    SEASON_NEED: SEASON_NEED, ESSENCE_BONUS: ESSENCE_BONUS, SEASONS: SEASONS, PERKS: PERKS,
    GOLDEN: GOLDEN
  };
})();
