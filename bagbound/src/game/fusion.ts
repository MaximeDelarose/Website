// Fusions hors combat : objets posés qui se touchent + recette => un nouvel
// objet. Le résultat reprend la place libérée s'il y rentre, sinon il part en
// réserve. L'objet fusionné garde ses ingrédients pour la défusion.

import type { Recipe, RecipeInput } from "../content/recipes";
import { cellsAdjacent } from "../engine/geometry";
import type { ItemDef, Vec } from "../engine/types";
import type { Bag, BagEntry } from "./bag";

export interface FusionOption {
  recipe: Recipe;
  /** uids des ingrédients, dans l'ordre des entrées de la recette. */
  uids: string[];
}

export function matchesInput(def: ItemDef, inp: RecipeInput): boolean {
  if (inp.item !== undefined && def.id !== inp.item) return false;
  if (inp.tag !== undefined && !def.tags.includes(inp.tag)) return false;
  if (inp.anyTag !== undefined && !inp.anyTag.some((t) => def.tags.includes(t))) return false;
  if (inp.notTag !== undefined && def.tags.includes(inp.notTag)) return false;
  return true;
}

function connected(uids: string[], adj: Map<string, Set<string>>): boolean {
  const set = new Set(uids);
  const seen = new Set([uids[0]]);
  const stack = [uids[0]];
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of adj.get(u) ?? []) {
      if (set.has(v) && !seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen.size === set.size;
}

/** Toutes les fusions possibles dans le sac (objets posés). */
export function findFusions(bag: Bag, recipes: Recipe[], limit = 40): FusionOption[] {
  const placed = bag.placed().filter((e) => !bag.isExtension(e));
  const cells = new Map(placed.map((e) => [e.uid, bag.cellsAt(e, e.pos!)] as const));
  const adj = new Map<string, Set<string>>();
  for (const a of placed) {
    const s = new Set<string>();
    for (const b of placed) if (a !== b && cellsAdjacent(cells.get(a.uid)!, cells.get(b.uid)!)) s.add(b.uid);
    adj.set(a.uid, s);
  }
  const defs = new Map(placed.map((e) => [e.uid, bag.content.items[e.item]] as const));
  const out: FusionOption[] = [];
  const seen = new Set<string>();
  for (const recipe of recipes) {
    // ingrédients les plus précis d'abord (ids avant tags)
    const order = recipe.inputs.map((inp, i) => ({ inp, i })).sort((a, b) => (a.inp.item ? 0 : 1) - (b.inp.item ? 0 : 1));
    const chosen: string[] = new Array(recipe.inputs.length);
    const used = new Set<string>();
    const walk = (k: number): void => {
      if (out.length >= limit) return;
      if (k === order.length) {
        const uids = [...chosen];
        if (recipe.adjacency && !connected(uids, adj)) return;
        const id = `${recipe.id}|${[...uids].sort().join(",")}`;
        if (seen.has(id)) return;
        seen.add(id);
        out.push({ recipe, uids });
        return;
      }
      const { inp, i } = order[k];
      for (const e of placed) {
        if (used.has(e.uid) || !matchesInput(defs.get(e.uid)!, inp)) continue;
        // élagage : le nouvel ingrédient doit toucher un ingrédient déjà choisi (groupe connexe)
        if (recipe.adjacency && recipe.inputs.length === 2 && used.size === 1 && !adj.get(e.uid)!.has([...used][0])) continue;
        used.add(e.uid);
        chosen[i] = e.uid;
        walk(k + 1);
        used.delete(e.uid);
      }
    };
    walk(0);
  }
  return out;
}

export interface FusionResult {
  entry: BagEntry;
  /** false : le résultat ne rentrait pas, il est dans la réserve. */
  placed: boolean;
}

export function applyFusion(bag: Bag, opt: FusionOption): FusionResult {
  const ingredients = opt.uids.map((u) => bag.get(u)).filter((e): e is BagEntry => !!e && e.pos !== null);
  if (ingredients.length !== opt.recipe.inputs.length) throw new Error("Ingrédients introuvables");
  const freed = new Set(ingredients.flatMap((e) => bag.cellsAt(e, e.pos!)).map(([x, y]) => `${x},${y}`));
  const index = Math.min(...ingredients.map((e) => bag.entries.indexOf(e)));
  for (const e of ingredients) bag.remove(e.uid);
  const entry = bag.add(opt.recipe.result);
  entry.fusedFrom = ingredients.map((e) => e.item);
  // l'objet fusionné prend la place du premier ingrédient dans l'ordre du sac
  bag.entries = [...bag.entries.filter((e) => e !== entry)];
  bag.entries.splice(Math.min(index, bag.entries.length), 0, entry);
  const b = bag.bounds();
  let best: { pos: Vec; rot: number; score: number } | null = null;
  for (let rot = 0; rot < 4; rot++) {
    for (let y = b.minY; y < b.minY + b.h; y++) {
      for (let x = b.minX; x < b.minX + b.w; x++) {
        const chk = bag.check(entry.uid, [x, y], rot, false);
        if (!chk.ok) continue;
        const score = chk.cells.filter(([cx, cy]) => freed.has(`${cx},${cy}`)).length;
        if (!best || score > best.score) best = { pos: [x, y], rot, score };
      }
    }
  }
  if (best) bag.move(entry.uid, best.pos, best.rot, false);
  return { entry, placed: !!best };
}

/** Défait une fusion : l'objet disparaît, ses ingrédients vont en réserve. */
export function unfuse(bag: Bag, uid: string): string[] {
  const e = bag.get(uid);
  if (!e?.fusedFrom) return [];
  bag.remove(uid);
  const back = [...e.fusedFrom];
  for (const id of [...back].reverse()) {
    const n = bag.add(id);
    bag.entries = [n, ...bag.entries.filter((x) => x !== n)];
  }
  return back;
}
