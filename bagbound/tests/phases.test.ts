import { describe, expect, it } from "vitest";
import { createCombat } from "../src/engine";
import { P, makeContent, stepTo } from "./helpers";

const content = makeContent(
  [
    { id: "big_punch", name: "Coup de colère", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 20 }] },
    { id: "heavy", name: "Masse", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 30 }] },
  ],
  [
    {
      id: "boss",
      name: "Boss",
      hp: 100,
      rank: "boss",
      bag: [{ item: "jab", pos: [0, 0] }],
      phases: [{ hpBelow: 0.5, mode: "replace", name: "Colère", shield: 10, bag: [{ item: "big_punch", pos: [0, 0] }] }],
    },
    {
      id: "boss_add",
      name: "Boss",
      hp: 100,
      rank: "boss",
      bag: [{ item: "jab", pos: [0, 0] }],
      // volontairement dans le désordre : le moteur trie par seuil décroissant
      phases: [
        { hpBelow: 0.25, mode: "add", bag: [{ item: "punch", pos: [2, 0] }] },
        { hpBelow: 0.75, mode: "add", bag: [{ item: "punch", pos: [1, 0] }] },
      ],
    },
  ],
);

const fight = (enemy: string, hpMul?: number) =>
  createCombat(content, { seed: 1, player: { hp: 1000, bag: [P("heavy")] }, enemies: [{ id: enemy, hpMul }] }, { record: true });

describe("boss à phases", () => {
  it("replace : le sac est remplacé au seuil, avec bouclier", () => {
    const s = fight("boss");
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(70);
    expect(s.combatants[1].items.map((i) => i.def.id)).toEqual(["jab"]);
    stepTo(s, 20);
    expect(s.combatants[1].hp).toBe(40);
    expect(s.combatants[1].items.map((i) => i.def.id)).toEqual(["big_punch"]);
    expect(s.combatants[1].shield).toBe(10);
    expect(s.events.some((e) => e.type === "phase" && e.name === "Colère")).toBe(true);
    stepTo(s, 30);
    // le nouveau sac repart de zéro : premier coup 1 s après le changement
    expect(s.combatants[0].hp).toBe(1000 - 1 - 1 - 20);
  });

  it("add : les objets s'ajoutent, les phases suivent l'ordre des seuils", () => {
    const s = fight("boss_add");
    stepTo(s, 10); // 70 % -> phase 0,75
    expect(s.combatants[1].items.map((i) => i.def.id)).toEqual(["jab", "punch"]);
    expect(s.combatants[1].phasesDone).toBe(1);
    stepTo(s, 30); // 10 % -> phase 0,25
    expect(s.combatants[1].items.map((i) => i.def.id)).toEqual(["jab", "punch", "punch"]);
    expect(s.combatants[1].phasesDone).toBe(2);
  });

  it("hpMul (difficulté) multiplie les PV de l'ennemi", () => {
    const s = fight("boss", 1.5);
    expect(s.combatants[1].hp).toBe(150);
    expect(s.combatants[1].maxHp).toBe(150);
  });
});
