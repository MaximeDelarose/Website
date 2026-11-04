/**
 * Géométrie du message « RADIA ❤️ » écrit par les feux d'artifice (logique pure, sans DOM).
 * Chaque glyphe est un tracé vectoriel (polylignes) dans une boîte de hauteur 1 ; on échantillonne des points
 * le long des traits, dans l'ordre du tracé : lettre après lettre, trait après trait. Le résultat est
 * déterministe (même entrée → mêmes points, même ordre) : l'ordre de révélation est stable.
 */
export type Pt = { x: number; y: number };
export interface LetterPoint extends Pt { /** index du glyphe (0 = R … 5 = cœur) */ letter: number; /** rang dans le glyphe (ordre de tracé) */ i: number }
export interface LetterBox { ch: string; x: number; y: number; w: number; h: number; count: number; from: number }
export interface Message { points: LetterPoint[]; letters: LetterBox[]; width: number; height: number; spacing: number }

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 14): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return out;
};

/** Cœur : 4 courbes de Bézier (même forme que kit.heartPath), départ à la pointe, sens horaire à l'écran. */
export function heartStroke(cx: number, cy: number, w: number, hgt: number, n = 14): Pt[] {
  const seg: [number, number][][] = [
    [[0, 0.95], [-0.2, 0.75], [-1.05, 0.25], [-1.0, -0.3]],
    [[-1.0, -0.3], [-0.95, -0.9], [-0.2, -1.0], [0, -0.45]],
    [[0, -0.45], [0.2, -1.0], [0.95, -0.9], [1.0, -0.3]],
    [[1.0, -0.3], [1.05, 0.25], [0.2, 0.75], [0, 0.95]],
  ];
  // boîte normalisée : x ∈ [-1.0, 1.0] (≈ -1.0..1.0), y ∈ [-0.9.. 0.95] environ → on recale sur w × hgt
  const out: Pt[] = [];
  for (const [a, b, c, d] of seg) {
    for (let i = 0; i < n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      out.push({ x, y });
    }
  }
  out.push({ ...out[0] });
  const ys = out.map((p) => p.y);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return out.map((p) => ({ x: cx + (p.x / 2.0) * w, y: cy - hgt / 2 + ((p.y - y0) / (y1 - y0)) * hgt }));
}

interface Glyph { ch: string; w: number; strokes: Pt[][] }
const P = (x: number, y: number): Pt => ({ x, y });

/** Glyphes en unités de hauteur (hauteur = 1). */
export const GLYPHS: Record<string, Glyph> = {
  R: { ch: 'R', w: 0.66, strokes: [
    [P(0, 1), P(0, 0), P(0.4, 0), ...arc(0.4, 0.25, 0.26, 0.25, -Math.PI / 2, Math.PI / 2), P(0, 0.5)],
    [P(0.3, 0.5), P(0.64, 1)],
  ] },
  A: { ch: 'A', w: 0.7, strokes: [
    [P(0, 1), P(0.35, 0), P(0.7, 1)],
    [P(0.14, 0.64), P(0.56, 0.64)],
  ] },
  D: { ch: 'D', w: 0.66, strokes: [
    [P(0, 0), P(0, 1)],
    [P(0, 0), P(0.28, 0), ...arc(0.28, 0.5, 0.36, 0.5, -Math.PI / 2, Math.PI / 2), P(0, 1)],
  ] },
  I: { ch: 'I', w: 0.34, strokes: [
    [P(0.17, 0), P(0.17, 1)],
    [P(0, 0), P(0.34, 0)],
    [P(0, 1), P(0.34, 1)],
  ] },
};

/** Texte du message : lettres puis cœur. */
export const MESSAGE_LETTERS = ['R', 'A', 'D', 'I', 'A', '♥'] as const;
const GAP = 0.2; // espace entre lettres (en hauteurs)
const WORD_GAP = 0.45;
const HEART_W = 1.08;
const HEART_H = 0.96;

/** Largeur naturelle du message en unités de hauteur. */
export function naturalWidth(): number {
  let w = 0;
  MESSAGE_LETTERS.forEach((ch, i) => { w += ch === '♥' ? HEART_W : GLYPHS[ch].w; if (i < MESSAGE_LETTERS.length - 1) w += i === MESSAGE_LETTERS.length - 2 ? WORD_GAP : GAP; });
  return w;
}

const strokeLength = (s: Pt[]): number => { let l = 0; for (let i = 1; i < s.length; i++) l += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y); return l; };

/** Échantillonne un tracé à pas régulier (extrémités incluses). */
export function sampleStroke(s: Pt[], step: number): Pt[] {
  const total = strokeLength(s);
  const n = Math.max(1, Math.round(total / step));
  const out: Pt[] = [];
  let seg = 0, acc = 0;
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    while (seg < s.length - 2 && acc + Math.hypot(s[seg + 1].x - s[seg].x, s[seg + 1].y - s[seg].y) < d - 1e-9) { acc += Math.hypot(s[seg + 1].x - s[seg].x, s[seg + 1].y - s[seg].y); seg++; }
    const l = Math.hypot(s[seg + 1].x - s[seg].x, s[seg + 1].y - s[seg].y) || 1;
    const u = Math.min(1, Math.max(0, (d - acc) / l));
    out.push({ x: s[seg].x + (s[seg + 1].x - s[seg].x) * u, y: s[seg].y + (s[seg + 1].y - s[seg].y) * u });
  }
  return out;
}

/**
 * Construit le message dans une zone `width × height` (pixels) : points ordonnés (lettre par lettre, trait par trait),
 * boîtes des glyphes. `maxPoints` plafonne le nombre de points (budget de particules) en espaçant davantage.
 * Les coordonnées sont relatives à l'angle supérieur gauche de la zone ; le texte est centré.
 */
export function buildMessage(width: number, height: number, maxPoints = 300, minSpacing = 4.5): Message {
  const H = Math.max(8, Math.min(height, width / naturalWidth()));
  const nat = naturalWidth() * H;
  const ox = (width - nat) / 2;
  const oy = (height - H) / 2;
  // longueur totale des traits → pas d'échantillonnage qui respecte le plafond
  let total = 0;
  for (const ch of MESSAGE_LETTERS) {
    if (ch === '♥') total += strokeLength(heartStroke(0, 0, HEART_W * H, HEART_H * H));
    else for (const s of GLYPHS[ch].strokes) total += strokeLength(s.map((p) => P(p.x * H, p.y * H)));
  }
  const spacing = Math.max(minSpacing, total / Math.max(1, maxPoints - 24));
  const points: LetterPoint[] = [];
  const letters: LetterBox[] = [];
  let x = ox;
  MESSAGE_LETTERS.forEach((ch, li) => {
    const from = points.length;
    let bx: number, by: number, bw: number, bh: number;
    if (ch === '♥') {
      const w = HEART_W * H, hh = HEART_H * H;
      bx = x; by = oy + (H - hh) / 2; bw = w; bh = hh;
      const st = heartStroke(bx + w / 2, by + hh / 2, w, hh);
      sampleStroke(st, spacing).forEach((p, i) => points.push({ x: p.x, y: p.y, letter: li, i }));
      x += w;
    } else {
      const g = GLYPHS[ch];
      bx = x; by = oy; bw = g.w * H; bh = H;
      let i = 0;
      for (const s of g.strokes) {
        const poly = s.map((p) => P(x + p.x * H, oy + p.y * H));
        sampleStroke(poly, spacing).forEach((p) => points.push({ x: p.x, y: p.y, letter: li, i: i++ }));
      }
      x += g.w * H;
    }
    // doublons éventuels (extrémités communes de deux traits) : on garde le premier
    const seen = new Set<string>();
    for (let k = points.length - 1; k >= from; k--) { const key = `${Math.round(points[k].x / 1.5)}:${Math.round(points[k].y / 1.5)}`; if (seen.has(key)) points.splice(k, 1); else seen.add(key); }
    points.slice(from).forEach((p, i) => { p.i = i; });
    letters.push({ ch, x: bx, y: by, w: bw, h: bh, count: points.length - from, from });
    x += li === MESSAGE_LETTERS.length - 2 ? WORD_GAP * H : GAP * H;
  });
  return { points, letters, width, height, spacing };
}

/** Rasterise les points dans un tableau de booléens (grille w × h) : sert aux tests de lisibilité. */
export function rasterize(m: Message, cell = 2): { cols: number; rows: number; on: Uint8Array } {
  const cols = Math.ceil(m.width / cell), rows = Math.ceil(m.height / cell);
  const on = new Uint8Array(cols * rows);
  for (const p of m.points) {
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < cols && y < rows) on[y * cols + x] = 1;
    }
  }
  return { cols, rows, on };
}
