import { describe, it, expect } from 'vitest';
import { genReactions } from '../src/apps/snap/model';

describe('Snapchien : réactions des stories', () => {
  it('toute story reçoit sa première réaction dans les 2,4 premières secondes (une story d\'une image dure 3,2 s)', () => {
    for (let i = 0; i < 3000; i++) {
      const r = genReactions(`st${(1793888000000 + i * 7919).toString(36)}${(i % 1296).toString(36)}`);
      expect(r.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...r.map((x) => x.after)), `story ${i}`).toBeLessThanOrEqual(2400);
    }
  });
  it('les réactions suivantes restent étalées dans le temps (pas toutes d\'un coup)', () => {
    const r = genReactions('st-demo'); const t = r.map((x) => x.after).sort((a, b) => a - b);
    expect(t[t.length - 1] - t[0]).toBeGreaterThan(3000);
  });
});
