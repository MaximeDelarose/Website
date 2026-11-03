// Opérations élémentaires de la simulation, partagées par le cœur et les
// modules d'effets : dégâts, soins, statuts, déclenchement d'objets,
// distribution des événements, transformations.

import { DIRS, key, placedCells, transformSpecialCell } from "./geometry";
import {
  effectRegistry,
  itemStatusRegistry,
  modifierRegistry,
  targetRegistry,
  triggerRegistry,
  type EffectContext,
} from "./registry";
import { chance } from "./rng";
import type {
  Combatant,
  CombatEvent,
  CombatState,
  EffectDef,
  EngineEvent,
  ItemDef,
  ItemInstance,
  ModifierDef,
  Placement,
  TagFilter,
} from "./types";

type EventBody = CombatEvent extends infer E ? (E extends CombatEvent ? Omit<E, "t"> : never) : never;

export function emit(state: CombatState, e: EventBody): void {
  if (state.record) state.events.push({ t: state.tick, ...e } as CombatEvent);
}

// ---------------------------------------------------------------------------
// Camps et filtres
// ---------------------------------------------------------------------------

export function opponents(state: CombatState, c: Combatant): Combatant[] {
  return state.combatants.filter((o) => o.alive && o.side !== c.side);
}

/** Ennemi « de face » : le premier ennemi vivant (pour le joueur), le joueur sinon. */
export function frontEnemy(state: CombatState, c: Combatant): Combatant | undefined {
  return state.combatants.find((o) => o.alive && o.side !== c.side);
}

export function matchesFilter(def: ItemDef, f?: TagFilter): boolean {
  if (!f) return true;
  if (f.tag !== undefined && !def.tags.includes(f.tag)) return false;
  if (f.anyTag !== undefined && !f.anyTag.some((t) => def.tags.includes(t))) return false;
  if (f.notTag !== undefined && def.tags.includes(f.notTag)) return false;
  return true;
}

export function activeItems(c: Combatant): ItemInstance[] {
  return c.items.filter((i) => !i.removed);
}

// ---------------------------------------------------------------------------
// Vitesse et gel
// ---------------------------------------------------------------------------

export function itemSpeed(state: CombatState, item: ItemInstance): number {
  let s = 1 + item.mods.haste;
  for (const t of item.timed) {
    const h = itemStatusRegistry.get(t.kind);
    if (h?.speed) s += h.speed(t.value);
  }
  return Math.min(state.rules.speedMax, Math.max(state.rules.speedMin, s));
}

export function isChargeBlocked(item: ItemInstance): boolean {
  return item.timed.some((t) => itemStatusRegistry.get(t.kind)?.blocksCharge === true);
}

// ---------------------------------------------------------------------------
// PV, bouclier, statuts
// ---------------------------------------------------------------------------

export interface DamageOptions {
  source: Combatant | null;
  target: Combatant;
  amount: number;
  item: ItemInstance | null;
  /** "damage" pour un coup direct, sinon id du statut ("poison", "burn", "suddenDeath"…). */
  kind: string;
  ignoreShield?: boolean;
  depth: number;
}

/** Inflige des dégâts. Renvoie les dégâts réellement encaissés (PV + bouclier). */
export function dealDamage(state: CombatState, o: DamageOptions): number {
  const { target } = o;
  const amount = Math.max(0, Math.round(o.amount));
  if (!target.alive || amount <= 0) return 0;
  const absorbed = o.ignoreShield ? 0 : Math.min(target.shield, amount);
  target.shield -= absorbed;
  const hpLoss = Math.min(target.hp, amount - absorbed);
  target.hp -= hpLoss;
  if (o.item) o.item.stats.damage += absorbed + hpLoss;
  emit(state, {
    type: "damage",
    target: target.index,
    source: o.source ? o.source.index : null,
    item: o.item ? o.item.uid : null,
    kind: o.kind,
    amount: hpLoss,
    absorbed,
  });

  const next = o.depth + 1;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    emit(state, { type: "death", target: target.index, killer: o.source ? o.source.index : null });
  } else {
    checkPhases(state, target);
  }
  if (o.kind === "damage" && o.source) {
    dispatch(state, { type: "hit", source: o.source, target, item: o.item, amount: absorbed + hpLoss }, next);
  }
  if (target.alive) {
    dispatch(state, { type: "damaged", target, source: o.source, amount: absorbed + hpLoss, kind: o.kind }, next);
    if (hpLoss > 0) dispatch(state, { type: "hpChanged", target }, next);
  } else {
    dispatch(state, { type: "kill", killer: o.source, target }, next);
  }
  return absorbed + hpLoss;
}

export function healCombatant(state: CombatState, target: Combatant, amount: number, item: ItemInstance | null): number {
  if (!target.alive) return 0;
  const healed = Math.max(0, Math.min(target.maxHp - target.hp, Math.round(amount)));
  target.hp += healed;
  if (item) item.stats.heal += healed;
  if (healed > 0) emit(state, { type: "heal", target: target.index, item: item ? item.uid : null, amount: healed });
  return healed;
}

export function addShield(state: CombatState, target: Combatant, amount: number, item: ItemInstance | null): void {
  if (!target.alive) return;
  const v = Math.max(0, Math.round(amount));
  if (v <= 0) return;
  target.shield += v;
  if (item) item.stats.shield += v;
  emit(state, { type: "shield", target: target.index, item: item ? item.uid : null, amount: v });
}

export function addStacks(
  state: CombatState,
  target: Combatant,
  status: string,
  stacks: number,
  source: Combatant | null,
  item: ItemInstance | null,
): void {
  if (!target.alive) return;
  const v = Math.max(0, Math.round(stacks));
  if (v <= 0) return;
  const rule = state.rules.statuses[status];
  const max = rule ? rule.maxStacks : Infinity;
  const st = target.statuses[status] ?? { stacks: 0, timerMs: 0, source: null };
  st.stacks = Math.min(max, st.stacks + v);
  if (source) st.source = source.index;
  target.statuses[status] = st;
  if (item) item.stats.stacks[status] = (item.stats.stacks[status] ?? 0) + v;
  emit(state, { type: "status", target: target.index, status, stacks: st.stacks });
}

export function addItemStatus(state: CombatState, item: ItemInstance, kind: string, value: number, ms: number): void {
  if (item.removed || ms <= 0) return;
  const h = itemStatusRegistry.get(kind);
  if (!h) throw new Error(`Statut d'objet inconnu : ${kind}`);
  const existing = item.timed.find((t) =>
    h.stacking === "add-duration" ? t.kind === kind : t.kind === kind && t.value === value,
  );
  let cap = Infinity;
  if (kind === "freeze") cap = state.rules.freezeMaxMs;
  if (existing) {
    existing.remainingMs =
      h.stacking === "add-duration" ? Math.min(cap, existing.remainingMs + ms) : Math.max(existing.remainingMs, Math.min(cap, ms));
  } else {
    item.timed.push({ kind, value, remainingMs: Math.min(cap, ms) });
  }
  emit(state, { type: "itemStatus", item: item.uid, owner: item.owner, status: kind, value, ms });
}

// ---------------------------------------------------------------------------
// Effets
// ---------------------------------------------------------------------------

/** Valeur d'un effet, bonus statiques de l'objet compris. */
export function effectValue(ctx: EffectContext, effect: EffectDef): number {
  const base = effect.value ?? 0;
  const bonus = ctx.item ? ctx.item.mods.buffs[effect.type] ?? 0 : 0;
  return base + bonus;
}

export function applyEffect(ctx: EffectContext, effect: EffectDef): void {
  const h = effectRegistry.get(effect.type);
  if (!h) throw new Error(`Effet inconnu : ${effect.type}`);
  const tName = effect.target ?? h.defaultTarget;
  const th = targetRegistry.get(tName);
  if (!th) throw new Error(`Cible inconnue : ${tName}`);
  if (th.kind !== h.targetKind) throw new Error(`Cible ${tName} incompatible avec l'effet ${effect.type}`);
  const opts = { chargeableOnly: h.chargeableOnly === true };
  if (h.targetKind === "combatant" && th.kind === "combatant") h.apply(ctx, effect, th.resolve(ctx, effect, opts));
  else if (h.targetKind === "item" && th.kind === "item") h.apply(ctx, effect, th.resolve(ctx, effect, opts));
}

export interface FireOptions {
  effects?: EffectDef[];
  forcedEnemy?: Combatant;
  /** Déclenche même sans charge et sans en consommer (lancer d'une bouteille vide). */
  ignoreCharges?: boolean;
  /**
   * Résolution simultanée : l'objet était prêt au même tick que le coup qui a
   * tué son porteur, il frappe quand même (deux coups simultanés = match nul possible).
   */
  simultaneous?: boolean;
}

/** Déclenche un objet : applique ses effets, prévient les autres objets, consomme une charge. */
export function fireItem(state: CombatState, item: ItemInstance, depth: number, cause: string, o: FireOptions = {}): boolean {
  const owner = state.combatants[item.owner];
  if ((!owner.alive && !o.simultaneous) || item.removed) return false;
  if (item.firesThisTick >= state.rules.maxFiresPerItemPerTick) return false;
  if (!o.ignoreCharges && item.charges !== null && item.charges <= 0) return false;
  item.firesThisTick++;
  item.stats.triggers++;
  emit(state, { type: "trigger", item: item.uid, owner: owner.index, cause });
  const ctx: EffectContext = { state, owner, item, depth, forcedEnemy: o.forcedEnemy };
  for (const e of o.effects ?? item.def.effects) {
    if (!owner.alive && !o.simultaneous) break;
    applyEffect(ctx, e);
  }
  dispatch(state, { type: "itemTrigger", item }, depth + 1);
  if (!o.ignoreCharges && item.charges !== null && !item.removed) consumeCharge(state, item);
  return true;
}

// ---------------------------------------------------------------------------
// Événements -> déclencheurs
// ---------------------------------------------------------------------------

export function dispatch(state: CombatState, evt: EngineEvent, depth: number): void {
  if (depth > state.rules.maxTriggerDepth) return;
  for (const c of state.combatants) {
    if (!c.alive) continue;
    for (const item of c.items.slice()) {
      if (item.removed) continue;
      const trigs = item.def.triggers;
      for (let i = 0; i < trigs.length; i++) {
        const trig = trigs[i];
        const h = triggerRegistry.get(trig.type);
        if (!h || h.usesCooldown || !h.matches) continue;
        if (!h.matches(evt, item, trig, state)) continue;
        const rt = item.trig[i];
        const max = trig.max ?? h.defaultMax;
        if (max !== undefined && rt.fired >= max) continue;
        if (trig.icd !== undefined && state.timeMs - rt.lastMs < Math.round(trig.icd * 1000)) continue;
        if (trig.chance !== undefined && !chance(state, trig.chance)) continue;
        rt.fired++;
        rt.lastMs = state.timeMs;
        fireItem(state, item, depth, trig.type);
        if (!c.alive) break;
      }
      if (!c.alive) break;
    }
  }
}

// ---------------------------------------------------------------------------
// Objets : création, disposition, transformation
// ---------------------------------------------------------------------------

export function newUid(state: CombatState, owner: number): string {
  return `${owner}:${state.uidCounter++}`;
}

export function instantiateItem(state: CombatState, owner: number, p: Placement): ItemInstance {
  const def = state.content.items[p.item];
  if (!def) throw new Error(`Objet inconnu : ${p.item}`);
  const rot = ((p.rot ?? 0) % 4 + 4) % 4;
  const mirror = p.mirror === true;
  return {
    uid: newUid(state, owner),
    ref: p.ref,
    def,
    owner,
    pos: [p.pos[0], p.pos[1]],
    rot,
    mirror,
    cells: placedCells(def.shape, p.pos, { rot, mirror }),
    cooldownMs: def.cooldown === null ? null : Math.max(state.rules.minCooldownMs, Math.round(def.cooldown * 1000)),
    progressMs: 0,
    charges: p.charges !== undefined ? p.charges : def.charges,
    timed: [],
    mods: { haste: 0, buffs: {} },
    neighbors: [],
    trig: def.triggers.map(() => ({ fired: 0, lastMs: -1e12 })),
    firesThisTick: 0,
    lockoutUntilMs: 0,
    removed: false,
    stats: { triggers: 0, damage: 0, shield: 0, heal: 0, stacks: {} },
  };
}

function applyModifier(item: ItemInstance, m: ModifierDef): void {
  const h = modifierRegistry.get(m.type);
  if (!h) throw new Error(`Modificateur inconnu : ${m.type}`);
  h.apply(item.mods, m);
}

/** Recalcule voisins et bonus statiques (adjacence, cases spéciales) d'un combattant. */
export function recomputeLayout(c: Combatant): void {
  const items = activeItems(c);
  const at = new Map<string, ItemInstance>();
  for (const it of items) {
    it.mods = { haste: 0, buffs: {} };
    for (const [x, y] of it.cells) at.set(key(x, y), it);
  }
  for (const it of items) {
    const seen = new Set<string>();
    for (const [x, y] of it.cells) {
      for (const [dx, dy] of DIRS) {
        const o = at.get(key(x + dx, y + dy));
        if (o && o !== it && !seen.has(o.uid)) seen.add(o.uid);
      }
    }
    // ordre stable : ordre du sac
    it.neighbors = items.filter((o) => seen.has(o.uid)).map((o) => o.uid);
  }
  const byUid = new Map(items.map((i) => [i.uid, i] as const));
  for (const it of items) {
    for (const rule of it.def.adjacency) {
      const matching = it.neighbors.map((u) => byUid.get(u)!).filter((n) => matchesFilter(n.def, rule.target));
      if ((rule.apply ?? "neighbor") === "neighbor") {
        for (const n of matching) applyModifier(n, rule.effect);
      } else {
        const times = rule.perNeighbor ? matching.length : matching.length > 0 ? 1 : 0;
        for (let k = 0; k < times; k++) applyModifier(it, rule.effect);
      }
    }
    for (const sc of it.def.specialCells) {
      if (!sc.effect) continue;
      const t = transformSpecialCell(it.def.shape, sc, { rot: it.rot, mirror: it.mirror });
      const cx = t.cell[0] + it.pos[0];
      const cy = t.cell[1] + it.pos[1];
      const dirs = t.dir ? [t.dir] : DIRS;
      const hit = new Set<ItemInstance>();
      for (const [dx, dy] of dirs) {
        const o = at.get(key(cx + dx, cy + dy));
        if (o && o !== it) hit.add(o);
      }
      for (const o of items) if (hit.has(o) && matchesFilter(o.def, sc.target)) applyModifier(o, sc.effect);
    }
  }
}

export function consumeCharge(state: CombatState, item: ItemInstance): void {
  if (item.charges === null) return;
  item.charges = Math.max(0, item.charges - 1);
  if (item.charges === 0 && item.def.onEmpty) transformItem(state, item, item.def.onEmpty.transformInto);
}

export function transformItem(state: CombatState, item: ItemInstance, into: string, charges?: number): ItemInstance {
  const owner = state.combatants[item.owner];
  const fresh = instantiateItem(state, item.owner, { item: into, pos: item.pos, rot: item.rot, mirror: item.mirror, ref: item.ref, charges });
  fresh.lockoutUntilMs = item.lockoutUntilMs;
  item.removed = true;
  state.retired.push(item);
  const idx = owner.items.indexOf(item);
  owner.items[idx] = fresh;
  recomputeLayout(owner);
  emit(state, { type: "transform", item: item.uid, into, newUid: fresh.uid });
  return fresh;
}

export function removeItem(state: CombatState, item: ItemInstance): void {
  const owner = state.combatants[item.owner];
  item.removed = true;
  state.retired.push(item);
  owner.items = owner.items.filter((i) => i !== item);
  recomputeLayout(owner);
  emit(state, { type: "destroyed", item: item.uid });
}

// ---------------------------------------------------------------------------
// Phases de boss
// ---------------------------------------------------------------------------

export function checkPhases(state: CombatState, c: Combatant): void {
  while (c.alive && c.phasesDone < c.phases.length && c.hp <= c.phases[c.phasesDone].hpBelow * c.maxHp) {
    const ph = c.phases[c.phasesDone];
    c.phasesDone++;
    if (ph.mode === "replace") {
      for (const it of c.items) {
        it.removed = true;
        state.retired.push(it);
      }
      c.items = [];
    }
    for (const p of ph.bag) c.items.push(instantiateItem(state, c.index, p));
    recomputeLayout(c);
    emit(state, { type: "phase", target: c.index, phase: c.phasesDone, name: ph.name });
    if (ph.heal) healCombatant(state, c, ph.heal, null);
    if (ph.shield) addShield(state, c, ph.shield, null);
  }
}
