import { describe, it, expect } from 'vitest';
import { defaultSave } from '../src/save/schema';
import { buildSnapshot, diffEvents, counters, ModeMeter, narrativeEvents, sessionSummary } from '../src/core/progressShare';
import { levelStep } from '../src/data/story';
import { bump } from '../src/game/endless/ctx';

const finish = (d: ReturnType<typeof defaultSave>, ids: number[]) => { for (const id of ids) d.levels[String(id)] = { stars: 3, best: 1, done: true }; };

describe('instantané de progression', () => {
  it('départ : chapitre 1, niveau 1, aucun niveau terminé, objectif réel du niveau', () => {
    const s = buildSnapshot(defaultSave(), 1);
    expect(s.story.chapter).toBe(1); expect(s.story.current?.id).toBe(1);
    expect(s.story.levelsDone).toBe(0); expect(s.story.levelsTotal).toBe(30); expect(s.story.chapterTotal).toBe(6);
    expect(s.story.lastDone).toBeNull(); expect(s.story.inRun).toBe(false);
    expect(s.story.objective?.label).toMatch(/Fabriquer/);
    expect(s.xp.level).toBe(1);
  });
  it('niveau 22 terminé → niveau 23 en cours, chapitre 4 : vrais compteurs, pas de niveau « terminé » à tort', () => {
    const d = defaultSave();
    finish(d, Array.from({ length: 22 }, (_, i) => i + 1));
    d.story.step = levelStep(23) - 2; // juste avant la reine : le prochain niveau est le 23
    const s = buildSnapshot(d, 1);
    expect(s.story.current?.id).toBe(23); expect(s.story.chapter).toBe(4);
    expect(s.story.lastDone?.id).toBe(22); expect(s.story.levelsDone).toBe(22);
    expect(s.story.chapterDone).toBe(4); expect(s.story.chapterTotal).toBe(6); expect(s.story.chapterPct).toBe(67);
    expect(s.story.storyPct).toBe(73);
    expect(s.story.inRun).toBe(false); // aucune partie sauvegardée : on ne prétend pas connaître l'avancement de l'objectif
  });
  it('mode libre / PIMBÊCHE : compteurs réels', () => {
    const d = defaultSave();
    bump(d.fun, 'orders', 12); bump(d.fun, 'orders:hard', 2); bump(d.fun, 'soapOrders', 3); bump(d.fun, 'soapMade', 5); bump(d.fun, 'xp', 100);
    d.stats.merges = 340; d.stats.bestCombo = 9; d.stats.combos = 14;
    const s = buildSnapshot(d, 1);
    expect(s.free).toMatchObject({ orders: 12, hard: 2, merges: 340, combos: 14, bestCombo: 9 });
    expect(s.pimb).toMatchObject({ unlocked: true, workshop: 1, soapOrders: 3, soapMade: 5 });
    expect(s.xp.level).toBeGreaterThan(1);
  });
  it('taille compacte (< 4 Ko)', () => { expect(JSON.stringify(buildSnapshot(defaultSave(), 1)).length).toBeLessThan(4096); });
  it('ne contient ni message, ni contact, ni position', () => {
    const j = JSON.stringify(buildSnapshot(defaultSave(), 1));
    expect(j).not.toMatch(/"(messages?|contacts?|conversations?|lat|lng|latitude|longitude|geo|location)"\s*:/i); // clés interdites (pas les mots du jeu)
  });
});

describe('jalons idempotents', () => {
  it('aucun jalon pour le premier instantané (rien n\'est reconstitué)', () => {
    expect(diffEvents(null, buildSnapshot(defaultSave(), 1), defaultSave())).toEqual([]);
  });
  it('niveau terminé + nouveau chapitre : identifiants stables', () => {
    const d = defaultSave(); finish(d, [1, 2, 3, 4, 5]); d.story.step = levelStep(6);
    const a = buildSnapshot(d, 1);
    finish(d, [6]); d.story.step = levelStep(7);
    const b = buildSnapshot(d, 2);
    const ev = diffEvents(a, b, d);
    expect(ev.map((e) => e.id)).toEqual(expect.arrayContaining(['lvl:6', 'chu:2', 'chs:2', 'chd:1']));
    expect(new Set(ev.map((e) => e.id)).size).toBe(ev.length);
    expect(diffEvents(b, b, d)).toEqual([]); // rien de nouveau → rien d'envoyé
  });
  it('souvenirs et photos : récompenses narratives', () => {
    const d = defaultSave(); const before = { memories: d.memories.length, photos: d.photos.length };
    d.memories.push('flowers'); d.photos.push('p4');
    expect(narrativeEvents(before, d, 5).map((e) => e.id)).toEqual(['mem:flowers', 'pho:p4']);
    expect(narrativeEvents(null, d, 5)).toEqual([]);
  });
});

describe('résumé de session et temps par mode', () => {
  it('activités = fin − début', () => {
    const d = defaultSave(); const s0 = buildSnapshot(d, 1); const c0 = counters(d);
    bump(d.fun, 'orders', 3); d.stats.merges = 32; finish(d, [1]);
    const sum = sessionSummary(c0, counters(d), s0, buildSnapshot(d, 2));
    expect(sum.now.orders - sum.base.orders).toBe(3); expect(sum.now.merges - sum.base.merges).toBe(32); expect(sum.now.levels - sum.base.levels).toBe(1);
  });
  it('temps actif réparti ; rien en arrière-plan ; renvoi sans perte', () => {
    const m = new ModeMeter();
    m.sample('endless', 5); m.sample('endless', 5); m.sample('casino', 0); m.sample('chapters', 10);
    const out = m.drain();
    expect(out).toEqual({ endless: 10, chapters: 10 });
    expect(m.visited()).toEqual(expect.arrayContaining(['endless', 'casino', 'chapters']));
    m.giveBack(out); expect(m.drain()).toEqual({ endless: 10, chapters: 10 });
    expect(m.drain()).toEqual({});
  });
});
