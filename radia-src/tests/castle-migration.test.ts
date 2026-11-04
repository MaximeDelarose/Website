import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld, type PlacedItem, type World } from '../src/save/schema';
import { ROOM_IDS } from '../src/data/world/ids';
import { furnitureOf } from '../src/data/world/furniture';
import { migrateCastle } from '../src/ui/screens/world/castle/migrate';
import { ceilingDepth, drawOrder, layerOf, rectOfItem, validate } from '../src/ui/screens/world/castle/placement';
import { geo } from '../src/ui/screens/world/castle/geometry';

const legacy = (uid: number, id: string, x: number, y: number, color = 'cream'): PlacedItem => ({ uid, id, x, y, color, flip: false });

/** Une vraie sauvegarde « ancienne » : tout est posé au sol sur des cases entières, sans rot/variant/on. */
function oldSave(): World {
  const w = defaultWorld();
  w.castle.unlocked = ['bedroom', 'salon', 'garden', 'dressing'];
  w.castle.rooms.bedroom.items = [
    legacy(1, 'bed-royal', 0, 0, 'rose'), legacy(2, 'nightstand', 3, 0), legacy(3, 'lamp-table', 3, 1), legacy(4, 'chandelier', 4, 3, 'gold'),
    legacy(5, 'painting', 5, 0), legacy(6, 'rug-round', 2, 3), legacy(7, 'plant-pot', 7, 5),
  ];
  w.castle.rooms.salon.items = [
    legacy(8, 'sofa', 1, 2), legacy(9, 'coffee-table', 1, 4), legacy(10, 'candles', 5, 2), legacy(11, 'flower-vase', 6, 0),
    legacy(12, 'chandelier', 0, 0, 'gold'), legacy(13, 'chandelier', 2, 0, 'gold'), legacy(14, 'painting', 2, 5), legacy(15, 'fireplace', 6, 3),
  ];
  w.castle.rooms.garden.items = [legacy(16, 'fountain', 3, 2), legacy(17, 'bench', 0, 5)];
  w.castle.owned = { 'bed-royal': 1, nightstand: 1, 'lamp-table': 1, chandelier: 3, painting: 2, 'rug-round': 1, 'plant-pot': 1, sofa: 1, 'coffee-table': 1, candles: 1, 'flower-vase': 1, fireplace: 1, fountain: 1, bench: 1, vanity: 2 };
  w.castle.nextUid = 18;
  return w;
}

function consistent(w: World): void {
  const uids = new Set<number>();
  for (const room of ROOM_IDS) {
    const items = w.castle.rooms[room].items;
    const list: PlacedItem[] = [];
    for (const it of [...items].sort((a, b) => Number(a.on !== undefined) - Number(b.on !== undefined))) {
      expect(uids.has(it.uid)).toBe(false);
      uids.add(it.uid);
      expect(validate(room, list, { id: it.id, x: it.x, y: it.y, rot: it.rot ?? 0, on: it.on }).ok, `${room}:${it.id}@${it.x},${it.y}`).toBe(true);
      list.push(it);
    }
    for (const it of items) expect(it.uid).toBeLessThan(w.castle.nextUid);
  }
  const placed: Record<string, number> = {};
  for (const room of ROOM_IDS) for (const it of w.castle.rooms[room].items) placed[it.id] = (placed[it.id] ?? 0) + 1;
  for (const [id, n] of Object.entries(placed)) expect(w.castle.owned[id] ?? 0).toBeGreaterThanOrEqual(n);
}

describe('migration des meubles déjà posés', () => {
  it('une ancienne sauvegarde devient cohérente sans perdre un seul meuble acheté', () => {
    const w = oldSave();
    const ownedBefore = JSON.stringify(w.castle.owned);
    const rep = migrateCastle(w);
    consistent(w);
    expect(JSON.stringify(w.castle.owned)).toBe(ownedBefore);   // possédé inchangé
    const total = ROOM_IDS.reduce((n, r) => n + w.castle.rooms[r].items.length, 0);
    expect(total + rep.stored).toBe(17);                          // posés + rangés en réserve = avant : rien de perdu
    expect(rep.dropped).toBe(0);
  });
  it('positions valides conservées (y compris entières)', () => {
    const w = oldSave();
    migrateCastle(w);
    const bed = w.castle.rooms.bedroom.items.find((i) => i.id === 'bed-royal')!;
    expect([bed.x, bed.y]).toEqual([0, 0]);
    const sofa = w.castle.rooms.salon.items.find((i) => i.id === 'sofa')!;
    expect([sofa.x, sofa.y]).toEqual([1, 2]);
    const rug = w.castle.rooms.bedroom.items.find((i) => i.id === 'rug-round')!;
    expect([rug.x, rug.y]).toEqual([2, 3]);
  });
  it('un lustre posé au sol remonte au plafond, dans la même colonne', () => {
    const w = oldSave();
    migrateCastle(w);
    const ch = w.castle.rooms.bedroom.items.find((i) => i.id === 'chandelier')!;
    expect(layerOf(furnitureOf('chandelier')!, ch.on)).toBe('ceiling');
    expect(ch.y).toBe(ceilingDepth(geo('bedroom')));
    expect(ch.x).toBe(4);
    // deux lustres en collision au sol : le second est décalé, aucun n'est perdu
    const salon = w.castle.rooms.salon.items.filter((i) => i.id === 'chandelier');
    expect(salon.length).toBe(2);
    const [a, b] = salon.map((i) => rectOfItem(i)!);
    expect(a.x < b.x + b.w && b.x < a.x + a.w).toBe(false);
  });
  it('un tableau posé au sol est reclassé sur le mur', () => {
    const w = oldSave();
    migrateCastle(w);
    for (const [room, id] of [['bedroom', 5], ['salon', 14]] as const) {
      const p = w.castle.rooms[room].items.find((i) => i.uid === id)!;
      expect(p, `${room} tableau`).toBeTruthy();
      expect(layerOf(furnitureOf('painting')!, p.on)).toBe('wall');
      expect(p.y).toBeLessThan(geo(room).wallRows);
    }
  });
  it('les petits objets posés près d\'un support montent dessus ; sinon ils restent au sol (jamais perdus)', () => {
    const w = oldSave();
    migrateCastle(w);
    const lamp = w.castle.rooms.bedroom.items.find((i) => i.id === 'lamp-table')!;
    const stand = w.castle.rooms.bedroom.items.find((i) => i.id === 'nightstand')!;
    expect(lamp.on).toBe(stand.uid);
    const vase = w.castle.rooms.salon.items.find((i) => i.id === 'flower-vase')!;
    expect(vase).toBeTruthy();
    const candles = w.castle.rooms.salon.items.find((i) => i.id === 'candles')!;
    expect(candles).toBeTruthy();
  });
  it('le tapis reste sous le meuble, l\'ordre d\'affichage est correct', () => {
    const w = oldSave();
    migrateCastle(w);
    const order = drawOrder(w.castle.rooms.bedroom.items).map((i) => i.id);
    expect(order[0]).toBe('rug-round');
    expect(order[order.length - 1]).toBe('chandelier');
  });
  it('idempotente : une seconde migration ne change rien', () => {
    const w = oldSave();
    migrateCastle(w);
    const once = JSON.stringify(w.castle);
    const rep = migrateCastle(w);
    expect(JSON.stringify(w.castle)).toBe(once);
    expect(rep.stored).toBe(0);
  });
  it('survit au cycle sauvegarde → rechargement → migration', () => {
    const w = oldSave();
    const reloaded = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    migrateCastle(reloaded);
    consistent(reloaded);
    const again = sanitizeWorld(JSON.parse(JSON.stringify(reloaded)));
    expect(again.castle.rooms).toEqual(reloaded.castle.rooms);
  });
  it('meuble inconnu écarté, pièce verrouillée : rangé en réserve sans perte', () => {
    const w = oldSave();
    w.castle.rooms.reception.items = [legacy(30, 'banquet-table', 0, 0)];        // pièce non débloquée
    w.castle.rooms.dressing.items = [legacy(31, 'canard', 0, 0), legacy(32, 'wardrobe', 0, 0)];
    w.castle.owned['banquet-table'] = 1; w.castle.owned.wardrobe = 1;
    const rep = migrateCastle(w);
    expect(w.castle.rooms.reception.items).toHaveLength(0);
    expect(w.castle.owned['banquet-table']).toBe(1);
    expect(w.castle.rooms.dressing.items.map((i) => i.id)).toEqual(['wardrobe']);
    expect(rep.dropped).toBe(1);
    consistent(w);
  });
  it('une pièce pleine : un meuble qui ne trouve plus de place est rangé, pas détruit', () => {
    const w = defaultWorld();
    w.castle.rooms.salon.items = [legacy(1, 'sofa', 0, 0), legacy(2, 'sofa', 0, 0)];   // collision (ancienne sauvegarde corrompue)
    w.castle.owned.sofa = 2; w.castle.nextUid = 3;
    migrateCastle(w);
    expect(w.castle.rooms.salon.items.length).toBe(2);   // le second est décalé
    expect(w.castle.owned.sofa).toBe(2);
    consistent(w);
  });
  it('possédé < posé (sauvegarde bricolée) : réparé vers le haut', () => {
    const w = defaultWorld();
    w.castle.rooms.salon.items = [legacy(1, 'sofa', 0, 0)];
    w.castle.owned = {};
    migrateCastle(w);
    expect(w.castle.owned.sofa).toBe(1);
  });
});
