import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave, sanitizeWorld } from '../src/save/schema';
import { CLOTH_SLOTS, NECKLACE_ID, accGroup } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import * as W from '../src/game/world/wardrobe';
import { EVENTS } from '../src/events/data';
import { luxuryPool, sanitizeOptions } from '../src/events/games/creative/shopLogic';
import { loanersFor } from '../src/events/games/action/themes';
import { clothCandidates } from '../src/game/endless/loot';
import { THEMES } from '../src/daily/calendar';
import { LOTS, FASHION_POOL, DECO_POOL } from '../src/wheel/table';
import { MISSIONS } from '../src/casino/missions';
import { PLACES } from '../src/domain/places';
import { missingClothes } from '../src/events/incidents/rewards';
import { grantReward } from '../src/events/rewards';
import { finishScene, grantNecklace } from '../src/events/necklace/grant';
import { NECKLACE_NAME, SHOWCASE_BUTTON, SHOWCASE_NOTE, SHOWCASE_PRICE } from '../src/events/necklace/data';
import { defaultNecklace } from '../src/events/necklace/state';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);
const w = () => save.data.world;
beforeEach(() => { save.data = defaultSave(); });

const ID = 'ac-eclat';

describe('fiche de L\'Éclat Éternel ♡', () => {
  it('id, emplacement, famille « bijoux de cou », cadeau, aucun prix', () => {
    expect(NECKLACE_ID).toBe(ID);
    expect(CLOTH_SLOTS[ID]).toBe('acc');
    expect(accGroup(ID)).toBe('neck');
    const d = CLOTHES[ID];
    expect(d.gift).toBe(true);
    expect(d.name).toBe('L’Éclat Éternel ♡');
    expect(d.name).toBe(NECKLACE_NAME);
    expect(d.coins).toBe(0);
    expect(d.diamonds).toBeUndefined();
    expect(d.fabric).toBeUndefined();
    expect(d.starter).toBeUndefined();
    expect(d.free).toBeUndefined();
  });
  it('textes de la vitrine exacts, sans prix numérique', () => {
    expect(SHOWCASE_PRICE).toBe('Prix : Inestimable ♡');
    expect(SHOWCASE_NOTE).toBe('Ce bijou ne s’achète pas. Il s’offre avec le cœur.');
    expect(SHOWCASE_BUTTON).toBe('Cadeau mystérieux — Verrouillé');
    expect(/\d/.test(`${SHOWCASE_PRICE}${SHOWCASE_NOTE}${SHOWCASE_BUTTON}`)).toBe(false);
  });
});

describe('jamais obtenable autrement : aucun pool de butin / prix / récompense ne le contient', () => {
  const has = (x: unknown): boolean => JSON.stringify(x).includes(ID);
  it('événements : récompenses de tous les événements (hors la scène elle-même, qui n\'en verse aucune)', () => {
    for (const e of EVENTS) {
      expect(has(e.reward), `${e.id}.reward`).toBe(false);
      expect(has(e.replayReward ?? {}), `${e.id}.replayReward`).toBe(false);
    }
  });
  it('shopping de luxe, prêts de tenues, coffres et butin : candidats calculés', () => {
    expect(luxuryPool()).not.toContain(ID);
    for (let i = 0; i < 50; i++) expect(sanitizeOptions([], () => (i * 0.137) % 1)).not.toContain(ID);
    expect(loanersFor('romantic', new Set(), 6)).not.toContain(ID);
    expect(loanersFor('royal', new Set(), 6)).not.toContain(ID);
    for (const kind of ['cloth', 'bag', 'accessory'] as const) expect(clothCandidates(kind)).not.toContain(ID);
  });
  it('calendrier de cadeaux, roue du jour, missions du casino, lieux à rénover', () => {
    expect(has(THEMES)).toBe(false);
    expect(has(LOTS)).toBe(false);
    expect(FASHION_POOL).not.toContain(ID as never);
    expect(DECO_POOL).not.toContain(ID as never);
    expect(has(MISSIONS)).toBe(false);
    expect(has(PLACES)).toBe(false);
  });
  it('colis surprise des incidents : jamais proposé', () => {
    expect(missingClothes(w())).not.toContain(ID);
  });
  it('la fusion / l\'Endless / la boutique de diamants / les ids de tout le jeu : le fichier source ne le nomme nulle part (liste blanche)', () => {
    // tous les fichiers source (ts / css) lus en texte brut : seuls ceux de la liste blanche peuvent nommer le collier
    const files = import.meta.glob('../src/**/*.{ts,css}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(files).length).toBeGreaterThan(200);
    const allow = [
      'events/necklace/', 'data/world/ids.ts', 'data/world/wardrobe.ts', 'game/art/world/avatarNecklace.ts', 'game/art/world/avatar.ts',
      'game/world/wardrobe.ts', 'events/rewards.ts', 'ui/screens/world/dressing.ts',
    ];
    const hits: string[] = [];
    for (const [path, src] of Object.entries(files)) {
      if (!src.includes(ID) && !/\bNECKLACE_ID\b/.test(src)) continue;
      const rel = path.replace('../src/', '');
      if (!allow.some((a) => rel === a || rel.startsWith(a))) hits.push(rel);
    }
    expect(hits, `fichiers qui nomment le collier : ${hits.join(', ')}`).toEqual([]);
  });
  it('le versement d\'une récompense d\'événement filtre le collier, même s\'il était demandé', () => {
    const def = { ...EVENTS[0], reward: { cloth: [ID as never, 'ac-pearls' as never] } };
    const out = grantReward(def, 'run-x', 0, [ID as never]);
    expect(out.cloth).not.toContain(ID);
    expect(W.owns(ID)).toBe(false);
  });
});

describe('achat impossible, même avec des millions', () => {
  it('canBuy / buy refusent en pièces comme en diamants, sans rien débiter', () => {
    w().res.coins = 5_000_000; w().res.fabric = 999_999; save.data.economy.diamonds = 5_000_000;
    expect(W.canBuy(ID, 'coins')).toEqual({ ok: false, reason: 'gift' });
    expect(W.canBuy(ID, 'diamonds')).toEqual({ ok: false, reason: 'gift' });
    expect(W.buy(ID, 'coins').ok).toBe(false);
    expect(W.buy(ID, 'diamonds').ok).toBe(false);
    expect(w().res.coins).toBe(5_000_000);
    expect(save.data.economy.diamonds).toBe(5_000_000);
    expect(W.owns(ID)).toBe(false);
  });
  it('grantGift (la porte des autres cadeaux) refuse le collier', () => {
    expect(W.grantGift(ID as never).ok).toBe(false);
    expect(W.owns(ID)).toBe(false);
  });
  it('impossible de l\'équiper sans l\'avoir reçu ; un identifiant injecté dans la sauvegarde est retiré', () => {
    expect(W.equip(ID)).toEqual({ ok: false, reason: 'not-owned' });
    w().wardrobe.owned.push(ID);
    W.ensureWardrobe();
    expect(W.owns(ID)).toBe(false);
    w().wardrobe.look.acc.push(ID);
    W.ensureWardrobe();
    expect(W.getLook().acc).not.toContain(ID);
  });
});

describe('attribution : uniquement par la fin de la scène, une seule fois', () => {
  it('refusée sans « scène terminée »', () => {
    expect(grantNecklace()).toBe(false);
    expect(W.owns(ID)).toBe(false);
    expect(save.data.fun.necklace.owned).toBe(false);
  });
  it('acceptée après la scène : possédé, équipable / retirable librement, une seule fois', () => {
    finishScene();
    expect(grantNecklace()).toBe(true);
    expect(W.owns(ID)).toBe(true);
    expect(w().wardrobe.owned.filter((x) => x === ID)).toHaveLength(1);
    expect(grantNecklace()).toBe(false); // anti-doublon
    expect(w().wardrobe.owned.filter((x) => x === ID)).toHaveLength(1);
    expect(save.data.fun.necklace.memory).toBe(true);
    // choix libre, modifiable ensuite
    expect(W.equip(ID).ok).toBe(true);
    expect(W.getLook().acc).toContain(ID);
    expect(W.unequip(ID).ok).toBe(true);
    expect(W.getLook().acc).not.toContain(ID);
    expect(W.owns(ID)).toBe(true);
    expect(W.equip(ID).ok).toBe(true);
    // acheter reste refusé une fois possédé (« owned »), jamais un doublon
    expect(W.canBuy(ID).ok).toBe(false);
  });
  it('un seul bijou de cou à la fois : il remplace une chaîne déjà portée', () => {
    finishScene(); grantNecklace();
    w().wardrobe.owned.push('ac-pearls');
    W.equip('ac-pearls'); W.equip(ID);
    expect(W.getLook().acc).toContain(ID);
    expect(W.getLook().acc).not.toContain('ac-pearls');
    expect(W.getLook().acc.filter((a) => accGroup(a) === 'neck')).toHaveLength(1);
  });
  it('sauvegarde aller-retour : collier possédé et porté, état du collier, sans casser le reste', () => {
    finishScene(); grantNecklace(); W.equip(ID);
    const worldBack = sanitizeWorld(JSON.parse(JSON.stringify(w())));
    expect(worldBack.wardrobe.owned).toContain(ID);
    expect(worldBack.wardrobe.look.acc).toContain(ID);
    const nk = JSON.parse(JSON.stringify(save.data.fun.necklace));
    expect(nk.owned).toBe(true);
    expect(nk).toMatchObject({ sceneDone: true, memory: true, photo: true });
    expect(defaultNecklace().owned).toBe(false);
  });
});
