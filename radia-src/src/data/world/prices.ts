/**
 * Courbe de prix des achats en PIÈCES (dressing, meubles) : accessibles au début, plus chers ensuite, prestige tout en haut.
 *   ≤ 150 pièces : inchangé (premiers achats) · 151–300 : ×2 (achats courants) · > 300 : ×3 (intermédiaires)
 *   + prix de prestige fixés à la main (objectifs d'épargne de 4 000 à 12 000 pièces).
 * Revenus de référence (docs/BALANCING.md) : ≈ 830 pièces/jour (occasionnelle), ≈ 2 800 (régulière).
 */
export const PRESTIGE_PRICE: Record<string, number> = {
  // tenues luxueuses
  'dr-royal-gown': 6000, 'dr-redcarpet': 9000, 'dr-white-gown': 7000, 'dr-emerald-evening': 5500,
  // couronnes et bijoux rares
  'cr-gold': 12000, 'cr-tiara': 8000, 'ac-pearls': 2500,
  // décorations de prestige
  'bed-royal': 8000, 'fountain': 6000, 'pergola': 5000, 'chandelier': 4500, 'fireplace': 4000,
};

export function tierCoins(id: string, base: number): number {
  const p = PRESTIGE_PRICE[id];
  if (p !== undefined && base > 0) return p;
  if (base <= 150) return base;
  if (base <= 300) return Math.round((base * 2) / 10) * 10;
  return Math.round((base * 3) / 10) * 10;
}

/** Gain moyen simulé par commande livrée (docs/BALANCING.md : ≈ 96 et ≈ 92 pièces pour les profils occasionnel et régulier). */
export const AVG_COINS_PER_ORDER = 90;
/** « Il te manque 1 200 pièces (environ 13 commandes) » : montre comment les gagner. */
export function missingCoins(missing: number): string {
  const m = Math.max(0, Math.ceil(missing));
  const n = Math.max(1, Math.ceil(m / AVG_COINS_PER_ORDER));
  return `Il te manque ${m.toLocaleString('fr-FR')} pièces (environ ${n} commande${n > 1 ? 's' : ''} livrée${n > 1 ? 's' : ''})`;
}
