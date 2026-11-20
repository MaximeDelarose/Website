/* =========================================================================
   QUELLE VIE ! — données du jeu (cartes, métiers, objets, objectifs, événements)
   Tout le contenu est ici, sous forme de données : pour ajouter une carte,
   ajoute une entrée dans CARDS (les effets sont des « ops » interprétées par
   js/qv-engine.js, voir la liste en bas de ce fichier).
   Ressources : b = bonheur, f = fortune, r = réputation.
   ========================================================================= */
(function (root) {
  "use strict";

  var FAMILIES = {
    career:   { name: "Carrière",   color: "#3d7dd8", ink: "#fff" },
    love:     { name: "Amour",      color: "#e5487a", ink: "#fff" },
    family:   { name: "Famille",    color: "#f08a24", ink: "#fff" },
    home:     { name: "Logement",   color: "#2fa37a", ink: "#fff" },
    leisure:  { name: "Loisirs",    color: "#9b5de5", ink: "#fff" },
    sabotage: { name: "Sabotage",   color: "#2b2140", ink: "#ffd23f" },
    defense:  { name: "Réaction",   color: "#e9eef5", ink: "#2b2140" },
    world:    { name: "Événement",  color: "#ffd23f", ink: "#2b2140" },
  };

  // Métiers : salaire versé au début de chacun de tes tours (+1 par niveau au-dessus du premier).
  var JOBS = {
    livreur:    { titles: ["Livreur·se à vélo", "Chef·fe de meute", "Roi·ne du bitume"], salary: 2, outfit: "delivery" },
    bureau:     { titles: ["Employé·e de bureau", "Manager", "Directeur·rice"], salary: 3, outfit: "office" },
    influence:  { titles: ["Influenceur·se", "Créateur·rice star", "Icône du feed"], salary: 0, perRep: 3, outfit: "influencer" },
    startup:    { titles: ["Fondateur·rice de start-up"], salary: 0, outfit: "hoodie" },
    pdg:        { titles: ["PDG de licorne", "PDG de licorne", "PDG de licorne"], salary: 5, outfit: "ceo" },
  };

  var ITEMS = {
    car:     { name: "Voiture de sport" },
    hamster: { name: "Hamster (Monsieur Croquette)" },
    toaster: { name: "Grille-pain" },
  };

  var HOUSING = ["Le canapé de tes parents", "Appartement", "Maison avec jardin"];

  /* ---------------------------------------------------------------------
     CARTES
     target : "self" (défaut) | "opponent" | "all"
     req    : conditions pour toi (ou pour la cible, dans treq)
     cost   : ressources payées en jouant la carte
     fx     : effets (ops)
     soft   : option « limiter les dégâts » proposée à la cible (coût + effets réduits)
     bounce : bonus si la cible encaisse (en plus de +1 carte et d'un tour à 2 cartes)
     counters : cartes de réaction qui annulent cette carte
     scene  : scène animée jouée chez tout le monde
     --------------------------------------------------------------------- */
  var CARDS = [
    // ---------------- 1. Carrière et formation ----------------
    { key: "petitboulot", fam: "career", name: "Petit boulot", icon: "bike", copies: 3,
      text: "Tu livres des burgers à vélo. Salaire : 2 par tour.", tip: "Métier sans diplôme",
      req: { noJob: true }, fx: [{ op: "job", job: "livreur" }, { op: "res", b: 1 }], life: "Premier job : livreur·se à vélo, payé·e en tickets resto." },
    { key: "diplome", fam: "career", name: "Diplôme en poche", icon: "cap", copies: 3,
      text: "Cinq ans d'études, trois stages non payés. +2 réputation.", tip: "Débloque le bureau",
      fx: [{ op: "diploma" }, { op: "res", r: 2 }], life: "Diplôme obtenu (le jury a ri à la bonne blague)." },
    { key: "bureau", fam: "career", name: "Poste de bureau", icon: "tie", copies: 3,
      text: "Open space, badge et machine à café capricieuse. Salaire : 3 par tour.", tip: "Il faut un diplôme",
      req: { diploma: 1, notJob: "bureau" }, fx: [{ op: "job", job: "bureau" }, { op: "res", r: 1 }], life: "Embauché·e dans un open space. Bureau près de la clim." },
    { key: "promotion", fam: "career", name: "Promotion", icon: "arrow", copies: 4,
      text: "Salaire +1, +2 réputation, et un ego XXL.", tip: "Il faut un métier",
      req: { promotable: true }, fx: [{ op: "jobUp" }, { op: "res", r: 2 }], scene: "promotion", life: "Promotion ! Les collègues ont applaudi. Mollement." },
    { key: "influence", fam: "career", name: "Devenir influenceur·se", icon: "phone", copies: 2,
      text: "Ton salaire = ta réputation ÷ 3. Gare aux bad buzz…", tip: "Il faut 3 réputation",
      req: { minR: 3, notJob: "influence" }, fx: [{ op: "job", job: "influence" }, { op: "res", b: 1 }], life: "Lance sa chaîne : « Je teste des sandwichs ratés »." },
    { key: "startup", fam: "career", name: "Lancer sa start-up", icon: "rocket", copies: 2,
      text: "Coûte 3. Dans 2 tours : licorne (PDG, salaire 5, +4 réputation)… ou faillite.", tip: "60 % de chances",
      cost: { f: 3 }, fx: [{ op: "startup" }], life: "Fonde une start-up : « Uber, mais pour les chaussettes »." },

    // ---------------- 2. Amour et relations ----------------
    { key: "foudre", fam: "love", name: "Coup de foudre", icon: "heart", copies: 4,
      text: "Rencontre l'amour à la boulangerie. +3 bonheur.", tip: "Il faut être célibataire",
      req: { single: true }, fx: [{ op: "partner" }, { op: "res", b: 3 }], life: "Coup de foudre pour {partner}, au rayon pains au chocolat." },
    { key: "mariage", fam: "love", name: "Mariage", icon: "rings", copies: 3,
      text: "Coûte 2. +4 bonheur, +1 réputation, et un DJ qui passe la Danse des canards.", tip: "Il faut un·e partenaire",
      req: { partner: true, notMarried: true }, cost: { f: 2 }, fx: [{ op: "marry" }, { op: "res", b: 4, r: 1 }], scene: "mariage", life: "Mariage avec {partner}. Tonton a fait un discours de 40 minutes." },
    { key: "diner", fam: "love", name: "Dîner aux chandelles", icon: "candle", copies: 2,
      text: "+2 bonheur. +2 de plus si tu es en couple.", tip: "",
      fx: [{ op: "res", b: 2 }, { op: "ifPartner", fx: [{ op: "res", b: 2 }] }], life: "Dîner aux chandelles. La nappe a pris feu, mais c'était romantique." },

    // ---------------- 3. Famille ----------------
    { key: "bebe", fam: "family", name: "Bébé surprise", icon: "baby", copies: 4,
      text: "+3 bonheur. Chaque enfant : +1 bonheur et −1 fortune à chacun de tes tours.", tip: "Il faut un·e partenaire",
      req: { partner: true }, fx: [{ op: "kid" }, { op: "res", b: 3 }], scene: "bebe", life: "Naissance de {kid}. Personne n'a dormi pendant 3 ans." },
    { key: "hamster", fam: "family", name: "Adopter un hamster", icon: "hamster", copies: 2,
      text: "+2 bonheur. Monsieur Croquette emménage. Il juge tout le monde.", tip: "",
      req: { notItem: "hamster" }, fx: [{ op: "item", item: "hamster" }, { op: "res", b: 2 }], life: "Adopte Monsieur Croquette, un hamster au regard sévère." },
    { key: "heritage", fam: "family", name: "Héritage de tata Ginette", icon: "chest", copies: 2,
      text: "+4 fortune. +2 de plus si tu as des enfants (elle adorait les petits).", tip: "",
      fx: [{ op: "res", f: 4 }, { op: "ifKids", fx: [{ op: "res", f: 2 }] }], life: "Hérite de tata Ginette : de l'argent et 14 bibelots de chats." },

    // ---------------- 4. Logements et possessions ----------------
    { key: "appart", fam: "home", name: "Appartement", icon: "flat", copies: 3,
      text: "Coûte 3. Enfin quitter le canapé des parents ! +2 bonheur, +1 réputation.", tip: "",
      req: { maxHousing: 0 }, cost: { f: 3 }, fx: [{ op: "housing", level: 1 }, { op: "res", b: 2, r: 1 }], life: "Quitte enfin le canapé de ses parents pour un appartement." },
    { key: "maison", fam: "home", name: "Maison avec jardin", icon: "house", copies: 3,
      text: "Coûte 6. +5 bonheur, +3 réputation. Les voisins sont déjà jaloux.", tip: "Il faut un appartement",
      req: { housing: 1, maxHousing: 1 }, cost: { f: 6 }, fx: [{ op: "housing", level: 2 }, { op: "res", b: 5, r: 3 }], life: "Achète une maison avec jardin (et un nain de jardin offert)." },
    { key: "voiture", fam: "home", name: "Voiture de sport", icon: "car", copies: 2,
      text: "Coûte 4. +4 réputation, +2 bonheur. Consommation : déraisonnable.", tip: "",
      req: { notItem: "car" }, cost: { f: 4 }, fx: [{ op: "item", item: "car" }, { op: "res", r: 4, b: 2 }], life: "S'offre une voiture de sport rouge. Crise de la quarantaine ?" },

    // ---------------- 5. Loisirs et opportunités ----------------
    { key: "voyage", fam: "leisure", name: "Voyage au bout du monde", icon: "plane", copies: 3,
      text: "Coûte 2. +4 bonheur. 900 photos de couchers de soleil.", tip: "",
      cost: { f: 2 }, fx: [{ op: "res", b: 4 }], life: "Voyage au bout du monde. Revient avec un tatouage regrettable." },
    { key: "grattage", fam: "leisure", name: "Ticket à gratter", icon: "ticket", copies: 3,
      text: "Gagne entre 1 et 7 fortune. (Surtout 1.)", tip: "Hasard",
      fx: [{ op: "lottery" }], life: "Gagne {amount} au ticket à gratter. Le raconte à tout le monde." },
    { key: "benevolat", fam: "leisure", name: "Bénévolat", icon: "hands", copies: 3,
      text: "+3 réputation, +1 bonheur. Et ça efface un scandale.", tip: "",
      fx: [{ op: "res", r: 3, b: 1 }, { op: "clearScandal" }], life: "Bénévole aux Restos du quartier. A épluché 400 kg de patates." },

    // ---------------- 6. Sabotages et catastrophes ----------------
    { key: "licenciement", fam: "sabotage", name: "Licenciement", icon: "box", copies: 3, target: "opponent",
      text: "La cible perd son métier et 2 réputation.", tip: "Vise quelqu'un qui travaille",
      treq: { hasJob: true }, fx: [{ op: "loseJob" }, { op: "res", r: -2 }], counters: ["syndicat", "renvoi"],
      soft: { cost: { f: 3 }, label: "Négocier : rétrogradé·e au lieu d'être viré·e", fx: [{ op: "jobDown" }] },
      bounce: { label: "Prime de départ : +3 fortune", fx: [{ op: "res", f: 3 }] },
      scene: "licenciement", life: "Licencié·e. Remplacé·e par un stagiaire qui a déjà changé le fond d'écran." },
    { key: "divorce", fam: "sabotage", name: "Divorce", icon: "broken", copies: 3, target: "opponent",
      text: "La cible perd son·sa partenaire, 3 bonheur et la moitié de sa fortune. Il lui reste le grille-pain.", tip: "Vise un couple",
      treq: { partner: true }, fx: [{ op: "divorce" }], counters: ["avocat", "renvoi"],
      soft: { cost: { f: 3 }, label: "Divorce à l'amiable : tu gardes ta fortune", fx: [{ op: "divorce", soft: true }] },
      bounce: { label: "Liberté retrouvée : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "divorce", life: "Divorce avec {partner}. Repart avec une valise et le grille-pain." },
    { key: "badbuzz", fam: "sabotage", name: "Bad buzz", icon: "viral", copies: 3, target: "opponent",
      text: "Une vidéo gênante devient virale : −4 réputation, et scandale pendant 2 tours.", tip: "Scandale : −1 réputation par tour",
      treq: { minR: 1 }, fx: [{ op: "res", r: -4 }, { op: "scandal", turns: 2 }], counters: ["community", "renvoi"],
      soft: { cost: { f: 2 }, label: "Excuses publiques : seulement −2 réputation", fx: [{ op: "res", r: -2 }] },
      bounce: { label: "Toute pub est bonne à prendre : +2 fortune", fx: [{ op: "res", f: 2 }] },
      scene: "badbuzz", life: "Devient viral·e en dansant la macarena au mariage d'un inconnu." },
    { key: "degat", fam: "sabotage", name: "Dégât des eaux", icon: "drop", copies: 2, target: "opponent",
      text: "Le voisin du dessus a oublié son bain. La cible perd 3 fortune et 1 bonheur.", tip: "",
      treq: { minF: 1 }, fx: [{ op: "res", f: -3, b: -1 }], counters: ["assurance", "renvoi"],
      soft: { cost: { b: 1 }, label: "Réparer soi-même : seulement −1 fortune", fx: [{ op: "res", f: -1 }] },
      bounce: { label: "Le voisin s'excuse avec un gâteau : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "degat", life: "Dégât des eaux. Le plafond a cédé pendant l'apéro." },
    { key: "fisc", fam: "sabotage", name: "Contrôle fiscal", icon: "magnifier", copies: 2, target: "opponent",
      text: "La cible perd le tiers de sa fortune (au moins 2).", tip: "Vise les riches",
      treq: { minF: 2 }, fx: [{ op: "taxThird" }], counters: ["avocat", "renvoi"],
      soft: { cost: { r: 2 }, label: "Arrangement à l'amiable : seulement −2 fortune", fx: [{ op: "res", f: -2 }] },
      bounce: { label: "Remboursement d'un trop-perçu : +1 fortune, +1 bonheur", fx: [{ op: "res", f: 1, b: 1 }] },
      scene: "fisc", life: "Contrôle fiscal. Le contrôleur a trouvé les tickets de grattage." },

    // ---------------- 7. Défenses et réactions (se jouent quand on est visé) ----------------
    { key: "avocat", fam: "defense", name: "Avocat requin", icon: "shark", copies: 2, reaction: true,
      text: "Annule un divorce ou un contrôle fiscal. L'attaquant paie 2 de frais.", tip: "Réaction",
      onDefend: [{ op: "res", who: "attacker", f: -2 }] },
    { key: "syndicat", fam: "defense", name: "Syndicat", icon: "megaphone", copies: 2, reaction: true,
      text: "Annule un licenciement. Grève victorieuse : +1 réputation.", tip: "Réaction",
      onDefend: [{ op: "res", r: 1 }] },
    { key: "community", fam: "defense", name: "Community manager", icon: "shield", copies: 2, reaction: true,
      text: "Annule un bad buzz. Ton CM transforme le malaise en mème : +1 réputation.", tip: "Réaction",
      onDefend: [{ op: "res", r: 1 }] },
    { key: "assurance", fam: "defense", name: "Assurance tous risques", icon: "umbrella", copies: 2, reaction: true,
      text: "Annule un dégât des eaux. L'assureur rembourse même le canapé : +1 fortune.", tip: "Réaction",
      onDefend: [{ op: "res", f: 1 }] },
    { key: "renvoi", fam: "defense", name: "Retour à l'envoyeur", icon: "boomerang", copies: 2, reaction: true,
      text: "Renvoie n'importe quel sabotage à celui ou celle qui l'a joué.", tip: "Réaction",
      reflect: true },

    // ---------------- 8. Événements collectifs ----------------
    { key: "crise", fam: "world", name: "Crise économique", icon: "chart", copies: 1, target: "all",
      text: "Tout le monde perd 3 fortune. Le plus pauvre découvre la sobriété heureuse : +3 bonheur.", tip: "Tout le monde",
      fx: [{ op: "crisis" }], scene: "crise", life: "A déclenché une crise économique (en vendant ses actions de chaussettes)." },
    { key: "karaoke", fam: "world", name: "Soirée karaoké", icon: "mic", copies: 2, target: "all",
      text: "Tout le monde +1 bonheur. La personne la plus réputée chante faux devant tout le monde : −2 réputation.", tip: "Tout le monde",
      fx: [{ op: "karaoke" }], scene: "karaoke", life: "Organise une soirée karaoké mémorable (pour de mauvaises raisons)." },
    { key: "greve", fam: "world", name: "Grève générale", icon: "sign", copies: 1, target: "all",
      text: "Au prochain tour, personne ne touche de salaire. Ceux qui n'ont pas de métier : +2 bonheur.", tip: "Tout le monde",
      fx: [{ op: "strike" }], scene: "greve", life: "Lance une grève générale depuis le canapé." },
  ];

  /* ---------------------------------------------------------------------
     ÉVÉNEMENTS DE SAISON : un par décennie (tous les 2 tours de table),
     révélés automatiquement à tout le monde.
     --------------------------------------------------------------------- */
  var EVENTS = [
    { key: "canicule", name: "Canicule", icon: "sun", text: "Ceux qui ont une maison avec jardin font des barbecues : +2 bonheur. Les autres transpirent : −1 bonheur.", fx: [{ op: "eachIf", cond: { housing: 2 }, fx: [{ op: "res", b: 2 }], else: [{ op: "res", b: -1 }] }] },
    { key: "cousin", name: "Mariage du cousin Kévin", icon: "rings", text: "Tout le monde est invité. +1 bonheur, −1 fortune (la liste de mariage était chez un grand magasin).", fx: [{ op: "each", fx: [{ op: "res", b: 1, f: -1 }] }] },
    { key: "immo", name: "Bulle immobilière", icon: "house", text: "Les propriétaires d'un logement gagnent +2 fortune (+3 avec une maison).", fx: [{ op: "eachIf", cond: { housing: 1 }, fx: [{ op: "res", f: 2 }, { op: "ifHousing", level: 2, fx: [{ op: "res", f: 1 }] }] }] },
    { key: "retro", name: "La mode du rétro", icon: "toaster", text: "Les grille-pains vintage valent une fortune ! Chaque grille-pain : +4 fortune et +2 réputation.", fx: [{ op: "eachIf", cond: { item: "toaster" }, fx: [{ op: "res", f: 4, r: 2 }] }] },
    { key: "chatons", name: "Épidémie de vidéos de hamsters", icon: "hamster", text: "Internet adore les rongeurs. Ceux qui ont un hamster : +3 réputation. Les influenceurs : +2 fortune.", fx: [{ op: "eachIf", cond: { item: "hamster" }, fx: [{ op: "res", r: 3 }] }, { op: "eachIf", cond: { job: "influence" }, fx: [{ op: "res", f: 2 }] }] },
    { key: "reunion", name: "Réunion des anciens du lycée", icon: "cap", text: "Chacun compare sa vie. Ceux qui ont un métier : +2 réputation. Les autres racontent qu'ils « se cherchent » : +1 bonheur.", fx: [{ op: "eachIf", cond: { hasJob: true }, fx: [{ op: "res", r: 2 }], else: [{ op: "res", b: 1 }] }] },
    { key: "soldes", name: "Les soldes", icon: "ticket", text: "Tout le monde craque : −2 fortune, +2 bonheur. Ceux qui sont à sec ne peuvent que regarder : +0.", fx: [{ op: "eachIf", cond: { minF: 2 }, fx: [{ op: "res", f: -2, b: 2 }] }] },
  ];

  /* ---------------------------------------------------------------------
     OBJECTIFS SECRETS : chaque joueur en reçoit 2 au début.
     --------------------------------------------------------------------- */
  var OBJECTIVES = [
    { key: "tribu", name: "Famille nombreuse", text: "Avoir au moins 2 enfants.", pts: 9, check: { kids: 2 } },
    { key: "carriere", name: "Dents longues", text: "Atteindre le niveau 3 d'un métier, ou devenir PDG.", pts: 8, check: { jobTop: true } },
    { key: "proprio", name: "Propriétaire", text: "Finir dans une maison avec jardin.", pts: 8, check: { housing: 2 } },
    { key: "star", name: "Star", text: "Finir avec au moins 12 réputation.", pts: 8, check: { minR: 12 } },
    { key: "picsou", name: "Picsou", text: "Finir avec au moins 15 fortune.", pts: 8, check: { minF: 15 } },
    { key: "zen", name: "Zénitude", text: "Finir avec au moins 25 bonheur.", pts: 8, check: { minB: 25 } },
    { key: "peste", name: "Peste", text: "Réussir au moins 3 sabotages.", pts: 9, check: { sabotages: 3 } },
    { key: "phenix", name: "Phénix", text: "Encaisser au moins 2 catastrophes et finir avec 15 bonheur ou plus.", pts: 10, check: { hits: 2, minB: 15 } },
    { key: "amour", name: "Pour la vie", text: "Être marié·e à la fin de la partie.", pts: 7, check: { married: true } },
    { key: "grillepain", name: "Le grille-pain d'or", text: "Posséder un grille-pain à la fin. (Oui, il faut divorcer.)", pts: 9, check: { item: "toaster" } },
    { key: "baroudeur", name: "Grand voyageur", text: "Faire au moins 2 voyages au bout du monde.", pts: 8, check: { played: { voyage: 2 } } },
  ];

  // Prénoms des partenaires, enfants, collègues… générés.
  var NAMES = {
    partner: ["Jean-Michel", "Samia", "Kevin", "Brigitte", "Lou", "Yanis", "Clémentine", "Bertrand", "Inès", "Gérald", "Maëva", "Dominique", "Rachid", "Solange", "Enzo", "Nadia"],
    kid: ["Kylian", "Jade", "Léo", "Alba", "Timéo", "Rose", "Nino", "Lina", "Gaspard", "Mia", "Sacha", "Zoé"],
    bot: ["Robert", "Ginette", "Patrick", "Sylvie", "Michel", "Josiane"],
  };

  // Durée : nombre de tours de table selon le nombre de joueurs (vise 15-25 min).
  var ROUNDS = { 2: 12, 3: 10, 4: 9, 5: 8, 6: 7 };
  var START_AGE = 20, AGE_STEP = 5;
  var HAND_SIZE = 5;
  // Trophées de fin : la personne la plus heureuse, la plus riche et la plus célèbre gagnent chacune ce bonus.
  var TROPHIES = [
    { k: "b", name: "La plus belle vie", pts: 4 },
    { k: "f", name: "Le compte en banque", pts: 4 },
    { k: "r", name: "La célébrité", pts: 4 },
  ];

  root.QV_DATA = {
    FAMILIES: FAMILIES, JOBS: JOBS, ITEMS: ITEMS, HOUSING: HOUSING,
    CARDS: CARDS, EVENTS: EVENTS, OBJECTIVES: OBJECTIVES, NAMES: NAMES,
    ROUNDS: ROUNDS, START_AGE: START_AGE, AGE_STEP: AGE_STEP, HAND_SIZE: HAND_SIZE, TROPHIES: TROPHIES,
    byKey: CARDS.reduce(function (m, c) { m[c.key] = c; return m; }, {}),
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.QV_DATA;
})(typeof window !== "undefined" ? window : globalThis);

/* Ops disponibles (qv-engine.js) :
   res {b,f,r, who?}       ajoute/retire des ressources (who: "self" | "attacker")
   job {job} · jobUp · jobDown · loseJob · diploma
   partner · marry · divorce {soft?} · kid · item {item} · housing {level}
   startup · lottery · clearScandal · scandal {turns} · taxThird
   ifPartner/ifKids/ifHousing {fx}
   crisis · karaoke · strike           (cartes collectives)
   each {fx} · eachIf {cond, fx, else} (événements de saison) */
