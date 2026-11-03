/** Décor de table / de pièce : logique pure (objets, emplacements, thèmes, score d'harmonie). Aucun DOM. */
export const DECOR_MODES = ['garden', 'rooftop', 'pajama', 'hotel', 'palace'] as const;
export type DecorMode = (typeof DECOR_MODES)[number];
export const normDecorMode = (m: unknown): DecorMode => ((DECOR_MODES as readonly unknown[]).includes(m) ? (m as DecorMode) : 'garden');

export const DECOR_IDS = ['candles', 'vase', 'plates', 'lantern', 'garland', 'cushion', 'plaid', 'snacks', 'drinks', 'tablecloth', 'lights', 'candelabra', 'cake', 'teddy'] as const;
export type DecorId = (typeof DECOR_IDS)[number];
export const DECOR_NAMES: Record<DecorId, string> = {
  candles: 'Bougies', vase: 'Vase de fleurs', plates: 'Assiettes', lantern: 'Lanterne', garland: 'Guirlande', cushion: 'Coussin', plaid: 'Plaid douillet',
  snacks: 'Petits gâteaux', drinks: 'Boissons', tablecloth: 'Nappe', lights: 'Guirlande lumineuse', candelabra: 'Chandelier', cake: 'Gâteau', teddy: 'Peluche',
};
export type SlotKind = 'hang' | 'table' | 'floor' | 'cloth';
export type Category = 'light' | 'flower' | 'food' | 'comfort' | 'deco';
export const DECOR_CAT: Record<DecorId, Category> = {
  candles: 'light', vase: 'flower', plates: 'food', lantern: 'light', garland: 'deco', cushion: 'comfort', plaid: 'comfort', snacks: 'food', drinks: 'food',
  tablecloth: 'deco', lights: 'light', candelabra: 'light', cake: 'food', teddy: 'comfort',
};
export const DECOR_KINDS: Record<DecorId, SlotKind[]> = {
  candles: ['table'], vase: ['table'], plates: ['table'], lantern: ['hang', 'table'], garland: ['hang'], cushion: ['floor'], plaid: ['floor'], snacks: ['table'],
  drinks: ['table'], tablecloth: ['cloth'], lights: ['hang'], candelabra: ['table'], cake: ['table'], teddy: ['floor'],
};
export interface Slot { id: string; kind: SlotKind; /** position en % de la scène (centre) */ x: number; y: number }
export const SLOTS: Slot[] = [
  { id: 'h1', kind: 'hang', x: 20, y: 17 }, { id: 'h2', kind: 'hang', x: 50, y: 12 }, { id: 'h3', kind: 'hang', x: 80, y: 17 },
  { id: 'c1', kind: 'cloth', x: 50, y: 61 },
  { id: 't1', kind: 'table', x: 22, y: 51 }, { id: 't2', kind: 'table', x: 40, y: 47 }, { id: 't3', kind: 'table', x: 60, y: 47 }, { id: 't4', kind: 'table', x: 78, y: 51 }, { id: 't5', kind: 'table', x: 50, y: 53 },
  { id: 'f1', kind: 'floor', x: 18, y: 84 }, { id: 'f2', kind: 'floor', x: 82, y: 84 },
];
export const DECOR_MIN = 6;
export const fitsSlot = (id: DecorId, slot: Slot): boolean => DECOR_KINDS[id].includes(slot.kind);
export const isDecor = (x: unknown): x is DecorId => (DECOR_IDS as readonly unknown[]).includes(x);

export const THEME_OBJECTS: Record<DecorMode, DecorId[]> = {
  garden: ['lantern', 'vase', 'garland', 'lights', 'plates', 'drinks', 'snacks', 'tablecloth'],
  rooftop: ['lights', 'candles', 'lantern', 'drinks', 'cushion', 'plaid', 'snacks'],
  pajama: ['cushion', 'plaid', 'teddy', 'snacks', 'drinks', 'lights', 'cake'],
  hotel: ['tablecloth', 'vase', 'candles', 'plates', 'drinks', 'cake', 'candelabra'],
  palace: ['candelabra', 'tablecloth', 'vase', 'plates', 'cake', 'garland', 'candles'],
};
export const DECOR_TEXT: Record<DecorMode, { title: string; intro: string; place: string }> = {
  garden: { title: 'Table du jardin', intro: 'Installe une jolie table pour le jardin.', place: 'le jardin' },
  rooftop: { title: 'Rooftop étoilé', intro: 'Installe un coin romantique sous les étoiles.', place: 'le rooftop' },
  pajama: { title: 'Soirée pyjama', intro: 'Installe un coin douillet pour la soirée pyjama !', place: 'le coin douillet' },
  hotel: { title: 'Table de l\'hôtel', intro: 'Dresse la table de la suite.', place: 'la suite' },
  palace: { title: 'Table du palace', intro: 'Dresse une table digne du palace.', place: 'le palace' },
};

export interface Placed { slot: string; obj: DecorId }
export interface DecorScore { score: number; theme: number; balance: number; variety: number; coverage: number }
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** Nettoie un placement : emplacements connus, objets compatibles, un objet par emplacement. */
export function cleanPlaced(raw: ReadonlyArray<Placed>): Placed[] {
  const seen = new Set<string>();
  const out: Placed[] = [];
  for (const p of raw) {
    const s = SLOTS.find((x) => x.id === p?.slot);
    if (!s || seen.has(s.id) || !isDecor(p.obj) || !fitsSlot(p.obj, s)) continue;
    seen.add(s.id); out.push({ slot: s.id, obj: p.obj });
  }
  return out;
}

/** Harmonie (0–100) : thème respecté, équilibre des catégories, variété, remplissage. Pure et déterministe. */
export function decorHarmony(mode: DecorMode, raw: ReadonlyArray<Placed>): DecorScore {
  const placed = cleanPlaced(raw);
  const n = placed.length;
  if (n === 0) return { score: 0, theme: 0, balance: 0, variety: 0, coverage: 0 };
  const theme = placed.filter((p) => THEME_OBJECTS[mode].includes(p.obj)).length / n;
  const cats = new Set(placed.map((p) => DECOR_CAT[p.obj]));
  const catCounts = new Map<Category, number>();
  for (const p of placed) catCounts.set(DECOR_CAT[p.obj], (catCounts.get(DECOR_CAT[p.obj]) ?? 0) + 1);
  const share = Math.max(...catCounts.values()) / n;
  const balance = clamp01(0.6 * Math.min(1, cats.size / 4) + 0.4 * clamp01(1 - (share - 0.4) / 0.6));
  const variety = clamp01(new Set(placed.map((p) => p.obj)).size / Math.max(1, n));
  const coverage = clamp01(n / 9);
  const raw0 = 0.35 * theme + 0.25 * balance + 0.2 * variety + 0.2 * coverage;
  return { score: Math.round(100 * clamp01(raw0)), theme, balance, variety, coverage };
}
export const starsOfDecor = (s: number): number => (s >= 80 ? 3 : s >= 55 ? 2 : 1);
