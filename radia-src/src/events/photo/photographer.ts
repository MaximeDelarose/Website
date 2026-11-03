/** Le photographe FICTIF de la séance : personnage vectoriel (veste, appareil photo, petit sourire) + répliques courtes. */
import { makeCanvas } from '../../game/art/kit';

type C = CanvasRenderingContext2D;
export type PhotographerMood = 'idle' | 'aim' | 'happy';

const INK = '#58433f';

/** Dessin en repère 120 × 190 (pieds en bas, centré en x = 60). `flash` ∈ [0,1] : éclair du flash. */
export function drawPhotographer(g: C, mood: PhotographerMood = 'idle', t = 0, flash = 0): void {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  const bob = Math.sin(t * 2) * 0.8;
  g.translate(0, bob);
  // ombre
  g.fillStyle = 'rgba(60,40,80,0.22)'; g.beginPath(); g.ellipse(60, 187, 30, 5, 0, 0, 7); g.fill();
  // jambes + chaussures
  for (const x of [46, 66]) {
    g.fillStyle = '#3a3550'; g.strokeStyle = INK; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(x, 126, 16, 56, 5); g.fill(); g.stroke();
    g.fillStyle = '#2b2437'; g.beginPath(); g.roundRect(x - 2, 178, 21, 9, 4); g.fill(); g.stroke();
  }
  // veste (bordeaux) + chemise
  g.fillStyle = '#7c3552'; g.beginPath();
  g.moveTo(34, 68); g.quadraticCurveTo(60, 58, 86, 68); g.lineTo(92, 132); g.quadraticCurveTo(60, 140, 28, 132); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff8f0'; g.beginPath(); g.moveTo(50, 64); g.lineTo(70, 64); g.lineTo(62, 112); g.lineTo(58, 112); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#a24867'; // revers
  g.beginPath(); g.moveTo(50, 64); g.lineTo(60, 100); g.lineTo(44, 92); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(70, 64); g.lineTo(60, 100); g.lineTo(76, 92); g.closePath(); g.fill(); g.stroke();
  // nœud papillon
  g.fillStyle = '#f3c86b'; g.beginPath(); g.moveTo(60, 67); g.lineTo(52, 63); g.lineTo(52, 72); g.closePath(); g.moveTo(60, 67); g.lineTo(68, 63); g.lineTo(68, 72); g.closePath(); g.fill(); g.stroke();
  // sangle d'appareil
  g.strokeStyle = '#3a2f36'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(46, 62); g.quadraticCurveTo(40, 100, 52, 106); g.stroke();
  // tête
  g.lineWidth = 1.5; g.strokeStyle = INK;
  g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(60, 40, 20, 22, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#e8b896'; for (const x of [40, 80]) { g.beginPath(); g.ellipse(x, 42, 4, 6, 0, 0, 7); g.fill(); g.stroke(); }
  // cheveux bouclés + béret
  g.fillStyle = '#3b2a26';
  g.beginPath(); g.moveTo(39, 36); g.quadraticCurveTo(38, 16, 60, 15); g.quadraticCurveTo(82, 16, 81, 36); g.quadraticCurveTo(72, 26, 60, 27); g.quadraticCurveTo(48, 26, 39, 36); g.fill(); g.stroke();
  g.fillStyle = '#2f3b6b'; g.beginPath(); g.ellipse(64, 15, 26, 9, -0.12, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(64, 6, 2.4, 0, 7); g.fill();
  // lunettes rondes
  g.strokeStyle = INK; g.lineWidth = 1.6; g.fillStyle = 'rgba(255,255,255,0.35)';
  for (const x of [52, 68]) { g.beginPath(); g.arc(x, 41, 6.4, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(58.4, 41); g.lineTo(61.6, 41); g.stroke();
  // yeux / sourire
  g.fillStyle = INK; for (const x of [52, 68]) { g.beginPath(); g.arc(x + (mood === 'aim' ? 0.6 : 0), 41.5, 1.8, 0, 7); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath();
  if (mood === 'happy') { g.moveTo(52, 52); g.quadraticCurveTo(60, 62, 68, 52); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke(); } else { g.moveTo(53, 53); g.quadraticCurveTo(60, 58, 67, 53); g.stroke(); }
  g.fillStyle = 'rgba(255,130,150,0.35)'; for (const x of [46, 74]) { g.beginPath(); g.ellipse(x, 50, 4, 2.6, 0, 0, 7); g.fill(); }
  // appareil photo (à la main) + bras
  const camY = mood === 'aim' ? 52 : 92, camX = 60;
  g.fillStyle = '#7c3552'; g.strokeStyle = INK; g.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(60 + s * 30, 74); g.quadraticCurveTo(60 + s * 40, camY + 20, camX + s * 17, camY + 6); g.lineWidth = 11; g.strokeStyle = '#7c3552'; g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = INK;
  }
  g.fillStyle = '#2d2a36'; g.beginPath(); g.roundRect(camX - 23, camY - 8, 46, 28, 6); g.fill(); g.stroke();
  g.fillStyle = '#c9ccd8'; g.beginPath(); g.roundRect(camX - 23, camY - 8, 46, 8, [6, 6, 0, 0]); g.fill(); g.stroke();
  g.fillStyle = '#9fb2d8'; g.beginPath(); g.arc(camX, camY + 8, 10.5, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#4b5f93'; g.beginPath(); g.arc(camX, camY + 8, 6.2, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(camX - 2.4, camY + 5.6, 2, 0, 7); g.fill();
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.roundRect(camX + 12, camY - 4, 7, 5, 1.5); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = '#e8b896'; g.strokeStyle = INK; g.beginPath(); g.ellipse(camX + s * 20, camY + 12, 6, 5.5, 0, 0, 7); g.fill(); g.stroke(); }
  if (flash > 0.01) {
    const fx = camX + 15, fy = camY - 2;
    const gr = g.createRadialGradient(fx, fy, 0, fx, fy, 46 * flash + 8);
    gr.addColorStop(0, `rgba(255,255,255,${Math.min(1, flash * 1.1)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(fx - 60, fy - 60, 120, 120);
  }
  g.restore();
}

/** Canvas du photographe (buste si `bust`, sinon en pied) à la taille w × h pixels. */
export function photographerCanvas(w: number, h: number, mood: PhotographerMood = 'idle', opts: { bust?: boolean; t?: number; flash?: number } = {}): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d')!;
  const box = opts.bust ? { x: 14, y: 0, w: 92, h: 118 } : { x: 0, y: 0, w: 120, h: 190 };
  const k = Math.min(w / box.w, h / box.h);
  g.save(); g.translate((w - box.w * k) / 2 - box.x * k, (opts.bust ? 0 : h - box.h * k) - box.y * k); g.scale(k, k);
  drawPhotographer(g, mood, opts.t ?? 0, opts.flash ?? 0);
  g.restore();
  return c;
}

// ------------------------------------------------------------------ répliques (courtes, chaleureuses)
export const PHOTO_INTRO = 'Bonsoir ! Je suis le photographe de la soirée. Un joli souvenir, ça vous dit ? Choisissez votre pose, le décor, le cadre…';
export const PHOTO_LINES = {
  pose: {
    cote: 'Côte à côte : simple et élégant.',
    main: 'Main dans la main, c’est adorable !',
    bisou: 'Oh, un petit bisou ! Monsieur, penchez-vous…',
    bras: 'Le bras autour de lui : très tendre.',
    elegante: 'Pose élégante ! Le palace s’y prête à merveille.',
  } as Record<string, string>,
  decor: {
    escalier: 'Le grand escalier : un classique du palace.',
    terrasse: 'La terrasse, quelle lumière !',
    jardin: 'Le jardin illuminé, ambiance de soirée.',
    salon: 'La salle de réception, très chic.',
    fontaine: 'La fontaine : les jets d’eau, c’est magique.',
  } as Record<string, string>,
  frame: {
    classique: 'Un cadre classique, intemporel.',
    or: 'Un cadre doré, comme il se doit.',
    polaroid: 'Un polaroïd, j’adore le charme de l’instantané.',
    romantique: 'Un cadre romantique pour une soirée romantique.',
  } as Record<string, string>,
  ready: ['Parfait. Prêts ? On sourit !', 'Tout le monde est splendide. On y va ?', 'La lumière est idéale. Quand vous voulez !'],
  count: ['Regardez-moi… et pensez à quelque chose de doux.', 'Un grand sourire !'],
  shot: ['Magnifique !', 'Superbe, vraiment !', 'Voilà qui va faire un beau souvenir.'],
  kept: ['Un souvenir de plus pour l’album.', 'Gardé précieusement. Belle soirée à vous !'],
};
/** Choisit une réplique de la liste avec l'aléa `r() ∈ [0,1[`. */
export const pick = <T>(list: T[], r: () => number): T => list[Math.min(list.length - 1, Math.floor(r() * list.length))];
