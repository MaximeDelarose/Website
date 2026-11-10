/**
 * Fenêtre « Énergie » : prochaine recharge, recharge offerte d'Auguste, touchers gratuits, énergie gagnée en jouant.
 * Jamais de mur de paiement : quand l'énergie est à 0, des options gratuites (attendre 25 s, jouer ailleurs) sont proposées.
 * Les diamants (virtuels) restent une option, jamais obligatoire.
 */
import { h } from '../dom';
import { ui } from '../ui';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { wallet, fmt } from '../../core/wallet';
import { ENERGY_MAX, FREE_REFILL, FREE_TAP_EVERY } from '../../game/economy/economy';
import { energyAdvice, fmtWait } from '../endless/logic';
import { energyUrl, diamondUrl, openShop } from '../screens/shop';

import { PARTNER, PARTNER_DE_TYPO } from '../../config/gift';
const PRICE = 15;
let opened = false;

export interface EnergyPanelOpts {
  /** Touchers déjà faits dans la partie (pour annoncer le prochain toucher gratuit). */
  taps?: number;
  /** Mode infini : aller dans MON MONDE / aux échecs sans perdre la partie. */
  onWorld?: () => void;
  onChess?: () => void;
}

export async function openEnergyPanel(empty = false, opts: EnergyPanelOpts = {}): Promise<void> {
  if (opened) return;
  opened = true;
  const freeIn = wallet.freeRefillIn();
  const next = wallet.nextEnergyIn();
  const energy = wallet.energy();
  const adv = energyAdvice(energy, next, freeIn, ENERGY_MAX);
  const untilFree = opts.taps === undefined ? null : (FREE_TAP_EVERY - ((opts.taps + 1) % FREE_TAP_EVERY)) % FREE_TAP_EVERY;
  const body = h('div.energy-panel',
    h('div.ep-big', h('img', { src: energyUrl(96), alt: '' }), h('b', `${fmt(energy)}`), h('small', ` / ${ENERGY_MAX}`)),
    h('p', empty || adv.tone === 'empty' ? 'Plus d\'énergie pour les générateurs… mais pas de panique, ma reine.' : adv.title),
    h('p.muted', { style: 'font-size:13.5px;margin-top:-6px' }, adv.next),
    wallet.reserve() > 0 ? h('p.muted', { style: 'font-size:12.5px;margin:2px 0' }, `Réserve : ${fmt(wallet.reserve())} ⚡ — utilisée seulement quand ton énergie tombe à 0.`) : null,
    h('ul.ep-list', { style: 'text-align:left;font-size:13px;margin:4px 0 0;padding-left:18px;line-height:1.35' },
      untilFree !== null ? h('li', untilFree === 0 ? 'Ton prochain toucher est gratuit ✨' : `Prochain toucher gratuit dans ${untilFree} touchers.`) : null,
      ...adv.lines.map((l) => h('li', l))),
  );
  const actions: { label: string; value: string; style?: 'secondary' | 'gold' | 'lavande' }[] = [];
  if (freeIn <= 0) actions.push({ label: `+${FREE_REFILL} ⚡ offertes par ${PARTNER}`, value: 'free' });
  else actions.push({ label: `Prochain cadeau ${PARTNER_DE_TYPO} dans ${fmtWait(freeIn)} (1 par jour)`, value: 'wait', style: 'secondary' });
  if (opts.onWorld) actions.push({ label: 'Jouer ailleurs : MON MONDE', value: 'world', style: 'lavande' });
  if (opts.onChess) actions.push({ label: 'Jouer ailleurs : échecs', value: 'chess', style: 'lavande' });
  actions.push({ label: `Facultatif : remplir à 100 ⚡ · ${PRICE} 💎`, value: 'buy', style: 'secondary' });
  actions.push({ label: empty ? 'Je patiente un peu' : 'Continuer', value: 'close', style: 'secondary' });
  const v = await ui.modal({ title: 'Énergie', body, actions });
  opened = false;
  if (v === 'free') {
    const before = wallet.energy();
    if (wallet.takeFreeRefill()) { const gain = Math.max(0, wallet.energy() - before); haptic('reward'); audio.play('reward'); ui.toast({ title: `+${gain} énergie`, sub: `Offerte par ${PARTNER} ♡`, img: energyUrl(64) }); }
    else if (wallet.energyFull()) ui.toast({ title: 'Énergie déjà pleine ♡', sub: 'La recharge offerte reste pour plus tard', img: energyUrl(64) });
  } else if (v === 'world') opts.onWorld?.();
  else if (v === 'chess') opts.onChess?.();
  else if (v === 'buy') {
    if (wallet.energyFull()) { ui.toast({ title: 'Énergie déjà pleine ♡', sub: 'Aucun diamant dépensé', img: energyUrl(64) }); return; }
    if (wallet.spendDiamonds(PRICE)) {
      const gain = wallet.giveEnergy(100);
      audio.play('reward');
      ui.toast({ title: `+${gain} énergie`, sub: `−${PRICE} diamants`, img: energyUrl(64) });
    } else {
      haptic('error');
      const g = await ui.modal({ title: 'Pas assez de diamants', body: h('p', h('img', { src: diamondUrl(40), alt: '', style: 'width:28px;vertical-align:middle' }), ' Pas grave : l\'énergie revient toute seule, et tu peux jouer ailleurs en attendant ♡'), actions: [{ label: 'Ouvrir la boutique', value: 'shop', style: 'secondary' }, { label: 'D\'accord', value: 'no' }] });
      if (g === 'shop') await openShop('diamonds');
    }
  }
}
