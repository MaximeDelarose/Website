// Atelier (mode bac à sable de la Phase 2) : réserve d'objets et rencontres.

import type { Content } from "../engine/types";
import { ContentError } from "./loader";
import { sandboxSchema } from "./schema";

export interface Encounter {
  id: string;
  name: string;
  enemies: string[];
}

export interface Sandbox {
  class: string;
  stash: string[];
  encounters: Encounter[];
}

export function loadSandbox(raw: unknown, content: Content): Sandbox {
  const r = sandboxSchema.safeParse(raw);
  if (!r.success) throw new ContentError(r.error.issues.map((i) => `sandbox.json: ${i.path.join(".")} : ${i.message}`));
  const issues: string[] = [];
  if (!content.classes[r.data.class]) issues.push(`sandbox.json: classe inconnue « ${r.data.class} »`);
  for (const id of r.data.stash) if (!content.items[id]) issues.push(`sandbox.json: objet inconnu « ${id} »`);
  for (const e of r.data.encounters) for (const id of e.enemies) if (!content.enemies[id]) issues.push(`sandbox.json: ennemi inconnu « ${id} »`);
  if (issues.length) throw new ContentError(issues);
  return r.data;
}
