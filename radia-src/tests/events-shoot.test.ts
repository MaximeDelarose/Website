import { describe, it, expect } from 'vitest';
import { POSES, FRAMES, FILTERS, SHOOT_POSES, SHOOT_DECORS, SHOOT_FRAMES, poseAt, frameAt, filterAt } from '../src/events/photo/data';
import { PHOTO_LINES } from '../src/events/photo/photographer';
import { PLACE_IDS } from '../src/events/types';

const uniq = (a: string[]) => new Set(a).size === a.length;

describe('séance photo : listes', () => {
  it('5 poses / 5 décors / 4 cadres, ids uniques', () => {
    expect(SHOOT_POSES).toHaveLength(5);
    expect(SHOOT_DECORS).toHaveLength(5);
    expect(SHOOT_FRAMES).toHaveLength(4);
    for (const l of [SHOOT_POSES, SHOOT_DECORS, SHOOT_FRAMES]) { expect(uniq(l.map((x) => x.id))).toBe(true); expect(l.every((x) => x.label.length > 0)).toBe(true); }
    expect(uniq(POSES.map((p) => p.id))).toBe(true);
  });
  it('poses de la séance : index ≥ 6, existantes dans POSES', () => {
    for (const sp of SHOOT_POSES) { const i = POSES.findIndex((p) => p.id === sp.id); expect(i).toBeGreaterThanOrEqual(6); expect(poseAt(i).id).toBe(sp.id); }
  });
  it('décor → lieu et filtre valides', () => {
    for (const d of SHOOT_DECORS) {
      expect((PLACE_IDS as readonly string[]).includes(d.place)).toBe(true);
      expect(filterAt(d.filter).id).toBe(d.filter);
    }
    expect(SHOOT_DECORS.find((d) => d.id === 'fontaine')!.place).toBe('fountain');
    expect((PLACE_IDS as readonly string[]).includes('fountain')).toBe(true);
  });
  it('cadres de la séance existent', () => { for (const f of SHOOT_FRAMES) expect(frameAt(f.id).id).toBe(f.id); });
  it('anciens index de poses et ids de cadres inchangés (compatibilité des sauvegardes)', () => {
    expect(POSES.slice(0, 6).map((p) => p.id)).toEqual(['face', 'hanche', 'coeur', 'salut', 'proches', 'ouvert']);
    expect(FRAMES.slice(0, 6).map((f) => f.id)).toEqual(['rose', 'or', 'lavande', 'polaroid', 'dentelle', 'coeurs']);
    expect(FILTERS.slice(0, 5).map((f) => f.id)).toEqual(['none', 'doux', 'chaud', 'rose', 'vintage']);
    for (const p of POSES) { expect(p.gap).toBeGreaterThan(0.05); expect(p.gap).toBeLessThan(0.3); for (const s of p.scale ?? []) expect(s).toBeGreaterThan(0.8); }
  });
  it('répliques du photographe couvrent toutes les options', () => {
    for (const p of SHOOT_POSES) expect(PHOTO_LINES.pose[p.id]).toBeTruthy();
    for (const d of SHOOT_DECORS) expect(PHOTO_LINES.decor[d.id]).toBeTruthy();
    for (const f of SHOOT_FRAMES) expect(PHOTO_LINES.frame[f.id]).toBeTruthy();
  });
});
