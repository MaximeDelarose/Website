import { describe, expect, it } from "vitest";
import { queueAction, runCombat, stepCombat } from "../src/engine";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent([
  { id: "poison_flask", name: "Fiole", shape: [[0, 0]], tags: ["Potion", "Verre", "Poison"], charges: 2, manual: true,
    effects: [{ type: "poison", value: 3 }], throwEffects: [{ type: "poison", value: 5 }], onEmpty: { transformInto: "empty_bottle" } },
  { id: "knife", name: "Couteau de lancer", shape: [[0, 0]], tags: ["Arme"], manual: true, effects: [{ type: "damage", value: 6 }] },
  { id: "tonic", name: "Tonique", shape: [[0, 0]], tags: ["Potion"], charges: 1, triggers: [{ type: "onLowHP" }],
    effects: [{ type: "heal", value: 12 }], onEmpty: { transformInto: "empty_bottle" } },
  { id: "glass_lover", name: "Verrier", shape: [[0, 0]], tags: ["Outil"], triggers: [{ type: "onItemTrigger", filter: { tag: "Potion" } }],
    effects: [{ type: "damage", value: 1 }] },
]);

const kinds = (s: ReturnType<typeof duel>) => s.events.map((e) => e.type);

describe("potions et consommables", () => {
  it("boire soigne et consomme une charge", () => {
    const s = duel(content, { player: [P("heal_potion")], playerHp: 40, playerMaxHp: 100, actions: [{ tick: 1, type: "drink", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.combatants[0].hp).toBe(55);
    expect(s.combatants[0].items[0].charges).toBe(1);
  });

  it("verrou entre deux utilisations", () => {
    const s = duel(content, {
      player: [P("heal_potion")],
      playerHp: 40,
      playerMaxHp: 100,
      actions: [
        { tick: 1, type: "drink", combatant: 0, item: "0:0" },
        { tick: 5, type: "drink", combatant: 0, item: "0:0" },
      ],
    });
    stepTo(s, 5);
    expect(s.combatants[0].hp).toBe(55);
    expect(s.events.some((e) => e.type === "actionRejected" && e.reason === "lockout")).toBe(true);
  });

  it("à 0 charge, la potion devient une bouteille vide", () => {
    const s = duel(content, {
      player: [P("heal_potion", 2, 1)],
      playerHp: 10,
      playerMaxHp: 100,
      actions: [
        { tick: 1, type: "drink", combatant: 0, item: "0:0" },
        { tick: 11, type: "drink", combatant: 0, item: "0:0" },
      ],
    });
    stepTo(s, 11);
    expect(s.combatants[0].hp).toBe(40);
    const it = s.combatants[0].items[0];
    expect(it.def.id).toBe("empty_bottle");
    expect(it.pos).toEqual([2, 1]);
    expect(it.charges).toBe(0);
    expect(kinds(s)).toContain("transform");
  });

  it("une bouteille vide ne se boit pas", () => {
    const s = duel(content, { player: [P("empty_bottle")], actions: [{ tick: 1, type: "drink", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.events.some((e) => e.type === "actionRejected" && e.reason === "empty")).toBe(true);
  });

  it("lancer une potion pleine applique son effet de lancer à l'ennemi", () => {
    const s = duel(content, { player: [P("poison_flask")], actions: [{ tick: 1, type: "throw", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.combatants[1].statuses.poison.stacks).toBe(5);
    expect(s.combatants[0].items[0].charges).toBe(1);
  });

  it("lancer une bouteille vide : dégâts de verre, la bouteille disparaît", () => {
    const s = duel(content, { player: [P("empty_bottle")], enemyHp: 50, actions: [{ tick: 1, type: "throw", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.combatants[1].hp).toBe(47);
    expect(s.combatants[0].items).toHaveLength(0);
  });

  it("lancer un objet sans charges : l'objet part (effets retournés vers l'ennemi)", () => {
    const s = duel(content, { player: [P("knife")], enemyHp: 50, actions: [{ tick: 1, type: "throw", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.combatants[1].hp).toBe(44);
    expect(s.combatants[0].items).toHaveLength(0);
  });

  it("lancer sur un ennemi précis", () => {
    const s = duel(content, {
      player: [P("empty_bottle")],
      enemies: [
        { hp: 20, bag: [] },
        { hp: 20, bag: [] },
      ],
      actions: [{ tick: 1, type: "throw", combatant: 0, item: "0:0", target: 2 }],
    });
    stepTo(s, 1);
    expect(s.combatants[1].hp).toBe(20);
    expect(s.combatants[2].hp).toBe(17);
  });

  it("objet non manuel : action refusée", () => {
    const s = duel(content, { player: [P("punch")], actions: [{ tick: 1, type: "drink", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.events.some((e) => e.type === "actionRejected" && e.reason === "notManual")).toBe(true);
  });

  it("utiliser une potion déclenche les objets qui écoutent le tag Potion", () => {
    const s = duel(content, { player: [P("heal_potion"), P("glass_lover", 1, 0)], enemyHp: 50, actions: [{ tick: 1, type: "drink", combatant: 0, item: "0:0" }] });
    stepTo(s, 1);
    expect(s.combatants[1].hp).toBe(49);
  });

  it("potion ennemie bue automatiquement sous le seuil", () => {
    const s = duel(content, { player: [P("punch")], enemy: [P("tonic")], enemyHp: 20 });
    stepTo(s, 30); // 20 -> 15 -> 10 -> 5 (<= 30 %) : +12
    expect(s.combatants[1].hp).toBe(17);
    expect(s.combatants[1].items[0].def.id).toBe("empty_bottle");
  });

  it("le sac après combat garde les charges et les bouteilles vides", () => {
    const r = runCombat(content, {
      seed: 1,
      player: { hp: 30, maxHp: 100, bag: [P("heal_potion", 0, 0), P("poison_flask", 1, 0), P("punch", 2, 0), P("empty_bottle", 3, 0)] },
      enemies: [{ hp: 30, bag: [] }],
      actions: [
        { tick: 1, type: "drink", combatant: 0, item: "0:0" },
        { tick: 11, type: "drink", combatant: 0, item: "0:0" },
        { tick: 2, type: "throw", combatant: 0, item: "0:3" },
      ],
    });
    expect(r.outcome).toBe("win");
    expect(r.playerBagAfter).toEqual([
      { item: "empty_bottle", pos: [0, 0], rot: 0, charges: 0 },
      { item: "poison_flask", pos: [1, 0], rot: 0, charges: 2 },
      { item: "punch", pos: [2, 0], rot: 0 },
    ]);
  });

  it("queueAction en direct = action prévue dans le setup", () => {
    const live = duel(content, { player: [P("heal_potion"), P("punch", 1, 0)], playerHp: 40, playerMaxHp: 100, enemy: [P("jab")], enemyHp: 60 });
    for (let i = 0; i < 7; i++) stepCombat(live);
    queueAction(live, { type: "drink", combatant: 0, item: "0:0" });
    while (!live.outcome) stepCombat(live);

    const replay = duel(content, {
      player: [P("heal_potion"), P("punch", 1, 0)],
      playerHp: 40,
      playerMaxHp: 100,
      enemy: [P("jab")],
      enemyHp: 60,
      actions: live.actionLog,
    });
    while (!replay.outcome) stepCombat(replay);
    expect(replay.events).toEqual(live.events);
    expect(live.actionLog[0].tick).toBe(8);
  });
});
