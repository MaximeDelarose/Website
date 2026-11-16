import type { Rng } from "../../shared/rng.js";

/**
 * Règles du flipper, sans physique ni rendu. La physique appelle ces méthodes à chaque contact détecté :
 * elles renvoient les événements à afficher et à jouer (flush).
 */

export const BALLS_PER_GAME = 3;
export const MAX_MULT = 5;
const BANK_BONUS = 1000;
const LIGHT_ALL_BONUS = 1000;
const RAMP_POINTS = 1000;
const JACKPOT = 5000;

/** Les huit cases de la roulette (dans l'ordre du disque). */
export const ROULETTE: Array<{ id: string; label: string; points?: number }> = [
  { id: "p500", label: "500", points: 500 },
  { id: "p2500", label: "2500", points: 2500 },
  { id: "mult", label: "X+1" },
  { id: "p1000", label: "1000", points: 1000 },
  { id: "extra", label: "BILLE" },
  { id: "p5000", label: "5000", points: 5000 },
  { id: "save", label: "SAUVÉE" },
  { id: "p250", label: "250", points: 250 },
];

export type FlipperEvent =
  | { type: "score"; points: number; reason: string }
  | { type: "bank"; points: number }
  | { type: "lightAll"; points: number }
  | { type: "mult"; mult: number }
  | { type: "ramp"; count: number; points: number }
  | { type: "jackpot"; points: number }
  | { type: "roulette"; index: number; label: string }
  | { type: "extraBall"; ballsLeft: number }
  | { type: "save" }
  | { type: "ballLost"; ballsLeft: number; bonus: number }
  | { type: "gameover"; score: number };

export class FlipperRules {
  score = 0;
  ballsLeft = BALLS_PER_GAME;
  ballInPlay = false;
  /** Multiplicateur de bonus (1 à 5), remis à 1 à chaque bille perdue. */
  mult = 1;
  rampCount = 0;
  lastRoulette = "";
  private bankHits = new Set<string>();
  private litRollovers = new Set<string>();
  private bumpersThisBall = 0;
  private events: FlipperEvent[] = [];

  constructor(
    readonly targetIds: string[],
    readonly rolloverIds: string[],
    private readonly rng?: Rng,
  ) {}

  get over(): boolean {
    return this.ballsLeft === 0 && !this.ballInPlay;
  }

  /** Une bille est lancée : le décompte de fin de bille repart à zéro (sans effet si une bille est déjà en jeu). */
  launch(): void {
    if (this.ballInPlay) return;
    this.ballInPlay = true;
    this.bumpersThisBall = 0;
  }

  bumper(points = 100): void {
    this.bumpersThisBall++;
    this.add(points * this.mult, "bumper");
  }

  slingshot(points = 10): void {
    this.add(points * this.mult, "slingshot");
  }

  /** Spinner : un petit gain à chaque demi-tour. */
  spinner(points = 50): void {
    this.add(points * this.mult, "spinner");
  }

  /** Voie d'entrée ou de sortie de côté. */
  lane(kind: "inlane" | "outlane"): void {
    this.add(kind === "outlane" ? 500 : 100, kind);
  }

  /** Cible de la banque : chaque cible compte une fois. Renvoie vrai si la banque est complète (bille bonus). */
  target(id: string, points = 50): boolean {
    if (!this.targetIds.includes(id) || this.bankHits.has(id)) return false;
    this.bankHits.add(id);
    this.add(points * this.mult, "target");
    if (this.bankHits.size === this.targetIds.length) {
      this.bankHits.clear();
      this.score += BANK_BONUS;
      this.events.push({ type: "bank", points: BANK_BONUS });
      return true;
    }
    return false;
  }

  /** Passage sur un rollover : chaque lettre s'allume une fois ; les allumer toutes donne un bonus et monte le multiplicateur. */
  rollover(id: string, points = 200): void {
    if (!this.rolloverIds.includes(id) || this.litRollovers.has(id)) return;
    this.litRollovers.add(id);
    this.add(points, "rollover");
    if (this.litRollovers.size === this.rolloverIds.length) {
      this.litRollovers.clear();
      this.score += LIGHT_ALL_BONUS;
      this.events.push({ type: "lightAll", points: LIGHT_ALL_BONUS });
      this.raiseMult();
    }
  }

  /** Rampe menée à son terme. Renvoie vrai au troisième passage : jackpot. */
  ramp(): boolean {
    this.rampCount++;
    const points = RAMP_POINTS * this.mult;
    this.score += points;
    this.events.push({ type: "ramp", count: this.rampCount, points });
    if (this.rampCount % 3 === 0) {
      this.score += JACKPOT;
      this.events.push({ type: "jackpot", points: JACKPOT });
      return true;
    }
    return false;
  }

  /** La bille tombe dans la roulette : tirage d'une case. Renvoie son index. */
  roulette(): number {
    const index = this.rng ? this.rng.int(ROULETTE.length) : 0;
    const prize = ROULETTE[index];
    this.lastRoulette = prize.label;
    this.events.push({ type: "roulette", index, label: prize.label });
    if (prize.points) this.score += prize.points;
    else if (prize.id === "mult") this.raiseMult();
    else if (prize.id === "extra") {
      this.ballsLeft = Math.min(BALLS_PER_GAME + 2, this.ballsLeft + 1);
      this.events.push({ type: "extraBall", ballsLeft: this.ballsLeft });
    } else if (prize.id === "save") this.events.push({ type: "save" });
    return index;
  }

  raiseMult(): void {
    if (this.mult >= MAX_MULT) return;
    this.mult++;
    this.events.push({ type: "mult", mult: this.mult });
  }

  /** La bille est sortie. Renvoie le bonus de fin de bille (50 par bumper touché, multiplié). */
  drain(): number {
    if (!this.ballInPlay) return 0;
    this.ballInPlay = false;
    this.ballsLeft--;
    const bonus = this.bumpersThisBall * 50 * this.mult;
    this.score += bonus;
    this.mult = 1;
    this.events.push({ type: "ballLost", ballsLeft: this.ballsLeft, bonus });
    if (this.over) this.events.push({ type: "gameover", score: this.score });
    return bonus;
  }

  /** Cible déjà touchée dans la banque en cours. */
  targetDown(id: string): boolean {
    return this.bankHits.has(id);
  }

  /** Lettre de rollover allumée. */
  lit(id: string): boolean {
    return this.litRollovers.has(id);
  }

  /** Événements accumulés depuis le dernier appel. */
  flush(): FlipperEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private add(points: number, reason: string): void {
    this.score += points;
    this.events.push({ type: "score", points, reason });
  }
}
