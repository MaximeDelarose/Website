/**
 * Géométrie logique d'une pièce du château (px « monde », indépendants de l'écran) :
 * taille du décor, grille du sol, mur (pour les objets muraux), zone de la fenêtre.
 * La caméra (zoom / déplacement) transforme ensuite ces coordonnées en pixels d'écran.
 * Pur : aucune dépendance au DOM.
 */
import { ROOMS } from '../../../../data/world/rooms';
import type { RoomId } from '../../../../data/world/ids';
import { roomLayout, type Rect } from '../../../../game/art/world/rooms';

export interface RoomGeo {
  room: RoomId;
  cols: number;
  rows: number;
  /** Taille du décor en px monde. */
  W: number;
  H: number;
  /** Côté d'une case (px monde). */
  cell: number;
  /** Grille du sol (px monde). */
  grid: Rect;
  floorTop: number;
  /** Hauteur utile du mur en cases (de 0 en haut jusqu'à la plinthe). */
  wallRows: number;
  /** Fenêtre + rideaux (cases, repère du mur) : zone interdite aux objets muraux. Null : pas de fenêtre (jardin). */
  block: Rect | null;
  /** Fenêtre (px monde) ou null. */
  win: Rect | null;
  hasWall: boolean;
}

const BASE_CELL = 60;
const cache = new Map<RoomId, RoomGeo>();

export function roomSize(room: RoomId): { W: number; H: number } {
  const g = ROOMS[room];
  const W = Math.round((g.cols * BASE_CELL) / 0.94);
  // mur haut (~5 cases) : la pièce est en portrait, comme l'écran
  const H = Math.round((g.rows * BASE_CELL + 320 + BASE_CELL * 0.85) / 0.975);
  return { W, H };
}

export function geo(room: RoomId): RoomGeo {
  const hit = cache.get(room);
  if (hit) return hit;
  const g = ROOMS[room];
  const { W, H } = roomSize(room);
  const L = roomLayout(room, W, H);
  const cell = L.cell;
  const garden = room === 'garden';
  let block: Rect | null = null;
  if (!garden) {
    const x0 = Math.min(L.curtainL.x, L.valance.x);
    const x1 = Math.max(L.curtainR.x + L.curtainR.w, L.valance.x + L.valance.w);
    const y0 = L.valance.y;
    const y1 = L.win.y + L.win.h + 16;
    block = { x: (x0 - L.grid.x) / cell - 0.08, y: y0 / cell - 0.05, w: (x1 - x0) / cell + 0.16, h: (y1 - y0) / cell + 0.05 };
  }
  const geoV: RoomGeo = {
    room, cols: g.cols, rows: g.rows, W, H, cell, grid: L.grid, floorTop: L.floorTop,
    wallRows: Math.max(1.5, (L.floorTop - 10) / cell), block, win: garden ? null : L.win, hasWall: !garden,
  };
  cache.set(room, geoV);
  return geoV;
}

/** Cases (repère du sol) → px monde. */
export const floorPx = (G: RoomGeo, cx: number, cy: number): { x: number; y: number } => ({ x: G.grid.x + cx * G.cell, y: G.grid.y + cy * G.cell });
/** px monde → cases (repère du sol). */
export const pxToFloor = (G: RoomGeo, x: number, y: number): { x: number; y: number } => ({ x: (x - G.grid.x) / G.cell, y: (y - G.grid.y) / G.cell });
/** Cases (repère du mur) → px monde. */
export const wallPx = (G: RoomGeo, cx: number, cy: number): { x: number; y: number } => ({ x: G.grid.x + cx * G.cell, y: cy * G.cell });
export const pxToWall = (G: RoomGeo, x: number, y: number): { x: number; y: number } => ({ x: (x - G.grid.x) / G.cell, y: y / G.cell });
