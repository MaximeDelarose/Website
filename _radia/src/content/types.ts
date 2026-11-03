/* Schéma du contenu personnalisable (textes, cartes, photos, musique).
   Le vrai contenu est dans private/content.ts (chiffré à la publication) ;
   src/content/example.ts sert de modèle et de repli quand private/ est absent. */

/** Illustrations vectorielles intégrées (utilisées quand une carte n'a pas de photo). */
export type ArtId = "flowers" | "paris" | "montmartre" | "crown" | "heart" | "world" | "stars" | "chess";

export type CardKind = "souvenir" | "message" | "declaration" | "taquinerie" | "rare";

export interface MemoryCard {
  id: string;
  /** Titre court affiché en haut de la carte et dans l'album. */
  title: string;
  /** Phrase d'Auguste. */
  text: string;
  /** Chemin d'une photo dans private/ (ex. "memories/neon.jpg"). */
  image?: string;
  /** Illustration de secours / décorative si pas de photo. */
  art?: ArtId;
  kind: CardKind;
  /**
   * 1 : dès la première capture · 2 : après quelques captures ou à partir de la 2e partie ·
   * 3 : longues déclarations (tard dans la partie ou à partir de la 3e partie).
   */
  tier: 1 | 2 | 3;
  /** Carte réservée à un événement : capture de la dame noire, d'une tour… */
  trigger?: "queen" | "rook";
  /** Poids relatif de tirage (défaut 1 ; < 1 = plus rare). */
  weight?: number;
  /** Carte cachée de l'album tant que la scène finale n'est pas débloquée. */
  secret?: boolean;
}

export type BubbleEvent =
  | "greet" | "goodMove" | "capturePawn" | "captureMinor" | "captureRook" | "captureQueen"
  | "check" | "aiMistake" | "exploit" | "aiCapture" | "aiCheck" | "win" | "loss" | "draw" | "lowTime"
  | "taunt" | "idle" | "aiGood";

export interface ResultText { title: string; line: string }

export interface Content {
  player: { name: string; tag: string };
  rival: { name: string; tag: string; subtitle: string };
  title: string;
  subtitle: string;
  intro: string[];
  introButton: string;
  cardHeader: string;
  cardButton: string;
  cards: MemoryCard[];
  bubbles: Record<BubbleEvent, string[]>;
  results: {
    win: ResultText; loss: ResultText; draw: ResultText;
    timeoutWin: ResultText; timeoutLoss: ResultText; timeoutDraw: ResultText;
    resign: ResultText;
  };
  finale: { menuLabel: string; lines: string[]; thanks: string; button: string; albumTitle: string };
  /** Photo du visage de Radia (carrée), affichée sur la dame blanche. */
  queenFace?: string;
  /** Chemin du MP3 dans private/ (ex. "music/radia-theme.mp3"). */
  music?: string;
}
