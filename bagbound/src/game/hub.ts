// Campement (hub) : profil persistant entre les runs, quêtes, dialogues,
// fragments d'histoire, coffre. Pur et sérialisable (localStorage).
// Mourir fait avancer l'histoire : chaque fin de run passe par applyRun.

import type { MetaData, TierDef, UpgradeDef } from "../content/meta";
import type { RunData } from "../content/runData";
import type { Cond, QuestDef, Reward, StoryData } from "../content/story";
import type { Content } from "../engine/types";
import type { RunMods, RunOptions, RunState } from "./run";

export interface QuestState {
  progress: number;
  state: "active" | "done" | "claimed";
  /** Le PNJ a présenté la quête. */
  seen: boolean;
}

export interface LastRun {
  won: boolean;
  zone: number;
  route: string;
  /** Rencontre fatale (ids). */
  killedBy: string[];
}

export interface Profile {
  v: 1;
  runs: number;
  deaths: number;
  wins: number;
  flags: string[];
  lore: string[];
  quests: Record<string, QuestState>;
  unlockedItems: string[];
  routes: string[];
  chest: { slots: number; items: string[] };
  startItems: string[];
  startGold: number;
  seenDialogues: string[];
  bossKills: Record<string, number>;
  last: LastRun | null;
  /** Monnaie persistante (Éclats de Trame) et total gagné. */
  shards: number;
  totalShards: number;
  /** Niveau acheté de chaque amélioration du campement. */
  upgrades: Record<string, number>;
  /** Classes jouables. */
  classes: string[];
  /** Plus haut palier de difficulté remporté (-1 : aucun). */
  bestTier: number;
  /** Derniers choix au départ (classe, palier). */
  lastClass: string;
  lastTier: number;
}

export function newProfile(): Profile {
  return {
    v: 1,
    runs: 0,
    deaths: 0,
    wins: 0,
    flags: [],
    lore: [],
    quests: {},
    unlockedItems: [],
    routes: [],
    chest: { slots: 1, items: [] },
    startItems: [],
    startGold: 0,
    seenDialogues: [],
    bossKills: {},
    last: null,
    shards: 0,
    totalShards: 0,
    upgrades: {},
    classes: ["vagabond"],
    bestTier: -1,
    lastClass: "vagabond",
    lastTier: 0,
  };
}

export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Profile;
    if (p?.v !== 1 || typeof p.runs !== "number" || !p.quests || !p.chest) return null;
    // profils plus anciens (avant la méta-progression) : champs manquants complétés
    return { ...newProfile(), ...p };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export function cond(p: Profile, c: Cond): boolean {
  if (c.runs !== undefined && p.runs < c.runs) return false;
  if (c.deaths !== undefined && p.deaths < c.deaths) return false;
  if (c.wins !== undefined && p.wins < c.wins) return false;
  if (c.flags && !c.flags.every((f) => p.flags.includes(f))) return false;
  if (c.notFlags && c.notFlags.some((f) => p.flags.includes(f))) return false;
  if (c.questsClaimed && !c.questsClaimed.every((q) => p.quests[q]?.state === "claimed")) return false;
  if (c.bossKilled !== undefined && !p.bossKills[c.bossKilled]) return false;
  if (c.lore !== undefined && !p.lore.includes(c.lore)) return false;
  if (c.lastWon !== undefined && (p.last?.won ?? false) !== c.lastWon) return false;
  if (c.lastKilledBy !== undefined && !(p.last?.killedBy ?? []).includes(c.lastKilledBy)) return false;
  if (c.lastZone !== undefined && (p.last?.zone ?? -1) !== c.lastZone) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Quêtes
// ---------------------------------------------------------------------------

/** Active les quêtes dont les conditions sont remplies. Renvoie les nouvelles. */
export function refreshQuests(p: Profile, quests: QuestDef[]): string[] {
  const fresh: string[] = [];
  for (const q of quests) {
    if (p.quests[q.id] || !cond(p, q.conditions)) continue;
    p.quests[q.id] = { progress: 0, state: "active", seen: false };
    fresh.push(q.id);
  }
  return fresh;
}

/** Objets qui ne tombent pas tant qu'une quête ne les a pas débloqués. */
export function lockedItems(p: Profile, quests: QuestDef[]): string[] {
  const all = new Set<string>();
  for (const q of quests) for (const r of q.rewards) if (r.type === "unlockItem") all.add(r.item);
  return [...all].filter((id) => !p.unlockedItems.includes(id));
}

/** Avancement apporté par une run, pour un objectif. */
export function runProgress(q: QuestDef, run: RunState, content: Content): number {
  const o = q.objective;
  const combats = run.log.filter((e): e is Extract<RunState["log"][number], { type: "combat" }> => e.type === "combat");
  switch (o.type) {
    case "winCombat":
      return combats.filter((c) => c.win).length;
    case "killEnemy":
      return combats.filter((c) => c.win).reduce((s, c) => s + c.enemies.filter((e) => e === o.enemy).length, 0);
    case "fuse":
      return run.log.filter((e) => e.type === "fuse").length;
    case "drink":
      return combats.reduce((s, c) => s + c.drink, 0);
    case "throw":
      return combats.reduce((s, c) => s + c.throw, 0);
    case "goldEarned":
      return run.stats.goldEarned;
    case "reachZone":
      return run.log.some((e) => e.type === "zone" && e.zone >= (o.zone ?? 0)) ? 1 : 0;
    case "floorNoDamage":
      return run.log.filter((e) => e.type === "floor" && e.hpLost === 0).length;
    case "die":
      return run.phase === "dead" ? 1 : 0;
    case "winRun":
      return run.phase === "won" ? 1 : 0;
    case "endWithTag": {
      const n = run.bag.entries.filter((e) => content.items[e.item]?.tags.includes(o.tag!)).length;
      return n >= (o.items ?? 1) ? 1 : 0;
    }
  }
}

export interface RunSummary {
  /** Quêtes terminées pendant cette run (à rendre au PNJ). */
  completed: string[];
  newLore: string[];
  /** Nouvelles quêtes disponibles. */
  fresh: string[];
  returnText: string;
  /** Éclats gagnés. */
  shards: number;
  /** Nouveau palier débloqué (victoire au plus haut palier atteint). */
  tierUnlocked: number | null;
}

/** Fin de run : statistiques, quêtes, fragments, drapeaux, texte de retour. */
/** Éclats de Trame gagnés par une run : combats, élites, boss, étages, victoire, × palier. */
export function shardsFor(run: RunState, meta: MetaData): number {
  const s = meta.shards;
  let total = 0;
  for (const e of run.log) {
    if (e.type === "combat" && e.win) total += s.perCombat + (e.elite ? s.perElite : 0) + (e.boss ? s.perBoss : 0);
    if (e.type === "floor") total += s.perFloor;
  }
  if (run.phase === "won") total += s.win;
  const tier = meta.tiers[Math.min(run.tier ?? 0, meta.tiers.length - 1)];
  return Math.round(total * tier.shardMul);
}

export function applyRun(p: Profile, run: RunState, quests: QuestDef[], story: StoryData, content: Content, rd: RunData, meta?: MetaData): RunSummary {
  const won = run.phase === "won";
  const shards = meta ? shardsFor(run, meta) : 0;
  p.shards += shards;
  p.totalShards += shards;
  let tierUnlocked: number | null = null;
  if (won && meta && (run.tier ?? 0) > p.bestTier) {
    p.bestTier = run.tier ?? 0;
    if (p.bestTier + 1 < meta.tiers.length) tierUnlocked = p.bestTier + 1;
  }
  p.runs++;
  if (won) p.wins++;
  else p.deaths++;
  const killedBy = run.stats.killedByIds ?? [];
  p.last = { won, zone: run.zone, route: run.route, killedBy };
  for (const e of run.log) {
    if (e.type === "combat" && e.win && e.boss) for (const id of e.enemies) p.bossKills[id] = (p.bossKills[id] ?? 0) + 1;
    if (e.type === "zone" && e.zone >= 1 && !p.flags.includes("reached_depths")) p.flags.push("reached_depths");
    if (e.type === "zone" && e.zone >= rd.zones.length && !p.flags.includes("reached_heart")) p.flags.push("reached_heart");
    if (e.type === "flag" && !p.flags.includes(e.id)) p.flags.push(e.id);
  }
  const newLore: string[] = [];
  for (const e of run.log) if (e.type === "lore" && !p.lore.includes(e.id) && !newLore.includes(e.id)) newLore.push(e.id);
  p.lore.push(...newLore);
  // quêtes actives avant la run : elles avancent
  const completed: string[] = [];
  for (const q of quests) {
    const st = p.quests[q.id];
    if (!st || st.state !== "active") continue;
    st.progress = Math.min(q.objective.count, st.progress + runProgress(q, run, content));
    if (st.progress >= q.objective.count) {
      st.state = "done";
      completed.push(q.id);
    }
  }
  const fresh = refreshQuests(p, quests);
  const ret = [...story.returns].sort((a, b) => b.priority - a.priority).find((r) => cond(p, r.conditions));
  return { completed, newLore, fresh, returnText: ret?.text ?? "", shards, tierUnlocked };
}

export function applyReward(p: Profile, r: Reward): void {
  switch (r.type) {
    case "unlockItem":
      if (!p.unlockedItems.includes(r.item)) p.unlockedItems.push(r.item);
      break;
    case "unlockRoute":
      if (!p.routes.includes(r.route)) p.routes.push(r.route);
      break;
    case "chestSlot":
      p.chest.slots++;
      break;
    case "startItem":
      p.startItems.push(r.item);
      break;
    case "startGold":
      p.startGold += r.value;
      break;
    case "flag":
      if (!p.flags.includes(r.id)) p.flags.push(r.id);
      break;
    case "lore":
      if (!p.lore.includes(r.id)) p.lore.push(r.id);
      break;
  }
}

/** Rend une quête terminée : récompenses appliquées. */
export function claimQuest(p: Profile, quests: QuestDef[], id: string): QuestDef {
  const q = quests.find((x) => x.id === id);
  const st = p.quests[id];
  if (!q || st?.state !== "done") throw new Error(`Quête non terminée : ${id}`);
  st.state = "claimed";
  for (const r of q.rewards) applyReward(p, r);
  refreshQuests(p, quests);
  return q;
}

// ---------------------------------------------------------------------------
// PNJ et dialogues
// ---------------------------------------------------------------------------

export function visibleNpcs(p: Profile, story: StoryData): StoryData["npcs"][number][] {
  return story.npcs.filter((n) => cond(p, n.conditions));
}

export type Talk =
  | { kind: "claim"; quest: QuestDef }
  | { kind: "dialogue"; id: string; lines: string[] }
  | { kind: "offer"; quest: QuestDef }
  | { kind: "idle"; line: string };

/** Ce que le PNJ a à dire, du plus important au moins important. */
export function talk(p: Profile, story: StoryData, quests: QuestDef[], npc: string): Talk {
  const claim = quests.find((q) => q.npc === npc && p.quests[q.id]?.state === "done");
  if (claim) return { kind: "claim", quest: claim };
  const d = story.dialogues
    .filter((x) => x.npc === npc && !p.seenDialogues.includes(x.id) && cond(p, x.conditions))
    .sort((a, b) => b.priority - a.priority)[0];
  if (d) return { kind: "dialogue", id: d.id, lines: d.lines };
  const offer = quests.find((q) => q.npc === npc && p.quests[q.id]?.state === "active" && !p.quests[q.id].seen);
  if (offer) return { kind: "offer", quest: offer };
  const idle = story.idle[npc] ?? ["…"];
  return { kind: "idle", line: idle[(p.runs + p.seenDialogues.length) % idle.length] };
}

/** Le PNJ a quelque chose de nouveau (pastille « ! »). */
export function hasNews(p: Profile, story: StoryData, quests: QuestDef[], npc: string): boolean {
  return talk(p, story, quests, npc).kind !== "idle";
}

export function markTalked(p: Profile, t: Talk): void {
  if (t.kind === "dialogue" && !p.seenDialogues.includes(t.id)) p.seenDialogues.push(t.id);
  if (t.kind === "offer") p.quests[t.quest.id].seen = true;
}

// ---------------------------------------------------------------------------
// Départ et coffre
// ---------------------------------------------------------------------------

export interface DepartureChoice {
  cls?: string;
  tier?: number;
}

/** Paliers accessibles : le suivant s'ouvre en gagnant au palier précédent. */
export function availableTiers(p: Profile, meta: MetaData): TierDef[] {
  return meta.tiers.filter((t) => t.id <= p.bestTier + 1);
}

/** Options de la prochaine run ; les objets du coffre partent avec toi (le coffre se vide). */
export function departure(p: Profile, quests: QuestDef[], rd: RunData, meta?: MetaData, choice: DepartureChoice = {}): RunOptions {
  const fromChest = [...p.chest.items];
  p.chest.items = [];
  const routes = rd.zones.flatMap((z) => z.routes.filter((r) => !r.unlock || p.routes.includes(r.id)).map((r) => r.id));
  const opts: RunOptions = {
    unlockedRoutes: routes,
    lockedItems: lockedItems(p, quests),
    startItems: [...p.startItems, ...fromChest],
    startGold: p.startGold,
  };
  if (!meta) return opts;
  const tiers = availableTiers(p, meta);
  const tier = tiers.find((t) => t.id === (choice.tier ?? 0)) ?? tiers[0];
  const mods: Partial<RunMods> = {
    enemyHpMul: tier.enemyHpMul,
    enemyDamageMul: tier.enemyDamageMul,
    eliteWeightMul: tier.eliteWeightMul,
    campfireHealMul: tier.campfireHealMul,
    rewardChoicesBonus: 0,
    shopDiscount: 0,
    freeRerolls: 0,
  };
  let maxHp = 0;
  let gold = p.startGold + tier.startGold;
  const items = [...opts.startItems!];
  let campBonus = 0;
  for (const u of meta.upgrades) {
    const lvl = p.upgrades[u.id] ?? 0;
    if (!lvl) continue;
    const e = u.effect;
    switch (e.type) {
      case "maxHp":
        maxHp += e.value * lvl;
        break;
      case "startGold":
        gold += e.value * lvl;
        break;
      case "campfireHeal":
        campBonus += e.value * lvl;
        break;
      case "shopDiscount":
        mods.shopDiscount! += e.value * lvl;
        break;
      case "freeRerolls":
        mods.freeRerolls! += e.value * lvl;
        break;
      case "rewardChoices":
        mods.rewardChoicesBonus! += e.value * lvl;
        break;
      case "startItem":
        for (let k = 0; k < lvl; k++) items.push(e.item);
        break;
      default:
        break; // chestSlot / unlockClass : appliqués à l'achat
    }
  }
  mods.campfireHealMul = tier.campfireHealMul * (1 + campBonus);
  const cls = choice.cls && p.classes.includes(choice.cls) ? choice.cls : "vagabond";
  p.lastClass = cls;
  p.lastTier = tier.id;
  return { ...opts, startGold: gold, startItems: items, maxHpBonus: maxHp, mods, curses: [...tier.curses], tier: tier.id };
}

export function upgradeLevel(p: Profile, id: string): number {
  return p.upgrades[id] ?? 0;
}

/** Prix du prochain niveau, ou null si l'amélioration est au maximum. */
export function nextCost(p: Profile, u: UpgradeDef): number | null {
  const lvl = upgradeLevel(p, u.id);
  return lvl < u.costs.length ? u.costs[lvl] : null;
}

export function canBuy(p: Profile, u: UpgradeDef): boolean {
  const cost = nextCost(p, u);
  return cost !== null && p.shards >= cost && u.requires.every((r) => upgradeLevel(p, r) > 0);
}

export function buyUpgrade(p: Profile, meta: MetaData, id: string): void {
  const u = meta.upgrades.find((x) => x.id === id);
  if (!u || !canBuy(p, u)) throw new Error(`Amélioration impossible : ${id}`);
  p.shards -= nextCost(p, u)!;
  p.upgrades[id] = upgradeLevel(p, id) + 1;
  if (u.effect.type === "chestSlot") p.chest.slots += u.effect.value;
  if (u.effect.type === "unlockClass" && !p.classes.includes(u.effect.class)) p.classes.push(u.effect.class);
}

export function depositChest(p: Profile, item: string, content?: Content): boolean {
  if (p.chest.items.length >= p.chest.slots) return false;
  if (content?.items[item]?.cursed) return false;
  p.chest.items.push(item);
  return true;
}

/** Niveau du campement : il se reconstruit au fil des quêtes rendues. */
export function hubLevel(p: Profile): number {
  return Object.values(p.quests).filter((q) => q.state === "claimed").length;
}
