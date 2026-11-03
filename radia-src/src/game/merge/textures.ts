/** Textures du plateau de fusion (cases, paquets, panier, effets). */
import Phaser from 'phaser';
import { drawItem } from '../art/items';
import { drawGenerator, type GenKind } from '../art/generators';
import { itemKey, type ItemRef } from '../../data/items';
import {
  OUTLINE, PAL, ellipse, fillShaded, gloss, groundShadow, heartPath, paint, roundRect, shade, sparkle, starPath, texScale, canvasUrl,
} from '../art/kit';

export const ITEM_TEX = 72; // taille logique des textures d'objets

export function itemTexKey(r: ItemRef) { return `item:${itemKey(r)}`; }

export function ensureItemTexture(scene: Phaser.Scene, r: ItemRef): string {
  const key = itemTexKey(r);
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, paint(ITEM_TEX, ITEM_TEX, texScale(), (ctx) => drawAny(ctx, r, ITEM_TEX)));
  }
  return key;
}

/** Image d'objet pour l'interface HTML (mise en cache). */
export function itemImageUrl(r: ItemRef, size = 96): string {
  return canvasUrl(`ui-item:${itemKey(r)}:${size}`, () => paint(size, size, 2, (ctx) => drawAny(ctx, r, size)));
}

/** Objet ou générateur. */
export function drawAny(ctx: CanvasRenderingContext2D, r: ItemRef, size: number): void {
  if (r.c === 'gen') drawGenerator(ctx, r.l as GenKind, size);
  else drawItem(ctx, r, size);
}

/** Couleurs des cases selon l'apparence achetée. */
const SKINS: Record<string, [string, string, string]> = {
  classic: ['#FFF8F0', '#FFEFE6', 'rgba(88,67,63,0.10)'],
  gold: ['#FFF6DD', '#FFE7AE', 'rgba(181,134,44,0.30)'],
  lavender: ['#F5F0FF', '#E6DBFA', 'rgba(81,68,109,0.18)'],
  night: ['#6A5B8C', '#5A4C7A', 'rgba(255,255,255,0.18)'],
};

export function ensureBoardTextures(scene: Phaser.Scene, cell: number, skin = 'classic'): void {
  const [ca, cb, line] = SKINS[skin] ?? SKINS.classic;
  const s = texScale();
  const add = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, paint(w, h, s, draw));
  };
  const c = Math.round(cell);
  // case du plateau
  for (const [key, col] of [['cell:a', ca], ['cell:b', cb]] as const) {
    add(key, c, c, (ctx) => {
      roundRect(ctx, 2, 3, c - 4, c - 4, c * 0.22);
      ctx.fillStyle = 'rgba(81,68,109,0.16)';
      ctx.fill();
      roundRect(ctx, 2, 1.5, c - 4, c - 5, c * 0.22);
      const g = ctx.createLinearGradient(0, 0, 0, c);
      g.addColorStop(0, skin === 'night' ? shade(col, 0.15) : '#FFFFFF');
      g.addColorStop(0.25, col);
      g.addColorStop(1, shade(col, -0.04));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = line;
      ctx.stroke();
      if (skin === 'night') { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(c * (0.2 + k * 0.31), c * (0.25 + ((k * 37) % 50) / 100), 0.9, 0, Math.PI * 2); ctx.fill(); } }
      if (skin === 'gold') { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(c * 0.24, c * 0.22, 1.4, 0, Math.PI * 2); ctx.fill(); }
    });
  }
  // surbrillances
  add('cell:sel', c, c, (ctx) => {
    roundRect(ctx, 2.5, 2.5, c - 5, c - 5, c * 0.22);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PAL.roseVif;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,117,168,0.12)';
    ctx.fill();
  });
  add('cell:ok', c, c, (ctx) => {
    roundRect(ctx, 2.5, 2.5, c - 5, c - 5, c * 0.22);
    ctx.fillStyle = 'rgba(243,200,107,0.35)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PAL.or;
    ctx.stroke();
  });
  add('cell:move', c, c, (ctx) => {
    roundRect(ctx, 2.5, 2.5, c - 5, c - 5, c * 0.22);
    ctx.fillStyle = 'rgba(185,165,232,0.28)';
    ctx.fill();
  });
  add('cell:hint', c, c, (ctx) => {
    roundRect(ctx, 2.5, 2.5, c - 5, c - 5, c * 0.22);
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = PAL.lavande;
    ctx.stroke();
  });
  // paquet cadeau
  add('gift', c, c, (ctx) => drawGift(ctx, c));
}

export function drawGift(ctx: CanvasRenderingContext2D, c: number): void {
  const lw = c * 0.035;
  const x = c * 0.16;
  const y = c * 0.3;
  const w = c * 0.68;
  const hh = c * 0.56;
  groundShadow(ctx, c / 2, c * 0.88, c * 0.34, c * 0.07);
  roundRect(ctx, x, y, w, hh, c * 0.08);
  fillShaded(ctx, PAL.lavande, { x, y, w, h: hh }, lw);
  // couvercle
  roundRect(ctx, x - c * 0.04, y - c * 0.02, w + c * 0.08, c * 0.16, c * 0.06);
  fillShaded(ctx, '#C9B8F0', { x, y: y - c * 0.02, w, h: c * 0.16 }, lw);
  // ruban
  ctx.fillStyle = PAL.roseVif;
  ctx.fillRect(c / 2 - c * 0.06, y - c * 0.02, c * 0.12, hh + c * 0.02);
  ctx.lineWidth = lw * 0.8;
  ctx.strokeStyle = OUTLINE;
  ctx.strokeRect(c / 2 - c * 0.06, y + c * 0.14, c * 0.12, hh - c * 0.14);
  // nœud
  for (const s of [-1, 1]) {
    ellipse(ctx, c / 2 + s * c * 0.12, y - c * 0.07, c * 0.12, c * 0.07, s * 0.5);
    fillShaded(ctx, PAL.roseVif, { x: c / 2 - c * 0.2, y: y - c * 0.15, w: c * 0.4, h: c * 0.15 }, lw);
  }
  ellipse(ctx, c / 2, y - c * 0.05, c * 0.06, c * 0.055);
  fillShaded(ctx, PAL.roseDeep, { x: c / 2 - 6, y: y - 10, w: 12, h: 10 }, lw);
  gloss(ctx, x + w * 0.22, y + hh * 0.3, w * 0.1, hh * 0.18, 0.45, 0.2);
  // point d'interrogation discret
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${c * 0.2}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + w * 0.24, y + hh * 0.62);
}

/** Panier magique (générateur). */
export function drawBasket(ctx: CanvasRenderingContext2D, s: number, glowOn = false): void {
  const lw = s * 0.03;
  if (glowOn) {
    const g = ctx.createRadialGradient(s / 2, s * 0.55, 0, s / 2, s * 0.55, s * 0.5);
    g.addColorStop(0, 'rgba(255,230,160,0.7)');
    g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  groundShadow(ctx, s / 2, s * 0.9, s * 0.36, s * 0.07);
  // anse
  ctx.beginPath();
  ctx.moveTo(s * 0.24, s * 0.48);
  ctx.bezierCurveTo(s * 0.22, s * 0.08, s * 0.78, s * 0.08, s * 0.76, s * 0.48);
  ctx.lineWidth = s * 0.075;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = '#D9A066';
  ctx.stroke();
  // contenu (fleurs et cœurs qui dépassent)
  heartPath(ctx, s * 0.38, s * 0.42, s * 0.2);
  fillShaded(ctx, PAL.roseVif, { x: s * 0.28, y: s * 0.32, w: s * 0.2, h: s * 0.2 }, lw);
  for (const [x, y, col] of [[0.6, 0.4, PAL.or], [0.52, 0.36, PAL.lavande]] as const) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * 0.08, 0, Math.PI * 2);
    fillShaded(ctx, col, { x: s * (x - 0.08), y: s * (y - 0.08), w: s * 0.16, h: s * 0.16 }, lw);
  }
  // corps tressé
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.48);
  ctx.lineTo(s * 0.88, s * 0.48);
  ctx.lineTo(s * 0.78, s * 0.86);
  ctx.quadraticCurveTo(s * 0.5, s * 0.92, s * 0.22, s * 0.86);
  ctx.closePath();
  fillShaded(ctx, '#E9B27A', { x: s * 0.12, y: s * 0.48, w: s * 0.76, h: s * 0.42 }, lw);
  ctx.save();
  ctx.clip();
  ctx.lineWidth = s * 0.012;
  ctx.strokeStyle = 'rgba(120,70,40,0.45)';
  for (let i = 0; i < 4; i++) {
    const y = s * (0.56 + i * 0.085);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, y);
    ctx.lineTo(s * 0.9, y);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = s * (0.16 + i * 0.085);
    ctx.beginPath();
    ctx.moveTo(x, s * 0.48);
    ctx.lineTo(x + s * 0.02, s * 0.9);
    ctx.stroke();
  }
  ctx.restore();
  // bord
  roundRect(ctx, s * 0.08, s * 0.44, s * 0.84, s * 0.1, s * 0.05);
  fillShaded(ctx, '#F0C08A', { x: s * 0.08, y: s * 0.44, w: s * 0.84, h: s * 0.1 }, lw);
  // ruban cœur
  heartPath(ctx, s * 0.5, s * 0.68, s * 0.16);
  fillShaded(ctx, PAL.roseVif, { x: s * 0.42, y: s * 0.6, w: s * 0.16, h: s * 0.16 }, lw);
  gloss(ctx, s * 0.25, s * 0.58, s * 0.06, s * 0.025, 0.5, 0);
}

export function ensureFxTextures(scene: Phaser.Scene): void {
  const s = texScale();
  const add = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paint(w, h, s, draw));
  };
  add('fx:spark', 20, 20, (c) => sparkle(c, 10, 10, 9, '#FFFFFF'));
  add('fx:sparkGold', 20, 20, (c) => sparkle(c, 10, 10, 9, '#FFE7A0'));
  add('fx:heart', 18, 18, (c) => { heartPath(c, 9, 9.5, 16); c.fillStyle = PAL.roseVif; c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#fff'; c.stroke(); });
  add('fx:dot', 16, 16, (c) => { const g = c.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 16, 16); });
  add('fx:flash', 96, 96, (c) => { const g = c.createRadialGradient(48, 48, 0, 48, 48, 48); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(255,240,250,0.6)'); g.addColorStop(1, 'rgba(255,240,250,0)'); c.fillStyle = g; c.fillRect(0, 0, 96, 96); });
  add('fx:ring', 96, 96, (c) => { c.beginPath(); c.arc(48, 48, 42, 0, Math.PI * 2); c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke(); });
  add('fx:confetti', 8, 12, (c) => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 8, 12); });
  add('fx:star', 26, 26, (c) => { starPath(c, 13, 13.5, 12, 5.5); c.fillStyle = PAL.or; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUTLINE; c.stroke(); });
  add('fx:light', 40, 40, (c) => { const g = c.createRadialGradient(20, 20, 0, 20, 20, 20); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.3, 'rgba(255,220,170,0.7)'); g.addColorStop(1, 'rgba(255,200,160,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 40); });
}

export const COLLECTION_TINTS: Record<string, number[]> = {
  flowers: [0xff9cc0, 0xffd1e0, 0x9fd8a8, 0xffffff],
  love: [0xff75a8, 0xffb3cb, 0xf3c86b, 0xffffff],
  paris: [0xb9a5e8, 0xffd59a, 0xffffff, 0xd9cdf5],
  chess: [0xf3c86b, 0xffe7a0, 0xffffff, 0xb9a5e8],
  special: [0xffe7a0, 0xffffff, 0xff9cc0, 0xb9a5e8],
};
