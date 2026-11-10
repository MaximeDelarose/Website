/** Vibrations uniquement si l'appareil les prend en charge (non disponible sur Safari iOS). */
export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
export function buzz(pattern: number | number[] = 12) {
  try { if (canVibrate()) navigator.vibrate(pattern) } catch { /* ignoré */ }
}
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
