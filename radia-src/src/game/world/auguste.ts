/**
 * Réactions d'Auguste (fan n° 1) : bulles avec sa tête, courtes, variées,
 * espacées (temps de recharge global + pas de répétition rapprochée).
 * Radia reste l'héroïne : Auguste encourage, il ne décide jamais pour elle.
 */
import { augusteSays } from '../../ui/components/augusteSays';
import { AUG_LINES, type AugTopic } from '../../data/world/augusteLines';

export { AUG_LINES, AUG_LINE_COUNT } from '../../data/world/augusteLines';
export type { AugTopic } from '../../data/world/augusteLines';

const last: Record<string, number> = {};
let lastAny = 0;
const lastIdx = new Map<AugTopic, number>();

/**
 * Fait réagir Auguste. `chance` ∈ [0,1] ; `force` ignore les temps de recharge
 * (moments importants). Renvoie vrai si une bulle a été affichée.
 */
export function reactAuguste(topic: AugTopic, chance = 1, force = false): boolean {
  const now = Date.now();
  if (!force) {
    if (now - lastAny < 9000) return false;               // jamais deux bulles rapprochées
    if (now - (last[topic] ?? 0) < 30_000) return false;  // pas le même sujet trop souvent
    if (Math.random() > chance) return false;
  }
  const lines = AUG_LINES[topic];
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === lastIdx.get(topic)) i = (i + 1) % lines.length;
  lastIdx.set(topic, i);
  last[topic] = now;
  lastAny = now;
  augusteSays(lines[i], 4200);
  return true;
}

