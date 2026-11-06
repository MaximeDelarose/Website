/**
 * Messages — interface façon iMessage (graphismes originaux) : liste des conversations (recherche, rédaction), conversation (bulles bleues
 * envoyées / grises reçues, « … », « Distribué » / « Lu » SIMULÉS, réactions en appui long), saisie. Plein écran PAR-DESSUS le téléphone :
 * « ‹ » d'une conversation → liste ; « ‹ » de la liste → écran d'accueil du téléphone ; le téléphone, lui, se quitte par son propre ✕.
 */
import './messages.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { ev } from '../../events/api';
import { emitPhone, onPhoneChange } from '../../events/bus';
import { eventById, SECRET_ID } from '../../events/data';
import { inviteTime } from '../../events/manager';
import type { EventDef, Invite } from '../../events/types';
import { openInvite, replayVoice } from '../../events/flow';
import { save } from '../../core/app';
import { CONTACT_IDS, REACTIONS, type ContactId, type ReactionId } from './data';
import { lastSentStatus, markRead, react, type Msg } from './engine';
import { hhmm, listTime, needSeparator, separatorLabel } from './format';
import { contactFace, contactName, legacyUnread, messagesState, sendMessage, view } from './runtime';
import { photoById } from '../store';

export interface MessagesHost { /** quitter l'application → écran d'accueil du téléphone */ close: () => void; /** quitter le téléphone (ouvrir une invitation, une scène…) */ leavePhone: () => void }

const fold = (t: string): string => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
interface Item { id: string; from: 'me' | 'them'; text: string; at: number; msg?: Msg }

/**
 * Chronologie UNIQUE d'une conversation : messages (déjà migrés depuis l'ancien système), invitations et message vocal, triés par heure.
 * L'aperçu de la liste est le DERNIER élément de cette même chronologie : ce qui s'affiche dans la liste est toujours dans le fil.
 */
type Entry = { kind: 'msg'; at: number; msg: Msg } | { kind: 'invite'; at: number; invite: Invite; def: EventDef } | { kind: 'voice'; at: number };
const VOICE_TXT = '🎙 Message vocal de A';
function timeline(id: ContactId): Entry[] {
  const s = messagesState(); // migre d'abord les messages hérités : une seule source de vérité
  const st = ev(); const now = Date.now();
  const out: Entry[] = s.convos[id].msgs.map((msg) => ({ kind: 'msg', at: msg.at, msg }));
  for (const i of st.inbox.filter((x) => eventById(x.eventId)?.sender === id).slice(-8)) { const def = eventById(i.eventId); if (def) out.push({ kind: 'invite', at: inviteTime(st, i, now), invite: i, def }); }
  if (id === 'auguste' && st.secret.triggered) { // carte « Écouter » juste après la bulle du message vocal (sinon en tête du fil)
    const v = s.convos.auguste.msgs.find((m) => m.text === VOICE_TXT);
    out.push({ kind: 'voice', at: v ? v.at + 1 : 0 });
  }
  return out.sort((a, b) => a.at - b.at); // tri stable
}
function lastOf(id: ContactId): { text: string; at: number } | null {
  const t = timeline(id); const l = t[t.length - 1];
  if (!l) return null;
  return l.kind === 'msg' ? { text: l.msg.photo ? '📷 Photo' : l.msg.text, at: l.at } : l.kind === 'invite' ? { text: l.def.teaser, at: l.at } : { text: VOICE_TXT, at: l.at };
}
function unreadOf(id: ContactId): number {
  const st = ev();
  return messagesState().convos[id].unread + st.inbox.filter((i) => i.state === 'new' && eventById(i.eventId)?.sender === id).length;
}

export function openMessagesView(host: MessagesHost): { close: () => void } {
  let alive = true;
  let query = '';
  const root = h('div.msg-layer');
  const body = h('div.msg-body');
  root.append(body);
  ui.root.append(root);
  view.open = true; view.thread = null;
  audio.play('pop2');

  // un message qui arrive par un autre circuit (messages d'événements, invitations) met aussi à jour la liste / le fil ouverts
  const offPhone = onPhoneChange(() => { if (alive) view.refresh?.(view.thread ?? 'auguste'); });
  const stopAll = () => { alive = false; offPhone(); view.open = false; view.thread = null; view.refresh = null; view.typing.clear(); };
  function close() {
    if (!alive) return;
    stopAll();
    root.classList.add('out');
    window.setTimeout(() => root.remove(), 240);
    emitPhone();
    host.close();
  }

  /** Quitter le téléphone (invitation, message vocal…) : la couche Messages part avec lui, sans rien laisser par-dessus le jeu. */
  function leave() { if (!alive) return; stopAll(); root.remove(); emitPhone(); host.leavePhone(); }

  // ------------------------------------------------------------------ liste
  function renderList() {
    view.thread = null;
    body.className = 'msg-body list';
    body.replaceChildren();
    const search = h('input.msg-search-in', { type: 'search', placeholder: 'Rechercher', 'aria-label': 'Rechercher une conversation', autocomplete: 'off', enterkeyhint: 'search' }) as HTMLInputElement;
    search.value = query;
    const rows = h('div.msg-rows');
    const head = h('div.msg-head',
      h('button.msg-ibtn', { 'aria-label': 'Écran d’accueil du téléphone', on: { click: tap(() => close(), { sound: false }) } }, icon('back', 22)),
      h('span.msg-spacer'),
      h('button.msg-ibtn', { 'aria-label': 'Nouveau message', on: { click: tap(() => renderCompose(), { sound: false }) } }, '✎'));
    body.append(head, h('h1.msg-big', 'Messages'), h('div.msg-search', h('span.msg-mag', '🔍'), search), rows);
    const paint = () => {
      rows.replaceChildren();
      const now = Date.now(); const q = fold(query.trim());
      const list = CONTACT_IDS.map((id) => ({ id, last: lastOf(id), unread: unreadOf(id) })).filter((r) => r.last || r.id === 'auguste')
        .filter((r) => !q || fold(contactName(r.id)).includes(q) || fold(r.last?.text ?? '').includes(q))
        .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
      if (!list.length) rows.append(h('p.msg-empty', q ? 'Aucun résultat.' : 'Aucune conversation pour l’instant.'));
      for (const r of list) {
        const row = h('button.msg-row-c', { 'data-cid': r.id, 'aria-label': `${contactName(r.id)}${r.unread ? `, ${r.unread} non lu${r.unread > 1 ? 's' : ''}` : ''}` },
          h('span.msg-dotcol', r.unread ? h('i.msg-dot') : null),
          h('img.msg-face', { src: contactFace(r.id), alt: '' }),
          h('div.msg-mid', h('div.msg-line1', h('b', contactName(r.id)), h('small', r.last ? listTime(r.last.at, now) : ''), h('span.msg-chev', '›')), h('div.msg-prev', r.last?.text ?? 'Un petit mot, quand tu veux ♡'), r.unread > 1 ? h('i.msg-count', String(r.unread)) : null));
        row.addEventListener('click', tap(() => renderThread(r.id), { sound: false }));
        rows.append(row);
      }
    };
    search.addEventListener('input', () => { query = search.value; paint(); });
    paint();
    view.refresh = (id) => { if (alive && !view.thread) paint(); void id; };
  }

  // ------------------------------------------------------------------ nouveau message
  function renderCompose() {
    view.thread = null;
    body.className = 'msg-body list';
    body.replaceChildren(
      h('div.msg-head', h('button.msg-ibtn', { 'aria-label': 'Retour à la liste', on: { click: tap(() => renderList(), { sound: false }) } }, icon('back', 22)), h('b.msg-title', 'Nouveau message'), h('span.msg-spacer')),
      h('p.msg-to', 'À :'),
      h('div.msg-rows', ...CONTACT_IDS.map((id) => {
        const b = h('button.msg-row-c', { 'data-cid': id }, h('span.msg-dotcol'), h('img.msg-face', { src: contactFace(id), alt: '' }), h('div.msg-mid', h('div.msg-line1', h('b', contactName(id)))));
        b.addEventListener('click', tap(() => renderThread(id), { sound: false }));
        return b;
      })));
  }

  // ------------------------------------------------------------------ conversation
  function renderThread(id: ContactId) {
    const s = messagesState();
    view.thread = id;
    // lire la conversation : non lus remis à zéro (nouveaux + anciens messages d'événements)
    markRead(s, id);
    save.save(); emitPhone();
    body.className = 'msg-body thread';
    body.replaceChildren();
    const others = CONTACT_IDS.filter((c) => c !== id).reduce((n, c) => n + unreadOf(c), 0);
    const head = h('div.msg-head.conv',
      h('button.msg-ibtn.msg-backbtn', { 'aria-label': 'Retour à la liste des conversations', on: { click: tap(() => renderList(), { sound: false }) } }, icon('back', 22), others ? h('i.msg-backn', String(others)) : null),
      h('div.msg-who', h('img.msg-face.sm', { src: contactFace(id), alt: '' }), h('small', contactName(id))),
      h('button.msg-ibtn', { 'aria-label': 'Informations sur la conversation', on: { click: tap(() => void info(id), { sound: false }) } }, 'ⓘ'));
    const thread = h('div.msg-thread');
    const input = h('input.msg-in', { type: 'text', placeholder: 'Message', 'aria-label': 'Écrire un message', enterkeyhint: 'send', autocomplete: 'off', maxlength: '500' }) as HTMLInputElement;
    const sendBtn = h('button.msg-send', { 'aria-label': 'Envoyer', disabled: 'true', on: { click: tap(() => submit(), { sound: false }) } }, '↑');
    const plus = h('button.msg-plus', { 'aria-label': 'Ajouter une pièce jointe', on: { click: tap(() => void attach(id), { sound: false }) } }, '+');
    const composer = h('div.msg-composer', plus, h('div.msg-field', input, sendBtn));
    body.append(head, thread, composer);

    const nearBottom = (): boolean => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
    const toBottom = (): void => { thread.scrollTop = thread.scrollHeight; };
    function paint() {
      const stick = nearBottom();
      thread.replaceChildren();
      const now = Date.now();
      const c = messagesState().convos[id];
      // chronologie unique : messages, invitations et message vocal, dans l'ordre de réception
      let prevAt: number | null = null;
      const status = lastSentStatus(c, hhmm);
      for (const e of timeline(id)) {
        if (needSeparator(prevAt, e.at) && e.at > 0) thread.append(h('div.msg-sep', separatorLabel(e.at, now)));
        prevAt = e.at > 0 ? e.at : prevAt;
        if (e.kind === 'msg') {
          const m = e.msg;
          thread.append(row({ id: m.id, from: m.from, text: m.text, at: m.at, msg: m }));
          if (status && status.msgId === m.id) thread.append(h('div.msg-status', status.label));
        } else if (e.kind === 'voice') thread.append(voiceCard());
        else for (const n of inviteNodes(e.invite, e.def)) thread.append(n);
      }
      if (view.typing.has(id)) thread.append(h('div.msg-r.in', h('div.msg-b.typing', h('i'), h('i'), h('i'))));
      if (!thread.children.length) thread.append(h('p.msg-empty', 'Écris le premier message ♡'));
      if (stick) toBottom();
    }
    function voiceCard(): HTMLElement {
      const done = (ev().done[SECRET_ID]?.count ?? 0) > 0;
      const card = h('button.msg-card', icon('play', 20), h('div', h('b', 'Message vocal de A'), h('small', done ? 'Réécouter ♡' : 'Écouter · une surprise t’attend ♡')));
      card.addEventListener('click', tap(() => { leave(); void replayVoice(); }, { sound: false }));
      return card;
    }
    function inviteNodes(i: Invite, d: EventDef): HTMLElement[] {
      const lbl = i.state === 'new' ? 'Nouveau' : i.state === 'later' ? 'Pour plus tard' : i.state === 'done' ? 'Terminé ♡' : 'Vu';
      const card = h(`div.msg-inv${d.golden ? '.gold' : ''}`, h('div.msg-inv-h', h('b', d.title), h('small', lbl)), h('p', d.invite));
      if (i.state !== 'done') card.append(h('button.msg-inv-go', { on: { click: tap(() => { leave(); void openInvite(i.runId); }) } }, 'Voir l’invitation'));
      return [h('div.msg-r.in', h('div.msg-b', d.teaser)), card];
    }
    function row(it: Item): HTMLElement {
      const m = it.msg;
      const reaction: ReactionId | undefined = m ? (it.from === 'me' ? m.reaction : m.myReaction) : undefined;
      const bub = h(`div.msg-b${m?.photo ? '.has-photo' : ''}`, { 'data-mid': it.id });
      if (m?.photo) {
        const p = photoById(m.photo);
        if (p) void import('../../events/photo/gallery').then((g) => { if (bub.isConnected || true) bub.prepend(g.buildGallery([p], { onSelect: (x) => g.openPhotoViewer(x) })); });
        else bub.append(h('span', '📷 Photo'));
      }
      if (it.text) bub.append(h('span', it.text));
      const wrap = h(`div.msg-r.${it.from === 'me' ? 'me' : 'in'}`, bub);
      if (reaction) wrap.append(h('span.msg-react', { 'aria-label': `Réaction : ${REACTIONS.find((r) => r.id === reaction)?.label ?? ''}` }, REACTIONS.find((r) => r.id === reaction)?.emoji ?? ''));
      if (m && it.from === 'them') pressToReact(bub, wrap, m);
      return wrap;
    }
    // appui long (~500 ms) sur un message reçu → palette de réactions
    function pressToReact(bub: HTMLElement, wrap: HTMLElement, m: Msg) {
      let t = 0; let sx = 0; let sy = 0; let fired = false;
      const cancel = () => { window.clearTimeout(t); t = 0; };
      bub.addEventListener('contextmenu', (e) => e.preventDefault());
      bub.addEventListener('pointerdown', (e) => {
        fired = false; sx = e.clientX; sy = e.clientY; cancel();
        t = window.setTimeout(() => { t = 0; fired = true; haptic('select'); palette(bub, wrap, m); }, 500);
      });
      bub.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
      for (const ev2 of ['pointerup', 'pointercancel', 'pointerleave'] as const) bub.addEventListener(ev2, () => { if (t) cancel(); });
      bub.addEventListener('click', (e) => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
    }
    function palette(bub: HTMLElement, wrap: HTMLElement, m: Msg) {
      root.querySelector('.msg-pal-back')?.remove();
      const r = bub.getBoundingClientRect(); const rr = root.getBoundingClientRect();
      const pal = h('div.msg-pal', { role: 'menu', 'aria-label': 'Réagir au message' });
      const back = h('div.msg-pal-back', pal);
      for (const rc of REACTIONS) {
        const b = h(`button${m.myReaction === rc.id ? '.on' : ''}`, { role: 'menuitem', 'aria-label': rc.label }, rc.emoji);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          const now = react(messagesState(), id, m.id, rc.id);
          save.save(); back.remove();
          haptic('select'); audio.play('pop1');
          paint();
          // petit effet : la pastille de réaction « pop » sur le message
          const badge = thread.querySelector(`[data-mid="${m.id}"]`)?.parentElement?.querySelector('.msg-react');
          if (now && badge) { badge.classList.add('pop'); }
        });
        pal.append(b);
      }
      const openedAt = Date.now();
      // le relâchement du doigt de l'appui long génère un clic sur ce fond tout juste apparu : on l'ignore un instant
      back.addEventListener('click', () => { if (Date.now() - openedAt > 800) back.remove(); });
      root.append(back);
      const w = 6 * 46 + 16;
      pal.style.left = `${Math.max(8, Math.min(rr.width - w - 8, r.left - rr.left))}px`;
      pal.style.top = `${Math.max(rr.top + 60, r.top - rr.top - 56)}px`;
      void wrap;
    }
    function submit(photo?: string) {
      const text = input.value;
      if (!text.trim() && !photo) return;
      const m = sendMessage(id, text, photo);
      if (!m) return;
      input.value = ''; sendBtn.setAttribute('disabled', 'true'); sendBtn.classList.remove('on');
      audio.play('pop1'); haptic('select');
      paint(); toBottom();
    }
    (thread as HTMLElement & { _submit?: (p?: string) => void })._submit = submit;
    input.addEventListener('input', () => { const on = !!input.value.trim(); sendBtn.toggleAttribute('disabled', !on); sendBtn.classList.toggle('on', on); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    // clavier : la barre de saisie remonte avec lui (variable --kb gérée par viewport.ts) et la conversation reste en bas
    const onVv = () => { if (nearBottom() || document.activeElement === input) window.setTimeout(toBottom, 60); };
    input.addEventListener('focus', () => window.setTimeout(toBottom, 280));
    window.visualViewport?.addEventListener('resize', onVv);
    const prevRefresh = view.refresh;
    view.refresh = (cid) => { if (!alive) return; if (view.thread === id && cid === id) { markRead(messagesState(), id); paint(); } else prevRefresh?.(cid); };
    paint(); toBottom();
    window.setTimeout(toBottom, 60);
  }

  // ------------------------------------------------------------------ infos de la conversation
  async function info(id: ContactId) {
    const s = messagesState();
    const r = await ui.modal({
      title: contactName(id),
      body: h('div', { style: 'text-align:left;font-size:14px' }, h('p', `${s.convos[id].msgs.length} message${s.convos[id].msgs.length > 1 ? 's' : ''} dans cette conversation.`), h('p.muted', { style: 'font-size:12.5px' }, 'Les accusés « Distribué » et « Lu » sont simulés par le jeu ; rien n’est envoyé hors de RADIA.')),
      actions: [{ label: s.muted ? 'Réactiver les notifications' : 'Couper les notifications de Messages', value: 'mute', style: 'secondary' }, { label: 'Fermer', value: 'ok', style: 'primary' }],
    });
    if (r === 'mute') { s.muted = !s.muted; save.save(); ui.toast({ title: s.muted ? 'Notifications coupées' : 'Notifications réactivées', icon: 'info', ms: 2200 }); }
  }

  // ------------------------------------------------------------------ pièces jointes (souvenirs du jeu uniquement)
  async function attach(id: ContactId) {
    const photos = ev().photos.slice().reverse();
    if (!photos.length) { ui.toast({ title: 'Aucun souvenir à envoyer', sub: 'Tes photos souvenirs apparaîtront ici après une sortie ♡', icon: 'info', ms: 2800 }); return; }
    const g = await import('../../events/photo/gallery');
    let chosen: string | null = null;
    const grid = g.buildGallery(photos.slice(0, 24), { onSelect: (p) => { chosen = p.id; (document.querySelector('.modal-backdrop .actions button') as HTMLElement | null)?.click(); } });
    await ui.modal({ title: 'Envoyer un souvenir', body: h('div', h('p.muted', { style: 'font-size:12.5px;margin:0 0 6px' }, 'Seulement les souvenirs du jeu : rien n’est lu sur ton vrai téléphone.'), grid), actions: [{ label: 'Annuler', value: 'no', style: 'secondary' }] });
    if (chosen && alive && view.thread === id) (body.querySelector('.msg-thread') as (HTMLElement & { _submit?: (p?: string) => void }) | null)?._submit?.(chosen);
  }

  renderList();
  return { close };
}
export { legacyUnread };
