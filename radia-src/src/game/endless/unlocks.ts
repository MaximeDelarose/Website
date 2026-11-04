/** Déblocage progressif des collections (palier persistant). */
import { COLLECTION_IDS, type CollectionId } from '../../data/items';
import type { FunState } from '../../save/fun';
import { ENDLESS_CFG as C } from './config';
import { counter } from './ctx';

/** Points de palier = commandes livrées (cumul) + bonus par chaîne d'album complétée. */
export const tierPoints = (fun: FunState): number => counter(fun, 'orders') + C.unlock.chainBonus * counter(fun, 'chains');

/** Étape atteinte par un lieu (0 = à rénover … 4 = ouvert), lue dans fun.places sans dépendance au domaine. */
const placeStage = (fun: FunState, id: string): number => {
  const p = fun.places?.[id];
  return !p ? 0 : p.done ? 4 : Math.max(0, Math.min(4, Math.floor(p.stage)));
};

/**
 * Une collection est débloquée au seuil de points `at`, OU plus tôt quand son lieu est assez rénové
 * (salon de thé → pâtisseries, boutique de mode → sacs, hôtel → cadeaux) une fois `minPoints` atteints.
 */
export function isUnlocked(fun: FunState, c: CollectionId): boolean {
  const p = tierPoints(fun);
  if (p >= C.unlock.at[c]) return true;
  const bp = C.unlock.byPlace[c];
  return !!bp && p >= bp.minPoints && placeStage(fun, bp.place) >= bp.stage;
}

/** Collections débloquées (dans l'ordre de déblocage). */
export function unlockedColls(fun: FunState): CollectionId[] {
  return COLLECTION_IDS.filter((c) => isUnlocked(fun, c));
}

/** Collections dont le générateur est posé sur le plateau (les plus anciennes se reposent au-delà du maximum). */
export function activeColls(fun: FunState): CollectionId[] {
  const u = unlockedColls(fun);
  return u.length > C.unlock.maxBoardGens ? u.slice(u.length - C.unlock.maxBoardGens) : u;
}

/** Prochaine collection à débloquer : { coll, need (points), have } ou null. */
export function nextUnlock(fun: FunState): { coll: CollectionId; need: number; have: number } | null {
  const p = tierPoints(fun);
  const c = COLLECTION_IDS.find((x) => !isUnlocked(fun, x));
  return c ? { coll: c, need: C.unlock.at[c], have: p } : null;
}

/** « Palier » numérique (0..) pour l'interface : nombre de collections débloquées - 2. */
export const palier = (fun: FunState): number => Math.max(0, unlockedColls(fun).length - 2);
