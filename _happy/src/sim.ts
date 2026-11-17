import { morningSocial } from "./people";
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

export type Weather = "sun" | "cloud" | "rain" | "storm" | "warm";
export type Feel = "joy" | "ok" | "tired" | "down";
export interface Person { bond: number; feel: Feel; story: number; last: number; called: number }
export interface Msg {
  id: number; from: string; day: number; kind: "news" | "visit" | "out" | "care";
  text: string; replies: { t: string; fit: 0 | 1 | 2 }[]; read: boolean; answer: number; // answer : -1 tant qu'on n'a pas répondu
}
export interface Visit { who: string; need: "drink" | "talk" | "sit"; done: number; arrived: boolean }

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
  seed: number;
  weather: Weather;
  trash: number; // 0..5
  people: Record<string, Person>;
  inbox: Msg[];
  msgId: number;
  invites: Record<string, number>; // sortie proposée → dernier jour où elle tient
  visit: Visit | null;
  mail: string[]; // courrier qui attend dans la boîte
  parcels: string[]; // colis qui attendent dans le hall
  orders: string[]; // commandes en route (arrivent le lendemain)
  decor: string[]; // objets installés dans l'appartement
  memories: { day: number; id: string }[];
  wallNote: number; wallSeen: boolean; // mur des pensées
  flags: Record<string, number>;
  lastSocial: number;
  powerOut: boolean; noisy: boolean;
  events: string[]; // ce qui s'est passé ce matin (pour l'affichage)
}

export function newState(): State {
  return {
    v: 1, day: 0, units: UNITS, heavy: 0, mood: 46, tier: 2, energy: 70, satiety: 55, tidy: 62, money: 120,
    apt: { mug: false, bedMade: false, dishes: 1, bookOut: false, plantGrowth: 2, plantWater: 55, meals: 0 },
    today: [], log: [], moodDays: [], sheepDay: -9, started: false,
    seed: Math.floor(Math.random() * 1e9), weather: "sun", trash: 1,
    people: {
      lou: { bond: 55, feel: "ok", story: 0, last: 0, called: -1 },
      sam: { bond: 45, feel: "ok", story: 0, last: 0, called: -1 },
      ines: { bond: 25, feel: "tired", story: 0, last: 0, called: -1 },
      noe: { bond: 10, feel: "ok", story: 0, last: 0, called: -1 },
    },
    inbox: [], msgId: 1, invites: {}, visit: null, mail: [], parcels: [], orders: [], decor: [], memories: [],
    wallNote: 0, wallSeen: false, flags: {}, lastSocial: 0, powerOut: false, noisy: false, events: [],
  };
}

export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/** Hasard reproductible : même graine, même jour, même question → même réponse. */
export function rnd(s: State, salt: number, day = s.day): number {
  let t = (s.seed + day * 7919 + salt * 104729) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

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
  passive?: boolean;
  group?: "out"; // rangé dans le sous-menu « Sortir »
  outing?: string; // petite scène-souvenir à jouer
  social?: string; // personne avec qui on passe ce moment
  power?: boolean; // a besoin d'électricité
  apply?: (s: State) => void;
}

export const DECOR: { id: string; name: string; price: number }[] = [
  { id: "frame", name: "Cadre photo", price: 20 },
  { id: "cushion", name: "Coussins", price: 25 },
  { id: "poster", name: "Affiche", price: 30 },
  { id: "plaid", name: "Plaid", price: 40 },
  { id: "lights", name: "Guirlande", price: 45 },
  { id: "record", name: "Tourne-disque", price: 110 },
];
const invited = (id: string) => (s: State) => (s.invites[id] ?? -1) >= s.day;
const eatOut = (s: State) => { s.satiety = clamp(s.satiety + 70); };

export const ACTIONS: ActionDef[] = [
  { id: "work", at: "desk", label: "Travailler", cost: 2, effort: true, power: true, mood: -3, energy: -15, satiety: -8, money: 70 },
  { id: "draw", at: "desk", label: "Dessiner", cost: 2, effort: true, mood: 8, energy: -6, satiety: -5 },
  { id: "play", at: "desk", label: "Jouer un peu", cost: 1, passive: true, power: true, mood: 5, energy: -2 },
  { id: "cook", at: "counter", label: "Cuisiner", cost: 2, effort: true, mood: 4, energy: -5, money: -8,
    apply: (s) => { s.apt.meals = Math.min(3, s.apt.meals + 2); s.apt.dishes = Math.min(4, s.apt.dishes + 1); s.trash = Math.min(5, s.trash + 1); } },
  { id: "tea", at: "counter", label: "Se faire un thé", cost: 1, mood: 3, energy: 4, rest: true, apply: (s) => { s.apt.mug = true; } },
  { id: "dishes", at: "counter", label: "Faire la vaisselle", cost: 1, effort: true, mood: 2, energy: -3,
    when: (s) => s.apt.dishes > 0 || s.apt.mug,
    apply: (s) => { s.apt.dishes = 0; s.apt.mug = false; s.tidy = clamp(s.tidy + 12); } },
  { id: "eat", at: "fridge", label: (s) => (s.apt.meals > 0 ? "Manger un plat maison" : "Grignoter"), cost: 1, mood: 1, energy: 3,
    apply: (s) => {
      s.trash = Math.min(5, s.trash + 1);
      if (s.apt.meals > 0) { s.apt.meals--; s.satiety = clamp(s.satiety + 55); s.mood += 3; s.apt.dishes = Math.min(4, s.apt.dishes + 1); }
      else { s.satiety = clamp(s.satiety + 30); s.money -= 5; }
    } },
  { id: "sleep", at: "bed", label: "Dormir", cost: 0, mood: 0, energy: 0 },
  { id: "nap", at: "bed", label: "Faire une sieste", cost: 1, passive: true, mood: 1, energy: 20, apply: (s) => { s.apt.bedMade = false; } },
  { id: "makebed", at: "bed", label: "Faire le lit", cost: 0, mood: 1, energy: 0, when: (s) => !s.apt.bedMade,
    apply: (s) => { s.apt.bedMade = true; s.tidy = clamp(s.tidy + 8); } },
  { id: "shower", at: "bath", label: "Prendre une douche", cost: 1, mood: 4, energy: 6 },
  { id: "read", at: "armchair", label: "Lire", cost: 1, mood: 5, energy: 2, rest: true, apply: (s) => { s.apt.bookOut = true; } },
  { id: "rest", at: "armchair", label: "Ne rien faire", cost: 1, passive: true, mood: 2, energy: 9, rest: true },
  { id: "window", at: "window", label: "Regarder dehors", cost: 1, mood: 3, energy: 3, rest: true },
  { id: "water", at: "plant", label: "S'occuper de la plante", cost: 1, mood: 3, energy: -1,
    apply: (s) => { s.apt.plantWater = 100; } },
  { id: "tidy", at: "basket", label: "Ranger", cost: 1, effort: true, mood: 2, energy: -4,
    apply: (s) => { if (s.tidy < 40) s.mood += 3; s.tidy = clamp(s.tidy + 40); s.apt.bookOut = false; s.apt.bedMade = true; } },
  { id: "music", at: "record", label: "Écouter un disque", cost: 1, mood: 4, energy: 2, rest: true, when: (s) => s.decor.includes("record") },

  { id: "nuages", at: "phone", label: "Jouer à Nuages", cost: 1, passive: true, mood: 3, energy: -1 },

  // La porte : le hall, et dehors.
  { id: "hall", at: "door", label: "Descendre dans le hall", cost: 0, mood: 0, energy: 0 },
  { id: "park", at: "door", group: "out", label: "Balade au parc", cost: 1, mood: 5, energy: -3, outing: "park", when: (s) => s.weather !== "storm" },
  { id: "cafe", at: "door", group: "out", label: "Prendre un café dehors", cost: 1, mood: 4, energy: 3, money: -5, outing: "cafe" },
  { id: "resto", at: "door", group: "out", label: "Aller au restaurant", cost: 2, mood: 6, energy: 2, money: -24, outing: "resto", apply: eatOut },
  { id: "rdv", at: "door", group: "out", label: "Aller à son rendez-vous", cost: 2, mood: 4, energy: 0, money: -20, outing: "rdv",
    apply: (s) => { if (s.tier <= 1) s.mood += 4; s.flags.rdv = s.day + 3; } },
  { id: "seeSam", at: "door", group: "out", label: "Rejoindre Sam", cost: 2, mood: 8, energy: -2, money: -6, outing: "friend", social: "sam", when: invited("sam") },
  { id: "seeLou", at: "door", group: "out", label: "Manger chez Mamie Lou", cost: 2, mood: 7, energy: 2, outing: "lou", social: "lou", when: invited("lou"), apply: eatOut },
  { id: "seeInes", at: "door", group: "out", label: "Marcher avec Inès", cost: 1, mood: 6, energy: -2, outing: "walk", social: "ines", when: invited("ines") },
  { id: "market", at: "door", group: "out", label: "Vide-grenier du quartier", cost: 1, mood: 5, energy: -2, money: -8, outing: "market", when: invited("market"),
    apply: (s) => { if (!s.decor.includes("globe")) s.decor.push("globe"); delete s.invites.market; } },

  // Le hall.
  { id: "mail", at: "mailbox", label: "Relever le courrier", cost: 0, mood: 0, energy: 0, when: (s) => s.mail.length > 0 },
  { id: "parcel", at: "mailbox", label: "Ouvrir le colis", cost: 0, mood: 2, energy: 0, when: (s) => s.parcels.length > 0,
    apply: (s) => { const id = s.parcels.shift()!; if (!s.decor.includes(id)) s.decor.push(id); } },
  { id: "trash", at: "bins", label: "Vider la poubelle", cost: 1, mood: 2, energy: -2, when: (s) => s.trash > 0,
    apply: (s) => { s.trash = 0; s.tidy = clamp(s.tidy + 10); } },
  { id: "notes", at: "wall", label: "Lire les petits mots", cost: 0, mood: 0, energy: 0,
    apply: (s) => { if (!s.wallSeen) { s.wallSeen = true; s.mood += 3; } } },
  { id: "hello", at: "neighbor", label: "Dire bonjour", cost: 0, mood: 1, energy: 0, when: (s) => s.flags.hello !== s.day,
    apply: (s) => { s.flags.hello = s.day; s.people.noe.bond = clamp(s.people.noe.bond + 2); s.people.noe.last = s.day; } },
  { id: "chat", at: "neighbor", label: "Discuter un moment", cost: 1, mood: 3, energy: 0, social: "noe" },
  { id: "up", at: "stairs", label: "Remonter chez soi", cost: 0, mood: 0, energy: 0 },

  // Quand quelqu'un est là.
  { id: "vDrink", at: "visitor", label: "Préparer un verre", cost: 1, mood: 3, energy: -1, when: (s) => !!s.visit?.arrived, apply: (s) => visitMoment(s, "drink") },
  { id: "vTalk", at: "visitor", label: "Discuter", cost: 1, mood: 3, energy: -1, when: (s) => !!s.visit?.arrived, apply: (s) => visitMoment(s, "talk") },
  { id: "vSit", at: "visitor", label: "Rester assis ensemble", cost: 1, mood: 3, energy: 3, when: (s) => !!s.visit?.arrived, apply: (s) => visitMoment(s, "sit") },
];

/** Un moment partagé pendant une visite : tomber juste compte, mais être là compte déjà. */
function visitMoment(s: State, kind: Visit["need"]): void {
  const v = s.visit!, p = s.people[v.who];
  const match = v.need === kind;
  p.bond = clamp(p.bond + (match ? 8 : 4));
  if (match) { s.mood += 2; if (p.feel === "down" || p.feel === "tired") p.feel = "ok"; }
  p.last = s.day; s.lastSocial = s.day;
  v.done++;
  v.need = v.need === "drink" ? "talk" : "sit";
}

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id)!;
export const labelOf = (a: ActionDef, s: State) => (typeof a.label === "function" ? a.label(s) : a.label);

export type Blocked = null | "units" | "heavy" | "power" | "money";

/** Pourquoi une action n'est pas possible maintenant (null = possible). */
export function blocked(s: State, a: ActionDef): Blocked {
  if (a.power && s.powerOut) return "power";
  if (a.cost > s.units) return "units";
  if ((a.money ?? 0) < 0 && s.money + (a.money ?? 0) < 0) return "money";
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
export function applyAction(s: State, id: string, bonus = 0): Outcome {
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
  // La météo teinte les moments, sans jamais punir.
  const wet = s.weather === "rain" || s.weather === "storm";
  if (a.rest && wet) dm += 1;
  if ((id === "park" || id === "seeInes" || id === "window") && (s.weather === "sun" || s.weather === "warm")) dm += 1.5;
  if (id === "draw" && s.flags.inspired === s.day) dm += 3;
  if (a.social) {
    const p = s.people[a.social];
    dm += p.bond > 60 ? 1 : 0;
    p.bond = clamp(p.bond + (a.outing ? 10 : 6));
    p.last = s.day; s.lastSocial = s.day;
    if (a.outing) delete s.invites[a.social];
  }
  if (a.outing) s.memories.push({ day: s.day, id: a.outing });

  dm += bonus;
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
  if (s.visit) { s.people[s.visit.who].bond = clamp(s.people[s.visit.who].bond - (s.visit.done ? 0 : 2)); s.visit = null; }
  s.energy = clamp(s.energy + 45 + 7 * left - (s.satiety < 20 ? 10 : 0) - (s.noisy ? 10 : 0));
  if (s.trash >= 4) s.tidy = clamp(s.tidy - 3);
  s.satiety = clamp(s.satiety - 35);
  if (s.satiety <= 0) s.mood -= 3;
  if (s.apt.dishes > 2) s.mood -= 1;
  s.tidy = clamp(s.tidy - 6);

  if (s.apt.plantWater > 40) s.apt.plantGrowth = Math.min(12, s.apt.plantGrowth + 0.5);
  s.apt.plantWater = clamp(s.apt.plantWater - 22);
  s.apt.bedMade = false;

  s.mood += (50 - s.mood) * 0.06 - ((s.flags.rdv ?? -1) >= s.day ? 2 : 4); // la nuit ramène doucement vers le milieu ; rien n'est acquis, rien n'est perdu
  s.mood = clamp(s.mood, 12, 100); // demain existe encore
  s.tier = tierOf(s.mood, s.tier);

  s.day++;
  s.units = UNITS;
  s.today = [];
  s.heavy = s.tier === 0 ? 2 : s.tier === 1 && s.energy < 40 ? 1 : 0;
  morning(s, left);
}

export const RENT = 220;
const WEATHERS: [Weather, number][] = [["sun", 0.34], ["cloud", 0.26], ["rain", 0.2], ["warm", 0.14], ["storm", 0.06]];

/** Ce que le nouveau jour apporte : météo, courrier, petits imprévus. Dépend en partie de la veille. */
function morning(s: State, unitsLeftLastNight: number): void {
  const y = s.log[s.log.length - 1] ?? [];
  s.events = [];
  const prev = s.weather;
  let r = rnd(s, 1);
  s.weather = "sun";
  for (const [w, p] of WEATHERS) { if (r < p) { s.weather = w; break; } r -= p; }
  if (s.weather === "storm" && prev === "storm") s.weather = "cloud";
  s.powerOut = s.weather === "storm" && rnd(s, 2) < 0.5;
  if (s.powerOut) s.events.push("power");
  s.noisy = rnd(s, 3) < 0.1;

  // Loyer : il tombe au début de chaque cycle.
  if (s.day % DAYS_PER_CYCLE === 0) {
    s.money -= RENT;
    s.events.push(s.money < 0 ? "tight" : "rent");
    if (s.money < 0) s.mood -= 4;
  } else if (s.day % DAYS_PER_CYCLE === DAYS_PER_CYCLE - 1 && s.money < RENT) s.mail.push("bill");

  if (unitsLeftLastNight >= 1 && s.satiety >= 20 && s.tier >= 2) { s.energy = clamp(s.energy + 10); s.events.push("fresh"); }
  else if (y.filter((id) => actionById(id)?.passive).length >= 4) { s.energy = clamp(s.energy - 8); s.events.push("slump"); }
  if ((y.includes("shower") || y.includes("read")) && rnd(s, 4) < 0.3) { s.flags.inspired = s.day; s.events.push("inspired"); }
  if (s.day - s.lastSocial >= 6 && (s.flags.silence ?? -9) <= s.day - 4) { s.flags.silence = s.day; s.mood -= 2; s.events.push("silence"); }

  // Colis : commandes de la veille, ou une surprise de temps en temps.
  if (s.orders.length) { s.parcels.push(...s.orders); s.orders = []; s.events.push("parcel"); }
  else if (s.day > 2 && !s.decor.includes("cactus") && !s.parcels.includes("cactus") && rnd(s, 5) < 0.08) { s.parcels.push("cactus"); s.events.push("parcel"); }

  // Courrier.
  if (s.people.lou.bond >= 45 && rnd(s, 6) < 0.12 && !s.mail.includes("lou")) s.mail.push("lou");
  if (s.people.noe.bond >= 30 && rnd(s, 7) < 0.15 && !s.mail.includes("noe")) s.mail.push("noe");
  if (s.day > 4 && (s.invites.market ?? -1) < s.day && !s.decor.includes("globe") && rnd(s, 8) < 0.1 && !s.mail.includes("market")) s.mail.push("market");

  // Mur des pensées : un nouveau mot, rarement.
  if (s.wallSeen && rnd(s, 9) < 0.22) { s.wallNote++; s.wallSeen = false; }
  s.mood = clamp(s.mood, 12, 100);
  s.tier = tierOf(s.mood, s.tier);
  morningSocial(s);
}

/** Ouvre le courrier : chaque pli a son petit effet. */
export function openMail(s: State): string[] {
  const got = s.mail;
  s.mail = [];
  for (const m of got) {
    if (m === "lou") { s.mood += 3; s.people.lou.bond = clamp(s.people.lou.bond + 3); }
    if (m === "noe") { s.apt.meals = Math.min(3, s.apt.meals + 1); s.mood += 2; }
    if (m === "market") s.invites.market = s.day + 2;
  }
  s.mood = clamp(s.mood, 8, 100);
  s.tier = tierOf(s.mood, s.tier);
  return got;
}

export function buy(s: State, id: string): boolean {
  const d = DECOR.find((x) => x.id === id);
  if (!d || s.money < d.price || s.decor.includes(id) || s.orders.includes(id) || s.parcels.includes(id)) return false;
  s.money -= d.price;
  s.orders.push(id);
  return true;
}

/** Le voisin est-il dans le hall en ce moment ? */
export const neighborHere = (s: State) => rnd(s, 20 + Math.floor((UNITS - s.units) / 3)) < 0.5;

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
    if (!s || s.v !== 1) return null;
    const base = newState();
    return { ...base, ...s, apt: { ...base.apt, ...s.apt }, people: { ...base.people, ...(s.people ?? {}) } };
  } catch { return null; }
}
export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* rien */ }
}
