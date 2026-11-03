/** Outils partagés par les vues d'échecs (cases, pièces, promotion). */
import type { Chess, Square } from 'chess.js';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { pieceSvg, PIECE_NAMES, type PieceKind, type Side } from './pieces';
import type { BoardPiece } from './GridBoard';

export interface View { el: HTMLElement; destroy(): void }

/** Case algébrique ↔ cellule (0 = a8 en haut à gauche, 63 = h1). */
export const sqToCell = (sq: string) => (8 - Number(sq[1])) * 8 + (sq.charCodeAt(0) - 97);
export const cellToSq = (c: number) => (String.fromCharCode(97 + (c % 8)) + (8 - Math.floor(c / 8))) as Square;
export const isDarkSq = (c: number) => ((c % 8) + Math.floor(c / 8)) % 2 === 1;

/**
 * `face` peut remplacer le dessin d'une pièce (visage de Radia pour sa dame,
 * d'Auguste pour son roi) : la nature de la pièce change alors (suffixe « f »)
 * pour que le plateau la redessine.
 */
export function chessPieces(c: Chess, face?: (color: Side, type: PieceKind) => string | null): BoardPiece[] {
  const out: BoardPiece[] = [];
  c.board().forEach((row, y) => row.forEach((p, x) => {
    if (!p) return;
    const f = face?.(p.color as Side, p.type as PieceKind) ?? null;
    out.push({ cell: y * 8 + x, kind: p.color + p.type + (f ? 'f' : ''), html: f ?? pieceSvg(p.color as Side, p.type as PieceKind) });
  }));
  return out;
}

/** Cases d'arrivée légales depuis une cellule. */
export function chessTargets(c: Chess, cell: number): number[] {
  return [...new Set(c.moves({ square: cellToSq(cell), verbose: true }).map((m) => sqToCell(m.to)))];
}

export function needsPromotion(c: Chess, from: number, to: number): boolean {
  return c.moves({ square: cellToSq(from), verbose: true }).some((m) => m.to === cellToSq(to) && !!m.promotion);
}

/** Choix de la pièce de promotion. */
export function askPromotion(side: Side): Promise<PieceKind> {
  return new Promise((resolve) => {
    const kinds: PieceKind[] = ['q', 'r', 'b', 'n'];
    const back = h('div.modal-backdrop');
    const pick = (k: PieceKind) => { back.classList.add('leaving'); window.setTimeout(() => back.remove(), 180); resolve(k); };
    back.append(h('div.modal.panel', { role: 'dialog' },
      h('h2', 'Promotion !'),
      h('p', 'Ton pion devient…'),
      h('div.promo-row', ...kinds.map((k) => h('button.promo-btn', { 'aria-label': PIECE_NAMES[k], on: { click: tap(() => pick(k)) } },
        h('span.promo-svg', { html: pieceSvg(side, k) }), h('small', PIECE_NAMES[k])))),
    ));
    ui.root.append(back);
  });
}

/** Ajuste la taille du plateau à la place disponible (carré, sans débordement). */
export function fitBoard(holder: HTMLElement, board: HTMLElement, ratio = 1): () => void {
  const fit = () => {
    const w = holder.clientWidth;
    const hh = holder.clientHeight;
    if (!w || !hh) return;
    const size = Math.max(160, Math.min(w, hh * ratio, 560));
    board.style.width = `${Math.floor(size)}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(holder);
  requestAnimationFrame(fit);
  return () => ro.disconnect();
}
