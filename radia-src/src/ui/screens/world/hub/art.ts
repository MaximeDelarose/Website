/**
 * Illustrations du hub « Mon monde » (Canvas 2D vectoriel, DA Romantic Cozy Pop) :
 * le château de Radia en grand, et une petite scène par carte, construite d'après l'état réel
 * (tenue équipée, parcelles plantées, chocolats fabriqués, chat adopté, carrière en cours…).
 * Chaque canvas est mis en cache sous une clé qui contient ce qui change le dessin.
 */
import { PAL, paint, roundRect, seeded, sparkle, glow, groundShadow, heartPath, starPath, shade, OUTLINE } from '../../../../game/art/kit';
import { drawRadiaNow, lookKey, radiaBustCanvas, radiaFaceCanvas } from '../../../../game/art/world/radiaNow';
import { drawFlower } from '../../../../game/art/world/garden';
import { drawChocolate, drawChocSilhouette } from '../../../../game/art/world/chocolate';
import { drawKid } from '../../../../game/art/world/kids';
import { drawCat } from '../../../../game/art/world/cat';
import { drawPhotoDecor, drawRunway, drawConcertStage } from '../../../../game/art/world/careers';
import { stageAt, isReady } from '../../../../game/world/garden';
import { CHOC_IDS, FLOWER_IDS, CAREER_IDS, type CareerId, type ChocId, type FlowerId } from '../../../../data/world/ids';
import { CHOCS } from '../../../../data/world/chocolate';
import type { World } from '../../../../save/schema';

type C = CanvasRenderingContext2D;

const scale = (): number => Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
const cache = new Map<string, HTMLCanvasElement>();

/** Canvas mis en cache (clé + densité de pixels). */
function art(key: string, w: number, h: number, draw: (c: C, w: number, h: number) => void): HTMLCanvasElement {
  const k = `${key}@${scale()}`;
  let cv = cache.get(k);
  if (!cv) {
    cv = paint(w, h, scale(), (c) => draw(c, w, h));
    cv.className = 'hub-cv';
    if (cache.size > 40) cache.delete(cache.keys().next().value as string);
    cache.set(k, cv);
  }
  return cv;
}

const ink = (c: C, lw = 1.6) => { c.lineWidth = lw; c.strokeStyle = OUTLINE; c.lineJoin = 'round'; c.stroke(); };
const circle = (c: C, x: number, y: number, r: number, fill: string, lw = 0) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (lw) ink(c, lw); };
const lin = (c: C, x0: number, y0: number, x1: number, y1: number, ...cols: string[]): CanvasGradient => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((col, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), col));
  return g;
};
const BLOOMS = ['#FF8FB1', '#FFFFFF', '#B9A5E8', '#F3C86B', '#FFC0A3', '#FF75A8'];

/** Petite fleur de massif (pétales + cœur doré), `s` = rayon. */
function bloom(c: C, x: number, y: number, s: number, col: string): void {
  c.strokeStyle = '#5FA86E'; c.lineWidth = Math.max(0.8, s * 0.22);
  c.beginPath(); c.moveTo(x, y + s * 2.4); c.lineTo(x, y + s * 0.4); c.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    circle(c, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7, s * 0.62, col);
  }
  circle(c, x, y, s * 0.45, '#F3C86B');
}

// ================================================================= château (héros)

export const HERO_W = 360;
export const HERO_H = 225;
/** Fenêtres du château (9 = une par pièce) : allumées dans l'ordre selon le nombre de pièces débloquées. */
const WINDOWS: [number, number][] = [[180, 74], [180, 102], [113, 104], [247, 104], [142, 118], [218, 118], [142, 138], [218, 138], [86, 114]];

function tower(c: C, cx: number, top: number, wd: number, base: number, roofH: number, roof: string, flag?: string): void {
  const x = cx - wd / 2;
  // corps de pierre + créneaux
  c.beginPath(); c.rect(x, top, wd, base - top);
  c.fillStyle = lin(c, x, top, x + wd, top, '#FFF3E6', '#FBE3D4', '#EBC3BA'); c.fill(); ink(c, 1.5);
  const n = Math.max(3, Math.round(wd / 9));
  for (let i = 0; i < n; i++) {
    const mw = wd / (n * 2 - 1);
    c.beginPath(); c.rect(x + i * mw * 2, top - 4, mw, 5); c.fillStyle = '#FBE3D4'; c.fill(); ink(c, 1.1);
  }
  // toit en cône
  c.beginPath(); c.moveTo(x - 4, top - 3); c.quadraticCurveTo(cx - wd * 0.12, top - roofH * 0.55, cx, top - roofH); c.quadraticCurveTo(cx + wd * 0.12, top - roofH * 0.55, x + wd + 4, top - 3); c.closePath();
  c.fillStyle = lin(c, x, top - roofH, x + wd, top, shade(roof, 0.3), roof, shade(roof, -0.2)); c.fill(); ink(c, 1.5);
  c.beginPath(); c.moveTo(cx - wd * 0.2, top - roofH * 0.7); c.quadraticCurveTo(cx - wd * 0.28, top - roofH * 0.35, cx - wd * 0.3, top - 6); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.6; c.stroke();
  if (flag) {
    c.beginPath(); c.moveTo(cx, top - roofH); c.lineTo(cx, top - roofH - 14); c.strokeStyle = OUTLINE; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(cx, top - roofH - 14); c.quadraticCurveTo(cx + 7, top - roofH - 14, cx + 11, top - roofH - 10); c.quadraticCurveTo(cx + 6, top - roofH - 9, cx, top - roofH - 6); c.closePath();
    c.fillStyle = flag; c.fill(); ink(c, 1);
  }
}

function windowArch(c: C, x: number, y: number, lit: boolean): void {
  if (lit) glow(c, x, y, 13, '#FFE39A', 0.55);
  roundRect(c, x - 3.6, y - 6, 7.2, 12, 3.6);
  c.fillStyle = lit ? lin(c, x, y - 6, x, y + 6, '#FFF3B8', '#FFC96B') : '#9C8CC8';
  c.fill(); ink(c, 1.1);
  if (lit) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x - 0.5, y - 5, 1, 10); }
}

function tree(c: C, x: number, y: number, s: number, blossom: boolean): void {
  groundShadow(c, x, y + 1, 18 * s, 4 * s, 0.22);
  c.beginPath(); roundRect(c, x - 3 * s, y - 20 * s, 6 * s, 22 * s, 2); c.fillStyle = '#9A6A50'; c.fill(); ink(c, 1.3);
  const col = blossom ? '#F7B8CC' : '#7DC28A';
  const hi = blossom ? '#FFDCE7' : '#A8DDA8';
  for (const [dx, dy, r] of [[-10, -28, 12], [10, -28, 12], [0, -38, 14], [0, -26, 13]] as const) circle(c, x + dx * s, y + dy * s, r * s, col, 1.4);
  for (const [dx, dy, r] of [[-5, -42, 6], [-12, -31, 4]] as const) circle(c, x + dx * s, y + dy * s, r * s, hi);
  if (blossom) for (let i = 0; i < 7; i++) circle(c, x + Math.sin(i * 2.3) * 14 * s, y - 20 * s + Math.cos(i * 1.7) * 12 * s, 1.5, '#FFFFFF');
}

function lamp(c: C, x: number, y: number): void {
  glow(c, x, y - 17, 17, '#FFE39A', 0.6);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 16); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke();
  roundRect(c, x - 3.5, y - 24, 7, 9, 3); c.fillStyle = lin(c, x, y - 24, x, y - 15, '#FFF6C8', '#FFC96B'); c.fill(); ink(c, 1.2);
  c.beginPath(); c.moveTo(x - 4.5, y - 24); c.lineTo(x, y - 28); c.lineTo(x + 4.5, y - 24); c.closePath(); c.fillStyle = PAL.or; c.fill(); ink(c, 1.1);
}

/** Le château de Radia vu de ses jardins ; `unlocked` fenêtres allumées ; Radia dans le décor avec sa tenue actuelle. */
export function heroCanvas(unlocked: number): HTMLCanvasElement {
  return art(`hero|${unlocked}|${lookKey()}`, HERO_W, HERO_H, (c, w, h) => {
    const r = seeded(77);
    // ciel
    c.fillStyle = lin(c, 0, 0, 0, h * 0.66, '#9ED2F6', '#D6E8FB', '#FFE7EE'); c.fillRect(0, 0, w, h);
    glow(c, 302, 34, 74, '#FFF2B8', 0.75);
    circle(c, 302, 34, 15, '#FFF6CE');
    // collines lointaines
    const hill = (y: number, amp: number, a: string, b: string, ph: number) => {
      c.beginPath(); c.moveTo(0, h);
      for (let i = 0; i <= 24; i++) c.lineTo((i / 24) * w, y + Math.sin(i * 0.55 + ph) * amp);
      c.lineTo(w, h); c.closePath(); c.fillStyle = lin(c, 0, y - amp, 0, y + 40, a, b); c.fill();
    };
    hill(128, 7, '#D3C6F2', '#C4DDBA', 0.4);
    hill(142, 6, '#B8DCA9', '#A7D49A', 2.1);
    // petits arbres du fond
    for (const x of [58, 300, 22, 338]) { circle(c, x, 134, 11, '#8CCB93'); circle(c, x - 6, 138, 8, '#9AD6A0'); }

    // --- le château
    c.save();
    tower(c, 88, 100, 22, 152, 24, '#C9B4F0', PAL.roseVif);
    tower(c, 272, 100, 22, 152, 24, '#C9B4F0', PAL.or);
    // grand mur
    c.beginPath(); c.rect(118, 100, 124, 52); c.fillStyle = lin(c, 118, 100, 242, 100, '#FFF3E6', '#FBE3D4', '#EDC8BE'); c.fill(); ink(c, 1.6);
    for (let i = 0; i < 9; i++) { c.beginPath(); c.rect(118 + i * 14.5, 95, 8, 6); c.fillStyle = '#FBE3D4'; c.fill(); ink(c, 1.1); }
    tower(c, 113, 76, 30, 152, 30, '#F5B5C8', PAL.or);
    tower(c, 247, 76, 30, 152, 30, '#F5B5C8', PAL.roseVif);
    tower(c, 180, 60, 44, 152, 38, '#B9A5E8', PAL.or);
    // porte
    c.beginPath(); c.moveTo(166, 152); c.lineTo(166, 136); c.quadraticCurveTo(166, 122, 180, 122); c.quadraticCurveTo(194, 122, 194, 136); c.lineTo(194, 152); c.closePath();
    c.fillStyle = lin(c, 166, 122, 194, 152, '#A5694D', '#7C4C3A'); c.fill(); ink(c, 1.6);
    glow(c, 180, 144, 20, '#FFE39A', 0.5);
    c.beginPath(); c.moveTo(180, 123); c.lineTo(180, 152); c.strokeStyle = 'rgba(255,230,160,0.8)'; c.lineWidth = 1; c.stroke();
    circle(c, 175, 142, 1.5, PAL.or); circle(c, 185, 142, 1.5, PAL.or);
    // fenêtres : une par pièce débloquée
    WINDOWS.forEach(([x, y], i) => windowArch(c, x, y, i < unlocked));
    c.restore();
    // guirlande de cœurs sous les créneaux
    for (let i = 0; i < 6; i++) { heartPath(c, 130 + i * 20, 104 + (i % 2) * 2, 5); c.fillStyle = i % 2 ? PAL.rose : PAL.roseVif; c.fill(); }

    // --- jardin
    c.fillStyle = lin(c, 0, 150, 0, h, '#BFE3A9', '#8FCB87', '#7DBF7B'); c.fillRect(0, 150, w, h - 150);
    // allée
    c.beginPath(); c.moveTo(168, 152); c.lineTo(192, 152); c.lineTo(250, h); c.lineTo(110, h); c.closePath();
    c.fillStyle = lin(c, 0, 152, 0, h, '#FFF0DE', '#F2DCC4'); c.fill();
    c.strokeStyle = 'rgba(160,110,80,0.35)'; c.lineWidth = 1.2; c.stroke();
    // haies arrondies
    for (let i = 0; i < 8; i++) {
      for (const side of [-1, 1]) {
        const y = 156 + i * 9;
        const x = 180 + side * (22 + i * 8.4);
        circle(c, x, y, 5.5 + i * 0.7, i % 2 ? '#6FB57A' : '#7DC28A'); circle(c, x - 1.5, y - 1.5, 2.5 + i * 0.3, 'rgba(255,255,255,0.18)');
      }
    }
    // massifs fleuris (pile hors de l'allée, de Radia et de la fontaine)
    const blooms: { x: number; y: number; col: string }[] = [];
    for (let i = 0; i < 70; i++) {
      const y = 158 + r() * 62;
      const half = 28 + (y - 150) * 0.78;
      const left = r() < 0.5;
      const x = left ? 180 - half - 6 - r() * (150 - (y - 150) * 0.3) : 180 + half + 6 + r() * (150 - (y - 150) * 0.3);
      if (x < 4 || x > w - 4) continue;
      if (x > 230 && x < 290 && y > 170) continue; // la place de Radia
      blooms.push({ x, y, col: BLOOMS[Math.floor(r() * BLOOMS.length)] });
    }
    blooms.sort((a, b) => a.y - b.y).forEach((b) => bloom(c, b.x, b.y, 2.2 + (b.y - 150) * 0.05, b.col));
    // arbres en fleurs
    tree(c, 38, 160, 1, true);
    tree(c, 328, 158, 1, true);
    // lanternes
    lamp(c, 150, 176); lamp(c, 210, 176); lamp(c, 128, 212); lamp(c, 232, 212);
    // place et fontaine
    c.beginPath(); c.ellipse(180, 194, 46, 12, 0, 0, Math.PI * 2); c.fillStyle = '#F4E2D0'; c.fill(); ink(c, 1.4);
    c.beginPath(); c.ellipse(180, 192, 40, 9.5, 0, 0, Math.PI * 2); c.fillStyle = lin(c, 0, 183, 0, 202, '#CFF0FF', '#8CCDF0'); c.fill(); ink(c, 1.2);
    c.beginPath(); c.rect(177, 168, 6, 24); c.fillStyle = '#F4E2D0'; c.fill(); ink(c, 1.2);
    c.beginPath(); c.ellipse(180, 178, 15, 4.2, 0, 0, Math.PI * 2); c.fillStyle = '#F4E2D0'; c.fill(); ink(c, 1.2);
    c.beginPath(); c.ellipse(180, 177, 12, 3, 0, 0, Math.PI * 2); c.fillStyle = '#A9DCF5'; c.fill();
    c.beginPath(); c.ellipse(180, 168, 7, 2.4, 0, 0, Math.PI * 2); c.fillStyle = '#F4E2D0'; c.fill(); ink(c, 1.1);
    c.strokeStyle = 'rgba(190,230,255,0.95)'; c.lineWidth = 2; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(180, 166); c.quadraticCurveTo(180 + d * 9, 156, 180 + d * 17, 178); c.stroke(); }
    c.beginPath(); c.moveTo(180, 166); c.lineTo(180, 154); c.stroke();
    circle(c, 180, 152, 2, '#FFFFFF');
    // reflet de l'eau
    c.beginPath(); c.ellipse(166, 191, 9, 2, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();

    // --- Radia dans son jardin, avec la tenue qu'elle porte maintenant
    groundShadow(c, 262, 217, 20, 4.5, 0.3);
    c.save(); c.translate(262 - 25, 217 - 100);
    drawRadiaNow(c, 50, 100, { expr: 'smile' });
    c.restore();
    // pétales et étincelles
    for (let i = 0; i < 14; i++) circle(c, r() * w, 10 + r() * 150, 1.2 + r() * 1.3, 'rgba(255,255,255,0.85)');
    sparkle(c, 180, 14, 5, '#FFFFFF', 0.9); sparkle(c, 128, 60, 3.4, '#FFF3B8', 0.9); sparkle(c, 236, 52, 3.2, '#FFFFFF', 0.85);
    // voile doux en bas
    c.fillStyle = lin(c, 0, h - 30, 0, h, 'rgba(255,240,230,0)', 'rgba(255,240,230,0.28)'); c.fillRect(0, h - 30, w, 30);
  });
}

// ================================================================= petit chat qui se promène

export function catWalkCanvas(collar: string | null, bed: string | null): HTMLCanvasElement {
  return art(`catwalk|${collar ?? ''}`, 56, 44, (c, w, h) => { void bed; drawCat(c, 'walk', w, h, 0.4, { collar }); });
}

// ================================================================= cartes

export const CARD_W = 172;
export const CARD_H = 78;

function frame(c: C, w: number, h: number, a: string, b: string): void {
  c.fillStyle = lin(c, 0, 0, 0, h, a, b); c.fillRect(0, 0, w, h);
}

function stars(c: C, w: number, h: number, seed: number, n: number): void {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) sparkle(c, 6 + r() * (w - 12), 5 + r() * (h * 0.6), 1.6 + r() * 2.2, '#FFFFFF', 0.55 + r() * 0.4);
}

/** Dressing : un portant de tenues et Radia dans SA tenue équipée. */
/** Carte « Personnaliser Radia » : son visage du moment sur un fond doux (suit le visage personnalisé grâce à lookKey()). */
export function faceArt(): HTMLCanvasElement {
  return art(`face|${lookKey()}`, 124, CARD_H, (c, w, h) => {
    frame(c, w, h, '#FFF0F6', '#F8C9DD');
    glow(c, w * 0.5, h * 0.45, 52, '#FFFFFF', 0.75);
    const f = radiaFaceCanvas('smile', Math.round(h * 0.98));
    c.drawImage(f, (w - h * 0.98) / 2, h * 0.04, h * 0.98, h * 0.98);
    for (const [x, y, r] of [[w * 0.14, h * 0.28, 5], [w * 0.86, h * 0.34, 4], [w * 0.2, h * 0.74, 3]] as const) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  });
}

export function dressingArt(): HTMLCanvasElement {
  return art(`dress|${lookKey()}`, CARD_W, CARD_H, (c, w, h) => {
    frame(c, w, h, '#F3EBFF', '#CDBDF0');
    glow(c, w * 0.72, h * 0.4, 60, '#FFFFFF', 0.7);
    // portant
    c.strokeStyle = '#A6785A'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(8, 17); c.lineTo(88, 17); c.moveTo(14, 17); c.lineTo(10, h); c.moveTo(82, 17); c.lineTo(86, h); c.stroke();
    const gar: [number, string, number][] = [[22, '#F5B5C8', 0], [42, '#FFF4E8', 1], [62, '#8E7BC4', 2]];
    for (const [x, col, kind] of gar) {
      c.beginPath(); c.moveTo(x, 17); c.lineTo(x - 7, 24); c.lineTo(x + 7, 24); c.closePath(); c.strokeStyle = '#D9A43C'; c.lineWidth = 1.4; c.stroke();
      c.beginPath();
      if (kind === 0) { c.moveTo(x - 6, 24); c.lineTo(x + 6, 24); c.lineTo(x + 11, 56); c.lineTo(x - 11, 56); }
      else if (kind === 1) { c.moveTo(x - 9, 25); c.lineTo(x + 9, 25); c.lineTo(x + 7, 46); c.lineTo(x - 7, 46); }
      else { c.moveTo(x - 7, 24); c.lineTo(x + 7, 24); c.lineTo(x + 8, 52); c.lineTo(x - 8, 52); }
      c.closePath(); c.fillStyle = lin(c, x, 24, x, 56, shade(col, 0.2), col); c.fill(); ink(c, 1.3);
    }
    stars(c, w, h, 5, 5);
    // Radia (buste de la tenue actuelle)
    const bust = radiaBustCanvas('smile', 280);
    const bw = 66; const bh = (bust.height / bust.width) * bw;
    c.drawImage(bust, 98, 9, bw, bh);
  });
}

/** Jardin : les vraies parcelles (variété, stade de pousse) ; les fleurs prêtes sont animées à part. */
export function gardenSig(w: World, now: number): string {
  return w.garden.plots.slice(0, Math.max(4, Math.min(5, w.garden.plotCount))).map((p) => (p && p.flower ? `${p.flower}${isReady(p, now) ? 'R' : stageAt(p, now)}` : '_')).join(',');
}
export function gardenArt(w: World, now: number): HTMLCanvasElement {
  const plots = w.garden.plots.slice(0, 5).map((p) => (p && p.flower && (FLOWER_IDS as readonly string[]).includes(p.flower) ? { id: p.flower as FlowerId, stage: stageAt(p, now), ready: isReady(p, now) } : null));
  while (plots.length < 4) plots.push(null);
  const sig = gardenSig(w, now);
  return art(`garden|${sig}`, CARD_W, CARD_H, (c, wd, h) => {
    frame(c, wd, h, '#D9F0FF', '#F6E6F2');
    glow(c, wd * 0.8, 12, 40, '#FFF3B8', 0.8);
    c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 12; i++) c.lineTo((i / 12) * wd, h * 0.56 + Math.sin(i * 0.8) * 4); c.lineTo(wd, h); c.closePath();
    c.fillStyle = lin(c, 0, 40, 0, h, '#B9DFA9', '#86C57F'); c.fill();
    const n = plots.length;
    plots.forEach((p, i) => {
      const x = (wd / n) * (i + 0.5);
      const y = h - 9 + (i % 2) * 3;
      c.beginPath(); c.ellipse(x, y, 17, 6, 0, 0, Math.PI * 2); c.fillStyle = '#A9795A'; c.fill(); ink(c, 1.2);
      c.beginPath(); c.ellipse(x - 2, y - 1.5, 10, 2.4, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill();
      if (p && !p.ready) { c.save(); c.translate(x - 22, y - 44); drawFlower(c, p.id, p.stage, 44, 0.3); c.restore(); }
      else if (!p) { c.save(); c.translate(x - 8, y - 17); c.globalAlpha = 0.5; drawFlower(c, 'daisy', 1, 16, 0); c.restore(); }
    });
    // papillon
    c.fillStyle = '#FFC0A3'; c.beginPath(); c.ellipse(26, 18, 4, 2.6, -0.5, 0, 7); c.ellipse(32, 17, 4, 2.6, 0.5, 0, 7); c.fill();
  });
}
/** Première fleur prête (pour l'éclosion animée), ou null. */
export function readyFlower(w: World, now: number): FlowerId | null {
  for (const p of w.garden.plots) if (p && p.flower && isReady(p, now) && (FLOWER_IDS as readonly string[]).includes(p.flower)) return p.flower as FlowerId;
  return null;
}
export function bloomCanvas(id: FlowerId): HTMLCanvasElement {
  return art(`bloom|${id}`, 50, 50, (c) => { drawFlower(c, id, 3, 50, 0.4); });
}

/** Chocolaterie : les chocolats réellement fabriqués sur le comptoir (silhouettes sinon). */
export function chocArt(w: World): HTMLCanvasElement {
  const made = w.choc.collection.filter((id): id is ChocId => (CHOC_IDS as readonly string[]).includes(id));
  const shown = made.slice(-4);
  return art(`choc|${shown.join(',')}|${w.choc.shopLevel}`, CARD_W, CARD_H, (c, wd, h) => {
    frame(c, wd, h, '#F7E7DC', '#E2C0A8');
    // auvent rayé
    for (let i = 0; i < 9; i++) {
      c.beginPath(); c.moveTo(i * 20 - 4, 0); c.lineTo(i * 20 + 16, 0); c.lineTo(i * 20 + 16, 12); c.arc(i * 20 + 6, 12, 10, 0, Math.PI); c.closePath();
      c.fillStyle = i % 2 ? '#FFF4E8' : '#F58AB0'; c.fill(); ink(c, 1.1);
    }
    // comptoir
    c.fillStyle = lin(c, 0, h - 22, 0, h, '#B98462', '#8E6048'); c.fillRect(0, h - 20, wd, 20);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, h - 20, wd, 2.5);
    const slots = 4;
    for (let i = 0; i < slots; i++) {
      const x = 10 + i * ((wd - 20) / slots) + 2;
      const id = shown[i];
      c.save(); c.translate(x, h - 56);
      if (id) drawChocolate(c, id, 36);
      else {
        const guess = CHOC_IDS[(i + made.length) % CHOC_IDS.length];
        c.globalAlpha = 0.7; drawChocSilhouette(c, guess, 36);
      }
      c.restore();
    }
    sparkle(c, wd - 14, 28, 4, '#FFFFFF', 0.9); sparkle(c, 16, 34, 2.8, '#FFF3B8', 0.8);
    void CHOCS;
  });
}

/** Famille : les trois enfants dans le jardin (aucun prénom). */
export function familyArt(): HTMLCanvasElement {
  return art('family', CARD_W, CARD_H, (c, w, h) => {
    frame(c, w, h, '#FFEFE2', '#FFC8AE');
    glow(c, w / 2, 20, 60, '#FFFFFF', 0.7);
    c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 12; i++) c.lineTo((i / 12) * w, h * 0.62 + Math.sin(i * 0.7 + 1) * 3); c.lineTo(w, h); c.closePath();
    c.fillStyle = lin(c, 0, 40, 0, h, '#C8E5B4', '#9BCB8A'); c.fill();
    const kids: ['kid2' | 'kid1' | 'kid3', number, 'wave' | 'idle'][] = [['kid2', 0.22, 'wave'], ['kid1', 0.5, 'idle'], ['kid3', 0.78, 'wave']];
    for (const [k, px, pose] of kids) { c.save(); c.translate(px * w - 30, h - 74); drawKid(c, k, pose, 60, 74, 0.5); c.restore(); }
    for (const [x, y, s] of [[40, 16, 9], [86, 8, 12], [136, 18, 9]] as const) { heartPath(c, x, y, s); c.fillStyle = 'rgba(255,117,168,0.9)'; c.fill(); }
  });
}

/** Chat : le vrai chat (collier, lit équipés) s'il est adopté, sinon un chaton qui dort dans un panier. */
export function catArt(w: World): HTMLCanvasElement {
  const ad = w.cat.adopted;
  const col = w.cat.equipped.collar; const bed = w.cat.equipped.bed;
  return art(`cat|${ad ? 1 : 0}|${col ?? ''}|${bed ?? ''}|${w.cat.items.includes('toy-ball') ? 1 : 0}`, CARD_W, CARD_H, (c, wd, h) => {
    frame(c, wd, h, '#FFF7EC', '#FFDCC0');
    glow(c, wd * 0.5, h * 0.5, 70, '#FFFFFF', 0.6);
    // fenêtre douce
    roundRect(c, wd - 54, 8, 40, 38, 8); c.fillStyle = lin(c, 0, 8, 0, 46, '#CDE9FB', '#EAF6FF'); c.fill(); ink(c, 1.3);
    c.beginPath(); c.moveTo(wd - 34, 8); c.lineTo(wd - 34, 46); c.moveTo(wd - 54, 27); c.lineTo(wd - 14, 27); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    c.fillStyle = '#F5B5C8'; c.fillRect(wd - 58, 6, 6, 44);
    // plancher
    c.fillStyle = lin(c, 0, h - 14, 0, h, '#E9C9A6', '#D2A87F'); c.fillRect(0, h - 14, wd, 14);
    if (ad) {
      c.save(); c.translate(wd * 0.5 - 70, 0);
      drawCat(c, 'sit', 140, h + 2, 0.3, { collar: col, bed, toy: w.cat.items.includes('toy-ball') });
      c.restore();
    } else {
      c.save(); c.translate(wd * 0.5 - 70, 0);
      drawCat(c, 'sleep', 140, h + 2, 0.5, { bed: 'basket' });
      c.restore();
    }
    sparkle(c, 22, 18, 4, '#FFFFFF', 0.9); heartPath(c, 30, 40, 8); c.fillStyle = 'rgba(255,117,168,0.8)'; c.fill();
  });
}

function camera(c: C, x: number, y: number, s: number): void {
  roundRect(c, x - 11 * s, y - 7 * s, 22 * s, 15 * s, 3 * s); c.fillStyle = '#51446D'; c.fill(); ink(c, 1.2);
  roundRect(c, x - 5 * s, y - 10 * s, 8 * s, 4 * s, 1.5 * s); c.fillStyle = '#51446D'; c.fill(); ink(c, 1);
  circle(c, x, y + 0.5 * s, 5 * s, '#B9A5E8', 1.2); circle(c, x - 1.2 * s, y - 0.8 * s, 1.6 * s, 'rgba(255,255,255,0.85)');
}

/** Carrière : plateau photo / podium / scène / plateau de tournage selon la carrière en cours, avec Radia. */
export function careerArt(cur: string | null): HTMLCanvasElement {
  const id: CareerId | null = (CAREER_IDS as readonly string[]).includes(cur ?? '') ? (cur as CareerId) : null;
  return art(`career|${id ?? 'none'}|${lookKey()}`, CARD_W, CARD_H, (c, w, h) => {
    if (id === 'model') {
      drawRunway(c, w, h, 0.6);
    } else if (id === 'singer') drawConcertStage(c, w, h, 0.6, 0.4);
    else if (id === 'actress') {
      drawPhotoDecor(c, 'cinema', w, h, 0.3);
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(14 + i * 7, 4); c.lineTo(8 + i * 7, 28); c.lineTo(22 + i * 7, 28); c.closePath(); c.fillStyle = 'rgba(255,240,200,0.14)'; c.fill(); }
    } else if (id === 'photo') {
      frame(c, w, h, '#FFE4EE', '#F3B7CB');
      glow(c, w * 0.62, h * 0.45, 70, '#FFFFFF', 0.8);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, h - 14, w, 14);
      camera(c, 36, 50, 1.25);
      // flash
      sparkle(c, 54, 26, 10, '#FFFFFF', 0.95); sparkle(c, 30, 24, 5, '#FFF3B8', 0.9);
    } else {
      // pas encore de carrière : trois marches de podium dorées sous les projecteurs
      frame(c, w, h, '#FFF3CF', '#F3C86B');
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(w * (0.2 + i * 0.3), 0); c.lineTo(w * (0.1 + i * 0.3), h); c.lineTo(w * (0.3 + i * 0.3), h); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill(); }
      for (const [x, y, hh] of [[26, 54, 24], [60, 42, 36], [94, 60, 18]] as const) { c.beginPath(); roundRect(c, x - 14, y + 14, 28, hh, 3); c.fillStyle = lin(c, 0, y, 0, y + hh, '#FFE9A8', '#E8B94F'); c.fill(); ink(c, 1.3); }
      starPath(c, 60, 34, 9, 4); c.fillStyle = '#FFFFFF'; c.fill(); ink(c, 1.3);
    }
    groundShadow(c, w * 0.7, h - 3, 17, 4, 0.35);
    c.save(); c.translate(w * 0.7 - 14, h - 68); drawRadiaNow(c, 28, 66, { expr: 'smile' }); c.restore();
    stars(c, w, h, 11, 4);
  });
}

/** Fans : un tapis rouge, Radia et une foule dont la taille suit le nombre de fans. */
export function fansArt(fans: number, radia = true): HTMLCanvasElement {
  const crowd = fans <= 0 ? 0 : Math.min(9, 2 + Math.floor(Math.log10(fans + 1) * 2));
  return art(`fans|${crowd}|${radia ? lookKey() : ''}`, 124, CARD_H, (c, w, h) => {
    frame(c, w, h, '#EAE0FB', '#B9A5E8');
    glow(c, w * 0.5, 22, 56, '#FFFFFF', 0.7);
    // tapis rouge en perspective
    c.beginPath(); c.moveTo(w * 0.34, h * 0.5); c.lineTo(w * 0.66, h * 0.5); c.lineTo(w * 0.9, h); c.lineTo(w * 0.1, h); c.closePath();
    c.fillStyle = lin(c, 0, h * 0.5, 0, h, '#E8558F', '#B8346F'); c.fill(); ink(c, 1.2);
    // foule : têtes rondes + cœurs et flashes
    const r = seeded(31);
    const hair = ['#58433F', '#A6785A', '#F3C86B', '#3A3340', '#C4622D'];
    for (let i = 0; i < crowd; i++) {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const x = left ? 8 + row * 11 + r() * 4 : w - 8 - row * 11 - r() * 4;
      const y = h - 18 - row * 6;
      circle(c, x, y, 6.2, hair[i % hair.length], 1.1); circle(c, x, y + 2.5, 4.6, '#FFD9BE', 1);
      if (i % 3 === 0) { heartPath(c, x + (left ? 4 : -4), y - 11, 7); c.fillStyle = PAL.roseVif; c.fill(); }
      else if (i % 3 === 1) sparkle(c, x, y - 11, 4, '#FFFFFF', 0.95);
    }
    if (crowd === 0) sparkle(c, w * 0.5, 14, 5, '#FFFFFF', 0.9);
    if (radia) { groundShadow(c, w * 0.5, h - 4, 15, 3.5, 0.35); c.save(); c.translate(w * 0.5 - 14, h - 66); drawRadiaNow(c, 28, 66, { expr: 'smile' }); c.restore(); }
  });
}

export function purgeHubArt(): void { cache.clear(); }
