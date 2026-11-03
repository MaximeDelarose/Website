/** Rythme (logique pure, sans DOM) : motif de notes déterministe, jugement du timing, score. */
export type SongId = 'waltz' | 'concert';
export interface SongDef { id: SongId; title: string; bpm: number; beatsPerBar: number; lanes: number; duration: number; leadIn: number; tail: number }
export interface Note { t: number; lane: number; big: boolean }
export type Judgment = 'perfect' | 'good' | 'miss';

export const SONGS: Record<SongId, SongDef> = {
  waltz: { id: 'waltz', title: 'Bal romantique', bpm: 84, beatsPerBar: 3, lanes: 2, duration: 46, leadIn: 2.6, tail: 2 },
  concert: { id: 'concert', title: 'Concert', bpm: 108, beatsPerBar: 4, lanes: 3, duration: 50, leadIn: 2.6, tail: 2 },
};

/** Fenêtres généreuses (secondes). */
export const PERFECT_WIN = 0.12;
export const GOOD_WIN = 0.26;

export const beatLen = (s: SongDef): number => 60 / s.bpm;

/**
 * Motif de notes pour une chanson. Déterministe pour un `rng` donné (mulberry32 du run).
 * Contraintes : notes triées, espacées d'au moins une demi-pulsation, sur [leadIn, leadIn+duration],
 * débutant simplement (premières mesures : une note par mesure), voie jamais répétée plus de 3 fois d'affilée.
 */
export function generatePattern(song: SongId, rng: () => number): Note[] {
  const s = SONGS[song];
  const bl = beatLen(s);
  const notes: Note[] = [];
  const total = Math.floor(s.duration / bl);
  let lane = Math.floor(rng() * s.lanes);
  let run = 0;
  for (let b = 0; b < total; b++) {
    const bar = Math.floor(b / s.beatsPerBar);
    const inBar = b % s.beatsPerBar;
    const t = s.leadIn + b * bl;
    let place = false;
    if (bar < 3) place = inBar === 0;
    else if (inBar === 0) place = true;
    else place = rng() < (song === 'concert' ? 0.62 : 0.45);
    if (!place) continue;
    let next = lane;
    if (bar >= 1 || notes.length > 0) {
      next = Math.floor(rng() * s.lanes);
      if (next === lane && run >= 3) next = (next + 1 + Math.floor(rng() * (s.lanes - 1))) % s.lanes;
    }
    run = next === lane ? run + 1 : 1;
    lane = next;
    notes.push({ t: +t.toFixed(4), lane, big: inBar === 0 });
    // demi-pulsation occasionnelle (concert) pour du relief
    if (song === 'concert' && bar >= 4 && inBar > 0 && rng() < 0.12 && b + 1 < total) {
      notes.push({ t: +(t + bl / 2).toFixed(4), lane: (lane + 1) % s.lanes, big: false });
    }
  }
  return notes.sort((a, b) => a.t - b.t);
}

/** Jugement d'un appui à `dt` secondes de la note (valeur absolue utilisée). */
export function judge(dt: number): Judgment {
  const a = Math.abs(dt);
  return a <= PERFECT_WIN ? 'perfect' : a <= GOOD_WIN ? 'good' : 'miss';
}

export interface Tally { perfects: number; goods: number; misses: number; combo: number; bestCombo: number; points: number }
export const newTally = (): Tally => ({ perfects: 0, goods: 0, misses: 0, combo: 0, bestCombo: 0, points: 0 });

/** Applique un jugement : combo, multiplicateur (x1 → x4 par tranche de 8). */
export function applyJudgment(t: Tally, j: Judgment): Tally {
  if (j === 'miss') { t.misses++; t.combo = 0; return t; }
  if (j === 'perfect') t.perfects++; else t.goods++;
  t.combo++;
  t.bestCombo = Math.max(t.bestCombo, t.combo);
  const mult = Math.min(4, 1 + Math.floor(t.combo / 8));
  t.points += (j === 'perfect' ? 100 : 60) * mult;
  return t;
}

/** Jauge d'amour 0..1 : monte avec les réussites, descend doucement avec les ratés (jamais éliminatoire). */
export function gaugeAfter(g: number, j: Judgment): number {
  const d = j === 'perfect' ? 0.045 : j === 'good' ? 0.025 : -0.035;
  return Math.min(1, Math.max(0.12, g + d));
}

/** Score final 0..100 : précision pondérée. */
export function finalScore(t: Tally, totalNotes: number): number {
  if (totalNotes <= 0) return 0;
  const acc = (t.perfects + t.goods * 0.6) / totalNotes;
  return Math.round(Math.min(1, acc) * 100);
}

export const isOk = (score: number): boolean => score >= 35;
