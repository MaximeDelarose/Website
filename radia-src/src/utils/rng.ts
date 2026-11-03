/** Générateur pseudo-aléatoire déterministe (mulberry32) : état sérialisable. */
export class Rng {
  constructor(public state: number) { this.state = state >>> 0 || 0x9e3779b9; }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }

  pick<T>(arr: readonly T[]): T { return arr[this.int(arr.length)]; }

  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    let total = 0;
    for (const [, w] of entries) total += w;
    let r = this.next() * total;
    for (const [v, w] of entries) { r -= w; if (r < 0) return v; }
    return entries[entries.length - 1][0];
  }
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
