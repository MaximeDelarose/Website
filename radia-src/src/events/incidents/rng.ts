/** Petit générateur pseudo-aléatoire déterministe (graine → suite stable). Aucun DOM. */
export function rng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rint = (r: () => number, n: number): number => Math.min(n - 1, Math.floor(r() * n));
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rint(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
