/**
 * Format de sauvegarde (versionné) + validation champ par champ.
 * Une donnée invalide est remplacée par sa valeur par défaut : on ne plante
 * jamais à cause d'une sauvegarde abîmée, et on ne l'efface jamais en silence.
 */
import type { RunState } from '../game/merge/types';

export const SAVE_VERSION = 1;

export type ChessDifficulty = 'easy' | 'normal' | 'hard';

export interface Settings {
  music: number; // 0..1
  sfx: number; // 0..1
  musicOn: boolean;
  sfxOn: boolean;
  effects: 'full' | 'reduced';
  reducedMotion: boolean;
  textSpeed: 'normal' | 'fast' | 'instant';
}

export interface SaveData {
  v: number;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  story: {
    /** Index de la prochaine étape de l'histoire (voir data/story.ts). */
    step: number;
    /** Identifiant de la prochaine étape (voir stepKey). */
    stepKey?: string;
    choices: Record<string, string>;
    endingSeen: boolean;
    /** Identifiants des dialogues narratifs déjà vus, dans l'ordre (historique). */
    history: string[];
  };
  levels: Record<string, { stars: number; best: number; done: boolean }>;
  /** Partie de fusion en cours (niveau de l'histoire ou rejouée). */
  run: RunState | null;
  hearts: number;
  heartsTotal: number;
  boosters: { wand: number; wind: number };
  discovered: string[];
  memories: string[];
  /** Photos débloquées (album « Nos photos »). */
  photos: string[];
  achievements: Record<string, number>;
  stats: Record<string, number>;
  minigames: Record<string, { done: boolean; best: number }>;
  chess: {
    wins: Record<ChessDifficulty, number>;
    losses: number;
    draws: number;
    puzzles: string[];
    queen: string[];
    /** Partie en cours contre l'IA. */
    game: { pgn: string; difficulty: ChessDifficulty; color: 'w' | 'b' } | null;
  };
  endless: { best: number; runs: number; run: RunState | null; challenges: number };
  /** Message d'Auguste déjà affichés (anti-répétition). */
  barks: Record<string, number>;
}

export function defaultSave(): SaveData {
  const now = Date.now();
  return {
    v: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    settings: {
      music: 0.35,
      sfx: 0.7,
      musicOn: true,
      sfxOn: true,
      effects: 'full',
      reducedMotion: false,
      textSpeed: 'normal',
    },
    story: { step: 0, choices: {}, endingSeen: false, history: [] },
    levels: {},
    run: null,
    hearts: 0,
    heartsTotal: 0,
    boosters: { wand: 1, wind: 2 },
    discovered: [],
    memories: [],
    photos: [],
    achievements: {},
    stats: {},
    minigames: {},
    chess: { wins: { easy: 0, normal: 0, hard: 0 }, losses: 0, draws: 0, puzzles: [], queen: [], game: null },
    endless: { best: 0, runs: 0, run: null, challenges: 0 },
    barks: {},
  };
}

// ---------------------------------------------------------------- validation

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  return out;
}

function validRun(v: unknown): RunState | null {
  if (!isObj(v)) return null;
  if (!Array.isArray(v.cells) || v.cells.length !== 36) return null;
  for (const c of v.cells) {
    if (!isObj(c)) return null;
    for (const k of ['item', 'gift'] as const) {
      const it = c[k];
      if (it !== null && it !== undefined && !(isObj(it) && typeof it.c === 'string' && typeof it.l === 'number')) return null;
    }
  }
  if (!Array.isArray(v.orders)) return null;
  const r = v as unknown as RunState;
  r.lastMergeAt = 0;
  r.combo = num(r.combo, 0);
  r.cells = r.cells.map((c) => ({ item: c.item ?? null, gift: c.gift ?? null }));
  r.created = numRecord(r.created);
  for (const k of ['score', 'taps', 'merges', 'bestCombo', 'orderCursor', 'ordersDone', 'hearts', 'wandsEarned', 'rng', 'orderSerial', 'levelId'] as const) {
    (r as unknown as Record<string, number>)[k] = num(r[k], 0);
  }
  r.won = bool(r.won, false);
  r.mode = oneOf(r.mode, ['story', 'endless'] as const, 'story');
  return r;
}

/** Transforme n'importe quelle donnée en sauvegarde valide. */
export function sanitize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isObj(raw)) return d;
  const s = raw;
  d.createdAt = num(s.createdAt, d.createdAt);
  d.updatedAt = num(s.updatedAt, d.updatedAt);

  if (isObj(s.settings)) {
    const t = s.settings;
    d.settings = {
      music: num(t.music, d.settings.music, 0, 1),
      sfx: num(t.sfx, d.settings.sfx, 0, 1),
      musicOn: bool(t.musicOn, true),
      sfxOn: bool(t.sfxOn, true),
      effects: oneOf(t.effects, ['full', 'reduced'] as const, 'full'),
      reducedMotion: bool(t.reducedMotion, false),
      textSpeed: oneOf(t.textSpeed, ['normal', 'fast', 'instant'] as const, 'normal'),
    };
  }
  if (isObj(s.story)) {
    const choices: Record<string, string> = {};
    if (isObj(s.story.choices)) for (const [k, v] of Object.entries(s.story.choices)) if (typeof v === 'string') choices[k] = v;
    d.story = {
      step: Math.floor(num(s.story.step, 0, 0, 10_000)),
      stepKey: typeof s.story.stepKey === 'string' ? s.story.stepKey : undefined,
      choices,
      endingSeen: bool(s.story.endingSeen, false),
      history: strArr(s.story.history),
    };
  }
  if (isObj(s.levels)) {
    for (const [k, v] of Object.entries(s.levels)) {
      if (!isObj(v)) continue;
      d.levels[k] = { stars: Math.floor(num(v.stars, 0, 0, 3)), best: num(v.best, 0, 0), done: bool(v.done, false) };
    }
  }
  d.run = validRun(s.run);
  d.hearts = Math.floor(num(s.hearts, 0, 0));
  d.heartsTotal = Math.floor(num(s.heartsTotal, d.hearts, 0));
  if (isObj(s.boosters)) d.boosters = { wand: Math.floor(num(s.boosters.wand, 1, 0, 99)), wind: Math.floor(num(s.boosters.wind, 2, 0, 99)) };
  d.discovered = strArr(s.discovered);
  d.memories = strArr(s.memories);
  d.photos = strArr(s.photos);
  d.achievements = numRecord(s.achievements);
  d.stats = numRecord(s.stats);
  if (isObj(s.minigames)) {
    for (const [k, v] of Object.entries(s.minigames)) if (isObj(v)) d.minigames[k] = { done: bool(v.done, false), best: num(v.best, 0) };
  }
  if (isObj(s.chess)) {
    const c = s.chess;
    const w = isObj(c.wins) ? c.wins : {};
    d.chess.wins = { easy: num(w.easy, 0, 0), normal: num(w.normal, 0, 0), hard: num(w.hard, 0, 0) };
    d.chess.losses = num(c.losses, 0, 0);
    d.chess.draws = num(c.draws, 0, 0);
    d.chess.puzzles = strArr(c.puzzles);
    d.chess.queen = strArr(c.queen);
    if (isObj(c.game) && typeof c.game.pgn === 'string') {
      d.chess.game = {
        pgn: c.game.pgn,
        difficulty: oneOf(c.game.difficulty, ['easy', 'normal', 'hard'] as const, 'normal'),
        color: oneOf(c.game.color, ['w', 'b'] as const, 'w'),
      };
    }
  }
  if (isObj(s.endless)) {
    d.endless = {
      best: num(s.endless.best, 0, 0),
      runs: num(s.endless.runs, 0, 0),
      run: validRun(s.endless.run),
      challenges: num(s.endless.challenges, 0, 0),
    };
  }
  d.barks = numRecord(s.barks);
  void str;
  return d;
}

/**
 * Migrations : chaque entrée transforme la version N en N+1.
 * (Aucune pour l'instant : la V1 est le premier format.)
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrate(raw: unknown): { data: SaveData; migrated: boolean; tooNew: boolean } {
  if (!isObj(raw)) return { data: defaultSave(), migrated: false, tooNew: false };
  let v = num(raw.v, 1);
  if (v > SAVE_VERSION) return { data: sanitize(raw), migrated: false, tooNew: true };
  let cur = raw;
  let migrated = false;
  while (v < SAVE_VERSION) {
    const fn = MIGRATIONS[v];
    if (fn) cur = fn(cur);
    v++;
    migrated = true;
  }
  const data = sanitize(cur);
  data.v = SAVE_VERSION;
  return { data, migrated, tooNew: false };
}
