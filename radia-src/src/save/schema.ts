/**
 * Format de sauvegarde (versionné) + validation champ par champ.
 * Une donnée invalide est remplacée par sa valeur par défaut : on ne plante
 * jamais à cause d'une sauvegarde abîmée, et on ne l'efface jamais en silence.
 */
import { customerById } from '../data/customers';
import { defaultEvents, sanitizeEvents } from '../events/state';
import { defaultFun, sanitizeFun, type FunState } from './fun';
import type { EventsState } from '../events/types';
import type { OrderState, RunState } from '../game/merge/types';
import { capLocks, validLock } from '../game/merge/locks';
import { COLLECTION_IDS, GENERATORS, collMax, type ItemColl, type ItemRef } from '../data/items';
import { defaultFace, sanitizeFace, upgradeUntouchedFace, type FaceCustom } from '../data/world/face';
import { DEFAULT_LOOK, STARTER_CLOTHES, KID_IDS, ROOM_IDS, type Look, type KidId, type RoomId } from '../data/world/ids';

export const SAVE_VERSION = 5;

export type ChessDifficulty = 'relax' | 'easy' | 'normal' | 'hard';

/** Aides facultatives des échecs (mémorisées). */
export interface ChessOpts { legal: boolean; threats: boolean; captures: boolean; tutorial: boolean }

export interface Settings {
  music: number; // 0..1
  sfx: number; // 0..1
  musicOn: boolean;
  sfxOn: boolean;
  effects: 'full' | 'reduced';
  reducedMotion: boolean;
  textSpeed: 'normal' | 'fast' | 'instant';
  /** v5 — retours haptiques (si l'appareil le permet). */
  haptics: boolean;
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
    /** Dernière humeur choisie (« Détente ♡ » par défaut). */
    pref?: ChessDifficulty;
    /** Aides activées. */
    opts?: ChessOpts;
    /** Bulles du tutoriel déjà vues. */
    tut?: string[];
  };
  endless: { best: number; runs: number; run: RunState | null; challenges: number };
  /** Message d'Auguste déjà affichés (anti-répétition). */
  barks: Record<string, number>;
  /** v2 — économie façon jeu de fusion mobile (aucun argent réel). */
  economy: Economy;
  /** v2 — apparence du plateau achetée avec des diamants. */
  cosmetics: { tiles: string; fx: string; owned: string[] };
  /** v2 — décorations de « Notre petit monde ». */
  decor: string[];
  /** Nouveautés déjà présentées (une seule fois chacune). */
  seenUpdates: string[];
  /** v3 — « Le château de Radia » : château, dressing, chat, famille, jardin, chocolats, carrières, fans. */
  world: World;
  /** v4 — invitations surprises, téléphone, photos souvenirs. */
  events: EventsState;
  /** v5 — Endless 2.0, cadeaux quotidiens, incidents, Tindeur. */
  fun: FunState;
}

/**
 * Meuble posé. x, y en cases (multiples de 0,5 depuis la refonte de la décoration ; anciens entiers conservés).
 * rot : orientation 0-3 ; variant : style (ex. tableau) ; on : uid du meuble qui le porte (objet posé sur une table, un canapé…).
 * Mur : x le long du mur, y la hauteur depuis le haut. Plafond : x seulement. Tous les champs ajoutés sont optionnels.
 */
export interface PlacedItem { uid: number; id: string; x: number; y: number; color: string; flip?: boolean; rot?: number; variant?: string; on?: number }
export interface RoomState { wall: string; floor: string; curtain: string; items: PlacedItem[] }
export interface KidState { bond: number; games: Record<string, { best: number; plays: number }>; seenScenes: string[] }
export interface GardenPlot { flower: string | null; plantedAt: number; stage: number }

export interface World {
  /** Ressources gagnées en fusionnant et en livrant des commandes. */
  res: { coins: number; flowers: number; fabric: number; cocoa: number };
  castle: {
    unlocked: RoomId[];
    rooms: Record<RoomId, RoomState>;
    /** Meubles possédés (id → quantité achetée). Un meuble placé reste « possédé ». */
    owned: Record<string, number>;
    nextUid: number;
  };
  wardrobe: {
    owned: string[];
    look: Look;
    /** Trois emplacements de tenue favorite. */
    looks: ({ name: string; look: Look } | null)[];
    hairOwned: string[];
    /** « Personnaliser Radia » : visage actuel (peau, formes, yeux, sourcils, nez, bouche, cheveux, voile, maquillage). */
    face: FaceCustom;
    /** Six emplacements de visages enregistrés. */
    faces: ({ name: string; face: FaceCustom } | null)[];
  };
  cat: {
    adopted: boolean;
    name: string;
    items: string[];
    equipped: { collar: string | null; bed: string | null };
    bond: number;
    treats: number;
    lastSeen: number;
    counters: Record<string, number>;
  };
  family: { kids: Record<KidId, KidState>; scenes: string[] };
  garden: {
    plots: (GardenPlot | null)[];
    plotCount: number;
    unlocked: string[];
    harvested: Record<string, number>;
    bouquets: Record<string, number>;
    seeds: Record<string, number>;
  };
  choc: { recipes: string[]; made: Record<string, number>; boxes: number; shopLevel: number; collection: string[] };
  careers: { current: string | null; progress: Record<string, { level: number; xp: number; best: number }> };
  fans: number;
  fansTierSeen: number;
  magazines: string[];
  /** Drapeaux de tutoriels, scènes vues… (une clé par fonctionnalité). */
  flags: Record<string, boolean>;
  /** Compteurs libres pour chaque module (clés préfixées : « garden.xxx », « cat.xxx »…). */
  extra: Record<string, number>;
}

const emptyRoom = (wall: string, floor: string, curtain: string): RoomState => ({ wall, floor, curtain, items: [] });

export function defaultWorld(): World {
  const rooms = {} as Record<RoomId, RoomState>;
  const base: Record<RoomId, [string, string, string]> = {
    bedroom: ['rose', 'cream', 'lavender'], salon: ['cream', 'beige', 'rose'], dressing: ['lavender', 'white', 'rose'],
    reception: ['white', 'gold', 'rose'], garden: ['sage', 'beige', 'white'], familySalon: ['peach', 'cream', 'sage'],
    kid1: ['peach', 'cream', 'rose'], kid2: ['lavender', 'white', 'rose'], kid3: ['sage', 'cream', 'cream'],
  };
  for (const r of ROOM_IDS) rooms[r] = emptyRoom(...base[r]);
  const kids = {} as Record<KidId, KidState>;
  for (const k of KID_IDS) kids[k] = { bond: 0, games: {}, seenScenes: [] };
  return {
    res: { coins: 60, flowers: 0, fabric: 0, cocoa: 0 },
    castle: { unlocked: ['bedroom', 'salon', 'garden'], rooms, owned: {}, nextUid: 1 },
    wardrobe: { owned: [...STARTER_CLOTHES], look: { ...DEFAULT_LOOK, hair: 'hair-wavy', acc: [] }, looks: [null, null, null], hairOwned: ['hair-loose', 'hair-wavy'], face: defaultFace(), faces: [null, null, null, null, null, null] },
    cat: { adopted: false, name: '', items: [], equipped: { collar: null, bed: null }, bond: 0, treats: 3, lastSeen: 0, counters: {} },
    family: { kids, scenes: [] },
    garden: { plots: [null, null, null, null], plotCount: 4, unlocked: ['rose', 'daisy', 'tulip'], harvested: {}, bouquets: {}, seeds: {} },
    choc: { recipes: ['milk', 'dark'], made: {}, boxes: 0, shopLevel: 1, collection: [] },
    careers: { current: null, progress: {} },
    fans: 0,
    fansTierSeen: -1,
    magazines: [],
    flags: {},
    extra: {},
  };
}

export interface Economy {
  energy: number;
  /** Instant (ms) de la dernière mise à jour de l'énergie (recharge naturelle). */
  energyTs: number;
  diamonds: number;
  /** Réserve d'énergie HÉRITÉE : l'ancien surplus au-dessus du maximum (100) d'avant le plafonnement. Elle n'est utilisée que lorsque l'énergie tombe à 0 ; rien ne l'alimente plus. */
  reserve: number;
  /** Dernière recharge gratuite prise / dernier coffre gratuit ouvert (ms). */
  freeRefillTs: number;
  freeChestTs: number;
  /** Sac de rangement : objets mis de côté hors du plateau. */
  bag: { c: string; l: number }[];
  bagSlots: number;
  /** Nombre de « paiements » avec la carte d'Auguste (fictifs). */
  giftCount: number;
  diamondsGifted: number;
}

export const defaultEconomy = (): Economy => ({
  energy: 100, energyTs: Date.now(), diamonds: 10, reserve: 0, freeRefillTs: 0, freeChestTs: 0, bag: [], bagSlots: 6, giftCount: 0, diamondsGifted: 0,
});

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
      haptics: true,
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
    chess: { wins: { relax: 0, easy: 0, normal: 0, hard: 0 }, losses: 0, draws: 0, puzzles: [], queen: [], game: null, pref: 'relax', opts: { legal: true, threats: true, captures: true, tutorial: true }, tut: [] },
    endless: { best: 0, runs: 0, run: null, challenges: 0 },
    barks: {},
    economy: defaultEconomy(),
    cosmetics: { tiles: 'classic', fx: 'classic', owned: ['classic'] },
    decor: [],
    seenUpdates: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'],
    world: defaultWorld(),
    events: defaultEvents(),
    fun: defaultFun(),
  };
}

// ---------------------------------------------------------------- validation

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
/** Position en demi-cases (les anciennes sauvegardes, entières, ne changent pas). */
const half = (v: number) => Math.round(v * 2) / 2;
/** Champs optionnels d'un meuble posé (orientation, style, support) : n'écrit rien s'ils sont absents ou invalides. */
function placedExtras(i: Record<string, unknown>): { rot?: number; variant?: string; on?: number } {
  const o: { rot?: number; variant?: string; on?: number } = {};
  if (typeof i.rot === 'number' && Number.isFinite(i.rot)) { const r = ((Math.round(i.rot) % 4) + 4) % 4; if (r) o.rot = r; }
  if (typeof i.variant === 'string' && /^[a-z0-9-]{1,24}$/.test(i.variant)) o.variant = i.variant;
  if (typeof i.on === 'number' && Number.isFinite(i.on) && i.on > 0) o.on = Math.floor(i.on);
  return o;
}
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  return out;
}

/** Objet de plateau valide (collection connue, niveau dans les bornes) ou null. */
function validItem(it: unknown): { c: ItemColl; l: number } | null {
  if (!isObj(it) || typeof it.c !== 'string' || typeof it.l !== 'number' || !Number.isFinite(it.l)) return null;
  const l = Math.floor(it.l);
  if (it.c === 'special') return l >= 1 && l <= 3 ? { c: 'special', l } : null;
  if (it.c === 'gen') return GENERATORS[l] ? { c: 'gen', l } : null;
  if (!(COLLECTION_IDS as string[]).includes(it.c)) return null;
  return l >= 1 && l <= collMax(it.c as ItemColl) ? { c: it.c as ItemColl, l } : null;
}

/** Commande valide (objets connus) ; les champs Endless 2.0 sont facultatifs et nettoyés. */
function validOrder(o: unknown): OrderState | null {
  if (!isObj(o) || !Array.isArray(o.items)) return null;
  const items = o.items.map(validItem);
  if (!items.length || items.some((x) => !x || x.c === 'gen' || x.c === 'special')) return null;
  const out: OrderState = { items: items as ItemRef[], id: Math.floor(num(o.id, 0, 0)) };
  if (o.tier === 'easy' || o.tier === 'mid' || o.tier === 'hard') out.tier = o.tier;
  if (isObj(o.reward)) {
    const r = o.reward;
    out.reward = {
      hearts: Math.floor(num(r.hearts, 3, 0, 9999)), coins: Math.floor(num(r.coins, 5, 0, 99999)),
      mat: r.mat === 'flowers' || r.mat === 'fabric' || r.mat === 'cocoa' ? r.mat : null,
      matN: Math.floor(num(r.matN, 0, 0, 999)), energy: Math.floor(num(r.energy, 2, 0, 99)), treasure: num(r.treasure, 2, 0, 99),
    };
  }
  if (typeof o.customer === 'string' && customerById(o.customer)) out.customer = o.customer;
  if (typeof o.progress === 'number' && Number.isFinite(o.progress)) out.progress = Math.max(0, Math.min(1, o.progress));
  return out;
}

function validRun(v: unknown): RunState | null {
  if (!isObj(v)) return null;
  if (!Array.isArray(v.cells) || v.cells.length !== 36) return null;
  for (const c of v.cells) if (!isObj(c)) return null;
  if (!Array.isArray(v.orders)) return null;
  const r = v as unknown as RunState;
  r.lastMergeAt = 0;
  r.combo = num(r.combo, 0);
  // objets inconnus (version future, corruption) → case vide plutôt que perdre toute la partie
  r.cells = (v.cells as Record<string, unknown>[]).map((c) => {
    const lock = validLock(c.lock);
    return lock ? { item: validItem(c.item), gift: validItem(c.gift), lock } : { item: validItem(c.item), gift: validItem(c.gift) };
  });
  capLocks(r.cells);
  if (isObj(r.board) && r.mode === 'endless') r.board = { v: 1 }; else delete r.board;
  r.orders = (v.orders as unknown[]).slice(0, 4).map(validOrder);
  r.created = numRecord(r.created);
  for (const k of ['score', 'taps', 'merges', 'bestCombo', 'orderCursor', 'ordersDone', 'hearts', 'wandsEarned', 'rng', 'orderSerial', 'levelId'] as const) {
    (r as unknown as Record<string, number>)[k] = num(r[k], 0);
  }
  r.won = bool(r.won, false);
  r.mode = oneOf(r.mode, ['story', 'endless'] as const, 'story');
  // Endless 2.0 (tous facultatifs) : on garde ce qui est valide, on retire le reste
  delete r.clock;
  r.activeMs = num(r.activeMs, 0, 0);
  if (isObj(r.comboWin)) r.comboWin = { t0: 0, n: num(r.comboWin.n, 0, 0, 99), e: num(r.comboWin.e, 0, 0, 999) }; else delete r.comboWin;
  if (r.lastDropMerge !== undefined) r.lastDropMerge = num(r.lastDropMerge, -99);
  if (r.replaceGrantedAt !== undefined) r.replaceGrantedAt = num(r.replaceGrantedAt, 0, 0);
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
      haptics: bool(t.haptics, true),
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
    d.chess.wins = { relax: num(w.relax, 0, 0), easy: num(w.easy, 0, 0), normal: num(w.normal, 0, 0), hard: num(w.hard, 0, 0) };
    d.chess.losses = num(c.losses, 0, 0);
    d.chess.draws = num(c.draws, 0, 0);
    d.chess.puzzles = strArr(c.puzzles);
    d.chess.queen = strArr(c.queen);
    // anciennes sauvegardes : pas de préférence → « Détente » (parties en cours conservées telles quelles)
    d.chess.pref = oneOf(c.pref, ['relax', 'easy', 'normal', 'hard'] as const, 'relax');
    const o = isObj(c.opts) ? c.opts : {};
    d.chess.opts = { legal: bool(o.legal, true), threats: bool(o.threats, true), captures: bool(o.captures, true), tutorial: bool(o.tutorial, true) };
    d.chess.tut = strArr(c.tut).slice(0, 30);
    if (isObj(c.game) && typeof c.game.pgn === 'string') {
      d.chess.game = {
        pgn: c.game.pgn,
        difficulty: oneOf(c.game.difficulty, ['relax', 'easy', 'normal', 'hard'] as const, 'normal'),
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
  if (isObj(s.economy)) {
    const e = s.economy;
    const bag = Array.isArray(e.bag) ? e.bag.filter((x): x is { c: string; l: number } => isObj(x) && typeof x.c === 'string' && typeof x.l === 'number' && x.c !== 'gen') : [];
    // Plafond d'énergie : 100 maximum. Un ancien surplus (ex. 644) n'est PAS perdu : il devient la réserve (voir Economy.reserve).
    const rawEnergy = Math.floor(num(e.energy, 100, 0, 99_999));
    d.economy = {
      energy: Math.min(100, rawEnergy),
      reserve: Math.floor(Math.min(9999, num(e.reserve, 0, 0, 9999) + Math.max(0, rawEnergy - 100))),
      energyTs: num(e.energyTs, Date.now(), 0),
      diamonds: Math.floor(num(e.diamonds, 30, 0, 99_999_999)),
      freeRefillTs: num(e.freeRefillTs, 0, 0),
      freeChestTs: num(e.freeChestTs, 0, 0),
      bag,
      bagSlots: Math.floor(num(e.bagSlots, 6, 6, 24)),
      giftCount: Math.floor(num(e.giftCount, 0, 0)),
      diamondsGifted: Math.floor(num(e.diamondsGifted, 0, 0)),
    };
    d.economy.bag = d.economy.bag.slice(0, d.economy.bagSlots);
  }
  if (isObj(s.cosmetics)) {
    const owned = strArr(s.cosmetics.owned);
    if (!owned.includes('classic')) owned.unshift('classic');
    const tiles = str(s.cosmetics.tiles, 'classic');
    const fx = str(s.cosmetics.fx, 'classic');
    d.cosmetics = { owned, tiles: owned.includes(tiles) ? tiles : 'classic', fx: owned.includes(fx) ? fx : 'classic' };
  }
  d.decor = strArr(s.decor);
  if (Array.isArray(s.seenUpdates)) d.seenUpdates = strArr(s.seenUpdates);
  d.world = sanitizeWorld(s.world);
  d.events = sanitizeEvents(s.events);
  d.fun = sanitizeFun(s.fun);
  void str;
  return d;
}

/**
 * Migrations : chaque entrée transforme la version N en N+1.
 * (Aucune pour l'instant : la V1 est le premier format.)
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v4 → v5 : Endless 2.0 (données neuves, rien d'existant ne change ; « Nouveautés » v5 à présenter).
  4: (raw) => ({ ...raw, fun: defaultFun() }),
  // v3 → v4 : invitations surprises. Rien d'autre ne change.
  3: (raw) => ({ ...raw, events: defaultEvents() }),
  // v2 → v3 : le château de Radia (monde). On ajoute l'état par défaut, rien d'autre ne change.
  2: (raw) => ({ ...raw, world: defaultWorld(), seenUpdates: Array.isArray(raw.seenUpdates) ? raw.seenUpdates : ['v2'] }),
  // v1 → v2 : arrivée de l'énergie, des diamants, du sac, des décorations.
  // On offre 50 diamants de bienvenue et on prévoit l'écran « Nouveautés ».
  1: (raw) => ({
    ...raw,
    economy: { ...defaultEconomy(), diamonds: 15 },
    cosmetics: { tiles: 'classic', fx: 'classic', owned: ['classic'] },
    decor: [],
    seenUpdates: [],
  }),
};

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


// ------------------------------------------------------------ monde (v3)

function sanitizeLook(v: unknown): Look {
  const d: Look = { ...DEFAULT_LOOK, acc: [] };
  if (!isObj(v)) return d;
  const sl = (x: unknown) => (typeof x === 'string' ? (x as never) : null);
  return {
    hair: typeof v.hair === 'string' ? (v.hair as Look['hair']) : d.hair,
    top: sl(v.top), bottom: sl(v.bottom), dress: sl(v.dress), jacket: sl(v.jacket), shoes: sl(v.shoes), bag: sl(v.bag),
    acc: strArr(v.acc) as Look['acc'], crown: sl(v.crown),
  };
}

export function sanitizeWorld(raw: unknown): World {
  const d = defaultWorld();
  if (!isObj(raw)) return d;
  const w = raw;
  if (isObj(w.res)) {
    for (const k of ['coins', 'flowers', 'fabric', 'cocoa'] as const) d.res[k] = Math.floor(num(w.res[k], d.res[k], 0, 999_999_999));
  }
  if (isObj(w.castle)) {
    const c = w.castle;
    const un = strArr(c.unlocked).filter((r): r is RoomId => (ROOM_IDS as readonly string[]).includes(r));
    if (un.length) d.castle.unlocked = un;
    if (isObj(c.rooms)) {
      for (const r of ROOM_IDS) {
        const rs = c.rooms[r];
        if (!isObj(rs)) continue;
        const items = Array.isArray(rs.items)
          ? rs.items.filter(isObj).map((i) => ({ uid: Math.floor(num(i.uid, 0, 0)), id: str(i.id, ''), x: half(num(i.x, 0, 0, 99)), y: half(num(i.y, 0, 0, 99)), color: str(i.color, 'cream'), flip: i.flip === true, ...placedExtras(i) })).filter((i) => i.id)
          : [];
        d.castle.rooms[r] = { wall: str(rs.wall, d.castle.rooms[r].wall), floor: str(rs.floor, d.castle.rooms[r].floor), curtain: str(rs.curtain, d.castle.rooms[r].curtain), items };
      }
    }
    d.castle.owned = numRecord(c.owned);
    d.castle.nextUid = Math.floor(num(c.nextUid, 1, 1));
    const maxUid = Math.max(0, ...ROOM_IDS.flatMap((r) => d.castle.rooms[r].items.map((i) => i.uid)));
    d.castle.nextUid = Math.max(d.castle.nextUid, maxUid + 1);
  }
  if (isObj(w.wardrobe)) {
    const o = strArr(w.wardrobe.owned);
    d.wardrobe.owned = [...new Set([...STARTER_CLOTHES, ...o])];
    d.wardrobe.look = sanitizeLook(w.wardrobe.look);
    const ls = Array.isArray(w.wardrobe.looks) ? w.wardrobe.looks : [];
    d.wardrobe.looks = [0, 1, 2].map((i) => {
      const l = ls[i];
      return isObj(l) ? { name: str(l.name, `Look ${i + 1}`).slice(0, 24), look: sanitizeLook(l.look) } : null;
    });
    d.wardrobe.hairOwned = [...new Set(['hair-loose', 'hair-wavy', ...strArr(w.wardrobe.hairOwned)])];
    d.wardrobe.face = upgradeUntouchedFace(sanitizeFace(w.wardrobe.face));
    const fs = Array.isArray(w.wardrobe.faces) ? w.wardrobe.faces : [];
    d.wardrobe.faces = [0, 1, 2, 3, 4, 5].map((i) => { const f = fs[i]; return isObj(f) ? { name: str(f.name, 'Mon visage').slice(0, 24) || 'Mon visage', face: sanitizeFace(f.face) } : null; });
  }
  if (isObj(w.cat)) {
    const c = w.cat;
    d.cat = {
      adopted: bool(c.adopted, false),
      name: str(c.name, '').slice(0, 20),
      items: strArr(c.items),
      equipped: { collar: isObj(c.equipped) && typeof c.equipped.collar === 'string' ? c.equipped.collar : null, bed: isObj(c.equipped) && typeof c.equipped.bed === 'string' ? c.equipped.bed : null },
      bond: Math.floor(num(c.bond, 0, 0)),
      treats: Math.floor(num(c.treats, 3, 0, 9999)),
      lastSeen: num(c.lastSeen, 0, 0),
      counters: numRecord(c.counters),
    };
  }
  if (isObj(w.family)) {
    for (const k of KID_IDS) {
      const ks = isObj(w.family.kids) ? w.family.kids[k] : null;
      if (!isObj(ks)) continue;
      const games: Record<string, { best: number; plays: number }> = {};
      if (isObj(ks.games)) for (const [g, v] of Object.entries(ks.games)) if (isObj(v)) games[g] = { best: num(v.best, 0, 0), plays: Math.floor(num(v.plays, 0, 0)) };
      d.family.kids[k] = { bond: Math.floor(num(ks.bond, 0, 0)), games, seenScenes: strArr(ks.seenScenes) };
    }
    d.family.scenes = strArr(w.family.scenes);
  }
  if (isObj(w.garden)) {
    const g = w.garden;
    d.garden.plotCount = Math.floor(num(g.plotCount, 4, 4, 16));
    const plots = Array.isArray(g.plots) ? g.plots : [];
    d.garden.plots = Array.from({ length: d.garden.plotCount }, (_, i) => {
      const p = plots[i];
      return isObj(p) && typeof p.flower === 'string' ? { flower: p.flower, plantedAt: num(p.plantedAt, 0, 0), stage: Math.floor(num(p.stage, 0, 0, 3)) } : null;
    });
    const un = strArr(g.unlocked);
    d.garden.unlocked = [...new Set([...d.garden.unlocked, ...un])];
    d.garden.harvested = numRecord(g.harvested);
    d.garden.bouquets = numRecord(g.bouquets);
    d.garden.seeds = numRecord(g.seeds);
  }
  if (isObj(w.choc)) {
    const c = w.choc;
    d.choc = {
      recipes: [...new Set([...d.choc.recipes, ...strArr(c.recipes)])],
      made: numRecord(c.made),
      boxes: Math.floor(num(c.boxes, 0, 0)),
      shopLevel: Math.floor(num(c.shopLevel, 1, 1, 9)),
      collection: strArr(c.collection),
    };
  }
  if (isObj(w.careers)) {
    d.careers.current = typeof w.careers.current === 'string' ? w.careers.current : null;
    if (isObj(w.careers.progress)) {
      for (const [k, v] of Object.entries(w.careers.progress)) {
        if (isObj(v)) d.careers.progress[k] = { level: Math.floor(num(v.level, 0, 0, 5)), xp: num(v.xp, 0, 0), best: num(v.best, 0, 0) };
      }
    }
  }
  d.fans = Math.floor(num(w.fans, 0, 0, 999_999_999));
  d.fansTierSeen = Math.floor(num(w.fansTierSeen, -1, -1, 20));
  d.magazines = strArr(w.magazines);
  if (isObj(w.flags)) for (const [k, v] of Object.entries(w.flags)) if (typeof v === 'boolean') d.flags[k] = v;
  d.extra = numRecord(w.extra);
  return d;
}
