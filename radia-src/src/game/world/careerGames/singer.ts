/**
 * Mini-jeu « Chanteuse » : jeu de rythme à 3 ou 4 pistes. Les notes tombent ;
 * on touche la piste au bon moment (Parfait / Bien / Raté). Les rythmes sont
 * générés à partir de motifs (donc différents à chaque concert).
 */
import { SONGS, type SongDef } from '../../../data/world/careers';
import { mulberry32, pick, type Rng } from './rng';

export interface Note { id: number; t: number; lane: number; judged: Judgement | null }
export type Judgement = 'perfect' | 'good' | 'miss';
export const WINDOW_PERFECT = 0.075;
export const WINDOW_GOOD = 0.16;
export const LEAD_IN = 2.2; // secondes avant la première note

export const songById = (id: number): SongDef => SONGS.find((s) => s.id === id) ?? SONGS[0];
/** Chansons disponibles selon la difficulté : la n-ième s'ouvre avec le palier n−1. */
export const unlockedSongs = (difficulty: number): SongDef[] => SONGS.filter((s) => s.id <= Math.max(1, Math.min(4, difficulty)));

export const stepDuration = (song: SongDef): number => 60 / song.bpm / 2;

/** Génère la partition : un motif par mesure, sans répéter deux fois le même d'affilée. */
export function makeChart(song: SongDef, seed: number | Rng): Note[] {
  const rng = typeof seed === 'number' ? mulberry32(seed) : seed;
  const step = stepDuration(song);
  const notes: Note[] = [];
  let last = -1;
  for (let bar = 0; bar < song.bars; bar++) {
    let mi = bar === 0 ? 0 : Math.floor(rng() * song.motifs.length);
    if (mi === last && song.motifs.length > 1) mi = (mi + 1) % song.motifs.length;
    last = mi;
    // dernière mesure : final simple
    const motif = bar === song.bars - 1 ? [0, -1, -1, -1, Math.min(2, song.lanes - 1), -1, -1, -1] : song.motifs[mi];
    motif.forEach((lane, s) => {
      if (lane >= 0 && lane < song.lanes) notes.push({ id: notes.length, t: LEAD_IN + (bar * 8 + s) * step, lane, judged: null });
    });
  }
  return notes;
}

export const songDuration = (song: SongDef): number => LEAD_IN + song.bars * 8 * stepDuration(song) + 1;

export class RhythmEngine {
  perfect = 0;
  good = 0;
  miss = 0;
  combo = 0;
  maxCombo = 0;
  constructor(public notes: Note[]) {}

  get total(): number { return this.notes.length; }
  get judged(): number { return this.perfect + this.good + this.miss; }

  private apply(j: Judgement): void {
    if (j === 'perfect') this.perfect++;
    else if (j === 'good') this.good++;
    else this.miss++;
    if (j === 'miss') this.combo = 0;
    else { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
  }

  /** Juge un toucher sur une piste à l'instant `t`. Null si aucune note proche (toucher à vide, sans pénalité). */
  hit(lane: number, t: number): { note: Note; judgement: Judgement } | null {
    let best: Note | null = null;
    for (const n of this.notes) {
      if (n.judged || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d <= WINDOW_GOOD && (!best || d < Math.abs(best.t - t))) best = n;
      if (n.t - t > WINDOW_GOOD) break;
    }
    if (!best) return null;
    const j: Judgement = Math.abs(best.t - t) <= WINDOW_PERFECT ? 'perfect' : 'good';
    best.judged = j;
    this.apply(j);
    return { note: best, judgement: j };
  }

  /** Marque « Raté » les notes passées. Renvoie celles-ci (pour l'affichage). */
  update(t: number): Note[] {
    const missed: Note[] = [];
    for (const n of this.notes) {
      if (!n.judged && n.t < t - WINDOW_GOOD) { n.judged = 'miss'; this.apply('miss'); missed.push(n); }
      else if (n.t > t + 1) break;
    }
    return missed;
  }

  finished(t: number): boolean { this.update(t); return this.judged >= this.total; }

  /** Score 0–100. */
  score(): number {
    if (!this.total) return 0;
    return Math.max(0, Math.min(100, Math.round((100 * (this.perfect + 0.65 * this.good)) / this.total)));
  }
}

export function singerTags(song: SongDef, score: number): string[] {
  const t = [`song${song.id}`];
  if (score >= 75) t.push(`song${song.id}s`);
  return t;
}

export { pick };
