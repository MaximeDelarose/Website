/* Contenu d'EXEMPLE (public) : utilisé seulement quand private/content.ts est absent
   (clone neuf, intégration continue). Le vrai contenu est chiffré dans ../radia/vault/ ;
   `npm run unpack` le restaure dans private/. */
import type { Content, MemoryCard } from "./types";

const arts = ["flowers", "paris", "montmartre", "crown", "heart", "world", "stars", "chess"] as const;
const cards: MemoryCard[] = Array.from({ length: 12 }, (_, i) => ({
  id: "exemple-" + (i + 1),
  title: "Souvenir n°" + (i + 1),
  text: "Texte d'exemple : le vrai message est dans private/content.ts.",
  art: arts[i % arts.length],
  kind: i < 8 ? "message" : "declaration",
  tier: (i < 6 ? 1 : i < 9 ? 2 : 3) as 1 | 2 | 3,
}));
cards[3].trigger = "queen";
cards[4].trigger = "rook";

const content: Content = {
  player: { name: "Joueuse", tag: "Joueuse ♛" },
  rival: { name: "Rival", tag: "Rival ♟", subtitle: "Adversaire" },
  title: "ÉCHECS ♛",
  subtitle: "Contenu d'exemple",
  intro: ["Bienvenue ♡", "Tu joues les Blancs.", "À chaque capture, une surprise."],
  introButton: "Jouer",
  cardHeader: "Une surprise ♡",
  cardButton: "Continuer",
  cards,
  bubbles: {
    greet: ["Bonne partie !"], goodMove: ["Joli coup."], capturePawn: ["Mon pion !"],
    captureMinor: ["Aïe."], captureRook: ["Ma tour !"], captureQueen: ["Ma dame !"],
    check: ["Échec…"], aiMistake: ["Oups."], exploit: ["Bien vu."], aiCapture: ["Merci !"],
    aiCheck: ["Échec !"], lowTime: ["Attention au temps."], win: ["Bravo !"], loss: ["Revanche ?"],
    draw: ["Nulle."], taunt: ["Hmm."], idle: ["Tu es là ?"], aiGood: ["Pas mal, moi."],
  },
  results: {
    win: { title: "Victoire", line: "Bravo." }, loss: { title: "Défaite", line: "Revanche ?" },
    draw: { title: "Nulle", line: "Égalité." }, timeoutWin: { title: "Temps écoulé : victoire", line: "" },
    timeoutLoss: { title: "Temps écoulé : défaite", line: "" }, timeoutDraw: { title: "Temps écoulé : nulle", line: "" },
    resign: { title: "Abandon", line: "" },
  },
  finale: { menuLabel: "Un secret", albumTitle: "Un secret", lines: ["…"], thanks: "Merci.", button: "Rejouer" },
};
export default content;
