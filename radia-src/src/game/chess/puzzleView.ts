/**
 * Problèmes d'échecs : mats en 1, mats en 2 et tactiques.
 */
import { haptic } from '../../core/haptics';
import { Chess } from 'chess.js';
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { save, audio } from '../../core/app';
import { checkAchievements, statMax } from '../../core/progress';
import { GridBoard } from './GridBoard';
import { CHESS_PUZZLES, type ChessPuzzle } from './puzzles';
import { askPromotion, cellToSq, chessPieces, chessTargets, fitBoard, isDarkSq, needsPromotion, sqToCell, type View } from './common';
import { forcesMateIn1, playUci, toUci } from './rules';
import type { Side } from './pieces';

const GOAL: Record<ChessPuzzle['goal'], string> = { mate1: 'Mat en 1', mate2: 'Mat en 2', win: 'Gagne du matériel' };

export function puzzleView(): View {
  const el = h('div.chess-view.puzzles');
  let cleanup: (() => void) | null = null;
  statMax('chessPuzzlesTotal', CHESS_PUZZLES.length);

  const list = () => {
    cleanup?.(); cleanup = null;
    el.textContent = '';
    const solved = save.data.chess.puzzles;
    el.append(
      h('p.muted.center.list-intro', `${solved.length} / ${CHESS_PUZZLES.length} problèmes résolus`),
      h('div.puzzle-grid', ...CHESS_PUZZLES.map((p, i) => h(`button.puzzle-card${solved.includes(p.id) ? '.done' : ''}`, { on: { click: tap(() => play(i)) } },
        h('span.pc-num', String(i + 1)),
        h('span.pc-title', p.title),
        h('span.pc-goal', GOAL[p.goal]),
        solved.includes(p.id) ? h('span.pc-check', icon('check', 16)) : null))),
    );
  };

  const play = (index: number) => {
    cleanup?.();
    el.textContent = '';
    const p = CHESS_PUZZLES[index];
    const chess = new Chess(p.fen);
    const me = chess.turn() as Side;
    let ply = 0; // coups joués dans la ligne
    let done = false;
    let busy = false;
    let lastMove: [number, number] | undefined;
    const msg = h('div.chess-status', me === 'w' ? 'Les blancs jouent' : 'Les noirs jouent');
    const holder = h('div.board-holder');
    const board = new GridBoard({
      w: 8, h: 8, flip: me === 'b', coords: true, dark: isDarkSq,
      canSelect: (c) => !done && !busy && chess.turn() === me && chess.get(cellToSq(c))?.color === me,
      targets: (c) => chessTargets(chess, c),
      onMove: (f, t) => void move(f, t),
      onInvalid: (f, t) => { if (chess.get(cellToSq(t))?.color !== me) { audio.play('invalid'); board.shake(f); } },
    });
    holder.append(board.el);
    cleanup = fitBoard(holder, board.el);

    const render = () => {
      board.setPieces(chessPieces(chess), lastMove);
      const marks: [number, string][] = [];
      if (lastMove) marks.push([lastMove[0], 'gb-last'], [lastMove[1], 'gb-last']);
      if (chess.inCheck()) {
        const k = chess.board().flat().find((q) => q && q.type === 'k' && q.color === chess.turn());
        if (k) marks.push([sqToCell(k.square), 'gb-check']);
      }
      board.setMarks(marks);
    };

    const reset = () => {
      chess.load(p.fen);
      ply = 0; done = false; busy = false; lastMove = undefined;
      msg.textContent = me === 'w' ? 'Les blancs jouent' : 'Les noirs jouent';
      msg.className = 'chess-status';
      render();
    };

    const wrong = (text: string) => {
      busy = true;
      audio.play('invalid');
      msg.textContent = text;
      msg.className = 'chess-status bad';
      window.setTimeout(() => { chess.undo(); lastMove = undefined; ply = Math.max(0, ply); busy = false; render(); }, 700);
    };

    const success = async () => {
      done = true;
      audio.play('victory');
      msg.textContent = 'Bravo !';
      msg.className = 'chess-status good';
      const first = !save.data.chess.puzzles.includes(p.id);
      if (first) { save.data.chess.puzzles.push(p.id); save.save(); checkAchievements(); }
      const next = index + 1 < CHESS_PUZZLES.length;
      const v = await ui.modal({
        title: 'Problème résolu !', body: first ? 'Trop forte. Un de plus dans la collection.' : 'Toujours aussi forte.',
        actions: [...(next ? [{ label: 'Problème suivant', value: 'next' }] : []), { label: 'Liste des problèmes', value: 'list', style: 'secondary' as const }],
      });
      if (!el.isConnected) return;
      if (v === 'next') play(index + 1); else list();
    };

    const move = async (from: number, to: number) => {
      let promo: string | undefined;
      if (needsPromotion(chess, from, to)) promo = await askPromotion(me);
      const u = cellToSq(from) + cellToSq(to) + (promo ?? '');
      const m = playUci(chess, u);
      if (!m) return;
      lastMove = [from, to];
      audio.play(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move');
      haptic(chess.isCheckmate() ? 'chessMate' : chess.inCheck() ? 'chessCheck' : m.captured ? 'chessCapture' : 'chessMove');
      render();
      const expected = p.line[ply];
      let ok: boolean;
      if (p.goal === 'win') ok = toUci(m) === expected || (toUci(m).slice(0, 4) === expected.slice(0, 4));
      else if (chess.isCheckmate()) ok = true;
      else if (p.goal === 'mate2' && ply === 0) ok = forcesMateIn1(chess);
      else ok = false;
      if (!ok) { wrong(p.goal === 'win' ? 'Pas tout à fait… cherche encore.' : 'Ce n\'est pas mat… essaie encore.'); return; }
      if (chess.isCheckmate() || ply + 1 >= p.line.length) { void success(); return; }
      // réponse de l'adversaire
      busy = true;
      ply++;
      msg.textContent = 'Bien vu ! L\'adversaire répond…';
      msg.className = 'chess-status good';
      window.setTimeout(() => {
        const replies = chess.moves({ verbose: true });
        const scripted = p.line[ply];
        const r = (scripted && playUci(chess, scripted)) || (replies.length ? playUci(chess, toUci(replies[0])) : null);
        if (r) { lastMove = [sqToCell(r.from), sqToCell(r.to)]; audio.play(r.captured ? 'capture' : 'move'); if (r.captured) haptic('chessCapture'); }
        ply++;
        busy = false;
        msg.textContent = 'À toi : termine le travail !';
        msg.className = 'chess-status';
        render();
      }, 650);
    };

    el.append(
      h('div.puzzle-head',
        h('button.icon-btn', { 'aria-label': 'Liste', on: { click: tap(() => list()) } }, icon('back')),
        h('div.grow', h('div.chess-who', `${index + 1}. ${p.title}`), h('span.chip.goal', GOAL[p.goal]))),
      msg, holder,
      h('div.chess-actions',
        h('button.btn.small.secondary', { on: { click: tap(() => { msg.textContent = p.hint; msg.className = 'chess-status hint'; }) } }, icon('hint', 18), 'Indice'),
        h('button.btn.small.secondary', { on: { click: tap(() => reset()) } }, icon('refresh', 18), 'Recommencer')),
    );
    render();
  };

  list();
  return { el, destroy: () => cleanup?.() };
}
