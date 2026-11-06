/**
 * Portraits dessinés des proches fictifs (maman, tante, sœur, amie) : médaillons ronds dans la même veine que les décors
 * (pastel, contour brun doux). Un seul dessin partagé par les dialogues, les notifications, Messages et l'annuaire.
 */
import { REL_IDS, RELATIVES, type RelId, type RelInfo } from '../../data/family/relatives';
import { makeCanvas } from './kit';

const INK = 'rgba(88,67,63,0.78)';
const cache = new Map<string, HTMLCanvasElement>();

function shade(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16); const f = (v: number): number => Math.max(0, Math.min(255, Math.round(v + (a > 0 ? (255 - v) * a : v * a))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Dessine un proche dans un repère 100 × 100 (centre 50 ; buste coupé en bas). */
export function drawRelative(g: CanvasRenderingContext2D, info: RelInfo): void {
  const { skin, hair, hairStyle, accent, cheek } = info.look;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = (w = 1.6): void => { g.lineWidth = w; g.strokeStyle = INK; g.stroke(); };
  // cheveux arrière
  g.fillStyle = hair;
  if (hairStyle === 'long') { g.beginPath(); g.moveTo(22, 52); g.quadraticCurveTo(14, 96, 30, 104); g.lineTo(70, 104); g.quadraticCurveTo(86, 96, 78, 52); g.quadraticCurveTo(50, 8, 22, 52); g.fill(); ink(); }
  else if (hairStyle === 'curly') { for (const [x, y, r] of [[26, 44, 13], [74, 44, 13], [20, 60, 11], [80, 60, 11], [32, 30, 12], [68, 30, 12], [50, 22, 14], [24, 76, 9], [76, 76, 9]] as const) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); ink(1.2); } }
  else if (hairStyle === 'bob') { g.beginPath(); g.moveTo(22, 50); g.quadraticCurveTo(18, 82, 30, 84); g.lineTo(70, 84); g.quadraticCurveTo(82, 82, 78, 50); g.quadraticCurveTo(50, 10, 22, 50); g.fill(); ink(); }
  else { g.beginPath(); g.arc(50, 14, 11, 0, Math.PI * 2); g.fill(); ink(1.2); } // chignon
  // buste
  g.beginPath(); g.moveTo(14, 104); g.quadraticCurveTo(18, 78, 50, 76); g.quadraticCurveTo(82, 78, 86, 104); g.closePath();
  const bg = g.createLinearGradient(0, 76, 0, 104); bg.addColorStop(0, accent); bg.addColorStop(1, shade(accent, -0.18)); g.fillStyle = bg; g.fill(); ink();
  // cou
  g.fillStyle = shade(skin, -0.06); g.beginPath(); g.roundRect(42, 64, 16, 18, 6); g.fill();
  // visage
  g.beginPath(); g.ellipse(50, 48, 25, 29, 0, 0, Math.PI * 2);
  const fg = g.createRadialGradient(44, 40, 4, 50, 50, 36); fg.addColorStop(0, shade(skin, 0.18)); fg.addColorStop(1, skin); g.fillStyle = fg; g.fill(); ink();
  // frange / raie
  g.fillStyle = hair;
  if (hairStyle === 'bun') { g.beginPath(); g.moveTo(25, 46); g.quadraticCurveTo(24, 20, 50, 19); g.quadraticCurveTo(76, 20, 75, 46); g.quadraticCurveTo(66, 30, 50, 30); g.quadraticCurveTo(34, 30, 25, 46); g.fill(); ink(1.2); }
  else if (hairStyle === 'curly') { for (const [x, y, r] of [[34, 28, 9], [50, 24, 10], [66, 28, 9]] as const) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); ink(1.1); } }
  else if (hairStyle === 'bob') { g.beginPath(); g.moveTo(24, 48); g.quadraticCurveTo(26, 18, 50, 18); g.quadraticCurveTo(74, 18, 76, 48); g.quadraticCurveTo(64, 32, 52, 36); g.quadraticCurveTo(38, 32, 24, 48); g.fill(); ink(1.2); }
  else { g.beginPath(); g.moveTo(24, 50); g.quadraticCurveTo(24, 18, 50, 18); g.quadraticCurveTo(76, 18, 76, 50); g.quadraticCurveTo(60, 28, 50, 34); g.quadraticCurveTo(40, 28, 24, 50); g.fill(); ink(1.2); }
  // joues, yeux, sourcils, nez, sourire
  for (const x of [34, 66]) { const cg = g.createRadialGradient(x, 58, 0, x, 58, 8); cg.addColorStop(0, `${cheek}aa`); cg.addColorStop(1, `${cheek}00`); g.fillStyle = cg; g.beginPath(); g.arc(x, 58, 8, 0, Math.PI * 2); g.fill(); }
  for (const x of [39, 61]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, 48, 5, 4.4, 0, 0, Math.PI * 2); g.fill(); ink(1);
    g.fillStyle = '#3a2820'; g.beginPath(); g.arc(x, 48.4, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 0.9, 47.3, 0.9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - 6, 40.5); g.quadraticCurveTo(x, 37.5, x + 6, 40.5); g.strokeStyle = shade(hair, 0.0); g.lineWidth = 1.8; g.stroke();
  }
  g.beginPath(); g.moveTo(50, 50); g.quadraticCurveTo(52, 57, 49, 58); g.strokeStyle = 'rgba(120,70,50,0.55)'; g.lineWidth = 1.3; g.stroke();
  g.beginPath(); g.moveTo(42, 65); g.quadraticCurveTo(50, 72, 58, 65); g.strokeStyle = '#b5605f'; g.lineWidth = 2; g.stroke();
}

/** Médaillon rond (taille en px). Mis en cache. */
export function relativeFaceCanvas(id: RelId, size = 96): HTMLCanvasElement {
  const key = `${id}|${size}`;
  const hit = cache.get(key); if (hit) return hit;
  const info = RELATIVES[id];
  const c = makeCanvas(size, size); const g = c.getContext('2d')!;
  const k = size / 100;
  g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip();
  const bg = g.createLinearGradient(0, 0, size, size); bg.addColorStop(0, shade(info.look.accent, 0.55)); bg.addColorStop(1, shade(info.look.accent, 0.1)); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.scale(k, k); g.translate(0, 2); drawRelative(g, info);
  g.restore();
  g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
  if (cache.size > 24) cache.delete(cache.keys().next().value as string);
  cache.set(key, c);
  return c;
}
export const relativeFaceUrl = (id: RelId, size = 96): string => relativeFaceCanvas(id, size).toDataURL('image/png');
export const ALL_RELATIVES: readonly RelId[] = REL_IDS;
