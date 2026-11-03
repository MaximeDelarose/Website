/**
 * Scène du plateau de fusion : rendu, glisser-déposer, animations (« game feel »).
 * Les règles sont dans rules.ts ; cette scène ne fait qu'appliquer les
 * actions et animer les événements qu'elles renvoient.
 */
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';
import { BOARD_H, BOARD_SIZE, BOARD_W, type BoardEvent, type LevelDef, type RunState } from './types';
import * as R from './rules';
import { suggestMerge, botStep } from './bot';
import { MAX_LEVEL, SPECIAL, type ItemRef } from '../../data/items';
import {
  COLLECTION_TINTS, ITEM_TEX, drawBasket, ensureBoardTextures, ensureFxTextures, ensureItemTexture,
} from './textures';
import { audio, reducedFx } from '../../core/app';
import { texScale, paint } from '../art/kit';

export interface MergeHost {
  /** Zone libre pour le plateau (pixels CSS) : entre le haut et le bas de l'interface. */
  area(): { top: number; bottom: number };
  /** Événements à refléter dans l'interface HTML (commandes, objectifs, score…). */
  onEvents(ev: BoardEvent[], s: RunState): void;
  onWin(): void;
  /** Toucher simple sur un objet (fiche info). */
  onInspect(r: ItemRef | null): void;
  /** Bonus actif ('wand' / 'wind') : le prochain toucher sur un objet l'utilise. */
  booster(): 'wand' | 'wind' | null;
  boosterUsed(kind: 'wand' | 'wind', ok: boolean): void;
  orderAnchor(slot: number): { x: number; y: number } | null;
  heartsAnchor(): { x: number; y: number } | null;
  /** Le plateau est plein et bloqué. */
  onStuck(): void;
  onFull(): void;
  onActivity(): void;
}

export interface MergeSceneData { def: LevelDef; state: RunState; host: MergeHost }

interface Drag { from: number; sprite: Phaser.GameObjects.Image; startX: number; startY: number; moved: boolean; pointerId: number }

export class MergeScene extends BaseScene {
  static KEY = 'merge';
  def!: LevelDef;
  state!: RunState;
  host!: MergeHost;

  private cell = 56;
  private ox = 0;
  private oy = 0;
  private boardBg!: Phaser.GameObjects.Graphics;
  private tiles: Phaser.GameObjects.Image[] = [];
  private sprites: (Phaser.GameObjects.Image | null)[] = [];
  private gifts: (Phaser.GameObjects.Image | null)[] = [];
  private glows: (Phaser.GameObjects.Image | null)[] = [];
  private selHi!: Phaser.GameObjects.Image;
  private targetHi!: Phaser.GameObjects.Image;
  private hintHi: Phaser.GameObjects.Image[] = [];
  private basket!: Phaser.GameObjects.Image;
  private basketLabel!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private drag: Drag | null = null;
  private selected = -1;
  private locked = new Set<number>();
  private ended = false;
  private boardLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private lastAction = 0;
  private lastHint = 0;

  constructor() { super(MergeScene.KEY); }

  init(data: MergeSceneData): void {
    this.def = data.def;
    this.state = data.state;
    this.host = data.host;
    this.sprites = new Array(BOARD_SIZE).fill(null);
    this.gifts = new Array(BOARD_SIZE).fill(null);
    this.glows = new Array(BOARD_SIZE).fill(null);
    this.tiles = [];
    this.locked.clear();
    this.selected = -1;
    this.drag = null;
    this.ended = false;
  }

  create(): void {
    this.initLayout();
    ensureFxTextures(this);
    this.boardBg = this.add.graphics();
    this.boardLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0).setDepth(100);
    this.computeGeometry();
    this.buildBoard();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('gameout', () => this.cancelDrag());
    this.lastAction = this.time.now;
    // Apparition du plateau
    this.boardLayer.setAlpha(0);
    this.tweens.add({ targets: this.boardLayer, alpha: 1, duration: 350 });
    this.sprites.forEach((sp, i) => {
      if (!sp) return;
      sp.setScale(0);
      this.tweens.add({ targets: sp, scale: this.itemScale(), duration: 380, delay: 120 + i * 12, ease: 'Back.easeOut' });
    });
  }

  // ------------------------------------------------------------ géométrie

  private computeGeometry(): void {
    const a = this.host.area();
    const basketH = Math.min(96, Math.max(70, (this.H - a.top - a.bottom) * 0.14));
    const availH = this.H - a.top - (this.H - a.bottom) - basketH - 16;
    const availW = Math.min(this.W - 20, 560);
    this.cell = Math.floor(Math.max(36, Math.min(availW / BOARD_W, availH / BOARD_H)));
    const bw = this.cell * BOARD_W;
    const bh = this.cell * BOARD_H;
    this.ox = Math.round((this.W - bw) / 2);
    this.oy = Math.round(a.top + Math.max(4, (availH - bh) / 2) + 4);
  }

  /** Les textures font 72 px logiques × densité : on ramène l'objet à ~86 % de la case. */
  private itemScale(): number { return (this.cell * 0.92) / (ITEM_TEX * texScale()); }
  private cx(i: number) { return this.ox + (i % BOARD_W) * this.cell + this.cell / 2; }
  private cy(i: number) { return this.oy + Math.floor(i / BOARD_W) * this.cell + this.cell / 2; }

  private cellAt(x: number, y: number): number {
    const gx = Math.floor((x - this.ox) / this.cell);
    const gy = Math.floor((y - this.oy) / this.cell);
    if (gx < 0 || gy < 0 || gx >= BOARD_W || gy >= BOARD_H) return -1;
    return gy * BOARD_W + gx;
  }

  private buildBoard(): void {
    ensureBoardTextures(this, this.cell);
    const c = this.cell;
    const k = 1 / texScale();
    this.boardBg.clear();
    const pad = 8;
    this.boardBg.fillStyle(0x51446d, 0.18);
    this.boardBg.fillRoundedRect(this.ox - pad, this.oy - pad + 4, c * BOARD_W + pad * 2, c * BOARD_H + pad * 2, 22);
    this.boardBg.fillStyle(0xffffff, 0.55);
    this.boardBg.fillRoundedRect(this.ox - pad, this.oy - pad, c * BOARD_W + pad * 2, c * BOARD_H + pad * 2, 22);
    this.boardBg.lineStyle(2.5, 0x58433f, 0.12);
    this.boardBg.strokeRoundedRect(this.ox - pad, this.oy - pad, c * BOARD_W + pad * 2, c * BOARD_H + pad * 2, 22);

    this.tiles.forEach((t) => t.destroy());
    this.tiles = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      const alt = ((i % BOARD_W) + Math.floor(i / BOARD_W)) % 2 === 0 ? 'cell:a' : 'cell:b';
      const t = this.add.image(this.cx(i), this.cy(i), alt).setScale(k);
      this.boardLayer.add(t);
      this.tiles.push(t);
    }
    this.selHi = this.add.image(0, 0, 'cell:sel').setScale(k).setVisible(false);
    this.targetHi = this.add.image(0, 0, 'cell:ok').setScale(k).setVisible(false);
    this.boardLayer.add([this.selHi, this.targetHi]);

    for (let i = 0; i < BOARD_SIZE; i++) {
      this.gifts[i]?.destroy();
      this.gifts[i] = null;
      this.sprites[i]?.destroy();
      this.sprites[i] = null;
      this.glows[i]?.destroy();
      this.glows[i] = null;
      const cell = this.state.cells[i];
      if (cell.gift) this.makeGift(i);
      if (cell.item) this.makeSprite(i, cell.item);
    }

    // Panier
    const a = this.host.area();
    const by = this.oy + c * BOARD_H + Math.max(46, Math.min(70, (a.bottom - (this.oy + c * BOARD_H)) / 2));
    const bs = Math.min(92, Math.max(64, c * 1.45));
    if (!this.textures.exists(`basket:${bs}`)) this.textures.addCanvas(`basket:${bs}`, paint(bs, bs, texScale(), (ctx) => drawBasket(ctx, bs)));
    this.basket?.destroy();
    this.basket = this.add.image(this.W / 2, by, `basket:${bs}`).setScale(k).setDepth(5);
    this.basket.setData('size', bs);
    this.basketLabel?.destroy();
    this.basketLabel = this.text(this.W / 2, by + bs * 0.42, 'Panier', { fontSize: '13px', fontStyle: '600', color: '#FFFFFF', stroke: '#51446D', strokeThickness: 4 }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: this.basket, scaleY: k * 1.03, scaleX: k * 0.985, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.easeInOut' });

    this.comboText?.destroy();
    this.comboText = this.text(this.W / 2, this.oy - 6, '', { fontSize: '22px', fontStyle: '700', color: '#FFFFFF', stroke: '#E8558F', strokeThickness: 6 }).setOrigin(0.5, 1).setDepth(120).setAlpha(0);
  }

  layout(): void {
    if (this.drag) this.cancelDrag();
    this.computeGeometry();
    this.buildBoard();
  }

  private makeSprite(i: number, r: ItemRef): Phaser.GameObjects.Image {
    const key = ensureItemTexture(this, r);
    const sp = this.add.image(this.cx(i), this.cy(i), key).setScale(this.itemScale());
    this.boardLayer.add(sp);
    this.sprites[i] = sp;
    this.refreshGlow(i, r);
    return sp;
  }

  private refreshGlow(i: number, r: ItemRef | null): void {
    this.glows[i]?.destroy();
    this.glows[i] = null;
    if (!r || (r.c !== 'special' && r.l < 8) || reducedFx()) return;
    const g = this.add.image(this.cx(i), this.cy(i), 'fx:light').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
    g.setScale((this.cell * 1.1) / 40 / texScale());
    this.boardLayer.addAt(g, this.boardLayer.getIndex(this.sprites[i]!));
    this.tweens.add({ targets: g, alpha: 0.12, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
    this.glows[i] = g;
  }

  private moveGlow(from: number, to: number): void {
    const g = this.glows[from];
    this.glows[from] = null;
    this.glows[to]?.destroy();
    this.glows[to] = g;
    if (g) g.setPosition(this.cx(to), this.cy(to));
  }

  private makeGift(i: number): void {
    const g = this.add.image(this.cx(i), this.cy(i), 'gift').setScale(1 / texScale());
    this.boardLayer.add(g);
    this.gifts[i] = g;
    this.tweens.add({ targets: g, angle: { from: -2, to: 2 }, yoyo: true, repeat: -1, duration: 900 + (i % 5) * 120, ease: 'Sine.easeInOut' });
  }

  // ------------------------------------------------------------ entrées

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.ended || this.drag) return;
    this.host.onActivity();
    this.lastAction = this.time.now;
    this.clearHint();
    const x = p.worldX;
    const y = p.worldY;
    // Panier
    const bs = (this.basket.getData('size') as number) * 0.55;
    if (Math.abs(x - this.basket.x) < bs && Math.abs(y - this.basket.y) < bs) {
      this.tapBasket();
      return;
    }
    const i = this.cellAt(x, y);
    if (i < 0) { this.setSelected(-1); return; }
    const booster = this.host.booster();
    if (booster) { this.applyBooster(booster, i); return; }
    const cell = this.state.cells[i];
    if (!cell.item || this.locked.has(i)) {
      // Toucher une case vide (ou un paquet) avec un objet sélectionné → tentative de déplacement
      if (this.selected >= 0 && this.selected !== i) {
        const from = this.selected;
        this.setSelected(-1);
        this.attemptMove(from, i);
      } else if (cell.gift) {
        this.wiggle(this.gifts[i]);
        audio.play('invalid');
      }
      return;
    }
    const sp = this.sprites[i];
    if (!sp) return;
    this.drag = { from: i, sprite: sp, startX: x, startY: y, moved: false, pointerId: p.id };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || p.id !== d.pointerId) return;
    const x = p.worldX;
    const y = p.worldY;
    if (!d.moved) {
      if (Math.hypot(x - d.startX, y - d.startY) < 8) return;
      d.moved = true;
      this.setSelected(-1);
      this.boardLayer.bringToTop(d.sprite);
      this.tweens.killTweensOf(d.sprite);
      this.tweens.add({ targets: d.sprite, scale: this.itemScale() * 1.18, duration: 120, ease: 'Quad.easeOut' });
      audio.play('pickup');
      this.glows[d.from]?.setVisible(false);
    }
    // l'objet suit le doigt, légèrement au-dessus pour rester visible
    d.sprite.setPosition(x, y - this.cell * 0.28);
    const t = this.cellAt(x, y);
    if (t >= 0 && t !== d.from) {
      const a = this.state.cells[d.from].item;
      const b = this.state.cells[t];
      const ok = R.canMerge(a, b.item) || (!b.item && !b.gift) || (!!b.gift && a?.c === 'special' && a.l === SPECIAL.KEY);
      this.targetHi.setTexture(R.canMerge(a, b.item) || b.gift ? 'cell:ok' : 'cell:move');
      this.targetHi.setPosition(this.cx(t), this.cy(t)).setVisible(ok);
    } else this.targetHi.setVisible(false);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || p.id !== d.pointerId) return;
    this.drag = null;
    this.targetHi.setVisible(false);
    const x = p.worldX;
    const y = p.worldY;
    if (!d.moved) {
      // simple toucher
      const it = this.state.cells[d.from].item;
      if (it?.c === 'special' && it.l === SPECIAL.BOX) { this.apply(R.tapItem(this.state, this.def, d.from)); return; }
      if (this.selected >= 0 && this.selected !== d.from) {
        const from = this.selected;
        this.setSelected(-1);
        this.attemptMove(from, d.from);
        return;
      }
      if (this.selected === d.from) { this.setSelected(-1); this.host.onInspect(null); return; }
      this.setSelected(d.from);
      this.host.onInspect(it);
      this.tweens.add({ targets: d.sprite, scale: this.itemScale() * 1.12, yoyo: true, duration: 110 });
      audio.play('pickup');
      return;
    }
    const t = this.cellAt(x, y);
    if (t < 0 || t === d.from) {
      // relâché hors du plateau (ou sur place) → retour
      this.returnSprite(d.from, d.sprite);
      return;
    }
    this.attemptMove(d.from, t, true);
  }

  private cancelDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.targetHi.setVisible(false);
    this.returnSprite(d.from, d.sprite);
  }

  private returnSprite(i: number, sp: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(sp);
    this.tweens.add({ targets: sp, x: this.cx(i), y: this.cy(i), scale: this.itemScale(), duration: 220, ease: 'Back.easeOut' });
    this.glows[i]?.setVisible(true);
    audio.play('drop');
  }

  private setSelected(i: number): void {
    this.selected = i;
    if (i < 0) { this.selHi.setVisible(false); return; }
    this.selHi.setPosition(this.cx(i), this.cy(i)).setVisible(true);
    this.selHi.setScale(1 / texScale());
  }

  private attemptMove(from: number, to: number, dragged = false): void {
    if (this.locked.has(from) || this.locked.has(to)) {
      const sp = this.sprites[from];
      if (sp) this.returnSprite(from, sp);
      return;
    }
    const ev = R.move(this.state, this.def, from, to, Date.now());
    if (!ev.length) { const sp = this.sprites[from]; if (sp) this.returnSprite(from, sp); return; }
    void dragged;
    this.apply(ev);
  }

  private tapBasket(): void {
    const k = 1 / texScale();
    this.tweens.killTweensOf(this.basket);
    this.basket.setScale(k);
    this.tweens.add({ targets: this.basket, scaleX: k * 1.12, scaleY: k * 0.9, duration: 70, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({ targets: this.basket, scaleY: k * 1.03, scaleX: k * 0.985, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.easeInOut' }) });
    this.apply(R.tapGenerator(this.state, this.def));
  }

  private applyBooster(kind: 'wand' | 'wind', i: number): void {
    const it = this.state.cells[i].item;
    if (!it || this.locked.has(i)) { this.host.boosterUsed(kind, false); audio.play('invalid'); return; }
    const ev = kind === 'wand' ? R.useWand(this.state, this.def, i, Date.now()) : R.useWind(this.state, this.def, i);
    this.host.boosterUsed(kind, ev.length > 0);
    if (ev.length) this.apply(ev);
    else audio.play('invalid');
  }

  // ------------------------------------------------------- API (interface)

  cellCenter(i: number): { x: number; y: number } { return { x: this.cx(i), y: this.cy(i) }; }
  get cellSize(): number { return this.cell; }

  deliver(slot: number): boolean {
    if (this.ended) return false;
    const cells = R.orderCells(this.state, slot);
    if (!cells || cells.some((c) => this.locked.has(c))) return false;
    this.apply(R.deliver(this.state, this.def, slot));
    return true;
  }

  recover(): void { this.apply(R.recover(this.state, this.def)); }

  /** Debug / tests automatiques : joue une action du bot. */
  debugBotStep(): boolean {
    if (this.ended) return false;
    const ev = botStep(this.state, this.def, Date.now());
    if (!ev.length) { this.apply(R.recover(this.state, this.def)); return true; }
    this.apply(ev);
    return true;
  }

  showHint(): boolean {
    this.clearHint();
    const s = suggestMerge(this.state, this.def);
    if (!s) return false;
    for (const i of [s.from, s.to]) {
      const h = this.add.image(this.cx(i), this.cy(i), 'cell:hint').setScale(1 / texScale());
      this.boardLayer.add(h);
      this.tweens.add({ targets: h, alpha: 0.3, yoyo: true, repeat: 5, duration: 380, onComplete: () => h.destroy() });
      this.hintHi.push(h);
      const sp = this.sprites[i];
      if (sp) this.tweens.add({ targets: sp, y: this.cy(i) - 5, yoyo: true, repeat: 3, duration: 200, ease: 'Sine.easeInOut' });
    }
    return true;
  }

  private clearHint(): void { this.hintHi.forEach((h) => h.destroy()); this.hintHi = []; }

  // ------------------------------------------------------- animations

  private apply(events: BoardEvent[]): void {
    let delayWin = false;
    for (const e of events) {
      switch (e.t) {
        case 'move': this.animMove(e.from, e.to); break;
        case 'merge': this.animMerge(e); break;
        case 'invalid': this.animInvalid(e.from); break;
        case 'spawn': this.animSpawn(e.at, e.item, e.source); break;
        case 'giftOpen': this.animGift(e.at, e.item); break;
        case 'deliver': this.animDeliver(e); break;
        case 'remove': this.animRemove(e.at, e.points); break;
        case 'upgrade': this.animUpgrade(e.at, e.item); break;
        case 'boxOpen': this.animBox(e.at); break;
        case 'combo': this.animCombo(e.value); break;
        case 'full': this.animFull(); break;
        case 'win': delayWin = true; break;
        default: break;
      }
    }
    this.host.onEvents(events, this.state);
    if (delayWin && !this.ended) {
      this.ended = true;
      this.setSelected(-1);
      this.time.delayedCall(650, () => this.host.onWin());
    } else if (!this.ended && R.isStuck(this.state)) {
      this.time.delayedCall(500, () => { if (R.isStuck(this.state)) this.host.onStuck(); });
    }
  }

  private lock(i: number, ms: number) {
    this.locked.add(i);
    this.time.delayedCall(ms, () => this.locked.delete(i));
  }

  private animMove(from: number, to: number): void {
    const sp = this.sprites[from];
    this.sprites[from] = null;
    this.sprites[to] = sp;
    this.moveGlow(from, to);
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    this.tweens.add({ targets: sp, x: this.cx(to), y: this.cy(to), scale: this.itemScale(), duration: 160, ease: 'Quad.easeOut',
      onComplete: () => { this.glows[to]?.setVisible(true); } });
    audio.play('drop');
  }

  private animMerge(e: Extract<BoardEvent, { t: 'merge' }>): void {
    const a = this.sprites[e.from];
    const b = this.sprites[e.to];
    this.sprites[e.from] = null;
    this.glows[e.from]?.destroy();
    this.glows[e.from] = null;
    this.glows[e.to]?.destroy();
    this.glows[e.to] = null;
    const x = this.cx(e.to);
    const y = this.cy(e.to);
    const big = e.result.l >= 7 || e.result.c === 'special';
    const dur = big ? 420 : e.result.l >= 4 ? 330 : 260;
    this.lock(e.to, dur);
    const s0 = this.itemScale();
    // 1–3. anticipation, rapprochement, compression
    if (b) {
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, scaleX: s0 * 1.12, scaleY: s0 * 0.82, duration: dur * 0.22, ease: 'Quad.easeOut' });
    }
    if (a) {
      this.tweens.killTweensOf(a);
      this.boardLayer.bringToTop(a);
      this.tweens.add({ targets: a, x, y, scaleX: s0 * 0.9, scaleY: s0 * 0.9, duration: dur * 0.3, ease: 'Quad.easeIn' });
    }
    const variant = Math.random();
    this.time.delayedCall(dur * 0.32, () => {
      a?.destroy();
      b?.destroy();
      // 4. flash doux
      const fl = this.add.image(x, y, 'fx:flash').setBlendMode(Phaser.BlendModes.ADD).setScale((0.2 * (this.cell / 56)) / texScale());
      this.fxLayer.add(fl);
      this.tweens.add({ targets: fl, scale: ((big ? 1.6 : 1.0) * (this.cell / 56)) / texScale(), alpha: 0, duration: dur * 0.9, ease: 'Quad.easeOut', onComplete: () => fl.destroy() });
      // 5. particules
      this.burst(x, y, e.result, big ? 18 : e.result.l >= 4 ? 11 : 7, variant);
      if (big) this.ring(x, y, 0xffe7a0);
      // 6–7. nouvel objet, rebond élastique
      const sp = this.makeSprite(e.to, e.result);
      sp.setScale(s0 * 0.45);
      this.tweens.add({ targets: sp, scale: s0, duration: dur * 0.9, ease: 'Back.easeOut', easeParams: [2.6] });
      if (variant > 0.5 && !reducedFx()) this.tweens.add({ targets: sp, angle: { from: variant > 0.75 ? -8 : 8, to: 0 }, duration: dur, ease: 'Back.easeOut' });
      // 8. score flottant
      this.floatText(x, y - this.cell * 0.3, `+${e.points}`, e.combo >= 2 ? '#FFE7A0' : '#FFFFFF');
      // 9. son
      const pitch = 1 + Math.min(10, e.result.l) * 0.05 + Math.min(6, e.combo - 1) * 0.04;
      if (big) { audio.play('rare'); audio.play('pop3', pitch * 0.8); }
      else audio.play(e.result.l >= 4 ? 'pop2' : 'pop1', pitch);
      if (big && !reducedFx()) this.cameras.main.shake(110, 0.0025);
    });
  }

  private burst(x: number, y: number, r: ItemRef, n: number, variant: number): void {
    if (reducedFx()) n = Math.ceil(n / 3);
    const tints = COLLECTION_TINTS[r.c] ?? COLLECTION_TINTS.special;
    const tex = variant < 0.33 ? 'fx:spark' : variant < 0.66 ? 'fx:dot' : 'fx:heart';
    for (let k = 0; k < n; k++) {
      const a = (Math.PI * 2 * k) / n + Math.random() * 0.4;
      const d = this.cell * (0.45 + Math.random() * 0.45);
      const p = this.add.image(x, y, k % 3 === 0 ? 'fx:sparkGold' : tex).setTint(tints[k % tints.length]).setScale((0.5 + Math.random() * 0.5) / texScale());
      if (tex === 'fx:dot') p.setBlendMode(Phaser.BlendModes.ADD);
      this.fxLayer.add(p);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 6, alpha: 0, angle: Math.random() * 180, scale: 0, duration: 420 + Math.random() * 260, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  }

  private ring(x: number, y: number, tint: number): void {
    const r = this.add.image(x, y, 'fx:ring').setTint(tint).setScale(0.2 / texScale()).setBlendMode(Phaser.BlendModes.ADD);
    this.fxLayer.add(r);
    this.tweens.add({ targets: r, scale: (this.cell * 2.4) / 96 / texScale(), alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
  }

  private floatText(x: number, y: number, str: string, color = '#FFFFFF', size = 18): void {
    const t = this.text(x, y, str, { fontSize: `${size}px`, fontStyle: '700', color, stroke: '#51446D', strokeThickness: 5 }).setOrigin(0.5);
    this.fxLayer.add(t);
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, delay: 260, duration: 620, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  private animInvalid(from: number): void {
    const sp = this.sprites[from];
    if (sp) {
      this.tweens.killTweensOf(sp);
      this.tweens.add({ targets: sp, x: this.cx(from), y: this.cy(from), scale: this.itemScale(), duration: 240, ease: 'Back.easeOut',
        onComplete: () => this.wiggle(sp) });
      this.glows[from]?.setVisible(true);
    }
    audio.play('invalid');
  }

  private wiggle(o: Phaser.GameObjects.Image | null): void {
    if (!o) return;
    this.tweens.add({ targets: o, angle: { from: -7, to: 7 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
  }

  private animSpawn(at: number, item: ItemRef, source: string): void {
    const sp = this.makeSprite(at, item);
    const s0 = this.itemScale();
    this.lock(at, 300);
    if (source === 'gen') {
      sp.setPosition(this.basket.x, this.basket.y - 10).setScale(s0 * 0.4);
      const tx = this.cx(at);
      const ty = this.cy(at);
      const midY = Math.min(ty, this.basket.y) - this.cell * 1.2;
      const obj = { t: 0 };
      this.tweens.add({ targets: obj, t: 1, duration: 280, ease: 'Quad.easeOut',
        onUpdate: () => {
          const t = obj.t;
          const x = Phaser.Math.Linear(this.basket.x, tx, t);
          const y = (1 - t) * (1 - t) * (this.basket.y - 10) + 2 * (1 - t) * t * midY + t * t * ty;
          sp.setPosition(x, y).setScale(s0 * (0.4 + 0.6 * t));
        },
        onComplete: () => {
          this.tweens.add({ targets: sp, scaleX: s0 * 1.12, scaleY: s0 * 0.9, duration: 70, yoyo: true });
          this.glows[at]?.setPosition(tx, ty);
        } });
      audio.play('spawn', 1 + item.l * 0.05);
    } else {
      sp.setScale(0);
      this.tweens.add({ targets: sp, scale: s0, duration: 340, ease: 'Back.easeOut', delay: source === 'box' ? 120 : 0 });
      if (source === 'combo') { this.ring(this.cx(at), this.cy(at), 0xffe7a0); audio.play('sparkle'); }
    }
  }

  private animGift(at: number, item: ItemRef): void {
    const g = this.gifts[at];
    this.gifts[at] = null;
    this.lock(at, 420);
    const x = this.cx(at);
    const y = this.cy(at);
    if (g) {
      this.tweens.killTweensOf(g);
      this.tweens.add({ targets: g, scale: g.scale * 1.25, alpha: 0, angle: 12, duration: 260, ease: 'Back.easeIn', onComplete: () => g.destroy() });
    }
    this.time.delayedCall(180, () => {
      this.burst(x, y, { c: 'special', l: 1 }, 10, 0.9);
      const sp = this.makeSprite(at, item);
      sp.setScale(0);
      this.tweens.add({ targets: sp, scale: this.itemScale(), duration: 360, ease: 'Back.easeOut' });
      audio.play('chest');
    });
  }

  private animDeliver(e: Extract<BoardEvent, { t: 'deliver' }>): void {
    const target = this.host.orderAnchor(e.slot) ?? { x: this.W / 2, y: this.oy - 40 };
    e.cells.forEach((i, k) => {
      const sp = this.sprites[i];
      this.sprites[i] = null;
      this.glows[i]?.destroy();
      this.glows[i] = null;
      if (!sp) return;
      this.tweens.killTweensOf(sp);
      this.fxLayer.add(sp);
      this.tweens.add({ targets: sp, x: target.x, y: target.y, scale: this.itemScale() * 0.5, alpha: 0.2, delay: k * 70, duration: 420, ease: 'Cubic.easeIn', onComplete: () => sp.destroy() });
    });
    this.time.delayedCall(420, () => { audio.play('deliver'); this.heartsFly(target.x, target.y, Math.min(8, e.hearts)); });
    this.floatText(target.x, target.y + 30, `+${e.hearts} ♡`, '#FFD1E0', 20);
  }

  private heartsFly(x: number, y: number, n: number): void {
    const t = this.host.heartsAnchor();
    if (!t) return;
    for (let k = 0; k < n; k++) {
      const h = this.add.image(x, y, 'fx:heart').setScale(0.9 / texScale() * 1.2);
      this.fxLayer.add(h);
      this.tweens.add({ targets: h, x: t.x + (Math.random() - 0.5) * 6, y: t.y, delay: k * 50, duration: 500 + Math.random() * 120, ease: 'Cubic.easeIn',
        onComplete: () => { h.destroy(); if (k % 2 === 0) audio.play('heart', 1 + k * 0.03); } });
    }
  }

  private animRemove(at: number, points: number): void {
    const sp = this.sprites[at];
    this.sprites[at] = null;
    this.glows[at]?.destroy();
    this.glows[at] = null;
    if (sp) {
      this.tweens.killTweensOf(sp);
      this.tweens.add({ targets: sp, y: sp.y - 20, alpha: 0, scale: sp.scale * 0.6, angle: 40, duration: 380, ease: 'Quad.easeIn', onComplete: () => sp.destroy() });
    }
    this.floatText(this.cx(at), this.cy(at) - 10, `+${points}`, '#D9CDF5', 15);
    audio.play('whoosh');
  }

  private animUpgrade(at: number, item: ItemRef): void {
    const old = this.sprites[at];
    old?.destroy();
    this.sprites[at] = null;
    this.glows[at]?.destroy();
    this.glows[at] = null;
    const x = this.cx(at);
    const y = this.cy(at);
    this.burst(x, y, item, 14, 0.1);
    this.ring(x, y, 0xffe7a0);
    const sp = this.makeSprite(at, item);
    sp.setScale(0);
    this.tweens.add({ targets: sp, scale: this.itemScale(), duration: 380, ease: 'Back.easeOut' });
    audio.play('rare');
  }

  private animBox(at: number): void {
    const sp = this.sprites[at];
    this.sprites[at] = null;
    this.glows[at]?.destroy();
    this.glows[at] = null;
    if (sp) this.tweens.add({ targets: sp, scale: sp.scale * 1.4, alpha: 0, duration: 260, onComplete: () => sp.destroy() });
    this.ring(this.cx(at), this.cy(at), 0xff9cc0);
    audio.play('chest');
  }

  private animCombo(value: number): void {
    const t = this.comboText;
    t.setText(value >= 5 ? `COMBO ×${value} !` : `Combo ×${value}`);
    t.setY(this.oy - 6);
    this.tweens.killTweensOf(t);
    t.setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: t, scale: value >= 5 ? 1.25 : 1.05, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400 });
    audio.play('combo', 1 + value * 0.1);
    const bx = this.W / 2;
    const by = this.oy + (this.cell * BOARD_H) / 2;
    if (value >= 3) this.halo(value);
    if (value >= 5) this.confetti(bx, this.oy, value >= 8 ? 60 : 36);
    void by;
  }

  private halo(value: number): void {
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const col = value >= 5 ? 0xf3c86b : 0xff75a8;
    g.lineStyle(6, col, 0.8);
    g.strokeRoundedRect(this.ox - 6, this.oy - 6, this.cell * BOARD_W + 12, this.cell * BOARD_H + 12, 20);
    this.fxLayer.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy() });
  }

  confetti(x: number, y: number, n: number): void {
    if (reducedFx()) n = Math.ceil(n / 4);
    const cols = [0xff75a8, 0xf3c86b, 0xb9a5e8, 0xffc0a3, 0xffffff, 0x9fd8a8];
    for (let k = 0; k < n; k++) {
      const c = this.add.image(x + (Math.random() - 0.5) * this.cell * 4, y, 'fx:confetti').setTint(cols[k % cols.length]).setScale(0.8 / texScale() * 1.5);
      this.fxLayer.add(c);
      const dx = (Math.random() - 0.5) * this.W * 0.9;
      const up = 60 + Math.random() * 120;
      this.tweens.add({ targets: c, x: c.x + dx * 0.4, y: y - up, angle: Math.random() * 720, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: c, x: c.x + dx * 0.4, y: this.H + 20, angle: c.angle + 360, duration: 1400 + Math.random() * 900, ease: 'Quad.easeIn', onComplete: () => c.destroy() }) });
    }
  }

  private animFull(): void {
    const k = 1 / texScale();
    this.tweens.add({ targets: this.basket, x: { from: this.W / 2 - 6, to: this.W / 2 + 6 }, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.basket.setX(this.W / 2) });
    this.basket.setScale(k);
    audio.play('invalid');
    this.host.onFull();
    if (R.isStuck(this.state)) this.host.onStuck();
  }

  /** Victoire : étoiles et confettis au-dessus du plateau. */
  celebrate(stars: number): void {
    this.confetti(this.W / 2, this.oy + this.cell, 70);
    for (let k = 0; k < stars; k++) {
      this.time.delayedCall(250 + k * 260, () => {
        const s = this.add.image(this.W / 2 + (k - (stars - 1) / 2) * 60, this.oy + this.cell * 2.5, 'fx:star').setScale(0).setDepth(130);
        this.fxLayer.add(s);
        this.tweens.add({ targets: s, scale: 2.2 / texScale() * 1.2, angle: 360, duration: 380, ease: 'Back.easeOut' });
        this.tweens.add({ targets: s, alpha: 0, y: s.y - 40, delay: 1100, duration: 500, onComplete: () => s.destroy() });
        audio.play('sparkle', 1 + k * 0.15);
      });
    }
  }

  /**
   * Fin de l'histoire (niveau 30) : le Cœur précieux grandit, les objets du
   * plateau se changent en petites lumières qui s'envolent, le plateau s'efface.
   */
  finale(): Promise<void> {
    return new Promise((resolve) => {
      this.ended = true;
      const heartIdx = this.state.cells.findIndex((c) => c.item?.c === 'love' && c.item.l === 9);
      const heart = heartIdx >= 0 ? this.sprites[heartIdx] : null;
      const order = [...Array(BOARD_SIZE).keys()].filter((i) => i !== heartIdx && this.sprites[i]);
      order.sort(() => Math.random() - 0.5);
      order.forEach((i, k) => {
        const sp = this.sprites[i]!;
        this.time.delayedCall(400 + k * 110, () => {
          const l = this.add.image(sp.x, sp.y, 'fx:light').setBlendMode(Phaser.BlendModes.ADD).setScale(0.6 / texScale());
          this.fxLayer.add(l);
          this.tweens.add({ targets: sp, scale: 0, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
          this.tweens.add({ targets: l, y: -40, x: l.x + (Math.random() - 0.5) * 120, scale: 0.3 / texScale(), duration: 2600 + Math.random() * 800, ease: 'Sine.easeIn', onComplete: () => l.destroy() });
          audio.play('sparkle', 0.9 + (k % 6) * 0.06);
        });
      });
      const t0 = 400 + order.length * 110;
      this.time.delayedCall(t0, () => {
        this.tweens.add({ targets: [this.boardBg, ...this.tiles, this.basket, this.basketLabel, ...this.gifts.filter(Boolean)], alpha: 0, duration: 1200 });
        if (heart) {
          this.boardLayer.bringToTop(heart);
          this.tweens.add({ targets: heart, x: this.W / 2, y: this.H * 0.42, scale: this.itemScale() * 3.2, duration: 1600, ease: 'Sine.easeInOut' });
          const halo = this.add.image(this.W / 2, this.H * 0.42, 'fx:light').setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0.9);
          this.boardLayer.addAt(halo, 0);
          this.tweens.add({ targets: halo, scale: 9 / texScale(), duration: 1800, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: halo, alpha: 0.5, yoyo: true, repeat: -1, duration: 900, delay: 1800 });
          this.tweens.add({ targets: heart, scale: this.itemScale() * 3.4, yoyo: true, repeat: -1, duration: 700, delay: 1700, ease: 'Sine.easeInOut' });
        }
        audio.play('victory');
        this.time.delayedCall(2600, () => resolve());
      });
    });
  }

  override update(time: number): void {
    // Indice automatique après un long moment sans action.
    if (!this.ended && !this.drag && time - this.lastAction > 14_000 && time - this.lastHint > 14_000) {
      this.lastHint = time;
      this.showHint();
    }
  }
}

export { MAX_LEVEL };
