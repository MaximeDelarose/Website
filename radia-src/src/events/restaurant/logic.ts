/**
 * Logique PURE du dîner « Devine ce que je prends » (aucun DOM).
 * Trois structures distinctes :
 *  - radiaMenu   : le menu choisi par Radia (entrée, plat, dessert) ;
 *  - predictions : ce que Radia PENSE qu'Auguste prendra (jamais modifié après validation) ;
 *  - augusteMenu : le menu d'Auguste = COPIE de radiaMenu (jamais aléatoire, jamais lié aux prédictions).
 */

export type Step = 'starter' | 'main' | 'dessert';
export const STEPS: readonly Step[] = ['starter', 'main', 'dessert'] as const;

export const STARTER_IDS = ['burrata', 'salade', 'soupe', 'feuillete'] as const;
export const MAIN_IDS = ['truffe', 'risotto', 'poulet', 'saumon', 'pizza', 'burger'] as const;
export const DESSERT_IDS = ['fondant', 'tiramisu', 'cheesecake', 'brulee', 'glace'] as const;
export type StarterId = (typeof STARTER_IDS)[number];
export type MainId = (typeof MAIN_IDS)[number];
export type DessertId = (typeof DESSERT_IDS)[number];
export type DishId = StarterId | MainId | DessertId;

export interface MenuChoice { starter: StarterId; main: MainId; dessert: DessertId }
/** Prédictions : mêmes clés que le menu, mais sémantiquement distinctes. */
export type Predictions = MenuChoice;

export const MENU_STYLES = ['restaurant', 'palace', 'rooftop', 'hotel'] as const;
export type MenuStyle = (typeof MENU_STYLES)[number];

export const STEP_IDS: Record<Step, readonly DishId[]> = {
  starter: STARTER_IDS,
  main: MAIN_IDS,
  dessert: DESSERT_IDS,
};

export const DISH_NAMES: Record<DishId, string> = {
  burrata: 'Burrata et tomates',
  salade: 'Salade gourmande',
  soupe: 'Soupe de saison',
  feuillete: 'Feuilleté au fromage',
  truffe: 'Pâtes à la truffe',
  risotto: 'Risotto aux champignons',
  poulet: 'Poulet rôti et pommes de terre',
  saumon: 'Saumon et légumes',
  pizza: 'Pizza artisanale',
  burger: 'Burger gastronomique',
  fondant: 'Fondant au chocolat',
  tiramisu: 'Tiramisu',
  cheesecake: 'Cheesecake',
  brulee: 'Crème brûlée',
  glace: 'Glace',
};

export const STEP_LABEL: Record<Step, string> = { starter: 'Entrée', main: 'Plat', dessert: 'Dessert' };

export const isStyle = (v: unknown): v is MenuStyle => typeof v === 'string' && (MENU_STYLES as readonly string[]).includes(v);
export const styleOf = (v: unknown): MenuStyle => (isStyle(v) ? v : 'restaurant');

export function isMenu(v: unknown): v is MenuChoice {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return (STARTER_IDS as readonly unknown[]).includes(m.starter)
    && (MAIN_IDS as readonly unknown[]).includes(m.main)
    && (DESSERT_IDS as readonly unknown[]).includes(m.dessert);
}

/** Retire le contenu d'un objet menu pour n'en garder que les 3 ids (copie fraîche). */
export const cloneMenu = (m: MenuChoice): MenuChoice => ({ starter: m.starter, main: m.main, dessert: m.dessert });

/** Le menu d'Auguste : TOUJOURS une copie exacte du menu de Radia. Pure, déterministe, sans aléa. */
export const augusteMenuFor = (radiaMenu: MenuChoice): MenuChoice => cloneMenu(radiaMenu);

export interface GuessEval {
  hits: number;
  perStep: Record<Step, boolean>;
  perfect: boolean;
}

/** Compare les prédictions au menu de Radia (= celui d'Auguste). N'altère aucune entrée. */
export function evaluateGuess(radiaMenu: MenuChoice, predictions: Predictions): GuessEval {
  const perStep = {
    starter: predictions.starter === radiaMenu.starter,
    main: predictions.main === radiaMenu.main,
    dessert: predictions.dessert === radiaMenu.dessert,
  };
  const hits = (perStep.starter ? 1 : 0) + (perStep.main ? 1 : 0) + (perStep.dessert ? 1 : 0);
  return { hits, perStep, perfect: hits === 3 };
}

export const isChocolateDessert = (d: DessertId): boolean => d === 'fondant';

/** Mélange de Fisher-Yates avec un rng fourni (retourne une NOUVELLE liste). */
export function shuffled<T>(list: readonly T[], rng: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Propositions d'une étape : TOUS les choix, dans un ordre mélangé. */
export const proposalsFor = (step: Step, rng: () => number): DishId[] => shuffled(STEP_IDS[step], rng);

/** Menu par défaut cohérent (quand guessMenu ne trouve pas de menu de Radia). */
export function defaultMenu(rng: () => number): MenuChoice {
  const pick = <T>(l: readonly T[]): T => l[Math.min(l.length - 1, Math.floor(rng() * l.length))];
  return { starter: pick(STARTER_IDS), main: pick(MAIN_IDS), dessert: pick(DESSERT_IDS) };
}

// ------------------------------------------------------------------ dialogues

const pickV = (list: readonly string[], repeat: number, rng: () => number): string =>
  list[(Math.floor(rng() * list.length) + repeat) % list.length];

export const LINE_INTRO = 'Bon, maintenant essaie de deviner ce que je vais prendre, moi.';
export const LINE_ALL = 'Mais comment tu fais pour me connaître aussi bien, galbi ?';
export const LINE_NOT_ALL = 'Tu pensais vraiment que j’allais choisir autre chose que toi ?';
export const LINE_RULE = 'En fait, je prends comme toi. Comme ça, même quand je sais pas quoi choisir, je sais que je vais aimer.';
/** Variante de la quête « Une soirée avec A ♡ ». */
export const SECRET_INTRO = 'Bon, maintenant tu vas devoir deviner ce que je prends, moi.';
export const SECRET_RULE = 'Bon… j’avoue. J’ai pris exactement comme toi.';
export const LINE_CHOCO = 'Bon, là c’était trop facile… Tu pensais vraiment que j’allais te laisser manger du chocolat toute seule ?';

const ALL_VARIANTS = [
  LINE_ALL,
  'Trois sur trois ! Mais comment tu fais pour me connaître aussi bien ?',
  'Tu lis dans mes pensées, ma reine… Comment tu fais pour me connaître aussi bien ?',
] as const;
const NOT_ALL_VARIANTS = [
  LINE_NOT_ALL,
  'Tu pensais vraiment que j’allais choisir autre chose que toi, ma reine ?',
  'Ah, tu as hésité, hein ? Tu pensais vraiment que j’allais choisir autre chose que toi ?',
] as const;
export const TRANSITIONS = [
  'Ouvre bien tes yeux, ma reine…',
  'Alors, tu es prête pour la vérité ?',
  'Tu as bien réfléchi ? Voyons ça.',
  'Les plats arrivent… suspense !',
] as const;
export const REACTIONS_HIT = ['Oui, c’est ça !', 'Bingo, ma reine !', 'Exactement ce qu’il fallait !'] as const;
export const REACTIONS_MISS = ['Presque…', 'Pas tout à fait !', 'Ah, raté, mais si mignon !'] as const;
export const CHOICE_ASKS: Record<Step, readonly string[]> = {
  starter: ['Pour commencer, quelle entrée ?', 'Son entrée, à ton avis ?', 'Que prend-il en entrée ?'],
  main: ['Et pour le plat ?', 'Maintenant, son plat principal…', 'Le plat, alors ?'],
  dessert: ['Et pour finir, le dessert ?', 'Son dessert, à ton avis ?', 'Le mot de la fin : dessert !'],
};

export interface Script { lines: string[]; transition: string }

/** Dialogues de révélation d'Auguste, selon le résultat (phrases exactes toujours présentes dans les variantes). */
export function revealScript(ev: GuessEval, radiaMenu: MenuChoice, repeat: number, rng: () => number, secret = false): Script {
  const lines: string[] = [];
  lines.push(ev.perfect ? pickV(ALL_VARIANTS, repeat, rng) : pickV(NOT_ALL_VARIANTS, repeat, rng));
  lines.push(secret ? SECRET_RULE : LINE_RULE);
  if (isChocolateDessert(radiaMenu.dessert)) lines.push(LINE_CHOCO);
  return { lines, transition: pickV(TRANSITIONS, repeat, rng) };
}
export const reactionFor = (hit: boolean, repeat: number, rng: () => number): string =>
  pickV(hit ? REACTIONS_HIT : REACTIONS_MISS, repeat, rng);
export const askFor = (step: Step, repeat: number, rng: () => number): string => pickV(CHOICE_ASKS[step], repeat, rng);

export const MENU_TITLES: Record<MenuStyle, { title: string; sub: string }> = {
  restaurant: { title: 'La carte', sub: 'Choisis ton menu ♡' },
  palace: { title: 'Carte du Palace', sub: 'Un dîner d’exception' },
  rooftop: { title: 'Ardoise du rooftop', sub: 'Coucher de soleil au menu' },
  hotel: { title: 'Room service', sub: 'Servi en chambre' },
};
