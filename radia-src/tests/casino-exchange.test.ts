import { describe, it, expect } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { exchange, exchangeView, EXCHANGE_COINS, EXCHANGE_TICKETS } from '../src/casino/exchange';

describe('caisse d\'échange pièces → tickets', () => {
  it('100 pièces = 10 tickets, pièces débitées une fois', () => {
    const c = defaultFun().casino; let coins = 1000;
    const got = exchange(1, coins, c, (n) => { if (coins < n) return false; coins -= n; return true; });
    expect(got).toBe(EXCHANGE_TICKETS); expect(coins).toBe(1000 - EXCHANGE_COINS);
  });
  it('refus sans pièces suffisantes, rien ne change', () => {
    const c = defaultFun().casino; const before = c.chips;
    expect(exchange(1, 50, c, () => true)).toBe(0); expect(c.chips).toBe(before);
    expect(exchange(1, 500, c, () => false)).toBe(0); expect(c.chips).toBe(before);
  });
  it('plafond quotidien : au plus 100 tickets par jour, puis repart le lendemain', () => {
    const c = defaultFun().casino; let coins = 100000; const t0 = new Date(2026, 5, 1, 12).getTime();
    const sp = (n: number) => { coins -= n; return true; };
    let total = 0; for (let i = 0; i < 20; i++) total += exchange(1, coins, c, sp, t0);
    expect(total).toBe(100); expect(exchangeView(coins, c, t0).maxPacks).toBe(0);
    expect(exchangeView(coins, c, t0 + 86400000).maxPacks).toBeGreaterThan(0);
  });
});
