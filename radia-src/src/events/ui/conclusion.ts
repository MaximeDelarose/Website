/** Conclusion d'un événement : souvenir, récompenses (jamais en double), « Reprendre ma partie ». */
import { h, tap } from '../../ui/dom';
import { audio } from '../../core/app';
import { fmt } from '../../core/wallet';
import { resIconUrl } from '../../game/art/world/resources';
import { diamondUrl } from '../../ui/screens/shop';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import type { ClothId, FurnitureId } from '../../data/world/ids';
import type { EventDef, PhotoRec } from '../types';
import type { RewardOutcome } from '../rewards';

export interface ConclusionOpts { def: EventDef; reward: RewardOutcome; first: boolean; photo?: PhotoRec; repeat: number }

export function showConclusion(body: HTMLElement, o: ConclusionOpts): Promise<void> {
  return new Promise((resolve) => {
    body.textContent = '';
    const chips: HTMLElement[] = [];
    const chip = (img: string, n: number, label: string) => { if (n > 0) chips.push(h('span.ev-chip', h('img', { src: img, alt: label }), h('b', `+${fmt(n)}`), h('small', label))); };
    chip(resIconUrl('coins', 40), o.reward.coins, 'pièces');
    chip(diamondUrl(40), o.reward.diamonds, 'diamants');
    chip(resIconUrl('fabric', 40), o.reward.fabric, 'tissus');
    chip(resIconUrl('flowers', 40), o.reward.flowers, 'fleurs');
    chip(resIconUrl('cocoa', 40), o.reward.cocoa, 'cacao');
    if (o.reward.fans > 0) chips.push(h('span.ev-chip', h('b', `+${fmt(o.reward.fans)}`), h('small', 'fans')));
    const items = [
      ...o.reward.cloth.map((c) => h('li', `Nouveau : ${CLOTHES[c as ClothId]?.name ?? c}`)),
      ...o.reward.furniture.map((f) => h('li', `Décoration : ${(FURNITURE as Record<string, { name?: string }>)[f as FurnitureId]?.name ?? f}`)),
    ];
    const ph = h('div.ev-memo-photo');
    if (o.photo) {
      const p = o.photo;
      void import('../photo/render').then((m) => { const c = m.renderPhoto(p, 300, 400); c.className = 'ev-memo-img'; ph.append(c); }).catch(() => undefined);
    }
    const card = h('div.ev-concl',
      h('div.ev-concl-t', h('b', o.first ? 'Souvenir ajouté ♡' : 'Un souvenir de plus ♡'), h('small', o.def.memoryTitle)),
      ph,
      chips.length ? h('div.ev-chips', ...chips) : h('p.ev-note', 'Tu avais déjà reçu cette récompense : le souvenir te reste, c’est l’essentiel ♡'),
      items.length ? h('ul.ev-items', ...items) : null,
      o.repeat > 0 && chips.length ? h('p.ev-note', 'Les rejouables rapportent un peu moins : tu gardes surtout le plaisir de recommencer.') : null,
      h('button.btn.ev-btn.gold', { on: { click: tap(() => { card.classList.add('out'); window.setTimeout(resolve, 180); }) } }, 'Reprendre ma partie'));
    body.append(card);
    audio.play('reward');
    audio.play('sparkle');
  });
}
