/**
 * TICKETS DU CASINO ROYAL ♛ : règles PURES (aucun DOM, aucune dépendance au jeu).
 * Les tickets se GAGNENT, gratuitement : allocation d'ouverture, cadeaux quotidiens, roue du jour, missions,
 * mini-défis du jour, paliers des événements Endless, succès, événements, cadeaux de progression, recharge.
 * Jamais achetables : aucune fonction ici (ni ailleurs dans src/casino) ne débite pièces, diamants ou argent ;
 * aucune conversion, aucun transfert. La sauvegarde garde le champ historique `fun.casino.chips`.
 */
import type { CasinoState } from '../save/fun';
import { grant } from './chips';

export const TICKETS_NAME = 'Tickets du Casino Royal';
export const TICKET = { one: 'ticket', many: 'tickets' } as const;
/** « 1 ticket » / « 250 tickets ». */
export const ticketsLabel = (n: number): string => `${n.toLocaleString('fr-FR')} ${n === 1 ? TICKET.one : TICKET.many}`;

export type TicketSource =
  | 'welcome' | 'daily' | 'wheel' | 'mission' | 'challenge' | 'endless' | 'achievement' | 'event' | 'progress' | 'refill' | 'debug';

/** Plafonds journaliers (par jour local) des sources « ouvertes » à d'autres modules, pour garder une économie sage. */
export const DAILY_CAPS: Partial<Record<TicketSource, number>> = { endless: 400, event: 600, progress: 600, challenge: 200 };
export const SOURCES: readonly TicketSource[] = ['welcome', 'daily', 'wheel', 'mission', 'challenge', 'endless', 'achievement', 'event', 'progress', 'refill', 'debug'];

/** Raisons libres (ancien `grantChips(n, 'roue du jour')`) → source. Inconnu = « event » (plafonné). */
export function sourceOf(reason: string): TicketSource {
  const r = reason.toLowerCase();
  if ((SOURCES as readonly string[]).includes(r)) return r as TicketSource;
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
const capKey = (src: TicketSource): string => `cap.${src}`;

function rollCaps(s: CasinoState, day: number): void {
  if (s.stats[DAY_KEY] === day) return;
  for (const k of Object.keys(s.stats)) if (k.startsWith('cap.')) delete s.stats[k];
  s.stats[DAY_KEY] = day;
}

/** Tickets déjà gagnés AUJOURD'HUI par une source plafonnée. */
export function earnedToday(s: CasinoState, src: TicketSource, now: Date | number = Date.now()): number {
  return s.stats[DAY_KEY] === dayNum(now) ? s.stats[capKey(src)] ?? 0 : 0;
}
/** Combien cette source peut encore verser aujourd'hui (Infinity si non plafonnée). */
export function remainingToday(s: CasinoState, src: TicketSource, now: Date | number = Date.now()): number {
  const cap = DAILY_CAPS[src];
  return cap === undefined ? Infinity : Math.max(0, cap - earnedToday(s, src, now));
}

/** Verse des tickets gratuits d'une source ; applique le plafond du jour. Renvoie le nombre réellement versé (jamais négatif). */
export function earn(s: CasinoState, src: TicketSource, n: number, now: Date | number = Date.now()): number {
  const want = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  if (want <= 0) return 0;
  const day = dayNum(now);
  const cap = DAILY_CAPS[src];
  let k = want;
  if (cap !== undefined) { rollCaps(s, day); k = Math.min(want, Math.max(0, cap - (s.stats[capKey(src)] ?? 0))); }
  const got = grant(s, k);
  if (cap !== undefined && got > 0) s.stats[capKey(src)] = (s.stats[capKey(src)] ?? 0) + got;
  if (got > 0) s.stats[`src.${src}`] = (s.stats[`src.${src}`] ?? 0) + got; // total à vie par source (statistiques)
  return got;
}

// ------------------------------------------------------------------ succès

export const ACHIEVEMENT_TICKETS = 50;
/** Verse la récompense d'un succès UNE seule fois (marque durable `ach.<id>`). */
export function awardAchievement(s: CasinoState | undefined, id: string): number {
  if (!s) return 0;
  const k = `ach.${id}`;
  if (s.stats[k]) return 0;
  s.stats[k] = 1;
  return earn(s, 'achievement', ACHIEVEMENT_TICKETS);
}

// ------------------------------------------------------------------ Endless : paliers d'événements

/** Tickets par palier franchi d'un événement secondaire (0 = premier palier) : défi terminé = dernier palier. */
export const ENDLESS_STAGE_TICKETS: readonly number[] = [20, 30, 60];
export const endlessStageTickets = (stage: number): number => ENDLESS_STAGE_TICKETS[Math.max(0, Math.min(ENDLESS_STAGE_TICKETS.length - 1, Math.floor(stage)))];

export interface SecProgress { id: string; progress: number; goal: number; stage: number }
/**
 * Simule l'avancée d'un événement (même arithmétique que `onEngineEvent`) : tickets dus pour les paliers franchis
 * en ajoutant `inc`. `goals` = objectifs de chaque palier de la définition. Pure : ne modifie rien.
 */
export function endlessTicketsFor(sec: SecProgress, goals: readonly number[], inc: number): { stages: number; tickets: number } {
  if (!(inc > 0) || goals.length === 0) return { stages: 0, tickets: 0 };
  let progress = sec.progress + inc, stage = sec.stage, goal = sec.goal, stages = 0, tickets = 0;
  while (progress >= goal) {
    progress -= goal; stages++; tickets += endlessStageTickets(stage);
    if (stage >= goals.length - 1) break; // dernier palier : l'événement se termine
    stage++; goal = goals[stage];
  }
  return { stages, tickets };
}

// ------------------------------------------------------------------ mini-défis du jour (sans hasard, sans mise)

export interface DailyTask { id: 'visit' | 'greet' | 'rules' | 'wheel'; name: string; desc: string; tickets: number }
export const DAILY_TASKS: readonly DailyTask[] = [
  { id: 'visit', name: 'Passer au salon', desc: 'Entre au Casino Royal.', tickets: 30 },
  { id: 'greet', name: 'Saluer Radia et Auguste', desc: 'Touche les deux personnages dans le salon.', tickets: 30 },
  { id: 'rules', name: 'Lire une règle', desc: 'Ouvre l\'aide « ? » d\'un jeu.', tickets: 30 },
  { id: 'wheel', name: 'Tourner la roue du jour', desc: 'Un tirage gratuit de la grande roue.', tickets: 40 },
];
export const DAILY_TASKS_TOTAL = DAILY_TASKS.reduce((a, t) => a + t.tickets, 0);
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
/** Réclame un mini-défi : marque d'abord (jamais deux fois), verse ensuite. */
export function claimTask(s: CasinoState, id: DailyTask['id'], now: Date | number = Date.now()): number {
  const t = DAILY_TASKS.find((x) => x.id === id);
  if (!t || !taskDone(s, id, now) || taskClaimed(s, id, now)) return 0;
  s.stats[`dq.${id}.c`] = 1;
  return earn(s, 'challenge', t.tickets, now);
}
