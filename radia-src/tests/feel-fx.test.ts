import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParticleBudget, POP_AT_MS, comboLabel, comboMilestone, comboPitch, fxProfile, hexInt, mergeTier, popSfx, scaledCount,
} from '../src/game/fx/feel';
import { AUGUSTE_REACTIONS, pickReaction, resetReactionMemory, type ReactionKey } from '../src/game/fx/reactions';

describe('niveau d\'une fusion', () => {
  it('normal sous le niveau 6, rare à partir de 6, max au niveau maximal de la collection', () => {
    expect(mergeTier({ c: 'flowers', l: 2 }, 10)).toBe('normal');
    expect(mergeTier({ c: 'flowers', l: 5 }, 10)).toBe('normal');
    expect(mergeTier({ c: 'flowers', l: 6 }, 10)).toBe('rare');
    expect(mergeTier({ c: 'flowers', l: 9 }, 10)).toBe('rare');
    expect(mergeTier({ c: 'flowers', l: 10 }, 10)).toBe('max');
    expect(mergeTier({ c: 'castle', l: 8 }, 8)).toBe('max');
    expect(mergeTier({ c: 'castle', l: 7 }, 8)).toBe('rare');
    expect(mergeTier({ c: 'castle', l: 5 }, 8)).toBe('normal');
  });
  it('un objet spécial est traité comme rare', () => {
    expect(mergeTier({ c: 'special', l: 1 }, 1)).toBe('rare');
  });
  it('le POP arrive après ~160 ms (anticipation 70 ms + impact)', () => {
    expect(POP_AT_MS).toBeGreaterThanOrEqual(140);
    expect(POP_AT_MS).toBeLessThanOrEqual(200);
  });
});

describe('profil d\'effets', () => {
  it('complet : ralenti, rayons, secousse', () => {
    const p = fxProfile('full', false);
    expect(p.slowmo && p.shake).toBe(true);
    expect(p.rays).toBeGreaterThan(0);
    expect(p.particleScale).toBe(1);
  });
  it('effets réduits : moins de particules', () => {
    const p = fxProfile('reduced', false);
    expect(p.particleScale).toBeLessThan(0.5);
    expect(p.particleCap).toBeLessThan(fxProfile('full', false).particleCap);
  });
  it('animations réduites : jamais de ralenti, de rayons ni de secousse', () => {
    for (const eff of ['full', 'reduced'] as const) {
      const p = fxProfile(eff, true);
      expect(p.slowmo).toBe(false);
      expect(p.rays).toBe(0);
      expect(p.shake).toBe(false);
    }
  });
  it('scaledCount garde au moins 1 particule si on en demande', () => {
    expect(scaledCount(0, fxProfile('full', false))).toBe(0);
    expect(scaledCount(1, fxProfile('reduced', true))).toBe(1);
    expect(scaledCount(30, fxProfile('reduced', false))).toBe(12);
  });
});

describe('budget de particules', () => {
  it('ne dépasse jamais le plafond et rend ce qui est libéré', () => {
    const b = new ParticleBudget(10);
    expect(b.take(6)).toBe(6);
    expect(b.take(6)).toBe(4);
    expect(b.take(1)).toBe(0);
    b.release(3);
    expect(b.take(5)).toBe(3);
    b.release(100);
    expect(b.live).toBe(0);
  });
  it('30 fusions enchaînées ne dépassent jamais le plafond', () => {
    const b = new ParticleBudget(fxProfile('full', false).particleCap);
    let max = 0;
    for (let i = 0; i < 30; i++) { b.take(30); max = Math.max(max, b.live); if (i % 3 === 0) b.release(20); }
    expect(max).toBeLessThanOrEqual(110);
  });
});

describe('sons de POP', () => {
  it('ordinaire : variantes, jamais deux fois la même d\'affilée', () => {
    let last: ReturnType<typeof popSfx>['name'] | undefined;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const p = popSfx('normal', 3, 1, (i * 0.37) % 1, last);
      expect(p.name).not.toBe(last);
      seen.add(p.name);
      last = p.name;
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
  it('la hauteur monte avec le niveau et le combo, plafonnée', () => {
    const a = popSfx('normal', 1, 1, 0).pitch;
    const b = popSfx('normal', 5, 1, 0).pitch;
    const c = popSfx('normal', 5, 6, 0).pitch;
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(popSfx('normal', 10, 99, 0).pitch).toBeLessThanOrEqual(1.7);
  });
  it('rare = double POP, max = grand accord', () => {
    expect(popSfx('rare', 6, 1, 0).name).toBe('popRare');
    expect(popSfx('max', 10, 1, 0).name).toBe('maxMerge');
  });
});

describe('combo', () => {
  it('paliers 3, 5 et 8 seulement', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(comboMilestone)).toEqual([0, 0, 1, 0, 2, 0, 0, 3, 0]);
  });
  it('hauteur croissante et plafonnée', () => {
    expect(comboPitch(1)).toBe(1);
    expect(comboPitch(4)).toBeGreaterThan(comboPitch(2));
    expect(comboPitch(50)).toBe(comboPitch(7));
  });
  it('libellé discret', () => {
    expect(comboLabel(4)).toBe('Combo 4');
    expect(comboLabel(4, 1.5)).toBe('Combo 4 · ×1.5');
    expect(comboLabel(6, 2)).toBe('Combo 6 · ×2');
  });
  it('hexInt', () => { expect(hexInt('#FFC857')).toBe(0xffc857); });
});

describe('réactions d\'Auguste', () => {
  const keys: ReactionKey[] = ['rare', 'maxMerge', 'combo3', 'combo5', 'chest', 'drop'];
  beforeEach(() => resetReactionMemory());
  it('toutes les clés ont des répliques variées (≥ 6) et sans doublon', () => {
    for (const k of keys) {
      const l = AUGUSTE_REACTIONS[k];
      expect(l.length).toBeGreaterThanOrEqual(6);
      expect(new Set(l).size).toBe(l.length);
    }
  });
  it('contient les exemples validés', () => {
    expect(AUGUSTE_REACTIONS.rare).toContain('Mais t\'as une chance de malade !');
    expect(AUGUSTE_REACTIONS.rare).toContain('Ah ouais, carrément ! Bien joué.');
    expect(AUGUSTE_REACTIONS.chest).toContain('Tiens, ça c\'est pour toi.');
  });
  it('« galbi » : au plus 1 réplique sur 12', () => {
    const all = keys.flatMap((k) => AUGUSTE_REACTIONS[k]);
    const g = all.filter((l) => /galbi/i.test(l)).length;
    expect(g / all.length).toBeLessThanOrEqual(1 / 12);
    for (const k of keys) expect(AUGUSTE_REACTIONS[k].filter((l) => /galbi/i.test(l)).length / AUGUSTE_REACTIONS[k].length).toBeLessThanOrEqual(1 / 8);
  });
  it('pas théâtral : pas de majuscules criées ni de points d\'exclamation en rafale', () => {
    for (const l of keys.flatMap((k) => AUGUSTE_REACTIONS[k])) {
      expect(l).not.toMatch(/!{2,}/);
      expect(l).not.toMatch(/\b[A-ZÉ]{4,}\b/);
      expect(l.length).toBeLessThanOrEqual(70);
    }
  });
  it('pickReaction ne répète jamais la réplique précédente ni les 2 d\'avant', () => {
    let seed = 7;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const k of keys) {
      resetReactionMemory();
      const hist: string[] = [];
      for (let i = 0; i < 80; i++) {
        const l = pickReaction(k, rng);
        expect(AUGUSTE_REACTIONS[k]).toContain(l);
        expect(hist.slice(-3)).not.toContain(l);
        hist.push(l);
      }
    }
  });
  it('avec un rng figé, retombe quand même sur une réplique différente', () => {
    const a = pickReaction('drop', () => 0);
    const b = pickReaction('drop', () => 0);
    expect(a).not.toBe(b);
  });
});
