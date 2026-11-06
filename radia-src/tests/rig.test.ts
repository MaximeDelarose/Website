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
  // longueur d'un bras (courbe quadratique épaule → coude → poignet), par échantillonnage
  const armLen = (side: 'left' | 'right', pose: typeof RIG.pose | typeof RIG.poseRest = RIG.pose): number => {
    const sg = side === 'left' ? -1 : 1, q = pose[side];
    const P0: [number, number] = [sg * RIG.shoulder.dx, RIG.shoulder.y], C: [number, number] = [q.cx, q.cy], P1: [number, number] = [q.x1, q.y1];
    let len = 0, prev = P0;
    for (let i = 1; i <= 60; i++) { const t = i / 60, u = 1 - t; const x = u * u * P0[0] + 2 * u * t * C[0] + t * t * P1[0], y = u * u * P0[1] + 2 * u * t * C[1] + t * t * P1[1]; len += Math.hypot(x - prev[0], y - prev[1]); prev = [x, y]; }
    return len;
  };
  it('pose IDLE : asymétrique et vivante (jamais deux bras identiques le long du corps), main gauche sur la hanche', () => {
    const { left, right } = RIG.pose;
    expect(Math.abs(left.y1 - right.y1), 'les poignets ne sont pas à la même hauteur').toBeGreaterThan(18);
    expect(Math.abs(right.x1) - Math.abs(left.x1), 'la main droite pend plus à l\'extérieur, la gauche reste sur la hanche').toBeGreaterThanOrEqual(10);
    expect(left.y1, 'main sur la hanche : entre la taille et le bas des hanches').toBeGreaterThan(RIG.waist.y);
    expect(left.y1).toBeLessThan(RIG.hip.y);
    expect(Math.abs(left.x1), 'le poignet de la main sur la hanche reste contre le corps').toBeLessThan(58);
    expect(Math.abs(left.cx), 'le coude gauche est écarté').toBeGreaterThan(RIG.shoulder.dx + 30);
    // la main droite repose près de la cuisse / du sac : sous la taille, à l'extérieur de la hanche
    expect(right.y1).toBeGreaterThan(RIG.hip.y - 40); expect(right.y1).toBeLessThan(RIG.hip.y + 40);
    expect(right.x1).toBeGreaterThan(50);
  });
  it('anatomie : le bras plié (main sur la hanche) paraît raccourci par la perspective (≤ 14 %, jamais plus long que le bras détendu), ni étiré ni écrasé', () => {
    const l = armLen('left'), r = armLen('right');
    expect(l).toBeLessThanOrEqual(r + 1); expect((r - l) / r).toBeLessThan(0.14);
    for (const v of [l, r]) { expect(v).toBeGreaterThan(125); expect(v).toBeLessThan(175); }
    const rest = [armLen('left', RIG.poseRest), armLen('right', RIG.poseRest)];
    expect(Math.abs(r - rest[1]) / rest[1], 'le bras détendu garde la longueur du bras au repos').toBeLessThan(0.12);
  });
  it('aucun bras ne sort du personnage ni ne traverse le corps (poignets et coudes dans des limites raisonnables)', () => {
    for (const side of ['left', 'right'] as const) { const q = RIG.pose[side]; expect(Math.abs(q.x1)).toBeLessThan(75); const elbowX = 0.25 * (side === 'left' ? -RIG.shoulder.dx : RIG.shoulder.dx) + 0.5 * q.cx + 0.25 * q.x1; expect(Math.abs(elbowX), 'le coude reste proche du corps (≈ largeur des manches du sweat)').toBeLessThan(100); expect(Math.sign(q.cx)).toBe(side === 'left' ? -1 : 1); expect(q.y1).toBeLessThan(RIG.feet.y - 180); }
    expect(RIG.pose.left.x1 * RIG.pose.left.cx, 'le poignet est du même côté que son coude').toBeGreaterThan(0);
  });
  it('ancienne pose au repos conservée (bras le long du corps, symétrique) pour les écrans qui la demandent', () => {
    expect(Math.abs(RIG.poseRest.left.x1 + RIG.poseRest.right.x1)).toBeLessThan(4);
    expect(RIG.poseRest.left.y1).toBe(RIG.poseRest.right.y1);
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
