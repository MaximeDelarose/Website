/** Rendu des photos souvenirs : décor + Radia + Auguste + enfants + filtre + cadre + titre. */
import type { PhotoRec } from '../types';
import { makeCanvas, heartPath, starPath, seeded } from '../../game/art/kit';
import { drawAvatar } from '../../game/art/world/avatar';
import { drawAugusteCutout, warmAuguste, augusteCutout } from '../../game/art/world/radiaNow';
import { drawAugusteFull } from '../../game/art/characters';
import { drawKid } from '../../game/art/world/kids';
import { drawPlace } from '../places';
import { POSES, FRAMES, FILTERS, frameAt, filterAt, poseAt, exportFileName, fmtDate, kidSlots, type FrameDef, type FilterDef, type PoseDef } from './data';

export { POSES, FRAMES, FILTERS, exportFileName };

const RATIO = 4 / 5;
type C = CanvasRenderingContext2D;

// ---- Auguste mis en cache par taille / pose
const augCache = new Map<string, HTMLCanvasElement>();
function augusteCanvas(w: number, h: number, arms: string, step: number, expr: string): HTMLCanvasElement {
  const key = `${w}x${h}|${arms}|${step}|${expr}|${augusteCutout() ? 1 : 0}`;
  let c = augCache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    const g = c.getContext('2d')!;
    const k = Math.min(w / 240, h / 600);
    g.save(); g.translate((w - 240 * k) / 2, h - 600 * k); g.scale(k, k);
    if (!drawAugusteCutout(g, 240, 600)) drawAugusteFull(g, { expr: expr as 'smile', step, arms: arms as 'down' });
    g.restore();
    if (augCache.size > 40) augCache.delete(augCache.keys().next().value as string);
    augCache.set(key, c);
  }
  return c;
}
const radCache = new Map<string, HTMLCanvasElement>();
function radiaCanvas(rec: PhotoRec, w: number, h: number, arms: string, step: number, expr: string): HTMLCanvasElement {
  const l = rec.look;
  const key = `${w}x${h}|${l.hair}|${l.top}|${l.bottom}|${l.dress}|${l.jacket}|${l.shoes}|${l.bag}|${l.acc.join(',')}|${l.crown}|${arms}|${step}|${expr}`;
  let c = radCache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    drawAvatar(c.getContext('2d')!, l, c.width, c.height, { expr: expr as 'smile', step, arms: arms as 'down' });
    if (radCache.size > 30) radCache.delete(radCache.keys().next().value as string);
    radCache.set(key, c);
  }
  return c;
}

/** Précharge ce qui peut l'être (illustration d'Auguste). */
export function warmPhotos(): Promise<void> { return warmAuguste(); }

// ---- cadre + titre (couche cachée, transparente au centre)
const frameCache = new Map<string, HTMLCanvasElement>();
function frameLayer(fr: FrameDef, w: number, h: number, title: string, ts: number): HTMLCanvasElement {
  const key = `${fr.id}|${w}x${h}|${title}|${fr.id === 'polaroid' ? ts : 0}`;
  let c = frameCache.get(key);
  if (c) return c;
  c = makeCanvas(w, h);
  const g = c.getContext('2d')!;
  const u = w / 393;
  const [l, t, r, b] = fr.inset;
  const ix = l * u, iy = t * u, iw = w - (l + r) * u, ih = h - (t + b) * u;
  const rad = fr.id === 'polaroid' ? 2 * u : 12 * u;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // fond du cadre
  g.fillStyle = (() => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, fr.base[0]); gr.addColorStop(1, fr.base[1]); return gr; })();
  g.fillRect(0, 0, w, h);
  // décors de cadre
  const rng = seeded(9);
  if (fr.id === 'coeurs') {
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 10 * u; x < w; x += 24 * u) { heartPath(g, x, 10 * u, 6 * u); g.fill(); heartPath(g, x + 12 * u, h - 10 * u, 6 * u); g.fill(); }
    for (let y = 10 * u; y < h; y += 24 * u) { heartPath(g, 10 * u, y + 12 * u, 6 * u); g.fill(); heartPath(g, w - 10 * u, y, 6 * u); g.fill(); }
  } else if (fr.id === 'dentelle') {
    g.fillStyle = '#ffffff';
    const rr = 6.5 * u;
    for (let x = rr; x < w; x += rr * 1.7) { g.beginPath(); g.arc(x, rr * 0.2, rr, 0, 7); g.arc(x, h - rr * 0.2, rr, 0, 7); g.fill(); }
    for (let y = rr; y < h; y += rr * 1.7) { g.beginPath(); g.arc(rr * 0.2, y, rr, 0, 7); g.arc(w - rr * 0.2, y, rr, 0, 7); g.fill(); }
    g.strokeStyle = fr.line; g.lineWidth = 1.4 * u; g.setLineDash([2 * u, 3 * u]);
    g.strokeRect(ix - 6 * u, iy - 6 * u, iw + 12 * u, ih + 12 * u); g.setLineDash([]);
  } else if (fr.id === 'lavande' || fr.id === 'minuit') {
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + rng() * 0.5})`; const x = rng() * w, y = rng() * h, s = (0.8 + rng() * 1.8) * u; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  } else if (fr.id === 'or') {
    g.strokeStyle = fr.line; g.lineWidth = 2 * u; g.strokeRect(6 * u, 6 * u, w - 12 * u, h - 12 * u);
    g.strokeStyle = fr.accent; g.lineWidth = 1.2 * u; g.strokeRect(3 * u, 3 * u, w - 6 * u, h - 6 * u);
  } else if (fr.id === 'romantique') {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let x = 14 * u; x < w; x += 26 * u) { heartPath(g, x, 10 * u, 4.6 * u); g.fill(); heartPath(g, x + 13 * u, h - 10 * u, 4.6 * u); g.fill(); }
    for (let y = 14 * u; y < h; y += 26 * u) { heartPath(g, 10 * u, y + 13 * u, 4.6 * u); g.fill(); heartPath(g, w - 10 * u, y, 4.6 * u); g.fill(); }
    g.strokeStyle = fr.accent; g.lineWidth = 1.2 * u; g.strokeRect(17 * u, 17 * u, w - 34 * u, h - 34 * u);
  } else if (fr.id === 'classique') {
    g.strokeStyle = fr.accent; g.lineWidth = 1.2 * u; g.strokeRect(6 * u, 6 * u, w - 12 * u, h - 12 * u);
    g.strokeStyle = fr.line; g.lineWidth = 2 * u; g.strokeRect(10 * u, 10 * u, w - 20 * u, h - 20 * u);
  } else if (fr.id === 'rose') {
    g.strokeStyle = fr.line; g.lineWidth = 2.4 * u; g.setLineDash([1, 6 * u]); g.strokeRect(7 * u, 7 * u, w - 14 * u, h - 14 * u); g.setLineDash([]);
  }
  // ombre intérieure + trou
  g.save();
  g.shadowColor = 'rgba(60,30,50,0.45)'; g.shadowBlur = 8 * u; g.shadowOffsetY = 1.5 * u;
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.fillStyle = '#000'; g.fill();
  g.restore();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.fill(); g.globalCompositeOperation = 'source-over';
  // liseré autour de la photo
  g.strokeStyle = fr.id === 'polaroid' ? 'rgba(88,67,63,0.18)' : fr.line; g.lineWidth = (fr.id === 'polaroid' ? 1 : 2.2) * u;
  g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.stroke();
  // coins ornés (cœurs) pour rose / or
  if (fr.id === 'rose' || fr.id === 'or') {
    g.fillStyle = fr.id === 'rose' ? '#ffffff' : '#fff6cf';
    for (const [cx, cy] of [[ix, iy], [ix + iw, iy], [ix, iy + ih], [ix + iw, iy + ih]] as const) { heartPath(g, cx, cy, 7 * u); g.fill(); g.strokeStyle = fr.accent; g.lineWidth = 1 * u; g.stroke(); }
  }
  // titre
  if (fr.id === 'polaroid') {
    g.fillStyle = fr.text; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, title, iw - 20 * u, 26 * u, `italic 700 `, `"Segoe Script","Bradley Hand","Comic Sans MS",cursive`);
    g.fillText(title, w / 2, iy + ih + 28 * u);
    g.font = `${12 * u}px sans-serif`; g.globalAlpha = 0.6; g.fillText(fmtDate(ts), w / 2, iy + ih + 50 * u); g.globalAlpha = 1;
  } else {
    // bandeau en haut de la photo (clip sur le trou)
    g.save();
    g.font = ''; fitText(g, title, iw - 70 * u, 22 * u, '700 ', 'Georgia, "Times New Roman", serif');
    const tw = Math.min(iw - 36 * u, g.measureText(title).width + 46 * u), bh = 34 * u, bx = w / 2 - tw / 2, by = iy + 10 * u;
    g.shadowColor = 'rgba(60,30,50,0.35)'; g.shadowBlur = 6 * u; g.shadowOffsetY = 2 * u;
    g.beginPath(); g.roundRect(bx, by, tw, bh, bh / 2);
    const gr = g.createLinearGradient(0, by, 0, by + bh);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,238,246,0.92)');
    g.fillStyle = gr; g.fill();
    g.shadowColor = 'transparent'; g.strokeStyle = fr.accent; g.lineWidth = 2 * u; g.stroke();
    g.fillStyle = '#58433f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(title, w / 2, by + bh / 2 + 1 * u);
    g.fillStyle = fr.accent; heartPath(g, bx + 15 * u, by + bh / 2, 5 * u); g.fill(); heartPath(g, bx + tw - 15 * u, by + bh / 2, 5 * u); g.fill();
    g.restore();
  }
  if (frameCache.size > 24) frameCache.delete(frameCache.keys().next().value as string);
  frameCache.set(key, c);
  return c;
}
function fitText(g: C, text: string, maxW: number, size: number, weight: string, family: string): void {
  let s = size;
  for (let i = 0; i < 12; i++) { g.font = `${weight}${s}px ${family}`; if (g.measureText(text).width <= maxW || s < 9) break; s *= 0.92; }
}

// ---- filtre
function applyFilter(g: C, f: FilterDef, x: number, y: number, w: number, h: number, t: number): void {
  if (!f.layers.length && !f.vignette) return;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (const [mode, col, a] of f.layers) { g.globalCompositeOperation = mode; g.globalAlpha = a; g.fillStyle = col; g.fillRect(x, y, w, h); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  if (f.vignette) {
    const gr = g.createRadialGradient(x + w / 2, y + h * 0.5, Math.min(w, h) * 0.3, x + w / 2, y + h * 0.5, Math.max(w, h) * 0.72);
    gr.addColorStop(0, 'rgba(40,10,30,0)'); gr.addColorStop(1, `rgba(40,10,30,${f.vignette})`);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  if (f.grain) { const r = seeded(5); g.fillStyle = 'rgba(80,50,30,0.1)'; for (let i = 0; i < 220; i++) g.fillRect(x + r() * w, y + r() * h, 1.4, 1.4); }
  if (f.sparkle) { const r = seeded(15); for (let i = 0; i < 22; i++) { const s = 1 + r() * 1.6; g.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i))})`; g.beginPath(); g.arc(x + r() * w, y + r() * h * 0.5, s, 0, 7); g.fill(); } }
  g.restore();
}

/** Dessine la photo complète dans un contexte, taille en pixels w × h (ratio 4:5 conseillé). */
export function drawPhoto(g: C, rec: PhotoRec, w: number, h: number, t = 0): void {
  const fr = frameAt(rec.frame), fl = filterAt(rec.filter), pose = poseAt(rec.pose);
  const u = w / 393;
  const [l, tp, r, b] = fr.inset;
  const ix = Math.round(l * u), iy = Math.round(tp * u), iw = Math.round(w - (l + r) * u), ih = Math.round(h - (tp + b) * u);
  g.save();
  g.beginPath(); g.roundRect(ix, iy, iw, ih, (fr.id === 'polaroid' ? 2 : 12) * u); g.clip();
  g.save(); g.translate(ix, iy);
  drawPlace(g, rec.place, iw, ih, t);
  g.restore();
  // personnages
  const ground = iy + ih - 7 * u;
  const hr = Math.round(ih * (rec.auguste ? 0.64 : 0.7));
  const aw = Math.round(hr * 0.5);
  const cx = ix + iw / 2;
  const d = iw * pose.gap;
  const breathe = Math.sin(t * 1.8) * 1.2 * u;
  const rx = rec.auguste ? cx - d : cx;
  const shadow = (x: number, rxs: number): void => { g.fillStyle = 'rgba(60,40,80,0.22)'; g.beginPath(); g.ellipse(x, ground - 2 * u, rxs, 6 * u, 0, 0, 7); g.fill(); };
  const radSpr = radiaCanvas(rec, aw, hr, pose.radia.arms, pose.radia.step, pose.radia.expr);
  const hh = Math.round(hr * 1.02);
  const augSpr = rec.auguste ? augusteCanvas(aw, hh, pose.auguste.arms, pose.auguste.step, pose.auguste.expr) : null;
  const k = hr / 600; // échelle du sprite 240 × 600
  const ax = cx + d;
  const sh = pose.shift ?? [0, 0];
  /** Dessine un sprite posé au sol (pivot aux pieds) avec inclinaison / échelle éventuelles. */
  const put = (spr: HTMLCanvasElement, x: number, sw: number, shh: number, i: 0 | 1): void => {
    const tl = pose.tilt?.[i] ?? 0, sc = pose.scale?.[i] ?? 1;
    if (!tl && sc === 1) { g.drawImage(spr, Math.round(x - sw / 2), Math.round(ground - shh - breathe * 0.4), sw, shh); return; }
    g.save(); g.translate(x, ground - breathe * 0.4); g.rotate(tl); g.scale(sc, sc);
    g.drawImage(spr, -sw / 2, -shh, sw, shh);
    g.restore();
  };
  const rxs = rx + sh[0] * iw;
  shadow(rxs, hr * 0.2);
  if (pose.extra === 'arm' && augSpr) { shadow(ax, hr * 0.2); put(augSpr, ax, aw, hh, 1); }
  put(radSpr, rxs, aw, hr, 0);
  if (augSpr && pose.extra !== 'arm') { shadow(ax, hr * 0.2); put(augSpr, ax, aw, hh, 1); }
  if (rec.auguste && pose.extra) drawPoseExtra(g, pose.extra, { rx: rxs, ax, ground, hr, hh, k, u, t, radSpr, aw, breathe });
  // enfants au premier plan
  const kids = rec.kids ?? [];
  const slots = kidSlots(kids.length);
  const hk = Math.round(ih * 0.3);
  kids.forEach((kid, i) => {
    const kx = ix + iw * slots[i];
    g.save(); g.translate(kx - hk * 0.45, ground + 3 * u - hk); drawKid(g, kid, 'happy', hk * 0.9, hk, t + i * 0.7); g.restore();
  });
  applyFilter(g, fl, ix, iy, iw, ih, t);
  g.restore();
  g.drawImage(frameLayer(fr, w, h, rec.title, rec.ts), 0, 0);
}

/** Photo complète dans un nouveau canvas (w × h pixels ; par défaut 4:5). */
export function renderPhoto(rec: PhotoRec, w: number, h = Math.round(w / RATIO), t = 0): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  drawPhoto(c.getContext('2d')!, rec, c.width, c.height, t);
  return c;
}

/** Enregistre en PNG : partage système avec fichier si possible, sinon téléchargement. */
export async function exportPng(rec: PhotoRec): Promise<void> {
  const cv = renderPhoto(rec, 1080, 1350, 0);
  const blob: Blob | null = await new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
  if (!blob) return;
  const name = exportFileName(rec.title);
  try {
    const file = new File([blob], name, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: rec.title });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}


// ---- accessoires des poses de la séance (petits cœurs, mains jointes, bras autour de la taille)
interface ExtraCtx { rx: number; ax: number; ground: number; hr: number; hh: number; k: number; u: number; t: number; radSpr: HTMLCanvasElement; aw: number; breathe: number }
const SKIN = '#f2c6a6';
function miniHeart(g: C, x: number, y: number, s: number, a = 1): void {
  g.save(); g.globalAlpha = a; heartPath(g, x, y, s); g.fillStyle = '#ff6f9f'; g.fill();
  g.strokeStyle = '#58433f'; g.lineWidth = Math.max(1, s * 0.16); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(x - s * 0.32, y - s * 0.18, s * 0.16, s * 0.1, -0.6, 0, 7); g.fill();
  g.restore();
}
function drawPoseExtra(g: C, kind: NonNullable<PoseDefExtra>, e: ExtraCtx): void {
  const { rx, ax, ground, hr, k, u, t } = e;
  const bob = Math.sin(t * 2.2) * 1.5 * u;
  if (kind === 'hand') {
    const hx = (rx + ax) / 2, hy = ground - hr + 336 * k;
    g.save();
    g.lineWidth = 1.3 * u; g.strokeStyle = '#58433f'; g.lineCap = 'round';
    for (const [dx, rot] of [[-3.4, -0.25], [3.4, 0.25]] as const) {
      g.beginPath(); g.ellipse(hx + dx * u, hy, 8 * u, 6.4 * u, rot, 0, 7); g.fillStyle = SKIN; g.fill(); g.stroke();
    }
    g.beginPath(); g.moveTo(hx - 3 * u, hy - 2 * u); g.lineTo(hx + 3 * u, hy + 2 * u); g.stroke();
    g.restore();
    miniHeart(g, hx, hy - hr * 0.16 + bob, 10 * u, 0.95);
  } else if (kind === 'kiss') {
    const hx = (rx + ax) / 2 + hr * 0.02, hy = ground - hr * 0.78;
    miniHeart(g, hx, hy - 10 * u + bob, 13 * u);
    miniHeart(g, hx + 10 * u, hy - 58 * u + bob * 1.4, 7.5 * u, 0.85);
    miniHeart(g, hx - 18 * u, hy - 40 * u - bob, 6 * u, 0.75);
  } else if (kind === 'arm') {
    // bras de Radia (manche = couleur échantillonnée sur son propre sprite) qui passe autour de la taille d'Auguste
    let sleeve = '#4a4560';
    try {
      const px0 = Math.round(e.aw / 2 + 72 * k), py0 = Math.round(270 * k);
      const dta = e.radSpr.getContext('2d')!.getImageData(px0, py0, 1, 1).data;
      if (dta[3] > 200) sleeve = `rgb(${dta[0]},${dta[1]},${dta[2]})`;
    } catch { /* couleur par défaut */ }
    const sx0 = rx + 48 * k, sy0 = ground - hr + 214 * k;
    const ex = (rx + ax) / 2 + 30 * k, ey = ground - hr * 0.56;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(sx0, sy0); g.quadraticCurveTo(sx0 + 34 * k, sy0 + 46 * k, ex, ey);
    g.strokeStyle = '#58433f'; g.lineWidth = 30 * k + 2.4 * u; g.stroke();
    g.strokeStyle = sleeve; g.lineWidth = 30 * k; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(sx0 + 2 * k, sy0 + 4 * k); g.quadraticCurveTo(sx0 + 30 * k, sy0 + 42 * k, ex - 6 * k, ey - 4 * k); g.stroke();
    g.lineWidth = 1.2 * u; g.strokeStyle = '#58433f';
    g.beginPath(); g.ellipse(ex + 5 * k, ey + 6 * k, 7.4 * u, 6.2 * u, 0.5, 0, 7); g.fillStyle = SKIN; g.fill(); g.stroke(); g.restore();
    miniHeart(g, (rx + ax) / 2 + 4 * u, ground - hr * 0.98 + bob, 6 * u, 0.9);
  } else if (kind === 'chic') {
    for (const [dx, dy, s] of [[-0.3, 0.9, 5], [0.45, 0.82, 4], [0.05, 0.97, 3.4]] as const) {
      const a = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.4 + dx * 9));
      g.save(); g.globalAlpha = a; g.fillStyle = '#fff3c4'; g.strokeStyle = '#e0b24d'; g.lineWidth = 0.8 * u;
      g.translate((rx + ax) / 2 + dx * hr * 0.7, ground - hr * dy); starPath(g, 0, 0, s * u, s * u * 0.28, 4); g.fill(); g.stroke(); g.restore();
    }
  }
}
type PoseDefExtra = PoseDef['extra'];
