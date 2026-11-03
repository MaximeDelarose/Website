// Données de run : règles (run.json), zones (zones.json), tables de butin
// (loot.json) et événements (events.json). Validées par zod + références.

import { z } from "zod";
import type { Content } from "../engine/types";
import { ContentError } from "./loader";

const range = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);

export const NODE_TYPES = ["combat", "elite", "shop", "event", "chest", "campfire", "boss"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

const runRulesSchema = z
  .object({
    startGold: z.number().int().nonnegative(),
    rows: z.number().int().min(2).max(12),
    nodesPerRow: range,
    firstRow: z.enum(NODE_TYPES),
    eliteMinRow: z.number().int().nonnegative(),
    nodeWeights: z.record(z.enum(NODE_TYPES), z.number().nonnegative()),
    rewardChoices: z.number().int().min(1).max(5),
    eliteGoldBonus: z.number().int().nonnegative(),
    campfire: z.object({ healPct: z.number().min(0).max(1), maxHp: z.number().int().nonnegative() }).strict(),
    shop: z
      .object({
        stock: z.number().int().min(1).max(8),
        priceMul: z.number().positive(),
        reroll: z.number().int().nonnegative(),
        rerollStep: z.number().int().nonnegative(),
        healCost: z.number().int().nonnegative(),
        healAmount: z.number().int().nonnegative(),
        sellRatio: z.number().min(0).max(1),
        unfuseCost: z.number().int().nonnegative(),
      })
      .strict(),
    chest: z.object({ gold: range, choices: z.number().int().min(1).max(4) }).strict(),
    refill: z.object({ from: z.string(), into: z.string(), charges: z.number().int().positive(), cost: z.number().int().nonnegative() }).strict(),
  })
  .strict();

const encounterList = z.array(z.array(z.string()).min(1).max(3)).nonempty();

const zoneSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    shopTable: z.string(),
    chestTable: z.string(),
    floors: z.array(z.object({ hpMul: z.number().positive(), normal: encounterList, elite: encounterList }).strict()).nonempty(),
    boss: z.array(z.string()).min(1).max(3),
    bossHpMul: z.number().positive().default(1),
  })
  .strict();

const lootSchema = z.record(z.array(z.object({ item: z.string(), weight: z.number().positive() }).strict()).nonempty());

export type EventEffect =
  | { type: "gold"; value: number }
  | { type: "hp"; value: number }
  | { type: "heal"; value: number }
  | { type: "maxHp"; value: number }
  | { type: "item"; table: string }
  | { type: "addItem"; item: string }
  | { type: "loseItem"; tag: string }
  | { type: "refill"; from: string; into: string; charges: number }
  | { type: "fight"; enemies: string[] }
  | { type: "random"; outcomes: { weight: number; effects: EventEffect[]; result?: string }[] };

const eventEffectSchema: z.ZodType<EventEffect> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("gold"), value: z.number().int() }).strict(),
    z.object({ type: z.literal("hp"), value: z.number().int() }).strict(),
    z.object({ type: z.literal("heal"), value: z.number().int().nonnegative() }).strict(),
    z.object({ type: z.literal("maxHp"), value: z.number().int() }).strict(),
    z.object({ type: z.literal("item"), table: z.string() }).strict(),
    z.object({ type: z.literal("addItem"), item: z.string() }).strict(),
    z.object({ type: z.literal("loseItem"), tag: z.string() }).strict(),
    z.object({ type: z.literal("refill"), from: z.string(), into: z.string(), charges: z.number().int().positive() }).strict(),
    z.object({ type: z.literal("fight"), enemies: z.array(z.string()).min(1).max(3) }).strict(),
    z
      .object({
        type: z.literal("random"),
        outcomes: z.array(z.object({ weight: z.number().positive(), effects: z.array(eventEffectSchema), result: z.string().optional() }).strict()).nonempty(),
      })
      .strict(),
  ]),
);

const eventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    icon: z.string().optional(),
    text: z.string(),
    choices: z
      .array(
        z
          .object({
            label: z.string(),
            requires: z.object({ gold: z.number().int().optional(), tag: z.string().optional(), item: z.string().optional() }).strict().optional(),
            effects: z.array(eventEffectSchema),
            result: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type RunRules = z.infer<typeof runRulesSchema>;
export type ZoneDef = z.infer<typeof zoneSchema>;
export type LootTables = z.infer<typeof lootSchema>;
export type EventDef = z.infer<typeof eventSchema>;

export interface RunData {
  rules: RunRules;
  zones: ZoneDef[];
  loot: LootTables;
  events: EventDef[];
}

export interface RawRunData {
  rules: unknown;
  zones: unknown;
  loot: unknown;
  events: unknown;
}

export function loadRunData(raw: RawRunData, content: Content): RunData {
  const issues: string[] = [];
  const parse = <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown, file: string): T | null => {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const i of r.error.issues) issues.push(`${file}: ${i.path.join(".") || "(racine)"} : ${i.message}`);
    return null;
  };
  const rules = parse(runRulesSchema, raw.rules, "run.json");
  const zones = parse(z.array(zoneSchema).nonempty(), raw.zones, "zones.json");
  const loot = parse(lootSchema, raw.loot, "loot.json");
  const events = parse(z.array(eventSchema), raw.events, "events.json");
  if (!rules || !zones || !loot || !events) throw new ContentError(issues);

  const enemy = (w: string, id: string) => {
    if (!content.enemies[id]) issues.push(`${w}: ennemi inconnu « ${id} »`);
  };
  const table = (w: string, id: string) => {
    if (!loot[id]) issues.push(`${w}: table de butin inconnue « ${id} »`);
  };
  for (const id of [rules.refill.from, rules.refill.into]) if (!content.items[id]) issues.push(`run.json: refill, objet inconnu « ${id} »`);
  for (const [id, list] of Object.entries(loot)) for (const e of list) if (!content.items[e.item]) issues.push(`loot.json[${id}]: objet inconnu « ${e.item} »`);
  for (const zn of zones) {
    const w = `zones.json[${zn.id}]`;
    table(w, zn.shopTable);
    table(w, zn.chestTable);
    zn.boss.forEach((id) => enemy(w, id));
    zn.floors.forEach((f) => [...f.normal, ...f.elite].forEach((enc) => enc.forEach((id) => enemy(w, id))));
  }
  for (const e of Object.values(content.enemies)) if (e.loot?.table) table(`enemies.json[${e.id}]`, e.loot.table);
  const checkEffects = (w: string, list: EventEffect[]) => {
    for (const ef of list) {
      if (ef.type === "item") table(w, ef.table);
      if (ef.type === "addItem" && !content.items[ef.item]) issues.push(`${w}: objet inconnu « ${ef.item} »`);
      if (ef.type === "refill") for (const id of [ef.from, ef.into]) if (!content.items[id]) issues.push(`${w}: objet inconnu « ${id} »`);
      if (ef.type === "loseItem" && !content.tags.includes(ef.tag)) issues.push(`${w}: tag inconnu « ${ef.tag} »`);
      if (ef.type === "fight") ef.enemies.forEach((id) => enemy(w, id));
      if (ef.type === "random") ef.outcomes.forEach((o) => checkEffects(w, o.effects));
    }
  };
  for (const ev of events) {
    ev.choices.forEach((c, i) => {
      const w = `events.json[${ev.id}].choices[${i}]`;
      if (c.requires?.item && !content.items[c.requires.item]) issues.push(`${w}: objet inconnu « ${c.requires.item} »`);
      if (c.requires?.tag && !content.tags.includes(c.requires.tag)) issues.push(`${w}: tag inconnu « ${c.requires.tag} »`);
      checkEffects(w, c.effects);
    });
  }
  if (issues.length) throw new ContentError(issues);
  return { rules, zones, loot, events };
}
