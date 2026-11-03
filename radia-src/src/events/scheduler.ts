/**
 * Déclencheur des invitations : suit le temps de jeu ACTIF, tire une invitation pondérée quand les
 * limites le permettent, et n'affiche la notification qu'à un moment sûr (jamais en pleine fusion,
 * transaction, récompense, cinématique…). Fonctionne dans les deux modes et dans tous les écrans.
 */
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { save, game as getGame } from '../core/app';
import { world } from '../core/world';
import { LEVELS } from '../data/levels';
import { chessUnlocked } from '../game/narrative/Story';
import { EVENTS, SMALL_MESSAGES, eventById } from './data';
import { canOfferBig, canSendSmall, offerInvite, pickEvent, pushMessage, settleStale, setInviteState, unreadCount, type Progress } from './manager';
import { ev, nextId } from './api';
import { showNotification, notificationVisible } from './ui/notify';
import { isEventRunning } from './runner';
import { openInvite, resumeFlow, triggerSecretCall } from './flow';
import { emitPhone, onPhoneChange } from './bus';

let started = false;
let lastInput = Date.now();
const shown = new Set<string>();
let resumeOffered = false;

export function progress(): Progress {
  const w = world();
  const done = LEVELS.filter((l) => save.data.levels[l.id]?.done);
  const chapter = done.reduce((m, l) => Math.max(m, l.chapter), 0);
  return {
    chapter, chessUnlocked: chessUnlocked(),
    careerCurrent: w.careers.current,
    careersTried: Object.entries(w.careers.progress).filter(([, p]) => p.xp > 0 || p.level > 0).map(([k]) => k),
  };
}

/** Moment sûr pour afficher une notification (aucune interaction ni animation critique en cours). */
export function safeToNotify(): boolean {
  if (document.hidden || isEventRunning() || notificationVisible()) return false;
  if (document.querySelector('.modal-backdrop:not(.leaving), .dialog-layer:not(.leaving), .finale-layer, .chapter-card, .chess-view, .cg-screen, .fam-scene, .fam-body, .kc, .aug-says, .splash, .ev-layer, .ev-inv-back, .ph-back, .call-layer')) return false;
  try {
    const g = getGame();
    if (g.scene.getScenes(true).some((s) => !['backdrop', 'merge'].includes(s.sys.settings.key))) return false; // billard, chemin, puzzle…
    const merge = g.scene.getScene('merge') as unknown as { sys: { isActive(): boolean }; isIdle?: () => boolean } | null;
    if (merge?.sys.isActive() && merge.isIdle && !merge.isIdle()) return false; // fusion / glisser en cours
  } catch { /* jeu pas encore prêt */ }
  return true;
}

function maybeNotify(): void {
  if (!safeToNotify()) return;
  const st = ev();
  if (st.current && !eventById(st.current.eventId)) { st.current = null; save.save(); } // activité inconnue : on ne bloque jamais les invitations
  if (st.current && !resumeOffered) {
    const def = eventById(st.current.eventId);
    if (def) {
      resumeOffered = true;
      showNotification(def, { kind: 'resume', onOpen: () => void resumeFlow(), onLater: () => undefined });
      return;
    }
  }
  const inv = st.inbox.find((i) => i.state === 'new' && !shown.has(i.runId) && i.runId !== st.secret.runId);
  const def = inv ? eventById(inv.eventId) : undefined;
  if (!inv || !def) return;
  shown.add(inv.runId);
  showNotification(def, {
    kind: 'invite',
    onOpen: () => void openInvite(inv.runId),
    onLater: () => { setInviteState(st, inv.runId, 'later'); save.save(); emitPhone(); },
  });
}

/** Tirage + petits messages. `force` : debug / tests (ignore les limites de fréquence). */
/** Mode développeur (debug uniquement) : déclenche l'appel tout de suite. */
export const secretNow = (): void => { void triggerSecretCall(); };
/** Mode développeur : avance le compteur de jeu actif (en minutes). */
export const secretAdvance = (min: number): void => { ev().secret.activeMs += min * 60_000; };

export function offerNow(eventId?: string): string | null {
  const st = ev();
  const def = eventId ? eventById(eventId) : pickEvent(EVENTS, st, progress(), Math.random);
  if (!def) return null;
  const inv = offerInvite(st, def, Date.now(), nextId('r'));
  save.save();
  emitPhone();
  return inv.runId;
}

function tick(dt: number): void {
  const st = ev();
  const active = !document.hidden && Date.now() - lastInput < 90_000 && !isEventRunning();
  if (active) { st.playMs += dt; st.secret.activeMs += dt; }
  // quête secrète : une seule fois, à un moment stable, entre 20 et 30 minutes de jeu ACTIF
  if (!st.secret.triggered && st.secret.activeMs >= st.secret.target && !isEventRunning() && safeToNotify()) { void triggerSecretCall(); return; }
  settleStale(st);
  if (!isEventRunning()) {
    if (canOfferBig(st)) {
      const def = pickEvent(EVENTS, st, progress(), Math.random);
      if (def) { offerInvite(st, def, Date.now(), nextId('r')); save.save(); emitPhone(); }
    } else if (canSendSmall(st)) {
      const m = SMALL_MESSAGES[Math.floor(Math.random() * SMALL_MESSAGES.length)];
      pushMessage(st, m.from, m.text, Date.now());
      save.save(); emitPhone();
    }
  }
  maybeNotify();
}

export function startInvitations(): void {
  if (started) return;
  started = true;
  window.addEventListener('pointerdown', () => { lastInput = Date.now(); }, { passive: true });
  let last = Date.now();
  window.setInterval(() => {
    const now = Date.now();
    const dt = Math.min(10_000, now - last);
    last = now;
    try { tick(dt); } catch (e) { console.error('invitations', e); }
  }, 4000);
}

/** Bouton « téléphone » avec pastille ; à placer dans la fusion, l'accueil et Mon monde. */
export function phoneButton(extraClass = ''): HTMLElement {
  const badge = h('i.ph-badge');
  const b = h(`button.icon-btn.ph-btn${extraClass ? '.' + extraClass : ''}`, { 'aria-label': 'Mon téléphone' }, icon('phone', 24), badge);
  const refresh = () => {
    const n = unreadCount(ev()) + (ev().current ? 1 : 0);
    badge.textContent = n > 9 ? '9+' : String(n);
    b.classList.toggle('has', n > 0);
    if (!b.isConnected) off();
  };
  const off = onPhoneChange(refresh);
  refresh();
  b.addEventListener('click', () => { void import('./ui/phone').then((m) => m.openPhone()); });
  return b;
}
