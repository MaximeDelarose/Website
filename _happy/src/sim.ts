// Simulation pure de Happy Daily (aucun rendu) : état, actions, humeur, passage des jours.
// Principe : aucune action n'est « mauvaise ». Les effets se nuancent selon la fatigue, la faim,
// la répétition et l'état de l'appartement, pour qu'aucune routine unique ne soit la bonne.

export const UNITS = 8;
export const DAYS_PER_CYCLE = 4;
export const CYCLES = 12;
export const TOTAL_DAYS = DAYS_PER_CYCLE * CYCLES;

export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIER_NAMES = ["Très bas", "Fragile", "Neutre", "Apaisé", "Épanoui"] as const;
export const TIER_COLORS = [0x6e6a9e, 0x8fa6c7, 0xe7e2d8, 0xa9c3a1, 0xf1c65e] as const;

export interface Apt {
  mug: boolean; // tasse restée sur le rebord de la fenêtre
  bedMade: boolean;
  dishes: number; // 0..4
  bookOut: boolean;
  plantGrowth: number; // 0..12
  plantWater: number; // 0..100
  meals: number; // plats maison au frigo
}

export interface State {
  v: 1;
  day: number; // 0..47
  units: number; // unités restantes aujourd'hui
  heavy: number; // unités « lourdes » restantes (réservées aux gestes doux)
  mood: number; // 0..100, jamais affiché en chiffre
  tier: Tier;
  energy: number;
  satiety: number;
  tidy: number;
  money: number;
  apt: Apt;
  today: string[];
  log: string[][]; // actions de chaque journée terminée
  moodDays: number[]; // humeur à la fin de chaque journée
  sheepDay: number; // dernier jour où le mouton a parlé
  started: boolean;
}

export function newState(): State {
  return {
    v: 1, day: 0, units: UNITS, heavy: 0, mood: 46, tier: 2, energy: 70, satiety: 55, tidy: 62, money: 120,
    apt: { mug: false, bedMade: false, dishes: 1, bookOut: false, plantGrowth: 2, plantWater: 55, meals: 0 },
    today: [], log: [], moodDays: [], sheepDay: -9, started: false,
  };
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/** Palier d'humeur avec hystérésis : on ne change de palier qu'en dépassant franchement la frontière. */
export function tierOf(mood: number, prev: Tier): Tier {
  let t = prev;
  while (t < 4 && mood > (t + 1) * 20 + 3) t = (t + 1) as Tier;
  while (t > 0 && mood < t * 20 - 3) t = (t - 1) as Tier;
  return t;
}

export interface ActionDef {
  id: string;
  at: string; // objet de l'appartement
  label: string | ((s: State) => string);
  cost: number; // 0 = petit geste gratuit
  effort?: boolean; // demande de l'élan : impossible sur une unité lourde
  when?: (s: State) => boolean;
  mood: number; energy: number; satiety?: number; money?: number;
  rest?: boolean; // moment calme, sensible à l'état de l'appartement
  apply?: (s: State) => void;
}

export const ACTIONS: ActionDef[] = [
  { id: "work", at: "desk", label: "Travailler", cost: 2, effort: true, mood: -3, energy: -15, satiety: -8, money: 70 },
  { id: "draw", at: "desk", label: "Dessiner", cost: 2, effort: true, mood: 8, energy: -6, satiety: -5 },
  { id: "play", at: "desk", label: "Jouer un peu", cost: 1, mood: 5, energy: -2 },
  { id: "cook", at: "counter", label: "Cuisiner", cost: 2, effort: true, mood: 4, energy: -5, money: -8,
    apply: (s) => { s.apt.meals = Math.min(3, s.apt.meals + 2); s.apt.dishes = Math.min(4, s.apt.dishes + 1); } },
  { id: "tea", at: "counter", label: "Se faire un thé", cost: 1, mood: 3, energy: 4, rest: true, apply: (s) => { s.apt.mug = true; } },
  { id: "dishes", at: "counter", label: "Faire la vaisselle", cost: 1, effort: true, mood: 2, energy: -3,
    when: (s) => s.apt.dishes > 0 || s.apt.mug,
    apply: (s) => { s.apt.dishes = 0; s.apt.mug = false; s.tidy = clamp(s.tidy + 12); } },
  { id: "eat", at: "fridge", label: (s) => (s.apt.meals > 0 ? "Manger un plat maison" : "Grignoter"), cost: 1, mood: 1, energy: 3,
    apply: (s) => {
      if (s.apt.meals > 0) { s.apt.meals--; s.satiety = clamp(s.satiety + 55); s.mood += 3; s.apt.dishes = Math.min(4, s.apt.dishes + 1); }
      else { s.satiety = clamp(s.satiety + 30); s.money -= 5; }
    } },
  { id: "sleep", at: "bed", label: "Dormir", cost: 0, mood: 0, energy: 0 },
  { id: "nap", at: "bed", label: "Faire une sieste", cost: 1, mood: 1, energy: 20, apply: (s) => { s.apt.bedMade = false; } },
  { id: "makebed", at: "bed", label: "Faire le lit", cost: 0, mood: 1, energy: 0, when: (s) => !s.apt.bedMade,
    apply: (s) => { s.apt.bedMade = true; s.tidy = clamp(s.tidy + 8); } },
  { id: "shower", at: "bath", label: "Prendre une douche", cost: 1, mood: 4, energy: 6 },
  { id: "read", at: "armchair", label: "Lire", cost: 1, mood: 5, energy: 2, rest: true, apply: (s) => { s.apt.bookOut = true; } },
  { id: "rest", at: "armchair", label: "Ne rien faire", cost: 1, mood: 2, energy: 9, rest: true },
  { id: "window", at: "window", label: "Regarder dehors", cost: 1, mood: 3, energy: 3, rest: true },
  { id: "water", at: "plant", label: "S'occuper de la plante", cost: 1, mood: 3, energy: -1,
    apply: (s) => { s.apt.plantWater = 100; } },
  { id: "tidy", at: "basket", label: "Ranger", cost: 1, effort: true, mood: 2, energy: -4,
    apply: (s) => { if (s.tidy < 40) s.mood += 3; s.tidy = clamp(s.tidy + 40); s.apt.bookOut = false; s.apt.bedMade = true; } },
];

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id)!;
export const labelOf = (a: ActionDef, s: State) => (typeof a.label === "function" ? a.label(s) : a.label);

export type Blocked = null | "units" | "heavy";

/** Pourquoi une action n'est pas possible maintenant (null = possible). */
export function blocked(s: State, a: ActionDef): Blocked {
  if (a.cost > s.units) return "units";
  if (a.effort && a.cost > s.units - s.heavy) return "heavy";
  return null;
}

export function actionsAt(s: State, at: string): ActionDef[] {
  return ACTIONS.filter((a) => a.at === at && (!a.when || a.when(s)));
}

export interface Outcome { dMood: number; tierChanged: boolean; dayOver: boolean }

function recentCount(s: State, id: string, days: number): number {
  let n = 0;
  for (let i = Math.max(0, s.log.length - days); i < s.log.length; i++) n += s.log[i].filter((x) => x === id).length;
  return n;
}

/** Applique une action (hors « dormir », géré par endDay). */
export function applyAction(s: State, id: string): Outcome {
  const a = actionById(id);
  const before = s.mood;
  const prevTier = s.tier;
  const nToday = s.today.filter((x) => x === id).length;

  let dm = a.mood;
  if (dm > 0) {
    dm = dm / (1 + 0.6 * nToday); // la même chose en boucle fait moins d'effet
    if (a.cost > 0 && nToday === 0 && recentCount(s, id, 2) === 0) dm += 1; // petit goût de nouveauté
    if (s.tier === 0 && !a.effort) dm += 1.5; // tout en bas, les gestes doux portent davantage
  } else if (dm < 0) {
    dm -= 2 * nToday; // s'acharner pèse un peu plus à chaque fois
  }
  if (a.effort) {
    if (s.energy < 25) dm -= 3;
    if (s.satiety < 25) dm -= 2;
  }
  if (a.rest) dm += s.tidy > 70 ? 1 : s.tidy < 30 ? -1 : 0;

  let money = a.money ?? 0;
  if (money > 0 && s.energy < 25) money = Math.round(money * 0.7); // fatigué, on avance moins

  s.mood += dm;
  s.energy = clamp(s.energy + a.energy);
  s.satiety = clamp(s.satiety + (a.satiety ?? 0) - 3 * a.cost);
  s.money += money;
  a.apply?.(s);
  if (a.cost > 0 && id !== "tidy" && id !== "dishes") s.tidy = clamp(s.tidy - 2);

  s.mood = clamp(s.mood, 8, 100);
  s.tier = tierOf(s.mood, s.tier);
  const fromHeavy = a.effort ? 0 : Math.min(s.heavy, a.cost);
  s.heavy -= fromHeavy;
  s.units -= a.cost;
  s.today.push(id);
  return { dMood: s.mood - before, tierChanged: s.tier !== prevTier, dayOver: s.units <= 0 };
}

/** La nuit passe : repos, faim, l'appartement vit sa vie, puis un nouveau jour commence. */
export function endDay(s: State): void {
  const left = s.units;
  s.moodDays.push(s.mood);
  s.log.push(s.today);

  if (s.energy < 15) s.mood -= 3; // couché épuisé
  s.energy = clamp(s.energy + 45 + 7 * left - (s.satiety < 20 ? 10 : 0));
  s.satiety = clamp(s.satiety - 35);
  if (s.satiety <= 0) s.mood -= 3;
  if (s.apt.dishes > 2) s.mood -= 1;
  s.tidy = clamp(s.tidy - 6);

  if (s.apt.plantWater > 40) s.apt.plantGrowth = Math.min(12, s.apt.plantGrowth + 0.5);
  s.apt.plantWater = clamp(s.apt.plantWater - 22);
  s.apt.bedMade = false;

  s.mood += (50 - s.mood) * 0.06 - 4; // la nuit ramène doucement vers le milieu ; rien n'est acquis, rien n'est perdu
  s.mood = clamp(s.mood, 12, 100); // demain existe encore
  s.tier = tierOf(s.mood, s.tier);

  s.day++;
  s.units = UNITS;
  s.today = [];
  s.heavy = s.tier === 0 ? 2 : s.tier === 1 && s.energy < 40 ? 1 : 0;
}

export const cycleOf = (s: State) => Math.floor(s.day / DAYS_PER_CYCLE);
export const isOver = (s: State) => s.day >= TOTAL_DAYS;

/** Moment de la journée, 0 (matin) à 1 (nuit), d'après les unités dépensées. */
export const phaseOf = (s: State) => (UNITS - s.units) / UNITS;
export function phaseName(p: number): string {
  return p < 0.3 ? "matin" : p < 0.6 ? "journée" : p < 0.9 ? "soir" : "nuit";
}

const KEY = "happy-daily-save-v1";
export function save(s: State): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible : on joue sans sauvegarde */ }
}
export function load(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s && s.v === 1 ? s : null;
  } catch { return null; }
}
export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* rien */ }
}
