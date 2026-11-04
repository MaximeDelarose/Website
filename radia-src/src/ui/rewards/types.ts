/** Types de l'API « ouverture de cadeaux et de coffres ». Aucun DOM, aucune dépendance. */

export type GiftKind = 'start' | 'daily' | 'chest' | 'event' | 'premium' | 'romantic';
export type GiftRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type RewardType =
  | 'coins' | 'diamonds' | 'energy' | 'tickets' | 'hearts'
  /** Ressource du monde : `id` = flowers | fabric | cocoa | coins. */
  | 'res'
  | 'cloth' | 'furniture'
  /** Coffre bonus (Endless : jauge de trésor). */
  | 'chest'
  /** Souvenir de l'album : `id` = identifiant du souvenir. */
  | 'memory'
  /** Bouquet rare : `id` = clé « rose+tulip ». */
  | 'bouquet'
  /** Booster : `id` = wand | wind. Tout autre `id` : objet seulement affiché (jamais attribué). */
  | 'item';

export interface Reward {
  type: RewardType;
  id?: string;
  qty: number;
  /** Libellé affiché (sinon déduit du type). */
  label?: string;
  /** Image (URL data:/blob:/relative) ; sinon icône dessinée. */
  icon?: string;
  /** Rareté de la vignette (sinon déduite). */
  rarity?: GiftRarity;
  /** `true` : DÉJÀ attribué par l'appelant (affichage seulement, jamais ajouté deux fois). */
  granted?: boolean;
}

export interface GiftSpec {
  kind: GiftKind;
  rarity: GiftRarity;
  title: string;
  subtitle?: string;
  rewards: Reward[];
  /** Bulle de message d'Auguste (ton naturel), affichée avec les récompenses. */
  message?: string;
  /** Cadeaux suivants (au total 3 au plus, tout compris). */
  chain?: GiftSpec[];
  /** Clé d'idempotence : un cadeau portant la même clé n'est attribué qu'UNE fois par sauvegarde. */
  key?: string;
  /** Compteur de jours (cadeau quotidien) : jour courant 1..of. */
  day?: { n: number; of: number };
}

/** Récompense après résolution (doublons convertis en pièces). */
export interface Shown extends Reward {
  /** Quantité réellement attribuée / montrée. */
  qty: number;
  /** Doublon : converti en pièces (`qty` pièces), `from` = libellé de l'objet déjà possédé. */
  dup?: { from: string };
  name: string;
}

export interface GrantResult {
  /** Faux si la clé d'idempotence avait déjà servi : rien n'a été attribué ni ne sera montré. */
  fresh: boolean;
  shown: Shown[];
}

/** Pont vers le jeu : tout ce qui touche aux sauvegardes passe ici (factice dans les tests). */
export interface RewardHost {
  /** Vrai la PREMIÈRE fois pour cette clé (la marque et l'écrit tout de suite) ; faux ensuite. */
  once(key: string): boolean;
  addRes(kind: 'coins' | 'flowers' | 'fabric' | 'cocoa', n: number): void;
  giveDiamonds(n: number): void;
  giveEnergy(n: number): void;
  giveTickets(n: number): void;
  addHearts(n: number): void;
  giveBooster(kind: 'wand' | 'wind', n: number): void;
  addChest(n: number): void;
  ownsCloth(id: string): boolean;
  giveCloth(id: string): void;
  /** Pièces rendues pour un vêtement déjà possédé (null : identifiant inconnu). */
  clothBack(id: string): number | null;
  ownsFurniture(id: string): boolean;
  giveFurniture(id: string): void;
  furnitureBack(id: string): number | null;
  /** Souvenir : vrai s'il est nouveau (déjà débloqué ou inconnu : faux). */
  unlockMemory(id: string): boolean;
  addBouquet(key: string, n: number): void;
  /** Nom lisible d'un objet. */
  nameOf(type: RewardType, id: string): string | null;
  /** Solde actuel (pour les compteurs animés). */
  balance(type: 'coins' | 'diamonds' | 'energy' | 'tickets' | 'hearts' | 'flowers' | 'fabric' | 'cocoa'): number;
  /** Sauvegarde + rafraîchit les compteurs du jeu. */
  persist(): void;
}
