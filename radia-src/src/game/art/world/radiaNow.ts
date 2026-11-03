/**
 * Radia telle qu'elle est habillée MAINTENANT : un seul point d'entrée pour tous les
 * écrans (accueil, dialogues, échecs, puzzle, album, fin…). Quand elle change de tenue
 * au dressing, tout le jeu suit, car chaque écran redessine à partir du look sauvegardé.
 */
import type { Look } from '../../../data/world/ids';
import type { Expr } from '../../../data/dialogue';
import { drawAvatar, avatarCanvas, type AvatarOpts } from './avatar';
import { currentLook } from '../../world/look';
import { makeCanvas } from '../kit';

/** Signature courte du look : sert de clé de cache / de texture. */
export function lookKey(l: Look = currentLook()): string {
  return `${l.hair}.${l.top}.${l.bottom}.${l.dress}.${l.jacket}.${l.shoes}.${l.bag}.${l.acc.join('+')}.${l.crown}`;
}

/** Radia en pied (240 × 600 logiques) avec son look actuel. */
export function drawRadiaNow(ctx: CanvasRenderingContext2D, w: number, h: number, opts: AvatarOpts = {}): void {
  drawAvatar(ctx, currentLook(), w, h, opts);
}

const crops = new Map<string, HTMLCanvasElement>();

function crop(kind: 'face' | 'bust', expr: Expr, outW: number, blink: boolean): HTMLCanvasElement {
  const look = currentLook();
  const key = `${kind}|${outW}|${expr}|${blink ? 1 : 0}|${lookKey(look)}`;
  let c = crops.get(key);
  if (c) return c;
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
  if (augImg || !hasPhotos()) return Promise.resolve();
  return photoUrl('char-auguste').then((u) => {
    if (!u) return;
    const im = new Image();
    im.src = u;
    return im.decode().then(() => { augImg = im; }).catch(() => undefined);
  });
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
