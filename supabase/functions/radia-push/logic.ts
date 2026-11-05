/**
 * RADIA ♡ — logique PURE des notifications quotidiennes (fuseau horaire, une par jour, pas de nuit, rotation des messages).
 * Utilisée par la fonction Edge (supabase/functions/radia-push/index.ts) ET testée dans radia-src/tests/push-logic.test.ts.
 */
import { THOUGHTS, type Cat } from './messages.ts';

export interface SubLike { tz: string; send_hour: number; enabled: boolean; last_sent_day: string | null; deck: number[]; last_idx: number }

/** Jour (AAAA-MM-JJ) et heure locale (0–23) dans un fuseau IANA ; fuseau inconnu → Europe/Paris. */
export function localParts(nowMs: number, tz: string): { day: string; hour: number } {
  let f: Intl.DateTimeFormat;
  try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }); }
  catch { f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }); }
  const p = Object.fromEntries(f.formatToParts(new Date(nowMs)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

/** Plage d'envoi : jamais la nuit (avant 8 h ni à partir de 21 h, heure locale). */
export const SEND_FROM = 8;
export const SEND_UNTIL = 21;

/** Une seule notification par jour local, à partir de l'heure choisie (8–20 h), jamais la nuit ; rattrapage possible jusqu'à 21 h. */
export function isDue(s: SubLike, nowMs: number): boolean {
  if (!s.enabled) return false;
  const { day, hour } = localParts(nowMs, s.tz);
  const from = Math.min(SEND_UNTIL - 1, Math.max(SEND_FROM, Math.floor(s.send_hour)));
  return hour >= from && hour < SEND_UNTIL && s.last_sent_day !== day;
}

/** Mélange déterministe (Fisher-Yates) d'un tirage `rnd` ∈ [0,1). */
export function shuffled(n: number, rnd: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Message suivant : on vide un « paquet » mélangé (aucun message deux fois avant d'avoir tout vu), en évitant deux fois la même catégorie
 * d'affilée et la répétition de la toute dernière pensée quand le paquet est rebattu.
 */
export function nextThought(deck: number[], lastIdx: number, rnd: () => number): { idx: number; deck: number[] } {
  let d = deck.filter((i) => Number.isInteger(i) && i >= 0 && i < THOUGHTS.length);
  if (!d.length) { d = shuffled(THOUGHTS.length, rnd); if (d.length > 1 && d[0] === lastIdx) d.push(d.shift() as number); }
  const lastCat: Cat | null = lastIdx >= 0 && lastIdx < THOUGHTS.length ? THOUGHTS[lastIdx].cat : null;
  let pos = d.findIndex((i) => THOUGHTS[i].cat !== lastCat);
  if (pos < 0) pos = 0;
  const idx = d[pos];
  return { idx, deck: d.filter((_, k) => k !== pos) };
}
