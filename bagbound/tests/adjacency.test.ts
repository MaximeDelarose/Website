import { describe, expect, it } from "vitest";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent([
  { id: "whetstone", name: "Pierre", shape: [[0, 0]], tags: ["Outil"], adjacency: [{ target: { tag: "Arme" }, effect: { type: "buff", stat: "damage", value: 1 } }] },
  { id: "oil", name: "Huile", shape: [[0, 0]], tags: ["Outil"], adjacency: [{ target: { tag: "Arme" }, effect: { type: "haste", value: 0.5 } }] },
  { id: "rage", name: "Rage", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 1 }],
    adjacency: [{ target: { tag: "Arme" }, apply: "self", perNeighbor: true, effect: { type: "buff", stat: "damage", value: 1 } }] },
  { id: "lonely", name: "Solitaire", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 1 }],
    adjacency: [{ target: { tag: "Arme" }, apply: "self", effect: { type: "buff", stat: "damage", value: 4 } }] },
  { id: "punch15", name: "Coup", shape: [[0, 0]], tags: ["Arme"], cooldown: 1.5, effects: [{ type: "damage", value: 5 }] },
  { id: "banana", name: "Banane", shape: [[0, 0], [1, 0], [1, 1]], tags: ["Nourriture"] },
]);

describe("synergies d'adjacence", () => {
  it("bonus de dégâts aux voisins qui ont le tag", () => {
    const s = duel(content, { player: [P("whetstone", 0, 0), P("punch", 1, 0)], enemyHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(94);
  });

  it("pas de bonus en diagonale", () => {
    const s = duel(content, { player: [P("whetstone", 0, 0), P("punch", 1, 1)], enemyHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(95);
  });

  it("bonus de vitesse statique", () => {
    const s = duel(content, { player: [P("oil", 0, 0), P("punch15", 0, 1)], enemyHp: 100 });
    stepTo(s, 10); // 1,5 s à x1,5 = 1 s
    expect(s.combatants[1].hp).toBe(95);
  });

  it("apply self + perNeighbor : +1 par arme voisine", () => {
    const s = duel(content, { player: [P("punch", 0, 1), P("rage", 1, 1), P("punch", 2, 1), P("punch", 1, 0)], enemyHp: 1000 });
    const rage = s.combatants[0].items[1];
    expect(rage.mods.buffs.damage).toBe(3);
  });

  it("apply self sans perNeighbor : une seule fois", () => {
    const s = duel(content, { player: [P("punch", 0, 0), P("lonely", 1, 0), P("punch", 2, 0)], enemyHp: 1000 });
    expect(s.combatants[0].items[1].mods.buffs.damage).toBe(4);
  });

  it("forme non rectangulaire : la banane touche par ses trois cases", () => {
    // banane en (0,0),(1,0),(1,1) ; voisins possibles : (2,0), (1,2), (0,1)
    const s = duel(content, { player: [P("banana", 0, 0), P("punch", 2, 0), P("jab", 0, 1), P("dummy", 1, 2), P("dummy", 3, 3)] });
    const banana = s.combatants[0].items[0];
    expect(banana.neighbors).toEqual(["0:1", "0:2", "0:3"]);
  });
});

describe("cases spéciales", () => {
  it("la pointe de l'épée renforce l'objet devant elle", () => {
    // épée verticale en (0,1)-(0,3), pointe en (0,1) vers le haut => (0,0)
    const s = duel(content, { player: [P("punch", 0, 0), P("sword3", 0, 1), P("jab", 1, 1)] });
    const [front, , side] = s.combatants[0].items;
    expect(front.mods.buffs.damage).toBe(2);
    expect(side.mods.buffs.damage).toBeUndefined();
  });

  it("la rotation change la case visée", () => {
    // un quart de tour : épée horizontale (0,0)-(2,0), pointe à droite => (3,0)
    const s = duel(content, { player: [P("sword3", 0, 0, 1), P("punch", 3, 0), P("jab", 0, 1)] });
    const [, right, below] = s.combatants[0].items;
    expect(right.mods.buffs.damage).toBe(2);
    expect(below.mods.buffs.damage).toBeUndefined();
  });

  it("le bonus s'applique aux dégâts infligés", () => {
    const s = duel(content, { player: [P("punch", 0, 0), P("sword3", 0, 1)], enemyHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(100 - 7 - 5);
  });
});
