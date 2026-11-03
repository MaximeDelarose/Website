/**
 * Décors et illustrations de souvenirs (vectoriel, Canvas 2D).
 *
 *  - drawBackground(ctx, theme, w, h, layer) : décor plein écran en 3 couches
 *    ('far' = ciel / fond opaque, 'mid' = éléments principaux, 'near' =
 *    premier plan sur les bords seulement). Le centre de l'écran (où se trouve
 *    le plateau) reste calme : le décor se concentre en haut (~30 %) et sur
 *    les bords. S'adapte à toutes les tailles (portrait comme paysage).
 *  - drawMemory(ctx, id, w, h) : illustration d'un souvenir de l'album.
 */
import {
  OUTLINE, PAL, ellipse, glow, heartPath, rgba, roundRect, seeded, shade, sparkle, starPath,
} from './kit';
import { drawAugusteFull, type FullOpts } from './characters';
import { drawRadiaNow, drawAugusteCutout } from './world/radiaNow';
import { drawItem } from './items';

export type Theme = 'title' | 'garden' | 'paris' | 'souvenirs' | 'royaume' | 'monde';
export type Layer = 'far' | 'mid' | 'near';

type C = CanvasRenderingContext2D;

interface Frame { w: number; h: number; u: number; hz: number }
const frame = (w: number, h: number): Frame => ({ w, h, u: Math.min(w, h * 0.75) / 400, hz: h * (w > h ? 0.42 : 0.3) });

// ============================================================ outils

function vgrad(c: C, y0: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

function sky(c: C, f: Frame, stops: [number, string][]) {
  c.fillStyle = vgrad(c, 0, f.h, stops);
  c.fillRect(0, 0, f.w, f.h);
}

function stars(c: C, f: Frame, n: number, maxY: number, seed = 7, color = '#FFF6E0') {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * f.w, y = r() * maxY, s = (0.6 + r() * 1.6) * f.u;
    if (r() < 0.2) sparkle(c, x, y, s * 3, color, 0.85);
    else { c.globalAlpha = 0.4 + r() * 0.5; c.fillStyle = color; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.globalAlpha = 1; }
  }
}

function cloud(c: C, x: number, y: number, s: number, color: string, alpha = 0.8) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  for (const [dx, dy, r] of [[-30, 4, 18], [-10, -6, 24], [16, -2, 20], [34, 6, 14], [0, 8, 20]] as const) {
    c.moveTo(x + dx * s + r * s, y + dy * s);
    c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  c.fill();
  c.restore();
}

/** Silhouette de toits parisiens (cheminées), pleine jusqu'en bas de `base`. */
function rooftops(c: C, f: Frame, base: number, hmax: number, color: string, seed: number, windows?: string) {
  const r = seeded(seed);
  c.fillStyle = color;
  let x = -10;
  const blocks: [number, number, number][] = [];
  c.beginPath();
  c.moveTo(-10, base + 2);
  while (x < f.w + 10) {
    const bw = (40 + r() * 50) * f.u;
    const bh = hmax * (0.45 + r() * 0.55);
    const roof = bh * 0.22;
    c.lineTo(x, base - bh + roof);
    c.lineTo(x + bw * 0.12, base - bh);
    if (r() < 0.6) {
      const cx = x + bw * (0.3 + r() * 0.4);
      c.lineTo(cx, base - bh); c.lineTo(cx, base - bh - 9 * f.u); c.lineTo(cx + 7 * f.u, base - bh - 9 * f.u); c.lineTo(cx + 7 * f.u, base - bh);
    }
    c.lineTo(x + bw * 0.88, base - bh);
    c.lineTo(x + bw, base - bh + roof);
    blocks.push([x, bw, bh]);
    x += bw;
  }
  c.lineTo(f.w + 10, base + 2);
  c.closePath();
  c.fill();
  if (windows) {
    c.fillStyle = windows;
    for (const [bx, bw, bh] of blocks) {
      const cols = Math.max(1, Math.floor(bw / (13 * f.u)));
      const rows = Math.max(1, Math.floor((bh * 0.7) / (14 * f.u)));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (r() < 0.45) continue;
        c.fillRect(bx + (i + 0.35) * (bw / cols), base - bh * 0.7 + j * 14 * f.u + 4 * f.u, 4 * f.u, 6 * f.u);
      }
    }
  }
}

function eiffelSil(c: C, cx: number, base: number, hgt: number, color: string, lights?: string) {
  const w = hgt * 0.42;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(cx - 1, base - hgt * 1.04); c.lineTo(cx + 1, base - hgt * 1.04);
  c.lineTo(cx + w * 0.05, base - hgt * 0.72);
  c.quadraticCurveTo(cx + w * 0.14, base - hgt * 0.35, cx + w * 0.5, base);
  c.lineTo(cx + w * 0.24, base);
  c.quadraticCurveTo(cx, base - hgt * 0.24, cx - w * 0.24, base);
  c.lineTo(cx - w * 0.5, base);
  c.quadraticCurveTo(cx - w * 0.14, base - hgt * 0.35, cx - w * 0.05, base - hgt * 0.72);
  c.closePath();
  c.fill();
  c.fillRect(cx - w * 0.2, base - hgt * 0.33, w * 0.4, hgt * 0.025);
  c.fillRect(cx - w * 0.09, base - hgt * 0.62, w * 0.18, hgt * 0.02);
  if (lights) {
    const r = seeded(Math.round(hgt));
    c.fillStyle = lights;
    for (let i = 0; i < 26; i++) {
      const t = r();
      const y = base - hgt * t;
      const half = w * 0.5 * Math.pow(1 - t, 1.8) + 1;
      c.globalAlpha = 0.5 + r() * 0.5;
      c.beginPath(); c.arc(cx + (r() * 2 - 1) * half, y, 0.6 + r(), 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }
}

function arcTriomphe(c: C, cx: number, base: number, hgt: number, color: string, shadowCol: string, lw = 0) {
  const w = hgt * 0.92;
  c.fillStyle = color;
  c.fillRect(cx - w / 2, base - hgt, w, hgt);
  c.fillRect(cx - w * 0.53, base - hgt * 1.0, w * 1.06, hgt * 0.16);
  c.fillStyle = shadowCol;
  c.beginPath();
  c.moveTo(cx - w * 0.17, base); c.lineTo(cx - w * 0.17, base - hgt * 0.5);
  c.arc(cx, base - hgt * 0.5, w * 0.17, Math.PI, 0); c.lineTo(cx + w * 0.17, base); c.closePath(); c.fill();
  c.fillRect(cx - w * 0.5, base - hgt * 0.78, w, hgt * 0.025);
  c.fillRect(cx - w * 0.5, base - hgt * 0.86, w, hgt * 0.015);
  c.globalAlpha = 0.5;
  for (const s of [-1, 1]) c.fillRect(cx + s * w * 0.34 - w * 0.06, base - hgt * 0.7, w * 0.12, hgt * 0.24);
  c.globalAlpha = 1;
  if (lw) {
    c.lineWidth = lw; c.strokeStyle = OUTLINE;
    c.strokeRect(cx - w / 2, base - hgt * 0.84, w, hgt * 0.84);
    c.strokeRect(cx - w * 0.53, base - hgt, w * 1.06, hgt * 0.16);
  }
}

/** Grappe de feuillage (arbres, haies) : masses ombrées + petites feuilles. */
function foliage(c: C, x: number, y: number, r: number, base: string, seed: number, n = 9, dots?: string) {
  const rnd = seeded(seed);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * r * 0.7, rr = r * (0.32 + rnd() * 0.3);
    blobs.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rr]);
  }
  // ombre
  c.fillStyle = shade(base, -0.28);
  for (const [px, py, rr] of blobs) { c.beginPath(); c.arc(px + rr * 0.12, py + rr * 0.16, rr, 0, 7); c.fill(); }
  for (const [px, py, rr] of blobs) {
    const g = c.createRadialGradient(px - rr * 0.35, py - rr * 0.45, rr * 0.1, px, py, rr);
    g.addColorStop(0, shade(base, 0.22)); g.addColorStop(1, shade(base, -0.08));
    c.fillStyle = g; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill();
  }
  // petites feuilles en relief sur le bord des masses
  const leaves = Math.round(n * 7);
  for (let i = 0; i < leaves; i++) {
    const [px, py, rr] = blobs[i % blobs.length];
    const a = rnd() * Math.PI * 2, d = rr * (0.55 + rnd() * 0.45);
    const lx = px + Math.cos(a) * d, ly = py + Math.sin(a) * d;
    c.fillStyle = shade(base, rnd() * 0.5 - 0.2);
    ellipse(c, lx, ly, r * 0.07 + 1, r * 0.04 + 0.6, a + 1.2); c.fill();
  }
  if (dots) {
    for (let i = 0; i < n * 2; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * r * 0.85;
      c.fillStyle = rnd() < 0.85 ? dots : '#FFFFFF';
      c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * 0.028 + 0.8, 0, 7); c.fill();
    }
  }
}

/** Reflet de lumière sur des pavés mouillés : tirets horizontaux qui s'estompent. */
function wetReflection(c: C, x: number, y0: number, len: number, w: number, col: string, seed: number) {
  const r = seeded(seed);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const yy = y0 + t * len;
    const ww = w * (0.4 + r() * 0.8) * (1 - t * 0.5);
    c.fillStyle = rgba(col, 0.2 * (1 - t));
    ellipse(c, x + (r() - 0.5) * w * 0.3, yy, ww / 2, len / n * 0.4); c.fill();
  }
}

function lamp(c: C, x: number, base: number, hgt: number, u: number, lit = true) {
  if (lit) glow(c, x, base - hgt, hgt * 0.45, PAL.or, 0.55);
  c.fillStyle = '#2E2740';
  c.fillRect(x - 2.4 * u, base - hgt, 4.8 * u, hgt);
  c.beginPath(); c.moveTo(x - 9 * u, base); c.lineTo(x - 5 * u, base - 14 * u); c.lineTo(x + 5 * u, base - 14 * u); c.lineTo(x + 9 * u, base); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - 10 * u, base - hgt - 2 * u); c.lineTo(x, base - hgt - 13 * u); c.lineTo(x + 10 * u, base - hgt - 2 * u); c.closePath(); c.fill();
  c.fillStyle = lit ? '#FFE9A8' : '#EADFF5';
  c.beginPath(); c.moveTo(x - 8 * u, base - hgt - 2 * u); c.lineTo(x + 8 * u, base - hgt - 2 * u); c.lineTo(x + 5 * u, base - hgt + 14 * u); c.lineTo(x - 5 * u, base - hgt + 14 * u); c.closePath(); c.fill();
  c.fillStyle = '#2E2740';
  c.fillRect(x - 6 * u, base - hgt + 13 * u, 12 * u, 3 * u);
}

function smallFlower(c: C, x: number, y: number, r: number, col: string) {
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, 0, 7); c.fill(); }
  c.fillStyle = PAL.or; c.beginPath(); c.arc(x, y, r * 0.35, 0, 7); c.fill();
}

/** Massif fleuri dans un coin bas (premier plan). */
function flowerBush(c: C, x: number, y: number, r: number, seed: number, cols: string[]) {
  foliage(c, x, y, r, PAL.leafDeep, seed, 10);
  const rnd = seeded(seed + 3);
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * r * 0.85;
    smallFlower(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.65, r * (0.1 + rnd() * 0.06), cols[i % cols.length]);
  }
}

function stringLights(c: C, x0: number, y0: number, x1: number, y1: number, sag: number, u: number, n = 9) {
  c.lineWidth = 1.4 * u; c.strokeStyle = 'rgba(60,40,50,0.6)';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); c.stroke();
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag * 2) + t * t * y1;
    glow(c, x, y + 4 * u, 12 * u, PAL.or, 0.5);
    c.fillStyle = '#FFF0B8'; c.beginPath(); ellipse(c, x, y + 4 * u, 2.8 * u, 3.8 * u); c.fill();
  }
}

function rain(c: C, f: Frame, n: number, seed: number, alpha = 0.35) {
  const r = seeded(seed);
  c.strokeStyle = `rgba(225,230,255,${alpha})`;
  c.lineWidth = 1.2 * f.u;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x = r() * f.w, y = r() * f.h, l = (10 + r() * 14) * f.u;
    c.moveTo(x, y); c.lineTo(x - l * 0.15, y + l);
  }
  c.stroke();
}

function checkerGround(c: C, f: Frame, top: number, colA: string, colB: string, alpha = 1) {
  // sol en damier vu en perspective, de l'horizon jusqu'en bas
  const vx = f.w / 2;
  const n = 14;
  const rows = 12;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = colA;
  c.fillRect(0, top, f.w, f.h - top);
  c.fillStyle = colB;
  const yAt = (k: number) => top + (f.h - top) * Math.pow(k / rows, 1.9);
  for (let j = 0; j < rows; j++) {
    const y0 = yAt(j), y1 = yAt(j + 1);
    for (let i = -n; i < n; i++) {
      if ((i + j) % 2 === 0) continue;
      const sx = (x: number, y: number) => vx + (x * f.w * 0.16) * ((y - top + 4) / (f.h - top) * 6 + 0.12);
      c.beginPath();
      c.moveTo(sx(i, y0), y0); c.lineTo(sx(i + 1, y0), y0); c.lineTo(sx(i + 1, y1), y1); c.lineTo(sx(i, y1), y1);
      c.closePath(); c.fill();
    }
  }
  c.restore();
}

function ivoryTower(c: C, x: number, base: number, w: number, hgt: number, u: number, roof: string = PAL.roseVif) {
  c.fillStyle = vgrad(c, base - hgt, base, [[0, '#FFFFFF'], [1, '#EFE2D2']]);
  c.fillRect(x - w / 2, base - hgt, w, hgt);
  c.lineWidth = 2 * u; c.strokeStyle = rgba(PAL.choco, 0.5); c.strokeRect(x - w / 2, base - hgt, w, hgt);
  c.beginPath(); c.moveTo(x - w / 2 - 4 * u, base - hgt); c.lineTo(x, base - hgt - w * 1.3); c.lineTo(x + w / 2 + 4 * u, base - hgt); c.closePath();
  c.fillStyle = vgrad(c, base - hgt - w * 1.3, base - hgt, [[0, shade(roof, 0.25)], [1, shade(roof, -0.1)]]); c.fill(); c.stroke();
  c.fillStyle = PAL.or;
  c.beginPath(); c.moveTo(x, base - hgt - w * 1.3); c.lineTo(x, base - hgt - w * 1.3 - 10 * u); c.lineTo(x + 9 * u, base - hgt - w * 1.3 - 7 * u); c.lineTo(x, base - hgt - w * 1.3 - 4 * u); c.fill();
  c.fillStyle = '#FFE7A0';
  roundRect(c, x - w * 0.15, base - hgt + w * 0.3, w * 0.3, w * 0.45, w * 0.15); c.fill();
}

// ============================================================ thèmes

type Painter = (c: C, f: Frame) => void;

const THEMES: Record<Theme, Record<Layer, Painter>> = {
  // ----------------------------------------------------------- titre
  title: {
    far: (c, f) => {
      sky(c, f, [[0, '#A894DE'], [0.18, '#E2B6E0'], [0.3, '#FFC9D9'], [0.38, '#FFE2CF'], [0.55, '#F7D3E2'], [1, '#C9B6F0']]);
      glow(c, f.w * 0.3, f.hz, f.w * 0.5, '#FFE7C2', 0.7);
      stars(c, f, 30, f.hz * 0.5, 3);
      cloud(c, f.w * 0.2, f.hz * 0.35, f.u * 1.4, '#FFE4EE', 0.7);
      cloud(c, f.w * 0.8, f.hz * 0.2, f.u * 1.1, '#FFE4EE', 0.55);
      eiffelSil(c, f.w * 0.74, f.hz + 4 * f.u, f.hz * 0.78, '#8F7BC4');
      rooftops(c, f, f.hz + 6 * f.u, 46 * f.u, '#9E8BCF', 11);
    },
    mid: (c, f) => {
      rooftops(c, f, f.hz + 22 * f.u, 34 * f.u, '#8A77BD', 21, 'rgba(255,224,160,0.85)');
      c.fillStyle = vgrad(c, f.hz + 20 * f.u, f.hz + 80 * f.u, [[0, 'rgba(138,119,189,1)'], [1, 'rgba(201,182,240,0)']]);
      c.fillRect(0, f.hz + 20 * f.u, f.w, 60 * f.u);
    },
    near: (c, f) => {
      flowerBush(c, -10 * f.u, f.h + 10 * f.u, 90 * f.u, 5, [PAL.roseVif, '#FFFFFF', PAL.peche]);
      flowerBush(c, f.w + 10 * f.u, f.h + 16 * f.u, 84 * f.u, 9, [PAL.rose, PAL.lavande, '#FFFFFF']);
      lamp(c, 22 * f.u, f.h - 30 * f.u, 150 * f.u, f.u);
    },
  },
  // ----------------------------------------------------------- jardin
  garden: {
    far: (c, f) => {
      sky(c, f, [[0, '#FFDCE8'], [0.28, '#FFF0F2'], [0.32, '#E7F2DA'], [0.4, '#FFF4E8'], [1, '#F9D3DF']]);
      cloud(c, f.w * 0.22, f.hz * 0.3, f.u * 1.3, '#FFFFFF', 0.85);
      cloud(c, f.w * 0.78, f.hz * 0.45, f.u, '#FFFFFF', 0.75);
      // collines
      c.fillStyle = '#C9E3B8';
      c.beginPath(); c.moveTo(0, f.hz + 10 * f.u);
      c.quadraticCurveTo(f.w * 0.25, f.hz - 30 * f.u, f.w * 0.5, f.hz + 4 * f.u);
      c.quadraticCurveTo(f.w * 0.75, f.hz - 24 * f.u, f.w, f.hz + 6 * f.u);
      c.lineTo(f.w, f.hz + 40 * f.u); c.lineTo(0, f.hz + 40 * f.u); c.fill();
      // allée
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath(); c.moveTo(f.w * 0.46, f.hz + 30 * f.u); c.lineTo(f.w * 0.54, f.hz + 30 * f.u); c.lineTo(f.w * 0.8, f.h); c.lineTo(f.w * 0.2, f.h); c.fill();
    },
    mid: (c, f) => {
      // haies fleuries à l'horizon
      for (let i = 0; i < 7; i++) {
        const x = (i / 6) * f.w;
        foliage(c, x, f.hz + 22 * f.u, 34 * f.u, '#7FBF86', 40 + i, 8, i % 2 ? PAL.roseVif : PAL.rose);
      }
      // kiosque au loin
      const kx = f.w * 0.5, ky = f.hz + 4 * f.u, ku = f.u;
      c.fillStyle = '#FFFFFF';
      for (const dx of [-16, -6, 6, 16]) c.fillRect(kx + dx * ku - 1.5 * ku, ky - 28 * ku, 3 * ku, 28 * ku);
      c.fillStyle = PAL.rose;
      c.beginPath(); c.moveTo(kx - 24 * ku, ky - 28 * ku); c.quadraticCurveTo(kx, ky - 62 * ku, kx + 24 * ku, ky - 28 * ku); c.closePath(); c.fill();
      // arches de roses sur les côtés
      for (const s of [-1, 1]) {
        const ax = s < 0 ? 26 * f.u : f.w - 26 * f.u;
        c.lineWidth = 7 * f.u; c.strokeStyle = '#FFFFFF';
        c.beginPath(); c.moveTo(ax - s * 0, f.hz + 120 * f.u); c.lineTo(ax, f.hz - 10 * f.u); c.stroke();
        foliage(c, ax, f.hz - 20 * f.u, 44 * f.u, PAL.leafDeep, s > 0 ? 71 : 72, 10, PAL.roseVif);
        for (let k = 0; k < 6; k++) foliage(c, ax, f.hz + k * 22 * f.u, 14 * f.u, PAL.leaf, 80 + k, 4, PAL.rose);
      }
    },
    near: (c, f) => {
      flowerBush(c, 0, f.h + 6 * f.u, 96 * f.u, 13, [PAL.roseVif, PAL.peche, '#FFFFFF']);
      flowerBush(c, f.w, f.h + 6 * f.u, 96 * f.u, 17, [PAL.lavande, PAL.rose, '#FFFFFF']);
      // lierre en haut
      for (const s of [0, 1]) {
        const x = s ? f.w : 0;
        for (let k = 0; k < 6; k++) {
          c.fillStyle = k % 2 ? PAL.leaf : PAL.leafDeep;
          ellipse(c, x + (s ? -1 : 1) * (8 + k * 3) * f.u, (10 + k * 16) * f.u, 10 * f.u, 6 * f.u, s ? 0.6 : -0.6); c.fill();
        }
      }
    },
  },
  // ----------------------------------------------------------- Paris la nuit
  paris: {
    far: (c, f) => {
      sky(c, f, [[0, '#251E3A'], [0.3, '#4A3D66'], [0.36, '#6B5A8C'], [0.6, '#3E3354'], [1, '#2B2340']]);
      stars(c, f, 60, f.hz * 0.8, 21);
      c.fillStyle = '#FFF1C8';
      c.beginPath(); c.arc(f.w * 0.82, f.hz * 0.3, 16 * f.u, 0, 7); c.fill();
      glow(c, f.w * 0.82, f.hz * 0.3, 50 * f.u, '#FFF1C8', 0.35);
      glow(c, f.w * 0.5, f.hz, f.w * 0.45, '#FFB98A', 0.35);
      rooftops(c, f, f.hz + 8 * f.u, 40 * f.u, '#3B3152', 31, 'rgba(255,214,140,0.8)');
      arcTriomphe(c, f.w * 0.5, f.hz + 10 * f.u, 74 * f.u, '#E6D3BC', '#7A6656');
      glow(c, f.w * 0.5, f.hz - 30 * f.u, 70 * f.u, '#FFE2B0', 0.25);
      // pavés mouillés
      c.fillStyle = vgrad(c, f.hz + 10 * f.u, f.h, [[0, '#3A3050'], [1, '#2A2238']]);
      c.fillRect(0, f.hz + 10 * f.u, f.w, f.h);
    },
    mid: (c, f) => {
      // reflets des lampadaires et fenêtres sur les pavés mouillés
      wetReflection(c, 18 * f.u, f.h * 0.6, f.h * 0.36, 26 * f.u, '#FFC978', 1);
      wetReflection(c, f.w - 18 * f.u, f.h * 0.6, f.h * 0.36, 26 * f.u, '#FFC978', 2);
      wetReflection(c, f.w * 0.5, f.hz + 14 * f.u, f.h * 0.22, 60 * f.u, '#FFE2B0', 3);
      const rr = seeded(5);
      for (let i = 0; i < 6; i++) wetReflection(c, rr() * f.w, f.hz + 14 * f.u, f.h * 0.12, 8 * f.u, '#FFD68C', 10 + i);
      // arbres aux feuilles jaunes en haut, sur les côtés
      c.strokeStyle = '#2A2033'; c.lineWidth = 7 * f.u;
      c.beginPath(); c.moveTo(-4, f.h * 0.42); c.quadraticCurveTo(20 * f.u, 120 * f.u, 50 * f.u, 40 * f.u);
      c.moveTo(f.w + 4, f.h * 0.42); c.quadraticCurveTo(f.w - 20 * f.u, 120 * f.u, f.w - 50 * f.u, 40 * f.u); c.stroke();
      foliage(c, 10 * f.u, 40 * f.u, 105 * f.u, '#C49A2E', 3, 14, '#FFE27A');
      foliage(c, f.w - 10 * f.u, 50 * f.u, 105 * f.u, '#C49A2E', 4, 14, '#FFE27A');
      foliage(c, f.w * 0.5, -46 * f.u, 95 * f.u, '#B08A2A', 6, 12, '#FFE27A');
    },
    near: (c, f) => {
      lamp(c, 18 * f.u, f.h * 0.98, f.h * 0.42, f.u);
      lamp(c, f.w - 18 * f.u, f.h * 0.98, f.h * 0.42, f.u);
    },
  },
  // ----------------------------------------------------------- souvenirs
  souvenirs: {
    far: (c, f) => {
      sky(c, f, [[0, '#B9A5E8'], [0.16, '#F5B5C8'], [0.3, '#FFD7BF'], [0.36, '#FFE6D6'], [1, '#F2C4D2']]);
      glow(c, f.w * 0.6, f.hz * 0.9, f.w * 0.4, '#FFE7C2', 0.6);
      rooftops(c, f, f.hz + 10 * f.u, 48 * f.u, '#E6B4C2', 41);
    },
    mid: (c, f) => {
      const u = f.u;
      // façades sur les côtés
      const facade = (x: number, w: number, col: string) => {
        c.fillStyle = vgrad(c, 0, f.hz + 70 * u, [[0, shade(col, 0.1)], [1, shade(col, -0.08)]]); c.fillRect(x, 0, w, f.hz + 70 * u);
        c.lineWidth = 2 * u; c.strokeStyle = rgba(PAL.choco, 0.45); c.strokeRect(x, -2, w, f.hz + 72 * u);
        c.fillStyle = shade(col, -0.12);
        for (let j = 0; j < 4; j++) c.fillRect(x, 36 * u + j * 30 * u, w, 2.4 * u);
        c.fillStyle = '#7A5A88';
        for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
          c.fillRect(x + w * (0.12 + i * 0.42), 12 * u + j * 30 * u, w * 0.05, 22 * u);
          c.fillRect(x + w * (0.41 + i * 0.42), 12 * u + j * 30 * u, w * 0.05, 22 * u);
        }
        c.fillStyle = 'rgba(255,233,170,0.9)';
        for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
          roundRect(c, x + w * (0.18 + i * 0.42), 14 * u + j * 30 * u, w * 0.22, 18 * u, 4 * u); c.fill();
        }
      };
      const fw = Math.min(f.w * 0.3, 150 * u);
      facade(0, fw, '#F3D9C8');
      facade(f.w - fw, fw, '#F7E3D6');
      // marquise du cinéma (à gauche)
      const my = f.hz + 18 * u;
      c.fillStyle = '#E8558F'; roundRect(c, 4 * u, my, fw - 4 * u, 34 * u, 6 * u); c.fill();
      c.lineWidth = 2 * u; c.strokeStyle = OUTLINE; c.stroke();
      c.fillStyle = '#FFF4E8'; roundRect(c, 12 * u, my + 7 * u, fw - 20 * u, 20 * u, 4 * u); c.fill();
      for (let i = 0; i < 8; i++) { c.fillStyle = '#FFF0B8'; c.beginPath(); c.arc(10 * u + i * (fw - 16 * u) / 7, my + 3 * u, 2.2 * u, 0, 7); c.fill(); }
      heartPath(c, fw / 2, my + 17 * u, 12 * u); c.fillStyle = PAL.roseVif; c.fill();
      // store rayé du café (à droite)
      const ax = f.w - fw;
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#FFFFFF' : PAL.roseVif;
        c.beginPath(); c.moveTo(ax + i * fw / 6, my); c.lineTo(ax + (i + 1) * fw / 6, my);
        c.lineTo(ax + (i + 1) * fw / 6 - 4 * u, my + 30 * u); c.lineTo(ax + i * fw / 6 - 4 * u, my + 30 * u); c.closePath(); c.fill();
      }
      c.lineWidth = 2 * u; c.strokeStyle = OUTLINE; c.strokeRect(ax, my, fw, 30 * u);
      stringLights(c, fw, 30 * u, f.w - fw, 20 * u, 18 * u, u, 11);
      stringLights(c, fw, 80 * u, f.w - fw, 74 * u, 12 * u, u, 9);
    },
    near: (c, f) => {
      const u = f.u;
      for (const x of [26 * u, f.w - 26 * u]) {
        c.fillStyle = '#C46B4A'; c.beginPath(); c.moveTo(x - 20 * u, f.h - 50 * u); c.lineTo(x + 20 * u, f.h - 50 * u); c.lineTo(x + 15 * u, f.h); c.lineTo(x - 15 * u, f.h); c.fill();
        flowerBush(c, x, f.h - 66 * u, 34 * u, Math.round(x), [PAL.roseVif, '#FFFFFF']);
      }
      c.fillStyle = 'rgba(255,214,150,0.18)';
      c.fillRect(0, f.h - 8 * u, f.w, 8 * u);
    },
  },
  // ----------------------------------------------------------- royaume
  royaume: {
    far: (c, f) => {
      sky(c, f, [[0, '#B9A5E8'], [0.22, '#E1D3FA'], [0.3, '#FFE9F0'], [1, '#FFF4E8']]);
      cloud(c, f.w * 0.15, f.hz * 0.25, f.u * 1.2, '#FFFFFF', 0.7);
      cloud(c, f.w * 0.85, f.hz * 0.4, f.u * 1.4, '#FFFFFF', 0.6);
      stars(c, f, 18, f.hz * 0.5, 61, '#FFFFFF');
      // château lointain
      const u = f.u, cx = f.w * 0.5, b = f.hz + 6 * u;
      c.globalAlpha = 0.85;
      ivoryTower(c, cx - 46 * u, b, 18 * u, 56 * u, u, PAL.lavande);
      ivoryTower(c, cx + 46 * u, b, 18 * u, 56 * u, u, PAL.lavande);
      c.fillStyle = '#FFF9EE'; c.fillRect(cx - 40 * u, b - 34 * u, 80 * u, 34 * u);
      ivoryTower(c, cx, b, 26 * u, 80 * u, u, PAL.roseVif);
      c.globalAlpha = 1;
      glow(c, cx, b - 50 * u, 90 * u, PAL.or, 0.25);
    },
    mid: (c, f) => {
      checkerGround(c, f, f.hz + 6 * f.u, '#FFF6EE', '#F6D9E3');
      c.fillStyle = vgrad(c, f.hz, f.hz + 60 * f.u, [[0, 'rgba(255,233,240,1)'], [1, 'rgba(255,233,240,0)']]);
      c.fillRect(0, f.hz, f.w, 60 * f.u);
      for (const s of [0.12, 0.88]) ivoryTower(c, f.w * s, f.hz + 30 * f.u, 22 * f.u, 90 * f.u, f.u);
    },
    near: (c, f) => {
      // grandes pièces d'échecs aux coins bas
      const u = f.u;
      const piece = (x: number, s: number, queen: boolean) => {
        c.save(); c.translate(x, f.h); c.scale(s, s);
        c.fillStyle = vgrad(c, -170, 0, [[0, '#FFFFFF'], [1, '#EBDDCB']]);
        c.lineWidth = 3; c.strokeStyle = rgba(PAL.choco, 0.7);
        c.beginPath(); c.moveTo(-50, 0); c.lineTo(-44, -20); c.lineTo(-30, -26); c.quadraticCurveTo(-20, -90, -24, -120);
        c.lineTo(24, -120); c.quadraticCurveTo(20, -90, 30, -26); c.lineTo(44, -20); c.lineTo(50, 0); c.closePath(); c.fill(); c.stroke();
        if (queen) {
          c.beginPath(); c.moveTo(-26, -120); c.lineTo(-34, -160); c.lineTo(-14, -138); c.lineTo(0, -168); c.lineTo(14, -138); c.lineTo(34, -160); c.lineTo(26, -120); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = PAL.or; for (const [px, py] of [[-34, -160], [0, -168], [34, -160]]) { c.beginPath(); c.arc(px, py, 6, 0, 7); c.fill(); c.stroke(); }
        } else {
          c.beginPath(); c.rect(-32, -150, 64, 32); c.fill(); c.stroke();
          c.fillStyle = '#F6D9E3'; for (const px of [-32, -6, 20]) { c.fillRect(px, -160, 12, 12); c.strokeRect(px, -160, 12, 12); }
        }
        c.fillStyle = PAL.roseVif; c.fillRect(-28, -44, 56, 8);
        c.restore();
      };
      piece(18 * u, 0.62 * u, false);
      piece(f.w - 16 * u, 0.7 * u, true);
      for (const [x, y] of [[0.1, 0.12], [0.9, 0.08], [0.06, 0.5], [0.94, 0.45]]) sparkle(c, f.w * x, f.h * y, 7 * u, PAL.or, 0.9);
    },
  },
  // ----------------------------------------------------------- le monde
  monde: {
    far: (c, f) => {
      sky(c, f, [[0, '#FFC9DC'], [0.2, '#FFE2C8'], [0.32, '#FFF4D6'], [0.45, '#FFEAF2'], [1, '#F8D7EC']]);
      // rayons
      c.save(); c.translate(f.w * 0.5, f.hz * 0.6); c.globalAlpha = 0.18; c.fillStyle = '#FFFFFF';
      for (let i = 0; i < 14; i++) { c.rotate(Math.PI / 7); c.beginPath(); c.moveTo(0, 0); c.lineTo(f.h, -f.h * 0.08); c.lineTo(f.h, f.h * 0.08); c.fill(); }
      c.restore();
      glow(c, f.w * 0.5, f.hz * 0.6, f.w * 0.55, '#FFF3C4', 0.9);
      stars(c, f, 30, f.hz, 81, '#FFFFFF');
    },
    mid: (c, f) => {
      const u = f.u;
      // îles flottantes avec les motifs du jeu
      const island = (x: number, y: number, r: number, motif: (x: number, y: number) => void) => {
        c.fillStyle = '#C9E3B8'; ellipse(c, x, y, r, r * 0.28); c.fill();
        c.fillStyle = '#D9A07C';
        c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x - r * 0.4, y + r * 0.9, x, y + r * 1.05); c.quadraticCurveTo(x + r * 0.4, y + r * 0.9, x + r, y); c.fill();
        motif(x, y);
      };
      island(f.w * 0.18, f.hz * 0.62, 34 * u, (x, y) => eiffelSil(c, x, y, 54 * u, '#E8A0BE'));
      island(f.w * 0.82, f.hz * 0.5, 30 * u, (x, y) => ivoryTower(c, x, y, 16 * u, 36 * u, u));
      island(f.w * 0.5, f.hz * 0.95, 24 * u, (x, y) => { for (let i = -1; i <= 1; i++) smallFlower(c, x + i * 12 * u, y - 6 * u, 7 * u, i ? PAL.roseVif : PAL.lavande); });
      // lanternes flottantes
      const r = seeded(91);
      for (let i = 0; i < 12; i++) {
        const x = r() * f.w, y = r() * f.h * 0.9;
        if (Math.abs(x - f.w / 2) < f.w * 0.3 && y > f.hz && y < f.h * 0.85) continue;
        glow(c, x, y, 16 * u, PAL.or, 0.6);
        c.fillStyle = '#FFE7A0'; roundRect(c, x - 4 * u, y - 6 * u, 8 * u, 11 * u, 3 * u); c.fill();
      }
    },
    near: (c, f) => {
      flowerBush(c, 0, f.h + 4 * f.u, 92 * f.u, 23, [PAL.roseVif, PAL.or, '#FFFFFF']);
      flowerBush(c, f.w, f.h + 4 * f.u, 92 * f.u, 29, [PAL.lavande, PAL.rose, '#FFFFFF']);
      for (const [x, y, s] of [[0.08, 0.3, 14], [0.92, 0.26, 12], [0.12, 0.7, 10], [0.9, 0.68, 12]]) {
        heartPath(c, f.w * x, f.h * y, s * f.u); c.fillStyle = rgba(PAL.roseVif, 0.7); c.fill();
      }
    },
  },
};

export function drawBackground(ctx: CanvasRenderingContext2D, theme: Theme, w: number, h: number, layer: Layer): void {
  const p = THEMES[theme]?.[layer];
  if (!p) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  p(ctx, frame(w, h));
  ctx.restore();
}

// ============================================================ souvenirs

function allLayers(c: C, theme: Theme, w: number, h: number) {
  for (const l of ['far', 'mid', 'near'] as Layer[]) drawBackground(c, theme, w, h, l);
}

/** Place un personnage (repère 240 × 600) les pieds en (x, y), haut de `hgt`. */
function person(c: C, who: 'radia' | 'auguste', x: number, y: number, hgt: number, o: FullOpts = {}, flip = false) {
  const k = hgt / 600;
  c.save();
  c.translate(x, y);
  c.scale(flip ? -k : k, k);
  c.translate(-120, -592);
  groundShadowAt(c, 120, 590, 70, 12);
  if (who === 'radia') drawRadiaNow(c, 240, 600, { expr: o.expr, blink: o.blink, step: o.step, arms: o.arms }); else if (!drawAugusteCutout(c, 240, 600)) drawAugusteFull(c, o);
  c.restore();
}

function groundShadowAt(c: C, x: number, y: number, rx: number, ry: number) {
  c.save(); c.fillStyle = 'rgba(40,30,60,0.25)'; ellipse(c, x, y, rx, ry); c.fill(); c.restore();
}

/** Capuche relevée (sweat noir) autour de la tête de Radia, en repère du personnage en pied. */
function hoodUp(c: C, x: number, y: number, hgt: number) {
  const k = hgt / 600;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.translate(-120, -592);
  // la tête du personnage en pied est centrée en (120, 120), échelle 0,56
  c.beginPath();
  c.moveTo(56, 210);
  c.bezierCurveTo(40, 120, 60, 40, 120, 34);
  c.bezierCurveTo(180, 40, 200, 120, 184, 210);
  c.quadraticCurveTo(172, 160, 166, 110);
  c.bezierCurveTo(160, 70, 80, 70, 74, 110);
  c.quadraticCurveTo(68, 160, 56, 210);
  c.closePath();
  c.fillStyle = vgrad(c, 34, 210, [[0, '#4A4354'], [1, '#221E28']]);
  c.fill();
  c.lineWidth = 3.2; c.strokeStyle = OUTLINE; c.stroke();
  c.restore();
}

function vignette(c: C, w: number, h: number, col = '#3B3152', a = 0.35) {
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(1, rgba(col, a));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

const MEMS: Record<string, (c: C, w: number, h: number) => void> = {
  flowers: (c, w, h) => {
    allLayers(c, 'garden', w, h);
    const ph = h * 0.6;
    person(c, 'radia', w * 0.4, h * 0.94, ph, { expr: 'smile', arms: 'heart' });
    // grand bouquet tenu devant elle
    const s = ph * 0.32;
    c.save(); c.translate(w * 0.4 - s * 0.5, h * 0.94 - ph * 0.55); drawItem(c, { c: 'flowers', l: 5 }, s); c.restore();
    const s2 = Math.min(w, h) * 0.22;
    c.save(); c.translate(w * 0.78 - s2 / 2, h * 0.62); drawItem(c, { c: 'flowers', l: 4 }, s2); c.restore();
    for (const [x, y] of [[0.68, 0.38], [0.2, 0.42], [0.8, 0.5]]) sparkle(c, w * x, h * y, Math.min(w, h) * 0.025, '#FFFFFF');
  },
  nord: (c, w, h) => {
    allLayers(c, 'paris', w, h);
    const ph = h * 0.56;
    person(c, 'auguste', w * 0.36, h * 0.95, ph * 1.04, { expr: 'smile', step: 0.6 });
    person(c, 'radia', w * 0.64, h * 0.95, ph, { expr: 'laugh', step: -0.6 });
    heartPath(c, w * 0.5, h * 0.36, Math.min(w, h) * 0.08); c.fillStyle = rgba(PAL.roseVif, 0.9); c.fill();
  },
  arc: (c, w, h) => {
    const f = frame(w, h);
    sky(c, f, [[0, '#2A2340'], [0.5, '#4A3D66'], [1, '#2E2640']]);
    glow(c, w * 0.5, h * 0.45, w * 0.7, '#FFDDB0', 0.3);
    arcTriomphe(c, w * 0.52, h * 0.78, Math.min(h * 0.46, w * 0.9), '#F1E3CF', '#7F6A5A', Math.max(1, w / 220));
    // reliefs sculptés suggérés
    c.fillStyle = 'rgba(160,130,110,0.45)';
    for (const s of [-1, 1]) roundRect(c, w * 0.52 + s * h * 0.155 - h * 0.035, h * 0.45, h * 0.07, h * 0.13, h * 0.01), c.fill();
    // feuillage jaune en haut, comme sur la photo
    foliage(c, w * 0.1, -h * 0.02, w * 0.38, '#C9A43C', 12, 16, '#FFE27A');
    foliage(c, w * 0.6, -h * 0.05, w * 0.42, '#B8952F', 14, 16, '#FFE27A');
    foliage(c, w * 0.98, h * 0.04, w * 0.3, '#C9A43C', 16, 12, '#FFE27A');
    // pavés mouillés et reflets
    c.fillStyle = vgrad(c, h * 0.78, h, [[0, '#3E3454'], [1, '#2A2238']]);
    c.fillRect(0, h * 0.78, w, h * 0.22);
    c.fillStyle = 'rgba(255,214,150,0.25)';
    for (const x of [0.2, 0.45, 0.6, 0.85]) c.fillRect(w * x, h * 0.8, w * 0.012, h * 0.2);
    const ph = h * 0.6;
    person(c, 'auguste', w * 0.33, h * 0.98, ph * 1.05, { expr: 'tease' });
    person(c, 'radia', w * 0.66, h * 0.98, ph, { expr: 'smile' });
    hoodUp(c, w * 0.66, h * 0.98, ph);
    rain(c, f, 110, 4, 0.4);
    vignette(c, w, h, '#1E1830', 0.45);
  },
  cinema: (c, w, h) => {
    const f = frame(w, h);
    sky(c, f, [[0, '#2A2238'], [1, '#1B1626']]);
    // grand écran : un film de super-héros à toile (hommage stylisé, sans logo)
    const sx = w * 0.07, sw = w * 0.86, sy = h * 0.05, sh = h * 0.36;
    glow(c, w / 2, sy + sh / 2, w * 0.8, '#BFD8FF', 0.4);
    c.save();
    roundRect(c, sx, sy, sw, sh, w * 0.025); c.clip();
    c.fillStyle = vgrad(c, sy, sy + sh, [[0, '#4C7BE0'], [0.55, '#F2A0B8'], [1, '#FFD9A8']]);
    c.fillRect(sx, sy, sw, sh);
    // immeubles de la ville
    for (let i = 0; i < 9; i++) {
      const bw = sw / 9, bx = sx + i * bw, bh = sh * (0.32 + ((i * 37) % 5) * 0.07);
      c.fillStyle = i % 2 ? '#2C3A78' : '#3A4A92';
      c.fillRect(bx, sy + sh - bh, bw * 0.92, bh);
      c.fillStyle = 'rgba(255,230,150,0.75)';
      for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) if ((i + k + m) % 3) c.fillRect(bx + bw * (0.14 + m * 0.27), sy + sh - bh + bh * (0.1 + k * 0.22), bw * 0.14, bh * 0.1);
    }
    // fil de toile depuis le haut de l'écran
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1.2, w / 200);
    c.beginPath(); c.moveTo(sx + sw * 0.9, sy - 2); c.quadraticCurveTo(sx + sw * 0.75, sy + sh * 0.12, sx + sw * 0.6, sy + sh * 0.3); c.stroke();
    // le héros en plein élan (rouge et bleu, masque à toile, grands yeux blancs)
    c.save();
    c.translate(sx + sw * 0.5, sy + sh * 0.56);
    c.rotate(-0.42);
    const u = sh * 0.34;
    const RED = '#D8353F', BLUE = '#2B4CB8', INK = '#1C1730';
    c.lineWidth = Math.max(1.4, w / 170); c.strokeStyle = INK;
    // jambes
    c.fillStyle = BLUE;
    c.beginPath(); c.moveTo(-u * 0.25, u * 0.55); c.lineTo(-u * 0.95, u * 1.15); c.lineTo(-u * 0.72, u * 1.3); c.lineTo(-u * 0.05, u * 0.8); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(u * 0.2, u * 0.55); c.lineTo(u * 0.55, u * 1.25); c.lineTo(u * 0.82, u * 1.2); c.lineTo(u * 0.5, u * 0.5); c.closePath(); c.fill(); c.stroke();
    // bras tendu vers le fil
    c.fillStyle = RED;
    c.beginPath(); c.moveTo(u * 0.3, -u * 0.35); c.lineTo(u * 1.25, -u * 1.0); c.lineTo(u * 1.38, -u * 0.82); c.lineTo(u * 0.5, -u * 0.1); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-u * 0.3, -u * 0.2); c.lineTo(-u * 1.0, u * 0.2); c.lineTo(-u * 0.86, u * 0.4); c.lineTo(-u * 0.15, u * 0.1); c.closePath(); c.fill(); c.stroke();
    // torse
    c.fillStyle = RED;
    c.beginPath(); c.moveTo(-u * 0.45, -u * 0.5); c.quadraticCurveTo(0, -u * 0.7, u * 0.45, -u * 0.5); c.lineTo(u * 0.3, u * 0.6); c.lineTo(-u * 0.3, u * 0.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = BLUE;
    c.beginPath(); c.moveTo(-u * 0.3, -u * 0.1); c.lineTo(-u * 0.45, -u * 0.5); c.lineTo(-u * 0.3, u * 0.6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(u * 0.3, -u * 0.1); c.lineTo(u * 0.45, -u * 0.5); c.lineTo(u * 0.3, u * 0.6); c.closePath(); c.fill();
    // tête masquée
    c.fillStyle = RED;
    c.beginPath(); c.ellipse(0, -u * 0.95, u * 0.42, u * 0.5, 0, 0, 7); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.ellipse(0, -u * 0.95, u * 0.42, u * 0.5, 0, 0, 7); c.clip();
    c.strokeStyle = 'rgba(28,23,48,0.55)'; c.lineWidth = Math.max(0.8, w / 330);
    for (let a = 0; a < 8; a++) { c.beginPath(); c.moveTo(0, -u * 0.95); c.lineTo(Math.cos(a * Math.PI / 4) * u, -u * 0.95 + Math.sin(a * Math.PI / 4) * u); c.stroke(); }
    for (let r = 1; r < 4; r++) { c.beginPath(); c.ellipse(0, -u * 0.95, u * 0.14 * r, u * 0.16 * r, 0, 0, 7); c.stroke(); }
    c.restore();
    c.fillStyle = '#FFFFFF'; c.strokeStyle = INK; c.lineWidth = Math.max(1.2, w / 190);
    for (const sgn of [-1, 1]) { c.beginPath(); c.moveTo(sgn * u * 0.06, -u * 0.86); c.quadraticCurveTo(sgn * u * 0.3, -u * 1.12, sgn * u * 0.38, -u * 0.98); c.quadraticCurveTo(sgn * u * 0.3, -u * 0.78, sgn * u * 0.06, -u * 0.86); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    c.restore();
    c.lineWidth = Math.max(2, w / 110); c.strokeStyle = '#3A2F52'; roundRect(c, sx, sy, sw, sh, w * 0.025); c.stroke();
    // faisceau du projecteur
    c.fillStyle = 'rgba(220,230,255,0.07)';
    c.beginPath(); c.moveTo(w * 0.5, h); c.lineTo(sx, sy + sh); c.lineTo(sx + sw, sy + sh); c.fill();
    // Radia et Auguste, installés devant l'écran (tenue actuelle de Radia)
    const feet = h * 0.9, hgt = h * 0.68;
    person(c, 'auguste', w * 0.69, feet, hgt, { expr: 'smile' });
    person(c, 'radia', w * 0.31, feet, hgt, { expr: 'love' });
    // rangées de fauteuils au premier plan (cachent les jambes)
    for (let row = 0; row < 2; row++) {
      const y = h * (0.7 + row * 0.14);
      const n = 5 + row;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (w / n);
        c.fillStyle = shade('#B03A5C', -0.18 * (row + 1));
        roundRect(c, x - w / n * 0.48, y, w / n * 0.96, h * 0.16, w * 0.03); c.fill();
        c.lineWidth = Math.max(1, w / 220); c.strokeStyle = 'rgba(20,10,25,0.5)'; c.stroke();
      }
    }
    // pot de pop-corn partagé et cœur
    const pw = w * 0.1, px = w * 0.5, py = h * 0.62;
    for (let i = 0; i < 8; i++) { c.fillStyle = '#FFF4D6'; c.beginPath(); c.arc(px - pw * 0.38 + (i % 4) * pw * 0.26, py - pw * 0.05 - Math.floor(i / 4) * pw * 0.22, pw * 0.2, 0, 7); c.fill(); }
    c.beginPath(); c.moveTo(px - pw / 2, py); c.lineTo(px + pw / 2, py); c.lineTo(px + pw * 0.38, py + pw * 1.3); c.lineTo(px - pw * 0.38, py + pw * 1.3); c.closePath();
    c.fillStyle = '#FFFFFF'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#E8484F'; for (let i = -2; i < 3; i += 2) c.fillRect(px + i * pw * 0.13 - pw * 0.065, py, pw * 0.13, pw * 1.3); c.restore();
    c.lineWidth = Math.max(1, w / 200); c.strokeStyle = OUTLINE; c.stroke();
    heartPath(c, w * 0.5, h * 0.5, w * 0.045); c.fillStyle = rgba(PAL.roseVif, 0.9); c.fill();
    vignette(c, w, h, '#120E1A', 0.4);
  },
  billard: (c, w, h) => {
    const f = frame(w, h);
    sky(c, f, [[0, '#1B0F2E'], [0.55, '#3A1650'], [1, '#150B22']]);
    // néons du bar (rose et violet)
    glow(c, w * 0.22, h * 0.14, w * 0.55, '#FF4FA8', 0.38);
    glow(c, w * 0.8, h * 0.18, w * 0.5, '#8A5CFF', 0.4);
    c.lineCap = 'round';
    c.lineWidth = Math.max(3, w / 70); c.strokeStyle = '#FF6EC0';
    c.shadowColor = '#FF4FA8'; c.shadowBlur = w * 0.03;
    c.beginPath(); c.moveTo(w * 0.1, h * 0.1); c.lineTo(w * 0.42, h * 0.1); c.stroke();
    c.strokeStyle = '#A98BFF'; c.shadowColor = '#8A5CFF';
    c.beginPath(); c.moveTo(w * 0.58, h * 0.13); c.lineTo(w * 0.9, h * 0.13); c.stroke();
    c.beginPath(); c.moveTo(w * 0.7, h * 0.2); c.lineTo(w * 0.9, h * 0.2); c.stroke();
    c.shadowBlur = 0;
    // lampe suspendue
    c.fillStyle = '#2E2740'; c.fillRect(w * 0.5 - 1, 0, 2, h * 0.2);
    c.fillStyle = '#FF7AC6';
    c.beginPath(); c.moveTo(w * 0.34, h * 0.32); c.quadraticCurveTo(w * 0.5, h * 0.17, w * 0.66, h * 0.32); c.closePath(); c.fill();
    glow(c, w * 0.5, h * 0.62, w * 0.55, '#FFD6F0', 0.28);
    // table verte en perspective
    const top = h * 0.5, bot = h * 0.9;
    c.fillStyle = '#4A2A3E';
    c.beginPath(); c.moveTo(w * 0.2, top); c.lineTo(w * 0.8, top); c.lineTo(w * 1.0, bot); c.lineTo(0, bot); c.closePath(); c.fill();
    c.lineWidth = Math.max(1.5, w / 160); c.strokeStyle = OUTLINE; c.stroke();
    c.fillStyle = '#2FA070';
    c.beginPath(); c.moveTo(w * 0.24, top + h * 0.022); c.lineTo(w * 0.76, top + h * 0.022); c.lineTo(w * 0.93, bot - h * 0.03); c.lineTo(w * 0.07, bot - h * 0.03); c.closePath(); c.fill();
    c.fillStyle = '#12090F';
    for (const [x, y] of [[0.25, 0.525], [0.75, 0.525], [0.08, 0.87], [0.92, 0.87]]) { c.beginPath(); c.arc(w * x, h * y, w * 0.02, 0, 7); c.fill(); }
    // boules : une blanche, une rouge, quelques autres
    const balls: [number, number, string][] = [[0.52, 0.66, '#FFFFFF'], [0.62, 0.6, '#E8484F'], [0.46, 0.58, '#F3C86B'], [0.56, 0.74, '#5D4C8C']];
    for (const [x, y, col] of balls) {
      const r = w * 0.028;
      c.fillStyle = col; c.beginPath(); c.arc(w * x, h * y, r, 0, 7); c.fill();
      c.lineWidth = Math.max(1, w / 260); c.strokeStyle = OUTLINE; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(w * x - r * 0.35, h * y - r * 0.35, r * 0.3, 0, 7); c.fill();
    }
    // Auguste regarde, Radia vise (tenue actuelle)
    const feet = h * 0.98, hgt = h * 0.7;
    person(c, 'auguste', w * 0.78, feet, hgt, { expr: 'tease' });
    person(c, 'radia', w * 0.3, feet, hgt, { expr: 'love' });
    // queue de billard tenue par Radia, pointée vers la boule blanche
    c.lineCap = 'round';
    c.lineWidth = w * 0.016; c.strokeStyle = '#E8C9A0';
    c.beginPath(); c.moveTo(w * 0.1, h * 0.93); c.lineTo(w * 0.5, h * 0.67); c.stroke();
    c.lineWidth = w * 0.019; c.strokeStyle = '#4A2E20';
    c.beginPath(); c.moveTo(w * 0.06, h * 0.96); c.lineTo(w * 0.2, h * 0.87); c.stroke();
    c.lineWidth = w * 0.01; c.strokeStyle = '#7FB6FF';
    c.beginPath(); c.moveTo(w * 0.48, h * 0.685); c.lineTo(w * 0.5, h * 0.67); c.stroke();
    // bords de table au premier plan (cachent les jambes)
    c.fillStyle = '#4A2A3E'; c.fillRect(0, h * 0.94, w, h * 0.06);
    for (const [x, y] of [[0.14, 0.34], [0.9, 0.4]]) { heartPath(c, w * x, h * y, w * 0.05); c.fillStyle = rgba(PAL.rose, 0.55); c.fill(); }
    vignette(c, w, h, '#0E0716', 0.45);
  },
  promenade: (c, w, h) => {
    const f = frame(w, h);
    sky(c, f, [[0, '#A9D4F5'], [0.3, '#DCEEFB'], [1, '#FFFFFF']]);
    // façades en pierre crème avec hautes portes bleues en arc
    const fy = h * 0.08, fh = h * 0.56;
    c.fillStyle = vgrad(c, fy, fy + fh, [[0, '#F4E6CF'], [1, '#E6D2B4']]);
    c.fillRect(0, fy, w, fh);
    c.fillStyle = '#D9C4A4'; c.fillRect(0, fy + fh * 0.36, w, fh * 0.02);
    const n = Math.max(3, Math.round(w / (h * 0.16)));
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i * bw;
      // fenêtres et balcons
      c.fillStyle = '#B9D3E8'; c.fillRect(x + bw * 0.3, fy + fh * 0.06, bw * 0.4, fh * 0.22);
      c.strokeStyle = '#2E2740'; c.lineWidth = Math.max(1, w / 300);
      c.beginPath(); for (let k = 0; k <= 6; k++) { c.moveTo(x + bw * (0.26 + k * 0.08), fy + fh * 0.24); c.lineTo(x + bw * (0.26 + k * 0.08), fy + fh * 0.32); } c.stroke();
      c.fillStyle = '#2E2740'; c.fillRect(x + bw * 0.24, fy + fh * 0.32, bw * 0.52, fh * 0.012);
      // porte bleue en arc
      const dx = x + bw * 0.22, dw = bw * 0.56, dtop = fy + fh * 0.48;
      c.fillStyle = '#2F5DA8';
      c.beginPath(); c.moveTo(dx, fy + fh); c.lineTo(dx, dtop + dw / 2); c.arc(dx + dw / 2, dtop + dw / 2, dw / 2, Math.PI, 0); c.lineTo(dx + dw, fy + fh); c.closePath(); c.fill();
      c.strokeStyle = '#1E3F78'; c.lineWidth = Math.max(1, w / 220); c.stroke();
      c.beginPath(); c.moveTo(dx + dw / 2, dtop + dw * 0.5); c.lineTo(dx + dw / 2, fy + fh); c.stroke();
      c.fillStyle = '#C9D9EE'; c.beginPath(); c.arc(dx + dw / 2, dtop + dw / 2, dw * 0.18, 0, 7); c.fill();
    }
    // pavés clairs
    c.fillStyle = vgrad(c, fy + fh, h, [[0, '#D8D3CC'], [1, '#EDE9E3']]);
    c.fillRect(0, fy + fh, w, h);
    c.strokeStyle = 'rgba(150,140,130,0.35)'; c.lineWidth = Math.max(1, w / 400);
    for (let j = 1; j < 9; j++) { const y = fy + fh + (h - fy - fh) * (j / 9) ** 1.5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // bornes
    c.fillStyle = '#5A5E68';
    for (let i = 0; i < 5; i++) roundRect(c, w * (0.08 + i * 0.22), fy + fh + h * 0.01, w * 0.015, h * 0.04, w * 0.006), c.fill();
    const ph = h * 0.62;
    person(c, 'radia', w * 0.55, h * 0.97, ph, { outfit: 'stripes', expr: 'smile', step: 0.8 });
  },
  royaume: (c, w, h) => {
    allLayers(c, 'royaume', w, h);
    glow(c, w * 0.5, h * 0.55, Math.min(w, h) * 0.5, PAL.or, 0.45);
    person(c, 'radia', w * 0.5, h * 0.95, h * 0.62, { outfit: 'royal', expr: 'love', arms: 'wave' });
    for (const [x, y] of [[0.25, 0.35], [0.75, 0.3], [0.8, 0.6], [0.2, 0.62]]) sparkle(c, w * x, h * y, Math.min(w, h) * 0.03, PAL.or);
  },
  monde: (c, w, h) => {
    drawBackground(c, 'monde', w, h, 'far');
    drawBackground(c, 'monde', w, h, 'mid');
    // petite planète ronde
    const r = Math.min(w * 0.46, h * 0.3);
    const cx = w * 0.5, cy = h * 0.98 + r * 0.25;
    glow(c, cx, cy - r * 0.2, r * 1.6, '#FFE7A0', 0.55);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#D7F0C6'); g.addColorStop(0.6, '#9ED69B'); g.addColorStop(1, '#6BAF7A');
    c.fillStyle = g; c.fill();
    c.lineWidth = Math.max(1.5, w / 180); c.strokeStyle = OUTLINE; c.stroke();
    // motifs posés sur la planète
    const onPlanet = (ang: number, draw: (x: number, y: number) => void) => {
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2); draw(0, 0); c.restore();
    };
    const u = r / 160;
    onPlanet(-Math.PI / 2 - 0.62, (x, y) => eiffelSil(c, x, y, 90 * u, '#E8A0BE'));
    onPlanet(-Math.PI / 2 + 0.62, (x, y) => ivoryTower(c, x, y, 26 * u, 56 * u, u));
    onPlanet(-Math.PI / 2 - 0.36, (x, y) => { foliage(c, x, y - 10 * u, 22 * u, PAL.leafDeep, 2, 6, PAL.roseVif); });
    onPlanet(-Math.PI / 2 + 0.36, (x, y) => { smallFlower(c, x, y - 6 * u, 10 * u, PAL.roseVif); smallFlower(c, x + 16 * u, y - 4 * u, 8 * u, PAL.lavande); });
    const ph = Math.min(h * 0.5, r * 1.5);
    person(c, 'auguste', cx - r * 0.2, cy - r + r * 0.03, ph * 1.04, { expr: 'love', arms: 'heart' });
    person(c, 'radia', cx + r * 0.2, cy - r + r * 0.03, ph, { expr: 'love', outfit: 'royal' });
    heartPath(c, cx, cy - r - ph * 0.92, r * 0.18); c.fillStyle = PAL.roseVif; c.fill();
    c.lineWidth = Math.max(1, w / 220); c.strokeStyle = OUTLINE; c.stroke();
    for (const [x, y] of [[0.15, 0.2], [0.85, 0.16], [0.1, 0.5], [0.9, 0.5]]) {
      starPath(c, w * x, h * y, Math.min(w, h) * 0.03, Math.min(w, h) * 0.013, 5); c.fillStyle = PAL.or; c.fill();
    }
  },
};

export function drawMemory(ctx: CanvasRenderingContext2D, id: string, w: number, h: number): void {
  const fn = MEMS[id];
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  if (fn) fn(ctx, w, h);
  else { ctx.fillStyle = PAL.rose; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}
