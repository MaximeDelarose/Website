import type { BurstStats, PairStats } from "./protocol";

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[i];
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Aller-retour entre deux téléphones : `samples` = durées mesurées (ms), `lost` = réponses jamais reçues. */
export function pairStats(samples: number[], lost: number): PairStats {
  const s = [...samples].sort((a, b) => a - b);
  // Gigue : écart moyen entre mesures consécutives (dans l'ordre d'arrivée), comme dans la norme RTP.
  const diffs = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
  return {
    n: samples.length, lost,
    min: r1(s[0] ?? 0), med: r1(percentile(s, 0.5)), p95: r1(percentile(s, 0.95)), max: r1(s[s.length - 1] ?? 0),
    jitter: r1(diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0),
  };
}

/** Rafale de messages à cadence fixe : pertes, désordre, régularité d'arrivée. */
export function burstStats(sent: number, arrivals: { k: number; at: number }[], intervalMs: number): BurstStats {
  let ooo = 0;
  let maxK = -1;
  for (const a of arrivals) { if (a.k < maxK) ooo++; maxK = Math.max(maxK, a.k); }
  const gaps = arrivals.slice(1).map((a, i) => a.at - arrivals[i].at);
  const sorted = [...gaps].sort((a, b) => a - b);
  return {
    sent, got: arrivals.length, lost: Math.max(0, sent - arrivals.length), ooo,
    jitter: r1(stdev(gaps)), gapP95: r1(percentile(sorted, 0.95) || intervalMs),
  };
}

export type Verdict = "excellent" | "good" | "limit" | "bad";

/** Seuils retenus pour le jeu : un « tenir ensemble » tolère ~300 ms ; un relais d'énergie ~500 ms. */
export function verdictForRtt(p95Ms: number, lostRatio: number): Verdict {
  if (lostRatio > 0.1 || p95Ms > 600) return "bad";
  if (lostRatio > 0.03 || p95Ms > 400) return "limit";
  if (p95Ms > 200) return "good";
  return "excellent";
}
