import { describe, it, expect } from 'vitest';
import {
  MAX_GIFTS, MAX_QTY, MAX_LIVE_PARTICLES, MAX_PER_BURST, RARITY_COLOR, RARITY_ORDER, bankOf, cleanIcon, cleanText, flattenChain, lookFor, mergeRewards,
  particleAlpha, particleCount, planBurst, qtyText, rewardRarity, sanitizeReward, sanitizeSpec, stepParticle, timeline, augusteNote, GIFT_KINDS,
} from '../src/ui/rewards/logic';
import type { GiftKind, GiftRarity, GiftSpec } from '../src/ui/rewards/types';

const seq = (): (() => number) => { let i = 0; return () => ((i++ * 0.6180339) % 1); };

describe('sanitisation', () => {
  it('texte : sans balises ni caractères de contrôle, plafonné', () => {
    expect(cleanText('<b>Bonjour</b>\u0000 toi\n​♡')).toBe('Bonjour toi ♡');
    expect(cleanText('x'.repeat(500), 40)).toHaveLength(40);
    expect(cleanText({})).toBe('');
    expect(cleanText(null)).toBe('');
  });
  it('icône : data:image / blob / chemin relatif seulement', () => {
    expect(cleanIcon('data:image/png;base64,AAA')).toBeTruthy();
    expect(cleanIcon('./assets/x.png')).toBeTruthy();
    expect(cleanIcon('https://evil.example/x.png')).toBeUndefined();
    expect(cleanIcon('javascript:alert(1)')).toBeUndefined();
    expect(cleanIcon('data:text/html;base64,AAA')).toBeUndefined();
  });
  it('récompense : type inconnu, quantité nulle ou négative rejetées ; quantités bornées ; objets uniques = 1', () => {
    expect(sanitizeReward({ type: 'bitcoin', qty: 5 })).toBeNull();
    expect(sanitizeReward({ type: 'coins', qty: 0 })).toBeNull();
    expect(sanitizeReward({ type: 'coins', qty: -3 })).toBeNull();
    expect(sanitizeReward({ type: 'coins', qty: NaN })).toBeNull();
    expect(sanitizeReward({ type: 'coins', qty: 1e15 })?.qty).toBe(MAX_QTY);
    expect(sanitizeReward({ type: 'coins', qty: 12.9 })?.qty).toBe(12);
    expect(sanitizeReward({ type: 'cloth', id: 'dr-royal-gown', qty: 5 })?.qty).toBe(1);
    expect(sanitizeReward({ type: 'res', id: '<img src=x>', qty: 2 })?.id).toBe('imgsrcx');
    expect(sanitizeReward('coins')).toBeNull();
  });
  it('cadeau : valeurs par défaut sûres, jamais d\'exception', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}, { kind: 'zzz', rarity: 'mythic', rewards: 'no', chain: 7 }]) {
      const s = sanitizeSpec(raw);
      expect(GIFT_KINDS).toContain(s.kind);
      expect(RARITY_ORDER).toContain(s.rarity);
      expect(s.title.length).toBeGreaterThan(0);
      expect(Array.isArray(s.rewards)).toBe(true);
    }
  });
  it('cadeau : titre, sous-titre et message nettoyés ; jours bornés', () => {
    const s = sanitizeSpec({ kind: 'daily', rarity: 'rare', title: '<script>x</script>Salut', subtitle: 'a\u0007b', message: 'm'.repeat(999), rewards: [], day: { n: 99, of: 7 } });
    expect(s.title).toBe('xSalut');
    expect(s.subtitle).toBe('a b');
    expect(s.message!.length).toBeLessThanOrEqual(260);
    expect(s.day).toEqual({ n: 7, of: 7 });
    expect(sanitizeSpec({ kind: 'daily', rarity: 'rare', title: 't', rewards: [], day: { n: 1, of: 1 } }).day).toBeUndefined();
  });
  it('au plus 16 récompenses distinctes', () => {
    const rewards = Array.from({ length: 40 }, (_, i) => ({ type: 'cloth', id: `c${i}`, qty: 1 }));
    expect(sanitizeSpec({ kind: 'chest', rarity: 'common', title: 't', rewards }).rewards).toHaveLength(16);
  });
});

describe('fusion des récompenses', () => {
  it('additionne les identiques sans rien perdre, garde les objets uniques à part', () => {
    const m = mergeRewards([
      { type: 'coins', qty: 100 }, { type: 'coins', qty: 50 }, { type: 'res', id: 'cocoa', qty: 3 }, { type: 'res', id: 'flowers', qty: 4 },
      { type: 'res', id: 'cocoa', qty: 2 }, { type: 'cloth', id: 'a', qty: 1 }, { type: 'cloth', id: 'a', qty: 1 }, { type: 'coins', qty: 7, granted: true },
    ]);
    expect(m.find((r) => r.type === 'coins' && !r.granted)!.qty).toBe(150);
    expect(m.find((r) => r.type === 'coins' && r.granted)!.qty).toBe(7);
    expect(m.find((r) => r.id === 'cocoa')!.qty).toBe(5);
    expect(m.filter((r) => r.type === 'cloth')).toHaveLength(2);
    expect(m.reduce((n, r) => n + (r.type === 'coins' ? r.qty : 0), 0)).toBe(157);
  });
  it('le total ne dépasse jamais le plafond', () => {
    expect(mergeRewards([{ type: 'coins', qty: MAX_QTY }, { type: 'coins', qty: MAX_QTY }])[0].qty).toBe(MAX_QTY);
  });
});

describe('enchaînement', () => {
  const g = (t: string, chain?: GiftSpec[]): GiftSpec => ({ kind: 'chest', rarity: 'common', title: t, rewards: [], chain });
  it('3 cadeaux au plus, chacun sans chaîne', () => {
    const s = sanitizeSpec({ ...g('a', [g('b', [g('zz')]), g('c'), g('d'), g('e')]) });
    const flat = flattenChain(s);
    expect(flat.map((x) => x.title)).toEqual(['a', 'b', 'c']);
    expect(flat.length).toBeLessThanOrEqual(MAX_GIFTS);
    expect(flat.every((x) => !x.chain)).toBe(true);
  });
  it('un cadeau seul reste seul', () => { expect(flattenChain(g('a'))).toHaveLength(1); });
});

describe('raretés et variantes', () => {
  const kinds: GiftKind[] = ['start', 'daily', 'chest', 'event', 'premium', 'romantic'];
  it('chaque type a sa forme', () => {
    expect(lookFor('start', 'common').art).toBe('gift');
    expect(lookFor('daily', 'common').art).toBe('gift');
    expect(lookFor('chest', 'common').art).toBe('chest');
    expect(lookFor('event', 'common').art).toBe('event');
    expect(lookFor('premium', 'common').art).toBe('premium');
    expect(lookFor('romantic', 'common').art).toBe('casket');
  });
  it('couleurs des raretés conformes au cahier des charges', () => {
    expect(RARITY_COLOR).toEqual({ common: '#9FB4C7', uncommon: '#6FCF97', rare: '#5AA9FF', epic: '#B07CFF', legendary: '#FFC857' });
  });
  it('l\'intensité monte avec la rareté (flash, confettis, étoiles, pluie)', () => {
    for (const k of kinds) {
      let prev = lookFor(k, 'common');
      for (const r of RARITY_ORDER.slice(1)) {
        const l = lookFor(k, r);
        expect(l.flash).toBeGreaterThanOrEqual(prev.flash);
        expect(l.burst.stars).toBeGreaterThan(prev.burst.stars);
        expect(l.burst.rainMs).toBeGreaterThan(prev.burst.rainMs);
        expect(l.tier).toBeGreaterThan(prev.tier);
        prev = l;
      }
    }
  });
  it('épique : aura dorée, son spécial ; commun : simple, sans aura', () => {
    expect(lookFor('chest', 'epic').aura).toBe(true);
    expect(lookFor('chest', 'epic').sfx).toBe('epic');
    expect(lookFor('chest', 'legendary').sfx).toBe('legendary');
    expect(lookFor('chest', 'common').aura).toBe(false);
    expect(lookFor('chest', 'common').sfx).toBe('none');
    expect(lookFor('premium', 'common').aura).toBe(true);
  });
  it('romantique : cœurs, lueur rose, son tendre, flash adouci', () => {
    const l = lookFor('romantic', 'epic');
    expect(l.hearts).toBe(true);
    expect(l.burst.hearts).toBeGreaterThan(0);
    expect(l.sfx).toBe('love');
    expect(l.flash).toBeLessThan(lookFor('chest', 'epic').flash);
    expect(lookFor('chest', 'epic').hearts).toBe(false);
  });
  it('pré-ouverture entre 0,6 et 0,9 s pour toutes les raretés', () => {
    for (const k of kinds) for (const r of RARITY_ORDER as readonly GiftRarity[]) {
      const p = lookFor(k, r).preMs;
      expect(p).toBeGreaterThanOrEqual(600);
      expect(p).toBeLessThanOrEqual(900);
    }
  });
  it('invitation à toucher pour tous les types', () => {
    for (const k of kinds) expect(lookFor(k, 'rare').invite).toMatch(/^Touche pour ouvrir/);
  });
});

describe('minutage', () => {
  it('« Passer » raccourcit sans rien supprimer ; animations réduites : quasi instantané', () => {
    const l = lookFor('chest', 'epic');
    const n = timeline(l, 'normal'), f = timeline(l, 'fast'), r = timeline(l, 'reduced');
    for (const k of ['appear', 'pre', 'open', 'revealStep', 'fly'] as const) {
      expect(f[k]).toBeLessThan(n[k]);
      expect(r[k]).toBeLessThan(f[k]);
      expect(f[k]).toBeGreaterThan(0);
    }
  });
  it('le quotidien est plus rapide que le coffre', () => {
    expect(timeline(lookFor('daily', 'common'), 'normal').revealStep).toBeLessThan(timeline(lookFor('chest', 'common'), 'normal').revealStep);
  });
});

describe('budget de particules', () => {
  it('plafonné par salve et par total ; jamais négatif', () => {
    expect(particleCount(500, 0, false)).toBe(MAX_PER_BURST);
    expect(particleCount(30, MAX_LIVE_PARTICLES - 10, false)).toBe(10);
    expect(particleCount(30, MAX_LIVE_PARTICLES + 50, false)).toBe(0);
    expect(particleCount(-4, 0, false)).toBe(0);
    expect(particleCount(NaN, 0, false)).toBe(0);
  });
  it('animations réduites : 5 étoiles au plus', () => {
    expect(particleCount(200, 0, true)).toBe(5);
    expect(planBurst(0, 0, { kind: 'star', n: 99, colors: ['#fff'] }, 0, true)).toHaveLength(5);
  });
  it('une salve plafonnée, déterministe, et la simulation finit toujours', () => {
    const a = planBurst(10, 20, { kind: 'conf', n: 999, colors: ['#f00', '#0f0'] }, 0, false, seq());
    const b = planBurst(10, 20, { kind: 'conf', n: 999, colors: ['#f00', '#0f0'] }, 0, false, seq());
    expect(a).toHaveLength(MAX_PER_BURST);
    expect(a).toEqual(b);
    const p = a[0];
    let steps = 0;
    while (stepParticle(p, 1 / 60) && steps < 5000) steps++;
    expect(steps).toBeLessThan(5000);
    expect(particleAlpha({ ...p, age: 0 })).toBe(0);
    expect(particleAlpha({ ...p, age: p.life * 0.4 })).toBe(1);
  });
});

describe('libellés et raretés des récompenses', () => {
  it('compteurs visés', () => {
    expect(bankOf({ type: 'coins' })).toBe('coins');
    expect(bankOf({ type: 'res', id: 'cocoa' })).toBe('cocoa');
    expect(bankOf({ type: 'res' })).toBe('coins');
    expect(bankOf({ type: 'tickets' })).toBe('tickets');
    expect(bankOf({ type: 'cloth' })).toBeNull();
    expect(bankOf({ type: 'chest' })).toBeNull();
  });
  it('rareté de vignette', () => {
    expect(rewardRarity({ type: 'coins', qty: 5 }, 'epic')).toBe('common');
    expect(rewardRarity({ type: 'memory', qty: 1 }, 'common')).toBe('epic');
    expect(rewardRarity({ type: 'cloth', qty: 1 }, 'legendary')).toBe('legendary');
    expect(rewardRarity({ type: 'coins', qty: 5, rarity: 'rare' }, 'common')).toBe('rare');
  });
  it('quantités à la française', () => {
    expect(qtyText({ type: 'coins', qty: 250 })).toBe('×250');
    expect(qtyText({ type: 'cloth', qty: 1 })).toBe('');
  });
  it('messages d\'Auguste : toujours une phrase, quel que soit l\'indice', () => {
    for (const s of [0, 1, 7, -3, 1e9]) expect(augusteNote(s).length).toBeGreaterThan(10);
  });
});
