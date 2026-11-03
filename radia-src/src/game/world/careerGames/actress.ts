/**
 * Mini-jeu « Actrice » : une scène en 5 répliques ; à chaque fois, on choisit
 * l'émotion (l'expression de Radia) qui convient le mieux.
 */
import { SCENES, type Beat, type SceneDef, type Take } from '../../../data/world/careers';
import { pick, shuffle, type Rng } from './rng';

export interface PlayBeat { cue: string; options: Take[] }
export interface PlayScene { id: string; title: string; synopsis: string; beats: PlayBeat[] }

export const optionCount = (difficulty: number): number => (difficulty <= 2 ? 3 : 4);
export const TAKE_POINTS = [0, 10, 20];

/** Prépare une scène adaptée à la difficulté (plus de choix, scènes plus subtiles). */
export function buildScene(difficulty: number, rng: Rng, avoid?: string): PlayScene {
  const pool = SCENES.filter((s) => s.level <= difficulty);
  const fresh = pool.filter((s) => s.id !== avoid);
  const sc: SceneDef = pick(fresh.length ? fresh : pool, rng);
  const n = optionCount(difficulty);
  const beats = sc.beats.map((b: Beat): PlayBeat => {
    const best = b.takes.filter((t) => t.q === 2);
    const mid = shuffle(b.takes.filter((t) => t.q === 1), rng);
    const low = shuffle(b.takes.filter((t) => t.q === 0), rng);
    const chosen: Take[] = [best[0] ?? b.takes[0]];
    if (mid[0]) chosen.push(mid[0]);
    for (const t of [...low, ...mid.slice(1)]) { if (chosen.length >= n) break; chosen.push(t); }
    return { cue: b.cue, options: shuffle(chosen, rng) };
  });
  return { id: sc.id, title: sc.title, synopsis: sc.synopsis, beats };
}

export const scoreTake = (t: Take): number => TAKE_POINTS[t.q];
export const scoreScene = (takes: Take[]): number => Math.min(100, takes.reduce((a, t) => a + scoreTake(t), 0));
export const sceneTags = (id: string): string[] => [`scene:${id}`];
export const isPerfect = (takes: Take[]): boolean => takes.length === 5 && takes.every((t) => t.q === 2);
