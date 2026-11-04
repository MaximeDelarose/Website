/**
 * Règles PURES de l'ouverture de cadeaux (aucun DOM) : nettoyage des données, variantes visuelles par type et rareté,
 * minutage, budget de particules, libellés, enchaînement.
 */
import type { GiftKind, GiftRarity, GiftSpec, Reward, RewardType } from './types';

export const RARITY_ORDER: readonly GiftRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<GiftRarity, string> = { common: '#9FB4C7', uncommon: '#6FCF97', rare: '#5AA9FF', epic: '#B07CFF', legendary: '#FFC857' };
export const RARITY_NAME: Record<GiftRarity, string> = { common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };
export const GIFT_KINDS: readonly GiftKind[] = ['start', 'daily', 'chest', 'event', 'premium', 'romantic'];
export const REWARD_TYPES: readonly RewardType[] = ['coins', 'diamonds', 'energy', 'tickets', 'hearts', 'res', 'cloth', 'furniture', 'chest', 'memory', 'bouquet', 'item'];

/** Limites de sûreté. */
export const MAX_GIFTS = 3;
export const MAX_REWARDS = 16;
export const MAX_QTY = 9_999_999;
export const MAX_TEXT = 90;
export const MAX_MESSAGE = 260;

export const rarityIndex = (r: GiftRarity): number => RARITY_ORDER.indexOf(r);

// ------------------------------------------------------------------ nettoyage

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Texte brut : sans balises ni caractères de contrôle, longueur plafonnée. Rendu ensuite avec textContent (jamais innerHTML). */
export function cleanText(v: unknown, max = MAX_TEXT): string {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  // eslint-disable-next-line no-control-regex
  return String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

const cleanId = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/[^\w:+.-]/g, '').slice(0, 60);
  return s || undefined;
};

/** Image autorisée : data:image, blob: ou chemin relatif du jeu (jamais d'adresse externe). */
export function cleanIcon(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > 400_000) return undefined;
  if (/^data:image\/(png|jpe?g|webp|svg\+xml|gif);/i.test(v) || /^blob:/i.test(v) || /^\.{0,2}\/[\w./-]+$/.test(v)) return v;
  return undefined;
}

export const asRarity = (v: unknown, d: GiftRarity = 'common'): GiftRarity => (RARITY_ORDER as readonly unknown[]).includes(v) ? (v as GiftRarity) : d;
const qtyOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_QTY, Math.max(0, Math.floor(v))) : 0);

export function sanitizeReward(raw: unknown): Reward | null {
  if (!isObj(raw)) return null;
  const type = raw.type as RewardType;
  if (!REWARD_TYPES.includes(type)) return null;
  const qty = qtyOf(raw.qty);
  if (qty <= 0) return null;
  const r: Reward = { type, qty };
  const id = cleanId(raw.id);
  if (id) r.id = id;
  const label = cleanText(raw.label, 60);
  if (label) r.label = label;
  const icon = cleanIcon(raw.icon);
  if (icon) r.icon = icon;
  if (raw.rarity !== undefined) r.rarity = asRarity(raw.rarity);
  if (raw.granted === true) r.granted = true;
  // objets uniques : une seule pièce à la fois
  if (type === 'cloth' || type === 'furniture' || type === 'memory') r.qty = 1;
  return r;
}

/** Fusionne les récompenses identiques (même type, id, état « déjà attribué ») : la somme est exacte, rien ne se perd. */
export function mergeRewards(list: readonly Reward[]): Reward[] {
  const out: Reward[] = [];
  const index = new Map<string, Reward>();
  for (const r of list) {
    const stack = r.type === 'coins' || r.type === 'diamonds' || r.type === 'energy' || r.type === 'tickets' || r.type === 'hearts' || r.type === 'res' || r.type === 'chest' || r.type === 'bouquet' || (r.type === 'item' && !!r.id);
    if (!stack) { out.push({ ...r }); continue; }
    const k = `${r.type}|${r.id ?? ''}|${r.granted ? 1 : 0}|${r.label ?? ''}`;
    const have = index.get(k);
    if (have) have.qty = Math.min(MAX_QTY, have.qty + r.qty);
    else { const c = { ...r }; index.set(k, c); out.push(c); }
  }
  return out;
}

/** Nettoie un cadeau reçu de l'extérieur (jamais d'exception ; un cadeau sans récompense valable reste montrable). */
export function sanitizeSpec(raw: unknown, depth = 0): GiftSpec {
  const o = isObj(raw) ? raw : {};
  const kind: GiftKind = GIFT_KINDS.includes(o.kind as GiftKind) ? (o.kind as GiftKind) : 'chest';
  const rewards = mergeRewards((Array.isArray(o.rewards) ? o.rewards : []).map(sanitizeReward).filter((r): r is Reward => !!r)).slice(0, MAX_REWARDS);
  const spec: GiftSpec = { kind, rarity: asRarity(o.rarity), title: cleanText(o.title) || defaultTitle(kind), rewards };
  const sub = cleanText(o.subtitle);
  if (sub) spec.subtitle = sub;
  const msg = cleanText(o.message, MAX_MESSAGE);
  if (msg) spec.message = msg;
  const key = cleanId(o.key);
  if (key) spec.key = key;
  if (isObj(o.day)) {
    const of = Math.min(31, Math.max(1, Math.floor(Number(o.day.of) || 0)));
    const n = Math.min(of, Math.max(1, Math.floor(Number(o.day.n) || 0)));
    if (of >= 2) spec.day = { n, of };
  }
  if (depth === 0 && Array.isArray(o.chain)) spec.chain = o.chain.slice(0, MAX_GIFTS - 1).map((c) => sanitizeSpec(c, 1));
  return spec;
}

/** Le cadeau principal puis ceux de `chain` : 3 au plus, chacun sans `chain`. */
export function flattenChain(spec: GiftSpec): GiftSpec[] {
  const { chain, ...first } = spec;
  return [first as GiftSpec, ...(chain ?? []).map((c) => { const { chain: _c, ...rest } = c; return rest as GiftSpec; })].slice(0, MAX_GIFTS);
}

export function defaultTitle(kind: GiftKind): string {
  return { start: 'Bonus de démarrage !', daily: 'Cadeau du jour !', chest: 'Récompense obtenue !', event: 'Surprise pour toi ♡', premium: 'Un trésor pour toi !', romantic: 'Un cadeau d\'Auguste ♡' }[kind];
}

// ------------------------------------------------------------------ variantes visuelles

export type ArtStyle = 'gift' | 'event' | 'chest' | 'premium' | 'casket';
export interface Palette { main: string; ribbon: string; accent: string; glow: string; dark: string }
export interface Look {
  kind: GiftKind;
  rarity: GiftRarity;
  tier: number;
  art: ArtStyle;
  palette: Palette;
  hearts: boolean;
  /** Aura dorée autour du coffre (épique et au-delà). */
  aura: boolean;
  /** Flash blanc à l'ouverture (0..1). */
  flash: number;
  /** Durée de la pré-ouverture, ms (0,6 à 0,9 s). */
  preMs: number;
  /** Amplitude de la secousse, degrés. */
  shake: number;
  invite: string;
  burst: { stars: number; confetti: number; hearts: number; rainMs: number };
  /** Son joué à l'ouverture (en plus du « giftBurst »). */
  sfx: 'none' | 'rare' | 'epic' | 'legendary' | 'love';
  haptic: 'reward' | 'chest' | 'maxMerge' | 'rare' | 'daily';
}

const BASE: Record<GiftKind, { art: ArtStyle; main: string; ribbon: string; accent: string; dark: string }> = {
  start: { art: 'gift', main: '#FF8DB4', ribbon: '#FFF4E8', accent: '#F3C86B', dark: '#C4407A' },
  daily: { art: 'gift', main: '#B9A5E8', ribbon: '#FFFFFF', accent: '#FF8DB4', dark: '#7A66B8' },
  chest: { art: 'chest', main: '#9C6B4E', ribbon: '#F3C86B', accent: '#7C6BB0', dark: '#58433F' },
  event: { art: 'event', main: '#7C6BB0', ribbon: '#FFE9A8', accent: '#FF75A8', dark: '#51446D' },
  premium: { art: 'premium', main: '#6A4FB0', ribbon: '#FFD76A', accent: '#FFF3C4', dark: '#3B3152' },
  romantic: { art: 'casket', main: '#FFC0D3', ribbon: '#FFFFFF', accent: '#E8558F', dark: '#C23A73' },
};

const PRE_MS = [640, 700, 760, 820, 880];
const INVITE: Record<GiftKind, string> = {
  start: 'Touche pour ouvrir ton cadeau !', daily: 'Touche pour ouvrir ton cadeau !', chest: 'Touche pour ouvrir le coffre !',
  event: 'Touche pour ouvrir la surprise !', premium: 'Touche pour ouvrir le coffre !', romantic: 'Touche pour ouvrir l\'écrin ♡',
};

/** Aspect complet d'un cadeau d'après son type et sa rareté (le type fixe la forme, la rareté l'intensité et l'éclat). */
export function lookFor(kind: GiftKind, rarity: GiftRarity): Look {
  const b = BASE[kind];
  const tier = Math.max(0, rarityIndex(rarity));
  const rc = RARITY_COLOR[rarity];
  const romantic = kind === 'romantic';
  // la rareté teinte la lueur et les bandes du coffre ; le cadeau garde sa couleur de famille
  const palette: Palette = { main: b.main, ribbon: b.ribbon, accent: kind === 'chest' ? rc : b.accent, glow: romantic ? '#FFB3CC' : tier >= 3 ? '#FFD76A' : rc, dark: b.dark };
  return {
    kind, rarity, tier, art: b.art, palette, hearts: romantic, aura: tier >= 3 || kind === 'premium',
    flash: [0.28, 0.4, 0.55, 0.85, 0.95][tier] * (romantic ? 0.7 : 1),
    preMs: PRE_MS[tier], shake: 3 + tier * 1.6,
    invite: INVITE[kind],
    burst: { stars: [8, 12, 18, 26, 34][tier], confetti: [8, 12, 20, 28, 36][tier] * (romantic ? 0.4 : 1), hearts: romantic ? [10, 14, 18, 24, 30][tier] : 0, rainMs: [500, 700, 1000, 1400, 1800][tier] },
    sfx: romantic ? 'love' : tier >= 4 ? 'legendary' : tier === 3 ? 'epic' : tier === 2 ? 'rare' : 'none',
    haptic: romantic ? 'daily' : tier >= 3 ? 'maxMerge' : tier === 2 ? 'rare' : kind === 'daily' ? 'daily' : 'chest',
  };
}

// ------------------------------------------------------------------ minutage

export interface Timeline { appear: number; wait: number; pre: number; open: number; revealStep: number; fly: number; flyStagger: number; settle: number }
/** Durées (ms). `fast` (bouton « Passer » / « Tout ouvrir ») les raccourcit sans rien enlever ; animations réduites : quasi instantané. */
export function timeline(look: Look, mode: 'normal' | 'fast' | 'reduced'): Timeline {
  const t: Timeline = { appear: look.kind === 'daily' ? 520 : 700, wait: 0, pre: look.preMs, open: 520 + look.tier * 40, revealStep: look.kind === 'daily' ? 230 : 300, fly: 700, flyStagger: 90, settle: 350 };
  if (mode === 'normal') return t;
  const k = mode === 'fast' ? 0.35 : 0.12;
  return { appear: t.appear * k, wait: 0, pre: t.pre * k, open: t.open * k, revealStep: t.revealStep * k, fly: t.fly * k, flyStagger: t.flyStagger * k, settle: t.settle * k };
}

// ------------------------------------------------------------------ particules

export const MAX_LIVE_PARTICLES = 90;
export const MAX_PER_BURST = 40;
export const REDUCED_STARS = 5;

/** Nombre de particules réellement créées : plafonné par salve et par budget restant ; animations réduites : quelques étoiles statiques. */
export function particleCount(requested: number, live: number, reduced: boolean): number {
  const want = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  if (reduced) return Math.min(want, REDUCED_STARS);
  return Math.max(0, Math.min(want, MAX_PER_BURST, MAX_LIVE_PARTICLES - Math.max(0, live)));
}

export interface Particle { shape: 'star' | 'heart' | 'conf' | 'dot'; color: string; x: number; y: number; vx: number; vy: number; g: number; rot: number; vr: number; size: number; life: number; age: number; drag: number }

/** Un pas de simulation (secondes). Renvoie faux quand la particule est finie. */
export function stepParticle(p: Particle, dt: number): boolean {
  p.age += dt;
  if (p.age >= p.life) return false;
  const d = Math.pow(p.drag, dt * 60);
  p.vx *= d; p.vy = p.vy * d + p.g * dt;
  p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  return true;
}

/** Alpha d'une particule : apparition vive, fondu sur le dernier tiers. */
export const particleAlpha = (p: Particle): number => { const u = p.age / p.life; return u < 0.08 ? u / 0.08 : u > 0.65 ? Math.max(0, (1 - u) / 0.35) : 1; };

export type ParticleKind = 'star' | 'heart' | 'conf' | 'dot';
export interface BurstOpts { kind: ParticleKind; n: number; colors: string[]; speed?: number; gravity?: number; up?: number; life?: number; size?: number; spread?: number }

/** Salve de particules depuis (x, y) (déterministe avec `rng`). */
export function planBurst(x: number, y: number, o: BurstOpts, live: number, reduced: boolean, rng: () => number = Math.random): Particle[] {
  const n = particleCount(o.n, live, reduced);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = o.spread !== undefined ? -Math.PI / 2 + (rng() - 0.5) * o.spread : rng() * Math.PI * 2;
    const sp = (o.speed ?? 260) * (0.45 + rng() * 0.75);
    out.push({
      shape: o.kind, color: o.colors[i % o.colors.length], x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 0) * rng(), g: o.gravity ?? 380,
      rot: rng() * Math.PI * 2, vr: (rng() - 0.5) * 9, size: (o.size ?? 10) * (0.7 + rng() * 0.7),
      life: (o.life ?? 1.1) * (0.7 + rng() * 0.6), age: 0, drag: o.kind === 'conf' ? 0.985 : 0.96,
    });
  }
  return out;
}

// ------------------------------------------------------------------ libellés et raretés des récompenses

const RES_LABEL: Record<string, string> = { coins: 'pièces', flowers: 'fleurs', fabric: 'tissu', cocoa: 'cacao' };
export const BANK_TYPES = ['diamonds', 'energy', 'coins', 'tickets', 'hearts', 'flowers', 'fabric', 'cocoa'] as const;
export type BankType = (typeof BANK_TYPES)[number];

/** Compteur visé par une récompense (null : elle reste dans l'inventaire, rien ne vole). */
export function bankOf(r: Pick<Reward, 'type' | 'id'>): BankType | null {
  switch (r.type) {
    case 'coins': return 'coins';
    case 'diamonds': return 'diamonds';
    case 'energy': return 'energy';
    case 'tickets': return 'tickets';
    case 'hearts': return 'hearts';
    case 'res': return r.id === 'flowers' || r.id === 'fabric' || r.id === 'cocoa' ? r.id : 'coins';
    default: return null;
  }
}

export const BANK_LABEL: Record<BankType, string> = { diamonds: 'Diamants', energy: 'Énergie', coins: 'Pièces', tickets: 'Tickets', hearts: 'Cœurs', flowers: 'Fleurs', fabric: 'Tissu', cocoa: 'Cacao' };

/** Libellé sans nom propre (le nom de l'objet vient de l'hôte). */
export function genericLabel(r: Pick<Reward, 'type' | 'id'>): string {
  switch (r.type) {
    case 'coins': return 'pièces';
    case 'diamonds': return 'diamants';
    case 'energy': return 'énergie';
    case 'tickets': return 'tickets du Casino Royal';
    case 'hearts': return 'cœurs';
    case 'res': return RES_LABEL[r.id ?? 'coins'] ?? 'ressource';
    case 'chest': return 'Coffre bonus';
    case 'cloth': return 'Tenue';
    case 'furniture': return 'Décoration';
    case 'memory': return 'Souvenir';
    case 'bouquet': return 'Bouquet rare';
    case 'item': return r.id === 'wand' ? 'Baguette' : r.id === 'wind' ? 'Souffle' : 'Surprise';
  }
}

/** Rareté de la vignette d'une récompense. */
export function rewardRarity(r: Reward, gift: GiftRarity): GiftRarity {
  if (r.rarity) return r.rarity;
  switch (r.type) {
    case 'coins': case 'energy': return 'common';
    case 'res': return 'common';
    case 'diamonds': return r.qty >= 100 ? 'rare' : 'uncommon';
    case 'hearts': return 'uncommon';
    case 'tickets': return r.qty >= 300 ? 'rare' : 'uncommon';
    case 'chest': return 'rare';
    case 'memory': return 'epic';
    case 'bouquet': return 'rare';
    case 'cloth': case 'furniture': return rarityIndex(gift) >= 2 ? gift : 'rare';
    case 'item': return 'uncommon';
  }
}

/** Texte de quantité : « ×250 » pour les quantités, vide pour les objets uniques. */
export function qtyText(r: Pick<Reward, 'type' | 'qty'>): string {
  if (r.type === 'cloth' || r.type === 'furniture' || r.type === 'memory') return '';
  return `×${Math.floor(r.qty).toLocaleString('fr-FR')}`;
}

// ------------------------------------------------------------------ messages tendres d'Auguste

export const AUGUSTE_NOTES: readonly string[] = [
  'J\'ai pensé à toi en préparant ça, Radia ♡',
  'Rien d\'extraordinaire… juste l\'envie de te voir sourire.',
  'Ouvre-le doucement. Il est pour toi, et pour toi seulement ♡',
  'Tu me manquais déjà. Alors j\'ai trouvé une excuse pour t\'offrir quelque chose.',
];
export const augusteNote = (seed: number): string => AUGUSTE_NOTES[Math.abs(Math.floor(seed)) % AUGUSTE_NOTES.length];
