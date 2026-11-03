/** Spa : huiles, ambiance, respiration guidée (logique pure). */
export interface Oil { id: string; name: string; note: string; color: string; accent: string }
export const OILS: readonly Oil[] = [
  { id: 'rose-velours', name: 'Rose velours', note: 'pétales de rose et miel', color: '#f58fb3', accent: '#ffd1e3' },
  { id: 'lavande-nuit', name: 'Lavande de nuit', note: 'lavande et vanille douce', color: '#a58fe0', accent: '#e4daff' },
  { id: 'fleur-oranger', name: 'Fleur d’oranger', note: 'agrumes et soleil', color: '#ffb36b', accent: '#ffe3c2' },
  { id: 'ambre-dore', name: 'Ambre doré', note: 'ambre chaud et caramel', color: '#e3a94a', accent: '#ffe9b0' },
  { id: 'jasmin-lune', name: 'Jasmin de lune', note: 'jasmin blanc et perles', color: '#9fd6c9', accent: '#e0fbf4' },
  { id: 'cerise-macaron', name: 'Cerise macaron', note: 'cerise et amande', color: '#e0607a', accent: '#ffc9d3' },
];
export const LIGHTS = [
  { id: 'rose', name: 'Rose tendre', color: '#ffb3cf' }, { id: 'or', name: 'Or doux', color: '#ffd98a' }, { id: 'lavande', name: 'Lavande', color: '#c9b6f2' },
] as const;
export const CANDLES = [{ id: 0, name: 'Aucune' }, { id: 3, name: 'Trois' }, { id: 6, name: 'Six' }] as const;
export const BUBBLES = [{ id: 'douces', name: 'Douces' }, { id: 'petillantes', name: 'Pétillantes' }, { id: 'folles', name: 'Mousse !' }] as const;
export interface Ambience { light: string; candles: number; bubbles: string }
export const DEFAULT_AMBIENCE: Ambience = { light: 'rose', candles: 3, bubbles: 'douces' };

export const INHALE = 4; export const HOLD = 1; export const EXHALE = 4.5; export const REST = 0.5;
export const CYCLE = INHALE + HOLD + EXHALE + REST;
export type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

/** Phase de respiration guidée à l'instant t (secondes depuis le début). */
export function phaseAt(t: number): { phase: BreathPhase; u: number } {
  const x = ((t % CYCLE) + CYCLE) % CYCLE;
  if (x < INHALE) return { phase: 'inhale', u: x / INHALE };
  if (x < INHALE + HOLD) return { phase: 'hold', u: (x - INHALE) / HOLD };
  if (x < INHALE + HOLD + EXHALE) return { phase: 'exhale', u: (x - INHALE - HOLD) / EXHALE };
  return { phase: 'rest', u: (x - CYCLE + REST) / REST };
}
/** Taille du cercle guide 0..1 (douce, avec courbe cosinus). */
export function circleSize(t: number): number {
  const { phase, u } = phaseAt(t);
  const e = (v: number) => 0.5 - 0.5 * Math.cos(Math.PI * v);
  if (phase === 'inhale') return e(u);
  if (phase === 'hold') return 1;
  if (phase === 'exhale') return 1 - e(u);
  return 0;
}
/** Doit-on maintenir le doigt appuyé ? (inspiration + pause) ; une marge de 0,45 s est tolérée autour des changements. */
export const shouldHold = (t: number): boolean => { const p = phaseAt(t).phase; return p === 'inhale' || p === 'hold'; };
export function inSync(t: number, holding: boolean, margin = 0.45): boolean {
  return holding === shouldHold(t) || holding === shouldHold(t - margin) || holding === shouldHold(t + margin);
}
/** Score 40..100 : la détente n’est jamais un échec, la synchro est une bonus. */
export function relaxScore(syncRatio: number): number {
  return Math.round(40 + 60 * Math.min(1, Math.max(0, syncRatio)));
}
export const bubbleCount = (id: string): number => (id === 'folles' ? 34 : id === 'petillantes' ? 22 : 12);
