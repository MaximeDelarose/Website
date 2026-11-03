/**
 * Scène de fond, toujours active sous les autres : décor du chapitre en
 * couches (profondeur), particules d'ambiance (pétales, pluie, étoiles…),
 * fondu enchaîné quand le thème change.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { drawBackground, type Theme, type Layer } from '../art/scenes';
import { heartPath, paint, sparkle, texScale, PAL, ellipse } from '../art/kit';
import { reducedFx } from '../../core/app';

type Particle = 'petal' | 'rain' | 'star' | 'heart' | 'gold' | 'bokeh';

const PARTICLES: Record<Theme, Particle[]> = {
  title: ['petal', 'star'],
  garden: ['petal'],
  paris: ['rain', 'bokeh'],
  souvenirs: ['heart', 'petal'],
  royaume: ['gold', 'star'],
  monde: ['star', 'gold', 'heart'],
};

export class BackdropScene extends BaseScene {
  static KEY = 'backdrop';
  theme: Theme = 'title';
  private layers: Phaser.GameObjects.Image[] = [];
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private t = 0;
  private dim!: Phaser.GameObjects.Rectangle;

  constructor() { super(BackdropScene.KEY); }

  create(): void {
    this.initLayout();
    this.makeParticleTextures();
    this.dim = this.add.rectangle(0, 0, 10, 10, 0x3b3152, 0).setOrigin(0).setDepth(50);
    this.buildLayers(false);
  }

  /** Change de décor avec un fondu. */
  setTheme(theme: Theme): void {
    if (theme === this.theme && this.layers.length) return;
    this.theme = theme;
    this.buildLayers(true);
  }

  /** Assombrit le décor (derrière des menus, pendant la scène finale…). */
  setDim(alpha: number, ms = 400): void {
    this.tweens.add({ targets: this.dim, fillAlpha: alpha, duration: ms });
  }

  private bgKey(layer: Layer) { return `bg:${this.theme}:${layer}:${this.W}x${this.H}`; }

  private buildLayers(fade: boolean): void {
    const old = this.layers;
    const oldEm = this.emitters;
    this.layers = [];
    this.emitters = [];
    const s = texScale();
    (['far', 'mid', 'near'] as Layer[]).forEach((layer, i) => {
      const key = this.bgKey(layer);
      if (!this.textures.exists(key)) {
        // un peu plus grand que l'écran pour le léger mouvement de parallaxe
        const w = this.W + 24;
        const h = this.H + 24;
        this.textures.addCanvas(key, paint(w, h, Math.min(2, s), (ctx) => drawBackground(ctx, this.theme, w, h, layer)));
      }
      const img = this.add.image(-12, -12, key).setOrigin(0).setScale(1 / Math.min(2, s)).setDepth(i * 10);
      if (fade) { img.setAlpha(0); this.tweens.add({ targets: img, alpha: 1, duration: 700 }); }
      this.layers.push(img);
    });
    this.startParticles();
    const cleanup = () => {
      old.forEach((o) => o.destroy());
      oldEm.forEach((e) => e.destroy());
    };
    if (fade && old.length) {
      oldEm.forEach((e) => e.stop());
      this.tweens.add({ targets: old, alpha: 0, duration: 700, onComplete: cleanup });
    } else cleanup();
  }

  private makeParticleTextures(): void {
    const mk = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      if (!this.textures.exists(key)) this.textures.addCanvas(key, paint(w, h, texScale(), draw));
    };
    mk('p:petal', 16, 12, (c) => { ellipse(c, 8, 6, 7, 4.2, 0.3); c.fillStyle = '#FFB3CB'; c.fill(); ellipse(c, 6, 5, 3, 1.4, 0.3); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill(); });
    mk('p:rain', 2, 18, (c) => { const g = c.createLinearGradient(0, 0, 0, 18); g.addColorStop(0, 'rgba(220,225,255,0)'); g.addColorStop(1, 'rgba(220,225,255,0.7)'); c.fillStyle = g; c.fillRect(0, 0, 2, 18); });
    mk('p:star', 14, 14, (c) => sparkle(c, 7, 7, 6.5, '#FFF8E0'));
    mk('p:heart', 16, 16, (c) => { heartPath(c, 8, 8.5, 14); c.fillStyle = PAL.roseVif; c.globalAlpha = 0.8; c.fill(); });
    mk('p:gold', 10, 10, (c) => { const g = c.createRadialGradient(5, 5, 0, 5, 5, 5); g.addColorStop(0, '#FFF3C4'); g.addColorStop(1, 'rgba(243,200,107,0)'); c.fillStyle = g; c.fillRect(0, 0, 10, 10); });
    mk('p:bokeh', 40, 40, (c) => { const g = c.createRadialGradient(20, 20, 0, 20, 20, 20); g.addColorStop(0, 'rgba(255,214,150,0.55)'); g.addColorStop(0.6, 'rgba(255,190,130,0.18)'); g.addColorStop(1, 'rgba(255,190,130,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 40); });
  }

  private startParticles(): void {
    const low = reducedFx();
    const k = 1 / texScale();
    for (const p of PARTICLES[this.theme]) {
      let cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
      switch (p) {
        case 'petal':
          cfg = { x: { min: -20, max: this.W + 20 }, y: -20, lifespan: 9000, speedY: { min: 30, max: 60 }, speedX: { min: -20, max: 25 }, rotate: { start: 0, end: 360 }, scale: { min: k * 0.7, max: k * 1.2 }, alpha: { start: 0.9, end: 0.3 }, frequency: low ? 900 : 380, quantity: 1 };
          break;
        case 'rain':
          cfg = { x: { min: -40, max: this.W + 40 }, y: -30, lifespan: 1400, speedY: { min: 520, max: 680 }, speedX: -60, rotate: 6, scale: k, alpha: { start: 0.55, end: 0.15 }, frequency: low ? 70 : 22, quantity: 1 };
          break;
        case 'star':
          cfg = { x: { min: 0, max: this.W }, y: { min: 0, max: this.H * 0.75 }, lifespan: 2600, scale: { start: 0, end: k * 1.1, ease: 'Sine.easeInOut', yoyo: true } as never, alpha: { start: 1, end: 0 }, frequency: low ? 700 : 260, quantity: 1 };
          break;
        case 'heart':
          cfg = { x: { min: 0, max: this.W }, y: this.H + 20, lifespan: 9000, speedY: { min: -60, max: -30 }, speedX: { min: -15, max: 15 }, scale: { min: k * 0.6, max: k * 1.1 }, alpha: { start: 0.7, end: 0 }, frequency: low ? 1400 : 650, quantity: 1 };
          break;
        case 'gold':
          cfg = { x: { min: 0, max: this.W }, y: { min: 0, max: this.H }, lifespan: 4000, speedY: { min: -20, max: -5 }, scale: { min: k * 0.8, max: k * 1.6 }, alpha: { start: 0, end: 1, ease: 'Sine.easeInOut', yoyo: true } as never, frequency: low ? 600 : 200, quantity: 1 };
          break;
        case 'bokeh':
          cfg = { x: { min: 0, max: this.W }, y: { min: this.H * 0.2, max: this.H * 0.8 }, lifespan: 6000, scale: { min: k * 0.6, max: k * 1.8 }, alpha: { start: 0, end: 0.8, ease: 'Sine.easeInOut', yoyo: true } as never, frequency: low ? 1500 : 600, quantity: 1 };
          break;
      }
      const em = this.add.particles(0, 0, `p:${p}`, cfg).setDepth(25);
      this.emitters.push(em);
    }
  }

  override update(_t: number, dt: number): void {
    this.t += dt / 1000;
    if (reducedFx()) return;
    // léger mouvement de profondeur
    const [, mid, near] = this.layers;
    if (mid) mid.x = -12 + Math.sin(this.t * 0.25) * 4;
    if (near) near.x = -12 + Math.sin(this.t * 0.25) * 8;
  }

  layout(): void {
    this.dim.setSize(this.W, this.H);
    this.buildLayers(false);
  }
}
