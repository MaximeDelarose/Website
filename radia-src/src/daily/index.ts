/**
 * Cadeaux quotidiens (calendrier de 7 jours) : point d'entrée. `startDaily()` (une ligne dans main.ts) installe
 * le déclencheur au lancement et les outils de test (`RADIA.daily`, mode ?debug uniquement).
 */
import './daily.css';
import { save } from '../core/app';
import { dbg } from '../core/debug';
import { safeToNotify } from '../events/scheduler';
import { canClaimToday, claimToday, currentKey, dailyState, dayOffset, notifyDaily, setDayOffset } from './state';
import { migrateDaily, resetDaily, setDay } from './logic';
import { installCasinoEndlessHook } from '../casino/endlessHook';
import { startStartGift } from '../core/startGift';

export { dailyBadge } from './badge';
export { canClaimToday } from './state';

let started = false;
let autoShownKey = '';

const hasProgress = (): boolean => save.data.story.step > 0 || Object.keys(save.data.levels).length > 0;

/** Ouvre la fenêtre (chargée à la demande). */
export const showDaily = (auto = false): Promise<void> => import('./ui').then((m) => m.openDaily({ auto }));

function tick(): void {
  const key = currentKey();
  if (autoShownKey === key || !canClaimToday() || !hasProgress()) return;
  // seulement sur l'écran titre et à un moment sûr (jamais pendant fusion, mini-jeu, cinématique, événement…)
  if (!document.querySelector('.title-screen') || !safeToNotify()) return;
  autoShownKey = key; // une seule fois par jour et par session, même si on la ferme avec « Plus tard »
  void showDaily(true);
}

export function startDaily(): void {
  if (started) return;
  started = true;
  try { migrateDaily(dailyState()); } catch (e) { console.error('daily migration', e); }
  // Crochet « événements secondaires Endless → tickets du casino » (idempotent ; installé ici car startDaily() tourne au lancement)
  try { installCasinoEndlessHook(); } catch (e) { console.error('casino hook', e); }
  startStartGift(); // cadeau de démarrage (une seule fois par sauvegarde) + outils `RADIA.rewards`
  window.setInterval(() => { try { tick(); } catch (e) { console.error('daily', e); } }, 1500);
  dbg('daily', {
    show: () => { void showDaily(); },
    claim: () => { const r = claimToday(); return r ? { cycle: r.ticket.cycle + 1, jour: r.ticket.day + 1, lots: r.parts } : 'déjà réclamé aujourd\'hui'; },
    setDay: (n: number) => { setDay(dailyState(), n); dailyState().lastKey = ''; autoShownKey = ''; save.save(); notifyDaily(); },
    reset: () => { resetDaily(dailyState()); setDayOffset(0); autoShownKey = ''; save.save(); notifyDaily(); },
    skipDay: () => { setDayOffset(dayOffset() + 1); autoShownKey = ''; return currentKey(); },
    cycle: (n: number) => { setDay(dailyState(), 1, Math.max(1, Math.floor(n)) - 1); dailyState().lastKey = ''; autoShownKey = ''; save.save(); notifyDaily(); },
    state: () => ({ ...dailyState(), key: currentKey(), eligible: canClaimToday() }),
  });
}
