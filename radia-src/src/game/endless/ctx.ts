/**
 * Contexte du moteur Endless : la progression durable (`save.data.fun`) est liée UNE fois au moteur
 * (`bindEndless(save.data.fun)`) ; rules.ts la lit ensuite sans changer la signature des fonctions.
 * Sans appel, un état neuf est utilisé (tests / hors jeu). Aucun DOM.
 */
import { defaultFun, type FunState } from '../../save/fun';
import { Rng } from '../../utils/rng';

let current: FunState = defaultFun();

/** À appeler au lancement du mode infini (et après un chargement de sauvegarde). */
export function bindEndless(fun: FunState): void { current = fun; }
/** Remet un état neuf (tests). */
export function resetEndless(): FunState { current = defaultFun(); return current; }
export const endlessFun = (): FunState => current;

/** Compteur permanent (fun.endless2.counters). */
export const counter = (fun: FunState, k: string): number => fun.endless2.counters[k] ?? 0;
export function bump(fun: FunState, k: string, n = 1): number {
  const v = (fun.endless2.counters[k] ?? 0) + n;
  fun.endless2.counters[k] = v;
  return v;
}

/** Générateur aléatoire dérivé de l'état de la partie (n'avance pas s.rng : l'appelant le fait avec `advance`). */
export const subRng = (seed: number, salt: number): Rng => new Rng((seed ^ salt) >>> 0);
export const advance = (seed: number, by = 7919): number => (seed + by) >>> 0;
