/**
 * Cerveau de conversation de Tindeur ET de Snapchien : un même personnage (adulte, fictif) a une seule personnalité, une seule mémoire
 * et un seul rythme dans tout le téléphone. Logique PURE (aucun DOM), testée dans tests/brain-*.test.ts.
 */
export type Arch = 'joker' | 'badjoker' | 'flirt' | 'serious' | 'chill' | 'gentle' | 'shy' | 'sporty' | 'skeptic';
/** Façon de réagir quand Radia dit qu'elle est divorcée et mère de trois enfants. */
export type KidsTone = 'interested' | 'surprised' | 'clumsy' | 'hesitant' | 'respectful' | 'funny' | 'admiring';
/** Ce qu'il pense de l'amitié homme-femme (quand Radia dit chercher des amis). */
export type FriendStance = 'believer' | 'doubter' | 'honest' | 'open' | 'cheeky' | 'debater';
export type Hours = 'morning' | 'day' | 'night';

export interface Persona {
  id: string; name: string; arch: Arch; kids: KidsTone; friend: FriendStance;
  /** Audace des demandes de photo (0 = n'en demande jamais le premier, 3 = direct mais respectueux). */
  bold: 0 | 1 | 2 | 3;
  /** Penchant pour jouer avec le prénom « Radia » (0 = jamais, 3 = souvent). */
  nameplay: 0 | 1 | 2 | 3;
  /** Rythme : plage horaire préférée et délai minimal entre deux messages spontanés (heures). */
  hours: Hours; gapH: number;
  /** Petite signature de langage (ajoutée avec parcimonie). */
  tic: string;
  /** Réaction (1 à 2 bulles) à « divorcée, trois enfants » : propre à chaque personnage. */
  kidsLine: string[];
  /** Première réaction quand Radia dit chercher seulement des amis. */
  friendLine: string;
  /** Jeu de mots / taquinerie sur le prénom, propre au personnage. */
  nameLine: string;
  /** Mini-histoires de son quotidien (« Raconte ! »). */
  anecdotes: string[];
  /** Messages spontanés propres à son univers. */
  openers: string[];
  /** Blagues (volontairement nulles pour certains) et leur rattrapage quand Radia se moque. */
  jokes: { setup: string; recover: string }[];
}

// ------------------------------------------------------------------ mémoire
export type TopicId = 'smalltalk' | 'banter' | 'name' | 'kids' | 'friend' | 'single' | 'photo' | 'callback' | 'anecdote' | 'joke' | 'relance' | 'snapfollow' | 'flame';
export interface Thread { topic: TopicId; step: number; data?: string }
export interface PhotoMem {
  /** Demandes de selfie faites par lui et date de la dernière. */
  asks: number; lastAskAt: number;
  /** Refus explicite : plus jamais de demande ; report doux (« plus tard ») : pas avant `holdUntil`. */
  noMore: boolean; holdUntil: number;
  /** Photos de Radia reçues (type) et snaps qu'il a envoyés (scène, date). */
  hers: string[]; his: { scene: string; at: number }[];
  /** La dernière demande est sans réponse (une seule relance légère autorisée). */
  pending: boolean; relanced: boolean;
}
export interface CharMem {
  /** kids : 0 inconnu · 1 « des enfants » · 2 « divorcée, trois enfants » · 3 sujet refusé. friends : 0 inconnu · 1 « que des amis » · 2 « on verra ». */
  facts: { kids: 0 | 1 | 2 | 3; friends: 0 | 1 | 2; single: 0 | 1 | 2 };
  /** Affinité : monte quand Radia joue le jeu, baisse quand elle l'envoie balader ; < -2 : il s'éloigne. */
  aff: number;
  turns: number; talkedAt: number; lastTopic: TopicId | '';
  topics: Partial<Record<TopicId, number>>;
  recent: string[];
  nameUses: number; lastNameTurn: number; bad: number;
  thread: Thread | null;
  /** Dernier groupe de réponses proposées à Radia (identifiants). */
  offered: string[];
  told: string[];
  photo: PhotoMem;
  /** Sujets dont il peut se souvenir (« callbacks »), du plus ancien au plus récent. */
  memories: string[];
  /** Il s'est éloigné (intérêt perdu) ; il reste cordial mais n'écrit plus spontanément. */
  faded: boolean; blocked: boolean;
  /** Dernière question qu'il lui a posée (« job », « hobby », « day »…) : sa réponse libre est lue comme une réponse. */
  ask: string;
  /** Mots que Radia a employés récemment (pour y revenir plus tard : « tu parlais de … »). */
  said: string[];
}
export interface BrainState { v: 1; chars: Record<string, CharMem> }

export interface Choice { id: string; text: string }
export interface Beat { say: string[]; topic: TopicId; choices: Choice[]; /** vrai : il propose une photo / un snap en retour. */ wantsPhoto?: boolean; /** Radia vient d'accepter son Snapchien : à ajouter à ses contacts. */ addSnap?: boolean; /** Il propose Snapchien. */ offersSnap?: boolean }
export interface RngLike { next(): number; int(n: number): number }
