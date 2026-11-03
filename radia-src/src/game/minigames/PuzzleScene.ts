/**
 * « Les souvenirs mélangés » : 3 × 3 morceaux du souvenir de l'Arc de Triomphe.
 * Toucher un morceau puis un autre pour les échanger, ou glisser l'un sur l'autre.
 * Les morceaux bien placés se verrouillent avec une lueur dorée.
 */
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';
import { drawMemory } from '../art/scenes';
import { lookKey } from '../art/world/radiaNow';
import { roundRect, texScale, PAL } from '../art/kit';
import { audio, reducedFx } from '../../core/app';
import { shuffle, swap, isSolved, isLocked, minSwaps, puzzleStars, correctCount } from './logic/puzzle';
import { fxTextures, burst } from './fx';
import type { MinigameHost } from './index';

const N = 3;
const ASPECT = 1.25; // hauteur / largeur de l'illustration

interface TileObj { c: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; frame: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; tile: number }

export class PuzzleScene extends BaseScene {
  private host!: MinigameHost;
  private perm: number[] = [];
  private tiles: TileObj[] = []; // indexé par numéro de morceau
  private bw = 0;
  private bh = 0;
  private ox = 0;
  private oy = 0;
  private gap = 5;
  private selected = -1; // position sélectionnée
  private swaps = 0;
  private best = 0;
  private busy = false;
  private solved = false;
  private texKey = '';
  private dragFrom = -1;
  private downAt = { x: 0, y: 0 };
  private bg!: Phaser.GameObjects.Graphics;

  init(data: { host: MinigameHost }): void {
    this.host = data.host;
    this.tiles = [];
    this.selected = -1;
    this.swaps = 0;
    this.busy = false;
    this.solved = false;
    this.gap = 5;
  }

  create(): void {
    this.initLayout();
    fxTextures(this);
    this.perm = shuffle(N * N, (Date.now() & 0xffff) + 7, 1);
    this.best = minSwaps(this.perm);
    this.bg = this.add.graphics();
    this.computeBoard();
    this.buildTiles();
    this.layout();
    this.updateHud();
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
  }

  private computeBoard(): void {
    const top = this.safe.top + 78;
    const bottom = this.H - this.safe.bottom - 86;
    const availH = bottom - top;
    const availW = Math.min(this.W - 28, 420);
    this.bw = Math.min(availW, availH / ASPECT);
    this.bh = this.bw * ASPECT;
    this.ox = (this.W - this.bw) / 2;
    this.oy = top + (availH - this.bh) / 2;
  }

  private buildTiles(): void {
    const w = Math.round(this.bw);
    const hgt = Math.round(this.bh);
    this.texKey = `mg:arc:${w}x${hgt}:${lookKey()}`;
    this.tex(this.texKey, w, hgt, (ctx) => drawMemory(ctx, 'arc', w, hgt));
    const s = texScale();
    const tex = this.textures.get(this.texKey);
    const tw = w / N;
    const th = hgt / N;
    for (let t = 0; t < N * N; t++) {
      const fx = (t % N) * tw;
      const fy = Math.floor(t / N) * th;
      const fname = `t${t}`;
      if (!tex.has(fname)) tex.add(fname, 0, fx * s, fy * s, tw * s, th * s);
    }
    this.tex(`mg:tileframe:${Math.round(tw)}x${Math.round(th)}`, tw, th, (ctx) => {
      roundRect(ctx, 1.5, 1.5, tw - 3, th - 3, 10);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,250,245,0.95)'; ctx.stroke();
      roundRect(ctx, 0.5, 0.5, tw - 1, th - 1, 11);
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(88,67,63,0.45)'; ctx.stroke();
    });
    this.tex(`mg:tileglow:${Math.round(tw)}x${Math.round(th)}`, tw + 16, th + 16, (ctx) => {
      roundRect(ctx, 5, 5, tw + 6, th + 6, 14);
      ctx.shadowColor = PAL.or; ctx.shadowBlur = 8;
      ctx.lineWidth = 4; ctx.strokeStyle = PAL.or; ctx.stroke();
    });
    for (let t = 0; t < N * N; t++) {
      const img = this.add.image(0, 0, this.texKey, `t${t}`).setDisplaySize(tw, th);
      const frame = this.add.image(0, 0, `mg:tileframe:${Math.round(tw)}x${Math.round(th)}`).setDisplaySize(tw, th);
      const glow = this.add.image(0, 0, `mg:tileglow:${Math.round(tw)}x${Math.round(th)}`).setDisplaySize(tw + 16, th + 16).setAlpha(0);
      const c = this.add.container(0, 0, [glow, img, frame]).setSize(tw, th).setDepth(10);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(t, p));
      this.tiles[t] = { c, img, frame, glow, tile: t };
    }
  }

  private cellSize() {
    return { tw: this.bw / N, th: this.bh / N };
  }

  private posXY(pos: number): { x: number; y: number } {
    const { tw, th } = this.cellSize();
    const col = pos % N;
    const row = Math.floor(pos / N);
    const sx = (tw - this.gap) / tw;
    void sx;
    // l'écart s'ajoute autour du centre de la grille
    const cx = this.ox + tw * (col + 0.5) + (col - (N - 1) / 2) * this.gap;
    const cy = this.oy + th * (row + 0.5) + (row - (N - 1) / 2) * this.gap;
    return { x: cx, y: cy };
  }

  private posAt(x: number, y: number): number {
    const { tw, th } = this.cellSize();
    let best = -1;
    let bd = Infinity;
    for (let p = 0; p < N * N; p++) {
      const c = this.posXY(p);
      const d = Math.abs(c.x - x) / tw + Math.abs(c.y - y) / th;
      if (d < bd) { bd = d; best = p; }
    }
    return bd < 0.9 ? best : -1;
  }

  private placeAll(animate: boolean): void {
    for (let pos = 0; pos < N * N; pos++) {
      const t = this.tiles[this.perm[pos]];
      const { x, y } = this.posXY(pos);
      if (animate) this.tweens.add({ targets: t.c, x, y, duration: 220, ease: 'Back.easeOut' });
      else t.c.setPosition(x, y);
      t.glow.setAlpha(isLocked(this.perm, pos) && !this.solved ? 1 : 0);
    }
  }

  private onDown(tile: number, p: Phaser.Input.Pointer): void {
    if (this.busy || this.solved) return;
    const pos = this.perm.indexOf(tile);
    if (isLocked(this.perm, pos)) {
      this.tweens.add({ targets: this.tiles[tile].c, scale: 1.05, duration: 90, yoyo: true });
      audio.play('invalid');
      return;
    }
    this.dragFrom = pos;
    this.downAt = { x: p.worldX, y: p.worldY };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.dragFrom < 0 || !p.isDown || this.busy) return;
    const t = this.tiles[this.perm[this.dragFrom]];
    if (Math.hypot(p.worldX - this.downAt.x, p.worldY - this.downAt.y) > 8) {
      if (t.c.depth !== 30) { t.c.setDepth(30); t.c.setScale(1.06); audio.play('pickup'); this.clearSelection(); }
      const home = this.posXY(this.dragFrom);
      t.c.setPosition(home.x + p.worldX - this.downAt.x, home.y + p.worldY - this.downAt.y);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.dragFrom < 0 || this.busy) { this.dragFrom = -1; return; }
    const from = this.dragFrom;
    this.dragFrom = -1;
    const t = this.tiles[this.perm[from]];
    const dragged = t.c.depth === 30;
    t.c.setDepth(10).setScale(1);
    if (dragged) {
      const to = this.posAt(p.worldX, p.worldY);
      if (to >= 0 && to !== from && !isLocked(this.perm, to)) this.doSwap(from, to);
      else { if (to >= 0 && to !== from) audio.play('invalid'); this.placeAll(true); }
      return;
    }
    // simple toucher : sélection puis échange
    if (this.selected < 0) {
      this.selected = from;
      t.c.setDepth(20);
      this.tweens.add({ targets: t.c, scale: 1.08, duration: 140, ease: 'Back.easeOut' });
      t.glow.setTint(0xff75a8).setAlpha(1);
      audio.play('pickup');
    } else if (this.selected === from) {
      this.clearSelection();
    } else {
      const a = this.selected;
      this.clearSelection();
      this.doSwap(a, from);
    }
  }

  private clearSelection(): void {
    if (this.selected < 0) return;
    const t = this.tiles[this.perm[this.selected]];
    t.c.setDepth(10);
    this.tweens.add({ targets: t.c, scale: 1, duration: 120 });
    t.glow.clearTint().setAlpha(0);
    this.selected = -1;
  }

  private doSwap(a: number, b: number): void {
    const before = correctCount(this.perm);
    if (!swap(this.perm, a, b)) { audio.play('invalid'); this.placeAll(true); return; }
    this.swaps++;
    this.busy = true;
    audio.play('move');
    this.placeAll(true);
    const gained = correctCount(this.perm) - before;
    this.time.delayedCall(230, () => {
      this.busy = false;
      for (const pos of [a, b]) {
        if (isLocked(this.perm, pos)) {
          const t = this.tiles[this.perm[pos]];
          this.tweens.add({ targets: t.c, scale: 1.08, duration: 120, yoyo: true });
          if (!reducedFx()) burst(this, t.c.x, t.c.y, 5, 40);
        }
      }
      if (gained > 0) audio.play(gained > 1 ? 'pop3' : 'pop2');
      this.updateHud();
      if (isSolved(this.perm)) this.win();
    });
  }

  private updateHud(): void {
    const ok = correctCount(this.perm);
    this.host.setHud(`Morceaux en place : <b>${ok} / ${N * N}</b> · échanges : ${this.swaps}`);
  }

  private win(): void {
    this.solved = true;
    this.busy = true;
    audio.play('rare');
    for (const t of this.tiles) { t.glow.setAlpha(0); t.c.disableInteractive(); }
    // les morceaux se rejoignent
    this.tweens.addCounter({
      from: this.gap, to: 0, duration: 520, ease: 'Cubic.easeInOut',
      onUpdate: (tw) => { this.gap = tw.getValue() ?? 0; this.placeAll(false); },
      onComplete: () => {
        for (const t of this.tiles) this.tweens.add({ targets: t.frame, alpha: 0, duration: 300 });
        const flash = this.add.rectangle(this.ox + this.bw / 2, this.oy + this.bh / 2, this.bw, this.bh, 0xffffff, 0.9).setDepth(40);
        this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
        burst(this, this.ox + this.bw / 2, this.oy + this.bh / 2, 22, 45);
        audio.play('victory');
        const title = this.text(this.W / 2, this.oy + this.bh + 6, 'L\'Arc de Triomphe', {
          fontSize: '22px', fontStyle: '700', color: '#FFFFFF', stroke: '#51446D', strokeThickness: 5,
        }).setOrigin(0.5, 0).setDepth(45).setAlpha(0);
        this.tweens.add({ targets: title, alpha: 1, y: title.y - 4, duration: 500 });
        this.host.setHud('Souvenir reconstitué ♡');
        this.time.delayedCall(1700, () => {
          this.host.complete({
            score: this.swaps,
            stars: puzzleStars(this.swaps, this.best),
            summary: `Souvenir reconstitué en ${this.swaps} échange${this.swaps > 1 ? 's' : ''} (minimum possible : ${this.best}).`,
          });
        });
      },
    });
  }

  layout(): void {
    if (!this.tiles.length) return;
    // l'illustration est générée à la taille d'origine : on la remet simplement à l'échelle
    const prevW = this.bw;
    this.computeBoard();
    const k = this.bw / prevW;
    const { tw, th } = this.cellSize();
    for (const t of this.tiles) {
      t.img.setDisplaySize(tw, th);
      t.frame.setDisplaySize(tw, th);
      t.glow.setDisplaySize(tw + 16, th + 16);
      t.c.setSize(tw, th);
      if (t.c.input) (t.c.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, tw, th);
    }
    void k;
    this.bg.clear();
    this.bg.fillStyle(0x3b3152, 0.35);
    this.bg.fillRoundedRect(this.ox - 10, this.oy - 10, this.bw + 20, this.bh + 20, 18);
    this.bg.lineStyle(3, 0xfff4e8, 0.9);
    this.bg.strokeRoundedRect(this.ox - 10, this.oy - 10, this.bw + 20, this.bh + 20, 18);
    this.placeAll(false);
  }
}
