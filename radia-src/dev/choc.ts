import { drawChocolate, drawChocBox, drawChocShop, drawTopping, drawMeltPot, drawChocSilhouette, TOPPINGS } from '../src/game/art/world/chocolate';
import { CHOC_IDS } from '../src/data/world/ids';
import { paint } from '../src/game/art/kit';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'items';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
if (mode === 'items') {
  const r = row();
  for (const id of CHOC_IDS) r.append(paint(150, 150, 2, (c) => drawChocolate(c, id, 150)));
  const r2 = row();
  r2.append(paint(200, 200, 2, (c) => drawChocBox(c, 200, ['milk', 'dark', 'heart', 'praline'])));
  r2.append(paint(200, 200, 2, (c) => drawChocBox(c, 200, ['truffle'])));
  for (const id of CHOC_IDS.slice(0, 3)) r2.append(paint(100, 100, 2, (c) => drawChocSilhouette(c, id, 100)));
  const r3 = row();
  for (const t of TOPPINGS) r3.append(paint(90, 90, 2, (c) => drawTopping(c, t, 90)));
  r3.append(paint(260, 200, 2, (c) => drawMeltPot(c, 260, 200, 0.6, 1.2, 1)));
} else if (mode === 'shop') {
  const r = row();
  for (const lv of [1, 3, 5]) {
    const cv = document.createElement('canvas'); const w = 393, h = 330, dpr = 1;
    cv.width = w; cv.height = h; cv.style.width = w + 'px';
    const ctx = cv.getContext('2d')!; drawChocShop(ctx, w, h, lv, 1.0, dpr); r.append(cv);
  }
}
(window as unknown as { done: boolean }).done = true;
