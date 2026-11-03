// Chargement et validation du contenu : schéma zod, puis vérification des
// références (ids d'objets, tags, types d'effets / déclencheurs / cibles
// enregistrés) et des sacs (pas de chevauchement, objets dans le sac).

import { z } from "zod";
import "../engine/builtins";
import { placedCells, validatePlacements } from "../engine/geometry";
import { effectRegistry, modifierRegistry, targetRegistry, triggerRegistry } from "../engine/registry";
import type { ClassDef, Content, EffectDef, EnemyDef, ItemDef, Placement, Rules, TagFilter, Vec } from "../engine/types";
import { classesSchema, enemiesSchema, itemsSchema, rulesSchema, tagsSchema } from "./schema";

export interface RawContent {
  rules: unknown;
  tags: unknown;
  items: unknown;
  enemies: unknown;
  classes?: unknown;
}

export class ContentError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Contenu invalide :\n- ${issues.join("\n- ")}`);
    this.name = "ContentError";
  }
}

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown, file: string, issues: string[]): T | null {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  for (const i of r.error.issues) issues.push(`${file}: ${i.path.join(".") || "(racine)"} : ${i.message}`);
  return null;
}

function indexById<T extends { id: string }>(list: T[], file: string, issues: string[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const x of list) {
    if (out[x.id]) issues.push(`${file}: id en double « ${x.id} »`);
    out[x.id] = x;
  }
  return out;
}

export function loadContent(raw: RawContent): Content {
  const issues: string[] = [];
  const rules = parse(rulesSchema, raw.rules, "rules.json", issues) as Rules | null;
  const tags = parse(tagsSchema, raw.tags, "tags.json", issues);
  const itemList = parse(itemsSchema, raw.items, "items.json", issues) as ItemDef[] | null;
  const enemyList = parse(enemiesSchema, raw.enemies, "enemies.json", issues) as EnemyDef[] | null;
  const classList = parse(classesSchema, raw.classes ?? [], "classes.json", issues) as ClassDef[] | null;
  if (!rules || !tags || !itemList || !enemyList || !classList) throw new ContentError(issues);

  const items = indexById(itemList, "items.json", issues);
  const enemies = indexById(enemyList, "enemies.json", issues);
  const classes = indexById(classList, "classes.json", issues);
  const tagSet = new Set(tags);

  const checkFilter = (where: string, f?: TagFilter) => {
    if (!f) return;
    for (const t of [f.tag, f.notTag, ...(f.anyTag ?? [])]) {
      if (t !== undefined && !tagSet.has(t)) issues.push(`${where}: tag inconnu « ${t} »`);
    }
  };
  const checkEffect = (where: string, e: EffectDef) => {
    const h = effectRegistry.get(e.type);
    if (!h) return void issues.push(`${where}: effet inconnu « ${e.type} »`);
    for (const k of h.requires ?? []) if (e[k] === undefined) issues.push(`${where}: l'effet ${e.type} demande « ${String(k)} »`);
    const tName = e.target ?? h.defaultTarget;
    const th = targetRegistry.get(tName);
    if (!th) issues.push(`${where}: cible inconnue « ${tName} »`);
    else if (th.kind !== h.targetKind) issues.push(`${where}: la cible ${tName} ne convient pas à l'effet ${e.type}`);
    checkFilter(where, e.filter);
    if (e.into !== undefined && !items[e.into]) issues.push(`${where}: objet inconnu « ${e.into} »`);
  };

  for (const it of itemList) {
    const w = `items.json[${it.id}]`;
    const cells = new Set(it.shape.map(([x, y]) => `${x},${y}`));
    if (cells.size !== it.shape.length) issues.push(`${w}: case en double dans shape`);
    for (const t of it.tags) if (!tagSet.has(t)) issues.push(`${w}: tag inconnu « ${t} »`);
    it.effects.forEach((e, i) => checkEffect(`${w}.effects[${i}]`, e));
    (it.throwEffects ?? []).forEach((e, i) => checkEffect(`${w}.throwEffects[${i}]`, e));
    it.triggers.forEach((t, i) => {
      const h = triggerRegistry.get(t.type);
      if (!h) issues.push(`${w}.triggers[${i}]: déclencheur inconnu « ${t.type} »`);
      else if (h.usesCooldown && it.cooldown === null) issues.push(`${w}: onCooldown sans cooldown`);
      checkFilter(`${w}.triggers[${i}]`, t.filter);
    });
    it.adjacency.forEach((a, i) => {
      if (!modifierRegistry.has(a.effect.type)) issues.push(`${w}.adjacency[${i}]: modificateur inconnu « ${a.effect.type} »`);
      checkFilter(`${w}.adjacency[${i}]`, a.target);
    });
    it.specialCells.forEach((sc, i) => {
      if (!cells.has(`${sc.cell[0]},${sc.cell[1]}`)) issues.push(`${w}.specialCells[${i}]: la case n'appartient pas à la forme`);
      if (sc.effect && !modifierRegistry.has(sc.effect.type)) issues.push(`${w}.specialCells[${i}]: modificateur inconnu « ${sc.effect.type} »`);
      checkFilter(`${w}.specialCells[${i}]`, sc.target);
    });
    if (it.onEmpty && !items[it.onEmpty.transformInto]) issues.push(`${w}: onEmpty vers un objet inconnu « ${it.onEmpty.transformInto} »`);
    if (it.onEmpty && it.charges === null) issues.push(`${w}: onEmpty sans charges`);
    if (it.cooldown === null && it.effects.length > 0 && it.triggers.length === 0 && !it.manual)
      issues.push(`${w}: des effets mais ni cooldown, ni déclencheur, ni usage manuel`);
  }

  const checkBag = (where: string, bag: Placement[], bagCells?: Vec[]) => {
    const placed: { id: string; cells: Vec[] }[] = [];
    bag.forEach((p, i) => {
      const def = items[p.item];
      if (!def) return void issues.push(`${where}[${i}]: objet inconnu « ${p.item} »`);
      placed.push({ id: `${i}:${p.item}`, cells: placedCells(def.shape, p.pos, { rot: p.rot ?? 0, mirror: p.mirror === true }) });
    });
    for (const pb of validatePlacements(placed, bagCells)) {
      issues.push(
        pb.kind === "outside"
          ? `${where}: ${pb.id} sort du sac en (${pb.cell.join(",")})`
          : `${where}: ${pb.id} chevauche ${pb.other} en (${pb.cell.join(",")})`,
      );
    }
  };

  for (const e of enemyList) {
    checkBag(`enemies.json[${e.id}].bag`, e.bag);
    e.phases.forEach((ph, i) => checkBag(`enemies.json[${e.id}].phases[${i}].bag`, ph.bag));
  }
  for (const c of classList) {
    checkBag(`classes.json[${c.id}].startingBag`, c.startingBag, c.bagCells);
    for (const id of c.innate) if (!items[id]) issues.push(`classes.json[${c.id}]: objet inné inconnu « ${id} »`);
  }

  if (issues.length) throw new ContentError(issues);
  return { rules, tags: [...tags], items, enemies, classes };
}
