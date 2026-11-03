/** Shopping de luxe : logique pure (boutiques fictives, options, réactions). Aucun DOM. */
import { CLOTH_IDS, CLOTH_SLOTS, type ClothId } from '../../../data/world/ids';
import { CLOTHES } from '../../../data/world/wardrobe';

export interface Boutique { id: string; name: string; tagline: string; sign: string; wall: [string, string]; accent: string }
export const BOUTIQUES: Boutique[] = [
  { id: 'lysandre', name: 'Maison Lysandre', tagline: 'Couture du soir', sign: '#F3C86B', wall: ['#FBE4EF', '#E9D2F3'], accent: '#E8558F' },
  { id: 'cerise', name: 'Atelier Cerise & Soie', tagline: 'Douceurs précieuses', sign: '#FF75A8', wall: ['#FFF1DE', '#F9D6C8'], accent: '#E8484F' },
  { id: 'etoile', name: 'Galerie des Étoiles', tagline: 'Pièces rares', sign: '#B9A5E8', wall: ['#DCE6FA', '#CDBDF0'], accent: '#51446D' },
];

export const isClothId = (x: unknown): x is ClothId => typeof x === 'string' && Object.prototype.hasOwnProperty.call(CLOTH_SLOTS, x);

/** Articles de luxe candidats quand `options` est vide (robes, vestes, sacs, chaussures, bijoux chers). */
export function luxuryPool(): ClothId[] {
  const slots = new Set(['dress', 'jacket', 'bag', 'shoes', 'crown', 'acc']);
  return CLOTH_IDS.filter((id) => slots.has(CLOTH_SLOTS[id]) && CLOTHES[id] && !CLOTHES[id].starter).sort((a, b) => (CLOTHES[b].coins - CLOTHES[a].coins) || (a < b ? -1 : 1));
}

/** Nettoie les options proposées : valides, sans doublon, 3 à 6 ; complète avec des articles existants si besoin. Jamais d'exception. */
export function sanitizeOptions(raw: unknown, rng: () => number = Math.random): ClothId[] {
  const out: ClothId[] = [];
  if (Array.isArray(raw)) for (const x of raw) if (isClothId(x) && !out.includes(x) && out.length < 6) out.push(x);
  if (out.length >= 3) return out;
  const pool = luxuryPool().slice(0, 24).filter((id) => !out.includes(id));
  const target = out.length === 0 ? 4 : 3;
  while (out.length < target && pool.length) {
    const i = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Nombre de boutiques visitées (1 à 3 ; défaut 3), jamais plus que d'articles. */
export const boutiqueCount = (raw: unknown, items: number): number => {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 3;
  return Math.max(1, Math.min(3, n, Math.max(1, items)));
};
/** Répartit les articles dans les boutiques (aucune boutique vide si assez d'articles). */
export function assignBoutiques(items: readonly ClothId[], count: number): ClothId[][] {
  const shops: ClothId[][] = Array.from({ length: Math.max(1, count) }, () => []);
  items.forEach((it, i) => shops[i % shops.length].push(it));
  return shops;
}

const REACT: Record<string, string[]> = {
  dress: ['Cette robe te va comme un rêve, ma reine.', 'Oh... tourne un peu, galbi !', 'Je crois que j\'ai oublié de respirer.'],
  jacket: ['Quelle allure, ma reine !', 'Cette veste, c\'est du caractère. J\'adore.'],
  bag: ['Ce sac a l\'air fait pour toi.', 'Très chic, galbi.'],
  shoes: ['Ces chaussures... tu vas faire tourner les têtes.', 'Je te suivrais n\'importe où avec ça.'],
  acc: ['Ça brille presque autant que toi.', 'Un détail, et tout change. Magnifique.'],
  crown: ['Une couronne ? Évidemment, ma reine.'],
  top: ['Très joli, ça te va bien.'], bottom: ['Élégant, ça te va bien.'],
};
export function reactionFor(id: ClothId, rng: () => number): string {
  const list = REACT[CLOTH_SLOTS[id]] ?? REACT.acc;
  return list[Math.floor(rng() * list.length) % list.length];
}
/** Valeur affichée en pièces virtuelles (offerte par Auguste). */
export const giftValue = (id: ClothId): number => CLOTHES[id]?.coins ?? 0;
export const clothName = (id: ClothId): string => CLOTHES[id]?.name ?? id;
