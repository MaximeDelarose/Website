/**
 * « Le chemin des deux cœurs » : toucher une dalle la fait tourner d'un quart
 * de tour ; toucher une fleur-levier retire les ronces. Quand le chemin relie
 * les deux cœurs, ils se rejoignent au milieu. 4 tableaux de difficulté croissante.
 */
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';
import { PAL, heartPath, roundRect, gloss, OUTLINE, shade, ellipse, glow } from '../art/kit';
import { audio, reducedFx } from '../../core/app';
import {
  makePathLevels, mask, rotatable, rotate, pullLever, reach, isConnected, pathAtoB, N, E, S, W, type PathLevel,
} from './logic/path';
import { fxTextures, burst } from './fx';
import type { MinigameHost } from './index';

const TEX = 96; // taille logique des textures de dalle

/** Dessine les ouvertures d'une dalle (ruban arrondi), allumé ou non. */
function drawPipe(c: CanvasRenderingContext2D, m: number, lit: boolean) {
  const s = TEX;
  const mid = s / 2;
  const ends: [number, number][] = [];
  if (m & N) ends.push([mid, 0]);
  if (m & E) ends.push([s, mid]);
  if (m & S) ends.push([mid, s]);
  if (m & W) ends.push([0, mid]);
  const stroke = (w: number, col: string) => {
    c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round';
    for (const [x, y] of ends) { c.beginPath(); c.moveTo(mid, mid); c.lineTo(x, y); c.stroke(); }
    c.beginPath(); c.arc(mid, mid, w / 2, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  };
  stroke(30, OUTLINE);
  stroke(24, lit ? '#FFE7A0' : '#E9D9F7');
  stroke(12, lit ? PAL.roseVif : PAL.lavande);
  if (lit) {
    c.save();
    c.globalAlpha = 0.6;
    stroke(4, '#FFFFFF');
    c.restore();
  }
}

export class PathScene extends BaseScene {
  private host!: MinigameHost;
  private levels: PathLevel[] = [];
  private li = 0;
  private lv!: PathLevel;
  private cell = 60;
  private ox = 0;
  private oy = 0;
  private objs: Phaser.GameObjects.Container[] = [];
  private pipes: (Phaser.GameObjects.Image | null)[] = [];
  private brambles = new Map<number, Phaser.GameObjects.Image>();
  private board!: Phaser.GameObjects.Graphics;
  private busy = false;
  private spin = new Map<number, Phaser.Tweens.Tween>();
  private taps = 0;
  private totalTaps = 0;
  private done = false;

  init(data: { host: MinigameHost }): void {
    this.host = data.host;
    this.levels = makePathLevels();
    this.li = 0;
    this.totalTaps = 0;
    this.done = false;
    this.busy = false;
  }

  create(): void {
    this.initLayout();
    fxTextures(this);
    this.makeTextures();
    this.board = this.add.graphics().setDepth(1);
    this.startLevel(false);
  }

  private makeTextures(): void {
    for (let m = 0; m < 16; m++) {
      this.tex(`mg:pipe:${m}`, TEX, TEX, (c) => drawPipe(c, m, false));
      this.tex(`mg:pipe:${m}:on`, TEX, TEX, (c) => drawPipe(c, m, true));
    }
    this.tex('mg:slab', TEX, TEX, (c) => {
      roundRect(c, 3, 4, TEX - 6, TEX - 6, 16);
      c.fillStyle = 'rgba(81,68,109,0.25)'; c.fill();
      roundRect(c, 3, 2, TEX - 6, TEX - 7, 16);
      const g = c.createLinearGradient(0, 0, TEX, TEX);
      g.addColorStop(0, '#FFFBF6'); g.addColorStop(1, '#F6E3D3');
      c.fillStyle = g; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = 'rgba(88,67,63,0.55)'; c.stroke();
    });
    this.tex('mg:slab:fixed', TEX, TEX, (c) => {
      roundRect(c, 3, 2, TEX - 6, TEX - 7, 16);
      const g = c.createLinearGradient(0, 0, TEX, TEX);
      g.addColorStop(0, '#FFE4EE'); g.addColorStop(1, PAL.rose);
      c.fillStyle = g; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = 'rgba(88,67,63,0.55)'; c.stroke();
    });
    this.tex('mg:heart', TEX, TEX, (c) => {
      glow(c, TEX / 2, TEX / 2, TEX * 0.48, '#FFB3CB', 0.7);
      heartPath(c, TEX / 2, TEX / 2 + 3, TEX * 0.62);
      const g = c.createLinearGradient(0, 10, 0, TEX - 10);
      g.addColorStop(0, '#FF9CC2'); g.addColorStop(1, PAL.roseDeep);
      c.fillStyle = g; c.fill();
      c.lineWidth = 3.5; c.strokeStyle = OUTLINE; c.stroke();
      gloss(c, TEX * 0.36, TEX * 0.36, 9, 5, 0.75, -0.6);
    });
    this.tex('mg:rock', TEX, TEX, (c) => {
      ellipse(c, TEX / 2, TEX * 0.78, TEX * 0.34, TEX * 0.08);
      c.fillStyle = 'rgba(81,68,109,0.25)'; c.fill();
      c.beginPath();
      c.moveTo(TEX * 0.2, TEX * 0.74); c.quadraticCurveTo(TEX * 0.16, TEX * 0.4, TEX * 0.42, TEX * 0.28);
      c.quadraticCurveTo(TEX * 0.7, TEX * 0.2, TEX * 0.8, TEX * 0.5); c.quadraticCurveTo(TEX * 0.86, TEX * 0.74, TEX * 0.2, TEX * 0.74);
      const g = c.createLinearGradient(0, TEX * 0.2, 0, TEX * 0.8);
      g.addColorStop(0, '#D7CDE6'); g.addColorStop(1, '#9A8DB0');
      c.fillStyle = g; c.fill();
      c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
      gloss(c, TEX * 0.42, TEX * 0.4, 9, 4, 0.6, -0.4);
    });
    this.tex('mg:bramble', TEX, TEX, (c) => {
      c.lineCap = 'round';
      const vine = (pts: [number, number][], w: number, col: string) => {
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i += 2) c.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        c.lineWidth = w; c.strokeStyle = col; c.stroke();
      };
      const vines: [number, number][][] = [
        [[8, 20], [50, 0], [88, 30], [60, 60], [90, 88]],
        [[10, 80], [40, 40], [86, 54], [70, 20], [40, 10]],
        [[20, 50], [48, 90], [80, 70]],
      ];
      for (const v of vines) { vine(v, 11, OUTLINE); vine(v, 7, '#6E8E52'); }
      c.fillStyle = OUTLINE;
      for (const [x, y] of [[30, 16], [70, 40], [46, 64], [22, 74], [80, 76], [60, 14]] as const) {
        c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 4, y + 2); c.lineTo(x - 4, y + 2); c.closePath(); c.fill();
      }
      for (const [x, y] of [[50, 30], [28, 56], [74, 62]] as const) {
        c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fillStyle = PAL.rose; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUTLINE; c.stroke();
      }
    });
    this.tex('mg:lever', TEX, TEX, (c) => {
      // fleur-bouton
      const cx = TEX / 2, cy = TEX / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ellipse(c, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 15, 11, a);
        c.fillStyle = shade(PAL.or, 0.25); c.fill();
        c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke();
      }
      c.beginPath(); c.arc(cx, cy, 13, 0, Math.PI * 2);
      c.fillStyle = PAL.roseVif; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke();
      gloss(c, cx - 4, cy - 5, 5, 3, 0.7, -0.5);
    });
  }

  private computeBoard(): void {
    const top = this.safe.top + 80;
    const bottom = this.H - this.safe.bottom - 96;
    const availW = Math.min(this.W - 28, 440);
    const availH = bottom - top;
    this.cell = Math.floor(Math.min(availW / this.lv.w, availH / this.lv.h, 84));
    this.ox = (this.W - this.cell * this.lv.w) / 2;
    this.oy = top + (availH - this.cell * this.lv.h) / 2;
  }

  private center(i: number) {
    return { x: this.ox + (i % this.lv.w + 0.5) * this.cell, y: this.oy + (Math.floor(i / this.lv.w) + 0.5) * this.cell };
  }

  private startLevel(announce: boolean): void {
    this.lv = this.levels[this.li];
    this.taps = 0;
    this.busy = false;
    this.spin.clear();
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.pipes = [];
    this.brambles.clear();
    this.computeBoard();
    this.lv.tiles.forEach((t, i) => {
      const parts: Phaser.GameObjects.GameObject[] = [];
      const slabKey = t.kind === 'heartA' || t.kind === 'heartB' ? 'mg:slab:fixed' : 'mg:slab';
      if (t.kind !== 'empty' || t.lever !== undefined) parts.push(this.add.image(0, 0, slabKey).setDisplaySize(this.cell, this.cell));
      let pipe: Phaser.GameObjects.Image | null = null;
      if (t.kind === 'pipe' || t.kind === 'heartA' || t.kind === 'heartB') {
        pipe = this.add.image(0, 0, `mg:pipe:${mask(t)}`).setDisplaySize(this.cell, this.cell);
        parts.push(pipe);
      }
      if (t.kind === 'heartA' || t.kind === 'heartB') parts.push(this.add.image(0, 0, 'mg:heart').setDisplaySize(this.cell * 0.82, this.cell * 0.82));
      if (t.kind === 'rock') parts.push(this.add.image(0, 0, 'mg:rock').setDisplaySize(this.cell, this.cell));
      if (t.lever !== undefined) parts.push(this.add.image(0, 0, 'mg:lever').setDisplaySize(this.cell * 0.9, this.cell * 0.9));
      if (t.bramble !== undefined) {
        const b = this.add.image(0, 0, 'mg:bramble').setDisplaySize(this.cell, this.cell);
        parts.push(b);
        this.brambles.set(i, b);
      }
      const { x, y } = this.center(i);
      const c = this.add.container(x, y, parts).setDepth(5).setSize(this.cell, this.cell);
      if (rotatable(t) || t.lever !== undefined || t.bramble !== undefined) {
        c.setInteractive({ useHandCursor: true });
        c.on('pointerdown', () => this.onTap(i));
      }
      // apparition en vague
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 260, delay: 20 * ((i % this.lv.w) + Math.floor(i / this.lv.w)), ease: 'Back.easeOut' });
      this.objs.push(c);
      this.pipes.push(pipe);
    });
    this.drawBoard();
    this.refreshLit();
    if (announce) this.host.banner(`${this.li + 1} / ${this.levels.length} · ${this.lv.title}`, true);
    this.updateHud();
  }

  private drawBoard(): void {
    const g = this.board;
    g.clear();
    const pad = 10;
    g.fillStyle(0xb9a5e8, 0.42);
    g.fillRoundedRect(this.ox - pad, this.oy - pad, this.cell * this.lv.w + pad * 2, this.cell * this.lv.h + pad * 2, 20);
    g.lineStyle(3, 0xfff4e8, 0.9);
    g.strokeRoundedRect(this.ox - pad, this.oy - pad, this.cell * this.lv.w + pad * 2, this.cell * this.lv.h + pad * 2, 20);
  }

  private updateHud(): void {
    const hasGate = this.lv.tiles.some((t) => t.bramble !== undefined);
    const tip = hasGate ? 'Des ronces ? Touche la fleur dorée pour les retirer.' : 'Touche une dalle pour la tourner.';
    this.host.setHud(`<b>${this.li + 1}/${this.levels.length} · ${this.lv.title}</b><br>${tip}`);
  }

  private onTap(i: number): void {
    if (this.busy || this.done) return;
    const t = this.lv.tiles[i];
    const c = this.objs[i];
    if (t.lever !== undefined) {
      const freed = pullLever(this.lv, i);
      this.taps++;
      audio.play('chest');
      this.tweens.add({ targets: c, scale: 0.85, duration: 90, yoyo: true });
      const lever = c.list[c.list.length - 1] as Phaser.GameObjects.Image;
      this.tweens.add({ targets: lever, alpha: 0, angle: 180, duration: 400, onComplete: () => lever.setVisible(false) });
      c.disableInteractive();
      for (const f of freed) {
        const b = this.brambles.get(f);
        if (b) {
          this.tweens.add({ targets: b, alpha: 0, scale: b.scale * 1.4, duration: 380, onComplete: () => b.destroy() });
          const p = this.center(f);
          if (!reducedFx()) burst(this, p.x, p.y, 8, 30);
          this.brambles.delete(f);
        }
      }
      this.afterChange();
      this.updateHud();
      return;
    }
    if (t.bramble !== undefined) {
      audio.play('invalid');
      this.tweens.add({ targets: c, x: c.x + 4, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    if (!rotatable(t)) return;
    // un toucher pendant l'animation précédente la termine aussitôt (aucun toucher perdu)
    this.spin.get(i)?.complete();
    if (this.busy || this.done) return;
    rotate(this.lv, i);
    this.taps++;
    audio.play('move', 1.1);
    const pipe = this.pipes[i]!;
    pipe.setAngle(0);
    const tw = this.tweens.add({
      targets: pipe, angle: 90, duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        this.spin.delete(i);
        pipe.setAngle(0);
        this.afterChange();
      },
    });
    this.spin.set(i, tw);
  }

  private refreshLit(): void {
    if (this.spin.size) return; // attend la fin des rotations en cours
    const lit = new Set(reach(this.lv));
    this.lv.tiles.forEach((t, i) => {
      const p = this.pipes[i];
      if (!p) return;
      const key = `mg:pipe:${mask(t)}${lit.has(i) ? ':on' : ''}`;
      if (p.texture.key !== key) p.setTexture(key).setDisplaySize(this.cell, this.cell);
    });
  }

  private afterChange(): void {
    if (this.busy || this.spin.size) { this.refreshLit(); return; }
    this.refreshLit();
    if (isConnected(this.lv)) this.levelWon();
  }

  private levelWon(): void {
    this.busy = true;
    this.totalTaps += this.taps;
    const path = pathAtoB(this.lv) ?? [];
    audio.play('rare');
    for (const c of this.objs) c.disableInteractive();
    // les deux cœurs voyagent l'un vers l'autre
    const mid = Math.floor((path.length - 1) / 2);
    const travel = (from: number, dir: 1 | -1) => {
      const start = this.center(path[from]);
      const h = this.add.image(start.x, start.y, 'mg:heart').setDisplaySize(this.cell * 0.7, this.cell * 0.7).setDepth(30);
      const pts: { x: number; y: number }[] = [];
      for (let k = from; dir === 1 ? k <= mid : k >= mid + 1; k += dir) pts.push(this.center(path[k]));
      if (dir === -1) pts.push(this.center(path[mid]));
      const tl = this.tweens.chain({
        targets: h,
        tweens: pts.slice(1).map((p) => ({ x: p.x, y: p.y, duration: 140, ease: 'Linear' })),
      });
      void tl;
      return h;
    };
    const ha = travel(0, 1);
    const hb = travel(path.length - 1, -1);
    const steps = Math.max(mid, path.length - 1 - mid);
    this.time.delayedCall(140 * steps + 80, () => {
      const p = this.center(path[mid]);
      ha.destroy(); hb.destroy();
      const big = this.add.image(p.x, p.y, 'mg:heart').setDisplaySize(this.cell, this.cell).setDepth(31);
      const s0 = big.scale;
      this.tweens.add({ targets: big, scale: s0 * 1.8, duration: 380, yoyo: true, ease: 'Back.easeOut', onComplete: () => this.tweens.add({ targets: big, alpha: 0, duration: 300, onComplete: () => big.destroy() }) });
      burst(this, p.x, p.y, 24, 40);
      audio.play('victory');
      if (!reducedFx()) this.cameras.main.flash(250, 255, 240, 245);
      this.time.delayedCall(1000, () => this.next());
    });
  }

  private next(): void {
    if (this.li + 1 < this.levels.length) {
      this.host.banner('Réunis !');
      this.li++;
      this.time.delayedCall(900, () => this.startLevel(true));
      return;
    }
    this.done = true;
    this.host.banner('Les deux cœurs sont réunis');
    // étoiles : touches au-delà du minimum théorique
    const stars = this.totalTaps <= 60 ? 3 : this.totalTaps <= 85 ? 2 : 1;
    this.time.delayedCall(1500, () => this.host.complete({
      score: this.totalTaps,
      stars,
      summary: `${this.levels.length} chemins tracés en ${this.totalTaps} touches.`,
    }));
  }

  layout(): void {
    if (!this.lv) return;
    this.computeBoard();
    this.objs.forEach((c, i) => {
      const p = this.center(i);
      c.setPosition(p.x, p.y).setSize(this.cell, this.cell);
      for (const o of c.list as Phaser.GameObjects.Image[]) {
        const isHeart = o.texture.key === 'mg:heart';
        const isLever = o.texture.key === 'mg:lever';
        const k = isHeart ? 0.82 : isLever ? 0.9 : 1;
        o.setDisplaySize(this.cell * k, this.cell * k);
      }
      if (c.input) (c.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, this.cell, this.cell);
    });
    this.drawBoard();
  }
}
