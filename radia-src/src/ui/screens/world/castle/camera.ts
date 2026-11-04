/**
 * Caméra de la pièce (pur, sans DOM) : écran = monde × s + (x, y).
 * Zoom à deux doigts, déplacement, « Vue globale » (la pièce entière), « Recentrer », limites pour ne jamais perdre la pièce.
 */
export interface Cam { s: number; x: number; y: number }
export interface Size { w: number; h: number }
export interface Limits { min: number; max: number }

/** Marge (px écran) tolérée au-delà du bord de la pièce quand elle déborde de la vue. */
export const EDGE = 28;
export const MAX_ABS = 3.4;

export const toWorld = (c: Cam, sx: number, sy: number): { x: number; y: number } => ({ x: (sx - c.x) / c.s, y: (sy - c.y) / c.s });
export const toScreen = (c: Cam, wx: number, wy: number): { x: number; y: number } => ({ x: wx * c.s + c.x, y: wy * c.s + c.y });

/** « Vue globale » : toute la pièce visible, la plus grande possible ; légèrement remontée si la vue est plus haute que la pièce. */
export function fitCam(view: Size, world: Size, pad = 4): Cam {
  const s = Math.max(0.05, Math.min((view.w - pad * 2) / world.w, (view.h - pad * 2) / world.h));
  const slack = Math.max(0, view.h - world.h * s);
  return { s, x: (view.w - world.w * s) / 2, y: slack * 0.3 };
}

export function limitsFor(view: Size, world: Size): Limits {
  const fit = fitCam(view, world).s;
  return { min: fit * 0.9, max: Math.min(MAX_ABS, Math.max(fit * 3.4, fit + 0.5)) };
}

/** Ramène la caméra dans les limites : centrée si la pièce est plus petite que la vue, sinon bords à ≤ EDGE px. */
export function clampCam(c: Cam, view: Size, world: Size, lim: Limits = limitsFor(view, world)): Cam {
  const s = Math.min(lim.max, Math.max(lim.min, c.s));
  const sw = world.w * s; const sh = world.h * s;
  const axis = (vs: number, ws: number, cur: number, bias: number) => (ws <= vs ? (vs - ws) * bias : Math.min(EDGE, Math.max(vs - ws - EDGE, cur)));
  return { s, x: axis(view.w, sw, c.x, 0.5), y: axis(view.h, sh, c.y, 0.3) };
}

/** Zoom autour d'un point de l'écran (le point du monde sous le doigt reste sous le doigt). */
export function zoomAbout(c: Cam, sx: number, sy: number, s: number, lim: Limits): Cam {
  const ns = Math.min(lim.max, Math.max(lim.min, s));
  const w = toWorld(c, sx, sy);
  return { s: ns, x: sx - w.x * ns, y: sy - w.y * ns };
}

export interface PinchStart { cam: Cam; a: { x: number; y: number }; b: { x: number; y: number } }
/** Pincement : le zoom suit l'écart des doigts, le centre suit leur milieu (déplacement à deux doigts compris). */
export function pinch(st: PinchStart, a: { x: number; y: number }, b: { x: number; y: number }, lim: Limits): Cam {
  const d0 = Math.max(8, Math.hypot(st.b.x - st.a.x, st.b.y - st.a.y));
  const d1 = Math.max(8, Math.hypot(b.x - a.x, b.y - a.y));
  const m0 = { x: (st.a.x + st.b.x) / 2, y: (st.a.y + st.b.y) / 2 };
  const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const s = Math.min(lim.max, Math.max(lim.min, st.cam.s * (d1 / d0)));
  const w = toWorld(st.cam, m0.x, m0.y);
  return { s, x: m1.x - w.x * s, y: m1.y - w.y * s };
}

/** Centre la vue sur un point du monde (au zoom `s` s'il est donné). */
export function centerOn(c: Cam, view: Size, wx: number, wy: number, s = c.s): Cam {
  return { s, x: view.w / 2 - wx * s, y: view.h / 2 - wy * s };
}

/** Lissage exponentiel vers une caméra cible (transitions fluides). `k` ≈ 10 : ~0,25 s. */
export function ease(c: Cam, t: Cam, dt: number, k = 11): Cam {
  const f = 1 - Math.exp(-dt * k);
  const near = Math.abs(t.s - c.s) < 0.0008 && Math.abs(t.x - c.x) < 0.2 && Math.abs(t.y - c.y) < 0.2;
  if (near) return { ...t };
  return { s: c.s + (t.s - c.s) * f, x: c.x + (t.x - c.x) * f, y: c.y + (t.y - c.y) * f };
}
export const sameCam = (a: Cam, b: Cam): boolean => Math.abs(a.s - b.s) < 0.0008 && Math.abs(a.x - b.x) < 0.2 && Math.abs(a.y - b.y) < 0.2;
