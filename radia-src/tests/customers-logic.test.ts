import { describe, it, expect } from 'vitest';
import { CUSTOMERS, customerById } from '../src/data/customers';
import { LOYALTY_STEPS, loyaltyLevel, loyaltyProgress, pickCustomer, requestLine, serve, storyLine, thanksLine, whatText } from '../src/game/customers/logic';
import { Rng } from '../src/utils/rng';
import { sanitizeFun, defaultFun } from '../src/save/fun';

describe('fidélité des clients', () => {
  it('cinq niveaux : 1 au départ, puis 2, 3, 4, 5 aux seuils', () => {
    expect([0, 1].map(loyaltyLevel)).toEqual([1, 1]);
    expect(LOYALTY_STEPS.map((n) => loyaltyLevel(n))).toEqual([2, 3, 4, 5]);
    expect(loyaltyLevel(999)).toBe(5);
  });
  it('progression vers le niveau suivant : 0..1, et pleine au niveau 5', () => {
    expect(loyaltyProgress(0)).toMatchObject({ level: 1, ratio: 0, need: 2 });
    expect(loyaltyProgress(1).ratio).toBeCloseTo(0.5);
    expect(loyaltyProgress(14)).toMatchObject({ level: 5, ratio: 1 });
  });
  it('chaque livraison augmente la fidélité ; un nouveau niveau débloque l\'histoire du client', () => {
    const st = {}; const rng = new Rng(3);
    const a = serve(st, 'yasmine', rng, 1000)!;
    expect(a).toMatchObject({ n: 1, levelFrom: 1, levelTo: 1 }); expect(a.story).toBeUndefined();
    const b = serve(st, 'yasmine', rng, 2000)!;
    expect(b).toMatchObject({ n: 2, levelFrom: 1, levelTo: 2 }); expect(b.story).toBe(customerById('yasmine')!.stories[0]);
    expect(st).toHaveProperty('yasmine.seenLevel', 2);
  });
  it('client inconnu : ignoré sans exception', () => { expect(serve({}, 'inconnu', new Rng(1), 0)).toBeNull(); });
  it('histoires : une par niveau 2 à 5, aucune au niveau 1', () => {
    const c = customerById('lina')!;
    expect(storyLine(c, 1)).toBeUndefined();
    expect([2, 3, 4, 5].map((l) => storyLine(c, l))).toEqual(c.stories);
  });
});

describe('choix du client d\'une commande', () => {
  it('jamais un client déjà affiché ; priorité aux goûts de la collection', () => {
    const rng = new Rng(11); const avoid = new Set(['inès', 'ines', 'sofia', 'antoine']);
    const got = new Map<string, number>();
    for (let i = 0; i < 400; i++) { const id = pickCustomer(rng, 'choc', avoid, {}); got.set(id, (got.get(id) ?? 0) + 1); }
    for (const a of avoid) expect(got.has(a)).toBe(false);
    const likers = CUSTOMERS.filter((c) => c.likes.includes('choc') && !avoid.has(c.id)).map((c) => c.id);
    const likerShare = likers.reduce((a, id) => a + (got.get(id) ?? 0), 0) / 400;
    expect(likerShare).toBeGreaterThan(0.6);
  });
  it('tous les clients disponibles finissent par apparaître (variété)', () => {
    const rng = new Rng(5); const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) seen.add(pickCustomer(rng, ['flowers', 'choc', 'gift', 'bag', 'jewel', 'cloth'][i % 6], new Set(), {}));
    expect(seen.size).toBe(CUSTOMERS.length);
  });
  it('si tous sont affichés, on ne plante pas', () => {
    expect(pickCustomer(new Rng(1), 'flowers', new Set(CUSTOMERS.map((c) => c.id)), {})).toBeTruthy();
  });
});

describe('répliques', () => {
  it('whatText : le nom de l\'objet entre guillemets (aucun faux accord), quantités et listes', () => {
    expect(whatText(['Savon à la rose'])).toBe('« Savon à la rose »');
    expect(whatText(['Bouquet', 'Bouquet'])).toBe('2 × « Bouquet »');
    expect(whatText(['Bouquet', 'Chocolat'])).toBe('« Bouquet » et « Chocolat »');
    expect(whatText([])).toBe('ça');
  });
  it('la demande contient la vraie commande', () => {
    const c = customerById('amira')!;
    for (let i = 0; i < 20; i++) expect(requestLine(c, new Rng(i + 1), 'deux savons à la rose')).toContain('deux savons à la rose');
  });
  it('remerciements : jamais deux fois le même d\'affilée, sur 200 livraisons', () => {
    const c = customerById('kenza')!; const rng = new Rng(9); let last = -1;
    for (let i = 0; i < 200; i++) { const t = thanksLine(c, rng, last); expect(t.idx).not.toBe(last); last = t.idx; }
  });
});

describe('sauvegarde de la fidélité', () => {
  it('lue sans exception, bornée, et conservée', () => {
    const f = sanitizeFun({ customers: { yasmine: { n: 7, last: 123, thanks: 2, seenLevel: 3 }, evil: { n: -5, last: 'x', thanks: 999, seenLevel: 99 }, bad: 42 } });
    expect(f.customers.yasmine).toEqual({ n: 7, last: 123, thanks: 2, seenLevel: 3 });
    expect(f.customers.evil.n).toBeGreaterThanOrEqual(0);
    expect(f.customers.evil.seenLevel).toBeLessThanOrEqual(5);
    expect(f.customers.bad).toBeUndefined();
    expect(defaultFun().customers).toEqual({});
    expect(sanitizeFun(null).customers).toEqual({});
  });
});

import { makeOrder } from '../src/game/endless';
import { Rng as R2 } from '../src/utils/rng';

describe('commandes avec clients', () => {
  it('chaque commande a un vrai client ; les trois commandes affichées ont trois clients différents', () => {
    const fun = defaultFun(); const rng = new R2(21);
    for (let k = 0; k < 200; k++) {
      const shown = new Set<string>(); const customers: string[] = [];
      for (const tier of ['easy', 'mid', 'hard'] as const) { const o = makeOrder(fun, rng, tier, k, new Set(), [], shown); expect(o.customer).toBeTruthy(); expect(customerById(o.customer!)).toBeTruthy(); shown.add(o.customer!); customers.push(o.customer!); }
      expect(new Set(customers).size).toBe(3);
    }
  });
  it('un client aime la collection qu\'il demande (le plus souvent)', () => {
    const fun = defaultFun(); const rng = new R2(8); let match = 0; const N = 400;
    for (let k = 0; k < N; k++) { const o = makeOrder(fun, rng, 'easy', k); const c = customerById(o.customer!)!; if (c.likes.includes(o.items[0].c as never)) match++; }
    expect(match / N).toBeGreaterThan(0.25);
  });
});
