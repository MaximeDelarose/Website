import { describe, it, expect, afterEach } from 'vitest';
import { usePurse, balance, debitCoins, creditCoins, maxBet, BET_PRESETS } from '../src/casino/bank';

let coins = 0;
const bind = (n: number) => { coins = n; usePurse({ get: () => coins, set: (v) => { coins = v; } }); };
afterEach(() => usePurse({ get: () => 0, set: () => {} }));

describe('portefeuille de pièces du casino', () => {
  it('débit tout ou rien, jamais de solde négatif, entiers seulement', () => {
    bind(1000);
    expect(debitCoins(1001)).toBe(false); expect(coins).toBe(1000);
    expect(debitCoins(0)).toBe(false); expect(debitCoins(-5)).toBe(false); expect(debitCoins(NaN)).toBe(false); expect(debitCoins(2.5)).toBe(false);
    expect(debitCoins(400)).toBe(true); expect(coins).toBe(600);
    expect(balance()).toBe(600);
  });
  it('crédit ignore les valeurs invalides', () => {
    bind(10);
    creditCoins(-50); creditCoins(NaN); expect(coins).toBe(10);
    creditCoins(25.9); expect(coins).toBe(35);
  });
  it('mises de 1 000 à 10 000 permises ; plafond ≤ moitié de la bourse pour les grosses fortunes', () => {
    expect(maxBet(1000)).toBe(1000); // on ne mise jamais plus que ce qu'on a
    expect(maxBet(12000)).toBe(10000);
    expect(maxBet(100000)).toBe(50000);
    expect(maxBet(5e9)).toBe(1_000_000);
    expect(maxBet(0)).toBe(0);
    expect(BET_PRESETS).toContain(10000);
  });
  it('0 pièce : rien ne plante', () => { bind(0); expect(debitCoins(10)).toBe(false); expect(maxBet()).toBe(0); });
});
