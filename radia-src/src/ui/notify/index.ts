/** Instance unique du gestionnaire de notices (voir core.ts pour les règles). */
import { NotifyCore, type NotifyItem, type PushResult } from './core';

const blocked = (): boolean => {
  if (typeof document === 'undefined') return true;
  if (document.hidden) return true;
  // pendant une ouverture de coffre / cadeau, la couche récompense est seule au premier plan
  return !!document.querySelector('#reward-overlay .rw-root');
};

export const core = new NotifyCore({
  now: () => Date.now(),
  blocked,
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (h) => window.clearTimeout(h as number),
  gapMs: 350,
  // Endless : la voie sous le plateau ne fait qu'UNE ligne — toasts et pastilles s'y partagent une place (jamais sur les cases)
  sharedLane: () => !!document.querySelector('.merge-hud.endless .mh-dock'),
});

/** Demande l'affichage d'une notice : le gestionnaire décide quand (jamais deux importantes ensemble, jamais de superposition). */
export const notify = (item: NotifyItem): PushResult => core.push(item);

/** Tests / changement d'écran : retire tout. */
export const clearNotices = (): void => core.clear();

export type { NotifyItem, PushResult };
