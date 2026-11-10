/**
 * Auguste découvre la tenue de Radia : yeux écarquillés, petit cœur, scintillement, puis un grand
 * « 10 / 10 » — TOUJOURS, quelle que soit la tenue : c'est une réaction affectueuse, jamais une note.
 */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { verdictFor, VERDICT_NOTE } from '../dressLines';
import type { Activity } from '../types';

import { PARTNER } from '../../config/gift';
const CSS = `
.dv-wrap{position:relative;flex:1;min-height:0;display:flex;align-items:flex-end;justify-content:center;gap:0;padding-bottom:84px}
.dv-wrap canvas{height:min(50vh,430px);width:auto;display:block;filter:drop-shadow(0 8px 14px rgba(59,49,82,.3))}
.dv-a{animation:dvIn .9s cubic-bezier(.2,.9,.3,1) both}
.dv-a.wow{animation:dvWow .7s ease-out both}
@keyframes dvIn{from{transform:translateX(120%);opacity:0}to{transform:none;opacity:1}}
@keyframes dvWow{0%{transform:scale(1)}30%{transform:scale(1.1) translateY(-6px)}60%{transform:scale(.98)}100%{transform:scale(1)}}
.dv-r.twirl{animation:dvTw .9s ease-in-out both}
@keyframes dvTw{0%{transform:scale(1)}40%{transform:scaleX(.15) scaleY(1.04)}60%{transform:scaleX(.9)}100%{transform:scale(1)}}
.dv-fx{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;overflow:hidden}
.dv-heart,.dv-star{position:absolute;font-style:normal;animation:dvUp 2s ease-out forwards;opacity:0}
.dv-heart{color:#ff5c94;font-size:30px;text-shadow:0 2px 6px rgba(0,0,0,.2)}
.dv-star{color:#ffd86b;font-size:22px}
@keyframes dvUp{0%{opacity:0;transform:translateY(20px) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translateY(-120px) scale(1.2) rotate(12deg)}}
.dv-score{position:absolute;left:50%;top:14%;transform:translate(-50%,0) scale(.3);opacity:0;text-align:center;z-index:4;pointer-events:none}
.dv-score.show{animation:dvScore 1.1s cubic-bezier(.2,1.4,.4,1) forwards}
.dv-score b{display:block;font-size:84px;line-height:1;font-weight:900;letter-spacing:.02em;color:#fff;-webkit-text-stroke:3px #e8558f;paint-order:stroke fill;text-shadow:0 0 22px rgba(243,200,107,.95),0 6px 0 rgba(181,60,110,.55)}
.dv-score small{display:inline-block;margin-top:4px;padding:3px 14px;border-radius:99px;background:rgba(255,248,225,.95);color:#b5862c;font-weight:800;font-size:15px;box-shadow:0 0 0 2px #f3c86b}
@keyframes dvScore{0%{transform:translate(-50%,10px) scale(.3);opacity:0}60%{transform:translate(-50%,-4px) scale(1.12);opacity:1}100%{transform:translate(-50%,0) scale(1);opacity:1}}
`;

const activity: Activity = async (ctx) => {
  if (!document.getElementById('dv-css')) { const s = document.createElement('style'); s.id = 'dv-css'; s.textContent = CSS; document.head.append(s); }
  ctx.header('Je suis prête ♡', `${PARTNER} te regarde…`);
  const rc = ctx.avatar('radia', 300, 750, { expr: 'smile' });
  const ac = ctx.avatar('auguste', 300, 750, { expr: 'smile' });
  rc.className = 'dv-r';
  ac.className = 'dv-a';
  ac.style.visibility = 'hidden';
  const fx = h('div.dv-fx');
  const score = h('div.dv-score', h('b', '0 / 10'), h('small', `${PARTNER} ♡`));
  const wrap = h('div.dv-wrap', rc, ac, fx, score);
  ctx.root.append(wrap);
  const v = verdictFor(ctx.look, ctx.rng);
  const burst = (n: number, kind: 'heart' | 'star') => {
    if (reducedFx()) return;
    for (let i = 0; i < n; i++) {
      const e = h(`i.dv-${kind}`, kind === 'heart' ? '♥' : '✦');
      e.style.left = `${30 + Math.random() * 50}%`;
      e.style.top = `${40 + Math.random() * 25}%`;
      e.style.animationDelay = `${(i * 0.12).toFixed(2)}s`;
      fx.append(e);
      ctx.later(() => e.remove(), 2400);
    }
  };

  await ctx.wait(500);
  ctx.sound('whoosh');
  ac.style.visibility = 'visible';
  await ctx.wait(1000);
  // il la regarde : yeux qui s'agrandissent (petit rebond), cœur, scintillement discret
  ac.classList.add('wow');
  ctx.sound('pop3');
  burst(3, 'heart');
  burst(7, 'star');
  await ctx.wait(500);
  if (!reducedFx()) rc.classList.add('twirl');
  await ctx.say('auguste', v.lines[0], 'love');
  // la grande note, spectaculaire mais élégante
  const num = score.querySelector('b') as HTMLElement;
  score.classList.add('show');
  ctx.sound('reward');
  ctx.confetti(34);
  let n = 0;
  const tick = () => { n += 1; num.textContent = `${Math.min(n, VERDICT_NOTE)} / 10`; if (n < VERDICT_NOTE) ctx.later(tick, 55); else { ctx.pop(num); ctx.sound('combo'); burst(5, 'heart'); } };
  tick();
  await ctx.wait(1200);
  for (let i = 1; i < v.lines.length; i++) await ctx.say('auguste', v.lines[i], i === 1 ? 'laugh' : 'love');
  const done = new Promise<void>((resolve) => { const b = ctx.button('Direction le restaurant ♡', () => resolve(), 'gold'); b.style.cssText = 'position:absolute;left:0;right:0;bottom:0'; ctx.root.append(b); });
  await done;
  return { score: 100, ok: true, data: { note: VERDICT_NOTE, look: [ctx.look.dress, ctx.look.top, ctx.look.bottom, ctx.look.shoes, ctx.look.bag].filter(Boolean) as string[] } };
};
export default activity;
