/** Notification de message : bulle qui rebondit, petit son doux, « Voir l'invitation » / « Plus tard ». Un seul à la fois. */
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, reducedFx } from '../../core/app';
import { senderFace, senderName } from './people';
import type { EventDef } from '../types';

let current: HTMLElement | null = null;
export const notificationVisible = (): boolean => !!current;
let dismissCurrent: (() => void) | null = null;
/** Retire la bannière affichée (comme « Plus tard » : l'invitation reste dans le téléphone). Utilisé à l'ouverture du téléphone, dont elle recouvrirait l'en-tête. */
export function dismissNotification(): void { dismissCurrent?.(); }

export interface NotifyOpts { kind: 'invite' | 'resume'; onOpen: () => void; onLater: () => void }

export function showNotification(def: EventDef, o: NotifyOpts): void {
  if (current) return;
  const gold = !!def.golden;
  const label = o.kind === 'resume' ? 'Activité en cours' : gold ? 'Enveloppe dorée ♡' : def.category === 'family' ? 'Message' : 'Nouvelle invitation';
  const el = h(`div.ev-notif${gold ? '.gold' : ''}`,
    h('div.ev-notif-ico', icon(gold ? 'mail' : 'phone', 20)),
    h('img.ev-notif-face', { src: senderFace(def.sender), alt: '' }),
    h('div.ev-notif-tx', h('b', `${def.senderLabel && def.senderLabel.includes('♡') ? def.senderLabel : senderName(def.sender)} — ${label}`), h('span', o.kind === 'resume' ? `« ${def.title} » t’attend.` : `« ${def.teaser} »`)),
    h('div.ev-notif-acts',
      h('button.btn.small', { on: { click: tap(() => done(o.onOpen), { sound: false }) } }, o.kind === 'resume' ? 'Reprendre' : 'Voir l’invitation'),
      h('button.btn.small.secondary', { on: { click: tap(() => done(o.onLater), { sound: false }) } }, 'Plus tard')));
  current = el;
  dismissCurrent = () => done(o.onLater);
  ui.root.append(el);
  audio.play(gold ? 'rare' : 'pop2');
  window.setTimeout(() => audio.play('sparkle'), 160);
  if (reducedFx()) el.classList.add('calm');
  // ignorée : elle reste dans le téléphone (jamais perdue)
  const t = window.setTimeout(() => done(o.onLater), 14_000);
  function done(cb: () => void) {
    if (current !== el) return;
    window.clearTimeout(t);
    current = null; dismissCurrent = null;
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 260);
    cb();
  }
}
