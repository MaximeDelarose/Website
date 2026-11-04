/**
 * État sauvegardé de « L'Éclat Éternel ♡ » (`save.data.fun.necklace`) : valeurs par défaut,
 * nettoyage tolérant et règles pures du déclencheur. Aucune dépendance au DOM : testable.
 *
 * ⚠ Sauvegarde LOCALE (navigateur de Radia) : rien n'est synchronisé entre appareils.
 */
import type { Look } from '../../data/world/ids';
import { sanitizeLook } from '../state';
import { ACTIVE_DELAY_MS, LAUNCH_DEBOUNCE_MS, LAUNCH_TARGET, REMIND_EVERY_MS } from './data';

export interface NecklaceState {
  /** Ouvertures de l'application comptées (au plus une par tranche de 30 min). */
  launches: number;
  /** Instant de la dernière ouverture COMPTÉE (ms). */
  lastLaunchAt: number;
  /** La 7ᵉ ouverture comptée a eu lieu : le minuteur de jeu actif tourne. */
  armed: boolean;
  armedAt: number;
  /** Temps de jeu actif écoulé depuis la 7ᵉ ouverture (ms), persistant. */
  activeMs: number;
  /** L'invitation automatique a été déposée dans le téléphone (une seule fois). */
  invited: boolean;
  invitedAt: number;
  inviteRunId: string;
  /** Temps de jeu actif depuis la dernière notification de l'invitation (rappel discret). */
  remindMs: number;
  /** L'événement a été commencé (au moins une fois). */
  started: boolean;
  /** Progression de la scène : 0 rien, 1 feu d'artifice, 2 déclaration, 3 écrin, 4 terminée. */
  stage: number;
  /** La scène a été jouée jusqu'au bout (condition de l'attribution). */
  sceneDone: boolean;
  /** Le collier a été attribué (une seule fois). */
  owned: boolean;
  grantedAt: number;
  /** Radia a répondu à « Veux-tu porter ton collier ? ». */
  chose: boolean;
  /** Souvenir et photo de l'album, succès. */
  memory: boolean;
  photo: boolean;
  achievement: boolean;
  /** Nombre de fois où la scène a été revue depuis l'album. */
  replays: number;
  /** Tenue de Radia pendant la soirée (pour l'illustration du souvenir). */
  look: Look | null;
}

export const defaultNecklace = (): NecklaceState => ({
  launches: 0, lastLaunchAt: 0, armed: false, armedAt: 0, activeMs: 0,
  invited: false, invitedAt: 0, inviteRunId: '', remindMs: 0,
  started: false, stage: 0, sceneDone: false, owned: false, grantedAt: 0, chose: false,
  memory: false, photo: false, achievement: false, replays: 0, look: null,
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, lo = 0, hi = 1e14): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const flag = (v: unknown): boolean => v === true;

/** Nettoyage tolérant : toute valeur invalide retombe sur sa valeur par défaut ; les incohérences sont réparées. */
export function sanitizeNecklace(raw: unknown): NecklaceState {
  const d = defaultNecklace();
  if (!isObj(raw)) return d;
  const s: NecklaceState = {
    launches: Math.floor(num(raw.launches, 0, 0, 9999)),
    lastLaunchAt: num(raw.lastLaunchAt, 0),
    armed: flag(raw.armed), armedAt: num(raw.armedAt, 0),
    activeMs: num(raw.activeMs, 0, 0, 1e10),
    invited: flag(raw.invited), invitedAt: num(raw.invitedAt, 0),
    inviteRunId: typeof raw.inviteRunId === 'string' ? raw.inviteRunId.slice(0, 40) : '',
    remindMs: num(raw.remindMs, 0, 0, 1e10),
    started: flag(raw.started), stage: Math.floor(num(raw.stage, 0, 0, 4)),
    sceneDone: flag(raw.sceneDone), owned: flag(raw.owned), grantedAt: num(raw.grantedAt, 0), chose: flag(raw.chose),
    memory: flag(raw.memory), photo: flag(raw.photo), achievement: flag(raw.achievement),
    replays: Math.floor(num(raw.replays, 0, 0, 9999)),
    look: isObj(raw.look) ? sanitizeLook(raw.look) : null,
  };
  // cohérence : un collier obtenu implique une scène terminée, une invitation reçue et un événement commencé
  if (s.owned) { s.sceneDone = true; s.stage = 4; s.started = true; s.invited = true; s.armed = true; s.memory = true; s.photo = true; }
  if (s.sceneDone) { s.stage = 4; s.started = true; s.invited = true; s.armed = true; }
  if (s.invited) s.armed = true;
  return s;
}

// ------------------------------------------------------------------ déclencheur (pur)

/**
 * Une ouverture de l'application : comptée au plus une fois par tranche de 30 minutes (un rechargement rapide ne
 * gonfle pas le compteur). Le compteur n'est pas rétroactif. Renvoie vrai si cette ouverture a été comptée.
 * À la 7ᵉ ouverture comptée, le minuteur de jeu actif est armé.
 */
export function countLaunch(n: NecklaceState, now: number): boolean {
  if (n.invited || n.armed) return false; // plus rien à compter : l'invitation est (ou va être) déposée
  if (n.lastLaunchAt > 0) {
    const gap = now - n.lastLaunchAt;
    if (gap < 0) { n.lastLaunchAt = now; return false; } // horloge reculée : on se recale sans compter
    if (gap < LAUNCH_DEBOUNCE_MS) return false;
  }
  n.launches += 1;
  n.lastLaunchAt = now;
  if (n.launches >= LAUNCH_TARGET) { n.armed = true; n.armedAt = now; n.activeMs = 0; }
  return true;
}

/** Fait avancer le minuteur de jeu ACTIF (jamais le temps hors jeu / onglet caché). Renvoie vrai quand l'invitation est due. */
export function addActive(n: NecklaceState, dt: number, active: boolean): boolean {
  if (!n.armed || n.invited) return false;
  if (active && Number.isFinite(dt) && dt > 0) n.activeMs = Math.min(ACTIVE_DELAY_MS * 4, n.activeMs + dt);
  return inviteDue(n);
}

export const inviteDue = (n: NecklaceState): boolean => n.armed && !n.invited && n.activeMs >= ACTIVE_DELAY_MS;

export function markInvited(n: NecklaceState, runId: string, now: number): void {
  n.invited = true; n.invitedAt = now; n.inviteRunId = runId; n.remindMs = 0;
}

/** Rappel discret : temps de jeu actif écoulé depuis la dernière notification. Renvoie vrai quand un rappel est dû. */
export function addRemind(n: NecklaceState, dt: number, active: boolean): boolean {
  if (!n.invited || n.sceneDone) return false;
  if (active && Number.isFinite(dt) && dt > 0) n.remindMs = Math.min(REMIND_EVERY_MS * 2, n.remindMs + dt);
  return n.remindMs >= REMIND_EVERY_MS;
}

// ------------------------------------------------------------------ attribution (pure)

/** Seule porte d'entrée possible : la scène doit avoir été terminée, et le collier ne s'attribue qu'une fois. */
export const canGrant = (n: NecklaceState): boolean => n.sceneDone && !n.owned;

/** Marque la scène comme terminée (appelé uniquement par la fin de la scène, jamais en prévisualisation). */
export function markSceneDone(n: NecklaceState): void { n.sceneDone = true; n.stage = 4; n.started = true; n.invited = true; n.armed = true; }

/** Applique l'attribution dans l'état du collier. Renvoie faux (sans rien changer) si elle est interdite ou déjà faite. */
export function applyGrant(n: NecklaceState, now: number): boolean {
  if (!canGrant(n)) return false;
  n.owned = true; n.grantedAt = now; n.memory = true; n.photo = true; n.stage = 4;
  return true;
}
