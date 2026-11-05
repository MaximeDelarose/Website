/**
 * Logique PURE des clients (testée dans tests/customers-logic.test.ts) : choix du client d'une commande, fidélité à 5 niveaux,
 * répliques (demande / remerciement / histoire) sans répétition immédiate.
 */
import { CUSTOMERS, customerById, customersWhoLike, type Customer, type LikeId } from '../../data/customers';
import type { CustomerState } from '../../save/fun';

export interface RngLike { next(): number; int(n: number): number }

/** Commandes livrées nécessaires pour atteindre les niveaux 2, 3, 4 et 5. */
export const LOYALTY_STEPS = [2, 5, 9, 14] as const;
export const MAX_LOYALTY = 5;

export function loyaltyLevel(n: number): number {
  let lvl = 1;
  for (const step of LOYALTY_STEPS) if (n >= step) lvl++;
  return lvl;
}

/** Progression vers le niveau suivant (0..1) ; 1 au niveau maximal. */
export function loyaltyProgress(n: number): { level: number; ratio: number; need: number; have: number } {
  const level = loyaltyLevel(n);
  if (level >= MAX_LOYALTY) return { level, ratio: 1, need: 0, have: 0 };
  const from = level === 1 ? 0 : LOYALTY_STEPS[level - 2];
  const to = LOYALTY_STEPS[level - 1];
  return { level, ratio: Math.max(0, Math.min(1, (n - from) / (to - from))), need: to - n, have: n - from };
}

/**
 * Choisit le client d'une commande. Préfère un client qui aime la collection du premier objet ; évite ceux déjà affichés
 * (`avoid`) et, à défaut, le dernier servi ; les clients très fidèles reviennent un peu plus souvent (mais jamais deux fois
 * en même temps). `unlocked` : clients disponibles (PIMBÊCHE débloque les autres progressivement).
 */
export function pickCustomer(rng: RngLike, coll: string, avoid: ReadonlySet<string>, state: Record<string, CustomerState>, unlocked: readonly Customer[] = CUSTOMERS): string {
  const pool = unlocked.filter((c) => !avoid.has(c.id));
  const base = pool.length ? pool : [...unlocked];
  const likers = customersWhoLike(coll as LikeId).filter((c) => base.some((b) => b.id === c.id));
  const useLikers = likers.length > 0 && rng.next() < 0.7;
  const list = useLikers ? likers : base;
  // pondération : un client jamais vu est favorisé (découverte), puis les plus fidèles
  const w = (c: Customer): number => { const n = state[c.id]?.n ?? 0; return n === 0 ? 2.2 : 1 + Math.min(1.5, n / 10); };
  const total = list.reduce((a, c) => a + w(c), 0);
  let r = rng.next() * total;
  for (const c of list) { r -= w(c); if (r <= 0) return c.id; }
  return list[list.length - 1].id;
}

/**
 * Demande lisible : « « Pousse » », « 2 × « Bouquet » », « « Bouquet » et « Chocolat » ». Le nom de l'objet est entre guillemets :
 * aucun accord de genre ni d'article à deviner (« un pousse » serait faux), et ça fonctionne après « de », « pour », « avec »…
 */
export function whatText(names: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts].map(([n, k]) => (k > 1 ? `${k} × « ${n} »` : `« ${n} »`));
  return parts.length <= 1 ? (parts[0] ?? 'ça') : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

export function requestLine(c: Customer, rng: RngLike, what: string): string {
  return c.requests[rng.int(c.requests.length)].replace('{what}', what);
}

/** Remerciement : jamais le même deux fois de suite ; renvoie aussi l'indice (à mémoriser). */
export function thanksLine(c: Customer, rng: RngLike, lastIdx: number): { text: string; idx: number } {
  const n = c.thanks.length;
  let i = rng.int(n);
  if (n > 1 && i === lastIdx) i = (i + 1 + rng.int(n - 1)) % n;
  return { text: c.thanks[i], idx: i };
}

/** Histoire débloquée au niveau `level` (2 à 5) ; undefined au niveau 1. */
export function storyLine(c: Customer, level: number): string | undefined {
  return level >= 2 && level <= MAX_LOYALTY ? c.stories[level - 2] : undefined;
}

export interface Served { n: number; levelFrom: number; levelTo: number; thanks: { text: string; idx: number }; story?: string }

/** Enregistre une livraison : fidélité, remerciement, éventuelle histoire du nouveau niveau. Modifie `state`. */
export function serve(state: Record<string, CustomerState>, id: string, rng: RngLike, now: number): Served | null {
  const c = customerById(id);
  if (!c) return null;
  const cur = state[id] ?? { n: 0, last: 0, thanks: -1, seenLevel: 1 };
  const levelFrom = loyaltyLevel(cur.n);
  const n = cur.n + 1;
  const levelTo = loyaltyLevel(n);
  const thanks = thanksLine(c, rng, cur.thanks);
  state[id] = { n, last: now, thanks: thanks.idx, seenLevel: Math.max(cur.seenLevel, levelTo) };
  return { n, levelFrom, levelTo, thanks, story: levelTo > levelFrom ? storyLine(c, levelTo) : undefined };
}
