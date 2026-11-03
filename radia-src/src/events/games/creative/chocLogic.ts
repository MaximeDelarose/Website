/** Coffret de chocolats : logique pure (pièces, garnitures, style, score). Aucun DOM. */
export const BASES = ['dark', 'milk', 'white'] as const;
export type BaseId = (typeof BASES)[number];
export const BASE_NAMES: Record<BaseId, string> = { dark: 'Chocolat noir', milk: 'Chocolat au lait', white: 'Chocolat blanc' };

export const TOPPING_IDS = ['noisette', 'caramel', 'fruits', 'pistache', 'etoile', 'coeur'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number];
export const TOPPING_LABEL: Record<ToppingId, string> = { noisette: 'Noisette', caramel: 'Caramel', fruits: 'Fruits rouges', pistache: 'Pistache', etoile: 'Éclat d\'or', coeur: 'Cœur' };
/** Quelle garniture dessinée de src/game/art/world/chocolate.ts (null = dessin maison). */
export const TOPPING_ART: Record<ToppingId, 'nut' | 'berry' | 'star' | 'heart' | null> = { noisette: 'nut', caramel: null, fruits: 'berry', pistache: null, etoile: 'star', coeur: 'heart' };

export interface Piece { base: BaseId; topping: ToppingId | null }
export const BOX_SLOTS = 6;

export const BOX_COLORS = ['rose', 'lavande', 'creme', 'choco'] as const;
export const RIBBONS = ['or', 'rouge', 'blanc', 'lavande'] as const;
export const LABELS = ['Pour toi', 'Je t\'aime', 'Merci', 'Mon cœur'] as const;
export type BoxColor = (typeof BOX_COLORS)[number];
export type RibbonColor = (typeof RIBBONS)[number];
export type LabelText = (typeof LABELS)[number];
export interface BoxStyle { color: BoxColor; ribbon: RibbonColor; label: LabelText }
export const BOX_COLOR_HEX: Record<BoxColor, string> = { rose: '#F5B5C8', lavande: '#CDBDF0', creme: '#FFF1DE', choco: '#8B5A48' };
export const BOX_COLOR_NAMES: Record<BoxColor, string> = { rose: 'Rose', lavande: 'Lavande', creme: 'Crème', choco: 'Chocolat' };
export const RIBBON_HEX: Record<RibbonColor, string> = { or: '#F3C86B', rouge: '#E8484F', blanc: '#FFFFFF', lavande: '#B9A5E8' };
export const RIBBON_NAMES: Record<RibbonColor, string> = { or: 'Or', rouge: 'Rouge', blanc: 'Blanc', lavande: 'Lavande' };

const STYLE_COMPAT: Record<BoxColor, Record<RibbonColor, number>> = {
  rose: { or: 0.95, rouge: 0.75, blanc: 0.9, lavande: 0.8 },
  lavande: { or: 0.9, rouge: 0.6, blanc: 1, lavande: 0.75 },
  creme: { or: 0.85, rouge: 0.95, blanc: 0.6, lavande: 0.9 },
  choco: { or: 1, rouge: 0.7, blanc: 0.9, lavande: 0.75 },
};
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
export const isBase = (b: unknown): b is BaseId => (BASES as readonly unknown[]).includes(b);
export const isTopping = (t: unknown): t is ToppingId => (TOPPING_IDS as readonly unknown[]).includes(t);

export interface BoxScore { score: number; fill: number; variety: number; garnish: number; balance: number; style: number; craft: number }

/** Score du coffret (0–100). `craft` (0–1) : soin du geste (verser/remuer). Pure et déterministe. */
export function scoreBox(pieces: ReadonlyArray<Piece | null>, style: BoxStyle, craft = 1): BoxScore {
  const ps = pieces.slice(0, BOX_SLOTS).filter((p): p is Piece => !!p && isBase(p.base));
  const n = ps.length;
  const styleScore = clamp01((STYLE_COMPAT[style.color]?.[style.ribbon] ?? 0.6) * 0.85 + ((LABELS as readonly string[]).includes(style.label) ? 0.15 : 0.05));
  const c = clamp01(craft);
  if (n === 0) return { score: 0, fill: 0, variety: 0, garnish: 0, balance: 0, style: styleScore, craft: c };
  const fill = n / BOX_SLOTS;
  const d = new Set(ps.map((p) => p.base)).size;
  const variety = d === 1 ? 0.5 : d === 2 ? 0.9 : 1;
  const topped = ps.filter((p) => isTopping(p.topping));
  const tv = new Set(topped.map((p) => p.topping)).size;
  const topVar = tv === 0 ? 0 : tv === 1 ? 0.6 : tv === 2 ? 0.9 : 1;
  const garnish = clamp01(0.6 * (topped.length / n) + 0.4 * topVar);
  const counts = new Map<string, number>();
  for (const p of ps) counts.set(p.base, (counts.get(p.base) ?? 0) + 1);
  const share = Math.max(...counts.values()) / n;
  const balance = n < 2 ? 0.5 : clamp01(1 - (share - 0.5) / 0.5);
  const raw = 0.2 * fill + 0.15 * variety + 0.25 * garnish + 0.1 * balance + 0.2 * styleScore + 0.1 * c;
  return { score: Math.round(100 * clamp01(raw)), fill, variety, garnish, balance, style: styleScore, craft: c };
}

export const starsOfBox = (score: number): number => (score >= 85 ? 3 : score >= 60 ? 2 : 1);
export type ChocMode = 'soiree' | 'hotel' | 'garden';
export const normChocMode = (m: unknown): ChocMode => (m === 'hotel' || m === 'garden' ? m : 'soiree');
export const CHOC_TEXT: Record<ChocMode, { title: string; intro: string }> = {
  soiree: { title: 'Soirée chocolats', intro: 'On prépare de bons chocolats, puis on remplit le coffret !' },
  hotel: { title: 'Chocolats de l\'hôtel', intro: 'Le chef te prête son atelier : prépare un coffret pour la chambre.' },
  garden: { title: 'Fête du jardin', intro: 'Prépare des chocolats pour la fête du jardin !' },
};
