/**
 * Roue quotidienne : règles PURES. Un seul tirage gratuit par jour (clé locale AAAA-MM-JJ passée en paramètre).
 * Le claim est ATOMIQUE : `lastKey` est écrit AVANT toute attribution, donc rechargement, double toucher ou
 * deuxième onglet ne peuvent jamais donner deux cadeaux le même jour. Le lot est tiré avant l'animation.
 */
import type { WheelState } from '../save/fun';
import { pickWeighted, randInt, type Rng } from '../casino/rng';
import { DECO_POOL, DUP_COINS, FASHION_POOL, LOTS, lotById, type LotDef } from './table';

export const isDayKey = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Clé de jour LOCALE (fuseau de l'appareil), décalage en jours pour les outils de test. */
export function dayKey(now: Date = new Date(), offsetDays = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 12);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const canSpin = (w: WheelState, key: string): boolean => isDayKey(key) && w.lastKey !== key;

/** Millisecondes avant minuit local (prochain tirage). */
export function msUntilNextDay(now: Date = new Date()): number {
  return Math.max(0, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime() - now.getTime());
}

/** Tire un lot selon la table (poids). */
export const rollLot = (rng: Rng): LotDef => LOTS[pickWeighted(LOTS.map((l) => l.weight), rng)];

/**
 * Réclame le tirage du jour : marque le jour d'abord, tire ensuite. null si déjà fait.
 * `forceId` : outil de test (mode debug).
 */
export function claimSpin(w: WheelState, key: string, rng: Rng, forceId?: string): LotDef | null {
  if (!canSpin(w, key)) return null;
  const lot = (forceId ? lotById(forceId) : undefined) ?? rollLot(rng);
  w.lastKey = key;
  w.spins += 1;
  w.last = lot.id;
  return lot;
}

// ------------------------------------------------------------------ attribution (contexte injectable)

/** Les vraies APIs du jeu, passées en paramètre pour rester testable. */
export interface WheelCtx {
  addCoins(n: number): void;
  giveDiamonds(n: number): void;
  giveEnergy(n: number): void;
  grantChips(n: number): void;
  ownsCloth(id: string): boolean;
  giveCloth(id: string): void;
  ownsDeco(id: string): boolean;
  giveDeco(id: string): void;
  addFragment(kind: string, n: number): void;
}

export interface Granted { lot: LotDef; /** détail lisible */ text: string; /** id de l'objet si objet */ itemId?: string; duplicate?: boolean; coins?: number }

/** Verse le lot ; un objet déjà possédé est remplacé par des pièces. Un objet inconnu n'est jamais attribué. */
export function applyLot(lot: LotDef, ctx: WheelCtx, rng: Rng): Granted {
  switch (lot.kind) {
    case 'coins': ctx.addCoins(lot.n); return { lot, text: `${lot.n} pièces`, coins: lot.n };
    case 'diamonds': ctx.giveDiamonds(lot.n); return { lot, text: `${lot.n} diamants` };
    case 'energy': ctx.giveEnergy(lot.n); return { lot, text: `${lot.n} énergies` };
    case 'chips': ctx.grantChips(lot.n); return { lot, text: `${lot.n} jetons de casino` };
    case 'fragment': ctx.addFragment('cloth', lot.n); return { lot, text: 'Un fragment de vêtement' };
    case 'fashion':
    case 'deco': {
      const pool: readonly string[] = lot.kind === 'fashion' ? FASHION_POOL : DECO_POOL;
      const owns = lot.kind === 'fashion' ? ctx.ownsCloth : ctx.ownsDeco;
      const fresh = pool.filter((id) => !owns(id));
      if (fresh.length === 0) { ctx.addCoins(DUP_COINS); return { lot, text: `Déjà possédé : ${DUP_COINS} pièces à la place`, duplicate: true, coins: DUP_COINS }; }
      const id = fresh[randInt(rng, fresh.length)];
      if (lot.kind === 'fashion') ctx.giveCloth(id); else ctx.giveDeco(id);
      return { lot, text: lot.name, itemId: id };
    }
  }
}
