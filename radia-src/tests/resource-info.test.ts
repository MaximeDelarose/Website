import { describe, it, expect } from 'vitest';
import { RES_INFO, RES_ORDER } from '../src/data/resourceInfo';

describe('fiches de ressources', () => {
  it('chaque ressource a un nom, un usage et au moins une méthode d\'obtention', () => {
    for (const id of RES_ORDER) {
      const r = RES_INFO[id];
      expect(r.id).toBe(id);
      expect(r.name.length).toBeGreaterThan(2);
      expect(r.use.length).toBeGreaterThan(10);
      expect(r.ways.length).toBeGreaterThan(0);
      for (const w of r.ways) expect(w.length).toBeGreaterThan(5);
    }
  });
  it('fiches courtes (pas de fenêtre géante)', () => {
    for (const id of RES_ORDER) { const r = RES_INFO[id]; expect(r.ways.length).toBeLessThanOrEqual(6); expect(r.use.length).toBeLessThan(140); }
  });
  it('aucune promesse d\'argent réel : tickets gratuits, diamants sans vrai paiement', () => {
    expect(RES_INFO.tickets.note).toMatch(/Gratuits/);
    expect(RES_INFO.diamonds.note).toMatch(/aucun vrai paiement/);
    for (const id of RES_ORDER) for (const w of RES_INFO[id].ways) expect(w).not.toMatch(/acheter avec de l'argent|euros|€/i);
  });
});
