import { describe, it, expect, beforeEach } from 'vitest';
import { shopChestSpec } from '../src/ui/rewards/shopChest';
import { openGift, setRewardHost, giftBusy } from '../src/ui/rewards';
import { resetGrantMemory } from '../src/ui/rewards/grant';
import { rollChest } from '../src/game/economy/economy';

describe('coffre de la boutique -> cadeau', () => {
  it('conserve tous les montants du butin et marque tout comme déjà versé', () => {
    const loot = rollChest('royal', () => 0.5);
    const spec = shopChestSpec('royal', loot, [{ name: 'Étoile' }, { name: 'Objet' }], 15);
    expect(spec.kind).toBe('premium');
    expect(spec.title).toBe('Coffre du royaume');
    expect(spec.rewards.every((r) => r.granted === true)).toBe(true);
    const sum = (t: string) => spec.rewards.filter((r) => r.type === t).reduce((a, r) => a + r.qty, 0);
    expect(sum('energy')).toBe(loot.energy);
    expect(sum('hearts')).toBe(loot.hearts + 15);
    expect(spec.rewards.filter((r) => r.type === 'item' && !r.id).length).toBe(2);
    expect(spec.rewards.find((r) => r.id === 'wand')?.qty).toBe(loot.wands);
  });
  it('coffre d\'Auguste : bois, pas de ligne vide', () => {
    const spec = shopChestSpec('free', { energy: 20, hearts: 12, diamonds: 0, wands: 0, winds: 0 }, []);
    expect(spec.kind).toBe('chest');
    expect(spec.rewards.map((r) => r.type)).toEqual(['energy', 'hearts']);
    expect(spec.rarity).toBe('uncommon');
  });
});

describe('ouvertures simultanées', () => {
  beforeEach(() => { resetGrantMemory(); });
  it('même clé lancée deux fois en même temps : attribué une seule fois', async () => {
    let coins = 0; let once = new Set<string>();
    setRewardHost({
      once: (k) => (once.has(k) ? false : (once.add(k), true)), addRes: (_k, n) => { coins += n; }, giveDiamonds() {}, giveEnergy() {}, giveTickets() {}, addHearts() {},
      giveBooster() {}, addChest() {}, ownsCloth: () => false, giveCloth() {}, clothBack: () => 0, ownsFurniture: () => false, giveFurniture() {}, furnitureBack: () => 0,
      unlockMemory: () => false, addBouquet() {}, nameOf: () => null, balance: () => 0, persist() {},
    });
    const spec = { kind: 'chest' as const, rarity: 'rare' as const, title: 't', key: 'k1', rewards: [{ type: 'coins' as const, qty: 10 }] };
    const p = [openGift(spec), openGift(spec), openGift(spec)];
    expect(giftBusy()).toBe(true);
    await Promise.all(p);
    expect(coins).toBe(10);
    expect(giftBusy()).toBe(false);
    setRewardHost(null);
    once = new Set();
  });
});
