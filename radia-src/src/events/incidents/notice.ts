/** Notification générique (même habillage que les invitations : .ev-notif). Une seule à la fois, partagée avec Tindeur. */
import '../events.css';
import './incidents.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, reducedFx } from '../../core/app';
import { registerBusy } from '../bus';

let current: HTMLElement | null = null;
registerBusy(() => !!current);
export const noticeVisible = (): boolean => !!current;

const DROP = '<path d="M12 3.2c3.4 4.4 6 7.4 6 10.6a6 6 0 01-12 0c0-3.2 2.6-6.2 6-10.6z" fill="currentColor"/>';
const FLAME = '<path d="M12 21c-4.2 0-7-2.8-7-6.4 0-2.6 1.6-4.4 3-6 .5 1.6 1.2 2.4 2.2 2.8C10 8.6 11 5.6 13.6 3c.4 3 3.8 5.2 4.9 8.4.9 2.6.1 5.4-1.8 7.2A7.2 7.2 0 0112 21z" fill="currentColor"/>';
/** Icône d'incident : dessins maison pour la goutte et la flamme-cœur, sinon la bibliothèque. */
export function noticeIcon(name: string, size = 20): SVGElement | HTMLElement {
  if (name === 'drop' || name === 'tindeur') {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size));
    s.innerHTML = name === 'drop' ? DROP : FLAME;
    return s;
  }
  return icon(name, size);
}

export interface NoticeAction { label: string; secondary?: boolean; run: () => void }
export interface NoticeOpts {
  icon: string; title: string; text: string; actions: NoticeAction[];
  /** Disparaît seule après ce délai (ms) puis appelle `onExpire`. */
  ttl?: number; onExpire?: () => void; variant?: string;
}
export interface NoticeHandle { setText(t: string): void; setActions(a: NoticeAction[]): void; close(): void }

export function showNotice(o: NoticeOpts): NoticeHandle | null {
  if (current) return null;
  const tx = h('div.ev-notif-tx', h('b', o.title), h('span', o.text));
  const acts = h('div.ev-notif-acts');
  const el = h(`div.ev-notif.inc-notif${o.variant ? '.' + o.variant : ''}`, { role: 'status' }, h('div.ev-notif-ico', noticeIcon(o.icon)), tx, acts);
  let timer = 0;
  let closed = false;
  const close = (cb?: () => void) => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    if (current === el) current = null;
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 260);
    cb?.();
  };
  const setActions = (list: NoticeAction[]) => {
    acts.replaceChildren(...list.map((a) => h(`button.btn.small${a.secondary ? '.secondary' : ''}`, { on: { click: tap(() => close(a.run), { sound: false }) } }, a.label)));
  };
  setActions(o.actions);
  current = el;
  ui.root.append(el);
  audio.play('pop2');
  window.setTimeout(() => audio.play('sparkle'), 160);
  if (reducedFx()) el.classList.add('calm');
  const arm = () => { if (o.ttl) { window.clearTimeout(timer); timer = window.setTimeout(() => close(o.onExpire), o.ttl); } };
  arm();
  return {
    setText: (t) => { const s = tx.querySelector('span'); if (s) { s.textContent = t; s.classList.remove('pop'); void (s as HTMLElement).offsetWidth; s.classList.add('pop'); } arm(); },
    setActions: (a) => { setActions(a); arm(); },
    close: () => close(),
  };
}
