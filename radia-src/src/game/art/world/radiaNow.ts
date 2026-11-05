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
import { RIG } from './rig';
import { paintedLookId as paintedLookIdPure, paintedHeadKind, type PaintedId } from '../../world/paintedLook';
import { setPaintedHeadProvider, paintedHeadEpoch, type PaintedHead, type PaintedLayer } from './avatar';
import { accGroup } from '../../../data/world/ids';

/** Signature courte du look : sert de clé de cache / de texture. */
export function lookKey(l: Look = currentLook()): string {
  // le visage personnalisé fait partie de la clé (sinon un portrait en cache garderait l'ancien visage) ; vide tant que rien n'est personnalisé
  const fc = getFaceCustom();
  const face = isDefaultFace(fc) ? '' : `.f${hash(faceKey(fc))}`;
  // « .P » : l'illustration peinte est prête et remplace le dessin (sinon un sprite en cache garderait la version vectorielle)
  return `${l.hair}.${l.top}.${l.bottom}.${l.dress}.${l.jacket}.${l.shoes}.${l.bag}.${l.acc.join('+')}.${l.crown}${face}${paintedFor(l) ? '.P' : ''}.h${paintedHeadEpoch()}`;
}
const hash = (t: string): string => { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

// ---- Radia PEINTE (même artiste qu'Auguste) : illustrations du pack chiffré, utilisées quand elle porte la tenue qu'elles montrent.
// Sinon (autre tenue, coiffure, accessoire ou visage personnalisé) : dessin vectoriel du dressing, qui suit chaque choix.
const painted: Partial<Record<'char-radia-nc', HTMLImageElement>> = {};
/** Figure peinte prête : l'illustration SANS couronne (crâne complété par le calque de tête) + couronne dorée en calque si elle est portée. */
export interface PaintedFigure { im: HTMLImageElement; crown: boolean }
/** La tenue (et le visage) correspondent-ils à l'illustration peinte ? Règle pure : game/world/paintedLook.ts */
export const paintedLookId = (l: Look): PaintedId | null => paintedLookIdPure(l, isDefaultFace(getFaceCustom()));
/** Illustration prête pour ce look (null : dessin vectoriel). */
function paintedFor(l: Look): PaintedFigure | null { const id = paintedLookId(l); const im = painted['char-radia-nc']; return id && im ? { im, crown: id === 'char-radia' } : null; }
// ---- tête peinte sur le corps dessiné (toutes les tenues) : couches tirées de l'illustration (pack chiffré)
const heads: Partial<Record<'headp-radia-nc' | 'facep-radia' | 'crownp-gold', HTMLImageElement>> = {};
// origine de chaque calque dans le repère de l'illustration SANS couronne (px) — voir scripts/painted-head/build.py
//  · tête : image décalée de PAD = 26 px vers le haut (dôme du crâne reconstruit) ; visage : recadrage (100 ; 20) ; couronne : détourée du haut de l'illustration avec couronne
const HEAD_GEOM = { 'headp-radia-nc': { x0: 0, y0: -26 }, 'facep-radia': { x0: 100, y0: 20 }, 'crownp-gold': { x0: 127, y0: -45 } } as const;
const layer = (id: keyof typeof HEAD_GEOM): PaintedLayer | undefined => { const im = heads[id]; return im ? { im, x0: HEAD_GEOM[id].x0, y0: HEAD_GEOM[id].y0, w: im.width, h: im.height } : undefined; };
function headFor(l: Look): PaintedHead | null {
  const k = paintedHeadKind(l, isDefaultFace(getFaceCustom()), accGroup);
  if (!k) return null;
  // tête complète si prête, sinon visage seul (repli) ; la couronne dorée peinte est un calque séparé, indépendant de la coiffure
  const full = k === 'head' ? layer('headp-radia-nc') : undefined;
  const head = full ?? layer('facep-radia');
  if (!head) return null;
  return { kind: full ? 'head' : 'face', head, crown: l.crown === 'cr-gold' ? layer('crownp-gold') : undefined };
}
setPaintedHeadProvider(headFor);
const PAINT_REF_H = 1018; // hauteur de l'illustration d'Auguste : même échelle pour les deux (Radia reste un peu plus petite, comme sur la référence)
/** Charge les illustrations peintes de Radia (sans risque, répétable). */
export function warmRadia(): Promise<void> {
  if (!hasPhotosP()) return Promise.resolve();
  const ids = ['char-radia-nc'] as const;
  const hids = ['headp-radia-nc', 'facep-radia', 'crownp-gold'] as const;
  const load = (n: string) => photoUrlP(n).then((u) => { if (!u) return null; const im = new Image(); im.src = u; return im.decode().then(() => im).catch(() => null); });
  return Promise.all([
    ...ids.map((n) => painted[n] ? undefined : load(n).then((im) => { if (im) painted[n] = im; })),
    ...hids.map((n) => heads[n] ? undefined : load(n).then((im) => { if (im) heads[n] = im; })),
  ]).then(() => { setPaintedHeadProvider(headFor); }); // nouvelle « époque » : les dessins en cache sont refaits avec la tête peinte
}
export function drawPainted(ctx: CanvasRenderingContext2D, fig: PaintedFigure, w: number, h: number): void {
  const im = fig.im;
  // même règle que l'illustration d'Auguste dans une boîte 240 × 600 : pieds en bas, échelle commune
  const k = Math.min(w / 240, h / 600);
  const s = (600 * 0.97 * k) / PAINT_REF_H;
  const dw = im.width * s, dh = im.height * s;
  ctx.save(); ctx.imageSmoothingQuality = 'high';
  // le visage de l'illustration est 3,5 px à droite du centre de l'image : on le recale sur l'axe du corps (même axe que la tête posée sur le corps dessiné)
  const faceShift = (RIG.painted.eyeX - im.width / 2) * s;
  const x0 = (w - dw) / 2 - faceShift, y0 = h - 6 * k - dh;
  ctx.drawImage(im, x0, y0, dw, dh);
  // sommet du crâne : l'illustration est tranchée net en haut ; on superpose le dôme reconstruit (calque de tête, mêmes pixels en dessous)
  const hd = heads['headp-radia-nc'];
  if (hd) {
    const g = HEAD_GEOM['headp-radia-nc'], clipPx = 46; // seulement le haut de la tête (lignes -26 à 46 de l'illustration)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, y0 + clipPx * s); ctx.clip();
    ctx.drawImage(hd, x0 + g.x0 * s, y0 + g.y0 * s, hd.width * s, hd.height * s);
    ctx.restore();
  }
  const cr = fig.crown ? heads['crownp-gold'] : undefined;
  if (cr) { const g = HEAD_GEOM['crownp-gold']; ctx.drawImage(cr, x0 + g.x0 * s, y0 + g.y0 * s, cr.width * s, cr.height * s); }
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
  const key = `${im.im.src}|${im.crown ? 'c' : 'n'}|${w}x${h}|${heads['headp-radia-nc'] ? 1 : 0}${heads['crownp-gold'] ? 1 : 0}`;
  let c = paintedCache.get(key);
  if (!c) { c = makeCanvas(w, h); drawPainted(c.getContext('2d')!, im, w, h); if (paintedCache.size > 30) paintedCache.delete(paintedCache.keys().next().value as string); paintedCache.set(key, c); }
  return c;
}
const paintedCache = new Map<string, HTMLCanvasElement>();
/** Pour une photo souvenir (look enregistré) : illustration peinte si ce look y correspond et qu'elle est prête. */
export function paintedImageFor(l: Look): PaintedFigure | null { return paintedFor(l); }

const crops = new Map<string, HTMLCanvasElement>();

function crop(kind: 'face' | 'bust', expr: Expr, outW: number, blink: boolean): HTMLCanvasElement {
  const look = currentLook();
  const key = `${kind}|${outW}|${expr}|${blink ? 1 : 0}|${lookKey(look)}`;
  let c = crops.get(key);
  if (c) return c;
  // zones en coordonnées logiques de l'avatar (boîte 240 × 600)
  const r = kind === 'face' ? { x: 52, y: 26, w: 136, h: 136 } : { x: 14, y: 22, w: 212, h: 300 };
  const S = 2.4; // résolution de la source
  const fig = paintedFor(look); // figure peinte : même cadrage que le dessin, donc même taille de tête et de buste dans les bulles et les médaillons
  let src: HTMLCanvasElement;
  if (fig) { src = makeCanvas(Math.round(240 * S), Math.round(600 * S)); drawPainted(src.getContext('2d')!, fig, src.width, src.height); }
  else src = avatarCanvas(look, Math.round(240 * S), Math.round(600 * S), { expr, blink });
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
