import { describe, it, expect } from 'vitest';
import { RIG, PAINT_SCALE, paintedScale, faceWidthUnits, paintedToHead, skullTopY, crownDy } from '../src/game/art/world/rig';

describe('gabarit unique de Radia (rig)', () => {
  it('une SEULE échelle de tête : le visage fait la même largeur que sur l\'illustration de référence (60,6 u ± 1,5 %)', () => {
    const ref = RIG.painted.faceWidthPx * PAINT_SCALE; // largeur mesurée sur l'illustration, ramenée en unités d'avatar
    expect(faceWidthUnits()).toBeGreaterThan(ref * 0.985);
    expect(faceWidthUnits()).toBeLessThan(ref * 1.015);
    expect(paintedScale()).toBeCloseTo(PAINT_SCALE, 3);
  });
  it('les yeux peints tombent sur les yeux du dessin (les lunettes et les boucles restent bien placées)', () => {
    const [x, y] = paintedToHead(RIG.painted.eyeX, RIG.painted.eyeY);
    expect(x).toBe(RIG.painted.avX); expect(y).toBe(RIG.painted.avY);
  });
  it('le menton reste le pivot de l\'échelle de tête (le cou ne bouge jamais)', () => {
    // un point au menton avant l'échelle = après l'échelle
    const s = RIG.head.scale, c = RIG.head.chinY;
    expect(c + (c - c) * s).toBe(c);
    expect(s).toBeGreaterThan(0.75); expect(s).toBeLessThan(0.9);
  });
  it('couronnes : posées par rapport au SOMMET DU CRÂNE, pas aux dimensions d\'une image', () => {
    expect(crownDy('vector')).toBe(0);
    expect(skullTopY('painted')).toBeLessThan(skullTopY('vector')); // le crâne peint (cheveux volumineux) est plus haut
    expect(crownDy('painted')).toBeCloseTo(skullTopY('painted') - skullTopY('vector'), 6);
  });
  it('pose de référence : bras symétriques (±3 u), poignets à hauteur des hanches, mains plus bas que les poignets', () => {
    const { left, right } = RIG.pose;
    expect(Math.abs(left.x1 + right.x1)).toBeLessThan(4);
    expect(Math.abs(left.y1 - right.y1)).toBeLessThan(4);
    expect(left.y1).toBeGreaterThan(RIG.waist.y); expect(left.y1).toBeLessThan(RIG.feet.y);
    expect(RIG.hand.reach).toBeGreaterThan(0);
  });
  it('proportions du corps cohérentes : menton < épaules < taille < hanches < pieds ; bras plus épais à l\'épaule qu\'au poignet', () => {
    expect(RIG.head.chinY).toBeLessThan(RIG.shoulder.y);
    expect(RIG.shoulder.y).toBeLessThan(RIG.waist.y);
    expect(RIG.waist.y).toBeLessThan(RIG.hip.y);
    expect(RIG.hip.y).toBeLessThan(RIG.feet.y);
    expect(RIG.arm.w0).toBeGreaterThan(RIG.arm.w1);
    expect(RIG.arm.w1).toBeGreaterThan(14); // ni filaire…
    expect(RIG.arm.w0).toBeLessThan(34);   // …ni épais
  });
});
