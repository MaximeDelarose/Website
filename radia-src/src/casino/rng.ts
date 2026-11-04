/** Tirages honnêtes : un RNG est une simple fonction [0,1) injectable (tests, graines de debug). */
export type Rng = () => number;

/** RNG par défaut : crypto si disponible (uniforme, non prévisible), sinon Math.random. */
export const defaultRng: Rng = () => {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
  } catch { /* repli */ }
  return Math.random();
};

/** Petit générateur déterministe (mulberry32) pour les tests et le mode debug. */
export function seededRng(seed: number): Rng {
  let a = (Math.floor(seed) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier uniforme dans [0, n). */
export const randInt = (rng: Rng, n: number): number => Math.min(n - 1, Math.floor(rng() * n));

/** Mélange de Fisher–Yates (copie) — chaque permutation a la même probabilité. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tirage pondéré : renvoie l'index choisi (poids entiers ≥ 0, somme > 0). */
export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}
