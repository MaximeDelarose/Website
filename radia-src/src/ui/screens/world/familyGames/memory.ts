/** Interface de « Mémoire » : 2 manches de paires (aperçu puis sans) + défi de logique. */
import { h, tap } from '../../../dom';
import { audio, reducedFx } from '../../../../core/app';
import { answerPuzzle, flipCard, hideMismatch, makePuzzle, memoryStars, newPairs, pairsDone, pairsScore, MEMORY_CARDS, PUZZLE_POINTS, type PairsState } from '../../../../game/world/familyGames/memory';
import { mulberry32 } from '../../../../game/world/familyGames/rng';
import { MEMORY_SYMBOLS } from '../../../../data/world/family';
import type { KidId } from '../../../../data/world/ids';
import { cardBackUrl, symbolUrl } from './art';
import { finishGame, floatFx, gameShell } from './common';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function playMemory(kid: KidId): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    const exit = () => { alive = false; resolve(); };

    const start = async (): Promise<void> => {
      const rng = mulberry32((Date.now() ^ 0xc2b2ae35) >>> 0);
      const { info, stage } = gameShell('memory', kid, exit);
      const banner = h('div.mem-banner');
      const scoreEl = h('div.mem-total');
      info.append(banner, scoreEl);
      let total = 0;
      const setTotal = () => { scoreEl.textContent = `Score : ${total}`; };
      setTotal();

      const playPairs = async (round: 1 | 2): Promise<void> => {
        const s: PairsState = newPairs(rng);
        banner.textContent = round === 1 ? 'Manche 1/3 · Regarde bien les cartes !' : 'Manche 2/3 · Sans aperçu : à toi !';
        const grid = h('div.mem-grid');
        const cards: HTMLButtonElement[] = [];
        for (let i = 0; i < MEMORY_CARDS; i++) {
          const b = h('button.mem-card.locked', { 'aria-label': 'Carte', on: { click: tap(() => flip(i), { sound: false, delay: 80 }) } },
            h('span.mem-in', h('img.mem-face.back', { src: cardBackUrl(), alt: '' }), h('span.mem-face.front', h('img', { src: symbolUrl(MEMORY_SYMBOLS[s.symbols[i]]), alt: MEMORY_SYMBOLS[s.symbols[i]] })))) as HTMLButtonElement;
          cards.push(b); grid.append(b);
        }
        stage.replaceChildren(grid);
        let input = false;
        let done: () => void = () => {};
        const finished = new Promise<void>((r) => { done = r; });
        if (round === 1) {
          await sleep(500);
          cards.forEach((c) => c.classList.add('up'));
          audio.play('whoosh');
          await sleep(reducedFx() ? 3600 : 3000);
          if (!alive) return;
          cards.forEach((c) => c.classList.remove('up'));
          audio.play('whoosh');
          await sleep(450);
        }
        cards.forEach((c) => c.classList.remove('locked'));
        input = true;
        banner.textContent = `Manche ${round}/3 · Retrouve les paires`;
        async function flip(i: number): Promise<void> {
          if (!input || !alive) return;
          const r = flipCard(s, i);
          if (r === 'ignored') return;
          cards[i].classList.add('up');
          audio.play('pop1', 1 + (r === 'match' ? 0.2 : 0));
          if (r === 'match') {
            const idx = s.symbols.map((v, k) => (s.matched[k] && v === s.symbols[i] ? k : -1)).filter((k) => k >= 0);
            await sleep(250);
            idx.forEach((k) => cards[k].classList.add('match'));
            audio.play('sparkle');
            const g = grid.getBoundingClientRect(); const c = cards[i].getBoundingClientRect();
            floatFx(stage, '♥', 'good', c.left - g.left + c.width / 2, c.top - g.top);
            if (pairsDone(s)) { input = false; await sleep(600); done(); }
          } else if (r === 'miss') {
            input = false;
            await sleep(750);
            if (!alive) return;
            const p = s.pending!;
            hideMismatch(s);
            p.forEach((k) => cards[k].classList.remove('up'));
            input = true;
          }
        }
        await finished;
        if (!alive) return;
        const pts = pairsScore(s.misses, round);
        total += pts; setTotal();
        banner.textContent = `Manche ${round} terminée : +${pts} (${s.misses} erreur${s.misses > 1 ? 's' : ''})`;
        audio.play('reward');
        await sleep(1100);
      };

      const playLogic = async (): Promise<void> => {
        for (let q = 0; q < 3; q++) {
          if (!alive) return;
          const p = makePuzzle(rng, q as 0 | 1 | 2);
          banner.textContent = `Manche 3/3 · Défi de logique ${q + 1}/3 : quelle image continue la suite ?`;
          const seq = h('div.mem-seq', ...p.seq.map((v) => h('div.mem-tile', h('img', { src: symbolUrl(MEMORY_SYMBOLS[v]), alt: '' }))), h('div.mem-tile.qm', '?'));
          const opts = h('div.mem-options');
          stage.replaceChildren(seq, opts);
          let chosen = false;
          const picked = new Promise<boolean>((res) => {
            p.options.forEach((o) => {
              const b = h('button.mem-opt', { 'aria-label': 'Choix', on: { click: tap(() => {
                if (chosen) return;
                chosen = true;
                const ok = answerPuzzle(p, o);
                b.classList.add(ok ? 'good' : 'bad');
                if (!ok) opts.querySelectorAll('.mem-opt').forEach((x, i) => { if (p.options[i] === p.answer) x.classList.add('good'); });
                audio.play(ok ? 'reward' : 'pop3');
                res(ok);
              }, { sound: false }) } }, h('img', { src: symbolUrl(MEMORY_SYMBOLS[o]), alt: '' }));
              opts.append(b);
            });
          });
          const ok = await picked;
          if (ok) { total += PUZZLE_POINTS; setTotal(); floatFx(stage, `+${PUZZLE_POINTS}`, 'good', 180, 90); }
          const qm = seq.querySelector('.qm') as HTMLElement;
          qm.replaceChildren(h('img', { src: symbolUrl(MEMORY_SYMBOLS[p.answer]), alt: '' })); qm.classList.add('shown');
          await sleep(1200);
        }
      };

      await playPairs(1); if (!alive) return;
      await playPairs(2); if (!alive) return;
      await playLogic(); if (!alive) return;
      const out = await finishGame({ game: 'memory', who: kid, score: total, stars: memoryStars(total) });
      if (!alive) return;
      if (out === 'again') void start(); else exit();
    };
    void start();
  });
}
