import { describe, it, expect, beforeEach } from 'vitest';
import { defaultWorld, sanitizeWorld, type World } from '../src/save/schema';
import { FURNITURE_IDS, ROOM_IDS, PALETTE } from '../src/data/world/ids';
import { FURNITURE, CAT_ORDER, furnitureForRoom } from '../src/data/world/furniture';
import { ROOMS, DECOR_VARIANT_COUNT, roomName } from '../src/data/world/rooms';
import * as C from '../src/game/world/castle';

function mk(coins = 5000, diamonds = 100): C.CastleCtx & { gems: { n: number } } {
  const world = defaultWorld();
  world.res.coins = coins;
  world.res.flowers = 20;
  const gems = { n: diamonds };
  return { world, gems, diamonds: { get: () => gems.n, spend: (n) => (gems.n >= n ? ((gems.n -= n), true) : false) } };
}
const buyPlace = (ctx: C.CastleCtx, room: Parameters<typeof C.placeFurniture>[1], id: string, x: number, y: number) => {
  expect(C.buyFurniture(ctx, id).ok).toBe(true);
  const r = C.placeFurniture(ctx, room, id, x, y);
  expect(r.ok).toBe(true);
  return (r as { uid: number }).uid;
};
function invariants(w: World) {
  const uids = new Set<number>();
  for (const r of ROOM_IDS) for (const i of w.castle.rooms[r].items) {
    expect(uids.has(i.uid)).toBe(false);
    uids.add(i.uid);
    expect(i.uid).toBeLessThan(w.castle.nextUid);
  }
  for (const id of FURNITURE_IDS) {
    expect(C.placedCount(w, id)).toBeLessThanOrEqual(C.ownedCount(w, id));
    expect(C.stockCount(w, id)).toBe(C.ownedCount(w, id) - C.placedCount(w, id));
  }
  for (const r of ROOM_IDS) {
    const items = w.castle.rooms[r].items;
    items.forEach((a, k) => {
      const f = FURNITURE[a.id as keyof typeof FURNITURE];
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + f.w).toBeLessThanOrEqual(ROOMS[r].cols);
      expect(a.y + f.h).toBeLessThanOrEqual(ROOMS[r].rows);
      items.slice(k + 1).forEach((b) => {
        const g = FURNITURE[b.id as keyof typeof FURNITURE];
        expect(a.x < b.x + g.w && b.x < a.x + f.w && a.y < b.y + g.h && b.y < a.y + f.h).toBe(false);
      });
    });
  }
}

beforeEach(() => C.clearUndo());

describe('données', () => {
  it('36 meubles complets', () => {
    expect(FURNITURE_IDS.length).toBe(36);
    for (const id of FURNITURE_IDS) {
      const f = FURNITURE[id];
      expect(f.name.length).toBeGreaterThan(2);
      expect(f.w).toBeGreaterThanOrEqual(1); expect(f.w).toBeLessThanOrEqual(3);
      expect(f.h).toBeGreaterThanOrEqual(1); expect(f.h).toBeLessThanOrEqual(3);
      expect(f.price).toBeGreaterThanOrEqual(40);
      expect(f.rooms.length).toBeGreaterThan(0);
      expect(PALETTE.some((p) => p.id === f.color)).toBe(true);
      // doit tenir dans au moins une de ses pièces
      expect(f.rooms.some((r) => f.w <= ROOMS[r].cols && f.h <= ROOMS[r].rows)).toBe(true);
    }
    expect(new Set(FURNITURE_IDS.map((i) => FURNITURE[i].cat)).size).toBe(CAT_ORDER.length);
  });
  it('pièces : prix et options', () => {
    expect(ROOMS.bedroom.cost).toBe(0); expect(ROOMS.salon.cost).toBe(0); expect(ROOMS.garden.cost).toBe(0);
    expect(ROOMS.dressing.cost).toBe(200); expect(ROOMS.reception.cost).toBe(400); expect(ROOMS.familySalon.cost).toBe(300);
    for (const k of ['kid1', 'kid2', 'kid3'] as const) expect(ROOMS[k].cost).toBe(150);
    expect(DECOR_VARIANT_COUNT).toBeGreaterThanOrEqual(12);
    for (const r of ROOM_IDS) { expect(roomName(r).length).toBeGreaterThan(3); expect(furnitureForRoom(r).length).toBeGreaterThan(4); }
  });
});

describe('achat', () => {
  it('débite les pièces et ajoute en réserve', () => {
    const ctx = mk(500);
    const r = C.buyFurniture(ctx, 'sofa');
    expect(r.ok).toBe(true);
    expect(ctx.world.res.coins).toBe(500 - FURNITURE.sofa.price);
    expect(C.ownedCount(ctx.world, 'sofa')).toBe(1);
    expect(C.stockCount(ctx.world, 'sofa')).toBe(1);
  });
  it('solde insuffisant : rien ne change, jamais négatif', () => {
    const ctx = mk(50);
    const r = C.buyFurniture(ctx, 'sofa');
    expect(r.ok).toBe(false);
    expect(ctx.world.res.coins).toBe(50);
    expect(C.ownedCount(ctx.world, 'sofa')).toBe(0);
  });
  it('achat en diamants (meubles de luxe seulement)', () => {
    const ctx = mk(0, 100);
    expect(C.buyFurniture(ctx, 'candles', 'gems').ok).toBe(false);
    expect(C.buyFurniture(ctx, 'chandelier', 'gems').ok).toBe(true);
    expect(ctx.gems.n).toBe(100 - FURNITURE.chandelier.gems!);
    expect(ctx.world.res.coins).toBe(0);
    const poor = mk(0, 3);
    expect(C.buyFurniture(poor, 'chandelier', 'gems').ok).toBe(false);
    expect(poor.gems.n).toBe(3);
  });
  it('meuble inconnu refusé', () => {
    expect(C.buyFurniture(mk(), 'canard').ok).toBe(false);
  });
});

describe('placement', () => {
  it('place, uid uniques, bornes et pièces autorisées', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'bedroom', 'nightstand', 0, 0);
    C.buyFurniture(ctx, 'nightstand');
    const b = C.placeFurniture(ctx, 'bedroom', 'nightstand', 1, 0);
    expect(b.ok).toBe(true);
    expect((b as { uid: number }).uid).not.toBe(a);
    // hors grille
    C.buyFurniture(ctx, 'bed-royal');
    expect(C.placeFurniture(ctx, 'bedroom', 'bed-royal', 6, 0).ok).toBe(false);
    expect(C.placeFurniture(ctx, 'bedroom', 'bed-royal', 0, 5).ok).toBe(false);
    expect(C.placeFurniture(ctx, 'bedroom', 'bed-royal', -1, 0).ok).toBe(false);
    expect(C.placeFurniture(ctx, 'bedroom', 'bed-royal', 0.5, 0).ok).toBe(false);
    // pièce interdite
    expect(C.placeFurniture(ctx, 'garden', 'bed-royal', 0, 0).ok).toBe(false);
    // pièce verrouillée
    C.buyFurniture(ctx, 'wardrobe');
    expect(C.placeFurniture(ctx, 'dressing', 'wardrobe', 0, 0).ok).toBe(false);
    invariants(ctx.world);
  });
  it('collision', () => {
    const ctx = mk();
    buyPlace(ctx, 'salon', 'sofa', 2, 2);
    C.buyFurniture(ctx, 'armchair');
    expect(C.placeFurniture(ctx, 'salon', 'armchair', 4, 3).ok).toBe(false); // chevauche le canapé (x 2..4, y 2..3)
    expect(C.placeFurniture(ctx, 'salon', 'armchair', 5, 2).ok).toBe(true);
    invariants(ctx.world);
  });
  it('impossible de placer sans exemplaire en réserve (pas de duplication)', () => {
    const ctx = mk();
    buyPlace(ctx, 'salon', 'armchair', 0, 0);
    expect(C.placeFurniture(ctx, 'salon', 'armchair', 4, 0).ok).toBe(false);
    expect(C.placedCount(ctx.world, 'armchair')).toBe(1);
  });
  it('findFreeSpot trouve une place valide ou null', () => {
    const ctx = mk(99999);
    C.buyFurniture(ctx, 'rug-rect');
    const p = C.findFreeSpot(ctx.world, 'salon', 'rug-rect')!;
    expect(C.checkPlacement(ctx.world, 'salon', 'rug-rect', p.x, p.y).ok).toBe(true);
    // pièce pleine de tapis 3×2 : 2 par rangée × 3 rangées
    let n = 0;
    for (;;) { C.buyFurniture(ctx, 'rug-rect'); const s = C.findFreeSpot(ctx.world, 'salon', 'rug-rect'); if (!s) break; expect(C.placeFurniture(ctx, 'salon', 'rug-rect', s.x, s.y).ok).toBe(true); if (++n > 30) throw new Error('boucle'); }
    expect(n).toBeGreaterThan(0);
    invariants(ctx.world);
  });
});

describe('déplacer, retourner, ranger, remplacer', () => {
  it('déplacer respecte collisions et bornes, et ignore soi-même', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'armchair', 0, 0);
    buyPlace(ctx, 'salon', 'armchair', 4, 0);
    expect(C.moveItem(ctx, 'salon', a, 1, 0).ok).toBe(true); // chevauche son ancienne place seulement
    expect(C.moveItem(ctx, 'salon', a, 3, 0).ok).toBe(false);
    expect(C.moveItem(ctx, 'salon', a, 7, 0).ok).toBe(false);
    expect(C.moveItem(ctx, 'salon', 999, 0, 0).ok).toBe(false);
    expect(C.itemById(ctx.world, 'salon', a)).toMatchObject({ x: 1, y: 0 });
    invariants(ctx.world);
  });
  it('retourner bascule flip', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'sofa', 0, 0);
    expect(C.flipItem(ctx, 'salon', a)).toMatchObject({ ok: true, flip: true });
    expect(C.flipItem(ctx, 'salon', a)).toMatchObject({ ok: true, flip: false });
  });
  it('ranger remet en réserve, sans perte, puis re-poser', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'sofa', 0, 0);
    const coins = ctx.world.res.coins;
    expect(C.storeItem(ctx, 'salon', a).ok).toBe(true);
    expect(C.ownedCount(ctx.world, 'sofa')).toBe(1);
    expect(C.stockCount(ctx.world, 'sofa')).toBe(1);
    expect(ctx.world.res.coins).toBe(coins);
    const r = C.placeFurniture(ctx, 'familySalon', 'sofa', 0, 0);
    expect(r.ok).toBe(false); // verrouillée
    expect(C.placeFurniture(ctx, 'salon', 'sofa', 5, 3).ok).toBe(true);
    invariants(ctx.world);
  });
  it('remplacer : l\'ancien retourne en réserve, le nouveau vient de la réserve', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'armchair', 0, 0);
    expect(C.replaceFurniture(ctx, 'salon', a, 'bookshelf').ok).toBe(false); // pas en réserve
    C.buyFurniture(ctx, 'bookshelf');
    const r = C.replaceFurniture(ctx, 'salon', a, 'bookshelf');
    expect(r.ok).toBe(true);
    expect(C.placedCount(ctx.world, 'bookshelf')).toBe(1);
    expect(C.placedCount(ctx.world, 'armchair')).toBe(0);
    expect(C.stockCount(ctx.world, 'armchair')).toBe(1);
    invariants(ctx.world);
  });
  it('remplacer par plus grand : trouve une place, ou échoue sans rien perdre', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'lamp-table', 7, 5);
    C.buyFurniture(ctx, 'sofa');
    const r = C.replaceFurniture(ctx, 'salon', a, 'sofa');
    expect(r.ok).toBe(true);
    invariants(ctx.world);
  });
});

describe('couleurs', () => {
  it('meuble, mur, sol, rideau', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'sofa', 0, 0);
    expect(C.recolorItem(ctx, 'salon', a, 'sage').ok).toBe(true);
    expect(C.itemById(ctx.world, 'salon', a)?.color).toBe('sage');
    expect(C.recolorItem(ctx, 'salon', a, '#ff0000').ok).toBe(false);
    expect(C.setRoomColor(ctx, 'salon', 'wall', 'sky').ok).toBe(true);
    expect(C.setRoomColor(ctx, 'salon', 'floor', 'noir').ok).toBe(true);
    expect(C.setRoomColor(ctx, 'salon', 'curtain', 'gold').ok).toBe(true);
    expect(ctx.world.castle.rooms.salon).toMatchObject({ wall: 'sky', floor: 'noir', curtain: 'gold' });
    expect(C.setRoomColor(ctx, 'salon', 'floor', 'inconnue').ok).toBe(false);
    expect(C.setRoomColor(ctx, 'dressing', 'wall', 'sky').ok).toBe(false);
  });
  it('un meuble non colorable refuse', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'candles', 0, 0);
    expect(C.recolorItem(ctx, 'salon', a, 'rose').ok).toBe(false);
  });
  it('tableau : variante magazine seulement si possédé', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'painting', 0, 0);
    expect(C.recolorItem(ctx, 'salon', a, 'mag:radia-mag').ok).toBe(false);
    ctx.world.magazines.push('radia-mag');
    expect(C.recolorItem(ctx, 'salon', a, 'mag:radia-mag').ok).toBe(true);
    expect(C.recolorItem(ctx, 'salon', a, 'mag:inconnu').ok).toBe(false);
  });
});

describe('annulation', () => {
  it('annule placer, déplacer, retourner, ranger, couleurs dans l\'ordre', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'armchair', 0, 0);
    C.moveItem(ctx, 'salon', a, 3, 3);
    C.flipItem(ctx, 'salon', a);
    C.recolorItem(ctx, 'salon', a, 'sage');
    C.setRoomColor(ctx, 'salon', 'wall', 'sky');
    C.storeItem(ctx, 'salon', a);
    expect(C.undoDepth('salon')).toBe(6);
    expect(C.undo(ctx, 'salon').ok).toBe(true); // annule ranger
    expect(C.itemById(ctx.world, 'salon', a)).toBeTruthy();
    C.undo(ctx, 'salon'); expect(ctx.world.castle.rooms.salon.wall).toBe('cream');
    C.undo(ctx, 'salon'); expect(C.itemById(ctx.world, 'salon', a)?.color).toBe('rose');
    C.undo(ctx, 'salon'); expect(C.itemById(ctx.world, 'salon', a)?.flip).toBe(false);
    C.undo(ctx, 'salon'); expect(C.itemById(ctx.world, 'salon', a)).toMatchObject({ x: 0, y: 0 });
    C.undo(ctx, 'salon'); // annule le placement : le meuble retourne en réserve
    expect(C.itemById(ctx.world, 'salon', a)).toBeUndefined();
    expect(C.stockCount(ctx.world, 'armchair')).toBe(1);
    expect(C.undo(ctx, 'salon').ok).toBe(false);
    invariants(ctx.world);
  });
  it('n\'annule pas un achat (l\'argent reste dépensé) et ne duplique jamais', () => {
    const ctx = mk();
    const a = buyPlace(ctx, 'salon', 'armchair', 0, 0);
    C.storeItem(ctx, 'salon', a);
    // le meuble est placé ailleurs (réserve → chambre), puis on annule le « ranger »
    expect(C.placeFurniture(ctx, 'bedroom', 'armchair', 0, 0).ok).toBe(true);
    clearTop(ctx);
    invariants(ctx.world);
    expect(C.ownedCount(ctx.world, 'armchair')).toBe(1);
  });
});
function clearTop(ctx: C.CastleCtx) {
  // annule tout ce qu'on peut dans le salon : l'invariant doit tenir, l'annulation refusée si besoin
  for (let i = 0; i < 5; i++) C.undo(ctx, 'salon');
}

describe('pièces', () => {
  it('débloquer coûte des pièces, une seule fois', () => {
    const ctx = mk(500);
    expect(C.isUnlocked(ctx.world, 'dressing')).toBe(false);
    expect(C.unlockRoom(ctx, 'dressing').ok).toBe(true);
    expect(ctx.world.res.coins).toBe(300);
    expect(C.unlockRoom(ctx, 'dressing').ok).toBe(false);
    expect(ctx.world.res.coins).toBe(300);
    expect(C.unlockRoom(ctx, 'reception').ok).toBe(false); // 400 > 300
    expect(ctx.world.res.coins).toBe(300);
    expect(C.unlockRoom(ctx, 'bedroom').ok).toBe(false);
  });
});

describe('soirée de réception', () => {
  it('exige 3 meubles, coûte pièces + fleurs, recharge 10 min', () => {
    const ctx = mk(5000);
    C.unlockRoom(ctx, 'reception');
    const now = 1_000_000;
    expect(C.eventState(ctx.world, now).ready).toBe(false);
    buyPlace(ctx, 'reception', 'red-carpet', 0, 5);
    buyPlace(ctx, 'reception', 'flower-vase', 4, 4);
    expect(C.runEvent(ctx, now).ok).toBe(false);
    buyPlace(ctx, 'reception', 'candles', 6, 4);
    const coins = ctx.world.res.coins;
    const r = C.runEvent(ctx, now, () => 0.5);
    expect(r.ok).toBe(true);
    expect((r as { reward: C.EventReward }).reward.fans).toBeGreaterThan(10);
    expect(ctx.world.res.coins).toBe(coins - C.EVENT_COST.coins);
    expect(ctx.world.res.flowers).toBe(20 - C.EVENT_COST.flowers);
    const s = C.eventState(ctx.world, now + 60_000);
    expect(s.ready).toBe(false);
    expect(s.remainingMs).toBe(C.EVENT_COOLDOWN_MS - 60_000);
    expect(C.eventState(ctx.world, now + C.EVENT_COOLDOWN_MS).ready).toBe(true);
  });
  it('sans fleurs : refus sans débit', () => {
    const ctx = mk(5000);
    C.unlockRoom(ctx, 'reception');
    buyPlace(ctx, 'reception', 'red-carpet', 0, 5);
    buyPlace(ctx, 'reception', 'flower-vase', 4, 4);
    buyPlace(ctx, 'reception', 'candles', 6, 4);
    ctx.world.res.flowers = 1;
    const coins = ctx.world.res.coins;
    expect(C.runEvent(ctx, 5).ok).toBe(false);
    expect(ctx.world.res.coins).toBe(coins);
  });
});

describe('chambres d\'enfants', () => {
  it('kidRoomsFurnished : 3 meubles dans chacune', () => {
    const ctx = mk(99999);
    for (const k of ['kid1', 'kid2', 'kid3'] as const) C.unlockRoom(ctx, k);
    expect(C.kidRoomsFurnished(ctx.world)).toBe(false);
    for (const k of ['kid1', 'kid2', 'kid3'] as const) {
      buyPlace(ctx, k, 'plush-toys', 0, 4); buyPlace(ctx, k, 'toy-blocks', 1, 4); buyPlace(ctx, k, 'bed-kid', 5, 0);
    }
    expect(C.kidRoomsFurnished(ctx.world)).toBe(true);
  });
});

describe('sauvegarde', () => {
  it('aller-retour JSON via sanitizeWorld', () => {
    const ctx = mk(5000);
    C.unlockRoom(ctx, 'dressing');
    const a = buyPlace(ctx, 'bedroom', 'bed-royal', 0, 1);
    C.flipItem(ctx, 'bedroom', a);
    C.recolorItem(ctx, 'bedroom', a, 'lavender');
    C.setRoomColor(ctx, 'bedroom', 'wall', 'peach');
    C.buyFurniture(ctx, 'sofa');
    const back = sanitizeWorld(JSON.parse(JSON.stringify(ctx.world)));
    expect(back.castle.unlocked).toContain('dressing');
    expect(back.castle.rooms.bedroom.wall).toBe('peach');
    expect(back.castle.rooms.bedroom.items).toEqual(ctx.world.castle.rooms.bedroom.items);
    expect(back.castle.owned).toEqual(ctx.world.castle.owned);
    expect(back.castle.nextUid).toBe(ctx.world.castle.nextUid);
    expect(back.res.coins).toBe(ctx.world.res.coins);
    invariants(back);
  });
  it('sauvegarde corrompue : normalizeCastle range sans rien perdre', () => {
    const w = defaultWorld();
    const r = w.castle.rooms;
    r.bedroom.items = [
      { uid: 5, id: 'bed-royal', x: 6, y: 0, color: 'rose' },   // hors grille
      { uid: 5, id: 'nightstand', x: 0, y: 0, color: 'cream' }, // uid en double
      { uid: 6, id: 'nightstand', x: 0, y: 0, color: 'cream' }, // ok
      { uid: 7, id: 'nightstand', x: 0, y: 0, color: 'cream' }, // collision
      { uid: 8, id: 'fountain', x: 2, y: 2, color: 'sky' },     // interdit ici
      { uid: 9, id: 'inconnu', x: 2, y: 2, color: 'sky' },
    ];
    w.castle.rooms.dressing.items = [{ uid: 10, id: 'wardrobe', x: 0, y: 0, color: 'cream' }]; // pièce verrouillée
    w.castle.owned = { fantome: 3 };
    const moved = C.normalizeCastle(w);
    expect(moved).toBeGreaterThanOrEqual(5);
    expect(w.castle.owned.fantome).toBeUndefined();
    expect(C.ownedCount(w, 'bed-royal')).toBe(1);
    expect(C.stockCount(w, 'bed-royal')).toBe(1);
    expect(C.ownedCount(w, 'nightstand')).toBe(3);
    expect(C.placedCount(w, 'nightstand')).toBe(1);
    expect(C.stockCount(w, 'wardrobe')).toBe(1);
    invariants(w);
  });
  it('entrées absurdes : aucun plantage', () => {
    for (const raw of [null, 3, 'x', { castle: 5 }, { castle: { rooms: { bedroom: { items: 'non' } }, owned: { sofa: 'x' } } }]) {
      const w = sanitizeWorld(raw);
      C.normalizeCastle(w);
      invariants(w);
    }
  });
});

describe('invariants (fuzz)', () => {
  it('suite aléatoire d\'opérations : aucune duplication ni perte', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const ctx = mk(100000);
    for (const r of ROOM_IDS) C.unlockRoom(ctx, r);
    const purchased: Record<string, number> = {};
    for (let step = 0; step < 1500; step++) {
      const room = ROOM_IDS[Math.floor(rnd() * ROOM_IDS.length)];
      const id = FURNITURE_IDS[Math.floor(rnd() * FURNITURE_IDS.length)];
      const items = ctx.world.castle.rooms[room].items;
      const pick = items[Math.floor(rnd() * items.length)];
      const op = Math.floor(rnd() * 8);
      if (op === 0) { if (C.buyFurniture(ctx, id).ok) purchased[id] = (purchased[id] ?? 0) + 1; }
      else if (op === 1) C.placeFurniture(ctx, room, id, Math.floor(rnd() * 8), Math.floor(rnd() * 6));
      else if (op === 2 && pick) C.moveItem(ctx, room, pick.uid, Math.floor(rnd() * 8), Math.floor(rnd() * 6));
      else if (op === 3 && pick) C.storeItem(ctx, room, pick.uid);
      else if (op === 4 && pick) C.flipItem(ctx, room, pick.uid);
      else if (op === 5) C.undo(ctx, rnd() < 0.5 ? room : undefined);
      else if (op === 6 && pick) C.replaceFurniture(ctx, room, pick.uid, id);
      else if (op === 7) C.setRoomColor(ctx, room, 'wall', PALETTE[Math.floor(rnd() * 12)].id);
      if (step % 50 === 0) invariants(ctx.world);
    }
    invariants(ctx.world);
    for (const id of FURNITURE_IDS) expect(C.ownedCount(ctx.world, id)).toBe(purchased[id] ?? 0);
  });
});
