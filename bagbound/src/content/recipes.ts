// Recettes de fusion (data/recipes.json) : ingrédients par id ou par tags,
// résultat = un objet dont la forme est celle du résultat.

import { z } from "zod";
import type { Content } from "../engine/types";
import { ContentError } from "./loader";

const inputSchema = z
  .object({ item: z.string().optional(), tag: z.string().optional(), anyTag: z.array(z.string()).nonempty().optional() })
  .strict()
  .refine((x) => x.item !== undefined || x.tag !== undefined || x.anyTag !== undefined, "ingrédient vide");

const recipeSchema = z
  .object({
    id: z.string(),
    /** upgrade : objets identiques vers un tier supérieur ; recipe : recette par tags / ids. */
    kind: z.enum(["upgrade", "recipe"]).default("recipe"),
    inputs: z.array(inputSchema).min(2).max(4),
    result: z.string(),
    /** Les ingrédients doivent former un groupe d'objets qui se touchent. */
    adjacency: z.boolean().default(true),
  })
  .strict();

export type RecipeInput = z.infer<typeof inputSchema>;
export type Recipe = z.infer<typeof recipeSchema>;

export function loadRecipes(raw: unknown, content: Content): Recipe[] {
  const r = z.array(recipeSchema).safeParse(raw);
  if (!r.success) throw new ContentError(r.error.issues.map((i) => `recipes.json: ${i.path.join(".")} : ${i.message}`));
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const rc of r.data) {
    const w = `recipes.json[${rc.id}]`;
    if (ids.has(rc.id)) issues.push(`${w}: id en double`);
    ids.add(rc.id);
    if (!content.items[rc.result]) issues.push(`${w}: résultat inconnu « ${rc.result} »`);
    for (const inp of rc.inputs) {
      if (inp.item !== undefined && !content.items[inp.item]) issues.push(`${w}: objet inconnu « ${inp.item} »`);
      for (const t of [inp.tag, ...(inp.anyTag ?? [])]) if (t !== undefined && !content.tags.includes(t)) issues.push(`${w}: tag inconnu « ${t} »`);
    }
    if (rc.kind === "upgrade" && new Set(rc.inputs.map((i) => i.item)).size !== 1) issues.push(`${w}: une amélioration demande des objets identiques`);
  }
  if (issues.length) throw new ContentError(issues);
  return r.data;
}
