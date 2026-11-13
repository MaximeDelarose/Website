/**
 * Règles du flipper, sans physique ni rendu. La physique (Matter.js) appelle ces méthodes
 * à chaque collision détectée : elles renvoient les événements à afficher et à jouer.
 */
export const BALLS_PER_GAME = 3;
const BANK_BONUS = 1000;
const LIGHT_ALL_BONUS = 1000;
export class FlipperRules {
    constructor(targetIds, rolloverIds) {
        this.targetIds = targetIds;
        this.rolloverIds = rolloverIds;
        this.score = 0;
        this.ballsLeft = BALLS_PER_GAME;
        this.ballInPlay = false;
        this.bankHits = new Set();
        this.litRollovers = new Set();
        this.bumpersThisBall = 0;
        this.events = [];
    }
    get over() {
        return this.ballsLeft === 0 && !this.ballInPlay;
    }
    /** Une bille est lancée : le décompte de fin de bille repart à zéro. */
    launch() {
        this.ballInPlay = true;
        this.bumpersThisBall = 0;
    }
    bumper(points = 100) {
        this.bumpersThisBall++;
        this.add(points, "bumper");
    }
    slingshot(points = 10) {
        this.add(points, "slingshot");
    }
    /** Cible de la banque : chaque cible compte une fois. Renvoie vrai si la banque est complète (bille bonus). */
    target(id, points = 50) {
        if (!this.targetIds.includes(id) || this.bankHits.has(id))
            return false;
        this.bankHits.add(id);
        this.add(points, "target");
        if (this.bankHits.size === this.targetIds.length) {
            this.bankHits.clear();
            this.score += BANK_BONUS;
            this.events.push({ type: "bank", points: BANK_BONUS });
            return true;
        }
        return false;
    }
    /** Passage sur un rollover : chaque lettre s'allume une fois, les allumer toutes donne un bonus. */
    rollover(id, points = 200) {
        if (!this.rolloverIds.includes(id) || this.litRollovers.has(id))
            return;
        this.litRollovers.add(id);
        this.add(points, "rollover");
        if (this.litRollovers.size === this.rolloverIds.length) {
            this.litRollovers.clear();
            this.score += LIGHT_ALL_BONUS;
            this.events.push({ type: "lightAll", points: LIGHT_ALL_BONUS });
        }
    }
    /** La bille est sortie. Renvoie le bonus de fin de bille. */
    drain() {
        if (!this.ballInPlay)
            return 0;
        this.ballInPlay = false;
        this.ballsLeft--;
        const bonus = this.bumpersThisBall * 50;
        this.score += bonus;
        this.events.push({ type: "ballLost", ballsLeft: this.ballsLeft, bonus });
        if (this.over)
            this.events.push({ type: "gameover", score: this.score });
        return bonus;
    }
    /** Événements accumulés depuis le dernier appel. */
    flush() {
        const out = this.events;
        this.events = [];
        return out;
    }
    add(points, reason) {
        this.score += points;
        this.events.push({ type: "score", points, reason });
    }
}
