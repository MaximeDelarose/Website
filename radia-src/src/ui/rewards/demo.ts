/** Démonstrations (mode ?debug : `RADIA.rewards.demo(kind, rarity)`). Rien n'est attribué : tout est marqué « déjà versé ». */
import type { GiftKind, GiftRarity, GiftSpec, Reward } from './types';

const SAMPLE: Record<GiftKind, Reward[]> = {
  start: [{ type: 'energy', qty: 50 }, { type: 'diamonds', qty: 60 }, { type: 'coins', qty: 300 }, { type: 'tickets', qty: 100 }, { type: 'chest', qty: 1, label: 'Coffre surprise' }],
  daily: [{ type: 'coins', qty: 250 }, { type: 'diamonds', qty: 20 }],
  chest: [{ type: 'coins', qty: 120 }, { type: 'diamonds', qty: 15 }, { type: 'energy', qty: 8 }, { type: 'res', id: 'flowers', qty: 12 }, { type: 'cloth', id: 'dr-royal-gown', qty: 1 }, { type: 'furniture', id: 'chandelier', qty: 1 }],
  event: [{ type: 'coins', qty: 200 }, { type: 'diamonds', qty: 30 }, { type: 'res', id: 'fabric', qty: 6 }, { type: 'hearts', qty: 5 }],
  premium: [{ type: 'diamonds', qty: 150 }, { type: 'tickets', qty: 400 }, { type: 'cloth', id: 'cr-tiara', qty: 1 }, { type: 'chest', qty: 1 }, { type: 'coins', qty: 800 }],
  romantic: [{ type: 'hearts', qty: 20 }, { type: 'bouquet', id: 'rose+peony', qty: 1, label: 'Bouquet de roses' }, { type: 'diamonds', qty: 25 }],
};
const TITLE: Record<GiftKind, string> = {
  start: 'Bonus de démarrage !', daily: 'Cadeau du jour !', chest: 'Récompense obtenue !', event: 'Surprise pour toi ♡', premium: 'Un trésor pour toi !', romantic: 'Un cadeau d\'Auguste ♡',
};

export function demoSpec(kind: GiftKind, rarity: GiftRarity, n = 0): GiftSpec {
  const rewards = SAMPLE[kind].slice(0, n > 0 ? n : undefined).map((r) => ({ ...r, granted: true }));
  return {
    kind, rarity, title: TITLE[kind], subtitle: kind === 'daily' ? 'Reviens demain pour la suite ♡' : undefined, rewards,
    day: kind === 'daily' ? { n: 3, of: 7 } : undefined,
    message: kind === 'romantic' ? 'J\'ai pensé à toi en préparant ça, Radia ♡' : undefined,
  };
}

/** « Cadeau du jour » → « Bonus de connexion » → « Petit coffre surprise ». */
export function demoChain(): GiftSpec {
  const a = demoSpec('daily', 'common');
  a.title = 'Cadeau du jour !';
  return {
    ...a,
    chain: [
      { kind: 'event', rarity: 'uncommon', title: 'Bonus de connexion !', rewards: [{ type: 'energy', qty: 10, granted: true }, { type: 'hearts', qty: 3, granted: true }] },
      { kind: 'chest', rarity: 'rare', title: 'Petit coffre surprise !', rewards: [{ type: 'diamonds', qty: 12, granted: true }, { type: 'res', id: 'cocoa', qty: 5, granted: true }] },
    ],
  };
}
