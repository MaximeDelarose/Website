/** Interface de « Bouquet » : 4×4 de fleurs à fusionner, papillons et bulles de savon. */
import { h, tap } from '../../../dom';
import { audio, reducedFx } from '../../../../core/app';
import { bouquetDone, bouquetScore, bouquetStars, newBouquet, tapCell, BOUQUET_GOAL, BOUQUET_SIZE } from '../../../../game/world/familyGames/bouquet';
import { mulberry32 } from '../../../../game/world/familyGames/rng';
import type { KidId } from '../../../../data/world/ids';
import { butterflyUrl, flowerUrl } from './art';
import { finishGame, floatFx, gameShell } from './common';

export function playBouquet(kid: KidId): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    const exit = () => { alive = false; resolve(); };

    const start = async (): Promise<void> => {
      const s = newBouquet(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0));
      const { info, stage } = gameShell('bouquet', kid, exit);
      const slots = h('div.bq-slots', ...Array.from({ length: BOUQUET_GOAL }, () => h('div.bq-slot')));
      const counter = h('div.bq-count');
      info.append(slots, counter);
      const grid = h('div.bq-grid');
      const fxLayer = h('div.bq-fx');
      stage.append(h('div.bq-field', fxLayer, grid));
      // bulles de savon décoratives
      if (!reducedFx()) {
        for (let i = 0; i < 7; i++) fxLayer.append(h('i.fg-bubble', { style: `left:${8 + i * 13}%;width:${14 + (i % 3) * 8}px;height:${14 + (i % 3) * 8}px;animation-delay:${-i * 1.7}s;animation-duration:${9 + (i % 4) * 2}s` }));
        for (let i = 0; i < 2; i++) fxLayer.append(h('img.fg-butterfly', { src: butterflyUrl(), alt: '', style: `top:${12 + i * 38}%;animation-delay:${-i * 6}s` }));
      }
      const cells: HTMLButtonElement[] = [];
      for (let i = 0; i < BOUQUET_SIZE; i++) {
        const img = h('img', { alt: '', draggable: false });
        const b = h('button.bq-cell', { 'aria-label': 'Fleur', on: { click: tap(() => press(i), { sound: false, delay: 90 }) } }, img) as HTMLButtonElement;
        cells.push(b); grid.append(b);
      }
      let busy = false;
      const render = (bloom: number[] = []) => {
        s.cells.forEach((lv, i) => {
          const img = cells[i].firstElementChild as HTMLImageElement;
          const src = flowerUrl(lv, 96);
          if (img.getAttribute('src') !== src) img.src = src;
          cells[i].classList.toggle('sel', s.sel === i);
          if (bloom.includes(i)) { cells[i].classList.remove('bloom'); void cells[i].offsetWidth; cells[i].classList.add('bloom'); }
        });
        slots.querySelectorAll('.bq-slot').forEach((el, i) => {
          const full = i < s.collected;
          if (full && !el.firstChild) { el.append(h('img', { src: flowerUrl(3, 72), alt: '' })); el.classList.add('full'); }
        });
        counter.textContent = `Grosses fleurs : ${s.collected}/${BOUQUET_GOAL} · Fusions : ${s.moves}`;
      };
      render();

      const burst = (i: number, n: number) => {
        if (reducedFx()) return;
        const r = cells[i].getBoundingClientRect(); const p = fxLayer.getBoundingClientRect();
        for (let k = 0; k < n; k++) {
          const b = h('img.fg-butterfly.burst', { src: butterflyUrl(), alt: '', style: `left:${r.left - p.left + r.width / 2 - 16}px;top:${r.top - p.top}px;--dx:${(k - 1) * 70 + (Math.random() - 0.5) * 30}px;--dy:${-90 - Math.random() * 60}px` });
          fxLayer.append(b); window.setTimeout(() => b.remove(), 1700);
        }
      };

      async function press(i: number): Promise<void> {
        if (busy || !alive) return;
        const e = tapCell(s, i);
        if (e.type === 'none') return;
        if (e.type === 'select') { audio.play('pop1', 1 + s.cells[i] * 0.08); render(); return; }
        if (e.type === 'deselect') { audio.play('pop3'); render(); return; }
        // fusion
        audio.play(e.collected ? 'rare' : 'pop2', 1 + e.level * 0.1);
        const r = cells[e.to].getBoundingClientRect(); const p = fxLayer.getBoundingClientRect();
        floatFx(fxLayer, e.collected ? 'Superbe !' : '✦', 'good', r.left - p.left + r.width / 2, r.top - p.top);
        render([e.to, e.from]);
        if (e.collected) { burst(e.to, 3); audio.play('sparkle'); }
        if (bouquetDone(s)) {
          busy = true;
          await new Promise((res) => window.setTimeout(res, 900));
          if (!alive) return;
          const moves = s.moves;
          const out = await finishGame({ game: 'bouquet', who: kid, score: bouquetScore(moves), stars: bouquetStars(moves) });
          if (!alive) return;
          if (out === 'again') void start(); else exit();
        }
      }
    };
    void start();
  });
}
