import { describe, it, expect } from 'vitest';
import { CUSTOMERS, customerById, customersWhoLike } from '../src/data/customers';

const ALL_TEXT = (c: (typeof CUSTOMERS)[number]) => [...c.requests, ...c.thanks, ...c.stories, c.name, c.trait];
const NAMES = ['Yasmine', 'Inès', 'Amira', 'Nour', 'Kenza', 'Lina', 'Meriem', 'Leïla', 'Sarah', 'Sofia', 'Nadia', 'Samira', 'Camille', 'Chloé', 'Emma', 'Thomas', 'Antoine', 'Julien'];

describe('clients récurrents', () => {
  it('au moins 20 clients, avec tous les prénoms demandés', () => {
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(20);
    for (const n of NAMES) expect(CUSTOMERS.some((c) => c.name === n)).toBe(true);
  });
  it('identifiants et prénoms uniques', () => {
    expect(new Set(CUSTOMERS.map((c) => c.id)).size).toBe(CUSTOMERS.length);
    expect(new Set(CUSTOMERS.map((c) => c.name)).size).toBe(CUSTOMERS.length);
    expect(customerById('lina')?.name).toBe('Lina');
  });
  it('AUCUN âge, origine ou nationalité (données et textes)', () => {
    const bad = /\b(\d{1,2}\s*ans|ans\b|âgée?|origine|nationalité|marocain|algérien|tunisien|français|française|arabe|maghreb|musulman|religion)\b/i;
    for (const c of CUSTOMERS) {
      expect(Object.keys(c)).not.toContain('age');
      expect(Object.keys(c)).not.toContain('origin');
      for (const t of ALL_TEXT(c)) expect(t, `${c.id}: ${t}`).not.toMatch(bad);
    }
  });
  it('répliques courtes ; chaque demande contient {what} ; au moins 3 demandes, 4 remerciements différents, 4 histoires', () => {
    for (const c of CUSTOMERS) {
      expect(c.requests.length).toBeGreaterThanOrEqual(3);
      for (const r of c.requests) expect(r).toContain('{what}');
      expect(new Set(c.thanks).size).toBeGreaterThanOrEqual(4);
      expect(c.stories.length).toBe(4);
      for (const t of [...c.requests.map((r) => r.replace('{what}', 'deux savons à la rose')), ...c.thanks, ...c.stories]) expect(t.length, `${c.id}: ${t}`).toBeLessThanOrEqual(120);
    }
  });
  it('portraits variés : teintes, formes, coiffures, couleurs — aucun doublon exact', () => {
    const key = (p: (typeof CUSTOMERS)[number]['portrait']) => JSON.stringify([p.skin, p.face, p.hair, p.hairColor, p.hijab ?? '', p.accessory, p.eyes, p.mouth, p.top]);
    expect(new Set(CUSTOMERS.map((c) => key(c.portrait))).size).toBe(CUSTOMERS.length);
    expect(new Set(CUSTOMERS.map((c) => c.portrait.skin)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(CUSTOMERS.map((c) => c.portrait.hair)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(CUSTOMERS.map((c) => c.portrait.face)).size).toBe(4);
    expect(new Set(CUSTOMERS.map((c) => c.portrait.bg)).size).toBeGreaterThanOrEqual(15);
  });
  it('hijabs demandés : Yasmine beige, Amira rose poudré, Nour lavande, Lina vert sauge, Leïla crème', () => {
    for (const id of ['yasmine', 'amira', 'nour', 'lina', 'leila']) expect(customerById(id)?.portrait.hijab, id).toBeTruthy();
    const hj = new Set(CUSTOMERS.filter((c) => c.portrait.hijab).map((c) => c.portrait.hijab));
    expect(hj.size).toBe(CUSTOMERS.filter((c) => c.portrait.hijab).length); // couleurs toutes différentes
  });
  it('le hijab n\'impose rien : parmi les portraits voilés, les personnalités et les goûts sont variés et jamais identiques', () => {
    const veiled = CUSTOMERS.filter((c) => c.portrait.hijab);
    expect(new Set(veiled.map((c) => c.trait)).size).toBe(veiled.length);
    // les expressions religieuses ne sont pas systématiques : au plus 1 réplique de remerciement par client
    const rel = /(allah|wallah|inch|hamdoul|bismillah|masha)/i;
    for (const c of CUSTOMERS) expect(c.thanks.filter((t) => rel.test(t)).length).toBeLessThanOrEqual(1);
    // et elles ne sont pas réservées aux portraits voilés
    expect(CUSTOMERS.filter((c) => !c.portrait.hijab && c.thanks.some((t) => rel.test(t))).length).toBeGreaterThanOrEqual(1);
  });
  it('Lina peut devenir partenaire ; elle est la seule à l\'être pour commencer', () => {
    expect(CUSTOMERS.filter((c) => c.partner).map((c) => c.id)).toEqual(['lina']);
  });
  it('chaque goût a au moins un client (choix d\'un client cohérent avec la commande)', () => {
    for (const like of ['flowers', 'choc', 'gift', 'soap', 'perfume', 'pastry'] as const) expect(customersWhoLike(like).length).toBeGreaterThanOrEqual(2);
  });
});
