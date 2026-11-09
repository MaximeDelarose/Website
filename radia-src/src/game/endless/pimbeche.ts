/**
 * La marque PIMBÊCHE (savons au lait de chèvre) : améliorations achetées avec des PIÈCES, aux effets réels sur les
 * commandes de savon. Les recettes sont des variantes fictives, toutes à base de lait de chèvre.
 * Possession = compteur `pimb:<id>` = 1 dans `fun.endless2.counters` (aucun changement de schéma de sauvegarde).
 * Prix : voir docs/BALANCING.md (revenus simulés : ≈ 830 / 2 800 pièces par jour pour une joueuse occasionnelle / régulière).
 */
import type { FunState } from '../../save/fun';
import type { ItemRef } from '../../data/items';
import { bump, counter } from './ctx';
import { xpView } from './xp';

export type UpgradeKind = 'atelier' | 'recette' | 'emballage';
export interface Upgrade {
  id: string; kind: UpgradeKind; name: string; blurb: string;
  price: number; level: number;
  /** Bonus de pièces sur une commande de savon (fraction), pièces fixes, XP en plus. */
  coinPct: number; coinFlat: number; xp: number;
  /** Il faut posséder cette amélioration avant. */
  after?: string;
}

export const UPGRADES: readonly Upgrade[] = [
  // atelier & machines
  { id: 'atelier2', kind: 'atelier', name: 'Atelier agrandi', blurb: 'Plus de place pour couler tes savons au lait de chèvre.', price: 400, level: 2, coinPct: 0.08, coinFlat: 0, xp: 0 },
  { id: 'moulage', kind: 'atelier', name: 'Machine à mouler', blurb: 'Des savons réguliers, moulés en un geste.', price: 1200, level: 3, coinPct: 0.08, coinFlat: 0, xp: 1, after: 'atelier2' },
  { id: 'chaudron', kind: 'atelier', name: 'Chaudron en cuivre', blurb: 'Le lait de chèvre chauffe doucement, la pâte est parfaite.', price: 3000, level: 5, coinPct: 0.1, coinFlat: 0, xp: 2, after: 'moulage' },
  { id: 'atelier-luxe', kind: 'atelier', name: 'Atelier de luxe', blurb: 'Le grand atelier PIMBÊCHE : carrelage, marbre et lumière douce.', price: 9000, level: 8, coinPct: 0.15, coinFlat: 0, xp: 3, after: 'chaudron' },
  // recettes (variantes fictives, toujours au lait de chèvre)
  { id: 'rose', kind: 'recette', name: 'Savon rose au lait de chèvre', blurb: 'Pétales de rose, lait de chèvre et un soupçon de miel.', price: 600, level: 3, coinPct: 0.04, coinFlat: 0, xp: 1 },
  { id: 'lavande', kind: 'recette', name: 'Savon lavande au lait de chèvre', blurb: 'Lavande de Provence dans une pâte au lait de chèvre.', price: 1000, level: 4, coinPct: 0.04, coinFlat: 0, xp: 1 },
  { id: 'miel', kind: 'recette', name: 'Savon miel au lait de chèvre', blurb: 'Miel doré, lait de chèvre : le plus doux de la gamme.', price: 1600, level: 5, coinPct: 0.05, coinFlat: 0, xp: 1 },
  { id: 'exfoliant', kind: 'recette', name: 'Savon exfoliant au lait de chèvre', blurb: 'Avoine fine et lait de chèvre pour une peau lumineuse.', price: 2800, level: 7, coinPct: 0.05, coinFlat: 0, xp: 2 },
  { id: 'perso', kind: 'recette', name: 'Savon personnalisé', blurb: 'Le prénom de la cliente gravé dans un savon au lait de chèvre.', price: 5000, level: 9, coinPct: 0.08, coinFlat: 0, xp: 3 },
  // emballages, présentoirs, décorations professionnelles
  { id: 'emballage', kind: 'emballage', name: 'Papier d’emballage PIMBÊCHE', blurb: 'Ton logo et ta chèvre sur chaque savon emballé.', price: 700, level: 3, coinPct: 0, coinFlat: 4, xp: 0 },
  { id: 'presentoir', kind: 'emballage', name: 'Présentoir en bois', blurb: 'Tes savons bien alignés dans la vitrine.', price: 1500, level: 4, coinPct: 0, coinFlat: 6, xp: 1 },
  { id: 'vitrine', kind: 'emballage', name: 'Belle vitrine PIMBÊCHE', blurb: 'La vitrine attire les clientes depuis la rue.', price: 4000, level: 6, coinPct: 0.05, coinFlat: 8, xp: 1, after: 'presentoir' },
  { id: 'deco-pro', kind: 'emballage', name: 'Décoration professionnelle', blurb: 'Enseigne dorée, lustre et comptoir de marbre : la boutique de tes rêves.', price: 12000, level: 9, coinPct: 0.1, coinFlat: 12, xp: 3, after: 'vitrine' },
];
export const upgradeById = (id: string): Upgrade | undefined => UPGRADES.find((u) => u.id === id);

const key = (id: string): string => `pimb:${id}`;
export const owns = (fun: FunState, id: string): boolean => counter(fun, key(id)) > 0;

export type BuyResult = { ok: true; upgrade: Upgrade } | { ok: false; reason: 'unknown' | 'owned' | 'level' | 'after' | 'coins' };

export function status(fun: FunState, u: Upgrade, coins: number): 'owned' | 'locked' | 'poor' | 'ready' {
  if (owns(fun, u.id)) return 'owned';
  if (xpView(fun).level < u.level || (u.after && !owns(fun, u.after))) return 'locked';
  return coins >= u.price ? 'ready' : 'poor';
}

/** Achète une amélioration avec des pièces ; `spend` débite le portefeuille (faux = refus, rien ne change). */
export function buyUpgrade(fun: FunState, id: string, coins: number, spend: (n: number) => boolean): BuyResult {
  const u = upgradeById(id);
  if (!u) return { ok: false, reason: 'unknown' };
  if (owns(fun, id)) return { ok: false, reason: 'owned' };
  if (xpView(fun).level < u.level) return { ok: false, reason: 'level' };
  if (u.after && !owns(fun, u.after)) return { ok: false, reason: 'after' };
  if (coins < u.price || !spend(u.price)) return { ok: false, reason: 'coins' };
  bump(fun, key(id));
  return { ok: true, upgrade: u };
}

export interface SoapBonus { pct: number; flat: number; xp: number }
/** Bonus cumulé de tout ce qui est possédé. */
export function soapBonus(fun: FunState): SoapBonus {
  const b = { pct: 0, flat: 0, xp: 0 };
  for (const u of UPGRADES) if (owns(fun, u.id)) { b.pct += u.coinPct; b.flat += u.coinFlat; b.xp += u.xp; }
  return b;
}
export const hasSoap = (items: readonly ItemRef[]): boolean => items.some((r) => r.c === 'soap');
/** Pièces d'une commande de savon avec les améliorations (arrondi, jamais moins que la base). */
export const soapCoins = (base: number, b: SoapBonus): number => Math.max(base, Math.round(base * (1 + b.pct)) + b.flat);

/** Réalité économique : combien de pièces pour tout acheter. */
export const TOTAL_PRICE = UPGRADES.reduce((a, u) => a + u.price, 0);
