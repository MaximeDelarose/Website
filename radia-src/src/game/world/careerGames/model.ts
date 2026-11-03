/**
 * Mini-jeu « Mannequin » : composer, avec les vêtements POSSÉDÉS, une tenue qui
 * correspond à un thème imposé (Casual / Chic / Romantique / Royal / Scène).
 * Le score = adéquation des styles du catalogue (`CLOTHES`).
 */
import type { ClothId, Look, StyleId } from '../../../data/world/ids';
import { CLOTHES } from '../../../data/world/wardrobe';
import { pick, shuffle, type Rng } from './rng';

const WEIGHT = { dress: 3, top: 1.5, bottom: 1.5, jacket: 1, shoes: 1, bag: 0.5, acc: 0.5, crown: 1 } as const;
/** Poids total « idéal » que le jury attend selon la difficulté (1–5). */
const NEED = [3, 4, 5, 5.5, 6];

export interface Piece { id: ClothId; weight: number; match: boolean }
export interface LookAssessment { score: number; pieces: Piece[]; matched: number; worn: number; complete: boolean; richness: number; stars: number }

/** Pièces réellement portées (une robe remplace haut + bas). */
export function wornPieces(look: Look): { id: ClothId; weight: number }[] {
  const out: { id: ClothId; weight: number }[] = [];
  const add = (id: ClothId | null | undefined, weight: number) => { if (id && CLOTHES[id]) out.push({ id, weight }); };
  if (look.dress && CLOTHES[look.dress]) add(look.dress, WEIGHT.dress);
  else { add(look.top, WEIGHT.top); add(look.bottom, WEIGHT.bottom); }
  add(look.jacket, WEIGHT.jacket);
  add(look.shoes, WEIGHT.shoes);
  add(look.bag, WEIGHT.bag);
  for (const a of (look.acc ?? []).slice(0, 3)) add(a, WEIGHT.acc);
  add(look.crown, WEIGHT.crown);
  return out;
}

/** Adéquation d'un look à un thème, 0–100. */
export function assessLook(look: Look, style: StyleId, difficulty = 1): LookAssessment {
  const worn = wornPieces(look);
  const pieces: Piece[] = worn.map((p) => ({ ...p, match: CLOTHES[p.id].styles.includes(style) }));
  const total = pieces.reduce((a, p) => a + p.weight, 0);
  const matched = pieces.reduce((a, p) => a + (p.match ? p.weight : 0), 0);
  const complete = !!look.dress ? true : !!(look.top && look.bottom);
  const need = NEED[Math.max(1, Math.min(5, difficulty)) - 1];
  const richness = total > 0 ? Math.min(1, total / need) : 0;
  const raw = total > 0 ? (matched / total) * (complete ? 1 : 0.6) * (0.6 + 0.4 * richness) : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw * 100)));
  return { score, pieces, matched, worn: total, complete, richness, stars: score >= 90 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0 };
}

/** Seul le score de thème d'un look (0–100), sans notion de difficulté. */
export const lookStyleScore = (look: Look, style: StyleId): number => assessLook(look, style, 1).score;

/** Un look ne peut contenir que des vêtements possédés. */
export function lookIsOwned(look: Look, owned: readonly string[]): boolean {
  return wornPieces(look).every((p) => owned.includes(p.id));
}

/** Thèmes proposés pour une séance (3 contrats au choix, dont celui que l'objectif demande). */
export function offerThemes(difficulty: number, rng: Rng, want?: StyleId | null): StyleId[] {
  const pool: StyleId[] = ['casual', 'chic', 'romantic'];
  if (difficulty >= 3) pool.push('royal');
  if (difficulty >= 4) pool.push('stage');
  const out = shuffle(pool, rng).slice(0, 3);
  if (want && pool.includes(want) && !out.includes(want)) out[0] = want;
  return out;
}

/** Séance : étiquettes (pour les objectifs). */
export const modelTags = (style: StyleId): string[] => [style];

/**
 * Meilleur look possible avec les vêtements possédés pour un thème
 * (aide au test de faisabilité et pour la suggestion « idée de styliste »).
 */
export function bestLook(owned: readonly string[], style: StyleId, difficulty = 1, base?: Look): Look {
  const own = (owned as ClothId[]).filter((id) => CLOTHES[id]);
  const bySlot = (slot: string) => own.filter((id) => CLOTHES[id].slot === slot);
  const rank = (ids: ClothId[]) => ids.slice().sort((a, b) => (CLOTHES[b].styles.includes(style) ? 1 : 0) - (CLOTHES[a].styles.includes(style) ? 1 : 0) || CLOTHES[a].styles.length - CLOTHES[b].styles.length);
  const best = (slot: string, onlyMatch = true): ClothId | null => {
    const r = rank(bySlot(slot));
    const m = r.find((id) => CLOTHES[id].styles.includes(style));
    return m ?? (onlyMatch ? null : r[0] ?? null);
  };
  const look: Look = { hair: base?.hair ?? 'hair-loose', top: null, bottom: null, dress: null, jacket: null, shoes: null, bag: null, acc: [], crown: null };
  look.dress = best('dress');
  if (!look.dress) { look.top = best('top', false); look.bottom = best('bottom', false); }
  look.jacket = best('jacket'); look.shoes = best('shoes', false); look.bag = best('bag');
  look.crown = best('crown');
  look.acc = rank(bySlot('acc')).filter((id) => CLOTHES[id].styles.includes(style)).slice(0, 2);
  // essaie aussi la variante sans robe et garde la meilleure
  const alt: Look = { ...look, dress: null, top: best('top', false), bottom: best('bottom', false) };
  return assessLook(alt, style, difficulty).score > assessLook(look, style, difficulty).score ? alt : look;
}

export { pick };
