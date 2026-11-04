/**
 * Interface de « Chocolats en famille » : suivre la recette dans l'ordre en
 * touchant OU en glissant les ingrédients jusqu'au bol. Un glisser relâché hors
 * du bol est simplement annulé.
 */
import { h } from '../../../dom';
import { audio, reducedFx } from '../../../../core/app';
import { chocDone, chocScore, chocStars, currentRecipe, newChoc, pickIngredient, nextIngredient } from '../../../../game/world/familyGames/chocolat';
import { shuffle, mulberry32 } from '../../../../game/world/familyGames/rng';
import { CHOC_RECIPES, INGREDIENT_NAMES, type IngredientId } from '../../../../data/world/family';
import { CHOC_NAMES } from '../../../../data/world/ids';
import { chocUrl, ingredientUrl } from './art';
import { finishGame, floatFx, gameShell } from './common';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function playChocolat(): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    const exit = () => { alive = false; resolve(); };

    const start = async (): Promise<void> => {
      const s = newChoc();
      const rng = mulberry32((Date.now() ^ 0x27d4eb2f) >>> 0);
      const { info, stage } = gameShell('choc', 'all', exit);
      const title = h('div.ch-title');
      const steps = h('div.ch-steps');
      const bowl = h('div.ch-bowl', h('div.ch-bowl-in'), h('small', 'Dépose ici'));
      const box = h('div.fam-ch-box', ...CHOC_RECIPES.map(() => h('div.ch-slot')));
      const msg = h('div.ch-msg');
      const tray = h('div.fam-ch-tray');
      info.append(title);
      stage.append(steps, h('div.ch-mid', bowl, box), msg, tray);
      let busy = false;

      const renderRecipe = () => {
        const r = currentRecipe(s);
        title.replaceChildren(h('b', CHOC_NAMES[r.id]), h('small', ` · Recette ${Math.min(s.recipe + 1, CHOC_RECIPES.length)}/${CHOC_RECIPES.length}`));
        steps.replaceChildren(...r.steps.map((ing, i) => h(`div.ch-step${i < s.step ? '.done' : i === s.step ? '.now' : ''}`, h('span.ch-n', i < s.step ? '✓' : String(i + 1)), h('img', { src: ingredientUrl(ing, 56), alt: '' }), h('small', INGREDIENT_NAMES[ing]))));
        bowl.querySelector('.ch-bowl-in')!.replaceChildren(...r.steps.slice(0, s.step).map((ing, i) => h('img.ch-added', { src: ingredientUrl(ing, 40), alt: '', style: `left:${14 + ((i * 23) % 60)}%;--r:${(i * 37) % 50 - 25}deg` })));
        tray.replaceChildren(...shuffle(r.tray, rng).map((ing) => {
          const b = h('button.ch-ing', { 'aria-label': INGREDIENT_NAMES[ing] }, h('img', { src: ingredientUrl(ing, 72), alt: '', draggable: false }), h('small', INGREDIENT_NAMES[ing])) as HTMLButtonElement;
          wireDrag(b, ing);
          return b;
        }));
      };

      async function tryPick(ing: IngredientId, from: HTMLElement): Promise<void> {
        if (busy || !alive) return;
        const r = pickIngredient(s, ing);
        const rb = bowl.getBoundingClientRect(); const sb = stage.getBoundingClientRect();
        if (r === 'wrong') {
          audio.play('invalid');
          msg.textContent = `Oups ! Pas encore : il faut ${INGREDIENT_NAMES[nextIngredient(s)!]}.`;
          from.classList.remove('nope'); void from.offsetWidth; from.classList.add('nope');
          return;
        }
        msg.textContent = '';
        audio.play('pop2', 1 + s.step * 0.1);
        floatFx(stage, '+', 'good', rb.left - sb.left + rb.width / 2, rb.top - sb.top);
        if (r === 'ok') { renderRecipe(); return; }
        if (r === 'recipeDone') {
          busy = true;
          const id = s.made[s.made.length - 1];
          audio.play('reward');
          if (!reducedFx()) audio.play('sparkle');
          bowl.classList.add('done');
          const slot = box.children[s.made.length - 1] as HTMLElement;
          slot.replaceChildren(h('img.ch-made', { src: chocUrl(id, 72), alt: CHOC_NAMES[id] }));
          msg.textContent = `${CHOC_NAMES[id]} : réussi !`;
          steps.querySelectorAll('.ch-step').forEach((e) => e.classList.add('done'));
          await sleep(1300);
          bowl.classList.remove('done');
          msg.textContent = '';
          if (!alive) return;
          if (chocDone(s)) {
            const out = await finishGame({ game: 'choc', who: 'all', score: chocScore(s.mistakes), stars: chocStars(s.mistakes), made: [...s.made] });
            if (!alive) return;
            if (out === 'again') void start(); else exit();
            return;
          }
          busy = false;
          renderRecipe();
        }
      }

      function wireDrag(b: HTMLElement, ing: IngredientId): void {
        let ghost: HTMLElement | null = null;
        let sx = 0; let sy = 0; let moved = false; let pid = -1;
        const over = (x: number, y: number) => { const r = bowl.getBoundingClientRect(); return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12; };
        b.addEventListener('pointerdown', (e) => {
          if (busy) return;
          pid = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
          try { b.setPointerCapture(pid); } catch { /* ignoré */ }
        });
        b.addEventListener('pointermove', (e) => {
          if (e.pointerId !== pid) return;
          if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
            moved = true;
            ghost = h('img.ch-ghost', { src: ingredientUrl(ing, 72), alt: '' });
            document.body.append(ghost);
            b.classList.add('lifted');
          }
          if (ghost) { ghost.style.transform = `translate(${e.clientX - 36}px, ${e.clientY - 60}px)`; bowl.classList.toggle('hot', over(e.clientX, e.clientY)); }
        });
        const end = (e: PointerEvent, cancel: boolean) => {
          if (e.pointerId !== pid) return;
          pid = -1;
          b.classList.remove('lifted'); bowl.classList.remove('hot');
          ghost?.remove(); ghost = null;
          if (cancel) return;
          if (!moved) { audio.play('button'); void tryPick(ing, b); }
          else if (over(e.clientX, e.clientY)) void tryPick(ing, b);
          // relâché hors du bol : annulé, sans erreur
        };
        b.addEventListener('pointerup', (e) => end(e, false));
        b.addEventListener('pointercancel', (e) => end(e, true));
      }
      renderRecipe();
    };
    void start();
  });
}
