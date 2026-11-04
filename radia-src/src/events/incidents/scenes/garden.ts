/** Scènes du jardin : arrosage au doigt (geste) et chasse aux mauvaises herbes. */
import { h } from '../../../ui/dom';
import { audio } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { paint } from '../../../game/art/kit';
import { drawFlower } from '../../../game/art/world/garden';
import type { FlowerId } from '../../../data/world/ids';
import { openFrame, confettiBurst } from './frame';
import { rng, shuffle } from '../rng';

const PLANTS: FlowerId[] = ['rose', 'daisy', 'tulip', 'peony', 'lavender', 'lily', 'hydrangea', 'orchid'];
const flowerCanvas = (id: FlowerId, size: number): HTMLCanvasElement => paint(size, size, 2, (c) => drawFlower(c, id, 3, size));

export function runWatering(seed: number): Promise<boolean> {
  const f = openFrame('Arroser le jardin', 'Glisse ton doigt sur les fleurs pour les arroser.', 'gd');
  const ids = shuffle(PLANTS, rng(seed)).slice(0, 6);
  const grid = h('div.gd-grid');
  const can = h('div.gd-can', '🫗');
  const pots = ids.map((id) => {
    const cv = flowerCanvas(id, 92);
    const fill = h('i');
    const el = h('div.gd-pot.wilt', h('div.gd-flower', cv), h('div.gd-meter', fill));
    grid.append(el);
    return { el, fill, v: 0, done: false };
  });
  f.body.append(grid, can, h('p.inc-foot', 'Gratuit, sans limite de temps ♡'));
  let last = performance.now();
  let finished = false;
  const drops: HTMLElement[] = [];
  const drip = (x: number, y: number) => {
    if (drops.length > 24) return;
    const d = h('i.gd-drop', { style: `left:${x}px;top:${y}px` });
    drops.push(d); f.layer.append(d);
    window.setTimeout(() => { d.remove(); drops.splice(drops.indexOf(d), 1); }, 600);
  };
  const water = (x: number, y: number, dt: number) => {
    can.style.transform = `translate(${x - 24}px, ${y - 60}px) rotate(-25deg)`;
    can.classList.add('on');
    for (const p of pots) {
      if (p.done) continue;
      const r = p.el.getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 20 && y <= r.bottom + 8) {
        p.v = Math.min(1, p.v + dt / 650);
        p.fill.style.width = `${Math.round(p.v * 100)}%`;
        drip(x + (Math.random() - 0.5) * 24, y);
        if (p.v >= 1) {
          p.done = true; p.el.classList.remove('wilt'); p.el.classList.add('fresh');
          audio.play('pop2'); haptic('merge');
        }
      }
    }
    if (!finished && pots.every((p) => p.done)) {
      finished = true;
      audio.play('reward'); haptic('reward');
      f.setHint('Le jardin sourit de toutes ses fleurs ♡');
      f.later(() => confettiBurst(f.layer), 200);
      f.finish(true, 1700);
    }
  };
  let down = false;
  const move = (e: PointerEvent) => {
    const now = performance.now(); const dt = Math.min(120, now - last); last = now;
    if (down) water(e.clientX, e.clientY, dt);
  };
  const dn = (e: PointerEvent) => { down = true; last = performance.now(); water(e.clientX, e.clientY, 120); };
  const up = () => { down = false; can.classList.remove('on'); };
  f.layer.addEventListener('pointerdown', dn);
  f.layer.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  f.onDispose(() => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); });
  return f.result;
}

export function runWeeds(seed: number): Promise<boolean> {
  const f = openFrame('Chasse aux mauvaises herbes', 'Touche chaque mauvaise herbe pour l’arracher.', 'gd');
  const r = rng(seed);
  const grid = h('div.gd-grid.weeds');
  const total = 8;
  let left = total;
  const counter = h('p.inc-foot', `${left} à arracher`);
  const cells = Array.from({ length: 12 }, (_, i) => i);
  const spots = new Set(shuffle(cells, r).slice(0, total));
  for (const i of cells) {
    const id = PLANTS[i % PLANTS.length];
    const cell = h('button.gd-pot.weed-cell', { 'aria-label': spots.has(i) ? 'Mauvaise herbe' : 'Fleur' }, h('div.gd-flower', flowerCanvas(id, 64)));
    if (spots.has(i)) {
      const w = h('span.weed', '🌿');
      cell.append(w);
      cell.addEventListener('click', () => {
        if (!cell.classList.contains('has')) return;
        cell.classList.remove('has'); cell.classList.add('pulled');
        left--; counter.textContent = left ? `${left} à arracher` : 'Tout est propre !';
        audio.play('pop3'); haptic('drop');
        if (!left) { audio.play('reward'); haptic('reward'); f.later(() => confettiBurst(f.layer), 150); f.finish(true, 1500); }
      });
      cell.classList.add('has');
    }
    grid.append(cell);
  }
  f.body.append(grid, counter);
  return f.result;
}
