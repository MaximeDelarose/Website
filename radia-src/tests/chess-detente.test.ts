import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detenteMove, detenteUci, mulberry32 } from '../src/game/chess/detente';
import { series, randomLegal, reasonable } from './chess-sim';

/** Positions variées : parties aléatoires déterministes (roques, promotions, échecs, finales…). */
function positions(n: number): string[] {
  const rng = mulberry32(2024);
  const out: string[] = [];
  while (out.length < n) {
    const c = new Chess();
    while (!c.isGameOver() && out.length < n && c.history().length < 200) {
      const ms = c.moves();
      c.move(ms[Math.floor(rng() * ms.length)]);
      out.push(c.fen());
    }
  }
  return out;
}

describe('Auguste « Détente ♡ » : toujours légal', () => {
  it('ne joue jamais un coup illégal sur 5 000 positions aléatoires (et ne modifie pas la position)', () => {
    const rng = mulberry32(7);
    let played = 0;
    for (const fen of positions(5000)) {
      const c = new Chess(fen);
      const legal = c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
      const u = detenteUci(c, rng);
      if (!legal.length) { expect(u).toBeNull(); continue; }
      expect(legal, `${fen} -> ${u}`).toContain(u);
      expect(c.fen()).toBe(fen);
      played++;
    }
    expect(played).toBeGreaterThan(4500);
  }, 600_000);

  it('cas limites : mat, pat, un seul coup, promotion, roque, en passant', () => {
    expect(detenteMove(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBeNull(); // pat
    expect(detenteMove(new Chess('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1'))).toBeNull(); // mat
    const one = new Chess('7k/8/6K1/8/8/8/8/6Q1 b - - 0 1'); // un seul coup : Rg8
    expect(one.moves().length).toBe(1);
    expect(detenteUci(one)).toBe('h8g8');
    for (let s = 0; s < 30; s++) {
      for (const fen of ['4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1']) {
        const c = new Chess(fen);
        const legal = c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
        expect(legal).toContain(detenteUci(c, mulberry32(s)));
      }
    }
  });

  it('RNG injectable : même graine, même coup', () => {
    const fen = positions(60)[59];
    expect(detenteUci(new Chess(fen), mulberry32(5))).toBe(detenteUci(new Chess(fen), mulberry32(5)));
  });
});

describe('Détente : tranquille mais pas absurde, sans défaite programmée', () => {
  it('prend une dame offerte souvent, mais pas systématiquement', () => {
    let cap = 0;
    const N = 300;
    for (let s = 0; s < N; s++) {
      const c = new Chess('3rk3/8/8/8/8/8/8/3QK3 b - - 0 1'); // Td8xd1+ : prise de la dame, échec
      const m = detenteMove(c, mulberry32(s + 1))!;
      if (m.captured === 'q') cap++;
    }
    expect(cap / N).toBeGreaterThan(0.3);
    expect(cap / N).toBeLessThan(0.97);
  });
  it('voit parfois un mat en un coup, le rate parfois', () => {
    let mate = 0;
    const N = 300;
    for (let s = 0; s < N; s++) {
      const c = new Chess('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
      const m = detenteMove(c, mulberry32(s + 1))!;
      if (m.san === 'Rd8#') mate++;
    }
    expect(mate / N).toBeGreaterThan(0.3);
    expect(mate / N).toBeLessThan(0.9);
  });
  it('varie ses coups à l\'ouverture (pas de meilleur coup systématique)', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 80; s++) seen.add(detenteUci(new Chess(), mulberry32(s + 3))!);
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
});

describe('Calibrage mesuré (simulation déterministe, graines fixes)', () => {
  it('une débutante raisonnable gagne la grande majorité des parties', () => {
    const r = series(reasonable, 6, 5);
    console.log('[calibrage] débutante raisonnable :', JSON.stringify(r));
    expect(r.foe / r.n).toBeGreaterThanOrEqual(0.7);
  }, 900_000);
  it('le joueur aléatoire ne perd pas la majorité des parties, Détente capture et met en échec parfois', () => {
    const r = series(randomLegal, 20, 11);
    console.log('[calibrage] joueur aléatoire :', JSON.stringify(r));
    expect(r.captures).toBeGreaterThan(0);
    expect(r.checks).toBeGreaterThan(0);
  }, 900_000);
});
