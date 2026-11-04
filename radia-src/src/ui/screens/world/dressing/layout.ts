/**
 * Mise en page du dressing (logique pure, sans DOM) : colonnes de la galerie, hauteurs des trois crans du
 * panneau du bas (replié / standard / agrandi), nombre de rangées visibles, glisser vertical avec crans.
 */

export type Snap = 'collapsed' | 'standard' | 'expanded';
export const SNAPS: readonly Snap[] = ['collapsed', 'standard', 'expanded'];

/** 2 colonnes sur les très petits écrans, 3 sinon (jamais plus : les cartes restent lisibles au pouce). */
export function gridColumns(width: number): 2 | 3 {
  return Number.isFinite(width) && width >= 300 ? 3 : 2;
}

export interface PanelMetrics {
  /** Hauteur disponible sous l'en-tête (px). */
  avail: number;
  /** Hauteur fixe du haut du panneau (poignée, familles, rayons). */
  head: number;
  /** Hauteur de la barre d'action (bouton Équiper / Acheter). */
  bar: number;
  /** Hauteur d'une rangée de cartes et espace entre deux rangées. */
  row: number;
  gap: number;
  /** Marge intérieure verticale de la galerie. */
  pad: number;
  /** Hauteur minimale laissée à Radia en cran standard. */
  minStage: number;
  /** Hauteur laissée à Radia (réduite) en cran agrandi. */
  expandedStage?: number;
  /** Rangées entières souhaitées en cran standard. */
  wantRows?: number;
}

const fin = (n: number, d: number): number => (Number.isFinite(n) ? n : d);

/** Hauteur d'un panneau qui montre `rows` rangées entières. */
export function heightForRows(m: Pick<PanelMetrics, 'head' | 'bar' | 'row' | 'gap' | 'pad'>, rows: number): number {
  const r = Math.max(0, rows);
  return Math.round(m.head + m.bar + m.pad + r * m.row + Math.max(0, Math.ceil(r) - 1) * m.gap);
}

/** Hauteurs des trois crans, toujours croissantes, jamais au-delà de la place disponible. */
export function panelHeights(raw: PanelMetrics): Record<Snap, number> {
  const m: PanelMetrics = { ...raw, head: fin(raw.head, 100), bar: fin(raw.bar, 56), row: fin(raw.row, 118), gap: fin(raw.gap, 8), pad: fin(raw.pad, 12), minStage: fin(raw.minStage, 190) };
  const avail = Math.max(0, fin(m.avail, 0));
  const want = m.wantRows ?? 2;
  // replié : on devine à peine une rangée (invite à ouvrir) ; la barre d'action reste visible
  const collapsed = Math.min(heightForRows(m, 0.55), Math.max(0, avail - m.minStage));
  // standard : `want` rangées entières, mais Radia garde `minStage` de hauteur
  const std = Math.min(heightForRows(m, want), Math.max(collapsed + 1, avail - m.minStage));
  // agrandi : presque tout l'espace, Radia est réduite
  const stageSmall = m.expandedStage ?? Math.max(110, Math.round(avail * 0.17));
  const exp = Math.max(std + 1, Math.min(avail - stageSmall, avail - 80));
  const c = Math.round(collapsed);
  const s = Math.max(c, Math.round(std));
  return { collapsed: c, standard: s, expanded: Math.max(s, Math.round(exp)) };
}

/** Hauteur visible de la galerie pour une hauteur de panneau donnée. */
export const gridViewport = (panelH: number, head: number, bar: number): number => Math.max(0, panelH - head - bar);

/** Rangées entièrement visibles (et fraction de la suivante) dans une galerie de hauteur `viewH`. */
export function visibleRows(viewH: number, row: number, gap: number, pad = 0): { full: number; rows: number } {
  const h = viewH - pad;
  if (!(h > 0) || !(row > 0)) return { full: 0, rows: 0 };
  const full = Math.max(0, Math.floor((h + gap) / (row + gap)));
  const rows = Math.round(((h + gap) / (row + gap)) * 100) / 100;
  return { full, rows };
}

/** Hauteur du panneau pendant le glissement : suit le doigt, avec un peu de résistance hors bornes. */
export function dragHeight(startH: number, dy: number, hs: Record<Snap, number>): number {
  const raw = startH - dy; // glisser vers le haut (dy < 0) agrandit
  const lo = hs.collapsed;
  const hi = hs.expanded;
  if (raw < lo) return lo - Math.min(28, (lo - raw) * 0.35);
  if (raw > hi) return hi + Math.min(28, (raw - hi) * 0.35);
  return raw;
}

/** Cran choisi au relâchement : le plus proche de la hauteur projetée (vitesse en px/ms, + = vers le haut). */
export function snapAfterDrag(h: number, velocity: number, hs: Record<Snap, number>): Snap {
  const proj = h + Math.max(-1.6, Math.min(1.6, fin(velocity, 0))) * 160;
  let best: Snap = 'standard';
  let bd = Infinity;
  for (const s of SNAPS) {
    const d = Math.abs(hs[s] - proj);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Cran suivant en touchant la poignée : standard → agrandi → standard ; replié → standard. */
export function nextSnap(s: Snap): Snap {
  return s === 'standard' ? 'expanded' : 'standard';
}

/** Radia est-elle trop petite pour garder les colonnes de boutons autour d'elle ? */
export function sideMode(stageH: number): 'full' | 'tight' | 'hidden' {
  if (stageH >= 215) return 'full';
  if (stageH >= 150) return 'tight';
  return 'hidden';
}

/** Compte compact pour les pastilles de monnaies (12 400 → « 12,4 k »). */
export function compactCount(n: number): string {
  const v = Math.max(0, Math.floor(fin(n, 0)));
  if (v < 10000) return v.toLocaleString('fr-FR').replace(/ | /g, ' ');
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 100000 ? 1 : 0).replace('.', ',').replace(/,0$/, '')} k`;
  return `${(v / 1_000_000).toFixed(1).replace('.', ',').replace(/,0$/, '')} M`;
}
