/** Fenêtre « Énergie » : recharge gratuite, diamants, ou simple attente (courte). */
import { h } from '../dom';
import { ui } from '../ui';
import { audio } from '../../core/app';
import { wallet, fmt, fmtTime } from '../../core/wallet';
import { ENERGY_MAX, FREE_REFILL } from '../../game/economy/economy';
import { energyUrl, diamondUrl, openShop } from '../screens/shop';

const PRICE = 15;
let opened = false;

export async function openEnergyPanel(empty = false): Promise<void> {
  if (opened) return;
  opened = true;
  const freeIn = wallet.freeRefillIn();
  const next = wallet.nextEnergyIn();
  const body = h('div.energy-panel',
    h('div.ep-big', h('img', { src: energyUrl(96), alt: '' }), h('b', `${fmt(wallet.energy())}`), h('small', ` / ${ENERGY_MAX}`)),
    h('p', empty ? 'Plus d\'énergie pour les générateurs… mais pas de panique, ma reine.' : 'Chaque toucher sur un générateur coûte 1 ⚡.'),
    h('p.muted', { style: 'font-size:13.5px;margin-top:-6px' }, next ? `+1 ⚡ dans ${fmtTime(next)} · elle revient toute seule` : 'Énergie pleine'),
  );
  const actions = [
    freeIn ? { label: `Recharge offerte dans ${fmtTime(freeIn)}`, value: 'wait', style: 'secondary' as const } : { label: `+${FREE_REFILL} ⚡ offertes par Auguste`, value: 'free' },
    { label: `+100 ⚡ · ${PRICE} 💎`, value: 'buy', style: 'gold' as const },
    { label: 'Continuer', value: 'close', style: 'secondary' as const },
  ];
  const v = await ui.modal({ title: 'Énergie', body, actions });
  opened = false;
  if (v === 'free') {
    if (wallet.takeFreeRefill()) { audio.play('reward'); ui.toast({ title: `+${FREE_REFILL} énergie`, sub: 'Offerte par Auguste ♡', img: energyUrl(64) }); }
  } else if (v === 'buy') {
    if (wallet.spendDiamonds(PRICE)) {
      wallet.giveEnergy(100);
      audio.play('reward');
      ui.toast({ title: '+100 énergie', sub: `−${PRICE} diamants`, img: energyUrl(64) });
    } else {
      const g = await ui.modal({ title: 'Pas assez de diamants', body: h('p', h('img', { src: diamondUrl(40), alt: '', style: 'width:28px;vertical-align:middle' }), ' La carte d\'Auguste peut arranger ça…'), actions: [{ label: 'Ouvrir la boutique', value: 'shop' }, { label: 'Plus tard', value: 'no', style: 'secondary' }] });
      if (g === 'shop') await openShop('diamonds');
    }
  }
}
