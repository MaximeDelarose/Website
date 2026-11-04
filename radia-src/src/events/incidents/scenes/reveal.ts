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

/** Un coffret à ouvrir en le touchant ; `rewards` s'affichent ensuite. Résout vrai quand le joueur a tout vu. */
export function runReveal(o: { title: string; hint: string; emoji: string; openLabel: string; rewards: Reward[]; intro?: HTMLElement; footer?: string }): Promise<boolean> {
  const f = openFrame(o.title, o.hint, 'rv');
  let taps = 0;
  let opened = false;
  const box = h('button.rv-box', { 'aria-label': o.openLabel }, h('span.rv-emoji', o.emoji), h('small', o.openLabel));
  const stage = h('div.rv-stage', o.intro ?? null, box);
  f.body.append(stage);
  box.addEventListener('click', () => {
    if (opened) return;
    taps++;
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    audio.play('pop3'); haptic('select');
    if (taps < 3) { f.setHint(taps === 1 ? 'Ça bouge là-dedans…' : 'Encore un petit coup !'); return; }
    opened = true;
    box.classList.add('open');
    audio.play('chest'); haptic('chest');
    f.later(() => {
      box.remove();
      const cards = o.rewards.map((rw, i) => h('div.rv-card', { style: `animation-delay:${i * 160}ms` }, rewardImage(rw), h('b', rw.label)));
      stage.append(h('div.rv-cards', ...cards), h('p.inc-foot', o.footer ?? 'Ajouté à tes affaires ♡'),
        h('button.btn.rv-ok', { on: { click: tap(() => f.finish(true), { sound: false }) } }, 'Merci ♡'));
      audio.play('reward'); haptic('reward'); confettiBurst(f.layer, 30);
      f.setHint('');
    }, 520);
  });
  return f.result;
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
