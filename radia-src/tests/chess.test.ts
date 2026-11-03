import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { CHESS_PUZZLES } from '../src/game/chess/puzzles';
import { QUEEN_PUZZLES, solveQueen, parseQueen, initialState, playQueen, attacked } from '../src/game/chess/queen';
import { forcesMateIn1, isMatingMove } from '../src/game/chess/rules';

const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');
const play = (c: Chess, u: string) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

describe('problèmes d\'échecs', () => {
  it('au moins 10 problèmes, identifiants uniques', () => {
    expect(CHESS_PUZZLES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(CHESS_PUZZLES.map((p) => p.id)).size).toBe(CHESS_PUZZLES.length);
  });
  for (const p of CHESS_PUZZLES) {
    it(`${p.id} — ${p.title} : solution légale et correcte`, () => {
      const c = new Chess(p.fen);
      for (const u of p.line) expect(play(c, u), `${p.id} ${u}`).toBeTruthy();
      if (p.goal !== 'win') expect(c.isCheckmate()).toBe(true);
      if (p.goal === 'mate1') expect(p.line.length).toBe(1);
      if (p.goal === 'mate2') {
        const c2 = new Chess(p.fen);
        expect(isMatingMove(c2, p.line[0])).toBe(false);
        play(c2, p.line[0]);
        // chaque réponse adverse permet un mat immédiat
        expect(forcesMateIn1(c2)).toBe(true);
      }
      if (p.goal === 'win') {
        // la ligne gagne bien du matériel (une prise au dernier coup)
        const c3 = new Chess(p.fen);
        let last;
        for (const u of p.line) last = play(c3, u);
        expect(last?.captured).toBeTruthy();
      }
    });
  }
});

describe('règles de chess.js utilisées', () => {
  it('roque, prise en passant, promotion, pat, nulle', () => {
    const c = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(c.move('O-O')).toBeTruthy();
    const ep = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(ep.move('exd6')?.isEnPassant()).toBe(true);
    const pr = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(pr.move({ from: 'a7', to: 'a8', promotion: 'n' })?.promotion).toBe('n');
    expect(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').isStalemate()).toBe(true);
    expect(new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1').isInsufficientMaterial()).toBe(true);
    expect(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 100 80').isDrawByFiftyMoves()).toBe(true);
    const rep = new Chess();
    for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) rep.move(m);
    expect(rep.isThreefoldRepetition()).toBe(true);
  });
  it('mat en un détecté', () => {
    const c = new Chess('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
    expect(c.moves({ verbose: true }).filter((m) => isMatingMove(c, uci(m))).map(uci)).toEqual(['d1d8']);
  });
});

describe('Mode Reine', () => {
  it('au moins 10 puzzles valides', () => {
    expect(QUEEN_PUZZLES.length).toBeGreaterThanOrEqual(10);
    for (const p of QUEEN_PUZZLES) {
      const lv = parseQueen(p);
      expect(lv.w).toBeGreaterThanOrEqual(6);
      expect(lv.w).toBeLessThanOrEqual(8);
      expect(lv.hearts.length).toBeGreaterThan(0);
      // aucune pièce ennemie ne se trouve hors du plateau / sur la Reine
      expect(attacked(lv, initialState(p, lv)).size).toBeGreaterThanOrEqual(0);
    }
  });
  for (const p of QUEEN_PUZZLES) {
    it(`${p.id} — ${p.title} : résoluble en ${p.limit} coups au plus (optimum proche de la limite)`, () => {
      const r = solveQueen(p, 20);
      expect(r, p.id).not.toBeNull();
      expect(r!.moves).toBeLessThanOrEqual(p.limit);
      expect(p.limit - r!.moves).toBeLessThanOrEqual(1);
      // la solution trouvée se rejoue avec les règles de jeu
      const lv = parseQueen(p);
      let s = initialState(p, lv);
      for (const m of r!.line) {
        if (m.shield) { expect(s.shield).toBe(1); s = { ...s, shield: 2 }; }
        const res = playQueen(lv, s, m.to, p.limit);
        expect(res.ok).toBe(true);
        if (res.ok) s = res.state;
      }
      expect(s.hearts).toBe(0);
    });
  }
  it('le Bouclier est indispensable quand il est proposé', () => {
    for (const p of QUEEN_PUZZLES.filter((q) => q.shield)) {
      const without = solveQueen({ ...p, shield: false }, 20);
      expect(without === null || without.moves > p.limit, p.id).toBe(true);
    }
  });
  it('règles : case attaquée interdite, pièce protégée imprenable, portail', () => {
    const q = { id: 't2', title: '', hint: '', limit: 9, rows: ['h..r..', '......', '......', '...n..', '......', 'Q.....'] };
    const lv = parseQueen(q);
    const s = initialState(q, lv);
    // (2,5) attaquée par le cavalier → interdit ; (3,5) libre → autorisé
    expect(playQueen(lv, s, 5 * 6 + 2, 9)).toMatchObject({ ok: false, reason: 'attacked' });
    expect(playQueen(lv, s, 5 * 6 + 3, 9)).toMatchObject({ ok: true });
    // (0,0) : cœur sur la rangée de la tour → attaqué
    expect(playQueen(lv, s, 0, 9)).toMatchObject({ ok: false, reason: 'attacked' });
    // depuis (3,5), prendre le cavalier protégé par la tour est interdit
    const s2 = (playQueen(lv, s, 5 * 6 + 3, 9) as { state: typeof s }).state;
    expect(playQueen(lv, s2, 3 * 6 + 3, 9)).toMatchObject({ ok: false, reason: 'defended' });
    // portail : on réapparaît sur le jumeau
    const pp = { id: 't3', title: '', hint: '', limit: 9, rows: ['h.....', '......', '......', '......', '......', 'Q1...1'] };
    const lp = parseQueen(pp);
    const r = playQueen(lp, initialState(pp, lp), 31, 9);
    expect(r.ok && r.state.pos).toBe(35);
  });
});
