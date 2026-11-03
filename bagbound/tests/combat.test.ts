import { describe, expect, it } from "vitest";
import { createCombat, runCombat, stepCombat, type CombatSetup } from "../src/engine";
import { loadContentFromDir } from "../src/content/node";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent(
  [
    { id: "ten", name: "Coup de 10", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 10 }] },
    { id: "guard", name: "Garde", shape: [[0, 0]], tags: ["Armure"], cooldown: 1, effects: [{ type: "shield", value: 5 }] },
    { id: "chaos", name: "Chaos", shape: [[0, 0]], tags: ["Magie"], cooldown: 0.7, effects: [{ type: "damage", value: 2, target: "randomEnemy" }, { type: "freeze", duration: 0.5 }] },
    { id: "lucky", name: "Chanceux", shape: [[0, 0]], tags: ["Bijou"], triggers: [{ type: "onItemTrigger", chance: 0.3 }], effects: [{ type: "poison", value: 1, target: "randomEnemy" }] },
  ],
  [],
  { suddenDeath: { start: 2, interval: 1, baseDamage: 1, growth: 1 }, maxDuration: 600 },
);

const calm = makeContent([{ id: "ten", name: "Coup de 10", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 10 }] }]);

describe("déroulement du combat", () => {
  it("coups simultanés : match nul", () => {
    const s = duel(content, { player: [P("ten")], enemy: [P("ten")], playerHp: 10, enemyHp: 10 });
    stepTo(s, 100);
    expect(s.outcome).toBe("draw");
    expect(s.tick).toBe(10);
  });

  it("mort subite : finit un combat sans dégâts", () => {
    const s = duel(content, { player: [P("guard")], enemy: [P("guard")], playerHp: 10, enemyHp: 20 });
    while (!s.outcome) stepCombat(s);
    expect(s.outcome).toBe("loss");
    // 2 s + 1+2+3+4 = 10 dégâts à 6 s
    expect(s.timeMs).toBe(6000);
    expect(s.events.filter((e) => e.type === "suddenDeath").map((e) => (e as { amount: number }).amount)).toEqual([1, 2, 3, 4]);
  });

  it("durée max : nul", () => {
    const c = makeContent([{ id: "guard", name: "Garde", shape: [[0, 0]], tags: [], cooldown: 1, effects: [{ type: "shield", value: 1 }] }], [], {
      suddenDeath: { start: 100, interval: 1, baseDamage: 1, growth: 0 },
      maxDuration: 5,
    });
    const s = duel(c, { player: [P("guard")], enemy: [P("guard")] });
    while (!s.outcome) stepCombat(s);
    expect(s.outcome).toBe("draw");
    expect(s.timeMs).toBe(5000);
  });

  it("plusieurs ennemis : le joueur frappe le premier vivant, puis le suivant", () => {
    const s = duel(calm, {
      player: [P("ten")],
      enemies: [
        { hp: 10, bag: [] },
        { hp: 25, bag: [] },
        { hp: 5, bag: [] },
      ],
    });
    stepTo(s, 10);
    expect(s.combatants.map((c) => c.hp)).toEqual([1000, 0, 25, 5]);
    stepTo(s, 30);
    expect(s.combatants.map((c) => c.hp)).toEqual([1000, 0, 5, 5]);
    while (!s.outcome) stepCombat(s);
    expect(s.outcome).toBe("win");
  });

  it("chaque ennemi a son propre sac", () => {
    const s = duel(calm, {
      player: [],
      playerHp: 100,
      enemies: [
        { hp: 10, bag: [P("jab")] },
        { hp: 10, bag: [P("punch")] },
      ],
    });
    stepTo(s, 10);
    expect(s.combatants[0].hp).toBe(94);
  });
});

describe("déterminisme", () => {
  const random: CombatSetup = {
    seed: 12345,
    player: { hp: 80, bag: [P("chaos"), P("lucky", 1, 0), P("jab", 2, 0)] },
    enemies: [
      { hp: 40, bag: [P("chaos"), P("lucky", 1, 0)] },
      { hp: 30, bag: [P("jab"), P("lucky", 1, 0)] },
      { hp: 30, bag: [P("chaos")] },
    ],
  };

  it("même entrée => même résultat, même journal, même empreinte", () => {
    const a = runCombat(content, random, { record: true });
    const b = runCombat(content, random, { record: true });
    expect(b.hash).toBe(a.hash);
    expect(b.events).toEqual(a.events);
    expect(b.ticks).toBe(a.ticks);
  });

  it("le journal d'événements n'influence pas la simulation", () => {
    const a = runCombat(content, random, { record: true });
    const b = runCombat(content, random, { record: false });
    expect(b.hash).toBe(a.hash);
    expect(b.events).toEqual([]);
  });

  it("des seeds différentes donnent des combats différents", () => {
    const hashes = new Set<string>();
    for (let seed = 0; seed < 20; seed++) hashes.add(runCombat(content, { ...random, seed }).hash);
    expect(hashes.size).toBeGreaterThan(10);
  });

  it("rejouer (seed + builds + actions) redonne le même combat", () => {
    const c = loadContentFromDir();
    const v = c.classes.vagabond;
    const setup: CombatSetup = {
      seed: 99,
      player: { hp: v.hp, bag: v.startingBag },
      enemies: [{ id: "goblin" }, { id: "spider" }, { id: "fire_imp" }],
      actions: [
        { tick: 50, type: "drink", combatant: 0, item: "0:4" },
        { tick: 80, type: "throw", combatant: 0, item: "0:4", target: 2 },
      ],
    };
    const a = runCombat(c, setup, { record: true });
    const b = runCombat(c, { ...setup, actions: a.actions }, { record: true });
    expect(b.hash).toBe(a.hash);
    expect(b.events).toEqual(a.events);
  });

  it("pas à pas = d'une traite", () => {
    const s = createCombat(content, random);
    let n = 0;
    while (!s.outcome) {
      stepCombat(s);
      n++;
    }
    expect(n).toBe(runCombat(content, random).ticks);
  });
});
