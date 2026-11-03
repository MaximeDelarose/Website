// Boucle de combat déterministe à pas fixe.
// Une partie = (seed + build joueur + build(s) ennemi(s) + actions) => résultat
// reproductible au bit près.

import "./builtins";
import { statusRegistry } from "./registry";
import { normalizeSeed } from "./rng";
import { hashState } from "./hash";
import {
  dealDamage,
  dispatch,
  emit,
  fireItem,
  frontEnemy,
  instantiateItem,
  isChargeBlocked,
  itemSpeed,
  recomputeLayout,
  removeItem,
} from "./ops";
import { effectRegistry } from "./registry";
import type {
  CombatAction,
  Combatant,
  CombatantSetup,
  CombatResult,
  CombatSetup,
  CombatState,
  Content,
  EffectDef,
  ItemInstance,
  Placement,
  Rules,
  RulesMs,
} from "./types";

export interface CombatOptions {
  /** Garder le journal d'événements (rendu, replays, tests). Coûteux pour les simulations en masse. */
  record?: boolean;
}

const sec = (s: number): number => Math.round(s * 1000);

export function rulesToMs(r: Rules): RulesMs {
  const statuses: RulesMs["statuses"] = {};
  for (const [id, d] of Object.entries(r.statuses)) {
    statuses[id] = {
      intervalMs: sec(d.interval),
      damagePerStack: d.damagePerStack,
      decay: d.decay,
      ignoreShield: d.ignoreShield,
      maxStacks: d.maxStacks,
    };
  }
  return {
    tickMs: sec(r.tick),
    maxTriggerDepth: r.maxTriggerDepth,
    maxFiresPerItemPerTick: r.maxFiresPerItemPerTick,
    speedMin: r.speed.min,
    speedMax: r.speed.max,
    minCooldownMs: sec(r.minCooldown),
    freezeMaxMs: sec(r.freezeMax),
    potionLockoutMs: sec(r.potionLockout),
    lowHpThreshold: r.lowHpThreshold,
    suddenDeath: {
      startMs: sec(r.suddenDeath.start),
      intervalMs: sec(r.suddenDeath.interval),
      baseDamage: r.suddenDeath.baseDamage,
      growth: r.suddenDeath.growth,
    },
    maxDurationMs: sec(r.maxDuration),
    statuses,
  };
}

function makeCombatant(
  state: CombatState,
  index: number,
  side: Combatant["side"],
  s: { id: string; name: string; hp: number; maxHp: number; bag: Placement[]; phases: Combatant["phases"]; rank: string },
): Combatant {
  const c: Combatant = {
    index,
    side,
    id: s.id,
    name: s.name,
    hp: s.hp,
    maxHp: s.maxHp,
    shield: 0,
    statuses: {},
    items: [],
    alive: s.hp > 0,
    phases: [...s.phases].sort((a, b) => b.hpBelow - a.hpBelow),
    phasesDone: 0,
    rank: s.rank,
  };
  state.combatants.push(c);
  c.items = s.bag.map((p) => instantiateItem(state, index, p));
  recomputeLayout(c);
  return c;
}

function enemySetup(content: Content, s: CombatantSetup) {
  const def = s.id !== undefined ? content.enemies[s.id] : undefined;
  if (s.id !== undefined && !def) throw new Error(`Ennemi inconnu : ${s.id}`);
  const baseHp = s.hp ?? def?.hp;
  if (baseHp === undefined) throw new Error("Ennemi sans PV");
  const hp = Math.max(1, Math.round(baseHp * (s.hpMul ?? 1)));
  return {
    id: s.id ?? "custom",
    name: s.name ?? def?.name ?? "Ennemi",
    hp,
    maxHp: s.maxHp !== undefined ? Math.round(s.maxHp * (s.hpMul ?? 1)) : hp,
    bag: s.bag ?? def?.bag ?? [],
    phases: s.phases ?? def?.phases ?? [],
    rank: def?.rank ?? "mob",
  };
}

const sortActions = (a: CombatAction[]): CombatAction[] =>
  a.map((x, i) => [x, i] as const).sort((p, q) => p[0].tick - q[0].tick || p[1] - q[1]).map((p) => ({ ...p[0] }));

export function createCombat(content: Content, setup: CombatSetup, opts: CombatOptions = {}): CombatState {
  if (setup.enemies.length < 1) throw new Error("Il faut au moins un ennemi");
  const actions = sortActions(setup.actions ?? []);
  const state: CombatState = {
    content,
    rules: rulesToMs(content.rules),
    seed: normalizeSeed(setup.seed),
    rngState: normalizeSeed(setup.seed),
    tick: 0,
    timeMs: 0,
    started: false,
    combatants: [],
    outcome: null,
    pending: actions,
    actionLog: actions.map((a) => ({ ...a })),
    record: opts.record === true,
    events: [],
    uidCounter: 0,
    retired: [],
    suddenDeathTimerMs: 0,
    suddenDeathCount: 0,
  };
  const p = setup.player;
  makeCombatant(state, 0, "player", {
    id: p.id ?? "player",
    name: p.name ?? "Joueur",
    hp: p.hp,
    maxHp: p.maxHp ?? p.hp,
    bag: p.bag,
    phases: [],
    rank: "player",
  });
  setup.enemies.forEach((e, i) => makeCombatant(state, i + 1, "enemy", enemySetup(content, e)));
  return state;
}

/** Ajoute une action manuelle (UI en direct). Appliquée au début du prochain tick au plus tôt. */
export function queueAction(state: CombatState, a: Omit<CombatAction, "tick"> & { tick?: number }): CombatAction {
  const action: CombatAction = { ...a, tick: Math.max(a.tick ?? state.tick + 1, state.tick + 1) };
  let i = state.pending.length;
  while (i > 0 && state.pending[i - 1].tick > action.tick) i--;
  state.pending.splice(i, 0, action);
  state.actionLog.push({ ...action });
  return action;
}

function reject(state: CombatState, item: string, reason: string): void {
  emit(state, { type: "actionRejected", item, reason });
}

/** Effets d'un lancer : throwEffects, sinon les effets de l'objet retournés vers l'ennemi. */
function throwEffectsOf(item: ItemInstance): EffectDef[] {
  if (item.def.throwEffects) return item.def.throwEffects;
  return item.def.effects.map((e) => {
    const h = effectRegistry.get(e.type);
    return { ...e, target: h?.targetKind === "item" ? "randomEnemyItem" : "enemy" };
  });
}

function applyAction(state: CombatState, a: CombatAction): void {
  const c = state.combatants[a.combatant];
  const item = c?.items.find((i) => i.uid === a.item);
  if (!c || !c.alive || !item || item.removed) return reject(state, a.item, "missing");
  if (!item.def.manual) return reject(state, a.item, "notManual");
  if (state.timeMs < item.lockoutUntilMs) return reject(state, a.item, "lockout");

  if (a.type === "drink") {
    if (item.charges !== null && item.charges <= 0) return reject(state, a.item, "empty");
    item.lockoutUntilMs = state.timeMs + state.rules.potionLockoutMs;
    emit(state, { type: "drink", item: item.uid, owner: c.index });
    fireItem(state, item, 0, "drink");
    return;
  }

  const target = a.target !== undefined ? state.combatants[a.target] : frontEnemy(state, c);
  if (!target || !target.alive || target.side === c.side) return reject(state, a.item, "badTarget");
  item.lockoutUntilMs = state.timeMs + state.rules.potionLockoutMs;
  emit(state, { type: "throw", item: item.uid, owner: c.index, target: target.index });
  const effects = throwEffectsOf(item);
  if (item.charges !== null && item.charges > 0) {
    // Potion pleine : on lance une dose (une charge), la bouteille reste.
    fireItem(state, item, 0, "throw", { effects, forcedEnemy: target });
  } else {
    // Plus de charge (ou objet sans charges) : c'est l'objet lui-même qui part.
    fireItem(state, item, 0, "throw", { effects, forcedEnemy: target, ignoreCharges: true });
    if (!item.removed) removeItem(state, item);
  }
}

function checkEnd(state: CombatState): void {
  if (state.outcome) return;
  const playerAlive = state.combatants[0].alive;
  const enemiesAlive = state.combatants.some((c) => c.side === "enemy" && c.alive);
  if (playerAlive && enemiesAlive) return;
  state.outcome = !playerAlive && !enemiesAlive ? "draw" : playerAlive ? "win" : "loss";
  emit(state, { type: "end", outcome: state.outcome });
}

/** Avance la simulation d'un tick. */
export function stepCombat(state: CombatState): void {
  if (state.outcome) return;
  const R = state.rules;

  if (!state.started) {
    state.started = true;
    emit(state, { type: "start" });
    dispatch(state, { type: "combatStart" }, 0);
    checkEnd(state);
    if (state.outcome) return;
  }

  state.tick++;
  state.timeMs += R.tickMs;
  for (const c of state.combatants) for (const it of c.items) it.firesThisTick = 0;

  // 1. Actions manuelles prévues pour ce tick
  while (state.pending.length && state.pending[0].tick <= state.tick) applyAction(state, state.pending.shift()!);

  // 2. Statuts des combattants (poison, brûlure…), dans l'ordre d'enregistrement
  for (const c of state.combatants) {
    for (const [id, h] of statusRegistry) {
      const st = c.statuses[id];
      if (c.alive && st && st.stacks > 0) h.onTick(state, c, st, R);
    }
  }

  // 3. Statuts temporaires des objets (gel, haste, slow)
  for (const c of state.combatants) {
    for (const it of c.items) {
      if (it.timed.length === 0) continue;
      for (const t of it.timed) t.remainingMs -= R.tickMs;
      it.timed = it.timed.filter((t) => t.remainingMs > 0);
    }
  }

  // 4. Barres de cooldown : on remplit tout, puis on déclenche en alternant
  //    le camp qui commence (équité sur les déclenchements simultanés).
  const ready: ItemInstance[][] = [[], []];
  for (const c of state.combatants) {
    if (!c.alive) continue;
    for (const it of c.items) {
      if (it.removed || it.cooldownMs === null || isChargeBlocked(it)) continue;
      if (it.charges !== null && it.charges <= 0) continue;
      it.progressMs += Math.round(R.tickMs * itemSpeed(state, it));
      if (it.progressMs >= it.cooldownMs) ready[c.side === "player" ? 0 : 1].push(it);
    }
  }
  // Les objets prêts au même tick frappent tous, même si leur porteur tombe
  // pendant la résolution (coups simultanés).
  const order = state.tick % 2 === 1 ? [...ready[0], ...ready[1]] : [...ready[1], ...ready[0]];
  for (const it of order) {
    if (it.removed || it.cooldownMs === null) continue;
    it.progressMs = Math.max(0, Math.min(it.progressMs - it.cooldownMs, it.cooldownMs - 1));
    fireItem(state, it, 0, "cooldown", { simultaneous: true });
  }

  // 5. Mort subite
  if (state.timeMs > R.suddenDeath.startMs) {
    state.suddenDeathTimerMs += R.tickMs;
    if (state.suddenDeathTimerMs >= R.suddenDeath.intervalMs) {
      state.suddenDeathTimerMs -= R.suddenDeath.intervalMs;
      state.suddenDeathCount++;
      const amount = R.suddenDeath.baseDamage + R.suddenDeath.growth * (state.suddenDeathCount - 1);
      emit(state, { type: "suddenDeath", amount });
      for (const c of state.combatants) {
        if (c.alive) dealDamage(state, { source: null, target: c, amount, item: null, kind: "suddenDeath", ignoreShield: true, depth: 0 });
      }
    }
  }

  // 6. Fin
  checkEnd(state);
  if (!state.outcome && state.timeMs >= R.maxDurationMs) {
    state.outcome = "draw";
    emit(state, { type: "end", outcome: "draw" });
  }
}

export function playerBagAfter(state: CombatState): Placement[] {
  return state.combatants[0].items
    .filter((i) => !i.removed)
    .map((i) => {
      const p: Placement = { item: i.def.id, pos: [i.pos[0], i.pos[1]], rot: i.rot };
      if (i.mirror) p.mirror = true;
      if (i.def.charges !== null) p.charges = i.charges;
      if (i.ref !== undefined) p.ref = i.ref;
      return p;
    });
}

export function combatResult(state: CombatState): CombatResult {
  const [player, ...enemies] = state.combatants;
  return {
    outcome: state.outcome ?? "draw",
    ticks: state.tick,
    seconds: state.timeMs / 1000,
    player: { hp: player.hp, maxHp: player.maxHp },
    enemies: enemies.map((e) => ({ id: e.id, hp: e.hp, maxHp: e.maxHp })),
    playerBagAfter: playerBagAfter(state),
    itemStats: allItems(state).map((i) => ({ uid: i.uid, owner: i.owner, item: i.def.id, stats: i.stats })),
    hash: hashState(state),
    events: state.events,
    actions: state.actionLog,
  };
}

/** Tous les objets ayant participé au combat (transformés, lancés et remplacés compris). */
function allItems(state: CombatState): ItemInstance[] {
  return [...state.combatants.flatMap((c) => c.items), ...state.retired];
}

/** Simule un combat complet, sans rendu. */
export function runCombat(content: Content, setup: CombatSetup, opts: CombatOptions = {}): CombatResult {
  const state = createCombat(content, setup, opts);
  while (!state.outcome) stepCombat(state);
  return combatResult(state);
}
