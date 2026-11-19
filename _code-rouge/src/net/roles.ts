import { createRng, shuffle } from "../engine/rng";

/**
 * Distribue les rôles entre les téléphones : chaque rôle est détenu par exactement un téléphone.
 * Avec moins de téléphones que de rôles, certains en cumulent (jamais tous les rôles sur un seul
 * téléphone dès qu'il y en a deux). Le tirage est aléatoire mais reproductible (graine).
 */
export function dealRoles(memberIds: string[], roleIds: string[], seed: number): Record<string, string[]> {
  const rng = createRng(seed);
  const out: Record<string, string[]> = {};
  memberIds.forEach((id) => (out[id] = []));
  if (memberIds.length === 0) return out;
  const members = shuffle(memberIds, rng);
  shuffle(roleIds, rng).forEach((role, i) => out[members[i % members.length]].push(role));
  return out;
}

/** Fait tourner les rôles d'un cran (épreuve suivante) : chacun change de rôle, personne ne reste spectateur du même poste. */
export function rotateRoles(current: Record<string, string[]>, memberOrder: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  memberOrder.forEach((id) => (out[id] = []));
  memberOrder.forEach((id, i) => {
    const next = memberOrder[(i + 1) % memberOrder.length];
    out[next].push(...(current[id] ?? []));
  });
  return out;
}
