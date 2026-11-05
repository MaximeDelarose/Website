/**
 * Logique pure du « game feel » (sans Phaser, sans DOM) : testable en Node.
 *  - niveau d'une fusion (normale / rare / maximale) ;
 *  - profil d'effets selon les réglages (effets réduits, animations réduites) ;
 *  - budget de particules (plafond dur, jamais de fuite) ;
 *  - choix du son de POP (variantes, hauteur qui monte avec le niveau et le combo) ;
 *  - paliers de combo.
 */
import type { Sfx } from '../../audio/AudioManager';

export type MergeTier = 'normal' | 'rare' | 'max';

/** Durée (ms) de l'anticipation (« wind-up ») puis de l'impact avant le POP. */
export const WINDUP_MS = 70;
export const SLAM_MS = 90;
export const POP_AT_MS = WINDUP_MS + SLAM_MS;

/** Niveau de l'effet pour l'objet créé par une fusion. `max` = niveau maximal de sa collection. */
export function mergeTier(result: { c: string; l: number }, max: number): MergeTier {
  if (result.c === 'special') return 'rare';
  if (result.c === 'gen') return 'normal';
  if (result.l >= max) return 'max';
  if (result.l >= 6) return 'rare';
  return 'normal';
}

export interface FxProfile {
  /** Nombre maximal de particules vivantes en même temps. */
  particleCap: number;
  /** Multiplicateur appliqué au nombre de particules demandé. */
  particleScale: number;
  /** Ralenti visuel très court autorisé. */
  slowmo: boolean;
  /** Nombre de rayons lumineux d'une fusion rare / maximale (0 = aucun). */
  rays: number;
  /** Secousse de caméra autorisée. */
  shake: boolean;
}

export function fxProfile(effects: 'full' | 'reduced', reducedMotion: boolean): FxProfile {
  if (reducedMotion) return { particleCap: 24, particleScale: 0.3, slowmo: false, rays: 0, shake: false };
  if (effects === 'reduced') return { particleCap: 40, particleScale: 0.4, slowmo: true, rays: 6, shake: false };
  return { particleCap: 110, particleScale: 1, slowmo: true, rays: 12, shake: true };
}

/** Nombre de particules à créer pour une demande `n` (au moins 1 si n > 0). */
export function scaledCount(n: number, p: FxProfile): number {
  return n <= 0 ? 0 : Math.max(1, Math.round(n * p.particleScale));
}

/** Compteur de particules vivantes avec plafond. */
export class ParticleBudget {
  live = 0;
  constructor(public cap: number) {}
  /** Réserve jusqu'à `n` particules ; renvoie le nombre accordé. */
  take(n: number): number {
    const g = Math.max(0, Math.min(n, this.cap - this.live));
    this.live += g;
    return g;
  }
  release(n = 1): void { this.live = Math.max(0, this.live - n); }
  reset(): void { this.live = 0; }
}

/** Montée de hauteur avec le combo (plafonnée pour rester agréable). */
export function comboPitch(combo: number): number { return 1 + Math.min(6, Math.max(0, combo - 1)) * 0.045; }

const ORDINARY_POPS: Sfx[] = ['pop1', 'pop4', 'pop5', 'pop2'];

/**
 * Son du POP : plusieurs variantes pour les fusions ordinaires (jamais deux fois
 * la même d'affilée), double POP pour les rares, grand accord pour le niveau max.
 * `rnd` ∈ [0,1[ ; `last` = dernière variante jouée.
 */
export function popSfx(tier: MergeTier, level: number, combo: number, rnd: number, last?: Sfx): { name: Sfx; pitch: number } {
  const pitch = Math.min(1.7, (1 + Math.min(10, level) * 0.04) * comboPitch(combo));
  if (tier === 'max') return { name: 'maxMerge', pitch: Math.min(1.2, comboPitch(combo)) };
  if (tier === 'rare') return { name: 'popRare', pitch: Math.min(1.45, pitch) };
  const pool = ORDINARY_POPS.filter((n) => n !== last);
  const name = pool[Math.min(pool.length - 1, Math.floor(rnd * pool.length))];
  return { name, pitch };
}

/** Palier de combo atteint à cette valeur (3, 5, 8) ; 0 si ce n'est pas un palier. */
export function comboMilestone(value: number): 0 | 1 | 2 | 3 {
  return value === 3 ? 1 : value === 5 ? 2 : value === 8 ? 3 : 0;
}

/** Texte du compteur de combo (discret) : `Combo 4` ou `Combo 4 · ×1.5`. */
export function comboLabel(value: number, mult = 1): string {
  const m = mult > 1 ? ` · ×${Number.isInteger(mult) ? mult : mult.toFixed(1)}` : '';
  return `Combo ${value}${m}`;
}

/**
 * Libellé de l'indicateur de combo (zone fixe au-dessus de la grille) : « Combo x3 ! », « Combo x5 ! », « Super combo x10 ! ».
 * À partir de 8 (palier de la baguette) c'est un « Super combo ». `points` (facultatif) ajoute le total gagné pendant la chaîne : « · +120 ».
 */
export function comboPopLabel(value: number, points = 0): string {
  const p = points > 0 ? ` · +${Math.round(points)}` : '';
  return `${value >= 8 ? 'Super combo' : 'Combo'} x${value} !${p}`;
}

/** Niveau d'intensité des effets d'un combo (0 : aucun, 1 : 2–4, 2 : 5–7, 3 : 8–11, 4 : 12 et plus) — plus marqué sans jamais devenir envahissant. */
export function comboIntensity(value: number): 0 | 1 | 2 | 3 | 4 {
  return value < 2 ? 0 : value < 5 ? 1 : value < 8 ? 2 : value < 12 ? 3 : 4;
}

/** Durée totale visible du texte de combo (ms) : 400–600 ms, un peu plus pour un combo exceptionnel. */
export const comboPopMs = (value: number): number => (value >= 8 ? 600 : value >= 5 ? 520 : 440);
/** Nombre de particules ajoutées à un POP selon le combo (au plus +50 %, toujours budgétées par le profil d'effets). */
export const comboParticleBonus = (value: number): number => 1 + Math.min(0.5, Math.max(0, value - 2) * 0.06);

/** Hexadécimal « #RRGGBB » → entier Phaser. */
export function hexInt(hex: string): number { return parseInt(hex.replace('#', ''), 16); }
