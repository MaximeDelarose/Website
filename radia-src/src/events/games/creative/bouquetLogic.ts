/** Bouquet : logique pure (variétés, tons, emballages, score d'harmonie). Aucun DOM. */
import { FLOWER_IDS, FLOWER_NAMES, type FlowerId } from '../../../data/world/ids';

export type Tone = 'pink' | 'white' | 'violet' | 'blue' | 'yellow';
export const TONES: readonly Tone[] = ['pink', 'white', 'violet', 'blue', 'yellow'];
export const TONE_NAMES: Record<Tone, string> = { pink: 'Rose', white: 'Blanc', violet: 'Violet', blue: 'Bleu', yellow: 'Soleil' };
export const TONE_COLOR: Record<Tone, string> = { pink: '#FF8FB1', white: '#FFF4E8', violet: '#B9A5E8', blue: '#8FB6F0', yellow: '#F3C86B' };

export const FLOWER_TONE: Record<FlowerId, Tone> = {
  rose: 'pink', tulip: 'pink', peony: 'pink', daisy: 'white', lavender: 'violet',
  hydrangea: 'blue', orchid: 'violet', lily: 'white', sunflower: 'yellow', magic: 'blue',
};
export { FLOWER_IDS, FLOWER_NAMES };
export type { FlowerId };

const pairKey = (a: Tone, b: Tone): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
const COMPAT: Record<string, number> = {
  [pairKey('pink', 'white')]: 0.95, [pairKey('pink', 'violet')]: 0.8, [pairKey('white', 'violet')]: 0.9,
  [pairKey('white', 'blue')]: 0.9, [pairKey('white', 'yellow')]: 0.9, [pairKey('violet', 'blue')]: 0.9,
  [pairKey('pink', 'blue')]: 0.45, [pairKey('pink', 'yellow')]: 0.5, [pairKey('violet', 'yellow')]: 0.35,
  [pairKey('blue', 'yellow')]: 0.4,
};
export const toneCompat = (a: Tone, b: Tone): number => (a === b ? 1 : COMPAT[pairKey(a, b)] ?? 0.5);

export interface Theme { id: string; name: string; tones: Tone[]; swatch: string[] }
export const THEMES: Theme[] = [
  { id: 'tendre', name: 'Rose tendre', tones: ['pink', 'white'], swatch: ['#FF8FB1', '#FFF4E8'] },
  { id: 'lavande', name: 'Lavande', tones: ['violet', 'blue'], swatch: ['#B9A5E8', '#8FB6F0'] },
  { id: 'soleil', name: 'Soleil', tones: ['yellow', 'white'], swatch: ['#F3C86B', '#FFF4E8'] },
  { id: 'ciel', name: 'Ciel doux', tones: ['blue', 'white'], swatch: ['#8FB6F0', '#FFF4E8'] },
];

export const WRAP_IDS = ['kraft', 'silk', 'lace', 'gold', 'velvet'] as const;
export type WrapId = (typeof WRAP_IDS)[number];
export const WRAP_NAMES: Record<WrapId, string> = { kraft: 'Papier kraft', silk: 'Soie rose', lace: 'Dentelle', gold: 'Ruban or', velvet: 'Velours lavande' };
/** Affinité emballage × ton (0.6–1). */
const WRAP_AFF: Record<WrapId, Record<Tone, number>> = {
  kraft: { pink: 0.85, white: 0.9, violet: 0.75, blue: 0.7, yellow: 1 },
  silk: { pink: 1, white: 0.9, violet: 0.8, blue: 0.65, yellow: 0.65 },
  lace: { pink: 0.9, white: 1, violet: 0.85, blue: 0.85, yellow: 0.8 },
  gold: { pink: 0.85, white: 0.95, violet: 0.8, blue: 0.75, yellow: 0.95 },
  velvet: { pink: 0.8, white: 0.9, violet: 1, blue: 0.95, yellow: 0.65 },
};
export const isWrap = (w: unknown): w is WrapId => typeof w === 'string' && (WRAP_IDS as readonly string[]).includes(w);
export const isFlower = (f: unknown): f is FlowerId => typeof f === 'string' && (FLOWER_IDS as readonly string[]).includes(f);

export type BouquetMode = 'market' | 'kid' | 'hotel' | 'palace';
export const BOUQUET_MODES: BouquetMode[] = ['market', 'kid', 'hotel', 'palace'];
export const normBouquetMode = (m: unknown): BouquetMode => (BOUQUET_MODES as readonly unknown[]).includes(m) ? (m as BouquetMode) : 'market';
export const BOUQUET_MIN = 5;
export const BOUQUET_MAX = 7;
/** Variétés proposées (le mode « kid » en montre moins, plus gros). */
export const bouquetChoices = (mode: BouquetMode): FlowerId[] => (mode === 'kid' ? ['rose', 'tulip', 'daisy', 'sunflower', 'lavender', 'peony'] : [...FLOWER_IDS]);

export interface Harmony { score: number; variety: number; palette: number; balance: number; wrap: number; theme: number; count: number; distinct: number }
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** Harmonie d'un bouquet (0–100) : variété, palette cohérente, équilibre, accord avec l'emballage et l'ambiance choisie. Pure et déterministe. */
export function bouquetHarmony(flowers: readonly string[], wrap: string, themeTones?: readonly Tone[]): Harmony {
  const fl = flowers.filter(isFlower);
  const n = fl.length;
  if (n === 0) return { score: 0, variety: 0, palette: 0, balance: 0, wrap: 0, theme: 0, count: 0, distinct: 0 };
  const tones = fl.map((f) => FLOWER_TONE[f]);
  const d = new Set(fl).size;
  const variety = d === 1 ? 0.3 : d === 2 ? 0.75 : d <= 4 ? 1 : d === 5 ? 0.85 : 0.7;
  let sum = 0, pairs = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { sum += toneCompat(tones[i], tones[j]); pairs++; }
  const pairScore = pairs ? sum / pairs : 1;
  const themeFit = themeTones && themeTones.length ? tones.filter((t) => themeTones.includes(t)).length / n : 1;
  const palette = clamp01(0.72 * pairScore + 0.28 * themeFit);
  const counts = new Map<string, number>();
  for (const f of fl) counts.set(f, (counts.get(f) ?? 0) + 1);
  const share = Math.max(...counts.values()) / n;
  const dominance = n === 1 ? 0 : clamp01(1 - (share - 0.4) / 0.6);
  const half = Math.floor(n / 2);
  let sym = 1;
  if (half > 0) { let ok = 0; for (let i = 0; i < half; i++) if (tones[i] === tones[n - 1 - i]) ok++; sym = ok / half; }
  const balance = clamp01(0.7 * dominance + 0.3 * sym);
  const w = isWrap(wrap) ? WRAP_AFF[wrap] : null;
  let wrapScore = 0.6;
  if (w) wrapScore = tones.reduce((a, t) => a + w[t], 0) / n;
  const raw = 0.28 * variety + 0.34 * palette + 0.22 * balance + 0.16 * wrapScore;
  const countFactor = n >= BOUQUET_MIN ? 1 : 0.4 + 0.12 * n;
  return { score: Math.round(100 * clamp01(raw * countFactor)), variety, palette, balance, wrap: wrapScore, theme: themeFit, count: n, distinct: d };
}

/** Score rendu au runner : en mode « kid », jamais décevant. */
export const finalBouquetScore = (mode: BouquetMode, h: Harmony): number => (mode === 'kid' ? Math.min(100, 70 + Math.round(h.score * 0.3)) : h.score);
export const starsOf = (score: number): number => (score >= 85 ? 3 : score >= 65 ? 2 : 1);

/** Petit conseil bienveillant (jamais un reproche). */
export function bouquetTip(h: Harmony): string {
  if (h.count < BOUQUET_MIN) return 'Encore quelques fleurs ♡';
  if (h.variety < 0.8) return h.distinct >= 5 ? 'Répéter une fleur ferait un joli rythme.' : 'Une autre variété ferait joli.';
  if (h.palette < 0.75) return 'Des couleurs plus proches iraient bien ensemble.';
  if (h.balance < 0.7) return 'Répartis un peu mieux les fleurs.';
  return 'Quel bouquet harmonieux !';
}

export const BOUQUET_TEXT: Record<BouquetMode, { title: string; sub: string; intro: string; end: string }> = {
  market: { title: 'Marché aux fleurs', sub: 'Compose un bouquet pour ton chéri', intro: 'Choisis une ambiance, puis cinq à sept fleurs, puis un emballage.', end: 'Il est parfait, ma reine.' },
  kid: { title: 'Mon joli bouquet', sub: 'Un bouquet tout en couleurs', intro: 'Touche les fleurs pour faire ton bouquet !', end: 'Il est plein de couleurs, bravo !' },
  hotel: { title: 'Décor floral', sub: 'Le bouquet de la suite', intro: 'Compose le bouquet qui ornera la suite.', end: 'La suite est ravissante.' },
  palace: { title: 'Fleurs du palace', sub: 'Un bouquet digne du palace', intro: 'Compose un bouquet digne du palace.', end: 'Le palace sera fier de toi.' },
};
