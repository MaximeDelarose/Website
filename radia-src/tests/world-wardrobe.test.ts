import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave, sanitizeWorld } from '../src/save/schema';
import { CLOTH_IDS, CLOTH_SLOTS, DEFAULT_LOOK, HAIR_IDS, type ClothId, type Look } from '../src/data/world/ids';
import { CLOTHES, HAIRS } from '../src/data/world/wardrobe';
import * as W from '../src/game/world/wardrobe';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);
const w = () => save.data.world;
const rich = () => { w().res.coins = 99999; w().res.fabric = 999; save.data.economy.diamonds = 999; };
const own = (...ids: ClothId[]) => { for (const i of ids) if (!w().wardrobe.owned.includes(i)) w().wardrobe.owned.push(i); };

beforeEach(() => { save.data = defaultSave(); });

describe('catalogue', () => {
  it('chaque identifiant a une fiche, un emplacement cohérent et un prix', () => {
    expect(CLOTH_IDS.length).toBe(40);
    for (const id of CLOTH_IDS) {
      expect(CLOTHES[id].slot).toBe(CLOTH_SLOTS[id]);
      expect(CLOTHES[id].coins).toBeGreaterThanOrEqual(0);
      expect(CLOTHES[id].styles.length).toBeGreaterThan(0);
    }
    for (const h of HAIR_IDS) expect(HAIRS[h]).toBeTruthy();
  });
  it('les tenues classiques s\'achètent en pièces sans diamants', () => {
    for (const id of CLOTH_IDS) if (!CLOTHES[id].diamonds) expect(W.priceOf(id).diamonds).toBe(0);
    expect(W.canBuy('dr-flowy-floral', 'diamonds').reason).toBe('no-diamond-price');
  });
});

describe('achat', () => {
  it('pièces de départ possédées, le reste non', () => {
    expect(W.owns('top-hoodie-black')).toBe(true);
    expect(W.owns('dr-royal-gown')).toBe(false);
  });
  it('débite pièces et tissus, rien de négatif', () => {
    w().res.coins = 400; w().res.fabric = 5;
    const r = W.buy('dr-flowy-floral'); // 260 pièces + 4 tissus
    expect(r.ok).toBe(true);
    expect(w().res.coins).toBe(140);
    expect(w().res.fabric).toBe(1);
    expect(W.owns('dr-flowy-floral')).toBe(true);
    expect(W.buy('dr-flowy-floral').reason).toBe('owned');
    expect(w().res.coins).toBe(140);
  });
  it('refuse si pièces ou tissus manquent, sans rien débiter', () => {
    w().res.coins = 100; w().res.fabric = 0;
    expect(W.buy('top-cardigan-lavender').reason).toBe('coins');
    w().res.coins = 500;
    expect(W.buy('top-cardigan-lavender').reason).toBe('fabric');
    expect(w().res.coins).toBe(500);
    expect(W.owns('top-cardigan-lavender')).toBe(false);
  });
  it('achat en diamants : débite les diamants seulement', () => {
    w().res.coins = 0; w().res.fabric = 0; save.data.economy.diamonds = 50;
    expect(W.buy('dr-royal-gown', 'diamonds').ok).toBe(true);
    expect(save.data.economy.diamonds).toBe(10);
    expect(w().res.coins).toBe(0);
    save.data.economy.diamonds = 5;
    expect(W.buy('cr-gold', 'diamonds').reason).toBe('diamonds');
    expect(save.data.economy.diamonds).toBe(5);
  });
  it('identifiant inconnu', () => {
    expect(W.buy('nope' as ClothId).ok).toBe(false);
    expect(W.equip('nope' as ClothId).ok).toBe(false);
  });
  it('statistiques émises', () => {
    rich(); W.buy('top-tee-pink'); W.equip('top-tee-pink');
    expect(save.data.stats['world.wardrobe.bought']).toBe(1);
    expect(save.data.stats['world.wardrobe.equipped']).toBe(1);
  });
});

describe('équipement', () => {
  it('refuse une pièce non possédée', () => {
    expect(W.equip('dr-royal-gown').reason).toBe('not-owned');
  });
  it('un seul élément par emplacement', () => {
    own('top-tee-pink', 'top-tee-white');
    W.equip('top-tee-pink'); W.equip('top-tee-white');
    expect(W.getLook().top).toBe('top-tee-white');
  });
  it('robe exclut haut + bas, et inversement', () => {
    own('dr-flowy-floral', 'top-tee-pink', 'bot-skirt-pleated');
    W.equip('dr-flowy-floral');
    expect(W.getLook()).toMatchObject({ dress: 'dr-flowy-floral', top: null, bottom: null });
    W.equip('top-tee-pink');
    expect(W.getLook()).toMatchObject({ dress: null, top: 'top-tee-pink' });
    W.equip('dr-flowy-floral');
    W.equip('bot-skirt-pleated');
    expect(W.getLook()).toMatchObject({ dress: null, bottom: 'bot-skirt-pleated', top: null });
  });
  it('accessoires : 3 maximum, sans doublon', () => {
    own('ac-pearls', 'ac-hoops', 'ac-scarf', 'ac-sunglasses');
    for (const a of ['ac-pearls', 'ac-hoops', 'ac-scarf', 'ac-pearls', 'ac-sunglasses'] as ClothId[]) W.equip(a);
    const acc = W.getLook().acc;
    expect(acc.length).toBe(3);
    expect(new Set(acc).size).toBe(3);
    expect(acc).toContain('ac-sunglasses');
  });
  it('couronne unique', () => {
    own('cr-gold', 'cr-flowers');
    W.equip('cr-gold'); W.equip('cr-flowers');
    expect(W.getLook().crown).toBe('cr-flowers');
    W.unequip('cr-flowers');
    expect(W.getLook().crown).toBeNull();
  });
  it('unequip retire un accessoire précis', () => {
    own('ac-pearls', 'ac-hoops');
    W.equip('ac-pearls'); W.equip('ac-hoops'); W.unequip('ac-pearls');
    expect(W.getLook().acc).toEqual(['ac-hoops']);
  });
});

describe('coiffures', () => {
  it('lâchés par défaut ; changer vers une coiffure offerte', () => {
    expect(W.getLook().hair).toBe('hair-loose');
    expect(W.setHair('hair-wavy').ok).toBe(true);
    expect(W.getLook().hair).toBe('hair-wavy');
  });
  it('achète une coiffure non possédée', () => {
    w().res.coins = 150;
    const r = W.setHair('hair-bun');
    expect(r).toMatchObject({ ok: true, bought: true });
    expect(w().res.coins).toBe(50);
    expect(W.ownsHair('hair-bun')).toBe(true);
    expect(save.data.stats['world.wardrobe.hairChanged']).toBe(1);
  });
  it('refuse faute de pièces', () => {
    w().res.coins = 10;
    expect(W.setHair('hair-half').reason).toBe('coins');
    expect(W.getLook().hair).toBe('hair-loose');
    expect(w().res.coins).toBe(10);
  });
});

describe('coiffure conservée', () => {
  it('équiper ou retirer une pièce ne réinitialise pas la coiffure achetée', () => {
    w().res.coins = 500; own('ac-hoops', 'cr-gold');
    W.setHair('hair-bun');
    W.equip('ac-hoops'); W.equip('cr-gold'); W.unequip('ac-hoops');
    expect(W.getLook().hair).toBe('hair-bun');
    W.saveLook(0, 'A'); W.setHair('hair-wavy');
    W.equipFavorite(0);
    expect(W.getLook().hair).toBe('hair-bun');
  });
});

describe('essayage', () => {
  it('ne modifie ni la sauvegarde ni les possessions', () => {
    const before = JSON.stringify(w().wardrobe);
    const p = W.previewLook(W.getLook(), 'dr-royal-gown');
    expect(p.dress).toBe('dr-royal-gown');
    expect(p.top).toBeNull();
    expect(W.previewLook(W.getLook(), 'hair-bun').hair).toBe('hair-bun');
    expect(JSON.stringify(w().wardrobe)).toBe(before);
    expect(W.owns('dr-royal-gown')).toBe(false);
  });
});

describe('looks favoris', () => {
  it('sauvegarde, change, rééquipe, renomme', () => {
    own('dr-flowy-floral', 'cr-flowers');
    W.equip('dr-flowy-floral'); W.equip('cr-flowers');
    expect(W.saveLook(1, 'Pique-nique ♡').ok).toBe(true);
    W.unequip('dr-flowy-floral'); W.unequip('cr-flowers');
    expect(W.getLook().dress).toBeNull();
    expect(W.equipFavorite(1).ok).toBe(true);
    expect(W.getLook()).toMatchObject({ dress: 'dr-flowy-floral', crown: 'cr-flowers' });
    expect(W.renameFavorite(1, '  Soirée   chic  ').ok).toBe(true);
    expect(w().wardrobe.looks[1]?.name).toBe('Soirée chic');
    expect(save.data.stats['world.wardrobe.looksSaved']).toBe(1);
  });
  it('nom : 1 à 24 caractères, nettoyé', () => {
    W.saveLook(0, 'x');
    expect(W.renameFavorite(0, '   ').ok).toBe(false);
    expect(W.renameFavorite(0, '<b>' + 'a'.repeat(40)).ok).toBe(true);
    const n = w().wardrobe.looks[0]!.name;
    expect(n.length).toBeLessThanOrEqual(24);
    expect(n).not.toMatch(/[<>]/);
  });
  it('emplacements invalides ou vides', () => {
    expect(W.saveLook(3).ok).toBe(false);
    expect(W.saveLook(-1).ok).toBe(false);
    expect(W.equipFavorite(2).ok).toBe(false);
    expect(W.renameFavorite(2, 'a').ok).toBe(false);
  });
  it('le favori est une copie (pas d\'alias avec le look porté)', () => {
    own('ac-hoops');
    W.saveLook(0, 'A');
    W.equip('ac-hoops');
    expect(w().wardrobe.looks[0]!.look.acc).toEqual([]);
  });
});

describe('style et élégance', () => {
  it('style dominant', () => {
    expect(W.styleOf(DEFAULT_LOOK)).toBe('casual');
    expect(W.styleOf({ ...DEFAULT_LOOK, top: null, bottom: null, dress: 'dr-royal-gown', crown: 'cr-gold', acc: [] })).toBe('royal');
    expect(W.styleOf({ ...DEFAULT_LOOK, top: null, bottom: null, dress: 'dr-flowy-floral', shoes: 'sh-flats-red', acc: [] })).toBe('romantic');
  });
  it('élégance', () => {
    expect(W.isElegant(DEFAULT_LOOK)).toBe(false);
    expect(W.isElegant({ ...DEFAULT_LOOK, dress: 'dr-redcarpet', top: null, bottom: null, acc: [] })).toBe(true);
    expect(W.isElegant({ ...DEFAULT_LOOK, jacket: 'jk-blazer-cream', acc: [] })).toBe(true);
  });
});

describe('invariants', () => {
  it('repairLook : jamais d\'état invalide, quoi qu\'on lui donne', () => {
    const junk: unknown[] = [
      null, undefined, {}, { hair: 'x', top: 'bot-jeans', dress: 'dr-royal-gown', acc: ['ac-hoops', 'ac-hoops', 'cr-gold', 'ac-pearls', 'ac-scarf', 'ac-sunglasses', 3] },
      { crown: 'top-tee-white', shoes: 'nope', acc: 'x' },
    ];
    for (const j of junk) {
      const l = W.repairLook(j as Partial<Look>);
      expect(W.isValidLook(l)).toBe(true);
      expect(l.acc.length).toBeLessThanOrEqual(3);
      if (l.dress) { expect(l.top).toBeNull(); expect(l.bottom).toBeNull(); }
    }
  });
  it('sauvegarde abîmée : le look reste valide après sanitizeWorld + ensureWardrobe', () => {
    const raw = JSON.parse(JSON.stringify(w()));
    raw.wardrobe.look = { hair: 'hair-bun', top: 'dr-royal-gown', bottom: 'zzz', dress: 'dr-royal-gown', jacket: 7, shoes: 'sh-heels', bag: null, acc: ['ac-pearls', 'ac-pearls', 'ac-hoops', 'ac-scarf', 'ac-sunglasses'], crown: 'cr-gold' };
    raw.wardrobe.owned = ['dr-royal-gown', 'ac-pearls', 'bogus'];
    raw.wardrobe.looks = [{ name: 'x'.repeat(80), look: { dress: 'dr-royal-gown', top: 'top-tee-white' } }, 5, null];
    save.data.world = sanitizeWorld(raw);
    const l = W.getLook();
    expect(W.isValidLook(l, new Set(w().wardrobe.owned))).toBe(true);
    expect(l.hair).toBe('hair-loose'); // chignon non possédé
    expect(l.shoes).toBeNull(); // escarpins non possédés
    expect(l.dress).toBe('dr-royal-gown');
    expect(l.acc).toEqual(['ac-pearls']);
    expect(w().wardrobe.owned).not.toContain('bogus');
    for (const f of w().wardrobe.looks) if (f) { expect(f.name.length).toBeLessThanOrEqual(24); expect(W.isValidLook(f.look)).toBe(true); }
  });
  it('aller-retour JSON : le look sauvegardé revient identique', () => {
    rich();
    for (const id of ['dr-royal-gown', 'cr-tiara', 'ac-pearls', 'sh-heels'] as ClothId[]) { W.buy(id); W.equip(id); }
    W.setHair('hair-bun');
    W.saveLook(2, 'Gala');
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w())));
    expect(back.wardrobe.look).toEqual(w().wardrobe.look);
    expect(back.wardrobe.looks[2]).toEqual(w().wardrobe.looks[2]);
    expect(back.wardrobe.owned).toEqual(expect.arrayContaining(['dr-royal-gown', 'cr-tiara']));
    expect(back.wardrobe.hairOwned).toContain('hair-bun');
  });
  it('aucun solde négatif après une rafale d\'achats', () => {
    w().res.coins = 700; w().res.fabric = 10; save.data.economy.diamonds = 30;
    for (const id of CLOTH_IDS) { W.buy(id); W.buy(id, 'diamonds'); }
    for (const h of HAIR_IDS) W.setHair(h);
    expect(w().res.coins).toBeGreaterThanOrEqual(0);
    expect(w().res.fabric).toBeGreaterThanOrEqual(0);
    expect(save.data.economy.diamonds).toBeGreaterThanOrEqual(0);
    expect(W.isValidLook(W.getLook(), new Set([...w().wardrobe.owned, ...w().wardrobe.hairOwned]))).toBe(true);
  });
  it('équiper toutes les pièces dans un ordre quelconque garde un look valide', () => {
    rich();
    for (const id of CLOTH_IDS) W.buy(id);
    const ids = [...CLOTH_IDS].sort(() => Math.random() - 0.5);
    for (const id of ids) { W.equip(id); expect(W.isValidLook(W.getLook())).toBe(true); }
  });
});
