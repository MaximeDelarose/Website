// Campement (hub) : profil persistant entre les runs, quêtes, dialogues,
// fragments d'histoire, coffre. Pur et sérialisable (localStorage).
// Mourir fait avancer l'histoire : chaque fin de run passe par applyRun.

import type { RunData } from "../content/runData";
import type { Cond, QuestDef, Reward, StoryData } from "../content/story";
import type { Content } from "../engine/types";
import type { RunOptions, RunState } from "./run";

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
  };
}

export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Profile;
    if (p?.v !== 1 || typeof p.runs !== "number" || !p.quests || !p.chest) return null;
    return p;
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
}

/** Fin de run : statistiques, quêtes, fragments, drapeaux, texte de retour. */
export function applyRun(p: Profile, run: RunState, quests: QuestDef[], story: StoryData, content: Content, rd: RunData): RunSummary {
  const won = run.phase === "won";
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
  return { completed, newLore, fresh, returnText: ret?.text ?? "" };
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

/** Options de la prochaine run ; les objets du coffre partent avec toi (le coffre se vide). */
export function departure(p: Profile, quests: QuestDef[], rd: RunData): RunOptions {
  const fromChest = [...p.chest.items];
  p.chest.items = [];
  const routes = rd.zones.flatMap((z) => z.routes.filter((r) => !r.unlock || p.routes.includes(r.id)).map((r) => r.id));
  return {
    unlockedRoutes: routes,
    lockedItems: lockedItems(p, quests),
    startItems: [...p.startItems, ...fromChest],
    startGold: p.startGold,
  };
}

export function depositChest(p: Profile, item: string): boolean {
  if (p.chest.items.length >= p.chest.slots) return false;
  p.chest.items.push(item);
  return true;
}

/** Niveau du campement : il se reconstruit au fil des quêtes rendues. */
export function hubLevel(p: Profile): number {
  return Object.values(p.quests).filter((q) => q.state === "claimed").length;
}
