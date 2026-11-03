/** Règle des récompenses (pure, testable). */
import type { EventDef, RewardSpec } from './types';

/** Récompense à verser : première fois = `reward`, ensuite `replayReward` (ou 30 % de la première). */
export function rewardFor(def: EventDef, timesDone: number): RewardSpec {
  if (timesDone <= 0) return def.reward;
  if (def.replayReward) return def.replayReward;
  const r = def.reward;
  const k = (n?: number) => (n ? Math.max(1, Math.round(n * 0.3)) : undefined);
  return { coins: k(r.coins), diamonds: k(r.diamonds), flowers: k(r.flowers), cocoa: k(r.cocoa), fabric: k(r.fabric), fans: k(r.fans) };
}

