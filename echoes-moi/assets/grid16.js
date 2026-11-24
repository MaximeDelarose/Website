// Echoes of Aether (Max version) — tout le jeu sur la grille de cases (32 unités).
//
// Le jeu reste en temps réel, mais tout se joue case par case :
//  - déplacements : héros, monstres, invocations avancent d'une case à la fois, en 4 directions
//    (moteur `gridMotor` : il transforme la vitesse voulue par l'IA ou la manette en pas d'une case) ;
//  - attaques : les tirs partent dans l'une des 8 directions, les zones couvrent des carrés de cases ;
//  - alertes ennemies : dessinées en cases rouges (cercle, ligne, rectangle, éventail).
// Pour revenir au déplacement libre (comparaison) : localStorage.setItem('eoam_perf_off', 'grid').

export const CELL = 32;
const H = CELL / 2;

export const gridOn = () => {
  try {
    return !(localStorage.getItem('eoam_perf_off') || '').split(',').includes('grid');
  } catch {
    return true;
  }
};

export const cellOf = (v) => Math.floor(v / CELL);
export const mid = (c) => c * CELL + H;
export const snapPt = (x, y) => ({ x: mid(cellOf(x)), y: mid(cellOf(y)) });
export const snap8 = (a) => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
export const snap4 = (a) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
/** Rayon (en cases) d'une zone dont le rayon était donné en unités. */
export const cellRadius = (r) => Math.max(1, Math.round(r / 40));

/**
 * Un pas du moteur de cases. `st` garde l'état de l'acteur ({tx, ty, sp}) ; (vx, vy) est la vitesse
 * voulue ce tour-ci ; `free(c, r, dx, dy)` dit si la case voisine est libre.
 * Rend { vx, vy } à appliquer, et éventuellement { snapX, snapY } (arrivé au centre d'une case)
 * et `blocked` (la case visée est occupée).
 */
export function gridMotor(st, x, y, vx, vy, dt, free) {
  const spd = Math.hypot(vx, vy);
  const out = { vx: 0, vy: 0 };
  if (st.tx != null) {
    // un pas est en cours : on le termine, même si l'acteur ne veut plus bouger.
    // Si quelqu'un a pris la case visée entre-temps, on revient sur la case de départ.
    if (st.ox != null && !free(cellOf(st.tx), cellOf(st.ty), 0, 0) && free(cellOf(st.ox), cellOf(st.oy), 0, 0))
      [st.tx, st.ty, st.ox, st.oy] = [st.ox, st.oy, null, null];
    const s = Math.max(spd, st.sp || 0, 60);
    const dx = st.tx - x,
      dy = st.ty - y,
      d = Math.hypot(dx, dy);
    if (d > s * dt + 0.25) {
      out.vx = (dx / d) * s;
      out.vy = (dy / d) * s;
      return out;
    }
    out.snapX = x = st.tx;
    out.snapY = y = st.ty;
    st.tx = st.ty = st.ox = st.oy = null;
    if (spd < 8) return out;
  }
  if (spd < 8) {
    // à l'arrêt : on se recentre doucement sur sa case
    const cx = mid(cellOf(x)),
      cy = mid(cellOf(y)),
      d = Math.hypot(cx - x, cy - y);
    if (d < 0.25) return out;
    if (d <= 120 * dt) {
      out.snapX = cx;
      out.snapY = cy;
      return out;
    }
    out.vx = ((cx - x) / d) * 120;
    out.vy = ((cy - y) / d) * 120;
    return out;
  }
  const c0 = cellOf(x),
    r0 = cellOf(y),
    hx = Math.abs(vx) >= Math.abs(vy);
  const dirs = hx
    ? [
        [Math.sign(vx), 0],
        [0, Math.sign(vy)],
      ]
    : [
        [0, Math.sign(vy)],
        [Math.sign(vx), 0],
      ];
  for (let i = 0; i < 2; i++) {
    const [dx, dy] = dirs[i];
    if (!dx && !dy) continue;
    // 2e direction seulement si la manette / l'IA la demande vraiment
    if (i === 1 && Math.abs(dx ? vx : vy) < spd * 0.35) continue;
    if (!free(c0 + dx, r0 + dy, dx, dy)) {
      if (i === 0) out.blocked = [dx, dy];
      continue;
    }
    st.tx = mid(c0 + dx);
    st.ty = mid(r0 + dy);
    st.ox = mid(c0);
    st.oy = mid(r0);
    st.sp = spd;
    const ddx = st.tx - x,
      ddy = st.ty - y,
      d = Math.hypot(ddx, ddy) || 1;
    out.vx = (ddx / d) * spd;
    out.vy = (ddy / d) * spd;
    out.blocked = null;
    return out;
  }
  return out;
}

/** L'acteur occupe-t-il (ou va-t-il occuper) la case (c, r) ? */
export const onCell = (a, c, r) =>
  (cellOf(a.x) === c && cellOf(a.y) === r) || (a.__g?.tx != null && cellOf(a.__g.tx) === c && cellOf(a.__g.ty) === r);

// --- formes en cases (centres de cases dans la forme) ---
function cellsBox(x0, y0, x1, y1, test) {
  const out = [];
  for (let r = cellOf(Math.min(y0, y1)); r <= cellOf(Math.max(y0, y1)); r++)
    for (let c = cellOf(Math.min(x0, x1)); c <= cellOf(Math.max(x0, x1)); c++) test(mid(c), mid(r)) && out.push([c, r]);
  return out;
}
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax,
    dy = by - ay,
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
export const cellsCircle = (x, y, r) => cellsBox(x - r - 8, y - r - 8, x + r + 8, y + r + 8, (cx, cy) => Math.hypot(cx - x, cy - y) < r + 8);
export const cellsSquare = (x, y, R) => {
  const c = cellOf(x),
    r = cellOf(y),
    out = [];
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) out.push([c + i, r + j]);
  return out;
};
export const cellsSegment = (x0, y0, x1, y1, w = 12) =>
  cellsBox(x0 - w, y0 - w, x1 + w, y1 + w, (cx, cy) => segDist(cx, cy, x0, y0, x1, y1) <= w + 0.5);
export const cellsRect = (x, y, ang, len, w) =>
  cellsSegment(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, Math.max(12, w / 2));

/** Dessine des cases (alertes, zones) dans un Graphics. */
export function drawCells(g, cells, color, alpha, lineAlpha = alpha * 2.5) {
  for (const [c, r] of cells) {
    g.fillStyle(color, alpha).fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    lineAlpha > 0 && g.lineStyle(1.5, color, Math.min(1, lineAlpha)).strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
  }
}
