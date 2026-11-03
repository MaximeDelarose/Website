import { describe, expect, it } from "vitest";
import { dealDamage, effectValue, healCombatant, registerEffect, registerTrigger, runCombat } from "../src/engine";
import { P, makeContent } from "./helpers";

// Un nouvel effet et un nouveau déclencheur, ajoutés sans toucher au cœur.
registerEffect({
  type: "lifesteal",
  targetKind: "combatant",
  defaultTarget: "enemy",
  requires: ["value"],
  apply(ctx, effect, targets) {
    for (const t of targets) {
      const dealt = dealDamage(ctx.state, { source: ctx.owner, target: t, amount: effectValue(ctx, effect), item: ctx.item, kind: "damage", depth: ctx.depth });
      healCombatant(ctx.state, ctx.owner, dealt, ctx.item);
    }
  },
});
registerTrigger({
  type: "onEnemyShield",
  matches: (evt, item) => evt.type === "damaged" && evt.target.index !== item.owner && evt.kind === "damage",
});

describe("registres extensibles", () => {
  it("un effet enregistré à part est validé par le chargeur et utilisable", () => {
    const content = makeContent([
      { id: "leech", name: "Sangsue", shape: [[0, 0]], tags: ["Animal"], cooldown: 1, effects: [{ type: "lifesteal", value: 4 }] },
    ]);
    const r = runCombat(content, { seed: 1, player: { hp: 50, maxHp: 100, bag: [P("leech")] }, enemies: [{ hp: 8, bag: [] }] });
    expect(r.outcome).toBe("win");
    expect(r.player.hp).toBe(58);
  });

  it("un déclencheur enregistré à part fonctionne", () => {
    const content = makeContent([
      { id: "echo", name: "Écho", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onEnemyShield" }], effects: [{ type: "heal", value: 1 }] },
    ]);
    const r = runCombat(content, { seed: 1, player: { hp: 50, maxHp: 100, bag: [P("echo"), P("punch", 1, 0)] }, enemies: [{ hp: 10, bag: [] }] });
    expect(r.player.hp).toBe(51); // le 1er coup déclenche l'écho, le 2e tue (pas d'événement "damaged" sur un mort)
  });
});
