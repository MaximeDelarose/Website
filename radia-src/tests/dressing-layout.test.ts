import { describe, it, expect } from 'vitest';
import { compactCount, dragHeight, gridColumns, gridViewport, heightForRows, nextSnap, panelHeights, sideMode, snapAfterDrag, visibleRows, SNAPS, type PanelMetrics } from '../src/ui/screens/world/dressing/layout';

// mesures typiques mesurées dans le navigateur : en-tête du panneau ≈ 112 px, barre 58 px, carte 117 px (66 px de vignette)
const M = (avail: number, over: Partial<PanelMetrics> = {}): PanelMetrics => ({ avail, head: 112, bar: 58, row: 117, gap: 8, pad: 12, minStage: Math.max(190, Math.min(300, Math.round(avail * 0.34))), wantRows: 2, ...over });
const rowsAt = (m: PanelMetrics, h: number) => visibleRows(gridViewport(h, m.head, m.bar), m.row, m.gap, m.pad);

describe('colonnes de la galerie', () => {
  it('3 colonnes dès 300 px de large, 2 en dessous, jamais plus', () => {
    expect(gridColumns(393)).toBe(3);
    expect(gridColumns(375)).toBe(3);
    expect(gridColumns(320)).toBe(3);
    expect(gridColumns(280)).toBe(2);
    expect(gridColumns(900)).toBe(3);
    expect(gridColumns(Number.NaN)).toBe(2);
  });
});

describe('crans du panneau', () => {
  it('trois crans croissants, jamais plus hauts que la place disponible', () => {
    for (const avail of [420, 540, 598, 700, 790, 900]) {
      const hs = panelHeights(M(avail));
      expect(hs.collapsed).toBeLessThanOrEqual(hs.standard);
      expect(hs.standard).toBeLessThanOrEqual(hs.expanded);
      expect(hs.expanded).toBeLessThanOrEqual(avail);
      expect(hs.collapsed).toBeGreaterThan(0);
    }
  });
  it('iPhone 16 (393×852) : au moins deux rangées entières visibles en cran standard, Radia garde plus de 250 px', () => {
    const avail = 852 - 12 - 46 - 2; // haut de l'écran et en-tête
    const m = M(avail);
    const hs = panelHeights(m);
    expect(rowsAt(m, hs.standard).full).toBeGreaterThanOrEqual(2);
    expect(avail - hs.standard).toBeGreaterThanOrEqual(250);
  });
  it('393×660 : au moins 1,5 rangée visible, et Radia garde sa hauteur minimale', () => {
    const avail = 660 - 12 - 46 - 2;
    const m = M(avail, { row: 108 });
    const hs = panelHeights(m);
    expect(rowsAt(m, hs.standard).rows).toBeGreaterThanOrEqual(1.5);
    expect(avail - hs.standard).toBeGreaterThanOrEqual(m.minStage - 1);
  });
  it('393×600 : encore 1,5 rangée visible grâce aux cartes compactes', () => {
    const avail = 600 - 12 - 46 - 2;
    const m = M(avail, { row: 100, head: 108 });
    const hs = panelHeights(m);
    expect(rowsAt(m, hs.standard).rows).toBeGreaterThanOrEqual(1.5);
  });
  it('avec la zone sûre basse de l\'iPhone (barre +34 px) la galerie reste lisible', () => {
    const avail = 852 - 12 - 46 - 2;
    const m = M(avail, { bar: 58 + 34 });
    const hs = panelHeights(m);
    expect(rowsAt(m, hs.standard).rows).toBeGreaterThanOrEqual(1.5);
  });
  it('cran agrandi : plus de rangées et Radia réduite (mais pas disparue)', () => {
    const avail = 790;
    const m = M(avail);
    const hs = panelHeights(m);
    expect(rowsAt(m, hs.expanded).full).toBeGreaterThan(rowsAt(m, hs.standard).full);
    const stage = avail - hs.expanded;
    expect(stage).toBeLessThan(avail - hs.standard);
    expect(stage).toBeGreaterThanOrEqual(80);
  });
  it('cran replié : la barre d\'action reste dans le panneau (hauteur ≥ tête + barre)', () => {
    const m = M(790);
    const hs = panelHeights(m);
    expect(hs.collapsed).toBeGreaterThanOrEqual(m.head + m.bar);
  });
  it('entrées absurdes : aucune hauteur négative ni NaN', () => {
    for (const avail of [0, 10, Number.NaN]) {
      const hs = panelHeights(M(avail));
      for (const s of SNAPS) expect(Number.isFinite(hs[s]) && hs[s] >= 0).toBe(true);
    }
  });
  it('heightForRows / visibleRows sont cohérents', () => {
    const m = M(800);
    const h2 = heightForRows(m, 2);
    expect(rowsAt(m, h2).full).toBe(2);
    expect(visibleRows(0, 117, 8).full).toBe(0);
    expect(visibleRows(117, 117, 8).full).toBe(1);
    expect(visibleRows(117 + 8 + 58, 117, 8).full).toBe(1);
    expect(visibleRows(117 + 8 + 58, 117, 8).rows).toBeCloseTo(1.5, 1);
  });
});

describe('glisser et cran', () => {
  const hs = { collapsed: 200, standard: 420, expanded: 640 };
  it('la hauteur suit le doigt (vers le haut = plus haut) et résiste hors bornes', () => {
    expect(dragHeight(420, -100, hs)).toBe(520);
    expect(dragHeight(420, 100, hs)).toBe(320);
    expect(dragHeight(420, -1000, hs)).toBeLessThanOrEqual(640 + 28);
    expect(dragHeight(420, -1000, hs)).toBeGreaterThan(640);
    expect(dragHeight(420, 1000, hs)).toBeGreaterThanOrEqual(200 - 28);
    expect(dragHeight(420, 1000, hs)).toBeLessThan(200);
  });
  it('relâcher : le cran le plus proche', () => {
    expect(snapAfterDrag(430, 0, hs)).toBe('standard');
    expect(snapAfterDrag(600, 0, hs)).toBe('expanded');
    expect(snapAfterDrag(250, 0, hs)).toBe('collapsed');
  });
  it('un coup de doigt rapide l\'emporte sur la position', () => {
    expect(snapAfterDrag(470, 1.2, hs)).toBe('expanded');
    expect(snapAfterDrag(370, -1.2, hs)).toBe('collapsed');
    expect(snapAfterDrag(640, -0.2, hs)).toBe('expanded');
  });
  it('relâcher en bas depuis le cran agrandi rétablit Radia (cran inférieur)', () => {
    expect(snapAfterDrag(520, -1, hs)).not.toBe('expanded');
    expect(snapAfterDrag(300, -0.3, hs)).not.toBe('expanded');
  });
  it('vitesse infinie ou NaN : sans effet', () => {
    expect(snapAfterDrag(430, Number.NaN, hs)).toBe('standard');
    expect(SNAPS).toContain(snapAfterDrag(430, Infinity, hs));
  });
  it('poignée : standard ⇄ agrandi, replié → standard', () => {
    expect(nextSnap('standard')).toBe('expanded');
    expect(nextSnap('expanded')).toBe('standard');
    expect(nextSnap('collapsed')).toBe('standard');
  });
});

describe('boutons autour de Radia', () => {
  it('colonnes complètes, serrées ou masquées selon la hauteur de la scène', () => {
    expect(sideMode(330)).toBe('full');
    expect(sideMode(190)).toBe('tight');
    expect(sideMode(120)).toBe('hidden');
  });
});

describe('compteurs compacts', () => {
  it('petits nombres lisibles, grands abrégés', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(5000)).toBe('5 000');
    expect(compactCount(9999)).toBe('9 999');
    expect(compactCount(12400)).toBe('12,4 k');
    expect(compactCount(250000)).toBe('250 k');
    expect(compactCount(2_500_000)).toBe('2,5 M');
    expect(compactCount(-5)).toBe('0');
    expect(compactCount(Number.NaN)).toBe('0');
  });
});
