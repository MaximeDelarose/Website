import { describe, expect, it } from "vitest";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent([
  { id: "drum", name: "Tambour", shape: [[0, 0]], tags: ["Outil"], triggers: [{ type: "onItemTrigger", filter: { tag: "Arme" } }], effects: [{ type: "damage", value: 1 }] },
  { id: "herb", name: "Herbe", shape: [[0, 0]], tags: ["Nourriture"], cooldown: 1, effects: [{ type: "heal", value: 1 }] },
  { id: "torch", name: "Torche", shape: [[0, 0]], tags: ["Feu"], triggers: [{ type: "onAdjacentTrigger", filter: { tag: "Arme" } }], effects: [{ type: "burn", value: 1 }] },
  { id: "fang", name: "Croc", shape: [[0, 0]], tags: ["Bijou"], triggers: [{ type: "onHit" }], effects: [{ type: "heal", value: 1 }] },
  { id: "thorns", name: "Épines", shape: [[0, 0]], tags: ["Armure"], triggers: [{ type: "onDamaged" }], effects: [{ type: "damage", value: 2 }] },
  { id: "panic", name: "Panique", shape: [[0, 0]], tags: ["Bijou"], triggers: [{ type: "onLowHP" }], effects: [{ type: "shield", value: 100 }] },
  { id: "trophy", name: "Trophée", shape: [[0, 0]], tags: ["Bijou"], triggers: [{ type: "onKill" }], effects: [{ type: "heal", value: 10 }] },
  { id: "starter", name: "Cor", shape: [[0, 0]], tags: ["Outil"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "damage", value: 3 }] },
  { id: "echo_a", name: "Écho A", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onItemTrigger" }], effects: [{ type: "damage", value: 1 }] },
  { id: "echo_b", name: "Écho B", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onItemTrigger" }], effects: [{ type: "damage", value: 1 }] },
  { id: "coin", name: "Pièce", shape: [[0, 0]], tags: ["Bijou"], triggers: [{ type: "onItemTrigger", chance: 0.5 }], effects: [{ type: "damage", value: 1 }] },
  { id: "rapid", name: "Rafale", shape: [[0, 0]], tags: ["Arme"], cooldown: 0.3, effects: [{ type: "damage", value: 1 }] },
  { id: "spark", name: "Étincelle", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onItemTrigger", icd: 1 }], effects: [{ type: "damage", value: 1 }] },
  { id: "big_hit", name: "Gros coup", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 15 }] },
]);

const item = (s: ReturnType<typeof duel>, c: number, id: string) => s.combatants[c].items.find((i) => i.def.id === id)!;

describe("déclencheurs", () => {
  it("onCombatStart part avant le premier tick", () => {
    const s = duel(content, { player: [P("starter")], enemyHp: 100 });
    stepTo(s, 1);
    expect(s.combatants[1].hp).toBe(97);
    stepTo(s, 50);
    expect(item(s, 0, "starter").stats.triggers).toBe(1);
  });

  it("onItemTrigger filtré par tag", () => {
    const s = duel(content, { player: [P("drum"), P("punch", 2, 0), P("herb", 4, 0)], enemyHp: 100, playerHp: 50, playerMaxHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(94); // 5 + 1, l'herbe ne compte pas
  });

  it("onAdjacentTrigger : seulement les voisins", () => {
    const near = duel(content, { player: [P("torch", 0, 0), P("punch", 1, 0)], enemyHp: 100 });
    stepTo(near, 10);
    expect(near.combatants[1].statuses.burn?.stacks).toBe(1);
    const far = duel(content, { player: [P("torch", 0, 0), P("punch", 2, 0)], enemyHp: 100 });
    stepTo(far, 10);
    expect(far.combatants[1].statuses.burn).toBeUndefined();
  });

  it("onHit : quand le porteur touche", () => {
    const s = duel(content, { player: [P("fang"), P("punch", 1, 0)], playerHp: 50, playerMaxHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[0].hp).toBe(51);
  });

  it("onDamaged : riposte", () => {
    const s = duel(content, { player: [P("thorns")], enemy: [P("jab")], enemyHp: 100 });
    stepTo(s, 10);
    expect(s.combatants[1].hp).toBe(98);
  });

  it("onLowHP ne part qu'une fois", () => {
    const s = duel(content, { player: [P("panic")], enemy: [P("big_hit")], playerHp: 40, playerMaxHp: 100 });
    stepTo(s, 9);
    expect(s.combatants[0].shield).toBe(0);
    stepTo(s, 10);
    expect(s.combatants[0].hp).toBe(25);
    expect(s.combatants[0].shield).toBe(100);
    stepTo(s, 200);
    expect(item(s, 0, "panic").stats.triggers).toBe(1);
  });

  it("onKill : à chaque ennemi tué", () => {
    const s = duel(content, {
      player: [P("trophy"), P("punch", 1, 0)],
      playerHp: 50,
      playerMaxHp: 100,
      enemies: [
        { hp: 5, bag: [] },
        { hp: 5, bag: [] },
      ],
    });
    stepTo(s, 100);
    expect(s.outcome).toBe("win");
    expect(item(s, 0, "trophy").stats.triggers).toBe(2);
    expect(s.combatants[0].hp).toBe(70);
  });

  it("boucle de déclencheurs bornée (profondeur et plafond par tick)", () => {
    const s = duel(content, { player: [P("echo_a"), P("echo_b", 1, 0), P("punch", 2, 0)], enemyHp: 10000 });
    stepTo(s, 10);
    const a = item(s, 0, "echo_a").stats.triggers;
    const b = item(s, 0, "echo_b").stats.triggers;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(3);
    expect(b).toBeLessThanOrEqual(3);
    expect(s.tick).toBe(10);
  });

  it("chance : environ une fois sur deux, de façon reproductible", () => {
    const run = () => {
      const s = duel(content, { player: [P("coin"), P("jab", 1, 0)], enemyHp: 100000, seed: 77 });
      stepTo(s, 4000);
      return item(s, 0, "coin").stats.triggers;
    };
    const n = run();
    expect(n).toBeGreaterThan(400 * 0.4);
    expect(n).toBeLessThan(400 * 0.6);
    expect(run()).toBe(n);
  });

  it("icd : délai minimal entre deux déclenchements", () => {
    const s = duel(content, { player: [P("spark"), P("rapid", 1, 0)], enemyHp: 100000 });
    stepTo(s, 100); // 10 s, la rafale part toutes les 0,3 s
    expect(item(s, 0, "rapid").stats.triggers).toBe(33);
    // 0,3 · 1,5 · 2,7 · 3,9 · 5,1 · 6,3 · 7,5 · 8,7 · 9,9 (premier tir de rafale après 1 s d'icd)
    expect(item(s, 0, "spark").stats.triggers).toBe(9);
  });
});
