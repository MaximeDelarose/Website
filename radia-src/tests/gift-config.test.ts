import { describe, it, expect } from 'vitest';
import { resolveGift, giftErrors, partnerNames, cleanName, PARTNER_FIELD_LABELS } from '../src/config/resolve';
import { GIFT, PARTNER, PARTNER_DE } from '../src/config/gift';

const FILES = import.meta.glob('../src/config/gifts/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const load = (id: string): unknown => FILES[`../src/config/gifts/${id}.json`];

describe('prénom du compagnon (configurable)', () => {
  it('élision : d\'Auguste, de Thomas, d\'Hugo (h muet toléré), de ta moitié', () => {
    const f = (name: string) => partnerNames({ name, fieldLabel: 'x', fallbackName: 'Ta moitié' });
    expect(f('Auguste').de).toBe('d\'Auguste');
    expect(f('Thomas').de).toBe('de Thomas');
    expect(f('Éloi').de).toBe('d\'Éloi');
    expect(f('Hugo').de).toBe('d\'Hugo');
    expect(f('').name).toBe('Ta moitié');
    expect(f('').de).toBe('de ta moitié');
    expect(f('').generic).toBe(true);
  });
  it('un prénom vide, absent ou invalide ne donne jamais un champ vide', () => {
    for (const bad of [undefined, null, '', '   ', 42, {}]) {
      const g = resolveGift({ id: 'x', partner: { name: bad } });
      expect(partnerNames(g.config.partner).name).toBe('Ta moitié');
    }
  });
  it('nettoyage : espaces, longueur, caractères de gabarit', () => {
    expect(cleanName('  Jean   Marc ')).toBe('Jean Marc');
    expect(cleanName('a${b}`c')).not.toMatch(/[`$\\]/);
    expect(cleanName('x'.repeat(100)).length).toBe(40);
  });
  it('libellés du champ pour les futures offres', () => {
    expect(PARTNER_FIELD_LABELS).toContain('Prénom de votre homme');
    expect(PARTNER_FIELD_LABELS).toContain('Prénom de votre partenaire');
    expect(PARTNER_FIELD_LABELS).toContain('Prénom de votre femme');
    expect(resolveGift(load('radia')).config.partner.fieldLabel).toBe('Prénom de votre homme');
  });
  it('le libellé du champ n\'est affiché nulle part dans le jeu', () => {
    expect(GIFT.partner.fieldLabel).not.toBe(PARTNER);
  });
});

describe('configurations de cadeau', () => {
  const ids = Object.keys(FILES).map((f) => f.replace(/^.*\/|\.json$/g, ''));
  it('au moins radia et demo', () => { expect(ids).toEqual(expect.arrayContaining(['radia', 'demo'])); });
  for (const id of ids) {
    it(`« ${id} » : valide, sans correction automatique`, () => {
      const raw = load(id);
      expect(giftErrors(raw)).toEqual([]);
      const r = resolveGift(raw);
      expect(r.problems).toEqual([]);
      expect(r.config.id).toBe(id);
    });
  }
  it('radia et demo ne partagent ni cache ni identifiant d\'application', () => {
    const a = resolveGift(load('radia')).config, b = resolveGift(load('demo')).config;
    expect(a.pwa.cachePrefix).not.toBe(b.pwa.cachePrefix);
    expect(a.pwa.id).not.toBe(b.pwa.id);
    expect(a.partner.name).not.toBe(b.partner.name);
  });
  it('une configuration incomplète ne casse pas le jeu mais bloque la livraison', () => {
    expect(resolveGift(null).config.app.title).toBeTruthy();
    expect(resolveGift('n\'importe quoi').config.pwa.cachePrefix).toBeTruthy();
    expect(giftErrors({})).not.toEqual([]);
    expect(giftErrors({ id: 'Bad Id!' })).not.toEqual([]);
    const bad = resolveGift({ id: 'ok', app: { themeColor: 'rouge' } });
    expect(bad.config.app.themeColor).toBe('#51446D');
    expect(bad.problems.join()).toMatch(/themeColor/);
  });
  it('configuration active (tests) = radia', () => {
    expect(GIFT.id).toBe('radia');
    expect(PARTNER).toBe('Auguste');
    expect(PARTNER_DE).toBe('d\'Auguste');
  });
});
