/** Vue « décor + personnages » pour les trajets et les dialogues d'un événement (animée, légère). */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { avatarCanvas } from '../../game/art/world/avatar';
import { shineAt } from '../../game/art/world/wristShine';
import { currentLook } from '../../game/world/look';
import { drawAugusteFull } from '../../game/art/characters';
import { drawAugusteCutout } from '../../game/art/world/radiaNow';
import { drawKid } from '../../game/art/world/kids';
import { makeCanvas } from '../../game/art/kit';
import type { PlaceId } from '../types';
import type { KidId } from '../../data/world/ids';

export interface StageOpts { auguste?: boolean; kids?: KidId[]; walk?: boolean }
export interface StageView { el: HTMLCanvasElement; setPlace(p: PlaceId): void; setOpts(o: StageOpts): void; dispose(): void }

const dpr = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

export function mountStage(host: HTMLElement, place: PlaceId, opts: StageOpts, alive: () => boolean): StageView {
  const cv = h('canvas.ev-stage') as HTMLCanvasElement;
  host.prepend(cv);
  let cur = place;
  let o = { ...opts };
  let raf = 0;
  let last = 0;
  let drawPlace: ((ctx: CanvasRenderingContext2D, id: PlaceId, w: number, h: number, t?: number) => void) | null = null;
  void import('../places').then((m) => { drawPlace = m.drawPlace; });
  const augCache = new Map<string, HTMLCanvasElement>();
  const augusteSprite = (w: number, hh: number, step: number): HTMLCanvasElement => {
    const k = `${w}x${hh}:${step}`;
    let c = augCache.get(k);
    if (!c) {
      c = makeCanvas(w, hh);
      const g = c.getContext('2d')!;
      const s = Math.min(w / 240, hh / 600);
      g.save(); g.translate((w - 240 * s) / 2, hh - 600 * s); g.scale(s, s);
      if (!drawAugusteCutout(g, 240, 600)) drawAugusteFull(g, { expr: 'smile', step });
      g.restore();
      augCache.set(k, c);
    }
    return c;
  };
  const kidCache = new Map<string, HTMLCanvasElement>();
  const kidSprite = (k: KidId, w: number, hh: number, f: number): HTMLCanvasElement => {
    const key = `${k}${w}x${hh}:${f}`;
    let c = kidCache.get(key);
    if (!c) { c = makeCanvas(w, hh); drawKid(c.getContext('2d')!, k, 'happy', w, hh, f * 0.4); kidCache.set(key, c); }
    return c;
  };

  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    if (!alive()) return;
    if (now - last < 66) return; // ~15 images/s
    last = now;
    const w = Math.max(1, cv.clientWidth);
    const hh = Math.max(1, cv.clientHeight);
    const d = dpr();
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(hh * d); }
    const g = cv.getContext('2d')!;
    g.setTransform(d, 0, 0, d, 0, 0);
    const t = now / 1000;
    if (drawPlace) drawPlace(g, cur, w, hh, t);
    else { g.fillStyle = '#e8d8f3'; g.fillRect(0, 0, w, hh); }
    // personnages : en bas, côte à côte
    const ph = Math.min(hh * 0.62, 360);
    const pw = ph * 0.4;
    const walk = o.walk && !reducedFx();
    const stepFor = (i: number) => (walk ? [0.3, 0, -0.3, 0][Math.floor(t * 3 + i) % 4] : 0);
    const bob = reducedFx() ? 0 : Math.sin(t * 2) * 1.5;
    const baseY = hh - 8;
    const twoX = o.auguste ? [w * 0.36, w * 0.64] : [w * 0.5];
    const rs = Math.round(ph * d) / d;
    const radia = avatarCanvas(currentLook(), Math.round(pw * 2.4 * d / 2), Math.round(rs * d), { expr: 'smile', step: stepFor(0), arms: 'down', shine: shineAt(t, reducedFx()) });
    g.drawImage(radia, twoX[0] - pw * 1.2 / 1, baseY - rs + bob, pw * 2.4 / 2 * 1, rs);
    if (o.auguste) {
      const as = augusteSprite(Math.round(pw * 2.4 * d / 2), Math.round(rs * d), Math.round(stepFor(1) * 100));
      g.drawImage(as, twoX[1] - pw * 1.2 / 1, baseY - rs + bob, pw * 2.4 / 2, rs);
    }
    const kids = o.kids ?? [];
    kids.forEach((k, i) => {
      const kh = ph * 0.42;
      const kw = kh * 0.7;
      const x = w * (0.16 + (i * 0.68) / Math.max(1, kids.length));
      const spr = kidSprite(k, Math.round(kw * d), Math.round(kh * d), Math.floor(t * 2 + i) % 2);
      g.drawImage(spr, x - kw / 2, baseY - kh + bob * 0.6, kw, kh);
    });
  };
  raf = requestAnimationFrame(draw);
  return {
    el: cv,
    setPlace: (p) => { cur = p; },
    setOpts: (n) => { o = { ...n }; },
    dispose: () => { cancelAnimationFrame(raf); cv.remove(); },
  };
}
