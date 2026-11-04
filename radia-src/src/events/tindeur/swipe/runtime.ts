/**
 * Tindeur jouable — colle entre la sauvegarde (`fun.apps.swipe`), le planificateur (temps de jeu ACTIF) et l'interface.
 * Chargé à la demande : le planificateur ne l'importe qu'une fois qu'il existe des conversations.
 */
import { save } from '../../../core/app';
import { dbg } from '../../../core/debug';
import { emitPhone } from '../../bus';
import { showNotice } from '../../incidents/notice';
import { setUnreadSource } from '../logic';
import { rawUnread } from './badge';
import { profileById, pingText } from './data';
import { ignorePing, markPinged, markRead, pickPing, sanitizeSwipe, snoozePing, tickClock, unreadCount, type SwipeState } from './state';

const ready = new WeakSet<object>();
/** État vivant (objet de la sauvegarde, nettoyé une fois par session de jeu). */
export function swipe(): SwipeState {
  const holder = save.data.fun.apps.swipe as Record<string, unknown>;
  if (!ready.has(holder)) {
    const s = sanitizeSwipe(holder);
    for (const k of Object.keys(holder)) delete holder[k];
    Object.assign(holder, s);
    ready.add(holder);
  }
  return holder as unknown as SwipeState;
}
export function persist(): void { save.save(); emitPhone(); }

export type SwipeEvent = { type: 'reply'; pid: string };
const listeners = new Set<(e: SwipeEvent) => void>();
export const onSwipeEvent = (fn: (e: SwipeEvent) => void): (() => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const appOpen = (): boolean => !!document.querySelector('.sw-app');

setUnreadSource(rawUnread);

/** Appelé par le planificateur toutes les ~4 s : horloge de jeu actif, réponses qui arrivent, notification espacée. */
export function swipeTick(dt: number, active: boolean, safe: boolean): void {
  if (!save.data.fun.tindeur.installed) return; // désinstallée : plus aucune notification, l'horloge s'arrête
  const s = swipe();
  const got = tickClock(s, dt, active);
  if (got.length) { persist(); for (const pid of got) for (const f of [...listeners]) f({ type: 'reply', pid }); }
  if (appOpen()) return;
  const pid = pickPing(s, safe && active);
  if (pid) notify(pid);
}

/** Notification dans le téléphone du jeu : Ouvrir / Répondre plus tard / Ignorer. Aucune pression, aucune pénalité. */
export function notify(pid: string): boolean {
  const p = profileById(pid);
  if (!p) return false;
  const s = swipe();
  const h = showNotice({
    icon: 'tindeur', title: `Tindeur · ${p.name}`, text: pingText(p), variant: 'tindeur.sw-notif', ttl: 14_000,
    onExpire: () => { snoozePing(s, pid); persist(); },
    actions: [
      { label: 'Ouvrir', run: () => { markRead(s, pid); persist(); void import('./ui').then((m) => m.openSwipeApp({ chat: pid })); } },
      { label: 'Répondre plus tard', secondary: true, run: () => { snoozePing(s, pid); persist(); } },
      { label: 'Ignorer', secondary: true, run: () => { ignorePing(s, pid); persist(); } },
    ],
  });
  if (!h) return false; // une autre notification est affichée : on réessaiera
  markPinged(s, pid);
  persist();
  return true;
}

// outils de développement (?debug uniquement)
dbg('swipe', {
  state: () => JSON.parse(JSON.stringify(swipe())),
  /** Avance l'horloge de jeu actif (minutes) et fait tourner le planificateur. */
  advance: (min = 1, safe = true) => { for (let i = 0; i < min * 2; i++) swipeTick(30_000, true, safe); return swipe().clock; },
  open: (pid?: string) => void import('./ui').then((m) => m.openSwipeApp(pid ? { chat: pid } : {})),
  unread: () => unreadCount(swipe()),
});
