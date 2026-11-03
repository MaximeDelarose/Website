/** Soirée chocolats : choisir, préparer (verser, remuer), garnir, assembler et décorer un coffret de 6 chocolats. */
import { h } from '../../ui/dom';
import { reducedFx } from '../../core/app';
import { makeCanvas } from '../../game/art/kit';
import type { Activity } from '../types';
import {
  BASES, BASE_NAMES, BOX_COLORS, BOX_COLOR_HEX, BOX_COLOR_NAMES, BOX_SLOTS, CHOC_TEXT, LABELS, RIBBONS, RIBBON_HEX, RIBBON_NAMES, TOPPING_IDS, TOPPING_LABEL,
  normChocMode, scoreBox, starsOfBox, type BaseId, type BoxColor, type BoxStyle, type LabelText, type Piece, type RibbonColor, type ToppingId,
} from '../games/creative/chocLogic';
import { BASE_COLOR, baseUrl, boxSlotRect, drawBoxClosed, drawBoxFrame, drawPot, pieceUrl, toppingUrl } from '../games/creative/creativeArt';
import { dots, endScreen, useStyles } from '../games/creative/creativeUi';

const CSS = `
.ck-stage{position:relative;flex:1 1 200px;min-height:170px;max-height:380px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#fff4e8,#f9d9c8);box-shadow:0 0 0 3px rgba(255,255,255,.8) inset,0 4px 14px rgba(59,49,82,.14);touch-action:none}
.ck-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.ck-bar{height:14px;border-radius:7px;background:rgba(88,67,63,.14);overflow:hidden;flex-shrink:0}
.ck-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9dbf,#f3c86b);border-radius:7px;transition:width .2s}
.ck-tray{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px 14px;align-content:center;justify-items:center}
.ck-tray.big{display:flex;justify-content:center;align-items:center;gap:12px}
.ck-tray.big .cp{width:96px;max-width:96px}
.ck-tray .cp{position:relative;width:100%;max-width:92px;aspect-ratio:1;border:0;background:rgba(255,255,255,.55);border-radius:18px;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(88,67,63,.12)}
.ck-tray .cp img{width:86%;height:86%;pointer-events:none}
.ck-tray .cp.sel{box-shadow:0 0 0 3.5px var(--rose-vif)}
.ck-slot{position:absolute;border:0;background:transparent;padding:0;border-radius:12px}
.ck-slot img{position:absolute;inset:-6%;width:112%;height:112%;pointer-events:none}
.ck-slot.hint{box-shadow:0 0 0 2.5px var(--rose-vif) inset;animation:crPulse 1s ease-in-out infinite}
.ck-sw{width:100%;height:36px;border-radius:12px;box-shadow:0 0 0 2px rgba(88,67,63,.25)}
.ck-lbl{font-size:12px;color:var(--choco-soft);font-weight:700;margin:0;flex-shrink:0}
.ck-big{position:absolute;left:0;right:0;bottom:6px;text-align:center;font-weight:700;color:var(--nuit);font-size:15px;pointer-events:none}
`;

const activity: Activity = async (ctx) => {
  const mode = normChocMode(ctx.params.mode);
  const T = CHOC_TEXT[mode];
  useStyles(ctx);
  const st = h('style'); st.textContent = CSS; ctx.root.append(st);
  ctx.header(T.title, 'Un coffret de six chocolats');
  const wrap = h('div.cr-wrap');
  const steps = ['Chocolats', 'Fonte', 'Garnitures', 'Coffret', 'Décoration'];
  const prog = dots(steps.length);
  const stage = h('div.ck-stage');
  const panel = h('div.cr-panel');
  wrap.append(prog.el, stage, panel);
  ctx.root.append(wrap);

  // boucle d'animation légère (≈24 images/s), arrêtée à la fin
  let draw: ((t: number) => void) | null = null;
  let raf = 0, last = 0, alive = true;
  const loop = (ts: number) => {
    if (!alive) return;
    if (draw && ts - last > 41) { last = ts; draw(ts / 1000); }
    raf = requestAnimationFrame(loop);
  };
  if (!reducedFx()) raf = requestAnimationFrame(loop);
  ctx.onDispose(() => { alive = false; cancelAnimationFrame(raf); });
  const redraw = () => { if (draw) draw(performance.now() / 1000); };

  const potCanvas = (): { cv: HTMLCanvasElement; g: CanvasRenderingContext2D; w: number; h: number } => {
    const w = stage.clientWidth || 340, hh = stage.clientHeight || 240;
    const cv = makeCanvas(w * 2, hh * 2);
    const g = cv.getContext('2d')!; g.scale(2, 2);
    return { cv, g, w, h: hh };
  };

  await ctx.say('auguste', T.intro, 'smile');
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------------------- 1. choix des chocolats
  prog.set(0, steps[0]);
  const chosen: BaseId[] = [];
  await new Promise<void>((done) => {
    panel.replaceChildren(h('p.cr-q', 'Choisis 2 ou 3 chocolats à fondre'));
    stage.replaceChildren();
    const shelf = h('div.ck-tray.big');
    stage.append(shelf);
    const grid = h('div.cr-grid', { style: '--cols:3' });
    const note = h('p.cr-note');
    const go = ctx.button('', () => { if (chosen.length >= 2) done(); else ctx.sound('invalid'); }, 'gold');
    const tiles = new Map<BaseId, HTMLButtonElement>();
    const refresh = () => {
      go.textContent = chosen.length >= 2 ? 'On fait fondre ! ›' : `Encore ${2 - chosen.length} ♡`;
      go.style.opacity = chosen.length >= 2 ? '1' : '0.55';
      note.textContent = chosen.length ? chosen.map((b) => BASE_NAMES[b]).join(' · ') : 'Noir, lait, blanc : mélange les saveurs.';
      for (const [b, t] of tiles) t.classList.toggle('on', chosen.includes(b));
      shelf.replaceChildren(...chosen.map((b) => { const c = h('div.cp', {}, h('img', { src: baseUrl(b, 90), alt: '' })); return c; }));
    };
    for (const b of BASES) {
      const t = h('button.cr-tile', { style: 'min-height:84px;font-size:13px' }, h('img', { src: baseUrl(b, 56), width: 56, height: 56, alt: '' }), h('span', BASE_NAMES[b].replace('Chocolat ', ''))) as HTMLButtonElement;
      t.addEventListener('click', () => {
        const i = chosen.indexOf(b);
        if (i >= 0) { chosen.splice(i, 1); ctx.sound('whoosh'); }
        else if (chosen.length >= 3) { ctx.sound('invalid'); }
        else { chosen.push(b); ctx.sound('pop2'); ctx.pop(t); }
        refresh();
        const last = shelf.lastElementChild as HTMLElement | null; if (last && i < 0) ctx.pop(last);
      });
      tiles.set(b, t); grid.append(t);
    }
    refresh();
    panel.append(grid, note, go);
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------------------- 2. fonte : verser puis remuer
  prog.set(1, steps[1]);
  const pool: Piece[] = [];
  for (const base of chosen) {
    if (!ctx.isAlive()) return { score: 0, ok: false };
    let level = 0, pour = 0, swirl = 0, turns = 0, phase: 'pour' | 'stir' | 'done' = 'pour', pourUntil = 0;
    const color = BASE_COLOR[base];
    stage.replaceChildren();
    const { cv, g, w, h: hh } = potCanvas();
    stage.append(cv);
    const msg = h('div.ck-big', 'Verse le chocolat !');
    stage.append(msg);
    draw = (t) => {
      g.clearRect(0, 0, w, hh);
      pour = performance.now() < pourUntil ? 1 : 0;
      drawPot(g, w, hh, { color, level, swirl: reducedFx() ? swirl : swirl + (phase === 'stir' ? 0 : t * 0.3), t, pour, spoon: phase !== 'pour' });
    };
    redraw();
    const bar = h('div.ck-bar', {}, h('i'));
    const fill = bar.firstElementChild as HTMLElement;
    const q = h('p.cr-q', `${BASE_NAMES[base]} : verse ! (0/4)`);
    const act = h('button.btn.ev-btn.gold', 'Verser') as HTMLButtonElement;
    let pours = 0;
    let finish!: () => void;
    const donePromise = new Promise<void>((r) => { finish = r; });
    const addTurn = (d: number) => {
      turns += Math.abs(d) / (Math.PI * 2);
      fill.style.width = `${Math.min(100, (turns / 1.5) * 100)}%`;
      if (turns >= 1.5 && phase === 'stir') {
        phase = 'done'; ctx.sound('reward'); ctx.confetti(14);
        msg.textContent = 'Mmm, bien lisse !'; ctx.pop(msg);
        ctx.later(finish, 900);
      }
    };
    // pointeur : tourner autour de la casserole
    let prevA: number | null = null;
    const ang = (e: PointerEvent): number => { const r = stage.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height * 0.56), e.clientX - (r.left + r.width / 2)); };
    const onMove = (e: PointerEvent) => {
      if (phase !== 'stir' || prevA === null) return;
      const a = ang(e);
      let d = a - prevA; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      prevA = a;
      if (Math.abs(d) > 1.2) return;
      swirl += d; addTurn(d); redraw();
      if (Math.floor(turns * 4) !== Math.floor((turns - Math.abs(d) / 6.28) * 4)) ctx.sound('pop1');
    };
    const onDown = (e: PointerEvent) => { if (phase === 'stir') { prevA = ang(e); stage.setPointerCapture?.(e.pointerId); } };
    const onUp = () => { prevA = null; };
    stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onUp);
    act.addEventListener('click', () => {
      if (phase === 'pour') {
        pours++; level = Math.min(1, pours / 4); pourUntil = performance.now() + 450;
        ctx.sound((['pop1', 'pop2', 'pop3', 'pickup'] as const)[pours % 4]); ctx.pop(act);
        q.textContent = `${BASE_NAMES[base]} : verse ! (${pours}/4)`;
        fill.style.width = `${(pours / 4) * 100}%`;
        redraw();
        if (pours >= 4) {
          phase = 'stir'; turns = 0;
          ctx.later(() => { q.textContent = 'Remue en cercle avec ton doigt !'; msg.textContent = 'Tourne autour de la casserole ↻'; fill.style.width = '0%'; act.textContent = 'Remuer ↻'; ctx.pop(msg); redraw(); }, 500);
        }
      } else if (phase === 'stir') {
        swirl += 1.1; addTurn(1.1); ctx.sound('pop1'); redraw();
      }
    });
    panel.replaceChildren(q, bar, act, h('p.cr-note', `Chocolat ${chosen.indexOf(base) + 1} sur ${chosen.length}`));
    await donePromise;
    stage.removeEventListener('pointerdown', onDown); stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp); stage.removeEventListener('pointercancel', onUp);
    for (let i = 0; i < 3; i++) pool.push({ base, topping: null });
  }
  draw = null;
  if (!ctx.isAlive()) return { score: 0, ok: false };
  ctx.sound('victory');
  await ctx.say('auguste', ['Ça sent divinement bon, ma reine.', 'Tes chocolats sont superbes, galbi.', 'Je vais tout goûter, promis.'][Math.floor(ctx.rng() * 3)], 'love');
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------------------- 3. garnitures
  prog.set(2, steps[2]);
  await new Promise<void>((done) => {
    let cur: ToppingId = TOPPING_IDS[0];
    stage.replaceChildren();
    const tray = h('div.ck-tray');
    stage.append(tray);
    const imgs: HTMLElement[] = [];
    const renderTray = () => {
      tray.replaceChildren();
      imgs.length = 0;
      pool.forEach((p, i) => {
        const b = h('button.cp', {}, h('img', { src: pieceUrl(p, 90), alt: '' })) as HTMLButtonElement;
        b.addEventListener('click', () => {
          pool[i] = { base: p.base, topping: cur };
          ctx.sound('drop'); renderTray(); ctx.pop(tray.children[i] as HTMLElement); refresh();
          sparkleAt(tray.children[i] as HTMLElement);
        });
        tray.append(b); imgs.push(b);
      });
    };
    const sparkleAt = (_el: HTMLElement) => { if (pool.filter((p) => p.topping).length === pool.length) ctx.confetti(10); };
    panel.replaceChildren(h('p.cr-q', 'Choisis une garniture, touche un chocolat'));
    const grid = h('div.cr-grid', { style: '--cols:3' });
    const tiles = new Map<ToppingId, HTMLButtonElement>();
    for (const tp of TOPPING_IDS) {
      const t = h('button.cr-tile', { style: 'min-height:62px;font-size:12px;flex-direction:row;gap:6px' }, h('img', { src: toppingUrl(tp, 34), width: 34, height: 34, alt: '' }), h('span', TOPPING_LABEL[tp])) as HTMLButtonElement;
      t.addEventListener('click', () => { cur = tp; ctx.sound('pickup'); ctx.pop(t); refresh(); });
      tiles.set(tp, t); grid.append(t);
    }
    const note = h('p.cr-note');
    const go = ctx.button('Au coffret ›', () => done(), 'gold');
    const refresh = () => {
      for (const [k, t] of tiles) t.classList.toggle('on', k === cur);
      const n = pool.filter((p) => p.topping).length;
      note.textContent = n >= pool.length ? 'Tous garnis, quelle gourmandise !' : `${n} / ${pool.length} garnis`;
    };
    renderTray(); refresh();
    panel.append(grid, note, go);
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------------------- 4. assemblage du coffret
  prog.set(3, steps[3]);
  const slots: Array<number | null> = Array.from({ length: BOX_SLOTS }, () => null); // index dans pool
  let style: BoxStyle = { color: 'rose', ribbon: 'or', label: 'Pour toi' };
  await new Promise<void>((done) => {
    stage.replaceChildren();
    panel.replaceChildren(h('div', { style: 'height:150px' }));
    const w = stage.clientWidth || 340, hh = stage.clientHeight || 230;
    const bw = Math.min(w - 20, (hh - 14) * 1.5), bh = bw / 1.5;
    const frame = makeCanvas(bw * 2, bh * 2);
    const fg = frame.getContext('2d')!; fg.scale(2, 2); drawBoxFrame(fg, bw, bh, style.color);
    const holder = h('div', { style: `position:absolute;left:${(w - bw) / 2}px;top:${(hh - bh) / 2}px;width:${bw}px;height:${bh}px` });
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    holder.append(frame);
    stage.append(holder);
    let sel: number | null = null;
    const slotEls: HTMLButtonElement[] = [];
    panel.replaceChildren(h('p.cr-q', 'Touche un chocolat, puis une alvéole'));
    const grid = h('div.cr-grid', { style: '--cols:5' });
    const note = h('p.cr-note');
    const go = ctx.button('Fermer ›', () => { if (slots.every((s) => s !== null)) done(); else ctx.sound('invalid'); }, 'gold');
    const auto = ctx.button('Remplir', () => {
      const free = pool.map((_, i) => i).filter((i) => !slots.includes(i));
      for (let s = 0; s < BOX_SLOTS; s++) if (slots[s] === null) slots[s] = free.shift() ?? null;
      ctx.sound('combo'); refresh();
    }, 'secondary');
    const tiles: HTMLButtonElement[] = [];
    const refresh = () => {
      pool.forEach((_, i) => {
        const used = slots.includes(i);
        tiles[i].style.opacity = used ? '0.3' : '1';
        tiles[i].classList.toggle('on', sel === i);
      });
      slotEls.forEach((el, s) => {
        const i = slots[s];
        el.replaceChildren(...(i !== null ? [h('img', { src: pieceUrl(pool[i], 90), alt: '' })] : []));
        el.classList.toggle('hint', i === null && sel !== null);
      });
      const n = slots.filter((s) => s !== null).length;
      note.textContent = n === BOX_SLOTS ? 'Le coffret est plein !' : `${n} / ${BOX_SLOTS} alvéoles`;
      go.style.opacity = n === BOX_SLOTS ? '1' : '0.55';
    };
    for (let s = 0; s < BOX_SLOTS; s++) {
      const r = boxSlotRect(s, bw, bh);
      const el = h('button.ck-slot', { style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` }) as HTMLButtonElement;
      el.addEventListener('click', () => {
        if (slots[s] !== null) { slots[s] = null; ctx.sound('whoosh'); refresh(); return; }
        if (sel === null) { ctx.sound('invalid'); return; }
        slots[s] = sel; sel = null; ctx.sound('drop'); refresh(); ctx.pop(el);
        const nx = pool.findIndex((_, i) => !slots.includes(i));
        if (nx >= 0) sel = nx; refresh();
        if (slots.every((x) => x !== null)) { ctx.sound('combo'); ctx.confetti(10); }
      });
      slotEls.push(el); holder.append(el);
    }
    pool.forEach((p, i) => {
      const t = h('button.cr-tile', { style: 'min-height:52px;padding:2px' }, h('img', { src: pieceUrl(p, 44), width: 44, height: 44, alt: '' })) as HTMLButtonElement;
      t.addEventListener('click', () => { if (slots.includes(i)) { ctx.sound('invalid'); return; } sel = i; ctx.sound('pickup'); ctx.pop(t); refresh(); });
      tiles.push(t); grid.append(t);
    });
    grid.style.setProperty('--cols', pool.length === 6 ? '6' : '5');
    sel = 0; refresh();
    panel.append(grid, note, h('div.cr-row', {}, auto, go));
  });
  if (!ctx.isAlive()) return { score: 0, ok: false };

  // ---------------------------------------------------------- 5. décoration de la boîte
  prog.set(4, steps[4]);
  await new Promise<void>((done) => {
    stage.replaceChildren();
    panel.replaceChildren(h('div', { style: 'height:218px' }));
    const w = stage.clientWidth || 340, hh = stage.clientHeight || 220;
    const bw = Math.min(w - 24, (hh - 10) * 1.45), bh = bw / 1.45;
    const cv = makeCanvas(bw * 2, bh * 2);
    cv.style.cssText = `position:absolute;left:${(w - bw) / 2}px;top:${(hh - bh) / 2}px;width:${bw}px;height:${bh}px`;
    stage.append(cv);
    const g = cv.getContext('2d')!;
    const paintBox = () => { g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, bw, bh); drawBoxClosed(g, bw, bh, style); };
    paintBox();
    const row = <T>(label: string, items: readonly T[], isOn: (v: T) => boolean, make: (v: T) => HTMLElement, pick: (v: T) => void): HTMLElement => {
      const r = h('div.cr-grid', { style: '--cols:4' });
      const btns = items.map((v) => {
        const b = h('button.cr-tile', { style: 'min-height:44px;padding:4px 3px' }, make(v)) as HTMLButtonElement;
        b.addEventListener('click', () => { pick(v); ctx.sound('sparkle'); ctx.pop(b); btns.forEach((x, k) => x.classList.toggle('on', isOn(items[k]))); paintBox(); });
        b.classList.toggle('on', isOn(v));
        return b;
      });
      r.append(...btns);
      return h('div', { style: 'display:flex;flex-direction:column;gap:3px' }, h('p.ck-lbl', label), r);
    };
    panel.replaceChildren(
      row<BoxColor>('Couleur', BOX_COLORS, (v) => style.color === v, (v) => h('div.ck-sw', { style: `background:${BOX_COLOR_HEX[v]}`, title: BOX_COLOR_NAMES[v] }), (v) => { style = { ...style, color: v }; }),
      row<RibbonColor>('Ruban', RIBBONS, (v) => style.ribbon === v, (v) => h('div.ck-sw', { style: `background:${RIBBON_HEX[v]}`, title: RIBBON_NAMES[v] }), (v) => { style = { ...style, ribbon: v }; }),
      row<LabelText>('Étiquette', LABELS, (v) => style.label === v, (v) => h('span', { style: 'font-size:11px;line-height:1.1' }, v), (v) => { style = { ...style, label: v }; }),
      ctx.button('Terminer ♡', () => done(), 'gold'),
    );
  });
  alive = false;
  if (!ctx.isAlive()) return { score: 0, ok: false };

  const boxPieces: Piece[] = slots.map((s) => pool[s ?? 0]);
  const sc = scoreBox(boxPieces, style, 1);
  const score = Math.max(sc.score, 0);
  const art = makeCanvas(520, 360);
  const ag = art.getContext('2d')!; ag.scale(2, 2); drawBoxClosed(ag, 260, 180, style);
  art.style.cssText = 'width:260px;height:180px';
  const lines = score >= 85 ? 'Un coffret digne d\'un chocolatier, ma reine !' : score >= 60 ? 'Il est ravissant, ils vont adorer.' : 'Fait avec amour, c\'est le plus important.';
  await endScreen(ctx, { title: 'Ton coffret est prêt', art, stars: starsOfBox(score), line: lines, sub: `Gourmandise : ${score} / 100`, btn: 'Offrir ♡' });
  return {
    score, ok: true,
    data: { box: boxPieces.map((p) => p.base), toppings: boxPieces.map((p) => p.topping), style: { ...style } },
    tags: [mode],
  };
};
export default activity;
