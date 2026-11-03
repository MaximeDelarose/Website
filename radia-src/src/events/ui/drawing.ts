/** Visionneuse du dessin de la petite : « Le voilier jaune » (œuvre d'art au crayon de cire). */
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { audio, save } from '../../core/app';
import { kidName } from '../../core/family';
import { reactAuguste } from '../../game/world/auguste';
import { ev } from '../api';
import { drawSailboatDrawing, SAILBOAT_RATIO } from '../art/sailboat';

const CSS = `
.dw-back{position:absolute;inset:0;z-index:96;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:calc(var(--sat) + 14px) 16px calc(var(--sab) + 14px);background:rgba(40,30,60,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:fadeIn .25s ease}
.dw-back.out{animation:fadeOut .22s ease forwards}
.dw-paper{position:relative;transform:rotate(-1.6deg);padding:10px;background:#fffdf8;border-radius:6px;box-shadow:0 18px 40px rgba(0,0,0,.45),0 0 0 1px rgba(120,100,70,.18);animation:dwIn .55s cubic-bezier(.2,1.2,.3,1)}
.dw-paper canvas{display:block;width:min(84vw,360px);height:auto;border-radius:2px}
.dw-tape{position:absolute;top:-12px;left:50%;width:84px;height:24px;margin-left:-42px;background:rgba(255,236,170,.8);transform:rotate(2deg);box-shadow:0 2px 4px rgba(0,0,0,.18)}
.dw-title{color:#fff;text-align:center;font-size:16px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.dw-acts{display:flex;gap:10px;width:min(84vw,360px)}.dw-acts .btn{flex:1}
@keyframes dwIn{from{opacity:0;transform:rotate(-8deg) scale(.7) translateY(30px)}to{opacity:1;transform:rotate(-1.6deg)}}
`;

/** Dessine le papier dans un canvas (résolution écran). */
export function sailboatCanvas(cssW: number): HTMLCanvasElement {
  const d = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(cssW * d); c.height = Math.round((cssW / SAILBOAT_RATIO) * d);
  drawSailboatDrawing(c.getContext('2d')!, c.width, c.height);
  return c;
}

export function openDrawing(): void {
  if (!document.getElementById('dw-css')) { const s = document.createElement('style'); s.id = 'dw-css'; s.textContent = CSS; document.head.append(s); }
  const cv = sailboatCanvas(360);
  const close = () => { back.classList.add('out'); window.setTimeout(() => back.remove(), 230); };
  const png = h('button.btn.secondary', 'Enregistrer en PNG');
  png.addEventListener('click', tap(() => {
    cv.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'radia-le-voilier-jaune.png'; document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }));
  const back = h('div.dw-back',
    h('div.dw-title', `Un dessin de ${kidName('kid1')} ♡`),
    h('div.dw-paper', h('i.dw-tape'), cv),
    h('div.dw-acts', png, h('button.btn', { on: { click: tap(close, { sound: false }) } }, 'Fermer')));
  ui.root.append(back);
  audio.play('reward');
  const c = ev().counters;
  if (!c['drawing.seen']) { c['drawing.seen'] = 1; save.save(); window.setTimeout(() => reactAuguste('family', 1, true), 900); }
}
