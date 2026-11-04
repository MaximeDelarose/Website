import { describe, it, expect } from 'vitest';
import { CHESS_LINES, CHESS_TIPS, CHESS_TIP_ORDER, hasExpression, hasGalbi, newLineMemory, pickChessLine, type ChessSituation } from '../src/game/chess/lines';
import { mulberry32 } from '../src/game/chess/detente';
import { sanitize, defaultSave, migrate } from '../src/save/schema';

const SITS = Object.keys(CHESS_LINES) as ChessSituation[];

describe('réactions d\'Auguste aux échecs', () => {
  it('≥ 6 variantes par situation, sans doublon, jamais « IA » dans les textes', () => {
    for (const s of SITS) {
      expect(CHESS_LINES[s].length, s).toBeGreaterThanOrEqual(6);
      expect(new Set(CHESS_LINES[s]).size, s).toBe(CHESS_LINES[s].length);
      for (const l of CHESS_LINES[s]) { expect(l, l).not.toMatch(/\bIA\b|intelligence artificielle|ordinateur/i); expect(l.length).toBeLessThan(120); }
    }
    for (const t of Object.values(CHESS_TIPS)) expect(t).not.toMatch(/\bIA\b/);
  });
  it('contient les exemples validés tels quels', () => {
    const has = (s: ChessSituation, l: string) => expect(CHESS_LINES[s]).toContain(l);
    for (const l of ['Bsahték ! Bien joué !', 'Mashallah, t\'as vu ce coup !', 'Sahha ! J\'avais rien vu venir.', 'Ah ouais, t\'es dangereuse toi !', 'Ah ouais, bien joué !']) has('radiaCapture', l);
    for (const l of ['Ya latif ! Ma reine !', 'Bsahték, tu m\'as détruit là !', 'Bon… là j\'ai plus rien à dire.']) has('radiaTakesQueen', l);
    for (const l of ['Ya latif, encore ?!', 'Saha, joli coup !', 'Mais laisse-moi respirer deux secondes !', 'Bon… là, je commence à m\'inquiéter.']) has('radiaCheck', l);
    for (const l of ['Bsahték, t\'as mérité !', 'Mashallah, la championne !', 'Wallah, tu m\'as massacré !', 'Sahha, je demande ma revanche !', 'OK, je reconnais, tu m\'as complètement battu.']) has('radiaWin', l);
    has('augWin', 'On en refait une ? Je suis sûr que tu vas prendre ta revanche.');
  });
  it('anti-répétition : jamais deux identiques d\'affilée (même situation)', () => {
    const rng = mulberry32(1);
    const mem = newLineMemory();
    for (const s of SITS) {
      let prev = '';
      for (let i = 0; i < 80; i++) {
        const l = pickChessLine(s, rng, mem);
        expect(l).not.toBe(prev);
        expect(CHESS_LINES[s]).toContain(l);
        prev = l;
      }
    }
  });
  it('expressions arabes : environ 1 réplique sur 3–4, jamais 2 d\'affilée ; « galbi » très rare', () => {
    const rng = mulberry32(99);
    const mem = newLineMemory();
    const N = 4000;
    const picks: string[] = [];
    for (let i = 0; i < N; i++) picks.push(pickChessLine(SITS[Math.floor(rng() * SITS.length)], rng, mem));
    const ex = picks.map(hasExpression);
    const rate = ex.filter(Boolean).length / N;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.36);
    for (let i = 1; i < N; i++) expect(ex[i] && ex[i - 1]).toBe(false);
    const gal = picks.map(hasGalbi);
    expect(gal.filter(Boolean).length / N).toBeLessThan(0.05);
    for (let i = 0; i < N; i++) if (gal[i]) for (let k = 1; k < 12 && i + k < N; k++) expect(gal[i + k]).toBe(false);
  });
  it('même dans une situation riche en expressions (prise de Radia), pas dans chaque réaction', () => {
    const rng = mulberry32(5);
    const mem = newLineMemory();
    const ex = Array.from({ length: 300 }, () => hasExpression(pickChessLine('radiaCapture', rng, mem)));
    expect(ex.filter(Boolean).length / 300).toBeLessThan(0.5);
    for (let i = 1; i < 300; i++) expect(ex[i] && ex[i - 1]).toBe(false);
  });
  it('tutoriel : une bulle courte par notion', () => {
    for (const k of CHESS_TIP_ORDER) { expect(CHESS_TIPS[k]).toBeTruthy(); expect(CHESS_TIPS[k].length).toBeLessThan(125); }
    expect(new Set(CHESS_TIP_ORDER).size).toBe(CHESS_TIP_ORDER.length);
  });
});

describe('sauvegarde : difficulté « Détente ♡ » par défaut', () => {
  it('nouvelle sauvegarde : Détente, aides activées', () => {
    const d = defaultSave().chess;
    expect(d.pref).toBe('relax');
    expect(d.opts).toEqual({ legal: true, threats: true, captures: true, tutorial: true });
    expect(d.wins.relax).toBe(0);
  });
  it('ancienne sauvegarde : choix par défaut « Détente », partie en cours et victoires conservées', () => {
    const old = { v: 5, chess: { wins: { easy: 2, normal: 1, hard: 0 }, losses: 3, draws: 1, puzzles: ['a'], queen: [], game: { pgn: '1. e4 e5', difficulty: 'normal', color: 'b' } } };
    const r = migrate(old).data.chess;
    expect(r.pref).toBe('relax');
    expect(r.wins).toEqual({ relax: 0, easy: 2, normal: 1, hard: 0 });
    expect(r.game).toEqual({ pgn: '1. e4 e5', difficulty: 'normal', color: 'b' });
    expect(r.losses).toBe(3);
    expect(r.opts?.legal).toBe(true);
  });
  it('sanitisation : valeurs absurdes ramenées à des valeurs saines', () => {
    const r = sanitize({ chess: { pref: 'zzz', opts: { legal: 'oui', threats: false, captures: 3 }, tut: ['move', 4, 'check'], wins: { relax: -5 }, game: { pgn: '', difficulty: 'relax', color: 'w' } } }).chess;
    expect(r.pref).toBe('relax');
    expect(r.opts).toEqual({ legal: true, threats: false, captures: true, tutorial: true });
    expect(r.tut).toEqual(['move', 'check']);
    expect(r.wins.relax).toBe(0);
    expect(r.game?.difficulty).toBe('relax');
    const keep = sanitize({ chess: { pref: 'hard' } }).chess;
    expect(keep.pref).toBe('hard');
  });
});
