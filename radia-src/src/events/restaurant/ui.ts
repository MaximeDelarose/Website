/** Styles et petits utilitaires DOM partagés par menuPick et guessMenu (les classes .rs-*). */
import { h } from '../../ui/dom';
import { dishUrl } from './dishes';
import type { DishId } from './logic';

const CSS = `
.rs-wrap{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;border-radius:22px;padding:10px 10px 12px;--c-bg:#fff7f1;--c-ink:#58433f;--c-soft:#8a6f69;--c-line:#f5a0bb;--c-card:#ffffff;--c-sel:#ffe3ee;--c-acc:#e8558f;background:var(--c-bg);color:var(--c-ink);box-shadow:0 0 0 2.5px var(--c-line),0 10px 24px rgba(59,49,82,.22);overflow:hidden}
.rs-wrap.palace{--c-bg:#2c2038;--c-ink:#fff3d6;--c-soft:#d9c28c;--c-line:#f3c86b;--c-card:#3a2b4a;--c-sel:#5a4430;--c-acc:#f3c86b;background:linear-gradient(180deg,#3a2b4a,#221830)}
.rs-wrap.rooftop{--c-bg:#3d3a4f;--c-ink:#fff2e6;--c-soft:#ffd2b8;--c-line:#ff9a8a;--c-card:#4b4760;--c-sel:#6b4a58;--c-acc:#ffb36b;background:linear-gradient(180deg,#ff9a8a 0,#8d5b86 26%,#3d3a4f 60%)}
.rs-wrap.hotel{--c-bg:#f6ece1;--c-ink:#5a4338;--c-soft:#8a6f60;--c-line:#c9a58a;--c-card:#fffaf3;--c-sel:#f0dcc6;--c-acc:#b4784f;background:repeating-linear-gradient(0deg,#f6ece1 0 22px,#f1e4d6 22px 23px)}
.rs-title{text-align:center;line-height:1.1;flex-shrink:0}
.rs-title b{display:block;font-size:20px;letter-spacing:.3px}
.rs-wrap.palace .rs-title b{font-family:Georgia,serif;letter-spacing:2px;text-transform:uppercase;font-size:17px}
.rs-wrap.hotel .rs-title b{font-family:Georgia,serif;font-style:italic}
.rs-title small{font-size:13px;color:var(--c-soft)}
.rs-tabs{display:flex;gap:6px;flex-shrink:0}
.rs-tab{flex:1;min-height:44px;border:0;border-radius:14px;background:var(--c-card);color:var(--c-ink);font:inherit;font-weight:700;font-size:13px;box-shadow:0 0 0 1.5px var(--c-line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:2px 4px;cursor:pointer}
.rs-tab small{font-weight:500;font-size:10.5px;color:var(--c-soft);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-tab.cur{background:var(--c-acc);color:#fff;box-shadow:0 0 0 2px var(--c-ink)}
.rs-wrap.palace .rs-tab.cur{color:#2c2038}
.rs-tab.cur small{color:rgba(255,255,255,.9)}
.rs-wrap.palace .rs-tab.cur small{color:#4a3520}
.rs-tab.done:not(.cur)::after{content:'✓';color:var(--c-acc);font-size:12px;line-height:1}
.rs-grid{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,176px);gap:8px;overflow-y:auto;align-content:center;padding:2px}
.rs-card{position:relative;border:0;border-radius:18px;background:var(--c-card);color:var(--c-ink);font:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px 8px;min-height:104px;box-shadow:0 0 0 1.5px var(--c-line),0 3px 8px rgba(59,49,82,.14);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.rs-card:active{transform:scale(.96)}
.rs-card img{width:min(100%,104px);aspect-ratio:1;object-fit:contain;pointer-events:none;flex-shrink:1;min-height:0}
.rs-card span{font-size:13px;font-weight:700;line-height:1.15;text-align:center;padding:0 2px}
.rs-card.sel{background:var(--c-sel);box-shadow:0 0 0 3px var(--c-acc),0 4px 12px rgba(59,49,82,.25)}
.rs-card.sel::after{content:'♥';position:absolute;top:5px;right:7px;color:var(--c-acc);font-size:18px;text-shadow:0 1px 0 rgba(255,255,255,.7)}
.rs-card.ok{box-shadow:0 0 0 3px #4fbf7b,0 4px 12px rgba(59,49,82,.25)}
.rs-card.no{opacity:.55}
.rs-card.mark::after{position:absolute;top:5px;right:7px;font-size:17px;font-weight:800}
.rs-card.ok.mark::after{content:'✓';color:#2f9e5f}
.rs-card.guess.mark::after{content:'♥';color:var(--c-acc);font-size:18px}
.rs-sum{flex:1;min-height:0;display:flex;flex-direction:column;gap:7px;justify-content:center}
.rs-row{display:flex;align-items:center;gap:10px;border:0;border-radius:18px;background:var(--c-card);color:var(--c-ink);font:inherit;text-align:left;padding:6px 12px;min-height:96px;box-shadow:0 0 0 1.5px var(--c-line);cursor:pointer}
.rs-row img{width:80px;height:80px;flex-shrink:0;pointer-events:none}
.rs-row div{flex:1;min-width:0}
.rs-row small{display:block;font-size:11.5px;color:var(--c-soft);text-transform:uppercase;letter-spacing:.8px}
.rs-row b{display:block;font-size:17px;line-height:1.15}
.rs-row em{font-style:normal;font-size:11.5px;color:var(--c-acc);font-weight:700}
.rs-foot{flex-shrink:0;display:flex;gap:8px;align-items:center}
.rs-foot .btn{flex:1;min-height:52px;font-size:17px}
.rs-foot .btn[disabled]{opacity:.45}
.rs-hint{text-align:center;font-size:13px;color:var(--c-soft);flex-shrink:0;min-height:16px}
.rs-ask{text-align:center;font-weight:800;font-size:17px;flex-shrink:0;line-height:1.2}
.rs-prog{display:flex;justify-content:center;gap:6px;flex-shrink:0}
.rs-prog i{width:26px;height:6px;border-radius:3px;background:var(--c-line);opacity:.35}
.rs-prog i.on{opacity:1;background:var(--c-acc)}
.rs-prog i.cur{opacity:1;background:var(--c-ink)}
/* scène de révélation */
.rv{position:relative;width:100%;max-width:392px;margin:0 auto;aspect-ratio:360/340;border-radius:20px;overflow:hidden;box-shadow:0 0 0 2.5px #f3c86b,0 10px 24px rgba(59,49,82,.35);flex-shrink:0;background:#3f2d55}
.rv>*{position:absolute;pointer-events:none}
.rv canvas,.rv img{display:block}
.rv .rv-bg,.rv .rv-table{left:0;top:0;width:100%;height:100%}
.rv .rv-bust{transform-origin:50% 100%;transition:transform .5s var(--ease-pop,ease)}
.rv .rv-bust.happy{animation:rvHappy 1.1s ease-in-out infinite}
.rv .rv-plate{aspect-ratio:1;transform:translate(-50%,-50%);opacity:0}
.rv .rv-plate.in{animation:rvDrop .75s cubic-bezier(.2,1.1,.4,1) forwards}
.rv .rv-plate.mine.pulse{animation:rvPulse .8s ease-in-out infinite}
.rv .rv-wait{left:0;top:0;transform:translate(-50%,-100%);transition:left 1.3s ease-in-out,opacity .5s;width:19%}
.rv .rv-flame{width:2.6%;aspect-ratio:.55;transform:translate(-50%,-100%);background:radial-gradient(ellipse at 50% 70%,#fff8c8 0,#ffd05a 45%,rgba(255,150,40,0) 75%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;animation:rvFlame .5s ease-in-out infinite alternate;filter:blur(.3px)}
.rv .rv-glow{inset:0;background:radial-gradient(ellipse 60% 45% at 54% 62%,rgba(255,205,120,.28),rgba(255,205,120,0) 70%),radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 45%,rgba(30,10,40,.4) 100%);mix-blend-mode:normal}
.rv .rv-heart{transform:translate(-50%,-50%);font-size:22px;color:#ff5c93;text-shadow:0 1px 0 #fff;opacity:0;animation:rvHeart 2.4s ease-out forwards}
.rv .rv-tag{transform:translate(-50%,0);background:rgba(255,250,245,.95);color:#58433f;font-weight:800;font-size:11.5px;padding:2px 9px;border-radius:10px;box-shadow:0 0 0 1.5px #f5a0bb;white-space:nowrap}
.rv .rv-tag.a{background:#fff0f5}
@keyframes rvDrop{0%{opacity:0;transform:translate(-50%,-250%) scale(.7)}55%{opacity:1;transform:translate(-50%,-44%) scale(1.06)}80%{transform:translate(-50%,-52%) scale(.98)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes rvPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.07)}}
@keyframes rvHappy{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(1deg)}}
@keyframes rvFlame{from{transform:translate(-50%,-100%) scale(1,1)}to{transform:translate(-50%,-100%) scale(.9,1.12) rotate(3deg)}}
@keyframes rvHeart{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx,0px)),-420%) scale(1.3)}}
.rv-lower{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:6px;position:relative;padding-top:8px}.rv-lower .btn{margin-top:auto}
.rv-dishes{display:grid;grid-template-columns:auto 1fr 1fr;gap:3px 8px;font-size:12.5px;align-items:center;background:rgba(255,250,245,.92);border-radius:16px;padding:7px 10px;box-shadow:0 0 0 1.5px #f5a0bb;color:#58433f}
.rv-dishes b{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#8a6f69}
.rv-dishes .h{color:#2f9e5f;font-weight:700}.rv-dishes .m{color:#c3405a;font-weight:700}
@media (prefers-reduced-motion:reduce){.rv .rv-plate.in{animation-duration:.01s}.rv .rv-bust.happy,.rv .rv-flame,.rs-card{animation:none}}
`;

export function ensureStyles(): void {
  if (document.getElementById('rs-style')) return;
  const el = document.createElement('style');
  el.id = 'rs-style';
  el.textContent = CSS;
  document.head.append(el);
}

export function dishImg(id: DishId, px = 104): HTMLImageElement {
  return h('img', { src: dishUrl(id, px), alt: '', draggable: false }) as HTMLImageElement;
}
