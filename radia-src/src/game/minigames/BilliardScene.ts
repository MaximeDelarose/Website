/**
 * « Le billard des cœurs » : table de billard arcade en portrait.
 * Viser : poser le doigt n'importe où, tirer vers l'arrière (lance-pierre),
 * relâcher. Trois petits défis enchaînés, essais illimités.
 */
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';
import { PAL, heartPath, roundRect, gloss, OUTLINE, shade } from '../art/kit';
import { audio, reducedFx } from '../../core/app';
import {
  BALL_R, CHALLENGES, POCKETS, POCKET_R, STEP, TABLE_H, TABLE_W,
  cue, makeWorld, moving, pottedCount, respawnCue, shoot, step, type Ball, type BallKind, type World,
} from './logic/billiard';
import { fxTextures, burst } from './fx';
import type { MinigameHost } from './index';

const RIM = 26; // bord en bois (points de table)
const MAX_DRAG = 150; // px CSS pour la puissance maximale

const BALL_COLORS: Record<BallKind, string> = {
  cue: '#FFF9EE',
  heart: PAL.roseVif,
  gold: PAL.or,
  plain: PAL.lavande,
};

export class BilliardScene extends BaseScene {
  private host!: MinigameHost;
  private w!: World;
  private challenge = 0;
  private shots = 0;
  private totalShots = 0;
  private scaleK = 1;
  private ox = 0;
  private oy = 0;
  private table!: Phaser.GameObjects.Image;
  private ballObjs = new Map<number, Phaser.GameObjects.Image>();
  private aimG!: Phaser.GameObjects.Graphics;
  private aiming = false;
  private aimStart = { x: 0, y: 0 };
  private aimVec = { x: 0, y: 0, p: 0 };
  private acc = 0;
  private shotLive = false;
  private done = false;
  private lastHit = 0;
  private tableKey = '';

  init(data: { host: MinigameHost }): void {
    this.host = data.host;
    this.challenge = 0;
    this.totalShots = 0;
    this.done = false;
    this.aiming = false;
    this.shotLive = false;
    this.ballObjs = new Map();
  }

  create(): void {
    this.initLayout();
    fxTextures(this);
    this.makeBallTextures();
    this.computeTable();
    this.drawTable();
    this.aimG = this.add.graphics().setDepth(20);
    this.startChallenge(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', () => this.onUp());
    this.input.on('pointerupoutside', () => this.onUp());
  }

  // ------------------------------------------------------------ mise en page

  private computeTable(): void {
    const top = this.safe.top + 78;
    const bottom = this.H - this.safe.bottom - 92;
    const availH = bottom - top;
    const availW = Math.min(this.W - 24, 440);
    const totalW = TABLE_W + RIM * 2;
    const totalH = TABLE_H + RIM * 2;
    this.scaleK = Math.min(availW / totalW, availH / totalH);
    this.ox = (this.W - TABLE_W * this.scaleK) / 2;
    this.oy = top + (availH - totalH * this.scaleK) / 2 + RIM * this.scaleK;
  }

  private toScreen(x: number, y: number) { return { x: this.ox + x * this.scaleK, y: this.oy + y * this.scaleK }; }

  private drawTable(): void {
    const k = this.scaleK;
    const tw = (TABLE_W + RIM * 2) * k;
    const th = (TABLE_H + RIM * 2) * k;
    this.tableKey = `mg:table:${Math.round(tw)}x${Math.round(th)}`;
    this.tex(this.tableKey, tw, th, (c) => {
      const r = RIM * k;
      // ombre portée
      c.save();
      c.shadowColor = 'rgba(59,49,82,0.4)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
      roundRect(c, 3, 3, tw - 6, th - 6, r * 1.2);
      c.fillStyle = '#8A5A44'; c.fill();
      c.restore();
      // bois
      roundRect(c, 3, 3, tw - 6, th - 6, r * 1.2);
      const g = c.createLinearGradient(0, 0, tw, th);
      g.addColorStop(0, '#B07A5C'); g.addColorStop(0.5, '#8A5A44'); g.addColorStop(1, '#6E4434');
      c.fillStyle = g; c.fill();
      c.lineWidth = 3; c.strokeStyle = OUTLINE; c.stroke();
      // tapis rose poudré
      roundRect(c, r, r, tw - 2 * r, th - 2 * r, 6);
      const f = c.createRadialGradient(tw / 2, th * 0.4, 10, tw / 2, th / 2, th * 0.7);
      f.addColorStop(0, '#F7C3D3'); f.addColorStop(1, '#E59AB4');
      c.fillStyle = f; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = shade('#E59AB4', -0.3); c.stroke();
      // repères dorés (losanges)
      c.fillStyle = PAL.or;
      for (let i = 1; i < 4; i++) {
        for (const x of [r / 2, tw - r / 2]) { c.beginPath(); c.arc(x, r + (th - 2 * r) * (i / 4) + (i === 2 ? 22 * k : 0), 2.6, 0, Math.PI * 2); c.fill(); }
      }
      for (let i = 1; i < 3; i++) for (const y of [r / 2, th - r / 2]) { c.beginPath(); c.arc(r + (tw - 2 * r) * (i / 3), y, 2.6, 0, Math.PI * 2); c.fill(); }
      // ligne et cœur au centre
      c.setLineDash([5, 6]);
      c.beginPath(); c.moveTo(r, r + (TABLE_H * 0.78) * k); c.lineTo(tw - r, r + (TABLE_H * 0.78) * k);
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
      c.setLineDash([]);
      heartPath(c, tw / 2, th / 2, 46 * k);
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
      // poches
      for (const p of POCKETS) {
        const px = r + p.x * k;
        const py = r + p.y * k;
        c.beginPath(); c.arc(px, py, POCKET_R * k * 0.95, 0, Math.PI * 2);
        c.fillStyle = '#2B2333'; c.fill();
        c.lineWidth = 3; c.strokeStyle = PAL.or; c.stroke();
        c.beginPath(); c.arc(px, py, POCKET_R * k * 0.6, 0, Math.PI * 2);
        c.fillStyle = '#16111B'; c.fill();
      }
    });
    this.table?.destroy();
    this.table = this.add.image(this.ox - RIM * k, this.oy - RIM * k, this.tableKey).setOrigin(0).setDisplaySize(tw, th).setDepth(0);
  }

  private makeBallTextures(): void {
    const S = 48;
    for (const kind of ['cue', 'heart', 'gold', 'plain'] as BallKind[]) {
      this.tex(`mg:ball:${kind}`, S, S, (c) => {
        const r = S / 2 - 2;
        c.beginPath(); c.arc(S / 2, S / 2, r, 0, Math.PI * 2);
        const col = BALL_COLORS[kind];
        const g = c.createRadialGradient(S * 0.38, S * 0.34, 2, S / 2, S / 2, r);
        g.addColorStop(0, shade(col, 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.3));
        c.fillStyle = g; c.fill();
        c.lineWidth = 2.6; c.strokeStyle = OUTLINE; c.stroke();
        if (kind === 'heart' || kind === 'gold') {
          c.beginPath(); c.arc(S / 2, S / 2, r * 0.52, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill();
          heartPath(c, S / 2, S / 2 + 0.5, r * 0.72);
          c.fillStyle = kind === 'gold' ? PAL.orDeep : PAL.roseDeep; c.fill();
        }
        if (kind === 'plain') { heartPath(c, S / 2, S / 2, r * 0.5); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill(); }
        gloss(c, S * 0.36, S * 0.3, r * 0.3, r * 0.16, 0.75, -0.6);
      });
    }
  }

  // ------------------------------------------------------------ défis

  private startChallenge(announce: boolean): void {
    const ch = CHALLENGES[this.challenge];
    this.w = makeWorld(ch.balls);
    this.shots = 0;
    for (const o of this.ballObjs.values()) o.destroy();
    this.ballObjs.clear();
    const d = BALL_R * 2 * this.scaleK;
    for (const b of this.w.balls) {
      const o = this.add.image(0, 0, `mg:ball:${b.kind}`).setDisplaySize(d, d).setDepth(10);
      this.ballObjs.set(b.id, o);
      const target = o.scaleX;
      o.setScale(0);
      this.tweens.add({ targets: o, scale: target, duration: 300, delay: b.id * 40, ease: 'Back.easeOut' });
    }
    this.syncBalls();
    if (announce) this.host.banner(`Défi ${this.challenge + 1} / ${CHALLENGES.length}`, true);
    this.updateHud();
  }

  private updateHud(): void {
    const ch = CHALLENGES[this.challenge];
    const left = ch.maxShots ? ` · coups : <b>${this.shots} / ${ch.maxShots}</b>` : '';
    const got = Math.min(ch.need.count, pottedCount(this.w, ch.need.kind));
    this.host.setHud(`<b>Défi ${this.challenge + 1}/${CHALLENGES.length}</b> — ${ch.goal}<br>Empochés : <b>${got} / ${ch.need.count}</b>${left}`);
  }

  private syncBalls(): void {
    for (const b of this.w.balls) {
      const o = this.ballObjs.get(b.id);
      if (!o || b.pocketed) continue;
      const p = this.toScreen(b.x, b.y);
      o.setPosition(p.x, p.y);
      o.rotation += 0; // les billes « roulent » via leur ombre de reflet fixe
    }
  }

  // ------------------------------------------------------------ visée

  private canAim(): boolean { return !this.done && !this.shotLive && !moving(this.w); }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.canAim()) return;
    this.aiming = true;
    this.aimStart = { x: p.worldX, y: p.worldY };
    this.aimVec = { x: 0, y: 0, p: 0 };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.aiming) return;
    const c = cue(this.w);
    const cs = this.toScreen(c.x, c.y);
    // Lance-pierre : on tire depuis la position du doigt par rapport à la blanche
    // si le doigt est proche de la blanche, sinon depuis le point de départ du geste.
    const ref = Math.hypot(this.aimStart.x - cs.x, this.aimStart.y - cs.y) < 60 ? cs : this.aimStart;
    const dx = ref.x - p.worldX;
    const dy = ref.y - p.worldY;
    const dist = Math.hypot(dx, dy);
    this.aimVec = { x: dx, y: dy, p: Math.min(1, dist / MAX_DRAG) };
    this.drawAim();
  }

  private onUp(): void {
    if (!this.aiming) return;
    this.aiming = false;
    this.aimG.clear();
    if (this.aimVec.p < 0.06 || !this.canAim()) return;
    if (shoot(this.w, this.aimVec.x, this.aimVec.y, this.aimVec.p)) {
      this.shots++;
      this.totalShots++;
      this.shotLive = true;
      audio.play('capture');
      const c = this.ballObjs.get(cue(this.w).id);
      if (c) this.tweens.add({ targets: c, scale: c.scale * 0.9, duration: 60, yoyo: true });
      this.updateHud();
    }
  }

  private drawAim(): void {
    const g = this.aimG;
    g.clear();
    const v = this.aimVec;
    if (v.p < 0.02) return;
    const c = cue(this.w);
    const cs = this.toScreen(c.x, c.y);
    const len = Math.hypot(v.x, v.y) || 1;
    const ux = v.x / len, uy = v.y / len;
    // ligne de visée en pointillés (jusqu'au bord de la table)
    const reach = (90 + 260 * v.p) * this.scaleK;
    const col = v.p > 0.85 ? 0xff75a8 : 0xfff4e8;
    const x0 = this.ox, y0 = this.oy, x1 = this.ox + TABLE_W * this.scaleK, y1 = this.oy + TABLE_H * this.scaleK;
    for (let d = BALL_R * this.scaleK * 1.6; d < reach; d += 12) {
      const px = cs.x + ux * d, py = cs.y + uy * d;
      if (px < x0 || px > x1 || py < y0 || py > y1) break; // la visée s'arrête à la bande
      const a = 1 - d / reach;
      g.fillStyle(col, 0.35 + a * 0.6);
      g.fillCircle(px, py, 3.2);
    }
    // queue (côté opposé)
    const back = BALL_R * this.scaleK * 1.4 + v.p * 34;
    g.lineStyle(7, 0x58433f, 1);
    g.lineBetween(cs.x - ux * back, cs.y - uy * back, cs.x - ux * (back + 120), cs.y - uy * (back + 120));
    g.lineStyle(4, 0xf3c86b, 1);
    g.lineBetween(cs.x - ux * back, cs.y - uy * back, cs.x - ux * (back + 118), cs.y - uy * (back + 118));
    g.lineStyle(4, 0xfff4e8, 1);
    g.lineBetween(cs.x - ux * back, cs.y - uy * back, cs.x - ux * (back + 10), cs.y - uy * (back + 10));
    // jauge de puissance (à droite de la table)
    const gx = Math.min(this.W - 14, this.ox + TABLE_W * this.scaleK + RIM * this.scaleK + 4);
    const gh = 140;
    const gy = this.oy + TABLE_H * this.scaleK / 2 - gh / 2;
    g.fillStyle(0x3b3152, 0.55);
    g.fillRoundedRect(gx - 6, gy, 12, gh, 6);
    g.fillStyle(v.p > 0.85 ? 0xff75a8 : 0xf3c86b, 1);
    g.fillRoundedRect(gx - 6, gy + gh * (1 - v.p), 12, gh * v.p, 6);
    g.lineStyle(2, 0xfff4e8, 1);
    g.strokeRoundedRect(gx - 6, gy, 12, gh, 6);
  }

  // ------------------------------------------------------------ simulation

  override update(_t: number, dtMs: number): void {
    if (!this.w) return;
    this.acc += Math.min(0.05, dtMs / 1000);
    let steps = 0;
    while (this.acc >= STEP && steps < 12) {
      step(this.w);
      this.acc -= STEP;
      steps++;
    }
    this.handleEvents();
    this.syncBalls();
    if (this.shotLive && !moving(this.w)) this.endShot();
  }

  private handleEvents(): void {
    const now = this.time.now;
    for (const e of this.w.events) {
      if (e.t === 'hit') {
        if (now - this.lastHit > 45) { audio.play('move', 1 + Math.min(0.4, e.speed / 2000)); this.lastHit = now; }
      } else if (e.t === 'cushion') {
        if (e.speed > 120) audio.play('drop');
      } else if (e.t === 'pocket') {
        this.onPocket(e.id, e.kind, e.pocket);
      }
    }
    this.w.events.length = 0;
  }

  private onPocket(id: number, kind: BallKind, pocket: number): void {
    const o = this.ballObjs.get(id);
    const p = POCKETS[pocket];
    const ps = this.toScreen(Math.max(0, Math.min(TABLE_W, p.x)), p.y);
    if (o) {
      this.tweens.add({ targets: o, x: ps.x, y: ps.y, scale: 0, duration: 220, ease: 'Quad.easeIn', onComplete: () => o.setVisible(false) });
    }
    if (kind === 'cue') {
      audio.play('invalid');
      this.host.banner('Oups, la blanche !', true);
      return;
    }
    audio.play(kind === 'gold' ? 'rare' : 'pop3');
    burst(this, ps.x, ps.y, kind === 'gold' ? 20 : 12, 30);
    if (!reducedFx()) this.cameras.main.shake(120, 0.002);
    const pts = this.text(ps.x, ps.y - 10, kind === 'gold' ? '+50 ♡' : kind === 'heart' ? '+10 ♡' : '+5', {
      fontSize: '20px', fontStyle: '700', color: '#FFFFFF', stroke: '#C4407A', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(40);
    pts.x = Math.max(30, Math.min(this.W - 30, pts.x));
    this.tweens.add({ targets: pts, y: pts.y - 46, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => pts.destroy() });
    this.updateHud();
  }

  private endShot(): void {
    this.shotLive = false;
    const ch = CHALLENGES[this.challenge];
    const c = cue(this.w);
    if (c.pocketed) {
      respawnCue(this.w);
      const o = this.ballObjs.get(c.id)!;
      const d = BALL_R * 2 * this.scaleK;
      const sp = this.toScreen(c.x, c.y);
      o.setVisible(true).setPosition(sp.x, sp.y).setDisplaySize(d, d);
      const target = o.scale;
      o.setScale(0);
      this.tweens.add({ targets: o, scale: target, duration: 260, ease: 'Back.easeOut' });
    }
    const got = pottedCount(this.w, ch.need.kind);
    if (got >= ch.need.count) {
      this.challengeWon();
      return;
    }
    if (ch.maxShots && this.shots >= ch.maxShots) {
      this.host.banner('Encore une fois !', true);
      audio.play('whoosh');
      this.time.delayedCall(900, () => this.startChallenge(false));
      return;
    }
    // reste-t-il des billes nécessaires sur la table ?
    const left = this.w.balls.filter((b) => b.kind === ch.need.kind && !b.pocketed).length;
    if (left + got < ch.need.count) this.time.delayedCall(700, () => this.startChallenge(false));
    this.updateHud();
  }

  private challengeWon(): void {
    audio.play('victory');
    const mid = this.toScreen(TABLE_W / 2, TABLE_H / 2);
    burst(this, mid.x, mid.y, 26, 45);
    if (this.challenge + 1 < CHALLENGES.length) {
      this.host.banner('Bien joué !');
      this.challenge++;
      this.time.delayedCall(1400, () => this.startChallenge(true));
      return;
    }
    this.done = true;
    this.host.banner('Trois défis réussis !');
    const stars = this.totalShots <= 6 ? 3 : this.totalShots <= 10 ? 2 : 1;
    this.time.delayedCall(1500, () => this.host.complete({
      score: this.totalShots,
      stars,
      summary: `Les trois défis réussis en ${this.totalShots} coups.`,
    }));
  }

  layout(): void {
    if (!this.w) return;
    this.computeTable();
    this.drawTable();
    const d = BALL_R * 2 * this.scaleK;
    for (const b of this.w.balls) this.ballObjs.get(b.id)?.setDisplaySize(d, d);
    this.syncBalls();
    this.aimG.clear();
  }
}

export type { Ball };
