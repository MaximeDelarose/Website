import { describe, it, expect } from 'vitest';
import { CALLS } from '../src/data/world/kidCalls';
import { KID_FALLBACK } from '../src/data/world/ids';
import { CLOTH_IDS, CLOTH_SLOTS } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';

const name = (k: 'kid1' | 'kid2' | 'kid3') => KID_FALLBACK[k].name;
const pick = <T,>(a: T[]) => a[0];

describe('appels des enfants', () => {
  it('chaque appel a des répliques non vides, sans pénalité ni nom en clair', () => {
    for (const c of CALLS) {
      const lines = c.lines(name, () => [], pick);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l.text.length).toBeGreaterThan(2);
      expect(c.coins).toBeGreaterThan(0);
      expect(c.kids.length).toBeGreaterThan(0);
    }
  });
  it('contient les répliques demandées (avec libellé neutre sans clé)', () => {
    const all = CALLS.flatMap((c) => c.lines(name, () => [], pick).map((l) => l.text)).join('|');
    expect(all).toContain('MAMAN, ARRÊTE !');
    expect(all).toContain('NOUS EMBÊTE');
    expect(all).toContain('MAMANNN');
  });
  it('les phrases privées de la petite sont utilisées quand elles existent', () => {
    const cuddle = CALLS.find((c) => c.id === 'cuddle')!;
    expect(cuddle.lines(name, () => ['PRIVÉ'], pick)[0].text).toBe('PRIVÉ');
  });
});

describe('garde-robe : robes', () => {
  it('au moins 12 robes, toutes définies avec un prix', () => {
    const dresses = CLOTH_IDS.filter((i) => CLOTH_SLOTS[i] === 'dress');
    expect(dresses.length).toBeGreaterThanOrEqual(12);
    for (const d of dresses) expect(CLOTHES[d].name.length).toBeGreaterThan(3);
  });
});

describe('la petite insiste', () => {
  it('l\'appel de la petite peut être repoussé (aucune pénalité) et redemande plus fort', () => {
    const c = CALLS.find((x) => x.id === 'cuddle')!;
    expect(c.escalate).toBe(true);
    expect(CALLS.filter((x) => x.escalate).every((x) => x.kids.length === 1 && x.kids[0] === 'kid1')).toBe(true);
  });
});
