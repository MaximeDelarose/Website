/**
 * Vêtements « tenues réelles » de Radia : hauts, bas, robes, vestes.
 * Tout est enregistré dans les tables de avatar.ts par installClothes() (appelée en bas de avatar.ts).
 * Attention : aucune const de niveau module (import circulaire) — uniquement des fonctions.
 */
import type { ClothId } from '../../../data/world/ids';
import { shade, roundRect } from '../kit';
import {
  CX, INK, skin, skinL, GOLD, lg, fs, line, dot, clipped, sheen, bow, torso, pants, wave, genDress, lapels,
  SLEEVES, TOPS, BOTTOMS, DRESSES, JACKETS,
} from './avatar';
import type { C, TorsoO, SleeveSpec, DressFx, LegO } from './avatar';

// ---------------------------------------------------------------- outils

/** Peau du buste entre y0 et y1 (épaules, bras nus, ventre d'un crop). */
function bareTorso(ctx: C, y0: number, y1: number, nd = 30): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, 240, y1 - y0);
  ctx.clip();
  torso(ctx, { hem: y1 + 30, hemW: 50, waist: 46, shW: 56, neck: 'scoop', nd });
  fs(ctx, lg(ctx, 0, 170, 0, y1, skinL(), skin()), 2.2);
  ctx.restore();
}

/** Peau du cou / des clavicules pour un col bateau. */
function boatSkin(ctx: C): void {
  ctx.beginPath();
  ctx.moveTo(CX - 22, 156);
  ctx.lineTo(CX + 22, 156);
  ctx.lineTo(CX + 44, 173);
  ctx.lineTo(CX + 46, 192);
  ctx.lineTo(CX - 46, 192);
  ctx.lineTo(CX - 44, 173);
  ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, 156, 0, 192, skin(), skinL());
  ctx.fill();
}

interface BodyO { hem: number; hemW: number; waist: number; shW: number; wy: number; nx: number; ny: number; nd: number }

/** Buste à encolure large (col bateau). */
function boatBody(c: C, o: BodyO): void {
  const { hem, hemW, waist, shW, wy, nx, ny, nd } = o;
  c.beginPath();
  c.moveTo(CX - nx, ny);
  c.bezierCurveTo(CX - nx - 6, ny + 4, CX - shW - 2, 182, CX - shW, 198);
  c.bezierCurveTo(CX - shW - 2, 226, CX - waist - 2, 248, CX - waist, wy);
  c.bezierCurveTo(CX - waist + 1, wy + 22, CX - hemW, hem - 24, CX - hemW, hem);
  c.quadraticCurveTo(CX, hem + 8, CX + hemW, hem);
  c.bezierCurveTo(CX + hemW, hem - 24, CX + waist - 1, wy + 22, CX + waist, wy);
  c.bezierCurveTo(CX + waist + 2, 248, CX + shW + 2, 226, CX + shW, 198);
  c.bezierCurveTo(CX + shW + 2, 182, CX + nx + 6, ny + 4, CX + nx, ny);
  c.quadraticCurveTo(CX, ny + nd * 2, CX - nx, ny);
  c.closePath();
}

interface TankO { hem: number; hemW: number; waist: number; wy: number; sx: number; so: number; nd: number; ah?: number }

/** Débardeur : bretelles, emmanchures, encolure arrondie. */
function tankBody(c: C, o: TankO): void {
  const { hem, hemW, waist, wy, sx, so, nd } = o;
  const ah = o.ah ?? 218;
  c.beginPath();
  c.moveTo(CX - sx, 160);
  c.lineTo(CX - so, 170);
  c.bezierCurveTo(CX - so - 6, 186, CX - 52, 200, CX - 47, ah);
  c.bezierCurveTo(CX - 48, 240, CX - waist - 2, 252, CX - waist, wy);
  c.bezierCurveTo(CX - waist + 1, wy + 14, CX - hemW, hem - 14, CX - hemW, hem);
  c.quadraticCurveTo(CX, hem + 6, CX + hemW, hem);
  c.bezierCurveTo(CX + hemW, hem - 14, CX + waist - 1, wy + 14, CX + waist, wy);
  c.bezierCurveTo(CX + waist + 2, 252, CX + 48, 240, CX + 47, ah);
  c.bezierCurveTo(CX + 52, 200, CX + so + 6, 186, CX + so, 170);
  c.lineTo(CX + sx, 160);
  c.quadraticCurveTo(CX, 160 + nd * 2, CX - sx, 160);
  c.closePath();
}

/** Col montant (cheminée / roulé) derrière le menton. */
function standCollar(ctx: C, c0: string, c1: string, y0 = 150, y1 = 176, half = 20): void {
  ctx.beginPath();
  ctx.moveTo(CX - half, y0);
  ctx.lineTo(CX + half, y0);
  ctx.bezierCurveTo(CX + half + 2, y0 + 12, CX + half + 5, y1 - 6, CX + half + 6, y1);
  ctx.quadraticCurveTo(CX, y1 + 10, CX - half - 6, y1);
  ctx.bezierCurveTo(CX - half - 5, y1 - 6, CX - half - 2, y0 + 12, CX - half, y0);
  ctx.closePath();
  fs(ctx, lg(ctx, 0, y0, 0, y1, c0, c1), 2);
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  for (let x = CX - half - 4; x <= CX + half + 4; x += 4.5) { ctx.moveTo(x, y0); ctx.lineTo(x, y1 + 8); }
  ctx.stroke();
  ctx.restore();
}

function ribs(ctx: C, x0: number, x1: number, y0: number, y1: number, step: number, color: string): void {
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  ctx.stroke();
}

// ---------------------------------------------------------------- hauts

function topStripeBlue(ctx: C): void {
  const col = '#2B52C8';
  const o: TorsoO = { hem: 318, hemW: 50, waist: 45, shW: 56, neck: 'crew', nd: 4 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 318, '#4A72E6', col, '#1D3A98'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    ctx.fillStyle = 'rgba(12,14,36,0.7)';
    for (let y = 172; y < 326; y += 7) ctx.fillRect(CX - 70, y, 140, 1.1);
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(CX + 22, 190, 40, 140);
    sheen(ctx, 70, 180, 170, 318, 0.1);
    // bas côtelé
    ctx.fillStyle = 'rgba(10,14,50,0.45)';
    ctx.fillRect(CX - 70, 308, 140, 16);
    ribs(ctx, CX - 66, CX + 66, 308, 324, 4, 'rgba(255,255,255,0.12)');
  });
  standCollar(ctx, '#3A62D8', '#2447B0', 148, 172, 19);
  // petit texte jaune
  ctx.save();
  ctx.font = 'bold 7px "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD84A';
  ctx.fillText('LOVE ME', CX - 26, 222);
  ctx.restore();
}

function topPinstripeBrown(ctx: C): void {
  const col = '#4D3328';
  const o: TorsoO = { hem: 276, hemW: 55, waist: 51, shW: 58, neck: 'v', nd: 46, wy: 262 };
  bareTorso(ctx, 238, 290);
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 276, '#6A4A3A', col, '#33201A'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,245,235,0.62)';
    ctx.beginPath();
    for (let x = CX - 66; x <= CX + 66; x += 5.5) { ctx.moveTo(x, 168); ctx.lineTo(x + (x - CX) * 0.04, 290); }
    ctx.stroke();
    sheen(ctx, 70, 176, 170, 278, 0.08);
  });
  line(ctx, [[CX - 53, 270], [CX, 284], [CX + 53, 270]], 'rgba(0,0,0,0.25)', 1.3);
  // col de chemise ouvert
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 158);
    ctx.lineTo(CX + s * 38, 176);
    ctx.lineTo(CX + s * 20, 196);
    ctx.lineTo(CX + s * 3, 208);
    ctx.lineTo(CX + s * 4, 168);
    ctx.closePath();
    fs(ctx, lg(ctx, CX - 40, 160, CX + 40, 200, '#6A4A3A', '#3F281F'), 1.9);
    line(ctx, [[CX + s * 20, 164], [CX + s * 32, 178], [CX + s * 20, 192]], 'rgba(255,245,235,0.4)', 1);
  }
  // patte de boutonnage et boutons
  line(ctx, [[CX - 2, 212], [CX - 5, 278]], 'rgba(0,0,0,0.3)', 1.4);
  for (const y of [226, 246, 266]) dot(ctx, CX - 3, y, 2, '#E9DCCB', INK, 0.8);
}

function topSatinPink(ctx: C): void {
  const col = '#F2B2C4';
  const o: TorsoO = { hem: 304, hemW: 57, waist: 47, shW: 57, neck: 'crew', nd: 4, wy: 270 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 304, '#FFD3DF', col, '#D98AA2'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    sheen(ctx, 66, 172, 176, 304, 0.34);
    line(ctx, [[CX - 38, 200], [CX - 44, 250], [CX - 48, 300]], 'rgba(150,60,90,0.18)', 2);
    line(ctx, [[CX + 36, 200], [CX + 42, 250], [CX + 48, 300]], 'rgba(150,60,90,0.18)', 2);
    // plis sous la ceinture
    for (let i = -4; i <= 4; i++) line(ctx, [[CX + i * 8, 284], [CX + i * 10, 308]], 'rgba(150,60,90,0.18)', 1.2, false);
  });
  // ceinture drapée
  ctx.beginPath();
  ctx.moveTo(CX - 48, 268);
  ctx.quadraticCurveTo(CX, 278, CX + 48, 268);
  ctx.lineTo(CX + 49, 286);
  ctx.quadraticCurveTo(CX, 296, CX - 49, 286);
  ctx.closePath();
  fs(ctx, lg(ctx, 0, 268, 0, 296, '#FFC6D5', '#D9809C'), 1.9);
  for (let i = 0; i < 3; i++) line(ctx, [[CX - 46, 273 + i * 5], [CX, 283 + i * 5], [CX + 47, 273 + i * 5]], 'rgba(255,255,255,0.4)', 1);
  // drapé noué sur le côté
  ctx.beginPath();
  ctx.moveTo(CX + 22, 274);
  ctx.bezierCurveTo(CX + 36, 270, CX + 40, 296, CX + 30, 312);
  ctx.lineTo(CX + 22, 308);
  ctx.bezierCurveTo(CX + 28, 296, CX + 24, 284, CX + 16, 280);
  ctx.closePath();
  fs(ctx, lg(ctx, 0, 274, 0, 312, '#FFC6D5', '#D9809C'), 1.6);
  dot(ctx, CX + 20, 278, 4, '#F6A5BD', INK, 1.4);
  standCollar(ctx, '#FFC6D5', '#E597AE', 148, 174, 19);
  line(ctx, [[CX - 18, 160], [CX - 20, 170]], 'rgba(255,255,255,0.6)', 2);
}

function topTankWhite(ctx: C): void {
  const col = '#FBF8F6';
  const o: TankO = { hem: 316, hemW: 50, waist: 45, wy: 270, sx: 24, so: 40, nd: 24 };
  bareTorso(ctx, 150, 292);
  tankBody(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 316, '#FFFFFF', col, '#E4DADA'), 2.3);
  clipped(ctx, (c) => tankBody(c, o), () => {
    ribs(ctx, CX - 60, CX + 60, 170, 330, 3.6, 'rgba(120,90,90,0.13)');
  });
  // liseré rouge sur l'encolure et les emmanchures
  ctx.beginPath();
  ctx.moveTo(CX - 24, 160);
  ctx.quadraticCurveTo(CX, 160 + 48, CX + 24, 160);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#E23B4E';
  ctx.stroke();
  // texte rouge arrondi
  ctx.save();
  ctx.font = '900 13px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#E23B4E';
  ctx.fillStyle = '#E23B4E';
  ctx.strokeText('SUNDAY', CX, 236);
  ctx.fillText('SUNDAY', CX, 236);
  ctx.font = '900 12px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
  ctx.strokeText('BEST', CX, 251);
  ctx.fillText('BEST', CX, 251);
  ctx.restore();
}

function topStripeYellow(ctx: C): void {
  const o: BodyO = { hem: 322, hemW: 54, waist: 49, shW: 58, wy: 270, nx: 42, ny: 168, nd: 9 };
  boatSkin(ctx);
  boatBody(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 322, '#F8EDB8', '#F1E19A', '#DDCD8C'), 2.4);
  clipped(ctx, (c) => boatBody(c, o), () => {
    ctx.fillStyle = '#A9A9AE';
    for (let y = 176; y < 330; y += 14) ctx.fillRect(CX - 70, y, 140, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(CX + 22, 200, 50, 130);
    sheen(ctx, 70, 176, 170, 322, 0.1);
    ctx.fillStyle = 'rgba(160,150,110,0.45)';
    ctx.fillRect(CX - 70, 312, 140, 14);
    ribs(ctx, CX - 66, CX + 66, 312, 326, 4, 'rgba(255,255,255,0.3)');
  });
  ctx.beginPath();
  ctx.moveTo(CX - 42, 168);
  ctx.quadraticCurveTo(CX, 168 + 18, CX + 42, 168);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#C9BA7C';
  ctx.stroke();
}

function topCropBlack(ctx: C): void {
  const col = '#27222C';
  const o: TankO = { hem: 262, hemW: 48, waist: 44, wy: 248, sx: 22, so: 42, nd: 20, ah: 212 };
  bareTorso(ctx, 150, 290);
  tankBody(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 262, '#4A4152', col, '#14101A'), 2.3);
  clipped(ctx, (c) => tankBody(c, o), () => {
    ribs(ctx, CX - 60, CX + 60, 170, 270, 3.6, 'rgba(255,255,255,0.1)');
    sheen(ctx, 74, 176, 166, 262, 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(CX - 60, 254, 120, 3);
  });
  ctx.beginPath();
  ctx.moveTo(CX - 22, 160);
  ctx.quadraticCurveTo(CX, 160 + 40, CX + 22, 160);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4A4152';
  ctx.stroke();
}

function topLaceCream(ctx: C): void {
  const col = '#F8EAD8';
  const o: TorsoO = { hem: 314, hemW: 56, waist: 49, shW: 59, neck: 'scoop', nd: 9, wy: 268 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, 314, '#FFFAF0', col, '#E5CFB3'), 2.4);
  clipped(ctx, (c) => torso(c, o), () => {
    // dentelle : petites fleurs et festons
    for (let r = 0; 184 + r * 17 < 326; r++) {
      for (let k = -4; k <= 4; k++) {
        const x = CX + k * 16 + (r % 2) * 8;
        const y = 184 + r * 17;
        dot(ctx, x, y, 3.4, 'rgba(255,255,255,0.7)');
        dot(ctx, x, y, 1.1, 'rgba(190,150,110,0.55)');
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(190,150,110,0.3)';
    for (let y = 192; y < 330; y += 17) { ctx.beginPath(); for (let x = CX - 70; x < CX + 70; x += 16) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y + 8, x + 16, y); } ctx.stroke(); }
    sheen(ctx, 70, 176, 170, 314, 0.2);
    // bas festonné
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(CX - 70, 304, 140, 14);
  });
  // feston au bas
  ctx.beginPath();
  ctx.moveTo(CX - 56, 308);
  for (let i = 0; i < 7; i++) ctx.quadraticCurveTo(CX - 56 + i * 16 + 8, 322, CX - 56 + (i + 1) * 16, 308);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(160,110,80,0.6)';
  ctx.stroke();
  // plastron et encolure dentelle
  ctx.beginPath();
  ctx.moveTo(CX - 22, 167); ctx.quadraticCurveTo(CX, 167 + 14, CX + 22, 167);
  ctx.lineWidth = 3.4; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(160,110,80,0.6)'; ctx.stroke();
  for (const y of [196, 216, 236, 256]) dot(ctx, CX, y, 1.7, '#FFF6EA', 'rgba(120,70,50,0.6)', 0.8);
  line(ctx, [[CX, 182], [CX, 270]], 'rgba(160,110,80,0.35)', 1);
  bow(ctx, CX, 174, 0.4, '#F2C9B8');
}

// ---------------------------------------------------------------- bas

function jeansDraw(ctx: C, st: number, col: string, band: string, wash: string): void {
  pants(ctx, st, { topW: 52, outer: 55, inner: 10, hemY: 546, color: col }, (s, off) => {
    line(ctx, [[CX + s * 38, 380], [CX + s * 38 + off * 0.5, 470], [CX + s * 40 + off, 550]], wash, 6);
    ctx.setLineDash([3, 3]);
    line(ctx, [[CX + s * 53, 320], [CX + s * 54, 450], [CX + s * 55 + off, 548]], '#F2C06B', 1.2, true);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(CX + s * 52, 306); ctx.quadraticCurveTo(CX + s * 30, 316, CX + s * 28, 346);
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#F2C06B'; ctx.stroke();
    line(ctx, [[CX + s * 12 + off, 531], [CX + s * 33 + off, 536], [CX + s * 54 + off, 531]], 'rgba(30,60,110,0.4)', 1.4);
  }, () => {
    roundRect(ctx, CX - 51, 288, 102, 12, 3);
    fs(ctx, band, 1.8);
    roundRect(ctx, CX - 9, 287, 18, 14, 3);
    fs(ctx, lg(ctx, 0, 287, 0, 301, '#FFE9A6', GOLD, '#D9A238'), 1.5);
    line(ctx, [[CX + 8, 302], [CX + 5, 336], [CX, 352]], '#F2C06B', 1.2);
  });
}

function widePants(ctx: C, st: number, col: string, band: string, deco: (s: -1 | 1, off: number) => void, wb: () => void, o: Partial<LegO> = {}): void {
  void band;
  pants(ctx, st, { topW: 52, outer: 63, inner: 6, hemY: 548, color: col, ...o }, deco, wb);
}

function botWideBrown(ctx: C, st: number): void {
  const col = '#8A705E';
  widePants(ctx, st, col, '#5E4838', (s, off) => {
    // pinces et pli de pantalon
    line(ctx, [[CX + s * 24, 302], [CX + s * 22, 336]], 'rgba(40,25,15,0.4)', 1.5);
    line(ctx, [[CX + s * 34, 300], [CX + s * 33, 326]], 'rgba(40,25,15,0.3)', 1.2);
    line(ctx, [[CX + s * 32, 340], [CX + s * 34 + off * 0.5, 450], [CX + s * 35 + off, 560]], 'rgba(255,255,255,0.14)', 1.6);
    line(ctx, [[CX + s * 46, 306], [CX + s * 52, 330]], 'rgba(40,25,15,0.4)', 1.4);
  }, () => {
    roundRect(ctx, CX - 51, 288, 102, 13, 4);
    fs(ctx, '#5E4838', 1.8);
    for (const x of [-34, -14, 14, 34]) line(ctx, [[CX + x, 288], [CX + x, 301]], 'rgba(0,0,0,0.3)', 1.4, false);
    roundRect(ctx, CX - 6, 289, 12, 11, 2);
    fs(ctx, lg(ctx, 0, 289, 0, 300, '#FFE9A6', GOLD, '#D9A238'), 1.3);
  });
}

function botGingham(ctx: C, st: number): void {
  const col = '#D9384B';
  widePants(ctx, st, col, '#B02437', (s, off) => {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = CX - 100; x < CX + 100; x += 12) ctx.fillRect(x, 292, 5, 290);
    for (let y = 292; y < 580; y += 12) ctx.fillRect(CX - 100, y, 200, 5);
    ctx.restore();
    line(ctx, [[CX + s * 33, 340], [CX + s * 35 + off * 0.5, 450], [CX + s * 36 + off, 556]], 'rgba(255,255,255,0.12)', 1.6);
  }, () => {
    roundRect(ctx, CX - 51, 288, 102, 13, 4);
    fs(ctx, '#B02437', 1.8);
    ribs(ctx, CX - 48, CX + 48, 289, 300, 4, 'rgba(0,0,0,0.12)');
    // cordon blanc noué
    line(ctx, [[CX - 4, 296], [CX - 14, 322], [CX - 12, 336]], '#FFFFFF', 2);
    line(ctx, [[CX + 4, 296], [CX + 12, 320], [CX + 10, 334]], '#FFFFFF', 2);
    bow(ctx, CX, 297, 0.34, '#FFFFFF');
  });
}

function botSweatGrey(ctx: C, st: number): void {
  const col = '#B7B5BC';
  widePants(ctx, st, col, '#8E8C95', (s, off) => {
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 70; i++) {
      const h = Math.sin(i * 12.9898 + s * 4.1) * 43758.5453;
      const r1 = h - Math.floor(h);
      const h2 = Math.sin(i * 78.233 + s) * 12345.678;
      const r2 = h2 - Math.floor(h2);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(90,88,100,0.22)';
      ctx.fillRect(CX + s * (4 + r1 * 62) + off * ((r2 * 200 + 300) / 250), 300 + r2 * 250, 2, 2);
    }
    ctx.restore();
    line(ctx, [[CX + s * 34, 330], [CX + s * 36 + off * 0.5, 450], [CX + s * 37 + off, 540]], 'rgba(0,0,0,0.1)', 1.5);
    // bas de jambe resserré
    ctx.fillStyle = 'rgba(90,88,100,0.35)';
    ctx.fillRect(CX + s * 34 + off - 30, 534, 60, 1.6);
  }, () => {
    roundRect(ctx, CX - 51, 288, 102, 13, 4);
    fs(ctx, '#8E8C95', 1.8);
    ribs(ctx, CX - 48, CX + 48, 289, 300, 4, 'rgba(255,255,255,0.18)');
    line(ctx, [[CX - 4, 297], [CX - 12, 326], [CX - 10, 342]], '#FFFFFF', 2.2);
    line(ctx, [[CX + 4, 297], [CX + 12, 324], [CX + 9, 340]], '#FFFFFF', 2.2);
    dot(ctx, CX - 10, 343, 1.6, '#FFFFFF', INK, 0.6);
    dot(ctx, CX + 9, 341, 1.6, '#FFFFFF', INK, 0.6);
  });
}

function botTrackRed(ctx: C, st: number): void {
  const col = '#B5223A';
  widePants(ctx, st, col, '#1E1A20', (s, off) => {
    // bande latérale noire
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(CX + s * 46, 296);
    ctx.bezierCurveTo(CX + s * 52, 390, CX + s * 58, 480, CX + s * 58 + off, 560);
    ctx.lineTo(CX + s * 44 + off, 560);
    ctx.bezierCurveTo(CX + s * 44, 480, CX + s * 38, 390, CX + s * 36, 296);
    ctx.closePath();
    ctx.fillStyle = '#1E1A20';
    ctx.fill();
    ctx.restore();
    line(ctx, [[CX + s * 28, 340], [CX + s * 28 + off * 0.5, 450], [CX + s * 30 + off, 540]], 'rgba(255,255,255,0.12)', 1.6);
  }, () => {
    roundRect(ctx, CX - 51, 288, 102, 13, 4);
    fs(ctx, '#1E1A20', 1.8);
    ribs(ctx, CX - 48, CX + 48, 289, 300, 4, 'rgba(255,255,255,0.1)');
    line(ctx, [[CX - 4, 297], [CX - 11, 322]], '#E9E4EC', 1.8);
    line(ctx, [[CX + 4, 297], [CX + 11, 320]], '#E9E4EC', 1.8);
  }, { outer: 61 });
}

function botPencilPink(ctx: C, st: number): void {
  const col = '#F0A8BE';
  const sw = st * 3;
  const hem = 462;
  const path = (c: C) => {
    c.beginPath();
    c.moveTo(CX - 50, 288);
    c.lineTo(CX + 50, 288);
    c.bezierCurveTo(CX + 56, 330, CX + 54, 400, CX + 44 + sw, hem);
    wave(c, CX - 44, CX + 44 + sw, hem, 4, 8);
    c.bezierCurveTo(CX - 54, 400, CX - 56, 330, CX - 50, 288);
    c.closePath();
  };
  path(ctx);
  fs(ctx, lg(ctx, CX - 60, 290, CX + 60, hem, '#FFD0DD', col, '#D4829D'), 2.4);
  clipped(ctx, path, () => {
    sheen(ctx, CX - 60, 292, CX + 60, hem, 0.32);
    line(ctx, [[CX - 30, 300], [CX - 36, 380], [CX - 36, 440]], 'rgba(150,60,90,0.18)', 2);
    line(ctx, [[CX + 28, 300], [CX + 32, 380], [CX + 36, 440]], 'rgba(150,60,90,0.18)', 2);
    // ourlet dentelle blanche
    ctx.fillStyle = '#FFFBF6';
    ctx.fillRect(CX - 70, hem - 18, 140, 30);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(190,140,120,0.6)';
    for (let x = CX - 50; x < CX + 50; x += 10) { ctx.beginPath(); ctx.arc(x + 5, hem - 14, 4.5, 0, Math.PI); ctx.stroke(); }
    for (let x = CX - 50; x < CX + 50; x += 10) dot(ctx, x + 5, hem - 6, 1.4, 'rgba(190,140,120,0.7)');
  });
  line(ctx, [[CX - 52 + 8, hem - 19], [CX + 52 - 8 + sw, hem - 19]], 'rgba(190,140,120,0.5)', 1, false);
  roundRect(ctx, CX - 51, 285, 102, 14, 3);
  fs(ctx, lg(ctx, 0, 285, 0, 299, '#FFC6D5', '#E593AE'), 1.9);
  // fente arrière suggérée
  line(ctx, [[CX + 2, hem - 40], [CX + 4, hem - 10]], 'rgba(150,60,90,0.3)', 1.2);
}

function botMiniBlack(ctx: C, st: number): void {
  const col = '#28232D';
  const sw = st * 3;
  const hem = 384;
  const path = (c: C) => {
    c.beginPath();
    c.moveTo(CX - 49, 290);
    c.bezierCurveTo(CX - 56, 320, CX - 64, 350, CX - 68, hem);
    for (let i = 0; i < 8; i++) {
      const x = CX - 68 + i * 17 + (i >= 4 ? sw : 0);
      c.quadraticCurveTo(x + 8.5, hem + 5 + (i % 2) * 2, x + 17, hem);
    }
    c.bezierCurveTo(CX + 64, 350, CX + 56, 320, CX + 49, 290);
    c.closePath();
  };
  path(ctx);
  fs(ctx, lg(ctx, CX - 70, 290, CX + 70, hem, '#4A424F', col, '#15121A'), 2.4);
  clipped(ctx, path, () => {
    for (let i = -7; i <= 7; i++) {
      const x0 = CX + i * 6.8;
      const x1 = CX + i * 9.6;
      ctx.beginPath();
      ctx.moveTo(x0, 292); ctx.lineTo(x1 - 3, hem + 8); ctx.lineTo(x1 + 5, hem + 8); ctx.lineTo(x0 + 3, 292);
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.07)';
      ctx.fill();
      line(ctx, [[x0, 292], [x1, hem + 8]], 'rgba(0,0,0,0.5)', 1);
    }
    sheen(ctx, CX - 60, 292, CX + 60, hem, 0.06);
  });
  roundRect(ctx, CX - 51, 285, 102, 14, 3);
  fs(ctx, '#3A3340', 1.9);
  roundRect(ctx, CX - 8, 286, 16, 12, 3);
  fs(ctx, lg(ctx, 0, 286, 0, 298, '#FFE9A6', GOLD, '#D9A238'), 1.4);
}

// ---------------------------------------------------------------- robes

function dressMiniBlack(): DressFx {
  const col = '#27232C';
  const sleeve: SleeveSpec = { len: 0.94, wid: 29, c0: '#3C3542', c1: '#1B171F', hem: true };
  return {
    sleeve,
    front(ctx, st) {
      const sw = st * 3;
      const hem = 392;
      boatSkin(ctx);
      // jupe volantée à plis
      const sk = (c: C) => {
        c.beginPath();
        c.moveTo(CX + 40, 274);
        c.bezierCurveTo(CX + 54, 300, CX + 76 + sw, 350, CX + 82 + sw, hem - 8);
        wave(c, CX - 82, CX + 82 + sw, hem, 5, 9);
        c.bezierCurveTo(CX - 76, 350, CX - 54, 300, CX - 40, 274);
        c.closePath();
      };
      sk(ctx);
      fs(ctx, lg(ctx, CX - 80, 280, CX + 80, hem, '#4A424F', col, '#14111A'), 2.4);
      clipped(ctx, sk, () => {
        for (let i = -9; i <= 9; i++) {
          const x0 = CX + i * 4.6;
          const x1 = CX + i * 9.2;
          ctx.beginPath();
          ctx.moveTo(x0, 276); ctx.lineTo(x1 - 3, hem + 8); ctx.lineTo(x1 + 4, hem + 8); ctx.lineTo(x0 + 2, 276);
          ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.26)' : 'rgba(255,255,255,0.07)';
          ctx.fill();
        }
        sheen(ctx, CX - 80, 290, CX + 80, hem, 0.07);
        // volant du bas
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(CX - 100, hem - 18, 220, 4);
      });
      line(ctx, [[CX - 78, hem - 17], [CX, hem - 12], [CX + 78 + sw, hem - 17]], 'rgba(0,0,0,0.5)', 1.2);
      // corsage col bateau
      const bo: BodyO = { hem: 284, hemW: 44, waist: 43, shW: 55, wy: 262, nx: 42, ny: 168, nd: 8 };
      boatBody(ctx, bo);
      fs(ctx, lg(ctx, 60, 170, 180, 284, '#4A424F', col, '#18141D'), 2.4);
      clipped(ctx, (c) => boatBody(c, bo), () => sheen(ctx, 80, 176, 160, 284, 0.1));
      ctx.beginPath();
      ctx.moveTo(CX - 42, 168);
      ctx.quadraticCurveTo(CX, 168 + 16, CX + 42, 168);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4A424F';
      ctx.stroke();
      // couture de taille
      line(ctx, [[CX - 42, 274], [CX, 282], [CX + 42, 274]], 'rgba(255,255,255,0.18)', 1.4);
    },
  };
}

function dressBodyconRed(): DressFx {
  return {
    front(ctx, st) {
      const sw = st * 2;
      const hem = 408;
      const path = (c: C) => {
        c.beginPath();
        c.moveTo(CX - 20, 160);
        c.lineTo(CX - 32, 170);
        c.bezierCurveTo(CX - 38, 184, CX - 48, 196, CX - 46, 216);
        c.bezierCurveTo(CX - 46, 244, CX - 42, 258, CX - 41, 276);
        c.bezierCurveTo(CX - 54, 294, CX - 58, 330, CX - 55, 360);
        c.bezierCurveTo(CX - 54, 380, CX - 52, 396, CX - 50, hem);
        c.quadraticCurveTo(CX, hem + 8, CX + 50 + sw, hem);
        c.bezierCurveTo(CX + 52, 396, CX + 54, 380, CX + 55, 360);
        c.bezierCurveTo(CX + 58, 330, CX + 54, 294, CX + 41, 276);
        c.bezierCurveTo(CX + 42, 258, CX + 46, 244, CX + 46, 216);
        c.bezierCurveTo(CX + 48, 196, CX + 38, 184, CX + 32, 170);
        c.lineTo(CX + 20, 160);
        c.quadraticCurveTo(CX + 12, 214, CX, 204);
        c.quadraticCurveTo(CX - 12, 214, CX - 20, 160);
        c.closePath();
      };
      bareTorso(ctx, 150, 292, 90);
      path(ctx);
      fs(ctx, lg(ctx, CX - 50, 170, CX + 50, hem, '#F0576C', '#D6283F', '#9A1128'), 2.4);
      clipped(ctx, path, () => {
        sheen(ctx, CX - 54, 200, CX + 54, hem, 0.28);
        // fronces sur le côté du buste
        for (let i = 0; i < 4; i++) line(ctx, [[CX + 46, 236 + i * 9], [CX + 14, 244 + i * 9 + 3]], 'rgba(90,5,20,0.28)', 1.4);
        line(ctx, [[CX - 44, 320], [CX - 40, 400]], 'rgba(90,5,20,0.18)', 2);
        // ourlet
        ctx.fillStyle = 'rgba(90,5,20,0.18)';
        ctx.fillRect(CX - 60, hem - 7, 130, 4);
        // décolleté en cœur
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(255,200,205,0.55)';
        ctx.beginPath(); ctx.moveTo(CX - 16, 198); ctx.quadraticCurveTo(CX, 213, CX + 16, 198); ctx.stroke();
      });
      line(ctx, [[CX - 20, 160], [CX - 32, 170]], '#FFB3BC', 1.4, false);
      line(ctx, [[CX + 20, 160], [CX + 32, 170]], '#FFB3BC', 1.4, false);
    },
  };
}

function dressSatinChampagne(): DressFx {
  const base = genDress({ col: '#F0DDBC', col2: '#C8A878', accent: '#FFF3DC', hem: 582, flare: 30, pat: 'plain', neck: 'v', scallop: 3 });
  return {
    sleeve: base.sleeve,
    front(ctx, st) {
      const sw = st * 3;
      base.front(ctx, st);
      // reflets de satin et drapé fluide
      ctx.save();
      ctx.beginPath();
      ctx.rect(CX - 70, 172, 140, 420);
      ctx.clip();
      line(ctx, [[CX - 40, 300], [CX - 52, 420], [CX - 58, 580]], 'rgba(120,80,30,0.26)', 2.2);
      line(ctx, [[CX - 22, 310], [CX - 28, 440], [CX - 34, 580]], 'rgba(120,80,30,0.18)', 1.6);
      line(ctx, [[CX + 20, 300], [CX + 14, 440], [CX + 4, 580]], 'rgba(255,255,255,0.4)', 4);
      ctx.restore();
      // drapé cache-cœur sur le buste
      for (let i = 0; i < 3; i++) line(ctx, [[CX - 36, 228 + i * 10], [CX - 6, 240 + i * 10], [CX + 34, 226 + i * 10]], 'rgba(120,80,30,0.2)', 1.5);
      line(ctx, [[CX - 38, 174], [CX - 8, 224], [CX + 40, 262]], 'rgba(255,255,255,0.35)', 2);
      // fente haute sur la jambe (côté droit de l'image)
      ctx.beginPath();
      ctx.moveTo(CX + 18, 470);
      ctx.lineTo(CX + 10, 579);
      ctx.lineTo(CX + 42 + sw, 579);
      ctx.closePath();
      fs(ctx, lg(ctx, 0, 470, 0, 588, skinL(), skin()), 1.8);
      line(ctx, [[CX + 18, 470], [CX + 12, 560]], 'rgba(255,255,255,0.45)', 1.6, false);
    },
  };
}

function dressSageLinen(): DressFx {
  const g = genDress({
    col: '#B4C7A6', col2: '#8EA583', accent: '#F4EBDD', hem: 474, flare: 30, pat: 'buttons', neck: 'v', belt: '#8EA583',
    sleeve: { len: 0.3, wid: 33, c0: '#BDD0AF', c1: '#94AB88', hem: true },
  });
  return {
    sleeve: g.sleeve,
    front(ctx, st) {
      g.front(ctx, st);
      // texture lin : fines hachures
      ctx.save();
      ctx.beginPath();
      ctx.rect(CX - 80, 214, 160, 270);
      ctx.clip();
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const h = Math.sin(i * 12.9898) * 43758.5453;
        const r1 = h - Math.floor(h);
        const h2 = Math.sin(i * 78.233) * 12345.678;
        const r2 = h2 - Math.floor(h2);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(CX - 60 + r1 * 120, 220 + r2 * 250);
        ctx.lineTo(CX - 56 + r1 * 120, 222 + r2 * 250);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------- vestes

function jacketTrackRed(ctx: C): void {
  const col = '#B5223A';
  const hem = 334;
  const o: TorsoO = { hem, hemW: 56, waist: 51, shW: 60, neck: 'crew', nd: 2, wy: 268 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, hem, '#D43850', col, '#7E1226'), 2.5);
  clipped(ctx, (c) => torso(c, o), () => {
    // empiècements noirs sur les flancs
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + s * 46, 190);
      ctx.bezierCurveTo(CX + s * 40, 240, CX + s * 36, 290, CX + s * 36, hem + 8);
      ctx.lineTo(CX + s * 80, hem + 8);
      ctx.lineTo(CX + s * 80, 190);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 190, 0, hem, '#2E2832', '#16121A');
      ctx.fill();
      line(ctx, [[CX + s * 46, 190], [CX + s * 40, 240], [CX + s * 36, 290], [CX + s * 36, hem]], 'rgba(255,255,255,0.18)', 1.2);
    }
    sheen(ctx, 70, 176, 170, hem, 0.1);
    // bas côtelé noir
    ctx.fillStyle = '#1C1820';
    ctx.fillRect(CX - 70, hem - 14, 140, 22);
    ribs(ctx, CX - 66, CX + 66, hem - 14, hem + 6, 4, 'rgba(255,255,255,0.1)');
  });
  // zip noir central + tirette
  line(ctx, [[CX, 172], [CX, hem - 2]], '#16121A', 3.2, false);
  ctx.setLineDash([1.6, 1.6]);
  line(ctx, [[CX, 172], [CX, hem - 2]], '#9A93A3', 1, false);
  ctx.setLineDash([]);
  roundRect(ctx, CX - 2.6, 168, 5.2, 12, 2);
  fs(ctx, '#C8CDD6', 1);
  // col montant
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 1, 148);
    ctx.lineTo(CX + s * 22, 150);
    ctx.bezierCurveTo(CX + s * 28, 160, CX + s * 29, 168, CX + s * 28, 176);
    ctx.lineTo(CX + s * 2, 184);
    ctx.closePath();
    fs(ctx, lg(ctx, 0, 148, 0, 184, '#D43850', '#8E1A2E'), 1.9);
  }
  line(ctx, [[CX - 24, 156], [CX - 25, 172]], 'rgba(255,255,255,0.3)', 1.5);
  // poches zippées
  for (const s of [-1, 1]) line(ctx, [[CX + s * 20, 268], [CX + s * 24, 306]], '#16121A', 2.4);
  // petit logo
  dot(ctx, CX + 24, 216, 2.4, '#FFFFFF');
}

function jacketTrench(ctx: C): void {
  const col = '#D3B488';
  const hem = 418;
  const o: TorsoO = { hem, hemW: 66, waist: 52, shW: 61, neck: 'v', nd: 104, wy: 272 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 56, 170, 184, hem, '#EBD2A8', col, '#A98A5E'), 2.5);
  clipped(ctx, (c) => torso(c, o), () => {
    sheen(ctx, 62, 180, 178, hem, 0.22);
    line(ctx, [[CX - 50, 300], [CX - 58, 360], [CX - 62, hem]], 'rgba(100,70,30,0.22)', 2);
    line(ctx, [[CX + 50, 300], [CX + 58, 360], [CX + 62, hem]], 'rgba(100,70,30,0.22)', 2);
    // jupe qui s'évase sous la ceinture
    for (let i = -3; i <= 3; i++) line(ctx, [[CX + i * 14, 292], [CX + i * 17, hem - 2]], 'rgba(100,70,30,0.12)', 1.2, false);
  });
  lapels(ctx, col);
  // rabat d'épaule
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 30, 170); ctx.lineTo(CX + s * 52, 184); ctx.lineTo(CX + s * 56, 196); ctx.lineTo(CX + s * 40, 186); ctx.closePath();
    fs(ctx, shade(col, -0.08), 1.4);
    dot(ctx, CX + s * 40, 181, 1.5, '#6B4A2A');
  }
  // double boutonnage
  for (const s of [-1, 1]) for (const y of [236, 262, 322, 350, 378]) dot(ctx, CX + s * 17 + (y < 262 ? s * 2 : 0), y, 3, '#7B5A38', INK, 1);
  // ceinture + boucle
  ctx.beginPath();
  ctx.moveTo(CX - 52, 268); ctx.quadraticCurveTo(CX, 278, CX + 52, 268); ctx.lineTo(CX + 53, 284); ctx.quadraticCurveTo(CX, 294, CX - 53, 284); ctx.closePath();
  fs(ctx, lg(ctx, 0, 268, 0, 294, '#E2C79B', '#B5946A'), 1.9);
  roundRect(ctx, CX - 7, 273, 14, 14, 2);
  fs(ctx, lg(ctx, 0, 273, 0, 287, '#FFE9A6', GOLD, '#D9A238'), 1.4);
  line(ctx, [[CX - 3, 280], [CX + 3, 280]], '#9A6E1E', 1.3);
  // poches à rabat
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 28, 322); ctx.lineTo(CX + s * 52, 324); ctx.lineTo(CX + s * 52, 334); ctx.lineTo(CX + s * 29, 332); ctx.closePath();
    fs(ctx, shade(col, -0.06), 1.4);
  }
}

function jacketCroppedPink(ctx: C): void {
  const col = '#F2A6BC';
  const hem = 304;
  const o: TorsoO = { hem, hemW: 54, waist: 52, shW: 60, neck: 'v', nd: 50, wy: 262 };
  torso(ctx, o);
  fs(ctx, lg(ctx, 60, 170, 180, hem, '#FFC8D8', col, '#D6819C'), 2.5);
  clipped(ctx, (c) => torso(c, o), () => {
    // bouclette / tweed discret
    for (let i = 0; i < 110; i++) {
      const h = Math.sin(i * 12.9898) * 43758.5453;
      const r1 = h - Math.floor(h);
      const h2 = Math.sin(i * 78.233) * 12345.678;
      const r2 = h2 - Math.floor(h2);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(160,60,90,0.18)';
      ctx.fillRect(CX - 62 + r1 * 124, 172 + r2 * 138, 2.2, 2.2);
    }
    sheen(ctx, 66, 176, 174, hem, 0.18);
    ctx.fillStyle = 'rgba(160,60,90,0.18)';
    ctx.fillRect(CX - 70, hem - 8, 140, 12);
  });
  // col cranté
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 160); ctx.lineTo(CX + s * 44, 178); ctx.lineTo(CX + s * 34, 192); ctx.lineTo(CX + s * 20, 210); ctx.lineTo(CX + s * 3, 212); ctx.lineTo(CX + s * 2, 190); ctx.closePath();
    fs(ctx, lg(ctx, CX - 50, 160, CX + 50, 212, '#FFD0DE', '#E58AA5'), 1.9);
  }
  // boutonnage doré
  line(ctx, [[CX, 212], [CX, hem]], 'rgba(120,40,70,0.35)', 1.3, false);
  for (const y of [226, 250, 274, 296]) dot(ctx, CX + 1, y, 3.2, GOLD, INK, 1.1);
  // poches
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 24, 262); ctx.lineTo(CX + s * 46, 264); ctx.lineTo(CX + s * 46, 282); ctx.lineTo(CX + s * 25, 280); ctx.closePath();
    fs(ctx, shade(col, -0.05), 1.4);
    dot(ctx, CX + s * 35, 272, 1.6, GOLD, INK, 0.7);
  }
}

// ---------------------------------------------------------------- enregistrement

export function installClothes(): void {
  const set = <T>(tbl: Partial<Record<ClothId, T>>, id: string, v: T): void => { (tbl as Record<string, T>)[id] = v; };

  // --- tenues d'événements : peignoir et pyjamas (robes courtes ou longues, manches douces)
  set(DRESSES, 'dr-bathrobe', genDress({ col: '#FFFFFF', col2: '#E8E2F2', accent: '#B9A5E8', hem: 520, flare: 22, pat: 'lace', neck: 'v', belt: '#D9CDF5', scallop: 2, sleeve: { len: 0.9, wid: 36, c0: '#FFFFFF', c1: '#E4DDF0', cuff: '#D9CDF5' } }));
  set(DRESSES, 'dr-pajama-pink', genDress({ col: '#FFD3E2', col2: '#F3A5C0', accent: '#FFFFFF', hem: 430, flare: 26, pat: 'dots', neck: 'round', belt: '#FFFFFF', sleeve: { len: 0.32, wid: 34, c0: '#FFE1EB', c1: '#F3A5C0', hem: true } }));
  set(DRESSES, 'dr-pajama-stars', genDress({ col: '#C9C0F2', col2: '#8F82D6', accent: '#FFE7A0', hem: 470, flare: 24, pat: 'hearts', neck: 'round', belt: '#FFE7A0', sleeve: { len: 0.9, wid: 33, c0: '#D8D1F7', c1: '#8F82D6', cuff: '#B9AEEA' } }));
  set(DRESSES, 'dr-nightgown-silk', genDress({ col: '#F5C9D6', col2: '#D98EA6', accent: '#FFF4E8', hem: 540, flare: 28, pat: 'plain', neck: 'sweet', scallop: 3 }));

  set(SLEEVES, 'top-stripe-blue', { len: 1, wid: 28, c0: '#4A72E6', c1: '#1D3A98', cuff: '#2447B0' });
  set(SLEEVES, 'top-pinstripe-brown', { len: 0.74, wid: 29, c0: '#6A4A3A', c1: '#3F281F', cuff: '#5A3C2F' });
  set(SLEEVES, 'top-satin-pink', { len: 0.3, wid: 40, c0: '#FFD3DF', c1: '#D98AA2', hem: true, puff: '#F8BCCB' });
  set(SLEEVES, 'top-stripe-yellow', { len: 1, wid: 28, c0: '#F8EDB8', c1: '#CDBE80', cuff: '#C9BA7C' });
  set(SLEEVES, 'top-lace-cream', { len: 1, wid: 33, c0: '#FFFAF0', c1: '#E5CFB3', cuff: '#FFFFFF' });

  set(TOPS, 'top-stripe-blue', topStripeBlue);
  set(TOPS, 'top-pinstripe-brown', topPinstripeBrown);
  set(TOPS, 'top-satin-pink', topSatinPink);
  set(TOPS, 'top-tank-white', topTankWhite);
  set(TOPS, 'top-stripe-yellow', topStripeYellow);
  set(TOPS, 'top-crop-black', topCropBlack);
  set(TOPS, 'top-lace-cream', topLaceCream);

  set(BOTTOMS, 'bot-jeans-light', (c, st) => jeansDraw(c, st, '#9DC1E8', '#7BA2D0', 'rgba(255,255,255,0.28)'));
  set(BOTTOMS, 'bot-wide-brown', botWideBrown);
  set(BOTTOMS, 'bot-pencil-pink', botPencilPink);
  set(BOTTOMS, 'bot-gingham-pants', botGingham);
  set(BOTTOMS, 'bot-sweat-grey', botSweatGrey);
  set(BOTTOMS, 'bot-track-red', botTrackRed);
  set(BOTTOMS, 'bot-mini-black', botMiniBlack);

  set(DRESSES, 'dr-mini-black', dressMiniBlack());
  set(DRESSES, 'dr-bodycon-red', dressBodyconRed());
  set(DRESSES, 'dr-satin-champagne', dressSatinChampagne());
  set(DRESSES, 'dr-sage-linen', dressSageLinen());

  set(JACKETS, 'jk-track-red', { draw: jacketTrackRed, sleeve: { len: 1, wid: 31, c0: '#D43850', c1: '#8E1A2E', cuff: '#1C1820' } });
  set(JACKETS, 'jk-trench-beige', { draw: jacketTrench, sleeve: { len: 1, wid: 32, c0: '#EBD2A8', c1: '#B5946A', cuff: '#C9AA7C' } });
  set(JACKETS, 'jk-cropped-pink', { draw: jacketCroppedPink, sleeve: { len: 1, wid: 30, c0: '#FFC8D8', c1: '#D6819C', cuff: '#E58AA5' } });
}
