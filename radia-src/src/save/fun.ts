/**
 * v5 — « Endless 2.0 » : progression durable du mode infini, calendrier de cadeaux,
 * incidents du château, scène « Tindeur ». Données pures (aucun DOM) + nettoyage tolérant :
 * toute valeur invalide retombe sur sa valeur par défaut, on ne plante jamais.
 */
import { defaultNecklace, sanitizeNecklace, type NecklaceState } from '../events/necklace/state';

export interface Endless2 {
  /** Générateurs : niveau d'amélioration (1..) et XP de maîtrise, par identifiant ('gen:flowers'…). */
  gens: Record<string, { level: number; xp: number }>;
  /** Objets découverts ("coll:niveau") — l'album ne perd jamais rien. */
  album: string[];
  /** Récompenses d'album déjà prises (clé libre du module). */
  albumClaimed: string[];
  /** Jauge de trésor : points en cours, coffres gagnés/ouverts, compteur de garantie. */
  treasure: { points: number; earned: number; opened: number; pity: number };
  /** Au plus 2 événements secondaires actifs ; progression sans date limite. */
  sec: { id: string; progress: number; goal: number; stage: number }[];
  secDone: Record<string, number>;
  /** Remplacements gratuits de commande disponibles + instant de la dernière recharge. */
  replaces: number;
  replaceTs: number;
  /** Améliorations permanentes achetées (ids libres du module). */
  perks: string[];
  /** Statistiques de drops par rareté et par type (pour tests / équilibrage). */
  drops: Record<string, number>;
  /** Tickets d'événement et fragments (pièces de puzzle du château, etc.). */
  tickets: number;
  fragments: Record<string, number>;
  /** Compteurs libres (fusions totales, commandes livrées…). */
  counters: Record<string, number>;
  /** Dernier niveau de « palier » de session affiché (objectifs court/moyen/long terme). */
  goalsSeen: string[];
}

export interface DailyState {
  /** Numéro de cycle (0 = premier). Les récompenses varient selon cycle % thèmes. */
  cycle: number;
  /** Prochain jour à réclamer dans le cycle, 0..6. */
  day: number;
  /** Date locale (AAAA-MM-JJ) de la dernière réclamation : empêche la double réclamation. */
  lastKey: string;
  /** Jours déjà réclamés dans le cycle courant. */
  claimed: number[];
  total: number;
}

export interface IncidentState {
  active: null | {
    id: string;
    /** Instant d'apparition (ms). */
    at: number;
    /** Temps de JEU ACTIF cumulé au moment du report (ms) ; −1 = pas reporté. */
    deferActive: number;
    /** Coût actuel en pièces (jamais plus que le plafond de l'incident). */
    cost: number;
    seed: number;
  };
  /** id → nombre de fois résolus. */
  done: Record<string, number>;
  lastAt: number;
  /** Temps de jeu actif cumulé (ms) — suivi par le planificateur. */
  activeMs: number;
  nextAtActive: number;
}

export interface TindeurState {
  /** Déjà déclenché automatiquement (une seule fois). */
  shown: boolean;
  choice: 'none' | 'keep' | 'uninstall';
  /** Icône visible dans le téléphone du jeu. */
  installed: boolean;
  at: number;
  /** Minutes de jeu actif consécutives (ms), remises à zéro à chaque pause longue. */
  streakMs: number;
  /** Essais de désinstallation : les deux premiers sont refusés par Auguste, le 3e désinstalle. */
  uninstallTries?: number;
}

/** Casino Royal : portefeuille de jetons fictifs et gratuits, séparé des pièces et diamants. */
export interface CasinoState {
  chips: number;
  /** Allocation gratuite d'ouverture déjà versée. */
  welcomed: boolean;
  /** Dernière mini-recharge gratuite (ms) quand le solde est vide. */
  refillTs: number;
  /** Jetons apportés à la table (choisis sur la carte d'Auguste) pour la session en cours. */
  bring: number;
  /** Compteurs par jeu : { parties, gains, pertes, meilleur } (clés « roulette.parties »…). */
  stats: Record<string, number>;
  /** Derniers résultats (plafonné à 60) : jeu, mise, gain, instant. */
  history: { g: string; bet: number; win: number; at: number }[];
  /** Missions sans hasard déjà accomplies (récompenses exclusives garanties). */
  missions: string[];
}

/** Roue de cadeaux quotidienne : un tirage gratuit par jour (date locale). */
export interface WheelState { lastKey: string; spins: number; last: string }

/** Lieux à rénover (salon de thé, boutique de fleurs…) : étape et progression par objectif. */
export interface PlaceState { stage: number; progress: Record<string, number>; done: boolean; seen: boolean; choices: Record<string, string> }

/** Mode Libre : débloqué à la fin des cinq chapitres. */
export interface FreeState { unlocked: boolean; at: number; announced: boolean }

export interface FunState {
  endless2: Endless2;
  daily: DailyState;
  incidents: IncidentState;
  tindeur: TindeurState;
  casino: CasinoState;
  wheel: WheelState;
  places: Record<string, PlaceState>;
  free: FreeState;
  /** « L'Éclat Éternel ♡ » : lancements, minuteur, invitation, progression de la scène, collier obtenu (sauvegarde locale). */
  necklace: NecklaceState;
  /** Notifications reçues (identifiants), pour ne pas les répéter. */
  notifs: string[];
}

export const defaultFun = (): FunState => ({
  endless2: {
    gens: {}, album: [], albumClaimed: [], treasure: { points: 0, earned: 0, opened: 0, pity: 0 },
    sec: [], secDone: {}, replaces: 2, replaceTs: 0, perks: [], drops: {}, tickets: 0, fragments: {}, counters: {}, goalsSeen: [],
  },
  daily: { cycle: 0, day: 0, lastKey: '', claimed: [], total: 0 },
  incidents: { active: null, done: {}, lastAt: 0, activeMs: 0, nextAtActive: 0 },
  tindeur: { shown: false, choice: 'none', installed: true, at: 0, streakMs: 0 },
  casino: { chips: 0, welcomed: false, refillTs: 0, bring: 0, stats: {}, history: [], missions: [] },
  wheel: { lastKey: '', spins: 0, last: '' },
  places: {},
  free: { unlocked: false, at: 0, announced: false },
  necklace: defaultNecklace(),
  notifs: [],
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = 1e12) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, d = '', max = 80) => (typeof v === 'string' ? v.slice(0, max) : d);
const strArr = (v: unknown, max = 2000) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []);
function numRec(v: unknown, max = 400): Record<string, number> {
  const o: Record<string, number> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v).slice(0, max)) if (typeof x === 'number' && Number.isFinite(x)) o[k.slice(0, 60)] = x;
  return o;
}

export function sanitizeFun(raw: unknown): FunState {
  const d = defaultFun();
  if (!isObj(raw)) return d;
  const e = isObj(raw.endless2) ? raw.endless2 : {};
  if (isObj(e.gens)) for (const [k, g] of Object.entries(e.gens).slice(0, 40)) if (isObj(g)) d.endless2.gens[k.slice(0, 40)] = { level: Math.floor(num(g.level, 1, 1, 99)), xp: Math.floor(num(g.xp, 0, 0, 1e9)) };
  d.endless2.album = strArr(e.album);
  d.endless2.albumClaimed = strArr(e.albumClaimed);
  if (isObj(e.treasure)) d.endless2.treasure = { points: num(e.treasure.points, 0), earned: Math.floor(num(e.treasure.earned, 0)), opened: Math.floor(num(e.treasure.opened, 0)), pity: Math.floor(num(e.treasure.pity, 0, 0, 999)) };
  if (Array.isArray(e.sec)) {
    d.endless2.sec = e.sec.filter(isObj).slice(0, 2).map((s) => ({ id: str(s.id), progress: Math.floor(num(s.progress, 0)), goal: Math.max(1, Math.floor(num(s.goal, 1, 1))), stage: Math.floor(num(s.stage, 0, 0, 99)) })).filter((s) => s.id);
  }
  d.endless2.secDone = numRec(e.secDone);
  d.endless2.replaces = Math.floor(num(e.replaces, 2, 0, 9));
  d.endless2.replaceTs = num(e.replaceTs, 0, 0, 1e14);
  d.endless2.perks = strArr(e.perks, 200);
  d.endless2.drops = numRec(e.drops);
  d.endless2.tickets = Math.floor(num(e.tickets, 0, 0, 99999));
  d.endless2.fragments = numRec(e.fragments);
  d.endless2.counters = numRec(e.counters);
  d.endless2.goalsSeen = strArr(e.goalsSeen, 200);

  if (isObj(raw.daily)) {
    const y = raw.daily;
    d.daily = {
      cycle: Math.floor(num(y.cycle, 0, 0, 9999)), day: Math.floor(num(y.day, 0, 0, 6)), lastKey: /^\d{4}-\d{2}-\d{2}$/.test(str(y.lastKey)) ? str(y.lastKey) : '',
      claimed: Array.isArray(y.claimed) ? [...new Set(y.claimed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))] : [],
      total: Math.floor(num(y.total, 0, 0, 99999)),
    };
  }
  if (isObj(raw.incidents)) {
    const i = raw.incidents;
    const a = isObj(i.active) && str(i.active.id) ? { id: str(i.active.id), at: num(i.active.at, 0, 0, 1e14), deferActive: num(i.active.deferActive, -1, -1), cost: Math.floor(num(i.active.cost, 0, 0, 100000)), seed: Math.floor(num(i.active.seed, 1, 0, 2 ** 31)) } : null;
    d.incidents = { active: a, done: numRec(i.done), lastAt: num(i.lastAt, 0, 0, 1e14), activeMs: num(i.activeMs, 0), nextAtActive: num(i.nextAtActive, 0) };
  }
  if (isObj(raw.tindeur)) {
    const t = raw.tindeur;
    d.tindeur = {
      shown: t.shown === true, choice: t.choice === 'keep' || t.choice === 'uninstall' ? t.choice : 'none',
      installed: t.installed !== false && t.choice !== 'uninstall', at: num(t.at, 0, 0, 1e14), streakMs: num(t.streakMs, 0), uninstallTries: Math.floor(num(t.uninstallTries, 0, 0, 99)),
    };
  }
  if (isObj(raw.casino)) {
    const c = raw.casino;
    d.casino = {
      chips: Math.floor(num(c.chips, 0, 0, 1e9)), welcomed: c.welcomed === true, refillTs: num(c.refillTs, 0, 0, 1e14), bring: Math.floor(num(c.bring, 0, 0, 1e9)),
      stats: numRec(c.stats), missions: strArr(c.missions, 200),
      history: Array.isArray(c.history) ? c.history.filter(isObj).slice(-60).map((h) => ({ g: str(h.g, '', 20), bet: Math.floor(num(h.bet, 0, 0, 1e9)), win: Math.floor(num(h.win, 0, 0, 1e9)), at: num(h.at, 0, 0, 1e14) })) : [],
    };
  }
  if (isObj(raw.wheel)) d.wheel = { lastKey: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.wheel.lastKey)) ? str(raw.wheel.lastKey) : '', spins: Math.floor(num(raw.wheel.spins, 0, 0, 99999)), last: str(raw.wheel.last, '', 60) };
  if (isObj(raw.places)) {
    for (const [k, v] of Object.entries(raw.places).slice(0, 40)) {
      if (!isObj(v)) continue;
      const ch: Record<string, string> = {};
      if (isObj(v.choices)) for (const [a, b] of Object.entries(v.choices).slice(0, 20)) if (typeof b === 'string') ch[a.slice(0, 30)] = b.slice(0, 40);
      d.places[k.slice(0, 40)] = { stage: Math.floor(num(v.stage, 0, 0, 99)), progress: numRec(v.progress, 60), done: v.done === true, seen: v.seen === true, choices: ch };
    }
  }
  if (isObj(raw.free)) d.free = { unlocked: raw.free.unlocked === true, at: num(raw.free.at, 0, 0, 1e14), announced: raw.free.announced === true };
  d.necklace = sanitizeNecklace(raw.necklace);
  d.notifs = strArr(raw.notifs, 300);
  return d;
}
