/**
 * Annulation (instantanés de la pièce) et couleurs en attente appliquées d'un coup. Le placement (poser, déplacer,
 * tourner, ranger, acheter) passe par le brouillon de draft.ts.
 */
import type { PlacedItem } from '../../../../save/schema';
import type { RoomId } from '../../../../data/world/ids';
import * as CT from '../../../../game/world/castle';

export type Ctx = CT.CastleCtx;
export type Res<T = object> = CT.Res<T>;
const fail = (reason: string): CT.Fail => ({ ok: false, reason });

// ------------------------------------------------------------------ annulation (par pièce)
interface Snap { room: RoomId; wall: string; floor: string; curtain: string; items: PlacedItem[] }
const stack: Snap[] = [];
const MAX = 40;
const clone = (items: PlacedItem[]): PlacedItem[] => items.map((i) => ({ ...i }));
export function snapshot(ctx: Ctx, room: RoomId): void {
  const r = ctx.world.castle.rooms[room];
  stack.push({ room, wall: r.wall, floor: r.floor, curtain: r.curtain, items: clone(r.items) });
  if (stack.length > MAX) stack.shift();
}
export const undoDepth = (room: RoomId): number => stack.filter((s) => s.room === room).length;
export const clearUndo = (): void => { stack.length = 0; };
export function undo(ctx: Ctx, room: RoomId): Res {
  let idx = -1;
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].room === room) { idx = i; break; }
  if (idx < 0) return fail('Rien à annuler');
  const [s] = stack.splice(idx, 1);
  const r = ctx.world.castle.rooms[room];
  r.wall = s.wall; r.floor = s.floor; r.curtain = s.curtain; r.items = clone(s.items);
  return { ok: true };
}

/** Applique des couleurs en attente (murs, sol, rideaux, meuble) : tout ou rien côté validité, une seule étape d'annulation. */
export function applyColors(ctx: Ctx, room: RoomId, pend: { wall?: string; floor?: string; curtain?: string; item?: { uid: number; color: string } }): Res<{ changed: number }> {
  const r = ctx.world.castle.rooms[room];
  let n = 0;
  snapshot(ctx, room);
  const before = { wall: r.wall, floor: r.floor, curtain: r.curtain };
  const it = pend.item && ctx.world.castle.rooms[room].items.find((o) => o.uid === pend.item!.uid);
  const prevColor = it ? it.color : '';
  for (const k of ['wall', 'floor', 'curtain'] as const) {
    const v = pend[k];
    if (v === undefined || v === r[k]) continue;
    const res = CT.setRoomColor(ctx, room, k, v); // (pousse aussi un instantané dans la pile du moteur : sans effet ici)
    if (!res.ok) { Object.assign(r, before); stack.pop(); return res; }
    n++;
  }
  if (pend.item && it && pend.item.color !== it.color) {
    const res = CT.recolorItem(ctx, room, it.uid, pend.item.color);
    if (!res.ok) { Object.assign(r, before); it.color = prevColor; stack.pop(); return res; }
    n++;
  }
  if (!n) { stack.pop(); return { ok: true, changed: 0 }; }
  CT.clearUndo();
  return { ok: true, changed: n };
}
