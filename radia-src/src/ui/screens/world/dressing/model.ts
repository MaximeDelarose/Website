/**
 * Modèle du dressing (logique pure, sans DOM ni sauvegarde) : essayage de plusieurs pièces,
 * bascule Avant/Après, état des cartes, filtre de style facultatif, action proposée dans la barre.
 * Rien ici ne touche à la tenue enregistrée : l'écran applique `equip` / `buy` lui-même.
 */
import type { StyleId } from '../../../../data/world/ids';

// ------------------------------------------------------------------ états des cartes

export type CardState = 'locked' | 'equipped' | 'owned' | 'buy';

export interface CardInput { locked: string | null; owned: boolean; worn: boolean }

/** Verrouillé d'abord (cadeau, vitrine), puis équipé, possédé, à acheter. */
export function cardState(i: CardInput): CardState {
  if (i.locked && !i.owned) return 'locked';
  if (i.owned && i.worn) return 'equipped';
  if (i.owned) return 'owned';
  return 'buy';
}

/** Raison affichée d'un verrou : null si la pièce n'est pas verrouillée. */
export function lockReason(def: { gift?: boolean }, owned: boolean, showcase: boolean): string | null {
  if (owned) return null;
  if (showcase) return 'Cadeau mystérieux';
  if (def.gift) return 'Cadeau';
  return null;
}

// ------------------------------------------------------------------ filtre de style (facultatif, discret)

export const STYLE_ORDER: readonly StyleId[] = ['chic', 'casual', 'romantic', 'royal', 'stage'];
export const STYLE_LABEL: Record<StyleId, string> = { chic: 'Chic', casual: 'Décontracté', romantic: 'Romantique', royal: 'Royal', stage: 'Soirée' };

/** Rayons pour lesquels un classement par style a un sens (vêtements, sacs, chaussures). */
export const STYLE_FILTER_SLOTS: readonly string[] = ['top', 'bottom', 'dress', 'jacket', 'shoes', 'bag'];

/** Styles présents dans la liste, avec le nombre d'articles de chacun (ordre fixe). */
export function styleCounts(items: readonly { styles: readonly StyleId[] }[]): { style: StyleId; n: number }[] {
  return STYLE_ORDER.map((style) => ({ style, n: items.filter((i) => i.styles.includes(style)).length })).filter((x) => x.n > 0);
}

/** Le filtre n'apparaît que s'il trie vraiment : au moins deux styles et un minimum d'articles. */
export function styleFilterUseful(slot: string, items: readonly { styles: readonly StyleId[] }[]): boolean {
  if (!STYLE_FILTER_SLOTS.includes(slot) || items.length < 5) return false;
  const c = styleCounts(items);
  return c.length >= 2 && c.some((x) => x.n < items.length);
}

export function filterByStyle<T extends { styles: readonly StyleId[] }>(items: readonly T[], style: StyleId | 'all'): T[] {
  return style === 'all' ? [...items] : items.filter((i) => i.styles.includes(style));
}

// ------------------------------------------------------------------ essayage

export type ActionKind = 'none' | 'equip' | 'remove' | 'worn' | 'buy' | 'locked';

export interface TryEnv {
  owned(id: string): boolean;
  worn(id: string): boolean;
  /** Emplacement : deux pièces de même clé s'excluent (haut, robe, famille d'accessoire, coiffure…). */
  keyOf(id: string): string;
  /** Vitrine verrouillée (jamais essayée, jamais achetée). */
  showcase(id: string): boolean;
  /** Une pièce portée peut-elle être retirée (pas un haut / bas / robe / coiffure) ? */
  removable(id: string): boolean;
}

export type SelectResult = 'showcase' | 'tried' | 'untried' | 'focused-worn';

/** Pièces en cours d'essayage + pièce « au centre » de la barre d'action. */
export class TryOn {
  trials: string[] = [];
  focus: string | null = null;
  /** Vrai : on montre la tenue actuelle (Avant) au lieu de l'essayage (Après). */
  before = false;
  constructor(private readonly env: TryEnv) {}

  isTrying(id: string): boolean { return this.trials.includes(id); }
  get active(): boolean { return this.trials.length > 0; }

  /** Un toucher sur une carte : applique la pièce sur Radia (ou la retire de l'essayage). */
  select(id: string): SelectResult {
    if (this.env.showcase(id)) { return 'showcase'; }
    this.before = false;
    const key = this.env.keyOf(id);
    if (this.env.worn(id) && !this.isTrying(id)) {
      // la pièce portée : on retire l'essai concurrent pour la revoir sur Radia
      this.trials = this.trials.filter((t) => this.env.keyOf(t) !== key);
      this.focus = id;
      return 'focused-worn';
    }
    if (this.isTrying(id)) {
      this.trials = this.trials.filter((t) => t !== id);
      this.focus = this.trials[this.trials.length - 1] ?? null;
      return 'untried';
    }
    this.trials = [...this.trials.filter((t) => this.env.keyOf(t) !== key), id];
    this.focus = id;
    return 'tried';
  }

  /** Annule tout l'essayage : retour à la tenue équipée. */
  clear(): void { this.trials = []; this.focus = null; this.before = false; }

  /** La pièce vient d'être équipée / achetée : elle n'est plus un essai (la tenue enregistrée la porte). */
  committed(id: string): void {
    this.trials = this.trials.filter((t) => t !== id);
    this.focus = id;
    if (!this.trials.length) this.before = false;
  }

  /** Avant/Après : possible seulement s'il y a un essayage. */
  toggleBefore(): boolean {
    if (!this.active) { this.before = false; return false; }
    this.before = !this.before;
    return true;
  }

  /** Tenue montrée : l'équipée (Avant) ou l'équipée + les essais (Après). */
  lookFor<L>(base: L, apply: (l: L, id: string) => L): L {
    if (this.before) return base;
    return this.trials.reduce(apply, base);
  }

  /** Que propose le gros bouton pour la pièce au centre ? */
  action(): ActionKind {
    const id = this.focus;
    if (!id) return 'none';
    if (this.env.showcase(id)) return 'locked';
    if (this.env.worn(id) && this.env.owned(id)) return this.env.removable(id) ? 'remove' : 'worn';
    if (this.env.owned(id)) return 'equip';
    return 'buy';
  }
}
