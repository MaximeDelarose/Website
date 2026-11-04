import { describe, expect, it } from 'vitest';
import { findCssCollisions } from '../scripts/overlay-lib.mjs';

// pas de types Node dans le projet : import dynamique non typé (Vitest ne fournit pas les .css en texte brut)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fs: any = await import(/* @vite-ignore */ 'node:' + 'fs');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const walk = (d: string): { path: string; css: string }[] => (fs.readdirSync(d) as string[]).flatMap((f: string) => {
  const p = `${d}/${f}`;
  if (fs.statSync(p).isDirectory()) return walk(p);
  return p.endsWith('.css') ? [{ path: p, css: fs.readFileSync(p, 'utf8') as string }] : [];
});
const cssFiles = (): { path: string; css: string }[] => walk('src');

describe('feuilles de style : pas de collision de noms de classes', () => {
  const files = cssFiles();
  it('aucune classe simple n\'est déclarée dans deux feuilles différentes (bug .fx-layer, .ch-box…)', () => {
    const col = findCssCollisions(files);
    expect(col.map((c) => `.${c.cls} : ${c.defs.map((d) => d.path).join(' + ')}`)).toEqual([]);
  });
  it('le calque de paillettes et celui de la carrière ont des noms distincts', () => {
    const all = files.map((f) => f.css).join('\n');
    expect(/(^|[\s,}])\.fx-layer\s*\{/.test(all)).toBe(false);
    expect(all).toContain('.rd-sparkle-layer');
    expect(all).toContain('.car-fx-layer');
  });
  it('un calque qui part (leaving/out) ne capte plus le toucher', () => {
    const base = files.find((f) => f.path.endsWith('styles/base.css'))!.css;
    expect(base).toMatch(/#ui \.leaving,\s*#ui \.out\s*\{\s*pointer-events:\s*none\s*!important/);
  });
});
