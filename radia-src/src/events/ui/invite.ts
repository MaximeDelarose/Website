/** Feuille d'invitation : message illustré, « J'arrive ♡ » ou « Plus tard » (sans pénalité). */
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio } from '../../core/app';
import { eventById } from '../data';
import { senderFace, senderName } from './people';
import type { EventDef, EventStep, PlaceId } from '../types';

const firstPlace = (d: EventDef): PlaceId => {
  const s = d.steps.find((x): x is Extract<EventStep, { t: 'travel' }> => x.t === 'travel');
  return s?.place ?? 'home';
};

export type InviteChoice = 'accept' | 'later';

/** Ouvre la feuille d'une invitation ; résout le choix de Radia (ou 'later' si fermée). */
export function openInviteSheet(eventId: string, opts: { resume?: boolean } = {}): Promise<InviteChoice> {
  const def = eventById(eventId) as EventDef;
  return new Promise((resolve) => {
    const art = h('canvas.ev-inv-art') as HTMLCanvasElement;
    const gold = !!def.golden;
    const sheet = h(`div.ev-inv${gold ? '.gold' : ''}`,
      h('div.ev-inv-hero', art, gold ? h('div.ev-inv-env', '✉') : null),
      h('div.ev-inv-from', h('img', { src: senderFace(def.sender), alt: '' }), h('div', h('b', def.senderLabel && def.senderLabel.includes('♡') ? def.senderLabel : senderName(def.sender)), h('small', gold ? 'Enveloppe dorée ♡' : def.category === 'family' ? 'Invitation' : def.category === 'career' ? 'Opportunité' : 'Nouvelle invitation'))),
      h('h3', def.title),
      h('div.ev-inv-bubble', def.invite),
      h('div.ev-inv-acts',
        h('button.btn.ev-btn', { on: { click: tap(() => end('accept')) } }, icon('heart', 18), opts.resume ? ' Reprendre ♡' : ' J’arrive ♡'),
        h('button.btn.ev-btn.secondary', { on: { click: tap(() => end('later'), { sound: false }) } }, 'Plus tard')),
      h('small.ev-inv-hint', 'Aucune pénalité : tu retrouveras cette invitation dans ton téléphone.'));
    const back = h('div.ev-inv-back', sheet);
    ui.root.append(back);
    audio.play(gold ? 'rare' : 'pop2');
    void import('../places').then((m) => {
      const d = Math.min(2, window.devicePixelRatio || 1);
      art.width = 360 * d; art.height = 180 * d;
      const g = art.getContext('2d')!;
      g.scale(d, d);
      m.drawPlace(g, firstPlace(def), 360, 180, 0);
    }).catch(() => undefined);
    function end(c: InviteChoice) {
      back.classList.add('out');
      window.setTimeout(() => back.remove(), 220);
      resolve(c);
    }
  });
}
