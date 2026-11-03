// Modèle du sac du joueur hors combat : placement, rotation, miroir, réserve.
// Pur (aucun DOM) : partagé par l'UI et testé à part.

import { DIRS, key, transformShape, validatePlacements } from "../engine/geometry";
import type { Content, Placement, Vec } from "../engine/types";

export interface BagEntry {
  uid: string;
  item: string;
  rot: number;
  mirror: boolean;
  /** null = dans la réserve (hors grille). */
  pos: Vec | null;
  charges?: number | null;
  /** Objet obtenu par fusion : ses ingrédients (pour la défusion). */
  fusedFrom?: string[];
}

export interface PlaceCheck {
  ok: boolean;
  cells: Vec[];
  /** Cases hors du sac ou déjà prises. */
  bad: Vec[];
}

export interface SavedBag {
  /** Forme du sac (agrandie par les extensions). Absente = forme de la classe. */
  cells?: Vec[];
  entries: { item: string; rot: number; mirror?: boolean; pos: Vec | null; charges?: number | null; fusedFrom?: string[] }[];
}

export class Bag {
  readonly cells: Vec[];
  entries: BagEntry[] = [];
  private cellSet: Set<string>;
  private next = 0;

  constructor(
    readonly content: Content,
    cells: Vec[],
    /** Taille max (largeur, hauteur) une fois agrandi. */
    readonly maxBag: [number, number] = [7, 5],
  ) {
    this.cells = cells.map(([x, y]) => [x, y] as Vec);
    this.cellSet = new Set(cells.map(([x, y]) => key(x, y)));
  }

  /** Boîte englobante de la forme du sac. */
  bounds(): { minX: number; minY: number; w: number; h: number } {
    const xs = this.cells.map((c) => c[0]);
    const ys = this.cells.map((c) => c[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { minX, minY, w: Math.max(...xs) - minX + 1, h: Math.max(...ys) - minY + 1 };
  }

  hasCell(x: number, y: number): boolean {
    return this.cellSet.has(key(x, y));
  }

  isExtension(e: BagEntry): boolean {
    return this.content.items[e.item]?.extends === true;
  }

  add(item: string, pos: Vec | null = null, rot = 0, mirror = false, charges?: number | null): BagEntry {
    if (!this.content.items[item]) throw new Error(`Objet inconnu : ${item}`);
    const e: BagEntry = { uid: `b${this.next++}`, item, rot: ((rot % 4) + 4) % 4, mirror, pos: null };
    if (charges !== undefined) e.charges = charges;
    this.entries.push(e);
    if (pos && !this.move(e.uid, pos)) e.pos = null;
    return e;
  }

  remove(uid: string): void {
    this.entries = this.entries.filter((e) => e.uid !== uid);
  }

  get(uid: string): BagEntry | undefined {
    return this.entries.find((e) => e.uid === uid);
  }

  shape(e: BagEntry, rot = e.rot, mirror = e.mirror): Vec[] {
    return transformShape(this.content.items[e.item].shape, { rot, mirror });
  }

  cellsAt(e: BagEntry, pos: Vec, rot = e.rot, mirror = e.mirror): Vec[] {
    return this.shape(e, rot, mirror).map(([x, y]) => [x + pos[0], y + pos[1]] as Vec);
  }

  /** Case -> uid de l'objet qui l'occupe (objets posés seulement). */
  occupancy(except?: string): Map<string, string> {
    const m = new Map<string, string>();
    for (const e of this.entries) {
      if (!e.pos || e.uid === except) continue;
      for (const [x, y] of this.cellsAt(e, e.pos)) m.set(key(x, y), e.uid);
    }
    return m;
  }

  check(uid: string, pos: Vec, rot?: number, mirror?: boolean): PlaceCheck {
    const e = this.get(uid);
    if (!e) return { ok: false, cells: [], bad: [] };
    const cells = this.cellsAt(e, pos, rot ?? e.rot, mirror ?? e.mirror);
    if (this.isExtension(e)) return this.checkExtension(cells);
    const occ = this.occupancy(uid);
    const bad = cells.filter(([x, y]) => !this.hasCell(x, y) || occ.has(key(x, y)));
    return { ok: bad.length === 0, cells, bad };
  }

  /** Une extension se pose hors du sac, touche le sac par un côté, sans dépasser la taille max. */
  private checkExtension(cells: Vec[]): PlaceCheck {
    const bad = cells.filter(([x, y]) => this.hasCell(x, y));
    const touches = cells.some(([x, y]) => DIRS.some(([dx, dy]) => this.hasCell(x + dx, y + dy)));
    const all = [...this.cells, ...cells];
    const xs = all.map((c) => c[0]);
    const ys = all.map((c) => c[1]);
    const fits = Math.max(...xs) - Math.min(...xs) + 1 <= this.maxBag[0] && Math.max(...ys) - Math.min(...ys) + 1 <= this.maxBag[1];
    if (!touches || !fits) return { ok: false, cells, bad: cells };
    return { ok: bad.length === 0, cells, bad };
  }

  /** Cases où une extension pourrait ajouter de la place (bord extérieur du sac). */
  extensionSlots(): Vec[] {
    const out = new Map<string, Vec>();
    for (const [x, y] of this.cells) {
      for (const [dx, dy] of DIRS) {
        const c: Vec = [x + dx, y + dy];
        if (!this.hasCell(c[0], c[1]) && this.checkExtension([c]).ok) out.set(key(c[0], c[1]), c);
      }
    }
    return [...out.values()];
  }

  /** Pose un objet (avec rotation / miroir éventuels). false si la place n'est pas libre. */
  move(uid: string, pos: Vec, rot?: number, mirror?: boolean): boolean {
    const e = this.get(uid);
    if (!e) return false;
    const chk = this.check(uid, pos, rot, mirror);
    if (!chk.ok) return false;
    if (this.isExtension(e)) {
      // l'extension devient des cases du sac
      for (const c of chk.cells) {
        this.cells.push([c[0], c[1]]);
        this.cellSet.add(key(c[0], c[1]));
      }
      this.remove(uid);
      return true;
    }
    e.pos = [pos[0], pos[1]];
    if (rot !== undefined) e.rot = ((rot % 4) + 4) % 4;
    if (mirror !== undefined) e.mirror = mirror;
    return true;
  }

  /** Range un objet dans la réserve. Un objet maudit refuse (false). */
  stash(uid: string): boolean {
    const e = this.get(uid);
    if (!e) return false;
    if (e.pos && this.content.items[e.item]?.cursed) return false;
    e.pos = null;
    return true;
  }

  /** Essaie une transformation sur place, puis en décalant un peu l'objet. */
  private retransform(uid: string, rot: number, mirror: boolean): boolean {
    const e = this.get(uid);
    if (!e) return false;
    if (!e.pos) {
      e.rot = rot;
      e.mirror = mirror;
      return true;
    }
    const offsets: Vec[] = [];
    for (let d = 0; d <= 2; d++)
      for (let dy = -d; dy <= d; dy++)
        for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d) offsets.push([dx, dy]);
    for (const [dx, dy] of offsets) {
      if (this.move(uid, [e.pos[0] + dx, e.pos[1] + dy], rot, mirror)) return true;
    }
    return false;
  }

  /** Quart de tour (dir = 1 horaire, -1 antihoraire). false si l'objet ne rentre plus. */
  rotate(uid: string, dir = 1): boolean {
    const e = this.get(uid);
    if (!e) return false;
    return this.retransform(uid, (((e.rot + dir) % 4) + 4) % 4, e.mirror);
  }

  flip(uid: string): boolean {
    const e = this.get(uid);
    if (!e) return false;
    return this.retransform(uid, e.rot, !e.mirror);
  }

  placed(): BagEntry[] {
    return this.entries.filter((e) => e.pos !== null);
  }

  stashed(): BagEntry[] {
    return this.entries.filter((e) => e.pos === null);
  }

  /** Placements pour le moteur, dans l'ordre du sac (uid moteur « 0:i » = i-ème placement). */
  placements(): Placement[] {
    return this.placed().map((e) => {
      const p: Placement = { item: e.item, pos: [e.pos![0], e.pos![1]], rot: e.rot };
      if (e.mirror) p.mirror = true;
      if (e.charges !== undefined) p.charges = e.charges;
      return p;
    });
  }

  /** Vérification complète (aucun chevauchement, tout dans le sac). */
  isValid(): boolean {
    const placed = this.placed().map((e) => ({ id: e.uid, cells: this.cellsAt(e, e.pos!) }));
    return validatePlacements(placed, this.cells).length === 0;
  }

  toJSON(): SavedBag {
    return {
      cells: this.cells.map(([x, y]) => [x, y] as Vec),
      entries: this.entries.map((e) => {
        const o: SavedBag["entries"][number] = { item: e.item, rot: e.rot, pos: e.pos ? [e.pos[0], e.pos[1]] : null };
        if (e.mirror) o.mirror = true;
        if (e.charges !== undefined) o.charges = e.charges;
        if (e.fusedFrom) o.fusedFrom = [...e.fusedFrom];
        return o;
      }),
    };
  }

  /** Recharge une sauvegarde : objets inconnus ignorés, places devenues invalides -> réserve. */
  static fromJSON(content: Content, cells: Vec[], data: unknown, maxBag?: [number, number]): Bag {
    const saved = data as SavedBag | null;
    const sc = saved?.cells;
    const okCells =
      Array.isArray(sc) && sc.length >= cells.length && sc.every((c) => Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1]));
    const bag = new Bag(content, okCells ? sc : cells, maxBag);
    const entries = saved?.entries;
    if (!Array.isArray(entries)) return bag;
    for (const s of entries) {
      if (!s || typeof s.item !== "string" || !content.items[s.item]) continue;
      const pos = Array.isArray(s.pos) && s.pos.length === 2 ? ([Number(s.pos[0]), Number(s.pos[1])] as Vec) : null;
      // une extension sauvegardée « posée » serait consommée : on la garde en réserve
      const e = bag.add(s.item, content.items[s.item].extends ? null : pos, Number(s.rot) || 0, s.mirror === true, s.charges);
      if (Array.isArray(s.fusedFrom) && s.fusedFrom.every((x) => typeof x === "string" && content.items[x])) e.fusedFrom = [...s.fusedFrom];
    }
    return bag;
  }
}
