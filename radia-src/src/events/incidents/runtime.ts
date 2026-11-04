/**
 * Colle entre le planificateur d'invitations, la sauvegarde (save.data.fun) et l'interface des incidents / de Tindeur.
 * Légère au démarrage : l'interface est chargée à la demande (import dynamique).
 */
import { save } from '../../core/app';
import { dbg } from '../../core/debug';
import { world, addRes } from '../../core/world';
import { ev } from '../api';
import { funBusy, emitPhone } from '../bus';
import { incidentById, INCIDENTS } from './data';
import { spawn, step, trackActive, resolve, type WorldCtx } from './manager';
import { bindOrderRuntime, resetOrderProgress } from './chocOrder';
import { advanceStreak, hasPending, markShown, newMem, resetTindeur, shouldTrigger, TINDEUR } from '../tindeur/logic';
import { wallet } from '../../core/wallet';

const fun = () => save.data.fun;
const mem = newMem();
/** Rappel d'un incident non traité : pas plus d'une fois toutes les 5 min de jeu actif. */
const REMIND_MS = 5 * 60_000;
/** Jamais deux notifications « amusantes » à moins de 90 s de jeu actif d'écart. */
const SPACING_MS = 90_000;
let lastNoticeActive = -1e12;
let lastNoticeTindeur = -1e12;

const worldCtx = (): WorldCtx => ({ catAdopted: !!world().cat.adopted, hasGarden: true });

/** Appelé par le planificateur à chaque tic : suit le temps ACTIF (incidents) et la série de jeu (Tindeur). */
let ambientOn = false;
export function funTrack(o: { dt: number; active: boolean; hidden: boolean; sinceInput: number }): void {
  if (!ambientOn) { ambientOn = true; void import('./ambient').then((m) => m.startAmbient()); }
  const f = fun();
  trackActive(f.incidents, o.dt, o.active);
  advanceStreak(f.tindeur, mem, o.dt, !o.hidden && o.sinceInput < TINDEUR.inputGraceMs);
}

/** Appelé à un moment techniquement sûr : au plus UNE notification par appel. */
export function funMaybe(safe: boolean): void {
  if (!safe || funBusy()) return;
  const f = fun();
  // jamais deux notifications « amusantes » en rafale (90 s de jeu actif d'écart)
  if (f.incidents.activeMs - Math.max(lastNoticeActive, lastNoticeTindeur) < SPACING_MS) return;
  if (shouldTrigger(f.tindeur, true)) { markShown(f.tindeur, Date.now()); save.save(); lastNoticeTindeur = f.incidents.activeMs; void import('../tindeur/ui').then((m) => m.announceTindeur()); return; }
  const inc = f.incidents;
  if (inc.active) {
    const def = incidentById(inc.active.id);
    if (!def) { inc.active = null; save.save(); return; } // incident inconnu : on ne bloque jamais
    if (inc.activeMs - lastNoticeActive >= REMIND_MS) announce(def.id);
    return;
  }
  if (ev().inbox.some((i) => i.state === 'new')) return; // une invitation attend : pas de rafale
  const def = step(inc, worldCtx(), true, Date.now());
  if (def) { prepare(def.id); save.save(); emitPhone(); announce(def.id); } else save.save();
}

function prepare(id: string): void {
  if (id === 'chocOrder') resetOrderProgress(fun());
}
function announce(id: string): void {
  lastNoticeActive = fun().incidents.activeMs;
  void import('./ui').then((m) => m.announceIncident(id));
}

/** Ouvre l'incident actif (depuis le téléphone ou la pastille du château). */
export function openActiveIncident(): void { void import('./ui').then((m) => m.openActive()); }
export const activeIncident = () => fun().incidents.active;

/** Termine l'incident actif (toute solution) — idempotent. */
export function finishActive(): string | null {
  const id = resolve(fun().incidents, Date.now());
  save.save();
  emitPhone();
  if (id) void import('./ambient').then((m) => m.playFixed());
  return id;
}

/** Fait apparaître un incident précis tout de suite (dev / tests). */
export function triggerIncident(id?: string): boolean {
  const f = fun();
  const def = incidentById(id ?? INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)].id);
  if (!def || f.incidents.active) return false;
  spawn(f.incidents, def, Date.now(), Math.floor(Math.random() * 2 ** 30) + 1);
  prepare(def.id);
  save.save();
  emitPhone();
  announce(def.id);
  return true;
}

bindOrderRuntime({
  fun,
  grant: (r) => { addRes('coins', r.coins); wallet.giveDiamonds(r.diamonds); addRes('cocoa', r.cocoa); },
  resolve: () => { finishActive(); },
});

// outils de développement (?debug uniquement)
dbg('incidents', {
  trigger: (id?: string) => triggerIncident(id),
  list: () => INCIDENTS.map((d) => d.id),
  advance: (ms = 60_000) => { fun().incidents.activeMs += ms; save.save(); return fun().incidents.activeMs; },
  state: () => JSON.parse(JSON.stringify(fun().incidents)),
  open: () => openActiveIncident(),
  clear: () => { fun().incidents.active = null; save.save(); },
});
dbg('tindeur', {
  trigger: () => { const t = fun().tindeur; markShown(t, Date.now()); save.save(); void import('../tindeur/ui').then((m) => m.announceTindeur()); },
  advance: (min = 1) => { fun().tindeur.streakMs += min * 60_000; return fun().tindeur.streakMs; },
  reset: () => { resetTindeur(fun().tindeur); save.save(); import('../bus').then((b) => b.emitPhone()); },
  state: () => JSON.parse(JSON.stringify(fun().tindeur)),
  open: () => void import('../tindeur/ui').then((m) => m.openTindeur()),
});

/** Pastille du bouton téléphone : un incident en attente + un match Tindeur jamais ouvert. */
export const funBadge = (): number => (fun().incidents.active ? 1 : 0) + (hasPending(fun().tindeur) ? 1 : 0);
