import { describe, it, expect } from 'vitest';
import { PLACES, PLACE_IDS, STAGES, type Obj, type PlaceId } from '../src/domain/places';
import { FURNITURE } from '../src/data/world/furniture';
import { CLOTHES } from '../src/data/world/wardrobe';
import { FLOWERS } from '../src/data/world/garden';
import { CHOCS } from '../src/data/world/chocolate';
import { PALETTE } from '../src/data/world/ids';
import { collMax, COLLECTIONS } from '../src/data/items';
import { ENDLESS_CFG as C } from '../src/game/endless/config';

const allStages = () => PLACE_IDS.flatMap((id) => PLACES[id].stages.map((s, i) => ({ id, i, s })));

describe('données des lieux : cohérence', () => {
  it('dix lieux, dont ceux du cahier, chacun avec 4 étapes', () => {
    expect(PLACE_IDS).toHaveLength(10);
    for (const id of PLACE_IDS) {
      const p = PLACES[id];
      expect(p.id).toBe(id);
      expect(p.stages).toHaveLength(STAGES);
      expect(p.name.length).toBeGreaterThanOrEqual(3);
    }
    const names = PLACE_IDS.map((i) => PLACES[i].name);
    for (const n of ['Salon de thé', 'Boutique de fleurs', 'Chocolaterie de luxe', 'Hôtel', 'Restaurant', 'Boutique de vêtements', 'Spa', 'Terrasse romantique', 'Aile du château', 'Le Casino Royal ♛']) expect(names).toContain(n);
  });
  it('chaque étape : nom, description, ≥ 1 objectif, coût positif, ≥ 1 récompense', () => {
    for (const { id, i, s } of allStages()) {
      const tag = `${id}#${i}`;
      expect(s.name.length, tag).toBeGreaterThan(3);
      expect(s.blurb.length, tag).toBeGreaterThan(10);
      expect(s.objs.length, tag).toBeGreaterThanOrEqual(1);
      expect(s.rewards.length, tag).toBeGreaterThanOrEqual(1);
      expect(Object.values(s.cost).reduce((a, b) => a + (b ?? 0), 0), tag).toBeGreaterThan(0);
      expect(Object.values(s.cost).every((n) => Number.isInteger(n) && (n as number) >= 0), tag).toBe(true);
    }
  });
  it('les récompenses désignent des éléments existants (meubles, vêtements, fleurs, recettes)', () => {
    for (const { id, i, s } of allStages()) for (const r of s.rewards) {
      const tag = `${id}#${i}`;
      if (r.t === 'furn') expect(FURNITURE[r.id], tag + r.id).toBeTruthy();
      if (r.t === 'cloth') expect(CLOTHES[r.id], tag + r.id).toBeTruthy();
      if (r.t === 'flower') expect(FLOWERS[r.id], tag + r.id).toBeTruthy();
      if (r.t === 'recipe') expect(CHOCS[r.id], tag + r.id).toBeTruthy();
      if (r.t === 'diamonds') expect(r.n).toBeGreaterThan(0);
    }
  });
  it('chaque vêtement n\'est offert que par un seul lieu et n\'est pas un cadeau réservé', () => {
    const seen = new Map<string, string>();
    for (const { id, s } of allStages()) for (const r of s.rewards) if (r.t === 'cloth') {
      expect(seen.get(r.id), r.id).toBeUndefined();
      seen.set(r.id, id);
      expect(CLOTHES[r.id].gift).toBeFalsy();
      expect(CLOTHES[r.id].free).toBeFalsy();
    }
  });
  it('dépendances : lieux existants, étapes valides, aucun cycle, au moins une racine', () => {
    const deps = (id: PlaceId) => PLACES[id].reqs.flatMap((r) => (r.k === 'place' ? [r] : []));
    for (const id of PLACE_IDS) for (const r of deps(id)) { expect(PLACES[r.id]).toBeTruthy(); expect(r.stage).toBeGreaterThanOrEqual(1); expect(r.stage).toBeLessThanOrEqual(STAGES); expect(r.id).not.toBe(id); }
    const state = new Map<PlaceId, 0 | 1 | 2>();
    const visit = (id: PlaceId): void => {
      if (state.get(id) === 2) return;
      expect(state.get(id), `cycle sur ${id}`).not.toBe(1);
      state.set(id, 1);
      deps(id).forEach((r) => visit(r.id));
      state.set(id, 2);
    };
    PLACE_IDS.forEach(visit);
    expect(PLACE_IDS.filter((id) => deps(id).length === 0).length).toBeGreaterThanOrEqual(2);
  });
  it('le Casino Royal est le dernier maillon (dépend de l\'hôtel et de la terrasse)', () => {
    expect(PLACES.casino.reqs.map((r) => (r.k === 'place' ? r.id : r.k)).sort()).toEqual(['hotel', 'terrace']);
    expect(PLACES.casino.link?.to).toBe('casino');
  });
  it('choix : étape valide, couleurs de la palette, défaut dans les options, au plus un par id et par étape', () => {
    const palette = PALETTE.map((p) => p.id as string);
    for (const id of PLACE_IDS) {
      const seen = new Set<string>();
      for (const ch of PLACES[id].choices) {
        expect(ch.at).toBeGreaterThanOrEqual(0); expect(ch.at).toBeLessThan(STAGES);
        expect(ch.options.length).toBeGreaterThanOrEqual(3);
        expect(ch.options.every((o) => palette.includes(o))).toBe(true);
        expect(ch.options).toContain(ch.def);
        expect(seen.has(ch.id)).toBe(false);
        seen.add(ch.id);
      }
      expect(PLACES[id].choices.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('objectifs : niveaux dans la collection, clés uniques dans une étape, services valides', () => {
    for (const { id, i, s } of allStages()) {
      const keys = new Set<string>();
      for (const o of s.objs as Obj[]) {
        if (o.k === 'reach' || o.k === 'gen') { expect(o.l).toBeGreaterThanOrEqual(2); expect(o.l).toBeLessThanOrEqual(Math.min(7, collMax(o.coll))); }
        if ('coll' in o && o.coll) expect(COLLECTIONS[o.coll]).toBeTruthy();
        if ('n' in o) expect(o.n).toBeGreaterThan(0);
        const k = JSON.stringify(o); expect(keys.has(k), `${id}#${i}`).toBe(false); keys.add(k);
      }
    }
    for (const id of PLACE_IDS) {
      const svc = PLACES[id].service;
      expect(svc, id).toBeTruthy();
      expect(svc!.options.length).toBeGreaterThanOrEqual(1);
      for (const o of svc!.options) { expect(Object.keys(o.gain).length).toBeGreaterThan(0); expect(o.line.length).toBeGreaterThan(8); }
    }
  });
  it('aucun prénom d\'enfant ni lien de photo dans les textes', () => {
    const txt = JSON.stringify(PLACES);
    expect(txt).not.toMatch(/h-qegA2s1K0|https?:\/\//);
  });
});

describe('économie : un chemin faisable avec les gains du moteur', () => {
  // Gain moyen par commande (rampe terminée), d'après config.ts : le même calcul que orders.ts › orderReward.
  const O = C.orders;
  const tiers = ['easy', 'mid', 'hard'] as const;
  const coinsPerOrder = tiers.reduce((a, t) => a + ((O.budget[t][0] + O.budget[t][1]) / 2) * O.coinsPerTap * O.tierMult[t], 0) / 3;
  const matPerOrder = tiers.reduce((a, t) => a + O.matN[t], 0) / 3; // quand la commande contient une collection à matériau
  const totals = { coins: 0, flowers: 0, fabric: 0, cocoa: 0 };
  let ordersObjectives = 0;
  let unlockNeed = 0;
  for (const { s } of allStages()) {
    for (const [k, n] of Object.entries(s.cost) as [keyof typeof totals, number][]) totals[k] += n;
    for (const o of s.objs) {
      if (o.k === 'orders') ordersObjectives += o.n;
      if ('coll' in o && o.coll) unlockNeed = Math.max(unlockNeed, C.unlock.at[o.coll]);
    }
  }

  it('toutes les collections demandées se débloquent par des commandes (moteur : paliers de config.ts)', () => {
    expect(unlockNeed).toBeLessThanOrEqual(C.unlock.at.castle);
    expect(unlockNeed).toBeGreaterThan(0);
  });
  it('chaque étape coûte au plus 2 000 pièces et 40 d\'un matériau (≈ 18 commandes de revenu)', () => {
    for (const { id, i, s } of allStages()) {
      expect(s.cost.coins ?? 0, `${id}#${i}`).toBeLessThanOrEqual(2000);
      for (const k of ['flowers', 'fabric', 'cocoa'] as const) expect(s.cost[k] ?? 0, `${id}#${i}`).toBeLessThanOrEqual(40);
    }
    expect(2000 / coinsPerOrder).toBeLessThan(35); // (économie resserrée : pièces plus précieuses)
  });
  it('les premières étapes sont courtes : salon de thé, étape 1 = quelques commandes et peu de ressources', () => {
    const s = PLACES.tea.stages[0];
    expect((s.cost.coins ?? 0) / coinsPerOrder).toBeLessThan(2.5);
    expect(s.objs).toEqual([{ k: 'orders', n: 3 }]);
  });
  it('tout le domaine se finance en moins de 400 commandes-équivalents (revenus du moteur, sans compter les fusions)', () => {
    const byCoins = totals.coins / coinsPerOrder;
    const byMats = Math.max(totals.flowers, totals.fabric, totals.cocoa) / (matPerOrder * 0.5); // une commande sur deux donne ce matériau
    const needed = Math.max(byCoins, byMats, unlockNeed, ordersObjectives);
    expect(needed).toBeLessThan(400);
    expect(needed).toBeGreaterThan(40); // c'est bien un objectif de longue durée
  });
});
