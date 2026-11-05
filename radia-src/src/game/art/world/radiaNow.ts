/**
 * Radia telle qu'elle est habillée MAINTENANT : un seul point d'entrée pour tous les
 * écrans (accueil, dialogues, échecs, puzzle, album, fin…). Quand elle change de tenue
 * au dressing, tout le jeu suit, car chaque écran redessine à partir du look sauvegardé.
 */
import type { Look } from '../../../data/world/ids';
import type { Expr } from '../../../data/dialogue';
import { drawAvatar, avatarCanvas, type AvatarOpts } from './avatar';
import { currentLook } from '../../world/look';
import { getFaceCustom } from '../characters';
import { faceKey, isDefaultFace } from '../../../data/world/face';
import { hasPhotos as hasPhotosP, photoUrl as photoUrlP } from '../../../core/photos';
import { makeCanvas } from '../kit';
import { paintedLookId as paintedLookIdPure, type PaintedId } from '../../world/paintedLook';

/** Signature courte du look : sert de clé de cache / de texture. */
export function lookKey(l: Look = currentLook()): string {
  // le visage personnalisé fait partie de la clé (sinon un portrait en cache garderait l'ancien visage) ; vide tant que rien n'est personnalisé
  const fc = getFaceCustom();
  const face = isDefaultFace(fc) ? '' : `.f${hash(faceKey(fc))}`;
  // « .P » : l'illustration peinte est prête et remplace le dessin (sinon un sprite en cache garderait la version vectorielle)
  return `${l.hair}.${l.top}.${l.bottom}.${l.dress}.${l.jacket}.${l.shoes}.${l.bag}.${l.acc.join('+')}.${l.crown}${face}${paintedFor(l) ? '.P' : ''}`;
}
const hash = (t: string): string => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

// ---- Radia PEINTE (même artiste qu'Auguste) : illustrations du pack chiffré, utilisées quand elle porte la tenue qu'elles montrent.
// Sinon (autre tenue, coiffure, accessoire ou visage personnalisé) : dessin vectoriel du dressing, qui suit chaque choix.
const painted: Partial<Record<PaintedId | 'bust-radia' | 'bust-radia-nc', HTMLImageElement>> = {};
/** La tenue (et le visage) correspondent-ils à l'illustration peinte ? Règle pure : game/world/paintedLook.ts */
export const paintedLookId = (l: Look): PaintedId | null => paintedLookIdPure(l, isDefaultFace(getFaceCustom()));
/** Illustration prête pour ce look (null : dessin vectoriel). */
function paintedFor(l: Look): HTMLImageElement | null { const id = paintedLookId(l); return id ? painted[id] ?? null : null; }
const PAINT_REF_H = 1018; // hauteur de l'illustration d'Auguste : même échelle pour les deux (Radia reste un peu plus petite, comme sur la référence)
/** Charge les illustrations peintes de Radia (sans risque, répétable). */
export function warmRadia(): Promise<void> {
  if (!hasPhotosP()) return Promise.resolve();
  const ids = ['char-radia', 'char-radia-nc', 'bust-radia', 'bust-radia-nc'] as const;
  return Promise.all(ids.map((n) => painted[n] ? undefined : photoUrlP(n).then((u) => {
    if (!u) return;
    const im = new Image(); im.src = u;
    return im.decode().then(() => { painted[n] = im; }).catch(() => undefined);
  }))).then(() => undefined);
}
function drawPainted(ctx: CanvasRenderingContext2D, im: HTMLImageElement, w: number, h: number): void {
  // même règle que l'illustration d'Auguste dans une boîte 240 × 600 : pieds en bas, échelle commune
  const k = Math.min(w / 240, h / 600);
  const s = (600 * 0.97 * k) / PAINT_REF_H;
  const dw = im.width * s, dh = im.height * s;
  ctx.save(); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, (w - dw) / 2, h - 6 * k - dh, dw, dh);
  ctx.restore();
}

/** Radia en pied (240 × 600 logiques) avec son look actuel. */
export function drawRadiaNow(ctx: CanvasRenderingContext2D, w: number, h: number, opts: AvatarOpts = {}): void {
  const im = paintedFor(currentLook());
  if (im) { drawPainted(ctx, im, w, h); return; }
  drawAvatar(ctx, currentLook(), w, h, opts);
}

/** Radia en pied dans un canvas neuf (événements, scènes) : peinte si possible, sinon dessinée (mis en cache par le dessin vectoriel). */
export function radiaNowCanvas(w: number, h: number, opts: AvatarOpts = {}): HTMLCanvasElement {
  const im = paintedFor(currentLook());
  if (!im) return avatarCanvas(currentLook(), w, h, opts);
  const key = `${im.src}|${w}x${h}`;
  let c = paintedCache.get(key);
  if (!c) { c = makeCanvas(w, h); drawPainted(c.getContext('2d')!, im, w, h); if (paintedCache.size > 30) paintedCache.delete(paintedCache.keys().next().value as string); paintedCache.set(key, c); }
  return c;
}
const paintedCache = new Map<string, HTMLCanvasElement>();
/** Pour une photo souvenir (look enregistré) : illustration peinte si ce look y correspond et qu'elle est prête. */
export function paintedImageFor(l: Look): HTMLImageElement | null { return paintedFor(l); }
export { drawPainted };

const crops = new Map<string, HTMLCanvasElement>();

function crop(kind: 'face' | 'bust', expr: Expr, outW: number, blink: boolean): HTMLCanvasElement {
  const look = currentLook();
  const key = `${kind}|${outW}|${expr}|${blink ? 1 : 0}|${lookKey(look)}`;
  let c = crops.get(key);
  if (c) return c;
  const pid = paintedLookId(look); const pim = pid ? painted[pid] : undefined;
  if (pid && pim) {
    // illustration peinte : buste = image dédiée (avec / sans couronne), visage = carré centré sur la tête
    const bust = painted[pid === 'char-radia' ? 'bust-radia' : 'bust-radia-nc'];
    const top = pim.height - 952; // la couronne ajoute de la hauteur au-dessus de la tête
    const src = kind === 'bust' && bust ? { im: bust, x: 0, y: 0, w: bust.width, h: bust.height } : kind === 'bust' ? { im: pim, x: 0, y: 0, w: pim.width, h: Math.round(pim.width * 1.16) } : { im: pim, x: 78, y: top + 50, w: 190, h: 190 };
    const outH = Math.round(outW * (src.h / src.w));
    c = makeCanvas(outW, outH);
    const g = c.getContext('2d')!; g.imageSmoothingQuality = 'high';
    g.drawImage(src.im, src.x, src.y, src.w, src.h, 0, 0, outW, outH);
    if (crops.size > 60) crops.delete(crops.keys().next().value as string);
    crops.set(key, c);
    return c;
  }
  // zones en coordonnées logiques de l'avatar (boîte 240 × 600)
  const r = kind === 'face' ? { x: 52, y: 26, w: 136, h: 136 } : { x: 14, y: 22, w: 212, h: 300 };
  const S = 2.4; // résolution de la source
  const src = avatarCanvas(look, Math.round(240 * S), Math.round(600 * S), { expr, blink });
  const k = src.width / 240;
  const outH = Math.round(outW * (r.h / r.w));
  c = makeCanvas(outW, outH);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, c.width, c.height);
  if (crops.size > 60) crops.delete(crops.keys().next().value as string);
  crops.set(key, c);
  return c;
}

/** Tête de Radia (médaillon / bulle / échecs). */
export const radiaFaceCanvas = (expr: Expr = 'smile', size = 160, blink = false): HTMLCanvasElement => crop('face', expr, size, blink);
/** Buste de Radia (dialogues). */
export const radiaBustCanvas = (expr: Expr = 'neutral', w = 400, blink = false): HTMLCanvasElement => crop('bust', expr, w, blink);

// ---- Auguste : l'illustration détourée (avec le lien secret), sinon le dessin vectoriel.
import { hasPhotos, photoUrl } from '../../../core/photos';
let augImg: HTMLImageElement | null = null;
/** Charge l'illustration d'Auguste en avance (appel sans risque, répétable). */
export function warmAuguste(): Promise<void> {
  const r = warmRadia(); // le duo se charge ensemble : Radia peinte arrive en même temps qu'Auguste
  if (augImg || !hasPhotos()) return r;
  return photoUrl('char-auguste').then((u) => {
    if (!u) return;
    const im = new Image();
    im.src = u;
    return im.decode().then(() => { augImg = im; }).catch(() => undefined);
  }).then(() => r);
}
export const augusteCutout = (): HTMLImageElement | null => augImg;
/** Dessine l'illustration d'Auguste dans la boîte 240 × 600 (pieds en bas). Vrai si elle était prête. */
export function drawAugusteCutout(ctx: CanvasRenderingContext2D, boxW = 240, boxH = 600): boolean {
  const im = augImg;
  if (!im) return false;
  const aspect = im.width / im.height;
  const h = Math.min(boxH * 0.97, (boxW * 1.0) / aspect);
  ctx.drawImage(im, (boxW - h * aspect) / 2, boxH - 6 - h, h * aspect, h);
  return true;
}
