/* =========================================================================
   DONNÉES DU SITE — c'est le seul fichier à modifier pour mettre à jour
   tes infos, tes jeux et tes plugins. Pas besoin de toucher au HTML.
   ========================================================================= */

window.SITE = {
  name: "AkarisuMD",
  fullName: "Maxime Delarose",
  tagline: "Dev Unity · VR · Pixel art",

  // Ton adresse affichée sur la page contact (laisse "" pour la cacher).
  // TODO : mets l'adresse que tu veux rendre publique.
  email: "",

  // Formulaire « message direct » :
  // 1. Crée un formulaire gratuit sur https://formspree.io (ou équivalent)
  // 2. Colle ici l'URL du endpoint, ex : "https://formspree.io/f/abcdwxyz"
  // Si c'est vide, le bouton « Envoyer » ouvre le logiciel mail du visiteur.
  formEndpoint: "",

  // Réseaux : laisse "" pour masquer un lien.
  links: {
    itch: "https://akarisumd.itch.io",          // TODO : vérifie l'URL
    github: "https://github.com/maximedelarose",
    linkedin: "",
    bluesky: "",
    twitter: "",
    youtube: "",
    discord: "",
  },

  // Le jeu jouable sur la page d'accueil.
  // embed : sur itch.io → page du jeu → « Edit game » → onglet « Distribute »
  // → « Embed game » … OU plus simple : ouvre la page du jeu, clic droit sur
  // la zone de jeu → « Inspecter », et récupère le numéro dans
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
   PROJETS
   type    : "game" | "plugin"
   tags    : ce que tu veux (ils servent aux filtres de la bibliothèque)
   status  : "Sorti" | "En cours" | "Prototype" | "Game jam" ...
   cover   : chemin d'une image (ex "assets/covers/chaaat.png").
             Si vide, une jaquette pixel est générée automatiquement.
   palette : 3 couleurs pour la jaquette générée (optionnel)
   ------------------------------------------------------------------------- */
window.PROJECTS = [
  {
    id: "chaaat",
    type: "game",
    title: "Chaaat",
    year: 2025,
    status: "Sorti",
    tags: ["Puzzle", "Web", "Pixel art"],
    short: "Un puzzle où tu associes des chats identiques pour faire grimper ton score.",
    url: "https://akarisumd.itch.io/chaaat",   // TODO : vérifie l'URL
    cover: "",
    palette: ["#f2b05e", "#e8873a", "#5a2e1a"],
    icon: "cat",
  },
  {
    id: "cubelite",
    type: "game",
    title: "Cubelite",
    year: 2024,
    status: "Sorti",
    tags: ["Arcade", "3D"],
    short: "", // TODO : une phrase pour présenter Cubelite
    url: "https://akarisumd.itch.io/cubelite", // TODO : vérifie l'URL
    cover: "",
    palette: ["#9cc56b", "#3f6b3a", "#1f3a2b"],
    icon: "cube",
  },
  {
    id: "crazy-granny",
    type: "game",
    title: "Crazy Granny",
    year: 2024,
    status: "Game jam",
    tags: ["Action", "Game jam"],
    short: "", // TODO : une phrase pour présenter Crazy Granny
    url: "https://akarisumd.itch.io/crazy-granny", // TODO : vérifie l'URL
    cover: "",
    palette: ["#e6a4b4", "#c8553d", "#4a2233"],
    icon: "granny",
  },

  /* Exemple de plugin Unity — dé-commente et adapte :
  {
    id: "mon-plugin",
    type: "plugin",
    title: "Mon Super Plugin",
    year: 2026,
    status: "Sorti",
    tags: ["Unity", "VR", "Outil éditeur"],
    short: "Ce que fait le plugin en une phrase.",
    url: "https://github.com/maximedelarose/mon-plugin",
    cover: "",
    palette: ["#7fd1c7", "#2f7f7a", "#173b3a"],
    icon: "plug",
  },
  */
];
