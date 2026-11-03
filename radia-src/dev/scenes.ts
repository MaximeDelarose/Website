import { drawBackground, drawMemory, type Theme, type Layer } from '../src/game/art/scenes';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const m = q.get('m') ?? 'bg';
const W = Number(q.get('w') ?? 393), H = Number(q.get('h') ?? 852);
const row = document.createElement('div'); row.className = 'row'; out.append(row);
const times: string[] = [];
const mk = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); row.append(c); return c;
};
if (m === 'bg') {
  const themes = (q.get('t') ?? 'title,garden,paris,souvenirs,royaume,monde').split(',') as Theme[];
  for (const t of themes) {
    mk(W, H, (c) => {
      for (const l of ['far', 'mid', 'near'] as Layer[]) {
        const t0 = performance.now(); drawBackground(c, t, W, H, l); times.push(`${t}/${l} ${(performance.now() - t0).toFixed(1)}`);
      }
      // zone du plateau simulée
      c.fillStyle = 'rgba(255,244,232,0.55)'; const s = Math.min(W - 24, H * 0.5); c.beginPath(); c.roundRect((W - s) / 2, H * 0.28, s, s, 20); c.fill();
    });
  }
} else {
  const ids = ['flowers', 'nord', 'arc', 'cinema', 'billard', 'promenade', 'royaume', 'monde'];
  for (const id of ids) mk(W, H, (c) => { const t0 = performance.now(); drawMemory(c, id, W, H); times.push(`${id} ${(performance.now() - t0).toFixed(1)}`); });
}
console.warn(times.join(' | '));
