import { describe, expect, it } from "vitest";
import { ContentError } from "../src/content/loader";
import { loadContentFromDir, loadRecipesFromDir, loadRunDataFromDir } from "../src/content/node";
import { loadRecipes } from "../src/content/recipes";
import { runCombat, type Vec } from "../src/engine";
import { Bag } from "../src/game/bag";
import { botRun } from "../src/game/bot";
import { applyFusion, findFusions, unfuse } from "../src/game/fusion";
import * as R from "../src/game/run";

const content = loadContentFromDir();
const recipes = loadRecipesFromDir(content);
const rd = loadRunDataFromDir(content);
const rect = (w: number, h: number): Vec[] => Array.from({ length: w * h }, (_, i) => [i % w, Math.floor(i / w)] as Vec);
const names = (bag: Bag) => findFusions(bag, recipes).map((f) => f.recipe.id).sort();

describe("recettes", () => {
  it("le fichier est valide et couvre les deux types", () => {
    expect(recipes.length).toBeGreaterThanOrEqual(15);
    expect(recipes.some((r) => r.kind === "upgrade")).toBe(true);
    expect(recipes.some((r) => r.inputs.some((i) => i.tag))).toBe(true);
    expect(recipes.some((r) => r.inputs.length >= 3)).toBe(true);
  });

  it("recette invalide refusée", () => {
    try {
      loadRecipes([{ id: "x", inputs: [{ item: "nope" }, { tag: "Licorne" }], result: "rien" }, { id: "y", kind: "upgrade", inputs: [{ item: "banana" }, { item: "torch" }], result: "torch" }], content);
      expect.unreachable();
    } catch (e) {
      const m = (e as ContentError).issues.join("\n");
      expect(m).toMatch(/objet inconnu « nope »/);
      expect(m).toMatch(/tag inconnu « Licorne »/);
      expect(m).toMatch(/résultat inconnu « rien »/);
      expect(m).toMatch(/identiques/);
    }
  });
});

describe("fusions", () => {
  it("deux objets identiques qui se touchent -> tier supérieur", () => {
    const bag = new Bag(content, rect(4, 3));
    bag.add("wooden_sword", [0, 0]);
    bag.add("wooden_sword", [1, 0]);
    expect(names(bag)).toEqual(["oak_sword"]);
    const far = new Bag(content, rect(4, 3));
    far.add("wooden_sword", [0, 0]);
    far.add("wooden_sword", [2, 0]);
    expect(names(far)).toEqual([]);
  });

  it("recette par tag : arme + objet de feu", () => {
    const bag = new Bag(content, rect(4, 3));
    bag.add("iron_sword", [0, 0]);
    bag.add("torch", [1, 0]);
    expect(names(bag)).toContain("flame_sword");
    const bag2 = new Bag(content, rect(4, 3));
    bag2.add("rusty_dagger", [0, 0]);
    bag2.add("torch", [1, 0]);
    expect(names(bag2)).toContain("ember_dagger");
  });

  it("fusion à 3 : un groupe connexe suffit (pas besoin que tout se touche)", () => {
    const bag = new Bag(content, rect(4, 1));
    bag.add("vampire_fang", [0, 0]);
    bag.add("bone_trophy", [1, 0]); // 2 cases : (1,0) (2,0)
    bag.add("rage_amulet", [3, 0]);
    expect(names(bag)).toContain("predator_collar");
    const split = new Bag(content, rect(5, 2));
    split.add("vampire_fang", [0, 0]);
    split.add("bone_trophy", [1, 0]);
    split.add("rage_amulet", [4, 1]);
    expect(names(split)).not.toContain("predator_collar");
  });

  it("fusion à 4 : l'élixir prismatique", () => {
    const bag = new Bag(content, rect(2, 2));
    bag.add("health_potion", [0, 0]);
    bag.add("poison_flask", [1, 0]);
    bag.add("frost_flask", [0, 1]);
    bag.add("antidote", [1, 1]);
    expect(names(bag)).toContain("prism_elixir");
  });

  it("le résultat prend la place libérée et garde ses ingrédients", () => {
    const bag = new Bag(content, rect(3, 3));
    bag.add("iron_sword", [0, 0]);
    bag.add("torch", [1, 0]);
    bag.add("banana", [1, 1]); // occupe (1,1) (2,1) (2,2)
    const opt = findFusions(bag, recipes).find((f) => f.recipe.id === "flame_sword")!;
    const r = applyFusion(bag, opt);
    expect(r.placed).toBe(true);
    expect(r.entry.item).toBe("flame_sword");
    expect(r.entry.fusedFrom).toEqual(["iron_sword", "torch"]);
    expect(bag.isValid()).toBe(true);
    expect(bag.cellsAt(r.entry, r.entry.pos!).every(([x]) => x <= 1)).toBe(true);
  });

  it("résultat trop grand : il part dans la réserve", () => {
    // deux boucliers 2x2 en escalier : ni 2x3 ni 3x2 ne rentre dans ces 8 cases
    const stairs: Vec[] = [[0, 0], [1, 0], [0, 1], [1, 1], [1, 2], [2, 2], [1, 3], [2, 3]];
    const bag = new Bag(content, stairs);
    bag.add("wooden_shield", [0, 0]);
    bag.add("wooden_shield", [1, 2]);
    const r = applyFusion(bag, findFusions(bag, recipes).find((f) => f.recipe.id === "tower_shield")!);
    expect(r.placed).toBe(false);
    expect(r.entry.pos).toBeNull();
    expect(bag.placed()).toEqual([]);
  });

  it("défusion : les ingrédients reviennent en réserve", () => {
    const bag = new Bag(content, rect(4, 3));
    bag.add("wooden_sword", [0, 0]);
    bag.add("wooden_sword", [1, 0]);
    const { entry } = applyFusion(bag, findFusions(bag, recipes)[0]);
    expect(unfuse(bag, entry.uid)).toEqual(["wooden_sword", "wooden_sword"]);
    expect(bag.entries.map((e) => [e.item, e.pos])).toEqual([
      ["wooden_sword", null],
      ["wooden_sword", null],
    ]);
  });
});

describe("extensions de sac", () => {
  const cells: Vec[] = [[0, 0], [1, 0], [0, 1], [1, 1]];

  it("se pose au bord, touche le sac, devient des cases", () => {
    const bag = new Bag(content, cells, [4, 3]);
    const ext = bag.add("bag_patch_2"); // 2 cases horizontales
    expect(bag.check(ext.uid, [0, 2]).ok).toBe(true);
    expect(bag.check(ext.uid, [1, 1]).ok).toBe(false); // chevauche le sac
    expect(bag.check(ext.uid, [3, 0]).ok).toBe(false); // ne touche pas
    expect(bag.move(ext.uid, [0, 2])).toBe(true);
    expect(bag.entries).toEqual([]);
    expect(bag.cells).toHaveLength(6);
    expect(bag.hasCell(1, 2)).toBe(true);
  });

  it("taille max respectée, cases sauvegardées, extension posée jamais rechargée en place", () => {
    const bag = new Bag(content, cells, [3, 2]);
    const ext = bag.add("bag_patch_2");
    expect(bag.check(ext.uid, [2, 0], 1).ok).toBe(true); // verticale à droite : 3 x 2
    expect(bag.check(ext.uid, [0, 2]).ok).toBe(false); // 2 x 3 : trop haut
    expect(bag.extensionSlots().map(([x]) => x).sort()).toEqual([-1, -1, 2, 2]); // ni au-dessus ni au-dessous : trop haut
    bag.move(ext.uid, [2, 0], 1);
    const back = Bag.fromJSON(content, cells, JSON.parse(JSON.stringify(bag.toJSON())), [3, 2]);
    expect(back.cells).toHaveLength(6);
    const odd = Bag.fromJSON(content, cells, { entries: [{ item: "bag_patch_1", rot: 0, pos: [2, 0] }] });
    expect(odd.entries[0].pos).toBeNull();
    expect(odd.cells).toHaveLength(4);
  });

  it("le rangement automatique ignore les extensions", async () => {
    const { autoPlace } = await import("../src/game/autoplace");
    const bag = new Bag(content, cells);
    bag.add("bag_patch_1");
    expect(autoPlace(bag)).toBe(0);
  });
});

describe("potions : remplissage", () => {
  it("l'alambic remplit la bouteille vide voisine pendant le combat", () => {
    const r = runCombat(content, {
      seed: 1,
      player: { hp: 100, bag: [{ item: "alembic", pos: [0, 0], ref: "a" }, { item: "empty_bottle", pos: [1, 0], charges: 0, ref: "b" }] },
      enemies: [{ hp: 400, bag: [] }],
    });
    const bottle = r.playerBagAfter.find((p) => p.ref === "b")!;
    expect(bottle.item).toBe("health_potion");
    expect(bottle.charges).toBe(1);
  });
});

describe("run et phase 4", () => {
  it("la forme du sac et les fusions survivent au combat", () => {
    const run = R.newRun(content, rd, "vagabond", 3);
    expect(run.bag.cells).toHaveLength(13);
    run.bag.entries[0].fusedFrom = ["rusty_dagger", "rusty_dagger"];
    run.bag.cells!.push([0, 0]);
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    R.finishCombat(run, content, rd, runCombat(content, R.combatSetup(run)));
    expect(run.bag.cells).toHaveLength(14);
    expect(run.bag.entries.find((e) => e.item === "wooden_sword")!.fusedFrom).toEqual(["rusty_dagger", "rusty_dagger"]);
  });

  it("boutique : défusion payante et remplissage des bouteilles", () => {
    const run = R.newRun(content, rd, "vagabond", 3);
    run.phase = "shop";
    run.pending = { kind: "shop", stock: [], rerolls: 0 };
    run.gold = 20;
    run.bag.entries.push({ item: "oak_sword", rot: 0, pos: null, fusedFrom: ["wooden_sword", "wooden_sword"] });
    run.bag.entries.push({ item: "empty_bottle", rot: 0, pos: null, charges: 0 }, { item: "empty_bottle", rot: 0, pos: null, charges: 0 });
    R.unfuseAt(run, rd, run.bag.entries.findIndex((e) => e.item === "oak_sword"));
    expect(run.gold).toBe(20 - rd.rules.shop.unfuseCost);
    expect(run.bag.entries.filter((e) => e.item === "wooden_sword")).toHaveLength(3);
    expect(() => R.unfuseAt(run, rd, 0)).toThrow(/fusion/);
    expect(R.emptyBottles(run, rd)).toBe(2);
    R.refillBottles(run, rd);
    expect(run.gold).toBe(20 - rd.rules.shop.unfuseCost - 2 * rd.rules.refill.cost);
    expect(run.bag.entries.filter((e) => e.item === "health_potion" && e.charges === 1)).toHaveLength(2);
  });

  it("le bot sait fusionner et reste reproductible", () => {
    const a = botRun(content, rd, "vagabond", 21, recipes);
    expect(botRun(content, rd, "vagabond", 21, recipes).run).toEqual(a.run);
  });
});
