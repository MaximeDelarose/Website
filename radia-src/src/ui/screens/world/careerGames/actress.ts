/** Interface du mini-jeu « Actrice » : une scène en 5 répliques, on choisit l'émotion juste. */
import { h, tap } from '../../../dom';
import { audio } from '../../../../core/app';
import { canvasUrl } from '../../../../game/art/kit';
import { portraitCanvas } from '../../../../game/art/characters';
import { EXPR_LABELS, type Take } from '../../../../data/world/careers';
import type { Expr } from '../../../../data/dialogue';
import { buildScene, isPerfect, scoreScene, scoreTake, sceneTags } from '../../../../game/world/careerGames/actress';
import { mulberry32 } from '../../../../game/world/careerGames/rng';
import { bigButton, gameShell, stars, tip, wait, type GameCtx, type GameResult } from './shared';

const face = (e: Expr): string => canvasUrl(`ac:radia:${e}`, () => portraitCanvas('radia', { expr: e }, 230));
let lastScene: string | undefined;

export function playActress(g: GameCtx): Promise<GameResult | null> {
  return new Promise((resolve) => {
    let finished = false;
    const end = (r: GameResult | null) => { if (finished) return; finished = true; resolve(r); };
    const sh = gameShell('Tournage', '', () => end(null));
    tip('actress', 'Tournage', 'À chaque réplique, choisis l\'émotion qui convient le mieux. Radia la joue pour toi !');
    const scene = buildScene(g.difficulty, mulberry32((Date.now() & 0xffff) + 11), lastScene);
    lastScene = scene.id;
    const taken: Take[] = [];

    sh.sub.textContent = scene.synopsis;
    sh.body.append(h('div.ac-intro', h('h3', scene.title), h('p', scene.synopsis), h('small', 'Cinq répliques : trouve l\'émotion juste à chaque fois.'),
      bigButton('Action !', () => beat(0), 'gold')));

    function beat(i: number) {
      if (finished) return;
      const b = scene.beats[i];
      sh.sub.textContent = `${scene.title} · réplique ${i + 1} sur 5`;
      const img = h('img.ac-face', { src: face('neutral'), alt: 'Radia' });
      const fb = h('div.ac-fb');
      const dots = h('div.ph-dots', ...scene.beats.map((_, k) => h(`i${k < i ? (taken[k]?.q === 2 ? '.good' : '.soft') : ''}`)));
      let busy = false;
      const opts = b.options.map((t) => {
        const o = h('button.ac-opt', h('small', EXPR_LABELS[t.expr]), h('b', `« ${t.text} »`));
        o.addEventListener('click', tap(() => {
          if (busy) return; busy = true;
          taken.push(t);
          img.src = face(t.expr); img.classList.remove('hop'); void img.offsetWidth; img.classList.add('hop');
          o.classList.add(t.q === 2 ? 'right' : t.q === 1 ? 'near' : 'off');
          if (t.q < 2) { const best = b.options.find((x) => x.q === 2); if (best) opts[b.options.indexOf(best)].classList.add('hint'); }
          fb.textContent = t.q === 2 ? 'Juste !' : t.q === 1 ? 'Presque…' : 'À côté, ce n\'était pas ça.';
          fb.className = `ac-fb show ${t.q === 2 ? 'good' : 'soft'}`;
          audio.play(t.q === 2 ? 'sparkle' : t.q === 1 ? 'pop2' : 'pop1');
          void (async () => { await wait(t.q === 2 ? 900 : 1500); if (i >= 4) after(); else beat(i + 1); })();
        }, { sound: false }));
        return o;
      });
      sh.body.replaceChildren(h('div.ac-stage', img, h('div.ac-spot')), dots, h('div.ac-cue', b.cue), fb, h('div.ac-opts', ...opts));
    }

    async function after() {
      if (finished) return;
      const score = scoreScene(taken);
      sh.sub.textContent = 'Coupez !';
      audio.play(score >= 60 ? 'victory' : 'reward');
      const n = taken.filter((t) => t.q === 2).length;
      sh.body.replaceChildren(h('div.ac-intro', h('h3', score >= 90 ? 'Prise parfaite !' : score >= 60 ? 'Belle prise !' : 'On la refait ?'),
        stars(score >= 90 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0),
        h('p', `${n} réplique(s) jouée(s) avec la bonne émotion sur 5.`),
        bigButton('Continuer', () => end({ score, tags: sceneTags(scene.id), lines: [scene.title, `${n} / 5 émotions justes`, isPerfect(taken) ? 'Scène parfaite !' : `Score ${taken.reduce((a, t) => a + scoreTake(t), 0)}`] }))));
    }
  });
}
