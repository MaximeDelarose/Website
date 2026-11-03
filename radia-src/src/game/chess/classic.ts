/**
 * Partie d'échecs classique contre l'IA (règles complètes via chess.js).
 */
import { Chess } from 'chess.js';
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { save, audio } from '../../core/app';
import { bark, checkAchievements } from '../../core/progress';
import type { ChessDifficulty } from '../../save/schema';
import { GridBoard } from './GridBoard';
import { AI_LEVELS, aiMove } from './ai';
import { askPromotion, cellToSq, chessPieces, chessTargets, fitBoard, isDarkSq, needsPromotion, sqToCell, type View } from './common';
import { gameEnd, playUci, toUci, type GameEnd } from './rules';
import type { Side } from './pieces';

const DIFFS: ChessDifficulty[] = ['easy', 'normal', 'hard'];

export function classicView(onAugusteSpot: (el: HTMLElement) => void): View {
  const el = h('div.chess-view.classic');
  let destroyFn: (() => void) | null = null;

  const showSetup = () => {
    destroyFn?.();
    destroyFn = null;
    el.textContent = '';
    let diff: ChessDifficulty = 'normal';
    let color: 'w' | 'b' | 'r' = 'w';
    const seg = <T extends string>(opts: [T, string][], cur: T, set: (v: T) => void) => {
      const wrap = h('div.seg');
      const btns = opts.map(([v, label]) => h('button', { class: v === cur ? 'on' : '', on: { click: tap(() => { set(v); btns.forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); desc.textContent = AI_LEVELS[diff].desc; }) } }, label));
      wrap.append(...btns);
      return wrap;
    };
    const desc = h('p.muted.center.setup-desc', AI_LEVELS[diff].desc);
    const w = save.data.chess.wins;
    el.append(h('div.panel.chess-setup',
      h('h2', 'Une partie contre l\'IA'),
      h('div.setup-row', h('label', 'Difficulté'), seg(DIFFS.map((d) => [d, AI_LEVELS[d].label] as [ChessDifficulty, string]), diff, (v) => { diff = v; })),
      desc,
      h('div.setup-row', h('label', 'Tes pièces'), seg([['w', 'Blancs'], ['b', 'Noirs'], ['r', 'Hasard']] as ['w' | 'b' | 'r', string][], color, (v) => { color = v; })),
      h('button.btn.wide', { on: { click: tap(() => {
        const c: Side = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        save.data.chess.game = { pgn: '', difficulty: diff, color: c };
        save.save();
        startGame();
      }) } }, icon('play', 20), 'Commencer'),
      h('div.chess-stats',
        h('span.chip', `Victoires · Facile ${w.easy} · Normal ${w.normal} · Difficile ${w.hard}`),
        h('span.chip', `Nulles ${save.data.chess.draws} · Défaites ${save.data.chess.losses}`)),
    ));
  };

  const startGame = () => {
    const g = save.data.chess.game;
    if (!g) return showSetup();
    el.textContent = '';
    const chess = new Chess();
    if (g.pgn) {
      try { chess.loadPgn(g.pgn); } catch { chess.reset(); }
    }
    const player: Side = g.color;
    const diff = g.difficulty;
    let token = 0;
    let thinking = false;
    let over = false;
    let alive = true;
    let lastMove: [number, number] | undefined;
    const hist = chess.history({ verbose: true });
    if (hist.length) { const m = hist[hist.length - 1]; lastMove = [sqToCell(m.from), sqToCell(m.to)]; }

    const status = h('div.chess-status');
    const aug = h('div.chess-aug');
    const moves = h('div.chess-moves');
    const holder = h('div.board-holder');
    const board = new GridBoard({
      w: 8, h: 8, flip: player === 'b', coords: true, dark: isDarkSq,
      canSelect: (cell) => !over && !thinking && chess.turn() === player && chess.get(cellToSq(cell))?.color === player,
      targets: (cell) => chessTargets(chess, cell),
      onMove: (from, to) => void playerMove(from, to),
      onInvalid: (from, to) => { if (chess.get(cellToSq(to))?.color !== player) { audio.play('invalid'); board.shake(from); } },
    });
    holder.append(board.el);
    const unfit = fitBoard(holder, board.el);
    const undoBtn = h('button.btn.small.secondary', { on: { click: tap(() => undo()) } }, icon('undo', 18), 'Annuler');
    const bar = h('div.chess-actions',
      undoBtn,
      h('button.btn.small.secondary', { on: { click: tap(async () => {
        if (!over && chess.history().length && !(await ui.confirm('Nouvelle partie ?', 'La partie en cours sera abandonnée.', 'Oui', 'Non'))) return;
        if (!over && chess.history().length) record({ kind: 'mate', winner: player === 'w' ? 'b' : 'w' }, true);
        save.data.chess.game = null; save.save(); showSetup();
      }) } }, icon('refresh', 18), 'Nouvelle'),
      h('button.btn.small.secondary', { on: { click: tap(async () => {
        if (over) return;
        if (!(await ui.confirm('Abandonner ?', 'Auguste ne le dira à personne. Enfin… presque.', 'Abandonner', 'Continuer'))) return;
        finish({ kind: 'mate', winner: player === 'w' ? 'b' : 'w' }, true);
      }) } }, icon('flag', 18), 'Abandon'),
    );
    el.append(
      h('div.chess-top', aug, h('div.grow', h('div.chess-who', `IA · ${AI_LEVELS[diff].label}`), status)),
      moves, holder, bar,
    );
    onAugusteSpot(aug);

    const render = () => {
      board.setPieces(chessPieces(chess), lastMove);
      const marks: [number, string][] = [];
      if (lastMove) marks.push([lastMove[0], 'gb-last'], [lastMove[1], 'gb-last']);
      if (chess.inCheck()) {
        const k = chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn());
        if (k) marks.push([sqToCell(k.square), 'gb-check']);
      }
      board.setMarks(marks);
      const sans = chess.history();
      moves.textContent = '';
      if (!sans.length) moves.append(h('span.muted', 'Aucun coup pour l\'instant'));
      for (let i = 0; i < sans.length; i += 2) {
        moves.append(h('span.mv', h('b', `${i / 2 + 1}.`), ` ${sans[i]}${sans[i + 1] ? ' ' + sans[i + 1] : ''}`));
      }
      moves.scrollLeft = moves.scrollWidth;
      undoBtn.toggleAttribute('disabled', thinking || chess.history().length < (player === 'w' ? 1 : 2));
      if (over) return;
      status.textContent = thinking ? 'Réfléchit…' : chess.turn() === player ? (chess.inCheck() ? 'Échec ! À toi de jouer' : 'À toi de jouer') : '…';
      status.classList.toggle('thinking', thinking);
    };

    const persist = () => {
      if (save.data.chess.game) { save.data.chess.game.pgn = chess.pgn(); save.save(); }
    };

    const afterMove = (captured: boolean) => {
      if (chess.isCheckmate()) audio.play('victory');
      else if (chess.inCheck()) audio.play('check');
      else audio.play(captured ? 'capture' : 'move');
      persist();
      render();
      const end = gameEnd(chess);
      if (end) { window.setTimeout(() => finish(end), 650); return; }
      if (chess.turn() !== player) void aiTurn();
    };

    const playerMove = async (from: number, to: number) => {
      let promo: string | undefined;
      if (needsPromotion(chess, from, to)) { board.locked = true; promo = await askPromotion(player); board.locked = false; }
      const m = playUci(chess, cellToSq(from) + cellToSq(to) + (promo ?? ''));
      if (!m) { audio.play('invalid'); render(); return; }
      lastMove = [from, to];
      afterMove(!!m.captured);
    };

    const aiTurn = async () => {
      thinking = true;
      board.locked = true;
      render();
      const my = ++token;
      const uci = await aiMove(new Chess().fen(), chess.history({ verbose: true }).map(toUci), chess.fen(), diff);
      if (!alive || my !== token || over) return;
      thinking = false;
      board.locked = false;
      const m = uci ? playUci(chess, uci) : null;
      if (m) lastMove = [sqToCell(m.from), sqToCell(m.to)];
      afterMove(!!m?.captured);
    };

    const undo = () => {
      if (thinking || over) return;
      const n = chess.turn() === player ? 2 : 1;
      if (chess.history().length < n) return;
      for (let i = 0; i < n; i++) chess.undo();
      const hs = chess.history({ verbose: true });
      lastMove = hs.length ? [sqToCell(hs[hs.length - 1].from), sqToCell(hs[hs.length - 1].to)] : undefined;
      token++;
      audio.play('move');
      persist();
      render();
    };

    let recorded = false;
    const record = (end: GameEnd, resign = false) => {
      if (recorded) return;
      recorded = true;
      const c = save.data.chess;
      if (end.kind === 'draw') c.draws++;
      else if (end.winner === player) c.wins[diff]++;
      else c.losses++;
      c.game = null;
      save.save();
      checkAchievements();
      void resign;
    };

    const finish = async (end: GameEnd, resign = false) => {
      if (over) return;
      over = true;
      board.locked = true;
      record(end, resign);
      render();
      const win = end.kind === 'mate' && end.winner === player;
      const title = end.kind === 'draw' ? 'Partie nulle' : win ? 'Échec et mat !' : resign ? 'Partie abandonnée' : 'Échec et mat…';
      const text = end.kind === 'draw' ? `Nulle par ${end.reason}. Personne ne perd, tout le monde s'aime.` : win ? `Tu as battu l'IA en ${AI_LEVELS[diff].label}. Quelle reine !` : 'L\'IA a gagné cette fois. Revanche ?';
      status.textContent = title;
      if (win) { audio.play('victory'); bark('chessWin', true); } else if (end.kind === 'mate') bark('chessLoss', true);
      const v = await ui.modal({ title, body: text, actions: [{ label: 'Rejouer', value: 'again' }, { label: 'Voir le plateau', value: 'view', style: 'secondary' }] });
      if (!alive) return;
      if (v === 'again') { save.data.chess.game = { pgn: '', difficulty: diff, color: player }; save.save(); startGame(); }
      else {
        bar.textContent = '';
        bar.append(h('button.btn.small', { on: { click: tap(() => showSetup()) } }, icon('refresh', 18), 'Nouvelle partie'));
      }
    };

    render();
    const end0 = gameEnd(chess);
    if (end0) void finish(end0);
    else if (chess.turn() !== player) void aiTurn();
    destroyFn = () => { alive = false; token++; unfit(); };
  };

  if (save.data.chess.game) startGame(); else showSetup();
  return { el, destroy: () => { destroyFn?.(); } };
}
