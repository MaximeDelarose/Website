// Primitives de dessin canvas : cases du sac, objets, combattants, barres.

import { transformSpecialCell } from "../engine/geometry";
import type { ItemDef, Vec } from "../engine/types";
import { isDiagonal, silhouetteCanvas, spriteCanvas } from "./sprites";

export const RARITY_COLOR: Record<string, string> = {
  common: "#c9b48e",
  uncommon: "#79c27a",
  rare: "#5fa8e8",
  epic: "#b47ae8",
  legendary: "#f2b84a",
};

export const COLORS = {
  ink: "#fdf3de",
  dark: "#2b1709",
  slot: "#2a1e18",
  slotEdge: "#4a382c",
  ok: "rgba(121, 194, 122, .55)",
  bad: "rgba(226, 70, 46, .55)",
  damage: "#ff6b5a",
  poison: "#8fe36b",
  burn: "#ffa531",
  heal: "#7ee08a",
  shield: "#8fd3ff",
  freeze: "#a8e4ff",
};

export function pixelFont(px: number, weight = 800): string {
  return `${weight} ${Math.round(px)}px Nunito, system-ui, sans-serif`;
}

export function outlinedText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, px: number, align: CanvasTextAlign = "center"): void {
  g.font = pixelFont(px, 900);
  g.textAlign = align;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = Math.max(2, px / 4);
  g.strokeStyle = COLORS.dark;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

/** Taille d'icône nette : multiple de 16 quand c'est possible. */
export function crispSize(raw: number): number {
  return raw >= 16 ? Math.floor(raw / 16) * 16 : Math.max(8, Math.floor(raw));
}

export function drawSlots(g: CanvasRenderingContext2D, cells: Vec[], ox: number, oy: number, cell: number): void {
  for (const [x, y] of cells) {
    const px = ox + x * cell;
    const py = oy + y * cell;
    g.fillStyle = COLORS.slotEdge;
    g.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    g.fillStyle = COLORS.slot;
    g.fillRect(px + 3, py + 3, cell - 6, cell - 6);
  }
}

export interface ItemLook {
  id: string;
  def: ItemDef;
  /** Cases relatives à (ox, oy). */
  cells: Vec[];
  rot: number;
  mirror: boolean;
}

export interface ItemOverlay {
  alpha?: number;
  /** Avancement de la barre (0..1), null = pas de barre. */
  progress?: number | null;
  flash?: number;
  frozen?: boolean;
  slowed?: boolean;
  hasted?: boolean;
  charges?: number | null;
  buffed?: boolean;
  shake?: number;
  markers?: boolean;
  dim?: boolean;
}

export function drawItem(g: CanvasRenderingContext2D, it: ItemLook, ox: number, oy: number, cell: number, o: ItemOverlay = {}): void {
  const set = new Set(it.cells.map(([x, y]) => `${x},${y}`));
  const col = RARITY_COLOR[it.def.rarity] ?? RARITY_COLOR.common;
  const sx = o.shake ? Math.sin(o.shake * 60) * 3 : 0;
  ox += sx;
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  const pad = Math.max(2, Math.round(cell * 0.06));
  // fond des cases
  for (const [x, y] of it.cells) {
    const px = ox + x * cell;
    const py = oy + y * cell;
    const l = set.has(`${x - 1},${y}`) ? 0 : pad;
    const r = set.has(`${x + 1},${y}`) ? 0 : pad;
    const t = set.has(`${x},${y - 1}`) ? 0 : pad;
    const b = set.has(`${x},${y + 1}`) ? 0 : pad;
    g.fillStyle = col;
    g.fillRect(px + l, py + t, cell - l - r, cell - t - b);
    g.fillStyle = "#3b2a20";
    const i = 2;
    g.fillRect(px + l + (l ? i : 0), py + t + (t ? i : 0), cell - l - r - (l ? i : 0) - (r ? i : 0), cell - t - b - (t ? i : 0) - (b ? i : 0));
  }
  // icône au centre des cases
  const xs = it.cells.map((c) => c[0]);
  const ys = it.cells.map((c) => c[1]);
  const bw = Math.max(...xs) - Math.min(...xs) + 1;
  const bh = Math.max(...ys) - Math.min(...ys) + 1;
  const cx = ox + (it.cells.reduce((s, c) => s + c[0], 0) / it.cells.length + 0.5) * cell;
  const cy = oy + (it.cells.reduce((s, c) => s + c[1], 0) / it.cells.length + 0.5) * cell;
  // objet long + arme dessinée en diagonale : on la couche le long de l'objet
  const dsx = it.def.shape.map((c) => c[0]);
  const dsy = it.def.shape.map((c) => c[1]);
  const dw = Math.max(...dsx) - Math.min(...dsx) + 1;
  const dh = Math.max(...dsy) - Math.min(...dsy) + 1;
  const long = dw !== dh && isDiagonal(it.id);
  const size = long ? Math.min((Math.max(bw, bh) * cell * 0.9) / Math.SQRT2, Math.min(bw, bh) * cell * 1.55) : crispSize(Math.min(bw, bh) * cell * 0.86);
  g.save();
  g.translate(Math.round(cx), Math.round(cy));
  g.rotate((it.rot * Math.PI) / 2);
  if (it.mirror) g.scale(-1, 1);
  if (long) g.rotate(dh > dw ? -Math.PI / 4 : Math.PI / 4);
  g.imageSmoothingEnabled = false;
  if (o.dim) g.globalAlpha *= 0.55;
  g.drawImage(spriteCanvas(it.id), -size / 2, -size / 2, size, size);
  g.restore();

  // barre de cooldown : la partie non chargée est assombrie, du haut vers le bas
  if (o.progress !== undefined && o.progress !== null) {
    const top = oy + Math.min(...ys) * cell;
    const band = (1 - Math.max(0, Math.min(1, o.progress))) * bh * cell;
    g.fillStyle = "rgba(10, 6, 14, .55)";
    for (const [x, y] of it.cells) {
      const py = oy + y * cell;
      const y0 = Math.max(py, top);
      const y1 = Math.min(py + cell, top + band);
      if (y1 > y0) g.fillRect(ox + x * cell, y0, cell, y1 - y0);
    }
    // trait du niveau de charge
    if (o.progress > 0 && o.progress < 1) {
      g.fillStyle = "#ffd27a";
      const ly = Math.round(top + band) - 1;
      for (const [x, y] of it.cells) if (ly >= oy + y * cell && ly < oy + (y + 1) * cell) g.fillRect(ox + x * cell + 2, ly, cell - 4, 2);
    }
  }
  const tint = (color: string) => {
    g.fillStyle = color;
    for (const [x, y] of it.cells) g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
  };
  if (o.frozen) tint("rgba(140, 210, 255, .45)");
  if (o.slowed) tint("rgba(120, 60, 160, .25)");
  if (o.flash && o.flash > 0) tint(`rgba(255, 250, 220, ${Math.min(0.8, o.flash * 3)})`);
  if (o.hasted) {
    g.strokeStyle = "#ffe27a";
    g.lineWidth = 2;
    for (const [x, y] of it.cells) g.strokeRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
  }
  // cases spéciales : petite flèche vers la case visée
  if (o.markers && it.def.specialCells.length) {
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    for (const sc of it.def.specialCells) {
      const t = transformSpecialCell(it.def.shape, sc, { rot: it.rot, mirror: it.mirror });
      const mx = ox + (t.cell[0] + minX + 0.5) * cell;
      const my = oy + (t.cell[1] + minY + 0.5) * cell;
      const d = t.dir ?? [0, 0];
      const ax = mx + d[0] * cell * 0.4;
      const ay = my + d[1] * cell * 0.4;
      const s = Math.max(4, cell * 0.12);
      g.fillStyle = "#ffe27a";
      g.strokeStyle = COLORS.dark;
      g.lineWidth = 2;
      g.beginPath();
      if (d[0] === 0 && d[1] === 0) g.arc(mx, my, s * 0.6, 0, Math.PI * 2);
      else {
        g.moveTo(ax + d[0] * s, ay + d[1] * s);
        g.lineTo(ax - d[0] * s + d[1] * s, ay - d[1] * s + d[0] * s);
        g.lineTo(ax - d[0] * s - d[1] * s, ay - d[1] * s - d[0] * s);
        g.closePath();
      }
      g.stroke();
      g.fill();
    }
  }
  // badges
  const first = it.cells.reduce((a, c) => (c[1] < a[1] || (c[1] === a[1] && c[0] < a[0]) ? c : a));
  const last = it.cells.reduce((a, c) => (c[1] > a[1] || (c[1] === a[1] && c[0] > a[0]) ? c : a));
  const bs = Math.max(10, Math.round(cell * 0.24));
  if (o.buffed) {
    const px = ox + first[0] * cell + pad + 1;
    const py = oy + first[1] * cell + pad + 1;
    g.fillStyle = COLORS.dark;
    g.fillRect(px, py, bs, bs);
    g.fillStyle = "#79c27a";
    const u = bs / 5;
    g.fillRect(px + 2 * u, py + u, u, 3 * u);
    g.fillRect(px + u, py + 2 * u, 3 * u, u);
  }
  if (o.charges !== undefined && o.charges !== null) {
    const px = ox + (last[0] + 1) * cell - pad - bs - 2;
    const py = oy + (last[1] + 1) * cell - pad - bs - 2;
    g.fillStyle = COLORS.dark;
    g.fillRect(px - 1, py - 1, bs + 4, bs + 4);
    outlinedText(g, String(o.charges), px + bs / 2 + 1, py + bs / 2 + 1, o.charges > 0 ? COLORS.ink : "#9a8a7a", bs * 0.95);
  }
  g.restore();
}

export function drawFighter(
  g: CanvasRenderingContext2D,
  id: string,
  cx: number,
  groundY: number,
  s: number,
  flip: boolean,
  o: { alpha?: number; flash?: number; bob?: number; dx?: number } = {},
): void {
  const size = 16 * s;
  const x = Math.round(cx - size / 2 + (o.dx ?? 0));
  const y = Math.round(groundY - size + (o.bob ?? 0) * s);
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = o.alpha ?? 1;
  // ombre
  g.fillStyle = "rgba(0,0,0,.28)";
  g.fillRect(Math.round(cx - size * 0.32), groundY - s, Math.round(size * 0.64), s * 2);
  g.drawImage(spriteCanvas(id, flip), x, y, size, size);
  if (o.flash && o.flash > 0) {
    g.globalAlpha = Math.min(1, o.flash * 6) * (o.alpha ?? 1);
    g.drawImage(silhouetteCanvas(id, flip), x, y, size, size);
  }
  g.restore();
}

export function drawHpBar(g: CanvasRenderingContext2D, cx: number, y: number, w: number, hp: number, max: number, shield: number): void {
  const x = Math.round(cx - w / 2);
  const h = 10;
  g.fillStyle = COLORS.dark;
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = "#5a2a2a";
  g.fillRect(x, y, w, h);
  const f = Math.max(0, Math.min(1, hp / max));
  g.fillStyle = f > 0.5 ? "#6fcf5f" : f > 0.25 ? "#e8c44a" : "#e2563a";
  g.fillRect(x, y, Math.round(w * f), h);
  g.fillStyle = "rgba(255,255,255,.25)";
  g.fillRect(x, y, Math.round(w * f), 2);
  if (shield > 0) {
    const sw = Math.round(w * Math.min(1, shield / max));
    g.fillStyle = COLORS.dark;
    g.fillRect(x - 2, y - 7, sw + 4, 7);
    g.fillStyle = COLORS.shield;
    g.fillRect(x, y - 5, sw, 4);
  }
  outlinedText(g, shield > 0 ? `${hp} +${shield}` : `${hp}`, cx, y + h / 2 + 1, COLORS.ink, 11);
}

/** Pastilles de statut (poison, brûlure) avec leur nombre de stacks. */
export function drawStatuses(g: CanvasRenderingContext2D, cx: number, y: number, statuses: Record<string, { stacks: number }>): void {
  const list = Object.entries(statuses).filter(([, s]) => s.stacks > 0);
  if (!list.length) return;
  const w = 28;
  let x = cx - (list.length * w) / 2;
  for (const [id, st] of list) {
    const color = id === "poison" ? COLORS.poison : id === "burn" ? COLORS.burn : "#cccccc";
    g.fillStyle = COLORS.dark;
    g.fillRect(x + 1, y - 1, 10, 10);
    g.fillStyle = color;
    g.fillRect(x + 2, y, 8, 8);
    outlinedText(g, String(st.stacks), x + 19, y + 4, color, 11);
    x += w;
  }
}

/** Fond d'arène (forêt pixel), mis en cache par taille. */
const bgCache = new Map<string, HTMLCanvasElement>();
export function arenaBackground(w: number, h: number, danger = false): HTMLCanvasElement {
  const px = 3;
  const lw = Math.ceil(w / px);
  const lh = Math.ceil(h / px);
  const ck = `${lw}x${lh}|${danger}`;
  const hit = bgCache.get(ck);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = lw;
  c.height = lh;
  const g = c.getContext("2d")!;
  const sky = danger ? ["#3a1f2a", "#4a2633", "#5a2e3a"] : ["#2a3f5a", "#35506a", "#46647a"];
  const band = Math.ceil(lh * 0.22);
  sky.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * band, lw, band + 1);
  });
  // étoiles / lucioles
  g.fillStyle = danger ? "#ff9a7a" : "#fff2b0";
  for (let i = 0; i < lw / 8; i++) g.fillRect((i * 37) % lw, (i * 13) % Math.floor(lh * 0.5), 1, 1);
  // arbres lointains
  const tree = (color: string, base: number, step: number, hgt: number, seed: number) => {
    g.fillStyle = color;
    for (let x = -step; x < lw + step; x += step) {
      const th = hgt + ((x * 7 + seed) % 5);
      for (let k = 0; k < th; k++) {
        const half = Math.floor((k * step) / (2 * th)) + 1;
        g.fillRect(x - half + step / 2, base - th + k, half * 2, 1);
      }
      g.fillRect(x + step / 2 - 1, base, 2, 3);
    }
  };
  const ground = Math.floor(lh * 0.62);
  tree(danger ? "#2a1a24" : "#1f3a3a", ground - 2, 14, 18, 3);
  tree(danger ? "#331d2a" : "#24483a", ground, 11, 13, 7);
  // sol
  g.fillStyle = danger ? "#3a2a22" : "#3d5a2e";
  g.fillRect(0, ground, lw, lh - ground);
  g.fillStyle = danger ? "#2e221c" : "#2f4a24";
  g.fillRect(0, ground + 4, lw, lh - ground - 4);
  g.fillStyle = danger ? "#4a3428" : "#4f7038";
  for (let x = 0; x < lw; x += 3) g.fillRect(x, ground - ((x * 5) % 3 === 0 ? 1 : 0), 1, 1);
  g.fillStyle = "#24361c";
  for (let i = 0; i < lw / 5; i++) g.fillRect((i * 23) % lw, ground + 6 + ((i * 11) % Math.max(1, lh - ground - 8)), 2, 1);
  bgCache.set(ck, c);
  return c;
}
