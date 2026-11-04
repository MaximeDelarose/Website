/**
 * Logique PURE de la page « Carrière » (aucun DOM) : textes de la grande carte
 * d'activité, étapes de palier, fatigue douce, bonus de séance (pièces, tenue
 * rare) et description du « moment » annoncé aux applications du téléphone.
 */
import type { CareerId, ClothId, StyleId } from '../../../../data/world/ids';
import { CLOTHES, STYLE_NAMES } from '../../../../data/world/wardrobe';
import { CAREERS } from '../../../../data/world/careers';
import { applyReward, levelOf, objectiveProgress, MAX_LEVEL, type SessionOutcome } from '../../../../game/world/careers';
import type { World } from '../../../../save/schema';
import type { MomentKind } from '../../../../apps/moments';
import type { Rng } from '../../../../game/world/careerGames/rng';

// ------------------------------------------------------------------ textes de la grande carte
export interface ActivityCopy {
  kicker: string; title: string; place: string; cta: string; mood: string;
  /** Type de « moment » annoncé en fin de séance. */
  moment: Extract<MomentKind, 'shooting' | 'runway' | 'scene' | 'concert'>;
}
export const ACTIVITY: Record<CareerId, ActivityCopy> = {
  photo: { kicker: 'Ton prochain shooting ♡', title: 'Séance au studio', place: 'Le studio de la photographe', cta: 'Participer au shooting', mood: 'Choisis une pose, cadre, et clic au bon moment.', moment: 'shooting' },
  model: { kicker: 'Ton prochain défilé ♡', title: 'Défilé sur le podium', place: 'Le grand podium', cta: 'Participer au défilé', mood: 'Compose une tenue qui colle au thème, puis défile.', moment: 'runway' },
  actress: { kicker: 'Ta prochaine scène ♡', title: 'Tournage sur le plateau', place: 'Le plateau de tournage', cta: 'Jouer la scène', mood: 'Choisis les répliques justes et joue l\'émotion.', moment: 'scene' },
  singer: { kicker: 'Ton prochain concert ♡', title: 'Concert sous les projecteurs', place: 'La grande scène', cta: 'Monter sur scène', mood: 'Tape les notes au bon moment et enchaîne le combo.', moment: 'concert' },
};

/** Conseil de tenue : nécessaire ou suggérée, selon l'objectif en cours. */
export function outfitAdvice(w: World, id: CareerId): { style: StyleId | null; text: string } {
  const view = objectiveProgress(w, id);
  const m = view.tier?.obj.metric ?? '';
  const tag = m.startsWith('tag:') ? m.slice(4) : null;
  if (tag && tag in STYLE_NAMES) {
    const s = tag as StyleId;
    return { style: s, text: id === 'model' ? `Tenue demandée : style ${STYLE_NAMES[s]}` : `Style conseillé : ${STYLE_NAMES[s]}` };
  }
  if (id === 'model') return { style: null, text: 'Tu choisis ton thème parmi trois propositions' };
  if (id === 'photo') return { style: null, text: 'Ta tenue du moment compte pour la pose' };
  if (id === 'actress') return { style: null, text: 'Aucune tenue imposée : seule l\'émotion compte' };
  return { style: null, text: 'Une tenue de scène brillera davantage' };
}

// ------------------------------------------------------------------ étapes de palier
export interface TierStep { n: number; title: string; state: 'done' | 'cur' | 'next' }
export function tierSteps(w: World, id: CareerId): TierStep[] {
  const lvl = levelOf(w, id);
  return CAREERS[id].tiers.map((t, i) => ({ n: i + 1, title: t.title, state: i < lvl ? 'done' : i === lvl ? 'cur' : 'next' }));
}

/** Pourcentage global vers le palier suivant (objectif et expérience, le plus lent des deux). */
export function tierPercent(w: World, id: CareerId): number {
  const v = objectiveProgress(w, id);
  if (v.maxed || !v.tier) return 100;
  const a = v.need ? v.have / v.need : 1;
  const b = v.xpNeed ? v.xpHave / v.xpNeed : 1;
  return Math.round(Math.min(a, b) * 100);
}

export function stateLabel(w: World, id: CareerId): string {
  const lvl = levelOf(w, id);
  if (lvl >= MAX_LEVEL) return 'Au sommet';
  if (lvl === 0 && !(w.careers.progress[id]?.xp)) return 'À découvrir';
  return objectiveProgress(w, id).ready ? 'Palier prêt' : 'En progrès';
}

// ------------------------------------------------------------------ fatigue douce (jamais bloquante)
export const FATIGUE_WINDOW_MS = 40 * 60_000;
export const FATIGUE_FREE = 3;
/** Facteur appliqué aux bonus de pièces : 1 pendant les 3 premières séances d'une fenêtre, puis 0,6 puis 0,4 (jamais 0). */
export function fatigueFactor(n: number): number {
  if (n < FATIGUE_FREE) return 1;
  return n === FATIGUE_FREE ? 0.6 : 0.4;
}
export interface FatigueState { t: number; n: number }
/** Met à jour le compteur de fatigue (fenêtre glissante simple) ; renvoie le facteur AVANT cette séance. */
export function stepFatigue(c: Record<string, number>, now: number): number {
  const t = c['fat.t'] ?? 0;
  if (!t || now - t > FATIGUE_WINDOW_MS || now < t) { c['fat.t'] = now; c['fat.n'] = 0; }
  const f = fatigueFactor(c['fat.n'] ?? 0);
  c['fat.n'] = (c['fat.n'] ?? 0) + 1;
  return f;
}

// ------------------------------------------------------------------ bonus de séance
/** Tenues et accessoires que les séances peuvent offrir (existent tous dans le registre). */
export const DROP_POOL: Record<CareerId, ClothId[]> = {
  photo: ['ac-sunglasses', 'ac-scarf', 'ac-pearls', 'jk-blazer-cream', 'ac-chain-gold'],
  model: ['sh-heels-nude', 'bg-clutch-pink', 'bot-trousers-chic', 'sh-heels-gold', 'bg-silver'],
  actress: ['ac-scarf', 'ac-pendant', 'sh-flats-red', 'top-cardigan-lavender', 'dr-flowy-floral'],
  singer: ['ac-hoops', 'ac-choker', 'bg-red-mini', 'sh-heels-red', 'jk-leather-black'],
};

export interface Bonus { coins: number; fans: number; drop: ClothId | null; dropCoins: number; fatigue: number }

/** Chance d'un objet en bonus (score ≥ 70 seulement). */
export const dropChance = (score: number): number => (score >= 90 ? 0.3 : score >= 70 ? 0.15 : 0);

/**
 * Bonus facultatif d'une séance, appliqué par-dessus `recordSession`.
 * Applique pièces / fans fictifs / vêtement au monde (un doublon rend la moitié du prix en pièces).
 */
export function sessionBonus(w: World, id: CareerId, out: Pick<SessionOutcome, 'score' | 'level'>, rng: Rng, fatigue: number): Bonus {
  const base = Math.round((out.score / 100) * (18 + out.level * 14));
  const coins = Math.max(0, Math.round(base * fatigue));
  const fans = Math.round(Math.max(0, out.score - 50) * (1 + out.level) * 0.4 * fatigue);
  let drop: ClothId | null = null;
  let dropCoins = 0;
  if (rng() < dropChance(out.score) * (fatigue >= 1 ? 1 : 0.7)) {
    const pool = DROP_POOL[id].filter((c) => CLOTHES[c]);
    const fresh = pool.filter((c) => !w.wardrobe.owned.includes(c));
    const list = fresh.length && rng() < 0.85 ? fresh : pool;
    drop = list[Math.floor(rng() * list.length) % list.length] ?? null;
  }
  const g = applyReward(w, { coins, cloth: drop ? [drop] : [] });
  if (drop && !g.items.cloth.includes(drop)) dropCoins = g.items.dupCoins;
  return { coins, fans, drop: drop && g.items.cloth.includes(drop) ? drop : null, dropCoins, fatigue };
}

// ------------------------------------------------------------------ moment annoncé
export function momentFor(id: CareerId, score: number, fans: number): { kind: ActivityCopy['moment']; title: string; caption: string; fans: number } {
  const a = ACTIVITY[id];
  const title = id === 'photo' ? 'Shooting au studio' : id === 'model' ? 'Défilé sur le podium' : id === 'actress' ? 'Une scène jouée' : 'Concert sous les projecteurs';
  const caption = score >= 90 ? 'Un moment éblouissant ♡' : score >= 70 ? 'Une belle journée de travail ♡' : 'Un petit pas de plus ♡';
  return { kind: a.moment, title, caption, fans };
}
