/**
 * Rendu de la pièce en mode décoration : décor (drawRoom), habillages de fenêtre, tapis, objets muraux, meubles triés en
 * profondeur, luminaires de plafond avec flaque de lumière, silhouette de pose (vert / rouge discret), grille locale autour
 * du meuble déplacé, particules. Tout est dessiné dans le repère « px monde » ; la caméra est appliquée une seule fois.
 */
import type { PlacedItem } from '../../../../save/schema';
import type { RoomId } from '../../../../data/world/ids';
import { colorOf } from '../../../../data/world/ids';
import { furnitureOf, type FurnitureDef } from '../../../../data/world/furniture';
import { drawRoom, roomLayout, type RoomStyle } from '../../../../game/art/world/rooms';
import { drawFurniture } from '../../../../game/art/world/furniture';
import { drawWindowDecor } from '../../../../game/art/world/windowDecor';
import { paint, sparkle, heartPath, PAL } from '../../../../game/art/kit';
import { itemBox, type Box, type ItemBox } from './boxes';
import { drawOrder, layerOf, type Target } from './placement';
import type { RoomGeo } from './geometry';
import type { Cam, Size } from './camera';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 0 | 1 | 2; col: string; s: number }
export interface Anim { uid: number; t0: number; kind: 'drop' | 'pop' | 'shake' }
export interface DragState { uid: number; target: Target; finger: { x: number; y: number }; off: { x: number; y: number } }

export interface Scene {
  room: RoomId;
  G: RoomGeo;
  items: readonly PlacedItem[];
  style: RoomStyle;
  sel: number | null;
  drag: DragState | null;
  /** Aperçu de couleur d'un meuble (uid → couleur). */
  pendColor: ReadonlyMap<number, string>;
  anims: Anim[];
  parts: Particle[];
  now: number;
  dt: number;
  reduced: boolean;
  cam: Cam;
  view: Size;
  dpr: number;
}

// ------------------------------------------------------------------ sprites
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(it: PlacedItem, def: FurnitureDef, w: number, h: number, bucket: number, color: string): HTMLCanvasElement {
  const key = `${it.id}|${it.rot ?? 0}|${it.variant ?? ''}|${color}|${Math.round(w)}x${Math.round(h)}|${bucket}`;
  let s = sprites.get(key);
  if (!s) {
    s = paint(w, h, bucket, (c) => drawFurniture(c, def.id, w, h, color, { rot: it.rot ?? 0, variant: it.variant }));
    if (sprites.size > 220) sprites.delete(sprites.keys().next().value as string);
    sprites.set(key, s);
  }
  return s;
}
export const clearSprites = (): void => sprites.clear();
/** Vignette d'un objet (boutique, réserve). */
export function thumb(def: FurnitureDef, size: number, color?: string): HTMLCanvasElement {
  const ar = def.place === 'wall' || def.place === 'ceiling' ? (def.dims ?? { w: def.w, h: def.h }) : { w: def.w, h: def.h };
  const k = size / Math.max(ar.w, ar.h);
  return paint(ar.w * k, ar.h * k, 2, (c) => drawFurniture(c, def.id, ar.w * k, ar.h * k, color ?? def.color));
}

const roundRectPath = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

// ------------------------------------------------------------------ animations
function animTransform(S: Scene, uid: number): { oy: number; sx: number; sy: number; ox: number } {
  const a = S.anims.find((x) => x.uid === uid);
  if (!a) return { oy: 0, sx: 1, sy: 1, ox: 0 };
  const u = (S.now - a.t0) / (a.kind === 'drop' ? 650 : a.kind === 'pop' ? 380 : 360);
  if (u >= 1) { S.anims.splice(S.anims.indexOf(a), 1); return { oy: 0, sx: 1, sy: 1, ox: 0 }; }
  const k = S.reduced ? 0.4 : 1;
  if (a.kind === 'drop') { const sy = 1 + 0.2 * Math.sin(u * Math.PI * 3) * (1 - u) * k; return { oy: -Math.pow(1 - u, 3) * 46 * k, sy, sx: 1 / sy, ox: 0 }; }
  if (a.kind === 'pop') { const sy = 1 + 0.16 * Math.sin(u * Math.PI * 2.4) * (1 - u) * k; return { oy: 0, sy, sx: 1 / sy, ox: 0 }; }
  return { oy: 0, sx: 1, sy: 1, ox: Math.sin(u * Math.PI * 6) * 4 * (1 - u) * k };
}

// ------------------------------------------------------------------ dessin d'un objet
interface DrawOpt { alpha?: number; lift?: number; grow?: number; dx?: number; dy?: number; shadow?: boolean }

function drawItem(c: CanvasRenderingContext2D, S: Scene, it: PlacedItem, ib: ItemBox, o: DrawOpt = {}): void {
  const def = furnitureOf(it.id);
  if (!def) return;
  if (def.place === 'window') return; // dessiné par le décor
  const bucket = Math.min(3, Math.max(1, Math.ceil(S.cam.s * S.dpr * 2) / 2));
  const b = ib.sprite;
  const color = S.pendColor.get(it.uid) ?? it.color;
  const sp = sprite(it, def, b.w, b.h, bucket, color);
  const an = animTransform(S, it.uid);
  c.save();
  c.globalAlpha = o.alpha ?? 1;
  const cx = b.x + b.w / 2 + (o.dx ?? 0) + an.ox;
  const by = b.y + b.h + (o.dy ?? 0) + an.oy - (o.lift ?? 0);
  const top = ib.layer === 'ceiling';
  c.translate(cx, top ? b.y : by);
  c.scale(an.sx * (o.grow ?? 1), an.sy * (o.grow ?? 1));
  if (it.flip) c.scale(-1, 1);
  if (o.shadow && (ib.layer === 'wall' || ib.layer === 'ceiling')) { c.shadowColor = 'rgba(81,68,109,0.32)'; c.shadowBlur = 7 * S.cam.s * S.dpr; c.shadowOffsetY = 3 * S.cam.s * S.dpr; }
  if (top) c.drawImage(sp, -b.w / 2, 0, b.w, b.h); else c.drawImage(sp, -b.w / 2, -b.h, b.w, b.h);
  c.restore();
}

/** Ombre portée douce d'un meuble soulevé (sur le sol, sous l'empreinte). */
function liftShadow(c: CanvasRenderingContext2D, ib: ItemBox, strength = 1): void {
  const f = ib.foot;
  c.save();
  c.globalAlpha = 0.3 * strength;
  const rx = f.w * 0.5; const ry = Math.max(6, f.h * 0.2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(81,68,109,0.7)'); g.addColorStop(1, 'rgba(81,68,109,0)');
  c.translate(f.x + f.w / 2, f.y + f.h - ry * 0.4); c.scale(1, ry / rx);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ silhouette de pose
function footprintGhost(c: CanvasRenderingContext2D, S: Scene, ib: ItemBox, ok: boolean): void {
  const f = ib.foot;
  c.save();
  c.fillStyle = ok ? 'rgba(88,196,128,0.30)' : 'rgba(232,84,96,0.20)';
  c.strokeStyle = ok ? 'rgba(52,160,96,0.9)' : 'rgba(214,64,78,0.75)';
  c.lineWidth = ok ? 2 : 1.6;
  if (ib.layer === 'ceiling') {
    // le luminaire se suspend au plafond : on marque la colonne et la flaque de lumière
    c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(ib.sprite.x, 1); c.lineTo(ib.sprite.x + ib.sprite.w, 1); c.stroke();
    c.beginPath(); c.moveTo(f.x + f.w / 2, ib.sprite.h); c.lineTo(f.x + f.w / 2, f.y); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.ellipse(f.x + f.w / 2, f.y + f.h * 0.5, f.w * 0.6, f.w * 0.17, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  } else {
    const pad = ib.layer === 'floor' || ib.layer === 'rug' ? 1 : 0;
    roundRectPath(c, f.x + pad, f.y + pad, f.w - pad * 2, f.h - pad * 2, ib.layer === 'wall' ? 6 : 8);
    c.fill(); c.stroke();
  }
  c.restore();
  void S;
}

/** Grille discrète autour du point (cases) — seulement quand on déplace un meuble. */
function localGrid(c: CanvasRenderingContext2D, S: Scene, center: { x: number; y: number }, plane: 'floor' | 'wall'): void {
  const G = S.G; const cell = G.cell; const R = 3.2;
  c.save();
  c.lineWidth = 1;
  c.setLineDash([]);
  const x0 = Math.max(0, Math.floor(center.x - R)); const x1 = Math.min(G.cols, Math.ceil(center.x + R));
  const rows = plane === 'floor' ? G.rows : Math.floor(G.wallRows);
  const y0 = Math.max(0, Math.floor(center.y - R)); const y1 = Math.min(rows, Math.ceil(center.y + R));
  const px = (cx: number, cy: number) => (plane === 'floor' ? { x: G.grid.x + cx * cell, y: G.grid.y + cy * cell } : { x: G.grid.x + cx * cell, y: cy * cell });
  for (let i = x0; i <= x1; i++) for (let j = y0; j < y1; j++) {
    const a = Math.max(0, 1 - Math.hypot(i - center.x, j + 0.5 - center.y) / R);
    if (a <= 0.02) continue;
    c.strokeStyle = `rgba(255,255,255,${(0.55 * a).toFixed(3)})`;
    const p = px(i, j); const q = px(i, j + 1);
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
  }
  for (let j = y0; j <= y1; j++) for (let i = x0; i < x1; i++) {
    const a = Math.max(0, 1 - Math.hypot(i + 0.5 - center.x, j - center.y) / R);
    if (a <= 0.02) continue;
    c.strokeStyle = `rgba(255,255,255,${(0.55 * a).toFixed(3)})`;
    const p = px(i, j); const q = px(i + 1, j);
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ scène
export function drawScene(ctx: CanvasRenderingContext2D, S: Scene): void {
  const { G, cam, view, dpr } = S;
  // fond autour de la pièce (diorama)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = ctx.createRadialGradient(view.w / 2, view.h * 0.3, 10, view.w / 2, view.h * 0.5, Math.max(view.w, view.h));
  bg.addColorStop(0, '#E9D9F6'); bg.addColorStop(1, '#B9A5E8');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, view.w, view.h);

  ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * cam.y);
  // ombre de la pièce
  ctx.save();
  ctx.shadowColor = 'rgba(81,68,109,0.35)'; ctx.shadowBlur = 18 * cam.s * dpr; ctx.shadowOffsetY = 5 * cam.s * dpr;
  ctx.fillStyle = '#fff'; roundRectPath(ctx, 0, 0, G.W, G.H, 14); ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, 0, 0, G.W, G.H, 14); ctx.clip();

  drawRoom(ctx, S.room, G.W, G.H, S.style, S.reduced ? 0 : S.now / 1000);

  // aperçu : éléments avec le glisser appliqué (le meuble déplacé et ce qu'il porte suivent la cible)
  const dragUid = S.drag?.uid ?? null;
  const items: PlacedItem[] = S.items.map((i) => ({ ...i }));
  let dragDelta = { x: 0, y: 0 };
  if (S.drag) {
    const it = items.find((i) => i.uid === S.drag!.uid);
    if (it) {
      const t = S.drag.target.cand;
      dragDelta = { x: t.x - it.x, y: t.y - it.y };
      it.x = t.x; it.y = t.y; it.rot = t.rot || undefined; it.on = t.on;
      for (const k of items) if (k.on === it.uid) { k.x += dragDelta.x; k.y += dragDelta.y; }
    }
  }
  const boxes = new Map<number, ItemBox>();
  for (const it of items) { const b = itemBox(G, it, items); if (b) boxes.set(it.uid, b); }
  const ordered = drawOrder(items);

  // habillages de fenêtre (voilage, store, cantonnière)
  const L = roomLayout(S.room, G.W, G.H);
  if (G.hasWall) for (const it of ordered) { const d = furnitureOf(it.id); if (d?.place === 'window') drawWindowDecor(ctx, it.id, L, it.color && it.color.startsWith('#') ? it.color : colorOf(S.pendColor.get(it.uid) ?? it.color), S.reduced ? 0 : S.now / 1000); }

  const ghostOf = (it: PlacedItem) => dragUid !== null && (it.uid === dragUid || it.on === dragUid);
  const drawList = (layers: string[]) => {
    for (const it of ordered) {
      const ib = boxes.get(it.uid); if (!ib || !layers.includes(ib.layer)) continue;
      const sel = S.sel === it.uid && !S.drag;
      const ghost = ghostOf(it);
      if (ib.layer === 'floor' || ib.layer === 'rug') {
        if (sel && !S.reduced) liftShadow(ctx, ib, 0.9);
      }
      drawItem(ctx, S, it, ib, { alpha: ghost ? 0.55 : 1, lift: sel ? 5 : 0, grow: sel ? 1.02 : 1, shadow: ib.layer === 'wall' || ib.layer === 'ceiling' });
    }
  };

  // 1. tapis
  drawList(['rug']);
  // 2. flaques de lumière des luminaires de plafond
  for (const it of ordered) {
    const ib = boxes.get(it.uid); const d = furnitureOf(it.id);
    if (!ib || ib.layer !== 'ceiling' || !d) continue;
    const f = ib.foot; const strong = d.id === 'garland' ? 0.12 : 0.2;
    const rx = f.w * (d.id === 'garland' ? 0.55 : 0.8); const ry = rx * 0.3;
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + f.h * 0.55); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,226,140,${strong * (ghostOf(it) ? 0.6 : 1)})`); g.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 3. grille locale + silhouette de pose (sous les meubles pour le sol, devant pour le mur)
  const dragBox = S.drag ? boxes.get(S.drag.uid) : undefined;
  const dragLayer = dragBox?.layer;
  if (S.drag && dragBox) {
    const t = S.drag.target;
    const def = furnitureOf(t.cand.id)!;
    if (dragLayer === 'floor' || dragLayer === 'rug') {
      const f = dragBox.foot; const cell = G.cell;
      localGrid(ctx, S, { x: (f.x + f.w / 2 - G.grid.x) / cell, y: (f.y + f.h / 2 - G.grid.y) / cell }, 'floor');
      footprintGhost(ctx, S, dragBox, t.check.ok);
    } else if (dragLayer === 'wall') {
      localGrid(ctx, S, { x: (dragBox.foot.x + dragBox.foot.w / 2 - G.grid.x) / G.cell, y: (dragBox.foot.y + dragBox.foot.h / 2) / G.cell }, 'wall');
    } else if (dragLayer === 'surface' && t.host) {
      const hb = boxes.get(t.host.uid);
      if (hb) {
        const hd = furnitureOf(t.host.id)!; const lift = (hd.host?.lift ?? 0.5) * G.cell;
        ctx.save(); ctx.strokeStyle = t.check.ok ? 'rgba(52,160,96,0.9)' : 'rgba(214,64,78,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        roundRectPath(ctx, hb.foot.x, hb.foot.y - lift, hb.foot.w, hb.foot.h, 8); ctx.stroke(); ctx.restore();
      }
      footprintGhost(ctx, S, dragBox, t.check.ok);
    } else if (dragLayer === 'window' && G.block) {
      footprintGhost(ctx, S, dragBox, t.check.ok);
    }
    void def;
  }
  // 4. mur, meubles du fond vers l'avant, 5. plafond
  drawList(['window', 'wall']);
  if (S.drag && dragLayer === 'wall' && dragBox) footprintGhost(ctx, S, dragBox, S.drag.target.check.ok);
  drawList(['floor', 'surface']);
  drawList(['ceiling']);
  if (S.drag && dragLayer === 'ceiling' && dragBox) footprintGhost(ctx, S, dragBox, S.drag.target.check.ok);

  // sélection (sans glisser) : contour pointillé
  const selIt = S.sel !== null && !S.drag ? items.find((i) => i.uid === S.sel) : undefined;
  const sb = selIt ? boxes.get(selIt.uid) : undefined;
  if (selIt && sb) {
    const r: Box = sb.layer === 'floor' || sb.layer === 'rug' ? sb.foot : sb.sprite;
    ctx.save();
    ctx.strokeStyle = PAL.roseVif; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = S.reduced ? 0 : -S.now / 60;
    roundRectPath(ctx, r.x - 2, r.y - 2 - (sb.layer === 'floor' ? 5 : 0), r.w + 4, r.h + 4, 8); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = PAL.roseVif;
    for (const [px, py] of [[r.x - 2, r.y - 2], [r.x + r.w + 2, r.y - 2], [r.x - 2, r.y + r.h + 2], [r.x + r.w + 2, r.y + r.h + 2]]) { ctx.beginPath(); ctx.arc(px, py - (sb.layer === 'floor' ? 5 : 0), 3.4, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // meuble suivant le doigt : soulevé, ombre portée
  if (S.drag) {
    const orig = S.items.find((i) => i.uid === S.drag!.uid);
    const ib = dragBox;
    if (orig && ib) {
      const cxT = ib.sprite.x + ib.sprite.w / 2; const cyT = ib.sprite.y + ib.sprite.h / 2;
      const dx = S.drag.finger.x - S.drag.off.x - cxT; const dy = S.drag.finger.y - S.drag.off.y - cyT - 14 / cam.s;
      const moved = { ...ib, sprite: { ...ib.sprite, x: ib.sprite.x + dx, y: ib.sprite.y + dy }, foot: ib.foot };
      const live = items.find((i) => i.uid === orig.uid)!;
      ctx.save();
      ctx.shadowColor = 'rgba(81,68,109,0.35)'; ctx.shadowBlur = 12 * cam.s * dpr; ctx.shadowOffsetY = 8 * cam.s * dpr;
      drawItem(ctx, S, live, moved, { alpha: 0.96, grow: 1.04 });
      ctx.restore();
    }
  }

  // particules
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life += S.dt; if (p.life >= p.max) { S.parts.splice(i, 1); continue; }
    p.x += p.vx * S.dt; p.y += p.vy * S.dt; p.vy += 220 * S.dt;
    const a = 1 - p.life / p.max;
    if (p.kind === 0) sparkle(ctx, p.x, p.y, p.s, p.col, a);
    else if (p.kind === 1) { ctx.save(); ctx.globalAlpha = a; heartPath(ctx, p.x, p.y, p.s * 2.2); ctx.fillStyle = p.col; ctx.fill(); ctx.restore(); }
    else { ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.5, 0, 7); ctx.fillStyle = p.col; ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
  void layerOf;
}
