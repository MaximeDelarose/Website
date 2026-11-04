/**
 * « L'Éclat Éternel ♡ » : chaîne fine en or blanc, petits diamants, grand diamant central taillé en cœur
 * (reflets blancs et roses, quelques étoiles). Deux usages :
 *  - le calque du cou de l'avatar (repère 240 × 600, enregistré dans EXTRA.neck par `installNecklace()`),
 *    donc visible partout où Radia est dessinée, avec toutes les tenues ;
 *  - l'illustration seule en grand (`drawNecklaceBig`) : fiche d'objet, écrin, souvenir.
 * `shine` ∈ [0,1] : reflet qui traverse la pierre + étincelle (même rythme que le bracelet : `shineAt()`).
 * ⚠ import circulaire avec avatar.ts : rien n'est utilisé avant `installNecklace()`.
 */
import { EXTRA, CX, INK } from './avatar';
import type { C } from './avatar';
import { sparkle, glow } from '../kit';
import { NECKLACE_ID } from '../../../data/world/ids';
import { shineGlow } from './wristShine';

type P = [number, number];
const WG_HI = '#FFFFFF';
const WG = '#E4E9F3';
const WG_LO = '#9AA3BA';
const EDGE = '#7A6580'; // contour mauve-gris doux (le métal blanc ne supporte pas un brun trop dur)

/** Points du contour d'un cœur (4 courbes de kit.heartPath), `n` points par courbe. */
export function heartOutline(cx: number, cy: number, s: number, n = 6): P[] {
  const w = s / 2;
  const seg: [P, P, P, P][] = [
    [[0, 0.95], [-0.2, 0.75], [-1.05, 0.25], [-1.0, -0.3]],
    [[-1.0, -0.3], [-0.95, -0.9], [-0.2, -1.0], [0, -0.45]],
    [[0, -0.45], [0.2, -1.0], [0.95, -0.9], [1.0, -0.3]],
    [[1.0, -0.3], [1.05, 0.25], [0.2, 0.75], [0, 0.95]],
  ];
  const out: P[] = [];
  for (const [a, b, c, d] of seg) {
    for (let i = 0; i < n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      out.push([cx + x * w, cy + y * w]);
    }
  }
  return out;
}

const path = (ctx: C, pts: P[]): void => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};

/**
 * Grand diamant taillé en cœur centré sur (cx, cy), largeur ≈ s. Facettes rose et blanc, table claire,
 * reflets. `shine` > 0 : un éclat traverse la pierre et une étoile s'allume. `detail` faux = version simplifiée.
 */
export function drawHeartGem(ctx: C, cx: number, cy: number, s: number, shine = 0, detail = true): void {
  const glowK = shineGlow(shine);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const outer = heartOutline(cx, cy, s, 6);
  // monture : petit liseré blanc autour de la pierre
  path(ctx, outer);
  ctx.lineWidth = Math.max(1.4, s * 0.16); ctx.strokeStyle = EDGE; ctx.stroke();
  ctx.lineWidth = Math.max(0.9, s * 0.1); ctx.strokeStyle = WG; ctx.stroke();
  // pierre : dégradé blanc → rose → bleu glacé
  path(ctx, outer);
  const g = ctx.createLinearGradient(cx - s * 0.5, cy - s * 0.5, cx + s * 0.5, cy + s * 0.55);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.38, '#FFE3EF'); g.addColorStop(0.7, '#F3B9D4'); g.addColorStop(1, '#C9D8F5');
  ctx.fillStyle = g; ctx.fill();
  if (detail) {
    ctx.save();
    path(ctx, outer); ctx.clip();
    const inner = heartOutline(cx, cy - s * 0.04, s * 0.5, 6);
    const tones = ['rgba(255,255,255,0.9)', 'rgba(255,196,222,0.75)', 'rgba(255,255,255,0.35)', 'rgba(190,214,255,0.7)', 'rgba(255,170,205,0.6)', 'rgba(255,255,255,0.7)'];
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      ctx.beginPath();
      ctx.moveTo(outer[i][0], outer[i][1]); ctx.lineTo(outer[j][0], outer[j][1]);
      ctx.lineTo(inner[j][0], inner[j][1]); ctx.lineTo(inner[i][0], inner[i][1]); ctx.closePath();
      ctx.fillStyle = tones[(i * 5 + (i >> 1)) % tones.length]; ctx.fill();
      ctx.lineWidth = Math.max(0.35, s * 0.012); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
    }
    // table : cœur central très clair
    path(ctx, inner);
    const tg = ctx.createLinearGradient(cx - s * 0.2, cy - s * 0.25, cx + s * 0.2, cy + s * 0.25);
    tg.addColorStop(0, 'rgba(255,255,255,0.97)'); tg.addColorStop(0.6, 'rgba(255,226,239,0.85)'); tg.addColorStop(1, 'rgba(225,235,255,0.8)');
    ctx.fillStyle = tg; ctx.fill();
    ctx.lineWidth = Math.max(0.4, s * 0.014); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
    // facettes en étoile depuis le centre de la table
    ctx.lineWidth = Math.max(0.3, s * 0.01); ctx.strokeStyle = 'rgba(190,150,190,0.45)';
    for (let i = 0; i < inner.length; i += 3) { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.02); ctx.lineTo(inner[i][0], inner[i][1]); ctx.stroke(); }
    // reflet qui traverse la pierre
    if (glowK > 0) {
      const p = Math.min(1, shine);
      const bx = cx - s * 0.7 + s * 1.4 * p;
      const bg = ctx.createLinearGradient(bx - s * 0.16, cy - s * 0.4, bx + s * 0.16, cy + s * 0.4);
      bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, `rgba(255,255,255,${0.85 * glowK})`); bg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bg; ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
    }
    ctx.restore();
  } else if (glowK > 0) {
    path(ctx, outer); ctx.fillStyle = `rgba(255,255,255,${0.4 * glowK})`; ctx.fill();
  }
  // contour fin + reflets nets
  path(ctx, outer); ctx.lineWidth = Math.max(0.8, s * 0.04); ctx.strokeStyle = EDGE; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.ellipse(cx - s * 0.2, cy - s * 0.22, s * 0.075, s * 0.045, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.22, cy - s * 0.12, s * 0.025, 0, Math.PI * 2); ctx.fill();
  if (glowK > 0.25) sparkle(ctx, cx - s * 0.22, cy - s * 0.26, s * (0.14 + 0.26 * glowK), '#FFFFFF', Math.min(1, glowK * 1.15));
  ctx.restore();
}

/** Petite pierre ronde de la chaîne (point lumineux blanc-rosé). */
function stone(ctx: C, x: number, y: number, r: number, lit: number): void {
  ctx.beginPath(); ctx.arc(x, y, r + 0.6, 0, Math.PI * 2); ctx.fillStyle = EDGE; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, '#FFE6F0'); g.addColorStop(1, '#C3D3F2');
  ctx.fillStyle = g; ctx.fill();
  if (lit > 0.3) sparkle(ctx, x, y, r * (1.6 + lit * 1.8), '#FFFFFF', lit);
}

/** Position le long d'une polyligne (0 ≤ t ≤ 1). */
function along(pts: P[], t: number): P {
  let len = 0;
  const segs: number[] = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); len += l; }
  let d = Math.min(1, Math.max(0, t)) * len;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) { const u = segs[i] ? d / segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
    d -= segs[i];
  }
  return pts[pts.length - 1];
}

/** Courbe lisse (Catmull-Rom → points) passant par `pts`. */
function smooth(pts: P[], per = 8): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export interface NecklaceSpec {
  /** Points guides de la chaîne, de l'attache gauche à l'attache droite en passant par le bas (le pendentif pend au milieu). */
  chain: P[];
  /** Position du pendentif (centre de la pierre) et sa largeur. */
  gem: P; gemSize: number;
  /** Épaisseur de la chaîne et rayon des petites pierres. */
  lw: number; stoneR: number;
  /** Nombre de petites pierres le long de la chaîne. */
  stones: number;
}

/** Dessine chaîne + petites pierres + pendentif. `simple` : petits sprites (chaîne épaisse, cœur sans facettes). */
export function drawNecklaceSpec(ctx: C, sp: NecklaceSpec, shine: number, simple: boolean): void {
  const g = shineGlow(shine);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const curve = smooth(sp.chain, 8);
  ctx.beginPath(); curve.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineWidth = sp.lw + (simple ? 1.6 : 1.2); ctx.strokeStyle = EDGE; ctx.stroke();
  ctx.beginPath(); curve.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  const a = sp.chain[0], b = sp.chain[sp.chain.length - 1];
  const lgr = ctx.createLinearGradient(a[0], a[1], b[0], b[1] + 30);
  lgr.addColorStop(0, WG_HI); lgr.addColorStop(0.5, WG); lgr.addColorStop(1, WG_LO);
  ctx.lineWidth = sp.lw; ctx.strokeStyle = lgr; ctx.stroke();
  if (!simple) {
    // maillons : fine alternance claire / sombre
    ctx.setLineDash([sp.lw * 0.9, sp.lw * 0.9]);
    ctx.beginPath(); curve.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = sp.lw * 0.45; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    ctx.setLineDash([]);
    // petits diamants le long de la chaîne (moitié de la longueur de chaque côté du pendentif)
    for (let i = 0; i < sp.stones; i++) {
      const t = (i + 0.5) / sp.stones;
      const [x, y] = along(curve, t);
      const near = Math.hypot(x - sp.gem[0], y - sp.gem[1]);
      if (near < sp.gemSize * 0.72) continue;
      const wave = Math.max(0, 1 - Math.abs(t - shine) * 6); // l'éclat « court » le long de la chaîne
      stone(ctx, x, y, sp.stoneR, g > 0 ? wave * g : 0);
    }
  }
  // attache du pendentif : bélière + halo de petits diamants
  const [gx, gy] = sp.gem;
  const s = sp.gemSize;
  if (!simple) {
    ctx.beginPath(); ctx.arc(gx, gy - s * 0.58, s * 0.11, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.lineWidth = Math.max(0.7, s * 0.04); ctx.strokeStyle = WG; ctx.stroke();
    const halo = heartOutline(gx, gy, s * 1.28, 3);
    halo.forEach(([x, y], i) => { if (i % 2 === 0 && y < gy + s * 0.15) stone(ctx, x, y, Math.max(0.9, s * 0.045), g > 0 && i % 4 === 0 ? g * 0.8 : 0); });
  }
  drawHeartGem(ctx, gx, gy, s, shine, !simple);
  ctx.restore();
}

// ------------------------------------------------------------------ calque de l'avatar

/** Géométrie sur l'avatar : suit le cou et le décolleté (repère 240 × 600), le pendentif repose sur la poitrine. */
// (fonction : `CX` vient d'avatar.ts, qui n'est pas encore évalué quand ce module est importé)
const avatarSpec = (): NecklaceSpec => ({
  chain: [[CX - 25.5, 157], [CX - 21, 178], [CX - 12, 195], [CX, 203], [CX + 12, 195], [CX + 21, 178], [CX + 25.5, 157]],
  gem: [CX, 217], gemSize: 20, lw: 2.1, stoneR: 1.25, stones: 9,
});

function neckDraw(ctx: C, shine: number): void {
  const k = Math.abs(ctx.getTransform().a) || 1; // pixels par unité d'avatar : petit sprite → version simplifiée
  if (k < 0.3) {
    const sp: NecklaceSpec = { ...avatarSpec(), lw: Math.min(5, Math.max(3, 1.6 / k)), gemSize: Math.min(30, Math.max(19, 7 / k)), gem: [CX, 218] };
    drawNecklaceSpec(ctx, sp, 0, true);
    return;
  }
  drawNecklaceSpec(ctx, avatarSpec(), shine, false);
  void INK;
}

export function installNecklace(): void {
  EXTRA.neck[NECKLACE_ID] = neckDraw;
}

// ------------------------------------------------------------------ illustration seule (fiche d'objet, écrin, souvenir)

/**
 * Le collier en grand, centré sur (cx, cy), `size` ≈ largeur totale en pixels. Halo doux optionnel.
 * `lit` ∈ [0,1] ajoute des étoiles autour (mise en valeur).
 */
export function drawNecklaceBig(ctx: C, cx: number, cy: number, size: number, shine = 0, lit = 1): void {
  const s = size / 100; // 1 unité = 1 % de la largeur
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  if (lit > 0) glow(ctx, 0, 6, 62, '#FFFFFF', 0.28 * lit);
  const sp: NecklaceSpec = {
    chain: [[-46, -34], [-40, -6], [-26, 18], [-11, 31], [0, 35], [11, 31], [26, 18], [40, -6], [46, -34]],
    gem: [0, 56], gemSize: 35, lw: 2.6, stoneR: 1.9, stones: 17,
  };
  drawNecklaceSpec(ctx, sp, shine, false);
  if (lit > 0) {
    // étoiles autour du bijou
    const g = shineGlow(shine);
    const stars: [number, number, number][] = [[-34, 50, 6], [36, 54, 7.5], [-16, 82, 4.5], [22, 84, 5], [-52, 8, 4], [52, 4, 4.5]];
    stars.forEach(([x, y, r], i) => sparkle(ctx, x, y, r * (0.8 + 0.5 * (i % 2 ? g : 1 - g * 0.5)), i % 2 ? '#FFD6E8' : '#FFFFFF', 0.85 * lit));
  }
  ctx.restore();
}

/** Position (dans l'avatar 240 × 600) du centre du diamant : sert aux animations d'apparition. */
export const NECKLACE_GEM_AT: P = [120, 216];
