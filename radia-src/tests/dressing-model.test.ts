import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave } from '../src/save/schema';
import { CLOTH_IDS, NECKLACE_ID, type ClothId, type Look } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import * as W from '../src/game/world/wardrobe';
import { TryOn, cardState, filterByStyle, lockReason, styleCounts, styleFilterUseful, STYLE_FILTER_SLOTS, STYLE_LABEL, type TryEnv } from '../src/ui/screens/world/dressing/model';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);
const w = () => save.data.world;
beforeEach(() => { save.data = defaultSave(); });

// même environnement que l'écran : possession / port / emplacement réels
const env = (): TryEnv => ({
  owned: (id) => W.owns(id as ClothId),
  worn: (id) => W.isEquipped(id as ClothId),
  keyOf: (id) => { const s = CLOTHES[id as ClothId].slot; return s === 'acc' ? `acc:${id}` : s === 'top' || s === 'bottom' || s === 'dress' ? `body:${s}` : s; },
  showcase: (id) => id === NECKLACE_ID && !W.owns(NECKLACE_ID),
  removable: (id) => { const s = CLOTHES[id as ClothId].slot; return s !== 'top' && s !== 'bottom' && s !== 'dress'; },
});
const apply = (l: Look, id: string): Look => W.previewLook(l, id as ClothId);

describe('états des cartes', () => {
  it('verrouillé > équipé > possédé > à acheter', () => {
    expect(cardState({ locked: 'Cadeau', owned: false, worn: false })).toBe('locked');
    expect(cardState({ locked: null, owned: true, worn: true })).toBe('equipped');
    expect(cardState({ locked: null, owned: true, worn: false })).toBe('owned');
    expect(cardState({ locked: null, owned: false, worn: false })).toBe('buy');
  });
  it('un cadeau reçu n\'est plus verrouillé', () => {
    expect(cardState({ locked: lockReason({ gift: true }, true, false), owned: true, worn: false })).toBe('owned');
  });
  it('raisons de verrou : cadeau, vitrine mystérieuse, ou rien', () => {
    expect(lockReason({ gift: true }, false, false)).toBe('Cadeau');
    expect(lockReason({ gift: true }, false, true)).toBe('Cadeau mystérieux');
    expect(lockReason({}, false, false)).toBeNull();
    expect(lockReason({ gift: true }, true, true)).toBeNull();
  });
  it('les états sur les vraies données : départ possédé, reste à acheter, collier verrouillé', () => {
    const own = (id: ClothId) => W.owns(id);
    expect(cardState({ locked: null, owned: own('top-hoodie-black'), worn: W.isEquipped('top-hoodie-black') })).toBe('equipped');
    expect(cardState({ locked: null, owned: own('dr-royal-gown'), worn: false })).toBe('buy');
    expect(cardState({ locked: lockReason(CLOTHES[NECKLACE_ID], own(NECKLACE_ID), true), owned: own(NECKLACE_ID), worn: false })).toBe('locked');
  });
});

describe('filtre de style facultatif', () => {
  const list = (slot: string) => (CLOTH_IDS as readonly ClothId[]).filter((id) => CLOTHES[id].slot === slot).map((id) => ({ id, styles: CLOTHES[id].styles }));
  it('utile pour les robes (plusieurs styles réels), pas pour la beauté ni les coiffures', () => {
    expect(styleFilterUseful('dress', list('dress'))).toBe(true);
    expect(styleFilterUseful('hair', [])).toBe(false);
    expect(styleFilterUseful('crown', list('crown'))).toBe(false); // pas un rayon filtrable
    for (const s of ['acc', 'crown']) expect(STYLE_FILTER_SLOTS).not.toContain(s);
  });
  it('pas utile pour une liste trop courte ou d\'un seul style', () => {
    expect(styleFilterUseful('top', [{ styles: ['casual'] }, { styles: ['casual'] }, { styles: ['casual'] }, { styles: ['casual'] }, { styles: ['casual'] }])).toBe(false);
    expect(styleFilterUseful('top', [{ styles: ['casual'] }, { styles: ['chic'] }])).toBe(false);
  });
  it('« casual » n\'apparaît que sous le nom « Décontracté » dans le filtre', () => {
    expect(STYLE_LABEL.casual).toBe('Décontracté');
    expect(Object.values(STYLE_LABEL).join(' ')).not.toMatch(/casual/i);
  });
  it('le classement est sensé : chaque pastille a des articles et le filtre est un sous-ensemble', () => {
    const dresses = list('dress');
    const counts = styleCounts(dresses);
    expect(counts.length).toBeGreaterThanOrEqual(3);
    for (const c of counts) {
      const f = filterByStyle(dresses, c.style);
      expect(f.length).toBe(c.n);
      expect(f.length).toBeLessThanOrEqual(dresses.length);
      expect(f.every((x) => x.styles.includes(c.style))).toBe(true);
    }
    expect(filterByStyle(dresses, 'all').length).toBe(dresses.length);
  });
});

describe('essayage multiple et Avant/Après', () => {
  it('toucher applique la pièce, une même pièce retouchée est retirée de l\'essayage', () => {
    const t = new TryOn(env());
    expect(t.select('dr-flowy-floral')).toBe('tried');
    expect(t.trials).toEqual(['dr-flowy-floral']);
    expect(t.focus).toBe('dr-flowy-floral');
    expect(t.select('dr-flowy-floral')).toBe('untried');
    expect(t.trials).toEqual([]);
    expect(t.focus).toBeNull();
  });
  it('deux pièces du même emplacement se remplacent, deux emplacements différents se cumulent', () => {
    const t = new TryOn(env());
    t.select('sh-heels'); t.select('sh-boots');
    expect(t.trials).toEqual(['sh-boots']);
    t.select('bg-mini-gold');
    expect(t.trials).toEqual(['sh-boots', 'bg-mini-gold']);
    expect(t.focus).toBe('bg-mini-gold');
  });
  it('le look montré = tenue équipée + essais ; la tenue enregistrée n\'est jamais modifiée', () => {
    const t = new TryOn(env());
    const before = JSON.stringify(W.getLook());
    t.select('dr-flowy-floral'); t.select('sh-boots');
    const shown = t.lookFor(W.getLook(), apply);
    expect(shown.dress).toBe('dr-flowy-floral');
    expect(shown.shoes).toBe('sh-boots');
    expect(shown.top).toBeNull();
    expect(JSON.stringify(W.getLook())).toBe(before); // rien d'enregistré
    t.clear();
    expect(t.lookFor(W.getLook(), apply)).toEqual(W.getLook());
  });
  it('Avant/Après : impossible sans essayage, puis bascule entre tenue équipée et essayage', () => {
    const t = new TryOn(env());
    expect(t.toggleBefore()).toBe(false);
    expect(t.before).toBe(false);
    t.select('dr-flowy-floral');
    expect(t.toggleBefore()).toBe(true);
    expect(t.lookFor(W.getLook(), apply)).toEqual(W.getLook());
    expect(t.toggleBefore()).toBe(true);
    expect(t.lookFor(W.getLook(), apply).dress).toBe('dr-flowy-floral');
  });
  it('un nouveau toucher quitte le mode « Avant » ; annuler aussi', () => {
    const t = new TryOn(env());
    t.select('dr-flowy-floral'); t.toggleBefore();
    t.select('sh-boots');
    expect(t.before).toBe(false);
    t.toggleBefore(); t.clear();
    expect(t.before).toBe(false);
    expect(t.active).toBe(false);
  });
  it('toucher la pièce déjà portée retire l\'essai concurrent de son emplacement', () => {
    const t = new TryOn(env());
    t.select('dr-flowy-floral');
    expect(t.select('top-hoodie-black')).toBe('focused-worn'); // sweat noir porté au départ : le haut est « body:top »
    expect(t.trials).toEqual(['dr-flowy-floral']); // la robe est un autre emplacement (body:dress) : elle reste
    t.select('top-tee-pink');
    expect(t.select('top-hoodie-black')).toBe('focused-worn');
    expect(t.trials).toEqual(['dr-flowy-floral']);
  });
});

describe('action proposée dans la barre', () => {
  it('rien, équiper (possédé), acheter (à acheter), retirer / équipé (porté)', () => {
    own('top-tee-pink', 'sh-heels');
    const t = new TryOn(env());
    expect(t.action()).toBe('none');
    t.select('top-tee-pink');
    expect(t.action()).toBe('equip');
    t.select('dr-royal-gown');
    expect(t.action()).toBe('buy');
    t.clear();
    t.select('top-hoodie-black'); // porté, haut : non retirable
    expect(t.action()).toBe('worn');
    W.equip('sh-heels');
    t.clear(); t.select('sh-heels');
    expect(t.action()).toBe('remove');
  });
  it('la vitrine du collier ne s\'essaie pas, ne se sélectionne pas, ne s\'achète pas', () => {
    const t = new TryOn(env());
    expect(t.select(NECKLACE_ID)).toBe('showcase');
    expect(t.trials).toEqual([]);
    expect(t.focus).toBeNull();
    expect(t.action()).toBe('none');
    t.focus = NECKLACE_ID; // même forcé, l'action est « verrouillé » : jamais « acheter »
    expect(t.action()).toBe('locked');
  });
});

function own(...ids: ClothId[]) { for (const i of ids) if (!w().wardrobe.owned.includes(i)) w().wardrobe.owned.push(i); }

describe('parcours complet sans perte de données', () => {
  it('essayer ne coûte rien et ne change pas la sauvegarde', () => {
    w().res.coins = 1000; w().res.fabric = 50;
    W.ensureWardrobe();
    const snap = JSON.stringify(save.data.world);
    const t = new TryOn(env());
    t.select('dr-flowy-floral'); t.select('sh-boots'); t.toggleBefore(); t.toggleBefore(); t.clear();
    expect(JSON.stringify(save.data.world)).toBe(snap);
  });
  it('acheter débite le prix exact, puis équiper : rien de perdu, la pièce est possédée', () => {
    w().res.coins = 1000; w().res.fabric = 50;
    const ownedBefore = [...w().wardrobe.owned];
    const t = new TryOn(env());
    t.select('dr-flowy-floral');
    expect(t.action()).toBe('buy');
    expect(W.buy('dr-flowy-floral', 'coins').ok).toBe(true);
    expect(w().res.coins).toBe(1000 - 260);
    expect(w().res.fabric).toBe(50 - 4);
    expect(W.equip('dr-flowy-floral').ok).toBe(true);
    t.committed('dr-flowy-floral');
    expect(t.trials).toEqual([]);
    expect(W.getLook().dress).toBe('dr-flowy-floral');
    for (const id of ownedBefore) expect(W.owns(id as ClothId)).toBe(true);
    expect(t.action()).toBe('worn');
  });
  it('acheter sans assez de pièces ne débite rien', () => {
    w().res.coins = 10; w().res.fabric = 0;
    expect(W.buy('dr-flowy-floral', 'coins').ok).toBe(false);
    expect(w().res.coins).toBe(10);
    expect(W.owns('dr-flowy-floral')).toBe(false);
  });
  it('équiper une autre pièce du même emplacement garde l\'ancienne dans le dressing', () => {
    own('top-tee-pink');
    W.equip('top-tee-pink');
    W.equip('top-hoodie-black');
    expect(W.owns('top-tee-pink')).toBe(true);
    expect(W.owns('top-hoodie-black')).toBe(true);
  });
  it('un look sauvegardé n\'est pas affecté par l\'essayage', () => {
    W.saveLook(0, 'Mon look');
    const t = new TryOn(env());
    t.select('dr-flowy-floral');
    expect(W.favorites()[0]?.look).toEqual(W.getLook());
    expect(W.favorites().filter(Boolean).length).toBe(1);
  });
  it('collier verrouillé : aucun achat possible, même très riche (pièces et diamants)', () => {
    w().res.coins = 5_000_000; w().res.fabric = 999_999; save.data.economy.diamonds = 5_000_000;
    expect(W.canBuy(NECKLACE_ID, 'coins').ok).toBe(false);
    expect(W.canBuy(NECKLACE_ID, 'diamonds').ok).toBe(false);
    expect(W.buy(NECKLACE_ID, 'coins').ok).toBe(false);
    expect(W.owns(NECKLACE_ID)).toBe(false);
    expect(w().res.coins).toBe(5_000_000);
    const t = new TryOn(env());
    expect(t.select(NECKLACE_ID)).toBe('showcase');
    expect(t.lookFor(W.getLook(), apply).acc).not.toContain(NECKLACE_ID);
  });
});
