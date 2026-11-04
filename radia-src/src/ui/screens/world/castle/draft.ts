/**
 * Brouillon de décoration d'une pièce (sans DOM) : toutes les modifications (poser, déplacer, tourner, ranger,
 * acheter) se font sur une copie ; rien n'est définitif avant `commit`. Annuler = recharger depuis le monde (aucun effet).
 *
 * Achat unique : un meuble déjà possédé (réserve) n'est jamais repayé ; `commit` n'achète que ce qui manque
 * (placés au total − possédés), après avoir tout validé, de façon atomique (rien ne change en cas d'échec).
 */
import type { PlacedItem } from '../../../../save/schema';
import { ROOM_IDS, type RoomId } from '../../../../data/world/ids';
import { furnitureOf } from '../../../../data/world/furniture';
import * as CT from '../../../../game/world/castle';
import { canRotate, clean, defaultSpot, nearestValid, normRot, reseat, rotated, validate, type Candidate } from './placement';
import { snapshot, type Ctx } from './ops';

export type Res<T = object> = CT.Res<T>;
const fail = (reason: string): CT.Fail => ({ ok: false, reason });

export interface CommitInfo {
  /** uid réels des meubles nouvellement posés (depuis la réserve ou achetés). */
  placed: number[];
  /** uid réels des meubles déplacés ou modifiés. */
  moved: number[];
  /** ids achetés (un par exemplaire). */
  bought: string[];
  coins: number;
  gems: number;
}

const sig = (it: PlacedItem): string => `${it.id}|${it.x}|${it.y}|${it.rot ?? 0}|${it.on ?? ''}|${it.color}|${it.variant ?? ''}|${it.flip ? 1 : 0}`;

export class Draft {
  items: PlacedItem[] = [];
  private tmp = -1;
  constructor(public readonly ctx: Ctx, public readonly room: RoomId) { this.reset(); }

  /** Recharge depuis le monde : annule toutes les modifications non validées. */
  reset(): void {
    this.items = this.ctx.world.castle.rooms[this.room].items.map((i) => ({ ...i }));
    this.tmp = -1;
  }

  // ---------------------------------------------------------------- lecture
  get(uid: number): PlacedItem | undefined { return this.items.find((o) => o.uid === uid); }
  kids(uid: number): PlacedItem[] { return this.items.filter((o) => o.on === uid); }
  /** Exemplaires de ce meuble posés dans les AUTRES pièces. */
  private elsewhere(id: string): number {
    return ROOM_IDS.reduce((n, r) => (r === this.room ? n : n + this.ctx.world.castle.rooms[r].items.filter((i) => i.id === id).length), 0);
  }
  owned(id: string): number { return CT.ownedCount(this.ctx.world, id); }
  inDraft(id: string): number { return this.items.filter((i) => i.id === id).length; }
  /** Exemplaires libres en réserve compte tenu du brouillon (négatif : il faudrait en acheter). */
  free(id: string): number { return this.owned(id) - this.elsewhere(id) - this.inDraft(id); }
  /** Réserve réelle (hors brouillon) : possédés − posés partout (état enregistré). */
  stock(id: string): number { return CT.stockCount(this.ctx.world, id); }
  /** Exemplaires à acheter pour que le brouillon tienne. */
  toBuy(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const id of new Set(this.items.map((i) => i.id))) { const n = -this.free(id); if (n > 0) out[id] = n; }
    return out;
  }
  cost(): { coins: number; gems: number } {
    let coins = 0; let gems = 0;
    for (const [id, n] of Object.entries(this.toBuy())) { const f = furnitureOf(id); if (f) { coins += f.price * n; gems += (f.gems ?? 0) * n; } }
    return { coins, gems };
  }
  /** Y a-t-il quelque chose à enregistrer ? */
  dirty(): boolean {
    const w = this.ctx.world.castle.rooms[this.room].items;
    if (w.length !== this.items.length) return true;
    const a = w.map(sig).sort(); const b = this.items.map(sig).sort();
    return a.some((s, i) => s !== b[i]) || w.some((o) => !this.get(o.uid));
  }
  isNew(uid: number): boolean { return uid < 0; }

  // ---------------------------------------------------------------- modifications
  /** Ajoute un meuble (réserve ou à acheter) à une position donnée, ou à la première place libre. */
  add(id: string, cand?: Candidate): Res<{ uid: number; needsBuy: boolean }> {
    const def = furnitureOf(id);
    if (!def) return fail('Meuble inconnu');
    if (!def.rooms.includes(this.room)) return fail('Ce meuble ne va pas dans cette pièce');
    if (!CT.isUnlocked(this.ctx.world, this.room)) return fail('Pièce verrouillée');
    const c = cand ?? defaultSpot(this.room, this.items, id);
    if (!c) return fail(def.place === 'surface' ? 'Pose d\'abord un meuble pour le porter' : 'Plus de place ici');
    const v = validate(this.room, this.items, { ...c, id });
    if (!v.ok) return fail(v.reason);
    const uid = this.tmp--;
    const it: PlacedItem = { uid, id, x: clean(c.x), y: clean(c.y), color: def.color, flip: false };
    const rot = normRot(def, c.rot);
    if (rot) it.rot = rot;
    if (def.variants.length) it.variant = def.variants[0].id;
    if (c.on !== undefined) it.on = c.on;
    this.items.push(it);
    return { ok: true, uid, needsBuy: this.free(id) < 0 };
  }

  move(uid: number, cand: Candidate): Res {
    const it = this.get(uid);
    if (!it) return fail('Meuble introuvable');
    const kids = this.kids(uid);
    const v = validate(this.room, this.items, { ...cand, id: it.id }, [uid, ...kids.map((k) => k.uid)]);
    if (!v.ok) return fail(v.reason);
    const def = furnitureOf(it.id)!;
    const dx = cand.x - it.x; const dy = cand.y - it.y;
    it.x = clean(cand.x); it.y = clean(cand.y);
    if (cand.on !== undefined) it.on = cand.on; else delete it.on;
    const rot = normRot(def, cand.rot);
    if (rot) it.rot = rot; else delete it.rot;
    for (const k of kids) { k.x = clean(k.x + dx); k.y = clean(k.y + dy); }
    return { ok: true };
  }

  rotate(uid: number): Res<{ rot: number; flip: boolean }> {
    const it = this.get(uid);
    const def = it && furnitureOf(it.id);
    if (!it || !def) return fail('Meuble introuvable');
    if (!canRotate(def)) return fail('Ce meuble ne tourne pas');
    if (def.orient === 'mirror' || it.on !== undefined) { it.flip = !it.flip; return { ok: true, rot: 0, flip: it.flip }; }
    const c = rotated(this.room, this.items, uid);
    if (!c) return fail('Pas assez de place pour tourner');
    it.x = c.x; it.y = c.y;
    if (c.rot) it.rot = c.rot; else delete it.rot;
    this.settle(uid);
    return { ok: true, rot: c.rot, flip: it.flip === true };
  }

  /** Les objets posés sur un support restent dessus (sinon ils retournent en réserve). */
  private settle(hostUid: number): void {
    reseat(this.room, this.items, hostUid);
    for (const k of this.kids(hostUid)) {
      const rest = this.items.filter((o) => o.uid !== k.uid);
      const c: Candidate = { id: k.id, x: k.x, y: k.y, rot: 0, on: k.on };
      if (validate(this.room, rest, c).ok) continue;
      const alt = nearestValid(this.room, rest, c, [], 1.5);
      if (alt) { k.x = alt.x; k.y = alt.y; } else this.items.splice(this.items.indexOf(k), 1);
    }
  }

  /** Retire du brouillon (retourne en réserve à la validation). Les objets posés dessus partent avec. */
  remove(uid: number): Res<{ id: string; count: number }> {
    const it = this.get(uid);
    if (!it) return fail('Meuble introuvable');
    const gone = new Set([uid, ...this.kids(uid).map((k) => k.uid)]);
    this.items = this.items.filter((o) => !gone.has(o.uid));
    return { ok: true, id: it.id, count: gone.size };
  }

  setVariant(uid: number, variant: string): Res {
    const it = this.get(uid);
    const def = it && furnitureOf(it.id);
    if (!it || !def) return fail('Meuble introuvable');
    if (!def.variants.some((v) => v.id === variant)) return fail('Style indisponible');
    it.variant = variant;
    return { ok: true };
  }
  setColor(uid: number, color: string): Res {
    const it = this.get(uid);
    if (!it) return fail('Meuble introuvable');
    it.color = color;
    return { ok: true };
  }

  // ---------------------------------------------------------------- validation
  /** Le brouillon est-il enregistrable ? (positions valides, possédés suffisants ou achetables). */
  check(pay: CT.PayWith = 'coins'): Res {
    const list: PlacedItem[] = [];
    for (const it of this.sorted()) {
      const v = validate(this.room, list, { id: it.id, x: it.x, y: it.y, rot: it.rot ?? 0, on: it.on });
      if (!v.ok) return fail(v.reason);
      list.push(it);
    }
    const cost = this.cost();
    if (cost.coins > 0 || cost.gems > 0) {
      for (const id of Object.keys(this.toBuy())) {
        const f = furnitureOf(id)!;
        if (pay === 'gems' && !f.gems) return fail(`${f.name} ne s'achète pas en diamants`);
      }
      if (pay === 'gems') { if (this.ctx.diamonds.get() < cost.gems) return fail('Pas assez de diamants'); }
      else if (this.ctx.world.res.coins < cost.coins) return fail('Pas assez de pièces');
    }
    return { ok: true };
  }
  private sorted(): PlacedItem[] { return [...this.items].sort((a, b) => Number(a.on !== undefined) - Number(b.on !== undefined)); }

  /** Enregistre le brouillon dans le monde (achète ce qui manque). Atomique : en cas d'échec, rien ne change. */
  commit(pay: CT.PayWith = 'coins'): Res<CommitInfo> {
    const chk = this.check(pay);
    if (!chk.ok) return chk;
    const w = this.ctx.world;
    const before = new Map(w.castle.rooms[this.room].items.map((i) => [i.uid, sig(i)]));
    const info: CommitInfo = { placed: [], moved: [], bought: [], coins: 0, gems: 0 };
    snapshot(this.ctx, this.room);
    // achats (le solde a été vérifié : chaque achat réussit)
    for (const [id, n] of Object.entries(this.toBuy())) {
      for (let k = 0; k < n; k++) {
        const b = CT.buyFurniture(this.ctx, id, pay);
        if (!b.ok) return fail(b.reason); // ne devrait pas arriver (solde vérifié)
        info.bought.push(id);
        if (pay === 'gems') info.gems += furnitureOf(id)!.gems ?? 0; else info.coins += furnitureOf(id)!.price;
      }
    }
    // uid réels
    const remap = new Map<number, number>();
    for (const it of this.items) if (it.uid < 0) remap.set(it.uid, w.castle.nextUid++);
    const out: PlacedItem[] = this.items.map((it) => {
      const o = { ...it };
      if (remap.has(it.uid)) o.uid = remap.get(it.uid)!;
      if (it.on !== undefined && remap.has(it.on)) o.on = remap.get(it.on)!;
      return o;
    });
    w.castle.rooms[this.room].items = out;
    for (const it of out) {
      if (!before.has(it.uid)) info.placed.push(it.uid);
      else if (before.get(it.uid) !== sig(it)) info.moved.push(it.uid);
    }
    this.reset();
    return { ok: true, ...info };
  }
}
