/**
 * Sprites du site (Écureuil Survivor) réutilisés dans l'arcade : js/game-data.js expose ES_DATA.SPRITES
 * (grilles de lettres + palette, contour sombre ajouté automatiquement). On les transforme en textures
 * Phaser à échelle entière, pour des pixels nets. Si le fichier n'est pas chargé, tout reste silencieux
 * (les jeux se dessinent sans sprites).
 */
import type PhaserType from "phaser";
import { Phaser } from "./engines.js";

type Scene = PhaserType.Scene;
type Img = PhaserType.GameObjects.Image;

interface SpriteDef {
  frames: string[][];
  pal: Record<string, string>;
}

const OUT = "#2b1709";

function defs(): Record<string, SpriteDef> | null {
  const d = (window as unknown as { ES_DATA?: { SPRITES?: Record<string, SpriteDef> } }).ES_DATA;
  return d?.SPRITES ?? null;
}

/** Dessine une image du sprite (+ contour) à l'échelle k dans une nouvelle texture. */
function build(scene: Scene, key: string, rows: string[], pal: Record<string, string>, k: number): void {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const W = w + 2;
  const H = h + 2;
  const filled = new Uint8Array(W * H);
  const tex = scene.textures.createCanvas(key, W * k, H * k);
  if (!tex) return;
  const g = tex.getContext();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch && pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect((x + 1) * k, (y + 1) * k, k, k);
        filled[(y + 1) * W + x + 1] = 1;
      }
    }
  }
  g.fillStyle = OUT;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      const near = (x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) || (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x]);
      if (near) g.fillRect(x * k, y * k, k, k);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Clés de texture (une par image d'animation) d'un sprite du site, créées à la demande. Vide si inconnu. */
export function spriteKeys(scene: Scene, name: string, k = 3): string[] {
  const def = defs()?.[name];
  if (!def) return [];
  return def.frames.map((rows, i) => {
    const key = `es:${name}:${k}:${i}`;
    if (!scene.textures.exists(key)) build(scene, key, rows, def.pal, k);
    return key;
  });
}

export function spriteKey(scene: Scene, name: string, k = 3, frame = 0): string | null {
  return spriteKeys(scene, name, k)[frame] ?? null;
}

export interface DrawOpts {
  scale?: number;
  rotation?: number;
  flip?: boolean;
  alpha?: number;
  tint?: number;
}

/** Réserve d'images réutilisées à chaque frame : on appelle begin(), draw() autant de fois que voulu, puis end(). */
export class SpritePool {
  private list: Img[] = [];
  private used = 0;

  constructor(
    private scene: Scene,
    private depth: number,
    private ox = 0,
    private oy = 0,
  ) {}

  begin(): void {
    this.used = 0;
  }

  draw(key: string | null, x: number, y: number, o: DrawOpts = {}): void {
    if (!key) return;
    let img = this.list[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, key).setDepth(this.depth);
      this.list.push(img);
    }
    this.used++;
    const s = o.scale ?? 1;
    img.setTexture(key).setPosition(x + this.ox, y + this.oy).setRotation(o.rotation ?? 0).setScale(o.flip ? -s : s, s).setAlpha(o.alpha ?? 1).setVisible(true);
    if (o.tint !== undefined) img.setTint(o.tint);
    else img.clearTint();
  }

  end(): void {
    for (let i = this.used; i < this.list.length; i++) this.list[i].setVisible(false);
  }
}

/** Écureuil du site qui vit dans un coin de l'écran : respire, saute de joie, déprime. */
export class Mascot {
  private img: Img | null = null;
  private frames: string[] = [];
  private t = 0;
  private frame = 0;

  constructor(
    private scene: Scene,
    public name: string,
    private x: number,
    private y: number,
    private k = 4,
    private depth = 6,
  ) {
    this.set(name);
  }

  /** Change d'écureuil (le site en a une quinzaine). */
  set(name: string): void {
    this.name = name;
    this.frames = spriteKeys(this.scene, name, this.k);
    if (this.frames.length === 0) return;
    if (!this.img) this.img = this.scene.add.image(this.x, this.y, this.frames[0]).setDepth(this.depth).setOrigin(0.5, 1);
    else this.img.setTexture(this.frames[0]);
    this.frame = 0;
  }

  update(dtMs: number): void {
    if (!this.img || this.frames.length < 2) return;
    this.t += dtMs;
    if (this.t > 520) {
      this.t = 0;
      this.frame = (this.frame + 1) % this.frames.length;
      this.img.setTexture(this.frames[this.frame]);
    }
  }

  /** Petit saut de joie. */
  cheer(): void {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.img.setY(this.y).setAngle(0);
    this.scene.tweens.add({ targets: this.img, y: this.y - 26, duration: 130, yoyo: true, repeat: 1, ease: "Quad.Out", onComplete: () => this.img?.setY(this.y) });
  }

  /** Penché, dépité. */
  sad(): void {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.scene.tweens.add({ targets: this.img, angle: 18, y: this.y + 6, duration: 300, ease: "Sine.Out" });
  }

  /** Remet l'écureuil droit (nouvelle partie). */
  reset(): void {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.img.setAngle(0).setY(this.y);
  }
}

/** Les écureuils du site, pour changer de mascotte au fil de la partie. */
export const SQUIRREL_NAMES = ["sq_noisette", "sq_pip", "sq_pop", "sq_cendrine", "sq_flocon", "sq_charbon", "sq_planeur", "sq_capitaine"];
