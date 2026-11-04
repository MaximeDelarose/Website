import { describe, it, expect } from 'vitest';
import * as K from '../src/ui/screens/world/castle/camera';

const world = { w: 511, h: 739 };
const phone = { w: 393, h: 560 };

describe('caméra', () => {
  it('vue globale : toute la pièce visible dans la vue, la plus grande possible', () => {
    for (const view of [phone, { w: 393, h: 470 }, { w: 393, h: 800 }]) {
      const c = K.fitCam(view, world);
      expect(c.x).toBeGreaterThanOrEqual(-0.01);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + world.w * c.s).toBeLessThanOrEqual(view.w + 0.01);
      expect(c.y + world.h * c.s).toBeLessThanOrEqual(view.h + 0.01);
      // l'une des deux dimensions remplit (presque) la vue
      expect(Math.max(world.w * c.s / view.w, world.h * c.s / view.h)).toBeGreaterThan(0.97);
    }
  });
  it('le zoom garde le point sous le doigt', () => {
    const lim = K.limitsFor(phone, world);
    const c = K.fitCam(phone, world);
    const p = { x: 200, y: 300 };
    const w0 = K.toWorld(c, p.x, p.y);
    const z = K.zoomAbout(c, p.x, p.y, c.s * 2, lim);
    const w1 = K.toWorld(z, p.x, p.y);
    expect(w1.x).toBeCloseTo(w0.x, 6); expect(w1.y).toBeCloseTo(w0.y, 6);
    expect(z.s).toBeCloseTo(c.s * 2, 6);
  });
  it('limites de zoom', () => {
    const lim = K.limitsFor(phone, world);
    const c = K.fitCam(phone, world);
    expect(K.zoomAbout(c, 0, 0, 100, lim).s).toBeLessThanOrEqual(K.MAX_ABS);
    expect(K.zoomAbout(c, 0, 0, 0.001, lim).s).toBeGreaterThanOrEqual(lim.min);
    expect(lim.max).toBeGreaterThan(lim.min * 2);
  });
  it('pincement : écarter agrandit, rapprocher réduit, le milieu suit', () => {
    const lim = K.limitsFor(phone, world);
    const cam = K.fitCam(phone, world);
    const st = { cam, a: { x: 150, y: 300 }, b: { x: 250, y: 300 } };
    const big = K.pinch(st, { x: 100, y: 300 }, { x: 300, y: 300 }, lim);
    expect(big.s).toBeCloseTo(Math.min(lim.max, cam.s * 2), 6);
    const small = K.pinch(st, { x: 180, y: 300 }, { x: 220, y: 300 }, lim);
    expect(small.s).toBeLessThan(cam.s);
    // déplacement à deux doigts : même écart, milieu décalé de 40 px
    const pan = K.pinch(st, { x: 190, y: 340 }, { x: 290, y: 340 }, lim);
    expect(pan.s).toBeCloseTo(cam.s, 6);
    expect(pan.x - cam.x).toBeCloseTo(40, 6); expect(pan.y - cam.y).toBeCloseTo(40, 6);
    // le point du monde sous le milieu initial suit le milieu final
    const w0 = K.toWorld(cam, 200, 300); const s1 = K.toScreen(big, w0.x, w0.y);
    expect(s1.x).toBeCloseTo(200, 3);
  });
  it('on ne perd jamais la pièce : bords tolérés ≤ marge, pièce centrée quand elle tient', () => {
    const lim = K.limitsFor(phone, world);
    const fit = K.fitCam(phone, world);
    const zoomed = { s: fit.s * 3, x: -5000, y: 5000 };
    const c = K.clampCam(zoomed, phone, world, lim);
    expect(c.x).toBeGreaterThanOrEqual(phone.w - world.w * c.s - K.EDGE - 0.01);
    expect(c.x).toBeLessThanOrEqual(K.EDGE + 0.01);
    expect(c.y).toBeLessThanOrEqual(K.EDGE + 0.01);
    expect(c.y).toBeGreaterThanOrEqual(phone.h - world.h * c.s - K.EDGE - 0.01);
    const small = K.clampCam({ s: lim.min, x: 999, y: -999 }, phone, world, lim);
    expect(small.x).toBeCloseTo((phone.w - world.w * small.s) / 2, 3);
    expect(small.y).toBeGreaterThanOrEqual(0);
  });
  it('recentrer sur un point', () => {
    const c = K.centerOn(K.fitCam(phone, world), phone, 100, 200, 1.5);
    const s = K.toScreen(c, 100, 200);
    expect(s.x).toBeCloseTo(phone.w / 2, 6); expect(s.y).toBeCloseTo(phone.h / 2, 6);
  });
  it('lissage : converge vers la cible', () => {
    let c: K.Cam = { s: 1, x: 0, y: 0 }; const t: K.Cam = { s: 2, x: 100, y: -40 };
    for (let i = 0; i < 120; i++) c = K.ease(c, t, 1 / 60);
    expect(K.sameCam(c, t)).toBe(true);
  });
});
