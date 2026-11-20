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

  /* =====================================================================
     EXTENSION 2 : découverte progressive, 24 nouvelles cartes, mode 18+
     ===================================================================== */
  JOBS.mystique = { titles: ["Chaman·e de quartier", "Guide spirituel·le", "Gourou certifié·e"], salary: 1, outfit: "mystic" };
  ITEMS.dog = { name: "Chien héritier (Lord Biscotte)", income: { f: 1 } };
  ITEMS.tattoo = { name: "Tatouage « Kevin » sur la fesse" };

  /* États durables affichés sur le personnage.
     tick : effets à chacun de ses tours · risk : tirage à chaque tour (fait sauter l'état)
     onEnd : effets quand l'état expire · perm : ne s'use pas · bad : effacé par les cartes de rebond */
  var STATUSES = {
    squat:     { label: "Squatteur à la maison", bad: true, tick: [{ op: "res", b: -1 }] },
    liar:      { label: "CV bidon", bad: true, perm: true, risk: { p: 0.25, fx: [{ op: "loseJob" }, { op: "res", r: -3 }], scene: "demasque", text: "{name} est démasqué·e : le CV mentionnait un stage à la NASA.", life: "Démasqué·e : le CV était inventé de A à Z." } },
    proces:    { label: "Procès avec le voisin", bad: true },
    fame:      { label: "Star d'un jour", onEnd: [{ op: "res", r: -2 }], endText: "Fin du quart d'heure de gloire pour {name} : −2 réputation." },
    babyinf:   { label: "Bébé influenceur", perm: true, tick: [{ op: "res", f: 2, b: -1 }] },
    ex:        { label: "Un ex rôde", bad: true },
    fakeDip:   { label: "Diplôme douteux", bad: true, perm: true },
    doublevie: { label: "Double vie", perm: true, adult: true, tick: [{ op: "res", b: 2 }], risk: { p: 0.3, fx: [{ op: "breakup" }, { op: "res", r: -3 }, { op: "scandal", turns: 2 }], scene: "doubleVieBust", text: "La double vie de {name} éclate au grand jour : les deux familles se croisent au supermarché.", life: "La double vie explose au rayon surgelés." } },
    sugar:     { label: "Sugar daddy fauché", bad: true, adult: true, tick: [{ op: "res", f: -2 }] },
  };

  /* Découverte progressive : étape débloquée selon le tour de table (mode découverte),
     taille de main visée à chaque étape, et ce qu'on présente au joueur. */
  var STAGES = [
    null,
    { hand: 1, title: "Ta vie commence", text: "Une carte, un choix : joue-la ou souffle un coup. Les cartes te font gagner bonheur, fortune ou réputation." },
    { hand: 3, title: "Amour, famille et logement", text: "Nouvelles cartes : rencontres, enfants, appartement… Certaines ont des conditions (il faut un·e partenaire, un logement…)." },
    { hand: 4, title: "Les coups bas arrivent", text: "Les cartes noires visent un adversaire. Quand on t'attaque : contre-la, paie pour limiter les dégâts, ou encaisse pour rebondir." },
    { hand: 5, title: "Combinaisons", text: "Promotions, mariages, start-up, procès… Les cartes avancées se combinent entre elles. Pense à tes objectifs secrets !" },
    { hand: 5, title: "Toutes les cartes", text: "Événements pour toute la table et jeu complet. À toi de jouer !" },
  ];
  function stageForRound(r) { return r >= 7 ? 5 : r >= 5 ? 4 : r >= 3 ? 3 : r; }

  // Étape d'apparition des cartes déjà existantes
  var TIERS = {
    petitboulot: 1, diplome: 1, diner: 1, voyage: 1, grattage: 1, benevolat: 1, hamster: 1,
    foudre: 2, appart: 2, voiture: 2, heritage: 2, bureau: 2, influence: 2,
    licenciement: 3, divorce: 3, badbuzz: 3, degat: 3, fisc: 3, avocat: 3, syndicat: 3, community: 3, assurance: 3, renvoi: 3,
    promotion: 4, mariage: 4, bebe: 4, maison: 4, startup: 4,
    crise: 5, karaoke: 5, greve: 5,
  };
  CARDS.forEach(function (c) { c.tier = TIERS[c.key] || 4; });
  // ajustements des cartes existantes pour les nouvelles mécaniques
  function patch(key, f) { CARDS.forEach(function (c) { if (c.key === key) f(c); }); }
  patch("mariage", function (c) { c.req.noStatus = ["ex"]; });
  // chaque ressource débloque quelque chose (en plus de compter pour la victoire)
  patch("mariage", function (c) { c.req.minB = 4; c.tip = "En couple et 4 Bonheur"; });
  patch("bebe", function (c) { c.req.minB = 5; c.tip = "En couple et 5 Bonheur"; });
  patch("promotion", function (c) { c.req.minR = 2; c.tip = "Un métier et 2 Réputation"; });
  patch("mariagesponso", function (c) { c.req.minR = 4; c.tip = "En couple et 4 Réputation (les sponsors veulent du beau monde)"; });
  patch("appart", function (c) { c.req.noStatus = ["proces"]; });
  patch("maison", function (c) { c.req.noStatus = ["proces"]; });
  patch("fisc", function (c) { c.counters.push("miracle"); });
  ["licenciement", "divorce", "badbuzz", "degat", "fisc"].forEach(function (k) { patch(k, function (c) { c.per4 = 1; }); });

  var NEW_CARDS = [
    // ---- Carrière ----
    { key: "cdimensonge", fam: "career", tier: 4, name: "Le CDI du mensonge", icon: "pinocchio", copies: 2,
      text: "Un CV 100 % inventé : poste de bureau sans diplôme (salaire 3). Mais chaque tour, 1 risque sur 4 d'être démasqué·e.", tip: "Il ne faut pas de métier",
      req: { noJob: true }, fx: [{ op: "job", job: "bureau" }, { op: "status", s: "liar", n: 99 }], life: "Embauché·e grâce à un CV qui cite « trois ans chez la NASA »." },
    { key: "fauxdiplome", fam: "career", tier: 2, name: "Le faux diplôme", icon: "fakediploma", copies: 2,
      text: "+1 diplôme, +2 réputation. Imprimé chez soi. Lors d'une promotion, 1 chance sur 2 que quelqu'un vérifie…", tip: "Combo risqué avec Promotion",
      fx: [{ op: "diploma" }, { op: "res", r: 2 }, { op: "status", s: "fakeDip", n: 99 }], life: "Obtient un master en « Management du Futur » sur une imprimante de bureau." },
    { key: "reconversion", fam: "career", tier: 4, name: "Reconversion mystique", icon: "crystal", copies: 2,
      text: "Tu plaques tout pour lire l'avenir dans les pâtes. Métier : chaman·e (salaire 1), +4 bonheur, scandale effacé.", tip: "Remplace ton métier",
      fx: [{ op: "job", job: "mystique" }, { op: "res", b: 4 }, { op: "clearScandal" }], scene: "mystique", life: "Reconversion mystique : lit l'avenir dans les coquillettes." },
    { key: "retraite", fam: "career", tier: 4, name: "La retraite anticipée", icon: "hammock", copies: 2,
      text: "Fin du métier, +4 bonheur et +3 fortune d'indemnités. Hamac, chemise à fleurs, sieste.", tip: "Il faut un métier et 40 ans",
      req: { hasJob: true, minAge: 40 }, fx: [{ op: "loseJob" }, { op: "retire" }, { op: "res", b: 4, f: 3 }], scene: "retraite", life: "Retraite anticipée : apprend le ukulélé, mal." },
    // ---- Amour ----
    { key: "mariagesponso", fam: "love", tier: 4, name: "Le mariage sponsorisé", icon: "ringlogo", copies: 2,
      text: "Mariage gratuit : les sponsors paient tout. +2 bonheur, +3 fortune, −1 réputation (le gâteau a la forme d'une marque de soda).", tip: "Il faut un·e partenaire",
      req: { partner: true, notMarried: true, noStatus: ["ex"] }, fx: [{ op: "marry" }, { op: "res", b: 2, f: 3, r: -1 }], scene: "mariageSponso", life: "Mariage sponsorisé avec {partner}. Les vœux étaient lus par une pub de 30 secondes." },
    { key: "mariageraison", fam: "love", tier: 4, name: "Le mariage de raison", icon: "briefcaseheart", copies: 2,
      text: "Tu épouses un·e riche inconnu·e : +5 fortune, −2 bonheur. C'est l'amour… du portefeuille.", tip: "Il faut être célibataire",
      req: { single: true }, fx: [{ op: "partner", look: "ceo" }, { op: "marry" }, { op: "res", f: 5, b: -2 }], scene: "mariageRaison", life: "Épouse {partner} pour son yacht. Ils se vouvoient." },
    { key: "ex", fam: "sabotage", tier: 4, name: "Un ex trop présent", icon: "ghost", copies: 2, target: "opponent", per4: 1,
      text: "L'ex de la cible commente toutes ses photos : −2 bonheur, et impossible de se marier pendant 2 tours.", tip: "Vise un couple",
      treq: { partner: true }, fx: [{ op: "res", b: -2 }, { op: "status", s: "ex", n: 2 }, { op: "ifMarried", fx: [{ op: "res", r: -1 }] }], counters: ["avocat", "renvoi"],
      soft: { cost: { f: 2 }, label: "Bloquer l'ex partout : seulement −1 bonheur", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "Ton·ta partenaire te rassure : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "ex", life: "Son ex « passait dans le quartier ». Trois fois par jour." },
    // ---- Famille ----
    { key: "heritagesurprise", fam: "family", tier: 2, name: "L'héritage surprise", icon: "envelope", copies: 2,
      text: "Un grand-oncle inconnu te lègue… 2 fois sur 3 : +6 fortune. Sinon : ses dettes (−2 fortune).", tip: "Hasard",
      fx: [{ op: "chance", p: 0.66, fx: [{ op: "res", f: 6 }, { op: "scene", id: "heritageWin" }], else: [{ op: "res", f: -2 }, { op: "scene", id: "heritageFail" }] }], life: "Hérite d'un grand-oncle inconnu. Surprise !" },
    { key: "chien", fam: "family", tier: 2, name: "Le chien héritier", icon: "dog", copies: 2,
      text: "Tu adoptes Lord Biscotte, un chien plus riche que toi : +2 bonheur et +1 fortune par tour (sa rente).", tip: "",
      req: { notItem: "dog" }, fx: [{ op: "item", item: "dog" }, { op: "res", b: 2 }], scene: "chien", life: "Adopte Lord Biscotte, un chien qui a hérité d'un château." },
    { key: "bebeinflu", fam: "family", tier: 4, name: "Le bébé influenceur", icon: "babyphone", copies: 2,
      text: "Ton bébé a plus d'abonnés que toi : +2 réputation, puis +2 fortune et −1 bonheur à chacun de tes tours.", tip: "Il faut un enfant",
      req: { kids: 1, noStatus: ["babyinf"] }, fx: [{ op: "res", r: 2 }, { op: "status", s: "babyinf", n: 99 }], scene: "bebeInflu", life: "Le bébé signe un contrat avec une marque de compotes." },
    { key: "cousin", fam: "sabotage", tier: 3, name: "Le cousin opportuniste", icon: "grab", copies: 2, target: "opponent", per4: 1,
      text: "Le cousin « passe dire bonjour » et repart avec une carte au hasard de la main de la cible… pour toi.", tip: "Vole une carte",
      treq: { minHand: 1 }, fx: [{ op: "stealCard" }], counters: ["renvoi"],
      soft: { cost: { f: 2 }, label: "Lui prêter 2 (tu ne les reverras jamais)", fx: [{ op: "give", f: 2 }] },
      bounce: { label: "Enfin parti : +1 bonheur", fx: [{ op: "res", b: 1 }] },
      scene: "cousin", life: "Le cousin Jordan passe « juste dire bonjour ». Il repart avec le micro-ondes." },
    // ---- Logement ----
    { key: "squatteur", fam: "sabotage", tier: 3, name: "Le colocataire squatteur", icon: "mattress", copies: 2, target: "opponent", per4: 1,
      text: "Un « ami » s'installe chez la cible « pour deux semaines » : −1 bonheur à chacun de ses tours pendant 3 tours.", tip: "",
      fx: [{ op: "status", s: "squat", n: 3 }], counters: ["avocat", "renvoi"],
      soft: { cost: { f: 2 }, label: "Lui payer l'hôtel : il part tout de suite", fx: [] },
      bounce: { label: "Il a fait la vaisselle une fois : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "squat", life: "Un colocataire squatteur s'installe sur le canapé. Il mange tous les yaourts." },
    { key: "voisin", fam: "sabotage", tier: 3, name: "Le voisin procédurier", icon: "letter", copies: 2, target: "opponent",
      text: "Lettre recommandée pour « bruit de pas » : −2 fortune, −1 bonheur, et impossible de déménager pendant 2 tours.", tip: "",
      fx: [{ op: "res", f: -2, b: -1 }, { op: "status", s: "proces", n: 2 }], counters: ["avocat", "miracle", "renvoi"],
      soft: { cost: { r: 1 }, label: "S'excuser avec un gâteau : seulement −1 fortune", fx: [{ op: "res", f: -1 }] },
      bounce: { label: "Tout l'immeuble te soutient : +1 réputation", fx: [{ op: "res", r: 1 }] },
      scene: "voisin", life: "Le voisin du dessous porte plainte pour « marche trop bruyante »." },
    { key: "retourmaman", fam: "sabotage", tier: 4, name: "Retour chez maman", icon: "couch", copies: 2, target: "opponent",
      text: "La cible perd son logement d'un cran et 1 bonheur. Maman a gardé sa chambre d'ado intacte.", tip: "Vise quelqu'un qui a un logement",
      treq: { housing: 1 }, fx: [{ op: "housingDown" }, { op: "res", b: -1 }], counters: ["assurance", "renvoi"],
      soft: { cost: { f: 3 }, label: "Payer les loyers en retard : tu gardes ton logement", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "Maman cuisine et tu ne paies plus de loyer : +2 bonheur, +2 fortune", fx: [{ op: "res", b: 2, f: 2 }] },
      scene: "maman", life: "Retour chez maman, dans la chambre aux posters de 2009." },
    // ---- Loisirs et opportunités ----
    { key: "loto", fam: "leisure", tier: 1, name: "Le loto du dimanche", icon: "balls", copies: 2,
      text: "Coûte 1. Une chance sur 8 de gagner 12 ! Sinon, 1 chance sur 3 de gagner 2.", tip: "Hasard",
      cost: { f: 1 }, fx: [{ op: "chance", p: 0.125, fx: [{ op: "res", f: 12, b: 2 }, { op: "scene", id: "lotoWin" }], else: [{ op: "chance", p: 0.35, fx: [{ op: "res", f: 2 }] }] }], life: "Joue au loto du dimanche, avec les dates d'anniversaire du chat." },
    { key: "investissement", fam: "leisure", tier: 4, name: "Investissement catastrophique", icon: "crash", copies: 2,
      text: "Coûte 4. 3 fois sur 10, ça décolle : +11 fortune. Sinon, la crypto-chaussette s'effondre (−1 réputation).", tip: "Hasard",
      cost: { f: 4 }, fx: [{ op: "chance", p: 0.3, fx: [{ op: "res", f: 11 }, { op: "scene", id: "investWin" }], else: [{ op: "res", r: -1 }, { op: "scene", id: "investFail" }] }], life: "Investit toutes ses économies dans le ChaussetteCoin." },
    { key: "star", fam: "leisure", tier: 4, name: "La star d'un jour", icon: "spotlight", copies: 2,
      text: "+5 réputation tout de suite… puis −2 au tour suivant, quand plus personne ne se souvient de toi.", tip: "Effet différé",
      fx: [{ op: "res", r: 5 }, { op: "status", s: "fame", n: 1 }], scene: "star", life: "Passe au JT régional pour avoir sauvé un chat d'un arbre (c'était une peluche)." },
    { key: "nouvellevie", fam: "leisure", tier: 4, name: "La nouvelle vie", icon: "sunrise", copies: 2,
      text: "Tout recommencer ailleurs : tes ennuis disparaissent, +4 bonheur, au moins un appartement, et 2 cartes à jouer au prochain tour.", tip: "Il faut avoir encaissé une catastrophe",
      req: { hits: 1 }, fx: [{ op: "clearBad" }, { op: "housingMin", level: 1 }, { op: "res", b: 4 }, { op: "rebound" }], scene: "nouvelleVie", life: "Recommence une nouvelle vie à la mer, avec un chapeau de paille." },
    // ---- Sabotages ----
    { key: "gourou", fam: "sabotage", tier: 3, name: "Le gourou du business", icon: "pyramid", copies: 2, target: "opponent", per4: 1,
      text: "Tu inscris la cible à un séminaire « Deviens millionnaire en 3 jours » : elle paie 3, tu touches 2 de commission.", tip: "Vise quelqu'un qui a 3 fortune",
      treq: { minF: 3 }, fx: [{ op: "steal", f: 3, give: 2 }], counters: ["avocat", "renvoi"],
      soft: { cost: { b: 1 }, label: "S'enfuir à la pause café : seulement −1 fortune", fx: [{ op: "res", f: -1 }] },
      bounce: { label: "Tu revends tes notes du séminaire : +1 fortune, +1 réputation", fx: [{ op: "res", f: 1, r: 1 }] },
      scene: "gourou", life: "Assiste à un séminaire de gourou. Repart avec un mug « Pense riche »." },
    { key: "proces", fam: "sabotage", tier: 4, name: "Le procès du siècle", icon: "gavel", copies: 2, target: "opponent",
      text: "Procès retentissant : la personne la plus réputée des deux gagne 4 fortune, l'autre perd 4 fortune et 1 réputation. Risqué !", tip: "Compare ta réputation à la sienne",
      fx: [{ op: "duel" }], counters: ["avocat", "miracle", "renvoi"],
      soft: { cost: { f: 2 }, label: "Arrangement : tu donnes 2 fortune à l'attaquant", fx: [{ op: "give", f: 2 }] },
      scene: "proces", life: "Procès du siècle. Le juge s'est endormi deux fois." },
    { key: "reunion", fam: "sabotage", tier: 3, name: "La réunion inutile", icon: "clock", copies: 2, target: "opponent",
      text: "« Cette réunion aurait pu être un mail. » La cible ne touche pas de salaire au prochain tour et perd 1 bonheur.", tip: "Vise quelqu'un qui travaille",
      treq: { hasJob: true }, fx: [{ op: "noSalary" }, { op: "res", b: -1 }], counters: ["syndicat", "miracle", "renvoi"],
      soft: { cost: { r: 1 }, label: "Prétexter un autre call : tu gardes ton salaire", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "Tu as dessiné pendant 3 heures : +1 bonheur", fx: [{ op: "res", b: 1 }] },
      scene: "reunion", life: "Survit à une réunion de 4 heures sur « la synergie des synergies »." },
    { key: "karma", fam: "sabotage", tier: 4, name: "Le karma express", icon: "yinyang", copies: 2, target: "auto",
      text: "Le karma frappe la personne qui a réussi le plus de sabotages : −3 réputation, −2 bonheur. Impossible à contrer.", tip: "Il faut qu'un adversaire ait déjà saboté",
      need: "saboteur", fx: [{ op: "karma" }], scene: "karma", life: "Invoque le karma. Il est arrivé en express." },
    // ---- Réactions ----
    { key: "miracle", fam: "defense", tier: 3, name: "Le miracle administratif", icon: "stamp", copies: 2, reaction: true, alsoPlay: true,
      text: "Réaction : annule un contrôle fiscal, un voisin procédurier, une réunion inutile ou un procès. Ou à ton tour : efface tes ennuis et +2 fortune.", tip: "Réaction ou carte normale",
      onDefend: [{ op: "res", f: 1 }], fx: [{ op: "clearBad" }, { op: "res", f: 2 }], life: "Obtient un tampon de la préfecture du premier coup. Un miracle." },
    // ---- Événements collectifs ----
    { key: "panne", fam: "world", tier: 5, name: "La panne générale", icon: "plug", copies: 1, target: "all",
      text: "Plus d'électricité ni d'internet : chacun défausse une carte au hasard et en pioche une autre. Les influenceurs perdent 2 réputation. Tout le monde se parle enfin : +1 bonheur.", tip: "Tout le monde",
      fx: [{ op: "panne" }], scene: "panne", life: "A débranché la box de tout le quartier « pour voir »." },
  ];

  /* ---- MODE TRASH & ADULTE (18+) : cartes exclusives ---- */
  var ADULT_CARDS = [
    { key: "paternite", fam: "sabotage", tier: 4, name: "Le test de paternité", icon: "dna", copies: 1, target: "opponent", adult: true,
      text: "En direct sur un plateau télé. Une fois sur deux, « ce n'est pas le tien » : −3 bonheur, −2 réputation. Sinon, c'est l'attaquant qui passe pour un idiot.", tip: "Vise un parent",
      treq: { kids: 1 }, fx: [{ op: "chance", p: 0.5, fx: [{ op: "res", b: -3, r: -2 }, { op: "scene", id: "paterniteNon" }], else: [{ op: "res", b: 2 }, { op: "res", who: "attacker", r: -2 }, { op: "scene", id: "paterniteOui" }] }], counters: ["avocat", "renvoi"],
      soft: { cost: { f: 2 }, label: "Refuser le test (et le plateau télé) : −1 réputation", fx: [{ op: "res", r: -1 }] },
      bounce: { label: "Tournée des plateaux télé : +2 fortune", fx: [{ op: "res", f: 2 }] },
      scene: "paterniteNon", life: "Test de paternité en direct. Le public a hurlé." },
    { key: "after", fam: "leisure", tier: 2, name: "L'after catastrophique", icon: "cone", copies: 2, adult: true,
      text: "+3 bonheur, −2 fortune, −2 réputation. Réveil dans une baignoire avec un cône de chantier. Une fois sur deux : un tatouage « Kevin ».", tip: "",
      fx: [{ op: "res", b: 3, f: -2, r: -2 }, { op: "chance", p: 0.5, fx: [{ op: "item", item: "tattoo" }] }], scene: "after", life: "Se réveille dans une baignoire d'hôtel avec un cône de chantier et un nouveau tatouage." },
    { key: "plancoloc", fam: "love", tier: 4, name: "Le plan cul devenu coloc", icon: "toothbrush", copies: 2, adult: true,
      text: "Il·elle a apporté sa brosse à dents. Puis son chat. Puis sa mère. Nouveau·elle partenaire, +2 bonheur, +2 fortune (loyer partagé).", tip: "Il faut être célibataire",
      req: { single: true }, fx: [{ op: "partner" }, { op: "res", b: 2, f: 2 }], scene: "planColoc", life: "Le plan d'un soir avec {partner} dure depuis 8 mois. Personne n'a osé en parler." },
    { key: "vegas", fam: "love", tier: 4, name: "Le mariage à Las Vegas", icon: "chapel", copies: 2, adult: true,
      text: "Marié·e par un sosie d'Elvis à 4 h du matin, avec un·e inconnu·e si besoin. +4 bonheur, −2 réputation.", tip: "Ne pas être marié·e",
      req: { notMarried: true, noStatus: ["ex"] }, fx: [{ op: "vegas" }, { op: "res", b: 4, r: -2 }], scene: "vegas", life: "Épouse {partner} à Las Vegas. Aucun des deux ne se souvient du prénom de l'autre." },
    { key: "groupe", fam: "sabotage", tier: 3, name: "Le message au mauvais groupe", icon: "chat", copies: 2, target: "opponent", adult: true, per4: 1,
      text: "Un message très, très privé part sur le groupe « Famille ». −3 réputation, −2 bonheur. S'il travaille : aussi rétrogradé·e (le patron est dans le groupe).", tip: "",
      treq: { minR: 1 }, fx: [{ op: "res", r: -3, b: -2 }, { op: "ifJob", fx: [{ op: "jobDown" }] }], counters: ["community", "renvoi"],
      soft: { cost: { f: 2 }, label: "« Supprimer pour tout le monde » (trop tard) : −1 réputation", fx: [{ op: "res", r: -1 }] },
      bounce: { label: "Tante Odile trouve ça « moderne » : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "groupe", life: "Envoie un message coquin sur le groupe « Famille ». Tante Odile a répondu par un pouce." },
    { key: "doublevie", fam: "love", tier: 4, name: "La double vie", icon: "masks2", copies: 2, adult: true,
      text: "Deux appartements, deux prénoms : +2 bonheur tout de suite et à chaque tour… mais chaque tour, 3 risques sur 10 que tout explose.", tip: "Il faut un·e partenaire",
      req: { partner: true, noStatus: ["doublevie"] }, fx: [{ op: "status", s: "doublevie", n: 99 }, { op: "res", b: 2 }], life: "Mène une double vie entre Lille et Perpignan. Les TGV, ça creuse." },
    { key: "sextape", fam: "sabotage", tier: 3, name: "Le sextapeur maladroit", icon: "censored", copies: 2, target: "opponent", adult: true,
      text: "Une vidéo « compromettante » de la cible fuite… filmée si mal qu'on ne voit qu'un coude. −3 réputation, scandale 1 tour.", tip: "",
      fx: [{ op: "res", r: -3 }, { op: "scandal", turns: 1 }], counters: ["community", "renvoi"],
      soft: { cost: { f: 2 }, label: "Avocat express : seulement −1 réputation", fx: [{ op: "res", r: -1 }] },
      bounce: { label: "Contrat de télé-réalité : +3 fortune", fx: [{ op: "res", f: 3 }] },
      scene: "sextape", life: "Une vidéo floue fuite. Internet débat : coude ou genou ?" },
    { key: "sugar", fam: "love", tier: 4, name: "Le sugar daddy fauché", icon: "moth", copies: 2, adult: true,
      text: "Une Rolex, une décapotable… louées. Nouveau·elle partenaire, +3 bonheur, puis il·elle t'emprunte 2 fortune par tour pendant 2 tours.", tip: "Il faut être célibataire",
      req: { single: true }, fx: [{ op: "partner", look: "ceo" }, { op: "res", b: 3 }, { op: "status", s: "sugar", n: 2 }], scene: "sugar", life: "Sort avec {partner}, « millionnaire ». La Rolex déteint." },
    { key: "date", fam: "sabotage", tier: 3, name: "Le date catastrophique", icon: "dinner", copies: 2, target: "opponent", adult: true,
      text: "Toute la belle-famille débarque au restaurant. −2 bonheur ; en couple non marié, impossible de se marier 2 tours ; sinon −1 réputation.", tip: "",
      fx: [{ op: "res", b: -2 }, { op: "ifPartner", fx: [{ op: "status", s: "ex", n: 2 }], else: [{ op: "res", r: -1 }] }], counters: ["renvoi"],
      soft: { cost: { f: 1 }, label: "Fuir par la fenêtre des toilettes : seulement −1 bonheur", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "La belle-mère t'adore finalement : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "date", life: "Premier rendez-vous. La belle-famille au complet s'invite au dessert." },
    { key: "secretvoisin", fam: "leisure", tier: 2, name: "Le secret du voisin", icon: "keyhole", copies: 2, adult: true,
      text: "Tu as vu des choses par la fenêtre. Le voisin te paie pour oublier : +4 fortune, −1 bonheur (tu ne dors plus).", tip: "",
      fx: [{ op: "res", f: 4, b: -1 }], scene: "secret", life: "Découvre que le voisin, très discret, fait des soirées à thème « pirates »." },
    { key: "fauxcelib", fam: "sabotage", tier: 4, name: "Le faux célibataire", icon: "ringhide", copies: 2, target: "opponent", adult: true,
      text: "Le·la partenaire de la cible était déjà en couple ailleurs. Rupture, −3 bonheur, mais +1 réputation (tout le monde te plaint).", tip: "Vise un couple",
      treq: { partner: true }, fx: [{ op: "breakup" }, { op: "res", b: -3, r: 1 }], counters: ["avocat", "renvoi"],
      soft: { cost: { r: 1 }, label: "Faire semblant de n'avoir rien vu : −1 bonheur", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "Le groupe de copains te venge : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "fauxCelib", life: "Découvre que {partner} avait déjà une famille. Et un chien. Et un autre chien." },
    { key: "divorcepremium", fam: "love", tier: 4, name: "Le divorce premium", icon: "goldtoaster", copies: 2, adult: true,
      text: "Ton avocat est un requin à dents d'or : tu divorces et tu repars avec +6 fortune et le grille-pain. −1 bonheur, pour la forme.", tip: "Il faut être marié·e",
      req: { married: true }, fx: [{ op: "breakup" }, { op: "res", f: 6, b: -1 }, { op: "item", item: "toaster" }], scene: "divorcePremium", life: "Divorce premium : repart avec la maison de vacances, le jet-ski et le grille-pain." },
    { key: "libertine", fam: "leisure", tier: 4, name: "La soirée libertine ratée", icon: "venetian", copies: 2, adult: true,
      text: "Masques, bougies, ambiance… tout le monde a fini par jouer au Uno. +3 bonheur, −2 réputation.", tip: "Il faut un·e partenaire",
      req: { partner: true }, fx: [{ op: "res", b: 3, r: -2 }], scene: "libertine", life: "Soirée libertine ratée : tournoi de Uno jusqu'à 5 h du matin." },
    { key: "retourex", fam: "sabotage", tier: 4, name: "Le retour de l'ex", icon: "doorex", copies: 2, target: "opponent", adult: true,
      text: "L'ex débarque en pleine cérémonie : « Objection ! » −2 bonheur, −2 réputation si marié·e, et 4 chances sur 10 que le couple explose.", tip: "Vise un couple",
      treq: { partner: true }, fx: [{ op: "res", b: -2 }, { op: "ifMarried", fx: [{ op: "res", r: -2 }] }, { op: "chance", p: 0.4, fx: [{ op: "breakup" }] }], counters: ["avocat", "renvoi"],
      soft: { cost: { f: 2 }, label: "Payer un verre à l'ex pour qu'il·elle s'en aille : −1 bonheur", fx: [{ op: "res", b: -1 }] },
      bounce: { label: "Le public applaudit ta dignité : +2 bonheur", fx: [{ op: "res", b: 2 }] },
      scene: "retourEx", life: "L'ex débarque au mariage en criant « Objection ! ». Ce n'était même pas un tribunal." },
    { key: "karmainfidele", fam: "world", tier: 5, name: "Le karma infidèle", icon: "lightning", copies: 1, target: "all", adult: true,
      text: "Ceux qui mènent une double vie ou ont saboté 2 fois ou plus : −2 réputation, −2 bonheur. Les plus sages : +3 bonheur.", tip: "Tout le monde",
      fx: [{ op: "karmaInf" }], scene: "karmaInf", life: "Déclenche le karma infidèle. La foudre a frappé plusieurs fois." },
  ];
  NEW_CARDS.concat(ADULT_CARDS).forEach(function (c) { CARDS.push(c); });

  var ADULT_EVENTS = [
    { key: "valentin", adult: true, name: "La Saint-Valentin", icon: "heart", text: "Les couples se ruinent en roses : +2 bonheur, −1 fortune. Les célibataires organisent une soirée « libres et fiers » : +2 réputation.", fx: [{ op: "eachIf", cond: { partner: true }, fx: [{ op: "res", b: 2, f: -1 }], else: [{ op: "res", r: 2 }] }] },
    { key: "seminaire", adult: true, name: "Le séminaire d'entreprise arrosé", icon: "mic", text: "Ceux qui travaillent dansent sur les tables : +2 bonheur, −2 réputation (les photos circulent).", fx: [{ op: "eachIf", cond: { hasJob: true }, fx: [{ op: "res", b: 2, r: -2 }] }] },
    { key: "fuite", adult: true, name: "Fuite d'une appli de rencontre", icon: "chat", text: "Les comptes sont publiés. Les gens en couple doivent s'expliquer : −2 bonheur. Les célibataires assument : −1 réputation.", fx: [{ op: "eachIf", cond: { partner: true }, fx: [{ op: "res", b: -2 }], else: [{ op: "res", r: -1 }] }] },
    { key: "evg", adult: true, name: "L'enterrement de vie de garçon", icon: "cone", text: "Tout le monde finit à Prague déguisé en banane : −2 fortune, +2 bonheur.", fx: [{ op: "each", fx: [{ op: "res", f: -2, b: 2 }] }] },
  ];
  ADULT_EVENTS.forEach(function (e) { EVENTS.push(e); });
  EVENTS.forEach(function (e) { if (!e.adult) e.adult = false; });
  OBJECTIVES.push({ key: "rentier", name: "Rentier", text: "Finir avec un chien héritier ou un bébé influenceur.", pts: 7, check: { anyOf: [{ item: "dog" }, { status: "babyinf" }] } });
  OBJECTIVES.push({ key: "zen2", name: "Âme en paix", text: "Finir sans aucun ennui en cours (scandale, squatteur, procès…).", pts: 6, check: { clean: true } });

  root.QV_DATA = {
    FAMILIES: FAMILIES, JOBS: JOBS, ITEMS: ITEMS, HOUSING: HOUSING,
    CARDS: CARDS, EVENTS: EVENTS, OBJECTIVES: OBJECTIVES, NAMES: NAMES,
    ROUNDS: ROUNDS, START_AGE: START_AGE, AGE_STEP: AGE_STEP, HAND_SIZE: HAND_SIZE, TROPHIES: TROPHIES, STATUSES: STATUSES, STAGES: STAGES, stageForRound: stageForRound,
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
