/**
 * Attribution de « L'Éclat Éternel ♡ » : UNE seule porte d'entrée, la fin de la scène du feu d'artifice.
 * Garde « scène terminée » + anti-doublon strict. Jamais appelée en prévisualisation ni en replay.
 */
import { save } from '../../core/app';
import { world } from '../../core/world';
import { applyGrant, markSceneDone } from './state';
import { NECKLACE_ID } from './data';

const state = () => save.data.fun.necklace;

/** La scène est terminée jusqu'au bout (appelé une seule fois par la scène, juste avant l'attribution). */
export function finishScene(): void {
  markSceneDone(state());
  save.save();
}

/**
 * Attribue le collier : exige `sceneDone`, une seule fois. Renvoie vrai si l'objet vient d'être donné.
 * (Le dressing refuse de toute façon l'achat ; l'id n'est dans aucun pool de récompense.)
 */
export function grantNecklace(): boolean {
  const n = state();
  if (!applyGrant(n, Date.now())) return false;
  const w = world();
  if (!w.wardrobe.owned.includes(NECKLACE_ID)) w.wardrobe.owned.push(NECKLACE_ID);
  save.save();
  return true;
}

export const necklaceOwned = (): boolean => state().owned && world().wardrobe.owned.includes(NECKLACE_ID);
