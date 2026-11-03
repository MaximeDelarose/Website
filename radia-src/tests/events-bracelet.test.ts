import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave, sanitizeWorld } from '../src/save/schema';
import { CLOTH_SLOTS, accGroup } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import * as W from '../src/game/world/wardrobe';
import { SHINE_DURATION, SHINE_PERIOD, SHINE_GAPS, SHINE_STEPS, shineAt, shineStep, quantizeShine, shineGlow } from '../src/game/art/world/wristShine';
import { PROMISE_LINES, PROMISE_DESC, PROMISE_TITLE } from '../src/events/bracelet/data';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);
const w = () => save.data.world;
beforeEach(() => { save.data = defaultSave(); });

describe('shineAt', () => {
  it('reste dans [0,1], sans NaN, sur une longue plage de temps (y compris négative)', () => {
    for (let t = -50; t < 200; t += 0.037) {
      const s = shineAt(t);
      expect(Number.isNaN(s)).toBe(false);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
    for (const bad of [NaN, Infinity, -Infinity]) expect(shineAt(bad)).toBe(0);
  });
  it('est périodique (période = somme des intervalles)', () => {
    expect(SHINE_PERIOD).toBeCloseTo(SHINE_GAPS.reduce((a, b) => a + b, 0), 9);
    for (const t of [0.2, 0.45, 1.3, 5.0, 5.4, 7.7, 11.2]) expect(shineAt(t + SHINE_PERIOD)).toBeCloseTo(shineAt(t), 6);
  });
  it('un reflet de ~0,9 s toutes les 4–6 s, 0 le reste du temps', () => {
    for (const g of SHINE_GAPS) { expect(g).toBeGreaterThanOrEqual(4); expect(g).toBeLessThanOrEqual(6); }
    expect(SHINE_DURATION).toBeCloseTo(0.9, 5);
    expect(shineAt(0)).toBe(0);
    expect(shineAt(SHINE_DURATION * 0.5)).toBeCloseTo(0.5, 6);
    expect(shineAt(SHINE_DURATION + 0.01)).toBe(0);
    expect(shineAt(SHINE_GAPS[0] - 0.01)).toBe(0);
    // les reflets du début de chaque intervalle
    let start = 0;
    for (const g of SHINE_GAPS) { expect(shineAt(start + 0.45)).toBeGreaterThan(0); expect(shineAt(start + 2)).toBe(0); start += g; }
    // part de temps éclairée : seulement ~ 0,9 s sur 5
    let lit = 0, n = 0;
    for (let t = 0; t < SHINE_PERIOD; t += 0.01) { n++; if (shineAt(t) > 0) lit++; }
    expect(lit / n).toBeGreaterThan(0.1); expect(lit / n).toBeLessThan(0.25);
  });
  it('toujours 0 si les effets sont réduits', () => {
    for (let t = 0; t < 40; t += 0.05) expect(shineAt(t, true)).toBe(0);
  });
  it('quantifié en 6 pas : 0 reste 0, tout reflet > 0 donne un pas 1…6', () => {
    expect(shineStep(0)).toBe(0);
    expect(shineStep(-1)).toBe(0);
    expect(shineStep(NaN)).toBe(0);
    expect(shineStep(0.0001)).toBe(1);
    expect(shineStep(1)).toBe(SHINE_STEPS);
    expect(shineStep(7)).toBe(SHINE_STEPS);
    const seen = new Set<number>();
    for (let t = 0; t < SHINE_PERIOD; t += 0.01) seen.add(shineStep(shineAt(t)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (let s = 0; s <= 1; s += 0.013) { const q = quantizeShine(s); expect(q).toBeGreaterThanOrEqual(0); expect(q).toBeLessThanOrEqual(1); expect(q * SHINE_STEPS).toBeCloseTo(Math.round(q * SHINE_STEPS), 9); }
  });
  it('intensité lumineuse : nulle aux bornes, maximale à mi-course, jamais NaN', () => {
    expect(shineGlow(0)).toBe(0);
    expect(shineGlow(1)).toBeCloseTo(0, 6);
    expect(shineGlow(0.5)).toBeCloseTo(1, 6);
    for (let s = -0.5; s < 1.5; s += 0.05) expect(Number.isNaN(shineGlow(s))).toBe(false);
  });
});

describe('fiche du bracelet', () => {
  it('br-promise : emplacement acc, famille « wrist », cadeau, jamais en vente', () => {
    expect(CLOTH_SLOTS['br-promise']).toBe('acc');
    expect(accGroup('br-promise')).toBe('wrist');
    const d = CLOTHES['br-promise'];
    expect(d.gift).toBe(true);
    expect(d.name).toBe(PROMISE_TITLE);
    expect(d.name).toBe('La promesse d’Auguste ♡');
    expect(d.styles).toEqual(expect.arrayContaining(['romantic', 'royal']));
    expect(PROMISE_DESC).toBe('Un bracelet délicat offert lors d’une soirée inoubliable. Un petit symbole de sincérité, qui brille doucement au poignet de Radia.');
    expect(PROMISE_LINES).toHaveLength(4);
  });
});

describe('cadeau non achetable', () => {
  it('canBuy / buy refusent, même très riche, en pièces comme en diamants, sans rien débiter', () => {
    w().res.coins = 999999; w().res.fabric = 999; save.data.economy.diamonds = 999;
    expect(W.canBuy('br-promise', 'coins')).toEqual({ ok: false, reason: 'gift' });
    expect(W.canBuy('br-promise', 'diamonds')).toEqual({ ok: false, reason: 'gift' });
    expect(W.buy('br-promise', 'coins').ok).toBe(false);
    expect(W.buy('br-promise', 'diamonds').ok).toBe(false);
    expect(w().res.coins).toBe(999999);
    expect(save.data.economy.diamonds).toBe(999);
    expect(W.owns('br-promise')).toBe(false);
  });
  it('non possédé : impossible de l\'équiper', () => {
    expect(W.equip('br-promise')).toEqual({ ok: false, reason: 'not-owned' });
    expect(W.getLook().acc).not.toContain('br-promise');
  });
  it('les autres pièces restent achetables', () => {
    w().res.coins = 1000;
    expect(W.canBuy('ac-pearls').ok).toBe(true);
  });
});

describe('cadeau reçu', () => {
  it('grantGift l\'ajoute sans débit, est idempotent et ne sert pas à contourner la boutique', () => {
    w().res.coins = 123;
    expect(W.grantGift('br-promise')).toEqual({ ok: true, added: true });
    expect(W.owns('br-promise')).toBe(true);
    expect(W.grantGift('br-promise')).toEqual({ ok: true, added: false });
    expect(w().wardrobe.owned.filter((x) => x === 'br-promise')).toHaveLength(1);
    expect(w().res.coins).toBe(123);
    expect(W.canBuy('br-promise').reason).toBe('owned');
    expect(W.grantGift('ac-pearls').ok).toBe(false); // pas un cadeau
    expect(W.owns('ac-pearls')).toBe(false);
  });
  it('équipable puis retirable librement, plusieurs fois', () => {
    W.grantGift('br-promise');
    expect(W.equip('br-promise').ok).toBe(true);
    expect(W.isEquipped('br-promise')).toBe(true);
    expect(W.getLook().acc).toContain('br-promise');
    expect(W.unequip('br-promise').ok).toBe(true);
    expect(W.isEquipped('br-promise')).toBe(false);
    expect(W.getLook().acc).not.toContain('br-promise');
    expect(W.owns('br-promise')).toBe(true);
    expect(W.equip('br-promise').ok).toBe(true);
    expect(W.getLook().acc).toContain('br-promise');
  });
  it('cohabite avec un bijou de cou / boucles : une seule pièce par famille', () => {
    W.grantGift('br-promise');
    w().wardrobe.owned.push('ac-pearls', 'ea-hearts');
    W.equip('ac-pearls'); W.equip('ea-hearts'); W.equip('br-promise');
    expect(W.getLook().acc).toEqual(expect.arrayContaining(['ac-pearls', 'ea-hearts', 'br-promise']));
  });
  it('aller-retour de sauvegarde : br-promise reste possédé et dans look.acc', () => {
    W.grantGift('br-promise');
    W.equip('br-promise');
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w())));
    expect(back.wardrobe.owned).toContain('br-promise');
    expect(back.wardrobe.look.acc).toContain('br-promise');
    save.data.world = back;
    W.ensureWardrobe();
    expect(W.getLook().acc).toContain('br-promise');
    expect(W.owns('br-promise')).toBe(true);
  });
  it('un look favori enregistré avec le bracelet le garde', () => {
    W.grantGift('br-promise'); W.equip('br-promise');
    W.saveLook(0, 'Soirée');
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w())));
    expect(back.wardrobe.looks[0]?.look.acc).toContain('br-promise');
  });
  it('sans le cadeau, un look sauvegardé qui le contient est nettoyé (pas de possession fantôme)', () => {
    const raw = JSON.parse(JSON.stringify(w()));
    raw.wardrobe.look.acc = ['br-promise'];
    save.data.world = sanitizeWorld(raw);
    W.ensureWardrobe();
    expect(W.getLook().acc).not.toContain('br-promise');
  });
});
