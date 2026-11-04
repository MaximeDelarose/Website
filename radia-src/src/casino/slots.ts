/** Machine à sous : tirage et règlement PURS. Le multi-tirage rejoue exactement `playSpin`, une manche à la fois. */
import { pickWeighted, type Rng } from './rng';
import { MAX_MULTI, SYMBOLS, TOTAL_WEIGHT, type SymDef, type SymId } from './slotsTable';
import { LIMITS } from './chips';

export type Reels = [SymId, SymId, SymId];
export interface SpinResult { reels: Reels; /** multiplicateur de la mise (0 = perdu) */ mult: number; kind: 'triple' | 'pair' | 'none'; sym: SymId | null; bet: number; win: number }

const BY_ID = new Map<SymId, SymDef>(SYMBOLS.map((s) => [s.id, s]));
export const symDef = (id: SymId): SymDef => BY_ID.get(id)!;

/** Tire les trois rouleaux (indépendants, mêmes poids). */
export function drawReels(rng: Rng): Reels {
  const w = SYMBOLS.map((s) => s.weight);
  return [0, 1, 2].map(() => SYMBOLS[pickWeighted(w, rng)].id) as Reels;
}

/** Gain (× mise) d'une combinaison. */
export function evaluate(reels: Reels): { mult: number; kind: 'triple' | 'pair' | 'none'; sym: SymId | null } {
  const [a, b, c] = reels;
  if (a === b && b === c) return { mult: symDef(a).triple, kind: 'triple', sym: a };
  for (const s of SYMBOLS) {
    if (s.pair > 0 && reels.filter((x) => x === s.id).length === 2) return { mult: s.pair, kind: 'pair', sym: s.id };
  }
  return { mult: 0, kind: 'none', sym: null };
}

/** UNE manche (la seule fonction de tirage : tirage simple et multi-tirage l'appellent à l'identique). */
export function playSpin(bet: number, rng: Rng): SpinResult {
  const reels = drawReels(rng);
  const e = evaluate(reels);
  return { reels, ...e, bet, win: bet * e.mult };
}

/** Retour théorique EXACT en fraction (num/den), par énumération des 7³ combinaisons. */
export function exactRtp(): { num: number; den: number; rtp: number; hit: number } {
  let num = 0;
  let hitNum = 0;
  for (const a of SYMBOLS) for (const b of SYMBOLS) for (const c of SYMBOLS) {
    const w = a.weight * b.weight * c.weight;
    const e = evaluate([a.id, b.id, c.id]);
    num += w * e.mult;
    if (e.mult > 0) hitNum += w;
  }
  const den = TOTAL_WEIGHT ** 3;
  return { num, den, rtp: num / den, hit: hitNum / den };
}

/** Probabilité exacte d'un résultat « triple » / « paire » pour un symbole. */
export const pTriple = (s: SymDef): number => (s.weight / TOTAL_WEIGHT) ** 3;
export const pPair = (s: SymDef): number => 3 * (s.weight / TOTAL_WEIGHT) ** 2 * (1 - s.weight / TOTAL_WEIGHT);

// ------------------------------------------------------------------ multi-tirage

/** Le « porte-jetons » : débit/crédit de la table. */
export interface Ledger { balance(): number; debit(n: number): boolean; credit(n: number): void }

export interface RunSummary { planned: number; played: number; stoppedEarly: boolean; staked: number; won: number; net: number; spins: SpinResult[]; balance: number }

/**
 * Série de 1, 5 ou 10 tirages (jamais plus de 10). La mise totale est validée avant le premier tirage ;
 * chaque tirage débite sa mise juste avant de tourner ; `stop()` arrête entre deux tirages (rien n'est débité pour la suite).
 */
export class SlotsRun {
  readonly spins: SpinResult[] = [];
  private stopped = false;
  readonly count: number;
  constructor(private ledger: Ledger, readonly bet: number, count: number) {
    this.count = Math.min(MAX_MULTI, Math.max(1, Math.floor(count)));
  }
  get totalBet(): number { return this.bet * this.count; }
  /** Série jouable ? (mise unitaire dans les bornes, mise totale ≤ plafond et ≤ solde). */
  canStart(): boolean {
    const l = LIMITS.slots;
    return Number.isInteger(this.bet) && this.bet >= l.min && this.bet % l.step === 0 && this.totalBet <= l.max && this.totalBet <= this.ledger.balance();
  }
  get done(): boolean { return this.stopped || this.spins.length >= this.count; }
  stop(): void { this.stopped = true; }
  /** Joue le tirage suivant ; null si terminé, arrêté, ou solde insuffisant. */
  next(rng: Rng): SpinResult | null {
    if (this.done) return null;
    if (this.spins.length === 0 && !this.canStart()) { this.stopped = true; return null; }
    if (!this.ledger.debit(this.bet)) { this.stopped = true; return null; }
    const r = playSpin(this.bet, rng);
    if (r.win > 0) this.ledger.credit(r.win);
    this.spins.push(r);
    return r;
  }
  summary(): RunSummary {
    const staked = this.spins.reduce((a, s) => a + s.bet, 0);
    const won = this.spins.reduce((a, s) => a + s.win, 0);
    return { planned: this.count, played: this.spins.length, stoppedEarly: this.spins.length < this.count, staked, won, net: won - staked, spins: this.spins.slice(), balance: this.ledger.balance() };
  }
}
