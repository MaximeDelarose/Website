// Empreinte de l'état (FNV-1a 32 bits) : sert à vérifier le déterminisme
// et, plus tard, à valider un combat côté serveur.

import type { CombatState } from "./types";

export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function hashState(state: CombatState): string {
  const summary = [
    state.tick,
    state.rngState,
    state.outcome,
    state.combatants.map((c) => [
      c.hp,
      c.shield,
      c.alive,
      c.phasesDone,
      Object.entries(c.statuses).map(([k, s]) => [k, s.stacks, s.timerMs]),
      c.items.map((i) => [i.uid, i.def.id, i.progressMs, i.charges, i.timed.map((t) => [t.kind, t.value, t.remainingMs])]),
    ]),
  ];
  return fnv1a(JSON.stringify(summary));
}
