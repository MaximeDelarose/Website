/* Bulles de dialogue d'Auguste pendant la partie : elles n'interrompent jamais
   le jeu ni les pendules. Fréquence limitée, pas de répétitions immédiates. */
import type { BubbleEvent } from "../content/types";

const CHANCE: Record<BubbleEvent, number> = {
  greet: 1, goodMove: 0.6, capturePawn: 0.35, captureMinor: 0.6, captureRook: 0.95, captureQueen: 1,
  check: 0.55, aiMistake: 0.4, exploit: 0.95, aiCapture: 0.35, aiCheck: 0.4, win: 1, loss: 1, draw: 1, lowTime: 0.6,
};
/** Ces événements passent outre le délai minimal entre deux bulles. */
const PRIORITY = new Set<BubbleEvent>(["captureQueen", "exploit", "win", "loss", "draw", "greet"]);
const MIN_GAP_MS = 7000;

export class BubbleManager {
  private lastAt = -1e9;
  private lastLine = "";
  private used = new Map<BubbleEvent, number>();
  private queue: { ev: BubbleEvent; at: number } | null = null;
  private held = false;
  private hideT = 0;

  constructor(
    private readonly el: HTMLElement,
    private readonly lines: Record<BubbleEvent, string[]>,
    private readonly onShow: (ev: BubbleEvent) => void = () => {},
    private readonly now: () => number = () => performance.now(),
    private readonly rng: () => number = Math.random,
  ) {}

  /** Pendant une carte souvenir, les bulles attendent sa fermeture. */
  hold(on: boolean): void {
    this.held = on;
    if (!on && this.queue) { const q = this.queue; this.queue = null; this.trigger(q.ev, true); }
  }

  reset(): void { this.lastAt = -1e9; this.queue = null; this.used.clear(); this.hide(); }

  /** Déclenche (peut-être) une bulle. Renvoie le texte affiché ou null. */
  trigger(ev: BubbleEvent, force = false): string | null {
    const list = this.lines[ev];
    if (!list?.length) return null;
    if (!force && this.rng() > CHANCE[ev]) return null;
    const t = this.now();
    if (!PRIORITY.has(ev) && !force && t - this.lastAt < MIN_GAP_MS) return null;
    if (this.held) {
      if (!this.queue || PRIORITY.has(ev)) this.queue = { ev, at: t };
      return null;
    }
    const n = this.used.get(ev) ?? 0;
    let line = list[n % list.length];
    if (line === this.lastLine && list.length > 1) line = list[(n + 1) % list.length];
    this.used.set(ev, n + 1);
    this.lastLine = line;
    this.lastAt = t;
    this.show(line);
    this.onShow(ev);
    return line;
  }

  private show(text: string): void {
    this.el.textContent = text;
    this.el.classList.remove("show");
    void this.el.offsetWidth;
    this.el.classList.add("show");
    clearTimeout(this.hideT);
    this.hideT = window.setTimeout(() => this.hide(), Math.min(7000, 2600 + text.length * 45));
  }

  hide(): void { this.el.classList.remove("show"); }
}
