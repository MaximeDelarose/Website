/**
 * Crochet « commandes livrées » pour les objectifs de rénovation.
 *
 * Le moteur Endless ne compte pas les livraisons PAR COLLECTION. Sans toucher au moteur, on s'abonne aux mêmes
 * événements que les événements secondaires : chaque événement passe par `advance()` des SEC_DEFS actifs
 * (secondary.ts › onEngineEvent). On enveloppe ces `advance` une seule fois ; un événement `deliver` n'est compté
 * qu'une fois (WeakSet), même si plusieurs événements secondaires l'observent. `noteBoardEvents` est aussi exposé
 * pour être appelé directement (tests ou futur câblage explicite) sans risque de double comptage.
 */
import { save } from '../core/app';
import { SEC_DEFS } from '../game/endless/secondary';
import type { BoardEvent } from '../game/merge/types';
import type { PlaceId } from './places';
import { ctxOf, noteBoardEvents } from './logic';

export { noteBoardEvents };

type Listener = (changed: PlaceId[]) => void;
const listeners = new Set<Listener>();
export const onDomainProgress = (fn: Listener): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

let installed = false;
/** À appeler une fois (idempotent) : enveloppe les `advance` des événements secondaires. */
export function installEngineHook(): void {
  if (installed) return;
  installed = true;
  for (const d of SEC_DEFS) {
    const orig = d.advance.bind(d);
    d.advance = (e: BoardEvent) => {
      try {
        if (e.t === 'deliver') {
          const changed = noteBoardEvents(ctxOf(save.data), [e]);
          if (changed.length) { save.save(); listeners.forEach((fn) => fn(changed)); }
        }
      } catch (err) { console.error('domain hook', err); }
      return orig(e);
    };
  }
}
