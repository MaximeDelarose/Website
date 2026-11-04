import { describe, it, expect } from 'vitest';
import { LONG_PRESS_MS, MOVE_TOL, PointerFsm } from '../src/game/merge/pointerFsm';

describe('machine à états du pointeur : appui court / appui long / glissé', () => {
  it('seuil d\'appui long élevé (≈ 500–600 ms) et tolérance de mouvement ≈ 8 px', () => {
    expect(LONG_PRESS_MS).toBeGreaterThanOrEqual(500);
    expect(LONG_PRESS_MS).toBeLessThanOrEqual(600);
    expect(MOVE_TOL).toBeLessThanOrEqual(8);
  });
  it('appui court : relâché avant le seuil, immobile → « tap »', () => {
    const f = new PointerFsm();
    f.down(0, 100, 100);
    expect(f.tick(200)).toBe('none');
    expect(f.up(300)).toBe('tap');
    expect(f.phase).toBe('idle');
  });
  it('appui long : le seuil franchi sans bouger déclenche « long » une seule fois, puis le relâchement est AVALÉ', () => {
    const f = new PointerFsm();
    f.down(0, 100, 100);
    expect(f.tick(LONG_PRESS_MS - 1)).toBe('none');
    expect(f.tick(LONG_PRESS_MS)).toBe('long');
    expect(f.tick(LONG_PRESS_MS + 100)).toBe('none');
    expect(f.swallowed).toBe(true);
    // le doigt peut bouger après l'appui long : rien ne se passe (ni glissé, ni fusion)
    expect(f.move(900, 160, 160)).toBe('none');
    expect(f.up(1200)).toBe('none');
    expect(f.phase).toBe('idle');
  });
  it('un petit tremblement (≤ tolérance) ne gêne pas l\'appui long', () => {
    const f = new PointerFsm();
    f.down(0, 100, 100);
    expect(f.move(100, 100 + MOVE_TOL - 1, 100 + 3)).toBe('none');
    expect(f.tick(LONG_PRESS_MS + 5)).toBe('long');
  });
  it('mouvement au-delà de la tolérance avant le seuil : l\'appui long est annulé, le glissé démarre', () => {
    const f = new PointerFsm();
    f.down(0, 100, 100);
    expect(f.move(120, 100 + MOVE_TOL + 2, 100)).toBe('dragStart');
    // pas d'appui long pendant un glissé, même très long
    expect(f.tick(5000)).toBe('none');
    expect(f.move(5100, 200, 200)).toBe('none');
    expect(f.up(5200)).toBe('drop');
    expect(f.phase).toBe('idle');
  });
  it('glissé court (bref) puis relâché → « drop » ; glissé long (> 1 s) → « drop », jamais « long »', () => {
    for (const dur of [120, 1500]) {
      const f = new PointerFsm();
      f.down(0, 10, 10);
      expect(f.move(30, 60, 10)).toBe('dragStart');
      expect(f.tick(dur)).toBe('none');
      expect(f.up(dur + 10)).toBe('drop');
    }
  });
  it('double toucher rapide : deux « tap » successifs, aucun appui long', () => {
    const f = new PointerFsm();
    f.down(0, 50, 50); expect(f.up(90)).toBe('tap');
    f.down(160, 50, 50); expect(f.up(240)).toBe('tap');
  });
  it('minuteur en retard : un appui déjà plus long que le seuil, immobile, compte comme « long » au relâchement (pas comme un toucher)', () => {
    const f = new PointerFsm();
    f.down(0, 5, 5);
    expect(f.up(LONG_PRESS_MS + 300)).toBe('long');
  });
  it('appui long interdit sur une case sans objet (canLong = faux) : toujours un toucher', () => {
    const f = new PointerFsm();
    f.down(0, 5, 5, false);
    expect(f.tick(5000)).toBe('none');
    expect(f.up(5100)).toBe('tap');
  });
  it('annulation (pointercancel) : retour au repos, plus rien à émettre', () => {
    const f = new PointerFsm();
    f.down(0, 1, 1);
    f.cancel();
    expect(f.tick(9999)).toBe('none');
    expect(f.up(10000)).toBe('none');
  });
  it('mouvement sans appui préalable est ignoré', () => {
    const f = new PointerFsm();
    expect(f.move(0, 10, 10)).toBe('none');
    expect(f.up(1)).toBe('none');
  });
  it('séquence mélangée (10 000 tirages) : jamais « long » après un glissé, jamais « tap » après un long, état toujours revenu au repos', () => {
    let seed = 7;
    const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; n < 10_000; n++) {
      const f = new PointerFsm();
      let t = 0;
      f.down(t, 100, 100);
      const out: string[] = [];
      const steps = 1 + Math.floor(r() * 6);
      for (let k = 0; k < steps; k++) {
        t += Math.floor(r() * 400);
        out.push(r() < 0.5 ? f.tick(t) : f.move(t, 100 + (r() - 0.5) * 30, 100 + (r() - 0.5) * 30));
      }
      t += Math.floor(r() * 400);
      out.push(f.up(t));
      const iDrag = out.indexOf('dragStart');
      const iLong = out.indexOf('long');
      if (iDrag >= 0 && iLong >= 0) expect(iLong).toBeGreaterThan(iDrag - 0); // un long ne peut venir qu'avant le glissé
      if (iDrag >= 0) expect(out.slice(iDrag).includes('long')).toBe(false);
      if (iLong >= 0) { expect(out.slice(iLong + 1).includes('tap')).toBe(false); expect(out.slice(iLong + 1).includes('drop')).toBe(false); expect(out.slice(iLong + 1).includes('dragStart')).toBe(false); }
      expect(f.phase).toBe('idle');
    }
  });
});
