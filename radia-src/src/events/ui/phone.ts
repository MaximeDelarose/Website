/** Le téléphone de Radia : messages, invitations, souvenirs, historique. Tout reste interne au jeu. */
import '../events.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, save } from '../../core/app';
import { ACHIEVEMENTS } from '../../data/achievements';
import { EVENTS, eventById } from '../data';
import { ev } from '../api';
import { pendingInvites } from '../manager';
import { abandonCurrent } from '../runner';
import { openInvite, replay, resumeFlow, replayVoice, replayBraceletScene } from '../flow';
import { SECRET_ID } from '../data';
import { emitPhone } from '../bus';
import { senderFace, senderName } from './people';
import type { EventDef, Sender } from '../types';
import '../tindeur/tindeur.css';
import { tindeurLogo } from '../tindeur/icon';
import { hasPending } from '../tindeur/logic';
import { activeIncident, openActiveIncident } from '../incidents/runtime';
import { incidentById } from '../incidents/data';

type Tab = 'messages' | 'invites' | 'souvenirs' | 'history' | 'settings';
let open = false;

export function openPhone(tab: Tab = 'messages'): void {
  if (open) return;
  open = true;
  let cur: Tab = tab;
  let thread: Sender | null = null;
  const content = h('div.ph-content');
  const tabs = h('div.ph-tabs');
  const title = h('b', 'Mon téléphone');
  const closeBtn = h('button.icon-btn.ph-x', { 'aria-label': 'Fermer', on: { click: tap(() => closePhone(), { sound: false }) } }, icon('close', 20));
  const backBtn = h('button.icon-btn.ph-x', { 'aria-label': 'Retour', on: { click: tap(() => { thread = null; render(); }, { sound: false }) } }, icon('back', 20));
  const gear = () => h('button.icon-btn.ph-gear', { 'aria-label': 'Réglages du téléphone', on: { click: tap(() => { cur = 'settings'; thread = null; render(); }, { sound: false }) } }, icon('settings', 20));
  const topRight = () => h('span.ph-right', gear(), h('span.ph-time', new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })));
  const top = h('div.ph-top', closeBtn, title, topRight());
  const phone = h('div.ph', h('div.ph-notch'), top, content, tabs);
  const back = h('div.ph-back', phone);
  ui.root.append(back);
  audio.play('pop2');

  function closePhone() {
    back.classList.add('out');
    window.setTimeout(() => back.remove(), 220);
    open = false;
    emitPhone();
  }

  const TABS: [Tab, string, string][] = [['messages', 'Messages', 'chat'], ['invites', 'Invitations', 'mail'], ['souvenirs', 'Souvenirs', 'camera'], ['history', 'Historique', 'album']];
  for (const [k, label, ic] of TABS) {
    const b = h('button.ph-tab', { 'data-tab': k }, icon(ic, 22), h('span', label));
    b.addEventListener('click', tap(() => { cur = k; thread = null; render(); }, { sound: false }));
    tabs.append(b);
  }

  const bubble = (txt: string, mine = false) => h(`div.ph-bub${mine ? '.me' : ''}`, txt);
  const evTitle = (id: string) => eventById(id)?.title ?? 'Événement';

  function inviteCard(runId: string, def: EventDef, state: string): HTMLElement {
    const lbl = state === 'new' ? 'Nouveau' : state === 'later' ? 'Pour plus tard' : state === 'done' ? 'Terminé ♡' : 'Vu';
    const card = h(`div.ph-inv${def.golden ? '.gold' : ''}`,
      h('div.ph-inv-h', icon(def.golden ? 'mail' : 'heart', 16), h('b', def.title), h('small', lbl)),
      h('p', def.invite));
    if (state !== 'done') {
      card.append(h('div.ph-inv-a',
        h('button.btn.small', { on: { click: tap(() => { closePhone(); void openInvite(runId); }) } }, 'Voir l’invitation')));
    }
    return card;
  }

  function appsStrip(): HTMLElement {
    const strip = h('div.ph-apps');
    const t = save.data.fun.tindeur;
    if (t.installed) {
      const dot = hasPending(t) ? h('i.ph-dot', '1') : null;
      const b = h('button.ph-app', { 'aria-label': 'Tindeur' }, tindeurLogo(52), h('span', 'Tindeur'), dot);
      b.addEventListener('click', tap(() => { void import('../tindeur/ui').then((m) => m.openTindeur()); }, { sound: false }));
      strip.append(b);
    }
    return strip;
  }

  function renderSettings() {
    title.textContent = 'Réglages';
    top.replaceChildren(h('button.icon-btn.ph-x', { 'aria-label': 'Retour', on: { click: tap(() => { cur = 'messages'; render(); }, { sound: false }) } }, icon('back', 20)), title, h('span.ph-time', ''));
    const t = save.data.fun.tindeur;
    const row = h('div.ph-set', tindeurLogo(44), h('div', h('b', 'Tindeur'), h('small', t.installed ? 'Installée sur le téléphone du jeu' : 'Désinstallée')));
    const btn = h(`button.btn.small${t.installed ? '.secondary' : ''}`, t.installed ? 'Désinstaller' : 'Réinstaller');
    btn.addEventListener('click', tap(() => {
      void import('../tindeur/ui').then((m) => {
        if (t.installed) { row.firstElementChild && m.poofIcon(row.firstElementChild as HTMLElement, () => { m.applyInstalled(false); render(); }); }
        else { m.applyInstalled(true); render(); }
      });
    }, { sound: false }));
    row.append(btn);
    content.append(row, h('p.ph-empty', 'Ces réglages ne concernent que le téléphone du jeu : rien n’est lié à ton vrai téléphone ♡'));
  }

  function renderMessages() {
    const st = ev();
    if (thread) {
      const s = thread;
      title.textContent = senderName(s);
      top.replaceChildren(backBtn, title, h('span.ph-time', ''));
      const msgs = st.msgs.filter((m) => m.from === s);
      msgs.forEach((m) => { m.read = true; });
      save.save();
      const invs = st.inbox.filter((i) => eventById(i.eventId)?.sender === s).slice(-8);
      const list = h('div.ph-thread');
      if (s === 'auguste' && st.secret.triggered) {
        const done = (st.done[SECRET_ID]?.count ?? 0) > 0;
        const card = h('button.ph-voice', icon('play', 20), h('div', h('b', 'Message vocal de A'), h('small', done ? 'Réécouter ♡' : 'Écouter · une surprise t’attend ♡')));
        card.addEventListener('click', tap(() => { closePhone(); void replayVoice(); }, { sound: false }));
        list.append(card);
      }
      for (const i of invs) { const d = eventById(i.eventId); if (d) list.append(bubble(d.teaser), inviteCard(i.runId, d, i.state)); }
      for (const m of msgs.slice(-12)) {
        if (m.from === 'kid1' && /dessin/i.test(m.text)) {
          // le dessin de la petite : on peut l'ouvrir et l'admirer
          const mini = h('canvas.ph-draw-mini') as HTMLCanvasElement;
          void import('./drawing').then((d) => { const c = d.sailboatCanvas(120); mini.width = c.width; mini.height = c.height; mini.getContext('2d')!.drawImage(c, 0, 0); });
          const card = h('button.ph-draw', mini, h('div', h('b', m.text), h('small', 'Touche pour voir le dessin ♡')));
          card.addEventListener('click', tap(() => { void import('./drawing').then((d) => d.openDrawing()); }, { sound: false }));
          list.append(card);
        } else list.append(bubble(m.text));
      }
      if (!list.children.length) list.append(h('p.ph-empty', 'Aucun message pour l’instant.'));
      content.append(list);
      emitPhone();
      return;
    }
    title.textContent = 'Messages';
    top.replaceChildren(closeBtn, title, topRight());
    const senders: Sender[] = ['auguste', 'kid1', 'kid2', 'kid3', 'agency'];
    const rows = senders.map((s) => {
      const msgs = st.msgs.filter((m) => m.from === s);
      const invs = st.inbox.filter((i) => eventById(i.eventId)?.sender === s);
      const unread = msgs.filter((m) => !m.read).length + invs.filter((i) => i.state === 'new').length;
      const lastInv = invs.length ? eventById(invs[invs.length - 1].eventId)?.teaser : undefined;
      const lastMsg = msgs.length ? msgs[msgs.length - 1].text : undefined;
      const last = lastMsg ?? lastInv ?? (s === 'auguste' ? 'Un petit mot, quand tu veux ♡' : '');
      return { s, unread, last, has: msgs.length + invs.length > 0 || s === 'auguste' };
    }).filter((r) => r.has);
    content.append(appsStrip());
    for (const r of rows) {
      const row = h('button.ph-row', h('img', { src: senderFace(r.s), alt: '' }), h('div', h('b', senderName(r.s)), h('small', r.last)), r.unread ? h('i.ph-dot', String(r.unread)) : null);
      row.addEventListener('click', tap(() => { thread = r.s; render(); }, { sound: false }));
      content.append(row);
    }
  }

  function renderInvites() {
    const st = ev();
    title.textContent = 'Invitations';
    if (st.current) {
      const d = eventById(st.current.eventId);
      if (d) content.append(h('div.ph-inv.cur',
        h('div.ph-inv-h', icon('play', 16), h('b', `En cours : ${d.title}`)),
        h('p', 'Tu peux reprendre là où tu t’étais arrêtée ♡'),
        h('div.ph-inv-a',
          h('button.btn.small', { on: { click: tap(() => { closePhone(); void resumeFlow(); }) } }, 'Reprendre'),
          h('button.btn.small.secondary', { on: { click: tap(async () => { if (await ui.confirm('Abandonner cette activité ?', 'Aucune récompense ne sera perdue ni versée.', 'Abandonner', 'Garder')) { abandonCurrent(); emitPhone(); render(); } }) } }, 'Abandonner'))));
    }
    const inc = activeIncident();
    const incDef = inc && incidentById(inc.id);
    if (incDef) content.append(h('div.ph-inv.cur',
      h('div.ph-inv-h', icon('home', 16), h('b', `Château : ${incDef.title}`)),
      h('p', incDef.notif),
      h('div.ph-inv-a', h('button.btn.small', { on: { click: tap(() => { closePhone(); openActiveIncident(); }) } }, 'Voir'))));
    const pend = pendingInvites(st);
    if (!pend.length && !st.current && !incDef) content.append(h('p.ph-empty', 'Aucune invitation pour le moment. Continue de jouer : une surprise peut arriver à tout moment ♡'));
    for (const i of pend.slice().reverse()) { const d = eventById(i.eventId); if (d) content.append(inviteCard(i.runId, d, i.state)); }
    const replayable = EVENTS.filter((d) => d.repeatable && (st.done[d.id]?.count ?? 0) > 0);
    if (replayable.length) {
      content.append(h('h4.ph-h', 'À rejouer'));
      for (const d of replayable) {
        const n = st.done[d.id].count;
        content.append(h('div.ph-rep', h('div', h('b', d.title), h('small', `Terminé ${n} fois`)),
          h('button.btn.small.secondary', { on: { click: tap(() => { closePhone(); void replay(d.id); }) } }, 'Rejouer')));
      }
    }
  }

  function renderSouvenirs() {
    title.textContent = 'Souvenirs';
    const st = ev();
    if ((st.done[SECRET_ID]?.count ?? 0) > 0) {
      const slot = h('div.ph-promise');
      content.append(slot);
      const photo = st.photos.slice().reverse().find((p) => p.eventId === SECRET_ID);
      void import('./promiseCard').then((m) => slot.append(m.buildPromiseCard({ photo, onReplay: () => { closePhone(); void replayBraceletScene(); } }))).catch(() => undefined);
    }
    if (st.counters['drawing.seen']) {
      const card = h('button.ph-draw', h('canvas.ph-draw-mini'), h('div', h('b', 'Le voilier jaune'), h('small', 'Un dessin à garder ♡')));
      const mini = card.querySelector('canvas') as HTMLCanvasElement;
      void import('./drawing').then((d) => { const c = d.sailboatCanvas(120); mini.width = c.width; mini.height = c.height; mini.getContext('2d')!.drawImage(c, 0, 0); });
      card.addEventListener('click', tap(() => { void import('./drawing').then((d) => d.openDrawing()); }, { sound: false }));
      content.append(card);
    }
    if (!st.photos.length) { if (!content.children.length) content.append(h('p.ph-empty', 'Tes photos souvenirs apparaîtront ici après chaque sortie ♡')); return; }
    const slot = h('div.ph-gallery');
    content.append(h('small.ph-count', `${st.photos.length} photo${st.photos.length > 1 ? 's' : ''}`), slot);
    void import('../photo/gallery').then((m) => { slot.append(m.buildGallery(st.photos.slice().reverse(), { onSelect: (p) => m.openPhotoViewer(p) })); }).catch(() => slot.append(h('p.ph-empty', 'Galerie indisponible.')));
  }

  function renderHistory() {
    title.textContent = 'Historique';
    const st = ev();
    const ids = Object.keys(st.done);
    if (!ids.length) { content.append(h('p.ph-empty', 'Rien pour l’instant. Ta première sortie t’attend peut-être déjà ♡')); }
    for (const id of ids.sort((a, b) => st.done[b].last - st.done[a].last)) {
      const d = st.done[id];
      content.append(h('div.ph-rep', h('div', h('b', evTitle(id)), h('small', `${d.count} fois · meilleur score ${d.best} %`))));
    }
    const ach = ACHIEVEMENTS.filter((a) => a.id.startsWith('ev_'));
    if (ach.length) {
      content.append(h('h4.ph-h', 'Succès des invitations'));
      for (const a of ach) {
        const got = a.id in save.data.achievements;
        content.append(h(`div.ph-rep${got ? '' : '.dim'}`, h('div', h('b', got ? a.name : '???'), h('small', got ? a.desc : 'À découvrir')), got ? icon('check', 18) : null));
      }
    }
  }

  function render() {
    content.textContent = '';
    for (const t of tabs.children) t.classList.toggle('on', (t as HTMLElement).dataset.tab === cur);
    if (cur === 'messages') renderMessages();
    else if (cur === 'settings') renderSettings();
    else { top.replaceChildren(closeBtn, title, topRight()); if (cur === 'invites') renderInvites(); else if (cur === 'souvenirs') renderSouvenirs(); else renderHistory(); }
    content.scrollTop = 0;
  }
  render();
}
