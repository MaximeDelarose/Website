/** Scène : mini-jeu de plomberie (grille de tuyaux, rotation au toucher, animation de l'eau). */
import { h, tap } from '../../../ui/dom';
import { audio } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { openFrame, confettiBurst } from './frame';
import { dbg } from '../../../core/debug';
import { flow, generateLevel, rotateTile, solve, N, E, S, W, type PipeLevel } from '../pipes';

const NS = 'http://www.w3.org/2000/svg';
const BASE: Record<string, number> = { I: N | S, L: N | E, T: N | E | S, X: N | E | S | W };
const SEG: Record<number, string> = { [N]: 'M50 50V0', [E]: 'M50 50H100', [S]: 'M50 50V100', [W]: 'M50 50H0' };

function tileSvg(type: string): SVGElement {
  const m = BASE[type];
  const d = [N, E, S, W].filter((b) => m & b).map((b) => SEG[b]).join('');
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 100 100');
  s.innerHTML = `<path class="pp-out" d="${d}"/><path class="pp-in" d="${d}"/><circle class="pp-joint" cx="50" cy="50" r="13"/><circle class="pp-water" cx="50" cy="50" r="7"/>`;
  return s;
}

export function runPlumbing(seed: number): Promise<boolean> {
  const f = openFrame('Mini-jeu de plomberie', 'Touche les tuyaux pour les faire pivoter : l’eau doit aller du robinet à la sortie.', 'pp');
  let diff: 1 | 2 | 3 = 1;
  let lvl: PipeLevel = generateLevel(seed, diff);
  let nonce = 0;
  let locked = false;
  const tabs = h('div.pp-tabs');
  const board = h('div.pp-board');
  const leak = h('div.pp-leak', h('i'), h('i'), h('i'));
  f.body.append(tabs, h('div.pp-wrap', leak, board), h('button.btn.small.secondary.pp-new', { on: { click: tap(() => build(), { sound: false }) } }, 'Autre niveau'));

  const cells: HTMLElement[] = [];
  function renderTabs() {
    tabs.replaceChildren(...([1, 2, 3] as const).map((d) => h(`button.chip.pp-tab${d === diff ? '.on' : ''}`, { on: { click: tap(() => { diff = d; build(); }, { sound: false }) } }, d === 1 ? 'Facile' : d === 2 ? 'Moyen' : 'Difficile')));
  }
  function build() {
    nonce++;
    locked = false;
    lvl = generateLevel(seed + nonce * 101, diff);
    renderTabs();
    leak.classList.remove('off');
    board.style.setProperty('--n', String(lvl.n));
    board.replaceChildren();
    cells.length = 0;
    for (let y = 0; y < lvl.n; y++) for (let x = 0; x < lvl.n; x++) {
      const t = lvl.tiles[y][x];
      const b = h('button.pp-cell', { 'aria-label': 'Tuyau' }, tileSvg(t.type));
      // la rotation visuelle n'est jamais ramenée à 0 (pas de tour inverse) : on cumule
      let turns = t.rot + 4 * 8;
      b.style.setProperty('--r', String(turns * 90));
      b.addEventListener('click', () => {
        if (locked) return;
        rotateTile(lvl, x, y);
        turns++;
        b.style.setProperty('--r', String(turns * 90));
        b.classList.add('tap');
        window.setTimeout(() => b.classList.remove('tap'), 160);
        audio.play('pop4'); haptic('select');
        const fl = flow(lvl);
        cells.forEach((c, i) => c.classList.toggle('wet', fl.wet.has(i)));
        if (fl.solved) win();
      });
      cells.push(b);
      board.append(b);
    }
    board.prepend(h('div.pp-tap.src', { style: `--row:${lvl.src}` }, '🚰'), h('div.pp-tap.dst', { style: `--row:${lvl.dst}` }, '💧'));
    const fl = flow(lvl);
    cells.forEach((c, i) => c.classList.toggle('wet', fl.wet.has(i)));
  }
  function win() {
    if (locked) return;
    locked = true;
    audio.play('reward'); haptic('reward');
    cells.forEach((c, i) => { if (c.classList.contains('wet')) c.style.animationDelay = `${(i % lvl.n) * 70}ms`; c.classList.add('flow'); });
    f.setHint('Plus une goutte ! Le circuit est fermé ♡');
    leak.classList.add('off');
    f.later(() => confettiBurst(f.layer), 350);
    f.finish(true, 1900);
  }
  build();
  // outil de test (?debug) : rotations restant à faire pour résoudre le niveau courant
  dbg('plumbing', { todo: () => (solve(lvl) ?? []).map((p) => ({ x: p.x, y: p.y, clicks: (p.rot - lvl.tiles[p.y][p.x].rot + 4) & 3 })), n: () => lvl.n });
  return f.result;
}
