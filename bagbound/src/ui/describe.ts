// Texte des infobulles, généré à partir des données (tags, effets,
// déclencheurs, adjacence) : aucun cas particulier par objet.

import type { EffectDef, ItemDef, ItemMods, ModifierDef, TagFilter, TriggerDef } from "../engine/types";

const STAT: Record<string, string> = {
  damage: "dégâts",
  shield: "bouclier",
  heal: "soin",
  poison: "poison",
  burn: "brûlure",
  freeze: "s de gel",
  haste: "accélération",
  slow: "ralentissement",
  recharge: "s de recharge",
};

export const RARITY_FR: Record<string, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const pct = (n: number) => `${Math.round(n * 100)} %`;

function filterFr(f?: TagFilter): string {
  if (!f) return "";
  const parts: string[] = [];
  if (f.tag) parts.push(f.tag);
  if (f.anyTag) parts.push(f.anyTag.join(" ou "));
  if (f.notTag) parts.push(`non ${f.notTag}`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

function itemTargetFr(e: EffectDef, fallback: string): string {
  const t = e.target ?? fallback;
  const n = e.count ?? 1;
  const f = filterFr(e.filter);
  switch (t) {
    case "thisItem":
      return "cet objet";
    case "adjacent":
      return `les objets voisins${f}`;
    case "randomAllyItem":
      return n > 1 ? `${n} de vos objets${f}` : `un de vos objets${f}`;
    case "allAllyItems":
      return `tous vos objets${f}`;
    case "randomEnemyItem":
      return n > 1 ? `${n} objets ennemis${f}` : `un objet ennemi${f}`;
    case "allEnemyItems":
      return `tous les objets ennemis${f}`;
    default:
      return t;
  }
}

function whoFr(e: EffectDef, fallback: string): string {
  switch (e.target ?? fallback) {
    case "randomEnemy":
      return " à un ennemi au hasard";
    case "allEnemies":
      return " à tous les ennemis";
    default:
      return "";
  }
}

/** Valeur affichée : « 5 » ou « 6 (5 +1) » quand un bonus s'applique. */
function val(e: EffectDef, mods?: ItemMods): string {
  const base = e.value ?? 0;
  const bonus = mods?.buffs[e.type] ?? 0;
  return bonus ? `${num(base + bonus)} (${num(base)} ${bonus > 0 ? "+" : ""}${num(bonus)})` : num(base);
}

export function effectFr(e: EffectDef, mods?: ItemMods): string {
  switch (e.type) {
    case "damage":
      return `Inflige ${val(e, mods)} dégâts${whoFr(e, "enemy")}`;
    case "shield":
      return `+${val(e, mods)} bouclier`;
    case "heal":
      return `Soigne ${val(e, mods)} PV`;
    case "poison":
      return `Empoisonne : ${val(e, mods)}${whoFr(e, "enemy")}`;
    case "burn":
      return `Brûle : ${val(e, mods)}${whoFr(e, "enemy")}`;
    case "purge":
      return e.value === undefined ? "Purge poison, brûlure, gel et ralentissements" : `Retire ${e.value} poison et brûlure, purge gel et ralentissements`;
    case "freeze":
      return `Gèle ${itemTargetFr(e, "randomEnemyItem")} ${num(e.duration ?? 0)} s`;
    case "haste":
      return `Accélère ${itemTargetFr(e, "adjacent")} de ${pct(e.value ?? 0)} pendant ${num(e.duration ?? 0)} s`;
    case "slow":
      return `Ralentit ${itemTargetFr(e, "randomEnemyItem")} de ${pct(e.value ?? 0)} pendant ${num(e.duration ?? 0)} s`;
    case "recharge":
      return e.full
        ? `Recharge entièrement ${itemTargetFr(e, "adjacent")}`
        : `Avance de ${num(e.value ?? 0)} s la barre de ${itemTargetFr(e, "adjacent")}`;
    default:
      return `${e.type}${e.value !== undefined ? ` ${num(e.value)}` : ""}`;
  }
}

export function triggerFr(t: TriggerDef): string {
  let s: string;
  switch (t.type) {
    case "onCombatStart":
      s = "Au début du combat";
      break;
    case "onItemTrigger":
      s = `Quand un autre de vos objets${filterFr(t.filter)} se déclenche`;
      break;
    case "onAdjacentTrigger":
      s = `Quand un objet voisin${filterFr(t.filter)} se déclenche`;
      break;
    case "onHit":
      s = "Quand vous touchez l'ennemi";
      break;
    case "onDamaged":
      s = "Quand vous êtes touché";
      break;
    case "onLowHP":
      s = `Sous ${pct(t.threshold ?? 0.3)} de PV (une fois)`;
      break;
    case "onKill":
      s = "Quand un ennemi tombe";
      break;
    case "onCooldown":
      s = "Quand la barre est pleine";
      break;
    default:
      s = t.type;
  }
  const extra: string[] = [];
  if (t.chance !== undefined) extra.push(`${pct(t.chance)} de chances`);
  if (t.icd !== undefined) extra.push(`au plus toutes les ${num(t.icd)} s`);
  if (t.max !== undefined) extra.push(`${t.max} fois max`);
  return extra.length ? `${s} (${extra.join(", ")})` : s;
}

export function modifierFr(m: ModifierDef): string {
  if (m.type === "haste") return `${m.value >= 0 ? "+" : ""}${pct(m.value)} de vitesse`;
  if (m.type === "buff") return `${m.value >= 0 ? "+" : ""}${num(m.value)} ${STAT[m.stat ?? "damage"] ?? m.stat}`;
  return `${m.type} ${num(m.value)}`;
}

export interface ItemInfo {
  name: string;
  rarity: string;
  tags: string[];
  lines: { kind: "cd" | "trigger" | "effect" | "adj" | "special" | "charges" | "note" | "manual"; text: string }[];
}

/** Description complète d'un objet. mods/speed : bonus réels dans le sac courant. */
export function describeItem(def: ItemDef, opts: { mods?: ItemMods; charges?: number | null } = {}): ItemInfo {
  const lines: ItemInfo["lines"] = [];
  const haste = opts.mods?.haste ?? 0;
  if (def.cooldown !== null) {
    const eff = def.cooldown / Math.max(0.25, 1 + haste);
    lines.push({ kind: "cd", text: haste ? `Toutes les ${num(eff)} s (${num(def.cooldown)} s, ${modifierFr({ type: "haste", value: haste })})` : `Toutes les ${num(def.cooldown)} s` });
  }
  for (const t of def.triggers) if (t.type !== "onCooldown") lines.push({ kind: "trigger", text: triggerFr(t) });
  if (def.manual) lines.push({ kind: "manual", text: "Toucher : utiliser · Toucher longtemps : lancer" });
  for (const e of def.effects) lines.push({ kind: "effect", text: effectFr(e, opts.mods) });
  if (def.manual && def.throwEffects) lines.push({ kind: "effect", text: `Lancé : ${def.throwEffects.map((e) => effectFr(e)).join(", ").replace(/^./, (c) => c.toLowerCase())}` });
  for (const a of def.adjacency) {
    const who = a.apply === "self" ? `${a.perNeighbor ? "Par" : "Si"} voisin${filterFr(a.target)} : ${modifierFr(a.effect)}` : `Voisins${filterFr(a.target)} : ${modifierFr(a.effect)}`;
    lines.push({ kind: "adj", text: who });
  }
  for (const sc of def.specialCells) {
    if (!sc.effect) continue;
    const role = sc.role === "tip" ? "Pointe" : sc.role.charAt(0).toUpperCase() + sc.role.slice(1);
    lines.push({ kind: "special", text: `${role} : ${sc.dir ? "la case visée" : "les cases autour"}${filterFr(sc.target)} reçoit ${modifierFr(sc.effect)}` });
  }
  if (def.charges !== null) {
    const c = opts.charges ?? def.charges;
    lines.push({ kind: "charges", text: `Charges : ${c} / ${def.charges}${def.onEmpty ? " (devient une bouteille vide)" : ""}` });
  }
  if (def.description) lines.push({ kind: "note", text: def.description });
  return { name: def.name, rarity: RARITY_FR[def.rarity] ?? def.rarity, tags: def.tags, lines };
}
