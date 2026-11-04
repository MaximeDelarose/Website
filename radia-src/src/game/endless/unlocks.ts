/** Déblocage progressif des collections (palier persistant). */
import { COLLECTION_IDS, type CollectionId } from '../../data/items';
import type { FunState } from '../../save/fun';
import { ENDLESS_CFG as C } from './config';
import { counter } from './ctx';

/** Points de palier = commandes livrées (cumul) + bonus par chaîne d'album complétée. */
export const tierPoints = (fun: FunState): number => counter(fun, 'orders') + C.unlock.chainBonus * counter(fun, 'chains');

/** Collections débloquées (dans l'ordre de déblocage). */
export function unlockedColls(fun: FunState): CollectionId[] {
  const p = tierPoints(fun);
  return COLLECTION_IDS.filter((c) => p >= C.unlock.at[c]);
}

/** Collections dont le générateur est posé sur le plateau (les plus anciennes se reposent au-delà du maximum). */
export function activeColls(fun: FunState): CollectionId[] {
  const u = unlockedColls(fun);
  return u.length > C.unlock.maxBoardGens ? u.slice(u.length - C.unlock.maxBoardGens) : u;
}

export const isUnlocked = (fun: FunState, c: CollectionId): boolean => tierPoints(fun) >= C.unlock.at[c];

/** Prochaine collection à débloquer : { coll, need (points), have } ou null. */
export function nextUnlock(fun: FunState): { coll: CollectionId; need: number; have: number } | null {
  const p = tierPoints(fun);
  const c = COLLECTION_IDS.find((x) => p < C.unlock.at[x]);
  return c ? { coll: c, need: C.unlock.at[c], have: p } : null;
}

/** « Palier » numérique (0..) pour l'interface : nombre de collections débloquées - 2. */
export const palier = (fun: FunState): number => Math.max(0, unlockedColls(fun).length - 2);
