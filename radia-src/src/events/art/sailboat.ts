/**
 * « Le voilier jaune » : le dessin de la petite, comme une œuvre d'art au crayon de cire.
 * Un voilier tout jaune, plein de détails (voiles cousues, hublots, drapeau, cordages, mouettes,
 * poissons, soleil, vagues) et la dédicace « pour tonton et maman » en bas.
 * Pur dessin (Canvas 2D) : aucun nom, aucune photo.
 */
import { mulberry32 } from '../../game/world/careerGames/rng';

type C = CanvasRenderingContext2D;
type P = [number, number];

export const SAILBOAT_CAPTION = 'pour tonton et maman';
/** Rapport largeur / hauteur du papier. */
export const SAILBOAT_RATIO = 360 / 500;

export function drawSailboatDrawing(ctx: C, w: number, h: number, seed = 11): void {
  const rnd = mulberry32(seed);
  const jit = (a: number) => (rnd() - 0.5) * a;
  const sx = w / 360;
  ctx.save();
  ctx.scale(sx, sx);
  const W = 360;
  const H = h / sx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ---- le papier (grain, légères fibres)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFFCF4'); bg.addColorStop(1, '#F6F0E2');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(150,130,100,${0.04 + rnd() * 0.05})`;
    const x = rnd() * W, y = rnd() * H;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + jit(10), y + jit(10)); ctx.stroke();
  }

  /** Trait de crayon de cire : plusieurs passages légèrement décalés. */
  const crayon = (pts: P[], color: string, lw: number, alpha = 0.7) => {
    for (let pass = 0; pass < 3; pass++) {
      ctx.globalAlpha = alpha * (pass === 0 ? 1 : 0.55);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw * (pass === 0 ? 1 : 0.7);
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const px = x + jit(1.6), py = y + jit(1.6); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const smooth = (pts: P[], color: string, lw: number, alpha = 0.7) => {
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = alpha * (pass === 0 ? 1 : 0.5);
      ctx.strokeStyle = color; ctx.lineWidth = lw * (pass ? 0.7 : 1);
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + jit(1.2), pts[0][1] + jit(1.2));
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2 + jit(1), my = (pts[i][1] + pts[i + 1][1]) / 2 + jit(1);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const circle = (cx: number, cy: number, r: number): P[] => Array.from({ length: 13 }, (_, i) => [cx + Math.cos((i / 12) * Math.PI * 2) * r, cy + Math.sin((i / 12) * Math.PI * 2) * r] as P);
  /** Remplissage « hachuré » comme au crayon : va-et-vient serrés à l'intérieur d'un contour. */
  const hatch = (path: () => void, color: string, angle: number, spacing: number, lw = 3.4, alpha = 0.8) => {
    ctx.save();
    path(); ctx.clip();
    const diag = Math.hypot(W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(angle); ctx.translate(-diag / 2, -diag / 2);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.globalAlpha = alpha;
    for (let y = 0; y < diag; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(-10, y + jit(2));
      for (let x = 0; x < diag; x += 16) ctx.lineTo(x + 8 + jit(3), y + ((x / 16) % 2 ? 2.4 : -2.4) + jit(1.5));
      ctx.stroke();
    }
    ctx.restore();
  };
  const poly = (pts: P[]) => () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  const Y1 = '#F4CF18', Y2 = '#E7A90C', Y3 = '#B98300', BLUE = '#4F86D8', SKY = '#A9D2F2', ORG = '#F08A24';

  // ---- ciel : soleil, nuages, mouettes
  hatch(() => { ctx.beginPath(); ctx.rect(0, 0, W, 240); }, SKY, 0.15, 11, 4, 0.15);
  const sunX = 292, sunY = 62;
  hatch(() => { ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, 7); }, '#FFD84A', 0.6, 4.5, 3.2, 0.9);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; crayon([[sunX + Math.cos(a) * 33, sunY + Math.sin(a) * 33], [sunX + Math.cos(a) * 46, sunY + Math.sin(a) * 46]], ORG, 3, 0.8); }
  smooth(circle(sunX, sunY, 26), ORG, 2.4, 0.7);
  for (const [cx, cy, s] of [[70, 62, 1], [150, 36, 0.7], [220, 100, 0.8]] as const) {
    smooth([[cx - 32 * s, cy + 8], [cx - 22 * s, cy - 8], [cx - 4 * s, cy - 14], [cx + 12 * s, cy - 6], [cx + 30 * s, cy - 8], [cx + 40 * s, cy + 6], [cx + 20 * s, cy + 12], [cx - 32 * s, cy + 8]], '#8FB4D8', 2.6, 0.8);
    hatch(poly([[cx - 30 * s, cy + 8], [cx - 20 * s, cy - 6], [cx + 10 * s, cy - 10], [cx + 36 * s, cy + 4], [cx + 18 * s, cy + 11]]), '#EAF3FB', 0.2, 5, 3, 0.9);
  }
  for (const [bx, by] of [[110, 126], [132, 114], [60, 150]] as const) smooth([[bx - 11, by - 2], [bx - 4, by - 7], [bx, by], [bx + 4, by - 7], [bx + 11, by - 2]], '#5A5A78', 2, 0.9);

  // ---- mer : bandes de vagues bleues, écume, poissons
  const seaTop = 262, seaBot = H - 78;
  hatch(() => { ctx.beginPath(); ctx.rect(0, seaTop, W, seaBot - seaTop); }, BLUE, -0.08, 7, 3.6, 0.78);
  hatch(() => { ctx.beginPath(); ctx.rect(0, seaTop + 40, W, 50); }, '#2E62B8', 0.05, 11, 3, 0.45);
  for (let r = 0; r < 4; r++) {
    const y = seaTop + 14 + r * 24;
    const pts: P[] = []; for (let x = -10; x <= W + 10; x += 22) pts.push([x, y + (Math.floor(x / 22) % 2 ? -6 : 6)]);
    smooth(pts, '#E9F4FF', 2.2, 0.85);
  }
  for (const [fx, fy, s] of [[48, 360, 1], [304, 384, 0.8]] as const) {
    smooth([[fx - 14 * s, fy], [fx - 4 * s, fy - 7 * s], [fx + 12 * s, fy], [fx - 4 * s, fy + 7 * s], [fx - 14 * s, fy]], '#FFB347', 2.4, 0.95);
    hatch(poly([[fx - 12 * s, fy], [fx - 3 * s, fy - 6 * s], [fx + 10 * s, fy], [fx - 3 * s, fy + 6 * s]]), '#FF9A3C', 0.4, 3.2, 2.4, 0.9);
    crayon([[fx + 12 * s, fy], [fx + 22 * s, fy - 6 * s], [fx + 22 * s, fy + 6 * s], [fx + 12 * s, fy]], '#FF9A3C', 2, 0.95);
    ctx.fillStyle = '#1C1730'; ctx.beginPath(); ctx.arc(fx - 8 * s, fy - 1.5 * s, 1.5, 0, 7); ctx.fill();
  }

  // ---- le voilier, tout jaune
  const hull: P[] = [[78, 284], [282, 284], [262, 330], [232, 346], [128, 346], [98, 330]];
  hatch(poly([[96, 352], [264, 352], [250, 386], [112, 386]]), Y1, 0.02, 8, 3, 0.45); // reflet dans l'eau
  // grande voile : hachures, coutures horizontales, étoile
  const base = (pts: P[]) => { ctx.save(); poly(pts)(); ctx.fillStyle = '#FBE57E'; ctx.globalAlpha = 0.95; ctx.fill(); ctx.restore(); };
  const main: P[] = [[168, 66], [168, 272], [84, 272]];
  base(main);
  hatch(poly(main), Y1, 1.15, 5.5, 3.6, 0.9);
  hatch(poly(main), Y2, 0.35, 12, 2.6, 0.4);
  crayon([...main, main[0]], Y3, 2.6, 0.95);
  for (let i = 1; i <= 4; i++) { const y = 272 - (206 * i) / 5; const xh = 168 - 84 * ((y - 66) / 206); crayon([[xh, y], [168, y]], Y3, 1.2, 0.55); }
  for (const [x, y] of [[132, 236], [124, 212], [144, 212]] as const) crayon([[x - 7, y], [x + 7, y]], Y3, 1.5, 0.7);
  // foc (petite voile) + coutures
  const jib: P[] = [[178, 92], [178, 268], [264, 268]];
  base(jib);
  hatch(poly(jib), Y1, -1.1, 5.5, 3.6, 0.9);
  crayon([...jib, jib[0]], Y3, 2.6, 0.95);
  for (let i = 1; i <= 3; i++) { const y = 268 - (176 * i) / 4; const xh = 178 + 86 * ((y - 92) / 176); crayon([[178, y], [xh, y]], Y3, 1.1, 0.5); }
  // mât, drapeau (avec un cœur), cordages
  crayon([[172, 52], [172, 284]], Y3, 5, 0.95);
  crayon([[172, 52], [172, 284]], Y2, 2.4, 0.9);
  const flag: P[] = [[173, 52], [216, 61], [173, 72]];
  hatch(poly(flag), '#FFE45C', 0.2, 3.5, 2.8, 0.95);
  crayon([...flag, flag[0]], Y3, 2.2, 0.95);
  ctx.fillStyle = '#F0654A'; ctx.beginPath(); ctx.moveTo(190, 66); ctx.bezierCurveTo(186, 61.5, 182, 65.5, 190, 70); ctx.bezierCurveTo(198, 65.5, 194, 61.5, 190, 66); ctx.fill();
  crayon([[172, 52], [92, 278]], Y3, 1.2, 0.55);
  crayon([[172, 52], [270, 278]], Y3, 1.2, 0.55);
  // coque : hachures jaunes, contour doré, bande, hublots, bastingage
  base(hull);
  hatch(poly(hull), Y1, -0.5, 5, 3.8, 0.95);
  hatch(poly(hull), Y2, 0.9, 11, 2.6, 0.45);
  crayon([...hull, hull[0]], Y3, 3, 0.95);
  hatch(poly([[80, 284], [280, 284], [277, 296], [83, 296]]), Y2, 0, 4, 2.6, 0.9);
  crayon([[80, 297], [280, 297]], Y3, 2, 0.9);
  for (const hx of [120, 170, 220]) {
    ctx.save(); ctx.beginPath(); ctx.arc(hx, 319, 11, 0, 7); ctx.fillStyle = '#FFF3B8'; ctx.globalAlpha = 0.95; ctx.fill(); ctx.restore();
    smooth(circle(hx, 319, 11), Y3, 2.4, 0.95);
    smooth(circle(hx, 319, 6.5), '#E5A900', 1.2, 0.8);
  }
  for (let x = 88; x <= 272; x += 14) crayon([[x, 284], [x, 273]], Y3, 1.4, 0.8);
  crayon([[84, 273], [272, 273]], Y3, 1.8, 0.85);
  for (let i = 0; i < 6; i++) { const x = 92 + i * 34; smooth([[x, 350], [x + 8, 342], [x + 16, 350], [x + 24, 342], [x + 32, 350]], '#E9F4FF', 3, 0.95); }
  // ancre jaune sur la coque
  crayon([[240, 308], [240, 330]], Y3, 2, 0.9); crayon([[233, 314], [247, 314]], Y3, 2, 0.9);
  smooth([[232, 326], [236, 334], [244, 334], [248, 326]], Y3, 2, 0.9);

  // ---- dédicace
  ctx.save();
  ctx.translate(W / 2, H - 38);
  ctx.rotate(-0.012);
  ctx.font = `700 34px 'Dancing Script', 'Snell Roundhand', 'Bradley Hand', cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(244,207,24,0.55)'; ctx.strokeText(SAILBOAT_CAPTION, 0, 0);
  ctx.fillStyle = '#E58A1E'; ctx.fillText(SAILBOAT_CAPTION, 0, 0);
  ctx.restore();
  for (const [x, y, s] of [[34, H - 70, 1], [330, H - 74, 0.8], [326, H - 18, 0.7], [32, H - 20, 0.8]] as const) {
    ctx.fillStyle = '#F0654A'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(x, y + 5 * s); ctx.bezierCurveTo(x - 9 * s, y - 2 * s, x - 4 * s, y - 9 * s, x, y - 3 * s); ctx.bezierCurveTo(x + 4 * s, y - 9 * s, x + 9 * s, y - 2 * s, x, y + 5 * s); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
