/**
 * Kit de dessin partagé par tous les visuels (Canvas 2D, vectoriel).
 * Règles de cohérence « Romantic Cozy Pop » :
 *  - contour brun chocolat, épaisseur = OUTLINE_RATIO × taille de l'objet ;
 *  - lumière en haut à gauche (reflet blanc en haut à gauche, ombre en bas à droite) ;
 *  - ombre portée douce, ellipse lavande sous les objets ;
 *  - palette ci-dessous, ajustée par shade() pour les volumes.
 */

export const PAL = {
  rose: '#F5B5C8',
  roseVif: '#FF75A8',
  roseDeep: '#E8558F',
  creme: '#FFF4E8',
  lavande: '#B9A5E8',
  nuit: '#51446D',
  nuit2: '#3B3152',
  peche: '#FFC0A3',
  or: '#F3C86B',
  orDeep: '#D9A43C',
  choco: '#58433F',
  white: '#FFFFFF',
  leaf: '#7FC48A',
  leafDeep: '#4E9A62',
  sky: '#A9D4F5',
  red: '#E8484F',
  ivory: '#FFF9EE',
} as const;

export const OUTLINE = PAL.choco;
export const OUTLINE_RATIO = 0.032;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Dessine dans un nouveau canvas de w×h pixels, avec un repère mis à l'échelle (`scale`). */
export function paint(w: number, h: number, scale: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = makeCanvas(w * scale, h * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  return c;
}

// ------------------------------------------------------------------ couleurs

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur hexadécimale. amt ∈ [-1, 1]. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ------------------------------------------------------------------ formes

export function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  // cœur dodu, centré sur (cx, cy), largeur ≈ s
  const w = s / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + w * 0.95);
  ctx.bezierCurveTo(cx - w * 0.2, cy + w * 0.75, cx - w * 1.05, cy + w * 0.25, cx - w * 1.0, cy - w * 0.3);
  ctx.bezierCurveTo(cx - w * 0.95, cy - w * 0.9, cx - w * 0.2, cy - w * 1.0, cx, cy - w * 0.45);
  ctx.bezierCurveTo(cx + w * 0.2, cy - w * 1.0, cx + w * 0.95, cy - w * 0.9, cx + w * 1.0, cy - w * 0.3);
  ctx.bezierCurveTo(cx + w * 1.05, cy + w * 0.25, cx + w * 0.2, cy + w * 0.75, cx, cy + w * 0.95);
  ctx.closePath();
}

export function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  ctx.closePath();
}

// ------------------------------------------------------------- remplissages

/**
 * Remplit le chemin courant avec un dégradé vertical clair → foncé (lumière en
 * haut à gauche), puis trace le contour chocolat.
 */
export function fillShaded(ctx: CanvasRenderingContext2D, color: string, box: { x: number; y: number; w: number; h: number }, lw: number, opts: { light?: number; dark?: number; outline?: string | null } = {}): void {
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.35, box.y + box.h);
  g.addColorStop(0, shade(color, opts.light ?? 0.28));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -(opts.dark ?? 0.18)));
  ctx.fillStyle = g;
  ctx.fill();
  if (opts.outline !== null && lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = opts.outline ?? OUTLINE;
    ctx.stroke();
  }
}

/** Petit reflet brillant (ellipse blanche) en haut à gauche d'une forme. */
export function gloss(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.7, rot = -0.5): void {
  ctx.save();
  ellipse(ctx, cx, cy, rx, ry, rot);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();
  ctx.restore();
}

/** Ombre portée douce au sol. */
export function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.22): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(81,68,109,${alpha})`);
  g.addColorStop(1, 'rgba(81,68,109,0)');
  ctx.fillStyle = g;
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(cx, (cy * rx) / ry, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Petite étincelle à 4 branches. */
export function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color = '#FFFFFF', alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
  ctx.fill();
  ctx.restore();
}

/** Halo lumineux radial (lumières, magie). */
export function glow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha = 0.6): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Générateur déterministe pour les décors (positions d'étoiles, pétales…). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Canvas → URL d'image (pour l'interface HTML). Mise en cache par clé. */
const urlCache = new Map<string, string>();
export function canvasUrl(key: string, make: () => HTMLCanvasElement): string {
  let u = urlCache.get(key);
  if (!u) {
    u = make().toDataURL('image/png');
    urlCache.set(key, u);
  }
  return u;
}

/** Densité de pixels utilisée pour les textures (bornée pour la mémoire). */
export function texScale(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(3, Math.max(1, dpr));
}
