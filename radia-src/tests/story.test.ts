import { describe, it, expect } from 'vitest';
import { STORY, CHAPTERS } from '../src/data/story';
import { DIALOGUES, BARKS } from '../src/data/dialogue';
import { MEMORIES } from '../src/data/memories';
import { LEVELS } from '../src/data/levels';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { PHOTOS } from '../src/data/photos';
import { defaultSave } from '../src/save/schema';

describe('histoire', () => {
  it('chaque étape pointe vers un contenu existant', () => {
    for (const s of STORY) {
      if (s.t === 'dialogue') expect(DIALOGUES[s.id], s.id).toBeTruthy();
      if (s.t === 'level') expect(LEVELS.find((l) => l.id === s.id), String(s.id)).toBeTruthy();
      if (s.t === 'memory') expect(MEMORIES.find((m) => m.id === s.id), s.id).toBeTruthy();
      if (s.t === 'photo') expect(PHOTOS.find((m) => m.id === s.id), s.id).toBeTruthy();
      if (s.t === 'chapter') expect(CHAPTERS.find((c) => c.n === s.ch)).toBeTruthy();
    }
  });
  it('les 30 niveaux apparaissent une fois, dans l\'ordre', () => {
    const ids = STORY.filter((s) => s.t === 'level').map((s) => (s as { id: number }).id);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });
  it('5 chapitres, 8 souvenirs débloqués, 3 mini-jeux, la fin', () => {
    expect(STORY.filter((s) => s.t === 'chapter').length).toBe(5);
    expect(new Set(STORY.filter((s) => s.t === 'memory').map((s) => (s as { id: string }).id)).size).toBe(8);
    expect(STORY.filter((s) => s.t === 'minigame').length).toBe(3);
    expect(STORY.filter((s) => s.t === 'final').length).toBe(1);
    expect(STORY.some((s) => s.t === 'unlockChess')).toBe(true);
  });
  it('au moins 25 dialogues et 12 succès', () => {
    expect(Object.keys(DIALOGUES).length).toBeGreaterThanOrEqual(25);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const lines of Object.values(BARKS)) expect(lines.length).toBeGreaterThan(0);
  });
  it('aucun succès n\'est débloqué sur une sauvegarde neuve', () => {
    const s = defaultSave();
    for (const a of ACHIEVEMENTS) expect(a.check(s), a.id).toBe(false);
  });
  it('chaque dialogue utilisé dans l\'histoire est unique', () => {
    const ids = STORY.filter((s) => s.t === 'dialogue').map((s) => (s as { id: string }).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { reconcileStep, stepKey } from '../src/data/story';
describe('compatibilité des sauvegardes', () => {
  it('se recale sur l\'identifiant si les index ont changé', () => {
    const i = STORY.findIndex((s) => s.t === 'level' && s.id === 10);
    expect(reconcileStep(i, stepKey(STORY[i]))).toBe(i);
    expect(reconcileStep(i - 2, stepKey(STORY[i]))).toBe(i);
    expect(reconcileStep(5, undefined)).toBe(5);
  });
  it('identifiants d\'étapes uniques (hors souvenirs répétés)', () => {
    const keys = STORY.map(stepKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
