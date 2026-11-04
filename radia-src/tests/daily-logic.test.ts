import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultFun, sanitizeFun, type DailyState } from '../src/save/fun';
import { claim, isEligible, peek, resetDaily, setDay, todayKey } from '../src/daily/logic';
import { DAYS, THEMES, dayDef, describe as desc, resolveDay, type Part, themeOf, type Ownership } from '../src/daily/calendar';
import { applyResolved, ownershipOf } from '../src/daily/grant';
import { defaultWorld } from '../src/save/schema';
import { CLOTH_SLOTS, type ClothId } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import { FURNITURE, isFurnitureId } from '../src/data/world/furniture';
import { FLOWERS } from '../src/data/world/garden';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);

const picks = (p: Part): ClothId[] => (p.t === 'cloth' ? p.pick : []);
let d: DailyState;
beforeEach(() => { d = defaultFun().daily; });
const NONE: Ownership = { cloth: () => false, furn: () => 0 };

describe('clé de jour locale', () => {
  it('format AAAA-MM-JJ et décalage', () => {
    const t = new Date(2026, 10, 3, 23, 59);
    expect(todayKey(t)).toBe('2026-11-03');
    expect(todayKey(t, 1)).toBe('2026-11-04');
    expect(todayKey(new Date(2026, 11, 31, 8), 1)).toBe('2027-01-01');
  });
});

describe('réclamation', () => {
  it('éligible seulement si le jour diffère de lastKey', () => {
    expect(isEligible(d, '2026-11-03')).toBe(true);
    expect(isEligible(d, 'n’importe quoi')).toBe(false);
    claim(d, '2026-11-03');
    expect(isEligible(d, '2026-11-03')).toBe(false);
    expect(isEligible(d, '2026-11-04')).toBe(true);
  });
  it('pas de double réclamation (double clic, rechargement)', () => {
    const a = claim(d, '2026-11-03');
    const snapshot = JSON.stringify(d);
    expect(a).toMatchObject({ cycle: 0, day: 0 });
    expect(claim(d, '2026-11-03')).toBeNull();
    expect(claim(d, '2026-11-03')).toBeNull();
    expect(JSON.stringify(d)).toBe(snapshot);
    // après « rechargement » (aller-retour de sauvegarde) : toujours refusé
    const reloaded = sanitizeFun(JSON.parse(JSON.stringify({ ...defaultFun(), daily: d }))).daily;
    expect(claim(reloaded, '2026-11-03')).toBeNull();
  });
  it('lastKey est marqué avant toute attribution (état déjà avancé au retour)', () => {
    const t = claim(d, '2026-11-03')!;
    expect(d.lastKey).toBe('2026-11-03');
    expect(t.total).toBe(1);
    expect(d.day).toBe(1);
  });
  it('manquer des jours ne réinitialise rien : on reprend au jour suivant', () => {
    claim(d, '2026-11-03'); claim(d, '2026-11-04'); claim(d, '2026-11-05');
    expect(peek(d)).toEqual({ cycle: 0, day: 3 });
    const t = claim(d, '2027-02-20')!; // trois mois plus tard
    expect(t.day).toBe(3);
    expect(d.claimed).toEqual([0, 1, 2, 3]);
    expect(peek(d)).toEqual({ cycle: 0, day: 4 });
  });
  it('jour 7 : le cycle suivant commence, avec un autre thème', () => {
    let k = 0;
    const next = () => `2026-12-${String(++k).padStart(2, '0')}`;
    for (let i = 0; i < 6; i++) claim(d, next());
    const t7 = claim(d, next())!;
    expect(t7).toMatchObject({ cycle: 0, day: 6, cycleDone: true });
    expect(peek(d)).toEqual({ cycle: 1, day: 0 });
    expect(d.claimed).toEqual([]);
    expect(themeOf(1).id).not.toBe(themeOf(0).id);
    expect(d.total).toBe(7);
  });
  it('setDay / resetDaily (outils de test)', () => {
    setDay(d, 5);
    expect(peek(d).day).toBe(4);
    expect(d.claimed).toEqual([0, 1, 2, 3]);
    setDay(d, 99);
    expect(peek(d).day).toBe(6);
    resetDaily(d);
    expect(d).toEqual(defaultFun().daily);
  });
  it('sauvegarde : aller-retour fidèle et valeurs invalides corrigées', () => {
    claim(d, '2026-11-03'); claim(d, '2026-11-04');
    const back = sanitizeFun(JSON.parse(JSON.stringify({ ...defaultFun(), daily: d }))).daily;
    expect(back).toEqual(d);
    const bad = sanitizeFun({ daily: { cycle: -3, day: 99, lastKey: 'hier', claimed: [1, 1, 'x', 12], total: 'beaucoup' } }).daily;
    expect(bad).toEqual({ cycle: 0, day: 6, lastKey: '', claimed: [1], total: 0 });
  });
});

describe('calendrier', () => {
  it('cycle 1 : J1..J7 exacts', () => {
    expect(THEMES[0].name).toBe('Princesse du château');
    const t = (n: number) => dayDef(0, n).parts;
    expect(t(0)).toEqual([{ t: 'coins', n: 250 }]);
    expect(t(1)).toEqual([{ t: 'diamonds', n: 100 }]);
    expect(t(2)).toHaveLength(1);
    expect(t(2)[0]).toMatchObject({ t: 'cloth' });
    expect(CLOTHES[picks(t(2)[0])[0]].slot).toBe('bag');
    expect(t(3)[0]).toMatchObject({ t: 'bouquet' });
    expect(t(4)[0]).toMatchObject({ t: 'cloth' });
    expect(t(5)[0]).toMatchObject({ t: 'furn' });
    expect(t(6)).toHaveLength(2);
    const dress = picks(t(6)[0])[0];
    expect(CLOTHES[dress].slot).toBe('dress');
    expect(CLOTHES[dress].name).toMatch(/soirée/);
    expect(['crown', 'acc', 'ears']).toContain(CLOTHES[picks(t(6)[1])[0]].slot);
    expect(dayDef(0, 6).rarity).toBe('legendary');
  });
  it('6 thèmes de 7 jours, noms attendus', () => {
    expect(THEMES.map((x) => x.name)).toEqual(['Princesse du château', 'Mode parisienne', 'Jardin de rêve', 'Soirée romantique', 'Chocolaterie royale', 'Tenues de célébrité']);
    for (const th of THEMES) expect(th.days).toHaveLength(DAYS);
  });
  it('tous les ids existent dans les registres du monde', () => {
    for (const th of THEMES) for (const day of th.days) for (const p of day.parts) {
      if (p.t === 'cloth') for (const id of p.pick) { expect(CLOTH_SLOTS[id], id).toBeTruthy(); expect(CLOTHES[id].gift, id).toBeFalsy(); expect(CLOTHES[id].free, id).toBeFalsy(); }
      if (p.t === 'furn') for (const id of p.pick) { expect(isFurnitureId(id), id).toBe(true); expect(FURNITURE[id]).toBeTruthy(); }
      if (p.t === 'bouquet') { expect(p.flowers.length).toBeGreaterThanOrEqual(3); expect(p.flowers.length).toBeLessThanOrEqual(5); for (const f of p.flowers) expect(FLOWERS[f], f).toBeTruthy(); }
      if (p.t === 'coins' || p.t === 'diamonds' || p.t === 'res') expect(p.n).toBeGreaterThan(0);
    }
  });
  it('cycles suivants : montants plus généreux après un tour complet, thèmes qui bouclent', () => {
    expect(themeOf(6).id).toBe(themeOf(0).id);
    expect(dayDef(6, 0).parts[0]).toEqual({ t: 'coins', n: 290 }); // 250 × 1,15 arrondi à 10
    expect(dayDef(102, 1).parts[0]).toEqual({ t: 'diamonds', n: 200 });
    expect((dayDef(102, 0).parts[0] as { n: number }).n).toBe(500);
  });
});

describe('résolution et attribution', () => {
  it('offre le premier candidat non possédé, sinon des pièces', () => {
    const w = defaultWorld();
    const own = ownershipOf(w);
    const first = resolveDay(0, 2, own)[0];
    expect(first.t).toBe('cloth');
    if (first.t === 'cloth') w.wardrobe.owned.push(first.id);
    const second = resolveDay(0, 2, ownershipOf(w))[0];
    expect(second.t).toBe('cloth');
    expect(second).not.toEqual(first);
    for (const id of ['bg-mini-gold', 'bg-silver', 'bg-shoulder-black', 'bg-tote-beige'] as const) if (!w.wardrobe.owned.includes(id)) w.wardrobe.owned.push(id);
    const dup = resolveDay(0, 2, ownershipOf(w))[0];
    expect(dup.t).toBe('dup');
    expect((dup as { n: number }).n).toBeGreaterThan(0);
    expect(desc(dup).sub).toMatch(/déjà/);
  });
  it('chaque lot arrive dans le bon inventaire (cycle 1 complet)', () => {
    const w = defaultWorld();
    let dia = 0;
    for (let day = 0; day < DAYS; day++) {
      const parts = resolveDay(0, day, ownershipOf(w));
      dia += applyResolved(w, parts).diamonds;
    }
    expect(w.res.coins).toBe(60 + 250);
    expect(dia).toBe(100);
    expect(w.wardrobe.owned.length).toBeGreaterThanOrEqual(4 + 3 + 1); // sac + tenue + robe + accessoire (+ départ)
    expect(Object.values(w.castle.owned).reduce((a, b) => a + b, 0)).toBe(1);
    expect(Object.values(w.garden.bouquets).reduce((a, b) => a + b, 0)).toBe(1);
    expect(w.wardrobe.owned).toContain('dr-emerald-evening');
    expect(w.castle.owned['chandelier']).toBe(1);
  });
  it('un thème à ressources verse fleurs / tissu / cacao', () => {
    const w = defaultWorld();
    applyResolved(w, resolveDay(2, 0, NONE)); // Jardin de rêve J1 : 30 fleurs
    applyResolved(w, resolveDay(1, 0, NONE)); // Mode parisienne J1 : 8 tissus
    applyResolved(w, resolveDay(4, 0, NONE)); // Chocolaterie J1 : 20 cacao
    expect([w.res.flowers, w.res.fabric, w.res.cocoa]).toEqual([30, 8, 20]);
  });
  it('libellés lisibles pour chaque lot de chaque thème', () => {
    for (let c = 0; c < THEMES.length; c++) for (let day = 0; day < DAYS; day++) for (const r of resolveDay(c, day, NONE)) expect(desc(r).title.length).toBeGreaterThan(2);
  });
});
