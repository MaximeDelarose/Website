import { describe, it, expect } from 'vitest';
import { POSES, FRAMES, FILTERS, exportFileName, kidSlots, poseAt, frameAt, filterAt, fmtDate } from '../src/events/photo/data';

const uniq = (a: string[]) => new Set(a).size === a.length;

describe('photos : listes', () => {
  it('poses, cadres, filtres cohérents', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(5);
    expect(FRAMES.length).toBeGreaterThanOrEqual(6);
    expect(FILTERS.length).toBeGreaterThanOrEqual(5);
    for (const l of [POSES, FRAMES, FILTERS]) { expect(uniq(l.map((x) => x.id))).toBe(true); expect(l.every((x) => x.label.length > 0)).toBe(true); }
    expect(FILTERS.some((f) => f.id === 'none')).toBe(true);
    for (const f of FRAMES) { expect(f.inset.every((n) => n > 0)).toBe(true); expect(f.inset[3]).toBeGreaterThanOrEqual(f.inset[1]); }
    for (const p of POSES) { expect(p.gap).toBeGreaterThan(0.05); expect(p.gap).toBeLessThan(0.3); }
  });
  it('accès tolérants', () => {
    expect(poseAt(-1)).toBe(POSES[POSES.length - 1]);
    expect(poseAt(POSES.length)).toBe(POSES[0]);
    expect(frameAt('zzz')).toBe(FRAMES[0]);
    expect(filterAt('zzz')).toBe(FILTERS[0]);
  });
});

describe('photos : utilitaires', () => {
  it('nom de fichier nettoyé', () => {
    expect(exportFileName("Feu d'artifice")).toBe('radia-feu-d-artifice.png');
    expect(exportFileName('Dîner  à la bougie ♡')).toBe('radia-diner-a-la-bougie.png');
    expect(exportFileName('Cœur')).toBe('radia-coeur.png');
    expect(exportFileName('***')).toBe('radia-souvenir.png');
    expect(exportFileName('')).toBe('radia-souvenir.png');
    expect(exportFileName('a'.repeat(100)).length).toBeLessThanOrEqual('radia-.png'.length + 40);
  });
  it('emplacements des enfants', () => {
    expect(kidSlots(0)).toEqual([]);
    for (const n of [1, 2, 3]) { const s = kidSlots(n); expect(s).toHaveLength(n); expect(s.every((x) => x > 0 && x < 1)).toBe(true); expect([...s].sort((a, b) => a - b)).toEqual(s); }
  });
  it('date française', () => { expect(fmtDate(Date.UTC(2026, 10, 3, 12))).toMatch(/2026/); });
});
