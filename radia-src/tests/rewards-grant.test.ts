import { describe, it, expect, beforeEach, vi } from 'vitest';
import { grantGift, resetGrantMemory } from '../src/ui/rewards/grant';
import { openGift, setRewardHost, giftBusy, whenGiftIdle } from '../src/ui/rewards';
import { endlessChestSpec } from '../src/ui/rewards/endless';
import { demoChain, demoSpec } from '../src/ui/rewards/demo';
import { careerMilestoneSpec, casinoMissionSpec, eventGiftSpec, parcelSpec } from '../src/ui/rewards/adapters';
import type { GiftSpec, RewardHost } from '../src/ui/rewards/types';

/** Hôte factice : tout est compté, rien ne touche une vraie sauvegarde. */
function fakeHost(opts: { ownedCloth?: string[]; ownedFurn?: string[]; memories?: string[]; throwOn?: string } = {}) {
  const log: string[] = [];
  const st = { coins: 0, flowers: 0, fabric: 0, cocoa: 0, diamonds: 0, energy: 0, tickets: 0, hearts: 0, chest: 0, wand: 0, wind: 0, persists: 0 };
  const flags = new Set<string>();
  const cloth = new Set(opts.ownedCloth ?? []);
  const furn = new Set(opts.ownedFurn ?? []);
  const mem = new Set(opts.memories ?? []);
  const bouquets: Record<string, number> = {};
  const guard = (n: string) => { if (opts.throwOn === n) throw new Error(`boom ${n}`); };
  const host: RewardHost = {
    once(k) { log.push(`once:${k}`); if (flags.has(k)) return false; flags.add(k); return true; },
    addRes(k, n) { guard('addRes'); log.push(`res:${k}`); st[k] += n; },
    giveDiamonds(n) { st.diamonds += n; }, giveEnergy(n) { st.energy += n; }, giveTickets(n) { st.tickets += n; }, addHearts(n) { st.hearts += n; },
    giveBooster(k, n) { st[k] += n; }, addChest(n) { st.chest += n; },
    ownsCloth: (id) => cloth.has(id), giveCloth(id) { guard('cloth'); cloth.add(id); }, clothBack: (id) => (id.startsWith('x') ? null : 80),
    ownsFurniture: (id) => furn.has(id), giveFurniture(id) { furn.add(id); }, furnitureBack: () => 60,
    unlockMemory(id) { if (mem.has(id)) return false; mem.add(id); return true; },
    addBouquet(k, n) { bouquets[k] = (bouquets[k] ?? 0) + n; },
    nameOf: (t, id) => (t === 'cloth' ? `Robe ${id}` : null),
    balance: (t) => (t === 'coins' ? st.coins : 0),
    persist() { st.persists++; log.push('persist'); },
  };
  return { host, st, log, cloth, furn, mem, bouquets, flags };
}

const spec = (over: Partial<GiftSpec> = {}): GiftSpec => ({ kind: 'chest', rarity: 'rare', title: 't', rewards: [], ...over });
beforeEach(() => { resetGrantMemory(); setRewardHost(null); });

describe('attribution', () => {
  it('verse chaque type vers la bonne fonction, une seule fois', () => {
    const f = fakeHost();
    const r = grantGift(spec({ rewards: [
      { type: 'coins', qty: 100 }, { type: 'diamonds', qty: 20 }, { type: 'energy', qty: 30 }, { type: 'tickets', qty: 50 }, { type: 'hearts', qty: 4 },
      { type: 'res', id: 'flowers', qty: 7 }, { type: 'res', id: 'cocoa', qty: 2 }, { type: 'chest', qty: 1 }, { type: 'item', id: 'wand', qty: 2 },
      { type: 'cloth', id: 'abc', qty: 1 }, { type: 'furniture', id: 'sofa', qty: 1 }, { type: 'memory', id: 'm1', qty: 1 }, { type: 'bouquet', id: 'rose+peony', qty: 1 },
    ] }), f.host);
    expect(r.fresh).toBe(true);
    expect(f.st).toMatchObject({ coins: 100, diamonds: 20, energy: 30, tickets: 50, hearts: 4, flowers: 7, cocoa: 2, chest: 1, wand: 2, persists: 1 });
    expect(f.cloth.has('abc')).toBe(true);
    expect(f.furn.has('sofa')).toBe(true);
    expect(f.mem.has('m1')).toBe(true);
    expect(f.bouquets['rose+peony']).toBe(1);
    expect(r.shown).toHaveLength(13);
  });
  it('idempotent : même clé = rien la deuxième fois (même avec un hôte neuf après « rechargement »)', () => {
    const f = fakeHost();
    const s = spec({ key: 'k1', rewards: [{ type: 'diamonds', qty: 10 }] });
    expect(grantGift(s, f.host).fresh).toBe(true);
    expect(grantGift(s, f.host)).toEqual({ fresh: false, shown: [] });
    expect(f.st.diamonds).toBe(10);
    resetGrantMemory(); // rechargement de la page : seul le drapeau sauvegardé reste
    expect(grantGift(s, f.host).fresh).toBe(false);
    expect(f.st.diamonds).toBe(10);
  });
  it('atomique : la clé est marquée AVANT tout versement', () => {
    const f = fakeHost();
    grantGift(spec({ key: 'a', rewards: [{ type: 'coins', qty: 1 }] }), f.host);
    expect(f.log.indexOf('once:a')).toBeLessThan(f.log.indexOf('res:coins'));
    expect(f.log[f.log.length - 1]).toBe('persist');
  });
  it('une erreur sur une récompense n\'empêche ni les autres ni un nouveau versement', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const f = fakeHost({ throwOn: 'addRes' });
    const r = grantGift(spec({ key: 'e', rewards: [{ type: 'coins', qty: 5 }, { type: 'diamonds', qty: 9 }] }), f.host);
    expect(f.st.diamonds).toBe(9);
    expect(r.fresh).toBe(true);
    expect(grantGift(spec({ key: 'e', rewards: [{ type: 'diamonds', qty: 9 }] }), f.host).fresh).toBe(false);
    expect(f.st.diamonds).toBe(9);
    spy.mockRestore();
  });
  it('doublons : vêtement et meuble déjà possédés → pièces (comme ailleurs), souvenir déjà là → 50 pièces', () => {
    const f = fakeHost({ ownedCloth: ['abc'], ownedFurn: ['sofa'], memories: ['m1'] });
    const r = grantGift(spec({ rewards: [{ type: 'cloth', id: 'abc', qty: 1 }, { type: 'furniture', id: 'sofa', qty: 1 }, { type: 'memory', id: 'm1', qty: 1 }, { type: 'coins', qty: 10 }] }), f.host);
    expect(f.st.coins).toBe(80 + 60 + 50 + 10);
    const dups = r.shown.filter((s) => s.dup);
    expect(dups).toHaveLength(3);
    expect(dups.every((s) => s.type === 'coins')).toBe(true);
    expect(dups.map((s) => s.qty).sort((a, b) => a - b)).toEqual([50, 60, 80]);
  });
  it('identifiant inconnu côté jeu : rien n\'est versé, rien ne plante', () => {
    const f = fakeHost();
    const r = grantGift(spec({ rewards: [{ type: 'cloth', id: 'x-unknown', qty: 1 }, { type: 'coins', qty: 3 }] }), f.host);
    expect(r.fresh).toBe(true);
    expect(f.st.coins).toBe(3);
  });
  it('« déjà versé » (granted) : montré mais jamais ajouté', () => {
    const f = fakeHost();
    const r = grantGift(spec({ rewards: [{ type: 'coins', qty: 500, granted: true }, { type: 'diamonds', qty: 5, granted: true }, { type: 'cloth', id: 'abc', qty: 1, granted: true }] }), f.host);
    expect(f.st.coins).toBe(0);
    expect(f.st.diamonds).toBe(0);
    expect(f.cloth.size).toBe(0);
    expect(r.shown).toHaveLength(3);
  });
  it('noms : libellé fourni > nom de l\'hôte > libellé générique', () => {
    const f = fakeHost();
    const r = grantGift(spec({ rewards: [{ type: 'cloth', id: 'abc', qty: 1 }, { type: 'cloth', id: 'def', qty: 1, label: 'Ma robe' }, { type: 'tickets', qty: 5 }] }), f.host);
    expect(r.shown.map((s) => s.name)).toEqual(['Robe abc', 'Ma robe', 'tickets du Casino Royal']);
  });
});

describe('openGift (sans DOM)', () => {
  it('attribue tout, même sans scène, et résout', async () => {
    const f = fakeHost();
    await openGift(spec({ rewards: [{ type: 'diamonds', qty: 5 }] }), { host: f.host });
    expect(f.st.diamonds).toBe(5);
    expect(giftBusy()).toBe(false);
  });
  it('enchaînement : les 3 cadeaux sont tous attribués dès l\'appel, un 4e est ignoré', async () => {
    const f = fakeHost();
    const g = (n: number): GiftSpec => spec({ title: `g${n}`, rewards: [{ type: 'coins', qty: n }] });
    await openGift({ ...g(1), chain: [g(10), g(100), g(1000)] }, { host: f.host });
    expect(f.st.coins).toBe(111);
  });
  it('double appel avec la même clé (double clic, deux onglets) : une seule attribution', async () => {
    const f = fakeHost();
    const s = spec({ key: 'daily-2026-11-04', rewards: [{ type: 'diamonds', qty: 40 }] });
    await Promise.all([openGift(s, { host: f.host }), openGift(s, { host: f.host }), openGift(s, { host: f.host })]);
    expect(f.st.diamonds).toBe(40);
  });
  it('hôte global injectable et entrée invalide sans effet', async () => {
    const f = fakeHost();
    setRewardHost(f.host);
    await openGift({ kind: 'nope', rarity: 'x', title: 5, rewards: [{ type: 'coins', qty: -5 }, { type: 'coins', qty: 7 }] } as unknown as GiftSpec);
    expect(f.st.coins).toBe(7);
    await openGift(null as unknown as GiftSpec);
    expect(f.st.coins).toBe(7);
    await whenGiftIdle();
  });
  it('les démos ne versent rien', async () => {
    const f = fakeHost();
    await openGift(demoSpec('premium', 'legendary'), { host: f.host });
    await openGift(demoChain(), { host: f.host });
    expect(f.st).toMatchObject({ coins: 0, diamonds: 0, energy: 0, tickets: 0, hearts: 0, chest: 0 });
  });
});

describe('pont Endless', () => {
  it('transforme le butin versé en cadeau « déjà versé »', () => {
    const s = endlessChestSpec({
      rarity: 'epic',
      loot: [{ kind: 'coins', n: 40 }, { kind: 'diamonds', n: 3 }, { kind: 'flowers', n: 5 }, { kind: 'chest', n: 1 }, { kind: 'cloth', n: 1 }, { kind: 'ticket', n: 2 }, { kind: 'wand', n: 1 }],
      cloth: ['dr-royal-gown'], furniture: ['sofa'], dupCoins: 30,
    });
    expect(s.kind).toBe('premium');
    expect(s.title).toBe('Coffre épique !');
    expect(s.rewards.every((r) => r.granted)).toBe(true);
    expect(s.rewards.some((r) => r.type === 'cloth' && r.id === 'dr-royal-gown')).toBe(true);
    expect(s.rewards.some((r) => r.type === 'res' && r.id === 'flowers' && r.qty === 5)).toBe(true);
    expect(s.rewards.filter((r) => r.type === 'cloth')).toHaveLength(1); // le « cloth » du butin n'est pas compté deux fois
    expect(endlessChestSpec({ rarity: 'common', loot: [] }).kind).toBe('chest');
  });
  it('ne verse rien une fois passé par openGift', async () => {
    const f = fakeHost();
    await openGift(endlessChestSpec({ rarity: 'rare', loot: [{ kind: 'coins', n: 99 }, { kind: 'energy', n: 5 }], cloth: ['abc'] }), { host: f.host });
    expect(f.st.coins).toBe(0);
    expect(f.st.energy).toBe(0);
    expect(f.cloth.size).toBe(0);
  });
});

describe('adaptateurs (résultats déjà versés)', () => {
  it('carrière : palier → cadeau croissant en rareté, tout « déjà versé »', () => {
    const base = { career: 'chef', tierTitle: 'Sous-chef', reward: { coins: 200, diamonds: 10, cloth: ['abc'] }, items: { cloth: ['abc'], dupCoins: 0, furniture: [] } };
    const a = careerMilestoneSpec({ ...base, level: 1 }), e = careerMilestoneSpec({ ...base, level: 5 });
    expect(a.rarity).toBe('uncommon');
    expect(e.rarity).toBe('legendary');
    expect(a.title).toBe('Palier 1 : Sous-chef');
    expect(a.rewards.every((r) => r.granted)).toBe(true);
    expect(a.rewards.filter((r) => r.type === 'cloth')).toHaveLength(1);
  });
  it('événement : rien à montrer → null ; sinon pièces/diamants/objets', () => {
    expect(eventGiftSpec({ outcome: { coins: 0, diamonds: 0, fabric: 0, flowers: 0, cocoa: 0, fans: 0, cloth: [], furniture: [] }, first: true })).toBeNull();
    const s = eventGiftSpec({ title: 'Dîner', first: true, outcome: { coins: 120, diamonds: 60, fabric: 0, flowers: 0, cocoa: 0, fans: 3, cloth: ['abc'], furniture: [] } })!;
    expect(s.rarity).toBe('epic');
    expect(s.rewards.map((r) => r.type)).toEqual(['coins', 'diamonds', 'item', 'cloth']);
    expect(s.rewards.every((r) => r.granted)).toBe(true);
  });
  it('colis surprise et mission du casino', () => {
    const p = parcelSpec({ title: 'Livraison surprise', rewards: [{ kind: 'coins', coins: 120, label: '120 pièces' }, { kind: 'decor', id: 'sofa', label: 'Canapé' }] });
    expect(p.rewards.map((r) => r.type)).toEqual(['coins', 'furniture']);
    const m = casinoMissionSpec({ name: 'Fan de roulette', chips: 150, item: { t: 'cloth', id: 'ea-stars' } });
    expect(m.rewards.map((r) => r.type)).toEqual(['tickets', 'cloth']);
    expect(casinoMissionSpec({ name: 'x', chips: 350, item: { t: 'cloth', id: 'ea-stars' }, duplicate: true }).rewards).toHaveLength(1);
  });
});
