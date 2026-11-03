/** Aides DOM/canvas partagées par les mini-jeux d'action (boucle rAF plafonnée, particules, cartes d'intro et de fin). */
import { h } from '../../../ui/dom';
import { reducedFx } from '../../../core/app';
import { heartPath, starPath } from '../../../game/art/kit';
import type { ActivityCtx } from '../../types';

const CSS = `
.ea-card{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(81,68,109,.45);animation:fadeIn .25s ease}
.ea-box{width:100%;max-width:340px;background:#fffaf5;border-radius:26px;padding:18px 16px 16px;text-align:center;box-shadow:0 0 0 3px #f5a0bb,0 12px 30px rgba(59,49,82,.4);animation:evPop .45s var(--ease-pop);max-height:100%;overflow:auto}
.ea-box h3{margin:0 0 4px;font-size:23px;color:var(--rose-deep)}
.ea-box p{margin:6px 0 12px;font-size:16px;line-height:1.35;color:var(--choco)}
.ea-box .ea-art{display:flex;justify-content:center;margin:4px 0 6px}
.ea-box .btn{width:100%;margin-top:6px}
.ea-stars{font-size:38px;letter-spacing:4px;margin:2px 0 6px;color:#f3c86b;text-shadow:0 2px 0 rgba(88,67,63,.35)}
.ea-stars i{font-style:normal;display:inline-block}
.ea-stars i.off{color:#e6d9d0;text-shadow:none}
.ea-stars i.pop{animation:evPop .5s var(--ease-pop) both}
.ea-stage{position:relative;flex:1;min-height:0;border-radius:20px;overflow:hidden;box-shadow:0 0 0 2.5px rgba(88,67,63,.25)}
.ea-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.ea-hud{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 6px;font-size:15px;color:var(--nuit);flex-shrink:0}
.ea-hud b{font-size:19px}
.ea-tag{background:#fff;border-radius:999px;padding:3px 12px;box-shadow:0 0 0 2px rgba(88,67,63,.18);font-weight:600;white-space:nowrap}
.ea-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.ea-sub{font-size:14px;color:var(--choco-soft);text-align:center;margin:0 0 6px}
.ea-opt{min-height:44px;padding:6px 12px;border-radius:999px;border:0;background:#fff;color:var(--choco);font:inherit;font-size:15px;box-shadow:0 0 0 2px rgba(88,67,63,.18),0 2px 0 rgba(88,67,63,.12);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.ea-opt.on{background:var(--rose-vif);color:#fff;box-shadow:0 0 0 2px var(--rose-deep),0 2px 0 var(--rose-deep)}
.ea-opt i{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(88,67,63,.4);display:inline-block}
.ea-label{font-size:13px;font-weight:700;color:var(--nuit);margin:6px 0 4px;text-align:left}
.ea-grid{display:grid;gap:10px}
.ea-tile{position:relative;border:0;border-radius:18px;background:#fffaf5;padding:8px 6px;text-align:center;font:inherit;color:var(--choco);box-shadow:0 0 0 2px rgba(88,67,63,.15),0 3px 0 rgba(88,67,63,.12);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
.ea-tile.on{background:#ffe7f0;box-shadow:0 0 0 3px var(--rose-vif),0 3px 0 var(--rose-deep)}
.ea-tile b{font-size:14px}.ea-tile small{font-size:11.5px;color:var(--choco-soft);line-height:1.15}
.ea-mc{position:relative;aspect-ratio:1;perspective:500px;border:0;background:none;padding:0;cursor:pointer}
.ea-mc .in{position:absolute;inset:0;transition:transform .32s;transform-style:preserve-3d}
.ea-mc.up .in{transform:rotateY(180deg)}
.ea-mc .f,.ea-mc .b{position:absolute;inset:0;border-radius:14px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ea-mc .b img{width:100%;height:100%}
.ea-mc .f{transform:rotateY(180deg);background:#fffaf5;box-shadow:0 0 0 2.5px rgba(88,67,63,.45),0 3px 0 rgba(88,67,63,.2)}
.ea-mc .f img{width:84%;height:84%}
.ea-mc.ok .f{background:#ffe7f0;box-shadow:0 0 0 3px #ff75a8,0 3px 0 #e8558f}
.ea-pad{border:0;border-radius:24px;font-size:46px;color:rgba(255,255,255,.9);box-shadow:0 0 0 3px rgba(88,67,63,.45),0 5px 0 rgba(88,67,63,.3);opacity:.6;transition:transform .12s,opacity .12s,filter .12s;cursor:pointer}
.ea-pad.lit{opacity:1;transform:scale(1.05);filter:brightness(1.25) saturate(1.2);box-shadow:0 0 0 3px #fff,0 0 28px 8px rgba(255,255,255,.85)}
@media (prefers-reduced-motion:reduce){.ea-box{animation:none}}
`;
export function injectCss(): void {
  if (document.getElementById('ea-css')) return;
  const s = document.createElement('style'); s.id = 'ea-css'; s.textContent = CSS; document.head.append(s);
}

/** Boucle rAF plafonnée (≤ fps images/s) ; s'arrête seule si l'activité est quittée. Retourne stop(). */
export function startLoop(ctx: ActivityCtx, fn: (now: number, dt: number) => void, fps = 30): () => void {
  let raf = 0; let last = 0; let on = true;
  const step = (t: number): void => {
    if (!on) return;
    raf = requestAnimationFrame(step);
    if (!ctx.isAlive()) { stop(); return; }
    if (last && t - last < 1000 / fps - 3) return;
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0.033;
    last = t;
    fn(performance.now(), dt);
  };
  const stop = (): void => { on = false; cancelAnimationFrame(raf); };
  raf = requestAnimationFrame(step);
  ctx.onDispose(stop);
  return stop;
}

export interface Fit { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; w: number; h: number; dpr: number }
/** Crée un canvas plein cadre dans `stage` à la taille CSS courante (DPR plafonné à 2). */
export function fitCanvas(stage: HTMLElement, cv = document.createElement('canvas')): Fit {
  if (!cv.parentElement) stage.append(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(120, stage.clientWidth); const hh = Math.max(120, stage.clientHeight);
  cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.lineJoin = 'round'; g.lineCap = 'round';
  return { cv, g, w, h: hh, dpr };
}

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 'dot' | 'heart' | 'star'; g: number }
interface FT { x: number; y: number; text: string; life: number; color: string; size: number }
/** Particules et textes flottants dessinés sur le canvas du jeu. */
export class Fx {
  ps: P[] = []; texts: FT[] = [];
  burst(x: number, y: number, n: number, colors: string[], o: { kind?: P['kind']; speed?: number; size?: number; life?: number; gravity?: number } = {}): void {
    const k = reducedFx() ? Math.ceil(n / 3) : n;
    for (let i = 0; i < k; i++) {
      const a = Math.random() * Math.PI * 2; const sp = (o.speed ?? 120) * (0.4 + Math.random() * 0.8);
      this.ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: (o.life ?? 0.8) * (0.7 + Math.random() * 0.6), size: (o.size ?? 5) * (0.7 + Math.random() * 0.6), color: colors[i % colors.length], kind: o.kind ?? 'dot', g: o.gravity ?? 160 });
    }
    if (this.ps.length > 220) this.ps.splice(0, this.ps.length - 220);
  }
  text(x: number, y: number, text: string, color = '#fff', size = 22): void { this.texts.push({ x, y, text, life: 0, color, size }); if (this.texts.length > 8) this.texts.shift(); }
  update(dt: number): void {
    for (const p of this.ps) { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
    this.ps = this.ps.filter((p) => p.life < p.max);
    for (const t of this.texts) { t.life += dt; t.y -= 38 * dt; }
    this.texts = this.texts.filter((t) => t.life < 0.9);
  }
  draw(g: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const a = 1 - p.life / p.max; g.globalAlpha = Math.max(0, a); g.fillStyle = p.color;
      if (p.kind === 'heart') { heartPath(g, p.x, p.y, p.size * 2.4); g.fill(); }
      else if (p.kind === 'star') { starPath(g, p.x, p.y, p.size * 1.4, p.size * 0.6); g.fill(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = Math.min(1, (0.9 - t.life) * 3); const sc = 0.8 + Math.min(0.3, t.life * 2);
      g.globalAlpha = a; g.font = `700 ${Math.round(t.size * sc)}px Fredoka, system-ui, sans-serif`;
      g.lineWidth = 5; g.strokeStyle = 'rgba(88,67,63,.85)'; g.strokeText(t.text, t.x, t.y);
      g.fillStyle = t.color; g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
  }
}

/** Carte d'introduction : une phrase d'instruction + bouton de démarrage (attend un toucher). */
export function introCard(ctx: ActivityCtx, o: { title: string; text: string; art?: HTMLElement; button?: string }): Promise<void> {
  injectCss();
  return new Promise<void>((resolve) => {
    const box = h('div.ea-box', h('h3', o.title), o.art ? h('div.ea-art', o.art) : null, h('p', o.text));
    const card = h('div.ea-card', box);
    const go = ctx.button(o.button ?? 'C’est parti ♡', () => { card.remove(); ctx.sound('pop2'); resolve(); }, 'gold');
    box.append(go);
    ctx.root.append(card);
    ctx.onDispose(() => card.remove());
    ctx.sound('pop1');
  });
}

/** Écran de fin mignon : titre, étoiles facultatives, lignes de bilan, confettis, bouton. */
export function endCard(ctx: ActivityCtx, o: { title: string; lines: string[]; stars?: number; art?: HTMLElement; button?: string }): Promise<void> {
  injectCss();
  return new Promise<void>((resolve) => {
    const box = h('div.ea-box', h('h3', o.title));
    if (o.stars !== undefined) {
      const st = h('div.ea-stars');
      for (let i = 0; i < 3; i++) { const s = h('i', i < o.stars ? '★' : '☆'); if (i >= o.stars) s.classList.add('off'); st.append(s); if (i < o.stars) ctx.later(() => { s.classList.add('pop'); ctx.sound('pop3'); }, 250 + i * 280); }
      box.append(st);
    }
    if (o.art) box.append(h('div.ea-art', o.art));
    for (const l of o.lines) box.append(h('p', l));
    const card = h('div.ea-card', box);
    box.append(ctx.button(o.button ?? 'Continuer ♡', () => { card.remove(); resolve(); }, 'gold'));
    ctx.root.append(card);
    ctx.onDispose(() => card.remove());
    ctx.sound('victory');
    ctx.confetti(30);
  });
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const pick = <T,>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/** Horloge en secondes (performance.now), figée quand l'onglet est caché. */
export function makeClock(ctx: ActivityCtx): () => number {
  let t0 = performance.now(); let hiddenAt = 0;
  const onVis = (): void => { if (document.hidden) hiddenAt = performance.now(); else if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; } };
  document.addEventListener('visibilitychange', onVis);
  ctx.onDispose(() => document.removeEventListener('visibilitychange', onVis));
  return () => (performance.now() - t0) / 1000;
}
