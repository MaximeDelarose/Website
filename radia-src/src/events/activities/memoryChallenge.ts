/** Défi mémoire d'une enfant : jeu de paires puis séquence à reproduire ; 1 à 3 étoiles, ton toujours positif. */
import { h } from '../../ui/dom';
import { makeCanvas } from '../../game/art/kit';
import { drawKid, type KidPose } from '../../game/art/world/kids';
import { cardBackUrl, symbolUrl } from '../games/action/art';
import { endCard, injectCss, introCard, pick } from '../games/action/common';
import { buildDeck, checkInput, finalStars, gridFor, pairStars, roundLengths, sequence, seqStars, starScore } from '../games/action/memory';
import type { KidId } from '../../data/world/ids';
import type { Activity } from '../types';

const PADS = [{ c: '#ff75a8', g: '♥' }, { c: '#8e7bc4', g: '☾' }, { c: '#f3b73c', g: '★' }, { c: '#5fbf8a', g: '✿' }];

const activity: Activity = async (ctx) => {
  injectCss();
  const kid: KidId = ctx.params.kid === 'kid1' || ctx.params.kid === 'kid3' ? ctx.params.kid : 'kid2';
  const level = Math.max(1, Math.min(3, Math.round(Number(ctx.params.level) || 1)));
  const name = ctx.kidName(kid);
  const grid = gridFor(level);
  const deck = buildDeck(ctx.rng, grid.pairs);

  const mascot = (pose: KidPose, w = 52, hh = 64): HTMLCanvasElement => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = makeCanvas(w * dpr, hh * dpr); c.style.cssText = `width:${w}px;height:${hh}px;flex-shrink:0`;
    const g = c.getContext('2d')!; g.scale(dpr, dpr);
    drawKid(g, kid, pose, w, hh, 0.4);
    return c;
  };
  const bubbleTx = h('span', { style: 'flex:1;font-size:15px;line-height:1.25' }, '');
  const bubbleImg = h('div', { style: 'flex-shrink:0' }, mascot('wave'));
  const bubble = h('div', { style: 'display:flex;align-items:center;gap:8px;background:#fffaf5;border-radius:16px;padding:4px 10px;box-shadow:0 0 0 2.5px #b9a5e8;min-height:58px;flex-shrink:0;margin-bottom:6px' }, bubbleImg, bubbleTx);
  const say = (pose: KidPose, text: string): void => { bubbleImg.replaceChildren(mascot(pose)); bubbleTx.textContent = text; };

  ctx.header(`Le défi de ${name}`, 'Cartes, puis séquence');
  await introCard(ctx, { title: `Défi de ${name}`, text: 'Retrouve toutes les paires de cartes, puis rejoue la séquence de lumières !', art: mascot('wave', 80, 100) });
  if (!ctx.isAlive()) return { score: 0, ok: false };
  ctx.root.append(bubble);

  // ------------------------------------------------ 1) paires
  const moves = await new Promise<{ moves: number; secs: number }>((resolve) => {
    const hud = h('div.ea-hud', h('span.ea-tag', 'Coups : 0'), h('span.ea-tag', `Paires : 0 / ${grid.pairs}`));
    const board = h('div', { style: `display:grid;grid-template-columns:repeat(${grid.cols},1fr);gap:8px;align-content:start;padding:4px;flex:1;min-height:0` });
    ctx.root.append(hud, board);
    say('wave', `${name} : « À toi de jouer ! Retourne deux cartes. »`);
    const cards: HTMLElement[] = [];
    let first = -1; let lock = false; let nMoves = 0; let found = 0;
    const t0 = performance.now();
    deck.forEach((sym, i) => {
      const el = h('button.ea-mc', { type: 'button', 'aria-label': 'Carte' }, h('div.in', h('div.b', h('img', { src: cardBackUrl(), alt: '' })), h('div.f', h('img', { src: symbolUrl(sym), alt: '' }))));
      el.addEventListener('click', () => {
        if (lock || el.classList.contains('up')) return;
        el.classList.add('up'); ctx.sound('page');
        if (first < 0) { first = i; return; }
        const a = first; first = -1; nMoves++;
        (hud.children[0] as HTMLElement).textContent = `Coups : ${nMoves}`;
        if (deck[a] === deck[i]) {
          found++;
          (hud.children[1] as HTMLElement).textContent = `Paires : ${found} / ${grid.pairs}`;
          ctx.later(() => {
            for (const k of [a, i]) { cards[k].classList.add('ok'); ctx.pop(cards[k]); }
            ctx.sound('pop3');
            say('happy', `${name} : « ${pick(['Bravo, une paire !', 'Oh oui, bien vu !', 'Quelle mémoire !', 'Trop fort !'], ctx.rng)} »`);
            if (found === grid.pairs) ctx.later(() => resolve({ moves: nMoves, secs: (performance.now() - t0) / 1000 }), 700);
          }, 380);
        } else {
          lock = true;
          ctx.later(() => { cards[a].classList.remove('up'); el.classList.remove('up'); lock = false; ctx.sound('drop'); say('think', `${name} : « ${pick(['Presque ! On réessaie.', 'Hmm, pas celles-là…', 'Je les ai vues, tu verras.'], ctx.rng)} »`); }, 850);
        }
      });
      cards.push(el); board.append(el);
    });
    ctx.onDispose(() => { hud.remove(); board.remove(); });
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };
  const ps = pairStars(moves.moves, grid.pairs, moves.secs);
  // retire le plateau
  Array.from(ctx.root.children).forEach((c) => { if (c !== bubble && !c.classList.contains('ev-head') && !c.classList.contains('ea-card')) c.remove(); });

  // ------------------------------------------------ 2) séquence
  say('wave', `${name} : « Maintenant, retiens l’ordre des lumières ! »`);
  const status = h('div.ea-hud', h('span.ea-tag', 'Manche 1'), h('span.ea-tag', 'Regarde…'));
  const pads = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;min-height:0;padding:6px 4px 8px' });
  const padEls = PADS.map((p, i) => { const b = h('button.ea-pad', { type: 'button', style: `background:linear-gradient(${p.c},${p.c}cc)` }, p.g) as HTMLButtonElement; b.dataset.i = String(i); pads.append(b); return b; });
  ctx.root.append(status, pads);
  const light = async (i: number, ms = 520): Promise<void> => {
    padEls[i].classList.add('lit'); ctx.sound((['pop1', 'pop2', 'pop3', 'sparkle'] as const)[i]);
    await ctx.wait(ms); padEls[i].classList.remove('lit'); await ctx.wait(160);
  };
  let retries = 0;
  const lens = roundLengths(level);
  for (let r = 0; r < lens.length; r++) {
    const seq = sequence(ctx.rng, lens[r]);
    (status.children[0] as HTMLElement).textContent = `Manche ${r + 1} / ${lens.length}`;
    let solved = false;
    while (!solved) {
      if (!ctx.isAlive()) return { score: 0, ok: false };
      (status.children[1] as HTMLElement).textContent = 'Regarde…';
      pads.style.pointerEvents = 'none';
      await ctx.wait(500);
      for (const i of seq) { if (!ctx.isAlive()) return { score: 0, ok: false }; await light(i); }
      (status.children[1] as HTMLElement).textContent = 'À toi !'; ctx.pop(status.children[1] as HTMLElement);
      pads.style.pointerEvents = '';
      const res = await new Promise<'done' | 'wrong'>((resolve) => {
        const input: number[] = [];
        const handlers: Array<() => void> = [];
        padEls.forEach((b, i) => {
          const fn = (): void => {
            input.push(i); b.classList.add('lit'); ctx.later(() => b.classList.remove('lit'), 180); ctx.sound((['pop1', 'pop2', 'pop3', 'sparkle'] as const)[i]);
            const c = checkInput(seq, input);
            if (c === 'ok') return;
            handlers.forEach((x) => x());
            resolve(c);
          };
          b.addEventListener('pointerdown', fn);
          handlers.push(() => b.removeEventListener('pointerdown', fn));
        });
        ctx.onDispose(() => handlers.forEach((x) => x()));
      });
      if (res === 'done') { solved = true; ctx.sound('reward'); ctx.confetti(14); say('happy', `${name} : « ${pick(['Manche réussie, hourra !', 'Tu as tout retenu !', 'Magnifique !'], ctx.rng)} »`); await ctx.wait(900); }
      else { retries++; say('think', `${name} : « Pas grave, on regarde encore une fois ! »`); await ctx.wait(1000); }
    }
  }
  const ss = seqStars(retries);
  const stars = finalStars(ps, ss);
  const score = starScore(stars);
  say('happy', `${name} : « On a réussi ensemble ! »`);
  await endCard(ctx, {
    title: stars === 3 ? 'Trois étoiles, bravo !' : stars === 2 ? 'Deux belles étoiles !' : 'Une étoile et plein de fierté !',
    stars,
    art: mascot('happy', 70, 88),
    lines: [`${moves.moves} coups en ${Math.round(moves.secs)} s pour les paires.`, `${name} : « On rejoue bientôt ? »`],
  });
  return { score, ok: true, data: { stars, moves: moves.moves } };
};
export default activity;
