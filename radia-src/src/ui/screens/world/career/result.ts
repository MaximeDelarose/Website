/** Écran de résultat d'une séance : score animé, barre de palier qui se remplit, bonus, célébrations. */
import { h, tap } from '../../../dom';
import { ui } from '../../../ui';
import { icon } from '../../../icons';
import { audio, reducedFx } from '../../../../core/app';
import { haptic } from '../../../../core/haptics';
import { checkAchievements } from '../../../../core/progress';
import { fmt } from '../../../../core/wallet';
import { world } from '../../../../core/world';
import { reactAuguste } from '../../../../game/world/auguste';
import { CAREERS } from '../../../../data/world/careers';
import { CLOTHES } from '../../../../data/world/wardrobe';
import { objectiveProgress } from '../../../../game/world/careers';
import { sparkleBurst, confetti as burstConfetti } from '../../../fx/sparkle';
import { careerIconUrl, clearCareerFx, countUp, showMagazineReveal } from '../careerFx';
import { ACTIVITY } from './logic';
import type { SessionDone } from './session';

export interface ResultHooks { again: () => void; back: () => void; isAlive: () => boolean }

export function showResult(d: SessionDone, hooks: ResultHooks): Promise<void> {
  const { id, res, out, bonus, fanRes, before } = d;
  const def = CAREERS[id];
  const w = world();
  const verdict = out.score >= 90 ? 'Éblouissant !' : out.score >= 75 ? 'Magnifique !' : out.score >= 60 ? 'Très bien joué !' : out.score >= 40 ? 'Belle tentative !' : 'On s\'entraîne, ça viendra ♡';
  const num = h('b.car-score-n', '0');
  const ring = h('div.car-score-ring', { style: `--c:${def.color2}` }, num, h('small', '/ 100'));
  const fansEl = h('b', '0');
  const totalFans = out.outside.fans + bonus.fans;
  const ov = objectiveProgress(w, id);

  // barre de palier : de l'avant à l'après (pleine si palier franchi)
  const from = before.need ? Math.round((before.have / before.need) * 100) : 100;
  const to = out.levelUp ? 100 : ov.need ? Math.round((ov.have / ov.need) * 100) : 100;
  const fill = h('i', { style: `width:${reducedFx() ? to : from}%` });
  const txt = h('em', out.levelUp ? 'Palier franchi !' : `${ov.have} / ${ov.need} ${ov.label}`);
  const bar = h('div.car-bar.big', fill, txt);
  const next = out.levelUp ? null : ov.tier;

  const chips = h('div.rc-row',
    h('span.rc.rc-fans', icon('heart', 16), '+', fansEl, ' fans'),
    h('span.rc.rc-coins', icon('star', 16), `+${fmt(out.coins + bonus.coins)} pièces`),
    h('span.rc.rc-xp', icon('sparkle', 16), `+${out.xp} exp.`),
    out.best ? h('span.rc.rc-best', 'Record !') : null);
  const drop = bonus.drop
    ? h('div.car-drop', icon('gift', 22), h('div', h('b', 'Cadeau de la production !'), h('small', `${CLOTHES[bonus.drop]?.name ?? bonus.drop} ajouté à ton dressing`)))
    : bonus.dropCoins > 0 ? h('div.car-drop.dup', icon('star', 20), h('div', h('b', 'Déjà dans ton dressing'), h('small', `+${fmt(bonus.dropCoins)} pièces à la place`))) : null;
  const tired = bonus.fatigue < 1 ? h('small.car-tired', 'Tu as beaucoup travaillé : les bonus sont plus doux. Une pause te fera du bien ♡') : null;

  let gone = false;
  const again = h('button.btn.wide', icon('refresh', 20), ` ${ACTIVITY[id].cta}`);
  again.addEventListener('click', tap(() => { gone = true; clearCareerFx(); hooks.again(); }));
  const back = h('button.btn.secondary.wide', 'Retour à la carrière');
  back.addEventListener('click', tap(() => { gone = true; clearCareerFx(); hooks.back(); }));
  const body = h('div.screen-body.car-body.car-result',
    h('img.car-res-icon', { src: careerIconUrl(id, 96), alt: '' }),
    h('h3', verdict), ring,
    h('div.car-lines', ...res.lines.map((l) => h('div', l))),
    chips, bar,
    next ? h('small.car-next-goal', `Prochain objectif : ${next.goal}`) : null,
    out.levelUp ? h('div.car-up', icon('trophy', 22), h('b', ` Palier ${out.levelUp.to} : ${out.levelUp.tier.title}`)) : null,
    drop, tired,
    h('small.car-fict', `Fans : ${fmt(w.fans)}`),
    again, back);
  ui.showScreen(h('div.screen.bg-soft.car-screen', ui.header(ACTIVITY[id].title, () => { gone = true; clearCareerFx(); hooks.back(); }), body));

  return new Promise<void>((resolve) => {
    audio.play(out.score >= 60 ? 'reward' : 'pickup');
    haptic(out.levelUp ? 'maxMerge' : out.score >= 60 ? 'reward' : 'select');
    countUp(num, 0, out.score, 1000, (n) => { ring.style.setProperty('--p', String(n)); return String(n); });
    window.setTimeout(() => countUp(fansEl, 0, totalFans, 900), 500);
    // la barre se remplit après le score
    window.setTimeout(() => { fill.style.width = `${to}%`; if (to > from) { audio.play('pop2'); haptic('select'); } }, 1100);
    window.setTimeout(() => {
      if (!ring.isConnected || reducedFx()) return;
      const r = ring.getBoundingClientRect();
      if (out.score >= 60) sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: out.score >= 90 ? 'epic' : 'rare' });
      if (out.score >= 90) burstConfetti(r.left + r.width / 2, r.top);
      if (bonus.drop) { const e = body.querySelector('.car-drop'); if (e) { const b = e.getBoundingClientRect(); sparkleBurst(b.left + 30, b.top + b.height / 2, { rarity: 'epic' }); } }
    }, 900);
    // célébrations en file
    window.setTimeout(() => void (async () => {
      if (!hooks.isAlive() || gone) return resolve();
      if (out.levelUp) {
        // gros jalon : ouverture de cadeau mise en scène (récompenses déjà versées par `recordSession`, affichage seulement)
        const lu = out.levelUp;
        try {
          const [rw, ad] = await Promise.all([import('../../../rewards'), import('../../../rewards/adapters')]);
          const spec = ad.careerMilestoneSpec({ career: id, level: lu.to, tierTitle: lu.tier.title, goal: lu.tier.goal, reward: lu.reward, items: lu.granted });
          spec.subtitle = `${def.name} · palier ${lu.to} sur 5`;
          await rw.openGift(spec);
        } catch (e) { console.error('[career] cadeau de palier', e); }
        reactAuguste('careerUp', 0.7, true);
      }
      for (const m of out.newMagazines) { if (gone) break; await showMagazineReveal(m); reactAuguste('magazine', 0.6); }
      if (!gone) await fanRes.celebrate();
      if (!out.levelUp && !fanRes.claims.length) reactAuguste('career', 0.3);
      checkAchievements();
      resolve();
    })(), 1700);
  });
}
