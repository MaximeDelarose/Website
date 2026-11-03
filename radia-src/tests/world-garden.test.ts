import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld, type World } from '../src/save/schema';
import { FLOWER_IDS } from '../src/data/world/ids';
import { FLOWERS, FUSION_CHAIN, MAX_PLOTS, nextFlower } from '../src/data/world/garden';
import * as G from '../src/game/world/garden';

const T0 = 1_000_000;
const rich = (): World => { const w = defaultWorld(); w.res.coins = 5000; w.res.flowers = 500; return w; };

describe('jardin : données', () => {
  it('10 variétés, durées de 20 s à 2 min, chaîne complète', () => {
    expect(FLOWER_IDS.length).toBe(10);
    for (const id of FLOWER_IDS) {
      expect(FLOWERS[id].growMs).toBeGreaterThanOrEqual(20_000);
      expect(FLOWERS[id].growMs).toBeLessThanOrEqual(120_000);
    }
    expect([...FUSION_CHAIN].sort()).toEqual([...FLOWER_IDS].sort());
    expect(nextFlower('magic')).toBeNull();
    expect(nextFlower('daisy')).toBe('tulip');
  });
});

describe('croissance et rattrapage hors ligne', () => {
  it('les stades suivent le temps', () => {
    const w = rich();
    expect(G.plant(w, 0, 'daisy', T0).ok).toBe(true);
    const p = w.garden.plots[0];
    const g = FLOWERS.daisy.growMs;
    expect(G.stageAt(p, T0)).toBe(0);
    expect(G.stageAt(p, T0 + g * 0.4)).toBe(1);
    expect(G.stageAt(p, T0 + g * 0.7)).toBe(2);
    expect(G.stageAt(p, T0 + g)).toBe(3);
    expect(G.isReady(p, T0 + g - 1)).toBe(false);
    expect(G.isReady(p, T0 + g)).toBe(true);
  });
  it('après des jours hors ligne : prête, sans flétrissement', () => {
    const w = rich();
    G.plant(w, 1, 'rose', T0);
    G.syncGarden(w, T0 + 30 * 24 * 3600 * 1000);
    expect(w.garden.plots[1]).not.toBeNull();
    expect(w.garden.plots[1]!.stage).toBe(3);
    expect(G.harvest(w, 1, T0 + 30 * 24 * 3600 * 1000).ok).toBe(true);
  });
  it('horloge reculée : jamais bloqué plus d\'une minute', () => {
    const w = rich();
    G.plant(w, 0, 'daisy', T0 + 10 * 24 * 3600 * 1000);
    G.syncGarden(w, T0);
    expect(w.garden.plots[0]!.plantedAt).toBeLessThanOrEqual(T0);
    expect(G.remainingMs(w.garden.plots[0], T0)).toBeLessThanOrEqual(FLOWERS.daisy.growMs);
  });
  it('syncGarden nettoie une variété inconnue', () => {
    const w = rich();
    w.garden.plots[0] = { flower: 'inconnue', plantedAt: 0, stage: 2 };
    G.syncGarden(w, T0);
    expect(w.garden.plots[0]).toBeNull();
  });
});

describe('plantation et récolte', () => {
  it('coûts débités, jamais négatif', () => {
    const w = defaultWorld();
    const before = w.res.flowers;
    expect(G.plant(w, 0, 'rose', T0)).toEqual({ ok: false, reason: 'Pas assez de ressources' });
    expect(w.res.flowers).toBe(before);
    w.res.flowers = 5;
    expect(G.plant(w, 0, 'rose', T0).ok).toBe(true);
    expect(w.res.flowers).toBe(5 - FLOWERS.rose.cost.flowers!);
    expect(G.plant(w, 0, 'daisy', T0).ok).toBe(false); // occupée
  });
  it('variété verrouillée, parcelle hors bornes', () => {
    const w = rich();
    expect(G.plant(w, 0, 'orchid', T0).reason).toBe('Variété verrouillée');
    expect(G.plant(w, 99, 'rose', T0).ok).toBe(false);
    expect(G.plant(w, -1, 'rose', T0).ok).toBe(false);
  });
  it('récolte : prête seulement, stock +1, fleurs rendues, parcelle libre', () => {
    const w = rich();
    G.plant(w, 0, 'daisy', T0);
    expect(G.harvest(w, 0, T0 + 1000).ok).toBe(false);
    const fl = w.res.flowers;
    const r = G.harvest(w, 0, T0 + FLOWERS.daisy.growMs);
    expect(r.ok).toBe(true);
    expect(w.garden.harvested.daisy).toBe(1);
    expect(w.res.flowers).toBe(fl + FLOWERS.daisy.yieldFlowers);
    expect(w.garden.plots[0]).toBeNull();
    expect(G.harvest(w, 0, T0 + 99999).ok).toBe(false);
  });
  it('3 récoltes de rose débloquent la pivoine', () => {
    const w = rich();
    for (let i = 0; i < 3; i++) { G.plant(w, 0, 'rose', T0); G.harvest(w, 0, T0 + 999_999); }
    expect(w.garden.unlocked).toContain('peony');
  });
  it('déblocage avec pièces', () => {
    const w = defaultWorld();
    w.res.coins = 0;
    expect(G.unlockWithCoins(w, 'peony').ok).toBe(false);
    w.res.coins = 100;
    expect(G.unlockWithCoins(w, 'peony').ok).toBe(true);
    expect(w.res.coins).toBe(100 - FLOWERS.peony.unlockCoins);
    expect(G.unlockWithCoins(w, 'peony').ok).toBe(false);
  });
  it('parcelles supplémentaires payées, plafonnées', () => {
    const w = defaultWorld();
    w.res.coins = 10;
    expect(G.buyPlot(w).ok).toBe(false);
    expect(w.garden.plotCount).toBe(4);
    w.res.coins = 999_999;
    while (G.canBuyPlot(w)) expect(G.buyPlot(w).ok).toBe(true);
    expect(w.garden.plotCount).toBe(MAX_PLOTS);
    expect(w.garden.plots.length).toBe(MAX_PLOTS);
    expect(G.buyPlot(w).ok).toBe(false);
  });
});

describe('accélération en diamants', () => {
  it('coût 1–3 diamants, débité, la fleur est prête', () => {
    const w = rich();
    G.plant(w, 0, 'magic' as never, T0); // verrouillée : rien
    w.garden.unlocked.push('magic');
    G.plant(w, 0, 'magic', T0);
    const p = w.garden.plots[0];
    expect(G.speedupCost(p, T0)).toBe(3);
    expect(G.speedupCost(p, T0 + FLOWERS.magic.growMs - 10_000)).toBe(1);
    let d = 2;
    const spend = (n: number) => { if (d < n) return false; d -= n; return true; };
    expect(G.speedup(w, 0, T0, spend).ok).toBe(false);
    expect(d).toBe(2);
    d = 5;
    const r = G.speedup(w, 0, T0, spend);
    expect(r.ok).toBe(true);
    expect(d).toBe(2);
    expect(G.isReady(w.garden.plots[0], T0)).toBe(true);
  });
  it('rien à accélérer sur une parcelle vide ou prête', () => {
    const w = rich();
    expect(G.speedup(w, 0, T0, () => true).ok).toBe(false);
  });
});

describe('fusion', () => {
  it('3 identiques → 1 supérieure, stock conservé', () => {
    const w = rich();
    w.garden.harvested.rose = 7;
    expect(G.canFuse(w, 'rose')).toBe(true);
    const r = G.fuse(w, 'rose');
    expect(r).toEqual({ ok: true, to: 'peony' });
    expect(w.garden.harvested.rose).toBe(4);
    expect(w.garden.harvested.peony).toBe(1);
    expect(w.garden.unlocked).toContain('peony');
  });
  it('refus : trop peu, variété suprême', () => {
    const w = rich();
    w.garden.harvested.rose = 2;
    expect(G.fuse(w, 'rose').ok).toBe(false);
    expect(w.garden.harvested.rose).toBe(2);
    w.garden.harvested.magic = 9;
    expect(G.fuse(w, 'magic').ok).toBe(false);
    expect(w.garden.harvested.magic).toBe(9);
  });
  it('toute la chaîne se parcourt', () => {
    const w = rich();
    for (const id of FUSION_CHAIN) w.garden.harvested[id] = 0;
    w.garden.harvested.daisy = 3 ** 6;
    for (const id of FUSION_CHAIN.slice(0, -1)) while (G.canFuse(w, id)) expect(G.fuse(w, id).ok).toBe(true);
    expect(w.garden.harvested.lily).toBe(1);
    expect(w.garden.harvested.daisy).toBe(0);
  });
});

describe('bouquets', () => {
  const stocked = () => { const w = rich(); w.garden.harvested = { rose: 3, daisy: 3, tulip: 2 }; return w; };
  it('clé canonique indépendante de l\'ordre', () => {
    expect(G.bouquetKey(['rose', 'daisy', 'rose'])).toBe(G.bouquetKey(['daisy', 'rose', 'rose']));
  });
  it('3 à 5 fleurs, stock requis', () => {
    const w = stocked();
    expect(G.makeBouquet(w, ['rose', 'rose']).ok).toBe(false);
    expect(G.makeBouquet(w, ['rose', 'rose', 'rose', 'rose']).ok).toBe(false); // 4 roses > 3
    expect(G.makeBouquet(w, Array(6).fill('daisy')).ok).toBe(false);
    expect(G.makeBouquet(w, ['rose', 'inconnue', 'daisy']).ok).toBe(false);
    expect(w.garden.harvested.rose).toBe(3);
  });
  it('création : fleurs consommées, bouquet compté, premier signalé une fois', () => {
    const w = stocked();
    const r = G.makeBouquet(w, ['rose', 'daisy', 'tulip']);
    expect(r.ok).toBe(true);
    expect(r.first).toBe(true);
    expect(w.garden.harvested).toMatchObject({ rose: 2, daisy: 2, tulip: 1 });
    expect(w.garden.bouquets[r.key!]).toBe(1);
    const r2 = G.makeBouquet(w, ['rose', 'daisy', 'tulip']);
    expect(r2.first).toBe(false);
    expect(w.garden.bouquets[r.key!]).toBe(2);
    expect(G.bouquetCount(w)).toBe(2);
  });
  it('la diversité augmente la valeur', () => {
    const mono = G.bouquetValue(['rose', 'rose', 'rose']);
    const mix = G.bouquetValue(['rose', 'daisy', 'tulip']);
    expect(mix.distinct).toBe(3);
    expect(G.bouquetValue(['rose', 'rose', 'daisy']).coins).toBeLessThanOrEqual(Math.round((14 * 2 + 6) * 1.25));
    expect(mix.hearts).toBeGreaterThan(mono.hearts);
    expect(mono.coins).toBe(42);
  });
  it('vendre / offrir : récompense réelle, stock décrémenté', () => {
    const w = stocked();
    const k = G.makeBouquet(w, ['rose', 'daisy', 'tulip']).key!;
    const c0 = w.res.coins;
    const s = G.giveBouquet(w, k, 'sell');
    expect(s.ok).toBe(true);
    expect(w.res.coins).toBe(c0 + s.reward!.coins);
    expect(w.garden.bouquets[k]).toBeUndefined();
    expect(G.giveBouquet(w, k, 'gift').ok).toBe(false);
    const k2 = G.makeBouquet(w, ['rose', 'daisy', 'tulip']).key!;
    const g = G.giveBouquet(w, k2, 'gift');
    expect(g.reward!.hearts).toBeGreaterThan(s.reward!.hearts);
  });
});

describe('invariants et sauvegarde', () => {
  it('aucune quantité négative après une série d\'actions aléatoires', () => {
    const w = rich();
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let now = T0;
    for (let i = 0; i < 400; i++) {
      now += Math.floor(rnd() * 60_000);
      const id = FLOWER_IDS[Math.floor(rnd() * 10)];
      const act = Math.floor(rnd() * 6);
      if (act === 0) G.plant(w, Math.floor(rnd() * 5), id, now);
      else if (act === 1) G.harvest(w, Math.floor(rnd() * 5), now);
      else if (act === 2) G.fuse(w, id);
      else if (act === 3) G.makeBouquet(w, [id, FLOWER_IDS[Math.floor(rnd() * 10)], FLOWER_IDS[Math.floor(rnd() * 10)]]);
      else if (act === 4) { const k = Object.keys(w.garden.bouquets)[0]; if (k) G.giveBouquet(w, k, rnd() < 0.5 ? 'sell' : 'gift'); }
      else G.unlockWithCoins(w, id);
      for (const v of Object.values(w.garden.harvested)) expect(v).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(w.garden.bouquets)) expect(v).toBeGreaterThan(0);
      for (const v of Object.values(w.res)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('aller-retour sanitizeWorld', () => {
    const w = rich();
    G.plant(w, 0, 'daisy', T0);
    w.garden.harvested = { rose: 4 };
    G.makeBouquet(w, ['rose', 'rose', 'rose']);
    G.buyPlot(w);
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(back.garden.plotCount).toBe(5);
    expect(back.garden.plots[0]?.flower).toBe('daisy');
    expect(back.garden.plots[0]?.plantedAt).toBe(T0);
    expect(back.garden.bouquets).toEqual(w.garden.bouquets);
    expect(back.garden.harvested.rose).toBe(1);
    expect(back.extra['garden.bouquetsMade']).toBe(1);
  });
  it('sauvegarde corrompue → jardin par défaut utilisable', () => {
    const back = sanitizeWorld({ garden: { plots: [{ flower: 3 }, 'x'], plotCount: 'beaucoup', harvested: { rose: -4 } } });
    expect(back.garden.plotCount).toBe(4);
    expect(back.garden.plots.length).toBe(4);
    G.syncGarden(back, T0);
    expect(back.garden.plots.every((p) => p === null)).toBe(true);
  });
});
