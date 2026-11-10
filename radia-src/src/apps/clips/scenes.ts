/**
 * TikTak : scènes ANIMÉES en Canvas 2D (boucles de 3 à 6 s) générées à partir des dessins du jeu
 * (décors, Radia, Auguste, chat, fleurs, chocolats, meubles). Aucune vidéo, aucun média externe.
 * `makeScene(spec, env)` renvoie une fonction `draw(g, W, H, t)` (t en secondes, boucle gérée par l'appelant).
 */
import type { PhotoRec, PlaceId } from '../../events/types';
import { drawPlace } from '../../events/places';
import { drawPhoto } from '../../events/photo/render';
import { drawCat, type CatOpts, type CatPose } from '../../game/art/world/cat';
import { drawFlower, type Stage } from '../../game/art/world/garden';
import { drawChocolate } from '../../game/art/world/chocolate';
import { drawFurniture } from '../../game/art/world/furniture';
import { radiaBustCanvas } from '../../game/art/world/radiaNow';
import { currentLook } from '../../game/world/look';
import { heartPath, sparkle, makeCanvas } from '../../game/art/kit';
import type { FlowerId, ChocId, FurnitureId, Look, ClothId } from '../../data/world/ids';
import { FLOWER_IDS, CHOC_IDS, FURNITURE_IDS } from '../../data/world/ids';
import { radiaSprite, augusteSprite } from '../art';
import { drawSnap, type SnapMeta } from '../snap/render';
import { PALETTES, type SceneSpec } from './gen';
import { hash, rng } from '../util';

import { PARTNER } from '../../config/gift';
type G = CanvasRenderingContext2D;
export const SW = 288, SH = 512;
export interface SceneEnv {
  fans: number;
  title: string;
  dur: number;
  catOpts?: CatOpts;
  /** Photo de l'album + autocollants (scène « still »). */
  photo?: (id: string) => { rec: PhotoRec; meta: SnapMeta } | null;
}
export type SceneDraw = (g: G, W: number, H: number, t: number) => void;

const TAU = Math.PI * 2;
const ease = (x: number): number => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const asPlace = (p: string | undefined, d: PlaceId): PlaceId => (p ? (p as PlaceId) : d);

function bgGradient(g: G, W: number, H: number, pal: number): void {
  const p = PALETTES[pal % PALETTES.length];
  const gr = g.createLinearGradient(0, 0, W * 0.3, H);
  gr.addColorStop(0, p[0]); gr.addColorStop(0.55, p[1]); gr.addColorStop(1, p[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
/** Fond : décor du jeu (si `place`), sinon dégradé. */
function bg(g: G, W: number, H: number, t: number, place: string | undefined, pal: number): void {
  if (place) drawPlace(g, asPlace(place, 'home'), W, H, t); else bgGradient(g, W, H, pal);
}
/** Voile de lumière tournant selon la palette (variété visuelle d'un clip à l'autre). */
function leak(g: G, W: number, H: number, t: number, pal: number): void {
  const p = PALETTES[pal % PALETTES.length];
  g.save(); g.globalCompositeOperation = 'soft-light';
  const cx = W * (0.5 + 0.4 * Math.cos(t * 0.9 + pal)), cy = H * (0.35 + 0.2 * Math.sin(t * 0.7));
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.7);
  gr.addColorStop(0, p[1]); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
}
function shadow(g: G, x: number, y: number, rx: number): void { g.fillStyle = 'rgba(50,30,70,0.25)'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.16, 0, 0, TAU); g.fill(); }
function heartsRise(g: G, W: number, H: number, t: number, n: number, seed: number, color = '#ff6f9f', speed = 0.18): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, off = r(), sz = 5 + r() * 9, sw = 8 + r() * 14, sp = speed * (0.7 + r() * 0.7);
    const q = (t * sp + off) % 1;
    const y = H * (1.05 - q * 1.15);
    g.save(); g.globalAlpha = Math.sin(q * Math.PI) * 0.9;
    heartPath(g, x0 + Math.sin(q * 9 + i) * sw, y, sz); g.fillStyle = color; g.fill(); g.restore();
  }
}
function sparks(g: G, W: number, H: number, t: number, n: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H * 0.9, ph = r() * TAU, s = 3 + r() * 6;
    const a = Math.max(0, Math.sin(t * 3 + ph));
    if (a > 0.05) sparkle(g, x, y, s * a + 1, '#ffffff', 0.9 * a);
  }
}
function flash(g: G, W: number, H: number, a: number): void { if (a > 0.01) { g.save(); g.fillStyle = `rgba(255,255,255,${Math.min(1, a)})`; g.fillRect(0, 0, W, H); g.restore(); } }
function sprite(g: G, spr: HTMLCanvasElement, cx: number, ground: number, hgt: number, sx = 1, tilt = 0): void {
  const w = hgt * (spr.width / spr.height);
  g.save(); g.translate(cx, ground); g.rotate(tilt); g.scale(sx, 1);
  g.drawImage(spr, -w / 2, -hgt, w, hgt); g.restore();
}
function bubble(g: G, x: number, y: number, text: string, maxW: number, tail: 'l' | 'r' = 'l'): void {
  const fs = 15;
  g.save(); g.font = `600 ${fs}px Fredoka, "Avenir Next", sans-serif`; g.textBaseline = 'top';
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (g.measureText(nx).width > maxW - 22 && cur) { lines.push(cur); cur = w; } else cur = nx; }
  if (cur) lines.push(cur);
  const bw = Math.min(maxW, Math.max(...lines.map((l) => g.measureText(l).width)) + 22), bh = lines.length * (fs + 3) + 16;
  g.beginPath(); g.roundRect(x, y, bw, bh, 14); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#58433f'; g.stroke();
  g.beginPath(); const tx = tail === 'l' ? x + 22 : x + bw - 22; g.moveTo(tx - 8, y + bh - 1); g.lineTo(tx + (tail === 'l' ? -6 : 6), y + bh + 14); g.lineTo(tx + 8, y + bh - 1); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
  g.fillStyle = '#58433f'; lines.forEach((l, i) => g.fillText(l, x + 11, y + 8 + i * (fs + 3)));
  g.restore();
}
const FRAME_BY_PAL = ['rose', 'or', 'lavande', 'coeurs'];
const FILTER_BY_PAL = ['doux', 'chaud', 'rose', 'doux'];

// ---------------------------------------------------------------- scènes
function sceneShow(s: SceneSpec, env: SceneEnv): SceneDraw {
  const mode = s.mode ?? 'catwalk', pal = s.pal ?? 0, dur = env.dur;
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'stage', pal);
    // faisceaux de projecteurs
    g.save(); g.globalCompositeOperation = 'screen';
    const cols = ['rgba(255,214,120,0.38)', 'rgba(255,120,190,0.34)', 'rgba(130,170,255,0.32)'];
    for (let i = 0; i < 3; i++) {
      const sx = W * (0.2 + i * 0.3), ang = Math.sin(t * 1.3 + i * 2) * (mode === 'concert' ? 0.5 : 0.18);
      g.save(); g.translate(sx, -10); g.rotate(ang);
      const gr = g.createLinearGradient(0, 0, 0, H * 0.95); gr.addColorStop(0, cols[(i + pal) % 3]); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(W * 0.24, H * 0.95); g.lineTo(-W * 0.24, H * 0.95); g.fill(); g.restore();
    }
    g.restore();
    if (mode === 'catwalk') {
      // podium en perspective
      g.fillStyle = 'rgba(255,240,248,0.55)'; g.beginPath(); g.moveTo(W * 0.42, H * 0.52); g.lineTo(W * 0.58, H * 0.52); g.lineTo(W * 0.94, H * 0.96); g.lineTo(W * 0.06, H * 0.96); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke();
      const q = ease(p * 1.25);
      const h = H * (0.3 + 0.36 * q), ground = H * (0.6 + 0.3 * q);
      shadow(g, W / 2, ground, h * 0.17);
      sprite(g, radiaSprite(192, 480, p > 0.75 ? 'laugh' : 'smile', p > 0.82 ? 'wave' : 'down', Math.sin(t * 6) * 0.8), W / 2 + Math.sin(p * TAU * 2) * W * 0.03 * q, ground, h);
      for (const ft of [0.18, 0.4, 0.62, 0.85]) flash(g, W, H, 0.7 * Math.max(0, 1 - Math.abs(((p - ft + 1) % 1)) * 12));
    } else if (mode === 'concert') {
      // foule en silhouette + mains levées
      g.fillStyle = 'rgba(30,18,50,0.85)';
      for (let i = 0; i < 12; i++) { const x = (i + 0.5) * W / 12, y = H * 0.93 + Math.sin(t * 3 + i) * 4; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); g.fillRect(x - 3, y - 36 - Math.max(0, Math.sin(t * 4 + i * 1.7)) * 12, 6, 30); }
      shadow(g, W / 2, H * 0.84, 56);
      const bob = Math.sin(t * 5) * 4;
      sprite(g, radiaSprite(192, 480, 'laugh', p % 0.5 < 0.25 ? 'wave' : 'open', Math.sin(t * 5) * 0.6), W / 2, H * 0.86 + bob, H * 0.62);
      // micro
      g.strokeStyle = '#58433f'; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.4, H * 0.86); g.lineTo(W * 0.4, H * 0.5); g.stroke(); g.fillStyle = '#9fb4c7'; g.beginPath(); g.arc(W * 0.4, H * 0.49, 7, 0, TAU); g.fill(); g.stroke();
      heartsRise(g, W, H, t, 10, 3, '#ff9cc2', 0.22);
    } else {
      // rideau qui s'ouvre puis salut
      const open = ease(p * 2.2);
      const h = H * 0.64;
      g.save(); g.fillStyle = 'rgba(255,225,120,0.18)'; g.beginPath(); g.ellipse(W / 2, H * 0.86, W * 0.4, 14, 0, 0, TAU); g.fill(); g.restore();
      shadow(g, W / 2, H * 0.87, 50);
      const bow = p > 0.7 ? Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.12 : 0;
      sprite(g, radiaSprite(192, 480, 'smile', p > 0.45 ? 'open' : 'down', 0), W / 2, H * 0.87, h, 1, bow);
      const cw = W * 0.5 * (1 - open) + 6;
      for (const sd of [0, 1]) {
        const x = sd ? W - cw : 0;
        const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, '#a82848'); gr.addColorStop(0.5, '#d9486d'); gr.addColorStop(1, '#a82848');
        g.fillStyle = gr; g.fillRect(x, 0, cw, H);
        g.strokeStyle = 'rgba(80,10,30,0.35)'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (cw * k) / 4, 0); g.lineTo(x + (cw * k) / 4, H); g.stroke(); }
      }
    }
    sparks(g, W, H, t, 14, 11);
    leak(g, W, H, t, pal);
  };
}

function cardRec(s: SceneSpec, env: SceneEnv, pose: number, aug: boolean): PhotoRec {
  const pal = s.pal ?? 0;
  return { id: 'clip', eventId: 'clip', place: asPlace(s.place, 'rooftop'), title: env.title.slice(0, 28), ts: 0, look: currentLook(), auguste: aug, kids: [], pose, frame: s.frame ?? FRAME_BY_PAL[pal % 4], filter: s.filter ?? FILTER_BY_PAL[pal % 4] };
}
/** Carte-photo animée sur fond flouté (rafraîchie ~12 i/s pour rester légère). */
function sceneCard(s: SceneSpec, env: SceneEnv, aug: boolean): SceneDraw {
  const pal = s.pal ?? 0, dur = env.dur;
  const base = s.pose ?? 0;
  const poses = s.mode === 'flash' ? [base, base + 1, base + 2].map((x) => Math.min(10, x)) : [base];
  let card: HTMLCanvasElement | null = null; let last = -1; let lastPose = -1; let gap = 0.083;
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'rooftop', pal);
    g.fillStyle = 'rgba(40,20,60,0.35)'; g.fillRect(0, 0, W, H);
    const idx = Math.min(poses.length - 1, Math.floor(p * poses.length));
    const cw = W * 0.84, ch = cw * 1.25;
    if (!card) card = makeCanvas(Math.round(cw * 1.6), Math.round(ch * 1.6));
    if (idx !== lastPose || t < last || t - last > gap || last < 0) {
      const cg = card.getContext('2d')!; cg.clearRect(0, 0, card.width, card.height);
      const t1 = performance.now();
      drawPhoto(cg, cardRec(s, env, poses[idx], aug), card.width, card.height, t); last = t; lastPose = idx;
      gap = Math.min(0.5, Math.max(0.083, ((performance.now() - t1) / 1000) * 3)); // la carte se rafraîchit moins vite si le dessin est coûteux
    }
    const zoom = 1 + 0.03 * Math.sin(p * TAU / 1) , tilt = Math.sin(t * 0.9) * 0.025;
    g.save(); g.translate(W / 2, H * 0.47); g.rotate(tilt); g.scale(zoom, zoom);
    g.shadowColor = 'rgba(30,10,50,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.drawImage(card, -cw / 2, -ch / 2, cw, ch); g.restore();
    heartsRise(g, W, H, t, 9, 5 + pal, '#ff9cc2', 0.2);
    if (s.mode === 'flash') { const seg = (p * poses.length) % 1; flash(g, W, H, 0.9 * Math.max(0, 1 - seg * 7)); }
    sparks(g, W, H, t, 10, 21);
    leak(g, W, H, t, pal);
  };
}

function sceneTwirl(s: SceneSpec, env: SceneEnv): SceneDraw {
  const pal = s.pal ?? 0, dur = env.dur;
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'boutique', pal);
    const ph = p * TAU * 2;
    const sx = 0.4 + 0.6 * Math.abs(Math.cos(ph / 2));
    const h = H * 0.66, ground = H * 0.88;
    shadow(g, W / 2, ground, h * 0.2 * sx + 8);
    sprite(g, radiaSprite(192, 480, p > 0.5 ? 'laugh' : 'smile', p > 0.7 ? 'wave' : 'down', 0), W / 2, ground - Math.abs(Math.sin(ph)) * 6, h, sx);
    if (s.mode === 'flash') flash(g, W, H, 0.8 * Math.max(0, 1 - ((p * 3) % 1) * 8));
    heartsRise(g, W, H, t, 7, 8, '#ff9cc2');
    sparks(g, W, H, t, 16, 31);
    leak(g, W, H, t, pal);
  };
}

function sceneDress(s: SceneSpec, env: SceneEnv): SceneDraw {
  const ids = (s.items ?? '').split(',').filter(Boolean) as ClothId[];
  const pal = s.pal ?? 0, dur = env.dur;
  const base = currentLook();
  const looks: Look[] = ids.map((id) => ({ ...base, top: null, bottom: null, dress: id, jacket: null }));
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'boutique', pal);
    const n = Math.max(1, looks.length);
    const idx = Math.min(n - 1, Math.floor(p * n));
    const q = (p * n) % 1;
    const enter = ease(q * 3.5), leave = q > 0.82 ? ease((q - 0.82) / 0.18) : 0;
    const x = W / 2 + (1 - enter) * W * 0.7 - leave * W * 0.7;
    const spr = radiaSprite(192, 480, 'smile', q > 0.4 ? 'open' : 'down', 0, looks[idx] ?? base);
    shadow(g, x, H * 0.88, 52);
    sprite(g, spr, x, H * 0.88, H * 0.68);
    // pastilles de la collection
    for (let i = 0; i < n; i++) { g.beginPath(); g.arc(W / 2 + (i - (n - 1) / 2) * 16, H * 0.94, i === idx ? 5 : 3.5, 0, TAU); g.fillStyle = i === idx ? '#ffffff' : 'rgba(255,255,255,0.5)'; g.fill(); }
    sparks(g, W, H, t, 14, 41);
    leak(g, W, H, t, pal);
  };
}

function sceneCat(s: SceneSpec, env: SceneEnv): SceneDraw {
  const pal = s.pal ?? 0, dur = env.dur;
  const main = (s.catPose ?? 'sit') as CatPose;
  const alt: CatPose[] = main === 'sleep' ? ['sleep'] : main === 'eat' ? ['eat', 'sit'] : ['sit', main, 'purr'];
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'home', pal);
    const pose = main === 'sleep' ? 'sleep' : alt[Math.min(alt.length - 1, Math.floor(p * alt.length))];
    const bounce = pose === 'play' ? Math.abs(Math.sin(t * 6)) * 14 : 0;
    g.save(); g.translate(W * 0.1, H * 0.46 - bounce);
    drawCat(g, pose, W * 0.8, W * 0.8 * 0.9, t, { ...(env.catOpts ?? {}), toy: pose === 'play', blink: Math.sin(t * 1.3) > 0.97 });
    g.restore();
    if (pose === 'play') { const bx = W * 0.2 + Math.abs(Math.sin(t * 2.2)) * W * 0.12, by = H * 0.8 - Math.abs(Math.sin(t * 6)) * 40; g.beginPath(); g.arc(bx, by, 11, 0, TAU); g.fillStyle = '#ff6f9f'; g.fill(); g.strokeStyle = '#58433f'; g.lineWidth = 2; g.stroke(); }
    heartsRise(g, W, H, t, pose === 'purr' ? 12 : 6, 17, '#ff8fb5', 0.17);
    sparks(g, W, H, t, 8, 51);
    leak(g, W, H, t, pal);
  };
}

function sceneBloom(s: SceneSpec, env: SceneEnv): SceneDraw {
  const ids = (s.items ?? 'rose').split(',').filter((x): x is FlowerId => (FLOWER_IDS as readonly string[]).includes(x));
  const list = ids.length ? ids : (['rose'] as FlowerId[]);
  const pal = s.pal ?? 0, dur = env.dur;
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bg(g, W, H, t, s.place ?? 'garden', pal);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, W, H);
    const n = list.length;
    const idx = Math.min(n - 1, Math.floor(p * n));
    const q = (p * n) % 1;
    const stage = Math.min(3, Math.floor(q * 3.6)) as Stage;
    const size = W * 0.92;
    g.fillStyle = '#7a5538'; g.beginPath(); g.ellipse(W / 2, H * 0.78, W * 0.26, 16, 0, 0, TAU); g.fill();
    const pop = stage === 3 ? 1 + 0.05 * Math.sin((q * 3.6 - 3) * 8) * Math.max(0, 1 - (q * 3.6 - 3) * 2) : 1;
    g.save(); g.translate(W / 2 - size / 2, H * 0.78 - size * 0.9); g.translate(size / 2, size); g.scale(pop, pop); g.translate(-size / 2, -size);
    drawFlower(g, list[idx], stage, size, t); g.restore();
    if (stage === 3) { for (let i = 0; i < 7; i++) { const a = (t * 0.7 + i / 7) % 1; g.save(); g.globalAlpha = 1 - a; heartPath(g, W * (0.2 + 0.6 * ((i * 0.37) % 1)) + Math.sin(a * 8 + i) * 8, H * (0.35 + a * 0.5), 5); g.fillStyle = '#ffb3cf'; g.fill(); g.restore(); } }
    sparks(g, W, H, t, 12, 61);
    leak(g, W, H, t, pal);
  };
}

function sceneChoc(s: SceneSpec, _env: SceneEnv): SceneDraw {
  const ids = (s.items ?? 'milk').split(',').filter((x): x is ChocId => (CHOC_IDS as readonly string[]).includes(x));
  const list = ids.length ? ids : (['milk'] as ChocId[]);
  const pal = s.pal ?? 0;
  const r = rng(hash((s.items ?? '') + 'c'));
  const drops = Array.from({ length: 12 }, (_, i) => ({ id: list[i % list.length], x: 0.08 + r() * 0.84, off: r(), sz: 44 + r() * 28, rot: (r() - 0.5) * 2, sp: 0.35 + r() * 0.25 }));
  return (g, W, H, t) => {
    bgGradient(g, W, H, pal);
    // petit plateau
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.roundRect(W * 0.08, H * 0.82, W * 0.84, 14, 7); g.fill();
    for (const d of drops) {
      const q = (t * d.sp + d.off) % 1;
      const y = -d.sz + (H * 0.84 + d.sz) * q * q * 0.6 + (H * 0.84 + d.sz) * q * 0.4;
      g.save(); g.translate(W * d.x, y); g.rotate(d.rot * (1 + q * 3) + Math.sin(t) * 0.1); g.translate(-d.sz / 2, -d.sz / 2);
      drawChocolate(g, d.id, d.sz); g.restore();
    }
    // vedette au centre
    const hero = list[Math.floor(t / 1.3) % list.length], sz = W * 0.5, pop = 1 + 0.06 * Math.sin(t * 4);
    g.save(); g.translate(W / 2, H * 0.52); g.scale(pop, pop); g.rotate(Math.sin(t * 1.5) * 0.12); g.translate(-sz / 2, -sz / 2); drawChocolate(g, hero, sz); g.restore();
    heartsRise(g, W, H, t, 6, 71, '#ffffff', 0.15);
    sparks(g, W, H, t, 14, 72);
    leak(g, W, H, t, pal);
  };
}

function sceneDecor(s: SceneSpec, env: SceneEnv): SceneDraw {
  const ids = (s.items ?? '').split(',').filter((x): x is FurnitureId => (FURNITURE_IDS as readonly string[]).includes(x));
  const list = ids.length ? ids : (['sofa', 'lamp-floor'] as FurnitureId[]);
  const pal = s.pal ?? 0, dur = env.dur;
  const slots = [[0.5, 0.74, 0.62], [0.2, 0.62, 0.3], [0.8, 0.6, 0.32], [0.5, 0.44, 0.4]];
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    const pl = PALETTES[pal % 4];
    g.fillStyle = pl[0]; g.fillRect(0, 0, W, H * 0.7);
    g.fillStyle = pl[1]; g.fillRect(0, H * 0.7, W, H * 0.3);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, H * 0.7 - 3, W, 6);
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(W * i / 5, 0); g.lineTo(W * i / 5, H * 0.7); g.stroke(); }
    list.slice(0, 4).forEach((id, i) => {
      const [fx, fy, fs] = slots[i];
      const appear = i / (list.length + 0.5) * 0.6;
      const q = ease((p - appear) * 4);
      if (q <= 0) return;
      const size = W * fs * 1.5, pop = q < 1 ? 1 + Math.sin(q * Math.PI) * 0.18 : 1 + Math.sin(t * 2 + i) * 0.01;
      g.save(); g.translate(W * fx, H * fy + (1 - q) * -60); g.scale(pop * q, pop * q); g.translate(-size / 2, -size);
      drawFurniture(g, id, size, size); g.restore();
    });
    sparks(g, W, H, t, 14, 81);
    leak(g, W, H, t, pal);
  };
}

function sceneFans(s: SceneSpec, env: SceneEnv): SceneDraw {
  const pal = s.pal ?? 0, dur = env.dur;
  const line = s.line ?? 'Merci à tous ♡';
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bgGradient(g, W, H, pal);
    const bust = radiaBustCanvas('love', 360);
    const bw = W * 0.8, bh = bw * (bust.height / bust.width);
    g.drawImage(bust, W / 2 - bw / 2, H * 0.12 + Math.sin(t * 2) * 3, bw, bh);
    // compteur qui grimpe (reflète les fans du jeu)
    const total = Math.max(0, env.fans);
    const from = Math.max(0, total - Math.max(12, Math.round(total * 0.02)));
    const v = Math.round(from + (total - from) * ease(p * 1.6));
    g.font = '700 46px Fredoka, "Avenir Next", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.fillStyle = '#e8558f';
    const txt = v.toLocaleString('fr-FR'); g.strokeText(txt, W / 2, H * 0.72); g.fillText(txt, W / 2, H * 0.72);
    g.font = '700 16px Fredoka, sans-serif'; g.lineWidth = 4; g.strokeText('fans', W / 2, H * 0.72 + 34); g.fillStyle = '#58433f'; g.fillText('fans', W / 2, H * 0.72 + 34);
    g.font = '600 17px Fredoka, sans-serif'; g.fillStyle = '#ffffff'; g.lineWidth = 4; g.strokeStyle = 'rgba(88,67,63,0.8)'; g.strokeText(line, W / 2, H * 0.9); g.fillText(line, W / 2, H * 0.9);
    heartsRise(g, W, H, t, 22, 91, '#ff4f8b', 0.3);
    sparks(g, W, H, t, 14, 92);
    leak(g, W, H, t, pal);
  };
}

function sceneMeme(s: SceneSpec, env: SceneEnv): SceneDraw {
  const lines = (s.line ?? `${PARTNER} : « Coucou ! »`).split('|');
  const pal = s.pal ?? 0, dur = env.dur;
  return (g, W, H, t) => {
    const p = (t % dur) / dur;
    bgGradient(g, W, H, pal);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, H * 0.8, W, H * 0.2);
    const idx = Math.min(lines.length - 1, Math.floor(p * lines.length));
    const q = (p * lines.length) % 1;
    const who = lines[idx].startsWith('Radia') ? 1 : 0;
    const wob = Math.sin(t * 7) * 0.02 * (q < 0.5 ? 1 : 0);
    shadow(g, W * 0.3, H * 0.86, 38); shadow(g, W * 0.72, H * 0.86, 38);
    sprite(g, augusteSprite(176, 440, who === 0 ? 'tease' : 'smile', who === 0 ? 'wave' : 'down'), W * 0.3, H * 0.86, H * 0.5, 1, who === 0 ? wob : 0);
    sprite(g, radiaSprite(176, 440, who === 1 ? 'tease' : 'smile', who === 1 ? 'wave' : 'down'), W * 0.72, H * 0.86, H * 0.5, 1, who === 1 ? wob : 0);
    const shown = lines[idx].slice(0, Math.ceil(lines[idx].length * Math.min(1, q * 2.6)));
    bubble(g, W * 0.06, H * 0.1, shown || '…', W * 0.88, who === 0 ? 'l' : 'r');
    for (let i = 0; i < lines.length; i++) { g.beginPath(); g.arc(W / 2 + (i - (lines.length - 1) / 2) * 12, H * 0.96, i === idx ? 4 : 3, 0, TAU); g.fillStyle = i === idx ? '#ffffff' : 'rgba(255,255,255,0.5)'; g.fill(); }
    sparks(g, W, H, t, 8, 101);
  };
}

function sceneStill(s: SceneSpec, env: SceneEnv): SceneDraw {
  const pal = s.pal ?? 0, dur = env.dur;
  const fallback = sceneTwirl({ k: 'twirl', place: 'rooftop', pal }, env);
  return (g, W, H, t) => {
    const ph = s.photo ? env.photo?.(s.photo) : null;
    if (!ph) { fallback(g, W, H, t); return; }
    const p = (t % dur) / dur;
    bg(g, W, H, t, ph.rec.place, pal);
    g.fillStyle = 'rgba(40,20,60,0.45)'; g.fillRect(0, 0, W, H);
    const cw = W * 0.86, ch = cw * 1.25;
    const zoom = 1 + 0.04 * Math.sin(p * Math.PI);
    g.save(); g.translate(W / 2, H * 0.47); g.scale(zoom, zoom); g.rotate(Math.sin(t * 0.8) * 0.02);
    g.shadowColor = 'rgba(30,10,50,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.translate(-cw / 2, -ch / 2);
    g.save(); g.beginPath(); g.rect(0, 0, cw, ch); g.clip();
    drawSnap(g, ph.rec, ph.meta, cw, ch, t);
    g.restore(); g.restore();
    heartsRise(g, W, H, t, 8, 111, '#ff9cc2', 0.2);
    sparks(g, W, H, t, 12, 112);
    leak(g, W, H, t, pal);
  };
}

/** Fabrique la scène d'un clip. */
export function makeScene(spec: SceneSpec, env: SceneEnv): SceneDraw {
  switch (spec.k) {
    case 'show': return sceneShow(spec, env);
    case 'duo': return sceneCard(spec, env, true);
    case 'twirl': return sceneTwirl(spec, env);
    case 'cat': return sceneCat(spec, env);
    case 'bloom': return sceneBloom(spec, env);
    case 'choc': return sceneChoc(spec, env);
    case 'decor': return sceneDecor(spec, env);
    case 'fans': return sceneFans(spec, env);
    case 'meme': return sceneMeme(spec, env);
    case 'dress': return sceneDress(spec, env);
    case 'still': return sceneStill(spec, env);
    default: return sceneTwirl(spec, env);
  }
}
