/**
 * Reflet périodique du bracelet « La promesse d'Auguste ♡ » (logique pure, sans DOM).
 * `shineAt(t)` ∈ [0,1] : 0 = apparence normale ; sinon progression (0,1] d'un reflet qui glisse sur le bijou
 * (le dessin en déduit la position du reflet et son intensité, maximale à mi-course).
 */
export const BRACELET_ID = 'br-promise' as const;

/** Durée d'un reflet (secondes). */
export const SHINE_DURATION = 0.9;
/** Intervalles entre deux reflets (4–6 s, répétés en boucle : la période totale est leur somme). */
export const SHINE_GAPS: readonly number[] = [4.6, 5.6, 4.8];
export const SHINE_PERIOD = SHINE_GAPS.reduce((a, b) => a + b, 0);
/** Nombre de pas de quantification (pour le cache des canvas d'avatar). */
export const SHINE_STEPS = 6;

/** Reflet à l'instant `t` (secondes). Toujours 0 si `reduced` (effets réduits) ou si `t` n'est pas un nombre fini. */
export function shineAt(t: number, reduced = false): number {
  if (reduced || !Number.isFinite(t)) return 0;
  let p = ((t % SHINE_PERIOD) + SHINE_PERIOD) % SHINE_PERIOD;
  for (const gap of SHINE_GAPS) {
    if (p < gap) return p < SHINE_DURATION ? p / SHINE_DURATION : 0;
    p -= gap;
  }
  return 0;
}

/** Pas entier 0…SHINE_STEPS (0 = pas de reflet) ; tout reflet > 0 donne au moins le pas 1. */
export function shineStep(shine: number): number {
  if (!Number.isFinite(shine) || shine <= 0) return 0;
  return Math.min(SHINE_STEPS, Math.max(1, Math.ceil(Math.min(1, shine) * SHINE_STEPS)));
}

/** Reflet arrondi au pas de quantification. */
export const quantizeShine = (shine: number): number => shineStep(shine) / SHINE_STEPS;

/** Intensité lumineuse (0…1) d'un reflet de progression `shine` : maximale à mi-course. */
export const shineGlow = (shine: number): number => (shine > 0 ? Math.sin(Math.PI * Math.min(1, shine)) : 0);
