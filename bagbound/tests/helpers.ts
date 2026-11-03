import { loadContent } from "../src/content/loader";
import { createCombat, stepCombat, type CombatAction, type CombatState, type Content, type Placement } from "../src/engine";

export const TAGS = ["Arme", "Armure", "Métal", "Bois", "Feu", "Glace", "Poison", "Magie", "Potion", "Nourriture", "Verre", "Vide", "Outil", "Bijou", "Animal", "Extension"];

/** Règles de test : pas de mort subite par défaut, durée max très longue. */
export const TEST_RULES = {
  tick: 0.1,
  maxTriggerDepth: 6,
  maxFiresPerItemPerTick: 3,
  speed: { min: 0.25, max: 3 },
  minCooldown: 0.3,
  freezeMax: 4,
  potionLockout: 1,
  lowHpThreshold: 0.3,
  suddenDeath: { start: 10000, interval: 1, baseDamage: 1, growth: 1 },
  maxDuration: 20000,
  statuses: {
    poison: { interval: 1, damagePerStack: 1, decay: 0, ignoreShield: true, maxStacks: 99 },
    burn: { interval: 0.5, damagePerStack: 1, decay: 1, ignoreShield: false, maxStacks: 99 },
  },
};

/** Objets de base utilisés par les tests. */
export const BASE_ITEMS = [
  { id: "dummy", name: "Caillou", shape: [[0, 0]], tags: [] },
  { id: "punch", name: "Poing", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 5 }] },
  { id: "jab", name: "Petit coup", shape: [[0, 0]], tags: ["Arme"], cooldown: 1, effects: [{ type: "damage", value: 1 }] },
  { id: "slow_punch", name: "Coup lent", shape: [[0, 0]], tags: ["Arme"], cooldown: 2, effects: [{ type: "damage", value: 5 }] },
  { id: "sword3", name: "Épée", shape: [[0, 0], [0, 1], [0, 2]], tags: ["Arme", "Métal"], cooldown: 1, effects: [{ type: "damage", value: 5 }],
    specialCells: [{ cell: [0, 0], role: "tip", dir: [0, -1], effect: { type: "buff", stat: "damage", value: 2 } }] },
  { id: "empty_bottle", name: "Bouteille vide", shape: [[0, 0]], tags: ["Verre", "Vide"], charges: 0, manual: true, throwEffects: [{ type: "damage", value: 3 }] },
  { id: "heal_potion", name: "Potion", shape: [[0, 0]], tags: ["Potion", "Verre"], charges: 2, manual: true,
    effects: [{ type: "heal", value: 15 }], throwEffects: [{ type: "damage", value: 4 }], onEmpty: { transformInto: "empty_bottle" } },
];

export function makeContent(items: object[] = [], enemies: object[] = [], rules: object = {}): Content {
  return loadContent({
    rules: { ...TEST_RULES, ...rules },
    tags: TAGS,
    items: [...BASE_ITEMS, ...items],
    enemies,
    classes: [],
  });
}

export interface DuelOptions {
  player: Placement[];
  enemy?: Placement[];
  enemies?: { hp: number; bag: Placement[]; phases?: never[] | object[] }[];
  playerHp?: number;
  playerMaxHp?: number;
  enemyHp?: number;
  seed?: number;
  actions?: CombatAction[];
}

export function duel(content: Content, o: DuelOptions): CombatState {
  const enemies = o.enemies ?? [{ hp: o.enemyHp ?? 1000, bag: o.enemy ?? [] }];
  return createCombat(
    content,
    {
      seed: o.seed ?? 1,
      player: { hp: o.playerHp ?? 1000, maxHp: o.playerMaxHp, bag: o.player },
      enemies: enemies as never,
      actions: o.actions,
    },
    { record: true },
  );
}

/** Avance jusqu'au tick n (inclus). */
export function stepTo(state: CombatState, tick: number): CombatState {
  while (state.tick < tick && !state.outcome) stepCombat(state);
  return state;
}

export const at = (x: number, y: number): [number, number] => [x, y];
export const P = (item: string, x = 0, y = 0, rot = 0): Placement => ({ item, pos: [x, y], rot });
