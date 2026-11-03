// RNG à seed (mulberry32). Seule source d'aléatoire autorisée dans /engine.
// L'état tient dans un entier 32 bits : il se sauvegarde et se restaure.

export interface RngHolder {
  rngState: number;
}

/** Normalise une seed quelconque en entier 32 bits non signé. */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(seed) >>> 0;
}

/** Tire un flottant dans [0, 1) et fait avancer l'état. */
export function nextFloat(h: RngHolder): number {
  h.rngState = (h.rngState + 0x6d2b79f5) >>> 0;
  let t = h.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entier dans [min, max] (bornes incluses). */
export function nextInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(nextFloat(h) * (max - min + 1));
}

/** true avec la probabilité p. Ne consomme pas d'aléatoire si p >= 1 ou p <= 0. */
export function chance(h: RngHolder, p: number): boolean {
  if (p >= 1) return true;
  if (p <= 0) return false;
  return nextFloat(h) < p;
}

export function pick<T>(h: RngHolder, list: readonly T[]): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(nextFloat(h) * list.length)];
}

/** Choisit n éléments distincts (ordre aléatoire). */
export function pickN<T>(h: RngHolder, list: readonly T[], n: number): T[] {
  const copy = list.slice();
  const out: T[] = [];
  const k = Math.min(n, copy.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(nextFloat(h) * (copy.length - i));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
    out.push(copy[i]);
  }
  return out;
}

/** Petit objet RNG autonome (outils, génération de seeds pour les simulations). */
export class Rng implements RngHolder {
  rngState: number;
  constructor(seed: number) {
    this.rngState = normalizeSeed(seed);
  }
  float(): number {
    return nextFloat(this);
  }
  int(min: number, max: number): number {
    return nextInt(this, min, max);
  }
}
