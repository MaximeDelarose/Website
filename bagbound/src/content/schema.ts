// Schémas zod du contenu (/data/*.json). Les valeurs par défaut sont posées
// ici : le moteur reçoit toujours des définitions complètes.

import { z } from "zod";

const vec = z.tuple([z.number().int(), z.number().int()]);

export const tagFilterSchema = z
  .object({
    tag: z.string().optional(),
    anyTag: z.array(z.string()).nonempty().optional(),
    notTag: z.string().optional(),
  })
  .strict();

export const effectSchema = z
  .object({
    type: z.string().min(1),
    value: z.number().optional(),
    duration: z.number().positive().optional(),
    target: z.string().optional(),
    count: z.number().int().positive().optional(),
    filter: tagFilterSchema.optional(),
    full: z.boolean().optional(),
  })
  .strict();

export const triggerSchema = z
  .object({
    type: z.string().min(1),
    filter: tagFilterSchema.optional(),
    threshold: z.number().gt(0).lte(1).optional(),
    chance: z.number().gt(0).lte(1).optional(),
    icd: z.number().nonnegative().optional(),
    max: z.number().int().positive().optional(),
  })
  .strict();

export const modifierSchema = z
  .object({
    type: z.string().min(1),
    value: z.number(),
    stat: z.string().optional(),
  })
  .strict();

export const adjacencySchema = z
  .object({
    target: tagFilterSchema.optional(),
    apply: z.enum(["neighbor", "self"]).optional(),
    perNeighbor: z.boolean().optional(),
    effect: modifierSchema,
  })
  .strict();

export const specialCellSchema = z
  .object({
    cell: vec,
    role: z.string().min(1),
    dir: vec.optional(),
    target: tagFilterSchema.optional(),
    effect: modifierSchema.optional(),
  })
  .strict();

export const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const;

export const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/, "id en snake_case"),
    name: z.string().min(1),
    shape: z.array(vec).nonempty(),
    specialCells: z.array(specialCellSchema).default([]),
    tags: z.array(z.string()).default([]),
    tier: z.number().int().min(1).default(1),
    rarity: z.enum(rarities).default("common"),
    price: z.number().int().nonnegative().default(0),
    cooldown: z.number().positive().nullable().default(null),
    effects: z.array(effectSchema).default([]),
    triggers: z.array(triggerSchema).default([]),
    adjacency: z.array(adjacencySchema).default([]),
    charges: z.number().int().nonnegative().nullable().default(null),
    manual: z.boolean().default(false),
    onEmpty: z.object({ transformInto: z.string() }).strict().nullable().default(null),
    throwEffects: z.array(effectSchema).nullable().default(null),
    description: z.string().optional(),
  })
  .strict();

export const placementSchema = z
  .object({
    item: z.string(),
    pos: vec,
    rot: z.number().int().min(0).max(3).optional(),
    mirror: z.boolean().optional(),
    charges: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const phaseSchema = z
  .object({
    hpBelow: z.number().gt(0).lt(1),
    mode: z.enum(["replace", "add"]),
    bag: z.array(placementSchema),
    heal: z.number().nonnegative().optional(),
    shield: z.number().nonnegative().optional(),
    name: z.string().optional(),
  })
  .strict();

export const enemySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    hp: z.number().int().positive(),
    rank: z.enum(["mob", "elite", "boss"]).default("mob"),
    bag: z.array(placementSchema),
    phases: z.array(phaseSchema).default([]),
    loot: z
      .object({
        gold: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
        table: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const classSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    hp: z.number().int().positive(),
    bagCells: z.array(vec).nonempty(),
    startingBag: z.array(placementSchema),
  })
  .strict();

const dotSchema = z
  .object({
    interval: z.number().positive(),
    damagePerStack: z.number().nonnegative().default(1),
    decay: z.number().int().nonnegative().default(0),
    ignoreShield: z.boolean().default(false),
    maxStacks: z.number().int().positive().default(999),
  })
  .strict();

export const rulesSchema = z
  .object({
    tick: z.number().positive().default(0.1),
    maxTriggerDepth: z.number().int().positive().default(6),
    maxFiresPerItemPerTick: z.number().int().positive().default(3),
    speed: z.object({ min: z.number().positive(), max: z.number().positive() }).strict().default({ min: 0.25, max: 3 }),
    minCooldown: z.number().positive().default(0.3),
    freezeMax: z.number().positive().default(4),
    potionLockout: z.number().nonnegative().default(1),
    lowHpThreshold: z.number().gt(0).lt(1).default(0.3),
    suddenDeath: z
      .object({
        start: z.number().nonnegative(),
        interval: z.number().positive(),
        baseDamage: z.number().nonnegative(),
        growth: z.number().nonnegative(),
      })
      .strict()
      .default({ start: 40, interval: 1, baseDamage: 1, growth: 1 }),
    maxDuration: z.number().positive().default(180),
    statuses: z.record(dotSchema).default({}),
  })
  .strict();

export const tagsSchema = z.array(z.string().min(1)).nonempty();
export const itemsSchema = z.array(itemSchema);
export const enemiesSchema = z.array(enemySchema);
export const classesSchema = z.array(classSchema);

export const sandboxSchema = z
  .object({
    class: z.string(),
    stash: z.array(z.string()),
    encounters: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            enemies: z.array(z.string()).min(1).max(3),
          })
          .strict(),
      )
      .nonempty(),
  })
  .strict();
