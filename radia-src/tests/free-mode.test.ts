import { describe, it, expect } from 'vitest';
import { defaultSave, sanitize, migrate } from '../src/save/schema';
import { STORY } from '../src/data/story';
import { CHAPTERS } from '../src/data/story';
import { isFreeModeUnlocked, syncFreeMode, shouldAnnounceFree, markFreeAnnounced, modeButtonLabel } from '../src/core/freeMode';

const SUB = 'Niveau 3 · Chapitre 1';

describe('mode libre : déblocage', () => {
  it('nouvelle partie : verrouillé, bouton « MODE CHAPITRES »', () => {
    const d = defaultSave();
    expect(isFreeModeUnlocked(d)).toBe(false);
    expect(syncFreeMode(d)).toBe(false);
    expect(d.fun.free.unlocked).toBe(false);
    expect(modeButtonLabel(d, SUB)).toEqual({ title: 'MODE CHAPITRES', sub: SUB, free: false });
    expect(shouldAnnounceFree(d)).toBe(false);
  });
  it('en pleine histoire (chapitre 4) : toujours verrouillé', () => {
    const d = defaultSave();
    d.story.step = STORY.length - 12;
    expect(isFreeModeUnlocked(d)).toBe(false);
  });
  it('fin vue (cinq chapitres terminés) : débloqué, marqué une seule fois avec sa date', () => {
    const d = defaultSave();
    d.story.endingSeen = true;
    expect(syncFreeMode(d, 1234)).toBe(true);
    expect(d.fun.free).toEqual({ unlocked: true, at: 1234, announced: false });
    expect(syncFreeMode(d, 9999)).toBe(false);
    expect(d.fun.free.at).toBe(1234);
  });
  it('histoire franchie jusqu\'au bout : débloqué même si le drapeau de fin manque', () => {
    const d = defaultSave();
    d.story.step = STORY.length;
    expect(isFreeModeUnlocked(d)).toBe(true);
  });
  it('le libellé devient « MODE LIBRE » / « L\'aventure continue ♡ » et reste ainsi', () => {
    const d = defaultSave();
    d.story.endingSeen = true;
    syncFreeMode(d);
    expect(modeButtonLabel(d, SUB)).toEqual({ title: 'MODE LIBRE', sub: 'L\'aventure continue ♡', free: true });
    d.endless.best = 4200;
    const l = modeButtonLabel(d, SUB);
    expect(l.title).toBe('MODE LIBRE');
    expect(l.sub).toContain('L\'aventure continue ♡');
    expect(l.sub).toMatch(/record 4.?200/);
    // jamais de retour en arrière, même si l'histoire est rejouée
    d.story.endingSeen = false; d.story.step = 3;
    expect(modeButtonLabel(d, SUB).title).toBe('MODE LIBRE');
  });
  it('ancienne sauvegarde sans bloc « fun » mais fin déjà vue : débloquée immédiatement et proprement', () => {
    const raw = JSON.parse(JSON.stringify(defaultSave())) as Record<string, unknown>;
    delete raw.fun;
    (raw.story as { endingSeen: boolean }).endingSeen = true;
    raw.v = 4;
    const { data } = migrate(raw);
    expect(data.fun.free.unlocked).toBe(false);
    expect(isFreeModeUnlocked(data)).toBe(true);
    expect(syncFreeMode(data, 77)).toBe(true);
    expect(data.fun.free.unlocked).toBe(true);
    const back = sanitize(JSON.parse(JSON.stringify(data)));
    expect(back.fun.free).toEqual({ unlocked: true, at: 77, announced: false });
  });
  it('l\'annonce n\'est montrée qu\'une fois', () => {
    const d = defaultSave();
    d.story.endingSeen = true;
    expect(shouldAnnounceFree(d)).toBe(true);
    markFreeAnnounced(d, 5);
    expect(d.fun.free.announced).toBe(true);
    expect(shouldAnnounceFree(d)).toBe(false);
    const back = sanitize(JSON.parse(JSON.stringify(d)));
    expect(shouldAnnounceFree(back)).toBe(false);
  });
});

describe('mode libre : rien n\'est réinitialisé, les chapitres restent', () => {
  it('inventaire, monnaies, générateurs, niveaux et histoire intacts après le déblocage', () => {
    const d = defaultSave();
    d.story.endingSeen = true; d.story.step = STORY.length;
    d.levels['3'] = { stars: 3, best: 99, done: true };
    d.world.res.coins = 777; d.world.castle.owned['sofa'] = 2;
    d.economy.diamonds = 55;
    d.fun.endless2.gens['gen:flowers'] = { level: 4, xp: 120 };
    d.fun.endless2.counters.orders = 40;
    d.endless.best = 900;
    const before = JSON.stringify({ ...d, fun: { ...d.fun, free: null } });
    syncFreeMode(d);
    markFreeAnnounced(d);
    expect(JSON.stringify({ ...d, fun: { ...d.fun, free: null } })).toBe(before);
    expect(d.levels['3'].done).toBe(true);
    expect(d.story.step).toBe(STORY.length);
    expect(d.fun.endless2.gens['gen:flowers'].level).toBe(4);
  });
  it('les cinq chapitres existent toujours et ne sont pas étendus par de nouveaux chapitres numérotés', () => {
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5]);
  });
});
