/** Feuille d'un générateur : production, probabilités, maîtrise, prochaine amélioration. Jamais de diamants. */
import { h, tap } from '../dom';
import { save, audio, reducedFx } from '../../core/app';
import { haptic } from '../../core/haptics';
import { wallet, fmt } from '../../core/wallet';
import { COLLECTIONS } from '../../data/items';
import { RES_NAMES } from '../../data/world/ids';
import { resIconUrl } from '../../game/art/world/resources';
import { itemImageUrl } from '../../game/merge/textures';
import { collOfKind, generatorInfo, genState, masteryNext, upgradeCost, upgradeGenerator } from '../../game/endless';
import { sparkleBurst } from '../fx/sparkle';
import { costLines, fr, missingCostText, resUse } from './logic';
import { openSheet } from './sheet';
import type { EndlessEnv } from './hud';

export function openGenSheet(env: EndlessEnv, kind: number): void {
  const coll = collOfKind(kind);
  if (!coll) return;
  const fun = save.data.fun;
  const body = h('div.en-gen');
  const sheet = openSheet({ title: 'Générateur', body, accent: COLLECTIONS[coll].color });

  const render = () => {
    const st = genState(fun, coll);
    const info = generatorInfo(kind, st.level);
    const cost = upgradeCost(kind, st.level, st.rank);
    const lines = costLines(cost, save.data.world.res);
    const can = !!cost && lines.every((l) => l.ok);
    const mast = masteryNext(st.xp);
    body.textContent = '';
    const pips = h('span.en-pips', ...Array.from({ length: info.maxLevel }, (_, i) => h(`i${i < st.level ? '.on' : ''}`)));
    const art = h('img.en-gen-art', { src: itemImageUrl({ c: 'gen', l: kind }, 112), alt: '' });
    body.append(
      h('div.en-gen-head', art, h('div', h('b', info.name), h('div.en-gen-lv', `Niveau ${st.level}/${info.maxLevel}`, pips), h('small', COLLECTIONS[coll].name))),
      h('p.en-gen-desc', COLLECTIONS[coll].blurbs[0] ? `Produit des objets de la collection « ${COLLECTIONS[coll].name} ».` : info.description),
      h('h4', 'Ce qu\'il produit'),
      h('div.en-table', ...info.table.map((r) => h('div.en-trow', h('img', { src: itemImageUrl({ c: coll, l: r.l }, 40), alt: '' }), h('span', r.name), h('i.en-bar', h('b', { style: `width:${Math.min(100, r.pct)}%` })), h('em', `${String(r.pct).replace('.', ',')} %`)))),
      h('ul.en-perks', ...info.perks.slice(1).map((p) => h('li', fr(p)))),
      h('h4', 'Maîtrise'),
      h('div.en-mastery', h('span', `Rang ${st.rank}/5`), h('i.en-bar.gold', h('b', { style: `width:${mast ? Math.round((mast.have / Math.max(1, mast.need)) * 100) : 100}%` })), h('em', mast ? `${fmt(mast.have)}/${fmt(mast.need)} XP` : 'Maximum')),
      h('p.muted.en-small', 'Chaque toucher et chaque fusion de cette collection donnent de l\'XP : −6 % sur le coût d\'amélioration par rang.'),
    );
    if (info.next) {
      body.append(h('h4', `Niveau ${info.next.level} : ce que ça change`), h('ul.en-perks.next', ...info.next.gains.map((g) => h('li', fr(g)))));
      body.append(h('div.en-cost', ...lines.map((l) => h(`span.en-cost-chip${l.ok ? '' : '.poor'}`, h('img', { src: resIconUrl(l.kind, 32), alt: RES_NAMES[l.kind] }), `${fmt(l.have)} / ${fmt(l.need)}`))));
      const miss = missingCostText(lines);
      if (!can) body.append(h('p.center.muted.en-small', `${miss}. ${resUse(lines.find((l) => !l.ok)?.kind ?? 'coins')}`));
      const up = h('button.btn.gold.wide', { disabled: !can }, can ? `Améliorer · niveau ${info.next.level}` : 'Pas encore assez');
      up.addEventListener('click', tap(() => {
        const r = upgradeGenerator(fun, kind, save.data.world);
        if (!r.ok) { haptic('error'); env.feed(r.reason === 'poor' ? (miss || 'Il manque des ressources') : 'Déjà au maximum', { kind: 'info' }); return; }
        save.save();
        wallet.notify();
        haptic('reward');
        audio.play('reward');
        const rect = art.getBoundingClientRect();
        sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, { rarity: 'epic' });
        render();
        const a = body.querySelector('.en-gen-art');
        if (a && !reducedFx()) a.animate([{ transform: 'scale(.7) rotate(-8deg)' }, { transform: 'scale(1.18) rotate(4deg)', offset: 0.55 }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        env.feed(`${info.name} · niveau ${r.level} !`, { kind: 'good' });
        env.refresh();
      }));
      body.append(up);
    } else {
      body.append(h('p.center.en-max', 'Niveau maximum ✨ Bravo !'));
    }
  };
  render();
  void sheet.closed;
}
