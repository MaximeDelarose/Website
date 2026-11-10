import { describe, it, expect } from 'vitest';
import { defaultWorld, sanitizeWorld, type World } from '../src/save/schema';
import { FURNITURE_ALL } from '../src/data/world/furniture';
import { Draft } from '../src/ui/screens/world/castle/draft';
import { geo } from '../src/ui/screens/world/castle/geometry';
import { ceilingDepth, validate } from '../src/ui/screens/world/castle/placement';
import * as ops from '../src/ui/screens/world/castle/ops';
import * as CT from '../src/game/world/castle';

function mk(coins = 5000, gems = 100) {
  const world = defaultWorld();
  world.res.coins = coins;
  const g = { n: gems };
  const ctx: ops.Ctx = { world, diamonds: { get: () => g.n, spend: (n) => (g.n >= n ? ((g.n -= n), true) : false) } };
  return { world, ctx, g };
}
const price = (id: string) => FURNITURE_ALL[id].price;

describe('brouillon : poser sans effet avant validation', () => {
  it('annuler le brouillon ne change rien (ni pièces, ni meubles, ni réserve)', () => {
    const { world, ctx } = mk();
    const d = new Draft(ctx, 'salon');
    d.add('sofa'); d.add('chandelier'); d.add('painting');
    expect(d.dirty()).toBe(true);
    expect(d.cost().coins).toBe(price('sofa') + price('chandelier') + price('painting'));
    const snap = JSON.stringify(world);
    d.reset();
    expect(d.dirty()).toBe(false);
    expect(JSON.stringify(world)).toBe(snap);
    expect(world.res.coins).toBe(5000);
  });
  it('valider achète une fois et pose ; la réserve est vide ensuite', () => {
    const { world, ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const r = d.add('sofa');
    expect(r.ok && r.needsBuy).toBe(true);
    const c = d.commit();
    expect(c.ok).toBe(true);
    expect(world.res.coins).toBe(5000 - price('sofa'));
    expect(CT.ownedCount(world, 'sofa')).toBe(1);
    expect(CT.stockCount(world, 'sofa')).toBe(0);
    expect(world.castle.rooms.salon.items).toHaveLength(1);
    expect(world.castle.rooms.salon.items[0].uid).toBeGreaterThan(0);
  });
  it('déjà possédé : placé depuis la réserve sans repayer, y compris après rangement', () => {
    const { world, ctx } = mk();
    let d = new Draft(ctx, 'salon');
    const u = (d.add('armchair') as { uid: number }).uid;
    expect(d.commit().ok).toBe(true);
    const coins = world.res.coins;
    d = new Draft(ctx, 'salon');
    const real = world.castle.rooms.salon.items[0].uid;
    expect(real).toBeGreaterThan(0); expect(u).toBeLessThan(0);
    d.remove(real);
    expect(d.commit().ok).toBe(true);
    expect(CT.stockCount(world, 'armchair')).toBe(1);
    d = new Draft(ctx, 'salon');
    const r = d.add('armchair');
    expect(r.ok && r.needsBuy).toBe(false);
    expect(d.cost().coins).toBe(0);
    expect(d.commit().ok).toBe(true);
    expect(world.res.coins).toBe(coins); // pas repayé
    expect(CT.ownedCount(world, 'armchair')).toBe(1);
  });
  it('solde insuffisant : tout est refusé, rien ne change', () => {
    const { world, ctx } = mk(100);
    const d = new Draft(ctx, 'salon');
    d.add('sofa');
    const snap = JSON.stringify(world);
    const r = d.commit();
    expect(r.ok).toBe(false);
    expect(JSON.stringify(world)).toBe(snap);
  });
  it('achat en diamants atomique', () => {
    const { world, ctx, g } = mk(0, 100);
    const d = new Draft(ctx, 'salon');
    d.add('chandelier');
    expect(d.commit('coins').ok).toBe(false);
    const r = d.commit('gems');
    expect(r.ok).toBe(true);
    expect(g.n).toBe(100 - FURNITURE_ALL.chandelier.gems!);
    expect(world.res.coins).toBe(0);
    const d2 = new Draft(ctx, 'salon');
    d2.add('candles');
    expect(d2.commit('gems').ok).toBe(false); // pas de prix en diamants
  });
  it('un meuble possédé ne peut pas être posé deux fois sans en acheter un second', () => {
    const { world, ctx } = mk();
    const d = new Draft(ctx, 'salon');
    d.add('sofa');
    expect(d.commit().ok).toBe(true);
    const d2 = new Draft(ctx, 'salon');
    d2.add('sofa', { id: 'sofa', x: 0, y: 5, rot: 0 });
    expect(d2.toBuy()).toEqual({ sofa: 1 });
    expect(d2.commit().ok).toBe(true);
    expect(CT.ownedCount(world, 'sofa')).toBe(2);
  });
});

describe('brouillon : catégories', () => {
  it('le lustre se pose automatiquement au plafond ; au sol refusé', () => {
    const { ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const r = d.add('chandelier');
    expect(r.ok).toBe(true);
    expect(d.items[0].y).toBe(ceilingDepth(geo('salon')));
    expect(d.add('chandelier', { id: 'chandelier', x: 2, y: 3, rot: 0 }).ok).toBe(false);
  });
  it('tableau au mur, rideau à la fenêtre, tapis sous un meuble, objet sur un support', () => {
    const { world, ctx } = mk();
    const d = new Draft(ctx, 'salon');
    expect(d.add('painting').ok).toBe(true);
    expect(d.add('sheer-curtain').ok).toBe(true);
    const rug = d.add('rug-rect', { id: 'rug-rect', x: 2, y: 3, rot: 0 });
    expect(rug.ok).toBe(true);
    const sofa = d.add('sofa', { id: 'sofa', x: 2, y: 3, rot: 0 });
    expect(sofa.ok).toBe(true); // sur le tapis : permis
    const cush = d.add('cushion');
    expect(cush.ok).toBe(true);
    expect(d.items.find((i) => i.id === 'cushion')!.on).toBe((sofa as { uid: number }).uid);
    expect(d.commit().ok).toBe(true);
    const items = world.castle.rooms.salon.items;
    const so = items.find((i) => i.id === 'sofa')!;
    expect(items.find((i) => i.id === 'cushion')!.on).toBe(so.uid); // la référence a suivi le vrai uid
  });
  it('collision : deux meubles au même endroit refusés, ranger libère la place', () => {
    const { ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const a = d.add('sofa', { id: 'sofa', x: 0, y: 0, rot: 0 }) as { uid: number };
    expect(d.add('sofa', { id: 'sofa', x: 1, y: 0, rot: 0 }).ok).toBe(false);
    d.remove(a.uid);
    expect(d.add('sofa', { id: 'sofa', x: 1, y: 0, rot: 0 }).ok).toBe(true);
  });
  it('ranger un support range aussi ce qui est posé dessus (jamais perdu : reste possédé)', () => {
    const { world, ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const s = d.add('sofa') as { uid: number };
    d.add('cushion');
    expect(d.commit().ok).toBe(true);
    const d2 = new Draft(ctx, 'salon');
    const real = world.castle.rooms.salon.items.find((i) => i.id === 'sofa')!.uid;
    const r = d2.remove(real);
    expect(r.ok && r.count).toBe(2);
    expect(d2.commit().ok).toBe(true);
    expect(world.castle.rooms.salon.items).toHaveLength(0);
    expect(CT.stockCount(world, 'sofa')).toBe(1);
    expect(CT.stockCount(world, 'cushion')).toBe(1);
    void s;
  });
  it('rotation : l\'emprise tourne, les objets posés suivent le support', () => {
    const { ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const s = d.add('sofa', { id: 'sofa', x: 0, y: 0, rot: 0 }) as { uid: number };
    d.add('cushion', { id: 'cushion', x: 2, y: 1, rot: 0, on: s.uid });
    const r = d.rotate(s.uid);
    expect(r.ok && r.rot).toBe(1);
    const sofa = d.get(s.uid)!;
    const cush = d.items.find((i) => i.id === 'cushion');
    expect(validate('salon', d.items.filter((i) => i !== sofa && i !== cush), { id: 'sofa', x: sofa.x, y: sofa.y, rot: 1 }).ok).toBe(true);
    if (cush) expect(cush.x).toBeLessThanOrEqual(sofa.x + 2 - 0.8 + 1e-6);
    expect(d.rotate(s.uid).ok).toBe(true);
    expect(d.rotate(s.uid).ok).toBe(true);
    expect(d.rotate(s.uid).ok).toBe(true);
    expect(d.get(s.uid)!.rot ?? 0).toBe(0);
  });
  it('un objet symétrique se retourne au lieu de tourner', () => {
    const { ctx } = mk();
    const d = new Draft(ctx, 'salon');
    const p = d.add('plant-pot') as { uid: number };
    const r = d.rotate(p.uid);
    expect(r.ok && r.flip).toBe(true);
    expect(d.add('chandelier').ok).toBe(true);
    expect(d.rotate(d.items.find((i) => i.id === 'chandelier')!.uid).ok).toBe(false);
  });
});

describe('sauvegarde aller-retour', () => {
  it('la pièce est identique après sanitizeWorld (rechargement)', () => {
    const { world, ctx } = mk(50000);
    const d = new Draft(ctx, 'bedroom');
    const bed = d.add('bed-royal', { id: 'bed-royal', x: 2.5, y: 1.5, rot: 1 }) as { uid: number };
    d.add('lamp-table', { id: 'lamp-table', x: 6, y: 5, rot: 0 });
    d.add('painting', { id: 'painting', x: 0.5, y: 1.5, rot: 0 });
    d.add('chandelier');
    d.add('cushion', { id: 'cushion', x: 3, y: 2, rot: 0, on: bed.uid });
    d.setVariant(d.items.find((i) => i.id === 'painting')!.uid, 'coeur');
    expect(d.commit().ok).toBe(true);
    ctx.world.castle.rooms.bedroom.wall = 'sky';
    const back: World = sanitizeWorld(JSON.parse(JSON.stringify(world)));
    expect(back.castle.rooms.bedroom).toEqual(world.castle.rooms.bedroom);
    expect(back.castle.owned).toEqual(world.castle.owned);
    expect(back.castle.nextUid).toBe(world.castle.nextUid);
    const bd = back.castle.rooms.bedroom.items.find((i) => i.id === 'bed-royal')!;
    expect(bd.x).toBe(2.5); expect(bd.y).toBe(1.5); expect(bd.rot).toBe(1);
    expect(back.castle.rooms.bedroom.items.find((i) => i.id === 'painting')!.variant).toBe('coeur');
  });
  it('les champs invalides sont nettoyés, les anciens schémas restent lisibles', () => {
    const w = defaultWorld();
    (w.castle.rooms.salon.items as unknown[]).push({ uid: 3, id: 'sofa', x: 1.26, y: 2, color: 'rose', rot: 9, variant: '<script>', on: -4 });
    const back = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    const it = back.castle.rooms.salon.items[0];
    expect(it.x).toBe(1.5);
    expect(it.rot).toBe(1);
    expect(it.variant).toBeUndefined();
    expect(it.on).toBeUndefined();
  });
});

describe('couleurs', () => {
  it('couleurs en attente : aucun effet tant qu\'elles ne sont pas appliquées, un seul pas d\'annulation', () => {
    const { world, ctx } = mk();
    ops.clearUndo();
    const before = { ...world.castle.rooms.salon };
    expect(world.castle.rooms.salon.wall).toBe(before.wall);
    const r = ops.applyColors(ctx, 'salon', { wall: 'sky', floor: 'noir', curtain: 'gold' });
    expect(r.ok && r.changed).toBe(3);
    expect(world.castle.rooms.salon).toMatchObject({ wall: 'sky', floor: 'noir', curtain: 'gold' });
    expect(ops.undoDepth('salon')).toBe(1);
    expect(ops.undo(ctx, 'salon').ok).toBe(true);
    expect(world.castle.rooms.salon.wall).toBe(before.wall);
    expect(ops.applyColors(ctx, 'salon', { wall: 'nope' }).ok).toBe(false);
    expect(world.castle.rooms.salon.wall).toBe(before.wall);
  });
});
