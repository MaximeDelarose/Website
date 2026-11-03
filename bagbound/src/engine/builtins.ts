// Modules de base : effets, cibles, déclencheurs, statuts et modificateurs.
// Chaque module s'enregistre ici ; pour ajouter un effet ailleurs, appeler
// registerEffect(...) depuis n'importe quel fichier.

import {
  itemStatusRegistry,
  statusRegistry,
  registerEffect,
  registerItemStatus,
  registerModifier,
  registerStatus,
  registerTarget,
  registerTrigger,
  type EffectContext,
} from "./registry";
import {
  activeItems,
  addItemStatus,
  addShield,
  addStacks,
  dealDamage,
  transformItem,
  effectValue,
  emit,
  frontEnemy,
  healCombatant,
  matchesFilter,
  opponents,
} from "./ops";
import { pick, pickN } from "./rng";
import type { Combatant, EffectDef, ItemInstance } from "./types";

// ---------------------------------------------------------------------------
// Cibles
// ---------------------------------------------------------------------------

function enemyOf(ctx: EffectContext): Combatant | undefined {
  if (ctx.forcedEnemy && ctx.forcedEnemy.alive) return ctx.forcedEnemy;
  return frontEnemy(ctx.state, ctx.owner);
}

function itemPool(items: ItemInstance[], effect: EffectDef, chargeableOnly: boolean, exclude?: ItemInstance | null): ItemInstance[] {
  return items.filter(
    (i) => !i.removed && i !== exclude && matchesFilter(i.def, effect.filter) && (!chargeableOnly || i.cooldownMs !== null),
  );
}

registerTarget({ name: "self", kind: "combatant", resolve: (ctx) => (ctx.owner.alive ? [ctx.owner] : []) });
registerTarget({
  name: "enemy",
  kind: "combatant",
  resolve: (ctx) => {
    const e = enemyOf(ctx);
    return e ? [e] : [];
  },
});
registerTarget({
  name: "randomEnemy",
  kind: "combatant",
  resolve: (ctx) => {
    if (ctx.forcedEnemy && ctx.forcedEnemy.alive) return [ctx.forcedEnemy];
    const e = pick(ctx.state, opponents(ctx.state, ctx.owner));
    return e ? [e] : [];
  },
});
registerTarget({ name: "allEnemies", kind: "combatant", resolve: (ctx) => opponents(ctx.state, ctx.owner) });

registerTarget({ name: "thisItem", kind: "item", resolve: (ctx) => (ctx.item && !ctx.item.removed ? [ctx.item] : []) });
registerTarget({
  name: "adjacent",
  kind: "item",
  resolve: (ctx, effect, o) => {
    if (!ctx.item) return [];
    const ids = new Set(ctx.item.neighbors);
    return itemPool(activeItems(ctx.owner), effect, o.chargeableOnly).filter((i) => ids.has(i.uid));
  },
});
registerTarget({
  name: "randomAllyItem",
  kind: "item",
  resolve: (ctx, effect, o) => pickN(ctx.state, itemPool(activeItems(ctx.owner), effect, o.chargeableOnly, ctx.item), effect.count ?? 1),
});
registerTarget({
  name: "allAllyItems",
  kind: "item",
  resolve: (ctx, effect, o) => itemPool(activeItems(ctx.owner), effect, o.chargeableOnly),
});
registerTarget({
  name: "randomEnemyItem",
  kind: "item",
  resolve: (ctx, effect, o) => {
    const e = enemyOf(ctx);
    if (!e) return [];
    return pickN(ctx.state, itemPool(activeItems(e), effect, o.chargeableOnly), effect.count ?? 1);
  },
});
registerTarget({
  name: "allEnemyItems",
  kind: "item",
  resolve: (ctx, effect, o) => opponents(ctx.state, ctx.owner).flatMap((e) => itemPool(activeItems(e), effect, o.chargeableOnly)),
});

// ---------------------------------------------------------------------------
// Effets sur les combattants
// ---------------------------------------------------------------------------

registerEffect({
  type: "damage",
  targetKind: "combatant",
  defaultTarget: "enemy",
  requires: ["value"],
  apply(ctx, effect, targets) {
    const v = effectValue(ctx, effect);
    for (const t of targets) dealDamage(ctx.state, { source: ctx.owner, target: t, amount: v, item: ctx.item, kind: "damage", depth: ctx.depth });
  },
});

registerEffect({
  type: "shield",
  targetKind: "combatant",
  defaultTarget: "self",
  requires: ["value"],
  apply(ctx, effect, targets) {
    const v = effectValue(ctx, effect);
    for (const t of targets) addShield(ctx.state, t, v, ctx.item);
  },
});

registerEffect({
  type: "heal",
  targetKind: "combatant",
  defaultTarget: "self",
  requires: ["value"],
  apply(ctx, effect, targets) {
    const v = effectValue(ctx, effect);
    for (const t of targets) healCombatant(ctx.state, t, v, ctx.item);
  },
});

for (const status of ["poison", "burn"]) {
  registerEffect({
    type: status,
    targetKind: "combatant",
    defaultTarget: "enemy",
    requires: ["value"],
    apply(ctx, effect, targets) {
      const v = effectValue(ctx, effect);
      for (const t of targets) addStacks(ctx.state, t, status, v, ctx.owner, ctx.item);
    },
  });
}

registerEffect({
  type: "purge",
  targetKind: "combatant",
  defaultTarget: "self",
  apply(ctx, effect, targets) {
    for (const t of targets) {
      for (const [id, st] of Object.entries(t.statuses)) {
        if (statusRegistry.get(id)?.negative !== true) continue;
        st.stacks = effect.value === undefined ? 0 : Math.max(0, st.stacks - effect.value);
        if (st.stacks <= 0) delete t.statuses[id];
      }
      for (const it of t.items) it.timed = it.timed.filter((s) => itemStatusRegistry.get(s.kind)?.negative !== true);
      emit(ctx.state, { type: "purge", target: t.index });
    }
  },
});

// ---------------------------------------------------------------------------
// Effets sur les objets
// ---------------------------------------------------------------------------

const ms = (seconds: number | undefined): number => Math.round((seconds ?? 0) * 1000);

registerEffect({
  type: "freeze",
  targetKind: "item",
  defaultTarget: "randomEnemyItem",
  chargeableOnly: true,
  requires: ["duration"],
  apply(ctx, effect, targets) {
    const bonus = ctx.item ? ctx.item.mods.buffs["freeze"] ?? 0 : 0;
    for (const t of targets) addItemStatus(ctx.state, t, "freeze", 0, ms((effect.duration ?? 0) + bonus));
  },
});

registerEffect({
  type: "haste",
  targetKind: "item",
  defaultTarget: "adjacent",
  chargeableOnly: true,
  requires: ["value", "duration"],
  apply(ctx, effect, targets) {
    const v = effectValue(ctx, effect);
    for (const t of targets) addItemStatus(ctx.state, t, "haste", v, ms(effect.duration));
  },
});

registerEffect({
  type: "slow",
  targetKind: "item",
  defaultTarget: "randomEnemyItem",
  chargeableOnly: true,
  requires: ["value", "duration"],
  apply(ctx, effect, targets) {
    const v = effectValue(ctx, effect);
    for (const t of targets) addItemStatus(ctx.state, t, "slow", v, ms(effect.duration));
  },
});

registerEffect({
  type: "recharge",
  targetKind: "item",
  defaultTarget: "adjacent",
  chargeableOnly: true,
  apply(ctx, effect, targets) {
    for (const t of targets) {
      if (t.cooldownMs === null) continue;
      const before = t.progressMs;
      // Jamais de déclenchement immédiat : la barre se remplit, l'objet part au
      // prochain tick de recharge. Évite les boucles infinies.
      t.progressMs = effect.full ? t.cooldownMs : Math.min(t.cooldownMs, t.progressMs + ms(effectValue(ctx, effect)));
      emit(ctx.state, { type: "recharge", item: t.uid, ms: t.progressMs - before });
    }
  },
});

registerEffect({
  type: "fill",
  targetKind: "item",
  defaultTarget: "adjacent",
  requires: ["into"],
  apply(ctx, effect, targets) {
    // remplit (transforme) les objets visés, par défaut les bouteilles vides voisines
    for (const t of targets) {
      if (t.removed || t.def.id === effect.into) continue;
      transformItem(ctx.state, t, effect.into!, effect.charges);
    }
  },
});

// ---------------------------------------------------------------------------
// Statuts
// ---------------------------------------------------------------------------

/** Dégâts sur la durée paramétrés par rules.statuses[id]. */
function registerDot(id: string): void {
  registerStatus({
    id,
    negative: true,
    onTick(state, c, st, rules) {
      const r = rules.statuses[id];
      if (!r) return;
      st.timerMs += rules.tickMs;
      if (st.timerMs < r.intervalMs) return;
      st.timerMs -= r.intervalMs;
      const source = st.source === null ? null : state.combatants[st.source];
      const amount = st.stacks * r.damagePerStack;
      st.stacks = Math.max(0, st.stacks - r.decay);
      if (st.stacks <= 0) delete c.statuses[id];
      dealDamage(state, { source, target: c, amount, item: null, kind: id, ignoreShield: r.ignoreShield, depth: 0 });
    },
  });
}
registerDot("poison");
registerDot("burn");

registerItemStatus({ id: "freeze", blocksCharge: true, negative: true, stacking: "add-duration" });
registerItemStatus({ id: "haste", speed: (v) => v, negative: false, stacking: "refresh-same-value" });
registerItemStatus({ id: "slow", speed: (v) => -v, negative: true, stacking: "refresh-same-value" });

// ---------------------------------------------------------------------------
// Modificateurs statiques
// ---------------------------------------------------------------------------

registerModifier({ type: "haste", apply: (mods, m) => (mods.haste += m.value) });
registerModifier({
  type: "buff",
  apply: (mods, m) => {
    const stat = m.stat ?? "damage";
    mods.buffs[stat] = (mods.buffs[stat] ?? 0) + m.value;
  },
});

// ---------------------------------------------------------------------------
// Déclencheurs
// ---------------------------------------------------------------------------

registerTrigger({ type: "onCooldown", usesCooldown: true });
registerTrigger({ type: "onCombatStart", matches: (evt) => evt.type === "combatStart" });
registerTrigger({
  type: "onItemTrigger",
  matches: (evt, item, trig) =>
    evt.type === "itemTrigger" && evt.item !== item && evt.item.owner === item.owner && matchesFilter(evt.item.def, trig.filter),
});
registerTrigger({
  type: "onAdjacentTrigger",
  matches: (evt, item, trig) =>
    evt.type === "itemTrigger" && evt.item !== item && item.neighbors.includes(evt.item.uid) && matchesFilter(evt.item.def, trig.filter),
});
registerTrigger({
  type: "onHit",
  matches: (evt, item, trig) =>
    evt.type === "hit" &&
    evt.source.index === item.owner &&
    evt.item !== item &&
    (trig.filter === undefined || (evt.item !== null && matchesFilter(evt.item.def, trig.filter))),
});
registerTrigger({
  type: "onDamaged",
  matches: (evt, item) => evt.type === "damaged" && evt.target.index === item.owner && evt.amount > 0,
});
registerTrigger({
  type: "onLowHP",
  defaultMax: 1,
  matches: (evt, item, trig, state) =>
    evt.type === "hpChanged" &&
    evt.target.index === item.owner &&
    evt.target.hp > 0 &&
    evt.target.hp <= (trig.threshold ?? state.rules.lowHpThreshold) * evt.target.maxHp,
});
registerTrigger({
  type: "onKill",
  matches: (evt, item) => evt.type === "kill" && evt.killer !== null && evt.killer.index === item.owner,
});
