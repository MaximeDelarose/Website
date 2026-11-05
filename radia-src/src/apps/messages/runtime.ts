/**
 * Messages — état, réponses planifiées (accusés SIMULÉS), arrivées spontanées, notifications et pastille.
 * Le moteur pur est dans engine.ts ; l'interface dans view.ts. Les réponses sont planifiées ICI (indépendamment de la vue) : quitter
 * l'application ne fait pas perdre la réponse, elle arrive et devient « non lue ».
 */
import { save } from '../../core/app';
import { kidAge } from '../../core/family';
import { ev } from '../../events/api';
import { emitPhone } from '../../events/bus';
import { senderFace, senderName } from '../../events/ui/people';
import type { Sender } from '../../events/types';
import { ui } from '../../ui/ui';
import { Rng } from '../../utils/rng';
import { assignInPlace } from '../util';
import { CONTACT_IDS, isContactId, type ContactId, type KidStyle } from './data';
import { ensureInviteTs } from '../../events/manager';
import { advance, applyRead, applyReply, markRead, planReply, sanitizeMessages, send, syncLegacy, theirReaction, unreadTotal, type Msg, type MessagesState } from './engine';

const seen = new WeakSet<object>();
let syncing = false;
/**
 * État des conversations. Avant de le rendre, reprend (une seule fois chacun) les messages de l'ancien système d'événements :
 * l'aperçu de la liste, la conversation, les pastilles et la sauvegarde lisent ainsi TOUJOURS le même historique.
 */
export function messagesState(): MessagesState {
  const raw = save.data.fun.apps.messages;
  if (!seen.has(raw)) { assignInPlace(raw, sanitizeMessages(raw) as unknown as Record<string, unknown>); seen.add(raw); }
  const s = raw as unknown as MessagesState;
  if (!syncing) {
    syncing = true;
    try {
      const st = ev();
      let changed = ensureInviteTs(st, Date.now()) > 0;
      if (st.msgs.some((m) => !m.synced && isContactId(m.from))) changed = syncLegacy(s, st.msgs) > 0 || changed;
      if (changed) save.save();
    } finally { syncing = false; }
  }
  return s;
}
const persist = (): void => { save.save(); };

/** Ce que la vue expose au runtime (conversation ouverte, rafraîchissement). */
export const view: { open: boolean; thread: ContactId | null; refresh: ((id: ContactId) => void) | null; typing: Set<ContactId> } = { open: false, thread: null, refresh: null, typing: new Set() };

// ------------------------------------------------------------------ contacts
export function styleOf(id: ContactId): KidStyle {
  try {
    const ages = (['kid1', 'kid2', 'kid3'] as const).map((k) => [k, kidAge(k)] as const).sort((a, b) => a[1] - b[1]);
    const rank = ages.findIndex(([k]) => k === id);
    if (rank === 0) return 'small'; if (rank === 1) return 'mid'; if (rank === 2) return 'big';
  } catch { /* âges indisponibles */ }
  return id === 'kid3' ? 'small' : id === 'kid2' ? 'mid' : 'big';
}
export const contactName = (id: ContactId): string => (id === 'maman' ? 'Maman' : senderName(id as Sender));
const faceCache = new Map<string, string>();
export function contactFace(id: ContactId): string {
  if (id !== 'maman') return senderFace(id as Sender);
  let u = faceCache.get(id);
  if (!u) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, 0, 96, 96); gr.addColorStop(0, '#ffc2dc'); gr.addColorStop(1, '#b49aea');
    g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 48, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '700 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', 48, 53);
    u = c.toDataURL('image/png'); faceCache.set(id, u);
  }
  return u;
}

// ------------------------------------------------------------------ non lus (nouveaux + anciens messages d'événements)
const KNOWN = new Set<string>(CONTACT_IDS);
/** Non lus de l'ancien système encore à reprendre : 0 une fois la migration faite (filet de sécurité). */
export const legacyUnread = (): number => { messagesState(); return ev().msgs.filter((m) => !m.read && KNOWN.has(m.from)).length; };
/** Pastille de l'application = non lus des conversations + invitations nouvelles (comptées là où on les lit : dans la conversation). */
export const messagesBadge = (): number => unreadTotal(messagesState()) + legacyUnread();

// ------------------------------------------------------------------ notifications
function announce(id: ContactId, msg: Msg): void {
  if (messagesState().muted) return;
  if (view.open && view.thread === id) return; // déjà sous les yeux
  const preview = msg.text.length > 60 ? `${msg.text.slice(0, 57)}…` : msg.text;
  ui.toast({ title: `Messages · ${contactName(id)}`, sub: preview, icon: 'mail', ms: 3000 });
}

// ------------------------------------------------------------------ envoi + réponse simulée
const rngR = new Rng((Date.now() ^ 0xc0ffee) >>> 0);
const pending = new Set<ContactId>();

/** Radia envoie un message ; la réponse (lecture, « … », texte, réaction éventuelle) arrive ensuite, simulée. */
export function sendMessage(id: ContactId, text: string, photo?: string): Msg | null {
  const s = messagesState();
  const m = send(s, id, text, Date.now(), photo);
  if (!m) return null;
  persist();
  if (pending.has(id)) return m; // une réponse est déjà en route : elle « lira » aussi ce message
  pending.add(id);
  const plan = planReply(id, text || 'photo', rngR, styleOf, s.convos[id]);
  window.setTimeout(() => {
    const now = Date.now();
    for (const x of s.convos[id].msgs) if (x.from === 'me' && !x.readAt) applyRead(s, id, x.id, now); // « Lu » : événement simulé
    persist(); view.refresh?.(id);
    window.setTimeout(() => {
      view.typing.add(id); view.refresh?.(id);
      window.setTimeout(() => {
        view.typing.delete(id);
        const reply = applyReply(s, id, plan.text, Date.now());
        pending.delete(id);
        if (view.open && view.thread === id) markRead(s, id); else { s.convos[id].unread = Math.min(99, s.convos[id].unread + 1); announce(id, reply); }
        persist(); emitPhone(); view.refresh?.(id);
        if (plan.reaction) window.setTimeout(() => { theirReaction(s, id, m.id, plan.reaction!); persist(); view.refresh?.(id); }, 900);
      }, plan.typingMs);
    }, 350);
  }, plan.readAfterMs);
  return m;
}

// ------------------------------------------------------------------ messages spontanés (temps de jeu ACTIF)
let started = false;
export function startMessagesRuntime(): void {
  if (started || typeof window === 'undefined') return; started = true;
  let last = Date.now(); const rng = new Rng((Date.now() ^ 0xbeef) >>> 0);
  window.setInterval(() => {
    const now = Date.now(); const dt = Math.min(now - last, 15_000); last = now;
    if (document.hidden || dt <= 0) return;
    const inc = advance(messagesState(), dt, now, rng, styleOf);
    if (!inc) return;
    persist(); emitPhone(); announce(inc.contactId, inc.msg); view.refresh?.(inc.contactId);
  }, 5000);
}
