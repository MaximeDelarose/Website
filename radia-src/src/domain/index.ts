/**
 * Domaine : lieux à rénover + carte. Point d'entrée : openDomainMap(), openPlace(id), domainStatus() (hub),
 * startDomain() (crochet des livraisons Endless + outils ?debug `RADIA.domain`).
 */
import './domain.css';
import { save, events } from '../core/app';
import { dbg } from '../core/debug';
import { syncFreeMode } from '../core/freeMode';
import { PLACE_IDS, isPlaceId, type PlaceId } from './places';
import * as L from './logic';
import { installEngineHook } from './hook';

export { openDomainMap, openPlace } from './ui';
export { onDomainProgress } from './hook';

/** Résumé réel pour le hub (aucun badge inventé). */
export const domainStatus = (now = Date.now()): L.DomainSummary => L.domainSummary(L.ctxOf(save.data), now);

let started = false;
export function startDomain(): void {
  if (started) return;
  started = true;
  installEngineHook();
  const c = (): L.Ctx => L.ctxOf(save.data);
  const done = (): void => { save.save(); events.emit('economy', undefined); };
  const pid = (id: string): PlaceId => { if (!isPlaceId(id)) throw new Error(`lieu inconnu : ${id} (${PLACE_IDS.join(', ')})`); return id; };
  dbg('domain', {
    unlockFree: () => { save.data.fun.free.unlocked = true; save.data.fun.free.at ||= Date.now(); done(); return true; },
    give: (res: 'coins' | 'flowers' | 'fabric' | 'cocoa', n = 1000) => { save.data.world.res[res] += Math.max(0, Math.floor(n)); done(); return save.data.world.res; },
    open: (id: string) => { syncFreeMode(save.data); L.devOpenPlace(c(), pid(id)); done(); return L.stageOf(save.data.fun, pid(id)); },
    advance: (id: string) => { const g = L.devCompleteStage(c(), pid(id)); done(); return g; },
    completeAll: () => { PLACE_IDS.forEach((id) => L.devOpenPlace(c(), id)); done(); return true; },
    satisfy: (id: string) => { L.devSatisfy(c(), pid(id)); done(); return true; },
    state: () => JSON.parse(JSON.stringify({ free: save.data.fun.free, places: save.data.fun.places })),
    map: () => L.mapNodes(c(), Date.now()),
  });
}
