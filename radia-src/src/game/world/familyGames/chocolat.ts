/**
 * « Chocolats en famille » : 3 recettes de difficulté croissante, à suivre dans
 * l'ordre. Se tromper ne bloque jamais (un « oups » et on continue) mais coûte
 * des étoiles. Chaque recette fabrique un chocolat de CHOC_IDS.
 */
import { CHOC_RECIPES, type ChocRecipe, type IngredientId } from '../../../data/world/family';
import type { ChocId } from '../../../data/world/ids';

export interface ChocState {
  recipe: number;
  step: number;
  mistakes: number;
  made: ChocId[];
}

export const newChoc = (): ChocState => ({ recipe: 0, step: 0, mistakes: 0, made: [] });
export const chocDone = (s: ChocState): boolean => s.recipe >= CHOC_RECIPES.length;
export const currentRecipe = (s: ChocState): ChocRecipe => CHOC_RECIPES[Math.min(s.recipe, CHOC_RECIPES.length - 1)];
export const nextIngredient = (s: ChocState): IngredientId | null => (chocDone(s) ? null : currentRecipe(s).steps[s.step]);

export type ChocPick = 'ok' | 'wrong' | 'recipeDone' | 'ignored';

export function pickIngredient(s: ChocState, ing: IngredientId): ChocPick {
  if (chocDone(s)) return 'ignored';
  const r = currentRecipe(s);
  if (r.steps[s.step] !== ing) { s.mistakes += 1; return 'wrong'; }
  s.step += 1;
  if (s.step >= r.steps.length) {
    s.made.push(r.id);
    s.recipe += 1;
    s.step = 0;
    return 'recipeDone';
  }
  return 'ok';
}

export const chocStars = (mistakes: number): 1 | 2 | 3 => (mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1);
export const chocScore = (mistakes: number): number => Math.max(30, 300 - mistakes * 15);
