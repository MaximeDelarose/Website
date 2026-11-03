import { portraitCanvas, fullCanvas, medallionCanvas } from '../src/game/art/characters';
const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'faces';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
if (mode === 'faces') {
  const exprs = ['neutral', 'smile', 'laugh', 'surprise', 'sad', 'love', 'tease', 'shy'] as const;
  let r = row();
  for (const e of exprs) r.append(portraitCanvas('radia', { expr: e }, 220));
  r = row();
  for (const e of exprs) r.append(portraitCanvas('auguste', { expr: e }, 220));
  r = row();
  r.append(portraitCanvas('radia', { outfit: 'stripes', expr: 'smile' }, 220), portraitCanvas('radia', { outfit: 'royal', expr: 'love' }, 220), portraitCanvas('radia', { blink: true }, 220), medallionCanvas('radia', {}, 120), medallionCanvas('auguste', {}, 120));
} else if (mode === 'big') {
  out.append(portraitCanvas('radia', { expr: q.get('e') as never ?? 'neutral' }, 800));
} else if (mode === 'full') {
  const r = row();
  for (const o of [{}, { outfit: 'stripes' }, { outfit: 'royal', arms: 'wave' }, { step: 1 }, { arms: 'heart' }] as const) r.append(fullCanvas('radia', o as never, 200));
  for (const o of [{}, { arms: 'wave' }, { step: -1 }, { arms: 'open' }] as const) r.append(fullCanvas('auguste', o as never, 200));
}
(window as unknown as { done: boolean }).done = true;
