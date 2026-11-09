import { describe, it, expect } from 'vitest';
import { occupancy, sellable, saleValue, isPrecious, FULL_HINT_RATIO } from '../src/game/endless/storage';

const cell = (o: object = {}) => ({ item: null, gift: null, lock: null, ...o }) as never;
describe('plateau plein et revente', () => {
  it('occupation : les cases verrouillées ne comptent pas', () => {
    const cells = [cell({ item: { c: 'love', l: 1 } }), cell({ item: { c: 'love', l: 1 } }), cell({ lock: { kind: 'web' } }), cell()];
    const o = occupancy({ cells } as never);
    expect(o.usable).toBe(3); expect(o.used).toBe(2); expect(o.ratio).toBeCloseTo(2 / 3);
    expect(FULL_HINT_RATIO).toBe(0.8);
  });
  it('générateurs et objets spéciaux ne se vendent jamais ; prix bas', () => {
    expect(sellable({ c: 'gen', l: 1 })).toBe(false);
    expect(sellable({ c: 'special', l: 1 })).toBe(false);
    expect(sellable({ c: 'love', l: 2 })).toBe(true);
    expect(saleValue({ c: 'gen', l: 1 })).toBe(0);
    expect(saleValue({ c: 'love', l: 2 })).toBeLessThanOrEqual(5);
    expect(isPrecious({ c: 'love', l: 6 })).toBe(true);
  });
});
