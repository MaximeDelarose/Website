import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/game/world/careerGames/rng';
import * as R from '../src/events/games/action/rhythm';
import * as F from '../src/events/games/action/fireworks';
import * as S from '../src/events/games/action/spa';
import * as Q from '../src/events/games/action/quiz';
import * as M from '../src/events/games/action/memory';
import * as T from '../src/events/games/action/themes';
import { CLOTHES } from '../src/data/world/wardrobe';
import { CLOTH_IDS, DEFAULT_LOOK, STARTER_CLOTHES, type Look } from '../src/data/world/ids';

const look = (p: Partial<Look>): Look => ({ ...DEFAULT_LOOK, acc: [], ...p });

describe('rhythm', () => {
  for (const song of ['waltz', 'concert'] as const) {
    it(`motif ${song} : déterministe, trié, borné, espacé`, () => {
      const a = R.generatePattern(song, mulberry32(42));
      const b = R.generatePattern(song, mulberry32(42));
      const c = R.generatePattern(song, mulberry32(43));
      expect(a).toEqual(b);
      expect(a).not.toEqual(c);
      const s = R.SONGS[song];
      expect(a.length).toBeGreaterThan(25);
      for (let i = 0; i < a.length; i++) {
        expect(a[i].t).toBeGreaterThanOrEqual(s.leadIn);
        expect(a[i].t).toBeLessThanOrEqual(s.leadIn + s.duration);
        expect(a[i].lane).toBeGreaterThanOrEqual(0);
        expect(a[i].lane).toBeLessThan(s.lanes);
        if (i) expect(a[i].t - a[i - 1].t).toBeGreaterThanOrEqual(R.beatLen(s) / 2 - 1e-3);
      }
      let run = 1;
      for (let i = 1; i < a.length; i++) { run = a[i].lane === a[i - 1].lane ? run + 1 : 1; expect(run).toBeLessThanOrEqual(4); }
    });
  }
  it('jugement généreux', () => {
    expect(R.judge(0)).toBe('perfect');
    expect(R.judge(-0.1)).toBe('perfect');
    expect(R.judge(0.2)).toBe('good');
    expect(R.judge(-0.25)).toBe('good');
    expect(R.judge(0.4)).toBe('miss');
  });
  it('combo, multiplicateur, jauge, score', () => {
    const t = R.newTally();
    for (let i = 0; i < 10; i++) R.applyJudgment(t, 'perfect');
    expect(t.combo).toBe(10);
    R.applyJudgment(t, 'miss');
    expect(t.combo).toBe(0);
    expect(t.bestCombo).toBe(10);
    expect(R.gaugeAfter(0.12, 'miss')).toBe(0.12);
    expect(R.gaugeAfter(0.99, 'perfect')).toBe(1);
    expect(R.finalScore({ ...R.newTally(), perfects: 10 }, 10)).toBe(100);
    expect(R.finalScore({ ...R.newTally(), goods: 10 }, 10)).toBe(60);
    expect(R.finalScore(R.newTally(), 0)).toBe(0);
    expect(R.isOk(60)).toBe(true);
  });
});

describe('fireworks', () => {
  it('luminosité : pic après l’explosion, nulle avant/après', () => {
    expect(F.glow(-0.1)).toBe(0);
    expect(F.glow(0.5)).toBe(1);
    expect(F.glow(0.2)).toBeLessThan(1);
    expect(F.glow(1.2)).toBeLessThan(0.7);
    expect(F.glow(2)).toBe(0);
  });
  it('planning déterministe et cadencé', () => {
    const a = F.schedule(mulberry32(7));
    expect(a).toEqual(F.schedule(mulberry32(7)));
    expect(a.length).toBeGreaterThanOrEqual(12);
    expect(a.filter((f) => f.inFrame).length).toBeGreaterThan(a.length / 2);
  });
  it('note de prise : pic > trop tôt > rien', () => {
    const fw: F.Firework = { launch: 5, x: 0.5, y: 0.3, hue: 1, hue2: 3, size: 1, inFrame: true };
    const peak = F.shotScore([fw], F.burstAt(fw) + 0.5);
    const early = F.shotScore([fw], F.burstAt(fw) + 0.1);
    const none = F.shotScore([fw], 1);
    expect(peak.score).toBeGreaterThanOrEqual(90);
    expect(early.score).toBeLessThan(peak.score);
    expect(none.score).toBe(0);
    expect(peak.colors).toEqual([...F.COLOR_SETS[1]]);
    expect(F.shotScore([{ ...fw, inFrame: false }], F.burstAt(fw) + 0.5).score).toBeLessThan(40);
  });
  it('synthèse', () => {
    const r = F.summarize([{ score: 90, colors: ['a', 'b'], fw: 0 }, { score: 50, colors: ['c', 'd'], fw: 1 }]);
    expect(r.best).toEqual(['a', 'b']);
    expect(r.score).toBeGreaterThan(0);
    expect(F.summarize([]).score).toBe(0);
  });
});

describe('spa', () => {
  it('≥ 5 parfums distincts avec couleurs', () => {
    expect(S.OILS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(S.OILS.map((o) => o.id)).size).toBe(S.OILS.length);
    for (const o of S.OILS) expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('cycle de respiration cohérent', () => {
    expect(S.phaseAt(0).phase).toBe('inhale');
    expect(S.phaseAt(S.INHALE + 0.2).phase).toBe('hold');
    expect(S.phaseAt(S.INHALE + S.HOLD + 1).phase).toBe('exhale');
    expect(S.phaseAt(S.CYCLE - 0.1).phase).toBe('rest');
    expect(S.phaseAt(S.CYCLE + 0.5).phase).toBe('inhale');
    expect(S.circleSize(S.INHALE)).toBeCloseTo(1, 5);
    expect(S.circleSize(0)).toBeCloseTo(0, 5);
    expect(S.circleSize(S.INHALE + S.HOLD + S.EXHALE)).toBeCloseTo(0, 5);
  });
  it('synchro tolérante et score sans échec', () => {
    expect(S.inSync(1, true)).toBe(true);
    expect(S.inSync(1, false)).toBe(false);
    expect(S.inSync(S.INHALE + S.HOLD + 0.2, true)).toBe(true);
    expect(S.relaxScore(0)).toBeGreaterThanOrEqual(40);
    expect(S.relaxScore(1)).toBe(100);
  });
});

describe('quiz', () => {
  it('pool ≥ 14, questions bien formées', () => {
    expect(Q.QUESTIONS.length).toBeGreaterThanOrEqual(14);
    for (const q of Q.QUESTIONS) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.a).toBeLessThan(4);
    }
    expect(new Set(Q.QUESTIONS.map((q) => q.q)).size).toBe(Q.QUESTIONS.length);
  });
  it('tirage sans doublon, déterministe, bonne réponse suivie', () => {
    for (let seed = 1; seed < 40; seed++) {
      const d = Q.drawQuestions(mulberry32(seed), 5);
      expect(d.length).toBe(5);
      expect(new Set(d.map((q) => q.q)).size).toBe(5);
      for (const q of d) {
        const orig = Q.QUESTIONS.find((o) => o.q === q.q)!;
        expect(q.choices[q.a]).toBe(orig.choices[orig.a]);
      }
    }
    expect(Q.drawQuestions(mulberry32(5))).toEqual(Q.drawQuestions(mulberry32(5)));
  });
  it('films fictifs, snacks, score', () => {
    expect(Q.FILMS.length).toBe(4);
    expect(Q.SNACKS.length).toBeGreaterThanOrEqual(6);
    expect(Q.quizScore(5)).toBe(100);
    expect(Q.quizScore(0)).toBe(0);
  });
});

describe('memory', () => {
  it('paquet : paires exactes, déterministe', () => {
    for (const lvl of [1, 3]) {
      const g = M.gridFor(lvl);
      expect(g.rows * g.cols).toBe(g.pairs * 2);
      const d = M.buildDeck(mulberry32(3), g.pairs);
      expect(d.length).toBe(g.pairs * 2);
      const cnt = new Map<string, number>();
      d.forEach((s) => cnt.set(s, (cnt.get(s) ?? 0) + 1));
      expect([...cnt.values()].every((v) => v === 2)).toBe(true);
      expect(d).toEqual(M.buildDeck(mulberry32(3), g.pairs));
    }
    expect(M.gridFor(3)).toEqual({ rows: 5, cols: 4, pairs: 10 });
  });
  it('étoiles', () => {
    expect(M.pairStars(10, 8, 60)).toBe(3);
    expect(M.pairStars(18, 8, 200)).toBe(2);
    expect(M.pairStars(60, 8, 500)).toBe(1);
    expect(M.seqStars(0)).toBe(3);
    expect(M.seqStars(2)).toBe(2);
    expect(M.seqStars(9)).toBe(1);
    expect(M.finalStars(3, 3)).toBe(3);
    expect(M.finalStars(1, 1)).toBe(1);
    expect(M.starScore(1)).toBeGreaterThan(0);
  });
  it('séquence et saisie', () => {
    const s = M.sequence(mulberry32(9), 6);
    expect(s.length).toBe(6);
    expect(s.every((v) => v >= 0 && v < 4)).toBe(true);
    expect(M.checkInput([1, 2, 3], [1])).toBe('ok');
    expect(M.checkInput([1, 2, 3], [1, 2, 3])).toBe('done');
    expect(M.checkInput([1, 2, 3], [1, 3])).toBe('wrong');
  });
});

describe('themes', () => {
  it('une robe chic note mieux « chic » que « casual »', () => {
    const l = look({ dress: 'dr-little-black', top: null, bottom: null, shoes: 'sh-heels', bag: 'bg-mini-gold' });
    expect(T.scoreLook(l, 'chic')).toBeGreaterThan(T.scoreLook(l, 'casual'));
    expect(T.scoreLook(l, 'chic')).toBeGreaterThanOrEqual(60);
  });
  it('tenue vide = 0, scores bornés', () => {
    expect(T.scoreLook(look({ top: null, bottom: null, shoes: null, bag: null }), 'chic')).toBe(0);
    for (const id of CLOTH_IDS) {
      const s = T.scoreLook(look({ dress: CLOTHES[id].slot === 'dress' ? id : null, top: CLOTHES[id].slot === 'top' ? id : null }), 'romantic');
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
  it('les pièces dans le thème augmentent le score', () => {
    const base = look({ top: 'top-hoodie-black', bottom: 'bot-jeans', shoes: 'sh-sneakers-white', bag: 'bg-crossbody-black' });
    const better = look({ top: 'top-blouse-silk', bottom: 'bot-trousers-chic', shoes: 'sh-heels', bag: 'bg-mini-gold' });
    expect(T.scoreLook(better, 'chic')).toBeGreaterThan(T.scoreLook(base, 'chic'));
    expect(T.scoreLook(base, 'casual')).toBeGreaterThan(T.scoreLook(better, 'casual'));
  });
  it('prêts temporaires : thèmes servis, jamais des pièces déjà possédées', () => {
    const owned = new Set<string>(STARTER_CLOTHES);
    for (const th of ['chic', 'romantic', 'casual'] as const) {
      const l = T.loanersFor(th, owned);
      expect(l.length).toBeGreaterThan(0);
      for (const id of l) { expect(owned.has(id)).toBe(false); expect(CLOTHES[id].styles).toContain(th); }
    }
    const rich = new Set<string>(CLOTH_IDS);
    expect(T.loanersFor('chic', rich)).toEqual([]);
  });
});
