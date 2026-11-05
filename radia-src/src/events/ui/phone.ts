/** Le téléphone de Radia : messages, invitations, souvenirs, historique. Tout reste interne au jeu. */
import { dismissNotification } from './notify';
import '../events.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { ACHIEVEMENTS } from '../../data/achievements';
import { EVENTS, eventById } from '../data';
import { ev } from '../api';
import { pendingInvites } from '../manager';
import { abandonCurrent } from '../runner';
import { openInvite, replay, resumeFlow, replayBraceletScene } from '../flow';
import { SECRET_ID } from '../data';
import { emitPhone } from '../bus';
import type { EventDef } from '../types';
import '../tindeur/tindeur.css';
import { phoneApps } from './phoneApps';
import { buildHome, type HomeApp } from './phoneHome';
import { WALLPAPERS, wallpaperUrl, isWallpaper, DEFAULT_WALLPAPER } from './phoneWallpapers';
import { onPhoneChange } from '../bus';
import { messagesBadge } from '../../apps/messages/runtime';
import '../../apps';
import { tindeurLogo } from '../tindeur/icon';
import { hasPending } from '../tindeur/logic';
import { rawUnread } from '../tindeur/swipe/badge';
import { activeIncident, openActiveIncident } from '../incidents/runtime';
import { incidentById } from '../incidents/data';

type Tab = 'home' | 'messages' | 'invites' | 'souvenirs' | 'history' | 'settings';
let open = false;

export function openPhone(tab?: Tab): void {
  if (open) return;
  open = true;
  dismissNotification(); // la bannière d'invitation (au-dessus du téléphone) recouvrirait sa croix de fermeture : l'invitation reste listée ici
  let cur: Tab = tab ?? 'home'; // le téléphone s'ouvre sur son écran d'accueil (fond d'écran) ; une pastille mène directement à l'onglet voulu
  const content = h('div.ph-content');
  const tabs = h('div.ph-tabs');
  const title = h('b', 'Mon téléphone');
  const closeBtn = h('button.icon-btn.ph-x', { 'aria-label': 'Fermer', on: { click: tap(() => closePhone(), { sound: false }) } }, icon('close', 20));
  const homeBtn = h('button.icon-btn.ph-x', { 'aria-label': 'Écran d’accueil du téléphone', on: { click: tap(() => go('home'), { sound: false }) } }, icon('back', 20));
  const go = (t: Tab) => { if (t === 'messages') { openMessagesApp(); return; } cur = t; render(); };
  /** Messages : application plein écran PAR-DESSUS le téléphone (fermer ‹ → retour ici). */
  function openMessagesApp() { void import('../../apps/messages/view').then((m) => m.openMessagesView({ close: () => { if (open && cur === 'home') render(); }, leavePhone: () => closePhone() })); }
  const gear = () => h('button.icon-btn.ph-gear', { 'aria-label': 'Réglages du téléphone', on: { click: tap(() => go('settings'), { sound: false }) } }, icon('settings', 20));
  const topRight = () => h('span.ph-right', gear(), h('span.ph-time', new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })));
  const top = h('div.ph-top', closeBtn, title, topRight());
  const phone = h('div.ph', h('div.ph-notch'), top, content, tabs);
  const back = h('div.ph-back', phone);
  ui.root.append(back);
  audio.play('pop2');

  let stopHome: (() => void) | null = null;
  const offBus = onPhoneChange(() => { if (cur === 'home' && open) render(); }); // les pastilles de l'accueil suivent l'état en direct
  function closePhone() {
    stopHome?.(); offBus();
    back.classList.add('out');
    window.setTimeout(() => back.remove(), 220);
    open = false;
    emitPhone();
  }

  const TABS: [Tab, string, string][] = [['messages', 'Messages', 'chat'], ['invites', 'Invitations', 'mail'], ['souvenirs', 'Souvenirs', 'camera'], ['history', 'Historique', 'album']];
  for (const [k, label, ic] of TABS) {
    const b = h('button.ph-tab', { 'data-tab': k }, icon(ic, 22), h('span', label), h('i.ph-tabdot'));
    b.addEventListener('click', tap(() => go(k), { sound: false }));
    tabs.append(b);
  }

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

  // ---------------------------------------------------------------- écran d'accueil
  const unreadMessages = (): number => messagesBadge();
  const newInvites = (): number => { const st = ev(); return pendingInvites(st).filter((i) => i.state === 'new' && !!eventById(i.eventId)).length + (st.current && eventById(st.current.eventId) ? 1 : 0) + (activeIncident() ? 1 : 0); };
  const launchOver = (from: HTMLElement, fn: () => void) => {
    // l'application s'ouvre PAR-DESSUS le téléphone et grandit depuis son icône ; la fermer ramène à cet écran d'accueil
    const r = from.getBoundingClientRect(); const root = ui.root.getBoundingClientRect();
    ui.root.style.setProperty('--app-ox', `${Math.round(r.left + r.width / 2 - root.left)}px`);
    ui.root.style.setProperty('--app-oy', `${Math.round(r.top + r.height / 2 - root.top)}px`);
    fn();
  };
  function homeApps(): { grid: HomeApp[]; dock: HomeApp[] } {
    const t = save.data.fun.tindeur;
    const registered = phoneApps();
    const reg = (id: string): HomeApp | null => { const a = registered.find((x) => x.id === id); return a ? { id: a.id, name: a.name, icon: a.icon, badge: (a.badge?.() as number | null) ?? null, open: (from) => launchOver(from, () => void a.open()) } : null; };
    const tin: HomeApp | null = t.installed ? { id: 'tindeur', name: 'Tindeur', icon: (n) => tindeurLogo(n), badge: (hasPending(t) || rawUnread() ? Math.max(1, rawUnread() + (t.shown && t.choice === 'none' ? 1 : 0)) : null), open: (from) => launchOver(from, () => { void import('../tindeur/ui').then((m) => m.openTindeur()); }) } : null;
    const msg: HomeApp = { id: 'messages', name: 'Messages', glyph: 'chat', tone: 'linear-gradient(180deg,#7bd88f,#34b25c)', badge: unreadMessages() || null, open: (from) => launchOver(from, openMessagesApp) };
    const dock = [msg, tin, reg('snap'), reg('clips')].filter((a): a is HomeApp => !!a);
    const grid: HomeApp[] = [
      { id: 'souvenirs', name: 'Souvenirs', glyph: 'camera', tone: 'linear-gradient(180deg,#ffc27a,#ff8f5a)', badge: null, open: () => go('souvenirs') },
      { id: 'agenda', name: 'Agenda', glyph: 'mail', tone: 'linear-gradient(180deg,#ff9bbf,#e8558f)', badge: newInvites() || null, open: () => go('invites') },
      { id: 'history', name: 'Historique', glyph: 'album', tone: 'linear-gradient(180deg,#b9a2ff,#7a5cd6)', badge: null, open: () => go('history') },
      { id: 'settings', name: 'Réglages', glyph: 'settings', tone: 'linear-gradient(180deg,#b8c0cc,#7c8794)', badge: null, open: () => go('settings') },
    ];
    return { grid, dock };
  }
  function renderHome() {
    stopHome?.();
    const { grid, dock } = homeApps();
    const wp = isWallpaper(save.data.fun.phone.wallpaper) ? save.data.fun.phone.wallpaper : DEFAULT_WALLPAPER;
    const home = buildHome({ grid, dock, wallpaper: wp, onQuit: () => closePhone() });
    stopHome = home.stop;
    content.append(home.el);
  }

  function renderSettings() {
    title.textContent = 'Réglages';
    top.replaceChildren(homeBtn, title, h('span.ph-time', ''));
    const t = save.data.fun.tindeur;
    const row = h('div.ph-set', tindeurLogo(44), h('div', h('b', 'Tindeur'), h('small', t.installed ? 'Installée sur le téléphone du jeu' : 'Désinstallée')));
    const btn = h(`button.btn.small${t.installed ? '.secondary' : ''}`, t.installed ? 'Désinstaller' : 'Réinstaller');
    btn.addEventListener('click', tap(() => {
      void import('../tindeur/ui').then((m) => {
        if (t.installed) {
          if (!m.attemptUninstall()) {
            // refusé (les deux premiers essais) : l'appli reste, Auguste dit un petit mot
            content.querySelector('.ph-aug-say')?.remove();
            content.append(h('p.ph-aug-say', h('b', 'Auguste : '), '« Pas utile de désinstaller celle d’ici ♡ »'));
            haptic('select');
          } else row.firstElementChild && m.poofIcon(row.firstElementChild as HTMLElement, () => { render(); });
        } else { m.applyInstalled(true); render(); }
      });
    }, { sound: false }));
    row.append(btn);
    const wp = h('div.ph-wp');
    const cur0 = save.data.fun.phone.wallpaper;
    for (const w of WALLPAPERS) {
      const b = h(`button${w.id === cur0 ? '.on' : ''}`, { 'aria-label': `Fond d’écran : ${w.name}`, on: { click: tap(() => { save.data.fun.phone.wallpaper = w.id; save.save(); render(); }, { sound: false }) } }, h('img', { src: wallpaperUrl(w.id), alt: '' }), h('small', w.name));
      wp.append(b);
    }
    content.append(row, h('h4.ph-h', 'Fond d’écran'), wp, h('p.ph-empty', 'Ces réglages ne concernent que le téléphone du jeu : rien n’est lié à ton vrai téléphone ♡'));
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
    stopHome?.(); stopHome = null;
    content.textContent = '';
    const isHome = cur === 'home';
    phone.classList.toggle('home', isHome);
    content.classList.toggle('ph-home-c', isHome);
    top.style.display = isHome ? 'none' : '';
    tabs.style.display = isHome ? 'none' : '';
    if (isHome) { renderHome(); return; }
    for (const t of tabs.children) t.classList.toggle('on', (t as HTMLElement).dataset.tab === cur);
    { // pastilles d'onglets : montrent où se trouve la notification
      const st = ev();
      const inv = pendingInvites(st).some((i) => i.state === 'new' && !!eventById(i.eventId)) || !!(st.current && eventById(st.current.eventId)) || !!activeIncident();
      const msg = st.msgs.some((m) => !m.read) || hasPending(save.data.fun.tindeur);
      tabs.querySelector('[data-tab="invites"] .ph-tabdot')?.classList.toggle('on', inv && cur !== 'invites');
      tabs.querySelector('[data-tab="messages"] .ph-tabdot')?.classList.toggle('on', msg && cur !== 'messages');
    }
    if (cur === 'settings') renderSettings();
    else { top.replaceChildren(homeBtn, title, topRight()); if (cur === 'invites') renderInvites(); else if (cur === 'souvenirs') renderSouvenirs(); else renderHistory(); }
    content.scrollTop = 0;
  }
  render();
  if (tab === 'messages') openMessagesApp(); // arrivée directe (pastille « message ») : on ouvre l'application par-dessus l'accueil
}
