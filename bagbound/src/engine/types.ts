// Types du moteur de combat. Aucune dépendance au rendu.
// Convention : dans les JSON, les durées sont en secondes ; dans l'état de
// simulation, tout est converti en millisecondes ENTIÈRES (pas d'erreur
// d'arrondi qui décalerait un déclenchement d'un tick).

/** Coordonnée de case [x, y] (x vers la droite, y vers le bas). */
export type Vec = [number, number];

// ---------------------------------------------------------------------------
// Définitions (contenu, chargé depuis /data)
// ---------------------------------------------------------------------------

/** Filtre sur les tags d'un objet. Tous les critères présents doivent passer. */
export interface TagFilter {
  /** L'objet doit avoir ce tag. */
  tag?: string;
  /** L'objet doit avoir au moins un de ces tags. */
  anyTag?: string[];
  /** L'objet ne doit pas avoir ce tag. */
  notTag?: string;
}

/** Effet déclenché par un objet. Les champs utilisés dépendent du type. */
export interface EffectDef {
  type: string;
  /** Intensité (dégâts, stacks, bonus de vitesse, secondes de recharge…). */
  value?: number;
  /** Durée en secondes (gel, haste, slow). */
  duration?: number;
  /** Sélecteur de cible (voir targets.ts). Défaut fourni par l'effet. */
  target?: string;
  /** Nombre de cibles pour les sélecteurs aléatoires. */
  count?: number;
  /** Filtre de tags sur les objets ciblés. */
  filter?: TagFilter;
  /** recharge : remet la barre pleine. */
  full?: boolean;
  /** fill : objet obtenu en remplissant (ex. bouteille vide -> potion). */
  into?: string;
  /** fill : charges de l'objet obtenu. */
  charges?: number;
}

export interface TriggerDef {
  type: string;
  /** Filtre de tags sur l'objet source de l'événement (onItemTrigger…). */
  filter?: TagFilter;
  /** onLowHP : seuil en fraction des PV max. */
  threshold?: number;
  /** Probabilité (0..1) de se déclencher. */
  chance?: number;
  /** Délai interne minimal entre deux déclenchements, en secondes. */
  icd?: number;
  /** Nombre max de déclenchements par combat. */
  max?: number;
}

/** Modificateur statique (adjacence, cases spéciales). */
export interface ModifierDef {
  type: string;
  value: number;
  /** "buff" : type d'effet dont la valeur est augmentée (damage, shield…). */
  stat?: string;
}

export interface AdjacencyRule {
  /** Filtre sur l'objet voisin. Absent = tout voisin. */
  target?: TagFilter;
  /** "neighbor" (défaut) : le voisin reçoit le bonus. "self" : cet objet le reçoit. */
  apply?: "neighbor" | "self";
  /** apply "self" : bonus cumulé pour chaque voisin qui correspond. */
  perNeighbor?: boolean;
  effect: ModifierDef;
}

export interface SpecialCell {
  /** Case de l'objet (dans sa forme non tournée). */
  cell: Vec;
  /** Rôle descriptif (tip, handle, core…). */
  role: string;
  /** Direction visée : la case cell+dir reçoit l'effet. Absent = les 4 côtés. */
  dir?: Vec;
  target?: TagFilter;
  effect?: ModifierDef;
}

export interface ItemDef {
  id: string;
  name: string;
  shape: Vec[];
  specialCells: SpecialCell[];
  tags: string[];
  tier: number;
  rarity: string;
  price: number;
  /** Secondes. null = pas de barre de cooldown. */
  cooldown: number | null;
  effects: EffectDef[];
  /** Déclencheurs événementiels (en plus du cooldown). */
  triggers: TriggerDef[];
  adjacency: AdjacencyRule[];
  /** Charges (potions, bombes…). null = illimité. */
  charges: number | null;
  /** Utilisable à la main par le joueur (boire / lancer). */
  manual: boolean;
  onEmpty: { transformInto: string } | null;
  /** Effets appliqués quand l'objet est lancé. Défaut : effects vers l'ennemi. */
  throwEffects: EffectDef[] | null;
  /** Extension de sac (objet-case posé au bord du sac). */
  extends: boolean;
  /** Maudit : ne peut ni quitter le sac ni être vendu. */
  cursed: boolean;
  description?: string;
}

/** Placement d'un objet dans un sac. */
export interface Placement {
  item: string;
  pos: Vec;
  /** Quarts de tour horaires (0..3). */
  rot?: number;
  mirror?: boolean;
  /** Charges restantes (persistées entre les combats d'une run). */
  charges?: number | null;
  /** Repère opaque recopié tel quel dans le sac d'après combat (transformations comprises). */
  ref?: string;
}

export interface PhaseDef {
  /** La phase s'active quand PV / PV max <= hpBelow. */
  hpBelow: number;
  /** replace : le sac est remplacé. add : les objets s'ajoutent. */
  mode: "replace" | "add";
  bag: Placement[];
  heal?: number;
  shield?: number;
  name?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  rank: "mob" | "elite" | "boss";
  bag: Placement[];
  phases: PhaseDef[];
  loot?: { gold?: [number, number]; table?: string };
}

export interface ClassDef {
  id: string;
  name: string;
  hp: number;
  bagCells: Vec[];
  maxBag: [number, number];
  description: string;
  innate: string[];
  startingBag: Placement[];
}

export interface DotRule {
  /** Intervalle entre deux dégâts, en secondes. */
  interval: number;
  damagePerStack: number;
  /** Stacks perdus à chaque intervalle. */
  decay: number;
  ignoreShield: boolean;
  maxStacks: number;
}

/** Règles d'équilibrage globales (data/rules.json), en secondes. */
export interface Rules {
  tick: number;
  maxTriggerDepth: number;
  maxFiresPerItemPerTick: number;
  speed: { min: number; max: number };
  minCooldown: number;
  freezeMax: number;
  potionLockout: number;
  lowHpThreshold: number;
  suddenDeath: { start: number; interval: number; baseDamage: number; growth: number };
  maxDuration: number;
  statuses: Record<string, DotRule>;
}

export interface Content {
  rules: Rules;
  tags: string[];
  items: Record<string, ItemDef>;
  enemies: Record<string, EnemyDef>;
  classes: Record<string, ClassDef>;
}

// ---------------------------------------------------------------------------
// État de simulation
// ---------------------------------------------------------------------------

export interface ItemMods {
  /** Bonus de vitesse statique (adjacence). */
  haste: number;
  /** Bonus plats par type d'effet ("damage", "shield", …). */
  buffs: Record<string, number>;
}

export interface TimedItemStatus {
  kind: string;
  value: number;
  remainingMs: number;
}

export interface ItemStats {
  triggers: number;
  damage: number;
  shield: number;
  heal: number;
  stacks: Record<string, number>;
}

export interface TriggerRuntime {
  fired: number;
  lastMs: number;
}

export interface ItemInstance {
  uid: string;
  ref?: string;
  def: ItemDef;
  owner: number;
  pos: Vec;
  rot: number;
  mirror: boolean;
  /** Cases absolues occupées. */
  cells: Vec[];
  cooldownMs: number | null;
  progressMs: number;
  charges: number | null;
  timed: TimedItemStatus[];
  mods: ItemMods;
  neighbors: string[];
  trig: TriggerRuntime[];
  firesThisTick: number;
  lockoutUntilMs: number;
  removed: boolean;
  stats: ItemStats;
}

export interface CombatantStatus {
  stacks: number;
  timerMs: number;
  /** Dernier combattant à avoir appliqué le statut (attribution des kills). */
  source: number | null;
}

export type Side = "player" | "enemy";

export interface Combatant {
  index: number;
  side: Side;
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  statuses: Record<string, CombatantStatus>;
  items: ItemInstance[];
  alive: boolean;
  phases: PhaseDef[];
  phasesDone: number;
  /** Rang d'ennemi (mob/elite/boss) ou "player". */
  rank: string;
  /** Multiplicateur des dégâts directs (1 par défaut). */
  damageMul: number;
}

export interface CombatantSetup {
  /** Ennemi : id dans content.enemies (hp/bag/phases surchargeables). */
  id?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  bag?: Placement[];
  phases?: PhaseDef[];
  /** Multiplicateur de PV (difficulté). */
  hpMul?: number;
  /** Multiplicateur des dégâts directs infligés (difficulté). */
  damageMul?: number;
  /** Objets innés (mécanique de classe) : actifs en combat, hors du sac, sans voisins. */
  innate?: string[];
}

/** Action manuelle du joueur (potions). */
export interface CombatAction {
  /** Tick auquel l'action est appliquée (début du tick). */
  tick: number;
  type: "drink" | "throw";
  /** Index du combattant (0 = joueur). */
  combatant: number;
  /** uid de l'objet. */
  item: string;
  /** throw : index du combattant visé. */
  target?: number;
}

export interface CombatSetup {
  seed: number;
  player: CombatantSetup & { hp: number; bag: Placement[] };
  enemies: CombatantSetup[];
  actions?: CombatAction[];
}

export type CombatEvent =
  | { t: number; type: "start" }
  | { t: number; type: "trigger"; item: string; owner: number; cause: string }
  | { t: number; type: "damage"; target: number; source: number | null; item: string | null; kind: string; amount: number; absorbed: number }
  | { t: number; type: "heal"; target: number; item: string | null; amount: number }
  | { t: number; type: "shield"; target: number; item: string | null; amount: number }
  | { t: number; type: "status"; target: number; status: string; stacks: number }
  | { t: number; type: "itemStatus"; item: string; owner: number; status: string; value: number; ms: number }
  | { t: number; type: "recharge"; item: string; ms: number }
  | { t: number; type: "purge"; target: number }
  | { t: number; type: "phase"; target: number; phase: number; name?: string }
  | { t: number; type: "death"; target: number; killer: number | null }
  | { t: number; type: "transform"; item: string; into: string; newUid: string }
  | { t: number; type: "throw"; item: string; owner: number; target: number }
  | { t: number; type: "drink"; item: string; owner: number }
  | { t: number; type: "destroyed"; item: string }
  | { t: number; type: "actionRejected"; item: string; reason: string }
  | { t: number; type: "suddenDeath"; amount: number }
  | { t: number; type: "end"; outcome: Outcome };

export type Outcome = "win" | "loss" | "draw";

/** Événement interne distribué aux déclencheurs. */
export type EngineEvent =
  | { type: "combatStart" }
  | { type: "itemTrigger"; item: ItemInstance }
  | { type: "hit"; source: Combatant; target: Combatant; item: ItemInstance | null; amount: number }
  | { type: "damaged"; target: Combatant; source: Combatant | null; amount: number; kind: string }
  | { type: "hpChanged"; target: Combatant }
  | { type: "kill"; killer: Combatant | null; target: Combatant };

export interface RulesMs {
  tickMs: number;
  maxTriggerDepth: number;
  maxFiresPerItemPerTick: number;
  speedMin: number;
  speedMax: number;
  minCooldownMs: number;
  freezeMaxMs: number;
  potionLockoutMs: number;
  lowHpThreshold: number;
  suddenDeath: { startMs: number; intervalMs: number; baseDamage: number; growth: number };
  maxDurationMs: number;
  statuses: Record<string, { intervalMs: number; damagePerStack: number; decay: number; ignoreShield: boolean; maxStacks: number }>;
}

export interface CombatState {
  content: Content;
  rules: RulesMs;
  seed: number;
  rngState: number;
  tick: number;
  timeMs: number;
  started: boolean;
  combatants: Combatant[];
  outcome: Outcome | null;
  /** Actions à venir, triées par tick. */
  pending: CombatAction[];
  /** Toutes les actions reçues (pour rejouer le combat). */
  actionLog: CombatAction[];
  record: boolean;
  events: CombatEvent[];
  uidCounter: number;
  /** Objets sortis d'un sac (transformés, lancés, remplacés par une phase) : gardés pour les stats. */
  retired: ItemInstance[];
  /** Actions manuelles acceptées du joueur (quêtes : potions bues, objets lancés). */
  used: { drink: number; throw: number };
  suddenDeathTimerMs: number;
  suddenDeathCount: number;
}

export interface CombatResult {
  outcome: Outcome;
  ticks: number;
  seconds: number;
  player: { hp: number; maxHp: number };
  enemies: { id: string; hp: number; maxHp: number }[];
  /** Sac du joueur après le combat (charges consommées, potions vidées…). */
  playerBagAfter: Placement[];
  itemStats: { uid: string; owner: number; item: string; stats: ItemStats }[];
  /** Potions bues / objets lancés par le joueur. */
  used: { drink: number; throw: number };
  hash: string;
  events: CombatEvent[];
  actions: CombatAction[];
}
