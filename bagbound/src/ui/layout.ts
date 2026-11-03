// Mise en page portrait : arène en haut (~40 %), barre de commandes, sac en
// bas (+ réserve hors combat). Sur PC, la même colonne est centrée.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  W: number;
  H: number;
  col: Rect;
  arena: Rect;
  bar: Rect;
  grid: Rect;
  stash: Rect | null;
  cell: number;
  /** Origine (case 0,0) de la grille du sac. */
  gx: number;
  gy: number;
  stashCell: number;
}

export const BAR_H = 46;

export function computeLayout(W: number, H: number, bagW: number, bagH: number, withStash: boolean): Layout {
  // portrait : une colonne ; paysage (PC) : colonne plus large, arène sur toute la largeur
  const landscape = W > H * 1.1;
  const colW = landscape ? Math.min(W, 760) : Math.min(W, Math.max(340, Math.min(560, Math.round(H * 0.68))));
  const col: Rect = { x: Math.round((W - colW) / 2), y: 0, w: colW, h: H };
  const arenaH = Math.round(H * (withStash && !landscape ? 0.36 : 0.42));
  const arena: Rect = { x: 0, y: 0, w: W, h: arenaH };
  const bar: Rect = { x: col.x, y: arenaH, w: colW, h: BAR_H };
  const top = arenaH + BAR_H + 4;
  const rest = H - top - 6;
  const gridH = withStash ? Math.round(rest * 0.56) : rest;
  const grid: Rect = { x: col.x + 8, y: top, w: colW - 16, h: gridH };
  const cell = Math.max(18, Math.floor(Math.min((grid.w - 8) / bagW, (grid.h - 8) / bagH, 78)));
  const gx = Math.round(grid.x + (grid.w - cell * bagW) / 2);
  const gy = Math.round(grid.y + (grid.h - cell * bagH) / 2);
  let stash: Rect | null = null;
  if (withStash) stash = { x: col.x + 8, y: top + gridH + 4, w: colW - 16, h: H - (top + gridH + 4) - 6 };
  const stashCell = Math.max(16, Math.min(Math.floor(cell * 0.6), 44));
  return { W, H, col, arena, bar, grid, stash, cell, gx, gy, stashCell };
}

export const inRect = (r: Rect | null, x: number, y: number, pad = 0): boolean =>
  !!r && x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad;
