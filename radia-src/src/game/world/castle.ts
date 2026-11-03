/**
 * Logique pure du château (sans DOM) : achat, placement, déplacement,
 * rangement, couleurs, annulation, déblocage, soirée de réception.
 *
 * Invariants garantis :
 *  - pour chaque meuble, (placés dans toutes les pièces) ≤ possédés : jamais de
 *    duplication ; ranger un meuble ne le détruit pas (il revient « en réserve ») ;
 *  - un meuble placé est entièrement dans la grille, sans en recouvrir un autre,
 *    dans une pièce débloquée où il est autorisé ;
 *  - les uid sont uniques (compteur `castle.nextUid`).
 */
import type { World, PlacedItem } from '../../save/schema';
import { ROOM_IDS, FURNITURE_IDS, MAGAZINE_IDS, type RoomId } from '../../data/world/ids';
import { FURNITURE, furnitureOf, type FurnitureDef } from '../../data/world/furniture';
import { ROOMS, optionsFor, type ColorTarget } from '../../data/world/rooms';

/** Contexte : l'état du monde + la bourse de diamants (injectée, donc testable). */
export interface CastleCtx {
  world: World;
  diamonds: { get(): number; spend(n: number): boolean };
}

export type Ok<T = object> = { ok: true } & T;
export type Fail = { ok: false; reason: string };
export type Res<T = object> = Ok<T> | Fail;
const fail = (reason: string): Fail => ({ ok: false, reason });

type Castle = World['castle'];

// ------------------------------------------------------------------ lecture
export const isUnlocked = (w: World, room: RoomId): boolean => w.castle.unlocked.includes(room);
export const roomItems = (w: World, room: RoomId): PlacedItem[] => w.castle.rooms[room].items;
export const itemById = (w: World, room: RoomId, uid: number): PlacedItem | undefined => w.castle.rooms[room].items.find((i) => i.uid === uid);

export function placedCount(w: World, id: string): number {
  let n = 0;
  for (const r of ROOM_IDS) for (const i of w.castle.rooms[r].items) if (i.id === id) n++;
  return n;
}
export const ownedCount = (w: World, id: string): number => Math.max(0, Math.floor(w.castle.owned[id] ?? 0));
/** Exemplaires possédés mais non placés (la « réserve »). */
export const stockCount = (w: World, id: string): number => Math.max(0, ownedCount(w, id) - placedCount(w, id));
export const totalPlaced = (w: World): number => ROOM_IDS.reduce((n, r) => n + w.castle.rooms[r].items.length, 0);

export function footprint(it: Pick<PlacedItem, 'id'>): { w: number; h: number } {
  const f = furnitureOf(it.id);
  return f ? { w: f.w, h: f.h } : { w: 1, h: 1 };
}

const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

/** Vérifie qu'un meuble peut occuper (x, y) dans une pièce (`ignoreUid` : le meuble qu'on déplace). */
export function checkPlacement(w: World, room: RoomId, id: string, x: number, y: number, ignoreUid?: number): Res {
  const f = furnitureOf(id);
  if (!f) return fail('Meuble inconnu');
  if (!isUnlocked(w, room)) return fail('Pièce verrouillée');
  if (!f.rooms.includes(room)) return fail('Ce meuble ne va pas dans cette pièce');
  if (!Number.isInteger(x) || !Number.isInteger(y)) return fail('Position invalide');
  const g = ROOMS[room];
  if (x < 0 || y < 0 || x + f.w > g.cols || y + f.h > g.rows) return fail('Hors de la pièce');
  for (const o of w.castle.rooms[room].items) {
    if (o.uid === ignoreUid) continue;
    const fo = footprint(o);
    if (overlap(x, y, f.w, f.h, o.x, o.y, fo.w, fo.h)) return fail('La place est déjà prise');
  }
  return { ok: true };
}

/** Premier emplacement libre (balayage, en partant du centre), ou null. */
export function findFreeSpot(w: World, room: RoomId, id: string, ignoreUid?: number): { x: number; y: number } | null {
  const f = furnitureOf(id);
  if (!f) return null;
  const g = ROOMS[room];
  const cands: { x: number; y: number; d: number }[] = [];
  for (let y = 0; y + f.h <= g.rows; y++) for (let x = 0; x + f.w <= g.cols; x++) {
    cands.push({ x, y, d: Math.abs(x + f.w / 2 - g.cols / 2) + Math.abs(y + f.h / 2 - g.rows / 2) * 1.4 });
  }
  cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  for (const c of cands) if (checkPlacement(w, room, id, c.x, c.y, ignoreUid).ok) return { x: c.x, y: c.y };
  return null;
}

// ------------------------------------------------------------------ annulation
interface Snap { room: RoomId; wall: string; floor: string; curtain: string; items: PlacedItem[] }
const undoStack: Snap[] = [];
const UNDO_MAX = 40;
const cloneItems = (items: PlacedItem[]): PlacedItem[] => items.map((i) => ({ ...i }));

function snapshot(w: World, room: RoomId): void {
  const r = w.castle.rooms[room];
  undoStack.push({ room, wall: r.wall, floor: r.floor, curtain: r.curtain, items: cloneItems(r.items) });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}
export const undoDepth = (room?: RoomId): number => (room ? undoStack.filter((s) => s.room === room).length : undoStack.length);
export const clearUndo = (): void => { undoStack.length = 0; };

/** Annule la dernière modification de la pièce (ou de la session si `room` est omis). */
export function undo(ctx: CastleCtx, room?: RoomId): Res<{ room: RoomId }> {
  let idx = -1;
  for (let i = undoStack.length - 1; i >= 0; i--) if (!room || undoStack[i].room === room) { idx = i; break; }
  if (idx < 0) return fail('Rien à annuler');
  const [s] = undoStack.splice(idx, 1);
  const w = ctx.world;
  const r = w.castle.rooms[s.room];
  const before = { wall: r.wall, floor: r.floor, curtain: r.curtain, items: r.items };
  r.wall = s.wall; r.floor = s.floor; r.curtain = s.curtain; r.items = cloneItems(s.items);
  // garde-fou : jamais plus de meubles placés que possédés, ni de collision
  if (!consistent(w, s.room)) {
    r.wall = before.wall; r.floor = before.floor; r.curtain = before.curtain; r.items = before.items;
    return fail('Impossible d\'annuler : un meuble est utilisé ailleurs');
  }
  return { ok: true, room: s.room };
}

function consistent(w: World, room: RoomId): boolean {
  for (const id of FURNITURE_IDS) if (placedCount(w, id) > ownedCount(w, id)) return false;
  const items = w.castle.rooms[room].items;
  const uids = new Set<number>();
  for (let a = 0; a < items.length; a++) {
    if (uids.has(items[a].uid)) return false;
    uids.add(items[a].uid);
    if (!checkPlacement({ ...w, castle: { ...w.castle, rooms: { ...w.castle.rooms, [room]: { ...w.castle.rooms[room], items: items.filter((_, b) => b !== a) } } } }, room, items[a].id, items[a].x, items[a].y).ok) return false;
  }
  return true;
}

// ------------------------------------------------------------------ achat
export type PayWith = 'coins' | 'gems';

export function canBuy(ctx: CastleCtx, id: string, pay: PayWith = 'coins'): Res {
  const f = furnitureOf(id);
  if (!f) return fail('Meuble inconnu');
  if (pay === 'gems') {
    if (!f.gems) return fail('Pas de prix en diamants');
    if (ctx.diamonds.get() < f.gems) return fail('Pas assez de diamants');
  } else if (ctx.world.res.coins < f.price) return fail('Pas assez de pièces');
  return { ok: true };
}

/** Achète un exemplaire (il arrive en réserve) : débite pièces ou diamants, `owned[id]++`. */
export function buyFurniture(ctx: CastleCtx, id: string, pay: PayWith = 'coins'): Res<{ def: FurnitureDef }> {
  const c = canBuy(ctx, id, pay);
  if (!c.ok) return c;
  const f = furnitureOf(id)!;
  if (pay === 'gems') {
    if (!ctx.diamonds.spend(f.gems!)) return fail('Pas assez de diamants');
  } else ctx.world.res.coins -= f.price;
  ctx.world.castle.owned[id] = ownedCount(ctx.world, id) + 1;
  return { ok: true, def: f };
}

// ------------------------------------------------------------------ placement
/** Pose un meuble de la réserve. */
export function placeFurniture(ctx: CastleCtx, room: RoomId, id: string, x: number, y: number, color?: string): Res<{ uid: number }> {
  const w = ctx.world;
  const f = furnitureOf(id);
  if (!f) return fail('Meuble inconnu');
  if (stockCount(w, id) < 1) return fail('Plus aucun exemplaire en réserve');
  const c = checkPlacement(w, room, id, x, y);
  if (!c.ok) return c;
  snapshot(w, room);
  const uid = w.castle.nextUid++;
  w.castle.rooms[room].items.push({ uid, id, x, y, color: color ?? f.color, flip: false });
  return { ok: true, uid };
}

export function moveItem(ctx: CastleCtx, room: RoomId, uid: number, x: number, y: number): Res {
  const it = itemById(ctx.world, room, uid);
  if (!it) return fail('Meuble introuvable');
  const c = checkPlacement(ctx.world, room, it.id, x, y, uid);
  if (!c.ok) return c;
  if (it.x === x && it.y === y) return { ok: true };
  snapshot(ctx.world, room);
  it.x = x; it.y = y;
  return { ok: true };
}

export function flipItem(ctx: CastleCtx, room: RoomId, uid: number): Res<{ flip: boolean }> {
  const it = itemById(ctx.world, room, uid);
  if (!it) return fail('Meuble introuvable');
  snapshot(ctx.world, room);
  it.flip = !it.flip;
  return { ok: true, flip: it.flip };
}

/** Range un meuble : il redevient disponible en réserve (jamais perdu). */
export function storeItem(ctx: CastleCtx, room: RoomId, uid: number): Res<{ id: string }> {
  const r = ctx.world.castle.rooms[room];
  const i = r.items.findIndex((x) => x.uid === uid);
  if (i < 0) return fail('Meuble introuvable');
  snapshot(ctx.world, room);
  const [it] = r.items.splice(i, 1);
  return { ok: true, id: it.id };
}

/** Remplace un meuble placé par un autre, pris en réserve (l'ancien y retourne). */
export function replaceFurniture(ctx: CastleCtx, room: RoomId, uid: number, newId: string): Res<{ uid: number }> {
  const w = ctx.world;
  const old = itemById(w, room, uid);
  if (!old) return fail('Meuble introuvable');
  if (!furnitureOf(newId)) return fail('Meuble inconnu');
  if (newId === old.id) return fail('C\'est déjà ce meuble');
  if (stockCount(w, newId) < 1) return fail('Pas en réserve : achète-le d\'abord');
  // emplacement : le même coin, sinon le premier endroit libre en ignorant l'ancien
  let pos: { x: number; y: number } | null = null;
  if (checkPlacement(w, room, newId, old.x, old.y, uid).ok) pos = { x: old.x, y: old.y };
  else pos = findFreeSpotIgnoring(w, room, newId, uid);
  if (!pos) return fail('Pas assez de place pour ce meuble ici');
  snapshot(w, room);
  const r = w.castle.rooms[room];
  r.items = r.items.filter((i) => i.uid !== uid);
  const nu = w.castle.nextUid++;
  r.items.push({ uid: nu, id: newId, x: pos.x, y: pos.y, color: FURNITURE[newId as keyof typeof FURNITURE].color, flip: old.flip === true });
  return { ok: true, uid: nu };
}
const findFreeSpotIgnoring = (w: World, room: RoomId, id: string, ignore: number) => findFreeSpot(w, room, id, ignore);

// ------------------------------------------------------------------ couleurs
export const isMagVariant = (c: string): boolean => c.startsWith('mag:');

export function recolorItem(ctx: CastleCtx, room: RoomId, uid: number, color: string): Res {
  const w = ctx.world;
  const it = itemById(w, room, uid);
  if (!it) return fail('Meuble introuvable');
  const f = furnitureOf(it.id);
  if (!f || !f.colorable) return fail('Ce meuble garde sa couleur');
  const ok = optionsFor('curtain').includes(color as never)
    || (it.id === 'painting' && isMagVariant(color) && (MAGAZINE_IDS as readonly string[]).includes(color.slice(4)) && w.magazines.includes(color.slice(4)));
  if (!ok) return fail('Couleur indisponible');
  if (it.color === color) return { ok: true };
  snapshot(w, room);
  it.color = color;
  return { ok: true };
}

export function setRoomColor(ctx: CastleCtx, room: RoomId, target: ColorTarget, color: string): Res {
  const w = ctx.world;
  if (!isUnlocked(w, room)) return fail('Pièce verrouillée');
  if (!optionsFor(target).includes(color as never)) return fail('Couleur indisponible');
  const r = w.castle.rooms[room];
  if (r[target] === color) return { ok: true };
  snapshot(w, room);
  r[target] = color;
  return { ok: true };
}

// ------------------------------------------------------------------ pièces
export function unlockRoom(ctx: CastleCtx, room: RoomId): Res {
  const w = ctx.world;
  if (isUnlocked(w, room)) return fail('Déjà débloquée');
  const cost = ROOMS[room].cost;
  if (w.res.coins < cost) return fail('Pas assez de pièces');
  w.res.coins -= cost;
  w.castle.unlocked.push(room);
  return { ok: true };
}

export const unlockedCount = (w: World): number => ROOM_IDS.filter((r) => isUnlocked(w, r)).length;

// ------------------------------------------------------------------ soirée de réception
export const EVENT_COST = { coins: 120, flowers: 3 } as const;
export const EVENT_COOLDOWN_MS = 10 * 60 * 1000;
export const EVENT_MIN_FURNITURE = 3;
export const EVENT_KEY = 'castle.eventAt';

export interface EventState { ready: boolean; reason: string; remainingMs: number; furniture: number; affordable: boolean }

export function eventState(w: World, now: number): EventState {
  const furniture = w.castle.rooms.reception.items.length;
  const last = w.extra[EVENT_KEY] ?? 0;
  const remainingMs = Math.max(0, last + EVENT_COOLDOWN_MS - now);
  const affordable = w.res.coins >= EVENT_COST.coins && w.res.flowers >= EVENT_COST.flowers;
  let reason = '';
  if (!isUnlocked(w, 'reception')) reason = 'Débloque d\'abord la salle de réception';
  else if (furniture < EVENT_MIN_FURNITURE) reason = `Il faut au moins ${EVENT_MIN_FURNITURE} meubles dans la salle`;
  else if (remainingMs > 0) reason = 'La salle se prépare pour la prochaine soirée';
  else if (!affordable) reason = 'Il manque des pièces ou des fleurs';
  return { ready: reason === '', reason, remainingMs, furniture, affordable };
}

export interface EventReward { fans: number; hearts: number; coins: number }

/** Récompense (déterministe sauf `rand`) : plus la salle est garnie et variée, plus il y a de fans. */
export function eventReward(w: World, rand: () => number = Math.random): EventReward {
  const items = w.castle.rooms.reception.items;
  const cats = new Set(items.map((i) => furnitureOf(i.id)?.cat));
  const fans = Math.round((12 + Math.min(items.length, 20) * 6 + cats.size * 4) * (0.9 + rand() * 0.3));
  return { fans, hearts: 2 + Math.min(4, Math.floor(items.length / 4)), coins: 50 + Math.min(items.length, 12) * 5 };
}

/** Lance la soirée : débite le coût, démarre le temps de recharge, renvoie la récompense à appliquer. */
export function runEvent(ctx: CastleCtx, now: number, rand: () => number = Math.random): Res<{ reward: EventReward }> {
  const w = ctx.world;
  const s = eventState(w, now);
  if (!s.ready) return fail(s.reason);
  w.res.coins -= EVENT_COST.coins;
  w.res.flowers -= EVENT_COST.flowers;
  w.extra[EVENT_KEY] = now;
  return { ok: true, reward: eventReward(w, rand) };
}

// ------------------------------------------------------------------ scène finale
/** Vrai quand chacune des 3 chambres d'enfants contient au moins 3 meubles. */
export const kidRoomsFurnished = (w: World): boolean =>
  (['kid1', 'kid2', 'kid3'] as const).every((k) => w.castle.rooms[k].items.length >= 3);

// ------------------------------------------------------------------ cohérence
/**
 * Répare une sauvegarde incohérente (modifiée à la main, ancienne version…) :
 * meubles inconnus / hors grille / en collision / dans une pièce verrouillée
 * ou interdite → rangés en réserve (jamais détruits) ; `owned` ≥ nombre placé.
 */
export function normalizeCastle(w: World): number {
  let moved = 0;
  const c: Castle = w.castle;
  // tout meuble présent dans une pièce est forcément possédé (même s'il est rangé ensuite)
  for (const id of FURNITURE_IDS) { const n = Math.max(ownedCount(w, id), placedCount(w, id)); if (n > 0) c.owned[id] = n; }
  const seen = new Set<number>();
  for (const room of ROOM_IDS) {
    const kept: PlacedItem[] = [];
    for (const it of c.rooms[room].items) {
      const f = furnitureOf(it.id);
      let okItem = !!f && !seen.has(it.uid) && it.uid > 0;
      if (okItem) {
        const tmp = { ...w, castle: { ...c, rooms: { ...c.rooms, [room]: { ...c.rooms[room], items: kept } } } };
        okItem = checkPlacement(tmp, room, it.id, it.x, it.y).ok;
      }
      if (okItem) { kept.push(it); seen.add(it.uid); } else moved++;
    }
    c.rooms[room].items = kept;
  }
  for (const k of Object.keys(c.owned)) if (!furnitureOf(k)) delete c.owned[k];
  const maxUid = Math.max(0, ...[...seen]);
  if (c.nextUid <= maxUid) c.nextUid = maxUid + 1;
  return moved;
}
