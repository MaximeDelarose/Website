/**
 * Boîtes d'affichage et de toucher des meubles dans le repère « px monde » (pur) :
 * où dessiner le sprite, quelle est l'empreinte au sol, quelle zone capte le doigt.
 */
import type { PlacedItem } from '../../../../save/schema';
import { furnitureOf } from '../../../../data/world/furniture';
import { layerOf, rectOfItem, type Layer } from './placement';
import type { RoomGeo } from './geometry';

export interface Box { x: number; y: number; w: number; h: number }

export interface ItemBox {
  layer: Layer;
  /** Boîte du sprite (px monde). */
  sprite: Box;
  /** Empreinte au sol (sol, tapis, surface : sur le plateau), ou zone murale / plafond. */
  foot: Box;
}

/** Taille d'un petit objet posé (par rapport à la case) : un peu plus petit que sur le sol. */
export const SURFACE_SCALE = 0.9;

export function itemBox(G: RoomGeo, it: PlacedItem, all: readonly PlacedItem[]): ItemBox | null {
  const def = furnitureOf(it.id);
  const r = rectOfItem(it);
  if (!def || !r) return null;
  const layer = layerOf(def, it.on);
  const c = G.cell;
  if (layer === 'floor' || layer === 'rug') {
    const b = { x: G.grid.x + r.x * c, y: G.grid.y + r.y * c, w: r.w * c, h: r.h * c };
    return { layer, sprite: b, foot: b };
  }
  if (layer === 'surface') {
    const host = all.find((o) => o.uid === it.on);
    const hd = host && furnitureOf(host.id);
    const lift = (hd?.host?.lift ?? 0.5) * c;
    const sw = def.w * c * SURFACE_SCALE; const sh = def.h * c * SURFACE_SCALE;
    const cx = G.grid.x + (r.x + r.w / 2) * c;
    const bottom = G.grid.y + (r.y + r.h) * c - lift;
    return { layer, sprite: { x: cx - sw / 2, y: bottom - sh, w: sw, h: sh }, foot: { x: G.grid.x + r.x * c, y: G.grid.y + r.y * c - lift, w: r.w * c, h: r.h * c } };
  }
  if (layer === 'wall') {
    const b = { x: G.grid.x + r.x * c, y: r.y * c, w: r.w * c, h: r.h * c };
    return { layer, sprite: b, foot: b };
  }
  if (layer === 'ceiling') {
    const b = { x: G.grid.x + r.x * c, y: 0, w: r.w * c, h: r.h * c };
    // flaque de lumière au sol sous le luminaire
    const dy = it.y;
    const foot = { x: b.x, y: G.grid.y + dy * c, w: b.w, h: c };
    return { layer, sprite: b, foot };
  }
  // fenêtre : zone de la fenêtre et de ses rideaux
  const win = G.win ?? { x: 0, y: 0, w: 0, h: 0 };
  const b = G.block ? { x: G.grid.x + G.block.x * c, y: G.block.y * c, w: G.block.w * c, h: G.block.h * c } : win;
  return { layer, sprite: b, foot: b };
}

/** Zone de toucher : au moins `minPx` px d'écran (à l'échelle `scale`), centrée sur la boîte du sprite. */
export function hitBox(b: Box, scale: number, minPx = 46): Box {
  const mw = Math.max(b.w, minPx / scale); const mh = Math.max(b.h, minPx / scale);
  return { x: b.x - (mw - b.w) / 2, y: b.y - (mh - b.h) / 2, w: mw, h: mh };
}
export const inBox = (b: Box, x: number, y: number): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
