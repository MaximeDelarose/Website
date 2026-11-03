import { describe, expect, it } from "vitest";
import { Bag } from "../src/game/bag";
import { createCombat } from "../src/engine";
import { makeContent } from "./helpers";
import type { Vec } from "../src/engine";

const content = makeContent([
  { id: "bar2", name: "Barre", shape: [[0, 0], [1, 0]], tags: [] },
  { id: "ell", name: "L", shape: [[0, 0], [0, 1], [1, 1]], tags: [] },
]);
// sac 3 x 2 avec un trou en (2,0)
const CELLS: Vec[] = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]];

describe("modèle de sac", () => {
  it("pose, refuse hors du sac et les chevauchements", () => {
    const bag = new Bag(content, CELLS);
    const a = bag.add("bar2");
    expect(bag.move(a.uid, [0, 0])).toBe(true);
    const b = bag.add("bar2");
    expect(bag.move(b.uid, [1, 0])).toBe(false); // (2,0) n'existe pas
    expect(bag.check(b.uid, [0, 0]).bad).toEqual([[0, 0], [1, 0]]);
    expect(bag.move(b.uid, [1, 1])).toBe(true);
    expect(bag.isValid()).toBe(true);
  });

  it("rotation sur place, avec petit décalage si besoin, ou refus", () => {
    const bag = new Bag(content, CELLS);
    const a = bag.add("bar2", [1, 1]); // (1,1)-(2,1)
    expect(bag.rotate(a.uid)).toBe(true); // verticale : décalée pour rentrer
    expect(bag.cellsAt(a, a.pos!)).toEqual([[0, 0], [0, 1]].map(([x, y]) => [x + a.pos![0], y + a.pos![1]]));
    expect(bag.isValid()).toBe(true);
    const full = new Bag(content, [[0, 0], [1, 0]]);
    const b = full.add("bar2", [0, 0]);
    expect(full.rotate(b.uid)).toBe(false);
    expect(b.rot).toBe(0);
  });

  it("réserve : rotation libre, placements dans l'ordre du sac", () => {
    const bag = new Bag(content, CELLS);
    const a = bag.add("punch");
    const b = bag.add("ell", [0, 0]);
    expect(bag.rotate(a.uid)).toBe(true);
    expect(bag.stashed().map((e) => e.uid)).toEqual([a.uid]);
    bag.move(a.uid, [2, 1]);
    expect(bag.placements().map((p) => p.item)).toEqual(["punch", "ell"]);
    bag.stash(b.uid);
    expect(bag.placements()).toHaveLength(1);
  });

  it("les placements passent tels quels au moteur", () => {
    const bag = new Bag(content, CELLS);
    bag.add("ell", [0, 0], 0);
    bag.add("punch", [1, 0]);
    const s = createCombat(content, { seed: 1, player: { hp: 10, bag: bag.placements() }, enemies: [{ hp: 10, bag: [] }] });
    expect(s.combatants[0].items.map((i) => i.uid)).toEqual(["0:0", "0:1"]);
    expect(s.combatants[0].items[0].neighbors).toEqual(["0:1"]);
  });

  it("sauvegarde / chargement robuste", () => {
    const bag = new Bag(content, CELLS);
    bag.add("ell", [0, 0], 0, true);
    bag.add("punch");
    const data = JSON.parse(JSON.stringify(bag.toJSON()));
    // L en miroir : (1,0) (0,1) (1,1) ; la case (1,1) est prise
    data.entries.push({ item: "inconnu", rot: 0, pos: null }, { item: "punch", rot: 0, pos: [1, 1] });
    const back = Bag.fromJSON(content, CELLS, data);
    expect(back.entries.map((e) => [e.item, e.pos])).toEqual([
      ["ell", [0, 0]],
      ["punch", null],
      ["punch", null], // place déjà prise -> réserve
    ]);
    expect(back.entries[0].mirror).toBe(true);
    expect(Bag.fromJSON(content, CELLS, "n'importe quoi").entries).toEqual([]);
  });
});
