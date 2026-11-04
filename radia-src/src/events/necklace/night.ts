/**
 * Décor de la scène du feu d'artifice : terrasse élégante sur Paris de nuit (ciel étoilé, Tour Eiffel, toits et
 * lumières de la ville, balustrade, fleurs, guirlandes). Couche statique rendue une fois par taille ;
 * couche vivante (étoiles qui scintillent, lumières de la ville, flammes) redessinée à chaque image.
 */
import { seeded, makeCanvas, heartPath } from '../../game/art/kit';
import { eiffel } from '../places/common';

export interface NightLayout {
  w: number; h: number;
  /** ligne des pieds des personnages, haut de la balustrade, base de la terrasse */
  feet: number; rail: number; floor: number;
}

export function nightLayout(w: number, h: number): NightLayout {
  const feet = Math.max(h * 0.72, h - 112);
  const floor = feet - h * 0.115;
  const rail = floor - h * 0.085;
  return { w, h, feet, rail, floor };
}

type C = CanvasRenderingContext2D;
const glowDot = (g: C, x: number, y: number, r: number, color: string, a: number): void => {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
};

/** Positions des lumières « vivantes » (déterministes par taille). */
export function cityLights(L: NightLayout): { x: number; y: number; r: number; ph: number }[] {
  const r = seeded(4242);
  const out: { x: number; y: number; r: number; ph: number }[] = [];
  for (let i = 0; i < 46; i++) out.push({ x: r() * L.w, y: L.rail - r() * L.h * 0.1 - 4, r: 3 + r() * 5, ph: r() * 6.28 });
  return out;
}
export function garlandBulbs(L: NightLayout): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const y0 = L.rail - L.h * 0.17;
  for (let i = 0; i <= 14; i++) { const t = i / 14; out.push({ x: t * L.w, y: y0 + Math.sin(t * Math.PI) * L.h * 0.035 }); }
  return out;
}

function skyLayer(g: C, L: NightLayout): void {
  const { w } = L;
  const sk = g.createLinearGradient(0, 0, 0, L.rail);
  sk.addColorStop(0, '#0a0826'); sk.addColorStop(0.45, '#1a1452'); sk.addColorStop(0.78, '#46306f'); sk.addColorStop(0.93, '#b0577f'); sk.addColorStop(1, '#f0a07c');
  g.fillStyle = sk; g.fillRect(0, 0, w, L.rail + 2);
  const r = seeded(31);
  for (let i = 0; i < 150; i++) {
    const x = r() * w, y = r() * (L.rail * 0.8), s = 0.5 + r() * 1.3;
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  // lune en croissant, halo doux
  const mx = w * 0.84, my = L.rail * 0.2;
  glowDot(g, mx, my, 70, 'rgba(255,240,200,0.9)', 0.35);
  g.fillStyle = '#fff3d4'; g.beginPath(); g.arc(mx, my, 17, 0, 7); g.fill();
  g.fillStyle = '#1a1452'; g.beginPath(); g.arc(mx + 7, my - 4, 15, 0, 7); g.fill();
}

function cityLayer(g: C, L: NightLayout): void {
  const { w } = L;
  // lueur de l'horizon
  glowDot(g, w * 0.5, L.rail, w * 0.75, 'rgba(255,170,130,1)', 0.45);
  const base = L.rail;
  // rangées de toits (lointain → proche), fenêtres chaudes
  const rows: { h: number; col: string; win: string; seed: number }[] = [
    { h: L.h * 0.1, col: '#3a2a68', win: 'rgba(255,214,150,0.65)', seed: 5 },
    { h: L.h * 0.075, col: '#2a1f55', win: 'rgba(255,205,130,0.85)', seed: 9 },
  ];
  // Tour Eiffel (derrière la 2e rangée)
  eiffel(g, w * 0.2, base, Math.max(0.5, L.h / 800), '#2a1d52', null);
  rows.forEach((row) => {
    const r = seeded(row.seed);
    let x = -6;
    while (x < w + 6) {
      const bw = 22 + r() * 30, bh = row.h * (0.35 + r() * 0.65);
      g.fillStyle = row.col; g.fillRect(x, base - bh, bw, bh + 3);
      if (r() > 0.6) { g.fillStyle = row.col; g.beginPath(); g.moveTo(x - 1, base - bh); g.lineTo(x + bw / 2, base - bh - 6); g.lineTo(x + bw + 1, base - bh); g.fill(); }
      g.fillStyle = row.win;
      for (let yy = base - bh + 5; yy < base - 5; yy += 8) for (let xx = x + 4; xx < x + bw - 4; xx += 7) if (r() > 0.58) g.fillRect(xx, yy, 2.6, 3.6);
      x += bw + 1;
    }
  });
}

function flowerBush(g: C, cx: number, baseY: number, s: number, seed: number): void {
  const r = seeded(seed);
  // vasque en pierre
  g.fillStyle = '#cbbfd6'; g.beginPath(); g.moveTo(cx - 24 * s, baseY - 26 * s); g.lineTo(cx + 24 * s, baseY - 26 * s); g.lineTo(cx + 17 * s, baseY); g.lineTo(cx - 17 * s, baseY); g.closePath(); g.fill();
  g.fillStyle = '#e4dbee'; g.fillRect(cx - 27 * s, baseY - 31 * s, 54 * s, 7 * s);
  g.strokeStyle = 'rgba(70,50,90,0.35)'; g.lineWidth = 1; g.strokeRect(cx - 27 * s, baseY - 31 * s, 54 * s, 7 * s);
  // feuillage puis fleurs roses et blanches
  for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + r() * 0.8); const d = (18 + r() * 34) * s; g.fillStyle = r() > 0.5 ? '#2f7a55' : '#3f9a68'; g.beginPath(); g.ellipse(cx + Math.cos(a) * d * 0.9, baseY - 30 * s + Math.sin(a) * d, 9 * s, 5.5 * s, a, 0, 7); g.fill(); }
  const cols = ['#ff8fb6', '#ffd0e0', '#ffffff', '#f06a9a', '#ffc2d6'];
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI * (0.05 + r() * 0.9); const d = (10 + r() * 38) * s;
    const x = cx + Math.cos(a) * d, y = baseY - 32 * s + Math.sin(a) * d * 1.05;
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(x, y, (4 + r() * 3.5) * s, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,230,120,0.9)'; g.beginPath(); g.arc(x, y, 1.4 * s, 0, 7); g.fill();
  }
}

function terraceLayer(g: C, L: NightLayout): void {
  const { w, h, rail, floor, feet } = L;
  // sol : dalles en perspective
  const fg = g.createLinearGradient(0, floor, 0, h);
  fg.addColorStop(0, '#4a3a7c'); fg.addColorStop(1, '#251b4a');
  g.fillStyle = fg; g.fillRect(0, floor, w, h - floor);
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
  for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(w / 2 + i * 22, floor); g.lineTo(w / 2 + i * 110, h); g.stroke(); }
  for (let k = 1; k <= 5; k++) { const y = floor + (h - floor) * (k * k) / 28; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // balustrade : main courante, balustres, socle
  g.fillStyle = '#6a58a4'; g.fillRect(0, rail, w, h * 0.014);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, rail, w, 1.6);
  const bw = Math.max(7, w * 0.024), gap = bw * 1.9;
  for (let x = gap / 2 - bw / 2; x < w; x += gap) {
    const bg = g.createLinearGradient(x, 0, x + bw, 0); bg.addColorStop(0, '#8b78c6'); bg.addColorStop(0.5, '#a894dc'); bg.addColorStop(1, '#6a58a4');
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, rail + h * 0.016, bw, floor - rail - h * 0.016, bw * 0.45); g.fill();
  }
  g.fillStyle = '#5b4890'; g.fillRect(0, floor - h * 0.008, w, h * 0.016);
  // fleurs sur la balustrade (petite guirlande de roses)
  const r = seeded(77);
  for (let x = 10; x < w; x += 15 + r() * 10) { g.fillStyle = r() > 0.5 ? '#ff8fb6' : '#ffe0ea'; g.beginPath(); g.arc(x, rail - 1 + r() * 3, 2.6 + r() * 2, 0, 7); g.fill(); }
  // grandes vasques fleuries aux deux extrémités (au premier plan)
  flowerBush(g, w * 0.075, feet + h * 0.045, Math.max(0.9, h / 700), 3);
  flowerBush(g, w * 0.925, feet + h * 0.045, Math.max(0.9, h / 700), 8);
  // guirlande lumineuse (fil)
  const bulbs = garlandBulbs(L);
  g.strokeStyle = 'rgba(40,30,70,0.8)'; g.lineWidth = 1.2; g.beginPath(); bulbs.forEach((b, i) => (i ? g.lineTo(b.x, b.y) : g.moveTo(b.x, b.y))); g.stroke();
}

/** Dessine le décor statique directement (illustration du souvenir : indépendant de la résolution). */
export function drawNightBackground(g: C, w: number, h: number): void {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  const L = nightLayout(w, h);
  skyLayer(g, L); cityLayer(g, L); terraceLayer(g, L);
  g.restore();
}

const cache = new Map<string, HTMLCanvasElement>();

/** Couche statique (pixels = w × h × dpr), mise en cache. */
export function nightStatic(w: number, h: number, dpr: number): HTMLCanvasElement {
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  drawNightBackground(g, w, h);
  if (cache.size >= 4) cache.delete(cache.keys().next().value as string);
  cache.set(key, c);
  return c;
}

/** Couche vivante : étoiles, lumières de la ville, ampoules de la guirlande, lueur des fleurs. `glowK` ∈ [0,1] : intensité des reflets. */
export function nightLive(g: C, L: NightLayout, t: number, calm: boolean): void {
  const lights = cityLights(L);
  lights.forEach((p, i) => glowDot(g, p.x, p.y, p.r * 2.2, '#ffcf7a', calm ? 0.3 : 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph + i))));
  garlandBulbs(L).forEach((b, i) => { glowDot(g, b.x, b.y + 2, 11, '#ffe9a8', calm ? 0.55 : 0.45 + 0.25 * Math.sin(t * 2.2 + i * 1.3)); g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(b.x, b.y + 2, 1.8, 0, 7); g.fill(); });
  if (!calm) {
    const r = seeded(99);
    for (let i = 0; i < 16; i++) {
      const x = r() * L.w, y = r() * L.rail * 0.7, ph = r() * 6.28;
      const a = 0.5 + 0.5 * Math.sin(t * 2 + ph);
      g.fillStyle = `rgba(255,255,255,${0.35 * a})`; g.fillRect(x - 0.6, y - 3, 1.2, 6); g.fillRect(x - 3, y - 0.6, 6, 1.2);
    }
  }
}

/** Petit cœur flottant (décor romantique de la fin). */
export function floatHeart(g: C, x: number, y: number, s: number, a: number, color = '#ff8fb6'): void {
  g.save(); g.globalAlpha = a; heartPath(g, x, y, s); g.fillStyle = color; g.fill(); g.restore();
}
