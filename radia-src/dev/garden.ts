import { drawFlower, drawBouquet, drawGardenScene, drawFlowerSilhouette, type ScenePlot, type Stage } from '../src/game/art/world/garden';
import { FLOWER_IDS, type FlowerId } from '../src/data/world/ids';
import { paint } from '../src/game/art/kit';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'flowers';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
if (mode === 'flowers') {
  for (const id of FLOWER_IDS) {
    const r = row();
    for (const st of [0, 1, 2, 3] as Stage[]) r.append(paint(130, 130, 2, (c) => drawFlower(c, id, st, 130)));
    r.append(paint(130, 130, 2, (c) => drawFlowerSilhouette(c, id, 130)));
  }
} else if (mode === 'bouquet') {
  const r = row();
  const sets = [['rose', 'daisy', 'tulip'], ['peony', 'lavender', 'rose', 'lily'], ['magic', 'sunflower', 'orchid', 'hydrangea', 'rose'], ['rose', 'rose', 'rose']];
  for (const s of sets) r.append(paint(200, 200, 2, (c) => drawBouquet(c, s, 200)));
} else if (mode === 'scene') {
  const n = +(q.get('n') ?? 6);
  const cv = document.createElement('canvas');
  const w = 393, h = 540, dpr = 2;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  out.append(cv);
  const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const plots: (ScenePlot | null)[] = Array.from({ length: n }, (_, i) => (i === 0 ? null : { flower: FLOWER_IDS[(i - 1) % 10] as FlowerId, stage: ((i % 4) as Stage), progress: (i % 4) / 3 + 0.1 }));
  drawGardenScene(ctx, w, h, plots, 1.3, dpr);
}
(window as unknown as { done: boolean }).done = true;
if (mode === 'blooms') {
  const r = row();
  for (const id of FLOWER_IDS) r.append(paint(170, 170, 2, (c) => drawFlower(c, id, 3, 170)));
}
