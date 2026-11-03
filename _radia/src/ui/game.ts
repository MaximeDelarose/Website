/* Écran de partie : contrôleur (règles + pendules + IA + surprises) et interface. */
import type { Color, Move, PieceSymbol, Square } from "chess.js";
import { ChessGame, PIECE_VALUE, uciToInput, type Outcome } from "../core/rules";
import { ChessClock, formatClock } from "../core/clock";
import { pickCard } from "../core/memories";
import { thinkDelay, DIFFICULTIES, type Choice } from "../ai/persona";
import { BoardView, bounce } from "../board/board";
import { Particles } from "../fx/particles";
import { pieceSVG, PIECE_NAMES } from "../art/pieces";
import { radiaSVG, augusteSVG, crownSVG } from "../art/portraits";
import { CADENCES, type Cadence } from "../store/save";
import { BubbleManager } from "./bubbles";
import { showCard } from "./card";
import { h, sleep, haptic } from "./dom";
import { openModal, confirmModal } from "./modal";
import type { Ctx } from "./context";
import type { Difficulty } from "../ai/persona";
import type { BubbleEvent } from "../content/types";

const INTENSITY: Record<PieceSymbol, number> = { p: 1, n: 2, b: 2, r: 3, q: 4, k: 4 };

export class GameScreen {
  readonly el: HTMLElement;
  private board: BoardView;
  private fx: Particles;
  private screenFx: Particles;
  private bubbles: BubbleManager;
  private game = new ChessGame();
  private clock = new ChessClock(600_000);
  private difficulty: Difficulty = "doux";
  private cadence: Cadence = "10";
  private over = true;
  private gameId = 0;
  private shown = new Set<string>();
  private radiaCaptures = 0;
  private lastAi: Choice | null = null;
  private whiteEvalAfterAi: number | null = null;
  private thinking = false;
  private cardOpen = false;
  private tickT = 0;
  private lowTimeWarned = false;
  private started = false;
  private ui!: {
    rivalClock: HTMLElement; meClock: HTMLElement; rivalCap: HTMLElement; meCap: HTMLElement;
    rivalBar: HTMLElement; meBar: HTMLElement; rivalAvatar: HTMLElement; meAvatar: HTMLElement;
    diffTag: HTMLElement; history: HTMLElement; status: HTMLElement; claim: HTMLButtonElement;
    sideRadia: HTMLElement; sideAug: HTMLElement; musicBtn: HTMLButtonElement; queenGlow: HTMLElement;
  };

  constructor(private readonly ctx: Ctx) {
    this.board = new BoardView({
      canPick: (sq) => this.canPick(sq),
      targets: (sq) => this.game.legalFrom(sq).map((m) => ({ to: m.to, capture: !!m.captured })),
      onMove: (from, to) => void this.playerMove(from, to),
      onSelect: (sq, p) => this.onSelect(sq, p),
      onIllegal: () => { this.ctx.audio.play("illegal"); haptic(this.ctx.store.prefs.haptics, 30); },
    });
    this.el = this.build();
    this.fx = new Particles(this.board.fxLayer);
    this.screenFx = new Particles(this.el.querySelector(".game-fx") as HTMLElement);
    this.bubbles = new BubbleManager(this.el.querySelector(".bubble") as HTMLElement, ctx.content.bubbles, () => {
      this.ctx.audio.play("bubble");
      bounce(this.ui.rivalAvatar, "talk");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clock.pause("hidden"); else this.clock.resume("hidden");
    });
    window.addEventListener("pagehide", () => this.persist());
  }

  // ================================================================ interface
  private build(): HTMLElement {
    const c = this.ctx.content;
    const prefs = this.ctx.store.prefs;
    const rivalAvatar = h("div", { class: "avatar rival-avatar", html: augusteSVG({ expr: "smile" }) });
    const meAvatar = h("div", { class: "avatar me-avatar", html: radiaSVG({ expr: "smile", crown: true, outfit: prefs.outfit }) });
    const rivalClock = h("div", { class: "clock", role: "timer", "aria-label": "Pendule d'" + c.rival.name }, "10:00");
    const meClock = h("div", { class: "clock", role: "timer", "aria-label": "Ta pendule" }, "10:00");
    const rivalCap = h("div", { class: "captured" });
    const meCap = h("div", { class: "captured" });
    const diffTag = h("span", { class: "diff-tag" });
    const status = h("span", { class: "status" });
    const rivalBar = h("div", { class: "player-bar rival" }, rivalAvatar,
      h("div", { class: "pb-info" }, h("div", { class: "pb-name" }, c.rival.tag, diffTag), h("div", { class: "pb-sub" }, c.rival.subtitle), rivalCap),
      h("div", { class: "pb-right" }, status, rivalClock));
    const meBar = h("div", { class: "player-bar me" }, meAvatar,
      h("div", { class: "pb-info" }, h("div", { class: "pb-name" }, c.player.tag), meCap),
      h("div", { class: "pb-right" }, meClock));
    const history = h("div", { class: "history", "aria-label": "Historique des coups" });
    const claim = h("button", { class: "btn chip claim", type: "button", hidden: true }, "Réclamer la nulle");
    claim.onclick = () => this.claimDraw();
    const musicBtn = h("button", { class: "icon-btn", type: "button", "aria-label": "Musique" });
    musicBtn.onclick = () => { this.ctx.tap(); this.toggleMusic(); };
    const menuBtn = h("button", { class: "icon-btn", type: "button", "aria-label": "Menu", html: ICON.menu });
    menuBtn.onclick = () => { this.ctx.tap(); void this.openMenu(); };
    const newBtn = h("button", { class: "ctl", type: "button", html: ICON.refresh + "<span>Nouvelle</span>" });
    newBtn.onclick = () => { this.ctx.tap(); void this.askNewGame(); };
    const resignBtn = h("button", { class: "ctl", type: "button", html: ICON.flag + "<span>Abandonner</span>" });
    resignBtn.onclick = () => { this.ctx.tap(); void this.askResign(); };
    const setBtn = h("button", { class: "ctl", type: "button", html: ICON.gear + "<span>Réglages</span>" });
    setBtn.onclick = () => { this.ctx.tap(); void this.withPause(() => this.ctx.openSettings(true)); };
    const homeBtn = h("button", { class: "ctl", type: "button", html: ICON.home + "<span>Accueil</span>" });
    homeBtn.onclick = () => { this.ctx.tap(); this.leave(); };

    const sideRadia = h("aside", { class: "side side-radia" }, h("div", { class: "side-portrait", html: radiaSVG({ expr: "smile", crown: true, outfit: prefs.outfit }) }), h("div", { class: "side-name" }, c.player.tag));
    const sideAug = h("aside", { class: "side side-aug" }, h("div", { class: "side-portrait", html: augusteSVG({ expr: "smirk" }) }), h("div", { class: "side-name" }, c.rival.tag), h("div", { class: "side-sub" }, c.rival.subtitle));
    const queenGlow = h("div", { class: "queen-pop" });

    const el = h("section", { class: "screen game-screen" },
      h("div", { class: "game-top" },
        h("button", { class: "icon-btn", type: "button", "aria-label": "Accueil", html: ICON.back, onclick: undefined }),
        h("div", { class: "game-title" }, c.title),
        h("div", { class: "top-actions" }, musicBtn, menuBtn)),
      h("div", { class: "game-layout" },
        sideRadia,
        h("div", { class: "game-main" },
          rivalBar,
          h("div", { class: "bubble-row" }, h("div", { class: "bubble", "aria-live": "polite" })),
          h("div", { class: "board-wrap" }, h("div", { class: "board-holder" }, this.board.el, queenGlow)),
          meBar,
          h("div", { class: "below" }, history, claim),
        ),
        sideAug),
      h("nav", { class: "game-controls" }, newBtn, resignBtn, setBtn, homeBtn),
      h("div", { class: "game-fx" }),
    );
    (el.querySelector(".game-top .icon-btn") as HTMLElement).addEventListener("click", () => { this.ctx.tap(); this.leave(); });
    this.ui = { rivalClock, meClock, rivalCap, meCap, rivalBar, meBar, rivalAvatar, meAvatar, diffTag, history, status, claim, sideRadia, sideAug, musicBtn, queenGlow };
    this.refreshMusicBtn();
    return el;
  }

  refreshMusicBtn(): void {
    const on = this.ctx.store.prefs.music && this.ctx.audio.hasMusic;
    this.ui.musicBtn.innerHTML = on ? ICON.music : ICON.musicOff;
    this.ui.musicBtn.classList.toggle("off", !on);
  }

  private toggleMusic(): void {
    const p = this.ctx.store.prefs;
    this.ctx.store.setPref("music", !p.music);
    this.ctx.audio.setMusicEnabled(this.ctx.store.prefs.music);
    this.refreshMusicBtn();
  }

  applyPrefs(): void {
    const p = this.ctx.store.prefs;
    this.board.setCoords(p.showCoords);
    this.board.showLegal = p.showLegal;
    this.board.reducedFx = p.reducedFx;
    this.fx.reduced = p.reducedFx;
    this.screenFx.reduced = p.reducedFx;
    document.documentElement.classList.toggle("reduced-fx", p.reducedFx);
    this.ui.meAvatar.innerHTML = radiaSVG({ expr: "smile", crown: true, outfit: p.outfit });
    (this.ui.sideRadia.querySelector(".side-portrait") as HTMLElement).innerHTML = radiaSVG({ expr: "smile", crown: true, outfit: p.outfit });
    this.refreshMusicBtn();
  }

  // ================================================================ cycle de vie
  /** Appelé quand l'écran devient visible. */
  enter(o: { resume?: boolean; rematch?: boolean } = {}): void {
    this.applyPrefs();
    const saved = this.ctx.store.data.current;
    if (o.resume && saved) this.resumeGame();
    else if (this.over || o.rematch || !this.started) this.newGame(!!o.rematch);
    this.startTicking();
    void this.ctx.ai.warmup();
  }

  exit(): void {
    this.persist();
    this.clock.pause("menu");
    window.clearInterval(this.tickT);
  }

  private leave(): void { this.ctx.go("home"); }

  newGame(rematch = false, fen?: string): void {
    const s = this.ctx.store;
    this.ctx.ai.newGame();
    this.gameId++;
    this.difficulty = s.prefs.difficulty;
    this.cadence = s.prefs.cadence;
    this.game = new ChessGame(fen);
    this.clock = new ChessClock(CADENCES[this.cadence].ms);
    this.over = false;
    this.started = true;
    this.shown.clear();
    this.radiaCaptures = 0;
    this.lastAi = null;
    this.whiteEvalAfterAi = null;
    this.thinking = false;
    this.lowTimeWarned = false;
    this.board.setPosition(this.game.boardArray());
    this.board.setLastMove(null, null);
    this.board.setCheck(null);
    this.board.setLocked(false);
    this.bubbles.reset();
    this.fx.clear();
    this.el.classList.remove("game-over");
    s.recordStart(this.difficulty, this.cadence, rematch);
    s.data.current = null;
    s.save();
    this.renderAll();
    this.el.classList.add("deal");
    setTimeout(() => this.el.classList.remove("deal"), 900);
    setTimeout(() => this.bubbles.trigger("greet", true), 900);
    if (!s.data.introSeen) void this.showIntro();
  }

  private resumeGame(): void {
    const sv = this.ctx.store.data.current!;
    this.gameId++;
    this.ctx.ai.newGame();
    this.difficulty = sv.difficulty;
    this.cadence = sv.cadence;
    this.game = ChessGame.fromUci(sv.moves);
    this.clock = ChessClock.restore(sv.clock);
    if (!this.game.history().length) this.clock = new ChessClock(CADENCES[this.cadence].ms);
    this.over = false;
    this.started = true;
    this.shown = new Set(sv.shownCards);
    this.radiaCaptures = sv.radiaCaptures;
    this.lastAi = null;
    this.whiteEvalAfterAi = null;
    this.thinking = false;
    this.board.setPosition(this.game.boardArray());
    const last = this.game.history().at(-1);
    this.board.setLastMove(last?.from ?? null, last?.to ?? null);
    this.board.setLocked(false);
    this.bubbles.reset();
    this.el.classList.remove("game-over");
    this.clock.resume("menu");
    this.renderAll();
    const out = this.game.outcome();
    if (out) { void this.finish(out); return; }
    if (this.game.turn === "b") void this.aiTurn();
  }

  private persist(): void {
    if (this.over || !this.started) return;
    const s = this.ctx.store;
    s.data.current = {
      moves: this.game.uciHistory(),
      clock: this.clock.snapshot(),
      difficulty: this.difficulty,
      cadence: this.cadence,
      shownCards: [...this.shown],
      radiaCaptures: this.radiaCaptures,
      startedAt: Date.now(),
    };
    s.save();
  }

  /** Outils de test (?debug dans l'adresse). */
  debug() {
    return {
      load: (fen: string) => this.newGame(false, fen),
      move: (uci: string) => this.playerMove(uci.slice(0, 2) as Square, uci.slice(2, 4) as Square),
      legal: () => this.game.allLegal().map((m) => m.from + m.to + (m.promotion ?? "")),
      state: () => ({
        fen: this.game.fen, over: this.over, thinking: this.thinking, cardOpen: this.cardOpen,
        w: this.clock.remaining("w"), b: this.clock.remaining("b"), active: this.clock.active, paused: this.clock.paused,
        shown: [...this.shown], history: this.game.sanHistory(),
      }),
    };
  }

  get hasLiveGame(): boolean { return !this.over && this.started; }

  // ================================================================ joueuse
  private canPick(sq: Square): boolean {
    if (this.over || this.cardOpen || this.game.turn !== "w") return false;
    const p = this.game.get(sq);
    return !!p && p.color === "w";
  }

  private onSelect(sq: Square | null, p: { color: Color; type: PieceSymbol } | null): void {
    if (sq && p) {
      this.ctx.audio.play("select");
      haptic(this.ctx.store.prefs.haptics);
      if (p.type === "q" && p.color === "w") this.queenMoment(sq);
    }
  }

  /** Sélection de la dame blanche (Radia) : portrait et petite lumière. */
  private queenMoment(sq: Square): void {
    const g = this.ui.queenGlow;
    const { x, y, size } = this.board.squareCenter(sq);
    g.style.left = x + "px";
    g.style.top = y + "px";
    g.style.setProperty("--s", size + "px");
    g.innerHTML = `<div class="qp-ring"></div><div class="qp-face">${radiaSVG({ expr: "smile", crown: true, outfit: this.ctx.store.prefs.outfit, blink: false })}</div>`;
    bounce(g, "show");
    bounce(this.ui.meAvatar, "glow");
    if (!this.ctx.store.prefs.reducedFx) this.fx.sparkles(x, y, size, 10);
  }

  private async playerMove(from: Square, to: Square): Promise<void> {
    if (!this.canPick(from)) return;
    let promotion: PieceSymbol | undefined;
    if (this.game.needsPromotion(from, to)) {
      const t = await this.board.askPromotion(to, "w");
      if (!t) { this.board.snapBack(from); return; }
      promotion = t;
    }
    const mv = this.game.play({ from, to, promotion });
    if (!mv) { this.ctx.audio.play("illegal"); return; }
    await this.afterMove(mv, "w");
  }

  // ================================================================ après chaque coup
  private async afterMove(mv: Move, side: Color): Promise<void> {
    const id = this.gameId;
    this.board.animateMove(mv);
    // capture de Radia : les pendules s'arrêtent avant même de basculer (carte souvenir)
    if (side === "w" && mv.captured && this.ctx.content.cards.length) this.clock.pause("card");
    // pendule : celle du joueur qui vient de jouer s'arrête, l'autre démarre
    // (comme sur les sites d'échecs, la pendule de Radia part après son 1er coup)
    this.clock.start(side === "w" ? "b" : "w");
    const inCheck = this.game.inCheck();
    const capture = !!mv.captured;
    if (capture) this.captureFx(mv, side);
    else this.ctx.audio.play("move");
    if (inCheck) {
      const k = this.game.kingSquare(this.game.turn);
      this.board.setCheck(k, side === "w" ? "gold" : "soft");
      setTimeout(() => this.ctx.audio.play("check"), capture ? 160 : 60);
      if (side === "w" && k) {
        const c = this.board.squareCenter(k);
        if (!this.ctx.store.prefs.reducedFx) this.fx.sparkles(c.x, c.y, c.size, 12);
      }
    } else this.board.setCheck(null);
    this.renderAll();
    this.persist();

    const out = this.game.outcome();
    if (out) { await this.finish(out); return; }

    if (side === "w") {
      // réactions d'Auguste
      if (capture) {
        const ev: BubbleEvent = mv.captured === "q" ? "captureQueen" : mv.captured === "r" ? "captureRook" : mv.captured === "p" ? "capturePawn" : "captureMinor";
        const exploited = this.lastAi?.quality === "mistake";
        if (exploited) this.bubbles.trigger("exploit"); else this.bubbles.trigger(ev);
      } else if (inCheck) this.bubbles.trigger("check");
      if (capture) {
        this.radiaCaptures++;
        this.ctx.store.recordCapture(mv.captured!);
        await this.memoryCard(mv.captured!);
        if (id !== this.gameId) return;
      }
      if (!this.over && this.game.turn === "b") void this.aiTurn();
    } else {
      if (capture) this.bubbles.trigger("aiCapture");
      else if (inCheck) this.bubbles.trigger("aiCheck");
      else if (this.lastAi?.quality === "mistake") this.bubbles.trigger("aiMistake");
    }
  }

  private captureFx(mv: Move, side: Color): void {
    const type = mv.captured!;
    const n = INTENSITY[type];
    const c = this.board.squareCenter(mv.to);
    const reduced = this.ctx.store.prefs.reducedFx;
    this.ctx.audio.play(n >= 4 ? "captureRoyal" : n >= 3 ? "captureBig" : "capture");
    haptic(this.ctx.store.prefs.haptics, n >= 3 ? 28 : 16);
    const flash = h("div", { class: `cap-flash i${n}` });
    flash.style.left = c.x + "px";
    flash.style.top = c.y + "px";
    flash.style.setProperty("--s", c.size + "px");
    this.board.fxLayer.append(flash);
    setTimeout(() => flash.remove(), 700);
    const delay = reduced ? 0 : 110;
    setTimeout(() => this.fx.burst(c.x, c.y, side === "w" ? n : Math.max(1, n - 1), c.size), delay);
    if (n >= 3 && !reduced) {
      bounce(this.board.el, n >= 4 ? "shake-big" : "shake-small");
    }
    if (side === "w" && type === "q") {
      // capture de la dame : moment royal
      const crown = h("div", { class: "royal-crown", html: `<svg viewBox="-30 -24 60 44">${crownSVG(0, 0, 1)}</svg>` });
      crown.style.left = c.x + "px";
      crown.style.top = c.y + "px";
      this.board.fxLayer.append(crown);
      setTimeout(() => crown.remove(), 1500);
      setTimeout(() => this.screenFx.confetti(70), 150);
      this.ctx.audio.play("confetti");
    }
  }

  private async memoryCard(captured: PieceSymbol): Promise<void> {
    const s = this.ctx.store;
    const card = pickCard(this.ctx.content.cards, {
      captured, captureIndex: this.radiaCaptures, gamesPlayed: s.completedGames,
      shownThisGame: this.shown, seen: s.data.seen,
    });
    if (!card) return;
    // les deux pendules s'arrêtent dès la capture : aucun temps perdu pendant la lecture
    this.clock.pause("card");
    this.cardOpen = true;
    this.bubbles.hold(true);
    this.board.setLocked(true);
    this.renderClocks();
    await sleep(this.ctx.store.prefs.reducedFx ? 150 : captured === "q" ? 900 : 560);
    this.shown.add(card.id);
    const isNew = s.unlock(card.id);
    this.persist();
    this.ctx.audio.play("card");
    await showCard(this.ctx, card, { header: this.ctx.content.cardHeader, button: this.ctx.content.cardButton, isNew });
    this.cardOpen = false;
    this.board.setLocked(false);
    // seule la pendule du joueur au trait repart
    this.clock.resume("card");
    this.bubbles.hold(false);
    this.renderClocks();
  }

  // ================================================================ Auguste
  private async aiTurn(): Promise<void> {
    if (this.over || this.thinking || this.cardOpen || this.game.turn !== "b") return;
    const id = this.gameId;
    this.thinking = true;
    this.renderStatus();
    const t0 = performance.now();
    const fen = this.game.fen;
    const ply = this.game.history().length;
    const lastRadia = this.game.history().at(-1);
    const res = await this.ctx.ai.think(fen, ply, this.difficulty);
    if (id !== this.gameId || this.over || this.game.fen !== fen) { this.thinking = false; return; }

    // évaluation objective du coup de Radia (moteur) → réaction « bon coup »
    if (res && res.candidates.length && lastRadia) {
      const whiteNow = -res.candidates[0].cp;
      const expected = this.lastAi?.expectedReply;
      const radiaUci = lastRadia.from + lastRadia.to + (lastRadia.promotion ?? "");
      const nonTrivial = !!(lastRadia.captured || lastRadia.san.includes("+") || whiteNow >= 150);
      if (expected && radiaUci === expected && nonTrivial && this.whiteEvalAfterAi !== null && whiteNow >= this.whiteEvalAfterAi - 30 && whiteNow > 60) {
        this.bubbles.trigger("goodMove");
      }
      // nulle réclamable et Auguste moins bien : il la réclame
      const claim = this.game.claimableDraw();
      if (claim && res.candidates[0].cp < -80) {
        this.thinking = false;
        await this.finish({ winner: null, reason: claim });
        return;
      }
    }

    let uci = res?.choice.uci ?? null;
    // sécurité : on ne joue JAMAIS un coup non validé par chess.js
    if (!uci || !this.game.isLegal(uciToInput(uci))) {
      const legal = this.game.allLegal();
      if (!legal.length) { this.thinking = false; return; }
      const m = legal[Math.floor(Math.random() * legal.length)];
      uci = m.from + m.to + (m.promotion ?? "");
    }
    const legalCount = this.game.allLegal().length;
    const want = thinkDelay(Math.random, this.clock.remaining("b"), res?.choice.quality ?? "good", legalCount);
    let wait = want - (performance.now() - t0);
    while (wait > 0) {
      await sleep(Math.min(wait, 100));
      if (id !== this.gameId || this.over) { this.thinking = false; return; }
      // l'attente « humaine » ne compte que lorsque la pendule tourne vraiment
      if (this.clock.running) wait -= 100;
    }
    while (this.clock.paused && !this.over && id === this.gameId) await sleep(120);
    if (id !== this.gameId || this.over) { this.thinking = false; return; }
    const mv = this.game.play(uciToInput(uci));
    this.thinking = false;
    if (!mv) { this.renderStatus(); return; }
    this.lastAi = res?.choice ?? null;
    this.whiteEvalAfterAi = res ? -res.choice.cp : null;
    await this.afterMove(mv, "b");
    this.renderStatus();
  }

  // ================================================================ fin de partie
  private async claimDraw(): Promise<void> {
    const r = this.game.claimableDraw();
    if (!r || this.over || this.game.turn !== "w") return;
    const ok = await this.withPause(() => confirmModal("Réclamer la nulle ?", r === "threefold" ? "La même position est apparue trois fois." : "50 coups sans capture ni mouvement de pion.", "Nulle"));
    if (ok) await this.finish({ winner: null, reason: r });
  }

  private async askResign(): Promise<void> {
    if (this.over) return;
    const ok = await this.withPause(() => confirmModal("Abandonner la partie ?", "Auguste gagnera cette partie.", "Abandonner", "Continuer"));
    if (ok) await this.finish({ winner: "b", reason: "resign" });
  }

  private async askNewGame(): Promise<void> {
    if (!this.over && this.game.history().length > 0) {
      const ok = await this.withPause(() => confirmModal("Nouvelle partie ?", "La partie en cours ne sera pas comptée.", "Nouvelle partie", "Continuer"));
      if (!ok) return;
    }
    this.ctx.ai.cancel();
    this.newGame();
  }

  private async withPause<T>(f: () => Promise<T>): Promise<T> {
    const live = !this.over;
    if (live) this.clock.pause("menu");
    try { return await f(); } finally { if (live) this.clock.resume("menu"); this.renderClocks(); }
  }

  private async finish(out: Outcome): Promise<void> {
    if (this.over) return;
    this.over = true;
    const id = this.gameId;
    this.clock.stop();
    this.ctx.ai.cancel();
    this.thinking = false;
    this.board.setLocked(true);
    this.board.clearSelection();
    this.el.classList.add("game-over");
    const s = this.ctx.store;
    const wasFinaleUnlocked = s.finaleUnlocked;
    const r = out.winner === "w" ? "win" : out.winner === "b" ? "loss" : "draw";
    s.recordResult(r, Math.ceil(this.game.history().length / 2));
    this.renderAll();
    const c = this.ctx.content;
    let text = r === "win" ? c.results.win : r === "loss" ? c.results.loss : c.results.draw;
    if (out.reason === "timeout") text = r === "win" ? c.results.timeoutWin : c.results.timeoutLoss;
    if (out.reason === "timeout-insufficient") text = c.results.timeoutDraw;
    if (out.reason === "resign") text = c.results.resign;
    this.bubbles.trigger(r, true);

    if (r === "win") {
      this.ctx.audio.play(out.reason === "checkmate" ? "mate" : "victory");
      const k = this.game.kingSquare("b");
      if (k && out.reason === "checkmate") {
        const p = this.board.squareCenter(k);
        this.fx.sparkles(p.x, p.y, p.size, 24);
        bounce(this.board.el, "shake-small");
      }
      setTimeout(() => { this.screenFx.confetti(150); this.ctx.audio.play("confetti"); }, 450);
      setTimeout(() => this.ctx.audio.play("victory"), 700);
    } else if (r === "loss") this.ctx.audio.play("check");
    else this.ctx.audio.play("card");

    await sleep(r === "win" ? 1300 : 900);
    if (id !== this.gameId) return;
    this.showResult(r, out, text, !wasFinaleUnlocked && s.finaleUnlocked);
  }

  private showResult(r: "win" | "loss" | "draw", out: Outcome, text: { title: string; line: string }, finaleNew: boolean): void {
    const c = this.ctx.content;
    const p = this.ctx.store.prefs;
    const portrait = r === "win"
      ? `<div class="res-portrait win">${radiaSVG({ expr: "joy", crown: false, outfit: p.outfit === "hoodie" ? "elegant" : p.outfit })}<div class="res-crown">${`<svg viewBox="-30 -24 60 44">${crownSVG(0, 0, 1)}</svg>`}</div></div>`
      : `<div class="res-portrait duo"><div>${radiaSVG({ expr: r === "draw" ? "smile" : "pout", crown: true, outfit: p.outfit })}</div><div>${augusteSVG({ expr: r === "loss" ? "tender" : "smirk" })}</div></div>`;
    const el = h("div", { class: "result result-" + r },
      h("div", { class: "res-visual", html: portrait }),
      h("h2", { class: "res-title" }, text.title),
      h("p", { class: "res-reason" }, REASON[out.reason] + " · " + plural(Math.ceil(this.game.history().length / 2), "coup")),
      text.line ? h("p", { class: "res-line" }, "« " + text.line + " »", h("span", { class: "mc-sign" }, " — " + c.rival.name)) : null,
    );
    const row = h("div", { class: "btn-row wrap" });
    const m = openModal(el, { cls: "result-modal" });
    const add = (label: string, cls: string, f: () => void) => {
      const b = h("button", { class: "btn " + cls, type: "button" }, label);
      b.onclick = () => { this.ctx.tap(); m.close(); f(); };
      row.append(b);
    };
    add("Revanche ♡", "primary", () => this.newGame(true));
    if (r === "loss") add("Changer la difficulté", "ghost", () => void this.ctx.openSettings(true).then(() => this.newGame(true)));
    if (r === "win") add("Mes souvenirs", "ghost", () => this.ctx.go("album"));
    add("Menu", "ghost", () => this.ctx.go("home"));
    el.append(row);
    if (finaleNew) {
      const sec = h("button", { class: "btn secret", type: "button" }, c.finale.menuLabel);
      sec.onclick = () => { this.ctx.tap(); m.close(); void this.ctx.openFinale(); };
      el.append(sec);
    }
  }

  // ================================================================ intro
  private async showIntro(): Promise<void> {
    const c = this.ctx.content;
    this.board.setLocked(true);
    const el = h("div", { class: "intro" },
      h("div", { class: "intro-duo", html: `<div>${radiaSVG({ expr: "smile", crown: true, outfit: this.ctx.store.prefs.outfit })}</div><div>${augusteSVG({ expr: "wink" })}</div>` }),
      ...c.intro.map((l, i) => h(i === 0 ? "h2" : "p", { class: "intro-line", style: `animation-delay:${0.15 + i * 0.35}s` }, l)),
    );
    const go = h("button", { class: "btn primary big", type: "button" }, c.introButton);
    el.append(go);
    const m = openModal(el, { cls: "intro-modal" });
    const skip = h("button", { class: "btn link skip", type: "button" }, "Passer");
    m.el.prepend(skip);
    const done = () => { this.ctx.tap(); this.ctx.store.data.introSeen = true; this.ctx.store.save(); m.close(); };
    go.onclick = done;
    skip.onclick = done;
    await m.closed;
    if (!this.over) this.board.setLocked(false);
  }

  // ================================================================ menu
  private async openMenu(): Promise<void> {
    await this.withPause(async () => {
      const box = h("div", { class: "sheet" }, h("h3", {}, "Menu"));
      const m = openModal(box, { cls: "sheet-modal", dismissable: true });
      const item = (label: string, f: () => void) => {
        const b = h("button", { class: "sheet-item", type: "button", html: label });
        b.onclick = () => { this.ctx.tap(); m.close(); f(); };
        box.append(b);
      };
      item(ICON.refresh + " Nouvelle partie", () => void this.askNewGame());
      if (!this.over) item(ICON.flag + " Abandonner", () => void this.askResign());
      item(ICON.gear + " Paramètres", () => void this.withPause(() => this.ctx.openSettings(true)));
      if (this.ctx.fullscreen.supported) item(ICON.full + (this.ctx.fullscreen.active() ? " Quitter le plein écran" : " Plein écran"), () => this.ctx.fullscreen.toggle());
      item(ICON.album + " Mes souvenirs", () => this.ctx.go("album"));
      item(ICON.home + " Accueil", () => this.leave());
      await m.closed;
    });
  }

  // ================================================================ rendu
  private startTicking(): void {
    window.clearInterval(this.tickT);
    this.tickT = window.setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    if (!this.over) {
      const f = this.clock.flagged();
      if (f) { void this.finish(this.game.timeoutOutcome(f)); return; }
      const me = this.clock.remaining("w");
      if (!this.lowTimeWarned && me < 30_000 && this.clock.active === "w") {
        this.lowTimeWarned = true;
        this.bubbles.trigger("lowTime");
      }
    }
    this.renderClocks();
  }

  private renderAll(): void {
    this.renderClocks();
    this.renderCaptured();
    this.renderHistory();
    this.renderStatus();
    this.ui.diffTag.textContent = DIFFICULTIES[this.difficulty].label + " · " + CADENCES[this.cadence].label;
    const claim = !this.over && this.game.turn === "w" && this.game.claimableDraw();
    this.ui.claim.hidden = !claim;
  }

  private renderClocks(): void {
    const set = (el: HTMLElement, bar: HTMLElement, side: Color) => {
      const ms = this.clock.remaining(side);
      const txt = formatClock(ms);
      if (el.textContent !== txt) el.textContent = txt;
      const active = !this.over && this.clock.active === side;
      const turn = !this.over && this.game.turn === side;
      el.classList.toggle("active", active && !this.clock.paused);
      el.classList.toggle("paused", active && this.clock.paused);
      el.classList.toggle("low", Number.isFinite(ms) && ms < 30_000 && (active || ms === 0));
      bar.classList.toggle("turn", turn);
    };
    set(this.ui.rivalClock, this.ui.rivalBar, "b");
    set(this.ui.meClock, this.ui.meBar, "w");
  }

  private renderStatus(): void {
    const st = this.ui.status;
    if (this.over) st.textContent = "";
    else if (this.thinking) st.innerHTML = `<span class="thinking"><i></i><i></i><i></i></span>`;
    else st.textContent = "";
    this.ui.rivalBar.classList.toggle("is-thinking", this.thinking && !this.over);
  }

  private renderCaptured(): void {
    const taken = { w: [] as PieceSymbol[], b: [] as PieceSymbol[] }; // pièces prises PAR chaque camp
    for (const m of this.game.history()) if (m.captured) taken[m.color].push(m.captured);
    const order: PieceSymbol[] = ["q", "r", "b", "n", "p"];
    const draw = (el: HTMLElement, list: PieceSymbol[], color: Color, diff: number) => {
      const sorted = [...list].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const html = sorted.map((t) => `<span class="cap-p" title="${PIECE_NAMES[t]}">${pieceSVG(color, t)}</span>`).join("") + (diff > 0 ? `<span class="cap-diff">+${diff}</span>` : "");
      if (el.dataset.n !== String(sorted.length) || el.innerHTML !== html) {
        const grew = Number(el.dataset.n ?? 0) < sorted.length;
        el.innerHTML = html;
        el.dataset.n = String(sorted.length);
        if (grew) bounce(el, "pop");
      }
    };
    const matW = this.game.material("w"), matB = this.game.material("b");
    draw(this.ui.meCap, taken.w, "b", matW - matB);
    draw(this.ui.rivalCap, taken.b, "w", matB - matW);
    void PIECE_VALUE;
  }

  private renderHistory(): void {
    const san = this.game.sanHistory();
    const parts: string[] = [];
    for (let i = 0; i < san.length; i += 2) {
      parts.push(`<span class="hm"><b>${i / 2 + 1}.</b> ${san[i]}${san[i + 1] ? " " + san[i + 1] : ""}</span>`);
    }
    this.ui.history.innerHTML = parts.join("") || `<span class="hm muted">Les Blancs commencent ♛</span>`;
    this.ui.history.scrollLeft = this.ui.history.scrollWidth;
    this.ui.history.scrollTop = this.ui.history.scrollHeight;
  }
}

function plural(n: number, w: string): string { return n + " " + w + (n > 1 ? "s" : ""); }

const REASON: Record<Outcome["reason"], string> = {
  checkmate: "Échec et mat", stalemate: "Pat", insufficient: "Matériel insuffisant", fivefold: "Quintuple répétition",
  seventyfive: "Règle des 75 coups", threefold: "Triple répétition", fifty: "Règle des 50 coups",
  timeout: "Temps écoulé", "timeout-insufficient": "Temps écoulé, mat impossible", resign: "Abandon",
};

export const ICON = {
  menu: `<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>`,
  flag: `<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>`,
  gear: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>`,
  home: `<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7M6 10v10h12V10"/></svg>`,
  music: `<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg>`,
  musicOff: `<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>`,
  full: `<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
  album: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 16l5-5 4 4 2-2 5 5"/></svg>`,
};
