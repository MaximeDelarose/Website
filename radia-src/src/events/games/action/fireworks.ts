/** Feux d'artifice & photo (logique pure). */
export interface Firework { launch: number; x: number; y: number; hue: number; hue2: number; size: number; inFrame: boolean }
export const RISE = 0.9;

export const COLOR_SETS: ReadonlyArray<readonly [string, string]> = [
  ['#ff75a8', '#ffd1e3'], ['#f3c86b', '#fff1b8'], ['#b9a5e8', '#e8dcff'], ['#7fd6e6', '#d5f6ff'], ['#8fd19e', '#dcffe3'], ['#ff9b6b', '#ffe0cc'],
];

/** Instant de l'explosion. */
export const burstAt = (f: Firework): number => f.launch + RISE;

/** Luminosité 0..1 d'une explosion `age` secondes après l'éclatement : pic à ~0,45 s, puis s'éteint (1,9 s). */
export function glow(age: number): number {
  if (age < 0 || age > 1.9) return 0;
  if (age < 0.45) { const u = age / 0.45; return 1 - (1 - u) * (1 - u); }
  if (age < 0.6) return 1;
  const u = (age - 0.6) / 1.3;
  return Math.max(0, 1 - Math.pow(u, 1.4));
}

/** Planning déterministe : environ un feu toutes les 2 s, parfois en doublé. */
export function schedule(rng: () => number, duration = 56): Firework[] {
  const out: Firework[] = [];
  let t = 2.2;
  while (t < duration) {
    const n = rng() < 0.2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const c = Math.floor(rng() * COLOR_SETS.length);
      const inFrame = rng() < 0.82;
      out.push({
        launch: +(t + i * 0.5).toFixed(3),
        x: inFrame ? 0.3 + rng() * 0.4 : (rng() < 0.5 ? 0.07 + rng() * 0.15 : 0.78 + rng() * 0.15),
        y: 0.2 + rng() * 0.2,
        hue: c, hue2: (c + 2) % COLOR_SETS.length, size: 0.75 + rng() * 0.5, inFrame,
      });
    }
    t += 1.8 + rng() * 1.1;
  }
  return out;
}

export interface ShotResult { score: number; colors: string[]; fw: number }

/** Note d'une prise à l'instant `t` : meilleure explosion visible (luminosité × cadrage), +8 si deux feux brillent. */
export function shotScore(fws: readonly Firework[], t: number): ShotResult {
  let best = 0; let bi = -1; let second = 0;
  fws.forEach((f, i) => {
    const g = glow(t - burstAt(f)) * (f.inFrame ? 1 : 0.35);
    if (g > best) { second = best; best = g; bi = i; } else if (g > second) second = g;
  });
  if (bi < 0 || best <= 0) return { score: 0, colors: [], fw: -1 };
  const score = Math.min(100, Math.round(best * 92 + (second > 0.5 ? 8 : 0)));
  const f = fws[bi];
  return { score, colors: [...COLOR_SETS[f.hue]], fw: bi };
}

export const shotLabel = (s: number): string => (s >= 85 ? 'Parfait !' : s >= 60 ? 'Joli cliché' : s >= 30 ? 'Un peu tôt ou tard' : 'Juste des étoiles');

export function summarize(shots: ShotResult[]): { score: number; best: string[] } {
  if (!shots.length) return { score: 0, best: [] };
  const sorted = [...shots].sort((a, b) => b.score - a.score);
  const avg = shots.reduce((a, s) => a + s.score, 0) / 5; // 5 prises prévues : les prises manquantes comptent 0
  return { score: Math.round(Math.min(100, avg * 0.6 + sorted[0].score * 0.4)), best: sorted[0].colors };
}
