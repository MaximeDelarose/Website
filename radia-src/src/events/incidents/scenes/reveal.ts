/** Scènes « découverte » : colis surprise (animation d'ouverture), fleur rare, nouvelle boutique. */
import { h, tap } from '../../../ui/dom';
import { audio } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { paint } from '../../../game/art/kit';
import { drawFlower } from '../../../game/art/world/garden';
import { drawFurniture } from '../../../game/art/world/furniture';
import { resIconUrl } from '../../../game/art/world/resources';
import { FURNITURE } from '../../../data/world/furniture';
import { FLOWER_NAMES, colorOf, type FlowerId } from '../../../data/world/ids';
import type { Reward } from '../rewards';
import { openFrame, confettiBurst } from './frame';

/** Image d'une récompense : pièces, décoration (art du château) ou vêtement (miniature du dressing). */
export function rewardImage(rw: Reward, size = 84): HTMLElement {
  const box = h('div.rv-img');
  if (rw.kind === 'coins') box.append(h('img', { src: resIconUrl('coins', size), alt: '' }));
  else if (rw.kind === 'decor') {
    const f = FURNITURE[rw.id as keyof typeof FURNITURE];
    const k = size / Math.max(f.w, f.h);
    box.append(paint(f.w * k, f.h * k, 2, (c) => drawFurniture(c, f.id, f.w * k, f.h * k, colorOf(f.color))));
  } else {
    void import('../../../ui/screens/world/dressing').then((m) => { box.append(h('img', { src: m.thumbUrl(rw.id as never), alt: '' })); }).catch(() => box.append(h('span', '👗')));
  }
  return box;
}

/**
 * Colis / sac de bienvenue : ouverture mise en scène (src/ui/rewards). Les récompenses sont versées par `complete()` de
 * l'incident APRÈS cette scène (jamais deux fois) : ici, affichage seulement. Résout vrai quand tout a été vu.
 */
export async function runReveal(o: { title: string; hint: string; emoji: string; openLabel: string; rewards: Reward[]; intro?: HTMLElement; footer?: string }): Promise<boolean> {
  try {
    const [rw, ad] = await Promise.all([import('../../../ui/rewards'), import('../../../ui/rewards/adapters')]);
    const spec = ad.parcelSpec({
      title: o.title, subtitle: o.footer ?? 'Ajouté à tes affaires ♡',
      rewards: o.rewards.map((r) => (r.kind === 'coins' ? { kind: 'coins' as const, coins: r.coins, label: r.label } : { kind: r.kind, id: r.id, label: r.label })),
    });
    await rw.openGift(spec);
  } catch (e) { console.error('[incidents] cadeau', e); }
  return true;
}

/** La fleur rare : un bourgeon qui brille ; on le touche pour le découvrir. */
export function runRareFlower(id: FlowerId | null, summary: string): Promise<boolean> {
  const f = openFrame('Une fleur rare', 'Touche le bourgeon qui brille.', 'rv');
  const draw = (stage: 0 | 3) => paint(150, 150, 2, (c) => drawFlower(c, id ?? 'magic', stage, 150));
  const holder = h('div.rv-flower.bud', draw(0));
  const b = h('button.rv-bud', { 'aria-label': 'Découvrir la fleur' }, holder);
  const stage = h('div.rv-stage', b);
  f.body.append(stage);
  b.addEventListener('click', () => {
    if (b.classList.contains('done')) return;
    b.classList.add('done');
    holder.replaceChildren(draw(3)); holder.classList.remove('bud'); holder.classList.add('bloom');
    audio.play('rare'); haptic('rare'); confettiBurst(f.layer, 30);
    f.setHint('');
    stage.append(h('h3.rv-name', id ? FLOWER_NAMES[id] : 'Fleurs précieuses'), h('p.inc-foot', summary),
      h('button.btn.rv-ok', { on: { click: tap(() => f.finish(true), { sound: false }) } }, 'Ajouter à ma collection ♡'));
  });
  return f.result;
}
