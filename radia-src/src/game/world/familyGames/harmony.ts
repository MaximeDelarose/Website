/**
 * « Harmonie » : 5 manches. Chaque manche impose un thème ; on choisit la couleur
 * du mur, du sol et du rideau. Par emplacement : 3 points (couleur idéale),
 * 2 points (couleur qui s'accorde), 0 sinon ; −1 si la couleur répète celle
 * d'un autre emplacement. Maximum 9 par manche, 45 au total.
 */
import { HARMONY_THEMES, type HarmonyTheme } from '../../../data/world/family';
import type { ColorId } from '../../../data/world/ids';
import { shuffle, type Rng } from './rng';

export const HARMONY_ROUNDS = 5;
export const HARMONY_MAX_ROUND = 9;
export type Slot = 'wall' | 'floor' | 'curtain';
export const SLOTS: Slot[] = ['wall', 'floor', 'curtain'];
export type Picks = Record<Slot, ColorId>;

export interface HarmonyState {
  themes: HarmonyTheme[];
  round: number;
  scores: number[];
}

export function newHarmony(rng: Rng): HarmonyState {
  return { themes: shuffle(HARMONY_THEMES, rng).slice(0, HARMONY_ROUNDS), round: 0, scores: [] };
}

export function slotScore(theme: HarmonyTheme, slot: Slot, color: ColorId): number {
  const t = theme[slot];
  return t.best.includes(color) ? 3 : t.ok.includes(color) ? 2 : 0;
}

export function scoreRound(theme: HarmonyTheme, picks: Picks): { total: number; parts: Record<Slot, number> } {
  const parts = { wall: 0, floor: 0, curtain: 0 } as Record<Slot, number>;
  let total = 0;
  for (const s of SLOTS) {
    const dup = SLOTS.some((o) => o !== s && picks[o] === picks[s]);
    parts[s] = Math.max(0, slotScore(theme, s, picks[s]) - (dup ? 1 : 0));
    total += parts[s];
  }
  return { total, parts };
}

export const harmonyDone = (s: HarmonyState): boolean => s.round >= s.themes.length;
export const harmonyTheme = (s: HarmonyState): HarmonyTheme => s.themes[Math.min(s.round, s.themes.length - 1)];

/** Valide la manche en cours et passe à la suivante. */
export function submitRound(s: HarmonyState, picks: Picks): { total: number; parts: Record<Slot, number> } | null {
  if (harmonyDone(s)) return null;
  const r = scoreRound(s.themes[s.round], picks);
  s.scores.push(r.total);
  s.round += 1;
  return r;
}

export const harmonyTotal = (s: HarmonyState): number => s.scores.reduce((a, b) => a + b, 0);
export function harmonyStars(total: number): 1 | 2 | 3 {
  return total >= 36 ? 3 : total >= 24 ? 2 : 1;
}
