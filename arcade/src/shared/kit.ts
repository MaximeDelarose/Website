/**
 * Kit visuel commun aux trois jeux : même langage que le site (contours brun foncé épais, ombres dures,
 * panneaux crème, police Londrina). Tout est dessiné avec Phaser Graphics, sans image.
 */
import type PhaserType from "phaser";
import { Phaser } from "./engines.js";
import { FONT, FONT_BODY, PAL, hex, mix } from "./theme.js";
import { isMuted, toggleMute, tone } from "./audio.js";

type G = PhaserType.GameObjects.Graphics;
type Scene = PhaserType.Scene;

/** Écran tactile (pas de souris) : on affiche alors les boutons à l'écran. */
export function isTouch(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  } catch {
    return false;
  }
}

/** Panneau : ombre dure, contour épais, fond. */
export function drawPanel(g: G, x: number, y: number, w: number, h: number, o: { fill?: number; border?: number; depth?: number; alpha?: number; bw?: number } = {}): void {
  const depth = o.depth ?? 6;
  const bw = o.bw ?? 4;
  g.fillStyle(PAL.ink0, 1);
  g.fillRect(x, y + depth, w, h);
  g.fillStyle(o.border ?? PAL.ink0, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(o.fill ?? PAL.field, o.alpha ?? 1);
  g.fillRect(x + bw, y + bw, w - bw * 2, h - bw * 2);
}

/** Rectangle biseauté pixel art : contour sombre, reflet en haut/gauche, ombre en bas/droite. */
export function drawBevel(g: G, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  const m = Math.min(w, h);
  const b = Math.max(2, Math.round(m * 0.08));
  const hl = Math.max(2, Math.round(m * 0.14));
  g.fillStyle(PAL.ink0, alpha);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, alpha);
  g.fillRect(x + b, y + b, w - b * 2, h - b * 2);
  g.fillStyle(0xffffff, 0.38 * alpha);
  g.fillRect(x + b, y + b, w - b * 2, hl);
  g.fillRect(x + b, y + b, hl, h - b * 2);
  g.fillStyle(PAL.ink0, 0.28 * alpha);
  g.fillRect(x + b, y + h - b - hl, w - b * 2, hl);
  g.fillRect(x + w - b - hl, y + b, hl, h - b * 2);
}

/** Bloc carré biseauté. */
export function drawBlock(g: G, x: number, y: number, s: number, color: number, alpha = 1): void {
  drawBevel(g, x, y, s, s, color, alpha);
}

/** Texte au style du site : contour brun et ombre dure. */
export function makeText(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: number = PAL.cream,
  o: { font?: string; origin?: [number, number]; stroke?: number; strokeW?: number; shadow?: boolean; align?: "left" | "center" | "right" } = {},
): PhaserType.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: o.font ?? FONT,
    fontSize: `${size}px`,
    color: hex(color),
    stroke: hex(o.stroke ?? PAL.ink0),
    strokeThickness: o.strokeW ?? Math.max(2, Math.round(size * 0.14)),
    align: o.align ?? "left",
  });
  if (o.shadow !== false) t.setShadow(0, Math.max(2, Math.round(size * 0.08)), hex(PAL.ink0), 0, true, true);
  const [ox, oy] = o.origin ?? [0, 0];
  t.setOrigin(ox, oy);
  return t;
}

/** Texte qui jaillit, monte et s'efface (points, combos, bonus). */
export function popText(scene: Scene, x: number, y: number, text: string, size: number, color: number, o: { rise?: number; ms?: number; depth?: number } = {}): void {
  const ms = o.ms ?? 800;
  const t = makeText(scene, x, y, text, size, color, { origin: [0.5, 0.5] }).setDepth(o.depth ?? 90).setScale(0.3);
  scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.Out" });
  scene.tweens.add({ targets: t, y: y - (o.rise ?? 56), alpha: 0, delay: ms * 0.4, duration: ms * 0.6, ease: "Sine.In", onComplete: () => t.destroy() });
}

/** Nombre affiché qui rattrape sa cible en douceur. */
export class Counter {
  shown = 0;
  update(target: number, dtMs: number): number {
    const diff = target - this.shown;
    if (Math.abs(diff) < 0.5) this.shown = target;
    else this.shown += diff * Math.min(1, dtMs / 110);
    return Math.round(this.shown);
  }
  reset(value = 0): void {
    this.shown = value;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
  gravity: number;
}

/** Particules carrées (esprit pixel art), mises à jour au pas réel. */
export class Particles {
  private list: Particle[] = [];

  burst(x: number, y: number, o: { n: number; color: number | number[]; speed?: number; life?: number; size?: number; gravity?: number; angle?: number; spread?: number }): void {
    const colors = Array.isArray(o.color) ? o.color : [o.color];
    for (let i = 0; i < o.n; i++) {
      const spread = o.spread ?? Math.PI * 2;
      const base = o.angle ?? 0;
      const a = o.angle === undefined ? Math.random() * Math.PI * 2 : base + (Math.random() - 0.5) * spread;
      const sp = (o.speed ?? 240) * (0.35 + Math.random() * 0.65);
      const life = (o.life ?? 600) * (0.6 + Math.random() * 0.4);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        size: (o.size ?? 7) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: o.gravity ?? 600,
      });
    }
    if (this.list.length > 500) this.list.splice(0, this.list.length - 500);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.list) {
      p.life -= dtMs;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(g: G): void {
    for (const p of this.list) {
      const k = p.life / p.max;
      const s = Math.max(1, p.size * (0.4 + 0.6 * k));
      g.fillStyle(PAL.ink0, 0.9 * Math.min(1, k * 2));
      g.fillRect(p.x - s / 2 - 1, p.y - s / 2 - 1, s + 2, s + 2);
      g.fillStyle(p.color, Math.min(1, k * 2));
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }

  clear(): void {
    this.list = [];
  }
}

export interface OverlayOpts {
  title: string;
  subtitle?: string;
  lines?: string[];
  button?: string;
  hint?: string;
}

/** Écran superposé (début, pause, fin) : titre, lignes, bouton cliquable ; Espace/Entrée = bouton. */
export class Overlay {
  private root: PhaserType.GameObjects.Container;
  private onPress: () => void = () => undefined;
  visible = false;

  constructor(
    private scene: Scene,
    private w: number,
    private h: number,
  ) {
    this.root = scene.add.container(0, 0).setDepth(300).setVisible(false);
  }

  show(o: OverlayOpts, onPress: () => void): void {
    const s = this.scene;
    this.onPress = onPress;
    this.root.removeAll(true);
    this.visible = true;
    this.root.setVisible(true).setAlpha(0);

    const lines = o.lines ?? [];
    const pw = Math.min(this.w * 0.82, 560);
    const ph = 56 + 78 + (o.subtitle ? 40 : 0) + lines.length * 32 + (o.button ? 100 : 0) + (o.hint ? 44 : 0) + 20;
    const px = (this.w - pw) / 2;
    const py = (this.h - ph) / 2;

    const shade = s.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, PAL.bg, 0.74).setInteractive();
    const g = s.add.graphics();
    drawPanel(g, px, py, pw, ph, { fill: PAL.field, border: PAL.ink0, depth: 10, bw: 6 });
    g.fillStyle(PAL.orange, 1);
    g.fillRect(px + 6, py + 6, pw - 12, 10);
    this.root.add([shade, g]);

    let y = py + 40;
    this.root.add(makeText(s, this.w / 2, y, o.title, 64, PAL.orangeLight, { origin: [0.5, 0], strokeW: 8 }));
    y += 82;
    if (o.subtitle) {
      this.root.add(makeText(s, this.w / 2, y, o.subtitle, 24, PAL.cream, { font: FONT_BODY, origin: [0.5, 0], strokeW: 4 }));
      y += 40;
    }
    for (const line of lines) {
      this.root.add(makeText(s, this.w / 2, y, line, 22, PAL.panel2, { font: FONT_BODY, origin: [0.5, 0], strokeW: 4, shadow: false }));
      y += 32;
    }
    if (o.button) {
      y += 18;
      const bw = Math.min(pw - 80, 320);
      const bh = 64;
      const bx = this.w / 2 - bw / 2;
      const btn = s.add.container(this.w / 2, y + bh / 2);
      const bg = s.add.graphics();
      drawPanel(bg, -bw / 2, -bh / 2, bw, bh, { fill: PAL.orange, border: PAL.ink0, depth: 8, bw: 4 });
      bg.fillStyle(0xffffff, 0.3);
      bg.fillRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, 8);
      const label = makeText(s, 0, -2, o.button, 34, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 });
      btn.add([bg, label]);
      const zone = s.add.zone(bx + bw / 2, y + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        s.tweens.add({ targets: btn, scale: 0.94, duration: 70, yoyo: true });
        tone(520, 0.07, { vol: 0.04, type: "square" });
        this.onPress();
      });
      this.root.add([btn, zone]);
      s.tweens.add({ targets: btn, scale: 1.05, duration: 620, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      y += bh + 24;
    }
    if (o.hint) {
      this.root.add(makeText(s, this.w / 2, y, o.hint, 18, PAL.dim, { font: FONT_BODY, origin: [0.5, 0], strokeW: 3, shadow: false }));
    }
    s.tweens.add({ targets: this.root, alpha: 1, duration: 180, ease: "Sine.Out" });
  }

  hide(): void {
    this.visible = false;
    this.root.setVisible(false);
    this.root.removeAll(true);
  }

  /** Espace/Entrée : même effet que le bouton. */
  activate(): void {
    if (this.visible) this.onPress();
  }
}

export interface PadBtn {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color?: number;
}

/** Boutons à l'écran (tactile) : plusieurs doigts à la fois, appui maintenu ou ponctuel. */
export class TouchPad {
  private down = new Set<string>();
  private prev = new Set<string>();
  private labels = new Map<string, PhaserType.GameObjects.Text>();

  constructor(
    private scene: Scene,
    private buttons: PadBtn[],
  ) {
    scene.input.addPointer(3);
    for (const b of buttons) {
      const t = makeText(scene, b.x + b.w / 2, b.y + b.h / 2 - 2, b.label, Math.min(44, b.h * 0.45), PAL.cream, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(70);
      this.labels.set(b.id, t);
    }
  }

  poll(): void {
    this.prev = new Set(this.down);
    this.down.clear();
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) this.down.add(b.id);
      }
    }
  }

  isDown(id: string): boolean {
    return this.down.has(id);
  }

  pressed(id: string): boolean {
    return this.down.has(id) && !this.prev.has(id);
  }

  draw(g: G): void {
    for (const b of this.buttons) {
      const on = this.down.has(b.id);
      const base = b.color ?? PAL.cap;
      drawPanel(g, b.x, b.y + (on ? 5 : 0), b.w, b.h, { fill: on ? mix(base, 0xffffff, 0.2) : base, depth: on ? 1 : 6, bw: 4 });
      const t = this.labels.get(b.id);
      if (t) t.setY(b.y + b.h / 2 - 2 + (on ? 5 : 0));
    }
  }
}

/** Bouton son (haut-parleur) : clic ou touche M. L'état est mémorisé. */
export class MuteButton {
  private g: G;

  constructor(
    scene: Scene,
    private x: number,
    private y: number,
    private size = 48,
  ) {
    this.g = scene.add.graphics().setDepth(80);
    const zone = scene.add.zone(x + size / 2, y + size / 2, size, size).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.toggle());
    scene.input.keyboard?.on("keydown-M", () => this.toggle());
    this.draw();
  }

  private toggle(): void {
    const muted = toggleMute();
    if (!muted) tone(660, 0.08, { vol: 0.04 });
    this.draw();
  }

  private draw(): void {
    const g = this.g;
    const { x, y, size: s } = this;
    g.clear();
    drawPanel(g, x, y, s, s, { fill: PAL.field, depth: 4, bw: 3 });
    const c = isMuted() ? PAL.dim : PAL.cream;
    const cx = x + s / 2;
    const cy = y + s / 2;
    g.fillStyle(c, 1);
    g.fillRect(cx - 12, cy - 5, 7, 10);
    g.fillTriangle(cx - 5, cy - 5, cx + 5, cy - 13, cx + 5, cy + 13);
    g.fillTriangle(cx - 5, cy - 5, cx + 5, cy + 13, cx - 5, cy + 5);
    if (isMuted()) {
      g.lineStyle(4, PAL.red, 1);
      g.beginPath();
      g.moveTo(cx + 9, cy - 9);
      g.lineTo(cx + 19, cy + 9);
      g.moveTo(cx + 19, cy - 9);
      g.lineTo(cx + 9, cy + 9);
      g.strokePath();
    } else {
      g.lineStyle(3, c, 1);
      g.beginPath();
      g.arc(cx + 5, cy, 9, -0.9, 0.9, false);
      g.strokePath();
      g.beginPath();
      g.arc(cx + 5, cy, 15, -0.9, 0.9, false);
      g.strokePath();
    }
  }
}

/** Met le jeu en pause quand l'onglet perd le focus. */
export function onBlur(scene: Scene, fn: () => void): void {
  scene.game.events.on(Phaser.Core.Events.BLUR, fn);
}
