// Méta-progression (data/meta.json) : monnaie persistante, paliers de
// difficulté, arbre d'améliorations du campement (dont le déblocage des classes).

import { z } from "zod";
import type { Content } from "../engine/types";
import { ContentError } from "./loader";

const tierSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    text: z.string(),
    enemyHpMul: z.number().positive(),
    enemyDamageMul: z.number().positive(),
    campfireHealMul: z.number().nonnegative(),
    startGold: z.number().int(),
    eliteWeightMul: z.number().positive(),
    curses: z.array(z.string()),
    shardMul: z.number().positive(),
  })
  .strict();

const upgradeEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("maxHp"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("startGold"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("campfireHeal"), value: z.number().positive() }).strict(),
  z.object({ type: z.literal("shopDiscount"), value: z.number().positive().max(0.5) }).strict(),
  z.object({ type: z.literal("freeRerolls"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("rewardChoices"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("chestSlot"), value: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("startItem"), item: z.string() }).strict(),
  z.object({ type: z.literal("unlockClass"), class: z.string() }).strict(),
]);

const upgradeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    text: z.string(),
    /** Prix de chaque niveau (la longueur = nombre de niveaux). */
    costs: z.array(z.number().int().positive()).nonempty(),
    requires: z.array(z.string()).default([]),
    effect: upgradeEffectSchema,
  })
  .strict();

const metaSchema = z
  .object({
    currency: z.object({ name: z.string(), short: z.string() }).strict(),
    shards: z
      .object({ perCombat: z.number().nonnegative(), perElite: z.number().nonnegative(), perBoss: z.number().nonnegative(), perFloor: z.number().nonnegative(), win: z.number().nonnegative() })
      .strict(),
    tiers: z.array(tierSchema).nonempty(),
    upgrades: z.array(upgradeSchema),
  })
  .strict();

export type MetaData = z.infer<typeof metaSchema>;
export type TierDef = z.infer<typeof tierSchema>;
export type UpgradeDef = z.infer<typeof upgradeSchema>;

export function loadMeta(raw: unknown, content: Content): MetaData {
  const r = metaSchema.safeParse(raw);
  if (!r.success) throw new ContentError(r.error.issues.map((i) => `meta.json: ${i.path.join(".")} : ${i.message}`));
  const m = r.data;
  const issues: string[] = [];
  m.tiers.forEach((t, i) => {
    if (t.id !== i) issues.push(`meta.json: les paliers doivent être numérotés 0, 1, 2… (palier ${t.id} en position ${i})`);
    for (const c of t.curses) if (!content.items[c]?.cursed) issues.push(`meta.json[palier ${t.id}]: « ${c} » n'est pas un objet maudit`);
  });
  const ids = new Set(m.upgrades.map((u) => u.id));
  for (const u of m.upgrades) {
    const w = `meta.json[${u.id}]`;
    for (const req of u.requires) if (!ids.has(req)) issues.push(`${w}: prérequis inconnu « ${req} »`);
    if (u.effect.type === "startItem" && !content.items[u.effect.item]) issues.push(`${w}: objet inconnu « ${u.effect.item} »`);
    if (u.effect.type === "unlockClass" && !content.classes[u.effect.class]) issues.push(`${w}: classe inconnue « ${u.effect.class} »`);
  }
  if (issues.length) throw new ContentError(issues);
  return m;
}
