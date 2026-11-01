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

  // Le jeu jouable sur la page d'accueil.
  // embed : ouvre la page du jeu sur itch.io, clic droit sur la zone de jeu
  // → « Inspecter », et récupère le numéro dans
  // https://html-classic.itch.zone/html/XXXXXXX/index.html
  // puis mets : "https://itch.io/embed-upload/XXXXXXX?color=1f3a2b"
  featured: {
    id: "chaaat",
    embed: "",            // TODO : colle l'URL d'embed ici
    width: 960,
    height: 600,
  },
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
   icon    : cat, cube, dog, fish, eye, wand, drop, box, plug, star
   ------------------------------------------------------------------------- */
window.PROJECTS = [
  {
    id: "chaaat",
    type: "game",
    title: "Chaaat",
    status: "Prototype",
    tags: ["Puzzle", "Web"],
    with: "AugProduction",
    short: "Un puzzle où tu associes des chats identiques pour faire grimper ton score. Prototype réalisé en 12 heures.",
    url: "https://maximedelarose.itch.io/chaaat",
    cover: "",
    palette: ["#f2b05e", "#e8873a", "#5a2e1a"],
    icon: "cat",
  },
  {
    id: "dogship",
    type: "game",
    title: "DogShip",
    status: "",
    tags: ["VR", "Roguelite", "Shooter", "Android"],
    with: "Tom T",
    short: "Un roguelite shooter dans l'espace en VR : détruis les obstacles et améliore tes tirs pour survivre.",
    url: "https://maximedelarose.itch.io/dogship",
    cover: "",
    palette: ["#9fb6d9", "#4a5f8a", "#1d2540"],
    icon: "dog",
  },
  {
    id: "cubelite",
    type: "game",
    title: "Cubelite",
    year: 2022,
    status: "Prototype",
    tags: ["Plateforme", "Shooter", "Web", "Windows"],
    with: "Lucas / Reltony",
    short: "Et si Vampire Survivors devenait un jeu de plateforme ?",
    url: "https://maximedelarose.itch.io/cubelite",
    cover: "",
    palette: ["#9cc56b", "#3f6b3a", "#1f3a2b"],
    icon: "cube",
  },
  {
    id: "wizard-thief",
    type: "game",
    title: "Wizard Thief",
    status: "Projet d'école",
    tags: ["VR", "Puzzle", "Android"],
    with: "CodAbs, Audmaxr",
    short: "Un jeu de puzzle en VR réalisé en projet d'école.",
    url: "https://maximedelarose.itch.io/wizard-escape",
    cover: "",
    palette: ["#c9a6e0", "#6b4a8a", "#2a1d3d"],
    icon: "wand",
  },
  {
    id: "watcher",
    type: "game",
    title: "Watcher",
    status: "Projet d'école",
    tags: ["Point & click", "Puzzle", "Windows"],
    with: "Lucas / Reltony, Audmaxr",
    short: "Un prototype de point & click à énigmes, réalisé en groupe.",
    url: "https://maximedelarose.itch.io/watcher-vertical-slice",
    cover: "",
    palette: ["#e0c38a", "#8a6a3b", "#2e2418"],
    icon: "eye",
  },
  {
    id: "color-guesser",
    type: "game",
    title: "Color Guesser",
    status: "Prototype",
    tags: ["Puzzle", "Casual", "Web", "Android"],
    short: "Un petit jeu de couleurs casual, réalisé en 3 heures.",
    url: "https://maximedelarose.itch.io/color-guesser",
    cover: "",
    palette: ["#f2a3b3", "#7fc6d9", "#2f3e5c"],
    icon: "drop",
  },
  {
    id: "fish-escape",
    type: "game",
    title: "Fish Escape",
    status: "Projet d'école",
    tags: ["Prototype"],
    short: "Un prototype réalisé en première année de game design.",
    url: "https://maximedelarose.itch.io/fish-escape",
    cover: "",
    palette: ["#9ad7e0", "#3a8fa8", "#173b4a"],
    icon: "fish",
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
