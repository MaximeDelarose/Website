import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gameEnd } from '../src/game/chess/rules';

const ucis = (c: Chess) => c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));

describe('règles complètes (positions classiques)', () => {
  it('roque des deux côtés', () => {
    const c = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    expect(ucis(c)).toEqual(expect.arrayContaining(['e1g1', 'e1c1']));
    const g = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    g.move('O-O');
    expect(g.get('g1')?.type).toBe('k'); expect(g.get('f1')?.type).toBe('r');
    const q = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1');
    q.move('O-O-O');
    expect(q.get('c8')?.type).toBe('k'); expect(q.get('d8')?.type).toBe('r');
  });
  it('roque interdit : en échec, en traversant une case attaquée, pièce entre, roi/tour déjà bougés', () => {
    // roi en échec
    expect(ucis(new Chess('4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1'))).not.toContain('e1g1');
    // case de passage f1 attaquée par une tour noire
    const thru = new Chess('4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(ucis(thru)).not.toContain('e1g1');
    expect(ucis(thru)).toContain('e1c1');
    // case d'arrivée attaquée
    expect(ucis(new Chess('4k1r1/8/8/8/8/8/8/R3K2R w KQ - 0 1'))).not.toContain('e1g1');
    // pièce entre le roi et la tour
    expect(ucis(new Chess('4k3/8/8/8/8/8/8/RN2K2R w KQ - 0 1'))).not.toContain('e1c1');
    // droits perdus après avoir bougé la tour
    const moved = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    moved.move('Rh2'); moved.move('Kd7'); moved.move('Rh1'); moved.move('Ke8');
    expect(ucis(moved)).not.toContain('e1g1');
    expect(ucis(moved)).toContain('e1c1');
    // tour attaquée mais case de passage de la tour libre (b1 attaquée) : le grand roque reste permis
    expect(ucis(new Chess('1r2k3/8/8/8/8/8/8/R3K3 w Q - 0 1'))).toContain('e1c1');
  });
  it('prise en passant : seulement tout de suite', () => {
    const c = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(ucis(c)).toContain('e5d6');
    const m = c.move('exd6');
    expect(m?.isEnPassant()).toBe(true);
    expect(c.get('d5')).toBeFalsy();
    const late = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1');
    expect(ucis(late)).not.toContain('e5d6');
  });
  it('promotion : quatre choix, jamais sans choix', () => {
    const c = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(ucis(c).filter((u) => u.startsWith('a7a8')).sort()).toEqual(['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r']);
    expect(() => c.move({ from: 'a7', to: 'a8' })).toThrow();
    const n = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(n.move({ from: 'a7', to: 'a8', promotion: 'n' })?.promotion).toBe('n');
    expect(n.get('a8')).toMatchObject({ type: 'n', color: 'w' });
  });
  it('échec, mat du berger, mat du couloir', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) c.move(m);
    expect(c.isCheckmate()).toBe(true);
    expect(gameEnd(c)).toEqual({ kind: 'mate', winner: 'w' });
    const back = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    back.move('Ra8#');
    expect(gameEnd(back)).toEqual({ kind: 'mate', winner: 'w' });
    expect(new Chess('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1').inCheck()).toBe(true);
  });
  it('pat et nulles', () => {
    expect(gameEnd(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ kind: 'draw', reason: 'pat' });
    expect(gameEnd(new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1'))).toEqual({ kind: 'draw', reason: 'matériel insuffisant' });
    expect(gameEnd(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 100 80'))).toEqual({ kind: 'draw', reason: '50 coups' });
    const rep = new Chess();
    for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) rep.move(m);
    expect(gameEnd(rep)).toEqual({ kind: 'draw', reason: 'répétition' });
    expect(gameEnd(new Chess())).toBeNull();
  });
  it('un roi ne peut pas se mettre en échec, une pièce clouée ne bouge pas hors de la ligne', () => {
    const c = new Chess('4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1');
    expect(ucis(c)).not.toContain('e1d2');
    const pin = new Chess('4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1');
    expect(ucis(pin).filter((u) => u.startsWith('e2'))).toEqual([]);
  });
});
