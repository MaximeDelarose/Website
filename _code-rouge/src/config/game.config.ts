import type { GameConfig } from "./types";

/**
 * CONFIGURATION DU JEU — tout ce qui change d'un client à l'autre est ici :
 * logo, noms, couleurs, textes, énigmes, réponses, durée, barème.
 *
 * Les réponses ne sont jamais écrites « en dur » : elles sont CALCULÉES à partir des données
 * ci-dessous (voir engine/puzzles.ts). Modifier un casier, une heure ou un relais met donc
 * automatiquement à jour le code attendu, et `npm test` vérifie que l'énigme reste résoluble.
 */
export const gameConfig: GameConfig = {
  brand: {
    operatorName: "MAB Expérience",
    clientName: "votre organisation",
    gameTitle: "CODE ROUGE",
    logoUrl: null,
  },

  theme: {
    night: "#050b1c",
    deep: "#0a1530",
    panel: "#0f1e42",
    electric: "#2f6bff",
    cyan: "#3fe6ff",
    alert: "#ff3b4e",
    amber: "#ff9d2e",
    text: "#eaf3ff",
    muted: "#8fa6cf",
  },

  durationSeconds: 15 * 60,

  scoring: {
    stages: {
      memory: { base: 1000, maxTimeBonus: 500, parSeconds: 180, errorPenalty: 25, hintCosts: [60], minScore: 200 },
      deduction: { base: 1000, maxTimeBonus: 500, parSeconds: 270, errorPenalty: 50, hintCosts: [75, 100, 150], minScore: 200 },
      cipher: { base: 1000, maxTimeBonus: 500, parSeconds: 270, errorPenalty: 50, hintCosts: [75, 100, 150], minScore: 200 },
      finale: { base: 1500, maxTimeBonus: 500, parSeconds: 210, errorPenalty: 40, hintCosts: [120], minScore: 300 },
    },
    pointsPerSecondLeft: 2,
    overloadPenalty: 100,
    ranks: [
      { min: 5600, title: "Unité d'élite", line: "Sang-froid, méthode, vitesse : une équipe qu'on envoie partout." },
      { min: 4600, title: "Agents confirmés", line: "Une coordination solide et très peu de faux pas." },
      { min: 3400, title: "Agents de terrain", line: "Mission remplie. La prochaine fois, visez le chrono." },
      { min: 0, title: "Recrues prometteuses", line: "Le potentiel est là : il reste à huiler la communication." },
    ],
  },

  memory: {
    rounds: [
      { cols: 3, rows: 3, sequence: 3, viewSeconds: 6 },
      { cols: 4, rows: 3, sequence: 4, viewSeconds: 8 },
      { cols: 4, rows: 4, sequence: 5, viewSeconds: 10 },
    ],
    replaySeconds: 3,
  },

  // Épreuve 2 — le code = casiers des agents réellement entrés, dans l'ordre d'entrée,
  // en écartant le titulaire du badge cloné (prouvé absent par sa carte d'embarquement).
  deduction: {
    nightLabel: "nuit du 14 mars",
    agents: [
      { name: "DUVAL", locker: 7, entry: "23:20" },
      { name: "IMBERT", locker: 2, entry: "22:52" },
      { name: "LEROY", locker: 4, entry: "21:04" },
      { name: "MARCHAND", locker: 8, entry: null },
      { name: "NOVAK", locker: 9, entry: "21:37" },
      { name: "PETIT", locker: 1, entry: null },
      { name: "ROUSSEL", locker: 3, entry: null },
      { name: "SAUVAGE", locker: 6, entry: "22:15" },
    ],
    clonedBadgeOf: "SAUVAGE",
    trip: { city: "LISBONNE", code: "LIS", from: "12 MARS", to: "19 MARS", flight: "MB 2417" },
    hints: [
      "La note du chef de la sécurité donne la règle : un chiffre par agent entré, son numéro de casier, dans l'ordre des entrées.",
      "Le journal compte cinq entrées pour un code à quatre chiffres. Une personne ne pouvait pas être sur place cette nuit-là : cherchez une preuve de déplacement.",
      "Sauvage était à Lisbonne : écartez son entrée. Classez les quatre autres par heure (Leroy, Novak, Imbert, Duval) et relevez leurs casiers dans cet ordre.",
    ],
  },

  // Épreuve 3 — César : chaque lettre a été avancée d'autant de rangs qu'il y a de relais actifs.
  cipher: {
    plaintext: "AURORE",
    relays: [
      { id: "R1", active: true },
      { id: "R2", active: false },
      { id: "R3", active: true },
      { id: "R4", active: true },
      { id: "R5", active: false },
      { id: "R6", active: true },
      { id: "R7", active: false },
      { id: "R8", active: true },
    ],
    hints: [
      "Trois indices, trois rôles : l'un compte les relais, l'autre règle la roue, le dernier dicte les lettres. La carte du réseau donne la clé.",
      "Comptez uniquement les relais actifs (en cyan) : ce nombre est le décalage. L'expéditeur a avancé dans l'alphabet, vous devez donc reculer.",
      "Réglez la roue sur un recul de 5. Lisez ensuite chaque lettre reçue sur l'anneau extérieur : la lettre réelle est juste en dessous. F devient A.",
    ],
  },

  finale: {
    drainPerSecond: 0.5,
    errorDrain: 12,
    stepGain: 22,
    holdSeconds: 3,
    syncRings: 3,
    hints: {
      symbol: "Le symbole d'amorçage obtenu à l'épreuve 1 est mis en évidence.",
      code: "Le code du coffre obtenu à l'épreuve 2 était : {value}.",
      word: "Le mot de passe déchiffré à l'épreuve 3 était : {value}.",
    },
  },

  texts: {
    tagline: "Escape game coopératif",
    pitch: "Le système central est compromis. Votre équipe a quinze minutes pour faire sauter quatre verrous et rétablir les communications.",
    facts: [
      { value: "3–6", label: "joueurs" },
      { value: "15", label: "minutes" },
      { value: "1", label: "écran" },
    ],
    briefing: [
      "Équipe {team}, ici le centre de commandement.",
      "À 03 h 12, le noyau ORION — le système central de {client} — a été compromis. Toutes les communications sont coupées.",
      "Quatre verrous de sécurité le protègent encore : mémoire, déduction, communication, puis stabilisation du noyau.",
      "Chaque verrou ouvert vous livre un fragment de clé. Notez-les : vous en aurez besoin pour la manœuvre finale.",
      "Vous marquez des points à chaque verrou, davantage si vous êtes rapides. Les erreurs et les indices en coûtent.",
      "Parlez-vous, répartissez les rôles. Le compte à rebours démarre à votre signal.",
    ],
    stages: {
      memory: {
        code: "VERROU 01",
        name: "Mémoire",
        skill: "Observation collective",
        intro: "Le pare-feu affiche sa matrice quelques secondes avant de se brouiller. Répartissez-vous les lignes : personne ne retiendra tout, seul.",
        goal: "Mémorisez la grille, puis retrouvez les symboles demandés, dans l'ordre.",
      },
      deduction: {
        code: "VERROU 02",
        name: "Déduction",
        skill: "Croisement d'informations",
        intro: "Le coffre de la salle serveur s'ouvre avec un code à quatre chiffres. Personne ne le connaît, mais quatre pièces du dossier permettent de le reconstituer.",
        goal: "Croisez les quatre documents pour trouver le code du coffre.",
      },
      cipher: {
        code: "VERROU 03",
        name: "Communication",
        skill: "Coordination orale",
        intro: "Un message chiffré vient d'être intercepté. Un seul d'entre vous ne suffira pas : il faut un lecteur, un opérateur de roue et un scribe.",
        goal: "Déchiffrez le message intercepté pour obtenir le mot de passe.",
      },
      finale: {
        code: "VERROU 04",
        name: "Stabilisation",
        skill: "Sang-froid sous pression",
        intro: "Le noyau est à nu et sa stabilité chute. Il vous faut les trois fragments récoltés, quatre mains et beaucoup de calme.",
        goal: "Stabilisez le noyau avant la surcharge.",
      },
    },
    teamSuggestions: ["Unité Phénix", "Cellule Comète", "Section Vega", "Groupe Lynx", "Brigade Atlas", "Escouade Nova"],
    victoryTitle: "Communications rétablies",
    victoryLine: "Le noyau ORION répond de nouveau. Mission accomplie.",
    failTitle: "Signal perdu",
    failLine: "Le compte à rebours est arrivé à zéro avant la stabilisation du noyau.",
  },
};
