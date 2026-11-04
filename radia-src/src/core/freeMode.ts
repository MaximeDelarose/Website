/**
 * MODE LIBRE : la suite de l'aventure, une fois les cinq chapitres terminés.
 * Logique pure (aucun DOM) : déblocage, libellés du bouton de l'écran titre, annonce unique.
 * Rien n'est jamais réinitialisé : inventaire, monnaies et générateurs restent tels quels.
 */
import { STORY } from '../data/story';
import type { SaveData } from '../save/schema';

type FreeSrc = Pick<SaveData, 'story' | 'fun'> & Partial<Pick<SaveData, 'endless'>>;

/**
 * Vrai quand les cinq chapitres sont terminés : la fin a été vue (`story.endingSeen`)
 * ou toute l'histoire est franchie (`story.step` au bout de la liste), ou le mode a déjà été marqué.
 * Les anciennes sauvegardes dont la fin est déjà vue sont donc débloquées d'emblée.
 */
export function isFreeModeUnlocked(d: FreeSrc): boolean {
  return d.fun.free.unlocked === true || d.story.endingSeen === true || d.story.step >= STORY.length;
}

/** Marque le mode libre (une seule fois, date conservée). Renvoie vrai à la première fois. */
export function syncFreeMode(d: FreeSrc, now = Date.now()): boolean {
  if (!isFreeModeUnlocked(d)) return false;
  const f = d.fun.free;
  const first = !f.unlocked;
  if (first) {
    f.unlocked = true;
    f.at = now;
  }
  return first;
}

/** L'annonce « L'aventure continue ♡ » n'est montrée qu'une fois, et seulement si le mode est débloqué. */
export const shouldAnnounceFree = (d: FreeSrc): boolean => isFreeModeUnlocked(d) && !d.fun.free.announced;
export function markFreeAnnounced(d: FreeSrc, now = Date.now()): void {
  syncFreeMode(d, now);
  d.fun.free.announced = true;
}

export interface ModeLabel { title: string; sub: string; free: boolean }

/** Libellé du grand bouton de l'écran titre : « MODE CHAPITRES » avant la fin, « MODE LIBRE » ensuite (définitivement). */
export function modeButtonLabel(d: FreeSrc, chaptersSub: string): ModeLabel {
  if (!isFreeModeUnlocked(d)) return { title: 'MODE CHAPITRES', sub: chaptersSub, free: false };
  const best = Math.max(0, Math.floor(d.endless?.best ?? 0));
  return { title: 'MODE LIBRE', sub: best > 0 ? `L'aventure continue ♡ · record ${best.toLocaleString('fr-FR')}` : 'L\'aventure continue ♡', free: true };
}
