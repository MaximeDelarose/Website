// Modèle du sac du joueur hors combat : placement, rotation, miroir, réserve.
// Pur (aucun DOM) : partagé par l'UI et testé à part.

import { key, transformShape, validatePlacements } from "../engine/geometry";
import type { Content, Placement, Vec } from "../engine/types";

export interface BagEntry {
  uid: string;
  item: string;
  rot: number;
  mirror: boolean;
  /** null = dans la réserve (hors grille). */
  pos: Vec | null;
  charges?: number | null;
}

export interface PlaceCheck {
  ok: boolean;
  cells: Vec[];
  /** Cases hors du sac ou déjà prises. */
  bad: Vec[];
}

export interface SavedBag {
  entries: { item: string; rot: number; mirror?: boolean; pos: Vec | null; charges?: number | null }[];
}

export class Bag {
  readonly cells: Vec[];
  entries: BagEntry[] = [];
  private cellSet: Set<string>;
  private next = 0;

  constructor(
    readonly content: Content,
    cells: Vec[],
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
    const occ = this.occupancy(uid);
    const bad = cells.filter(([x, y]) => !this.hasCell(x, y) || occ.has(key(x, y)));
    return { ok: bad.length === 0, cells, bad };
  }

  /** Pose un objet (avec rotation / miroir éventuels). false si la place n'est pas libre. */
  move(uid: string, pos: Vec, rot?: number, mirror?: boolean): boolean {
    const e = this.get(uid);
    if (!e || !this.check(uid, pos, rot, mirror).ok) return false;
    e.pos = [pos[0], pos[1]];
    if (rot !== undefined) e.rot = ((rot % 4) + 4) % 4;
    if (mirror !== undefined) e.mirror = mirror;
    return true;
  }

  stash(uid: string): void {
    const e = this.get(uid);
    if (e) e.pos = null;
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
      entries: this.entries.map((e) => {
        const o: SavedBag["entries"][number] = { item: e.item, rot: e.rot, pos: e.pos ? [e.pos[0], e.pos[1]] : null };
        if (e.mirror) o.mirror = true;
        if (e.charges !== undefined) o.charges = e.charges;
        return o;
      }),
    };
  }

  /** Recharge une sauvegarde : objets inconnus ignorés, places devenues invalides -> réserve. */
  static fromJSON(content: Content, cells: Vec[], data: unknown): Bag {
    const bag = new Bag(content, cells);
    const entries = (data as SavedBag | null)?.entries;
    if (!Array.isArray(entries)) return bag;
    for (const s of entries) {
      if (!s || typeof s.item !== "string" || !content.items[s.item]) continue;
      const pos = Array.isArray(s.pos) && s.pos.length === 2 ? ([Number(s.pos[0]), Number(s.pos[1])] as Vec) : null;
      bag.add(s.item, pos, Number(s.rot) || 0, s.mirror === true, s.charges);
    }
    return bag;
  }
}
