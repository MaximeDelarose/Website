import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/game/world/careerGames/rng';
import {
  STARTER_IDS, MAIN_IDS, DESSERT_IDS, STEPS, STEP_IDS, DISH_NAMES, MENU_STYLES, augusteMenuFor, evaluateGuess, proposalsFor,
  isChocolateDessert, defaultMenu, isMenu, revealScript, LINE_ALL, LINE_NOT_ALL, LINE_RULE, LINE_CHOCO, LINE_INTRO, TRANSITIONS,
  type MenuChoice,
} from '../src/events/restaurant/logic';

const randomMenu = (rng: () => number): MenuChoice => defaultMenu(rng);

describe('données du menu', () => {
  it('4 entrées, 6 plats, 5 desserts, tous nommés', () => {
    expect(STARTER_IDS.length).toBe(4);
    expect(MAIN_IDS.length).toBe(6);
    expect(DESSERT_IDS.length).toBe(5);
    for (const s of STEPS) for (const id of STEP_IDS[s]) expect(DISH_NAMES[id].length).toBeGreaterThan(3);
    expect(DISH_NAMES.fondant).toBe('Fondant au chocolat');
    expect(DISH_NAMES.brulee).toBe('Crème brûlée');
    expect(MENU_STYLES).toEqual(['restaurant', 'palace', 'rooftop', 'hotel']);
  });
});

describe('menu d\'Auguste', () => {
  it('copie exacte du menu de Radia sur 200 menus, jamais aléatoire', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const m = randomMenu(rng);
      const a = augusteMenuFor(m);
      expect(a).toEqual(m);
      expect(a).not.toBe(m); // une copie
      // appel répété : même résultat, indépendant du hasard
      expect(augusteMenuFor(m)).toEqual(a);
    }
    for (const s of STARTER_IDS) for (const d of MAIN_IDS) expect(augusteMenuFor({ starter: s, main: d, dessert: 'glace' })).toEqual({ starter: s, main: d, dessert: 'glace' });
  });
  it('les prédictions n\'ont aucune influence sur le menu d\'Auguste', () => {
    const m: MenuChoice = { starter: 'soupe', main: 'pizza', dessert: 'tiramisu' };
    const before = augusteMenuFor(m);
    evaluateGuess(m, { starter: 'burrata', main: 'burger', dessert: 'glace' });
    expect(augusteMenuFor(m)).toEqual(before);
  });
});

describe('évaluation des devinettes', () => {
  const m: MenuChoice = { starter: 'burrata', main: 'truffe', dessert: 'cheesecake' };
  it('0 bonne réponse', () => {
    const e = evaluateGuess(m, { starter: 'soupe', main: 'pizza', dessert: 'glace' });
    expect(e).toEqual({ hits: 0, perStep: { starter: false, main: false, dessert: false }, perfect: false });
  });
  it('1 bonne réponse (chaque position)', () => {
    expect(evaluateGuess(m, { starter: 'burrata', main: 'pizza', dessert: 'glace' }).perStep).toEqual({ starter: true, main: false, dessert: false });
    expect(evaluateGuess(m, { starter: 'soupe', main: 'truffe', dessert: 'glace' }).hits).toBe(1);
    expect(evaluateGuess(m, { starter: 'soupe', main: 'pizza', dessert: 'cheesecake' }).perStep.dessert).toBe(true);
  });
  it('2 bonnes réponses', () => {
    const e = evaluateGuess(m, { starter: 'burrata', main: 'truffe', dessert: 'glace' });
    expect(e.hits).toBe(2); expect(e.perfect).toBe(false);
  });
  it('3 bonnes réponses = parfait', () => {
    const e = evaluateGuess(m, { ...m });
    expect(e).toEqual({ hits: 3, perStep: { starter: true, main: true, dessert: true }, perfect: true });
  });
  it('exhaustif : hits = nombre de correspondances', () => {
    for (const s of STARTER_IDS) for (const p of MAIN_IDS) for (const d of DESSERT_IDS) {
      const e = evaluateGuess(m, { starter: s, main: p, dessert: d });
      expect(e.hits).toBe((s === m.starter ? 1 : 0) + (p === m.main ? 1 : 0) + (d === m.dessert ? 1 : 0));
      expect(e.perfect).toBe(e.hits === 3);
    }
  });
});

describe('propositions', () => {
  it('même ensemble, ordres différents selon la graine', () => {
    for (const step of STEPS) {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 40; seed++) {
        const list = proposalsFor(step, mulberry32(seed));
        expect([...list].sort()).toEqual([...STEP_IDS[step]].sort());
        seen.add(list.join(','));
      }
      expect(seen.size).toBeGreaterThan(3);
    }
  });
  it('ne modifie pas la liste d\'origine', () => {
    const copy = [...MAIN_IDS];
    proposalsFor('main', mulberry32(3));
    expect([...MAIN_IDS]).toEqual(copy);
  });
});

describe('dessert chocolat et dialogues', () => {
  it('seul le fondant est au chocolat', () => {
    expect(DESSERT_IDS.filter(isChocolateDessert)).toEqual(['fondant']);
  });
  const base: MenuChoice = { starter: 'soupe', main: 'saumon', dessert: 'tiramisu' };
  it('phrases exactes présentes selon le résultat', () => {
    for (let r = 0; r < 6; r++) {
      const all = revealScript(evaluateGuess(base, base), base, r, mulberry32(r + 1));
      expect(all.lines).toContain(LINE_RULE);
      expect(all.lines.join(' ')).toMatch(/connaître aussi bien/);
      expect(all.lines).not.toContain(LINE_CHOCO);
      const miss = revealScript(evaluateGuess(base, { ...base, main: 'pizza' }), base, r, mulberry32(r + 9));
      expect(miss.lines.join(' ')).toMatch(/choisir autre chose que toi/);
      expect(miss.lines[miss.lines.length - 1]).toBe(LINE_RULE);
    }
    // les phrases exactes existent (au moins pour certaines graines)
    const exact = new Set<string>();
    for (let r = 0; r < 12; r++) {
      exact.add(revealScript(evaluateGuess(base, base), base, r, mulberry32(r)).lines[0]);
      exact.add(revealScript(evaluateGuess(base, { ...base, main: 'pizza' }), base, r, mulberry32(r)).lines[0]);
    }
    expect(exact.has(LINE_ALL)).toBe(true);
    expect(exact.has(LINE_NOT_ALL)).toBe(true);
    expect(LINE_INTRO).toBe('Bon, maintenant essaie de deviner ce que je vais prendre, moi.');
  });
  it('ligne chocolat ajoutée avec le fondant', () => {
    const m: MenuChoice = { ...base, dessert: 'fondant' };
    const s = revealScript(evaluateGuess(m, m), m, 0, mulberry32(1));
    expect(s.lines[s.lines.length - 1]).toBe(LINE_CHOCO);
    expect(s.lines).toContain(LINE_RULE);
  });
  it('variantes de transition multiples', () => {
    expect(TRANSITIONS.length).toBeGreaterThanOrEqual(3);
    const seen = new Set<string>();
    for (let r = 0; r < 10; r++) seen.add(revealScript(evaluateGuess(base, base), base, r, mulberry32(5)).transition);
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe('aucune mutation des entrées', () => {
  it('evaluateGuess / augusteMenuFor / revealScript laissent les objets intacts', () => {
    const m = Object.freeze({ starter: 'salade', main: 'risotto', dessert: 'fondant' }) as MenuChoice;
    const p = Object.freeze({ starter: 'soupe', main: 'risotto', dessert: 'glace' }) as MenuChoice;
    const snapM = JSON.stringify(m); const snapP = JSON.stringify(p);
    const a = augusteMenuFor(m);
    evaluateGuess(m, p);
    revealScript(evaluateGuess(m, p), m, 2, mulberry32(1));
    expect(JSON.stringify(m)).toBe(snapM);
    expect(JSON.stringify(p)).toBe(snapP);
    a.main = 'pizza'; // modifier la copie ne touche pas l'original
    expect(m.main).toBe('risotto');
  });
  it('menu par défaut cohérent et isMenu', () => {
    for (let i = 0; i < 50; i++) expect(isMenu(defaultMenu(mulberry32(i)))).toBe(true);
    expect(isMenu({ starter: 'x', main: 'pizza', dessert: 'glace' })).toBe(false);
    expect(isMenu(undefined)).toBe(false);
  });
});
