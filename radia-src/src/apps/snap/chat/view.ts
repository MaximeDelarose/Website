/**
 * Snapchien — écran « Chat » : liste des contacts (snap rouge = photo non ouverte, violet = vidéo, bleu = message), conversation,
 * visionneuse de snap plein écran, réponses de Radia, flammes. Classes préfixées `snc-`. Tout reste dans le jeu (rien n'est envoyé
 * à de vrais téléphones). Icônes et animations originales.
 */
import { h, tap } from '../../../ui/dom';
import { ui } from '../../../ui/ui';
import { haptic } from '../../../core/haptics';
import { ico, tick } from '../../kit';
import { snapState, persist, reduced } from '../../store';
import { emitPhone } from '../../../events/bus';
import { Rng } from '../../../utils/rng';
import { contactById, CONTACTS } from './data';
import {
  activeContacts, deleteContact, dayKey, flameCount, openSnap, readText, reply, replyChoices, rowStatus, sendSnap, setMuted,
  type ChatMsg, type ContactState,
} from './engine';
import { faceUrl, selfieUrl } from './selfie';

const rng = (): Rng => new Rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

function ago(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 2) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 24) return `il y a ${hh} h`;
  return `il y a ${Math.round(hh / 24)} j`;
}

export interface ChatHost { root: HTMLElement; toast: (title: string, sub?: string, ms?: number) => void; tabs: (active: 'chat' | 'home') => HTMLElement; close: () => void }

/** Monte l'écran Chat dans `container` ; renvoie la fonction de nettoyage. */
export function chatView(host: ChatHost, container: HTMLElement): () => void {
  const st = snapState();
  const chat = st.chat;
  let alive = true;
  const body = h('div.snc-body');
  const refresh = () => { if (open) renderConversation(open); else renderList(); };
  let open: string | null = null;

  // ---------------------------------------------------------------- liste
  function statusLine(cs: ContactState): { el: HTMLElement; unseen: boolean } {
    const { status, at } = rowStatus(cs);
    switch (status) {
      case 'snap-red': return { el: h('span.snc-st', h('i.snc-sq.red'), h('b.red', 'Nouveau Snap'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'video': return { el: h('span.snc-st', h('i.snc-sq.vid'), h('b.vid', 'Nouvelle vidéo'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'text-new': return { el: h('span.snc-st', h('i.snc-sq.txt'), h('b.txt', 'Nouveau message'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'opened': return { el: h('span.snc-st', h('i.snc-sq.seen'), h('small', `Ouvert · ${ago(at)}`)), unseen: false };
      case 'sent': return { el: h('span.snc-st', h('i.snc-sq.sent'), h('small', `Envoyé · ${ago(at)}`)), unseen: false };
      default: return { el: h('span.snc-st', h('small', 'Dis bonjour ♡')), unseen: false };
    }
  }
  function renderList(): void {
    body.textContent = '';
    body.className = 'snc-body list';
    const head = h('div.snc-head',
      h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(host.close, { sound: false }) } }, ico('close', 22)),
      h('div.snp-brand', h('i'), h('b', 'Chat')),
      h(`button.snp-x.snc-bell${chat.muted ? '.off' : ''}`, { 'aria-label': chat.muted ? 'Notifications coupées : les remettre' : 'Couper les notifications de Snapchien', on: { click: tap(() => { setMuted(chat, !chat.muted); persist(); host.toast(chat.muted ? 'Notifications coupées' : 'Notifications remises', chat.muted ? 'Les messages t’attendent ici, sans bruit.' : undefined, 2200); renderList(); }, { sound: false }) } }, ico(chat.muted ? 'bellOff' : 'bell', 22)));
    const list = h('div.snc-list');
    const rows = activeContacts(chat).map((c) => ({ c, cs: chat.contacts[c.id] })).sort((a, b) => rowStatus(b.cs).at - rowStatus(a.cs).at);
    const today = dayKey(Date.now());
    for (const { c, cs } of rows) {
      const { el, unseen } = statusLine(cs);
      const fl = flameCount(cs.flame, today);
      const row = h(`button.snc-row${unseen ? '.unseen' : ''}`, { 'aria-label': `${c.name}${fl ? `, flamme ${fl}` : ''}`, 'data-cid': c.id },
        h('img.snc-face', { src: faceUrl(c.id, 96), alt: '' }),
        h('div.snc-mid', h('b', c.name, fl ? h('em.snc-fl', `🔥 ${fl}`) : null), el));
      row.addEventListener('click', tap(() => {
        const unopened = cs.msgs.find((m) => m.from === 'in' && m.kind !== 'text' && !m.opened);
        if (unopened) openViewer(c.id, unopened); else { open = c.id; renderConversation(c.id); }
      }, { sound: false }));
      const quick = h('button.snc-cam', { 'aria-label': `Envoyer un snap à ${c.name}`, on: { click: tap((e) => { e?.stopPropagation(); sendQuick(c.id); }, { sound: false }) } }, ico('camera', 20));
      list.append(h('div.snc-rowwrap', row, quick));
    }
    if (!rows.length) list.append(h('div.snp-empty', h('p', 'Aucun contact pour l’instant.')));
    body.append(head, list, host.tabs('chat'));
  }

  // ---------------------------------------------------------------- conversation
  function bubble(m: ChatMsg, cid: string): HTMLElement {
    if (m.kind === 'text') return h(`div.snc-b.${m.from}`, m.text);
    const isVideo = m.kind === 'video';
    if (m.from === 'in') {
      const unopened = !m.opened;
      const el = h(`button.snc-snap.in${unopened ? (isVideo ? '.vid' : '.red') : '.seen'}`, { 'aria-label': unopened ? 'Ouvrir le snap' : 'Snap ouvert' }, h('i.snc-sq'), h('span', unopened ? (isVideo ? 'Nouvelle vidéo · appuie pour ouvrir' : 'Nouveau Snap · appuie pour ouvrir') : (isVideo ? 'Vidéo ouverte' : 'Snap ouvert')));
      if (unopened) el.addEventListener('click', tap(() => openViewer(cid, m), { sound: false }));
      return el;
    }
    return h('div.snc-snap.out', h('i.snc-sq.sent'), h('span', m.opened ? 'Snap ouvert' : 'Snap envoyé'));
  }
  function renderConversation(cid: string): void {
    const ct = contactById(cid)!; const cs = chat.contacts[cid];
    readText(chat, cid); persist(); emitPhone();
    body.textContent = '';
    body.className = 'snc-body conv';
    const fl = flameCount(cs.flame, dayKey(Date.now()));
    const head = h('div.snc-head.conv',
      h('button.snp-x', { 'aria-label': 'Retour à la liste', on: { click: tap(() => { open = null; renderList(); }, { sound: false }) } }, ico('back', 22)),
      h('img.snc-face.sm', { src: faceUrl(cid, 72), alt: '' }),
      h('div.snc-who', h('b', ct.name), fl ? h('em.snc-fl', `🔥 ${fl}`) : h('small', 'Contact Snapchien')),
      h('button.snp-x.snc-more', { 'aria-label': 'Plus d’options', on: { click: tap(async () => {
        const r = await ui.modal({ title: ct.name, body: 'Supprimer ce contact ? Il ne pourra plus t’écrire. L’historique reste dans ta sauvegarde.', actions: [{ label: 'Supprimer le contact', value: 'del', style: 'secondary' }, { label: 'Annuler', value: 'no', style: 'primary' }] });
        if (r === 'del') { deleteContact(chat, cid); persist(); emitPhone(); open = null; renderList(); host.toast('Contact supprimé', `${ct.name} ne t’écrira plus.`, 2400); }
      }, { sound: false }) } }, ico('more', 22)));
    const thread = h('div.snc-thread');
    for (const m of cs.msgs) thread.append(bubble(m, cid));
    const lastIn = [...cs.msgs].reverse().find((m) => m.from === 'in' && m.kind !== 'text' && m.opened);
    const chips = h('div.snc-chips');
    for (const r of replyChoices(lastIn?.scene)) chips.append(h('button.snc-chip', { 'data-r': r.id, on: { click: tap(() => doReply(cid, r.id, thread), { sound: false }) } }, r.text));
    const send = h('button.snc-sendsnap', { on: { click: tap(() => { sendQuick(cid); }, { sound: false }) } }, ico('camera', 20), h('span', 'Envoyer un snap'));
    const foot = h('div.snc-foot', chips, send);
    body.append(head, thread, foot, host.tabs('chat'));
    window.setTimeout(() => { thread.scrollTop = thread.scrollHeight; }, 30);
  }
  function typing(thread: HTMLElement): HTMLElement { const t = h('div.snc-b.in.typing', h('i'), h('i'), h('i')); thread.append(t); thread.scrollTop = thread.scrollHeight; return t; }
  function doReply(cid: string, choiceId: string, thread: HTMLElement): void {
    const out = reply(chat, cid, choiceId, Date.now(), rng()); if (!out) return;
    persist(); tick('pop1'); haptic('select');
    thread.append(h('div.snc-b.out', out.mine.text)); thread.scrollTop = thread.scrollHeight;
    const dots = typing(thread);
    window.setTimeout(() => { if (!alive) return; dots.remove(); thread.append(h('div.snc-b.in', out.theirs.text)); thread.scrollTop = thread.scrollHeight; tick('pop2'); persist(); }, reduced() ? 120 : 900);
  }
  /** Radia envoie un snap : le contact répond par un snap ; la flamme progresse si c'est réciproque ce jour-là. */
  function sendQuick(cid: string): void {
    const ct = contactById(cid)!; const before = flameCount(chat.contacts[cid].flame, dayKey(Date.now()));
    const out = sendSnap(chat, cid, Date.now(), rng()); if (!out) return;
    persist(); emitPhone(); tick('sparkle'); haptic('select');
    const after = flameCount(chat.contacts[cid].flame, dayKey(Date.now()));
    host.toast(after > before ? `🔥 ${after} avec ${ct.name}` : `Snap envoyé à ${ct.name}`, after > before ? 'La flamme grandit ♡' : undefined, 2200);
    if (open) renderConversation(cid); else renderList();
  }

  // ---------------------------------------------------------------- visionneuse
  function openViewer(cid: string, msg: ChatMsg): void {
    const ct = contactById(cid)!;
    openSnap(chat, cid, msg.id); persist(); emitPhone(); tick('pop2'); haptic('select');
    const isVideo = msg.kind === 'video';
    const view = h(`div.snc-viewer${isVideo ? '.vid' : ''}`, { role: 'dialog', 'aria-label': `Snap de ${ct.name}` },
      h('img.snc-photo', { src: selfieUrl(cid, msg.scene ?? 'selfie'), alt: '' }),
      h('div.snc-vtop', h('img.snc-face.sm', { src: faceUrl(cid, 72), alt: '' }), h('div', h('b', ct.name), h('small', isVideo ? 'Vidéo · à l’instant' : ago(msg.at))),
        h('button.snp-x.snc-vx', { 'aria-label': 'Fermer', on: { click: tap(() => closeViewer(false), { sound: false }) } }, ico('close', 22))),
      isVideo ? h('div.snc-play', h('i'), h('span', 'Vidéo'), h('div.snc-prog', h('b'))) : null,
      h('div.snc-cap', h('p', msg.text)),
      h('div.snc-vact',
        h('button.btn.secondary.snc-vclose', { on: { click: tap(() => closeViewer(false), { sound: false }) } }, 'Fermer'),
        h('button.btn.snc-vreply', { on: { click: tap(() => closeViewer(true), { sound: false }) } }, 'Répondre')));
    host.root.append(view);
    function closeViewer(andReply: boolean): void {
      view.classList.add('out'); window.setTimeout(() => view.remove(), 200);
      open = cid; renderConversation(cid);
      if (andReply) window.setTimeout(() => body.querySelector('.snc-chips')?.scrollIntoView({ block: 'end' }), 60);
    }
  }

  container.append(body);
  renderList();
  void CONTACTS;
  return () => { alive = false; body.remove(); void refresh; };
}
