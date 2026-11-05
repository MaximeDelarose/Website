/**
 * Clients dans Endless : fiche d'un client (au toucher de sa carte) et petite bulle de remerciement après une livraison.
 * Classes préfixées `cu-` (aucune collision). Rien de permanent sur le plateau : la fiche est une feuille qu'on ouvre volontairement,
 * le remerciement passe par le gestionnaire central de notices (voie sous le plateau, une seule notice à la fois).
 */
import { h, tap } from '../dom';
import { notify } from '../notify';
import { openSheet } from './sheet';
import { customerPortraitUrl } from '../../game/art/customers';
import { customerById } from '../../data/customers';
import { loyaltyProgress, requestLine, storyLine, whatText, MAX_LOYALTY } from '../../game/customers/logic';
import { Rng } from '../../utils/rng';
import type { CustomerState } from '../../save/fun';

/** Fiche d'un client : demande en cours, fidélité (5 cœurs) et dernière histoire débloquée. */
export function openCustomerSheet(id: string, orderId: number, itemNames: string[], tierLabel: string, state: Record<string, CustomerState>): void {
  const c = customerById(id);
  if (!c) return;
  const n = state[id]?.n ?? 0;
  const lp = loyaltyProgress(n);
  const request = requestLine(c, new Rng((orderId * 2654435761) >>> 0), whatText(itemNames));
  const hearts = h('div.cu-hearts', { 'aria-label': `Fidélité : niveau ${lp.level} sur ${MAX_LOYALTY}` },
    ...Array.from({ length: MAX_LOYALTY }, (_, i) => h(`i.cu-h${i < lp.level ? '.on' : ''}`, '♥')));
  const story = lp.level >= 2 ? storyLine(c, lp.level) : undefined;
  const body = h('div.cu-sheet',
    h('div.cu-head', h('img.cu-big', { src: customerPortraitUrl(id, 96, 'happy'), alt: '' }), h('div', h('b.cu-name', c.name), h('small', `Commande ${tierLabel.toLowerCase()}`), hearts,
      h('small.cu-lv', lp.level >= MAX_LOYALTY ? 'Fidélité au maximum ♡' : `Encore ${lp.need} commande${lp.need > 1 ? 's' : ''} pour le niveau ${lp.level + 1}`))),
    h('p.cu-say', `« ${request} »`),
    story ? h('p.cu-story', h('small', 'Dernière confidence'), story) : null,
  );
  const sh = openSheet({ title: c.name, sub: 'Cliente fidèle de ta boutique', body });
  void sh;
}

export interface ThanksOpts {
  id: string; text: string; levelUp: boolean; dock: HTMLElement | null; feed: HTMLElement;
  /** Appelé à l'affichage (étoiles, son…) */
  onShow?: () => void;
}

/** Remerciement : petite bulle d'une ligne avec le portrait qui grossit un instant puis revient ; un toucher la ferme. */
export function showThanks(o: ThanksOpts): void {
  const c = customerById(o.id);
  if (!c || !o.dock) return;
  notify({
    key: `thanks:${o.id}:${o.text}`, channel: 'narrative', prio: o.levelUp ? 3 : 2, ttl: 2500, ms: o.levelUp ? 3200 : 2600,
    show: () => {
      const av = h('img.cu-av', { src: customerPortraitUrl(o.id, 40, 'happy'), alt: '' });
      const el = h(`div.cu-thanks${o.levelUp ? '.up' : ''}`, { role: 'status' }, av, h('span', o.text));
      el.addEventListener('click', tap(() => { el.remove(); }, { sound: false }));
      o.feed.replaceChildren();
      o.dock!.insertBefore(el, o.feed);
      o.onShow?.();
      return (immediate) => { if (immediate) { el.remove(); return; } el.classList.add('out'); window.setTimeout(() => el.remove(), 300); };
    },
  });
}
