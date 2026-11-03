// Histoire et quêtes (data/story.json, data/quests.json) : PNJ du campement,
// dialogues à conditions, fragments d'histoire, textes de retour, quêtes.

import { z } from "zod";
import type { Content } from "../engine/types";
import { ContentError } from "./loader";
import type { RunData } from "./runData";

/** Conditions sur le profil (toutes doivent être vraies). */
export const condSchema = z
  .object({
    runs: z.number().int().optional(),
    deaths: z.number().int().optional(),
    wins: z.number().int().optional(),
    flags: z.array(z.string()).optional(),
    notFlags: z.array(z.string()).optional(),
    questsClaimed: z.array(z.string()).optional(),
    bossKilled: z.string().optional(),
    lore: z.string().optional(),
    lastWon: z.boolean().optional(),
    lastKilledBy: z.string().optional(),
    lastZone: z.number().int().optional(),
  })
  .strict();
export type Cond = z.infer<typeof condSchema>;

const npcSchema = z.object({ id: z.string(), name: z.string(), title: z.string(), sprite: z.string(), x: z.number().min(0).max(1), conditions: condSchema }).strict();
const dialogueSchema = z
  .object({ id: z.string(), npc: z.string(), priority: z.number(), conditions: condSchema, lines: z.array(z.string()).nonempty() })
  .strict();
const storySchema = z
  .object({
    hub: z.object({ name: z.string(), intro: z.string() }).strict(),
    npcs: z.array(npcSchema).nonempty(),
    dialogues: z.array(dialogueSchema),
    idle: z.record(z.array(z.string()).nonempty()),
    returns: z.array(z.object({ id: z.string(), priority: z.number(), conditions: condSchema, text: z.string() }).strict()).nonempty(),
    lore: z.array(z.object({ id: z.string(), title: z.string(), text: z.string() }).strict()),
  })
  .strict();

export const OBJECTIVES = ["winCombat", "killEnemy", "fuse", "drink", "throw", "goldEarned", "reachZone", "floorNoDamage", "die", "endWithTag", "winRun"] as const;

const objectiveSchema = z
  .object({
    type: z.enum(OBJECTIVES),
    count: z.number().int().positive(),
    enemy: z.string().optional(),
    tag: z.string().optional(),
    items: z.number().int().positive().optional(),
    zone: z.number().int().nonnegative().optional(),
  })
  .strict();

const rewardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("unlockItem"), item: z.string() }).strict(),
  z.object({ type: z.literal("unlockRoute"), route: z.string() }).strict(),
  z.object({ type: z.literal("chestSlot") }).strict(),
  z.object({ type: z.literal("startItem"), item: z.string() }).strict(),
  z.object({ type: z.literal("startGold"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("flag"), id: z.string() }).strict(),
  z.object({ type: z.literal("lore"), id: z.string() }).strict(),
]);

const questSchema = z
  .object({
    id: z.string(),
    npc: z.string(),
    title: z.string(),
    text: z.string(),
    conditions: condSchema,
    objective: objectiveSchema,
    rewards: z.array(rewardSchema).nonempty(),
    done: z.string(),
  })
  .strict();

export type StoryData = z.infer<typeof storySchema>;
export type QuestDef = z.infer<typeof questSchema>;
export type Reward = z.infer<typeof rewardSchema>;

export function loadStory(rawStory: unknown, rawQuests: unknown, content: Content, rd: RunData): { story: StoryData; quests: QuestDef[] } {
  const issues: string[] = [];
  const s = storySchema.safeParse(rawStory);
  const q = z.array(questSchema).safeParse(rawQuests);
  if (!s.success) for (const i of s.error.issues) issues.push(`story.json: ${i.path.join(".")} : ${i.message}`);
  if (!q.success) for (const i of q.error.issues) issues.push(`quests.json: ${i.path.join(".")} : ${i.message}`);
  if (!s.success || !q.success) throw new ContentError(issues);
  const story = s.data;
  const quests = q.data;
  const npcs = new Set(story.npcs.map((n) => n.id));
  const lore = new Set(story.lore.map((l) => l.id));
  const questIds = new Set(quests.map((x) => x.id));
  const routes = new Set(rd.zones.flatMap((zn) => zn.routes.map((r) => r.id)));
  const checkCond = (w: string, c: Cond) => {
    for (const id of c.questsClaimed ?? []) if (!questIds.has(id)) issues.push(`${w}: quête inconnue « ${id} »`);
    for (const id of [c.bossKilled, c.lastKilledBy]) if (id !== undefined && !content.enemies[id]) issues.push(`${w}: ennemi inconnu « ${id} »`);
    if (c.lore !== undefined && !lore.has(c.lore)) issues.push(`${w}: fragment inconnu « ${c.lore} »`);
  };
  story.npcs.forEach((n) => checkCond(`story.json[${n.id}]`, n.conditions));
  for (const d of story.dialogues) {
    if (!npcs.has(d.npc)) issues.push(`story.json[${d.id}]: PNJ inconnu « ${d.npc} »`);
    checkCond(`story.json[${d.id}]`, d.conditions);
  }
  for (const k of Object.keys(story.idle)) if (!npcs.has(k)) issues.push(`story.json: idle pour un PNJ inconnu « ${k} »`);
  story.returns.forEach((r) => checkCond(`story.json[${r.id}]`, r.conditions));
  for (const qu of quests) {
    const w = `quests.json[${qu.id}]`;
    if (!npcs.has(qu.npc)) issues.push(`${w}: PNJ inconnu « ${qu.npc} »`);
    checkCond(w, qu.conditions);
    const o = qu.objective;
    if (o.type === "killEnemy" && (!o.enemy || !content.enemies[o.enemy])) issues.push(`${w}: ennemi inconnu « ${o.enemy} »`);
    if (o.type === "endWithTag" && (!o.tag || !content.tags.includes(o.tag) || !o.items)) issues.push(`${w}: endWithTag demande « tag » et « items »`);
    if (o.type === "reachZone" && (o.zone === undefined || o.zone > rd.zones.length)) issues.push(`${w}: zone invalide`);
    for (const r of qu.rewards) {
      if ((r.type === "unlockItem" || r.type === "startItem") && !content.items[r.item]) issues.push(`${w}: objet inconnu « ${r.item} »`);
      if (r.type === "unlockRoute" && !routes.has(r.route)) issues.push(`${w}: route inconnue « ${r.route} »`);
      if (r.type === "lore" && !lore.has(r.id)) issues.push(`${w}: fragment inconnu « ${r.id} »`);
    }
  }
  // fragments donnés par les événements
  const walk = (effects: { type: string; id?: string; outcomes?: { effects: unknown[] }[] }[], w: string) => {
    for (const e of effects) {
      if (e.type === "lore" && !lore.has(e.id!)) issues.push(`${w}: fragment inconnu « ${e.id} »`);
      if (e.type === "random") e.outcomes!.forEach((o) => walk(o.effects as never, w));
    }
  };
  for (const ev of rd.events) ev.choices.forEach((c, i) => walk(c.effects as never, `events.json[${ev.id}].choices[${i}]`));
  // une route « unlock » doit pouvoir s'ouvrir
  for (const zn of rd.zones)
    for (const r of zn.routes)
      if (r.unlock && !quests.some((qu) => qu.rewards.some((x) => x.type === "unlockRoute" && x.route === r.id)))
        issues.push(`zones.json[${r.id}]: route fermée qu'aucune quête n'ouvre`);
  if (issues.length) throw new ContentError(issues);
  return { story, quests };
}
