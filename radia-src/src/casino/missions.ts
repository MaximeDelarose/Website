/**
 * Missions du Casino Royal : SANS HASARD (on les accomplit en jouant ou en visitant, gagner n'est jamais requis).
 * Récompenses : tickets gratuits et objets exclusifs RÉELS du monde (garde-robe / château). Données + logique pures.
 */
import type { CasinoState } from '../save/fun';
import type { World } from '../save/schema';
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { earn } from './tickets';

export type Reward = { t: 'cloth'; id: string } | { t: 'furn'; id: string };
export interface MissionDef {
  id: string; name: string; desc: string;
  /** Statistique suivie (voir `recordRound` : « roulette.parties », « total.parties », « visites »…). */
  stat: string; goal: number;
  chips: number; item?: Reward;
}

/** Statistique spéciale : nombre de jeux différents essayés (0..3). */
export const DISTINCT_STAT = 'jeux.differents';

export const MISSIONS: readonly MissionDef[] = [
  { id: 'first-visit', name: 'Première soirée', desc: 'Entre au Casino Royal.', stat: 'visites', goal: 1, chips: 100 },
  { id: 'roulette-10', name: 'Fan de roulette', desc: 'Joue 10 tours de roulette.', stat: 'roulette.parties', goal: 10, chips: 150, item: { t: 'cloth', id: 'ea-stars' } },
  { id: 'slots-10', name: 'Rouleaux en fête', desc: 'Fais 10 tours à la machine à sous.', stat: 'slots.parties', goal: 10, chips: 150, item: { t: 'cloth', id: 'gl-heart-pink' } },
  { id: 'blackjack-10', name: 'Table de velours', desc: 'Joue 10 mains de blackjack.', stat: 'blackjack.parties', goal: 10, chips: 150, item: { t: 'cloth', id: 'ac-choker' } },
  { id: 'all-games', name: 'Un peu de tout', desc: 'Essaie les trois jeux du casino.', stat: DISTINCT_STAT, goal: 3, chips: 200, item: { t: 'furn', id: 'red-carpet' } },
  { id: 'regular', name: 'Habituée du salon', desc: 'Reviens au casino 5 fois.', stat: 'visites', goal: 5, chips: 200 },
  { id: 'play-50', name: 'Soirée animée', desc: 'Joue 50 manches en tout.', stat: 'total.parties', goal: 50, chips: 300, item: { t: 'furn', id: 'chandelier' } },
  { id: 'play-120', name: 'Reine du casino', desc: 'Joue 120 manches en tout.', stat: 'total.parties', goal: 120, chips: 500, item: { t: 'cloth', id: 'cr-tiara' } },
];
export const missionById = (id: string): MissionDef | undefined => MISSIONS.find((m) => m.id === id);

/** Valeur de la statistique d'une mission (gère le compteur de jeux différents). */
export function statValue(s: CasinoState, stat: string): number {
  if (stat === DISTINCT_STAT) return (['roulette', 'slots', 'blackjack'] as const).filter((g) => (s.stats[`${g}.parties`] ?? 0) > 0).length;
  return s.stats[stat] ?? 0;
}
export const progressOf = (s: CasinoState, m: MissionDef): number => Math.min(m.goal, statValue(s, m.stat));
export const isDone = (s: CasinoState, id: string): boolean => s.missions.includes(id);
export const isClaimable = (s: CasinoState, m: MissionDef): boolean => !isDone(s, m.id) && statValue(s, m.stat) >= m.goal;
export const claimableCount = (s: CasinoState): number => MISSIONS.filter((m) => isClaimable(s, m)).length;

/** Compensation en tickets si l'objet exclusif est déjà possédé. */
export const DUP_CHIPS = 200;

export interface ClaimResult { ok: boolean; chips: number; item?: Reward; duplicate?: boolean }

/** Les objets existent-ils vraiment dans le monde ? (vérifié par test) */
export const rewardExists = (r: Reward): boolean => (r.t === 'cloth' ? r.id in CLOTHES : r.id in FURNITURE);

/**
 * Réclame une mission : la marque ACCOMPLIE d'abord (jamais deux fois), puis verse les tickets et l'objet.
 * Un objet déjà possédé est remplacé par des tickets.
 */
export function claimMission(s: CasinoState, w: World, id: string): ClaimResult {
  const m = missionById(id);
  if (!m || !isClaimable(s, m)) return { ok: false, chips: 0 };
  s.missions.push(m.id);
  let chips = m.chips;
  let duplicate = false;
  if (m.item) {
    if (m.item.t === 'cloth') {
      if (w.wardrobe.owned.includes(m.item.id as never)) duplicate = true; else w.wardrobe.owned.push(m.item.id as never);
    } else if ((w.castle.owned[m.item.id] ?? 0) > 0) duplicate = true;
    else w.castle.owned[m.item.id] = 1;
    if (duplicate) chips += DUP_CHIPS;
  }
  earn(s, 'mission', chips);
  return { ok: true, chips, item: m.item, duplicate };
}
