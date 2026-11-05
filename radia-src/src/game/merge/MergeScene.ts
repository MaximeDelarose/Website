/**
 * Scène du plateau de fusion : rendu, glisser-déposer, animations (« game feel »).
 * Les règles sont dans rules.ts ; cette scène ne fait qu'appliquer les
 * actions et animer les événements qu'elles renvoient.
 *
 * GAME FEEL (voir aussi src/game/fx/README.md)
 *  - sélection : micro-haptique `select`, léger soulèvement, petite ombre, son doux ;
 *  - dépôt : petit rebond + haptique `drop` ;
 *  - fusion : anticipation (~70 ms, les deux objets se compriment) → impact → POP,
 *    squash & stretch, éclat, particules, haptique `merge` ;
 *  - fusion RARE (niveau ≥ 6) : double POP, étincelles dorées, rayons, ralenti ~120 ms, haptique `rare` ;
 *  - fusion MAXIMALE (niveau max de la collection) : onde de choc, rayons plein plateau,
 *    pluie d'étincelles, flash, ralenti, haptique `maxMerge` ;
 *  - combo : compteur discret animé, hauteur du son qui monte, haptique `combo` aux paliers 3/5/8.
 *  Les animations ordinaires sont écourtées dès qu'une nouvelle action arrive (jamais bloquant).
 *  Particules plafonnées (ParticleBudget) ; effets réduits → 1/3 ; animations réduites → plus de
 *  ralenti, de rayons ni de secousse.
 *
 * API PUBLIQUE pour l'interface (B2) — coordonnées en pixels CSS (repère de la page) :
 *  - `dropFx(cell, rarity)`       : arrivée d'un drop sur une case (lumière + étincelles couleur de rareté) ;
 *  - `chestFx(x, y)`              : ouverture d'un coffre (confettis dorés, rayons, son, haptique `chest`) ;
 *  - `maxMergeFx(cell)`           : effet spectaculaire du niveau maximal (aussi utilisé par les fusions) ;
 *  - `comboFx(value, mult)`       : compteur de combo animé (+ son et haptique de palier) ;
 *  - `flyTo(kind, fromCell, toXY, cb)` : une icône (coin, diamond, energy, heart, star, flowers, fabric,
 *                                   cocoa, ticket, chest…) vole de la case vers un compteur ; `cb` à l'arrivée ;
 *  - `highlightCells(cells)`      : fait pulser des cases (commande, tutoriel) ;
 *  - `cellCenter(i)`, `cellSize`, `isIdle()`, `celebrate()`, `confetti()` (existants).
 */
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';
import { BOARD_H, BOARD_SIZE, BOARD_W, type BoardEvent, type LevelDef, type RunState } from './types';
import * as R from './rules';
import { suggestMerge, botStep } from './bot';
import { LONG_PRESS_MS, PointerFsm, staleGesture } from './pointerFsm';
import { POINTERS_RESET_EVENT } from '../pointerHygiene';
import { ENDLESS_CFG } from '../endless/config';
import { MAX_LEVEL, RARITY_COLOR, SPECIAL, collMax, type ItemRef, type Rarity } from '../../data/items';
import {
  COLLECTION_TINTS, ITEM_TEX, ensureBoardTextures, ensureFlyTexture, ensureFxTextures, ensureItemTexture, ensureLockRewardTexture,
} from './textures';
import { audio, reducedFx, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { texScale } from '../art/kit';
import {
  POP_AT_MS, SLAM_MS, WINDUP_MS, ParticleBudget, comboMilestone, comboPopLabel, comboPopMs, comboPitch, fxProfile, hexInt, mergeTier, popSfx, scaledCount,
  type FxProfile, type MergeTier,
} from '../fx/feel';
import type { Sfx } from '../../audio/AudioManager';

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
  /** Économie (facultatif : tests et anciens appels). */
  useEnergy?(n: number): boolean;
  overBag?(x: number, y: number): boolean;
  bagHasRoom?(): boolean;
  bagPut?(r: ItemRef): void;
  bagAnchor?(): { x: number; y: number } | null;
  onBagFull?(): void;
  /** Objet mis en avant (sélection, générateur touché, case verrouillée) : alimente le panneau sous le plateau. -1 = aucun. */
  onSelect?(cell: number): void;
  /** Appui long (≥ 550 ms, immobile) sur un objet, un générateur ou une case verrouillée : ouvre sa fiche. */
  onLongPress?(cell: number): void;
  /** Apparence achetée : cases et style d'éclats. */
  skin?(): string;
  fxStyle?(): string;
}

export interface MergeSceneData { def: LevelDef; state: RunState; host: MergeHost }

interface Drag { from: number; sprite: Phaser.GameObjects.Image | null; startX: number; startY: number; moved: boolean; pointerId: number; long?: boolean; t0: number; lostAt?: number }
/** Éléments dessinés sur une case verrouillée (toile / sable / cadenas, objet ou récompense visible, lueur). */
interface LockVis { objs: Phaser.GameObjects.Image[]; ov: Phaser.GameObjects.Image | null; under: Phaser.GameObjects.Image | null; twinkle: Phaser.Time.TimerEvent | null }

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
  /** Cases compatibles avec l'objet touché (surbrillance) et objets qui pulsent. */
  private matchHi: Phaser.GameObjects.Image[] = [];
  private matchCells: number[] = [];
  private comboText!: Phaser.GameObjects.Text;
  private lastMergeAt = -1;
  /** Case de la dernière fusion (ancre des effets de récompense proches de la fusion). */
  get lastMerge(): number { return this.lastMergeAt >= 0 ? this.lastMergeAt : 14; }
  private drag: Drag | null = null;
  private fsm = new PointerFsm();
  private pressTimer: number | undefined;
  private lockVis: (LockVis | null)[] = [];
  private selected = -1;
  private locked = new Set<number>();
  /** Vrai quand aucune animation de fusion ni glisser en cours (invitations : moment sûr pour notifier). */
  isIdle(): boolean { return this.locked.size === 0 && !this.drag; }
  private ended = false;
  private boardLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private lastAction = 0;
  private lastHint = 0;
  /** Ombre sous l'objet soulevé. */
  private shadow!: Phaser.GameObjects.Image;
  /** Budget de particules et profil d'effets (recalculés à chaque effet : réglages modifiables en jeu). */
  private budget = new ParticleBudget(110);
  private lastPop: Sfx | undefined;
  /** Fusions ordinaires en cours : finaliseurs appelés tout de suite si une nouvelle action arrive. */
  private pending = new Map<number, { fin: () => void; tier: MergeTier }>();
  private slowDepth = 0;
  private extraHi: Phaser.GameObjects.Image[] = [];

  constructor() { super(MergeScene.KEY); }

  init(data: MergeSceneData): void {
    this.def = data.def;
    this.state = data.state;
    this.host = data.host;
    this.sprites = new Array(BOARD_SIZE).fill(null);
    this.gifts = new Array(BOARD_SIZE).fill(null);
    this.glows = new Array(BOARD_SIZE).fill(null);
    this.lockVis = new Array(BOARD_SIZE).fill(null);
    this.tiles = [];
    this.locked.clear();
    this.pending.clear();
    this.budget = new ParticleBudget(110);
    this.slowDepth = 0;
    this.extraHi = [];
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
    this.input.on('gameout', () => { /* le doigt peut passer sur l'interface (ex. le sac) */ });
    // Position du doigt suivie sur toute la page : au-dessus d'un bouton HTML
    // (le sac), le canvas ne reçoit plus les mouvements.
    const onWinMove = (e: PointerEvent) => {
      this.lastClient = { x: e.clientX, y: e.clientY, id: e.pointerId };
      const d = this.drag;
      if (d?.moved && d.sprite && (e.target as Element | null)?.tagName !== 'CANVAS') {
        d.sprite.setPosition(e.clientX, e.clientY - this.cell * 0.28);
        this.placeShadow(e.clientX, e.clientY - this.cell * 0.28, 1.15);
        this.targetHi.setVisible(false);
      }
    };
    const onWinUp = (e: PointerEvent) => {
      this.lastClient = { x: e.clientX, y: e.clientY, id: e.pointerId };
      // relâché au-dessus de l'interface : Phaser ne le voit pas toujours
      if (this.drag && (e.target as Element | null)?.tagName !== 'CANVAS') {
        window.setTimeout(() => { if (this.drag) this.finishDragAt(e.clientX, e.clientY); }, 0);
      }
    };
    // Toucher annulé (geste système, appel, défilement repris par Safari) ou page quittée : Phaser ne reçoit alors aucun
    // « pointerup ». Sans ça le geste restait « en cours » et plus aucun objet ne se sélectionnait.
    const onAbort = () => { if (this.drag) this.cancelDrag(); };
    const onHidden = () => { if (document.visibilityState === 'hidden') onAbort(); };
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onAbort);
    window.addEventListener('touchcancel', onAbort);
    window.addEventListener('blur', onAbort);
    window.addEventListener(POINTERS_RESET_EVENT, onAbort); // un pointeur coincé vient d'être libéré : le geste associé est annulé proprement
    document.addEventListener('visibilitychange', onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.clearTimeout(this.pressTimer);
      window.removeEventListener('pointermove', onWinMove); window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onAbort); window.removeEventListener('touchcancel', onAbort);
      window.removeEventListener('blur', onAbort); window.removeEventListener(POINTERS_RESET_EVENT, onAbort); document.removeEventListener('visibilitychange', onHidden);
      this.slowDepth = 0; this.time.timeScale = 1; this.tweens.timeScale = 1;
    });
    this.lastAction = this.time.now;
    // Apparition du plateau
    this.boardLayer.setAlpha(0);
    this.tweens.add({ targets: this.boardLayer, alpha: 1, duration: 350 });
    this.sprites.forEach((sp, i) => {
      if (!sp) return;
      sp.setScale(0);
      this.tweens.add({ targets: sp, scale: this.itemScale(sp), duration: 380, delay: 120 + i * 12, ease: 'Back.easeOut' });
    });
  }

  // ------------------------------------------------------------ géométrie

  private computeGeometry(): void {
    const a = this.host.area();
    // plus de panier : le plateau prend toute la place (générateurs dedans)
    const availH = this.H - a.top - (this.H - a.bottom) - 14;
    const availW = Math.min(this.W - 20, 560);
    this.cell = Math.floor(Math.max(36, Math.min(availW / BOARD_W, availH / BOARD_H)));
    const bw = this.cell * BOARD_W;
    const bh = this.cell * BOARD_H;
    this.ox = Math.round((this.W - bw) / 2);
    this.oy = Math.round(a.top + Math.max(4, (availH - bh) / 2) + 4);
  }

  /**
   * Taille d'un objet : il occupe ~88 % de la case au niveau 1 et grandit un
   * peu à chaque niveau (jusqu'à ~97 % au niveau 10), respiration comprise,
   * sans jamais déborder sur la case voisine.
   */
  private scaleFor(r: ItemRef | null | undefined): number {
    const f = !r ? 1 : r.c === 'special' || r.c === 'gen' ? 1.06 : 1 + ((Math.min(collMax(r.c), r.l) - 1) / Math.max(1, collMax(r.c) - 1)) * 0.099;
    return (this.cell * f) / (ITEM_TEX * texScale());
  }

  /** Échelle de repos d'un sprite d'objet. */
  private itemScale(sp?: Phaser.GameObjects.Image | null): number {
    const b = sp?.getData('base') as number | undefined;
    return b ?? this.scaleFor(null);
  }
  private cx(i: number) { return this.ox + (i % BOARD_W) * this.cell + this.cell / 2; }
  private cy(i: number) { return this.oy + Math.floor(i / BOARD_W) * this.cell + this.cell / 2; }

  private cellAt(x: number, y: number): number {
    const gx = Math.floor((x - this.ox) / this.cell);
    const gy = Math.floor((y - this.oy) / this.cell);
    if (gx < 0 || gy < 0 || gx >= BOARD_W || gy >= BOARD_H) return -1;
    return gy * BOARD_W + gx;
  }

  private buildBoard(): void {
    ensureBoardTextures(this, this.cell, this.host.skin?.() ?? 'classic');
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
    this.shadow = this.add.image(0, 0, 'fx:shadow').setScale(1 / texScale()).setVisible(false).setAlpha(0.9);
    this.boardLayer.add([this.selHi, this.targetHi, this.shadow]);
    this.extraHi.forEach((h) => h.destroy());
    this.extraHi = [];

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
      this.clearLockVis(i);
      if (cell.lock) this.makeLockVis(i);
    }

    this.comboText?.destroy();
    this.comboText = this.text(this.W / 2, this.oy + this.cell * 0.55, '', { fontSize: '22px', fontStyle: '700', color: '#FFFFFF', stroke: '#E8558F', strokeThickness: 6 }).setOrigin(0.5, 0.5).setDepth(120).setAlpha(0);
  }

  layout(): void {
    if (this.drag) this.cancelDrag();
    this.setSelected(-1);
    this.computeGeometry();
    this.buildBoard();
  }

  private makeSprite(i: number, r: ItemRef): Phaser.GameObjects.Image {
    const key = ensureItemTexture(this, r);
    const sp = this.add.image(this.cx(i), this.cy(i), key);
    sp.setData('base', this.scaleFor(r));
    // respiration propre à chaque objet (phase et rythme différents)
    sp.setData('phase', Math.random() * Math.PI * 2);
    sp.setData('speed', 2.2 + Math.random() * 0.9 - Math.min(9, r.l) * 0.07);
    sp.setScale(this.itemScale(sp));
    this.boardLayer.add(sp);
    this.sprites[i] = sp;
    this.refreshGlow(i, r);
    return sp;
  }

  private refreshGlow(i: number, r: ItemRef | null): void {
    this.glows[i]?.destroy();
    this.glows[i] = null;
    if (!r || (r.c !== 'special' && r.c !== 'gen' && r.l < Math.max(7, collMax(r.c) - 2)) || r.c === 'gen' || reducedFx()) return;
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
    if (this.ended) return;
    // un geste précédent jamais terminé (toucher annulé, relâchement perdu) ne doit JAMAIS bloquer la sélection
    if (this.drag) { if (this.gestureStale(p)) this.cancelDrag(); else return; }
    this.host.onActivity();
    this.lastAction = this.time.now;
    this.clearHint();
    this.flushOrdinary();
    const x = p.worldX;
    const y = p.worldY;
    const i = this.cellAt(x, y);
    if (i < 0) { this.setSelected(-1); return; }
    const booster = this.host.booster();
    if (booster) { this.applyBooster(booster, i); return; }
    const cell = this.state.cells[i];
    // une case verrouillée sélectionnée ne sert pas de départ à un déplacement : la nouvelle pression repart de zéro
    if (this.selected >= 0 && this.state.cells[this.selected]?.lock && this.selected !== i) this.setSelected(-1);
    // case verrouillée : toucher court = objectif / sélection, appui long = fiche (aucun glissé)
    if (cell.lock && !cell.item) {
      this.drag = { from: i, sprite: null, startX: x, startY: y, moved: false, pointerId: p.id, t0: performance.now() };
      this.fsm.down(performance.now(), x, y, true);
      this.armLong();
      return;
    }
    if (!cell.item || this.locked.has(i)) {
      // Toucher une case vide (ou un paquet) avec un objet sélectionné → tentative de déplacement
      if (this.selected >= 0 && this.selected !== i) {
        const from = this.selected;
        this.setSelected(-1);
        this.attemptMove(from, i);
      } else if (cell.gift) {
        this.wiggle(this.gifts[i]);
        audio.play('invalid');
      } else if (!cell.item) this.host.onSelect?.(-1);
      return;
    }
    const sp = this.sprites[i];
    if (!sp) return;
    this.drag = { from: i, sprite: sp, startX: x, startY: y, moved: false, pointerId: p.id, t0: performance.now() };
    this.fsm.down(performance.now(), x, y, true);
    this.armLong();
    // Dès que le doigt se pose : l'objet grossit et ses partenaires de fusion s'allument.
    if (this.selected < 0 || this.selected === i) {
      this.lift(sp);
      haptic('select');
      audio.play('select');
      this.showMatches(i);
      this.selHi.setPosition(this.cx(i), this.cy(i)).setScale(1 / texScale()).setVisible(true);
    }
  }

  private pointerById(id: number): Phaser.Input.Pointer | undefined {
    const m = this.input.manager;
    return [this.input.mousePointer, ...m.pointers].find((q) => q && q.id === id);
  }

  private gestureStale(p: Phaser.Input.Pointer): boolean {
    const d = this.drag;
    if (!d) return false;
    return staleGesture({ samePointer: d.pointerId === p.id, pointerDown: this.pointerById(d.pointerId)?.isDown, ageMs: performance.now() - d.t0 });
  }

  /** Arme le minuteur d'appui long (minuteur réel : insensible au ralenti visuel). */
  private armLong(): void {
    window.clearTimeout(this.pressTimer);
    this.pressTimer = window.setTimeout(() => {
      const d = this.drag;
      if (d && this.fsm.tick(performance.now()) === 'long') this.fireLong(d);
    }, LONG_PRESS_MS + 8);
  }

  /** Appui long déclenché : retour haptique léger, l'objet reprend sa place, la fiche s'ouvre ; le relâchement sera avalé. */
  private fireLong(d: Drag): void {
    if (d.long || d.moved || this.drag !== d) return;
    d.long = true;
    window.clearTimeout(this.pressTimer);
    haptic('drop');
    this.clearMatches();
    this.selHi.setVisible(false);
    this.shadow.setVisible(false);
    if (d.sprite) {
      this.tweens.killTweensOf(d.sprite);
      this.tweens.add({ targets: d.sprite, x: this.cx(d.from), y: this.cy(d.from), scale: this.itemScale(d.sprite), duration: 140, ease: 'Quad.easeOut' });
    }
    if (this.selected >= 0) { const prev = this.selected; this.selected = -1; this.unlift(prev); }
    this.host.onLongPress?.(d.from);
  }

  /** Soulèvement : l'objet grossit, monte un peu et projette une petite ombre. */
  private lift(sp: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(sp);
    this.boardLayer.bringToTop(sp);
    const lifted = this.cy(this.sprites.indexOf(sp)) - this.cell * 0.05;
    this.tweens.add({ targets: sp, scale: this.itemScale(sp) * 1.25, y: Number.isFinite(lifted) ? lifted : sp.y, duration: 140, ease: 'Back.easeOut' });
    this.placeShadow(sp.x, lifted, 1);
  }

  private unlift(i: number): void {
    this.shadow.setVisible(false);
    const sp = this.sprites[i];
    if (!sp || this.locked.has(i)) return;
    this.tweens.killTweensOf(sp);
    this.tweens.add({ targets: sp, y: this.cy(i), scale: this.itemScale(sp), duration: 140, ease: 'Quad.easeOut' });
  }

  /** Ombre douce sous un objet soulevé (x, y = centre de l'objet). */
  private placeShadow(x: number, y: number, k: number): void {
    if (!this.shadow) return;
    this.shadow.setPosition(x + this.cell * 0.04, y + this.cell * 0.36);
    this.shadow.setScale((this.cell / 44 / texScale()) * k).setAlpha(0.9).setVisible(true);
  }

  /** Allume les cases où l'objet de la case i peut fusionner. */
  private showMatches(i: number): void {
    this.clearMatches();
    const a = this.state.cells[i]?.item;
    if (!a) return;
    const k = 1 / texScale();
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (j === i) continue;
      const c = this.state.cells[j];
      const ok = R.canMerge(a, c.item) || (!!c.gift && a.c === 'special' && a.l === SPECIAL.KEY);
      if (!ok) continue;
      const hi = this.add.image(this.cx(j), this.cy(j), 'cell:ok').setScale(k);
      this.boardLayer.addAt(hi, this.tiles.length);
      this.tweens.add({ targets: hi, alpha: 0.4, yoyo: true, repeat: -1, duration: 480, ease: 'Sine.easeInOut' });
      this.matchHi.push(hi);
      const sp = this.sprites[j] ?? this.gifts[j];
      if (sp && !this.locked.has(j)) {
        this.matchCells.push(j);
        if (this.sprites[j]) this.tweens.add({ targets: sp, scale: this.itemScale(this.sprites[j]) * 1.1, yoyo: true, repeat: -1, duration: 480, ease: 'Sine.easeInOut' });
      }
    }
  }

  private clearMatches(): void {
    this.matchHi.forEach((m) => { this.tweens.killTweensOf(m); m.destroy(); });
    this.matchHi = [];
    for (const j of this.matchCells) {
      const sp = this.sprites[j];
      if (sp && !this.locked.has(j) && this.drag?.sprite !== sp && this.selected !== j) { this.tweens.killTweensOf(sp); sp.setScale(this.itemScale(sp)).setY(this.cy(j)); }
    }
    this.matchCells = [];
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || p.id !== d.pointerId) return;
    const x = p.worldX;
    const y = p.worldY;
    if (d.long) return; // après un appui long, le doigt peut bouger sans rien provoquer
    if (!d.moved) {
      const out = this.fsm.move(performance.now(), x, y);
      if (out === 'long') { this.fireLong(d); return; }
      if (out !== 'dragStart') return;
      window.clearTimeout(this.pressTimer);
      if (!d.sprite) { this.drag = null; this.fsm.cancel(); return; } // case verrouillée : pas de glissé
      d.moved = true;
      // on garde la surbrillance des partenaires pendant le glisser
      this.selected = -1;
      this.selHi.setVisible(false);
      this.boardLayer.bringToTop(d.sprite);
      this.tweens.killTweensOf(d.sprite);
      this.tweens.add({ targets: d.sprite, scale: this.itemScale(d.sprite) * 1.18, duration: 120, ease: 'Quad.easeOut' });
      this.glows[d.from]?.setVisible(false);
    }
    if (!d.sprite) return;
    // l'objet suit le doigt, légèrement au-dessus pour rester visible
    d.sprite.setPosition(x, y - this.cell * 0.28);
    this.placeShadow(x, y - this.cell * 0.28, 1.15);
    const t = this.cellAt(x, y);
    if (t >= 0 && t !== d.from) {
      const a = this.state.cells[d.from].item;
      const b = this.state.cells[t];
      const ok = R.canMerge(a, b.item) || (!b.item && !b.gift) || (!!b.gift && a?.c === 'special' && a.l === SPECIAL.KEY);
      this.targetHi.setTexture(R.canMerge(a, b.item) || b.gift ? 'cell:ok' : 'cell:move');
      this.targetHi.setPosition(this.cx(t), this.cy(t)).setVisible(ok);
    } else this.targetHi.setVisible(false);
  }

  private lastClient: { x: number; y: number; id: number } | null = null;

  /** Fin d'un glisser relâché hors du canvas (au-dessus d'un bouton HTML). */
  private finishDragAt(x: number, y: number): void {
    const d = this.drag;
    if (!d) return;
    this.onUpAt(d, x, y);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || p.id !== d.pointerId) return;
    // si le doigt a fini au-dessus de l'interface, on prend sa vraie position
    const lc = this.lastClient;
    const outside = lc && (lc.x < 0 || lc.y < 0 || p.upElement?.tagName !== 'CANVAS');
    this.onUpAt(d, outside && lc ? lc.x : p.worldX, outside && lc ? lc.y : p.worldY);
  }

  private onUpAt(d: Drag, x: number, y: number): void {
    if (this.drag !== d) return;
    this.drag = null;
    window.clearTimeout(this.pressTimer);
    const out = this.fsm.up(performance.now());
    this.targetHi.setVisible(false);
    if (d.long) return; // relâchement après un appui long : avalé (ni fusion, ni déplacement, ni toucher)
    if (out === 'long') { this.drag = d; this.fireLong(d); this.drag = null; return; }
    if (!d.sprite) { this.selectLock(d.from); return; }
    if (d.moved) this.shadow.setVisible(false);
    if (!d.moved) {
      // simple toucher
      const it = this.state.cells[d.from].item;
      if (it?.c === 'special' && it.l === SPECIAL.BOX) { this.clearMatches(); this.apply(R.tapItem(this.state, this.def, d.from)); return; }
      if (it?.c === 'gen' && (this.selected < 0 || this.selected === d.from)) {
        this.clearMatches();
        this.selHi.setVisible(false);
        this.selected = -1;
        this.tapGenerator(d.from, d.sprite);
        return;
      }
      if (this.selected >= 0 && this.selected !== d.from) {
        const from = this.selected;
        this.setSelected(-1);
        this.attemptMove(from, d.from);
        return;
      }
      if (this.selected === d.from) { this.setSelected(-1); this.host.onInspect(null); return; }
      // l'objet reste sélectionné : grossi, partenaires allumés
      this.setSelected(d.from);
      this.host.onInspect(it);
      return;
    }
    this.clearMatches();
    this.selHi.setVisible(false);
    const t = this.cellAt(x, y);
    // relâché sur le sac → l'objet y est rangé
    if (t < 0 && this.host.overBag?.(x, y)) { this.stash(d.from, d.sprite); return; }
    if (t < 0 || t === d.from) {
      // relâché hors du plateau (ou sur place) → retour
      this.returnSprite(d.from, d.sprite);
      return;
    }
    this.attemptMove(d.from, t, true);
  }

  /** Toucher un générateur : 1 énergie → un objet apparaît à côté. */
  private tapGenerator(i: number, sp: Phaser.GameObjects.Image): void {
    const base = this.itemScale(sp);
    this.tweens.killTweensOf(sp);
    sp.setPosition(this.cx(i), this.cy(i));
    if (R.spawnCell(this.state, undefined, i) < 0) {
      sp.setScale(base);
      this.wiggle(sp);
      this.apply([{ t: 'full' }]);
      return;
    }
    if (!(this.host.useEnergy?.(1) ?? true)) {
      sp.setScale(base);
      this.wiggle(sp);
      audio.play('invalid');
      return;
    }
    this.host.onSelect?.(i);
    // squash & stretch du générateur
    sp.setScale(base * 1.18, base * 0.82);
    this.tweens.add({ targets: sp, scaleX: base, scaleY: base, duration: 260, ease: 'Back.easeOut', easeParams: [3] });
    this.apply(R.tapGenerator(this.state, this.def, i));
  }

  /** Range un objet dans le sac (s'il reste de la place). */
  private stash(i: number, sp: Phaser.GameObjects.Image): void {
    const it = this.state.cells[i].item;
    if (!it || it.c === 'gen' || !(this.host.bagHasRoom?.() ?? false)) {
      this.returnSprite(i, sp);
      if (it && it.c !== 'gen') this.host.onBagFull?.();
      return;
    }
    const r = R.stashItem(this.state, this.def, i);
    if (!r) { this.returnSprite(i, sp); return; }
    this.sprites[i] = null;
    this.shadow.setVisible(false);
    this.glows[i]?.destroy();
    this.glows[i] = null;
    const target = this.host.bagAnchor?.() ?? { x: this.W - 40, y: this.H - 60 };
    this.tweens.killTweensOf(sp);
    this.fxLayer.add(sp);
    this.tweens.add({ targets: sp, x: target.x, y: target.y, scale: this.itemScale(sp) * 0.4, alpha: 0.4, duration: 300, ease: 'Cubic.easeIn', onComplete: () => sp.destroy() });
    audio.play('drop');
    this.host.bagPut?.(r.item);
    this.host.onEvents(r.ev.filter((e) => e.t !== 'remove'), this.state);
  }

  /** Sort un objet du sac sur le plateau. */
  placeFromBag(r: ItemRef): boolean {
    if (this.ended || R.spawnCell(this.state) < 0) return false;
    this.apply(R.placeItem(this.state, this.def, r));
    return true;
  }

  private cancelDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    window.clearTimeout(this.pressTimer);
    this.fsm.cancel();
    this.targetHi.setVisible(false);
    this.shadow.setVisible(false);
    this.clearMatches();
    this.selHi.setVisible(false);
    if (d.sprite && !d.long) this.returnSprite(d.from, d.sprite);
  }

  private returnSprite(i: number, sp: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(sp);
    this.shadow.setVisible(false);
    this.tweens.add({ targets: sp, x: this.cx(i), y: this.cy(i), scale: this.itemScale(sp), duration: 220, ease: 'Back.easeOut' });
    this.glows[i]?.setVisible(true);
    audio.play('drop');
  }

  /** Désélectionne l'objet courant (toucher sur la fiche d'objet). */
  deselect(): void { if (this.selected >= 0) { this.setSelected(-1); this.host.onInspect(null); } }

  private setSelected(i: number): void {
    const prev = this.selected;
    this.selected = i;
    if (i < 0) {
      this.selHi.setVisible(false);
      this.clearMatches();
      if (prev >= 0) this.unlift(prev);
      this.host.onSelect?.(-1);
      return;
    }
    this.host.onSelect?.(i);
    this.selHi.setPosition(this.cx(i), this.cy(i)).setVisible(true);
    this.selHi.setScale(1 / texScale());
    const sp = this.sprites[i];
    if (sp) this.lift(sp);
    this.showMatches(i);
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

  /** Commande accélérée (diamants) : pas d'objet consommé. */
  rushOrder(slot: number): boolean {
    if (this.ended || !this.state.orders[slot]) return false;
    this.apply(R.forceDeliver(this.state, this.def, slot));
    return true;
  }

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
        case 'spawn': this.animSpawn(e.at, e.item, e.source, e.from); break;
        case 'giftOpen': this.animGift(e.at, e.item); break;
        case 'deliver': this.animDeliver(e); break;
        case 'remove': this.animRemove(e.at, e.points); break;
        case 'upgrade': this.animUpgrade(e.at, e.item); break;
        case 'boxOpen': this.animBox(e.at); break;
        case 'combo': this.animCombo(e.value); break;
        case 'full': this.animFull(); break;
        case 'cellUnlock': this.animCellUnlock(e, events.some((x) => x.t === 'merge') ? POP_AT_MS + 70 : 0); break;
        case 'lockHit': this.animLockHit(e); break;
        case 'lockNew': this.makeLockVis(e.at, true); break;
        case 'zone': this.animZone(); break;
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

  // ------------------------------------------------------- game feel (utilitaires)

  private prof(): FxProfile {
    const p = fxProfile(save.data.settings.effects, save.data.settings.reducedMotion);
    this.budget.cap = p.particleCap;
    return p;
  }

  /**
   * Crée une particule (image) sous le budget. Renvoie null si le plafond est atteint.
   * La particule est détruite et le budget rendu par `done()`.
   */
  private spark(tex: string, x: number, y: number, tint?: number, scale = 1, add = false): { p: Phaser.GameObjects.Image; done: () => void } | null {
    this.prof();
    if (this.budget.take(1) < 1) return null;
    const p = this.add.image(x, y, tex).setScale(scale / texScale());
    if (tint !== undefined) p.setTint(tint);
    if (add) p.setBlendMode(Phaser.BlendModes.ADD);
    this.fxLayer.add(p);
    let freed = false;
    return { p, done: () => { if (freed) return; freed = true; this.budget.release(); p.destroy(); } };
  }

  /** Ralenti visuel très court (temps réel) ; ignoré en animations réduites. */
  private slowmo(ms: number, scale = 0.35): void {
    if (!this.prof().slowmo) return;
    this.slowDepth++;
    this.time.timeScale = scale;
    this.tweens.timeScale = scale;
    window.setTimeout(() => {
      this.slowDepth = Math.max(0, this.slowDepth - 1);
      if (this.slowDepth === 0 && this.sys?.isActive()) { this.time.timeScale = 1; this.tweens.timeScale = 1; }
    }, ms);
  }

  /** Écourte toutes les fusions ordinaires encore en cours (une nouvelle action arrive). */
  private flushOrdinary(): void {
    for (const [, v] of [...this.pending]) if (v.tier === 'normal') v.fin();
  }

  /** Rayons lumineux tournants autour de (x, y). */
  private rays(x: number, y: number, n: number, len: number, tint = 0xfff1c0, life = 600): void {
    const count = Math.min(n, this.prof().rays);
    if (count <= 0) return;
    for (let k = 0; k < count; k++) {
      const sp = this.spark('fx:ray', x, y, tint, 1, true);
      if (!sp) break;
      const a = (k / count) * Math.PI * 2 + Math.random() * 0.2;
      sp.p.setOrigin(0.5, 1).setRotation(a).setAlpha(0).setScale((len / 128) / texScale() * 0.5, (len / 128) / texScale() * 0.2);
      this.tweens.add({ targets: sp.p, alpha: 0.9, scaleY: (len / 128) / texScale(), scaleX: (len / 128) / texScale() * 0.7, rotation: a + 0.35, duration: life * 0.35, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: sp.p, alpha: 0, rotation: a + 0.6, duration: life * 0.65, ease: 'Quad.easeIn', onComplete: sp.done }) });
    }
  }

  /** Éclat lumineux (additif). */
  private flashAt(x: number, y: number, size: number, ms: number, tint?: number): void {
    const sp = this.spark('fx:flash', x, y, tint, 0.2 * (this.cell / 56), true);
    if (!sp) return;
    this.tweens.add({ targets: sp.p, scale: (size * (this.cell / 56)) / texScale(), alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: sp.done });
  }

  // ------------------------------------------------------- cases verrouillées

  /** Toucher court sur une case verrouillée : elle est mise en avant (objectif dans le panneau), les objets utiles s'allument. */
  private selectLock(i: number): void {
    if (!this.state.cells[i]?.lock) return;
    haptic('select');
    audio.play('select');
    if (this.selected === i) { this.setSelected(-1); return; }
    this.setSelected(i);
    this.boardLayer.bringToTop(this.selHi);
    this.showLockHelp(i);
  }

  /** Allume les objets du plateau qui pourraient libérer la case (même collection que celle demandée). */
  private showLockHelp(i: number): void {
    const L = this.state.cells[i]?.lock;
    if (!L || L.need.t !== 'adj') return;
    const k = 1 / texScale();
    for (let j = 0; j < BOARD_SIZE; j++) {
      const it = this.state.cells[j].item;
      if (!it || it.c !== L.need.coll) continue;
      const hi = this.add.image(this.cx(j), this.cy(j), 'cell:ok').setScale(k).setAlpha(0.8);
      this.boardLayer.addAt(hi, this.tiles.length);
      this.tweens.add({ targets: hi, alpha: 0.3, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
      this.matchHi.push(hi);
    }
  }

  private clearLockVis(i: number): void {
    const v = this.lockVis[i];
    if (!v) return;
    v.twinkle?.remove();
    for (const o of v.objs) { this.tweens.killTweensOf(o); o.destroy(); }
    this.lockVis[i] = null;
  }

  /** Dessine le verrou de la case : toile / sable / cadenas, objet ou récompense visible dessous, lueur et paillettes. */
  private makeLockVis(i: number, intro = false): void {
    const L = this.state.cells[i]?.lock;
    if (!L) return;
    this.clearLockVis(i);
    const k = 1 / texScale();
    const x = this.cx(i);
    const y = this.cy(i);
    const vis: LockVis = { objs: [], ov: null, under: null, twinkle: null };
    const put = (img: Phaser.GameObjects.Image) => { this.boardLayer.add(img); vis.objs.push(img); return img; };
    const iconScale = (frac: number) => (this.cell * frac) / (ITEM_TEX * texScale());
    const calm = reducedFx();
    const shiny = !!L.reward || L.rarity === 'rare' || L.rarity === 'epic' || L.rarity === 'legendary';
    if (shiny) {
      const g = put(this.add.image(x, y, 'lock:glow').setScale(k * 1.08).setBlendMode(Phaser.BlendModes.ADD).setAlpha(L.kind === 'sand' ? 0.35 : 0.55));
      if (!calm) this.tweens.add({ targets: g, alpha: 0.2, yoyo: true, repeat: -1, duration: 1100 + (i % 4) * 140, ease: 'Sine.easeInOut' });
    }
    if (L.kind === 'sand') {
      const hit = L.need.t === 'sand' && L.need.left < ENDLESS_CFG.board.sandHits;
      vis.ov = put(this.add.image(x, y, hit ? 'lock:sandCrack' : 'lock:sand').setScale(k));
      if (L.reward) {
        // la récompense dépasse du sable : on la voit avant de pouvoir la prendre
        vis.under = put(this.add.image(x + this.cell * 0.1, y - this.cell * 0.02, ensureLockRewardTexture(this, L.reward.kind)).setScale(iconScale(0.6)).setAngle(-8));
        if (!calm) this.tweens.add({ targets: vis.under, y: y - this.cell * 0.06, yoyo: true, repeat: -1, duration: 1300 + (i % 3) * 200, ease: 'Sine.easeInOut' });
      }
    } else {
      if (L.item) {
        const ref = L.item;
        vis.under = put(this.add.image(x, y, ensureItemTexture(this, ref)).setScale(this.scaleFor(ref) * 0.86).setTint(0xdcd5ee));
      } else if (L.reward) {
        vis.under = put(this.add.image(x, y, ensureLockRewardTexture(this, L.reward.kind)).setScale(iconScale(0.66)));
        if (!calm) this.tweens.add({ targets: vis.under, scale: iconScale(0.7), yoyo: true, repeat: -1, duration: 1000 + (i % 3) * 160, ease: 'Sine.easeInOut' });
      }
      vis.ov = put(this.add.image(x, y, L.kind === 'energy' ? 'lock:pad' : 'lock:web').setScale(k));
    }
    // paillettes sur les objets rares
    if (!calm && (L.rarity === 'rare' || L.rarity === 'epic' || L.rarity === 'legendary')) {
      vis.twinkle = this.time.addEvent({ delay: 1000 + (i % 5) * 170, loop: true, callback: () => {
        const sp = this.spark('fx:sparkGold', x + (Math.random() - 0.5) * this.cell * 0.7, y + (Math.random() - 0.5) * this.cell * 0.7, undefined, 0.4 + Math.random() * 0.4);
        if (!sp) return;
        sp.p.setAlpha(0).setAngle(Math.random() * 60);
        this.tweens.add({ targets: sp.p, alpha: 1, scale: sp.p.scale * 1.6, duration: 300, yoyo: true, onComplete: sp.done });
      } });
    }
    this.lockVis[i] = vis;
    if (intro && vis.ov) {
      const ov = vis.ov;
      ov.setAlpha(0).setScale(k * 1.5);
      this.tweens.add({ targets: ov, alpha: 1, scale: k, duration: 380, ease: 'Back.easeOut' });
    }
  }

  /** Une case se libère : toile qui disparaît, sable qui se dissipe, POP, objet ou récompense qui apparaît avec rebond. */
  private animCellUnlock(e: Extract<BoardEvent, { t: 'cellUnlock' }>, delay: number): void {
    const at = e.at;
    const x = this.cx(at);
    const y = this.cy(at);
    const calm = reducedFx();
    const vis = this.lockVis[at];
    this.lockVis[at] = null;
    vis?.twinkle?.remove();
    const prof = this.prof();
    const special = e.kind !== 'sand' && e.kind !== 'web' ? true : !!e.rarity;
    const go = () => {
      if (!this.sys?.isActive()) return;
      const k = 1 / texScale();
      if (vis) {
        for (const o of vis.objs) {
          this.tweens.killTweensOf(o);
          if (o === vis.ov) {
            if (calm) this.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() });
            else this.tweens.add({ targets: o, scale: o.scale * 1.32, alpha: 0, angle: e.kind === 'sand' ? 0 : 9, y: e.kind === 'sand' ? o.y + this.cell * 0.12 : o.y, duration: e.kind === 'sand' ? 340 : 280, ease: 'Quad.easeOut', onComplete: () => o.destroy() });
          } else if (o === vis.under) {
            // la récompense (sans objet) s'élève puis se dissipe ; l'objet est remplacé par le vrai sprite
            if (e.item) o.destroy();
            else this.tweens.add({ targets: o, y: o.y - this.cell * 0.4, scale: o.scale * 1.35, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => o.destroy() });
          } else this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: () => o.destroy() });
        }
      }
      // sable : nuage de grains
      if (e.kind === 'sand' && !calm) {
        const n = scaledCount(12, prof);
        for (let j = 0; j < n; j++) {
          const sp = this.spark('fx:dot', x + (Math.random() - 0.5) * this.cell * 0.5, y + (Math.random() - 0.3) * this.cell * 0.4, 0xe8c98a, 0.5 + Math.random() * 0.5);
          if (!sp) break;
          const a = Math.random() * Math.PI * 2;
          this.tweens.add({ targets: sp.p, x: sp.p.x + Math.cos(a) * this.cell * 0.55, y: sp.p.y + Math.sin(a) * this.cell * 0.4 - this.cell * 0.25, alpha: 0, duration: 420 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: sp.done });
        }
      }
      // fils de toile qui partent en étincelles
      if (e.kind !== 'sand' && !calm) this.sparkBurst(x, y, 7, 0xe6e9ff);
      // l'objet révélé : apparition avec rebond (il est déplaçable tout de suite)
      if (e.item && !this.sprites[at]) {
        const sp = this.makeSprite(at, e.item);
        const s0 = this.itemScale(sp);
        if (calm) { sp.setAlpha(0); this.tweens.add({ targets: sp, alpha: 1, duration: 220 }); }
        else {
          sp.setScale(0);
          this.tweens.add({ targets: sp, scaleX: s0 * 1.22, scaleY: s0 * 0.84, duration: 130, ease: 'Quad.easeOut',
            onComplete: () => { if (sp.active) this.tweens.add({ targets: sp, scaleX: s0, scaleY: s0, duration: 360, ease: 'Back.easeOut', easeParams: [3] }); } });
        }
      }
      if (calm) { haptic(special ? 'reward' : 'drop'); audio.play('sparkle'); return; }
      // POP : onde, éclat, étoiles qui scintillent
      this.ring(x, y, special ? 0xffe7a0 : 0xffffff, 1.7, 420);
      this.flashAt(x, y, special ? 1.5 : 1.0, 320, special ? 0xfff1c0 : undefined);
      this.sparkBurst(x, y, special ? 12 : 6);
      const stars = scaledCount(special ? 5 : 3, prof);
      for (let j = 0; j < stars; j++) {
        const sp = this.spark('fx:star', x + (j - (stars - 1) / 2) * this.cell * 0.22, y - this.cell * 0.2, 0xfff1c0, 0.2);
        if (!sp) break;
        sp.p.setAlpha(0).setScale(0.2 / texScale());
        this.tweens.add({ targets: sp.p, alpha: 1, scale: (0.5 + Math.random() * 0.35) / texScale(), y: sp.p.y - this.cell * (0.25 + Math.random() * 0.3), angle: 40 * (j % 2 ? 1 : -1), duration: 260, delay: j * 70, ease: 'Back.easeOut',
          onComplete: () => this.tweens.add({ targets: sp.p, alpha: 0, scale: 0, duration: 380, onComplete: sp.done }) });
      }
      audio.play('sparkle', special ? 1.15 : 1);
      audio.play('pop2', 1.25);
      haptic(special ? 'reward' : 'drop');
      void k;
    };
    if (delay > 0) this.time.delayedCall(delay, go); else go();
  }

  /** Sable fissuré par une fusion voisine. */
  private animLockHit(e: Extract<BoardEvent, { t: 'lockHit' }>): void {
    const v = this.lockVis[e.at];
    const ov = v?.ov;
    if (!ov) return;
    ov.setTexture('lock:sandCrack');
    const x = this.cx(e.at);
    if (!reducedFx()) {
      this.tweens.add({ targets: ov, x: { from: x - 3, to: x + 3 }, duration: 50, yoyo: true, repeat: 2, onComplete: () => ov.setX(x) });
      for (let j = 0; j < scaledCount(5, this.prof()); j++) {
        const sp = this.spark('fx:dot', x + (Math.random() - 0.5) * this.cell * 0.5, this.cy(e.at), 0xe8c98a, 0.5);
        if (!sp) break;
        this.tweens.add({ targets: sp.p, x: sp.p.x + (Math.random() - 0.5) * this.cell * 0.6, y: sp.p.y - this.cell * 0.35, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: sp.done });
      }
    }
    audio.play('drop', 0.8);
  }

  /** Le plateau se développe : une onde parcourt le plateau. */
  private animZone(): void {
    if (reducedFx()) return;
    const cx = this.ox + (BOARD_W * this.cell) / 2;
    const cy = this.oy + (BOARD_H * this.cell) / 2;
    this.ring(cx, cy, 0xffe7a0, BOARD_W * 0.9, 700);
    this.time.delayedCall(120, () => this.ring(cx, cy, 0xffffff, BOARD_W * 0.6, 600));
    this.sparkBurst(cx, this.oy + this.cell, 10);
    audio.play('reward');
    haptic('reward');
  }

  // ------------------------------------------------------- animations

  private animMove(from: number, to: number): void {
    const sp = this.sprites[from];
    this.sprites[from] = null;
    this.sprites[to] = sp;
    this.moveGlow(from, to);
    this.shadow.setVisible(false);
    if (!sp) return;
    this.tweens.killTweensOf(sp);
    const base = this.itemScale(sp);
    this.tweens.add({ targets: sp, x: this.cx(to), y: this.cy(to), scale: base, duration: 150, ease: 'Quad.easeOut',
      onComplete: () => {
        this.glows[to]?.setVisible(true);
        if (!sp.active || this.sprites[to] !== sp) return;
        // petit rebond à l'arrivée (écrasement puis retour)
        sp.setScale(base * 1.1, base * 0.88);
        this.tweens.add({ targets: sp, scaleX: base, scaleY: base, duration: 170, ease: 'Back.easeOut', easeParams: [2.5] });
        if (this.prof().particleScale >= 1) this.dust(this.cx(to), this.cy(to) + this.cell * 0.3);
      } });
    audio.play('drop');
    haptic('drop');
  }

  /** Petit nuage de poussière à l'atterrissage. */
  private dust(x: number, y: number): void {
    for (let k = 0; k < 3; k++) {
      const sp = this.spark('fx:dot', x + (k - 1) * 6, y, 0xffffff, 0.35, false);
      if (!sp) return;
      sp.p.setAlpha(0.5);
      this.tweens.add({ targets: sp.p, x: sp.p.x + (k - 1) * 9, y: y - 3, alpha: 0, scale: 0.7 / texScale(), duration: 260, onComplete: sp.done });
    }
  }

  private animMerge(e: Extract<BoardEvent, { t: 'merge' }>): void {
    this.lastMergeAt = e.to;
    this.pending.get(e.to)?.fin();
    const a = this.sprites[e.from];
    const b = this.sprites[e.to];
    this.sprites[e.from] = null;
    this.glows[e.from]?.destroy();
    this.glows[e.from] = null;
    this.glows[e.to]?.destroy();
    this.glows[e.to] = null;
    this.shadow.setVisible(false);
    const x = this.cx(e.to);
    const y = this.cy(e.to);
    const tier = mergeTier(e.result, collMax(e.result.c));
    const big = tier !== 'normal';
    this.lock(e.to, POP_AT_MS + (big ? 420 : 140));
    const s0 = this.scaleFor(e.result);
    // 1. anticipation (~70 ms) : les deux objets se compriment l'un vers l'autre
    if (b) {
      this.tweens.killTweensOf(b);
      this.boardLayer.bringToTop(b);
      this.tweens.add({ targets: b, scaleX: this.itemScale(b) * 1.1, scaleY: this.itemScale(b) * 0.86, duration: WINDUP_MS, ease: 'Quad.easeOut' });
    }
    if (a) {
      this.tweens.killTweensOf(a);
      this.boardLayer.bringToTop(a);
      const wx = a.x + (x - a.x) * 0.12;
      const wy = a.y + (y - a.y) * 0.12;
      this.tweens.add({ targets: a, x: wx, y: wy, scaleX: this.itemScale(a) * 0.92, scaleY: this.itemScale(a) * 1.04, duration: WINDUP_MS, ease: 'Quad.easeOut',
        // 2. impact : l'objet fonce sur l'autre
        onComplete: () => { if (a.active) this.tweens.add({ targets: a, x, y, scaleX: s0 * 0.85, scaleY: s0 * 0.85, duration: SLAM_MS, ease: 'Quad.easeIn' }); } });
    }
    audio.play('windup');
    const variant = Math.random();
    // Le nouvel objet existe tout de suite dans la grille (invisible) : une autre
    // action pendant l'animation agit sur le bon sprite.
    const sp = this.makeSprite(e.to, e.result);
    sp.setVisible(false).setScale(s0 * 0.45);
    if (b) this.boardLayer.bringToTop(b);
    if (a) this.boardLayer.bringToTop(a);
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      this.pending.delete(e.to);
      this.locked.delete(e.to);
      if (a) { this.tweens.killTweensOf(a); a.destroy(); }
      if (b) { this.tweens.killTweensOf(b); b.destroy(); }
      if (!sp.active) return;
      sp.setVisible(true);
      this.popEffects(e, sp, tier, variant, s0, x, y);
    };
    this.pending.set(e.to, { fin, tier });
    this.time.delayedCall(POP_AT_MS, fin);
  }

  /** Le « POP » : tout ce qui se passe à l'instant de l'apparition du nouvel objet. */
  private popEffects(e: Extract<BoardEvent, { t: 'merge' }>, sp: Phaser.GameObjects.Image, tier: MergeTier, variant: number, s0: number, x: number, y: number): void {
    const prof = this.prof();
    const big = tier !== 'normal';
    // 6–7. nouvel objet : squash & stretch puis rebond élastique
    sp.setScale(s0 * 1.28, s0 * 0.68);
    this.tweens.add({ targets: sp, scaleX: s0 * 0.88, scaleY: s0 * 1.2, duration: 90, ease: 'Quad.easeOut',
      onComplete: () => { if (sp.active) this.tweens.add({ targets: sp, scaleX: s0, scaleY: s0, duration: big ? 420 : 300, ease: 'Back.easeOut', easeParams: [big ? 3.2 : 2.4] }); } });
    if (variant > 0.5 && !reducedFx()) this.tweens.add({ targets: sp, angle: { from: variant > 0.75 ? -8 : 8, to: 0 }, duration: 360, ease: 'Back.easeOut' });
    // 4. éclat + 5. particules
    this.flashAt(x, y, big ? 1.7 : 1.0, big ? 420 : 280);
    this.burst(x, y, e.result, tier === 'max' ? 26 : tier === 'rare' ? 18 : e.result.l >= 4 ? 11 : 7, variant);
    // 8. score flottant
    this.floatText(x, y - this.cell * 0.3, `+${e.points}`, e.combo >= 2 ? '#FFE7A0' : '#FFFFFF');
    // 9. son + haptique
    const pop = popSfx(tier, e.result.l, e.combo, Math.random(), this.lastPop);
    this.lastPop = pop.name;
    audio.play(pop.name, pop.pitch);
    if (tier === 'normal') {
      haptic('merge');
      return;
    }
    if (tier === 'rare') {
      haptic('rare');
      // double POP : second anneau + étincelles dorées + rayons + court ralenti
      this.ring(x, y, 0xffe7a0);
      this.time.delayedCall(90, () => { this.ring(x, y, 0xffffff); this.sparkBurst(x, y, 10, 0xffe7a0); });
      this.rays(x, y, 8, this.cell * 1.3);
      this.slowmo(120, 0.35);
      audio.play('sparkle', 1 + e.combo * 0.03);
      if (prof.shake) this.cameras.main.shake(90, 0.0016);
      return;
    }
    this.maxMergeFx(e.to, true);
  }

  /** Étincelles dorées qui jaillissent (budgétées). */
  private sparkBurst(x: number, y: number, n: number, tint = 0xffe7a0): void {
    const m = scaledCount(n, this.prof());
    for (let k = 0; k < m; k++) {
      const sp = this.spark('fx:sparkGold', x, y, tint, 0.6 + Math.random() * 0.6);
      if (!sp) return;
      const a = Math.random() * Math.PI * 2;
      const d = this.cell * (0.5 + Math.random() * 0.8);
      this.tweens.add({ targets: sp.p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 8, alpha: 0, angle: Math.random() * 200, scale: 0, duration: 450 + Math.random() * 350, ease: 'Cubic.easeOut', onComplete: sp.done });
    }
  }

  private burst(x: number, y: number, r: ItemRef, n: number, variant: number): void {
    n = scaledCount(n, this.prof());
    const tints = COLLECTION_TINTS[r.c] ?? COLLECTION_TINTS.special;
    const style = this.host.fxStyle?.() ?? 'classic';
    const tex = style === 'fx-hearts' ? 'fx:heart' : style === 'fx-stars' ? 'fx:star' : style === 'fx-petals' ? 'p:petal'
      : variant < 0.33 ? 'fx:spark' : variant < 0.66 ? 'fx:dot' : 'fx:heart';
    for (let k = 0; k < n; k++) {
      const a = (Math.PI * 2 * k) / n + Math.random() * 0.4;
      const d = this.cell * (0.45 + Math.random() * 0.45);
      const sp = this.spark(k % 3 === 0 ? 'fx:sparkGold' : tex, x, y, tints[k % tints.length], 0.5 + Math.random() * 0.5, tex === 'fx:dot');
      if (!sp) return;
      this.tweens.add({ targets: sp.p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 6, alpha: 0, angle: Math.random() * 180, scale: 0, duration: 420 + Math.random() * 260, ease: 'Cubic.easeOut', onComplete: sp.done });
    }
  }

  private ring(x: number, y: number, tint: number, size = 2.4, ms = 520): void {
    const sp = this.spark('fx:ring', x, y, tint, 0.2, true);
    if (!sp) return;
    this.tweens.add({ targets: sp.p, scale: (this.cell * size) / 96 / texScale(), alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: sp.done });
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
      this.tweens.add({ targets: sp, x: this.cx(from), y: this.cy(from), scale: this.itemScale(sp), duration: 240, ease: 'Back.easeOut',
        onComplete: () => this.wiggle(sp) });
      this.glows[from]?.setVisible(true);
    }
    audio.play('invalid');
  }

  private wiggle(o: Phaser.GameObjects.Image | null): void {
    if (!o) return;
    this.tweens.add({ targets: o, angle: { from: -7, to: 7 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
  }

  private animSpawn(at: number, item: ItemRef, source: string, from?: number): void {
    const sp = this.makeSprite(at, item);
    const s0 = this.itemScale(sp);
    this.lock(at, 300);
    if (source === 'gen') {
      const ox = from !== undefined ? this.cx(from) : this.W / 2;
      const oy = from !== undefined ? this.cy(from) : this.oy + this.cell * BOARD_H;
      sp.setPosition(ox, oy - 10).setScale(s0 * 0.4);
      const tx = this.cx(at);
      const ty = this.cy(at);
      const midY = Math.min(ty, oy) - this.cell * 0.9;
      const obj = { t: 0 };
      this.tweens.add({ targets: obj, t: 1, duration: 280, ease: 'Quad.easeOut',
        onUpdate: () => {
          const t = obj.t;
          const x = Phaser.Math.Linear(ox, tx, t);
          const y = (1 - t) * (1 - t) * (oy - 10) + 2 * (1 - t) * t * midY + t * t * ty;
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
      this.tweens.add({ targets: sp, scale: this.itemScale(sp), duration: 360, ease: 'Back.easeOut' });
      this.chestFx(x, y);
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
      this.tweens.add({ targets: sp, x: target.x, y: target.y, scale: this.itemScale(sp) * 0.5, alpha: 0.2, delay: k * 70, duration: 420, ease: 'Cubic.easeIn', onComplete: () => sp.destroy() });
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
    this.sparkBurst(x, y, 8);
    const sp = this.makeSprite(at, item);
    sp.setScale(0);
    this.tweens.add({ targets: sp, scale: this.itemScale(sp), duration: 380, ease: 'Back.easeOut' });
    audio.play('popRare');
    haptic('merge');
  }

  private animBox(at: number): void {
    const sp = this.sprites[at];
    this.sprites[at] = null;
    this.glows[at]?.destroy();
    this.glows[at] = null;
    if (sp) this.tweens.add({ targets: sp, scale: sp.scale * 1.4, alpha: 0, duration: 260, onComplete: () => sp.destroy() });
    this.chestFx(this.cx(at), this.cy(at));
  }

  private animCombo(value: number): void {
    // après le POP de la fusion qui vient d'avoir lieu (ordre sonore et haptique naturel)
    this.time.delayedCall(POP_AT_MS + 20, () => this.comboFx(value, 1));
  }

  /**
   * Compteur de combo discret et animé : petit texte en haut du plateau qui « pulse » à chaque
   * incrément, son dont la hauteur monte, haptique `combo` aux paliers (3, 5, 8). `mult` = multiplicateur
   * de récompense éventuel (affiché s'il dépasse 1).
   */
  comboFx(value: number, mult = 1): void {
    if (value < 2 || !this.comboText?.active) return;
    const t = this.comboText;
    const big = value >= 5;
    const huge = value >= 8;
    // petit texte posé PRÈS de la fusion (jamais au milieu du plateau), qui monte et disparaît vite ; un seul à la fois
    const at = this.lastMerge;
    const bw = this.cell * BOARD_W;
    const x = Math.max(this.ox + this.cell * 1.2, Math.min(this.ox + bw - this.cell * 1.2, this.cx(at)));
    const y0 = Math.max(this.oy + this.cell * 0.35, this.cy(at) - this.cell * 0.62);
    const ms = comboPopMs(value);
    t.setText(comboPopLabel(value, mult));
    t.setFontSize(huge ? 19 : big ? 17 : 15);
    t.setPosition(x, y0);
    this.tweens.killTweensOf(t);
    t.setAlpha(1).setScale(0.55);
    this.tweens.add({ targets: t, scale: huge ? 1.2 : 1.1, duration: 130, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: t, scale: 1, duration: 90 }) });
    this.tweens.add({ targets: t, y: y0 - this.cell * 0.45, duration: ms, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: Math.round(ms * 0.55), duration: Math.round(ms * 0.45) });
    audio.play('combo', 1 + Math.min(10, value) * 0.1);
    audio.play('heart', comboPitch(value) + 0.1);
    const m = comboMilestone(value);
    if (m) haptic('combo');
    // particules concentrées autour de l'objet fusionné
    if (value >= 3) this.halo(value);
    if (value === 5 || value === 8 || (value > 8 && value % 5 === 0)) this.confetti(this.cx(at), this.cy(at) - this.cell * 0.3, huge ? 26 : 16);
  }

  private halo(value: number): void {
    if (this.prof().particleScale < 0.35) return;
    // un anneau autour de la fusion (et non un cadre sur tout le plateau)
    this.ring(this.cx(this.lastMerge), this.cy(this.lastMerge), value >= 5 ? 0xf3c86b : 0xff75a8);
  }

  // ------------------------------------------------------- API publique (effets pour l'interface)

  /** Plus grande distance du centre d'une case aux bords du plateau (portée des rayons plein plateau). */
  private boardReach(x: number, y: number): number {
    const bw = this.cell * BOARD_W; const bh = this.cell * BOARD_H;
    return Math.hypot(Math.max(x - this.ox, this.ox + bw - x), Math.max(y - this.oy, this.oy + bh - y));
  }

  /** Effet spectaculaire du niveau maximal d'une collection, centré sur la case `cell`. */
  maxMergeFx(cell: number, fromMerge = false): void {
    const prof = this.prof();
    const x = this.cx(cell);
    const y = this.cy(cell);
    if (!fromMerge) { audio.play('maxMerge'); haptic('maxMerge'); } else haptic('maxMerge');
    audio.play('sparkle', 1.1);
    // flash plein plateau
    const bw = this.cell * BOARD_W; const bh = this.cell * BOARD_H;
    const fl = this.add.rectangle(this.ox + bw / 2, this.oy + bh / 2, bw + 16, bh + 16, 0xffffff, prof.shake ? 0.55 : 0.28).setBlendMode(Phaser.BlendModes.ADD);
    this.fxLayer.add(fl);
    this.tweens.add({ targets: fl, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => fl.destroy() });
    this.flashAt(x, y, 2.6, 520, 0xfff1c0);
    // ondes de choc
    this.ring(x, y, 0xffe7a0, 5, 620);
    this.time.delayedCall(140, () => this.ring(x, y, 0xffffff, 4, 560));
    this.time.delayedCall(280, () => this.ring(x, y, 0xff9cc0, 3, 520));
    // rayons plein plateau
    this.rays(x, y, 12, this.boardReach(x, y), 0xfff1c0, 900);
    // éclat d'étincelles + pluie
    this.sparkBurst(x, y, 24);
    const rain = scaledCount(34, prof);
    for (let k = 0; k < rain; k++) {
      this.time.delayedCall(120 + Math.random() * 700, () => {
        const sp = this.spark(k % 2 ? 'fx:sparkGold' : 'fx:spark', this.ox + Math.random() * bw, this.oy - 6, k % 3 === 0 ? 0xffffff : 0xffe7a0, 0.5 + Math.random() * 0.7);
        if (!sp) return;
        this.tweens.add({ targets: sp.p, y: this.oy + Math.random() * bh, x: sp.p.x + (Math.random() - 0.5) * 30, angle: 180 + Math.random() * 240, alpha: { from: 1, to: 0 }, duration: 600 + Math.random() * 500, ease: 'Quad.easeIn', onComplete: sp.done });
      });
    }
    this.floatText(x, y - this.cell * 0.55, 'Niveau max !', '#FFE7A0', 20);
    if (prof.shake) this.cameras.main.shake(170, 0.004);
    this.slowmo(140, 0.3);
  }

  /** Arrivée d'un drop sur une case : lumière et étincelles à la couleur de sa rareté. */
  dropFx(cell: number, rarity: Rarity | string = 'common'): void {
    const x = this.cx(cell);
    const y = this.cy(cell);
    const col = hexInt((RARITY_COLOR as Record<string, string>)[rarity] ?? RARITY_COLOR.common);
    const rank = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(rarity);
    const r = rank < 0 ? 0 : rank;
    this.flashAt(x, y, 1 + r * 0.25, 360 + r * 60, col);
    this.ring(x, y, col, 1.6 + r * 0.3, 460);
    this.sparkBurst(x, y, 4 + r * 4, col);
    if (r >= 3) this.time.delayedCall(120, () => this.ring(x, y, 0xffffff, 2.4, 480));
    if (r >= 4) this.rays(x, y, 8, this.cell * 1.5, col, 700);
    const sp = this.sprites[cell];
    if (sp) {
      const base = this.itemScale(sp);
      this.tweens.add({ targets: sp, scaleX: base * 1.2, scaleY: base * 0.84, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { if (sp.active) sp.setScale(base); } });
    }
    const snd: Sfx[] = ['drop', 'pop4', 'popRare', 'rare', 'rare'];
    audio.play(snd[r] ?? 'drop', 1 + r * 0.04);
    if (r >= 4) this.time.delayedCall(160, () => audio.play('sparkle', 1.2));
    haptic(r >= 3 ? 'rare' : 'drop');
  }

  /** Ouverture d'un coffre en (x, y) : confettis dorés, rayons, son et haptique `chest`. */
  chestFx(x: number, y: number): void {
    this.flashAt(x, y, 1.8, 480, 0xffe7a0);
    this.ring(x, y, 0xffe7a0, 3, 560);
    this.rays(x, y, 10, this.cell * 1.8, 0xfff1c0, 750);
    this.sparkBurst(x, y, 16);
    this.confetti(x, y - this.cell * 0.2, 22);
    audio.play('chestOpen');
    haptic('chest');
  }

  /**
   * Une icône vole de la case `fromCell` vers `toXY` (compteur de l'interface, en pixels CSS) ;
   * `cb` est appelé à l'arrivée (mettre à jour le compteur à ce moment-là). Ne dépend jamais
   * du budget de particules : le callback est toujours appelé.
   */
  flyTo(kind: string, fromCell: number, toXY: { x: number; y: number }, cb?: () => void): void {
    const x0 = this.cx(fromCell);
    const y0 = this.cy(fromCell);
    const key = ensureFlyTexture(this, kind);
    const img = this.add.image(x0, y0, key).setScale(0.2 / texScale());
    this.fxLayer.add(img);
    const k = (this.cell * 0.5) / 28 / texScale();
    const ctrlX = (x0 + toXY.x) / 2 + (toXY.x < x0 ? -1 : 1) * this.cell * 0.9;
    const ctrlY = Math.min(y0, toXY.y) - this.cell * 0.6;
    const o = { t: 0 };
    this.tweens.add({ targets: img, scale: k * 1.25, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: o, t: 1, duration: 520, delay: 80, ease: 'Cubic.easeIn',
      onUpdate: () => {
        const t = o.t;
        img.setPosition((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ctrlX + t * t * toXY.x, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ctrlY + t * t * toXY.y);
        img.setScale(k * (1.25 - 0.45 * t));
      },
      onComplete: () => {
        img.destroy();
        const ping = this.spark('fx:flash', toXY.x, toXY.y, 0xffe7a0, 0.3, true);
        if (ping) this.tweens.add({ targets: ping.p, scale: 0.9 / texScale(), alpha: 0, duration: 260, onComplete: ping.done });
        audio.play('heart', 1.1);
        cb?.();
      } });
    this.time.delayedCall(80, () => audio.play('whoosh'));
  }

  /** Fait pulser des cases (commande, tutoriel, aide) pendant ~2 s. */
  highlightCells(cells: number[]): void {
    this.extraHi.forEach((h) => { this.tweens.killTweensOf(h); h.destroy(); });
    this.extraHi = [];
    const k = 1 / texScale();
    for (const i of cells) {
      if (i < 0 || i >= BOARD_SIZE) continue;
      const hi = this.add.image(this.cx(i), this.cy(i), 'cell:ok').setScale(k).setAlpha(0.9);
      this.boardLayer.addAt(hi, this.tiles.length);
      this.tweens.add({ targets: hi, alpha: 0.25, yoyo: true, repeat: 3, duration: 380, ease: 'Sine.easeInOut',
        onComplete: () => { hi.destroy(); this.extraHi = this.extraHi.filter((h) => h !== hi); } });
      this.extraHi.push(hi);
      const sp = this.sprites[i];
      if (sp && !this.locked.has(i)) {
        const base = this.itemScale(sp);
        this.tweens.add({ targets: sp, scaleX: base * 1.12, scaleY: base * 1.12, yoyo: true, repeat: 2, duration: 260, ease: 'Sine.easeInOut', onComplete: () => { if (sp.active) sp.setScale(base); } });
      }
    }
  }

  confetti(x: number, y: number, n: number): void {
    n = scaledCount(n, this.prof());
    const cols = [0xff75a8, 0xf3c86b, 0xb9a5e8, 0xffc0a3, 0xffffff, 0x9fd8a8];
    for (let k = 0; k < n; k++) {
      const sp = this.spark('fx:confetti', x + (Math.random() - 0.5) * this.cell * 4, y, cols[k % cols.length], 1.2);
      if (!sp) return; // plafond atteint : on s'arrête là
      const c = sp.p;
      const dx = (Math.random() - 0.5) * this.W * 0.9;
      const up = 60 + Math.random() * 120;
      this.tweens.add({ targets: c, x: c.x + dx * 0.4, y: y - up, angle: Math.random() * 720, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: c, x: c.x + dx * 0.4, y: this.H + 20, angle: c.angle + 360, duration: 1100 + Math.random() * 700, ease: 'Quad.easeIn', onComplete: sp.done }) });
    }
  }

  private animFull(): void {
    const k = 1 / texScale();
    void k;
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
        this.tweens.add({ targets: [this.boardBg, ...this.tiles, ...this.gifts.filter(Boolean)], alpha: 0, duration: 1200 });
        if (heart) {
          this.boardLayer.bringToTop(heart);
          this.tweens.add({ targets: heart, x: this.W / 2, y: this.H * 0.42, scale: this.itemScale(heart) * 3.2, duration: 1600, ease: 'Sine.easeInOut' });
          const halo = this.add.image(this.W / 2, this.H * 0.42, 'fx:light').setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0.9);
          this.boardLayer.addAt(halo, 0);
          this.tweens.add({ targets: halo, scale: 9 / texScale(), duration: 1800, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: halo, alpha: 0.5, yoyo: true, repeat: -1, duration: 900, delay: 1800 });
          this.tweens.add({ targets: heart, scale: this.itemScale(heart) * 3.4, yoyo: true, repeat: -1, duration: 700, delay: 1700, ease: 'Sine.easeInOut' });
        }
        audio.play('victory');
        this.time.delayedCall(2600, () => resolve());
      });
    });
  }

  /**
   * Respiration des objets au repos : léger étirement/écrasement ancré en bas
   * (l'objet « gonfle » sans bouger de sa case). Les objets précieux respirent
   * un peu plus lentement et plus amplement.
   */
  private breathe(t: number): void {
    if (reducedFx() || this.ended) return;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const sp = this.sprites[i];
      if (!sp || this.locked.has(i) || i === this.selected || this.drag?.sprite === sp || this.matchCells.includes(i)) continue;
      if (this.tweens.isTweening(sp)) continue;
      const base = this.itemScale(sp);
      const it = this.state.cells[i].item;
      const amp = 0.022 + Math.min(9, it?.l ?? 1) * 0.0016;
      const w = Math.sin(t * (sp.getData('speed') as number) + (sp.getData('phase') as number));
      const sy = 1 + amp * w;
      const sx = 1 - amp * 0.7 * w;
      sp.setScale(base * sx, base * sy);
      // garder la base de l'objet posée au même endroit
      sp.y = this.cy(i) - (sy - 1) * ITEM_TEX * texScale() * base * 0.38;
      sp.x = this.cx(i);
    }
  }

  override update(time: number): void {
    this.breathe(time / 1000);
    // Chien de garde : si le doigt suivi n'appuie plus depuis un instant mais que le geste est toujours « en cours », on le libère.
    const d = this.drag;
    if (d) {
      const pt = this.pointerById(d.pointerId);
      if (pt && !pt.isDown) { d.lostAt ??= time; if (time - d.lostAt > 200) this.cancelDrag(); } else d.lostAt = undefined;
      if (this.drag && performance.now() - d.t0 > 20_000) this.cancelDrag();
    }
    // Indice automatique après un long moment sans action.
    if (!this.ended && !this.drag && time - this.lastAction > 14_000 && time - this.lastHint > 14_000) {
      this.lastHint = time;
      this.showHint();
    }
  }
}

export { MAX_LEVEL };
