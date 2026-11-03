/* Choix de la carte souvenir après une capture de Radia.
   - capture de la dame / d'une tour : carte réservée si elle n'a pas encore été vue dans la partie ;
   - pas de répétition dans une même partie tant que d'autres cartes sont disponibles ;
   - les longues déclarations (niveau 3) n'arrivent pas trop tôt ;
   - les cartes jamais découvertes sont favorisées. */
import type { MemoryCard } from "../content/types";
import type { PieceSymbol } from "chess.js";

export interface PickCardContext {
  captured: PieceSymbol;
  /** Rang de cette capture dans la partie (1 = première). */
  captureIndex: number;
  /** Parties terminées avant celle-ci. */
  gamesPlayed: number;
  shownThisGame: ReadonlySet<string>;
  seen: Readonly<Record<string, number>>;
}

export function tierAllowed(tier: number, captureIndex: number, gamesPlayed: number): boolean {
  if (tier <= 1) return true;
  if (tier === 2) return captureIndex >= 4 || gamesPlayed >= 1;
  return captureIndex >= 7 || gamesPlayed >= 2;
}

export function pickCard(cards: MemoryCard[], ctx: PickCardContext, rng: () => number = Math.random): MemoryCard | null {
  const playable = cards.filter((c) => !c.secret);
  if (!playable.length) return null;
  const trig = ctx.captured === "q" ? "queen" : ctx.captured === "r" ? "rook" : null;
  if (trig) {
    const special = playable.find((c) => c.trigger === trig && !ctx.shownThisGame.has(c.id));
    if (special) return special;
  }
  const general = playable.filter((c) => !c.trigger);
  const eligible = general.filter((c) => tierAllowed(c.tier, ctx.captureIndex, ctx.gamesPlayed));
  let pool = eligible.filter((c) => !ctx.shownThisGame.has(c.id));
  if (!pool.length) pool = general.filter((c) => !ctx.shownThisGame.has(c.id));
  if (!pool.length) {
    // tout a été vu dans cette partie : on revoit les moins vues
    const min = Math.min(...general.map((c) => ctx.seen[c.id] ?? 0));
    pool = general.filter((c) => (ctx.seen[c.id] ?? 0) === min);
  }
  if (!pool.length) pool = playable;
  const w = pool.map((c) => (c.weight ?? 1) * ((ctx.seen[c.id] ?? 0) === 0 ? 3 : 1));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
