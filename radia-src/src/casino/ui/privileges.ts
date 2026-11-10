/** Privilèges (tickets) : tenues, décors, cadeaux et soirée du casino. Une seule colonne, boutons clairs. */
import { h } from '../../ui/dom';
import { audio, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { wallet, fmt } from '../../core/wallet';
import { ticketUrl } from '../../game/art/world/giftArt';
import { celebrate, centerOf } from '../fx';
import { cs, notifyCasino, persist } from '../store';
import { defaultRng } from '../rng';
import { creditCoins } from '../bank';
import { PRIVILEGES, buyPrivilege, eventAvailable, owned } from '../privileges';
import type { Scene, Shell } from './shell';

export function privilegesScene(_sh: Shell, o: { onBack(): void }): Scene {
  const s = cs();
  const list = h('div.cz-priv');
  const bal = h('p.cz-lead');
  const note = h('p.cz-small');
  const draw = () => {
    bal.replaceChildren(h('img', { src: ticketUrl(28), alt: '', draggable: false, style: 'width:22px;vertical-align:middle' }), ` Tu as ${fmt(s.chips)} ticket${s.chips > 1 ? 's' : ''}.`);
    list.replaceChildren(...PRIVILEGES.map((p) => {
      const have = owned(p, save.data.world);
      const today = p.reward.t === 'event' && !eventAvailable(s);
      const poor = s.chips < p.price;
      const b = h(`button.btn.small${have || today || poor ? '.secondary' : '.gold'}`, { disabled: have || today || poor,
        on: { click: () => {
          const r = buyPrivilege(s, save.data.world, p.id, { giveDiamonds: (n) => wallet.giveDiamonds(n), giveCoins: (n) => creditCoins(n), rng: defaultRng });
          if (!r.ok) { audio.play('invalid'); haptic('error'); return; }
          audio.play('reward'); haptic('reward'); persist(); save.save(); notifyCasino(); celebrate('small', centerOf(b));
          note.textContent = r.spins ? `Soirée : ${r.spins.map((x) => (x.win > 0 ? `+${x.win}` : '0')).join(' · ')} pièces offertes ♡` : `${p.name} : c’est à toi ♡`;
          draw();
        } } }, have ? 'Déjà à toi' : today ? 'Revenez demain' : poor ? `Il te manque ${p.price - s.chips}` : `${p.price} tickets`);
      return h('div.cz-privrow', h('div', h('b', p.name), h('small', p.desc)), b);
    }));
  };
  draw();
  return {
    el: h('div.cz-card', h('h2', 'Privilèges ♡'), p0('Les tickets ouvrent des cadeaux et des objets exclusifs. Ils ne se gagnent qu\'en jouant et en relevant des missions, et ne servent plus à miser.'), bal, list, note),
    title: 'Privilèges', onBack: o.onBack,
    help: () => h('div', p0('Tickets : gratuits, jamais achetables contre de l\'argent. Chaque privilège est donné une seule fois (la soirée : une fois par jour).')),
  };
}
const p0 = (t: string): HTMLElement => h('p.cz-small', t);

