/**
 * Snapchien — écran « Chat » : liste des contacts (snap rouge = photo non ouverte, violet = vidéo, bleu = message), conversation,
 * visionneuse de snap plein écran, réponses de Radia, flammes. Classes préfixées `snc-`. Tout reste dans le jeu (rien n'est envoyé
 * à de vrais téléphones). Icônes et animations originales.
 */
import { h, tap } from '../../../ui/dom';
import { ui } from '../../../ui/ui';
import { haptic } from '../../../core/haptics';
import { ico, tick } from '../../kit';
import { snapState, persist } from '../../store';
import { emitPhone } from '../../../events/bus';
import { Rng } from '../../../utils/rng';
import { contactById, CONTACTS } from './data';
import {
  activeContacts, addFriend, choicesFor, converse, DELIVERY_LABEL, deleteContact, deliveryOf, dayKey, flameCount, markStorySeen, openSnap, presenceOf, readText, replyChoices, rowStatus, setMuted, suggestions, visibleMsgs,
  type ChatMsg, type ContactState, type FriendStory,
} from './engine';
import { brainState } from '../../store';
import { faceUrl, selfieUrl } from './selfie';
import { radiaSelfieUrl, type SelfiePick } from './radiaSelfie';

const rng = (): Rng => new Rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

function ago(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 2) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 24) return `il y a ${hh} h`;
  return `il y a ${Math.round(hh / 24)} j`;
}

export type SnapTab = 'chat' | 'snaps' | 'friends' | 'stories' | 'home';
export interface ChatHost { root: HTMLElement; toast: (title: string, sub?: string, ms?: number) => void; tabs: (active: SnapTab) => HTMLElement; close: () => void }

/** Story d'un ami en plein écran (illustration + légende du jour). Fermer = retour ; Répondre = ouvre la conversation. */
export function openFriendStory(host: Pick<ChatHost, 'root'>, story: FriendStory, o: { onClose: () => void; onReply: (cid: string) => void }): void {
  const ct = contactById(story.cid); if (!ct) return;
  const chat = snapState().chat; markStorySeen(chat, story.cid, dayKey(Date.now())); persist(); emitPhone(); tick('pop2'); haptic('select');
  const view = h('div.snc-viewer.story', { role: 'dialog', 'aria-label': `Story de ${ct.name}` },
    h('img.snc-photo', { src: selfieUrl(story.cid, story.scene), alt: '' }),
    h('div.snc-vtop', h('img.snc-face.sm', { src: faceUrl(story.cid, 72), alt: '' }), h('div', h('b', ct.name), h('small', 'Story · aujourd’hui')),
      h('button.snp-x.snc-vx', { 'aria-label': 'Fermer', on: { click: tap(() => end(false), { sound: false }) } }, ico('close', 22))),
    h('div.snc-storybar', h('b')),
    h('div.snc-cap', h('p', story.caption)),
    h('div.snc-vact', h('button.btn.secondary.snc-vclose', { on: { click: tap(() => end(false), { sound: false }) } }, 'Fermer'), h('button.btn.snc-vreply', { on: { click: tap(() => end(true), { sound: false }) } }, 'Répondre')));
  host.root.append(view);
  function end(reply: boolean): void { view.classList.add('out'); window.setTimeout(() => view.remove(), 200); o.onClose(); if (reply) o.onReply(story.cid); }
}

/** Monte l'écran Chat dans `container` ; renvoie la fonction de nettoyage. */
export function chatView(host: ChatHost, container: HTMLElement, mode: 'chat' | 'snaps' | 'friends' = 'chat'): () => void {
  const st = snapState();
  const chat = st.chat;
  let alive = true;
  const body = h('div.snc-body');
  const refresh = () => { if (open) renderConversation(open); else renderList(); };
  const TITLES = { chat: 'Chats', snaps: 'Snaps', friends: 'Amis' } as const;
  let open: string | null = null;

  // ---------------------------------------------------------------- liste
  function statusLine(cs: ContactState): { el: HTMLElement; unseen: boolean } {
    const now0 = Date.now(); const { status, at } = rowStatus(cs, now0);
    switch (status) {
      case 'snap-red': return { el: h('span.snc-st', h('i.snc-sq.red'), h('b.red', 'Nouveau Snap'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'video': return { el: h('span.snc-st', h('i.snc-sq.vid'), h('b.vid', 'Nouvelle vidéo'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'text-new': return { el: h('span.snc-st', h('i.snc-sq.txt'), h('b.txt', 'Nouveau message'), h('small', ` · ${ago(at)}`)), unseen: true };
      case 'opened': return { el: h('span.snc-st', h('i.snc-sq.seen'), h('small', `Ouvert · ${ago(at)}`)), unseen: false };
      case 'sent': { const lo = [...visibleMsgs(cs, now0)].reverse().find((m) => m.from === 'out'); const dl = lo ? DELIVERY_LABEL[deliveryOf(lo, now0)] : 'Envoyé'; return { el: h('span.snc-st', h('i.snc-sq.sent'), h('small', `${dl} · ${ago(at)}`)), unseen: false }; }
      default: return { el: h('span.snc-st', h('small', 'Dis bonjour ♡')), unseen: false };
    }
  }
  function renderList(): void {
    if (mode === 'friends') { renderFriends(); return; }
    body.textContent = '';
    body.className = 'snc-body list';
    const head = h('div.snc-head',
      h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(host.close, { sound: false }) } }, ico('close', 22)),
      h('div.snp-brand', h('i'), h('b', TITLES[mode])),
      h(`button.snp-x.snc-bell${chat.muted ? '.off' : ''}`, { 'aria-label': chat.muted ? 'Notifications coupées : les remettre' : 'Couper les notifications de Snapchien', on: { click: tap(() => { setMuted(chat, !chat.muted); persist(); host.toast(chat.muted ? 'Notifications coupées' : 'Notifications remises', chat.muted ? 'Les messages t’attendent ici, sans bruit.' : undefined, 2200); renderList(); }, { sound: false }) } }, ico(chat.muted ? 'bellOff' : 'bell', 22)));
    const list = h('div.snc-list');
    let rows = activeContacts(chat).map((c) => ({ c, cs: chat.contacts[c.id] })).sort((a, b) => rowStatus(b.cs, Date.now()).at - rowStatus(a.cs, Date.now()).at);
    if (mode === 'snaps') {
      // onglet Snaps : seulement les échanges de snaps ; les non ouverts (rouges / violets) d'abord
      rows = rows.filter((r) => r.cs.msgs.some((m) => m.kind !== 'text'));
      const unopened = (cs: ContactState): number => (cs.msgs.some((m) => m.from === 'in' && m.kind !== 'text' && !m.opened) ? 1 : 0);
      rows.sort((a, b) => unopened(b.cs) - unopened(a.cs) || rowStatus(b.cs).at - rowStatus(a.cs).at);
    }
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
    if (!rows.length) list.append(h('div.snp-empty', h('p', mode === 'snaps' ? 'Aucun snap pour l’instant. Envoie le premier avec l’appareil photo d’un ami ♡' : 'Aucun contact pour l’instant.')));
    body.append(head, list, host.tabs(mode));
  }

  // ---------------------------------------------------------------- amis (flammes, suggestions)
  function renderFriends(): void {
    body.textContent = ''; body.className = 'snc-body list friends';
    const head = h('div.snc-head', h('button.snp-x', { 'aria-label': 'Fermer', on: { click: tap(host.close, { sound: false }) } }, ico('close', 22)), h('div.snp-brand', h('i'), h('b', 'Amis')), h('span.snc-sp'));
    const list = h('div.snc-list');
    const today = dayKey(Date.now());
    const mine = activeContacts(chat);
    list.append(h('h3.snp-h.snc-h', `Mes amis · ${mine.length}`));
    for (const c of mine) {
      const cs = chat.contacts[c.id]; const fl = flameCount(cs.flame, today);
      const row = h('button.snc-row', { 'data-cid': c.id, 'aria-label': `${c.name}${fl ? `, flamme ${fl}` : ''}` },
        h('img.snc-face', { src: faceUrl(c.id, 96), alt: '' }),
        h('div.snc-mid', h('b', c.name, fl ? h('em.snc-fl', `🔥 ${fl}`) : null), h('span.snc-st', h('small', fl ? `Série de ${fl} jour${fl > 1 ? 's' : ''} en cours` : 'Pas de flamme en ce moment'))));
      row.addEventListener('click', tap(() => { open = c.id; renderConversation(c.id); }, { sound: false }));
      list.append(row);
    }
    const sug = suggestions(chat);
    if (sug.length) {
      list.append(h('h3.snp-h.snc-h', 'Ajouter des amis'));
      for (const c of sug) {
        const add = h('button.btn.small.snc-add', { 'aria-label': `Ajouter ${c.name}`, on: { click: tap(() => {
          if (!addFriend(chat, c.id, Date.now())) return;
          persist(); emitPhone(); tick('sparkle'); host.toast(`${c.name} est dans tes amis`, 'Il pourra t’écrire ♡', 2200); renderFriends();
        }, { sound: false }) } }, 'Ajouter');
        list.append(h('div.snc-row.sug', { 'data-cid': c.id }, h('img.snc-face', { src: faceUrl(c.id, 96), alt: '' }), h('div.snc-mid', h('b', c.name), h('span.snc-st', h('small', 'Suggestion'))), add));
      }
    }
    body.append(head, list, host.tabs('friends'));
  }

  // ---------------------------------------------------------------- conversation
  let convTimer = 0;
  const stopConv = (): void => { if (convTimer) { window.clearInterval(convTimer); convTimer = 0; } };
  function bubble(m: ChatMsg, cid: string): HTMLElement {
    if (m.sys === 'shot') return h('div.snc-sys', `📸 ${m.text}`);
    if (m.kind === 'text') return h(`div.snc-b.${m.from}${m.ask ? '.ask' : ''}`, m.text);
    const isVideo = m.kind === 'video';
    if (m.from === 'in') {
      const unopened = !m.opened;
      const el = h(`button.snc-snap.in${unopened ? (isVideo ? '.vid' : '.red') : '.seen'}`, { 'aria-label': unopened ? 'Ouvrir le snap' : 'Snap ouvert' }, h('i.snc-sq'), h('span', unopened ? (isVideo ? 'Nouvelle vidéo · appuie pour ouvrir' : 'Nouveau snap · appuie pour ouvrir') : (isVideo ? 'Vidéo ouverte' : 'Snap ouvert')));
      if (unopened) el.addEventListener('click', tap(() => openViewer(cid, m), { sound: false }));
      return el;
    }
    const el = h('button.snc-snap.out', { 'aria-label': m.pick ? 'Revoir mon selfie' : 'Snap envoyé' }, h('i.snc-sq.sent'), h('span', m.text || 'Snap envoyé'), m.pick ? h('img.snc-thumb', { src: radiaSelfieUrl(m.pick), alt: '' }) : null);
    if (m.pick) el.addEventListener('click', tap(() => openOwnSnap(m), { sound: false }));
    return el;
  }
  /** Mon selfie fictif, en plein écran (jamais une vraie photo de l'iPhone). */
  function openOwnSnap(m: ChatMsg): void {
    if (!m.pick) return;
    const view = h('div.snc-viewer', { role: 'dialog', 'aria-label': 'Mon selfie' }, h('img.snc-photo', { src: radiaSelfieUrl(m.pick), alt: '' }),
      h('div.snc-vtop', h('div', h('b', 'Mon snap'), h('small', ago(m.at))), h('button.snp-x.snc-vx', { 'aria-label': 'Fermer', on: { click: tap(() => { view.classList.add('out'); window.setTimeout(() => view.remove(), 200); }, { sound: false }) } }, ico('close', 22))),
      h('div.snc-cap', h('p', m.text)));
    host.root.append(view);
  }
  function renderConversation(cid: string): void {
    stopConv();
    const ct = contactById(cid)!; const cs = chat.contacts[cid]; const brain = brainState();
    readText(chat, cid); persist(); emitPhone();
    body.textContent = '';
    body.className = 'snc-body conv';
    const fl = flameCount(cs.flame, dayKey(Date.now()));
    const head = h('div.snc-head.conv',
      h('button.snp-x', { 'aria-label': 'Retour à la liste', on: { click: tap(() => { stopConv(); open = null; renderList(); }, { sound: false }) } }, ico('back', 22)),
      h('img.snc-face.sm', { src: faceUrl(cid, 72), alt: '' }),
      h('div.snc-who', h('b', ct.name), fl ? h('em.snc-fl', `🔥 ${fl}`) : h('small', 'Contact Snapchien')),
      h('button.snp-x.snc-more', { 'aria-label': 'Plus d’options', on: { click: tap(async () => {
        const r = await ui.modal({ title: ct.name, body: 'Supprimer ce contact ? Il ne pourra plus t’écrire. L’historique reste dans ta sauvegarde.', actions: [{ label: 'Supprimer le contact', value: 'del', style: 'secondary' }, { label: 'Annuler', value: 'no' }] });
        if (r === 'del') { stopConv(); deleteContact(chat, cid); persist(); emitPhone(); open = null; renderList(); host.toast('Contact supprimé', `${ct.name} ne t’écrira plus.`, 2400); }
      }, { sound: false }) } }, ico('more', 22)));
    const thread = h('div.snc-thread');
    const pres = h('div.snc-pres');
    const chips = h('div.snc-chips');
    const send = h('button.snc-sendsnap', { on: { click: tap(() => { sendQuick(cid); }, { sound: false }) } }, ico('camera', 20), h('span', 'Envoyer un snap'));
    const foot = h('div.snc-foot', chips, send);
    body.append(head, thread, pres, foot, host.tabs(mode));
    let sig = ''; let first = true;
    const paint = (force = false): void => {
      if (!alive || open !== cid) { stopConv(); return; }
      const now = Date.now(); const vis = visibleMsgs(cs, now); const pr = presenceOf(chat, cid, now, brain);
      const lastOut = [...vis].reverse().find((m) => m.from === 'out');
      const dl = lastOut ? deliveryOf(lastOut, now) : null; const shot = !!(lastOut?.shotAt && now >= lastOut.shotAt);
      const pending = cs.msgs.some((m) => m.from === 'in' && m.at > now);
      const nsig = `${vis.map((m) => m.id + (m.opened ? 'o' : '')).join(',')}|${pr.state}|${pr.label}|${pr.mood}|${dl}|${shot}|${pending}`;
      if (!force && nsig === sig) return; sig = nsig;
      const nearBottom = first || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80; first = false;
      thread.replaceChildren(...vis.filter((m) => m.sys !== 'shot' || (m.shotAt ?? 0) <= now).map((m) => bubble(m, cid)));
      if (lastOut && dl) { const dli = h('div.snc-deliv', `${DELIVERY_LABEL[dl]}${shot ? ' · 📸 capture d’écran' : ''}`); dli.dataset.state = dl; const idx = vis.indexOf(lastOut); const after = thread.children[idx]; if (after) after.after(dli); }
      if (pr.state === 'typing') thread.append(h('div.snc-b.in.typing', h('i'), h('i'), h('i')));
      pres.className = `snc-pres ${pr.state}`; pres.dataset.state = pr.state; pres.replaceChildren();
      if (pr.state !== 'away') pres.append(h('img.snc-avatar', { src: faceUrl(cid, 96, pr.mood), alt: '' }), h('span', pr.label));
      // réponses de Radia : choix du cerveau (mémoire du personnage) ; juste après l'ouverture d'un snap, les réactions classiques
      const lastInSnap = [...vis].reverse().find((m) => m.from === 'in' && m.kind !== 'text' && m.opened);
      const afterSnap = !!lastInSnap && !vis.some((m) => m.from === 'out' && m.at > lastInSnap.at);
      const list = pending ? [] : afterSnap ? [...replyChoices(lastInSnap?.scene).slice(0, 4), ...choicesFor(chat, brain, cid, rng(), now).slice(0, 2)] : choicesFor(chat, brain, cid, rng(), now);
      chips.className = `snc-chips${pending ? ' wait' : ''}`;
      chips.replaceChildren(...list.map((r) => h('button.snc-chip', { 'data-r': r.id, on: { click: tap(() => doReply(cid, r.id), { sound: false }) } }, r.text)));
      if (nearBottom) window.setTimeout(() => { thread.scrollTop = thread.scrollHeight; }, 20);
    };
    paint(true);
    convTimer = window.setInterval(() => paint(), 400);
  }
  function doReply(cid: string, choiceId: string): void {
    const out = converse(chat, brainState(), cid, choiceId, Date.now(), rng()); if (!out) return;
    persist(); emitPhone(); tick('pop1'); haptic('select');
    if (out.snapBack) window.setTimeout(() => { if (alive) { tick('sparkle'); emitPhone(); } }, 2400);
  }
  /** Radia envoie un snap (selfie fictif de son personnage : sourire, tenue du jour ou grimace) ; la flamme progresse si c'est réciproque ce jour-là. */
  async function sendQuick(cid: string): Promise<void> {
    const ct = contactById(cid)!; const before = flameCount(chat.contacts[cid].flame, dayKey(Date.now()));
    const r = await ui.modal({ title: `Un snap pour ${ct.name} ?`, body: 'Un selfie fictif de ton personnage RADIA (jamais tes vraies photos).', actions: [
      { label: 'Mon sourire', value: 'ph_smile' }, { label: 'Ma tenue du jour', value: 'ph_outfit', style: 'secondary' }, { label: 'Une grimace', value: 'ph_funny', style: 'secondary' }, { label: 'Annuler', value: 'no', style: 'secondary' }] });
    if (!r || r === 'no') return;
    const out = converse(chat, brainState(), cid, r as SelfiePick, Date.now(), rng()); if (!out) return;
    persist(); emitPhone(); tick('sparkle'); haptic('select');
    const after = flameCount(chat.contacts[cid].flame, dayKey(Date.now()));
    host.toast(after > before ? `🔥 ${after} avec ${ct.name}` : `Snap envoyé à ${ct.name}`, after > before ? 'La flamme grandit ♡' : undefined, 2200);
    if (open !== cid) { open = cid; renderConversation(cid); } else renderConversation(cid);
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
  return () => { alive = false; stopConv(); body.remove(); void refresh; };
}
