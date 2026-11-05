/**
 * Avatar de Radia : chaussures, sacs, coiffures, bijoux de cou et accessoires de visage
 * (foulards, lunettes, boucles d'oreilles). Enregistre les dessins dans `EXTRA` (voir avatar.ts).
 * ⚠ import circulaire avec avatar.ts : aucune `const` de module utilisée à l'installation.
 */
import { lg, fs, line, dot, bow, hairCap, hairDome, ropeStrand, EXTRA, CX, INK, skin, skinD, skinL, GOLD, SHOE_Y } from './avatar';
import type { C, Pt } from './avatar';
import { radiaParts as P } from '../characters';
import { heartPath, starPath, roundRect, shade, gloss } from '../kit';
import { installWrist } from './avatarWrist';
import { installNecklace } from './avatarNecklace';

// ================================================================ chaussures

interface ShoeO {
  c0: string; c1: string;
  H: number;                       // hauteur visuelle du talon (≤ 22)
  p?: number;                      // plateau avant
  heel: 'stiletto' | 'block' | 'kitten' | 'wedge';
  front: 'pointed' | 'round' | 'open' | 'band' | 'strappy';
  back: 'closed' | 'sling' | 'open' | 'ankle';
  hc?: string;                     // couleur du talon
  sole?: string;
  strap?: string;
  glitter?: boolean;
  bowC?: string;
  buckle?: boolean;
}

function soleSegs(ctx: C, H: number, p: number, tip: number): void {
  ctx.moveTo(-18, -H);
  ctx.bezierCurveTo(-14, -H * 0.42 - p * 0.3, -2, -p - 4, 12, -p - 3);
  ctx.quadraticCurveTo(tip - 6, -p - 2.5, tip, -p - 1);
}

function footPath(ctx: C, H: number, p: number, tip: number): void {
  ctx.beginPath();
  ctx.moveTo(-19, -23);
  ctx.lineTo(-18, -H);
  ctx.bezierCurveTo(-14, -H * 0.42 - p * 0.3, -2, -p - 4, 12, -p - 3);
  ctx.quadraticCurveTo(tip - 6, -p - 2.5, tip, -p - 1);
  ctx.bezierCurveTo(tip - 1, -p - 8, tip - 13, -p - 12, 12, -p - 16);
  ctx.lineTo(11, Math.min(-23, -p - 19));
}

function strapLine(ctx: C, pts: Pt[], w: number, col: string, smooth = true): void {
  line(ctx, pts, INK, w + 2.4, smooth);
  line(ctx, pts, col, w, smooth);
  line(ctx, pts.map(([x, y]) => [x - 0.3, y - w * 0.22] as Pt), 'rgba(255,255,255,0.4)', Math.max(0.8, w * 0.28), smooth);
}

function heelShoe(ctx: C, cx: number, s: number, o: ShoeO): void {
  const p = o.p ?? 0;
  const H = o.H;
  const tip = o.front === 'pointed' ? 35 : o.front === 'round' ? 29 : 31;
  const hc = o.hc ?? o.c1;
  ctx.save();
  ctx.translate(cx, SHOE_Y);
  ctx.scale(s, 1);

  // --- talon / plateau / compensé (derrière le pied)
  if (o.heel === 'stiletto') {
    ctx.beginPath();
    ctx.moveTo(-20, -H + 3); ctx.lineTo(-11, -H + 3); ctx.lineTo(-12.8, -1); ctx.lineTo(-16, -1); ctx.closePath();
    fs(ctx, lg(ctx, -20, 0, -11, 0, shade(hc, 0.15), hc), 1.7);
    ctx.fillStyle = '#2A1E22';
    ctx.fillRect(-16.2, -2, 3.6, 2.6);
  } else if (o.heel === 'block') {
    ctx.beginPath();
    ctx.moveTo(-22, -H + 3); ctx.lineTo(-8, -H + 3); ctx.lineTo(-9.5, 0); ctx.lineTo(-21, 0); ctx.closePath();
    fs(ctx, lg(ctx, -22, 0, -8, 0, shade(hc, 0.18), hc), 1.8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-21, -1.5, 11.5, 2);
  } else if (o.heel === 'kitten') {
    ctx.beginPath();
    ctx.moveTo(-20, -H + 3); ctx.lineTo(-11, -H + 3); ctx.lineTo(-13, 0); ctx.lineTo(-18, 0); ctx.closePath();
    fs(ctx, lg(ctx, -20, 0, -11, 0, shade(hc, 0.15), hc), 1.7);
  } else {
    ctx.beginPath();
    ctx.moveTo(-20, -H + 3); ctx.lineTo(-20, 0); ctx.lineTo(18, 0); ctx.lineTo(18, -p - 4);
    ctx.bezierCurveTo(4, -p - 6, -10, -H * 0.5, -17, -H + 3);
    ctx.closePath();
    fs(ctx, lg(ctx, -20, -H, 18, 0, shade(hc, 0.2), hc, shade(hc, -0.2)), 1.9);
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(80,50,20,0.35)';
    for (let x = -16; x < 18; x += 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 4, -H); ctx.stroke(); }
    ctx.restore();
  }
  if (p > 0) {
    ctx.beginPath();
    ctx.moveTo(-1, -p); ctx.lineTo(tip - 3, -p); ctx.quadraticCurveTo(tip + 5, -p / 2, tip - 2, 0); ctx.lineTo(-1, 0); ctx.closePath();
    fs(ctx, lg(ctx, 0, -p, 0, 0, shade(hc, 0.2), hc), 1.8);
  }

  // --- pied
  footPath(ctx, H, p, tip);
  fs(ctx, lg(ctx, -25, 0, 21, 0, skinL(), skin(), skinD()), 2);

  // --- empeigne (clippée sur le pied)
  ctx.save();
  footPath(ctx, H, p, tip);
  ctx.closePath();
  ctx.clip();
  const up = lg(ctx, -16, -34, 28, 2, shade(o.c0, 0.08), o.c0, o.c1);
  if (o.front === 'pointed' || o.front === 'round') {
    ctx.beginPath();
    ctx.moveTo(8, -60); ctx.lineTo(5, -p - 19);
    ctx.quadraticCurveTo(-3, -p - 9, 3, -p + 7);
    ctx.lineTo(50, 12); ctx.lineTo(50, -60); ctx.closePath();
    ctx.fillStyle = up;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -p - 19); ctx.quadraticCurveTo(-3, -p - 9, 3, -p + 7);
    ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
  }
  if (o.back === 'closed') {
    ctx.beginPath();
    ctx.moveTo(-40, -33); ctx.lineTo(-12, -31); ctx.quadraticCurveTo(-1, -21, -1, -p - 8);
    ctx.lineTo(-1, 12); ctx.lineTo(-40, 12); ctx.closePath();
    ctx.fillStyle = up;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, -31); ctx.quadraticCurveTo(-1, -21, -1, -p - 8);
    ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
  }
  ctx.restore();

  // --- semelle
  ctx.beginPath();
  soleSegs(ctx, H, p, tip);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.6;
  ctx.strokeStyle = o.sole ?? shade(o.c1, -0.3);
  ctx.stroke();

  // --- contour du pied
  footPath(ctx, H, p, tip);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // --- sangles / décors
  const sc = o.strap ?? o.c0;
  if (o.back === 'sling' || o.back === 'ankle') {
    strapLine(ctx, [[3, -p - 6], [-8, -13], [-17, -H + 1]], 3.2, sc);
    if (o.back === 'sling') dot(ctx, -9, -13.5, 2, GOLD, INK, 0.9);
  }
  if (o.back === 'ankle' || o.buckle) {
    roundRect(ctx, -21, -31, 35, 7.5, 3);
    fs(ctx, lg(ctx, 0, -31, 0, -23, shade(sc, 0.25), sc, shade(sc, -0.15)), 1.7);
    roundRect(ctx, 4, -32, 6, 9.5, 1.5);
    fs(ctx, lg(ctx, 4, -32, 10, -22, '#FFF0B8', GOLD, '#C8902C'), 1.2);
    ctx.beginPath(); ctx.moveTo(7, -29); ctx.lineTo(7, -25.5);
    ctx.lineWidth = 0.9; ctx.strokeStyle = INK; ctx.stroke();
  }
  if (o.front === 'band') {
    ctx.save();
    footPath(ctx, H, p, tip);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(2, -60); ctx.lineTo(2, -p - 19); ctx.quadraticCurveTo(-1, -p - 9, 5, 12);
    ctx.lineTo(26, 12); ctx.quadraticCurveTo(20, -p - 9, 20, -60); ctx.closePath();
    ctx.fillStyle = lg(ctx, 2, -p - 20, 22, 0, shade(sc, 0.3), sc, shade(sc, -0.12));
    ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -p - 14); ctx.quadraticCurveTo(10, -p - 6, 12, 2);
    ctx.lineWidth = 1.6; ctx.strokeStyle = GOLD; ctx.stroke();
    gloss(ctx, 12, -p - 13, 3, 6, 0.5, 0.3);
    ctx.restore();
  }
  if (o.front === 'open') {
    // bride de peep-toe + bride d'orteil
    strapLine(ctx, [[8, -p - 13], [16, -p - 10], [23, -p - 6]], 4.4, sc);
    strapLine(ctx, [[6, -p - 5], [11, -p - 11]], 3.2, sc);
    dot(ctx, 23, -p - 5, 1.6, o.glitter ? GOLD : shade(sc, 0.3), INK, 0.8);
  }
  if (o.front === 'strappy') {
    strapLine(ctx, [[20, -p - 3], [21, -p - 10], [17, -p - 12]], 2.6, sc);
    strapLine(ctx, [[8, -p - 4], [12, -p - 13], [16, -p - 15]], 2.6, sc);
    strapLine(ctx, [[10, -p - 12], [2, -p - 18], [-3, -25]], 2.4, sc);
    strapLine(ctx, [[4, -p - 5], [-2, -14], [-12, -H + 3]], 2.4, sc);
    strapLine(ctx, [[14, -p - 12], [6, -p - 17], [1, -27]], 2.4, sc);
  }
  if (o.bowC) bow(ctx, 12, -p - 10, 0.34, o.bowC, 0.6);
  if (o.glitter) {
    for (const [x, y] of [[-10, -12], [-4, -9], [3, -6], [17, -p - 5], [21, -p - 3], [9, -p - 7]] as const) dot(ctx, x, y, 0.9, '#FFFFFF');
  }
  if (o.front === 'pointed' || o.front === 'round') gloss(ctx, 21, -p - 6, 5, 1.5, 0.55, -0.35);
  gloss(ctx, -9.5, -H + 7, 1.3, 4.5, 0.4, 0.1);
  ctx.restore();
}

function platformBoot(ctx: C, cx: number, s: number): void {
  ctx.save();
  ctx.translate(cx, SHOE_Y);
  ctx.scale(s, 1);
  const col0 = '#4A3A44', col1 = '#17111A';
  // talon bloc
  ctx.beginPath();
  ctx.moveTo(-23, -14); ctx.lineTo(-6, -14); ctx.lineTo(-7.5, 0); ctx.lineTo(-22, 0); ctx.closePath();
  fs(ctx, '#17111A', 1.9);
  // plateau avant
  ctx.beginPath();
  ctx.moveTo(-2, -12); ctx.lineTo(32, -12); ctx.quadraticCurveTo(41, -6, 33, 0); ctx.lineTo(-2, 0); ctx.closePath();
  fs(ctx, lg(ctx, 0, -12, 0, 0, '#5A4A56', '#17111A'), 1.9);
  // botte
  ctx.beginPath();
  ctx.moveTo(-20, -106);
  ctx.lineTo(16, -106);
  ctx.bezierCurveTo(18, -80, 15, -56, 17, -40);
  ctx.bezierCurveTo(26, -36, 36, -30, 34, -19);
  ctx.bezierCurveTo(33, -14, 28, -12, 24, -12);
  ctx.lineTo(-24, -12);
  ctx.bezierCurveTo(-25, -40, -20, -70, -20, -106);
  ctx.closePath();
  fs(ctx, lg(ctx, -22, -108, 30, -10, col0, '#2A2028', col1), 2.3);
  // bord haut + coutures
  ctx.beginPath(); ctx.moveTo(-20, -99); ctx.lineTo(16, -99);
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, -13.5); ctx.lineTo(26, -13.5);
  ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke();
  // zip argenté sur le côté
  line(ctx, [[-13, -102], [-14, -62], [-13, -26]], '#D9DEE8', 1.8, false);
  dot(ctx, -13, -100, 2, '#E8ECF4', INK, 0.8);
  // reflets de cuir verni
  gloss(ctx, 4, -76, 2.6, 18, 0.3, 0.05);
  gloss(ctx, 21, -24, 6, 1.7, 0.5, -0.5);
  // bride / boucle
  roundRect(ctx, -21, -62, 38, 6, 2.5);
  fs(ctx, '#2A2028', 1.5);
  roundRect(ctx, 4, -63, 6.5, 8, 1.5);
  fs(ctx, lg(ctx, 4, -63, 10, -55, '#FFF0B8', GOLD, '#C8902C'), 1);
  roundRect(ctx, -21, -88, 38, 6, 2.5);
  fs(ctx, '#2A2028', 1.5);
  roundRect(ctx, 4, -89, 6.5, 8, 1.5);
  fs(ctx, lg(ctx, 4, -89, 10, -81, '#FFF0B8', GOLD, '#C8902C'), 1);
  ctx.restore();
}

function installShoes(): void {
  const S = EXTRA.shoe;
  S['sh-platform-boots'] = platformBoot;
  S['sh-heels-nude'] = (c, x, s) => heelShoe(c, x, s, { c0: '#F8DCC8', c1: '#D4A283', H: 21, heel: 'stiletto', front: 'pointed', back: 'closed' });
  S['sh-heels-red'] = (c, x, s) => heelShoe(c, x, s, { c0: '#FF6074', c1: '#AE1530', H: 21, heel: 'stiletto', front: 'pointed', back: 'sling', hc: '#B01630', sole: '#7C0E22', strap: '#E8334F' });
  S['sh-heels-gold'] = (c, x, s) => heelShoe(c, x, s, { c0: '#FFF0B8', c1: '#D9A238', H: 19, p: 4, heel: 'block', front: 'open', back: 'ankle', hc: '#E6B84E', strap: '#F2C95C', glitter: true });
  S['sh-heels-silver'] = (c, x, s) => heelShoe(c, x, s, { c0: '#FFFFFF', c1: '#9AA3B8', H: 18, heel: 'block', front: 'round', back: 'ankle', hc: '#B9C0D0', strap: '#DDE2EC', glitter: true });
  S['sh-heels-pink'] = (c, x, s) => heelShoe(c, x, s, { c0: '#FFD0E2', c1: '#EE7AAC', H: 20, heel: 'stiletto', front: 'pointed', back: 'closed', hc: '#EE7AAC', bowC: '#FFF4F8' });
  S['sh-sandals-red'] = (c, x, s) => heelShoe(c, x, s, { c0: '#F2566A', c1: '#B71C34', H: 17, heel: 'block', front: 'open', back: 'ankle', hc: '#C42540', strap: '#E23A4E' });
  S['sh-strappy-black'] = (c, x, s) => heelShoe(c, x, s, { c0: '#4A3E48', c1: '#17111A', H: 22, heel: 'stiletto', front: 'strappy', back: 'ankle', hc: '#17111A', strap: '#2A2028' });
  S['sh-mules-cream'] = (c, x, s) => heelShoe(c, x, s, { c0: '#FFF8EC', c1: '#E2CDAC', H: 15, heel: 'block', front: 'band', back: 'open', hc: '#E8D6B8', strap: '#F8EBD4', sole: '#BFA682' });
}

// ================================================================ sacs

function strapBand(ctx: C, pts: Pt[], w: number, col: string, hi = 'rgba(255,255,255,0.2)'): void {
  line(ctx, pts, INK, w + 2.2);
  line(ctx, pts, col, w);
  line(ctx, pts.map(([x, y]) => [x - 0.8, y] as Pt), hi, Math.max(0.8, w * 0.28));
}

function installBags(): void {
  const B = EXTRA.bag;

  // sac épaule noir souple (sous le bras gauche de l'image, fine bandoulière)
  B['bg-shoulder-black'] = (ctx) => {
    strapBand(ctx, [[CX - 46, 172], [CX - 62, 220], [CX - 68, 262]], 3, '#16101A');
    ctx.beginPath();
    ctx.moveTo(34, 268);
    ctx.bezierCurveTo(48, 258, 78, 258, 96, 268);
    ctx.bezierCurveTo(104, 292, 100, 322, 86, 336);
    ctx.bezierCurveTo(70, 344, 50, 342, 36, 332);
    ctx.bezierCurveTo(28, 312, 28, 288, 34, 268);
    ctx.closePath();
    fs(ctx, lg(ctx, 34, 262, 100, 342, '#4A4050', '#1A141E', '#0C0910'), 2.3);
    // pli souple + rabat
    ctx.beginPath();
    ctx.moveTo(36, 276); ctx.bezierCurveTo(54, 292, 82, 290, 98, 278);
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
    line(ctx, [[40, 306], [62, 316], [88, 304]], 'rgba(0,0,0,0.35)', 1.6);
    gloss(ctx, 50, 288, 9, 2.4, 0.3, -0.5);
    gloss(ctx, 44, 316, 2.4, 8, 0.2, 0.2);
    dot(ctx, 66, 276, 2.6, GOLD, INK, 1);
    dot(ctx, 40, 268, 2.4, GOLD, INK, 1);
    dot(ctx, 92, 268, 2.4, GOLD, INK, 1);
  };

  // pochette rose perlée, tenue à la main gauche de l'image
  B['bg-clutch-pink'] = (ctx) => {
    ctx.save();
    ctx.translate(CX - 66, 354);
    ctx.rotate(-0.12);
    roundRect(ctx, -26, -17, 52, 32, 7);
    fs(ctx, lg(ctx, -26, -17, 26, 15, '#FFE0EC', '#F6A6C4', '#E477A2'), 2.3);
    // perles
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
      const x = -19 + i * 7.6 + (r % 2) * 3.5, y = -8 + r * 8;
      if (x > 22) continue;
      dot(ctx, x, y, 2.6, '#FFFDF8', 'rgba(150,100,100,0.7)', 0.7);
      dot(ctx, x - 0.8, y - 0.8, 0.8, '#FFFFFF');
    }
    // rabat + fermoir doré
    ctx.beginPath();
    ctx.moveTo(-26, -10); ctx.quadraticCurveTo(0, -4, 26, -10);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(160,60,100,0.5)'; ctx.stroke();
    roundRect(ctx, -6, -9, 12, 7, 3);
    fs(ctx, lg(ctx, -6, -9, 6, -2, '#FFF0B8', GOLD, '#C8902C'), 1.5);
    dot(ctx, 0, -5.5, 1.5, '#FFF4D0');
    gloss(ctx, -16, -13, 6, 1.6, 0.6, -0.1);
    ctx.restore();
  };

  // baguette argentée sous l'aisselle droite de l'image
  B['bg-silver'] = (ctx) => {
    strapBand(ctx, [[CX + 44, 172], [CX + 52, 206], [CX + 40, 246]], 3.4, '#C8CEDA', 'rgba(255,255,255,0.7)');
    ctx.save();
    ctx.translate(CX + 56, 262);
    ctx.rotate(0.2);
    ctx.scale(1.05, 1.05);
    ctx.beginPath();
    ctx.moveTo(-30, -11);
    ctx.quadraticCurveTo(0, -17, 30, -11);
    ctx.quadraticCurveTo(36, 0, 30, 12);
    ctx.quadraticCurveTo(0, 17, -30, 12);
    ctx.quadraticCurveTo(-36, 0, -30, -11);
    ctx.closePath();
    fs(ctx, lg(ctx, -32, -14, 32, 14, '#FFFFFF', '#C8CEDA', '#8C95AA'), 2.3);
    // rabat
    ctx.beginPath();
    ctx.moveTo(-31, -4); ctx.quadraticCurveTo(0, 8, 31, -4);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(60,70,100,0.55)'; ctx.stroke();
    // petit fermoir doré
    roundRect(ctx, -4.5, 1, 9, 6, 2);
    fs(ctx, lg(ctx, -4, 1, 4, 7, '#FFF0B8', GOLD, '#C8902C'), 1.3);
    gloss(ctx, -14, -9, 10, 1.8, 0.7, -0.05);
    gloss(ctx, 20, 7, 5, 1.2, 0.4, -0.05);
    dot(ctx, -30, -10, 2, GOLD, INK, 0.9);
    dot(ctx, 30, -10, 2, GOLD, INK, 0.9);
    ctx.restore();
  };

  // cabas beige à l'épaule (anses sur le bras droit de l'image)
  B['bg-tote-beige'] = (ctx) => {
    for (const dx of [0, 14]) {
      ctx.beginPath();
      ctx.moveTo(CX + 52 + dx, 300);
      ctx.bezierCurveTo(CX + 44 + dx * 0.5, 250, CX + 40, 205, CX + 44 + dx * 0.4, 178);
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 3.4; ctx.strokeStyle = dx ? '#C9A97C' : '#E2C79B'; ctx.stroke();
    }
    const x0 = 160, y0 = 298, w = 58, h = 62;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0);
    ctx.lineTo(x0 + w - 4, y0 + h); ctx.quadraticCurveTo(x0 + w / 2, y0 + h + 5, x0 + 4, y0 + h);
    ctx.closePath();
    fs(ctx, lg(ctx, x0, y0, x0 + w, y0 + h, '#F4E6CC', '#E2C79B', '#C6A273'), 2.3);
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,80,40,0.28)';
    for (let y = y0 + 8; y < y0 + h; y += 7) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x0, y0, w, 11);
    ctx.restore();
    // patch cuir + petit coeur
    roundRect(ctx, x0 + 18, y0 + 22, 22, 18, 4);
    fs(ctx, '#9B6B45', 1.6);
    heartPath(ctx, x0 + 29, y0 + 31, 11);
    fs(ctx, '#F5D5B0', 1);
    dot(ctx, x0 + 10, y0 + 3, 2, '#9B6B45', INK, 0.8);
    dot(ctx, x0 + w - 10, y0 + 3, 2, '#9B6B45', INK, 0.8);
  };

  // mini sac rouge, chaîne dorée en bandoulière
  B['bg-red-mini'] = (ctx) => {
    const chain: Pt[] = [[CX + 34, 168], [CX + 6, 216], [CX - 34, 276], [CX - 60, 326]];
    line(ctx, chain, '#8A6420', 3.6);
    ctx.save();
    ctx.setLineDash([3.6, 2.4]);
    line(ctx, chain, '#FFE9A6', 2.4);
    ctx.restore();
    const bx = 36, by = 326, bw = 52, bh = 36;
    roundRect(ctx, bx, by, bw, bh, 8);
    fs(ctx, lg(ctx, bx, by, bx + bw, by + bh, '#FF6A7E', '#D02A44', '#9C1730'), 2.3);
    ctx.beginPath();
    ctx.moveTo(bx, by + 6); ctx.quadraticCurveTo(bx + bw / 2, by + 24, bx + bw, by + 6);
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(80,0,20,0.5)'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 3, by + 3); ctx.quadraticCurveTo(bx + bw / 2, by + 17, bx + bw - 3, by + 3);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    roundRect(ctx, bx + bw / 2 - 6, by + 15, 12, 8, 3);
    fs(ctx, lg(ctx, 0, by + 15, 0, by + 23, '#FFF0B8', GOLD, '#C8902C'), 1.5);
    gloss(ctx, bx + 12, by + 9, 7, 1.8, 0.6, -0.1);
    dot(ctx, bx + 2, by - 3, 2.2, '#FFE9A6', INK, 1);
    dot(ctx, bx + bw - 2, by - 3, 2.2, '#FFE9A6', INK, 1);
  };

  // pochette nacrée tenue dans la main droite de l'image
  B['bg-pearl-clutch'] = (ctx) => {
    ctx.save();
    ctx.translate(CX + 68, 354);
    ctx.rotate(0.12);
    roundRect(ctx, -25, -15, 50, 30, 9);
    fs(ctx, lg(ctx, -25, -15, 25, 15, '#FFFFFF', '#F2E8F4', '#D5C4E4', '#E8DCEE'), 2.3);
    clipArea(ctx, () => roundRect(ctx, -25, -15, 50, 30, 9), () => {
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(10, -20); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(190,150,220,0.3)';
      ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(26, -14); ctx.stroke();
    });
    // rang de perles sur le rebord
    for (let i = 0; i < 6; i++) {
      const x = -19 + i * 7.6;
      dot(ctx, x, -10, 2.8, '#FFFDF8', 'rgba(140,110,140,0.7)', 0.7);
      dot(ctx, x - 0.8, -11, 0.8, '#FFFFFF');
    }
    heartPath(ctx, 0, 5, 12);
    fs(ctx, lg(ctx, -6, -1, 6, 11, '#FFFFFF', '#E6D4F0'), 1.3, 'rgba(120,90,140,0.8)');
    gloss(ctx, -4, 3, 2, 1.2, 0.8, -0.5);
    ctx.restore();
  };
}

function clipArea(ctx: C, path: () => void, inner: () => void): void {
  ctx.save();
  path();
  ctx.clip();
  inner();
  ctx.restore();
}

// ================================================================ coiffures

/** Masse de cheveux derrière la tête et les épaules (silhouette contrôlée). */
function hairMass(ctx: C, L: number, wTop: number, wBot: number, belly: number, sway: number, tuck = 0): void {
  const right: Pt[] = [
    [102, 10], [wTop, 74], [(wTop + wBot) / 2 + sway * 0.1, (74 + L) / 2], [wBot + sway * 0.35 - tuck, L - 16 - belly * 0.3],
  ];
  const bottom: Pt[] = [[wBot - 22 + sway * 0.4 - tuck, L], [0, L + belly + sway * 0.1], [-(wBot - 22) + sway * 0.4 + tuck, L]];
  const left: Pt[] = right.map(([x, y]) => [-x + sway * 0.7 * (y > 100 ? 1 : 0) + 0, y] as Pt).reverse();
  P.smoothPath(ctx, [...right, ...bottom, ...left]);
  P.stroke(ctx, 4.8);
  P.smoothPath(ctx, [...right, ...bottom, ...left]);
  ctx.fillStyle = P.hairGrad(ctx, Math.max(L + 60, 300));
  ctx.fill();
  ctx.save();
  P.smoothPath(ctx, [...right, ...bottom, ...left]);
  ctx.clip();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20,10,5,0.28)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    P.curveThrough(ctx, [[s * 108, 30], [s * (wTop + 4), 90], [s * (wBot - 6), L - 30]]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Deux mèches de devant (de chaque côté du visage) + calotte à raie. */
function frontLocks(ctx: C, L: number, w0: number, w1: number, amp: number, waves: number, drift: number, sway: number, x0 = 86): void {
  const left = P.wavyLock(-1, x0, -50, L + 50, w0, w1, amp, waves, 0.2, drift, sway * 0.5);
  const right = P.wavyLock(1, x0, -50, (L + 50) * 0.92, w0 - 2, w1 - 2, amp, waves, 1.4, drift, sway * 0.5);
  for (const [lk, s] of [[left, -1], [right, 1]] as const) {
    P.lockShape(ctx, lk, Math.max(L + 80, 300), 2.2);
    P.lockDetail(ctx, lk, s);
  }
  hairCap(ctx);
}

function curlCircles(ctx: C, circles: [number, number, number][], strokeFirst = true): void {
  if (strokeFirst) {
    ctx.lineJoin = 'round';
    for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.lineWidth = 4.8; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  for (const [x, y, r] of circles) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = P.hairGrad(ctx, 330);
    ctx.fill();
  }
  // détails : boucle sombre + reflet clair dans chaque cercle
  for (const [x, y, r] of circles) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(30,15,8,0.4)';
    ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.1, r * 0.55, 0.5, Math.PI * 1.6); ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(235,170,115,0.3)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  }
}

function installHair(): void {
  const HB = EXTRA.hairBack;
  const HF = EXTRA.hairFront;

  // --- longs lisses, raie au milieu
  HB['hair-sleek-part'] = (ctx, sway) => {
    hairMass(ctx, 392, 108, 112, 6, sway);
    hairDome(ctx);
  };
  HF['hair-sleek-part'] = (ctx, sway) => frontLocks(ctx, 392, 44, 40, 0, 0, 14, sway);

  // --- mi-longs, flick aux pointes
  HB['hair-medium'] = (ctx, sway) => {
    hairMass(ctx, 226, 106, 114, 14, sway * 0.4);
    hairDome(ctx);
  };
  HF['hair-medium'] = (ctx, sway) => frontLocks(ctx, 222, 46, 42, 5, 1.1, 18, sway * 0.5);

  // --- carré au menton
  HB['hair-bob'] = (ctx, sway) => {
    hairMass(ctx, 112, 98, 84, 16, sway * 0.15, 0);
    hairDome(ctx);
  };
  HF['hair-bob'] = (ctx, sway) => frontLocks(ctx, 100, 40, 28, 0, 0, -14, sway * 0.2, 82);

  // --- tresse sur l'épaule (droite de l'image)
  HB['hair-braid'] = (ctx, sway) => {
    hairMass(ctx, 150, 104, 96, 8, 0, 6);
    hairDome(ctx);
    void sway;
  };
  HF['hair-braid'] = (ctx, sway) => {
    // mèche gauche discrète ramenée derrière l'oreille
    const lk = P.wavyLock(-1, 84, 0, 80, 14, 8, 3, 1, 1, 2, 0);
    P.lockShape(ctx, lk, 300, 1.8);
    hairCap(ctx);
    const sw = sway * 0.6;
    const path: Pt[] = [[70, 18], [92, 60], [96, 120 + sw * 0.2], [92, 190 + sw * 0.6], [90, 262 + sw], [88, 330 + sw * 1.4], [90, 372 + sw * 1.6]];
    // tresse = chevrons empilés le long d'une courbe
    const n = 17;
    const at = (t: number): Pt => {
      const f = t * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(f));
      const u = f - i;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u];
    };
    // fond
    ropeStrand(ctx, path, 40, 26);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const [x, y] = at(t);
      const wd = 20 - t * 7;
      for (const d of [-1, 1]) {
        ctx.save();
        ctx.translate(x + d * wd * 0.2, y);
        ctx.rotate(d * 0.42);
        ctx.beginPath();
        ctx.ellipse(0, 0, wd * 0.55, 11.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = P.hairGrad(ctx, 400);
        ctx.fill();
        P.stroke(ctx, 1.9);
        ctx.beginPath(); ctx.ellipse(-d * 2, -2, wd * 0.2, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(235,170,115,0.25)';
        ctx.fill();
        ctx.restore();
      }
    }
    // pointe + élastique
    const [ex, ey] = at(0.97);
    ctx.save();
    ctx.translate(ex, ey);
    roundRect(ctx, -12, -8, 24, 14, 6);
    fs(ctx, lg(ctx, -12, 0, 12, 0, '#FFB3CF', '#E8558F'), 2);
    ctx.restore();
    const tipPts: Pt[] = [[ex, ey + 6], [ex + 1, ey + 28], [ex, ey + 44]];
    ropeStrand(ctx, tipPts, 20, 10);
    // attache sur le haut
    const [sx, sy] = at(0.08);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.3);
    roundRect(ctx, -20, -5, 40, 9, 4);
    fs(ctx, lg(ctx, -20, 0, 20, 0, '#FFB3CF', '#E8558F'), 1.8);
    ctx.restore();
  };

  // --- longs bouclés, volumineux
  HB['hair-curly'] = (ctx, sway) => {
    const c: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const y = -30 + i * 36;
      const wob = 7 * Math.sin(i * 1.7);
      const ex = i === 0 ? 100 : 118 + wob + (i > 4 ? -4 : 0);
      c.push([-ex + sway * 0.08 * i, y, 38], [ex + sway * 0.08 * i, y, 38]);
    }
    for (let i = 0; i < 6; i++) c.push([-70 + i * 28, 90 + (i % 2) * 8, 40]);
    for (let i = 0; i < 5; i++) c.push([-60 + i * 30, 230 + (i % 2) * 14, 36]);
    for (const x of [-96, 96]) c.push([x, 280, 30]);
    c.push([-100, -50, 40], [100, -50, 40], [-60, -92, 38], [60, -92, 38], [0, -102, 40]);
    curlCircles(ctx, c);
  };
  HF['hair-curly'] = (ctx, sway) => {
    const chain = (s: -1 | 1, len: number): [number, number, number][] => {
      const out: [number, number, number][] = [];
      for (let i = 0; i < len; i++) {
        const y = -10 + i * 36;
        out.push([s * (94 + 8 * Math.sin(i * 1.9 + (s > 0 ? 1 : 0)) + i * 2 + sway * 0.06 * i), y, 27 - i * 0.6]);
      }
      return out;
    };
    curlCircles(ctx, [...chain(-1, 7), ...chain(1, 6)]);
    // volume au sommet : boucles posées sur la calotte
    const bumps: [number, number, number][] = [];
    for (let k = 0; k < 7; k++) {
      const a = (Math.PI * (28 + k * 20.7)) / 180;
      bumps.push([-Math.cos(a) * 97, -22 - Math.sin(a) * 92, 21]);
    }
    for (const [x, y, r] of bumps) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); }
    hairCap(ctx);
    curlCircles(ctx, bumps, false);
  };

  // --- deux chignons hauts de chaque côté
  const bun = (ctx: C, x: number, y: number, r: number, rot: number): void => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = P.hairGrad(ctx, 360);
    ctx.fill();
    P.stroke(ctx, 2.4);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,15,8,0.4)'; ctx.lineCap = 'round';
    for (let rr = 8; rr < r; rr += 8) { ctx.beginPath(); ctx.arc(x, y, rr, rot + rr * 0.05, rot + Math.PI * 1.55 + rr * 0.05); ctx.stroke(); }
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(235,170,115,0.3)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
  };
  HB['hair-space-buns'] = (ctx) => {
    hairDome(ctx);
    bun(ctx, -62, -116, 31, 0.2);
    bun(ctx, 62, -116, 31, 2.6);
  };
  HF['hair-space-buns'] = (ctx) => {
    for (const s of [-1, 1] as const) {
      const lk = P.wavyLock(s, 84, 6, 70, 12, 8, 3, 1, s, 2, 0);
      P.lockShape(ctx, lk, 300, 1.8);
    }
    hairCap(ctx);
    // petits liens roses à la base des chignons
    for (const s of [-1, 1] as const) {
      ctx.save();
      ctx.translate(s * 50, -100);
      ctx.rotate(s * -0.55);
      roundRect(ctx, -13, -4.5, 26, 9, 4.5);
      fs(ctx, lg(ctx, -13, 0, 13, 0, '#FFB3CF', '#E8558F'), 1.8);
      ctx.restore();
    }
  };

  // --- queue haute lisse et longue
  HB['hair-high-pony'] = (ctx, sway) => {
    hairDome(ctx);
    const pts: Pt[] = [[26, -116], [64, -146], [108, -124], [128, -50], [128, 40 + sway * 0.6], [122, 130 + sway * 1.2], [126, 214 + sway * 1.8], [122, 262 + sway * 2]];
    ropeStrand(ctx, pts, 46, 56);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(30,15,8,0.32)';
    for (const o of [-8, 9]) {
      ctx.beginPath();
      P.curveThrough(ctx, pts.slice(2, -1).map(([x, y]) => [x + o, y] as Pt));
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(235,170,115,0.28)';
    ctx.beginPath();
    P.curveThrough(ctx, pts.slice(2, -2).map(([x, y]) => [x - 3, y] as Pt));
    ctx.stroke();
    ctx.restore();
  };
  HF['hair-high-pony'] = (ctx) => {
    for (const s of [-1, 1] as const) {
      const lk = P.wavyLock(s, 84, 6, 70, 12, 8, 3, 1, s, 2, 0);
      P.lockShape(ctx, lk, 300, 1.8);
    }
    hairCap(ctx);
    // élastique rose à la naissance de la queue
    ctx.save();
    ctx.translate(30, -112);
    ctx.rotate(-0.85);
    roundRect(ctx, -9, -17, 18, 34, 7);
    fs(ctx, lg(ctx, -9, 0, 9, 0, '#FFB3CF', '#E8558F'), 2);
    gloss(ctx, -3, -8, 1.6, 5, 0.6, 0.1);
    ctx.restore();
  };
}

// ================================================================ bijoux de cou

function installNeck(): void {
  const N = EXTRA.neck;

  N['ac-chain-gold'] = (ctx) => {
    const pts: Pt[] = [[CX - 26, 160], [CX - 20, 182], [CX - 8, 200], [CX, 205], [CX + 8, 200], [CX + 20, 182], [CX + 26, 160]];
    line(ctx, pts, '#8A6420', 2.6);
    ctx.save();
    ctx.setLineDash([2.2, 1.6]);
    line(ctx, pts, '#FFE9A6', 1.6);
    ctx.restore();
    // pendentif : petite goutte avec gemme
    ctx.beginPath();
    ctx.moveTo(CX, 204); ctx.bezierCurveTo(CX + 7, 212, CX + 6, 222, CX, 226); ctx.bezierCurveTo(CX - 6, 222, CX - 7, 212, CX, 204);
    ctx.closePath();
    fs(ctx, lg(ctx, CX - 6, 204, CX + 6, 226, '#FFF0B8', GOLD, '#C8902C'), 1.5);
    dot(ctx, CX, 216, 2.6, '#FF75A8', INK, 0.9);
    gloss(ctx, CX - 1.2, 214.5, 0.9, 0.9, 0.9, 0);
  };

  N['ac-choker'] = (ctx) => {
    ctx.beginPath();
    ctx.moveTo(CX - 27, 157);
    ctx.bezierCurveTo(CX - 20, 176, CX + 20, 176, CX + 27, 157);
    ctx.lineTo(CX + 26, 166);
    ctx.bezierCurveTo(CX + 19, 186, CX - 19, 186, CX - 26, 166);
    ctx.closePath();
    fs(ctx, lg(ctx, CX - 27, 157, CX + 27, 184, '#4A3E4C', '#1C1520', '#0C0910'), 1.9);
    line(ctx, [[CX - 20, 168], [CX, 178], [CX + 20, 168]], 'rgba(255,255,255,0.22)', 1.4);
    // petit bijou central
    heartPath(ctx, CX, 184, 12);
    fs(ctx, lg(ctx, CX - 5, 178, CX + 5, 190, '#FFF0B8', GOLD, '#C8902C'), 1.4);
    dot(ctx, CX, 184, 1.9, '#FF75A8', INK, 0.7);
  };

  N['ac-pendant'] = (ctx) => {
    const pts: Pt[] = [[CX - 25, 158], [CX - 18, 186], [CX - 7, 204], [CX, 210], [CX + 7, 204], [CX + 18, 186], [CX + 25, 158]];
    line(ctx, pts, '#8A6420', 2.4);
    line(ctx, pts, '#FFE9A6', 1.2);
    heartPath(ctx, CX, 220, 20);
    fs(ctx, lg(ctx, CX - 10, 210, CX + 10, 232, '#FFB3D0', '#F0568E', '#C0264F'), 1.8);
    gloss(ctx, CX - 4, 216, 3, 1.6, 0.8, -0.6);
    dot(ctx, CX, 208, 1.8, GOLD, INK, 0.8);
  };
}

// ================================================================ visage

function inHead(ctx: C, fn: () => void): void {
  ctx.save();
  ctx.translate(P.HEAD_X, P.HEAD_Y);
  ctx.scale(P.HEAD_K, P.HEAD_K);
  fn();
  ctx.restore();
}

/** Point de l'arc de tête (ellipse centrée en (0,-12)) à l'angle `deg` ; rayons rx, ry. */
function arcPt(deg: number, rx: number, ry: number, off = 0): Pt {
  const a = (deg * Math.PI) / 180;
  const x = Math.cos(a) * (rx + off);
  const y = -12 - Math.sin(a) * (ry + off);
  return [x, y];
}

function bandPath(ctx: C, from: number, to: number, rx: number, ry: number, half: number): void {
  const n = 18;
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const d = from + ((to - from) * i) / n;
    outer.push(arcPt(d, rx, ry, half));
    inner.push(arcPt(d, rx, ry, -half));
  }
  P.smoothPath(ctx, [...outer, ...inner.reverse()]);
}

function patternFlowers(ctx: C, base: string, petal: string, centre: string, mode: 'flowers' | 'dots' | 'hearts'): void {
  void base;
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = 12 + i * 12.5;
    const [x, y] = arcPt(a, 94, 90);
    pts.push([x, y + ((i % 3) - 1) * 4]);
  }
  for (const [x, y] of pts) {
    if (mode === 'flowers') {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        dot(ctx, x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.4, petal);
      }
      dot(ctx, x, y, 1.7, centre);
    } else if (mode === 'dots') {
      dot(ctx, x, y, 3, petal);
    } else {
      heartPath(ctx, x, y, 8);
      ctx.fillStyle = petal;
      ctx.fill();
    }
  }
}

function bandana(ctx: C, c0: string, c1: string, petal: string, centre: string, mode: 'flowers' | 'dots' | 'hearts'): void {
  inHead(ctx, () => {
    const g = lg(ctx, -100, -100, 100, -30, shade(c0, 0.12), c0, c1);
    // tissu qui flotte derrière le noeud (gauche de l'image)
    const kx = -86, ky = -46;
    for (const [tx, ty, wd] of [[-112, 6, 13], [-90, 30, 12]] as const) {
      ctx.beginPath();
      ctx.moveTo(kx - 2, ky - 6);
      ctx.bezierCurveTo(kx - 20, ky + 2, tx - 6, ty - 22, tx - 4, ty);
      ctx.lineTo(tx + wd * 0.2, ty + 8);
      ctx.bezierCurveTo(tx + 8, ty - 22, kx + 8, ky + 10, kx + 6, ky + 2);
      ctx.closePath();
      fs(ctx, g, 2);
      clipArea(ctx, () => { ctx.beginPath(); ctx.moveTo(kx - 2, ky - 6); ctx.bezierCurveTo(kx - 20, ky + 2, tx - 6, ty - 22, tx - 4, ty); ctx.lineTo(tx + wd * 0.2, ty + 8); ctx.bezierCurveTo(tx + 8, ty - 22, kx + 8, ky + 10, kx + 6, ky + 2); ctx.closePath(); }, () => {
        dot(ctx, tx + 2, ty - 12, 2.2, petal); dot(ctx, tx - 1, ty - 4, 2, petal);
      });
    }
    // bande qui épouse le crâne
    bandPath(ctx, 8, 172, 95, 88, 15);
    fs(ctx, g, 2.4);
    clipArea(ctx, () => bandPath(ctx, 8, 172, 95, 88, 15), () => {
      patternFlowers(ctx, c0, petal, centre, mode);
      // bord plus foncé en bas + reflet
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(80,30,10,0.18)';
      const e: Pt[] = []; for (let d = 8; d <= 172; d += 12) e.push(arcPt(d, 95, 88, -12));
      ctx.beginPath(); P.curveThrough(ctx, e); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      const h: Pt[] = []; for (let d = 40; d <= 140; d += 12) h.push(arcPt(d, 95, 88, 6));
      ctx.beginPath(); P.curveThrough(ctx, h); ctx.stroke();
    });
    // noeud
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 8.5, 0, 0, Math.PI * 2);
    fs(ctx, lg(ctx, -10, -8, 10, 8, shade(c0, 0.2), c0, c1), 2.2);
    ctx.beginPath(); ctx.arc(-2, -1, 3, 0.3, Math.PI * 1.5);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(60,20,0,0.4)'; ctx.stroke();
    ctx.restore();
  });
}

function installHeadwear(): void {
  const F = EXTRA.face;

  F['hd-bandana-orange'] = (ctx) => bandana(ctx, '#FFA43C', '#E36A12', '#FFF4DC', '#7A3A10', 'flowers');
  F['hd-bandana-pink'] = (ctx) => bandana(ctx, '#FF9CC4', '#E8558F', '#FFFFFF', '#FFD34A', 'dots');

  F['hd-headband-velvet'] = (ctx) => inHead(ctx, () => {
    bandPath(ctx, 6, 174, 96, 90, 8);
    fs(ctx, lg(ctx, -90, -110, 90, -20, '#A8456B', '#7A2448', '#4E1230'), 2.4);
    clipArea(ctx, () => bandPath(ctx, 6, 174, 96, 90, 8), () => {
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,200,220,0.34)'; ctx.lineCap = 'round';
      const h: Pt[] = []; for (let d = 30; d <= 150; d += 12) h.push(arcPt(d, 96, 90, 2));
      ctx.beginPath(); P.curveThrough(ctx, h); ctx.stroke();
    });
    // petit noeud de velours sur le côté
    bow(ctx, -62, -86, 0.9, '#8E2F57', -0.7);
    dot(ctx, -62, -86, 2, GOLD, INK, 0.8);
  });

  F['hd-silk-blue'] = (ctx) => inHead(ctx, () => {
    const c0 = '#6C9BE8', c1 = '#2F57B8';
    const g = lg(ctx, -100, -100, 100, -20, '#A9C6F6', c0, c1);
    // pans noués en haut à droite de l'image
    const kx = 56, ky = -100;
    for (const [tx, ty, rot] of [[96, -78, 0], [86, -48, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.bezierCurveTo(kx + 18, ky - 14, tx + 8, ty - 22, tx + 6, ty);
      ctx.lineTo(tx - 4, ty + 6 + rot * 4);
      ctx.bezierCurveTo(tx - 8, ty - 10, kx + 16, ky + 8, kx + 4, ky + 6);
      ctx.closePath();
      fs(ctx, g, 2);
    }
    // bandeau
    bandPath(ctx, 12, 168, 94, 88, 10);
    fs(ctx, g, 2.2);
    clipArea(ctx, () => bandPath(ctx, 12, 168, 94, 88, 10), () => {
      for (let i = 0; i < 13; i++) { const [x, y] = arcPt(14 + i * 12.5, 94, 88); dot(ctx, x, y, 1.8, '#FFFFFF'); dot(ctx, x + 3, y - 2, 1, '#FFE9A6'); }
      ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      const h: Pt[] = []; for (let d = 40; d <= 150; d += 12) h.push(arcPt(d, 94, 88, 4));
      ctx.beginPath(); P.curveThrough(ctx, h); ctx.stroke();
    });
    // noeud avec deux boucles
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(-0.3);
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(d * 8, -16, d * 26, -14, d * 24, 0);
      ctx.bezierCurveTo(d * 26, 14, d * 8, 12, 0, 0);
      fs(ctx, lg(ctx, 0, -12, 0, 12, '#A9C6F6', c0, c1), 2);
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 6, 0, 0, Math.PI * 2);
    fs(ctx, c0, 2);
    gloss(ctx, -12, -4, 5, 1.6, 0.6, -0.3);
    ctx.restore();
  });

  F['hd-bow-pink'] = (ctx) => inHead(ctx, () => {
    ctx.save();
    ctx.translate(34, -116);
    ctx.rotate(0.28);
    const c = '#FF8DB8';
    // pans
    for (const [d, r] of [[-1, 0.28], [1, -0.2]] as const) {
      ctx.save();
      ctx.rotate(r * d);
      ctx.beginPath();
      ctx.moveTo(d * 3, 6); ctx.lineTo(d * 20, 44); ctx.lineTo(d * 12, 42); ctx.lineTo(d * 6, 50); ctx.lineTo(d * -2, 12); ctx.closePath();
      fs(ctx, lg(ctx, 0, 6, 0, 50, shade(c, 0.12), shade(c, -0.12)), 2);
      ctx.restore();
    }
    // boucles
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(d * 14, -34, d * 56, -34, d * 56, -2);
      ctx.bezierCurveTo(d * 56, 30, d * 16, 28, 0, 0);
      fs(ctx, lg(ctx, d * 4, -24, d * 50, 24, '#FFC2D8', c, '#E0558C'), 2.4);
      ctx.beginPath(); ctx.moveTo(d * 8, -2); ctx.quadraticCurveTo(d * 30, -20, d * 48, -4);
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(160,30,80,0.4)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(d * 8, 4); ctx.quadraticCurveTo(d * 28, 18, d * 46, 8);
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(160,30,80,0.3)'; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
    fs(ctx, lg(ctx, -8, -10, 8, 10, '#FFC2D8', c, '#E0558C'), 2.4);
    gloss(ctx, -26, -12, 9, 3, 0.65, -0.4);
    gloss(ctx, 26, -12, 8, 2.6, 0.5, 0.4);
    ctx.restore();
  });

  F['hd-beret'] = (ctx) => inHead(ctx, () => {
    const c0 = '#C24664', c1 = '#7E1F3A';
    const dome = (): void => {
      ctx.beginPath();
      ctx.moveTo(-100, -42);
      ctx.bezierCurveTo(-110, -90, -80, -122, -30, -132);
      ctx.bezierCurveTo(20, -142, 74, -134, 104, -104);
      ctx.bezierCurveTo(116, -86, 104, -66, 88, -62);
      ctx.bezierCurveTo(50, -76, 0, -90, -40, -86);
      ctx.bezierCurveTo(-70, -82, -92, -66, -100, -42);
      ctx.closePath();
    };
    dome();
    fs(ctx, lg(ctx, -100, -140, 104, -50, '#E2768E', c0, c1), 2.5);
    clipArea(ctx, dome, () => {
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(70,0,20,0.32)'; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(-6, -128);
        ctx.quadraticCurveTo(-60 + i * 22, -118 + i * 4, -96 + i * 31, -70 + (i % 2) * 6);
        ctx.stroke();
      }
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(-60, -112); ctx.quadraticCurveTo(-20, -130, 40, -126); ctx.stroke();
    });
    // bord (serre-tête interne)
    ctx.beginPath();
    ctx.moveTo(-100, -44); ctx.bezierCurveTo(-90, -66, -70, -82, -40, -86); ctx.bezierCurveTo(0, -90, 50, -76, 88, -62);
    ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#4A1024'; ctx.stroke();
    // petite queue
    ctx.beginPath(); ctx.ellipse(-4, -136, 5, 4.5, 0.2, 0, Math.PI * 2);
    fs(ctx, c1, 2);
  });

  F['hd-claw-clip'] = (ctx) => inHead(ctx, () => {
    ctx.save();
    ctx.translate(30, -112);
    ctx.rotate(0.45);
    // dos de la pince
    ctx.beginPath();
    ctx.moveTo(-40, 4); ctx.bezierCurveTo(-40, -24, 40, -24, 40, 4); ctx.lineTo(34, 8); ctx.bezierCurveTo(24, -10, -24, -10, -34, 8); ctx.closePath();
    fs(ctx, lg(ctx, -40, -22, 40, 8, '#F7DDB0', '#C8873A', '#7C4A1C'), 2.3);
    clipArea(ctx, () => { ctx.beginPath(); ctx.moveTo(-40, 4); ctx.bezierCurveTo(-40, -24, 40, -24, 40, 4); ctx.lineTo(34, 8); ctx.bezierCurveTo(24, -10, -24, -10, -34, 8); ctx.closePath(); }, () => {
      for (const [x, y, r] of [[-22, -8, 5], [-4, -13, 4], [14, -9, 5.5], [28, -3, 4]] as const) dot(ctx, x, y, r, 'rgba(70,30,10,0.45)');
    });
    gloss(ctx, -12, -15, 14, 1.8, 0.6, 0.05);
    // dents
    for (let i = 0; i < 7; i++) {
      const x = -32 + i * 10.7;
      ctx.beginPath();
      ctx.moveTo(x - 4, 6); ctx.lineTo(x + 4, 6); ctx.lineTo(x + 2, 17); ctx.lineTo(x - 2, 17); ctx.closePath();
      fs(ctx, lg(ctx, x - 4, 6, x + 4, 17, '#E8B878', '#B87A34'), 1.6);
    }
    ctx.restore();
  });

  F['hd-pearl-pins'] = (ctx) => inHead(ctx, () => {
    const pins: [number, number, number][] = [[12, -104, 0.1], [34, -100, 0.0], [54, -92, -0.3], [70, -76, -0.6], [80, -56, -0.9], [44, -112, 0.3]];
    for (const [x, y] of pins) {
      line(ctx, [[x - 4, y + 9], [x - 14, y + 26]], INK, 3.4, false);
      line(ctx, [[x - 4, y + 9], [x - 14, y + 26]], '#E6B84E', 1.8, false);
    }
    for (const [x, y] of pins) {
      dot(ctx, x, y, 8, '#FFFDF6', 'rgba(120,100,80,0.85)', 1.6);
      dot(ctx, x - 2.4, y - 2.6, 2.6, '#FFFFFF');
      dot(ctx, x + 2.5, y + 2.5, 1.8, 'rgba(210,190,230,0.55)');
    }
  });
}

// ---------------------------------------------------------------- lunettes

function lensShape(ctx: C, s: number, kind: string): void {
  ctx.beginPath();
  if (kind === 'aviator') {
    ctx.moveTo(s * 10, -2);
    ctx.bezierCurveTo(s * 12, -12, s * 44, -12, s * 66, -6);
    ctx.bezierCurveTo(s * 70, 12, s * 62, 32, s * 44, 40);
    ctx.bezierCurveTo(s * 26, 44, s * 10, 28, s * 10, -2);
  } else if (kind === 'cat') {
    ctx.moveTo(s * 11, 6);
    ctx.bezierCurveTo(s * 12, -2, s * 30, -6, s * 48, -10);
    ctx.bezierCurveTo(s * 58, -14, s * 68, -22, s * 74, -20);
    ctx.bezierCurveTo(s * 72, 4, s * 68, 24, s * 52, 32);
    ctx.bezierCurveTo(s * 34, 38, s * 12, 30, s * 11, 6);
  } else if (kind === 'heart') {
    heartPath(ctx, s * 38, 14, 56);
    return;
  } else {
    const r = kind === 'clear' ? 27 : 24;
    ctx.arc(s * 37, 16, r, 0, Math.PI * 2);
  }
  ctx.closePath();
}

function glasses(ctx: C, kind: 'aviator' | 'round' | 'cat' | 'heart' | 'clear'): void {
  inHead(ctx, () => {
    const cfg = {
      aviator: { frame: '#E6B84E', dark: '#7C5A18', w: 3, lens0: 'rgba(110,140,110,0.55)', lens1: 'rgba(40,50,40,0.72)', hi: 'rgba(255,255,255,0.5)' },
      round: { frame: '#F2C95C', dark: '#7C5A18', w: 3.2, lens0: 'rgba(255,225,150,0.2)', lens1: 'rgba(255,200,120,0.34)', hi: 'rgba(255,255,255,0.6)' },
      cat: { frame: '#2E1A28', dark: '#12080F', w: 5.4, lens0: 'rgba(120,70,100,0.45)', lens1: 'rgba(40,18,40,0.62)', hi: 'rgba(255,255,255,0.45)' },
      heart: { frame: '#FF5C9E', dark: '#9C1F58', w: 4.4, lens0: 'rgba(255,170,205,0.55)', lens1: 'rgba(230,80,140,0.65)', hi: 'rgba(255,255,255,0.7)' },
      clear: { frame: '#FFFFFF', dark: '#6E6A80', w: 4.4, lens0: 'rgba(210,235,255,0.28)', lens1: 'rgba(170,205,245,0.4)', hi: 'rgba(255,255,255,0.8)' },
    }[kind];
    const shape = kind === 'round' ? 'round' : kind === 'clear' ? 'clear' : kind;
    // branches
    for (const s of [-1, 1]) line(ctx, [[s * 68, kind === 'cat' ? -14 : -2], [s * 84, kind === 'cat' ? -12 : 0]], cfg.dark, cfg.w + 2.4, false);
    for (const s of [-1, 1]) line(ctx, [[s * 68, kind === 'cat' ? -14 : -2], [s * 84, kind === 'cat' ? -12 : 0]], cfg.frame, cfg.w, false);
    for (const s of [-1, 1]) {
      lensShape(ctx, s, shape);
      ctx.fillStyle = lg(ctx, s * 10, -10, s * 60, 40, cfg.lens0, cfg.lens1);
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = cfg.w + 2.4; ctx.strokeStyle = cfg.dark; ctx.stroke();
      ctx.lineWidth = cfg.w; ctx.strokeStyle = cfg.frame; ctx.stroke();
      // reflet sur la vitre
      ctx.beginPath(); ctx.moveTo(s * 20, 2); ctx.lineTo(s * 34, -3);
      ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.strokeStyle = cfg.hi; ctx.stroke();
      if (kind === 'cat') { dot(ctx, s * 70, -17, 2.4, '#FFE9A6', INK, 0.8); }
      if (kind === 'clear') {
        ctx.beginPath(); ctx.arc(s * 37, 16, 27 - 2.5, Math.PI * 1.05, Math.PI * 1.5);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      }
    }
    // pont
    if (kind === 'aviator') {
      line(ctx, [[-10, -2], [0, -8], [10, -2]], cfg.dark, cfg.w + 2, true);
      line(ctx, [[-10, -2], [0, -8], [10, -2]], cfg.frame, cfg.w - 0.4, true);
      line(ctx, [[-11, 8], [0, 3], [11, 8]], cfg.dark, 3.4, true);
      line(ctx, [[-11, 8], [0, 3], [11, 8]], cfg.frame, 1.6, true);
    } else {
      const y = kind === 'heart' ? 8 : kind === 'cat' ? 6 : 6;
      const x = kind === 'heart' ? 12 : kind === 'cat' ? 11 : kind === 'clear' ? 10 : 13;
      line(ctx, [[-x, y], [0, y - 7], [x, y]], cfg.dark, cfg.w + 2, true);
      line(ctx, [[-x, y], [0, y - 7], [x, y]], cfg.frame, cfg.w - 0.4, true);
    }
  });
}

function installGlasses(): void {
  const F = EXTRA.face;
  F['gl-aviator'] = (ctx) => glasses(ctx, 'aviator');
  F['gl-round-gold'] = (ctx) => glasses(ctx, 'round');
  F['gl-cat-eye'] = (ctx) => glasses(ctx, 'cat');
  F['gl-heart-pink'] = (ctx) => glasses(ctx, 'heart');
  F['gl-clear-round'] = (ctx) => glasses(ctx, 'clear');
}

// ---------------------------------------------------------------- boucles d'oreilles

function installEarrings(): void {
  const F = EXTRA.face;

  F['ea-pearl-studs'] = (ctx) => inHead(ctx, () => {
    for (const s of [-1, 1]) {
      dot(ctx, s * 72, 55, 6.2, '#FFFDF6', 'rgba(120,100,80,0.85)', 1.5);
      dot(ctx, s * 72 - 1.8, 53, 1.9, '#FFFFFF');
      dot(ctx, s * 72 + 2, 57, 1.5, 'rgba(210,190,230,0.55)');
    }
  });

  F['ea-drop-gold'] = (ctx) => inHead(ctx, () => {
    for (const s of [-1, 1]) {
      const x = s * 72;
      dot(ctx, x, 52, 3.4, GOLD, INK, 1.2);
      line(ctx, [[x, 54], [x, 66]], '#C8902C', 2.2, false);
      ctx.beginPath();
      ctx.moveTo(x, 64); ctx.bezierCurveTo(x + 11, 78, x + 9, 94, x, 98); ctx.bezierCurveTo(x - 9, 94, x - 11, 78, x, 64);
      ctx.closePath();
      fs(ctx, lg(ctx, x - 8, 64, x + 8, 98, '#FFF4C8', GOLD, '#C8902C'), 1.8, '#6A4418');
      dot(ctx, x, 84, 3, '#FF75A8', '#6A4418', 1);
      gloss(ctx, x - 3, 76, 1.6, 4, 0.7, 0.2);
    }
  });

  const hoop = (ctx: C, r: number, cy: number, w: number, c0: string, c1: string, c2: string, dark: string): void => {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * 71, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = w + 2.6; ctx.strokeStyle = dark; ctx.stroke();
      ctx.lineWidth = w; ctx.strokeStyle = lg(ctx, s * (71 - r), cy - r, s * (71 + r), cy + r, c0, c1, c2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 71, cy, r, Math.PI * 1.1, Math.PI * 1.45);
      ctx.lineWidth = Math.max(1, w * 0.3); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke();
    }
  };
  F['ea-hoops-silver'] = (ctx) => inHead(ctx, () => hoop(ctx, 13, 48, 4.2, '#FFFFFF', '#C8CEDA', '#8C95AA', '#4A5068'));
  F['ea-big-hoops'] = (ctx) => inHead(ctx, () => hoop(ctx, 24, 70, 5, '#FFF0B8', GOLD, '#D9A238', '#8A6420'));

  F['ea-hearts'] = (ctx) => inHead(ctx, () => {
    for (const s of [-1, 1]) {
      const x = s * 72;
      dot(ctx, x, 52, 3, GOLD, INK, 1.1);
      line(ctx, [[x, 54], [x, 64]], '#C8902C', 2, false);
      heartPath(ctx, x, 77, 28);
      fs(ctx, lg(ctx, x - 10, 64, x + 10, 86, '#FFB3D0', '#F0568E', '#C0264F'), 1.9);
      gloss(ctx, x - 3.4, 71, 2.6, 1.5, 0.8, -0.6);
    }
  });

  F['ea-stars'] = (ctx) => inHead(ctx, () => {
    for (const s of [-1, 1]) {
      const x = s * 72;
      dot(ctx, x, 51, 2.8, GOLD, INK, 1);
      line(ctx, [[x, 53], [x, 64]], '#C8902C', 2, false);
      starPath(ctx, x, 77, 14.5, 6.4);
      fs(ctx, lg(ctx, x - 10, 64, x + 10, 88, '#FFF8D0', '#FFD84A', '#E0A030'), 1.9, '#6A4418');
      gloss(ctx, x - 2.6, 72, 1.8, 1.2, 0.85, -0.5);
      starPath(ctx, x + s * 1, 96, 5.2, 2.4);
      fs(ctx, '#FFE9A6', 1.4, '#6A4418');
      line(ctx, [[x, 87], [x, 92]], '#C8902C', 1.4, false);
    }
  });
}

// ================================================================ installation

export function installStyle(): void {
  installShoes();
  installBags();
  installHair();
  installNeck();
  installHeadwear();
  installGlasses();
  installEarrings();
  installWrist();
  installNecklace();
}
