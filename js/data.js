/* =========================================================================
   DONNÉES DU SITE — c'est le seul fichier à modifier pour mettre à jour
   tes infos, tes jeux et tes plugins. Pas besoin de toucher au HTML.
   ========================================================================= */

window.SITE = {
  name: "AkarisuMD",
  fullName: "Maxime Delarose",
  tagline: "Dev Unity · VR · Pixel art",

  // Adresse affichée sur la page contact (laisse "" pour la cacher).
  email: "maxime.delarose@mdelarose.fr",

  // Formulaire « message direct » :
  // 1. Crée un formulaire gratuit sur https://formspree.io (ou équivalent)
  // 2. Colle ici l'URL du endpoint, ex : "https://formspree.io/f/abcdwxyz"
  // Si c'est vide, le bouton « Envoyer » ouvre le logiciel mail du visiteur
  // avec le message déjà rempli, adressé à l'email ci-dessus.
  formEndpoint: "",

  // Classements (Supabase) — voir leaderboard/README.md
  // url : « Project URL » ; key : clé PUBLIQUE (publishable / anon).
  // Ne mets JAMAIS la clé secrète (service_role) ici : ce fichier est public.
  supabase: {
    url: "",
    key: "",
  },

  // Réseaux : laisse "" pour masquer un lien.
  links: {
    itch: "https://maximedelarose.itch.io",
    github: "https://github.com/MaximeDelarose",
    linkedin: "",
    bluesky: "",
    twitter: "",
    youtube: "",
    discord: "",
  },

  // Le jeu mis en avant dans la borne de la page d'accueil (son id).
  // Pour qu'il soit jouable, renseigne son champ « embed » plus bas.
  featured: { id: "chaaat" },
};

/* -------------------------------------------------------------------------
   PROJETS (l'ordre ici = l'ordre d'affichage ; les 3 premiers sont sur
   l'accueil)
   type    : "game" | "plugin"
   tags    : ce que tu veux (ils servent aux filtres de la bibliothèque)
   status  : "Sorti" | "En cours" | "Prototype" | "Game jam" | "Bientôt" ...
   with    : co-auteurs (optionnel)
   cover   : chemin d'une image (ex "assets/covers/chaaat.png").
             Si vide, une jaquette pixel est générée automatiquement.
   palette : 3 couleurs pour la jaquette générée (optionnel)
   role    : ton rôle sur le projet (optionnel)
   embed   : URL d'intégration itch.io → le jeu devient jouable sur le site
             (bouton « Jouer ici »). Format :
             "https://itch.io/embed-upload/XXXXXXX?color=1f3a2b"
   size    : [largeur, hauteur] du jeu web (optionnel, défaut 960×600)
   leaderboard : true → affiche le classement du jeu (même id que lb_games)
   icon    : cat, cube, dog, fish, eye, wand, drop, box, plug, gun, paw,
             bolt, mask, star
   ------------------------------------------------------------------------- */
window.PROJECTS = [
  {
    id: "gun-toys",
    type: "game",
    title: "Gun&Toys",
    year: 2024,
    status: "En développement",
    tags: ["FPS", "Roguelike", "Shooter", "Windows"],
    with: "LeThom, Hugo Carrasco, Lucas / Reltony, CodAbs, Flamby",
    role: "Programmeur, game designer",
    short: "Your new fast-fps roguelike !",
    url: "https://le-thom.itch.io/gun-toys",
    cover: "assets/covers/gun-toys.png",
  },
  {
    id: "lets-hunt",
    type: "game",
    title: "Let's Hunt",
    year: 2023,
    status: "Sorti",
    tags: ["Action", "Multijoueur", "2D", "Windows"],
    with: "Hucarix, sp4rxs, NelleGameArt, Lucas / Reltony, CodAbs, TheauRyste",
    role: "Développeur, level builder",
    short: "Incarnez un soldat et partez chasser une créature mystique.",
    url: "https://hucarix.itch.io/lets-hunt",
    cover: "assets/covers/lets-hunt.png",
  },
  {
    id: "dogship",
    type: "game",
    title: "DogShip",
    status: "Prototype",
    tags: ["VR", "Roguelite", "Shooter", "Pixel art", "Android"],
    with: "Tom T",
    role: "Art, développeur",
    short: "DogShip est un roguelite shooter VR spatial où vous détruisez les obstacles et améliorez vos tirs pour survivre. 🚀",
    url: "https://maximedelarose.itch.io/dogship",
    cover: "assets/covers/dogship.png",
  },
  {
    id: "chaaat",
    type: "game",
    title: "Chaaat",
    status: "Prototype",
    tags: ["Puzzle", "Web"],
    with: "AugProduction",
    short: "Jeu de réflexion dans lequel vous devez associer des chats identiques pour augmenter votre score.",
    url: "https://maximedelarose.itch.io/chaaat",
    leaderboard: true,  // affiche le classement « chaaat » (si Supabase est configuré)
    embed: "https://itch.io/embed-upload/9042806?color=1f3a2b",
    size: [960, 720],
    cover: "assets/covers/chaaat.png",
  },
  {
    id: "rhat",
    type: "game",
    title: "RHAT",
    status: "Sorti",
    tags: ["Puzzle", "Windows"],
    with: "AugProduction",
    short: "When stealing becomes an art... thanks to a magical hat!",
    url: "https://augproduction.itch.io/rhat",
    cover: "assets/covers/rhat.png",
  },
  {
    id: "crazy-granny",
    type: "game",
    title: "Crazy Granny",
    status: "Sorti",
    tags: ["Comédie", "Multijoueur", "PvP", "Top-down"],
    with: "Areshimeros, julia.bffn, NelleGameArt, Mako_Lerequin, sp4rxs, Lucas / Reltony",
    role: "Développeur",
    short: "Incarnez une Mamie démoniaque qui, à coup de déambulateur, chasse des clowns déjantés dans un 1VS4 Online.",
    url: "https://maximedelarose.itch.io/crazy-granny",
    cover: "assets/covers/crazy-granny.png",
  },
  {
    id: "cubelite",
    type: "game",
    title: "Cubelite",
    year: 2022,
    status: "Prototype",
    tags: ["2D", "Action", "Plateforme", "Shooter", "Web", "Windows"],
    with: "Lucas / Reltony",
    short: "Visez et tirez sur tous vos poursuivants. Survivez dans ce jeu qui part dans tous les sens ! Et si Vampire Survivors devenait un platformer !",
    url: "https://maximedelarose.itch.io/cubelite",
    embed: "https://itch.io/embed-upload/12801699?color=1f3a2b",
    size: [1280, 720],
    cover: "assets/covers/cubelite.png",
  },
  {
    id: "life-roots",
    type: "game",
    title: "Life Roots",
    year: 2023,
    status: "Game jam",
    tags: ["Clicker", "Mobile", "Web", "Android"],
    with: "Lucas / Reltony (Team Madeleine)",
    role: "Développeur système, game designer",
    short: "Clicker game where you make the last trees on earth grow in order to create life. (Global Game Jam 2023)",
    url: "https://lucasbarlet.itch.io/life-roots",
    embed: "https://itch.io/embed-upload/12963086?color=1f3a2b",
    size: [720, 1080],
    cover: "assets/covers/life-roots.png",
  },
  {
    id: "opera-house",
    type: "game",
    title: "Five Nights At Opera House",
    status: "Projet d'école",
    tags: ["Horreur", "3D", "Unreal"],
    with: "CodAbs",
    short: "Even At Night, Diva Want to Sing",
    url: "https://codabs.itch.io/opera-house",
    cover: "assets/covers/opera-house.png",
  },
  {
    id: "deep-abyss",
    type: "game",
    title: "Deep Abyss",
    status: "Prototype",
    tags: ["Horreur", "3D"],
    with: "CodAbs",
    role: "Développeur, level builder",
    short: "When you stare into the Abyss, the Abyss stares back at you",
    url: "https://codabs.itch.io/deep-abyss",
    cover: "assets/covers/deep-abyss.png",
  },
  {
    id: "get-the-spotlight",
    type: "game",
    title: "Get The Spotlight",
    status: "Prototype",
    tags: ["Plateforme", "Course", "Multijoueur", "Windows"],
    with: "CodAbs",
    short: "Get First In This Hell Of a Race",
    url: "https://codabs.itch.io/get-the-spotlight",
    cover: "assets/covers/get-the-spotlight.png",
  },
  {
    id: "wizard-thief",
    type: "game",
    title: "Wizard Thief",
    status: "Projet d'école",
    tags: ["VR", "Puzzle", "Android"],
    with: "CodAbs, Audmaxr",
    short: "VR project for school",
    url: "https://maximedelarose.itch.io/wizard-escape",
    cover: "assets/covers/wizard-thief.png",
  },
  {
    id: "watcher",
    type: "game",
    title: "Watcher",
    year: 2022,
    status: "Projet d'école",
    tags: ["Point & click", "Puzzle", "Windows"],
    with: "Lucas / Reltony, Audmaxr",
    short: "Un jeu de réflexion et d'action en point and click, en vue du dessus, dans un appartement du Queens à New York.",
    url: "https://maximedelarose.itch.io/watcher-vertical-slice",
    cover: "assets/covers/watcher.png",
  },
  {
    id: "color-guesser",
    type: "game",
    title: "Color Guesser",
    status: "Sorti",
    tags: ["Puzzle", "Casual", "2D", "Web", "Android"],
    short: "Find the right color and accumulate points to become a star!",
    url: "https://maximedelarose.itch.io/color-guesser",
    embed: "https://itch.io/embed-upload/10385770?color=1f3a2b",
    size: [608, 1400],
    cover: "assets/covers/color-guesser.png",
  },
  {
    id: "savanah-story",
    type: "game",
    title: "Savanah Story",
    status: "Prototype",
    tags: ["Narratif"],
    with: "Lucas / Reltony, Agan Jani",
    short: "Jeu réalisé en cinq heures : venez assister à l'histoire des animaux de la savane dans notre spectacle d'ombre au sein de notre théâtre.",
    url: "https://lucasbarlet.itch.io/savanah-story",
    cover: "assets/covers/savanah-story.png",
  },
  {
    id: "fish-escape",
    type: "game",
    title: "Fish Escape",
    status: "Projet d'école",
    tags: ["Action"],
    short: "Prototype réalisé pour un PFA de 1re année de Game Design.",
    url: "https://maximedelarose.itch.io/fish-escape",
    cover: "assets/covers/fish-escape.png",
  },

  /* ---------------------------- Plugins Unity ---------------------------- */
  {
    id: "boxutils",
    type: "plugin",
    title: "BoxUtils",
    status: "Bientôt",
    tags: ["Unity", "Outils"],
    short: "Ma collection de plugins pour Unity. Certains arriveront sur l'Unity Asset Store, d'autres directement sur GitHub.",
    url: "",            // TODO : lien GitHub / Asset Store à la sortie
    cover: "",
    palette: ["#7fd1c7", "#2f7f7a", "#173b3a"],
    icon: "box",
  },
];
