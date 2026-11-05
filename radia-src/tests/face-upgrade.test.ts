import { describe, it, expect } from 'vitest';
import { defaultFace, previousDefaultFace, upgradeUntouchedFace, sanitizeFace } from '../src/data/world/face';

describe('migration du visage de base', () => {
  it('un visage jamais retouché reçoit le nouveau réglage des yeux', () => {
    const up = upgradeUntouchedFace(sanitizeFace(previousDefaultFace()));
    expect(up).toEqual(defaultFace());
    expect(up.eyes.spacing).toBeGreaterThan(previousDefaultFace().eyes.spacing);
  });
  it('un visage retouché par la joueuse n\'est jamais remplacé', () => {
    const f = previousDefaultFace(); f.eyes.iris = '#2255AA';
    expect(upgradeUntouchedFace(sanitizeFace(f))).toEqual(f);
    const g = defaultFace(); g.eyes.spacing = -0.4;
    expect(upgradeUntouchedFace(sanitizeFace(g))).toEqual(g);
  });
  it('le nouveau réglage est stable (idempotent)', () => {
    expect(upgradeUntouchedFace(defaultFace())).toEqual(defaultFace());
  });
});
