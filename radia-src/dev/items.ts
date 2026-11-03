import { drawItem } from '../src/game/art/items';
import { allItems, itemName } from '../src/data/items';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const sizes = (q.get('s') ?? '128,56').split(',').map(Number);
const t0 = performance.now();
for (const bg of ['#FFF4E8', '#B9A5E8']) {
  for (const s of sizes) {
    const row = document.createElement('div'); row.className = 'row'; row.style.background = bg; out.append(row);
    for (const it of allItems()) {
      const d = document.createElement('div'); d.className = 'cell'; d.style.setProperty('--w', s + 'px');
      const c = document.createElement('canvas'); const dpr = 2; c.width = s * dpr; c.height = s * dpr; c.style.width = s + 'px';
      const ctx = c.getContext('2d')!; ctx.scale(dpr, dpr); drawItem(ctx, it, s);
      d.append(c); if (s >= 100) d.append(itemName(it)); row.append(d);
    }
  }
}
// chrono : 43 icônes à 128 px
const T = performance.now();
for (let k = 0; k < 5; k++) for (const it of allItems()) { const c = document.createElement('canvas'); c.width = 128; c.height = 128; drawItem(c.getContext('2d')!, it, 128); }
const per = (performance.now() - T) / 5;
document.title = `43 icons @128: ${per.toFixed(1)} ms (page ${(performance.now() - t0).toFixed(0)})`;
console.warn(document.title);
