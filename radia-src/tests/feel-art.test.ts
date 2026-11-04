import { describe, it, expect } from 'vitest';
import { drawItem } from '../src/game/art/items';
import { drawGenerator } from '../src/game/art/generators';
import { EXTRA_ITEMS } from '../src/game/art/items2';

/** Faux contexte 2D : enregistre les opérations (aucun canvas en Node). */
function fakeCtx() {
  const log: string[] = [];
  const grad = { addColorStop: (o: number, c: string) => { log.push(`g${o}${c}`); } };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(_t, k: string) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a: number[]) => { log.push(`${k}${a.map((n) => n.toFixed(1)).join(',')}`); return grad; };
      if (k in target) return target[k];
      return (...a: unknown[]) => { log.push(`${k}${a.map((n) => (typeof n === 'number' ? n.toFixed(1) : '')).join(',')}`); };
    },
    set(t, k: string, v) { t[k] = v; if (['fillStyle', 'strokeStyle', 'lineWidth'].includes(k)) log.push(`${k}=${typeof v === 'string' ? v : 'obj'}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

const COLLS = ['rare', 'choc', 'jewel', 'cloth', 'perfume', 'acc', 'castle'];

describe('art des 7 nouvelles collections', () => {
  it('chaque collection a 8 niveaux', () => {
    for (const c of COLLS) expect(EXTRA_ITEMS[c]?.length, c).toBe(8);
  });
  it('chaque niveau se dessine sans erreur et dessine vraiment quelque chose', () => {
    for (const c of COLLS) for (let l = 1; l <= 8; l++) {
      const { ctx, log } = fakeCtx();
      expect(() => drawItem(ctx, { c, l } as never, 96), `${c}:${l}`).not.toThrow();
      expect(log.filter((s) => s.startsWith('fill') || s.startsWith('stroke')).length, `${c}:${l}`).toBeGreaterThan(8);
    }
  });
  it('les niveaux d\'une même collection sont tous distincts', () => {
    for (const c of COLLS) {
      const sigs = new Set<string>();
      for (let l = 1; l <= 8; l++) { const { ctx, log } = fakeCtx(); drawItem(ctx, { c, l } as never, 96); sigs.add(log.join('|')); }
      expect(sigs.size, c).toBe(8);
    }
  });
  it('progression : les derniers niveaux sont plus détaillés que le premier', () => {
    for (const c of COLLS) {
      const n = (l: number) => { const { ctx, log } = fakeCtx(); drawItem(ctx, { c, l } as never, 96); return log.length; };
      expect(n(8), c).toBeGreaterThan(n(1));
    }
  });
  it('les niveaux max brillent (halo radial)', () => {
    for (const c of COLLS) {
      const { ctx, log } = fakeCtx();
      drawItem(ctx, { c, l: 8 } as never, 96);
      expect(log.some((s) => s.startsWith('createRadialGradient')), c).toBe(true);
    }
  });
  it('collection inconnue ou niveau hors limites : rien ne plante, rien ne se dessine', () => {
    const { ctx, log } = fakeCtx();
    drawItem(ctx, { c: 'nope', l: 1 } as never, 96);
    drawItem(ctx, { c: 'castle', l: 9 } as never, 96);
    expect(log.length).toBe(0);
  });
});

describe('générateurs 5 à 11', () => {
  it('se dessinent sans erreur et sont tous différents', () => {
    const sigs = new Set<string>();
    for (let k = 1; k <= 11; k++) {
      const { ctx, log } = fakeCtx();
      expect(() => drawGenerator(ctx, k as never, 96), `gen ${k}`).not.toThrow();
      expect(log.length, `gen ${k}`).toBeGreaterThan(30);
      sigs.add(log.join('|'));
    }
    expect(sigs.size).toBe(11);
  });
});
