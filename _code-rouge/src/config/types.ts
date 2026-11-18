/** Types de la configuration du jeu : tout ce qui est personnalisable par client vit dans game.config.ts. */

export type StageId = "memory" | "deduction" | "cipher" | "finale";

export interface BrandConfig {
  /** Société qui opère le jeu (affichée en « présente »). */
  operatorName: string;
  /** Nom de l'entreprise cliente, intégré à l'histoire. */
  clientName: string;
  /** Titre du jeu. */
  gameTitle: string;
  /** URL d'un logo (PNG/SVG) ; null = mot-symbole typographique. */
  logoUrl: string | null;
}

/** Couleurs : injectées en variables CSS au démarrage. */
export interface ThemeConfig {
  night: string;
  deep: string;
  panel: string;
  electric: string;
  cyan: string;
  alert: string;
  amber: string;
  text: string;
  muted: string;
}

export interface StageScoring {
  /** Points acquis en réussissant l'épreuve. */
  base: number;
  /** Bonus de rapidité maximal (obtenu à 0 s, nul au temps de référence). */
  maxTimeBonus: number;
  /** Temps de référence en secondes : au-delà, plus de bonus de rapidité. */
  parSeconds: number;
  /** Points retirés par mauvaise réponse. */
  errorPenalty: number;
  /** Coût de chaque indice, dans l'ordre d'utilisation (le dernier coût est réutilisé ensuite). */
  hintCosts: number[];
  /** Score plancher d'une épreuve réussie. */
  minScore: number;
}

export interface ScoringConfig {
  stages: Record<StageId, StageScoring>;
  /** Points par seconde restante au chrono quand la mission est réussie. */
  pointsPerSecondLeft: number;
  /** Points retirés à chaque surcharge du noyau pendant la finale. */
  overloadPenalty: number;
  /** Paliers de grade, du plus haut au plus bas. */
  ranks: { min: number; title: string; line: string }[];
}

export interface MemoryRound {
  cols: number;
  rows: number;
  /** Longueur de la séquence à retrouver. */
  sequence: number;
  /** Durée d'affichage de la grille, en secondes. */
  viewSeconds: number;
}

export interface DeductionAgent {
  name: string;
  locker: number;
  /** Heure d'entrée « HH:MM » dans le journal, ou null si l'agent n'apparaît pas dans le journal. */
  entry: string | null;
}

export interface DeductionConfig {
  agents: DeductionAgent[];
  /** Agent dont le badge a été cloné : son entrée ne compte pas. */
  clonedBadgeOf: string;
  nightLabel: string;
  trip: { city: string; code: string; from: string; to: string; flight: string };
  hints: string[];
}

export interface CipherConfig {
  /** Mot à retrouver (lettres A–Z sans accent). */
  plaintext: string;
  /** Relais du réseau : le nombre de relais actifs EST le décalage du chiffrement. */
  relays: { id: string; active: boolean }[];
  hints: string[];
}

export interface FinaleConfig {
  /** Stabilité perdue par seconde (sur 100). */
  drainPerSecond: number;
  /** Stabilité perdue par erreur. */
  errorDrain: number;
  /** Stabilité regagnée par étape validée. */
  stepGain: number;
  /** Durée de maintien des deux verrous, en secondes. */
  holdSeconds: number;
  /** Nombre d'anneaux à synchroniser. */
  syncRings: number;
  hints: { symbol: string; code: string; word: string };
}

export interface TextsConfig {
  tagline: string;
  pitch: string;
  facts: { value: string; label: string }[];
  /** Lignes du briefing ; {client} et {team} sont remplacés. */
  briefing: string[];
  stages: Record<StageId, { code: string; name: string; skill: string; intro: string; goal: string }>;
  teamSuggestions: string[];
  victoryTitle: string;
  victoryLine: string;
  failTitle: string;
  failLine: string;
}

export interface GameConfig {
  brand: BrandConfig;
  theme: ThemeConfig;
  /** Durée de la mission, en secondes. */
  durationSeconds: number;
  scoring: ScoringConfig;
  memory: { rounds: MemoryRound[]; replaySeconds: number };
  deduction: DeductionConfig;
  cipher: CipherConfig;
  finale: FinaleConfig;
  texts: TextsConfig;
}
