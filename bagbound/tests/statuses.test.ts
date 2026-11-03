import { describe, expect, it } from "vitest";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent([
  { id: "venom", name: "Venin", shape: [[0, 0]], tags: ["Poison"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "poison", value: 3 }] },
  { id: "ember", name: "Braise", shape: [[0, 0]], tags: ["Feu"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "burn", value: 3 }] },
  { id: "wall", name: "Mur", shape: [[0, 0]], tags: ["Armure"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "shield", value: 50 }] },
  { id: "antidote", name: "Antidote", shape: [[0, 0]], tags: ["Potion"], charges: 3, manual: true, effects: [{ type: "purge" }] },
  { id: "half_antidote", name: "Tisane", shape: [[0, 0]], tags: ["Potion"], charges: 3, manual: true, effects: [{ type: "purge", value: 2 }] },
  { id: "frost", name: "Givre", shape: [[0, 0]], tags: ["Glace"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "freeze", duration: 3 }] },
  { id: "poison_hit", name: "Dard", shape: [[0, 0]], tags: ["Poison"], cooldown: 1, effects: [{ type: "poison", value: 1 }] },
]);

describe("statuts", () => {
  it("poison : dégâts par stack chaque seconde, ignore le bouclier, ne décroît pas", () => {
    const s = duel(content, { player: [P("venom")], enemy: [P("wall")], enemyHp: 100 });
    stepTo(s, 9);
    expect(s.combatants[1].hp).toBe(100);
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(97);
    expect(s.combatants[1].shield).toBe(50);
    stepTo(s, 20);
    expect(s.combatants[1].hp).toBe(94);
    expect(s.combatants[1].statuses.poison.stacks).toBe(3);
  });

  it("brûlure : toutes les 0,5 s, perd 1 stack à chaque fois", () => {
    const s = duel(content, { player: [P("ember")], enemyHp: 100 });
    stepTo(s, 5);
    expect(s.combatants[1].hp).toBe(97);
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(95);
    stepTo(s, 15);
    expect(s.combatants[1].hp).toBe(94);
    expect(s.combatants[1].statuses.burn).toBeUndefined();
    stepTo(s, 30);
    expect(s.combatants[1].hp).toBe(94);
  });

  it("la brûlure est absorbée par le bouclier", () => {
    const s = duel(content, { player: [P("ember")], enemy: [P("wall")], enemyHp: 100 });
    stepTo(s, 15);
    expect(s.combatants[1].hp).toBe(100);
    expect(s.combatants[1].shield).toBe(44);
  });

  it("les stacks s'additionnent", () => {
    const s = duel(content, { player: [P("poison_hit")], enemyHp: 100 });
    stepTo(s, 30);
    expect(s.combatants[1].statuses.poison.stacks).toBe(3);
  });

  it("purge : retire poison/brûlure et le gel des objets du porteur", () => {
    const s = duel(content, {
      player: [P("antidote"), P("punch", 1, 0)],
      enemy: [P("venom"), P("ember", 1, 0), P("frost", 2, 0)],
      actions: [{ tick: 2, type: "drink", combatant: 0, item: "0:0" }],
    });
    stepTo(s, 1);
    expect(s.combatants[0].statuses.poison.stacks).toBe(3);
    expect(s.combatants[0].items[1].timed).toHaveLength(1);
    stepTo(s, 2);
    expect(s.combatants[0].statuses).toEqual({});
    expect(s.combatants[0].items[1].timed).toHaveLength(0);
  });

  it("purge partielle (value)", () => {
    const s = duel(content, {
      player: [P("half_antidote")],
      enemy: [P("venom")],
      actions: [{ tick: 2, type: "drink", combatant: 0, item: "0:0" }],
    });
    stepTo(s, 2);
    expect(s.combatants[0].statuses.poison.stacks).toBe(1);
  });
});
