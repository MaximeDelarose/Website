/**
 * Commande spéciale de chocolats — API pour le mode Endless (agents A/B2).
 * La commande demande des objets de la collection 'choc' (niveaux demandés). Elle est dérivée de la graine de
 * l'incident actif ; l'avancement vit dans `fun.endless2.counters['inc.choc.<niveau>']`.
 * Endless : `getSpecialOrder()` pour afficher/valider, `deliverSpecialItem(niveau)` à chaque objet livré,
 * `completeSpecialOrder()` quand tout est livré. Sans DOM ; l'exécution (récompense, sauvegarde) passe par `bindOrderRuntime`.
 */
import type { FunState } from '../../save/fun';
import { rng, rint } from './rng';

export const ORDER_ID = 'chocOrder';
export interface OrderLine { c: 'choc'; l: number; n: number; have: number }
export interface OrderReward { coins: number; diamonds: number; cocoa: number }
export interface SpecialOrder { seed: number; lines: OrderLine[]; reward: OrderReward; complete: boolean }

const TEMPLATES: { l: number; n: number }[][] = [
  [{ l: 2, n: 2 }, { l: 3, n: 2 }, { l: 4, n: 1 }],
  [{ l: 1, n: 3 }, { l: 3, n: 2 }, { l: 4, n: 1 }],
  [{ l: 2, n: 3 }, { l: 3, n: 1 }, { l: 5, n: 1 }],
];
const key = (l: number) => `inc.choc.${l}`;

export function buildLines(seed: number): { l: number; n: number }[] {
  return TEMPLATES[rint(rng(seed), TEMPLATES.length)].map((x) => ({ ...x }));
}
export const rewardFor = (lines: { l: number; n: number }[]): OrderReward => {
  const pts = lines.reduce((s, x) => s + x.n * x.l, 0);
  return { coins: 120 + pts * 18, diamonds: 2, cocoa: 6 };
};

export interface OrderRuntime {
  fun: () => FunState;
  /** Verse la récompense. */
  grant: (r: OrderReward) => void;
  /** Termine l'incident (compteur, planification, sauvegarde, effets). */
  resolve: () => void;
}
let rt: OrderRuntime | null = null;
export const bindOrderRuntime = (r: OrderRuntime): void => { rt = r; };

export function orderFrom(fun: FunState): SpecialOrder | null {
  const a = fun.incidents.active;
  if (!a || a.id !== ORDER_ID) return null;
  const base = buildLines(a.seed);
  const lines: OrderLine[] = base.map((x) => ({ c: 'choc', l: x.l, n: x.n, have: Math.min(x.n, Math.floor(fun.endless2.counters[key(x.l)] ?? 0)) }));
  return { seed: a.seed, lines, reward: rewardFor(base), complete: lines.every((x) => x.have >= x.n) };
}
export function resetOrderProgress(fun: FunState): void {
  for (const k of Object.keys(fun.endless2.counters)) if (k.startsWith('inc.choc.')) delete fun.endless2.counters[k];
}
export function deliverTo(fun: FunState, level: number): boolean {
  const o = orderFrom(fun);
  const line = o?.lines.find((x) => x.l === level);
  if (!o || !line || line.have >= line.n) return false;
  fun.endless2.counters[key(level)] = line.have + 1;
  return true;
}
export function completeIn(fun: FunState, grant: (r: OrderReward) => void): { ok: boolean; reward?: OrderReward } {
  const o = orderFrom(fun);
  if (!o || !o.complete) return { ok: false };
  grant(o.reward);
  resetOrderProgress(fun);
  return { ok: true, reward: o.reward };
}

/** Commande active (ou null). */
export const getSpecialOrder = (fun?: FunState): SpecialOrder | null => { const f = fun ?? rt?.fun(); return f ? orderFrom(f) : null; };
/** Un objet de niveau `level` livré à la commande (renvoie faux si inutile). */
export function deliverSpecialItem(level: number, fun?: FunState): boolean {
  const f = fun ?? rt?.fun();
  return f ? deliverTo(f, level) : false;
}
/** Valide la commande si tout est livré : récompense versée et incident clos. */
export function completeSpecialOrder(fun?: FunState): { ok: boolean; reward?: OrderReward } {
  const f = fun ?? rt?.fun();
  if (!f) return { ok: false };
  const res = completeIn(f, (r) => rt?.grant(r));
  if (res.ok) rt?.resolve();
  return res;
}
