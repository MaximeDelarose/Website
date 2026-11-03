import { portraitCanvas, fullCanvas, medallionCanvas, crownCanvas, drawRadiaFull, drawAugusteFull } from '../src/game/art/characters';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'faces';
const who = (q.get('w') ?? 'radia') as 'radia' | 'auguste';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
const exprs = ['neutral', 'smile', 'laugh', 'surprise', 'sad', 'love', 'tease', 'shy'] as const;
if (mode === 'faces') {
  for (const w of ['radia', 'auguste'] as const) { const r = row(); for (const e of exprs) r.append(portraitCanvas(w, { expr: e }, 220)); }
  const r = row();
  r.append(portraitCanvas('radia', { outfit: 'stripes', expr: 'smile' }, 220), portraitCanvas('radia', { outfit: 'royal', expr: 'love' }, 220), portraitCanvas('radia', { blink: true }, 220), portraitCanvas('auguste', { blink: true }, 220), medallionCanvas('radia', {}, 120), medallionCanvas('auguste', {}, 120), medallionCanvas('radia', { outfit: 'royal' }, 120), crownCanvas(96));
} else if (mode === 'big') {
  out.append(portraitCanvas(who, { expr: (q.get('e') as never) ?? 'neutral', outfit: (q.get('o') as never) ?? 'hoodie' }, 800));
} else if (mode === 'duo') {
  const r = row();
  r.append(fullCanvas('radia', { outfit: 'royal', expr: 'smile' }, 400), fullCanvas('auguste', { expr: 'smile' }, 400));
} else if (mode === 'full') {
  const r = row();
  for (const o of [{}, { outfit: 'stripes' }, { outfit: 'royal', arms: 'wave' }, { step: 1 }, { arms: 'heart' }, { arms: 'open', step: -1 }] as const) r.append(fullCanvas('radia', o as never, 200));
  const r2 = row();
  for (const o of [{}, { arms: 'wave' }, { step: -1 }, { step: 1 }, { arms: 'heart' }, { arms: 'open' }] as const) r2.append(fullCanvas('auguste', o as never, 200));
} else if (mode === 'perf') {
  const c = document.createElement('canvas'); c.width = 240; c.height = 600; const ctx = c.getContext('2d')!;
  const res: string[] = [];
  for (const [n, f] of [['radia', drawRadiaFull], ['auguste', drawAugusteFull]] as const) {
    for (let i = 0; i < 5; i++) { ctx.clearRect(0, 0, 240, 600); f(ctx, { expr: 'smile' }); }
    const t = performance.now(); const N = 60;
    for (let i = 0; i < N; i++) { ctx.clearRect(0, 0, 240, 600); f(ctx, { expr: 'smile', step: Math.sin(i) * 0.3 }); }
    res.push(`${n}: ${((performance.now() - t) / N).toFixed(2)} ms`);
  }
  out.textContent = res.join(' | ');
  console.log('PERF', res.join(' | '));
}
(window as unknown as { done: boolean }).done = true;
