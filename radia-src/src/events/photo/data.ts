/** Données pures des photos souvenirs (sans DOM) : poses, cadres, filtres, utilitaires. */
import type { Expr } from '../../data/dialogue';

export type ArmPose = 'down' | 'wave' | 'heart' | 'open';
export interface PoseDef {
  id: string; label: string;
  radia: { arms: ArmPose; step: number; expr: Expr };
  auguste: { arms: ArmPose; step: number; expr: Expr };
  /** Demi-écartement des adultes (fraction de la largeur utile). */
  gap: number;
}
export const POSES: PoseDef[] = [
  { id: 'face', label: 'Debout', radia: { arms: 'down', step: 0, expr: 'smile' }, auguste: { arms: 'down', step: 0, expr: 'smile' }, gap: 0.19 },
  { id: 'hanche', label: 'Pose chic', radia: { arms: 'down', step: 0.8, expr: 'tease' }, auguste: { arms: 'down', step: -0.8, expr: 'smile' }, gap: 0.19 },
  { id: 'coeur', label: 'Cœur', radia: { arms: 'heart', step: 0, expr: 'love' }, auguste: { arms: 'heart', step: 0, expr: 'love' }, gap: 0.19 },
  { id: 'salut', label: 'Coucou', radia: { arms: 'wave', step: 0, expr: 'laugh' }, auguste: { arms: 'wave', step: 0, expr: 'smile' }, gap: 0.2 },
  { id: 'proches', label: 'Tout près', radia: { arms: 'down', step: 0, expr: 'shy' }, auguste: { arms: 'down', step: 0, expr: 'love' }, gap: 0.115 },
  { id: 'ouvert', label: 'Bras ouverts', radia: { arms: 'open', step: 0, expr: 'laugh' }, auguste: { arms: 'open', step: 0, expr: 'laugh' }, gap: 0.22 },
];

export interface FrameDef {
  id: string; label: string;
  /** Marges [gauche, haut, droite, bas] en unités de 393 px de large. */
  inset: [number, number, number, number];
  /** Couleurs : fond du cadre, liseré, accent. */
  base: [string, string]; line: string; accent: string; text: string;
}
export const FRAMES: FrameDef[] = [
  { id: 'rose', label: 'Rose', inset: [14, 14, 14, 14], base: ['#ffc2d6', '#ff8fb5'], line: '#ffffff', accent: '#e8558f', text: '#ffffff' },
  { id: 'or', label: 'Or', inset: [16, 16, 16, 16], base: ['#f8e19a', '#d9a43c'], line: '#fff6cf', accent: '#b8821f', text: '#58433f' },
  { id: 'lavande', label: 'Lavande', inset: [14, 14, 14, 14], base: ['#d9ccf3', '#a88fe0'], line: '#ffffff', accent: '#7c5cc4', text: '#ffffff' },
  { id: 'polaroid', label: 'Polaroïd', inset: [16, 16, 16, 66], base: ['#fffdf8', '#f4efe6'], line: '#e8dfd0', accent: '#58433f', text: '#58433f' },
  { id: 'dentelle', label: 'Dentelle', inset: [20, 20, 20, 20], base: ['#fff8f0', '#f6e6e2'], line: '#e8c9c4', accent: '#d98aa0', text: '#58433f' },
  { id: 'coeurs', label: 'Cœurs', inset: [20, 20, 20, 20], base: ['#ffe1ec', '#ffb3cf'], line: '#ffffff', accent: '#ff5f93', text: '#ffffff' },
  { id: 'minuit', label: 'Minuit', inset: [14, 14, 14, 14], base: ['#3b3152', '#51446d'], line: '#f3c86b', accent: '#f3c86b', text: '#fff6dc' },
];

export interface FilterDef {
  id: string; label: string;
  /** Calques colorés [mode de fusion, couleur, opacité]. */
  layers: [GlobalCompositeOperation, string, number][];
  vignette: number;
  grain?: boolean;
  sparkle?: boolean;
}
export const FILTERS: FilterDef[] = [
  { id: 'none', label: 'Naturel', layers: [], vignette: 0 },
  { id: 'doux', label: 'Doux', layers: [['soft-light', '#ffffff', 0.4], ['screen', '#ffe9f2', 0.14]], vignette: 0.1 },
  { id: 'chaud', label: 'Chaud', layers: [['overlay', '#ffa850', 0.3], ['soft-light', '#ffd9a0', 0.25]], vignette: 0.16 },
  { id: 'rose', label: 'Rosé', layers: [['soft-light', '#ff7fb0', 0.5], ['screen', '#ffc0d8', 0.12]], vignette: 0.14 },
  { id: 'vintage', label: 'Vintage', layers: [['multiply', '#d9b88a', 0.38], ['screen', '#fff0cc', 0.1]], vignette: 0.42, grain: true },
  { id: 'nuit', label: 'Nuit', layers: [['multiply', '#6a70c0', 0.45], ['soft-light', '#4a50a0', 0.3]], vignette: 0.34, sparkle: true },
];

export const frameAt = (id: string): FrameDef => FRAMES.find((f) => f.id === id) ?? FRAMES[0];
export const filterAt = (id: string): FilterDef => FILTERS.find((f) => f.id === id) ?? FILTERS[0];
export const poseAt = (i: number): PoseDef => POSES[((Math.round(i) % POSES.length) + POSES.length) % POSES.length];

/** `radia-<titre-nettoye>.png` : sans accents, minuscules, tirets, 40 caractères max. */
export function exportFileName(title: string): string {
  const slug = (title ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return `radia-${slug || 'souvenir'}.png`;
}

export function fmtDate(ts: number): string {
  try { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; }
}
export function fmtDateShort(ts: number): string {
  try { return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { return ''; }
}

/** Répartition horizontale (fractions de la largeur utile, centre 0.5) des enfants au premier plan. */
export function kidSlots(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0.5];
  if (n === 2) return [0.27, 0.73];
  return [0.5, 0.2, 0.8].slice(0, n).sort((a, b) => a - b);
}
