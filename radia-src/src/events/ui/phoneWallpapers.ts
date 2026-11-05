/**
 * Fonds d'écran du téléphone du jeu : de vrais visuels dessinés (canvas), à la taille de l'écran, direction artistique RADIA
 * (rose / lavande / crème / doré). Aucun élément propriétaire. Mis en cache (dataURL) après le premier dessin.
 */
import { paint, heartPath } from '../../game/art/kit';

export interface Wallpaper { id: string; name: string }
export const WALLPAPERS: readonly Wallpaper[] = [
  { id: 'rose', name: 'Rose romantique' },
  { id: 'paris', name: 'Paris au coucher du soleil' },
  { id: 'chateau', name: 'Château de Radia' },
  { id: 'fleurs', name: 'Fleurs' },
  { id: 'nuit', name: 'Nuit étoilée' },
];
export const DEFAULT_WALLPAPER = 'rose';
export const isWallpaper = (id: unknown): id is string => typeof id === 'string' && WALLPAPERS.some((w) => w.id === id);

const W = 390, H = 780;
const cache = new Map<string, string>();

/** Générateur pseudo-aléatoire déterministe (le dessin est identique à chaque lancement). */
const prng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function sky(c: CanvasRenderingContext2D, stops: [number, string][]): void {
  const g = c.createLinearGradient(0, 0, 0, H);
  for (const [o, col] of stops) g.addColorStop(o, col);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i - Math.PI / 2; const rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function hearts(c: CanvasRenderingContext2D, n: number, seed: number, col: string, minS = 10, maxS = 26): void {
  const r = prng(seed);
  for (let i = 0; i < n; i++) { c.globalAlpha = 0.12 + r() * 0.28; c.fillStyle = col; heartPath(c, r() * W, r() * H, minS + r() * (maxS - minS)); c.fill(); }
  c.globalAlpha = 1;
}
function stars(c: CanvasRenderingContext2D, n: number, seed: number, col: string, maxY = H): void {
  const r = prng(seed);
  for (let i = 0; i < n; i++) { c.globalAlpha = 0.35 + r() * 0.6; star(c, r() * W, r() * maxY, 2 + r() * 5, col); }
  c.globalAlpha = 1;
}
function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

const DRAW: Record<string, (c: CanvasRenderingContext2D) => void> = {
  rose: (c) => {
    sky(c, [[0, '#f59ac6'], [0.5, '#f0a3cc'], [1, '#b49aea']]);
    glow(c, 300, 140, 240, 'rgba(255,255,255,0.55)'); glow(c, 60, 640, 220, 'rgba(255,200,230,0.5)');
    hearts(c, 26, 7, '#ffffff'); hearts(c, 12, 11, '#e8558f', 8, 18); stars(c, 30, 3, '#fff7d6', H);
  },
  paris: (c) => {
    sky(c, [[0, '#6e5aa8'], [0.35, '#e98fb4'], [0.62, '#ffb68a'], [0.78, '#ffd9a0'], [1, '#2f2547']]);
    glow(c, 195, 520, 260, 'rgba(255,236,170,0.8)');
    c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(195, 520, 54, 0, Math.PI * 2); c.fill();
    // silhouette de Paris : toits + tour (forme originale simplifiée)
    c.fillStyle = '#3a2b57';
    c.fillRect(0, 640, W, 140);
    const r = prng(5); let x = 0; while (x < W) { const w = 22 + r() * 34, h = 14 + r() * 40; c.fillRect(x, 640 - h, w, h); x += w + 2; }
    c.beginPath(); c.moveTo(195, 360); c.lineTo(178, 640); c.lineTo(212, 640); c.closePath(); c.fill();
    c.fillRect(170, 520, 50, 8); c.fillRect(176, 470, 38, 6); c.fillRect(190, 340, 10, 30);
    stars(c, 16, 9, '#fff7d6', 240); hearts(c, 8, 4, '#ffffff', 8, 16);
  },
  chateau: (c) => {
    sky(c, [[0, '#8f7bd6'], [0.45, '#d9b8f0'], [0.8, '#ffd6e8'], [1, '#bfe3c9']]);
    glow(c, 90, 120, 160, 'rgba(255,255,255,0.7)'); stars(c, 24, 13, '#ffffff', 300);
    // colline
    c.fillStyle = '#9fd3b0'; c.beginPath(); c.ellipse(195, 790, 360, 190, 0, 0, Math.PI * 2); c.fill();
    // château
    const base = 620; c.fillStyle = '#fff3ea';
    c.fillRect(120, base - 120, 150, 120); c.fillRect(100, base - 190, 44, 190); c.fillRect(246, base - 190, 44, 190); c.fillRect(165, base - 230, 60, 110);
    c.fillStyle = '#f48fb1';
    for (const [x, w, top] of [[96, 52, base - 190], [242, 52, base - 190], [160, 70, base - 230]] as const) { c.beginPath(); c.moveTo(x, top); c.lineTo(x + w / 2, top - 56); c.lineTo(x + w, top); c.closePath(); c.fill(); }
    c.fillStyle = '#b07cff'; c.fillRect(182, base - 54, 26, 54); c.beginPath(); c.arc(195, base - 54, 13, Math.PI, 0); c.fill();
    c.fillStyle = '#ffe08a'; for (const [x, y] of [[117, base - 150], [263, base - 150], [190, base - 190]]) c.fillRect(x - 5, y - 8, 10, 16);
    hearts(c, 10, 21, '#ffffff', 8, 16);
  },
  fleurs: (c) => {
    sky(c, [[0, '#fff1e6'], [0.5, '#ffe0ec'], [1, '#e8d9ff']]);
    const r = prng(31);
    for (let i = 0; i < 34; i++) {
      const x = r() * W, y = r() * H, s = 12 + r() * 30; const col = ['#ff9bbf', '#ffc2d9', '#d6b4ff', '#fff0b3', '#ffffff'][Math.floor(r() * 5)];
      c.globalAlpha = 0.55 + r() * 0.4;
      for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k; c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.5, s * 0.3, a, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffd966'; c.beginPath(); c.arc(x, y, s * 0.22, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; hearts(c, 8, 17, '#ffffff', 8, 14);
  },
  nuit: (c) => {
    sky(c, [[0, '#2a2152'], [0.55, '#4b3b86'], [1, '#8a5fb8']]);
    glow(c, 300, 130, 180, 'rgba(255,240,200,0.55)'); c.fillStyle = '#fff4c9'; c.beginPath(); c.arc(300, 130, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a2152'; c.beginPath(); c.arc(314, 122, 30, 0, Math.PI * 2); c.fill();
    stars(c, 70, 23, '#fff7d6', H); hearts(c, 8, 2, '#ffd6e8', 8, 16);
  },
};

/** URL (dataURL) du fond d'écran ; identifiant inconnu → fond par défaut. */
export function wallpaperUrl(id: string): string {
  const key = isWallpaper(id) ? id : DEFAULT_WALLPAPER;
  let u = cache.get(key);
  if (!u) {
    const cv = paint(W, H, 1, (c) => DRAW[key](c));
    u = cv.toDataURL('image/jpeg', 0.88);
    cache.set(key, u);
  }
  return u;
}
