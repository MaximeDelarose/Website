/**
 * « Le billard des cœurs » — physique arcade pure (aucun rendu).
 * Unités : « points de table » (la table fait TABLE_W × TABLE_H).
 * Pas fixe, sous-pas adaptatifs (pas d'effet tunnel), chocs élastiques
 * entre billes de même masse, rebonds sur les bandes, frottement de roulement.
 */
export const TABLE_W = 300;
export const TABLE_H = 520;
export const BALL_R = 11;
export const POCKET_R = 21; // poches généreuses
export const MAX_SPEED = 1500; // points / s
const RESTITUTION_BALL = 0.96;
const RESTITUTION_CUSHION = 0.82;
const FRICTION = 0.9; // décroissance exponentielle
const ROLL_DECEL = 70; // décélération constante (points / s²)
const STOP_SPEED = 6;
export const STEP = 1 / 120;

export type BallKind = 'cue' | 'heart' | 'gold' | 'plain';

export interface Ball { id: number; kind: BallKind; x: number; y: number; vx: number; vy: number; pocketed: boolean }

export interface Pocket { x: number; y: number }

export const POCKETS: Pocket[] = [
  { x: 0, y: 0 }, { x: TABLE_W, y: 0 },
  { x: -4, y: TABLE_H / 2 }, { x: TABLE_W + 4, y: TABLE_H / 2 },
  { x: 0, y: TABLE_H }, { x: TABLE_W, y: TABLE_H },
];

export interface World {
  balls: Ball[];
  /** Événements depuis le dernier appel à step (pour les sons / effets). */
  events: WorldEvent[];
  cueStart: { x: number; y: number };
}

export type WorldEvent =
  | { t: 'hit'; a: number; b: number; speed: number }
  | { t: 'cushion'; id: number; speed: number }
  | { t: 'pocket'; id: number; kind: BallKind; pocket: number };

export function makeWorld(balls: Omit<Ball, 'vx' | 'vy' | 'pocketed'>[]): World {
  const bs = balls.map((b) => ({ ...b, vx: 0, vy: 0, pocketed: false }));
  const cue = bs.find((b) => b.kind === 'cue')!;
  return { balls: bs, events: [], cueStart: { x: cue.x, y: cue.y } };
}

export const cue = (w: World) => w.balls.find((b) => b.kind === 'cue')!;
export const moving = (w: World) => w.balls.some((b) => !b.pocketed && (b.vx !== 0 || b.vy !== 0));
export const kineticEnergy = (w: World) => w.balls.reduce((a, b) => a + (b.pocketed ? 0 : 0.5 * (b.vx * b.vx + b.vy * b.vy)), 0);

/** Tire la bille blanche dans la direction (dx, dy) avec une puissance 0..1. */
export function shoot(w: World, dx: number, dy: number, power: number): boolean {
  if (moving(w)) return false;
  const c = cue(w);
  const len = Math.hypot(dx, dy);
  if (!len || c.pocketed) return false;
  const p = Math.max(0.05, Math.min(1, power));
  c.vx = (dx / len) * p * MAX_SPEED;
  c.vy = (dy / len) * p * MAX_SPEED;
  return true;
}

function nearPocket(b: Ball, extra: number): number {
  for (let i = 0; i < POCKETS.length; i++) {
    const p = POCKETS[i];
    if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R + extra) return i;
  }
  return -1;
}

function substep(w: World, dt: number): void {
  const bs = w.balls;
  for (const b of bs) {
    if (b.pocketed) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  // chocs entre billes
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i];
    if (a.pocketed) continue;
    for (let j = i + 1; j < bs.length; j++) {
      const b = bs[j];
      if (b.pocketed) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= BALL_R * 2 || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      // séparation
      const overlap = BALL_R * 2 - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const imp = rel * (1 + RESTITUTION_BALL) / 2;
      a.vx -= imp * nx; a.vy -= imp * ny;
      b.vx += imp * nx; b.vy += imp * ny;
      w.events.push({ t: 'hit', a: a.id, b: b.id, speed: rel });
    }
  }
  // poches puis bandes
  for (const b of bs) {
    if (b.pocketed) continue;
    const pk = nearPocket(b, 0);
    if (pk >= 0) {
      b.pocketed = true;
      b.vx = b.vy = 0;
      w.events.push({ t: 'pocket', id: b.id, kind: b.kind, pocket: pk });
      continue;
    }
    // près d'une poche, pas de bande (l'entrée de la poche est ouverte)
    if (nearPocket(b, BALL_R * 1.4) >= 0) continue;
    const sp = Math.hypot(b.vx, b.vy);
    if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * RESTITUTION_CUSHION; w.events.push({ t: 'cushion', id: b.id, speed: sp }); }
    if (b.x > TABLE_W - BALL_R) { b.x = TABLE_W - BALL_R; b.vx = -Math.abs(b.vx) * RESTITUTION_CUSHION; w.events.push({ t: 'cushion', id: b.id, speed: sp }); }
    if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) * RESTITUTION_CUSHION; w.events.push({ t: 'cushion', id: b.id, speed: sp }); }
    if (b.y > TABLE_H - BALL_R) { b.y = TABLE_H - BALL_R; b.vy = -Math.abs(b.vy) * RESTITUTION_CUSHION; w.events.push({ t: 'cushion', id: b.id, speed: sp }); }
  }
  // garde-fou : une bille sortie de la table (coin) est considérée empochée
  for (const b of bs) {
    if (b.pocketed) continue;
    if (b.x < -BALL_R * 2 || b.x > TABLE_W + BALL_R * 2 || b.y < -BALL_R * 2 || b.y > TABLE_H + BALL_R * 2) {
      b.pocketed = true; b.vx = b.vy = 0;
      w.events.push({ t: 'pocket', id: b.id, kind: b.kind, pocket: 0 });
    }
  }
}

/** Avance la simulation d'un pas fixe (STEP). */
export function step(w: World): void {
  let maxV = 0;
  for (const b of w.balls) if (!b.pocketed) maxV = Math.max(maxV, Math.hypot(b.vx, b.vy));
  // sous-pas : jamais plus d'un demi-rayon par sous-pas
  const n = Math.max(1, Math.ceil((maxV * STEP) / (BALL_R * 0.5)));
  for (let k = 0; k < n; k++) substep(w, STEP / n);
  for (const b of w.balls) {
    if (b.pocketed) continue;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp === 0) continue;
    let ns = sp * Math.exp(-FRICTION * STEP) - ROLL_DECEL * STEP;
    if (ns < STOP_SPEED) ns = 0;
    b.vx = (b.vx / sp) * ns;
    b.vy = (b.vy / sp) * ns;
  }
}

/** Remet la blanche à sa place (si elle est tombée), sur une position libre. */
export function respawnCue(w: World): void {
  const c = cue(w);
  if (!c.pocketed) return;
  c.pocketed = false;
  c.vx = c.vy = 0;
  let { x, y } = w.cueStart;
  for (let tries = 0; tries < 40; tries++) {
    const free = w.balls.every((b) => b === c || b.pocketed || Math.hypot(b.x - x, b.y - y) > BALL_R * 2.2);
    if (free) break;
    x = w.cueStart.x + ((tries % 7) - 3) * BALL_R * 2.3;
    y = w.cueStart.y - Math.floor(tries / 7) * BALL_R * 2.3;
  }
  c.x = x; c.y = y;
}

/** Simule jusqu'à l'arrêt (tests, prévisualisations). Renvoie le nombre de pas. */
export function settle(w: World, maxSteps = 120 * 30): number {
  let n = 0;
  while (moving(w) && n < maxSteps) { step(w); n++; }
  return n;
}

// ------------------------------------------------------------ défis

export interface Challenge {
  title: string;
  goal: string;
  maxShots: number | null;
  balls: Omit<Ball, 'vx' | 'vy' | 'pocketed'>[];
  /** Réussi si ces billes sont empochées. */
  need: { kind: BallKind; count: number };
}

const B = (id: number, kind: BallKind, x: number, y: number) => ({ id, kind, x, y });

export const CHALLENGES: Challenge[] = [
  {
    title: 'Un cœur pour commencer',
    goal: 'Empoche une bille cœur.',
    maxShots: null,
    need: { kind: 'heart', count: 1 },
    balls: [B(0, 'cue', 150, 420), B(1, 'heart', 75, 210), B(2, 'heart', 225, 150)],
  },
  {
    title: 'Deux cœurs, quatre coups',
    goal: 'Empoche 2 billes cœur en 4 coups maximum.',
    maxShots: 4,
    need: { kind: 'heart', count: 2 },
    balls: [B(0, 'cue', 150, 430), B(1, 'heart', 70, 150), B(2, 'heart', 230, 330), B(3, 'heart', 150, 120), B(4, 'plain', 190, 240)],
  },
  {
    title: 'Le cœur doré',
    goal: 'Empoche le cœur doré en 3 coups maximum.',
    maxShots: 3,
    need: { kind: 'gold', count: 1 },
    balls: [B(0, 'cue', 150, 440), B(1, 'gold', 150, 150), B(2, 'plain', 130, 300), B(3, 'plain', 172, 300), B(4, 'heart', 60, 220), B(5, 'heart', 240, 220)],
  },
];

export const pottedCount = (w: World, kind: BallKind) => w.balls.filter((b) => b.kind === kind && b.pocketed).length;
