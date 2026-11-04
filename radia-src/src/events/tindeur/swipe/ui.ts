/**
 * Tindeur jouable : pile de cartes à glisser (doigt ou souris), match, messages à embranchements.
 * Appli IMAGINAIRE du jeu RADIA : aucune connexion, aucun accès à l'appareil, personnages fictifs adultes.
 */
import './swipe.css';
import '../tindeur.css';
import '../../events.css';
import { h, tap } from '../../../ui/dom';
import { ui } from '../../../ui/ui';
import { audio, reducedFx } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { canvasUrl } from '../../../game/art/kit';
import { medallionCanvas } from '../../../game/art/characters';
import { sparkleBurst } from '../../../ui/fx/sparkle';
import { emitPhone, registerBusy } from '../../bus';
import { tindeurLogo } from '../icon';
import { avatarUrl, portraitUrl } from './art';
import { profileById } from './data';
import {
  choicesOf, choose, deferQueue, deliver, endingsFound, endingsTotal, ensureDeck, like, lastLine, markRead, nextHeartIn, pass,
  peekIds, refillBank, removeMatch, resumeConvo, stopConvo, unreadCount,
} from './state';
import { onSwipeEvent, persist, swipe } from './runtime';
import type { Choice, Profile } from './types';


let layer: HTMLElement | null = null;
registerBusy(() => !!layer);

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const hhmm = (t: number) => new Date(t || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const radiaFace = () => canvasUrl('sw:radia', () => medallionCanvas('radia', { expr: 'smile' }, 96));
const THRESH = 96;

export interface OpenOpts { chat?: string; tab?: 'deck' | 'matches' }

export function openSwipeApp(o: OpenOpts = {}): void {
  if (layer) { if (o.chat) layer.dispatchEvent(new CustomEvent('sw-open-chat', { detail: o.chat })); return; }
  const s = swipe();
  const now = () => Date.now();
  refillBank(s, now());
  ensureDeck(s);

  const root = h('div.tdr-layer.sw-app');
  layer = root;
  ui.root.append(root);
  const timers: number[] = [];
  let tab: 'deck' | 'matches' = o.tab ?? 'deck';
  let chatPid: string | null = null;
  let busy = false;
  let closed = false;

  // ---------------------------------------------------------------- cadre
  const heartsPill = h('span.sw-hearts');
  const head = h('div.sw-head',
    h('button.icon-btn.tdr-x', { 'aria-label': 'Fermer', on: { click: tap(() => close(), { sound: false }) } }, '×'),
    h('div.tdr-brand', tindeurLogo(30, false), h('b', 'Tindeur')), heartsPill);
  const main = h('div.sw-main');
  const navDeck = h('button.sw-tab', { 'data-tab': 'deck', on: { click: tap(() => setTab('deck'), { sound: false }) } }, h('span.sw-ti', '♥'), h('span', 'Découvrir'));
  const navMsg = h('button.sw-tab', { 'data-tab': 'matches', on: { click: tap(() => setTab('matches'), { sound: false }) } }, h('span.sw-ti', '✉'), h('span', 'Messages'), h('i.sw-badge'));
  const nav = h('div.sw-nav', navDeck, navMsg);
  root.append(head, main, nav);

  const close = () => {
    if (closed) return;
    closed = true;
    if (chatPid) leaveChat(true);
    timers.forEach((t) => window.clearInterval(t));
    off();
    root.classList.add('out');
    window.setTimeout(() => root.remove(), 260);
    layer = null;
    persist();
  };
  const addTimer = (id: number) => { timers.push(id); return id; };

  function toast(text: string, onTap?: () => void): void {
    root.querySelector('.sw-toast')?.remove();
    const t = h('button.sw-toast', { on: { click: () => { t.remove(); onTap?.(); } } }, h('span', '♥'), h('span', text));
    root.append(t);
    window.setTimeout(() => t.classList.add('out'), 3600);
    window.setTimeout(() => t.remove(), 3900);
  }

  function refreshChrome(): void {
    refillBank(s, now());
    const wait1 = nextHeartIn(s, now());
    heartsPill.replaceChildren(h('b', '♥'), h('span', String(s.bank.n)));
    if (wait1) heartsPill.append(h('small', `+1 dans ${Math.floor(wait1 / 60)}:${String(wait1 % 60).padStart(2, '0')}`));
    heartsPill.classList.toggle('empty', s.bank.n <= 0);
    const u = unreadCount(s);
    const bd = navMsg.querySelector('.sw-badge') as HTMLElement;
    bd.textContent = u ? String(u) : '';
    bd.classList.toggle('on', u > 0);
    navDeck.classList.toggle('on', tab === 'deck');
    navMsg.classList.toggle('on', tab === 'matches');
    const hint = root.querySelector('.sw-note');
    if (hint && tab === 'deck') hint.textContent = s.bank.n > 0 ? '' : `Plus de cœur pour l’instant : il revient dans ${wait1} s. Tu peux passer ou discuter ♡`;
  }
  addTimer(window.setInterval(refreshChrome, 1000));

  function setTab(t: 'deck' | 'matches'): void {
    if (chatPid) return;
    tab = t; busy = false;
    audio.play('pop1');
    render();
  }
  function render(): void {
    main.replaceChildren();
    if (tab === 'deck') renderDeck(); else renderMatches();
    refreshChrome();
  }

  // ---------------------------------------------------------------- pile de cartes
  let top: HTMLElement | null = null;

  function makeCard(pid: string, depth: number): HTMLElement {
    const p = profileById(pid)!;
    return h(`div.sw-card.d${depth}`, { 'data-pid': pid },
      h('img.sw-pic', { src: portraitUrl(pid), alt: `Portrait illustré de ${p.name}`, draggable: false }),
      h('div.sw-stamp.like', 'LIKE'), h('div.sw-stamp.nope', 'PASSE'),
      h('div.sw-info',
        h('div.sw-name', h('b', p.name), h('span.sw-age', String(p.age)), h('small', `à ${p.km} km`)),
        h('p.sw-bio', `« ${p.bio} »`),
        h('div.sw-tags', ...p.tags.map((t) => h('i', t)))));
  }

  function renderDeck(): void {
    const stack = h('div.sw-deck');
    const ids = peekIds(s, 3);
    if (!ids.length) {
      stack.append(h('div.sw-empty', h('div.sw-empty-ico', tindeurLogo(64)), h('b', 'Tu as fait le tour !'), h('p', 'Plus personne autour de toi pour l’instant. De nouveaux profils arrivent bientôt ♡'), h('button.btn.small', { on: { click: tap(() => setTab('matches')) } }, 'Voir mes messages')));
    } else {
      for (let i = ids.length - 1; i >= 0; i--) stack.append(makeCard(ids[i], i));
      top = stack.lastElementChild as HTMLElement;
      bindGestures(top);
    }
    const actions = h('div.sw-actions',
      h('button.sw-act.nope', { 'aria-label': 'Passer', on: { click: () => void fling('left') } }, h('span', '✕')),
      h('button.sw-act.like', { 'aria-label': 'Liker', on: { click: () => void fling('right') } }, h('span', '♥')));
    const note = h('p.sw-note', s.stats.passes + s.stats.likes === 0 ? 'Glisse à droite pour aimer, à gauche pour passer.' : '');
    main.append(stack, actions, note);
  }

  /** Glisser-déposer : pointer events (doigt, stylet, souris), rotation légère, rebond. */
  function bindGestures(card: HTMLElement): void {
    let id = -1, sx = 0, sy = 0, dx = 0, t0 = 0, crossed = false;
    const reduced = reducedFx();
    card.addEventListener('pointerdown', (e) => {
      if (busy || id !== -1) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now(); crossed = false;
      try { card.setPointerCapture(id); } catch { /* ignoré */ }
      card.style.transition = 'none';
      card.classList.add('drag');
    });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - sx;
      const dy = (e.clientY - sy) * 0.3;
      const rot = reduced ? 0 : Math.max(-16, Math.min(16, dx / 14));
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      stamps(card, dx);
      const over = Math.abs(dx) > THRESH;
      if (over && !crossed) { crossed = true; haptic('select'); } else if (!over) crossed = false;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      card.classList.remove('drag');
      const v = dx / Math.max(1, performance.now() - t0); // px/ms
      if (Math.abs(dx) > THRESH || (Math.abs(v) > 0.55 && Math.abs(dx) > 40)) void fling(dx > 0 ? 'right' : 'left', dx);
      else back(card);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('lostpointercapture', () => { if (id !== -1) { id = -1; card.classList.remove('drag'); back(card); } });
    card.tabIndex = 0;
    card.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') void fling('right'); else if (e.key === 'ArrowLeft') void fling('left'); });
  }
  const stamps = (card: HTMLElement, dx: number) => {
    const k = Math.min(1, Math.abs(dx) / THRESH);
    (card.querySelector('.sw-stamp.like') as HTMLElement).style.opacity = dx > 0 ? String(k) : '0';
    (card.querySelector('.sw-stamp.nope') as HTMLElement).style.opacity = dx < 0 ? String(k) : '0';
  };
  function back(card: HTMLElement): void {
    card.style.transition = reducedFx() ? 'transform .2s ease' : 'transform .5s cubic-bezier(.34,1.56,.64,1)';
    card.style.transform = '';
    stamps(card, 0);
  }

  /** Envoie la carte du dessus à gauche (passer) ou à droite (liker), puis enchaîne. */
  async function fling(dir: 'left' | 'right', from = 0): Promise<void> {
    const card = top;
    if (busy || !card || tab !== 'deck' || !card.isConnected) return;
    if (dir === 'right') {
      refillBank(s, now());
      if (s.bank.n <= 0) {
        // plus de cœur : la carte revient, aucune pénalité
        card.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        card.style.transform = '';
        stamps(card, 0);
        haptic('error'); audio.play('pop5', 0.9);
        toast(`Petite pause pour tes cœurs : un revient dans ${nextHeartIn(s, now())} s ♡`);
        return;
      }
    }
    busy = true;
    const reduced = reducedFx();
    const sign = dir === 'right' ? 1 : -1;
    const startX = from || 0;
    const s0 = card.querySelector(`.sw-stamp.${dir === 'right' ? 'like' : 'nope'}`) as HTMLElement;
    s0.style.opacity = '1';
    card.style.transition = reduced ? 'opacity .25s ease' : 'transform .34s cubic-bezier(.3,.6,.4,1), opacity .34s ease';
    if (!startX) void card.offsetWidth;
    if (reduced) card.style.opacity = '0';
    else { card.style.transform = `translate(${sign * 520}px, ${-20}px) rotate(${sign * 24}deg)`; card.style.opacity = '0'; }
    haptic('drop');
    audio.play(dir === 'right' ? 'heart' : 'whoosh');
    const pid = card.dataset.pid!;
    const res = dir === 'right' ? like(s, now(), Math.random) : null;
    if (dir === 'left') pass(s);
    persist();
    await wait(reduced ? 240 : 320);
    card.remove();
    // la carte suivante monte d'un cran
    const stack = main.querySelector('.sw-deck') as HTMLElement | null;
    if (stack) {
      const cards = [...stack.querySelectorAll<HTMLElement>('.sw-card')];
      cards.forEach((c, i) => { const d = cards.length - 1 - i; c.className = `sw-card d${d}`; });
      const ids = peekIds(s, 3);
      if (cards.length < ids.length && ids[cards.length]) stack.prepend(makeCard(ids[cards.length], cards.length));
      const last = stack.lastElementChild as HTMLElement | null;
      if (last && ids.length) { top = last; bindGestures(last); } else { top = null; render(); }
    }
    busy = false;
    refreshChrome();
    const hint = main.querySelector('.sw-note'); if (hint && s.bank.n > 0) hint.textContent = '';
    if (res?.match) await celebrate(pid);
  }

  // ---------------------------------------------------------------- match
  async function celebrate(pid: string): Promise<void> {
    const p = profileById(pid)!;
    busy = true;
    haptic('reward'); audio.play('popRare'); window.setTimeout(() => audio.play('sparkle'), 180);
    const ov = h('div.sw-match',
      h('div.sw-mhearts', ...Array.from({ length: 10 }, (_, i) => h('i', { style: `left:${6 + i * 9}%;animation-delay:${i * 160}ms` }, '♥'))),
      h('h2.sw-mtitle', 'C’est un match !'),
      h('div.sw-pair', h('img.sw-av.l', { src: radiaFace(), alt: '' }), h('span.sw-mh', '♥'), h('img.sw-av.r', { src: avatarUrl(pid, 120), alt: `${p.name}` })),
      h('p.sw-msub', `Toi et ${p.name} vous vous êtes plu.`),
      h('button.btn.sw-mgo', { on: { click: tap(() => { ov.remove(); busy = false; openChat(pid); }) } }, `Écrire à ${p.name}`),
      h('button.btn.secondary.sw-mkeep', { on: { click: tap(() => { ov.remove(); busy = false; toast(`${p.name} t’a envoyé un message`, () => openChat(pid)); refreshChrome(); }) } }, 'Continuer à swiper'));
    root.append(ov);
    const r = ov.querySelector('.sw-pair')!.getBoundingClientRect();
    window.setTimeout(() => { sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: 'epic', count: 22 }); }, 260);
    window.setTimeout(() => { if (ov.isConnected) sparkleBurst(r.left + r.width / 2, r.top + 10, { rarity: 'rare', count: 12 }); }, 700);
  }

  // ---------------------------------------------------------------- liste des messages
  function renderMatches(): void {
    const wrap = h('div.sw-list');
    const rows = s.matches.map((pid) => ({ pid, c: s.convos[pid], p: profileById(pid) })).filter((r) => r.c && r.p);
    rows.sort((a, b) => Number(b.c!.unread) - Number(a.c!.unread) || (b.c!.log[b.c!.log.length - 1]?.t ?? 0) - (a.c!.log[a.c!.log.length - 1]?.t ?? 0));
    if (!rows.length) wrap.append(h('div.sw-empty', h('div.sw-empty-ico', tindeurLogo(64)), h('b', 'Aucun match pour l’instant'), h('p', 'Glisse à droite sur les profils qui te plaisent : quand c’est réciproque, ils t’écrivent ♡'), h('button.btn.small', { on: { click: tap(() => setTab('deck')) } }, 'Découvrir')));
    for (const { pid, c, p } of rows) {
      const chip = c!.unread ? h('i.sw-chip.new', 'Nouveau') : c!.status === 'ended' ? h('i.sw-chip', 'Terminé') : c!.status === 'stopped' ? h('i.sw-chip', 'En pause') : null;
      wrap.append(h(`button.sw-row${c!.unread ? '.unread' : ''}`, { on: { click: tap(() => openChat(pid), { sound: false }) } },
        h('img.sw-rav', { src: avatarUrl(pid), alt: '' }),
        h('div.sw-rtx', h('b', `${p!.name}, ${p!.age}`), h('small', lastLine(s, pid))), chip));
    }
    if (rows.length) wrap.append(h('p.sw-fine', `Histoires découvertes : ${endingsFound(s)} fin${endingsFound(s) > 1 ? 's' : ''} sur ${endingsTotal()} ♡`));
    main.append(wrap);
  }

  // ---------------------------------------------------------------- chat
  let chatEl: HTMLElement | null = null;
  let msgs!: HTMLElement; let bar!: HTMLElement;
  const offOpen = (e: Event) => openChat((e as CustomEvent<string>).detail);
  root.addEventListener('sw-open-chat', offOpen);

  const scrollDown = () => { msgs.scrollTo({ top: msgs.scrollHeight, behavior: reducedFx() ? 'auto' : 'smooth' }); };
  const bubble = (text: string, mine: boolean) => { const b = h(`div.sw-b${mine ? '.me' : ''}`, text); msgs.append(b); scrollDown(); return b; };
  const stamp = (t: number, mine: boolean) => { msgs.append(h(`div.sw-time${mine ? '.me' : ''}`, hhmm(t))); };
  const typing = () => { const t = h('div.sw-b.typing', h('i'), h('i'), h('i')); msgs.append(t); scrollDown(); return t; };

  function openChat(pid: string): void {
    const p = profileById(pid), c = s.convos[pid];
    if (!p || !c) return;
    if (chatPid) leaveChat(true);
    chatPid = pid;
    markRead(s, pid); persist(); refreshChrome();
    msgs = h('div.sw-msgs'); bar = h('div.sw-bar');
    const menu = h('div.sw-menu.hide');
    const menuBtn = h('button.icon-btn.sw-more', { 'aria-label': 'Options de la conversation', on: { click: () => { buildMenu(); menu.classList.toggle('hide'); } } }, '⋯');
    const buildMenu = () => {
      const cc = s.convos[pid]; menu.replaceChildren();
      if (!cc) return;
      if (cc.status === 'active') menu.append(h('button', { on: { click: () => { menu.classList.add('hide'); doStop(); } } }, 'Arrêter la conversation'));
      if (cc.status === 'stopped') menu.append(h('button', { on: { click: () => { menu.classList.add('hide'); doResume(); } } }, 'Reprendre la conversation'));
      menu.append(h('button.danger', { on: { click: () => { menu.classList.add('hide'); doDelete(); } } }, 'Supprimer le match'));
    };
    chatEl = h('div.sw-chat',
      h('div.sw-chead', h('button.icon-btn.tdr-x', { 'aria-label': 'Retour', on: { click: tap(() => { leaveChat(false); }, { sound: false }) } }, '‹'),
        h('img.sw-cav', { src: avatarUrl(pid), alt: '' }), h('div.sw-cname', h('b', `${p.name}, ${p.age}`), h('small', `à ${p.km} km`)), menuBtn, menu),
      msgs, bar);
    root.append(chatEl);
    audio.play('pop2');
    void replay(pid);
  }

  function leaveChat(silent: boolean): void {
    const pid = chatPid;
    if (!pid) return;
    chatPid = null;
    deferQueue(s, pid); // s'il « écrivait » encore : la réponse arrivera plus tard, pendant que Radia joue
    persist();
    chatEl?.remove(); chatEl = null;
    if (!silent) { audio.play('pop1'); render(); }
  }

  /** Redessine l'historique, puis la suite (réponse en attente, choix, ou fin de l'histoire). */
  async function replay(pid: string): Promise<void> {
    const p = profileById(pid)!;
    const c = s.convos[pid];
    msgs.replaceChildren();
    msgs.append(h('div.sw-intro', h('img', { src: avatarUrl(pid, 120), alt: '' }), h('b', `Vous avez matché avec ${p.name}`), h('small', 'Dans Tindeur, appli imaginaire du jeu : tout reste ici.')));
    for (const m of c.log) {
      const n = p.nodes.find((x) => x.id === m.n);
      if (!n) continue;
      if (m.k === 'in') { n.say.forEach((t) => bubble(t, false)); stamp(m.t, false); } else { bubble(n.ch[m.c ?? 0].t, true); stamp(m.t, true); }
    }
    msgs.scrollTop = msgs.scrollHeight;
    await continueChat(pid);
  }

  async function continueChat(pid: string): Promise<void> {
    const p = profileById(pid)!;
    const c = s.convos[pid];
    if (!c || chatPid !== pid) return;
    if (c.queue) { c.due = 0; await theyReply(pid); return; }
    showBar(pid, p);
  }

  /** « … est en train d'écrire » puis ses bulles, l'une après l'autre. */
  async function theyReply(pid: string): Promise<void> {
    const p = profileById(pid)!;
    bar.replaceChildren(h('p.sw-wait', `${p.name} écrit…`));
    const t = typing();
    const nextNode = p.nodes.find((x) => x.id === s.convos[pid].queue);
    await wait(reducedFx() ? 500 : 900 + Math.min(1200, (nextNode?.say[0].length ?? 20) * 14));
    if (chatPid !== pid || closed) { t.remove(); return; }
    t.remove();
    const node = deliver(s, pid, now(), false);
    if (!node) { showBar(pid, p); return; }
    persist();
    const at = now();
    for (let i = 0; i < node.say.length; i++) {
      if (i > 0) { const tt = typing(); await wait(reducedFx() ? 300 : 700); tt.remove(); if (chatPid !== pid || closed) return; }
      bubble(node.say[i], false); audio.play('pop4', 1.1);
    }
    stamp(at, false);
    haptic('select');
    showBar(pid, p);
  }

  function showBar(pid: string, p: Profile): void {
    showBar2(pid, p);
    // la zone du bas change de hauteur : on recale la fin de la conversation au-dessus
    window.requestAnimationFrame(() => { if (msgs.isConnected) msgs.scrollTop = msgs.scrollHeight; });
  }
  function showBar2(pid: string, p: Profile): void {
    const c = s.convos[pid];
    bar.replaceChildren();
    if (!c) return;
    if (c.status === 'ended') {
      const node = p.nodes.find((x) => x.id === c.end);
      const total = p.nodes.filter((x) => x.end).length;
      const found = (s.endings[pid] ?? []).length;
      bar.append(h('div.sw-end', h('div.sw-end-h', h('span', '♥'), h('b', node?.end?.title ?? 'Fin de l’histoire')),
        h('p', node?.end?.note ?? ''), h('small', `Fin ${found} sur ${total} découvertes avec ${p.name}`),
        h('div.sw-end-a', h('button.btn.small', { on: { click: tap(() => leaveChat(false)) } }, 'Garder ce match'), h('button.btn.small.secondary', { on: { click: () => doDelete() } }, 'Supprimer le match'))));
      return;
    }
    if (c.status === 'stopped') {
      bar.append(h('div.sw-end', h('p', 'Conversation en pause. Tu peux la reprendre quand tu veux, ou la laisser comme ça ♡'), h('div.sw-end-a', h('button.btn.small', { on: { click: tap(() => doResume()) } }, 'Reprendre'), h('button.btn.small.secondary', { on: { click: () => doDelete() } }, 'Supprimer le match'))));
      return;
    }
    const chs = choicesOf(s, pid);
    bar.append(h('p.sw-pick', 'Ta réponse :'), ...chs.map((ch, i) => choiceBtn(pid, ch, i)));
  }
  function choiceBtn(pid: string, ch: Choice, i: number): HTMLElement {
    return h(`button.sw-ch${ch.ask ? '.ask' : ''}`, { on: { click: () => void pick(pid, i) } }, ch.ask ? h('em', '?') : null, h('span', ch.t));
  }
  async function pick(pid: string, i: number): Promise<void> {
    if (chatPid !== pid) return;
    const ch = choicesOf(s, pid)[i];
    if (!ch || !choose(s, pid, i, now())) return;
    persist();
    audio.play('pop3'); haptic('select');
    bar.replaceChildren();
    bubble(ch.t, true); stamp(now(), true);
    await theyReply(pid);
  }

  function doStop(): void {
    const pid = chatPid; if (!pid) return;
    stopConvo(s, pid); persist();
    const p = profileById(pid)!;
    audio.play('pop5');
    showBar(pid, p);
  }
  function doResume(): void {
    const pid = chatPid; if (!pid) return;
    resumeConvo(s, pid); persist();
    audio.play('pop2');
    void replay(pid);
  }
  /** Confirmation intégrée à l'appli (la fenêtre de confirmation du jeu passerait derrière ce calque). */
  function doDelete(): void {
    const pid = chatPid; if (!pid) return;
    const p = profileById(pid)!;
    bar.replaceChildren(h('div.sw-end', h('div.sw-end-h', h('span', '♥'), h('b', 'Supprimer le match ?')),
      h('p', `${p.name} disparaîtra de tes messages. Il pourra réapparaître plus tard dans les profils.`),
      h('div.sw-end-a', h('button.btn.small.secondary', { on: { click: tap(() => { void replayBar(pid); }) } }, 'Garder'), h('button.btn.small', { on: { click: tap(() => confirmDelete(pid)) } }, 'Supprimer'))));
    bar.scrollTop = 0;
  }
  const replayBar = async (pid: string) => { if (chatPid === pid) await continueChat(pid); };
  function confirmDelete(pid: string): void {
    chatPid = null; chatEl?.remove(); chatEl = null;
    removeMatch(s, pid); persist();
    audio.play('whoosh');
    render();
  }

  // un match répond pendant que Radia est dans l'appli : petite notification interne
  const off = onSwipeEvent((e) => {
    if (closed) return;
    const p = profileById(e.pid);
    if (!p) return;
    if (chatPid === e.pid) { markRead(s, e.pid); void replay(e.pid); return; }
    audio.play('pop2'); haptic('select');
    toast(`${p.name} t’a envoyé un message`, () => openChat(e.pid));
    if (tab === 'matches' && !chatPid) render(); else refreshChrome();
  });

  // ---------------------------------------------------------------- départ
  render();
  audio.play('pop2');
  if (o.chat) window.setTimeout(() => openChat(o.chat!), 60);
  emitPhone();
}
