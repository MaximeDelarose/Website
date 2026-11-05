/**
 * Invitations surprises : contrats partagés (données pures, sans DOM).
 * Tout événement est une suite d'ÉTAPES ; les mini-jeux sont des « activités » indépendantes
 * enregistrées dans src/events/registry.ts. Les prénoms des enfants ne sont JAMAIS écrits ici :
 * ils arrivent par ctx.kidName() (données chiffrées, libellés neutres sans la clé).
 */
import type { CareerId, ClothId, FurnitureId, KidId, Look, StyleId } from '../data/world/ids';
import type { Expr } from '../data/dialogue';
import type { RelId } from '../data/family/relatives';

export type EventCategory = 'romantic' | 'family' | 'career' | 'golden';
export type Sender = 'auguste' | KidId | RelId | 'agency';

/** Lieux (décors dessinés dans src/events/places). */
export const PLACE_IDS = [
  'restaurant', 'palace', 'fireworks', 'spa', 'hotel', 'cinema', 'flowerMarket', 'rooftop', 'ballroom',
  'garden', 'pajama', 'boutique', 'stage', 'studio', 'home', 'fountain', 'momHome', 'airport',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

/** Mini-jeux (modules dans src/events/activities). */
export const ACTIVITY_IDS = [
  'menuPick', 'guessMenu', 'photoBooth', 'bouquet', 'chocolateBox', 'decorTable', 'shopTry',
  'rhythmDance', 'fireworksPhoto', 'spaRelax', 'cinemaQuiz', 'memoryChallenge', 'fashionThemes', 'careerGame',
  'dressVerdict', 'photoShoot', 'braceletReveal', 'necklaceNight', 'familyPick', 'arrangeCare',
] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export type Speaker = 'radia' | 'auguste' | 'narrator' | KidId | RelId;
export interface Line { who: Speaker; text: string; expr?: Expr }

export type EventStep =
  | { t: 'dress'; hint: string; style?: StyleId; /** ambiance « soirée exceptionnelle » du dressing */ mood?: 'gala'; onlyIf?: StepCond }
  | { t: 'travel'; place: PlaceId; label: string; onlyIf?: StepCond }
  /** `onlyIf` : la scène n'est jouée que si le résultat d'une activité précédente correspond (ex. issue de l'organisation des enfants). */
  | { t: 'scene'; lines: Line[]; onlyIf?: StepCond }
  | { t: 'activity'; id: ActivityId; params?: Record<string, unknown> }
  | { t: 'photo'; place: PlaceId; title: string; withAuguste?: boolean; withKids?: KidId[]; onlyIf?: StepCond };

/** Condition sur une donnée d'activité : `run.data[activity][field]` doit valoir l'une des valeurs de `in`. */
export interface StepCond { activity: ActivityId; field: string; in: (string | number | boolean)[] }

export interface RewardSpec {
  coins?: number; diamonds?: number; fabric?: number; flowers?: number; cocoa?: number; fans?: number;
  cloth?: ClothId[]; furniture?: FurnitureId[];
}

export interface EventDef {
  id: string;
  title: string;
  sender: Sender;
  category: EventCategory;
  /** Texte court de la notification. */
  teaser: string;
  /** Message complet dans le téléphone. */
  invite: string;
  /** Poids dans le tirage (plus grand = plus probable). */
  weight: number;
  /** Temps de jeu actif minimal (minutes) avant de pouvoir recevoir cette invitation. */
  minPlayMin?: number;
  /** Conditions de progression. */
  needs?: { career?: CareerId | 'any'; chapter?: number; chess?: boolean; doneAll?: string[]; /** n'est proposé qu'après N minutes de jeu actif depuis la fin de cet événement (ex. retrouvailles) */ afterMin?: { id: string; min: number } };
  repeatable: boolean;
  /** Grande invitation (limitée à 2 par 30 min de jeu) ou petit message (discret, plus fréquent). */
  big: boolean;
  /** Enveloppe dorée : rare. */
  golden?: boolean;
  steps: EventStep[];
  /** Première fois / fois suivantes (les rejouables rapportent moins : pas d'exploitation de l'économie). */
  reward: RewardSpec;
  replayReward?: RewardSpec;
  /** Souvenir ajouté au téléphone à la fin. */
  memoryTitle: string;
  /** Succès débloqués (identifiants de src/data/achievements.ts). */
  achievements?: string[];
  /** Quête en plusieurs phases : indicateur de progression clair (de `from` = index d'étape). */
  phases?: { label: string; goal: string; from: number }[];
  /** Nom affiché de l'expéditeur si différent (ex. « A »). */
  senderLabel?: string;
  /** Texte affiché à la conclusion quand aucune récompense chiffrée n'est versée. */
  conclusionNote?: string;
  /** Scène à revoir : ni récompense, ni historique, ni souvenir (ex. revoir la remise du bracelet). */
  ephemeral?: boolean;
}

// ------------------------------------------------------------------ sauvegarde

export interface Invite { runId: string; eventId: string; at: number; state: 'new' | 'seen' | 'later' | 'done' }
export interface PhotoRec {
  id: string; eventId: string; place: PlaceId; title: string; ts: number; look: Look;
  auguste: boolean; kids: KidId[]; pose: number; frame: string; filter: string;
}
export interface ActiveRun {
  runId: string; eventId: string; step: number;
  /** Choix et résultats des activités déjà jouées (persistés). */
  data: Record<string, unknown>;
  origin: { mode: 'title' | 'merge' | 'world'; screen?: string };
  startedAt: number;
}
/** Petit message dans le téléphone (conversation). */
export interface Msg { at: number; from: Sender; text: string; read: boolean }
/** Quête secrète « Une soirée avec A ♡ » : déclenchement après 20 à 30 minutes de jeu ACTIF. */
export interface SecretState {
  /** Temps de jeu actif cumulé depuis le début de la quête (ms). */
  activeMs: number;
  /** Seuil tiré une fois pour toutes entre 20 et 30 minutes (ms). */
  target: number;
  /** L'appel a déjà été déclenché automatiquement (une seule fois). */
  triggered: boolean;
  /** Nombre d'écoutes du message vocal. */
  heard: number;
  runId: string;
}
export interface EventsState {
  secret: SecretState;
  inbox: Invite[];
  msgs: Msg[];
  done: Record<string, { count: number; last: number; best: number }>;
  current: ActiveRun | null;
  photos: PhotoRec[];
  /** runId → instant où la récompense a été versée (une seule fois). */
  claimed: Record<string, number>;
  playMs: number;
  lastInviteAt: number;
  bigLog: number[];
  smallLog: number[];
  lastEventId: string;
  seq: number;
  /** Compteurs libres (restaurant : parties, devinettes parfaites…). */
  counters: Record<string, number>;
}

// ------------------------------------------------------------------ mini-jeux

export interface ActivityResult {
  /** 0–100 */
  score: number;
  ok: boolean;
  /** Données à retenir pour la suite de l'événement (écrites dans run.data[activityId]). */
  data?: Record<string, unknown>;
  tags?: string[];
}

export interface ActivityCtx {
  /** Conteneur plein cadre (safe areas incluses) à remplir ; vide au départ. */
  root: HTMLElement;
  params: Record<string, unknown>;
  /** Tenue actuelle de Radia. */
  look: Look;
  eventId: string;
  runId: string;
  /** Choix et résultats des étapes précédentes (lecture seule ; ex. run.data.menuPick). */
  data: Record<string, unknown>;
  /** Nombre de fois où cet événement a déjà été terminé (varier dialogues / propositions). */
  repeat: number;
  /** Aléatoire déterministe pour ce run (mulberry32). */
  rng: () => number;
  kidName(k: KidId): string;
  /** Bandeau de titre sobre en haut de root. */
  header(title: string, sub?: string): HTMLElement;
  button(label: string, fn: () => void, cls?: string): HTMLButtonElement;
  /** Animation POP (rebond) sur un élément. */
  pop(el: HTMLElement): void;
  confetti(n?: number): void;
  sound(name: 'pop1' | 'pop2' | 'pop3' | 'rare' | 'combo' | 'reward' | 'button' | 'heart' | 'sparkle' | 'whoosh' | 'victory' | 'invalid' | 'page' | 'pickup' | 'drop' | 'deliver'): void;
  wait(ms: number): Promise<void>;
  /** Minuterie annulée si l'événement est quitté. */
  later(fn: () => void, ms: number): void;
  /** Nettoyage à l'abandon / à la fin (listeners window, rAF…). */
  onDispose(fn: () => void): void;
  isAlive(): boolean;
  /** Bulle de dialogue (attend un toucher). */
  say(who: Speaker, text: string, expr?: Expr): Promise<void>;
  /** Canvas d'avatar (Radia : tenue actuelle ; Auguste : illustration détourée avec la clé, sinon dessin). */
  avatar(who: 'radia' | 'auguste', w: number, h: number, opts?: { expr?: Expr; step?: number; arms?: 'down' | 'wave' | 'heart' | 'open' }): HTMLCanvasElement;
  /** Ajoute une photo souvenir à l'album du téléphone (sauvegardée aussitôt). */
  addPhoto(rec: Omit<PhotoRec, 'id' | 'ts' | 'eventId' | 'look'> & { look?: Look }): PhotoRec;
}

export type Activity = (ctx: ActivityCtx) => Promise<ActivityResult>;
