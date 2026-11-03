// Joueur automatique simple : sert aux tests de bout en bout et aux
// simulations de runs en masse (équilibrage). Volontairement « moyen ».

import type { RunData } from "../content/runData";
import { combatResult, createCombat, queueAction, stepCombat } from "../engine/combat";
import type { CombatResult, CombatSetup, Content } from "../engine/types";
import { autoPlace } from "./autoplace";
import { Bag } from "./bag";
import * as R from "./run";

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

/** Combat headless avec un joueur qui boit ses potions de soin sous 40 % de PV. */
export function fightWithPotions(content: Content, setup: CombatSetup): CombatResult {
  const st = createCombat(content, setup);
  while (!st.outcome) {
    const p = st.combatants[0];
    if (p.alive && p.hp < p.maxHp * 0.4) {
      const potion = p.items.find(
        (i) => !i.removed && i.def.manual && (i.charges ?? 0) > 0 && i.def.effects.some((e) => e.type === "heal") && st.timeMs >= i.lockoutUntilMs,
      );
      if (potion && !st.pending.some((x) => x.item === potion.uid)) queueAction(st, { type: "drink", combatant: 0, item: potion.uid });
    }
    stepCombat(st);
  }
  return combatResult(st);
}

const value = (content: Content, id: string) => (RARITY_RANK[content.items[id].rarity] ?? 0) * 100 + content.items[id].price;

/** Range tout le sac de zéro : objets les plus précieux d'abord. */
export function repack(run: R.RunState, content: Content): void {
  const cls = content.classes[run.cls];
  const bag = Bag.fromJSON(content, cls.bagCells, run.bag);
  for (const e of bag.entries) bag.stash(e.uid);
  autoPlace(bag, (id) => !content.items[id].tags.includes("Vide") || false);
  run.bag = bag.toJSON();
}

export interface BotReport {
  run: R.RunState;
  steps: number;
}

export function botRun(content: Content, rd: RunData, cls: string, seed: number, maxSteps = 400): BotReport {
  const run = R.newRun(content, rd, cls, seed);
  let steps = 0;
  while (steps++ < maxSteps && run.phase !== "dead" && run.phase !== "won") {
    switch (run.phase) {
      case "map": {
        const opts = R.reachable(run);
        const hpPct = run.hp / run.maxHp;
        const score = (t: string) =>
          ({ campfire: hpPct < 0.5 ? 6 : 1, elite: hpPct > 0.8 ? 5 : 0, combat: 3, event: 2, chest: 4, shop: run.gold >= 8 ? 4 : 0, boss: 9 })[t] ?? 0;
        const best = [...opts].sort((a, b) => score(b.type) - score(a.type))[0];
        R.enterNode(run, content, rd, best.id);
        break;
      }
      case "combat":
        R.finishCombat(run, content, rd, fightWithPotions(content, R.combatSetup(run)));
        break;
      case "reward": {
        const p = run.pending as Extract<R.Pending, { kind: "reward" }>;
        const best = [...p.choices].sort((a, b) => value(content, b) - value(content, a))[0] ?? null;
        R.takeReward(run, rd, best);
        repack(run, content);
        break;
      }
      case "chest": {
        const p = run.pending as Extract<R.Pending, { kind: "chest" }>;
        R.takeChest(run, rd, [...p.choices].sort((a, b) => value(content, b) - value(content, a))[0] ?? null);
        repack(run, content);
        break;
      }
      case "shop": {
        const p = run.pending as Extract<R.Pending, { kind: "shop" }>;
        if (run.hp < run.maxHp * 0.5 && run.gold >= rd.rules.shop.healCost) R.shopHeal(run, rd);
        const order = p.stock.map((s, i) => [s, i] as const).sort((a, b) => value(content, b[0].item) - value(content, a[0].item));
        for (const [s, i] of order) if (!s.sold && run.gold >= s.price) R.buy(run, i);
        R.leaveShop(run, rd);
        repack(run, content);
        break;
      }
      case "campfire":
        R.campfire(run, rd, run.hp < run.maxHp * 0.7 ? "rest" : "train");
        break;
      case "event": {
        const ev = R.currentEvent(run, rd)!;
        const p = run.pending as Extract<R.Pending, { kind: "event" }>;
        if (p.result !== null) {
          R.closeEvent(run, rd);
          break;
        }
        const idx = ev.choices.findIndex((c) => R.choiceAvailable(run, content, c));
        R.chooseEvent(run, content, rd, idx);
        repack(run, content);
        break;
      }
    }
  }
  return { run, steps };
}
