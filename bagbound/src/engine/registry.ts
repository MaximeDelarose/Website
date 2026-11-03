// Registres : chaque effet, déclencheur, cible, statut et modificateur est un
// module enregistrable. Ajouter du contenu = enregistrer un module, sans
// toucher au cœur du moteur (combat.ts / ops.ts).

import type {
  Combatant,
  CombatantStatus,
  CombatState,
  EffectDef,
  EngineEvent,
  ItemInstance,
  ItemMods,
  ModifierDef,
  RulesMs,
  TriggerDef,
} from "./types";

export interface EffectContext {
  state: CombatState;
  /** Combattant qui possède l'objet (ou qui agit). */
  owner: Combatant;
  /** Objet source (null pour un effet sans objet). */
  item: ItemInstance | null;
  /** Profondeur de la chaîne de déclencheurs. */
  depth: number;
  /** Lancer : ennemi visé de force par les cibles « enemy ». */
  forcedEnemy?: Combatant;
}

export type TargetKind = "combatant" | "item";

interface EffectHandlerBase {
  type: string;
  defaultTarget: string;
  /** Sélecteurs d'objets : ne garder que les objets avec une barre de cooldown. */
  chargeableOnly?: boolean;
  /** Champs obligatoires dans la définition (validés au chargement). */
  requires?: (keyof EffectDef)[];
}

export interface CombatantEffectHandler extends EffectHandlerBase {
  targetKind: "combatant";
  apply(ctx: EffectContext, effect: EffectDef, targets: Combatant[]): void;
}

export interface ItemEffectHandler extends EffectHandlerBase {
  targetKind: "item";
  apply(ctx: EffectContext, effect: EffectDef, targets: ItemInstance[]): void;
}

export type EffectHandler = CombatantEffectHandler | ItemEffectHandler;

export interface TargetOptions {
  chargeableOnly: boolean;
}

export interface CombatantTargetHandler {
  name: string;
  kind: "combatant";
  resolve(ctx: EffectContext, effect: EffectDef, opts: TargetOptions): Combatant[];
}

export interface ItemTargetHandler {
  name: string;
  kind: "item";
  resolve(ctx: EffectContext, effect: EffectDef, opts: TargetOptions): ItemInstance[];
}

export type TargetHandler = CombatantTargetHandler | ItemTargetHandler;

export interface TriggerHandler {
  type: string;
  /** Déclencheur porté par la barre de cooldown (et non par un événement). */
  usesCooldown?: boolean;
  /** Nombre max de déclenchements par combat si la définition n'en donne pas. */
  defaultMax?: number;
  matches?(evt: EngineEvent, item: ItemInstance, trig: TriggerDef, state: CombatState): boolean;
}

/** Statut porté par un combattant (poison, brûlure…). */
export interface CombatantStatusHandler {
  id: string;
  /** Appelé à chaque tick tant que le statut a des stacks. */
  onTick(state: CombatState, c: Combatant, st: CombatantStatus, rules: RulesMs): void;
  /** Statut négatif retiré par la purge. */
  negative: boolean;
}

/** Statut temporaire porté par un objet (gel, haste, slow…). */
export interface ItemStatusHandler {
  id: string;
  /** Contribution au multiplicateur de vitesse. */
  speed?(value: number): number;
  /** Bloque la recharge de la barre. */
  blocksCharge?: boolean;
  negative: boolean;
  /** Fusion avec une application existante (défaut : nouvelle entrée). */
  stacking: "add-duration" | "refresh-same-value";
}

export interface ModifierHandler {
  type: string;
  apply(mods: ItemMods, m: ModifierDef): void;
}

export const effectRegistry = new Map<string, EffectHandler>();
export const targetRegistry = new Map<string, TargetHandler>();
export const triggerRegistry = new Map<string, TriggerHandler>();
export const statusRegistry = new Map<string, CombatantStatusHandler>();
export const itemStatusRegistry = new Map<string, ItemStatusHandler>();
export const modifierRegistry = new Map<string, ModifierHandler>();

export function registerEffect(h: EffectHandler): void {
  effectRegistry.set(h.type, h);
}
export function registerTarget(h: TargetHandler): void {
  targetRegistry.set(h.name, h);
}
export function registerTrigger(h: TriggerHandler): void {
  triggerRegistry.set(h.type, h);
}
export function registerStatus(h: CombatantStatusHandler): void {
  statusRegistry.set(h.id, h);
}
export function registerItemStatus(h: ItemStatusHandler): void {
  itemStatusRegistry.set(h.id, h);
}
export function registerModifier(h: ModifierHandler): void {
  modifierRegistry.set(h.type, h);
}
