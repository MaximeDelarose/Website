import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld } from '../src/save/schema';
import { adoptCat, buyCatItem, catBondLevel, equipCatItem, interact, nextTreatIn, refreshTreats, setCatName, validateCatName } from '../src/game/world/cat';
import { CAT_ACTIONS, CAT_ITEMS, CAT_KINDS, CAT_TREAT_MAX, CAT_TREAT_REGEN_MS } from '../src/data/world/family';
import { CAT_ITEM_IDS } from '../src/data/world/ids';

const T0 = 1_700_000_000_000;
const adopted = () => { const w = defaultWorld(); adoptCat(w, 'Miel', T0); return w; };

describe('nom du chat', () => {
  it('trim, 1 à 20 caractères, pas vide', () => {
    expect(validateCatName('  Miel  ')).toEqual({ ok: true, name: 'Miel' });
    expect(validateCatName('').ok).toBe(false);
    expect(validateCatName('    ').ok).toBe(false);
    expect(validateCatName('a'.repeat(20)).ok).toBe(true);
    expect(validateCatName('a'.repeat(21)).ok).toBe(false);
    expect(validateCatName('Petit   Nuage')).toEqual({ ok: true, name: 'Petit Nuage' });
  });
});

describe('adoption', () => {
  it('gratuite, nom enregistré, refuse un nom invalide', () => {
    const w = defaultWorld();
    const coins = w.res.coins;
    expect(adoptCat(w, '   ', T0).ok).toBe(false);
    expect(w.cat.adopted).toBe(false);
    expect(adoptCat(w, ' Caramel ', T0)).toEqual({ ok: true, name: 'Caramel' });
    expect(w.cat.adopted).toBe(true);
    expect(w.cat.name).toBe('Caramel');
    expect(w.res.coins).toBe(coins);
    expect(adoptCat(w, 'Autre', T0).ok).toBe(false); // une seule adoption
    expect(w.cat.name).toBe('Caramel');
  });
  it('renommage possible à tout moment, jamais avant l\'adoption', () => {
    const w = defaultWorld();
    expect(setCatName(w, 'X').ok).toBe(false);
    adoptCat(w, 'Miel', T0);
    expect(setCatName(w, 'Nougat').ok).toBe(true);
    expect(w.cat.name).toBe('Nougat');
    expect(setCatName(w, '').ok).toBe(false);
    expect(w.cat.name).toBe('Nougat');
    expect(setCatName(w, 'Praline').ok).toBe(true);
    expect(w.cat.counters.renamed).toBe(2);
  });
  it('survit à sanitizeWorld (rechargement)', () => {
    const w = adopted(); buyCatItem(w, 'cushion'); w.res.coins = 500; buyCatItem(w, 'collar-bell');
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(back.cat.adopted).toBe(true);
    expect(back.cat.name).toBe('Miel');
    expect(back.cat.equipped.collar).toBe('collar-bell');
  });
});

describe('interactions', () => {
  it('toutes les actions donnent de l\'affection et un pose', () => {
    for (const k of CAT_KINDS) {
      const w = adopted();
      const r = interact(w, k, T0 + 10_000, () => 0.5);
      expect(r.ok, k).toBe(true);
      expect(w.cat.bond).toBe(CAT_ACTIONS[k].bond);
      expect(r.pose).toBeTruthy();
    }
  });
  it('refusé si non adopté', () => {
    expect(interact(defaultWorld(), 'pet', T0).reason).toBe('notAdopted');
  });
  it('temps de recharge doux, puis de nouveau possible', () => {
    const w = adopted();
    expect(interact(w, 'pet', T0 + 5000).ok).toBe(true);
    const r = interact(w, 'pet', T0 + 5100);
    expect(r.ok).toBe(false); expect(r.reason).toBe('cooldown');
    expect(interact(w, 'pet', T0 + 5000 + CAT_ACTIONS.pet.cooldown).ok).toBe(true);
  });
  it('la friandise consomme une friandise et jamais plus que possible', () => {
    const w = adopted();
    w.cat.treats = 1;
    const hearts = interact(w, 'treat', T0 + 1000);
    expect(hearts.ok).toBe(true); expect(hearts.hearts).toBe(1);
    expect(w.cat.treats).toBe(0);
    const no = interact(w, 'treat', T0 + 60_000);
    expect(no.ok).toBe(false); expect(no.reason).toBe('noTreats');
    expect(w.cat.treats).toBe(0);
  });
  it('jouer et se promener rapportent des pièces', () => {
    const w = adopted(); const c0 = w.res.coins;
    const r = interact(w, 'play', T0 + 9000, () => 0.9);
    expect(r.coins).toBeGreaterThan(0);
    expect(w.res.coins).toBe(c0 + r.coins!);
  });
  it('les friandises reviennent lentement, plafonnées', () => {
    const w = adopted();
    w.cat.treats = 0; w.cat.lastSeen = T0;
    expect(refreshTreats(w, T0 + CAT_TREAT_REGEN_MS * 2 + 5)).toBe(2);
    expect(w.cat.treats).toBe(2);
    refreshTreats(w, T0 + CAT_TREAT_REGEN_MS * 100);
    expect(w.cat.treats).toBe(CAT_TREAT_MAX);
    expect(nextTreatIn(w, T0 + CAT_TREAT_REGEN_MS * 100)).toBe(0);
  });
  it('invariant : l\'absence ne retire jamais rien', () => {
    const w = adopted();
    for (let i = 0; i < 6; i++) interact(w, CAT_KINDS[i], T0 + 20_000 + i);
    const snap = JSON.stringify({ b: w.cat.bond, i: w.cat.items, e: w.cat.equipped, n: w.cat.name });
    refreshTreats(w, T0 + 365 * 86_400_000);
    interact(w, 'pet', T0 + 365 * 86_400_000 + 1);
    expect(w.cat.bond).toBeGreaterThanOrEqual(JSON.parse(snap).b);
    expect(w.cat.name).toBe('Miel');
    expect(w.cat.items).toEqual(JSON.parse(snap).i);
  });
  it('niveaux d\'affection croissants', () => {
    expect(catBondLevel(0).level).toBe(0);
    expect(catBondLevel(15).level).toBe(2);
    expect(catBondLevel(10_000).next).toBeNull();
  });
});

describe('accessoires', () => {
  it('achat débite vraiment, équipe, jamais de solde négatif', () => {
    const w = adopted();
    w.res.coins = 100;
    expect(buyCatItem(w, 'basket')).toEqual({ ok: false, reason: 'coins' });
    expect(w.res.coins).toBe(100);
    expect(buyCatItem(w, 'cushion')).toEqual({ ok: true });
    expect(w.res.coins).toBe(100 - CAT_ITEMS.cushion.price);
    expect(w.cat.items).toContain('cushion');
    expect(w.cat.equipped.bed).toBe('cushion');
    expect(buyCatItem(w, 'cushion')).toEqual({ ok: false, reason: 'owned' });
    expect(buyCatItem(w, 'zzz').ok).toBe(false);
    expect(w.res.coins).toBeGreaterThanOrEqual(0);
  });
  it('équiper / retirer ; seulement les objets possédés', () => {
    const w = adopted(); w.res.coins = 1000;
    expect(equipCatItem(w, 'collar-bell')).toBe(false);
    for (const id of CAT_ITEM_IDS) expect(buyCatItem(w, id).ok).toBe(true);
    expect(w.cat.equipped.collar).toBe('collar-bell');
    expect(equipCatItem(w, 'collar-bell')).toBe(false);
    expect(w.cat.equipped.collar).toBeNull();
    equipCatItem(w, 'basket');
    expect(w.cat.equipped.bed).toBeNull(); // « basket » était équipé en dernier → retiré
    expect(w.res.coins).toBe(1000 - CAT_ITEM_IDS.reduce((a, id) => a + CAT_ITEMS[id].price, 0));
  });
  it('pas d\'achat avant adoption', () => {
    const w = defaultWorld(); w.res.coins = 999;
    expect(buyCatItem(w, 'cushion')).toEqual({ ok: false, reason: 'notAdopted' });
    expect(w.res.coins).toBe(999);
  });
});
