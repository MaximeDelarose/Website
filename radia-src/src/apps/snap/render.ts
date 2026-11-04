/** Snapchien : composition d'une photo (décor, Radia, Auguste, chat, filtre, cadre — via la photo souvenir du jeu) + autocollants. */
import type { PhotoRec } from '../../events/types';
import { drawPhoto, renderPhoto } from '../../events/photo/render';
import { frameAt } from '../../events/photo/data';
import { drawCat, type CatOpts } from '../../game/art/world/cat';
import { drawSticker } from '../art';
import type { Sticker } from './model';
import { makeCanvas } from '../../game/art/kit';

export const RATIO = 4 / 5;
export interface SnapMeta { cat: boolean; stickers: Sticker[]; catOpts?: CatOpts }

/** Dessine la photo complète (4:5) dans w × h, `t` en secondes. */
export function drawSnap(g: CanvasRenderingContext2D, rec: PhotoRec, meta: SnapMeta, w: number, h: number, t = 0, selected = '', animate = true): void {
  drawPhoto(g, rec, w, h, t);
  if (meta.cat) {
    const fr = frameAt(rec.frame), u = w / 393;
    const [l, tp, r, b] = fr.inset;
    const ix = l * u, iy = tp * u, iw = w - (l + r) * u, ih = h - (tp + b) * u;
    const bw = iw * 0.4, bh = bw * 0.9;
    g.save();
    g.beginPath(); g.roundRect(ix, iy, iw, ih, (fr.id === 'polaroid' ? 2 : 12) * u); g.clip();
    g.translate(ix + iw * 0.5 - bw / 2 + iw * (rec.auguste ? 0.02 : 0.26), iy + ih - bh + 4 * u);
    drawCat(g, 'sit', bw, bh, t, meta.catOpts ?? {});
    g.restore();
  }
  for (const st of meta.stickers) drawSticker(g, st, w, h, t, st.id === selected, animate);
}

export function renderSnap(rec: PhotoRec, meta: SnapMeta, w: number, t = 0): HTMLCanvasElement {
  const h = Math.round(w / RATIO);
  const c = makeCanvas(w, h);
  drawSnap(c.getContext('2d')!, rec, meta, c.width, c.height, t, '', false);
  return c;
}
export { renderPhoto };
