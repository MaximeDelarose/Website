/** Boutique PIMBÊCHE ♡ : atelier, recettes, emballages — achetés avec des pièces — et objectif d'épargne. */
import { h, tap } from '../dom';
import { audio, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt, wallet } from '../../core/wallet';
import { resIconUrl } from '../../game/art/world/resources';
import { UPGRADES, buyUpgrade, soapBonus, status, type Upgrade } from '../../game/endless/pimbeche';
import { xpView } from '../../game/endless/xp';
import { counter } from '../../game/endless/ctx';
import { missingCoins } from '../../data/world/prices';
import { sparkleBurst } from '../fx/sparkle';
import { openSheet } from './sheet';

const GOAL_KEY = 'pimb:goal';
const KIND_TITLE = { atelier: 'Atelier & machines', recette: 'Recettes au lait de chèvre', emballage: 'Emballages, présentoirs & vitrine' } as const;

export function openPimbecheSheet(): void {
  const fun = () => save.data.fun;
  const coins = () => save.data.world.res.coins;
  const body = h('div.en-pimb');
  const spend = (n: number): boolean => { if (coins() < n) return false; save.data.world.res.coins -= n; wallet.notify(); return true; };

  const draw = () => {
    const f = fun();
    const bon = soapBonus(f);
    const goalIdx = counter(f, GOAL_KEY) - 1;
    const goal = goalIdx >= 0 ? UPGRADES[goalIdx] : undefined;
    const xv = xpView(f);
    body.replaceChildren(
      h('div.en-pimb-top',
        h('span', h('img', { src: resIconUrl('coins', 28), alt: '', style: 'width:22px;vertical-align:middle' }), ' ', h('b', fmt(coins())), ' pièces'),
        h('span', `Niveau ${xv.level} de Radia`)),
      h('p.muted.en-small', `Toutes tes recettes sont au lait de chèvre. Bonus actuel sur les commandes de savon : +${Math.round(bon.pct * 100)} %${bon.flat ? ` et +${bon.flat} pièces` : ''}${bon.xp ? `, +${bon.xp} XP` : ''}.`),
      goal && status(f, goal, coins()) !== 'owned' ? h('div.en-pimb-goal', h('b', `Objectif d'épargne : ${goal.name}`),
        h('i.en-bar', h('b', { style: `width:${Math.min(100, Math.round(coins() / goal.price * 100))}%` })),
        h('small', coins() >= goal.price ? 'Tu peux l’acheter maintenant ♡' : `${missingCoins(goal.price - coins())}.`)) : h('span'),
      ...(['atelier', 'recette', 'emballage'] as const).map((k) => h('div.en-pimb-sec', h('h4', KIND_TITLE[k]),
        ...UPGRADES.filter((u) => u.kind === k).map((u) => row(u)))));
  };

  function row(u: Upgrade): HTMLElement {
    const st = status(fun(), u, coins());
    const eff = [u.coinPct ? `+${Math.round(u.coinPct * 100)} % pièces` : '', u.coinFlat ? `+${u.coinFlat} pièces` : '', u.xp ? `+${u.xp} XP` : ''].filter(Boolean).join(' · ');
    const lock = st === 'locked' ? (xpView(fun()).level < u.level ? `Niveau ${u.level} requis` : 'Améliore d’abord l’étape précédente') : '';
    const b = h(`button.btn.small${st === 'ready' ? '.gold' : '.secondary'}`, { disabled: st === 'owned' || st === 'locked' }, st === 'owned' ? 'Acquis ♡' : st === 'locked' ? '🔒' : st === 'poor' ? `${fmt(u.price)} · épargner` : `Acheter · ${fmt(u.price)}`);
    b.addEventListener('click', tap(() => {
      if (st === 'poor') { fun().endless2.counters[GOAL_KEY] = UPGRADES.indexOf(u) + 1; save.save(); draw(); return; }
      const r = buyUpgrade(fun(), u.id, coins(), spend);
      if (!r.ok) { haptic('error'); audio.play('invalid'); return; }
      if (counter(fun(), GOAL_KEY) === UPGRADES.indexOf(u) + 1) fun().endless2.counters[GOAL_KEY] = 0;
      audio.play('reward'); haptic('reward'); save.save();
      const rc = b.getBoundingClientRect(); sparkleBurst(rc.left + rc.width / 2, rc.top, { rarity: 'rare', count: 10 });
      draw();
    }, { sound: false }));
    return h(`div.en-pimb-row${st === 'owned' ? '.owned' : ''}`, h('div', h('b', u.name), h('small', u.blurb), h('small.eff', lock || eff)), b);
  }
  draw();
  openSheet({ title: 'PIMBÊCHE ♡', sub: 'Ton savon au lait de chèvre', body, accent: '#E8558F' });
}
