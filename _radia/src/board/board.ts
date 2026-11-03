/* Échiquier DOM tactile : toucher-toucher ET glisser-déposer (Pointer Events),
   pièces animées en CSS (transform), indications de coups, dernier coup, échec.
   La vue ne connaît pas les règles : le contrôleur lui fournit les coups légaux. */
import type { Color, PieceSymbol, Square, Move } from "chess.js";
import { pieceSVG } from "../art/pieces";
import { squareAt, squareCoords, FILES } from "../core/rules";

export interface Target { to: Square; capture: boolean }

export interface BoardHandlers {
  /** La pièce de cette case peut-elle être prise en main maintenant ? */
  canPick(sq: Square): boolean;
  targets(sq: Square): Target[];
  /** Coup proposé (déjà vérifié comme cible légale). */
  onMove(from: Square, to: Square): void;
  onSelect?(sq: Square | null, piece: { color: Color; type: PieceSymbol } | null): void;
  onIllegal?(): void;
}

interface PieceEl { el: HTMLElement; color: Color; type: PieceSymbol; sq: Square }

type BoardCell = { type: PieceSymbol; color: Color } | null;

export class BoardView {
  readonly el: HTMLElement;
  private sqLayer: HTMLElement;
  private pcLayer: HTMLElement;
  readonly fxLayer: HTMLElement;
  private cells = new Map<Square, HTMLElement>();
  private pieces = new Map<Square, PieceEl>();
  private selected: Square | null = null;
  private targetsCache: Target[] = [];
  private drag: { id: number; from: Square; x0: number; y0: number; active: boolean; pe: PieceEl; wasSel: boolean } | null = null;
  private locked = false;
  showLegal = true;
  reducedFx = false;

  constructor(private readonly h: BoardHandlers) {
    this.el = document.createElement("div");
    this.el.className = "board";
    this.el.setAttribute("role", "grid");
    this.el.setAttribute("aria-label", "Échiquier");
    this.sqLayer = div("board-squares");
    this.pcLayer = div("board-pieces");
    this.fxLayer = div("board-fx");
    this.el.append(this.sqLayer, this.pcLayer, this.fxLayer);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = squareAt(col, 7 - row);
        const c = div("sq " + ((row + col) % 2 ? "dark" : "light"));
        c.dataset.sq = sq;
        if (col === 0) c.append(span("coord rank", String(8 - row)));
        if (row === 7) c.append(span("coord file", FILES[col]));
        this.sqLayer.append(c);
        this.cells.set(sq, c);
      }
    }
    this.el.addEventListener("pointerdown", (e) => this.down(e));
    this.el.addEventListener("pointermove", (e) => this.moveP(e));
    this.el.addEventListener("pointerup", (e) => this.up(e));
    this.el.addEventListener("pointercancel", () => this.cancelDrag());
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** Redessine les pièces d'un type (ex. la dame quand le visage de Radia est prêt). */
  refreshPieces(color: Color, type: PieceSymbol): void {
    for (const pe of this.pieces.values()) if (pe.color === color && pe.type === type) {
      pe.el.innerHTML = `<div class="piece-in">${pieceSVG(color, type)}</div>`;
    }
  }

  setCoords(on: boolean): void { this.el.classList.toggle("no-coords", !on); }
  setLocked(l: boolean): void { this.locked = l; if (l) { this.cancelDrag(); } }

  // ------------------------------------------------------------ position
  /** Place toutes les pièces sans animation (début, reprise). */
  setPosition(board: BoardCell[][]): void {
    this.pcLayer.textContent = "";
    this.pieces.clear();
    board.forEach((row, r) => row.forEach((p, f) => {
      if (!p) return;
      const sq = squareAt(f, 7 - r);
      this.addPiece(sq, p.color, p.type);
    }));
    this.clearSelection();
  }

  private addPiece(sq: Square, color: Color, type: PieceSymbol): PieceEl {
    const el = div(`piece ${color}${type}`);
    el.innerHTML = `<div class="piece-in">${pieceSVG(color, type)}</div>`;
    place(el, sq);
    this.pcLayer.append(el);
    const pe = { el, color, type, sq };
    this.pieces.set(sq, pe);
    return pe;
  }

  /** Anime un coup joué (déjà validé par chess.js). Renvoie la pièce capturée s'il y en a une. */
  animateMove(m: Move): void {
    const pe = this.pieces.get(m.from);
    if (!pe) return;
    const fromDrag = pe.el.classList.contains("no-anim");
    // capture (prise en passant : la pièce est à côté)
    let capSq: Square | null = null;
    if (m.captured) capSq = m.isEnPassant() ? ((m.to[0] + m.from[1]) as Square) : m.to;
    if (capSq) {
      const victim = this.pieces.get(capSq);
      if (victim) {
        this.pieces.delete(capSq);
        const v = victim.el;
        v.classList.add("captured");
        v.style.zIndex = "1";
        setTimeout(() => v.remove(), this.reducedFx ? 60 : 380);
      }
    }
    this.pieces.delete(m.from);
    pe.sq = m.to;
    this.pieces.set(m.to, pe);
    pe.el.classList.remove("lifted");
    if (fromDrag) {
      pe.el.classList.add("no-anim");
      place(pe.el, m.to);
      void pe.el.offsetWidth;
      pe.el.classList.remove("no-anim");
    } else {
      pe.el.style.zIndex = "5";
      place(pe.el, m.to);
      setTimeout(() => (pe.el.style.zIndex = ""), 240);
    }
    bounce(pe.el, "landed");
    // roque : la tour suit
    if (m.isKingsideCastle() || m.isQueensideCastle()) {
      const rank = m.from[1];
      const rf = (m.isKingsideCastle() ? "h" : "a") + rank as Square;
      const rt = (m.isKingsideCastle() ? "f" : "d") + rank as Square;
      const rook = this.pieces.get(rf);
      if (rook) { this.pieces.delete(rf); rook.sq = rt; this.pieces.set(rt, rook); place(rook.el, rt); }
    }
    // promotion : on change la pièce à l'arrivée
    if (m.promotion) {
      setTimeout(() => {
        const cur = this.pieces.get(m.to);
        if (!cur) return;
        cur.type = m.promotion!;
        cur.el.className = `piece ${cur.color}${cur.type}`;
        cur.el.innerHTML = `<div class="piece-in">${pieceSVG(cur.color, cur.type)}</div>`;
        bounce(cur.el, "promoted");
      }, fromDrag ? 0 : 200);
    }
    this.setLastMove(m.from, m.to);
    this.clearSelection();
  }

  /** Repose une pièce sur sa case (promotion annulée après un glisser). */
  snapBack(sq: Square): void {
    const pe = this.pieces.get(sq);
    if (pe) { pe.el.classList.remove("no-anim", "dragging"); place(pe.el, sq); }
    this.clearSelection();
  }

  setLastMove(from: Square | null, to: Square | null): void {
    for (const c of this.cells.values()) c.classList.remove("last-from", "last-to");
    if (from) this.cells.get(from)?.classList.add("last-from");
    if (to) this.cells.get(to)?.classList.add("last-to");
  }

  setCheck(sq: Square | null, kind: "gold" | "soft" = "soft"): void {
    for (const c of this.cells.values()) c.classList.remove("check", "check-gold");
    if (sq) this.cells.get(sq)?.classList.add(kind === "gold" ? "check-gold" : "check");
    for (const p of this.pieces.values()) p.el.classList.toggle("in-check", p.sq === sq);
  }

  /** Coordonnées du centre d'une case (px, relatives à l'échiquier). */
  squareCenter(sq: Square): { x: number; y: number; size: number } {
    const size = this.el.clientWidth / 8;
    const { file, rank } = squareCoords(sq);
    return { x: (file + 0.5) * size, y: (7 - rank + 0.5) * size, size };
  }

  pieceAt(sq: Square): PieceEl | undefined { return this.pieces.get(sq); }

  // ------------------------------------------------------------ sélection
  select(sq: Square): void {
    this.clearSelection(false);
    const pe = this.pieces.get(sq);
    if (!pe) return;
    this.selected = sq;
    this.targetsCache = this.h.targets(sq);
    this.cells.get(sq)?.classList.add("selected");
    pe.el.classList.add("lifted");
    if (this.showLegal) for (const t of this.targetsCache) this.cells.get(t.to)?.classList.add(t.capture ? "hint-cap" : "hint");
    this.h.onSelect?.(sq, { color: pe.color, type: pe.type });
  }

  clearSelection(notify = true): void {
    if (this.selected) this.pieces.get(this.selected)?.el.classList.remove("lifted");
    for (const c of this.cells.values()) c.classList.remove("selected", "hint", "hint-cap", "drag-over");
    const had = this.selected !== null;
    this.selected = null;
    this.targetsCache = [];
    if (notify && had) this.h.onSelect?.(null, null);
  }

  private sqFromEvent(e: PointerEvent): Square | null {
    const r = this.el.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const row = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squareAt(col, 7 - row);
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    if (this.locked) return;
    const sq = this.sqFromEvent(e);
    if (!sq) return;
    const pe = this.pieces.get(sq);
    // toucher une cible légale de la pièce sélectionnée : coup au relâchement
    if (this.selected && this.targetsCache.some((t) => t.to === sq)) {
      this.drag = null;
      return;
    }
    if (pe && this.h.canPick(sq)) {
      const wasSel = this.selected === sq;
      if (!wasSel) this.select(sq);
      this.drag = { id: e.pointerId, from: sq, x0: e.clientX, y0: e.clientY, active: false, pe, wasSel };
      try { this.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    } else {
      this.drag = null;
    }
  }

  private moveP(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (!d.active && dist < 6) return;
    if (!d.active) {
      d.active = true;
      d.pe.el.classList.add("dragging", "no-anim");
    }
    const r = this.el.getBoundingClientRect();
    const size = r.width / 8;
    // au doigt, la pièce est légèrement au-dessus pour rester visible
    const lift = e.pointerType === "touch" ? size * 0.55 : 0;
    const x = e.clientX - r.left - size / 2;
    const y = e.clientY - r.top - size / 2 - lift;
    d.pe.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const over = this.sqFromPoint(e.clientX, e.clientY - lift);
    for (const c of this.cells.values()) c.classList.remove("drag-over");
    if (over && this.targetsCache.some((t) => t.to === over)) this.cells.get(over)?.classList.add("drag-over");
  }

  private sqFromPoint(x: number, y: number): Square | null {
    const r = this.el.getBoundingClientRect();
    const col = Math.floor(((x - r.left) / r.width) * 8);
    const row = Math.floor(((y - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squareAt(col, 7 - row);
  }

  private up(e: PointerEvent): void {
    if (this.locked) { this.cancelDrag(); return; }
    const d = this.drag;
    this.drag = null;
    if (d && d.active) {
      const lift = e.pointerType === "touch" ? (this.el.clientWidth / 8) * 0.55 : 0;
      const to = this.sqFromPoint(e.clientX, e.clientY - lift);
      d.pe.el.classList.remove("dragging");
      if (to && to !== d.from && this.targetsCache.some((t) => t.to === to)) {
        this.h.onMove(d.from, to);
        return;
      }
      // retour à la case de départ
      d.pe.el.classList.remove("no-anim");
      place(d.pe.el, d.from);
      if (to && to !== d.from) this.illegal(d.from);
      return;
    }
    const sq = this.sqFromEvent(e);
    if (!sq) return;
    if (this.selected && sq !== this.selected) {
      if (this.targetsCache.some((t) => t.to === sq)) { this.h.onMove(this.selected, sq); return; }
      if (this.pieces.get(sq) && this.h.canPick(sq)) { this.select(sq); return; }
      const from = this.selected;
      this.clearSelection();
      this.illegal(from, sq);
      return;
    }
    // second toucher sur la pièce déjà levée : on la repose
    if (d && d.wasSel && d.from === sq) this.clearSelection();
  }

  private illegal(from: Square, to?: Square): void {
    const pe = this.pieces.get(from);
    if (pe) bounce(pe.el, "shake");
    if (to) {
      const c = this.cells.get(to);
      if (c) bounce(c, "nope");
    }
    this.h.onIllegal?.();
  }

  private cancelDrag(): void {
    const d = this.drag;
    this.drag = null;
    if (d?.active) {
      d.pe.el.classList.remove("dragging", "no-anim");
      place(d.pe.el, d.from);
    }
  }

  // ------------------------------------------------------------ promotion
  askPromotion(to: Square, color: Color): Promise<PieceSymbol | null> {
    return new Promise((resolve) => {
      const { file } = squareCoords(to);
      const box = div("promo");
      box.style.left = `${file * 12.5}%`;
      if (color === "b") box.classList.add("from-bottom");
      const types: PieceSymbol[] = ["q", "n", "r", "b"];
      for (const t of types) {
        const b = document.createElement("button");
        b.className = "promo-btn";
        b.setAttribute("aria-label", { q: "Dame", n: "Cavalier", r: "Tour", b: "Fou" }[t as "q"]);
        b.innerHTML = pieceSVG(color, t);
        b.addEventListener("pointerup", (e) => { e.stopPropagation(); close(t); });
        box.append(b);
      }
      const veil = div("promo-veil");
      veil.addEventListener("pointerup", (e) => { e.stopPropagation(); close(null); });
      veil.addEventListener("pointerdown", (e) => e.stopPropagation());
      box.addEventListener("pointerdown", (e) => e.stopPropagation());
      const close = (t: PieceSymbol | null) => { veil.remove(); box.remove(); resolve(t); };
      this.el.append(veil, box);
    });
  }
}

function div(cls: string): HTMLElement { const d = document.createElement("div"); d.className = cls; return d; }
function span(cls: string, t: string): HTMLElement { const s = document.createElement("span"); s.className = cls; s.textContent = t; return s; }

function place(el: HTMLElement, sq: Square): void {
  const { file, rank } = squareCoords(sq);
  el.style.transform = `translate3d(${file * 100}%, ${(7 - rank) * 100}%, 0)`;
}

export function bounce(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const done = () => { el.classList.remove(cls); el.removeEventListener("animationend", done); };
  el.addEventListener("animationend", done);
}
