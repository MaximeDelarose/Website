import { describe, expect, it } from "vitest";
import { P, duel, makeContent, stepTo } from "./helpers";

const content = makeContent([
  { id: "start_shield", name: "Bouclier", shape: [[0, 0]], tags: ["Armure"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "shield", value: 7 }] },
  { id: "herb", name: "Herbe", shape: [[0, 0]], tags: ["Nourriture"], cooldown: 1, effects: [{ type: "heal", value: 15 }] },
  { id: "frost", name: "Givre", shape: [[0, 0]], tags: ["Glace"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "freeze", duration: 2.5 }] },
  { id: "big_frost", name: "Grand givre", shape: [[0, 0]], tags: ["Glace"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "freeze", duration: 10 }] },
  { id: "clock", name: "Horloge", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "haste", value: 1, duration: 1 }] },
  { id: "mega_clock", name: "Méga horloge", shape: [[0, 0]], tags: ["Magie"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "haste", value: 10, duration: 100 }] },
  { id: "tar", name: "Goudron", shape: [[0, 0]], tags: ["Outil"], triggers: [{ type: "onCombatStart" }], effects: [{ type: "slow", value: 0.5, duration: 10 }] },
  { id: "gear", name: "Engrenage", shape: [[0, 0]], tags: ["Outil"], cooldown: 1, effects: [{ type: "recharge", value: 0.5 }] },
  { id: "full_gear", name: "Remontoir", shape: [[0, 0]], tags: ["Outil"], cooldown: 1, effects: [{ type: "recharge", full: true }] },
  { id: "slow3", name: "Masse", shape: [[0, 0]], tags: ["Arme"], cooldown: 3, effects: [{ type: "damage", value: 1 }] },
]);

const hp = (s: ReturnType<typeof duel>, i: number) => s.combatants[i].hp;

describe("effets de base", () => {
  it("dégâts au cooldown, puis victoire", () => {
    const s = duel(content, { player: [P("punch")], enemyHp: 20 });
    stepTo(s, 9);
    expect(hp(s, 1)).toBe(20);
    stepTo(s, 10);
    expect(hp(s, 1)).toBe(15);
    stepTo(s, 100);
    expect(s.outcome).toBe("win");
    expect(s.tick).toBe(40);
  });

  it("le bouclier absorbe avant les PV", () => {
    const s = duel(content, { player: [P("punch")], enemy: [P("start_shield")], enemyHp: 20 });
    stepTo(s, 10);
    expect(s.combatants[1].shield).toBe(2);
    expect(hp(s, 1)).toBe(20);
    stepTo(s, 20);
    expect(s.combatants[1].shield).toBe(0);
    expect(hp(s, 1)).toBe(17);
  });

  it("le soin est plafonné aux PV max", () => {
    const s = duel(content, { player: [P("herb")], playerHp: 50, playerMaxHp: 60 });
    stepTo(s, 10);
    expect(hp(s, 0)).toBe(60);
  });

  it("le gel bloque la barre de l'objet", () => {
    const s = duel(content, { player: [P("frost")], enemy: [P("jab")], playerHp: 100 });
    stepTo(s, 33);
    expect(hp(s, 0)).toBe(100);
    stepTo(s, 34);
    expect(hp(s, 0)).toBe(99);
  });

  it("le gel est plafonné (freezeMax)", () => {
    const s = duel(content, { player: [P("big_frost")], enemy: [P("jab")] });
    stepTo(s, 0);
    // démarrage : appliqué à la 1re étape
    stepTo(s, 1);
    const t = s.combatants[1].items[0].timed[0];
    expect(t.kind).toBe("freeze");
    expect(t.remainingMs).toBe(4000 - 100);
  });

  it("haste temporaire accélère un objet voisin", () => {
    // horloge en (0,0), coup lent (cd 2 s) en (1,0)
    const s = duel(content, { player: [P("clock", 0, 0), P("slow_punch", 1, 0)], enemyHp: 100 });
    stepTo(s, 10);
    expect(hp(s, 1)).toBe(100);
    stepTo(s, 11);
    expect(hp(s, 1)).toBe(95);
  });

  it("la vitesse est plafonnée (speed.max)", () => {
    const s = duel(content, { player: [P("mega_clock", 0, 0), P("slow3", 1, 0)], enemyHp: 100 });
    stepTo(s, 9);
    expect(hp(s, 1)).toBe(100);
    stepTo(s, 10); // 3 s de cooldown à x3 = 1 s
    expect(hp(s, 1)).toBe(99);
  });

  it("slow ralentit un objet ennemi", () => {
    const s = duel(content, { player: [P("tar")], enemy: [P("jab")], playerHp: 100 });
    stepTo(s, 19);
    expect(hp(s, 0)).toBe(100);
    stepTo(s, 20);
    expect(hp(s, 0)).toBe(99);
  });

  it("recharge avance la barre du voisin sans déclenchement immédiat", () => {
    const s = duel(content, { player: [P("gear", 0, 0), P("slow_punch", 1, 0)], enemyHp: 100 });
    stepTo(s, 14);
    expect(hp(s, 1)).toBe(100);
    stepTo(s, 15);
    expect(hp(s, 1)).toBe(95);
  });

  it("recharge complète : l'objet part au tick suivant", () => {
    const s = duel(content, { player: [P("full_gear", 0, 0), P("slow_punch", 1, 0)], enemyHp: 100 });
    stepTo(s, 10);
    expect(hp(s, 1)).toBe(100);
    expect(s.combatants[0].items[1].progressMs).toBe(2000);
    stepTo(s, 11);
    expect(hp(s, 1)).toBe(95);
  });
});
