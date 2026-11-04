/**
 * Dessins du module « carrières » : icônes rondes des 4 carrières, couvertures
 * des 5 magazines fictifs, décors de séance photo, podium et scène.
 * Signatures publiques figées :
 *   drawMagazine(ctx, id, w, h, look?)  couverture complète (avec l'avatar de Radia)
 *   drawCareerIcon(ctx, id, size)       icône ronde d'une carrière
 */
import type { CareerId, Look, MagazineId } from '../../../data/world/ids';
import { MAGAZINES } from '../../../data/world/careers';
import { PAL, OUTLINE, fillShaded, gloss, glow, groundShadow, heartPath, roundRect, rgba, seeded, shade, sparkle, starPath } from '../kit';
import { drawAvatar } from './avatar';
import { currentLook } from '../../world/look';

const FONT = "'Fredoka','Avenir Next','Trebuchet MS',system-ui,sans-serif";
const SCRIPT = "'Dancing Script','Snell Roundhand',cursive";

// ------------------------------------------------------------------ icônes
const CAREER_COLORS: Record<CareerId, [string, string]> = {
  photo: ['#F5B5C8', '#E8558F'], model: ['#B9A5E8', '#7A66B8'], actress: ['#FFC0A3', '#E08A5E'], singer: ['#FFD98A', '#D9A43C'],
};

/** Icône ronde d'une carrière (badge dégradé + pictogramme dessiné). */
export function drawCareerIcon(ctx: CanvasRenderingContext2D, id: CareerId, size: number): void {
  const s = size / 100;
  const [c1, c2] = CAREER_COLORS[id] ?? CAREER_COLORS.photo;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // badge
  ctx.beginPath(); ctx.arc(50, 50, 45, 0, Math.PI * 2);
  fillShaded(ctx, c1, { x: 5, y: 5, w: 90, h: 90 }, 3.2, { light: 0.4, dark: 0.12 });
  ctx.beginPath(); ctx.arc(50, 50, 38, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  gloss(ctx, 33, 24, 16, 7, 0.55);
  const lw = 3.2;
  ctx.lineWidth = lw; ctx.strokeStyle = OUTLINE;
  if (id === 'photo') {
    // appareil photo
    roundRect(ctx, 22, 36, 56, 36, 8); fillShaded(ctx, '#FFF4E8', { x: 22, y: 36, w: 56, h: 36 }, lw);
    roundRect(ctx, 34, 29, 18, 10, 3); fillShaded(ctx, c2, { x: 34, y: 29, w: 18, h: 10 }, lw);
    ctx.beginPath(); ctx.arc(50, 54, 12.5, 0, Math.PI * 2); fillShaded(ctx, PAL.nuit, { x: 37, y: 41, w: 26, h: 26 }, lw);
    ctx.beginPath(); ctx.arc(50, 54, 6.5, 0, Math.PI * 2); fillShaded(ctx, PAL.lavande, { x: 43, y: 47, w: 14, h: 14 }, 0, { outline: null });
    gloss(ctx, 46.5, 50.5, 2.6, 1.8, 0.9);
    ctx.beginPath(); ctx.arc(69, 43.5, 2.4, 0, Math.PI * 2); ctx.fillStyle = c2; ctx.fill();
    sparkle(ctx, 76, 26, 7, '#fff');
  } else if (id === 'model') {
    // robe + étoile
    ctx.beginPath();
    ctx.moveTo(42, 24); ctx.lineTo(58, 24); ctx.lineTo(57, 40); ctx.quadraticCurveTo(66, 52, 76, 76); ctx.quadraticCurveTo(50, 84, 24, 76); ctx.quadraticCurveTo(34, 52, 43, 40); ctx.closePath();
    fillShaded(ctx, '#FFF4E8', { x: 24, y: 24, w: 52, h: 60 }, lw);
    ctx.beginPath(); ctx.moveTo(43, 40); ctx.quadraticCurveTo(50, 46, 57, 40); ctx.lineTo(57, 47); ctx.quadraticCurveTo(50, 53, 43, 47); ctx.closePath();
    fillShaded(ctx, c2, { x: 43, y: 40, w: 14, h: 13 }, 2.4);
    ctx.beginPath(); ctx.moveTo(40, 66); ctx.quadraticCurveTo(50, 72, 60, 66); ctx.strokeStyle = c1; ctx.lineWidth = 2.4; ctx.stroke();
    starPath(ctx, 72, 30, 9, 4); fillShaded(ctx, PAL.or, { x: 63, y: 21, w: 18, h: 18 }, 2.6);
  } else if (id === 'actress') {
    // claquette
    ctx.save(); ctx.translate(50, 54); ctx.rotate(-0.06);
    roundRect(ctx, -29, -8, 58, 34, 5); fillShaded(ctx, '#FFF4E8', { x: -29, y: -8, w: 58, h: 34 }, lw);
    ctx.restore();
    ctx.save(); ctx.translate(50, 54); ctx.rotate(-0.28); ctx.translate(-29, -22);
    roundRect(ctx, 0, 0, 58, 13, 4); fillShaded(ctx, PAL.nuit, { x: 0, y: 0, w: 58, h: 13 }, lw);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 14, 1.6); ctx.lineTo(14 + i * 14, 1.6); ctx.lineTo(10 + i * 14, 11.4); ctx.lineTo(2 + i * 14, 11.4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    heartPath(ctx, 50, 56, 17); fillShaded(ctx, c2, { x: 41, y: 47, w: 18, h: 18 }, 2.4);
    sparkle(ctx, 76, 28, 7, '#fff');
  } else {
    // micro
    ctx.save(); ctx.translate(50, 50); ctx.rotate(0.5);
    roundRect(ctx, -5.5, 2, 11, 36, 5); fillShaded(ctx, PAL.nuit, { x: -5.5, y: 2, w: 11, h: 36 }, lw);
    ctx.beginPath(); ctx.arc(0, -12, 14, 0, Math.PI * 2); fillShaded(ctx, '#FFF4E8', { x: -14, y: -26, w: 28, h: 28 }, lw);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.moveTo(-9, -21); ctx.lineTo(9, -21); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.stroke();
    gloss(ctx, -5, -18, 4, 2.4, 0.9);
    ctx.restore();
    ctx.fillStyle = PAL.nuit;
    for (const [x, y, r] of [[73, 30, 3.6], [80, 42, 2.6]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke(); }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ texte
interface TxtOpts { size: number; font?: string; weight?: number; fill: string; stroke?: string; sw?: number; align?: CanvasTextAlign; spacing?: number; maxW?: number }
function txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TxtOpts): number {
  ctx.save();
  let size = o.size;
  const set = () => { ctx.font = `${o.weight ?? 700} ${size}px ${o.font ?? FONT}`; };
  set();
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (o.spacing !== undefined && 'letterSpacing' in ctx) anyCtx.letterSpacing = `${o.spacing}px`;
  if (o.maxW) { for (let i = 0; i < 12 && ctx.measureText(s).width > o.maxW; i++) { size *= 0.93; set(); } }
  const w = ctx.measureText(s).width;
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if (o.stroke) { ctx.lineWidth = o.sw ?? size * 0.14; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.fill; ctx.fillText(s, x, y);
  ctx.restore();
  return w;
}

// ------------------------------------------------------------------ couvertures
/** Fond et motifs de chaque magazine (repère 300 × 400). */
function magBackground(ctx: CanvasRenderingContext2D, id: MagazineId): void {
  const m = MAGAZINES[id];
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, m.bg[0]); g.addColorStop(1, m.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 300, 400);
  const r = seeded(id.length * 977 + id.charCodeAt(2));
  ctx.save();
  if (id === 'radia-mag') {
    for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba('#FFFFFF', 0.25 + r() * 0.25); heartPath(ctx, r() * 300, 60 + r() * 330, 10 + r() * 16); ctx.fill(); }
    glow(ctx, 150, 210, 170, '#FFFFFF', 0.55);
  } else if (id === 'queen-paris') {
    // lignes art déco + étoiles dorées
    ctx.strokeStyle = rgba(m.accent, 0.35); ctx.lineWidth = 1.4;
    for (let i = -6; i < 12; i++) { ctx.beginPath(); ctx.moveTo(150 + i * 32, 400); ctx.lineTo(150 + i * 8, 90); ctx.stroke(); }
    for (let i = 0; i < 22; i++) sparkle(ctx, r() * 300, 80 + r() * 300, 3 + r() * 5, m.accent, 0.8);
    glow(ctx, 150, 230, 150, '#FFFFFF', 0.25);
  } else if (id === 'radia-show') {
    // rayons de projecteur
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = rgba('#FFFFFF', i % 2 ? 0.18 : 0.08);
      ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(-60 + i * 55, 400); ctx.lineTo(-20 + i * 55, 400); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 20; i++) { ctx.fillStyle = rgba(r() < 0.5 ? '#E8558F' : '#FFFFFF', 0.5); starPath(ctx, r() * 300, 70 + r() * 320, 4 + r() * 5, 2, 5); ctx.fill(); }
  } else if (id === 'radia-fashion') {
    // arches élégantes + points
    ctx.strokeStyle = rgba(m.accent, 0.4); ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(150, 400, 80 + i * 44, Math.PI, 0); ctx.stroke(); }
    ctx.fillStyle = rgba(m.accent, 0.25);
    for (let y = 80; y < 400; y += 26) for (let x = (y / 26) % 2 ? 12 : 0; x < 310; x += 26) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // rayons royaux + couronne en filigrane + étoiles
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.fillStyle = rgba(m.accent, i % 2 ? 0.16 : 0.06);
      ctx.beginPath(); ctx.moveTo(150, 220); ctx.lineTo(150 + Math.cos(a - 0.1) * 420, 220 + Math.sin(a - 0.1) * 420); ctx.lineTo(150 + Math.cos(a + 0.1) * 420, 220 + Math.sin(a + 0.1) * 420); ctx.closePath(); ctx.fill();
    }
    glow(ctx, 150, 200, 160, m.accent, 0.35);
    for (let i = 0; i < 24; i++) sparkle(ctx, r() * 300, 80 + r() * 320, 3 + r() * 6, '#FFFFFF', 0.85);
  }
  ctx.restore();
}

function masthead(ctx: CanvasRenderingContext2D, id: MagazineId): void {
  const m = MAGAZINES[id];
  const light = m.ink === '#FFF4E8' || m.ink === '#FFF9EE';
  const edge = light ? PAL.nuit2 : '#FFFFFF';
  if (id === 'radia-mag') {
    txt(ctx, 'RADIA', 150, 62, { size: 66, fill: m.accent, stroke: '#FFFFFF', sw: 9, align: 'center', spacing: 4, maxW: 270 });
    txt(ctx, 'RADIA', 150, 62, { size: 66, fill: m.accent, stroke: OUTLINE, sw: 2.2, align: 'center', spacing: 4, maxW: 270 });
    txt(ctx, 'Magazine', 214, 86, { size: 22, font: SCRIPT, fill: m.ink, align: 'center' });
  } else if (id === 'queen-paris') {
    txt(ctx, 'Queen', 150, 46, { size: 46, fill: m.accent, stroke: PAL.nuit2, sw: 7, align: 'center', spacing: 3 });
    txt(ctx, 'of Paris', 150, 78, { size: 34, font: SCRIPT, fill: '#FFFFFF', stroke: PAL.nuit2, sw: 6, align: 'center' });
  } else if (id === 'radia-show') {
    txt(ctx, 'THE', 52, 30, { size: 17, fill: m.accent, stroke: '#fff', sw: 4, align: 'center' });
    txt(ctx, 'RADIA', 150, 66, { size: 58, fill: m.accent, stroke: '#FFFFFF', sw: 9, align: 'center', maxW: 270 });
    txt(ctx, 'RADIA', 150, 66, { size: 58, fill: m.accent, stroke: OUTLINE, sw: 2.2, align: 'center', maxW: 270 });
    txt(ctx, 'Show', 214, 90, { size: 30, font: SCRIPT, fill: PAL.nuit, stroke: '#fff', sw: 5, align: 'center' });
  } else if (id === 'radia-fashion') {
    txt(ctx, 'RADIA', 150, 54, { size: 50, weight: 500, fill: m.ink, align: 'center', spacing: 14, maxW: 280 });
    txt(ctx, 'FASHION', 150, 78, { size: 24, weight: 600, fill: m.accent, align: 'center', spacing: 12, maxW: 260 });
    ctx.fillStyle = m.accent; ctx.fillRect(40, 63, 28, 2); ctx.fillRect(232, 63, 28, 2);
  } else {
    txt(ctx, 'STAR', 150, 44, { size: 44, fill: m.accent, stroke: PAL.nuit2, sw: 7, align: 'center', spacing: 8 });
    txt(ctx, 'du Royaume', 150, 78, { size: 38, font: SCRIPT, fill: '#FFFFFF', stroke: PAL.nuit2, sw: 6, align: 'center' });
  }
  void edge;
}

/**
 * Couverture complète d'un magazine fictif (repère 300 × 400, ajusté à w × h).
 * `look` : tenue portée par Radia (par défaut celle de la sauvegarde).
 */
export function drawMagazine(ctx: CanvasRenderingContext2D, id: MagazineId, w: number, h: number, look?: Look): void {
  const m = MAGAZINES[id];
  if (!m) { ctx.fillStyle = PAL.rose; ctx.fillRect(0, 0, w, h); return; }
  const k = Math.min(w / 300, h / 400);
  ctx.save();
  ctx.translate((w - 300 * k) / 2, (h - 400 * k) / 2);
  ctx.scale(k, k);
  ctx.beginPath(); ctx.rect(0, 0, 300, 400); ctx.clip();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  magBackground(ctx, id);

  // Radia, cadrée à mi-cuisse
  ctx.save();
  ctx.translate(150 - 112 + (id === 'radia-fashion' ? 0 : 6), 78);
  drawAvatar(ctx, look ?? currentLook(), 224, 560, { expr: 'smile', arms: id === 'radia-show' ? 'wave' : id === 'star-royaume' ? 'open' : 'down' });
  ctx.restore();

  masthead(ctx, id);

  // bandeau (ruban) : numéro / édition
  ctx.save();
  ctx.translate(0, 0);
  roundRect(ctx, -6, 100, 112, 22, 4);
  ctx.fillStyle = m.accent; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  txt(ctx, m.issue, 6, 116, { size: 12.5, fill: id === 'queen-paris' || id === 'star-royaume' ? PAL.nuit2 : '#FFFFFF', maxW: 98 });
  ctx.restore();

  // accroches fictives (à gauche, lisibles)
  const hy = [158, 204, 250];
  m.heads.forEach((t, i) => {
    ctx.save();
    ctx.translate(10, hy[i]);
    const wbox = 106;
    roundRect(ctx, 0, 0, wbox, 40, 9); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
    // retour à la ligne simple
    const words = t.split(' ');
    const lines: string[] = ['']; ctx.font = `600 10.5px ${FONT}`;
    for (const wd of words) { const cand = (lines[lines.length - 1] + ' ' + wd).trim(); if (ctx.measureText(cand).width > wbox - 12 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = cand; }
    lines.slice(0, 3).forEach((ln, j) => txt(ctx, ln, 7, 14 + j * 12, { size: 10.5, weight: 600, fill: j === 0 ? m.accent === '#F3C86B' ? PAL.orDeep : shade(m.accent, -0.25) : PAL.choco }));
    ctx.restore();
  });

  // slogan en bas + code-barres fictif + mention
  roundRect(ctx, 0, 360, 300, 40, 0);
  ctx.fillStyle = rgba(PAL.nuit2, 0.82); ctx.fill();
  txt(ctx, m.slogan, 12, 384, { size: 17, font: SCRIPT, fill: '#FFF4E8', maxW: 170 });
  roundRect(ctx, 218, 340, 74, 52, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = OUTLINE;
  const rr = seeded(id.length * 31);
  for (let x = 224; x < 284; x += 3) ctx.fillRect(x, 346, rr() < 0.4 ? 1 : 2, 24);
  txt(ctx, 'ÉDITION SPÉCIALE ♡', 255, 384, { size: 7.4, weight: 600, fill: PAL.choco, align: 'center' });
  // étincelles
  sparkle(ctx, 268, 118, 9, '#FFFFFF'); sparkle(ctx, 252, 136, 5, m.accent);
  ctx.restore();
}

// ------------------------------------------------------------------ décors de jeu
/** Décor de séance photo (repère w × h). */
export function drawPhotoDecor(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, t = 0): void {
  const r = seeded(id.length * 211 + 5);
  ctx.save();
  if (id === 'garden') {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#DDF1FF'); g.addColorStop(0.55, '#F7E9F3'); g.addColorStop(1, '#B5CDB0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9CC29A'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.98, w * 0.9, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 30; i++) {
      const x = r() * w, y = h * (0.62 + r() * 0.36), s = 6 + r() * 8;
      ctx.fillStyle = ['#F5B5C8', '#FFF4E8', '#B9A5E8', '#FFC0A3'][i % 4]; heartPath(ctx, x, y, s * 1.6); ctx.fill();
      ctx.fillStyle = PAL.or; ctx.beginPath(); ctx.arc(x, y + 1, s * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#E8D5BC'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.52, w * 0.36, Math.PI, 0); ctx.stroke();
  } else if (id === 'city') {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFD9E5'); g.addColorStop(0.6, '#FFE9D6'); g.addColorStop(1, '#D9CDF5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const bw = w / 6, bx = i * bw - 6, bh = h * (0.32 + r() * 0.3);
      ctx.fillStyle = ['#E8D5BC', '#F3E1CF', '#D9C3C0', '#EBDDF5'][i % 4]; ctx.fillRect(bx, h * 0.82 - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let yy = h * 0.82 - bh + 10; yy < h * 0.8; yy += 22) for (let xx = bx + 8; xx < bx + bw - 10; xx += 18) ctx.fillRect(xx, yy, 8, 11);
    }
    // tour fictive
    ctx.strokeStyle = shade('#58433F', 0.2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.78, h * 0.82); ctx.lineTo(w * 0.85, h * 0.2); ctx.lineTo(w * 0.92, h * 0.82); ctx.moveTo(w * 0.8, h * 0.6); ctx.lineTo(w * 0.9, h * 0.6); ctx.stroke();
    ctx.fillStyle = '#C9B9A8'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
  } else if (id === 'stage') {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3B3152'); g.addColorStop(1, '#6b5a8c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = w * (0.15 + i * 0.23) + Math.sin(t * 1.2 + i) * 14;
      ctx.fillStyle = rgba(['#F5B5C8', '#F3C86B', '#B9A5E8', '#A9D4F5'][i], 0.22);
      ctx.beginPath(); ctx.moveTo(w * (0.15 + i * 0.23), 0); ctx.lineTo(x - 50, h * 0.9); ctx.lineTo(x + 50, h * 0.9); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#58433F'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = '#7A66B8'; ctx.fillRect(0, h * 0.86, w, 4);
    for (let i = 0; i < 22; i++) sparkle(ctx, r() * w, r() * h * 0.7, 2 + r() * 4, '#FFFFFF', 0.4 + 0.4 * Math.sin(t * 3 + i));
  } else {
    // salon du palais
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFF4E8'); g.addColorStop(1, '#F0D8C8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#C4407A'; ctx.fillRect(0, 0, w * 0.12, h); ctx.fillRect(w * 0.88, 0, w * 0.12, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 3; i++) { ctx.fillRect(w * (0.2 + i * 0.22), h * 0.1, w * 0.12, h * 0.55); }
    ctx.strokeStyle = PAL.or; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.strokeRect(w * (0.2 + i * 0.22), h * 0.1, w * 0.12, h * 0.55); }
    glow(ctx, w * 0.5, h * 0.08, w * 0.4, PAL.or, 0.5);
    ctx.fillStyle = '#E8CFA9'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = '#C4407A'; ctx.fillRect(w * 0.3, h * 0.86, w * 0.4, h * 0.14);
  }
  ctx.restore();
}

/** Podium de défilé vu de face : projecteurs, tapis, bordure lumineuse. */
export function drawRunway(ctx: CanvasRenderingContext2D, w: number, h: number, t = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2c2440'); g.addColorStop(0.7, '#51446D'); g.addColorStop(1, '#8E7BC4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // faisceaux
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.2);
    const sway = Math.sin(t * 0.9 + i * 1.3) * 18;
    ctx.fillStyle = rgba(i % 2 ? '#F5B5C8' : '#FFF4E8', 0.16);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 46 + sway, h * 0.88); ctx.lineTo(x + 46 + sway, h * 0.88); ctx.closePath(); ctx.fill();
  }
  // podium en perspective
  const y0 = h * 0.64;
  ctx.fillStyle = '#FFF4E8';
  ctx.beginPath(); ctx.moveTo(w * 0.3, y0); ctx.lineTo(w * 0.7, y0); ctx.lineTo(w * 0.98, h); ctx.lineTo(w * 0.02, h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PAL.or; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = 'rgba(88,67,63,0.12)'; ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { const yy = y0 + (h - y0) * (i / 5) ** 1.5; ctx.beginPath(); ctx.moveTo(w * (0.3 - 0.28 * (yy - y0) / (h - y0)), yy); ctx.lineTo(w * (0.7 + 0.28 * (yy - y0) / (h - y0)), yy); ctx.stroke(); }
  // guirlande lumineuse du fond
  for (let i = 0; i < 14; i++) { const x = (i + 0.5) * (w / 14); const on = 0.55 + 0.45 * Math.sin(t * 4 + i); glow(ctx, x, h * 0.08 + Math.sin(i * 0.9) * 6, 16, '#FFD98A', 0.7 * on); }
  // photographes : flashs
  const f = Math.floor(t * 3);
  for (let i = 0; i < 3; i++) if ((f + i) % 5 === 0) glow(ctx, w * (0.08 + i * 0.42), h * 0.7, 40, '#FFFFFF', 0.85 * (1 - ((t * 3) % 1)));
}

/** Scène de concert / plateau (rideaux, projecteurs mobiles). */
export function drawConcertStage(ctx: CanvasRenderingContext2D, w: number, h: number, t = 0, beat = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2c2440'); g.addColorStop(1, '#6b3d6e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const x = w * (0.2 + i * 0.3) + Math.sin(t * 0.8 + i * 2) * w * 0.07;
    ctx.fillStyle = rgba(['#F5B5C8', '#F3C86B', '#A9D4F5'][i], 0.18 + beat * 0.12);
    ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.3), 0); ctx.lineTo(x - 60, h); ctx.lineTo(x + 60, h); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#C4407A';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(w * 0.16, h * 0.4, 0, h); ctx.lineTo(0, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w, 0); ctx.quadraticCurveTo(w * 0.84, h * 0.4, w, h); ctx.lineTo(w, 0); ctx.fill();
  ctx.fillStyle = '#58433F'; ctx.fillRect(0, h * 0.9, w, h * 0.1);
  for (let i = 0; i < 16; i++) sparkle(ctx, (i * 97 % 100) / 100 * w, (i * 53 % 70) / 100 * h, 2 + (i % 3) * 1.5, '#FFFFFF', 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i)));
}

// ------------------------------------------------------------------ grandes cartes d'activité (page Carrière)
/** Studio photo : fond coloré en papier, softbox, trépied et appareil. */
export function drawStudio(ctx: CanvasRenderingContext2D, w: number, h: number, t = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FFE4EE'); g.addColorStop(1, '#F3B7CB');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  glow(ctx, w * 0.5, h * 0.4, w * 0.5, '#FFFFFF', 0.7);
  ctx.fillStyle = '#E9C7D6'; ctx.fillRect(0, h * 0.84, w, h * 0.16);
  // softboxes
  for (const [x, flip] of [[w * 0.1, 1], [w * 0.9, -1]] as const) {
    ctx.fillStyle = '#58433F'; ctx.fillRect(x - 2, h * 0.5, 4, h * 0.36);
    ctx.save(); ctx.translate(x, h * 0.36); ctx.rotate(0.2 * flip);
    ctx.fillStyle = '#FFFDF6'; roundRect(ctx, -18, -26, 36, 52, 6); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
    glow(ctx, x, h * 0.36, 34, '#FFF3B8', 0.45 + 0.2 * Math.sin(t * 2));
  }
  // trépied + appareil au premier plan, côté droit
  ctx.strokeStyle = '#58433F'; ctx.lineWidth = 3;
  const cx = w * 0.82, cy = h * 0.66;
  for (const d of [-16, 0, 16]) { ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.lineTo(cx + d, h * 0.9); ctx.stroke(); }
  ctx.fillStyle = '#7A66B8'; roundRect(ctx, cx - 18, cy - 12, 36, 26, 6); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = '#FFF4E8'; ctx.beginPath(); ctx.arc(cx - 6, cy + 1, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const fl = Math.max(0, Math.sin(t * 3.1));
  if (fl > 0.9) glow(ctx, cx - 6, cy + 1, 36, '#FFFFFF', 0.9);
  for (let i = 0; i < 8; i++) sparkle(ctx, (i * 61 % 100) / 100 * w, (i * 37 % 60) / 100 * h, 2 + (i % 3), '#FFFFFF', 0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i)));
}

/** Plateau de cinéma : projecteur, clap, fauteuil de réalisateur. */
export function drawFilmSet(ctx: CanvasRenderingContext2D, w: number, h: number, t = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3B3152'); g.addColorStop(1, '#7A4F6E');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = rgba('#FFE9A8', 0.14 + 0.04 * Math.sin(t * 2));
  ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.08); ctx.lineTo(w * 0.28, h * 0.9); ctx.lineTo(w * 0.72, h * 0.9); ctx.lineTo(w * 0.88, h * 0.08); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#58433F'; ctx.fillRect(0, h * 0.88, w, h * 0.12);
  // clap
  const cx = w * 0.8, cy = h * 0.6;
  const open = 0.35 + 0.3 * Math.max(0, Math.sin(t * 2.4));
  ctx.fillStyle = '#2c2440'; roundRect(ctx, cx - 28, cy, 56, 32, 4); ctx.fill(); ctx.strokeStyle = '#FFF4E8'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(cx - 28, cy); ctx.rotate(-open);
  ctx.fillStyle = '#FFF4E8'; ctx.fillRect(0, -10, 56, 10);
  ctx.fillStyle = '#2c2440'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 14 + 4, -10); ctx.lineTo(i * 14 + 12, -10); ctx.lineTo(i * 14 + 8, 0); ctx.lineTo(i * 14, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // projecteur de plateau
  ctx.fillStyle = '#58433F'; ctx.fillRect(w * 0.1, h * 0.12, w * 0.12, 6);
  glow(ctx, w * 0.16, h * 0.18, 30, '#FFE9A8', 0.7);
  for (let i = 0; i < 10; i++) sparkle(ctx, (i * 71 % 100) / 100 * w, (i * 29 % 50) / 100 * h, 2 + (i % 3), '#FFFFFF', 0.3 + 0.4 * Math.abs(Math.sin(t * 2 + i)));
}

/** Scène complète d'une carrière avec Radia, tenue équipée. `t` en secondes. */
export function drawCareerScene(ctx: CanvasRenderingContext2D, id: CareerId, w: number, h: number, t = 0, look: Look = currentLook()): void {
  ctx.save();
  if (id === 'model') drawRunway(ctx, w, h, t);
  else if (id === 'singer') drawConcertStage(ctx, w, h, t, 0.5 + 0.5 * Math.sin(t * 5));
  else if (id === 'actress') drawFilmSet(ctx, w, h, t);
  else drawStudio(ctx, w, h, t);
  const bob = Math.sin(t * 2.2) * 2;
  const ah = h * 0.94, aw = ah * 0.4;
  groundShadow(ctx, w * 0.5, h * 0.95, aw * 0.5, 6, 0.35);
  ctx.save(); ctx.translate(w * 0.5 - aw / 2, h * 0.03 + bob);
  const arms = id === 'photo' ? 'heart' : id === 'singer' ? 'open' : id === 'actress' ? 'wave' : 'down';
  const expr = id === 'actress' ? 'love' : 'smile';
  drawAvatar(ctx, look, aw, ah, { expr, arms, step: id === 'model' ? Math.round(Math.sin(t * 2)) : 0 });
  ctx.restore();
  ctx.restore();
}
