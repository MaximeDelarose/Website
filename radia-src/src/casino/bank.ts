/**
 * Portefeuille de PIÈCES du casino : le même que le reste de RADIA (`save.data.world.res.coins`).
 * Monnaie strictement fictive : aucun dépôt, aucun retrait, aucun achat contre de l'argent réel.
 *  - débit « tout ou rien » AVANT la manche, jamais de solde négatif ;
 *  - plafond de mise cohérent avec la richesse (voir `maxBet`) ;
 *  - le casino n'est jamais nécessaire pour progresser : à 0 pièce on continue normalement, les commandes en rapportent.
 */
export interface Purse { get(): number; set(n: number): void }
/** Branché par `store.ts` sur `save.data.world.res.coins` (aucun import du DOM ici : logique pure, testable). */
let purse: Purse = { get: () => 0, set: () => {} };
export const usePurse = (p: Purse): void => { purse = p; };

const COIN_CAP = 1_000_000_000;
export const MAX_BET_ABS = 1_000_000;
/** Mises proposées (le sélecteur ne montre que celles qui sont jouables). */
export const BET_PRESETS = [100, 250, 500, 1000, 2500, 5000, 10000] as const;

export const balance = (): number => { const v = purse.get(); return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0; };

/**
 * Mise maximum par manche : au moins 10 000 (donc 1 000, 5 000, 10 000 toujours permis si on les a), puis la moitié du solde
 * pour les grosses fortunes, jamais plus de 1 000 000. On ne mise jamais plus que ce qu'on possède.
 */
export const maxBet = (bal: number = balance()): number => Math.min(MAX_BET_ABS, bal, Math.max(10_000, Math.floor(bal / 2)));

/** Débit tout ou rien d'une mise entière positive. Faux (rien ne change) si le solde ne suffit pas. */
export function debitCoins(n: number): boolean {
  if (!Number.isInteger(n) || n <= 0 || n > balance()) return false;
  purse.set(balance() - n);
  return true;
}
/** Crédite un gain (entier ≥ 0). */
export function creditCoins(n: number): void {
  const k = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (k > 0) purse.set(Math.min(COIN_CAP, balance() + k));
}
export const ledger = { balance, debit: debitCoins, credit: creditCoins };
