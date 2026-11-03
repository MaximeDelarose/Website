/** Versement des récompenses d'un événement : une seule fois par run, sans duplication. */
import { save } from '../core/app';
import { world } from '../core/world';
import { wallet } from '../core/wallet';
import { addFans } from '../core/world';
import { applyReward } from '../game/world/careers';
import { claimOnce } from './manager';
import { ev } from './api';
import { rewardFor } from './rewardRules';
import type { EventDef } from './types';
import type { ClothId } from '../data/world/ids';

export interface RewardOutcome {
  coins: number; diamonds: number; fabric: number; flowers: number; cocoa: number; fans: number;
  cloth: ClothId[]; furniture: string[]; dupCoins: number;
  /** Faux si la récompense de ce run avait déjà été versée (aucun doublon). */
  paid: boolean;
}

const EMPTY = (): RewardOutcome => ({ coins: 0, diamonds: 0, fabric: 0, flowers: 0, cocoa: 0, fans: 0, cloth: [], furniture: [], dupCoins: 0, paid: false });

/**
 * Verse la récompense. `extraCloth` = pièce choisie pendant l'événement (ex. boutique).
 * `timesDone` = nombre de fois où l'événement a déjà été terminé AVANT ce run.
 */
export function grantReward(def: EventDef, runId: string, timesDone: number, extraCloth: ClothId[] = []): RewardOutcome {
  const out = EMPTY();
  if (!claimOnce(ev(), runId, Date.now())) return out; // déjà versée : jamais deux fois
  const spec = rewardFor(def, timesDone);
  const w = world();
  const cloth = [...(spec.cloth ?? []), ...extraCloth];
  const res = applyReward(w, { ...spec, cloth });
  out.paid = true;
  out.coins = spec.coins ?? 0;
  out.fabric = spec.fabric ?? 0;
  out.flowers = spec.flowers ?? 0;
  out.cocoa = spec.cocoa ?? 0;
  out.cloth = res.items.cloth;
  out.furniture = res.items.furniture;
  out.dupCoins = res.items.dupCoins;
  out.coins += res.items.dupCoins;
  if (res.outside.diamonds) { wallet.giveDiamonds(res.outside.diamonds); out.diamonds = res.outside.diamonds; }
  if (res.outside.fans) { addFans(res.outside.fans); out.fans = res.outside.fans; }
  save.save();
  return out;
}
