import { describe, it, expect } from 'vitest';
import { defaultSave, sanitize, migrate, SAVE_VERSION } from '../src/save/schema';
import { createRun } from '../src/game/merge/rules';
import { LEVELS } from '../src/data/levels';

describe('sauvegarde', () => {
  it('aller-retour JSON sans perte', () => {
    const d = defaultSave();
    d.hearts = 42; d.memories = ['flowers']; d.run = createRun(LEVELS[4]);
    const back = sanitize(JSON.parse(JSON.stringify(d)));
    expect(back.hearts).toBe(42);
    expect(back.memories).toEqual(['flowers']);
    expect(back.run?.cells).toEqual(d.run.cells);
  });
  it('données absurdes → valeurs par défaut, sans exception', () => {
    for (const raw of [null, 3, 'x', [], { settings: 'no', levels: [1], hearts: -5, run: { cells: [1] } }]) {
      const s = sanitize(raw);
      expect(s.v).toBe(SAVE_VERSION);
      expect(s.hearts).toBeGreaterThanOrEqual(0);
      expect(s.run).toBeNull();
    }
  });
  it('bornes respectées', () => {
    const s = sanitize({ settings: { music: 7, sfx: -1 }, levels: { 3: { stars: 9 } } });
    expect(s.settings.music).toBe(1);
    expect(s.settings.sfx).toBe(0);
    expect(s.levels['3'].stars).toBe(3);
  });
  it('version future signalée', () => {
    expect(migrate({ v: SAVE_VERSION + 1 }).tooNew).toBe(true);
  });
});
