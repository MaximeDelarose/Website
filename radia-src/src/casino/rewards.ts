/**
 * GAINS GRATUITS DU CASINO ROYAL ♛ — versés en PIÈCES (le portefeuille unique de RADIA) : règles PURES (aucun DOM).
 * Les anciens « tickets » n'existent plus : allocation d'ouverture, mini-défis du jour, succès, paliers des événements Endless et
 * cadeaux de progression donnent maintenant des pièces. Les sources « ouvertes » à d'autres modules sont plafonnées par jour
 * pour garder une économie sage. Aucun achat contre de l'argent réel, aucune conversion : seul le montant autorisé est renvoyé,
 * c'est `store.ts` qui crédite le portefeuille.
 */
import type { CasinoState } from '../save/fun';

export type CoinSource = 'welcome' | 'daily' | 'wheel' | 'mission' | 'challenge' | 'endless' | 'achievement' | 'event' | 'progress' | 'debug';

/** Plafonds journaliers (par jour local, en pièces) des sources « ouvertes » à d'autres modules. */
export const DAILY_CAPS: Partial<Record<CoinSource, number>> = { endless: 1200, event: 1500, progress: 1500, challenge: 400 };
export const SOURCES: readonly CoinSource[] = ['welcome', 'daily', 'wheel', 'mission', 'challenge', 'endless', 'achievement', 'event', 'progress', 'debug'];

/** Raisons libres (ancien `grantChips(n, 'roue du jour')`) → source. Inconnu = « event » (plafonné). */
export function sourceOf(reason: string): CoinSource {
  const r = reason.toLowerCase();
  if ((SOURCES as readonly string[]).includes(r)) return r as CoinSource;
  if (r.includes('roue')) return 'wheel';
  if (r.includes('quotidien') || r.includes('cadeau du jour')) return 'daily';
  if (r.includes('mission')) return 'mission';
  if (r.includes('succ')) return 'achievement';
  return 'event';
}

/** Numéro de jour local AAAAMMJJ. */
export const dayNum = (now: Date | number = Date.now()): number => {
  const d = now instanceof Date ? now : new Date(now);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const DAY_KEY = 'cap.day';
const capKey = (src: CoinSource): string => `cap.${src}`;

function rollCaps(s: CasinoState, day: number): void {
  if (s.stats[DAY_KEY] === day) return;
  for (const k of Object.keys(s.stats)) if (k.startsWith('cap.')) delete s.stats[k];
  s.stats[DAY_KEY] = day;
}

/** Pièces déjà gagnées AUJOURD'HUI par une source plafonnée. */
export function earnedToday(s: CasinoState, src: CoinSource, now: Date | number = Date.now()): number {
  return s.stats[DAY_KEY] === dayNum(now) ? s.stats[capKey(src)] ?? 0 : 0;
}
/** Combien cette source peut encore verser aujourd'hui (Infinity si non plafonnée). */
export function remainingToday(s: CasinoState, src: CoinSource, now: Date | number = Date.now()): number {
  const cap = DAILY_CAPS[src];
  return cap === undefined ? Infinity : Math.max(0, cap - earnedToday(s, src, now));
}

/**
 * Réserve des pièces gratuites d'une source : applique le plafond du jour et renvoie le montant AUTORISÉ (jamais négatif).
 * Le crédit du portefeuille est fait par l'appelant (`grantCoins` dans store.ts).
 */
export function allow(s: CasinoState, src: CoinSource, n: number, now: Date | number = Date.now()): number {
  const want = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  if (want <= 0) return 0;
  const cap = DAILY_CAPS[src];
  let k = want;
  if (cap !== undefined) { rollCaps(s, dayNum(now)); k = Math.min(want, Math.max(0, cap - (s.stats[capKey(src)] ?? 0))); if (k > 0) s.stats[capKey(src)] = (s.stats[capKey(src)] ?? 0) + k; }
  return k;
}

// ------------------------------------------------------------------ succès

export const ACHIEVEMENT_COINS = 150;
/** Autorise la récompense d'un succès UNE seule fois (marque durable `ach.<id>`). Renvoie les pièces à verser. */
export function awardAchievement(s: CasinoState | undefined, id: string): number {
  if (!s) return 0;
  const k = `ach.${id}`;
  if (s.stats[k]) return 0;
  s.stats[k] = 1;
  return ACHIEVEMENT_COINS;
}

// ------------------------------------------------------------------ Endless : paliers d'événements

/** Pièces par palier franchi d'un événement secondaire (0 = premier palier) : défi terminé = dernier palier. */
export const ENDLESS_STAGE_COINS: readonly number[] = [60, 90, 180];
export const endlessStageCoins = (stage: number): number => ENDLESS_STAGE_COINS[Math.max(0, Math.min(ENDLESS_STAGE_COINS.length - 1, Math.floor(stage)))];

export interface SecProgress { id: string; progress: number; goal: number; stage: number }
/**
 * Simule l'avancée d'un événement (même arithmétique que `onEngineEvent`) : pièces dues pour les paliers franchis
 * en ajoutant `inc`. `goals` = objectifs de chaque palier de la définition. Pure : ne modifie rien.
 */
export function endlessCoinsFor(sec: SecProgress, goals: readonly number[], inc: number): { stages: number; coins: number } {
  if (!(inc > 0) || goals.length === 0) return { stages: 0, coins: 0 };
  let progress = sec.progress + inc, stage = sec.stage, goal = sec.goal, stages = 0, coins = 0;
  while (progress >= goal) {
    progress -= goal; stages++; coins += endlessStageCoins(stage);
    if (stage >= goals.length - 1) break; // dernier palier : l'événement se termine
    stage++; goal = goals[stage];
  }
  return { stages, coins };
}

// ------------------------------------------------------------------ mini-défis du jour (sans hasard, sans mise)

export interface DailyTask { id: 'visit' | 'greet' | 'rules' | 'wheel'; name: string; desc: string; coins: number }
export const DAILY_TASKS: readonly DailyTask[] = [
  { id: 'visit', name: 'Passer au salon', desc: 'Entre au Casino Royal.', coins: 40 },
  { id: 'greet', name: 'Saluer Radia et Auguste', desc: 'Touche les deux personnages dans le salon.', coins: 40 },
  { id: 'rules', name: 'Lire une règle', desc: 'Ouvre l\'aide « ? » d\'un jeu.', coins: 40 },
  { id: 'wheel', name: 'Tourner la roue du jour', desc: 'Un tirage gratuit de la grande roue.', coins: 60 },
];
export const DAILY_TASKS_TOTAL = DAILY_TASKS.reduce((a, t) => a + t.coins, 0);
const TASK_DAY = 'dq.day';
function rollTasks(s: CasinoState, day: number): void {
  if (s.stats[TASK_DAY] === day) return;
  for (const k of Object.keys(s.stats)) if (k.startsWith('dq.')) delete s.stats[k];
  s.stats[TASK_DAY] = day;
}
export const taskDone = (s: CasinoState, id: DailyTask['id'], now: Date | number = Date.now()): boolean => s.stats[TASK_DAY] === dayNum(now) && s.stats[`dq.${id}`] === 1;
export const taskClaimed = (s: CasinoState, id: DailyTask['id'], now: Date | number = Date.now()): boolean => s.stats[TASK_DAY] === dayNum(now) && s.stats[`dq.${id}.c`] === 1;
/** Marque un mini-défi accompli aujourd'hui (idempotent). */
export function markTask(s: CasinoState, id: DailyTask['id'], now: Date | number = Date.now()): void { rollTasks(s, dayNum(now)); s.stats[`dq.${id}`] = 1; }
export const claimableTasks = (s: CasinoState, now: Date | number = Date.now()): number => DAILY_TASKS.filter((t) => taskDone(s, t.id, now) && !taskClaimed(s, t.id, now)).length;
/** Réclame un mini-défi : marque d'abord (jamais deux fois). Renvoie les pièces à verser (plafond « challenge » appliqué). */
export function claimTask(s: CasinoState, id: DailyTask['id'], now: Date | number = Date.now()): number {
  const t = DAILY_TASKS.find((x) => x.id === id);
  if (!t || !taskDone(s, id, now) || taskClaimed(s, id, now)) return 0;
  s.stats[`dq.${id}.c`] = 1;
  return allow(s, 'challenge', t.coins, now);
}
