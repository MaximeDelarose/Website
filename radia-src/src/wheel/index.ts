/**
 * Roue de cadeaux quotidienne ♡ — points d'entrée (voir src/casino/README.md).
 *  - `openWheel()` : ouvre l'écran (promesse résolue à la fermeture) ;
 *  - `wheelReady(now?)` / `nextWheelIn(now?)` : le tirage du jour est-il disponible ? sinon dans combien de ms.
 * Un seul tirage gratuit par jour (date locale), aucun achat.
 */
import './wheel.css';
import { dbg } from '../core/debug';
import { save } from '../core/app';
import { dayOffset, force, setDayOffset, wheelReady, nextWheelIn, wheelState, currentKey } from './store';
import { LOTS, probOf } from './table';

export { wheelReady, nextWheelIn };

/** Ouvre la roue du jour (écran chargé à la demande). */
export const openWheel = (): Promise<void> => import('./ui').then((m) => m.showWheel());

dbg('wheel', {
  show: () => openWheel(),
  reset: () => { const w = wheelState(); w.lastKey = ''; w.spins = 0; w.last = ''; setDayOffset(0); save.save(); return 'roue remise à zéro'; },
  skipDay: () => { setDayOffset(dayOffset() + 1); return currentKey(); },
  force: (id: string) => { if (!LOTS.some((l) => l.id === id)) return `lot inconnu (${LOTS.map((l) => l.id).join(', ')})`; force.id = id; return `prochain lot : ${id}`; },
  state: () => ({ ...wheelState(), key: currentKey(), ready: wheelReady(), nextIn: nextWheelIn(), probs: LOTS.map((l) => [l.id, probOf(l)]) }),
});
