/**
 * Crochet « événements secondaires Endless → tickets du Casino Royal » (sur le modèle de src/domain/hook.ts).
 * Un palier franchi (ou un défi terminé = dernier palier) offre des tickets GRATUITS, une seule fois :
 *  - on enveloppe une fois les `advance` des SEC_DEFS ; le moteur appelle `advance(ev)` AVANT d'ajouter la progression,
 *    donc l'état « avant » est lisible ici et `endlessTicketsFor` simule exactement l'arithmétique de `onEngineEvent` ;
 *  - un même événement n'est compté qu'une fois par définition (WeakMap), même si le moteur le rejoue ;
 *  - la source « endless » est plafonnée par jour (tickets.ts).
 * Aucune récompense du moteur n'est touchée : c'est un petit bonus en plus, jamais requis.
 */
import { save } from '../core/app';
import { SEC_DEFS } from '../game/endless/secondary';
import type { BoardEvent } from '../game/merge/types';
import { earn, endlessTicketsFor } from './tickets';
import { notifyCasino } from './store';

const seen = new WeakMap<object, Set<string>>();
let installed = false;

/** Applique le crochet à un événement (exposé pour les tests). Renvoie les tickets versés. */
export function noteSecondaryEvent(defId: string, goals: readonly number[], inc: number, ev: object): number {
  if (!(inc > 0)) return 0;
  const mine = seen.get(ev) ?? new Set<string>();
  if (mine.has(defId)) return 0;
  mine.add(defId); seen.set(ev, mine);
  const sec = save.data.fun.endless2.sec.find((s) => s.id === defId);
  if (!sec) return 0;
  const { tickets } = endlessTicketsFor(sec, goals, inc);
  if (tickets <= 0) return 0;
  const got = earn(save.data.fun.casino, 'endless', tickets);
  if (got > 0) { try { save.save(); } catch { /* jamais bloquant */ } notifyCasino(); }
  return got;
}

/** À appeler une fois (idempotent). */
export function installCasinoEndlessHook(): void {
  if (installed) return;
  installed = true;
  for (const d of SEC_DEFS) {
    const orig = d.advance.bind(d);
    const goals = d.stages.map((s) => s.goal);
    d.advance = (e: BoardEvent) => {
      const inc = orig(e);
      try { noteSecondaryEvent(d.id, goals, inc, e); } catch (err) { console.error('casino hook', err); }
      return inc;
    };
  }
}
