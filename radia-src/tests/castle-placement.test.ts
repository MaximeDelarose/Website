import { describe, it, expect } from 'vitest';
import { defaultWorld, type PlacedItem, type World } from '../src/save/schema';
import { FURNITURE_ALL, furnitureOf, SHOP_ORDER } from '../src/data/world/furniture';
import { geo } from '../src/ui/screens/world/castle/geometry';
import * as P from '../src/ui/screens/world/castle/placement';

const pi = (uid: number, id: string, x: number, y: number, extra: Partial<PlacedItem> = {}): PlacedItem => ({ uid, id, x, y, color: 'cream', ...extra });
const def = (id: string) => furnitureOf(id)!;

describe('catégories de placement', () => {
  it('chaque meuble a une catégorie, une boutique et une orientation cohérentes', () => {
    for (const f of Object.values(FURNITURE_ALL)) {
      expect(['floor', 'wall', 'ceiling', 'window', 'rug', 'surface']).toContain(f.place);
      expect(SHOP_ORDER).toContain(f.shop);
      if (f.place === 'surface') expect(f.onKinds.length).toBeGreaterThan(0);
      if (f.place === 'window') expect(f.layer).toBeTruthy();
      if (f.orient === 'full') expect(['floor']).toContain(f.place);
    }
  });
  it('affectations demandées', () => {
    expect(def('chandelier').place).toBe('ceiling');
    expect(def('pendant').place).toBe('ceiling');
    expect(def('painting').place).toBe('wall');
    expect(def('mirror-wall').place).toBe('wall');
    expect(def('sheer-curtain').place).toBe('window');
    expect(def('rug-rect').place).toBe('rug');
    expect(def('red-carpet').place).toBe('rug');
    expect(def('cushion').place).toBe('surface');
    expect(def('bed-royal').place).toBe('floor');
    expect(def('sofa').place).toBe('floor');
  });
  it('orientations vraies pour lit, canapé, fauteuil, table, commode, étagère, bureau, banc', () => {
    for (const id of ['bed-royal', 'bed-kid', 'sofa', 'armchair', 'coffee-table', 'dresser', 'bookshelf', 'desk', 'bench']) expect(def(id).orient).toBe('full');
  });
});

describe('emprise et rotation', () => {
  it('3×2 devient 2×3 au quart de tour, retrouve 3×2 au demi-tour', () => {
    const d = def('bed-royal');
    expect(P.footprint(d, 0)).toEqual({ w: 3, d: 2 });
    expect(P.footprint(d, 1)).toEqual({ w: 2, d: 3 });
    expect(P.footprint(d, 2)).toEqual({ w: 3, d: 2 });
    expect(P.footprint(d, 3)).toEqual({ w: 2, d: 3 });
    expect(P.nextRot(d, 3)).toBe(0);
  });
  it('un objet symétrique ne change pas d\'emprise ; un tapis plat pivote en 2 vues', () => {
    expect(P.footprint(def('plant-pot'), 1)).toEqual({ w: 1, d: 1 });
    expect(P.allowedRots(def('rug-rect'))).toEqual([0, 1]);
    expect(P.footprint(def('rug-rect'), 1)).toEqual({ w: 2, d: 3 });
    expect(P.canRotate(def('chandelier'))).toBe(false);
  });
  it('rotation d\'un meuble posé : emprise recalculée, reste dans la pièce', () => {
    const items = [pi(1, 'bed-royal', 5, 0)];
    const c = P.rotated('bedroom', items, 1)!;
    expect(c.rot).toBe(1);
    expect(c.x + 2).toBeLessThanOrEqual(8);
    expect(P.validate('bedroom', items, c, [1]).ok).toBe(true);
  });
  it('rotation impossible quand il n\'y a pas la place', () => {
    const bed = pi(1, 'bed-royal', 0, 0);
    const walls = [bed, pi(2, 'wardrobe', 3, 0), pi(3, 'wardrobe', 0, 2)];
    const c = P.rotated('bedroom', walls, 1);
    // 2×3 en (0,0) recouvre l'armoire du dessous : décalé ailleurs ou null, mais jamais invalide
    if (c) expect(P.validate('bedroom', walls, c, [1]).ok).toBe(true);
  });
});

describe('sol et collisions', () => {
  it('bornes de la grille', () => {
    expect(P.validate('salon', [], { id: 'sofa', x: 5, y: 0, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', [], { id: 'sofa', x: 6, y: 0, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', [], { id: 'sofa', x: -0.5, y: 0, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', [], { id: 'sofa', x: 0, y: 5.5, rot: 0 }).ok).toBe(false);
  });
  it('deux meubles ne se superposent pas, demi-case acceptée', () => {
    const items = [pi(1, 'sofa', 0, 0)];
    expect(P.validate('salon', items, { id: 'armchair', x: 2.5, y: 0, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', items, { id: 'armchair', x: 3, y: 0, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', items, { id: 'coffee-table', x: 0, y: 2, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', items, { id: 'coffee-table', x: 0, y: 1.5, rot: 0 }).ok).toBe(false);
  });
  it('la rotation fait tourner l\'emprise dans la collision', () => {
    const items = [pi(1, 'sofa', 0, 0)];
    expect(P.validate('salon', items, { id: 'armchair', x: 3, y: 0, rot: 0 }).ok).toBe(true);
    // tourné d'un quart de tour, le canapé n'occupe plus que 2 cases de large mais 3 de profondeur
    expect(P.validate('salon', [pi(1, 'sofa', 0, 0, { rot: 1 })], { id: 'armchair', x: 2, y: 0, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', [pi(1, 'sofa', 0, 0, { rot: 1 })], { id: 'armchair', x: 1, y: 2, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', items, { id: 'armchair', x: 1, y: 2, rot: 0 }).ok).toBe(true);
  });
  it('pièce interdite refusée', () => {
    expect(P.validate('garden', [], { id: 'sofa', x: 0, y: 0, rot: 0 }).ok).toBe(false);
  });
});

describe('plafond', () => {
  it('le lustre s\'accroche au plafond, jamais au sol', () => {
    const G = geo('salon');
    const ok = P.validate('salon', [], { id: 'chandelier', x: 3, y: P.ceilingDepth(G), rot: 0 });
    expect(ok.ok).toBe(true);
    // une « position de sol » quelconque est refusée
    expect(P.validate('salon', [], { id: 'chandelier', x: 3, y: 5, rot: 0 }).ok).toBe(false);
    // la cible de glisser force le plafond, même doigt au sol
    const t = P.resolveTarget('salon', [], 'chandelier', 0, { x: G.grid.x + 3 * G.cell, y: G.grid.y + 5 * G.cell });
    expect(t.check.ok).toBe(true);
    expect(t.cand.y).toBe(P.ceilingDepth(G));
    expect(P.layerOf(def('chandelier'), undefined)).toBe('ceiling');
  });
  it('deux luminaires de plafond ne se chevauchent pas', () => {
    const G = geo('salon');
    const items = [pi(1, 'chandelier', 3, P.ceilingDepth(G))];
    expect(P.validate('salon', items, { id: 'pendant', x: 4, y: P.ceilingDepth(G), rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', items, { id: 'pendant', x: 5, y: P.ceilingDepth(G), rot: 0 }).ok).toBe(true);
  });
});

describe('mur', () => {
  it('un tableau se colle au mur, hauteur libre, hors fenêtre', () => {
    const G = geo('salon');
    expect(G.block).toBeTruthy();
    expect(P.validate('salon', [], { id: 'painting', x: 0.5, y: 1, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', [], { id: 'painting', x: 0.5, y: 2, rot: 0 }).ok).toBe(true); // hauteur libre
    expect(P.validate('salon', [], { id: 'painting', x: 0.5, y: 0.5, rot: 0 }).ok).toBe(true);
    // sur la fenêtre : refusé
    const b = G.block!;
    expect(P.validate('salon', [], { id: 'painting', x: b.x + 0.2, y: b.y + 0.2, rot: 0 }).ok).toBe(false);
    // sous le plafond / sous la plinthe : refusé
    expect(P.validate('salon', [], { id: 'painting', x: 0.5, y: 0, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', [], { id: 'painting', x: 0.5, y: G.wallRows, rot: 0 }).ok).toBe(false);
  });
  it('pas de mur dans le jardin ; deux tableaux ne se recouvrent pas', () => {
    expect(P.validate('garden', [], { id: 'painting', x: 1, y: 1, rot: 0 }).ok).toBe(false);
    const items = [pi(1, 'painting', 0, 0.5)];
    expect(P.validate('salon', items, { id: 'mirror-wall', x: 0.5, y: 1, rot: 0 }).ok).toBe(false);
    expect(P.validate('salon', items, { id: 'mirror-wall', x: 0, y: 2, rot: 0 }).ok).toBe(true);
  });
  it('la cible de glisser colle au mur', () => {
    const G = geo('bedroom');
    const t = P.resolveTarget('bedroom', [], 'painting', 0, { x: G.grid.x + 0.7 * G.cell, y: 5 * G.cell });
    expect(t.check.ok).toBe(true);
    expect(t.cand.y).toBeLessThanOrEqual(G.wallRows);
  });
});

describe('fenêtre', () => {
  it('un seul objet par calque, rideaux compatibles seulement', () => {
    expect(P.validate('bedroom', [], { id: 'sheer-curtain', x: 0, y: 0, rot: 0 }).ok).toBe(true);
    const items = [pi(1, 'sheer-curtain', 0, 0)];
    expect(P.validate('bedroom', items, { id: 'sheer-curtain', x: 0, y: 0, rot: 0 }).ok).toBe(false);
    expect(P.validate('bedroom', items, { id: 'roman-blind', x: 0, y: 0, rot: 0 }).ok).toBe(true);
    expect(P.validate('garden', [], { id: 'sheer-curtain', x: 0, y: 0, rot: 0 }).ok).toBe(false);
  });
});

describe('tapis', () => {
  it('reste au sol, sous les meubles ; deux tapis ne se superposent pas', () => {
    const items = [pi(1, 'rug-rect', 2, 2), pi(2, 'sofa', 2, 2)];
    expect(P.validate('salon', [pi(1, 'rug-rect', 2, 2)], { id: 'sofa', x: 2, y: 2, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', [pi(1, 'sofa', 2, 2)], { id: 'rug-rect', x: 2, y: 2, rot: 0 }).ok).toBe(true);
    expect(P.validate('salon', items, { id: 'rug-round', x: 3, y: 3, rot: 0 }).ok).toBe(false);
    const order = P.drawOrder([pi(2, 'sofa', 2, 2), pi(1, 'rug-rect', 2, 2)]);
    expect(order[0].id).toBe('rug-rect');
  });
});

describe('objets posés (surface)', () => {
  it('coussin sur canapé, lampe sur table de chevet ; pas de coussin sur une table', () => {
    const items = [pi(1, 'sofa', 0, 0), pi(2, 'nightstand', 4, 0)];
    expect(P.validate('bedroom', items, { id: 'cushion', x: 0.5, y: 0.5, rot: 0, on: 1 }).ok).toBe(true);
    expect(P.validate('bedroom', items, { id: 'cushion', x: 4, y: 0, rot: 0, on: 2 }).ok).toBe(false);
    expect(P.validate('bedroom', items, { id: 'lamp-table', x: 4, y: 0, rot: 0, on: 2 }).ok).toBe(true);
  });
  it('doit rester sur le plateau et ne pas se superposer', () => {
    const items = [pi(1, 'coffee-table', 0, 0), pi(2, 'candles', 0, 0, { on: 1 })];
    expect(P.validate('salon', items, { id: 'flower-vase', x: 0.5, y: 0, rot: 0, on: 1 }).ok).toBe(false);
    expect(P.validate('salon', items, { id: 'flower-vase', x: 1, y: 0, rot: 0, on: 1 }).ok).toBe(true);
    expect(P.validate('salon', items, { id: 'flower-vase', x: 1.5, y: 0, rot: 0, on: 1 }).ok).toBe(false); // déborde du plateau
  });
  it('un objet purement posé ne va pas au sol ; un objet mixte oui', () => {
    expect(P.validate('bedroom', [], { id: 'cushion', x: 1, y: 1, rot: 0 }).ok).toBe(false);
    expect(P.validate('bedroom', [], { id: 'candles', x: 1, y: 1, rot: 0 }).ok).toBe(true);
  });
  it('la cible de glisser repère le support sous le doigt', () => {
    const G = geo('salon');
    const items = [pi(1, 'sofa', 2, 3)];
    const lift = def('sofa').host!.lift;
    const px = { x: G.grid.x + 3 * G.cell, y: G.grid.y + 3.5 * G.cell - lift * G.cell };
    const t = P.resolveTarget('salon', items, 'cushion', 0, px);
    expect(t.host?.uid).toBe(1);
    expect(t.check.ok).toBe(true);
    const away = P.resolveTarget('salon', items, 'cushion', 0, { x: G.grid.x + 0.2 * G.cell, y: G.grid.y + 0.2 * G.cell });
    expect(away.check.ok).toBe(false);
  });
  it('un objet posé est dessiné juste après son support', () => {
    const items = [pi(3, 'cushion', 0.5, 0.5, { on: 1 }), pi(2, 'armchair', 6, 0), pi(1, 'sofa', 0, 0)];
    const ids = P.drawOrder(items).map((i) => i.uid);
    expect(ids.indexOf(3)).toBeGreaterThan(ids.indexOf(1));
  });
});

describe('aimantation et grille fine', () => {
  it('demi-cases', () => {
    expect(P.snap(1.26)).toBe(1.5);
    expect(P.snap(1.24)).toBe(1);
    const G = geo('salon');
    const t = P.resolveTarget('salon', [], 'plant-pot', 0, { x: G.grid.x + 2.78 * G.cell, y: G.grid.y + 2.2 * G.cell });
    expect(t.cand.x % 0.5).toBe(0);
    expect(t.cand.y % 0.5).toBe(0);
  });
  it('s\'aimante contre un voisin et contre le mur', () => {
    const G = geo('salon');
    const items = [pi(1, 'sofa', 2, 2)];
    // un fauteuil approché à ~0,2 case du bord droit du canapé se colle à lui
    const px = { x: G.grid.x + (5 + 0.2 + 1) * G.cell, y: G.grid.y + 3 * G.cell };
    const t = P.resolveTarget('salon', items, 'armchair', 0, px);
    expect(t.cand.x).toBe(5);
    expect(t.check.ok).toBe(true);
    const wall = P.resolveTarget('salon', [], 'armchair', 0, { x: G.grid.x - 40, y: G.grid.y + 3 * G.cell });
    expect(wall.cand.x).toBe(0);
  });
  it('nearestValid pousse un meuble vers la place libre la plus proche', () => {
    const items = [pi(1, 'sofa', 2, 2)];
    const c = P.nearestValid('salon', items, { id: 'armchair', x: 3, y: 2, rot: 0 }, [])!;
    expect(P.validate('salon', items, c).ok).toBe(true);
  });
  it('defaultSpot trouve une place libre pour chaque catégorie', () => {
    const items: PlacedItem[] = [pi(1, 'sofa', 2, 3)];
    for (const id of ['armchair', 'painting', 'chandelier', 'sheer-curtain', 'rug-rect', 'cushion', 'candles']) {
      const c = P.defaultSpot('salon', items, id);
      expect(c, id).toBeTruthy();
      expect(P.validate('salon', items, c!).ok, id).toBe(true);
    }
    expect(P.defaultSpot('salon', [], 'cushion')).toBeNull(); // pas de support
  });
});

describe('ordre d\'affichage', () => {
  it('tapis, murs, meubles du fond vers l\'avant, plafond', () => {
    const G = geo('salon');
    const items = [
      pi(1, 'sofa', 0, 4), pi(2, 'armchair', 4, 0), pi(3, 'rug-round', 1, 2), pi(4, 'painting', 1, 1),
      pi(5, 'chandelier', 3, P.ceilingDepth(G)),
    ];
    expect(P.drawOrder(items).map((i) => i.id)).toEqual(['rug-round', 'painting', 'armchair', 'sofa', 'chandelier']);
  });
});

describe('monde par défaut', () => {
  it('chaque pièce a une géométrie cohérente', () => {
    const w: World = defaultWorld();
    for (const r of Object.keys(w.castle.rooms)) {
      const G = geo(r as never);
      expect(G.cell).toBeGreaterThan(40);
      expect(G.grid.x + G.grid.w).toBeLessThanOrEqual(G.W + 1);
      expect(G.grid.y + G.grid.h).toBeLessThanOrEqual(G.H + 1);
      expect(G.wallRows).toBeGreaterThan(3);
    }
  });
});
