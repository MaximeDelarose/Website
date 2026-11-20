import type { ScoringConfig, StageScoring } from "../config/types";

export interface StageStats {
  durationMs: number;
  errors: number;
  hints: number;
  /** Pénalités diverses déjà exprimées en points (surcharges de la finale). */
  penalties: number;
}

export interface ScoreBreakdown {
  base: number;
  timeBonus: number;
  errorPenalty: number;
  hintPenalty: number;
  otherPenalty: number;
  total: number;
}

/** Coût cumulé de n indices : chaque indice a son prix, le dernier prix se répète. */
export function hintCost(rule: StageScoring, used: number): number {
  let sum = 0;
  for (let i = 0; i < used; i++) sum += rule.hintCosts[Math.min(i, rule.hintCosts.length - 1)];
  return sum;
}

/** Prix du prochain indice. */
export function nextHintCost(rule: StageScoring, used: number): number {
  return rule.hintCosts[Math.min(used, rule.hintCosts.length - 1)];
}

/**
 * Barème d'une épreuve réussie, identique pour toutes les équipes :
 *   base + bonus de rapidité (linéaire, de maxTimeBonus à 0 au temps de référence)
 *   − erreurs × pénalité − indices − autres pénalités, sans descendre sous le plancher.
 */
export function scoreStage(rule: StageScoring, stats: StageStats): ScoreBreakdown {
  const ratio = Math.max(0, 1 - stats.durationMs / (rule.parSeconds * 1000));
  const timeBonus = Math.round(rule.maxTimeBonus * ratio);
  const errorPenalty = stats.errors * rule.errorPenalty;
  const hintPenalty = hintCost(rule, stats.hints);
  const otherPenalty = stats.penalties;
  const raw = rule.base + timeBonus - errorPenalty - hintPenalty - otherPenalty;
  return { base: rule.base, timeBonus, errorPenalty, hintPenalty, otherPenalty, total: Math.max(rule.minScore, raw) };
}

export function timeLeftBonus(scoring: ScoringConfig, remainingMs: number): number {
  return Math.floor(Math.max(0, remainingMs) / 1000) * scoring.pointsPerSecondLeft;
}

export function rankFor(scoring: ScoringConfig, score: number) {
  return scoring.ranks.find((r) => score >= r.min) ?? scoring.ranks[scoring.ranks.length - 1];
}
