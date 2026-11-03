import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { paint } from '../src/game/art/kit';
import { drawGenerator, drawRequester, drawDiamond, drawEnergy, drawChest, drawCard, type GenKind } from '../src/game/art/generators';
import { drawDecorScene, drawDecorIcon, DECOR_IDS } from '../src/game/art/decor';
import { drawItem } from '../src/game/art/items';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const row = (title: string, cls = '') => { out.append(Object.assign(document.createElement('h4'), { textContent: title })); const d = document.createElement('div'); d.className = 'row ' + cls; out.append(d); return d; };
const mode = q.get('m') ?? 'icons';
await document.fonts.load('700 20px Fredoka');
if (mode === 'icons') {
  for (const sz of [128, 60]) {
    const r = row(`générateurs ${sz} + objets`);
    for (const k of [1, 2, 3, 4] as GenKind[]) r.append(paint(sz, sz, 2, (c) => drawGenerator(c, k, sz)));
    r.append(paint(sz, sz, 2, (c) => drawItem(c, { c: 'flowers', l: 4 }, sz)), paint(sz, sz, 2, (c) => drawItem(c, { c: 'paris', l: 2 }, sz)), paint(sz, sz, 2, (c) => drawItem(c, { c: 'chess', l: 5 }, sz)));
  }
  const r2 = row('avatars / icônes', 'lav');
  for (const w of ['cat', 'pawn', 'florist'] as const) r2.append(paint(96, 96, 2, (c) => drawRequester(c, w, 96)));
  r2.append(paint(80, 80, 2, (c) => drawDiamond(c, 80)), paint(80, 80, 2, (c) => drawEnergy(c, 80)), paint(96, 96, 2, (c) => drawChest(c, 96, false)), paint(96, 96, 2, (c) => drawChest(c, 96, true)), paint(28, 28, 2, (c) => drawDiamond(c, 28)), paint(28, 28, 2, (c) => drawEnergy(c, 28)));
  const r3 = row('carte');
  r3.append(paint(320, 200, 2, (c) => drawCard(c, 320, 200)));
  const r4 = row('décorations');
  for (const id of DECOR_IDS) r4.append(paint(100, 100, 2, (c) => drawDecorIcon(c, id, 100)));
} else {
  const sets = [new Set<string>(), new Set<string>(DECOR_IDS.slice(0, 6)), new Set<string>(DECOR_IDS)];
  const r = row('scènes');
  const W = Number(q.get('w') ?? 300), H = Number(q.get('h') ?? 400);
  const cvs = sets.map((s) => { const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; cv.style.width = W + 'px'; r.append(cv); return { cv, s }; });
  const t0 = performance.now();
  // mesure
  const ctx = cvs[2].cv.getContext('2d')!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  drawDecorScene(ctx, W, H, cvs[2].s, 0);
  const N = 60; const a = performance.now();
  for (let i = 0; i < N; i++) drawDecorScene(ctx, W, H, cvs[2].s, i * 0.05);
  (window as unknown as { timing: number }).timing = (performance.now() - a) / N;
  void t0;
  const T = Number(q.get('t') ?? 1.2);
  for (const { cv, s } of cvs) { const c = cv.getContext('2d')!; c.setTransform(2, 0, 0, 2, 0, 0); drawDecorScene(c, W, H, s, T); }
  const p = document.createElement('p'); p.textContent = `timing ${(window as unknown as { timing: number }).timing.toFixed(2)} ms`; out.append(p);
}
