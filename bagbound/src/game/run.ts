// Boucle de run : carte, combats enchaînés (PV et charges persistants),
// butin, boutique, événements, coffres, feux de camp, boss, mort / victoire.
// Pur et déterministe (RNG de la run), sérialisable tel quel en JSON.

import type { EventDef, EventEffect, RunData } from "../content/runData";
import { nextInt, type RngHolder } from "../engine/rng";
import type { CombatResult, CombatSetup, Content, Placement } from "../engine/types";
import type { SavedBag } from "./bag";
import { generateFloor, weightedPick, type MapNode } from "./map";

export type RunPhase = "map" | "combat" | "reward" | "shop" | "event" | "campfire" | "chest" | "dead" | "won";

export interface ShopSlot {
  item: string;
  price: number;
  sold: boolean;
}

export type Pending =
  | { kind: "combat"; enemies: string[]; hpMul: number; seed: number; elite: boolean; boss: boolean; fromEvent: boolean }
  | { kind: "reward"; gold: number; choices: string[]; boss: boolean }
  | { kind: "shop"; stock: ShopSlot[]; rerolls: number }
  | { kind: "event"; id: string; result: string | null; messages: string[] }
  | { kind: "campfire" }
  | { kind: "chest"; gold: number; choices: string[] };

export interface RunStats {
  combats: number;
  elites: number;
  kills: number;
  goldEarned: number;
  nodes: number;
  /** Rencontre fatale (noms des ennemis). */
  killedBy: string[] | null;
}

export interface RunState extends RngHolder {
  v: 1;
  seed: number;
  cls: string;
  zone: number;
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  bag: SavedBag;
  map: MapNode[];
  current: string | null;
  phase: RunPhase;
  pending: Pending | null;
  seenEvents: string[];
  stats: RunStats;
}

export class RunError extends Error {}

const fail = (msg: string): never => {
  throw new RunError(msg);
};

// ---------------------------------------------------------------------------
// Création, carte
// ---------------------------------------------------------------------------

export function newRun(content: Content, rd: RunData, clsId: string, seed: number): RunState {
  const cls = content.classes[clsId] ?? fail(`Classe inconnue : ${clsId}`);
  const run: RunState = {
    v: 1,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    cls: clsId,
    zone: 0,
    floor: 0,
    hp: cls.hp,
    maxHp: cls.hp,
    gold: rd.rules.startGold,
    bag: { cells: cls.bagCells.map(([x, y]) => [x, y]), entries: cls.startingBag.map((p) => ({ item: p.item, rot: p.rot ?? 0, mirror: p.mirror, pos: [p.pos[0], p.pos[1]] })) },
    map: [],
    current: null,
    phase: "map",
    pending: null,
    seenEvents: [],
    stats: { combats: 0, elites: 0, kills: 0, goldEarned: 0, nodes: 0, killedBy: null },
  };
  run.map = generateFloor(run, rd, 0, 0);
  return run;
}

export function node(run: RunState, id: string | null): MapNode | undefined {
  return id === null ? undefined : run.map.find((n) => n.id === id);
}

/** Nœuds où l'on peut aller maintenant. */
export function reachable(run: RunState): MapNode[] {
  if (run.phase !== "map") return [];
  const cur = node(run, run.current);
  if (!cur) return run.map.filter((n) => n.row === 0);
  return cur.next.map((id) => node(run, id)!).filter(Boolean);
}

export function zoneName(run: RunState, rd: RunData): string {
  return rd.zones[run.zone]?.name ?? "";
}

// ---------------------------------------------------------------------------
// Sac
// ---------------------------------------------------------------------------

/** Placements pour le moteur (même ordre que Bag.placements()). */
export function placementsOf(bag: SavedBag): Placement[] {
  return bag.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.pos !== null)
    .map(({ e, i }) => {
      // ref = indice dans le sac : permet de retrouver l'entrée après le combat
      const p: Placement = { item: e.item, pos: [e.pos![0], e.pos![1]], rot: e.rot, ref: String(i) };
      if (e.mirror) p.mirror = true;
      if (e.charges !== undefined) p.charges = e.charges;
      return p;
    });
}

export function addToStash(run: RunState, item: string): void {
  run.bag.entries.unshift({ item, rot: 0, pos: null });
}

// ---------------------------------------------------------------------------
// Entrée dans un nœud
// ---------------------------------------------------------------------------

function lootPick(run: RunState, rd: RunData, table: string, n: number): string[] {
  const list = rd.loot[table] ?? fail(`Table inconnue : ${table}`);
  const out: string[] = [];
  const pool = list.map((e) => ({ w: e.weight, v: e.item }));
  while (out.length < n && pool.length) {
    const it = weightedPick(run, pool);
    out.push(it);
    pool.splice(
      pool.findIndex((p) => p.v === it),
      1,
    );
  }
  return out;
}

function shopStock(run: RunState, content: Content, rd: RunData): ShopSlot[] {
  const zone = rd.zones[run.zone];
  return lootPick(run, rd, zone.shopTable, rd.rules.shop.stock).map((item) => ({
    item,
    price: Math.max(1, Math.round(content.items[item].price * rd.rules.shop.priceMul)),
    sold: false,
  }));
}

export function enterNode(run: RunState, content: Content, rd: RunData, id: string): void {
  const n = reachable(run).find((x) => x.id === id) ?? fail(`Nœud inaccessible : ${id}`);
  run.current = n.id;
  run.stats.nodes++;
  switch (n.type) {
    case "combat":
    case "elite":
    case "boss":
      run.phase = "combat";
      run.pending = { kind: "combat", enemies: n.enemies ?? [], hpMul: n.hpMul ?? 1, seed: n.seed ?? 0, elite: n.type === "elite", boss: n.type === "boss", fromEvent: false };
      break;
    case "shop":
      run.phase = "shop";
      run.pending = { kind: "shop", stock: shopStock(run, content, rd), rerolls: 0 };
      break;
    case "campfire":
      run.phase = "campfire";
      run.pending = { kind: "campfire" };
      break;
    case "chest": {
      const [g0, g1] = rd.rules.chest.gold;
      run.phase = "chest";
      run.pending = { kind: "chest", gold: nextInt(run, g0, g1), choices: lootPick(run, rd, rd.zones[run.zone].chestTable, rd.rules.chest.choices) };
      break;
    }
    case "event": {
      let pool = rd.events.filter((e) => !run.seenEvents.includes(e.id));
      if (!pool.length) {
        run.seenEvents = [];
        pool = rd.events;
      }
      const ev = pool[nextInt(run, 0, pool.length - 1)];
      run.seenEvents.push(ev.id);
      run.phase = "event";
      run.pending = { kind: "event", id: ev.id, result: null, messages: [] };
      break;
    }
  }
}

/** Termine le nœud courant ; passe à l'étage suivant si c'était la dernière rangée. */
export function completeNode(run: RunState, rd: RunData): void {
  const n = node(run, run.current);
  if (n) n.done = true;
  run.phase = "map";
  run.pending = null;
  if (n && n.next.length === 0) {
    const zone = rd.zones[run.zone];
    if (run.floor + 1 < zone.floors.length) {
      run.floor++;
    } else {
      run.zone++;
      run.floor = 0;
      if (run.zone >= rd.zones.length) {
        run.phase = "won";
        return;
      }
    }
    run.map = generateFloor(run, rd, run.zone, run.floor);
    run.current = null;
  }
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function combatSetup(run: RunState): CombatSetup {
  const p = run.pending;
  if (run.phase !== "combat" || p?.kind !== "combat") fail("Pas de combat en cours");
  const c = p as Extract<Pending, { kind: "combat" }>;
  return {
    seed: c.seed,
    player: { hp: run.hp, maxHp: run.maxHp, bag: placementsOf(run.bag) },
    enemies: c.enemies.map((id) => ({ id, hpMul: c.hpMul })),
  };
}

/** Applique le résultat d'un combat : PV, sac (charges, potions vidées, objets lancés), or, butin. */
export function finishCombat(run: RunState, content: Content, rd: RunData, result: CombatResult): void {
  const p = run.pending;
  if (run.phase !== "combat" || p?.kind !== "combat") fail("Pas de combat en cours");
  const c = p as Extract<Pending, { kind: "combat" }>;
  run.stats.combats++;
  run.hp = Math.max(0, result.player.hp);
  const before = run.bag.entries;
  const stashed = before.filter((e) => e.pos === null);
  run.bag = {
    ...run.bag,
    entries: [
      ...result.playerBagAfter.map((pl) => {
        const e: SavedBag["entries"][number] = { item: pl.item, rot: pl.rot ?? 0, pos: [pl.pos[0], pl.pos[1]] };
        if (pl.mirror) e.mirror = true;
        if (pl.charges !== undefined) e.charges = pl.charges;
        // un objet fusionné garde ses ingrédients (sauf s'il s'est transformé)
        const old = pl.ref !== undefined ? before[Number(pl.ref)] : undefined;
        if (old?.fusedFrom && old.item === pl.item) e.fusedFrom = [...old.fusedFrom];
        return e;
      }),
      ...stashed,
    ],
  };
  if (result.outcome !== "win") {
    run.hp = 0;
    run.phase = "dead";
    run.pending = null;
    run.stats.killedBy = c.enemies.map((id) => content.enemies[id]?.name ?? id);
    return;
  }
  run.stats.kills += c.enemies.length;
  if (c.elite) run.stats.elites++;
  let gold = 0;
  for (const id of c.enemies) {
    const g = content.enemies[id]?.loot?.gold;
    if (g) gold += nextInt(run, g[0], Math.max(g[0], g[1]));
  }
  if (c.elite) gold += rd.rules.eliteGoldBonus;
  run.gold += gold;
  run.stats.goldEarned += gold;
  // table de butin de l'ennemi le plus fort de la rencontre
  const rank = { boss: 3, elite: 2, mob: 1 } as const;
  const top = [...c.enemies].sort((a, b) => rank[content.enemies[b].rank] - rank[content.enemies[a].rank])[0];
  const table = content.enemies[top]?.loot?.table ?? rd.zones[run.zone].chestTable;
  run.phase = "reward";
  run.pending = { kind: "reward", gold, choices: lootPick(run, rd, table, rd.rules.rewardChoices), boss: c.boss };
}

export function takeReward(run: RunState, rd: RunData, item: string | null): void {
  const p = run.pending;
  if (run.phase !== "reward" || p?.kind !== "reward") fail("Pas de butin à prendre");
  const r = p as Extract<Pending, { kind: "reward" }>;
  if (item !== null) {
    if (!r.choices.includes(item)) fail(`Objet non proposé : ${item}`);
    addToStash(run, item);
  }
  completeNode(run, rd);
}

// ---------------------------------------------------------------------------
// Boutique
// ---------------------------------------------------------------------------

function shopOf(run: RunState): Extract<Pending, { kind: "shop" }> {
  const p = run.pending;
  if (run.phase !== "shop" || p?.kind !== "shop") fail("Pas de boutique ouverte");
  return p as Extract<Pending, { kind: "shop" }>;
}

export function buy(run: RunState, slot: number): void {
  const s = shopOf(run).stock[slot] ?? fail("Emplacement vide");
  if (s.sold) fail("Déjà vendu");
  if (run.gold < s.price) fail("Pas assez d'or");
  run.gold -= s.price;
  s.sold = true;
  addToStash(run, s.item);
}

export function sellPrice(content: Content, rd: RunData, item: string): number {
  return Math.max(1, Math.floor(content.items[item].price * rd.rules.shop.sellRatio));
}

/** Vend l'objet d'indice `index` dans run.bag.entries. */
export function sell(run: RunState, content: Content, rd: RunData, index: number): void {
  shopOf(run);
  const e = run.bag.entries[index] ?? fail("Objet introuvable");
  run.gold += sellPrice(content, rd, e.item);
  run.bag.entries.splice(index, 1);
}

export function rerollCost(run: RunState, rd: RunData): number {
  return rd.rules.shop.reroll + shopOf(run).rerolls * rd.rules.shop.rerollStep;
}

export function reroll(run: RunState, content: Content, rd: RunData): void {
  const shop = shopOf(run);
  const cost = rerollCost(run, rd);
  if (run.gold < cost) fail("Pas assez d'or");
  run.gold -= cost;
  shop.rerolls++;
  shop.stock = shopStock(run, content, rd);
}

export function shopHeal(run: RunState, rd: RunData): void {
  shopOf(run);
  if (run.gold < rd.rules.shop.healCost) fail("Pas assez d'or");
  if (run.hp >= run.maxHp) fail("PV déjà au maximum");
  run.gold -= rd.rules.shop.healCost;
  run.hp = Math.min(run.maxHp, run.hp + rd.rules.shop.healAmount);
}

/** Défusion à la boutique : l'objet redevient ses ingrédients (en réserve), contre de l'or. */
export function unfuseAt(run: RunState, rd: RunData, index: number): void {
  shopOf(run);
  const e = run.bag.entries[index] ?? fail("Objet introuvable");
  if (!e.fusedFrom?.length) fail("Cet objet n'est pas une fusion");
  if (run.gold < rd.rules.shop.unfuseCost) fail("Pas assez d'or");
  run.gold -= rd.rules.shop.unfuseCost;
  run.bag.entries.splice(index, 1);
  for (const id of [...e.fusedFrom!].reverse()) addToStash(run, id);
}

export function emptyBottles(run: RunState, rd: RunData): number {
  return run.bag.entries.filter((e) => e.item === rd.rules.refill.from).length;
}

/** Remplit toutes les bouteilles vides (prix par bouteille). */
export function refillBottles(run: RunState, rd: RunData): void {
  shopOf(run);
  const n = emptyBottles(run, rd);
  if (!n) fail("Aucune bouteille vide");
  const cost = n * rd.rules.refill.cost;
  if (run.gold < cost) fail("Pas assez d'or");
  run.gold -= cost;
  for (const e of run.bag.entries) {
    if (e.item !== rd.rules.refill.from) continue;
    e.item = rd.rules.refill.into;
    e.charges = rd.rules.refill.charges;
  }
}

export function leaveShop(run: RunState, rd: RunData): void {
  shopOf(run);
  completeNode(run, rd);
}

// ---------------------------------------------------------------------------
// Feu de camp, coffre
// ---------------------------------------------------------------------------

export function campfire(run: RunState, rd: RunData, choice: "rest" | "train"): void {
  if (run.phase !== "campfire") fail("Pas de feu de camp");
  if (choice === "rest") run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * rd.rules.campfire.healPct));
  else {
    run.maxHp += rd.rules.campfire.maxHp;
    run.hp += rd.rules.campfire.maxHp;
  }
  completeNode(run, rd);
}

export function takeChest(run: RunState, rd: RunData, item: string | null): void {
  const p = run.pending;
  if (run.phase !== "chest" || p?.kind !== "chest") fail("Pas de coffre");
  const c = p as Extract<Pending, { kind: "chest" }>;
  run.gold += c.gold;
  run.stats.goldEarned += c.gold;
  if (item !== null) {
    if (!c.choices.includes(item)) fail(`Objet non proposé : ${item}`);
    addToStash(run, item);
  }
  completeNode(run, rd);
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

export function currentEvent(run: RunState, rd: RunData): EventDef | undefined {
  const p = run.pending;
  return p?.kind === "event" ? rd.events.find((e) => e.id === p.id) : undefined;
}

export function choiceAvailable(run: RunState, content: Content, choice: EventDef["choices"][number]): boolean {
  const r = choice.requires;
  if (!r) return true;
  if (r.gold !== undefined && run.gold < r.gold) return false;
  if (r.item !== undefined && !run.bag.entries.some((e) => e.item === r.item)) return false;
  if (r.tag !== undefined && !run.bag.entries.some((e) => content.items[e.item]?.tags.includes(r.tag!))) return false;
  return true;
}

function applyEventEffects(run: RunState, content: Content, rd: RunData, effects: EventEffect[], out: { messages: string[]; result: string | null; fight: string[] | null }): void {
  for (const ef of effects) {
    switch (ef.type) {
      case "gold":
        run.gold = Math.max(0, run.gold + ef.value);
        if (ef.value > 0) run.stats.goldEarned += ef.value;
        out.messages.push(`${ef.value > 0 ? "+" : ""}${ef.value} or`);
        break;
      case "hp":
        run.hp = Math.max(1, Math.min(run.maxHp, run.hp + ef.value));
        out.messages.push(`${ef.value > 0 ? "+" : ""}${ef.value} PV`);
        break;
      case "heal": {
        const before = run.hp;
        run.hp = Math.min(run.maxHp, run.hp + ef.value);
        out.messages.push(`+${run.hp - before} PV`);
        break;
      }
      case "maxHp":
        run.maxHp = Math.max(1, run.maxHp + ef.value);
        run.hp = Math.max(1, Math.min(run.maxHp, run.hp + Math.max(0, ef.value)));
        out.messages.push(`${ef.value > 0 ? "+" : ""}${ef.value} PV max`);
        break;
      case "item": {
        const [it] = lootPick(run, rd, ef.table, 1);
        if (it) {
          addToStash(run, it);
          out.messages.push(`Nouvel objet : ${content.items[it].name}`);
        }
        break;
      }
      case "addItem":
        addToStash(run, ef.item);
        out.messages.push(`Nouvel objet : ${content.items[ef.item].name}`);
        break;
      case "loseItem": {
        // on donne d'abord un objet de la réserve, sinon un objet du sac
        const order = [...run.bag.entries.keys()].sort((a, b) => (run.bag.entries[a].pos === null ? 0 : 1) - (run.bag.entries[b].pos === null ? 0 : 1));
        const idx = order.find((i) => content.items[run.bag.entries[i].item]?.tags.includes(ef.tag));
        if (idx !== undefined) {
          out.messages.push(`Objet perdu : ${content.items[run.bag.entries[idx].item].name}`);
          run.bag.entries.splice(idx, 1);
        }
        break;
      }
      case "refill": {
        let n = 0;
        for (const e of run.bag.entries) {
          if (e.item !== ef.from) continue;
          e.item = ef.into;
          e.charges = ef.charges;
          n++;
        }
        out.messages.push(`${n} bouteille(s) remplie(s)`);
        break;
      }
      case "fight":
        out.fight = [...ef.enemies];
        break;
      case "random": {
        const o = weightedPick(
          run,
          ef.outcomes.map((x) => ({ w: x.weight, v: x })),
        );
        if (o.result) out.result = o.result;
        applyEventEffects(run, content, rd, o.effects, out);
        break;
      }
    }
  }
}

export function chooseEvent(run: RunState, content: Content, rd: RunData, index: number): void {
  const p = run.pending;
  if (run.phase !== "event" || p?.kind !== "event" || p.result !== null) fail("Pas de choix à faire");
  const ev = currentEvent(run, rd) ?? fail("Événement inconnu");
  const choice = ev.choices[index] ?? fail("Choix inconnu");
  if (!choiceAvailable(run, content, choice)) fail("Choix indisponible");
  const out = { messages: [] as string[], result: choice.result ?? null, fight: null as string[] | null };
  applyEventEffects(run, content, rd, choice.effects, out);
  const ep = p as Extract<Pending, { kind: "event" }>;
  if (out.fight) {
    const floor = rd.zones[run.zone].floors[run.floor];
    run.phase = "combat";
    run.pending = { kind: "combat", enemies: out.fight, hpMul: floor.hpMul, seed: nextInt(run, 0, 2 ** 31 - 1), elite: false, boss: false, fromEvent: true };
    return;
  }
  ep.result = out.result ?? "Tu reprends ta route.";
  ep.messages = out.messages;
}

export function closeEvent(run: RunState, rd: RunData): void {
  const p = run.pending;
  if (run.phase !== "event" || p?.kind !== "event" || p.result === null) fail("Événement non résolu");
  completeNode(run, rd);
}

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------

export function serializeRun(run: RunState): string {
  return JSON.stringify(run);
}

export function parseRun(raw: string | null): RunState | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RunState;
    if (r?.v !== 1 || !Array.isArray(r.map) || !r.bag || !Array.isArray(r.bag.entries)) return null;
    return r;
  } catch {
    return null;
  }
}

