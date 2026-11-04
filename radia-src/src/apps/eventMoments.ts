/** Traduit la fin d'un événement du téléphone en « moment » (Snap / Clips). Les événements familiaux n'en émettent jamais. */
import { emitMoment, type MomentKind } from './moments';

const BY_ID: Record<string, MomentKind> = {
  'c-shooting': 'shooting', 'c-cover': 'shooting', 'c-runway': 'runway', 'c-concert': 'concert', 'c-fans': 'concert', 'c-casting': 'scene', 'c-premiere': 'scene',
  'r-restaurant': 'restaurant', 'r-palace': 'restaurant', 'r-fireworks': 'fireworks', 'g-day': 'restaurant',
};
export function momentKindForEvent(def: { id: string; category?: string }): MomentKind | null {
  if (def.category === 'family') return null;
  return BY_ID[def.id] ?? null;
}
export function announceEventMoment(def: { id: string; title: string; category?: string }): void {
  const kind = momentKindForEvent(def);
  if (kind) emitMoment({ kind, title: def.title, data: { event: def.id.slice(0, 20) } });
}

// ---- moments discrets de la vie au château (un par cooldown : jamais de spam de propositions)
const lastAt = new Map<string, number>();
export function softMoment(kind: MomentKind, title: string, cooldownMs: number, data?: Record<string, string | number>): void {
  const now = Date.now();
  if (now - (lastAt.get(kind) ?? 0) < cooldownMs) return;
  lastAt.set(kind, now);
  emitMoment({ kind, title, data });
}
/** Nouvelle tenue achetée ou portée pour la première fois dans la session. */
export function announceOutfit(id: string, name: string): void {
  softMoment('outfit', `Nouvelle tenue : ${name}`, 90_000, /^[a-z0-9-]{1,30}$/.test(id) ? { outfit: id } : undefined);
}
