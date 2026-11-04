import { expect } from 'vitest';
import { mergeReward, orderGain, MATERIAL_OF } from '../src/game/world/fusionRewards';

export function materialOfCheck() {
  expect(MATERIAL_OF.rare).toBe('flowers');
  expect(MATERIAL_OF.choc).toBe('cocoa');
  expect(MATERIAL_OF.cloth).toBe('fabric');
  expect(MATERIAL_OF.acc).toBe('fabric');
  expect(mergeReward({ c: 'castle', l: 2 }).coins).toBe(4);
  expect(mergeReward({ c: 'jewel', l: 4 }).coins).toBe(6);
  expect(mergeReward({ c: 'choc', l: 3 }).cocoa).toBe(1);
  expect(mergeReward({ c: 'rare', l: 6 }).flowers).toBe(2);
  expect(orderGain({ hearts: 5, coins: 20, mat: 'cocoa', matN: 3, energy: 2, treasure: 1 })).toEqual({ coins: 20, cocoa: 3 });
}
