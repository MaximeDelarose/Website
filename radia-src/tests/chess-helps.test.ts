import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { canUndo, capturableSquares, hintFor, threatenedSquares, undoPair, scoreMoves } from '../src/game/chess/helps';
import { detenteUci, mulberry32 } from '../src/game/chess/detente';

const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');
const legal = (c: Chess) => c.moves({ verbose: true }).map(uci);

describe('pièces menacées et captures', () => {
  it('une pièce attaquée et non défendue est signalée, pas une pièce protégée par une égale', () => {
    // cavalier blanc c3 attaqué par le fou noir g7 (diagonale ouverte), non défendu
    const c = new Chess('4k3/6b1/8/8/8/2N5/8/4K3 w - - 0 1');
    expect(threatenedSquares(c, 'w')).toEqual(['c3']);
    // le même cavalier, défendu par le roi (d2) : plus de menace (échange à égalité)
    const d = new Chess('4k3/6b1/8/8/8/2N5/3K4/8 w - - 0 1');
    expect(threatenedSquares(d, 'w')).toEqual([]);
    // une pièce attaquée par un pion est menacée même défendue
    const p = new Chess('4k3/8/8/3p4/4N3/8/3K4/8 w - - 0 1');
    expect(threatenedSquares(p, 'w')).toContain('e4');
  });
  it('captures possibles = pièces adverses prenables ce tour-ci', () => {
    const c = new Chess('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    expect(capturableSquares(c, 'w')).toEqual(['d5']);
    expect(capturableSquares(c, 'b')).toEqual([]); // pas son tour
  });
});

describe('indices', () => {
  const cases: [string, string, string][] = [
    ['mat en un', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'mate'],
    ['sortir d\'échec', '4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1', 'check-escape'],
    ['capturer', 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', 'capture'],
    ['promotion', '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'promotion'],
  ];
  for (const [name, fen, theme] of cases) {
    it(`${name} : indice valide, niveaux progressifs, texte français`, () => {
      const c = new Chess(fen);
      const h1 = hintFor(c, 1)!;
      expect(h1.theme).toBe(theme);
      expect(legal(c)).toContain(uci(h1.move));
      expect(h1.from).toBeUndefined();
      const h2 = hintFor(c, 2, Math.random, h1.move)!;
      const h3 = hintFor(c, 3, Math.random, h1.move)!;
      expect(h2.from).toBe(h1.move.from); expect(h2.to).toBeUndefined();
      expect(h3.from).toBe(h1.move.from); expect(h3.to).toBe(h1.move.to);
      expect(h1.text.length).toBeGreaterThan(10);
      expect(c.fen()).toBe(fen); // position inchangée
    });
  }
  it('textes attendus', () => {
    expect(hintFor(new Chess('4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1'), 1)!.text).toMatch(/Ton roi est menacé/);
    expect(hintFor(new Chess('rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1'), 1)!.text).toMatch(/Tu peux capturer/);
  });
  it('l\'indice est toujours un coup légal (80 positions)', () => {
    const rng = mulberry32(11);
    const c = new Chess();
    let n = 0;
    while (n < 80) {
      if (c.isGameOver() || c.history().length > 120) { c.reset(); continue; }
      const h = hintFor(c, 3, rng)!;
      expect(legal(c)).toContain(uci(h.move));
      n++;
      const ms = c.moves();
      c.move(ms[Math.floor(rng() * ms.length)]);
    }
  }, 300_000);
  it('le meilleur coup ne laisse pas la dame en prise gratuite quand une prise gagne', () => {
    const c = new Chess('rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1');
    const best = scoreMoves(c, 2).sort((a, b) => b.score - a.score)[0].move;
    expect(best.captured).toBe('q');
  });
});

describe('annulation (son coup + la réponse d\'Auguste, plusieurs fois)', () => {
  function play(player: 'w' | 'b', plies: number, seed: number) {
    const rng = mulberry32(seed);
    const c = new Chess();
    while (c.history().length < plies) {
      const m = c.turn() === player ? c.moves({ verbose: true })[0] : null;
      if (m) c.move(m); else c.move(detenteUci(c, rng)!);
    }
    return c;
  }
  it('blancs : annule par paires jusqu\'au début, la partie sauvegardée se recharge', () => {
    const c = play('w', 8, 3); // son tour
    expect(c.turn()).toBe('w');
    let n = 0;
    while (undoPair(c, 'w')) {
      n++;
      const back = new Chess(); back.loadPgn(c.pgn());
      expect(back.fen()).toBe(c.fen());
      expect(back.history().length).toBe(c.history().length);
    }
    expect(n).toBe(4);
    expect(c.history().length).toBe(0);
    expect(canUndo(c, 'w')).toBe(false);
  });
  it('noirs : le premier coup d\'Auguste reste', () => {
    const c = play('b', 7, 4); // Auguste a joué 4 coups, elle 3 → son tour
    expect(c.turn()).toBe('b');
    while (undoPair(c, 'b'));
    expect(c.history().length).toBe(1);
  });
  it('impossible quand ce n\'est pas son tour', () => {
    const c = play('w', 3, 5);
    expect(c.turn()).toBe('b');
    expect(undoPair(c, 'w')).toBe(false);
    expect(c.history().length).toBe(3);
  });
});
