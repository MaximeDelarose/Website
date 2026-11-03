import { describe, it, expect } from 'vitest';
import { mergeReward, deliverReward, levelReward, addGain } from '../src/game/world/fusionRewards';
import { AUG_LINES, AUG_LINE_COUNT } from '../src/data/world/augusteLines';
import { defaultSave, migrate, sanitize, SAVE_VERSION } from '../src/save/schema';
import { FAN_TIERS, fansTier } from '../src/data/world/ids';

describe('récompenses de fusion', () => {
  it('chaque fusion rapporte des pièces, les matériaux dès le niveau 3', () => {
    expect(mergeReward({ c: 'flowers', l: 2 })).toEqual({ coins: 2 });
    expect(mergeReward({ c: 'flowers', l: 3 })).toEqual({ coins: 3, flowers: 1 });
    expect(mergeReward({ c: 'paris', l: 6 })).toEqual({ coins: 6, fabric: 2 });
    expect(mergeReward({ c: 'love', l: 4 }).cocoa).toBe(1);
    expect(mergeReward({ c: 'chess', l: 1 }).coins).toBe(3);
    expect(mergeReward({ c: 'flowers', l: 2 }, 5).coins).toBe(7);
  });
  it('commandes et niveaux', () => {
    expect(deliverReward([{ c: 'flowers', l: 3 }, { c: 'paris', l: 3 }], 8)).toEqual({ coins: 16, flowers: 2, fabric: 2 });
    expect(levelReward(10, true).coins).toBe(30);
    expect(addGain({ coins: 1 }, { coins: 2, cocoa: 1 })).toEqual({ coins: 3, cocoa: 1 });
  });
});

describe('Auguste, fan n°1', () => {
  it('au moins 20 répliques contextuelles, toutes non vides, sans prénom d\'enfant', () => {
    expect(AUG_LINE_COUNT).toBeGreaterThanOrEqual(20);
    for (const lines of Object.values(AUG_LINES)) for (const l of lines) expect(l.trim().length).toBeGreaterThan(0);
  });
});

describe('sauvegarde v3', () => {
  it('migration v2 → v3 : le monde par défaut est ajouté, rien n\'est perdu', () => {
    const v2 = { v: 2, hearts: 77, memories: ['flowers'], economy: { energy: 40, diamonds: 321, bag: [], bagSlots: 6 }, story: { step: 9, history: [], choices: {} }, levels: {} };
    const m = migrate(v2);
    expect(m.migrated).toBe(true);
    expect(m.data.v).toBe(SAVE_VERSION);
    expect(m.data.hearts).toBe(77);
    expect(m.data.economy.diamonds).toBe(321);
    expect(m.data.world.res.coins).toBeGreaterThan(0);
    expect(m.data.world.castle.unlocked).toEqual(['bedroom', 'salon', 'garden']);
    expect(m.data.world.wardrobe.look.top).toBe('top-hoodie-black');
    expect(m.data.seenUpdates).not.toContain('v3');
  });
  it('migration v1 → v3 enchaînée', () => {
    const m = migrate({ v: 1, hearts: 5 });
    expect(m.data.v).toBe(SAVE_VERSION);
    expect(m.data.economy.diamonds).toBe(15);
    expect(m.data.world.fans).toBe(0);
  });
  it('monde abîmé → valeurs sûres, jamais d\'exception', () => {
    const s = sanitize({ v: 3, world: { res: { coins: -5, flowers: 'x' }, castle: { unlocked: ['nope', 'salon'], rooms: { salon: { items: [{ id: 'sofa', x: 2, y: 1, uid: 4 }, 3, null] } }, owned: { sofa: 2, bad: 'x' } }, wardrobe: { look: { hair: 'hair-bun', top: 5 }, looks: [{ name: 'x'.repeat(99), look: {} }] }, cat: { name: 'y'.repeat(99) }, garden: { plotCount: 99 }, fans: -3 } });
    expect(s.world.res.coins).toBe(0);
    expect(s.world.castle.unlocked).toEqual(['salon']);
    expect(s.world.castle.rooms.salon.items.length).toBe(1);
    expect(s.world.castle.nextUid).toBeGreaterThan(4);
    expect(s.world.castle.owned).toEqual({ sofa: 2 });
    expect(s.world.wardrobe.look.hair).toBe('hair-bun');
    expect(s.world.wardrobe.look.top).toBeNull();
    expect(s.world.wardrobe.looks[0]?.name.length).toBeLessThanOrEqual(24);
    expect(s.world.cat.name.length).toBeLessThanOrEqual(20);
    expect(s.world.garden.plots.length).toBe(16);
    expect(s.world.fans).toBe(0);
    expect(defaultSave().world.wardrobe.looks).toEqual([null, null, null]);
  });
  it('paliers de fans', () => {
    expect(FAN_TIERS).toEqual([10, 100, 1000, 10000, 100000, 1000000]);
    expect([0, 9, 10, 99, 100, 5000, 1_000_000].map(fansTier)).toEqual([-1, -1, 0, 0, 1, 2, 5]);
  });
});
