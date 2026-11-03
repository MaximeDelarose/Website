/**
 * Mini-jeu « Modèle photo » : on choisit une pose et un décor, puis un défi de
 * timing (un viseur balaie l'écran, on déclenche au bon moment) pour 3 clichés.
 */
import { PHOTO_DECORS, POSES, type DecorDef, type PoseDef } from '../../../data/world/careers';
import type { Look } from '../../../data/world/ids';
import { lookStyleScore } from './model';
import type { Rng } from './rng';

export interface PhotoParams { speed: number; halfWidth: number; shots: number }
const SPEED = [0.5, 0.62, 0.75, 0.9, 1.08];
const HALF = [0.18, 0.15, 0.125, 0.1, 0.082];
export const photoParams = (difficulty: number): PhotoParams => {
  const i = Math.max(1, Math.min(5, Math.floor(difficulty))) - 1;
  return { speed: SPEED[i], halfWidth: HALF[i], shots: 3 };
};

export const poseById = (id: string): PoseDef => POSES.find((p) => p.id === id) ?? POSES[0];
export const decorById = (id: string): DecorDef => PHOTO_DECORS.find((d) => d.id === id) ?? PHOTO_DECORS[0];

/** Position du viseur (0–1), va-et-vient régulier. */
export function sweep(t: number, speed: number): number {
  const ph = (((t * speed) % 1) + 1) % 1;
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
}

/** Score d'un cliché 0–100 selon la distance au centre de la zone dorée. */
export function shotScore(pos: number, center: number, halfWidth: number): number {
  const e = Math.abs(pos - center);
  if (e <= halfWidth * 0.35) return 100;
  if (e <= halfWidth) return Math.round(100 - ((e - halfWidth * 0.35) / (halfWidth * 0.65)) * 30);
  if (e <= halfWidth * 2) return Math.round(70 - ((e - halfWidth) / halfWidth) * 70);
  return 0;
}

/** Centres des zones dorées pour chaque cliché (bien répartis). */
export function pickTargets(rng: Rng, shots: number): number[] {
  const out: number[] = [];
  let guard = 0;
  while (out.length < shots && guard++ < 200) {
    const c = 0.18 + rng() * 0.64;
    if (out.every((o) => Math.abs(o - c) > 0.16)) out.push(c);
  }
  while (out.length < shots) out.push(0.3 + out.length * 0.2);
  return out;
}

export interface ChoiceScore { decor: number; outfit: number; total: number }
/** Choix pose + décor + tenue portée : 0–40 points. */
export function choiceScore(poseId: string, decorId: string, look: Look): ChoiceScore {
  const pose = poseById(poseId);
  const decor = decorById(decorId);
  const dec = decor.styles.includes(pose.style) ? 25 : 8;
  const outfit = Math.round(lookStyleScore(look, pose.style) * 0.15);
  return { decor: dec, outfit, total: dec + outfit };
}

/** Score final 0–100 : choix (≤ 40) + timing (≤ 60). */
export function photoScore(poseId: string, decorId: string, look: Look, shots: number[]): number {
  const c = choiceScore(poseId, decorId, look).total;
  const t = shots.length ? shots.reduce((a, b) => a + b, 0) / shots.length : 0;
  return Math.max(0, Math.min(100, Math.round(c + t * 0.6)));
}

/** Étiquettes pour les objectifs (style de la pose). */
export const photoTags = (poseId: string): string[] => [poseById(poseId).style];
