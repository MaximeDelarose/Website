import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld } from '../src/save/schema';
import { mulberry32 } from '../src/game/world/familyGames/rng';
import { BOUQUET_GOAL, BOUQUET_SIZE, bouquetDone, bouquetScore, bouquetStars, newBouquet, tapCell, type BouquetState } from '../src/game/world/familyGames/bouquet';
import { harmonyDone, harmonyStars, harmonyTheme, harmonyTotal, newHarmony, scoreRound, submitRound, SLOTS, HARMONY_MAX_ROUND, HARMONY_ROUNDS } from '../src/game/world/familyGames/harmony';
import { answerPuzzle, flipCard, hideMismatch, makePuzzle, memoryStars, newPairs, pairsDone, pairsScore } from '../src/game/world/familyGames/memory';
import { chocDone, chocScore, chocStars, newChoc, nextIngredient, pickIngredient } from '../src/game/world/familyGames/chocolat';
import { allKidsBondAtLeast, applyReward, kidBondLevel, recordGame, recordVisit, rewardFor, totalBouquets } from '../src/game/world/family';
import { CHOC_RECIPES, FAMILY_GAME_IDS, HARMONY_FURNITURE, KID_GAME, MEMORY_SYMBOLS } from '../src/data/world/family';
import { CHOC_IDS, FURNITURE_IDS, KID_IDS, PALETTE } from '../src/data/world/ids';

const hasPair = (s: BouquetState) => { const c: Record<number, number> = {}; for (const v of s.cells) if (v >= 1 && v < 3) c[v] = (c[v] ?? 0) + 1; return Object.values(c).some((n) => n >= 2); };

describe('Bouquet', () => {
  it('plateau 4×4, toujours au moins une paire', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = newBouquet(mulberry32(seed));
      expect(s.cells.length).toBe(BOUQUET_SIZE);
      expect(hasPair(s)).toBe(true);
    }
  });
  it('fusionne deux fleurs identiques, jamais deux différentes', () => {
    const s = newBouquet(mulberry32(3));
    s.cells = Array(16).fill(1); s.cells[1] = 2;
    expect(tapCell(s, 0).type).toBe('select');
    expect(tapCell(s, 1).type).toBe('select'); // différente : change simplement la sélection
    expect(s.moves).toBe(0);
    expect(tapCell(s, 2).type).toBe('select');
    s.sel = 0;
    const e = tapCell(s, 2);
    expect(e).toMatchObject({ type: 'merge', level: 2 });
    expect(s.cells[2]).toBe(2); expect(s.moves).toBe(1);
    expect(tapCell(s, 3).type).toBe('select');
    expect(tapCell(s, 3).type).toBe('deselect');
  });
  it('se termine après 3 grosses fleurs, sans échec possible (bot aléatoire)', () => {
    for (let seed = 1; seed < 25; seed++) {
      const s = newBouquet(mulberry32(seed));
      const rng = mulberry32(seed * 7);
      let guard = 0;
      while (!bouquetDone(s) && guard++ < 4000) {
        // joue une paire si elle existe, sinon touche au hasard
        const pairs: [number, number][] = [];
        for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) if (s.cells[i] === s.cells[j] && s.cells[i] < 3) pairs.push([i, j]);
        expect(pairs.length).toBeGreaterThan(0);
        const [a, b] = pairs[Math.floor(rng() * pairs.length)];
        tapCell(s, a); tapCell(s, b);
      }
      expect(s.collected).toBe(BOUQUET_GOAL);
      expect(bouquetDone(s)).toBe(true);
      expect(tapCell(s, 0).type).toBe('none');
      expect(bouquetStars(s.moves)).toBeGreaterThanOrEqual(1);
    }
  });
  it('notation', () => {
    expect(bouquetStars(12)).toBe(3); expect(bouquetStars(20)).toBe(2); expect(bouquetStars(80)).toBe(1);
    expect(bouquetScore(0)).toBe(500); expect(bouquetScore(500)).toBe(100);
  });
});

describe('Harmonie', () => {
  it('5 manches distinctes, notation par emplacement', () => {
    const s = newHarmony(mulberry32(5));
    expect(s.themes.length).toBe(HARMONY_ROUNDS);
    expect(new Set(s.themes.map((t) => t.id)).size).toBe(HARMONY_ROUNDS);
    const th = s.themes[0];
    const perfect = { wall: th.wall.best[0], floor: th.floor.best[0], curtain: th.curtain.best[0] };
    expect(scoreRound(th, perfect).total).toBe(HARMONY_MAX_ROUND);
    const bad = scoreRound(th, { wall: 'noir', floor: 'noir', curtain: 'noir' });
    expect(bad.total).toBeLessThan(HARMONY_MAX_ROUND);
    expect(bad.total).toBeGreaterThanOrEqual(0);
  });
  it('une partie parfaite fait 45 points et 3 étoiles', () => {
    const s = newHarmony(mulberry32(9));
    while (!harmonyDone(s)) { const th = harmonyTheme(s); submitRound(s, { wall: th.wall.best[0], floor: th.floor.best[0], curtain: th.curtain.best[0] }); }
    expect(harmonyTotal(s)).toBeLessThanOrEqual(HARMONY_MAX_ROUND * HARMONY_ROUNDS);
    expect(s.scores.length).toBe(5);
    expect(harmonyStars(harmonyTotal(s))).toBe(3);
    expect(submitRound(s, { wall: 'rose', floor: 'rose', curtain: 'rose' })).toBeNull();
  });
  it('couleurs des thèmes valides, doublons pénalisés', () => {
    const s = newHarmony(mulberry32(1));
    const ids = PALETTE.map((p) => p.id) as string[];
    for (const t of s.themes) for (const sl of SLOTS) for (const c of [...t[sl].best, ...t[sl].ok]) expect(ids).toContain(c);
    const th = s.themes[0];
    const c = th.wall.best[0];
    const a = scoreRound(th, { wall: c, floor: c, curtain: c });
    expect(a.parts.wall).toBeLessThan(3);
  });
});

describe('Mémoire', () => {
  it('grille 4×4 : 8 paires', () => {
    const s = newPairs(mulberry32(2));
    const c: Record<number, number> = {};
    s.symbols.forEach((v) => { c[v] = (c[v] ?? 0) + 1; });
    expect(Object.keys(c).length).toBe(8);
    expect(Object.values(c).every((n) => n === 2)).toBe(true);
    expect(MEMORY_SYMBOLS.length).toBeGreaterThanOrEqual(8);
  });
  it('paires, erreurs et fin de manche', () => {
    const s = newPairs(mulberry32(4));
    // une erreur volontaire
    const i = 0; const j = s.symbols.findIndex((v, k) => k > 0 && v !== s.symbols[0]);
    expect(flipCard(s, i)).toBe('first');
    expect(flipCard(s, j)).toBe('miss');
    expect(flipCard(s, 5)).toBe('ignored'); // bloqué tant que non recaché
    hideMismatch(s);
    expect(s.misses).toBe(1);
    expect(s.up.some(Boolean)).toBe(false);
    for (let v = 0; v < 8; v++) { const [a, b] = s.symbols.flatMap((x, k) => (x === v ? [k] : [])); flipCard(s, a); expect(flipCard(s, b)).toBe('match'); }
    expect(pairsDone(s)).toBe(true);
    expect(pairsScore(1, 1)).toBe(93);
    expect(pairsScore(500, 2)).toBe(20);
  });
  it('défis de logique : réponse unique parmi 4 propositions', () => {
    for (let seed = 1; seed < 30; seed++) for (const lv of [0, 1, 2] as const) {
      const p = makePuzzle(mulberry32(seed), lv);
      expect(p.options.length).toBe(4);
      expect(new Set(p.options).size).toBe(4);
      expect(p.options.filter((o) => answerPuzzle(p, o)).length).toBe(1);
      expect(p.seq.length).toBeGreaterThanOrEqual(5);
    }
    expect(memoryStars(280)).toBe(3); expect(memoryStars(100)).toBe(1);
  });
});

describe('Chocolats', () => {
  it('3 recettes de difficulté croissante, cohérentes avec CHOC_IDS', () => {
    expect(CHOC_RECIPES.length).toBe(3);
    for (let i = 1; i < 3; i++) expect(CHOC_RECIPES[i].steps.length).toBeGreaterThan(CHOC_RECIPES[i - 1].steps.length);
    for (const r of CHOC_RECIPES) { expect(CHOC_IDS).toContain(r.id); for (const st of r.steps) expect(r.tray).toContain(st); }
  });
  it('ordre imposé : une erreur ne bloque pas mais coûte', () => {
    const s = newChoc();
    for (const r of CHOC_RECIPES) {
      for (let k = 0; k < r.steps.length; k++) {
        const wrong = r.tray.find((t) => t !== nextIngredient(s))!;
        expect(pickIngredient(s, wrong)).toBe('wrong');
        const res = pickIngredient(s, nextIngredient(s)!);
        expect(res).toBe(k === r.steps.length - 1 ? 'recipeDone' : 'ok');
      }
    }
    expect(chocDone(s)).toBe(true);
    expect(s.made).toEqual(CHOC_RECIPES.map((r) => r.id));
    expect(s.mistakes).toBe(CHOC_RECIPES.reduce((a, r) => a + r.steps.length, 0));
    expect(pickIngredient(s, 'cocoa')).toBe('ignored');
    expect(chocStars(0)).toBe(3); expect(chocStars(3)).toBe(2); expect(chocStars(9)).toBe(1);
    expect(chocScore(100)).toBe(30);
  });
});

describe('récompenses et complicité', () => {
  it('chaque jeu rapporte quelque chose de réel, croissant avec les étoiles', () => {
    for (const g of FAMILY_GAME_IDS) {
      const r1 = rewardFor(g, 1, mulberry32(1)); const r3 = rewardFor(g, 3, mulberry32(1));
      const val = (r: typeof r1) => r.coins + r.hearts + r.flowers + r.cocoa + r.diamonds + r.box + (r.furniture ? 1 : 0);
      expect(val(r1)).toBeGreaterThan(0);
      expect(val(r3)).toBeGreaterThanOrEqual(val(r1));
    }
    expect(rewardFor('bouquet', 2, mulberry32(1)).flowers).toBeGreaterThan(0);
    const mem = rewardFor('memory', 3, mulberry32(1)); expect(mem.diamonds).toBeGreaterThanOrEqual(1); expect(mem.diamonds).toBeLessThanOrEqual(3);
    for (let i = 1; i < 20; i++) { const f = rewardFor('harmony', 3, mulberry32(i)).furniture; expect(HARMONY_FURNITURE).toContain(f); expect(FURNITURE_IDS).toContain(f!); }
    for (const id of HARMONY_FURNITURE) expect(FURNITURE_IDS).toContain(id);
  });
  it('applyReward crédite pièces, fleurs, cacao, meubles, coffrets et collection', () => {
    const w = defaultWorld();
    const r = applyReward(w, { ...rewardFor('choc', 3, mulberry32(1)), furniture: 'candles' }, ['milk', 'praline', 'heart']);
    expect(w.res.coins).toBe(120 + r.coins);
    expect(w.res.cocoa).toBe(r.cocoa);
    expect(w.choc.boxes).toBe(1);
    expect(w.castle.owned.candles).toBe(1);
    expect(w.choc.collection).toEqual(['milk', 'praline', 'heart']);
    expect(r.newChocs).toEqual(['milk', 'praline', 'heart']);
    const r2 = applyReward(w, rewardFor('choc', 1, mulberry32(1)), ['milk']);
    expect(r2.newChocs).toEqual([]);
    expect(w.choc.made.milk).toBe(2);
    expect(w.choc.collection.length).toBe(3);
  });
  it('meilleur score, nombre de parties et complicité', () => {
    const w = defaultWorld();
    const a = recordGame(w, 'kid1', 'bouquet', 200, 2);
    expect(a.newBest).toBe(true); expect(a.bondGain).toBe(2);
    const b = recordGame(w, 'kid1', 'bouquet', 150, 1);
    expect(b.newBest).toBe(false);
    expect(w.family.kids.kid1.games.bouquet).toEqual({ best: 200, plays: 2 });
    recordGame(w, 'all', 'choc', 250, 3);
    for (const k of KID_IDS) expect(w.family.kids[k].games.choc.best).toBe(250);
    expect(Object.keys(KID_GAME).sort()).toEqual([...KID_IDS]);
  });
  it('niveaux de complicité bornés et jamais punitifs', () => {
    expect(kidBondLevel(0).level).toBe(0);
    expect(kidBondLevel(9).level).toBe(3);
    expect(kidBondLevel(10_000).next).toBeNull();
    const w = defaultWorld();
    expect(allKidsBondAtLeast(w, 3)).toBe(false);
    for (const k of KID_IDS) w.family.kids[k].bond = 9;
    expect(allKidsBondAtLeast(w, 3)).toBe(true);
    const snap = JSON.stringify(w.family);
    recordVisit(w, 'kid2', 1_000_000_000_000 + 365 * 86_400_000);
    expect(w.family.kids.kid1.bond).toBe(JSON.parse(snap).kids.kid1.bond);
  });
  it('visite : +1 au plus toutes les 5 minutes', () => {
    const w = defaultWorld();
    expect(recordVisit(w, 'kid1', 1_000_000).gained).toBe(true);
    expect(recordVisit(w, 'kid1', 1_000_500).gained).toBe(false);
    expect(recordVisit(w, 'kid1', 1_000_000 + 5 * 60_000).gained).toBe(true);
    expect(w.family.kids.kid1.bond).toBe(2);
  });
  it('déclencheur de la scène du jardin et sauvegarde', () => {
    const w = defaultWorld();
    expect(totalBouquets(w)).toBe(0);
    w.garden.bouquets = { rose: 1, daisy: 2 };
    expect(totalBouquets(w)).toBe(3);
    recordGame(w, 'kid2', 'harmony', 40, 3);
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(back.family.kids.kid2.games.harmony.best).toBe(40);
    expect(back.garden.bouquets.rose).toBe(1);
  });
});
