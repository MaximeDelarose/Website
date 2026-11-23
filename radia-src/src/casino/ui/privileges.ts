/** Privilèges du casino : tenues, décors et coffret d'atelier contre des PIÈCES. Une seule colonne, boutons clairs. */
import { h } from '../../ui/dom';
import { audio, events, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { resIconUrl } from '../../game/art/world/resources';
import { celebrate, centerOf } from '../fx';
import { cs, notifyCasino, persist } from '../store';
import { PRIVILEGES, buyPrivilege, owned } from '../privileges';
import type { Scene, Shell } from './shell';

export function privilegesScene(sh: Shell, o: { onBack(): void }): Scene {
  const s = cs();
  const list = h('div.cz-priv');
  const bal = h('p.cz-lead');
  const note = h('p.cz-small');
  const draw = () => {
    const coins = save.data.world.res.coins;
    bal.replaceChildren(h('img', { src: resIconUrl('coins', 28), alt: '', draggable: false, style: 'width:22px;vertical-align:middle' }), ` Tu as ${fmt(coins)} pièce${coins > 1 ? 's' : ''}.`);
    list.replaceChildren(...PRIVILEGES.map((p) => {
      const have = owned(p, save.data.world);
      const poor = coins < p.price;
      const b = h(`button.btn.small${have || poor ? '.secondary' : '.gold'}`, { disabled: have || poor,
        on: { click: () => {
          const r = buyPrivilege(s, save.data.world, p.id);
          if (!r.ok) { audio.play('invalid'); haptic('error'); return; }
          audio.play('reward'); haptic('reward'); persist(); save.save(); events.emit('economy', undefined); notifyCasino(); celebrate('small', centerOf(b));
          note.textContent = `${p.name} : c’est à toi ♡`;
          sh.setShown(save.data.world.res.coins);
          draw();
        } } }, have ? 'Déjà à toi' : poor ? `Il te manque ${fmt(p.price - coins)}` : `${fmt(p.price)} pièces`);
      return h('div.cz-privrow', h('div', h('b', p.name), h('small', p.desc)), b);
    }));
  };
  draw();
  return {
    el: h('div.cz-card', h('h2', 'Privilèges du casino ♡'), p0('Des objets exclusifs, contre des pièces de ta bourse. Les missions du casino en offrent aussi, gratuitement.'), bal, list, note),
    title: 'Privilèges', onBack: o.onBack,
    help: () => h('div', p0('Chaque objet est donné une seule fois. Les prix sont en pièces dorées, la monnaie de tout RADIA ; rien ne s\'achète avec de l\'argent réel.')),
  };
}
const p0 = (t: string): HTMLElement => h('p.cz-small', t);
