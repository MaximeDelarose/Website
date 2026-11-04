/**
 * Roulette européenne (0–36) : règles PURES. Le numéro est tiré UNE fois au lancement (`spin`) avec un RNG
 * honnête ; l'animation n'est qu'un habillage de ce résultat. Gains exacts : numéro 35:1, groupe de k numéros
 * (36/k − 1):1, chances simples (rouge, noir, pair, impair) 1:1 — le 0 fait perdre les chances simples.
 */
import { randInt, type Rng } from './rng';

/** Ordre réel des cases sur la roue européenne (sens horaire). */
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26] as const;
export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type Color = 'red' | 'black' | 'green';
export const colorOf = (n: number): Color => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');
export const pocketIndex = (n: number): number => WHEEL_ORDER.indexOf(n as never);

export type BetKind = 'red' | 'black' | 'even' | 'odd' | 'num' | 'nums';
export interface Bet { kind: BetKind; nums?: number[]; amount: number }

/** Tailles de groupes autorisées (paiement entier : 36/k − 1). */
export const GROUP_SIZES = [2, 3, 4, 6] as const;
export const CHIP_VALUES = [5, 10, 25, 50, 100] as const;

export const KIND_NAMES: Record<BetKind, string> = { red: 'Rouge', black: 'Noir', even: 'Pair', odd: 'Impair', num: 'Numéro', nums: 'Groupe' };

/** Numéros couverts par une mise. */
export function covered(b: Pick<Bet, 'kind' | 'nums'>): number[] {
  const all = Array.from({ length: 36 }, (_, i) => i + 1);
  switch (b.kind) {
    case 'red': return all.filter((n) => colorOf(n) === 'red');
    case 'black': return all.filter((n) => colorOf(n) === 'black');
    case 'even': return all.filter((n) => n % 2 === 0);
    case 'odd': return all.filter((n) => n % 2 === 1);
    default: return [...new Set(b.nums ?? [])].filter((n) => Number.isInteger(n) && n >= 0 && n <= 36).sort((a, c) => a - c);
  }
}

/** Mise valide ? (type connu, montant entier > 0, numéros cohérents). */
export function validBet(b: Bet): boolean {
  if (!Number.isInteger(b.amount) || b.amount <= 0) return false;
  if (b.kind === 'num') return covered(b).length === 1 && (b.nums ?? []).length === 1;
  if (b.kind === 'nums') { const c = covered(b); return c.length === (b.nums ?? []).length && (GROUP_SIZES as readonly number[]).includes(c.length); }
  return ['red', 'black', 'even', 'odd'].includes(b.kind);
}

/** Multiplicateur « x pour 1 » du gain net (35 pour un numéro, 1 pour une chance simple…). */
export function payoutRatio(b: Pick<Bet, 'kind' | 'nums'>): number {
  if (b.kind === 'num') return 35;
  if (b.kind === 'nums') return 36 / covered(b).length - 1;
  return 1;
}

export const betWins = (b: Bet, n: number): boolean => covered(b).includes(n);

/** Probabilité de gagner (cases couvertes / 37). */
export const betProbability = (b: Pick<Bet, 'kind' | 'nums'>): number => (b.kind === 'num' || b.kind === 'nums' ? covered(b).length : covered(b).length) / 37;

/** Libellé court d'une mise. */
export function betLabel(b: Pick<Bet, 'kind' | 'nums'>): string {
  if (b.kind === 'num') return `N° ${b.nums?.[0]}`;
  if (b.kind === 'nums') return `Groupe ${covered(b).join('-')}`;
  return KIND_NAMES[b.kind];
}

export interface Line { bet: Bet; won: boolean; /** total rendu (mise + gain), 0 si perdu */ returned: number }
export interface Settlement { number: number; color: Color; lines: Line[]; stake: number; returned: number; net: number }

/** Règle une manche : calcule exactement ce qui est rendu pour chaque mise. */
export function settle(bets: readonly Bet[], n: number): Settlement {
  const lines: Line[] = bets.map((bet) => {
    const won = betWins(bet, n);
    return { bet, won, returned: won ? bet.amount + Math.round(bet.amount * payoutRatio(bet)) : 0 };
  });
  const stake = bets.reduce((a, b) => a + b.amount, 0);
  const returned = lines.reduce((a, l) => a + l.returned, 0);
  return { number: n, color: colorOf(n), lines, stake, returned, net: returned - stake };
}

/** Tirage du numéro gagnant (uniforme sur 0..36). */
export const spin = (rng: Rng): number => randInt(rng, 37);

// ------------------------------------------------------------------ carnet de mises (annuler / refaire)

const keyOf = (b: Pick<Bet, 'kind' | 'nums'>): string => (b.kind === 'num' || b.kind === 'nums' ? `${b.kind}:${covered(b).join(',')}` : b.kind);

/** Mises en cours sur le tapis, avec historique annuler/refaire. Le total ne dépasse jamais `cap` (solde et plafond du jeu). */
export class BetBook {
  private stack: Bet[][] = [[]];
  private at = 0;
  constructor(public cap: number) {}
  get bets(): Bet[] { return this.stack[this.at]; }
  total(): number { return this.bets.reduce((a, b) => a + b.amount, 0); }
  amountOn(spec: Pick<Bet, 'kind' | 'nums'>): number { return this.bets.find((b) => keyOf(b) === keyOf(spec))?.amount ?? 0; }
  /** Ajoute un ticket sur une zone. Faux (rien ne change) si ça dépasse le plafond ou si la mise est invalide. */
  place(spec: Pick<Bet, 'kind' | 'nums'>, chip: number): boolean {
    const nb: Bet = { kind: spec.kind, nums: spec.kind === 'num' || spec.kind === 'nums' ? covered(spec) : undefined, amount: chip };
    if (!validBet(nb) || this.total() + chip > this.cap) return false;
    const next: Bet[] = this.bets.map((b) => ({ ...b, nums: b.nums ? [...b.nums] : undefined }));
    const ex = next.find((b) => keyOf(b) === keyOf(nb));
    if (ex) ex.amount += chip; else next.push(nb);
    this.push(next);
    return true;
  }
  private push(next: Bet[]): void { this.stack = this.stack.slice(0, this.at + 1); this.stack.push(next); this.at++; }
  canUndo = (): boolean => this.at > 0;
  canRedo = (): boolean => this.at < this.stack.length - 1;
  undo(): void { if (this.canUndo()) this.at--; }
  redo(): void { if (this.canRedo()) this.at++; }
  clear(): void { if (this.bets.length) this.push([]); }
  /** Remplace par un ensemble de mises (« refaire la mise précédente »), borné par le plafond. */
  load(bets: readonly Bet[]): boolean {
    const copy: Bet[] = bets.map((b) => ({ ...b, nums: b.nums ? [...b.nums] : undefined }));
    if (!copy.every(validBet) || copy.reduce((a, b) => a + b.amount, 0) > this.cap) return false;
    this.push(copy);
    return true;
  }
}
