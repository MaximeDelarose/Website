/* La personnalité d'Auguste : choisir un coup « humain » parmi les candidats
   notés par le moteur. Il ne joue pas toujours le meilleur coup, commet des
   imprécisions plausibles (des coups que le moteur a lui-même jugés sérieux),
   rarement une vraie gaffe, et ne lâche jamais sa dame gratuitement.
   Fonctions pures : testées dans tests/persona.test.ts. */
import type { Candidate } from "./uci";

export type Difficulty = "doux" | "joueur" | "defi";

export interface PersonaConfig {
  label: string;
  short: string;
  description: string;
  /** Profondeur d'analyse Stockfish et nombre de lignes candidates. */
  depth: number;
  multipv: number;
  /** Chance de jouer directement le meilleur coup. */
  bestChance: number;
  /** « Température » (cp) du tirage : plus elle est haute, plus les coups moyens sont choisis. */
  temperature: number;
  /** Perte maximale tolérée d'habitude (cp). */
  maxLoss: number;
  /** Chance, à chaque coup, d'autoriser une vraie erreur. */
  blunderChance: number;
  /** Perte maximale lors d'une erreur (cp) — sous la valeur d'une dame. */
  blunderMaxLoss: number;
  /** Chance de voir un mat quand il en a un. */
  mateSight: number;
  /** Profondeur du moteur de secours (si Stockfish ne se charge pas). */
  fallbackLevel: number;
}

export const DIFFICULTIES: Record<Difficulty, PersonaConfig> = {
  doux: {
    label: "Doux", short: "Doux", description: "Il joue gentiment et laisse des occasions.",
    depth: 6, multipv: 12, bestChance: 0.12, temperature: 150, maxLoss: 250,
    blunderChance: 0.12, blunderMaxLoss: 480, mateSight: 0.7, fallbackLevel: 2,
  },
  joueur: {
    label: "Joueur", short: "Joueur", description: "Il protège ses pièces et réagit aux menaces.",
    depth: 8, multipv: 10, bestChance: 0.3, temperature: 85, maxLoss: 190,
    blunderChance: 0.06, blunderMaxLoss: 360, mateSight: 0.9, fallbackLevel: 3,
  },
  defi: {
    label: "Petit défi", short: "Défi", description: "Plus stratégique, il voit davantage de tactiques.",
    depth: 10, multipv: 8, bestChance: 0.5, temperature: 45, maxLoss: 120,
    blunderChance: 0.03, blunderMaxLoss: 260, mateSight: 1, fallbackLevel: 4,
  },
};

export type MoveQuality = "best" | "good" | "inaccuracy" | "mistake" | "forced";

export interface Choice {
  uci: string;
  /** Perte par rapport au meilleur coup (cp, ≥ 0). */
  loss: number;
  quality: MoveQuality;
  /** Score du coup choisi, point de vue d'Auguste. */
  cp: number;
  /** Réponse attendue du moteur (meilleure riposte de l'adversaire), si connue. */
  expectedReply?: string;
  /** Évaluation après ce coup si l'adversaire répond au mieux (point de vue d'Auguste). */
  bestCp: number;
}

export interface PickContext {
  /** Nombre de demi-coups déjà joués. */
  ply: number;
}

export function qualityOf(loss: number): MoveQuality {
  if (loss <= 15) return "best";
  if (loss <= 70) return "good";
  if (loss < 180) return "inaccuracy";
  return "mistake";
}

/**
 * Choisit un coup. `cands` doit être trié du meilleur au moins bon (score du camp au trait).
 * `rng` renvoie un nombre dans [0, 1[.
 */
export function pickMove(cands: Candidate[], cfg: PersonaConfig, rng: () => number, ctx: PickContext): Choice | null {
  if (!cands.length) return null;
  const best = cands[0];
  const make = (c: Candidate, forcedQ?: MoveQuality): Choice => {
    const loss = Math.max(0, best.cp - c.cp);
    return { uci: c.uci, loss, quality: forcedQ ?? qualityOf(loss), cp: c.cp, expectedReply: c.pv[1], bestCp: best.cp };
  };
  if (cands.length === 1) return make(best, "forced");

  // Un mat à portée : le plus souvent il le voit…
  if (best.mate !== undefined && best.mate > 0) {
    if (rng() < cfg.mateSight) return make(best);
  }

  // Jamais de coup qui se fait mater ni qui offre gratuitement la dame (perte ≥ blunderMaxLoss).
  // Quand il gagne nettement, il se relâche un peu (un joueur humain se déconcentre).
  const comfy = best.cp > 300 ? 1.4 : 1;
  // En ouverture (10 premiers demi-coups), on reste raisonnable : pas de gaffe.
  const opening = ctx.ply < 10;
  const allowBlunder = !opening && rng() < cfg.blunderChance * comfy;
  const cap = allowBlunder ? cfg.blunderMaxLoss : opening ? Math.min(cfg.maxLoss, 120) : cfg.maxLoss;

  const pool = cands.filter((c) => {
    const loss = best.cp - c.cp;
    if (loss > cap) return false;
    if (c.mate !== undefined && c.mate < 0) return false; // ne se jette pas dans un mat
    if (best.cp > -2000 && c.cp < -2000) return false; // ni dans une position perdue d'office
    return true;
  });

  if (!allowBlunder && rng() < cfg.bestChance) return make(best);
  if (pool.length <= 1) return make(best);

  // Pour une erreur volontairement autorisée, on choisit dans la tranche « erreur ».
  if (allowBlunder) {
    const errs = pool.filter((c) => best.cp - c.cp >= 150);
    if (errs.length) return make(errs[Math.floor(rng() * errs.length)]);
  }

  const T = cfg.temperature * comfy;
  const weights = pool.map((c) => Math.exp(-(best.cp - c.cp) / T));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return make(pool[i]);
  }
  return make(pool[pool.length - 1]);
}

/** Temps de « réflexion » humain (ms), en fonction de la pendule restante. */
export function thinkDelay(rng: () => number, remainingMs: number, quality: MoveQuality, legalCount: number): number {
  if (legalCount <= 1) return 350;
  let t = 650 + rng() * 1300;
  if (quality === "mistake") t += 300; // il « hésite »… puis se trompe
  if (legalCount > 30) t += 300;
  if (remainingMs < 120_000) t *= 0.6;
  if (remainingMs < 30_000) t = Math.min(t, 400);
  if (remainingMs < 8_000) t = 120;
  return t;
}
