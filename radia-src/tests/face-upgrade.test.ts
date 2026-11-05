import { describe, it, expect } from 'vitest';
import { defaultFace, previousDefaultFaces, upgradeUntouchedFace, sanitizeFace } from '../src/data/world/face';

describe('migration du visage de base', () => {
  it('un visage jamais retouché reçoit le nouveau réglage des yeux', () => {
    const up = upgradeUntouchedFace(sanitizeFace(previousDefaultFaces()[1]));
    expect(up).toEqual(defaultFace());
    expect(up.eyes.size).toBeLessThan(previousDefaultFaces()[1].eyes.size);
  });
  it('un visage retouché par la joueuse n\'est jamais remplacé', () => {
    const f = previousDefaultFaces()[1]; f.eyes.iris = '#2255AA';
    expect(upgradeUntouchedFace(sanitizeFace(f))).toEqual(f);
    const g = defaultFace(); g.eyes.spacing = -0.4;
    expect(upgradeUntouchedFace(sanitizeFace(g))).toEqual(g);
  });
  it('les deux anciennes bases sont reconnues', () => {
    for (const p of previousDefaultFaces()) expect(upgradeUntouchedFace(sanitizeFace(p))).toEqual(defaultFace());
  });
  it('le nouveau réglage est stable (idempotent)', () => {
    expect(upgradeUntouchedFace(defaultFace())).toEqual(defaultFace());
  });
});
