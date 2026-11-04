/**
 * Scène secrète « Tindeur » — logique pure (aucun DOM).
 * Se déclenche UNE seule fois après ≥ 15 min de jeu actif CONSÉCUTIF (une pause de plus de 90 s,
 * onglet caché ou sans toucher, remet le compteur à zéro). Aucun malus, aucun jugement.
 */
import type { TindeurState } from '../../save/fun';

export const TINDEUR = {
  /** Jeu actif consécutif nécessaire (ms). */
  needMs: 15 * 60_000,
  /** Pause d'inactivité qui remet la série à zéro (ms). */
  resetGapMs: 90_000,
  /** Sans toucher l'écran depuis ce délai, on n'est plus « en train de jouer » (ms). */
  inputGraceMs: 20_000,
} as const;

/** Mémoire volatile : durée de la pause en cours. */
export interface StreakMem { gapMs: number }
export const newMem = (): StreakMem => ({ gapMs: 0 });

/**
 * Fait avancer la série. `engaged` : l'onglet est visible ET l'écran a été touché récemment.
 * Une courte pause ne coûte rien (la série ne progresse juste pas) ; ≥ 90 s la remet à zéro.
 */
export function advanceStreak(t: TindeurState, mem: StreakMem, dt: number, engaged: boolean): void {
  if (!(dt > 0)) return;
  const d = Math.min(dt, 30_000);
  if (engaged) { mem.gapMs = 0; if (!t.shown) t.streakMs += d; return; }
  mem.gapMs += d;
  if (mem.gapMs >= TINDEUR.resetGapMs) t.streakMs = 0;
}

export const shouldTrigger = (t: TindeurState, safe: boolean): boolean => safe && !t.shown && t.installed && t.streakMs >= TINDEUR.needMs;

export function markShown(t: TindeurState, now: number): void { t.shown = true; t.at = now; }

/** Réponse à « Que souhaites-tu faire de Tindeur ? » (ou réglage du téléphone). */
export function choose(t: TindeurState, choice: 'keep' | 'uninstall', now: number): void {
  t.shown = true;
  if (!t.at) t.at = now;
  t.choice = choice;
  t.installed = choice === 'keep';
}
/** Nombre d'essais nécessaires pour désinstaller (les précédents sont refusés avec un mot d'Auguste). */
export const UNINSTALL_TRIES = 3;
export const UNINSTALL_REFUSAL = 'Pas utile de désinstaller celle d’ici ♡';
/**
 * Essai de désinstallation : les deux premiers sont refusés (l'appli reste, sans malus ni jugement),
 * le troisième désinstalle pour de bon. `now` sert uniquement à dater le choix.
 */
export function tryUninstall(t: TindeurState, now: number): { ok: boolean; tries: number } {
  t.uninstallTries = Math.min(99, (t.uninstallTries ?? 0) + 1);
  if (t.uninstallTries >= UNINSTALL_TRIES) { choose(t, 'uninstall', now); return { ok: true, tries: t.uninstallTries }; }
  // refus : l'application reste installée et le choix initial est considéré comme fait (plus de pastille « à choisir »)
  t.shown = true;
  if (!t.at) t.at = now;
  t.choice = 'keep';
  t.installed = true;
  return { ok: false, tries: t.uninstallTries };
}
/** Réglages du téléphone : réinstaller (= garder) ou désinstaller. */
export function setInstalled(t: TindeurState, installed: boolean, now: number): void { choose(t, installed ? 'keep' : 'uninstall', now); }

/** Source de messages non lus (Tindeur jouable) : branchée par src/events/tindeur/swipe/runtime.ts. */
let extraUnread: () => number = () => 0;
export function setUnreadSource(fn: () => number): void { extraUnread = fn; }

/** Nouveau match jamais ouvert, ou message non lu : l'icône garde une pastille. */
export const hasPending = (t: TindeurState): boolean => t.installed && ((t.shown && t.choice === 'none') || extraUnread() > 0);

export function resetTindeur(t: TindeurState): void { t.shown = false; t.choice = 'none'; t.installed = true; t.at = 0; t.streakMs = 0; }

export const TEXTS = {
  matches: 'Vous avez 2 500 matchs !',
  newMatch: 'Vous avez un nouveau match. Souhaitez-vous lui répondre ?',
  question: 'Que souhaites-tu faire de Tindeur ?',
  uninstall: 'Désinstaller l’appli',
  keep: 'Garder l’application, au cas où je trouve mieux et pour continuer à parler à des gars',
} as const;
