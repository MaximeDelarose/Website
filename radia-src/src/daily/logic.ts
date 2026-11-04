/**
 * Récompenses quotidiennes : règles PURES (aucun DOM). La date est une CLÉ locale « AAAA-MM-JJ » passée en
 * paramètre (testable). Aucune connexion obligatoire : manquer des jours ne remet jamais rien à zéro.
 */
import type { DailyState } from '../save/fun';
import { DAYS } from './calendar';

export const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDayKey = (s: unknown): s is string => typeof s === 'string' && DAY_KEY_RE.test(s);

/** Clé de jour LOCALE (fuseau de l'appareil), avec décalage de jours optionnel (outils de test). */
export function todayKey(now: Date = new Date(), offsetDays = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 12);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Éligible : la clé du jour est valide et différente de la dernière réclamation. */
export const isEligible = (d: DailyState, key: string): boolean => isDayKey(key) && d.lastKey !== key;

export interface Ticket { cycle: number; day: number; total: number; cycleDone: boolean }

/**
 * Réclame le cadeau du jour. SYNCHRONE et atomique : `lastKey` est écrit et le jour avancé AVANT que l'appelant
 * n'attribue quoi que ce soit, donc un double clic, un second onglet ou un rechargement ne peut rien offrir deux fois.
 * Renvoie null si déjà réclamé aujourd'hui (rien ne change).
 */
export function claim(d: DailyState, key: string): Ticket | null {
  if (!isEligible(d, key)) return null;
  const day = Math.min(DAYS - 1, Math.max(0, Math.floor(d.day)));
  const cycle = Math.max(0, Math.floor(d.cycle));
  d.lastKey = key;
  if (!d.claimed.includes(day)) d.claimed.push(day);
  d.total += 1;
  const cycleDone = day >= DAYS - 1;
  if (cycleDone) { d.cycle = cycle + 1; d.day = 0; d.claimed = []; } else d.day = day + 1;
  return { cycle, day, total: d.total, cycleDone };
}

/** Prochain cadeau (cycle, jour 0..6). */
export const peek = (d: DailyState): { cycle: number; day: number } => ({ cycle: Math.max(0, Math.floor(d.cycle)), day: Math.min(DAYS - 1, Math.max(0, Math.floor(d.day))) });

/** Outils de test : placer le calendrier sur le jour `n` (1..7) du cycle (index 0-based) sans toucher au reste. */
export function setDay(d: DailyState, n: number, cycle?: number): void {
  const day = Math.min(DAYS, Math.max(1, Math.floor(n))) - 1;
  if (cycle !== undefined) d.cycle = Math.max(0, Math.floor(cycle));
  d.day = day;
  d.claimed = Array.from({ length: day }, (_, i) => i);
}

export function resetDaily(d: DailyState): void {
  d.cycle = 0; d.day = 0; d.lastKey = ''; d.claimed = []; d.total = 0;
}
