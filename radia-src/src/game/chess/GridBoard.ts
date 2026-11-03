/**
 * Plateau en grille (DOM) commun aux échecs, aux problèmes et au Mode Reine :
 *  - pièces animées (glissement par transform, apparition/disparition) ;
 *  - toucher pour sélectionner puis toucher la case d'arrivée, OU glisser-déposer
 *    (relâcher hors du plateau annule) ; touch-action: none sur le plateau ;
 *  - repères : cases jouables, dernier coup, échec, cases attaquées…
 */
import { h } from '../../ui/dom';

export interface BoardPiece { cell: number; kind: string; html: string }

export interface GridBoardOpts {
  w: number;
  h: number;
  flip?: boolean;
  dark: (cell: number) => boolean;
  canSelect: (cell: number) => boolean;
  targets: (cell: number) => number[];
  onMove: (from: number, to: number) => void;
  onInvalid?: (from: number, to: number) => void;
  onSelect?: (cell: number | null) => void;
  /** Étiquettes de coordonnées (a–h / 1–8) pour les échecs. */
  coords?: boolean;
}

interface PieceEl { el: HTMLElement; cell: number; kind: string }

export class GridBoard {
  el: HTMLElement;
  private squares: HTMLElement[] = [];
  private decor: HTMLElement;
  private marks: HTMLElement;
  private layer: HTMLElement;
  private pieces: PieceEl[] = [];
  private selected: number | null = null;
  private targetsNow: number[] = [];
  private drag: { id: number; from: number; x: number; y: number; moved: boolean; pe: PieceEl | null; wasSelected: boolean } | null = null;
  locked = false;

  constructor(private o: GridBoardOpts) {
    this.el = h('div.gb', { style: `--gw:${o.w};--gh:${o.h}` });
    const grid = h('div.gb-grid');
    for (let i = 0; i < o.w * o.h; i++) {
      const sq = h('div.gb-sq');
      this.squares.push(sq);
      grid.append(sq);
    }
    this.decor = h('div.gb-layer.gb-decor');
    this.marks = h('div.gb-layer.gb-marks');
    this.layer = h('div.gb-layer.gb-pieces');
    this.el.append(grid, this.decor, this.marks, this.layer);
    this.paintSquares();
    this.el.addEventListener('pointerdown', (e) => this.down(e));
    this.el.addEventListener('pointermove', (e) => this.move(e));
    this.el.addEventListener('pointerup', (e) => this.up(e));
    this.el.addEventListener('pointercancel', () => this.cancelDrag());
    this.el.addEventListener('lostpointercapture', () => { if (this.drag) this.cancelDrag(); });
  }

  setFlip(flip: boolean): void {
    this.o.flip = flip;
    this.paintSquares();
    for (const p of this.pieces) this.place(p.el, p.cell);
  }

  /** Cellule logique → position affichée (col, rang). */
  private disp(cell: number): [number, number] {
    const x = cell % this.o.w;
    const y = Math.floor(cell / this.o.w);
    return this.o.flip ? [this.o.w - 1 - x, this.o.h - 1 - y] : [x, y];
  }

  private paintSquares(): void {
    this.squares.forEach((sq, k) => {
      // k est l'index d'affichage ; on retrouve la cellule logique
      const dx = k % this.o.w;
      const dy = Math.floor(k / this.o.w);
      const cell = this.o.flip ? (this.o.h - 1 - dy) * this.o.w + (this.o.w - 1 - dx) : k;
      sq.className = `gb-sq ${this.o.dark(cell) ? 'dark' : 'light'}`;
      sq.textContent = '';
      if (this.o.coords) {
        if (dx === 0) sq.append(h('span.gb-rank', String(this.o.h - Math.floor(cell / this.o.w))));
        if (dy === this.o.h - 1) sq.append(h('span.gb-file', 'abcdefgh'[cell % this.o.w]));
      }
    });
  }

  private place(el: HTMLElement, cell: number): void {
    const [x, y] = this.disp(cell);
    el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  }

  private cellEl(cls: string, cell: number, html = ''): HTMLElement {
    const e = h('div', { html });
    e.className = `gb-cell ${cls}`;
    this.place(e, cell);
    return e;
  }

  /** Décor fixe (murs, portails, cœurs…) : liste [cellule, classe, html]. */
  setDecor(items: [number, string, string?][]): void {
    this.decor.textContent = '';
    for (const [cell, cls, html] of items) this.decor.append(this.cellEl(cls, cell, html ?? ''));
  }

  /** Repères (cases jouables, dernier coup…) : classes par cellule. */
  setMarks(items: [number, string][]): void {
    this.marks.textContent = '';
    for (const [cell, cls] of items) this.marks.append(this.cellEl(cls, cell));
    this.renderSelection();
  }

  private selLayer: HTMLElement[] = [];
  private renderSelection(): void {
    for (const e of this.selLayer) e.remove();
    this.selLayer = [];
    if (this.selected === null) return;
    const sel = this.cellEl('gb-selected', this.selected);
    this.marks.append(sel);
    this.selLayer.push(sel);
    for (const t of this.targetsNow) {
      const occupied = this.pieces.some((p) => p.cell === t);
      const m = this.cellEl(occupied ? 'gb-capture' : 'gb-dot', t);
      this.marks.append(m);
      this.selLayer.push(m);
    }
  }

  /**
   * Met à jour les pièces. Les pièces identiques restées en place sont
   * conservées ; celles qui ont bougé glissent ; les autres apparaissent ou
   * disparaissent en fondu. `hint` aide à choisir la pièce qui a bougé.
   */
  setPieces(list: BoardPiece[], hint?: [number, number]): void {
    const old = [...this.pieces];
    const next: PieceEl[] = [];
    const pending: BoardPiece[] = [];
    for (const p of list) {
      const i = old.findIndex((o) => o.cell === p.cell && o.kind === p.kind);
      if (i >= 0) { next.push(old[i]); old.splice(i, 1); } else pending.push(p);
    }
    for (const p of pending) {
      let i = -1;
      if (hint && hint[1] === p.cell) i = old.findIndex((o) => o.cell === hint[0] && o.kind === p.kind);
      if (i < 0) {
        // la plus proche de même nature
        let best = Infinity;
        old.forEach((o, k) => {
          if (o.kind !== p.kind) return;
          const d = Math.abs((o.cell % this.o.w) - (p.cell % this.o.w)) + Math.abs(Math.floor(o.cell / this.o.w) - Math.floor(p.cell / this.o.w));
          if (d < best) { best = d; i = k; }
        });
      }
      if (i >= 0) {
        const pe = old[i];
        old.splice(i, 1);
        pe.cell = p.cell;
        pe.el.style.transition = '';
        this.place(pe.el, p.cell);
        pe.el.classList.add('moving');
        window.setTimeout(() => pe.el.classList.remove('moving'), 260);
        next.push(pe);
      } else {
        const el = h('div.gb-piece.appear', { html: p.html });
        this.place(el, p.cell);
        this.layer.append(el);
        window.setTimeout(() => el.classList.remove('appear'), 300);
        next.push({ el, cell: p.cell, kind: p.kind });
      }
    }
    for (const o of old) {
      o.el.classList.add('vanish');
      window.setTimeout(() => o.el.remove(), 260);
    }
    this.pieces = next;
  }

  select(cell: number | null): void {
    this.selected = cell;
    this.targetsNow = cell === null ? [] : this.o.targets(cell);
    this.o.onSelect?.(cell);
    this.renderSelection();
  }

  /** Petit tremblement (coup refusé). */
  shake(cell: number): void {
    const pe = this.pieces.find((p) => p.cell === cell);
    const el = pe?.el ?? null;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  // ------------------------------------------------------------- entrée

  private cellAt(e: PointerEvent): number {
    const r = this.el.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) return -1;
    let x = Math.floor(fx * this.o.w);
    let y = Math.floor(fy * this.o.h);
    if (this.o.flip) { x = this.o.w - 1 - x; y = this.o.h - 1 - y; }
    return y * this.o.w + x;
  }

  private down(e: PointerEvent): void {
    if (this.locked || this.drag) return;
    e.preventDefault();
    const cell = this.cellAt(e);
    if (cell < 0) return;
    if (this.o.canSelect(cell)) {
      const wasSelected = this.selected === cell;
      if (!wasSelected) this.select(cell);
      const pe = this.pieces.find((p) => p.cell === cell) ?? null;
      this.drag = { id: e.pointerId, from: cell, x: e.clientX, y: e.clientY, moved: false, pe, wasSelected };
      try { this.el.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
      pe?.el.classList.add('lifted');
      return;
    }
    if (this.selected !== null) {
      const from = this.selected;
      if (this.targetsNow.includes(cell)) { this.select(null); this.o.onMove(from, cell); }
      else { this.o.onInvalid?.(from, cell); this.select(null); }
    }
  }

  private move(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id || !d.pe) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 7) return;
    d.moved = true;
    const r = this.el.getBoundingClientRect();
    const size = r.width / this.o.w;
    const px = e.clientX - r.left - size / 2;
    const py = e.clientY - r.top - size / 2 - size * 0.25; // un peu au-dessus du doigt
    d.pe.el.style.transition = 'none';
    d.pe.el.style.transform = `translate(${px}px, ${py}px) scale(1.15)`;
    d.pe.el.classList.add('dragging');
  }

  private up(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    try { this.el.releasePointerCapture(e.pointerId); } catch { /* ignoré */ }
    d.pe?.el.classList.remove('lifted', 'dragging');
    if (!d.moved) {
      if (d.wasSelected) this.select(null); // second toucher = désélection
      return;
    }
    const to = this.cellAt(e);
    if (d.pe) { d.pe.el.style.transition = ''; }
    if (to >= 0 && to !== d.from && this.targetsNow.includes(to)) {
      if (d.pe) { d.pe.el.style.transition = 'none'; this.place(d.pe.el, to); void d.pe.el.offsetWidth; d.pe.el.style.transition = ''; }
      this.select(null);
      this.o.onMove(d.from, to);
    } else {
      if (d.pe) this.place(d.pe.el, d.from);
      if (to >= 0 && to !== d.from) this.o.onInvalid?.(d.from, to);
    }
  }

  private cancelDrag(): void {
    const d = this.drag;
    this.drag = null;
    if (d?.pe) {
      d.pe.el.classList.remove('lifted', 'dragging');
      d.pe.el.style.transition = '';
      this.place(d.pe.el, d.from);
    }
  }
}
