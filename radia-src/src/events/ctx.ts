/** Fabrique du contexte donné aux mini-jeux (voir ActivityCtx dans types.ts). */
import '../events/events.css';
import { h, tap } from '../ui/dom';
import { icon } from '../ui/icons';
import { audio, reducedFx } from '../core/app';
import { kidName } from '../core/family';
import { isRelId, relLabel } from '../data/family/relatives';
import { relativeFaceUrl } from '../game/art/relatives';
import { currentLook } from '../game/world/look';
import { drawAugusteFull } from '../game/art/characters';
import { drawAugusteCutout } from '../game/art/world/radiaNow';
import { radiaFaceCanvas, radiaNowCanvas } from '../game/art/world/radiaNow';
import { canvasUrl, makeCanvas, paint } from '../game/art/kit';
import { medallionCanvas } from '../game/art/characters';
import { hasPhotos, photoUrlNow } from '../core/photos';
import { faceUrl as kidFace } from '../ui/components/kidCalls';
import { mulberry32 } from '../game/world/careerGames/rng';
import { addPhotoRec } from './api';
import type { ActivityCtx, Speaker, PhotoRec } from './types';
import type { KidId } from '../data/world/ids';

import { PARTNER } from '../config/gift';
export interface CtxOpts {
  root: HTMLElement;
  eventId: string;
  runId: string;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
  repeat?: number;
  alive: () => boolean;
}

const hash = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };

/** Visage rond d'un locuteur (URL d'image). */
export function speakerFace(who: Speaker): string {
  if (who === 'radia') return canvasUrl(`evf:radia:${Date.now() >> 14}`, () => radiaFaceCanvas('smile', 120));
  if (who === 'auguste') return (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste:smile', () => medallionCanvas('auguste', { expr: 'smile' }, 120));
  if (who === 'narrator') return '';
  if (isRelId(who)) return relativeFaceUrl(who, 120);
  return kidFace(who as KidId);
}

export function createCtx(o: CtxOpts): { ctx: ActivityCtx; dispose: () => void } {
  const disposers: Array<() => void> = [];
  const timers = new Set<number>();
  const seed = hash(o.runId);
  const rng = mulberry32(seed);

  const ctx: ActivityCtx = {
    root: o.root,
    params: o.params ?? {},
    look: currentLook(),
    eventId: o.eventId,
    runId: o.runId,
    data: o.data ?? {},
    repeat: o.repeat ?? 0,
    rng,
    kidName,
    header: (title, sub) => {
      const el = h('div.ev-head', h('b', title), sub ? h('small', sub) : null);
      o.root.append(el);
      return el;
    },
    button: (label, fn, cls = '') => {
      const b = h(`button.btn.ev-btn${cls ? '.' + cls.split(' ').join('.') : ''}`, label) as HTMLButtonElement;
      b.addEventListener('click', tap(fn));
      return b;
    },
    pop: (el) => {
      if (reducedFx()) return;
      el.classList.remove('ev-pop'); void el.offsetWidth; el.classList.add('ev-pop');
    },
    confetti: (n = 24) => {
      if (reducedFx()) return;
      for (let i = 0; i < n; i++) {
        const c = h('i.ev-conf', { style: `--x:${Math.round(Math.random() * 100)}%;--d:${(Math.random() * 0.5).toFixed(2)}s;--c:${['#ff75a8', '#f3c86b', '#b9a5e8', '#8fd19e', '#fff'][i % 5]};--r:${Math.round(Math.random() * 360)}deg` });
        o.root.append(c);
        window.setTimeout(() => c.remove(), 1800);
      }
    },
    sound: (name) => audio.play(name),
    wait: (ms) => new Promise((r) => { const t = window.setTimeout(() => { timers.delete(t); r(); }, ms); timers.add(t); }),
    later: (fn, ms) => { const t = window.setTimeout(() => { timers.delete(t); if (o.alive()) fn(); }, ms); timers.add(t); },
    onDispose: (fn) => { disposers.push(fn); },
    isAlive: o.alive,
    say: (who, text, expr) => new Promise<void>((resolve) => {
      const face = speakerFace(who);
      const name = who === 'radia' ? 'Radia' : who === 'auguste' ? `${PARTNER}` : who === 'narrator' ? '' : isRelId(who) ? relLabel(who) : kidName(who as KidId);
      const box = h(`div.ev-say${who === 'narrator' ? '.narr' : ''}`,
        face ? h('img.ev-say-face', { src: face, alt: '' }) : null,
        h('div.ev-say-tx', name ? h('b', name) : null, h('span', text)),
        h('i.ev-say-next', '▼'));
      void expr;
      o.root.append(box);
      audio.play('pop1');
      let done = false;
      const end = () => { if (done) return; done = true; box.classList.add('out'); window.setTimeout(() => box.remove(), 220); resolve(); };
      window.setTimeout(() => box.addEventListener('click', end, { once: true }), 250);
      disposers.push(() => { done = true; box.remove(); });
    }),
    avatar: (who, w, hh, opts = {}) => {
      if (who === 'radia') return radiaNowCanvas(Math.round(w), Math.round(hh), opts);
      const c = makeCanvas(Math.round(w), Math.round(hh));
      const g = c.getContext('2d')!;
      const k = Math.min(w / 240, hh / 600);
      g.save();
      g.translate((w - 240 * k) / 2, hh - 600 * k);
      g.scale(k, k);
      if (!drawAugusteCutout(g, 240, 600)) drawAugusteFull(g, { expr: opts.expr ?? 'smile', step: opts.step ?? 0, arms: opts.arms });
      g.restore();
      return c;
    },
    addPhoto: (rec): PhotoRec => addPhotoRec({ ...rec, look: rec.look ?? currentLook() }, o.eventId),
  };
  const dispose = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    for (const d of disposers.splice(0)) { try { d(); } catch { /* ignoré */ } }
  };
  void paint; void icon;
  return { ctx, dispose };
}
