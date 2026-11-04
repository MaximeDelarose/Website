/**
 * Logique PURE du placement des meubles (aucun DOM, aucun canvas) :
 * emprise et orientation, plans de pose (sol, mur, plafond, fenêtre, tapis, surface),
 * validation / collisions, aimantation sur une grille fine (demi-cases), ordre d'affichage.
 *
 * Repères (en cases, 1 case ≈ 60 px monde) :
 *  - sol / tapis / surface : x vers la droite, y vers le spectateur (profondeur), origine = coin arrière gauche de la grille ;
 *  - mur : x le long du mur du fond, y vers le bas depuis le plafond ;
 *  - plafond : x seulement (y = profondeur automatique, utilisée pour la flaque de lumière) ;
 *  - fenêtre : une seule fenêtre par pièce, x = 0.
 */
import type { PlacedItem } from '../../../../save/schema';
import type { RoomId } from '../../../../data/world/ids';
import { furnitureOf, type FurnitureDef, type Place } from '../../../../data/world/furniture';
import { geo, type RoomGeo } from './geometry';

export const STEP = 0.5;
const EPS = 1e-6;
/** Distance max (cases) à laquelle un bord s'aimante sur un voisin ou un mur. */
export const MAGNET = 0.3;
/** Emprise d'un petit objet posé sur un support (cases). */
export const SURFACE_OCC = 0.8;
/** Marge haute du mur (cases) : on ne colle pas un tableau sur la corniche. */
export const WALL_TOP = 0.3;

export type Rot = 0 | 1 | 2 | 3;
export type Layer = Place;
export interface Candidate { id: string; x: number; y: number; rot: number; on?: number }
export interface Check { ok: boolean; reason: string }
export interface Rect { x: number; y: number; w: number; h: number }
const OK: Check = { ok: true, reason: '' };
const no = (reason: string): Check => ({ ok: false, reason });

export const snap = (v: number, step = STEP): number => Math.round(v / step) * step;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** Évite les 0.30000000000000004 dans la sauvegarde. */
export const clean = (v: number): number => Math.round(v * 1000) / 1000;

// ------------------------------------------------------------------ orientation

export function allowedRots(def: FurnitureDef): Rot[] {
  return def.orient === 'full' ? [0, 1, 2, 3] : def.orient === 'turn' ? [0, 1] : [0];
}
export function normRot(def: FurnitureDef, rot: number | undefined): Rot {
  const r = ((Math.round(rot ?? 0) % 4) + 4) % 4;
  return (allowedRots(def).includes(r as Rot) ? r : 0) as Rot;
}
/** Emprise au sol (cases) selon l'orientation : un meuble 3×2 tourné d'un quart de tour devient 2×3. */
export function footprint(def: FurnitureDef, rot: number | undefined): { w: number; d: number } {
  const r = normRot(def, rot);
  return r % 2 === 1 ? { w: def.h, d: def.w } : { w: def.w, d: def.h };
}
/** Prochaine orientation. Les objets symétriques (« mirror ») ne changent pas d'orientation : on les retourne (flip) côté interface. */
export function nextRot(def: FurnitureDef, rot: number | undefined): Rot {
  const list = allowedRots(def);
  const i = list.indexOf(normRot(def, rot));
  return list[(i + 1) % list.length];
}
export const canRotate = (def: FurnitureDef): boolean => def.orient !== 'none' && def.place !== 'wall' && def.place !== 'ceiling' && def.place !== 'window';

// ------------------------------------------------------------------ plans et rectangles

/** Plan sur lequel se trouve réellement un objet posé. */
export function layerOf(def: FurnitureDef, onUid: number | undefined): Layer {
  if (def.place === 'surface') return onUid !== undefined ? 'surface' : 'floor';
  return def.place;
}
const itemLayer = (it: PlacedItem): Layer | null => { const d = furnitureOf(it.id); return d ? layerOf(d, it.on) : null; };

/** Rectangle (cases) d'un objet dans son propre plan. */
export function rectOfCand(def: FurnitureDef, c: Candidate): Rect {
  const layer = layerOf(def, c.on);
  if (layer === 'surface') return { x: c.x, y: c.y, w: SURFACE_OCC, h: SURFACE_OCC };
  if (layer === 'wall') { const d = def.dims ?? { w: def.w, h: def.h }; return { x: c.x, y: c.y, w: d.w, h: d.h }; }
  if (layer === 'ceiling') { const d = def.dims ?? { w: def.w, h: def.h }; return { x: c.x, y: 0, w: d.w, h: d.h }; }
  if (layer === 'window') return { x: 0, y: 0, w: 1, h: 1 };
  const f = footprint(def, c.rot);
  return { x: c.x, y: c.y, w: f.w, h: f.d };
}
const candOf = (it: PlacedItem): Candidate => ({ id: it.id, x: it.x, y: it.y, rot: it.rot ?? 0, on: it.on });
export function rectOfItem(it: PlacedItem): Rect | null { const d = furnitureOf(it.id); return d ? rectOfCand(d, candOf(it)) : null; }

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
const inside = (inner: Rect, outer: Rect): boolean => inner.x >= outer.x - EPS && inner.y >= outer.y - EPS && inner.x + inner.w <= outer.x + outer.w + EPS && inner.y + inner.h <= outer.y + outer.h + EPS;

/** Espace de pose accepté pour un plan donné (bornes du sol, du mur, du plafond). */
export function bounds(G: RoomGeo, def: FurnitureDef, c: Candidate): { x0: number; x1: number; y0: number; y1: number } {
  const r = rectOfCand(def, c);
  const layer = layerOf(def, c.on);
  if (layer === 'wall') return { x0: 0, x1: G.cols - r.w, y0: WALL_TOP, y1: Math.floor((G.wallRows - r.h) / STEP + EPS) * STEP };
  if (layer === 'ceiling') { const dy = ceilingDepth(G, def); return { x0: 0, x1: G.cols - r.w, y0: dy, y1: dy }; }
  if (layer === 'window') return { x0: 0, x1: 0, y0: 0, y1: 0 };
  return { x0: 0, x1: G.cols - r.w, y0: 0, y1: G.rows - r.h };
}
/** Profondeur (cases) d'un objet de plafond : centre de la pièce (sert à la flaque de lumière et au tri). */
export const ceilingDepth = (G: RoomGeo, _def?: FurnitureDef): number => snap(Math.max(0, G.rows / 2 - 0.5), STEP);

// ------------------------------------------------------------------ validation

/** L'objet peut-il se trouver à cette position ? `ignore` : uids ignorés (le meuble déplacé et ses objets posés dessus). */
export function validate(room: RoomId, items: readonly PlacedItem[], c: Candidate, ignore: readonly number[] = []): Check {
  const def = furnitureOf(c.id);
  if (!def) return no('Meuble inconnu');
  if (!def.rooms.includes(room)) return no('Ce meuble ne va pas dans cette pièce');
  if (![c.x, c.y].every(Number.isFinite)) return no('Position invalide');
  const G = geo(room);
  const layer = layerOf(def, c.on);
  if (def.place === 'surface' && c.on === undefined && !def.also.includes('floor')) return no('Pose-le sur un meuble');
  const others = items.filter((o) => !ignore.includes(o.uid));
  const r = rectOfCand(def, c);

  if (layer === 'floor' || layer === 'rug') {
    if (r.x < -EPS || r.y < -EPS || r.x + r.w > G.cols + EPS || r.y + r.h > G.rows + EPS) return no('Hors de la pièce');
    for (const o of others) {
      const ol = itemLayer(o);
      if (ol !== layer) continue; // un tapis passe sous les meubles ; un meuble n'est pas gêné par un tapis
      const orc = rectOfItem(o);
      if (orc && overlaps(r, orc)) return no(layer === 'rug' ? 'Un autre tapis est déjà là' : 'La place est déjà prise');
    }
    return OK;
  }
  if (layer === 'surface') {
    const host = others.find((o) => o.uid === c.on);
    const hd = host && furnitureOf(host.id);
    if (!host || !hd || !hd.host) return no('Il faut un support');
    if (!def.onKinds.includes(hd.host.kind)) return no(`Ça ne se pose pas sur ${hd.name.toLowerCase()}`);
    const hr = rectOfItem(host)!;
    if (!inside(r, hr)) return no('Trop près du bord');
    for (const o of others) {
      if (o.on !== c.on) continue;
      const orc = rectOfItem(o);
      if (orc && overlaps(r, orc)) return no('Déjà occupé');
    }
    return OK;
  }
  if (layer === 'wall') {
    if (!G.hasWall) return no('Pas de mur ici');
    const b = bounds(G, def, c);
    if (r.x < b.x0 - EPS || r.x > b.x1 + EPS || r.y < b.y0 - EPS || r.y > b.y1 + EPS) return no('Hors du mur');
    if (G.block && overlaps(r, G.block)) return no('La fenêtre est là');
    for (const o of others) {
      if (itemLayer(o) !== 'wall') continue;
      const orc = rectOfItem(o);
      if (orc && overlaps(r, orc)) return no('Le mur est déjà occupé ici');
    }
    return OK;
  }
  if (layer === 'ceiling') {
    if (!G.hasWall) return no('Pas de plafond ici');
    if (r.x < -EPS || r.x + r.w > G.cols + EPS) return no('Hors du plafond');
    if (Math.abs(c.y - ceilingDepth(G, def)) > EPS) return no('Un luminaire de plafond s\'accroche au plafond');
    for (const o of others) {
      if (itemLayer(o) !== 'ceiling') continue;
      const orc = rectOfItem(o);
      if (orc && r.x < orc.x + orc.w - EPS && orc.x < r.x + r.w - EPS) return no('Déjà un luminaire ici');
    }
    return OK;
  }
  // fenêtre
  if (!G.hasWall) return no('Pas de fenêtre ici');
  for (const o of others) {
    const od = furnitureOf(o.id);
    if (od && itemLayer(o) === 'window' && od.layer === def.layer) return no('Cette fenêtre en porte déjà un');
  }
  return OK;
}

// ------------------------------------------------------------------ cible de pose (glisser)

export interface Target { cand: Candidate; check: Check; host: PlacedItem | null }

/** Rectangle du plateau d'un support dans le repère « px monde » (le plateau est soulevé de `lift` cases). */
export function hostTopPx(G: RoomGeo, host: PlacedItem): { x: number; y: number; w: number; h: number } | null {
  const d = furnitureOf(host.id);
  const r = rectOfItem(host);
  if (!d || !d.host || !r) return null;
  return { x: G.grid.x + r.x * G.cell, y: G.grid.y + r.y * G.cell - d.host.lift * G.cell, w: r.w * G.cell, h: r.h * G.cell };
}

/**
 * Traduit la position du doigt (px monde) en position valide la plus naturelle selon la catégorie de l'objet :
 * sol (grille fine + aimantation), mur (collé au mur, hauteur libre), plafond (collé au plafond, jamais au sol),
 * fenêtre (toujours sur la fenêtre), surface (sur le support sous le doigt, sinon sol si permis).
 * `offset` : écart (px monde) entre le doigt et le centre de l'objet à la prise.
 */
export function resolveTarget(room: RoomId, items: readonly PlacedItem[], id: string, rot: number, p: { x: number; y: number }, ignore: readonly number[] = [], offset = { x: 0, y: 0 }): Target {
  const def = furnitureOf(id)!;
  const G = geo(room);
  const others = items.filter((o) => !ignore.includes(o.uid));
  const cx = p.x - offset.x; const cy = p.y - offset.y;
  const layer0 = def.place;

  const finish = (cand: Candidate, host: PlacedItem | null = null): Target => ({ cand, check: validate(room, items, cand, ignore), host });

  if (layer0 === 'surface') {
    // support sous le doigt : le plus proche du spectateur
    let best: PlacedItem | null = null; let bestDepth = -1;
    for (const o of others) {
      const od = furnitureOf(o.id);
      if (!od?.host || !def.onKinds.includes(od.host.kind) || o.on !== undefined) continue;
      const t = hostTopPx(G, o);
      if (!t) continue;
      const pad = G.cell * 0.25;
      if (p.x >= t.x - pad && p.x <= t.x + t.w + pad && p.y >= t.y - pad && p.y <= t.y + t.h + pad) {
        const depth = (rectOfItem(o)?.y ?? 0) + (rectOfItem(o)?.h ?? 0);
        if (depth > bestDepth) { best = o; bestDepth = depth; }
      }
    }
    if (best) {
      const t = hostTopPx(G, best)!;
      const hr = rectOfItem(best)!;
      const lx = (cx - t.x) / G.cell - SURFACE_OCC / 2;
      const ly = (cy - t.y) / G.cell - SURFACE_OCC / 2;
      const x = clamp(snap(hr.x + lx), hr.x, hr.x + hr.w - SURFACE_OCC);
      const y = clamp(snap(hr.y + ly), hr.y, hr.y + hr.h - SURFACE_OCC);
      return finish({ id, x: clean(x), y: clean(y), rot: 0, on: best.uid }, best);
    }
    if (!def.also.includes('floor')) {
      const f = { x: (cx - G.grid.x) / G.cell, y: (cy - G.grid.y) / G.cell };
      return { cand: { id, x: clean(snap(f.x)), y: clean(snap(f.y)), rot: 0 }, check: no('Pose-le sur un meuble'), host: null };
    }
  }

  if (layer0 === 'wall') {
    const r = rectOfCand(def, { id, x: 0, y: 0, rot: 0 });
    const b = bounds(G, def, { id, x: 0, y: 0, rot: 0 });
    let x = snap((cx - G.grid.x) / G.cell - r.w / 2);
    let y = snap(cy / G.cell - r.h / 2);
    x = clamp(x, b.x0, b.x1); y = clamp(y, b.y0, Math.max(b.y0, b.y1));
    // aimantation sur les bords des autres objets muraux et de la fenêtre
    const edgesX: number[] = []; const edgesY: number[] = [];
    for (const o of others) { if (itemLayer(o) !== 'wall') continue; const orc = rectOfItem(o)!; edgesX.push(orc.x - r.w, orc.x + orc.w, orc.x); edgesY.push(orc.y, orc.y + orc.h, orc.y + orc.h - r.h); }
    if (G.block) { edgesX.push(G.block.x - r.w, G.block.x + G.block.w); edgesY.push(G.block.y - r.h); }
    x = magnet(x, edgesX, b.x0, b.x1); y = magnet(y, edgesY, b.y0, Math.max(b.y0, b.y1));
    return finish({ id, x: clean(x), y: clean(y), rot: 0 });
  }

  if (layer0 === 'ceiling') {
    const r = rectOfCand(def, { id, x: 0, y: 0, rot: 0 });
    const x = clamp(snap((cx - G.grid.x) / G.cell - r.w / 2), 0, G.cols - r.w);
    return finish({ id, x: clean(x), y: ceilingDepth(G, def), rot: 0 });
  }

  if (layer0 === 'window') return finish({ id, x: 0, y: 0, rot: 0 });

  // sol / tapis (et petits objets posés au sol)
  const f = footprint(def, rot);
  let x = snap((cx - G.grid.x) / G.cell - f.w / 2);
  let y = snap((cy - G.grid.y) / G.cell - f.d / 2);
  x = clamp(x, 0, G.cols - f.w); y = clamp(y, 0, G.rows - f.d);
  const same = layerOf(def, undefined);
  const edgesX: number[] = [0, G.cols - f.w]; const edgesY: number[] = [0, G.rows - f.d];
  for (const o of others) {
    if (itemLayer(o) !== same) continue;
    const orc = rectOfItem(o)!;
    // un voisin n'attire que s'il est à portée de l'autre axe
    if (Math.abs((orc.y + orc.h / 2) - (y + f.d / 2)) < (orc.h + f.d) / 2 + MAGNET) edgesX.push(orc.x - f.w, orc.x + orc.w, orc.x, orc.x + orc.w - f.w);
    if (Math.abs((orc.x + orc.w / 2) - (x + f.w / 2)) < (orc.w + f.w) / 2 + MAGNET) edgesY.push(orc.y - f.d, orc.y + orc.h, orc.y, orc.y + orc.h - f.d);
  }
  x = clamp(magnet(x, edgesX, 0, G.cols - f.w), 0, G.cols - f.w); y = clamp(magnet(y, edgesY, 0, G.rows - f.d), 0, G.rows - f.d);
  return finish({ id, x: clean(x), y: clean(y), rot: normRot(def, rot) });
}

function magnet(v: number, edges: number[], lo: number, hi: number): number {
  let best = v; let bd = MAGNET + EPS;
  for (const e of edges) {
    if (e < lo - EPS || e > hi + EPS) continue;
    const d = Math.abs(e - v);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ------------------------------------------------------------------ recherche de place

/** Position valide la plus proche (balayage en demi-cases), ou null. */
export function nearestValid(room: RoomId, items: readonly PlacedItem[], c: Candidate, ignore: readonly number[] = [], radius = 2): Candidate | null {
  const def = furnitureOf(c.id);
  if (!def) return null;
  if (validate(room, items, c, ignore).ok) return c;
  const layer = layerOf(def, c.on);
  if (layer === 'window') return null;
  const G = geo(room);
  const b = bounds(G, def, c);
  const cands: { x: number; y: number; d: number }[] = [];
  const n = Math.round(radius / STEP);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    if (layer === 'ceiling' && j !== 0) continue;
    const x = snap(c.x) + i * STEP; const y = snap(c.y) + j * STEP;
    if (x < b.x0 - EPS || x > b.x1 + EPS || y < b.y0 - EPS || y > b.y1 + EPS) continue;
    cands.push({ x, y, d: Math.hypot(i, j) });
  }
  cands.sort((a, z) => a.d - z.d);
  for (const k of cands) { const t = { ...c, x: clean(k.x), y: clean(k.y) }; if (validate(room, items, t, ignore).ok) return t; }
  return null;
}

/** Premier emplacement libre pour poser un objet depuis la réserve (centre d'abord). Null s'il n'y a plus de place. */
export function defaultSpot(room: RoomId, items: readonly PlacedItem[], id: string, rot = 0, ignore: readonly number[] = []): Candidate | null {
  const def = furnitureOf(id);
  if (!def || !def.rooms.includes(room)) return null;
  const G = geo(room);
  const r0 = normRot(def, rot);
  const mid = (c: Candidate) => nearestValid(room, items, c, ignore, 12);
  if (def.place === 'surface') {
    // support libre le plus proche du centre
    const hosts = items.filter((o) => { const od = furnitureOf(o.id); return !!od?.host && def.onKinds.includes(od.host.kind) && o.on === undefined && !ignore.includes(o.uid); });
    const sorted = hosts.sort((a, b) => Math.hypot((a.x - G.cols / 2), (a.y - G.rows / 2)) - Math.hypot((b.x - G.cols / 2), (b.y - G.rows / 2)));
    for (const hst of sorted) {
      const hr = rectOfItem(hst)!;
      for (let y = hr.y; y + SURFACE_OCC <= hr.y + hr.h + EPS; y += STEP) for (let x = hr.x; x + SURFACE_OCC <= hr.x + hr.w + EPS; x += STEP) {
        const c: Candidate = { id, x: clean(x), y: clean(y), rot: 0, on: hst.uid };
        if (validate(room, items, c, ignore).ok) return c;
      }
    }
    if (!def.also.includes('floor')) return null;
    return mid({ id, x: snap(G.cols / 2 - 0.5), y: snap(G.rows / 2 - 0.5), rot: 0 });
  }
  if (def.place === 'wall') {
    const r = rectOfCand(def, { id, x: 0, y: 0, rot: 0 });
    return mid({ id, x: snap(G.cols / 2 - r.w / 2), y: snap(Math.min(G.wallRows * 0.45, G.wallRows - r.h)), rot: 0 });
  }
  if (def.place === 'ceiling') {
    const r = rectOfCand(def, { id, x: 0, y: 0, rot: 0 });
    return mid({ id, x: snap(G.cols / 2 - r.w / 2), y: ceilingDepth(G, def), rot: 0 });
  }
  if (def.place === 'window') { const c: Candidate = { id, x: 0, y: 0, rot: 0 }; return validate(room, items, c, ignore).ok ? c : null; }
  const f = footprint(def, r0);
  return mid({ id, x: snap(G.cols / 2 - f.w / 2), y: snap(G.rows / 2 - f.d / 2), rot: r0 });
}

// ------------------------------------------------------------------ rotation

/**
 * Tourne un meuble posé : nouvelle orientation, emprise recalculée autour du même centre,
 * décalée au besoin vers la place libre la plus proche. Null : pas de place pour tourner.
 */
export function rotated(room: RoomId, items: readonly PlacedItem[], uid: number): Candidate | null {
  const it = items.find((o) => o.uid === uid);
  const def = it && furnitureOf(it.id);
  if (!it || !def || !canRotate(def)) return null;
  const old = footprint(def, it.rot);
  const rot = nextRot(def, it.rot);
  const fp = footprint(def, rot);
  const G = geo(room);
  const kids = items.filter((o) => o.on === uid).map((o) => o.uid);
  const c: Candidate = {
    id: it.id, rot,
    x: clean(clamp(snap(it.x + (old.w - fp.w) / 2), 0, G.cols - fp.w)),
    y: clean(clamp(snap(it.y + (old.d - fp.d) / 2), 0, G.rows - fp.d)),
    on: it.on,
  };
  if (it.on !== undefined) return c; // objet posé : seul le support compte, pas de rotation
  return nearestValid(room, items, c, [uid, ...kids], 2);
}

/** Replace les objets posés sur un support dans son emprise (après rotation ou déplacement). */
export function reseat(room: RoomId, items: PlacedItem[], hostUid: number): void {
  const host = items.find((o) => o.uid === hostUid);
  const hr = host && rectOfItem(host);
  if (!host || !hr) return;
  for (const k of items.filter((o) => o.on === hostUid)) {
    k.x = clean(clamp(snap(k.x), hr.x, Math.max(hr.x, hr.x + hr.w - SURFACE_OCC)));
    k.y = clean(clamp(snap(k.y), hr.y, Math.max(hr.y, hr.y + hr.h - SURFACE_OCC)));
  }
  // deux objets ne se superposent pas : on les écarte sur le plateau, sinon ils redescendent en réserve (renvoyés par l'appelant)
  void room;
}

// ------------------------------------------------------------------ ordre d'affichage

const RANK: Record<Layer, number> = { rug: 0, window: 1, wall: 2, floor: 3, surface: 3, ceiling: 4 };

/** Clé de profondeur : plus elle est grande, plus l'objet est proche du spectateur. */
function depthKey(it: PlacedItem, items: readonly PlacedItem[]): number {
  const r = rectOfItem(it);
  if (!r) return 0;
  const layer = itemLayer(it);
  if (layer === 'surface') {
    const host = items.find((o) => o.uid === it.on);
    const hr = host && rectOfItem(host);
    return (hr ? hr.y + hr.h : r.y + r.h) + 0.01 + (r.y - (hr?.y ?? 0)) * 0.001 + r.x * 0.00001;
  }
  if (layer === 'floor') return r.y + r.h + r.x * 0.00001;
  return r.y + r.h;
}

/** Objets dans l'ordre où il faut les dessiner (tapis, mur, meubles du fond vers l'avant, puis plafond). */
export function drawOrder(items: readonly PlacedItem[]): PlacedItem[] {
  const k = (it: PlacedItem) => ({ it, rank: RANK[itemLayer(it) ?? 'floor'], d: depthKey(it, items) });
  return items.map(k).sort((a, b) => a.rank - b.rank || a.d - b.d || a.it.uid - b.it.uid).map((v) => v.it);
}
