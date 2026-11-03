/**
 * Scène finale (animée) : Auguste arrive jusqu'à Radia, un miroir magique
 * apparaît puis révèle son plus beau trésor.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { drawAugusteFull, drawRadiaFull, drawRadiaPortrait, type Outfit } from '../art/characters';
import { OUTLINE, PAL, ellipse, heartPath, sparkle, texScale, paint } from '../art/kit';
import { ensureFxTextures } from '../merge/textures';
import { audio, reducedFx } from '../../core/app';
import type { Expr } from '../../data/dialogue';

export class FinalScene extends BaseScene {
  static KEY = 'final';
  private radia!: Phaser.GameObjects.Image;
  private auguste!: Phaser.GameObjects.Image;
  private mirror: Phaser.GameObjects.Container | null = null;
  private outfit: Outfit = 'royal';
  private walkT = 0;
  private walking = false;
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super(FinalScene.KEY); }

  init(data: { outfit?: Outfit }): void { this.outfit = data.outfit ?? 'royal'; this.mirror = null; this.walking = false; }

  create(): void {
    this.initLayout();
    ensureFxTextures(this);
    for (const e of ['smile', 'love', 'surprise', 'shy'] as Expr[]) this.charTex('radia', e, 0);
    for (const st of [-1, -0.5, 0, 0.5, 1]) this.charTex('auguste', 'smile', st);
    this.charTex('auguste', 'love', 0);
    this.charTex('auguste', 'shy', 0);
    this.radia = this.add.image(0, 0, this.key('radia', 'smile', 0)).setOrigin(0.5, 1);
    this.auguste = this.add.image(0, 0, this.key('auguste', 'smile', 0)).setOrigin(0.5, 1).setVisible(false);
    this.hearts = this.add.particles(0, 0, 'fx:heart', {
      x: { min: 0, max: 400 }, y: 900, lifespan: 7000, speedY: { min: -70, max: -35 }, speedX: { min: -12, max: 12 },
      scale: { min: 0.8 / texScale(), max: 1.4 / texScale() }, alpha: { start: 0.9, end: 0 }, frequency: reducedFx() ? 900 : 300, emitting: false,
    }).setDepth(5);
    this.layout();
    // Radia apparaît doucement
    this.radia.setAlpha(0);
    this.tweens.add({ targets: this.radia, alpha: 1, duration: 900 });
    this.tweens.add({ targets: this.radia, scaleY: this.radia.scaleY * 1.012, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });
  }

  private key(who: string, e: string, st: number) { return `fin:${who}:${e}:${st}:${this.outfit}`; }

  private charTex(who: 'radia' | 'auguste', expr: Expr, step: number): void {
    const k = this.key(who, expr, step);
    if (this.textures.exists(k)) return;
    this.textures.addCanvas(k, paint(240, 600, Math.min(2, texScale()), (ctx) => {
      if (who === 'radia') drawRadiaFull(ctx, { expr, outfit: this.outfit });
      else drawAugusteFull(ctx, { expr, step });
    }));
  }

  layout(): void {
    const s = Math.min(this.H * 0.44, this.W * 1.0) / 600;
    const baseY = this.H * 0.8;
    this.radia.setDisplaySize(240 * s, 600 * s);
    if (!this.mirror) this.radia.setPosition(this.W * 0.33, baseY);
    else this.radia.y = baseY;
    this.auguste.setDisplaySize(240 * s, 600 * s);
    if (!this.walking) this.auguste.setPosition(this.auguste.visible ? this.W * 0.67 : this.W + 120, baseY);
    this.auguste.y = baseY;
    this.hearts.updateConfig({ x: { min: 0, max: this.W }, y: this.H + 20 });
    if (this.mirror) this.mirror.setPosition(this.W / 2, this.H * 0.4);
  }

  setExpr(who: 'radia' | 'auguste', e: Expr): void {
    const o = who === 'radia' ? this.radia : this.auguste;
    const k = this.key(who, e, 0);
    if (!this.textures.exists(k)) this.charTex(who, e, 0);
    const w = o.displayWidth;
    const h = o.displayHeight;
    o.setTexture(k).setDisplaySize(w, h);
  }

  /** Auguste entre par la droite et marche jusqu'à Radia. */
  augusteEnters(): Promise<void> {
    return new Promise((resolve) => {
      const baseY = this.H * 0.8;
      this.auguste.setVisible(true).setPosition(this.W + 100, baseY);
      this.walking = true;
      this.walkT = 0;
      audio.play('whoosh');
      this.tweens.add({
        targets: this.auguste, x: this.W * 0.67, duration: 2600, ease: 'Sine.easeOut',
        onComplete: () => {
          this.walking = false;
          this.setExpr('auguste', 'smile');
          this.setExpr('radia', 'surprise');
          this.time.delayedCall(600, () => { this.setExpr('radia', 'smile'); resolve(); });
        },
      });
    });
  }

  override update(_t: number, dt: number): void {
    if (!this.walking) return;
    this.walkT += dt / 1000;
    const frames = [-1, -0.5, 0, 0.5, 1, 0.5, 0, -0.5];
    const f = frames[Math.floor(this.walkT * 9) % frames.length];
    const w = this.auguste.displayWidth;
    const h = this.auguste.displayHeight;
    this.auguste.setTexture(this.key('auguste', 'smile', f)).setDisplaySize(w, h);
    this.auguste.y = this.H * 0.8 - Math.abs(Math.sin(this.walkT * 9 * Math.PI / 4)) * 3;
  }

  /** Un cœur flotte entre eux, des cœurs montent. */
  heartsRise(on: boolean): void {
    if (on) this.hearts.start(); else this.hearts.stop();
  }

  /** Le miroir magique apparaît au centre. */
  showMirror(): Promise<void> {
    return new Promise((resolve) => {
      const mw = Math.min(this.W * 0.54, 240);
      const mh = mw * 1.32;
      const frameKey = `mirror:${Math.round(mw)}`;
      if (!this.textures.exists(frameKey)) this.textures.addCanvas(frameKey, paint(mw + 40, mh + 60, texScale(), (ctx) => drawMirrorFrame(ctx, mw, mh)));
      const glassKey = `mirrorGlass:${Math.round(mw)}`;
      if (!this.textures.exists(glassKey)) this.textures.addCanvas(glassKey, paint(mw, mh, texScale(), (ctx) => drawMirrorGlass(ctx, mw, mh)));
      const c = this.add.container(this.W / 2, this.H * 0.4).setDepth(20);
      const halo = this.add.image(0, 0, 'fx:light').setScale((mw * 2.4) / 40 / texScale()).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
      const glass = this.add.image(0, 0, glassKey).setDisplaySize(mw * 0.84, mh * 0.84).setName('glass');
      const frame = this.add.image(0, 10, frameKey).setDisplaySize(mw + 40, mh + 60);
      c.add([halo, glass, frame]);
      c.setScale(0).setAlpha(0);
      this.mirror = c;
      // les personnages s'écartent un peu
      this.tweens.add({ targets: this.radia, x: this.W * 0.18, alpha: 0.75, duration: 900, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.auguste, x: this.W * 0.82, alpha: 0.75, duration: 900, ease: 'Sine.easeInOut' });
      audio.play('rare');
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 1100, ease: 'Back.easeOut', delay: 300, onComplete: () => resolve() });
      this.tweens.add({ targets: halo, alpha: 0.25, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: c, y: this.H * 0.4 - 6, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.easeInOut', delay: 1400 });
      this.sparkleAround(this.W / 2, this.H * 0.4, mw * 0.7, 14);
    });
  }

  /** Le reflet devient le visage de Radia. */
  revealMirror(): Promise<void> {
    return new Promise((resolve) => {
      const c = this.mirror;
      if (!c) { resolve(); return; }
      const glass = c.getByName('glass') as Phaser.GameObjects.Image;
      const gw = glass.displayWidth;
      const gh = glass.displayHeight;
      const pk = `mirrorRadia:${Math.round(gw)}:${this.outfit}`;
      if (!this.textures.exists(pk)) {
        this.textures.addCanvas(pk, paint(gw, gh, texScale(), (ctx) => {
          ctx.save();
          ellipse(ctx, gw / 2, gh / 2, gw / 2, gh / 2);
          ctx.clip();
          const g = ctx.createLinearGradient(0, 0, 0, gh);
          g.addColorStop(0, '#FFE4EE');
          g.addColorStop(1, '#D9CDF5');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, gw, gh);
          const k = (gw * 1.05) / 400;
          ctx.translate(gw / 2 - 200 * k, gh * 0.12);
          ctx.scale(k, k);
          drawRadiaPortrait(ctx, { expr: 'love', outfit: this.outfit });
          ctx.restore();
        }));
      }
      const face = this.add.image(0, 0, pk).setDisplaySize(gw, gh).setAlpha(0);
      c.addAt(face, 2);
      const flash = this.add.image(0, 0, 'fx:flash').setBlendMode(Phaser.BlendModes.ADD).setScale(0.3 / texScale());
      c.add(flash);
      audio.play('chest');
      this.tweens.add({ targets: flash, scale: (gw * 2) / 96 / texScale(), alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
      this.tweens.add({ targets: face, alpha: 1, duration: 1400, delay: 200, ease: 'Sine.easeInOut', onComplete: () => resolve() });
      this.sparkleAround(c.x, c.y, gw * 0.6, 22);
      this.heartsRise(true);
    });
  }

  /** Final : tout le monde se rapproche, pluie de cœurs et d'étoiles. */
  finaleGlow(): void {
    if (this.mirror) this.tweens.add({ targets: this.mirror, alpha: 0, scale: 0.6, duration: 900, onComplete: () => { this.mirror?.destroy(); this.mirror = null; } });
    this.setExpr('radia', 'love');
    this.setExpr('auguste', 'love');
    this.tweens.add({ targets: this.radia, x: this.W * 0.38, alpha: 1, duration: 1200, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.auguste, x: this.W * 0.62, alpha: 1, duration: 1200, ease: 'Sine.easeInOut' });
    this.heartsRise(true);
    this.time.delayedCall(1300, () => {
      const hk = 'fin:bigheart';
      if (!this.textures.exists(hk)) this.textures.addCanvas(hk, paint(64, 64, texScale(), (ctx) => { heartPath(ctx, 32, 33, 56); const g = ctx.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#FF9CC0'); g.addColorStop(1, PAL.roseDeep); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = OUTLINE; ctx.stroke(); sparkle(ctx, 22, 22, 7); }));
      const h = this.add.image(this.W / 2, this.H * 0.8 - this.radia.displayHeight * 0.9, hk).setScale(0).setDepth(15);
      this.tweens.add({ targets: h, scale: 1.1 / texScale() * 1.6, duration: 700, ease: 'Back.easeOut' });
      this.tweens.add({ targets: h, scale: 1.25 / texScale() * 1.6, yoyo: true, repeat: -1, duration: 600, delay: 700, ease: 'Sine.easeInOut' });
      this.sparkleAround(h.x, h.y, 60, 16);
      audio.play('heart');
    });
  }

  private sparkleAround(x: number, y: number, r: number, n: number): void {
    if (reducedFx()) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * (0.6 + Math.random() * 0.6);
      const s = this.add.image(x + Math.cos(a) * d, y + Math.sin(a) * d, k % 2 ? 'fx:sparkGold' : 'fx:spark').setScale(0).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, scale: (0.6 + Math.random() * 0.6) / texScale() * 1.6, yoyo: true, duration: 500 + Math.random() * 500, delay: Math.random() * 700, onComplete: () => s.destroy() });
    }
  }
}

function drawMirrorFrame(ctx: CanvasRenderingContext2D, mw: number, mh: number): void {
  const cx = (mw + 40) / 2;
  const cy = (mh + 60) / 2 - 10;
  // cadre doré ornemental
  ctx.save();
  // anneau : les deux ellipses dans le même chemin, remplies en pair-impair
  ctx.beginPath();
  ctx.ellipse(cx, cy, mw / 2 + 4, mh / 2 + 4, 0, 0, Math.PI * 2);
  ctx.moveTo(cx + mw * 0.42, cy);
  ctx.ellipse(cx, cy, mw * 0.42, mh * 0.42, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, 0, mw, mh);
  g.addColorStop(0, '#FFF0C2');
  g.addColorStop(0.5, PAL.or);
  g.addColorStop(1, PAL.orDeep);
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ellipse(ctx, cx, cy, mw / 2 + 4, mh / 2 + 4);
  ctx.stroke();
  ellipse(ctx, cx, cy, mw * 0.42, mh * 0.42);
  ctx.stroke();
  // perles
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const x = cx + Math.cos(a) * mw * 0.46;
    const y = cy + Math.sin(a) * mh * 0.46;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF8E0';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // cœur au sommet et pied
  heartPath(ctx, cx, cy - mh / 2 - 2, 34);
  ctx.fillStyle = PAL.roseVif;
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy + mh / 2 + 2);
  ctx.quadraticCurveTo(cx, cy + mh / 2 + 34, cx + 26, cy + mh / 2 + 2);
  ctx.closePath();
  ctx.fillStyle = PAL.orDeep;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMirrorGlass(ctx: CanvasRenderingContext2D, mw: number, mh: number): void {
  ellipse(ctx, mw / 2, mh / 2, mw / 2, mh / 2);
  const g = ctx.createLinearGradient(0, 0, mw, mh);
  g.addColorStop(0, '#EDE6FF');
  g.addColorStop(0.5, '#C9B8F0');
  g.addColorStop(1, '#9C88D6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(mw * 0.15, mh * 0.1);
  ctx.lineTo(mw * 0.35, mh * 0.1);
  ctx.lineTo(mw * 0.05, mh * 0.7);
  ctx.lineTo(-mw * 0.1, mh * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let k = 0; k < 6; k++) sparkle(ctx, mw * (0.2 + (k * 0.13) % 0.6), mh * (0.2 + ((k * 0.37) % 0.6)), 5 + (k % 3) * 2, '#FFFFFF', 0.8);
  ctx.restore();
}
