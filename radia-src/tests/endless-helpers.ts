/** Aides communes aux tests Endless 2.0 : joueur simulé complet (énergie, monde, améliorations, coffres). */
import { botStep } from '../src/game/merge/bot';
import { ENDLESS_DEF, createRun, placeLoot, replaceOrder } from '../src/game/merge/rules';
import type { BoardEvent, RunState } from '../src/game/merge/types';
import { defaultEconomy, defaultWorld } from '../src/save/schema';
import { addEnergy, nextEnergyIn, spendEnergy } from '../src/game/economy/economy';
import { applyEvents, applyLoot, upgradeGenerator, openChest, activeColls, resetEndless, endlessFun, collOfKind, genLevel, upgradeCost, canAfford } from '../src/game/endless';
import { GENERATORS, genKindOf } from '../src/data/items';
import type { FunState } from '../src/save/fun';

export interface SimOpts {
  seed?: number;
  actions: number;
  /** ms entre deux actions (rythme supposé). */
  /** Temps simulé entre deux actions : après une fusion (enchaînement) / après un toucher ou une livraison. */
  mergeGapMs?: number;
  tapGapMs?: number;
  gapMs?: number;
  upgrades?: boolean;
  /** Ne jamais utiliser le garde-fou du moteur ? (non : on teste aussi des bots maladroits) */
  stupid?: boolean;
  onEvents?: (ev: BoardEvent[], i: number, sim: Sim) => void;
}

export interface Sim {
  s: RunState;
  fun: FunState;
  world: ReturnType<typeof defaultWorld>;
  eco: ReturnType<typeof defaultEconomy>;
  now: number;
  actions: number;
  taps: number;
  freeTaps: number;
  energySpent: number;
  waitMs: number;
  hearts: number;
  evCount: Record<string, number>;
  miles: Record<string, { action: number; taps: number; merges: number; t: number }>;
  t0: number;
  deliveries: { action: number; tier: string }[];
  maxEmptyStreak: number;
  stuckSeen: number;
  upgradeAt: { action: number; t: number }[];
  majors: { action: number; what: string; t: number }[];
  chestRarities: Record<string, number>;
  mergeLevels: number[];
}

export function newSim(seed = 12345): Sim {
  const fun = resetEndless();
  const s = createRun(ENDLESS_DEF, 'endless', seed);
  const eco = defaultEconomy();
  const now = 1_000_000;
  eco.energyTs = now;
  return {
    s, fun, world: defaultWorld(), eco, now, actions: 0, taps: 0, freeTaps: 0, energySpent: 0, waitMs: 0, hearts: 0,
    evCount: {}, miles: {}, t0: now, deliveries: [], maxEmptyStreak: 0, stuckSeen: 0, upgradeAt: [], majors: [], chestRarities: {}, mergeLevels: [],
  };
}

export const host = (sim: Sim) => ({
  world: sim.world,
  giveEnergy: (n: number) => addEnergy(sim.eco, n, sim.now),
  giveDiamonds: (n: number) => { sim.eco.diamonds += n; },
  addHearts: (n: number) => { sim.hearts += n; },
  giveBooster: () => { /* ignoré */ },
});

function mile(sim: Sim, k: string) {
  if (!sim.miles[k]) sim.miles[k] = { action: sim.actions, taps: sim.taps, merges: sim.s.merges, t: sim.now - sim.t0 };
}

/** Digère un lot d'événements comme le ferait l'interface. */
export function digest(sim: Sim, ev: BoardEvent[]) {
  for (const e of ev) {
    sim.evCount[e.t] = (sim.evCount[e.t] ?? 0) + 1;
    if (e.t === 'spawn' && e.source === 'gen' && !e.double) {
      sim.taps++;
      if (e.free) sim.freeTaps++;
      else {
        sim.energySpent++;
        if (!spendEnergy(sim.eco, 1, sim.now)) { const w = nextEnergyIn(sim.eco, sim.now) + 1; sim.now += w; sim.waitMs += w; spendEnergy(sim.eco, 1, sim.now); }
      }
    }
    if (e.t === 'deliver') { mile(sim, 'firstDeliver'); sim.deliveries.push({ action: sim.actions, tier: e.tier ?? '?' }); }
    if (e.t === 'drop') mile(sim, 'firstDrop');
    if (e.t === 'chest') mile(sim, 'firstChest');
    if (e.t === 'unlock') mile(sim, `unlock:${e.coll}`);
    if (e.t === 'discover') mile(sim, 'firstDiscover');
    if (e.t === 'secondary' && e.done) mile(sim, `secStage:${e.id}:${e.stage}`);
    if (e.t === 'maxMerge') mile(sim, 'firstMaxMerge');
    if (e.t === 'rescue') { sim.stuckSeen++; mile(sim, 'firstRescue'); }
    if (e.t === 'merge' && e.result.l >= 5) mile(sim, `merge5`);
    if (e.t === 'merge') sim.mergeLevels.push(e.result.l);
    if (e.t === 'unlock') sim.majors.push({ t: sim.now - sim.t0, action: sim.actions, what: `unlock:${e.coll}` });
    if (e.t === 'secondary' && e.done) sim.majors.push({ t: sim.now - sim.t0, action: sim.actions, what: `sec:${e.id}:${e.stage}` });
    if (e.t === 'maxMerge') sim.majors.push({ t: sim.now - sim.t0, action: sim.actions, what: 'maxMerge' });
  }
  applyEvents(host(sim), ev);
}

/** Joue `actions` actions d'un joueur « normal » (voir bot.endlessBotStep). */
export function playEndless(opts: SimOpts): Sim {
  const sim = newSim(opts.seed);
  let gap = opts.gapMs ?? opts.tapGapMs ?? 3000;
  let empty = 0;
  for (let i = 0; i < opts.actions; i++) {
    sim.actions = i + 1;
    sim.now += gap;
    // coffres en attente : on les ouvre
    const ch = openChest(sim.fun, mulberry(i + (opts.seed ?? 1)));
    if (ch) {
      mile(sim, 'firstChestOpen');
      sim.chestRarities[ch.rarity] = (sim.chestRarities[ch.rarity] ?? 0) + 1;
      if (['rare', 'epic', 'legendary'].includes(ch.rarity)) sim.majors.push({ t: sim.now - sim.t0, action: sim.actions, what: `chest:${ch.rarity}` });
      const placed = placeLoot(sim.s, ch.loot);
      digest(sim, placed.events);
      applyLoot(host(sim), placed.loot);
    }
    // améliorations : un joueur dépense ses pièces quand il peut
    if (opts.upgrades !== false && i % 20 === 0) {
      for (const c of activeColls(sim.fun)) {
        const kind = genKindOf(c);
        const r = upgradeGenerator(sim.fun, kind, sim.world);
        if (r.ok) { mile(sim, 'firstUpgrade'); sim.upgradeAt.push({ action: sim.actions, t: sim.now - sim.t0 }); sim.majors.push({ t: sim.now - sim.t0, action: sim.actions, what: `upgrade:${c}:${r.level}` }); }
      }
    }
    // remplacer une commande difficile quand on en a un en stock (1 fois sur 2)
    if (sim.fun.endless2.replaces > 1 && i % 40 === 0) { const ev = replaceOrder(sim.s, ENDLESS_DEF, 2); digest(sim, ev); }
    const ev = botStep(sim.s, ENDLESS_DEF, sim.now);
    if (!ev.length) { empty++; sim.maxEmptyStreak = Math.max(sim.maxEmptyStreak, empty); } else empty = 0;
    digest(sim, ev);
    if (opts.mergeGapMs) gap = ev.some((e) => e.t === 'merge') ? opts.mergeGapMs : (opts.tapGapMs ?? gap);
    opts.onEvents?.(ev, i, sim);
  }
  return sim;
}

export function mulberry(a: number) {
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export { endlessFun, collOfKind, genLevel, upgradeCost, canAfford, GENERATORS };
