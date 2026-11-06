/**
 * Point d'entrée des applications du téléphone du jeu : TikTak et Snapchien s'enregistrent ici
 * (registerPhoneApp), écoutent les « moments » des activités et exposent `RADIA.apps` en mode ?debug.
 */
import { registerPhoneApp } from '../events/ui/phoneApps';
import { ev } from '../events/api';
import { save } from '../core/app';
import { dbg } from '../core/debug';
import { clipsIcon, snapIcon } from './icons';
import { clipsState, snapState, persist, worldFans } from './store';
import { clipsBadge, snapBadge, defaultSnap, type SnapState } from './snap/model';
import { defaultClips, type ClipsState } from './clips/model';
import { assignInPlace } from './util';
import { advance, produce, unreadTotal, type Incoming } from './snap/chat/engine';
import { contactById } from './snap/chat/data';
import { flags } from './snap/ui-state';
import { emitPhone } from '../events/bus';
import { pushMessage } from '../events/manager';
import { startMessagesRuntime, messagesState, sendMessage, view as msgView } from './messages/runtime';
import { produce as msgProduce } from './messages/engine';
import { styleOf as msgStyle } from './messages/runtime';
import { ui } from '../ui/ui';
import { Rng } from '../utils/rng';
import { emitMoment, type MomentKind } from './moments';
import { installMomentPrompt, KIND_TITLES } from './prompt';

registerPhoneApp({
  id: 'clips', name: 'TikTak', icon: clipsIcon,
  open: () => { void import('./clips/ui').then((m) => m.openClips()); },
  badge: () => clipsBadge(snapState()) || null,
});
registerPhoneApp({
  id: 'snap', name: 'Snapchien', icon: snapIcon,
  open: () => { void import('./snap/ui').then((m) => m.openSnap()); },
  badge: () => snapBadge(snapState()) || null,
});
installMomentPrompt();

// ---- Messages : arrivées spontanées (temps de jeu actif), réponses simulées, pastille
startMessagesRuntime();

// ---- Snapchien : les garçons écrivent pendant le jeu (temps ACTIF, jamais pendant que l'application est en arrière-plan) ----
let lastChatTick = Date.now();
const chatRng = new Rng((Date.now() ^ 0x5eed) >>> 0);
function announceChat(inc: Incoming): void {
  const st = snapState().chat;
  const c = contactById(inc.contactId); if (!c) return;
  emitPhone();
  if (st.muted || flags.open) return; // notifications coupées, ou Snapchien déjà ouvert : on reste discret
  const kind = inc.joined ? 'joined' : inc.msg.kind;
  // regroupement : plusieurs arrivées rapprochées → une seule notice
  const n = unreadTotal(st);
  ui.toast({ title: n > 1 ? `Snapchien · ${n} nouveautés` : c.name, sub: n > 1 ? 'Messages et snaps à lire' : kind === 'joined' ? 'T’a ajoutée sur Snapchien' : kind === 'text' ? 'Nouveau message' : kind === 'video' ? 'Nouvelle vidéo' : 'Nouveau Snap rouge', icon: kind === 'text' || kind === 'joined' ? 'mail' : 'camera', ms: 2600 });
}
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const now = Date.now(); const dt = Math.min(now - lastChatTick, 15_000); lastChatTick = now;
    if (document.hidden || dt <= 0) return;
    const inc = advance(snapState().chat, dt, now, chatRng);
    if (inc) { persist(); announceChat(inc); }
  }, 5000);
}

dbg('messages', {
  state: () => messagesState(),
  /** Fait arriver un message spontané tout de suite (tests). */
  incoming: () => { const inc = msgProduce(messagesState(), Date.now(), chatRng, msgStyle); if (inc) { persist(); emitPhone(); } return inc; },
  send: (id: string, text: string) => sendMessage(id as never, text),
  /** Reproduit EXACTEMENT le circuit des messages d'événements (pushMessage + rafraîchissement du téléphone) — tests. */
  legacy: (from: string, text: string) => { pushMessage(ev(), from as never, text, Date.now()); persist(); emitPhone(); },
  open: () => msgView.open,
});

dbg('apps', {
  /** Émet un moment comme le ferait une activité. */
  emit: (kind: MomentKind, title?: string) => emitMoment({ kind, title: title ?? KIND_TITLES[kind] ?? 'Un moment' }),
  state: (): { clips: ClipsState; snap: SnapState; fans: number; albumSnap: number } => ({ clips: clipsState(), snap: snapState(), fans: worldFans(), albumSnap: ev().photos.filter((p) => p.eventId === 'snap').length }),
  /** Snapchien : état du chat et déclenchement manuel d'une arrivée (tests). */
  chat: {
    state: () => snapState().chat,
    /** Fait arriver tout de suite un message / snap / vidéo d'un contact. */
    push: (id: string, kind: 'text' | 'snap' | 'video' = 'snap', scene?: string) => {
      const st = snapState().chat; const c = contactById(id); const cs = st.contacts[id]; if (!c || !cs) return null;
      cs.added = true; cs.deleted = false;
      const sc = (scene ?? c.scenes[0]) as never; const cap = (c.captions[sc] ?? ['Un petit snap.'])[0];
      const msg = { id: `t${st.seq++}`, from: 'in' as const, kind, text: kind === 'text' ? c.openers[0] : cap, ...(kind === 'text' ? {} : { scene: sc, opened: false }), at: Date.now() };
      cs.msgs.push(msg); cs.unread++; cs.lastIn = msg.at; persist(); emitPhone(); return msg;
    },
    tick: (ms: number) => { const inc = advance(snapState().chat, ms, Date.now(), chatRng); if (inc) { persist(); emitPhone(); } return inc; },
    produce: () => { const st = snapState().chat; st.clock = Math.max(st.clock, st.nextAt); const inc = produce(st, Date.now(), chatRng); persist(); return inc; },
  },
  reset: () => {
    assignInPlace(save.data.fun.apps.clips, defaultClips() as unknown as Record<string, unknown>);
    assignInPlace(save.data.fun.apps.snap, defaultSnap() as unknown as Record<string, unknown>);
    ev().photos = ev().photos.filter((p) => p.eventId !== 'snap');
    persist();
  },
  /** Mesure (ms par image) du rendu des photos Snap et de chaque scène de Clips. */
  bench: async (n = 6) => {
    const [{ drawSnap }, { makeScene, SW, SH }, { TEMPLATES }, { camForMoment }, { currentLook }] = await Promise.all([import('./snap/render'), import('./clips/scenes'), import('./clips/gen'), import('./snap/model'), import('../game/world/look')]);
    const res: Record<string, number> = {};
    const time = (fn: (t: number) => void): number => { fn(0); const t0 = performance.now(); for (let i = 1; i <= n; i++) fn(i * 0.07); return +((performance.now() - t0) / n).toFixed(1); };
    const cam = camForMoment({ kind: 'restaurant', title: 'x' }, false);
    const rec = { id: 'b', eventId: 'snap', place: cam.place, title: 'Bench', ts: 1, look: currentLook(), auguste: true, kids: [], pose: 2, frame: 'rose', filter: 'soir' } as never;
    const c = document.createElement('canvas'); c.width = 540; c.height = 675; const g = c.getContext('2d')!;
    res['snap540'] = time((t) => drawSnap(g, rec, { cat: false, stickers: cam.stickers }, 540, 675, t));
    const c2 = document.createElement('canvas'); c2.width = SW * 2; c2.height = SH * 2; const g2 = c2.getContext('2d')!; g2.scale(2, 2);
    for (const tp of TEMPLATES) { const d = makeScene(tp.scene, { fans: 1234, title: tp.title, dur: 4 }); res[tp.id] = time((t) => d(g2, SW, SH, t)); }
    return res;
  },
  openClips: () => import('./clips/ui').then((m) => m.openClips()),
  openSnap: () => import('./snap/ui').then((m) => m.openSnap()),
});
